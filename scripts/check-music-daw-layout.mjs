import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import Project from '../assets/js/music-daw-project.js';

// A real multi-channel song exercises fitting, scrolling, and clip redraws.
const song = Project.create();
song.name = 'Arrangement layout check';
const names = ['Grand piano', 'Electric keys', 'Drums', 'Bass', 'Guitar', 'Strings', 'Warm pad', 'Synth lead', 'Flute', 'Violin', 'Organ', 'Percussion', 'Harmony', 'Melody'];
song.tracks = names.map((name, i) => {
  const track = Project.makeTrack('instrument', name, 'piano', i);
  track.tools = ['keyboard'];
  track.clips = [{ id: `layout-clip-${i}`, type: 'midi', name, start: i * 4, length: 64,
    notes: Array.from({ length: 64 }, (_, n) => ({ pitch: 48 + (n + i) % 24, start: n, duration: .5, velocity: .8 })) }];
  return track;
});
const url = `http://127.0.0.1:8080/music-lab.html#song=${gzipSync(JSON.stringify(song)).toString('base64url')}`;
const browser = await chromium.launch({ executablePath: findChromium() });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    if (process.env.DAW_LAYOUT_WIDTH && Number(process.env.DAW_LAYOUT_WIDTH) !== viewport.width) continue;
    console.log('Checking layout', viewport);
    const context = await browser.newContext({ viewport, hasTouch: viewport.width !== 1440 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => document.querySelectorAll('.daw-th[data-track]').length === 14);
    const root = page.locator('#trackStudio'), scroll = root.locator('.daw-scroll');
    const height = () => root.locator('.daw-th[data-track]').first().evaluate(el => el.clientHeight);
    const compactHeight = await height();
    assert.ok(compactHeight <= 64);
    await root.locator('[data-track-density]').selectOption('detailed');
    if (viewport.width !== 390) assert.ok(await height() > compactHeight);
    await root.locator('[data-track-density]').selectOption('fit');
    await root.locator('[data-act="fit-song"]').click();
    await page.waitForFunction(() => {
      const clip = document.querySelector('[data-clip="layout-clip-13"]').getBoundingClientRect();
      return clip.right <= document.querySelector('.daw-scroll').getBoundingClientRect().right;
    });
    const fittedWidth = (await root.locator('[data-clip="layout-clip-0"]').first().boundingBox()).width;
    await root.locator('[data-act="zoom-out"]').click();
    assert.ok((await root.locator('[data-clip="layout-clip-0"]').first().boundingBox()).width < fittedWidth, 'zoom out also works below the old minimum zoom');
    await root.locator('[data-act="fit-song"]').click();

    // Color is musical project state: it must recolor clips, support Undo, and
    // survive autosave, while density is a separate remembered preference.
    const swatch = root.locator('.daw-track-color').first();
    await swatch.fill('#102030');
    await swatch.dispatchEvent('change');
    assert.equal(await swatch.inputValue(), '#102030');
    assert.equal(await root.locator('.daw-lane[data-lane]').first().evaluate(el => el.style.getPropertyValue('--tc')), '#102030');
    assert.equal(await root.locator('.daw-clip-name').first().evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
    await root.locator('.daw-file-tools > summary').click();
    await root.locator('[data-act="undo"]').click();
    assert.equal(await swatch.inputValue(), song.tracks[0].color);
    await root.locator('[data-act="redo"]').click();
    assert.equal(await swatch.inputValue(), '#102030');
    assert.equal(await root.locator('.daw-lane[data-lane]').first().evaluate(el => el.style.getPropertyValue('--tc')), '#102030');
    await root.locator('.daw-file-tools > summary').click();
    const savedColorMatches = () => page.evaluate(async () => {
      const db = await new Promise(resolve => { const r = indexedDB.open('classroomos-music-lab-daw'); r.onsuccess = () => resolve(r.result); });
      const saved = await new Promise(resolve => { const r = db.transaction('kv').objectStore('kv').get('project'); r.onsuccess = () => resolve(r.result); });
      db.close();
      return saved && JSON.parse(saved).tracks[0].color === '#102030';
    });
    const saveDeadline = Date.now() + 10000;
    while (!await savedColorMatches()) {
      assert.ok(Date.now() < saveDeadline, 'color autosaves before reload');
      await page.waitForTimeout(100);
    }
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.daw-track-color')?.value === '#102030');
    assert.equal(await root.locator('[data-track-density]').inputValue(), 'fit');

    if (viewport.width === 1440) {
      // Drag the actual CSS resize handle; ResizeObserver must refit rows.
      await scroll.scrollIntoViewIfNeeded();
      const before = await scroll.boundingBox();
      await page.mouse.move(before.x + before.width - 3, before.y + before.height - 3);
      await page.mouse.down();
      await page.mouse.move(before.x + before.width - 3, before.y + before.height - 113, { steps: 8 });
      await page.mouse.up();
      assert.ok((await scroll.boundingBox()).height < before.height - 60, 'timeline resizes by dragging');
    }
    await root.locator('[data-act="studio"]').click();
    await root.locator('[data-view="tracks"]').click();
    await root.locator('[data-act="fit-song"]').click();
    if (viewport.width === 1440) {
      await page.waitForFunction(() => {
        const grid = document.querySelector('.daw-tracks').getBoundingClientRect();
        return grid.height <= document.querySelector('.daw-scroll').clientHeight;
      });
      assert.ok(await root.locator('.daw-th.is-overview').count() === 14);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `/tmp/music-daw-layout-${viewport.width}.png`, animations: 'disabled' });
    await root.locator('[data-act="studio"]').click();
    assert.equal(await page.locator('.pillar-daw.is-studio').count(), 0);
    assert.deepEqual(errors, []);
    console.log(`${viewport.width}×${viewport.height}: row sizes, song fit, color/undo/autosave, fullscreen, and overflow passed`);
    await context.close();
  }
} finally {
  await browser.close();
}
