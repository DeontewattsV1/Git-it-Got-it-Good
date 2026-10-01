export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked';

export type GitHubAction =
  | 'repo.read'
  | 'issue.read'
  | 'pull_request.read'
  | 'file.read';

export interface AuthContext {
  subject: string;
  githubLogin?: string;
  githubAccessToken: string;
  scopes: string[];
}

export type AgentRole = 'cartographer' | 'triage' | 'code_analyst' | 'planner' | 'guardian';

export interface SwarmTask {
  id: string;
  role: AgentRole;
  objective: string;
  dependsOn: string[];
  riskLevel: RiskLevel;
  status: 'pending' | 'running' | 'complete' | 'failed' | 'blocked';
}

export interface AuditEvent {
  id: string;
  at: string;
  subject: string;
  tool: string;
  action: GitHubAction;
  riskLevel: RiskLevel;
  target?: string;
  allowed: boolean;
  reason?: string;
}
