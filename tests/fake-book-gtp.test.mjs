import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const GTP = require('../assets/js/lessons/fake-book-gtp.js');
const MX = require('../assets/js/lessons/fake-book-musicxml.js');
const fixture = require('./fixtures/scores/legacy-gtp-fixture.cjs');

for (const version of ['FICHIER GUITARE PRO v1', ...['01','02','03','04'].map(v => 'FICHIER GUITARE PRO v1.' + v), 'FICHIER GUITAR PRO v2.20', 'FICHIER GUITAR PRO v2.21']) {
  test(version + ': notes, tuning/capo, repeats, ties and changing meter', async () => {
    const parsed = GTP.parse(fixture(version));
    assert.equal(parsed.title, 'Local GTP study');
    assert.equal(parsed.tracks.length, 1);
    const song = await GTP.parseFile(fixture(version), MX);
    assert.equal(song.format, 'Guitar Pro');
    assert.equal(song.bars, 6);
    assert.deepEqual(song.score.bars.map(b => b.meter), [[4,4],[4,4],[4,4],[4,4],[4,4],[3,4]]);
    assert.ok(song.score.notes.every(n => Number.isFinite(n.midi) && n.dur > 0));
    assert.equal(song.score.notes[0].midi, parsed.tracks[0].capo + 64);
    assert.ok(song.staves.tab || song.staves.gtr);
    assert.ok(song.score.notes.some(n => n.dur === 8));
  });
}
test('rejects unsupported, truncated and oversized data without partial imports', async () => {
  assert.throws(() => GTP.parse(fixture('FICHIER GUITAR PRO v5.10')), /Unsupported/);
  const good = fixture();
  for (const n of [0, 30, 50, good.length - 1]) assert.throws(() => GTP.parse(good.subarray(0,n)), /truncated|invalid/i);
  assert.throws(() => GTP.parse(new Uint8Array(8 * 1024 * 1024 + 1)), /8 MB/);
  await assert.rejects(GTP.parseFile(new Uint8Array(0), MX), /truncated/);
});
