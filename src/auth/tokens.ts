import { authStore } from './store.js';
import type { AuthContext } from '../types.js';
import { AppError } from '../utils/errors.js';

export async function verifyMcpAccessToken(token: string): Promise<AuthContext> {
  const context = await authStore.resolveSession(token);
  if (!context) throw new AppError('Invalid or expired bearer token', 401, 'INVALID_TOKEN');
  return context;
}

export function extractBearerToken(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Missing bearer token', 401, 'MISSING_TOKEN');
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) throw new AppError('Missing bearer token', 401, 'MISSING_TOKEN');
  return token;
}
