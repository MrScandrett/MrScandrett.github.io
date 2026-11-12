import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

test('guitar technique activities retain correct finger/fret columns and share stop controls', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${process.env.GUITAR_TEST_ORIGIN || 'http://127.0.0.1:8080'}/lessons/music/instruments/guitar.html`);
    await page.locator('.iw-navigation select').selectOption({ label: 'Hanon-style exercises' });
    for (const activity of ['1234','4321','1324','1423','spider','skip','thirds','groups3','groups4']) {
      await page.selectOption('#techActivity', activity);
      const rows = await page.locator('#techTab tr').evaluateAll(rows => rows.map(r => [...r.querySelectorAll('[data-note]')].map(c => c.textContent)));
      assert.ok(rows[0].length > 0, activity);
      rows[7].forEach((finger, i) => {
        assert.ok(+finger >= 1 && +finger <= 4);
        const frets = rows.slice(1, 7).map(r => r[i]).filter(v => v !== '—');
        assert.deepEqual(frets, [String(4 + +finger)], activity);
      });
    }
    await page.locator('#techStep').click();
    assert.match(await page.locator('#techStatus').textContent(), /Note 1 of/);
    await page.locator('#techStep').click();
    assert.match(await page.locator('#techStatus').textContent(), /Note 2 of/);
    await page.locator('#techPlay').click();
    await page.locator('.iw-navigation').getByRole('button', {name:'Stop sound', exact:true}).click();
    assert.equal(await page.locator('#techPlay').textContent(), '▶ Play exercise');
    await page.locator('.iw-navigation select').selectOption({ label: 'Chord library' });
    await page.locator('.guitar-library-presets button').filter({ hasText: /^Am$/ }).click();
    assert.match(await page.locator('#gcEncMeta h3').textContent(), /Am/);
    assert.ok(await page.locator('#studioScaleRoute').textContent().then(s => s.includes('finger')));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
