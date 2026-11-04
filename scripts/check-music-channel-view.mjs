// Requires serve-local.js. Verify the desk uses the existing mixer controls.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
const browser = await chromium.launch({ executablePath: findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${process.env.LAB_URL || 'http://127.0.0.1:8080'}/music-lab.html`);
  await page.locator('[data-view="channels"]').click();
  assert.equal(await page.locator('.daw-scroll').isVisible(), false);
  const mixer = page.locator('[data-ref="mixer"]');
  assert.equal(await mixer.isVisible(), true);
  const strips = mixer.locator('[data-strip]');
  assert.equal(await strips.count(), 3);
  const first = strips.first();
  assert.equal(await first.locator('.daw-console-volume input').evaluate(el => getComputedStyle(el).writingMode), 'vertical-lr');
  const rects = await strips.evaluateAll(nodes => nodes.map(el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y }; }));
  assert.ok(rects[1].x > rects[0].x && rects[1].y === rects[0].y);
  await first.locator('[data-mx="mute"]').click();
  assert.equal(await strips.first().locator('[data-mx="mute"]').getAttribute('aria-pressed'), 'true');
  await strips.first().locator('[data-mx="volume"]').fill('0.5');
  await strips.first().locator('[data-mx="volume"]').dispatchEvent('change');
  await page.locator('[data-view="tracks"]').click();
  await page.locator('[data-view="channels"]').click();
  assert.equal(await strips.first().locator('[data-mx="volume"]').inputValue(), '0.5');
  await strips.first().locator('[data-mx="tools"]').last().click();
  assert.equal(await page.locator('[data-ref="tools"]').isVisible(), true);
  await page.locator('[data-view="channels"]').click();
  await page.locator('[data-act="studio"]').first().evaluate(el => el.click());
  await page.waitForTimeout(400);
  assert.ok(await mixer.evaluate(el => el.clientWidth) > 1000);
  await page.screenshot({ path: '/tmp/music-channel-desk.png' });
  for (const size of [{ width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(300);
    const fit = await mixer.locator('.daw-strips').evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight }));
    console.log(size, fit);
    assert.ok(fit.content <= fit.height + 2, 'faders fit without vertical scrolling');
    const output = await mixer.locator('[data-strip]').first().locator('.daw-console-volume output').boundingBox();
    assert.ok(output.y + output.height <= size.height, 'fader readout stays on screen');
  }
  await page.setViewportSize({ width:390, height:844 });
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.ok(await mixer.locator('.daw-strips').evaluate(el => el.scrollWidth > el.clientWidth));
  assert.deepEqual(errors, []);
  console.log('Channel desk layout, mix controls, view switching and mobile scroll passed');
} finally { await browser.close(); }
