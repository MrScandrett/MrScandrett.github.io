/* Practice Room page: student sessions + teacher sheet builder.
 * Logic lives in core.mjs (tested); cards in cards.mjs. Everything stays in this browser:
 * one localStorage key, and sheets travel inside the link / QR code. Text from a link is only
 * ever rendered with textContent. */
import { INSTRUMENTS, KINDS, MOVES, cardsFor } from './cards.mjs';
import { blankSheet, encodeSheet, decodeSheet, resolveItem, autoPlan, shareMinutes, dayKey, streak, weekOf, chunkStages, ladderStep, cardMidi, noteToMidi, CHORDS, kindOf, LIMITS } from './core.mjs';

const $ = (id) => document.getElementById(id);
const instOf = (id) => INSTRUMENTS.find((i) => i.id === id) || INSTRUMENTS[0];
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = [5, 10, 15, 20];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k in n && typeof v !== 'string') n[k] = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid);
  return n;
}
const svg = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const kid of kids.flat()) if (kid != null) n.append(kid);
  return n;
};
const pretty = (note) => note.replace(/#/g, '♯').replace(/b(?=\d)/, '♭').replace(/-?\d$/, '');

/* ---------- saved progress ---------- */
const KEY = 'classroomos:practice-room:v1';
const store = (() => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { s = {}; }
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  return {
    days: obj(s.days), stars: Number(s.stars) || 0, inst: instOf(s.inst).id, mins: TIMES.includes(s.mins) ? s.mins : 10,
    assigned: typeof s.assigned === 'string' ? s.assigned : '', done: obj(s.done),
    draft: typeof s.draft === 'string' ? s.draft : '', saved: Array.isArray(s.saved) ? s.saved.filter((x) => x && typeof x.code === 'string').slice(0, 50) : []
  };
})();
function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private mode: still works this visit */ } }
const practicedDays = () => Object.fromEntries(Object.entries(store.days).filter(([, sec]) => sec >= 60));

/* ---------- sound (Web Audio, made here; nothing loads from outside) ---------- */
const audio = {
  ctx: null, nodes: [], timers: [], metro: null,
  get() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  out() { const c = this.get(); if (!this.master) { this.master = c.createGain(); this.master.gain.value = 0.5; this.master.connect(c.destination); } return this.master; },
  tone(midi, t, dur, vol = 0.35) {
    const c = this.get(); const f = 440 * 2 ** ((midi - 69) / 12);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.out());
    for (const [type, mult, v] of [['triangle', 1, 1], ['sine', 2, 0.25]]) { const o = c.createOscillator(); o.type = type; o.frequency.value = f * mult; const og = c.createGain(); og.gain.value = v; o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.05); this.nodes.push(o); }
  },
  noise(t, dur, freq, vol) {
    const c = this.get(); const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq; const g = c.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(this.out()); s.start(t); this.nodes.push(s);
  },
  drum(kind, t, ghost) {
    const v = ghost ? 0.3 : 1;
    if (kind === 'kick') { const c = this.get(); const o = c.createOscillator(); const g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15); g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g).connect(this.out()); o.start(t); o.stop(t + 0.32); this.nodes.push(o); }
    else if (kind === 'snare') { this.noise(t, 0.18, 1200, 0.6 * v); this.tone(50, t, 0.08, 0.15 * v); }
    else this.noise(t, 0.05, 7000, 0.35 * v);
  },
  click(t, accent) { const c = this.get(); const o = c.createOscillator(); const g = c.createGain(); o.frequency.value = accent ? 1600 : 1000; g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(g).connect(this.out()); o.start(t); o.stop(t + 0.06); },
  later(fn, t) { this.timers.push(setTimeout(fn, Math.max(0, (t - this.get().currentTime) * 1000))); },
  stop() { this.nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }); this.nodes = []; this.timers.forEach(clearTimeout); this.timers = []; },
  metronome(on, bpmFn, onBeat) {
    clearInterval(this.metro?.id); this.metro = null;
    if (!on) return;
    const c = this.get(); const m = { next: c.currentTime + 0.1, beat: 0 };
    m.id = setInterval(() => { while (m.next < c.currentTime + 0.12) { this.click(m.next, m.beat % 4 === 0); const b = m.beat; this.later(() => onBeat?.(b), m.next); m.next += 60 / bpmFn(); m.beat++; } }, 25);
    this.metro = m;
  }
};

/** Plays a card's notes / beat / chords. onStep(i) highlights; onEnd() when finished. */
function listen(card, bpm, range, onStep, onEnd) {
  audio.stop();
  const c = audio.get(); let t = c.currentTime + 0.08; const beat = 60 / bpm;
  if (card.grid) {
    const step = beat / 4; const rows = Object.entries(card.grid);
    for (let bar = 0; bar < 2; bar++) for (let s = 0; s < 16; s++) {
      for (const [kind, row] of rows) if (row[s] !== '-') audio.drum(kind, t, row[s] === 'g');
      audio.later(() => onStep(s), t); t += step;
    }
  } else if (card.chords) {
    card.chords.forEach((name, i) => {
      for (let b = 0; b < 4; b++) { (CHORDS[name] || []).forEach((n, j) => audio.tone(noteToMidi(n), t + j * 0.018, beat * 0.95, 0.12)); if (b === 0) audio.later(() => onStep(i), t); t += beat; }
    });
  } else {
    const midi = cardMidi(card); const [from, to] = range || [0, midi.length];
    for (let i = from; i < to; i++) { audio.tone(midi[i], t, beat * 0.9); audio.later(() => onStep(i), t); t += beat; }
  }
  audio.later(() => { onStep(-1); onEnd?.(); }, t);
}

