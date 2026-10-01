import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { config } from '../config.js';
import { authStore, type OAuthClientRecord } from './store.js';
import { AppError } from '../utils/errors.js';

const githubAuthorizeUrl = 'https://github.com/login/oauth/authorize';
const githubTokenUrl = 'https://github.com/login/oauth/access_token';
const githubUserUrl = 'https://api.github.com/user';

export function oauthMetadata() {
  return {
    issuer: config.PUBLIC_BASE_URL,
    authorization_endpoint: `${config.PUBLIC_BASE_URL}/oauth/authorize`,
    token_endpoint: `${config.PUBLIC_BASE_URL}/oauth/token`,
    registration_endpoint: `${config.PUBLIC_BASE_URL}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['mcp']
  };
}

export function protectedResourceMetadata() {
  return {
    resource: `${config.PUBLIC_BASE_URL}/mcp`,
    authorization_servers: [config.PUBLIC_BASE_URL],
    scopes_supported: ['mcp']
  };
}

function validateRedirectUri(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError('Invalid redirect URI', 400, 'INVALID_REDIRECT_URI');
  }
  if (url.username || url.password || url.hash) {
    throw new AppError('redirect_uri may not include credentials or fragments', 400, 'INVALID_REDIRECT_URI');
  }
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) {
    throw new AppError('redirect_uri must use HTTPS except for loopback clients', 400, 'INVALID_REDIRECT_URI');
  }
  return url.toString();
}

export async function registerOAuthClient(req: Request, res: Response) {
  const raw = Array.isArray(req.body?.redirect_uris) ? req.body.redirect_uris : [];
  const redirectUris = raw
    .filter((uri: unknown): uri is string => typeof uri === 'string')
    .map(validateRedirectUri);
  if (redirectUris.length === 0) {
    throw new AppError('redirect_uris is required', 400, 'INVALID_CLIENT_METADATA');
  }
  const client = await authStore.createClient([...new Set(redirectUris)]);
  return res.status(201).json({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: 'client_secret_post',
    grant_types: ['authorization_code'],
    response_types: ['code']
  });
}

async function getOAuthClient(clientId: string): Promise<OAuthClientRecord | undefined> {
  if (config.CHATGPT_OAUTH_CLIENT_ID && clientId === config.CHATGPT_OAUTH_CLIENT_ID) {
    return {
      clientId,
      clientSecret: config.CHATGPT_OAUTH_CLIENT_SECRET || undefined,
      redirectUris: config.CHATGPT_REDIRECT_URIS.map(validateRedirectUri),
      createdAt: 'static'
    };
  }
  return authStore.getClient(clientId);
}

function secretsEqual(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function authorize(req: Request, res: Response) {
  const clientId = String(req.query.client_id ?? '');
  const redirectUri = validateRedirectUri(String(req.query.redirect_uri ?? ''));
  const responseType = String(req.query.response_type ?? '');
  const state = String(req.query.state ?? '');
  const codeChallenge = String(req.query.code_challenge ?? '');
  const codeChallengeMethod = String(req.query.code_challenge_method ?? '');

  const client = await getOAuthClient(clientId);
  if (!client) throw new AppError('Unknown OAuth client_id', 400, 'UNKNOWN_CLIENT');
  if (responseType !== 'code') throw new AppError('Only code response_type is supported');
  if (!client.redirectUris.includes(redirectUri)) {
    throw new AppError('redirect_uri is not registered for this client', 400, 'INVALID_REDIRECT_URI');
  }
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    throw new AppError('S256 PKCE is required', 400, 'PKCE_REQUIRED');
  }

  const localState = await authStore.createState({
    clientId,
    redirectUri,
    codeChallenge,
    upstreamState: state
  });

  const url = new URL(githubAuthorizeUrl);
  url.searchParams.set('client_id', config.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', config.GITHUB_CALLBACK_URL);
  url.searchParams.set('scope', config.GITHUB_OAUTH_SCOPES);
  url.searchParams.set('state', localState.id);
  url.searchParams.set('allow_signup', 'false');
  return res.redirect(url.toString());
}

export async function githubCallback(req: Request, res: Response) {
  const code = String(req.query.code ?? '');
  const localState = await authStore.consumeState(String(req.query.state ?? ''));
  if (!code || !localState) {
    throw new AppError('Invalid or expired OAuth callback state', 400, 'INVALID_STATE');
  }

  const tokenResponse = await fetch(githubTokenUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.GITHUB_CLIENT_ID,
      client_secret: config.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: config.GITHUB_CALLBACK_URL
    })
  });
  if (!tokenResponse.ok) throw new AppError('GitHub token exchange failed', 502, 'GITHUB_OAUTH_FAILED');

  const tokenJson = (await tokenResponse.json()) as { access_token?: string; scope?: string; error?: string };
  if (!tokenJson.access_token) {
    throw new AppError(tokenJson.error ?? 'GitHub token response did not include access_token', 502, 'GITHUB_OAUTH_FAILED');
  }

  let githubLogin: string | undefined;
  try {
    const userResponse = await fetch(githubUserUrl, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}`, Accept: 'application/vnd.github+json' }
    });
    if (userResponse.ok) githubLogin = ((await userResponse.json()) as { login?: string }).login;
  } catch {
    githubLogin = undefined;
  }

  const downstreamCode = await authStore.createCode({
    clientId: localState.clientId,
    redirectUri: localState.redirectUri,
    githubAccessToken: tokenJson.access_token,
    githubLogin,
    scopes: tokenJson.scope?.split(',').map((scope) => scope.trim()).filter(Boolean) ?? [],
    codeChallenge: localState.codeChallenge
  });

  const redirect = new URL(localState.redirectUri);
  redirect.searchParams.set('code', downstreamCode.code);
  if (localState.upstreamState) redirect.searchParams.set('state', localState.upstreamState);
  return res.redirect(redirect.toString());
}

