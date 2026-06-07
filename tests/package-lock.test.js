/**
 * Tests for package-lock.json
 *
 * Validates the structure, lockfile version, dependency presence, exact version
 * pinning (no ranges), and consistency with package.json for the project lockfile.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCKFILE_PATH = resolve(__dirname, "../package-lock.json");
const PACKAGE_JSON_PATH = resolve(__dirname, "../package.json");

let lockfile = null;
let pkg = null;

try {
  lockfile = JSON.parse(readFileSync(LOCKFILE_PATH, "utf8"));
} catch {
  lockfile = null;
}

try {
  pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));
} catch {
  pkg = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the version string is an exact pinned version (no ^, ~, *, ranges).
 */
function isExactVersion(version) {
  return (
    typeof version === "string" &&
    !/[\^~*]/.test(version) &&
    !/^(latest|next|beta|alpha)$/.test(version) &&
    !/\|\|/.test(version) &&
    !version.startsWith(">") &&
    !version.startsWith("<")
  );
}

/**
 * Returns the root package entry (the "" key in packages).
 */
function getRootPackage() {
  return lockfile?.packages?.[""] ?? null;
}

// ---------------------------------------------------------------------------
// File Integrity
// ---------------------------------------------------------------------------

describe("package-lock.json — file integrity", () => {
  it("file exists at project root", () => {
    assert.ok(existsSync(LOCKFILE_PATH), "package-lock.json must exist");
  });

  it("is valid JSON and can be parsed without error", () => {
    const raw = readFileSync(LOCKFILE_PATH, "utf8");
    assert.doesNotThrow(() => JSON.parse(raw), "File must be valid JSON");
  });

  it("is non-empty", () => {
    const raw = readFileSync(LOCKFILE_PATH, "utf8").trim();
    assert.ok(raw.length > 0, "File must not be empty");
  });
});

// ---------------------------------------------------------------------------
// Top-level Structure
// ---------------------------------------------------------------------------

describe("package-lock.json — top-level structure", () => {
  it("has a 'name' field", () => {
    assert.ok(
      typeof lockfile?.name === "string" && lockfile.name.length > 0,
      "Lockfile must have a name field"
    );
  });

  it("name matches package.json project name", () => {
    assert.equal(
      lockfile?.name,
      pkg?.name,
      "Lockfile name must match package.json name"
    );
  });

  it("name is 'git-it-got-it-good'", () => {
    assert.equal(lockfile?.name, "git-it-got-it-good");
  });

  it("has a 'version' field", () => {
    assert.ok(
      typeof lockfile?.version === "string" && lockfile.version.length > 0,
      "Lockfile must have a version field"
    );
  });

  it("version matches package.json version", () => {
    assert.equal(
      lockfile?.version,
      pkg?.version,
      "Lockfile version must match package.json version"
    );
  });

  it("version is '1.0.0'", () => {
    assert.equal(lockfile?.version, "1.0.0");
  });

  it("has lockfileVersion field", () => {
    assert.ok(
      typeof lockfile?.lockfileVersion === "number",
      "Lockfile must have a lockfileVersion field"
    );
  });

  it("uses lockfileVersion 3 (npm 7+ format)", () => {
    assert.equal(
      lockfile?.lockfileVersion,
      3,
      "Lockfile must use version 3 format"
    );
  });

  it("has requires field set to true", () => {
    assert.equal(
      lockfile?.requires,
      true,
      "Lockfile must have requires: true"
    );
  });

  it("has a 'packages' field", () => {
    assert.ok(
      lockfile?.packages !== null && typeof lockfile?.packages === "object",
      "Lockfile must have a packages object"
    );
  });

  it("packages field contains at least one entry", () => {
    assert.ok(
      Object.keys(lockfile?.packages ?? {}).length > 0,
      "Packages must not be empty"
    );
  });
});

// ---------------------------------------------------------------------------
// Root Package Entry
// ---------------------------------------------------------------------------

describe("package-lock.json — root package entry (\"\")", () => {
  it("contains a root package entry with empty string key", () => {
    assert.ok(
      getRootPackage() !== null,
      "Lockfile must contain a root package entry under the '' key"
    );
  });

  it("root entry has a 'dependencies' object", () => {
    const root = getRootPackage();
    assert.ok(
      root?.dependencies !== null && typeof root?.dependencies === "object",
      "Root entry must have a dependencies object"
    );
  });

  it("root entry has a 'devDependencies' object", () => {
    const root = getRootPackage();
    assert.ok(
      root?.devDependencies !== null && typeof root?.devDependencies === "object",
      "Root entry must have a devDependencies object"
    );
  });

  it("root entry has an 'engines' field", () => {
    const root = getRootPackage();
    assert.ok(
      root?.engines !== null && typeof root?.engines === "object",
      "Root entry must have an engines field"
    );
  });

  it("root entry requires Node.js >= 22.11.0", () => {
    const root = getRootPackage();
    assert.ok(
      root?.engines?.node?.includes("22.11.0"),
      "Root entry must require Node.js >= 22.11.0"
    );
  });
});

