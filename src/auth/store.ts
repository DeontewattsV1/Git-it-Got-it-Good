import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { config } from '../config.js';
import type { AuthContext } from '../types.js';

export interface OAuthClientRecord {
  clientId: string;
  clientSecret?: string;
  redirectUris: string[];
  createdAt: string;
}

export interface AuthorizationStateRecord {
  id: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  upstreamState: string;
  createdAt: string;
}

export interface AuthorizationCodeRecord {
  code: string;
  clientId: string;
  redirectUri: string;
  encryptedGithubAccessToken: string;
  githubLogin?: string;
  scopes: string[];
  codeChallenge: string;
  createdAt: string;
}

interface SessionRecord {
  tokenHash: string;
  encryptedGithubAccessToken: string;
  githubLogin?: string;
  subject: string;
  scopes: string[];
  expiresAt: number;
}

interface StoredValue<T> {
  value: T;
  expiresAt: number;
}

class MemoryBackend {
  private readonly values = new Map<string, StoredValue<unknown>>();

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.values.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const item = this.values.get(key);
    if (!item) return undefined;
    if (item.expiresAt <= Date.now()) {
      this.values.delete(key);
      return undefined;
    }
    return item.value as T;
  }

  async consume<T>(key: string): Promise<T | undefined> {
    const value = await this.get<T>(key);
    if (value !== undefined) this.values.delete(key);
    return value;
  }
}

class RedisBackend {
  constructor(private readonly redis: Redis) {}

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  }

  async consume<T>(key: string): Promise<T | undefined> {
    const raw = await this.redis.call('GETDEL', key);
    return typeof raw === 'string' ? (JSON.parse(raw) as T) : undefined;
  }
}

type Backend = MemoryBackend | RedisBackend;

const encryptionKey = createHash('sha256').update(config.ENCRYPTION_KEY, 'utf8').digest();

function opaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

function decrypt(value: string): string {
  const [ivText, tagText, ciphertextText] = value.split('.');
  if (!ivText || !tagText || !ciphertextText) throw new Error('Invalid encrypted value');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

export class AuthStore {
  private readonly backend: Backend;
  readonly mode: 'redis' | 'memory';

  constructor() {
    if (config.REDIS_URL) {
      const redis = new Redis(config.REDIS_URL, {
        lazyConnect: false,
        maxRetriesPerRequest: 2,
        enableReadyCheck: true
      });
      this.backend = new RedisBackend(redis);
      this.mode = 'redis';
    } else {
      this.backend = new MemoryBackend();
      this.mode = 'memory';
    }
  }

  async createClient(redirectUris: string[]): Promise<OAuthClientRecord> {
    const client: OAuthClientRecord = {
      clientId: `gm_${opaqueToken(18)}`,
      clientSecret: opaqueToken(36),
      redirectUris,
      createdAt: new Date().toISOString()
    };
    await this.backend.set(`oauth:client:${client.clientId}`, client, 86400);
    return client;
  }

  async getClient(clientId: string): Promise<OAuthClientRecord | undefined> {
    return this.backend.get(`oauth:client:${clientId}`);
  }

  async createState(input: Omit<AuthorizationStateRecord, 'id' | 'createdAt'>): Promise<AuthorizationStateRecord> {
    const state = { id: opaqueToken(), createdAt: new Date().toISOString(), ...input };
    await this.backend.set(`oauth:state:${state.id}`, state, config.OAUTH_STATE_TTL_SECONDS);
    return state;
  }

  async consumeState(id: string): Promise<AuthorizationStateRecord | undefined> {
    return this.backend.consume(`oauth:state:${id}`);
  }

  async createCode(input: Omit<AuthorizationCodeRecord, 'code' | 'createdAt' | 'encryptedGithubAccessToken'> & { githubAccessToken: string }): Promise<AuthorizationCodeRecord> {
    const code: AuthorizationCodeRecord = {
      code: opaqueToken(36),
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      encryptedGithubAccessToken: encrypt(input.githubAccessToken),
      githubLogin: input.githubLogin,
      scopes: input.scopes,
      codeChallenge: input.codeChallenge,
      createdAt: new Date().toISOString()
    };
    await this.backend.set(`oauth:code:${code.code}`, code, config.OAUTH_CODE_TTL_SECONDS);
    return code;
  }

  async consumeCode(code: string): Promise<AuthorizationCodeRecord | undefined> {
    return this.backend.consume(`oauth:code:${code}`);
  }

  async createSession(input: {
    githubAccessToken: string;
    githubLogin?: string;
    subject: string;
    scopes: string[];
  }): Promise<{ token: string; expiresAt: number }> {
    const token = opaqueToken(32);
    const expiresAt = Math.floor(Date.now() / 1000) + config.SESSION_TTL_SECONDS;
    const record: SessionRecord = {
      tokenHash: tokenHash(token),
      encryptedGithubAccessToken: encrypt(input.githubAccessToken),
      githubLogin: input.githubLogin,
      subject: input.subject,
      scopes: input.scopes,
      expiresAt
    };
    await this.backend.set(`session:${record.tokenHash}`, record, config.SESSION_TTL_SECONDS);
    return { token, expiresAt };
  }

  async resolveSession(token: string): Promise<AuthContext | undefined> {
    const record = await this.backend.get<SessionRecord>(`session:${tokenHash(token)}`);
    if (!record || record.expiresAt <= Math.floor(Date.now() / 1000)) return undefined;
    return {
      subject: record.subject,
      githubAccessToken: decrypt(record.encryptedGithubAccessToken),
      githubLogin: record.githubLogin,
      scopes: record.scopes
    };
  }

  decryptAuthorizationCodeToken(code: AuthorizationCodeRecord): string {
    return decrypt(code.encryptedGithubAccessToken);
  }
}

export const authStore = new AuthStore();
