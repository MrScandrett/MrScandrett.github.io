/* pixels.mjs — the pixel math behind Layer Lab's tools. Pure functions on
 * ImageData-shaped objects ({ width, height, data: Uint8ClampedArray RGBA })
 * and single-channel masks (Uint8Array, 0 = off, 255 = fully on), so each one
 * can be read as a worked example and tested in Node.
 */

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
export const luminance = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Biggest per-channel difference between pixel i and a color. */
function dist(d, i, r, g, b, a) {
  return Math.max(Math.abs(d[i] - r), Math.abs(d[i + 1] - g), Math.abs(d[i + 2] - b), Math.abs(d[i + 3] - a));
}

/* ── selection ─────────────────────────────────────────────────────────── */

/** Magic wand: pixels within `tolerance` of the clicked color. */
export function magicWand(img, x, y, tolerance = 32, contiguous = true) {
  const { width: W, height: H, data: d } = img;
  const mask = new Uint8Array(W * H);
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return mask;
  const s = (y * W + x) * 4;
  const r = d[s], g = d[s + 1], b = d[s + 2], a = d[s + 3];
  if (!contiguous) {
    for (let i = 0, j = 0; i < W * H; i++, j += 4) if (dist(d, j, r, g, b, a) <= tolerance) mask[i] = 255;
    return mask;
  }
  const stack = [y * W + x];
  mask[y * W + x] = 255;
  while (stack.length) {
    const i = stack.pop();
    const px = i % W, py = (i - px) / W;
    const n = [px > 0 ? i - 1 : -1, px < W - 1 ? i + 1 : -1, py > 0 ? i - W : -1, py < H - 1 ? i + W : -1];
    for (const k of n) {
      if (k < 0 || mask[k]) continue;
      if (dist(d, k * 4, r, g, b, a) <= tolerance) { mask[k] = 255; stack.push(k); }
    }
  }
  return mask;
}

/** Soft "color range" selection: full inside `fuzz`, fading to nothing at 1.5 × fuzz. */
export function colorRange(img, [r, g, b], fuzz = 40) {
  const { width: W, height: H, data: d } = img;
  const mask = new Uint8Array(W * H);
  const edge = Math.max(1, fuzz * 0.5);
  for (let i = 0, j = 0; i < W * H; i++, j += 4) {
    if (d[j + 3] === 0) continue;
    const dd = Math.max(Math.abs(d[j] - r), Math.abs(d[j + 1] - g), Math.abs(d[j + 2] - b));
    mask[i] = dd <= fuzz ? 255 : dd >= fuzz + edge ? 0 : Math.round(255 * (1 - (dd - fuzz) / edge));
  }
  return mask;
}

/**
 * Select subject: grow the background inward from every border pixel. A pixel
 * joins if it is close to its neighbor (`step`) and to the border color it
 * grew from (`tolerance`), so a gradient backdrop still counts as one
 * background. Whatever the background never reached is the subject; specks
 * smaller than `minArea` (stars, dust, noise) are dropped.
 */
export function selectSubject(img, { tolerance = 48, step = 18, minArea } = {}) {
  const { width: W, height: H, data: d } = img;
  const N = W * H;
  const bg = new Uint8Array(N);
  const seed = new Int32Array(N);
  const queue = new Int32Array(N);
  let qh = 0, qt = 0;
  const push = (i, s) => { bg[i] = 1; seed[i] = s; queue[qt++] = i; };
  for (let x = 0; x < W; x++) { push(x, x); if (H > 1 && !bg[(H - 1) * W + x]) push((H - 1) * W + x, (H - 1) * W + x); }
  for (let y = 1; y < H - 1; y++) { push(y * W, y * W); if (W > 1) push(y * W + W - 1, y * W + W - 1); }
  while (qh < qt) {
    const i = queue[qh++];
    const px = i % W, py = (i - px) / W;
    const sj = seed[i] * 4, j = i * 4;
    const n = [px > 0 ? i - 1 : -1, px < W - 1 ? i + 1 : -1, py > 0 ? i - W : -1, py < H - 1 ? i + W : -1];
    for (const k of n) {
      if (k < 0 || bg[k]) continue;
      const kj = k * 4;
      if (d[kj + 3] < 8 || (dist(d, kj, d[j], d[j + 1], d[j + 2], d[j + 3]) <= step && dist(d, kj, d[sj], d[sj + 1], d[sj + 2], d[sj + 3]) <= tolerance)) push(k, seed[i]);
    }
  }
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) mask[i] = bg[i] ? 0 : 255;
  return dropSmallIslands(mask, W, H, minArea ?? Math.max(32, Math.round(N * 0.0015)));
}

