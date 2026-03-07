// Music Lab: WebAudio + WebMIDI
// v2: Oscilloscope · Scale Lock · Theory Overlay · ADSR · Step Sequencer · MIDI key highlight

// ───── Core Audio ─────
let audioCtx = null;
let master   = null;
let analyser = null;

// ───── MIDI ─────
let midiAccess   = null;
let currentInput = null;
const activeVoices = new Map(); // midiNote → voice object

// ───── ADSR state (all times in seconds, sustain 0–1) ─────
const adsr = { a: 0.010, d: 0.120, s: 0.25, r: 0.120 };

// ───── Scale Lock ─────
const SCALES = {
  cmaj:   [0, 2, 4, 5, 7, 9, 11],
  cmin:   [0, 2, 3, 5, 7, 8, 10],
  cpent:  [0, 2, 4, 7, 9],
  cblues: [0, 3, 5, 6, 7, 10],
};
let activeScaleKeys = null; // null = all notes allowed

// ───── Piano constants ─────
const PIANO_START_NOTE = 48; // C3
const PIANO_END_NOTE   = 72; // C5
const BLACK_CLASSES    = new Set([1, 3, 6, 8, 10]);
const NOTE_NAMES       = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ───── Piano state ─────
const pianoState = {
  pointerDown:   false,
  pointerId:     null,
  activeNote:    null,
  keyByNote:     new Map(),
  showNoteNames: false,
};

// ───── Step Sequencer ─────
const SEQ_STEPS  = 16;
const SEQ_DRUMS  = ['kick','snare','hat','clap','tom1','tom2','perc','crash'];
const SEQ_LABELS = ['Kick','Snare','Hi-Hat','Clap','Tom','Low Tom','Perc','Crash'];

let seqGrid    = SEQ_DRUMS.map(() => Array(SEQ_STEPS).fill(false));
let seqStep    = 0;
let seqPlaying = false;
let seqTimerId = null;
let seqBpm     = 120;

// ───── DOM refs ─────
const els = {
  enableAudio:  document.getElementById('enableAudio'),
  enableMidi:   document.getElementById('enableMidi'),
  midiIn:       document.getElementById('midiIn'),
  preset:       document.getElementById('preset'),
  status:       document.getElementById('status'),
  pianoRoll:    document.getElementById('pianoRoll'),
  scaleLock:    document.getElementById('scaleLock'),
  overlayNames: document.getElementById('overlayNames'),
  oscCanvas:    document.getElementById('oscCanvas'),
  adsrA:        document.getElementById('adsrA'),
  adsrD:        document.getElementById('adsrD'),
  adsrS:        document.getElementById('adsrS'),
  adsrR:        document.getElementById('adsrR'),
  adsrAVal:     document.getElementById('adsrAVal'),
  adsrDVal:     document.getElementById('adsrDVal'),
  adsrSVal:     document.getElementById('adsrSVal'),
  adsrRVal:     document.getElementById('adsrRVal'),
  seqPlay:      document.getElementById('seqPlay'),
  seqClear:     document.getElementById('seqClear'),
  seqBpmSlider: document.getElementById('seqBpmSlider'),
  seqBpmVal:    document.getElementById('seqBpmVal'),
  seqGrid:      document.getElementById('seqGrid'),
};

// ───── Status bar ─────
function setStatus(extra) {
  const a   = audioCtx   ? 'on' : 'off';
  const m   = midiAccess ? 'on' : 'off';
  const dev = currentInput ? ` · in: ${currentInput.name || 'MIDI device'}` : '';
  els.status.textContent = `Audio: ${a} · MIDI: ${m}${dev}${extra ? ` · ${extra}` : ''}`;
}

// ───── Audio initialisation ─────
function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  master   = audioCtx.createGain();
  master.gain.value = 0.6;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  master.connect(analyser);
  analyser.connect(audioCtx.destination);

  setStatus();
}

async function enableAudio() {
  ensureAudio();
  if (audioCtx.state !== 'running') await audioCtx.resume();
  els.enableMidi.disabled = false;
  setStatus();
}

