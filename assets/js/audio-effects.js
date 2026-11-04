/* Shared Web Audio processors for lessons and Track Studio. Register future
 * effects with { name, controls, create(context, parameters) }; create returns
 * { input, output, dispose }. No processor owns the context or destination. */
(function () {
  'use strict';
  const registry = {};
  function eqNode(c, type = 'peaking') { const n = c.createBiquadFilter(); n.type = type; return n; }
  function compressorNode(c) { return c.createDynamicsCompressor(); }
  const control = (key, label, min, max, step, value, unit) => ({ key, label, min, max, step, value, unit });
  registry.eq = {
    name: 'Parametric EQ', lesson: 'eq-problem-frequency.html',
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
    name: 'Compressor', lesson: 'audio-compression.html',
    controls: [control('threshold', 'Threshold', -60, 0, 1, -24, 'dB'), control('ratio', 'Ratio', 1, 20, .5, 4, ':1'), control('knee', 'Knee', 0, 40, 1, 12, 'dB'), control('attack', 'Attack', 1, 200, 1, 10, 'ms'), control('release', 'Release', 10, 1000, 10, 250, 'ms'), control('parallel', 'Compressed blend', 0, 1, .05, 1, ''), control('makeup', 'Makeup', -12, 12, .5, 0, 'dB')],
    create(c, p) {
      const input = c.createGain(), output = c.createGain(), dry = c.createGain(), wet = c.createGain(), n = compressorNode(c), g = c.createGain();
      input.connect(n); n.connect(g); g.connect(wet); wet.connect(output); input.connect(dry); dry.connect(output);
      function apply(values, instant) {
        const v = parameters('compressor', values), set = (param, x) => instant ? param.value = x : param.setTargetAtTime(x, c.currentTime, .01);
        for (const k of ['threshold', 'ratio', 'knee']) set(n[k], v[k]);
        set(n.attack, v.attack / 1000); set(n.release, v.release / 1000); set(g.gain, 10 ** (v.makeup / 20));
        set(dry.gain, 1 - v.parallel); set(wet.gain, v.parallel);
      }
      apply(p, true);
      return { input, output, update: v => apply(v, false), dispose() { [input, output, dry, wet, n, g].forEach(n => n.disconnect()); } };
    }
  };
  registry.delay = {
    name: 'Echo / delay', lesson: 'room-acoustics.html',
    controls: [control('tone', 'Feedback low-pass', 500, 16000, 100, 6000, 'Hz'), control('time', 'Delay time', 20, 1500, 10, 250, 'ms'), control('feedback', 'Feedback', 0, .8, .05, .3, ''), control('wet', 'Wet mix', 0, 1, .05, .2, '')],
    create(c, p) {
      const input=c.createGain(), output=c.createGain(), dry=c.createGain(), wet=c.createGain(), delay=c.createDelay(2), feedback=c.createGain(), tone=eqNode(c, 'lowpass');
      tone.frequency.value=p.tone; tone.Q.value=-3.0103;
      delay.delayTime.value=p.time/1000;feedback.gain.value=p.feedback;dry.gain.value=1-p.wet;wet.gain.value=p.wet;
      input.connect(dry);dry.connect(output);input.connect(delay);delay.connect(wet);wet.connect(output);delay.connect(tone);tone.connect(feedback);feedback.connect(delay);
      return {input,output,update(next){tone.frequency.setTargetAtTime(next.tone,c.currentTime,.01);delay.delayTime.setTargetAtTime(next.time/1000,c.currentTime,.01);feedback.gain.setTargetAtTime(next.feedback,c.currentTime,.01);dry.gain.setTargetAtTime(1-next.wet,c.currentTime,.01);wet.gain.setTargetAtTime(next.wet,c.currentTime,.01);},dispose(){[input,output,dry,wet,delay,feedback,tone].forEach(n=>n.disconnect());}};
    }
  };
  // Algorithmic room: a decaying stereo noise impulse in a ConvolverNode, rebuilt only when size or decay change.
  function roomImpulse(c, seconds, decay) {
    const length = Math.max(1, Math.floor(c.sampleRate * seconds)), buffer = c.createBuffer(2, length, c.sampleRate);
    let seed = 0x2545f491;   // fixed seed: the live mix and the exported WAV get the same room
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let ch = 0; ch < 2; ch++) {
      const d = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
  }
  registry.reverb = {
    name: 'Reverb', lesson: 'room-acoustics.html',
    controls: [control('lowcut', 'Wet low cut', 20, 1000, 1, 100, 'Hz'), control('size', 'Room size', .2, 6, .1, 1.8, 's'), control('decay', 'Decay shape', 1, 8, .5, 3, ''), control('predelay', 'Pre-delay', 0, 200, 5, 15, 'ms'), control('tone', 'Tone', 1000, 16000, 100, 7000, 'Hz'), control('wet', 'Wet mix', 0, 1, .05, .25, '')],
    create(c, p) {
      const input = c.createGain(), output = c.createGain(), dry = c.createGain(), wet = c.createGain(), pre = c.createDelay(1), tone = c.createBiquadFilter(), lowcut = eqNode(c, 'highpass'), conv = c.createConvolver();
      lowcut.Q.value = -3.0103;
      tone.type = 'lowpass'; let shape = '';
      function set(next, now) {
        const key = next.size + ':' + next.decay;
        if (key !== shape) { conv.buffer = roomImpulse(c, next.size, next.decay); shape = key; }
        const t = now ? c.currentTime : 0, s = (param, v) => now ? param.setTargetAtTime(v, t, .01) : (param.value = v);
        s(lowcut.frequency, next.lowcut); s(pre.delayTime, next.predelay / 1000); s(tone.frequency, next.tone); s(dry.gain, 1 - next.wet); s(wet.gain, next.wet);
      }
      set(p, false);
      input.connect(dry); dry.connect(output); input.connect(pre); pre.connect(conv); conv.connect(lowcut); lowcut.connect(tone); tone.connect(wet); wet.connect(output);
      return { input, output, update(next) { set(next, true); }, dispose() { [input, output, dry, wet, pre, tone, lowcut, conv].forEach(n => n.disconnect()); } };
    }
  };
  registry.chorus = {
    name: 'Chorus', lesson: 'room-acoustics.html',
    controls: [control('tone', 'Wet low-pass', 1000, 16000, 100, 8000, 'Hz'), control('rate', 'Rate', .05, 8, .05, .8, 'Hz'), control('depth', 'Depth', 0, 10, .1, 3, 'ms'), control('wet', 'Wet mix', 0, 1, .05, .45, '')],
    create(c, p) {
      const input = c.createGain(), output = c.createGain(), dry = c.createGain(), wet = c.createGain();
      const split = c.createChannelSplitter(2), merge = c.createChannelMerger(2), lfo = c.createOscillator();
      input.channelCount = 2; input.channelCountMode = 'explicit';
      input.connect(dry); dry.connect(output); input.connect(split); merge.connect(wet); wet.connect(output);
      const delays = [], depths = [], filters = [];
      for (let ch = 0; ch < 2; ch++) {
        const delay = c.createDelay(.1), depth = c.createGain(), hp = eqNode(c, 'highpass'), lp = eqNode(c, 'lowpass');
        delay.delayTime.value = .018; hp.frequency.value = 100; hp.Q.value = lp.Q.value = -3.0103;
        split.connect(hp, ch); hp.connect(delay); delay.connect(lp); lp.connect(merge, 0, ch);
        lfo.connect(depth); depth.connect(delay.delayTime);
        delays.push(delay); depths.push(depth); filters.push(hp, lp);
      }
      function apply(values, instant) {
        const v = parameters('chorus', values), set = (param, x) => instant ? param.value = x : param.setTargetAtTime(x, c.currentTime, .02);
        set(lfo.frequency, v.rate); depths.forEach((n, ch) => set(n.gain, v.depth / 1000 * (ch ? -1 : 1)));
        filters.forEach((n, i) => { if (i % 2) set(n.frequency, Math.min(v.tone, c.sampleRate * .49)); });
        set(dry.gain, 1 - v.wet); set(wet.gain, v.wet);
      }
      apply(p, true); lfo.start();
      return { input, output, update: v => apply(v, false), dispose() { lfo.stop(); [input, output, dry, wet, split, merge, lfo, ...delays, ...depths, ...filters].forEach(n => n.disconnect()); } };
    }
  };
  function driveCurve(amount) {
    const k = amount, curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * (1 + k)) / Math.tanh(1 + k); }
    return curve;
  }
  registry.distortion = {
    name: 'Distortion', lesson: 'audio-compression.html',
    controls: [control('drive', 'Drive', 0, 40, .5, 6, ''), control('tone', 'Tone', 500, 12000, 100, 5000, 'Hz'), control('output', 'Output', -24, 6, .5, -6, 'dB')],
    create(c, p) {
      const dc = eqNode(c, 'highpass'); dc.frequency.value = 20; dc.Q.value = -3.0103;
      const shaper = c.createWaveShaper(), tone = c.createBiquadFilter(), out = c.createGain();
      shaper.oversample = '4x'; shaper.curve = driveCurve(p.drive); tone.type = 'lowpass'; tone.frequency.value = p.tone; out.gain.value = Math.pow(10, p.output / 20);
      shaper.connect(dc); dc.connect(tone); tone.connect(out);
      let drive = p.drive;
      return { input: shaper, output: out, update(n) { if (n.drive !== drive) { shaper.curve = driveCurve(n.drive); drive = n.drive; } tone.frequency.setTargetAtTime(n.tone, c.currentTime, .01); out.gain.setTargetAtTime(Math.pow(10, n.output / 20), c.currentTime, .01); },
        dispose() { [shaper, dc, tone, out].forEach(n => n.disconnect()); } };
    }
  };
  registry.limiter = {
    name: 'Limiter', description: 'Fast compression followed by a sample-peak safety clip. Not a true-peak or intersample limiter; clipping can add distortion.', lesson: 'audio-compression.html',
    controls: [control('ceiling', 'Ceiling', -24, 0, .5, -1, 'dB'), control('release', 'Release', 10, 1000, 10, 120, 'ms')],
    create(c, p) {
      const n = c.createDynamicsCompressor(), pre = c.createGain(), clip = c.createWaveShaper(), out = c.createGain();
      clip.curve = Float32Array.from({length: 4097}, (_, i) => Math.max(-1, Math.min(1, (i / 2048 - 1) * 2)));
      n.connect(pre); pre.connect(clip); clip.connect(out);
      pre.gain.value = .5 / (10 ** (p.ceiling / 20)); out.gain.value = 10 ** (p.ceiling / 20);
      n.knee.value = 0; n.ratio.value = 20; n.attack.value = .001; n.threshold.value = p.ceiling; n.release.value = p.release / 1000;
      return { input: n, output: out, update(next) { pre.gain.setTargetAtTime(.5 / (10 ** (next.ceiling / 20)), c.currentTime, .01); out.gain.setTargetAtTime(10 ** (next.ceiling / 20), c.currentTime, .01); n.threshold.setTargetAtTime(next.ceiling, c.currentTime, .01); n.release.setTargetAtTime(next.release / 1000, c.currentTime, .01); }, dispose: () => [n, pre, clip, out].forEach(node => node.disconnect()) };
    }
  };
  function parameters(type, values = {}) { return Object.fromEntries(registry[type].controls.map(d => { const v = Number(values[d.key]); return [d.key, Number.isFinite(v) ? Math.max(d.min, Math.min(d.max, v)) : d.value]; })); }
  window.AudioEffects = { registry, eqNode, compressorNode, parameters, register(type, definition) { registry[type] = definition; } };
}());
