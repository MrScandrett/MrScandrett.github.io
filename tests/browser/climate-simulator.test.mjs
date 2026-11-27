import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

const URL = 'http://127.0.0.1:8080/lessons/earth-science/climate-simulator.html';

test('climate simulator renders WebGL globe, probe, live energy budget, missions, and 2100 chart cleanly', async () => {
  const browser = await chromium.launch({
    executablePath: findChromium(),
    headless: true,
  });

  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#earth-canvas', { state: 'visible' });

    // No raw LaTeX leaked into rendered copy
    const bodyText = await page.evaluate(() => document.body.innerText);
    assert.ok(!bodyText.includes('$F ='), 'Found raw LaTeX $F = in body text');
    assert.ok(!bodyText.includes('\\sigma'), 'Found raw \\sigma in body text');
    assert.ok(!bodyText.includes('\\text{'), 'Found raw \\text{ in body text');

    // No horizontal overflow on desktop
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      true,
      'Desktop horizontal overflow detected'
    );

    // Open the Parameters drawer (lesson-layout starts collapsed by default)
    if (await page.locator('.ll-open-btn').isVisible()) {
      await page.click('.ll-open-btn');
      await page.waitForTimeout(300);
    }
    await page.waitForSelector('#out-temp', { state: 'visible' });

    // Test Ice Age and Business-as-usual presets
    await page.click('[data-preset="iceage"]');
    const iceTemp = await page.textContent('#out-temp');
    assert.ok(iceTemp.startsWith('-'), `Expected negative Ice Age temp, got ${iceTemp}`);

    await page.click('[data-preset="bau"]');
    const bauTemp = await page.textContent('#out-temp');
    assert.ok(parseFloat(bauTemp) >= 3.8, `Expected BAU temp >= 3.8, got ${bauTemp}`);

    // Live Energy Budget updates
    const ebImbalance = await page.textContent('#eb-imbalance');
    assert.ok(ebImbalance.includes('+') && ebImbalance.includes('W/m²'), `Unexpected EB imbalance: ${ebImbalance}`);

    // Switch to Heat Map mode and test Globe HUD controls
    await page.click('.mode-tab[data-mode="temperature"]');
    assert.ok((await page.textContent('#mode-badge')).includes('Heat Map'));

    await page.click('#btn-spin');
    assert.equal(await page.getAttribute('#btn-spin', 'aria-pressed'), 'false');
    await page.click('#btn-lighting');
    assert.equal(await page.getAttribute('#btn-lighting', 'aria-pressed'), 'true');
    await page.click('#btn-labels');
    assert.equal(await page.getAttribute('#btn-labels', 'aria-pressed'), 'false');
    await page.click('#btn-labels');

    // Click-to-Probe Tropics then Arctic
    const canvasBox = await page.locator('#earth-canvas').boundingBox();
    assert.ok(canvasBox && canvasBox.width > 100);

    await page.click('[data-cam="tropics"]');
    await page.waitForTimeout(800);
    await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.waitForSelector('#probe-card:not([hidden])');
    const tropicsCoords = await page.textContent('#probe-coords');
    assert.match(tropicsCoords, /\d+\.\d+°[NS], \d+\.\d+°[EW]/);

    await page.click('[data-cam="arctic"]');
    await page.waitForTimeout(900);
    await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    const arcticCoords = await page.textContent('#probe-coords');
    assert.ok(arcticCoords.includes('°N'), `Expected Arctic °N probe, got ${arcticCoords}`);
    const arcticLat = parseFloat(arcticCoords);
    assert.ok(arcticLat >= 60, `Expected Arctic lat >= 60°N, got ${arcticCoords}`);

    // Enable Coupled Feedback Drift while warming > +1.8°C
    await page.click('#feedback-toggle');
    assert.equal(await page.getAttribute('#feedback-toggle', 'aria-pressed'), 'true');
    await page.waitForTimeout(300);

    // Missions tab tracks progress (>= 3 completed: snowball-earth, arctic-amp, tipping-drift)
    await page.click('.ll-tab[data-pane="cs-pane-missions"]');
    const badge = await page.textContent('#mission-badge');
    const completed = parseInt(badge.split('/')[0], 10);
    assert.ok(completed >= 3, `Expected >= 3 completed missions, got ${badge}`);

    // 2100 comparison chart hover readout
    const chart = page.locator('#climate-p3-chart');
    await chart.scrollIntoViewIfNeeded();
    const chartBox = await chart.boundingBox();
    await page.mouse.move(chartBox.x + chartBox.width * 0.5, chartBox.y + chartBox.height * 0.5);
    const hoverText = await page.textContent('#climate-p3-hover');
    assert.ok(hoverText.includes('Year 20'), `Expected year hover text, got: ${hoverText}`);

    // Mobile viewport overflow check
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    mobilePage.on('console', msg => { if (msg.type() === 'error') errors.push(`mobile console.error: ${msg.text()}`); });
    mobilePage.on('pageerror', err => errors.push(`mobile pageerror: ${err.message}`));
    await mobilePage.goto(URL, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(300);
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
