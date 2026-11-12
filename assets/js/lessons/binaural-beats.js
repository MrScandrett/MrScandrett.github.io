(() => {
  'use strict';
  const get = id => document.getElementById(`bb-${id}`);
  const base = get('base'), difference = get('difference'), mode = get('mode'), level = get('level');
  const play = get('play'), stop = get('stop'), status = get('status');
  let context, active, generation = 0;
  const settings = () => ({ left: +base.value, right: +base.value + (mode.value === 'unison' ? 0 : +difference.value) });
  function update() {
    const { left, right } = settings();
    get('base-value').textContent = `${left} Hz`;
    get('difference-value').textContent = `${difference.value} Hz`;
    get('level-value').textContent = `${level.value}%`;
    get('readout').textContent = `Left: ${left} Hz${mode.value === 'mixed' ? ` + ${right} Hz` : ''} · Right: ${mode.value === 'mixed' ? `${left} Hz + ` : ''}${right} Hz · Predicted beat rate: ${right - left} Hz`;
    get('explanation').textContent = mode.value === 'mixed'
      ? 'Both ears receive the same mixture. The changing amplitude is in the audio signal itself. Each tone is halved in level to keep the mixed signal bounded.'
      : mode.value === 'unison' ? 'Both ears receive the same steady tone. Zero frequency difference predicts no beats.'
      : 'Each ear receives a steady sine wave with constant amplitude. Any perceived beat arises from comparing the ears, not from an amplitude pulse in either channel. Stereo headphones are needed; some listeners may not notice it.';
    for (const [ear, frequency, center] of [['left', left, 75], ['right', right, 188]]) {
      let path = '';
      for (let i = 0; i <= 1400; i++) {
        const time = i / 1400 * 0.1;
        const wave = mode.value === 'mixed'
          ? (Math.sin(2 * Math.PI * left * time) + Math.sin(2 * Math.PI * right * time)) / 2
          : Math.sin(2 * Math.PI * frequency * time);
        path += `${i ? 'L' : 'M'}${(12 + i / 1400 * 696).toFixed(2)},${(center - wave * 34).toFixed(2)}`;
      }
      get(`${ear}-path`).setAttribute('d', path);
    }
  }
  function end(message = 'Stopped. You can change settings and play another sample.') {
    generation++;
    if (active) {
      const run = active;
      active = null;
      clearTimeout(run.timer);
      const now = context.currentTime;
      run.gain.gain.cancelScheduledValues(now);
      run.gain.gain.setTargetAtTime(0, now, 0.01);
      run.oscillators.forEach(osc => { try { osc.stop(now + 0.05); } catch { /* Already ended. */ } });
      setTimeout(() => run.nodes.forEach(node => node.disconnect()), 100);
    }
    play.disabled = false;
    stop.disabled = true;
    status.textContent = message;
  }
  play.addEventListener('click', async () => {
    end();
    const token = generation;
    play.disabled = true;
    stop.disabled = false;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Audio unavailable');
      context ||= new Audio();
      await context.resume();
      if (token !== generation) return;
      const { left, right } = settings();
      const merger = context.createChannelMerger(2), gain = context.createGain();
      gain.channelCount = 2;
      gain.channelCountMode = 'explicit';
      merger.connect(gain).connect(context.destination);
      const now = context.currentTime, amplitude = +level.value / 100;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(amplitude, now + 0.04);
      gain.gain.setValueAtTime(amplitude, now + 9.9);
      gain.gain.linearRampToValueAtTime(0, now + 10);
      const run = { gain, oscillators: [], nodes: [merger, gain] };
      function tone(frequency, channel, scale = 1) {
        const osc = context.createOscillator(), trim = context.createGain();
        osc.type = 'sine'; osc.frequency.value = frequency; trim.gain.value = scale;
        osc.connect(trim).connect(merger, 0, channel);
        osc.start(now); osc.stop(now + 10);
        run.oscillators.push(osc); run.nodes.push(osc, trim);
      }
      if (mode.value === 'mixed') {
        for (const channel of [0, 1]) { tone(left, channel, 0.5); tone(right, channel, 0.5); }
      } else { tone(left, 0); tone(right, 1); }
      active = run;
      run.timer = setTimeout(() => end('Sample complete. Record what you observed.'), 10100);
      status.textContent = 'Playing a quiet 10-second sample. Stop at any time.';
    } catch {
      end('Audio could not start. You can still explore the diagrams and calculations.');
    }
  });
  stop.addEventListener('click', () => end());
  for (const control of [base, difference, mode, level]) control.addEventListener('input', () => {
    if (play.disabled) end('Settings changed. Press Play to hear the new comparison.');
    update();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) end('Paused when you left the page. Press Play to start again.'); });
  window.addEventListener('pagehide', () => end());
  update();
})();
