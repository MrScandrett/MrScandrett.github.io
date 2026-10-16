import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const G = require('../assets/js/lessons/groove-sheet-core.js');
const QR = require('../assets/js/lessons/qr.js');

const rock = { hat: 'x-x-x-x-x-x-x-x-', snare: '----x-------x---', kick: 'x-------x-x-----' };
const funk = { hat: 'xxxxxxxxxxxxxxxx', snare: '----X--g-g--X--g', kick: 'x--x--x---x-----' };
const quarters = { snare: '----x-------x---', kick: 'x-------x-------' };

test('Auto picks the coarsest grid the pattern needs', () => {
  assert.equal(G.resolutionFor(quarters), 'quarter');
  assert.equal(G.resolutionFor(rock), 'eighth');
  assert.equal(G.resolutionFor(funk), 'sixteenth');
  assert.equal(G.resolutionFor({}), 'quarter', 'an empty bar needs only the beats');
  assert.equal(G.resolutionFor({ kick: 'x--------x------' }), 'sixteenth', 'a single note on an "e" is enough');
});

test('count syllables follow the three modes', () => {
  const join = (m, t) => G.countLabels(m, t).labels.filter(Boolean).join(' ');
  assert.equal(join('quarter', rock), '1 2 3 4');
  assert.equal(join('eighth', rock), '1 & 2 & 3 & 4 &');
  assert.equal(join('sixteenth', rock), '1 e & a 2 e & a 3 e & a 4 e & a');
  assert.equal(join('auto', rock), '1 & 2 & 3 & 4 &', 'rock beat reads as eighths, not a wall of e and a');
  assert.equal(join('auto', funk), '1 e & a 2 e & a 3 e & a 4 e & a');
  assert.equal(G.countLabels('auto', rock).mode, 'eighth');
});

test('manual override drills sixteenths under an eighth-note groove', () => {
  assert.equal(G.countLabels('sixteenth', rock).mode, 'sixteenth');
  assert.equal(G.countLabels('quarter', funk).labels.filter(Boolean).length, 4);
});

test('the count line can never skip a note: every hit lands on a labelled step in Auto', () => {
  // Property check over pseudo-random grids: Auto's labels cover every step that has a note.
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let n = 0; n < 400; n++) {
    const tracks = {};
    for (const lane of G.LANES) {
      let s = '';
      for (let k = 0; k < 16; k++) s += rnd() < 0.15 ? 'xXg'[Math.floor(rnd() * 3)] : '-';
      if (/[^-]/.test(s)) tracks[lane] = s;
    }
    const { labels } = G.countLabels('auto', tracks);
    for (const lane of Object.keys(tracks)) {
      [...tracks[lane]].forEach((ch, k) => { if (ch !== '-') assert.ok(labels[k] !== null, `${lane} step ${k} has a note but no count label`); });
    }
  }
});

test('beat numbers wrap per bar and 3/4 counts 1 2 3', () => {
  const l = G.countLabels('quarter', {}, { steps: 24, beats: 3 }).labels.filter(Boolean);
  assert.deepEqual(l, ['1', '2', '3', '1', '2', '3']);
});

test('gridPositions matches the fake book beat grid', () => {
  assert.deepEqual(G.gridPositions('quarter', 4), [0, 1, 2, 3]);
  assert.deepEqual(G.gridPositions('eighth', 2), [0, 0.5, 1, 1.5]);
  assert.equal(G.gridPositions('sixteenth', 4), null);
  assert.equal(G.gridPositions('written', 4), null);
});

test('groove codec round-trips every state and lane, in 50 characters', () => {
  const all = {};
  G.LANES.forEach((lane, i) => { all[lane] = '-xXg'.repeat(4).split('').map((c, k) => '-xXg'[(k + i) % 4]).join(''); });
  const code = G.encodeGroove(all, 132);
  assert.equal(code.length, 50);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  const back = G.decodeGroove(code);
  assert.equal(back.tempo, 132);
  assert.ok(G.sameTracks(back.tracks, all));
  for (const t of [rock, funk, quarters, {}]) assert.ok(G.sameTracks(G.decodeGroove(G.encodeGroove(t, 90)).tracks, t));
});

test('decoder rejects junk instead of guessing', () => {
  assert.equal(G.decodeGroove(''), null);
  assert.equal(G.decodeGroove('short'), null);
  assert.equal(G.decodeGroove('!'.repeat(50)), null);
  assert.equal(G.parseHash('#nothing'), null);
  assert.deepEqual(G.parseHash(G.hashFor({ tracks: rock, tempo: 100 })).tempo, 100);
});

test('tempo is clamped to something playable', () => {
  assert.equal(G.decodeGroove(G.encodeGroove(rock, 5)).tempo, 40);
  assert.equal(G.decodeGroove(G.encodeGroove(rock, 999)).tempo, 240);
});

test('ladder parsing', () => {
  assert.deepEqual(G.parseLadder('60 → 80 → 100'), [60, 80, 100]);
  assert.deepEqual(G.parseLadder('60, 70, 80, 90, 100, 110, 120'), [60, 70, 80, 90, 100]);
  assert.deepEqual(G.parseLadder('abc'), [60, 80, 100]);
});

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), _m: m };
}

