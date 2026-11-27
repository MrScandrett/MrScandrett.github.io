// Brick Rally scanner (pure: works on ImageData-shaped objects { width, height, data }).
//
// Powered by the shared ClassroomOS 3D scanning engine (`../scan3d/core.mjs`):
//   1. `carveCar(shots)` preserves classic 3-view brick-grid carving for voxel builds.
//   2. `scanCar(input, opts)` supports both 3-View and 360° Turntable photos and can
//      output either a full-color smooth 3D scanned car mesh (with `.glb`/`.stl` exports)
//      or an editable Brick Rally voxel car.

import { W, L, H, PALETTE, emptyCar, idx, hexToRgb } from './car-model.mjs';
import {
  segmentImage,
  nearestPaletteColor,
  carveVolume,
  volumeToMesh,
  volumeToBrickGrid,
  encodeColoredGlb,
  encodeStl,
} from '../scan3d/core.mjs';

const PAL = PALETTE.map(p => (p ? hexToRgb(p.hex).map(v => v * 255) : null));

export function nearestPalette(r, g, b, { allowGlass = false } = {}) {
  return nearestPaletteColor(r, g, b, PAL, { skip: allowGlass ? [] : [15] });
}

/** Separate the car from a plain background. Returns { mask, width, height, bbox } or null. */
export function segment(img, opts = {}) {
  return segmentImage(img, { minCoverage: 0.01, minBlobRatio: 0.1, ...opts });
}

/**
 * Sample a segmented photo into a gw × gh grid over its bounding box.
 * Returns { on: Uint8Array, color: Uint8Array } indexed [row * gw + col], row 0 = top of photo.
 */
export function toGrid(img, seg, gw, gh, { fill = 0.4 } = {}) {
  const { data, width: w } = img;
  const { x0, y0, x1, y1 } = seg.bbox;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const on = new Uint8Array(gw * gh), color = new Uint8Array(gw * gh);
  for (let r = 0; r < gh; r++) for (let c = 0; c < gw; c++) {
    const xa = x0 + Math.floor(c * bw / gw), xb = x0 + Math.max(Math.floor((c + 1) * bw / gw), Math.floor(c * bw / gw) + 1);
    const ya = y0 + Math.floor(r * bh / gh), yb = y0 + Math.max(Math.floor((r + 1) * bh / gh), Math.floor(r * bh / gh) + 1);
    let n = 0, m = 0, R = 0, G = 0, B = 0;
    for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
      n++;
      const p = y * w + x;
      if (!seg.mask[p]) continue;
      m++; R += data[p * 4]; G += data[p * 4 + 1]; B += data[p * 4 + 2];
    }
    if (n && m / n >= fill) {
      on[r * gw + c] = 1;
      color[r * gw + c] = nearestPalette(R / m, G / m, B / m);
    }
  }
  return { on, color, gw, gh };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** How many cells each axis gets, from the photos' aspect ratios. */
export function scanDims({ side, front }) {
  const sw = side.bbox.x1 - side.bbox.x0 + 1, sh = side.bbox.y1 - side.bbox.y0 + 1;
  // A brick is 1.2 studs tall, so a photo h/w ratio converts to layers ÷ 1.2.
  const len = L;
  const height = clamp(Math.round(len * (sh / sw) / 1.2), 2, H);
  let width = 8;
  if (front) {
    const fw = front.bbox.x1 - front.bbox.x0 + 1, fh = front.bbox.y1 - front.bbox.y0 + 1;
    width = clamp(Math.round(height * 1.2 * (fw / fh)), 3, W);
  }
  return { len, height, width };
}

/**
 * Carve a brick car from up to three photos. `shots` = { side, front?, top? }, each an ImageData-like
 * or `{ img, seg? }`. Returns `{ cells, dims, report }` or throws with a student-readable message.
 */
