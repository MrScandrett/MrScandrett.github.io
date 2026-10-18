import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const url = 'http://127.0.0.1:8080/lessons/earth-science/volcano-simulator.html';
const scratchDir = '/home/evanscandrett/.gemini/antigravity/brain/12c7dc81-26ff-45e6-a46c-b68e2bd66a7b/scratch';

test('volcano simulator modern HUD, telemetry ribbon, camera director, and mission control transport work reliably', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#vol-canvas');
  await page.waitForTimeout(1000);

  // 1. Verify Telemetry Ribbon HUD elements exist and contain valid text
  const mdrVal = await page.locator('#hud-telem-mdr').textContent();
  const volVal = await page.locator('#hud-telem-vol').textContent();
  const colVal = await page.locator('#hud-telem-col').textContent();
  const tempVal = await page.locator('#hud-telem-temp').textContent();
  const hazardVal = await page.locator('#hud-telem-hazard').textContent();

  assert.ok(mdrVal && mdrVal.length > 0, 'MDR text should be populated');
  assert.ok(volVal && volVal.length > 0, 'Volume text should be populated');
  assert.ok(colVal && colVal.includes('km'), 'Plume altitude should include km');
  assert.ok(tempVal && tempVal.includes('°C'), 'Magma temperature should include °C');
  assert.ok(hazardVal && hazardVal.length > 0, 'Hazard status should be populated');

  await page.screenshot({ path: `${scratchDir}/01-initial-hud.png` });

  // 2. Verify Camera Director Toolbar
  await page.click('button[data-cam="vent"]');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('button[data-cam="vent"]').getAttribute('class'), 'cam-btn active');

  await page.click('button[data-cam="flank"]');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('button[data-cam="flank"]').getAttribute('class'), 'cam-btn active');

  await page.click('button[data-cam="plume"]');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('button[data-cam="plume"]').getAttribute('class'), 'cam-btn active');

  await page.click('button[data-cam="orbit"]');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('button[data-cam="orbit"]').getAttribute('class'), 'cam-btn active');

  // Toggle Auto-spin
  await page.click('#btn-cam-spin');
  assert.ok(!(await page.locator('#btn-cam-spin').getAttribute('class'))?.includes('active'), 'Auto spin should toggle off');
  await page.click('#btn-cam-spin');
  assert.ok((await page.locator('#btn-cam-spin').getAttribute('class'))?.includes('active'), 'Auto spin should toggle on');

  // 3. Verify Timeline Transport Playback & Controls
  const playBtn = page.locator('#btn-tl-play');
  assert.equal(await playBtn.textContent(), '▶');

  // Start play
  await playBtn.click();
  await page.waitForTimeout(100);
  assert.ok((await playBtn.getAttribute('class'))?.includes('playing'));
  assert.equal(await playBtn.textContent(), '⏸');

  // Wait 1.5 seconds for playback progression
  await page.waitForTimeout(1500);

  // Check timeline slider moved forward
  const tlValue = parseFloat(await page.locator('#s-timeline').inputValue());
  assert.ok(tlValue > 0.0, `Timeline should have advanced, but was ${tlValue}`);

  // Pause playback
  await playBtn.click();
  assert.equal(await playBtn.textContent(), '▶');

  await page.screenshot({ path: `${scratchDir}/02-playing-telemetry.png` });

  // Test Next Phase button
  const prevPhase = await page.locator('#tl-phase-pill').textContent();
  await page.click('#btn-tl-next');
  await page.waitForTimeout(200);
  const nextPhase = await page.locator('#tl-phase-pill').textContent();
  assert.ok(nextPhase && nextPhase.length > 0);

  // Test Milestone Pips
  const pips = page.locator('.tl-pip');
  const pipCount = await pips.count();
  assert.ok(pipCount >= 3, `Expected at least 3 phase pips, got ${pipCount}`);
  await pips.nth(pipCount - 1).click();
  await page.waitForTimeout(200);
  const endPhase = await page.locator('#tl-phase-pill').textContent();
  assert.ok(endPhase.includes(String(pipCount)), `Expected last phase indicator, got ${endPhase}`);

  // Test Reset button
  await page.click('#btn-tl-reset');
  await page.waitForTimeout(200);
  const resetValue = parseFloat(await page.locator('#s-timeline').inputValue());
  assert.equal(resetValue, 0.0, 'Timeline should reset to 0');

  // Test Speed Chips
  await page.click('.tl-speed-chip[data-speed="2"]');
  assert.ok((await page.locator('.tl-speed-chip[data-speed="2"]').getAttribute('class'))?.includes('active'));

  // 4. Verify Drawer Tabs & Collapsing
  // Left Panel: switch to Evidence tab
  await page.click('#panel-left button[data-tab="tab-evidence"]');
  assert.ok(await page.locator('#tab-evidence').isVisible());
  assert.ok(!(await page.locator('#tab-presets').isVisible()));

  // Switch back to Presets tab
  await page.click('#panel-left button[data-tab="tab-presets"]');
  assert.ok(await page.locator('#tab-presets').isVisible());

  // Filter presets chip
  await page.click('.preset-filter-chip[data-filter="effusive"]');
  const visibleCards = await page.locator('.ev-card:not([hidden])').count();
  assert.ok(visibleCards > 0 && visibleCards < 7, 'Filter should reduce visible card count');
  await page.click('.preset-filter-chip[data-filter="all"]');

  // Collapse Left Panel
  await page.click('#btn-close-left');
  await page.waitForTimeout(300);
  assert.ok((await page.locator('#panel-left').getAttribute('class'))?.includes('collapsed'));
  assert.ok((await page.locator('#btn-open-left').getAttribute('class'))?.includes('visible'));

  // Re-open Left Panel via launcher
  await page.click('#btn-open-left');
  await page.waitForTimeout(300);
  assert.ok(!(await page.locator('#panel-left').getAttribute('class'))?.includes('collapsed'));

  // Right Panel: switch to Plumbing tab
  await page.click('#panel-right button[data-tab="tab-plumbing"]');
  assert.ok(await page.locator('#tab-plumbing').isVisible());

  // Switch to Metrics tab
  await page.click('#panel-right button[data-tab="tab-readouts"]');
  assert.ok(await page.locator('#tab-readouts').isVisible());

  // Collapse Right Panel
  await page.click('#btn-close-right');
  await page.waitForTimeout(300);
  assert.ok((await page.locator('#panel-right').getAttribute('class'))?.includes('collapsed'));
  assert.ok((await page.locator('#btn-open-right').getAttribute('class'))?.includes('visible'));

  // Re-open Right Panel
  await page.click('#btn-open-right');
  await page.waitForTimeout(300);
  assert.ok(!(await page.locator('#panel-right').getAttribute('class'))?.includes('collapsed'));

  // 5. Clean View Toggle
  await page.click('#btn-clean-view');
  await page.waitForTimeout(200);
  assert.ok((await page.locator('.vol-workspace').getAttribute('class'))?.includes('hud-hidden'));
  await page.screenshot({ path: `${scratchDir}/03-clean-view.png` });

  await page.click('#btn-clean-view');
  await page.waitForTimeout(200);
  assert.ok(!(await page.locator('.vol-workspace').getAttribute('class'))?.includes('hud-hidden'));

  // 6. Dual Coupled View (Split) mode
  await page.click('button[data-view="split"]');
  await page.waitForTimeout(500);
  assert.ok((await page.locator('.vol-workspace').getAttribute('class'))?.includes('view-split'));
  // Panels should auto-collapse in split mode to leave view uncluttered
  assert.ok((await page.locator('#panel-left').getAttribute('class'))?.includes('collapsed'), 'Left panel should auto-collapse in split view');
  assert.ok((await page.locator('#panel-right').getAttribute('class'))?.includes('collapsed'), 'Right panel should auto-collapse in split view');

  await page.screenshot({ path: `${scratchDir}/04-split-view-modern-hud.png` });

  // Return to Surface view
  await page.click('button[data-view="surface"]');
  await page.waitForTimeout(300);
  assert.ok(!(await page.locator('.vol-workspace').getAttribute('class'))?.includes('view-split'));

  // Ensure zero console or page errors
  assert.deepEqual(errors, []);

  await browser.close();
});

