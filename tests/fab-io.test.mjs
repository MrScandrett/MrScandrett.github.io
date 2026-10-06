import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRINTERS, bounds, cleanTriangles, edgeReport, orientOutward, placeOnBed,
  prepareForPrint, printerFit, readBinaryStl, signedVolume, writeBinaryStl, yUpToZUp,
} from '../assets/js/fab-io.mjs';

/* An axis-aligned box as triangle soup, faces wound outward. */
function box(w, h, d) {
  const v = [[0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0], [0, 0, d], [w, 0, d], [w, h, d], [0, h, d]];
  const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]];
  const out = [];
  for (const [a, b, c, e] of faces) for (const i of [a, b, c, a, c, e]) out.push(...v[i]);
  return Float32Array.from(out);
}

test('a closed box has its real volume and passes the edge check', () => {
  const b = box(10, 20, 30);
  assert.ok(Math.abs(signedVolume(b) - 6000) < 1e-6);
  assert.deepEqual(edgeReport(b), { watertight: true, openEdges: 0, overusedEdges: 0, flippedEdges: 0, vertices: 8 });
});

test('inside-out meshes are detected and turned the right way out', () => {
  const b = box(5, 5, 5);
  const flipped = Float32Array.from(b);
  for (let i = 0; i < flipped.length; i += 9) for (let k = 0; k < 3; k++) [flipped[i + 3 + k], flipped[i + 6 + k]] = [flipped[i + 6 + k], flipped[i + 3 + k]];
  assert.ok(signedVolume(flipped) < 0);
  assert.ok(Math.abs(signedVolume(orientOutward(flipped)) - 125) < 1e-6);
});

test('edge check finds a hole and a single flipped face', () => {
  const b = box(4, 4, 4);
  assert.equal(edgeReport(b.slice(9)).openEdges, 3, 'one missing triangle leaves three open edges');
  const one = Float32Array.from(b);
  for (let k = 0; k < 3; k++) [one[3 + k], one[6 + k]] = [one[6 + k], one[3 + k]];
  const report = edgeReport(one);
  assert.equal(report.watertight, false);
  assert.ok(report.flippedEdges > 0);
});

test('Y-up to Z-up is a rotation: volume and winding survive, height moves to Z', () => {
  const tall = box(10, 50, 20);
  const z = yUpToZUp(tall);
  assert.ok(Math.abs(signedVolume(z) - 10000) < 1e-3);
  assert.deepEqual(bounds(placeOnBed(z)).size.map(Math.round), [10, 20, 50]);
});

test('zero-area triangles are dropped', () => {
  const b = box(1, 1, 1);
  const withSliver = Float32Array.from([...b, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  assert.equal(cleanTriangles(withSliver).length, b.length);
});

test('prepareForPrint centres the part on the bed', () => {
  const p = prepareForPrint(box(10, 40, 20).map(v => v - 100));
  const { min, max } = bounds(p);
  assert.ok(Math.abs(min[2]) < 1e-6, 'sits on Z = 0');
  assert.ok(Math.abs(min[0] + max[0]) < 1e-6 && Math.abs(min[1] + max[1]) < 1e-6, 'centred on X/Y');
  assert.ok(Math.abs(max[2] - 40) < 1e-4, 'Y-up height became Z');
});

test('binary STL round-trips and has the right size and header', () => {
  const b = box(3, 4, 5);
  const buffer = writeBinaryStl(b, 'test part');
  assert.equal(buffer.byteLength, 84 + 12 * 50);
  assert.equal(new TextDecoder().decode(new Uint8Array(buffer, 0, 9)), 'test part');
  assert.deepEqual(Array.from(readBinaryStl(buffer)), Array.from(b));
});

test('MakerBot Sketch Large fit, including turning a part 90° on the bed', () => {
  const sketch = PRINTERS['makerbot-sketch-large'];
  assert.deepEqual(sketch.build, { x: 260, y: 160, z: 230 });
  assert.equal(printerFit([100, 100, 100]).fits, true);
  const turned = printerFit([150, 250, 50]);
  assert.equal(turned.fits, true);
  assert.equal(turned.turned, true);
  const tall = printerFit([50, 50, 240]);
  assert.equal(tall.fits, false);
  assert.deepEqual(tall.overBy, [0, 0, 10]);
});

test('GLB is valid glTF 2.0 in Y-up metres with one named node per body', async () => {
  const { writeGlb } = await import('../assets/js/fab-io.mjs');
  const glb = writeGlb([{ name: 'Case', positions: box(10, 20, 30), color: '#ff0000' }, { name: 'Lid', positions: box(5, 5, 5) }]);
  const view = new DataView(glb);
  assert.equal(view.getUint32(0, true), 0x46546c67);
  assert.equal(view.getUint32(8, true), glb.byteLength);
  assert.equal(glb.byteLength % 4, 0);
  const jsonLen = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, jsonLen)));
  assert.deepEqual(json.nodes.map((n) => n.name), ['Case', 'Lid']);
  const pos = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
  assert.equal(pos.count, 36);
  assert.deepEqual(pos.max.map((v) => +v.toFixed(4)), [0.01, 0.03, 0], 'Z-up 30 mm height became Y = 0.03 m');
  assert.ok(Math.abs(json.materials[0].pbrMetallicRoughness.baseColorFactor[0] - 1) < 1e-9);
  const binLen = view.getUint32(20 + jsonLen, true);
  assert.equal(binLen, json.buffers[0].byteLength);
});

test('OBJ shares vertices and numbers faces across objects', async () => {
  const { writeObj } = await import('../assets/js/fab-io.mjs');
  const text = writeObj([{ name: 'Gear A', positions: box(1, 1, 1) }, { name: 'B', positions: box(1, 1, 1) }]);
  const lines = text.trim().split('\n');
  assert.equal(lines.filter((l) => l.startsWith('v ')).length, 16);
  assert.equal(lines.filter((l) => l.startsWith('f ')).length, 24);
  assert.ok(lines.includes('o Gear_A'));
  const maxIndex = Math.max(...lines.filter((l) => l.startsWith('f ')).flatMap((l) => l.slice(2).split(' ').map(Number)));
  assert.equal(maxIndex, 16);
});
