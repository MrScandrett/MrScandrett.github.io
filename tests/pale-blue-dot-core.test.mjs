import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// PbdCore is a classic browser script with no DOM in it.
const sandbox = {};
vm.runInNewContext(fs.readFileSync('assets/js/lessons/pale-blue-dot-core.js', 'utf8') + '\nthis.PbdCore = PbdCore;', sandbox);
const P = sandbox.PbdCore;
const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: got ${got}, want ${want} ± ${tol}`);
const planet = (name) => P.PLANETS.find((p) => p.name === name);
const lonDeg = ([x, y]) => (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
const angleBetween = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

test('the zoom slider is a log scale from 1.5 m to the observable universe', () => {
  near(P.sliderToMeters(0), 1.5, 1e-12, 'left end');
  near(P.sliderToMeters(100) / 2.2e27, 1, 1e-12, 'right end');
  // each equal step of the slider multiplies the width by the same factor
  const ratio = P.sliderToMeters(11) / P.sliderToMeters(10);
  for (const s of [0, 37.5, 62, 98]) near(P.sliderToMeters(s + 1) / P.sliderToMeters(s) / ratio, 1, 1e-9, `step at ${s}`);
  for (const s of [0, 1, 12.5, 50, 77.7, 100]) near(P.metersToSlider(P.sliderToMeters(s)), s, 1e-9, `round trip ${s}`);
  assert.equal(P.metersToSlider(1e-9), 0);   // clamped
  assert.equal(P.metersToSlider(1e40), 100);
});

test('formatDistance picks the unit a person would say', () => {
  assert.equal(P.formatDistance(2), '2.00 m');
  assert.equal(P.formatDistance(12742e3), '12,742 km');            // Earth's diameter
  assert.equal(P.formatDistance(3.844e8), '384,400 km');           // Earth–Moon
  assert.equal(P.formatDistance(P.AU), '1.00 AU');
  assert.equal(P.formatDistance(4.246 * P.LY), '4.25 light-years'); // Proxima Centauri
  assert.equal(P.formatDistance(26000 * P.LY), '26.0 thousand light-years');
  assert.equal(P.formatDistance(2.537e6 * P.LY), '2.54 million light-years'); // Andromeda
  assert.equal(P.formatDistance(46.5e9 * P.LY), '46.5 billion light-years');
});

test('formatLightTime: light takes 1.28 s from the Moon and 8.3 minutes from the Sun', () => {
  assert.equal(P.formatLightTime(3.844e8), '1.28 seconds');
  assert.equal(P.formatLightTime(P.AU), '8.32 minutes');
  assert.equal(P.formatLightTime(0.3), '1 nanoseconds');            // about a foot per nanosecond
  assert.equal(P.formatLightTime(P.LY), '365 days');                // under two years it still counts days
  assert.equal(P.formatLightTime(4.246 * P.LY), '4.25 years');      // Proxima Centauri
  assert.equal(P.formatLightTime(30 * P.AU), '4.16 hours');         // Neptune
  assert.equal(P.formatLightTime(2.537e6 * P.LY), '2.54 million years');
});

test('powerOfTen writes the nearest power with superscripts', () => {
  assert.equal(P.powerOfTen(1000), '10³ m');
  assert.equal(P.powerOfTen(1.5e11), '10¹¹ m');
  assert.equal(P.powerOfTen(0.01), '10⁻² m');
});

test('fade ramps 0 → 1 between two widths on a log scale, in either direction', () => {
  assert.equal(P.fade(1, 10, 1000), 0);
  assert.equal(P.fade(1e6, 10, 1000), 1);
  near(P.fade(100, 10, 1000), 0.5, 1e-12, 'log midpoint');
  near(P.fade(100, 1000, 10), 0.5, 1e-12, 'fading out');
  assert.equal(P.fade(1, 1000, 10), 1);
});

test("helioXY: Earth is nearest the Sun in early January and farthest in early July", () => {
  const earth = planet('Earth');
  const r = (y, m, d) => Math.hypot(...P.helioXY(earth, Date.UTC(y, m - 1, d))) / P.AU;
  near(r(2026, 1, 3), 0.9833, 0.0005, 'perihelion distance (AU)');
  near(r(2026, 7, 6), 1.0167, 0.0005, 'aphelion distance (AU)');
  for (const [m, d] of [[2, 15], [4, 1], [9, 1], [11, 20]]) {
    const dist = r(2026, m, d);
    assert.ok(dist > 0.9833 && dist < 1.0167, `between the extremes on ${m}/${d}: ${dist}`);
  }
});

test('helioXY: at the March equinox the Sun is at longitude 0°, so Earth is at 180°', () => {
  const lon = lonDeg(P.helioXY(planet('Earth'), Date.UTC(2026, 2, 20, 14, 46)));
  // J2000 elements, so precession since 2000 (0.4°) is part of the error budget
  assert.ok(angleBetween(lon, 180) < 0.6, `Earth's heliocentric longitude was ${lon}`);
});

