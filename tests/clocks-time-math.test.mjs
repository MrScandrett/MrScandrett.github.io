import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ctm = require('../assets/js/lessons/clocks-time-math.js');

test('clockHandAngles computes exact hour, minute, second, and hand-gap angles', () => {
  const noon = ctm.clockHandAngles(12, 0, 0);
  assert.equal(noon.hourDeg, 0);
  assert.equal(noon.minDeg, 0);
  assert.equal(noon.secDeg, 0);
  assert.equal(noon.handGapDeg, 0);

  const three = ctm.clockHandAngles(3, 0, 0);
  assert.equal(three.hourDeg, 90);
  assert.equal(three.minDeg, 0);
  assert.equal(three.handGapDeg, 90);

  const halfPastThree = ctm.clockHandAngles(3, 30, 0);
  assert.equal(halfPastThree.hourDeg, 105);
  assert.equal(halfPastThree.minDeg, 180);
  assert.equal(halfPastThree.handGapDeg, 75);

  const six = ctm.clockHandAngles(6, 0, 0);
  assert.equal(six.hourDeg, 180);
  assert.equal(six.handGapDeg, 180);

  const nine = ctm.clockHandAngles(9, 0, 0);
  assert.equal(nine.hourDeg, 270);
  assert.equal(nine.handGapDeg, 90);
});

test('formatTime12, formatTime24, and timeToWords handle edge times cleanly', () => {
  assert.equal(ctm.formatTime12(0, 0, 0, false), '12:00 AM');
  assert.equal(ctm.formatTime12(12, 0, 0, false), '12:00 PM');
  assert.equal(ctm.formatTime12(15, 45, 9, true), '3:45:09 PM');
  assert.equal(ctm.formatTime24(15, 45, 9, false), '15:45');
  assert.equal(ctm.formatTime24(5, 3, 2, true), '05:03:02');

  assert.equal(ctm.timeToWords(0, 0), 'Midnight');
  assert.equal(ctm.timeToWords(12, 0), 'Noon');
  assert.equal(ctm.timeToWords(3, 0), "Three o'clock");
  assert.equal(ctm.timeToWords(3, 15), 'Quarter past three');
  assert.equal(ctm.timeToWords(3, 30), 'Half past three');
  assert.equal(ctm.timeToWords(3, 45), 'Quarter to four');
  assert.equal(ctm.timeToWords(3, 20), 'Twenty past three');
  assert.equal(ctm.timeToWords(3, 50), 'Ten to four');
  assert.equal(ctm.timeToWords(15, 42), 'Three forty-two');
});

test('computeElapsedTime decomposes same-hour, multi-hour, and overnight intervals', () => {
  const sameHour = ctm.computeElapsedTime(9 * 60 + 10, 9 * 60 + 35);
  assert.equal(sameHour.totalMinutes, 25);
  assert.equal(sameHour.crossedMidnight, false);
  assert.equal(sameHour.jumps.reduce((s, j) => s + j.delta, 0), 25);

  const crossHour = ctm.computeElapsedTime(10 * 60 + 45, 11 * 60 + 20);
  assert.equal(crossHour.totalMinutes, 35);
  assert.equal(crossHour.hours, 0);
  assert.equal(crossHour.minutes, 35);
  assert.equal(crossHour.jumps.reduce((s, j) => s + j.delta, 0), 35);
  assert.equal(crossHour.jumps.length, 2);

  const overnight = ctm.computeElapsedTime(22 * 60 + 50, 1 * 60 + 15);
  assert.equal(overnight.totalMinutes, 145);
  assert.equal(overnight.hours, 2);
  assert.equal(overnight.minutes, 25);
  assert.equal(overnight.crossedMidnight, true);
  assert.equal(overnight.jumps.reduce((s, j) => s + j.delta, 0), 145);

  const longTrip = ctm.computeElapsedTime(8 * 60 + 15, 15 * 60 + 40);
  assert.equal(longTrip.totalMinutes, 445);
  assert.equal(longTrip.jumps.reduce((s, j) => s + j.delta, 0), 445);
});

test('solarPosition and solarTerminatorPath produce valid SVG paths across seasons', () => {
  const dates = [
    new Date('2026-06-21T12:00:00Z'), // Summer solstice
    new Date('2026-12-21T18:00:00Z'), // Winter solstice
    new Date('2026-03-20T06:00:00Z')  // Spring equinox
  ];
  for (const d of dates) {
    const res = ctm.solarTerminatorPath(d, 800, 400);
    assert.ok(res.pathD.startsWith('M0,'));
    assert.ok(!res.pathD.includes('NaN'), `NaN found in path for ${d.toISOString()}`);
    assert.ok(res.subsolar.x >= 0 && res.subsolar.x <= 800);
    assert.ok(res.subsolar.y >= 0 && res.subsolar.y <= 400);
  }
});

test('lorentzFactor and timeDilation match exact special relativity values', () => {
  assert.equal(ctm.lorentzFactor(0), 1);
  assert.ok(Math.abs(ctm.lorentzFactor(0.5) - 1.1547) < 0.001);
  assert.ok(Math.abs(ctm.lorentzFactor(Math.sqrt(3) / 2) - 2.0) < 0.0001);

  const at90 = ctm.timeDilation(0.9, 5);
  assert.ok(Math.abs(at90.gamma - 2.2942) < 0.001);
  assert.ok(Math.abs(at90.earthYears - 11.4708) < 0.01);

  const atGamma4 = ctm.timeDilation(Math.sqrt(15) / 4, 5);
  assert.ok(Math.abs(atGamma4.gamma - 4.0) < 0.001);
  assert.ok(Math.abs(atGamma4.earthYears - 20.0) < 0.01);

  const at99 = ctm.timeDilation(0.99, 1);
  assert.ok(Math.abs(at99.gamma - 7.0888) < 0.001);

  const at999 = ctm.timeDilation(0.999, 1);
  assert.ok(Math.abs(at999.gamma - 22.3663) < 0.001);
});

test('wireLengthForNanoseconds matches Grace Hopper measurements', () => {
  const oneNs = ctm.wireLengthForNanoseconds(1);
  assert.ok(Math.abs(oneNs.meters - 0.299792458) < 1e-6);
  assert.ok(Math.abs(oneNs.inches - 11.80285) < 0.01);

  const oneUs = ctm.wireLengthForNanoseconds(1000);
  assert.ok(Math.abs(oneUs.meters - 299.792458) < 1e-3);
  assert.ok(Math.abs(oneUs.feet - 983.571) < 0.1);
});

test('parsePracticeAnswer handles numeric, degree, clock, and 24-hour inputs', () => {
  assert.equal(ctm.parsePracticeAnswer('90°', 'number'), 90);
  assert.equal(ctm.parsePracticeAnswer('11.8 inches', 'number'), 11.8);
  assert.equal(ctm.parsePracticeAnswer('1,000', 'number'), 1000);
  assert.equal(ctm.parsePracticeAnswer('3', 'clock'), 3);
  assert.equal(ctm.parsePracticeAnswer('3:00', 'clock'), 3);
  assert.equal(ctm.parsePracticeAnswer('03:00', 'clock'), 3);
  assert.equal(ctm.parsePracticeAnswer('15:45', 'time24'), 15 * 60 + 45);
  assert.equal(ctm.parsePracticeAnswer('3:45 pm', 'time24'), 15 * 60 + 45);
  assert.ok(Number.isNaN(ctm.parsePracticeAnswer('not a time', 'time24')));
});
