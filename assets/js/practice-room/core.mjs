/* Practice Room logic: no DOM, no storage, no audio. Tested by tests/practice-room.test.mjs.
 *
 * A "sheet" is what a teacher hands a student:
 *   { student, inst, minutes, days: [0..6] (Mon = 0), msg, items: [{ id, tempo? , title?, do? }] }
 * where an item is either a library card ({ id: 'p3', tempo: 70 }) or the teacher's own card
 * ({ id: 'own', title, do }).
 *
 * It travels as text in the link (#sheet=…) so a printed QR code opens it on any device with no
 * account. Format (fields separated by "|", text percent-encoded so "|" and "," can't appear raw):
 *   1|<student>|<inst>|<minutes>|<days as 7 bits>|<item>,<item>,…|<msg>
 *   item = p3        p3.70 (tempo)        ~<title>~<do>  (the teacher's own card)
 * Decoding never trusts the text: unknown cards are dropped, numbers are clamped, text is cut short,
 * and the UI only ever renders it with textContent.
 */
import { CARD_BY_ID, INSTRUMENTS, cardsFor, KINDS } from './cards.mjs';

export const LIMITS = { items: 12, name: 40, msg: 160, title: 50, do: 140 };
const INST_IDS = new Set(INSTRUMENTS.map((i) => i.id));
const clamp = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const enc = (s) => encodeURIComponent(s).replace(/[!'()*~.]/g, (ch) => '%' + ch.charCodeAt(0).toString(16).toUpperCase());
const dec = (s) => { try { return decodeURIComponent(s); } catch { return ''; } };

export function blankSheet(inst = 'piano') {
  return { student: '', inst, minutes: 15, days: [0, 1, 2, 3, 4], msg: '', items: [] };
}

export function encodeSheet(sheet) {
  const bits = Array.from({ length: 7 }, (_, d) => (sheet.days.includes(d) ? '1' : '0')).join('');
  const items = sheet.items.slice(0, LIMITS.items).map((it) => {
    if (it.id === 'own') return '~' + enc(clean(it.title, LIMITS.title)) + '~' + enc(clean(it.do, LIMITS.do));
    const card = CARD_BY_ID.get(it.id);
    return it.tempo && card && it.tempo !== card.tempo ? `${it.id}.${it.tempo}` : it.id;
  }).join(',');
  return ['1', enc(clean(sheet.student, LIMITS.name)), sheet.inst, sheet.minutes, bits, items, enc(clean(sheet.msg, LIMITS.msg))].join('|');
}

/** Returns a sheet, or null when the text isn't a Practice Room sheet at all. */
export function decodeSheet(text) {
  if (typeof text !== 'string' || text.length > 4000) return null;
  const f = text.split('|');
  if (f[0] !== '1' || f.length < 6) return null;
  const inst = INST_IDS.has(f[2]) ? f[2] : 'any';
  const days = [];
  (f[4] || '').slice(0, 7).split('').forEach((b, d) => { if (b === '1') days.push(d); });
  const items = [];
  for (const raw of (f[5] || '').split(',')) {
    if (items.length >= LIMITS.items || !raw) continue;
    if (raw[0] === '~') {
      const [, title, what] = raw.split('~');
      const it = { id: 'own', title: clean(dec(title || ''), LIMITS.title), do: clean(dec(what || ''), LIMITS.do) };
      if (it.title) items.push(it);
      continue;
    }
    const [id, tempo] = raw.split('.');
    if (!CARD_BY_ID.has(id)) continue;
    const it = { id };
    if (tempo !== undefined) it.tempo = clamp(Number(tempo), 30, 220, undefined);
    if (it.tempo === undefined) delete it.tempo;
    items.push(it);
  }
  return {
    student: clean(dec(f[1] || ''), LIMITS.name),
    inst,
    minutes: clamp(Number(f[3]), 1, 120, 15),
    days: days.length ? days : [0, 1, 2, 3, 4],
    msg: clean(dec(f[6] || ''), LIMITS.msg),
    items
  };
}

/** A sheet item as a full card the session screen can show. */
export function resolveItem(it) {
  if (it.id === 'own') return { id: 'own', inst: 'any', kind: 'skill', move: 'streak', min: 3, tempo: 70, title: it.title, do: it.do || 'Practise this until it feels easy.', own: true };
  const card = CARD_BY_ID.get(it.id);
  if (!card) return null;
  return it.tempo ? { ...card, tempo: it.tempo, goal: card.goal ? Math.max(card.goal, it.tempo + 10) : card.goal } : card;
}

/* Small seeded random, so "today's practice" is the same all day and different tomorrow. */
export function seeded(key) {
  let h = 2166136261;
  for (const ch of String(key)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/**
 * Today's session for a student practising on their own: one card per step
 * (warm up → skill → song → free play), a second skill card for longer sessions,
 * minutes shared out to fill the time. Prefers the instrument's own cards over the "any" ones.
 */
export function autoPlan(inst, minutes, dateKey) {
  const rand = seeded(inst + ':' + dateKey);
  const pool = cardsFor(inst);
  const pick = (kind, avoid) => {
    const own = pool.filter((c) => c.kind === kind && c.inst === inst && !avoid.has(c.id));
    const list = own.length && rand() < 0.8 ? own : pool.filter((c) => c.kind === kind && !avoid.has(c.id));
    return list.length ? list[Math.floor(rand() * list.length)] : null;
  };
  const steps = minutes >= 15 ? ['warmup', 'skill', 'skill', 'song', 'play'] : minutes >= 8 ? ['warmup', 'skill', 'song', 'play'] : ['warmup', 'skill', 'song'];
  const used = new Set();
  const cards = [];
  for (const kind of steps) {
    const c = pick(kind, used);
    if (c) { used.add(c.id); cards.push(c); }
  }
  return shareMinutes(cards, minutes);
}

/** Fit each card's suggested minutes to a total, at least 1 minute each. */
export function shareMinutes(cards, total) {
  const base = cards.reduce((s, c) => s + (c.min || 2), 0) || 1;
  const out = cards.map((c) => ({ ...c, min: Math.max(1, Math.round(((c.min || 2) * total) / base)) }));
  let diff = total - out.reduce((s, c) => s + c.min, 0);
  for (let i = 0; diff !== 0 && out.length && i < 200; i++) {
    const c = out[i % out.length];
    if (diff > 0) { c.min++; diff--; } else if (c.min > 1) { c.min--; diff++; }
  }
  return out;
}

/* ---------- progress ---------- */

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Days in a row with any practice, ending today (or yesterday, so the streak isn't lost before you've practised today). */
export function streak(days, today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!(days[dayKey(d)] > 0)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days[dayKey(d)] > 0 && n < 3660) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** Monday-first week (index 0 = Monday) holding `date`, as day keys. */
export function weekOf(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return dayKey(d); });
}

/* ---------- practice moves ---------- */

/** Split notes into chunks of about four, then the whole thing: the "Chunk it" stages. */
export function chunkStages(count, size = 4) {
  if (count <= size) return [{ from: 0, to: count, need: 3 }];
  const parts = Math.ceil(count / size);
  const each = Math.ceil(count / parts);
  const stages = [];
  for (let from = 0; from < count; from += each) stages.push({ from, to: Math.min(count, from + each), need: 3 });
  stages.push({ from: 0, to: count, need: 2 });
  return stages;
}

/** One step of the tempo ladder. Clean → faster (to the goal); slip → a step slower (not below the start). */
export function ladderStep(tempo, clean, start, goal) {
  const step = Math.max(2, Math.round((goal - start) / 6));
  return clean ? Math.min(goal, tempo + step) : Math.max(start, tempo - step);
}

export function noteToMidi(note) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** Every pitch a card's Listen button plays, in order (MIDI numbers; sax sounds a major sixth lower). */
export function cardMidi(card) {
  if (card.keys) return card.keys.map(noteToMidi);
  if (card.notes) return card.notes.map((x) => { const m = noteToMidi(x.note); return m == null ? null : card.inst === 'sax' ? m - 9 : m; });
  if (card.tab) return card.tab.map(([s, f]) => [64, 59, 55, 50, 45, 40][s - 1] + f);
  return [];
}

export const CHORDS = { G: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'], C: ['C3', 'E3', 'G3', 'C4', 'E4'], D: ['D3', 'A3', 'D4', 'F#4'], Em: ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'], Am: ['A2', 'E3', 'A3', 'C4', 'E4'], E: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'], A: ['A2', 'E3', 'A3', 'C#4', 'E4'] };

export const kindOf = (id) => KINDS.find((x) => x.id === id) || KINDS[1];
