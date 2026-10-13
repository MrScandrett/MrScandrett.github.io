// Canonical unit-radius Earth, using EarthEngine's coordinate/texture convention.
// +Y north, +X longitude 0, -Z longitude 90E. glTF UV origin is top-left.
import fs from 'node:fs/promises';
import { Document, NodeIO } from '@gltf-transform/core';
import { SphereGeometry } from 'three';
const geometry = new SphereGeometry(1, 96, 48);
const doc = new Document();
const buffer = doc.createBuffer();
const attr = (name, type, array) => doc.createAccessor(name).setType(type).setArray(array).setBuffer(buffer);
const uv = geometry.attributes.uv.array.slice();
for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i];
const texture = doc.createTexture('NASA Blue Marble historical composite')
  .setMimeType('image/jpeg').setImage(await fs.readFile('assets/textures/earth/blue-marble.jpg'));
const material = doc.createMaterial('Earth surface').setBaseColorTexture(texture).setMetallicFactor(0).setRoughnessFactor(1);
const primitive = doc.createPrimitive().setMaterial(material)
  .setAttribute('POSITION', attr('POSITION', 'VEC3', geometry.attributes.position.array))
  .setAttribute('NORMAL', attr('NORMAL', 'VEC3', geometry.attributes.normal.array))
  .setAttribute('TEXCOORD_0', attr('TEXCOORD_0', 'VEC2', uv))
  .setIndices(attr('indices', 'SCALAR', geometry.index.array));
const node = doc.createNode('Earth · north +Y · prime meridian +X').setMesh(doc.createMesh('Earth').addPrimitive(primitive));
doc.createScene('Earth').addChild(node);
doc.getRoot().setExtras({ source: 'NASA Earth Observatory / Goddard, Blue Marble', license: 'Public domain', generatedBy: 'scripts/build-earth-model.mjs', radius: 1, coordinates: 'EarthEngine: north +Y, longitude 0 +X, east -Z', limits: 'Historical satellite composite, spherical Earth, not live weather or survey geometry.' });
await new NodeIO().write('assets/models/earth.glb', doc);
console.log('Built canonical Earth GLB from the shared NASA surface texture.');
