#!/usr/bin/env node
// Night-mode audit: loads every lesson in a dark theme and measures what a student would see.
//
//   low-contrast  text whose contrast against its real background is under WCAG AA (4.5, or 3 for large text)
//   bright panels big, opaque, near-white text panels/cards (outermost only) that glare in a dark theme.
//                 Photos, SVG, canvas and video are never counted: they keep their own rendering.
//
// Needs a running dev server (`node serve-local.js`, default http://localhost:8080).
//
//   node scripts/audit-night-mode.mjs                      all lessons, theme "night"
//   node scripts/audit-night-mode.mjs --theme=lavalamp     any dark theme id (night, lavalamp, mandelbrot, vaporwave, bark)
//   node scripts/audit-night-mode.mjs --match=bible        only lessons whose path contains "bible"
//   node scripts/audit-night-mode.mjs --save-baseline      write data/night-audit-baseline.json
//   node scripts/audit-night-mode.mjs --check              fail if a lesson is worse than the baseline
//   --base=URL  --root=DIR  --concurrency=N  --out=report.json  --keep-lighting (do not force the theme)

import fs from "node:fs";
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

const root = path.resolve(arg("root", process.cwd()));
const base = arg("base", "http://localhost:8080").replace(/\/$/, "");
const theme = arg("theme", "night");
const match = arg("match", "");
const concurrency = Number(arg("concurrency", 6));
const baselinePath = path.join(root, "data", "night-audit-baseline.json");

function listLessons(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listLessons(full));
    else if (entry.name.endsWith(".html")) out.push(path.relative(root, full).split(path.sep).join("/"));
  }
  return out;
}
const files = listLessons(path.join(root, "lessons")).filter((f) => f.includes(match)).sort();

function measure() {
  const lum = (c) => {
    const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const cs = (s) => {
    const m = s.match(/color\(srgb ([\d. e-]+?)(?: \/ ([\d.]+%?))?\)/);
    if (m) {
      const v = m[1].trim().split(/\s+/).map(Number);
      const a = m[2] === undefined ? 1 : (m[2].endsWith("%") ? parseFloat(m[2]) / 100 : +m[2]);
      return [v[0] * 255, v[1] * 255, v[2] * 255, a];
    }
    const n = s.match(/[\d.]+/g);
    return n && n.length >= 3 ? [+n[0], +n[1], +n[2], n[3] === undefined ? 1 : +n[3]] : null;
  };
  const colorsIn = (s) => (s.match(/(?:rgba?|color)\([^)]*\)/g) || []).map(cs).filter(Boolean);
  const canvasBg = (() => {
    const c = cs(getComputedStyle(document.documentElement).backgroundColor);
    return c && c[3] > 0 ? c.slice(0, 3) : [28, 28, 30];
  })();
  // Background an element paints. Gradients count as their average colour; images are unknown.
  const paint = (el) => {
    let layers = [];
    let unknown = false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const s = getComputedStyle(e);
      let c = cs(s.backgroundColor);
      if (s.backgroundImage !== "none") {
        if (s.backgroundImage.includes("url(")) { unknown = true; break; }
        const g = colorsIn(s.backgroundImage);
        if (g.length) {
          const ranked = g.slice().sort((x, y) => lum(x) - lum(y));
          const trim = Math.floor(ranked.length * 0.25);
          const core = ranked.slice(trim, ranked.length - trim);
          const avg = [0, 1, 2].map((k) => core.reduce((t, x) => t + x[k], 0) / core.length);
          const al = Math.min(...g.map((x) => x[3]));
          if (al > 0) layers.push([avg[0], avg[1], avg[2], al]);
          if (al >= 1) break;
        }
      }
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
    }
    let out = canvasBg;
    for (let i = layers.length - 1; i >= 0; i--) out = out.map((v, k) => v * (1 - layers[i][3]) + layers[i][k] * layers[i][3]);
    return { rgb: out, unknown };
  };
  const label = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");

  const low = [];
  let textChecked = 0;
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    const el = t.parentElement;
    if (!t.nodeValue.trim() || !el || seen.has(el)) continue;
    seen.add(el);
    if (el.closest("script,style,noscript,svg,canvas,[hidden],[aria-hidden=\"true\"],.sr-only,.site-header,.nav-settings-panel,.nav-dd-panel,.skip-link,.site-footer")) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || +s.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth) continue;
    const fg = cs(s.color);
    if (!fg || fg[3] === 0) continue;
    const bg = paint(el);
    if (bg.unknown) continue;
    const fgc = fg.slice(0, 3).map((v, k) => v * fg[3] + bg.rgb[k] * (1 - fg[3]));
    const l1 = lum(fgc), l2 = lum(bg.rgb);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const px = parseFloat(s.fontSize);
    const large = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    textChecked++;
    if (ratio < (large ? 3 : 4.5)) low.push({ ratio: +ratio.toFixed(2), el: label(el), text: t.nodeValue.trim().slice(0, 28), fg: s.color, bg: "rgb(" + bg.rgb.map(Math.round) + ")" });
  }

  const MEDIA = /^(IMG|SVG|CANVAS|VIDEO|PICTURE|IFRAME|OBJECT|EMBED|MODEL-VIEWER)$/i;
  const bright = [];
  const words = (el) => ((el.textContent || "").match(/\p{L}{2,}/gu) || []).length;
  const scan = (el) => {
    if (el.nodeType !== 1 || MEDIA.test(el.tagName) || /^(SCRIPT|STYLE|NOSCRIPT)$/i.test(el.tagName)) return;
    const s = getComputedStyle(el);
    if (s.display === "none" || el.matches("[hidden], [aria-hidden=\"true\"]") || el.matches(".site-header, .nav-settings-panel, .nav-dd-panel, .site-footer")) return;
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area >= 8000 && words(el) >= 5) {
      let c = cs(s.backgroundColor);
      let candidate = null;
      if (c && c[3] >= 0.5) candidate = c;
      else if (s.backgroundImage !== "none" && !s.backgroundImage.includes("url(")) {
        const g = colorsIn(s.backgroundImage).filter((x) => x[3] >= 0.5);
        if (g.length) candidate = [0, 1, 2].map((k) => g.reduce((t, x) => t + x[k], 0) / g.length).concat([1]);
      }
      if (candidate && lum(candidate) >= 0.45) {
        bright.push({ el: label(el), bg: "rgb(" + candidate.slice(0, 3).map(Math.round) + ")", area: Math.round(area) });
        return; // outermost only
      }
    }
    for (const child of el.children) scan(child);
  };
  scan(document.body);

  return {
    theme: document.documentElement.dataset.theme,
    lighting: document.documentElement.dataset.lighting,
    textChecked,
    low: low.slice(0, 40),
    lowCount: low.length,
    bright: bright.slice(0, 12),
    brightCount: bright.length,
    brightArea: bright.reduce((t, b) => t + b.area, 0),
  };
}

