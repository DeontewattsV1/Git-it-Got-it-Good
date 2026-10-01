import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('MCP tool surface is read-only in the foundation release', async () => {
  const source = await read('src/mcp/tools.ts');
  for (const forbidden of [
    'github_create_issue', 'github_create_branch', 'github_create_pull_request',
    'pull_request.merge', 'file.write', 'secret.write', 'ref.force_update'
  ]) {
    assert.equal(source.includes(forbidden), false, `unexpected mutation surface: ${forbidden}`);
  }
});

test('OAuth does not allow wildcard redirect URIs or plain PKCE', async () => {
  const source = await read('src/auth/githubOAuth.ts');
  assert.equal(source.includes("redirectUris = ['*']"), false);
  assert.equal(source.includes("code_challenge_methods_supported: ['S256', 'plain']"), false);
  assert.match(source, /code_challenge_methods_supported: \['S256'\]/);
});

test('bearer sessions are opaque and GitHub credentials stay server-side', async () => {
  const tokenSource = await read('src/auth/tokens.ts');
  const storeSource = await read('src/auth/store.ts');
  assert.equal(tokenSource.includes('SignJWT'), false);
  assert.equal(tokenSource.includes('githubAccessToken:'), false);
  assert.match(storeSource, /aes-256-gcm/);
  assert.match(storeSource, /encryptedGithubAccessToken/);
});

test('production requires Redis-backed OAuth/session state', async () => {
  const source = await read('src/config.ts');
  assert.match(source, /NODE_ENV === 'production'/);
  assert.match(source, /REDIS_URL is required in production/);
});
