// Music Lab: WebAudio + WebMIDI
// v3: Key-aware engraving · Grand staff · Sustain pedal · Room piano · Groove sequencer

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
const adsr = { a: 0.008, d: 0.850, s: 0.18, r: 0.420 };

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
const PIANO_END_NOTE   = 84; // C6
const BLACK_CLASSES    = new Set([1, 3, 6, 8, 10]);
const NOTE_NAMES       = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_TO_INDEX = Object.fromEntries(NOTE_LETTERS.map((letter, index) => [letter, index]));
const SHARP_NAMES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const FLAT_NAMES  = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
const INTERVAL_THEORY = [
  { interval: 'P1', family: 'perfect', sharpSolfege: 'Do', flatSolfege: 'Do' },
  { interval: 'm2', family: 'minor', sharpSolfege: 'Di', flatSolfege: 'Ra' },
  { interval: 'M2', family: 'major', sharpSolfege: 'Re', flatSolfege: 'Re' },
  { interval: 'm3', family: 'minor', sharpSolfege: 'Ri', flatSolfege: 'Me' },
  { interval: 'M3', family: 'major', sharpSolfege: 'Mi', flatSolfege: 'Mi' },
  { interval: 'P4', family: 'perfect', sharpSolfege: 'Fa', flatSolfege: 'Fa' },
  { interval: 'TT', family: 'tritone', sharpSolfege: 'Fi', flatSolfege: 'Se' },
  { interval: 'P5', family: 'perfect', sharpSolfege: 'Sol', flatSolfege: 'Sol' },
  { interval: 'm6', family: 'minor', sharpSolfege: 'Si', flatSolfege: 'Le' },
  { interval: 'M6', family: 'major', sharpSolfege: 'La', flatSolfege: 'La' },
  { interval: 'm7', family: 'minor', sharpSolfege: 'Li', flatSolfege: 'Te' },
  { interval: 'M7', family: 'major', sharpSolfege: 'Ti', flatSolfege: 'Ti' },
];
const INTERVAL_COLORS = [
  '#d7263d', '#df4b2f', '#e87516', '#d99a00', '#d6ad00', '#25823b',
  '#16866f', '#1670c5', '#3555b5', '#4b46a9', '#66399f', '#842f9b',
];
const NOTATION_KEYS = {
  C:  { label: 'C major',  root: 0,  signature: 0, accidental: 'sharp' },
  G:  { label: 'G major',  root: 7,  signature: 1, accidental: 'sharp' },
  D:  { label: 'D major',  root: 2,  signature: 2, accidental: 'sharp' },
  A:  { label: 'A major',  root: 9,  signature: 3, accidental: 'sharp' },
  E:  { label: 'E major',  root: 4,  signature: 4, accidental: 'sharp' },
  B:  { label: 'B major',  root: 11, signature: 5, accidental: 'sharp' },
  'F#': { label: 'F♯ major', root: 6, signature: 6, accidental: 'sharp' },
  F:  { label: 'F major',  root: 5,  signature: 1, accidental: 'flat' },
  Bb: { label: 'B♭ major', root: 10, signature: 2, accidental: 'flat' },
  Eb: { label: 'E♭ major', root: 3,  signature: 3, accidental: 'flat' },
  Ab: { label: 'A♭ major', root: 8,  signature: 4, accidental: 'flat' },
  Db: { label: 'D♭ major', root: 1,  signature: 5, accidental: 'flat' },
};
const notationState = { key: 'C', accidentalMode: 'auto', intervalColors: false };
const KEY_SIGNATURE_ORDER = {
  sharp: ['F', 'C', 'G', 'D', 'A', 'E'],
  flat: ['B', 'E', 'A', 'D', 'G', 'C'],
};

function currentNotationKey() { return NOTATION_KEYS[notationState.key] || NOTATION_KEYS.C; }

function preferredAccidental() {
  return notationState.accidentalMode === 'auto'
    ? currentNotationKey().accidental
    : notationState.accidentalMode;
}

function signatureAccidentalForLetter(letter) {
  const key = currentNotationKey();
  return KEY_SIGNATURE_ORDER[key.accidental].slice(0, key.signature).includes(letter)
    ? (key.accidental === 'flat' ? '♭' : '♯')
    : '';
}

function spellPitchClass(pitchClass) {
  const pc = ((pitchClass % 12) + 12) % 12;
  const key = currentNotationKey();
  const scaleDegree = [0, 2, 4, 5, 7, 9, 11].findIndex(step => (key.root + step) % 12 === pc);
  if (scaleDegree >= 0) {
    const tonicLetterIndex = LETTER_TO_INDEX[notationState.key[0]];
    const letter = NOTE_LETTERS[(tonicLetterIndex + scaleDegree) % 7];
    const label = spellChordTone(pc, letter);
    const accidental = label.slice(1);
    return { label, letter, accidental, letterIndex: LETTER_TO_INDEX[letter] };
  }
  const label = (preferredAccidental() === 'flat' ? FLAT_NAMES : SHARP_NAMES)[pc];
  const letter = label[0];
  const accidental = label.includes('♯') ? '♯' : (label.includes('♭') ? '♭' : '');
  return { label, letter, accidental, letterIndex: LETTER_TO_INDEX[letter] };
}

function getTheoryNote(midi) {
  const pc = midi % 12;
  const spelling = spellPitchClass(pc);
  const key = currentNotationKey();
  const relativePc = (pc - key.root + 12) % 12;
  const base = INTERVAL_THEORY[relativePc];
  const rootMidi = 60 + key.root;
  const distance = midi - rootMidi;
  let interval = base.interval;
  if (relativePc === 0 && distance >= 24) interval = 'P15';
  else if (relativePc === 0 && distance >= 12) interval = 'P8';
  else if (relativePc === 0 && distance <= -12) interval = '-P8';
  else if (distance < 0) interval = `↓${interval}`;
  const octave = Math.floor(midi / 12) - 1;
  const signatureAccidental = signatureAccidentalForLetter(spelling.letter);
  let displayedAccidental = spelling.accidental;
  if (spelling.accidental === signatureAccidental) displayedAccidental = '';
  else if (!spelling.accidental && signatureAccidental) displayedAccidental = '♮';

  return {
    midi,
    label: `${spelling.label}${octave}`,
    pitchLabel: spelling.label,
    letter: spelling.letter,
    letterIndex: spelling.letterIndex,
    accidental: displayedAccidental,
    solfege: preferredAccidental() === 'flat' ? base.flatSolfege : base.sharpSolfege,
    interval,
    semitones: Math.abs(distance),
    family: base.family,
    intervalColor: INTERVAL_COLORS[relativePc],
    staffIndex: (octave * 7) + spelling.letterIndex,
  };
}

const CLEF_CONFIG = {
  treble:  { symbol: '𝄞', centerMidi: 71 },
  bass:    { symbol: '𝄢', centerMidi: 50 },
  alto:    { symbol: '𝄡', centerMidi: 60 },
  soprano: { symbol: '𝄡', centerMidi: 64 },
  grand:   { isGrand: true }
};

// ───── Piano state ─────
const pianoState = {
  pointerDown:   false,
  pointerId:     null,
  activeNote:    null,
  keyByNote:     new Map(),
  showNoteNames: false,
  sustain:       false,
  heldNotes:     new Set(),
  sustainedNotes: new Set(),
};

const bridgeState = {
  activeNotes: new Set(),
  activeTimers: new Map(),
};

// ───── Step Sequencer ─────
const SEQ_STEPS  = 16;
const SEQ_DRUMS  = ['kick','snare','hat','clap','tom1','tom2','perc','crash'];
const SEQ_LABELS = ['Kick','Snare','Hi-Hat','Clap','Tom','Low Tom','Perc','Crash'];
const SEQ_COLORS = ['#e05252','#4a90e2','#7ab648','#c27cf0','#e8954e','#7ecfce','#e8c84e','#e070b8'];

function makeGroove(stepRows) {
  return SEQ_DRUMS.map((_, row) =>
    Array.from({ length: SEQ_STEPS }, (__, step) => (stepRows[row] || []).includes(step))
  );
}

const GROOVE_PRESETS = {
  backbeat: {
    name: 'Backbeat Basics', bpm: 120, swing: 50,
    grid: makeGroove([[0, 8], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14], [], [], [], [], []]),
  },
  fourFloor: {
    name: 'Four on the Floor', bpm: 124, swing: 50,
    grid: makeGroove([[0, 4, 8, 12], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14], [12], [], [], [3, 7, 11, 15], []]),
  },
  breakbeat: {
    name: 'Broken Beat', bpm: 104, swing: 58,
    grid: makeGroove([[0, 3, 7, 10, 14], [4, 11, 12], [0, 2, 4, 6, 8, 10, 12, 14], [], [6], [15], [2, 9], []]),
  },
  halfTime: {
    name: 'Half-Time Pulse', bpm: 82, swing: 54,
    grid: makeGroove([[0, 7, 10], [8], [0, 2, 4, 6, 8, 10, 12, 14], [8], [14], [], [3, 11], [0]]),
  },
};

