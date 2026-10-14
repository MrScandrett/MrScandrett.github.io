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
const mapQuality = (() => {
  const src = fs.readFileSync(new URL('../assets/js/lessons/fake-book.js', import.meta.url), 'utf8');
  return new Function(src.slice(src.indexOf('  function mapQuality'), src.indexOf('  function formatDisplayQuality')) + 'return mapQuality;')();
})();
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

test('multi-track chord changes preserve melody from track 1 and chords from track 2', async () => {
  const source = importer.ScoreLoader.loadAlphaTex(`
\\title "Duet"
.
\\track "Melody" "guitar"
c4 d4 e4 f4 | g4 a4 b4 c5

\\track "Chords" "guitar"
0.1.4{ch "C"} 0.1.4 0.1.4{ch "G"} 0.1.4 | 0.1.4{ch "Am"} 0.1.4 0.1.4{ch "F"} 0.1.4
`);
  const song = await GP.parseFile(new exporter.Gp7Exporter().export(source), MX);
  assert.equal(song.hasChords, true);
  assert.equal(song.melody, 'C4q D4q E4q F4q | G4q A4q B4q C5q');
  assert.equal(song.chords, 'C:2 G:2 | Am:2 F:2');
  assert.equal(song.guitarPro.harmony, 'source');
  assert.equal(song.guitarPro.sourceChords, 4);
});

test('chordXML keeps Guitar Pro chord qualities intact through MusicXML and playback', () => {
  const wrap = harmony => `<score-partwise version="4.0"><part-list><score-part id="P0"><part-name>P</part-name></score-part></part-list><part id="P0"><measure number="1"><attributes><divisions>960</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${harmony}<note><pitch><step>C</step><octave>4</octave></pitch><duration>3840</duration><voice>1</voice></note></measure></part></score-partwise>`;
  // [Guitar Pro label, chord the score reader gets back, quality the Fake Book plays]
  const cases = [
    ['Cmaj', 'C', ''],
    ['Csus', 'Csus4', 'sus4'],
    ['Csus4', 'Csus4', 'sus4'],
    ['Dsus2', 'Dsus2', 'sus2'],
    ['C7sus4', 'C7sus4', '7sus4'],
    ['G7sus', 'G7sus4', '7sus4'],
    ['C9sus4', 'C9sus4', '7sus4'],
    ['Cadd9', 'Cadd9', ''],               // no flat seventh
    ['C2', 'Cadd9', ''],
    ['Am(add9)', 'Amadd9', 'm'],
    ['Amadd9', 'Amadd9', 'm'],
    ['C(maj7)', 'Cmaj7', 'maj7'],
    ['CM7', 'Cmaj7', 'maj7'],
    ['CΔ', 'Cmaj7', 'maj7'],
    ['Cm(maj7)', 'Cm(maj7)', 'mmaj7'],
    ['CmM7', 'Cm(maj7)', 'mmaj7'],
    ['C/G', 'C/G', ''],
    ['Bbmaj7/D', 'Bbmaj7/D', 'maj7'],
    ['Am7', 'Am7', 'm7'],
    ['F#m7b5', 'F#m7b5', 'm7b5'],
    ['F#ø7', 'F#m7b5', 'm7b5'],
    ['Eø', 'Em7b5', 'm7b5'],
    ['C°7', 'Cdim7', 'dim7'],
    ['G7#9', 'G7#9', '7'],
    ['C7b9#11', 'C7b9#11', '7'],
    ['Cmaj7(#5)', 'Cmaj7#5', 'maj7'],
    ['C6/9', 'C6add9', '6'],
    ['Cm6/9', 'Cm6add9', 'm6'],
    ['Caug7', 'Caug7', 'aug'],
    ['C+7', 'Caug7', 'aug'],
    ['Fmaj13', 'Fmaj13', 'maj7'],
    ['Dm11', 'Dm11', 'm7']
  ];
  for (const [name, expectedChord, plays] of cases) {
    const xml = GP.chordXML(name, 0);
    assert.ok(xml, `chordXML(${name}) should not return null`);
    const parsed = MX.parse(wrap(xml)).chords;
    assert.equal(parsed, expectedChord, `${name} should parse to ${expectedChord}`);
    assert.equal(mapQuality(/^[A-G][#b]?([^/]*)/.exec(parsed)[1]), plays, `${name} should play as "${plays}"`);
  }
  // Labels with no faithful equivalent stay as source text.
  for (const name of ['C7alt', 'C(no3)', 'Cm7sus4']) assert.equal(GP.chordXML(name, 0), null, name);
});

test('chord qualities from iReal and typed charts map to the playable chord', () => {
  const cases = { 'sus': 'sus4', 'sus2': 'sus2', '7sus': '7sus4', '9sus': '7sus4', '13sus': '7sus4', '7b9sus': '7sus4',
    '-^7': 'mmaj7', '-^9': 'mmaj7', 'mM7': 'mmaj7', 'm(maj7)': 'mmaj7', 'mmaj7': 'mmaj7', '-add9': 'm', 'madd9': 'm',
    'maj7': 'maj7', '^7': 'maj7', 'm7': 'm7', '-7': 'm7', 'm7b5': 'm7b5', '7': '7', '': '' };
  for (const [q, plays] of Object.entries(cases)) assert.equal(mapQuality(q), plays, q);
});

test('guitarpro6-notes.gpx infers playable chords, eighth-note changes, and valid fake-book tokens', async () => {
  const song = await GP.parseFile(bytes('guitarpro6-notes.gpx'), MX);
  assert.equal(song.format, 'Guitar Pro');
  assert.equal(song.hasChords, false);
  assert.equal(song.chordsWorkedOut, true);
  assert.equal(song.guitarPro.harmony, 'inferred');
  const CHORD_RE = /^([A-G])(##|bb|#|b)?([^\/: \t\r\n]*)(?:\/([A-G])(##|bb|#|b)?)?(?::([\d.]+))?$/;
  const tokens = song.chords.split('|').flatMap(b => b.trim().split(/\s+/)).filter(Boolean);
  assert.ok(tokens.length >= 10, 'inferred chord changes at eighth-note resolution');
  tokens.forEach(tok => assert.ok(CHORD_RE.test(tok), `valid chord token: ${tok}`));
});

