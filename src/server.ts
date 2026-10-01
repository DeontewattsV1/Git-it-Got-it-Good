import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { logger } from './audit/logger.js';
import { authorize, githubCallback, oauthMetadata, protectedResourceMetadata, registerOAuthClient, token } from './auth/githubOAuth.js';
import { authStore } from './auth/store.js';
import { extractBearerToken, verifyMcpAccessToken } from './auth/tokens.js';
import { allowedHosts, allowedOrigins, config } from './config.js';
import { createGitManagerMcpServer } from './mcp/tools.js';
import { AppError } from './utils/errors.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

app.use((req, _res, next) => {
  const host = (req.hostname || '').toLowerCase();
  if (config.NODE_ENV === 'production' && !allowedHosts.has(host)) {
    return next(new AppError('Host header is not allowed', 403, 'HOST_NOT_ALLOWED'));
  }
  const origin = req.header('origin');
  if (origin && !allowedOrigins.has(origin)) {
    return next(new AppError('Origin is not allowed', 403, 'ORIGIN_NOT_ALLOWED'));
  }
  return next();
});

const authLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });
const mcpLimiter = rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false });

function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => { void handler(req, res, next).catch(next); };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'git-manager-mcp', version: '1.0.0', authStore: authStore.mode, writesExposed: false });
});
app.get('/.well-known/oauth-authorization-server', (_req, res) => res.json(oauthMetadata()));
app.get('/.well-known/openid-configuration', (_req, res) => res.json(oauthMetadata()));
app.get('/.well-known/oauth-protected-resource', (_req, res) => res.json(protectedResourceMetadata()));
app.get('/.well-known/oauth-protected-resource/mcp', (_req, res) => res.json(protectedResourceMetadata()));

app.post('/oauth/register', authLimiter, asyncRoute(registerOAuthClient));
app.get('/oauth/authorize', authLimiter, asyncRoute(authorize));
app.get('/oauth/github/callback', authLimiter, asyncRoute(githubCallback));
app.post('/oauth/token', authLimiter, asyncRoute(token));

app.all('/mcp', mcpLimiter, asyncRoute(async (req, res) => {
  let authContext;
  try {
    authContext = await verifyMcpAccessToken(extractBearerToken(req.header('authorization')));
  } catch (error) {
    res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${config.PUBLIC_BASE_URL}/.well-known/oauth-protected-resource/mcp"`);
    throw error;
  }

  const handler = createMcpHandler(() => createGitManagerMcpServer(authContext));
  const nodeHandler = toNodeHandler(handler);
  await nodeHandler(req, res, req.body);
}));

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const appError = error instanceof AppError
    ? error
    : new AppError(error instanceof Error ? error.message : 'Unknown error', 500, 'INTERNAL_ERROR');
  logger.warn({ code: appError.code, statusCode: appError.statusCode, message: appError.message }, 'request failed');
  if (!res.headersSent) res.status(appError.statusCode).json({ error: appError.message, code: appError.code });
});

app.listen(config.PORT, '0.0.0.0', () => {
  logger.info({ port: config.PORT, baseUrl: config.PUBLIC_BASE_URL, authStore: authStore.mode, writesExposed: false }, 'Git Manager MCP server running');
});
