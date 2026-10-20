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
    controls: [control('frequency', 'Frequency', 20, 20000, 1, 1000, 'Hz'), control('gain', 'Gain', -18, 18, .5, 0, 'dB'), control('Q', 'Q', .3, 12, .1, 1, '')],
    create(c, p) { const n = eqNode(c); for (const k of ['frequency', 'gain', 'Q']) n[k].value = p[k]; return { input: n, output: n, update(next) { for (const k of ['frequency', 'gain', 'Q']) n[k].setTargetAtTime(next[k], c.currentTime, .01); }, dispose: () => n.disconnect() }; }
  };
  registry.compressor = {
    name: 'Compressor', lesson: 'audio-compression.html',
    controls: [control('threshold', 'Threshold', -60, 0, 1, -24, 'dB'), control('ratio', 'Ratio', 1, 20, .5, 4, ':1'), control('knee', 'Knee', 0, 40, 1, 12, 'dB'), control('attack', 'Attack', 1, 200, 1, 10, 'ms'), control('release', 'Release', 10, 1000, 10, 250, 'ms'), control('makeup', 'Makeup', -12, 12, .5, 0, 'dB')],
    create(c, p) { const n = compressorNode(c), g = c.createGain(); for (const k of ['threshold', 'ratio', 'knee']) n[k].value = p[k]; n.attack.value = p.attack / 1000; n.release.value = p.release / 1000; g.gain.value = Math.pow(10, p.makeup / 20); n.connect(g); return { input: n, output: g, update(next) { for (const k of ['threshold', 'ratio', 'knee']) n[k].setTargetAtTime(next[k], c.currentTime, .01); n.attack.setTargetAtTime(next.attack / 1000, c.currentTime, .01); n.release.setTargetAtTime(next.release / 1000, c.currentTime, .01); g.gain.setTargetAtTime(Math.pow(10, next.makeup / 20), c.currentTime, .01); }, dispose() { n.disconnect(); g.disconnect(); } }; }
  };
  registry.delay = {
    name: 'Echo / delay', lesson: 'room-acoustics.html',
    controls: [control('time', 'Delay time', 20, 1500, 10, 250, 'ms'), control('feedback', 'Feedback', 0, .8, .05, .3, ''), control('wet', 'Wet mix', 0, 1, .05, .2, '')],
    create(c, p) {
      const input=c.createGain(), output=c.createGain(), dry=c.createGain(), wet=c.createGain(), delay=c.createDelay(2), feedback=c.createGain();
      delay.delayTime.value=p.time/1000;feedback.gain.value=p.feedback;dry.gain.value=1-p.wet;wet.gain.value=p.wet;
      input.connect(dry);dry.connect(output);input.connect(delay);delay.connect(wet);wet.connect(output);delay.connect(feedback);feedback.connect(delay);
      return {input,output,update(next){delay.delayTime.setTargetAtTime(next.time/1000,c.currentTime,.01);feedback.gain.setTargetAtTime(next.feedback,c.currentTime,.01);dry.gain.setTargetAtTime(1-next.wet,c.currentTime,.01);wet.gain.setTargetAtTime(next.wet,c.currentTime,.01);},dispose(){[input,output,dry,wet,delay,feedback].forEach(n=>n.disconnect());}};
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
    controls: [control('size', 'Room size', .2, 6, .1, 1.8, 's'), control('decay', 'Decay shape', 1, 8, .5, 3, ''), control('predelay', 'Pre-delay', 0, 200, 5, 15, 'ms'), control('tone', 'Tone', 1000, 16000, 100, 7000, 'Hz'), control('wet', 'Wet mix', 0, 1, .05, .25, '')],
    create(c, p) {
      const input = c.createGain(), output = c.createGain(), dry = c.createGain(), wet = c.createGain(), pre = c.createDelay(1), tone = c.createBiquadFilter(), conv = c.createConvolver();
      tone.type = 'lowpass'; let shape = '';
      function set(next, now) {
        const key = next.size + ':' + next.decay;
        if (key !== shape) { conv.buffer = roomImpulse(c, next.size, next.decay); shape = key; }
        const t = now ? c.currentTime : 0, s = (param, v) => now ? param.setTargetAtTime(v, t, .01) : (param.value = v);
        s(pre.delayTime, next.predelay / 1000); s(tone.frequency, next.tone); s(dry.gain, 1 - next.wet); s(wet.gain, next.wet);
      }
      set(p, false);
      input.connect(dry); dry.connect(output); input.connect(pre); pre.connect(conv); conv.connect(tone); tone.connect(wet); wet.connect(output);
      return { input, output, update(next) { set(next, true); }, dispose() { [input, output, dry, wet, pre, tone, conv].forEach(n => n.disconnect()); } };
    }
  };
  registry.chorus = {
    name: 'Chorus', lesson: 'room-acoustics.html',
    controls: [control('rate', 'Rate', .05, 8, .05, .8, 'Hz'), control('depth', 'Depth', 0, 10, .1, 3, 'ms'), control('wet', 'Wet mix', 0, 1, .05, .45, '')],
    create(c, p) {
      const input = c.createGain(), output = c.createGain(), dry = c.createGain(), wet = c.createGain(), delay = c.createDelay(.1), lfo = c.createOscillator(), depth = c.createGain();
      delay.delayTime.value = .015; lfo.frequency.value = p.rate; depth.gain.value = p.depth / 1000; dry.gain.value = 1 - p.wet; wet.gain.value = p.wet;
      lfo.connect(depth); depth.connect(delay.delayTime); lfo.start();
      input.connect(dry); dry.connect(output); input.connect(delay); delay.connect(wet); wet.connect(output);
      return { input, output, update(n) { const t = c.currentTime; lfo.frequency.setTargetAtTime(n.rate, t, .02); depth.gain.setTargetAtTime(n.depth / 1000, t, .02); dry.gain.setTargetAtTime(1 - n.wet, t, .02); wet.gain.setTargetAtTime(n.wet, t, .02); },
        dispose() { try { lfo.stop(); } catch (_e) { /* stopped */ } [input, output, dry, wet, delay, lfo, depth].forEach(n => n.disconnect()); } };
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
      const shaper = c.createWaveShaper(), tone = c.createBiquadFilter(), out = c.createGain();
      shaper.oversample = '2x'; shaper.curve = driveCurve(p.drive); tone.type = 'lowpass'; tone.frequency.value = p.tone; out.gain.value = Math.pow(10, p.output / 20);
      shaper.connect(tone); tone.connect(out);
      let drive = p.drive;
      return { input: shaper, output: out, update(n) { if (n.drive !== drive) { shaper.curve = driveCurve(n.drive); drive = n.drive; } tone.frequency.setTargetAtTime(n.tone, c.currentTime, .01); out.gain.setTargetAtTime(Math.pow(10, n.output / 20), c.currentTime, .01); },
        dispose() { [shaper, tone, out].forEach(n => n.disconnect()); } };
    }
  };
  registry.limiter = {
    name: 'Limiter', lesson: 'audio-compression.html',
    controls: [control('ceiling', 'Ceiling', -24, 0, .5, -1, 'dB'), control('release', 'Release', 10, 1000, 10, 120, 'ms')],
    create(c, p) {
      const n = c.createDynamicsCompressor();
      n.knee.value = 0; n.ratio.value = 20; n.attack.value = .001; n.threshold.value = p.ceiling; n.release.value = p.release / 1000;
      return { input: n, output: n, update(next) { n.threshold.setTargetAtTime(next.ceiling, c.currentTime, .01); n.release.setTargetAtTime(next.release / 1000, c.currentTime, .01); }, dispose: () => n.disconnect() };
    }
  };
  function parameters(type, values = {}) { return Object.fromEntries(registry[type].controls.map(d => { const v = Number(values[d.key]); return [d.key, Number.isFinite(v) ? Math.max(d.min, Math.min(d.max, v)) : d.value]; })); }
  window.AudioEffects = { registry, eqNode, compressorNode, parameters, register(type, definition) { registry[type] = definition; } };
}());
