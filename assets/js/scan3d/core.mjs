/**
 * scan3d/core.mjs — Shared pure image-based 3D scanning, surface reconstruction,
 * orientation calibration, and GLB/STL export engine.
 *
 * Pure ES module: zero DOM and zero Three.js dependencies, so it runs identically
 * in the browser and under `node --test`.
 *
 * Canonical Y-up coordinate system for scanned volumes & meshes:
 *   +X = right, -X = left
 *   +Y = up,    -Y = down
 *   +Z = front/nose, -Z = rear/tail
 * (Pass `forwardAxis: '+x'` to `volumeToMesh` if the target world expects +X forward,
 * e.g. the Classroom Fish Tank.)
 */

import { prepareForPrint, writeBinaryStl } from '../fab-io.mjs';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── Image transforms ─────────────────────────────────────────────────── */

/**
 * Rotate (0/90/180/270 deg clockwise), mirror horizontally, or crop an ImageData-shaped
 * object `{ width, height, data }`.
 */
export function transformImageData(img, { rotate = 0, flipX = false, crop = null } = {}) {
  const { width: w0, height: h0, data: d0 } = img;
  const rot = ((rotate % 360) + 360) % 360;

  let sx0 = 0, sy0 = 0, sx1 = w0, sy1 = h0;
  if (crop) {
    sx0 = clamp(Math.floor((crop.x0 ?? 0) * w0), 0, w0 - 1);
    sy0 = clamp(Math.floor((crop.y0 ?? 0) * h0), 0, h0 - 1);
    sx1 = clamp(Math.ceil((crop.x1 ?? 1) * w0), sx0 + 1, w0);
    sy1 = clamp(Math.ceil((crop.y1 ?? 1) * h0), sy0 + 1, h0);
  }
  const cw = sx1 - sx0;
  const ch = sy1 - sy0;

  if (rot === 0 && !flipX && cw === w0 && ch === h0) {
    return { width: w0, height: h0, data: new Uint8ClampedArray(d0) };
  }

  const swap = rot === 90 || rot === 270;
  const w = swap ? ch : cw;
  const h = swap ? cw : ch;
  const out = new Uint8ClampedArray(w * h * 4);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const fx = flipX ? cw - 1 - x : x;
      let dx, dy;
      if (rot === 90) { dx = ch - 1 - y; dy = fx; }
      else if (rot === 180) { dx = cw - 1 - fx; dy = ch - 1 - y; }
      else if (rot === 270) { dx = y; dy = cw - 1 - fx; }
      else { dx = fx; dy = y; }

      const si = ((sy0 + y) * w0 + (sx0 + x)) * 4;
      const di = (dy * w + dx) * 4;
      out[di] = d0[si];
      out[di + 1] = d0[si + 1];
      out[di + 2] = d0[si + 2];
      out[di + 3] = d0[si + 3];
    }
  }
  return { width: w, height: h, data: out };
}

/* ── Segmentation ─────────────────────────────────────────────────────── */

function median(arr) {
  const a = Array.from(arr).sort((x, y) => x - y);
  return a[a.length >> 1] ?? 0;
}

function otsuThreshold(hist, total) {
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = -1, thr = 40;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      thr = t;
    }
  }
  return thr;
}

/**
 * Segment an object from a plain background.
 * Supports multi-sample eyedropper `bgColor`, sensitivity `thresholdOffset`,
 * border flood-fill (keeps interior background-colored patches like white eyes/glass),
 * enclosed hole filling, and connected-component cleanup.
 * Returns `{ mask, width, height, bbox, background, threshold, coverage }` or `null`.
 */
export function segmentImage(img, opts = {}) {
  const { width: w, height: h, data } = img;
  if (!w || !h || !data || data.length < w * h * 4) return null;

  const {
    bgColor = null,
    thresholdOffset = 0,
    floodFill = true,
    fillHoles = true,
    minBlobRatio = 0.08,
    minCoverage = 0.005,
    maxCoverage = 0.96,
  } = opts;

  let samples;
  if (Array.isArray(bgColor) && bgColor.length) {
    samples = Array.isArray(bgColor[0]) ? bgColor : [bgColor];
  } else {
    const br = [], bg = [], bb = [];
    const ring = Math.min(2, Math.floor(Math.min(w, h) / 4) + 1);
    const sample = (x, y) => {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 16) return;
      br.push(data[i]); bg.push(data[i + 1]); bb.push(data[i + 2]);
    };
    for (let y = 0; y < ring; y++) {
      for (let x = 0; x < w; x++) { sample(x, y); sample(x, h - 1 - y); }
    }
    for (let x = 0; x < ring; x++) {
      for (let y = ring; y < h - ring; y++) { sample(x, y); sample(w - 1 - x, y); }
    }
    samples = br.length ? [[median(br), median(bg), median(bb)]] : [[255, 255, 255]];
  }

  const total = w * h;
  const dist = new Float32Array(total);
  const hist = new Uint32Array(256);

  for (let p = 0; p < total; p++) {
    const i = p * 4;
    if (data[i + 3] < 16) {
      dist[p] = 0;
      hist[0]++;
      continue;
    }
    let minD = Infinity;
    for (let s = 0; s < samples.length; s++) {
      const sc = samples[s];
      const d = Math.hypot(data[i] - sc[0], data[i + 1] - sc[1], data[i + 2] - sc[2]);
      if (d < minD) minD = d;
    }
    const clampedD = Math.min(255, minD);
    dist[p] = clampedD;
    hist[clampedD | 0]++;
  }

  let thr = otsuThreshold(hist, total);
  if (thresholdOffset === 0) thr = Math.max(thr, 30);
  else thr = clamp(thr + thresholdOffset, 14, 220);

  const raw = new Uint8Array(total);
  if (floodFill) {
    // Flood-fill from image border through pixels within `thr` of background.
    // Interior pixels that happen to match background color stay foreground.
    const bgVisited = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0, tail = 0;
    const tryPush = (p) => {
      if (bgVisited[p] || dist[p] > thr) return;
      bgVisited[p] = 1;
      queue[tail++] = p;
    };
    for (let x = 0; x < w; x++) { tryPush(x); tryPush((h - 1) * w + x); }
    for (let y = 1; y < h - 1; y++) { tryPush(y * w); tryPush(y * w + w - 1); }

    while (head < tail) {
      const q = queue[head++];
      const x = q % w;
      const y = (q / w) | 0;
      if (x > 0) tryPush(q - 1);
      if (x < w - 1) tryPush(q + 1);
      if (y > 0) tryPush(q - w);
      if (y < h - 1) tryPush(q + w);
    }

    if (tail >= total * 0.02) {
      for (let p = 0; p < total; p++) raw[p] = bgVisited[p] ? 0 : 1;
    } else {
      for (let p = 0; p < total; p++) raw[p] = dist[p] > thr ? 1 : 0;
    }
  } else {
    for (let p = 0; p < total; p++) raw[p] = dist[p] > thr ? 1 : 0;
  }

  // Keep largest foreground blob plus secondary components >= minBlobRatio * biggest.
  const label = new Int32Array(total);
  const sizes = [0];
  const stack = [];
  for (let p = 0; p < total; p++) {
    if (!raw[p] || label[p]) continue;
    const id = sizes.length;
    let n = 0;
    label[p] = id;
    stack.push(p);
    while (stack.length) {
      const q = stack.pop();
      n++;
      const x = q % w;
      const y = (q / w) | 0;
      if (x > 0 && raw[q - 1] && !label[q - 1]) { label[q - 1] = id; stack.push(q - 1); }
      if (x < w - 1 && raw[q + 1] && !label[q + 1]) { label[q + 1] = id; stack.push(q + 1); }
      if (y > 0 && raw[q - w] && !label[q - w]) { label[q - w] = id; stack.push(q - w); }
      if (y < h - 1 && raw[q + w] && !label[q + w]) { label[q + w] = id; stack.push(q + w); }
    }
    sizes.push(n);
  }

  let biggest = 0;
  for (let i = 1; i < sizes.length; i++) if (sizes[i] > biggest) biggest = sizes[i];
  if (biggest < total * minCoverage) return null;

  const mask = new Uint8Array(total);
  let fgCount = 0;
  for (let p = 0; p < total; p++) {
    if (!label[p] || sizes[label[p]] < biggest * minBlobRatio) continue;
    mask[p] = 1;
    fgCount++;
  }

  if (fillHoles) {
    const ext = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0, tail = 0;
    const tryExt = (p) => {
      if (ext[p] || mask[p]) return;
      ext[p] = 1;
      queue[tail++] = p;
    };
    for (let x = 0; x < w; x++) { tryExt(x); tryExt((h - 1) * w + x); }
    for (let y = 1; y < h - 1; y++) { tryExt(y * w); tryExt(y * w + w - 1); }
    while (head < tail) {
      const q = queue[head++];
      const x = q % w;
      const y = (q / w) | 0;
      if (x > 0) tryExt(q - 1);
      if (x < w - 1) tryExt(q + 1);
      if (y > 0) tryExt(q - w);
      if (y < h - 1) tryExt(q + w);
    }
    for (let p = 0; p < total; p++) {
      if (!mask[p] && !ext[p]) {
        mask[p] = 1;
        fgCount++;
      }
    }
  }

  const coverage = fgCount / total;
  if (coverage > maxCoverage || coverage < minCoverage) return null;

  const bbox = { x0: w, y0: h, x1: -1, y1: -1 };
  for (let p = 0; p < total; p++) {
    if (!mask[p]) continue;
    const x = p % w;
    const y = (p / w) | 0;
    if (x < bbox.x0) bbox.x0 = x;
    if (x > bbox.x1) bbox.x1 = x;
    if (y < bbox.y0) bbox.y0 = y;
    if (y > bbox.y1) bbox.y1 = y;
  }

  return {
    mask,
    width: w,
    height: h,
    bbox,
    background: samples[0],
    threshold: thr,
    coverage,
  };
}

