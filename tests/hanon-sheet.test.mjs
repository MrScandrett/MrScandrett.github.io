import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.window = globalThis;
globalThis.document ??= { querySelectorAll: () => [], addEventListener() {} };
require('../assets/js/music-notation.js');
const H = require('../assets/js/lessons/hanon-sheet.js');
const MN = globalThis.MusicNotation;

test('Part I: twenty exercises, each a first cell stepped up then down the scale', () => {
  assert.deepEqual(H.DATA.map(e => e.n), Array.from({ length: 20 }, (_, i) => i + 1));
  for (const e of H.DATA) {
    const steps = [...e.play].map(c => c.charCodeAt(0) - 64);
    assert.deepEqual(steps.slice(0, 8), e.up, `No. ${e.n} starts with its printed climbing cell`);
    assert.deepEqual(steps.slice(e.split, e.split + 8), e.dn, `No. ${e.n} descent starts with its printed cell`);
    for (const k of ['uf', 'df', 'ul', 'dl']) assert.ok(e[k].length === 8 && e[k].every(f => f >= 0 && f <= 5));
    assert.equal(e.uf[0] > 0 && e.ul[0] > 0, true, `No. ${e.n} prints its opening fingers`);
  }
  // No. 1 is the famous pattern: C E F G A G F E, climbing one step per cell.
  assert.deepEqual(H.DATA[0].up, [-7, -5, -4, -3, -2, -3, -4, -5]);
  assert.deepEqual(H.DATA[0].uf, [1, 2, 3, 4, 5, 0, 0, 0]);
});

test('transposing keeps the pattern on the new scale', () => {
  const names = (n, key) => H.layout(n, key).bars[0].notes.map(x => x.rh.name).join(' ');
  assert.equal(names(1, 'C'), 'C3 E3 F3 G3 A3 G3 F3 E3');
  assert.equal(names(1, 'G'), 'G2 B2 C3 D3 E3 D3 C3 B2');
  assert.equal(names(1, 'Eb'), 'E♭3 G3 A♭3 B♭3 C4 B♭3 A♭3 G3');
  assert.equal(names(1, 'Fs'), 'F♯3 A♯3 B3 C♯4 D♯4 C♯4 B3 A♯3');
  // Harmonic minor raises the 7th: G# in A minor, F double-sharp in G# minor.
  assert.match(H.describe(H.layout(2, 'Am')), /G♯4/);
  assert.match(H.describe(H.layout(1, 'Gsm')), /F𝄪4/);
  for (const k of H.KEYS) {
    const p = H.performance(1, k.id);
    const tonicPc = ((p.rh[0] % 12) + 12) % 12;
    const want = { C: 0, G: 7, D: 2, A: 9, E: 4, B: 11, Fs: 6, Db: 1, Ab: 8, Eb: 3, Bb: 10, F: 5,
      Am: 9, Em: 4, Bm: 11, Fsm: 6, Csm: 1, Gsm: 8, Dm: 2, Gm: 7, Cm: 0, Fm: 5, Bbm: 10, Ebm: 3 }[k.id];
    assert.equal(tonicPc, want, `${k.label} starts on its tonic`);
    assert.ok(p.lh.every((m, i) => m === p.rh[i] - 12), 'left hand an octave lower');
  }
});

test('accidentals print once per staff position per bar', () => {
  const bar = H.layout(1, 'Gsm').bars[1];
  const fx = bar.notes.filter(n => n.rh.name === 'F𝄪4');
  assert.equal(fx.length, 1);
  assert.equal(fx[0].ra, 2);
  assert.ok(H.layout(1, 'C').bars.every(b => b.notes.every(n => n.ra == null && n.la == null)));
});

test('every exercise engraves in every key to a shared width', () => {
  for (const k of H.KEYS) {
    const lays = H.DATA.map(e => H.layout(e.n, k.id));
    const width = Math.max(...lays.map(H.natural));
    for (const l of lays) {
      const r = H.engrave(l, MN, { width });
      assert.ok(Math.abs(r.width - width) < 0.6, `No. ${l.n} in ${k.label} justified (${r.width} vs ${width})`);
      assert.ok(!/NaN|undefined/.test(r.svg), `No. ${l.n} in ${k.label} has clean SVG`);
      assert.equal((r.svg.match(/hs-head/g) || []).length, 32, 'two hands × two cells of eight');
    }
  }
});

test('exercise lists pack into short links', () => {
  assert.equal(H.packList([1, 2, 3, 4, 7, 9, 10]), '1-4,7,9-10');
  assert.deepEqual(H.unpackList('1-4,7,9-10', 20), [1, 2, 3, 4, 7, 9, 10]);
  assert.deepEqual(H.unpackList('18-25,x,0', 20), [18, 19, 20]);
});
