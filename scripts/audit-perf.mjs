#!/usr/bin/env node
// Performance audit: loads sample pages the way a student's Chromebook would (4x CPU throttle)
// and measures what it costs to open them and to leave them sitting in a tab.
//
//   load     LCP, total blocking time (sum of long-task time over 50 ms), requests and bytes by type
//   running  main-thread busy ms per second and requestAnimationFrame callbacks per second,
//            first at the top of the page, then after scrolling every sim off-screen ("offscreen").
//            A sim that keeps drawing when nobody can see it shows up as offscreen rAF/s > 0.
//
// Serves the folder itself (default dist/, what GitHub Pages deploys; run `npm run build:dist` first).
//
//   node scripts/audit-perf.mjs                     the sample pages below
//   node scripts/audit-perf.mjs --all               every lesson (ranks the sims worth fixing first)
//   node scripts/audit-perf.mjs --match=cymatics    only pages whose path contains the text
//   node scripts/audit-perf.mjs --list=pages.txt    only the pages listed (one path per line)
//   node scripts/audit-perf.mjs --save-baseline     write docs/perf-baseline.json
//   node scripts/audit-perf.mjs --check             fail if a page's JS or requests grew past the baseline
//   --dir=DIR (default dist, or . when dist/ is missing)  --cpu=N (throttle, default 4)
//   --window=MS (sampling window, default 3000)  --concurrency=N  --out=report.json
//   --with-bg   keep the animated site background on (off by default so each page's
//               numbers are its own code; the background is the same on every page)
//
// --check fails on JS or request growth, which is the same on every machine. Sims still animating
// off-screen are reported as warnings: how many frames an ungated loop gets depends on how busy the
// machine is, so a baseline from one machine can't gate another. --strict-frames makes them fail
// too (use it locally, on the machine that saved the baseline). Timings are informational only.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { findChromium } from "../lib/find-chromium.mjs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require("playwright-core"); }

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);

const repo = process.cwd();
const dir = path.resolve(arg("dir", fs.existsSync(path.join(repo, "dist", "index.html")) ? "dist" : "."));
const match = arg("match", "");
const cpu = Number(arg("cpu", 4));
const windowMs = Number(arg("window", 3000));
const concurrency = Number(arg("concurrency", flag("all") ? 4 : 2));
const baselinePath = path.join(repo, "docs", "perf-baseline.json");

export const SAMPLE_PAGES = [
  "index.html",
  "watch.html",
  "workbench.html",
  "forge.html",
  "lessons/music/pioneers/mozart.html",
  "lessons/humanities/the-ages.html",
  "lessons/chemistry/periodic-table.html",
  "lessons/computer-science/graphics-and-games/cgi-water.html",
  "lessons/computer-science/graphics-and-games/liquid-engine-showcase.html",
  "lessons/technical-elements/audio-engineering/cymatics.html",
  "lessons/earth-science/volcano-simulator.html",
  "lessons/mathematics/advanced-and-calculus/graphing-calculator.html",
  "lessons/engineering/mechanical-and-civil-design/bridge-over-troubled-water.html",
  "lessons/engineering/arduino-and-electronics/breadboard-basics.html",
  "lessons/physics/modern-and-thermal/speed-of-light.html",
  "lessons/physics/electricity-and-magnetism/what-is-electricity.html",
  "lessons/cosmology/pale-blue-dot.html",
  "lessons/cosmology/constellations.html",
];

function listLessons(d) {
  const out = [];
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) out.push(...listLessons(full));
    else if (entry.name.endsWith(".html")) out.push(path.relative(dir, full).split(path.sep).join("/"));
  }
  return out;
}

const listFile = arg("list", "");
const pages = (listFile ? fs.readFileSync(listFile, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  : flag("all") ? listLessons(path.join(dir, "lessons")) : SAMPLE_PAGES)
  .filter((p) => p.includes(match) && fs.existsSync(path.join(dir, p)))
  .sort();

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".gif": "image/gif", ".woff2": "font/woff2", ".woff": "font/woff", ".glb": "model/gltf-binary",
  ".wasm": "application/wasm", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".vtt": "text/vtt",
  ".webmanifest": "application/manifest+json",
};