/** Clear connected "on" regions smaller than minArea pixels. */
export function dropSmallIslands(mask, W, H, minArea) {
  const label = new Int32Array(W * H).fill(-1);
  const stack = [];
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || label[s] !== -1) continue;
    const members = [s];
    label[s] = s; stack.push(s);
    while (stack.length) {
      const i = stack.pop();
      const px = i % W, py = (i - px) / W;
      const n = [px > 0 ? i - 1 : -1, px < W - 1 ? i + 1 : -1, py > 0 ? i - W : -1, py < H - 1 ? i + W : -1];
      for (const k of n) if (k >= 0 && mask[k] && label[k] === -1) { label[k] = s; stack.push(k); members.push(k); }
    }
    if (members.length < minArea) for (const i of members) mask[i] = 0;
  }
  return mask;
}

/** Box-blur a single-channel mask (3 passes ≈ Gaussian). Returns a new mask. */
export function blurMask(mask, W, H, r) {
  r = Math.round(r);
  if (r < 1) return mask.slice();
  let a = Float32Array.from(mask), b = new Float32Array(W * H);
  for (let pass = 0; pass < 3; pass++) {
    boxPass(a, b, W, H, r, 1, W); // rows
    boxPass(b, a, H, W, r, W, 1); // columns
  }
  return Uint8Array.from(a, (v) => clamp255(Math.round(v)));
}

function boxPass(src, dst, lines, len, r, step, lineStep) {
  const span = 2 * r + 1;
  for (let l = 0; l < lines; l++) {
    const base = l * lineStep;
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[base + Math.min(len - 1, Math.max(0, k)) * step];
    for (let x = 0; x < len; x++) {
      dst[base + x * step] = acc / span;
      const add = Math.min(len - 1, x + r + 1), sub = Math.max(0, x - r);
      acc += src[base + add * step] - src[base + sub * step];
    }
  }
}

export const featherMask = blurMask;

/** Grow (r > 0) or shrink (r < 0) a selection by about r pixels. */
export function expandMask(mask, W, H, r) {
  if (!r) return mask.slice();
  const blurred = blurMask(mask, W, H, Math.abs(r));
  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = r > 0 ? (blurred[i] > 8 ? 255 : 0) : blurred[i] > 247 ? 255 : 0;
  return out;
}

/* ── retouching ────────────────────────────────────────────────────────── */

/**
 * Content-aware fill (a classroom-sized version). Fills masked pixels from the
 * outside in, each new ring averaging the pixels already known (an "onion
 * peel"). Smooth fills look plasticky, so it then borrows texture: the
 * fine detail (pixel minus its local average) from a nearby patch the same
 * shape, just outside the hole. Soft mask edges blend with the original.
 */
