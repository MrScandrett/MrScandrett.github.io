import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../assets/js/music-notation.js');
require('../assets/js/score-engine.js');
const E = globalThis.ScoreEngine;

function render(notes, time = '6/8') {
  const model = E.prepare({ id: 'engraving-regression', time, key: 0, staves: [{ clef: 'treble', notes }] });
  E.analyse(model);
  const layout = E.engrave(model, 1100);
  return { model, layout, beams: model.staves[0].bars[0].beams };
}

test('compound-time runs retain primary beats and readable secondary subdivisions', () => {
  const { layout, beams } = render('C4/16 D4/16 E4/16 F4/16 G4/16 A4/16 B4/16 C5/16 D5/16 E5/16 F5/16 G5/16');
  assert.deepEqual(beams.map(g => g.events.length), [6, 6]);
  assert.equal((layout.svg.match(/class="se-beam"/g) || []).length, 8);
  for (const beam of beams) {
    assert.ok(Math.abs(beam.at(beam.x1) - beam.at(beam.x0)) <= layout.S + 1e-6);
    for (const event of beam.events) assert.ok(Math.abs(beam.at(event.x) - (event.bottom - (beam.up ? event.hi : event.lo) * layout.S / 2)) >= 2.5 * layout.S);
  }
});

test('explicit stem changes split beams without altering playback', () => {
  const { model, beams } = render('@U C5/8 D5/8 @D E5/8 F5/8', '2/4');
  assert.deepEqual(beams.map(g => g.events.length), [2, 2]);
  assert.equal(beams[0].up, true);
  assert.equal(beams[1].up, false);
  assert.deepEqual(E.playList(model).map(n => n.midi), [72, 74, 76, 77]);
});

test('waiting arpeggio ties retain short notation and hold until the final chord', () => {
  const model = E.prepare({ time: '2/8', staves: [{ clef: 'bass', notes:
    '@U @tieWait {3 C2/16~ G2/16~ C3/16~ } @B {3 E3/16~ G3/16~ s/16 } | @D (C2 G2 C3 E3 G3)/4^' }] });
  E.analyse(model);
  const notes = E.playList(model);
  assert.equal(notes.length, 5, 'the final chord continues the five attacks');
  notes.forEach((note, i) => {
    assert.ok(Math.abs(note.start - i / 6) < 1e-6);
    assert.ok(Math.abs(note.dur - (2 - i / 6)) < 1e-6);
  });
  for (const width of [390, 1800]) {
    const layout = E.engrave(model, width);
    assert.deepEqual(model.staves[0].bars[0].beams.map(g => g.events.length), [3, 2]);
    assert.ok(model.staves[0].bars[0].events.filter(e => e.kind === 'note').every(e => e.base === .25 && e.tieTo.pitches.length === 5));
    assert.equal((layout.svg.match(/class="se-tie"/g) || []).length, 5);
    assert.doesNotMatch(layout.svg, /NaN|undefined/);
  }
});

test('waiting ties reject a missing matching pitch', () => {
  const model = E.prepare({ time: '2/8', staves: [{ notes: '@tieWait C4/8~ D4/8 | E4/4' }] });
  assert.throws(() => E.analyse(model), /waiting tie needs a later matching note/);
});

test('Chopin ending and expression marks survive reflow without duplicated chords', () => {
  const score = require('../data/score-library.json').scores['chopin-prelude-1'];
  const model = E.prepare(score); E.analyse(model);
  assert.deepEqual(model.staves.map(st => st.bars[33].events.filter(e => e.kind === 'note').map(e => e.pitches.length)), [[2], [5]]);
  const before = E.playList(model).map(({ start, dur, midi }) => [start, dur, midi]);
  for (const width of [390, 1100, 1800]) {
    const layout = E.engrave(model, width, true);
    assert.match(layout.svg, /class="se-slur"/);
    assert.match(layout.svg, /class="se-hairpin"/);
    assert.match(layout.svg, />rit\.<\/text>/);
    assert.match(layout.svg, /class="se-direction"/);
    assert.match(layout.svg, /class="se-cross-staff-beam"/);
    const closingBeam = model.staves[0].bars[32].events.find(e => e.kind === 'note').beam;
    assert.equal(closingBeam.events.length, 3);
    assert.deepEqual(closingBeam.events.map(e => e.staff), [1, 1, 0]);
    assert.doesNotMatch(layout.svg, /NaN|undefined/);
    const inner = model.staves[0].bars[29].events.filter(e => e.voice === 1);
    const rest = inner[0];
    assert.ok(rest.clearOf.length, 'the inner-voice rest clears the surrounding notation');
    for (const [low, high] of rest.clearOf) {
      assert.ok(low > rest.restStep + rest.restHalf || high < rest.restStep - rest.restHalf);
    }
    assert.equal(inner[1].up, true);
  }
  assert.deepEqual(E.playList(model).map(({ start, dur, midi }) => [start, dur, midi]), before);
});

test('named seconds and chromatic voices reserve space without changing pitches or timing', () => {
  const M = globalThis.MusicNotation;
  const score = { time: '2/4', staves: [{ clef: 'treble', voices: [
    { notes: '@U (C4 D#4)/4 (B3 C4 D4)/4' },
    { notes: '@D C#4/4 C#4/4' }
  ] }] };
  const model = E.prepare(score); E.analyse(model);
  const before = E.playList(model).map(({start, dur, midi}) => [start, dur, midi]);
  try {
    M.setPreferences({pitchNames:true, noteColors:true});
    for (const width of [390, 1100]) {
      const layout = E.engrave(model, width, true);
      const notes = model.staves[0].bars[0].events.filter(e => e.kind === 'note');
      assert.ok(notes[1].x - notes[0].x >= 2 * layout.S, 'a chromatic note in the other voice has its own space');
      assert.notEqual(notes[0].pitches[1].namedAccColumn, notes[1].pitches[0].namedAccColumn, 'close accidentals use separate columns');
      assert.ok(notes[0].headW >= 1.8 * layout.S);
      assert.doesNotMatch(layout.svg, /NaN|undefined/);
    }
    assert.deepEqual(E.playList(model).map(({start, dur, midi}) => [start, dur, midi]), before);
    M.setPreferences({pitchNames:false});
    E.engrave(model, 1100);
    assert.ok(model.staves[0].bars[0].events.every(e => !e.namedOffset), 'standard notation resets teaching offsets');
  } finally { M.setPreferences({pitchNames:false, noteColors:false}); }
});
