import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const url = 'http://127.0.0.1:8080/lessons/3d-design/blender/blender-sculpting.html';

test('sculpt trainer coaches a large-form-first workflow without mobile overflow', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('.d3-original-reference').evaluate(element => { element.open = true; });
  const canvas = page.locator('#sculpt-canvas');
  await canvas.scrollIntoViewIfNeeded();
  await page.locator('#sculpt-radius').fill('70');
  const box = await canvas.boundingBox();
  assert.ok(box);
  for (const offset of [0, 28, 56]) {
    await page.mouse.move(box.x + 90 + offset, box.y + 190);
    await page.mouse.down();
    await page.mouse.move(box.x + 145 + offset, box.y + 175, { steps: 4 });
    await page.mouse.up();
  }
  assert.equal(await page.locator('#sculpt-strokes').textContent(), '3');
  await page.locator('#sculpt-check-stage').click();
  assert.match(await page.locator('#sculpt-coach').textContent(), /Large-form evidence/);
  assert.match(await page.locator('#sculpt-brief-title').textContent(), /Organize/);

  await page.locator('[data-sculpt-brush="smooth"]').click();
  await page.locator('#sculpt-dyntopo').check();
  await page.locator('#sculpt-check-stage').click();
  assert.match(await page.locator('#sculpt-brief-title').textContent(), /controlled detail/);

  await page.locator('#sculpt-radius').fill('40');
  await page.locator('[data-sculpt-brush="crease"]').click();
  await page.locator('[data-sculpt-brush="mask"]').click();
  await page.locator('#sculpt-check-stage').click();
  assert.match(await page.locator('#sculpt-coach').textContent(), /disciplined sculpting sequence/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  assert.deepEqual(errors, []);
  if (process.env.SCULPT_QA_SCREENSHOT) await page.locator('.sculpt-lab').screenshot({ path: process.env.SCULPT_QA_SCREENSHOT });
  await browser.close();
});
