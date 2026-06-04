/**
 * Tests for docs/agent-rules.json
 *
 * Validates the structure, required fields, types, and critical safety values
 * of the agent rules configuration file.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, "../docs/agent-rules.json");

let rules;

// Parse the file once; individual tests will catch parse failures via the top-level test.
try {
  rules = JSON.parse(readFileSync(RULES_PATH, "utf8"));
} catch {
  rules = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the branch naming patterns defined in branch_rules.branch_naming */
function getBranchNamingPatterns() {
  return rules?.branch_rules?.branch_naming ?? [];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("agent-rules.json — file integrity", () => {
  it("is valid JSON and can be parsed without error", () => {
    const raw = readFileSync(RULES_PATH, "utf8");
    assert.doesNotThrow(() => JSON.parse(raw), "File must be valid JSON");
  });

  it("is non-empty", () => {
    const raw = readFileSync(RULES_PATH, "utf8").trim();
    assert.ok(raw.length > 0, "File must not be empty");
  });
});

describe("agent-rules.json — top-level structure", () => {
  const EXPECTED_KEYS = [
    "identity",
    "core_objectives",
    "operating_principles",
    "task_lifecycle",
    "branch_rules",
    "pr_rules",
    "undo_redo_rules",
    "code_standards",
    "readme_standards",
    "brand_and_asset_rules",
    "decision_rules",
    "output_format",
  ];

  it("contains all required top-level keys", () => {
    assert.ok(rules !== null, "rules must be parsed successfully");
    for (const key of EXPECTED_KEYS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(rules, key),
        `Missing required top-level key: "${key}"`
      );
    }
  });

  it("contains exactly the expected top-level keys (no undocumented additions)", () => {
    const actualKeys = Object.keys(rules).sort();
    const expectedKeys = [...EXPECTED_KEYS].sort();
    assert.deepEqual(
      actualKeys,
      expectedKeys,
      "Top-level keys must match the defined set exactly"
    );
  });
});

describe("agent-rules.json — identity", () => {
  it("has a non-empty string role", () => {
    assert.equal(typeof rules.identity.role, "string");
    assert.ok(rules.identity.role.length > 0);
  });

  it("role is 'autonomous_github_manager'", () => {
    assert.equal(rules.identity.role, "autonomous_github_manager");
  });

  it("name is 'Repo Steward'", () => {
    assert.equal(rules.identity.name, "Repo Steward");
  });

  it("mission is a non-empty string", () => {
    assert.equal(typeof rules.identity.mission, "string");
    assert.ok(rules.identity.mission.length > 0);
  });

  it("mission mentions core responsibilities (branches, PRs, documentation)", () => {
    const mission = rules.identity.mission.toLowerCase();
    assert.ok(mission.includes("branch"), "mission should mention branch management");
    assert.ok(mission.includes("pr") || mission.includes("pull request"), "mission should mention PR management");
    assert.ok(mission.includes("doc"), "mission should mention documentation");
  });
});

describe("agent-rules.json — core_objectives", () => {
  it("is an array", () => {
    assert.ok(Array.isArray(rules.core_objectives));
  });

  it("contains exactly 7 objectives", () => {
    assert.equal(rules.core_objectives.length, 7);
  });

  it("all objectives are non-empty strings", () => {
    for (const [i, obj] of rules.core_objectives.entries()) {
      assert.equal(typeof obj, "string", `objective[${i}] must be a string`);
      assert.ok(obj.length > 0, `objective[${i}] must not be empty`);
    }
  });

  it("first objective is about inspecting repository state before changes", () => {
    assert.ok(
      rules.core_objectives[0].toLowerCase().includes("inspect"),
      "First objective must be to inspect repository state"
    );
  });

  it("includes an objective about PR management", () => {
    const hasPR = rules.core_objectives.some((o) =>
      o.toLowerCase().includes("pull request")
    );
    assert.ok(hasPR, "Must include an objective about pull requests");
  });
});

describe("agent-rules.json — operating_principles", () => {
  const EXPECTED_PRINCIPLES = [
    "safety_first",
    "prefer_small_changes",
    "verify_before_merge",
    "document_everything",
    "preserve_history_when_possible",
    "never_guess_destructive_actions",
  ];

  it("contains all 6 operating principles", () => {
    for (const principle of EXPECTED_PRINCIPLES) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(rules.operating_principles, principle),
        `Missing principle: "${principle}"`
      );
    }
  });

  it("all operating principles are strictly boolean true", () => {
    for (const principle of EXPECTED_PRINCIPLES) {
      assert.strictEqual(
        rules.operating_principles[principle],
        true,
        `"${principle}" must be strictly true, not just truthy`
      );
    }
  });

  it("safety_first is true (critical safety rule)", () => {
    assert.strictEqual(rules.operating_principles.safety_first, true);
  });

  it("never_guess_destructive_actions is true (critical safety rule)", () => {
    assert.strictEqual(rules.operating_principles.never_guess_destructive_actions, true);
  });

  it("verify_before_merge is true (critical safety rule)", () => {
    assert.strictEqual(rules.operating_principles.verify_before_merge, true);
  });
});

