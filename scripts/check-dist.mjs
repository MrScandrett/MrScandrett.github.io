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
  "OSeditor.html", "assets/js/OSeditor-app.js", "assets/css/OSeditor.css", "data/app-sources.json",
];
const MAX_BYTES = 340 * 1024 * 1024;
// A single oversized thumbnail (a full-resolution photo dropped in instead of
// a resized one) can silently eat most of the MAX_BYTES margin on its own —
// see vla-telescope.jpg, once 9.1 MiB. Cap individual thumbnails well above
// the largest legitimate one on record (~1.1 MiB) so a regression fails loud.
const THUMBS_DIR = path.join(ROOT, "assets", "thumbs");
const MAX_THUMB_BYTES = 2 * 1024 * 1024;

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

async function oversizedThumbnails() {
  const oversized = [];
  let entries;
  try {
    entries = await readdir(THUMBS_DIR, { withFileTypes: true });
  } catch {
    return oversized;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(THUMBS_DIR, entry.name);
    const { size } = await stat(filePath);
    if (size > MAX_THUMB_BYTES) oversized.push({ name: entry.name, size });
  }
  return oversized;
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
const oversizedThumbs = await oversizedThumbnails();

if (missing.length || leaked.length || bytes > MAX_BYTES || oversizedThumbs.length) {
  if (missing.length) console.error(`Missing required public files: ${missing.join(", ")}`);
  if (leaked.length) console.error(`Private build/source paths leaked into dist: ${leaked.join(", ")}`);
  if (bytes > MAX_BYTES) console.error(`dist is ${sizeMiB.toFixed(1)} MiB; budget is ${MAX_BYTES / 1024 / 1024} MiB.`);
  for (const { name, size } of oversizedThumbs) {
    console.error(`assets/thumbs/${name} is ${(size / 1024 / 1024).toFixed(1)} MiB; per-thumbnail budget is ${MAX_THUMB_BYTES / 1024 / 1024} MiB. Resize/convert before committing.`);
  }
  process.exitCode = 1;
} else {
  console.log(`dist boundary passed: ${sizeMiB.toFixed(1)} MiB, ${REQUIRED.length} required files present, no private source paths, no oversized thumbnails.`);
}
