(() => {
  'use strict';
  const get = id => document.getElementById(`bb-${id}`);
  const base = get('base'), difference = get('difference'), level = get('level');
  const noise = get('noise'), noiseMix = get('noise-mix');
  const play = get('play'), stop = get('stop'), status = get('status'), progress = get('progress');
  const modes = document.querySelectorAll('input[name="bb-mode"]');
  const duration = Number(progress.max);
  const fadeIn = 0.05, fadeOut = 0.12, stopFade = 0.05;
  const tau = 2 * Math.PI;
  let context, active, generation = 0, quietAt = 0;

  function settings() {
    const mode = document.querySelector('input[name="bb-mode"]:checked').value;
    const left = Number(base.value);
    const beat = mode === 'unison' ? 0 : Number(difference.value);
    return { mode, left, right: left + beat, beat };
  }

  function trace(id, width, seconds, signal) {
    const points = [];
    for (let x = 0; x <= width; x++) {
      const y = 34 - 29 * signal(x / width * seconds);
      points.push(`${x},${y.toFixed(2)}`);
    }
    get(id).setAttribute('d', `M${points.join('L')}`);
  }

  function update() {
    const { mode, left, right, beat } = settings();
    const mixed = mode === 'mixed';
    get('base-value').textContent = `${left} Hz`;
    get('difference-value').textContent = `${difference.value} Hz`;
    difference.disabled = mode === 'unison';
    noiseMix.disabled = noise.value === 'off';
    const mixture = beat ? `${left} + ${right} Hz` : `${left} Hz`;
    get('left-label').textContent = mixed ? mixture : `${left} Hz`;
    get('right-label').textContent = mixed ? mixture : `${right} Hz`;
    get('rate').textContent = `${beat} Hz`;
    get('beat-label').textContent = mixed ? 'Amplitude envelope' : 'Tone alignment';
    get('explanation').textContent = !beat
      ? 'Both ears receive the same steady tone. The two signals stay in step, so the predicted beat rate is zero.'
      : mixed
        ? 'The curve shows the peak amplitude of the mixture. Both ears receive the same rising and falling signal.'
        : 'Peaks show when the tones are in step. Each channel stays at a steady amplitude. A listener may perceive a pulse as the tones drift in and out of step.';

    for (const [ear, frequency] of [['left', left], ['right', right]]) {
      trace(`${ear}-path`, 320, 0.025, time => mixed
        ? (Math.sin(tau * left * time) + Math.sin(tau * right * time)) / 2
        : Math.sin(tau * frequency * time));
    }
    trace('beat-path', 640, 1, time => mixed
      ? Math.abs(Math.cos(Math.PI * beat * time))
      : Math.cos(tau * beat * time));
  }

  function setIdle(message, completed = false) {
    play.disabled = false;
    stop.disabled = true;
    progress.value = completed ? duration : 0;
    status.textContent = message;
  }

  function end(message) {
    generation++;
    const run = active;
    active = null;
    if (run) {
      cancelAnimationFrame(run.frame);
      const now = context.currentTime;
      const amplitude = Math.max(0, Math.min(1, (now - run.start) / fadeIn, (run.finish - now) / fadeOut));
      quietAt = Math.min(now + stopFade, run.finish);
      if (quietAt > now) {
        const gain = run.envelope.gain;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(amplitude, now);
        gain.linearRampToValueAtTime(0, quietAt);
        run.sources.forEach(source => source.stop(quietAt));
      }
    }
    setIdle(message);
  }

  function makeNoiseBuffer(type) {
    const sampleRate = context.sampleRate;
    const buffer = context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
    const samples = buffer.getChannelData(0);
    const random = () => 2 * Math.random() - 1;
    if (type === 'white') {
      for (let i = 0; i < samples.length; i++) samples[i] = random();
      return buffer;
    }

    if (type === 'pink') {
      // Sum independent random values that refresh at octave-spaced rates.
      const rows = Array.from({ length: Math.ceil(Math.log2(sampleRate / 20)) }, random);
      let sum = rows.reduce((total, value) => total + value, 0);
      for (let i = 0; i < samples.length; i++) {
        const row = 31 - Math.clz32((i + 1) & -(i + 1));
        if (row < rows.length) {
          const value = random();
          sum += value - rows[row];
          rows[row] = value;
        }
        samples[i] = sum + random();
      }
    } else {
      // Leaky integration rolls off the high frequencies and bounds the low end.
      const decay = Math.exp(-tau * 20 / sampleRate);
      let value = 0;
      for (let i = 0; i < samples.length; i++) {
        value = decay * value + random();
        samples[i] = value;
      }
    }

    let sum = 0;
    for (const sample of samples) sum += sample;
    const mean = sum / samples.length;
    let peak = 0;
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample - mean));
    if (peak > 0) {
      for (let i = 0; i < samples.length; i++) samples[i] = (samples[i] - mean) / peak;
    }
    return buffer;
  }

  function startSample() {
    const { mode, left, right } = settings();
    const merger = context.createChannelMerger(2);
    const volume = context.createGain();
    const envelope = context.createGain();
    const toneGain = context.createGain();
    merger.connect(toneGain).connect(volume).connect(envelope).connect(context.destination);
    volume.gain.value = Number(level.value) / 100;

    const mix = noise.value === 'off' ? 0 : Number(noiseMix.value) / 100;
    toneGain.gain.value = 1 - mix;
    const nodes = [merger, volume, envelope, toneGain];
    const sources = [];
    function tone(frequency, channels, amplitude = 1) {
      const oscillator = context.createOscillator();
      const trim = context.createGain();
      oscillator.frequency.value = frequency;
      trim.gain.value = amplitude;
      oscillator.connect(trim);
      channels.forEach(channel => trim.connect(merger, 0, channel));
      sources.push(oscillator);
      nodes.push(oscillator, trim);
    }

    // Shared sources keep both channels of the mix and control sample in phase.
    if (left === right) {
      tone(left, [0, 1]);
    } else if (mode === 'mixed') {
      tone(left, [0, 1], 0.5);
      tone(right, [0, 1], 0.5);
    } else {
      tone(left, [0]);
      tone(right, [1]);
    }

    let noiseGain;
    if (noise.value !== 'off') {
      const source = context.createBufferSource();
      source.buffer = makeNoiseBuffer(noise.value);
      noiseGain = context.createGain();
      noiseGain.gain.value = mix;
      // The stereo volume node upmixes the mono noise equally to both ears.
      source.connect(noiseGain).connect(volume);
      sources.push(source);
      nodes.push(source, noiseGain);
    }

    const start = Math.max(context.currentTime + 0.02, quietAt);
    const finish = start + duration;
    envelope.gain.value = 0;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(1, start + fadeIn);
    envelope.gain.setValueAtTime(1, finish - fadeOut);
    envelope.gain.linearRampToValueAtTime(0, finish);

    const run = { start, finish, envelope, volume, sources, toneGain, noiseGain, frame: 0 };
    active = run;
    sources[0].onended = () => {
      nodes.forEach(node => node.disconnect());
      if (active !== run) return;
      active = null;
      cancelAnimationFrame(run.frame);
      setIdle('Sample complete', true);
    };
    sources.forEach(source => {
      source.start(start);
      source.stop(finish);
    });

    function showProgress() {
      progress.value = Math.max(0, context.currentTime - start);
      run.frame = requestAnimationFrame(showProgress);
    }
    showProgress();
    status.textContent = noiseGain ? `Playing with ${noise.value} noise` : 'Playing stereo sample';
  }

  play.addEventListener('click', async () => {
    const token = ++generation;
    play.disabled = true;
    stop.disabled = false;
    progress.value = 0;
    status.textContent = 'Starting audio…';
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      context ||= new Audio();
      await context.resume();
      if (token === generation) startSample();
    } catch {
      if (token === generation) end('Audio could not start. The signal diagrams are still available.');
    }
  });
  stop.addEventListener('click', () => end('Sample stopped'));
  for (const control of [base, difference, noise, ...modes]) control.addEventListener('input', () => {
    if (play.disabled) end('Settings changed. Press Play to hear the new sample.');
    else progress.value = 0;
    update();
  });
  function updateLevel() {
    get('level-value').textContent = `${level.value}%`;
    active?.volume.gain.setTargetAtTime(Number(level.value) / 100, context.currentTime, 0.02);
  }
  level.addEventListener('input', updateLevel);
  noiseMix.addEventListener('input', () => {
    get('noise-mix-value').textContent = `${noiseMix.value}%`;
    if (!active?.noiseGain) return;
    const mix = Number(noiseMix.value) / 100;
    const now = context.currentTime;
    active.toneGain.gain.setTargetAtTime(1 - mix, now, 0.02);
    active.noiseGain.gain.setTargetAtTime(mix, now, 0.02);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && play.disabled) end('Sample stopped when you left the page');
  });
  window.addEventListener('pagehide', () => {
    if (play.disabled) end('Sample stopped');
  });
  update();
  updateLevel();
})();
