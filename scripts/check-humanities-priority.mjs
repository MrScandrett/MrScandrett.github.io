// Run with node serve-local.js. Covers the four priority humanities lessons.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const origin = process.env.HUMANITIES_TEST_URL || 'http://127.0.0.1:8080/';
const routes = ['tragedy-of-the-commons', 'states/florida', 'pioneers/leonardo-da-vinci', 'social-media-algorithms'];
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
let views = 0;
try {
  for (const width of [1440, 390]) {
    for (const route of routes) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(new URL(`lessons/humanities/${route}.html`, origin).href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.PhotoLightbox);
      assert.equal(await page.locator('main figure:not([data-zoomable])').count(), 0, `${route}: every image figure supports enlargement`);
      const images = page.locator('main figure[data-zoomable] img');
      for (let i = 0; i < await images.count(); i++) {
        const img = images.nth(i);
        if (new URL(await img.getAttribute('src'), page.url()).origin !== new URL(origin).origin) continue;
        await img.scrollIntoViewIfNeeded();
        await img.evaluate(el => el.decode());
        await img.focus();
        await img.press('Enter');
        await page.waitForSelector('.plb-open');
        assert.ok((await page.locator('.plb-caption').innerText()).trim().length > 30);
        await page.keyboard.press('Escape');
        assert.ok(await img.evaluate(el => el === document.activeElement));
      }
      if (route === 'tragedy-of-the-commons') {
        await page.locator('#pastureCanvas').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => {
          const c = document.querySelector('#pastureCanvas');
          return c.width > 0 && c.getContext('2d').getImageData(0, 0, 1, 1).data[3] > 0;
        });
        await page.selectOption('#commons-rule', 'quota');
        for (let i = 0; i < 20; i++) await page.locator('#advanceBtn').click();
        assert.equal(await page.locator('#advanceBtn').isEnabled(), true, 'quota sustains the modeled pasture');
        assert.ok(Number(await page.locator('#healthPct').innerText()) >= 50);
        assert.equal(await page.locator('#commons-results tr').count(), 10);
        assert.equal(await page.locator('#f2Herd').innerText(), '3', 'quota applies to every farmer');
        await page.selectOption('#commons-rule', 'open');
        await page.locator('#f1Slider').fill('10');
        for (let i = 0; i < 40 && await page.locator('#advanceBtn').isEnabled(); i++) await page.locator('#advanceBtn').click();
        assert.equal(await page.locator('#advanceBtn').isEnabled(), false, 'sustained heavy grazing collapses the pasture');
        assert.match(await page.locator('#commons-status').innerText(), /collapsed/);
        await page.locator('#resetBtn').click();
        assert.equal(await page.locator('#healthPct').innerText(), '100');
        assert.equal(await page.locator('#commons-results tr').count(), 1);
      }
      const quiz = page.locator('form.lesson-check');
      if (await quiz.count()) {
        await quiz.locator('button[type="submit"]').click();
        assert.match(await quiz.locator('[data-check-summary]').innerText(), /3 unanswered/);
        const groups = quiz.locator('fieldset');
        for (let i = 0; i < await groups.count(); i++) {
          const group = groups.nth(i);
          const answer = Number(await group.getAttribute('data-answer'));
          await group.locator(`input[value="${(answer + 1) % 3}"]`).check();
        }
        await quiz.locator('button[type="submit"]').click();
        assert.match(await quiz.locator('[data-check-summary]').innerText(), /0 of 3 correct/);
        for (let i = 0; i < await groups.count(); i++) {
          const group = groups.nth(i);
          await group.locator(`input[value="${await group.getAttribute('data-answer')}"]`).check();
        }
        await quiz.locator('button[type="submit"]').click();
        assert.match(await quiz.locator('[data-check-summary]').innerText(), /3 of 3 correct/);
        await quiz.locator('button[type="reset"]').click();
        assert.equal(await quiz.locator('input:checked').count(), 0);
        assert.equal(await quiz.locator('[data-check-summary]').innerText(), '');
      }
      if (route === 'pioneers/leonardo-da-vinci') {
        await page.locator('#dv-height-slider').fill('60');
        await page.locator('#dv-span-slider').fill('63');
        assert.equal(await page.locator('#dv-ratio-val').innerText(), '1.05');
        await page.locator('button[data-stage="rays"]').click();
        assert.equal(await page.locator('button[data-stage="rays"]').getAttribute('aria-pressed'), 'true');
        assert.match(await page.locator('#dv-supper-caption').innerText(), /receding/);
      }
      if (route === 'states/florida') {
        assert.equal(await page.locator('main img').count(), 9);
        await page.locator('button[data-habitat="reef"]').click();
        assert.equal(await page.locator('#habitat-readout').getAttribute('data-active-habitat'), 'reef');
      }
      // Theme identity comes from the registry, including lighting synchronization.
      const themes = await page.evaluate(() => window.ClassroomOSThemeRegistry.IDS);
      for (const theme of themes) {
        await page.evaluate(id => { document.documentElement.dataset.theme = id; document.documentElement.dataset.lighting = window.ClassroomOSThemeRegistry.isDark(id) ? 'night' : 'day'; }, theme);
        await page.waitForTimeout(30);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${route}: overflow in ${theme} at ${width}px`);
      }
      await page.emulateMedia({ media: 'print' });
      assert.ok(await page.locator('main').isVisible());
      if (await quiz.count()) assert.equal(await quiz.locator('button[type="submit"]').isVisible(), false);
      assert.deepEqual(errors, [], `${route}: browser runtime errors`);
      await page.close();
      views++;
    }
  }
  console.log(`Humanities priority checks passed: ${views} desktop/mobile views, all 12 themes, local images, lightboxes, simulation outcomes, quizzes, and print visibility.`);
} finally { await browser.close(); }
