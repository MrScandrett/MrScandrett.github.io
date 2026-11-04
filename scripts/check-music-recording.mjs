// Run with serve-local.js on :8080. Fake microphone keeps this check private
// and reproduces a slow permission/device setup without using a real input.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const browser = await chromium.launch({
  executablePath: findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']),
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
try {
  for (const mode of ['early', 'ready', 'cancel']) {
    const cancel = mode === 'cancel';
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const get = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (...args) => {
        await new Promise(resolve => setTimeout(resolve, 1800));
        return get(...args);
      };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.LAB_URL || 'http://127.0.0.1:8080'}/music-lab.html`);
    await page.locator('[data-channel]').selectOption({ label: 'Vocals' });
    await page.locator('[data-channel-arm]').click();
    // Dispatch immediately so scrolling does not hide the startup race.
    if (mode === 'ready') {
      await page.waitForFunction(() => document.querySelector('[data-channel-arm]').getAttribute('aria-pressed') === 'true');
      await page.locator('.daw-transport [data-act="record"]').click();
    } else {
      await page.locator('[data-act="record"]').first().evaluate(button => button.click());
    }
    if (cancel) {
      await page.locator('[data-act="stop"]').first().evaluate(button => button.click());
      await page.waitForTimeout(3000);
      assert.equal(await page.locator('[data-act="record"]').first().getAttribute('aria-pressed'), 'false');
      assert.equal(await page.locator('[data-channel-arm]').getAttribute('aria-pressed'), 'false');
    } else {
      await page.waitForFunction(() => document.querySelector('[data-act="record"]').getAttribute('aria-pressed') === 'true');
      assert.equal(await page.locator('[data-channel-arm]').getAttribute('aria-pressed'), 'true');
      await page.waitForTimeout(3500);
      await page.locator('.daw-transport [data-act="stop"]').click();
      await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(node => /Recorded .* s of audio/.test(node.textContent)));
      assert.ok(await page.locator('canvas[data-clip]').count() > 0, 'recording creates an audio clip');
      if (mode === 'ready') {
        await page.locator('[data-view="channels"]').click();
        assert.ok(await page.locator('.daw-console-clip').count() > 0, 'recorded take appears in the channel desk');
      }
      // Tap the shared speaker output, beyond the DAW mixer, rather than trusting
      // a waveform or live microphone meter as evidence of audible playback.
      await page.evaluate(() => {
        window.recordingOutputMeter = AudioKit.context().createAnalyser();
        recordingOutputMeter.fftSize = 2048;
        AudioKit.output().connect(recordingOutputMeter);
      });
      await page.locator('.daw-transport [data-act="home"]').click();
      await page.locator('.daw-transport [data-act="play"]').click();
      await page.waitForFunction(() => {
        const samples = new Float32Array(recordingOutputMeter.fftSize);
        recordingOutputMeter.getFloatTimeDomainData(samples);
        return samples.some(sample => Math.abs(sample) > .001);
      }, null, { timeout: 5000 });
      await page.locator('.daw-transport [data-act="stop"]').click();

    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Microphone recording, audible playback and cancellation passed');
} finally { await browser.close(); }