// ───── Note utilities ─────
function midiNoteToHz(note) { return 440 * Math.pow(2, (note - 69) / 12); }

function noteName(note) {
  return `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
}

function noteLetterOnly(note) { return NOTE_NAMES[note % 12]; }
function isBlackKey(note)     { return BLACK_CLASSES.has(note % 12); }

function noteAllowed(note) {
  return !activeScaleKeys || activeScaleKeys.includes(note % 12);
}

// ───── Voice management ─────
function clearVoice(note) { if (activeVoices.has(note)) stopVoice(note); }

function startSynth(note, velocity) {
  clearVoice(note);
  const v = Math.max(0.05, velocity);
  const { a: A, d: D, s: S } = adsr;

  const osc    = audioCtx.createOscillator();
  const gain   = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.value = midiNoteToHz(note);

  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(v * 0.5,          now + A);
  gain.gain.linearRampToValueAtTime(v * Math.max(S, 0.01), now + A + D);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start();

  activeVoices.set(note, { osc, gain, oneShot: false });
}

function startPiano(note, velocity) {
  clearVoice(note);
  const v = Math.max(0.05, velocity);
  const A = adsr.a;

  const osc1   = audioCtx.createOscillator();
  const osc2   = audioCtx.createOscillator();
  const gain   = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc1.type = 'triangle';
  osc2.type = 'sine';
  const base = midiNoteToHz(note);
  osc1.frequency.value = base;
  osc2.frequency.value = base * 2;
  osc2.detune.value = -6;

  filter.type = 'lowpass';
  filter.frequency.value = 2200;
  filter.Q.value = 0.4;

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(v * 0.7, now + A);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + A + 1.4);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc1.start();
  osc2.start();

  activeVoices.set(note, { osc1, osc2, gain, oneShot: true });
}

// ───── Drum synthesis ─────
function makeNoiseBuffer(sec) {
  const buf  = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * sec), audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function drumKick() {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now  = audioCtx.currentTime;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
  gain.gain.setValueAtTime(0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.2);
}

function drumSnare() {
  const noise  = audioCtx.createBufferSource();
  noise.buffer = makeNoiseBuffer(0.2);
  const filter = audioCtx.createBiquadFilter();
  filter.type  = 'highpass'; filter.frequency.value = 1200;
  const gain   = audioCtx.createGain();
  const now    = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.6, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  noise.connect(filter); filter.connect(gain); gain.connect(master);
  noise.start(now); noise.stop(now + 0.14);
}

function drumHat() {
  const noise  = audioCtx.createBufferSource();
  noise.buffer = makeNoiseBuffer(0.08);
  const filter = audioCtx.createBiquadFilter();
  filter.type  = 'highpass'; filter.frequency.value = 6000;
  const gain   = audioCtx.createGain();
  const now    = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  noise.connect(filter); filter.connect(gain); gain.connect(master);
  noise.start(now); noise.stop(now + 0.06);
}

function drumClap() {
  const now = audioCtx.currentTime;
  for (const dt of [0, 0.015, 0.03]) {
    const noise  = audioCtx.createBufferSource();
    noise.buffer = makeNoiseBuffer(0.06);
    const filter = audioCtx.createBiquadFilter();
    filter.type  = 'bandpass'; filter.frequency.value = 2000; filter.Q.value = 0.7;
    const gain   = audioCtx.createGain();
    gain.gain.setValueAtTime(0.35, now + dt);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dt + 0.05);
    noise.connect(filter); filter.connect(gain); gain.connect(master);
    noise.start(now + dt); noise.stop(now + dt + 0.06);
  }
}

function drumTom(freq) {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now  = audioCtx.currentTime;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.55, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.24);
}

function drumPerc() {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now  = audioCtx.currentTime;
  osc.type = 'square';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.12);
}

function drumCrash() {
  const noise  = audioCtx.createBufferSource();
  noise.buffer = makeNoiseBuffer(0.6);
  const filter = audioCtx.createBiquadFilter();
  filter.type  = 'highpass'; filter.frequency.value = 3000;
  const gain   = audioCtx.createGain();
  const now    = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  noise.connect(filter); filter.connect(gain); gain.connect(master);
  noise.start(now); noise.stop(now + 0.6);
}

function triggerDrum(name) {
  if (!audioCtx) return;
  if (audioCtx.state !== 'running') audioCtx.resume();
  switch (name) {
    case 'kick':  drumKick();    break;
    case 'snare': drumSnare();   break;
    case 'hat':   drumHat();     break;
    case 'clap':  drumClap();    break;
    case 'tom1':  drumTom(180);  break;
    case 'tom2':  drumTom(120);  break;
    case 'perc':  drumPerc();    break;
    case 'crash': drumCrash();   break;
    default:      drumPerc();    break;
  }
}

// ───── Stop voice (uses ADSR release) ─────
function stopVoice(note) {
  if (!audioCtx) return;
  const voice = activeVoices.get(note);
  if (!voice) return;

  const now = audioCtx.currentTime;
  const R   = adsr.r;

  if (voice.oneShot) {
    if (voice.osc1) voice.osc1.stop(now + 0.15);
    if (voice.osc2) voice.osc2.stop(now + 0.15);
    activeVoices.delete(note);
    return;
  }

  if (voice.gain) {
    const cur = Math.max(voice.gain.gain.value, 0.0001);
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(cur, now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + R);
  }
  if (voice.osc) voice.osc.stop(now + R + 0.02);
  activeVoices.delete(note);
}

// ───── Note on / off (from UI or MIDI) ─────
function noteOnFromUi(note, velocity) {
  if (!noteAllowed(note)) return;
  if (velocity === undefined) velocity = 0.82;
  ensureAudio();
  if (audioCtx.state !== 'running') audioCtx.resume();
  if (els.preset.value === 'piano') startPiano(note, velocity);
  else                              startSynth(note, velocity);
}

function noteOffFromUi(note) { stopVoice(note); }

// ───── Piano key visual state ─────
function setKeyActive(note, active) {
  const key = pianoState.keyByNote.get(note);
  if (key) key.classList.toggle('is-active', Boolean(active));
}

function releasePianoPointer() {
  if (pianoState.activeNote !== null) {
    noteOffFromUi(pianoState.activeNote);
    setKeyActive(pianoState.activeNote, false);
  }
  pianoState.pointerDown = false;
  pianoState.pointerId   = null;
  pianoState.activeNote  = null;
}

function activatePianoNote(note) {
  if (pianoState.activeNote === note) return;
  if (pianoState.activeNote !== null) {
    noteOffFromUi(pianoState.activeNote);
    setKeyActive(pianoState.activeNote, false);
  }
  noteOnFromUi(note);
  setKeyActive(note, true);
  pianoState.activeNote = note;
}

// ───── Piano key builder ─────
function makePianoKey(note, keyClass, leftPct, widthPct) {
  const key = document.createElement('button');
  key.type      = 'button';
  key.className = `music-piano-key ${keyClass}`;
  key.dataset.note = String(note);
  key.setAttribute('aria-label', `Piano key ${noteName(note)}`);
  key.title       = noteName(note);
  key.style.left  = `${leftPct}%`;
  key.style.width = `${widthPct}%`;

  key.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pianoState.pointerDown = true;
    pianoState.pointerId   = e.pointerId;
    activatePianoNote(note);
    if (key.setPointerCapture) key.setPointerCapture(e.pointerId);
  });

  key.addEventListener('keydown', (e) => {
    if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    noteOnFromUi(note);
    setKeyActive(note, true);
  });

  key.addEventListener('keyup', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    noteOffFromUi(note);
    setKeyActive(note, false);
  });

  key.addEventListener('blur', () => {
    noteOffFromUi(note);
    setKeyActive(note, false);
  });

  pianoState.keyByNote.set(note, key);
  return key;
}

// ───── Build piano roll ─────
function buildPianoRoll() {
  const notes = [];
  for (let n = PIANO_START_NOTE; n <= PIANO_END_NOTE; n++) notes.push(n);

  const whiteNotes = notes.filter(n => !isBlackKey(n));
  const whiteWidth = 100 / whiteNotes.length;
  const blackWidth = whiteWidth * 0.62;

  const whiteIdx = new Map();
  whiteNotes.forEach((n, i) => whiteIdx.set(n, i));

  els.pianoRoll.innerHTML = '';

  for (const note of whiteNotes) {
    const i = whiteIdx.get(note);
    els.pianoRoll.appendChild(makePianoKey(note, 'music-piano-key--white', i * whiteWidth, whiteWidth));
  }

  for (const note of notes.filter(n => isBlackKey(n))) {
    const prev = note - 1;
    const i    = whiteIdx.get(prev);
    if (typeof i !== 'number') continue;
    const left = (i + 1) * whiteWidth - blackWidth / 2;
    els.pianoRoll.appendChild(makePianoKey(note, 'music-piano-key--black', left, blackWidth));
  }

  // Apply any already-selected scale/overlay
  applyScaleLock(els.scaleLock ? els.scaleLock.value : '');
  updateKeyOverlays();
}

// ───── Piano roll pointer wiring ─────
function wirePianoRollPointer() {
  els.pianoRoll.addEventListener('pointermove', (e) => {
    if (!pianoState.pointerDown || e.pointerId !== pianoState.pointerId) return;
    const el  = document.elementFromPoint(e.clientX, e.clientY);
    const key = el && el.closest('.music-piano-key');
    if (!key || !els.pianoRoll.contains(key)) return;
    const nextNote = Number(key.dataset.note);
    if (Number.isFinite(nextNote)) activatePianoNote(nextNote);
  });

  const release = (e) => { if (e.pointerId === pianoState.pointerId) releasePianoPointer(); };
  els.pianoRoll.addEventListener('pointerup',     release);
  els.pianoRoll.addEventListener('pointercancel', release);
  els.pianoRoll.addEventListener('pointerleave',  (e) => {
    if (pianoState.pointerDown && e.pointerId === pianoState.pointerId) releasePianoPointer();
  });
  window.addEventListener('blur', releasePianoPointer);
}

// ───── MIDI device management ─────
function populateMidiInputs() {
  els.midiIn.innerHTML = '';
  if (!midiAccess) {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = 'MIDI is not enabled';
    els.midiIn.appendChild(opt);
    return;
  }
  const inputs = Array.from(midiAccess.inputs.values());
  if (!inputs.length) {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = 'No MIDI devices found';
    els.midiIn.appendChild(opt);
    setStatus('no input');
    return;
  }
  for (const input of inputs) {
    const opt = document.createElement('option');
    opt.value = input.id;
    opt.textContent = input.name || `MIDI Input ${input.id}`;
    els.midiIn.appendChild(opt);
  }
  const preferred = currentInput && midiAccess.inputs.get(currentInput.id) ? currentInput.id : inputs[0].id;
  els.midiIn.value = preferred;
  setMidiInput(preferred);
}

function setMidiInput(id) {
  if (!midiAccess) return;
  if (currentInput) currentInput.onmidimessage = null;
  currentInput = midiAccess.inputs.get(id) || null;
  if (currentInput) currentInput.onmidimessage = onMidiMessage;
  setStatus();
}

function onMidiMessage(ev) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const [status, data1, data2] = ev.data;
  const cmd    = status & 0xf0;
  const preset = els.preset.value;

  if (cmd === 0x90) {
    const note = data1, vel = data2 / 127;

    // note-on with vel=0 treated as note-off
    if (data2 === 0) {
      if (preset !== 'drums') { stopVoice(note); setKeyActive(note, false); }
      return;
    }

    if (preset === 'drums') {
      const map = { 36:'kick',38:'snare',42:'hat',39:'clap',45:'tom1',41:'tom2',49:'crash',51:'crash' };
      triggerDrum(map[note] || 'perc');
      return;
    }

    if (!noteAllowed(note)) return;
    if (preset === 'piano') startPiano(note, vel);
    else                    startSynth(note, vel);
    setKeyActive(note, true);   // ← MIDI highlight
    return;
  }

  if (cmd === 0x80) {
    if (preset !== 'drums') { stopVoice(data1); setKeyActive(data1, false); }
  }
}

async function enableMidi() {
  if (!navigator.requestMIDIAccess) { setStatus('WebMIDI unsupported'); return; }
  try {
    midiAccess = await navigator.requestMIDIAccess();
    midiAccess.onstatechange = populateMidiInputs;
    populateMidiInputs();
    setStatus();
  } catch (_err) {
    setStatus('MIDI unavailable');
  }
}

// ───── Drum pads ─────
function triggerPad(name) {
  ensureAudio();
  if (audioCtx.state !== 'running') audioCtx.resume();
  triggerDrum(name);
}

// ───── Scale Lock ─────
function applyScaleLock(scaleKey) {
  activeScaleKeys = SCALES[scaleKey] || null;
  for (const [note, key] of pianoState.keyByNote) {
    const blocked = activeScaleKeys && !activeScaleKeys.includes(note % 12);
    key.classList.toggle('scale-blocked', Boolean(blocked));
  }
}

// ───── Theory Overlay: note name labels ─────
function updateKeyOverlays() {
  const show = pianoState.showNoteNames;
  for (const [note, key] of pianoState.keyByNote) {
    let label = key.querySelector('.key-label');
    if (show) {
      if (!label) {
        label = document.createElement('span');
        label.className = 'key-label';
        key.appendChild(label);
      }
      label.textContent = noteLetterOnly(note);
    } else {
      if (label) label.remove();
    }
  }
}

// ───── ADSR display helpers ─────
function fmtMs(ms) { return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`; }

