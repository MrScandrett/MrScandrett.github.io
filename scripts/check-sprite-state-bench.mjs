import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import JSZip from '../assets/vendor/jszip.min.js';
import { findChromium } from '../lib/find-chromium.mjs';
import { createProject } from '../assets/js/lessons/sprite-studio/model.mjs';
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const url = process.env.SPRITE_BENCH_URL || 'http://127.0.0.1:8080/lessons/2d-design/2d-game-dev/animation-states.html';
const failures = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
const state = () => page.evaluate(() => window.SpriteAssetBench.snapshot());
async function check(name, fn) { try { await fn(); console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.stack}`); } }
async function open(project) {
  await page.locator('#ab-import').setInputFiles({ name: 'character.sprite.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await page.waitForFunction(name => document.querySelector('#ab-project-name').textContent === name, project.name);
}
async function save(id) { const p = page.waitForEvent('download'); await page.locator(`#ab-${id}`).click(); const file = await p; return fs.readFile(await file.path()); }
let unpacked;
try {
  await page.goto(url); await page.waitForFunction(() => !!window.SpriteAssetBench); await page.evaluate(() => document.fonts.ready);
  await check('first workspace, complete coverage and paused entry', async () => {
    assert.equal(await page.locator('main>:first-child').getAttribute('data-creation-app'), '');
    assert.equal(await page.locator('#ab-coverage-body tr').count(), 10); assert.equal(await page.locator('#ab-play').getAttribute('aria-pressed'), 'false');
    assert.equal((await state()).health, 50);
  });
  await check('studio project import preserves 32-pixel art, four directions and timing', async () => {
    const p = createProject('top', 32); p.name = 'My original four-way hero'; p.clips['sword-up'].frames[2].ms = 240;
    await open(p); assert.equal((await state()).pose.pixels.length, 1024); assert.equal(await page.locator('#ab-coverage-head th').count(), 5);
    assert.equal(await page.locator('[data-move=up]').isEnabled(), true);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('classroomos-sprite-studio-v1'))), p);
    const raw = JSON.parse((await save('json')).toString()); assert.deepEqual(raw, p);
  });
  await check('blank assets stay blank and are reported, rather than replaced', async () => {
    const p = createProject('side', 16, true); p.name = 'My unfinished hero'; await open(p);
    assert.match(await page.locator('#ab-coverage-status').textContent(), /20 blank clips/); assert.equal((await state()).pose.pixels, '0'.repeat(256));
    const raw = JSON.parse((await save('json')).toString()); assert.deepEqual(raw, p);
  });
  await check('invalid imports preserve the current character', async () => {
    const before = JSON.parse((await save('json')).toString());
    await page.locator('#ab-import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"wrong"}') });
    await page.waitForFunction(() => document.querySelector('#ab-source-status').textContent.startsWith('Could not open project:'));
    assert.deepEqual(JSON.parse((await save('json')).toString()), before);
  });
  const p = createProject(); p.name = 'My playable sprite'; await open(p);
  await check('keyboard movement uses actual collisions and pauses cleanly', async () => {
    await page.locator('#ab-play').click(); await page.locator('#ab-stage').focus(); await page.keyboard.down('Shift'); await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => SpriteAssetBench.snapshot().x >= 456); await page.keyboard.up('Shift'); await page.keyboard.up('ArrowRight');
    await page.waitForFunction(() => SpriteAssetBench.snapshot().state === 'idle'); assert.equal((await state()).x, 456);
    await page.locator('#ab-play').click(); assert.equal(await page.locator('#ab-play').getAttribute('aria-pressed'), 'false');
  });
  await check('manual movement and jump stepping work without simultaneous key presses', async () => {
    await page.locator('[data-action=retry]').click(); const x = (await state()).x;
    await page.locator('[data-move=right]').focus(); await page.keyboard.press('Enter'); assert.ok((await state()).x > x);
    await page.locator('[data-action=jump]').click(); assert.equal((await state()).pose.index, 0);
    for (let i = 0; i < 40; i++) await page.locator('#ab-step').click();
    assert.equal((await state()).z, 0); assert.ok((await state()).transitions.some(t => t.to === 'land'));
  });
  await check('potion effect happens once and hurt interrupts', async () => {
    await page.locator('[data-action=retry]').click(); await page.locator('[data-action=potion]').click();
    for (let i = 0; i < 20; i++) await page.locator('#ab-step').click(); assert.equal((await state()).health, 70); assert.equal((await state()).benefits, 1);
    await page.locator('[data-action=hurt]').click(); assert.equal((await state()).state, 'hurt'); assert.equal((await state()).health, 45);
    assert.match(await page.locator('#ab-log').textContent(), /interrupts/);
  });
  await check('clip edit link opens the exact shared project action and direction', async () => {
    await page.locator('[data-action=retry]').click(); await page.locator('[data-action=sword]').click();
    const href = await page.locator('#ab-edit').getAttribute('href'); assert.match(href, /action=sword&facing=right/);
    await page.locator('#ab-edit').click(); await page.waitForFunction(() => document.querySelector('#ss-action')?.value === 'sword');
    assert.equal(await page.locator('#ss-direction').inputValue(), 'right'); assert.equal(await page.locator('#ss-name').inputValue(), p.name);
    await page.locator('.ss-test-link').click(); await page.waitForFunction(() => !!window.SpriteAssetBench);
    assert.equal(await page.locator('#ab-project-name').textContent(), p.name);
  });
  await check('report and scene PNG preserve useful asset-test evidence', async () => {
    await page.locator('#ab-note').fill('Make the worried brows clearer at native size.');
    const report = JSON.parse((await save('report')).toString()); assert.match(report.observation, /worried brows/); assert.equal(report.coverage.length, 20);
    const png = await save('capture'); assert.equal(png.readUInt32BE(16), 640); assert.equal(png.readUInt32BE(20), 300);
  });
  await check('playable ZIP contains all native assets, project, rules and test evidence', async () => {
    const bytes = await save('export'), zip = await JSZip.loadAsync(bytes);
    for (const name of ['index.html', 'game.js', 'sim-kit.js', 'project.sprite.json', 'animations.json', 'state-rules.json', 'test-report.json', 'README.txt']) assert.ok(zip.file(name), name);
    assert.equal(JSON.parse(await zip.file('animations.json').async('string')).length, 20);
    assert.equal(JSON.parse(await zip.file('project.sprite.json').async('string')).name, p.name);
    unpacked = await fs.mkdtemp(path.join(os.tmpdir(), 'sprite-kit-'));
    for (const file of Object.values(zip.files)) if (!file.dir) await fs.writeFile(path.join(unpacked, file.name), await file.async('nodebuffer'));
  });
  await check('exported demo runs with file URLs and all network access blocked', async () => {
    assert.ok(unpacked); const demo = await browser.newPage(); const issues = [];
    demo.on('pageerror', e => issues.push(e.message)); await demo.route(/^https?:/, route => route.abort());
    try {
      await demo.goto(pathToFileURL(path.join(unpacked, 'index.html')).href); await demo.waitForFunction(() => !!window.spriteGame);
      assert.match(await demo.locator('#title').textContent(), /My playable sprite/);
      await demo.locator('[data-action=potion]').click(); await demo.locator('#play').click(); await demo.waitForFunction(() => spriteGame.snapshot().benefits === 1);
      await demo.locator('#play').click(); assert.equal(await demo.evaluate(() => spriteGame.snapshot().health), 70); assert.deepEqual(issues, []);
      await demo.setViewportSize({width:320,height:844}); assert.equal(await demo.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    } finally { await demo.close(); }
  });
  await check('phone, tablet, desktop and night workspace remain within the viewport', async () => {
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `overflow ${width}`); }
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => ClassroomOSThemeLighting.setTheme('night')); await page.waitForFunction(() => document.documentElement.dataset.lighting === 'night');
    await page.locator('.ss-heading').scrollIntoViewIfNeeded(); await page.screenshot({ path: '/tmp/sprite-bench-mobile.png' });
  });
  await check('fullscreen fallback supports exit and keyboard focus restoration', async () => {
    await page.evaluate(() => Object.defineProperty(document, 'fullscreenEnabled', { get: () => false }));
    const button = page.locator('.creation-app-fullscreen'); await button.click(); await page.locator('.creation-app-expanded').waitFor();
    assert.equal(await page.locator('.creation-app-expanded').evaluate(e => e.getBoundingClientRect().width <= innerWidth), true);
    await page.keyboard.press('Escape'); assert.equal(await page.locator('.creation-app-expanded').count(), 0);
    assert.equal(await button.evaluate(e => e === document.activeElement), true);
  });
  await check('no browser runtime errors', async () => assert.deepEqual(errors, []));
} finally { await browser.close(); if (unpacked) await fs.rm(unpacked, { recursive: true, force: true }); }
if (failures.length) { console.error(`${failures.length} bench checks failed.`); process.exitCode = 1; }
else console.log('DIY sprite state bench browser checks passed.');