const SEQ_SESSION_KEY = 'classroomos.musicLab.sequencer.v1';
let seqGrid = GROOVE_PRESETS.backbeat.grid.map(row => [...row]);
let seqMuted = SEQ_DRUMS.map(() => false);
let seqStep    = 0;
let seqPlaying = false;
let seqTimerId = null;
let seqBpm     = 120;
let seqSwing   = 50;
let seqGroove  = 'backbeat';

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
  keySignature: document.getElementById('keySignature'),
  accidentalMode: document.getElementById('accidentalMode'),
  intervalColorToggle: document.getElementById('intervalColorToggle'),
  intervalColorLegend: document.getElementById('intervalColorLegend'),
  practiceScale: document.getElementById('practiceScale'),
  scalePracticeBoard: document.getElementById('scalePracticeBoard'),
  diatonicToggle: document.getElementById('diatonicToggle'),
  diatonicChordGrid: document.getElementById('diatonicChordGrid'),
  qwertyBaseSlider: document.getElementById('qwertyBaseSlider'),
  qwertyBaseValue: document.getElementById('qwertyBaseValue'),
  sustainPedal: document.getElementById('sustainPedal'),
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
  seqSwingSlider: document.getElementById('seqSwingSlider'),
  seqSwingVal:  document.getElementById('seqSwingVal'),
  seqGroove:    document.getElementById('seqGroove'),
  seqVariation: document.getElementById('seqVariation'),
  seqSessionNote: document.getElementById('seqSessionNote'),
  seqGrid:      document.getElementById('seqGrid'),
  staffSystem:  document.getElementById('staffSystem'),
  labHudValue:  document.getElementById('labHudValue'),
};

// ───── Status bar ─────
function setStatus(extra) {
  const a   = audioCtx   ? 'on' : 'off';
  const m   = midiAccess ? 'on' : 'off';
  const dev = currentInput ? ` · in: ${currentInput.name || 'MIDI device'}` : '';
  els.status.textContent = `Audio: ${a} · MIDI: ${m}${dev}${extra ? ` · ${extra}` : ''}`;
}

function createPracticeRoomImpulse(ctx) {
  const duration = 0.9;
  const length = Math.floor(ctx.sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const time = i / ctx.sampleRate;
      const envelope = Math.pow(1 - (i / length), 3.4);
      const fadeIn = Math.min(1, time / 0.008);
      data[i] = (Math.random() * 2 - 1) * envelope * fadeIn;
    }
  }
  return impulse;
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

  // Quiet early reflection: enough depth to feel like a practice room without
  // turning quick passages into a pronounced echo.
  const delay         = audioCtx.createDelay(1.0);
  delay.delayTime.value = 0.145;
  const delayFeedback = audioCtx.createGain();
  delayFeedback.gain.value = 0.08;
  const delayWet      = audioCtx.createGain();
  delayWet.gain.value = 0.09;
  master.connect(delay);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(delayWet);
  delayWet.connect(limiter);

  // Short stereo convolution tail, filtered like a modest furnished room.
  const roomPreDelay = audioCtx.createDelay(0.1);
  roomPreDelay.delayTime.value = 0.018;
  const room = audioCtx.createConvolver();
  room.buffer = createPracticeRoomImpulse(audioCtx);
  const roomTone = audioCtx.createBiquadFilter();
  roomTone.type = 'lowpass';
  roomTone.frequency.value = 4600;
  const roomWet = audioCtx.createGain();
  roomWet.gain.value = 0.16;
  master.connect(roomPreDelay);
  roomPreDelay.connect(room);
  room.connect(roomTone);
  roomTone.connect(roomWet);
  roomWet.connect(limiter);

  // Analyser
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.82;

  // Signal chain: master → limiter (dry + delay + room) → analyser → speakers
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
  // Return keyboard focus to the page so the QWERTY piano and Space sustain
  // work immediately after the required audio-unlock click.
  els.enableAudio.blur();
}

// ───── Note utilities ─────
function midiNoteToHz(note) { return 440 * Math.pow(2, (note - 69) / 12); }

function noteName(note) {
  return getTheoryNote(note).label;
}

function noteLetterOnly(note) { return getTheoryNote(note).pitchLabel; }
function isBlackKey(note)     { return BLACK_CLASSES.has(note % 12); }

function noteAllowed(note) {
  return !activeScaleKeys || activeScaleKeys.includes(note % 12);
}

function currentWaveformLabel() {
  if (els.preset && els.preset.value === 'piano') return 'Practice Room Piano';
  if (els.preset && els.preset.value === 'drums') return 'Drums';
  return modular.wave ? `${modular.wave[0].toUpperCase()}${modular.wave.slice(1)}` : 'Sine';
}

function updateHud(message) {
  if (els.labHudValue) els.labHudValue.textContent = message;
}

function formatFrequency(note) {
  return `${midiNoteToHz(note).toFixed(2)}Hz`;
}

function highlightTheoryNotes(notes, shouldScroll) {
  if (!els.staffSystem) return;
  renderActiveChord(notes);
}

function highlightFifthsByPitchClasses(pitchClasses) {
  const pitchSet = new Set(pitchClasses);
  document.querySelectorAll('.fifths-group').forEach((group) => {
    const root = Number(group.dataset.root);
    const active = pitchSet.has(root);
    group.classList.toggle('active', active);
  });
}

function clearBridgeHighlights() {
  highlightTheoryNotes([], false);
  highlightFifthsByPitchClasses([]);
}

function getNoteLayout(note, centerMidi) {
  const steps = note.staffIndex - getTheoryNote(centerMidi).staffIndex;
  const yBase = 92;
  const stepPx = 5;
  return {
    steps,
    y: yBase - (steps * stepPx)
  };
}

const KEY_SIGNATURE_MIDIS = {
  treble: {
    sharp: [77, 72, 79, 74, 69, 76],
    flat:  [71, 76, 69, 74, 67, 72],
  },
  bass: {
    sharp: [53, 48, 55, 50, 45, 52],
    flat:  [47, 52, 45, 50, 43, 48],
  },
  alto: {
    sharp: [65, 60, 67, 62, 57, 64],
    flat:  [59, 64, 57, 62, 55, 60],
  },
  soprano: {
    sharp: [65, 72, 67, 74, 69, 64],
    flat:  [71, 64, 69, 62, 67, 60],
  },
};

function keySignatureDescription() {
  const key = currentNotationKey();
  if (!key.signature) return 'no sharps or flats';
  return `${key.signature} ${key.accidental}${key.signature === 1 ? '' : 's'}`;
}

function buildStaffChrome(clefKey) {
  const key = currentNotationKey();
  const targets = KEY_SIGNATURE_MIDIS[clefKey][key.accidental].slice(0, key.signature);
  const symbol = key.accidental === 'flat' ? '♭' : '♯';
  const signatureMarks = targets.map((midi, index) => {
    const layout = getNoteLayout(getTheoryNote(midi), CLEF_CONFIG[clefKey].centerMidi);
    return `<text x="${12 + (index * 15)}" y="${layout.y + 7}" aria-hidden="true">${symbol}</text>`;
  }).join('');
  const signatureWidth = Math.max(18, 18 + (targets.length * 15));
  const timeLeft = 92 + (targets.length * 15);

  return `
    <div class="clef-symbol" aria-hidden="true">${CLEF_CONFIG[clefKey].symbol}</div>
    <svg class="staff-key-signature" style="width:${signatureWidth}px" viewBox="0 0 ${signatureWidth} 224"
         role="img" aria-label="${key.label}, ${keySignatureDescription()}">${signatureMarks}</svg>
    <span class="staff-time-signature" style="left:${timeLeft}px" aria-label="Four four time"><span>4</span><span>4</span></span>
  `;
}

function updateNotationReadout(activeMidis) {
  const key = currentNotationKey();
  const notes = (activeMidis || []).map(getTheoryNote).sort((a, b) => a.midi - b.midi);
  const keyOutput = document.getElementById('notationKeyReadout');
  const soundingOutput = document.getElementById('notationSounding');
  const midiOutput = document.getElementById('notationMidi');
  const frequencyOutput = document.getElementById('notationFrequency');
  const badge = document.getElementById('notationBadge');
  if (keyOutput) keyOutput.textContent = `${key.label} · ${keySignatureDescription()}`;
  if (soundingOutput) soundingOutput.textContent = notes.length ? notes.map(note => note.label).join(' · ') : '—';
  if (midiOutput) midiOutput.textContent = notes.length ? notes.map(note => note.midi).join(', ') : '—';
  if (frequencyOutput) {
    frequencyOutput.textContent = notes.length === 1
      ? formatFrequency(notes[0].midi)
      : (notes.length ? `${formatFrequency(notes[0].midi)}–${formatFrequency(notes.at(-1).midi)}` : '—');
  }
  if (badge) badge.textContent = `${key.label} · ${preferredAccidental() === 'flat' ? 'flat' : 'sharp'} spelling · 4/4`;
}

function buildChordSvg(notesInClef, centerMidi) {
  const layouts = notesInClef.map(note => ({ note, ...getNoteLayout(note, centerMidi) }));
  layouts.sort((a, b) => a.steps - b.steps);

  const avgStep = layouts.reduce((sum, l) => sum + l.steps, 0) / layouts.length;
  const stemDown = avgStep >= 0;

  let currentShift = false;
  for (let i = 0; i < layouts.length; i++) {
    layouts[i].headX = 36;
    if (i > 0 && Math.abs(layouts[i].steps - layouts[i-1].steps) <= 1) {
      if (!currentShift) {
        layouts[i].headX = 36 + 12;
        currentShift = true;
      } else {
        currentShift = false;
      }
    } else {
      currentShift = false;
    }
  }

  const stemX = stemDown ? 36 - 6 : 36 + 6;
  const minY = Math.min(...layouts.map(l => l.y));
  const maxY = Math.max(...layouts.map(l => l.y));
  const stemY1 = stemDown ? minY : maxY;
  const stemY2 = stemDown ? Math.max(maxY + 35, minY + 35) : Math.min(minY - 35, maxY - 35);

  const ledgers = new Set();
  layouts.forEach(l => {
    if (l.steps <= -6) {
      for (let s = -6; s >= l.steps; s -= 2) ledgers.add(s);
    }
    if (l.steps >= 6) {
      for (let s = 6; s <= l.steps; s += 2) ledgers.add(s);
    }
  });

  let svg = '<svg class="music-staff-svg" viewBox="0 0 72 162" aria-hidden="true" focusable="false">';
  
  ledgers.forEach(s => {
    const y = 92 - (s * 5);
    svg += `<line class="ledger-line" x1="18" x2="60" y1="${y}" y2="${y}"></line>`;
  });

  svg += `<line class="note-stem" x1="${stemX}" y1="${stemY1}" x2="${stemX}" y2="${stemY2}"></line>`;

  let lastAccidentalStep = -999;
  layouts.forEach((l) => {
    if (l.note.accidental) {
      const isClose = Math.abs(l.steps - lastAccidentalStep) <= 2;
      const xPos = isClose ? l.headX - 34 : l.headX - 22;
      svg += `<text class="note-accidental" x="${xPos}" y="${l.y + 6}" aria-hidden="true">${l.note.accidental}</text>`;
      lastAccidentalStep = l.steps;
    }
  });

  layouts.forEach((l) => {
    svg += `<ellipse class="note-head" style="--interval-color:${l.note.intervalColor}" cx="${l.headX}" cy="${l.y}" rx="7" ry="5"></ellipse>`;
  });

  svg += '</svg>';
  return svg;
}