describe("agent-rules.json — task_lifecycle", () => {
  it("is an array", () => {
    assert.ok(Array.isArray(rules.task_lifecycle));
  });

  it("contains exactly 10 lifecycle steps", () => {
    assert.equal(rules.task_lifecycle.length, 10);
  });

  it("all steps are non-empty strings", () => {
    for (const [i, step] of rules.task_lifecycle.entries()) {
      assert.equal(typeof step, "string", `step[${i}] must be a string`);
      assert.ok(step.length > 0, `step[${i}] must not be empty`);
    }
  });

  it("first step involves inspecting repository state", () => {
    assert.ok(
      rules.task_lifecycle[0].toLowerCase().includes("inspect"),
      "First lifecycle step must be inspection"
    );
  });

  it("final step involves summarizing the outcome", () => {
    const lastStep = rules.task_lifecycle[rules.task_lifecycle.length - 1].toLowerCase();
    assert.ok(
      lastStep.includes("summar") || lastStep.includes("outcome") || lastStep.includes("report"),
      "Final lifecycle step must be a summary/report"
    );
  });
});

describe("agent-rules.json — branch_rules", () => {
  it("delete_merged_branches is true", () => {
    assert.strictEqual(rules.branch_rules.delete_merged_branches, true);
  });

  it("delete_only_when_safe is true (safety guard)", () => {
    assert.strictEqual(rules.branch_rules.delete_only_when_safe, true);
  });

  it("avoid_force_push is true (destructive operation guard)", () => {
    assert.strictEqual(rules.branch_rules.avoid_force_push, true);
  });

  it("prune_remote_tracking_refs is true", () => {
    assert.strictEqual(rules.branch_rules.prune_remote_tracking_refs, true);
  });

  it("close_stale_branches is 'only_if_explicitly_allowed' (not a boolean true)", () => {
    assert.equal(rules.branch_rules.close_stale_branches, "only_if_explicitly_allowed");
    assert.notEqual(rules.branch_rules.close_stale_branches, true);
  });

  it("branch_naming is an array", () => {
    assert.ok(Array.isArray(rules.branch_rules.branch_naming));
  });

  it("branch_naming contains exactly 4 patterns", () => {
    assert.equal(rules.branch_rules.branch_naming.length, 4);
  });

  it("branch_naming includes agent/ pattern", () => {
    assert.ok(
      rules.branch_rules.branch_naming.some((p) => p.startsWith("agent/")),
      "Must include agent/<task-name> pattern"
    );
  });

  it("branch_naming includes fix/ pattern", () => {
    assert.ok(
      rules.branch_rules.branch_naming.some((p) => p.startsWith("fix/")),
      "Must include fix/<area> pattern"
    );
  });

  it("branch_naming includes feature/ pattern", () => {
    assert.ok(
      rules.branch_rules.branch_naming.some((p) => p.startsWith("feature/")),
      "Must include feature/<feature-name> pattern"
    );
  });

  it("branch_naming includes docs/ pattern", () => {
    assert.ok(
      rules.branch_rules.branch_naming.some((p) => p.startsWith("docs/")),
      "Must include docs/<doc-change> pattern"
    );
  });

  it("all branch_naming entries follow <prefix>/<placeholder> format", () => {
    const validPattern = /^[a-z]+\/.+$/;
    for (const pattern of getBranchNamingPatterns()) {
      assert.match(
        pattern,
        validPattern,
        `"${pattern}" does not follow <prefix>/<placeholder> format`
      );
    }
  });
});

describe("agent-rules.json — pr_rules", () => {
  it("auto_merge_only_if_allowed is false (critical safety rule — no auto-merge)", () => {
    assert.strictEqual(rules.pr_rules.auto_merge_only_if_allowed, false);
  });

  it("auto_merge_only_if_allowed is strictly false, not null or undefined", () => {
    assert.equal(rules.pr_rules.auto_merge_only_if_allowed, false);
    assert.notEqual(rules.pr_rules.auto_merge_only_if_allowed, null);
    assert.notEqual(rules.pr_rules.auto_merge_only_if_allowed, undefined);
  });

  it("one_task_one_pr is true", () => {
    assert.strictEqual(rules.pr_rules.one_task_one_pr, true);
  });

  it("keep_prs_narrow is true", () => {
    assert.strictEqual(rules.pr_rules.keep_prs_narrow, true);
  });

  it("include_testing_notes is true", () => {
    assert.strictEqual(rules.pr_rules.include_testing_notes, true);
  });

  it("include_risk_notes is true", () => {
    assert.strictEqual(rules.pr_rules.include_risk_notes, true);
  });

  it("request_review_when_ready is true", () => {
    assert.strictEqual(rules.pr_rules.request_review_when_ready, true);
  });
});

