import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

const URL = 'http://127.0.0.1:8080/lessons/earth-science/pangaea-continental-drift.html';

test('pangaea lesson renders GPlates map, 3D globe, overlays, probe, labs, missions, and quiz cleanly', async () => {
  const browser = await chromium.launch({
    executablePath: findChromium(),
    headless: true
  });

  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#driftMap', { state: 'visible' });
    await page.waitForFunction(() => {
      const loader = document.getElementById('mapLoading');
      return loader && getComputedStyle(loader).display === 'none';
    });

    // No horizontal overflow on desktop
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      true,
      'Desktop horizontal overflow detected'
    );

    // Canvas is rendered with non-empty landmass pixels at 240 Ma
    const snapshot240 = await page.evaluate(() => {
      const c = document.getElementById('driftMap');
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 400) sum += d[i] + d[i + 1] + d[i + 2];
      return sum;
    });
    assert.ok(snapshot240 > 0, 'Expected non-blank canvas at 240 Ma');

    // Toggle Fossil Clues and 0 Ma Outline at 240 Ma
    await page.click('#toggleFossilsBtn');
    assert.equal(await page.getAttribute('#toggleFossilsBtn', 'aria-pressed'), 'true');
    assert.equal(await page.locator('#fossilLegend').isVisible(), true);

    await page.click('#toggleOutlineBtn');
    assert.equal(await page.getAttribute('#toggleOutlineBtn', 'aria-pressed'), 'true');
    assert.equal(await page.locator('#outlineBadge').isVisible(), true);

    // Step to 120 Ma and verify canvas changes + period badge updates
    await page.click('.pd-keyframe-button[data-time="120"]');
    await page.waitForFunction(() => document.getElementById('timeBadge')?.textContent?.trim() === '120 Ma');
    assert.equal(await page.textContent('#periodBadge'), 'Cretaceous');

    const snapshot120 = await page.evaluate(() => {
      const c = document.getElementById('driftMap');
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 400) sum += d[i] + d[i + 1] + d[i + 2];
      return sum;
    });
    assert.notEqual(snapshot120, snapshot240, 'Expected canvas pixels to change from 240 Ma to 120 Ma');

    // Click center of map to probe paleolatitude
    await page.locator('#driftMap').scrollIntoViewIfNeeded();
    const box = await page.locator('#driftMap').boundingBox();
    assert.ok(box && box.width > 200);
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);
    await page.waitForSelector('#probeCard:not([hidden])');
    assert.match(await page.textContent('#probeCoords'), /\d+\.\d+°[NS], \d+\.\d+°[EW]/);

    // Switch to 3D Globe and focus Gondwana
    await page.click('[data-proj="globe"]');
    assert.equal(await page.getAttribute('[data-proj="globe"]', 'aria-pressed'), 'true');
    assert.equal(await page.locator('#camGroup').isVisible(), true);
    await page.click('[data-cam="gondwana"]');
    await page.waitForTimeout(550);

    // Open drawer and check Missions progress
    if (await page.locator('.ll-open-btn').isVisible()) {
      await page.click('.ll-open-btn');
      await page.waitForTimeout(300);
    }
    await page.click('.ll-tab[data-pane="pd-pane-missions"]');
    const badge = await page.textContent('#missionBadge');
    const doneCount = parseInt(badge.split('/')[0], 10);
    assert.ok(doneCount >= 3, `Expected >= 3 completed missions, got ${badge}`);

    // Close drawer before checking interactive labs below
    if (await page.locator('.ll-panel-close').isVisible()) {
      await page.click('.ll-panel-close');
      await page.waitForTimeout(250);
    }

    // Seafloor spreading lab: flip polarity and adjust rate
    await page.locator('#pd-seafloor-lab').scrollIntoViewIfNeeded();
    await page.click('#sfFlipBtn');
    const polText = await page.textContent('#sfPolarity');
    assert.ok(polText.includes('Normal') || polText.includes('Reversed'));

    // Drift speed lab: choose Australia preset
    await page.locator('#pd-speed-lab').scrollIntoViewIfNeeded();
    await page.click('[data-speed-preset="australia"]');
    assert.equal(await page.textContent('#spRateOut'), '7.0 cm/yr');
    assert.equal(await page.textContent('#spDistanceKm'), '7,000 km');

    // Quiz: answer all 5 questions correctly
    await page.locator('#pd-quiz').scrollIntoViewIfNeeded();
    await page.check('input[name="pd-q1"][value="mechanism"]');
    await page.check('input[name="pd-q2"][value="slab-pull"]');
    await page.check('input[name="pd-q3"][value="spreading"]');
    await page.check('input[name="pd-q4"][value="north-first"]');
    await page.check('input[name="pd-q5"][value="5000km"]');
    await page.click('#pd-check-quiz');
    const quizResult = await page.textContent('#pd-quiz-result');
    assert.ok(quizResult.includes('5/5'), `Expected 5/5 quiz score, got ${quizResult}`);

    // Mobile viewport check
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    mobilePage.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`mobile console.error: ${msg.text()}`);
    });
    mobilePage.on('pageerror', (err) => errors.push(`mobile pageerror: ${err.message}`));
    await mobilePage.goto(URL, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(400);
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
