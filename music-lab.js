// Music Lab: WebAudio + WebMIDI
// v2: Oscilloscope · Scale Lock · Theory Overlay · ADSR · Step Sequencer · MIDI key highlight

// ───── Core Audio ─────
let audioCtx = null;
let master   = null;
let analyser = null;

// ───── Modular Patchbay ─────
const modular = {
  wave: 'sine',
  freq: 220,
  vca: 0.6,
  osc: null,
  vcaNode: null,
  output: null,
  isPlaying: false,
  connections: new Map(),
  pendingOutput: null,
};

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
const CHROMATIC_TO_STAFF = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

const THEORY_NOTES = [
  { midi: 60, label: 'C', accidental: '', solfege: 'Do', interval: 'P1', semitones: 0, family: 'perfect' },
  { midi: 61, label: 'C# / Db', accidental: '♯', solfege: 'Di', interval: 'm2', semitones: 1, family: 'minor' },
  { midi: 62, label: 'D', accidental: '', solfege: 'Re', interval: 'M2', semitones: 2, family: 'major' },
  { midi: 63, label: 'D# / Eb', accidental: '♯', solfege: 'Ri', interval: 'm3', semitones: 3, family: 'minor' },
  { midi: 64, label: 'E', accidental: '', solfege: 'Mi', interval: 'M3', semitones: 4, family: 'major' },
  { midi: 65, label: 'F', accidental: '', solfege: 'Fa', interval: 'P4', semitones: 5, family: 'perfect' },
  { midi: 66, label: 'F# / Gb', accidental: '♯', solfege: 'Fi', interval: 'TT', semitones: 6, family: 'tritone' },
  { midi: 67, label: 'G', accidental: '', solfege: 'Sol', interval: 'P5', semitones: 7, family: 'perfect' },
  { midi: 68, label: 'G# / Ab', accidental: '♯', solfege: 'Si', interval: 'm6', semitones: 8, family: 'minor' },
  { midi: 69, label: 'A', accidental: '', solfege: 'La', interval: 'M6', semitones: 9, family: 'major' },
  { midi: 70, label: 'A# / Bb', accidental: '♯', solfege: 'Li', interval: 'm7', semitones: 10, family: 'minor' },
  { midi: 71, label: 'B', accidental: '', solfege: 'Ti', interval: 'M7', semitones: 11, family: 'major' },
  { midi: 72, label: 'C', accidental: '', solfege: 'Do', interval: 'P8', semitones: 12, family: 'perfect' },
];

const CLEF_CONFIG = {
  treble:  { symbol: '𝄞', centerMidi: 71 },
  bass:    { symbol: '𝄢', centerMidi: 50 },
  alto:    { symbol: '𝄡', centerMidi: 60 },
  soprano: { symbol: '𝄡', centerMidi: 69 },
  grand:   { isGrand: true }
};

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

// ── Look-ahead Scheduler ──
let nextStepTime         = 0.0;
const LOOKAHEAD_MS       = 25.0;
const SCHEDULE_AHEAD_SEC = 0.1;
const seqVisualTimers    = [];

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
  spectrumCanvas: document.getElementById('spectrumCanvas'),
  modularPlay:  document.getElementById('modularPlay'),
  modularStop:  document.getElementById('modularStop'),
  modularFreq:  document.getElementById('modularFreq'),
  modularFreqVal: document.getElementById('modularFreqVal'),
  modularVca:   document.getElementById('modularVca'),
  modularVcaVal: document.getElementById('modularVcaVal'),
  modularStatus: document.getElementById('modularStatus'),
  modularRack:  document.getElementById('modularRack'),
  patchSvg:     document.getElementById('patchSvg'),
  waveButtons:  document.querySelectorAll('.ml-waveform-btn'),
  patchJacks:   document.querySelectorAll('.ml-jack'),
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

  // Master gain
  master = audioCtx.createGain();
  master.gain.value = 0.6;

  // Master limiter — prevents clipping when many notes play at once
  const limiter = audioCtx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-12, audioCtx.currentTime);
  limiter.knee.setValueAtTime(40,  audioCtx.currentTime);
  limiter.ratio.setValueAtTime(12, audioCtx.currentTime);
  limiter.attack.setValueAtTime(0.001, audioCtx.currentTime);
  limiter.release.setValueAtTime(0.25, audioCtx.currentTime);

  // Parallel delay for spatial depth
  const delay         = audioCtx.createDelay(1.0);
  delay.delayTime.value = 0.28;
  const delayFeedback = audioCtx.createGain();
  delayFeedback.gain.value = 0.18;
  const delayWet      = audioCtx.createGain();
  delayWet.gain.value = 0.22;
  master.connect(delay);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(delayWet);
  delayWet.connect(limiter);

  // Analyser
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.82;

  // Signal chain: master → limiter (direct + wet delay) → analyser → speakers
  master.connect(limiter);
  limiter.connect(analyser);
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

