// Marble Studio core (assets/js/sculpture/marble-core.mjs): the stone, tools, maquettes,
// pointing machine, autopilot and exports, run headless on a small block.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../assets/js/sculpture/marble-core.mjs';

const small = () => M.createStone({ h: 1.4 });

// Every edge of a closed, consistently wound mesh is used once in each direction.
function assertClosed(mesh) {
  const seen = new Map();
  const ix = mesh.index;
  for (let t = 0; t < ix.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = ix[t + e], b = ix[t + (e + 1) % 3];
    const k = a + ',' + b;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const [k, n] of seen) {
    const [a, b] = k.split(',');
    assert.equal(n, 1, `edge ${k} used ${n} times one way`);
    assert.equal(seen.get(b + ',' + a), 1, `edge ${k} has no partner`);
  }
}

function solidCount(s) {
  let n = 0;
  for (const v of s.density) if (v >= 128) n++;
  return n;
}

test('a fresh block meshes as one closed box', () => {
  const s = small();
  const m = M.meshRegion(s, 0, 0, 0, s.nx - 1, s.ny - 1, s.nz - 1);
  assert.ok(m.index.length > 0);
  assertClosed(m);
});

test('chunk meshes share their seams exactly', () => {
  const s = small();
  M.strike(s, M.TOOLS.point, [s.nx / 2, s.ny - 1.5, s.nz / 2], [0, -1, 0], [1, 0, 0], { random: M.rng(2), size: 3 });
  const whole = M.meshRegion(s, 0, 0, 0, s.nx - 1, s.ny - 1, s.nz - 1);
  let tris = 0;
  for (let cz = 0; cz < s.cz; cz++) for (let cy = 0; cy < s.cy; cy++) for (let cx = 0; cx < s.cx; cx++) {
    const m = M.meshRegion(s, cx * M.CHUNK, cy * M.CHUNK, cz * M.CHUNK, cx * M.CHUNK + M.CHUNK, cy * M.CHUNK + M.CHUNK, cz * M.CHUNK + M.CHUNK);
    if (m) tris += m.index.length / 3;
  }
  assert.equal(tris, whole.index.length / 3);
});

test('each tool removes stone, and undo puts it back', () => {
  for (const [name, tool] of Object.entries(M.TOOLS)) {
    if (tool.polish) continue;
    const s = M.createStone({ h: 1 });
    const before = s.density.slice();
    M.beginEdit(s);
    const hit = M.raycast(s, [s.nx / 2, s.ny / 2, s.nz + 30], [0, 0, -1]);
    assert.ok(hit, name + ' found the front face');
    for (let k = 0; k < 6; k++) M.strike(s, tool, hit.point, [0, 0, -1], [1, 0, 0], { random: M.rng(k + 1), size: 2 });
    const journal = M.endEdit(s);
    assert.ok(solidCount(s) <= before.filter(v => v >= 128).length, name);
    assert.notDeepEqual(s.density, before, name + ' changed the stone');
    M.restore(s, journal);
    assert.deepEqual(s.density, before, name + ' undo');
  }
});

test('polish only works on rasped stone', () => {
  const s = M.createStone({ h: 1 });
  const hit = M.raycast(s, [s.nx / 2, s.ny / 2, s.nz + 30], [0, 0, -1]);
  M.strike(s, M.TOOLS.point, hit.point, [0, 0, -1], [1, 0, 0], { random: M.rng(4), size: 2 });
  const cut = M.raycast(s, [s.nx / 2, s.ny / 2, s.nz + 30], [0, 0, -1]).point;
  const rough = M.strike(s, M.TOOLS.polish, cut, [0, 0, -1], [1, 0, 0]);
  assert.ok(rough.tooRough > 0 && rough.polished === 0);
  for (let k = 0; k < 30; k++) M.strike(s, M.TOOLS.rasp, cut, [0, 0, -1], [1, 0, 0], { size: 2 });
  const shiny = M.strike(s, M.TOOLS.polish, cut, [0, 0, -1], [1, 0, 0]);
  assert.ok(shiny.polished > 0);
});

