#!/usr/bin/env node
// Ratchet on inline <script> size in lessons.
//
// A lesson's code belongs in assets/js/lessons/<lesson>.js: the browser caches it, every page
// can share it, and its maths can be tested (graphing-calculator.js + graph-expr.js, and
// fourier-series.js + fourier-kit.js, are worked examples). Inline blocks over LIMIT lines are
// recorded in docs/inline-script-baseline.json at their current size. They may shrink, never
// grow, and new ones fail.
//
//   node scripts/check-inline-scripts.mjs                  check (npm run check:inline-scripts)
//   node scripts/check-inline-scripts.mjs --save-baseline  after moving a lesson's script out
//
// Tests: tests/inline-scripts.test.mjs runs the same check.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LIMIT = 300;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BASELINE = path.join(ROOT, "docs/inline-script-baseline.json");

// Inline = no src, and code rather than data (JSON, import maps and templates are not code).
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const NOT_CODE = /\bsrc\s*=|\btype\s*=\s*["']?(?:application\/(?:ld\+)?json|importmap|text\/(?:template|x-template|plain))/i;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

// { "lessons/x.html": largest inline code block in lines } for every lesson over LIMIT.
export function measure(root = ROOT) {
  const result = {};
  for (const file of walk(path.join(root, "lessons")).sort()) {
    const html = fs.readFileSync(file, "utf8");
    let largest = 0;
    for (const m of html.matchAll(SCRIPT)) {
      if (NOT_CODE.test(m[1])) continue;
      largest = Math.max(largest, m[2].split("\n").length - 2);
    }
    if (largest > LIMIT) result[path.relative(root, file).split(path.sep).join("/")] = largest;
  }
  return result;
}

export function check(current = measure(), baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8")).lessons) {
  const problems = [];
  for (const [file, lines] of Object.entries(current)) {
    if (!(file in baseline)) {
      problems.push(`${file}: new inline <script> of ${lines} lines (limit ${LIMIT}). Move it to assets/js/lessons/.`);
    } else if (lines > baseline[file]) {
      problems.push(`${file}: inline <script> grew from ${baseline[file]} to ${lines} lines. Move code out instead of adding to it.`);
    }
  }
  const stale = Object.keys(baseline).filter((file) => !(file in current) || current[file] < baseline[file]);
  return { problems, stale };
}

function save(current) {
  const body = {
    about: `Largest inline <script> (lines) in each lesson over ${LIMIT} lines. May shrink, never grow. ` +
      "Regenerate with: node scripts/check-inline-scripts.mjs --save-baseline",
    limit: LIMIT,
    lessons: current,
  };
  fs.writeFileSync(BASELINE, JSON.stringify(body, null, 2) + "\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const current = measure();
  if (process.argv.includes("--save-baseline")) {
    save(current);
    console.log(`Saved ${Object.keys(current).length} lessons over ${LIMIT} lines to ${path.relative(ROOT, BASELINE)}`);
  } else {
    const { problems, stale } = check(current);
    for (const p of problems) console.error("✗ " + p);
    if (stale.length) console.log(`↓ ${stale.length} lesson(s) shrank or are fixed; run with --save-baseline to lock it in: ${stale.join(", ")}`);
    const total = Object.values(current).reduce((a, b) => a + b, 0);
    console.log(`${Object.keys(current).length} lessons still have an inline <script> over ${LIMIT} lines (${total} lines in all).`);
    process.exitCode = problems.length ? 1 : 0;
  }
}