function readAdsr() {
  adsr.a = Number(els.adsrA.value) / 1000;
  adsr.d = Number(els.adsrD.value) / 1000;
  adsr.s = Number(els.adsrS.value) / 100;
  adsr.r = Number(els.adsrR.value) / 1000;
  els.adsrAVal.textContent = fmtMs(Number(els.adsrA.value));
  els.adsrDVal.textContent = fmtMs(Number(els.adsrD.value));
  els.adsrSVal.textContent = `${els.adsrS.value}%`;
  els.adsrRVal.textContent = fmtMs(Number(els.adsrR.value));
}

// ───── Oscilloscope ─────
(function startOscilloscope() {
  const canvas = els.oscCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function draw() {
    requestAnimationFrame(draw);
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#1c2430';
    ctx.fillRect(0, 0, W, H);

    // Centre guide line
    ctx.strokeStyle = '#2e3d50';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.stroke();

    if (!analyser) return; // audio not started yet — just show flat line

    const bufLen = analyser.frequencyBinCount;
    const data   = new Uint8Array(bufLen);
    analyser.getByteTimeDomainData(data);

    ctx.strokeStyle = '#6eeab6';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    const sliceW = W / bufLen;
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const y = ((data[i] / 128) / 2) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.stroke();
  }

  draw();
})();

