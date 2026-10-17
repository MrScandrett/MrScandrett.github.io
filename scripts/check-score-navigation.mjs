// Drives the shared ScoreNavigation (assets/js/score-navigation.js) in a score library and the Fake book,
// at desktop and phone sizes: measure click, steps, Bar # jump, map drag, zoom/Fit, follow playback and
// "Back to playback", and jumping while playing. Needs `node serve-local.js` running on :8080.
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';

const BASE = 'http://localhost:8080/lessons/music/';
const PAGES = [
  { name: 'pioneers/bach', measure: '.se-measure', play: '.se-play' },
  { name: 'pioneers/gershwin', measure: '.se-measure', play: '.se-play' },
  { name: 'pioneers/mozart', measure: '.se-measure', play: '.se-play' },
  { name: 'theory/fake-book', hash: '#tune=ode-to-joy', measure: '.fb-bar', play: '[data-fb-play]', fake: true }
];

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--disable-dev-shm-usage'] });
try {
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: size, reducedMotion: 'reduce' });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const p of PAGES) {
      // Mozart's complete 137-bar movement creates a much larger SVG than the
      // shorter regression fixtures, especially at phone width.
      page.setDefaultTimeout(p.name.includes('mozart') ? 20000 : 8000);
      await page.goto(BASE + p.name + '.html' + (p.hash || ''), { waitUntil: 'domcontentloaded' });
      let scope = page.locator('#fakebook');
      if (!p.fake) {         // the first score long enough to step around in, with its work panel open
        await page.evaluate(() => document.querySelectorAll('details:has(figure[data-score])').forEach((d) => { d.open = true; }));
        const firstCover = page.locator('.composer-cover').first();
        if (await firstCover.count()) await firstCover.click();
        await page.waitForFunction(() => [...document.querySelectorAll('figure[data-score]')].some((f) => f.querySelectorAll('.se-measure').length >= 7));
        const pick = await page.$$eval('figure[data-score]', (fs) => {
          const i = fs.findIndex((f) => f.querySelectorAll('.se-measure').length >= 7);
          const panel = i >= 0 && fs[i].closest('.composer-work-panel');
          return { i, panel: panel ? panel.id : null };
        });
        assert.ok(pick.i >= 0, p.name + ': a score with 7+ measures');
        if (pick.panel) await page.locator('.composer-cover[aria-controls="' + pick.panel + '"]').click();
        scope = page.locator('figure[data-score]').nth(pick.i);
      }
      const nav = scope.locator('.score-nav').first();
      const measure = scope.locator(p.measure).nth(2);
      await measure.waitFor({ state: 'attached' });
      if (p.fake && await page.locator('[data-fb-nav-toggle]').isVisible()) await page.locator('[data-fb-nav-toggle]').click();
      await nav.waitFor({ state: 'visible' });
      const go = nav.locator('.sn-goto input');
      const startCell = () => nav.locator('.sn-map > i').evaluateAll((cs) => cs.findIndex((c) => c.classList.contains('is-start')));
      const nowCell = () => nav.locator('.sn-map > i').evaluateAll((cs) => cs.findIndex((c) => c.classList.contains('is-cur')));

      // Click a measure in the score: it becomes the start, on the map and in the Bar # field.
      await measure.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      { const r = await measure.boundingBox(); await page.mouse.click(r.x + r.width * 0.5, r.y + r.height * 0.85); }
      assert.equal(await startCell(), 2, p.name + ': clicked measure is the start');
      const n = Number(await go.inputValue());
      // Keyboard: the next-measure button, then a typed Bar # jump.
      await nav.locator('[data-sn-step="1"]').focus();
      await nav.locator('[data-sn-step="1"]').press('Enter');
      assert.equal(Number(await go.inputValue()), n + 1, p.name + ': next measure');
      await go.fill(String(n + 3)); await go.press('Enter');
      assert.equal(await startCell(), 5, p.name + ': Bar # jump');
      // Drag on the map.
      const map = await nav.locator('.sn-map').boundingBox();
      await page.mouse.move(map.x + 2, map.y + map.height / 2); await page.mouse.down();
      await page.mouse.move(map.x + map.width * 0.6, map.y + map.height / 2, { steps: 4 }); await page.mouse.up();
      assert.ok(await startCell() > 0, p.name + ': map drag selects');
      // Zoom out, Fit, back to 100%.
      const out = nav.locator('.sn-zoom output');
      await nav.locator('[data-sn-zoom="-1"]').click();
      assert.notEqual(await out.textContent(), '100%', p.name + ': zoom out');
      await nav.locator('[data-sn-zoom="fit"]').click();
      assert.match(await out.textContent(), /%$/);
      await page.keyboard.press('0');
      assert.equal(await out.textContent(), '100%', p.name + ': 0 resets zoom');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1), p.name + ': no sideways scroll');
      await page.screenshot({ path: '/tmp/score-nav-' + p.name.split('/').pop() + '-' + size.width + '.png' });

      // Play from measure 1: the map shows the measure playing.
      await nav.locator('.sn-map').focus(); await page.keyboard.press('Home');
      assert.equal(await startCell(), 0, p.name + ': Home on the map goes to the first measure');
      const playBtn = scope.locator(p.play).first();
      await playBtn.click();
      await page.waitForFunction((el) => el.getAttribute('aria-pressed') === 'true', await playBtn.elementHandle());
      await page.waitForFunction(() => document.querySelector('.score-nav:not([hidden]) .sn-map > i.is-cur'), null, { timeout: 8000 });
      assert.ok(await nowCell() >= 0, p.name + ': playing measure on the map');
      // Clicking a measure while playing jumps there and keeps playing.
      const later = scope.locator(p.measure).nth(4);
      await later.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      { const r = await later.boundingBox(); await page.mouse.click(r.x + r.width * 0.5, r.y + r.height * 0.85); }
      assert.equal(await playBtn.getAttribute('aria-pressed'), 'true', p.name + ': still playing after a jump');
      // Scrolling away pauses following; Back to playback resumes it.
      if (p.fake) {
        await page.waitForFunction(() => document.querySelector('.score-nav:not([hidden]) .sn-map > i.is-cur'));
        await page.mouse.move(size.width / 2, size.height - 60); await page.mouse.wheel(0, 400);
        await nav.locator('.sn-resume').waitFor({ state: 'visible' });
        await nav.locator('.sn-resume').click();
        assert.equal(await nav.locator('.sn-resume').isHidden(), true, p.name + ': resume hides');
      }
      await playBtn.click();
      await page.waitForFunction(() => !document.querySelector('.score-nav:not([hidden]) .sn-map > i.is-cur'));
      console.log(p.name, size.width, 'click, keys, Bar #, map drag, zoom/Fit, playback, jump, follow passed');
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally { await browser.close(); }
