/* Wi-Fi sensing core: the physics and the signal chain behind "Seeing Breath in Wi-Fi".
 *
 * Pure functions, no DOM, so the lesson page and tests/wifi-sensing.test.mjs share one implementation.
 *
 *   1. Physics   CsiSynth builds the Channel State Information (CSI) a Wi-Fi chip would report:
 *                one complex number per subcarrier = the sum of every path the radio took
 *                (direct, bounces off walls, and one bounce off a moving chest).
 *   2. Signal    resample -> detrend -> band-pass 0.1-0.6 Hz -> combine the best subcarriers
 *                -> spectrum -> strongest peak = breaths per minute.
 *   3. Stream    parseCsiLine reads the text the ESP32 recipe sends over USB.
 *
 * The same chain runs on simulated frames, on a CSV recording, and on a live ESP32.
 */

export const TAU = Math.PI * 2;
export const C0 = 299792458;

/** The 52 data subcarriers of a 20 MHz Wi-Fi channel, 312.5 kHz apart (index -26..26 without 0). */
export const SUB_K = (() => { const a = []; for (let k = -26; k <= 26; k++) if (k !== 0) a.push(k); return a; })();
export const N_SUB = SUB_K.length;
export const SUB_SPACING_HZ = 312500;

export const BANDS = {
  '2.4': { label: '2.4 GHz (channel 6)', f0: 2.437e9 },
  '5': { label: '5 GHz (channel 36)', f0: 5.18e9 },
};

/** Counts per unit amplitude, so simulated numbers look like the ESP32's integer readings. */
export const AMP_SCALE = 45;

export const wavelengthM = (f) => C0 / f;

/** Phase swing (radians) of a reflection whose path lengthens by 2 x the chest travel. */
export function phaseSwing(chestMm, f0 = BANDS['2.4'].f0) {
  return (TAU * 2 * (chestMm / 1000)) / wavelengthM(f0);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rng) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rng());
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/* ------------------------------------------------------------------ physics */

/** A 4.0 x 2.4 m patch of classroom, router on the left, receiver on the right, three wall bounces. */
export function makeRoom(seed = 7) {
  const rng = mulberry32(seed);
  return {
    w: 4.0,
    h: 2.4,
    tx: [0.25, 1.2],
    rx: [3.75, 1.2],
    bounces: [[1.7, 0.34], [3.1, 0.26], [5.3, 0.18]].map(([extra, gain]) => ({ extra, gain, phase: rng() * TAU })),
  };
}

/** Relative strength of the body's reflection next to the direct path (about -13 dB). */
export const BODY_GAIN = 0.22;

/** Unit vector the chest moves along: toward the link line (inhale), so every seat has a sensible geometry. */
export function chestNormal(room, pos) {
  return pos[1] < room.tx[1] ? [0, 1] : [0, -1];
}

/** The path TX -> chest -> RX with the chest pushed `d` metres along its normal. */
export function bodyPath(room, pos, d = 0) {
  const n = chestNormal(room, pos);
  const p = [pos[0] + n[0] * d, pos[1] + n[1] * d];
  const len = dist(room.tx, p) + dist(p, room.rx);
  return { len, gain: BODY_GAIN * dist(room.tx, room.rx) / len, phase: Math.PI };
}

/** Complex sum of the static (wall + direct) paths on one subcarrier. */
export function staticField(room, f) {
  const D = dist(room.tx, room.rx);
  let re = Math.cos(-TAU * f * D / C0);
  let im = Math.sin(-TAU * f * D / C0);
  for (const b of room.bounces) {
    const a = -TAU * f * (D + b.extra) / C0 + b.phase;
    re += b.gain * Math.cos(a);
    im += b.gain * Math.sin(a);
  }
  return [re, im];
}

function addPath(field, f, path) {
  const a = -TAU * f * path.len / C0 + path.phase;
  return [field[0] + path.gain * Math.cos(a), field[1] + path.gain * Math.sin(a)];
}

export const subFreq = (f0, k) => f0 + k * SUB_SPACING_HZ;

/**
 * How much the CSI amplitude swings for a chest travelling +-(mm/2) at each point of the room.
 * `k` is a subcarrier index, or 'best' for the best of 13 spread across the channel
 * (what picking good subcarriers buys you). Returns {nx, ny, values (0..1 normalised), max}.
 */
