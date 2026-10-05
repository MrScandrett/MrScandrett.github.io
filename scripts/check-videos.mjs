#!/usr/bin/env node
// Video check-up for the ClassroomOS player.
//
// Offline (default, runs in `npm run quality`):
//   * every data/video-library.json entry has an allowed src, valid times,
//     marks inside its clip, a known group, and local captions/posters that exist
//   * every <figure data-video> on the site resolves (catalog slug or allowed
//     link), has parseable data-start/end/pause/chapter times, and its page
//     loads assets/js/video-embed.js
//   * raw YouTube/Vimeo iframes are reported as warnings: they bypass the
//     player's sandbox, pinning and click-to-load (errors with --strict)
//
// Online (--online): asks YouTube/Vimeo oEmbed whether each video still exists
// and allows embedding, and probes allow-listed files.
//
//   npm run check:videos
//   npm run check:videos -- --online
//   npm run check:videos -- --strict
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseVideo, whyRefused, parseTime } from "../assets/js/video-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ONLINE = process.argv.includes("--online");
const STRICT = process.argv.includes("--strict");
const SKIP_DIRS = new Set(["node_modules", ".git", "apps", "student-projects", "student-projects-review", "dist", "reports"]);
const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
const exists = (rel) => fs.access(path.join(root, rel.replace(/^\//, ""))).then(() => true, () => false);

/* ── 1. Catalog ─────────────────────────────────────────────────── */
const catalogPath = "data/video-library.json";
const catalog = JSON.parse(await fs.readFile(path.join(root, catalogPath), "utf8"));
const groups = new Set((catalog.groups || []).map((g) => g.id));
const videos = catalog.videos || {};
const toCheckOnline = new Map(); // canonical url → { source, where }

for (const [slug, v] of Object.entries(videos)) {
  const where = `${catalogPath} → ${slug}`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) err(where, "slug must be lowercase-with-dashes");
  if (!v.title) err(where, "missing title");
  const source = parseVideo(v.src);
  if (!source) { err(where, `src refused — ${whyRefused(v.src)}`); continue; }
  toCheckOnline.set(source.url, { source, where });
  if (v.group && !groups.has(v.group)) err(where, `unknown group "${v.group}"`);
  checkTimes(where, { start: v.start, end: v.end, marks: [...(v.chapters || []), ...(v.pauses || [])].map((m) => m.at) });
  for (const [i, p] of (v.pauses || []).entries()) if (!String(p.ask || "").trim()) err(where, `pauses[${i}] has no "ask" text`);
  for (const [i, c] of (v.chapters || []).entries()) if (!String(c.label || "").trim()) err(where, `chapters[${i}] has no "label"`);
  for (const key of ["captions", "poster"]) {
    if (v[key] && !/^https?:/.test(v[key]) && !(await exists(v[key]))) err(where, `${key} file not found: ${v[key]}`);
  }
}

function checkTimes(where, { start, end, marks }) {
  const s = start == null || start === "" ? 0 : parseTime(start);
  const e = end == null || end === "" ? null : parseTime(end);
  if (s == null) err(where, `start "${start}" isn't a time`);
  if (end != null && end !== "" && e == null) err(where, `end "${end}" isn't a time`);
  if (s != null && e != null && e <= s) err(where, `end ${end} is not after start ${start ?? 0}`);
  for (const at of marks) {
    const t = parseTime(at);
    if (t == null) err(where, `mark time "${at}" isn't a time`);
    else if ((s != null && t < s) || (e != null && t > e)) err(where, `mark at ${at} is outside the clip, so it can never show`);
  }
}

/* ── 2. Pages ───────────────────────────────────────────────────── */
async function* htmlFiles(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) yield* htmlFiles(path.join(dir, entry.name));
    } else if (entry.name.endsWith(".html")) yield path.join(dir, entry.name);
  }
}