export function contentAwareFill(img, mask, { seed = 1 } = {}) {
  const { width: W, height: H, data: d } = img;
  const N = W * H;
  const orig = d.slice();
  const known = new Uint8Array(N);
  let x0 = W, y0 = H, x1 = -1, y1 = -1, holes = 0;
  for (let i = 0; i < N; i++) {
    if (mask[i] > 127) {
      holes++;
      const x = i % W, y = (i - x) / W;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    } else known[i] = 1;
  }
  if (!holes || holes === N) return img;
  const acc = new Float32Array(5);
  let ring = [];
  for (let i = 0; i < N; i++) if (!known[i] && hasKnownNeighbor(i)) ring.push(i);
  function hasKnownNeighbor(i) {
    const x = i % W, y = (i - x) / W;
    return (x > 0 && known[i - 1]) || (x < W - 1 && known[i + 1]) || (y > 0 && known[i - W]) || (y < H - 1 && known[i + W]);
  }
  while (ring.length) {
    const vals = [];
    for (const i of ring) {
      const x = i % W, y = (i - x) / W;
      acc.fill(0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        if (!known[k]) continue;
        const wgt = dx && dy ? 0.7 : 1, j = k * 4;
        acc[0] += d[j] * wgt; acc[1] += d[j + 1] * wgt; acc[2] += d[j + 2] * wgt; acc[3] += d[j + 3] * wgt; acc[4] += wgt;
      }
      vals.push(acc[0] / acc[4], acc[1] / acc[4], acc[2] / acc[4], acc[3] / acc[4]);
    }
    ring.forEach((i, n) => { const j = i * 4; d[j] = vals[n * 4]; d[j + 1] = vals[n * 4 + 1]; d[j + 2] = vals[n * 4 + 2]; d[j + 3] = vals[n * 4 + 3]; known[i] = 1; });
    const next = new Set();
    for (const i of ring) {
      const x = i % W, y = (i - x) / W;
      for (const k of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (k >= 0 && !known[k]) next.add(k);
    }
    ring = [...next];
  }
  // smooth the streaks the peel leaves
  for (let it = 0; it < 4; it++) {
    const src = d.slice();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (mask[i] <= 127) continue;
      for (let c = 0; c < 4; c++) {
        let s = 0, n = 0;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          s += src[(ny * W + nx) * 4 + c]; n++;
        }
        d[i * 4 + c] = s / n;
      }
    }
  }
  // borrow texture from a same-shaped patch beside the hole
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const offsets = [[bw + 3, 0], [-(bw + 3), 0], [0, bh + 3], [0, -(bh + 3)], [bw + 3, bh + 3], [-(bw + 3), -(bh + 3)]];
  let best = null;
  for (const [ox, oy] of offsets) {
    let ok = 0, total = 0;
    for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) {
      if (mask[y * W + x] <= 127) continue;
      total++;
      const sx = x + ox, sy = y + oy;
      if (sx >= 0 && sy >= 0 && sx < W && sy < H && mask[sy * W + sx] <= 127) ok++;
    }
    if (total && ok / total > 0.97) { best = [ox, oy]; break; }
  }
  const local = (buf, x, y, c) => {
    let s = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = Math.min(W - 1, Math.max(0, x + dx)), ny = Math.min(H - 1, Math.max(0, y + dy));
      s += buf[(ny * W + nx) * 4 + c]; n++;
    }
    return s / n;
  };
  let rand = seed >>> 0 || 1;
  const rnd = () => { rand ^= rand << 13; rand ^= rand >>> 17; rand ^= rand << 5; return ((rand >>> 0) / 4294967296) - 0.5; };
  const sigma = best ? 0 : ringNoise(orig, mask, W, H, x0, y0, x1, y1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x;
    if (!mask[i]) continue;
    const j = i * 4;
    if (best) {
      const sx = x + best[0], sy = y + best[1];
      if (sx >= 0 && sy >= 0 && sx < W && sy < H) for (let c = 0; c < 3; c++) d[j + c] = clamp255(d[j + c] + (orig[(sy * W + sx) * 4 + c] - local(orig, sx, sy, c)));
    } else if (sigma > 0.5) {
      const n = rnd() * sigma * 2.4;
      for (let c = 0; c < 3; c++) d[j + c] = clamp255(d[j + c] + n);
    }
    const t = mask[i] / 255;
    for (let c = 0; c < 4; c++) d[j + c] = Math.round(orig[j + c] * (1 - t) + d[j + c] * t);
  }
  return img;
}

function ringNoise(d, mask, W, H, x0, y0, x1, y1) {
  let s = 0, n = 0;
  for (let y = Math.max(1, y0 - 6); y <= Math.min(H - 2, y1 + 6); y++) for (let x = Math.max(1, x0 - 6); x <= Math.min(W - 2, x1 + 6); x++) {
    const i = y * W + x;
    if (mask[i]) continue;
    const j = i * 4;
    const l = luminance(d[j], d[j + 1], d[j + 2]);
    const m = (luminance(d[j - 4], d[j - 3], d[j - 2]) + luminance(d[j + 4], d[j + 5], d[j + 6])) / 2;
    s += (l - m) ** 2; n++;
  }
  return n ? Math.sqrt(s / n) : 0;
}

/* ── adjustments ───────────────────────────────────────────────────────── */

export const ADJUSTMENTS = {
  'brightness-contrast': { label: 'Brightness / Contrast', params: { brightness: [0, -100, 100], contrast: [0, -100, 100] } },
  'hue-saturation': { label: 'Hue / Saturation', params: { hue: [0, -180, 180], saturation: [0, -100, 100], lightness: [0, -100, 100] } },
  levels: { label: 'Levels', params: { black: [0, 0, 250], gamma: [1, 0.2, 3, 0.05], white: [255, 5, 255] } },
  temperature: { label: 'Warm / Cool filter', params: { warmth: [25, -100, 100] } },
  'black-white': { label: 'Black & White', params: {} },
  invert: { label: 'Invert', params: {} },
  posterize: { label: 'Posterize', params: { levels: [4, 2, 16, 1] } },
  threshold: { label: 'Threshold', params: { level: [128, 1, 255] } },
};

