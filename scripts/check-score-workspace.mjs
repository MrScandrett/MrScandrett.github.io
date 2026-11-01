// Browser regression checks for score fit, a fixed transport, seek, full screen,
// paginated printing, and the Mozart fingering edition. Run serve-local.js first.
// Optional --pdf writes three review PDFs and screenshots under /tmp/score-workspace-qa.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
const base = process.env.SCORE_TEST_URL || 'http://127.0.0.1:8080';
const pdf = process.argv.includes('--pdf');
const out = '/tmp/score-workspace-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--disable-dev-shm-usage'] });
try {
  for (const width of [1440, 390].filter(w => !process.env.SCORE_TEST_WIDTH || w === +process.env.SCORE_TEST_WIDTH)) {
    for (const name of ['bach', 'gershwin', 'mozart', 'tchaikovsky'].filter(n => !process.env.SCORE_TEST_COMPOSER || n === process.env.SCORE_TEST_COMPOSER)) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      page.setDefaultTimeout(30000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/lessons/music/pioneers/${name}.html`, { waitUntil: 'domcontentloaded' });
      const cover = page.locator('.composer-cover').nth(name === 'mozart' ? 1 : 0);
      await cover.click();
      const panel = page.locator('#' + await cover.getAttribute('aria-controls'));
      const figure = panel.locator('figure[data-score]').first();
      await figure.locator('.se-score').waitFor();
      const paper = figure.locator('.se-paper');
      await figure.locator('[data-sn-zoom="fit"]').click();
      const fit = await figure.evaluate(f => {
        const p = f.querySelector('.se-paper'), svg = p.querySelector('svg');
        return { paper: p.clientWidth, score: svg.getBoundingClientRect().width, height: p.clientHeight, overflow: document.documentElement.scrollWidth - innerWidth };
      });
      assert.ok(fit.score <= fit.paper + 1, `${name}/${width}: full measure fits (${JSON.stringify(fit)})`);
      assert.ok(fit.height > 120, `${name}/${width}: useful paper height`);
      assert.ok(fit.overflow <= 1, `${name}/${width}: no page overflow`);
      const toolbar = figure.locator('.se-toolbar');
      const before = await toolbar.boundingBox();
      await paper.evaluate(p => { p.scrollTop = p.scrollHeight / 2; });
      const after = await toolbar.boundingBox();
      assert.equal(before.y, after.y, `${name}/${width}: transport stays above scrolling notation`);
      await paper.focus(); await page.keyboard.press('Space');
      await page.waitForFunction(el => el.scorePlayer.playing, await figure.elementHandle());
      await figure.locator('.se-timeline input').evaluate(input => {
        input.value = Number(input.max) * .6;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await figure.locator('.se-play').getAttribute('aria-pressed'), 'true');
      assert.ok(await figure.evaluate(f => f.scorePlayer.pos > f.scorePlayer.model.perfTotal * .59), 'seek preserves performance position through repeats');
      await figure.locator('.se-play').click();
      assert.ok(await figure.evaluate(f => f.scorePlayer.voices.size === 0), 'pause clears voices');
      await figure.locator('.se-full').click();
      await page.waitForFunction(() => !!document.fullscreenElement);
      assert.ok(await paper.evaluate(p => p.clientHeight > 120), 'full screen leaves room for notation');
      await figure.locator('[data-sn-zoom="fit"]').click();
      assert.ok(await figure.evaluate(f => {
        const paper = f.querySelector('.se-paper').getBoundingClientRect();
        const measure = f.querySelector('.score-primed').getBoundingClientRect();
        return measure.top >= paper.top - 1 && measure.bottom <= paper.bottom + 1;
      }), 'Fit retains the selected measure inside the pane');
      await page.screenshot({ path: `${out}/${name}-${width}.png` });
      await page.evaluate(() => document.exitFullscreen());
      await figure.locator('.se-settings > summary').click();
      await page.evaluate(() => { window.print = () => {}; });
      await figure.locator(name === 'mozart' ? '.mz-print-score-button' : '.se-print-score-button').click();
      await page.waitForSelector('body.se-print-score-active', { state: 'attached' });
      const pages = await page.locator('.se-print-score-page').count();
      assert.ok(pages > 0, 'score has printed pages');
      assert.equal(await page.locator('.se-print-score-pages .se-measure').count(), await figure.evaluate(f => f.scorePlayer.model.count), 'every measure prints exactly once');
      assert.ok(await page.locator('.se-print-score-page svg').evaluateAll(svgs => svgs.every(svg => {
        const ids = new Set([...svg.querySelectorAll('[id]')].map(n => n.id));
        return [...svg.querySelectorAll('use[href]')].every(use => ids.has(use.getAttribute('href').slice(1)));
      })), 'every printed sheet owns its glyph references');
      if (name === 'mozart') assert.ok(await page.locator('.se-print-score-pages .se-finger-number').count() > 0, 'fingering prints');
      await page.emulateMedia({ media: 'print' });
      const printMetrics = await page.locator('.se-print-score-page').evaluateAll(sections => sections.map(s => ({ height: s.getBoundingClientRect().height, width: s.getBoundingClientRect().width, svg: s.querySelector('svg').getBoundingClientRect().height })));
      assert.ok(printMetrics.every(p => p.height <= 960 && p.svg > 40), `${name}: score pages fit Letter height: ${JSON.stringify(printMetrics)}`);
      if (pdf && width === 1440 && name !== 'tchaikovsky') await page.pdf({ path: `${out}/${name}.pdf`, preferCSSPageSize: true, printBackground: true });
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
      assert.equal(await page.locator('.se-print-score-pages').count(), 0, 'print cleanup restores the lesson');
      await page.emulateMedia({ media: 'screen' });
      await page.evaluate(() => {
        document.body.setAttribute('data-print-lesson', '');
        window.dispatchEvent(new Event('classroomos:print-prepare'));
      });
      await page.emulateMedia({ media: 'print' });
      assert.equal(await figure.locator('.se-workspace').evaluate(w => getComputedStyle(w).display), 'none', 'lesson prints the opening instead of the scroll pane');
      assert.ok(await figure.locator('.se-print-opening svg').count() > 0, 'lesson retains engraved opening lines');
      await page.evaluate(() => { window.dispatchEvent(new Event('afterprint')); document.body.removeAttribute('data-print-lesson'); });
      await page.emulateMedia({ media: 'screen' });
      assert.deepEqual(errors, [], `${name}/${width}: no browser errors`);
      console.log(`${name} ${width}: fit, transport, seek, full screen, ${pages} print pages passed`);
      await page.close();
    }
  }
} finally { await browser.close(); }
