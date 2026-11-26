/* Legendary hardware VST emulations, vintage faceplates, presets, and live VU
 * metering for Music Lab. Registers LA-2A, EQP-1A, and 1073 browser plugins,
 * and provides authentic hardware panels for all 12 hardware-modeled VSTs. */
(function () {
  'use strict';
  if (!window.AudioEffects) return;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const control = (key, label, min, max, step, value, unit) => ({ key, label, min, max, step, value, unit });
  const meta = (name, description) => ({
    name, description, format: 'browser', vendor: 'ClassroomOS', license: 'Project source license',
    locallyHosted: true, offlineSupported: true, cpu: 'Light', controls: [],
  });
  const clamp = (v, min, max, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  const paramsOf = (def, values = {}) => Object.fromEntries(def.controls.map(d => [d.key, clamp(values[d.key], d.min, d.max, d.value)]));

  function makeCurve(fn, len = 1025) {
    const curve = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const x = (i * 2) / (len - 1) - 1;
      curve[i] = fn(x);
    }
    return curve;
  }

  /* ── 1. LA-2A Optical Leveling Amplifier ────────────────────────────────── */
  const opto2a = meta('LA-2A Optical Leveler', 'Tube optical leveling amplifier inspired by the Teletronix LA-2A: program-dependent soft-knee compression and warm 12AX7/12BH7 saturation.');
  opto2a.controls = [
    control('peakReduction', 'Peak reduction', 0, 100, 1, 42, '%'),
    control('gain', 'Gain', -12, 18, .5, 3, 'dB'),
    control('mode', 'Mode', 0, 1, 1, 0, ''),
    control('emphasis', 'HF emphasis', 0, 100, 1, 30, '%'),
  ];
  opto2a.create = (context, p) => {
    const input = context.createGain(), preEmph = context.createBiquadFilter(), comp = context.createDynamicsCompressor();
    const deEmph = context.createBiquadFilter(), tube = context.createWaveShaper(), output = context.createGain();
    preEmph.type = 'highshelf'; preEmph.frequency.value = 3500;
    deEmph.type = 'highshelf'; deEmph.frequency.value = 3500;
    tube.oversample = '2x';
    tube.curve = makeCurve(x => Math.tanh((x + 0.03 * (1 - x * x)) * 1.45) / Math.tanh(1.45));
    input.connect(preEmph); preEmph.connect(comp); comp.connect(deEmph); deEmph.connect(tube); tube.connect(output);
    comp.attack.value = 0.010;

    function apply(values, instant) {
      const v = paramsOf(opto2a, values);
      const set = (param, x) => instant ? (param.value = x) : param.setTargetAtTime(x, context.currentTime, .015);
      const limit = v.mode >= 0.5;
      const emphDb = (v.emphasis / 100) * 3.0;
      set(preEmph.gain, emphDb);
      set(deEmph.gain, -emphDb);
      set(comp.threshold, -4 - v.peakReduction * 0.44);
      set(comp.ratio, limit ? 12 : 3.5);
      set(comp.knee, limit ? 6 : 22);
      set(comp.release, 0.28 + v.peakReduction * 0.004);
      set(output.gain, 10 ** (v.gain / 20));
    }
    apply(p, true);
    return {
      input, output,
      update: next => apply(next, false),
      meter: () => ({ reduction: Math.max(0, -comp.reduction) }),
      dispose() { [input, preEmph, comp, deEmph, tube, output].forEach(n => n.disconnect()); }
    };
  };

  /* ── 2. EQP-1A Tube Program Equalizer ───────────────────────────────────── */
  const pultecEq = meta('EQP-1A Tube Program EQ', 'Passive LC program equalizer inspired by the Pultec EQP-1A: simultaneous low-end boost & attenuate shelf offset plus push-pull tube warmth.');
  pultecEq.controls = [
    control('lowFreq', 'Low freq', 20, 100, 10, 60, 'Hz'),
    control('lowBoost', 'Low boost', 0, 10, .5, 3, ''),
    control('lowAtten', 'Low atten', 0, 10, .5, 2, ''),
    control('highFreq', 'High freq', 3000, 16000, 500, 10000, 'Hz'),
    control('highBoost', 'High boost', 0, 10, .5, 2, ''),
    control('bandwidth', 'Bandwidth', 0, 10, .5, 5, ''),
    control('attenFreq', 'Atten sel', 5000, 20000, 1000, 10000, 'Hz'),
    control('highAtten', 'High atten', 0, 10, .5, 0, ''),
    control('tubeDrive', 'Tube warmth', 0, 100, 1, 25, '%'),
    control('output', 'Output', -12, 12, .5, 0, 'dB'),
  ];
  pultecEq.create = (context, p) => {
    const input = context.createGain(), lowB = context.createBiquadFilter(), lowA = context.createBiquadFilter();
    const highB = context.createBiquadFilter(), highA = context.createBiquadFilter();
    const tube = context.createWaveShaper(), output = context.createGain();
    lowB.type = 'lowshelf'; lowA.type = 'lowshelf';
    highB.type = 'peaking'; highA.type = 'highshelf';
    tube.oversample = '2x';
    input.connect(lowB); lowB.connect(lowA); lowA.connect(highB); highB.connect(highA); highA.connect(tube); tube.connect(output);

    let lastDrive = -1;
    function apply(values, instant) {
      const v = paramsOf(pultecEq, values);
      const set = (param, x) => instant ? (param.value = x) : param.setTargetAtTime(x, context.currentTime, .015);
      // The Pultec "low-end trick": boost shelf sits near 1.45x lowFreq while attenuate shelf sits near 2.8x,
      // lifting sub weight while carving a clean upper-bass pocket.
      set(lowB.frequency, Math.min(v.lowFreq * 1.45, context.sampleRate * .49));
      set(lowB.gain, v.lowBoost * 1.5);
      set(lowA.frequency, Math.min(v.lowFreq * 2.8, context.sampleRate * .49));
      set(lowA.gain, -v.lowAtten * 1.1);
      set(highB.frequency, Math.min(v.highFreq, context.sampleRate * .49));
      set(highB.gain, v.highBoost * 1.4);
      set(highB.Q, Math.max(0.4, 4.2 - v.bandwidth * 0.37));
      set(highA.frequency, Math.min(v.attenFreq, context.sampleRate * .49));
      set(highA.gain, -v.highAtten * 1.5);
      if (v.tubeDrive !== lastDrive) {
        const k = 1 + (v.tubeDrive / 100) * 1.6;
        const norm = Math.tanh(k);
        tube.curve = v.tubeDrive <= 0.5 ? makeCurve(x => x, 257) : makeCurve(x => Math.tanh((x + 0.025 * (v.tubeDrive / 100) * (1 - x * x)) * k) / norm);
        lastDrive = v.tubeDrive;
      }
      set(output.gain, 10 ** (v.output / 20));
    }
    apply(p, true);
    return {
      input, output,
      update: next => apply(next, false),
      dispose() { [input, lowB, lowA, highB, highA, tube, output].forEach(n => n.disconnect()); }
    };
  };

  /* ── 3. 1073 Class-A Mic Preamp & Inductor EQ ───────────────────────────── */
  const nevePre = meta('1073 Class-A Preamp & EQ', 'Class-A transformer mic preamp and 3-band EQ inspired by the Neve 1073: Marinair-style harmonic saturation, stepped HPF, and fixed 12 kHz air shelf.');
  nevePre.controls = [
    control('preamp', 'Preamp gain', 0, 40, 1, 12, 'dB'),
    control('hpf', 'HPF', 0, 4, 1, 0, ''),
    control('low', 'Low shelf', -16, 16, .5, 0, 'dB'),
    control('midFreq', 'Mid freq', 360, 4800, 20, 1600, 'Hz'),
    control('mid', 'Mid gain', -18, 18, .5, 0, 'dB'),
    control('high', '12k Air', -16, 16, .5, 0, 'dB'),
    control('output', 'Output fader', -24, 6, .5, 0, 'dB'),
  ];
  nevePre.create = (context, p) => {
    const input = context.createGain(), preGain = context.createGain(), xfmr = context.createWaveShaper();
    const trim = context.createGain(), hpfDry = context.createGain(), hpfWet = context.createGain();
    const hpf1 = context.createBiquadFilter(), hpf2 = context.createBiquadFilter(), hpfSum = context.createGain();
    const lo = context.createBiquadFilter(), mid = context.createBiquadFilter(), hi = context.createBiquadFilter(), output = context.createGain();
    xfmr.oversample = '4x';
    xfmr.curve = makeCurve(x => {
      const bias = x >= 0 ? x * 1.12 : x * 0.94;
      return Math.tanh(bias * 1.35) / Math.tanh(1.35);
    });
    hpf1.type = hpf2.type = 'highpass';
    hpf1.Q.value = hpf2.Q.value = -3.0103;
    lo.type = 'lowshelf'; lo.frequency.value = 110;
    mid.type = 'peaking'; mid.Q.value = 1.1;
    hi.type = 'highshelf'; hi.frequency.value = Math.min(12000, context.sampleRate * .49);

    input.connect(preGain); preGain.connect(xfmr); xfmr.connect(trim);
    trim.connect(hpfDry); hpfDry.connect(hpfSum);
    trim.connect(hpf1); hpf1.connect(hpf2); hpf2.connect(hpfWet); hpfWet.connect(hpfSum);
    hpfSum.connect(lo); lo.connect(mid); mid.connect(hi); hi.connect(output);

    const hpfTable = [20, 50, 80, 160, 300];
    function apply(values, instant) {
      const v = paramsOf(nevePre, values);
      const set = (param, x) => instant ? (param.value = x) : param.setTargetAtTime(x, context.currentTime, .015);
      const driveLin = 10 ** (v.preamp / 20);
      set(preGain.gain, driveLin);
      set(trim.gain, 1 / (1 + (driveLin - 1) * 0.35));
      const hpfIdx = Math.round(v.hpf);
      const hpfHz = hpfTable[hpfIdx] || 20;
      set(hpf1.frequency, hpfHz); set(hpf2.frequency, hpfHz);
      set(hpfDry.gain, hpfIdx === 0 ? 1 : 0);
      set(hpfWet.gain, hpfIdx === 0 ? 0 : 1);
      set(lo.gain, v.low);
      set(mid.frequency, Math.min(v.midFreq, context.sampleRate * .49));
      set(mid.gain, v.mid);
      set(hi.gain, v.high);
      set(output.gain, 10 ** (v.output / 20));
    }
    apply(p, true);
    return {
      input, output,
      update: next => apply(next, false),
      dispose() { [input, preGain, xfmr, trim, hpfDry, hpfWet, hpf1, hpf2, hpfSum, lo, mid, hi, output].forEach(n => n.disconnect()); }
    };
  };

  window.AudioEffects.register('browser-opto-2a', opto2a);
  window.AudioEffects.register('browser-pultec-eq', pultecEq);
  window.AudioEffects.register('browser-neve-pre', nevePre);
  if (window.MusicBrowserPlugins?.ids) {
    for (const id of ['browser-opto-2a', 'browser-pultec-eq', 'browser-neve-pre']) {
      if (!window.MusicBrowserPlugins.ids.includes(id)) window.MusicBrowserPlugins.ids.push(id);
    }
  }

  /* ── Hardware Presets (3–4 per unit) ────────────────────────────────────── */
  const presets = {
    compressor: {
      'vocal-1176': { name: 'Lead vocal bite', params: { threshold: -22, ratio: 4, knee: 4, attack: 6, release: 120, parallel: 1, makeup: 4, drive: 22 } },
      'drum-crush': { name: 'Parallel drum smash', params: { threshold: -34, ratio: 12, knee: 2, attack: 3, release: 80, parallel: .45, makeup: 6, drive: 45 } },
      'all-buttons': { name: 'All-buttons room nuke', params: { threshold: -38, ratio: 20, knee: 0, attack: 1, release: 60, parallel: .65, makeup: 8, drive: 68 } },
    },
    'browser-opto-2a': {
      'silk-vocal': { name: 'Silky vocal', params: { peakReduction: 48, gain: 4, mode: 0, emphasis: 35 } },
      'bass-glue': { name: 'Warm bass glue', params: { peakReduction: 56, gain: 5, mode: 0, emphasis: 10 } },
      'optolimit': { name: 'Gentle tape limit', params: { peakReduction: 64, gain: 4, mode: 1, emphasis: 45 } },
    },
    limiter: {
      'master-670': { name: 'Master bus glue', params: { ceiling: -1, release: 160, drive: 3 } },
      'warm-peak': { name: 'Warm tube ceiling', params: { ceiling: -1.5, release: 100, drive: 6 } },
      'loud-clean': { name: 'Clean brickwall', params: { ceiling: -.5, release: 80, drive: 0 } },
    },
    'browser-pultec-eq': {
      'low-trick': { name: 'Pultec low-end trick', params: { lowFreq: 60, lowBoost: 5, lowAtten: 4.5, highFreq: 10000, highBoost: 2.5, bandwidth: 6, attenFreq: 10000, highAtten: 0, tubeDrive: 30, output: 0 } },
      'vocal-air': { name: '12k silky vocal air', params: { lowFreq: 100, lowBoost: 0, lowAtten: 2, highFreq: 12000, highBoost: 4.5, bandwidth: 7, attenFreq: 20000, highAtten: 0, tubeDrive: 25, output: 0 } },
      'warm-master': { name: 'Warm mastering smile', params: { lowFreq: 60, lowBoost: 3, lowAtten: 1.5, highFreq: 10000, highBoost: 3, bandwidth: 7.5, attenFreq: 10000, highAtten: 0, tubeDrive: 35, output: -1 } },
    },
    eq: {
      'master-clarity': { name: 'Master clarity', params: { lowFrequency: 70, lowGain: 1.5, lowMidFrequency: 280, lowMidGain: -2.5, lowMidQ: 1.2, frequency: 1000, gain: 0, Q: 1, highMidFrequency: 3600, highMidGain: 2, highMidQ: 1.1, highFrequency: 11000, highGain: 2 } },
      'kick-sculpt': { name: 'Tight kick & bass', params: { lowFrequency: 65, lowGain: 3.5, lowMidFrequency: 240, lowMidGain: -4, lowMidQ: 1.6, frequency: 1000, gain: 0, Q: 1, highMidFrequency: 3200, highMidGain: 2.5, highMidQ: 1.2, highFrequency: 10000, highGain: 0 } },
      'acoustic-shine': { name: 'Acoustic sparkle', params: { lowFrequency: 90, lowGain: -2, lowMidFrequency: 320, lowMidGain: -2, lowMidQ: 1, frequency: 1200, gain: 1, Q: .9, highMidFrequency: 4200, highMidGain: 2.5, highMidQ: 1.2, highFrequency: 12000, highGain: 3 } },
    },
    'browser-neve-pre': {
      'vocal-1073': { name: '1073 Vocal presence', params: { preamp: 16, hpf: 2, low: -1, midFreq: 3200, mid: 3, high: 2.5, output: -2 } },
      'snare-punch': { name: 'Snare punch & snap', params: { preamp: 22, hpf: 2, low: 3.5, midFreq: 2400, mid: 2.5, high: 3, output: -4 } },
      'bass-di': { name: 'Thick bass DI', params: { preamp: 20, hpf: 1, low: 4, midFreq: 720, mid: 2, high: 0, output: -4 } },
    },
    distortion: {
      'ts808-push': { name: '808 Tube push', params: { drive: 7, tone: 4200, output: -4, circuit: 0 } },
      'rat-crunch': { name: 'RAT Crunchy lead', params: { drive: 14, tone: 3600, output: -7, circuit: 1 } },
      'muff-sustain': { name: 'Muff Wall of fuzz', params: { drive: 22, tone: 2800, output: -10, circuit: 2 } },
      'tweed-edge': { name: 'Tweed Amp breakup', params: { drive: 8, tone: 5400, output: -5, circuit: 3 } },
    },
    'browser-tape-color': {
      'a800-15ips': { name: '15 IPS Classic warm', params: { drive: 34, tone: 10500, output: 0, speed: 1, flutter: 15 } },
      'a800-30ips': { name: '30 IPS Mastering hi-fi', params: { drive: 18, tone: 16000, output: 0, speed: 2, flutter: 6 } },
      'a800-75ips': { name: '7.5 IPS Lo-fi cassette', params: { drive: 58, tone: 5800, output: -1, speed: 0, flutter: 45 } },
    },
    delay: {
      'slapback': { name: 'Sun slapback tape', params: { time: 110, feedback: .15, tone: 4200, wet: .28, flutter: 24, heads: 1 } },
      'dub-3head': { name: 'Space 3-head dub', params: { time: 380, feedback: .52, tone: 3200, wet: .34, flutter: 36, heads: 3 } },
      'stereo-lead': { name: 'Dual-head solo', params: { time: 320, feedback: .35, tone: 5600, wet: .25, flutter: 18, heads: 2 } },
    },
    reverb: {
      'surf-spring': { name: "'63 Surf spring", params: { tank: 0, size: 2.1, decay: 2.5, predelay: 5, lowcut: 140, tone: 5200, wet: .32 } },
      'emt-vocal': { name: 'EMT-140 Vocal plate', params: { tank: 1, size: 2.4, decay: 3.2, predelay: 20, lowcut: 160, tone: 11000, wet: .28 } },
      'abbey-room': { name: 'Abbey live chamber', params: { tank: 2, size: 1.6, decay: 3, predelay: 12, lowcut: 110, tone: 6800, wet: .26 } },
    },
    chorus: {
      'ce1-classic': { name: 'CE-1 Classic ensemble', params: { mode: 0, rate: .65, depth: 3.2, tone: 7500, wet: .45 } },
      'juno-twin': { name: 'Juno-60 Twin wash', params: { mode: 1, rate: .55, depth: 4.2, tone: 9000, wet: .55 } },
      'ce1-vibrato': { name: 'CE-1 Pitch vibrato', params: { mode: 2, rate: 3.8, depth: 2.4, tone: 6500, wet: .85 } },
    },
    'browser-pulse-tremolo': {
      'blackface': { name: "'65 Blackface opto", params: { circuit: 0, rate: 4.5, depth: .55 } },
      'brownface': { name: "'61 Harmonic swirl", params: { circuit: 1, rate: 3.6, depth: .75 } },
      'rhodes-pan': { name: 'Rhodes stereo pan', params: { circuit: 3, rate: 2.4, depth: .8 } },
    },
  };

  /* ── Shared Faceplate Primitives ─────────────────────────────────────────── */
  function vuSvg(index, label = 'VU / GR') {
    const ticks = [[-36, '-20'], [-24, '-10'], [-13, '-7'], [-3, '-5'], [7, '-3'], [17, '-1'], [26, '0'], [35, '+3']];
    const marks = ticks.map(([deg, txt]) => {
      const r = (deg - 90) * Math.PI / 180;
      const x1 = (70 + Math.cos(r) * 44).toFixed(1), y1 = (68 + Math.sin(r) * 44).toFixed(1);
      const x2 = (70 + Math.cos(r) * 50).toFixed(1), y2 = (68 + Math.sin(r) * 50).toFixed(1);
      const tx = (70 + Math.cos(r) * 35).toFixed(1), ty = (68 + Math.sin(r) * 35).toFixed(1);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${deg > 26 ? 'hw-vu-red' : ''}"/><text x="${tx}" y="${ty}" text-anchor="middle">${txt}</text>`;
    }).join('');
    return `<div class="hw-vu" data-hw-vu-index="${index}">
      <svg viewBox="0 0 140 72" role="img" aria-label="${esc(label)} gain reduction meter">
        <path class="hw-vu-arc" d="M 28 36 A 48 48 0 0 1 92 22"/>
        <path class="hw-vu-arc-red" d="M 92 22 A 48 48 0 0 1 114 36"/>
        ${marks}
        <text class="hw-vu-tag" x="70" y="54" text-anchor="middle">GR · dB</text>
        <line class="hw-vu-needle" data-hw-needle x1="70" y1="68" x2="70" y2="15" style="transform:rotate(26deg)"/>
        <circle class="hw-vu-hub" cx="70" cy="68" r="6"/>
      </svg>
      <div class="hw-vu-readout">
        <meter min="0" max="24" value="0" aria-label="${esc(label)} gain reduction bar"></meter>
        <output data-hw-gr-out>0.0 dB</output>
      </div>
    </div>`;
  }

  function presetStrip(type, params) {
    const list = presets[type];
    if (!list) return '';
    const match = Object.keys(list).find(id => Object.entries(list[id].params).every(([k, v]) => Math.abs((params[k] ?? 0) - v) < 1e-4));
    return `<div class="hw-presets" role="group" aria-label="Hardware presets">${Object.entries(list).map(([id, p]) =>
      `<button type="button" class="hw-preset-btn" data-hw-preset="${id}" aria-pressed="${id === match}">${esc(p.name)}</button>`
    ).join('')}</div>`;
  }

  function switchBank(label, key, options, currentVal) {
    return `<div class="hw-switches" role="group" aria-label="${esc(label)}">
      <span class="hw-sw-title">${esc(label)}</span>
      <div class="hw-sw-row">${options.map(([val, text, active]) => {
        const on = active !== undefined ? active : Math.abs(currentVal - val) < 0.25;
        return `<button type="button" class="hw-push" data-hw-set-key="${esc(key)}" data-hw-set-val="${val}" aria-pressed="${!!on}">${esc(text)}</button>`;
      }).join('')}</div>
    </div>`;
  }

  function renderControl(key, short, effect, params, index, rack, helpers, extraCls = '') {
    const def = window.AudioEffects.registry[effect.type];
    const c = def.controls.find(item => item.key === key);
    if (!c) return '';
    if (!rack) {
      return `<div class="hw-ctl ${extraCls}">${helpers.insertKnob(index, def, { ...c, short: short || c.short || c.label }, params)}</div>`;
    }
    return `<label class="daw-field hw-field ${extraCls}"><span>${esc(short || c.label)}${c.unit ? ` <small>(${esc(c.unit)})</small>` : ''}</span><input type="number" data-fx-param="${esc(c.key)}" min="${c.min}" max="${c.max}" step="${c.step}" value="${params[c.key]}" aria-label="Insert ${index + 1} ${esc(c.label)}"></label>`;
  }

  function renderWet(effect, index, rack, helpers) {
    if (!rack) {
      return `<div class="hw-ctl">${helpers.MK.knob({ key: 'wet', label: `${window.AudioEffects.registry[effect.type].name} wet mix`, short: 'Mix', min: 0, max: 1, step: .01, def: 1, value: effect.wet ?? 1, fmt: 'pct', size: 'sm', attrs: `data-scope="fxwet" data-fx-i="${index}"` })}</div>`;
    }
    return `<label class="daw-field hw-field"><span>Rack mix <small>(%)</small></span><input type="number" data-fx-wet min="0" max="100" step="1" value="${Math.round((effect.wet ?? 1) * 100)}" aria-label="Insert ${index + 1} wet mix percent"></label>`;
  }

  /* ── Hardware Faceplate Builders ────────────────────────────────────────── */
  function faceplate(effect, params, index, rack, helpers) {
    const type = effect.type;
    if (type === 'punch-compressor' || type === 'studio-reverb') return null;

    const ctl = (key, short, cls) => renderControl(key, short, effect, params, index, rack, helpers, cls);
    const wet = renderWet(effect, index, rack, helpers);
    const pStrip = presetStrip(type, params);

    if (type === 'compressor') {
      const isAll = params.ratio >= 19.5 && params.drive >= 45;
      const ratios = [[4, '4:1', !isAll && Math.abs(params.ratio - 4) < 1], [8, '8:1', !isAll && Math.abs(params.ratio - 8) < 1.5], [12, '12:1', !isAll && Math.abs(params.ratio - 12) < 2], [20, '20:1', !isAll && params.ratio >= 18]];
      return `<div class="hw-face hw-1176" data-hw-type="compressor">
        <div class="hw-brand"><span>UREI · REV D BLACKFACE</span><strong>1176-LN LIMITING AMPLIFIER</strong><span class="hw-jewel" aria-hidden="true"></span></div>
        <div class="hw-1176-top">
          ${vuSvg(index, '1176-LN')}
          <div class="hw-switches" role="group" aria-label="1176 Ratio pushbuttons">
            <span class="hw-sw-title">RATIO</span>
            <div class="hw-sw-row">${ratios.map(([v, txt, on]) => `<button type="button" class="hw-push" data-hw-set-key="ratio" data-hw-set-val="${v}" aria-pressed="${on}">${txt}</button>`).join('')}
              <button type="button" class="hw-push hw-push-all" data-hw-all aria-pressed="${isAll}">ALL</button>
            </div>
          </div>
        </div>
        <div class="hw-knobs">${ctl('threshold', 'Input / Thr')}${ctl('makeup', 'Output')}${ctl('attack', 'Attack')}${ctl('release', 'Release')}${ctl('drive', 'FET Drive')}${ctl('knee', 'Knee')}${ctl('parallel', 'Blend')}${wet}</div>
        ${pStrip}
      </div>`;
    }

    if (type === 'browser-opto-2a') {
      return `<div class="hw-face hw-la2a" data-hw-type="browser-opto-2a">
        <div class="hw-brand"><span>TELETRONIX · T4B OPTICAL</span><strong>LA-2A LEVELING AMPLIFIER</strong><span class="hw-jewel hw-jewel-amber" aria-hidden="true"></span></div>
        <div class="hw-la2a-grid">
          <div class="hw-la2a-side">${ctl('gain', 'Gain', 'hw-big')}${switchBank('MODE', 'mode', [[0, 'COMPRESS'], [1, 'LIMIT']], params.mode)}</div>
          ${vuSvg(index, 'LA-2A')}
          <div class="hw-la2a-side">${ctl('peakReduction', 'Peak Red.', 'hw-big')}${ctl('emphasis', 'HF Emph.')}${wet}</div>
        </div>
        ${pStrip}
      </div>`;
    }

    if (type === 'limiter') {
      return `<div class="hw-face hw-670" data-hw-type="limiter">
        <div class="hw-brand"><span>FAIRCHILD · VARI-MU + BRICKWALL</span><strong>670 / L1 MASTERING LIMITER</strong><span class="hw-jewel" aria-hidden="true"></span></div>
        <div class="hw-1176-top">
          ${vuSvg(index, '670 / L1')}
          <div class="hw-knobs">${ctl('drive', 'Tube Drive')}${ctl('ceiling', 'Ceiling')}${ctl('release', 'Release')}${wet}</div>
        </div>
        ${pStrip}
      </div>`;
    }

    if (type === 'browser-pultec-eq') {
      return `<div class="hw-face hw-pultec" data-hw-type="browser-pultec-eq">
        <div class="hw-brand"><span>PULSE TECHNIQUES · PASSIVE LC TUBE</span><strong>EQP-1A PROGRAM EQUALIZER</strong><span class="hw-jewel" aria-hidden="true"></span></div>
        <div class="hw-pultec-boxes">
          <section class="hw-pultec-box"><h4>LOW FREQUENCY</h4><div class="hw-knobs">${ctl('lowFreq', 'CPS (Hz)')}${ctl('lowBoost', 'Boost')}${ctl('lowAtten', 'Atten')}</div></section>
          <section class="hw-pultec-box"><h4>HIGH FREQUENCY</h4><div class="hw-knobs">${ctl('highFreq', 'KCS (Hz)')}${ctl('highBoost', 'Boost')}${ctl('bandwidth', 'Bandwidth')}</div></section>
          <section class="hw-pultec-box"><h4>ATTEN &amp; TUBE STAGE</h4><div class="hw-knobs">${ctl('attenFreq', 'Atten Sel')}${ctl('highAtten', 'Atten')}${ctl('tubeDrive', 'Tube')}${ctl('output', 'Output')}${wet}</div></section>
        </div>
        ${pStrip}
      </div>`;
    }

    if (type === 'eq') {
      const def = window.AudioEffects.registry.eq;
      const eqKnob = (key, short) => {
        const c = def.controls.find(item => item.key === key);
        return helpers.insertKnob(index, def, { ...c, short }, params);
      };
      const bands = [['LOW MID', 'green', 'lowMidGain', 'lowMidFrequency', 'lowMidQ'], ['MID', 'blue', 'gain', 'frequency', 'Q'], ['HIGH MID', 'green', 'highMidGain', 'highMidFrequency', 'highMidQ'], ['LF SHELF', 'yellow', 'lowGain', 'lowFrequency'], ['HF SHELF', 'yellow', 'highGain', 'highFrequency']];
      return `<div class="mc-parametric-face hw-8200">
        <div class="mc-parametric-title"><span>GML / API · PROPORTIONAL-Q</span><strong>MODEL 8200 PARAMETRIC EQ</strong><span>5-BAND MASTERING</span></div>
        <div class="mc-parametric-bands">${bands.map(([name, color, gain, frequency, q]) => `<section class="mc-parametric-band" data-cap="${color}" aria-label="${name}"><h4>${name}</h4><span class="mc-parametric-scale" aria-hidden="true">−18 · 0 · +18</span>${eqKnob(gain, 'Level')}${eqKnob(frequency, 'Corner freq')}${q ? eqKnob(q, 'Q / bandwidth') : '<span class="mc-parametric-shelf">SHELVING<br>────╱────</span>'}</section>`).join('')}</div>
        <div class="mc-knobs">${eqKnob('proportional', 'Proportional Q')}${eqKnob('trim', 'Output trim')}</div>
        ${pStrip}
        <div class="mc-parametric-footer"><span>5 BANDS · SERIAL BIQUADS</span><span>PROPORTIONAL OR CONSTANT Q</span></div>
      </div>`;
    }

    if (type === 'browser-neve-pre') {
      const hpfOpts = [[0, 'OFF'], [1, '50'], [2, '80'], [3, '160'], [4, '300']];
      return `<div class="hw-face hw-1073" data-hw-type="browser-neve-pre">
        <div class="hw-brand"><span>CLASS-A MARINAIR · INDUCTOR EQ</span><strong>1073 MIC PRE / EQUALIZER</strong><span class="hw-jewel" aria-hidden="true"></span></div>
        <div class="hw-knobs">
          ${ctl('preamp', 'Mic Gain', 'hw-marconi')}
          ${ctl('low', '110Hz Low')}
          ${ctl('midFreq', 'Mid Freq')}
          ${ctl('mid', 'Mid Gain')}
          ${ctl('high', '12k Air')}
          ${ctl('output', 'Fader')}
          ${wet}
        </div>
        ${switchBank('HIGH-PASS FILTER (Hz)', 'hpf', hpfOpts, params.hpf)}
        ${pStrip}
      </div>`;
    }

    if (type === 'distortion') {
      const circuit = Math.round(params.circuit);
      const circuits = [[0, 'TS-808'], [1, 'RAT'], [2, 'MUFF'], [3, 'TWEED']];
      return `<div class="hw-face hw-pedal" data-hw-type="distortion" data-circuit="${circuit}">
        <div class="hw-brand"><span>ANALOG STOMP · 4× OVERSAMPLED</span><strong>808 / RAT VINTAGE DRIVE</strong><span class="hw-jewel" aria-hidden="true"></span></div>
        ${switchBank('CIRCUIT TOPOLOGY', 'circuit', circuits, circuit)}
        <div class="hw-knobs">${ctl('drive', 'Drive / Gain')}${ctl('tone', 'Tone Filter')}${ctl('output', 'Level')}${wet}</div>
        ${pStrip}
      </div>`;
    }

    if (type === 'browser-tape-color') {
      const speed = Math.round(params.speed);
      const speeds = [[0, '7.5 IPS'], [1, '15 IPS'], [2, '30 IPS']];
      return `<div class="hw-face hw-a800" data-hw-type="browser-tape-color" data-speed="${speed}">
        <div class="hw-brand"><span>STUDER · 2-INCH MAGNETIC DECK</span><strong>A800 STUDIO TAPE</strong><span class="hw-jewel hw-jewel-amber" aria-hidden="true"></span></div>
        <div class="hw-reels" aria-hidden="true">
          <svg viewBox="0 0 280 58" focusable="false">
            <g class="hw-reel" style="transform-origin:52px 29px"><circle cx="52" cy="29" r="22" class="hw-reel-rim"/><circle cx="52" cy="29" r="14" class="hw-reel-tape"/><circle cx="52" cy="29" r="5" class="hw-reel-hub"/><line x1="52" y1="10" x2="52" y2="21"/><line x1="36" y1="38" x2="45" y2="33"/><line x1="68" y1="38" x2="59" y2="33"/></g>
            <path class="hw-tape-path" d="M 52 51 L 105 46 L 140 50 L 175 46 L 228 51"/>
            <rect x="128" y="38" width="24" height="10" rx="2" class="hw-headblock"/>
            <g class="hw-reel" style="transform-origin:228px 29px"><circle cx="228" cy="29" r="22" class="hw-reel-rim"/><circle cx="228" cy="29" r="14" class="hw-reel-tape"/><circle cx="228" cy="29" r="5" class="hw-reel-hub"/><line x1="228" y1="10" x2="228" y2="21"/><line x1="212" y1="38" x2="221" y2="33"/><line x1="244" y1="38" x2="235" y2="33"/></g>
          </svg>
        </div>
        ${switchBank('TAPE SPEED', 'speed', speeds, speed)}
        <div class="hw-knobs">${ctl('drive', 'Input Flux')}${ctl('tone', 'HF Bias')}${ctl('flutter', 'Flutter')}${ctl('output', 'Repro Out')}${wet}</div>
        ${pStrip}
      </div>`;
    }

    if (type === 'delay') {
      const heads = Math.round(params.heads);
      return `<div class="hw-face hw-re201" data-hw-type="delay">
        <div class="hw-brand"><span>ROLAND · MULTI-HEAD TAPE CHAMBER</span><strong>RE-201 SPACE ECHO</strong><span class="hw-jewel" aria-hidden="true"></span></div>
        <div class="hw-re201-heads" aria-hidden="true">
          <span class="hw-head is-lit">REC</span>
          <span class="hw-head is-lit">HEAD 1</span>
          <span class="hw-head ${heads >= 2 ? 'is-lit' : ''}">HEAD 2</span>
          <span class="hw-head ${heads >= 3 ? 'is-lit' : ''}">HEAD 3</span>
        </div>
        ${switchBank('TAPE HEADS', 'heads', [[1, '1 HEAD'], [2, '1 + 2'], [3, '1 + 2 + 3']], heads)}
        <div class="hw-knobs">${ctl('time', 'Repeat Rate')}${ctl('feedback', 'Intensity')}${ctl('tone', 'Tape Tone')}${ctl('flutter', 'Flutter')}${ctl('wet', 'Echo Vol')}${wet}</div>
        ${pStrip}
      </div>`;
    }

    if (type === 'reverb') {
      const tank = Math.round(params.tank);
      return `<div class="hw-face hw-spring" data-hw-type="reverb" data-tank="${tank}">
        <div class="hw-brand"><span>TUBE SPRING · PLATE · CHAMBER</span><strong>’63 SPRING &amp; PLATE REVERB</strong><span class="hw-jewel" aria-hidden="true"></span></div>
        ${switchBank('REVERB TANK', 'tank', [[0, '’63 SPRING'], [1, 'EMT-140 PLATE'], [2, 'ABBEY CHAMBER']], tank)}
        <div class="hw-knobs">${ctl('size', 'Dwell / Size')}${ctl('decay', 'Decay')}${ctl('predelay', 'Pre-Delay')}${ctl('lowcut', 'Low Cut')}${ctl('tone', 'Tone')}${ctl('wet', 'Reverb Mix')}${wet}</div>
        ${pStrip}
      </div>`;
    }

    if (type === 'chorus') {
      const mode = Math.round(params.mode);
      const bank = (title, subtitle, contents) => `<div class="mc-chorus-bank"><h4><i aria-hidden="true"></i>${title}</h4><div class="${rack ? 'hw-knobs' : 'mc-knobs'}">${contents}</div><span class="mc-chorus-legend">${subtitle}</span></div>`;
      return `<div class="mc-chorus-face hw-ce1" data-hw-type="chorus" data-mode="${mode}">
        <div class="mc-chorus-brand"><span>BOSS / JUNO <small>ANALOG BBD ENGINE</small></span><strong>CE-1 / JUNO CHORUS <small>STEREO MODULATION</small></strong></div>
        ${switchBank('BBD VOICE', 'mode', [[0, 'CE-1 CLASSIC'], [1, 'JUNO-60 TWIN'], [2, 'CE-1 VIBRATO']], mode)}
        <div class="mc-chorus-banks">${bank('CHORUS', 'MODULATION DEPTH', ctl('depth', 'Intensity'))}${bank('MOTION', 'SWEEP SPEED', ctl('rate', 'Rate') + ctl('tone', 'Wet tone'))}${bank('BALANCE', 'DRY ↔ CHORUS', ctl('wet', 'Chorus level'))}${bank('OUTPUT', 'INSERT BLEND', wet)}</div>
        ${pStrip}
      </div>`;
    }

    if (type === 'browser-pulse-tremolo') {
      const circuit = Math.round(params.circuit);
      return `<div class="hw-face hw-blackface" data-hw-type="browser-pulse-tremolo" data-circuit="${circuit}">
        <div class="hw-brand"><span>BLACKFACE · HARMONIC · STEREO PAN</span><strong>’65 OPTO-TREMOLO</strong><span class="hw-jewel" aria-hidden="true"></span></div>
        ${switchBank('CIRCUIT', 'circuit', [[0, '’65 OPTO'], [1, '’61 HARMONIC'], [2, 'VOX BIAS'], [3, 'RHODES PAN']], circuit)}
        <div class="hw-knobs">${ctl('rate', 'Speed')}${ctl('depth', 'Intensity')}${wet}</div>
        ${pStrip}
      </div>`;
    }

    return null;
  }

  /* ── Click Handler (Presets + Hardware Mode Switches) ───────────────────── */
  function handleClick(button, track, host, commit) {
    if (!button || !track) return false;
    const isAllBtn = button.hasAttribute('data-hw-all');
    const presetId = isAllBtn ? 'all-buttons' : button.dataset.hwPreset;
    const setKey = button.dataset.hwSetKey;
    if (!presetId && !setKey) return false;
    const item = button.closest('[data-insert], [data-fx-index]');
    if (!item) return false;
    const index = Number(item.dataset.insert ?? item.dataset.fxIndex);
    const effect = track.effects?.[index];
    if (!effect) return false;
    const itemSel = item.hasAttribute('data-insert') ? `[data-insert="${index}"]` : `[data-fx-index="${index}"]`;

    if (presetId) {
      const preset = presets[effect.type]?.[presetId];
      if (!preset) return false;
      effect.params = window.AudioEffects.parameters(effect.type, { ...window.AudioEffects.parameters(effect.type), ...preset.params });
      commit();
      host.querySelector(`${itemSel} ${isAllBtn ? '[data-hw-all]' : `[data-hw-preset="${presetId}"]`}`)?.focus({ preventScroll: true });
      return true;
    }

    if (setKey) {
      const val = Number(button.dataset.hwSetVal);
      if (!Number.isFinite(val)) return false;
      effect.params = window.AudioEffects.parameters(effect.type, { ...effect.params, [setKey]: val });
      commit();
      host.querySelector(`${itemSel} [data-hw-set-key="${setKey}"][data-hw-set-val="${val}"]`)?.focus({ preventScroll: true });
      return true;
    }
    return false;
  }

  /* ── Live Gain-Reduction VU Meter Loop ──────────────────────────────────── */
  function draw(host, track, instances) {
    if (!host) return;
    host.querySelectorAll('[data-hw-vu-index]').forEach(vu => {
      const index = Number(vu.dataset.hwVuIndex);
      const effect = track?.effects?.[index];
      const instance = instances?.find(item => item.insertIndex === index);
      const data = !effect?.bypass && instance?.meter?.();
      const gr = data && Number.isFinite(data.reduction) ? Math.max(0, data.reduction) : 0;
      const deg = 26 - Math.min(20, gr) * 3.1;
      const needle = vu.querySelector('[data-hw-needle]');
      if (needle) needle.style.transform = `rotate(${deg.toFixed(1)}deg)`;
      const meterEl = vu.querySelector('meter');
      if (meterEl) meterEl.value = gr;
      const out = vu.querySelector('[data-hw-gr-out]');
      if (out) out.textContent = `${gr.toFixed(1)} dB`;
    });
  }

  window.MusicHardwareVst = { presets, faceplate, handleClick, draw };
}());
