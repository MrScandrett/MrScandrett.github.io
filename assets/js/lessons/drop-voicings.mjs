/* drop-voicings.mjs — UI for the "Drop Voicings" lesson.
   All voicing math lives in drop-voicings-core.mjs (tested); this file draws it and plays it. */
import {
  QUALITIES, ROOTS, VOICING_TYPES, PROGRESSIONS, GUITAR_SETS,
  spellChord, voicingFromInversion, buildVoicing, progressionChords, smoothProgression, jumpProgression,
  totalMotion, guitarShape, checkAttempt
} from './drop-voicings-core.mjs';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const mfreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const ORDINAL = ['root', '3rd', '5th', '7th'];
const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const midiName = (m) => SHARP_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

const state = { rootPc: 0, quality: 'maj7', names: true, inversion: 0, dropType: 'drop2', step: 1 };

const current = (type, inversion) => voicingFromInversion({ rootPc: state.rootPc, quality: state.quality, type, inversion });
const chordSymbol = () => spellChord(state.rootPc, state.quality).symbol;

/* ---------------------------------------------------------------- audio */
const Sound = (() => {
  let ctx = null, out = null, volume = 0.7;
  const live = new Set(), timers = new Set();
  function get() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { ctx = new AC(); }
      out = ctx.createGain();
      out.gain.value = volume;
      const comp = ctx.createDynamicsCompressor();
      out.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const PARTIALS = {
    keys: [[1, 1], [2, 0.38], [3, 0.2], [4, 0.09], [5, 0.04]],
    guitar: [[1, 1], [2, 0.62], [3, 0.36], [4, 0.2], [5, 0.1], [6, 0.05]]
  };
  function tone(freq, { at = 0, dur = 1.8, gain = 0.2, timbre = 'keys' } = {}) {
    const c = get(); if (!c) return;
    const t = c.currentTime + 0.03 + at;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + (timbre === 'guitar' ? 0.004 : 0.008));
    env.gain.exponentialRampToValueAtTime(gain * 0.3, t + 0.35);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    if (timbre === 'guitar') {
      lp.frequency.setValueAtTime(Math.min(7000, freq * 9), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(500, freq * 2.2), t + 0.5);
    } else lp.frequency.value = Math.min(8000, freq * 6 + 900);
    env.connect(lp); lp.connect(out);
    for (const [mult, amp] of PARTIALS[timbre] || PARTIALS.keys) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = freq * mult; g.gain.value = amp;
      o.connect(g); g.connect(env);
      o.start(t); o.stop(t + dur + 0.05);
      live.add(o); o.onended = () => live.delete(o);
    }
  }
  /* mode: 'block' all at once · 'roll' quick strum upward · 'slow' one note at a time */
  function chord(midis, { mode = 'block', at = 0, timbre = 'keys', dur } = {}) {
    const gap = mode === 'slow' ? 0.4 : mode === 'roll' ? 0.07 : 0;
    const gain = 0.34 / Math.sqrt(midis.length);
    midis.forEach((m, i) => tone(mfreq(m), { at: at + i * gap, timbre, gain, dur: dur || (mode === 'slow' ? 2.2 : 1.9) }));
    return midis.length * gap;
  }
  function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
  function stopAll() {
    live.forEach((o) => { try { o.stop(); } catch (e) { /* already stopped */ } });
    live.clear(); timers.forEach(clearTimeout); timers.clear();
    document.dispatchEvent(new CustomEvent('dv:stop'));
  }
  return { tone, chord, later, stopAll, setVolume(v) { volume = v; if (out) out.gain.value = v; }, available: () => !!(window.AudioContext || window.webkitAudioContext) };
})();

