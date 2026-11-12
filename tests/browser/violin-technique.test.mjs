import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

test('violin studies stay in first position and stop with the workspace', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${process.env.VIOLIN_TEST_ORIGIN || 'http://127.0.0.1:8080'}/lessons/music/instruments/violin-fingerboard.html`);
    await page.locator('.iw-navigation select').selectOption({ label: 'Fingerboard' });
    await page.locator('#vlnMute').check();
    for (const root of ['55', '62', '69']) for (const mode of ['major', 'minor']) {
      await page.selectOption('#vtActivity', 'scale');
      await page.selectOption('#vtRoot', root);
      await page.selectOption('#vtMode', mode);
      for (const activity of ['scale', 'sequence', 'thirds', 'triad', 'ladder', 'lifts', 'crossing']) {
        await page.selectOption('#vtActivity', activity);
        const pitches = await page.locator('#vtNotes button').evaluateAll(nodes => nodes.map(n => ({
          midi: Number(n.dataset.midi), label: n.dataset.string, offset: Number(n.dataset.offset)
        })));
        assert.ok(pitches.length >= 7);
        pitches.forEach(n => {
          assert.ok(n.offset >= 0 && n.offset <= 7);
          assert.equal(n.midi, { G:55, D:62, A:69, E:76 }[n.label] + n.offset);
        });
        if (activity === 'scale') {
          assert.equal(pitches[0].midi, +root);
          assert.equal(pitches[7].midi, +root + 12);
          assert.equal(pitches.at(-1).midi, +root);
        }
        if (activity === 'lifts') assert.ok(pitches.every(n => n.label === pitches[0].label));
        if (activity === 'crossing') assert.ok(pitches.every(n => n.offset === 0));
      }
    }
    await page.selectOption('#vtActivity', 'scale');
    await page.fill('#vtTempo', '160');
    await page.click('#vtPlay');
    await page.waitForTimeout(500);
    assert.match(await page.locator('#vtStatus').textContent(), /Note 2/);
    assert.ok(await page.locator('#vlnBoard .is-step').count() > 0);
    await page.getByRole('button', { name:'Stop sound', exact:true }).click();
    const paused = await page.locator('#vtStatus').textContent();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#vtStatus').textContent(), paused);
    assert.equal(await page.locator('#vtPlay').textContent(), 'Play exercise');
    await page.click('#vtPlay');
    await page.locator('.iw-navigation select').selectOption({ label:'First sound' });
    assert.equal(await page.locator('#vtPlay').textContent(), 'Play exercise');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
