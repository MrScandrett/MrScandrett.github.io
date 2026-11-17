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
const browser = await chromium.launch({ executablePath: findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']), args: ['--disable-dev-shm-usage'] });
try {
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const requests = [];
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (/\/data\/(scores\/|score-library\.json)/.test(path)) requests.push(path);
    });
    let releaseFirst;
    const firstScore = new Promise(resolve => { releaseFirst = resolve; });
    await page.route('**/data/scores/bach-invention-1.json', async route => {
      await firstScore;
      await route.continue();
    });
    let releaseShelf;
    const shelfScore = new Promise(resolve => { releaseShelf = resolve; });
    await page.route('**/data/scores/bach-invention-2.json', async route => {
      await shelfScore;
      await route.continue();
    });
    await page.goto(`${base}/lessons/music/pioneers/bach.html`, { waitUntil: 'networkidle' });
    const opening = await page.locator('#composer-studio').getAttribute('data-initial-score');
    const initialRequests = ['/data/scores/index.json', `/data/scores/${opening}.json`];
    assert.deepEqual(requests.filter(path => !path.endsWith('.preview.json')).sort(), initialRequests.slice().sort(),
      'initial visit loads titles and the opening score');
    await page.selectOption('#bv-work', 'bach-invention-1');
    const studio = page.locator('#bv-score');
    const studioPreview = studio.locator('.se-selection-preview');
    await studioPreview.waitFor();
    assert.equal(await studioPreview.locator('.se-measure').count(), 12);
    assert.equal(await studio.locator('.se-spinner').count(), 1);
    await page.selectOption('#bv-work', 'bach-cello-prelude');
    await studio.locator('.se-workspace').waitFor();
    const firstResponse = page.waitForResponse('**/data/scores/bach-invention-1.json');
    releaseFirst();
    await (await firstResponse).finished();
    assert.match(await studio.locator('.se-titles strong').textContent(), /cello|prélude/i);

    await page.locator('.composer-cover[aria-controls="piece-invention-2"]').click();
    const figure = page.locator('#piece-invention-2 figure[data-score]');
    await figure.locator('.se-selection-preview').waitFor();
    assert.equal(await figure.locator('.se-selection-preview .se-measure').count(), 12);
    assert.equal(await figure.locator('.se-spinner').count(), 1);
    releaseShelf();
    await figure.locator('.se-workspace').waitFor();
    assert.ok(await figure.locator('.se-measure').count() > 12, 'preview is replaced by the complete score');
    assert.deepEqual(requests.filter(path => !path.endsWith('.preview.json')).sort(), [...initialRequests,
      '/data/scores/bach-cello-prelude.json', '/data/scores/bach-invention-1.json',
      '/data/scores/bach-invention-2.json'
    ].sort(), 'only the opening and requested pieces download');
    await page.close();
  }
  // Studio scores are rendered programmatically without data-score. Their paper
  // must still be protected from the night surface pass and skin controls.
  for (const lighting of ['day', 'night']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(mode => {
      localStorage.setItem('classroomos-skin', 'underwater');
      localStorage.setItem('classroomos-lighting-mode', 'manual');
      localStorage.setItem('classroomos-lighting-phase', mode);
    }, lighting);
    await page.goto(`${base}/lessons/music/pioneers/chopin.html`, { waitUntil: 'domcontentloaded' });
    const studio = page.locator('#bv-score');
    await page.selectOption('#bv-work', 'chopin-prelude-7');
    await studio.locator('.se-workspace').waitFor({ state: 'attached' });
    await studio.scrollIntoViewIfNeeded();
    assert.equal(await page.locator('html').getAttribute('data-lighting'), lighting);
    await page.waitForTimeout(1500); // Allow the deferred contrast guard to run.
    const colors = await studio.evaluate(figure => ({
      paper: getComputedStyle(figure).backgroundColor,
      ink: getComputedStyle(figure.querySelector('.se-score')).color,
      toolbar: getComputedStyle(figure.querySelector('.se-toolbar')).backgroundColor
    }));
    assert.deepEqual(colors, {
      paper: 'rgb(255, 253, 246)', ink: 'rgb(22, 19, 15)', toolbar: 'rgb(238, 242, 246)'
    }, `Underwater/${lighting}: studio preserves readable paper and controls`);
    await page.close();
  }
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
      await figure.locator('.se-workspace').waitFor();
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
      if (name === 'bach' && width === 1440) {
        const handle = await figure.elementHandle();
        await page.waitForFunction(f => f.scorePlayer.voices.size > 0, handle);
        await figure.evaluate(f => {
          f.playbackCheck = { timer: f.scorePlayer.timer, beat: Number(f.querySelector('.se-timeline input').value) };
          const speed = f.querySelector('.se-tempo-ctl input');
          for (const value of [85, 115, 65]) {
            speed.value = value;
            speed.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
        await page.waitForFunction(f => f.scorePlayer.activeRate === 0.65 &&
          Number(f.querySelector('.se-timeline input').value) > f.playbackCheck.beat, handle);
        await figure.locator('.se-full').click();
        await page.waitForFunction(f => document.fullscreenElement === f, handle);
        await figure.locator('.se-full').click();
        await page.waitForFunction(() => !document.fullscreenElement);
        await figure.locator('.se-settings > summary').click();
        await figure.getByLabel('Playback sound quality').selectOption('synth');
        await figure.getByLabel('Instrument sound').selectOption('organ');
        await figure.locator('.se-settings > summary').click();
        assert.ok(await figure.evaluate(f => f.scorePlayer.playing && !f.scorePlayer.loading &&
          f.scorePlayer.timer === f.playbackCheck.timer && f.scorePlayer.instrument === 'organ' &&
          !f.scorePlayer.samples), 'tempo, fullscreen and sound changes keep the same transport running');
      }
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
      if (name === 'mozart') await figure.locator('.se-fingering-toggle').click();
      await figure.locator('.se-print-score-button').click();
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
      // WebKit can fire afterprint before drawing the pages. The edition stays
      // mounted until the next interaction so Safari also prints the score.
      await page.waitForTimeout(20);
      await page.emulateMedia({ media: 'screen' });
      await page.keyboard.press('Escape');
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
