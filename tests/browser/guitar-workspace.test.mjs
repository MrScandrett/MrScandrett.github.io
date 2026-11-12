import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

const url = `${process.env.GUITAR_TEST_ORIGIN || 'http://127.0.0.1:8080'}/lessons/music/instruments/guitar.html`;

test('guitar workspace preserves editing focus, reveals loaded grips, and stops competing playback', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    const cell = page.locator('#gcBuilderBoard [data-string="E6"] button').nth(2);
    await cell.focus();
    await page.keyboard.press('Enter');
    assert.equal(await cell.evaluate(el => el === document.activeElement), true);
    assert.equal(await cell.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Enter');
    assert.equal(await cell.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#gcScaleRootPicker .is-active').getAttribute('aria-pressed'), 'true');

    await page.locator('[data-guitar-mode="scale"]').click();
    assert.equal(await page.locator('#builder').isVisible(), false);
    // Find an actual library grip above the builder's original nine-fret limit.
    const highGrip = await page.evaluate(() => {
      document.querySelector('#encyclopedia').closest('details').open = true;
      for (const root of document.querySelector('#gcRootPicker').children) {
        root.click();
        for (const form of document.querySelector('#gcFormPicker').children) {
          form.click();
          const notes = document.querySelectorAll('#gcEncBoard .has-note');
          if ([...notes].some(n => /fret (1\d)/.test(n.getAttribute('aria-label')))) {
            document.querySelector('#gcSendToBuilder').click();
            return true;
          }
        }
      }
      return false;
    });
    assert.equal(highGrip, true, 'exercise a real high-position library chord');
    assert.equal(await page.locator('#builder').isVisible(), true);
    assert.equal(await page.locator('#gcBuilderBoard').evaluate(el => [...el.querySelectorAll('.has-note')].some(n => /fret (1\d)/.test(n.getAttribute('aria-label')))), true);
    assert.equal(await page.locator('#builder h2').first().evaluate(el => el === document.activeElement), true);

    await page.locator('#studioPlay').evaluate(el => el.click());
    assert.match(await page.locator('#studioPlay').textContent(), /Stop progression/);
    await page.locator('[data-guitar-mode="hybrid"]').evaluate(el => el.click());
    await page.locator('#studioScaleRoute button').first().evaluate(el => el.click());
    assert.equal(await page.locator('#studioPlay').textContent(), 'Play progression');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
