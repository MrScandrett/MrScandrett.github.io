import test from 'node:test';
import assert from 'node:assert/strict';
import {
  transformImageData,
  segmentImage,
  carveVolume,
  volumeToMesh,
  volumeToBrickGrid,
  computeOrientationMatrix,
  applyOrientationToMesh,
  defaultDotsForMesh,
  encodeColoredGlb,
  encodeStl,
  bytesToDataUrl,
} from '../assets/js/scan3d/core.mjs';
import { edgeReport, signedVolume, readBinaryStl } from '../assets/js/fab-io.mjs';
import { W, L, H, PALETTE, hexToRgb } from '../assets/js/brick-rally/car-model.mjs';

function makePhoto(w, h, bg, draw) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = draw(x, y) || bg;
      const i = (y * w + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

test('transformImageData rotates 90° CW and flips horizontally', () => {
  const img = makePhoto(4, 2, [0, 0, 0], (x, y) => (x === 0 && y === 0 ? [255, 0, 0] : [10, 20, 30]));
  const r90 = transformImageData(img, { rotate: 90 });
  assert.equal(r90.width, 2);
  assert.equal(r90.height, 4);
  // (0,0) rotated 90° CW moves to (w_out - 1, 0) = (1, 0)
  const p = (0 * r90.width + 1) * 4;
  assert.equal(r90.data[p], 255);

  const fl = transformImageData(img, { flipX: true });
  const fp = (0 * fl.width + 3) * 4;
  assert.equal(fl.data[fp], 255);
});

test('segmentImage flood-fill preserves white interior detail on a white background', () => {
  const white = [245, 245, 245];
  const img = makePhoto(100, 80, white, (x, y) => {
    // Red box with a white window inside
    if (x >= 20 && x <= 80 && y >= 20 && y <= 60) {
      if (x >= 40 && x <= 55 && y >= 30 && y <= 45) return white;
      return [210, 30, 20];
    }
    return null;
  });
  const seg = segmentImage(img, { floodFill: true, fillHoles: true });
  assert.ok(seg);
  // Interior white pixel at (47, 37) must remain foreground (mask = 1)
  assert.equal(seg.mask[37 * 100 + 47], 1);
  // Exterior background pixel at (5, 5) must be 0
  assert.equal(seg.mask[5 * 100 + 5], 0);
});

test('segmentImage supports eyedropper bgColor and rejects blank photos', () => {
  const green = [40, 180, 60];
  const img = makePhoto(80, 80, green, (x, y) => (x > 20 && x < 60 && y > 20 && y < 60 ? [230, 120, 30] : null));
  const seg = segmentImage(img, { bgColor: [green] });
  assert.ok(seg);
  assert.ok(seg.bbox.x0 >= 20 && seg.bbox.x1 <= 60);

  const blank = makePhoto(60, 60, [200, 200, 200], () => null);
  assert.equal(segmentImage(blank), null);
});

test('carveVolume single-view rounded profile produces tapered 3D fish volume', () => {
  const bg = [240, 240, 240];
  const side = makePhoto(160, 100, bg, (x, y) => {
    const dx = (x - 80) / 55;
    const dy = (y - 50) / 28;
    if (dx * dx + dy * dy <= 1) return [30, 140, 230];
    return null;
  });
  const vol = carveVolume({ side }, { maxDim: 24, profile: 'rounded' });
  assert.equal(vol.singleViewProfile, 'rounded');
  assert.ok(vol.voxelCount > 100);
  // Center slice in Z should be thicker in X than nose/tail tip
  const countAtZ = (z) => {
    let n = 0;
    for (let y = 0; y < vol.ny; y++) {
      for (let x = 0; x < vol.nx; x++) {
        if (vol.occ[x + vol.nx * (z + vol.nz * y)]) n++;
      }
    }
    return n;
  };
  assert.ok(countAtZ(Math.floor(vol.nz / 2)) > countAtZ(1));
});

test('carveVolume 360° turntable reconstruction builds a solid 3D hull', () => {
  const bg = [240, 240, 240];
  // A 3D ellipsoid with semi-axes (rx=0.25, ry=0.35, rz=0.45) viewed at 8 angles
  const rx = 0.25, ry = 0.35, rz = 0.45;
  const shots = [];
  for (let i = 0; i < 8; i++) {
    const angleDeg = i * 45;
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const halfU = Math.hypot(rz * cos, rx * sin);
    const img = makePhoto(100, 100, bg, (x, y) => {
      const u = ((x - 50) / 36) * halfU;
      const v = (y - 50) / 36;
      if ((u / halfU) ** 2 + (v / ry) ** 2 <= 1) {
        return angleDeg === 0 ? [220, 40, 40] : [200, 90, 40];
      }
      return null;
    });
    shots.push({ angleDeg, img });
  }
  const vol = carveVolume(shots, { maxDim: 24 });
  assert.equal(vol.mode, 'turntable');
  assert.equal(vol.viewsUsed.length, 8);
  assert.ok(vol.voxelCount > 400);

  const brickPal = PALETTE.map(p => (p ? hexToRgb(p.hex).map(v => v * 255) : null));
  const cells = volumeToBrickGrid(vol, { W, L, H, paletteRgb: brickPal, skipPaletteIndices: [15] });
  assert.equal(cells.length, W * L * H);
  assert.ok(cells.some(c => c > 0));
});

test('volumeToMesh produces watertight, outward-wound smooth mesh + valid GLB & STL', () => {
  const bg = [245, 245, 245];
  const side = makePhoto(120, 80, bg, (x, y) => (x > 18 && x < 102 && y > 18 && y < 62 ? [255, 110, 40] : null));
  const front = makePhoto(80, 80, bg, (x, y) => (x > 20 && x < 60 && y > 18 && y < 62 ? [255, 110, 40] : null));
  const vol = carveVolume({ side, front }, { maxDim: 24 });

  const mesh = volumeToMesh(vol, { style: 'smooth', forwardAxis: '+x', targetSize: 1.0 });
  assert.ok(mesh.vertexCount > 40);
  assert.ok(mesh.triangleCount > 60);
  assert.equal(mesh.positions.length, mesh.vertexCount * 3);
  assert.equal(mesh.normals.length, mesh.vertexCount * 3);
  assert.equal(mesh.colors.length, mesh.vertexCount * 3);

  // Expand indexed mesh to triangle soup for fab-io watertight & signedVolume checks
  const soup = new Float32Array(mesh.indices.length * 3);
  for (let i = 0; i < mesh.indices.length; i++) {
    const vi = mesh.indices[i] * 3;
    soup[i * 3] = mesh.positions[vi];
    soup[i * 3 + 1] = mesh.positions[vi + 1];
    soup[i * 3 + 2] = mesh.positions[vi + 2];
  }
  const rep = edgeReport(soup, 1e-4);
  assert.equal(rep.watertight, true, `expected watertight mesh, got ${JSON.stringify(rep)}`);
  assert.ok(signedVolume(soup) > 0, 'surface should wind outward');

  // Binary GLB verification
  const glb = encodeColoredGlb(mesh, { name: 'TestFish' });
  const glbView = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  assert.equal(glbView.getUint32(0, true), 0x46546c67); // 'glTF'
  assert.equal(glbView.getUint32(4, true), 2);
  assert.equal(glbView.getUint32(8, true), glb.byteLength);
  const jsonLen = glbView.getUint32(12, true);
  assert.equal(jsonLen % 4, 0);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLen)));
  assert.ok(json.meshes[0].primitives[0].attributes.COLOR_0 !== undefined);
  assert.ok(glb.byteLength < 500_000, 'scanned GLB stays compact for Firebase');
  assert.ok(bytesToDataUrl(glb).startsWith('data:model/gltf-binary;base64,'));

  // Binary STL round-trip
  const stl = encodeStl(mesh, { sizeMm: 75 });
  const stlSoup = readBinaryStl(stl.buffer);
  assert.equal(stlSoup.length / 9, mesh.triangleCount);
});