/* ---------------------------------------------------------------- keyboard */
function makeKeyboard(host, { lo = 48, hi = 84, onKey, tabbable = false } = {}) {
  const WHITE = [0, 2, 4, 5, 7, 9, 11];
  const W = 30, BW = 18;
  const whites = [];
  for (let m = lo; m <= hi; m++) if (WHITE.includes(m % 12)) whites.push(m);
  host.innerHTML = '';
  host.classList.add('dv-kb');
  host.setAttribute('data-night-keep', '');
  const scroll = document.createElement('div'); scroll.className = 'dv-kb-scroll';
  const inner = document.createElement('div'); inner.className = 'dv-kb-inner'; inner.style.width = whites.length * W + 'px';
  scroll.appendChild(inner); host.appendChild(scroll);
  const keys = new Map();
  const mk = (m, cls, left) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dv-key ' + cls; b.dataset.midi = m;
    b.style.left = left + 'px';
    b.setAttribute('aria-label', midiName(m));
    b.tabIndex = tabbable && m === lo ? 0 : -1;
    b.innerHTML = '<span class="dv-key-text"></span>';
    b.addEventListener('click', () => onKey && onKey(m, b));
    if (tabbable) b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const ms = [...keys.keys()].sort((a, b2) => a - b2);
      const next = ms[ms.indexOf(m) + (e.key === 'ArrowRight' ? 1 : -1)];
      if (next == null) return;
      e.preventDefault(); b.tabIndex = -1; keys.get(next).tabIndex = 0; keys.get(next).focus();
    });
    inner.appendChild(b); keys.set(m, b);
  };
  whites.forEach((m, i) => mk(m, 'dv-white', i * W));
  for (let m = lo; m <= hi; m++) if (!WHITE.includes(m % 12)) mk(m, 'dv-black', (whites.indexOf(m - 1) + 1) * W - BW / 2);
  const clear = () => keys.forEach((b) => {
    b.className = b.className.replace(/\s*(is-on|is-ghost|is-target|is-live|is-picked|is-hint|deg-\d)/g, '');
    b.firstChild.textContent = ''; b.removeAttribute('aria-pressed');
  });
  /* on: voiced notes · ghosts: midis to ring · numbers: {midi: n} · targets: midis to flag as moving */
  function show({ on = [], ghosts = [], numbers = {}, targets = [] } = {}) {
    clear();
    for (const n of on) {
      const b = keys.get(n.midi); if (!b) continue;
      b.classList.add('is-on', 'deg-' + n.degree);
      b.firstChild.textContent = (state.names ? n.name : n.label) + (numbers[n.midi] ? ' ' + '①②③④'[numbers[n.midi] - 1] : '');
      if (targets.includes(n.midi)) b.classList.add('is-target');
    }
    for (const m of ghosts) { const b = keys.get(m); if (b) { b.classList.add('is-ghost'); b.firstChild.textContent = '↓'; } }
  }
  function flash(midis, ms = 700) {
    midis.forEach((m) => { const b = keys.get(m); if (b) { b.classList.add('is-live'); Sound.later(() => b.classList.remove('is-live'), ms); } });
  }
  return { show, flash, keys, clear };
}

/* ---------------------------------------------------------------- staff */
const HS = 6, SP = 12, Y30 = 104;
const yOf = (d) => Y30 - (d - 30) * HS;
const dOf = (n) => n.octave * 7 + n.letter;
const MN = () => window.MusicNotation;

function staffFrame(width) {
  let s = '';
  for (let k = 0; k < 5; k++) {
    for (const base of [30, 18]) s += `<line class="dv-line" x1="6" x2="${width - 6}" y1="${yOf(base + 2 * k)}" y2="${yOf(base + 2 * k)}"/>`;
  }
  s += `<line class="dv-line" x1="6" x2="6" y1="${yOf(38)}" y2="${yOf(18)}"/>`;
  if (MN()) s += MN().clef('treble', 16, yOf(30), HS) + MN().clef('bass', 16, yOf(18), HS);
  return s;
}

function ledgerFor(d, cx) {
  const ys = [];
  if (d >= 40) for (let l = 40; l <= d; l += 2) ys.push(l);
  if (d <= 16) for (let l = 16; l >= d; l -= 2) ys.push(l);
  if (d === 28) ys.push(28);
  return ys.map((l) => `<line class="dv-ledger" x1="${cx - 13}" x2="${cx + 13}" y1="${yOf(l)}" y2="${yOf(l)}"/>`).join('');
}

/* One chord drawn at x = cx. Seconds sit side by side. */
function chordOnStaff(notes, cx, { ghosts = [], numbers = false, targets = [], dim = false } = {}) {
  let s = '';
  const sorted = [...notes].sort((a, b) => a.midi - b.midi);
  const shifted = [];
  sorted.forEach((n, i) => { shifted[i] = i > 0 && dOf(n) - dOf(sorted[i - 1]) === 1 && !shifted[i - 1]; });
  for (const g of ghosts) {
    s += `<ellipse class="dv-head dv-ghost deg-${g.degree}" cx="${cx}" cy="${yOf(dOf({ ...g, octave: g.octave + 1 }))}" rx="7.6" ry="5.6" transform="rotate(-20 ${cx} ${yOf(dOf({ ...g, octave: g.octave + 1 }))})"/>`;
  }
  sorted.forEach((n, i) => {
    const d = dOf(n), x = cx + (shifted[i] ? 14 : 0), y = yOf(d);
    s += ledgerFor(d, x);
    if (n.acc && MN()) s += `<g class="dv-acc">${MN().accidental(n.acc, x - 24, y, SP)}</g>`;
    const cls = `dv-head deg-${n.degree}${targets.includes(n.degree) ? ' is-target' : ''}${dim && n.degree % 2 === 0 ? ' is-dim' : ''}`;
    s += `<g class="${cls}"><ellipse cx="${x}" cy="${y}" rx="7.6" ry="5.6" transform="rotate(-20 ${x} ${y})"/><text x="${x}" y="${y + 3.4}" text-anchor="middle">${n.name[0]}</text></g>`;
    if (numbers) s += `<text class="dv-num" x="${x + 17}" y="${y + 4}">${notes.length - sorted.indexOf(n)}</text>`;
  });
  return s;
}

