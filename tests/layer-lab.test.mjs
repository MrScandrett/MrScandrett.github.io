import test from 'node:test';
import assert from 'node:assert/strict';
import { zipStore, unzip, crc32 } from '../assets/js/lessons/layer-lab/zip.mjs';
import { writePSD, readPSD, packBits } from '../assets/js/lessons/layer-lab/psd.mjs';
import { writeORA, readORA } from '../assets/js/lessons/layer-lab/ora.mjs';
import * as px from '../assets/js/lessons/layer-lab/pixels.mjs';

function solid(w, h, rgba) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(rgba, i * 4);
  return { width: w, height: h, data };
}

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('zip round trip keeps names, order and bytes', async () => {
  const files = [{ name: 'mimetype', data: 'image/openraster' }, { name: 'data/ä.bin', data: new Uint8Array([0, 1, 2, 255]) }];
  const out = await unzip(zipStore(files));
  assert.deepEqual([...out.keys()], ['mimetype', 'data/ä.bin']);
  assert.equal(new TextDecoder().decode(out.get('mimetype')), 'image/openraster');
  assert.deepEqual([...out.get('data/ä.bin')], [0, 1, 2, 255]);
});

test('PackBits round trip on runs and literals', async () => {
  const row = Uint8Array.from([1, 1, 1, 1, 2, 3, 4, 5, 5, ...new Array(300).fill(9), 7, 8]);
  const packed = [];
  packBits(row, 0, row.length, packed);
  assert.ok(packed.length < row.length);
  // decode through readPSD on a 1-layer image built from this row
  const W = row.length, H = 1;
  const rgba = new Uint8ClampedArray(W * 4);
  row.forEach((v, i) => { rgba[i * 4] = v; rgba[i * 4 + 1] = 255 - v; rgba[i * 4 + 2] = v; rgba[i * 4 + 3] = 255; });
  const psd = await readPSD(writePSD({ width: W, height: H, layers: [], composite: rgba }));
  assert.deepEqual([...psd.composite], [...rgba]);
});