/* ---------- pictures of what to play ---------- */
function picture(card, { small = false } = {}) {
  const box = el('div', { class: 'pr-pic' + (small ? ' pr-pic-small' : '') });
  if (card.keys) {
    const midi = card.keys.map(noteToMidi);
    const lo = Math.min(...midi) - (Math.min(...midi) % 12);
    const hi = Math.max(lo + 11, Math.max(...midi) + (11 - (Math.max(...midi) % 12)));
    const black = (m) => [1, 3, 6, 8, 10].includes(m % 12);
    const whites = []; for (let m = lo; m <= hi; m++) if (!black(m)) whites.push(m);
    const W = 26, H = 96, xOf = new Map();
    whites.forEach((m, i) => xOf.set(m, i * W + W / 2));
    for (let m = lo; m <= hi; m++) if (black(m)) xOf.set(m, xOf.get(m - 1) + W / 2);
    const finger = new Map(); midi.forEach((m, i) => { if (!finger.has(m)) finger.set(m, card.fingers[i] || '•'); });
    const keys = svg('svg', { viewBox: `0 0 ${whites.length * W} ${H + 2}`, class: 'pr-keys', role: 'img', 'aria-label': 'Keyboard: ' + card.keys.map(pretty).join(' ') });
    whites.forEach((m, i) => keys.append(svg('rect', { x: i * W + 0.5, y: 0.5, width: W - 1, height: H, rx: 3, class: 'pr-key-w', 'data-m': m })));
    for (let m = lo; m <= hi; m++) if (black(m)) keys.append(svg('rect', { x: xOf.get(m) - 8, y: 0.5, width: 16, height: H * 0.6, rx: 2, class: 'pr-key-b', 'data-m': m }));
    for (const [m, f] of finger) {
      const y = black(m) ? H * 0.6 - 13 : H - 15;
      keys.append(svg('circle', { cx: xOf.get(m), cy: y, r: 10, class: 'pr-dot', 'data-m': m }), svg('text', { x: xOf.get(m), y: y + 4.5, class: 'pr-dot-t' }, f));
      if (m === 60) keys.append(svg('text', { x: xOf.get(m), y: H - 34, class: 'pr-c4' }, 'C'));
    }
    box.append(keys);
  }
  if (card.tab) {
    const W = 30, gap = 13, n = card.tab.length;
    const tab = svg('svg', { viewBox: `0 0 ${n * W + 40} ${gap * 5 + 40}`, class: 'pr-tab', role: 'img', 'aria-label': 'Guitar tab: ' + card.tab.map(([s, f]) => `string ${s} fret ${f}`).join(', ') });
    ['e', 'B', 'G', 'D', 'A', 'E'].forEach((name, i) => tab.append(svg('line', { x1: 22, x2: n * W + 36, y1: 24 + i * gap, y2: 24 + i * gap, class: 'pr-tab-l' }), svg('text', { x: 8, y: 28 + i * gap, class: 'pr-tab-n' }, name)));
    card.tab.forEach(([s, f], i) => {
      const x = 40 + i * W, y = 24 + (s - 1) * gap;
      tab.append(svg('g', { 'data-i': i, class: 'pr-tab-note' }, svg('rect', { x: x - 9, y: y - 8, width: 18, height: 16, rx: 4 }), svg('text', { x, y: y + 4.5 }, String(f))));
      if (card.fingers[i] && card.fingers[i] !== '0') tab.append(svg('text', { x, y: 12, class: 'pr-tab-f' }, card.fingers[i]));
    });
    box.append(tab);
  }
  if (card.keys || card.notes) {
    const list = card.keys ? card.keys.map((note, i) => ({ note, label: card.fingers[i] ? 'finger ' + card.fingers[i] : '' })) : card.notes;
    box.append(el('ol', { class: 'pr-notes', 'aria-label': 'Notes in order' }, list.map((x, i) => el('li', { 'data-i': i }, el('b', { text: pretty(x.note) }), x.label ? el('small', { text: x.label }) : null))));
  }
  if (card.grid) {
    const names = { hat: 'Hi-hat', snare: 'Snare', kick: 'Kick' };
    const counts = ['1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a'];
    const table = el('table', { class: 'pr-grid' }, el('caption', { class: 'pr-sr', text: 'Drum pattern, 16 steps' }),
      el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: '' }), counts.map((c, s) => el('th', { scope: 'col', class: s % 4 === 0 ? 'pr-beat' : '', 'data-s': s, text: c })))),
      el('tbody', {}, Object.entries(card.grid).map(([kind, row]) => el('tr', {}, el('th', { scope: 'row', text: names[kind] || kind }),
        row.split('').map((v, s) => el('td', { 'data-s': s, class: v === 'x' ? 'hit' : v === 'g' ? 'ghost' : '', 'aria-label': v === '-' ? 'rest' : v === 'g' ? 'quiet hit' : 'hit' }, v === '-' ? '' : '●')))),
      card.stick ? el('tr', { class: 'pr-stick' }, el('th', { scope: 'row', text: 'Hands' }), counts.map((_, s) => el('td', { 'data-s': s, text: s % 2 ? '' : card.stick.split(' ')[s / 2] || '' }))) : null));
    box.append(table);
  }
  if (card.chords) {
    box.append(el('ol', { class: 'pr-chords', 'aria-label': 'Chords' }, card.chords.map((c, i) => el('li', { 'data-i': i, text: c }))), el('p', { class: 'pr-strum', text: 'Strum: ' + card.strum }));
  }
  return box;
}

