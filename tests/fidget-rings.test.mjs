import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const F = createRequire(import.meta.url)('../assets/js/lessons/fidget-rings.js');
const shapes = ['star', 'round'];

/* ── mesh helpers ────────────────────────────────────────────────────── */
const key = (v) => v.map((n) => n.toFixed(5)).join(',');
function shells(tris) {
  // Split the triangle soup into connected shells by shared vertices.
  const parent = new Map();
  const find = (a) => { while (parent.get(a) !== a) { parent.set(a, parent.get(parent.get(a))); a = parent.get(a); } return a; };
  const union = (a, b) => { parent.set(find(a), find(b)); };
  tris.forEach((t) => t.forEach((v) => { const k = key(v); if (!parent.has(k)) parent.set(k, k); }));
  tris.forEach((t) => { union(key(t[0]), key(t[1])); union(key(t[1]), key(t[2])); });
  const groups = new Map();
  tris.forEach((t) => { const r = find(key(t[0])); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(t); });
  return [...groups.values()];
}
function signedVolume(tris) {
  let v = 0;
  for (const [a, b, c] of tris) v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  return v;
}
function pointTriangle(p, a, b, c) {
  const sub = (x, y) => [x[0] - y[0], x[1] - y[1], x[2] - y[2]], dot = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  const dist = (q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  if (d1 <= 0 && d2 <= 0) return dist(a);
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return dist(b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return dist([a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]); }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return dist(c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return dist([a[0] + t * ac[0], a[1] + t * ac[1], a[2] + t * ac[2]]); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return dist([b[0] + t * (c[0] - b[0]), b[1] + t * (c[1] - b[1]), b[2] + t * (c[2] - b[2])]); }
  const denom = 1 / (va + vb + vc), v = vb * denom, w = vc * denom;
  return dist([a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]);
}

for (const shape of shapes) {
  const p = F.DEFAULTS[shape];

  test(`${shape}: defaults lock, with a ridge that cannot slip through the groove mouth`, () => {
    const an = F.analyze(p);
    assert.equal(an.locked, true);
    assert(an.ridge > an.gapTrue + F.SLAB * 0.5, `ridge ${an.ridge} must clear the gap ${an.gapTrue}`);
    assert(an.up > 0 && an.down < 0, 'rings should have some play both ways');
    assert(an.play < 6, `play ${an.play} mm should feel like a click, not a slide`);
  });

  test(`${shape}: neighbouring rings keep a printable air gap at rest`, () => {
    const an = F.analyze(p);
    assert(an.clearance >= 0.45, `air gap ${an.clearance} mm is too tight to print in place`);
  });

  test(`${shape}: every ring is one closed, outward-facing shell and rings never touch`, () => {
    const tris = F.triangles(p), parts = shells(tris);
    assert.equal(parts.length, p.n, 'one separate shell per ring');
    for (const part of parts) {
      const edges = new Map();
      for (const t of part) for (let i = 0; i < 3; i++) {
        const a = key(t[i]), b = key(t[(i + 1) % 3]);
        edges.set(a + '>' + b, (edges.get(a + '>' + b) || 0) + 1);
      }
      for (const [e, n] of edges) {
        const [a, b] = e.split('>');
        assert.equal(n, 1, `edge ${e} used ${n} times`);
        assert.equal(edges.get(b + '>' + a), 1, `edge ${e} has no opposite twin`);
      }
      assert(signedVolume(part) > 0, 'facets should face outward');
    }
    // The meshed volume equals the slab-by-slab volume the Codeblocks program stacks.
    const meshed = signedVolume(tris);
    assert(Math.abs(meshed - F.volume(p)) / F.volume(p) < 1e-9, `${meshed} vs ${F.volume(p)}`);
  });

  test(`${shape}: in 3D the printed rings stay at least the reported gap apart`, () => {
    const three = { ...p, n: 3 };   // gaps repeat ring to ring; three rings keep the brute-force check quick
    const parts = shells(F.triangles(three));
    parts.sort((a, b) => Math.max(...a.map((t) => t[0][0] ** 2 + t[0][1] ** 2)) - Math.max(...b.map((t) => t[0][0] ** 2 + t[0][1] ** 2)));
    const an = F.analyze(three);
    let worst = Infinity;
    for (let r = 1; r < parts.length; r++) {
      const inner = parts[r - 1], outer = parts[r];
      for (const t of inner) {
        // vertices plus points along each edge, so edge-to-edge gaps are sampled too
        const samples = [];
        for (let i = 0; i < 3; i++) {
          const a = t[i], b = t[(i + 1) % 3];
          for (let s = 0; s < 4; s++) samples.push([a[0] + (b[0] - a[0]) * s / 4, a[1] + (b[1] - a[1]) * s / 4, a[2] + (b[2] - a[2]) * s / 4]);
        }
        for (const pt of samples) for (const q of outer) { const d = pointTriangle(pt, q[0], q[1], q[2]); if (d < worst) worst = d; }
      }
    }
    assert(worst >= an.clearance * 0.97, `closest approach ${worst} mm, expected about ${an.clearance}`);
  });

  test(`${shape}: lifting the outer ring hauls every ring up with it`, () => {
    const an = F.analyze(p);
    const z = F.lift(p, an, 100);
    assert.equal(z.length, p.n);
    for (let i = 1; i < z.length; i++) assert(z[i - 1] <= z[i], 'inner rings never rise above the ring holding them');
    assert(z[0] > 0, 'the innermost ring leaves the bed too');
    const low = F.lift(p, an, Math.abs(an.down) * 0.5);
    assert(low.every((v, i) => i === p.n - 1 || v === 0), 'inside the slack the others stay put');
  });
}

test('a ridge no deeper than the gap lets the rings slide apart (and the lab says so)', () => {
  const shallow = { ...F.DEFAULTS.round, k: 1 };
  assert.equal(F.analyze(shallow).locked, false);
  const wide = { ...F.DEFAULTS.round, g: 2.4 };
  assert.equal(F.analyze(wide).locked, false);
});

test('the old loose design really does fall apart: flat-walled rings never lock', () => {
  // k = 0 slabs climbing is a plain tube per ring; the same loop as the ring stack lab.
  const plain = { ...F.DEFAULTS.round, k: 0, flat: 6 };
  assert.equal(F.analyze(plain).locked, false);
});

test('star side factor matches the geometry', () => {
  assert(Math.abs(F.sideFactor('star') - 0.6986) < 1e-3);
  assert.equal(F.sideFactor('round'), 1);
  assert.equal(F.slabRun('star'), 0.7);
  assert.equal(F.slabRun('round'), 0.5);
});

test('binary STL header counts match the facets', () => {
  const p = F.DEFAULTS.star, buf = F.binaryStl(p), dv = new DataView(buf);
  assert.equal(dv.getUint32(80, true), F.triangles(p).length);
  assert.equal(buf.byteLength, 84 + dv.getUint32(80, true) * 50);
});
