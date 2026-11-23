import assert from 'node:assert/strict';
import test from 'node:test';
import { THREE } from '../assets/vendor/three-bundle.min.js';
import { bounds, edgeReport, write3mf, writeBinaryStl, writeObj } from '../assets/js/fab-io.mjs';
import { readMesh, UNIT_MM } from '../assets/js/mesh-import.mjs';
import {
  POT_PRESETS, SCULPT_PRESETS, addCoil, brushClay, importClay, newPot, newSculpture,
  openClay, saveClay, shapePot,
} from '../assets/js/sculpture/clay-core.mjs';
import {
  clayGeometry, clayGlb, potGeometry, prepareClayExport, prepareClayImport, printableClay, readGlb,
} from '../assets/js/sculpture/clay-mesh.mjs';

function assertPrintable(geometry, height = 120) {
  const soup = printableClay(geometry, height);
  assert.ok(soup.length > 0);
  assert.ok(edgeReport(soup).watertight);
  assert.equal(bounds(soup).min[2], 0);
  assert.ok(Math.abs(bounds(soup).size[2] - height) < 0.0001);
  geometry.dispose();
  return soup;
}

test('all starting forms export as closed models on the print bed', () => {
  for (const id of Object.keys(POT_PRESETS)) assertPrintable(potGeometry(newPot(id).pot));
  for (const id of Object.keys(SCULPT_PRESETS)) assertPrintable(clayGeometry(newSculpture(id).field));
});

test('centering, throwing, coiling and a local pinch survive an editable save', () => {
  const project = newPot('lump');
  const { pot } = project;
  assert.ok(!pot.open && pot.wobble > 0);
  shapePot(pot, 'center', 0.5, 0, 0, 0.5);
  shapePot(pot, 'open', 0.5, 0, 0, 0.5);
  assert.ok(pot.open && pot.wobble === 0);
  const height = pot.height;
  shapePot(pot, 'pull', 0.6, 16, 20, 0.5);
  assert.ok(pot.height > height);
  assert.ok(addCoil(pot));
  const ridge = pot.coils[0].depth;
  shapePot(pot, 'pinch', pot.height, 20, 0, 0.5, Math.PI / 3);
  assert.ok(pot.pinches.length);
  shapePot(pot, 'rib', pot.height, 0, 0, 0.5);
  assert.ok(pot.coils[0].depth < ridge);
  project.stage = 3;
  assert.deepEqual(openClay(saveClay(project)), project);
  assertPrintable(potGeometry(pot), 110.4);
});

test('clay joins and loop cuts change the solid and reopen without data loss', () => {
  const project = newSculpture('bust');
  const { field } = project;
  const mass = () => field.reduce((sum, value) => sum + (value < 0 ? 1 : 0), 0);
  const initial = mass();
  assert.ok(brushClay(field, 'join', [0, 1.6, 0.5], [0, 0, 1], 0.39, 0.82));
  const added = mass();
  assert.ok(added > initial);
  assert.ok(brushClay(field, 'loop', [0, 1.6, 0.75], [0, 0, 1], 0.34, 0.78));
  assert.ok(mass() < added);
  assert.deepEqual(openClay(saveClay(project)), project);
  const geometry = clayGeometry(field);
  const { edges, refined } = prepareClayExport(geometry, 120, field);
  assert.ok(refined && edges.watertight);
  refined.dispose();
  geometry.dispose();
});

test('STL, OBJ and 3MF can return as editable clay at the exported height', async () => {
  const soup = assertPrintable(potGeometry(newPot('greek').pot));
  const body = { name: 'Greek neck jar', positions: soup };
  const inputs = [
    ['jar.stl', writeBinaryStl(soup)],
    ['jar.obj', new TextEncoder().encode(writeObj([body]))],
    ['jar.3mf', write3mf([body])],
  ];
  for (const [name, data] of inputs) {
    const mesh = await readMesh(data, name);
    const imported = prepareClayImport({ positions: mesh.positions, up: 'z', mm: UNIT_MM[mesh.units.unit] });
    assert.ok(Math.abs(imported.heightMm - 120) < 0.01, name);
    const editable = importClay(imported.positions);
    const geometry = clayGeometry(editable.field);
    assert.ok(geometry.attributes.position.count > 100, name);
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    const ray = new THREE.Raycaster(new THREE.Vector3(0.02, max.y + 1, 0.02), new THREE.Vector3(0, -1, 0));
    const material = new THREE.MeshBasicMaterial();
    const hit = ray.intersectObject(new THREE.Mesh(geometry, material))[0];
    assert.ok(hit && hit.point.y < min.y + (max.y - min.y) * 0.2, 'The reimported jar must have a hollow interior.');
    material.dispose();
    const { edges, refined } = prepareClayExport(geometry, 120, editable.field);
    assert.ok(edges.watertight, name);
    refined?.dispose();
    geometry.dispose();
  }
});

test('GLB preserves scene height and can return as editable clay', async t => {
  const previous = globalThis.FileReader;
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(result => {
        this.result = result;
        this.onloadend();
      });
    }
  };
  t.after(() => {
    if (previous) globalThis.FileReader = previous;
    else delete globalThis.FileReader;
  });
  const geometry = potGeometry(newPot('moon').pot);
  const material = new THREE.MeshStandardMaterial({ color: 0xe4d1ba, roughness: 0.24 });
  const glb = await clayGlb(geometry, material, 103.2, 'Moon jar');
  const input = await readGlb(glb);
  const imported = prepareClayImport(input);
  assert.ok(Math.abs(imported.heightMm - 103.2) < 0.001);
  assert.ok(clayGeometry(importClay(imported.positions, input.up).field));
  geometry.dispose();
  material.dispose();
});
