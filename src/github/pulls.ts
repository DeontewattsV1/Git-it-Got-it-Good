import type { Octokit } from '@octokit/rest';

export async function listPullRequests(
  octokit: Octokit,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open'
) {
  const response = await octokit.pulls.list({ owner, repo, state, per_page: 50 });
  return response.data.map((pull) => ({
    number: pull.number,
    title: pull.title,
    state: pull.state,
    draft: pull.draft,
    user: pull.user?.login,
    head: pull.head.ref,
    base: pull.base.ref,
    createdAt: pull.created_at,
    updatedAt: pull.updated_at,
    htmlUrl: pull.html_url
  }));
}