export function sensitivityMap(room, { band = '2.4', k = 0, chestMm = 5, nx = 200, ny = 120 } = {}) {
  const f0 = BANDS[band].f0;
  const ks = k === 'best' ? SUB_K.filter((_, i) => i % 4 === 0) : [k || 1];
  const statics = ks.map((kk) => staticField(room, subFreq(f0, kk)));
  const freqs = ks.map((kk) => subFreq(f0, kk));
  const values = new Float32Array(nx * ny);
  const half = chestMm / 2000;
  let max = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const pos = [((i + 0.5) / nx) * room.w, ((j + 0.5) / ny) * room.h];
      const hi = bodyPath(room, pos, half);
      const lo = bodyPath(room, pos, -half);
      let best = 0;
      for (let s = 0; s < ks.length; s++) {
        const a = Math.hypot(...addPath(statics[s], freqs[s], hi));
        const b = Math.hypot(...addPath(statics[s], freqs[s], lo));
        const swing = Math.abs(a - b);
        if (swing > best) best = swing;
      }
      values[j * nx + i] = best;
      if (best > max) max = best;
    }
  }
  if (max > 0) for (let i = 0; i < values.length; i++) values[i] /= max;
  return { nx, ny, values, max };
}

/* ------------------------------------------------------------------ the breather */

function ou(state, tau, sigma, dt, rng) {
  return state + (-state / tau) * dt + sigma * Math.sqrt((2 * dt) / tau) * gaussian(rng);
}

/** Chest displacement (m): a slightly lopsided breath wave whose rate and depth drift like a real person's. */
export class Breather {
  constructor(rng, { bpm = 16, mm = 5 } = {}) {
    this.rng = rng;
    this.bpm = bpm;
    this.mm = mm;
    this.phase = rng() * TAU;
    this.rateWobble = 0;
    this.depthWobble = 0;
    this.sway = 0;
  }
  step(dt) {
    const r = this.rng;
    this.rateWobble = ou(this.rateWobble, 12, 0.03, dt, r);
    this.depthWobble = ou(this.depthWobble, 15, 0.12, dt, r);
    this.sway = ou(this.sway, 20, 0.0012, dt, r);
    this.phase += TAU * (this.bpm / 60) * (1 + this.rateWobble) * dt;
    const shape = (Math.sin(this.phase) + 0.18 * Math.sin(2 * this.phase - 0.9)) / 1.1;
    return (this.mm / 2000) * (1 + this.depthWobble) * shape + this.sway;
  }
}

/* ------------------------------------------------------------------ the radio */

/** Generates CSI frames: amps[52] per packet, the way the ESP32 recipe reports them. */
export class CsiSynth {
  constructor({ seed = 1, band = '2.4', fs = 20, bpm = 16, mm = 5, noise = 0.25, pos = [1.9, 0.55], quantize = true, drift = 5 } = {}) {
    this.rng = mulberry32(seed);
    this.room = makeRoom(7);
    this.fs = fs;
    this.t = 0;
    this.seq = 0;
    this.noise = noise;
    this.quantize = quantize;
    this.drift = drift;
    this.driftPhase = [this.rng() * TAU, this.rng() * TAU];
    this.pos = pos.slice();
    this.breather = new Breather(this.rng, { bpm, mm });
    this.walkerUntil = -1;
    this.walkerStart = 0;
    this.setBand(band);
  }
  setBand(band) {
    this.band = band;
    this.f0 = BANDS[band].f0;
    this.statics = SUB_K.map((k) => staticField(this.room, subFreq(this.f0, k)));
  }
  set({ bpm, mm, noise, pos, band, quantize, drift } = {}) {
    if (drift != null) this.drift = drift;
    if (bpm != null) this.breather.bpm = bpm;
    if (mm != null) this.breather.mm = mm;
    if (noise != null) this.noise = noise;
    if (pos != null) this.pos = pos.slice();
    if (quantize != null) this.quantize = quantize;
    if (band != null && band !== this.band) this.setBand(band);
  }
  /** Someone walks through the beam for `seconds`. */
  triggerWalker(seconds = 6) {
    this.walkerStart = this.t;
    this.walkerUntil = this.t + seconds;
  }
  get walking() { return this.t < this.walkerUntil; }
  get sigma() { return 0.002 + 0.04 * this.noise * this.noise; }

  /** Advance one packet and return {seq, t, rssi, amps, chestMm}. */
  step() {
    const dt = 1 / this.fs;
    const d = this.breather.step(dt);
    const body = bodyPath(this.room, this.pos, d);
    let walker = null;
    if (this.walking) {
      const u = this.t - this.walkerStart;
      walker = { len: 6.5 + 1.1 * Math.sin(TAU * 0.7 * u) + 0.7 * Math.sin(TAU * 1.3 * u + 1), gain: 0.3, phase: 0 };
    }
    const amps = new Array(N_SUB);
    const sigma = this.sigma;
    // Slow common-mode wander (gain control, temperature, a door opening elsewhere): a real receiver has it.
    const wander = this.drift * (Math.sin(TAU * 0.011 * this.t + this.driftPhase[0]) + 0.6 * Math.sin(TAU * 0.027 * this.t + this.driftPhase[1]));
    for (let i = 0; i < N_SUB; i++) {
      const f = subFreq(this.f0, SUB_K[i]);
      let h = addPath(this.statics[i], f, body);
      if (walker) h = addPath(h, f, walker);
      const re = h[0] + sigma * gaussian(this.rng);
      const im = h[1] + sigma * gaussian(this.rng);
      const a = Math.hypot(re, im) * AMP_SCALE + wander;
      amps[i] = this.quantize ? Math.round(a) : a;
    }
    const frame = { seq: this.seq++, t: this.t, rssi: -48, amps, chestMm: d * 1000 };
    this.t += dt;
    return frame;
  }
}

