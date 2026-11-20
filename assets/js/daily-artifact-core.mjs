// Daily Artifact Guesser: pure helpers (no DOM). tests/daily-artifact.test.mjs covers them.
// One artifact a day, in the order of data/daily-artifact-bank.json. A student inspects it in 3D or
// as a photograph, then pins where it was made and says what year. Years are integers, BCE negative,
// with no year 0 (1 BCE is -1, 1 CE is 1), so a ±1 error across the boundary is ignored on purpose.

export const FIRST_DAY = Date.UTC(2026, 10, 20); // Nov 20, 2026 shows the first artifact
export const NOW_YEAR = 2026;
export const MIN_YEAR = -3000000;
export const MAX_YEAR = NOW_YEAR;
export const MAX_POINTS = 5000;
export const CLUE_PENALTY = 0.1;
const DAY_MS = 86400000;
const EARTH_KM = 6371.0088;

export function artifactForDay(key, artifacts) {
  const [y, m, d] = key.split('-').map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - FIRST_DAY) / DAY_MS);
  return artifacts[((days % artifacts.length) + artifacts.length) % artifacts.length];
}

// ── distance and scores ──────────────────────────────────────────────────
export function distanceKm([lon1, lat1], [lon2, lat2]) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// GeoGuessr's world curve: ~25 km is a perfect pin, then 5000·e^(-d/1500).
export function locationScore(km) {
  return Math.round(MAX_POINTS * Math.exp(-Math.max(0, km - 25) / 1500));
}

// How far off a year guess may be before the score halves-and-more. It grows with the artifact's
// age: 50 years is a miss for the Apollo capsule and a rounding error for Lascaux.
export function yearTolerance(actual) {
  return 30 + 0.12 * Math.max(0, NOW_YEAR - actual);
}

export function yearScore(guess, actual) {
  const tolerance = yearTolerance(actual);
  const miss = Math.max(0, Math.abs(guess - actual) - tolerance * 0.05);
  return Math.round(MAX_POINTS * Math.exp(-miss / tolerance));
}

export function roundScore({ km, guessYear, actualYear, clue = false }) {
  const location = locationScore(km);
  const year = yearScore(guessYear, actualYear);
  const raw = location + year;
  const total = clue ? Math.round(raw * (1 - CLUE_PENALTY)) : raw;
  return { location, year, raw, total, penalty: raw - total };
}

export const TIERS = [
  [9000, 'Master curator'],
  [7000, 'Field archaeologist'],
  [4500, 'Museum guide'],
  [2000, 'Eager intern'],
  [0, 'Treasure hunter in training']
];
export const tierFor = (total) => TIERS.find(([min]) => total >= min)[1];

// ── years: display and input ─────────────────────────────────────────────
const group = new Intl.NumberFormat('en-US');

export function formatYear(year) {
  if (year < 0) {
    const bce = -year;
    if (bce >= 1000000) return `${Number((bce / 1000000).toFixed(2))} million BCE`;
    return `${group.format(bce)} BCE`;
  }
  return year >= 1000 ? String(year) : `${year} CE`;
}

export function formatYearDiff(diff) {
  const n = Math.abs(Math.round(diff));
  if (n === 0) return 'spot on';
  if (n >= 1000000) return `${Number((n / 1000000).toFixed(2))} million years off`;
  return `${group.format(n)} year${n === 1 ? '' : 's'} off`;
}

// "1,500,000", "1.5 million", "2.5k" with an era from the select or typed ("bce", "ad").
export function parseYear(text, era = 'CE') {
  let s = String(text ?? '').trim().toLowerCase().replace(/,/g, '');
  if (!s) return null;
  let bce = era === 'BCE';
  const tagged = s.match(/\s*(b\.?c\.?e?\.?|a\.?d\.?|c\.?e\.?)\s*$/);
  if (tagged) {
    bce = tagged[1].startsWith('b');
    s = s.slice(0, tagged.index);
  }
  const m = s.trim().match(/^(\d+(?:\.\d+)?)\s*(million|mil|m|thousand|k)?$/);
  if (!m) return null;
  const scale = { million: 1e6, mil: 1e6, m: 1e6, thousand: 1e3, k: 1e3 }[m[2]] ?? 1;
  let value = Math.round(Number(m[1]) * scale);
  if (value === 0) return null;
  if (bce) value = -value;
  return value < MIN_YEAR || value > MAX_YEAR ? null : value;
}