describe("agent-rules.json — undo_redo_rules", () => {
  it("undo_preference is an array", () => {
    assert.ok(Array.isArray(rules.undo_redo_rules.undo_preference));
  });

  it("undo_preference contains exactly 3 items", () => {
    assert.equal(rules.undo_redo_rules.undo_preference.length, 3);
  });

  it("undo_preference first item uses 'git revert' on shared branches", () => {
    assert.ok(
      rules.undo_redo_rules.undo_preference[0].includes("git revert"),
      "First undo preference must specify 'git revert'"
    );
    assert.ok(
      rules.undo_redo_rules.undo_preference[0].toLowerCase().includes("shared"),
      "First undo preference must reference shared branches"
    );
  });

  it("undo_preference includes safe reset only on private branches", () => {
    const hasPrivateReset = rules.undo_redo_rules.undo_preference.some(
      (p) => p.toLowerCase().includes("private")
    );
    assert.ok(hasPrivateReset, "undo_preference must restrict reset to private branches");
  });

  it("redo_behavior is an array", () => {
    assert.ok(Array.isArray(rules.undo_redo_rules.redo_behavior));
  });

  it("redo_behavior contains exactly 3 items", () => {
    assert.equal(rules.undo_redo_rules.redo_behavior.length, 3);
  });

  it("redo_behavior all items are non-empty strings", () => {
    for (const [i, item] of rules.undo_redo_rules.redo_behavior.entries()) {
      assert.equal(typeof item, "string", `redo_behavior[${i}] must be a string`);
      assert.ok(item.length > 0);
    }
  });
});

describe("agent-rules.json — code_standards", () => {
  const EXPECTED_STANDARDS = [
    "match_existing_style",
    "add_tests_for_logic_changes",
    "remove_dead_code",
    "avoid_overengineering",
    "prefer_readable_small_functions",
    "keep_config_explicit",
  ];

  it("contains all 6 code standards", () => {
    for (const standard of EXPECTED_STANDARDS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(rules.code_standards, standard),
        `Missing code standard: "${standard}"`
      );
    }
  });

  it("all code standards are strictly boolean true", () => {
    for (const standard of EXPECTED_STANDARDS) {
      assert.strictEqual(
        rules.code_standards[standard],
        true,
        `"${standard}" must be strictly true`
      );
    }
  });

  it("add_tests_for_logic_changes is true (testing requirement)", () => {
    assert.strictEqual(rules.code_standards.add_tests_for_logic_changes, true);
  });
});

describe("agent-rules.json — readme_standards", () => {
  it("must_be_clear_in_60_seconds is true", () => {
    assert.strictEqual(rules.readme_standards.must_be_clear_in_60_seconds, true);
  });

  it("include is an array", () => {
    assert.ok(Array.isArray(rules.readme_standards.include));
  });

  it("include contains exactly 9 required sections", () => {
    assert.equal(rules.readme_standards.include.length, 9);
  });

  it("include contains all mandatory README sections", () => {
    const required = [
      "project_summary",
      "installation",
      "quick_start",
      "usage",
      "features",
      "screenshots_or_visuals",
      "configuration",
      "contributing",
      "license",
    ];
    for (const section of required) {
      assert.ok(
        rules.readme_standards.include.includes(section),
        `README include must contain "${section}"`
      );
    }
  });

  it("visuals.use_images is true", () => {
    assert.strictEqual(rules.readme_standards.visuals.use_images, true);
  });

  it("visuals.add_alt_text is true (accessibility requirement)", () => {
    assert.strictEqual(rules.readme_standards.visuals.add_alt_text, true);
  });

  it("visuals.use_badges_only_when_meaningful is true", () => {
    assert.strictEqual(rules.readme_standards.visuals.use_badges_only_when_meaningful, true);
  });

  it("visuals.use_relative_paths_when_possible is true", () => {
    assert.strictEqual(rules.readme_standards.visuals.use_relative_paths_when_possible, true);
  });
});

