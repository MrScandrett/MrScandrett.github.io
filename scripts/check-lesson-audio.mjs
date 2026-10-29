#!/usr/bin/env node
// Online check for lesson audio that loads from another site (mostly Wikimedia Commons).
//
// Lessons play recordings straight from upload.wikimedia.org. If Commons renames or deletes a
// file, that player goes silent with no error on the page, so this asks each host whether every
// remote recording under lessons/ still answers: <audio src>/<source src>, the composer players'
// data-src track buttons, and <option value> track pickers. Needs the network; not part of
// `npm run quality`.
//
//   npm run check:audio
//   npm run check:audio -- --match=lessons/music
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const match = (process.argv.find((a) => a.startsWith("--match=")) || "").slice("--match=".length);
// Wikimedia asks automated clients to identify themselves; a bare fetch UA can be refused.
const UA = "ClassroomOS-lesson-audio-check/1.0 (https://github.com/MrScandrett/MrScandrett.github.io)";
// Not href: credit links to Commons file pages end in .mp3 too.
const TAG = /\b(?:src|data-src|value)=["'](https?:\/\/[^"']+)["']/gi;
const AUDIO = /\.(?:mp3|ogg|oga|opus|flac|wav|m4a)(?:$|[?#])/i;

async function* htmlFiles(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) yield* htmlFiles(path.join(dir, entry.name));
    else if (entry.name.endsWith(".html")) yield path.join(dir, entry.name);
  }
}

const uses = new Map(); // url → ["lessons/…html:line", …]
for await (const file of htmlFiles(path.join(root, "lessons"))) {
  const rel = path.relative(root, file);
  if (match && !rel.includes(match)) continue;
  const html = await fs.readFile(file, "utf8");
  for (const m of html.matchAll(TAG)) {
    const url = m[1].replace(/&amp;/g, "&");
    if (!AUDIO.test(url)) continue;
    const where = `${rel}:${html.slice(0, m.index).split("\n").length}`;
    uses.set(url, [...(uses.get(url) || []), where]);
  }
}

const failures = [];
for (const [url, where] of uses) {
  let status = 0;
  let error = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "follow", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      status = res.status;
    } catch (e) {
      error = e.message;
    }
    if (status !== 429 && status !== 0) break;
    await new Promise((res) => setTimeout(res, 5000 * (attempt + 1))); // rate-limited or unreachable: back off
  }
  if (status >= 400 || status === 0) failures.push(`${where.join(", ")}: ${url} — ${status ? `HTTP ${status}` : error}`);
  await new Promise((res) => setTimeout(res, 300));
}

console.log(`Lesson audio: ${uses.size} remote file(s) on ${new Set([...uses.values()].flat().map((w) => w.split(":")[0])).size} page(s) checked.`);
for (const f of failures) console.log(`  FAIL  ${f}`);
if (failures.length) {
  console.log(`\n${failures.length} recording(s) no longer load.`);
  process.exit(1);
}
console.log("OK.");
