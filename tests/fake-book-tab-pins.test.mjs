import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const T = require('../assets/js/lessons/fake-book-tab.js');
const F = require('../assets/js/lessons/fake-book-fingering.js');

const STD = T.STANDARD;
const sounds = (f) => T.pitches(f, STD);
// A G-major tune, written pitch (guitar sounds an octave lower), one note a beat, four bars.
const TUNE = [67, 71, 74, 79, 78, 76, 74, 72, 71, 72, 74, 76, 74, 71, 69, 67];
const onsets = (tune = TUNE) => tune.map((m, i) => ({ start: i, ms: [m] }));
const spanOf = (s) => [Math.floor(s / 4) * 4, Math.floor(s / 4) * 4 + 4];
const plain = T.plan(onsets(), { maxFret: 22 }).events;
const same = (a, b) => T.key(a) === T.key(b);

function pinned(pins, extra = {}) {
  const os = onsets(extra.tune), keep = T.plan(os, { maxFret: 22 }).events.map((e) => e.f);
  const r = T.resolvePins(os, pins, { maxFret: 22, spanOf, keep });
  return { r, plan: T.plan(os, { maxFret: 22, fixed: r.fixed, near: r.near, keep, stick: 0.3 }) };
}

test('a pinned beat gets the chosen fingering and every beat still sounds the written note', () => {
  const choice = T.choices(onsets()[5], { maxFret: 22 }).filter((c) => c.hand >= 7)[0];   // E up the neck
  assert.ok(choice, 'there is a high fingering for E');
  const { plan, r } = pinned([{ start: 5, f: choice.f, scope: 'note' }]);
  assert.equal(r.used.length, 1);
  assert.ok(same(plan.events[5].f, choice.f));
  plan.events.forEach((e, i) => assert.deepEqual(sounds(e.f), [TUNE[i]], `beat ${i}`));
});

test('a pin pulls its bar to its hand position; other bars stay as they were', () => {
  const choice = T.choices(onsets()[5], { maxFret: 22 }).filter((c) => c.hand >= 7)[0];
  const { plan } = pinned([{ start: 5, f: choice.f, scope: 'bar' }]);
  for (let i = 4; i < 8; i++) {
    const h = T.hand(plan.events[i].f);
    assert.ok(h === 0 ? false : Math.abs(h - choice.hand) <= 4, `beat ${i} at ${h}, pin at ${choice.hand}`);
  }
  // Two bars away, nothing needed to move.
  for (let i = 12; i < 16; i++) assert.ok(same(plan.events[i].f, plain[i].f), `beat ${i} moved`);
});

test('"until the next pin" carries the position further than "its bar"', () => {
  const choice = T.choices(onsets()[1], { maxFret: 22 }).filter((c) => c.hand >= 7)[0];
  const moved = (scope) => pinned([{ start: 1, f: choice.f, scope }]).plan.events.filter((e, i) => !same(e.f, plain[i].f)).length;
  assert.ok(moved('note') <= moved('bar'));
  assert.ok(moved('bar') <= moved('on'));
  assert.ok(moved('on') > moved('note'), 'the passage follows the pin');
});

test('a pin follows the tune into another key: same strings, moved by the interval', () => {
  const choice = T.choices(onsets()[5], { maxFret: 22 }).filter((c) => c.hand >= 5)[0];
  const up2 = TUNE.map((m) => m + 2);
  const { plan, r } = pinned([{ start: 5, f: choice.f, ms: sounds(choice.f), scope: 'bar' }], { tune: up2 });
  assert.equal(r.stale.length, 0);
  assert.deepEqual(plan.events[5].f.map(([s, fr]) => [s, fr - 2]).sort(), choice.f.slice().sort());
});

