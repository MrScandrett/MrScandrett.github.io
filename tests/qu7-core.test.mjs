import test from 'node:test';
import assert from 'node:assert/strict';
import {
  peakDbfs, zone, suggestGain, SOURCES, phantomVerdict, phantomPop,
  faderDb, dbToFader, sendLevelDb, applyDca, recallScene, GAIN_MAX,
} from '../assets/js/qu7-core.mjs';

test('nominal arrives where input dBu + gain = 0 (spec-sheet sensitivity)', () => {
  assert.equal(peakDbfs(-60, 60), -18);
  assert.equal(peakDbfs(0, 0), -18);
  assert.equal(peakDbfs(-30, 40), -8);
});

test('zones follow the headroom bands', () => {
  assert.equal(zone(0), 'clip');
  assert.equal(zone(-3), 'hot');
  assert.equal(zone(-12), 'good');
  assert.equal(zone(-24), 'low');
  assert.equal(zone(-40), 'quiet');
});

test('suggested gain lands every source in the good zone, or the preamp limit', () => {
  for (const s of SOURCES) {
    const g = suggestGain(s.dbu);
    assert.ok(g >= 0 && g <= GAIN_MAX);
    if (g > 0 && g < GAIN_MAX) assert.equal(zone(peakDbfs(s.dbu, g)), 'good', s.id);
  }
  assert.equal(suggestGain(-8), 14);
  assert.equal(suggestGain(-90), GAIN_MAX);
  assert.equal(suggestGain(20), 0);
});

test('phantom power verdicts', () => {
  assert.equal(phantomVerdict('required', false).ok, false);
  assert.equal(phantomVerdict('required', true).ok, true);
  assert.equal(phantomVerdict('avoid', true).ok, false);
  assert.equal(phantomVerdict('avoid', false).ok, true);
  assert.equal(phantomVerdict(SOURCES.find((s) => s.id === 'vocal'), false).ok, true);
  assert.equal(phantomPop(true, false), true);
  assert.equal(phantomPop(true, true), false);
  assert.equal(phantomPop(false, false), false);
});

test('fader law is monotonic and round-trips', () => {
  assert.equal(faderDb(0.75), 0);
  assert.equal(faderDb(1), 10);
  assert.equal(faderDb(0), -Infinity);
  let prev = -Infinity;
  for (let p = 0.01; p <= 1; p += 0.01) {
    const d = faderDb(p);
    assert.ok(d > prev);
    prev = d;
  }
  for (const db of [-50, -30, -10, -3, 0, 4, 10]) {
    assert.ok(Math.abs(faderDb(dbToFader(db)) - db) < 1e-9, String(db));
  }
});

test('pre-fader sends ignore the channel fader, post-fader sends follow it', () => {
  assert.equal(sendLevelDb({ faderPos: 0.25, sendDb: -6, pre: true }), -6);
  assert.equal(sendLevelDb({ faderPos: 0.75, sendDb: -6, pre: false }), -6);
  assert.equal(sendLevelDb({ faderPos: 0.5, sendDb: -6, pre: false }), -16);
  assert.equal(sendLevelDb({ faderPos: 0, sendDb: -6, pre: false }), -Infinity);
});

test('a DCA scales its members without moving their faders', () => {
  const chans = [
    { id: 'a', faderPos: 0.75, muted: false },
    { id: 'b', faderPos: 0.75, muted: false },
    { id: 'c', faderPos: 0.75, muted: false },
  ];
  const r = applyDca(chans, { members: ['a', 'b'], faderPos: 0.5, muted: false });
  assert.equal(r[0].effectiveDb, -10);
  assert.equal(r[2].effectiveDb, 0);
  assert.equal(chans[0].faderPos, 0.75);
  const m = applyDca(chans, { members: ['a'], faderPos: 0.75, muted: true });
  assert.equal(m[0].effectiveDb, -Infinity);
});

test('scene recall loads everything except safed channels', () => {
  const cur = { v: { fader: 0.9, mute: false, gain: 30 }, k: { fader: 0.6, mute: true, gain: 5 } };
  const scene = { v: { fader: 0.5, mute: true, gain: 20 }, k: { fader: 0.8, mute: false, gain: 8 } };
  const r = recallScene(cur, scene, { safes: ['v'] });
  assert.deepEqual(r.v, cur.v);
  assert.deepEqual(r.k, scene.k);
  const g = recallScene(cur, scene, { scope: ['fader'] });
  assert.equal(g.v.fader, 0.5);
  assert.equal(g.v.gain, 30);
  assert.notEqual(r, cur);
});