const RAW_IFRAME = /<iframe\b[^>]*\bsrc=["']https?:\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com|player\.vimeo\.com)\/[^"']*["']/gi;
const FIGURE = /<(figure|div)\b([^>]*\bdata-video=["']([^"']*)["'][^>]*)>([\s\S]*?)<\/\1>/gi;
const attr = (attrs, name) => (new RegExp(`\\b${name}=["']([^"']*)["']`).exec(attrs) || [])[1];
let pagesWithVideos = 0;
let figures = 0;

for await (const file of htmlFiles(root)) {
  const rel = path.relative(root, file);
  const html = await fs.readFile(file, "utf8");
  const line = (index) => html.slice(0, index).split("\n").length;
  for (const m of html.matchAll(RAW_IFRAME)) {
    const msg = "raw provider iframe — use <figure data-video> so it plays in the ClassroomOS player";
    (STRICT ? err : warn)(`${rel}:${line(m.index)}`, msg);
  }
  let found = 0;
  for (const m of html.matchAll(FIGURE)) {
    const [, , attrs, ref, inner] = m;
    const where = `${rel}:${line(m.index)}`;
    found++;
    if (ref.includes("${")) continue; // template in a script, filled at runtime
    if (!Object.hasOwn(videos, ref)) {
      const source = parseVideo(ref);
      if (!source) { err(where, `data-video "${ref}" is neither a catalog slug nor an allowed link — ${whyRefused(ref)}`); continue; }
      toCheckOnline.set(source.url, { source, where });
    }
    const cat = videos[ref] || {};
    const marks = [...inner.matchAll(/\bdata-(?:pause|chapter)=["']([^"']*)["']/g)].map((x) => x[1]);
    checkTimes(where, { start: attr(attrs, "data-start") ?? cat.start, end: attr(attrs, "data-end") ?? cat.end, marks });
    const captions = attr(attrs, "data-captions");
    if (captions && !(await exists(captions))) err(where, `data-captions file not found: ${captions}`);
  }
  if (found) {
    pagesWithVideos++;
    figures += found;
    const usesEngine = /assets\/js\/video-embed\.js|video-player\.mjs/.test(html);
    if (!usesEngine) err(rel, "has data-video figures but doesn't load assets/js/video-embed.js");
  }
}

/* ── 3. Online ──────────────────────────────────────────────────── */
async function probe(url, opts = {}) {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000), ...opts });
    return { status: res.status, json: res.ok && opts.method !== "HEAD" ? await res.json().catch(() => null) : null };
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

if (ONLINE) {
  for (const { source, where } of toCheckOnline.values()) {
    let r;
    if (source.kind === "youtube") {
      r = await probe(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(source.url)}`);
      if (r.status === 401 || r.status === 403) err(where, `${source.url} — owner has disabled embedding`);
      else if (r.status === 404 || r.status === 400) err(where, `${source.url} — removed or private`);
    } else if (source.kind === "vimeo") {
      r = await probe(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(source.url)}`);
      if (r.status === 403) err(where, `${source.url} — embedding not allowed on other sites`);
      else if (r.status === 404) err(where, `${source.url} — removed or private`);
    } else if (source.host !== "local") {
      r = await probe(source.url, { method: "HEAD" });
      if (r.status >= 400) err(where, `${source.url} — HTTP ${r.status}`);
    } else continue;
    if (r.status === 0) warn(where, `${source.url} — couldn't reach provider (${r.error})`);
    else if (r.json?.title) console.log(`  ok  ${source.url}  “${r.json.title}”${r.json.author_name ? ` · ${r.json.author_name}` : ""}`);
    await new Promise((res) => setTimeout(res, 300));
  }
}

/* ── Report ─────────────────────────────────────────────────────── */
console.log(`Videos: ${Object.keys(videos).length} in catalog, ${figures} embeds on ${pagesWithVideos} page(s)${ONLINE ? `, ${toCheckOnline.size} checked online` : ""}.`);
for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  FAIL  ${e}`);
if (errors.length) {
  console.log(`\n${errors.length} problem(s).`);
  process.exit(1);
}
console.log(warnings.length ? `OK with ${warnings.length} warning(s).` : "OK.");