// ---------------------------------------------------------------------------
// Production Dependencies — Presence & Exact Pinning
// ---------------------------------------------------------------------------

const EXPECTED_PRODUCTION_DEPS = {
  "@octokit/auth-app": "7.1.1",
  "@octokit/rest": "21.0.2",
  "express": "4.21.2",
  "express-rate-limit": "7.4.1",
  "helmet": "8.0.0",
  "ioredis": "5.4.1",
  "pino": "9.5.0",
  "pino-http": "10.3.0",
  "zod": "3.23.8",
};

describe("package-lock.json — production dependencies", () => {
  for (const [name, expectedVersion] of Object.entries(
    EXPECTED_PRODUCTION_DEPS
  )) {
    it(`includes production dependency '${name}'`, () => {
      const root = getRootPackage();
      assert.ok(
        name in (root?.dependencies ?? {}),
        `'${name}' must be listed in root dependencies`
      );
    });

    it(`'${name}' is pinned to exact version ${expectedVersion}`, () => {
      const root = getRootPackage();
      const version = root?.dependencies?.[name];
      assert.equal(
        version,
        expectedVersion,
        `'${name}' must be pinned to ${expectedVersion}`
      );
    });

    it(`'${name}' version has no range operator (^, ~, *)`, () => {
      const root = getRootPackage();
      const version = root?.dependencies?.[name];
      assert.ok(
        isExactVersion(version),
        `'${name}' version '${version}' must be exactly pinned without range operators`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Dev Dependencies — Presence & Exact Pinning
// ---------------------------------------------------------------------------

const EXPECTED_DEV_DEPS = {
  "@types/express": "5.0.0",
  "@types/node": "22.10.1",
  "@typescript-eslint/eslint-plugin": "8.16.0",
  "@typescript-eslint/parser": "8.16.0",
  "eslint": "9.16.0",
  "tsx": "4.19.2",
  "typescript": "5.7.2",
};

describe("package-lock.json — dev dependencies", () => {
  for (const [name, expectedVersion] of Object.entries(EXPECTED_DEV_DEPS)) {
    it(`includes dev dependency '${name}'`, () => {
      const root = getRootPackage();
      assert.ok(
        name in (root?.devDependencies ?? {}),
        `'${name}' must be listed in root devDependencies`
      );
    });

    it(`'${name}' is pinned to exact version ${expectedVersion}`, () => {
      const root = getRootPackage();
      const version = root?.devDependencies?.[name];
      assert.equal(
        version,
        expectedVersion,
        `'${name}' must be pinned to ${expectedVersion}`
      );
    });

    it(`'${name}' version has no range operator (^, ~, *)`, () => {
      const root = getRootPackage();
      const version = root?.devDependencies?.[name];
      assert.ok(
        isExactVersion(version),
        `'${name}' version '${version}' must be exactly pinned without range operators`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Lockfile Consistency with package.json
// ---------------------------------------------------------------------------

describe("package-lock.json — consistency with package.json", () => {
  it("all package.json production dependencies are in lockfile root entry", () => {
    const pkgDeps = Object.keys(pkg?.dependencies ?? {});
    const root = getRootPackage();
    const lockDeps = Object.keys(root?.dependencies ?? {});
    for (const dep of pkgDeps) {
      assert.ok(
        lockDeps.includes(dep),
        `package.json dependency '${dep}' must appear in lockfile root entry`
      );
    }
  });

  it("all package.json devDependencies are in lockfile root entry", () => {
    const pkgDevDeps = Object.keys(pkg?.devDependencies ?? {});
    const root = getRootPackage();
    const lockDevDeps = Object.keys(root?.devDependencies ?? {});
    for (const dep of pkgDevDeps) {
      assert.ok(
        lockDevDeps.includes(dep),
        `package.json devDependency '${dep}' must appear in lockfile root entry`
      );
    }
  });

  it("production dependency count matches package.json", () => {
    const pkgCount = Object.keys(pkg?.dependencies ?? {}).length;
    const lockCount = Object.keys(
      getRootPackage()?.dependencies ?? {}
    ).length;
    assert.equal(
      lockCount,
      pkgCount,
      "Number of production dependencies must match between package.json and lockfile"
    );
  });

  it("dev dependency count matches package.json", () => {
    const pkgCount = Object.keys(pkg?.devDependencies ?? {}).length;
    const lockCount = Object.keys(
      getRootPackage()?.devDependencies ?? {}
    ).length;
    assert.equal(
      lockCount,
      pkgCount,
      "Number of dev dependencies must match between package.json and lockfile"
    );
  });
});

// ---------------------------------------------------------------------------
// node_modules Entries — Key Packages
// ---------------------------------------------------------------------------

describe("package-lock.json — node_modules entries", () => {
  const KEY_PACKAGES = [
    "node_modules/express",
    "node_modules/helmet",
    "node_modules/ioredis",
    "node_modules/pino",
    "node_modules/zod",
    "node_modules/@octokit/rest",
    "node_modules/@octokit/auth-app",
  ];

  for (const pkgPath of KEY_PACKAGES) {
    it(`has a resolved entry for '${pkgPath}'`, () => {
      assert.ok(
        pkgPath in (lockfile?.packages ?? {}),
        `Lockfile must contain a resolved entry for '${pkgPath}'`
      );
    });
  }

  it("node_modules/express entry has a 'version' field", () => {
    const entry = lockfile?.packages?.["node_modules/express"];
    assert.ok(
      typeof entry?.version === "string" && entry.version.length > 0,
      "express entry must have a version field"
    );
  });

  it("node_modules/express version matches root dependency pin (4.21.2)", () => {
    const entry = lockfile?.packages?.["node_modules/express"];
    assert.equal(entry?.version, "4.21.2");
  });

  it("node_modules/helmet version matches root dependency pin (8.0.0)", () => {
    const entry = lockfile?.packages?.["node_modules/helmet"];
    assert.equal(entry?.version, "8.0.0");
  });

  it("node_modules/zod version matches root dependency pin (3.23.8)", () => {
    const entry = lockfile?.packages?.["node_modules/zod"];
    assert.equal(entry?.version, "3.23.8");
  });

  it("each resolved package entry has an 'integrity' field", () => {
    // Sample check on a few key packages
    const toCheck = [
      "node_modules/express",
      "node_modules/helmet",
      "node_modules/zod",
    ];
    for (const pkgPath of toCheck) {
      const entry = lockfile?.packages?.[pkgPath];
      assert.ok(
        typeof entry?.integrity === "string" && entry.integrity.startsWith("sha"),
        `'${pkgPath}' must have an integrity hash starting with 'sha'`
      );
    }
  });

  it("each resolved package entry has a 'resolved' URL field", () => {
    const toCheck = [
      "node_modules/express",
      "node_modules/helmet",
      "node_modules/zod",
    ];
    for (const pkgPath of toCheck) {
      const entry = lockfile?.packages?.[pkgPath];
      assert.ok(
        typeof entry?.resolved === "string" &&
          entry.resolved.startsWith("https://"),
        `'${pkgPath}' must have a resolved HTTPS URL`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Regression / Boundary Tests
// ---------------------------------------------------------------------------

describe("package-lock.json — regression and boundary tests", () => {
  it("lockfile has more than 10 resolved packages (not a stub)", () => {
    const count = Object.keys(lockfile?.packages ?? {}).length;
    assert.ok(
      count > 10,
      `Lockfile must have more than 10 package entries, got ${count}`
    );
  });

  it("lockfileVersion is not 1 or 2 (must be the modern v3 format)", () => {
    assert.notEqual(lockfile?.lockfileVersion, 1);
    assert.notEqual(lockfile?.lockfileVersion, 2);
  });

  it("no production dependency uses a version range with ^ prefix", () => {
    const root = getRootPackage();
    const deps = root?.dependencies ?? {};
    for (const [name, version] of Object.entries(deps)) {
      assert.ok(
        !String(version).startsWith("^"),
        `Production dependency '${name}' must not use ^ range prefix (got '${version}')`
      );
    }
  });

  it("no production dependency uses a version range with ~ prefix", () => {
    const root = getRootPackage();
    const deps = root?.dependencies ?? {};
    for (const [name, version] of Object.entries(deps)) {
      assert.ok(
        !String(version).startsWith("~"),
        `Production dependency '${name}' must not use ~ range prefix (got '${version}')`
      );
    }
  });

  it("no dev dependency uses a version range with ^ prefix", () => {
    const root = getRootPackage();
    const deps = root?.devDependencies ?? {};
    for (const [name, version] of Object.entries(deps)) {
      assert.ok(
        !String(version).startsWith("^"),
        `Dev dependency '${name}' must not use ^ range prefix (got '${version}')`
      );
    }
  });

  it("node_modules/express entry declares MIT license", () => {
    const entry = lockfile?.packages?.["node_modules/express"];
    assert.equal(entry?.license, "MIT");
  });

  it("node_modules/helmet entry declares MIT license", () => {
    const entry = lockfile?.packages?.["node_modules/helmet"];
    assert.equal(entry?.license, "MIT");
  });

  it("all resolved npm package URLs point to the official registry (registry.npmjs.org)", () => {
    const packages = lockfile?.packages ?? {};
    let checkedCount = 0;
    for (const [, entry] of Object.entries(packages)) {
      if (typeof entry?.resolved === "string") {
        assert.ok(
          entry.resolved.includes("registry.npmjs.org"),
          `Resolved URL must point to registry.npmjs.org: ${entry.resolved}`
        );
        checkedCount++;
      }
    }
    assert.ok(checkedCount > 0, "Must have at least one resolved URL to check");
  });
});
