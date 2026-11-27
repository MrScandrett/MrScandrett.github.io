import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.window = globalThis;
globalThis.document ??= { querySelectorAll: () => [], addEventListener() {} };
require('../assets/js/music-notation.js');
const X = require('../assets/js/lessons/piano-exercises-model.js');
const MN = globalThis.MusicNotation;

const names = ev => ev.map(e => e.ps.join('+'));
const fingers = ev => ev.map(e => (e.f || []).join('+'));

function* everyCase() {
  for (const key of X.KEYS) for (const e of X.EXERCISES) for (let tier = 1; tier <= 4; tier++) {
    for (const [variant] of X.variantsFor(e.id, key) || [[null]]) yield { key, e, tier, variant };
  }
}

test('every exercise builds in every key, level and version, and engraves', () => {
  let n = 0;
  for (const { key, e, tier, variant } of everyCase()) {
    const ex = X.build(e.id, key.id, tier, variant);
    const where = `${e.id} ${key.id} level ${tier} ${variant || ''}`;
    assert.ok(ex.title && ex.how.length && ex.check, `${where} has a title, steps and a goal to move on`);
    assert.ok(ex.tier >= e.min, `${where} never builds below its first level`);
    if (!e.interactive) {
      assert.ok(ex.rh.length && ex.lh.length, `${where} has music for both hands`);
      const out = X.engrave(ex, MN);
      assert.match(out.svg, /^<svg[^>]+viewBox/, `${where} engraves`);
      assert.ok(!/NaN|undefined/.test(out.svg), `${where} engraves without NaN/undefined`);
    }
    n++;
  }
  assert.ok(n > 1500);
});

test('no note crosses a bar line, and every value is one the engraver can draw', () => {
  for (const { key, e, tier, variant } of everyCase()) {
    if (e.interactive) continue;
    const ex = X.build(e.id, key.id, tier, variant);
    for (const h of ['rh', 'lh']) {
      let t = 0;
      for (const ev of ex[h]) {
        assert.ok(Math.abs(ev.t - t) < 1e-6, `${e.id} ${key.id} ${h} events are back to back`);
        t += ev.d;
        const bar = Math.floor(ev.t / 4 + 1e-6);
        assert.ok(ev.t + ev.d <= (bar + 1) * 4 + 1e-6, `${e.id} ${key.id} L${tier} ${h}: ${ev.ps} at ${ev.t} crosses a bar line`);
        if (!ev.tup) assert.ok([4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25].includes(ev.d), `${e.id} ${h} duration ${ev.d} is notatable`);
      }
      assert.ok(Math.abs(t / 4 - Math.round(t / 4)) < 1e-6, `${e.id} ${key.id} L${tier} ${h} ends on a bar line`);
    }
    const rhEnd = ex.rh.reduce((s, e2) => s + e2.d, 0), lhEnd = ex.lh.reduce((s, e2) => s + e2.d, 0);
    assert.ok(Math.abs(rhEnd - lhEnd) < 1e-6, `${e.id} ${key.id} L${tier}: both hands end together`);
  }
});

