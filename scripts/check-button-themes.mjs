// Run against serve-local.js; exercise the actual cascade after skin switches.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
const base = process.env.THEME_QA_URL || 'http://127.0.0.1:8080';
const nav = await fs.readFile('assets/js/nav-mobile.js', 'utf8');
const options = nav.slice(nav.indexOf('var CANVAS_OPTIONS'), nav.indexOf('];', nav.indexOf('var CANVAS_OPTIONS')));
const backgrounds = [...options.matchAll(/id:\s*"([a-z-]+)"/g)].map(m => m[1]);
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
let checks = 0;
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('.nav-settings-toggle').click();
    await page.locator('[data-tab="skin"]').click();
    await page.waitForFunction(() => window.ClassroomOSSkins && window.ClassroomOSCanvasBg);
    await page.keyboard.press('Escape');
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const { skins, themes } = await page.evaluate(() => ({ skins: ClassroomOSSkins.IDS, themes: ClassroomOSThemeRegistry.IDS }));
    for (const skin of skins.filter(s => !process.argv.includes('--glass-only') || s === 'glass')) for (const theme of themes) {
      await page.evaluate(({ skin, theme }) => {
        ClassroomOSSkins.set(skin);
        document.querySelector(`.nav-theme-chip[data-theme="${theme}"]`).click();
      }, { skin, theme });
      await page.waitForFunction(s => document.documentElement.dataset.skin === s, skin);
      await page.waitForTimeout(600);
      const label = `${width}/${skin}/${theme}`;
      for (const background of backgrounds) {
        await page.evaluate(bg => ClassroomOSCanvasBg.set(bg), background);
        const link = page.locator('.home-start-class');
        await assert.doesNotReject(() => link.scrollIntoViewIfNeeded());
        assert.equal(await link.evaluate(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.left >= 0 && r.right <= innerWidth;
        }), true, `${label}/${background}: launch fits`);
        checks++;
      }
      for (const state of ['normal', 'hover', 'focus']) {
        await page.mouse.move(0, 0);
        await page.locator('.home-start-class').evaluate(el => el.blur());
        if (state === 'hover') await page.locator('.home-start-class').hover();
        if (state === 'focus') await page.locator('.home-start-class').focus();
        await page.evaluate(() => window.ClassroomOSContrastGuard?.runNow());
        const violations = await page.evaluate(async () => (await axe.run({ include: [['button, [role="button"], [role="tab"], [data-skin-surface="control"], .btn, .button, .home-launch-card']] }, { runOnly: ['color-contrast'] })).violations.flatMap(v => v.nodes.map(n => ({ target: n.target, summary: n.failureSummary }))));
        assert.deepEqual(violations, [], `${label}/${state}: text contrast`);
      }
    }
    await context.close();
    console.log(`PASS ${width}px: all skins/themes/backgrounds and launch interaction states`);
  }
  console.log(`PASS ${checks} button appearance combinations`);
} finally { await browser.close(); }