function getNoteLayout(midi, centerMidi) {
  const diff = midi - centerMidi;
  const octaves = Math.floor(diff / 12);
  const chroma = ((diff % 12) + 12) % 12;
  const steps = (octaves * 7) + CHROMATIC_TO_STAFF[chroma];
  const yBase = 72;
  const stepPx = 5;
  return {
    steps,
    y: yBase - (steps * stepPx)
  };
}

function buildLedgerLines(y, steps) {
  const lines = [];
  const bottomLineY = 92;
  const topLineY = 52;
  const ledgerXs = 'x1="18" x2="46"';

  if (steps <= -6) {
    for (let ledgerY = bottomLineY + 10; ledgerY <= y + 0.1; ledgerY += 10) {
      lines.push(`<line class="ledger-line" ${ledgerXs} y1="${ledgerY}" y2="${ledgerY}" />`);
    }
  }

  if (steps >= 6) {
    for (let ledgerY = topLineY - 10; ledgerY >= y - 0.1; ledgerY -= 10) {
      lines.push(`<line class="ledger-line" ${ledgerXs} y1="${ledgerY}" y2="${ledgerY}" />`);
    }
  }

  return lines.join('');
}

function noteSvgMarkup(note, centerMidi) {
  const layout = getNoteLayout(note.midi, centerMidi);
  const stemDown = layout.steps >= 4;
  const headCx = note.accidental ? 34 : 30;
  const stemX = stemDown ? headCx - 7 : headCx + 7;
  const stemY2 = stemDown ? layout.y + 35 : layout.y - 35;
  const accidental = note.accidental
    ? `<text class="note-accidental" x="6" y="${layout.y + 6}" aria-hidden="true">${note.accidental}</text>`
    : '';

  return `
    <svg class="music-staff-svg" viewBox="0 0 72 122" aria-hidden="true" focusable="false">
      ${buildLedgerLines(layout.y, layout.steps)}
      ${accidental}
      <ellipse class="note-head" cx="${headCx}" cy="${layout.y}" rx="7" ry="5"></ellipse>
      <line class="note-stem" x1="${stemX}" y1="${layout.y}" x2="${stemX}" y2="${stemY2}"></line>
    </svg>
  `;
}

function noteButtonMarkup(note, centerMidi, leftPx) {
  return `
    <button
      class="note-container music-interval-card ${note.family}"
      type="button"
      style="left:${leftPx}px"
      data-midi="${note.midi}"
      aria-label="${note.label}, ${note.solfege}, ${note.interval}, ${note.semitones} semitones"
      title="${note.label} · ${note.interval}"
    >
      ${noteSvgMarkup(note, centerMidi)}
      <span class="note-labels">
        <span class="music-interval-note">${note.label}</span>
        <span class="music-interval-solfege">${note.solfege}</span>
        <span class="music-interval-name">${note.interval}</span>
        <span class="music-interval-semitones">${note.semitones} semitone${note.semitones === 1 ? '' : 's'}</span>
      </span>
    </button>
  `;
}

function renderStaffBlock(clefType, notes) {
  const config = CLEF_CONFIG[clefType];
  const noteMarkup = notes.map((note, index) => noteButtonMarkup(note, config.centerMidi, 80 + (index * 64))).join('');
  return `
    <div class="staff-block" data-clef="${clefType}">
      <div class="clef-symbol" aria-hidden="true">${config.symbol}</div>
      ${noteMarkup}
    </div>
  `;
}

