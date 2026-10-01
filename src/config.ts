import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return value;
}, z.boolean());

const csv = z.string().default('').transform((value) =>
  value.split(',').map((item) => item.trim()).filter(Boolean)
);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),
  GITHUB_OAUTH_SCOPES: z.string().default('read:user'),
  ENCRYPTION_KEY: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
  CHATGPT_OAUTH_CLIENT_ID: z.string().optional().default(''),
  CHATGPT_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
  CHATGPT_REDIRECT_URIS: csv,
  ALLOWED_HOSTS: csv,
  ALLOWED_ORIGINS: csv,
  SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(86400).default(3600),
  OAUTH_STATE_TTL_SECONDS: z.coerce.number().int().min(60).max(1800).default(600),
  OAUTH_CODE_TTL_SECONDS: z.coerce.number().int().min(30).max(600).default(300),
  ALLOW_WRITES: booleanFromEnv.default(false),
  BLOCK_DESTRUCTIVE_ACTIONS: booleanFromEnv.default(true),
  REQUIRE_APPROVAL_FOR_WRITES: booleanFromEnv.default(true),
  LOG_LEVEL: z.string().default('info')
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production' && !value.REDIS_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['REDIS_URL'], message: 'REDIS_URL is required in production' });
  }
  if (value.CHATGPT_OAUTH_CLIENT_ID && value.CHATGPT_REDIRECT_URIS.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['CHATGPT_REDIRECT_URIS'], message: 'Explicit redirect URIs are required for the static ChatGPT OAuth client' });
  }
});

export const config = EnvSchema.parse(process.env);

export const publicBaseUrl = new URL(config.PUBLIC_BASE_URL);
export const allowedHosts = new Set([
  publicBaseUrl.hostname.toLowerCase(),
  ...config.ALLOWED_HOSTS.map((host) => host.toLowerCase())
]);
export const allowedOrigins = new Set([
  publicBaseUrl.origin,
  ...config.ALLOWED_ORIGINS
]);
