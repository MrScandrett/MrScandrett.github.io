// Brick Rally scanner (pure: works on ImageData-shaped objects { width, height, data }).
//
// Three photos of a real brick car on a plain background, side / front / top, become a
// voxel car by *space carving*: a cell is kept only if every photo's silhouette covers it.
// That is the same idea as a "visual hull" in computer vision: each photo is a stencil,
// and the car is whatever survives all three stencils. It cannot see hollows that no photo
// sees into (the inside of a cup stays solid), which is a good thing to discuss in class.
//
//   side:  car's nose pointing RIGHT, camera level with the car
//   front: looking straight at the nose
//   top:   from above, nose pointing UP
// Front and top are optional; without them the car is assumed 8 studs wide and flat-topped.

import { W, L, H, PALETTE, emptyCar, idx, hexToRgb } from './car-model.mjs';

const PAL = PALETTE.map(p => (p ? hexToRgb(p.hex).map(v => v * 255) : null));

export function nearestPalette(r, g, b, { allowGlass = false } = {}) {
  let best = 1, bestD = Infinity;
  for (let i = 1; i < PAL.length; i++) {
    if (i === 15 && !allowGlass) continue;
    const p = PAL[i];
    // weighted RGB ("redmean") distance: cheap and close to how eyes judge colour
    const rm = (r + p[0]) / 2;
    const dr = r - p[0], dg = g - p[1], db = b - p[2];
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function median(arr) {
  const a = Array.from(arr).sort((x, y) => x - y);
  return a[a.length >> 1];
}

/** Separate the car from a plain background. Returns { mask, width, height, bbox } or null. */
export function segment(img) {
  const { width: w, height: h, data } = img;
  // 1. Background colour = median of the border pixels.
  const br = [], bg = [], bb = [];
  const sample = (x, y) => { const i = (y * w + x) * 4; br.push(data[i]); bg.push(data[i + 1]); bb.push(data[i + 2]); };
  for (let x = 0; x < w; x++) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y++) { sample(0, y); sample(w - 1, y); }
  const bgc = [median(br), median(bg), median(bb)];
  // 2. Distance of every pixel from it, then Otsu's threshold on those distances.
  const dist = new Float32Array(w * h);
  const hist = new Array(256).fill(0);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const d = Math.min(255, Math.hypot(data[i] - bgc[0], data[i + 1] - bgc[1], data[i + 2] - bgc[2]));
    dist[p] = d;
    hist[d | 0]++;
  }
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 0, thr = 40;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = w * h - wB; if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = t; }
  }
  thr = Math.max(thr, 32);
  const raw = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) raw[p] = dist[p] > thr ? 1 : 0;
  // 3. Keep the biggest blob (plus any blob at least a tenth its size: a spoiler on posts).
  const label = new Int32Array(w * h);
  const sizes = [0];
  const stack = [];
  for (let p = 0; p < w * h; p++) {
    if (!raw[p] || label[p]) continue;
    const id = sizes.length; let n = 0;
    label[p] = id; stack.push(p);
    while (stack.length) {
      const q = stack.pop(); n++;
      const x = q % w, y = (q / w) | 0;
      if (x > 0 && raw[q - 1] && !label[q - 1]) { label[q - 1] = id; stack.push(q - 1); }
      if (x < w - 1 && raw[q + 1] && !label[q + 1]) { label[q + 1] = id; stack.push(q + 1); }
      if (y > 0 && raw[q - w] && !label[q - w]) { label[q - w] = id; stack.push(q - w); }
      if (y < h - 1 && raw[q + w] && !label[q + w]) { label[q + w] = id; stack.push(q + w); }
    }
    sizes.push(n);
  }
  const biggest = Math.max(0, ...sizes);
  if (biggest < w * h * 0.01) return null;
  const mask = new Uint8Array(w * h);
  const bbox = { x0: w, y0: h, x1: -1, y1: -1 };
  for (let p = 0; p < w * h; p++) {
    if (!label[p] || sizes[label[p]] < biggest * 0.1) continue;
    mask[p] = 1;
    const x = p % w, y = (p / w) | 0;
    if (x < bbox.x0) bbox.x0 = x; if (x > bbox.x1) bbox.x1 = x;
    if (y < bbox.y0) bbox.y0 = y; if (y > bbox.y1) bbox.y1 = y;
  }
  return { mask, width: w, height: h, bbox, background: bgc, threshold: thr };
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
 * Carve a car from up to three photos. `shots` = { side, front?, top? }, each an ImageData-like.
 * Returns { cells, dims, report } or throws with a student-readable message.
 */
export function carveCar(shots) {
  if (!shots.side) throw new Error('Take the side photo first: it sets the car\'s length and height.');
  const segs = {};
  for (const k of ['side', 'front', 'top']) {
    if (!shots[k]) continue;
    const s = segment(shots[k]);
    if (!s) throw new Error(`Couldn't find the car in the ${k} photo. Use a plain background that isn't the same colour as the car.`);
    segs[k] = s;
  }
  const dims = scanDims(segs);
  const { len, height, width } = dims;
  const side = toGrid(shots.side, segs.side, len, height);
  const front = segs.front ? toGrid(shots.front, segs.front, width, height) : null;
  const top = segs.top ? toGrid(shots.top, segs.top, width, len) : null;
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
