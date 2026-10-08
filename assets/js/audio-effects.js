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
    create(c, p) { const n = eqNode(c); for (const k of ['frequency', 'gain', 'Q']) n[k].value = p[k]; return { input: n, output: n, dispose: () => n.disconnect() }; }
  };
  registry.compressor = {
    name: 'Compressor', lesson: 'audio-compression.html',
    controls: [control('threshold', 'Threshold', -60, 0, 1, -24, 'dB'), control('ratio', 'Ratio', 1, 20, .5, 4, ':1'), control('knee', 'Knee', 0, 40, 1, 12, 'dB'), control('attack', 'Attack', 1, 200, 1, 10, 'ms'), control('release', 'Release', 10, 1000, 10, 250, 'ms'), control('makeup', 'Makeup', -12, 12, .5, 0, 'dB')],
    create(c, p) { const n = compressorNode(c), g = c.createGain(); for (const k of ['threshold', 'ratio', 'knee']) n[k].value = p[k]; n.attack.value = p.attack / 1000; n.release.value = p.release / 1000; g.gain.value = Math.pow(10, p.makeup / 20); n.connect(g); return { input: n, output: g, dispose() { n.disconnect(); g.disconnect(); } }; }
  };
  registry.delay = {
    name: 'Echo / delay', lesson: 'room-acoustics.html',
    controls: [control('time', 'Delay time', 20, 1500, 10, 250, 'ms'), control('feedback', 'Feedback', 0, .8, .05, .3, ''), control('wet', 'Wet mix', 0, 1, .05, .2, '')],
    create(c, p) {
      const input=c.createGain(), output=c.createGain(), dry=c.createGain(), wet=c.createGain(), delay=c.createDelay(2), feedback=c.createGain();
      delay.delayTime.value=p.time/1000;feedback.gain.value=p.feedback;dry.gain.value=1-p.wet;wet.gain.value=p.wet;
      input.connect(dry);dry.connect(output);input.connect(delay);delay.connect(wet);wet.connect(output);delay.connect(feedback);feedback.connect(delay);
      return {input,output,dispose(){[input,output,dry,wet,delay,feedback].forEach(n=>n.disconnect());}};
    }
  };
  function parameters(type, values = {}) { return Object.fromEntries(registry[type].controls.map(d => { const v = Number(values[d.key]); return [d.key, Number.isFinite(v) ? Math.max(d.min, Math.min(d.max, v)) : d.value]; })); }
  window.AudioEffects = { registry, eqNode, compressorNode, parameters, register(type, definition) { registry[type] = definition; } };
}());