export function defaultParams(kind) {
  const out = {};
  for (const [k, [v]] of Object.entries(ADJUSTMENTS[kind].params)) out[k] = v;
  return out;
}

function lutFor(kind, p) {
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    let o = v;
    if (kind === 'brightness-contrast') {
      const C = (p.contrast ?? 0) * 2.55;
      const f = (259 * (C + 255)) / (255 * (259 - C));
      o = f * (v - 128) + 128 + (p.brightness ?? 0) * 1.5;
    } else if (kind === 'levels') {
      const b = p.black ?? 0, w = Math.max(b + 1, p.white ?? 255);
      const t = Math.min(1, Math.max(0, (v - b) / (w - b)));
      o = 255 * Math.pow(t, 1 / (p.gamma || 1));
    } else if (kind === 'invert') o = 255 - v;
    else if (kind === 'posterize') { const n = Math.max(2, Math.round(p.levels ?? 4)); o = Math.round((v / 255) * (n - 1)) / (n - 1) * 255; }
    lut[v] = o;
  }
  return lut;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const dd = max - min;
  const s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min);
  const h = max === r ? (g - b) / dd + (g < b ? 6 : 0) : max === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
  return [h * 60, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** Apply an adjustment in place. `mask` (optional) scales the effect per pixel. */
export function applyAdjustment(img, kind, params = {}, mask = null) {
  const d = img.data, N = img.width * img.height;
  const p = { ...defaultParams(kind), ...params };
  const lut = ['brightness-contrast', 'levels', 'invert', 'posterize'].includes(kind) ? lutFor(kind, p) : null;
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    if (d[j + 3] === 0) continue;
    const t = mask ? mask[i] / 255 : 1;
    if (!t) continue;
    const r = d[j], g = d[j + 1], b = d[j + 2];
    let R, G, B;
    if (lut) { R = lut[r]; G = lut[g]; B = lut[b]; }
    else if (kind === 'black-white') { R = G = B = luminance(r, g, b); }
    else if (kind === 'threshold') { R = G = B = luminance(r, g, b) >= p.level ? 255 : 0; }
    else if (kind === 'temperature') { const k = p.warmth * 0.6; R = r + k; G = g + k * 0.2; B = b - k; }
    else if (kind === 'hue-saturation') {
      let [h, s, l] = rgbToHsl(r, g, b);
      h += p.hue;
      s = Math.min(1, Math.max(0, s * (1 + p.saturation / 100)));
      l = p.lightness >= 0 ? l + (1 - l) * p.lightness / 100 : l * (1 + p.lightness / 100);
      [R, G, B] = hslToRgb(h, s, l);
    } else { R = r; G = g; B = b; }
    d[j] = r + (R - r) * t; d[j + 1] = g + (G - g) * t; d[j + 2] = b + (B - b) * t;
  }
  return img;
}

/** Auto tone: stretch each channel so the darkest 0.5% become black and the brightest 0.5% white. */
export function autoTone(img, clip = 0.005) {
  const d = img.data, N = img.width * img.height;
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let count = 0;
  for (let j = 0; j < N * 4; j += 4) { if (d[j + 3] < 16) continue; count++; hist[0][d[j]]++; hist[1][d[j + 1]]++; hist[2][d[j + 2]]++; }
  if (!count) return { img, ranges: [] };
  const ranges = hist.map((h) => {
    let lo = 0, hi = 255, acc = 0;
    while (lo < 255 && (acc += h[lo]) <= count * clip) lo++;
    acc = 0;
    while (hi > 0 && (acc += h[hi]) <= count * clip) hi--;
    return hi > lo ? [lo, hi] : [0, 255];
  });
  for (let j = 0; j < N * 4; j += 4) for (let c = 0; c < 3; c++) {
    const [lo, hi] = ranges[c];
    d[j + c] = ((d[j + c] - lo) * 255) / (hi - lo);
  }
  return { img, ranges };
}

/* ── filters ───────────────────────────────────────────────────────────── */

