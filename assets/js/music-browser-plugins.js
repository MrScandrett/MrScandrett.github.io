/* Curated, locally hosted browser plugins for Music Lab. These deliberately use
 * the same small lifecycle as the WAM adapter so they work in live and offline
 * AudioContexts without network access or native installers. */
(function () {
  'use strict';
  if (!window.AudioEffects) return;
  const control = (key, label, min, max, step, value, unit) => ({ key, label, min, max, step, value, unit });
  const meta = (name, description) => ({
    name, description, format: 'browser', vendor: 'ClassroomOS', license: 'Project source license',
    locallyHosted: true, offlineSupported: true, cpu: 'Light', controls: [],
  });

  const tape = meta('Tape Color', 'Gentle saturation and a darker or brighter tone.');
  tape.controls = [
    control('drive', 'Drive', 0, 100, 1, 28, '%'),
    control('tone', 'Tone', 1200, 18000, 100, 9000, 'Hz'),
    control('output', 'Output', -12, 6, .5, 0, 'dB'),
  ];
  tape.create = (context, p) => {
    const input = context.createGain(), shaper = context.createWaveShaper(), tone = context.createBiquadFilter(), output = context.createGain();
    const amount = 1 + p.drive / 9, curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = i * 2 / (curve.length - 1) - 1; curve[i] = Math.tanh(x * amount) / Math.tanh(amount); }
    shaper.curve = curve; shaper.oversample = '2x'; tone.type = 'lowpass'; tone.frequency.value = p.tone;
    output.gain.value = Math.pow(10, p.output / 20); input.connect(shaper); shaper.connect(tone); tone.connect(output);
    return { input, output, dispose() { [input, shaper, tone, output].forEach(node => node.disconnect()); } };
  };

  const tremolo = meta('Pulse Tremolo', 'Rhythmic volume movement for synths, guitars, or recorded sound.');
  tremolo.controls = [control('rate', 'Rate', .1, 12, .1, 4, 'Hz'), control('depth', 'Depth', 0, 1, .05, .45, '')];
  tremolo.create = (context, p) => {
    const input = context.createGain(), output = context.createGain(), amp = context.createGain(), lfo = context.createOscillator(), depth = context.createGain();
    amp.gain.value = 1 - p.depth / 2; lfo.frequency.value = p.rate; depth.gain.value = p.depth / 2;
    input.connect(amp); amp.connect(output); lfo.connect(depth); depth.connect(amp.gain); lfo.start();
    return { input, output, dispose() { try { lfo.stop(); } catch (_) {} ;[input, output, amp, lfo, depth].forEach(node => node.disconnect()); } };
  };

  window.AudioEffects.register('browser-tape-color', tape);
  window.AudioEffects.register('browser-pulse-tremolo', tremolo);
  window.MusicBrowserPlugins = { ids: ['browser-tape-color', 'browser-pulse-tremolo'] };
}());
