/* drop-voicings-core.mjs — pure voicing math for the "Drop Voicings" lesson.
   No DOM, no audio: chord spelling, close/drop voicings, guitar fingerings,
   smooth voice leading, and the answer checker for the Build-it challenge.
   Everything is MIDI numbers (60 = middle C) plus a spelled name for display. */

const LETTERS = 'CDEFGAB';
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const ACC_SYMBOL = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };

export const QUALITIES = {
  maj7: { id: 'maj7', symbol: 'maj7', name: 'major 7th', steps: [0, 4, 7, 11], labels: ['R', '3', '5', '7'] },
  dom7: { id: 'dom7', symbol: '7', name: 'dominant 7th', steps: [0, 4, 7, 10], labels: ['R', '3', '5', '♭7'] },
  m7: { id: 'm7', symbol: 'm7', name: 'minor 7th', steps: [0, 3, 7, 10], labels: ['R', '♭3', '5', '♭7'] },
  m7b5: { id: 'm7b5', symbol: 'm7♭5', name: 'half-diminished 7th', steps: [0, 3, 6, 10], labels: ['R', '♭3', '♭5', '♭7'] }
};

const CHORD_TONE_LETTERS = [0, 2, 4, 6]; // root, 3rd, 5th, 7th sit on every other letter

export const ROOTS = [
  { pc: 0, label: 'C' }, { pc: 1, label: 'D♭' }, { pc: 2, label: 'D' }, { pc: 3, label: 'E♭' },
  { pc: 4, label: 'E' }, { pc: 5, label: 'F' }, { pc: 6, label: 'F♯' }, { pc: 7, label: 'G' },
  { pc: 8, label: 'A♭' }, { pc: 9, label: 'A' }, { pc: 10, label: 'B♭' }, { pc: 11, label: 'B' }
];

/* Spellings to try for each pitch class, most-preferred first (ties go to the first). */
const ROOT_SPELLINGS = [
  ['C'], ['D♭', 'C♯'], ['D'], ['E♭', 'D♯'], ['E'], ['F'], ['F♯', 'G♭'], ['G'], ['A♭', 'G♯'], ['A'], ['B♭', 'A♯'], ['B']
];

export const VOICING_TYPES = {
  close: { id: 'close', label: 'Close position', drops: [], rule: 'All four notes stacked as tightly as they can go, inside one octave.' },
  drop2: { id: 'drop2', label: 'Drop 2', drops: [2], rule: 'Count voices from the top. Move the 2nd one down an octave.' },
  drop3: { id: 'drop3', label: 'Drop 3', drops: [3], rule: 'Count voices from the top. Move the 3rd one down an octave.' },
  drop24: { id: 'drop24', label: 'Drop 2 & 4', drops: [2, 4], rule: 'Count voices from the top. Move the 2nd and the 4th down an octave.' }
};

const mod = (n, m) => ((n % m) + m) % m;

function parseNoteName(name) {
  const letter = LETTERS.indexOf(name[0]);
  const acc = name[1] === '♯' ? 1 : name[1] === '♭' ? -1 : 0;
  return { letter, acc };
}

export function accidentalSymbol(acc) { return ACC_SYMBOL[String(acc)] ?? ''; }

/* Spell a seventh chord. Tries each name for the root (C♯ or D♭?) and keeps the one
   with the fewest accidentals and no double sharps/flats. */
export function spellChord(rootPc, qualityId) {
  const q = QUALITIES[qualityId];
  if (!q) throw new Error(`Unknown chord quality: ${qualityId}`);
  let best = null;
  for (const rootName of ROOT_SPELLINGS[mod(rootPc, 12)]) {
    const r = parseNoteName(rootName);
    let cost = 0;
    const tones = q.steps.map((step, j) => {
      const letter = mod(r.letter + CHORD_TONE_LETTERS[j], 7);
      const targetPc = mod(rootPc + step, 12);
      let acc = mod(targetPc - NATURAL[letter] + 6, 12) - 6;
      cost += Math.abs(acc) + (Math.abs(acc) > 1 ? 10 : 0);
      return { degree: j, letter, acc, pc: targetPc, name: LETTERS[letter] + accidentalSymbol(acc), label: q.labels[j] };
    });
    if (!best || cost < best.cost) best = { cost, rootName, tones };
  }
  return { rootName: best.rootName, symbol: best.rootName + q.symbol, tones: best.tones };
}

function writtenOctave(midi, letter, acc) { return (midi - 12 - NATURAL[letter] - acc) / 12; }

/* Close position, ascending, for inversion k (0 = root on the bottom). */
function closeNotes(rootPc, q, inversion) {
  const rootMidi = 48 + mod(rootPc, 12);
  const notes = q.steps.map((step, degree) => ({ midi: rootMidi + step, degree }));
  for (let i = 0; i < inversion; i++) notes[i].midi += 12;
  return notes.sort((a, b) => a.midi - b.midi);
}