function serve() {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(dir, rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Runs in the page before any of its scripts: counts rAF callbacks and long tasks, records LCP.
function instrument() {
  // The site background (canvas-bg.js) is counted apart from lesson loops.
  const stats = { raf: 0, bgRaf: 0, longTaskMs: 0, lcp: 0 };
  window.__perf = stats;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    const bg = /canvas-bg[^/]*\.js/.test(new Error().stack || "");
    return raf((t) => { if (bg) stats.bgRaf++; else stats.raf++; cb(t); });
  };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) stats.longTaskMs += Math.max(0, e.duration - 50);
    }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) stats.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
}

async function busyMs(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return (metrics.find((m) => m.name === "TaskDuration")?.value || 0) * 1000;
}

async function sample(page, cdp) {
  const read = () => page.evaluate(() => [window.__perf.raf, window.__perf.bgRaf]);
  const [raf0, bg0] = await read();
  const busy0 = await busyMs(cdp);
  await page.waitForTimeout(windowMs);
  const [raf1, bg1] = await read();
  const busy1 = await busyMs(cdp);
  const s = windowMs / 1000;
  return { rafPerSec: Math.round((raf1 - raf0) / s), bgRafPerSec: Math.round((bg1 - bg0) / s), busyMsPerSec: Math.round((busy1 - busy0) / s) };
}

