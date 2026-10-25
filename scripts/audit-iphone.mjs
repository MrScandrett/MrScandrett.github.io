#!/usr/bin/env node
// iPhone audit: loads every lesson as an iPhone 15 held upright and sideways (Playwright's iPhone
// viewport, user agent, touch and pixel ratio; Chromium by default, --engine=webkit when the host has
// WebKit's libraries), and measures what a student would fight with on that screen.
//
//   overflow   the page scrolls sideways; names the outermost elements that stick out
//   cut off    content wider than the screen inside an overflow:hidden box (e.g. .ll-sim), so the
//              right-hand part is simply invisible
//   screens    how many screenfuls of scrolling the lesson's main scroller holds
//   chrome     share of the screen height taken by bars at the top before the student scrolls
//   sims       canvases / big SVGs / <model-viewer> / iframes that are wider than the screen, taller
//              than the visible area (landscape), or shrunk to a sliver
//   tiny text  visible text set under 11px
//   errors     uncaught page errors
//
// Needs a running dev server (`node serve-local.js`, default http://localhost:8080).
//
//   node scripts/audit-iphone.mjs                      every lesson, portrait + landscape
//   node scripts/audit-iphone.mjs --match=physics      only lessons whose path contains "physics"
//   node scripts/audit-iphone.mjs --orient=landscape   one orientation
//   --engine=chromium|webkit  --base=URL  --concurrency=N  --out=report.json  --shots=DIR (screenshot every page)

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { findChromium } from "../lib/find-chromium.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const { devices } = playwright;

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const root = process.cwd();
const base = arg("base", "http://localhost:8080").replace(/\/$/, "");
const match = arg("match", "");
const concurrency = Number(arg("concurrency", 4));
const out = arg("out", "");
const shots = arg("shots", "");
const orients = arg("orient", "portrait,landscape").split(",");
const engine = arg("engine", "chromium");
const DEVICE = { portrait: devices["iPhone 15"], landscape: devices["iPhone 15 landscape"] };

function listLessons(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listLessons(full));
    else if (entry.name.endsWith(".html")) files.push(path.relative(root, full).split(path.sep).join("/"));
  }
  return files;
}
const files = listLessons(path.join(root, "lessons")).filter((f) => f.includes(match)).sort();

// Runs in the page.
function measure() {
  const vw = innerWidth;
  const vh = innerHeight;
  const label = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) return `${s}#${el.id}`;
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return cls ? `${s}.${cls}` : s;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0;
  };
  // "scroll": inside a deliberate sideways scroller (a table wrapper, a chip row) — fine.
  // "cut": an overflow:hidden/clip box that fits the screen is hiding the rest — the student never sees it.
  const clips = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "visible") continue;
      if (p.getBoundingClientRect().right > vw + 2) return false;
      return ox === "auto" || ox === "scroll" ? (p === scroller ? false : "scroll") : "cut";
    }
    return false;
  };

  let scroller;
  // The lesson's main scroller: the document, or the lesson-layout .ll-sim / any tall inner scroller.
  const docScroll = document.scrollingElement;
  scroller = docScroll;
  if (docScroll.scrollHeight <= vh + 4) {
    let best = null;
    for (const el of document.querySelectorAll("body *")) {
      if (el.clientHeight < vh * 0.4 || el.scrollHeight <= el.clientHeight + 20) continue;
      const oy = getComputedStyle(el).overflowY;
      if (oy !== "auto" && oy !== "scroll") continue;
      if (!best || el.scrollHeight > best.scrollHeight) best = el;
    }
    if (best) scroller = best;
  }
  const scrollerRect = scroller === docScroll ? { top: 0, height: vh } : scroller.getBoundingClientRect();
  const screens = +(scroller.scrollHeight / Math.max(1, scroller === docScroll ? vh : scroller.clientHeight)).toFixed(1);

  // Sideways overflow.
  const docOver = Math.max(0, docScroll.scrollWidth - vw);
  const innerOver = scroller === docScroll ? 0 : Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const culprits = [];
  const cut = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.right <= vw + 2 || r.width === 0 || !visible(el)) continue;
    if (getComputedStyle(el).position === "fixed") continue;
    const parent = el.parentElement;
    if (parent && parent.getBoundingClientRect().right > vw + 2) continue; // only outermost
    if (r.left >= vw - 2) continue; // parked off-screen (carousels, slide-ins), not overflow
    const c = clips(el);
    const name = `${label(el)}(${Math.round(r.width)}px)`;
    if (c === "cut" && r.right > vw + 8 && cut.length < 4) cut.push(name);
    else if (!c && culprits.length < 4) culprits.push(name);
  }

  // Chrome pinned above the content before scrolling.
  let chrome = scrollerRect.top;
  if (scroller === docScroll) {
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      const r = el.getBoundingClientRect();
      if (r.top > 4 || r.width < vw * 0.5 || r.height < 16 || r.height > vh * 0.6 || !visible(el)) continue;
      chrome = Math.max(chrome, r.bottom);
    }
  }

  // Sims.
  const sims = [];
  const area = Math.min(scrollerRect.height, vh - chrome);
  for (const el of document.querySelectorAll("canvas, svg, model-viewer, iframe, [data-present]")) {
    if (el.closest(".site-header, header, nav, button, a, .ll-panel")) continue;
    if (el.tagName === "svg" && el.parentElement?.closest("svg")) continue;
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 120 || r.height < 90) continue;
    if (el.tagName === "CANVAS" && getComputedStyle(el).position === "fixed") continue; // backgrounds
    const issues = [];
    if (r.width > vw + 2 && !clips(el)) issues.push("wider");
    if (r.height > area + 2) issues.push(`taller(${Math.round(r.height)}/${Math.round(area)})`);
    if (r.width < vw * 0.45 && vw < 500) issues.push(`narrow(${Math.round(r.width)})`);
    sims.push({ el: label(el), w: Math.round(r.width), h: Math.round(r.height), issues });
  }

  // Tiny text.
  let tiny = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode;
    const el = t.parentElement;
    if (!el || seen.has(el) || t.textContent.trim().length < 3) continue;
    seen.add(el);
    if (el.closest("svg, .site-header, script, style")) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < 11 && visible(el)) tiny++;
  }

  return { vw, vh, docOver, innerOver, culprits, cut, screens, chrome: Math.round(chrome), chromePct: Math.round((chrome / vh) * 100), sims, tiny };
}

