import type { Octokit } from '@octokit/rest';

export async function listRepositories(
  octokit: Octokit,
  visibility: 'all' | 'public' | 'private' = 'all',
  perPage = 50
) {
  const response = await octokit.repos.listForAuthenticatedUser({
    visibility,
    affiliation: 'owner,collaborator,organization_member',
    sort: 'updated',
    per_page: perPage
  });
  return response.data.map((repo) => ({
    id: repo.id,
    fullName: repo.full_name,
    private: repo.private,
    archived: repo.archived,
    defaultBranch: repo.default_branch,
    language: repo.language,
    updatedAt: repo.updated_at,
    htmlUrl: repo.html_url
  }));
}

export async function getRepository(octokit: Octokit, owner: string, repo: string) {
  const response = await octokit.repos.get({ owner, repo });
  const data = response.data;
  return {
    id: data.id,
    fullName: data.full_name,
    private: data.private,
    archived: data.archived,
    defaultBranch: data.default_branch,
    language: data.language,
    description: data.description,
    openIssuesCount: data.open_issues_count,
    updatedAt: data.updated_at,
    htmlUrl: data.html_url,
    permissions: data.permissions
  };
}

export async function getRepositoryMap(octokit: Octokit, owner: string, repo: string) {
  const [repository, branches, labels, issues, pulls, releases] = await Promise.all([
    octokit.repos.get({ owner, repo }),
    octokit.repos.listBranches({ owner, repo, per_page: 100 }),
    octokit.issues.listLabelsForRepo({ owner, repo, per_page: 100 }),
    octokit.issues.listForRepo({ owner, repo, state: 'open', per_page: 100 }),
    octokit.pulls.list({ owner, repo, state: 'open', per_page: 100 }),
    octokit.repos.listReleases({ owner, repo, per_page: 20 })
  ]);
  return {
    repository: {
      fullName: repository.data.full_name,
      defaultBranch: repository.data.default_branch,
      private: repository.data.private,
      archived: repository.data.archived
    },
    branches: branches.data.map((branch) => ({ name: branch.name, protected: branch.protected, sha: branch.commit.sha })),
    labels: labels.data.map((label) => ({ name: label.name, color: label.color, description: label.description })),
    issues: issues.data.filter((issue) => !issue.pull_request).map((issue) => ({ number: issue.number, title: issue.title, updatedAt: issue.updated_at })),
    pullRequests: pulls.data.map((pull) => ({ number: pull.number, title: pull.title, draft: pull.draft, head: pull.head.ref, base: pull.base.ref, updatedAt: pull.updated_at })),
    releases: releases.data.map((release) => ({ tagName: release.tag_name, name: release.name, draft: release.draft, prerelease: release.prerelease, publishedAt: release.published_at }))
  };
}
