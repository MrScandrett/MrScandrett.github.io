import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ConstellationsCore is a classic browser script with no DOM in it.
const sandbox = {};
vm.runInNewContext(fs.readFileSync('assets/js/lessons/constellations-core.js', 'utf8') + '\nthis.ConstellationsCore = ConstellationsCore;', sandbox);
const C = sandbox.ConstellationsCore;
const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: got ${got}, want ${want} ± ${tol}`);

test('angularDistance: degrees between two stars (flat-sky approximation)', () => {
  const dubhe = { ra: 165.93, dec: 61.75 }, merak = { ra: 165.46, dec: 56.38 };
  near(C.angularDistance(dubhe, merak), 5.37, 0.05, 'the Pointers of the Big Dipper');
  const betelgeuse = { ra: 88.79, dec: 7.41 }, rigel = { ra: 78.63, dec: -8.20 };
  near(C.angularDistance(betelgeuse, rigel), 18.6, 0.3, 'Betelgeuse to Rigel');
  assert.equal(C.angularDistance(dubhe, dubhe), 0);
  near(C.angularDistance(dubhe, merak), C.angularDistance(merak, dubhe), 1e-12, 'symmetric');
});

test('angularDistance takes the short way round 0h of right ascension', () => {
  near(C.angularDistance({ ra: 359, dec: 0 }, { ra: 1, dec: 0 }), 2, 1e-9, 'across 0h');
  near(C.angularDistance({ ra: 1, dec: 0 }, { ra: 359, dec: 0 }), 2, 1e-9, 'and back');
  // a degree of right ascension shrinks by cos(dec) away from the equator
  near(C.angularDistance({ ra: 10, dec: 60 }, { ra: 20, dec: 60 }), 5, 1e-9, 'at 60° declination');
});

test('formatRa turns degrees into hours and minutes (15° per hour)', () => {
  assert.equal(C.formatRa(0), '00h 00m');
  assert.equal(C.formatRa(88.79), '05h 55m');    // Betelgeuse
  assert.equal(C.formatRa(101.29), '06h 45m');   // Sirius
  assert.equal(C.formatRa(279.23), '18h 37m');   // Vega
  assert.equal(C.formatRa(359.999), '00h 00m');  // rounds up through 24h back to 0h
  assert.equal(C.formatRa(14.99), '01h 00m');    // 59.96 min rounds to the next hour, not "00h 60m"
});

test('formatDec turns degrees into signed degrees and arcminutes', () => {
  assert.equal(C.formatDec(38.78), '+38° 47′');    // Vega
  assert.equal(C.formatDec(-16.72), '−16° 43′');   // Sirius, with a real minus sign
  assert.equal(C.formatDec(0), '+00° 00′');
  assert.equal(C.formatDec(-0.5), '−00° 30′');
  assert.equal(C.formatDec(7.999), '+08° 00′');    // carries, never "07° 60′"
  assert.equal(C.formatDec(89.26), '+89° 16′');    // Polaris
});

test('affineFromAnchors maps its three anchor points exactly', () => {
  const src = [[10, 20], [200, 40], [60, 180]];
  const dst = [{ x: 310, y: 95 }, { x: 420, y: 260 }, { x: 150, y: 300 }];
  const m = C.affineFromAnchors(src, dst);
  const apply = ([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }); // canvas setTransform(a,b,c,d,e,f)
  src.forEach((p, i) => { const q = apply(p); near(q.x, dst[i].x, 1e-9, `x${i}`); near(q.y, dst[i].y, 1e-9, `y${i}`); });
  // affine: the midpoint of two anchors lands on the midpoint of their images
  const mid = apply([(src[0][0] + src[1][0]) / 2, (src[0][1] + src[1][1]) / 2]);
  near(mid.x, (dst[0].x + dst[1].x) / 2, 1e-9, 'midpoint x'); near(mid.y, (dst[0].y + dst[1].y) / 2, 1e-9, 'midpoint y');
});

test('affineFromAnchors recovers a known scale + rotation + shift', () => {
  const k = 2.5, t = Math.PI / 6, tx = 40, ty = -15;
  const f = ([x, y]) => ({ x: k * (x * Math.cos(t) - y * Math.sin(t)) + tx, y: k * (x * Math.sin(t) + y * Math.cos(t)) + ty });
  const src = [[0, 0], [100, 0], [0, 100]];
  const m = C.affineFromAnchors(src, src.map(f));
  near(m.a, k * Math.cos(t), 1e-9, 'a'); near(m.b, k * Math.sin(t), 1e-9, 'b');
  near(m.c, -k * Math.sin(t), 1e-9, 'c'); near(m.d, k * Math.cos(t), 1e-9, 'd');
  near(m.e, tx, 1e-9, 'e'); near(m.f, ty, 1e-9, 'f');
  near(m.a * m.d - m.b * m.c, k * k, 1e-9, 'determinant = area scale');
});

test('affineFromAnchors refuses three anchors in a line', () => {
  const dst = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  assert.equal(C.affineFromAnchors([[0, 0], [5, 5], [10, 10]], dst), null);
  assert.equal(C.affineFromAnchors([[3, 3], [3, 3], [9, 1]], dst), null);
});
