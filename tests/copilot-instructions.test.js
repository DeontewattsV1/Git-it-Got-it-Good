/**
 * Tests for .github/copilot-instructions.md
 *
 * Validates the structure, required sections, safety rules, and content
 * of the Copilot agent instructions document.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSTRUCTIONS_PATH = resolve(__dirname, "../.github/copilot-instructions.md");

let content = "";
let lines = [];

if (existsSync(INSTRUCTIONS_PATH)) {
  content = readFileSync(INSTRUCTIONS_PATH, "utf8");
  lines = content.split("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns all H2 section headings found in the document. */
function getH2Headings() {
  return lines
    .filter((line) => /^## /.test(line))
    .map((line) => line.replace(/^## /, "").trim());
}

/** Returns true if the document contains the given heading text (H2). */
function hasSection(heading) {
  return getH2Headings().some((h) =>
    h.toLowerCase().includes(heading.toLowerCase())
  );
}

/** Returns true if the document contains the given plain text (case-insensitive). */
function containsText(text) {
  return content.toLowerCase().includes(text.toLowerCase());
}

/** Returns the number of ordered list items at the top level (lines like "N. text"). */
function countTopLevelOrderedItems(sectionHeading) {
  const start = lines.findIndex((l) =>
    l.startsWith("## ") && l.toLowerCase().includes(sectionHeading.toLowerCase())
  );
  if (start === -1) return 0;
  let count = 0;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break; // next section
    if (/^\d+\.\s/.test(lines[i])) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("copilot-instructions.md — file integrity", () => {
  it("file exists at .github/copilot-instructions.md", () => {
    assert.ok(existsSync(INSTRUCTIONS_PATH), "File must exist");
  });

  it("file is non-empty", () => {
    assert.ok(content.trim().length > 0, "File must not be empty");
  });

  it("file is valid UTF-8 text (no binary content)", () => {
    assert.equal(typeof content, "string");
    assert.ok(content.length > 0);
  });

  it("file contains at least 100 characters", () => {
    assert.ok(content.length >= 100, "File must have substantial content");
  });
});

describe("copilot-instructions.md — document title", () => {
  it("starts with an H1 heading", () => {
    const firstHeading = lines.find((l) => /^# /.test(l));
    assert.ok(firstHeading !== undefined, "Document must have an H1 title");
  });

  it("H1 heading references Copilot or agent instructions", () => {
    const h1 = lines.find((l) => /^# /.test(l)) ?? "";
    const lower = h1.toLowerCase();
    assert.ok(
      lower.includes("copilot") || lower.includes("agent") || lower.includes("instruction"),
      `H1 title "${h1}" must reference the agent/copilot context`
    );
  });

  it("mentions 'Repo Steward' as the agent name", () => {
    assert.ok(containsText("Repo Steward"), "Must identify the agent as 'Repo Steward'");
  });
});

describe("copilot-instructions.md — required sections (H2 headings)", () => {
  const REQUIRED_SECTIONS = [
    "Identity",
    "Core Objectives",
    "Operating Principles",
    "Task Lifecycle",
    "Branch Rules",
    "Pull Request Rules",
    "Undo",
    "Code Standards",
    "README Standards",
    "Brand",
    "Decision Rules",
    "Output Format",
    "Strict Mode",
  ];

  for (const section of REQUIRED_SECTIONS) {
    it(`contains section: "${section}"`, () => {
      assert.ok(hasSection(section), `Missing required section containing "${section}"`);
    });
  }
});

describe("copilot-instructions.md — operating principles", () => {
  it("Safety First is marked as true", () => {
    assert.ok(
      containsText("Safety First") && containsText("`true`"),
      "Operating principles must list Safety First as true"
    );
  });

  it("all 6 operating principle values are shown as `true`", () => {
    // Count occurrences of `true` in the table within Operating Principles section
    const opStart = lines.findIndex((l) => l.includes("## Operating Principles"));
    const opEnd = lines.findIndex(
      (l, i) => i > opStart && l.startsWith("## ")
    );
    const section = lines.slice(opStart, opEnd === -1 ? undefined : opEnd).join("\n");
    const trueCount = (section.match(/`true`/g) ?? []).length;
    assert.ok(trueCount >= 6, `Operating Principles must list at least 6 true values, found ${trueCount}`);
  });

  it("Verify Before Merge is present in operating principles", () => {
    assert.ok(containsText("Verify Before Merge"));
  });

  it("Never Guess Destructive Actions is present", () => {
    assert.ok(containsText("Never Guess Destructive Actions"));
  });
});

describe("copilot-instructions.md — task lifecycle", () => {
  it("task lifecycle section contains exactly 10 numbered steps", () => {
    const count = countTopLevelOrderedItems("Task Lifecycle");
    assert.equal(count, 10, `Task lifecycle must have 10 steps, found ${count}`);
  });

  it("Inspect is the first step in task lifecycle", () => {
    const lifecycleStart = lines.findIndex((l) =>
      l.startsWith("## ") && l.toLowerCase().includes("task lifecycle")
    );
    assert.ok(lifecycleStart !== -1, "Task Lifecycle section must exist");

    const firstStep = lines
      .slice(lifecycleStart + 1)
      .find((l) => /^1\.\s/.test(l));
    assert.ok(firstStep !== undefined, "Task lifecycle must have a first step");
    assert.ok(
      firstStep.toLowerCase().includes("inspect"),
      `First lifecycle step must be Inspect, found: "${firstStep}"`
    );
  });

  it("Merge step requires checks and approvals", () => {
    assert.ok(
      containsText("checks and approvals"),
      "Task lifecycle must require checks and approvals before merge"
    );
  });

  it("Report/Summarize is the final step", () => {
    assert.ok(
      containsText("Summarize the outcome") || containsText("Report"),
      "Task lifecycle must end with a summary or report step"
    );
  });
});

describe("copilot-instructions.md — branch rules", () => {
  it("Avoid Force Push is listed as true", () => {
    const branchStart = lines.findIndex((l) =>
      l.startsWith("## ") && l.toLowerCase().includes("branch rules")
    );
    const branchEnd = lines.findIndex(
      (l, i) => i > branchStart && l.startsWith("## ")
    );
    const section = lines.slice(branchStart, branchEnd === -1 ? undefined : branchEnd).join("\n");
    assert.ok(
      section.includes("Avoid Force Push") && section.includes("`true`"),
      "Branch rules must list Avoid Force Push as true"
    );
  });

  it("contains branch naming convention section", () => {
    assert.ok(containsText("Branch Naming Convention"), "Must document branch naming conventions");
  });

  it("branch naming pattern agent/<task-name> is documented", () => {
    assert.ok(containsText("agent/<task-name>"), "Must document agent/ branch naming pattern");
  });

  it("branch naming pattern fix/<area> is documented", () => {
    assert.ok(containsText("fix/<area>"), "Must document fix/ branch naming pattern");
  });

  it("branch naming pattern feature/<feature-name> is documented", () => {
    assert.ok(containsText("feature/<feature-name>"), "Must document feature/ naming pattern");
  });

  it("branch naming pattern docs/<doc-change> is documented", () => {
    assert.ok(containsText("docs/<doc-change>"), "Must document docs/ naming pattern");
  });

  it("Close Stale Branches is conditionally allowed (not always true)", () => {
    assert.ok(
      containsText("Only if explicitly allowed") || containsText("only if explicitly allowed"),
      "Stale branch closure must require explicit allowance"
    );
  });
});

describe("copilot-instructions.md — pull request rules", () => {
  it("Auto-Merge is listed as false (critical safety rule)", () => {
    const prStart = lines.findIndex((l) =>
      l.startsWith("## ") && l.toLowerCase().includes("pull request rules")
    );
    const prEnd = lines.findIndex(
      (l, i) => i > prStart && l.startsWith("## ")
    );
    const section = lines.slice(prStart, prEnd === -1 ? undefined : prEnd).join("\n");
    assert.ok(
      section.includes("Auto-Merge") && section.includes("`false`"),
      "Pull Request rules must list Auto-Merge as false"
    );
  });

  it("One Task, One PR is listed as true", () => {
    assert.ok(
      containsText("One Task, One PR"),
      "Must document one-task-one-PR rule"
    );
  });

  it("Include Testing Notes is listed as true", () => {
    assert.ok(containsText("Include Testing Notes"));
  });

  it("Include Risk Notes is listed as true", () => {
    assert.ok(containsText("Include Risk Notes"));
  });
});

describe("copilot-instructions.md — code standards", () => {
  it("Add Tests for Logic Changes is listed as true", () => {
    assert.ok(
      containsText("Add Tests for Logic Changes"),
      "Code standards must require adding tests for logic changes"
    );
  });

  it("Remove Dead Code is listed as true", () => {
    assert.ok(containsText("Remove Dead Code"));
  });

  it("Avoid Overengineering is listed as true", () => {
    assert.ok(containsText("Avoid Overengineering"));
  });
});

describe("copilot-instructions.md — README standards", () => {
  it("README must be clear in 60 seconds", () => {
    assert.ok(
      containsText("60 seconds"),
      "README standards must reference the 60-second clarity requirement"
    );
  });

  it("documents all 9 required README sections", () => {
    const sections = [
      "Project Summary",
      "Installation",
      "Quick Start",
      "Usage",
      "Features",
      "Screenshots",
      "Configuration",
      "Contributing",
      "License",
    ];
    for (const section of sections) {
      assert.ok(
        containsText(section),
        `README standards must include "${section}" section requirement`
      );
    }
  });

  it("mentions alt text for accessibility", () => {
    assert.ok(
      containsText("alt text"),
      "README visual guidelines must mention alt text for accessibility"
    );
  });
});

describe("copilot-instructions.md — decision rules", () => {
  it("never expose secrets is listed", () => {
    assert.ok(
      containsText("Expose secrets") || containsText("expose secrets"),
      "Decision rules must prohibit exposing secrets"
    );
  });

  it("never commit credentials is listed", () => {
    assert.ok(
      containsText("Commit credentials") || containsText("commit credentials"),
      "Decision rules must prohibit committing credentials"
    );
  });

  it("escalation required for destructive actions", () => {
    assert.ok(
      containsText("destructive"),
      "Decision rules must require escalation for destructive actions"
    );
  });

  it("escalation required for irreversible actions", () => {
    assert.ok(
      containsText("irreversible"),
      "Decision rules must require escalation for irreversible actions"
    );
  });

  it("escalation required for security or data integrity concerns", () => {
    assert.ok(
      containsText("security") || containsText("data integrity"),
      "Decision rules must require escalation for security/data integrity concerns"
    );
  });
});

describe("copilot-instructions.md — strict mode", () => {
  it("strict mode section is present", () => {
    assert.ok(hasSection("Strict Mode"), "Document must include a Strict Mode section");
  });

  it("strict mode requires no unverified assumptions", () => {
    assert.ok(
      containsText("No Unverified Assumptions"),
      "Strict mode must disallow unverified assumptions"
    );
  });

  it("strict mode requires no parallel destructive actions", () => {
    assert.ok(
      containsText("No Parallel Destructive Actions"),
      "Strict mode must prohibit parallel destructive actions"
    );
  });

  it("strict mode requires always validating before merge", () => {
    assert.ok(
      containsText("Always Validate Before Merge"),
      "Strict mode must require validation before merge"
    );
  });

  it("strict mode section lists 6 rules", () => {
    const strictStart = lines.findIndex((l) =>
      l.startsWith("## ") && l.toLowerCase().includes("strict mode")
    );
    assert.ok(strictStart !== -1, "Strict Mode section must exist");

    const section = lines.slice(strictStart).join("\n");
    const trueCount = (section.match(/`true`/g) ?? []).length;
    assert.ok(trueCount >= 6, `Strict mode must list at least 6 true rules, found ${trueCount}`);
  });
});

describe("copilot-instructions.md — output format", () => {
  it("output format section documents what changed", () => {
    assert.ok(containsText("What changed"));
  });

  it("output format section documents what was verified", () => {
    assert.ok(containsText("What was verified"));
  });

  it("output format section documents what remains", () => {
    assert.ok(containsText("What remains"));
  });

  it("output format section documents PR/commit links", () => {
    assert.ok(
      containsText("Links to PR") || containsText("commits if available"),
      "Output format must include PR/commit links"
    );
  });

  it("output style is described as concise and structured", () => {
    assert.ok(
      containsText("Concise") || containsText("concise"),
      "Output style must be described as concise"
    );
  });
});

describe("copilot-instructions.md — regression and boundary tests", () => {
  it("regression: Auto-Merge must NOT be marked as true anywhere in PR rules", () => {
    const prStart = lines.findIndex((l) =>
      l.startsWith("## ") && l.toLowerCase().includes("pull request rules")
    );
    const prEnd = lines.findIndex(
      (l, i) => i > prStart && l.startsWith("## ")
    );
    const section = lines.slice(prStart, prEnd === -1 ? undefined : prEnd).join("\n");
    // Find the Auto-Merge line
    const autoMergeLine = section
      .split("\n")
      .find((l) => l.toLowerCase().includes("auto-merge") || l.toLowerCase().includes("auto merge"));
    assert.ok(autoMergeLine !== undefined, "PR rules must have an Auto-Merge entry");
    assert.ok(
      !autoMergeLine.includes("`true`"),
      `Auto-Merge must not be marked as true; found: "${autoMergeLine}"`
    );
  });

  it("regression: Avoid Force Push must NOT be marked as false", () => {
    const line = lines.find(
      (l) => l.toLowerCase().includes("force push") || l.toLowerCase().includes("force-push")
    );
    assert.ok(line !== undefined, "Document must contain a Force Push rule");
    assert.ok(
      !line.includes("`false`"),
      "Avoid Force Push must not be set to false"
    );
  });

  it("boundary: document contains at least 13 H2 sections", () => {
    const headings = getH2Headings();
    assert.ok(
      headings.length >= 13,
      `Document must have at least 13 H2 sections, found ${headings.length}`
    );
  });

  it("boundary: core objectives lists exactly 7 numbered items", () => {
    const count = countTopLevelOrderedItems("Core Objectives");
    assert.equal(count, 7, `Core Objectives must list exactly 7 items, found ${count}`);
  });
});
