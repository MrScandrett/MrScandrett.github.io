#!/usr/bin/env node
// Measures how much space each lesson's opening spends before the lesson starts.
//
//   node scripts/audit-density.mjs [--match=<path fragment>] [--width=1440] [--height=900]
//                                  [--out=report.json] [--base=http://localhost:8080]
//
// Needs `node serve-local.js`. For each page it reports the hero (the box that holds the
// first <h1>): its height, the h1's font size and line count, the widest gap between hero
// children, whether hero text mixes centred and left alignment, and the y of the first
// thing after the hero. The summary lists the worst pages so a fix can be checked.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from '../lib/find-chromium.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v = 'true'] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const base = args.base || 'http://localhost:8080';
const width = Number(args.width || 1440);
const height = Number(args.height || 900);
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(path.relative(root, p));
  }
  return out;
}

let pages = walk(path.join(root, 'lessons')).sort();
if (args.match) pages = pages.filter((p) => p.includes(args.match));

function measure() {
  const h1 = document.querySelector('main h1, h1');
  if (!h1) return null;
  // The hero is the h1's nearest ancestor that also holds something else worth reading.
  let hero = h1.parentElement;
  while (hero && hero !== document.body && hero.children.length < 2) hero = hero.parentElement;
  if (!hero || hero === document.body || hero.tagName === 'MAIN') hero = h1;
  const box = hero.getBoundingClientRect();
  const cs = getComputedStyle(h1);
  const fs = parseFloat(cs.fontSize);
  const lh = parseFloat(cs.lineHeight) || fs * 1.2;
  const lines = Math.round(h1.getBoundingClientRect().height / lh);
  const kids = [...hero.children].filter((k) => k.getBoundingClientRect().height > 0);
  let maxGap = 0;
  for (let i = 1; i < kids.length; i++) {
    const gap = kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom;
    if (gap > maxGap) maxGap = gap;
  }
  const aligns = new Set(kids.filter((k) => k.textContent.trim()).map((k) => {
    const r = k.getBoundingClientRect();
    const pr = hero.getBoundingClientRect();
    const left = Math.round(r.left - pr.left), right = Math.round(pr.right - r.right);
    const ta = getComputedStyle(k).textAlign;
    return ta === 'center' || (Math.abs(left - right) < 4 && left > 24) ? 'center' : 'left';
  }));
  const heroBottom = box.bottom + scrollY;
  const pad = getComputedStyle(hero);
  return {
    heroTag: hero.tagName.toLowerCase() + (hero.className && typeof hero.className === 'string' ? '.' + hero.className.trim().split(/\s+/).join('.') : ''),
    heroHeight: Math.round(box.height),
    heroBottom: Math.round(heroBottom),
    padTop: parseFloat(pad.paddingTop), padBottom: parseFloat(pad.paddingBottom),
    h1Size: Math.round(fs), h1Lines: lines,
    maxGap: Math.round(maxGap),
    mixedAlign: aligns.size > 1,
    bodySize: parseFloat(getComputedStyle(document.querySelector('main p') || document.body).fontSize),
  };
}

const browser = await chromium.launch({ executablePath: findChromium() });
const ctx = await browser.newContext({ viewport: { width, height } });
const results = [];
const queue = [...pages];
async function worker() {
  const page = await ctx.newPage();
  while (queue.length) {
    const p = queue.shift();
    try {
      await page.goto(`${base}/${p}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(400);
      const m = await page.evaluate(measure);
      if (m) results.push({ page: p, ...m });
    } catch (e) {
      results.push({ page: p, error: String(e.message || e).slice(0, 120) });
    }
  }
  await page.close();
}
await Promise.all(Array.from({ length: 6 }, worker));
await browser.close();

const ok = results.filter((r) => !r.error);
const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(q * (s.length - 1))]; };
const stat = (key) => ({ median: pct(ok.map((r) => r[key]), 0.5), p90: pct(ok.map((r) => r[key]), 0.9), max: Math.max(...ok.map((r) => r[key])) });
console.log(`${ok.length} pages measured at ${width}×${height} (${results.length - ok.length} errors)`);
for (const k of ['heroHeight', 'heroBottom', 'h1Size', 'h1Lines', 'maxGap', 'padTop', 'padBottom']) console.log(k.padEnd(11), stat(k));
console.log('mixed alignment:', ok.filter((r) => r.mixedAlign).length);
console.log('\nTallest openings:');
for (const r of [...ok].sort((a, b) => b.heroBottom - a.heroBottom).slice(0, 15)) {
  console.log(`  ${String(r.heroBottom).padStart(5)}px  h1 ${r.h1Size}px×${r.h1Lines}  gap ${r.maxGap}  ${r.page}  (${r.heroTag.slice(0, 40)})`);
}
if (args.out) fs.writeFileSync(args.out, JSON.stringify(results, null, 2));
