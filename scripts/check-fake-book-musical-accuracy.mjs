// Run against node serve-local.js. Verify the real notation, audio and MIDI paths.
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await chromium.launch({ executablePath: findChromium(), headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.sounded = [];
    const original = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (t) {
      window.sounded.push(this.frequency.value);
      return original.call(this, t);
    };
  });
  await page.goto((process.env.FAKE_BOOK_BASE_URL || 'http://127.0.0.1:8080') + '/lessons/music/theory/fake-book.html');
  await page.waitForFunction(() => window.FakeBook?.state().tune);
  await page.evaluate(() => FakeBook.saveTranscription({
    id: 'accuracy-browser', title: 'Harmony accuracy check', composer: 'Test', key: 'C',
    meter: [4, 4], tempo: 240, band: 'ballad', feel: 'straight',
    melody: 'F5q C5h G5q | D5w | E5w | G5w',
    chords: 'Cmaj9:1.25 G7b9:2.75 | Cmaj7#11 | Dm11 | G7alt', about: 'Verification', source: 'Original test'
  }));
  await page.evaluate(() => {
    const e = document.querySelector('[data-fb-player]');
    e.value = 'piano'; e.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const initial = await page.evaluate(() => ({
    events: FakeBook.state().tune.events.map(e => [e.start, e.dur, e.p?.midi]),
    chords: FakeBook.state().view.concertChords.map(c => c.q),
    pcs: FakeBook.state().view.voicings.map(ns => ns.map(n => n % 12).sort((a,b) => a-b)),
    ties: document.querySelectorAll('.fb-tie').length
  }));
  assert.deepEqual(initial.chords, ['maj9', '7b9', 'maj7#11', 'm11', '7alt']);
  assert.ok(initial.pcs[0].includes(2) && initial.pcs[0].includes(11));
  assert.ok(initial.pcs[1].includes(8), 'G7b9 contains Ab');
  assert.ok(initial.pcs[2].includes(6), 'Cmaj7#11 contains F#');
  assert.equal(initial.events[0][2], 77, 'authored F5 survives');
  assert.ok(initial.ties > 0, 'the half note on beat 2 has a tie');
  for (const mode of ['open', 'shellSmooth', 'common', 'smooth']) {
    await page.evaluate(mode => {
      const e = document.querySelector(`input[name="fb-voicing"][value="${mode}"]`);
      e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true }));
    }, mode);
    assert.equal(await page.evaluate(() => FakeBook.state().view.voicings.length), 5);
  }
  await page.evaluate(() => {
    const original = FakeBookExport.fromQueue;
    FakeBookExport.fromQueue = function (q, o) {
      window.exported = JSON.parse(JSON.stringify(q));
      return original(q, o);
    };
  });
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => document.querySelector('[data-fb-export-midi]').click());
  const download = await downloadPromise;
  const midi = fs.readFileSync(await download.path());
  assert.equal(midi.toString('ascii', 0, 4), 'MThd');
  const queue = await page.evaluate(() => exported);
  assert.ok(queue.some(e => e.kind === 'pno' && e.b === 1.25 && e.ms.some(n => n % 12 === 8)), 'MIDI retains the off-grid G7b9');
  assert.ok(queue.filter(e => e.kind === 'pno' && e.b < 1.25).every(e => e.b + e.dur <= 1.25 + 1e-6), 'old harmony releases at change');
  await page.evaluate(() => document.querySelector('[data-fb-click-pattern="none"]').click());
  await page.locator('[data-fb-play]').click();
  await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(() => FakeBook.state().playing), true);
  const frequencies = await page.evaluate(() => sounded);
  assert.ok(frequencies.some(f => ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12 === 8), 'Web Audio schedules Ab for G7b9');
  await page.locator('[data-fb-play]').click();
  await page.locator('.fb-sheet-card').scrollIntoViewIfNeeded();
  if (process.env.FAKE_BOOK_SCREENSHOT_DIR) await page.screenshot({ path: process.env.FAKE_BOOK_SCREENSHOT_DIR + '/fake-book-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (process.env.FAKE_BOOK_SCREENSHOT_DIR) await page.screenshot({ path: process.env.FAKE_BOOK_SCREENSHOT_DIR + '/fake-book-mobile.png' });
  // Older saved charts must stay accessible for correction without preventing
  // the built-in library from loading when an unsupported symbol is selected.
  await page.evaluate(() => {
    history.replaceState(null, '', '#tune=legacy-unsupported');
    localStorage.setItem('fakebook:v1', JSON.stringify({ tune: 'legacy-unsupported', player: 'piano' }));
    localStorage.setItem('fakebook:imports:v1', JSON.stringify([{
      id: 'legacy-unsupported', title: 'Unsupported saved chart', composer: 'Test', key: 'C',
      meter: [4,4], tempo: 120, band: 'swing', feel: 'swing', melody: 'C5w', chords: 'C7unknown', imported: true
    }]));
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#fakebook').classList.contains('is-ready'));
  assert.notEqual(await page.evaluate(() => FakeBook.state().tune.raw.id), 'legacy-unsupported');
  assert.match(await page.locator('[data-fb-import-feedback]').textContent(), /Unsupported chord quality/);
  assert.ok(await page.evaluate(async () => (await FakeBook.savedImports()).some(t => t.id === 'legacy-unsupported')), 'the source chart remains saved');
  assert.deepEqual(errors, []);
  console.log('Fake Book: extended/altered chords, tied syncopation, voicing controls, MIDI, Web Audio and mobile layout passed.');
} finally {
  await browser.close();
}
