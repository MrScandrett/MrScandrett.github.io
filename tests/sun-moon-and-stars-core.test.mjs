import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// SunMoonCore is a classic browser script with no DOM in it.
const sandbox = {};
vm.runInNewContext(fs.readFileSync('assets/js/lessons/sun-moon-and-stars-core.js', 'utf8') + '\nthis.SunMoonCore = SunMoonCore;', sandbox);
const S = sandbox.SunMoonCore;
const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: got ${got}, want ${want} ± ${tol}`);
const altitude = (lat, hour) => Math.asin(S.sinAltitude(lat, (hour - 12) * 15)) * 180 / Math.PI;

test('formatTime writes decimal hours as a 24-hour clock', () => {
  assert.equal(S.formatTime(0), '00:00');
  assert.equal(S.formatTime(6.5), '06:30');
  assert.equal(S.formatTime(12.25), '12:15');
  assert.equal(S.formatTime(18.75), '18:45');
  assert.equal(S.formatTime(23.99), '23:59');
});

test('on an equinox the noon Sun stands at 90° minus your latitude', () => {
  near(altitude(0, 12), 90, 1e-6, 'equator: straight overhead');
  near(altitude(40, 12), 50, 1e-9, '40°N');
  near(altitude(66.5, 12), 23.5, 1e-9, 'Arctic Circle');
  near(altitude(90, 12), 0, 1e-9, 'pole: on the horizon all day');
});

test('on an equinox the Sun rises at 06:00 and sets at 18:00 everywhere, for a 12-hour day', () => {
  for (const lat of [0, 23.5, 40, 60]) {
    near(altitude(lat, 6), 0, 1e-9, `sunrise at ${lat}°`);
    near(altitude(lat, 18), 0, 1e-9, `sunset at ${lat}°`);
    assert.ok(altitude(lat, 9) > 0 && altitude(lat, 15) > 0, 'up during the day');
    assert.ok(altitude(lat, 3) < 0 && altitude(lat, 21) < 0, 'down at night');
    near(altitude(lat, 9), altitude(lat, 15), 1e-9, 'morning and afternoon mirror each other');
    near(altitude(lat, 0), -(90 - lat), 1e-6, 'midnight Sun is as far below as noon is above');
  }
});

test('a stick’s shadow is as long as the stick when the Sun is 45° up, and shortest at noon', () => {
  const shadow = (lat, hour) => 1 / Math.tan(altitude(lat, hour) * Math.PI / 180);
  near(shadow(45, 12), 1, 1e-9, 'lat 45° at noon');
  assert.ok(shadow(40, 9) > shadow(40, 12) && shadow(40, 16) > shadow(40, 12));
  assert.ok(shadow(60, 12) > shadow(20, 12), 'longer noon shadows nearer the pole');
});

test('illuminatedFraction: 0 at new, half at the quarters, 1 at full', () => {
  near(S.illuminatedFraction(0), 0, 1e-12, 'new');
  near(S.illuminatedFraction(90), 0.5, 1e-12, 'first quarter');
  near(S.illuminatedFraction(180), 1, 1e-12, 'full');
  near(S.illuminatedFraction(270), 0.5, 1e-12, 'last quarter');
  near(S.illuminatedFraction(360), 0, 1e-12, 'new again');
  // a "crescent" at 45° is only about 15% lit, and a gibbous at 135° about 85%
  near(S.illuminatedFraction(45), 0.1464, 1e-4, 'waxing crescent');
  near(S.illuminatedFraction(135), 0.8536, 1e-4, 'waxing gibbous');
  // waning mirrors waxing
  for (const a of [10, 45, 77, 120, 163]) near(S.illuminatedFraction(a), S.illuminatedFraction(360 - a), 1e-12, `mirror at ${a}°`);
});

test('the eight named phases run in order round the month, 45° and about 3.7 days apart', () => {
  const names = Array.from(S.moonPhasesData, (p) => p.name);
  assert.deepEqual(names, ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Third / Last Quarter', 'Waning Crescent']);
  S.moonPhasesData.forEach((p, i) => {
    assert.equal(p.angle, i * 45);
    near(p.day, p.angle / 360 * 29.53, 0.1, `day of ${p.name} in a 29.53-day synodic month`);
  });
});

test('nearestPhase names the phase at and around each of the eight angles', () => {
  for (const p of S.moonPhasesData) {
    assert.equal(S.nearestPhase(p.angle).name, p.name);
    if (p.angle > 0) assert.equal(S.nearestPhase(p.angle - 20).name, p.name);
    assert.equal(S.nearestPhase(p.angle + 20).name, p.name);
  }
  assert.equal(S.nearestPhase(100).name, 'First Quarter');
  assert.equal(S.nearestPhase(200).name, 'Full Moon');
});