test('scales are spelled for the key and fingered the standard way', () => {
  const c = X.build('scale', 'C', 1);
  assert.deepEqual(names(c.rh), ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4']);
  assert.deepEqual(fingers(c.rh).slice(0, 8), ['1', '2', '3', '1', '2', '3', '4', '5']);
  assert.deepEqual(fingers(c.lh).slice(0, 8), ['5', '4', '3', '2', '1', '3', '2', '1']);
  // F♯ major keeps its E♯, never F; D♭ major its C and G♭.
  assert.deepEqual(names(X.build('scale', 'Fs', 1).rh).slice(0, 8), ['F#4', 'G#4', 'A#4', 'B4', 'C#5', 'D#5', 'E#5', 'F#5']);
  assert.deepEqual(fingers(X.build('scale', 'Fs', 1).rh).slice(0, 8), ['2', '3', '4', '1', '2', '3', '1', '2']);
  assert.deepEqual(names(X.build('scale', 'Db', 1).rh).slice(0, 8), ['Db4', 'Eb4', 'F4', 'Gb4', 'Ab4', 'Bb4', 'C5', 'Db5']);
  assert.deepEqual(fingers(X.build('scale', 'Db', 1).lh).slice(0, 8), ['3', '2', '1', '4', '3', '2', '1', '3']);
  assert.deepEqual(fingers(X.build('scale', 'F', 1).rh).slice(0, 8), ['1', '2', '3', '4', '1', '2', '3', '4']);
  assert.deepEqual(fingers(X.build('scale', 'B', 1).lh).slice(0, 8), ['4', '3', '2', '1', '4', '3', '2', '1']);
  // Two octaves: the thumb (not 5) plays the middle tonic.
  const two = X.build('scale', 'C', 2);
  assert.equal(two.rh[7].ps[0], 'C5');
  assert.deepEqual(two.rh[7].f, [1]);
  assert.deepEqual(two.rh[14].f, [5]);
  // Minor forms.
  assert.deepEqual(names(X.build('scale', 'Am', 2, 'harmonic').rh).slice(6, 8), ['G#4', 'A4']);
  assert.deepEqual(names(X.build('scale', 'Am', 2, 'natural').rh).slice(6, 8), ['G4', 'A4']);
  const mel = names(X.build('scale', 'Am', 1, 'melodic').rh);
  assert.deepEqual(mel.slice(5, 8), ['F#5', 'G#5', 'A5'], 'melodic minor goes up with a raised 6th and 7th');
  assert.deepEqual(mel.slice(8, 10), ['G5', 'F5'], 'melodic minor comes down natural');
});

test('every key spells all seven degrees with seven different letters', () => {
  for (const key of X.KEYS) {
    const sc = X.SCALES[key.mode === 'minor' ? 'harmonic' : 'major'];
    const letters = Array.from({ length: 7 }, (_, d) => X.spell(key, sc, d, 4).name[0]);
    assert.equal(new Set(letters).size, 7, key.label);
    const midis = Array.from({ length: 8 }, (_, d) => X.spell(key, sc, d, 4).midi);
    assert.equal(midis[7] - midis[0], 12, key.label + ' spans an octave');
  }
});

test('inversions use 1-3-5 / 1-2-5 / 1-3-5 and progressions move by the smallest steps', () => {
  const inv = X.build('inversions', 'C', 1);
  assert.deepEqual(names(inv.rh).slice(0, 4), ['C4+E4+G4', 'E4+G4+C5', 'G4+C5+E5', 'C5+E5+G5']);
  assert.deepEqual(fingers(inv.rh).slice(0, 3), ['1+3+5', '1+2+5', '1+3+5']);
  assert.deepEqual(fingers(inv.lh).slice(0, 3), ['5+3+1', '5+3+1', '5+2+1']);
  const prog = X.build('progression', 'C', 1);
  assert.deepEqual(names(prog.rh), ['C4+E4+G4', 'C4+F4+A4', 'B3+D4+G4', 'C4+E4+G4']);
  assert.deepEqual(names(prog.lh), ['C3', 'F2', 'G2', 'C3']);
  assert.deepEqual(prog.rh.map(e => e.label), ['I · C', 'IV · F', 'V · G', 'I · C']);
  const minor = X.build('progression', 'Am', 3);
  assert.equal(minor.rh[0].label, 'ii° · B°');
  assert.equal(minor.rh[1].label, 'V7 · E7');
  assert.ok(minor.rh[1].ps.includes('G#4') || minor.rh[1].ps.includes('G#3'), 'V7 in minor has the raised 7th');
  for (const key of X.KEYS) for (let tier = 1; tier <= 4; tier++) {
    const rh = X.build('progression', key.id, tier).rh;
    for (let i = 1; i < rh.length; i++) {
      const a = rh[i - 1].midi, b = rh[i].midi;
      const moved = Math.max(...b.map(m => Math.min(...a.map(n => Math.abs(m - n)))));
      assert.ok(moved <= 5, `${key.id} L${tier}: chord ${i} leaps ${moved} semitones`);
    }
  }
});

test('levels grow: longer, faster or harder from Beginner to Expert', () => {
  // Work = notes to play × the fastest notes per minute asked for.
  const len = (id, t) => { const ex = X.build(id, 'G', t); const notes = ex.rh.filter(e => !e.rest); return notes.length * ex.tempo / Math.min(...notes.map(e => e.d)); };
  for (const id of ['scale', 'hanon', 'inversions']) {
    for (let t = 2; t <= 4; t++) assert.ok(len(id, t) >= len(id, t - 1), `${id} level ${t} asks at least as much as level ${t - 1}`);
  }
  for (const e of X.EXERCISES) assert.ok([1, 2, 3, 4].includes(e.min));
  assert.equal(X.EXERCISES.filter(e => e.min === 1).length >= 10, true, 'beginners have plenty to do');
});

test('quick-start routines only include unlocked exercises', () => {
  for (const p of X.PRESETS) for (let tier = 1; tier <= 4; tier++) {
    const steps = X.routine(p.id, tier);
    assert.ok(steps.length >= 2, `${p.id} has at least two steps at level ${tier}`);
    for (const s of steps) assert.ok(X.exerciseById(s.id).min <= tier && s.minutes > 0);
  }
});

test('pedal playback holds notes to the next change; without pedal they are detached', () => {
  const on = X.build('pedal', 'C', 2, 'on'), off = X.build('pedal', 'C', 2, 'off');
  const a = X.schedule(on, { tempo: 60 }), b = X.schedule(off, { tempo: 60 });
  const firstOn = a.notes.find(n => n.hand === 'rh'), firstOff = b.notes.find(n => n.hand === 'rh');
  assert.ok(firstOn.dur > 4, 'held past the next chord until the pedal change');
  assert.ok(firstOff.dur < 4, 'released before the next chord');
  const stac = X.schedule(X.build('articulation', 'C', 1, 'legato-staccato'), { tempo: 60 });
  const legato = stac.notes.find(n => n.hand === 'rh' && n.t === 0), short = stac.notes.find(n => n.hand === 'rh' && n.t === 4);
  assert.ok(short.dur < legato.dur / 2, 'staccato is much shorter than legato');
  const dyn = X.schedule(X.build('dynamics', 'C', 1), {});
  assert.ok(dyn.notes.find(n => n.t === 0).vel > dyn.notes.find(n => n.t === 8).vel, 'forte then piano');
});

test('play by ear: deterministic tunes that start on the tonic and stay in range', () => {
  for (let tier = 1; tier <= 4; tier++) for (let seed = 1; seed < 40; seed++) {
    const a = X.earMelody('D', tier, seed), b = X.earMelody('D', tier, seed);
    assert.deepEqual(a.degs, b.degs);
    assert.equal(a.degs.length, [3, 4, 5, 6][tier - 1]);
    if (tier < 4) assert.equal(a.degs[0], 0);
    const choices = new Set(a.choices.map(c => c.midi));
    a.notes.forEach(n => assert.ok(choices.has(n.midi), 'every note is one of the buttons'));
    for (let i = 1; i < a.degs.length; i++) assert.notEqual(a.degs[i], a.degs[i - 1]);
  }
});

test('engraving: key signature instead of repeated accidentals, and a natural when a note leaves the key', () => {
  const svg = X.engrave(X.build('scale', 'D', 1), MN).svg;
  const sharps = (svg.match(/mn-glyph/g) || []).length;
  assert.ok(sharps > 0);
  // D major: the 2 sharps are drawn once per staff in the signature, not on every F♯/C♯.
  const ex = X.build('scale', 'D', 1);
  assert.equal(ex.sig, 2);
  const harmonic = X.engrave(X.build('scale', 'Am', 1, 'harmonic'), MN).svg;
  const natural = X.engrave(X.build('scale', 'Am', 1, 'natural'), MN).svg;
  assert.ok(harmonic.length > natural.length, 'the raised 7th carries an accidental');
  assert.match(X.engrave(X.build('pedal', 'C', 2), MN).svg, /Ped\./);
  assert.match(X.engrave(X.build('hands', 'C', 4), MN).svg, /class="pxs-tup"[^>]*>3</);
});
