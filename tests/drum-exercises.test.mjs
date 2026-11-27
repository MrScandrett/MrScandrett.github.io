import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const X = require('../assets/js/lessons/drum-exercises-model.js');

function* everyCase() {
  for (const e of X.EXERCISES) for (let tier = 1; tier <= 4; tier++) {
    for (const [variant] of X.variantsFor(e.id, tier) || [[null]]) for (const lead of ['R', 'L']) yield { e, tier, variant, lead };
  }
}

test('every exercise builds at every level, version and lead hand, and plays cleanly', () => {
  let n = 0;
  for (const { e, tier, variant, lead } of everyCase()) {
    const ex = X.build(e.id, tier, { variant, lead, seed: 12345 });
    const where = `${e.id} level ${tier} ${variant || ''} ${lead}`;
    assert.ok(ex.title && ex.how.length >= 2 && ex.check, `${where} has a title, steps and a goal to move on`);
    assert.ok(ex.tier >= e.min, `${where} never builds below its first level`);
    assert.deepEqual(X.problems(ex.pattern), [], `${where} is a pattern drums.js can play and engrave`);
    assert.ok(X.CATEGORIES.some(c => c.id === e.cat), `${where} is in a known category`);
    n++;
  }
  assert.ok(n > 250, `${n} cases`);
});

test('each level is a real step up: no exercise repeats the same pattern at two levels', () => {
  for (const e of X.EXERCISES) {
    const seen = new Map();
    for (let tier = e.min; tier <= 4; tier++) {
      const ex = X.build(e.id, tier, { seed: 1 });
      const sig = JSON.stringify(ex.pattern.tracks) + ex.pattern.tempo + (ex.pattern.sticking || '');
      if (!e.variants) assert.ok(!seen.has(sig), `${e.id} level ${tier} is the same as level ${seen.get(sig)}`);
      seen.set(sig, tier);
    }
  }
});

test('left lead mirrors every sticking and flam, and changes nothing else', () => {
  for (const e of X.EXERCISES) for (let tier = e.min; tier <= 4; tier++) {
    const r = X.build(e.id, tier, { lead: 'R', seed: 3 }), l = X.build(e.id, tier, { lead: 'L', seed: 3 });
    assert.deepEqual(l.pattern.tracks, r.pattern.tracks);
    if (r.pattern.sticking) assert.equal(l.pattern.sticking, X.swapHands(r.pattern.sticking));
    for (const k of Object.keys(r.pattern.graceStick || {})) assert.equal(l.pattern.graceStick[k], X.swapHands(r.pattern.graceStick[k]));
  }
});

test('rudiments are spelled the standard way', () => {
  assert.equal(X.build('paradiddle', 2, { variant: 'single' }).pattern.sticking, 'RLRRLRLLRLRRLRLL');
  assert.equal(X.build('paradiddle', 2, { variant: 'inverted' }).pattern.sticking, 'RLLRLRRLRLLRLRRL');
  assert.equal(X.build('doubles', 2).pattern.sticking, 'RRLLRRLLRRLLRRLL');
  assert.equal(X.build('rolls', 2).pattern.sticking, 'RRLLR---LLRRL---');
  const flam = X.build('flams', 2).pattern;
  for (const k of Object.keys(flam.grace)) assert.notEqual(flam.graceStick[k].toUpperCase(), flam.sticking[k]);
});

test('linear grooves never put two limbs on one note', () => {
  for (let tier = 3; tier <= 4; tier++) {
    const { tracks } = X.build('linear', tier).pattern;
    for (let i = 0; i < 16; i++) assert.ok(Object.values(tracks).filter(t => t[i] !== '-').length <= 1, `step ${i}`);
  }
});

test('sight-reading is new for every seed, the same for the same seed, and starts each bar on 1', () => {
  const a = X.build('reading', 3, { seed: 1 }).pattern.tracks.snare, b = X.build('reading', 3, { seed: 1 }).pattern.tracks.snare;
  assert.equal(a, b);
  const many = new Set(Array.from({ length: 30 }, (_, s) => X.build('reading', 3, { seed: s }).pattern.tracks.snare));
  assert.ok(many.size > 20);
  for (let s = 0; s < 50; s++) for (let t = 1; t <= 4; t++) {
    const tr = X.build('reading', t, { seed: s }).pattern.tracks.snare;
    assert.equal(tr[0], 'x'); assert.equal(tr[16], 'x');
  }
});

test('routines only use exercises the level has unlocked, and every preset exists', () => {
  for (const p of X.PRESETS) {
    for (const [id] of p.steps) assert.ok(X.exerciseById(id), `${p.id} names ${id}`);
    for (let tier = 1; tier <= 4; tier++) for (const s of X.routine(p.id, tier)) assert.ok(X.exerciseById(s.id).min <= tier);
  }
  assert.ok(X.routine('warmup', 1).length === 3);
});

test('the drum lesson loads the exercises after drums.js, which exposes its player', () => {
  const html = readFileSync(new URL('../lessons/music/instruments/drums.html', import.meta.url), 'utf8');
  assert.match(html, /data-drum-exercises/);
  const i = html.indexOf('lessons/drums.js'), j = html.indexOf('drum-exercises-model.js'), k = html.indexOf('drum-exercises.js"');
  assert.ok(i > 0 && i < j && j < k);
  assert.match(readFileSync(new URL('../assets/js/lessons/drums.js', import.meta.url), 'utf8'), /createPlayer: createPlayer/);
});
