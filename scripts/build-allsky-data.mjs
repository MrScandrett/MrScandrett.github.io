#!/usr/bin/env node
/**
 * Builds assets/data/sky/allsky.json, the compact sky dataset behind the
 * "All-sky map" mode of lessons/cosmology/constellations.html.
 *
 * Sources (downloaded at build time, not vendored):
 *   - d3-celestial (BSD 3-Clause, Olaf Frohn): IAU constellation boundaries, stick figures,
 *     constellation names/label positions, and stars to magnitude 6.
 *     https://github.com/ofrohn/d3-celestial
 *   - OpenNGC (CC BY-SA 4.0, Mattia Verga): Messier and other bright deep-sky objects.
 *     https://github.com/mattiaverga/OpenNGC
 *
 * Usage: node scripts/build-allsky-data.mjs
 *
 * Output format (all angles in degrees, RA 0-360, Dec -90..90):
 *   con:  [{ id, name, x, y, b: [[ra,dec]...], l: [[[ra,dec]...]...] }]
 *         b and l use *unwrapped* RA (may run below 0 or above 360) so polygons stay continuous;
 *         polygons around a pole are closed along the pole edge.
 *   stars: [[ra, dec, mag, bv]]
 *   dso:   [[id, type, ra, dec, mag, majorAxisArcmin, commonName]]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'data', 'sky', 'allsky.json');
const D3 = 'https://cdn.jsdelivr.net/gh/ofrohn/d3-celestial@master/data/';
const NGC = 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv';

const getJson = async (url) => (await fetch(url)).json();
const r2 = (n) => Math.round(n * 100) / 100;
const r1 = (n) => Math.round(n * 10) / 10;

/** Make a longitude list continuous (no >180 jumps). */
function unwrap(points) {
  const out = [];
  let prev = null;
  for (const [lon, lat] of points) {
    let x = lon;
    if (prev !== null) {
      while (x - prev > 180) x -= 360;
      while (x - prev < -180) x += 360;
    }
    out.push([x, lat]);
    prev = x;
  }
  return out;
}

/** Bounds that circle a pole do not close after unwrapping; close them along the pole edge. */
function closePolygon(points) {
  const pts = unwrap(points);
  const start = pts[0];
  const end = pts[pts.length - 1];
  const gap = end[0] - start[0];
  if (Math.abs(gap) > 180) {
    const meanLat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const pole = meanLat >= 0 ? 90 : -90;
    pts.push([end[0], pole], [start[0], pole]);
  }
  return pts.map(([lon, lat]) => [r2(lon), r2(lat)]);
}

const parseHms = (s) => {
  const [h, m, sec] = s.split(':').map(Number);
  return (h + m / 60 + sec / 3600) * 15;
};
const parseDms = (s) => {
  const sign = s.trim().startsWith('-') ? -1 : 1;
  const [d, m, sec] = s.replace(/^[+-]/, '').split(':').map(Number);
  return sign * (d + m / 60 + sec / 3600);
};

const [bounds, lines, names, stars] = await Promise.all([
  getJson(D3 + 'constellations.bounds.json'),
  getJson(D3 + 'constellations.lines.json'),
  getJson(D3 + 'constellations.json'),
  getJson(D3 + 'stars.6.json')
]);

// Serpens appears twice (Caput and Cauda) under one id; keep them as separate entries.
const seen = {};
const keyFor = (feature) => {
  const n = (seen[feature.id] = (seen[feature.id] || 0) + 1);
  return n === 1 ? feature.id : `${feature.id}${n}`;
};
const collect = (fc) => {
  Object.keys(seen).forEach((k) => delete seen[k]);
  const map = {};
  fc.features.forEach((f) => { map[keyFor(f)] = f; });
  return map;
};
const boundMap = collect(bounds);
const lineMap = collect(lines);
const nameMap = collect(names);

const con = Object.keys(nameMap).map((id) => {
  const nm = nameMap[id];
  const [lx, ly] = nm.geometry.coordinates;
  const bnd = boundMap[id];
  const lin = lineMap[id];
  return {
    id,
    name: nm.properties.name,
    x: r2(((lx % 360) + 360) % 360),
    y: r2(ly),
    b: bnd ? closePolygon(bnd.geometry.coordinates[0]) : [],
    l: lin ? lin.geometry.coordinates.map((seg) => unwrap(seg).map(([a, d]) => [r2(a), r2(d)])) : []
  };
});

const starRows = stars.features
  .map((f) => {
    const [lon, lat] = f.geometry.coordinates;
    return [r2(((lon % 360) + 360) % 360), r2(lat), r1(f.properties.mag), Number(f.properties.bv) || 0];
  })
  .filter((s) => s[2] <= 5.6);

// Deep-sky: every Messier object plus named bright showpieces from OpenNGC.
const csv = (await (await fetch(NGC)).text()).trim().split('\n');
const head = csv[0].split(';');
const col = (name) => head.indexOf(name);
const TYPE = { G: 'gal', GCl: 'gc', OCl: 'oc', PN: 'pn', Neb: 'neb', HII: 'neb', RfN: 'neb', EmN: 'neb', 'Cl+N': 'neb', SNR: 'snr', '*Ass': 'oc' };
const dso = [];
for (const line of csv.slice(1)) {
  const c = line.split(';');
  const type = TYPE[c[col('Type')]];
  if (!type || !c[col('RA')] || !c[col('Dec')]) continue;
  const messier = c[col('M')];
  const common = (c[col('Common names')] || '').split(',')[0].trim();
  const mag = parseFloat(c[col('V-Mag')] || c[col('B-Mag')]);
  const bright = Number.isFinite(mag) && mag <= 10;
  if (!messier && !(common && bright)) continue;
  const id = messier ? `M${Number(messier)}` : c[col('Name')].replace(/^(NGC|IC)0*/, '$1 ');
  dso.push([
    id, type, r2(parseHms(c[col('RA')])), r2(parseDms(c[col('Dec')])),
    Number.isFinite(mag) ? r1(mag) : null,
    Math.round(parseFloat(c[col('MajAx')]) || 0),
    common
  ]);
}
// Drop non-Messier entries that sit on top of a Messier object (e.g. NGC 1980/81 vs the Orion Nebula).
const messiers = dso.filter((d) => /^M\d+$/.test(d[0]));
for (let i = dso.length - 1; i >= 0; i--) {
  const d = dso[i];
  if (/^M\d+$/.test(d[0])) continue;
  if (messiers.some((m) => Math.hypot((m[2] - d[2]) * Math.cos(d[3] * Math.PI / 180), m[3] - d[3]) < 1)) dso.splice(i, 1);
}
// M45 (Pleiades) is missing from OpenNGC's Messier column.
if (!dso.some((d) => d[0] === 'M45')) dso.push(['M45', 'oc', 56.87, 24.12, 1.2, 110, 'Pleiades']);

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify({ con, stars: starRows, dso }));
const size = (await fs.stat(OUT)).size;
console.log(`allsky.json: ${con.length} constellations, ${starRows.length} stars, ${dso.length} deep-sky objects, ${(size / 1024).toFixed(0)} KB`);
