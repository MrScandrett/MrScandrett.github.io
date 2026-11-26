/* Curated, locally hosted hardware-emulated browser plugins for Music Lab.
 * These deliberately use the same small lifecycle as the WAM adapter so they
 * work in live and offline AudioContexts without network access or native installers. */
(function () {
  'use strict';
  if (!window.AudioEffects) return;
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

  function tapeCurve(drivePct) {
    const k = 1 + (drivePct / 100) * 6.5;
    const asym = 0.04 * (drivePct / 100);
    const norm = Math.tanh(k);
    const curve = new Float32Array(1025);
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / (curve.length - 1) - 1;
      curve[i] = Math.tanh((x + asym * (1 - x * x)) * k) / norm;
    }
    return curve;
  }

  const tape = meta('A800 Studio Tape Machine', 'Analog 2-inch tape emulation inspired by the Studer A800: 7.5/15/30 IPS head bump, 4× oversampled magnetic hysteresis saturation, and motor flutter.');
  tape.controls = [
    control('drive', 'Tape drive', 0, 100, 1, 28, '%'),
    control('tone', 'Tone', 1200, 18000, 100, 9000, 'Hz'),
    control('output', 'Output', -12, 6, .5, 0, 'dB'),
    control('speed', 'Tape speed', 0, 2, 1, 1, ''),
    control('flutter', 'Flutter', 0, 100, 1, 15, '%'),
  ];
  tape.create = (context, p) => {
    const input = context.createGain(), headBump = context.createBiquadFilter(), shaper = context.createWaveShaper();
    const tone = context.createBiquadFilter(), flutterDelay = context.createDelay(0.05), output = context.createGain();
    const lfo = context.createOscillator(), flutterGain = context.createGain();
    headBump.type = 'peaking'; headBump.Q.value = 0.9;
    shaper.oversample = '4x';
    tone.type = 'lowpass';
    flutterDelay.delayTime.value = 0.005;
    lfo.type = 'sine'; lfo.frequency.value = 2.3;
    lfo.connect(flutterGain); flutterGain.connect(flutterDelay.delayTime);
    input.connect(headBump); headBump.connect(shaper); shaper.connect(tone); tone.connect(flutterDelay); flutterDelay.connect(output);

    let lastDrive = -1;
    function apply(values, instant) {
      const v = paramsOf(tape, values);
      const set = (param, x) => instant ? (param.value = x) : param.setTargetAtTime(x, context.currentTime, .015);
      const speed = Math.round(v.speed);
      const [bumpF, bumpG, hfCap] = speed === 0 ? [95, 3.5, 11500] : speed === 2 ? [120, 1.5, 20000] : [65, 2.8, 16500];
      set(headBump.frequency, bumpF);
      set(headBump.gain, bumpG);
      if (v.drive !== lastDrive) { shaper.curve = tapeCurve(v.drive); lastDrive = v.drive; }
      set(tone.frequency, Math.min(v.tone, hfCap, context.sampleRate * .49));
      set(flutterGain.gain, (v.flutter / 100) * 0.0012);
      set(output.gain, Math.pow(10, v.output / 20));
    }
    apply(p, true);
    lfo.start();
    return {
      input, output,
      update: next => apply(next, false),
      dispose() {
        try { lfo.stop(); } catch (_) {}
        [input, headBump, shaper, tone, flutterDelay, output, lfo, flutterGain].forEach(node => node.disconnect());
      }
    };
  };

  const tremolo = meta("'65 Opto-Tremolo", 'Switchable amp & electric-piano modulation: ’65 Blackface Opto, ’61 Brownface Harmonic dual-band, Vox Bias, and Rhodes Stereo Auto-Pan.');
  tremolo.controls = [
    control('rate', 'Rate', .1, 12, .1, 4, 'Hz'),
    control('depth', 'Depth', 0, 1, .05, .45, ''),
    control('circuit', 'Circuit', 0, 3, 1, 0, ''),
  ];
  tremolo.create = (context, p) => {
    const input = context.createGain(), output = context.createGain();
    input.channelCount = 2; input.channelCountMode = 'explicit';
    const lfo = context.createOscillator();

    // Branch 1: Mono opto / bias amp modulation
    const ampMono = context.createGain(), gMono = context.createGain(), dMono = context.createGain();
    input.connect(ampMono); ampMono.connect(gMono); gMono.connect(output);
    lfo.connect(dMono); dMono.connect(ampMono.gain);

    // Branch 2: '61 Brownface dual-band 180-deg harmonic tremolo (700 Hz crossover)
    const lp = context.createBiquadFilter(), hp = context.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = -3.0103;
    hp.type = 'highpass'; hp.frequency.value = 700; hp.Q.value = -3.0103;
    const ampLo = context.createGain(), ampHi = context.createGain(), gHarm = context.createGain();
    const dLo = context.createGain(), dHi = context.createGain();
    input.connect(lp); lp.connect(ampLo); ampLo.connect(gHarm);
    input.connect(hp); hp.connect(ampHi); ampHi.connect(gHarm);
    gHarm.connect(output);
    lfo.connect(dLo); dLo.connect(ampLo.gain);
    lfo.connect(dHi); dHi.connect(ampHi.gain);

    // Branch 3: Rhodes stereo auto-pan
    const split = context.createChannelSplitter(2), merge = context.createChannelMerger(2);
    const ampL = context.createGain(), ampR = context.createGain(), gPan = context.createGain();
    const dL = context.createGain(), dR = context.createGain();
    input.connect(split);
    split.connect(ampL, 0); ampL.connect(merge, 0, 0);
    split.connect(ampR, 1); ampR.connect(merge, 0, 1);
    merge.connect(gPan); gPan.connect(output);
    lfo.connect(dL); dL.connect(ampL.gain);
    lfo.connect(dR); dR.connect(ampR.gain);

    function apply(values, instant) {
      const v = paramsOf(tremolo, values);
      const circuit = Math.round(v.circuit);
      const set = (param, x) => instant ? (param.value = x) : param.setTargetAtTime(x, context.currentTime, .015);
      lfo.type = circuit === 2 ? 'triangle' : 'sine';
      set(lfo.frequency, v.rate);
      const base = 1 - v.depth / 2, swing = v.depth / 2;
      set(ampMono.gain, base); set(dMono.gain, swing);
      set(ampLo.gain, base); set(ampHi.gain, base); set(dLo.gain, swing); set(dHi.gain, -swing);
      set(ampL.gain, base); set(ampR.gain, base); set(dL.gain, swing); set(dR.gain, -swing);
      set(gMono.gain, circuit === 0 || circuit === 2 ? 1 : 0);
      set(gHarm.gain, circuit === 1 ? 1 : 0);
      set(gPan.gain, circuit === 3 ? 1 : 0);
    }
    apply(p, true);
    lfo.start();
    return {
      input, output,
      update: next => apply(next, false),
      dispose() {
        try { lfo.stop(); } catch (_) {}
        [input, output, lfo, ampMono, gMono, dMono, lp, hp, ampLo, ampHi, gHarm, dLo, dHi, split, merge, ampL, ampR, gPan, dL, dR].forEach(node => node.disconnect());
      }
    };
  };

  window.AudioEffects.register('browser-tape-color', tape);
  window.AudioEffects.register('browser-pulse-tremolo', tremolo);
  window.MusicBrowserPlugins = { ids: ['browser-tape-color', 'browser-pulse-tremolo'] };
}());
