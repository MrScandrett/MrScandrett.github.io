// Regressions from the lessons/music audit: sax spelling, single-line expressions, the Fake Book
// bridge, and musical errors the tools used to teach.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

async function load(path, extra = {}) {
  const sandbox = { console, URL, setTimeout, clearTimeout, ...extra };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(await read(path), sandbox, { filename: path });
  return sandbox;
}

test('alto sax in sharp keys past seven sharps respells enharmonically, never with double sharps', async () => {
  const { ComposerArrangement: A } = await load('assets/js/composer-arrangement.js');
  // B major (5 sharps) + alto (3 fifths) = 8 sharps → written in A♭ major (4 flats).
  assert.equal(A.shiftKey(5, 3), -4);
  assert.equal(A.wrapOffset(5, 3), -1);
  const written = A.transpose('F#4 C#5 G#4 B4 D#5 A#4 E4', 9, 5 - A.wrapOffset(5, 3), 3);
  assert.doesNotMatch(written, /##/);
  assert.equal(written, 'Eb5 Bb5 F5 Ab5 C6 G5 Db5');
  // Keys that fit need no respelling.
  assert.equal(A.wrapOffset(0, 3), 0);
  assert.equal(A.wrapOffset(-2, 2), 0);
});

test('extracting one staff keeps only that staff’s slurs, dynamics and hairpins, renumbered to staff 0', async () => {
  const { ComposerArrangement: A } = await load('assets/js/composer-arrangement.js');
  const result = { expressions: {
    slurs: [
      { staff: 1, from: { bar: 1, voice: 0, note: 0 }, to: { bar: 1, voice: 0, note: 2 } },
      { staff: 0, from: { bar: 2, voice: 0, note: 0 }, to: { bar: 2, voice: 0, note: 1 } },
      { staff: 1, from: { bar: 3, voice: 1, note: 0 }, to: { bar: 3, voice: 1, note: 1 } }
    ],
    directions: [{ bar: 1, dynamic: 'p' }, { bar: 2, staff: 1, dynamic: 'f' }],
    hairpins: [{ staff: 1, from: { bar: 4, beat: 0 }, to: { bar: 5, beat: 0 }, type: 'crescendo' }],
    crossBeams: [{ bar: 9, notes: [] }]
  } };
  A.isolateExpressions(result, 1, 0);
  // Objects made inside the VM sandbox have another realm's prototypes; compare their JSON.
  result.expressions = JSON.parse(JSON.stringify(result.expressions));
  assert.equal(result.expressions.slurs.length, 1);
  assert.deepEqual(result.expressions.slurs[0].from, { bar: 1, voice: 0, note: 0 });
  assert.equal(result.expressions.slurs[0].staff, 0);
  assert.deepEqual(result.expressions.directions, [{ bar: 2, staff: 0, dynamic: 'f' }]);
  assert.equal(result.expressions.hairpins[0].staff, 0);
  assert.equal(result.expressions.crossBeams, undefined);
});

test('the song bridge hands a progression to the Fake Book in the shape fake-book.js reads', async () => {
  const store = new Map();
  let href = 'https://example.test/lessons/music/theory/chord-progressions.html';
  const location = { get href() { return href; }, set href(v) { href = v; } };
  const sandbox = await load('assets/js/music-song-bridge.js', {
    document: { currentScript: { src: 'https://example.test/assets/js/music-song-bridge.js' }, title: 'Chord Progressions · ClassroomOS', createElement() { return {}; } },
    localStorage: { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) ?? null },
    location
  });
  const B = sandbox.MusicSongBridge;
  assert.equal(B.cleanChord('B♭m'), 'Bbm');
  assert.equal(B.cleanChord('vii° B°'), 'vii°B°'.replace(/°/g, 'dim'));
  assert.equal(B.openInFakeBook({ chords: [] }), false);
  assert.equal(B.openInFakeBook({ title: 'Loop', key: 'E♭', tempo: 96, chords: ['E♭', 'Cm', 'A♭', 'B♭7'] }), true);
  assert.equal(href, 'https://example.test/lessons/music/theory/fake-book.html#handoff=1');
  const song = JSON.parse(store.get(B.KEY));
  assert.deepEqual(song.chords, ['Eb', 'Cm', 'Ab', 'Bb7']);
  assert.equal(song.key, 'Eb');
  assert.equal(song.bars, 4);
  const fakeBook = await read('assets/js/lessons/fake-book.js');
  assert.match(fakeBook, new RegExp(B.KEY.replace(/[.:]/g, '\\$&')), 'fake-book.js reads the same storage key');
});

test('musical facts the tools teach', async () => {
  const piano = await read('assets/js/lessons/piano-chords.js');
  assert.match(piano, /\[\[4, 'm', 'Em'\], \[9, 'm', 'Am'\]\]/, 'the Em–Am preset plays E minor, not E major');
  const modes = await read('assets/js/lessons/music-modes.js');
  assert.match(modes, /var rootAbs = t \+ 7,/, 'the spoiler V chord sits a perfect 5th above the tonic, not on Locrian’s ♭5');
  assert.match(modes, /fifth: hasFifth\(MODES\[round\.answer\]\.steps\)/, 'the ear-training drone drops its 5th for Locrian');
  for (const file of ['assets/js/lessons/circle-of-fifths.js', 'assets/js/lessons/chord-progressions.js', 'assets/js/lessons/drop-voicings.mjs']) {
    assert.match(await read(file), /<=\s*[45]\s*\?\s*1\s*:/, file + ' draws open grips from the nut');
  }
});

test('the drums meter trainer keeps its next pulse in place when the tempo changes', async () => {
  const drums = await read('assets/js/lessons/drums.js');
  assert.match(drums, /anchorTime \+= nextPulse \* \(pulseDur - nextDur\);/);
  // The same arithmetic, checked: the next unscheduled pulse lands at the same time after a change.
  let anchorTime = 10, pulseDur = 0.5, nextPulse = 7;
  const before = anchorTime + nextPulse * pulseDur, nextDur = 0.25;
  anchorTime += nextPulse * (pulseDur - nextDur); pulseDur = nextDur;
  assert.equal(anchorTime + nextPulse * pulseDur, before);
});
