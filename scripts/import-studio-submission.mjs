#!/usr/bin/env node
// Import a student's Web Studio submission into student-projects/ and (optionally) build it.
//
//   node scripts/import-studio-submission.mjs ada-robot-garden.webstudio.json
//   node scripts/import-studio-submission.mjs <file> --dry-run           show what would be written
//   node scripts/import-studio-submission.mjs <file> --replace           overwrite an earlier import
//   node scripts/import-studio-submission.mjs <file> --program=Microschool
//   node scripts/import-studio-submission.mjs <file> --build             also build apps/<slug>/
//
// OSeditor's "Import submission" button does the same thing from the browser.
// Review the imported files before committing: student JavaScript runs on the class site.

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readSubmission, planImport, writeImport } from "../lib/studio-submission.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
const program = args.find((arg) => arg.startsWith("--program="))?.slice("--program=".length);

if (!file) {
  console.error("Usage: node scripts/import-studio-submission.mjs <submission.webstudio.json> [--dry-run] [--replace] [--build] [--program=NAME]");
  process.exit(2);
}

try {
  const submission = readSubmission(await fs.readFile(file, "utf8"));
  const plan = planImport(submission, root, { program });
  console.log(`“${plan.title}” by ${plan.student}${plan.description ? ` — ${plan.description}` : ""}`);
  console.log(`→ ${plan.relDir}/  (${plan.files.map(([rel]) => rel).join(", ")})`);
  console.log(`→ data/manifest-overrides.json["${plan.slug}"]`);
  if (args.includes("--dry-run")) process.exit(0);
  const result = await writeImport(plan, root, { replace: args.includes("--replace") });
  console.log(`${result.replaced ? "Replaced" : "Imported"} ${result.files.length} files.`);
  if (args.includes("--build")) {
    const build = spawnSync(process.execPath, ["build-showcase.js", `--only=${plan.slug}`], { cwd: root, stdio: "inherit" });
    if (build.status !== 0) process.exit(build.status || 1);
    console.log(`Built apps/${plan.slug}/ — open /apps/${plan.slug}/ on the local server to check it.`);
  } else {
    console.log(`Next: review the files, then  node build-showcase.js --only=${plan.slug}`);
  }
} catch (error) {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
}
