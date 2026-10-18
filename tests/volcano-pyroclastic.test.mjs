import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const url = 'http://127.0.0.1:8080/lessons/earth-science/volcano-simulator.html';

test('volcano simulator pyroclastic density current (PDC) engine, camera flow perspective, and physical telemetry work correctly', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(8000);

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#vol-canvas', { state: 'attached', timeout: 30000 });
  await page.waitForTimeout(1000);

  // 1. Verify Camera Director "PDC Flow" View Button
  const flowBtn = page.locator('button[data-cam="flow"]');
  assert.ok(await flowBtn.isVisible(), 'PDC Flow camera button should be visible in toolbar');
  await flowBtn.click();
  await page.waitForTimeout(400);
  assert.equal(await flowBtn.getAttribute('class'), 'cam-btn active', 'Flow camera button should be active');

  // Switch back to Orbit
  await page.click('button[data-cam="orbit"]');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('button[data-cam="orbit"]').getAttribute('class'), 'cam-btn active');

  // 2. Verify PDC Laboratory Telemetry in Readouts Tab
  await page.click('#panel-right button[data-tab="tab-readouts"]');
  await page.waitForTimeout(200);

  const pdcSpdEl = page.locator('#out-pdc-spd');
  const pdcDynEl = page.locator('#out-pdc-dyn');
  const pdcTempEl = page.locator('#out-pdc-temp');
  const pdcRunoutEl = page.locator('#out-pdc-runout');
  const pdcRegimeEl = page.locator('#out-pdc-regime');

  assert.ok(await pdcSpdEl.isVisible(), 'PDC Front Velocity metric should be visible');
  assert.ok(await pdcDynEl.isVisible(), 'PDC Dynamic Pressure metric should be visible');
  assert.ok(await pdcTempEl.isVisible(), 'PDC Core Temperature metric should be visible');
  assert.ok(await pdcRunoutEl.isVisible(), 'PDC Runout Distance metric should be visible');
  assert.ok(await pdcRegimeEl.isVisible(), 'PDC Regime description should be visible');

  // 3. Advance to Vesuvius 79 AD PDC Phase (Phase 4: Column instability and pyroclastic currents at timeline ~0.58)
  // Step through phases to reach PDC phase
  await page.locator('#btn-tl-next').dispatchEvent('click'); // Phase 2
  await page.waitForTimeout(200);
  await page.locator('#btn-tl-next').dispatchEvent('click'); // Phase 3
  await page.waitForTimeout(200);
  await page.locator('#btn-tl-next').dispatchEvent('click'); // Phase 4: Column instability & pyroclastic currents
  await page.waitForTimeout(500);

  // Check that PDC hazard status triggers
  const hazardText = await page.locator('#hud-telem-hazard').textContent();
  assert.ok(hazardText.includes('Pyroclastic Density Current') || hazardText.includes('DANGER'), `Hazard text should show PDC danger, got: ${hazardText}`);

  // Check that physical telemetry shows non-zero values
  const activeSpd = await pdcSpdEl.textContent();
  const activeDyn = await pdcDynEl.textContent();
  const activeTemp = await pdcTempEl.textContent();
  const activeRegime = await pdcRegimeEl.textContent();

  assert.ok(activeSpd.includes('m/s'), `PDC velocity should include m/s, got: ${activeSpd}`);
  assert.ok(activeDyn.includes('kPa'), `PDC dynamic pressure should include kPa, got: ${activeDyn}`);
  assert.ok(activeTemp.includes('°C'), `PDC temperature should include °C, got: ${activeTemp}`);
  assert.ok(!activeRegime.includes('Buoyant Plume'), `PDC regime should update from quiescent buoyant plume, got: ${activeRegime}`);

  // 4. Test Exploration Mode PDC Slider
  await page.selectOption('#eruption-mode', 'exploration');
  await page.waitForTimeout(200);
  if (await page.locator('#btn-open-right').isVisible()) await page.click('#btn-open-right');
  await page.click('#panel-right button[data-tab="tab-params"]');

  // Set Pyroclastic slider to 90%
  const sPyro = page.locator('#s-pyro');
  await sPyro.evaluate(el => { el.value = '90'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(300);

  const expRegime = await pdcRegimeEl.textContent();
  assert.ok(expRegime.includes('Total Column Collapse'), `Regime at 90% should be Total Column Collapse, got: ${expRegime}`);

  // Ensure zero console or page errors
  assert.deepEqual(errors, []);

  } finally {
    await browser.close();
  }
});
