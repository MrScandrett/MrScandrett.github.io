import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
const browser = await chromium.launch({ executablePath: findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']) || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8080/music-lab.html');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const root = page.locator('#trackStudio');
  await root.locator('[data-channel]').waitFor();
  await root.locator('.daw-channel-options > summary').click();
  await root.locator('[data-channel-open="fx"]').click();
  for (const type of ['eq', 'chorus']) {
    await root.locator('[data-fx-pick]').last().selectOption(type);
    await root.locator('[data-fx-add-picked]').click();
  }
  assert.equal(await root.locator('[data-fx-index] [data-key="proportional"]').count(), 1);
  assert.equal(await root.locator('[data-fx-index] [data-key="trim"]').count(), 1);
  assert.equal(await root.locator('[data-fx-param="tone"]').count(), 1);
  const qMode = root.locator('[data-fx-index] [data-key="proportional"]');
  await qMode.focus(); await qMode.press('End');
  assert.equal(await qMode.getAttribute('aria-valuenow'), '1');
  await root.locator('[data-fx-param="tone"]').fill('5000');
  await root.locator('[data-fx-param="tone"]').press('Tab');
  assert.equal(await root.locator('[data-fx-param="tone"]').inputValue(), '5000');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'page fits viewport');
  }
  assert.deepEqual(errors, []);
  const result = await page.evaluate(async () => {
    const render = async (type, values = {}, frequency = 440, amplitude = .3) => {
      const c = new OfflineAudioContext(2, 48000, 48000), p = AudioEffects.parameters(type, values);
      const fx = AudioEffects.registry[type].create(c, p), source = c.createBufferSource(), buffer = c.createBuffer(2, 48000, 48000);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) data[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / 48000);
      }
      source.buffer = buffer; source.connect(fx.input); fx.output.connect(c.destination); source.start();
      fx.update?.(p);
      const audio = await c.startRendering(), l = audio.getChannelData(0), r = audio.getChannelData(1);
      let energy = 0, diff = 0, peak = 0;
      for (let i = 12000; i < l.length; i++) { energy += l[i] ** 2; diff += (l[i] - r[i]) ** 2; peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i])); }
      const finite = l.every(Number.isFinite) && r.every(Number.isFinite);
      fx.dispose();
      return { finite, rms: Math.sqrt(energy / 36000), diff: Math.sqrt(diff / 36000), peak };
    };
    const results = {};
    for (const type of ['eq', 'compressor', 'delay', 'reverb', 'chorus', 'distortion', 'limiter']) results[type] = await render(type);
    results.chorusDry = await render('chorus', { wet: 0 });
    results.limited = await render('limiter', { ceiling: -12 }, 440, 3);
    results.eqWide = await render('eq', { gain: 12, frequency: 1000, Q: 1 }, 600);
    results.eqNarrow = await render('eq', { gain: 12, frequency: 1000, Q: 1, proportional: 1 }, 600);
    results.eqTrim = await render('eq', { trim: -6 });
    return results;
  });
  for (const [type, data] of Object.entries(result)) { assert.ok(data.finite && data.rms > 0, `${type} renders finite, audible audio`); }
  assert.ok(result.chorus.diff > .01, 'chorus decorrelates stereo');
  assert.equal(result.chorusDry.diff, 0, 'dry signal preserves stereo');
  assert.ok(result.limited.peak <= 10 ** (-12 / 20) + 1e-6, 'limiter holds settled sample ceiling');
  assert.ok(result.eqNarrow.rms < result.eqWide.rms * .8, 'proportional Q narrows boost');
  assert.ok(Math.abs(result.eqTrim.rms / result.eq.rms - 10 ** (-6 / 20)) < .01, 'output trim is calibrated');
  console.log('Seven processors render finite audio; stereo chorus, dry path, limiter ceiling, EQ width and trim passed.');
} finally { await browser.close(); }
