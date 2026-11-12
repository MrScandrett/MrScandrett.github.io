import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

// Run against node serve-local.js. Exercises real layouts and preserved live controls.
test('instrument activities remain accessible at phone, tablet and desktop widths', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  try {
    for (const width of [390, 768, 1440]) {
      for (const name of ['piano', 'guitar', 'drums', 'saxophone', 'violin-fingerboard']) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`http://127.0.0.1:8080/lessons/music/instruments/${name}.html`);
        const picker = page.locator('.iw-navigation select');
        await picker.waitFor();
        const options = await picker.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
        for (const value of options) {
          await picker.selectOption(value);
          const panel = page.locator('.iw-panel:not([hidden])');
          assert.equal(await panel.count(), 1, `${name}: one visible activity`);
          assert.ok(await panel.isVisible(), `${name}: activity is visible`);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} at ${width}: no page overflow`);
        await picker.selectOption({ label: name === 'guitar' ? "Let's Tune!" : 'First sound' });
        await page.locator('.creation-app-fullscreen').click();
        assert.ok(await page.locator('.iw-panel:not([hidden]) .fs').isVisible(), 'First sound stays available in full screen');
        await page.locator('.creation-app-fullscreen').click();
        await page.close();
      }
    }
  } finally { await browser.close(); }
});
