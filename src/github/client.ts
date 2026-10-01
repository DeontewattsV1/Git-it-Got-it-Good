import { Octokit } from '@octokit/rest';

export function createGitHubClient(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
    userAgent: 'git-it-got-it-good/1.0.0',
    request: { timeout: 15000 }
  });
}
