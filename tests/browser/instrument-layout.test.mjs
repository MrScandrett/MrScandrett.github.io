import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

// Run against node serve-local.js. Exercises real layouts and preserved live controls.
test('instrument activities remain accessible at phone, tablet and desktop widths', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      for (const name of ['piano', 'guitar', 'drums', 'saxophone', 'violin-fingerboard']) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`http://127.0.0.1:8080/lessons/music/instruments/${name}.html`);
        const picker = page.locator('.iw-navigation select');
        await picker.waitFor();
        assert.equal(await picker.inputValue(), '0', `${name}: starts at First sound`);
        assert.equal(await page.locator('details.fs').evaluate(node => node.open), true, `${name}: first instrument is expanded`);
        const options = await picker.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
        for (const value of options) {
          await picker.selectOption(value);
          const panel = page.locator('.iw-panel:not([hidden])');
          assert.equal(await panel.count(), 1, `${name}: one visible activity`);
          assert.ok(await panel.isVisible(), `${name}: activity is visible`);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} at ${width}: no page overflow`);
        await picker.selectOption({ label: 'First sound' });
        await page.locator('.creation-app-fullscreen').click();
        assert.ok(await page.locator('.iw-panel:not([hidden]) .fs').isVisible(), 'First sound stays available in full screen');
        await page.locator('.creation-app-fullscreen').click();
        await page.close();
      }
    }
  } finally { await browser.close(); }
});


test('shared instrument controls support keyboard play, stopping and deep links', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  try {
    for (const name of ['piano', 'guitar', 'drums', 'saxophone', 'violin-fingerboard']) {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:8080/lessons/music/instruments/${name}.html`);
      const picker = page.locator('.iw-navigation select');
      await picker.waitFor();
      if (name === 'guitar') {
        const reference = page.locator('.gt-string-pick').first();
        await reference.focus();
        await page.keyboard.press('Enter');
        assert.equal(await reference.getAttribute('aria-pressed'), 'true', 'guitar: keyboard selects reference pitch');
      } else {
      const note = page.locator('.fs-note.is-next');
        await note.focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.fs-dots .is-done').count(), 1, `${name}: Enter plays one note`);
      }
      await page.evaluate(() => document.querySelector('.fs-action-main').click());
      await page.getByRole('button', { name: 'Stop sound', exact: true }).click();
      assert.match(await page.locator('.fs-action-main').textContent(), /Hear it first/);
      await page.evaluate(() => document.querySelector('.fs-action-main').click());
      await picker.selectOption('1');
      assert.match(await page.locator('.fs-action-main').textContent(), /Hear it first/, `${name}: changing activity cancels demo`);
      await page.evaluate(() => { location.hash = '#first-sound'; });
      await page.waitForFunction(() => document.activeElement?.id === 'first-sound');
      assert.equal(await picker.inputValue(), '0', `${name}: deep link reveals activity`);
      await page.locator('.creation-app-fullscreen').click();
      await page.getByRole('link', { name: 'Lesson steps', exact: true }).click();
      assert.equal(await page.evaluate(() => !!document.fullscreenElement || !!document.querySelector('.creation-app-expanded')), false, `${name}: lesson navigation exits full screen`);
      await page.waitForFunction(() => document.activeElement?.id === 'instrument-pathway');
      assert.deepEqual(errors, [], `${name}: no runtime errors`);
      await page.close();
    }
  } finally { await browser.close(); }
});