function drawStaff(host, notes, opts = {}) {
  const w = 230;
  host.innerHTML = `<svg viewBox="0 0 ${w} 214" role="img" aria-label="${opts.label || 'Notes on a grand staff'}" class="dv-staff">${staffFrame(w)}${chordOnStaff(notes, 150, opts)}</svg>`;
}

/* ---------------------------------------------------------------- shared bits */
const degreeButtons = (host, labelFor, value, onPick, name) => {
  host.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dv-seg-btn'; b.setAttribute('aria-pressed', String(i === value));
    b.innerHTML = labelFor(i);
    b.addEventListener('click', () => onPick(i));
    host.appendChild(b);
  }
  host.setAttribute('role', 'group'); if (name) host.setAttribute('aria-label', name);
};
const press = (host, attr, value) => $$('button', host).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value))));
const listNotes = (v) => v.notes.map((n) => n.name + n.octave).join('  ');
const spanText = (span) => (span < 12 ? `${span} semitones, inside one octave` : span === 12 ? 'exactly an octave' : `an octave plus ${span - 12} semitone${span - 12 === 1 ? '' : 's'} (${span} total)`);
const code = (v) => v.notes.map((n) => n.label).join(' · ');

function playVoicing(v, kb, { mode = 'block', timbre = 'keys' } = {}) {
  Sound.stopAll();
  const midis = v.notes.map((n) => n.midi);
  const len = Sound.chord(midis, { mode, timbre });
  if (kb) { kb.flash(midis, 900 + len * 1000); }
  return len;
}

/* ---------------------------------------------------------------- sections */
let kbClose, kbDrop, kbBuild;

function renderClose() {
  const v = current('close', state.inversion);
  drawStaff($('#closeStaff'), v.notes, { label: `${v.symbol} in close position` });
  kbClose.show({ on: v.notes });
  press($('#closeInv'), 'inv', state.inversion);
  const tone = v.notes[0];
  $('#closeStatus').textContent = `${v.symbol}, close position, ${state.inversion === 0 ? 'root position' : ['', '1st inversion', '2nd inversion', '3rd inversion'][state.inversion]}. Bottom to top: ${listNotes(v)}. ${tone.name} (the ${ORDINAL[tone.degree]}) is on the bottom. Reach: ${spanText(v.span)}.`;
}

function renderDrop() {
  const type = state.dropType, t = VOICING_TYPES[type];
  const v = current(type, state.inversion);
  const targets = v.notes.filter((n) => n.dropped).map((n) => n.degree);
  const src = v.source;
  const showSource = state.step < 3;
  const numbers = {};
  src.forEach((n, i) => { numbers[n.midi] = src.length - i; });
  if (showSource) {
    drawStaff($('#dropStaff'), src, { numbers: state.step === 2, targets: state.step === 2 ? targets : [], label: `${v.symbol} in close position` });
    kbDrop.show({ on: src, numbers: state.step === 2 ? numbers : {}, targets: state.step === 2 ? src.filter((n) => targets.includes(n.degree)).map((n) => n.midi) : [] });
  } else {
    drawStaff($('#dropStaff'), v.notes, { ghosts: v.notes.filter((n) => n.dropped), targets, label: `${v.symbol}, ${t.label}` });
    kbDrop.show({ on: v.notes, ghosts: v.notes.filter((n) => n.dropped).map((n) => n.from), targets: v.notes.filter((n) => n.dropped).map((n) => n.midi) });
  }
  press($('#dropType'), 'type', type);
  press($('#dropInv'), 'inv', state.inversion);
  press($('#dropSteps'), 'step', state.step);
  const droppedNames = v.notes.filter((n) => n.dropped).map((n) => n.name).join(' and ');
  const msg = [
    `Step 1 · Stack ${v.symbol} as tightly as possible. Bottom to top: ${src.map((n) => n.name).join(' ')}. Everything fits inside one octave.`,
    `Step 2 · Count the voices from the top: ${src.slice().reverse().map((n, i) => `${i + 1} = ${n.name}`).join(', ')}. ${t.rule} That means ${droppedNames}.`,
    `Step 3 · ${droppedNames} moved down one octave (the ↓ marks where it used to be). Now bottom to top: ${listNotes(v)}. Chord tones in order: ${code(v)}. The top note is still ${v.notes[3].name}. Reach: ${spanText(v.span)}.`
  ];
  $('#dropStatus').textContent = msg[state.step - 1];
  $('#dropRule').textContent = `${t.label}: ${t.rule}`;
  $('#dropCode').textContent = `${chordSymbol()} · ${t.label} · ${code(v)}`;
}

