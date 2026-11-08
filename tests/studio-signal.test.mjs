import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../assets/js/lessons/studio-signal.js');

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: expected ${expected}, got ${actual}`);

test('patchbay: no cables means normalled points pass signal, denormalled ones do not', () => {
  assert.equal(S.patchbay('full', {}).destination, 'source');
  assert.equal(S.patchbay('half', {}).destination, 'source');
  assert.equal(S.patchbay('none', {}).destination, 'silence');
});

test('patchbay: full normal breaks on either jack', () => {
  const top = S.patchbay('full', { top: true });
  assert.equal(top.destination, 'silence');
  assert.equal(top.cordCarriesSource, true);
  assert.equal(top.split, false);
  assert.equal(S.patchbay('full', { bottom: true }).destination, 'patch');
});

test('patchbay: half normal only breaks on the bottom jack; a top cable is a split', () => {
  const top = S.patchbay('half', { top: true });
  assert.equal(top.destination, 'source');
  assert.equal(top.split, true);
  assert.equal(S.patchbay('half', { bottom: true }).destination, 'patch');
  const both = S.patchbay('half', { top: true, bottom: true });
  assert.equal(both.destination, 'patch');
  assert.equal(both.split, false);
});

test('patchbay rejects an unknown normal', () => {
  assert.throws(() => S.patchbay('sideways', {}));
});

const band = () => [
  { name: 'Kick', fader: -6, solo: false },
  { name: 'Vocal', fader: -3, solo: true, pan: 0 },
  { name: 'Guitar', fader: -10, solo: false, mute: true },
  { name: 'Reverb', fader: -12, solo: false }
];

test('solo in place is destructive: it changes the mix bus (the print)', () => {
  const r = S.solo(band(), 'SIP');
  assert.equal(r.destructive, true);
  assert.equal(r.printChanged, true);
  const bus = Object.fromEntries(r.mixBus.map((m) => [m.name, m.level]));
  assert.equal(bus.Vocal, -3);
  assert.equal(bus.Kick, -Infinity);
  assert.equal(bus.Reverb, -Infinity, 'an un-isolated reverb return is cut too');
});

test('solo isolate keeps the reverb return alive in SIP', () => {
  const ch = band();
  ch[3].isolate = true;
  const bus = Object.fromEntries(S.solo(ch, 'SIP').mixBus.map((m) => [m.name, m.level]));
  assert.equal(bus.Reverb, -12);
});

test('AFL and PFL leave the mix bus alone and only change what the control room hears', () => {
  for (const mode of ['AFL', 'PFL']) {
    const r = S.solo(band(), mode);
    assert.equal(r.destructive, false);
    assert.equal(r.printChanged, false);
    const bus = Object.fromEntries(r.mixBus.map((m) => [m.name, m.level]));
    assert.equal(bus.Kick, -6);
    assert.equal(bus.Guitar, -Infinity, 'the mute still applies to the mix');
  }
  const afl = Object.fromEntries(S.solo(band(), 'AFL').controlRoom.map((m) => [m.name, m.level]));
  const pfl = Object.fromEntries(S.solo(band(), 'PFL').controlRoom.map((m) => [m.name, m.level]));
  assert.equal(afl.Vocal, -3, 'AFL hears the fader');
  assert.equal(pfl.Vocal, 0, 'PFL ignores the fader');
  assert.equal(afl.Kick, -Infinity);
});

test('with nothing soloed every mode just monitors the mix', () => {
  const ch = band().map((c) => ({ ...c, solo: false }));
  for (const mode of S.SOLO_MODES) {
    const r = S.solo(ch, mode);
    assert.deepEqual(r.controlRoom.map((c) => c.level), r.mixBus.map((c) => c.level));
    assert.equal(r.printChanged, false);
  }
});

test('digital audio: 6 dB per bit, Nyquist, file size', () => {
  const d16 = S.digital(16, 44100);
  const d24 = S.digital(24, 48000);
  near(d16.dynamicRange, 98.1, 0.05, '16-bit');
  near(d24.dynamicRange, 146.2, 0.05, '24-bit');
  assert.equal(d24.nyquist, 24000);
  assert.equal(d24.filterRoomHz, 4000);
  assert.equal(S.digital(24, 44100).filterRoomHz, 2050);
  near(d24.mbPerMinute, 8.64, 0.001, '24/48 mono MB per minute');
  near(S.digital(24, 48000, { channels: 2 }).mbPerMinute, 17.28, 0.001, 'stereo');
  near(d24.peaksAboveNoise, 128.2, 0.05, 'peaks at -18 dBFS still sit far above 24-bit noise');
  near(d16.peaksAboveNoise, 80.1, 0.05, '16-bit');
  assert.equal(S.digital(32, 48000, { float: true }).dynamicRange, null);
});

test('3:1 rule: about 9.5 dB of separation and a comb under ±3.5 dB', () => {
  const r = S.threeToOne(1, 3);
  near(r.bleedDb, -9.54, 0.01, 'bleed');
  near(r.peakDb, 2.5, 0.01, 'peak');
  near(r.notchDb, -3.52, 0.01, 'notch');
  assert.equal(r.passes, true);
  const bad = S.threeToOne(1, 1.5);
  assert.equal(bad.passes, false);
  assert.ok(bad.swingDb > 12, 'close mics comb hard');
  near(S.threeToOne(0.3, 0.9).delayMs, 1.749, 0.001, 'delay');
  near(S.threeToOne(0.3, 0.9).firstNotchHz, 286, 1, 'first notch');
});

test('comb response hits the predicted peak and notch', () => {
  const r = S.threeToOne(1, 3);
  near(S.combResponse(1, 3, 0), r.peakDb, 0.01, 'DC is the peak');
  near(S.combResponse(1, 3, r.firstNotchHz), r.notchDb, 0.05, 'first notch');
});

test('compressor curve and parallel blend', () => {
  const c = { threshold: -20, ratio: 4, knee: 0 };
  near(S.compress(-30, c), -30, 1e-9, 'below threshold untouched');
  near(S.compress(-4, c), -16, 1e-9, '16 dB over at 4:1 comes out 4 dB over');
  near(S.compress(-20, { threshold: -20, ratio: 4, knee: 6 }), -20.5625, 1e-9, 'soft knee at threshold');
  const ny = { threshold: -40, ratio: 10, makeup: 0, wetDb: 0, dryDb: 0 };
  const quietLift = S.parallel(-50, ny) - (-50);
  const loudLift = S.parallel(-6, ny) - (-6);
  assert.ok(quietLift > loudLift + 3, `parallel lifts quiet detail more than peaks (${quietLift} vs ${loudLift})`);
  near(S.parallel(-6, { ...ny, wetDb: -Infinity }), -6, 1e-9, 'wet off = dry only');
});