test('a chisel struck toward a thin edge spalls it off', () => {
  const s = M.createStone({ h: 0.5 });
  // carve a deep slot from the front, leaving a thin wall at the right side
  const D = s.density;
  for (let z = 1; z < s.nz - 1; z++) for (let y = 1; y < s.ny - 1; y++) for (let x = s.nx - 6; x < s.nx - 3; x++) D[M.idx(s, x, y, z)] = 0;
  // now the last 2 voxels form a fin; strike it from the left side, through the fin
  const res = M.strike(s, M.TOOLS.point, [s.nx - 3.1, s.ny / 2, s.nz / 2], [1, 0, 0], [0, 0, 1], { random: M.rng(9) });
  assert.equal(res.spalled, true);
});

test('stone cut free of the base is found as a fallen piece', () => {
  const s = small();
  // cut a horizontal slot all the way through: everything above it is loose
  const y = Math.floor(s.ny / 2);
  for (let z = 0; z < s.nz; z++) for (let x = 0; x < s.nx; x++) s.density[M.idx(s, x, y, z)] = 0;
  const pieces = M.findDetached(s);
  assert.equal(pieces.length, 1);
  const above = (s.nx - 2) * (s.ny - 2 - y) * (s.nz - 2);
  assert.equal(pieces[0].length, above);
  const g = M.pieceGrid(s, pieces[0]);
  assert.deepEqual([g.nx, g.ny, g.nz], [s.nx, s.ny - y, s.nz]);
  assert.ok(M.meshRegion(g, 0, 0, 0, g.nx - 1, g.ny - 1, g.nz - 1), 'the piece can be drawn');
  M.removePiece(s, pieces[0]);
  assert.equal(M.findDetached(s).length, 0);
});

test('every maquette stands on the base, fits the block and is one piece', () => {
  for (const ref of M.REFERENCES) {
    const s = M.createStone({ h: 0.8 });
    const sd = M.referenceFromPreset(s, ref.id);
    const mask = new Uint8Array(sd.length);
    let n = 0, onBase = 0;
    for (let i = 0; i < sd.length; i++) if (sd[i] < 0) { mask[i] = 255; n++; }
    for (let z = 0; z < s.nz; z++) for (let x = 0; x < s.nx; x++) if (mask[M.idx(s, x, 1, z)]) onBase++;
    assert.ok(n > 2000, ref.id + ' has volume');
    assert.ok(onBase > 50, ref.id + ' sits on the base');
    // carve exactly to the reference: nothing may fall off
    s.density.set(mask);
    assert.equal(M.findDetached(s, 3).length, 0, ref.id + ' is one connected figure');
    // border layer stays air
    for (let z = 0; z < s.nz; z++) for (let y = 0; y < s.ny; y++) assert.equal(mask[M.idx(s, 0, y, z)], 0);
  }
});

test('the autopilot never cuts into the figure, and gets close to it', () => {
  const s = M.createStone({ h: 1.2 });
  const ref = M.referenceFromPreset(s, 'owl');
  const pts = M.pointingPoints(s, ref, 40);
  assert.ok(pts.length / 6 >= 30, 'pointing points spread over the figure');
  M.drillPoints(s, ref, pts, 1.5);
  const random = M.rng(5);
  for (const stage of M.STAGES.filter(st => st.id !== 'drill')) {
    const plan = M.planStage(s, ref, stage);
    for (const i of plan.queue) M.autoStep(s, ref, plan, i, random);
  }
  const m = M.measure(s, ref);
  assert.ok(m.kept > 0.97, 'kept ' + m.kept);
  assert.ok(m.roughedOut > 0.97, 'roughed out ' + m.roughedOut);
  assert.ok(m.likeness > 0.85, 'likeness ' + m.likeness);
  const depths = M.pointDepths(s, pts);
  for (const d of depths) assert.ok(d > -1.2 && d < 2.5, 'point depth ' + d);
});

