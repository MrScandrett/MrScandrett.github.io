import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../assets/js/music-notation.js');
require('../assets/js/score-engine.js');
const F = require('../assets/js/score-fingering.js');
const library = require('../data/score-library.json').scores;
const engine = globalThis.ScoreEngine;

const layoutFor = id => { const m = engine.prepare(library[id]); engine.analyse(m); return engine.engrave(m, 1085, true); };

test('keyboard detection covers piano scores and unlabeled hand staves, not other instruments', () => {
  assert.ok(F.isKeyboard(library['bach-prelude-c-major']));
  assert.ok(F.isKeyboard(library['chopin-prelude-6']));
  assert.ok(!F.isKeyboard(library['vivaldi-spring-1']));
  assert.ok(!F.isKeyboard(library['tarrega-adelita']));
  assert.ok(F.isKeyboard({ ...library['mozart-turkish-march'], id: 'mozart-turkish-march' }));
});

test('every keyboard score gets only fingers 1-5, deterministically', () => {
  for (const [id, score] of Object.entries(library)) {
    if (!F.isKeyboard(score)) continue;
    const layout = layoutFor(id);
    const a = F.plan(layout, score);
    assert.ok(Object.keys(a).length > 0, id + ' has no fingering');
    for (const list of Object.values(a)) for (const f of list) if (f != null) assert.ok(f >= 1 && f <= 5, id);
    assert.deepEqual(F.plan(layout, score), a, id);
  }
});

const handScore = hand => ({ staves: [{ instrument: 'piano', label: hand + ' hand' }] });
const notesLayout = pitches => ({ events: pitches.map((ps, i) => ({
  i, staff: 0, bar: 0, start: i, abs: i, dur: 1, kind: 'note',
  pitches: (Array.isArray(ps) ? ps : [ps]).map(midi => ({ midi }))
})) });
const sequence = (ns, hand) => Object.values(F.plan(notesLayout(ns), handScore(hand))).flat();

test('isolated C-major scales and five-finger patterns use conventional mirrored fingering', () => {
  const c = [60, 62, 64, 65, 67, 69, 71, 72];
  assert.deepEqual(sequence(c, 'right'), [1, 2, 3, 1, 2, 3, 4, 5]);
  assert.deepEqual(sequence(c, 'left'), [5, 4, 3, 2, 1, 3, 2, 1]);
  assert.deepEqual(sequence(c.slice(0, 5), 'right'), [1, 2, 3, 4, 5]);
  assert.deepEqual(sequence(c.slice(0, 5), 'left'), [5, 4, 3, 2, 1]);
});

test('chord spacing determines the fingers; close dyads do not automatically get 1–5', () => {
  assert.deepEqual(sequence([[60, 62]], 'right'), [1, 2]);
  assert.deepEqual(sequence([[60, 62]], 'left'), [5, 4]);
  assert.deepEqual(sequence([[60, 72]], 'right'), [1, 5]);
  assert.deepEqual(sequence([[60, 72]], 'left'), [5, 1]);
  assert.deepEqual(sequence([[60, 64, 67]], 'right'), [1, 3, 5]);
});

test('left-hand octave ascent keeps context rather than restarting on an arbitrary index finger', () => {
  const fs = sequence([44, 56, 63, 56], 'left');
  assert.equal(fs[0], 5);
  assert.ok(fs[1] < fs[0], fs.join(''));
  assert.equal(fs[2], 1);
});

test('wide chords, excessive voices, and selected reach limits get review markers, not numbers', () => {
  for (const ps of [[60, 76], [60, 64, 67, 72, 74, 76]]) {
    const detail = F.planDetailed(notesLayout([ps]), handScore('right'));
    assert.equal(detail.fingers[0], undefined);
    assert.match(detail.reviews[0], /Reach|spacing/);
  }
  const detail = F.planDetailed(notesLayout([[60, 69]]), handScore('right'), { reach: 7 });
  assert.equal(detail.fingers[0], undefined);
  assert.ok(detail.reviews[0]);
  assert.ok(F.plan(notesLayout([[60, 69]]), handScore('right'), { reach: 9 })[0]);
});

test('held voices reserve their fingers across attacks, including ties and partial ties', () => {
  const layout = notesLayout([60, 67, 60, [60, 64], 65]);
  layout.events[0].dur = 2; layout.events[0].tie = true;
  layout.events[0].tieTo = layout.events[2]; layout.events[2].dur = 1;
  layout.events[2].pitches[0].tiedFrom = true;
  // The new chord sustains C while a later F is attacked.
  layout.events[3].dur = 2;
  const fs = F.plan(layout, handScore('right'));
  assert.notEqual(fs[0][0], fs[1][0]);
  assert.equal(fs[2], undefined, 'a continuation tie is not re-fingered');
  assert.ok(!fs[3].includes(fs[4][0]), 'held chord fingers cannot play the new note');
  const partial = notesLayout([[60, 64], [60, 65]]);
  partial.events[0].tie = true; partial.events[0].tieTo = partial.events[1];
  partial.events[1].pitches[0].tiedFrom = true;
  const pf = F.plan(partial, handScore('right'));
  assert.equal(pf[1][0], undefined);
  assert.ok(pf[1][1]);
});

