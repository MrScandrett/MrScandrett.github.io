// Run against node serve-local.js. Check deferred tools and real canvas lifecycles.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { minify } from 'html-minifier-terser';

const origin = process.env.HOME_TEST_URL || 'http://localhost:8080/';
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
try {
  const viewports = process.argv.includes('--minified-only') ? [] : [{ width: 1366, height: 900 }, { width: 390, height: 844 }];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    // Keep external services out of this local interaction check; widgets have fallbacks.
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(origin).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    await page.addInitScript(() => {
      localStorage.setItem('classroomos-canvas-bg', JSON.stringify({ day: 'none', night: 'none' }));
      window.homeReady = [];
      document.addEventListener('home-widgetready', event => window.homeReady.push(event.detail.root.id || event.detail.root.className));
      window.sandboxFrames = 0;
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = function (callback) {
        const sandbox = new Error().stack.includes('index-sandbox.js');
        return raf.call(window, time => { if (sandbox) window.sandboxFrames++; callback(time); });
      };
    });
    await page.goto(origin);
    for (const name of ['index-sandbox.js', 'apod.js', 'science-news.js', 'index-wotd.js', 'index-lotd.js', 'index-timer.js']) {
      assert(!requests.some(url => url.endsWith('/' + name)), `${name} should wait until its panel is shown`);
    }
    assert(!requests.some(url => url.endsWith('/daily-puzzles.mjs')), 'Puzzles below the screen wait until approached');

    // Native links preserve modified clicks and do not schedule a delayed redirect.
    assert.equal(await page.locator('.home-start-class').evaluate(link => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
      link.dispatchEvent(event);
      return event.defaultPrevented;
    }), false);
    await page.evaluate(() => {
      document.addEventListener('click', event => {
        if (event.target.closest('.home-start-class')) sessionStorage.setItem('start-class-native', String(!event.defaultPrevented));
      });
    });
    const navigation = page.waitForRequest(request => new URL(request.url()).pathname === '/steam-lessons.html' && request.isNavigationRequest());
    await page.locator('.home-start-class').press('Enter');
    await navigation;
    await page.waitForURL('**/steam-lessons.html');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('start-class-native')), 'true', 'Start Class uses immediate native navigation');

    await page.goto(origin);
    await page.locator('#hometab-sandbox').click();
    await page.waitForFunction(() => window.homeReady.includes('tabpanel-sandbox'));
    await page.locator('#ptab-phys').click();
    await page.locator('#pphys-demo').click();
    await page.waitForFunction(() => window.sandboxFrames > 3);
    assert.match(await page.locator('#pphys-object-count').innerText(), /3 bodies/);

    const frames = () => page.evaluate(() => window.sandboxFrames);
    async function expectStopped(label) {
      await page.waitForTimeout(100);
      const before = await frames();
      await page.waitForTimeout(250);
      assert.equal(await frames(), before, label);
    }
    async function expectRunning(label) {
      const before = await frames();
      await page.waitForFunction(before => window.sandboxFrames > before + 2, before);
      console.log(`PASS ${label}`);
    }
    await page.setViewportSize({ width: viewport.width, height: 300 });
    await page.evaluate(() => scrollTo(0, 0));
    await expectStopped('Physics stops when scrolled off screen');
    await page.setViewportSize(viewport);
    await page.locator('#pphys-demo').scrollIntoViewIfNeeded();
    await expectRunning('Physics resumes when scrolled back into view');
    await page.locator('#hometab-today').click();
    await expectStopped('Physics stops when leaving Sandbox');
    await page.locator('#hometab-sandbox').click();
    await page.locator('#pphys-demo').scrollIntoViewIfNeeded();
    await expectRunning('Physics resumes after returning');
    assert.match(await page.locator('#pphys-object-count').innerText(), /3 bodies/);

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.testPageHidden || false });
      window.testPageHidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expectStopped('Physics stops when document is hidden');
    await page.evaluate(() => { window.testPageHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await expectRunning('Physics resumes when document is visible');

    await page.locator('#ptab-rider').click();
    await page.locator('#prider-demo').click();
    await page.locator('#prider-run').click();
    await expectRunning('Line Rider renders its course');
    await page.locator('#hometab-today').click();
    await expectStopped('Line Rider stops when leaving Sandbox');
    await page.locator('#hometab-sandbox').click();
    await page.locator('#prider-demo').scrollIntoViewIfNeeded();
    await expectRunning('Line Rider resumes after returning');
    await page.locator('#ptab-draw').click();
    await expectStopped('Drawing does not keep an animation loop alive');
    await page.locator('#hometab-today').click();

    await page.locator('#home-calendar').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getElementById('home-calendar').classList.contains('is-ready'));
    await page.locator('#home-puzzles').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !!document.querySelector('#home-puzzles [role="tablist"]'));
    await page.locator('#today-more > summary').click();
    for (const [selector, src] of [['.home-widget--apod', 'apod.js'], ['.home-widget--science-news', 'science-news.js'], ['.home-widget--wotd', 'index-wotd.js'], ['#lotd-widget', 'index-lotd.js'], ['#classroom-timer', 'index-timer.js']]) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.waitForFunction(src => [...document.scripts].some(script => script.src.endsWith('/' + src)), src);
    }
    await page.waitForFunction(() => window.homeReady.includes('classroom-timer'));
    await page.locator('#timer-start').click();
    await page.waitForFunction(() => document.getElementById('timer-digits').textContent !== '5:00');
    await page.locator('#timer-pause').click();
    await page.locator('#hometab-explore').click();
    await page.locator('.home-widget--vod').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getElementById('vod-title').textContent.length > 0);
    assert.equal(requests.filter(url => url.endsWith('/index-sandbox.js')).length, 1, 'Sandbox initializes only once');
    assert.deepEqual(errors, []);
    console.log(`PASS homepage startup, deferred widgets, and sandbox lifecycle at ${viewport.width}px`);
    await context.close();
  }

  // Minify just the changed page/scripts with the production settings, then
  // exercise a deep link, a failed download/retry, and the no-observer fallback.
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    delete window.IntersectionObserver;
    window.homeReady = [];
    document.addEventListener('home-widgetready', event => window.homeReady.push(event.detail.root.id));
  });
  let attempts = 0;
  const html = await minify(await readFile('index.html', 'utf8'), {
    collapseWhitespace: true, conservativeCollapse: true, removeComments: true,
    minifyCSS: true, minifyJS: true, keepClosingSlash: true
  });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(origin).origin) return route.abort();
    if (url.pathname.endsWith('/index-sandbox.js') && ++attempts === 1) return route.abort();
    if (url.pathname === '/' || url.pathname === '/index.html') return route.fulfill({ contentType: 'text/html', body: html });
    if (/\/index-(widgets|tabs|sandbox|video)\.js$/.test(url.pathname)) {
      const result = await transform(await readFile('.' + url.pathname, 'utf8'), { minify: true, target: 'es2022', loader: 'js' });
      return route.fulfill({ contentType: 'text/javascript', body: result.code });
    }
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('#sandbox', origin).href);
  assert.equal(await page.locator('#hometab-sandbox').getAttribute('aria-selected'), 'true');
  await page.getByRole('button', { name: 'Couldn’t load this widget. Try again' }).click();
  await page.waitForFunction(() => window.homeReady.includes('tabpanel-sandbox'));
  await page.locator('#ptab-phys').click();
  await page.locator('#pphys-demo').click();
  await page.waitForFunction(() => document.getElementById('pphys-object-count').textContent.includes('3 bodies'));
  assert.equal(attempts, 2);
  await page.evaluate(() => { location.hash = 'explore'; });
  await page.waitForFunction(() => document.getElementById('hometab-explore').getAttribute('aria-selected') === 'true');
  await page.locator('.home-widget--vod').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.getElementById('vod-title').textContent.length > 0);
  assert.deepEqual(errors, []);
  console.log('PASS minified scripts, direct hashes, widget retry, and IntersectionObserver fallback');
  await context.close();
} finally {
  await browser.close();
}
