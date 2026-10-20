import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import DawIO from '../assets/js/music-daw-io.js';

const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8080/music-lab.html');
  const fileTools = page.locator('.daw-file-tools');
  if (await fileTools.getAttribute('open') === null) await fileTools.locator('summary').click();
  await page.locator('[data-act="new-clip"]').click();
  const roll = page.locator('.daw-roll canvas');
  await roll.scrollIntoViewIfNeeded();
  const box = await roll.boundingBox();
  assert.ok(box);
  const x = box.x + 80 + 72 * 0.7, y = box.y + 84;
  await page.mouse.move(x, y);
  assert.match(await page.locator('[data-roll-cursor]').textContent(), /beat 1\.50/);
  await page.screenshot({ path: '/tmp/music-daw-roll-hover.png', animations: 'disabled' });
  await page.keyboard.down('Control');
  await page.mouse.move(x, y);
  assert.match(await page.locator('[data-roll-cursor]').textContent(), /fine/);
  await page.mouse.click(x, y);
  await page.keyboard.up('Control');

  if (await fileTools.getAttribute('open') === null) await fileTools.locator('summary').click();
  await page.locator('[data-menu="export"]').click();
  const pending = page.waitForEvent('download');
  await page.locator('[data-act="export-midi"]').click();
  const download = await pending;
  const song = DawIO.parseMidi(await fs.readFile(await download.path()));
  assert.equal(song.tracks.length, 1);
  assert.ok(Math.abs(song.tracks[0].notes[0].start - 0.7) < 0.03, 'Ctrl-click places a note between grid lines');

  const ruler = await page.locator('[data-ruler] canvas').boundingBox();
  await page.mouse.move(ruler.x + 65, ruler.y + 12);
  await page.mouse.down();
  await page.mouse.move(ruler.x + 155, ruler.y + 12, { steps: 6 });
  await page.mouse.up();
  assert.equal(await page.locator('.daw-time-selection').isVisible(), true);
  assert.match(await page.locator('[data-time-cursor]').textContent(), /–/);
  assert.equal(await page.locator('[data-act="loop"]').getAttribute('aria-pressed'), 'true');
  const beforeZoom = await page.locator('.daw-time-selection').boundingBox();
  await page.locator('[data-act="zoom-in"]').click();
  const afterZoom = await page.locator('.daw-time-selection').boundingBox();
  assert.ok(afterZoom.width > beforeZoom.width, 'time range follows timeline zoom');

  const lane = await page.locator('.daw-lane[data-kind="instrument"]').first().boundingBox();
  await page.keyboard.down('Shift');
  await page.mouse.move(lane.x + 230, lane.y + lane.height / 2);
  await page.mouse.down();
  await page.mouse.move(lane.x + 300, lane.y + lane.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  assert.match(await page.locator('[data-ref="status"]').textContent(), /Selected .* Loop playback uses this range/);
  assert.equal(errors.length, 0, errors.join('\n'));
  await page.screenshot({ path: '/tmp/music-daw-selection.png', animations: 'disabled' });
  console.log('Piano roll hover/fine MIDI placement and timeline ruler/Shift-lane selection passed.');
  await context.close();
} finally {
  await browser.close();
}
