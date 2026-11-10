// Run against node serve-local.js; override the origin with CHESSOS_URL.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.CHESSOS_URL || 'http://localhost:8080';
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

async function scrollFrom(x, y) {
  const previous = await page.evaluate(() => scrollY);
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, 400);
  await page.waitForFunction(before => scrollY > before + 100, previous);
}

try {
  await page.goto(`${base}/lessons/computer-science/algorithms-and-ai/chess-ai-core.html`);
  await page.waitForFunction(() => window.ClassroomOSCommandPalette);
  assert.match(await page.title(), /Chess: Play & Practice · ChessOS/);
  await scrollFrom(180, 600);

  // OrbitControls must not consume ordinary lesson scrolling over the board.
  await page.evaluate(() => scrollTo(0, 0));
  const board = await page.locator('#chess-3d-canvas').boundingBox();
  await scrollFrom(board.x + board.width / 2, board.y + board.height / 2);

  await page.evaluate(() => window.ClassroomOSCommandPalette.open());
  await page.locator('#cp-input').fill('chess');
  await page.waitForFunction(() => {
    const first = document.querySelector('.cp-item-title');
    return first?.textContent === 'Chess: Play & Practice · ChessOS';
  });
  assert.match(await page.locator('.cp-item').first().getAttribute('href'), /chess-ai-core.html$/);
  await page.locator('#cp-input').fill('ChessOS');
  await page.waitForFunction(() => document.querySelector('.cp-item-title')?.textContent.includes('ChessOS'));
  await page.keyboard.press('Escape');
  await scrollFrom(180, 600);

  // Both native fullscreen and the in-page fallback must restore scrolling.
  for (const fallback of [false, true]) {
    await page.evaluate(() => scrollTo(0, 0));
    if (fallback) {
      await page.evaluate(() => {
        document.querySelector('[data-creation-app]').requestFullscreen = () => Promise.reject(new Error('Test fallback'));
      });
    }
    const button = page.locator('.creation-app-fullscreen');
    await button.click();
    await page.waitForFunction(() => document.querySelector('.creation-app-fullscreen').textContent === 'Exit full screen');
    await button.click();
    await page.waitForFunction(() => document.querySelector('.creation-app-fullscreen').textContent === 'Full screen');
    await scrollFrom(180, 600);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await scrollFrom(15, 600);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('ChessOS: search ranking, page scrolling, board wheel behavior, fullscreen restoration, and phone layout passed.');
} finally {
  await browser.close();
}
