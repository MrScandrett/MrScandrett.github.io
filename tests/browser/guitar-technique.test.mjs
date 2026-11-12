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
      const notes = await page.locator('#techTab .gs-note').evaluateAll(nodes => nodes.map(n => ({finger:+n.dataset.finger, fret:+n.dataset.fret, midi:+n.dataset.midi, label:n.getAttribute('aria-label')})));
      assert.ok(notes.length > 0, activity);
      const opens = [64,59,55,50,45,40];
      notes.forEach(n => {
        assert.ok(n.finger >= 1 && n.finger <= 4);
        assert.equal(n.fret, 4 + n.finger);
        const string = Number(n.label.match(/string (\d)/)[1]);
        assert.equal(n.midi, opens[string - 1] + n.fret);
      });
    }
    await page.selectOption('#techActivity', '1234');
    assert.match(await page.locator('#techTab .gs-note').first().getAttribute('aria-label'), /A3 written, string 6, fret 5, finger 1/);
    assert.equal(await page.locator('#techTab .gs-note').count(), 24);
    const quarterSystems = await page.locator('#techTab .gs-system').count();
    await page.locator('.tech-options summary').click();
    await page.selectOption('#techSubdivision', '2');
    assert.ok(await page.locator('#techTab .gs-beam').count() > 0);
    assert.ok(await page.locator('#techTab .gs-system').count() < quarterSystems);
    await page.locator('#techTab .gs-note').nth(3).focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#techStatus').textContent(), /Note 4 of 24/);
    assert.equal(await page.locator('#techTab .gs-note.is-current').getAttribute('data-note'), '3');
    await page.locator('#techStop').click();
    await page.selectOption('#techSubdivision', '1');
    await page.selectOption('#techActivity', 'thirds');
    const restCount = await page.locator('#techTab .gs-system .mn-glyph').count();
    assert.ok(restCount > 0);
    const pitchChecks = await page.locator('#techTab .gs-note').evaluateAll(nodes => nodes.every(n => {
      const written = n.getAttribute('aria-label').match(/, (.+?) written/)[1];
      return window.MusicNotation.parsePitch(written).midi === Number(n.dataset.midi) + 12;
    }));
    assert.equal(pitchChecks, true);
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
    await page.locator('.iw-navigation select').selectOption({ label: 'Hanon-style exercises' });
    await page.locator('.tech-options').evaluate(el => { el.open = false; });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('.creation-app-fullscreen').click();
    let scoreBox = await page.locator('#techTab').boundingBox();
    assert.ok(scoreBox.y < 150, 'score appears immediately beneath compact controls');
    assert.ok(scoreBox.height > 650, 'score occupies most of the full-screen height');
    const systems = await page.locator('#techTab .gs-system').evaluateAll(nodes => nodes.map(n => {
      const box = n.getBoundingClientRect(), vb = n.viewBox.baseVal;
      return {height:box.height, expected:box.width * vb.height / vb.width};
    }));
    systems.forEach(s => assert.ok(Math.abs(s.height - s.expected) < 2, 'score lines keep their natural height without viewport-sized blank space'));
    await page.setViewportSize({ width: 390, height: 844 });
    scoreBox = await page.locator('#techTab').boundingBox();
    assert.ok(scoreBox.y < 200, 'phone controls leave room for notation');
    assert.ok(scoreBox.height > 500, 'phone score gets most of the screen');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
