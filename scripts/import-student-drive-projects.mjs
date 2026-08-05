#!/usr/bin/env node

import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRIVE = path.resolve(process.env.STUDENT_DRIVE || "/media/evanscandrett/MrScandrett");
const APPLY = process.argv.includes("--apply");
const MAX_FILES = 500;
const MAX_BYTES = 20 * 1024 * 1024;
const SKIP_NAMES = new Set([
  ".agents",
  ".arcade-tool",
  ".creator-test",
  ".git",
  ".godot",
  ".preview3d-test",
  ".vscode",
  "node_modules",
  "pxt_modules",
]);

const imports = [
  { source: "Computer 1/Student Projects/eason", target: "Eason/one-more-rally" },
  { source: "Computer 1/Student Projects/JohnathanSpore", target: "Johnathan/oddkin-wild-worlds", exclude: ["start-game.ps1"] },
  { source: "Computer 1/Student Projects/lucas", target: "Lucas/math-soccer-league" },
  { source: "Computer 1/Student Projects/Lucas M", target: "Lucas M/street-cup-tactics" },
  { source: "Computer 1/Student Projects/playground 624206", target: "Anonymous Student/Physics Doodle Lab" },
  { source: "Computer 1/Student Projects/William", target: "William/retro-dungeon-quest" },
  { source: "Computer 2/aiden", target: "Aiden/simple-paint-studio" },
  { source: "Computer 2/carnival games", target: "Jack/carnival-mini-games" },
  { source: "Computer 2/eric", target: "Eric/classic-snake" },
  { source: "Computer 2/MPC Dance", target: "Anonymous Student/Pad Clash", exclude: ["package.json", "server.js"] },
  { source: "Computer 2/william f", target: "William F/street-sync-showdown" },
  { source: "Computer 3/Luke A", target: "Luke A/mechaterra", exclude: ["package.json", "scripts"] },
  {
    source: "Computer 3/Rochelle A",
    target: "Rochelle A/dream-town-life",
    include: [
      "ASSETS.md",
      "index.html",
      "assets/kenney-patterns/License.txt",
      "assets/kenney-patterns/PNG/Default/pattern_20.png",
      "assets/kenney-patterns/PNG/Default/pattern_27.png",
      "assets/kenney-patterns/PNG/Default/pattern_51.png",
    ],
  },
  { source: "Zspace1/eason", target: "Eason/interactive-virtual-fishtank" },
  { source: "Zspace1/sharks n minnows", target: "Ivan/Red Shark Escape" },
  { source: "Zspace2/ivan", target: "Ivan/farmland-fury" },
  { source: "Zspace2/moriah", target: "Moriah/3d-speedway" },
  { source: "Zspace3/gio", target: "Gio/dino-jump", exclude: ["index copy.html"] },
  { source: "Zspace3/selena", target: "Selena/my-virtual-pet" },
];

function isExcluded(relativePath, excluded = []) {
  const parts = relativePath.split(path.sep);
  return parts.some((part) => SKIP_NAMES.has(part))
    || excluded.some((item) => relativePath === item || relativePath.startsWith(`${item}${path.sep}`));
}

async function collectAllFiles(root, excluded, current = "", output = []) {
  const dir = path.join(root, current);
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const relativePath = path.join(current, entry.name);
    if (isExcluded(relativePath, excluded)) continue;
    if (entry.isDirectory()) await collectAllFiles(root, excluded, relativePath, output);
    else if (entry.isFile()) output.push(relativePath);
  }
  return output;
}

async function collectFiles(item, sourceDir) {
  if (item.include) return item.include.map((file) => path.normalize(file));
  return collectAllFiles(sourceDir, item.exclude || []);
}

if (!fssync.existsSync(DRIVE)) {
  console.error(`Student drive not found: ${DRIVE}`);
  process.exit(1);
}

const operations = [];
const pendingImports = [];
let totalBytes = 0;
for (const item of imports) {
  const sourceDir = path.join(DRIVE, item.source);
  const targetDir = path.join(ROOT, "student-projects", item.target);
  if (!fssync.existsSync(sourceDir)) throw new Error(`Missing source: ${sourceDir}`);
  if (fssync.existsSync(targetDir)) {
    console.log(`[student-import] Already present; leaving unchanged: student-projects/${item.target}`);
    continue;
  }

  const files = await collectFiles(item, sourceDir);
  if (files.length === 0) throw new Error(`No importable files found in ${item.source}`);
  pendingImports.push(item);
  for (const relativePath of files) {
    const sourceFile = path.join(sourceDir, relativePath);
    const stat = await fs.stat(sourceFile);
    if (!stat.isFile()) throw new Error(`Include is not a file: ${sourceFile}`);
    totalBytes += stat.size;
    operations.push({ sourceFile, targetFile: path.join(targetDir, relativePath), bytes: stat.size });
  }
}

if (operations.length > MAX_FILES) throw new Error(`Import has ${operations.length} files; cap is ${MAX_FILES}.`);
if (totalBytes > MAX_BYTES) throw new Error(`Import has ${totalBytes} bytes; cap is ${MAX_BYTES}.`);

console.log(`[student-import] ${APPLY ? "Applying" : "Dry run:"} ${pendingImports.length} projects, ${operations.length} files, ${totalBytes} bytes.`);
for (const item of pendingImports) console.log(`[student-import] ${item.source} -> student-projects/${item.target}`);

if (!APPLY) {
  console.log("[student-import] No files copied. Re-run with --apply after reviewing this list.");
  process.exit(0);
}

for (const operation of operations) {
  await fs.mkdir(path.dirname(operation.targetFile), { recursive: true });
  await fs.copyFile(operation.sourceFile, operation.targetFile, fssync.constants.COPYFILE_EXCL);
}
console.log("[student-import] Import complete. The USB drive was not modified.");
