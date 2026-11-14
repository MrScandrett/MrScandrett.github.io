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
