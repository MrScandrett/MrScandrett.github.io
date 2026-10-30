import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { tunes } = JSON.parse(readFileSync(new URL('../data/fake-book.json', import.meta.url), 'utf8'));
const byId = Object.fromEntries(tunes.map(t => [t.id, t]));
const durations = { w: 4, h: 2, q: 1, e: .5, s: .25 };
const bars = melody => melody.split('|').map(bar => bar.trim().split(/\s+/));
function duration(token) {
  const match = /^(?:[A-G](?:##|bb|#|b)?\d|r\d?)([whqes])(3)?(\.)?(~)?$/.exec(token);
  assert.ok(match, `Invalid melody token: ${token}`);
  return durations[match[1]] * (match[2] ? 2 / 3 : 1) * (match[3] ? 1.5 : 1);
}

test('every library melody fills its meter and matches the chord form', () => {
  for (const tune of tunes) {
    const measures = bars(tune.melody);
    const pickup = tune.pickup || 0;
    const beats = tune.meter[0] * 4 / tune.meter[1];
    assert.equal(measures.length - (pickup ? 1 : 0), tune.chords.split('|').length, `${tune.id}: chord form`);
    measures.forEach((measure, i) => {
      const total = measure.reduce((sum, token) => sum + duration(token), 0);
      assert.ok(Math.abs(total - (i === 0 && pickup ? pickup : beats)) < 1e-8, `${tune.id}: bar ${i}, ${total} beats`);
    });
    assert.equal(measures.some(measure => measure.some(token => /^[A-G]/.test(token))), !tune.chordsOnly, `${tune.id}: melody availability`);
  }
});

test('newly filled charts expose pitched melodies with documented forms', () => {
  for (const [id, count, pickup] of [
    ['john-henry', 20, 2], ['midnight-special', 14, 3],
    ['down-to-the-river-to-pray', 16, 2], ['stardust-real-book', 32, 1.5]
  ]) {
    const tune = byId[id];
    assert.ok(!tune.chordsOnly, id);
    assert.equal(tune.bars, count, id);
    assert.equal(tune.pickup, pickup, id);
    assert.match(tune.source, /https:\/\//, id);
    assert.doesNotMatch(tune.about, /Chords only|no melody/i, id);
  }
});

test('alternate Stardust uses the same concert melody and key over different changes', () => {
  assert.equal(byId['stardust-real-book'].key, byId.stardust.key);
  assert.equal(byId['stardust-real-book'].melody, byId.stardust.melody);
  assert.notEqual(byId['stardust-real-book'].chords, byId.stardust.chords);
});

test('But Not for Me phrase peaks match the concert F score', () => {
  const measures = bars(byId['but-not-for-me'].melody);
  for (const bar of [11, 25, 27]) assert.equal(measures[bar].at(-1), 'F5q', `bar ${bar}`);
});
