import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const S = createRequire(import.meta.url)('../assets/js/lessons/fake-book-shape-options.js');
const context = vm.createContext({ window: {} });
const source = readFileSync(new URL('../assets/js/lessons/guitar-chords.js', import.meta.url), 'utf8');
vm.runInContext(source.slice(0, source.indexOf('/* guitar-chords.js — plucked-string')), context);
const GT = context.window.GuitarTheory;
const type = (suffix) => GT.CHORD_TYPES.find((c) => c.suffix === suffix) || { suffix, intervals: [0, 4, 7, 10, 2] };   // 9 isn't in the guitar table: the page builds the type from its own chord table
const OPEN = [40, 45, 50, 55, 59, 64];
const sounding = (frets) => frets.map((f, s) => (typeof f === 'number' ? OPEN[s] + f : null)).filter((n) => n !== null).sort((a, b) => a - b);
const pcs = (frets) => sounding(frets).map((n) => n % 12);

test('every offered shape is playable and spells the chord', () => {
  for (const [root, suffix] of [[7, ''], [9, 'm7'], [0, '9'], [11, '7'], [6, 'm'], [10, 'maj7']]) {
    const t = type(suffix);
    assert.ok(t, suffix);
    const list = S.options(GT, { rootPC: root, type: t });
    assert.ok(list.length >= 3, `${root}${suffix} has alternatives`);
    const ids = new Set();
    for (const sh of list) {
      assert.ok(!ids.has(sh.id), 'no duplicate shapes'); ids.add(sh.id);
      assert.equal(sh.frets.length, 6);
      const fr = sh.frets.filter((f) => typeof f === 'number' && f > 0);
      if (fr.length) assert.ok(Math.max(...fr) - Math.min(...fr) <= 4);
      const got = new Set(pcs(sh.frets).map((p) => (p - root + 12) % 12));
      for (const p of got) assert.ok(t.intervals.includes(p), `${sh.id} has a foreign tone`);
      assert.equal(pcs(sh.frets)[0], root, `${sh.id} bass is the root`);
    }
    assert.equal(list[0].tag === 'Standard' || list[0].position <= 3, true, 'open or standard shape first');
    for (let i = 1; i < list.length; i++) assert.ok(list[i].rank >= list[i - 1].rank, 'neck order');
  }
});

test('a slash chord keeps its bass', () => {
  const list = S.options(GT, { rootPC: 0, type: type(''), bassPC: 4 });
  assert.ok(list.length);
  list.forEach((sh) => assert.equal(pcs(sh.frets)[0], 4));
  const odd = S.options(GT, { rootPC: 0, type: type(''), bassPC: 2 });   // C/D: bass outside the chord
  assert.ok(odd.length);
  odd.forEach((sh) => assert.equal(pcs(sh.frets)[0], 2));
});

test('picks round-trip and bad input is refused', () => {
  const f = ['x', 0, 2, 2, 1, 0];
  assert.equal(S.toId(f), 'x,0,2,2,1,0');
  assert.deepEqual(S.fromId('x,0,2,2,1,0'), f);
  for (const bad of ['', 'x,0,2', 'x,0,2,2,1,99', 'a,b,c,d,e,f', null, 5]) assert.equal(S.fromId(bad), null);
});

test('diagram draws a barre bar and finger numbers', () => {
  const svg = S.diagram(GT, [1, 3, 3, 2, 1, 1], { rootPC: 5, type: type('') }, 'F');
  assert.match(svg, /fb-sp-barre/);
  assert.match(svg, /fb-sp-fing/);
  assert.match(svg, /<svg[^>]*aria-label="F"/);
});
