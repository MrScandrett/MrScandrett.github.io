import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const X = require('../assets/js/lessons/fake-book-sax.js');
const F = globalThis.SaxFingerings;     // the Saxophone lesson's table, loaded by fake-book-sax.js

const keys = (m) => X.fingering(m).keys.slice().sort();
const same = (m, list) => assert.deepEqual(keys(m), list.slice().sort(), `midi ${m}`);

test('the sheet fingers every note exactly as the Saxophone lesson teaches it', () => {
  F.notes.concat(F.palmNotes).forEach((n) => same(n.midi, n.variants[0].keys));
});

test('the shared table covers low B♭ to high F with no gaps, and the lesson list is unchanged', () => {
  assert.equal(X.LOW, 58);
  assert.equal(X.HIGH, 89);
  for (let m = X.LOW; m <= X.HIGH; m++) assert.ok(F.byMidi.has(m), `missing midi ${m}`);
  assert.equal(F.notes.at(-1).midi, 84);              // the lesson's picker still ends at high C
  assert.ok(F.palmNotes.every((n) => n.midi > 84));
  const ids = new Set(F.keys.map((k) => k.id));
  F.notes.forEach((n) => n.variants.forEach((v) => v.keys.forEach((k) => assert.ok(ids.has(k), `${k} in ${n.flat}`))));
});

test('every key a fingering uses is drawn on the sheet diagram', () => {
  F.notes.concat(F.palmNotes).forEach((n) => n.variants.forEach((v) => v.keys.forEach((k) => assert.ok(X.KEYS.includes(k), `${k} (${n.flat}, ${v.name})`))));
});

test('familiar fingerings', () => {
  same(62, ['L1', 'L2', 'L3', 'R1', 'R2', 'R3']);          // low D
  same(70, ['L1', 'bis']);                                  // B♭: bis is the standard
  same(73, []);                                             // middle C♯: all open
  same(85, ['octave']);                                     // high C♯
  same(89, ['octave', 'palmD', 'palmEflat', 'palmF', 'highE']);
  for (let m = 74; m <= 84; m++) same(m, ['octave'].concat(X.fingering(m - 12).keys));
});

test('notes outside the range are fingered an octave in and flagged', () => {
  assert.deepEqual([X.fingering(57).played, X.fingering(57).shift], [69, 12]);
  assert.deepEqual([X.fingering(91).played, X.fingering(91).shift], [79, -12]);
  assert.equal(X.fingering(NaN), null);
});

test('draw fills exactly the pressed keys', () => {
  const svg = X.draw(65, 'F');
  const filled = [...svg.matchAll(/data-key="(\w+)"[^>]*fill="currentColor"/g)].map((m) => m[1]).sort();
  assert.deepEqual(filled, ['L1', 'L2', 'L3', 'R1'].sort());
  assert.equal((svg.match(/class="fb-sx-key"/g) || []).length, X.KEYS.length);
  assert.match(svg, /aria-label="Saxophone fingering for F: LH 1 · index, LH 2 · middle, LH 3 · ring, RH 1 · index"/);
});

test('alternate B♭ fingerings use the shared table and identify the choice', () => {
  for (const midi of [70, 82]) {
    const note = F.byMidi.get(midi);
    note.variants.forEach((variant, index) => {
      const fingering = X.fingering(midi, index);
      assert.deepEqual(fingering.keys, variant.keys);
      assert.equal(fingering.name, variant.name);
      const svg = X.draw(midi, 'B♭', index);
      const filled = [...svg.matchAll(/data-key="(\w+)"[^>]*fill="currentColor"/g)].map((m) => m[1]).sort();
      assert.deepEqual(filled, variant.keys.slice().sort());
      if (index) assert.ok(svg.includes(variant.name));
    });
  }
});
