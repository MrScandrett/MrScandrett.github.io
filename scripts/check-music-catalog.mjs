#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.MUSIC_TEST_URL || 'http://localhost:8080/';
const lessons = [
  'lessons/music/bach.html',
  'lessons/music/beethoven.html',
  'lessons/music/chopin.html',
  'lessons/music/drums.html',
  'lessons/music/fake-book.html',
  'lessons/music/guitar.html',
  'lessons/music/joplin.html',
  'lessons/music/mozart.html',
  'lessons/music/music-modes-evolution.html',
  'lessons/music/piano.html',
  'lessons/music/sheet-music-trainer.html',
  'lessons/music/tchaikovsky.html',
  'lessons/music/violin-fingerboard.html',
  'lessons/music/vivaldi.html',
];
const sizes = [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }];
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--disable-dev-shm-usage'] });
let checked = 0;

try {
  for (const size of sizes) {
    const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce', hasTouch: size.width !== 1440 });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    for (const lesson of lessons) {
      const errors = [];
      page.removeAllListeners('pageerror');
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(base + lesson, { waitUntil: 'domcontentloaded' });
      const scoreCount = await page.locator('figure[data-score]').count();
      if (scoreCount) {
        await page.locator('figure[data-score]').first().locator('.se-note-list-toggle').waitFor({ state: 'attached' });
        const firstDetails = page.locator('figure[data-score]').first().locator('xpath=ancestor::details[1]');
        if (await firstDetails.count() && await firstDetails.getAttribute('open') === null) await firstDetails.locator('summary').click();
        const figure = page.locator('figure[data-score]').first();
        await figure.locator('.se-note-list-toggle').click();
        await page.evaluate(() => window.MusicNotation.setPreferences({ pitchNames: true, noteColors: true }));
        await page.waitForTimeout(100);
        assert.ok(await figure.locator('.se-pitch-label').count(), `${lesson}: pitch labels did not render`);
        assert.ok(await figure.locator('[class*="se-pitch-"]').count(), `${lesson}: note colors did not render`);
        const notes = figure.locator('.se-note-list button');
        assert.ok(await notes.count() > 1, `${lesson}: note list is empty`);
        assert.match(await notes.first().getAttribute('aria-label'), /note|rest/);
        assert.match(await notes.first().getAttribute('aria-label'), /bar|pickup/);
        await notes.first().focus();
        await notes.first().press('ArrowDown');
        assert.equal(await page.evaluate(() => document.activeElement?.closest('.se-note-list') !== null), true, `${lesson}: note list keyboard navigation failed`);
      }
      const integrity = await page.evaluate(() => ({
        zoomFigures: document.querySelectorAll('figure[data-zoomable]').length,
        lightboxScript: [...document.scripts].some((script) => script.src.includes('photo-lightbox.js')),
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      if (integrity.zoomFigures) assert.equal(integrity.lightboxScript, true, `${lesson}: zoomable figures lack lightbox script`);
      assert.ok(integrity.overflow <= 1, `${lesson}: horizontal overflow ${integrity.overflow}px at ${size.width}x${size.height}`);
      assert.deepEqual(errors, [], `${lesson}: browser errors`);
      checked++;
    }
    console.log(`${size.width}x${size.height}: ${lessons.length} music lessons passed`);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Music catalog QA passed: ${checked} lesson/viewport cases.`);