function highlight(box, i, card) {
  box.querySelectorAll('.on').forEach((n) => n.classList.remove('on'));
  if (i < 0) return;
  if (card.grid) box.querySelectorAll(`[data-s="${i}"]`).forEach((n) => n.classList.add('on'));
  else box.querySelectorAll(`[data-i="${i}"]`).forEach((n) => n.classList.add('on'));
  if (card.keys) box.querySelectorAll(`[data-m="${noteToMidi(card.keys[i])}"]`).forEach((n) => n.classList.add('on'));
}
function showRange(box, range) {
  box.querySelectorAll('[data-i]').forEach((n) => n.classList.toggle('dim', !!range && (n.dataset.i < range[0] || n.dataset.i >= range[1])));
}

/* ---------- student: home ---------- */
let assigned = null; // decoded sheet from the teacher

function radioRow(host, items, current, onPick, cls = '') {
  host.replaceChildren(...items.map((it) => el('button', { type: 'button', role: 'radio', class: cls, 'aria-checked': String(it.id === current), onclick: () => onPick(it.id) }, it.label)));
}

function renderHome() {
  const days = practicedDays();
  $('pr-streak').textContent = streak(days);
  $('pr-stars').textContent = store.stars;
  $('pr-today').textContent = Math.floor((store.days[dayKey()] || 0) / 60);
  const today = dayKey();
  $('pr-week').replaceChildren(...weekOf().map((d, i) => el('li', { class: (days[d] ? 'did' : '') + (d === today ? ' now' : ''), title: d }, el('span', { text: DAY_LETTERS[i] }), el('b', { text: days[d] ? '✓' : '' }))));
  radioRow($('pr-insts'), INSTRUMENTS.map((i) => ({ id: i.id, label: [el('span', { class: 'pr-emoji', 'aria-hidden': 'true', text: i.emoji }), el('span', { text: i.name })] })), store.inst, (id) => { store.inst = id; persist(); renderHome(); }, 'pr-inst');
  radioRow($('pr-times'), TIMES.map((m) => ({ id: m, label: m + ' min' })), store.mins, (m) => { store.mins = m; persist(); renderHome(); }, 'pr-time');
  const box = $('pr-assigned');
  box.hidden = !assigned;
  if (assigned) {
    const done = store.done[store.assigned] || {};
    const week = weekOf();
    box.replaceChildren(
      el('div', { class: 'pr-assigned-head' }, el('span', { class: 'pr-emoji', 'aria-hidden': 'true', text: '📋' }), el('div', {},
        el('h2', { text: assigned.student ? `${assigned.student}'s practice sheet` : 'Your practice sheet' }),
        el('p', { text: `${instOf(assigned.inst).emoji} ${instOf(assigned.inst).name} · ${assigned.minutes} min · ${assigned.days.map((d) => DAY_NAMES[d]).join(' ')}` }))),
      assigned.msg ? el('blockquote', { text: '“' + assigned.msg + '”' }) : null,
      el('ol', { class: 'pr-assigned-list' }, assigned.items.map(resolveItem).filter(Boolean).map((c) => el('li', {}, el('span', { 'aria-hidden': 'true', text: kindOf(c.kind).emoji }), ' ', c.title))),
      el('ol', { class: 'pr-week pr-week-small', 'aria-label': 'Assigned days this week' }, week.map((d, i) => el('li', { class: (done[d] ? 'did' : '') + (assigned.days.includes(i) ? ' due' : ' off') }, el('span', { text: DAY_LETTERS[i] }), el('b', { text: done[d] ? '✓' : '' })))),
      el('div', { class: 'pr-assigned-go' }, el('button', { type: 'button', class: 'pr-go', onclick: () => startSession(shareMinutes(assigned.items.map(resolveItem).filter(Boolean), assigned.minutes), true) }, 'Start my sheet ▶'),
        el('button', { type: 'button', class: 'pr-quiet', onclick: () => { if (confirm('Remove this sheet from this device?')) { store.assigned = ''; assigned = null; persist(); renderHome(); } } }, 'Remove sheet')));
  }
  $('pr-moves').replaceChildren(...Object.values(MOVES).map((m) => el('div', { class: 'pr-move' }, el('span', { class: 'pr-emoji', 'aria-hidden': 'true', text: m.emoji }), el('div', {}, el('b', { text: m.name }), el('p', { text: m.how }), el('small', { text: m.why })))));
}

