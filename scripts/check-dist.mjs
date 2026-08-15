import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, "dist");
const REQUIRED = ["index.html", "404.html", "apps/manifest.json", "robots.txt", "sitemap.xml"];
const FORBIDDEN = [
  "node_modules", "portal", "scripts", "student-projects", "student-projects-review",
  "package.json", "package-lock.json", "build-showcase.js", "publish_to_pages.js",
  "serve-local.js", ".pa11yci.json", "AGENTS.md", "CLAUDE.md", "README.md",
];
const MAX_BYTES = 340 * 1024 * 1024;

async function exists(relativePath) {
  try {
    await access(path.join(DIST, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function directorySize(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    total += entry.isDirectory() ? await directorySize(entryPath) : (await stat(entryPath)).size;
  }
  return total;
}

const missing = [];
for (const relativePath of REQUIRED) {
  if (!(await exists(relativePath))) missing.push(relativePath);
}
const leaked = [];
for (const relativePath of FORBIDDEN) {
  if (await exists(relativePath)) leaked.push(relativePath);
}
const bytes = await directorySize(DIST);
const sizeMiB = bytes / 1024 / 1024;

if (missing.length || leaked.length || bytes > MAX_BYTES) {
  if (missing.length) console.error(`Missing required public files: ${missing.join(", ")}`);
  if (leaked.length) console.error(`Private build/source paths leaked into dist: ${leaked.join(", ")}`);
  if (bytes > MAX_BYTES) console.error(`dist is ${sizeMiB.toFixed(1)} MiB; budget is ${MAX_BYTES / 1024 / 1024} MiB.`);
  process.exitCode = 1;
} else {
  console.log(`dist boundary passed: ${sizeMiB.toFixed(1)} MiB, ${REQUIRED.length} required files present, no private source paths.`);
}
