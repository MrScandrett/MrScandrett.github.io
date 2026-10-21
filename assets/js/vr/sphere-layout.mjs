// sphere-layout.mjs — the geometry behind the 360° page sphere (vr/page-sphere.html).
// Pure functions, no DOM or Three.js, so tests/page-sphere.test.mjs can pin them down.
//
// The page is rendered 1280 px wide and cut into TILE_W × TILE_H "screens". Screen 0 is
// straight ahead; the rest go round you to the right at eye level (ring 0), then round a
// second ring below (ring 1, easier on the neck than looking up). Turning your head is
// scrolling. Every screen covers the same angle per pixel, so text is equally sharp
// everywhere: tiles further from the horizon are stretched wider in yaw to compensate for
// lines of longitude closing together.

export const TILE_W = 1280;
export const TILE_H = 720;
export const MAX_TILES = 15;
export const YAW_SPAN = 45; // degrees one screen covers at the horizon (1280 px → ~28 px/°)
export const RING_STEP = 27.5; // degrees between ring centres
const PITCH_SPAN = (YAW_SPAN * TILE_H) / TILE_W;
const RAD = Math.PI / 180;

/** Rings of tiles for a page that needs `count` screens (clamped to MAX_TILES). */
export function planTiles(count) {
  const wanted = Math.max(0, Math.min(MAX_TILES, Math.floor(count)));
  const tiles = [];
  for (let ring = 0; tiles.length < wanted; ring++) {
    const pitchCenter = -ring * RING_STEP;
    const yawSpan = YAW_SPAN / Math.cos(pitchCenter * RAD);
    const perRing = Math.floor(360 / yawSpan + 1e-9);
    for (let j = 0; j < perRing && tiles.length < wanted; j++) {
      tiles.push({ index: tiles.length, ring, yawCenter: j * yawSpan, yawSpan, pitchCenter, pitchSpan: PITCH_SPAN });
    }
  }
  return tiles;
}

/** How many screens the page needs, and whether the sphere has to drop the rest. */
export function screensFor(pageHeight) {
  const needed = Math.max(1, Math.ceil(pageHeight / TILE_H));
  return { needed, shown: Math.min(needed, planTiles(MAX_TILES).length), truncated: needed > planTiles(MAX_TILES).length };
}

/** A point on a sphere of radius r. Yaw runs to the right of straight ahead (−z); y is up. */
export function spherePoint(yawDeg, pitchDeg, r) {
  const yaw = yawDeg * RAD;
  const pitch = pitchDeg * RAD;
  return [r * Math.cos(pitch) * Math.sin(yaw), r * Math.sin(pitch), -r * Math.cos(pitch) * Math.cos(yaw)];
}

/** Vertex data for one tile: a curved patch with u running left→right and v bottom→top. */
export function tilePatch(tile, r, segX = 24, segY = 12) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let iy = 0; iy <= segY; iy++) {
    const v = iy / segY;
    for (let ix = 0; ix <= segX; ix++) {
      const u = ix / segX;
      const yaw = tile.yawCenter + (u - 0.5) * tile.yawSpan;
      const pitch = tile.pitchCenter + (v - 0.5) * tile.pitchSpan;
      positions.push(...spherePoint(yaw, pitch, r));
      uvs.push(u, v);
    }
  }
  const row = segX + 1;
  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * row + ix;
      indices.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices: new Uint16Array(indices) };
}

/** A laser hit on tile `index` at texture coordinates (u, v) → a point on the page, in CSS px. */
export function tileUvToPage(index, u, v) {
  return { x: u * TILE_W, y: index * TILE_H + (1 - v) * TILE_H };
}

/**
 * Which page may the sphere open? Same-origin site pages only (the sphere reads the page's
 * DOM, which a cross-origin frame forbids), never the sphere itself.
 * Returns an absolute URL string or null.
 */
export function safeSource(src, siteRoot, origin) {
  if (!src) return null;
  let url;
  try { url = new URL(src, siteRoot); } catch { return null; }
  if (url.origin !== origin) return null;
  if (!/^https?:$/.test(url.protocol)) return null;
  if (/\/vr\/page-sphere(\.html)?$/.test(url.pathname)) return null;
  if (!/(\.html?|\/)$/.test(url.pathname)) return null;
  return url.href;
}

/** The ?src= value for a page URL: its path under the site root (or null when outside it). */
export function sourceParam(href, siteRoot) {
  if (!href.startsWith(siteRoot)) return null;
  return href.slice(siteRoot.length) || 'index.html';
}
