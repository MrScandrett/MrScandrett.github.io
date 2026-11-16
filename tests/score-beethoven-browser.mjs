// Run serve-local.js first. Large selections must keep navigation and playback usable.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.SCORE_TEST_URL || 'http://127.0.0.1:8080';
const browser = await chromium.launch({ executablePath: findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']) });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/lessons/music/pioneers/beethoven.html');
    const figure = page.locator('#bv-score');
    await figure.locator('.se-score').waitFor();
    const work = page.locator('#bv-work');
    await work.selectOption('beethoven-symphony-5-1');
    const measures = figure.locator('.se-measure');
    const ink = figure.locator('.se-notation-window');
    assert.equal(await measures.count(), 503);
    assert.ok(await ink.locator('.se-ev').count());
    assert.ok(await ink.locator('*').count() < 15000, 'only nearby notation is mounted');

    const go = figure.getByRole('spinbutton', { name: 'Go to measure' });
    await go.fill('401');
    await go.press('Enter');
    await page.waitForFunction(() => {
      const fig = document.querySelector('#bv-score');
      const measure = fig.querySelector('.score-primed');
      const notation = fig.querySelector('.se-notation-window');
      return fig.scoreLayout.events.some(event => event.bar === Number(measure?.dataset.measure) &&
        event.kind === 'note' && notation.querySelector('.se-ev[data-i="' + event.i + '"]'));
    });
    assert.equal(await go.inputValue(), '401');
    await figure.locator('.se-settings > summary').click();
    await figure.getByRole('combobox', { name: 'Playback sound quality' }).selectOption('synth');
    await figure.locator('.se-play').click();
    await figure.locator('.se-notation-window .se-ev.is-on').first().waitFor({ state: 'attached' });
    await figure.locator('.se-stop').click();

    await work.selectOption('beethoven-moonlight-3');
    assert.equal(await measures.count(), 202);
    await figure.locator('.se-settings > summary').click();
    await figure.locator('.se-fingering-toggle').click();
    await ink.locator('.se-finger-number').first().waitFor({ state: 'attached' });
    await go.fill('180');
    await go.press('Enter');
    await page.waitForFunction(() => {
      const fig = document.querySelector('#bv-score');
      const bar = Number(fig.querySelector('.score-primed')?.dataset.measure);
      return fig.scoreLayout.events.some(event => event.bar === bar &&
        fig.querySelector('.se-notation-window .se-ev[data-i="' + event.i + '"] .se-finger-number'));
    });
    await page.evaluate(() => { window.print = () => {}; });
    await figure.locator('.se-print-score-button').click();
    assert.equal(await page.locator('.se-print-score-pages .se-measure').count(), 202);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Beethoven ${width}px: long selections, late-measure navigation, playback, fingerings and full print passed`);
  }
} finally {
  await browser.close();
}