function renderChordContainer(notesInClef, centerMidi) {
  if (!notesInClef.length) return '';
  const labels = notesInClef.map(n => n.label).join(' \u2013 ');
  const solfege = notesInClef.map(n => n.solfege).join('-');
  const intervals = notesInClef.map(n => n.interval).join(', ');
  const familyClass = notesInClef.length === 1 ? notesInClef[0].family : 'perfect';
  const midisArray = JSON.stringify(notesInClef.map(n => n.midi));
  const leftPx = Math.max(180, 142 + (currentNotationKey().signature * 15));

  return `
    <button
      class="note-container theory-map-note ${familyClass} is-bridge-active"
      type="button"
      style="left:${leftPx}px"
      data-midis="${midisArray}"
      aria-label="Chord: ${labels}, ${solfege}, ${intervals}"
    >
      ${buildChordSvg(notesInClef, centerMidi)}
      <span class="note-labels" aria-hidden="true">
        <span class="music-interval-note">${labels}</span>
        <span class="music-interval-solfege">${solfege}</span>
        <span class="music-interval-name">${intervals}</span>
      </span>
    </button>
  `;
}

function renderActiveChord(activeMidis, forcedClef) {
  const staffSystem = document.getElementById('staffSystem');
  if (!staffSystem) return;
  const selector = document.getElementById('clefSelector');
  const clefKey = forcedClef || (selector ? selector.value : 'grand');
  staffSystem.classList.toggle('show-interval-colors', notationState.intervalColors);
  updateNotationReadout(activeMidis || []);

  if (!activeMidis || activeMidis.length === 0) {
    if (clefKey === 'grand') {
      staffSystem.classList.add('grand-staff');
      staffSystem.innerHTML = `
        <div class="staff-block" data-clef="treble">${buildStaffChrome('treble')}</div>
        <div class="staff-block" data-clef="bass">${buildStaffChrome('bass')}</div>
      `;
    } else {
      staffSystem.classList.remove('grand-staff');
      staffSystem.innerHTML = `
        <div class="staff-block" data-clef="${clefKey}">
          ${buildStaffChrome(clefKey)}
        </div>
      `;
    }
    return;
  }

  const notes = activeMidis.map(getTheoryNote);

  if (clefKey === 'grand') {
    staffSystem.classList.add('grand-staff');
    const bassNotes = notes.filter((n) => n.midi < 60);
    const trebleNotes = notes.filter((n) => n.midi >= 60);
    staffSystem.innerHTML = `
      <div class="staff-block" data-clef="treble">
        ${buildStaffChrome('treble')}
        ${renderChordContainer(trebleNotes, CLEF_CONFIG['treble'].centerMidi)}
      </div>
      <div class="staff-block" data-clef="bass">
        ${buildStaffChrome('bass')}
        ${renderChordContainer(bassNotes, CLEF_CONFIG['bass'].centerMidi)}
      </div>
    `;
  } else {
    staffSystem.classList.remove('grand-staff');
    const config = CLEF_CONFIG[clefKey];
    staffSystem.innerHTML = `
      <div class="staff-block" data-clef="${clefKey}">
        ${buildStaffChrome(clefKey)}
        ${renderChordContainer(notes, config.centerMidi)}
      </div>
    `;
  }

  staffSystem.querySelectorAll('.note-container').forEach((button) => {
    const midis = button.dataset.midis ? JSON.parse(button.dataset.midis) : [];
    const solfege = button.querySelector('.music-interval-solfege')?.textContent || '';

    button.addEventListener('click', () => {
      if (midis.length) os_triggerChord(midis, { label: 'Engraved Chord', solfege });
    });
  });
}

function renderTheoryStaff(clefKey) {
  const activeMidis = Array.from(bridgeState.activeNotes).sort((a, b) => a - b);
  renderActiveChord(activeMidis, clefKey);
}

function initTheoryMap() {
  const selector = document.getElementById('clefSelector');
  if (!selector) return;
  renderTheoryStaff(selector.value);
  selector.addEventListener('change', () => renderTheoryStaff(selector.value));

  const refreshNotation = () => {
    notationState.key = els.keySignature?.value || 'C';
    notationState.accidentalMode = els.accidentalMode?.value || 'auto';
    for (const [note, key] of pianoState.keyByNote) {
      const label = noteName(note);
      key.setAttribute('aria-label', `Piano key ${label}`);
      key.title = label;
    }
    updateKeyOverlays();
    renderScalePractice();
    renderDiatonicChords();
    updateQwertyRangeLabel();
    renderTheoryStaff(selector.value);
  };

  els.keySignature?.addEventListener('change', refreshNotation);
  els.accidentalMode?.addEventListener('change', refreshNotation);
  els.intervalColorToggle?.addEventListener('change', () => {
    notationState.intervalColors = els.intervalColorToggle.checked;
    els.intervalColorLegend.hidden = !notationState.intervalColors;
    renderScalePractice();
    renderDiatonicChords();
    renderTheoryStaff(selector.value);
  });
  els.practiceScale?.addEventListener('change', renderScalePractice);
  els.diatonicToggle?.addEventListener('change', () => {
    els.diatonicChordGrid.hidden = !els.diatonicToggle.checked;
    renderDiatonicChords();
  });
  renderScalePractice();
  renderDiatonicChords();
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
  const base = midiNoteToHz(note);
  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const sources = [];

  filter.type = 'lowpass';
  filter.Q.value = 0.65;
  const initialCutoff = Math.min(6800, Math.max(3600, 4300 + (v * 1800) + ((note - 60) * 32)));
  const restingCutoff = Math.min(3600, Math.max(1500, 2100 + ((note - 60) * 24)));
  filter.frequency.setValueAtTime(initialCutoff, now);
  filter.frequency.exponentialRampToValueAtTime(restingCutoff, now + 0.9);

  // Immediate hammer response, a natural body decay, then a quiet held tone.
  const peak = v * 0.62;
  const attackEnd = now + Math.max(0.003, adsr.a);
  const bodyEnd = attackEnd + Math.max(0.35, adsr.d);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, attackEnd);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.42, 0.0001), attackEnd + 0.16);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak * Math.max(adsr.s, 0.06), 0.0001), bodyEnd);

  // Upper partials fade at different rates, avoiding a static organ-like tone.
  [
    { ratio: 1, level: 1.00, type: 'triangle', decay: 0 },
    { ratio: 2, level: 0.28, type: 'sine', decay: 0.75 },
    { ratio: 3, level: 0.13, type: 'sine', decay: 0.42 },
    { ratio: 4, level: 0.055, type: 'sine', decay: 0.24 },
  ].forEach((partial, index) => {
    const osc = audioCtx.createOscillator();
    const partialGain = audioCtx.createGain();
    osc.type = partial.type;
    osc.frequency.value = base * partial.ratio;
    osc.detune.value = index === 0 ? -0.7 : (index % 2 ? 1.2 : -1.1);
    partialGain.gain.setValueAtTime(partial.level, now);
    if (partial.decay) {
      partialGain.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);
    }
    osc.connect(partialGain);
    partialGain.connect(filter);
    osc.start(now);
    sources.push(osc);
  });

  // A short filtered-noise transient suggests felt and hammer contact.
  const hammer = audioCtx.createBufferSource();
  const hammerFilter = audioCtx.createBiquadFilter();
  const hammerGain = audioCtx.createGain();
  hammer.buffer = getNoiseBuffer();
  hammerFilter.type = 'bandpass';
  hammerFilter.frequency.value = Math.min(5200, 1900 + (note * 34));
  hammerFilter.Q.value = 0.8;
  hammerGain.gain.setValueAtTime(v * 0.055, now);
  hammerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
  hammer.connect(hammerFilter);
  hammerFilter.connect(hammerGain);
  hammerGain.connect(filter);
  hammer.start(now, Math.random() * 1.5);
  hammer.stop(now + 0.038);
  sources.push(hammer);

  filter.connect(gain);
  gain.connect(master);

  activeVoices.set(note, { gain, sources });
}

// ───── Drum synthesis ─────
let sharedNoiseBuffer = null;

function getNoiseBuffer() {
  if (sharedNoiseBuffer) return sharedNoiseBuffer;
  if (!audioCtx) return null;
  // Create a reusable 2-second noise buffer
  const buf  = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 2.0), audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  sharedNoiseBuffer = buf;
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
  noise.buffer = getNoiseBuffer();
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
  noise.buffer = getNoiseBuffer();
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
    noise.buffer = getNoiseBuffer();
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
  noise.buffer = getNoiseBuffer();
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
    try { 
      source.stop(stopAt); 
      source.onended = () => {
        source.disconnect();
        if (voice.gain) voice.gain.disconnect();
      };
    } catch (_err) {}
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

