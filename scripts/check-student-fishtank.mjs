#!/usr/bin/env node
// Run against `node serve-local.js`. All database traffic uses an in-page mock;
// this check never reads or modifies the real class fish list.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const baseURL = process.env.SITE_URL || 'http://127.0.0.1:8080';
const shots = process.env.FISHTANK_SCREENSHOT_DIR;
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']), headless: true });
const errors = [];
const fixtures = {
  bubbles: { name: 'Bubbles', color: '#4FC3F7', size: 1 },
  coral: { name: 'Coral', color: '#FF7043', size: .9, role: 'bottom' },
  pearl: { name: 'Pearl', color: '#CE93D8', size: .85, role: 'jelly' },
};

function firebaseMock() {
  let fish = {};
  let listener;
  let connectionListener;
  window.__mock = {
    writes: [],
    emit(value) { fish = structuredClone(value); listener?.(snapshot()); },
    connected(value) { connectionListener?.({ val: () => value }); },
  };
  function snapshot() {
    return { forEach: callback => Object.entries(fish).forEach(([key, value]) => callback({ key, val: () => structuredClone(value) })) };
  }
  window.firebase = {
    initializeApp() {},
    database: () => ({ ref: path => ({
      on(event, callback) {
        if (path === 'fish') listener = callback;
        else if (path === '.info/connected') connectionListener = callback;
      },
      async remove() {
        window.__mock.writes.push({ path, action: 'remove' });
        delete fish[path.split('/')[1]];
        listener?.(snapshot());
      },
      async set(value) {
        window.__mock.writes.push({ path, action: 'set', value });
        const [, id, field] = path.split('/');
        if (field) fish[id][field] = value;
        else if (id) fish[id] = value;
        else fish = value;
        listener?.(snapshot());
      },
      async update(changes) {
        window.__mock.writes.push({ path, action: 'update', changes });
        for (const [id, value] of Object.entries(changes)) {
          if (value === null) delete fish[id]; else fish[id] = value;
        }
        listener?.(snapshot());
      },
      push() { return { key: `mock-${Math.random()}` }; },
    }) }),
  };
}
async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
  await page.route('**/assets/vendor/firebase-compat.min.js', route => route.fulfill({ contentType: 'text/javascript', body: `(${firebaseMock.toString()})()` }));
  // A page regression must not leak requests to the production database.
  await page.route(/firebaseio\.com|firebasedatabase\.app/, route => route.abort());
  await page.goto(`${baseURL}/student-fishtank.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.onFeed === 'function');
  return page;
}
async function ready(page, count) {
  await page.waitForFunction(expected => document.querySelector('#loading').classList.contains('gone') && document.querySelector('#resident-count').textContent === String(expected), count);
}
async function screenshot(page, name) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
}
async function canvasImage(page) { return page.locator('#tank-canvas').screenshot(); }
async function withinViewport(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
  for (const id of ['feedBtn', 'cleanBtn', 'mPlayBtn', 'pauseBtn', 'namesBtn']) {
    const box = await page.locator(`#${id}`).boundingBox();
    const viewport = page.viewportSize();
    assert(box && box.x >= 0 && box.x + box.width <= viewport.width + 1, `${id} cropped horizontally`);
    assert(box.y >= 0 && box.y + box.height <= viewport.height + 1, `${id} cropped vertically`);
  }
}

