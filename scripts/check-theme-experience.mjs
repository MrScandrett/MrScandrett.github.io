import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.THEME_QA_URL || 'http://127.0.0.1:8080';
const out = process.env.THEME_QA_OUTPUT || '/tmp/classroomos-theme-qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: findChromium(), headless: true, args: ['--no-sandbox'] });
const pages = ['index.html', 'lessons/language-literature/cuneiform.html', 'lessons/physics/mechanics/newtons-laws.html', 'lessons/music/fake-book.html'];
let checks = 0;
try {
  if (!process.argv.includes("--presentation-only")) for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [index, path] of pages.entries()) {
      await page.goto(`${base}/${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.nav-settings-toggle');
      await page.waitForFunction(() => !!document.querySelector('link[data-classroomos-theme-surfaces]')?.sheet);
      await page.locator('.nav-settings-toggle').click();
      await page.locator('[data-tab="theme"]').click();
      assert.equal(await page.locator('.nav-theme-preview-card').count(), 12);
      await page.locator('[data-tone-filter="quiet"]').click();
      assert.equal(await page.locator('.nav-theme-chip:visible').count(), 9);
      await page.locator('[data-tone-filter="expressive"]').click();
      assert.equal(await page.locator('.nav-theme-chip:visible').count(), 3);
      await page.locator('[data-tone-filter="all"]').click();
      await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
      const ids = await page.evaluate(() => window.ClassroomOSThemeRegistry.IDS);
      for (const id of ids) {
        await page.locator(`.nav-theme-chip[data-theme="${id}"]`).click();
        await page.waitForFunction(id => document.documentElement.dataset.theme === id, id);
        assert.equal(await page.locator(`.nav-theme-chip[data-theme="${id}"]`).getAttribute('aria-pressed'), 'true');
        const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
        assert.ok(dimensions.scroll <= dimensions.width + 2, `${path} ${width} ${id}: overflow ${dimensions.scroll}`);
        const a11y = await page.evaluate(async () => (await window.axe.run('.nav-settings-panel', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
        })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
        assert.deepEqual(a11y, [], `${path} ${width} ${id} settings accessibility: ${JSON.stringify(a11y)}`);
        checks++;
      }
      // The keyboard arrows reach another candidate; focus remains visible.
      await page.locator('.nav-theme-chip[data-theme="day"]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.theme), 'sakura');
      assert.equal(await page.locator('.nav-theme-chip:focus').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
      await page.locator(`.nav-theme-chip[data-theme="${index === 0 ? 'diamond' : index === 1 ? 'bark' : index === 2 ? 'emerald' : 'night'}"]`).click();
      await page.locator(".nav-settings-panel").evaluate(el => { el.scrollTop = 0; });
      await page.screenshot({ path: `${out}/${index}-${width}-picker.png` });
      await page.locator('[data-tab="access"]').click();
      await page.locator('.nav-motion-checkbox').check();
      await page.locator('.nav-transparency-checkbox').check();
      await page.locator('.nav-presentation-checkbox').check();
      assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-classroom-presentation')), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), '18px');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.nav-settings-panel').isVisible(), false);
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('nav-settings-toggle')), true);
      await page.screenshot({ path: `${out}/${index}-${width}-presentation.png` });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.nav-settings-toggle');
      assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-classroom-presentation')), true);
      await page.locator('.nav-settings-toggle').click();
      await page.locator('[data-tab="access"]').click();
      assert.equal(await page.locator('.nav-presentation-checkbox').isChecked(), true);
      await page.locator('.nav-presentation-checkbox').uncheck();
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), '16px');
      assert.equal(await page.locator('.nav-motion-checkbox').isChecked(), true);
      assert.equal(await page.locator('.nav-transparency-checkbox').isChecked(), true);
      await page.locator('.nav-motion-checkbox').uncheck();
      await page.locator('.nav-transparency-checkbox').uncheck();
      await page.keyboard.press('Escape');
      await page.screenshot({ path: `${out}/${index}-${width}-content.png` });
      // Check the reading/workshop still responds after global theme changes.
      if (path.includes('cuneiform')) {
        await page.locator('[data-sign="an"]').click();
        await page.locator('#add').click();
        assert.match(await page.locator('#transliteration').textContent(), /an/);
        await page.locator('#reset').click();
        assert.match(await page.locator('#transliteration').textContent(), /No signs/);
      }
      console.log(`PASS ${width}px ${path}: 12 themes, filters, keyboard, presentation persistence and restoration`);
    }
    assert.deepEqual(errors, [], `Browser errors: ${errors.join('; ')}`);
    await context.close();
  }
  // Also exercise real learning controls with decorative motion enabled initially.
  const live = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  const p = await live.newPage();
  await p.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !!window.ClassroomOSCanvasBg);
  await p.evaluate(() => { window.ClassroomOSCanvasBg.set('particles'); window.ClassroomOSThemeRegistry.setPresentation(true); });
  assert.equal(await p.locator('#site-canvas-bg').evaluate(el => getComputedStyle(el).display), 'none');
  const other = await live.newPage();
  await other.goto(`${base}/lessons/physics/mechanics/newtons-laws.html`, { waitUntil: 'domcontentloaded' });
  await other.waitForSelector('#ng-canvas');
  assert.equal(await other.evaluate(() => document.documentElement.hasAttribute('data-classroom-presentation')), true);
  assert.notEqual(await other.locator('#ng-canvas').evaluate(el => getComputedStyle(el).display), 'none');
  await other.locator('[data-act="pause"]').click();
  assert.equal(await other.locator('[data-act="pause"]').getAttribute('aria-pressed'), 'true');
  await other.locator('[data-act="pause"]').click();
  assert.equal(await other.locator('[data-act="pause"]').getAttribute('aria-pressed'), 'false');
  await other.locator('[data-act="shake"]').click();
  await other.waitForFunction(() => !document.querySelector('#ng-caption-text').textContent.includes('hanging'));
  const simBefore = await other.locator('#ng-canvas').evaluate(el => el.toDataURL());
  await other.waitForTimeout(250);
  const simAfter = await other.locator('#ng-canvas').evaluate(el => el.toDataURL());
  assert.notEqual(simBefore, simAfter, 'Educational simulation should keep drawing in presentation mode');
  await other.locator('[data-act="reset-drop"]').click();
  await other.screenshot({ path: `${out}/newton-live-presentation.png` });
  await other.evaluate(() => window.ClassroomOSThemeRegistry.setPresentation(false));
  await p.waitForFunction(() => !document.documentElement.hasAttribute('data-classroom-presentation'));
  assert.notEqual(await p.locator('#site-canvas-bg').evaluate(el => getComputedStyle(el).display), 'none');
  await other.goto(`${base}/lessons/music/fake-book.html`, { waitUntil: 'domcontentloaded' });
  await other.waitForSelector('[data-fb-play]');
  await other.evaluate(() => window.ClassroomOSThemeRegistry.setPresentation(true));
  await other.locator('[data-fb-play]').click();
  await other.waitForFunction(() => document.querySelector('[data-fb-play]').getAttribute('aria-pressed') === 'true');
  await other.locator('[data-fb-play]').click();
  await other.waitForFunction(() => document.querySelector('[data-fb-play]').getAttribute('aria-pressed') === 'false');
  await p.setViewportSize({ width: 320, height: 640 });
  await p.locator('.nav-settings-toggle').click();
  await p.locator('[data-tab="access"]').click();
  await p.locator('.nav-presentation-checkbox').check();
  await p.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const access = await p.evaluate(async () => (await axe.run('.nav-settings-panel', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations);
  assert.deepEqual(access, [], 'Presentation/accessibility settings should be accessible');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  await p.screenshot({ path: `${out}/access-320-presentation.png` });
  await live.close();
  console.log('PASS live simulation, music play/stop, decorative canvas restoration, cross-tab sync, and 320px presentation settings');
  if (checks) console.log(`PASS ${checks} theme/page/viewport combinations.`);
  console.log(`Screenshots: ${out}`);
} finally {
  await browser.close();
}
