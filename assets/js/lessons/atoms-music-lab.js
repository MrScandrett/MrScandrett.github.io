(function () {
  'use strict';
  const canvas = document.getElementById('sound-lab-canvas');
  if (!canvas) return;
  const surface = window.SimKit.canvas2d(canvas, { box: canvas.parentElement, dpr: 2 });
  const ctx = surface.ctx;
  const frequency = document.getElementById('sound-frequency');
  const amplitude = document.getElementById('sound-amplitude');
  const damping = document.getElementById('sound-damping');
  const start = document.getElementById('sound-lab-start');
  let wave = 'sine';
  let audioContext = null;
  let oscillator = null;
  let gain = null;
  let running = false;
  let phase = 0;

  function sample(x) {
    const cycle = x - Math.floor(x);
    if (wave === 'square') return cycle < .5 ? 1 : -1;
    if (wave === 'triangle') return 1 - 4 * Math.abs(cycle - .5);
    if (wave === 'sawtooth') return 2 * cycle - 1;
    return Math.sin(cycle * Math.PI * 2);
  }

  function syncAudio() {
    if (!oscillator) return;
    const now = audioContext.currentTime;
    oscillator.frequency.setTargetAtTime(Number(frequency.value), now, .015);
    oscillator.type = wave;
    gain.gain.setTargetAtTime(Number(amplitude.value) / 100 * .12, now, .02);
  }

  async function toggleSound() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      oscillator = audioContext.createOscillator();
      gain = audioContext.createGain();
      gain.gain.value = 0;
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
    }
    running = !running;
    if (running) await audioContext.resume();
    gain.gain.setTargetAtTime(running ? Number(amplitude.value) / 100 * .12 : 0, audioContext.currentTime, .02);
    start.textContent = running ? 'Mute sound' : 'Start sound';
    start.setAttribute('aria-pressed', String(running));
  }

  function updateLabels() {
    const hz = Number(frequency.value);
    const amp = Number(amplitude.value);
    document.getElementById('sound-frequency-output').textContent = hz + ' Hz';
    document.getElementById('sound-amplitude-output').textContent = amp + '%';
    document.getElementById('sound-damping-output').textContent = damping.value + '%';
    document.getElementById('sound-frequency-readout').textContent = hz + ' Hz';
    document.getElementById('sound-period-readout').textContent = 'Period ' + (1000 / hz).toFixed(2) + ' ms';
    document.getElementById('sound-energy-readout').textContent = 'Relative energy ' + Math.round(amp * amp / 100) + '%';
    syncAudio();
  }

  function draw() {
    const w = surface.width;
    const h = surface.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,238,225,.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const hz = Number(frequency.value);
    const amp = Number(amplitude.value) / 100;
    const cycles = 1.2 + hz / 135;
    const mid = h * .42;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y = mid - sample(x / w * cycles + phase) * amp * h * .24;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = '#78eee1'; ctx.lineWidth = 3; ctx.shadowColor = '#34d9df'; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
    const resonance = 1 / (1 + Math.pow((hz - 440) / (30 + Number(damping.value) * 1.4), 2));
    const response = amp * resonance * (1 - Number(damping.value) / 120);
    ctx.fillStyle = '#9db8bd';
    for (let i = 0; i < 18; i++) {
      const baseX = 28 + i * (w - 56) / 17;
      const offset = sample(i / 5 + phase * .5) * response * 18;
      ctx.beginPath(); ctx.arc(baseX + offset, h * .78, 5 + response * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffcf70'; ctx.font = '700 13px system-ui';
    ctx.fillText('receiver response ' + Math.round(response * 100) + '%', 18, h - 22);
    phase += matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : .006;
  }

  [frequency, amplitude, damping].forEach(el => el.addEventListener('input', updateLabels));
  document.querySelectorAll('[data-wave]').forEach(button => button.addEventListener('click', () => {
    wave = button.dataset.wave;
    document.querySelectorAll('[data-wave]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    syncAudio();
  }));
  document.querySelectorAll('[data-resonance]').forEach(button => button.addEventListener('click', () => {
    frequency.value = button.dataset.resonance;
    document.querySelectorAll('[data-resonance]').forEach(item => item.classList.toggle('is-hot', item === button));
    updateLabels();
  }));
  document.getElementById('sound-check').addEventListener('click', () => {
    const changedPitch = Number(frequency.value) > 220;
    const sameHeight = Number(amplitude.value) === 50;
    document.getElementById('sound-feedback').textContent = changedPitch && sameHeight
      ? 'Yes. Frequency changed the pitch while amplitude—and therefore wave height—stayed at 50%.'
      : 'Set frequency above 220 Hz while keeping amplitude at 50%. Frequency controls pitch; amplitude controls wave height.';
  });
  start.addEventListener('click', toggleSound);
  updateLabels(); window.SimKit.loop(draw);
}());
