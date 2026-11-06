import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/assets/css/skins/*.css', async route => {
    const delay = route.request().url().endsWith('notebook.css') ? 900 : 200;
    await new Promise(resolve => setTimeout(resolve, delay));
    await route.continue();
  });
  await page.goto(`${process.env.THEME_QA_URL || 'http://127.0.0.1:8080'}/index.html`);
  await page.locator('.nav-settings-toggle').click();
  await page.locator('[data-tab="skin"]').click();
  await page.waitForFunction(() => !!window.ClassroomOSSkins);
  await page.evaluate(() => ClassroomOSSkins.set('terminal'));
  await page.waitForFunction(() => document.documentElement.dataset.skin === 'terminal' && !!window.ClassroomOSSkinSurfaces);
  await page.evaluate(() => {
    window.skinFrames = [];
    window.skinWatch = true;
    function frame() {
      if (!skinWatch) return;
      const html = document.documentElement;
      const sheet = document.querySelector('link[data-classroomos-skin]');
      skinFrames.push({ skin: html.dataset.skin, sheet: sheet?.href.split('/').pop(), ready: !!sheet?.sheet, media: sheet?.media });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    ClassroomOSSkins.set('notebook');
  });
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => ClassroomOSSkins.current()), 'terminal', 'Keep old skin while loading');
  await page.evaluate(() => ClassroomOSSkins.set('underwater'));
  await page.waitForFunction(() => document.documentElement.dataset.skin === 'underwater');
  await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(() => ClassroomOSSkins.current()), 'underwater', 'Late stylesheet must not revert the last selection');
  const frames = await page.evaluate(() => { skinWatch = false; return skinFrames; });
  assert.ok(frames.length > 10);
  for (const frame of frames) {
    assert.ok(['terminal', 'underwater'].includes(frame.skin), JSON.stringify(frame));
    assert.equal(frame.sheet, `${frame.skin}.css`);
    assert.equal(frame.ready, true);
    assert.equal(frame.media, 'screen');
  }
  // Cached sheets must switch back without loading a new copy.
  await page.evaluate(() => ClassroomOSSkins.set('terminal'));
  await page.waitForFunction(() => document.documentElement.dataset.skin === 'terminal');
  assert.equal(await page.locator('link[href$="terminal.css"]').count(), 1);
  await page.reload();
  await page.waitForFunction(() => !!window.ClassroomOSSkins && document.documentElement.dataset.skin === 'terminal');
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => ClassroomOSSkins.current()), 'terminal');
  console.log(`PASS ${frames.length} animation frames: atomic stylesheet switching, latest click wins, stylesheet reuse and reload persistence`);
} finally { await browser.close(); }
