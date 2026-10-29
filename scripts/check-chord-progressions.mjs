// Run against node serve-local.js. Exercises the lesson's real DOM and Web Audio paths.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const origin = process.env.MUSIC_TEST_URL || 'http://localhost:8080/';
let cardsChecked = 0;
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.chordTestSounds = [];
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      const create = Audio.prototype.createOscillator;
      Audio.prototype.createOscillator = function () {
        const oscillator = create.call(this), start = oscillator.start.bind(oscillator);
        oscillator.start = (...args) => {
          window.chordTestSounds.push({ frequency: oscillator.frequency.value, state: this.state });
          return start(...args);
        };
        return oscillator;
      };
    });
    await page.goto(new URL('lessons/music/theory/chord-progressions.html', origin).href);
    await page.waitForFunction(() => !document.querySelector('#cp-lab-controls').disabled);
    for (const [kind, expectedCount] of [['library', 13], ['lab', 12]]) {
      const count = await page.locator(`#cp-${kind}-select option`).count();
      assert.equal(count, expectedCount);
      for (let i = 0; i < count; i++) {
        await page.selectOption(`#cp-${kind}-select`, String(i));
        const cards = page.locator(`#cp-${kind}-trail button`);
        assert.ok(await cards.count() >= 3);
        for (let j = 0; j < await cards.count(); j++) {
          const before = await page.evaluate(() => window.chordTestSounds.length);
          // A real keyboard gesture covers both activation and focus retention.
          await cards.nth(j).focus();
          await cards.nth(j).press('Enter');
          assert.equal(await cards.nth(j).getAttribute('aria-pressed'), 'true');
          assert.ok((await page.locator(`#cp-${kind}-inspect h4`).innerText()).startsWith(`Bar ${j + 1} ·`));
          assert.ok(await page.evaluate(n => window.chordTestSounds.length >= n + 4, before), 'Chord must create bass and harmony voices');
          assert.ok(await cards.nth(j).evaluate(node => node === document.activeElement), 'Inspecting a chord keeps keyboard focus');
          cardsChecked++;
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${kind} ${i}: overflow`);
      }
      // Voicing changes retain the same chord map and safely stop playback.
      await page.selectOption(`#cp-${kind}-voicing`, 'root');
      await page.selectOption(`#cp-${kind}-voicing`, 'smooth');
      await page.locator(`#cp-${kind}-step`).click();
      assert.match(await page.locator(`#cp-${kind}-inspect h4`).innerText(), /^Bar 2/);
      await page.locator(`#cp-${kind}-play`).click();
      assert.equal(await page.locator(`#cp-${kind}-play`).getAttribute('aria-pressed'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator(`#cp-${kind}-play`).getAttribute('aria-pressed'), 'false');
      await page.locator(`#cp-${kind}-play`).click();
      await page.locator(`#cp-${kind}-stop`).click();
      assert.equal(await page.locator('.cp-playing').count(), 0);
    }
    await page.selectOption('#cp-lab-select', '3'); // D7 → G in C
    await page.locator('#cp-lab-trail button').nth(1).click();
    assert.match(await page.locator('#cp-lab-inspect').innerText(), /D – F♯ – A – C/);
    const pitches = await page.evaluate(() => window.chordTestSounds.slice(-5).map(s => Math.round(69 + 12 * Math.log2(s.frequency / 440)) % 12));
    assert.deepEqual([...new Set(pitches)].sort((a,b) => a-b), [0,2,6,9], 'D7 audio must contain D F♯ A C');
    await page.locator('#cp-lab-answer summary').click();
    assert.equal(await page.locator('#cp-lab-answer').getAttribute('open'), '');
    await page.locator('[data-cp-study="5"]').click();
    assert.equal(await page.locator('#cp-lab-select').inputValue(), '5');
    assert.equal(await page.locator('#cp-lab-answer').getAttribute('open'), null);
    await page.locator('#cp-lab-trail button').nth(3).click();
    assert.match(await page.locator('#cp-lab-inspect').innerText(), /vi in C = ii in G/);
    assert.match(await page.locator('#cp-lab-inspect').innerText(), /reference on G\): 2m/);
    for (const answer of ['stay', 'bass', 'visit']) {
      await page.locator(`[data-cp-answer="${answer}"]`).click();
      assert.ok((await page.locator('#cp-knowledge-feedback').innerText()).length > 50);
    }
    // Shared speed, natural completion, and transport exclusivity.
    await page.locator('#cp-lab-tempo').fill('160');
    await page.locator('#cp-lab-tempo').dispatchEvent('input');
    assert.equal(await page.locator('#cp-library-bpm').innerText(), '160 BPM');
    assert.equal(await page.locator('#cp-loop-tempo').inputValue(), '160');
    await page.selectOption('#cp-library-select', '3');
    await page.locator('#cp-library-play').click();
    await page.waitForFunction(() => document.querySelector('#cp-library-status').textContent.startsWith('Example finished'), null, { timeout: 15000 });
    assert.equal(await page.locator('#cp-library-play').getAttribute('aria-pressed'), 'false');
    await page.locator('#cp-lab-play').click();
    await page.locator('#cp-loop-play').click();
    assert.equal(await page.locator('#cp-lab-play').getAttribute('aria-pressed'), 'false');
    await page.locator('#cp-loop-stop').click();
    await page.locator('[data-progression="1,4,0"]').click();
    await page.selectOption('#cp-loop-key', 'Bb');
    assert.match(await page.locator('#cp-loop').innerText(), /Cm/);
    await page.locator('#cp-loop-undo').click();
    assert.equal(await page.locator('#cp-loop button').count(), 2);
    await page.locator('#cp-loop-clear').click();
    assert.equal(await page.locator('#cp-loop-play').isDisabled(), true);
    await page.locator('#cp-palette button').first().click();
    assert.equal(await page.locator('#cp-loop button').count(), 1);
    // Existing Fake Book workspace still translates, reveals and exports.
    await page.selectOption('#cp-key', 'G');
    await page.selectOption('#cp-system', 'nashville');
    await page.locator('.cp-scratchpad summary').click();
    await page.locator('#cp-reveal').click();
    assert.equal(await page.locator('#cp-reference').isVisible(), true);
    await page.locator('#cp-draft').fill('1 | 4');
    await page.locator('#cp-compare').click();
    assert.match(await page.locator('#cp-feedback').innerText(), /Reference comparison/);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#cp-export').click();
    assert.match((await downloadPromise).suggestedFilename(), /^rehearsal-.*\.txt$/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []);
    console.log(`${viewport.width}px: all examples, audio pitches, keyboard, playback, quiz, and song workspace passed`);
    await page.close();
  }
  console.log(`Verified ${cardsChecked} chord-card activations across desktop and phone.`);
} finally {
  await browser.close();
}
