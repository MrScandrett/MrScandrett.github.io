/* Wireless-mic RF coordination math (pure, no DOM).
   Used by lessons/technical-elements/audio-engineering/wireless-mic-rf-coordination.html
   and tests/wireless-rf.test.mjs.

   Model: a receiver front end is slightly non-linear, so transmitters on f1, f2, f3 mix
   into third-order products 2·fa − fb and fa + fb − fc. A product that lands within
   `clearance` MHz of a carrier lands inside that receiver's channel and raises its noise
   floor or captures it. All frequencies are MHz. */

export const BAND = { lo: 470, hi: 608 };            // US TV channels 14–36
export const GRID = 0.025;                           // 25 kHz tuning step

/** Lower edge of a US UHF TV channel (14–36) in MHz. */
export function tvChannelEdge(ch) { return 470 + 6 * (ch - 14); }

export function tvChannelOf(mhz) {
  if (mhz < BAND.lo || mhz >= BAND.hi) return null;
  return 14 + Math.floor((mhz - BAND.lo) / 6);
}

/** Wavelength in metres for a frequency in MHz. */
export function wavelengthM(mhz) { return 299.792458 / mhz; }

/** How many third-order products n transmitters make. */
export function productCounts(n) {
  const two = n < 2 ? 0 : n * (n - 1);                       // 2fa − fb, ordered pairs
  const three = n < 3 ? 0 : (n * (n - 1) * (n - 2)) / 2;     // fa + fb − fc, distinct
  return { two, three, total: two + three };
}

/** Every third-order product of the carrier set, with the carriers that make it. */
export function products(freqs) {
  const out = [];
  const n = freqs.length;
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      if (a !== b) out.push({ f: 2 * freqs[a] - freqs[b], kind: 2, from: [a, b] });
    }
  }
  for (let c = 0; c < n; c++) {
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        if (a !== c && b !== c) out.push({ f: freqs[a] + freqs[b] - freqs[c], kind: 3, from: [a, b, c] });
      }
    }
  }
  return out;
}

/** Check a plan. Returns hits (product inside a carrier's channel) and too-close pairs. */
export function analyze(freqs, { clearance = 0.25, minSpacing = 0.3 } = {}) {
  const hits = [];
  const eps = 1e-9;
  for (const p of products(freqs)) {
    for (let k = 0; k < freqs.length; k++) {
      if (Math.abs(p.f - freqs[k]) < clearance - eps) hits.push({ ...p, victim: k });
    }
  }
  const close = [];
  for (let a = 0; a < freqs.length; a++) {
    for (let b = a + 1; b < freqs.length; b++) {
      if (Math.abs(freqs[a] - freqs[b]) < minSpacing - eps) close.push([a, b]);
    }
  }
  const victims = new Set(hits.map((h) => h.victim));
  close.forEach(([a, b]) => { victims.add(a); victims.add(b); });
  return { hits, close, victims: [...victims].sort((x, y) => x - y), clean: hits.length === 0 && close.length === 0 };
}

/** Free ranges inside [lo, hi] once the blocked TV channels are removed. */
export function freeRanges(blockedChannels, lo = BAND.lo, hi = BAND.hi) {
  const blocked = new Set(blockedChannels);
  const out = [];
  let start = null;
  for (let ch = 14; ch <= 36; ch++) {
    const a = tvChannelEdge(ch), b = a + 6;
    if (b <= lo || a >= hi) continue;
    if (blocked.has(ch)) {
      if (start !== null) { out.push([start, a]); start = null; }
    } else if (start === null) start = Math.max(a, lo);
  }
  if (start !== null) out.push([start, hi]);
  return out;
}

/** Find n carriers in the free ranges with no collisions, lowest frequencies first.
    A depth-first search on the 25 kHz grid with a node budget, so it always returns. */
export function coordinate(n, ranges, { clearance = 0.25, minSpacing = 0.3, budget = 400000 } = {}) {
  const cands = [];
  for (const [a, b] of ranges) {
    // keep carriers 0.1 MHz inside the edge so the channel doesn't spill into a TV station
    const lo = Math.ceil((a + 0.1) / GRID - 1e-9), hi = Math.floor((b - 0.1) / GRID + 1e-9);
    for (let i = lo; i <= hi; i++) cands.push(+(i * GRID).toFixed(3));
  }
  let nodes = 0;
  const chosen = [];

  function ok(f) {
    for (const c of chosen) if (Math.abs(c - f) < minSpacing - 1e-9) return false;
    chosen.push(f);
    const clean = analyze(chosen, { clearance, minSpacing }).clean;
    chosen.pop();
    return clean;
  }

  function dfs(from) {
    if (chosen.length === n) return true;
    for (let i = from; i < cands.length; i++) {
      if (++nodes > budget) return false;
      if (cands.length - i < n - chosen.length) return false;
      if (ok(cands[i])) {
        chosen.push(cands[i]);
        if (dfs(i + 1)) return true;
        chosen.pop();
        if (nodes > budget) return false;
      }
    }
    return false;
  }

  const found = dfs(0);
  return found ? { ok: true, freqs: chosen.slice(), nodes } : { ok: false, freqs: [], nodes };
}

/** Optimal Golomb rulers: every pairwise difference (and so every pairwise sum) is unique,
    which is exactly "no third-order product lands on a carrier". Marks are in units of the
    clearance, so n mics need at least length × clearance MHz. */
export const GOLOMB = {
  2: [0, 1],
  3: [0, 1, 3],
  4: [0, 1, 4, 6],
  5: [0, 1, 4, 9, 11],
  6: [0, 1, 4, 10, 12, 17],
  7: [0, 1, 4, 10, 18, 23, 25],
  8: [0, 1, 4, 9, 15, 22, 32, 34],
  9: [0, 1, 5, 12, 25, 27, 35, 41, 44],
  10: [0, 1, 6, 10, 23, 26, 34, 41, 53, 55],
};

/** Illustrative TV lineups (made up; real ones depend on the venue's location). */
export const PRESETS = {
  empty: { label: 'Open field (no stations)', blocked: [] },
  suburb: { label: 'Suburb (illustrative)', blocked: [15, 17, 22, 27, 30, 33] },
  city: { label: 'Big city (illustrative)', blocked: [14, 15, 16, 17, 19, 21, 22, 24, 26, 27, 28, 30, 31, 33, 35, 36] },
};
