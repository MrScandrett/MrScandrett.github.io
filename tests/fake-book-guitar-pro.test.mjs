import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { importer, exporter } from '../node_modules/@coderline/alphatab/dist/alphaTab.core.mjs';
const require = createRequire(import.meta.url);
const GP = require('../assets/js/lessons/fake-book-guitar-pro.js');
const MX = require('../assets/js/lessons/fake-book-musicxml.js');
require('../assets/js/lessons/fake-book-gtp.js');
const legacyFixture = require('./fixtures/scores/legacy-gtp-fixture.cjs');
const bytes = name => fs.readFileSync(new URL('./fixtures/scores/guitar-pro/' + name, import.meta.url));

for (const name of ['guitarpro3-notes.gp3', 'guitarpro4-notes.gp4', 'guitarpro5-notes.gp5', 'guitarpro6-notes.gpx', 'guitarpro7-notes.gp', 'guitarpro8-e.gp', 'guitarpro8-harmonics-lowercase.gp']) {
  test(name + ': preserves every pitched note, timing and physical fret position', async () => {
    const source = importer.ScoreLoader.loadScoreFromBytes(bytes(name));
    const song = await GP.parseFile(bytes(name), MX);
    const staff = source.tracks[0].staves[0];
    const expected = staff.bars[0].voices[0].beats.filter(b => !b.isEmpty && !b.graceType).flatMap(b => b.notes.filter(n => !n.isDead && !n.isPercussion).map(n => ({ midi: n.realValue, start: b.displayStart / 960, dur: b.displayDuration / 960 })));
    assert.equal(song.format, 'Guitar Pro');
    assert.deepEqual(song.score.notes.map(({ midi, start, dur }) => ({ midi, start, dur })), expected);
    const stringedNote = staff.bars[0].voices[0].beats.flatMap(b => b.notes).find(n => n.isStringed && !n.isDead);
    assert.ok(song.score.musicxml.includes('<string>' + (staff.tuning.length + 1 - stringedNote.string) + '</string>'));
    assert.ok(song.score.musicxml.includes('<fret>'));
    assert.ok(song.staves.tab || song.staves.gtr);
    assert.match(song.warnings.join(' '), /Bends, slides/);
  });
}
test('GP1/GP2 content is dispatched to the existing legacy reader', async () => {
  const song = await GP.parseFile(legacyFixture(), MX);
  assert.equal(song.bars, 6);
  assert.match(song.warnings[0], /legacy Guitar Pro/);
});
test('GP7 repeat count follows the source road map', async () => {
  const song = await GP.parseFile(bytes('guitarpro7-repeat-close.gp'), MX);
  assert.deepEqual(song.score.bars.map(b => b.number), ['1','2','1','2','3']);
});
test('GP5 alternate endings follow each repeat pass', async () => {
  const song = await GP.parseFile(bytes('guitarpro5-repeat-close-alternate-endings.gp5'), MX);
  assert.deepEqual(song.score.bars.map(b => b.number), ['1','2','4','1','3','4','1','2','4','1','2','4','5']);
});
test('multiple voices retain simultaneous onsets in separate playback lanes', async () => {
  const song = await GP.parseFile(bytes('layout-multi-voice.gp'), MX);
  assert.equal(song.score.parts.length, 2);
  const lanes = song.score.parts.map(p => song.score.notes.filter(n => n.part === p.id));
  assert.equal(lanes[0][0].start, 0);
  assert.equal(lanes[1][0].start, 0);
  assert.equal(lanes[0][0].dur, 2);
  assert.equal(lanes[1][0].dur, 1);
});
test('ties extend the held note without adding a retrigger', async () => {
  const song = await GP.parseFile(bytes('special-notes-tied-notes.gp'), MX);
  assert.equal(song.score.notes[0].midi, 43);
  assert.equal(song.score.notes[0].dur, 1.5);
  assert.equal(song.score.notes.filter(n => n.midi === 43 && n.start < 1.5).length, 1);
});
test('local GP7 export round trip preserves meter changes, capo and alternate tuning', async () => {
  const source = importer.ScoreLoader.loadAlphaTex('\\title "Local practice" \\tempo 96 . 0.6.4 2.6.4 3.6.4 0.1.4 | \\ts 3 4 0.6.4 2.6.4 3.6.4');
  const staff = source.tracks[0].staves[0];
  staff.stringTuning.tunings = [64,59,55,50,45,38];
  staff.capo = 2;
  const song = await GP.parseFile(new exporter.Gp7Exporter().export(source), MX);
  assert.deepEqual(song.score.bars.map(b => [b.start || 0, b.len, b.meter]), [[0,4,[4,4]], [4,3,[3,4]]]);
  assert.deepEqual(song.score.notes.map(n => n.midi), [40,42,43,66,40,42,43]);
  assert.equal(song.tempo, 96);
  assert.ok(song.score.musicxml.includes('<capo>2</capo>'));
});
test('malformed, empty, oversized and rest-only inputs fail without a partial score', async () => {
  await assert.rejects(GP.parseFile(new Uint8Array(), MX), /empty/);
  await assert.rejects(GP.parseFile(new Uint8Array(8 * 1024 * 1024 + 1), MX), /8 MB/);
  for (const name of ['guitarpro3-notes.gp3','guitarpro4-notes.gp4','guitarpro5-notes.gp5','guitarpro6-notes.gpx','guitarpro7-notes.gp']) {
    await assert.rejects(GP.parseFile(bytes(name).subarray(0,32), MX), /invalid|truncated|unsupported/);
  }
  await assert.rejects(GP.parseFile(bytes('guitarpro6-time-signatures.gpx'), MX), /No pitched notes/);
});