/* Drop voices counted from the top (1 = top). Indices are taken before anything moves. */
function applyDrops(close, drops) {
  const notes = close.map((n) => ({ ...n, dropped: false, from: null }));
  const idx = drops.map((d) => notes.length - d);
  for (const i of idx) { notes[i].from = notes[i].midi; notes[i].midi -= 12; notes[i].dropped = true; }
  return notes.sort((a, b) => a.midi - b.midi);
}

/* The voicing you get by stacking close position in a given inversion (0 = root on the bottom),
   then applying the drops. The lowest note lands between `low` and `low + 11`. */
export function voicingFromInversion({ rootPc, quality, type = 'drop2', inversion = 0, low = 48 }) {
  const q = QUALITIES[quality];
  const t = VOICING_TYPES[type];
  if (!q || !t) throw new Error(`Unknown voicing request: ${quality} / ${type}`);
  const spelling = spellChord(rootPc, quality);
  const close = closeNotes(rootPc, q, inversion);
  const voiced = applyDrops(close, t.drops);
  const shift = 12 * Math.ceil((low - voiced[0].midi) / 12);
  const dress = (n) => {
    const midi = n.midi + shift, tone = spelling.tones[n.degree];
    return {
      midi, degree: n.degree, letter: tone.letter, acc: tone.acc, name: tone.name, label: tone.label,
      octave: writtenOctave(midi, tone.letter, tone.acc),
      dropped: !!n.dropped, from: n.from == null ? null : n.from + shift
    };
  };
  return describe({
    rootPc, quality, type, bass: voiced[0].degree, inversion, spelling,
    notes: voiced.map(dress), source: close.map((n) => dress({ ...n, dropped: false, from: null }))
  });
}

/* The voicing of a chord with a given type and a given chord tone (0 = root … 3 = 7th) on the bottom. */
export function buildVoicing({ rootPc, quality, type = 'drop2', bass = 0, low = 48 }) {
  for (let inversion = 0; inversion < 4; inversion++) {
    const v = voicingFromInversion({ rootPc, quality, type, inversion, low });
    if (v.bass === bass) return v;
  }
  throw new Error(`No ${type} voicing of ${quality} has chord tone ${bass} on the bottom`);
}

function describe(v) {
  const midis = v.notes.map((n) => n.midi);
  return {
    ...v,
    symbol: v.spelling.symbol,
    span: midis[midis.length - 1] - midis[0],
    gaps: midis.slice(1).map((m, i) => m - midis[i]),
    code: v.notes.map((n) => n.label).join(' · ')
  };
}

/* Move a whole voicing by whole octaves (keeps spelling, drop marks and the close source). */
export function shiftVoicing(v, octaves) {
  const by = 12 * octaves;
  const move = (n) => ({ ...n, midi: n.midi + by, from: n.from == null ? null : n.from + by, octave: n.octave + octaves });
  return describe({ ...v, notes: v.notes.map(move), source: v.source.map(move) });
}

/* Every voicing a chord has for one type, one per bass note. */
export function allVoicings(rootPc, quality, type, low = 48) {
  return [0, 1, 2, 3].map((bass) => buildVoicing({ rootPc, quality, type, bass, low }));
}

/* ---------------------------------------------------------------- voice leading */

const WINDOW = { lowest: 43, highest: 81, center: 62 };

function candidates(rootPc, quality, type) {
  const out = [];
  for (let bass = 0; bass < 4; bass++) {
    const base = buildVoicing({ rootPc, quality, type, bass, low: 48 });
    for (const oct of [-1, 0, 1]) {
      const v = oct ? shiftVoicing(base, oct) : base;
      const lo = v.notes[0].midi, hi = v.notes[3].midi;
      if (lo >= WINDOW.lowest && hi <= WINDOW.highest) out.push(v);
    }
  }
  return out;
}

const centerOf = (v) => v.notes.reduce((s, n) => s + n.midi, 0) / v.notes.length;

/* Pick the voicing (any bass note, any octave) whose voices travel least from the previous chord. */
export function nearestVoicing(prev, rootPc, quality, type) {
  let best = null;
  for (const v of candidates(rootPc, quality, type)) {
    const motion = prev ? v.notes.map((n, i) => n.midi - prev.notes[i].midi) : v.notes.map(() => 0);
    const cost = motion.reduce((s, m) => s + Math.abs(m), 0);
    const drift = Math.abs(centerOf(v) - WINDOW.center);
    if (!best || cost < best.cost || (cost === best.cost && drift < best.drift)) best = { v, motion, cost, drift };
  }
  return { ...best.v, motion: best.motion, moved: best.cost };
}

/* The same progression, but every chord keeps the root on the bottom near the same register. */
export function rootBassVoicing(rootPc, quality, type) {
  const v = buildVoicing({ rootPc, quality, type, bass: 0, low: 48 });
  return v;
}

