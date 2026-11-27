/* city.mjs: a Perspective City plan → a Workbench Architecture project.
 *
 * The City plan tool (assets/js/lessons/perspective-city.mjs) draws footprints on
 * a 24 × 24 grid, y down, heights in the same units. Workbench is Z-up metres, so
 * one grid square becomes 1 m, the plan is centred on the workplane and y flips.
 *
 * Each tower becomes a group named after it:
 *   every setback tier   → a Sketch → extrude solid stacked on the one below
 *   every courtyard hole → a Sketch → extrude Hole, slightly taller than its tier
 *                          (a hole cuts only the solids in its own group)
 *   a spire              → a Sketch → extrude with Top size 0 %, drawn around the
 *                          roof's centroid so the point sits over the middle
 * No DOM; tests in tests/perspective-city.test.mjs.
 */

import * as W from './model.mjs';
import { GRID, MARKERS, tiersOf, spireHeight, centroid, bounds, normalizeLoops } from '../lessons/perspective-city-core.mjs';

const PAPER = '#f2efe6';
const MAX_POINTS = 64; // Workbench's limit for one outline

export function inkColor(b) {
  const ink = MARKERS[b.ink] || MARKERS.ink;
  if (b.fill === 'solid') return b.ink === 'ink' ? '#4a4f57' : ink;
  if (b.fill === 'tint') return mixHex(PAPER, ink, 0.35);
  return b.ink === 'ink' ? PAPER : mixHex(PAPER, ink, 0.14); // a hint of the marker colour
}

function mixHex(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

const r3 = (v) => Math.round(v * 1000) / 1000 || 0;

/** Plan point → workplane metres (centred, y up). */
export const toWorld = ([x, y]) => [r3(x - GRID / 2), r3(GRID / 2 - y)];

function thin(loop) {
  if (loop.length <= MAX_POINTS) return loop;
  const step = loop.length / MAX_POINTS;
  return Array.from({ length: MAX_POINTS }, (_, i) => loop[Math.floor(i * step)]);
}

/* One extruded outline as a node. `about` is where the outline's own origin sits
   (it only matters for Top size: the top shrinks toward it). */
function extrudeNode(project, loop, z0, z1, { about, top = 100, hole = false, color, name }) {
  const world = thin(loop).map(toWorld);
  const [ax, ay] = about ? toWorld(about) : [0, 0];
  const pts = world.map(([x, y]) => [r3(x - ax), r3(y - ay)]);
  const bb = bounds([world]);
  const node = W.newShapeNode(project, 'sketch-extrude', {
    params: { points: pts, h: r3(z1 - z0), top, twist: 0, smooth: 0 },
    color, hole,
    pos: [r3((bb.x0 + bb.x1) / 2), r3((bb.y0 + bb.y1) / 2), r3((z0 + z1) / 2)],
  });
  node.name = name;
  return node;
}

/**
 * city: { buildings: [...] } as perspective-city-core makes them (or parseCity returns).
 * Returns a fresh, valid Workbench project (preset 'building').
 */
export function cityProject(city, name = 'Perspective City') {
  const project = W.freshProject('building', name);
  let towers = 0;
  for (const raw of city.buildings || []) {
    const b = { ...raw, loops: normalizeLoops(raw.loops) };
    if (!(b.h > 0)) continue;
    towers++;
    const color = inkColor(b);
    const children = [];
    const add = (node) => { project.objects.push(node); children.push(node); }; // keep nextId counting
    const tiers = tiersOf(b);
    tiers.forEach((t, i) => {
      const label = tiers.length > 1 ? `Tier ${i + 1}` : 'Tower';
      add(extrudeNode(project, t.loops[0], t.z0, t.z1, { color, name: label }));
      t.loops.slice(1).forEach((hole, k) => {
        const pad = Math.min(0.05, (t.z1 - t.z0) / 4);
        add(extrudeNode(project, hole, t.z0 - pad, t.z1 + pad, { hole: true, color: '#888888', name: `Courtyard ${k + 1}` }));
      });
    });
    if (b.roof === 'spire') {
      const top = tiers[tiers.length - 1];
      add(extrudeNode(project, top.loops[0], top.z1, top.z1 + spireHeight(b), { about: centroid(top.loops[0]), top: 0, color, name: 'Spire' }));
    }
    const groupId = W.nextId(project); // while the children still count
    project.objects.splice(project.objects.length - children.length, children.length);
    const [gx, gy] = toWorld(centroid(b.loops[0]));
    for (const c of children) c.pos = [r3(c.pos[0] - gx), r3(c.pos[1] - gy), c.pos[2]];
    project.objects.push({
      id: groupId, type: 'group', name: `Tower ${towers}`,
      color, finish: 'matte', hole: false, pos: [gx, gy, 0], rot: [0, 0, 0], scale: [1, 1, 1], pivot: [0, 0, 0], children,
    });
    if (W.countNodes(project.objects) > W.MAX_NODES - 8) break;
  }
  return project;
}
