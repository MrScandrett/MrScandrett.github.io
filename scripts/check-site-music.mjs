// Exercise real HTMLAudioElement playback with deterministic WAV responses; remote hosts are
// checked separately, so a Commons outage doesn't mask a navigation/player regression.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import { collectRecordings } from './build-recording-library.mjs';

const base = process.env.SITE_URL || 'http://127.0.0.1:5501';
const library = JSON.parse(await readFile(new URL('../data/recording-library.json', import.meta.url), 'utf8'));
assert.deepEqual(library, await collectRecordings(), 'Every lesson recording must be present with its original credit');
assert.equal(new Set(library.tracks.map(t => t.src)).size, library.tracks.length);
assert(library.tracks.every(t => t.credit && t.source && t.lesson));
const wav = Buffer.alloc(44 + 8000 * 2 * 90);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
function serveAudio(route) {
  const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
  if (!range) return route.fulfill({ contentType: 'audio/wav', headers: { 'Accept-Ranges': 'bytes' }, body: wav });
  const start = Number(range[1]), end = range[2] ? Math.min(wav.length - 1, Number(range[2])) : wav.length - 1;
  return route.fulfill({ status: 206, contentType: 'audio/wav', headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${wav.length}` }, body: wav.subarray(start, end + 1) });
}
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--disable-dev-shm-usage'] });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  let failMP3 = false, failAll = false;
  await context.route('**/assets/audio/classroom-radio/*.mp3', serveAudio);
  await context.route(/https:\/\/upload\.wikimedia\.org\/.*\.(?:mp3|ogg|flac)(?:\?.*)?$/, route => {
    if (failAll || (failMP3 && route.request().url().endsWith('.mp3'))) return route.fulfill({ status: 404, body: '' });
    return serveAudio(route);
  });
  await context.route('**/assets/vendor/firebase-compat.min.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.firebase={initializeApp(){},database(){return{ref(){return{on(){}}}}}};' }));
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/listen.html?browse=about.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('.music-track').first().waitFor();
  assert.equal(await page.locator('.music-track').count(), library.tracks.length);
  console.log('Checking library controls and playback…');
  await page.locator('#music-search').fill('cello');
  assert.equal(await page.locator('.music-track').count(), 1);
  await page.locator('#music-search').fill('no such recording');
  assert.equal(await page.locator('.music-track').count(), 0);
  await page.locator('#music-search').fill('');
  await page.locator('#music-composer').selectOption({ label: library.tracks[0].composer });
  assert.equal(await page.locator('.music-track').count(), library.tracks.filter(t => t.composer === library.tracks[0].composer).length);
  await page.locator('#music-composer').selectOption('');
  await page.locator('#music-play').click();
  await page.waitForFunction(() => document.querySelector('audio').currentTime > .3);
  const identity = await page.evaluateHandle(() => document.querySelector('audio'));
  await page.locator('#music-maximize').click();
  assert(await page.locator('#site-player').evaluate(el => el.classList.contains('is-maximized')));
  await page.locator('#music-minimize').click();
  assert(await page.locator('#music-library').isHidden());
  assert(await page.locator('#music-browser').evaluate(el => el.clientHeight === innerHeight), 'Minimized player must float over the full-height website');
  assert((await page.locator('#site-player').boundingBox()).width <= 364, 'Minimized player should be a compact floating panel');
  for (const id of ['music-previous', 'music-play', 'music-next', 'music-shuffle', 'music-seek', 'music-elapsed', 'music-duration']) assert(await page.locator(`#${id}`).isVisible(), `${id} must remain visible when minimized`);
  assert.equal(await page.locator('#music-duration').textContent(), '1:30');
  await page.locator('#music-play').click();
  assert.equal(await page.locator('#music-play').getAttribute('aria-label'), 'Play music');
  await page.locator('#music-play').click();
  assert.equal(await page.locator('#music-play').getAttribute('aria-label'), 'Pause music');
  await page.locator('#music-shuffle').click();
  assert.equal(await page.locator('#music-shuffle').getAttribute('aria-pressed'), 'true');
  await page.locator('#music-shuffle').click();
  await page.locator('#music-seek').evaluate(el => { el.value = '25'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector('audio').currentTime >= 22);
  assert.match(await page.locator('#music-seek').getAttribute('aria-valuetext'), /^0:2\d of 1:30$/);
  console.log('PASS compact player, visible controls/timeline, and minimized seeking/shuffle');
  await page.locator('#music-expand').click();
  assert(await page.locator('#site-player').evaluate(el => el.classList.contains('is-tiny')));
  assert((await page.locator('#site-player').boundingBox()).height <= 48, 'Single-row player must stay tiny');
  assert.equal(await page.locator('#music-expand').getAttribute('aria-label'), 'Restore compact player');
  for (const id of ['music-previous', 'music-play', 'music-next', 'music-shuffle', 'music-repeat', 'music-elapsed', 'music-duration']) assert(await page.locator(`#${id}`).isVisible(), `${id} missing from single row`);
  await page.locator('#music-repeat').click();
  assert(await page.evaluate(() => document.querySelector('audio').loop), 'Loop current recording must use native audio looping');
  await page.evaluate(() => { document.querySelector('audio').currentTime = 89.85; });
  await page.waitForFunction(() => document.querySelector('audio').currentTime < 2 && !document.querySelector('audio').paused);
  assert.equal(await page.evaluate(() => window.SiteMusic.snapshot().track.id), 'satie-1', 'Loop one must stay on the same recording');
  await page.locator('#music-repeat').click();
  assert.equal(await page.locator('#music-repeat-description').textContent(), 'Loop: all recordings');
  assert.equal(await page.evaluate(() => document.querySelector('audio').loop), false);
  await page.evaluate(id => window.SiteMusic.select(id, true), library.tracks.at(-1).id);
  await page.waitForFunction(() => document.querySelector('audio').readyState >= 2);
  await page.evaluate(() => { document.querySelector('audio').currentTime = 89.85; });
  await page.waitForFunction(id => window.SiteMusic.snapshot().track.id === id, library.tracks[0].id);
  await page.locator('#music-repeat').click();
  assert.equal(await page.locator('#music-repeat').getAttribute('aria-pressed'), 'false');
  await page.evaluate(() => window.SiteMusic.select('satie-1', true));
  await page.locator('#music-library-toggle').click();
  assert(await page.locator('#music-library').isVisible());
  assert.equal(await page.locator('#site-player').evaluate(el => el.classList.contains('is-tiny')), false);
  await page.locator('#music-minimize').click();
  assert(await page.locator('#site-player').evaluate(el => el.classList.contains('is-tiny')));
  await page.locator('#music-expand').click();
  assert.equal(await page.locator('#site-player').evaluate(el => el.classList.contains('is-tiny')), false);
  console.log('PASS third collapse size, native track looping, library looping, and restoring sizes');
  await page.locator('#music-browser').evaluate(el => { el.src = 'student-fishtank.html?preview=1'; });
  const fish = page.frameLocator('#music-browser');
  console.log('Checking fish controls and continuous navigation…');
  await fish.locator('#mPlayBtn').waitFor();
  await page.waitForFunction(() => document.querySelector('iframe').contentWindow.SiteMusic?.snapshot().playing);
  assert.equal(await fish.locator('#mPlayBtn').getAttribute('aria-pressed'), 'true');
  await fish.locator('#mPlayBtn').click();
  assert(await page.evaluate(() => document.querySelector('audio').paused));
  await fish.locator('#mPlayBtn').click();
  await page.waitForFunction(() => !document.querySelector('audio').paused);
  const timeBefore = await page.evaluate(() => document.querySelector('audio').currentTime);
  // Follow an actual page link; only the browsing frame should navigate.
  await fish.locator('header a.brand').click();
  await page.waitForFunction(() => document.querySelector('iframe').contentWindow.location.pathname.endsWith('/index.html'));
  assert(await page.evaluate(element => element === document.querySelector('audio'), identity));
  assert(await page.evaluate(time => !document.querySelector('audio').paused && document.querySelector('audio').currentTime >= time, timeBefore));
  // Navigate again to a deep lesson with full page scripts, then use its own audio.
  await page.locator('#music-library-toggle').click();
  await page.locator('#recording-lesson').press('Enter');
  assert(await page.locator('#music-browser').evaluate(el => el === document.activeElement), 'Composer navigation must leave focus in the browsing frame');
  await page.waitForFunction(() => document.querySelector('iframe').contentWindow.location.pathname.includes('/lessons/music/pioneers/'));
  assert(await page.evaluate(element => element === document.querySelector('audio'), identity));
  const lesson = page.frameLocator('#music-browser');
  await lesson.locator('.music-continue').waitFor();
  await lesson.locator('audio').first().evaluate(el => el.play());
  await page.waitForFunction(() => document.querySelector('audio').paused);
  await lesson.locator('.music-continue').click();
  await page.waitForFunction(() => !document.querySelector('audio').paused);
  assert(await lesson.locator('audio').first().evaluate(el => el.paused));
  console.log('Checking seeking, preferences, and source fallback…');
  // Seek, preferences, next/previous, end-of-library, and source-format fallback.
  await page.waitForFunction(() => document.querySelector('audio').readyState >= 2 && document.querySelector('audio').duration > 80);
  await page.locator('#music-seek').evaluate(el => { el.value = '50'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector('audio').currentTime >= 44);
  await page.locator('#player-volume').fill('0.2');
  assert.equal(await page.evaluate(() => document.querySelector('audio').volume), .2);
  await page.evaluate(() => window.SiteMusic.select('satie-1', false));
  await page.locator('#music-next').click();
  assert.equal(await page.evaluate(() => window.SiteMusic.snapshot().track.id), 'satie-2');
  await page.locator('#music-previous').click();
  assert.equal(await page.evaluate(() => window.SiteMusic.snapshot().track.id), 'satie-1');
  failMP3 = true;
  await page.evaluate(() => window.SiteMusic.select('bach-1', true));
  await page.waitForFunction(() => document.querySelector('audio').src.endsWith('.ogg') && document.querySelector('audio').currentTime > .1);
  failAll = true;
  await page.evaluate(() => window.SiteMusic.select('bach-2', true));
  await page.waitForFunction(() => document.querySelector('#music-status').textContent.includes('unavailable'));
  failAll = false; failMP3 = false;
  await page.locator('#music-play').click();
  await page.waitForFunction(() => document.querySelector('audio').currentTime > .1);
  await page.evaluate(() => window.SiteMusic.select('satie-1', false));
  await page.locator('#music-shuffle').click();
  await page.locator('#music-repeat').click();
  await page.locator('#music-mute').click();
  await page.reload();
  await page.locator('.music-track').first().waitFor();
  assert.equal(await page.locator('#music-shuffle').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#music-repeat').getAttribute('aria-pressed'), 'true');
  assert(await page.evaluate(() => document.querySelector('audio').loop), 'Loop mode must survive reloads');
  assert.equal(await page.evaluate(() => document.querySelector('audio').volume), .2);
  assert.equal(await page.locator('#music-mute').getAttribute('aria-pressed'), 'true');
  await page.locator('#player-volume').fill('0.3');
  assert.equal(await page.locator('#music-mute').getAttribute('aria-pressed'), 'false');
  assert(await page.evaluate(() => document.querySelector('audio').paused));
  console.log('PASS catalog, playback, continuous navigation, fish controls, lesson handoff, search, seeking, fallback, and preferences');

  console.log('Checking noise generators…');
  // Worklet module requests do not pass through Playwright's page routing.
  await page.evaluate(() => {
    const addModule = AudioWorklet.prototype.addModule;
    AudioWorklet.prototype.addModule = () => {
      AudioWorklet.prototype.addModule = addModule;
      return Promise.reject(new DOMException('Test worklet failure', 'AbortError'));
    };
  });
  await page.locator('.music-noise-color[data-noise="white"]').click();
  await page.getByRole('status').filter({ hasText: 'The noise generator could not start.' }).waitFor();
  assert(await page.evaluate(() => document.querySelector('audio').paused));
  await page.locator('#music-play').click();
  // Each colour is computed live and handed to the same <audio> element; measure what it receives.
  const noiseLevel = () => page.evaluate(async () => {
    const ctx = new AudioContext(), analyser = ctx.createAnalyser();
    analyser.fftSize = 8192;
    ctx.createMediaStreamSource(document.querySelector('audio').srcObject).connect(analyser);
    await ctx.resume();
    await new Promise(resolve => setTimeout(resolve, 700));
    const wave = new Float32Array(analyser.fftSize), spectrum = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatTimeDomainData(wave); analyser.getFloatFrequencyData(spectrum);
    const bin = hz => Math.round(hz / ctx.sampleRate * analyser.fftSize);
    const band = (lo, hi) => { let sum = 0; for (let k = bin(lo); k < bin(hi); k++) sum += 10 ** (spectrum[k] / 10); return 10 * Math.log10(sum / (bin(hi) - bin(lo))); };
    await ctx.close();
    return { rms: Math.sqrt(wave.reduce((sum, v) => sum + v * v, 0) / wave.length), tilt: (band(4000, 8000) - band(250, 500)) / 4 };
  });
  for (const [id, slope] of [['white', 0], ['pink', -3], ['brown', -6], ['blue', 3], ['violet', 6]]) {
    if (id !== 'white') await page.locator(`.music-noise-color[data-noise="${id}"]`).click();
    await page.waitForFunction(() => !document.querySelector('audio').paused);
    await page.waitForFunction(() => document.querySelector('#music-status').textContent === '');
    const { rms, tilt } = await noiseLevel();
    assert(rms > .02 && Math.abs(tilt - slope) < 1.5, `${id} noise: RMS ${rms.toFixed(3)}, ${tilt.toFixed(1)} dB/octave`);
    assert.equal(await page.locator(`.music-noise-color[data-noise="${id}"]`).getAttribute('aria-pressed'), 'true');
  }
  assert.equal(await page.locator('#music-duration').textContent(), '∞');
  assert(await page.locator('#music-seek').isDisabled());
  assert(await page.locator('#music-repeat').isDisabled());
  assert(await page.locator('#music-shuffle').isDisabled());
  assert(await page.locator('#recording-source').isHidden());
  await page.locator('#music-next').click();
  assert.equal(await page.evaluate(() => window.SiteMusic.snapshot().track.id), 'noise-white', 'Next steps through the noise colours');
  await page.reload();
  await page.locator('.music-track').first().waitFor();
  assert.equal(await page.locator('#playing-title').textContent(), 'White noise', 'The player comes back to the last noise generator');
  assert(await page.evaluate(() => document.querySelector('audio').paused));
  await page.locator('#music-search').fill('satie gymnopedie');
  assert.equal(await page.locator('.music-track').count(), 2);
  assert.equal(await page.locator('.music-track[aria-current="true"]').count(), 0);
  await page.locator('.music-track[data-track="satie-1"]').click();
  await page.waitForFunction(() => !document.querySelector('audio').srcObject && !document.querySelector('audio').paused);
  assert(await page.locator('#recording-source').isVisible());
  assert.equal(await page.locator('.music-noise-color[aria-pressed="true"]').count(), 0);
  console.log('PASS five noise colours at their slopes, noise next/resume, and switching back to recordings');

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.SiteMusic.expand(true));
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, dock: document.querySelector('.music-dock').getBoundingClientRect().toJSON(), panel: document.querySelector('.music-library').getBoundingClientRect().toJSON() }));
    assert(dimensions.scrollWidth <= dimensions.width + 1, `Overflow at ${viewport.width}`);
    assert(dimensions.dock.bottom <= viewport.height + 1 && dimensions.panel.top >= -1);
    await page.locator('#music-minimize').click();
    for (const id of ['music-play', 'music-next', 'music-previous', 'music-shuffle', 'music-seek']) {
      const box = await page.locator(`#${id}`).boundingBox();
      assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height, `${id} cropped at ${viewport.width}x${viewport.height}`);
    }
    await page.locator('#music-library-toggle').focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('#music-library-title').evaluate(el => el === document.activeElement));
    await page.locator('#music-search').fill('cello');
    await page.locator('#music-search').press('Escape');
    assert.equal(await page.locator('#music-search').inputValue(), '');
    assert(await page.locator('#music-library').isVisible());
    await page.keyboard.press('Escape');
    assert(await page.locator('#music-library-toggle').evaluate(el => el === document.activeElement));
    await page.locator('#music-expand').click();
    const tiny = await page.locator('#site-player').boundingBox();
    assert(tiny.height <= 48 && tiny.x >= 0 && tiny.x + tiny.width <= viewport.width, `Tiny player cropped at ${viewport.width}`);
    for (const id of ['music-expand', 'music-play', 'music-next', 'music-previous', 'music-shuffle', 'music-repeat', 'music-library-toggle', 'music-elapsed', 'music-duration']) {
      const box = await page.locator(`#${id}`).boundingBox();
      assert(box && box.x >= tiny.x && box.y >= tiny.y && box.x + box.width <= tiny.x + tiny.width && box.y + box.height <= tiny.y + tiny.height, `${id} overflows single row at ${viewport.width}`);
    }
    await page.locator('#music-expand').click();
  }
  console.log('PASS phone, narrow phone, landscape, and keyboard controls');

  let failCatalog = true;
  await context.route('**/data/recording-library.json', route => failCatalog ? route.abort() : route.continue());
  await page.reload();
  await page.getByRole('status').filter({ hasText: 'The recording library could not load.' }).waitFor();
  const retry = page.getByRole('button', { name: 'Retry loading recordings' });
  failCatalog = false;
  await retry.press('Enter');
  await page.locator('.music-track').first().waitFor();
  assert(await retry.isHidden());
  assert(await page.locator('#music-library-title').evaluate(el => el === document.activeElement));
  console.log('PASS catalog retry with keyboard focus and live status');
  await context.close();
  // Enter listening mode from the aquarium's own Play button.
  const entryContext = await browser.newContext({ reducedMotion: 'reduce' });
  await entryContext.route(/https:\/\/upload\.wikimedia\.org\/.*\.(?:mp3|ogg|flac)$/, serveAudio);
  await entryContext.route('**/assets/audio/classroom-radio/*.mp3', serveAudio);
  const entry = await entryContext.newPage();
  await entry.goto(`${base}/student-fishtank.html?preview=1`);
  await entry.waitForFunction(() => window.SiteMusic?.snapshot().track);
  await entry.locator('#mPlayBtn').click();
  await entry.waitForURL('**/listen.html?**');
  await entry.waitForFunction(() => document.querySelector('audio') && !document.querySelector('audio').paused && document.querySelector('audio').currentTime > .1);
  console.log('PASS aquarium opens the shared player and starts a recording');
  await entryContext.close();

  const classroom = await browser.newContext({ viewport: { width: 1920, height: 1080 }, hasTouch: true });
  await classroom.addInitScript(() => { delete window.ResizeObserver; });
  await classroom.route('https://upload.wikimedia.org/**', route => route.fulfill({ status: 429, body: '' }));
  const board = await classroom.newPage();
  board.on('pageerror', error => errors.push(error.message));
  await board.goto(`${base}/listen.html?browse=about.html&play=1`);
  await board.getByRole('status').filter({ hasText: 'Tap Play to start listening on this device.' }).waitFor();
  await board.locator('#music-play').tap();
  const playsCopy = file => board.waitForFunction(name => {
    const audio = document.querySelector('audio');
    return audio.currentSrc === new URL(name, location.href).href && audio.currentTime > .15;
  }, `assets/audio/classroom-radio/${file}.mp3`);
  await playsCopy('satie-gymnopedie-1');
  await board.locator('.music-track[data-track="bach-3"]').tap();
  await playsCopy('bach-air');
  await board.locator('.music-track[data-track="bach-2"]').tap();
  await board.locator('#music-classroom-copy').tap();
  await playsCopy('satie-gymnopedie-1');
  console.log('PASS autoplay recovery and real classroom recordings with Wikimedia rate-limited');
  await classroom.close();
  assert.deepEqual(errors, [], 'Browser errors');
} finally { await browser.close(); }
