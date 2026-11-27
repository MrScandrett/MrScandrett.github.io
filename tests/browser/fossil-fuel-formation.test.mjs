import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

const URL = 'http://127.0.0.1:8080/lessons/earth-science/fossil-fuel-formation.html';

test('fossil fuel lesson renders all interactive labs, missions, and 6-question quiz cleanly', async () => {
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
    await page.waitForSelector('#basinCanvas', { state: 'visible' });

    // Check zero horizontal overflow on desktop
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      true,
      'Desktop horizontal overflow detected'
    );

    // Check Basin canvas has non-zero bounding box and painted pixels
    const basinBox = await page.locator('#basinCanvas').boundingBox();
    assert.ok(basinBox && basinBox.width > 200 && basinBox.height > 200);
    const hasBasinPixels = await page.evaluate(() => {
      const c = document.getElementById('basinCanvas');
      const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      return data.some((v, idx) => idx % 4 !== 3 && v > 25);
    });
    assert.equal(hasBasinPixels, true, 'Basin canvas appears blank');

    // Trigger Peak Oil, Anthracite, Overcooked, and Gradient Shift missions via scenario buttons
    await page.click('[data-scenario="peak-oil"]');
    assert.ok((await page.textContent('#readoutStage')).includes('Oil'));

    await page.click('[data-scenario="anthracite-fold"]');
    assert.ok((await page.textContent('#readoutStage')).includes('Anthracite'));

    await page.click('[data-scenario="hot-rift-oil"]');
    await page.click('[data-scenario="overcooked-graphite"]');
    assert.ok((await page.textContent('#readoutStage')).includes('Overcooked'));

    // Check Coal 10m Squeeze Inspector updates
    await page.click('.coal-tab[data-rank="anthracite"]');
    assert.equal(await page.textContent('#squeezeHeight'), '0.7 m');
    assert.equal(await page.textContent('#coalCarbonVal'), '94%');

    // Test Petroleum Trap Explorer: switch traps, fracture caprock, restore, and drill oil
    await page.click('[data-trap="salt-dome"]');
    assert.ok((await page.textContent('#wellLogTitle')).includes('Crude Oil'));

    await page.click('#trapSealBtn');
    assert.ok((await page.textContent('#wellLogTitle')).includes('Depleted'));

    await page.click('#trapSealBtn');
    assert.ok((await page.textContent('#wellLogTitle')).includes('Crude Oil'));

    // Verify all 5 missions completed
    assert.equal(await page.textContent('#missionCounterPill'), 'Missions: 5/5');

    // Deep-Time slider updates ratio
    await page.locator('#tsFormation').fill('150');
    await page.locator('#tsFormation').dispatchEvent('input');
    assert.equal(await page.textContent('#tsRatio'), '600,000×');

    // 6-Question Quiz
    await page.check('input[name="fq1"][value="burial"]');
    await page.check('input[name="fq2"][value="plankton"]');
    await page.check('input[name="fq3"][value="anthracite"]');
    await page.check('input[name="fq4"][value="rift"]');
    await page.check('input[name="fq5"][value="buoyancy"]');
    await page.check('input[name="fq6"][value="overcooked"]');
    await page.click('#checkAnswers');
    const feedback = await page.textContent('#quizFeedback');
    assert.ok(feedback.includes('6/6'), `Expected 6/6 quiz feedback, got: ${feedback}`);

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
