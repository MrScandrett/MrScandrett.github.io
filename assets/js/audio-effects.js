/* Shared Web Audio processors for lessons and Track Studio. Register future
 * effects with { name, controls, create(context, parameters) }; create returns
 * { input, output, dispose }. No processor owns the context or destination. */
(function () {
  'use strict';
  const registry = {};
  function eqNode(c, type = 'peaking') { const n = c.createBiquadFilter(); n.type = type; return n; }
  function compressorNode(c) { return c.createDynamicsCompressor(); }
  const control = (key, label, min, max, step, value, unit) => ({ key, label, min, max, step, value, unit });

  function makeCurve(fn, len = 1025) {
    const curve = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const x = (i * 2) / (len - 1) - 1;
      curve[i] = fn(x);
    }
    return curve;
  }
  const linearCurve = makeCurve(x => x, 257);

  function fetCurve(drivePct) {
    if (drivePct <= 0.5) return linearCurve;
    const k = 1 + (drivePct / 100) * 3.2;
    const norm = Math.tanh(k);
    return makeCurve(x => {
      const shifted = x + 0.045 * (drivePct / 100) * (1 - x * x);
      return Math.tanh(shifted * k) / norm;
    });
  }

  function variMuCurve(driveDb) {
    if (driveDb <= 0.05) return linearCurve;
    const amt = 1 + (driveDb / 12) * 1.8;
    const norm = Math.tanh(amt);
    return makeCurve(x => Math.tanh(x * amt) / norm);
  }

  function distortionCurve(amount, circuit) {
    const mode = Math.round(circuit || 0);
    const k = Math.max(0.2, amount);
    if (mode === 1) {
      // RAT: sharper op-amp hard-clipping with slight asymmetry
      const gain = 1 + k * 0.9;
      return makeCurve(x => {
        const y = x * gain;
        const pos = y > 0 ? y / (1 + Math.abs(y) * 1.1) : y / (1 + Math.abs(y) * 0.92);
        return Math.max(-0.95, Math.min(0.95, pos * 1.25));
      });
    }
    if (mode === 2) {
      // Muff: high-gain four-stage fuzz sustain with asymmetric clipping
      const gain = 1.8 + k * 1.45;
      const norm = Math.tanh(gain);
      return makeCurve(x => Math.tanh((x + 0.06 * x * x) * gain) / norm);
    }
    if (mode === 3) {
      // Tweed: warm asymmetric triode tube curve
      const gain = 1 + k * 0.55;
      const norm = Math.tanh(gain);
      return makeCurve(x => {
        const bias = x >= 0 ? x * gain * 1.15 : x * gain * 0.85;
        return Math.tanh(bias) / norm;
      });
    }
    // TS-808: smooth symmetrical diode soft-clipping
    const norm = Math.tanh(1 + k * 0.75);
    return makeCurve(x => Math.tanh(x * (1 + k * 0.75)) / norm);
  }

  registry.eq = {
    name: '8200 Parametric EQ',
    description: 'Precision five-band proportional-Q mastering equalizer inspired by the GML 8200 and API 5500.',
    lesson: 'eq-problem-frequency.html',
    // The center band's original keys keep saved single-band inserts compatible.
    controls: [
      control('proportional', 'Proportional Q', 0, 1, 1, 0, ''), control('trim', 'Output trim', -18, 6, .5, 0, 'dB'),
      control('lowFrequency', 'LF shelf frequency', 20, 500, 1, 80, 'Hz'), control('lowGain', 'LF shelf gain', -18, 18, .5, 0, 'dB'),
      control('lowMidFrequency', 'Low mid frequency', 40, 2000, 1, 250, 'Hz'), control('lowMidGain', 'Low mid gain', -18, 18, .5, 0, 'dB'), control('lowMidQ', 'Low mid Q', .3, 12, .1, 1, ''),
      control('frequency', 'Mid frequency', 20, 20000, 1, 1000, 'Hz'), control('gain', 'Mid gain', -18, 18, .5, 0, 'dB'), control('Q', 'Mid Q', .3, 12, .1, 1, ''),
      control('highMidFrequency', 'High mid frequency', 500, 16000, 1, 3200, 'Hz'), control('highMidGain', 'High mid gain', -18, 18, .5, 0, 'dB'), control('highMidQ', 'High mid Q', .3, 12, .1, 1, ''),
      control('highFrequency', 'HF shelf frequency', 1000, 20000, 1, 10000, 'Hz'), control('highGain', 'HF shelf gain', -18, 18, .5, 0, 'dB')
    ],
    create(c, p) {
      const bands = [['lowshelf', 'lowFrequency', 'lowGain'], ['peaking', 'lowMidFrequency', 'lowMidGain', 'lowMidQ'], ['peaking', 'frequency', 'gain', 'Q'], ['peaking', 'highMidFrequency', 'highMidGain', 'highMidQ'], ['highshelf', 'highFrequency', 'highGain']];
      const nodes = bands.map(([type]) => eqNode(c, type)), trim = c.createGain();
      nodes[4].connect(trim);
      nodes.forEach((node, i) => { if (i) nodes[i - 1].connect(node); });
      function apply(values, immediate) {
        const next = parameters('eq', values);
        if (immediate) trim.gain.value = 10 ** (next.trim / 20);
        else trim.gain.setTargetAtTime(10 ** (next.trim / 20), c.currentTime, .01);
        bands.forEach(([, f, g, q], i) => {
          for (const [key, value] of [['frequency', Math.min(next[f], c.sampleRate * .49)], ['gain', next[g]], ['Q', q ? next[q] * (next.proportional ? 1 + Math.abs(next[g]) / 12 : 1) : .707]]) {
            if (immediate) nodes[i][key].value = value;
            else nodes[i][key].setTargetAtTime(value, c.currentTime, .01);
          }
        });
      }
      apply(p, true);
      return { input: nodes[0], output: trim, update(next) { apply(next, false); }, dispose() { nodes.forEach(n => n.disconnect()); trim.disconnect(); } };
    }
  };

  registry.compressor = {
    name: '1176-LN FET Compressor',
    description: 'Fast FET-style dynamics inspired by the UREI 1176LN Rev D Blackface, with ratio pushbuttons, parallel blend, and Class-A FET output stage.',
    lesson: 'audio-compression.html',
    controls: [
      control('threshold', 'Threshold', -60, 0, 1, -24, 'dB'),
      control('ratio', 'Ratio', 1, 20, .5, 4, ':1'),
      control('knee', 'Knee', 0, 40, 1, 12, 'dB'),
      control('attack', 'Attack', 1, 200, 1, 10, 'ms'),
      control('release', 'Release', 10, 1000, 10, 250, 'ms'),
      control('parallel', 'Compressed blend', 0, 1, .05, 1, ''),
      control('makeup', 'Makeup', -12, 12, .5, 0, 'dB'),
      control('drive', 'FET drive', 0, 100, 1, 18, '%')
    ],
    create(c, p) {
      const input = c.createGain(), output = c.createGain(), dry = c.createGain(), wet = c.createGain();
      const n = compressorNode(c), g = c.createGain(), dc = eqNode(c, 'highpass'), shaper = c.createWaveShaper();
      dc.frequency.value = 20; dc.Q.value = -3.0103;
      shaper.oversample = '2x';
      input.connect(n); n.connect(g); g.connect(dc); dc.connect(shaper); shaper.connect(wet); wet.connect(output);
      input.connect(dry); dry.connect(output);
      let lastDrive = -1;
      function apply(values, instant) {
        const v = parameters('compressor', values);
        const set = (param, x) => instant ? (param.value = x) : param.setTargetAtTime(x, c.currentTime, .01);
        for (const k of ['threshold', 'ratio', 'knee']) set(n[k], v[k]);
        set(n.attack, v.attack / 1000);
        set(n.release, v.release / 1000);
        set(g.gain, 10 ** (v.makeup / 20));
        set(dry.gain, 1 - v.parallel);
        set(wet.gain, v.parallel);
        if (v.drive !== lastDrive) { shaper.curve = fetCurve(v.drive); lastDrive = v.drive; }
      }
      apply(p, true);
      return {
        input, output,
        update: v => apply(v, false),
        meter: () => ({ reduction: Math.max(0, -n.reduction) }),
        dispose() { [input, output, dry, wet, n, g, dc, shaper].forEach(node => node.disconnect()); }
      };
    }
  };

  registry.delay = {
    name: 'RE-201 Space Tape Echo',
    description: 'Multi-head magnetic tape echo inspired by the Roland RE-201 Space Echo, with three playback heads, tape saturation, and motor flutter.',
    lesson: 'room-acoustics.html',
    controls: [
      control('tone', 'Tape tone', 500, 16000, 100, 6000, 'Hz'),
      control('time', 'Delay time', 20, 1500, 10, 250, 'ms'),
      control('feedback', 'Feedback', 0, .8, .05, .3, ''),
      control('wet', 'Wet mix', 0, 1, .05, .2, ''),
      control('flutter', 'Tape flutter', 0, 100, 1, 20, '%'),
      control('heads', 'Tape heads', 1, 3, 1, 1, '')
    ],
    create(c, p) {
      const input = c.createGain(), output = c.createGain(), dry = c.createGain(), wet = c.createGain();
      const head1 = c.createDelay(2), head2 = c.createDelay(2), head3 = c.createDelay(2);
      const g1 = c.createGain(), g2 = c.createGain(), g3 = c.createGain();
      const hpf = eqNode(c, 'highpass'), tone = eqNode(c, 'lowpass'), feedback = c.createGain();
      const sat = c.createWaveShaper();
      sat.curve = makeCurve(x => Math.tanh(x * 1.35) / Math.tanh(1.35), 513);
      hpf.frequency.value = 140; hpf.Q.value = -3.0103;
      tone.Q.value = -3.0103;
      const lfo = c.createOscillator(), flutterGain = c.createGain();
      lfo.type = 'sine'; lfo.frequency.value = 1.7;
      lfo.connect(flutterGain);
      flutterGain.connect(head1.delayTime);
      flutterGain.connect(head2.delayTime);
      flutterGain.connect(head3.delayTime);

      input.connect(dry); dry.connect(output);
      input.connect(head1); input.connect(head2); input.connect(head3);
      head1.connect(g1); g1.connect(wet);
      head2.connect(g2); g2.connect(wet);
      head3.connect(g3); g3.connect(wet);
      wet.connect(output);
      head1.connect(hpf); hpf.connect(tone); tone.connect(sat); sat.connect(feedback); feedback.connect(head1);

      function apply(values, instant) {
        const v = parameters('delay', values);
        const set = (param, x) => instant ? (param.value = x) : param.setTargetAtTime(x, c.currentTime, .01);
        const baseSec = Math.max(0.005, v.time / 1000);
        const heads = Math.round(v.heads);
        set(tone.frequency, Math.min(v.tone, c.sampleRate * .49));
        set(head1.delayTime, baseSec);
        set(head2.delayTime, Math.max(0.005, baseSec * 0.667));
        set(head3.delayTime, Math.max(0.005, baseSec * 0.375));
        set(g1.gain, heads === 1 ? 1 : heads === 2 ? 0.72 : 0.62);
        set(g2.gain, heads >= 2 ? (heads === 2 ? 0.58 : 0.50) : 0);
        set(g3.gain, heads >= 3 ? 0.42 : 0);
        set(feedback.gain, v.feedback);
        set(flutterGain.gain, (v.flutter / 100) * 0.0022);
        set(dry.gain, 1 - v.wet);
        set(wet.gain, v.wet);
      }
      apply(p, true);
      lfo.start();
      return {
        input, output,
        update: next => apply(next, false),
        dispose() {
          try { lfo.stop(); } catch (_) {}
          [input, output, dry, wet, head1, head2, head3, g1, g2, g3, hpf, tone, sat, feedback, lfo, flutterGain].forEach(n => n.disconnect());
        }
      };
    }
  };

  // Deterministic stereo impulse builder for '63 Spring, EMT-140 Plate, and Abbey Chamber.
  function roomImpulse(c, seconds, decay, tank = 0) {
    const length = Math.max(1, Math.floor(c.sampleRate * seconds)), buffer = c.createBuffer(2, length, c.sampleRate);
    const sr = c.sampleRate, mode = Math.round(tank);
    let seed = 0x2545f491;   // fixed seed: the live mix and the exported WAV get the same tank
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let ch = 0; ch < 2; ch++) {
      const d = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / sr, env = Math.pow(1 - i / length, decay);
        const n = rand() * 2 - 1;
        if (mode === 0) {
          // '63 Tube Spring: dispersive twang chirp + spring coil modes + metallic noise
          const chirp = t < 0.075 ? Math.sin(2 * Math.PI * (95 + t * 2400) * t) * Math.exp(-t * 36) * 0.45 : 0;
          const modal = (Math.sin(2 * Math.PI * (192 + ch * 4) * t) * 0.25 +
            Math.sin(2 * Math.PI * (432 - ch * 6) * t) * 0.2 +
            Math.sin(2 * Math.PI * (876 + ch * 9) * t) * 0.14 +
            Math.sin(2 * Math.PI * 1540 * t) * 0.08) * Math.exp(-t * (1.8 + decay * 0.35));
          d[i] = (n * 0.65 * env) + chirp + modal * 0.35;
        } else if (mode === 1) {
          // EMT-140 Plate: dense immediate bright attack + smooth metallic dispersion
          const onset = Math.min(1, t / 0.002);
          const shimmer = Math.sin(2 * Math.PI * (1180 + ch * 17) * t) * Math.exp(-t * 8) * 0.08;
          d[i] = onset * (n * env + shimmer);
        } else {
          // Abbey Chamber: discrete early taps + warm exponential room tail
          d[i] = n * env * (t < 0.04 ? 0.55 : 0.9);
        }
      }
      if (mode === 2) {
        const taps = [[0.008, 0.55], [0.014, -0.45], [0.021, 0.38], [0.029, -0.3], [0.038, 0.22]];
        for (const [sec, amp] of taps) {
          const idx = Math.floor((sec + ch * 0.0025) * sr);
          if (idx < length) d[idx] += amp;
        }
      }
    }
    return buffer;
  }

  registry.reverb = {
    name: "'63 Spring & Plate Reverb",
    description: 'Switchable deterministic reverb tanks: ’63 Tube Spring, EMT-140 Steel Plate, and Abbey Studio Chamber.',
    lesson: 'room-acoustics.html',
    controls: [
      control('lowcut', 'Wet low cut', 20, 1000, 1, 100, 'Hz'),
      control('size', 'Room size', .2, 6, .1, 1.8, 's'),
      control('decay', 'Decay shape', 1, 8, .5, 3, ''),
      control('predelay', 'Pre-delay', 0, 200, 5, 15, 'ms'),
      control('tone', 'Tone', 1000, 16000, 100, 7000, 'Hz'),
      control('wet', 'Wet mix', 0, 1, .05, .25, ''),
      control('tank', 'Tank model', 0, 2, 1, 0, '')
    ],
    create(c, p) {
      const input = c.createGain(), output = c.createGain(), dry = c.createGain(), wet = c.createGain();
      const pre = c.createDelay(1), tone = c.createBiquadFilter(), lowcut = eqNode(c, 'highpass'), conv = c.createConvolver();
      lowcut.Q.value = -3.0103;
      tone.type = 'lowpass';
      let shape = '';
      function set(values, now) {
        const next = parameters('reverb', values);
        const key = `${next.size}:${next.decay}:${Math.round(next.tank)}`;
        if (key !== shape) { conv.buffer = roomImpulse(c, next.size, next.decay, next.tank); shape = key; }
        const t = now ? c.currentTime : 0, s = (param, v) => now ? param.setTargetAtTime(v, t, .01) : (param.value = v);
        s(lowcut.frequency, Math.min(next.lowcut, c.sampleRate * .49));
        s(pre.delayTime, next.predelay / 1000);
        s(tone.frequency, Math.min(next.tone, c.sampleRate * .49));
        s(dry.gain, 1 - next.wet);
        s(wet.gain, next.wet);
      }
      set(p, false);
      input.connect(dry); dry.connect(output);
      input.connect(pre); pre.connect(conv); conv.connect(lowcut); lowcut.connect(tone); tone.connect(wet); wet.connect(output);
      return { input, output, update(next) { set(next, true); }, dispose() { [input, output, dry, wet, pre, tone, lowcut, conv].forEach(n => n.disconnect()); } };
    }
  };

  registry.chorus = {
    name: 'CE-1 / Juno Analog Chorus',
    description: 'Stereo BBD-inspired analog chorus and vibrato with switchable CE-1 Classic, Juno-60 Twin, and CE-1 Vibrato modes.',
    lesson: 'room-acoustics.html',
    controls: [
      control('tone', 'Wet low-pass', 1000, 16000, 100, 8000, 'Hz'),
      control('rate', 'Rate', .05, 8, .05, .8, 'Hz'),
      control('depth', 'Depth', 0, 10, .1, 3, 'ms'),
      control('wet', 'Wet mix', 0, 1, .05, .45, ''),
      control('mode', 'BBD mode', 0, 2, 1, 0, '')
    ],
    create(c, p) {
      const input = c.createGain(), output = c.createGain(), dry = c.createGain(), wet = c.createGain();
      const split = c.createChannelSplitter(2), merge = c.createChannelMerger(2), lfo = c.createOscillator();
      input.channelCount = 2; input.channelCountMode = 'explicit';
      input.connect(dry); dry.connect(output); input.connect(split); merge.connect(wet); wet.connect(output);
      const delays = [], depths = [], filters = [], colors = [];
      for (let ch = 0; ch < 2; ch++) {
        const delay = c.createDelay(.1), depth = c.createGain(), hp = eqNode(c, 'highpass'), color = eqNode(c, 'peaking'), lp = eqNode(c, 'lowpass');
        delay.delayTime.value = .018; hp.frequency.value = 100; hp.Q.value = lp.Q.value = -3.0103;
        color.frequency.value = 2200; color.Q.value = 0.9; color.gain.value = 0;
        split.connect(hp, ch); hp.connect(delay); delay.connect(color); color.connect(lp); lp.connect(merge, 0, ch);
        lfo.connect(depth); depth.connect(delay.delayTime);
        delays.push(delay); depths.push(depth); filters.push(hp, lp); colors.push(color);
      }
      function apply(values, instant) {
        const v = parameters('chorus', values);
        const mode = Math.round(v.mode);
        const baseDelay = mode === 1 ? .012 : mode === 2 ? .009 : .018;
        const depthMul = mode === 1 ? 1.35 : mode === 2 ? 1.8 : 1;
        const colorGain = mode === 1 ? 1.5 : 0;
        const set = (param, x) => instant ? (param.value = x) : param.setTargetAtTime(x, c.currentTime, .02);
        set(lfo.frequency, v.rate);
        delays.forEach(d => set(d.delayTime, baseDelay));
        depths.forEach((n, ch) => set(n.gain, Math.min(baseDelay * 0.85, (v.depth / 1000) * depthMul) * (ch ? -1 : 1)));
        colors.forEach(n => set(n.gain, colorGain));
        filters.forEach((n, i) => { if (i % 2) set(n.frequency, Math.min(v.tone, c.sampleRate * .49)); });
        set(dry.gain, 1 - v.wet); set(wet.gain, v.wet);
      }
      apply(p, true); lfo.start();
      return {
        input, output,
        update: v => apply(v, false),
        dispose() { try { lfo.stop(); } catch (_) {} [input, output, dry, wet, split, merge, lfo, ...delays, ...depths, ...filters, ...colors].forEach(n => n.disconnect()); }
      };
    }
  };

  registry.distortion = {
    name: '808 / RAT Vintage Drive',
    description: 'Switchable classic analog dirt circuits: TS-808 diode overdrive, RAT op-amp clip, Muff sustain fuzz, and Tweed tube saturation with 4× oversampling.',
    lesson: 'audio-compression.html',
    controls: [
      control('drive', 'Drive', 0, 40, .5, 6, ''),
      control('tone', 'Tone', 500, 12000, 100, 5000, 'Hz'),
      control('output', 'Output', -24, 6, .5, -6, 'dB'),
      control('circuit', 'Circuit', 0, 3, 1, 0, '')
    ],
    create(c, p) {
      const preEq = eqNode(c, 'peaking');
      const dc = eqNode(c, 'highpass'); dc.frequency.value = 20; dc.Q.value = -3.0103;
      const shaper = c.createWaveShaper(), tone = c.createBiquadFilter(), out = c.createGain();
      shaper.oversample = '4x'; tone.type = 'lowpass';
      preEq.connect(shaper); shaper.connect(dc); dc.connect(tone); tone.connect(out);
      let lastKey = '';
      function apply(values, instant) {
        const v = parameters('distortion', values);
        const circuit = Math.round(v.circuit);
        const set = (param, x) => instant ? (param.value = x) : param.setTargetAtTime(x, c.currentTime, .01);
        const [f, g, q] = circuit === 1 ? [1400, 3, 0.8] : circuit === 2 ? [800, -4, 0.7] : circuit === 3 ? [450, 2, 0.6] : [720, 5, 0.9];
        set(preEq.frequency, f); set(preEq.gain, g); set(preEq.Q, q);
        const key = `${v.drive}:${circuit}`;
        if (key !== lastKey) { shaper.curve = distortionCurve(v.drive, circuit); lastKey = key; }
        set(tone.frequency, Math.min(v.tone, c.sampleRate * .49));
        set(out.gain, Math.pow(10, v.output / 20));
      }
      apply(p, true);
      return {
        input: preEq, output: out,
        update: n => apply(n, false),
        dispose() { [preEq, shaper, dc, tone, out].forEach(n => n.disconnect()); }
      };
    }
  };

  registry.limiter = {
    name: '670 / L1 Mastering Limiter',
    description: 'Vari-mu tube warmth inspired by the Fairchild 670 feeding a fast peak-ceiling safety limiter. Not a true-peak or intersample limiter; clipping can add distortion.',
    lesson: 'audio-compression.html',
    controls: [
      control('ceiling', 'Ceiling', -24, 0, .5, -1, 'dB'),
      control('release', 'Release', 10, 1000, 10, 120, 'ms'),
      control('drive', 'Tube drive', 0, 12, .5, 0, 'dB')
    ],
    create(c, p) {
      const inDrive = c.createGain(), sat = c.createWaveShaper();
      const n = c.createDynamicsCompressor(), pre = c.createGain(), clip = c.createWaveShaper(), out = c.createGain();
      sat.oversample = '2x';
      clip.curve = Float32Array.from({ length: 4097 }, (_, i) => Math.max(-1, Math.min(1, (i / 2048 - 1) * 2)));
      inDrive.connect(sat); sat.connect(n); n.connect(pre); pre.connect(clip); clip.connect(out);
      n.knee.value = 0; n.ratio.value = 20; n.attack.value = .001;
      let lastDrive = -1;
      function apply(values, instant) {
        const v = parameters('limiter', values);
        const set = (param, x) => instant ? (param.value = x) : param.setTargetAtTime(x, c.currentTime, .01);
        const ceilLin = 10 ** (v.ceiling / 20);
        set(inDrive.gain, 10 ** (v.drive / 20));
        if (v.drive !== lastDrive) { sat.curve = variMuCurve(v.drive); lastDrive = v.drive; }
        set(pre.gain, .5 / ceilLin);
        set(out.gain, ceilLin);
        set(n.threshold, v.ceiling);
        set(n.release, v.release / 1000);
      }
      apply(p, true);
      return {
        input: inDrive, output: out,
        update: next => apply(next, false),
        meter: () => ({ reduction: Math.max(0, -n.reduction) }),
        dispose: () => [inDrive, sat, n, pre, clip, out].forEach(node => node.disconnect())
      };
    }
  };

  function parameters(type, values = {}) { return Object.fromEntries(registry[type].controls.map(d => { const v = Number(values[d.key]); return [d.key, Number.isFinite(v) ? Math.max(d.min, Math.min(d.max, v)) : d.value]; })); }
  window.AudioEffects = { registry, eqNode, compressorNode, parameters, register(type, definition) { registry[type] = definition; } };
}());
