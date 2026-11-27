import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

const BASE = 'http://127.0.0.1:8080/lessons/mathematics/statistics-and-probability';

async function checkNoOverflow(page, label) {
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  assert.equal(ok, true, `${label}: horizontal overflow detected`);
}

async function checkCanvasPainted(page, selector, label) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(box && box.width > 180 && box.height > 150, `${label}: ${selector} boundingBox too small`);
  const painted = await page.evaluate((sel) => {
    const c = document.querySelector(sel);
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return data.some((v, idx) => idx % 4 === 3 && v > 0);
  }, selector);
  assert.equal(painted, true, `${label}: ${selector} appears blank`);
}

test('all four statistics-and-probability lessons work cleanly on desktop and mobile', async () => {
  const browser = await chromium.launch({
    executablePath: findChromium(),
    headless: true,
  });

  const errors = [];
  const attachErrorListeners = (page, tag) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`${tag} console.error: ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`${tag} pageerror: ${err.message}`));
  };

  try {
    // 1. Mean, Median & Mode
    const mmm = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    attachErrorListeners(mmm, 'mmm');
    await mmm.goto(`${BASE}/mean-median-mode.html`, { waitUntil: 'domcontentloaded' });
    await mmm.waitForSelector('#mmm-plot .mmm-dot', { state: 'visible' });
    await checkNoOverflow(mmm, 'mmm desktop');

    await mmm.click('#mmm-outlier');
    assert.equal(await mmm.textContent('#mmm-mean'), '8');
    await mmm.click('#mmm-add-pt');
    assert.match(await mmm.textContent('#mmm-count-badge'), /n = 6/);

    // Keyboard nudge on first dot
    await mmm.focus('#mmm-plot .mmm-dot[data-index="0"]');
    await mmm.keyboard.press('ArrowRight');

    // Lab 2 What-if toggle
    await mmm.click('#mmm-sc-whatif');
    assert.match(await mmm.textContent('#mmm-sc-whatif-note'), /50\.8k/);

    // Sidebar open & tab switch
    await mmm.click('.ll-open-btn');
    await mmm.click('.ll-tab[data-pane="mmm-teacher-pane"]');
    assert.equal(await mmm.getAttribute('#mmm-teacher-pane', 'aria-hidden'), 'false');

    // Guided practice check
    const mmmFirstInput = mmm.locator('.mmm-practice-item input').first();
    await mmmFirstInput.fill('5');
    await mmm.locator('.mmm-practice-item .mmm-check').first().click();
    assert.match(await mmm.locator('.mmm-practice-item .mmm-mini-feedback').first().textContent(), /Correct/);

    // 2. How Spread Out?
    const hs = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    attachErrorListeners(hs, 'hs');
    await hs.goto(`${BASE}/how-spread-out.html`, { waitUntil: 'domcontentloaded' });
    await hs.waitForSelector('#dp-canvas', { state: 'visible' });
    await checkNoOverflow(hs, 'hs desktop');
    await checkCanvasPainted(hs, '#dp-canvas', 'hs');
    await checkCanvasPainted(hs, '#cp-canvas', 'hs');
    await checkCanvasPainted(hs, '#bc-canvas', 'hs');

    await hs.click('#dp-presets button[data-set="outlier"]');
    assert.match(await hs.textContent('#dp-note'), /Outlier/);
    await hs.click('#dp-add');
    await hs.check('#dp-devs');
    await hs.click('#cp-sim-btn');
    assert.match(await hs.textContent('#cp-season-out'), /Team A cleared/);
    await hs.click('#bc-mode-z');
    assert.equal(await hs.getAttribute('#bc-mode-z', 'aria-pressed'), 'true');
    assert.match(await hs.textContent('#duel-verdict'), /Test B/);

    // 3. Probability Simulator
    const ps = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    attachErrorListeners(ps, 'ps');
    await ps.goto(`${BASE}/probability-simulator.html`, { waitUntil: 'domcontentloaded' });
    await ps.waitForSelector('#ps-graph', { state: 'visible' });
    await checkNoOverflow(ps, 'ps desktop');

    await ps.click('#ps-step-10');
    assert.equal(await ps.textContent('#ps-p-trials'), '1,010');
    await ps.click('#ps-pin-run');
    assert.match(await ps.textContent('#ps-graph-caption-text'), /ghost run/);

    await ps.selectOption('#ps-experiment', 'marbles');
    await ps.check('#ps-replace-toggle');
    await ps.click('#ps-step-10');
    assert.match(await ps.textContent('#ps-stage-status'), /Pool left/);

    await ps.click('#ps-mystery-btn');
    await ps.click('#ps-step-100');
    await ps.click('#ps-mystery-fair');
    assert.match(await ps.textContent('#ps-mystery-status'), /True coin:/);

    await ps.locator('.ps-practice-item input').first().fill('50');
    await ps.locator('.ps-practice-item button').first().click();
    assert.match(await ps.locator('.ps-practice-item .fb').first().textContent(), /Correct/);

    // 4. Galton Board & Pachinko Lab
    const pk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    attachErrorListeners(pk, 'pk');
    await pk.goto(`${BASE}/probability-pachinko.html`, { waitUntil: 'domcontentloaded' });
    await pk.waitForSelector('#pk-canvas', { state: 'visible' });
    await checkNoOverflow(pk, 'pk desktop');
    await checkCanvasPainted(pk, '#pk-canvas', 'pk');

    await pk.click('.pk-bin-predict-btn[data-bin="5"]');
    await pk.click('#pk-one');
    await pk.click('#pk-pin-run');
    assert.equal(await pk.locator('#pk-clear-pin').isVisible(), true);
    await pk.selectOption('#pk-ev-mode', 'edge-jackpot');
    assert.equal(await pk.locator('#pk-ev-strip').isVisible(), true);
    assert.match(await pk.textContent('#pk-mission-pill'), /Missions:/);

    await pk.fill('#pk-q1', '6');
    await pk.locator('.pk-practice-item button').first().click();
    assert.match(await pk.locator('.pk-practice-item .fb').first().textContent(), /Correct/);

    // Mobile checks across all 4 lessons
    for (const file of [
      'mean-median-mode.html',
      'how-spread-out.html',
      'probability-simulator.html',
      'probability-pachinko.html',
    ]) {
      const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
      attachErrorListeners(mobile, `mobile-${file}`);
      await mobile.goto(`${BASE}/${file}`, { waitUntil: 'domcontentloaded' });
      await mobile.waitForTimeout(200);
      await checkNoOverflow(mobile, `mobile ${file}`);
      await mobile.close();
    }

    assert.deepEqual(errors, [], `Browser errors: ${errors.join(' | ')}`);
  } finally {
    await browser.close();
  }
});