function renderCompare() {
  const host = $('#compareGrid');
  host.innerHTML = '';
  press($('#cmpInv'), 'inv', state.inversion);
  ['close', 'drop2', 'drop3', 'drop24'].forEach((type) => {
    const v = current(type, state.inversion);
    const card = document.createElement('article');
    card.className = 'dv-card';
    card.innerHTML = `<h3>${VOICING_TYPES[type].label}</h3><div class="dv-card-staff" data-night-keep></div>
      <p class="dv-card-notes"><b>${v.notes.map((n) => n.name).join(' ')}</b></p>
      <p class="dv-card-meta">${code(v)}<br>Reach ${v.span} semitones · bass is the ${ORDINAL[v.bass]}</p>
      <button type="button" class="dv-btn">▶ Hear it</button>`;
    drawStaff($('.dv-card-staff', card), v.notes, { ghosts: v.notes.filter((n) => n.dropped), label: `${v.symbol} ${VOICING_TYPES[type].label}` });
    $('button', card).addEventListener('click', () => { Sound.stopAll(); Sound.chord(v.notes.map((n) => n.midi)); $('#compareStatus').textContent = `${v.symbol}, ${VOICING_TYPES[type].label}: ${listNotes(v)}.`; });
    host.appendChild(card);
  });
}

/* guitar */
const gState = { type: 'drop2', set: 0, bass: 2 };
function renderGuitar() {
  const v = buildVoicing({ rootPc: state.rootPc, quality: state.quality, type: gState.type, bass: gState.bass });
  const sets = GUITAR_SETS[gState.type];
  if (gState.set >= sets.length) gState.set = 0;
  const set = sets[gState.set];
  const shape = guitarShape(v, set);
  press($('#gType'), 'type', gState.type);
  const setHost = $('#gSet'); setHost.innerHTML = '';
  sets.forEach((s, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'dv-seg-btn';
    b.setAttribute('aria-pressed', String(i === gState.set)); b.textContent = `Strings ${s.join('-')}`;
    b.addEventListener('click', () => { gState.set = i; renderGuitar(); });
    setHost.appendChild(b);
  });
  degreeButtons($('#gBass'), (i) => `${spellChord(state.rootPc, state.quality).tones[i].name} <small>${QUALITIES[state.quality].labels[i]}</small>`, gState.bass, (i) => { gState.bass = i; renderGuitar(); }, 'Bottom note');
  const board = $('#gBoard');
  if (!shape) {
    board.innerHTML = '';
    $('#gTab').textContent = '—';
    $('#gStatus').textContent = `${v.symbol} with the ${ORDINAL[gState.bass]} on the bottom has no comfortable fingering on strings ${set.join('-')} in the first 15 frets. Try another bottom note or string set.`;
    $('#gPlay').disabled = true;
    return;
  }
  $('#gPlay').disabled = false;
  const start = Math.max(1, shape.lo || 1);
  const SX = 28, FH = 34, LEFT = 52, TOP = 38;
  let svg = `<svg viewBox="0 0 ${LEFT + SX * 5 + 24} ${TOP + FH * 5 + 14}" class="dv-fret" role="img" aria-label="${v.symbol} ${VOICING_TYPES[gState.type].label} on strings ${set.join(' ')}: ${shape.text}">`;
  for (let f = 0; f <= 5; f++) svg += `<line class="dv-fretline${f === 0 && start === 1 ? ' is-nut' : ''}" x1="${LEFT}" x2="${LEFT + SX * 5}" y1="${TOP + f * FH}" y2="${TOP + f * FH}"/>`;
  for (let s = 0; s < 6; s++) svg += `<line class="dv-string" x1="${LEFT + s * SX}" x2="${LEFT + s * SX}" y1="${TOP}" y2="${TOP + FH * 5}" style="stroke-width:${(1 + (5 - s) * 0.35).toFixed(2)}"/>`;
  if (start > 1) svg += `<text class="dv-fretno" x="${LEFT - 12}" y="${TOP + FH / 2 + 5}" text-anchor="end">${start}fr</text>`;
  shape.tab.forEach((f, idx) => {
    const x = LEFT + idx * SX;
    if (f == null) { svg += `<text class="dv-mute" x="${x}" y="${TOP - 12}" text-anchor="middle">×</text>`; return; }
    const j = set.indexOf(6 - idx), note = v.notes[j];
    if (f === 0) { svg += `<circle class="dv-open deg-${note.degree}" cx="${x}" cy="${TOP - 14}" r="7"/>`; return; }
    const y = TOP + (f - start + 0.5) * FH;
    svg += `<g class="dv-dot deg-${note.degree}"><circle cx="${x}" cy="${y}" r="11.5"/><text x="${x}" y="${y + 4}" text-anchor="middle">${note.name}</text></g>`;
  });
  svg += '</svg>';
  board.innerHTML = svg;
  $('#gTab').textContent = shape.text;
  $('#gStatus').textContent = `${v.symbol}, ${VOICING_TYPES[gState.type].label}, ${ORDINAL[gState.bass]} on the bottom, strings ${set.join('-')}. Low string to high: ${shape.text} (× = don't play). Chord tones: ${code(v)}.`;
  $('#gPlay').onclick = () => { Sound.stopAll(); Sound.chord(shape.midi, { mode: 'roll', timbre: 'guitar', dur: 2.4 }); };
}

