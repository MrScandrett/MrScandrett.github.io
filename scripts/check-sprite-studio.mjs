// Browser-level checks for drawing, editing, restoration and usable asset exports.
// Start node serve-local.js first; override SPRITE_STUDIO_URL for another server.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import JSZip from '../assets/vendor/jszip.min.js';
import { findChromium } from '../lib/find-chromium.mjs';
import { createProject, validateProject } from '../assets/js/lessons/sprite-studio/model.mjs';

const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const errors = [], failures = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, acceptDownloads: true });
page.on('pageerror', e => errors.push(e.message));
const url = process.env.SPRITE_STUDIO_URL || 'http://127.0.0.1:8080/lessons/2d-design/2d-game-dev/pixel-art-sprites.html';
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('classroomos-sprite-studio-v1')));
const check = async (name, fn) => { try { await fn(); console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.stack}`); } };
async function download(id) { const promise = page.waitForEvent('download'); await page.locator(`#ss-${id}`).click(); const result = await promise; return { name: result.suggestedFilename(), bytes: await fs.readFile(await result.path()) }; }
async function newProject(view, size, blank = 'blank') {
  await page.locator('#ss-new').click(); await page.locator('#ss-new-view').selectOption(view); await page.locator('#ss-new-size').selectOption(String(size)); await page.locator('#ss-new-blank').selectOption(blank); await page.locator('#ss-create').click();
}
try {
  await page.goto(url); await page.waitForSelector('#ss-grid [role=gridcell]');
  await page.evaluate(() => document.fonts.ready);
  await check('workspace loads first and starts paused', async () => {
    assert.equal(await page.locator('main > :first-child').getAttribute('data-creation-app'), '');
    assert.equal(await page.getByRole('gridcell').count(), 256); assert.equal(await page.locator('#ss-play').getAttribute('aria-pressed'), 'false');
  });
  await newProject('side', 16);
  await check('keyboard drawing, focus exit and undo / redo', async () => {
    const cell = page.getByRole('gridcell').first(); await cell.focus(); await page.keyboard.press('Space');
    assert.equal((await stored()).clips['idle-right'].frames[0].pixels[0], '1');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space');
    assert.equal((await stored()).clips['idle-right'].frames[0].pixels[17], '1');
    await page.keyboard.press('Control+z'); assert.equal((await stored()).clips['idle-right'].frames[0].pixels[17], '0');
    await page.keyboard.press('Control+Shift+z'); assert.equal((await stored()).clips['idle-right'].frames[0].pixels[17], '1');
    await page.keyboard.press('Tab'); assert.equal(await page.locator('#ss-x').evaluate(el => el === document.activeElement), true);
  });
  await check('coordinate input, mirror and drag interpolation', async () => {
    await page.locator('#ss-x').fill('3'); await page.locator('#ss-y').fill('4'); await page.locator('#ss-mirror').check(); await page.locator('#ss-paint-cell').click();
    const pixels = (await stored()).clips['idle-right'].frames[0].pixels; assert.equal(pixels[50], '1'); assert.equal(pixels[61], '1');
    await page.locator('#ss-mirror').uncheck(); await page.locator('#ss-grid').scrollIntoViewIfNeeded(); const box = await page.locator('#ss-grid').boundingBox();
    await page.mouse.move(box.x + box.width * .05, box.y + box.height * .55); await page.mouse.down(); await page.mouse.move(box.x + box.width * .95, box.y + box.height * .55, { steps: 8 }); await page.mouse.up();
    assert.equal((await stored()).clips['idle-right'].frames[0].pixels.slice(128, 144), '1'.repeat(16));
  });
  await check('accessible cell activation uses selected tool', async () => {
    const cell = page.getByRole('gridcell').nth(2); await cell.evaluate(el => el.click());
    assert.equal((await stored()).clips['idle-right'].frames[0].pixels[2], '1');
  });
  await check('timeline edits timing and frame order without changing other directions', async () => {
    await page.locator('#ss-duplicate').click(); await page.locator('#ss-duration').fill('270'); await page.locator('#ss-pose').fill('Reaching up'); await page.locator('#ss-pose').press('Tab');
    await page.locator('#ss-earlier').click(); const p = await stored(); assert.equal(p.clips['idle-right'].frames[0].ms, 270); assert.equal(p.clips['idle-right'].frames[0].label, 'Reaching up'); assert.equal(p.clips['idle-left'].frames.length, 1);
    await page.locator('#ss-onion').check(); await page.locator('#ss-frames [data-frame="1"]').click(); await page.locator('#ss-add').click();
    await page.locator('#ss-delete').click(); assert.equal((await stored()).clips['idle-right'].frames.length, 2);
  });
  await check('one-shot playback advances and holds last pose', async () => {
    await page.locator('#ss-action').selectOption('sword'); await page.locator('#ss-demo').click(); await page.locator('#ss-play').click();
    await page.waitForFunction(() => document.querySelector('#ss-play').getAttribute('aria-pressed') === 'false');
    assert.match(await page.locator('#ss-playhead').textContent(), /Pose 5 of 5/);
    await page.locator('#ss-step').click(); assert.match(await page.locator('#ss-playhead').textContent(), /Pose 1 of 5/);
  });
  await check('JSON download reopens exact project after edits', async () => {
    const original = await stored(), file = await download('save'); const raw = JSON.parse(file.bytes.toString()); assert.deepEqual(validateProject(raw), original);
    await page.locator('#ss-clear').click(); await page.locator('#ss-open').setInputFiles({ name: file.name, mimeType: 'application/json', buffer: file.bytes });
    await page.waitForFunction(() => document.querySelector('#ss-status').textContent.startsWith('File opened.')); assert.deepEqual(await stored(), original);
  });
  await check('invalid JSON leaves existing art untouched', async () => {
    const before = await stored(); await page.locator('#ss-open').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"nope"}') });
    await page.waitForFunction(() => document.querySelector('#ss-status').textContent.startsWith('Could not open file:')); assert.deepEqual(await stored(), before);
  });
  await check('PNG exports native size and can be imported', async () => {
    await page.locator('#ss-action').selectOption('sword');
    const pixels = (await stored()).clips['sword-right'].frames[0].pixels, file = await download('png'); assert.equal(file.bytes.readUInt32BE(16), 16); assert.equal(file.bytes.readUInt32BE(20), 16);
    await page.locator('#ss-clear').click(); await page.locator('#ss-import-png').setInputFiles({ name: file.name, mimeType: 'image/png', buffer: file.bytes });
    await page.waitForFunction(() => document.querySelector('#ss-status').textContent.startsWith('File opened.')); assert.equal((await stored()).clips['sword-right'].frames[0].pixels, pixels);
    const sheet = await download('sheet'); assert.equal(sheet.bytes.readUInt32BE(16), 80); assert.equal(sheet.bytes.readUInt32BE(20), 16);
    const metadata = JSON.parse((await download('timing')).bytes.toString()); assert.equal(metadata.frames[2].durationMs, 70);
  });
  await check('top-down / 32-pixel projects and JSON restore all four directions', async () => {
    const incoming = createProject('top', 32); incoming.clips['jump-up'].frames[2].ms = 420;
    await page.locator('#ss-open').setInputFiles({ name: 'top.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming)) });
    await page.waitForFunction(() => document.querySelectorAll('#ss-grid [role=gridcell]').length === 1024);
    assert.deepEqual(await stored(), incoming); assert.equal(await page.locator('#ss-direction option').count(), 4);
    await page.locator('#ss-direction').selectOption('up'); assert.equal(await page.locator('#ss-face').isDisabled(), true); assert.equal(await page.locator('#ss-courier').isDisabled(), true);
    await page.reload(); await page.waitForSelector('#ss-grid [role=gridcell]'); assert.deepEqual(await stored(), incoming);
  });
  await check('ZIP includes every clip PNG and matching variable timing', async () => {
    const file = await download('zip'), zip = await JSZip.loadAsync(file.bytes); const data = JSON.parse(await zip.file('project.sprite.json').async('string'));
    const metadata = JSON.parse(await zip.file('animations.json').async('string')); assert.equal(metadata.length, 40);
    for (const entry of metadata) { const png = await zip.file(entry.image).async('nodebuffer'); assert.equal(png.readUInt32BE(16), 32 * entry.frames.length); assert.equal(png.readUInt32BE(20), 32); }
    assert.deepEqual(data, await stored()); assert.equal(metadata.find(c => c.action === 'jump' && c.direction === 'up').frames[2].durationMs, 420);
  });
  await check('pathway transfer preserves every other pathway animation', async () => {
    await newProject('side', 16, 'demo');
    const old = await page.evaluate(() => JSON.parse(JSON.stringify(PixelCourier.store.load())));
    await page.locator('#ss-from-courier').click();
    assert.equal((await stored()).clips['idle-right'].frames[0].pixels, old.sprites.courier.anims.idle.frames[0]);
    await page.locator('#ss-clear').click(); await page.locator('#ss-courier').click();
    const next = await page.evaluate(() => JSON.parse(JSON.stringify(PixelCourier.store.load())));
    const expected = structuredClone(old); expected.sprites.courier.anims.idle.frames[0] = '0'.repeat(256); assert.deepEqual(next, expected);
  });
  await check('Escape cancels a reopened new-project dialog', async () => {
    const before = await stored(); await page.locator('#ss-new').click(); await page.locator('#ss-new-view').selectOption('top'); await page.keyboard.press('Escape');
    assert.deepEqual(await stored(), before); assert.equal(await page.locator('#ss-new-dialog').evaluate(el => el.open), false);
  });
  await check('unavailable storage still permits drawing and project download', async () => {
    const fresh = await browser.newPage();
    try {
      await fresh.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'QuotaExceededError'); }; });
      await fresh.goto(url); await fresh.waitForSelector('#ss-grid button');
      await fresh.getByRole('gridcell').first().focus(); await fresh.keyboard.press('Space');
      assert.match(await fresh.locator('#ss-status').textContent(), /Working in memory/);
      const promise = fresh.waitForEvent('download'); await fresh.locator('#ss-save').click(); const result = await promise;
      assert.equal(JSON.parse(await fs.readFile(await result.path(), 'utf8')).clips['idle-right'].frames[0].pixels[0], '1');
    } finally { await fresh.close(); }
  });
  await check('desktop / phone / landscape / night layouts have no page overflow', async () => {
    for (const width of [1440, 768, 390, 320, 844]) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 1080 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `overflow at ${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.ClassroomOSThemeLighting.setTheme('night'));
    await page.waitForFunction(() => document.documentElement.dataset.lighting === 'night');
    await page.locator('.ss-heading').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#ss-new').isVisible(), true); await page.screenshot({ path: '/tmp/sprite-studio-mobile.png' });
  });
  await check('shared fullscreen enter / exit works', async () => {
    const full = page.getByRole('button', { name: 'Full screen', exact: true }); await full.click();
    await page.getByRole('button', { name: 'Exit full screen', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
    await full.waitFor();
  });
  await check('no runtime errors', async () => assert.deepEqual(errors, []));
} finally { await browser.close(); }
if (failures.length) { console.error(`${failures.length} checks failed.`); process.exitCode = 1; }
else console.log('Sprite Studio browser checks passed.');