/* ── Palette color matching ───────────────────────────────────────────── */

/**
 * Match an RGB (0..255) color to the nearest entry in `paletteRgb` (array of `[r,g,b]|null`)
 * using redmean weighted RGB distance.
 */
export function nearestPaletteColor(r, g, b, paletteRgb, { skip = [] } = {}) {
  const skipSet = skip.length ? new Set(skip) : null;
  let best = 1;
  let bestD = Infinity;
  for (let i = 1; i < paletteRgb.length; i++) {
    if (skipSet && skipSet.has(i)) continue;
    const p = paletteRgb[i];
    if (!p) continue;
    const rm = (r + p[0]) / 2;
    const dr = r - p[0], dg = g - p[1], db = b - p[2];
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/* ── Helpers for view preparation & sampling ──────────────────────────── */

function prepareViewEntry(entry, globalSegOpts = {}) {
  if (!entry) return null;
  const rawImg = entry.img || entry;
  if (!rawImg || !rawImg.data || !rawImg.width || !rawImg.height) return null;
  const hasTransform = entry.rotate || entry.flipX || entry.crop;
  const img = hasTransform ? transformImageData(rawImg, entry) : rawImg;
  const seg = entry.seg && !hasTransform
    ? entry.seg
    : segmentImage(img, {
        bgColor: entry.bgColor ?? globalSegOpts.bgColor,
        thresholdOffset: entry.thresholdOffset ?? globalSegOpts.thresholdOffset ?? 0,
        floodFill: entry.floodFill ?? globalSegOpts.floodFill ?? true,
        fillHoles: entry.fillHoles ?? globalSegOpts.fillHoles ?? true,
      });
  if (!seg) return null;
  return { img, seg };
}

function sampleViewAt(view, u, v, fillRadius = 1) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return { hit: false, r: 0, g: 0, b: 0 };
  const { img, seg } = view;
  const { x0, y0, x1, y1 } = seg.bbox;
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const px = clamp(Math.floor(x0 + u * (bw - 1e-4)), x0, x1);
  const py = clamp(Math.floor(y0 + v * (bh - 1e-4)), y0, y1);
  const idx0 = py * img.width + px;
  if (seg.mask[idx0]) {
    const i = idx0 * 4;
    return { hit: true, r: img.data[i], g: img.data[i + 1], b: img.data[i + 2] };
  }
  if (fillRadius <= 0) return { hit: false, r: 0, g: 0, b: 0 };
  // Small neighborhood fallback for RGB reading near silhouette borders (does NOT alter hit)
  return { hit: false, r: 0, g: 0, b: 0 };
}

function sampleColorWithFallback(view, u, v) {
  const { img, seg } = view;
  const { x0, y0, x1, y1 } = seg.bbox;
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const px = clamp(Math.floor(x0 + u * (bw - 1e-4)), x0, x1);
  const py = clamp(Math.floor(y0 + v * (bh - 1e-4)), y0, y1);
  let rSum = 0, gSum = 0, bSum = 0, cnt = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const sx = clamp(px + dx, 0, img.width - 1);
      const sy = clamp(py + dy, 0, img.height - 1);
      const p = sy * img.width + sx;
      if (!seg.mask[p]) continue;
      rSum += img.data[p * 4];
      gSum += img.data[p * 4 + 1];
      bSum += img.data[p * 4 + 2];
      cnt++;
    }
  }
  if (cnt > 0) return [Math.round(rSum / cnt), Math.round(gSum / cnt), Math.round(bSum / cnt)];
  // Wider search up to radius 4 inside bbox
  for (let rad = 2; rad <= 4; rad++) {
    for (let dy = -rad; dy <= rad; dy += rad) {
      for (let dx = -rad; dx <= rad; dx += rad) {
        const sx = clamp(px + dx, x0, x1);
        const sy = clamp(py + dy, y0, y1);
        const p = sy * img.width + sx;
        if (!seg.mask[p]) continue;
        return [img.data[p * 4], img.data[p * 4 + 1], img.data[p * 4 + 2]];
      }
    }
  }
  return null;
}

