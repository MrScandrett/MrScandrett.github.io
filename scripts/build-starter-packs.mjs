import { access, mkdir, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "starter-packs");
const downloadsRoot = path.join(repoRoot, "downloads");
const packs = [
  "browser-game-builder",
  "pygame-arcade",
  "creative-coding-demoscene",
  "godot-adventure"
];
const requiredTutorialFiles = ["README-FIRST.md", "challenges.md", "troubleshooting.md", "credits.txt"];

await mkdir(downloadsRoot, { recursive: true });

for (const pack of packs) {
  const packRoot = path.join(sourceRoot, pack);
  for (const requiredFile of requiredTutorialFiles) {
    await access(path.join(packRoot, requiredFile));
  }

  const output = path.join(downloadsRoot, `${pack}-starter-pack.zip`);
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