// ───── Step Sequencer ─────
function buildSeqGrid() {
  const container = els.seqGrid;
  if (!container) return;
  container.innerHTML = '';

  SEQ_DRUMS.forEach((drum, rowIdx) => {
    const row = document.createElement('div');
    row.className = 'ml-seq-row';

    const label = document.createElement('span');
    label.className   = 'ml-seq-label';
    label.textContent = SEQ_LABELS[rowIdx];
    row.appendChild(label);

    const stepsWrap = document.createElement('div');
    stepsWrap.className = 'ml-seq-steps';

    for (let step = 0; step < SEQ_STEPS; step++) {
      // Visual beat gap every 4 steps
      if (step > 0 && step % 4 === 0) {
        const gap = document.createElement('span');
        gap.className = 'ml-seq-beat-gap';
        stepsWrap.appendChild(gap);
      }

      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'ml-seq-step';
      btn.dataset.row  = String(rowIdx);
      btn.dataset.step = String(step);
      btn.setAttribute('aria-label',   `${SEQ_LABELS[rowIdx]} step ${step + 1}`);
      btn.setAttribute('aria-pressed', 'false');

      btn.addEventListener('click', () => {
        seqGrid[rowIdx][step] = !seqGrid[rowIdx][step];
        btn.classList.toggle('on', seqGrid[rowIdx][step]);
        btn.setAttribute('aria-pressed', seqGrid[rowIdx][step] ? 'true' : 'false');
      });

      stepsWrap.appendChild(btn);
    }

    row.appendChild(stepsWrap);
    container.appendChild(row);
  });
}