/* 2D Euclidean distance transform inside a binary mask (returns normalized 0..1). */
function silhouetteDistanceMap(mask, w, h, bbox) {
  const { x0, y0, x1, y1 } = bbox;
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const INF = 1e12;
  const d = new Float32Array(bw * bh);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const p = (y0 + y) * w + (x0 + x);
      if (!mask[p]) { d[y * bw + x] = 0; continue; }
      const onEdge = x === 0 || y === 0 || x === bw - 1 || y === bh - 1 ||
        !mask[p - 1] || !mask[p + 1] || !mask[p - w] || !mask[p + w];
      d[y * bw + x] = onEdge ? 1 : INF;
    }
  }
  // Two-pass Chamfer 3-4 distance transform
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x;
      if (d[i] === 0) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - bw] + 1);
        if (x > 0) v = Math.min(v, d[i - bw - 1] + 1.414);
        if (x < bw - 1) v = Math.min(v, d[i - bw + 1] + 1.414);
      }
      d[i] = v;
    }
  }
  let maxD = 1;
  for (let y = bh - 1; y >= 0; y--) {
    for (let x = bw - 1; x >= 0; x--) {
      const i = y * bw + x;
      if (d[i] === 0) continue;
      let v = d[i];
      if (x < bw - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < bh - 1) {
        v = Math.min(v, d[i + bw] + 1);
        if (x > 0) v = Math.min(v, d[i + bw - 1] + 1.414);
        if (x < bw - 1) v = Math.min(v, d[i + bw + 1] + 1.414);
      }
      d[i] = v;
      if (v > maxD) maxD = v;
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = d[i] / maxD;
  return { dt: d, bw, bh };
}

/* ── 3D Visual Hull Space Carving ─────────────────────────────────────── */

/**
 * Reconstruct a colored 3D voxel volume via visual-hull space carving.
 *
 * Input can be:
 *  - Orthographic views object: `{ side, front?, top?, back?, otherSide? }`
 *  - Turntable array: `[{ angleDeg, img, ... }, ...]` (at least 2 views)
 *
 * Returns `{ nx, ny, nz, cellAspect, occ, rgb, viewsUsed, voxelCount, mode, singleViewProfile }`.
 */
export function carveVolume(input, opts = {}) {
  const {
    maxDim = 32,
    dims = null,
    cellAspect = [1, 1, 1],
    profile = 'rounded',
    singleViewThickness = 0.48,
    segOpts = {},
    top = null,
  } = opts;

  const isTurntable = Array.isArray(input);
  const views = [];

  if (isTurntable) {
    if (input.length < 2) {
      throw new Error('Turntable scanning needs at least 2 photos around the object.');
    }
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const prep = prepareViewEntry(item, segOpts);
      if (!prep) {
        throw new Error(`Couldn't find the object in photo ${i + 1} (${item.angleDeg ?? i * 45}°). Try a plainer background or adjust mask sensitivity.`);
      }
      const angleDeg = Number.isFinite(item.angleDeg) ? item.angleDeg : (i * 360) / input.length;
      const rad = (angleDeg * Math.PI) / 180;
      views.push({
        name: `${Math.round(angleDeg)}°`,
        kind: 'turntable',
        rad,
        cos: Math.cos(rad),
        sin: Math.sin(rad),
        dir: [Math.cos(rad), 0, Math.sin(rad)],
        ...prep,
      });
    }
    if (top) {
      const prepTop = prepareViewEntry(top, segOpts);
      if (!prepTop) throw new Error('Couldn\'t find the object in the top photo.');
      views.push({ name: 'top', kind: 'top', dir: [0, 1, 0], ...prepTop });
    }
  } else {
    if (!input || !input.side) {
      throw new Error('Take the side photo first: it sets the object\'s length and height.');
    }
    const viewOrder = [
      { key: 'side', label: 'side', dir: [1, 0, 0] },
      { key: 'otherSide', label: 'other side', dir: [-1, 0, 0] },
      { key: 'front', label: 'front', dir: [0, 0, 1] },
      { key: 'back', label: 'back', dir: [0, 0, -1] },
      { key: 'top', label: 'top', dir: [0, 1, 0] },
    ];
    for (const def of viewOrder) {
      if (!input[def.key]) continue;
      const prep = prepareViewEntry(input[def.key], segOpts);
      if (!prep) {
        throw new Error(`Couldn't find the object in the ${def.label} photo. Use a plain background or tap the background to sample it.`);
      }
      views.push({ name: def.key, kind: def.key, dir: def.dir, ...prep });
    }
  }

  // Determine grid dimensions (nx, ny, nz) from silhouette aspect ratios.
  let nx, ny, nz;
  const [ax, ay, az] = cellAspect;

  if (dims) {
    nx = dims.nx; ny = dims.ny; nz = dims.nz;
  } else if (isTurntable) {
    const sideViews = views.filter(v => v.kind === 'turntable');
    const widths = sideViews.map(v => v.seg.bbox.x1 - v.seg.bbox.x0 + 1);
    const heights = sideViews.map(v => v.seg.bbox.y1 - v.seg.bbox.y0 + 1);
    const maxW = Math.max(...widths);
    const avgH = heights.reduce((a, b) => a + b, 0) / heights.length;
    const v0 = sideViews[0];
    const w0 = v0.seg.bbox.x1 - v0.seg.bbox.x0 + 1;
    // Estimate length along Z (0 deg) and width along X (near 90 deg or median perpendicular)
    const v90 = sideViews.reduce((best, v) => (Math.abs(Math.sin(v.rad)) > Math.abs(Math.sin(best.rad)) ? v : best), v0);
    const w90 = v90.seg.bbox.x1 - v90.seg.bbox.x0 + 1;
    const rawL = w0;
    const rawW = Math.abs(Math.sin(v90.rad)) > 0.5 ? w90 : maxW * 0.7;
    const rawH = avgH;
    const m = Math.max(rawL, rawW, rawH);
    nz = clamp(Math.round((rawL / m) * maxDim), 6, maxDim);
    nx = clamp(Math.round((rawW / m) * maxDim), 6, maxDim);
    ny = clamp(Math.round((rawH / m) * maxDim), 6, maxDim);
  } else {
    const side = views.find(v => v.kind === 'side');
    const sw = side.seg.bbox.x1 - side.seg.bbox.x0 + 1;
    const sh = side.seg.bbox.y1 - side.seg.bbox.y0 + 1;
    const front = views.find(v => v.kind === 'front') || views.find(v => v.kind === 'back');
    const topV = views.find(v => v.kind === 'top');

    let wRatio = singleViewThickness;
    if (front) {
      const fw = front.seg.bbox.x1 - front.seg.bbox.x0 + 1;
      const fh = front.seg.bbox.y1 - front.seg.bbox.y0 + 1;
      wRatio = (sh / sw) * (fw / fh);
    } else if (topV) {
      const tw = topV.seg.bbox.x1 - topV.seg.bbox.x0 + 1;
      const th = topV.seg.bbox.y1 - topV.seg.bbox.y0 + 1;
      wRatio = tw / th;
    }

    const hRatio = sh / sw;
    const physMax = Math.max(1.0, hRatio, wRatio);
    nz = clamp(Math.round((1.0 / physMax) * maxDim / az), 6, maxDim);
    ny = clamp(Math.round((hRatio / physMax) * maxDim / ay), 4, maxDim);
    nx = clamp(Math.round((wRatio / physMax) * maxDim / ax), 4, maxDim);
  }

  const total = nx * ny * nz;
  const occ = new Uint8Array(total);
  const vIdx = (x, y, z) => x + nx * (z + nz * y);

  // Single-view rounded profile map if only 1 orthographic side view is provided
  const isSingleSide = !isTurntable && views.length === 1 && views[0].kind === 'side';
  const singleDist = isSingleSide && profile === 'rounded'
    ? silhouetteDistanceMap(views[0].seg.mask, views[0].seg.width, views[0].seg.height, views[0].seg.bbox)
    : null;

  // For turntable mode, compute projected bbox horizontal span per view so each view's
  // silhouette fits cleanly inside its bounding angle projection.
  const runCarve = (missTolerance) => {
    occ.fill(0);
    let count = 0;

    for (let y = 0; y < ny; y++) {
      const py = (y + 0.5) / ny; // 0 bottom .. 1 top
      for (let z = 0; z < nz; z++) {
        const pz = (z + 0.5) / nz - 0.5; // -0.5 rear .. +0.5 nose
        for (let x = 0; x < nx; x++) {
          const px = (x + 0.5) / nx - 0.5; // -0.5 left .. +0.5 right

          if (singleDist) {
            const u = pz + 0.5;
            const v = 1 - py;
            const hit = sampleViewAt(views[0], u, v).hit;
            if (!hit) continue;
            const dx = clamp(Math.floor(u * (singleDist.bw - 1e-4)), 0, singleDist.bw - 1);
            const dy = clamp(Math.floor(v * (singleDist.bh - 1e-4)), 0, singleDist.bh - 1);
            const dtVal = singleDist.dt[dy * singleDist.bw + dx];
            // Minimum half-width of 0.14 ensures thin fins/spoilers still keep >= 1-2 voxels.
            const maxHalf = Math.max(0.14, Math.pow(dtVal, 0.55));
            if (Math.abs(px) / 0.5 <= maxHalf) {
              occ[vIdx(x, y, z)] = 1;
              count++;
            }
            continue;
          }

          let misses = 0;
          for (let vi = 0; vi < views.length; vi++) {
            const vw = views[vi];
            let u, v;
            if (vw.kind === 'side') {
              u = pz + 0.5;
              v = 1 - py;
            } else if (vw.kind === 'otherSide') {
              u = 0.5 - pz;
              v = 1 - py;
            } else if (vw.kind === 'front') {
              u = 0.5 - px;
              v = 1 - py;
            } else if (vw.kind === 'back') {
              u = px + 0.5;
              v = 1 - py;
            } else if (vw.kind === 'top') {
              u = px + 0.5;
              v = 0.5 - pz;
            } else {
              // Turntable angle theta: 0 deg = side (+X looking toward -X, +Z is right of photo),
              // 90 deg = front (+Z looking toward -Z, -X is right of photo).
              // Projected horizontal axis in world coords is (-sin(theta), 0, cos(theta)).
              // Max extent of the unit box [-0.5..0.5]^2 along that axis is |sin(theta)| + |cos(theta)|,
              // or for an elliptical/compact object, normalize to the projected half-widths of (nx, nz):
              const rx = (nx * ax) / Math.max(nx * ax, nz * az);
              const rz = (nz * az) / Math.max(nx * ax, nz * az);
              const projSpan = Math.hypot(rz * vw.cos, rx * vw.sin) || 1;
              const horiz = (pz * rz * vw.cos - px * rx * vw.sin) / projSpan;
              u = 0.5 + horiz;
              v = 1 - py;
            }

            if (!sampleViewAt(vw, u, v).hit) {
              misses++;
              if (misses > missTolerance) break;
            }
          }

          if (misses <= missTolerance) {
            occ[vIdx(x, y, z)] = 1;
            count++;
          }
        }
      }
    }
    return count;
  };

  let voxelCount = runCarve(0);
  if (voxelCount < total * 0.005 && isTurntable && views.length >= 5) {
    voxelCount = runCarve(1);
  }
  if (voxelCount < 8) {
    throw new Error('That scan came out almost empty. Fill more of each photo with the object and keep it centered.');
  }

  // Project surface colors from the view most aligned with each voxel's outward normal.
  const rgb = new Uint8Array(total * 3);
  const projectUV = (vw, px, py, pz) => {
    if (vw.kind === 'side') return [pz + 0.5, 1 - py];
    if (vw.kind === 'otherSide') return [0.5 - pz, 1 - py];
    if (vw.kind === 'front') return [0.5 - px, 1 - py];
    if (vw.kind === 'back') return [px + 0.5, 1 - py];
    if (vw.kind === 'top') return [px + 0.5, 0.5 - pz];
    const rx = (nx * ax) / Math.max(nx * ax, nz * az);
    const rz = (nz * az) / Math.max(nx * ax, nz * az);
    const projSpan = Math.hypot(rz * vw.cos, rx * vw.sin) || 1;
    return [0.5 + (pz * rz * vw.cos - px * rx * vw.sin) / projSpan, 1 - py];
  };

  const fallbackRgb = (() => {
    const v0 = views[0];
    let r = 0, g = 0, b = 0, n = 0;
    for (let p = 0; p < v0.seg.mask.length; p++) {
      if (!v0.seg.mask[p]) continue;
      r += v0.img.data[p * 4];
      g += v0.img.data[p * 4 + 1];
      b += v0.img.data[p * 4 + 2];
      n++;
    }
    return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : [160, 165, 169];
  })();

  for (let y = 0; y < ny; y++) {
    const py = (y + 0.5) / ny;
    for (let z = 0; z < nz; z++) {
      const pz = (z + 0.5) / nz - 0.5;
      for (let x = 0; x < nx; x++) {
        const i = vIdx(x, y, z);
        if (!occ[i]) continue;
        const px = (x + 0.5) / nx - 0.5;

        // Outward normal estimate from empty 6-neighbors
        let onx = (x === nx - 1 || !occ[vIdx(x + 1, y, z)] ? 1 : 0) - (x === 0 || !occ[vIdx(x - 1, y, z)] ? 1 : 0);
        let ony = (y === ny - 1 || !occ[vIdx(x, y + 1, z)] ? 1 : 0) - (y === 0 || !occ[vIdx(x, y - 1, z)] ? 1 : 0);
        let onz = (z === nz - 1 || !occ[vIdx(x, y, z + 1)] ? 1 : 0) - (z === 0 || !occ[vIdx(x, y, z - 1)] ? 1 : 0);
        if (!onx && !ony && !onz) onx = 1;

        // Rank views by normal alignment
        const ranked = views
          .map(vw => ({ vw, score: onx * vw.dir[0] + ony * vw.dir[1] + onz * vw.dir[2] }))
          .sort((a, b) => b.score - a.score);

        let col = null;
        for (const { vw } of ranked) {
          const [u, v] = projectUV(vw, px, py, pz);
          col = sampleColorWithFallback(vw, u, v);
          if (col) break;
        }
        col ||= fallbackRgb;
        rgb[i * 3] = col[0];
        rgb[i * 3 + 1] = col[1];
        rgb[i * 3 + 2] = col[2];
      }
    }
  }

  const volume = {
    nx,
    ny,
    nz,
    cellAspect: [ax, ay, az],
    occ,
    rgb,
    viewsUsed: views.map(v => v.name),
    voxelCount,
    mode: isTurntable ? 'turntable' : 'views',
    singleViewProfile: singleDist ? 'rounded' : (isSingleSide ? 'flat' : 'multi'),
  };

  // Photo-resolution colour lookup for mesh vertices. The voxel `rgb` grid is only maxDim
  // wide, so colouring a smooth mesh from it smears decals and stripes; projecting each
  // vertex straight back into the photos keeps them sharp. Non-enumerable so volumes stay
  // cloneable / JSON-able.
  const kinds = new Set(views.map(v => v.kind));
  const mirrorOf = { side: 'otherSide', otherSide: 'side', front: 'back', back: 'front' };
  Object.defineProperty(volume, 'colorAt', {
    enumerable: false,
    value(px, py, pz, n) {
      let r = 0, g = 0, b = 0, wSum = 0;
      let best = null, bestScore = -Infinity;
      for (const vw of views) {
        let d = n[0] * vw.dir[0] + n[1] * vw.dir[1] + n[2] * vw.dir[2];
        // A side or front photo with no opposite photo also stands in for the hidden side
        // (cars and fish are roughly symmetric), at slightly lower weight.
        if (d < 0 && mirrorOf[vw.kind] && !kinds.has(mirrorOf[vw.kind])) d = -d * 0.9;
        if (d > bestScore) { bestScore = d; best = vw; }
        if (d <= 0.08) continue;
        const [u, v] = projectUV(vw, px, py, pz);
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        const col = sampleColorWithFallback(vw, u, v);
        if (!col) continue;
        const w = d * d * d; // favour the photo that looks straight at this face
        r += col[0] * w; g += col[1] * w; b += col[2] * w; wSum += w;
      }
      if (wSum > 0) return [r / wSum, g / wSum, b / wSum];
      if (best) {
        const [u, v] = projectUV(best, clamp(px, -0.5, 0.5), clamp(py, 0, 1), clamp(pz, -0.5, 0.5));
        const col = sampleColorWithFallback(best, clamp(u, 0, 1), clamp(v, 0, 1));
        if (col) return col;
      }
      return null;
    },
  });
  return volume;
}