// ── the time ruler ───────────────────────────────────────────────────────
// A straight slider can't hold 3 million years and 1903 at once, so the ruler is piecewise: each
// stretch gets the room a student needs to be precise in it. Positions are 0…1.
export const RULER = [
  [0, MIN_YEAR],
  [0.12, -100000],
  [0.24, -10000],
  [0.46, -1000],
  [0.62, 1],
  [0.78, 1000],
  [1, MAX_YEAR]
];

export function yearFromRuler(p) {
  const t = Math.min(1, Math.max(0, p));
  for (let i = 1; i < RULER.length; i++) {
    const [p1, y1] = RULER[i];
    if (t <= p1) {
      const [p0, y0] = RULER[i - 1];
      return niceYear(y0 + ((t - p0) / (p1 - p0)) * (y1 - y0));
    }
  }
  return MAX_YEAR;
}

export function rulerFromYear(year) {
  const y = Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
  for (let i = 1; i < RULER.length; i++) {
    const [p1, y1] = RULER[i];
    if (y <= y1) {
      const [p0, y0] = RULER[i - 1];
      return p0 + ((y - y0) / (y1 - y0)) * (p1 - p0);
    }
  }
  return 1;
}

// How far one nudge moves a year of this size: 1 in the recent centuries, 10,000 deep in the Ice Age.
export function yearStep(year) {
  const a = Math.abs(year);
  return a < 100 ? 1 : a < 1000 ? 5 : a < 5000 ? 10 : a < 20000 ? 100 : a < 200000 ? 1000 : 10000;
}

// Dragging a slider shouldn't produce 4,317 BCE: snap to a step that fits the scale.
export function niceYear(raw) {
  const step = yearStep(raw);
  let year = Math.round(raw / step) * step;
  if (year === 0) year = raw < 0 ? -1 : 1;
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
}

// The labelled ticks under the slider.
export const RULER_TICKS = [
  [-1000000, '1M BCE'],
  [-10000, '10k BCE'],
  [-1000, '1000 BCE'],
  [1, '1 CE'],
  [1000, '1000'],
  [2000, '2000']
];

// ── bank hygiene (also run by the tests) ─────────────────────────────────
export function artifactProblems(a) {
  const bad = [];
  if (!a.id || !a.name) bad.push('needs id and name');
  if (!a.sketchfab && !a.image) bad.push('needs a 3D model or an image');
  if (a.sketchfab && !/^[0-9a-f]{32}$/.test(a.sketchfab)) bad.push('sketchfab id must be 32 hex characters');
  if (a.sketchfab && !a.credit3d?.url) bad.push('3D model needs credit3d {text,url}');
  if (a.image && !a.credit2d?.url) bad.push('image needs credit2d {text,url}');
  if (!Array.isArray(a.point) || a.point.length !== 2 || !a.point.every(Number.isFinite) || Math.abs(a.point[0]) > 180 || Math.abs(a.point[1]) > 90) bad.push('point must be [lon, lat]');
  if (!Number.isInteger(a.year) || a.year < MIN_YEAR || a.year > MAX_YEAR || a.year === 0) bad.push('year must be a nonzero integer in range');
  for (const f of ['place', 'dateLabel', 'clue', 'blurb']) if (!a[f]) bad.push(`needs ${f}`);
  if (!a.lesson?.href || !a.lesson?.label) bad.push('needs lesson {href,label}');
  // a clue that says the artifact's own name defeats the game
  const generic = ['stone', 'tablet', 'papyrus', 'scroll', 'great', 'royal', 'game', 'cave', 'book', 'dead', 'code', 'replica', 'press', 'ration', 'administrative'];
  const words = String(a.name || '').toLowerCase().split(/[^a-zà-ž0-9]+/).filter((w) => w.length > 4 && !generic.includes(w));
  if (words.some((w) => String(a.clue || '').toLowerCase().includes(w))) bad.push('clue gives away the name');
  return bad;
}