export function carveCar(shots, segOpts = {}) {
  if (!shots?.side) throw new Error('Take the side photo first: it sets the car\'s length and height.');
  const imgs = {};
  const segs = {};
  for (const k of ['side', 'front', 'top']) {
    if (!shots[k]) continue;
    const raw = shots[k].img || shots[k];
    imgs[k] = raw;
    const s = shots[k].seg || segment(raw, segOpts);
    if (!s) throw new Error(`Couldn't find the car in the ${k} photo. Use a plain background that isn't the same colour as the car.`);
    segs[k] = s;
  }
  const dims = scanDims(segs);
  const { len, height, width } = dims;
  const side = toGrid(imgs.side, segs.side, len, height);
  const front = segs.front ? toGrid(imgs.front, segs.front, width, height) : null;
  const top = segs.top ? toGrid(imgs.top, segs.top, width, len) : null;
  const xOff = Math.floor((W - width) / 2);
  const cells = emptyCar();
  // grid lookups in car coordinates (x across, y up, z toward the nose)
  const sideAt = (y, z) => (height - 1 - y) * len + z;                // nose right → column = z
  const frontAt = (x, y) => (height - 1 - y) * width + (width - 1 - x); // viewer's right is the car's left
  const topAt = (x, z) => (len - 1 - z) * width + x;                  // nose up → row 0 = front
  for (let y = 0; y < height; y++) for (let z = 0; z < len; z++) for (let x = 0; x < width; x++) {
    if (!side.on[sideAt(y, z)]) continue;
    if (front && !front.on[frontAt(x, y)]) continue;
    if (top && !top.on[topAt(x, z)]) continue;
    cells[idx(x + xOff, y, z)] = 255; // placeholder: coloured below
  }
  // Colour: the photo that sees a cell's face first wins (top for roofs, front for the nose).
  let bricks = 0;
  for (let y = 0; y < height; y++) for (let z = 0; z < len; z++) for (let x = 0; x < width; x++) {
    const i = idx(x + xOff, y, z);
    if (!cells[i]) continue;
    bricks++;
    let c = side.color[sideAt(y, z)];
    const roof = y === height - 1 || !cells[idx(x + xOff, y + 1, z)];
    const nose = z === len - 1 || !cells[idx(x + xOff, y, z + 1)];
    if (top && roof) c = top.color[topAt(x, z)] || c;
    else if (front && nose) c = front.color[frontAt(x, y)] || c;
    cells[i] = c || 11;
  }
  if (bricks < 12) throw new Error('That scan came out almost empty. Fill more of each photo with the car and try again.');
  return { cells, dims, report: { bricks, views: Object.keys(segs) } };
}

/**
 * High-level Brick Rally scan powered by `scan3d`:
 * Supports 3-View or Turntable photos and outputs either a full-color smooth 3D mesh
 * (`style: 'mesh'`) or an editable Brick Rally voxel build (`style: 'bricks'`), along with
 * `.glb` and `.stl` bytes.
 */
export function scanCar(input, { mode = 'views', style = 'mesh', segOpts = {}, maxDim = null } = {}) {
  // A smooth scan needs a finer hull than a brick car: at 32 voxels a car's cab, spoiler and
  // wheel arches melt into one blob. Bricks are resampled to the 10×16×10 grid anyway.
  maxDim ??= style === 'mesh' ? 56 : 32;
  const isTurntable = mode === 'turntable' || Array.isArray(input);
  const volume = carveVolume(input, {
    maxDim,
    profile: style === 'bricks' ? 'flat' : 'rounded',
    singleViewThickness: 0.55,
    segOpts,
  });

  let cells;
  if (style === 'bricks' && !isTurntable && !input.otherSide && !input.back) {
    cells = carveCar(input, segOpts).cells;
  } else {
    cells = volumeToBrickGrid(volume, { W, L, H, paletteRgb: PAL, skipPaletteIndices: [15] });
  }

  let brickCount = 0;
  for (const c of cells) if (c) brickCount++;
  if (brickCount < 6) {
    throw new Error('That scan came out too small to build a car. Fill more of the photo and try again.');
  }

  const mesh = volumeToMesh(volume, {
    style: style === 'bricks' ? 'voxel' : 'smooth',
    forwardAxis: '+z',
    targetSize: 1.0,
  });
  const glbBytes = encodeColoredGlb(mesh, { name: 'BrickRallyCar', generator: 'ClassroomOS Brick Rally' });
  const stlBytes = encodeStl(mesh, { sizeMm: 90, header: 'Brick Rally Scan' });

  return {
    cells,
    mesh: style === 'mesh' ? mesh : null,
    volume,
    glbBytes,
    stlBytes,
    report: {
      bricks: brickCount,
      triangles: mesh.triangleCount,
      views: volume.viewsUsed,
      mode: volume.mode,
      style,
    },
  };
}
