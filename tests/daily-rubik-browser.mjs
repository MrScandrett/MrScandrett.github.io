// Run against node serve-local.js. Exercises the actual animated cube and storage.
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import Cube from '../assets/js/lessons/rubiks-cube-solver.js';
import { makeRubik } from '../assets/js/daily-rubik-core.mjs';
const base = process.env.PUZZLES_URL || 'http://localhost:8080';
const browser = await chromium.launch({ headless: true, executablePath: findChromium() });
const errors = [];
const key = '2026-11-03';
async function open(options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.setFixedTime(new Date(`${key}T12:00:00`));
  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#home-puzzles').scrollIntoViewIfNeeded();
  await page.locator('#dp-tab-rubik').click();
  return { context, page };
}
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem('classroomos:puzzles:v1')).days[key].rubik, key);
const turn = async (page, move) => {
  const names = { U: 'Top', R: 'Right', F: 'Front', D: 'Bottom', L: 'Left', B: 'Back' };
  const label = `${names[move[0]]} face ${move.endsWith("'") ? `counterclockwise (${move[0]} prime)` : `clockwise (${move})`}`;
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.dp-rubik-layer'));
};
try {
  const { context, page } = await open({ viewport: { width: 1280, height: 950 } });
  assert.equal(await page.locator('.dp-rubik-sticker').count(), 54);
  // Take more turns than par, then preserve them through reload and date navigation.
  for (let i = 0; i < 12; i++) await turn(page, 'R');
  assert.equal((await saved(page)).moves.length, 12);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#home-puzzles').scrollIntoViewIfNeeded();
  await page.locator('.dp-rubik-stage').waitFor();
  assert.equal((await saved(page)).moves.length, 12);
  await page.getByRole('button', { name: 'Previous day', exact: true }).click();
  await page.getByRole('button', { name: 'Next day', exact: true }).click();
  assert.equal((await saved(page)).moves.length, 12);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal((await saved(page)).moves.length, 11);
  // Next step actually turns the cube and describes the algorithm.
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.dp-rubik-layer'));
  assert.equal((await saved(page)).moves.length, 12);
  assert.equal((await saved(page)).gaveUp, true);
  assert.match(await page.locator('.dp-rubik-algorithm').innerText(), /Inverse-move algorithm/);
  await page.getByRole('button', { name: 'Computer solve', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.dp-rubik-side .dp-status').textContent.includes('complete'), null, { timeout: 30000 });
  assert.equal((await saved(page)).done, true);
  assert.equal((await saved(page)).gaveUp, true);
  assert.equal(await page.locator('.dp-streak').isVisible(), false);
  // Restart and solve manually: only this earns the day's streak.
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  for (const move of makeRubik(key, Cube).solution) await turn(page, move);
  assert.equal((await saved(page)).done, true);
  assert.equal((await saved(page)).gaveUp, false);
  assert.equal(await page.locator('.dp-streak').isVisible(), true);
  assert.match(await page.locator('.dp-rubik-side a').getAttribute('href'), /rubiks-cube-math.html$/);
  // Keyboard view rotation does not count as a face turn.
  const before = await saved(page);
  await page.locator('.dp-rubik-stage').press('ArrowLeft');
  assert.deepEqual(await saved(page), before);
  await context.close();
  for (const [name, options] of [['phone', devices['iPhone SE']], ['tablet', devices['iPad Mini']]]) {
    const { context, page } = await open(options);
    await page.locator('#home-puzzles .creation-app-fullscreen').click();
    assert.ok(await page.locator('.dp-rubik-controls').evaluate((e) => e.getBoundingClientRect().bottom <= innerHeight), `${name}: cube controls visible with the cube`);
    await page.locator('.dp-rubik-side a').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.dp-rubik-side a').isVisible(), true);
    const fits = await page.evaluate(() => {
      const panel = document.querySelector('#dp-panel');
      return panel.scrollWidth <= panel.clientWidth + 1 && [...document.querySelectorAll('.dp-rubik-controls button')].every((b) => b.getBoundingClientRect().width >= 40);
    });
    assert.equal(fits, true, `${name}: controls fit without horizontal scrolling`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Daily Rubik’s: animation, unlimited turns, undo, saved progress, date navigation, demonstrations, manual solves, streaks, keyboard view, phone and tablet passed.');
} finally { await browser.close(); }