function seqGetBtn(rowIdx, step) {
  if (!els.seqGrid) return null;
  return els.seqGrid.querySelector(`.ml-seq-step[data-row="${rowIdx}"][data-step="${step}"]`);
}

function seqSetCurrent(step, active) {
  for (let r = 0; r < SEQ_DRUMS.length; r++) {
    const btn = seqGetBtn(r, step);
    if (btn) btn.classList.toggle('seq-current', active);
  }
}

function seqTick() {
  const prev = (seqStep + SEQ_STEPS - 1) % SEQ_STEPS;
  seqSetCurrent(prev, false);
  seqSetCurrent(seqStep, true);

  ensureAudio();
  for (let r = 0; r < SEQ_DRUMS.length; r++) {
    if (seqGrid[r][seqStep]) triggerDrum(SEQ_DRUMS[r]);
  }

  seqStep = (seqStep + 1) % SEQ_STEPS;
}

function seqIntervalMs() { return Math.round(60000 / seqBpm / 4); }

function seqStart() {
  if (seqPlaying) return;
  seqPlaying = true;
  seqStep    = 0;
  els.seqPlay.textContent = '⏹ Stop';
  els.seqPlay.classList.add('btn-active');
  seqTimerId = setInterval(seqTick, seqIntervalMs());
}

