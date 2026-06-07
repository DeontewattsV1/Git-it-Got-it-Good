/**
 * Tests for .github/workflows/dependabot-auto-merge.yml
 *
 * Validates the structure, trigger configuration, permissions, job conditions,
 * and step definitions of the Dependabot auto-merge workflow.
 *
 * Also validates that deleted files (.github/PULL_REQUEST_TEMPLATE.md and
 * .github/workflows/branch-cleanup.yml) no longer exist in the repository.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = resolve(
  __dirname,
  "../.github/workflows/dependabot-auto-merge.yml"
);
const PR_TEMPLATE_PATH = resolve(
  __dirname,
  "../.github/PULL_REQUEST_TEMPLATE.md"
);
const BRANCH_CLEANUP_PATH = resolve(
  __dirname,
  "../.github/workflows/branch-cleanup.yml"
);

let content = "";
let lines = [];

if (existsSync(WORKFLOW_PATH)) {
  content = readFileSync(WORKFLOW_PATH, "utf8");
  lines = content.split("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the content contains the given text (exact, case-sensitive). */
function contains(text) {
  return content.includes(text);
}

/** Returns true if any line matches the given regex. */
function hasLine(regex) {
  return lines.some((line) => regex.test(line));
}

/** Returns all lines that match the given regex. */
function matchingLines(regex) {
  return lines.filter((line) => regex.test(line));
}

// ---------------------------------------------------------------------------
// File Integrity
// ---------------------------------------------------------------------------

describe("dependabot-auto-merge.yml — file integrity", () => {
  it("workflow file exists at .github/workflows/dependabot-auto-merge.yml", () => {
    assert.ok(existsSync(WORKFLOW_PATH), "Workflow file must exist");
  });

  it("file is non-empty", () => {
    assert.ok(content.trim().length > 0, "File must not be empty");
  });

  it("file is readable UTF-8 text", () => {
    assert.equal(typeof content, "string");
    assert.ok(content.length > 0);
  });

  it("file contains at least 50 characters", () => {
    assert.ok(
      content.trim().length >= 50,
      "File must have meaningful content"
    );
  });
});

// ---------------------------------------------------------------------------
// Workflow Name
// ---------------------------------------------------------------------------

describe("dependabot-auto-merge.yml — workflow name", () => {
  it("declares the workflow name as 'dependabot-auto-merge'", () => {
    assert.ok(
      hasLine(/^name:\s*dependabot-auto-merge\s*$/),
      "Workflow must declare name: dependabot-auto-merge"
    );
  });
});

// ---------------------------------------------------------------------------
// Trigger Configuration
// ---------------------------------------------------------------------------

describe("dependabot-auto-merge.yml — trigger events", () => {
  it("triggers on pull_request events", () => {
    assert.ok(
      contains("pull_request:"),
      "Workflow must trigger on pull_request"
    );
  });

  it("includes 'opened' in pull_request event types", () => {
    assert.ok(
      contains("opened"),
      "Workflow must handle 'opened' pull_request events"
    );
  });

  it("includes 'synchronize' in pull_request event types", () => {
    assert.ok(
      contains("synchronize"),
      "Workflow must handle 'synchronize' pull_request events"
    );
  });

  it("includes 'reopened' in pull_request event types", () => {
    assert.ok(
      contains("reopened"),
      "Workflow must handle 'reopened' pull_request events"
    );
  });

  it("includes 'labeled' in pull_request event types", () => {
    assert.ok(
      contains("labeled"),
      "Workflow must handle 'labeled' pull_request events"
    );
  });

  it("triggers on workflow_run completion", () => {
    assert.ok(
      contains("workflow_run:"),
      "Workflow must trigger on workflow_run events"
    );
  });

  it("workflow_run trigger matches all workflows using wildcard", () => {
    assert.ok(
      contains('workflows: ["*"]') || contains("workflows: ['*']"),
      "workflow_run trigger must match all workflows with wildcard"
    );
  });

  it("workflow_run trigger fires on 'completed' type", () => {
    // The completed type should appear in the triggers section
    const completedLine = lines.find((l) => l.trim() === "types: [completed]");
    assert.ok(
      completedLine !== undefined,
      "workflow_run must trigger on 'completed' type"
    );
  });
});

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

