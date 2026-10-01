import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { config } from '../config.js';
import type { AuditEvent, GitHubAction, RiskLevel } from '../types.js';

export const logger = pino({ level: config.LOG_LEVEL });

export function auditDecision(input: {
  subject: string;
  tool: string;
  action: GitHubAction;
  riskLevel: RiskLevel;
  target?: string;
  allowed: boolean;
  reason?: string;
}): AuditEvent {
  const event: AuditEvent = {
    id: randomUUID(),
    at: new Date().toISOString(),
    ...input
  };
  logger.info({ audit: event }, 'git-manager audit event');
  return event;
}
