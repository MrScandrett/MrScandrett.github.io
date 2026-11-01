// Mesh Inspector model (lessons/3d-design/foundations/what-is-a-3d-model.html).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../assets/js/lessons/what-is-a-3d-model.mesh.mjs';

test('every preset shape is watertight with the expected Euler characteristic', () => {
  for (const id of Object.keys(M.SHAPES)) {
    const a = M.analyze(M.buildShape(id));
    assert.ok(a.watertight, id);
    assert.ok(a.volume > 0, `${id} has outward normals`);
    assert.equal(a.euler, id === 'frame' ? 0 : 2, id);
  }
});

test('every repair puzzle starts broken and can be repaired with the four tools', () => {
  for (const level of [1, 2, 3]) {
    for (let seed = 1; seed <= 99; seed++) {
      const p = M.makePuzzle(seed, level);
      let m = p.mesh;
      assert.ok(!M.analyze(m).watertight, `puzzle ${seed}/${level} starts broken`);
      for (let guard = 0; guard < 20; guard++) {
        const a = M.analyze(m);
        if (a.watertight) break;
        if (a.gaps.length) { const r = M.weldVertex(m, a.gaps[0][1]); assert.ok(r.ok); m = r.mesh; continue; }
        const stray = p.faults.find(f => f.type === 'stray');
        if (a.nonManifold.length && stray) {
          const fi = m.f.findIndex(f => f.length === 3 && stray.verts.every(v => f.includes(v)));
          m = M.deleteFace(m, fi); continue;
        }
        if (a.open.length) { const r = M.fillHole(m, a.open[0]); assert.ok(r.ok, r.msg); m = r.mesh; continue; }
        if (a.flipped.length) { m = M.flipFace(m, a.flipped[0]); continue; }
      }
      const fin = M.analyze(m);
      assert.ok(fin.watertight, `puzzle ${seed}/${level} repaired`);
      assert.ok(Math.abs(fin.volume - M.analyze(p.original).volume) < 1e-6, `puzzle ${seed}/${level} keeps its volume`);
    }
  }
});

test('facet helpers', () => {
  assert.ok(Math.abs(M.chordSag(10, 32) - 0.048) < 0.001);
  assert.equal(M.cylinderTriangles(12), 44);
  assert.equal(M.binaryStlBytes(12), 684);
});