/* ---------- student: session ---------- */
const S = { plan: [], i: 0, secs: 0, cardSecs: 0, tick: null, stars: 0, fromSheet: false, metro: false, bpm: 60, move: null };

function startSession(plan, fromSheet = false) {
  if (!plan.length) return;
  Object.assign(S, { plan, i: 0, secs: 0, stars: 0, fromSheet });
  show('pr-session');
  clearInterval(S.tick);
  S.tick = setInterval(() => {
    if (document.hidden) return;
    S.secs++; S.cardSecs++;
    store.days[dayKey()] = (store.days[dayKey()] || 0) + 1;
    if (S.secs % 10 === 0) persist();
    $('pr-clock').textContent = clock(S.secs);
    S.move?.tick?.();
  }, 1000);
  renderCard();
}
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function show(id) {
  for (const s of ['pr-home', 'pr-session', 'pr-done']) $(s).hidden = s !== id;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

function renderCard() {
  audio.stop(); audio.metronome(false);
  const card = S.plan[S.i];
  S.cardSecs = 0; S.bpm = card.tempo || 60; S.metro = false;
  const kind = kindOf(card.kind); const move = MOVES[card.move];
  $('pr-steps').replaceChildren(...S.plan.map((c, i) => el('li', { class: i < S.i ? 'did' : i === S.i ? 'now' : '', 'aria-current': i === S.i ? 'step' : null, title: c.title }, el('span', { 'aria-hidden': 'true', text: kindOf(c.kind).emoji }), el('span', { class: 'pr-sr', text: `Step ${i + 1}: ${c.title}${i < S.i ? ' (done)' : ''}` }))));

  const pic = card.keys || card.tab || card.notes || card.grid || card.chords ? picture(card) : null;
  const goalBtn = el('button', { type: 'button', class: 'pr-next', onclick: next }, S.i === S.plan.length - 1 ? 'Finish 🎉' : 'Next ➜');
  const tempoOut = el('output', { class: 'pr-bpm', text: S.bpm });
  const setBpm = (v) => { S.bpm = Math.max(30, Math.min(220, v)); tempoOut.textContent = S.bpm; S.move?.onTempo?.(); };
  const metroBtn = el('button', { type: 'button', class: 'pr-tool', 'aria-pressed': 'false', onclick: () => { S.metro = !S.metro; metroBtn.setAttribute('aria-pressed', String(S.metro)); audio.metronome(S.metro, () => S.bpm, (b) => { beatDot.dataset.b = b % 4; beatDot.classList.remove('pulse'); void beatDot.offsetWidth; beatDot.classList.add('pulse'); }); } }, '🥢 Beat');
  const beatDot = el('span', { class: 'pr-beatdot', 'aria-hidden': 'true' });
  let playing = false;
  const listenBtn = pic && !card.notes?.every((x) => !noteToMidi(x.note)) ? el('button', { type: 'button', class: 'pr-tool', onclick: () => {
    if (playing) { audio.stop(); playing = false; listenBtn.textContent = '🔊 Listen'; highlight(pic, -1, card); return; }
    playing = true; listenBtn.textContent = '■ Stop';
    listen(card, S.bpm, S.move?.range?.(), (i) => highlight(pic, i, card), () => { playing = false; listenBtn.textContent = '🔊 Listen'; });
  } }, '🔊 Listen') : null;

  const moveBox = el('div', { class: 'pr-movebox' });
  const tools = el('div', { class: 'pr-tools' }, listenBtn, metroBtn, beatDot,
    el('span', { class: 'pr-tempo' }, el('button', { type: 'button', class: 'pr-tool pr-sq', 'aria-label': 'Slower', onclick: () => setBpm(S.bpm - 4) }, '−'), el('span', {}, '♩ = ', tempoOut), el('button', { type: 'button', class: 'pr-tool pr-sq', 'aria-label': 'Faster', onclick: () => setBpm(S.bpm + 4) }, '+')));

  $('pr-card').replaceChildren(
    el('div', { class: `pr-card-head k-${card.kind}` }, el('span', { class: 'pr-kind' }, kind.emoji + ' ' + kind.name), el('span', { class: 'pr-of', text: `${S.i + 1} of ${S.plan.length} · about ${card.min} min` })),
    el('h2', { class: 'pr-title', tabindex: '-1', text: card.title }),
    el('p', { class: 'pr-do', text: card.do }),
    pic, tools, moveBox,
    el('p', { class: 'pr-why' }, el('span', { 'aria-hidden': 'true', text: move.emoji + ' ' }), el('b', { text: move.name + ': ' }), move.why),
    el('div', { class: 'pr-card-foot' }, S.i > 0 ? el('button', { type: 'button', class: 'pr-quiet', onclick: () => { S.i--; renderCard(); } }, '← Back') : el('span'), goalBtn));

  S.move = makeMove(card, moveBox, pic, setBpm, () => { goalBtn.classList.add('ready'); });
  $('pr-card').querySelector('.pr-title').focus({ preventScroll: true });
}

function earnStar(box) {
  S.stars++; store.stars++; persist();
  const pop = el('div', { class: 'pr-starpop', 'aria-live': 'polite', text: '⭐ +1 star!' });
  box.append(pop);
  if (!reduceMotion) setTimeout(() => pop.remove(), 1800);
}

function cleanSlip(onClean, onSlip) {
  return el('div', { class: 'pr-cs' },
    el('button', { type: 'button', class: 'pr-clean', onclick: onClean }, '✓ Clean'),
    el('button', { type: 'button', class: 'pr-slip', onclick: onSlip }, '✗ Slip'));
}

function makeMove(card, box, pic, setBpm, reached) {
  let won = false;
  const win = () => { if (won) return; won = true; earnStar(box); reached(); };
  if (card.move === 'streak') {
    let n = 0; const dots = el('div', { class: 'pr-dots', role: 'img' }); const say = el('p', { class: 'pr-say' });
    const draw = (msg) => { dots.replaceChildren(...Array.from({ length: 5 }, (_, i) => el('span', { class: i < n ? 'on' : '' }))); dots.setAttribute('aria-label', `${n} of 5 in a row`); say.textContent = msg; };
    draw('Play it. Was it clean?');
    box.append(dots, say, cleanSlip(() => { if (n < 5) n++; draw(n >= 5 ? 'Five in a row! Your hands know it. 🎉' : ['', 'One!', 'Two in a row!', 'Three! Stay calm.', 'Four… one more!'][n]); if (n >= 5) win(); }, () => { n = 0; draw('Back to zero. Slow down a little and try again.'); }));
    return {};
  }
  if (card.move === 'ladder') {
    const start = card.tempo, goal = card.goal || card.tempo + 20;
    const bar = el('div', { class: 'pr-ladder' }, el('span')); const say = el('p', { class: 'pr-say' });
    const draw = (msg) => { bar.firstChild.style.width = `${Math.round(((S.bpm - start) / (goal - start)) * 100)}%`; say.textContent = msg || `♩ = ${S.bpm} · goal ${goal}`; };
    draw('Turn on 🥢 Beat. Play once at this speed.');
    box.append(el('div', { class: 'pr-ladder-ends' }, el('span', { text: '🐢 ' + start }), el('span', { text: goal + ' 🐇' })), bar, say,
      cleanSlip(() => { setBpm(ladderStep(S.bpm, true, start, goal)); draw(S.bpm >= goal ? 'You reached the goal tempo! 🎉' : `Faster: ♩ = ${S.bpm}. Again!`); if (S.bpm >= goal) win(); },
        () => { setBpm(ladderStep(S.bpm, false, start, goal)); draw(`A bit slower: ♩ = ${S.bpm}. You've got this.`); }));
    return { onTempo: () => { bar.firstChild.style.width = `${Math.max(0, Math.min(100, Math.round(((S.bpm - start) / (goal - start)) * 100)))}%`; } };
  }
  if (card.move === 'chunk') {
    const total = (card.keys || card.tab || card.notes).length;
    const stages = chunkStages(total); let st = 0, n = 0;
    const chips = el('ol', { class: 'pr-chunks' }); const dots = el('div', { class: 'pr-dots pr-dots-sm', role: 'img' }); const say = el('p', { class: 'pr-say' });
    const draw = (msg) => {
      chips.replaceChildren(...stages.map((s, i) => el('li', { class: i < st ? 'did' : i === st ? 'now' : '', text: i === stages.length - 1 && stages.length > 1 ? 'All together' : `Part ${i + 1}` })));
      const s = stages[Math.min(st, stages.length - 1)];
      dots.replaceChildren(...Array.from({ length: s.need }, (_, i) => el('span', { class: i < n ? 'on' : '' }))); dots.setAttribute('aria-label', `${n} of ${s.need} clean`);
      if (pic) showRange(pic, st < stages.length ? [s.from, s.to] : null);
      say.textContent = msg;
    };
    draw(`Play only the bright notes, ${stages[0].need} times clean.`);
    box.append(chips, dots, say, cleanSlip(() => {
      if (st >= stages.length) return;
      n++;
      if (n >= stages[st].need) { st++; n = 0; if (st >= stages.length) { draw('All the pieces are glued together! 🎉'); win(); return; } draw(st === stages.length - 1 ? 'Now glue them together: the whole thing!' : `Part ${st + 1}: the next few notes.`); }
      else draw('Nice! Again.');
    }, () => { n = 0; draw('No problem. Slower, and try that part again.'); }));
    return { range: () => (st < stages.length ? [stages[st].from, stages[st].to] : null) };
  }
  // timer
  const goal = card.min * 60; const ring = el('div', { class: 'pr-ring', role: 'timer', 'aria-label': 'Time left' }, el('b'));
  const draw = () => { const left = Math.max(0, goal - S.cardSecs); ring.style.setProperty('--p', `${Math.min(100, (S.cardSecs / goal) * 100)}%`); ring.firstChild.textContent = left ? clock(left) : '✓'; };
  draw(); box.append(ring, el('p', { class: 'pr-say', text: 'The timer runs while you play. Keep going!' }));
  return { tick: () => { draw(); if (S.cardSecs >= goal) win(); } };
}

function next() {
  audio.stop(); audio.metronome(false);
  if (S.i < S.plan.length - 1) { S.i++; renderCard(); return; }
  finish();
}

function finish() {
  clearInterval(S.tick); audio.stop(); audio.metronome(false);
  store.stars++; S.stars++;
  if (S.fromSheet && store.assigned) { store.done[store.assigned] = { ...(store.done[store.assigned] || {}), [dayKey()]: true }; }
  persist();
  const days = practicedDays();
  const burst = reduceMotion ? null : el('div', { class: 'pr-burst', 'aria-hidden': 'true' }, Array.from({ length: 18 }, (_, i) => el('span', { style: `--a:${i * 20}deg;--d:${(i % 3) * 0.08}s`, text: ['⭐', '🎵', '✨'][i % 3] })));
  $('pr-done').replaceChildren(burst,
    el('p', { class: 'pr-big', 'aria-hidden': 'true', text: '🎉' }),
    el('h2', { text: 'You practiced!' }),
    el('div', { class: 'pr-stats' },
      el('span', { class: 'pr-stat' }, el('b', { text: Math.max(1, Math.round(S.secs / 60)) }), el('span', { text: '⏱️ minutes' })),
      el('span', { class: 'pr-stat' }, el('b', { text: S.stars }), el('span', { text: '⭐ stars earned' })),
      el('span', { class: 'pr-stat' }, el('b', { text: streak(days) }), el('span', { text: '🔥 day streak' }))),
    el('p', { class: 'pr-say', text: S.secs < 60 ? 'Quick one! Practice at least a minute to count toward your streak.' : 'Little and often beats long and rare. See you tomorrow!' }),
    el('div', { class: 'pr-done-go' }, el('button', { type: 'button', class: 'pr-go', onclick: () => { renderHome(); show('pr-home'); } }, 'Done')));
  show('pr-done');
  $('pr-done').focus();
}

$('pr-go').addEventListener('click', () => startSession(autoPlan(store.inst, store.mins, dayKey())));
$('pr-quit').addEventListener('click', () => { clearInterval(S.tick); audio.stop(); audio.metronome(false); persist(); renderHome(); show('pr-home'); });

/* ---------- teacher ---------- */
let sheet = decodeSheet(store.draft) || blankSheet(store.inst === 'any' ? 'piano' : store.inst);
let kindFilter = 'all';
const saveDraft = () => { store.draft = encodeSheet(sheet); persist(); };
const sheetUrl = () => `${location.origin}${location.pathname}#sheet=${encodeSheet(sheet)}`;

function toast(msg) { const t = $('t-toast'); t.textContent = msg; clearTimeout(toast.id); toast.id = setTimeout(() => { t.textContent = ''; }, 3500); }

function renderTeacher() {
  $('t-student').value = sheet.student; $('t-msg').value = sheet.msg;
  radioRow($('t-insts'), INSTRUMENTS.map((i) => ({ id: i.id, label: `${i.emoji} ${i.name.replace(' or voice', '')}` })), sheet.inst, (id) => { sheet.inst = id; saveDraft(); renderTeacher(); }, 'pr-chip');
  radioRow($('t-mins'), [5, 10, 15, 20, 30].map((m) => ({ id: m, label: m + ' min/day' })), sheet.minutes, (m) => { sheet.minutes = m; saveDraft(); renderTeacher(); }, 'pr-chip');
  $('t-days').replaceChildren(...DAY_NAMES.map((name, d) => el('button', { type: 'button', class: 'pr-day', 'aria-pressed': String(sheet.days.includes(d)), 'aria-label': name, onclick: () => { sheet.days = sheet.days.includes(d) ? sheet.days.filter((x) => x !== d) : [...sheet.days, d].sort(); if (!sheet.days.length) sheet.days = [d]; saveDraft(); renderTeacher(); } }, DAY_LETTERS[d])));
  radioRow($('t-kinds'), [{ id: 'all', label: 'All' }, ...KINDS.map((k) => ({ id: k.id, label: `${k.emoji} ${k.name}` }))], kindFilter, (id) => { kindFilter = id; renderTeacher(); }, 'pr-chip pr-chip-sm');

  const inSheet = new Set(sheet.items.map((i) => i.id));
  const cards = cardsFor(sheet.inst).filter((c) => kindFilter === 'all' || c.kind === kindFilter)
    .sort((a, b) => KINDS.findIndex((k) => k.id === a.kind) - KINDS.findIndex((k) => k.id === b.kind) || (a.inst === 'any') - (b.inst === 'any'));
  $('t-library').replaceChildren(...cards.map((c) => {
    const on = inSheet.has(c.id);
    return el('button', { type: 'button', class: `pr-lib k-${c.kind}` + (on ? ' added' : ''), 'aria-pressed': String(on), onclick: () => {
      if (on) sheet.items = sheet.items.filter((i) => i.id !== c.id);
      else if (sheet.items.length >= LIMITS.items) { toast(`A sheet holds up to ${LIMITS.items} cards.`); return; }
      else sheet.items.push({ id: c.id });
      saveDraft(); renderTeacher();
    } },
    el('span', { class: 'pr-lib-top' }, el('span', { text: kindOf(c.kind).emoji + ' ' + kindOf(c.kind).name }), el('span', { class: 'pr-lib-add', text: on ? '✓ Added' : '+ Add' })),
    el('b', { text: c.title }), el('span', { class: 'pr-lib-do', text: c.do }),
    c.keys || c.tab || c.grid || c.chords || c.notes ? picture(c, { small: true }) : null,
    el('span', { class: 'pr-lib-move', text: `${MOVES[c.move].emoji} ${MOVES[c.move].name} · ${c.min} min` }));
  }));
  renderSheet();
  $('t-saved-count').textContent = store.saved.length;
  $('t-saved').replaceChildren(...store.saved.map((s, idx) => el('li', {},
    el('span', { text: `${s.label} · ${s.when}` }),
    el('button', { type: 'button', class: 'pr-quiet', onclick: () => { const d = decodeSheet(s.code); if (d) { sheet = d; saveDraft(); renderTeacher(); toast('Opened.'); } } }, 'Open'),
    el('button', { type: 'button', class: 'pr-quiet', 'aria-label': 'Delete ' + s.label, onclick: () => { store.saved.splice(idx, 1); persist(); renderTeacher(); } }, '✕'))));
}

function renderSheet() {
  const inst = instOf(sheet.inst);
  const items = sheet.items.map((it) => ({ it, card: resolveItem(it) })).filter((x) => x.card);
  const timed = shareMinutes(items.map((x) => x.card), sheet.minutes);
  const host = $('t-sheet');
  const rows = items.map(({ it, card }, idx) => {
    const k = kindOf(card.kind); const move = MOVES[card.move];
    const tempoCtl = card.tempo && !card.own ? el('span', { class: 'pr-sheet-tempo' },
      el('button', { type: 'button', class: 'pr-noprint', 'aria-label': 'Slower', onclick: () => { it.tempo = Math.max(30, (it.tempo || card.tempo) - 4); saveDraft(); renderSheet(); } }, '−'),
      el('span', { text: `♩ = ${card.tempo}` }),
      el('button', { type: 'button', class: 'pr-noprint', 'aria-label': 'Faster', onclick: () => { it.tempo = Math.min(220, (it.tempo || card.tempo) + 4); saveDraft(); renderSheet(); } }, '+')) : null;
    const move1 = (dir) => { const j = idx + dir; if (j < 0 || j >= sheet.items.length) return; [sheet.items[idx], sheet.items[j]] = [sheet.items[j], sheet.items[idx]]; saveDraft(); renderTeacher(); };
    return el('li', { class: `pr-sheet-row k-${card.kind}` },
      el('div', { class: 'pr-sheet-num', text: String(idx + 1) }),
      el('div', { class: 'pr-sheet-body' },
        el('div', { class: 'pr-sheet-title' }, el('span', { class: 'pr-sheet-kind', text: k.emoji + ' ' + k.name }), el('b', { text: card.title }), el('span', { class: 'pr-sheet-min', text: `${timed[idx].min} min` })),
        el('p', { text: card.do }),
        card.keys || card.tab || card.grid || card.chords || card.notes ? picture(card, { small: true }) : null,
        el('p', { class: 'pr-sheet-move' }, el('span', { text: `${move.emoji} ${move.name}: ${move.how}` }), tempoCtl)),
      el('div', { class: 'pr-sheet-days', 'aria-label': 'Check off each day' }, sheet.days.map((d) => el('span', {}, el('i', { text: DAY_LETTERS[d] }), el('span', { class: 'pr-box' })))),
      el('div', { class: 'pr-sheet-ctl pr-noprint' },
        el('button', { type: 'button', 'aria-label': 'Move up', disabled: idx === 0, onclick: () => move1(-1) }, '↑'),
        el('button', { type: 'button', 'aria-label': 'Move down', disabled: idx === items.length - 1, onclick: () => move1(1) }, '↓'),
        el('button', { type: 'button', 'aria-label': 'Remove ' + card.title, onclick: () => { sheet.items.splice(idx, 1); saveDraft(); renderTeacher(); } }, '✕')));
  });

  let qr = null;
  if (items.length && window.QR) {
    for (const level of ['M', 'L']) { try { const code = window.QR.encode(sheetUrl(), level); qr = el('div', { class: 'pr-qr' }); qr.innerHTML = window.QR.toSvg(code); break; } catch { /* too long at this level */ } }
  }
  host.replaceChildren(
    el('header', { class: 'pr-sheet-head' },
      el('div', {}, el('p', { class: 'pr-sheet-eyebrow', text: '🎶 Practice sheet' }), el('h2', { text: sheet.student ? `${sheet.student}` : 'Student: ____________' }),
        el('p', { text: `${inst.emoji} ${inst.name} · ${sheet.minutes} minutes a day · ${sheet.days.map((d) => DAY_NAMES[d]).join(', ')}` }),
        sheet.msg ? el('p', { class: 'pr-sheet-msg', text: '“' + sheet.msg + '”' }) : null),
      qr ? el('div', { class: 'pr-qr-wrap' }, qr, el('small', { text: 'Scan to practice with sound, beat and stars' })) : null),
    items.length ? el('ol', { class: 'pr-sheet-list' }, rows) : el('p', { class: 'pr-empty', text: '← Click cards to add them to the sheet. Four or five is plenty.' }),
    items.length ? el('footer', { class: 'pr-sheet-foot' }, el('span', { text: '✓ Clean = no stops, no slips.   Tick a box each day you practice.' }), el('span', { text: 'Practice Room · ClassroomOS' })) : null);
}

function remember() {
  if (!sheet.items.length) return;
  const code = encodeSheet(sheet);
  store.saved = [{ code, label: `${sheet.student || 'Untitled'} · ${instOf(sheet.inst).name}`, when: dayKey() }, ...store.saved.filter((s) => s.code !== code)].slice(0, 50);
  persist(); renderTeacher();
}

$('t-student').addEventListener('input', (e) => { sheet.student = e.target.value.slice(0, LIMITS.name); saveDraft(); renderSheet(); });
$('t-msg').addEventListener('input', (e) => { sheet.msg = e.target.value.slice(0, LIMITS.msg); saveDraft(); renderSheet(); });
$('t-own').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = $('t-own-title').value.trim();
  if (!title) return;
  if (sheet.items.length >= LIMITS.items) { toast(`A sheet holds up to ${LIMITS.items} cards.`); return; }
  sheet.items.push({ id: 'own', title: title.slice(0, LIMITS.title), do: $('t-own-do').value.trim().slice(0, LIMITS.do) });
  $('t-own-title').value = ''; $('t-own-do').value = '';
  saveDraft(); renderTeacher();
});
$('t-print').addEventListener('click', () => { if (!sheet.items.length) { toast('Add a card first.'); return; } remember(); window.print(); });
$('t-link').addEventListener('click', async () => {
  if (!sheet.items.length) { toast('Add a card first.'); return; }
  remember();
  try { await navigator.clipboard.writeText(sheetUrl()); toast('Link copied. Paste it into Classroom, email or a message.'); }
  catch { prompt('Copy this link for your student:', sheetUrl()); }
});
$('t-try').addEventListener('click', () => {
  if (!sheet.items.length) { toast('Add a card first.'); return; }
  setMode('student');
  startSession(shareMinutes(sheet.items.map(resolveItem).filter(Boolean), sheet.minutes));
});
$('t-new').addEventListener('click', () => { if (sheet.items.length && !confirm('Start a new, empty sheet? (Print or copy the link first if you need this one.)')) return; sheet = blankSheet(sheet.inst); saveDraft(); renderTeacher(); });