function renderTheoryStaff(clefKey) {
  const staffSystem = document.getElementById('staffSystem');
  if (!staffSystem) return;

  if (clefKey === 'grand') {
    staffSystem.classList.add('grand-staff');
    const bassNotes = THEORY_NOTES.filter((note) => note.midi <= 60);
    const trebleNotes = THEORY_NOTES.filter((note) => note.midi >= 60);
    staffSystem.innerHTML = [
      renderStaffBlock('treble', trebleNotes),
      renderStaffBlock('bass', bassNotes)
    ].join('');
  } else {
    staffSystem.classList.remove('grand-staff');
    staffSystem.innerHTML = renderStaffBlock(clefKey, THEORY_NOTES);
  }

  staffSystem.querySelectorAll('.note-container').forEach((button) => {
    const midi = Number(button.dataset.midi);
    const release = () => noteOffFromUi(midi);

    button.addEventListener('click', () => {
      noteOnFromUi(midi, 0.7);
      button.classList.add('is-active');
      window.setTimeout(() => {
        release();
        button.classList.remove('is-active');
      }, 420);
    });

    button.addEventListener('mouseleave', () => button.classList.remove('is-active'));
    button.addEventListener('blur', () => button.classList.remove('is-active'));
  });
}

function initTheoryMap() {
  const selector = document.getElementById('clefSelector');
  if (!selector) return;
  renderTheoryStaff(selector.value);
  selector.addEventListener('change', () => renderTheoryStaff(selector.value));
}

// ───── Voice management ─────
function clearVoice(note) { if (activeVoices.has(note)) stopVoice(note); }

function applyVoiceEnvelope(gainNode, peak, now) {
  const { a: A, d: D, s: S } = adsr;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(peak, now + A);
  gainNode.gain.linearRampToValueAtTime(Math.max(peak * Math.max(S, 0.12), 0.0001), now + A + D);
}

function startSynth(note, velocity) {
  clearVoice(note);
  const v = Math.max(0.05, velocity);

  const osc    = audioCtx.createOscillator();
  const gain   = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.value = midiNoteToHz(note);

  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;

  const now = audioCtx.currentTime;
  applyVoiceEnvelope(gain, v * 0.5, now);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start();

  activeVoices.set(note, { gain, sources: [osc] });
}

function startPiano(note, velocity) {
  clearVoice(note);
  const v = Math.max(0.05, velocity);

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
  applyVoiceEnvelope(gain, v * 0.72, now);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc1.start();
  osc2.start();

  activeVoices.set(note, { gain, sources: [osc1, osc2] });
}

// ───── Drum synthesis ─────
function makeNoiseBuffer(sec) {
  const buf  = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * sec), audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function drumKick(time) {
  const now  = time;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
  gain.gain.setValueAtTime(0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.2);
}

