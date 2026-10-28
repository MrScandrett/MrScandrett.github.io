import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, rings, checks, recipe, stl } from '../assets/js/lessons/codeblocks-rings.mjs';

test('presets have bed contact, real holes, exact gaps, and matching recipe dimensions', () => {
  for (const p of Object.values(PRESETS)) {
    assert.ok(checks(p).every(c => c.ok));
    const list = rings(p);
    assert.equal(list.length, p.n);
    for (const [k, g] of list.entries()) {
      assert.equal(g.z, 0);
      assert.ok(g.r >= 4);
      assert.ok(Math.abs(g.R - g.r - p.w) < 1e-9);
      if (k) assert.ok(Math.abs(list[k - 1].r - g.R - p.gap) < 1e-9);
      assert.ok(recipe(p).includes(`Ring ${k + 1}:`));
    }
  }
});

test('each STL preset is closed, consistently wound, and preserves dimensions and solid volume', () => {
  for (const p of Object.values(PRESETS)) {
    const mesh = stl(rings(p));
    const vertices = [...mesh.matchAll(/vertex ([^\n]+)/g)].map(m => m[1].split(' ').map(Number));
    assert.equal(vertices.length / 3, p.n * 64 * 8);
    const edges = new Map();
    let volume = 0;
    for (let i = 0; i < vertices.length; i += 3) {
      const [a,b,c] = vertices.slice(i,i+3);
      volume += (a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
      for (const [u,v] of [[a,b],[b,c],[c,a]]) {
        const x = u.join(','), y = v.join(','), key = [x,y].sort().join('|');
        const entry = edges.get(key) || [0,0];
        entry[0]++; entry[1] += x < y ? 1 : -1; edges.set(key, entry);
      }
    }
    for (const edge of edges.values()) assert.deepEqual(edge, [2,0]);
    assert.equal(Math.min(...vertices.map(v => v[2])), 0);
    assert.equal(Math.max(...vertices.map(v => v[2])), p.h);
    assert.equal(Math.max(...vertices.map(v => v[0])), p.r);
    const expected = rings(p).reduce((v,g) => v + 32*Math.sin(2*Math.PI/64)*(g.R*g.R-g.r*g.r)*g.h, 0);
    assert.ok(Math.abs(volume - expected) / expected < 0.00002);
  }
});

test('invalid dimensions are reported rather than skipped or repaired', () => {
  const bad = { ...PRESETS.quiet, n: 6, r: 12, w: 5 };
  assert.ok(checks(bad).some(c => !c.ok));
  assert.equal(rings(bad).length, 6);
  assert.throws(() => stl(rings(bad)), /Invalid/);
  assert.ok(checks({ ...PRESETS.quiet, gap: 0 }).some(c => !c.ok));
  assert.ok(checks({ ...PRESETS.quiet, r: NaN }).every(c => !c.ok));
});