test('likeness starts low on the raw block', () => {
  const s = M.createStone({ h: 1.2 });
  const ref = M.referenceFromPreset(s, 'bust');
  const m = M.measure(s, ref);
  assert.equal(m.roughedOut, 0);
  assert.equal(m.kept, 1);
  assert.ok(m.likeness < 0.6);
  assert.ok(Math.abs(m.massKg - 40 * 56 * 36 * 2.7 / 1000) < 12, 'block weighs about 218 kg');
});

test('front and side drawings make a block-out where both agree', () => {
  const s = M.createStone({ h: 1 });
  const front = new Uint8Array(s.nx * s.ny), side = new Uint8Array(s.nz * s.ny);
  for (let y = 1; y < 30; y++) for (let x = 10; x < 30; x++) front[x + s.nx * y] = 1;
  for (let y = 1; y < 40; y++) for (let z = 5; z < 20; z++) side[z + s.nz * y] = 1;
  const sd = M.referenceFromProfiles(s, front, side);
  assert.ok(sd[M.idx(s, 20, 15, 12)] < 0);
  assert.ok(sd[M.idx(s, 20, 35, 12)] > 0, 'above the front drawing');
  assert.ok(sd[M.idx(s, 5, 15, 12)] > 0, 'beside the front drawing');
  assert.ok(Math.abs(sd[M.idx(s, 20, 15, 25)] - 5.5) < 1.01, 'distance outside the side drawing');
});

test('STL: export, read back, and voxelize as a maquette', () => {
  const s = M.createStone({ h: 1.2 });
  const ref = M.referenceFromPreset(s, 'cat');
  for (let i = 0; i < ref.length; i++) s.density[i] = ref[i] < 0 ? 255 : 0;
  const buf = M.exportSTL(s, { heightMm: 90 });
  const tris = M.parseSTL(buf);
  let minZ = 1e9, maxZ = -1e9;
  for (let i = 2; i < tris.length; i += 3) { minZ = Math.min(minZ, tris[i]); maxZ = Math.max(maxZ, tris[i]); }
  assert.ok(Math.abs(minZ) < 1e-3 && Math.abs(maxZ - 90) < 1e-3, 'stands 90 mm tall on z = 0');
  const target = M.createStone({ h: 1.2 });
  const { mask } = M.voxelizeMesh(target, tris, { up: 'z' });
  let inter = 0, union = 0;
  for (let i = 0; i < mask.length; i++) {
    const a = mask[i] > 0, b = ref[i] < 0;
    if (a && b) inter++;
    if (a || b) union++;
  }
  // re-fitting scales the cat to fill the block, so compare loosely
  assert.ok(inter / union > 0.55, 'voxelized cat overlaps the original ' + (inter / union));
  const ascii = 'solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid t\n';
  assert.equal(M.parseSTL(new TextEncoder().encode(ascii).buffer).length, 9);
});

test('saving round-trips the carving exactly', () => {
  const s = M.createStone({ h: 1 });
  const hit = M.raycast(s, [s.nx / 2, s.ny + 40, s.nz / 2], [0, -1, 0]);
  for (let k = 0; k < 10; k++) M.strike(s, M.TOOLS.claw, hit.point, [0.2, -1, 0.1], [1, 0, 0], { random: M.rng(k), size: 2 });
  const saved = JSON.parse(JSON.stringify(M.encodeStone(s)));
  const t = M.createStone({ h: 1 });
  M.decodeInto(t, saved);
  assert.deepEqual(t.density, s.density);
  assert.deepEqual(t.finish, s.finish);
  assert.throws(() => M.decodeInto(M.createStone({ h: 1.4 }), saved));
});

test('raycast finds the near face and misses beside the block', () => {
  const s = small();
  const hit = M.raycast(s, [s.nx / 2, s.ny / 2, -50], [0, 0, 1]);
  assert.ok(Math.abs(hit.point[2] - 1) < 0.6, 'hit z ' + hit.point[2]);
  assert.ok(hit.normal[2] < -0.9, 'normal faces the ray');
  assert.equal(M.raycast(s, [-50, s.ny / 2, -50], [0, 0, 1]), null);
});
