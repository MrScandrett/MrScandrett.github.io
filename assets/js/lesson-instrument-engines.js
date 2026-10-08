/* Audio building blocks shared by instrument lessons and channel experiences.
 * Hosts own the context, envelope and output routing. These engines never connect
 * to speakers themselves, so a lesson can audition and a DAW can mix/export. */
(function (root) {
  'use strict';
  const pianoHarmonics = [[1, 1], [2, .5], [3, .22], [4, .12], [6, .05]];
  function pianoSources(context, output, frequency, time) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(10000, frequency * 6 + 1800);
    filter.connect(output);
    const nodes = [filter];
    const sources = pianoHarmonics.map(([multiple, level]) => {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency * multiple;
      gain.gain.value = level;
      oscillator.connect(gain); gain.connect(filter); oscillator.start(time);
      nodes.push(oscillator, gain);
      return oscillator;
    });
    return { sources, disconnect() { nodes.forEach(node => node.disconnect()); } };
  }
  function pluckBuffer(context, frequency, duration) {
    const length = Math.max(2, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(context.sampleRate / frequency)), ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    let index = 0, previous = 0;
    for (let n = 0; n < length; n++) {
      const current = ring[index]; data[n] = current;
      ring[index] = .994 * .5 * (current + previous);
      previous = current; index = (index + 1) % period;
    }
    return buffer;
  }
  root.LessonInstrumentEngines = { pianoSources, pluckBuffer };
})(typeof window === 'undefined' ? globalThis : window);