/* ── Volume → Brick Grid Quantizer ────────────────────────────────────── */

/**
 * Resample any carved volume into a discrete voxel brick grid (`W * L * H`) indexed
 * `x + W * (z + L * y)`, matching Brick Rally's `car-model.mjs` layout.
 */
export function volumeToBrickGrid(volume, { W, L, H, paletteRgb, skipPaletteIndices = [15], fallbackColor = 11 }) {
  const { nx, ny, nz, occ, rgb } = volume;
  const cells = new Uint8Array(W * L * H);
  const idx = (x, y, z) => x + W * (z + L * y);
  const vIdx = (x, y, z) => x + nx * (z + nz * y);

  // Preserve proportions inside the (W, L, H) bounding box
  const scale = Math.min(W / nx, L / nz, H / ny);
  const outW = clamp(Math.round(nx * scale), 3, W);
  const outL = clamp(Math.round(nz * scale), 4, L);
  const outH = clamp(Math.round(ny * scale), 2, H);
  const xOff = Math.floor((W - outW) / 2);
  const zOff = Math.floor((L - outL) / 2);

  for (let oy = 0; oy < outH; oy++) {
    const sy0 = Math.floor((oy * ny) / outH);
    const sy1 = Math.max(sy0 + 1, Math.floor(((oy + 1) * ny) / outH));
    for (let oz = 0; oz < outL; oz++) {
      const sz0 = Math.floor((oz * nz) / outL);
      const sz1 = Math.max(sz0 + 1, Math.floor(((oz + 1) * nz) / outL));
      for (let ox = 0; ox < outW; ox++) {
        const sx0 = Math.floor((ox * nx) / outW);
        const sx1 = Math.max(sx0 + 1, Math.floor(((ox + 1) * nx) / outW));
        let n = 0, hit = 0, R = 0, G = 0, B = 0;
        for (let sy = sy0; sy < sy1; sy++) {
          for (let sz = sz0; sz < sz1; sz++) {
            for (let sx = sx0; sx < sx1; sx++) {
              n++;
              const vi = vIdx(sx, sy, sz);
              if (!occ[vi]) continue;
              hit++;
              R += rgb[vi * 3];
              G += rgb[vi * 3 + 1];
              B += rgb[vi * 3 + 2];
            }
          }
        }
        if (n && hit / n >= 0.35) {
          cells[idx(ox + xOff, oy, oz + zOff)] = nearestPaletteColor(
            R / hit, G / hit, B / hit, paletteRgb, { skip: skipPaletteIndices }
          ) || fallbackColor;
        }
      }
    }
  }
  return cells;
}

