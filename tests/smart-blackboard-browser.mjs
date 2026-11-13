import { chooseShape, openControls } from './helpers/blackboard-studio.mjs';
// Run with the local server: node tests/smart-blackboard-browser.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8080/lessons/mathematics/geometry-and-trigonometry/smart-blackboard.html');
  await page.waitForSelector('.math-lesson-guide');
  assert.equal(await page.locator('main > section').first().getAttribute('id'), 'smart-blackboard-app');
  const setSlider = (id, value) => page.locator(id).evaluate((el, value) => { el.value = value; el.dispatchEvent(new Event('input')); }, value);
  for (const shape of ['cyl', 'cone', 'prism']) {
    await chooseShape(page, '3d-' + shape);
    const closed = await page.locator('#three-canvas').screenshot();
    await setSlider('#unfold-slider', 50);
    const halfway = await page.locator('#three-canvas').screenshot();
    await setSlider('#unfold-slider', 100);
    const flat = await page.locator('#three-canvas').screenshot();
    assert.ok(!closed.equals(halfway) && !halfway.equals(flat), `${shape} must render a changing surface`);
    assert.equal(await page.locator('#slice-slider').isVisible(), false);
    if (shape === 'cone') assert.match(await page.locator('#val-m2').textContent(), /171\.5°/);
    await setSlider('#unfold-slider', 0);
    assert.equal(await page.locator('#slice-slider').isVisible(), shape !== 'prism');
  }
  await chooseShape(page, '3d-cyl');
  await setSlider('#slice-slider', -100);
  const bottomArea = await page.locator('#val-m3').textContent();
  await setSlider('#slice-slider', 100);
  assert.equal(await page.locator('#val-m3').textContent(), bottomArea);
  await chooseShape(page, '3d-cone');
  await setSlider('#slice-slider', 100);
  assert.match(await page.locator('#val-m2').textContent(), /0\.00 cm \/ 0\.00 cm²/);
  await chooseShape(page, '3d-sphere');
  await setSlider('#slice-slider', 100);
  assert.equal(await page.locator('#val-m2').textContent(), '0.00 cm²');
  await chooseShape(page, '3d-cube');
  assert.equal(await page.locator('#slice-slider').isVisible(), false);
  await openControls(page, 'practice');
  await page.selectOption('#investigation', 'triangle');
  await page.locator('#investigation-check').click();
  assert.match(await page.locator('#investigation-feedback').textContent(), /Enter a numerical/);
  await page.locator('#investigation-answer').fill('5');
  await page.locator('#investigation-check').click();
  assert.match(await page.locator('#investigation-feedback').textContent(), /Subtract/);
  await page.locator('#investigation-answer').fill('3');
  await page.locator('#investigation-check').click();
  assert.match(await page.locator('#investigation-feedback').textContent(), /Correct/);
  await page.locator('#investigation-reason').fill('Subtract the extra triangle.');
  await page.locator('#investigation-explore').click();
  assert.equal(await page.locator('#val-m2').textContent(), '3.00 cm²');
  assert.match(await page.locator('#ai-step-text').textContent(), /Subtract the smaller/);
  assert.equal(await page.locator('#ai-step-card').getAttribute('open'), null);
  await page.selectOption('#investigation', 'cyl');
  await page.selectOption('#investigation', 'triangle');
  assert.equal(await page.locator('#investigation-reason').inputValue(), 'Subtract the extra triangle.');
  await page.evaluate(() => {
    document.getElementById('in-side-a').value = '5';
    document.getElementById('in-side-b').value = '4';
    const c = document.getElementById('in-side-c');
    c.value = '3'; c.dispatchEvent(new Event('change'));
  });
  assert.match(await page.locator('#ai-step-text').textContent(), /already right-angled/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile layout must not overflow');
  assert.deepEqual(errors, []);
  console.log('Smart Blackboard browser checks passed: live nets, slices, investigations, app order, mobile layout.');
} finally {
  await browser.close();
}
