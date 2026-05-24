import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const ranges = {
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {})
};

const bad = Object.entries(ranges).filter(([, version]) => {
  return typeof version !== "string" || /^[~^*><=]|latest|next|workspace:|file:|link:/i.test(version);
});

if (bad.length > 0) {
  console.error("Dependencies must be exact pinned versions:");
  for (const [name, version] of bad) {
    console.error(`- ${name}: ${version}`);
  }
  process.exit(1);
}

if (!fs.existsSync("package-lock.json")) {
  console.error("package-lock.json is required for deterministic CI.");
  console.error("Run: npm install --package-lock-only --ignore-scripts");
  process.exit(1);
}

console.log("Dependency versions are exact pinned and package-lock.json exists.");
