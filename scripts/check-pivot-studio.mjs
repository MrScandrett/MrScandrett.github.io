import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.PIVOT_BASE_URL || 'http://127.0.0.1:8080';
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', error => errors.push(error.message));
const readProject = () => page.evaluate(() => JSON.parse(localStorage.getItem('classroom-pivot-project-v1')));
const frameCount = () => page.locator('.piv-frame-thumb').count();
const editNumber = async (id, value) => { await page.locator(id).fill(String(value)); await page.locator(id).press('Tab'); };

try {
  await page.goto(`${base}/lessons/2d-design/pivot-stick-animator.html`);
  await page.waitForSelector('.piv-frame-thumb');
  assert.equal(await frameCount(), 8);
  assert.equal(await page.locator('#piv-learning').isVisible(), false);
  const stageImage = () => page.locator('#piv-stage-canvas').evaluate(canvas => canvas.toDataURL());
  const withGrid = await stageImage();
  await page.locator('#piv-btn-grid').click();
  assert.notEqual(await stageImage(), withGrid, 'Grid visibly changes the canvas');
  await page.locator('#piv-btn-grid').click();
  await page.locator('[data-frame-idx="1"]').click();
  const withOnion = await stageImage();
  await page.locator('#piv-btn-onion').click();
  assert.notEqual(await stageImage(), withOnion, 'Previous pose remains visible under the current pose');
  await page.locator('#piv-btn-onion').click();
  await page.locator('#piv-btn-new').click();
  assert.equal(await frameCount(), 1);
  await page.locator('#piv-project-name').fill('My first scene');
  await page.locator('#piv-project-name').press('Tab');
  await editNumber('#piv-fig-x', 300);
  assert.equal((await readProject()).doc.frames[0].figures[0].x, 300);
  await page.locator('#piv-stage-canvas').focus();
  await page.keyboard.press('Shift+ArrowRight');
  assert.equal((await readProject()).doc.frames[0].figures[0].x, 310);
  await page.keyboard.press('Control+z');
  assert.equal((await readProject()).doc.frames[0].figures[0].x, 300);
  await page.keyboard.press('Control+Shift+z');
  assert.equal((await readProject()).doc.frames[0].figures[0].x, 310);

  // A drag must use the fitted stage coordinates, including letterboxing.
  const rect = await page.locator('#piv-stage-canvas').boundingBox();
  const scale = Math.min(rect.width / 690, rect.height / 420);
  const x = rect.x + (rect.width - 690 * scale) / 2 + 310 * scale;
  const y = rect.y + (rect.height - 420 * scale) / 2 + 270 * scale;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 40 * scale, y - 20 * scale, { steps: 4 }); await page.mouse.up();
  let project = await readProject();
  assert.ok(Math.abs(project.doc.frames[0].figures[0].x - 350) < 2);
  assert.ok(Math.abs(project.doc.frames[0].figures[0].y - 250) < 2);
  await page.locator('#piv-btn-undo').click();
  assert.equal((await readProject()).doc.frames[0].figures[0].x, 310);

  await page.locator('[data-seg-index="4"]').click();
  const oldAngle = (await readProject()).doc.frames[0].figures[0].angles[6];
  await editNumber('#piv-joint-angle', 45);
  project = await readProject();
  assert.ok(Math.abs(project.doc.frames[0].figures[0].angles[4] - Math.PI / 4) < 0.001);
  assert.notEqual(project.doc.frames[0].figures[0].angles[6], oldAngle, 'Child joint follows its parent');
  await page.locator('#piv-btn-add-stick').click();
  assert.equal(await page.locator('.piv-scene-item').count(), 2);
  await page.locator('[data-figure-index="0"]').click();
  assert.equal(await page.locator('#piv-selection-name').innerText(), 'Stick figure 1');
  await page.locator('#piv-btn-add-frame').click();
  assert.equal(await frameCount(), 2);
  await editNumber('#piv-fig-x', 410);
  await page.locator('#piv-btn-tween').click();
  assert.equal(await frameCount(), 5);
  await page.locator('#piv-btn-undo').click();
  assert.equal(await frameCount(), 2);
  await page.locator('#piv-btn-redo').click();
  assert.equal(await frameCount(), 5);

  await page.locator('#piv-fps-slider').fill('18');
  await page.locator('#piv-fps-slider').dispatchEvent('change');
  await page.locator('#piv-btn-play').click();
  const start = await page.locator('#piv-current-frame').innerText();
  await page.waitForFunction(value => document.getElementById('piv-current-frame').textContent !== value, start);
  await page.locator('#piv-btn-play').click();
  assert.equal(await page.locator('#piv-btn-play').getAttribute('aria-pressed'), 'false');
  await page.reload();
  await page.waitForSelector('.piv-frame-thumb');
  assert.equal(await frameCount(), 5);
  assert.equal(await page.locator('#piv-project-name').inputValue(), 'My first scene');
  assert.equal(await page.locator('#piv-fps-slider').inputValue(), '18');

  const [pivDownload] = await Promise.all([page.waitForEvent('download'), page.locator('#piv-btn-save-piv').click()]);
  assert.equal(pivDownload.suggestedFilename(), 'My-first-scene.piv');
  const pivBytes = [...await fs.readFile(await pivDownload.path())];
  const decoded = await page.evaluate(async bytes => {
    const doc = await window.PivEngine.decodePiv(new Uint8Array(bytes));
    return { frames: doc.frames.length, fps: doc.fps, width: doc.width, figures: doc.frames[0].figures.length };
  }, pivBytes);
  assert.deepEqual(decoded, { frames: 5, fps: 18, width: 690, figures: 2 });
  const [pngDownload] = await Promise.all([page.waitForEvent('download'), page.locator('#piv-btn-export-spritesheet').click()]);
  const png = await sharp(await fs.readFile(await pngDownload.path())).metadata();
  assert.equal(png.width, 5 * 230); assert.equal(png.height, 140); assert.equal(png.hasAlpha, true);
  await page.locator('#piv-file-input').setInputFiles({ name: 'Imported.piv', mimeType: 'application/octet-stream', buffer: Buffer.from(pivBytes) });
  await page.waitForFunction(() => document.getElementById('piv-project-name').value === 'Imported');
  assert.equal(await frameCount(), 5);

  await page.locator('#piv-btn-focus').click();
  assert.ok(await page.locator('#piv-studio-root').evaluate(el => el.classList.contains('is-expanded')));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#piv-btn-focus').getAttribute('aria-pressed'), 'false');
  await page.locator('#piv-view-learn').click();
  assert.equal(await page.locator('#piv-sec-studio').isVisible(), false);
  assert.equal(await page.locator('#piv-learning').isVisible(), true);
  assert.equal(await page.locator('#piv-learning figure:not([data-zoomable])').count(), 0);
  await page.locator('#piv-view-animate').click();
  await page.locator('#piv-preset-select').selectOption('jump');
  assert.equal(await page.locator('#piv-project-name').inputValue(), 'Jump & landing');
  await page.locator('#piv-preset-select').selectOption('piv:../../student-projects/pivotstickfigure/Tatums animation.piv');
  await page.waitForFunction(() => document.getElementById('piv-project-name').value.includes('Tatum'));
  assert.equal(await frameCount(), 9);
  const importedTypes = (await readProject()).doc.types;
  await page.locator('#piv-btn-add-sword').click();
  await page.locator('#piv-btn-add-ball').click();
  assert.deepEqual((await readProject()).doc.types.slice(0, importedTypes.length), importedTypes, 'Adding props preserves imported figure definitions');
  await page.locator('#piv-preset-select').selectOption('piv:../../student-projects/pivotstickfigure/cooper.piv');
  await page.waitForFunction(() => document.getElementById('piv-project-name').value.includes('Cooper'));
  assert.equal(await frameCount(), 443);
  const [longSheet] = await Promise.all([page.waitForEvent('download'), page.locator('#piv-btn-export-spritesheet').click()]);
  const longPng = await sharp(await fs.readFile(await longSheet.path())).metadata();
  assert.ok(longPng.width <= 8192 && longPng.height > 140, 'Long animations export as a grid within browser canvas limits');
  await page.locator('#piv-preset-select').selectOption('walk');
  await page.screenshot({ path: '/tmp/pivot-desktop.png', fullPage: true });

  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() => document.getElementById('piv-stage-canvas').clientWidth > 100);
    assert.ok(await page.evaluate(() => document.querySelector('.ll-sim').scrollWidth <= innerWidth + 1), `No horizontal page overflow at ${width}`);
    const stage = await page.locator('#piv-stage-canvas').boundingBox();
    assert.ok(stage.width > 100 && stage.height > 100);
    if (width === 390) {
      const timeline = await page.locator('.piv-filmstrip-bar').boundingBox();
      const panel = await page.locator('.piv-tool-panel').boundingBox();
      assert.ok(timeline.y < panel.y, 'Mobile timeline appears before property panels');
      await page.screenshot({ path: '/tmp/pivot-mobile.png', fullPage: true });
      await page.locator('#piv-btn-focus').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#piv-btn-focus').getAttribute('aria-pressed'), 'false');
    }
  }
  assert.deepEqual(errors, []);
  console.log('Pivot studio browser checks passed: posing, fitted-stage drag, history, scene selection, tweening, playback, local recovery, file round-trip, sprite export, classroom file, view switching, and responsive layout.');
} finally { await browser.close(); }
