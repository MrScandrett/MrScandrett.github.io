import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--disable-dev-shm-usage'] });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => {
      Object.defineProperty(window, 'AudioEffects', { configurable: true, set(api) {
        const register = api.register;
        window.punchInstances = [];
        api.register = (type, definition) => {
          if (type === 'punch-compressor') {
            const create = definition.create;
            definition.create = (context, params) => {
              const instance = create(context, params);
              if (context instanceof AudioContext) window.punchInstances.push(instance);
              return instance;
            };
          }
          register(type, definition);
        };
        Object.defineProperty(window, 'AudioEffects', { value: api, configurable: true });
      } });
    });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8080/music-lab.html');
    await page.locator('[data-ch-fx-add="punch-compressor"]').click();
    const tools = page.locator('[data-ref="tools"]'), fx = page.locator('[data-ref="effects"]');
    await tools.locator('[data-compressor-preset="bass"]').click();
    await page.locator('[data-ch-open-fx]').click();
    assert.equal(await fx.locator('[data-fx-param="threshold"]').inputValue(), '-28');
    await fx.locator('[data-compressor-preset="drums"]').click();
    assert.equal(await fx.locator('[data-fx-param="ratio"]').inputValue(), '6');
    await fx.locator('[data-fx-param="output"]').fill('0');
    await fx.locator('[data-fx-param="output"]').press('Tab');
    await page.locator('[data-tab="tools"]').click();
    await page.locator('[data-act="play-instrument"]').click();
    await page.locator('[data-tab="fx"]').click();
    await page.waitForFunction(() => punchInstances.at(-1)?.meter().mode === 'rms');
    await page.evaluate(() => {
      const c = AudioKit.context(), source = c.createOscillator(), gain = c.createGain();
      source.frequency.value = 1000; gain.gain.value = .5;
      source.connect(gain); gain.connect(punchInstances.at(-1).input); source.start();
      window.punchTone = source;
    });
    await page.waitForFunction(() => Number(document.querySelector('[data-ref="effects"] .mc-punch meter').value) > 10);
    assert.match(await fx.locator('[data-compressor-mode]').textContent(), /RMS detector/);
    await page.screenshot({ path: `/tmp/music-compressor-review/punch-${viewport.width}.png`, fullPage: true });
    await page.evaluate(() => punchTone.stop());
    await fx.locator('[data-fx-action="bypass"]').click();
    assert.match(await fx.locator('[data-compressor-mode]').textContent(), /Bypassed/);
    assert.equal(await fx.locator('meter').evaluate(el => el.value), 0);
    await fx.locator('[data-fx-action="bypass"]').click();
    await page.locator('[data-tab="tools"]').click();
    await page.locator('[data-channel]').selectOption({ label: 'Keys' });
    await page.locator('.daw-channel-options > summary').click();
    const downloading = page.waitForEvent('download');
    await page.locator('[data-channel-preset="save"]').click();
    const download = await downloading, filename = `/tmp/music-compressor-review/channel-${viewport.width}.json`;
    await download.saveAs(filename);
    const saved = JSON.parse(await fs.readFile(filename, 'utf8'));
    assert.equal(saved.effects[0].type, 'punch-compressor');
    assert.equal(saved.effects[0].params.ratio, 6);
    await page.reload();
    await page.locator('[data-channel]').selectOption({ label: 'Keys' });
    await page.locator('[data-ch-open-fx]').click();
    assert.equal(await fx.locator('[data-fx-param="ratio"]').inputValue(), '6', 'autosaved settings survive reload');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    if (viewport.width === 1440) {
      // Drive the actual WAV exporter, including its processor preparation path.
      await page.locator('[data-tab="tools"]').click();
      for (const tool of ['keyboard', 'notation']) {
        const catalog = page.locator('.daw-experience-catalog');
        if (await catalog.getAttribute('open') === null) await catalog.locator(':scope > summary').click();
        await page.locator(`[data-tool-add="${tool}"]`).click();
      }
      await page.locator('[data-note-add]').click();
      await page.evaluate(() => {
        const prepare = MusicLabCompressor.prepare;
        window.punchExportPreparations = 0;
        MusicLabCompressor.prepare = async c => {
          if (c instanceof OfflineAudioContext) punchExportPreparations++;
          return prepare(c);
        };
      });
      const files = page.locator('.daw-file-tools');
      if (await files.getAttribute('open') === null) await files.locator(':scope > summary').click();
      await page.locator('[data-menu="export"]').click();
      const exporting = page.waitForEvent('download');
      await page.locator('[data-act="export-mix"]').click();
      const wav = await exporting, filename = '/tmp/music-compressor-review/punch-mix.wav';
      await wav.saveAs(filename);
      const bytes = await fs.readFile(filename);
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.ok(bytes.subarray(44).some(byte => byte !== 0), 'export contains audible samples');
      assert.equal(await page.evaluate(() => punchExportPreparations), 1);
    }

    const audio = await page.evaluate(async () => {
      async function render(wet, bypass = false, compatibility = false) {
        const c = new OfflineAudioContext(2, 48000, 48000);
        if (compatibility) Object.defineProperty(c, 'audioWorklet', { value: undefined });
        await MusicLabCompressor.prepare(c);
        const input = c.createBufferSource(), buffer = c.createBuffer(2, 48000, 48000);
        for (let i = 0; i < 48000; i++) {
          const v = .5 * Math.sin(2 * Math.PI * 1000 * i / 48000);
          buffer.getChannelData(0)[i] = v; buffer.getChannelData(1)[i] = -v / 4;
        }
        input.buffer = buffer;
        const chain = MusicDawPlugins.createChain(c, input, [{ type: 'punch-compressor', params: { threshold: -24, ratio: 4, output: 0, knee: 0 }, wet, bypass }], AudioEffects.registry, AudioEffects.parameters);
        chain.output.connect(c.destination); input.start();
        const rendered = await c.startRendering();
        const power = ch => rendered.getChannelData(ch).slice(24000).reduce((sum, v) => sum + v * v, 0) / 24000;
        const result = { db: 10 * Math.log10(power(0)), stereo: power(1) / power(0), failures: chain.failed };
        chain.dispose(); return result;
      }
      return { compressed: await render(1), dry: await render(0), bypass: await render(1, true), compatibility: await render(1, false, true) };
    });
    // -9.03 dBFS input; at 4:1 above -24 dBFS, output settles near -20.26 dBFS.
    assert.ok(Math.abs(audio.compressed.db + 20.2577) < .1, JSON.stringify(audio));
    assert.ok(Math.abs(audio.dry.db + 9.0309) < .01, JSON.stringify(audio));
    assert.equal(audio.dry.db, audio.bypass.db);
    assert.ok(Math.abs(audio.compressed.stereo - 1 / 16) < .00001);
    assert.ok(audio.compatibility.db < audio.dry.db - 1, `fallback still compresses: ${JSON.stringify(audio)}`);
    assert.deepEqual(audio.compressed.failures, []);
    if (viewport.width === 1440) {
      await page.goto('http://127.0.0.1:8080/lessons/technical-elements/audio-engineering/allen-heath-qu7-mixer.html');
      await page.waitForFunction(() => !!window.AudioEffects?.registry['punch-compressor']);
      assert.equal(await page.evaluate(() => !!window.MusicLabCompressor), true);
    }
    assert.deepEqual(errors, []);
    console.log(`${viewport.width}px: presets, live RMS metering, bypass, persistence, offline audio, stereo, wet/dry and fallback passed`);
    await context.close();
  }
} finally { await browser.close(); }
