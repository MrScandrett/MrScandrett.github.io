import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const url = 'http://127.0.0.1:8080/lessons/life-sciences/crispr-synthetic-biology.html';

test('CRISPR & Synthetic Biology lab loads with breadcrumbs, lightbox figures, and no errors', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(url, { waitUntil: 'networkidle' });

  // 1. Verify breadcrumbs
  const breadcrumb = page.locator('.ll-breadcrumb');
  assert.ok(await breadcrumb.isVisible());
  assert.match(await breadcrumb.textContent(), /Home/);
  assert.match(await breadcrumb.textContent(), /Life Sciences/);
  assert.match(await breadcrumb.textContent(), /CRISPR & Synthetic Biology/);

  // 2. Verify all figures have zoomable lightbox attributes
  const figures = await page.locator('figure').all();
  assert.ok(figures.length >= 3);
  for (const fig of figures) {
    const zoomable = await fig.getAttribute('data-zoomable');
    const group = await fig.getAttribute('data-lightbox-group');
    assert.notEqual(zoomable, null, 'Figure must have data-zoomable');
    assert.equal(group, 'crispr-lab', 'Figure must belong to crispr-lab group');
  }

  // 3. Test interactive Guide RNA tiles
  const tiles = page.locator('#guideTiles span');
  assert.equal(await tiles.count(), 12);
  
  // Click matching guide button
  await page.locator('#matchBtn').click();
  assert.equal(await page.locator('#guideInput').inputValue(), 'AUGCCAUAGCUA');
  assert.match(await page.locator('#pairingStatus').textContent(), /12 of 12/);

  // Click first tile to cycle base
  await tiles.first().click();
  // 'A' cycles to 'U'
  assert.equal(await page.locator('#guideInput').inputValue(), 'UUGCCAUAGCUA');
  assert.match(await page.locator('#pairingStatus').textContent(), /11 of 12/);

  // Restore match and check recognition
  await page.locator('#matchBtn').click();
  await page.locator('#recognizeBtn').click();
  assert.match(await page.locator('#recognitionFeedback').textContent(), /Recognition successful/);

  // 4. Test Cleavage & Repair Simulation Stages
  const stepBtn = page.locator('#stepBtn');
  assert.equal(await stepBtn.isEnabled(), true);
  
  // Advance to Stage 1 (Recognition)
  await stepBtn.click();
  assert.match(await page.locator('#stageCaption').textContent(), /Stage 1/);

  // Advance to Stage 2 (Cleavage)
  await stepBtn.click();
  assert.match(await page.locator('#stageCaption').textContent(), /Stage 2/);

  // Advance to Stage 3 (Repair)
  await stepBtn.click();
  assert.match(await page.locator('#stageCaption').textContent(), /Cellular repair outcome/);
  assert.match(await page.locator('#sequenceEvidence').textContent(), /Wild-type/);

  // 5. Test Circuit & Dishes Controls
  const lightBtn = page.locator('#lightBtn');
  assert.equal(await lightBtn.getAttribute('aria-pressed'), 'false');
  await lightBtn.click();
  assert.equal(await lightBtn.getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#dishStatus').textContent(), /Control: Green fluorescence/);

  // Record observation
  await page.locator('#recordBtn').click();
  const rows = await page.locator('#observations tr').all();
  assert.ok(rows.length >= 1);
  assert.equal(await page.locator('#exportBtn').isEnabled(), true);
  assert.equal(await page.locator('#copyBtn').isEnabled(), true);

  // 6. Test Multi-Question Checkpoint
  const quizTabs = page.locator('.cr-quiz-tab');
  assert.equal(await quizTabs.count(), 4);

  // Question 1: select correct option B
  await page.locator('input[value="b"]').check();
  const feedback = page.locator('#quizFeedback');
  assert.ok(await feedback.isVisible());
  assert.match(await feedback.textContent(), /Correct/);

  // Switch to Question 2
  await quizTabs.nth(1).click();
  assert.match(await page.locator('#quizTitle').textContent(), /PAM/);

  // Select correct option A for Question 2
  await page.locator('input[value="a"]').check();
  assert.match(await feedback.textContent(), /Correct/);

  assert.deepEqual(errors, []);
  await browser.close();
});

