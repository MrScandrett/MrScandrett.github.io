(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const position = byId('cab-position');
  const distance = byId('cab-distance');
  const amp = byId('cab-type');
  const play = byId('cab-play');
  const models = { clean: [1.2, 6400], crunch: [4, 5400], stack: [10, 4300] };
  let system, drive, tone, direct, room, gate;
  let playing = false;

  function riff(ctx) {
    const sr = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.round(sr * 3.2), sr);
    const samples = buffer.getChannelData(0);
    [40, 47, 52, 55, 50, 47].forEach((note, index) => {
      const period = Math.round(sr / (440 * 2 ** ((note - 69) / 12)));
      const string = new Float32Array(period);
      for (let i = 0; i < period; i++) string[i] = Math.random() * 2 - 1;
      const offset = Math.round(index * 0.48 * sr);
      const length = Math.min(Math.round(sr * 0.85), samples.length - offset);
      for (let i = 0; i < length; i++) {
        const k = i % period;
        samples[offset + i] += string[k] * Math.min(1, i / 90, (length - 1 - i) / 900);
        string[k] = 0.498 * (string[k] + string[(k + 1) % period]);
      }
    });
    return buffer;
  }

  function setup() {
    system = AudioLabSynth.createContext({ gain: 0.34 });
    if (!system) return;
    const ctx = system.ctx;
    const source = ctx.createBufferSource();
    source.buffer = riff(ctx);
    source.loop = true;
    drive = ctx.createGain();
    const clip = ctx.createWaveShaper();
    clip.curve = Float32Array.from({ length: 2049 }, (_, i) => Math.tanh(2 * (i / 1024 - 1)));
    clip.oversample = '2x';
    tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.Q.value = 0.7;
    direct = ctx.createGain();
    room = ctx.createGain();
    const reflection = ctx.createDelay();
    reflection.delayTime.value = 0.013;
    gate = ctx.createGain();
    gate.gain.value = 0;
    source.connect(drive).connect(clip).connect(tone).connect(direct).connect(gate);
    tone.connect(reflection).connect(room).connect(gate);
    gate.connect(system.input);
    source.start();
  }

  function update() {
    const radius = Number(position.value) / 100;
    const cm = Number(distance.value);
    byId('cab-marker').setAttribute('transform', 'translate(' + 74 * radius + ' 0)');
    byId('cab-pos-out').value = radius === 0 ? 'Center' : radius === 1 ? 'Edge' : position.value + '% toward edge';
    byId('cab-dist-out').value = cm + ' cm';
    if (!system) return;
    const [gain, cutoff] = models[amp.value];
    const smooth = (param, value) => AudioLabSynth.smooth(param, value, system.ctx, 0.025);
    smooth(drive.gain, gain);
    smooth(tone.frequency, cutoff * (1 - 0.7 * radius));
    smooth(direct.gain, 12 / (10 + cm));
    smooth(room.gain, 0.065);
    smooth(gate.gain, playing && !document.hidden ? 1 : 0);
  }

  play.addEventListener('click', () => {
    if (!system) setup();
    if (!system) { play.textContent = 'Audio unavailable'; return; }
    playing = !playing;
    if (playing) system.resume();
    play.setAttribute('aria-pressed', String(playing));
    play.textContent = playing ? 'Stop guitar riff' : 'Play guitar riff';
    update();
  });
  [position, distance, amp].forEach(control => control.addEventListener('input', update));
  document.addEventListener('visibilitychange', update);
  update();
})();