async function audit(browser, base, rel) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await page.addInitScript(instrument);
  if (!flag("with-bg")) {
    await page.addInitScript(() => {
      try { localStorage.setItem("classroomos-canvas-bg", JSON.stringify({ day: "none", night: "none" })); } catch {}
    });
  }
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e).slice(0, 200)));
  try {
    await page.goto(`${base}/${rel}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(1500);
    const load = await page.evaluate(() => {
      const bytes = {};
      let requests = 0;
      for (const r of performance.getEntriesByType("resource")) {
        requests++;
        const ext = (new URL(r.name).pathname.match(/\.([a-z0-9]+)$/i) || [, "other"])[1].toLowerCase();
        const kind = { js: "js", mjs: "js", css: "css", json: "data", png: "img", jpg: "img", jpeg: "img",
          webp: "img", avif: "img", gif: "img", svg: "img", woff2: "font", woff: "font", glb: "model" }[ext] || "other";
        bytes[kind] = (bytes[kind] || 0) + (r.decodedBodySize || r.transferSize || 0);
      }
      const nav = performance.getEntriesByType("navigation")[0];
      bytes.html = nav ? nav.decodedBodySize : 0;
      return { lcpMs: Math.round(window.__perf.lcp), tbtMs: Math.round(window.__perf.longTaskMs), requests, bytes };
    });
    const top = await sample(page, cdp);
    // Find a scroll position with no canvas within 250 px of the screen (SimKit's gate margin is
    // 200 px). App-shell pages scroll an inner panel instead, so if the document has no such
    // spot, scroll every panel to its end and count the canvases still showing.
    const stillVisible = await page.evaluate(() => {
      const canvases = [...document.querySelectorAll("canvas:not(#site-canvas-bg):not(#hero-canvas)")];
      const near = (margin) => canvases.filter((c) => {
        const r = c.getBoundingClientRect();
        return r.width > 40 && r.height > 40 && r.bottom > -margin && r.top < innerHeight + margin && getComputedStyle(c).visibility !== "hidden";
      }).length;
      const max = document.documentElement.scrollHeight - innerHeight;
      for (let y = 0; y <= max; y += 200) {
        scrollTo(0, y);
        if (!near(250)) return 0;
      }
      for (const el of [document.scrollingElement, ...document.querySelectorAll("*")]) {
        if (el && el.scrollHeight > el.clientHeight + 40 && (el === document.scrollingElement || /auto|scroll/.test(getComputedStyle(el).overflowY || ""))) el.scrollTop = el.scrollHeight;
      }
      return near(0);
    });
    // Scrolling sets off reveal animations, lazy images and fade-ins; let those finish first.
    await page.waitForTimeout(2500);
    const offscreen = await sample(page, cdp);
    return { page: rel, ...load, top, offscreen, canvasesStillVisible: stillVisible, errors: errors.slice(0, 3) };
  } catch (e) {
    return { page: rel, failed: String(e.message || e).slice(0, 200) };
  } finally {
    await context.close();
  }
}

const kb = (n) => Math.round((n || 0) / 1024);

function compare(baseline, results) {
  const problems = [];
  const warnings = [];
  for (const r of results) {
    const b = baseline.pages[r.page];
    if (!b || r.failed) continue;
    const js = r.bytes.js || 0, bjs = b.bytes.js || 0;
    if (js > bjs * 1.1 + 20 * 1024) problems.push(`${r.page}: JS ${kb(bjs)} KB -> ${kb(js)} KB`);
    if (r.requests > b.requests * 1.2 + 5) problems.push(`${r.page}: requests ${b.requests} -> ${r.requests}`);
    // Pages that keep a canvas in view (app shells) are allowed to keep drawing. A sim that lost its
    // pause runs at 15-60 frames a second; a few stray frames (model-viewer, contrast catch-up) are noise.
    if (!r.canvasesStillVisible && r.offscreen.rafPerSec > b.offscreen.rafPerSec + 10) {
      (flag("strict-frames") ? problems : warnings).push(`${r.page}: offscreen rAF/s ${b.offscreen.rafPerSec} -> ${r.offscreen.rafPerSec}`);
    }
  }
  return { problems, warnings };
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({ executablePath: findChromium(), args: ["--autoplay-policy=no-user-gesture-required"] });
console.log(`Serving ${path.relative(repo, dir) || "."} at ${base}; ${pages.length} page(s), CPU x${cpu}, ${windowMs} ms windows`);

const results = [];
let next = 0;
await Promise.all(Array.from({ length: Math.min(concurrency, pages.length) }, async () => {
  while (next < pages.length) {
    const rel = pages[next++];
    const r = await audit(browser, base, rel);
    results.push(r);
    if (r.failed) console.log(`  FAIL ${rel}: ${r.failed}`);
    else console.log(`  ${rel}  LCP ${r.lcpMs}ms  TBT ${r.tbtMs}ms  JS ${kb(r.bytes.js)}KB  img ${kb(r.bytes.img)}KB  data ${kb(r.bytes.data)}KB  req ${r.requests}  busy ${r.top.busyMsPerSec}->${r.offscreen.busyMsPerSec}ms/s  rAF ${r.top.rafPerSec}->${r.offscreen.rafPerSec}/s${r.canvasesStillVisible ? " (canvas in view)" : ""}`);
  }
}));
await browser.close();
server.close();
results.sort((a, b) => a.page.localeCompare(b.page));

const ranked = results.filter((r) => !r.failed && !r.canvasesStillVisible && r.offscreen.rafPerSec > 5)
  .sort((a, b) => b.offscreen.busyMsPerSec - a.offscreen.busyMsPerSec);
if (ranked.length) {
  console.log(`\nStill animating after scrolling away (${ranked.length}), busiest first:`);
  for (const r of ranked.slice(0, 25)) console.log(`  ${r.offscreen.busyMsPerSec} ms/s  ${r.offscreen.rafPerSec} rAF/s  ${r.page}`);
}

const out = arg("out", "");
if (out) fs.writeFileSync(out, JSON.stringify(results, null, 2) + "\n");

if (flag("save-baseline")) {
  const prev = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, "utf8")) : { pages: {} };
  for (const r of results) if (!r.failed) prev.pages[r.page] = r;
  prev.note = "Written by `npm run audit:perf -- --save-baseline`. Timings are informational; --check gates bytes, requests and offscreen rAF/s.";
  prev.cpuThrottle = cpu;
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, JSON.stringify(prev, null, 2) + "\n");
  console.log(`\nSaved ${results.filter((r) => !r.failed).length} page(s) to ${path.relative(repo, baselinePath)}`);
}

if (flag("check")) {
  if (!fs.existsSync(baselinePath)) { console.error("No baseline; run with --save-baseline first."); process.exit(1); }
  const { problems, warnings } = compare(JSON.parse(fs.readFileSync(baselinePath, "utf8")), results);
  if (warnings.length) console.warn(`\n${warnings.length} sim(s) animating off-screen more than the baseline (warning; --strict-frames to fail):\n  ${warnings.join("\n  ")}`);
  if (problems.length) { console.error(`\n${problems.length} regression(s):\n  ${problems.join("\n  ")}`); process.exit(1); }
  console.log("\nNo regressions against the baseline.");
}
