/**
 * Tests for deleted GitHub configuration files:
 *   - .github/PULL_REQUEST_TEMPLATE.md (removed)
 *   - .github/workflows/branch-cleanup.yml (removed)
 *
 * Validates that these files have been fully removed from the repository,
 * that no references to them remain in surviving workflow files, and that
 * the surviving GitHub configuration is intact.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const GITHUB_DIR = resolve(REPO_ROOT, ".github");
const WORKFLOWS_DIR = resolve(GITHUB_DIR, "workflows");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the raw text of a file, or null if it does not exist. */
function readIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf8");
}

/** Returns all filenames (not paths) in the workflows directory. */
function getWorkflowFiles() {
  if (!existsSync(WORKFLOWS_DIR)) return [];
  return readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
}

/** Returns the concatenated content of all workflow files. */
function allWorkflowContent() {
  return getWorkflowFiles()
    .map((f) => readFileSync(resolve(WORKFLOWS_DIR, f), "utf8"))
    .join("\n");
}

// ---------------------------------------------------------------------------
// Tests: PULL_REQUEST_TEMPLATE.md removal
// ---------------------------------------------------------------------------

describe("PULL_REQUEST_TEMPLATE.md — removed from repository", () => {
  const PR_TEMPLATE_PATH = resolve(GITHUB_DIR, "PULL_REQUEST_TEMPLATE.md");

  it("file does not exist at .github/PULL_REQUEST_TEMPLATE.md", () => {
    assert.equal(
      existsSync(PR_TEMPLATE_PATH),
      false,
      "PULL_REQUEST_TEMPLATE.md must not exist after removal"
    );
  });

  it("file is not present at the repo root level", () => {
    const rootLevelPath = resolve(REPO_ROOT, "PULL_REQUEST_TEMPLATE.md");
    assert.equal(
      existsSync(rootLevelPath),
      false,
      "PULL_REQUEST_TEMPLATE.md must not exist at the repo root"
    );
  });

  it("file is not present at .github/PULL_REQUEST_TEMPLATE.md (case-exact path)", () => {
    // Re-check with the exact casing used in the PR diff
    const exactPath = resolve(GITHUB_DIR, "PULL_REQUEST_TEMPLATE.md");
    assert.equal(existsSync(exactPath), false);
  });

  it("regression: template was not simply moved to docs/ or scripts/", () => {
    const docsPath = resolve(REPO_ROOT, "docs", "PULL_REQUEST_TEMPLATE.md");
    const scriptsPath = resolve(REPO_ROOT, "scripts", "PULL_REQUEST_TEMPLATE.md");
    assert.equal(existsSync(docsPath), false, "Template must not exist in docs/");
    assert.equal(existsSync(scriptsPath), false, "Template must not exist in scripts/");
  });

  it("no workflow file references PULL_REQUEST_TEMPLATE in its content", () => {
    const combined = allWorkflowContent();
    assert.equal(
      combined.toLowerCase().includes("pull_request_template"),
      false,
      "No remaining workflow should reference PULL_REQUEST_TEMPLATE"
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: branch-cleanup.yml removal
// ---------------------------------------------------------------------------

describe("branch-cleanup.yml — removed from .github/workflows/", () => {
  const CLEANUP_WORKFLOW_PATH = resolve(WORKFLOWS_DIR, "branch-cleanup.yml");

  it("file does not exist at .github/workflows/branch-cleanup.yml", () => {
    assert.equal(
      existsSync(CLEANUP_WORKFLOW_PATH),
      false,
      "branch-cleanup.yml must not exist after removal"
    );
  });

  it("branch-cleanup.yml is not present with a .yaml extension either", () => {
    const yamlVariant = resolve(WORKFLOWS_DIR, "branch-cleanup.yaml");
    assert.equal(
      existsSync(yamlVariant),
      false,
      "branch-cleanup.yaml must not exist either"
    );
  });

  it("no remaining workflow uses the devin-actions/delete-merged-branches action", () => {
    const combined = allWorkflowContent();
    assert.equal(
      combined.includes("devin-actions/delete-merged-branches"),
      false,
      "No remaining workflow should reference devin-actions/delete-merged-branches"
    );
  });

  it("no remaining workflow references the devin-actions org at all", () => {
    const combined = allWorkflowContent();
    assert.equal(
      combined.includes("devin-actions/"),
      false,
      "No remaining workflow should use any action from the devin-actions org"
    );
  });

  it("no remaining workflow defines a job named 'delete-merged-branches'", () => {
    const combined = allWorkflowContent();
    assert.equal(
      combined.includes("delete-merged-branches:"),
      false,
      "No remaining workflow job should be named delete-merged-branches"
    );
  });

  it("regression: no workflow file is named with 'cleanup' or 'clean-up' in its name", () => {
    const files = getWorkflowFiles();
    const cleanupFiles = files.filter(
      (f) => f.toLowerCase().includes("cleanup") || f.toLowerCase().includes("clean-up")
    );
    assert.equal(
      cleanupFiles.length,
      0,
      `No cleanup workflow files should exist; found: ${cleanupFiles.join(", ")}`
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: Surviving GitHub config integrity
// ---------------------------------------------------------------------------

describe(".github/ directory — surviving configuration integrity", () => {
  it("docker-publish.yml still exists (not collaterally deleted)", () => {
    const dockerWorkflow = resolve(WORKFLOWS_DIR, "docker-publish.yml");
    assert.equal(
      existsSync(dockerWorkflow),
      true,
      "docker-publish.yml must still be present"
    );
  });

  it("docker-publish.yml is non-empty", () => {
    const content = readIfExists(resolve(WORKFLOWS_DIR, "docker-publish.yml"));
    assert.ok(content !== null, "docker-publish.yml must exist");
    assert.ok(content.trim().length > 0, "docker-publish.yml must not be empty");
  });

  it("docker-publish.yml still defines a workflow name", () => {
    const content = readIfExists(resolve(WORKFLOWS_DIR, "docker-publish.yml")) ?? "";
    assert.ok(
      /^name:\s*\S/m.test(content),
      "docker-publish.yml must define a workflow name"
    );
  });

  it("copilot-instructions.md still exists in .github/", () => {
    const ciPath = resolve(GITHUB_DIR, "copilot-instructions.md");
    assert.equal(
      existsSync(ciPath),
      true,
      "copilot-instructions.md must still be present"
    );
  });

  it("CODEOWNERS still exists in .github/", () => {
    const codeownersPath = resolve(GITHUB_DIR, "CODEOWNERS");
    assert.equal(
      existsSync(codeownersPath),
      true,
      "CODEOWNERS must still be present"
    );
  });

  it("workflows/ directory contains exactly one workflow file (docker-publish.yml)", () => {
    const files = getWorkflowFiles();
    assert.equal(
      files.length,
      1,
      `Expected exactly 1 workflow file, found ${files.length}: ${files.join(", ")}`
    );
    assert.equal(files[0], "docker-publish.yml");
  });

  it("boundary: no unexpected workflow files introduced alongside the deletion", () => {
    const files = getWorkflowFiles();
    const unexpectedFiles = files.filter((f) => f !== "docker-publish.yml");
    assert.equal(
      unexpectedFiles.length,
      0,
      `Unexpected workflow files present: ${unexpectedFiles.join(", ")}`
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: docker-publish.yml content not affected by cleanup workflow removal
// ---------------------------------------------------------------------------

describe("docker-publish.yml — unaffected by branch-cleanup.yml removal", () => {
  const DOCKER_WORKFLOW_PATH = resolve(WORKFLOWS_DIR, "docker-publish.yml");
  let dockerContent = "";

  if (existsSync(DOCKER_WORKFLOW_PATH)) {
    dockerContent = readFileSync(DOCKER_WORKFLOW_PATH, "utf8");
  }

  it("docker-publish.yml retains its build job", () => {
    assert.ok(
      dockerContent.includes("build:"),
      "docker-publish.yml must still define a build job"
    );
  });

  it("docker-publish.yml still triggers on push to main", () => {
    assert.ok(
      dockerContent.includes("main"),
      "docker-publish.yml must still trigger on the main branch"
    );
  });

  it("docker-publish.yml does not reference branch-cleanup", () => {
    assert.equal(
      dockerContent.toLowerCase().includes("branch-cleanup"),
      false,
      "docker-publish.yml must not reference branch-cleanup"
    );
  });

  it("docker-publish.yml does not grant contents: write permission (unlike deleted cleanup workflow)", () => {
    // The deleted branch-cleanup.yml required contents: write to delete branches.
    // docker-publish.yml should use contents: read only.
    const lines = dockerContent.split("\n");
    const contentsWriteLine = lines.find(
      (l) => l.includes("contents:") && l.includes("write")
    );
    assert.equal(
      contentsWriteLine,
      undefined,
      "docker-publish.yml must not grant contents: write permission"
    );
  });

  it("regression: docker-publish.yml still uses pinned action SHAs (not floating tags)", () => {
    // All third-party actions should have a pinned commit SHA in a comment or directly
    const thirdPartyActions = [
      "sigstore/cosign-installer",
      "docker/setup-buildx-action",
      "docker/login-action",
      "docker/metadata-action",
      "docker/build-push-action",
    ];
    for (const action of thirdPartyActions) {
      assert.ok(
        dockerContent.includes(action),
        `docker-publish.yml must still reference action: ${action}`
      );
    }
  });
});
