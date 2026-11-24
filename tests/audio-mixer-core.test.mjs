import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Mixer = require('../assets/js/lessons/audio-mixer-core.js');

function fullPatch(overrides = {}) {
  return { ch1: true, ch2: true, ch3: true, ch4: true, out: true, ...overrides };
}

test('ch1 condenser requires both patch and +48V phantom power', () => {
  const ch1 = Mixer.CHANNELS[0];
  assert.equal(Mixer.channelPreGain(ch1, { patchState: fullPatch(), phantomOn: false }).active, false);
  assert.equal(Mixer.channelPreGain(ch1, { patchState: fullPatch({ ch1: false }), phantomOn: true }).active, false);
  const ok = Mixer.channelPreGain(ch1, { patchState: fullPatch(), phantomOn: true, channels: { ch1: { gain: 32 } } });
  assert.equal(ok.active, true);
  assert.equal(ok.db, -6);
  assert.equal(ok.preampClipped, false);
});

test('preamp clips above 0 dBFS regardless of downstream fader attenuation', () => {
  const res = Mixer.evaluateMixerState({
    patchState: fullPatch(),
    phantomOn: true,
    channels: {
      ch1: { gain: 45, fader: -20, aux1: 50, aux2: 50, muted: false },
    },
    master: { fader: 0, mon: 0, fxRet: 0 },
  });
  assert.equal(res.channels.ch1.preampClipped, true);
  assert.equal(res.anyPreampClipped, true);
});

test('fader boost up to +10 dB reaches postFaderDb and meter above 0 dBFS', () => {
  const res = Mixer.evaluateMixerState({
    patchState: fullPatch(),
    phantomOn: true,
    channels: {
      ch1: { gain: 32, fader: 10, aux1: 0, aux2: 0, muted: false },
    },
    master: { fader: 0, mon: 0, fxRet: 0 },
  });
  assert.ok(Math.abs(res.channels.ch1.postFaderDb - 4) < 1e-9);
  assert.equal(res.channels.ch1.faderClipped, true);
  assert.ok(Mixer.meterPct(0) > 90 && Mixer.meterPct(0) < 91.5);
});

test('AUX 1 (Monitor) is pre-fader while AUX 2 (FX) is post-fader', () => {
  const faderUp = Mixer.evaluateMixerState({
    patchState: fullPatch(),
    phantomOn: true,
    fxType: 'reverb',
    channels: { ch1: { gain: 32, fader: 0, aux1: 100, aux2: 100, muted: false } },
    master: { fader: 0, mon: 0, fxRet: 0 },
  });
  const faderDown = Mixer.evaluateMixerState({
    patchState: fullPatch(),
    phantomOn: true,
    fxType: 'reverb',
    channels: { ch1: { gain: 32, fader: -20, aux1: 100, aux2: 100, muted: false } },
    master: { fader: 0, mon: 0, fxRet: 0 },
  });
  assert.ok(Math.abs(faderUp.aux1BusDb - faderDown.aux1BusDb) < 1e-6);
  assert.ok(Math.abs((faderUp.fxBusDb - faderDown.fxBusDb) - 20) < 1e-6);
});

test('unpatched main out blocks speaker masterOutDb while preserving internal bus metering', () => {
  const res = Mixer.evaluateMixerState({
    patchState: fullPatch({ out: false }),
    phantomOn: true,
    channels: { ch1: { gain: 32, fader: 0, aux1: 0, aux2: 0, muted: false } },
    master: { fader: 0, mon: 0, fxRet: 0 },
  });
  assert.equal(res.outPatched, false);
  assert.equal(res.masterOutDb, -Infinity);
  assert.ok(res.masterBusDb > -10);
});
