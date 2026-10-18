import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const url = 'http://127.0.0.1:8080/lessons/earth-science/volcano-simulator.html';

test('volcano simulator subterranean magma conduit cutaway graphics, TCMS dynamics, multiphase fluid flow, and exploration plumbing tools work flawlessly', async () => {
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

  // 1. Verify View Mode Switching
  // Switch to Conduit Cutaway (Cross-section view)
  const cutawayBtn = page.locator('button[data-view="cross-section"]');
  assert.ok(await cutawayBtn.isVisible(), 'Conduit Cutaway button should be visible');
  await cutawayBtn.click();
  await page.waitForTimeout(400);

  const conduitOuter = page.locator('#conduit-outer');
  assert.equal(await conduitOuter.evaluate(el => window.getComputedStyle(el).display), 'flex', 'Conduit outer should be displayed in cross-section view');

  // 2. Verify Subsurface Conduit HUD Telemetry
  const depthEl = page.locator('#hud-chamber-depth');
  const volEl = page.locator('#hud-magma-vol');
  const meltEl = page.locator('#hud-melt-vol');
  const stressEl = page.locator('#hud-overpressure');
  const buoyEl = page.locator('#hud-buoyancy');
  const fluxEl = page.locator('#hud-conduit-flux');
  const velEl = page.locator('#hud-conduit-vel');

  assert.ok(await depthEl.isVisible(), 'Chamber depth should be visible');
  assert.ok(await volEl.isVisible(), 'Reservoir volume should be visible');
  assert.ok(await meltEl.isVisible(), 'Melt volume should be visible');
  assert.ok(await stressEl.isVisible(), 'Lithostatic stress should be visible');
  assert.ok(await buoyEl.isVisible(), 'Buoyancy stress should be visible');
  assert.ok(await fluxEl.isVisible(), 'Ascent flux should be visible');
  assert.ok(await velEl.isVisible(), 'Exit velocity should be visible');

  const depthText = await depthEl.textContent();
  assert.ok(depthText.includes('km'), `Depth should contain km, got: ${depthText}`);

  // 3. Test 1:1 True Scale Toggle
  const scaleBtn = page.locator('#cutaway-true-scale');
  assert.equal(await scaleBtn.getAttribute('aria-pressed'), 'false');
  await scaleBtn.click();
  await page.waitForTimeout(300);
  assert.equal(await scaleBtn.getAttribute('aria-pressed'), 'true');
  await scaleBtn.click();
  await page.waitForTimeout(300);
  assert.equal(await scaleBtn.getAttribute('aria-pressed'), 'false');

  // 4. Test Historical Eruption Presets in Cutaway View
  await page.click('#btn-open-left');
  // Test Mount St. Helens 1980 (Cryptodome & lateral blast)
  await page.click('#panel-left button[data-tab="tab-presets"]');
  await page.waitForTimeout(200);
  await page.click('.ev-card[data-id="sthelenr1980"]');
  await page.waitForTimeout(400);
  assert.ok((await depthEl.textContent()).includes('km'), 'St Helens should update depth');

  // Test Eyjafjallajökull 2010 (Glacial ice cap & mid-crustal sills)
  await page.click('.ev-card[data-id="eyja2010"]');
  await page.waitForTimeout(400);
  assert.ok((await depthEl.textContent()).includes('km'), 'Eyjafjallajökull should update depth');

  // Test Mauna Loa 2022 (Shield rift zone dike)
  await page.click('.ev-card[data-id="maunaloa2022"]');
  await page.waitForTimeout(400);

  // Test Yellowstone Supervolcano (Bimodal TCMS)
  await page.click('.preset-filter-chip[data-filter="all"]');
  await page.click('.ev-card[data-id="yellowstone"]');
  await page.waitForTimeout(400);

  // Return to Mount Vesuvius 79 AD
  await page.click('.ev-card[data-id="vesuvius79"]');
  await page.waitForTimeout(400);

  // 5. Advance timeline and verify live multiphase fluid telemetry
  await page.locator('#btn-tl-next').dispatchEvent('click');
  await page.waitForTimeout(200);
  await page.locator('#btn-tl-next').dispatchEvent('click');
  await page.waitForTimeout(200);
  await page.locator('#btn-tl-next').dispatchEvent('click'); // Phase 4: Plinian & PDC
  await page.waitForTimeout(400);

  const activeFlux = await fluxEl.textContent();
  const activeVel = await velEl.textContent();
  assert.ok(activeFlux.includes('t/s'), `Ascent flux should include t/s, got: ${activeFlux}`);
  assert.ok(activeVel.includes('m/s'), `Exit velocity should include m/s, got: ${activeVel}`);

  // 6. Test Dual Coupled View (Split View)
  const splitBtn = page.locator('button[data-view="split"]');
  await splitBtn.click();
  await page.waitForTimeout(400);
  assert.ok((await page.locator('.vol-workspace').getAttribute('class'))?.includes('view-split'), 'Workspace should have view-split class');
  assert.equal(await conduitOuter.evaluate(el => window.getComputedStyle(el).display), 'flex', 'Conduit outer should be displayed in split view');

  // 7. Test Exploration Mode Plumbing Painting Tools
  await page.selectOption('#eruption-mode', 'exploration');
  await page.waitForTimeout(300);

  const conduitToolbar = page.locator('#conduit-toolbar');
  assert.equal(await conduitToolbar.evaluate(el => window.getComputedStyle(el).display), 'flex', 'Conduit toolbar should be visible in exploration mode');

  // Switch tools: feeder dike, sill, aquifer, bedrock eraser
  await page.locator('.c-tool-btn[data-tool="conduit"]').dispatchEvent('click');
  assert.ok((await page.locator('.c-tool-btn[data-tool="conduit"]').getAttribute('class'))?.includes('active'));

  await page.locator('.c-tool-btn[data-tool="sill"]').dispatchEvent('click');
  assert.ok((await page.locator('.c-tool-btn[data-tool="sill"]').getAttribute('class'))?.includes('active'));

  await page.locator('.c-tool-btn[data-tool="aquifer"]').dispatchEvent('click');
  assert.ok((await page.locator('.c-tool-btn[data-tool="aquifer"]').getAttribute('class'))?.includes('active'));

  await page.locator('.c-tool-btn[data-tool="chamber"]').dispatchEvent('click');
  assert.ok((await page.locator('.c-tool-btn[data-tool="chamber"]').getAttribute('class'))?.includes('active'));

  // Brush sizes
  await page.locator('.c-brush-btn[data-size="1.2"]').dispatchEvent('click');
  assert.ok((await page.locator('.c-brush-btn[data-size="1.2"]').getAttribute('class'))?.includes('active'));

  // Test Baseline reset
  await page.locator('#btn-conduit-reset').dispatchEvent('click');
  await page.waitForTimeout(200);

  // Return to Surface view
  await page.click('button[data-view="surface"]');
  await page.waitForTimeout(300);
  assert.equal(await conduitOuter.evaluate(el => window.getComputedStyle(el).display), 'none', 'Conduit outer should be hidden in surface view');

  // 8. Ensure clean execution with zero errors
  assert.deepEqual(errors, []);

  } finally {
    await browser.close();
  }
});