/* ── Volume → 3D Mesh (Surface Nets + Taubin smoothing, or Voxels) ────── */

function blurDensity3D(src, nx, ny, nz) {
  const sy = nx, sz = nx * ny;
  const tmp1 = new Float32Array(src.length);
  const tmp2 = new Float32Array(src.length);
  const dst = new Float32Array(src.length);

  // Separable [0.25, 0.5, 0.25] filter keeping boundary shell at 0
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      const row = y * sy + z * sz;
      for (let x = 1; x < nx - 1; x++) {
        const i = row + x;
        tmp1[i] = 0.25 * src[i - 1] + 0.5 * src[i] + 0.25 * src[i + 1];
      }
    }
  }
  for (let z = 0; z < nz; z++) {
    for (let x = 0; x < nx; x++) {
      for (let y = 1; y < ny - 1; y++) {
        const i = x + y * sy + z * sz;
        tmp2[i] = 0.25 * tmp1[i - sy] + 0.5 * tmp1[i] + 0.25 * tmp1[i + sy];
      }
    }
  }
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      for (let z = 1; z < nz - 1; z++) {
        const i = x + y * sy + z * sz;
        dst[i] = 0.25 * tmp2[i - sz] + 0.5 * tmp2[i] + 0.25 * tmp2[i + sz];
      }
    }
  }
  return dst;
}

function surfaceNets(density, nx, ny, nz, iso = 127.5) {
  const sy = nx, sz = nx * ny;
  const corner = [0, 1, sy, sy + 1, sz, sz + 1, sz + sy, sz + sy + 1];
  const cOff = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  const edges = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const cellVert = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const v = new Float32Array(8);

  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        const base = x + sy * y + sz * z;
        let mask = 0;
        for (let k = 0; k < 8; k++) {
          v[k] = density[base + corner[k]];
          if (v[k] > iso) mask |= 1 << k;
        }
        if (mask === 0 || mask === 255) continue;
        let px = 0, py = 0, pz = 0, cnt = 0;
        for (let e = 0; e < 12; e++) {
          const [a, b] = edges[e];
          if ((v[a] > iso) === (v[b] > iso)) continue;
          const denom = v[b] - v[a];
          const t = denom !== 0 ? (iso - v[a]) / denom : 0.5;
          px += cOff[a][0] + (cOff[b][0] - cOff[a][0]) * t;
          py += cOff[a][1] + (cOff[b][1] - cOff[a][1]) * t;
          pz += cOff[a][2] + (cOff[b][2] - cOff[a][2]) * t;
          cnt++;
        }
        cellVert[base] = pos.length / 3;
        pos.push(x + px / cnt, y + py / cnt, z + pz / cnt);
      }
    }
  }

  const indices = [];
  const cv = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= nx - 1 || y >= ny - 1 || z >= nz - 1)
    ? -1
    : cellVert[x + sy * y + sz * z];
  const quad = (a, b, c, d, outwardPositive) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (outwardPositive) indices.push(a, b, c, a, c, d);
    else indices.push(a, c, b, a, d, c);
  };

  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        const i = x + sy * y + sz * z;
        const inside = density[i] > iso;
        if (x + 1 < nx && (density[i + 1] > iso) !== inside && y > 0 && z > 0)
          quad(cv(x, y - 1, z - 1), cv(x, y, z - 1), cv(x, y, z), cv(x, y - 1, z), inside);
        if (y + 1 < ny && (density[i + sy] > iso) !== inside && z > 0 && x > 0)
          quad(cv(x - 1, y, z - 1), cv(x - 1, y, z), cv(x, y, z), cv(x, y, z - 1), inside);
        if (z + 1 < nz && (density[i + sz] > iso) !== inside && x > 0 && y > 0)
          quad(cv(x - 1, y - 1, z), cv(x, y - 1, z), cv(x, y, z), cv(x - 1, y, z), inside);
      }
    }
  }
  return { pos, indices };
}

