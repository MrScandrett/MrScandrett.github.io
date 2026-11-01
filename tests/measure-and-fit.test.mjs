// Measure and Fit lesson helpers (lessons/3d-design/cad-and-printing/measure-and-fit.html).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../assets/js/lessons/measure-and-fit.mjs';

test('loose fit matches the print-fidgets moving clearance (0.35–0.50 mm per side)', () => {
  assert.equal(F.FITS.loose.min, 0.35);
  assert.equal(F.FITS.loose.max, 0.5);
});

test('design sizes', () => {
  assert.equal(F.designSize({ item: 7.94, fit: 'slip' }).model, 8.45); // 8.44 rounded to 0.05
  assert.equal(F.designSize({ item: 25.5, fit: 'press', kind: 'peg' }).model, 25.3);
  assert.equal(F.designSize({ item: 5, fit: 'loose', correction: 0.15 }).model, 5.95);
  assert.equal(F.designSize({ item: -1, fit: 'slip' }), null);
});

test('number parsing and verniers', () => {
  assert.equal(F.parseNumber('1 1/4'), 1.25);
  assert.equal(F.parseNumber('5/16'), 0.3125);
  assert.equal(F.parseNumber('7,2 mm'), 7.2);
  assert.ok(Number.isNaN(F.parseNumber('abc')));
  assert.deepEqual(F.vernierRead(16.35, 0.05), { value: 16.35, main: 16, line: 7, fraction: 0.35 });
  assert.deepEqual(F.vernierRead(7.36, 0.02), { value: 7.36, main: 7, line: 18, fraction: 0.36 });
  for (const v of Object.values(F.VERNIERS)) assert.ok(Math.abs((Math.ceil(v.span / v.n) - v.span / v.n) - v.res) < 1e-9);
});

test('fit test coupons are watertight for every option', () => {
  for (const item of [3, 6.5, 7.94, 14.2, 25.5, 40, 80]) for (const shape of ['round', 'slot']) for (const set of ['full', 'short']) {
    const s = F.meshStats(F.buildCouponMesh({ item, shape, set, thickness: 5 }));
    assert.ok(s.watertight && s.volume > 0, `${item} ${shape} ${set}`);
  }
  const buf = F.meshToStl(F.buildCouponMesh({ item: 10 }));
  assert.equal(buf.byteLength, 84 + 50 * new DataView(buf).getUint32(80, true));
});