/** A whole recording, the same shape as a live stream. */
export function makeRecording({ seconds = 40, fs = 20, ...opts } = {}) {
  const synth = new CsiSynth({ fs, ...opts });
  const frames = [];
  const n = Math.round(seconds * fs);
  for (let i = 0; i < n; i++) frames.push(synth.step());
  return frames;
}

/* ------------------------------------------------------------------ stream format */

/** One text line per packet: C,seq,ms,rssi,a0,a1,...  (amplitudes of the subcarriers, integers). */
export function formatCsiLine(frame) {
  return ['C', frame.seq, Math.round(frame.t * 1000), frame.rssi, ...frame.amps].join(',');
}

export function parseCsiLine(line) {
  if (typeof line !== 'string') return null;
  const s = line.trim();
  if (!s.startsWith('C,')) return null;
  const f = s.split(',');
  if (f.length < 4 + 8) return null;
  const nums = f.slice(1).map(Number);
  if (nums.some((v) => !Number.isFinite(v))) return null;
  const [seq, ms, rssi, ...amps] = nums;
  return { seq, t: ms / 1000, rssi, amps };
}

export function framesToCsv(frames) {
  return frames.map(formatCsiLine).join('\n') + '\n';
}

export function parseCsv(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const fr = parseCsiLine(line);
    if (fr) out.push(fr);
  }
  return out;
}

/* ------------------------------------------------------------------ signal processing */

export function linearDetrend(x) {
  const n = x.length;
  if (n < 2) return Float64Array.from(x);
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += i; sy += x[i]; sxx += i * i; sxy += i * x[i]; }
  const den = n * sxx - sx * sx;
  const slope = den === 0 ? 0 : (n * sxy - sx * sy) / den;
  const icpt = (sy - slope * sx) / n;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = x[i] - (icpt + slope * i);
  return out;
}

function biquad(type, fs, fc, Q = Math.SQRT1_2) {
  const w0 = (TAU * fc) / fs;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Q);
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
  else { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
  const a0 = 1 + alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 };
}