function drumSnare(time) {
  const now    = time;
  const noise  = audioCtx.createBufferSource();
  noise.buffer = makeNoiseBuffer(0.2);
  const filter = audioCtx.createBiquadFilter();
  filter.type  = 'highpass'; filter.frequency.value = 1200;
  const gain   = audioCtx.createGain();
  gain.gain.setValueAtTime(0.6, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  noise.connect(filter); filter.connect(gain); gain.connect(master);
  noise.start(now); noise.stop(now + 0.14);
}

function drumHat(time) {
  const now    = time;
  const noise  = audioCtx.createBufferSource();
  noise.buffer = makeNoiseBuffer(0.08);
  const filter = audioCtx.createBiquadFilter();
  filter.type  = 'highpass'; filter.frequency.value = 6000;
  const gain   = audioCtx.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  noise.connect(filter); filter.connect(gain); gain.connect(master);
  noise.start(now); noise.stop(now + 0.06);
}

function drumClap(time) {
  const now = time;
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

function drumTom(freq, time) {
  const now  = time;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.55, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.24);
}

function drumPerc(time) {
  const now  = time;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  osc.connect(gain); gain.connect(master);
  osc.start(now); osc.stop(now + 0.12);
}

function drumCrash(time) {
  const now    = time;
  const noise  = audioCtx.createBufferSource();
  noise.buffer = makeNoiseBuffer(0.6);
  const filter = audioCtx.createBiquadFilter();
  filter.type  = 'highpass'; filter.frequency.value = 3000;
  const gain   = audioCtx.createGain();
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  noise.connect(filter); filter.connect(gain); gain.connect(master);
  noise.start(now); noise.stop(now + 0.6);
}

function triggerDrum(name, time) {
  if (!audioCtx) return;
  if (audioCtx.state !== 'running') audioCtx.resume();
  const t = (time !== undefined) ? time : audioCtx.currentTime;
  switch (name) {
    case 'kick':  drumKick(t);       break;
    case 'snare': drumSnare(t);      break;
    case 'hat':   drumHat(t);        break;
    case 'clap':  drumClap(t);       break;
    case 'tom1':  drumTom(180, t);   break;
    case 'tom2':  drumTom(120, t);   break;
    case 'perc':  drumPerc(t);       break;
    case 'crash': drumCrash(t);      break;
    default:      drumPerc(t);       break;
  }
}

// ───── Stop voice (uses ADSR release) ─────
function stopVoice(note) {
  if (!audioCtx) return;
  const voice = activeVoices.get(note);
  if (!voice) return;

  const now = audioCtx.currentTime;
  const R   = adsr.r;

  if (voice.gain) {
    voice.gain.gain.cancelScheduledValues(now);
    const cur = Math.max(voice.gain.gain.value, 0.0001);
    voice.gain.gain.setValueAtTime(cur, now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + R);
  }
  const stopAt = now + R + 0.05;
  (voice.sources || []).forEach((source) => {
    try { source.stop(stopAt); } catch (_err) {}
  });
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

// ───── Modular Patchbay ─────
function ensureModularNodes() {
  if (!audioCtx) return;
  if (!modular.vcaNode) {
    modular.vcaNode = audioCtx.createGain();
    modular.vcaNode.gain.value = modular.vca;
  }
  if (!modular.output) {
    modular.output = audioCtx.createGain();
    modular.output.gain.value = 0.8;
    modular.output.connect(master);
  }
}

function createModularOsc() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  osc.type = modular.wave;
  osc.frequency.value = modular.freq;
  modular.osc = osc;
}

function setWaveform(wave) {
  modular.wave = wave;
  if (modular.osc) modular.osc.type = wave;
  if (els.waveButtons.length) {
    els.waveButtons.forEach((btn) => {
      const active = btn.dataset.waveform === wave;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
}

function setModularFreq(value) {
  modular.freq = Number(value);
  if (els.modularFreqVal) els.modularFreqVal.textContent = `${modular.freq} Hz`;
  if (modular.osc && audioCtx) {
    modular.osc.frequency.setValueAtTime(modular.freq, audioCtx.currentTime);
  }
}

function setModularVca(value) {
  modular.vca = Number(value) / 100;
  if (els.modularVcaVal) els.modularVcaVal.textContent = `${value}%`;
  if (modular.vcaNode && audioCtx) {
    modular.vcaNode.gain.setValueAtTime(modular.vca, audioCtx.currentTime);
  }
}

function patchSummary() {
  const vcaIn = modular.connections.get('vca-in');
  const outIn = modular.connections.get('out-in');

  if (!vcaIn && !outIn) return 'no cables';
  if (vcaIn === 'osc-out' && outIn === 'vca-out') return 'Osc → VCA → Output';
  if (outIn === 'osc-out') return 'Osc → Output';
  if (vcaIn === 'osc-out' && !outIn) return 'Osc → VCA (not routed)';
  if (!vcaIn && outIn === 'vca-out') return 'VCA → Output (no source)';
  if (vcaIn === 'osc-out' && outIn === 'osc-out') return 'Osc → VCA + Output';
  return 'Custom patch';
}

function updateModularStatus() {
  if (!els.modularStatus) return;
  const patchText = patchSummary();
  const outputText = modular.isPlaying ? 'Output: playing' : 'Output: silent';
  els.modularStatus.textContent = `Patch: ${patchText} · ${outputText}`;
}

function updateModularButtons() {
  if (!els.modularPlay || !els.modularStop) return;
  els.modularPlay.classList.toggle('btn-active', modular.isPlaying);
  els.modularStop.disabled = !modular.isPlaying;
}

function applyPatch() {
  updateModularStatus();
  if (!audioCtx) return;
  ensureModularNodes();

  if (modular.osc) {
    try { modular.osc.disconnect(); } catch (_err) {}
  }
  if (modular.vcaNode) {
    try { modular.vcaNode.disconnect(); } catch (_err) {}
  }

  const oscToVca = modular.connections.get('vca-in') === 'osc-out';
  const outSource = modular.connections.get('out-in');

  if (oscToVca && modular.osc) modular.osc.connect(modular.vcaNode);
  if (outSource === 'osc-out' && modular.osc) modular.osc.connect(modular.output);
  if (outSource === 'vca-out') modular.vcaNode.connect(modular.output);
}

function jackCenter(el, rackRect) {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - rackRect.left,
    y: rect.top + rect.height / 2 - rackRect.top,
  };
}

function drawPatchCables() {
  if (!els.patchSvg || !els.modularRack) return;
  const svg = els.patchSvg;
  const rackRect = els.modularRack.getBoundingClientRect();
  const width = rackRect.width;
  const height = rackRect.height;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.innerHTML = '';

  for (const [inputId, outputId] of modular.connections.entries()) {
    const inputEl = els.modularRack.querySelector(`[data-jack="${inputId}"]`);
    const outputEl = els.modularRack.querySelector(`[data-jack="${outputId}"]`);
    if (!inputEl || !outputEl) continue;

    const start = jackCenter(outputEl, rackRect);
    const end = jackCenter(inputEl, rackRect);
    const horizontal = end.x - start.x;
    const vertical   = end.y - start.y;
    const totalDist  = Math.sqrt(horizontal * horizontal + vertical * vertical);
    // Gravity sag grows with cable length — shorter cables stay taut
    const sag = Math.min(90, Math.max(35, totalDist * 0.28));
    const c1x = start.x;
    const c1y = start.y + sag;
    const c2x = end.x;
    const c2y = end.y + sag;
    const d = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
}

function updateJackStates() {
  if (!els.patchJacks.length) return;
  const outputsInUse = new Set(modular.connections.values());
  els.patchJacks.forEach((jack) => {
    const id = jack.dataset.jack;
    const isInput = jack.dataset.type === 'input';
    const connected = isInput ? modular.connections.has(id) : outputsInUse.has(id);
    jack.classList.toggle('is-connected', connected);
    jack.classList.toggle('is-source', modular.pendingOutput === id);
    jack.setAttribute('aria-pressed', (isInput ? connected : modular.pendingOutput === id) ? 'true' : 'false');
  });
}

function handleJackClick(jack) {
  const type = jack.dataset.type;
  const id = jack.dataset.jack;
  if (type === 'output') {
    modular.pendingOutput = modular.pendingOutput === id ? null : id;
    updateJackStates();
    return;
  }

  if (modular.pendingOutput) {
    modular.connections.set(id, modular.pendingOutput);
    modular.pendingOutput = null;
  } else if (modular.connections.has(id)) {
    modular.connections.delete(id);
  }

  updateJackStates();
  drawPatchCables();
  applyPatch();
}

async function startModularTone() {
  await enableAudio();
  if (!audioCtx) return;
  if (modular.isPlaying) return;
  ensureModularNodes();
  createModularOsc();
  applyPatch();
  modular.osc.start();
  modular.isPlaying = true;
  updateModularButtons();
  updateModularStatus();
}

function stopModularTone() {
  if (!modular.isPlaying) return;
  modular.isPlaying = false;
  if (modular.osc) {
    try { modular.osc.stop(); } catch (_err) {}
    try { modular.osc.disconnect(); } catch (_err) {}
  }
  modular.osc = null;
  updateModularButtons();
  updateModularStatus();
}

function initModularPatchbay() {
  if (!els.modularStatus) return;
  modular.connections.set('vca-in', 'osc-out');
  modular.connections.set('out-in', 'vca-out');

  setWaveform(modular.wave);
  if (els.modularFreq) setModularFreq(els.modularFreq.value);
  if (els.modularVca) setModularVca(els.modularVca.value);

  updateJackStates();
  drawPatchCables();
  updateModularButtons();
  updateModularStatus();
}

// ───── Oscilloscope + harmonic monitor ─────
(function startSignalMonitors() {
  const scopeCanvas = els.oscCanvas;
  const spectrumCanvas = els.spectrumCanvas;
  if (!scopeCanvas && !spectrumCanvas) return;

  const scopeCtx = scopeCanvas ? scopeCanvas.getContext('2d') : null;
  const spectrumCtx = spectrumCanvas ? spectrumCanvas.getContext('2d') : null;
  const phosphor = '#39FF14';

  function paintMonitorShell(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(57, 255, 20, 0.04)';
    for (let x = 0; x < width; x += 44) ctx.fillRect(x, 0, 1, height);
    for (let y = 0; y < height; y += 28) ctx.fillRect(0, y, width, 1);
  }

  function drawScope(data) {
    if (!scopeCtx || !scopeCanvas) return;
    const width = scopeCanvas.width;
    const height = scopeCanvas.height;
    paintMonitorShell(scopeCtx, width, height);

    scopeCtx.strokeStyle = 'rgba(57, 255, 20, 0.18)';
    scopeCtx.lineWidth = 1;
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, height / 2);
    scopeCtx.lineTo(width, height / 2);
    scopeCtx.stroke();

    if (!data) return;

    scopeCtx.strokeStyle = phosphor;
    scopeCtx.shadowColor = 'rgba(57, 255, 20, 0.55)';
    scopeCtx.shadowBlur = 8;
    scopeCtx.lineWidth = 2.1;
    scopeCtx.beginPath();
    const slice = width / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i += 1) {
      const y = (data[i] / 255) * height;
      if (i === 0) scopeCtx.moveTo(x, y);
      else scopeCtx.lineTo(x, y);
      x += slice;
    }
    scopeCtx.stroke();
    scopeCtx.shadowBlur = 0;
  }

  function drawSpectrum(data) {
    if (!spectrumCtx || !spectrumCanvas) return;
    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;
    paintMonitorShell(spectrumCtx, width, height);

    spectrumCtx.fillStyle = 'rgba(57, 255, 20, 0.08)';
    spectrumCtx.fillRect(0, height - 28, width, 28);

    if (!data) return;

    const bins = Math.min(144, data.length);
    const barWidth = width / bins;
    spectrumCtx.shadowColor = 'rgba(57, 255, 20, 0.6)';
    spectrumCtx.shadowBlur = 9;
    for (let i = 1; i < bins; i += 1) {
      const magnitude = data[i] / 255;
      const logIndex = Math.log2(i + 1) / Math.log2(bins + 1);
      const x = logIndex * (width - barWidth);
      const barHeight = Math.max(2, magnitude * (height - 18));
      spectrumCtx.fillStyle = `rgba(57, 255, 20, ${0.2 + magnitude * 0.75})`;
      spectrumCtx.fillRect(x, height - barHeight - 6, Math.max(2, barWidth * 1.8), barHeight);
    }
    spectrumCtx.shadowBlur = 0;
  }

  function draw() {
    requestAnimationFrame(draw);

    if (!analyser) {
      drawScope(null);
      drawSpectrum(null);
      return;
    }

    const timeData = new Uint8Array(analyser.fftSize);
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    drawScope(timeData);
    drawSpectrum(freqData);
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

// ── Look-ahead scheduler (replaces jittery setInterval) ──
function scheduleStep(step, time) {
  // Sync visual indicator exactly when the beat plays (not ahead of it)
  const msUntilBeat = Math.max(0, (time - audioCtx.currentTime) * 1000);
  const timerId = setTimeout(() => {
    const prev = (step + SEQ_STEPS - 1) % SEQ_STEPS;
    seqSetCurrent(prev, false);
    seqSetCurrent(step, true);
  }, msUntilBeat);
  seqVisualTimers.push(timerId);

  // Schedule audio exactly on the audio clock
  for (let r = 0; r < SEQ_DRUMS.length; r++) {
    if (seqGrid[r][step]) triggerDrum(SEQ_DRUMS[r], time);
  }
}

function advanceStep() {
  const secondsPer16th = 60.0 / seqBpm / 4;
  nextStepTime += secondsPer16th;
  seqStep = (seqStep + 1) % SEQ_STEPS;
}

function scheduler() {
  while (nextStepTime < audioCtx.currentTime + SCHEDULE_AHEAD_SEC) {
    scheduleStep(seqStep, nextStepTime);
    advanceStep();
  }
  if (seqPlaying) {
    seqTimerId = setTimeout(scheduler, LOOKAHEAD_MS);
  }
}

function seqStart() {
  if (seqPlaying) return;
  ensureAudio();
  seqPlaying    = true;
  seqStep       = 0;
  nextStepTime  = audioCtx.currentTime;
  els.seqPlay.textContent = '⏹ Stop';
  els.seqPlay.classList.add('btn-active');
  scheduler();
}

function seqStop() {
  seqPlaying = false;
  if (seqTimerId !== null) { clearTimeout(seqTimerId); seqTimerId = null; }
  // Cancel any pending visual updates
  seqVisualTimers.forEach(id => clearTimeout(id));
  seqVisualTimers.length = 0;
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

if (els.modularPlay) els.modularPlay.addEventListener('click', startModularTone);
if (els.modularStop) els.modularStop.addEventListener('click', stopModularTone);
if (els.modularFreq) els.modularFreq.addEventListener('input', (e) => setModularFreq(e.target.value));
if (els.modularVca) els.modularVca.addEventListener('input', (e) => setModularVca(e.target.value));

if (els.waveButtons.length) {
  els.waveButtons.forEach((btn) => {
    btn.addEventListener('click', () => setWaveform(btn.dataset.waveform));
  });
}

if (els.patchJacks.length) {
  els.patchJacks.forEach((jack) => {
    jack.addEventListener('click', () => handleJackClick(jack));
  });
}

window.addEventListener('resize', drawPatchCables);

els.seqPlay.addEventListener('click', () => { seqPlaying ? seqStop() : seqStart(); });
els.seqClear.addEventListener('click', seqClearAll);

els.seqBpmSlider.addEventListener('input', (e) => {
  seqBpm = Number(e.target.value);
  els.seqBpmVal.textContent = seqBpm;
  // Look-ahead scheduler picks up new BPM automatically on next advanceStep
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

// ───── Circle of Fifths ─────
const FIFTHS_DATA = [
  { major: 'C',  minor: 'Am',  root: 0  },
  { major: 'G',  minor: 'Em',  root: 7  },
  { major: 'D',  minor: 'Bm',  root: 2  },
  { major: 'A',  minor: 'F#m', root: 9  },
  { major: 'E',  minor: 'C#m', root: 4  },
  { major: 'B',  minor: 'G#m', root: 11 },
  { major: 'F#', minor: 'D#m', root: 6  },
  { major: 'Db', minor: 'Bbm', root: 1  },
  { major: 'Ab', minor: 'Fm',  root: 8  },
  { major: 'Eb', minor: 'Cm',  root: 3  },
  { major: 'Bb', minor: 'Gm',  root: 10 },
  { major: 'F',  minor: 'Dm',  root: 5  },
];

// Per-segment hue (evenly spaced around the hue wheel for a rainbow circle)
function fifthsHue(i) { return Math.round((i / 12) * 360); }

function initCircleOfFifths() {
  const svg = document.getElementById('fifthsSvg');
  if (!svg) return;

  const cx = 200, cy = 200;
  const outerR = 185, midR = 125, innerR = 68;
  const GAP    = 0.018; // radians gap between segments

  function arc(r1, r2, aStart, aEnd) {
    const x1 = cx + r1 * Math.cos(aStart + GAP), y1 = cy + r1 * Math.sin(aStart + GAP);
    const x2 = cx + r1 * Math.cos(aEnd   - GAP), y2 = cy + r1 * Math.sin(aEnd   - GAP);
    const x3 = cx + r2 * Math.cos(aEnd   - GAP), y3 = cy + r2 * Math.sin(aEnd   - GAP);
    const x4 = cx + r2 * Math.cos(aStart + GAP), y4 = cy + r2 * Math.sin(aStart + GAP);
    return `M ${x1} ${y1} A ${r1} ${r1} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${r2} ${r2} 0 0 0 ${x4} ${y4} Z`;
  }

  function makeSvg(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

  // Add radial grid lines for visual depth
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    const line = makeSvg('line');
    line.setAttribute('x1', cx + innerR * Math.cos(a));
    line.setAttribute('y1', cy + innerR * Math.sin(a));
    line.setAttribute('x2', cx + outerR * Math.cos(a));
    line.setAttribute('y2', cy + outerR * Math.sin(a));
    line.setAttribute('stroke', 'rgba(255,255,255,0.05)');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  }

  FIFTHS_DATA.forEach((item, i) => {
    const aStart = (i * 30 - 105) * Math.PI / 180;
    const aEnd   = ((i + 1) * 30 - 105) * Math.PI / 180;
    const aMid   = (aStart + aEnd) / 2;
    const hue    = fifthsHue(i);

    function buildSegment(r1, r2, label, isMinor) {
      const g    = makeSvg('g');
      g.setAttribute('class', 'fifths-group');
      g.setAttribute('data-root', item.root);
      g.setAttribute('data-minor', isMinor ? 'true' : 'false');

      const path = makeSvg('path');
      path.setAttribute('d', arc(r1, r2, aStart, aEnd));
      path.setAttribute('class', 'fifths-segment');
      // Subtle per-key tint
      path.style.fill = `hsla(${hue}, 60%, 14%, 0.92)`;

      const textR = r2 + (r1 - r2) / 2;
      const text  = makeSvg('text');
      text.setAttribute('x', cx + textR * Math.cos(aMid));
      text.setAttribute('y', cy + textR * Math.sin(aMid) + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'fifths-text');
      text.setAttribute('font-size', isMinor ? '11' : '13');
      text.textContent = label;

      g.appendChild(path);
      g.appendChild(text);

      g.addEventListener('mousedown', (e) => {
        e.preventDefault();
        playChordFromCircle(item, isMinor, g);
      });

      svg.appendChild(g);
    }

    buildSegment(outerR, midR, item.major, false);
    buildSegment(midR,   innerR, item.minor, true);
  });

  // Center label
  const centerCircle = makeSvg('circle');
  centerCircle.setAttribute('cx', cx);
  centerCircle.setAttribute('cy', cy);
  centerCircle.setAttribute('r', innerR - 2);
  centerCircle.setAttribute('fill', '#0d1117');
  centerCircle.setAttribute('stroke', 'rgba(255,255,255,0.06)');
  svg.appendChild(centerCircle);

  const centerText = makeSvg('text');
  centerText.setAttribute('x', cx);
  centerText.setAttribute('y', cy + 5);
  centerText.setAttribute('text-anchor', 'middle');
  centerText.setAttribute('class', 'fifths-center-label');
  centerText.setAttribute('font-size', '11');
  centerText.textContent = '5ths';
  svg.appendChild(centerText);
}

let fifthsReleaseTimers = [];

function playChordFromCircle(item, isMinor, groupEl) {
  ensureAudio();
  if (audioCtx.state !== 'running') audioCtx.resume();

  // Clear active state and pending release timers
  document.querySelectorAll('.fifths-group').forEach(g => g.classList.remove('active'));
  fifthsReleaseTimers.forEach(id => clearTimeout(id));
  fifthsReleaseTimers = [];

  // Also clear any piano highlights from previous chord
  for (const [note, key] of pianoState.keyByNote) {
    key.classList.remove('is-active');
  }

  groupEl.classList.add('active');

  // Chord intervals: major 0-4-7, minor 0-3-7
  const intervals = isMinor ? [0, 3, 7] : [0, 4, 7];
  // Root in octave 4 (MIDI 60 = C4), but clamp to piano range
  const midiRoot = Math.min(60 + item.root, 67); // keep chord inside our piano

  const chordNotes = intervals.map(iv => midiRoot + iv);
  const noteNames  = chordNotes.map(n => NOTE_NAMES[n % 12]).join(' – ');
  const chordLabel = isMinor ? item.minor : item.major;
  const chordType  = isMinor ? 'minor' : 'major';

  // Play each note
  chordNotes.forEach(note => {
    if (note >= PIANO_START_NOTE && note <= PIANO_END_NOTE) {
      noteOnFromUi(note, 0.68);
      setKeyActive(note, true);
    }
  });

  // Auto-release after 700ms
  const releaseTimer = setTimeout(() => {
    chordNotes.forEach(note => {
      noteOffFromUi(note);
      setKeyActive(note, false);
    });
  }, 700);
  fifthsReleaseTimers.push(releaseTimer);

  // Update info display
  const display = document.getElementById('fifthsChordDisplay');
  if (display) {
    display.innerHTML = `
      <span class="chord-name">${chordLabel}</span>
      <span class="chord-notes">${chordType} · ${noteNames}</span>
    `;
  }
}

// ───── Initialise ─────
buildPianoRoll();
wirePianoRollPointer();
buildSeqGrid();
initModularPatchbay();
initCircleOfFifths();
initTheoryMap();
readAdsr();   // set initial display values from slider defaults
setStatus();