function taubinSmooth(positions, indices, passes = 2, lambda = 0.45, mu = -0.47) {
  const nv = positions.length / 3;
  const neighbors = Array.from({ length: nv }, () => new Set());
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    neighbors[a].add(b); neighbors[a].add(c);
    neighbors[b].add(a); neighbors[b].add(c);
    neighbors[c].add(a); neighbors[c].add(b);
  }
  const adj = neighbors.map(s => Array.from(s));
  const tmp = new Float32Array(positions.length);

  const step = (w) => {
    for (let v = 0; v < nv; v++) {
      const nb = adj[v];
      if (!nb.length) {
        tmp[v * 3] = positions[v * 3];
        tmp[v * 3 + 1] = positions[v * 3 + 1];
        tmp[v * 3 + 2] = positions[v * 3 + 2];
        continue;
      }
      let ax = 0, ay = 0, az = 0;
      for (let k = 0; k < nb.length; k++) {
        const u = nb[k] * 3;
        ax += positions[u];
        ay += positions[u + 1];
        az += positions[u + 2];
      }
      const inv = 1 / nb.length;
      const vx = positions[v * 3], vy = positions[v * 3 + 1], vz = positions[v * 3 + 2];
      tmp[v * 3] = vx + w * (ax * inv - vx);
      tmp[v * 3 + 1] = vy + w * (ay * inv - vy);
      tmp[v * 3 + 2] = vz + w * (az * inv - vz);
    }
    positions.set(tmp);
  };

  for (let p = 0; p < passes; p++) {
    step(lambda);
    step(mu);
  }
}

function sampleVolumeColor(volume, lx, ly, lz) {
  const { nx, ny, nz, occ, rgb } = volume;
  const cx = clamp(Math.round(lx), 0, nx - 1);
  const cy = clamp(Math.round(ly), 0, ny - 1);
  const cz = clamp(Math.round(lz), 0, nz - 1);
  const vIdx = (x, y, z) => x + nx * (z + nz * y);

  let r = 0, g = 0, b = 0, wSum = 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const sx = cx + dx, sy = cy + dy, sz = cz + dz;
        if (sx < 0 || sy < 0 || sz < 0 || sx >= nx || sy >= ny || sz >= nz) continue;
        const vi = vIdx(sx, sy, sz);
        if (!occ[vi]) continue;
        const dist = Math.hypot(sx - lx, sy - ly, sz - lz);
        const w = 1 / (0.25 + dist);
        r += rgb[vi * 3] * w;
        g += rgb[vi * 3 + 1] * w;
        b += rgb[vi * 3 + 2] * w;
        wSum += w;
      }
    }
  }
  if (wSum > 0) return [r / (255 * wSum), g / (255 * wSum), b / (255 * wSum)];

  // Expand radius to 2 if vertex drifted slightly
  for (let rad = 2; rad <= 3; rad++) {
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const sx = clamp(cx + dx, 0, nx - 1);
          const sy = clamp(cy + dy, 0, ny - 1);
          const sz = clamp(cz + dz, 0, nz - 1);
          const vi = vIdx(sx, sy, sz);
          if (!occ[vi]) continue;
          return [rgb[vi * 3] / 255, rgb[vi * 3 + 1] / 255, rgb[vi * 3 + 2] / 255];
        }
      }
    }
  }
  return [0.7, 0.72, 0.75];
}

function buildVoxelMeshFromVolume(volume) {
  const { nx, ny, nz, occ, rgb } = volume;
  const vIdx = (x, y, z) => x + nx * (z + nz * y);
  const has = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < nx && y < ny && z < nz && occ[vIdx(x, y, z)];
  const faces = [
    { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
    { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
    { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
  ];
  const pos = [];
  const col = [];
  const indices = [];
  for (let y = 0; y < ny; y++) {
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        const vi = vIdx(x, y, z);
        if (!occ[vi]) continue;
        const r = rgb[vi * 3] / 255, g = rgb[vi * 3 + 1] / 255, b = rgb[vi * 3 + 2] / 255;
        for (const f of faces) {
          if (has(x + f.n[0], y + f.n[1], z + f.n[2])) continue;
          const base = pos.length / 3;
          const shade = f.n[1] < 0 ? 0.78 : 1;
          for (const k of f.c) {
            pos.push(x + k[0], y + k[1], z + k[2]);
            col.push(r * shade, g * shade, b * shade);
          }
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
    }
  }
  return { positions: new Float32Array(pos), colors: new Float32Array(col), indices };
}

function computeSmoothNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3, ib = indices[i + 1] * 3, ic = indices[i + 2] * 3;
    const ux = positions[ib] - positions[ia], uy = positions[ib + 1] - positions[ia + 1], uz = positions[ib + 2] - positions[ia + 2];
    const vx = positions[ic] - positions[ia], vy = positions[ic + 1] - positions[ia + 1], vz = positions[ic + 2] - positions[ia + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    normals[ia] += nx; normals[ia + 1] += ny; normals[ia + 2] += nz;
    normals[ib] += nx; normals[ib + 1] += ny; normals[ib + 2] += nz;
    normals[ic] += nx; normals[ic + 1] += ny; normals[ic + 2] += nz;
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }
  return normals;
}

function computeMeshBounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

/**
 * Convert a carved voxel volume into an indexed, vertex-colored 3D mesh.
 * Returns `{ positions, normals, colors, indices, bounds, vertexCount, triangleCount }`.
 */
export function volumeToMesh(volume, opts = {}) {
  const {
    style = 'smooth',
    targetSize = 1.0,
    centerY = false,
    forwardAxis = '+z',
    smoothPasses = 2,
    blurPasses = 1,
  } = opts;

  const { nx, ny, nz, occ, cellAspect = [1, 1, 1] } = volume;
  const [ax, ay, az] = cellAspect;
  let positions, colors, rawIndices;

  if (style === 'voxel') {
    const vm = buildVoxelMeshFromVolume(volume);
    positions = vm.positions;
    colors = vm.colors;
    rawIndices = vm.indices;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] *= ax;
      positions[i + 1] *= ay;
      positions[i + 2] *= az;
    }
  } else {
    // Pad with 1 empty voxel on all 6 faces so Surface Nets always closes the skin.
    const px = nx + 2, py = ny + 2, pz = nz + 2;
    let field = new Float32Array(px * py * pz);
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        for (let x = 0; x < nx; x++) {
          if (occ[x + nx * (z + nz * y)]) {
            field[(x + 1) + px * ((y + 1) + py * (z + 1))] = 255;
          }
        }
      }
    }
    for (let b = 0; b < blurPasses; b++) field = blurDensity3D(field, px, py, pz);

    const sn = surfaceNets(field, px, py, pz, 127.5);
    if (!sn.indices.length) {
      // Fallback to unblurred binary field if tiny feature blurred below iso
      const bin = new Float32Array(px * py * pz);
      for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
        if (occ[x + nx * (z + nz * y)]) bin[(x + 1) + px * ((y + 1) + py * (z + 1))] = 255;
      }
      const sn2 = surfaceNets(bin, px, py, pz, 127.5);
      positions = new Float32Array(sn2.pos);
      rawIndices = sn2.indices;
    } else {
      positions = new Float32Array(sn.pos);
      rawIndices = sn.indices;
    }

    if (smoothPasses > 0 && rawIndices.length) {
      taubinSmooth(positions, rawIndices, smoothPasses);
    }

    const nv = positions.length / 3;
    colors = new Float32Array(nv * 3);
    // Un-pad by 1.0 voxel (field sample i sits at coordinate i; voxel x is field x + 1).
    const grid = new Float32Array(positions.length);
    for (let k = 0; k < positions.length; k += 3) {
      grid[k] = positions[k] - 1.0;
      grid[k + 1] = positions[k + 1] - 1.0;
      grid[k + 2] = positions[k + 2] - 1.0;
      positions[k] = grid[k] * ax;
      positions[k + 1] = grid[k + 1] * ay;
      positions[k + 2] = grid[k + 2] * az;
    }
    // Normals in physical (aspect-corrected) space, which is the space the photos' view
    // directions live in.
    const physNormals = typeof volume.colorAt === 'function' && rawIndices.length
      ? computeSmoothNormals(positions, rawIndices)
      : null;
    for (let k = 0; k < nv; k++) {
      const lx = grid[k * 3], ly = grid[k * 3 + 1], lz = grid[k * 3 + 2];
      let c = null;
      if (physNormals) {
        const n = [physNormals[k * 3], physNormals[k * 3 + 1], physNormals[k * 3 + 2]];
        const rgb = volume.colorAt((lx + 0.5) / nx - 0.5, (ly + 0.5) / ny, (lz + 0.5) / nz - 0.5, n);
        if (rgb) c = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
      }
      c ||= sampleVolumeColor(volume, lx, ly, lz);
      colors[k * 3] = c[0];
      colors[k * 3 + 1] = c[1];
      colors[k * 3 + 2] = c[2];
    }
  }

  // Rotate +90° around Y if caller wants forward = +X: (x, y, z) -> (z, y, -x)
  if (forwardAxis === '+x') {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      positions[i] = z;
      positions[i + 2] = -x;
    }
  }

  // Center XZ and ground/center Y, then normalize max dimension to targetSize
  const b0 = computeMeshBounds(positions);
  const cx = (b0.min[0] + b0.max[0]) / 2;
  const cy = centerY ? (b0.min[1] + b0.max[1]) / 2 : b0.min[1];
  const cz = (b0.min[2] + b0.max[2]) / 2;
  const maxExt = Math.max(b0.size[0], b0.size[1], b0.size[2]) || 1;
  const scale = targetSize / maxExt;

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - cx) * scale;
    positions[i + 1] = (positions[i + 1] - cy) * scale;
    positions[i + 2] = (positions[i + 2] - cz) * scale;
  }

  const nv = positions.length / 3;
  const indices = nv > 65535 ? new Uint32Array(rawIndices) : new Uint16Array(rawIndices);
  const normals = computeSmoothNormals(positions, indices);
  const b1 = computeMeshBounds(positions);

  return {
    positions,
    normals,
    colors,
    indices,
    bounds: b1,
    vertexCount: nv,
    triangleCount: indices.length / 3,
  };
}

