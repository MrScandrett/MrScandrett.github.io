// Run serve-local.js first. Checks the corrected edition in the real score UI.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
const browser = await chromium.launch({ executablePath: findChromium() });
try {
  for (const width of [1800, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8080/lessons/music/pioneers/chopin.html');
    await page.waitForFunction(() => window.ScoreEngine && window.MusicNotation);
    await page.evaluate(async () => {
      const score = (await (await fetch('/data/score-library.json')).json()).scores['chopin-prelude-1'];
      document.body.innerHTML = '<main><figure id="notation-review"></figure></main>';
      document.body.style.cssText = 'margin:0;padding:8px';
      MusicNotation.setPreferences({ pitchNames: false, noteColors: false });
      ScoreEngine.render(document.querySelector('figure'), { ...score, id: 'chopin-prelude-1' });
    });
    const fig = page.locator('#notation-review');
    await fig.locator('svg.se-score').waitFor();
    assert.ok(await fig.locator('.se-slur').count() >= 60);
    assert.ok(await fig.locator('.se-hairpin').count() >= 8);
    assert.ok(await fig.locator('.se-direction').filter({ hasText: 'rit.' }).count());
    const go = fig.getByRole('spinbutton', { name: 'Go to measure' });
    await go.fill('33'); await go.press('Enter');
    await fig.locator('.se-full').click();
    await page.waitForFunction(() => document.fullscreenElement || document.querySelector('.se-expanded'));
    await fig.locator('[data-sn-zoom="fit"]').click();
    await fig.locator('.se-paper').evaluate(p => { p.scrollTop = p.scrollHeight; });
    const ending = await fig.evaluate(f => {
      const model = f.scorePlayer.model;
      return model.staves.map(st => st.bars[33].events.filter(e => e.kind === 'note').map(e => e.pitches.length));
    });
    assert.deepEqual(ending, [[2], [5]]);
    await page.screenshot({ path: `/tmp/chopin-notation-${width}.png` });
    await fig.locator('.se-full').click();
    await fig.locator('.se-settings > summary').click();
    await fig.locator('.se-fingering-toggle').waitFor();
    const before = await fig.evaluate(f => f.scoreLayout.height);
    await fig.locator('.se-fingering-toggle').click();
    await page.waitForFunction(el => el.scoreLayout.height > +el.dataset.before, await fig.evaluateHandle((f, height) => { f.dataset.before = height; return f; }, before));
    assert.ok(await fig.locator('.se-finger-number').count());
    await fig.locator('.se-fingering-toggle').click();
    await page.waitForFunction(el => el.scoreLayout.height === +el.dataset.before, await fig.elementHandle());
    await page.evaluate(() => { window.print = () => {}; });
    await fig.locator('.se-print-score-button').click();
    await page.locator('.se-print-score-pages').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.se-print-score-pages .se-measure').count(), 34);
    assert.ok(await page.locator('.se-print-score-pages .se-slur').count());
    assert.ok(await page.locator('.se-print-score-pages .se-hairpin').count());
    assert.deepEqual(errors, []);
    console.log(`Chopin ${width}px: notation, final chord, full screen, fit, optional fingering and print passed`);
    await page.close();
  }
} finally { await browser.close(); }
