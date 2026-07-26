#!/usr/bin/env node
/*
 * Regenerates the checked-in showcase cards for Pivot projects in
 * assets/thumbs/showcase/, drawing a real frame from each animation.
 *
 * Those files are *source* overrides pinned by data/manifest-overrides.json, so
 * the normal build never touches them — run this after adding or replacing a
 * .piv whose showcase card is pinned that way:
 *
 *   node scripts/gen-pivot-thumbs.mjs
 *
 * Pivot uploads with no pinned override don't need this; build-showcase.js
 * already generates their card from the animation.
 */

import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const pivEngine = require("../lib/piv-engine.js");
const { buildPivotFrameThumbSvg } = require("../lib/piv-thumb.js");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STUDENT_PROJECTS_DIR = path.join(ROOT, "student-projects");
const THUMBS_DIR = path.join(ROOT, "assets", "thumbs", "showcase");
const OVERRIDES_PATH = path.join(ROOT, "data", "manifest-overrides.json");

function findPivFiles(dir, found = []) {
  for (const entry of fssync.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findPivFiles(full, found);
    else if (path.extname(entry.name).toLowerCase() === ".piv") found.push(full);
  }
  return found;
}

const overrides = JSON.parse(await fs.readFile(OVERRIDES_PATH, "utf8"));

// slug -> the .piv it was built from, matched through the pinned thumbnail path.
const wanted = new Map();
for (const [slug, meta] of Object.entries(overrides)) {
  const thumb = meta && meta.thumbnail;
  if (typeof thumb === "string" && thumb.includes("/thumbs/showcase/")) {
    wanted.set(slug, path.join(ROOT, thumb.replace(/^\.\//, "")));
  }
}

const normalize = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
let written = 0;

for (const pivPath of findPivFiles(STUDENT_PROJECTS_DIR)) {
  const student = normalize(path.basename(path.dirname(pivPath)));
  const file = normalize(path.basename(pivPath, ".piv"));

  const slug = [...wanted.keys()].find((candidate) => {
    const n = normalize(candidate);
    return n === student + file || n.includes(file) || (student.length > 2 && n.includes(student));
  });
  if (!slug) continue;

  let doc;
  try {
    doc = pivEngine.parsePiv(new Uint8Array(zlib.inflateSync(fssync.readFileSync(pivPath))));
  } catch (error) {
    console.warn(`skip ${slug}: ${error.message}`);
    continue;
  }

  const meta = overrides[slug] || {};
  const svg = buildPivotFrameThumbSvg({
    title: meta.name || slug,
    student: meta.student || "Student",
    doc,
  });
  const outPath = wanted.get(slug);
  await fs.mkdir(THUMBS_DIR, { recursive: true });
  await fs.writeFile(outPath, svg, "utf8");
  written++;
  console.log(
    `wrote ${path.relative(ROOT, outPath)} (frame ${pivEngine.bestThumbnailFrame(doc) + 1}/${doc.frames.length})`
  );
  wanted.delete(slug);
}

console.log(`${written} Pivot showcase thumbnail(s) regenerated.`);
