import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TILE_W, TILE_H, TILE_GUTTER, PAGE_SLICE_H, SLICE_OVERLAP, SLICE_STEP,
  MAX_TILES, YAW_SPAN, planTiles, screensFor, spherePoint, tilePatch, tileUvToPage, safeSource, sourceParam
} from '../assets/js/vr/sphere-layout.mjs';

test('screens go round the horizon first, then a second ring below', () => {
  const tiles = planTiles(MAX_TILES);
  assert.equal(tiles.length, MAX_TILES);
  const ring0 = tiles.filter(t => t.ring === 0);
  assert.equal(ring0.length, 8, 'eight 45° screens close the horizon ring');
  assert.equal(ring0[0].yawCenter, 0, 'screen 0 is straight ahead');
  assert.ok(tiles.filter(t => t.ring === 1).every(t => t.pitchCenter < 0), 'ring 1 sits below eye level');
  assert.deepEqual(tiles.map(t => t.index), [...tiles.keys()]);
});

test('no ring overlaps itself and rings do not overlap each other', () => {
  const tiles = planTiles(MAX_TILES);
  for (const ring of [0, 1]) {
    const row = tiles.filter(t => t.ring === ring);
    assert.ok(row.reduce((sum, t) => sum + t.yawSpan, 0) <= 360 + 1e-6, `ring ${ring} fits in 360°`);
  }
  const top = tiles.find(t => t.ring === 0);
  const next = tiles.find(t => t.ring === 1);
  assert.ok(top.pitchCenter - top.pitchSpan / 2 >= next.pitchCenter + next.pitchSpan / 2 - 1e-6, 'ring 0 bottom edge clears ring 1 top edge');
});

test('text is equally sharp everywhere: same arc length per pixel on every screen', () => {
  const perPixel = t => (t.yawSpan * Math.cos((t.pitchCenter * Math.PI) / 180)) / TILE_W;
  const base = YAW_SPAN / TILE_W;
  for (const t of planTiles(MAX_TILES)) assert.ok(Math.abs(perPixel(t) - base) / base < 0.02, `tile ${t.index}`);
});

test('planTiles clamps its input', () => {
  assert.equal(planTiles(0).length, 0);
  assert.equal(planTiles(3).length, 3);
  assert.equal(planTiles(999).length, MAX_TILES);
});

test('screensFor says when the page is too tall to show whole', () => {
  assert.equal(PAGE_SLICE_H, TILE_H - TILE_GUTTER * 2);
  assert.equal(SLICE_STEP, PAGE_SLICE_H - SLICE_OVERLAP);
  assert.deepEqual(screensFor(PAGE_SLICE_H), { needed: 1, shown: 1, truncated: false });
  assert.deepEqual(screensFor(PAGE_SLICE_H + SLICE_STEP * 3), { needed: 4, shown: 4, truncated: false });
  const tall = screensFor(TILE_H * 40);
  assert.equal(tall.shown, MAX_TILES);
  assert.equal(tall.truncated, true);
});

test('sphere points: ahead is −z, right is +x, up is +y, all at the radius', () => {
  const near = (a, b) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `${a} vs ${b}`));
  near(spherePoint(0, 0, 3), [0, 0, -3]);
  near(spherePoint(90, 0, 3), [3, 0, 0]);
  near(spherePoint(0, 90, 3), [0, 3, 0]);
  const [x, y, z] = spherePoint(37, -22, 3);
  assert.ok(Math.abs(Math.hypot(x, y, z) - 3) < 1e-9);
});

test('a tile patch lies on the sphere and its uv runs left→right, bottom→top', () => {
  const tile = planTiles(1)[0];
  const patch = tilePatch(tile, 3, 6, 4);
  assert.equal(patch.positions.length / 3, 7 * 5);
  assert.equal(patch.uvs.length / 2, 7 * 5);
  for (let i = 0; i < patch.positions.length; i += 3) {
    assert.ok(Math.abs(Math.hypot(patch.positions[i], patch.positions[i + 1], patch.positions[i + 2]) - 3) < 1e-5);
  }
  const x = i => patch.positions[i * 3];
  assert.ok(x(6) > x(0), 'u = 1 is to the right of u = 0');
  const y = i => patch.positions[i * 3 + 1];
  assert.ok(y(7 * 4) > y(0), 'v = 1 is above v = 0');
  assert.ok(Math.max(...patch.indices) < patch.positions.length / 3);
});