function os_releaseNote(note) {
  if (bridgeState.activeTimers.has(note)) {
    clearTimeout(bridgeState.activeTimers.get(note));
    bridgeState.activeTimers.delete(note);
  }
  noteOffFromUi(note);
  bridgeState.activeNotes.delete(note);
  setKeyActive(note, false);
  highlightTheoryNotes(Array.from(bridgeState.activeNotes), false);
  if (!bridgeState.activeNotes.size) {
    highlightFifthsByPitchClasses([]);
  } else {
    highlightFifthsByPitchClasses(Array.from(bridgeState.activeNotes).map((midi) => midi % 12));
  }
}

function os_triggerNote(midi, velocity, options) {
  const config = Object.assign({
    duration: 420,
    highlightTheory: true,
    highlightPiano: true,
    highlightCircle: true,
    scrollTheory: true,
    hudLabel: noteName(midi),
    solfege: '',
  }, options || {});

  if (!noteAllowed(midi)) return;

  noteOnFromUi(midi, velocity);
  bridgeState.activeNotes.add(midi);
  if (config.highlightPiano) setKeyActive(midi, true);
  if (config.highlightTheory) highlightTheoryNotes(Array.from(bridgeState.activeNotes), config.scrollTheory);
  if (config.highlightCircle) highlightFifthsByPitchClasses(Array.from(bridgeState.activeNotes).map((note) => note % 12));

  const solfegeText = config.solfege ? ` (${config.solfege})` : '';
  updateHud(`Now Playing: ${config.hudLabel}${solfegeText} · Frequency: ${formatFrequency(midi)} · Waveform: ${currentWaveformLabel()}`);

  if (bridgeState.activeTimers.has(midi)) {
    clearTimeout(bridgeState.activeTimers.get(midi));
    bridgeState.activeTimers.delete(midi);
  }

  if (config.duration && Number.isFinite(config.duration)) {
    const timer = setTimeout(() => {
      os_releaseNote(midi);
      bridgeState.activeTimers.delete(midi);
      if (!bridgeState.activeNotes.size) {
        updateHud(`Now Playing: idle · Frequency: — · Waveform: ${currentWaveformLabel()}`);
      }
    }, config.duration);
    bridgeState.activeTimers.set(midi, timer);
  }
}

function os_triggerChord(notes, options) {
  const config = Object.assign({
    duration: 700,
    label: 'Chord',
    solfege: '',
  }, options || {});

  const playableNotes = notes.filter((note) => noteAllowed(note));
  if (!playableNotes.length) return;

  playableNotes.forEach((note) => {
    noteOnFromUi(note, 0.68);
    bridgeState.activeNotes.add(note);
    setKeyActive(note, true);
  });

  highlightTheoryNotes(playableNotes, true);
  highlightFifthsByPitchClasses(playableNotes.map((note) => note % 12));
  updateHud(`Now Playing: ${config.label}${config.solfege ? ` (${config.solfege})` : ''} · Frequency: ${formatFrequency(playableNotes[0])} · Waveform: ${currentWaveformLabel()}`);

  const releaseTimer = setTimeout(() => {
    playableNotes.forEach((note) => os_releaseNote(note));
    if (!bridgeState.activeNotes.size) {
      updateHud(`Now Playing: idle · Frequency: — · Waveform: ${currentWaveformLabel()}`);
    }
  }, config.duration);

  fifthsReleaseTimers.push(releaseTimer);
}

// ───── Piano key visual state ─────
function setKeyActive(note, active) {
  const key = pianoState.keyByNote.get(note);
  if (key) key.classList.toggle('is-active', Boolean(active));
}

function beginPerformanceNote(note, velocity, options) {
  pianoState.heldNotes.add(note);
  pianoState.sustainedNotes.delete(note);
  pianoState.keyByNote.get(note)?.classList.remove('is-sustained');
  os_triggerNote(note, velocity, options);
}

function releasePerformanceNote(note) {
  pianoState.heldNotes.delete(note);
  if (pianoState.sustain && activeVoices.has(note)) {
    pianoState.sustainedNotes.add(note);
    pianoState.keyByNote.get(note)?.classList.add('is-sustained');
    return;
  }
  pianoState.sustainedNotes.delete(note);
  pianoState.keyByNote.get(note)?.classList.remove('is-sustained');
  os_releaseNote(note);
}

function setSustainPedal(active) {
  const next = Boolean(active);
  if (pianoState.sustain === next) return;
  pianoState.sustain = next;
  els.sustainPedal?.setAttribute('aria-pressed', next ? 'true' : 'false');

  if (!next) {
    for (const note of Array.from(pianoState.sustainedNotes)) {
      if (!pianoState.heldNotes.has(note)) os_releaseNote(note);
      pianoState.keyByNote.get(note)?.classList.remove('is-sustained');
    }
    pianoState.sustainedNotes.clear();
  }
}

function releasePianoPointer() {
  if (pianoState.activeNote !== null) {
    releasePerformanceNote(pianoState.activeNote);
  }
  pianoState.pointerDown = false;
  pianoState.pointerId   = null;
  pianoState.activeNote  = null;
}

function activatePianoNote(note) {
  if (pianoState.activeNote === note) return;
  if (pianoState.activeNote !== null) {
    releasePerformanceNote(pianoState.activeNote);
  }
  beginPerformanceNote(note, 0.82, { duration: null, hudLabel: `${noteName(note)} key` });
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

  const qwertyKey = qwertyKeyForNote(note);
  if (qwertyKey) {
    const hint = document.createElement('span');
    hint.className = 'key-qwerty';
    hint.textContent = qwertyKey;
    hint.setAttribute('aria-hidden', 'true');
    key.appendChild(hint);
  }

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
    beginPerformanceNote(note, 0.82, { duration: null, hudLabel: `${noteName(note)} key` });
  });

  key.addEventListener('keyup', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    releasePerformanceNote(note);
  });

  key.addEventListener('blur', () => {
    releasePerformanceNote(note);
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

  if (cmd === 0xb0 && data1 === 64) {
    setSustainPedal(data2 >= 64);
    return;
  }

  if (cmd === 0x90) {
    const note = data1, vel = data2 / 127;

    // note-on with vel=0 treated as note-off
    if (data2 === 0) {
      if (preset !== 'drums') { releasePerformanceNote(note); }
      return;
    }

    if (preset === 'drums') {
      const map = { 36:'kick',38:'snare',42:'hat',39:'clap',45:'tom1',41:'tom2',49:'crash',51:'crash' };
      triggerDrum(map[note] || 'perc');
      return;
    }

    if (!noteAllowed(note)) return;
    beginPerformanceNote(note, vel, { duration: null, hudLabel: `${noteName(note)} MIDI`, scrollTheory: false });
    return;
  }

  if (cmd === 0x80) {
    if (preset !== 'drums') { releasePerformanceNote(data1); }
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
  updateHud(`Now Playing: ${name[0].toUpperCase()}${name.slice(1)} drum hit · Frequency: percussion spectrum · Waveform: Drums`);
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
      label.textContent = noteName(note);
    } else {
      if (label) label.remove();
    }
  }
}