/* ── Orientation Calibration (shared with Fish Tank & Brick Rally) ─────── */

function norm3(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function quatFromUnitVectors(u, v) {
  const r = u[0] * v[0] + u[1] * v[1] + u[2] * v[2] + 1;
  if (r < 1e-6) {
    let ax = Math.abs(u[0]) > 0.1 ? [0, 1, 0] : [1, 0, 0];
    const c = norm3(cross3(u, ax));
    return [c[0], c[1], c[2], 0];
  }
  const c = cross3(u, v);
  const q = [c[0], c[1], c[2], r];
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

function mulQuat(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

function applyQuat(v, q) {
  const [x, y, z] = v;
  const [qx, qy, qz, qw] = q;
  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

function mat4FromQuat(q) {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  // Column-major 4x4 matching THREE.Matrix4.elements
  return new Float32Array([
    1 - (yy + zz), xy + wz, xz - wy, 0,
    xy - wz, 1 - (xx + zz), yz + wx, 0,
    xz + wy, yz - wx, 1 - (xx + yy), 0,
    0, 0, 0, 1,
  ]);
}

/**
 * Compute a column-major 4x4 rotation matrix (matching THREE.Matrix4.elements) from
 * student-placed orientation dots `{ head|front, tail|rear, back|top }`.
 * Identical math to the Classroom Fish Tank (`student-fishtank.mjs`) for `forwardAxis: '+x'`,
 * and cleanly supports `forwardAxis: '+z'` (Brick Rally / vehicles).
 */
export function computeOrientationMatrix(dots, { forwardAxis = '+x' } = {}) {
  const head = dots?.head || dots?.front;
  const tail = dots?.tail || dots?.rear;
  if (!head || !tail) {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }
  const fwd = norm3(sub3(head, tail));
  const back = dots?.back || dots?.top;

  if (back) {
    const upHint = norm3(sub3(back, tail));
    const right = norm3(cross3(fwd, upHint));
    const up = norm3(cross3(right, fwd));
    // Rows of rotation R map basis vectors -> canonical axes
    if (forwardAxis === '+z') {
      // fwd -> +Z, up -> +Y, right -> -X (proper rotation, det = +1)
      return new Float32Array([
        -right[0], up[0], fwd[0], 0,
        -right[1], up[1], fwd[1], 0,
        -right[2], up[2], fwd[2], 0,
        0, 0, 0, 1,
      ]);
    }
    // fwd -> +X, up -> +Y, right -> +Z
    return new Float32Array([
      fwd[0], up[0], right[0], 0,
      fwd[1], up[1], right[1], 0,
      fwd[2], up[2], right[2], 0,
      0, 0, 0, 1,
    ]);
  }

  // 2-point fallback: align forward, then roll-correct so original +Y stays closest to +Y
  const targetFwd = forwardAxis === '+z' ? [0, 0, 1] : [1, 0, 0];
  let q = quatFromUnitVectors(fwd, targetFwd);
  const rotUp = applyQuat([0, 1, 0], q);
  const projUp = forwardAxis === '+z' ? [rotUp[0], rotUp[1], 0] : [0, rotUp[1], rotUp[2]];
  if (projUp[0] ** 2 + projUp[1] ** 2 + projUp[2] ** 2 > 0.001) {
    const q2 = quatFromUnitVectors(norm3(projUp), [0, 1, 0]);
    q = mulQuat(q2, q);
  }
  return mat4FromQuat(q);
}

/** Apply dot orientation to a mesh's positions & normals, re-centering XZ and grounding/centering Y. */
export function applyOrientationToMesh(mesh, dots, { forwardAxis = '+x', centerY = false } = {}) {
  const m = computeOrientationMatrix(dots, { forwardAxis });
  const positions = new Float32Array(mesh.positions.length);
  const normals = new Float32Array(mesh.normals.length);

  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i], y = mesh.positions[i + 1], z = mesh.positions[i + 2];
    positions[i]     = m[0] * x + m[4] * y + m[8] * z;
    positions[i + 1] = m[1] * x + m[5] * y + m[9] * z;
    positions[i + 2] = m[2] * x + m[6] * y + m[10] * z;

    const nx = mesh.normals[i], ny = mesh.normals[i + 1], nz = mesh.normals[i + 2];
    normals[i]     = m[0] * nx + m[4] * ny + m[8] * nz;
    normals[i + 1] = m[1] * nx + m[5] * ny + m[9] * nz;
    normals[i + 2] = m[2] * nx + m[6] * ny + m[10] * nz;
  }

  const b = computeMeshBounds(positions);
  const cx = (b.min[0] + b.max[0]) / 2;
  const cy = centerY ? (b.min[1] + b.max[1]) / 2 : b.min[1];
  const cz = (b.min[2] + b.max[2]) / 2;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] -= cx;
    positions[i + 1] -= cy;
    positions[i + 2] -= cz;
  }

  return {
    ...mesh,
    positions,
    normals,
    bounds: computeMeshBounds(positions),
  };
}

