#!/usr/bin/env node

// Flags stale entries in data/manifest-overrides.json: keys that no longer match
// any slug in apps/manifest.json. This happens when a project is renamed,
// reattributed to a different student, or removed from the showcase — the
// override entry silently stops applying instead of erroring, so it drifts
// out of sync until someone notices the wrong title/tags on the live site.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf8"));
}

const manifest = readJson("apps/manifest.json");
const overrides = readJson("data/manifest-overrides.json");

const manifestSlugs = new Set(manifest.map((entry) => entry.slug));
const staleKeys = Object.keys(overrides).filter((slug) => !manifestSlugs.has(slug));

if (staleKeys.length > 0) {
  console.error("Stale entries in data/manifest-overrides.json (no matching slug in apps/manifest.json):");
  for (const key of staleKeys) {
    console.error(`  - ${key}`);
  }
  console.error("\nRun `npm run build` after renaming/removing a project, or update the override key to match.");
  process.exit(1);
}

console.log(`data/manifest-overrides.json: all ${Object.keys(overrides).length} entries match a live slug.`);