test('a pin whose beat now holds a different shape of notes is set aside, not applied', () => {
  const two = onsets().map((o, i) => (i === 5 ? { start: 5, ms: [76, 55] } : o));
  const r = T.resolvePins(two, [{ start: 5, f: [[1, 0]], ms: [76], scope: 'bar' }], { maxFret: 22, spanOf });
  assert.equal(r.stale.length, 1);
  assert.equal(r.fixed[5], undefined);
  const gone = T.resolvePins(onsets(), [{ start: 99, f: [[1, 0]], ms: [76] }], { maxFret: 22 });
  assert.equal(gone.stale.length, 1);
});

test('choices: every option sounds the beat, none repeats, lowest on the neck first', () => {
  const o = { start: 0, ms: [76, 64] };                      // E over the E an octave down
  const list = T.choices(o, { maxFret: 15 });
  assert.ok(list.length >= 3);
  assert.equal(new Set(list.map((c) => T.key(c.f))).size, list.length);
  list.forEach((c) => assert.deepEqual(sounds(c.f), [64, 76]));
  for (let i = 1; i < list.length; i++) assert.ok(list[i].hand >= list[i - 1].hand);
  // An imported tab's own fingering is offered even if it stretches further than we would.
  const wide = [[1, 7], [6, 3]];
  assert.ok(T.choices(o, { maxFret: 15, include: wide }).some((c) => T.key(c.f) === T.key(wide)));
});

test('chord melody: optional tones are added when they fit and never count as dropped', () => {
  const o = [{ start: 0, ms: [76, 52], extra: [68, 62] }];   // E melody, low E bass, G# and D under it (E7)
  const r = T.plan(o, { maxFret: 22 });
  assert.equal(r.dropped, 0);
  const got = sounds(r.events[0].f);
  assert.ok(got.includes(76) && got.includes(52));
  assert.ok(got.length >= 3, 'at least one chord tone fits');
  const crowded = [{ start: 0, ms: [88, 40 + 12], extra: [80, 74] }];   // too far apart for one hand
  assert.equal(T.plan(crowded, { maxFret: 22 }).dropped, 0);
});

test('an imported tab kept as written only changes where a pin forces it', () => {
  const os = onsets(), original = plain.map((e) => e.f);
  const choice = T.choices(os[9], { maxFret: 22 }).filter((c) => c.hand >= 7)[0];
  const r = T.resolvePins(os, [{ start: 9, f: choice.f, scope: 'note' }], { maxFret: 22, spanOf, keep: original });
  const p = T.plan(os, { maxFret: 22, fixed: r.fixed, near: r.near, keep: original, stick: 1 }).events;
  assert.ok(same(p[9].f, choice.f));
  const changed = p.map((e, i) => (same(e.f, original[i]) ? null : i)).filter((i) => i !== null);
  assert.ok(changed.every((i) => Math.abs(i - 9) <= 3), `changed far away: ${changed}`);
});

test('key positions: G on the low E string at fret 3, and a G-major tune fits around there', () => {
  const pos = T.keyPositions(onsets(), 7);
  assert.equal(pos.length, 13);
  assert.deepEqual(pos[3].root, { string: 6, fret: 3 });
  assert.equal(pos[2].fit, 1);
  assert.ok(pos[3].fit > 0.9 && pos[3].fit < 1, 'F# at fret 2 is a stretch from 3rd position');
  pos.forEach((p) => assert.ok(p.fit >= 0 && p.fit <= 1));
  assert.ok(pos[12].fit < 1, 'twelfth position is too high for the low notes of this tune');
});

test('fingering words: hand moves, beat names, descriptions', () => {
  assert.equal(F.handMove([[2, 3]], [[1, 5]]).kind, 'stay');
  const up = F.handMove([[2, 3]], [[1, 10]]);
  assert.equal(up.kind, 'shift'); assert.equal(up.frets, 7); assert.match(up.text, /7 frets up/);
  assert.equal(F.handMove([[2, 3]], [[1, 0]]).kind, 'free');
  assert.equal(F.beatName(0), 'beat 1');
  assert.equal(F.beatName(1.5), 'beat 2&');
  assert.equal(F.beatName(2.25), 'beat 3e');
  assert.equal(F.beatName(3.75), 'beat 4a');
  assert.equal(F.describe([[3, 7]]), 'fret 7 on the G string');
  assert.equal(F.describe([[6, 3], [2, 0]]), 'B open + low E fret 3');
  assert.equal(F.posName(5), 'pos. V');
});

