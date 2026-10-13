import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { NodeIO } from '@gltf-transform/core';

const context = { URL, console, document: { currentScript: { src: 'https://example.org/assets/js/earth-engine.js' } } };
context.window = context;
vm.createContext(context);
for (const file of ['assets/vendor/d3-geo-runtime.min.js', 'assets/vendor/d3-geo-projection.min.js', 'assets/geodata/world/world-data.js', 'assets/js/earth-engine.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
}
const E = context.EarthEngine, d3 = context.d3;

test('geography includes real continental landmarks and excludes deep ocean', () => {
  for (const location of [[2.35, 48.86], [-87.63, 41.88], [133.88, -23.7], [77.21, 28.61], [0, -85], [-40, 73]]) {
    assert.equal(d3.geoContains(E.data().land, location), true, `Missing land at ${location}`);
  }
  for (const location of [[-140, 0], [-30, 0], [80, -30]]) {
    assert.equal(d3.geoContains(E.data().land, location), false, `Invented land at ${location}`);
  }
});

test('all geographic polygons are closed and represent the small spherical region', () => {
  for (const collection of [E.data().land, E.data().countries]) {
    for (const f of collection.features) {
      assert(d3.geoArea(f) < 2 * Math.PI);
      const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const rings of polygons) for (const ring of rings) {
        assert.deepEqual(ring[0], ring.at(-1));
        assert(ring.length >= 4);
      }
    }
  }
});

test('globe coordinates and UVs place north and east on the correct axes', () => {
  const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-6);
  close(E.lonLatToVector(0, 0).x, 1);
  close(E.lonLatToVector(90, 0).z, -1);
  close(E.lonLatToVector(0, 90).y, 1);
  close(E.lonLatToUV(0, 90).v, 0);
  close(E.lonLatToUV(0, -90).v, 1);
  for (const [lon, lat] of [[-74, 40.71], [151.21, -33.87], [179.8, 55], [-179.8, -55]]) {
    const roundTrip = E.vectorToLonLat(E.lonLatToVector(lon, lat));
    close(roundTrip[0], lon); close(roundTrip[1], lat);
  }
  assert.throws(() => E.projection('invented'), /Unknown/);
  assert.throws(() => E.lonLatToVector(0, 100), /latitude/);
});

test('orthographic visibility clips the far hemisphere; all map families produce finite paths', () => {
  const globe = E.projection('globe', { rotate: [0, 0] });
  assert.equal(E.visible(globe, [0, 0]), true);
  assert.equal(E.visible(globe, [180, 0]), false);
  for (const name of ['globe', 'equirectangular', 'mercator', 'peters', 'robinson', 'conic', 'azimuthal', 'natural-earth']) {
    const p = E.projection(name), path = E.path(p, E.data().land);
    assert(path.length > 1000);
    assert(!/NaN|Infinity/.test(path));
  }
});

test('every Pangaea frame declares its actual age and model and keeps valid spherical land', () => {
  for (const t of E.reconstruction.agesMa) {
    const data = JSON.parse(fs.readFileSync(`assets/geodata/pangaea/coastlines_${t}ma_simple.json`, 'utf8'));
    assert.equal(data.reconstruction.timeMa, t);
    assert.equal(data.reconstruction.model, 'MULLER2019');
    assert(data.features.length > 1000);
    for (const f of data.features) assert(d3.geoArea(f) < 2 * Math.PI, `Inverted land at ${t} Ma`);
  }
  assert.equal(E.reconstruction.nearestAge(125), 130);
  assert.equal(E.reconstruction.nearestAge(0), 0);
  assert.equal(E.reconstruction.nearestAge(240), 240);
});

test('shared GLB UVs match the engine geographic coordinate convention', async () => {
  const doc = await new NodeIO().read('assets/models/earth.glb');
  const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const position = primitive.getAttribute('POSITION'), uv = primitive.getAttribute('TEXCOORD_0');
  for (let i = 0; i < position.getCount(); i += 13) {
    const [x, y, z] = position.getElement(i, []);
    if (Math.abs(y) > .999) continue; // poles have arbitrary longitude
    const [lon, lat] = E.vectorToLonLat({ x, y, z });
    const expected = E.lonLatToUV(lon, lat), actual = uv.getElement(i, []);
    assert(Math.min(Math.abs(actual[0] - expected.u), Math.abs(actual[0] - expected.u + 1), Math.abs(actual[0] - expected.u - 1)) < 1e-5);
    assert(Math.abs(actual[1] - expected.v) < 1e-5);
  }
});