try {
  if (!process.argv.includes('--responsive-only')) {
    const page = await open();
    await page.evaluate(value => window.__mock.emit(value), fixtures);
    await ready(page, 3);
    assert.equal(await page.locator('#connection-status').textContent(), 'Class tank · live');
    assert.deepEqual(await page.evaluate(() => window.__mock.writes), [], 'opening the tank must not seed the database');
    await withinViewport(page);
    console.log('Checking swim and pause…');
    await page.locator('#namesBtn').click();
    assert.equal(await page.locator('#namesBtn').getAttribute('aria-pressed'), 'false');
    const moving = await canvasImage(page);
    await page.waitForTimeout(350);
    assert(!moving.equals(await canvasImage(page)), 'fish must render and swim');
    await page.locator('#pauseBtn').click();
    await page.waitForTimeout(100);
    const frozen = await canvasImage(page);
    await page.waitForTimeout(350);
    assert(frozen.equals(await canvasImage(page)), 'pause must freeze the canvas');
    console.log('Checking keyboard fish selection…');
    await page.locator('#residentsBtn').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#resident-search').evaluate(el => el === document.activeElement), true);
    await page.locator('#resident-search').fill('pear');
    assert.equal(await page.locator('.resident').count(), 1);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#fish-card-name').textContent(), 'Pearl');
    assert.match(await page.locator('#fish-card-behavior').textContent(), /bell/);
    assert.equal(await page.locator('.fish-label.selected').count(), 1);
    await page.keyboard.press('Escape');
    assert(await page.locator('#fish-card').isHidden());

    console.log('Checking care actions…');
    await page.locator('#feedBtn').click(); // A care action resumes a paused tank.
    assert.equal(await page.locator('#pauseBtn').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#meter-track').getAttribute('aria-valuenow'), '85');
    assert(await page.locator('#feedBtn').isDisabled());
    await page.locator('#cleanBtn').click();
    await page.waitForFunction(() => !document.querySelector('#cleanBtn').disabled);
    assert.equal(await page.locator('#water-value').textContent(), '100%');
    console.log('Checking systems…');
    await page.locator('#systemsBtn').click();
    assert(await page.locator('#systems-panel').evaluate(el => el.open));
    await page.locator('#heatBtn').click();
    await page.waitForFunction(() => document.querySelector('#heatBtn').disabled);
    await page.locator('#filterBtn').click();
    await page.waitForFunction(() => document.querySelector('#filterBtn').disabled);
    await screenshot(page, 'care');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#systemsBtn').evaluate(el => el === document.activeElement), true);

    await page.locator('#mPlayBtn').click();
    await page.waitForFunction(() => document.querySelector('#mPlayBtn').getAttribute('aria-pressed') === 'true');
    const piece = await page.locator('#music-title').textContent();
    await page.getByRole('button', { name: 'Next piece', exact: true }).click();
    await page.waitForFunction(previous => document.querySelector('#music-title').textContent !== previous, piece);
    await page.locator('#music-vol').evaluate(el => { el.value = '.2'; el.dispatchEvent(new Event('input')); });
    await page.waitForFunction(() => !document.querySelector('#mPlayBtn').disabled);
    await page.locator('#mPlayBtn').click();
    assert.equal(await page.locator('#mPlayBtn').getAttribute('aria-pressed'), 'false');
    if (await page.locator('#fsBtn').isVisible()) {
      await page.locator('#fsBtn').click();
      await page.waitForFunction(() => !!document.fullscreenElement);
      assert.equal(await page.locator('#fsBtn').getAttribute('aria-label'), 'Exit fullscreen');
      await page.locator('#fsBtn').click();
      await page.waitForFunction(() => !document.fullscreenElement);
    }
    console.log('PASS synthesized music and fullscreen controls');

    // Fish edited elsewhere update locally; removed IDs can join again.
    await page.evaluate(value => window.__mock.emit(value), { ...fixtures, bubbles: { ...fixtures.bubbles, name: 'Bubbles II', role: 'eel' } });
    await page.waitForFunction(() => [...document.querySelectorAll('.fish-label')].some(el => el.textContent === 'Bubbles II'));
    await page.evaluate(value => window.__mock.emit(value), { coral: fixtures.coral });
    await ready(page, 1);
    await page.evaluate(value => window.__mock.emit(value), fixtures);
    await ready(page, 3);
    await page.evaluate(() => window.__mock.connected(false));
    assert.match(await page.locator('#connection-status').textContent(), /reconnecting/);
    await page.evaluate(() => window.__mock.connected(true));
    assert.match(await page.locator('#connection-status').textContent(), /live/);

    // Literal names stay text in both student and admin interfaces.
    const literal = '<img src=x onerror=alert(1)>';
    await page.evaluate(value => window.__mock.emit(value), { literal: { name: literal } });
    await ready(page, 1);
    await page.keyboard.type('ADMIN');
    assert(await page.locator('#admin-panel').evaluate(el => el.open));
    assert.equal(await page.locator('.admin-fish-name').textContent(), literal);
    assert.equal(await page.locator('.admin-fish-row img').count(), 0);
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.__mock.emit({}));
    await ready(page, 0);
    assert(await page.locator('#empty-tank').isVisible());
    assert(await page.locator('#feedBtn').isDisabled());
    assert.deepEqual(await page.evaluate(() => window.__mock.writes), [], 'view and care controls must not write to Firebase');
    console.log('PASS live fish updates, keyboard access, motion, care, and empty state');

    // Load real student-model formats, and cancel a pending model on removal.
    const stl = 'data:application/octet-stream;base64,' + Buffer.from('solid fish\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid fish').toString('base64');
    await page.evaluate(value => window.__mock.emit(value), {
      stl: { name: 'STL fish', model: stl, modelType: 'stl' },
      glb: { name: 'GLB fish', model: 'assets/models/breadboard-cutaway.glb', modelType: 'glb' },
    });
    await ready(page, 2);
    await page.route('**/delayed-fish.stl', route => new Promise(resolve => setTimeout(resolve, 1000)).then(() => route.fulfill({ body: 'invalid model' })));
    await page.evaluate(() => window.__mock.emit({ delayed: { name: 'Removed model', model: '/delayed-fish.stl' } }));
    await page.evaluate(() => window.__mock.emit({}));
    await page.waitForTimeout(1200);
    await ready(page, 0);
    console.log('PASS STL/GLB compatibility and removal during model loading');
    await page.context().close();
  }

  const preview = await open({ reducedMotion: 'reduce' });
  await ready(preview, 5); // Exercise the actual six-second slow-connection fallback.
  assert.match(await preview.locator('#connection-status').textContent(), /Preview/);
  assert.equal(await preview.locator('#pauseBtn').getAttribute('aria-pressed'), 'true');
  const still = await canvasImage(preview);
  await preview.waitForTimeout(300);
  assert(still.equals(await canvasImage(preview)), 'reduced motion must start with a still scene');
  await screenshot(preview, 'desktop');
  await preview.locator('#residentsBtn').click();
  await screenshot(preview, 'residents');
  await preview.keyboard.press('Escape');
  for (const [width, height] of [[390, 844], [320, 568], [844, 390]]) {
    await preview.setViewportSize({ width, height });
    await preview.waitForTimeout(100);
    if (height > 420) await withinViewport(preview);
    else {
      assert(await preview.locator('#control-bar').evaluate(el => el.getBoundingClientRect().bottom <= document.documentElement.scrollHeight + 1), 'short landscape controls must remain scrollable');
      await preview.locator('#mPlayBtn').scrollIntoViewIfNeeded();
      assert((await preview.locator('#mPlayBtn').boundingBox()).y + (await preview.locator('#mPlayBtn').boundingBox()).height <= height + 1, 'landscape music controls must scroll into view');
    }
    await screenshot(preview, `mobile-${width}`);
  }
  await preview.setViewportSize({ width: 1440, height: 1000 });
  await preview.evaluate(value => window.__mock.emit(value), fixtures);
  await ready(preview, 3);
  assert.match(await preview.locator('#connection-status').textContent(), /live/);
  assert.equal(await preview.locator('.fish-label').count(), 3, 'live data must replace sample fish');
  assert.deepEqual(await preview.evaluate(() => window.__mock.writes), []);
  await preview.context().close();
  console.log('PASS slow connection preview, late reconnect, reduced motion, and responsive layouts');
  assert.deepEqual(errors, [], 'browser errors');
  console.log('Fish tank browser checks passed.');
} finally {
  await browser.close();
}
