import type { Octokit } from '@octokit/rest';
import { AppError } from '../utils/errors.js';

export async function readFile(octokit: Octokit, owner: string, repo: string, path: string, ref?: string) {
  const response = await octokit.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(response.data) || response.data.type !== 'file') {
    throw new AppError(`Path is not a file: ${path}`, 404, 'NOT_A_FILE');
  }
  if (!('content' in response.data) || response.data.encoding !== 'base64') {
    throw new AppError(`File content is not directly available: ${path}`, 422, 'UNSUPPORTED_CONTENT');
  }
  return {
    path: response.data.path,
    sha: response.data.sha,
    size: response.data.size,
    encoding: 'utf-8',
    content: Buffer.from(response.data.content, 'base64').toString('utf8')
  };
}
