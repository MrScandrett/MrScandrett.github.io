/* Keyboard smoke test for the student apps that draw on a <canvas>.
 * pa11y can't see these problems, so drive each page with a real keyboard:
 *   node serve-local.js     then
 *   node tests/apps-a11y-browser.mjs [--match=slug] [--update-baseline]
 *
 * For every app with a canvas it checks that
 *   - the page loads without uncaught errors,
 *   - Tab never traps focus (it keeps moving, or leaves the document),
 *   - the focused control shows a visible focus indicator,
 *   - the page reacts to the keyboard (a listener or a focusable control exists),
 *   - Space/Enter/arrow keys don't throw, and
 *   - prefers-reduced-motion leaves no CSS animation longer than a blink.
 * Known failures live in data/apps-a11y-baseline.json; only new ones fail the run. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.APPS_URL || 'http://localhost:8080';
const baselinePath = path.join(process.cwd(), 'data', 'apps-a11y-baseline.json');
const matchArg = process.argv.find((a) => a.startsWith('--match='));
const match = matchArg ? matchArg.slice('--match='.length) : '';
const updateBaseline = process.argv.includes('--update-baseline');

const manifest = JSON.parse(await fs.readFile(path.join(process.cwd(), 'apps', 'manifest.json'), 'utf8'));
const slugs = (Array.isArray(manifest) ? manifest : manifest.projects || [])
  .map((p) => p.slug)
  .filter((s) => s && (!match || s.includes(match)));

const browser = await chromium.launch({ headless: true, executablePath: findChromium() });
const failures = {};
let checked = 0;

async function checkApp(slug) {
  const problems = [];
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  try {
    await page.goto(`${base}/apps/${slug}/`, { waitUntil: 'load', timeout: 20000 });
    if (!(await page.locator('canvas').count())) return null;
    await page.waitForTimeout(500);

    // Register keyboard listeners from here on so we can tell if the app listens at all.
    await page.evaluate(() => {
      window.__keys = 0;
      for (const t of ['keydown', 'keyup']) window.addEventListener(t, () => window.__keys++, true);
    });

    // Tab walk: focus must keep moving and the first stop must show a focus ring.
    const stops = [];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      if (i < 4) await page.waitForTimeout(300); // let a `transition: all` finish drawing the ring
      stops.push(await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
          (cs.boxShadow && cs.boxShadow !== 'none');
        const path = [];
        for (let n = el; n && n !== document.body && path.length < 4; n = n.parentElement) {
          path.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : ''));
        }
        return { id: path.join('<'), ring: !!ring };
      }));
    }
    const focusable = stops.filter(Boolean);
    const unique = new Set(focusable.map((s) => s.id));
    // One tabbable control wraps onto itself in headless Chromium; only several that
    // never get reached means something is swallowing Tab.
    const tabbable = await page.evaluate(() => [...document.querySelectorAll(
      'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden').length);
    if (tabbable > 1 && focusable.length >= 10 && unique.size === 1) problems.push('keyboard trap: Tab stays on one element');
    const noRing = focusable.slice(0, 4).find((s) => !s.ring);
    if (noRing) problems.push(`no visible focus indicator on ${noRing.id}`);

    for (const key of ['Enter', 'Space', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(40);
    }
    const heard = await page.evaluate(() => window.__keys);
    if (!focusable.length && !heard) problems.push('no keyboard path: nothing focusable and keys do nothing');

    const longAnims = await page.evaluate(() => document.getAnimations()
      .filter((a) => Number.isFinite(a.effect?.getComputedTiming().duration) && a.effect.getComputedTiming().duration > 50 && a.effect.getComputedTiming().iterations === Infinity)
      .length);
    if (longAnims) problems.push(`${longAnims} infinite CSS animation(s) under prefers-reduced-motion`);

    if (errors.length) problems.push(`uncaught error: ${errors[0].slice(0, 100)}`);
    return problems;
  } catch (e) {
    return [`could not load: ${e.message.slice(0, 80)}`];
  } finally {
    await context.close();
  }
}

try {
  for (const slug of slugs) {
    const problems = await checkApp(slug);
    if (problems === null) continue;
    checked++;
    if (problems.length) failures[slug] = problems;
    console.log(`${problems.length ? 'FAIL' : ' ok '} ${slug}${problems.length ? ' — ' + problems.join('; ') : ''}`);
  }
} finally {
  await browser.close();
}

console.log(`\nChecked ${checked} canvas app(s); ${Object.keys(failures).length} with problems.`);

if (updateBaseline) {
  if (match) throw new Error('Refusing to update the baseline from a filtered run.');
  await fs.writeFile(baselinePath, JSON.stringify({ schemaVersion: 1, allowed: failures }, null, 2) + '\n');
  console.log(`Baseline written to ${path.relative(process.cwd(), baselinePath)}`);
} else {
  const allowed = JSON.parse(await fs.readFile(baselinePath, 'utf8').catch(() => '{"allowed":{}}')).allowed;
  const fresh = Object.entries(failures).flatMap(([slug, list]) =>
    list.filter((p) => !(allowed[slug] || []).includes(p)).map((p) => `${slug}: ${p}`));
  if (fresh.length) {
    console.error('\nNew keyboard/accessibility problems:\n  ' + fresh.join('\n  '));
    process.exit(1);
  }
}
