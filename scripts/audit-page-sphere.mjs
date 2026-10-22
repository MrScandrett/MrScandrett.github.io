// Opens every live lesson in the 360° page sphere and reports the ones that don't draw well.
// Needs a local server:  node serve-local.js
//   node scripts/audit-page-sphere.mjs                      every live lesson (+ home page)
//   node scripts/audit-page-sphere.mjs --match=chemistry    only paths containing "chemistry"
//   node scripts/audit-page-sphere.mjs --limit=20           first 20 pages
//   --base=http://localhost:8080   --out=tmp/sphere-audit/report.json
// Per page: screens drawn, blank screens, pages cut short (more than 15 screens), page
// errors, and how long the draw took. Exit code 1 if any page failed to draw at all.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const arg = (name, fallback) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const base = arg('base', process.env.SPHERE_URL || 'http://localhost:8080');
const match = arg('match', '');
const limit = Number(arg('limit', 0));
const out = arg('out', 'tmp/sphere-audit/report.json');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/lessons.json'), 'utf8'));
let pages = ['index.html', ...(Array.isArray(catalog) ? catalog : catalog.lessons || [])
  .filter(l => l.status === 'live' && l.url).map(l => l.url)];
pages = [...new Set(pages)].filter(p => p.includes(match));
if (limit > 0) pages = pages.slice(0, limit);

const browser = await chromium.launch({
  headless: true,
  executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const results = [];

for (const [i, src] of pages.entries()) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const started = Date.now();
  const r = { src, screens: 0, blank: [], truncated: false, errors, ms: 0, status: 'ok' };
  try {
    await page.goto(`${base}/vr/page-sphere.html?src=${encodeURIComponent(src)}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => /screens? around you|Showing the first/.test(document.getElementById("vr-status").textContent), null, { timeout: 45000 });
    r.ms = Date.now() - started;
    await page.waitForTimeout(1200); // let a settling page redraw once
    const info = await page.evaluate(async () => {
      const api = window.ClassroomOSPageSphere;
      const blank = [];
      for (let t = 0; t < api.tileCount(); t++) {
        const img = await new Promise(ok => { const el = new Image(); el.onload = () => ok(el); el.src = api.tileImage(t); });
        const c = document.createElement('canvas'); c.width = 160; c.height = 112;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0, 160, 112);
        const d = g.getImageData(0, 0, 160, 112).data; const seen = new Set();
        for (let k = 0; k < d.length; k += 4) seen.add((d[k] >> 3) + ',' + (d[k + 1] >> 3) + ',' + (d[k + 2] >> 3));
        if (seen.size < 6) blank.push(t);
      }
      return { screens: api.tileCount(), blank, status: document.getElementById('vr-status').textContent };
    });
    r.screens = info.screens;
    r.blank = info.blank;
    r.truncated = /Showing the first/.test(info.status);
    if (r.blank.includes(0)) r.status = 'blank';
    else if (r.blank.length || r.truncated || errors.length) r.status = 'warn';
  } catch (e) {
    r.status = 'failed';
    r.ms = Date.now() - started;
    errors.push(String(e.message || e).split('\n')[0]);
  }
  await page.close();
  results.push(r);
  const mark = { ok: '✓', warn: '!', blank: '✗', failed: '✗' }[r.status];
  const notes = [
    r.blank.length && `blank screens ${r.blank.map(n => n + 1).join(',')}`,
    r.truncated && 'cut short',
    errors.length && `${errors.length} error(s): ${errors[0].slice(0, 90)}`
  ].filter(Boolean).join('; ');
  console.log(`${mark} [${i + 1}/${pages.length}] ${src} · ${r.screens} screens · ${(r.ms / 1000).toFixed(1)}s${notes ? ' · ' + notes : ''}`);
}
await browser.close();

fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
fs.writeFileSync(path.resolve(root, out), JSON.stringify({ base, when: new Date().toISOString(), results }, null, 2));
const count = s => results.filter(r => r.status === s).length;
console.log(`\n${results.length} pages: ${count('ok')} ok, ${count('warn')} warnings, ${count('blank')} blank, ${count('failed')} failed. Report: ${out}`);
process.exit(count('blank') + count('failed') ? 1 : 0);