test('teacher annotations constrain subsequent held-note suggestions and are never replaced', () => {
  const layout = notesLayout([60, 64]);
  layout.events[0].fingering = '2'; layout.events[0].dur = 2;
  const fs = F.plan(layout, handScore('right'));
  assert.equal(fs[0], undefined);
  assert.notEqual(fs[1][0], 2);
});

test('ornaments are referred for review rather than assigning only their main note', () => {
  const layout = notesLayout([60, 62]);
  layout.events[0].orn = ['tr'];
  const d = F.planDetailed(layout, handScore('right'));
  assert.equal(d.fingers[0], undefined);
  assert.match(d.reviews[0], /Ornament/);
  assert.ok(d.fingers[1]);
});

test('mixed ensembles annotate keyboard staves only', () => {
  const score = { staves: [{ instrument: 'piano', label: 'Right hand' }, { instrument: 'violin', clef: 'treble' }] };
  const layout = notesLayout([60, 64]); layout.events[1].staff = 1;
  const fs = F.plan(layout, score);
  assert.ok(fs[0]); assert.equal(fs[1], undefined);
});

test('every library keyboard score respects simultaneous keys, held fingers and all three reach settings', () => {
  let scores = 0, suggestions = 0, reviews = 0;
  for (const [id, score] of Object.entries(library)) {
    if (!F.isKeyboard(score)) continue;
    scores++;
    const layout = layoutFor(id);
    for (const reach of [7, 9, 12]) {
      const detail = F.planDetailed(layout, score, { reach });
      for (const g of detail.groups) {
        const assigned = g.notes.map(n => {
          const e = n.entries.find(e => !e.tied && detail.fingers[e.ev.i]?.[e.pi]);
          return e ? { midi: n.midi, f: detail.fingers[e.ev.i][e.pi] } : null;
        }).filter(Boolean);
        if (!assigned.length) continue;
        suggestions += assigned.length;
        assert.equal(new Set(assigned.map(n => n.f)).size, assigned.length, id + ': finger reused at an onset');
        assert.ok(assigned.at(-1).midi - assigned[0].midi <= reach, id + ': excessive reach');
        for (let i = 1; i < assigned.length; i++) {
          assert.ok(g.hand === 'left' ? assigned[i].f < assigned[i-1].f : assigned[i].f > assigned[i-1].f, id + ': crossed chord fingers');
        }
        // Trace each sounding key back to its attack and verify fingers stay reserved.
        const sounding = g.notes.map(n => {
          const origin = layout.events.findLast(ev => g.staffIndices.includes(ev.staff) && ev.abs <= g.time + 1e-5 &&
            ev.pitches?.some((p, pi) => p.midi === n.midi && !p.tiedFrom && detail.fingers[ev.i]?.[pi]));
          const pi = origin?.pitches.findIndex(p => p.midi === n.midi);
          return origin && detail.fingers[origin.i][pi];
        }).filter(Boolean);
        assert.equal(new Set(sounding).size, sounding.length, id + ': a held finger was reused');
      }
      reviews += Object.keys(detail.reviews).length;
    }
  }
  console.log(`Fingering audit: ${scores} keyboard scores; ${suggestions} suggested pitches and ${reviews} review events across three reach settings.`);
});

test('Raindrop measures 8–9 correct the reported reaches and left-hand octave transition', () => {
  const score = library['chopin-prelude-15'];
  const layout = layoutFor('chopin-prelude-15');
  const d = F.planDetailed(layout, score);
  const opening = layout.events.filter(e => e.staff === 0 && e.bar === 7 && e.start === 0 && e.kind === 'note');
  assert.deepEqual(opening.flatMap(e => e.pitches.map(p => p.midi)).sort((a,b) => a-b), [60, 68, 77]);
  for (const ev of opening) { assert.equal(d.fingers[ev.i], undefined); assert.ok(d.reviews[ev.i]); }
  const bass = layout.events.filter(e => e.staff === 1 && e.bar === 8 && e.kind === 'note');
  assert.equal(d.fingers[bass[0].i][0], 5);
  assert.ok(d.fingers[bass[1].i][0] < 5);
  assert.equal(d.fingers[bass[2].i][0], 1);
  const tenth = bass.find(e => e.pitches.length === 3 && e.pitches[0].midi === 49);
  assert.equal(d.fingers[tenth.i], undefined); assert.ok(d.reviews[tenth.i]);
});

test('one hand on two staves shares reservations while duet players remain independent', () => {
  const layout = notesLayout([60, 67]);
  layout.events[0].dur = 2; layout.events[1].staff = 1;
  const score = { staves: [
    { label: 'Right hand · upper', instrument: 'piano' },
    { label: 'Right hand · lower', instrument: 'piano' }
  ] };
  let d = F.planDetailed(layout, score);
  assert.equal(d.fingers[1], undefined); assert.match(d.reviews[1], /multiple staves/);
  score.staves[0].label = 'Primo right hand'; score.staves[1].label = 'Secondo right hand';
  d = F.planDetailed(layout, score);
  assert.ok(d.fingers[0]); assert.ok(d.fingers[1]); assert.equal(d.reviews[1], undefined);
});
