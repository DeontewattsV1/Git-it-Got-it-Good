export const blueSystemPolicy = {
  name: 'Git Manager Blue System',
  phase: 'read-only-foundation',
  operatingPrinciples: [
    'Read-only inspection is the only GitHub capability exposed in this release.',
    'Use narrow typed tools; never expose raw arbitrary GitHub API execution.',
    'Never return, log, or embed GitHub credentials in MCP bearer tokens.',
    'Repository deletion, secret mutation, force push, merge, release publish, workflow mutation, and file mutation are not exposed.',
    'Recommendations must be grounded in repository evidence.',
    'Log each tool authorization decision without logging tool secrets.'
  ],
  mutationSurface: 'not exposed',
  nextGate: 'Introduce separately reviewed payload-bound human approvals before enabling write tools.'
} as const;