test('a laser hit maps to the right page coordinate', () => {
  assert.deepEqual(tileUvToPage(0, 0, 1), { x: 0, y: 0 }, 'top-left of screen 0 is the top-left of the page');
  assert.deepEqual(tileUvToPage(0, 1, 0), { x: TILE_W, y: PAGE_SLICE_H }, 'the bottom gutter clamps to the end of the slice');
  assert.deepEqual(tileUvToPage(2, 0.5, 0.5), { x: TILE_W / 2, y: 2 * SLICE_STEP + PAGE_SLICE_H / 2 });
  assert.equal(tileUvToPage(1, 0, 1).y, SLICE_STEP, 'the next panel repeats the overlap instead of losing cut content');
});

test('the sphere only opens pages from this site', () => {
  const root = 'https://school.example/site/';
  const origin = 'https://school.example';
  assert.equal(safeSource('lessons/a.html', root, origin), 'https://school.example/site/lessons/a.html');
  assert.equal(safeSource('index.html?x=1#top', root, origin), 'https://school.example/site/index.html?x=1#top');
  assert.equal(safeSource('apps/game/', root, origin), 'https://school.example/site/apps/game/');
  assert.equal(safeSource('https://evil.example/a.html', root, origin), null, 'other origin');
  assert.equal(safeSource('javascript:alert(1)', root, origin), null);
  assert.equal(safeSource('data:text/html,hi', root, origin), null);
  assert.equal(safeSource('assets/js/x.js', root, origin), null, 'not a page');
  assert.equal(safeSource('vr/page-sphere.html?src=index.html', root, origin), null, 'no sphere inside the sphere');
  assert.equal(safeSource('', root, origin), null);
  assert.equal(safeSource(null, root, origin), null);
});

test('sourceParam gives the path under the site root', () => {
  const root = 'https://school.example/site/';
  assert.equal(sourceParam('https://school.example/site/lessons/a.html?x=1#y', root), 'lessons/a.html?x=1#y');
  assert.equal(sourceParam('https://school.example/site/', root), 'index.html');
  assert.equal(sourceParam('https://other.example/', root), null);
});

test('Laplacian sharpening steepens edges and leaves flat areas alone', async () => {
  const { sharpen } = await import('../assets/js/vr/sphere-layout.mjs');
  const w = 6, h = 3;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    data.fill(x < 3 ? 40 : 200, i, i + 3);
    data[i + 3] = 255;
  }
  sharpen(data, w, h, 0.5);
  const at = x => data[(w + x) * 4];
  assert.equal(at(1), 40, 'flat dark area unchanged');
  assert.ok(at(2) < 40, 'dark side of the edge gets darker');
  assert.ok(at(3) > 200, 'light side of the edge gets lighter');
  assert.equal(data[(w + 3) * 4 + 3], 255, 'alpha untouched');
});

test('sphere sound: every world has ambience, modes default to clicks, media beams face you', async () => {
  const { ambienceFor, soundMode, MEDIA_CONE } = await import('../assets/js/vr/sphere-sound.mjs');
  const { LOOK } = await import('../assets/js/vr/sphere-theme.mjs');
  for (const look of Object.values(LOOK)) {
    const a = ambienceFor(look);
    assert.ok(a.drone > 0 || a.noise > 0, `look ${look} makes some sound`);
    assert.ok(a.level > 0 && a.level <= 0.06, `look ${look} stays quiet under the lesson`);
    assert.ok(!a.rumble || a.rumble >= 25, 'rumble stays above what headphones can play');
  }
  assert.equal(soundMode('nonsense'), 'clicks');
  assert.equal(soundMode('off'), 'off');
  assert.ok(MEDIA_CONE.inner < MEDIA_CONE.outer && MEDIA_CONE.outerGain > 0 && MEDIA_CONE.outerGain < 1);
});
