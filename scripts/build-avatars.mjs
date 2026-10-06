// Build the My Stuff profile pictures from data/avatars.json.
//
// Each avatar is a lesson image the site already uses (and credits). This crops it to a
// square around its "focus" point and writes a small 192px WebP to assets/images/avatars/,
// so the picker loads ~50 tiny files instead of the full lesson images.
//
//   npm run build:avatars            rebuild every thumbnail
//   npm run check:avatars            validate the manifest and thumbnails, write nothing
//
// The check also confirms each avatar's source image is really used by the lesson it
// names (in the lesson's HTML or a local script that lesson loads), so a credit can't
// quietly drift away from where the image actually came from.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(root, "data/avatars.json");
const OUT_DIR = path.join(root, "assets/images/avatars");
const SIZE = 192;
const checkOnly = process.argv.includes("--check");

const exists = (p) => fs.access(p).then(() => true, () => false);

async function lessonUses(lessonPath, src) {
  const base = path.basename(src);
  const html = await fs.readFile(path.join(root, lessonPath), "utf8");
  if (html.includes(base)) return true;
  // Images that a lesson's own script inserts (e.g. allsky.js) count too.
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    if (/^(https?:)?\/\//.test(m[1])) continue;
    const file = path.resolve(path.dirname(path.join(root, lessonPath)), m[1].split("?")[0]);
    if (!file.startsWith(root) || !(await exists(file))) continue;
    if ((await fs.readFile(file, "utf8")).includes(base)) return true;
  }
  return false;
}

const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
const groups = new Set(manifest.groups.map((g) => g.id));
const problems = [];
const seen = new Set();

for (const a of manifest.avatars) {
  const where = `avatar "${a.id}"`;
  if (!/^[a-z0-9-]+$/.test(a.id || "")) problems.push(`${where}: id must be lowercase kebab-case`);
  if (seen.has(a.id)) problems.push(`${where}: duplicate id`);
  seen.add(a.id);
  for (const key of ["label", "group", "src", "lesson", "credit", "license"]) {
    if (!a[key]) problems.push(`${where}: missing ${key}`);
  }
  if (!groups.has(a.group)) problems.push(`${where}: unknown group "${a.group}"`);
  if (a.source && !/^https:\/\//.test(a.source)) problems.push(`${where}: source must be an https URL`);
  if (!(await exists(path.join(root, a.src)))) { problems.push(`${where}: missing source image ${a.src}`); continue; }
  if (!(await exists(path.join(root, a.lesson)))) { problems.push(`${where}: missing lesson ${a.lesson}`); continue; }
  if (!(await lessonUses(a.lesson, a.src))) problems.push(`${where}: ${a.lesson} does not use ${a.src}`);
  if (checkOnly && !(await exists(path.join(OUT_DIR, `${a.id}.webp`)))) {
    problems.push(`${where}: thumbnail missing, run npm run build:avatars`);
  }
}

if (checkOnly) {
  const files = (await exists(OUT_DIR)) ? await fs.readdir(OUT_DIR) : [];
  for (const f of files) {
    if (f.endsWith(".webp") && !seen.has(f.slice(0, -5))) problems.push(`stray thumbnail ${f} has no manifest entry`);
  }
}

if (problems.length) {
  console.error(`[avatars] ${problems.length} problem(s):\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}

if (checkOnly) {
  console.log(`[avatars] ${manifest.avatars.length} avatars verified.`);
  process.exit(0);
}

const { default: sharp } = await import("sharp");
await fs.mkdir(OUT_DIR, { recursive: true });
let bytes = 0;
for (const a of manifest.avatars) {
  const img = sharp(path.join(root, a.src));
  const { width, height } = await img.metadata();
  const side = Math.round(Math.min(width, height) * Math.min(1, Math.max(0.2, a.zoom ?? 1)));
  const [fx, fy] = a.focus || [0.5, 0.5];
  const left = Math.round(Math.min(width - side, Math.max(0, fx * width - side / 2)));
  const top = Math.round(Math.min(height - side, Math.max(0, fy * height - side / 2)));
  const out = path.join(OUT_DIR, `${a.id}.webp`);
  await img
    .extract({ left, top, width: side, height: side })
    .resize(SIZE, SIZE, { kernel: "lanczos3" })
    .webp({ quality: 78, effort: 6 })
    .withMetadata({}) // strips EXIF/GPS by default; keeps nothing identifying
    .toFile(out);
  bytes += (await fs.stat(out)).size;
}
console.log(`[avatars] Wrote ${manifest.avatars.length} thumbnails (${Math.round(bytes / 1024)} KB total) to ${path.relative(root, OUT_DIR)}/`);
