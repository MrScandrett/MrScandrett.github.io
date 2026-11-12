import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

test('microphone tuner detects guitar fundamentals, detuning, silence and releases capture', async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = new AudioContext();
        await ctx.resume();
        const destination = ctx.createMediaStreamDestination();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.frequency.value = 110;
        oscillator.connect(gain).connect(destination);
        oscillator.start();
        window.testMic = { ctx, oscillator, gain, stream: destination.stream };
        return destination.stream;
      };
    });
    await page.goto('http://127.0.0.1:8080/lessons/music/instruments/guitar.html');
    await page.locator('.iw-navigation select').selectOption('0');
    await page.locator('#first-sound').evaluate(el => el.open = true);
    await page.setViewportSize({ width: 1280, height: 800 });
    assert.ok((await page.locator('#guitarWorkspace').boundingBox()).height < 640, 'Tuning workspace fits a laptop viewport below site navigation');
    assert.equal(await page.locator('.iw-navigation select option:checked').textContent(), "Let's Tune!");
    await page.locator('.gt-tuner-start').click();
    await page.waitForFunction(() => document.querySelector('.guitar-tuner').dataset.tuning === 'in');
    assert.equal(await page.locator('.gt-tuner-note').textContent(), 'A2');
    for (const [name, hz] of [['E2', 82.4069], ['D3', 146.8324], ['G3', 195.9977], ['B3', 246.9417], ['E4', 329.6276]]) {
      await page.evaluate(hz => testMic.oscillator.frequency.value = hz, hz);
      await page.waitForFunction(name => document.querySelector('.gt-tuner-note').textContent === name && document.querySelector('.guitar-tuner').dataset.tuning === 'in', name);
    }
    await page.waitForFunction(() => document.querySelector('.gt-string-pick[data-checked]'));
    await page.locator('.gt-string-pick').nth(1).click();
    assert.equal(await page.locator('.gt-tuner-target').inputValue(), '1');
    assert.equal(await page.locator('.gt-string-pick').nth(1).getAttribute('aria-pressed'), 'true');
    for (const [state, hz] of [['low', 107], ['high', 113]]) {
      await page.evaluate(hz => testMic.oscillator.frequency.value = hz, hz);
      await page.waitForFunction(state => document.querySelector('.guitar-tuner').dataset.tuning === state, state);
    }
    await page.evaluate(() => testMic.gain.gain.value = 0);
    await page.waitForFunction(() => document.querySelector('.gt-tuner-needle').hidden);
    await page.locator('.gt-tuner-start').click();
    assert.equal(await page.evaluate(() => testMic.stream.getTracks()[0].readyState), 'ended');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('.gt-tuner-start').click();
    await page.waitForFunction(() => window.testMic.stream.getTracks()[0].readyState === 'live');
    await page.locator('#first-sound').evaluate(el => el.open = false);
    await page.waitForFunction(() => testMic.stream.getTracks()[0].readyState === 'ended');
  } finally { await browser.close(); }
});