test('helioXY: each planet comes back to the same place after its real year', () => {
  const start = Date.UTC(2026, 0, 1);
  const years = { Mercury: 87.969, Venus: 224.701, Earth: 365.256, Mars: 686.980, Jupiter: 4332.59, Saturn: 10759.22 };
  for (const [name, days] of Object.entries(years)) {
    const a = P.helioXY(planet(name), start), b = P.helioXY(planet(name), start + days * 864e5);
    const drift = Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.hypot(...a);
    assert.ok(drift < 0.004, `${name} drifted ${(drift * 100).toFixed(3)}% of its orbit radius after one period`);
  }
});

test('helioXY: every planet stays between its perihelion and aphelion, a(1 ± e)', () => {
  for (const p of P.PLANETS) {
    for (let day = 0; day < 4000; day += 97) {
      const r = Math.hypot(...P.helioXY(p, Date.UTC(2020, 0, 1) + day * 864e5)) / P.AU;
      assert.ok(r >= p.a * (1 - p.e) - 1e-9 && r <= p.a * (1 + p.e) + 1e-9, `${p.name} at ${r} AU`);
    }
  }
});

test('helioXY: Mars and Jupiter line up behind Earth at their real oppositions', () => {
  const at = (name, when) => lonDeg(P.helioXY(planet(name), when));
  const marsOpp = Date.UTC(2025, 0, 16), jupiterOpp = Date.UTC(2026, 0, 10);
  assert.ok(angleBetween(at('Earth', marsOpp), at('Mars', marsOpp)) < 1.5, 'Mars opposition, 16 Jan 2025');
  assert.ok(angleBetween(at('Earth', jupiterOpp), at('Jupiter', jupiterOpp)) < 1.5, 'Jupiter opposition, 10 Jan 2026');
  // and at Mars's next conjunction (9 Jan 2026) the Sun is between them
  const conj = Date.UTC(2026, 0, 9);
  assert.ok(angleBetween(at('Earth', conj), at('Mars', conj)) > 178, 'Mars conjunction, 9 Jan 2026');
});

test("skyXY projects a sky direction onto the plane of Earth's orbit", () => {
  const d = 10 * P.LY;
  // RA 0h, Dec 0° is the March equinox direction: the +x axis
  const [x0, y0] = P.skyXY(0, 0, d);
  near(x0 / d, 1, 1e-12, 'equinox x'); near(y0 / d, 0, 1e-12, 'equinox y');
  // the north ecliptic pole (RA 18h, Dec +66.56°) is straight up out of the plane
  const [xp, yp] = P.skyXY(270, 90 - 23.4393, d);
  near(xp / d, 0, 1e-9, 'pole x'); near(yp / d, 0, 1e-9, 'pole y');
  // the June solstice point (RA 6h, Dec +23.44°) lies in the plane at longitude 90°
  const [xs, ys] = P.skyXY(90, 23.4393, d);
  near(xs / d, 0, 1e-9, 'solstice x'); near(ys / d, 1, 1e-9, 'solstice y');
  // nothing can project to farther than its true distance
  for (const [ra, dec] of [[14.5, -60.8], [101.3, -16.7], [219.9, 38.8], [310, 45]]) assert.ok(Math.hypot(...P.skyXY(ra, dec, d)) <= d * (1 + 1e-12));
});

test('helioShape: the heliopause is closest at the nose and stretched down the tail', () => {
  const pts = P.helioShape(121, 1.6);
  const r = pts.map(([x, y]) => Math.hypot(x, y) / P.AU);
  assert.equal(pts.length, 97);
  near(r[0], 121, 1e-9, 'nose distance (AU)');           // where Voyager 1 crossed
  near(r[48], 121 * 2.6, 1e-6, 'tail distance (AU)');
  near(Math.min(...r), 121, 1e-9, 'nose is the minimum');
  near(lonDeg(pts[0]), 255.4, 1e-9, 'nose longitude');
  near(pts[96][0] / pts[0][0], 1, 1e-9, 'closed curve x'); near(pts[96][1] / pts[0][1], 1, 1e-9, 'closed curve y');
});

test('niceBar rounds a scale bar down to 1, 2 or 5 of the displayed unit', () => {
  near(P.niceBar(3.3 * P.AU), 2 * P.AU, 1, '3.3 AU');
  near(P.niceBar(7 * P.LY), 5 * P.LY, 1, '7 ly');
  near(P.niceBar(1234e3), 1000e3, 1e-6, '1,234 km');
  near(P.niceBar(42), 20, 1e-9, '42 m');
  for (const target of [0.7, 9, 5e4, 3e9, 8e12, 6e17, 4e20, 2e24, 9e26]) {
    const bar = P.niceBar(target);
    assert.ok(bar <= target * 1.001 && bar > target / 5.01, `bar ${bar} for target ${target}`);
  }
});