test('PSD round trip keeps layers, blend modes, opacity, visibility, names and masks', async () => {
  const W = 40, H = 30;
  const a = solid(10, 8, [255, 0, 0, 255]);
  const mask = new Uint8Array(10 * 8).map((_, i) => (i % 10 < 5 ? 255 : 0));
  const layers = [
    { name: 'Background', left: 0, top: 0, width: W, height: H, rgba: solid(W, H, [20, 40, 60, 255]).data, opacity: 1, visible: true, blend: 'normal' },
    { name: 'Sun ☀', left: 5, top: 6, width: 10, height: 8, rgba: a.data, opacity: 0.5, visible: false, blend: 'multiply',
      mask: { left: 5, top: 6, width: 10, height: 8, data: mask, defaultColor: 0 } },
    { name: 'Empty', left: 0, top: 0, width: 0, height: 0, rgba: new Uint8ClampedArray(0), opacity: 1, visible: true, blend: 'screen' },
  ];
  const composite = solid(W, H, [1, 2, 3, 255]).data;
  const doc = await readPSD(writePSD({ width: W, height: H, layers, composite }));
  assert.equal(doc.width, W); assert.equal(doc.height, H);
  assert.deepEqual(doc.layers.map((l) => l.name), ['Background', 'Sun ☀', 'Empty']);
  const sun = doc.layers[1];
  assert.equal(sun.blend, 'multiply');
  assert.equal(sun.visible, false);
  assert.ok(Math.abs(sun.opacity - 0.5) < 0.01);
  assert.deepEqual([sun.left, sun.top, sun.width, sun.height], [5, 6, 10, 8]);
  assert.deepEqual([...sun.rgba.slice(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...sun.mask.data], [...mask]);
  assert.equal(doc.layers[2].blend, 'screen');
  assert.deepEqual([...doc.composite.slice(0, 4)], [1, 2, 3, 255]);
  assert.deepEqual(doc.notes, []);
});

test('readPSD refuses non-PSD bytes with a helpful message', async () => {
  await assert.rejects(readPSD(new Uint8Array(64)), /not a Photoshop file/);
});

test('ORA round trip (raw codec stand-in for PNG)', async () => {
  const encodePNG = async (w, h, rgba) => { const out = new Uint8Array(8 + rgba.length); new DataView(out.buffer).setUint32(0, w); new DataView(out.buffer).setUint32(4, h); out.set(rgba, 8); return out; };
  const decodePNG = async (b) => { const dv = new DataView(b.buffer, b.byteOffset); return { width: dv.getUint32(0), height: dv.getUint32(4), rgba: new Uint8ClampedArray(b.slice(8)) }; };
  const layers = [
    { name: 'Back', left: 0, top: 0, width: 4, height: 4, rgba: solid(4, 4, [9, 9, 9, 255]).data, opacity: 1, visible: true, blend: 'normal' },
    { name: 'Tom & "Jerry"', left: 1, top: 2, width: 2, height: 2, rgba: solid(2, 2, [200, 0, 0, 128]).data, opacity: 0.25, visible: false, blend: 'exclusion' },
  ];
  const { bytes, notes } = await writeORA({ width: 4, height: 4, layers, composite: solid(4, 4, [1, 1, 1, 255]).data }, { encodePNG });
  assert.equal(notes.length, 1, 'exclusion has no OpenRaster name');
  const files = await unzip(bytes);
  assert.equal([...files.keys()][0], 'mimetype');
  const doc = await readORA(bytes, { decodePNG });
  assert.deepEqual(doc.layers.map((l) => l.name), ['Back', 'Tom & "Jerry"']);
  assert.equal(doc.layers[1].visible, false);
  assert.equal(doc.layers[1].left, 1);
  assert.ok(Math.abs(doc.layers[1].opacity - 0.25) < 1e-6);
});

test('magic wand: contiguous vs global', () => {
  const img = solid(6, 1, [0, 0, 0, 255]);
  img.data.set([255, 255, 255, 255], 2 * 4); // a white wall at x=2
  assert.equal(px.magicWand(img, 0, 0, 10, true).filter(Boolean).length, 2);
  assert.equal(px.magicWand(img, 0, 0, 10, false).filter(Boolean).length, 5);
});

test('select subject finds a disc on a gradient background and ignores specks', () => {
  const W = 60, H = 40;
  const img = solid(W, H, [0, 0, 0, 255]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = (y * W + x) * 4;
    img.data[j] = 100 + x; img.data[j + 1] = 120; img.data[j + 2] = 160 - y; // gentle gradient
    if ((x - 30) ** 2 + (y - 20) ** 2 < 100) img.data.set([220, 30, 30, 255], j);
  }
  img.data.set([250, 250, 250, 255], (5 * W + 5) * 4); // a speck
  const m = px.selectSubject(img, { tolerance: 70 });
  assert.equal(m[20 * W + 30], 255);
  assert.equal(m[5 * W + 5], 0);
  assert.equal(m[0], 0);
  const n = m.filter(Boolean).length;
  assert.ok(n > 250 && n < 330, `disc area ${n}`);
});

test('content-aware fill hides a blob on a flat background', () => {
  const W = 40, H = 30;
  const img = solid(W, H, [60, 120, 200, 255]);
  const mask = new Uint8Array(W * H);
  for (let y = 10; y < 18; y++) for (let x = 15; x < 22; x++) { img.data.set([255, 255, 0, 255], (y * W + x) * 4); mask[y * W + x] = 255; }
  px.contentAwareFill(img, mask);
  const j = (14 * W + 18) * 4;
  assert.ok(Math.abs(img.data[j] - 60) < 6 && Math.abs(img.data[j + 2] - 200) < 6, [...img.data.slice(j, j + 4)].join());
});

test('adjustments: invert, black & white, posterize, levels, hue shift', () => {
  const one = (rgba, kind, params) => [...px.applyAdjustment(solid(1, 1, rgba), kind, params).data];
  assert.deepEqual(one([10, 20, 30, 255], 'invert'), [245, 235, 225, 255]);
  const bw = one([255, 0, 0, 255], 'black-white');
  assert.equal(bw[0], bw[1]); assert.equal(bw[0], 76);
  assert.deepEqual(one([100, 200, 30, 255], 'posterize', { levels: 2 }), [0, 255, 0, 255]);
  assert.deepEqual(one([128, 128, 128, 255], 'levels', { black: 128, white: 255, gamma: 1 }), [0, 0, 0, 255]);
  const green = one([255, 0, 0, 255], 'hue-saturation', { hue: 120 });
  assert.ok(green[1] > 250 && green[0] < 5, green.join());
  const half = px.applyAdjustment(solid(1, 1, [0, 0, 0, 255]), 'invert', {}, new Uint8Array([128]));
  assert.ok(Math.abs(half.data[0] - 128) <= 1, 'mask scales the effect');
});

test('auto tone stretches a dull image to full range', () => {
  const img = solid(2, 1, [100, 100, 100, 255]);
  img.data.set([150, 150, 150, 255], 4);
  px.autoTone(img);
  assert.equal(img.data[0], 0); assert.equal(img.data[4], 255);
});

test('blend math matches the W3C formulas', () => {
  assert.equal(px.blendChannel('multiply', 0.5, 0.5), 0.25);
  assert.equal(px.blendChannel('screen', 0.5, 0.5), 0.75);
  assert.equal(px.blendChannel('overlay', 0.25, 1), 0.5);
  assert.ok(Math.abs(px.blendChannel('difference', 0.2, 0.7) - 0.5) < 1e-9);
  assert.equal(px.blendChannel('normal', 0.2, 0.7), 0.7);
});

test('alpha bounds and mask expand/contract', () => {
  const W = 10, H = 10;
  const rgba = new Uint8ClampedArray(W * H * 4);
  rgba[(3 * W + 4) * 4 + 3] = 255; rgba[(6 * W + 7) * 4 + 3] = 1;
  assert.deepEqual(px.alphaBounds(rgba, W, H), { x: 4, y: 3, width: 4, height: 4 });
  assert.equal(px.alphaBounds(new Uint8ClampedArray(16), 2, 2), null);
  const m = new Uint8Array(W * H); for (let y = 3; y < 7; y++) for (let x = 3; x < 7; x++) m[y * W + x] = 255;
  const grown = px.expandMask(m, W, H, 1).filter(Boolean).length, shrunk = px.expandMask(m, W, H, -1).filter(Boolean).length;
  assert.ok(grown > 16 && shrunk < 16, `${grown} ${shrunk}`);
});