/* voice leading */
const vl = { prog: 'ii_V_I', key: 0, type: 'drop2', guide: false, timers: [] };
function chordLabelAt(c) { return spellChord(c.rootPc, c.quality).symbol; }
function renderVoiceLeading() {
  const chords = progressionChords(vl.prog, vl.key);
  const smooth = smoothProgression(chords, vl.type);
  const jump = jumpProgression(chords, vl.type);
  const COL = 132, LEFTPAD = 52, W = LEFTPAD + chords.length * COL + 10, H = 216;
  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:${W}px" class="dv-staff dv-vl-svg" role="img" aria-label="${chords.map(chordLabelAt).join(', ')} voiced with smooth voice leading">${staffFrame(W)}`;
  const cx = (i) => LEFTPAD + COL * (i + 0.5);
  // connecting lines first, so heads sit on top
  for (let i = 1; i < smooth.length; i++) {
    smooth[i].notes.forEach((n, j) => {
      const p = smooth[i - 1].notes[j];
      const guide = (p.degree === 1 || p.degree === 3) && (n.degree === 1 || n.degree === 3);
      svg += `<line class="dv-link${guide ? ' is-guide' : ''}${vl.guide && !guide ? ' is-dim' : ''}" x1="${cx(i - 1) + 9}" y1="${yOf(dOf(p))}" x2="${cx(i) - 9}" y2="${yOf(dOf(n))}"/>`;
    });
  }
  smooth.forEach((v, i) => {
    svg += `<g class="dv-col" data-col="${i}"><rect class="dv-col-bg" x="${cx(i) - COL / 2 + 4}" y="22" width="${COL - 8}" height="${H - 30}" rx="10"/>
      <text class="dv-chord" x="${cx(i)}" y="14" text-anchor="middle">${chordLabelAt(chords[i])}</text>${chordOnStaff(v.notes, cx(i), { dim: vl.guide })}
      <text class="dv-motion" x="${cx(i)}" y="${H - 8}" text-anchor="middle">${i ? v.motion.map((m) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0')).join(' ') : 'start'}</text></g>`;
  });
  svg += '</svg>';
  $('#vlChart').innerHTML = svg;
  const s = totalMotion(smooth), j = totalMotion(jump);
  $('#vlStats').innerHTML = `<b>Smooth:</b> ${s} semitones moved in total (the numbers under each chord show how far each voice moved) &nbsp;·&nbsp; <b>Root on the bottom every time:</b> ${j} semitones.`;
  const notesOf = (v) => v.notes.map((n) => n.name + n.octave).join(' ');
  $('#vlStatus').textContent = `${vl.type === 'close' ? 'Close position' : VOICING_TYPES[vl.type].label}: ` + smooth.map((v, i) => `${chordLabelAt(chords[i])} (${notesOf(v)})`).join(' → ') + '.';
  vl.smooth = smooth; vl.jump = jump; vl.chords = chords;
}