async function auditOne(browser, file, orient) {
  const { defaultBrowserType, ...device } = DEVICE[orient];
  const ctx = await browser.newContext({ ...device, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 140)));
  try {
    await page.goto(`${base}/${file}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(measure);
    if (shots) {
      fs.mkdirSync(shots, { recursive: true });
      await page.screenshot({ path: path.join(shots, `${file.replace(/[\/]/g, "__")}.${orient}.png`) });
    }
    return { file, orient, ...m, errors };
  } catch (e) {
    return { file, orient, failed: String(e.message).slice(0, 160), errors };
  } finally {
    await ctx.close();
  }
}

const browser = engine === "webkit"
  ? await playwright.webkit.launch()
  : await playwright.chromium.launch({ executablePath: findChromium() });
const jobs = files.flatMap((f) => orients.map((o) => [f, o]));
const results = [];
let next = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (next < jobs.length) {
    const [f, o] = jobs[next++];
    const r = await auditOne(browser, f, o);
    results.push(r);
    if (results.length % 50 === 0) process.stderr.write(`${results.length}/${jobs.length}\n`);
  }
}));
await browser.close();
results.sort((a, b) => a.file.localeCompare(b.file) || a.orient.localeCompare(b.orient));

const ok = results.filter((r) => !r.failed);
const summary = {};
for (const o of orients) {
  const rs = ok.filter((r) => r.orient === o);
  const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
  summary[o] = {
    pages: rs.length,
    sidewaysScroll: rs.filter((r) => r.culprits.length).length,
    contentCutOff: rs.filter((r) => r.cut.length).length,
    simsTooWide: rs.filter((r) => r.sims.some((s) => s.issues.includes("wider"))).length,
    simsTooTall: rs.filter((r) => r.sims.some((s) => s.issues.some((i) => i.startsWith("taller")))).length,
    simsNarrow: rs.filter((r) => r.sims.some((s) => s.issues.some((i) => i.startsWith("narrow")))).length,
    chromeOver25pct: rs.filter((r) => r.chromePct > 25).length,
    medianScreens: med(rs.map((r) => r.screens)),
    over40Screens: rs.filter((r) => r.screens > 40).length,
    tinyTextPages: rs.filter((r) => r.tiny > 5).length,
    withErrors: rs.filter((r) => r.errors.length).length,
  };
}
console.log(JSON.stringify({ summary, failed: results.filter((r) => r.failed).map((r) => `${r.file} [${r.orient}] ${r.failed}`) }, null, 2));
if (out) fs.writeFileSync(out, JSON.stringify(results, null, 2));
