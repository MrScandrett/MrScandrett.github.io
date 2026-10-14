import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const P = require('../assets/js/lessons/fake-book-position.js');
const MV = require('../assets/js/lessons/fake-book-melody.js');

const tune = [67, 69, 71, 72, 74, 72, 71, 69, 76, 77, 79, 77, 76, 74, 72, 71];
const notes = tune.map((midi, i) => ({ bar: 1 + (i >> 2), midi, name: 'x' }));

test('every bar gets spots that sound the written pitches', () => {
  for (const inst of ['guitar', 'violin']) {
    const r = P.plan(inst, notes);
    const open = inst === 'violin' ? MV.V_OPEN : MV.OPEN;
    let i = 0;
    for (const bar of r.order) {
      for (const sp of r.bars[bar].spots) {
        assert.equal(open[sp.s] + sp.c, tune[i] + r.shift, `${inst} note ${i}`);
        i++;
      }
    }
    assert.equal(i, tune.length);
  }
});

test('voice leading: each bar remembers where the last one ended', () => {
  for (const inst of ['guitar', 'violin']) {
    const r = P.plan(inst, notes);
    r.order.slice(1).forEach((bar, k) => {
      const prevSpots = r.bars[r.order[k]].spots;
      assert.equal(r.bars[bar].from, prevSpots[prevSpots.length - 1]);
    });
    assert.equal(r.bars[r.order[0]].from, null);
  }
});

test('a tune that fits one position never shifts between bars', () => {
  const r = P.plan('violin', notes, 'auto');
  const positions = new Set(r.order.flatMap((b) => r.bars[b].positions));
  assert.ok(positions.size <= 2, [...positions].join());
});

test('draw returns one svg group per bar with a dot per distinct spot', () => {
  const r = P.plan('guitar', notes);
  const bar = r.bars[r.order[1]];
  const svg = P.draw('guitar', bar, 0, 0, 220, 110, 10);
  const distinct = new Set(bar.spots.map((s) => `${s.s}:${s.c}`)).size;
  assert.equal((svg.match(/class="fb-pos-dot/g) || []).length, distinct);
  assert.equal(P.draw('guitar', undefined, 0, 0, 220, 110, 10), '');
});

test('every built-in tune can be planned on both instruments', () => {
  const data = JSON.parse(readFileSync(new URL('../data/fake-book.json', import.meta.url), 'utf8'));
  const NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  for (const t of data.tunes) {
    const midis = [...t.melody.matchAll(/\b([A-G])(##|bb|#|b)?(\d)[whqes]/g)].map(([, l, acc = '', o]) =>
      12 * (Number(o) + 1) + NAT[l] + ({ '#': 1, '##': 2, b: -1, bb: -2 }[acc] || 0));
    if (!midis.length) continue;
    for (const inst of ['guitar', 'violin']) {
      const r = P.plan(inst, midis.map((midi, i) => ({ bar: 1 + (i >> 3), midi, name: 'x' })));
      const n = r.order.reduce((a, b) => a + r.bars[b].spots.length, 0);
      assert.equal(n, midis.length, `${t.id} ${inst}`);
    }
  }
});

test('scale compatibility uses chord tones as well as melody and retains ambiguity', () => {
  const melody = [60, 62, 64, 65, 67, 69];
  const sparse = P.analyze(melody, [], 0);
  assert.ok(sparse.some(f => f.tonic === 0 && f.mode === 'Mixolydian'));
  const major = P.analyze(melody, [0, 4, 7, 11], 0);
  assert.ok(major.some(f => f.tonic === 0 && f.mode === 'Ionian / major'));
  assert.ok(!major.some(f => f.tonic === 0 && f.mode === 'Mixolydian'));
  assert.ok(major.length > 1);
  assert.deepEqual(P.analyze([], [0,4,7], 0), []);
  assert.deepEqual(P.analyze(Array.from({length:12}, (_,i) => 60+i), [], 0), []);
  assert.deepEqual(P.analyze([60,62,64,65,67,69,71], [], 0)[0].degrees, [1,2,3,4,5,6,7]);
});
