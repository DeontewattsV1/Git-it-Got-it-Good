import type { Octokit } from '@octokit/rest';

export async function listIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open',
  labels?: string[]
) {
  const response = await octokit.issues.listForRepo({
    owner,
    repo,
    state,
    labels: labels?.join(','),
    per_page: 50
  });
  return response.data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels.map((label) => typeof label === 'string' ? label : label.name).filter(Boolean),
      assignees: issue.assignees?.map((user) => user.login) ?? [],
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      htmlUrl: issue.html_url
    }));
}