function seqStop() {
  seqPlaying = false;
  if (seqTimerId !== null) { clearInterval(seqTimerId); seqTimerId = null; }
  const prev = (seqStep + SEQ_STEPS - 1) % SEQ_STEPS;
  seqSetCurrent(prev, false);
  seqStep = 0;
  els.seqPlay.textContent = '▶ Play';
  els.seqPlay.classList.remove('btn-active');
}

function seqClearAll() {
  for (let r = 0; r < SEQ_DRUMS.length; r++) seqGrid[r].fill(false);
  for (const btn of els.seqGrid.querySelectorAll('.ml-seq-step')) {
    btn.classList.remove('on');
    btn.setAttribute('aria-pressed', 'false');
  }
}

// ───── Event listeners ─────
els.enableAudio.addEventListener('click', enableAudio);
els.enableMidi.addEventListener('click',  enableMidi);
els.midiIn.addEventListener('change',    (e) => setMidiInput(e.target.value));
els.preset.addEventListener('change',    releasePianoPointer);

els.scaleLock.addEventListener('change', (e) => applyScaleLock(e.target.value));

els.overlayNames.addEventListener('change', (e) => {
  pianoState.showNoteNames = e.target.checked;
  updateKeyOverlays();
});

els.adsrA.addEventListener('input', readAdsr);
els.adsrD.addEventListener('input', readAdsr);
els.adsrS.addEventListener('input', readAdsr);
els.adsrR.addEventListener('input', readAdsr);

els.seqPlay.addEventListener('click', () => { seqPlaying ? seqStop() : seqStart(); });
els.seqClear.addEventListener('click', seqClearAll);

els.seqBpmSlider.addEventListener('input', (e) => {
  seqBpm = Number(e.target.value);
  els.seqBpmVal.textContent = seqBpm;
  if (seqPlaying) {
    // Restart interval at new BPM without resetting position
    clearInterval(seqTimerId);
    seqTimerId = setInterval(seqTick, seqIntervalMs());
  }
});

for (const pad of document.querySelectorAll('[data-drum]')) {
  pad.addEventListener('mousedown', () => triggerPad(pad.dataset.drum));
  pad.addEventListener('touchstart', (e) => {
    e.preventDefault();
    triggerPad(pad.dataset.drum);
  }, { passive: false });
  pad.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    triggerPad(pad.dataset.drum);
  });
}

// ───── Initialise ─────
buildPianoRoll();
wirePianoRollPointer();
buildSeqGrid();
readAdsr();   // set initial display values from slider defaults
setStatus();
