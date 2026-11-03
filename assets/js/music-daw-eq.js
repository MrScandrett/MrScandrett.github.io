/* Hardware-inspired channel EQ. The same processor serves live and offline mixes.
 * Presets are listening starting points, not circuit or synthesizer emulations.
 * Design references:
 * https://back.moogmusic.com/sites/default/files/2022-11/Minimoog_Model_D_Manual.pdf
 * https://usa.yamaha.com/products/contents/music_production/synth_50th/history/chapter002.html
 * https://www.solidstatelogic.com/channel-strip-guide
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicDawEQ = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const defaults = { lo: 0, loF: 100, mid: 0, midF: 1000, midQ: 1, upper: 0, upperF: 3000, upperQ: 1, hi: 0, hiF: 8000, lowpass: false, cutoff: 20000, resonance: 0.707, eqOn: true };
  const presets = {
    flat: { name: 'Studio · flat', style: 'studio', note: 'Four bands, ready for your own sound. Start playback or play this channel to see its spectrum.', values: {} },
    'amber-warm': { name: 'Amber Analog · warm bass', style: 'amber', note: 'A rounded low end with a resonant 24 dB/oct low-pass for warm analog-style bass. A linear filter approximation; no ladder saturation or synth voice.', values: { lo: 3, loF: 110, lowpass: true, cutoff: 2400, resonance: 1.2 } },
    'amber-open': { name: 'Amber Analog · open lead', style: 'amber', note: 'Sweep Cutoff and Emphasis for a singing, resonant low-pass contour. Two biquads shape the slope; this does not model an analog ladder circuit.', values: { lowpass: true, cutoff: 5200, resonance: 2, mid: 1.5, midF: 900, midQ: 0.7 } },
    'crystal-tines': { name: 'Crystal FM · tine clarity', style: 'crystal', note: 'A low-mid dip and bright upper harmonics for electric-piano parts. A complementary tone preset for bright, tine-like FM textures; it shapes existing audio rather than synthesizing a voice.', values: { lo: -1, loF: 150, mid: -3, midF: 450, midQ: 0.8, upper: 3, upperF: 3200, upperQ: 1.1, hi: 2, hiF: 9500 } },
    'crystal-glass': { name: 'Crystal FM · glass bells', style: 'crystal', note: 'An airy shelf and focused presence for bell-like FM sounds. This shapes existing audio; it does not generate an FM voice.', values: { lo: -3, loF: 200, mid: -2, midF: 800, upper: 2.5, upperF: 4800, upperQ: 1.4, hi: 3, hiF: 10000 } },
    'slate-presence': { name: 'Slate Console · vocal presence', style: 'slate', note: 'Four console-style bands: low shelf, two constant-Q mids and high shelf. A presence lift and low-mid cut for clear, forward vocals; no circuit emulation.', values: { lo: -1.5, loF: 120, mid: -2.5, midF: 350, midQ: 1.2, upper: 3, upperF: 3500, upperQ: 1, hi: 2, hiF: 12000 } },
    'slate-punch': { name: 'Slate Console · drum punch', style: 'slate', note: 'Low-end weight, less boxiness and a little attack. A punchy four-band console starting point; adjust each band to your recording.', values: { lo: 3, loF: 80, mid: -3, midF: 400, midQ: 1.4, upper: 2.5, upperF: 4500, upperQ: 1.2, hi: 1.5, hiF: 10000 } },
  };
  function preset(strip, id) {
    const p = presets[id];
    return p ? { ...strip, ...defaults, ...p.values, eqStyle: p.style, eqPreset: id } : strip;
  }
  function create(c, input) {
    input ||= c.createGain();
    const output = c.createGain(), dry = c.createGain(), wet = c.createGain();
    const lo = c.createBiquadFilter(), mid = c.createBiquadFilter(), upper = c.createBiquadFilter(), hi = c.createBiquadFilter();
    const lp1 = c.createBiquadFilter(), lp2 = c.createBiquadFilter(), lpDry = c.createGain(), lpWet = c.createGain(), sum = c.createGain();
    lo.type = 'lowshelf'; mid.type = upper.type = 'peaking'; hi.type = 'highshelf'; lp1.type = lp2.type = 'lowpass';
    input.connect(dry); dry.connect(output);
    input.connect(lo); lo.connect(mid); mid.connect(upper); upper.connect(hi);
    hi.connect(lpDry); lpDry.connect(sum); hi.connect(lp1); lp1.connect(lp2); lp2.connect(lpWet); lpWet.connect(sum);
    sum.connect(wet); wet.connect(output);
    const filters = [lo, mid, upper, hi, lp1, lp2];
    let current = defaults, analysis = null;
    function apply(value, now = c.currentTime, instant = false) {
      current = { ...defaults, ...value };
      const v = current, set = (p, x) => instant ? (p.value = x) : p.setTargetAtTime(x, now, .015);
      for (const [node, gain, freq, q] of [[lo, v.lo, v.loF], [mid, v.mid, v.midF, v.midQ], [upper, v.upper, v.upperF, v.upperQ], [hi, v.hi, v.hiF]]) {
        set(node.gain, gain); set(node.frequency, Math.min(freq, c.sampleRate * .49)); if (q) set(node.Q, q);
      }
      set(lp1.frequency, Math.min(v.cutoff, c.sampleRate * .49)); set(lp2.frequency, Math.min(v.cutoff, c.sampleRate * .49));
      // Web Audio expresses low-pass Q in dB; mid-bell Q is linear.
      // https://www.w3.org/TR/webaudio/#dom-biquadfilternode-q
      set(lp1.Q, 20 * Math.log10(v.resonance)); set(lp2.Q, 20 * Math.log10(Math.SQRT1_2));
      set(lpDry.gain, v.lowpass ? 0 : 1); set(lpWet.gain, v.lowpass ? 1 : 0);
      set(dry.gain, v.eqOn ? 0 : 1); set(wet.gain, v.eqOn ? 1 : 0);
    }
    function analyse() {
      if (!analysis) {
        const before = c.createAnalyser(), after = c.createAnalyser();
        [before, after].forEach(n => { n.fftSize = 4096; n.minDecibels = -100; n.maxDecibels = 0; n.smoothingTimeConstant = .75; });
        input.connect(before); output.connect(after);
        analysis = { before, after, input: new Float32Array(before.frequencyBinCount), output: new Float32Array(after.frequencyBinCount) };
      }
      analysis.before.getFloatFrequencyData(analysis.input); analysis.after.getFloatFrequencyData(analysis.output);
      return analysis;
    }
    function releaseAnalysis() {
      if (!analysis) return;
      input.disconnect(analysis.before); output.disconnect(analysis.after);
      analysis.before.disconnect(); analysis.after.disconnect(); analysis = null;
    }
    const mags = [], phases = [];
    function response(frequencies, result) {
      result.fill(0);
      if (!current.eqOn) return result;
      filters.slice(0, current.lowpass ? 6 : 4).forEach((node, i) => {
        if (mags[i]?.length !== frequencies.length) { mags[i] = new Float32Array(frequencies.length); phases[i] = new Float32Array(frequencies.length); }
        node.getFrequencyResponse(frequencies, mags[i], phases[i]);
        for (let j = 0; j < result.length; j++) result[j] += 20 * Math.log10(Math.max(1e-12, mags[i][j]));
      });
      return result;
    }
    apply(defaults, 0, true);
    return { input, output, apply, analyse, releaseAnalysis, response, sampleRate: c.sampleRate };
  }

  // One visible channel, one FFT pair. Drawing is driven by the studio's frame loop.
  let previewProcessor = null;
  function view(canvas) {
    const g = canvas.getContext('2d'), N = 256, frequencies = new Float32Array(N), curve = new Float32Array(N);
    let signature = '', last = 0, held = null, lastProcessor = null;
    const peaks = new Float32Array(N).fill(-100);
    const values = new Float32Array(N).fill(-100);
    function draw(processor, strip, options = {}, time = performance.now()) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || document.hidden || rect.bottom < 0 || rect.top > innerHeight) return;
      if (time - last < 33) return;
      const dt = Math.min(1, (time - last) / 1000); last = time;
      const dpr = Math.min(devicePixelRatio || 1, 2), W = rect.width, H = rect.height;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const left = 32, right = W - 30, top = 22, bottom = H - 24, width = right - left, height = bottom - top;
      const maxF = Math.min(20000, (processor?.sampleRate || 48000) * .49), logRange = Math.log(maxF / 20);
      const xOf = f => left + Math.log(f / 20) / logRange * width;
      const yDb = db => bottom - Math.max(0, Math.min(1, (db + 100) / 100)) * height;
      const yCurve = db => top + (18 - Math.max(-18, Math.min(18, db))) / 36 * height;
      g.fillStyle = '#0c191c'; g.fillRect(0, 0, W, H);
      g.font = '10px system-ui, sans-serif'; g.lineWidth = 1; g.strokeStyle = '#2c4145'; g.fillStyle = '#b4c7ca';
      for (const db of [-80, -60, -40, -20, 0]) {
        const y = yDb(db); g.beginPath(); g.moveTo(left, y); g.lineTo(right, y); g.stroke(); g.fillText(String(db), 3, y + 3);
      }
      for (const f of [20, 100, 1000, 10000, 20000]) {
        if (f > maxF) continue;
        const x = xOf(f); g.beginPath(); g.moveTo(x, top); g.lineTo(x, bottom); g.stroke(); g.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), x - 8, H - 7);
      }
      g.fillText('dBFS', 2, 12); g.fillStyle = '#f5c46a'; g.fillText('EQ dB', W - 32, 12);
      for (const db of [18, 0, -18]) g.fillText(db > 0 ? '+' + db : String(db), right + 5, yCurve(db) + 3);
      if (lastProcessor !== processor) { held = null; peaks.fill(-100); lastProcessor = processor; }
      const data = processor ? (options.freeze && held ? held : processor.analyse()) : null;
      if (data && (!options.freeze || !held)) {
        if (!held || held.input.length !== data.input.length) held = { input: new Float32Array(data.input.length), output: new Float32Array(data.output.length) };
        held.input.set(data.input); held.output.set(data.output);
        data.before.smoothingTimeConstant = data.after.smoothingTimeConstant = options.smoothing ?? .75;
      }
      function spectrum(bins, color, fill) {
        g.beginPath();
        for (let i = 0; i < N; i++) {
          const f = 20 * Math.exp(i / (N - 1) * logRange), next = 20 * Math.exp((i + 1) / (N - 1) * logRange);
          const step = processor.sampleRate / 2 / bins.length;
          const a = Math.max(1, Math.floor(f / step)), b = Math.min(bins.length - 1, Math.max(a, Math.ceil(next / step)));
          let db = -100;
          for (let j = a; j <= b; j++) if (Number.isFinite(bins[j])) db = Math.max(db, bins[j]);
          values[i] = db;
          const x = left + i / (N - 1) * width, y = yDb(db);
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.strokeStyle = color; g.lineWidth = 1.5; g.stroke();
        if (fill) { g.lineTo(right, bottom); g.lineTo(left, bottom); g.closePath(); g.fillStyle = fill; g.fill(); }
      }
      if (data) {
        if (options.source !== 'output') spectrum(data.input, '#9eafb7');
        if (options.source !== 'input') spectrum(data.output, '#69d4da', '#69d4da20');
        if (options.peaks) {
          g.beginPath();
          for (let i = 0; i < N; i++) {
            peaks[i] = Math.max(values[i], peaks[i] - (options.freeze ? 0 : dt * 10));
            const x = left + i / (N - 1) * width, y = yDb(peaks[i]); if (i) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.strokeStyle = '#bba9ec'; g.lineWidth = 1; g.stroke();
        }
      }
      for (let i = 0; i < N; i++) frequencies[i] = 20 * Math.exp(i / (N - 1) * logRange);
      let eq = processor;
      if (!eq) {
        if (!previewProcessor) previewProcessor = create(new OfflineAudioContext(1, 1, 48000));
        const sig = JSON.stringify(strip);
        if (sig !== signature) { previewProcessor.apply(strip, 0, true); signature = sig; }
        eq = previewProcessor;
      }
      eq.response(frequencies, curve);
      g.beginPath(); g.strokeStyle = '#f5c46a'; g.lineWidth = 2;
      for (let i = 0; i < N; i++) { const x = left + i / (N - 1) * width, y = yCurve(curve[i]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
      if (!data) { g.fillStyle = '#d1e1e3'; g.textAlign = 'center'; g.fillText('Play this channel to analyse its sound', (left + right) / 2, bottom - 10); g.textAlign = 'left'; }
    }
    return { draw };
  }
  return { defaults, presets, preset, create, view };
}));
