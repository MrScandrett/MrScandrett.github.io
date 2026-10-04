import { access, mkdir, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "starter-packs");
const downloadsRoot = path.join(repoRoot, "downloads");
// WHAT: Each source folder in starter-packs/ and the ZIP it becomes.
// WHY `zip`: a few packs keep older download names so existing links keep working.
const packs = [
  { dir: "browser-game-builder" },
  { dir: "pygame-arcade" },
  { dir: "creative-coding-demoscene" },
  { dir: "godot-adventure" },
  { dir: "web-foundations" },
  { dir: "web-portfolio" },
  { dir: "web-business" },
  { dir: "web-store" },
  { dir: "web-wiki" },
  { dir: "web-creation-hub" },
  { dir: "webxr-gallery" },
  { dir: "my-project", zip: "project-starter-pack.zip" },
  { dir: "kaplay-platformer", zip: "kaplay-starter-pack.zip" },
  { dir: "phaser-platformer", zip: "phaser-starter-pack.zip" },
  { dir: "pixel-courier" },
  { dir: "arduino-starter-sketches", zip: "arduino-starter-sketches.zip" }
];
const requiredTutorialFiles = ["README-FIRST.md", "challenges.md", "troubleshooting.md", "credits.txt"];

await mkdir(downloadsRoot, { recursive: true });

for (const { dir: pack, zip } of packs) {
  const packRoot = path.join(sourceRoot, pack);
  for (const requiredFile of requiredTutorialFiles) {
    await access(path.join(packRoot, requiredFile));
  }

  const output = path.join(downloadsRoot, zip ?? `${pack}-starter-pack.zip`);
  await rm(output, { force: true });
  const result = spawnSync("zip", ["-r", "-q", output, pack, "-x", "*/.godot/*", "*/__pycache__/*", "*/.DS_Store"], {
    cwd: sourceRoot,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`Could not build ${pack}: ${result.stderr || "zip command failed"}`);
  }

  const topLevel = await readdir(packRoot);
  console.log(`Built downloads/${path.basename(output)} from ${topLevel.length} top-level entries.`);
}