describe("dependabot-auto-merge.yml — permissions", () => {
  it("declares a top-level permissions block", () => {
    assert.ok(
      hasLine(/^permissions:\s*$/),
      "Workflow must have a top-level permissions block"
    );
  });

  it("grants contents: write permission", () => {
    assert.ok(
      hasLine(/^\s+contents:\s*write\s*$/),
      "Workflow must grant contents: write"
    );
  });

  it("grants pull-requests: write permission", () => {
    assert.ok(
      hasLine(/^\s+pull-requests:\s*write\s*$/),
      "Workflow must grant pull-requests: write"
    );
  });

  it("grants statuses: read permission", () => {
    assert.ok(
      hasLine(/^\s+statuses:\s*read\s*$/),
      "Workflow must grant statuses: read"
    );
  });

  it("does not grant admin or packages permissions", () => {
    const permissionLines = matchingLines(/^\s+(admin|packages):/);
    assert.equal(
      permissionLines.length,
      0,
      "Workflow must not grant admin or packages permissions"
    );
  });
});

// ---------------------------------------------------------------------------
// Job Configuration
// ---------------------------------------------------------------------------

describe("dependabot-auto-merge.yml — job configuration", () => {
  it("defines the 'auto-merge' job", () => {
    assert.ok(
      hasLine(/^\s+auto-merge:\s*$/),
      "Workflow must define an 'auto-merge' job"
    );
  });

  it("job runs on ubuntu-latest", () => {
    assert.ok(
      hasLine(/^\s+runs-on:\s*ubuntu-latest\s*$/),
      "Job must run on ubuntu-latest"
    );
  });

  it("job has an 'if' condition restricting to dependabot[bot]", () => {
    assert.ok(
      hasLine(/^\s+if:\s*github\.actor\s*==\s*'dependabot\[bot\]'\s*$/),
      "Job must only run when github.actor is 'dependabot[bot]'"
    );
  });

  it("job condition uses exact actor string 'dependabot[bot]'", () => {
    assert.ok(
      contains("github.actor == 'dependabot[bot]'"),
      "If condition must exactly match 'dependabot[bot]'"
    );
  });
});

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

describe("dependabot-auto-merge.yml — steps", () => {
  it("contains a step to wait for CI checks", () => {
    assert.ok(
      contains("Wait for CI checks to pass"),
      "Workflow must have a step that waits for CI checks"
    );
  });

  it("uses actions/github-script@v7 for the CI check step", () => {
    assert.ok(
      hasLine(/^\s+uses:\s*actions\/github-script@v7\s*$/),
      "CI check step must use actions/github-script@v7"
    );
  });

  it("contains a step to enable auto-merge", () => {
    assert.ok(
      contains("Enable auto-merge"),
      "Workflow must have a step to enable auto-merge"
    );
  });

  it("uses gh pr merge to enable auto-merge", () => {
    assert.ok(
      contains("gh pr merge"),
      "Auto-merge step must invoke 'gh pr merge'"
    );
  });

  it("uses --admin flag when merging", () => {
    assert.ok(
      contains("gh pr merge --admin"),
      "Merge command must include the --admin flag"
    );
  });

  it("uses --auto flag when merging", () => {
    assert.ok(
      contains("--auto"),
      "Merge command must include the --auto flag"
    );
  });

  it("uses --merge strategy when merging", () => {
    assert.ok(
      contains("--merge"),
      "Merge command must include the --merge strategy flag"
    );
  });

  it("passes the PR number to gh pr merge", () => {
    assert.ok(
      contains("github.event.pull_request.number"),
      "Merge command must reference github.event.pull_request.number"
    );
  });

  it("sets GH_TOKEN environment variable for the auto-merge step", () => {
    assert.ok(
      contains("GH_TOKEN"),
      "Auto-merge step must set GH_TOKEN environment variable"
    );
  });

  it("uses GITHUB_TOKEN secret for GH_TOKEN", () => {
    assert.ok(
      contains("secrets.GITHUB_TOKEN"),
      "GH_TOKEN must be sourced from secrets.GITHUB_TOKEN"
    );
  });
});

// ---------------------------------------------------------------------------
// Inline Script Logic
// ---------------------------------------------------------------------------

