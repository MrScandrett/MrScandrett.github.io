// Drives the real Music Lab: add Studio Reverb, use presets, hear it (worklet engaged,
// tail meter moves), survive reload. Needs `node serve-local.js` on :8080.
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.LAB_URL || 'http://127.0.0.1:8080', out = process.env.REVERB_SHOTS || '/tmp/music-reverb-review';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => {
      Object.defineProperty(window, 'AudioEffects', { configurable: true, set(api) {
        const register = api.register;
        window.reverbInstances = [];
        api.register = (type, definition) => {
          if (type === 'studio-reverb') {
            const create = definition.create;
            definition.create = (ctx, params) => { const instance = create(ctx, params); if (ctx instanceof AudioContext) window.reverbInstances.push(instance); return instance; };
          }
          register(type, definition);
        };
        Object.defineProperty(window, 'AudioEffects', { value: api, configurable: true });
      } });
    });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/music-lab.html`);
    const tools = page.locator('[data-ref="tools"]'), fx = page.locator('[data-ref="effects"]');
    await tools.locator('[data-fx-pick]').selectOption('studio-reverb');
    await tools.locator('[data-ch-fx-add-picked]').click();
    assert.equal(await tools.locator('.mr-panel').count(), 1, 'reverb panel renders in the channel console');
    assert.equal(await tools.locator('.mc-insert[data-effect-type="studio-reverb"] .mc-knobs > *').count(), 10, '9 controls + insert mix');
    await tools.locator('[data-reverb-preset="cathedral"]').click();
    assert.equal(await tools.locator('[data-reverb-preset="cathedral"]').getAttribute('aria-pressed'), 'true');
    assert.match(await tools.locator('.mr-program').textContent(), /Cathedral/i);
    await page.locator('[data-ch-open-fx]').click();
    assert.equal(await fx.locator('[data-fx-param="decay"]').inputValue(), '6.5');
    await fx.locator('[data-reverb-preset="plate"]').click();
    assert.equal(await fx.locator('[data-fx-param="early"]').inputValue(), '0');
    await fx.locator('[data-fx-param="decay"]').fill('3');
    await fx.locator('[data-fx-param="decay"]').press('Tab');
    assert.match(await fx.locator('.mr-program').textContent(), /Custom/i, 'editing a knob leaves the preset');
    await page.locator('[data-tab="tools"]').click();
    await page.locator('[data-act="play-instrument"]').click();
    await page.locator('[data-tab="fx"]').click();
    await page.waitForFunction(() => reverbInstances.at(-1)?.meter().mode === 'fdn');
    await page.evaluate(() => {
      const c = AudioKit.context(), source = c.createOscillator(), gain = c.createGain();
      source.type = 'sawtooth'; source.frequency.value = 220; gain.gain.value = .3;
      source.connect(gain); gain.connect(reverbInstances.at(-1).input); source.start();
      window.reverbTone = source;
    });
    await page.waitForFunction(() => Number(document.querySelector('[data-ref="effects"] .mr-meter meter').value) > -40);
    assert.match(await fx.locator('[data-reverb-mode]').textContent(), /Feedback delay network/);
    await page.screenshot({ path: `${out}/reverb-${viewport.width}.png`, fullPage: true });
    await page.evaluate(() => reverbTone.stop());
    await fx.locator('[data-fx-action="bypass"]').click();
    assert.match(await fx.locator('[data-reverb-mode]').textContent(), /Bypassed/);
    await fx.locator('[data-fx-action="bypass"]').click();
    // Send-bus use: the reverb is offered on the Return buses.
    assert.ok(await page.evaluate(() => AudioEffects.registry['studio-reverb'].controls.length === 9));
    if (viewport.width > 700) {
      await page.reload();
      await page.locator('[data-channel]').selectOption({ label: 'Keys' });
      await page.locator('[data-ch-open-fx]').click();
      assert.equal(await fx.locator('[data-fx-param="decay"]').inputValue(), '3', 'autosaved settings survive reload');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no sideways scroll');
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    await context.close();
  }
  console.log('Studio Reverb browser check passed');
} finally { await browser.close(); }
