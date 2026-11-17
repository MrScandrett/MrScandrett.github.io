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
  // Practice marks attach to the written measure and survive reflow and reader changes.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(`${base}/lessons/music/pioneers/satie.html`, { waitUntil: 'domcontentloaded' });
    const studio = page.locator('#bv-score');
    const jump = studio.getByRole('spinbutton', { name: 'Go to measure' });
    const dialog = page.getByRole('dialog', { name: 'Score practice' });
    const note = 'Keep the bass soft. <b>Literal text</b>';
    await jump.fill('12');
    await jump.press('Enter');
    await studio.getByRole('button', { name: 'Practice', exact: true }).click();
    assert.equal(await dialog.locator('form h4').textContent(), 'Bar 12');
    await dialog.getByLabel('Measure note').fill(note);
    await dialog.getByLabel('Highlight for practice').check();
    await dialog.getByLabel('Mark as a checkpoint').check();
    await dialog.getByRole('button', { name: 'Save measure' }).click();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await studio.getByRole('button', { name: 'Score settings' }).click();
    const settings = page.getByRole('dialog', { name: 'Score settings' });
    await settings.getByLabel('Score paper').selectOption('dark');
    await settings.getByRole('button', { name: 'Done' }).click();
    assert.equal(await studio.locator('.se-score').evaluate(svg => getComputedStyle(svg).color), 'rgb(244, 241, 234)');
    await studio.getByRole('button', { name: 'Zoom in' }).click();
    assert.equal(await studio.locator('.se-practice-ink.se-practice-highlight.se-practice-checkpoint').count(), 1);
    await jump.fill('19');
    await jump.press('Enter');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#bv-score .sn-goto input')?.value === '19');
    await page.locator('#bv-mode').selectOption('melody');
    await studio.getByRole('button', { name: 'Practice', exact: true }).click();
    assert.equal(await dialog.locator('form h4').textContent(), 'Bar 19');
    assert.equal(await studio.locator('.se-paper').getAttribute('data-score-paper'), 'dark');
    await dialog.getByRole('button', { name: 'Close' }).click();

    await page.locator('.composer-cover[aria-controls*="gymnopedie1"]').click();
    const reader = page.locator('figure[data-score="satie-gymnopedie-1"]');
    await reader.getByRole('button', { name: 'Practice', exact: true }).click();
    assert.equal(await dialog.locator('li p').textContent(), note);
    await dialog.getByRole('button', { name: /Bar 12.*Checkpoint/ }).click();
    assert.equal(await reader.getByRole('spinbutton', { name: 'Go to measure' }).inputValue(), '12');
    await reader.getByRole('button', { name: 'Practice', exact: true }).click();
    await dialog.getByLabel('Measure note').fill('');
    await dialog.getByLabel('Highlight for practice').uncheck();
    await dialog.getByLabel('Mark as a checkpoint').uncheck();
    await dialog.getByRole('button', { name: 'Save measure' }).click();
    assert.equal(await dialog.locator('li').count(), 0);
    await dialog.getByRole('button', { name: 'Close' }).click();
    const toolbar = reader.locator('.se-toolbar');
    const toolbarHeight = (await toolbar.boundingBox()).height;
    const staffSize = () => reader.locator('.se-score').evaluate(svg => {
      const layout = svg.closest('figure').scoreLayout;
      return layout.S * svg.getBoundingClientRect().width / layout.width;
    });
    const originalStaffSize = await staffSize();
    assert.ok(originalStaffSize >= 10, 'default phone view keeps full-sized staves');
    await reader.getByRole('button', { name: 'Score settings' }).click();
    await settings.getByLabel('Score paper').selectOption('sepia');
    await settings.getByRole('button', { name: 'Focus view' }).click();
    await settings.getByRole('button', { name: 'Done' }).click();
    assert.ok((await toolbar.boundingBox()).height < toolbarHeight, 'Focus view gives more room to the notation');
    assert.equal(await staffSize(), originalStaffSize, 'Focus view leaves the notation at its reading size');
    assert.equal(await reader.getByRole('spinbutton', { name: 'Go to measure' }).inputValue(), '12');
    await reader.getByRole('button', { name: 'Score settings' }).click();
    assert.equal(await settings.getByRole('button', { name: 'Focus view' }).getAttribute('aria-pressed'), 'true');
    await settings.getByRole('button', { name: 'Reading size' }).click();
    assert.equal(await studio.locator('.se-practice-highlight').count(), 0);
    assert.equal(await studio.locator('.se-paper').getAttribute('data-score-paper'), 'sepia');
    await reader.getByRole('button', { name: 'Score settings' }).click();
    await settings.getByRole('button', { name: 'Finger numbers' }).click();
    await settings.getByRole('button', { name: 'Done' }).click();
    const fingering = reader.locator('.se-ev:has(.se-finger-target + .se-finger-target) .se-finger-target').first();
    await fingering.hover();
    const guide = reader.getByRole('tooltip');
    await guide.waitFor();
    const tones = await guide.locator('li').allTextContents();
    assert.ok(tones.length >= 2 && tones.every(tone => /finger [1-5]/.test(tone)), 'chord tones match annotated fingers');
    assert.equal(await guide.locator('.se-key-active').count(), tones.length);
    assert.match(await guide.textContent(), /span.*Next top note/);
    await page.keyboard.press('Escape');
    await guide.waitFor({ state: 'hidden' });
    await fingering.focus();
    await guide.waitFor();
    await page.keyboard.press('Escape');

    await reader.getByRole('button', { name: 'Score settings' }).click();
    await settings.getByLabel('Playback sound quality').selectOption('synth');
    await settings.getByRole('button', { name: 'Done' }).click();
    const roll = reader.getByRole('button', { name: 'Piano roll' });
    await roll.click();
    const scene = reader.locator('.se-roll-scene');
    await scene.locator('svg').waitFor();
    await reader.getByRole('button', { name: 'Score strip' }).click();
    const strip = reader.locator('.se-roll-strip');
    await strip.locator('svg use').first().waitFor({ state: 'attached' });
    assert.ok(await strip.evaluate(el => el.scrollWidth > el.clientWidth), 'the score strip can scroll horizontally');
    assert.ok(await strip.evaluate(element => {
      const svg = element.firstElementChild;
      const bounds = svg.viewBox.baseVal;
      return element.scrollHeight <= element.clientHeight + 1 &&
        Array.from(svg.children).filter(node => !node.classList.contains('se-strip-playhead')).every(node => {
          const ink = node.getBBox();
          const shift = node.transform.baseVal.consolidate().matrix.f;
          return ink.y + shift >= 0 && ink.y + ink.height + shift <= bounds.height;
        });
    }), 'all score strip notation fits vertically without clipping');
    const playhead = strip.locator('.se-strip-playhead');
    const cursorAtStart = await playhead.getAttribute('transform');
    const scoreHandle = await reader.elementHandle();
    await reader.evaluate(figure => {
      const notation = figure.querySelector('.se-score');
      figure.rollCheck = { changes: 0, notes: figure.querySelector('.se-roll-scene svg > g:nth-child(3)').innerHTML };
      const observer = new MutationObserver(() => { figure.rollCheck.changes++; });
      observer.observe(notation, { childList: true, attributes: true, subtree: true });
    });
    await reader.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction(figure => figure.scorePlayer.playing &&
      figure.querySelector('.se-roll-scene svg > g:nth-child(3)').innerHTML !== figure.rollCheck.notes, scoreHandle);
    assert.equal(await reader.evaluate(figure => figure.rollCheck.changes), 0, 'notation stays idle while the roll plays');
    await page.waitForFunction(({ figure, start }) =>
      figure.querySelector('.se-strip-playhead').getAttribute('transform') !== start &&
      figure.querySelector('.se-roll-strip').scrollLeft > 0, { figure: scoreHandle, start: cursorAtStart });
    const followStrip = reader.getByRole('button', { name: 'Follow score strip' });
    await followStrip.click();
    await strip.evaluate(element => { element.scrollLeft = 0; });
    const cursorBeforeManualScroll = await playhead.getAttribute('transform');
    await page.waitForFunction(({ figure, start }) =>
      figure.querySelector('.se-strip-playhead').getAttribute('transform') !== start,
    { figure: scoreHandle, start: cursorBeforeManualScroll });
    assert.equal(await strip.evaluate(element => element.scrollLeft), 0, 'manual browsing holds its scroll position');
    await followStrip.click();
    assert.ok(await strip.evaluate(element => element.scrollLeft > 0), 're-enabling follow returns to playback');
    await reader.evaluate(figure => { figure.rollCheck.timer = figure.scorePlayer.timer; });
    const visualization = reader.getByLabel('Visualization');
    await visualization.selectOption('horizontal');
    await scene.locator('path').first().waitFor();
    await reader.locator('.se-graph-legend summary').click();
    await reader.locator('.se-graph-legend').getByText('Left hand · Voice 2', { exact: true }).waitFor();
    const intervalShading = reader.getByLabel('Interval shading');
    await intervalShading.uncheck();
    assert.equal(await intervalShading.isChecked(), false);
    await intervalShading.check();
    assert.ok(await scene.locator('.se-graph-pitch-grid').isVisible());
    await reader.locator('.se-graph-legend summary').click();
    assert.equal(await reader.evaluate(figure => figure.rollCheck.changes), 0, 'engraving stays idle in horizontal view');
    await visualization.selectOption('roll');
    await scene.locator('svg > g:nth-child(5)').waitFor();
    await roll.click();
    assert.ok(await reader.evaluate(figure => figure.scorePlayer.playing && figure.scorePlayer.timer === figure.rollCheck.timer),
      'switching views keeps the same transport');
    assert.equal(await scene.isVisible(), false);
    await reader.getByRole('button', { name: 'Pause', exact: true }).click();
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
        await figure.getByRole('button', { name: 'Score settings' }).click();
        await figure.getByLabel('Playback sound quality').selectOption('synth');
        await figure.getByLabel('Instrument sound').selectOption('organ');
        await figure.getByRole('button', { name: 'Done' }).click();
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
      await figure.getByRole('button', { name: 'Score settings' }).click();
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
      if (name === 'mozart') {
        assert.ok(await page.locator('.se-print-score-pages .se-finger-number').count() > 0, 'fingering prints');
        assert.equal(await page.locator('.se-print-score-pages .se-finger-guide, .se-print-score-pages .se-finger-target').count(), 0);
      }
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
