import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { bounds, edgeReport, signedVolume, write3mf, writeBinaryStl, writeObj } from '../assets/js/fab-io.mjs';
import { MeshImportError, guessUnits, readMesh, sniffFormat, toMillimetres } from '../assets/js/mesh-import.mjs';
import { extrude } from '../assets/js/print-orient.mjs';

const enc = new TextEncoder();
const close = (a, b, eps = 1e-4) => Math.abs(a - b) <= eps;
const box = (w, h, d) => extrude([[0, 0], [w, 0], [w, h], [0, h]], d);

function asciiStl(positions, name = 'cube') {
  const lines = [`solid ${name}`];
  for (let i = 0; i < positions.length; i += 9) {
    lines.push('  facet normal 0 0 0', '    outer loop');
    for (let c = 0; c < 3; c++) lines.push(`      vertex ${positions[i + c * 3]} ${positions[i + c * 3 + 1]} ${positions[i + c * 3 + 2]}`);
    lines.push('    endloop', '  endfacet');
  }
  lines.push(`endsolid ${name}`);
  return enc.encode(lines.join('\n'));
}

/* A ZIP whose entries are deflated, as real slicers write them. */
function deflatedZip(files) {
  const parts = [], central = [];
  let o = 0;
  for (const { name, data } of files) {
    const raw = enc.encode(data), packed = deflateRawSync(raw), n = enc.encode(name);
    const local = new Uint8Array(30 + n.length + packed.length), v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(8, 8, true); v.setUint32(18, packed.length, true); v.setUint32(22, raw.length, true); v.setUint16(26, n.length, true);
    local.set(n, 30); local.set(packed, 30 + n.length);
    const cd = new Uint8Array(46 + n.length), w = new DataView(cd.buffer);
    w.setUint32(0, 0x02014b50, true); w.setUint16(10, 8, true); w.setUint32(20, packed.length, true); w.setUint32(24, raw.length, true); w.setUint16(28, n.length, true); w.setUint32(42, o, true);
    cd.set(n, 46);
    parts.push(local); central.push(cd); o += local.length;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, o, true);
  const out = new Uint8Array(o + cdSize + 22);
  let p = 0;
  for (const c of [...parts, ...central, end]) { out.set(c, p); p += c.length; }
  return out;
}

test('binary STL reads back exactly, even with a header that says "solid"', async () => {
  const b = box(10, 20, 30);
  const buf = new Uint8Array(writeBinaryStl(b, 'solid fooled you'));
  assert.equal(sniffFormat(buf, 'part.bin'), 'stl');
  const r = await readMesh(buf, 'part.stl');
  assert.equal(r.format, 'stl');
  assert.equal(r.triangles, 12);
  assert.deepEqual(Array.from(r.positions), Array.from(b));
  assert.equal(r.units.unit, 'mm');
});

test('ASCII STL with two solids keeps both as parts', async () => {
  const a = asciiStl(box(10, 10, 10), 'left');
  const b = asciiStl(box(5, 5, 5), 'right');
  const both = new Uint8Array([...a, 10, ...b]);
  const r = await readMesh(both, 'pair.stl');
  assert.equal(r.triangles, 24);
  assert.deepEqual(r.parts.map((p) => [p.name, p.count]), [['left', 12], ['right', 12]]);
});

test('OBJ: quads are fanned, negative indices work, Y up becomes Z up', async () => {
  const text = [
    '# a 10 × 20 × 30 box, Y up', 'o Crate',
    'v 0 0 0', 'v 10 0 0', 'v 10 0 -30', 'v 0 0 -30', 'v 0 20 0', 'v 10 20 0', 'v 10 20 -30', 'v 0 20 -30',
    'vn 0 1 0', 'vt 0 0',
    'f 1/1/1 4/1/1 3/1/1 2/1/1', 'f 5 6 7 8', 'f 1 2 6 5', 'f 2 3 7 6', 'f 3 4 8 7', 'f -8 -4 -1 -5',
  ].join('\n');
  const r = await readMesh(enc.encode(text), 'crate.obj');
  assert.equal(r.format, 'obj');
  assert.equal(r.triangles, 12);
  assert.deepEqual(r.parts.map((p) => p.name), ['Crate']);
  const { size } = bounds(r.positions);
  assert.ok(close(size[0], 10) && close(size[1], 30) && close(size[2], 20), `size ${size}`);
  assert.equal(edgeReport(r.positions).watertight, true);
  assert.ok(signedVolume(r.positions) > 0, 'still wound outward after turning Z up');
});

