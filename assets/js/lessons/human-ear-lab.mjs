import { computeRelayState } from './human-ear-physics.mjs';

const root = document.getElementById('ear-lab');
const canvas = document.getElementById('ear-lab-canvas');

if (root && canvas && window.SimKit) {
  const modeButtons = Array.from(root.querySelectorAll('[data-ear-mode]'));
  const blockageInput = document.getElementById('ear-blockage');
  const freqInput = document.getElementById('ear-freq');
  const dbInput = document.getElementById('ear-db');
  const freqValue = document.getElementById('ear-freq-value');
  const dbValue = document.getElementById('ear-db-value');
  const playBtn = document.getElementById('ear-play');
  const audioBtn = document.getElementById('ear-audio');
  const readoutEl = document.getElementById('ear-lab-readout');
  const statPathEl = document.getElementById('ear-stat-path');
  const statGainEl = document.getElementById('ear-stat-gain');
  const statZoneEl = document.getElementById('ear-stat-zone');
  const statNerveEl = document.getElementById('ear-stat-nerve');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mode = 'air';
  let playing = !reducedMotion;
  let simTime = 0.4;
  let state = computeRelayState({ mode });

  // Optional gentle sine tone (off by default, strictly capped gain)
  let audioCtx = null;
  let osc = null;
  let gainNode = null;
  let soundOn = false;

  function stopTone() {
    if (!audioCtx || !gainNode) return;
    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setTargetAtTime(0.0001, now, 0.03);
  }

  function syncTone() {
    if (!soundOn || !playing || document.hidden) {
      stopTone();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!audioCtx) {
      audioCtx = new AudioCtor();
      osc = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();
      osc.type = 'sine';
      gainNode.gain.value = 0.0001;
      osc.connect(gainNode).connect(audioCtx.destination);
      osc.start();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    osc.frequency.setTargetAtTime(state.freqHz, now, 0.03);
    const targetGain = Math.max(0.002, state.cochleaAmp * 0.055);
    gainNode.gain.setTargetAtTime(targetGain, now, 0.04);
  }

  function syncUI() {
    state = computeRelayState({
      mode,
      freqHz: Number(freqInput.value),
      loudnessDb: Number(dbInput.value),
      blockage: blockageInput.checked
    });

    modeButtons.forEach((btn) => {
      const active = btn.dataset.earMode === mode;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('is-active', active);
    });

    freqValue.textContent = `${state.freqHz} Hz`;
    dbValue.textContent = `${state.loudnessDb} dB`;
    readoutEl.textContent = state.hearingStatus;

    statPathEl.textContent = mode === 'air' ? 'Outer → Middle → Cochlea' : 'Skull Bone → Cochlea';
    statGainEl.textContent = mode === 'bone'
      ? 'Bypassed (bone drive)'
      : (state.blockage ? 'Damped (blocked)' : '~20x pressure boost');
    statZoneEl.textContent = state.regionLabel;
    statNerveEl.textContent = `${state.nerveRateHz} impulses/s`;

    syncTone();
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.earMode === 'bone' ? 'bone' : 'air';
      syncUI();
      drawScene();
    });
  });

  [blockageInput, freqInput, dbInput].forEach((el) => {
    el.addEventListener('input', () => {
      syncUI();
      drawScene();
    });
  });

  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? 'Pause wave' : 'Play wave';
    playBtn.setAttribute('aria-pressed', String(playing));
    if (playing) loop.resume();
    else loop.pause();
    syncTone();
    drawScene();
  });

  audioBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    audioBtn.textContent = soundOn ? 'Tone on' : 'Tone off';
    audioBtn.setAttribute('aria-pressed', String(soundOn));
    syncTone();
  });

  document.addEventListener('visibilitychange', syncTone);

  const stage = window.SimKit.canvas2d(canvas, { height: 320 });

  function drawScene() {
    const ctx = stage.ctx;
    const w = stage.width;
    const h = stage.height;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);

    // Background laboratory backdrop
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#071720');
    bg.addColorStop(1, '#0c2430');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(148, 226, 232, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 32; x < w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 32; y < h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Zone coordinates
    const cy = h * 0.54;
    const outerLeft = w * 0.04;
    const outerRight = w * 0.30;
    const drumX = w * 0.32;
    const ovalX = w * 0.50;
    const cochStart = w * 0.53;
    const cochEnd = w * 0.87;
    const nerveEnd = w * 0.96;

    const freqFactor = 0.65 + (Math.log(state.freqHz / 200) / Math.log(40)) * 2.2;
    const phase = simTime * (4.2 * freqFactor);

    // Zone labels at top
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillStyle = '#9bd8df';
    ctx.textAlign = 'center';
    ctx.fillText('1. OUTER EAR', (outerLeft + outerRight) / 2, 22);
    ctx.fillText('2. MIDDLE EAR (OSSICLES)', (drumX + ovalX) / 2, 22);
    ctx.fillText('3. INNER EAR (COCHLEA)', (cochStart + cochEnd) / 2, 22);
    ctx.fillText('NERVE', (cochEnd + nerveEnd) / 2 + 4, 22);

    // Skull bone boundary track (for bone conduction path)
    const boneTopY = 48;
    const boneBotY = h - 34;
    ctx.fillStyle = mode === 'bone' ? 'rgba(245, 196, 81, 0.14)' : 'rgba(148, 163, 184, 0.07)';
    ctx.strokeStyle = mode === 'bone' ? 'rgba(245, 196, 81, 0.55)' : 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(outerLeft, boneTopY - 12, cochEnd - outerLeft, 24, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = mode === 'bone' ? '#fde68a' : '#89a7b3';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      mode === 'bone'
        ? 'Skull / Jawbone Vibration (bypasses outer & middle ear)'
        : 'Temporal Bone (skull)',
      outerLeft + 10,
      boneTopY + 4
    );

    // Bone conduction traveling pulses along skull track
    if (state.boneAmp > 0) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let x = outerLeft + 8; x <= cochStart + 18; x += 4) {
        const t = (x - outerLeft) / (cochStart - outerLeft);
        const y = boneTopY + Math.sin(t * 14 * freqFactor - phase) * (5.5 * state.boneAmp);
        if (x === outerLeft + 8) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Downward bone-to-cochlea transfer arrow
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cochStart + 18, boneTopY + 14);
      ctx.lineTo(cochStart + 18, cy - 42);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Outer ear pinna & canal
    ctx.save();
    ctx.strokeStyle = mode === 'air' ? '#5eead4' : '#4b6c75';
    ctx.lineWidth = 2.5;
    // Pinna curve
    ctx.beginPath();
    ctx.moveTo(outerLeft + 20, cy - 52);
    ctx.quadraticCurveTo(outerLeft - 6, cy, outerLeft + 20, cy + 52);
    ctx.stroke();
    // Canal walls
    ctx.beginPath();
    ctx.moveTo(outerLeft + 18, cy - 26);
    ctx.lineTo(drumX, cy - 22);
    ctx.moveTo(outerLeft + 18, cy + 26);
    ctx.lineTo(drumX, cy + 22);
    ctx.stroke();

    // Air conduction wave arcs in ear canal
    if (state.outerAmp > 0) {
      const waveCount = 5;
      for (let i = 0; i < waveCount; i++) {
        const travel = ((simTime * 0.95 + i / waveCount) % 1);
        const wx = outerLeft + 14 + travel * (drumX - outerLeft - 22);
        const fade = Math.sin(travel * Math.PI);
        ctx.strokeStyle = `rgba(94, 234, 212, ${(0.22 + state.outerAmp * 0.72) * fade})`;
        ctx.lineWidth = 1.6 + state.outerAmp * 1.8;
        ctx.beginPath();
        ctx.arc(wx - 10, cy, 16, -0.68, 0.68);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Optional middle-ear blockage indicator
    if (state.blockage) {
      ctx.save();
      ctx.fillStyle = 'rgba(248, 113, 113, 0.24)';
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
      ctx.lineWidth = 1.5;
      const bx = drumX - 24;
      ctx.beginPath();
      ctx.roundRect(bx, cy - 22, 18, 44, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fecaca';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BLOCKED', bx + 9, cy + 38);
      ctx.restore();
    }

    // Tympanic membrane (eardrum)
    const drumDisp = Math.sin(phase) * 9 * state.eardrumAmp;
    ctx.save();
    ctx.strokeStyle = state.eardrumAmp > 0.2 ? '#99f6e4' : '#64748b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(drumX, cy - 26);
    ctx.quadraticCurveTo(drumX + drumDisp, cy, drumX, cy + 26);
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Eardrum', drumX, cy + 44);

    // Three ossicles (Malleus -> Incus -> Stapes)
    const middleBoxTop = cy - 42;
    const middleBoxBot = cy + 36;
    ctx.strokeStyle = 'rgba(148, 226, 232, 0.2)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(drumX + 4, middleBoxTop, ovalX - drumX - 8, middleBoxBot - middleBoxTop);

    const leverPush = Math.sin(phase - 0.35) * 9 * (state.eardrumAmp * state.ossicleGain);
    const malleusX = drumX + 16 + leverPush * 0.45;
    const incusX = (drumX + ovalX) / 2 + leverPush * 0.7;
    const stapesX = ovalX - 6 + leverPush;

    ctx.strokeStyle = state.eardrumAmp > 0.2 ? '#fef08a' : '#7b939d';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(drumX + drumDisp * 0.5, cy);
    ctx.lineTo(malleusX, cy - 12);
    ctx.lineTo(incusX, cy - 4);
    ctx.lineTo(stapesX, cy);
    ctx.stroke();

    // Stapes footplate on oval window
    ctx.fillStyle = state.eardrumAmp > 0.2 ? '#fef08a' : '#7b939d';
    ctx.fillRect(stapesX - 2, cy - 12, 4, 24);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillText('Ossicles', (drumX + ovalX) / 2, middleBoxBot + 16);
    ctx.restore();

    // Unrolled Cochlea chamber (fluid + basilar membrane + tonotopic peak)
    const cochW = cochEnd - cochStart;
    const cochH = 88;
    const cochTop = cy - cochH / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(14, 116, 144, 0.24)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(cochStart, cochTop, cochW, cochH, 14);
    ctx.fill();
    ctx.stroke();

    // Oval window highlight
    ctx.strokeStyle = state.cochleaAmp > 0.25 ? '#fde047' : '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cochStart, cy - 18);
    ctx.lineTo(cochStart, cy + 18);
    ctx.stroke();

    // Basilar membrane traveling wave peaking at state.place
    const peakX = cochStart + 16 + state.place * (cochW - 32);
    const waveSamples = 64;
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= waveSamples; i++) {
      const frac = i / waveSamples;
      const x = cochStart + 10 + frac * (cochW - 20);
      const dist = frac - state.place;
      const env = Math.exp(-(dist * dist) / 0.022);
      const amp = (4 + 24 * state.cochleaAmp) * env;
      const y = cy + Math.sin(frac * 18 - phase) * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Stereocilia hair cells along basilar membrane
    const hairCount = 14;
    for (let i = 0; i < hairCount; i++) {
      const frac = (i + 0.5) / hairCount;
      const hx = cochStart + 14 + frac * (cochW - 28);
      const dist = frac - state.place;
      const env = Math.exp(-(dist * dist) / 0.024);
      const bend = Math.sin(frac * 18 - phase) * 8 * state.cochleaAmp * env;
      ctx.strokeStyle = env > 0.45 && state.cochleaAmp > 0.2 ? '#fde047' : 'rgba(186, 230, 253, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx, cy + 16);
      ctx.lineTo(hx + bend, cy + 2);
      ctx.stroke();
    }

    // Peak frequency marker
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(peakX, cochTop + 6);
    ctx.lineTo(peakX, cochTop + cochH - 6);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fef08a';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.freqHz} Hz peak`, peakX, cochTop - 6);

    ctx.fillStyle = '#bae6fd';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Base (8 kHz)', cochStart + 8, cochTop + cochH + 15);
    ctx.textAlign = 'right';
    ctx.fillText('Apex (200 Hz)', cochEnd - 6, cochTop + cochH + 15);
    ctx.restore();

    // Auditory nerve fiber & action potential pulses
    ctx.save();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cochEnd, cy);
    ctx.lineTo(nerveEnd, cy);
    ctx.stroke();

    const pulseCount = Math.max(1, Math.round(state.cochleaAmp * 6));
    if (state.cochleaAmp > 0.06) {
      for (let i = 0; i < pulseCount; i++) {
        const p = (simTime * (0.8 + state.cochleaAmp * 1.4) + i / pulseCount) % 1;
        const px = cochEnd + p * (nerveEnd - cochEnd);
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(px, cy, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bottom readout pill inside canvas
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Cochlear drive: ${Math.round(state.cochleaAmp * 100)}%   ·   Auditory nerve: ${state.nerveRateHz} impulses/s`,
      w / 2,
      boneBotY + 18
    );
    ctx.restore();
  }

  const loop = window.SimKit.loop((dt) => {
    simTime += dt;
    drawScene();
  }, { el: window.SimKit.stage(canvas), maxDt: 0.05 });

  if (!playing) {
    loop.pause();
    playBtn.textContent = 'Play wave';
    playBtn.setAttribute('aria-pressed', 'false');
  }

  syncUI();
  drawScene();
}
