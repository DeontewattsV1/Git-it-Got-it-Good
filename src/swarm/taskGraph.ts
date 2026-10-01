import type { SwarmTask } from '../types.js';

export function buildGitHubTaskGraph(goal: string): SwarmTask[] {
  const text = goal.toLowerCase();
  const tasks: SwarmTask[] = [{
    id: 'map_repositories', role: 'cartographer',
    objective: 'Map relevant repository state using read-only GitHub tools.',
    dependsOn: [], riskLevel: 'low', status: 'pending'
  }];
  if (['issue', 'bug', 'triage'].some((term) => text.includes(term))) {
    tasks.push({ id: 'triage_issues', role: 'triage', objective: 'Classify issue state without mutation.', dependsOn: ['map_repositories'], riskLevel: 'low', status: 'pending' });
  }
  if (['pull request', 'pr', 'review', 'merge'].some((term) => text.includes(term))) {
    tasks.push({ id: 'review_pull_requests', role: 'code_analyst', objective: 'Assess pull requests and merge readiness without merging.', dependsOn: ['map_repositories'], riskLevel: 'low', status: 'pending' });
  }
  if (['file', 'code', 'readme', 'docs'].some((term) => text.includes(term))) {
    tasks.push({ id: 'inspect_files', role: 'code_analyst', objective: 'Read selected repository files and report grounded findings.', dependsOn: ['map_repositories'], riskLevel: 'low', status: 'pending' });
  }
  tasks.push({ id: 'guardian_review', role: 'guardian', objective: 'Confirm the plan remains read-only and evidence-grounded.', dependsOn: tasks.map((task) => task.id), riskLevel: 'low', status: 'pending' });
  return tasks;
}