// ───── ADSR display helpers ─────
function fmtMs(ms) { return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`; }

function drawAdsrCurve() {
  const svg = document.getElementById('adsrCurve');
  if (!svg) return;
  const W = 400, H = 80;
  const pad = { l: 14, r: 14, t: 10, b: 16 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;

  const sustainDur = 0.28;
  const total = adsr.a + adsr.d + sustainDur + adsr.r;

  function tx(t) { return pad.l + (t / total) * w; }
  function ty(v) { return pad.t + h - v * h; }

  const x0 = tx(0),                          y0 = ty(0);
  const x1 = tx(adsr.a),                     y1 = ty(1);
  const x2 = tx(adsr.a + adsr.d),            y2 = ty(adsr.s);
  const x3 = tx(adsr.a + adsr.d + sustainDur), y3 = ty(adsr.s);
  const x4 = tx(total),                      y4 = ty(0);

  const path = `M ${x0} ${y0} L ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4}`;
  const fill = `${path} L ${x4} ${ty(0)} L ${x0} ${ty(0)} Z`;

  const lx = (a, b) => ((a + b) / 2).toFixed(1);
  const ly = H - 3;

  svg.innerHTML = `
    <defs>
      <linearGradient id="adsrGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--module-osc,#3357e5)" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="var(--module-osc,#3357e5)" stop-opacity="0.03"/>
      </linearGradient>
    </defs>
    <line x1="${pad.l}" y1="${ty(0).toFixed(1)}" x2="${W-pad.r}" y2="${ty(0).toFixed(1)}" stroke="var(--border-subtle)" stroke-width="1"/>
    <line x1="${pad.l}" y1="${ty(1).toFixed(1)}" x2="${W-pad.r}" y2="${ty(1).toFixed(1)}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="3 4"/>
    <path d="${fill}" fill="url(#adsrGrad)"/>
    <path d="${path}" fill="none" stroke="var(--module-osc,#3357e5)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="3" fill="var(--module-osc,#3357e5)"/>
    <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="3" fill="var(--module-osc,#3357e5)"/>
    <text x="${lx(x0,x1)}" y="${ly}" text-anchor="middle" font-size="8" fill="var(--text-muted,#94a3b8)">A</text>
    <text x="${lx(x1,x2)}" y="${ly}" text-anchor="middle" font-size="8" fill="var(--text-muted,#94a3b8)">D</text>
    <text x="${lx(x2,x3)}" y="${ly}" text-anchor="middle" font-size="8" fill="var(--text-muted,#94a3b8)">S</text>
    <text x="${lx(x3,x4)}" y="${ly}" text-anchor="middle" font-size="8" fill="var(--text-muted,#94a3b8)">R</text>
  `;
}

function readAdsr() {
  adsr.a = Number(els.adsrA.value) / 1000;
  adsr.d = Number(els.adsrD.value) / 1000;
  adsr.s = Number(els.adsrS.value) / 100;
  adsr.r = Number(els.adsrR.value) / 1000;
  els.adsrAVal.textContent = fmtMs(Number(els.adsrA.value));
  els.adsrDVal.textContent = fmtMs(Number(els.adsrD.value));
  els.adsrSVal.textContent = `${els.adsrS.value}%`;
  els.adsrRVal.textContent = fmtMs(Number(els.adsrR.value));
  drawAdsrCurve();
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
    const sag = Math.min(120, Math.max(40, totalDist * 0.35));
    const c1x = start.x;
    const c1y = start.y + sag;
    const c2x = end.x;
    const c2y = end.y + sag;
    const d = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;

    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shadow.setAttribute('d', d);
    shadow.setAttribute('class', 'ml-cable-shadow');

    const core = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    core.setAttribute('d', d);
    core.setAttribute('class', 'ml-cable-core');

    const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pulse.setAttribute('d', d);
    pulse.setAttribute('class', 'ml-cable-pulse');

    svg.appendChild(shadow);
    svg.appendChild(core);
    svg.appendChild(pulse);
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
    if (els.modularRack) els.modularRack.classList.add('is-playing');
  updateModularButtons();
  updateModularStatus();
}

function stopModularTone() {
  if (!modular.isPlaying) return;
  modular.isPlaying = false;
    if (els.modularRack) els.modularRack.classList.remove('is-playing');
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

  // Screen colors follow the active site theme (--surface-elevated / --border-subtle /
  // --module-osc) instead of a fixed dark CRT palette, so the scope stays legible in
  // light themes like honey and goldfish.
  let bgColor = '#101820';
  let gridColor = 'rgba(148, 163, 184, 0.28)';
  let traceColor = '#3357e5';

  function readMonitorColors() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => (styles.getPropertyValue(name) || '').trim() || fallback;
    bgColor = read('--surface-elevated', bgColor);
    gridColor = read('--border-subtle', gridColor);
    traceColor = read('--module-osc', traceColor);
  }
  readMonitorColors();
  window.addEventListener('classroomos:lightingchange', readMonitorColors);

  function paintMonitorShell(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = gridColor;
    for (let x = 0; x < width; x += 44) ctx.fillRect(x, 0, 1, height);
    for (let y = 0; y < height; y += 28) ctx.fillRect(0, y, width, 1);
    ctx.restore();
  }

  function drawScope(data) {
    if (!scopeCtx || !scopeCanvas) return;
    const width = scopeCanvas.width;
    const height = scopeCanvas.height;
    paintMonitorShell(scopeCtx, width, height);

    scopeCtx.save();
    scopeCtx.globalAlpha = 0.4;
    scopeCtx.strokeStyle = traceColor;
    scopeCtx.lineWidth = 1;
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, height / 2);
    scopeCtx.lineTo(width, height / 2);
    scopeCtx.stroke();
    scopeCtx.restore();

    if (!data) return;

    scopeCtx.save();
    scopeCtx.strokeStyle = traceColor;
    scopeCtx.shadowColor = traceColor;
    scopeCtx.shadowBlur = 5;
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
    scopeCtx.restore();
  }

  function drawSpectrum(data) {
    if (!spectrumCtx || !spectrumCanvas) return;
    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;
    paintMonitorShell(spectrumCtx, width, height);

    spectrumCtx.save();
    spectrumCtx.globalAlpha = 0.3;
    spectrumCtx.fillStyle = traceColor;
    spectrumCtx.fillRect(0, height - 28, width, 28);
    spectrumCtx.restore();

    if (!data) return;

    const bins = Math.min(144, data.length);
    const barWidth = width / bins;
    spectrumCtx.save();
    spectrumCtx.fillStyle = traceColor;
    spectrumCtx.shadowColor = traceColor;
    spectrumCtx.shadowBlur = 6;
    for (let i = 1; i < bins; i += 1) {
      const magnitude = data[i] / 255;
      const logIndex = Math.log2(i + 1) / Math.log2(bins + 1);
      const x = logIndex * (width - barWidth);
      const barHeight = Math.max(2, magnitude * (height - 18));
      spectrumCtx.globalAlpha = 0.35 + magnitude * 0.65;
      spectrumCtx.fillRect(x, height - barHeight - 6, Math.max(2, barWidth * 1.8), barHeight);
    }
    spectrumCtx.restore();
  }

  let timeData = null;
  let freqData = null;

  function draw() {
    requestAnimationFrame(draw);

    if (!analyser) {
      drawScope(null);
      drawSpectrum(null);
      return;
    }

    if (!timeData || timeData.length !== analyser.fftSize) {
      timeData = new Uint8Array(analyser.fftSize);
      freqData = new Uint8Array(analyser.frequencyBinCount);
    }

    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    drawScope(timeData);
    drawSpectrum(freqData);
  }

  draw();
})();

// ───── Step Sequencer ─────
function setSequencerMessage(message) {
  if (els.seqSessionNote) els.seqSessionNote.textContent = message;
}

function saveSequencerSession() {
  try {
    localStorage.setItem(SEQ_SESSION_KEY, JSON.stringify({
      grid: seqGrid,
      muted: seqMuted,
      bpm: seqBpm,
      swing: seqSwing,
      groove: seqGroove,
    }));
  } catch (_) {
    // Storage can be unavailable in private browsing; the sequencer still works.
  }
}

function restoreSequencerSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SEQ_SESSION_KEY));
    const validGrid = Array.isArray(saved?.grid)
      && saved.grid.length === SEQ_DRUMS.length
      && saved.grid.every(row => Array.isArray(row) && row.length === SEQ_STEPS);

    if (!validGrid) return;

    seqGrid = saved.grid.map(row => row.map(Boolean));
    if (Array.isArray(saved.muted) && saved.muted.length === SEQ_DRUMS.length) {
      seqMuted = saved.muted.map(Boolean);
    }
    seqBpm = Math.max(60, Math.min(200, Number(saved.bpm) || 120));
    seqSwing = Math.max(50, Math.min(75, Number(saved.swing) || 50));
    seqGroove = GROOVE_PRESETS[saved.groove] ? saved.groove : 'custom';

    els.seqBpmSlider.value = String(seqBpm);
    els.seqBpmVal.textContent = String(seqBpm);
    els.seqSwingSlider.value = String(seqSwing);
    els.seqSwingVal.textContent = `${seqSwing}%`;
    els.seqGroove.value = seqGroove;
    setSequencerMessage('Saved session restored · edits save automatically.');
  } catch (_) {
    // Ignore malformed or unavailable storage and keep the starter groove.
  }
}

function renderSequencerState() {
  for (let row = 0; row < SEQ_DRUMS.length; row++) {
    const rowEl = els.seqGrid?.querySelector(`.ml-seq-row[data-row="${row}"]`);
    rowEl?.classList.toggle('is-muted', seqMuted[row]);

    const muteBtn = rowEl?.querySelector('.ml-seq-mute-btn');
    muteBtn?.classList.toggle('is-muted', seqMuted[row]);
    muteBtn?.setAttribute('aria-pressed', seqMuted[row] ? 'true' : 'false');

    for (let step = 0; step < SEQ_STEPS; step++) {
      const btn = seqGetBtn(row, step);
      if (!btn) continue;
      btn.classList.toggle('on', seqGrid[row][step]);
      btn.setAttribute('aria-pressed', seqGrid[row][step] ? 'true' : 'false');
    }
  }
}

function markSequencerCustom(message = 'Custom pattern · saved automatically.') {
  seqGroove = 'custom';
  if (els.seqGroove) els.seqGroove.value = 'custom';
  setSequencerMessage(message);
  saveSequencerSession();
}

function applyGroovePreset(id) {
  const preset = GROOVE_PRESETS[id];
  if (!preset) return;

  seqGrid = preset.grid.map(row => [...row]);
  seqMuted.fill(false);
  seqBpm = preset.bpm;
  seqSwing = preset.swing;
  seqGroove = id;

  els.seqBpmSlider.value = String(seqBpm);
  els.seqBpmVal.textContent = String(seqBpm);
  els.seqSwingSlider.value = String(seqSwing);
  els.seqSwingVal.textContent = `${seqSwing}%`;
  renderSequencerState();
  setSequencerMessage(`${preset.name} loaded at ${seqBpm} BPM · ${seqSwing}% swing.`);
  saveSequencerSession();
}

function makeGrooveVariation() {
  const candidates = [
    [0, 3], [0, 6], [0, 10], [0, 14],
    [1, 3], [1, 11], [1, 15],
    [2, 1], [2, 5], [2, 9], [2, 13], [2, 15],
    [3, 4], [3, 12], [4, 6], [4, 14], [5, 7], [5, 15],
    [6, 2], [6, 7], [6, 11], [6, 15],
  ];
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  shuffled.slice(0, 6).forEach(([row, step]) => {
    seqGrid[row][step] = !seqGrid[row][step];
  });
  renderSequencerState();
  markSequencerCustom('Fresh variation created · six off-beat choices changed.');
}

function buildSeqGrid() {
  const container = els.seqGrid;
  if (!container) return;
  container.innerHTML = '';

  // ── Beat ruler ──
  const ruler = document.createElement('div');
  ruler.className = 'ml-seq-row ml-seq-ruler-row';

  const rulerHead = document.createElement('div');
  rulerHead.className = 'ml-seq-track-head';
  ruler.appendChild(rulerHead);

  const rulerSteps = document.createElement('div');
  rulerSteps.className = 'ml-seq-steps';
  for (let step = 0; step < SEQ_STEPS; step++) {
    if (step > 0 && step % 4 === 0) {
      const gap = document.createElement('span');
      gap.className = 'ml-seq-beat-gap';
      rulerSteps.appendChild(gap);
    }
    const cell = document.createElement('span');
    cell.className = 'ml-seq-ruler-cell' + (step % 4 === 0 ? ' is-beat' : '');
    cell.textContent = step % 4 === 0 ? String(step / 4 + 1) : '·';
    rulerSteps.appendChild(cell);
  }
  ruler.appendChild(rulerSteps);
  container.appendChild(ruler);

  // ── Track rows ──
  SEQ_DRUMS.forEach((drum, rowIdx) => {
    const row = document.createElement('div');
    row.className = 'ml-seq-row';
    row.dataset.row = String(rowIdx);
    row.style.setProperty('--seq-track-color', SEQ_COLORS[rowIdx]);

    // Track head: dot + name + mute button
    const head = document.createElement('div');
    head.className = 'ml-seq-track-head';

    const dot = document.createElement('span');
    dot.className = 'ml-seq-track-dot';
    dot.style.background = SEQ_COLORS[rowIdx];
    head.appendChild(dot);

    const name = document.createElement('span');
    name.className = 'ml-seq-track-name';
    name.textContent = SEQ_LABELS[rowIdx];
    head.appendChild(name);

    const muteBtn = document.createElement('button');
    muteBtn.type = 'button';
    muteBtn.className = 'ml-seq-mute-btn';
    muteBtn.textContent = 'M';
    muteBtn.title = `Mute ${SEQ_LABELS[rowIdx]}`;
    muteBtn.setAttribute('aria-label', `Mute ${SEQ_LABELS[rowIdx]}`);
    muteBtn.setAttribute('aria-pressed', 'false');
    muteBtn.addEventListener('click', () => {
      seqMuted[rowIdx] = !seqMuted[rowIdx];
      muteBtn.classList.toggle('is-muted', seqMuted[rowIdx]);
      muteBtn.setAttribute('aria-pressed', seqMuted[rowIdx] ? 'true' : 'false');
      row.classList.toggle('is-muted', seqMuted[rowIdx]);
      saveSequencerSession();
    });
    head.appendChild(muteBtn);

    row.appendChild(head);

    const stepsWrap = document.createElement('div');
    stepsWrap.className = 'ml-seq-steps';

    for (let step = 0; step < SEQ_STEPS; step++) {
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
      btn.setAttribute('aria-label', `${SEQ_LABELS[rowIdx]} step ${step + 1}`);
      const initOn = seqGrid[rowIdx][step];
      if (initOn) btn.classList.add('on');
      btn.setAttribute('aria-pressed', initOn ? 'true' : 'false');

      btn.addEventListener('click', () => {
        seqGrid[rowIdx][step] = !seqGrid[rowIdx][step];
        btn.classList.toggle('on', seqGrid[rowIdx][step]);
        btn.setAttribute('aria-pressed', seqGrid[rowIdx][step] ? 'true' : 'false');
        markSequencerCustom();
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
    const transport = document.getElementById('seqTransport');
    if (transport) transport.textContent = `${Math.floor(step / 4) + 1}.${(step % 4) + 1}`;
  }, msUntilBeat);
  seqVisualTimers.push(timerId);

  // Schedule audio exactly on the audio clock
  for (let r = 0; r < SEQ_DRUMS.length; r++) {
    if (!seqMuted[r] && seqGrid[r][step]) triggerDrum(SEQ_DRUMS[r], time);
  }
}

function advanceStep() {
  const secondsPer16th = 60.0 / seqBpm / 4;
  // 50% is straight timing. Higher values lengthen the first half of each
  // eighth-note pair and shorten the second while preserving the bar length.
  const swingRatio = seqSwing / 50;
  const stepDuration = seqStep % 2 === 0
    ? secondsPer16th * swingRatio
    : secondsPer16th * (2 - swingRatio);
  nextStepTime += stepDuration;
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
  if (audioCtx.state !== 'running') audioCtx.resume();
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
  const transport = document.getElementById('seqTransport');
  if (transport) transport.textContent = '1.1';
}

function seqClearAll() {
  for (let r = 0; r < SEQ_DRUMS.length; r++) seqGrid[r].fill(false);
  for (const btn of els.seqGrid.querySelectorAll('.ml-seq-step')) {
    btn.classList.remove('on');
    btn.setAttribute('aria-pressed', 'false');
  }
  markSequencerCustom('Blank pattern ready · add steps to build a new groove.');
}

// ───── Event listeners ─────
els.enableAudio.addEventListener('click', enableAudio);
els.enableMidi.addEventListener('click',  enableMidi);
els.midiIn.addEventListener('change',    (e) => setMidiInput(e.target.value));
els.preset.addEventListener('change',    () => {
  releasePianoPointer();
  updateHud(`Now Playing: idle · Frequency: — · Waveform: ${currentWaveformLabel()}`);
});

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
  saveSequencerSession();
});

els.seqSwingSlider.addEventListener('input', (e) => {
  seqSwing = Number(e.target.value);
  els.seqSwingVal.textContent = `${seqSwing}%`;
  saveSequencerSession();
});

els.seqGroove.addEventListener('change', (e) => {
  if (e.target.value === 'custom') {
    markSequencerCustom();
    return;
  }
  applyGroovePreset(e.target.value);
});

els.seqVariation.addEventListener('click', makeGrooveVariation);

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
    line.setAttribute('stroke', 'var(--border-subtle)');
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
      path.setAttribute('class', `fifths-segment${isMinor ? ' is-minor' : ''}`);
      path.style.setProperty('--fifths-hue', String(hue));

      const textR = r2 + (r1 - r2) / 2;
      const text  = makeSvg('text');
      text.setAttribute('x', cx + textR * Math.cos(aMid));
      text.setAttribute('y', cy + textR * Math.sin(aMid) + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'fifths-text');
      text.setAttribute('font-size', isMinor ? '13' : '15');
      text.setAttribute('aria-hidden', 'true');
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
  centerCircle.setAttribute('fill', '#f8fafc');
  centerCircle.setAttribute('stroke', '#334155');
  svg.appendChild(centerCircle);

  const centerText = makeSvg('text');
  centerText.setAttribute('x', cx);
  centerText.setAttribute('y', cy + 5);
  centerText.setAttribute('text-anchor', 'middle');
  centerText.setAttribute('class', 'fifths-center-label');
  centerText.setAttribute('font-size', '13');
  centerText.setAttribute('aria-hidden', 'true');
  centerText.textContent = '5ths';
  svg.appendChild(centerText);
}

let fifthsReleaseTimers = [];

function spellChordTone(pitchClass, letter) {
  const naturalPitchClasses = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const difference = (pitchClass - naturalPitchClasses[letter] + 12) % 12;
  const accidental = { 0: '', 1: '♯', 2: '𝄪', 10: '𝄫', 11: '♭' }[difference] || '';
  return `${letter}${accidental}`;
}

function spellTriad(rootLabel, rootPitchClass, isMinor) {
  const rootLetterIndex = LETTER_TO_INDEX[rootLabel[0]];
  const intervals = isMinor ? [0, 3, 7] : [0, 4, 7];
  return intervals.map((interval, index) => {
    const letter = NOTE_LETTERS[(rootLetterIndex + (index * 2)) % NOTE_LETTERS.length];
    return spellChordTone((rootPitchClass + interval) % 12, letter);
  });
}

function playChordFromCircle(item, isMinor, groupEl) {
  ensureAudio();
  if (audioCtx.state !== 'running') audioCtx.resume();

  // Clear active state and pending release timers
  document.querySelectorAll('.fifths-group').forEach(g => g.classList.remove('active'));
  fifthsReleaseTimers.forEach(id => clearTimeout(id));
  fifthsReleaseTimers = [];

  // Release every tracked voice before clearing the bridge state. Previously,
  // cancelling the old timer and then clearing activeNotes orphaned oscillators,
  // leaving notes droning after another Circle of Fifths segment was selected.
  const soundingNotes = new Set([
    ...bridgeState.activeNotes,
    ...activeVoices.keys(),
  ]);
  soundingNotes.forEach((note) => os_releaseNote(note));
  bridgeState.activeTimers.forEach((timerId) => clearTimeout(timerId));
  bridgeState.activeTimers.clear();

  // Also clear any piano highlights from previous chord
  for (const [note, key] of pianoState.keyByNote) {
    key.classList.remove('is-active');
  }
  bridgeState.activeNotes.clear();
  highlightTheoryNotes([], false);

  groupEl.classList.add('active');

  // Chord intervals: major 0-4-7, minor 0-3-7
  const intervals = isMinor ? [0, 3, 7] : [0, 4, 7];
  const chordPitchRoot = isMinor ? (item.root + 9) % 12 : item.root;
  const midiRoot = 60 + chordPitchRoot;

  const chordNotes = intervals.map(iv => midiRoot + iv);
  const chordLabel = isMinor ? item.minor : item.major;
  const chordType  = isMinor ? 'minor' : 'major';
  const rootLabel = isMinor ? item.minor.replace(/m$/, '') : item.major;
  const noteNames = spellTriad(rootLabel, chordPitchRoot, isMinor).join(' – ');

  os_triggerChord(chordNotes, {
    duration: 700,
    label: `${chordLabel} ${chordType} chord`,
    solfege: isMinor ? 'Do-Me-Sol' : 'Do-Mi-Sol'
  });

  // Update info display
  const display = document.getElementById('fifthsChordDisplay');
  if (display) {
    display.innerHTML = `
      <span class="chord-name">${chordLabel}</span>
      <span class="chord-notes">${chordType} · ${noteNames}</span>
    `;
  }
}

// ───── Key-centred scale practice ─────
const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_SCALE_FINGERING = {
  C:  { rh: [1,2,3,1,2,3,4,1,2,3,1,2,3,4,5], lh: [5,4,3,2,1,3,2,1,4,3,2,1,3,2,1] },
  G:  { rh: [1,2,3,1,2,3,4,1,2,3,1,2,3,4,5], lh: [5,4,3,2,1,3,2,1,4,3,2,1,3,2,1] },
  D:  { rh: [1,2,3,1,2,3,4,1,2,3,1,2,3,4,5], lh: [5,4,3,2,1,3,2,1,4,3,2,1,3,2,1] },
  A:  { rh: [1,2,3,1,2,3,4,1,2,3,1,2,3,4,5], lh: [5,4,3,2,1,3,2,1,4,3,2,1,3,2,1] },
  E:  { rh: [1,2,3,1,2,3,4,1,2,3,1,2,3,4,5], lh: [5,4,3,2,1,3,2,1,4,3,2,1,3,2,1] },
  B:  { rh: [1,2,3,1,2,3,4,1,2,3,1,2,3,4,5], lh: [4,3,2,1,4,3,2,1,3,2,1,4,3,2,1] },
  'F#': { rh: [2,3,4,1,2,3,1,2,3,4,1,2,3,1,2], lh: [4,3,2,1,3,2,1,4,3,2,1,3,2,1,3] },
  F:  { rh: [1,2,3,4,1,2,3,1,2,3,4,1,2,3,4], lh: [5,4,3,2,1,3,2,1,4,3,2,1,3,2,1] },
  Bb: { rh: [2,1,2,3,1,2,3,4,1,2,3,1,2,3,4], lh: [3,2,1,4,3,2,1,3,2,1,4,3,2,1,3] },
  Eb: { rh: [3,1,2,3,4,1,2,3,1,2,3,4,1,2,3], lh: [3,2,1,4,3,2,1,3,2,1,4,3,2,1,3] },
  Ab: { rh: [3,4,1,2,3,1,2,3,4,1,2,3,1,2,3], lh: [3,2,1,4,3,2,1,3,2,1,4,3,2,1,3] },
  Db: { rh: [2,3,1,2,3,4,1,2,3,1,2,3,4,1,2], lh: [3,2,1,4,3,2,1,3,2,1,4,3,2,1,3] },
};
const ONE_OCTAVE_RH_FINAL_FINGER = { C: 5, G: 5, D: 5, A: 5, E: 5, B: 5, F: 4 };

function majorScaleSpellings() {
  const key = currentNotationKey();
  const tonicLetterIndex = LETTER_TO_INDEX[notationState.key[0]];
  return MAJOR_SCALE_STEPS.map((step, degree) => {
    const letter = NOTE_LETTERS[(tonicLetterIndex + degree) % 7];
    return spellChordTone((key.root + step) % 12, letter);
  });
}

function scalePracticeMidis(twoOctaves) {
  const tonicMidi = 60 + currentNotationKey().root;
  const offsets = twoOctaves
    ? [...MAJOR_SCALE_STEPS, ...MAJOR_SCALE_STEPS.map(step => step + 12), 24]
    : [...MAJOR_SCALE_STEPS, 12];
  return offsets.map(offset => tonicMidi + offset);
}

function scoreKeySignatureMarks(startX = 70, compact = false) {
  const key = currentNotationKey();
  const fullY = key.accidental === 'flat'
    ? [118, 103, 123, 108, 128, 113]
    : [98, 113, 93, 108, 123, 103];
  const symbol = key.accidental === 'flat' ? '♭' : '♯';
  return fullY.slice(0, key.signature).map((y, index) => {
    if (compact) {
      return `<text class="score-key-mark" style="font-size:18px" x="${startX + (index * 9)}" y="${y - 48}">${symbol}</text>`;
    }
    return `<text class="score-key-mark" x="${startX + (index * 15)}" y="${y + 7}">${symbol}</text>`;
  }).join('');
}

function scoreLedgerLines(x, y, topLine = 98, bottomLine = 138) {
  let lines = '';
  if (y < topLine) {
    for (let ledgerY = topLine - 10; ledgerY >= y; ledgerY -= 10) {
      lines += `<line class="score-ledger" x1="${x - 13}" x2="${x + 13}" y1="${ledgerY}" y2="${ledgerY}"></line>`;
    }
  } else if (y > bottomLine) {
    for (let ledgerY = bottomLine + 10; ledgerY <= y; ledgerY += 10) {
      lines += `<line class="score-ledger" x1="${x - 13}" x2="${x + 13}" y1="${ledgerY}" y2="${ledgerY}"></line>`;
    }
  }
  return lines;
}

function buildScaleScoreSvg(midis, rhFingers, lhFingers, direction) {
  const key = currentNotationKey();
  const signatureSpace = key.signature * 15;
  const startX = 128 + signatureSpace;
  const width = Math.max(720, startX + 38 + ((midis.length - 1) * 58));
  const spacing = (width - startX - 34) / Math.max(1, midis.length - 1);
  const b4Index = getTheoryNote(71).staffIndex;
  const lines = [98, 108, 118, 128, 138]
    .map(y => `<line class="score-staff-line" x1="86" x2="${width - 22}" y1="${y}" y2="${y}"></line>`).join('');

  const notes = midis.map((midi, index) => {
    const note = getTheoryNote(midi);
    const x = startX + (index * spacing);
    const y = 118 - ((note.staffIndex - b4Index) * 5);
    const stemDown = y < 118;
    const stemX = x + (stemDown ? -6 : 6);
    const stemEnd = y + (stemDown ? 31 : -31);
    const rhY = Math.min(76, Math.max(18, y - 20));
    const lhY = Math.max(164, Math.min(188, y + 28));
    const fill = notationState.intervalColors ? note.intervalColor : '#050505';
    return `${scoreLedgerLines(x, y)}
      <line class="score-stem" x1="${stemX}" x2="${stemX}" y1="${y}" y2="${stemEnd}"></line>
      <ellipse class="score-note-head" cx="${x}" cy="${y}" rx="7" ry="5" fill="${fill}" transform="rotate(-20 ${x} ${y})"></ellipse>
      <text class="score-finger-rh" text-anchor="middle" x="${x}" y="${rhY}">${rhFingers[index]}</text>
      <text class="score-finger-lh" text-anchor="middle" x="${x}" y="${lhY}">${lhFingers[index]}</text>
      <text class="score-note-name" text-anchor="middle" x="${x}" y="218">${note.pitchLabel}</text>`;
  }).join('');

  const spokenNotes = midis.map(midi => getTheoryNote(midi).pitchLabel).join(', ');
  return `<svg class="scale-score-svg" style="width:${width}px" viewBox="0 0 ${width} 236" role="img"
      aria-label="${direction} ${key.label} scale. Notes: ${spokenNotes}. Right hand fingers: ${rhFingers.join(', ')}. Left hand fingers: ${lhFingers.join(', ')}.">
    ${lines}
    <line class="score-barline" x1="86" x2="86" y1="98" y2="138"></line>
    <line class="score-barline" x1="${width - 22}" x2="${width - 22}" y1="98" y2="138"></line>
    <text class="score-clef" x="20" y="140" aria-hidden="true">𝄞</text>
    ${scoreKeySignatureMarks(70)}
    <text class="score-hand-label" x="6" y="25">RH</text>
    <text class="score-hand-label" x="6" y="181">LH</text>
    ${notes}
  </svg>`;
}

function renderScalePractice() {
  if (!els.scalePracticeBoard) return;
  const twoOctaves = els.practiceScale?.value === 'major-2';
  const fingering = MAJOR_SCALE_FINGERING[notationState.key] || MAJOR_SCALE_FINGERING.C;
  const length = twoOctaves ? 15 : 8;
  const midis = scalePracticeMidis(twoOctaves);
  const rh = fingering.rh.slice(0, length);
  const lh = fingering.lh.slice(0, length);
  if (!twoOctaves && ONE_OCTAVE_RH_FINAL_FINGER[notationState.key]) {
    rh[rh.length - 1] = ONE_OCTAVE_RH_FINAL_FINGER[notationState.key];
  }
  const descendingMidis = [...midis].reverse();

  els.scalePracticeBoard.innerHTML = `
    <h3 id="scalePracticeTitle" class="scale-practice-title">${currentNotationKey().label} · ${twoOctaves ? 'two-octave' : 'one-octave'} major scale</h3>
    <p class="scale-practice-hint">Read left to right. Blue numbers above the staff are right-hand fingers; red numbers below are left-hand fingers.</p>
    <div class="scale-score-stack">
      <article class="scale-score-card">
        <div class="scale-score-heading"><strong>Ascending</strong><span>Start slowly · keep an even pulse</span></div>
        <div class="scale-score-scroll">${buildScaleScoreSvg(midis, rh, lh, 'Ascending')}</div>
      </article>
      <article class="scale-score-card">
        <div class="scale-score-heading"><strong>Descending</strong><span>Release tension before changing direction</span></div>
        <div class="scale-score-scroll">${buildScaleScoreSvg(descendingMidis, [...rh].reverse(), [...lh].reverse(), 'Descending')}</div>
      </article>
    </div>
    <p class="score-reading-key"><span><i style="background:#1e56a5"></i>RH fingering</span><span><i style="background:#9b2948"></i>LH fingering</span><span>1 thumb · 2 index · 3 middle · 4 ring · 5 little</span></p>`;
}

function buildDiatonicChordScore(midis) {
  const b4Index = getTheoryNote(71).staffIndex;
  const x = 108;
  const lines = [45, 55, 65, 75, 85]
    .map(y => `<line class="score-staff-line" x1="28" x2="144" y1="${y}" y2="${y}"></line>`).join('');
  const layouts = midis.map(midi => {
    const note = getTheoryNote(midi);
    return { note, y: 65 - ((note.staffIndex - b4Index) * 5), x };
  }).sort((a, b) => b.y - a.y);
  layouts.forEach((layout, index) => {
    if (index > 0 && Math.abs(layout.y - layouts[index - 1].y) <= 5) layout.x += 11;
  });
  const noteMarkup = layouts.map(({ note, x: headX, y }) => {
    const fill = notationState.intervalColors ? note.intervalColor : '#050505';
    return `${scoreLedgerLines(headX, y, 45, 85)}
      <ellipse class="score-note-head" cx="${headX}" cy="${y}" rx="7" ry="5" fill="${fill}" transform="rotate(-20 ${headX} ${y})"></ellipse>`;
  }).join('');
  const minY = Math.min(...layouts.map(layout => layout.y));
  const maxY = Math.max(...layouts.map(layout => layout.y));
  return `<svg class="diatonic-chord-score" viewBox="0 0 152 128" aria-hidden="true" focusable="false">
    ${lines}<line class="score-barline" x1="144" x2="144" y1="45" y2="85"></line>
    <text class="score-clef" style="font-size:42px" x="0" y="88">𝄞</text>
    ${scoreKeySignatureMarks(39, true)}
    <line class="score-stem" x1="114" x2="114" y1="${minY}" y2="${Math.max(maxY + 30, minY + 30)}"></line>
    ${noteMarkup}
  </svg>`;
}

function renderDiatonicChords() {
  if (!els.diatonicChordGrid) return;
  const names = majorScaleSpellings();
  const romans = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const qualities = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
  const functions = ['Tonic', 'Supertonic', 'Mediant', 'Subdominant', 'Dominant', 'Submediant', 'Leading tone'];
  const tonicMidi = 60 + currentNotationKey().root;

  els.diatonicChordGrid.innerHTML = romans.map((roman, degree) => {
    const degreeIndexes = [degree, degree + 2, degree + 4];
    const midis = degreeIndexes.map(index => tonicMidi + MAJOR_SCALE_STEPS[index % 7] + (Math.floor(index / 7) * 12));
    const spelled = degreeIndexes.map(index => names[index % 7]);
    return `<button class="diatonic-chord" type="button" data-midis="${midis.join(',')}"
      data-label="${names[degree]} ${qualities[degree]}" aria-label="Play ${roman}, ${names[degree]} ${qualities[degree]}, ${spelled.join(', ')}">
      ${buildDiatonicChordScore(midis)}
      <strong>${roman} · ${names[degree]}</strong><span class="chord-function">${functions[degree]}</span>
      <span>${qualities[degree]} triad · ${spelled.join('–')}</span>
    </button>`;
  }).join('');

  els.diatonicChordGrid.querySelectorAll('.diatonic-chord').forEach(button => {
    button.addEventListener('click', () => {
      const midis = button.dataset.midis.split(',').map(Number);
      os_triggerChord(midis, { duration: 1800, label: `${button.dataset.label} diatonic triad` });
    });
  });
}

// ───── QWERTY Keyboard Piano ─────
const QWERTY_KEYS = ['a','w','s','e','d','f','t','g','y','h','u','j','k'];
let qwertyBaseNote = 60;
const activeQwertyNotes = new Set();

function qwertyNoteForKey(key) {
  const index = QWERTY_KEYS.indexOf(key.toLowerCase());
  return index < 0 ? null : qwertyBaseNote + index;
}

function qwertyKeyForNote(note) {
  const index = note - qwertyBaseNote;
  return index >= 0 && index < QWERTY_KEYS.length ? QWERTY_KEYS[index].toUpperCase() : '';
}

function updateQwertyHints() {
  pianoState.keyByNote.forEach((key, note) => {
    key.querySelector('.key-qwerty')?.remove();
    const qwertyKey = qwertyKeyForNote(note);
    if (!qwertyKey) return;
    const hint = document.createElement('span');
    hint.className = 'key-qwerty';
    hint.textContent = qwertyKey;
    hint.setAttribute('aria-hidden', 'true');
    key.appendChild(hint);
  });
}

function updateQwertyRangeLabel() {
  if (els.qwertyBaseValue) {
    els.qwertyBaseValue.textContent = `${noteName(qwertyBaseNote)} → ${noteName(qwertyBaseNote + 12)}`;
  }
}

function handleQwertyKeyDown(e) {
  // Ignore key presses if the user is focused on an input field
  if (e.target.matches('input, textarea, select')) return;
  // Prevent re-triggering on key-repeat
  const key = e.key.toLowerCase();
  if (e.repeat || activeQwertyNotes.has(key)) return;

  const note = qwertyNoteForKey(key);
  if (note !== null) {
    e.preventDefault();
    beginPerformanceNote(note, 0.8, { duration: null, hudLabel: `${noteName(note)} · key ${e.key.toUpperCase()}` });
    activeQwertyNotes.add(key);
  }
}

function handleQwertyKeyUp(e) {
  if (e.target.matches('input, textarea, select')) return;

  const key = e.key.toLowerCase();
  const note = qwertyNoteForKey(key);
  if (note !== null && activeQwertyNotes.has(key)) {
    e.preventDefault();
    releasePerformanceNote(note);
    activeQwertyNotes.delete(key);
  }
}

function initQwertyKeyboard() {
  window.addEventListener('keydown', handleQwertyKeyDown);
  window.addEventListener('keyup', handleQwertyKeyUp);
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || e.target.closest('input, textarea, select, button')) return;
    e.preventDefault();
    setSustainPedal(true);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code !== 'Space' || e.target.closest('input, textarea, select, button')) return;
    e.preventDefault();
    setSustainPedal(false);
  });
  els.sustainPedal?.addEventListener('click', () => setSustainPedal(!pianoState.sustain));
  els.qwertyBaseSlider?.addEventListener('input', () => {
    for (const key of Array.from(activeQwertyNotes)) {
      const note = qwertyNoteForKey(key);
      if (note !== null) releasePerformanceNote(note);
    }
    activeQwertyNotes.clear();
    qwertyBaseNote = Number(els.qwertyBaseSlider.value);
    updateQwertyHints();
    updateQwertyRangeLabel();
  });
  updateQwertyHints();
  updateQwertyRangeLabel();
  window.addEventListener('blur', () => {
    setSustainPedal(false);
    for (const note of Array.from(pianoState.heldNotes)) releasePerformanceNote(note);
    activeQwertyNotes.clear();
  });
}

// ───── Chord Theory ─────
const CHORD_FORMULAS = {
  major:     [0, 4, 7],
  minor:     [0, 3, 7],
  diminished: [0, 3, 6],
  augmented:  [0, 4, 8],
  dom7:      [0, 4, 7, 10],
  maj7:      [0, 4, 7, 11],
  min7:      [0, 3, 7, 10],
  minmaj7:   [0, 3, 7, 11],
  sus2:      [0, 2, 7],
  sus4:      [0, 5, 7],
};

const CHORD_DESCRIPTIONS = {
  major:     'Bright, happy. Root + Major 3rd (4 semitones) + Perfect 5th (7 semitones)',
  minor:     'Sad, dark. Root + Minor 3rd (3 semitones) + Perfect 5th (7 semitones)',
  diminished: 'Tense, unstable. Root + Minor 3rd (3) + Diminished 5th (6 semitones)',
  augmented:  'Dreamlike, unresolved. Root + Major 3rd (4) + Augmented 5th (8 semitones)',
  dom7:      'Tension + resolution. Major triad + Minor 7th (10 semitones). Pulls toward the next chord.',
  maj7:      'Sophisticated, dreamy. Major triad + Major 7th (11 semitones)',
  min7:      'Soulful, mellow. Minor triad + Minor 7th (10 semitones)',
  minmaj7:   'Rare, sophisticated. Minor triad + Major 7th (11 semitones)',
  sus2:      'Suspended, unresolved. Replace the 3rd with a 2nd',
  sus4:      'Suspended, unresolved. Replace the 3rd with a 4th',
};

const INTERVAL_NAMES = {
  0: 'Root',
  2: 'Major 2nd',
  3: 'Minor 3rd',
  4: 'Major 3rd',
  5: 'Perfect 4th',
  6: 'Diminished 5th',
  7: 'Perfect 5th',
  8: 'Augmented 5th',
  10: 'Minor 7th',
  11: 'Major 7th',
};

function buildChordTheoryUI() {
  const rootSelect = document.getElementById('chordRoot');
  const typeSelect = document.getElementById('chordType');
  const playBtn = document.getElementById('playChordBtn');

  function updateChordDisplay() {
    const root = parseInt(rootSelect.value);
    const type = typeSelect.value;
    const intervals = CHORD_FORMULAS[type];

    const rootName = NOTE_NAMES[root];
    const typeLabel = typeSelect.options[typeSelect.selectedIndex].text.split('(')[0].trim();
    const chordName = `${rootName} ${typeLabel}`;

    const chordNotes = intervals.map(iv => root + iv);
    const noteNames = chordNotes.map(n => NOTE_NAMES[n % 12]).join(' – ');

    const intervalNames = intervals
      .map(iv => `${INTERVAL_NAMES[iv]} (${iv})`)
      .join(' · ');

    document.getElementById('chordDisplayName').textContent = chordName;
    document.getElementById('chordDisplayNotes').textContent = noteNames;
    document.getElementById('chordDisplayIntervals').textContent = intervalNames;
  }

  function playChord() {
    const root = parseInt(rootSelect.value);
    const type = typeSelect.value;
    const intervals = CHORD_FORMULAS[type];

    const midiRoot = Math.max(36, Math.min(60 + root, 72));
    const chordNotes = intervals.map(iv => midiRoot + iv);

    const rootName = NOTE_NAMES[root];
    const typeLabel = typeSelect.options[typeSelect.selectedIndex].text.split('(')[0].trim();

    os_triggerChord(chordNotes, {
      duration: 2500,
      label: `${rootName} ${typeLabel}`,
    });
  }

  rootSelect.addEventListener('change', updateChordDisplay);
  typeSelect.addEventListener('change', updateChordDisplay);
  playBtn.addEventListener('click', playChord);

  updateChordDisplay();
}

window.os_triggerNote = os_triggerNote;
window.os_releaseNote = os_releaseNote;

// ───── Initialise ─────
buildPianoRoll();
wirePianoRollPointer();
restoreSequencerSession();
buildSeqGrid();
renderSequencerState();
initModularPatchbay();
initCircleOfFifths();
initTheoryMap();
initQwertyKeyboard();
buildChordTheoryUI();
readAdsr();   // set initial display values from slider defaults
setStatus();
