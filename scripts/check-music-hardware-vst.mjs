import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.LAB_URL || 'http://127.0.0.1:8080';
const browser = await chromium.launch({
  executablePath: findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']),
  args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
});

try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => {
      Object.defineProperty(window, 'AudioEffects', {
        configurable: true,
        set(api) {
          const register = api.register;
          window.hwInstances = {};
          const wrap = (type, definition) => {
            const create = definition.create;
            definition.create = (ctx, params) => {
              const instance = create(ctx, params);
              if (ctx instanceof AudioContext) (window.hwInstances[type] ||= []).push(instance);
              return instance;
            };
          };
          for (const [t, d] of Object.entries(api.registry)) wrap(t, d);
          api.register = (type, definition) => {
            wrap(type, definition);
            register(type, definition);
          };
          Object.defineProperty(window, 'AudioEffects', { value: api, configurable: true });
        },
      });
    });

    const page = await context.newPage();
    const errors = [];
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${base}/music-lab.html`);
    const tools = page.locator('[data-ref="tools"]');
    const fx = page.locator('[data-ref="effects"]');
    await tools.locator('[data-channel]').waitFor();

    // 1. Add multiple legendary hardware VSTs in Channel Console & test faceplates, presets, switches.
    for (const type of ['compressor', 'browser-opto-2a', 'browser-pultec-eq', 'browser-neve-pre', 'distortion', 'browser-tape-color', 'delay', 'browser-pulse-tremolo']) {
      await tools.locator('[data-fx-pick]').selectOption(type);
      await tools.locator('[data-ch-fx-add-picked]').click();
    }
    assert.equal(await tools.locator('.hw-face').count(), 8, '8 hardware faceplates render in Channel Console');
    assert.equal(await tools.locator('.hw-vu').count(), 2, '1176 + LA-2A VU meters render');

    // Click 1176 12:1 ratio switch, then ALL-buttons preset
    const compInsert = tools.locator('.mc-insert[data-effect-type="compressor"]');
    await compInsert.locator('[data-hw-set-key="ratio"][data-hw-set-val="12"]').click();
    assert.equal(await compInsert.locator('[data-hw-set-key="ratio"][data-hw-set-val="12"]').getAttribute('aria-pressed'), 'true');
    await compInsert.locator('[data-hw-preset="all-buttons"]').click();
    assert.equal(await compInsert.locator('[data-hw-preset="all-buttons"]').getAttribute('aria-pressed'), 'true');

    // Click LA-2A LIMIT switch & Silky vocal preset
    const la2aInsert = tools.locator('.mc-insert[data-effect-type="browser-opto-2a"]');
    await la2aInsert.locator('[data-hw-set-key="mode"][data-hw-set-val="1"]').click();
    assert.equal(await la2aInsert.locator('[data-hw-set-key="mode"][data-hw-set-val="1"]').getAttribute('aria-pressed'), 'true');
    await la2aInsert.locator('[data-hw-preset="silk-vocal"]').click();
    assert.equal(await la2aInsert.locator('[data-hw-preset="silk-vocal"]').getAttribute('aria-pressed'), 'true');

    // Verify FX Rack renders all 8 hardware faceplates with numeric inputs and preserves settings
    await page.locator('[data-ch-open-fx]').click();
    assert.equal(await fx.locator('.hw-face').count(), 8, '8 hardware faceplates render in FX Rack');
    assert.equal(await fx.locator('.mc-insert[data-effect-type="compressor"] [data-fx-param="drive"]').inputValue(), '68');
    assert.equal(await fx.locator('.mc-insert[data-effect-type="compressor"] [data-hw-all]').getAttribute('aria-pressed'), 'true');
    assert.equal(await fx.locator('.mc-insert[data-effect-type="browser-opto-2a"] [data-fx-param="peakReduction"]').inputValue(), '48');

    // Verify zero horizontal overflow at both desktop and 390px mobile
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `no overflow in FX rack at ${viewport.width}px`);

    // 2. Drive live audio through 1176 & LA-2A and verify VU needle & GR meter move
    await page.locator('[data-tab="tools"]').click();
    await page.locator('[data-act="play-instrument"]').click();
    await page.locator('[data-tab="fx"]').click();
    await page.waitForFunction(() => !!window.hwInstances?.compressor?.length && !!window.hwInstances?.['browser-opto-2a']?.length);
    await page.evaluate(() => {
      const c = AudioKit.context(), osc = c.createOscillator(), g = c.createGain();
      osc.frequency.value = 330; g.gain.value = 0.7;
      osc.connect(g);
      g.connect(window.hwInstances.compressor.at(-1).input);
      g.connect(window.hwInstances['browser-opto-2a'].at(-1).input);
      osc.start();
      window.hwTestTone = osc;
    });
    await page.waitForFunction(() => {
      const m1 = document.querySelector('[data-ref="effects"] .mc-insert[data-effect-type="compressor"] .hw-vu meter');
      const m2 = document.querySelector('[data-ref="effects"] .mc-insert[data-effect-type="browser-opto-2a"] .hw-vu meter');
      return Number(m1?.value) > 2 && Number(m2?.value) > 1;
    });
    await page.evaluate(() => window.hwTestTone.stop());

    // 3. Reload persistence check + DSP verification on OfflineAudioContext (once on desktop)
    if (viewport.width === 1440) {
      await page.waitForTimeout(1200);
      await page.reload();
      await page.locator('[data-ch-open-fx]').click();
      assert.equal(await fx.locator('.mc-insert[data-effect-type="compressor"] [data-fx-param="drive"]').inputValue(), '68', '1176 preset survived reload');
      assert.equal(await fx.locator('.mc-insert[data-effect-type="compressor"] [data-hw-all]').getAttribute('aria-pressed'), 'true', '1176 ALL mode survived reload');
      assert.equal(await fx.locator('.mc-insert[data-effect-type="browser-opto-2a"] [data-fx-param="peakReduction"]').inputValue(), '48', 'LA-2A preset survived reload');

      const dsp = await page.evaluate(async () => {
        async function renderTone(type, params, { freq = 440, amp = 0.5, seconds = 1, stereoDiff = false, impulse = false } = {}) {
          const sr = 48000, len = Math.floor(sr * seconds);
          const c = new OfflineAudioContext(2, len, sr);
          const p = AudioEffects.parameters(type, params);
          const fx = AudioEffects.registry[type].create(c, p);
          const src = c.createBufferSource(), buf = c.createBuffer(2, len, sr);
          for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            if (impulse) { d[0] = 0.8; }
            else { for (let i = 0; i < len; i++) d[i] = amp * Math.sin(2 * Math.PI * freq * i / sr); }
          }
          src.buffer = buf; src.connect(fx.input); fx.output.connect(c.destination); src.start();
          const out = await c.startRendering();
          const l = out.getChannelData(0), r = out.getChannelData(1);
          const finite = l.every(Number.isFinite) && r.every(Number.isFinite);
          const start = impulse ? 0 : Math.floor(len * 0.25);
          let e = 0, diff = 0;
          for (let i = start; i < len; i++) { e += l[i] * l[i]; diff += (l[i] - r[i]) ** 2; }
          const rms = Math.sqrt(e / (len - start));
          let midWindowEnergy = 0;
          if (impulse) {
            for (let i = Math.floor(0.12 * sr); i < Math.floor(0.32 * sr); i++) midWindowEnergy += l[i] * l[i];
          }
          fx.dispose?.();
          return { finite, rms, diff: Math.sqrt(diff / (len - start)), midWindowEnergy, tail: Array.from(l.slice(1500, 1520)) };
        }

        const all14 = Object.keys(AudioEffects.registry);
        const allValid = [];
        for (const id of all14) {
          allValid.push([id, await renderTone(id, {})]);
        }

        const optoLow = await renderTone('browser-opto-2a', { peakReduction: 0, gain: 0, mode: 0 }, { amp: 0.7 });
        const optoComp = await renderTone('browser-opto-2a', { peakReduction: 80, gain: 0, mode: 0 }, { amp: 0.7 });
        const optoLimit = await renderTone('browser-opto-2a', { peakReduction: 80, gain: 0, mode: 1 }, { amp: 0.7 });

        const pultec60 = await renderTone('browser-pultec-eq', { lowFreq: 60, lowBoost: 8, lowAtten: 8, tubeDrive: 0 }, { freq: 60, amp: 0.3 });
        const pultec160 = await renderTone('browser-pultec-eq', { lowFreq: 60, lowBoost: 8, lowAtten: 8, tubeDrive: 0 }, { freq: 160, amp: 0.3 });

        const neveFlat = await renderTone('browser-neve-pre', { preamp: 0, hpf: 0, output: 0 }, { freq: 80, amp: 0.3 });
        const neveHpf = await renderTone('browser-neve-pre', { preamp: 0, hpf: 4, output: 0 }, { freq: 80, amp: 0.3 });

        const tape30 = await renderTone('browser-tape-color', { speed: 2, tone: 18000, drive: 15 }, { freq: 9000, amp: 0.3 });
        const tape75 = await renderTone('browser-tape-color', { speed: 0, tone: 5500, drive: 15 }, { freq: 9000, amp: 0.3 });

        const delay1 = await renderTone('delay', { time: 400, heads: 1, wet: 0.8, feedback: 0.2 }, { impulse: true });
        const delay3 = await renderTone('delay', { time: 400, heads: 3, wet: 0.8, feedback: 0.2 }, { impulse: true });

        const revSpring = await renderTone('reverb', { tank: 0, wet: 1 }, { impulse: true });
        const revPlate = await renderTone('reverb', { tank: 1, wet: 1 }, { impulse: true });

        const tremPan = await renderTone('browser-pulse-tremolo', { circuit: 3, rate: 4, depth: 0.9 }, { freq: 440, amp: 0.4, stereoDiff: true });

        const dist0 = await renderTone('distortion', { circuit: 0, drive: 14 }, { freq: 220, amp: 0.4 });
        const dist2 = await renderTone('distortion', { circuit: 2, drive: 14 }, { freq: 220, amp: 0.4 });

        return {
          count: all14.length,
          allValid,
          optoLow, optoComp, optoLimit,
          pultec60, pultec160,
          neveFlat, neveHpf,
          tape30, tape75,
          delay1, delay3,
          revSpring, revPlate,
          tremPan,
          dist0, dist2,
        };
      });

      assert.equal(dsp.count, 14, '14 VST processors registered');
      for (const [id, r] of dsp.allValid) {
        assert.ok(r.finite && r.rms > 0, `${id} renders finite audible output`);
      }
      assert.ok(dsp.optoComp.rms < dsp.optoLow.rms * 0.75, 'LA-2A compresses with higher peak reduction');
      assert.ok(dsp.optoLimit.rms < dsp.optoComp.rms, 'LA-2A Limit mode compresses harder than Compress');
      assert.ok(dsp.pultec60.rms > dsp.pultec160.rms * 1.35, 'Pultec low-end trick boosts 60 Hz over 160 Hz');
      assert.ok(dsp.neveHpf.rms < dsp.neveFlat.rms * 0.15, '1073 300 Hz HPF strongly attenuates 80 Hz');
      assert.ok(dsp.tape75.rms < dsp.tape30.rms * 0.7, 'A800 7.5 IPS rolls off 9 kHz vs 30 IPS');
      assert.ok(dsp.delay3.midWindowEnergy > dsp.delay1.midWindowEnergy + 0.01, 'RE-201 3-head mode emits earlier head taps');
      assert.notDeepEqual(dsp.revSpring.tail, dsp.revPlate.tail, 'Spring and Plate impulses differ');
      assert.ok(dsp.tremPan.diff > 0.05, 'Rhodes stereo pan creates stereo L-R movement');
      assert.notEqual(dsp.dist0.rms.toFixed(4), dsp.dist2.rms.toFixed(4), '808 and Muff circuits produce distinct levels');

      await page.goto(`${base}/lessons/technical-elements/audio-engineering/allen-heath-qu7-mixer.html`);
      await page.waitForFunction(() => !!window.MusicHardwareVst && Object.keys(window.AudioEffects?.registry || {}).length >= 13);
    }

    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    await context.close();
  }
  console.log('Hardware VST checks passed: 14 DSP engines, vintage faceplates, presets, switches, live VU meters, reload persistence, and responsive layouts.');
} finally {
  await browser.close();
}
