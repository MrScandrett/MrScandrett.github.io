import test from 'node:test';
import assert from 'node:assert/strict';
import { cycloidDiscOutline, cycloidLimits, isSimplePolygon, polygonArea, rackOutline, threadSection } from '../assets/js/forge/drive-outlines.mjs';
import { spurGearOutline } from '../assets/js/forge/outlines.mjs';
import { DRIVE_PARTS } from '../assets/js/forge/drive-parts.mjs';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('a rack has the same tooth spacing and depth as a gear of the same module', () => {
  for (const m of [1.5, 2, 3]) {
    const r = rackOutline({ module: m, teeth: 10 });
    const g = spurGearOutline({ module: m, teeth: 20 });
    close(r.pitch, (2 * Math.PI * g.pitchRadius) / 20);
    close(r.length, 10 * Math.PI * m);
    assert.ok(isSimplePolygon(r.points) && polygonArea(r.points) > 0, `rack m${m} is a clean CCW outline`);
    assert.ok(r.tipThickness > 0);
  }
});

test('thread sections are clean outlines with the requested depth', () => {
  const t = threadSection({ pitchRadius: 8, module: 2, lead: 2 * Math.PI, starts: 1 });
  assert.ok(isSimplePolygon(t.points) && polygonArea(t.points) > 0);
  const radii = t.points.map(([x, y]) => Math.hypot(x, y));
  close(Math.max(...radii), 10, 1e-6);
  close(Math.min(...radii), 5.5, 1e-6);
  // a worm's lead is its wheel's tooth spacing × starts, so one turn moves the wheel `starts` teeth
  for (const starts of [1, 2]) close(threadSection({ pitchRadius: 8, module: 2, lead: Math.PI * 2 * starts, starts }).pitch, Math.PI * 2);
  const ls = threadSection({ pitchRadius: 6.3, module: 0, lead: 4, addendum: 0.7, dedendum: 0.7 });
  assert.ok(isSimplePolygon(ls.points));
  assert.ok(ls.tipThickness > 0.6, `leadscrew tips ${ls.tipThickness}`);
});

test('cycloid discs stay simple curves anywhere inside the limits', () => {
  for (const N of [8, 12, 16, 24]) {
    for (const R of [20, 30, 45]) {
      const lim = cycloidLimits({ pinCircleRadius: R, pins: N });
      for (const f of [0.3, 1]) {
        for (const g of [0.4, 1]) {
          const d = cycloidDiscOutline({ pinCircleRadius: R, pinRadius: lim.maxPinRadius * g, eccentricity: lim.maxEccentricity * f, pins: N, steps: N * 30 });
          assert.ok(isSimplePolygon(d.points) && polygonArea(d.points) > 0, `N${N} R${R} e${f} pin${g}`);
          assert.equal(d.ratio, N - 1);
        }
      }
    }
  }
});

test('every drive part names the drives lesson and lives in the Drives group', () => {
  assert.equal(DRIVE_PARTS.length, 8);
  for (const part of DRIVE_PARTS) {
    assert.equal(part.group, 'Drives');
    assert.match(part.lesson.href, /mechanical-drives\.html$/);
  }
});