export async function token(req: Request, res: Response) {
  const grantType = String(req.body?.grant_type ?? '');
  const codeValue = String(req.body?.code ?? '');
  const clientId = String(req.body?.client_id ?? '');
  const clientSecret = String(req.body?.client_secret ?? '');
  const redirectUri = validateRedirectUri(String(req.body?.redirect_uri ?? ''));
  const codeVerifier = String(req.body?.code_verifier ?? '');

  if (grantType !== 'authorization_code') throw new AppError('Only authorization_code grant_type is supported');
  const client = await getOAuthClient(clientId);
  if (!client) throw new AppError('Unknown OAuth client_id', 400, 'UNKNOWN_CLIENT');
  if (client.clientSecret && !secretsEqual(client.clientSecret, clientSecret)) {
    throw new AppError('Invalid client_secret', 401, 'INVALID_CLIENT_SECRET');
  }

  const code = await authStore.consumeCode(codeValue);
  if (!code || code.clientId !== clientId || code.redirectUri !== redirectUri) {
    throw new AppError('Invalid or expired authorization code', 400, 'INVALID_AUTHORIZATION_CODE');
  }
  if (!codeVerifier) throw new AppError('Missing code_verifier', 400, 'MISSING_CODE_VERIFIER');
  const actualChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  if (!secretsEqual(code.codeChallenge, actualChallenge)) {
    throw new AppError('Invalid code_verifier', 401, 'INVALID_CODE_VERIFIER');
  }

  const session = await authStore.createSession({
    subject: code.githubLogin ?? clientId,
    githubAccessToken: authStore.decryptAuthorizationCodeToken(code),
    githubLogin: code.githubLogin,
    scopes: code.scopes
  });

  return res.json({
    access_token: session.token,
    token_type: 'Bearer',
    expires_in: session.expiresAt - Math.floor(Date.now() / 1000),
    scope: 'mcp'
  });
}