describe("dependabot-auto-merge.yml — inline CI check script", () => {
  it("script extracts PR number from pull_request context", () => {
    assert.ok(
      contains("context.payload.pull_request?.number"),
      "Script must read PR number from pull_request context"
    );
  });

  it("script extracts PR number from workflow_run context as fallback", () => {
    assert.ok(
      contains("context.payload.workflow_run?.pull_requests"),
      "Script must read PR number from workflow_run context"
    );
  });

  it("script returns early when no PR number is found", () => {
    assert.ok(
      contains("if (!pull_number)"),
      "Script must handle missing PR number gracefully"
    );
  });

  it("script extracts commit SHA from pull_request context", () => {
    assert.ok(
      contains("context.payload.pull_request?.head?.sha"),
      "Script must read commit SHA from pull_request"
    );
  });

  it("script extracts commit SHA from workflow_run context as fallback", () => {
    assert.ok(
      contains("context.payload.workflow_run?.head_sha"),
      "Script must read commit SHA from workflow_run context"
    );
  });

  it("script calls getCombinedStatusForRef API", () => {
    assert.ok(
      contains("getCombinedStatusForRef"),
      "Script must call GitHub API to get combined status"
    );
  });

  it("script exits with code 1 when status is pending", () => {
    // Both the pending check and exit(1) must be present
    assert.ok(
      contains("status.state === 'pending'"),
      "Script must check for pending status"
    );
    assert.ok(
      contains("process.exit(1)"),
      "Script must exit with code 1 on failure"
    );
  });

  it("script exits with code 1 when status is not success", () => {
    assert.ok(
      contains("status.state !== 'success'"),
      "Script must check that state is success before proceeding"
    );
  });

  it("script logs pending check names when status is pending", () => {
    assert.ok(
      contains("pendingChecks"),
      "Script must identify and log pending check names"
    );
  });

  it("script logs a success message when all checks pass", () => {
    assert.ok(
      contains("All checks passed"),
      "Script must log confirmation when all checks pass"
    );
  });
});

// ---------------------------------------------------------------------------
// Security / Regression Tests
// ---------------------------------------------------------------------------

describe("dependabot-auto-merge.yml — security and regression", () => {
  it("only runs for dependabot[bot] actor, not any other actor", () => {
    // The if condition must specifically name dependabot[bot]
    const ifLines = matchingLines(/^\s+if:/);
    assert.ok(ifLines.length > 0, "Job must have an 'if' condition");
    const ifLine = ifLines[0];
    assert.ok(
      ifLine.includes("dependabot[bot]"),
      "If condition must specifically name dependabot[bot]"
    );
    // Must not use a wildcard or broad check
    assert.ok(
      !ifLine.includes("*"),
      "If condition must not use wildcards"
    );
  });

  it("uses a pinned major version of actions/github-script (v7)", () => {
    assert.ok(
      contains("actions/github-script@v7"),
      "Must use a pinned major version of actions/github-script"
    );
    assert.ok(
      !contains("actions/github-script@main"),
      "Must not use @main (unpinned) for actions/github-script"
    );
    assert.ok(
      !contains("actions/github-script@latest"),
      "Must not use @latest (unpinned) for actions/github-script"
    );
  });

  it("does not hard-code any secrets or tokens in the workflow body", () => {
    // Should reference secrets via ${{ secrets.* }} syntax, not literal values
    const ghpTokenPattern = /ghp_[A-Za-z0-9]{36}/;
    assert.ok(
      !ghpTokenPattern.test(content),
      "Workflow must not contain hard-coded GitHub tokens"
    );
  });

  it("restricts trigger types for pull_request to explicit list", () => {
    // The types array must be present for pull_request to avoid broad triggers
    assert.ok(
      contains("types: [opened, synchronize, reopened, labeled]"),
      "pull_request trigger must restrict to explicit event types"
    );
  });

  it("workflow_run trigger specifies 'completed' type (not open-ended)", () => {
    assert.ok(
      contains("types: [completed]"),
      "workflow_run trigger must only fire on 'completed' type"
    );
  });
});

// ---------------------------------------------------------------------------
// Deleted Files — Confirmed Removal
// ---------------------------------------------------------------------------

describe("PR cleanup — removed files no longer exist", () => {
  it("branch-cleanup.yml workflow has been removed", () => {
    assert.ok(
      !existsSync(BRANCH_CLEANUP_PATH),
      ".github/workflows/branch-cleanup.yml must not exist after this PR"
    );
  });

  it("PULL_REQUEST_TEMPLATE.md has been removed", () => {
    assert.ok(
      !existsSync(PR_TEMPLATE_PATH),
      ".github/PULL_REQUEST_TEMPLATE.md must not exist after this PR"
    );
  });
});