test('store: add, reorder, duplicate, delete, persist', () => {
  const ls = memoryStorage(), s = G.createStore(ls);
  const a = s.addPattern({ title: 'Rock', tracks: rock, tempo: 100, note: '4x through' });
  const b = s.addPattern({ tracks: funk, tempo: 92 });
  assert.equal(b.title, 'Groove 2');
  const c = s.duplicatePattern(a.id);
  assert.deepEqual(s.sheet().patterns.map((p) => p.title), ['Rock', 'Rock (copy)', 'Groove 2']);
  assert.notEqual(c.id, a.id);
  assert.equal(s.movePattern(b.id, -1), true);
  assert.equal(s.movePattern(b.id, -5), false);
  assert.deepEqual(s.sheet().patterns.map((p) => p.id), [a.id, b.id, c.id]);
  s.deletePattern(a.id);
  assert.equal(s.sheet().patterns.length, 2);
  const again = G.createStore(ls);
  assert.equal(again.sheet().patterns.length, 2, 'survives a reload');
  assert.ok(G.sameTracks(again.sheet().patterns[0].tracks, funk));
});

test('store: one sheet per student, and sheets are independent', () => {
  const s = G.createStore(memoryStorage());
  s.updateSheet({ student: 'Ada' });
  s.addPattern({ title: 'A1', tracks: rock });
  const bob = s.newSheet('Bob');
  assert.equal(s.state.current, bob.id);
  assert.equal(bob.patterns.length, 0);
  s.addPattern({ title: 'B1', tracks: funk });
  s.select(s.state.sheets[0].id);
  assert.deepEqual(s.sheet().patterns.map((p) => p.title), ['A1']);
  const copy = s.duplicateSheet(s.sheet().id);
  assert.equal(copy.student, '');
  assert.equal(copy.patterns[0].title, 'A1');
  assert.notEqual(copy.patterns[0].id, s.state.sheets[0].patterns[0].id);
  s.deleteSheet(copy.id);
  assert.equal(s.state.sheets.length, 2);
});

test('store: export then import brings sheets back with fresh ids', () => {
  const a = G.createStore(memoryStorage());
  a.updateSheet({ student: 'Ada', due: '2026-11-02' });
  a.addPattern({ title: 'Funk', tracks: funk, tempo: 92, count: 'sixteenth', ladder: [70, 90], note: 'slow first' });
  const json = a.exportJSON();
  const b = G.createStore(memoryStorage());
  assert.equal(b.importJSON(json), 1);
  const p = b.sheet().patterns[0];
  assert.equal(b.sheet().student, 'Ada');
  assert.equal(b.sheet().due, '2026-11-02');
  assert.equal(b.state.sheets.length, 1, 'blank starter sheet is replaced');
  assert.deepEqual([p.title, p.tempo, p.count, p.note], ['Funk', 92, 'sixteenth', 'slow first']);
  assert.deepEqual(p.ladder, [70, 90]);
  assert.notEqual(p.id, a.sheet().patterns[0].id);
});

test('store: hostile or broken input is sanitised or rejected', () => {
  const s = G.createStore(memoryStorage());
  assert.throws(() => s.importJSON('nope'), /not valid JSON/);
  assert.throws(() => s.importJSON('{"a":1}'), /not a groove-sheet export/);
  s.importJSON(JSON.stringify({ kind: 'classroomos-groove-sheets', v: 1, sheets: [{
    student: '<img src=x onerror=alert(1)>'.repeat(10), due: 'tomorrow', perPage: 9,
    patterns: [{ title: 'x'.repeat(500), tempo: 'fast', count: 'bogus', tracks: { kick: 'x'.repeat(40), banjo: 'xxxx', hat: 'Q?x' } }]
  }] }));
  const sh = s.sheet(), p = sh.patterns[0];
  assert.equal(sh.student.length, 60);
  assert.equal(sh.due, '');
  assert.equal(sh.perPage, 3);
  assert.equal(p.title.length, 60);
  assert.equal(p.tempo, 100);
  assert.equal(p.count, 'auto');
  assert.deepEqual(Object.keys(p.tracks).sort(), ['hat', 'kick']);
  assert.equal(p.tracks.kick.length, 16);
  assert.equal(p.tracks.hat, '--x-------------');
});

test('store: survives unavailable storage', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const s = G.createStore(broken);
  s.addPattern({ tracks: rock });
  assert.equal(s.persistent, false);
  assert.equal(s.sheet().patterns.length, 1, 'still works in memory');
});

test('QR: version, structure and capacity for a real groove link', () => {
  const url = 'https://mrscandrett.github.io/lessons/music/drums.html' + G.hashFor({ tracks: funk, tempo: 92 });
  const qr = QR.encode(url, 'M');
  assert.ok(qr.version <= 8, 'a groove link stays a small, scannable code (got v' + qr.version + ')');
  assert.equal(qr.size, qr.version * 4 + 17);
  // finder patterns: 7x7 rings in three corners
  const ring = (x0, y0) => { for (let i = 0; i < 7; i++) for (const [x, y] of [[x0 + i, y0], [x0 + i, y0 + 6], [x0, y0 + i], [x0 + 6, y0 + i]]) assert.ok(qr.modules[y][x]); assert.ok(!qr.modules[y0 + 1][x0 + 1]); assert.ok(qr.modules[y0 + 3][x0 + 3]); };
  ring(0, 0); ring(qr.size - 7, 0); ring(0, qr.size - 7);
  assert.throws(() => QR.encode('x'.repeat(500), 'M'), /will not fit/);
  assert.match(QR.toSvg(qr), /^<svg[^>]+viewBox="0 0 \d+ \d+"/);
});