const browser = await playwright.chromium.launch({ executablePath: findChromium() });
const context = await browser.newContext({ viewport: { width: 430, height: 900 } });
if (!flag("keep-lighting")) {
  await context.addInitScript((id) => {
    try {
      localStorage.setItem("classroomos-lighting-phase", id);
      localStorage.setItem("classroomos-lighting-mode", "manual");
    } catch {}
  }, theme);
}

const results = {};
let next = 0;
async function worker() {
  const page = await context.newPage();
  while (next < files.length) {
    const file = files[next++];
    try {
      await page.goto(`${base}/${file}`, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
      await page.waitForTimeout(Number(arg("wait", 2800)));
      results[file] = await page.evaluate(measure);
    } catch (error) {
      results[file] = { error: String(error).slice(0, 120) };
    }
  }
  await page.close();
}
await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
await browser.close();

const rows = Object.entries(results);
const ok = rows.filter(([, r]) => !r.error);
const dark = ok.filter(([, r]) => r.lighting === "night");
const sum = (key) => ok.reduce((t, [, r]) => t + (r[key] || 0), 0);
const count = (fn) => ok.filter(([, r]) => fn(r)).length;

console.log(`\nNight-mode audit: theme=${theme}, ${rows.length} lessons (${rows.length - ok.length} failed to load, ${ok.length - dark.length} did not enter a dark theme)`);
console.log(`  low-contrast text : ${sum("lowCount")} elements on ${count((r) => r.lowCount)} lessons`);
console.log(`  bright panels     : ${sum("brightCount")} panels on ${count((r) => r.brightCount)} lessons`);

const worst = (key) => ok.filter(([, r]) => r[key]).sort((a, b) => b[1][key] - a[1][key]).slice(0, 12);
if (sum("lowCount")) {
  console.log("\nWorst low-contrast lessons:");
  for (const [f, r] of worst("lowCount")) console.log(`  ${String(r.lowCount).padStart(4)}  ${f}  e.g. ${r.low[0].el} ${r.low[0].fg} on ${r.low[0].bg} "${r.low[0].text}"`);
}
if (sum("brightCount")) {
  console.log("\nWorst bright-panel lessons:");
  for (const [f, r] of worst("brightArea")) console.log(`  ${String(r.brightCount).padStart(4)}  ${f}  e.g. ${r.bright[0].el} ${r.bright[0].bg}`);
}

const out = arg("out", "");
if (out) fs.writeFileSync(out, JSON.stringify(results, null, 1));

const slim = Object.fromEntries(ok.map(([f, r]) => [f, { low: r.lowCount, bright: r.brightCount }]));
if (flag("save-baseline")) {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, JSON.stringify({ theme, lessons: slim }, null, 1) + "\n");
  console.log(`\nSaved ${path.relative(root, baselinePath)}`);
}
if (flag("check")) {
  const saved = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const worse = Object.entries(slim).filter(([f, v]) => saved.lessons[f] && (v.low > saved.lessons[f].low || v.bright > saved.lessons[f].bright));
  if (worse.length) {
    console.log(`\n${worse.length} lesson(s) are worse than the baseline:`);
    for (const [f, v] of worse) console.log(`  ${f}: low ${saved.lessons[f].low} -> ${v.low}, bright ${saved.lessons[f].bright} -> ${v.bright}`);
    process.exit(1);
  }
  console.log("\nNo lesson is worse than the baseline.");
}
