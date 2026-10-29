import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets/js/photo-lightbox.js');
const pixel = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

test('shared photo lightbox keeps focus, captions, grouping, and page scroll state', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      page.setDefaultTimeout(5000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent(`<html><head><style>figure img { width: 120px; height: 120px; }</style></head><body><button id="outside">Outside</button>
        <figure data-zoomable data-lightbox-group='history"2026'><img src="${pixel}" alt="First image"><figcaption><strong>First plate</strong> A useful teaching caption. <span class="credit">Public domain <a href="https://example.org/source">Source</a></span></figcaption></figure>
        <figure data-zoomable data-lightbox-group='history"2026'><img src="${pixel}" alt="Second image"><figcaption>Second teaching caption.</figcaption></figure>
        </body></html>`);
      await page.addScriptTag({ path: script });
      await page.evaluate(() => { document.documentElement.style.overflow = 'clip'; });
      await page.locator('figure img').first().focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.plb.plb-open').count(), 1);
      assert.match(await page.locator('.plb-caption').innerText(), /First plate/);
      assert.match(await page.locator('.plb-credit').innerText(), /Public domain/);
      assert.equal(await page.locator('.plb-credit a').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'hidden');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'plb-btn plb-close');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Source');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'plb-btn plb-close');
      await page.keyboard.press('ArrowRight');
      assert.match(await page.locator('.plb-caption').innerText(), /Second teaching caption/);
      await page.locator('.plb-next').click();
      assert.match(await page.locator('.plb-caption').innerText(), /First plate/);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.plb.plb-open').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'clip');
      assert.equal(await page.evaluate(() => document.activeElement.alt), 'First image');

      await page.evaluate(pixelSrc => {
        document.body.insertAdjacentHTML('beforeend', `<figure data-zoomable><img src="${pixelSrc}" alt="Added later"><figcaption>Dynamic caption.</figcaption></figure>`);
      }, pixel);
      await page.locator('figure figcaption').last().click();
      assert.match(await page.locator('.plb-caption').innerText(), /Dynamic caption/);
      await page.locator('.plb-close').click();
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