/**
 * Compute default calibration dots on a canonically oriented mesh in preview coordinates
 * (`previewScale`, centered at origin).
 */
export function defaultDotsForMesh(mesh, { forwardAxis = '+x', previewScale = 2.5, keys = 'fish' } = {}) {
  const b = mesh.bounds || computeMeshBounds(mesh.positions);
  const maxExt = Math.max(b.size[0], b.size[1], b.size[2]) || 1;
  const s = previewScale / maxExt;
  const cx = (b.min[0] + b.max[0]) / 2;
  const cy = (b.min[1] + b.max[1]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;

  const head = forwardAxis === '+x'
    ? [(b.max[0] - cx) * s, 0, 0]
    : [0, 0, (b.max[2] - cz) * s];
  const tail = forwardAxis === '+x'
    ? [(b.min[0] - cx) * s, 0, 0]
    : [0, 0, (b.min[2] - cz) * s];
  const back = [0, (b.max[1] - cy) * s, 0];

  if (keys === 'car') {
    return { scale: previewScale, front: head, rear: tail, top: back };
  }
  return { scale: previewScale, head, tail, back, fins: [] };
}

/* ── GLB & STL Binary Exporters ───────────────────────────────────────── */

const srgbToLinearByte = (v) => {
  const c = clamp(v, 0, 1);
  const lin = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return clamp(Math.round(lin * 255), 0, 255);
};

/**
 * Encode an indexed vertex-colored mesh as a compact, spec-compliant binary glTF 2.0 (`.glb`)
 * `Uint8Array` ready for Three.js `GLTFLoader` and data-URL storage.
 */
export function encodeColoredGlb(mesh, { generator = 'ClassroomOS Scan3D', name = 'ScannedModel' } = {}) {
  const { positions, normals, colors, indices, bounds } = mesh;
  const vertexCount = positions.length / 3;
  const indexCount = indices.length;

  const useU32 = vertexCount > 65535;
  const idxArray = useU32
    ? (indices instanceof Uint32Array ? indices : new Uint32Array(indices))
    : (indices instanceof Uint16Array ? indices : new Uint16Array(indices));
  const idxBytesRaw = new Uint8Array(idxArray.buffer, idxArray.byteOffset, idxArray.byteLength);
  const idxPad = (4 - (idxBytesRaw.byteLength % 4)) % 4;

  const posBytes = new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength);
  const nrmBytes = new Uint8Array(normals.buffer, normals.byteOffset, normals.byteLength);

  // VEC4 UNSIGNED_BYTE normalized COLOR_0 in linear space (4 bytes/vertex -> always 4-byte aligned)
  const colRgba = new Uint8Array(vertexCount * 4);
  for (let i = 0; i < vertexCount; i++) {
    colRgba[i * 4] = srgbToLinearByte(colors[i * 3]);
    colRgba[i * 4 + 1] = srgbToLinearByte(colors[i * 3 + 1]);
    colRgba[i * 4 + 2] = srgbToLinearByte(colors[i * 3 + 2]);
    colRgba[i * 4 + 3] = 255;
  }

  const posOffset = idxBytesRaw.byteLength + idxPad;
  const nrmOffset = posOffset + posBytes.byteLength;
  const colOffset = nrmOffset + nrmBytes.byteLength;
  const binLength = colOffset + colRgba.byteLength;

  const b = bounds || computeMeshBounds(positions);
  const jsonObj = {
    asset: { version: '2.0', generator },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    materials: [{
      name: `${name} Material`,
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        metallicFactor: 0.05,
        roughnessFactor: 0.55,
      },
      doubleSided: false,
    }],
    meshes: [{
      name,
      primitives: [{
        attributes: { POSITION: 1, NORMAL: 2, COLOR_0: 3 },
        indices: 0,
        material: 0,
      }],
    }],
    buffers: [{ byteLength: binLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: idxBytesRaw.byteLength, target: 34963 },
      { buffer: 0, byteOffset: posOffset, byteLength: posBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: nrmOffset, byteLength: nrmBytes.byteLength, target: 34962 },
      { buffer: 0, byteOffset: colOffset, byteLength: colRgba.byteLength, target: 34962 },
    ],
    accessors: [
      { bufferView: 0, componentType: useU32 ? 5125 : 5123, count: indexCount, type: 'SCALAR' },
      {
        bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3',
        min: [b.min[0], b.min[1], b.min[2]],
        max: [b.max[0], b.max[1], b.max[2]],
      },
      { bufferView: 2, componentType: 5126, count: vertexCount, type: 'VEC3' },
      { bufferView: 3, componentType: 5121, normalized: true, count: vertexCount, type: 'VEC4' },
    ],
  };

  const jsonRaw = new TextEncoder().encode(JSON.stringify(jsonObj));
  const jsonPad = (4 - (jsonRaw.byteLength % 4)) % 4;
  const total = 12 + 8 + jsonRaw.byteLength + jsonPad + 8 + binLength;

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); // 'glTF'
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonRaw.byteLength + jsonPad, true);
  view.setUint32(16, 0x4e4f534a, true); // 'JSON'
  out.set(jsonRaw, 20);
  out.fill(0x20, 20 + jsonRaw.byteLength, 20 + jsonRaw.byteLength + jsonPad);

  const binHeader = 20 + jsonRaw.byteLength + jsonPad;
  view.setUint32(binHeader, binLength, true);
  view.setUint32(binHeader + 4, 0x004e4942, true); // 'BIN\0'
  const binStart = binHeader + 8;
  out.set(idxBytesRaw, binStart);
  out.set(posBytes, binStart + posOffset);
  out.set(nrmBytes, binStart + nrmOffset);
  out.set(colRgba, binStart + colOffset);

  return out;
}

/**
 * Encode an indexed mesh as a print-ready binary STL (`Uint8Array`, Z-up, seated on Z=0),
 * scaled so its largest dimension is `sizeMm` millimetres.
 */
export function encodeStl(mesh, { sizeMm = 80, header = 'ClassroomOS Scan3D' } = {}) {
  const { positions, indices, bounds } = mesh;
  const b = bounds || computeMeshBounds(positions);
  const maxExt = Math.max(b.size[0], b.size[1], b.size[2]) || 1;
  const s = sizeMm / maxExt;
  const soup = new Float32Array(indices.length * 3);
  for (let i = 0; i < indices.length; i++) {
    const vi = indices[i] * 3;
    soup[i * 3] = positions[vi] * s;
    soup[i * 3 + 1] = positions[vi + 1] * s;
    soup[i * 3 + 2] = positions[vi + 2] * s;
  }
  const prepared = prepareForPrint(soup, { yUp: true });
  return new Uint8Array(writeBinaryStl(prepared, header));
}

/** Encode a Uint8Array as a base64 `data:` URL safely without call-stack overflow. */
export function bytesToDataUrl(bytes, mime = 'model/gltf-binary') {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const CHUNK = 0x8000;
  let bin = '';
  for (let i = 0; i < arr.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, i + CHUNK));
  }
  const base64 = typeof btoa === 'function'
    ? btoa(bin)
    : Buffer.from(arr).toString('base64');
  return `data:${mime};base64,${base64}`;
}
