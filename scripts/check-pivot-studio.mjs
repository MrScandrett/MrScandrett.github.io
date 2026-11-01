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

  // Practice problem checks, Enter key submission, and score bar
  await page.locator('#flans-1').selectOption('hip');
  await page.locator('#flans-1').locator('xpath=ancestor::div[contains(@class,"fl-problem-row")]//button').click();
  assert.equal(await page.locator('#flfb-1').innerText(), '✓ Correct!');

  await page.locator('#flans-2').fill('240');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#flfb-2').innerText(), '✓ Correct!');
  assert.equal(await page.locator('#piv-practice-score').innerText(), '2 / 5');

  await page.locator('#flans-3').selectOption('follow');
  await page.locator('#flans-3').locator('xpath=ancestor::div[contains(@class,"fl-problem-row")]//button').click();
  assert.equal(await page.locator('#flfb-3').innerText(), '✓ Correct!');

  await page.locator('#flans-4').fill('2');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#flfb-4').innerText(), '✓ Correct!');

  await page.locator('#flans-5').selectOption('base');
  await page.locator('#flans-5').locator('xpath=ancestor::div[contains(@class,"fl-problem-row")]//button').click();
  assert.equal(await page.locator('#flfb-5').innerText(), '✓ Correct!');
  assert.equal(await page.locator('#piv-practice-score').innerText(), '5 / 5');

  // Return to Animation Studio via step nav link
  await page.locator('.ll-lesson-steps a[href="#piv-sec-studio"]').click();
  assert.equal(await page.locator('#piv-sec-studio').isVisible(), true);
  assert.equal(await page.locator('#piv-learning').isVisible(), false);
  assert.ok(await page.locator('#piv-stage-canvas').getAttribute('aria-label').then(l => l.includes('Frame 1 of 5')));
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

  // Duplicate/layer figures, and keep the grabbed point stable during a root drag.
  await page.locator('#piv-btn-new').click();
  await editNumber('#piv-fig-x', 100);
  await page.locator('#piv-btn-duplicate-fig').click();
  project = await readProject();
  assert.equal(project.doc.frames[0].figures.length, 2);
  const characterId = project.doc.frames[0].figures[1].id;
  assert.notEqual(characterId, project.doc.frames[0].figures[0].id);
  await editNumber('#piv-fig-x', 100);
  await page.locator('#piv-btn-send-back').click();
  assert.deepEqual((await readProject()).doc.frames[0].order, [1, 0]);
  assert.equal(await page.locator('#piv-btn-send-back').isDisabled(), true);
  const fitted = await page.locator('#piv-stage-canvas').boundingBox();
  const fitScale = Math.min(fitted.width / 690, fitted.height / 420);
  const rootX = fitted.x + (fitted.width - 690 * fitScale) / 2 + 100 * fitScale;
  const rootY = fitted.y + (fitted.height - 420 * fitScale) / 2 + 270 * fitScale;
  await page.mouse.move(rootX + 4 * fitScale, rootY); await page.mouse.down();
  await page.mouse.move(rootX + 24 * fitScale, rootY, { steps: 3 }); await page.mouse.up();
  project = await readProject();
  assert.ok(Math.abs(project.doc.frames[0].figures[0].x - 120) < 1, 'Frontmost figure moves by drag distance without snapping to the pointer');
  assert.equal(project.doc.frames[0].figures[1].x, 100);
  assert.equal(await page.locator('#piv-selection-name').innerText(), 'Stick figure 1');
  await editNumber('#piv-fig-x', 100);
  await page.locator('[data-figure-index="1"]').click();
  await editNumber('#piv-fig-x', 400);
  await page.locator('#piv-btn-add-frame').click();
  await editNumber('#piv-fig-x', 500);
  await page.locator('[data-figure-index="0"]').click();
  await page.locator('#piv-btn-del-fig').click();
  await page.locator('#piv-tween-count').fill('1');
  await page.locator('#piv-btn-tween').click();
  project = await readProject();
  assert.equal(project.doc.frames.length, 3);
  assert.equal(project.doc.frames[1].figures.find(f => f.id === characterId).x, 450, 'Tween matches identity after a figure is removed');
  assert.equal(project.doc.frames[1].figures[0].x, 100, 'Unmatched figure holds until destination keyframe');
  await page.locator('#piv-btn-undo').click();
  assert.equal(await frameCount(), 2);
  assert.equal(await page.locator('#piv-current-frame').innerText(), '2', 'Undo restores the edited keyframe');
  await page.locator('#piv-btn-redo').click();
  assert.equal(await frameCount(), 3);
  await page.locator('#piv-btn-undo').click();
  await page.locator('#piv-tween-count').fill('3');
  for (const [easing, expected] of [['ease-in', 406.25], ['ease-out', 443.75], ['ease-in-out', 415.625]]) {
    await page.locator('#piv-tween-easing').selectOption(easing);
    await page.locator('#piv-btn-tween').click();
    project = await readProject();
    assert.equal(project.doc.frames.length, 5);
    assert.equal(project.doc.frames[1].figures.find(f => f.id === characterId).x, expected, `${easing} changes spacing`);
    await page.locator('#piv-btn-undo').click();
  }

  // Reordering keeps the current pose selected; copy/paste inserts independent poses.
  await page.locator('#piv-btn-frame-earlier').click();
  assert.equal((await readProject()).doc.frames[0].figures[0].x, 500);
  assert.equal(await page.locator('#piv-current-frame').innerText(), '1');
  assert.equal(await page.locator('#piv-btn-frame-earlier').isDisabled(), true);
  await page.locator('#piv-btn-undo').click();
  assert.equal(await page.locator('#piv-current-frame').innerText(), '2');
  await page.locator('#piv-btn-frame-earlier').click();
  await page.locator('#piv-btn-frame-later').click();
  await page.locator('#piv-stage-canvas').focus();
  await page.keyboard.press('Control+c');
  await page.locator('[data-frame-idx="0"]').click();
  await page.keyboard.press('Control+v');
  assert.equal(await frameCount(), 3);
  await editNumber('#piv-fig-x', 480);
  project = await readProject();
  assert.equal(project.doc.frames[1].figures[0].x, 480);
  assert.equal(project.doc.frames[2].figures[0].x, 500, 'Pasted frame does not share pose arrays with its source');
  assert.equal(project.doc.frames[1].figures[0].type, project.doc.frames[2].figures[0].type, 'Pasting preserves figure type identity');
  await page.locator('[data-seg-index="4"]').click();
  const beforeRotate = (await readProject()).doc.frames[1].figures[0].angles;
  await page.locator('#piv-stage-canvas').focus();
  await page.keyboard.press('Alt+Shift+ArrowRight');
  project = await readProject();
  assert.ok(Math.abs(project.doc.frames[1].figures[0].angles[4] - beforeRotate[4] - Math.PI / 18) < 0.001);
  assert.ok(Math.abs(project.doc.frames[1].figures[0].angles[6] - beforeRotate[6] - Math.PI / 18) < 0.001, 'Keyboard rotation carries child joints');
  assert.deepEqual(project.doc.frames[2].figures[0].angles, beforeRotate, 'Rotating pasted pose leaves its source unchanged');
  // IDs stay unique across the whole animation, including figures absent here.
  const existingIds = project.doc.frames.flatMap(f => f.figures.map(fig => fig.id));
  await page.locator('#piv-btn-add-stick').click();
  assert.ok(!existingIds.includes((await readProject()).doc.frames[1].figures[1].id));

  // One-shot playback stops with editable handles, then replays from frame one.
  await page.locator('#piv-btn-loop').click();
  await page.locator('#piv-fps-slider').fill('24');
  await page.locator('#piv-fps-slider').dispatchEvent('change');
  await page.locator('#piv-btn-play').click();
  await page.waitForFunction(() => document.getElementById('piv-btn-play').getAttribute('aria-pressed') === 'false');
  assert.equal(await page.locator('#piv-current-frame').innerText(), '3');
  assert.equal(await page.locator('#piv-fig-x').isDisabled(), false);
  await page.locator('#piv-fps-slider').fill('4');
  await page.locator('#piv-fps-slider').dispatchEvent('change');
  await page.locator('#piv-btn-play').click();
  assert.equal(await page.locator('#piv-current-frame').innerText(), '1');
  await page.locator('#piv-btn-play').click();
  await page.locator('#piv-btn-loop').click();
  await page.locator('#piv-preset-select').selectOption('walk');
  assert.equal(await page.locator('#piv-btn-paste-frame').isDisabled(), true, 'Loading another project clears frame clipboard');
  await page.screenshot({ path: '/tmp/pivot-desktop.png', fullPage: true });

  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() => document.getElementById('piv-stage-canvas').clientWidth > 100);
    assert.ok(await page.evaluate(() => document.querySelector('.ll-sim').scrollWidth <= innerWidth + 1), `No horizontal page overflow at ${width}`);
    const stage = await page.locator('#piv-stage-canvas').boundingBox();
    assert.ok(stage.width > 100 && stage.height > 100);
    if (width === 390) {
      const timeline = await page.locator('.piv-filmstrip-bar').boundingBox();
      const panel = await page.locator('.piv-tool-panel').boundingBox();
      const timing = await page.locator('.piv-timing-bar').boundingBox();
      assert.ok(timeline.y < timing.y && timing.y < panel.y, 'Mobile timeline and timing controls appear before property panels');
      await page.screenshot({ path: '/tmp/pivot-mobile.png', fullPage: true });
      await page.locator('#piv-btn-focus').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#piv-btn-focus').getAttribute('aria-pressed'), 'false');
      await page.locator('#piv-tween-count').scrollIntoViewIfNeeded();
      await page.screenshot({ path: '/tmp/pivot-mobile-timing.png', fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => document.documentElement.dataset.lighting = 'night');
  await page.locator('#piv-stage-canvas').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/pivot-night.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Pivot studio browser checks passed: posing, fitted-stage drag, joint keyboard controls, history, figure duplication/layering, identity-safe tweens and easing, frame reordering/copy/paste, loop/one-shot playback, local recovery, file round-trip, sprite export, classroom files, view switching, and responsive layout at 320–1440px.');
} finally { await browser.close(); }