describe("agent-rules.json — brand_and_asset_rules", () => {
  it("generate_assets_only_when_useful is true", () => {
    assert.strictEqual(rules.brand_and_asset_rules.generate_assets_only_when_useful, true);
  });

  it("keep_brand_consistent is true", () => {
    assert.strictEqual(rules.brand_and_asset_rules.keep_brand_consistent, true);
  });

  it("optimize_image_size is true", () => {
    assert.strictEqual(rules.brand_and_asset_rules.optimize_image_size, true);
  });

  it("use_descriptive_file_names is true", () => {
    assert.strictEqual(rules.brand_and_asset_rules.use_descriptive_file_names, true);
  });

  it("store_assets_in_predictable_folders is an array", () => {
    assert.ok(Array.isArray(rules.brand_and_asset_rules.store_assets_in_predictable_folders));
  });

  it("store_assets_in_predictable_folders contains exactly 3 folders", () => {
    assert.equal(rules.brand_and_asset_rules.store_assets_in_predictable_folders.length, 3);
  });

  it("store_assets_in_predictable_folders includes /assets/brand/", () => {
    assert.ok(
      rules.brand_and_asset_rules.store_assets_in_predictable_folders.includes("/assets/brand/")
    );
  });

  it("store_assets_in_predictable_folders includes /docs/images/", () => {
    assert.ok(
      rules.brand_and_asset_rules.store_assets_in_predictable_folders.includes("/docs/images/")
    );
  });

  it("store_assets_in_predictable_folders includes /public/brand/", () => {
    assert.ok(
      rules.brand_and_asset_rules.store_assets_in_predictable_folders.includes("/public/brand/")
    );
  });

  it("all asset folder paths start with / (absolute-style paths)", () => {
    for (const folder of rules.brand_and_asset_rules.store_assets_in_predictable_folders) {
      assert.ok(folder.startsWith("/"), `"${folder}" must start with /`);
      assert.ok(folder.endsWith("/"), `"${folder}" must end with /`);
    }
  });
});

describe("agent-rules.json — decision_rules", () => {
  it("never_expose_secrets is true (critical security rule)", () => {
    assert.strictEqual(rules.decision_rules.never_expose_secrets, true);
  });

  it("never_commit_credentials is true (critical security rule)", () => {
    assert.strictEqual(rules.decision_rules.never_commit_credentials, true);
  });

  it("ask_or_escalate_if is an array", () => {
    assert.ok(Array.isArray(rules.decision_rules.ask_or_escalate_if));
  });

  it("ask_or_escalate_if contains exactly 5 conditions", () => {
    assert.equal(rules.decision_rules.ask_or_escalate_if.length, 5);
  });

  it("ask_or_escalate_if includes action_is_destructive", () => {
    assert.ok(
      rules.decision_rules.ask_or_escalate_if.includes("action_is_destructive"),
      "Must escalate on destructive actions"
    );
  });

  it("ask_or_escalate_if includes action_is_irreversible", () => {
    assert.ok(
      rules.decision_rules.ask_or_escalate_if.includes("action_is_irreversible"),
      "Must escalate on irreversible actions"
    );
  });

  it("ask_or_escalate_if includes action_affects_security_or_data_integrity", () => {
    assert.ok(
      rules.decision_rules.ask_or_escalate_if.includes(
        "action_affects_security_or_data_integrity"
      ),
      "Must escalate on actions affecting security or data integrity"
    );
  });

  it("ask_or_escalate_if includes requirements_are_ambiguous", () => {
    assert.ok(
      rules.decision_rules.ask_or_escalate_if.includes("requirements_are_ambiguous")
    );
  });

  it("ask_or_escalate_if includes repo_policy_is_missing", () => {
    assert.ok(
      rules.decision_rules.ask_or_escalate_if.includes("repo_policy_is_missing")
    );
  });

  // Regression test: security-sensitive booleans must never be false
  it("regression: both security rules are true and not accidentally set to false", () => {
    assert.notEqual(rules.decision_rules.never_expose_secrets, false);
    assert.notEqual(rules.decision_rules.never_commit_credentials, false);
  });
});

describe("agent-rules.json — output_format", () => {
  it("always_report is an array", () => {
    assert.ok(Array.isArray(rules.output_format.always_report));
  });

  it("always_report contains exactly 4 items", () => {
    assert.equal(rules.output_format.always_report.length, 4);
  });

  it("always_report includes what_changed", () => {
    assert.ok(rules.output_format.always_report.includes("what_changed"));
  });

  it("always_report includes what_was_verified", () => {
    assert.ok(rules.output_format.always_report.includes("what_was_verified"));
  });

  it("always_report includes what_remains", () => {
    assert.ok(rules.output_format.always_report.includes("what_remains"));
  });

  it("always_report includes links_to_pr_or_commits_if_available", () => {
    assert.ok(
      rules.output_format.always_report.includes("links_to_pr_or_commits_if_available")
    );
  });

  it("style is 'concise, direct, structured'", () => {
    assert.equal(rules.output_format.style, "concise, direct, structured");
  });

  it("style is a non-empty string", () => {
    assert.equal(typeof rules.output_format.style, "string");
    assert.ok(rules.output_format.style.length > 0);
  });
});