test('mini fretboard: one dot per fretted note, every dot inside the board', () => {
  const svg = F.miniBoard([[1, 12], [3, 9], [6, 0]], { width: 132 });
  assert.equal((svg.match(/class="fb-fing-dot"/g) || []).length, 2);
  assert.equal((svg.match(/class="fb-fing-open"/g) || []).length, 1);
  [...svg.matchAll(/class="fb-fing-dot" cx="([\d.]+)"/g)].forEach(([, x]) => assert.ok(+x > 16 && +x < 126, x));
});

test('hand marks: a new position is marked only where the hand has to move', () => {
  const ev = [{ f: [[2, 3]] }, { f: [[1, 5]] }, { f: [] }, { f: [[1, 0]] }, { f: [[1, 12]] }, { f: [[2, 13]] }, { f: [[3, 2]] }];
  assert.deepEqual(F.handMarks(ev), { 0: 3, 4: 12, 6: 2 });
});

test('octaves: an arrangement lifts its melody and chord tones and keeps the bass under them', () => {
  const os = [{ start: 0, ms: [64, 52], extra: [59], arranged: true }, { start: 1, ms: [67], arranged: true }];
  const up = T.shiftOctaves(os, { octave: 1 });
  assert.deepEqual(up.onsets[0].ms, [76, 52]);
  assert.deepEqual(up.onsets[0].extra, [71]);
  assert.deepEqual(up.onsets[1].ms, [79]);
  assert.deepEqual(up.shift, [1, 1]);
  assert.equal(up.short, 0);
  // Down an octave the melody lands on the open low E: the bass can't go under it, so it makes way.
  const down = T.shiftOctaves(os, { octave: -1 });
  assert.deepEqual(down.onsets[0].ms, [52]);
  assert.deepEqual(down.shift, [-1, -1]);
  // A melody that would leave the neck stays where it is, and is counted.
  const low = T.shiftOctaves([{ start: 0, ms: [60, 52], arranged: true }], { octave: -1 });
  assert.deepEqual(low.onsets[0].ms, [60, 52]);
  assert.equal(low.short, 1);
});

test('octaves: a guitar part moves whole, and only as far as the neck reaches', () => {
  const os = [{ start: 0, ms: [60, 55] }, { start: 1, ms: [88] }];
  const r = T.shiftOctaves(os, { octave: 1 });
  assert.deepEqual(r.onsets[0].ms, [72, 67]);
  assert.deepEqual(r.onsets[1].ms, [88], 'E6 + an octave is past the 18th fret: it stays');
  assert.deepEqual(r.shift, [1, 0]);
  assert.equal(r.short, 1);
  assert.equal(T.moveOctave({ start: 0, ms: [60] }, 3).k, 2, 'as many octaves as fit');
});

test('a pin can move its bar up an octave; the rest of the tune stays where it was', () => {
  const os = onsets().map((o) => ({ ...o, arranged: true }));
  const pin = { start: 5, f: [[1, 12]], ms: [88], scope: 'bar', oct: 1 };       // the E an octave up, at the 12th fret
  const sh = T.shiftOctaves(os, { pins: [pin], spanOf });
  assert.deepEqual(sh.want, [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  sh.onsets.forEach((o, i) => assert.equal(o.ms[0], TUNE[i] + (i >= 4 && i < 8 ? 12 : 0)));
  const r = T.resolvePins(sh.onsets, [pin], { maxFret: 22, spanOf });
  assert.equal(r.stale.length, 0);
  const p = T.plan(sh.onsets, { maxFret: 22, fixed: r.fixed, near: r.near });
  assert.ok(same(p.events[5].f, [[1, 12]]));
  p.events.forEach((e, i) => assert.deepEqual(sounds(e.f), [sh.onsets[i].ms[0]]));
});
