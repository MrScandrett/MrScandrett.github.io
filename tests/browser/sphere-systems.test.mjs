import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

const URL = 'http://127.0.0.1:8080/lessons/engineering/mechanical-and-civil-design/sphere-systems.html';

test('sphere-systems lesson renders all 4 interactive labs, formulas, missions, and 6-question quiz cleanly', async () => {
  const browser = await chromium.launch({
    executablePath: findChromium(),
    headless: true,
  });

  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#ss-sphere-canvas', { state: 'visible' });

    // Zero horizontal overflow on desktop
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      true,
      'Desktop horizontal overflow detected'
    );

    // Every interactive canvas has a visible bounding box and painted pixels
    for (const id of ['ss-sphere-canvas', 'ss-scaling-canvas', 'ss-acuity-canvas', 'ss-acoustics-canvas', 'ss-channel-canvas']) {
      const box = await page.locator(`#${id}`).boundingBox();
      assert.ok(box && box.width > 200 && box.height > 100, `Canvas #${id} collapsed`);
      const hasPixels = await page.evaluate((canvasId) => {
        const c = document.getElementById(canvasId);
        const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        return data.some((v, idx) => idx % 4 !== 3 && v > 25);
      }, id);
      assert.equal(hasPixels, true, `Canvas #${id} appears blank`);
    }

    // Lab 1: prediction + double radius + geodesic subdivision + imperial toggle
    await page.click('[data-predict="4"]');
    assert.ok((await page.textContent('#ss-prediction-feedback')).includes('4×'));

    await page.click('#ss-double');
    assert.ok((await page.textContent('#ss-double-banner')).includes('×4'));
    assert.ok((await page.textContent('#ss-double-banner')).includes('×8'));

    await page.locator('#ss-detail').fill('4');
    await page.locator('#ss-detail').dispatchEvent('input');
    assert.ok((await page.textContent('#ss-mesh-stats')).includes('320 Δ'));

    await page.click('[data-unit="imperial"]');
    assert.ok((await page.textContent('#ss-area')).includes('ft²'));
    await page.click('[data-unit="metric"]');
    assert.ok((await page.textContent('#ss-area')).includes('m²'));

    // Lab 2: fine indoor display reaches <= 1.0 arcmin seamless verdict
    await page.click('[data-display="fine-interior"]');
    assert.ok((await page.textContent('#ss-acuity-verdict')).includes('Seamless'));

    // Lab 3: steered beam off-axis
    await page.click('[data-acoustic-mode="steered"]');
    await page.locator('#ss-steer').fill('30');
    await page.locator('#ss-steer').dispatchEvent('input');
    assert.ok((await page.textContent('#ss-acoustics-caption')).includes('30°'));

    // Lab 4: compare 2x B and 2x S/N
    await page.click('#ss-compare-b');
    await page.click('#ss-compare-snr');
    assert.ok((await page.textContent('#ss-capacity')).includes('Mb/s'));

    // Verify all 5 missions completed
    assert.equal(await page.textContent('#ss-mission-pill'), 'Missions: 5/5');

    // Formula explainer upgraded formula cards
    await page.waitForSelector('.cos-fx-box[data-fx-upgraded]', { state: 'attached', timeout: 5000 });
    const fxCount = await page.locator('.cos-fx-box[data-fx-upgraded]').count();
    assert.ok(fxCount >= 4, `Expected >= 4 upgraded formula boxes, got ${fxCount}`);

    // 6-Question Quiz
    await page.check('input[name="sq1"][value="4-8"]');
    await page.check('input[name="sq2"][value="flat-chord"]');
    await page.check('input[name="sq3"][value="34"]');
    await page.check('input[name="sq4"][value="focus"]');
    await page.check('input[name="sq5"][value="linear-vs-log"]');
    await page.check('input[name="sq6"][value="real-geometry"]');
    await page.click('#ss-check-quiz');
    const quizFeedback = await page.textContent('#ss-quiz-feedback');
    assert.ok(quizFeedback.includes('6/6'), `Expected 6/6 quiz feedback, got: ${quizFeedback}`);

    // Exit ticket reveal toggle
    await page.click('#ss-reveal');
    assert.equal(await page.isVisible('#ss-answer'), true);

    // Mobile viewport overflow check
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    mobilePage.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`mobile console.error: ${msg.text()}`);
    });
    mobilePage.on('pageerror', (err) => errors.push(`mobile pageerror: ${err.message}`));
    await mobilePage.goto(URL, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(250);
    assert.equal(
      await mobilePage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      true,
      'Mobile horizontal overflow detected'
    );

    assert.deepEqual(errors, [], `Browser errors: ${errors.join(' | ')}`);
  } finally {
    await browser.close();
  }
});
