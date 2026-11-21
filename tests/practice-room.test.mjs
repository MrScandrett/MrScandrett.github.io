import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CARDS, INSTRUMENTS, KINDS, MOVES, cardsFor } from '../assets/js/practice-room/cards.mjs';
import { encodeSheet, decodeSheet, autoPlan, shareMinutes, streak, dayKey, chunkStages, ladderStep, cardMidi, resolveItem, LIMITS } from '../assets/js/practice-room/core.mjs';

test('every card is complete, short and uniquely numbered', () => {
  const ids = new Set();
  const insts = new Set(INSTRUMENTS.map((i) => i.id));
  for (const c of CARDS) {
    assert.ok(/^[a-z]\d{1,2}$/.test(c.id), `short id: ${c.id}`);
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
    ids.add(c.id);
    assert.ok(insts.has(c.inst), `${c.id} instrument`);
    assert.ok(KINDS.some((k) => k.id === c.kind), `${c.id} kind`);
    assert.ok(MOVES[c.move], `${c.id} move`);
    assert.ok(c.title.length <= 30, `${c.id} title is short`);
    assert.ok(c.do.length <= 100, `${c.id} instruction is one short line (${c.do.length})`);
    if (c.move === 'ladder') assert.ok(c.goal > c.tempo, `${c.id} ladder goal`);
    if (c.move === 'chunk') assert.ok((c.keys || c.notes || c.tab || []).length >= 4, `${c.id} chunk needs notes`);
    if (c.fingers?.length) assert.equal(c.fingers.length, (c.keys || c.tab).length, `${c.id} one finger per note`);
    assert.ok(cardMidi(c).every((m) => m != null && m > 20 && m < 100), `${c.id} pitches parse`);
    if (c.grid) for (const row of Object.values(c.grid)) assert.match(row, /^[xg-]{16}$/);
  }
});

test('every instrument can fill a whole session', () => {
  for (const inst of INSTRUMENTS) {
    for (const kind of KINDS) assert.ok(cardsFor(inst.id).some((c) => c.kind === kind.id), `${inst.id} has a ${kind.id} card`);
    for (const min of [5, 10, 15, 20]) {
      const plan = autoPlan(inst.id, min, '2026-11-20');
      assert.equal(plan.reduce((s, c) => s + c.min, 0), min, `${inst.id} ${min} min adds up`);
      assert.equal(new Set(plan.map((c) => c.id)).size, plan.length, 'no repeats');
      assert.equal(plan[0].kind, 'warmup');
    }
  }
  assert.deepEqual(autoPlan('piano', 10, '2026-11-20').map((c) => c.id), autoPlan('piano', 10, '2026-11-20').map((c) => c.id), 'same plan all day');
});

test('sheets round-trip through the link', () => {
  const sheet = { student: 'Maya | the "great"', inst: 'guitar', minutes: 12, days: [0, 2, 4], msg: 'Slow, then fast. 100% effort, okay?', items: [{ id: 'g2', tempo: 70 }, { id: 'g3' }, { id: 'own', title: 'Bars 5–8, page 12', do: 'Left hand alone, then hands together ~ twice.' }] };
  const back = decodeSheet(encodeSheet(sheet));
  assert.deepEqual(back, sheet);
  assert.ok(encodeSheet({ ...sheet, student: 'Maya', msg: '', items: [{ id: 'g2' }, { id: 'g3' }, { id: 'a1' }] }).length < 40, 'compact enough for a QR code');
});

test('decoding refuses or cleans anything odd', () => {
  assert.equal(decodeSheet('hello'), null);
  assert.equal(decodeSheet(42), null);
  const s = decodeSheet('1|%3Cimg%20src%3Dx%3E|nope|9999|1111111111|zz9,p1.5000,p2.abc,' + 'p3,'.repeat(40) + '|' + 'x'.repeat(500));
  assert.equal(s.inst, 'any');
  assert.equal(s.minutes, 120);
  assert.deepEqual(s.days, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(s.items.length, LIMITS.items);
  assert.deepEqual(s.items[0], { id: 'p1', tempo: 220 });
  assert.deepEqual(s.items[1], { id: 'p2' });
  assert.equal(s.msg.length, LIMITS.msg);
  assert.equal(s.student, '<img src=x>', 'text stays text; the page renders it with textContent');
  assert.equal(decodeSheet('1|a|piano|10|0000000|~%E0%A4~x|').items.length, 0, 'bad escapes do not throw');
});

test('resolveItem keeps a raised tempo below the ladder goal', () => {
  const c = resolveItem({ id: 'p3', tempo: 85 });
  assert.equal(c.tempo, 85);
  assert.ok(c.goal > c.tempo);
  assert.equal(resolveItem({ id: 'nope' }), null);
  assert.equal(resolveItem({ id: 'own', title: 'Scales', do: '' }).own, true);
});

test('minutes, streaks, chunks and ladders', () => {
  assert.deepEqual(shareMinutes([{ min: 2 }, { min: 3 }, { min: 2 }], 5).map((c) => c.min).reduce((a, b) => a + b), 5);
  assert.ok(shareMinutes([{ min: 2 }, { min: 3 }, { min: 2 }, { min: 2 }], 3).every((c) => c.min >= 1));
  const today = new Date(2026, 10, 20);
  const d = (n) => dayKey(new Date(2026, 10, 20 - n));
  assert.equal(streak({ [d(0)]: 5, [d(1)]: 3, [d(2)]: 1, [d(4)]: 9 }, today), 3);
  assert.equal(streak({ [d(1)]: 3, [d(2)]: 1 }, today), 2, 'not practised yet today keeps yesterday’s streak');
  assert.equal(streak({}, today), 0);
  assert.deepEqual(chunkStages(4), [{ from: 0, to: 4, need: 3 }]);
  const st = chunkStages(15);
  assert.equal(st.at(-1).to, 15);
  assert.ok(st.slice(0, -1).every((s) => s.to - s.from <= 4));
  assert.equal(ladderStep(50, true, 50, 80), 55);
  assert.equal(ladderStep(78, true, 50, 80), 80);
  assert.equal(ladderStep(50, false, 50, 80), 50);
});

test('instrument lessons link to the Practice Room', () => {
  for (const inst of INSTRUMENTS.filter((i) => i.lesson)) {
    const html = fs.readFileSync(new URL('../' + inst.lesson, import.meta.url), 'utf8');
    assert.ok(html.includes(`practice-room.html#start=${inst.id}`), `${inst.lesson} has a Practice today button`);
  }
});