/** Gaussian-ish blur on premultiplied color, so transparent edges don't go dark. */
export function blur(img, radius, mask = null) {
  const { width: W, height: H, data: d } = img;
  const N = W * H;
  const ch = [0, 1, 2, 3].map(() => new Float32Array(N));
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    const a = d[j + 3] / 255;
    ch[0][i] = d[j] * a; ch[1][i] = d[j + 1] * a; ch[2][i] = d[j + 2] * a; ch[3][i] = d[j + 3];
  }
  const r = Math.max(1, Math.round(radius / 1.7));
  const tmp = new Float32Array(N);
  for (const c of ch) for (let pass = 0; pass < 3; pass++) { boxPass(c, tmp, H, W, r, 1, W); boxPass(tmp, c, W, H, r, W, 1); }
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    const t = mask ? mask[i] / 255 : 1;
    if (!t) continue;
    const a = ch[3][i], s = a > 0 ? 255 / a : 0;
    const nr = ch[0][i] * s, ng = ch[1][i] * s, nb = ch[2][i] * s;
    d[j] += (nr - d[j]) * t; d[j + 1] += (ng - d[j + 1]) * t; d[j + 2] += (nb - d[j + 2]) * t; d[j + 3] += (a - d[j + 3]) * t;
  }
  return img;
}

/** Unsharp mask: push each pixel away from its blurred neighborhood. */
export function sharpen(img, amount = 0.8, radius = 2, mask = null) {
  const soft = blur({ width: img.width, height: img.height, data: img.data.slice() }, radius);
  const d = img.data, s = soft.data;
  for (let i = 0, j = 0; i < img.width * img.height; i++, j += 4) {
    const t = mask ? mask[i] / 255 : 1;
    for (let c = 0; c < 3; c++) d[j + c] = d[j + c] + (d[j + c] - s[j + c]) * amount * t;
  }
  return img;
}

export function addNoise(img, amount = 20, seed = 7, mask = null) {
  const d = img.data;
  let x = seed >>> 0 || 1;
  for (let i = 0, j = 0; i < img.width * img.height; i++, j += 4) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    const n = (((x >>> 0) / 4294967296) - 0.5) * 2 * amount * (mask ? mask[i] / 255 : 1);
    d[j] += n; d[j + 1] += n; d[j + 2] += n;
  }
  return img;
}

export function pixelate(img, size = 8, mask = null) {
  const { width: W, height: H, data: d } = img;
  const src = d.slice();
  for (let by = 0; by < H; by += size) for (let bx = 0; bx < W; bx += size) {
    const s = [0, 0, 0, 0]; let n = 0;
    for (let y = by; y < Math.min(H, by + size); y++) for (let x = bx; x < Math.min(W, bx + size); x++) { const j = (y * W + x) * 4; for (let c = 0; c < 4; c++) s[c] += src[j + c]; n++; }
    for (let y = by; y < Math.min(H, by + size); y++) for (let x = bx; x < Math.min(W, bx + size); x++) {
      const i = y * W + x, j = i * 4, t = mask ? mask[i] / 255 : 1;
      for (let c = 0; c < 4; c++) d[j + c] = src[j + c] + (s[c] / n - src[j + c]) * t;
    }
  }
  return img;
}

/* ── analysis ──────────────────────────────────────────────────────────── */

export function histogram(img) {
  const d = img.data;
  const h = { r: new Uint32Array(256), g: new Uint32Array(256), b: new Uint32Array(256), l: new Uint32Array(256) };
  for (let j = 0; j < d.length; j += 4) {
    if (d[j + 3] < 16) continue;
    h.r[d[j]]++; h.g[d[j + 1]]++; h.b[d[j + 2]]++; h.l[Math.round(luminance(d[j], d[j + 1], d[j + 2]))]++;
  }
  return h;
}

/** Bounding box of pixels with alpha > 0, or null when the layer is empty. */
export function alphaBounds(rgba, W, H) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    for (let x = 0; x < W; x++) if (rgba[row + x * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/* ── blend-mode math (W3C Compositing and Blending), channels 0–1 ─────── */

export function blendChannel(mode, b, s) {
  switch (mode) {
    case 'multiply': return b * s;
    case 'screen': return b + s - b * s;
    case 'overlay': return blendChannel('hard-light', s, b);
    case 'darken': return Math.min(b, s);
    case 'lighten': return Math.max(b, s);
    case 'color-dodge': return b === 0 ? 0 : s === 1 ? 1 : Math.min(1, b / (1 - s));
    case 'color-burn': return b === 1 ? 1 : s === 0 ? 0 : 1 - Math.min(1, (1 - b) / s);
    case 'hard-light': return s <= 0.5 ? b * 2 * s : blendChannel('screen', b, 2 * s - 1);
    case 'soft-light': {
      if (s <= 0.5) return b - (1 - 2 * s) * b * (1 - b);
      const D = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
      return b + (2 * s - 1) * (D - b);
    }
    case 'difference': return Math.abs(b - s);
    case 'exclusion': return b + s - 2 * b * s;
    default: return s;
  }
}