/* ---------- modes and links ---------- */
function setMode(mode) {
  const teacher = mode === 'teacher';
  $('pr-tab-student').setAttribute('aria-selected', String(!teacher));
  $('pr-tab-teacher').setAttribute('aria-selected', String(teacher));
  $('pr-student').hidden = teacher; $('pr-teacher').hidden = !teacher;
  if (teacher) { audio.stop(); audio.metronome(false); renderTeacher(); } else renderHome();
}
$('pr-tab-student').addEventListener('click', () => setMode('student'));
$('pr-tab-teacher').addEventListener('click', () => setMode('teacher'));
document.querySelector('.pr-mode').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const teacher = $('pr-tab-student').getAttribute('aria-selected') === 'true';
  setMode(teacher ? 'teacher' : 'student'); $(teacher ? 'pr-tab-teacher' : 'pr-tab-student').focus();
});

function readHash() {
  const [, key = '', value = ''] = /^#(\w+)=(.*)$/.exec(location.hash) || [];
  if (key === 'sheet') {
    const s = decodeSheet(value);
    if (s && s.items.length) { store.assigned = value; persist(); }
    history.replaceState(null, '', location.pathname);
  } else if (key === 'start' && INSTRUMENTS.some((i) => i.id === value)) { store.inst = value; persist(); }
  else if (key === 'teacher' && INSTRUMENTS.some((i) => i.id === value)) {
    if (!sheet.items.length) { sheet.inst = value; saveDraft(); }
    return 'teacher';
  }
  return 'student';
}

function route() {
  const focusGo = location.hash.startsWith('#start=');
  const mode = readHash();
  assigned = store.assigned ? decodeSheet(store.assigned) : null;
  if (assigned && !assigned.items.length) assigned = null;
  if (!$('pr-session').hidden) { clearInterval(S.tick); audio.stop(); audio.metronome(false); persist(); }
  show('pr-home');
  setMode(mode);
  if (focusGo) $('pr-go').focus();
}
route();
addEventListener('hashchange', () => { if (location.hash) route(); });
addEventListener('pagehide', persist);
