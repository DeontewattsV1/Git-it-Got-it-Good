import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { auditDecision } from '../audit/logger.js';
import { createGitHubClient } from '../github/client.js';
import { readFile } from '../github/files.js';
import { listIssues } from '../github/issues.js';
import { listPullRequests } from '../github/pulls.js';
import { getRepository, getRepositoryMap, listRepositories } from '../github/repos.js';
import { blueSystemPolicy } from '../policy/blueSystem.js';
import { buildGitHubTaskGraph } from '../swarm/taskGraph.js';
import type { AuthContext, GitHubAction } from '../types.js';

function jsonResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function authorizeRead(context: AuthContext, tool: string, action: GitHubAction, target?: string) {
  auditDecision({ subject: context.subject, tool, action, riskLevel: 'low', target, allowed: true });
}

export function createGitManagerMcpServer(context: AuthContext): McpServer {
  const server = new McpServer(
    { name: 'git-manager', version: '1.0.0' },
    { instructions: 'Read-only GitHub repository inspection. No mutation tools are exposed in this release.' }
  );
  const octokit = createGitHubClient(context.githubAccessToken);

  server.registerTool('blue_system_policy', {
    title: 'Blue System Policy', description: 'Return the active Git Manager governance policy.', inputSchema: z.object({}), annotations: { readOnlyHint: true, openWorldHint: false }
  }, async () => jsonResult(blueSystemPolicy));

  server.registerTool('github_plan_swarm', {
    title: 'Plan GitHub Analysis', description: 'Convert a GitHub management goal into a bounded read-only analysis graph.', inputSchema: z.object({ goal: z.string().min(1) }), annotations: { readOnlyHint: true, openWorldHint: false }
  }, async ({ goal }) => jsonResult({ goal, tasks: buildGitHubTaskGraph(goal) }));

  server.registerTool('github_list_repositories', {
    title: 'List GitHub Repositories', description: 'List repositories visible to the authenticated GitHub user.',
    inputSchema: z.object({ visibility: z.enum(['all', 'public', 'private']).default('all'), perPage: z.number().int().min(1).max(100).default(50) }),
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ visibility, perPage }) => {
    authorizeRead(context, 'github_list_repositories', 'repo.read');
    return jsonResult(await listRepositories(octokit, visibility, perPage));
  });

  server.registerTool('github_get_repository', {
    title: 'Get GitHub Repository', description: 'Get metadata for one repository.',
    inputSchema: z.object({ owner: z.string().min(1), repo: z.string().min(1) }), annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ owner, repo }) => {
    const target = `${owner}/${repo}`;
    authorizeRead(context, 'github_get_repository', 'repo.read', target);
    return jsonResult(await getRepository(octokit, owner, repo));
  });

  server.registerTool('github_get_repository_map', {
    title: 'Map GitHub Repository', description: 'Return branches, labels, open issues, open PRs, and recent releases.',
    inputSchema: z.object({ owner: z.string().min(1), repo: z.string().min(1) }), annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ owner, repo }) => {
    const target = `${owner}/${repo}`;
    authorizeRead(context, 'github_get_repository_map', 'repo.read', target);
    return jsonResult(await getRepositoryMap(octokit, owner, repo));
  });

  server.registerTool('github_list_issues', {
    title: 'List GitHub Issues', description: 'List repository issues.',
    inputSchema: z.object({ owner: z.string().min(1), repo: z.string().min(1), state: z.enum(['open', 'closed', 'all']).default('open'), labels: z.array(z.string()).optional() }),
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ owner, repo, state, labels }) => {
    const target = `${owner}/${repo}`;
    authorizeRead(context, 'github_list_issues', 'issue.read', target);
    return jsonResult(await listIssues(octokit, owner, repo, state, labels));
  });

  server.registerTool('github_list_pull_requests', {
    title: 'List GitHub Pull Requests', description: 'List pull requests for a repository.',
    inputSchema: z.object({ owner: z.string().min(1), repo: z.string().min(1), state: z.enum(['open', 'closed', 'all']).default('open') }),
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ owner, repo, state }) => {
    const target = `${owner}/${repo}`;
    authorizeRead(context, 'github_list_pull_requests', 'pull_request.read', target);
    return jsonResult(await listPullRequests(octokit, owner, repo, state));
  });

  server.registerTool('github_read_file', {
    title: 'Read GitHub File', description: 'Read one UTF-8 text file from a repository branch, tag, or SHA.',
    inputSchema: z.object({ owner: z.string().min(1), repo: z.string().min(1), path: z.string().min(1), ref: z.string().optional() }),
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, async ({ owner, repo, path, ref }) => {
    const target = `${owner}/${repo}:${ref ?? 'default'}:${path}`;
    authorizeRead(context, 'github_read_file', 'file.read', target);
    return jsonResult(await readFile(octokit, owner, repo, path, ref));
  });

  return server;
}
