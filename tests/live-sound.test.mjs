import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const L = require('../assets/js/lessons/live-sound.js');

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: expected ${expected}, got ${actual}`);

test('speed of sound: 343 m/s at 20 °C, faster when warm', () => {
  near(L.speedOfSound(20), 343.4, 0.2, '20 °C');
  assert.ok(L.speedOfSound(35) > L.speedOfSound(5));
});

test('inverse square law: −6 dB per doubling for a point source, −3 dB for a line source', () => {
  near(L.distanceLoss(1, 2, 'point'), 6.02, 0.01, 'point, 1→2 m');
  near(L.distanceLoss(10, 40, 'point'), 12.04, 0.01, 'point, 10→40 m');
  near(L.distanceLoss(1, 2, 'line'), 3.01, 0.01, 'line, 1→2 m');
});

test('SPL from sensitivity, watts and distance', () => {
  // 97 dB (1 W/1 m) speaker, 100 W, 1 m → 117 dB; at 16 m (four doublings) → 117 − 24.1
  near(L.spl({ sensitivity: 97, watts: 100, distance: 1 }), 117, 0.01, '1 m');
  near(L.spl({ sensitivity: 97, watts: 100, distance: 16 }), 92.92, 0.02, '16 m');
  // Doubling the power is only +3 dB
  near(L.spl({ sensitivity: 97, watts: 200, distance: 1 }) - L.spl({ sensitivity: 97, watts: 100, distance: 1 }), 3.01, 0.01, '2× watts');
});

test('adding sources: uncorrelated +3 dB, coherent +6 dB, opposite polarity cancels', () => {
  near(L.addSources([94, 94], 'uncorrelated'), 97.01, 0.01, 'two singers');
  near(L.addSources([94, 94, 94, 94], 'uncorrelated'), 100.02, 0.01, 'four singers');
  near(L.addSources([94, 94], 'coherent'), 100.02, 0.01, 'two speakers in phase');
  near(L.addSources([90, 80], 'uncorrelated'), 90.41, 0.01, 'a quieter source barely adds');
  near(L.coherentSum(94, 94, 0), 100.02, 0.01, 'in phase');
  assert.equal(L.coherentSum(94, 94, 180), -Infinity, 'opposite polarity');
  near(L.coherentSum(94, 94, 120), 94, 0.01, '120° apart leaves one source’s level');
});

test('polar patterns: the null of each first-order mic', () => {
  near(L.patternNull('cardioid'), 180, 0.01, 'cardioid');
  near(L.patternNull('supercardioid'), 126, 0.5, 'supercardioid');
  near(L.patternNull('hypercardioid'), 109.5, 0.5, 'hypercardioid');
  near(L.patternNull('figure8'), 90, 0.01, 'figure-8');
  assert.equal(L.patternNull('omni'), null);
  near(L.patternGain('cardioid', 90), 0.5, 1e-9, 'cardioid at 90°');
  near(L.rejectionDb('cardioid', 90), 6.02, 0.01, 'cardioid side rejection');
  assert.equal(L.rejectionDb('cardioid', 180), 25, 'real mics never null perfectly');
  assert.equal(L.rejectionDb('omni', 180), 0);
});

test('gain before feedback: PAG/NAG and the rules of thumb', () => {
  const base = { ds: 0.3, d0: 15, d1: 4, d2: 15, ead: 3, nom: 1 };
  const r = L.gainBeforeFeedback(base);
  // 20log4 − 20log15 + 20log15 − 20log0.3 − 0 − 6
  near(r.pag, 20 * Math.log10(4 / 0.3) - 6, 1e-9, 'PAG');
  near(r.nag, 20 * Math.log10(15 / 3), 1e-9, 'NAG');
  assert.equal(r.works, r.pag >= r.nag);
  // Halve the talker-to-mic distance: +6 dB
  near(L.gainBeforeFeedback({ ...base, ds: 0.15 }).pag - r.pag, 6.02, 0.01, 'mic twice as close');
  // Double the open mics: −3 dB
  near(L.gainBeforeFeedback({ ...base, nom: 2 }).pag - r.pag, -3.01, 0.01, 'twice the open mics');
  near(L.gainBeforeFeedback({ ...base, nom: 4 }).pag - r.pag, -6.02, 0.01, 'four open mics');
  // Directional rejection adds straight on
  near(L.gainBeforeFeedback({ ...base, rejection: 10 }).pag - r.pag, 10, 1e-9, 'rejection');
});

test('ring-out room: deterministic, peaks in the vocal range, cuts buy gain', () => {
  const a = L.createRoom(42), b = L.createRoom(42);
  assert.deepEqual(a, b, 'same seed, same room');
  assert.notDeepEqual(L.createRoom(1).peaks, L.createRoom(2).peaks, 'different seeds differ');

  for (let seed = 1; seed <= 40; seed++) {
    const room = L.createRoom(seed);
    assert.equal(room.peaks.length, 6);
    room.peaks.forEach((p) => {
      assert.ok(L.GEQ_BANDS.includes(p.band), 'peak sits on a graphic EQ band');
      assert.ok(p.band >= 160 && p.band <= 6300, 'peak in the feedback range');
    });

    // With no EQ, the system rings at its tallest peak's band.
    const flat = L.maxStableGain(room, {});
    const first = L.ringPoint(room, {}, flat + 0.5);
    assert.equal(first.rings, true);
    assert.equal(first.band, room.peaks[0].band, `seed ${seed}: first ring is the peak listed first (ring order)`);

    // Notching the ringing band buys gain; notching a band nowhere near it doesn't.
    const cut = { [first.band]: 6 };
    assert.ok(L.maxStableGain(room, cut) > flat + 1, `seed ${seed}: the right cut buys gain`);
    const far = first.band >= 1000 ? 25 : 16000;
    near(L.maxStableGain(room, { [far]: 6 }), flat, 0.05, `seed ${seed}: the wrong cut buys nothing`);

    // Ringing out four bands should buy a few dB, never unlimited gain.
    let cuts = {};
    for (let i = 0; i < 4; i++) {
      const rp = L.ringPoint(room, cuts, 0);
      cuts = { ...cuts, [rp.band]: (cuts[rp.band] || 0) + 6 };
    }
    const gained = L.maxStableGain(room, cuts) - flat;
    assert.ok(gained > 2 && gained < 15, `seed ${seed}: ring-out buys a realistic ${gained.toFixed(1)} dB`);
  }
});

test('EQ damage verdicts', () => {
  assert.equal(L.eqDamage({}).verdict, 'flat');
  assert.equal(L.eqDamage({ 1000: 6, 2500: 3 }).verdict, 'transparent');
  assert.equal(L.eqDamage({ 250: 6, 500: 6, 1000: 6, 2000: 6, 4000: 6 }).verdict, 'noticeable');
  assert.equal(L.eqDamage({ 200: 12, 250: 12, 315: 12, 400: 12, 500: 12, 630: 12, 800: 12 }).verdict, 'hollow');
});

test('beaming: a cone narrows once the wavelength is shorter than it', () => {
  near(L.beamingFrequency(15), 901, 5, '15-inch woofer');
  near(L.beamingFrequency(1), 13520, 50, '1-inch tweeter');
  near(L.wavelength(343.4), 1, 0.01, '343 Hz is about a metre long');
  // At the beaming frequency (λ = d) a piston's −6 dB coverage is about 90°.
  near(L.pistonCoverage(12, L.beamingFrequency(12)), 89.7, 0.5, 'λ = d');
  assert.equal(L.pistonCoverage(12, 200), 180, 'a 12-inch cone is wide at 200 Hz');
  assert.ok(L.pistonCoverage(12, 8000) < 15, 'and a narrow beam at 8 kHz');
});

test('speaker loads: parallel divides, series multiplies', () => {
  assert.equal(L.speakerLoad(2, 8, 'parallel'), 4);
  assert.equal(L.speakerLoad(4, 8, 'parallel'), 2);
  assert.equal(L.speakerLoad(2, 8, 'series'), 16);
});

test('amplifier power: half the load, twice the watts; bridging quadruples into the same load', () => {
  const at8 = L.ampPower({ ratedWatts8: 500, load: 8 });
  const at4 = L.ampPower({ ratedWatts8: 500, load: 4 });
  near(at8.watts, 500, 1e-9, '8 Ω');
  near(at4.watts, 1000, 1e-9, '4 Ω');
  assert.equal(at4.safe, true);
  assert.equal(L.ampPower({ ratedWatts8: 500, load: 2, minLoad: 4 }).safe, false, '2 Ω on a 4 Ω amp');
  const br = L.ampPower({ ratedWatts8: 500, load: 8, bridged: true, minLoad: 4 });
  near(br.watts, 2000, 1e-9, 'bridged into 8 Ω');
  assert.equal(br.safe, true, 'bridged 8 Ω = 4 Ω per side');
  assert.equal(L.ampPower({ ratedWatts8: 500, load: 4, bridged: true, minLoad: 4 }).safe, false, 'bridged 4 Ω = 2 Ω per side');
});

test('speaker cable: long, thin runs into low loads lose level and damping', () => {
  const thin = L.cableLoss({ awg: 18, metres: 30, load: 4 });
  const thick = L.cableLoss({ awg: 12, metres: 30, load: 4 });
  near(thin.cableOhms, 1.26, 0.01, '30 m of 18 AWG, out and back');
  assert.ok(thin.lossDb > 2 && thin.lossDb < 3, `18 AWG loses ${thin.lossDb}`);
  assert.ok(thick.lossDb < 1, `12 AWG loses ${thick.lossDb}`);
  assert.ok(thin.dampingAtSpeaker < 5 && thick.dampingAtSpeaker > 10);
});

test('delay speakers: travel time plus the Haas offset', () => {
  const d = L.delaySpeaker({ distance: 34.3, tempC: 20, haasMs: 10 });
  near(d.travelMs, 99.9, 0.2, '34.3 m');
  near(d.delayMs, 109.9, 0.2, 'with Haas');
  assert.ok(L.delaySpeaker({ distance: 30, tempC: 35 }).travelMs < L.delaySpeaker({ distance: 30, tempC: 5 }).travelMs, 'warm air is faster');
});

test('coverage: raising the speaker evens out front and back rows', () => {
  const low = L.coverage({ height: 0.5, front: 2, back: 20 });
  const high = L.coverage({ height: 5, front: 2, back: 20 });
  assert.ok(low.spread > 19 && low.spread < 20.5, `low spread ${low.spread}`);
  assert.ok(high.spread < low.spread - 7, `high spread ${high.spread}`);
});

test('hearing: NIOSH 85 dBA for 8 hours, half the time per +3 dB', () => {
  near(L.safeHours(85), 8, 1e-9, '85 dBA');
  near(L.safeHours(88), 4, 1e-9, '88 dBA');
  near(L.safeHours(100) * 60, 15, 1e-6, '100 dBA in minutes');
});
