// Header-stack audit: how much of the screen is pinned chrome while a student reads?
//
// Loads every public page on a phone (390x844) and a laptop (1280x800), scrolls it, and sums the
// vertical space taken by bars that are actually stuck to the top (position:fixed, or
// position:sticky and sitting at its `top` offset). A sticky bar that is merely near the top
// because the page is scrolled there does not count, and neither does a header the page has tucked
// away (nav-mobile.js hides it on phones while scrolling down).
//
// Budgets (px of pinned chrome): phone 70, desktop 80. Pages over budget fail the run.
//
// Also reports each page's .site-header height at rest; the shared header is 45px on a phone and
// 65px on desktop, and anything else usually means a stylesheet is bleeding onto it (a bare
// `header {}` / `nav {}` rule in a lesson, or a theme rule that outranks the phone compaction).
//
// Usage: node scripts/audit-header-stack.mjs [--only=music,bible] [--phone-max=70] [--desktop-max=80]
//                                            [--json=tmp/header-audit.json] [--port=8123]
// Needs Playwright (devDependency) and a Chromium build (lib/find-chromium.mjs finds it).

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findChromium } from "../lib/find-chromium.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
  const [k, v = "true"] = a.slice(2).split("=");
  return [k, v];
}));
const only = args.only ? args.only.split(",") : null;
const PORT = Number(args.port || 8123);
const BASE = `http://127.0.0.1:${PORT}`;
const BUDGET = { phone: Number(args["phone-max"] || 70), desktop: Number(args["desktop-max"] || 80) };
const VIEWPORTS = {
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true },
  desktop: { width: 1280, height: 800 },
};
const SKIP_DIRS = new Set(["node_modules", "apps", "dist", "tmp", "student-projects", "student-projects-review", "starter-packs", ".git"]);
// Standalone tools and games that deliberately have no site header.
const SKIP_PAGES = new Set(["OSeditor.html", "lessons/life-sciences/animalia/explorer.html"]);

function listPages(dir = ROOT, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) listPages(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith(".html")) {
      const rel = path.relative(ROOT, path.join(dir, entry.name)).replace(/\\/g, "/");
      if (!SKIP_PAGES.has(rel) && (!only || only.some((o) => rel.includes(o)))) out.push(rel);
    }
  }
  return out;
}

// Runs in the page. Returns pinned bars and their union height from the top edge.
function measurePinned({ vh, vw }) {
  const bars = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) continue;
    if (cs.pointerEvents === "none" || el.tagName === "CANVAS") continue;
    const r = el.getBoundingClientRect();
    if (r.height < 16 || r.width < vw * 0.5 || r.height > vh * 0.4) continue;
    if (r.top > vh * 0.3 || r.bottom <= 0) continue;
    if (cs.position === "sticky") {
      const top = parseFloat(cs.top);
      if (Number.isNaN(top) || Math.abs(r.top - top) > 1.5 || window.scrollY < 50) continue;
    }
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "";
    bars.push({ name: el.tagName.toLowerCase() + (cls ? "." + cls : ""), top: Math.max(0, r.top), bottom: r.bottom });
  }
  bars.sort((a, b) => a.top - b.top);
  let end = 0;
  let total = 0;
  for (const b of bars) {
    if (b.bottom > end) { total += b.bottom - Math.max(b.top, end); end = b.bottom; }
  }
  return { total: Math.round(total), bars: bars.map((b) => `${b.name}:${Math.round(b.bottom - b.top)}`) };
}

function headerHeight() {
  const h = document.querySelector(".site-header");
  return h ? Math.round(h.getBoundingClientRect().height) : null;
}

async function loadPlaywright() {
  try { return await import("playwright"); } catch { return await import("playwright-core"); }
}

async function waitForServer() {
  for (let i = 0; i < 50; i += 1) {
    try { if ((await fetch(`${BASE}/index.html`)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("serve-local.js did not start");
}

const pages = listPages();
const server = spawn(process.execPath, ["serve-local.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const results = [];
let browser;
try {
  await waitForServer();
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({ executablePath: findChromium(), args: ["--no-sandbox"] });
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, serviceWorkers: "block" });
    await ctx.route((u) => !u.toString().startsWith(BASE), (r) => r.abort());
    const queue = [...pages];
    await Promise.all(Array.from({ length: 6 }, async () => {
      const page = await ctx.newPage();
      while (queue.length) {
        const rel = queue.shift();
        const rec = { page: rel, viewport: name };
        try {
          // Heavy 3D lessons can miss the first timeout when six pages load at once; retry once.
          try { await page.goto(`${BASE}/${rel}`, { waitUntil: "load", timeout: 20000 }); }
          catch { await page.goto(`${BASE}/${rel}`, { waitUntil: "domcontentloaded", timeout: 40000 }); }
          await page.waitForTimeout(800);
          rec.header = await page.evaluate(headerHeight);
          const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight * 2);
          if (scrollable) {
            for (let y = 0; y < 1200; y += 300) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(80); }
            await page.waitForTimeout(500);
            Object.assign(rec, await page.evaluate(measurePinned, { vh: vp.height, vw: vp.width }));
          }
        } catch (e) { rec.error = String(e.message || e).slice(0, 120); }
        results.push(rec);
      }
      await page.close();
    }));
    await ctx.close();
  }
} finally {
  await browser?.close();
  server.kill();
}

const over = results.filter((r) => r.total > BUDGET[r.viewport]);
const errors = results.filter((r) => r.error);
for (const name of Object.keys(VIEWPORTS)) {
  const mine = results.filter((r) => r.viewport === name && typeof r.total === "number").map((r) => r.total).sort((a, b) => a - b);
  const median = mine.length ? mine[Math.floor(mine.length / 2)] : 0;
  console.log(`${name}: ${mine.length} scrollable pages, median pinned ${median}px, worst ${mine.at(-1) ?? 0}px (budget ${BUDGET[name]}px)`);
}
const odd = results.filter((r) => r.header && r.header > (r.viewport === "phone" ? 56 : 70));
if (odd.length) {
  console.log(`\nSite header taller than normal (45px phone / 65px desktop) on ${odd.length} page(s):`);
  for (const r of odd.sort((a, b) => b.header - a.header).slice(0, 25)) console.log(`  ${String(r.header).padStart(4)}px ${r.viewport.padEnd(7)} ${r.page}`);
}
if (over.length) {
  console.log(`\nOver budget (${over.length}):`);
  for (const r of over.sort((a, b) => b.total - a.total)) console.log(`  ${String(r.total).padStart(4)}px ${r.viewport.padEnd(7)} ${r.page}  [${r.bars.join(", ")}]`);
}
if (errors.length) console.log(`\n${errors.length} page(s) failed to load, e.g. ${errors[0].page}: ${errors[0].error}`);
if (args.json) {
  fs.mkdirSync(path.dirname(path.resolve(ROOT, args.json)), { recursive: true });
  fs.writeFileSync(path.resolve(ROOT, args.json), JSON.stringify(results, null, 1));
}
process.exit(over.length || errors.length ? 1 : 0);