function playProgression(list, label) {
  Sound.stopAll();
  const cols = $$('#vlChart .dv-col');
  list.forEach((v, i) => {
    Sound.chord(v.notes.map((n) => n.midi), { at: i * 1.5, mode: 'roll', dur: 1.9 });
    Sound.later(() => { cols.forEach((c, k) => c.classList.toggle('is-live', k === i)); }, 30 + i * 1500);
  });
  Sound.later(() => cols.forEach((c) => c.classList.remove('is-live')), list.length * 1500 + 300);
  $('#vlStatus').textContent = label;
}

/* build it */
const build = { target: null, picked: new Set(), streak: 0, solved: 0, hint: 0 };
const BUILD_TYPES = ['drop2', 'drop3', 'drop24'];
function newChallenge() {
  const rootPc = Math.floor(Math.random() * 12);
  const quality = Object.keys(QUALITIES)[Math.floor(Math.random() * 4)];
  const type = BUILD_TYPES[Math.floor(Math.random() * 3)];
  const bass = Math.floor(Math.random() * 4);
  build.target = buildVoicing({ rootPc, quality, type, bass });
  build.picked.clear(); build.hint = 0;
  const t = build.target;
  $('#buildPrompt').innerHTML = `Build <b>${t.symbol}</b> as a <b>${VOICING_TYPES[type].label}</b> voicing with the <b>${ORDINAL[t.bass]}</b> on the bottom.`;
  $('#buildFeedback').textContent = 'Press keys to choose four notes, then Check. Any octave is fine; the spacing is what counts.';
  renderBuild();
}
function renderBuild() {
  const on = [...build.picked].map((m) => ({ midi: m, degree: 0, name: midiName(m), label: '' }));
  kbBuild.clear();
  for (const m of build.picked) { const b = kbBuild.keys.get(m); b.classList.add('is-picked'); b.setAttribute('aria-pressed', 'true'); b.firstChild.textContent = midiName(m).replace(/\d/, ''); }
  if (build.hint >= 1) for (const n of build.target.source) { const b = kbBuild.keys.get(n.midi); if (b && !build.picked.has(n.midi)) { b.classList.add('is-hint'); b.firstChild.textContent = n.name; } }
  if (build.hint >= 2) for (const n of build.target.notes) { const b = kbBuild.keys.get(n.midi); if (b) { b.classList.add('is-on', 'deg-' + n.degree); b.firstChild.textContent = n.name; } }
  $('#buildCount').textContent = `${on.length} of 4 notes chosen`;
}

/* quiz */
const QUIZ = [
  { q: 'Cmaj7 in close position is C–E–G–B. In a Drop 2 voicing, which note moves down an octave?', o: ['C', 'E', 'G', 'B'], a: 2, why: 'Count from the top: B is voice 1, G is voice 2. Drop 2 moves G down, giving G–C–E–B.' },
  { q: 'Start from close-position Cmaj7 (C–E–G–B). Which note ends up on the bottom of the Drop 3 voicing?', o: ['C', 'E', 'G', 'B'], a: 1, why: 'Voice 3 from the top is E. Dropping it an octave puts E on the bottom: E–C–G–B.' },
  { q: 'A melody note is B, and you voice Cmaj7 as a Drop 2 chord under it. What happens to B?', o: ['It moves to the bottom', 'It stays on top', 'It is left out', 'It moves up an octave'], a: 1, why: 'Dropping voice 2 or voice 3 never touches the top voice. That is why drop voicings can sit under a melody.' },
  { q: 'Close position Dm7 is D–F–A–C. Which of these is its Drop 2 voicing?', o: ['F · D · A · C', 'D · A · F · C', 'A · D · F · C', 'D · F · A · C'], a: 2, why: 'Voice 2 from the top is A. Moving it down gives A–D–F–C. F–D–A–C is the Drop 3 and D–A–F–C is the Drop 2 & 4.' },
  { q: 'Why do guitarists like Drop 2 voicings?', o: ['They use only open strings', 'The four notes sit on neighbouring strings, so one hand shape grabs them', 'They have no 3rd or 7th', 'Dropping a note makes the chord louder'], a: 1, why: 'Spread over an octave plus a bit, the notes land on four adjacent strings in a reachable shape you can slide up the neck.' },
  { q: 'In ii–V–I, the 7th of Dm7 (C) moves to the 3rd of G7 (B). How far does that voice travel?', o: ['Up a half step', 'Down a whole step', 'Down a half step', 'It stays put'], a: 2, why: 'C to B is one half step down. The 7th falling into the next chord’s 3rd is the classic guide-tone line.' }
];
function renderQuiz() {
  const host = $('#quiz'); host.innerHTML = '';
  let score = 0; const done = new Set();
  QUIZ.forEach((item, qi) => {
    const f = document.createElement('fieldset'); f.className = 'dv-q';
    f.innerHTML = `<legend><b>${qi + 1}.</b> ${item.q}</legend>`;
    item.o.forEach((opt, oi) => {
      const l = document.createElement('label');
      l.innerHTML = `<input type="radio" name="dvq${qi}" value="${oi}"> <span>${opt}</span>`;
      f.appendChild(l);
    });
    const fb = document.createElement('p'); fb.className = 'dv-q-fb'; fb.setAttribute('role', 'status'); f.appendChild(fb);
    f.addEventListener('change', (e) => {
      const pick = Number(e.target.value), ok = pick === item.a;
      fb.textContent = (ok ? 'Correct. ' : 'Not quite. ') + item.why;
      fb.className = 'dv-q-fb ' + (ok ? 'is-ok' : 'is-no');
      if (ok && !done.has(qi)) { done.add(qi); score++; }
      $('#quizScore').textContent = `${score} of ${QUIZ.length} correct`;
    });
    host.appendChild(f);
  });
  $('#quizScore').textContent = `0 of ${QUIZ.length} correct`;
}