export const PROGRESSIONS = {
  ii_V_I: { id: 'ii_V_I', label: 'ii – V – I (major)', key: 0, chords: [{ off: 2, q: 'm7' }, { off: 7, q: 'dom7' }, { off: 0, q: 'maj7' }] },
  ii_V_i: { id: 'ii_V_i', label: 'ii – V – i (minor)', key: 9, chords: [{ off: 2, q: 'm7b5' }, { off: 7, q: 'dom7' }, { off: 0, q: 'm7' }] },
  turnaround: { id: 'turnaround', label: 'I – vi – ii – V turnaround', key: 0, chords: [{ off: 0, q: 'maj7' }, { off: 9, q: 'm7' }, { off: 2, q: 'm7' }, { off: 7, q: 'dom7' }] },
  leaves: { id: 'leaves', label: 'Autumn Leaves changes (minor key)', key: 7, chords: [{ off: 5, q: 'm7' }, { off: 10, q: 'dom7' }, { off: 3, q: 'maj7' }, { off: 8, q: 'maj7' }, { off: 2, q: 'm7b5' }, { off: 7, q: 'dom7' }, { off: 0, q: 'm7' }] }
};

export function progressionChords(progressionId, keyPc) {
  return PROGRESSIONS[progressionId].chords.map((c) => ({ rootPc: mod(keyPc + c.off, 12), quality: c.q }));
}

export function smoothProgression(chords, type) {
  const out = [];
  let prev = null;
  for (const c of chords) { prev = nearestVoicing(prev, c.rootPc, c.quality, type); out.push(prev); }
  return out;
}

export function jumpProgression(chords, type) {
  const out = chords.map((c) => rootBassVoicing(c.rootPc, c.quality, type));
  return out.map((v, i) => {
    const motion = i ? v.notes.map((n, j) => n.midi - out[i - 1].notes[j].midi) : v.notes.map(() => 0);
    return { ...v, motion, moved: motion.reduce((s, m) => s + Math.abs(m), 0) };
  });
}

export const totalMotion = (voicings) => voicings.reduce((s, v) => s + (v.moved || 0), 0);

/* ---------------------------------------------------------------- guitar */

export const OPEN_STRINGS = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 }; // E2 A2 D3 G3 B3 E4
export const GUITAR_SETS = {
  drop2: [[6, 5, 4, 3], [5, 4, 3, 2], [4, 3, 2, 1]],
  drop3: [[6, 4, 3, 2], [5, 3, 2, 1]]
};
const MAX_FRET = 15;

/* Frets for a voicing on four strings (low → high). Pitches are exact; only the octave is free. */
export function guitarShape(v, stringSet) {
  let best = null;
  for (let n = -4; n <= 4; n++) {
    const frets = v.notes.map((note, j) => note.midi + 12 * n - OPEN_STRINGS[stringSet[j]]);
    if (frets.some((f) => f < 0 || f > MAX_FRET)) continue;
    const fretted = frets.filter((f) => f > 0);
    const lo = fretted.length ? Math.min(...fretted) : 0, hi = fretted.length ? Math.max(...fretted) : 0;
    if (hi - lo > 4) continue;
    const top = Math.max(...frets);
    if (!best || top < best.top) best = { top, frets, lo, hi, shift: n };
  }
  if (!best) return null;
  const tab = [null, null, null, null, null, null]; // index 0 = string 6 … index 5 = string 1
  stringSet.forEach((s, j) => { tab[6 - s] = best.frets[j]; });
  return {
    stringSet, frets: best.frets, tab, lo: best.lo, hi: best.hi,
    midi: v.notes.map((note) => note.midi + 12 * best.shift),
    text: tab.map((f) => (f == null ? 'x' : String(f))).join(' ')
  };
}

/* ---------------------------------------------------------------- build-it checker */

/* Compare a student's keys with a target. Octave placement is free; the spacing is not. */
export function checkAttempt(selected, target) {
  const sel = [...new Set(selected)].sort((a, b) => a - b);
  const want = target.notes.map((n) => n.midi);
  if (sel.length !== 4) return { ok: false, reason: 'count', message: `A seventh chord voicing has 4 notes. You have ${sel.length}.` };
  const wantPcs = new Set(want.map((m) => mod(m, 12)));
  const selPcs = sel.map((m) => mod(m, 12));
  if (new Set(selPcs).size !== 4 || !selPcs.every((p) => wantPcs.has(p))) {
    return { ok: false, reason: 'notes', message: `Those notes are not the four chord tones of ${target.symbol}. Spell it first: ${target.notes.map((n) => n.name).sort().join(' ')}.` };
  }
  const shape = (arr) => arr.map((m) => m - arr[0]).join(',');
  const sameBass = mod(sel[0], 12) === mod(want[0], 12);
  const sameShape = shape(sel) === shape(want);
  if (sameBass && sameShape) return { ok: true, reason: 'ok', message: 'Exactly right.' };
  if (!sameBass) return { ok: false, reason: 'bass', message: `Right notes, wrong bottom note. This voicing has ${target.notes[0].name} on the bottom.` };
  return { ok: false, reason: 'spacing', message: `Right notes and bass, but the spacing is off. Start from close position and move only the voice the rule names.` };
}