function runBiquad(x, c) {
  const y = new Float64Array(x.length);
  let x1 = x[0], x2 = x[0], y1 = x[0], y2 = x[0];
  for (let i = 0; i < x.length; i++) {
    const v = c.b0 * x[i] + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

function reversed(x) { const y = new Float64Array(x.length); for (let i = 0; i < x.length; i++) y[i] = x[x.length - 1 - i]; return y; }

/** Forward-and-backward filtering: no phase shift, so peaks stay where the breaths really were. */
export function filtfilt(x, c, pad) {
  const n = x.length;
  const p = Math.min(n - 1, pad);
  const ext = new Float64Array(n + 2 * p);
  for (let i = 0; i < p; i++) ext[i] = 2 * x[0] - x[p - i];
  ext.set(x, p);
  for (let i = 0; i < p; i++) ext[p + n + i] = 2 * x[n - 1] - x[n - 2 - i];
  const fwd = runBiquad(ext, c);
  const back = reversed(runBiquad(reversed(fwd), c));
  return back.slice(p, p + n);
}

export function bandpass(x, fs, lo = 0.1, hi = 0.6) {
  const pad = Math.round(fs * 10);
  const a = filtfilt(linearDetrend(x), biquad('hp', fs, lo), pad);
  return filtfilt(a, biquad('lp', fs, hi), pad);
}

/** Linear-interpolate irregular packets onto an even clock (Wi-Fi packets never arrive on a metronome). */
export function resampleUniform(ts, vals, fs, t0 = ts[0], t1 = ts[ts.length - 1]) {
  const n = Math.max(0, Math.floor((t1 - t0) * fs) + 1);
  const out = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i / fs;
    while (j < ts.length - 2 && ts[j + 1] < t) j++;
    const ta = ts[j], tb = ts[j + 1] ?? ts[j];
    const u = tb === ta ? 0 : Math.min(1, Math.max(0, (t - ta) / (tb - ta)));
    out[i] = vals[j] + u * ((vals[j + 1] ?? vals[j]) - vals[j]);
  }
  return out;
}

/** Hann-windowed Fourier power at each frequency in [fmin, fmax]. */
export function spectrum(x, fs, { fmin = 0.05, fmax = 0.8, df = 0.005 } = {}) {
  const n = x.length;
  const win = new Float64Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n || 1;
  for (let i = 0; i < n; i++) win[i] = (x[i] - mean) * (0.5 - 0.5 * Math.cos((TAU * i) / Math.max(1, n - 1)));
  const f = [], p = [];
  for (let fr = fmin; fr <= fmax + 1e-9; fr += df) {
    let re = 0, im = 0;
    const w = (TAU * fr) / fs;
    for (let i = 0; i < n; i++) { re += win[i] * Math.cos(w * i); im -= win[i] * Math.sin(w * i); }
    f.push(fr);
    p.push((re * re + im * im) / (n * n));
  }
  return { f, p };
}

/** Strongest peak inside the breathing band -> breaths per minute, and how far it stands above the floor. */
export function estimateRate(spec, { fmin = 0.1, fmax = 0.7 } = {}) {
  let best = -1, bi = -1;
  for (let i = 0; i < spec.f.length; i++) {
    if (spec.f[i] < fmin || spec.f[i] > fmax) continue;
    if (spec.p[i] > best) { best = spec.p[i]; bi = i; }
  }
  if (bi < 0) return { hz: 0, bpm: 0, snr: 0 };
  let f = spec.f[bi];
  if (bi > 0 && bi < spec.f.length - 1) {
    const a = spec.p[bi - 1], b = spec.p[bi], c = spec.p[bi + 1];
    const den = a - 2 * b + c;
    if (den < 0) f += (0.5 * (a - c) / den) * (spec.f[1] - spec.f[0]);
  }
  const sorted = spec.p.slice().sort((u, v) => u - v);
  const floor = sorted[Math.floor(sorted.length / 2)] || 1e-12;
  return { hz: f, bpm: f * 60, snr: best / floor, peakIndex: bi };
}

/**
 * Rank every subcarrier by how much breathing-band energy it holds, flip the ones that move the opposite way
 * (a blind spot for one subcarrier is a peak for its neighbour), and average the best few.
 */
export function combineSubcarriers(columns, fs, { top = 6, lo = 0.1, hi = 0.6, filter = true } = {}) {
  const bands = columns.map((c) => (filter ? bandpass(c, fs, lo, hi) : linearDetrend(c)));
  const energy = bands.map((b) => { let e = 0; for (let i = 0; i < b.length; i++) e += b[i] * b[i]; return e; });
  const order = energy.map((e, i) => i).sort((a, b) => energy[b] - energy[a]).slice(0, top);
  const ref = bands[order[0]];
  const n = ref.length;
  const combined = new Float64Array(n);
  for (const idx of order) {
    let dot = 0;
    for (let i = 0; i < n; i++) dot += bands[idx][i] * ref[i];
    const sign = dot < 0 ? -1 : 1;
    for (let i = 0; i < n; i++) combined[i] += (sign * bands[idx][i]) / order.length;
  }
  return { combined, picks: order, energy, bands };
}

/**
 * The whole chain on a list of frames {t, amps}. Returns every intermediate stage so the lesson can draw them.
 * `window` seconds from the end are used; the output clock is `fsOut` Hz.
 */
export function analyze(frames, { fsOut = 10, window = 30, top = 6, lo = 0.1, hi = 0.6, sub = null, filter = true } = {}) {
  if (frames.length < 8) return null;
  const tEnd = frames[frames.length - 1].t;
  const tStart = Math.max(frames[0].t, tEnd - window);
  const use = frames.filter((f) => f.t >= tStart);
  if (use.length < 8) return null;
  const ts = use.map((f) => f.t);
  const nSub = use[0].amps.length;
  const columns = [];
  for (let k = 0; k < nSub; k++) columns.push(resampleUniform(ts, use.map((f) => f.amps[k]), fsOut, ts[0], ts[ts.length - 1]));
  const span = (columns[0].length - 1) / fsOut;
  if (span < 12) return { tooShort: true, span };
  let picks, combined, raw;
  if (sub != null && sub >= 0 && sub < nSub) {
    raw = columns[sub];
    combined = filter ? bandpass(raw, fsOut, lo, hi) : linearDetrend(raw);
    picks = [sub];
  } else {
    const c = combineSubcarriers(columns, fsOut, { top, lo, hi, filter });
    combined = c.combined;
    picks = c.picks;
    raw = columns[picks[0]];
  }
  const spec = spectrum(combined, fsOut);
  // Without the filter the "tallest bump" search covers everything on screen, so slow drift can win.
  const est = filter ? estimateRate(spec) : estimateRate(spec, { fmin: 0.05, fmax: 0.8 });
  return { fs: fsOut, span, raw, band: combined, spec, est, picks, columns };
}
