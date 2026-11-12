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
  assert.ok(!F.isKeyboard({ ...library['mozart-turkish-march'], id: 'mozart-turkish-march' }));
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

test('chords: right hand thumb is lowest, left hand little finger is lowest', () => {
  const score = library['bach-prelude-c-major'];
  const layout = layoutFor('bach-prelude-c-major');
  const plan = F.plan(layout, score);
  const chord = layout.events.find(ev => ev.staff === 0 && ev.kind === 'note' && ev.pitches && ev.pitches.length > 1 && plan[ev.i]);
  if (chord) assert.equal(plan[chord.i][0], 1);
  const left = layout.events.find(ev => ev.staff === 1 && ev.kind === 'note' && ev.pitches && ev.pitches.length > 1 && plan[ev.i] && ev.pitches.length < 6);
  if (left) assert.equal(plan[left.i][0], 5);
});