/* ---------------------------------------------------------------- wiring */
function renderAll() {
  const sym = chordSymbol();
  $$('[data-chord-name]').forEach((el) => { el.textContent = sym; });
  renderClose(); renderDrop(); renderCompare(); renderGuitar();
}

function init() {
  // chord picker
  const rootSel = $('#dvRoot'), qSel = $('#dvQuality');
  ROOTS.forEach((r) => rootSel.add(new Option(r.label, r.pc)));
  Object.values(QUALITIES).forEach((q) => qSel.add(new Option(q.symbol + ' (' + q.name + ')', q.id)));
  rootSel.value = state.rootPc; qSel.value = state.quality;
  rootSel.addEventListener('change', () => { state.rootPc = Number(rootSel.value); renderAll(); });
  qSel.addEventListener('change', () => { state.quality = qSel.value; renderAll(); });
  $('#dvNames').addEventListener('change', (e) => { state.names = e.target.checked; renderAll(); renderBuild(); });
  $('#dvStop').addEventListener('click', () => Sound.stopAll());
  $('#dvVolume').addEventListener('input', (e) => Sound.setVolume(Number(e.target.value) / 100));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Sound.stopAll(); });
  if (!Sound.available()) $('#dvNoAudio').hidden = false;

  kbClose = makeKeyboard($('#closeKb'), { onKey: (m) => Sound.chord([m], { dur: 1.2 }) });
  kbDrop = makeKeyboard($('#dropKb'), { onKey: (m) => Sound.chord([m], { dur: 1.2 }) });
  kbBuild = makeKeyboard($('#buildKb'), { tabbable: true, onKey: (m) => {
    if (build.picked.has(m)) build.picked.delete(m); else build.picked.add(m);
    Sound.chord([m], { dur: 1.0 }); renderBuild();
  } });

  // hero + first test
  const heroPlay = (type) => { Sound.stopAll(); const v = current(type, 0); Sound.chord(v.notes.map((n) => n.midi), { mode: 'block' }); };
  $$('[data-hero-play]').forEach((b) => b.addEventListener('click', () => heroPlay(b.dataset.heroPlay)));
  $$('[data-first]').forEach((b) => b.addEventListener('click', () => {
    Sound.stopAll();
    const v = voicingFromInversion({ rootPc: 0, quality: 'maj7', type: b.dataset.first, inversion: 0 });
    Sound.chord(v.notes.map((n) => n.midi));
    $('#firstNow').textContent = `Now playing: ${b.dataset.first === 'close' ? 'Cmaj7, close position (C E G B)' : 'Cmaj7, one note moved down an octave'}.`;
  }));
  $('#firstReveal').addEventListener('click', () => { $('#firstExplanation').hidden = false; $('#firstReveal').setAttribute('aria-expanded', 'true'); });

  // 01 close
  $$('#closeInv button').forEach((b) => b.addEventListener('click', () => { state.inversion = Number(b.dataset.inv); renderAll(); }));
  $('#closePlay').addEventListener('click', () => { const v = current('close', state.inversion); playVoicing(v, kbClose); });
  $('#closeRoll').addEventListener('click', () => { const v = current('close', state.inversion); playVoicing(v, kbClose, { mode: 'slow' }); });

  // 02 drop lab
  $$('#dropType button').forEach((b) => b.addEventListener('click', () => { state.dropType = b.dataset.type; renderDrop(); }));
  $$('#dropInv button').forEach((b) => b.addEventListener('click', () => { state.inversion = Number(b.dataset.inv); renderAll(); }));
  $$('#dropSteps button').forEach((b) => b.addEventListener('click', () => { state.step = Number(b.dataset.step); renderDrop(); }));
  $('#dropPlay').addEventListener('click', () => { const v = current(state.dropType, state.inversion); playVoicing(v, kbDrop); });
  $('#dropCompare').addEventListener('click', () => {
    const v = current(state.dropType, state.inversion);
    Sound.stopAll();
    Sound.chord(v.source.map((n) => n.midi), { dur: 1.4 });
    Sound.chord(v.notes.map((n) => n.midi), { at: 1.6, dur: 1.9 });
    $('#dropStatus').textContent = 'Close position first, then the same four letters with one voice dropped. Listen for how the bottom opens up.';
  });

  // 03 compare
  $$('#cmpInv button').forEach((b) => b.addEventListener('click', () => { state.inversion = Number(b.dataset.inv); renderAll(); }));
  $('#compareAll').addEventListener('click', () => {
    Sound.stopAll();
    ['close', 'drop2', 'drop3', 'drop24'].forEach((type, i) => Sound.chord(current(type, state.inversion).notes.map((n) => n.midi), { at: i * 1.6, dur: 1.8 }));
    $('#compareStatus').textContent = 'Playing close, Drop 2, Drop 3, then Drop 2 & 4 from the same starting chord.';
  });

  // 04 guitar
  $$('#gType button').forEach((b) => b.addEventListener('click', () => { gState.type = b.dataset.type; gState.set = 0; renderGuitar(); }));

  // 05 voice leading
  const progSel = $('#vlProg'), keySel = $('#vlKey'), typeSel = $('#vlType');
  Object.values(PROGRESSIONS).forEach((p) => progSel.add(new Option(p.label, p.id)));
  ROOTS.forEach((r) => keySel.add(new Option(r.label, r.pc)));
  keySel.value = vl.key;
  progSel.addEventListener('change', () => { vl.prog = progSel.value; vl.key = PROGRESSIONS[vl.prog].key; keySel.value = vl.key; renderVoiceLeading(); });
  keySel.addEventListener('change', () => { vl.key = Number(keySel.value); renderVoiceLeading(); });
  typeSel.addEventListener('change', () => { vl.type = typeSel.value; renderVoiceLeading(); });
  $('#vlGuide').addEventListener('change', (e) => { vl.guide = e.target.checked; renderVoiceLeading(); });
  $('#vlPlay').addEventListener('click', () => playProgression(vl.smooth, 'Playing the smooth voicings.'));
  $('#vlPlayJump').addEventListener('click', () => playProgression(vl.jump, 'Playing the same chords with the root on the bottom every time. Hear the jumps.'));

  // 06 build
  $('#buildCheck').addEventListener('click', () => {
    const r = checkAttempt([...build.picked], build.target);
    const fb = $('#buildFeedback');
    fb.className = 'dv-status ' + (r.ok ? 'is-ok' : 'is-no');
    if (r.ok) {
      build.solved++; build.streak++;
      fb.textContent = `${r.message} ${build.target.symbol}: ${listNotes(build.target)}. You moved only the voice the rule names.`;
      build.hint = 2; renderBuild();
      Sound.stopAll(); Sound.chord([...build.picked].sort((a, b) => a - b));
    } else { build.streak = 0; fb.textContent = r.message; }
    $('#buildScore').textContent = `Solved ${build.solved} · streak ${build.streak}`;
  });
  $('#buildHint').addEventListener('click', () => {
    build.hint = Math.min(2, build.hint + 1); renderBuild();
    $('#buildFeedback').className = 'dv-status';
    $('#buildFeedback').textContent = build.hint === 1
      ? `Hint: the pale keys are ${build.target.symbol} in close position. Now apply the rule: ${VOICING_TYPES[build.target.type].rule}`
      : `Answer shown: ${listNotes(build.target)}. Try the next one without the hint.`;
  });
  $('#buildNew').addEventListener('click', newChallenge);
  $('#buildClear').addEventListener('click', () => { build.picked.clear(); renderBuild(); });

  // initial render
  renderAll(); renderVoiceLeading(); newChallenge(); renderQuiz();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}