test('our own OBJ export (metres, Y up) round-trips to the same millimetre part', async () => {
  const b = box(40, 20, 10);
  const r = await readMesh(enc.encode(writeObj([{ name: 'Block', positions: b }])), 'block.obj');
  assert.equal(r.units.unit, 'm');
  assert.equal(r.units.certain, true);
  const mm = toMillimetres(r.positions, r.units.unit);
  bounds(mm).size.forEach((v, k) => assert.ok(close(v, [40, 20, 10][k], 1e-3)));
});

test('3MF round trip: write3mf → readMesh keeps every part, in millimetres', async () => {
  const bodies = [{ name: 'Base & lid', positions: box(30, 20, 5) }, { name: 'Peg', positions: box(4, 4, 12) }];
  const file = write3mf(bodies, { title: 'Test <set>' });
  assert.equal(sniffFormat(file), '3mf');
  const r = await readMesh(file, 'set.3mf');
  assert.equal(r.format, '3mf');
  assert.equal(r.units.unit, 'mm');
  assert.deepEqual(r.parts.map((p) => [p.name, p.count]), [['Base & lid', 12], ['Peg', 12]]);
  assert.ok(close(signedVolume(r.positions), 3000 + 192, 1e-2));
  assert.equal(edgeReport(r.positions).watertight, true);
});

test('3MF from a slicer: deflated, inch units, components in another file, build transforms', async () => {
  const cube = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<vertex x="${i & 1}" y="${(i >> 1) & 1}" z="${(i >> 2) & 1}"/>`).join('');
  const tris = [[0, 2, 3], [0, 3, 1], [4, 5, 7], [4, 7, 6], [0, 1, 5], [0, 5, 4], [2, 6, 7], [2, 7, 3], [1, 3, 7], [1, 7, 5], [0, 4, 6], [0, 6, 2]]
    .map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join('');
  const objectFile = `<?xml version="1.0"?><model unit="inch" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>${cube}</vertices><triangles>${tris}</triangles></mesh></object></resources><build/></model>`;
  const root = `<?xml version="1.0"?><model unit="inch" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06">
    <resources><object id="2" name="Two cubes" type="model"><components>
      <component p:path="/3D/Objects/object_1.model" objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
      <component p:path="/3D/Objects/object_1.model" objectid="1" transform="2 0 0 0 1 0 0 0 1 3 0 0"/>
    </components></object>
    <object id="9" type="support"><mesh><vertices>${cube}</vertices><triangles>${tris}</triangles></mesh></object></resources>
    <build><item objectid="2" transform="1 0 0 0 1 0 0 0 1 10 10 0"/><item objectid="9"/></build></model>`;
  const rels = '<Relationships><Relationship Target="/3D/3dmodel.model" Id="r0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>';
  const file = deflatedZip([
    { name: '[Content_Types].xml', data: '<Types/>' },
    { name: '_rels/.rels', data: rels },
    { name: '3D/3dmodel.model', data: root },
    { name: '3D/Objects/object_1.model', data: objectFile },
  ]);
  const r = await readMesh(file, 'bambu.3mf');
  assert.equal(r.units.unit, 'in');
  assert.equal(r.triangles, 24, 'two cubes; the support object is skipped');
  const { min, max } = bounds(r.positions);
  assert.deepEqual([min[0], max[0]], [10, 15]); // second cube: scaled ×2, moved 3, then the item moves 10
  assert.ok(close(signedVolume(r.positions), 1 + 2, 1e-6));
  const mm = toMillimetres(r.positions, r.units.unit);
  assert.ok(close(bounds(mm).size[0], 5 * 25.4, 1e-3));
});

test('units: tiny STL and OBJ files are read as metres, ordinary ones as millimetres', () => {
  assert.equal(guessUnits(box(0.05, 0.02, 0.01), 'stl').unit, 'm');
  assert.equal(guessUnits(box(40, 20, 10), 'stl').unit, 'mm');
  assert.equal(guessUnits(box(1.5, 1, 1), 'stl').certain, false);
});

test('broken files fail with a sentence a student can act on', async () => {
  await assert.rejects(readMesh(new Uint8Array(0), 'x.stl'), /empty/);
  await assert.rejects(readMesh(enc.encode('hello there'), 'notes.txt'), /STL, OBJ and 3MF/);
  await assert.rejects(readMesh(enc.encode('v 0 0 0\nv 1 0 0\nv 0 1 0\n'), 'points.obj'), /no faces/);
  await assert.rejects(readMesh(enc.encode('PK\u0003\u0004 not really a zip'), 'bad.3mf'), MeshImportError);
});

test('zero-area triangles are dropped and reported', async () => {
  const b = box(10, 10, 10);
  const withJunk = Float32Array.from([...b, 1, 1, 1, 1, 1, 1, 2, 2, 2]);
  const r = await readMesh(new Uint8Array(writeBinaryStl(withJunk)), 'junk.stl');
  assert.equal(r.triangles, 12);
  assert.ok(r.warnings.some((w) => /removed/.test(w)));
});
