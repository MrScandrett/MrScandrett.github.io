// Moved out of tests/formula-explainer.test.mjs: it drives six real lesson pages (including the
// volcano simulator's 3D sim) and timed out on the deploy's shared runner. Runs under
// `npm run test:browser` against serve-local.js on :8080.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

const BASE = 'http://127.0.0.1:8080';

test('Real lesson pages: student clicks, keyboard navigation, and sliders work cleanly', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  try {
    const pagesToCheck = [
      'lessons/mathematics/algebra/equations-iceberg.html',
      'lessons/physics/mechanics/vectors.html',
      'lessons/cosmology/keplers-laws.html',
      'lessons/earth-science/volcano-simulator.html',
      'lessons/chemistry/stoichiometry.html',
      'lessons/physics/pioneers/james-clerk-maxwell.html'
    ];
    for (const rel of pagesToCheck) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('**/*', (route) => {
        const u = route.request().url();
        if (u.startsWith(`${BASE}/`) || u.startsWith('data:') || u.startsWith('blob:')) {
          return route.continue();
        }
        return route.abort();
      });
      await page.goto(`${BASE}/${rel}`, { waitUntil: 'domcontentloaded' });
      const formulaTarget = page.locator('[data-formula], .iceq-card, .v-eq, .eq-formula, .equation, .jcm-eq-card').locator('visible=true').first();
      await formulaTarget.scrollIntoViewIfNeeded();
      await page.waitForSelector('.cos-fx-box[data-fx-upgraded]', { state: 'attached', timeout: 10000 });

      const boxes = page.locator('.cos-fx-box[data-fx-upgraded]');
      const boxCount = await boxes.count();
      assert.ok(boxCount >= 1, `${rel} has upgraded equation boxes`);

      // Keyboard navigation on the first visible upgraded box
      const visibleBox = page.locator('.cos-fx-box[data-fx-upgraded]').locator('visible=true').first();
      const firstToken = visibleBox.locator('.cos-fx-token').first();
      await firstToken.scrollIntoViewIfNeeded();
      await firstToken.focus();
      await page.keyboard.press('Enter');

      const panelId = await visibleBox.getAttribute('data-fx-panel');
      const panel = page.locator(`#${panelId}`);
      await panel.waitFor({ state: 'visible', timeout: 5000 });
      const initialTitle = (await panel.locator('.cos-fx-title').textContent()).trim();
      assert.ok(initialTitle.length > 0 && !/^Variable\s/i.test(initialTitle), `${rel} first card has real title`);

      // Step forward with Next -> button and back with <- Prev
      const nextBtn = panel.locator('.cos-fx-step-btn[data-dir="1"]');
      if (await nextBtn.isVisible()) {
        await nextBtn.focus();
        await page.keyboard.press('Enter');
        const nextTitle = (await panel.locator('.cos-fx-title').textContent()).trim();
        assert.ok(nextTitle.length > 0 && !/^Variable\s/i.test(nextTitle), `${rel} next card has real title`);
        await panel.locator('.cos-fx-step-btn[data-dir="-1"]').click();
        assert.equal((await panel.locator('.cos-fx-title').textContent()).trim(), initialTitle);
      }

      // Close with keyboard
      const closeBtn = panel.locator('.cos-fx-close-btn');
      await closeBtn.focus();
      await page.keyboard.press('Enter');
      assert.equal(await panel.isHidden(), true, `${rel} panel closes on keyboard Enter`);

      assert.deepEqual(errors.filter((m) => !m.includes('Failed to fetch')), [], `${rel} had page errors`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
