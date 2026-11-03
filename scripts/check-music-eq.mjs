import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--disable-dev-shm-usage'] });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => {
      // Observe real processors without adding a test-only interface to the app.
      Object.defineProperty(window, 'MusicDawEQ', { configurable: true, set(api) {
        const create = api.create;
        window.eqProcessors = [];
        api.create = (c, input) => {
          const eq = create(c, input);
          if (c instanceof AudioContext) {
            eq.reads = 0; eq.releases = 0;
            const analyse = eq.analyse, release = eq.releaseAnalysis;
            eq.analyse = () => { eq.reads++; return analyse(); };
            eq.releaseAnalysis = () => { eq.releases++; release(); };
            window.eqProcessors.push(eq);
          }
          return eq;
        };
        Object.defineProperty(window, 'MusicDawEQ', { value: api, configurable: true });
      } });
    });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:8080/music-lab.html');
    await page.waitForFunction(() => document.querySelector('[data-ref="status"]')?.textContent);
    const eq = page.locator('.mc-s-eq'), preset = page.locator('[data-eq-preset]');
    await preset.selectOption('amber-warm');
    assert.equal(await page.locator('.mc').getAttribute('data-hardware'), 'amber');
    assert.equal(await eq.locator('[data-ch-switch="lowpass"]').getAttribute('aria-pressed'), 'true');
    // Keyboard edits become a custom patch; undo returns the whole preset.
    const cutoff = eq.locator('[data-key="cutoff"]');
    await cutoff.focus(); await cutoff.press('ArrowDown');
    await page.waitForTimeout(350);
    assert.equal(await preset.inputValue(), 'custom');
    await cutoff.press('Control+z');
    assert.equal(await preset.inputValue(), 'amber-warm');
    for (const id of ['crystal-tines', 'crystal-glass', 'slate-presence', 'slate-punch', 'amber-open', 'flat']) {
      await preset.selectOption(id);
      assert.equal(await preset.inputValue(), id);
      assert.equal(await eq.locator('[data-ch-switch="lowpass"]').getAttribute('aria-pressed'), String(id === 'amber-open'));
    }
    await preset.selectOption('slate-presence');
    await page.locator('[data-eq-style]').selectOption('crystal');
    assert.equal(await preset.inputValue(), 'slate-presence', 'faceplate choice does not change audio');
    await page.locator('[data-ch-fx-add="compressor"]').click();
    assert.equal(await page.locator('.mc[data-hardware="crystal"] .mc-insert').count(), 1);
    await page.locator('[data-ch-open-fx]').click();
    assert.equal(await page.locator('.mc-rack[data-hardware="crystal"] .mc-insert').count(), 1, 'FX editor shares the channel faceplate');
    await page.locator('[data-fx-action="bypass"]').click();
    assert.equal(await page.locator('.mc-rack .is-bypassed').count(), 1);
    await page.locator('[data-fx-action="bypass"]').click();
    await page.locator('[data-tab="tools"]').click();
    // Save and reload includes the complete channel EQ, and remains compatible with old presets.
    await page.locator('.daw-channel-options > summary').click();
    const downloading = page.waitForEvent('download');
    await page.locator('[data-channel-preset="save"]').click();
    const download = await downloading, filename = `/tmp/music-eq-${viewport.width}.json`;
    await download.saveAs(filename);
    const saved = JSON.parse(await fs.readFile(filename, 'utf8'));
    assert.equal(saved.strip.eqPreset, 'slate-presence'); assert.equal(saved.strip.eqStyle, 'crystal');
    await preset.selectOption('flat');
    await page.locator('.daw-channel-options > summary').click();
    await page.locator('[data-channel-preset="load"]').click();
    await page.locator('input[aria-label="Load Music Lab channel preset"]').setInputFiles(filename);
    await page.waitForFunction(() => document.querySelector('[data-ref="status"]').textContent.includes('Loaded preset'));
    assert.equal(await preset.inputValue(), 'slate-presence');

    // Exercise an actual instrument, then feed a deterministic tone through its channel graph.
    await page.locator('[data-act="play-instrument"]').click();
    await page.locator('[data-tab="tools"]').click();
    await preset.selectOption('amber-warm');
    await eq.locator('[data-channel-spectrum]').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const c = AudioKit.context(), osc = c.createOscillator(), level = c.createGain();
      osc.frequency.value = 8000; level.gain.value = .03;
      osc.connect(level); level.connect(eqProcessors.at(-1).input); osc.start();
      window.eqTestTone = { osc, level };
    });
    await page.waitForFunction(() => eqProcessors.at(-1).reads > 2);
    await page.waitForTimeout(700);
    const levels = await page.evaluate(() => {
      const p = eqProcessors.at(-1), d = p.analyse(), index = Math.round(8000 / (p.sampleRate / 2) * d.input.length);
      return { before: d.input[index], after: d.output[index] };
    });
    assert.ok(levels.before > -50, JSON.stringify(levels));
    assert.ok(levels.before - levels.after > 30, `low-pass changes real output: ${JSON.stringify(levels)}`);
    await page.locator('[data-eq-display="source"]').selectOption('output');
    await page.locator('[data-eq-display="smoothing"]').selectOption('0.3');
    await page.locator('[data-eq-freeze]').click(); await page.waitForTimeout(100);
    const frozen = await eq.locator('canvas').evaluate(c => c.toDataURL());
    await page.waitForTimeout(150);
    assert.equal(await eq.locator('canvas').evaluate(c => c.toDataURL()), frozen, 'freeze holds spectrum and peaks');
    await page.locator('[data-eq-freeze]').click();
    await eq.locator('[data-ch-switch="eqOn"]').click();
    await eq.locator('canvas').scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
    const bypass = await page.evaluate(() => {
      const p = eqProcessors.at(-1), d = p.analyse(), index = Math.round(8000 / (p.sampleRate / 2) * d.input.length);
      return Math.abs(d.input[index] - d.output[index]);
    });
    assert.ok(bypass < .3, `bypass restores the input: ${bypass}`);
    await eq.locator('[data-ch-switch="eqOn"]').click();
    await eq.locator('canvas').scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
    await eq.screenshot({ path: `/tmp/music-eq-${viewport.width}.png` });
    await page.locator('[data-channel]').selectOption({ label: 'Drums' });
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(() => eqProcessors.at(-1).releases > 0), 'switching channels releases FFT taps');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.evaluate(() => eqTestTone.osc.stop());
    assert.deepEqual(errors, []);
    console.log(`${viewport.width}px: preset editing, undo, channel files, live FFT, freeze, bypass, rack theme and overflow passed`);

    if (viewport.width === 1440) {
      const results = await page.evaluate(async () => {
        async function render(strip, f = 8000) {
          const c = new OfflineAudioContext(1, 48000, 48000), eq = MusicDawEQ.create(c);
          eq.apply(strip, 0, true); eq.output.connect(c.destination);
          const source = c.createOscillator(); source.frequency.value = f; source.connect(eq.input); source.start();
          const result = (await c.startRendering()).getChannelData(0);
          const response = eq.response(new Float32Array([f]), new Float32Array(1))[0];
          const rms = Math.sqrt(result.slice(12000).reduce((sum, x) => sum + x * x, 0) / 36000);
          return { rms, response };
        }
        const flat = await render(MusicDawEQ.defaults);
        const shaped = await render(MusicDawEQ.preset({}, 'amber-warm'));
        const bypass = await render({ ...MusicDawEQ.preset({}, 'amber-warm'), eqOn: false });
        const corner = await render({ ...MusicDawEQ.defaults, lowpass: true, cutoff: 1000 }, 1000);
        const gains = {};
        for (const id of Object.keys(MusicDawEQ.presets)) gains[id] = await render(MusicDawEQ.preset({}, id), 1000);
        return { flat, shaped, bypass, corner, gains };
      });
      assert.ok(Math.abs(results.flat.rms - Math.SQRT1_2) < .001);
      assert.ok(results.shaped.rms < results.flat.rms / 30, JSON.stringify(results));
      assert.ok(Math.abs(results.bypass.rms - results.flat.rms) < 1e-6, 'offline bypass preserves samples');
      assert.ok(Math.abs(results.corner.response + 6.02) < .02, 'two Q=.707 low-pass sections give -6 dB at cutoff');
      for (const { rms, response } of Object.values(results.gains)) {
        assert.ok(Number.isFinite(rms) && rms > 0);
        assert.ok(Math.abs(20 * Math.log10(rms / Math.SQRT1_2) - response) < .05, 'plotted response matches rendered audio');
      }
      console.log('Offline audio: flat unity, low-pass attenuation, exact bypass and every preset render passed');
    }
    await context.close();
  }
} finally { await browser.close(); }
