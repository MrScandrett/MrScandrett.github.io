import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.THEME_QA_URL || 'http://127.0.0.1:8080';
const out = process.env.THEME_QA_OUTPUT || '/tmp/classroomos-skin-qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
let checks = 0;
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/index.html`);
    await page.locator('.nav-settings-toggle').click();
    await page.locator('[data-tab="skin"]').click();
    await page.waitForFunction(() => !!window.ClassroomOSSkins && !!window.ClassroomOSCanvasBg);
    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const themes = await page.evaluate(() => ClassroomOSThemeRegistry.IDS);
    const skins = await page.evaluate(() => ClassroomOSSkins.IDS);
    // The background picker is the source of truth, including static None.
    const nav = await fs.readFile('assets/js/nav-mobile.js', 'utf8');
    const block = nav.slice(nav.indexOf('var CANVAS_OPTIONS'), nav.indexOf('];', nav.indexOf('var CANVAS_OPTIONS')));
    const ids = [...block.matchAll(/id:\s*"([a-z-]+)"/g)].map(m => m[1]);
    assert.ok(ids.length >= 9);
    for (const skin of skins) {
      await page.locator(`[data-skin-option="${skin}"]`).click();
      await page.waitForFunction(id => document.documentElement.dataset.skin === id, skin);
      if (skin !== 'glass') {
        await page.waitForFunction(() => !!document.querySelector('link[data-classroomos-skin]')?.sheet && !!window.ClassroomOSSkinSurfaces);
      }
      for (const theme of themes) {
        await page.evaluate(id => document.querySelector(`.nav-theme-chip[data-theme="${id}"]`).click(), theme);
        const violations = await page.evaluate(async () => (await axe.run('.nav-settings-panel', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
        })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
        assert.deepEqual(violations, [], `${width}/${skin}/${theme}: settings accessibility`);
        for (const background of ids) {
          await page.evaluate(bg => ClassroomOSCanvasBg.set(bg), background);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const state = await page.evaluate(() => ({
            skin: document.documentElement.dataset.skin,
            background: ClassroomOSCanvasBg.get(),
            overflow: document.documentElement.scrollWidth - innerWidth,
            selected: document.querySelector('.nav-skin-chip[aria-pressed="true"]')?.dataset.skinOption
          }));
          assert.equal(state.skin, skin);
          assert.equal(state.selected, skin);
          assert.equal(state.background, background);
          assert.ok(state.overflow <= 2, `${width}/${skin}/${theme}/${background}: overflow ${state.overflow}`);
          checks++;
        }
      }
      await page.screenshot({ path: `${out}/${width}-${skin}.png` });
    }
    // Pinning the already-active default still changes the preference source.
    await page.evaluate(() => {
      document.querySelector('.nav-theme-chip[data-theme="day"]').click();
      ClassroomOSSkins.follow();
      window.skinQaEvents = [];
      window.addEventListener('classroomos:skinchange', e => skinQaEvents.push(e.detail.pinned));
      ClassroomOSSkins.set('glass');
      ClassroomOSSkins.follow();
    });
    assert.deepEqual(await page.evaluate(() => skinQaEvents), [true, false]);
    // Returning to glass must stop tagging new content; reactivating resumes it.
    await page.evaluate(() => { ClassroomOSSkins.set('glass'); });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    await page.evaluate(() => { const b = document.createElement('button'); b.id = 'skin-qa-late'; b.textContent = 'Late control'; document.body.append(b); });
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#skin-qa-late').getAttribute('data-skin-surface'), null);
    await page.evaluate(() => ClassroomOSSkins.set('terminal'));
    await page.waitForFunction(() => document.querySelector('#skin-qa-late').dataset.skinSurface === 'control');
    // Opt-outs include the marked element itself and its children.
    await page.evaluate(() => { const b = document.querySelector('#skin-qa-late'); b.setAttribute('data-skin-keep', ''); b.style.borderRadius = '17px'; });
    assert.equal(await page.locator('#skin-qa-late').evaluate(el => getComputedStyle(el).borderRadius), '17px');
    await page.evaluate(() => { ClassroomOSSkins.set('underwater'); document.documentElement.dataset.reduceTransparency = 'true'; });
    await page.waitForFunction(() => document.querySelector('link[data-classroomos-skin]')?.href.endsWith('underwater.css') && !!document.querySelector('link[data-classroomos-skin]')?.sheet);
    assert.equal(await page.locator('.nav-settings-panel').evaluate(el => getComputedStyle(el).backdropFilter), 'none');
    assert.deepEqual(errors, [], `Browser errors at ${width}px`);
    for (const path of ['lessons/language-literature/cuneiform.html', 'lessons/physics/mechanics/newtons-laws.html', 'lessons/music/theory/fake-book.html']) {
      await page.goto(`${base}/${path}`);
      await page.waitForFunction(() => !!window.ClassroomOSSkins);
      for (const skin of skins) {
        await page.evaluate(id => ClassroomOSSkins.set(id), skin);
        await page.waitForFunction(id => document.documentElement.dataset.skin === id, skin);
        if (skin !== 'glass') await page.waitForFunction(id => document.querySelector('link[data-classroomos-skin]')?.href.endsWith(`${id}.css`) && !!document.querySelector('link[data-classroomos-skin]')?.sheet, skin);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${width}/${path}/${skin}: overflow`);
        if (path.includes('cuneiform')) {
          await page.locator('[data-sign="an"]').click();
          await page.locator('#add').click();
          assert.match(await page.locator('#transliteration').textContent(), /an/);
          await page.locator('#reset').click();
        } else if (path.includes('newtons-laws')) {
          await page.locator('[data-act="pause"]').click();
          assert.equal(await page.locator('[data-act="pause"]').getAttribute('aria-pressed'), 'true');
          await page.locator('[data-act="pause"]').click();
        } else {
          await page.locator('[data-fb-play]').click();
          await page.waitForFunction(() => document.querySelector('[data-fb-play]').getAttribute('aria-pressed') === 'true');
          await page.locator('[data-fb-play]').click();
        }
      }
    }
    assert.deepEqual(errors, [], `Lesson browser errors at ${width}px`);
    await page.close();
    console.log(`PASS ${width}px: every theme × skin × background, opt-outs, observer lifecycle, reduced transparency`);
  }
  console.log(`PASS ${checks} combinations. Screenshots: ${out}`);
} finally { await browser.close(); }