test('orientation dots align +X (fish) and +Z (car) accurately', () => {
  const mFish = computeOrientationMatrix({
    head: [0, 0, 1],
    tail: [0, 0, -1],
    back: [0, 1, 0],
  }, { forwardAxis: '+x' });
  // (0, 0, 1) -> (+1, 0, 0)
  assert.ok(Math.abs(mFish[8] - 1) < 1e-5);
  assert.ok(Math.abs(mFish[9]) < 1e-5);

  const mCar = computeOrientationMatrix({
    front: [1, 0, 0],
    rear: [-1, 0, 0],
    top: [0, 1, 0],
  }, { forwardAxis: '+z' });
  // (1, 0, 0) -> (0, 0, 1)
  assert.ok(Math.abs(mCar[2] - 1) < 1e-5);

  const bg = [240, 240, 240];
  const side = makePhoto(80, 60, bg, (x, y) => (x > 15 && x < 65 && y > 15 && y < 45 ? [50, 120, 220] : null));
  const vol = carveVolume({ side }, { maxDim: 16 });
  const mesh = volumeToMesh(vol, { forwardAxis: '+x' });
  const dots = defaultDotsForMesh(mesh, { forwardAxis: '+x', keys: 'fish' });
  assert.ok(dots.head[0] > 0 && dots.tail[0] < 0 && dots.back[1] > 0);
  const rotated = applyOrientationToMesh(mesh, dots, { forwardAxis: '+x' });
  assert.equal(rotated.positions.length, mesh.positions.length);
});

test('smooth scan colours come from the photos, so a two-tone side stays crisp', () => {
  const bg = [240, 240, 236];
  const red = [220, 30, 25], blue = [25, 50, 210];
  // Side photo: nose to the right. Rear half blue, front half red.
  const side = makePhoto(240, 120, bg, (x, y) => (x >= 20 && x < 220 && y >= 30 && y < 100 ? (x < 120 ? blue : red) : null));
  const front = makePhoto(120, 100, bg, (x, y) => (x >= 25 && x < 95 && y >= 15 && y < 85 ? red : null));
  const volume = carveVolume({ side, front }, { maxDim: 32 });
  const mesh = volumeToMesh(volume, { style: 'smooth', forwardAxis: '+z' });
  const halfLen = mesh.bounds.size[2] / 2;
  let checked = 0, wrong = 0;
  for (let k = 0; k < mesh.vertexCount; k++) {
    if (Math.abs(mesh.normals[k * 3]) < 0.85) continue; // flat sides only
    const z = mesh.positions[k * 3 + 2] / halfLen; // -1 rear .. +1 nose
    if (Math.abs(z) < 0.08 || Math.abs(z) > 0.9) continue;
    const r = mesh.colors[k * 3] * 255, b = mesh.colors[k * 3 + 2] * 255;
    checked++;
    const want = z > 0 ? red : blue;
    if (Math.abs(r - want[0]) > 20 || Math.abs(b - want[2]) > 20) wrong++;
  }
  assert.ok(checked > 20, `expected side vertices, got ${checked}`);
  assert.equal(wrong, 0, `${wrong} of ${checked} side vertices were smeared across the colour split`);
  // colorAt is a helper, not data: the volume still clones cleanly.
  assert.ok(structuredClone(volume).occ.length === volume.occ.length);
});
