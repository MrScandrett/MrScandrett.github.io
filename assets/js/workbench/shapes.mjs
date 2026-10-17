/* shapes.mjs — Workbench's shape library.
 *
 * Every shape is plain data plus a build function, like Forge's parts:
 *
 *   { id, name, group, kind: 'object'|'handheld'|'building', axial?, blurb,
 *     params: [{ id, label, type?: 'range'|'select'|'toggle'|'text'|'points',
 *                min, max, step, default, len?: true, help? }],
 *     build(ctx, p) → Manifold }
 *
 * ctx = { Manifold, CrossSection, Mesh, track, font, noise } (noise = SimKit.noise;
 * track(obj) frees an object made with `new` along with everything else).
 * Units are whatever the project uses. Defaults are written for a tabletop
 * object in millimetres; `len` params are multiplied by the project's scale
 * for the shape's kind when the shape is placed (model.mjs), so a wall drops
 * into a building project at real size and into a print project at 1:100.
 * Z is up. model.mjs recentres every result on its bounding box, so a build
 * may put the shape anywhere; `axial: true` shapes keep their own Z axis as
 * the centre in X/Y (a 7-tooth gear spins about its axle, not its box).
 */

import { spurGearOutline, textOutline } from '../forge/outlines.mjs';

const TAU = Math.PI * 2;
const range = (id, label, min, max, step, def, extra = {}) => ({ id, label, type: 'range', min, max, step, default: def, ...extra });
const len = (id, label, min, max, step, def, extra = {}) => range(id, label, min, max, step, def, { len: true, ...extra });
const select = (id, label, options, def, extra = {}) => ({ id, label, type: 'select', options: options.map(([value, text]) => ({ value, label: text })), default: def, ...extra });
const toggle = (id, label, def, extra = {}) => ({ id, label, type: 'toggle', default: def, ...extra });

/* ── 2D helpers ───────────────────────────────────────────────────────── */

const poly = (CS, pts) => CS.ofPolygons([pts], 'NonZero');

function roundedRect(CS, w, d, r) {
  const rr = Math.min(r, w / 2 - w * 1e-3, d / 2 - d * 1e-3);
  if (rr <= Math.min(w, d) * 1e-3) return CS.square([w, d], true);
  return CS.square([w - 2 * rr, d - 2 * rr], true).offset(rr, 'Round', 2, 48);
}

function bar(CS, [ax, ay], [bx, by], width) {
  const r = width / 2;
  return CS.hull([CS.circle(r, 20).translate([ax, ay]), CS.circle(r, 20).translate([bx, by])]);
}

function starPoints(n, outer, inner, start = Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = start + (i * Math.PI) / n;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}

/* Chaikin corner cutting: each pass replaces every corner with two points a
   quarter of the way along its edges. Open curves keep their end points. */
export function smoothPoints(points, passes, closed) {
  let pts = points;
  for (let k = 0; k < passes; k++) {
    const out = closed ? [] : [pts[0]];
    const n = pts.length;
    const edges = closed ? n : n - 1;
    for (let i = 0; i < edges; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    if (!closed) out.push(pts[n - 1]);
    pts = out;
  }
  return pts;
}

const polygonArea = (pts) => pts.reduce((a, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return a + x * y2 - x2 * y; }, 0) / 2;

/* A profile drawn in X (across) and Y (up), extruded `depth` toward the viewer:
   x stays x, the profile's y becomes height (z), the extrusion runs along y. */
const standUp = (m) => m.rotate([90, 0, 0]);
/* A profile drawn across the span (y) and up (z), extruded along x. */
const alongX = (m) => m.transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1]);

function noise3(noise, x, y, z, octaves = 3) {
  return (noise.fbm(x + 11.3, y + 4.7, octaves) + noise.fbm(y + 5.1, z + 7.7, octaves) + noise.fbm(z + 3.3, x + 2.2, octaves)) / 3;
}

/* A round wire swept along a helix, as a closed mesh: rings of `ring` vertices
   around the path (Frenet frame of the helix), capped at both ends. */
function helixTube(Mesh, R, r, turns, pitch, perTurn = 36, ring = 14) {
  const steps = Math.max(8, Math.ceil(turns * perTurn)), c = pitch / TAU, L = Math.hypot(R, c);
  const verts = [], tris = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * turns * TAU, ca = Math.cos(a), sa = Math.sin(a);
    const P = [R * ca, R * sa, c * a], T = [(-R * sa) / L, (R * ca) / L, c / L], N = [-ca, -sa, 0];
    const B = [T[1] * N[2] - T[2] * N[1], T[2] * N[0] - T[0] * N[2], T[0] * N[1] - T[1] * N[0]];
    for (let j = 0; j < ring; j++) {
      const t = (j / ring) * TAU, u = Math.cos(t) * r, v = Math.sin(t) * r;
      verts.push(P[0] + u * N[0] + v * B[0], P[1] + u * N[1] + v * B[1], P[2] + u * N[2] + v * B[2]);
    }
  }
  const start = verts.length / 3, end = start + 1;
  const [x0, y0, z0] = [R, 0, 0], a1 = turns * TAU;
  verts.push(x0, y0, z0, R * Math.cos(a1), R * Math.sin(a1), c * a1);
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < ring; j++) {
      const a = i * ring + j, b = i * ring + ((j + 1) % ring), a2 = a + ring, b2 = b + ring;
      tris.push(a, a2, b2, a, b2, b);
    }
  }
  for (let j = 0; j < ring; j++) {
    tris.push(start, j, (j + 1) % ring);
    tris.push(end, steps * ring + ((j + 1) % ring), steps * ring + j);
  }
  // flip the whole mesh if it came out inside-out
  let vol = 0;
  for (let t = 0; t < tris.length; t += 3) {
    const [p, q, s] = [tris[t], tris[t + 1], tris[t + 2]].map((k) => verts.slice(k * 3, k * 3 + 3));
    vol += p[0] * (q[1] * s[2] - q[2] * s[1]) - p[1] * (q[0] * s[2] - q[2] * s[0]) + p[2] * (q[0] * s[1] - q[1] * s[0]);
  }
  if (vol < 0) for (let t = 0; t < tris.length; t += 3) [tris[t + 1], tris[t + 2]] = [tris[t + 2], tris[t + 1]];
  return new Mesh({ numProp: 3, vertProperties: new Float32Array(verts), triVerts: new Uint32Array(tris) });
}

/* ── Basic shapes ─────────────────────────────────────────────────────── */

const BASIC = 'Basic shapes';
const ARCH = 'Architecture';
const MECH = 'Mechanisms & products';
const GAME = 'Game & nature';
const SKETCH = 'Sketch your own';

const basics = [
  {
    id: 'box', name: 'Box', group: BASIC, kind: 'object', blurb: 'A block. Round its vertical edges for a softer product look.',
    params: [len('w', 'Width', 0.5, 400, 0.5, 40), len('d', 'Depth', 0.5, 400, 0.5, 40), len('h', 'Height', 0.5, 400, 0.5, 20), len('r', 'Corner radius', 0, 100, 0.5, 0)],
    build({ Manifold: M, CrossSection: CS }, p) {
      return p.r > 0 ? roundedRect(CS, p.w, p.d, p.r).extrude(p.h) : M.cube([p.w, p.d, p.h], true);
    },
  },
  {
    id: 'cylinder', axial: true, name: 'Cylinder', group: BASIC, kind: 'object', blurb: 'Fewer sides make a prism: 6 is a hex nut, 3 a triangle.',
    params: [len('d', 'Diameter', 0.5, 400, 0.5, 40), len('h', 'Height', 0.5, 400, 0.5, 20), range('sides', 'Sides', 3, 96, 1, 64)],
    build({ Manifold: M }, p) { return M.cylinder(p.h, p.d / 2, p.d / 2, p.sides); },
  },
  {
    id: 'cone', axial: true, name: 'Cone', group: BASIC, kind: 'object', blurb: 'Set a top diameter to cut the tip off (a frustum: lamp shades, cups, towers).',
    params: [len('d1', 'Bottom diameter', 0.5, 400, 0.5, 40), len('d2', 'Top diameter', 0, 400, 0.5, 0), len('h', 'Height', 0.5, 400, 0.5, 40), range('sides', 'Sides', 3, 96, 1, 64)],
    build({ Manifold: M }, p) { return M.cylinder(p.h, p.d1 / 2, p.d2 / 2, p.sides); },
  },
  {
    id: 'sphere', axial: true, name: 'Sphere', group: BASIC, kind: 'object', blurb: 'Low detail gives a faceted, low-poly ball.',
    params: [len('d', 'Diameter', 0.5, 400, 0.5, 40), range('detail', 'Detail', 4, 96, 4, 48)],
    build({ Manifold: M }, p) { return M.sphere(p.d / 2, p.detail); },
  },
  {
    id: 'dome', axial: true, name: 'Dome', group: BASIC, kind: 'object', blurb: 'Half a sphere. Give it a shell to make it hollow (domes, bowls, helmets).',
    params: [len('d', 'Diameter', 1, 400, 0.5, 40), len('shell', 'Shell (0 = solid)', 0, 100, 0.2, 0), range('detail', 'Detail', 8, 96, 4, 48)],
    build({ Manifold: M }, p) {
      const r = p.d / 2;
      let dome = M.sphere(r, p.detail).trimByPlane([0, 0, 1], 0);
      if (p.shell > 0 && p.shell < r * 0.98) dome = dome.subtract(M.sphere(r - p.shell, p.detail).translate([0, 0, -0.001 * r]));
      return dome;
    },
  },
  {
    id: 'torus', axial: true, name: 'Ring (torus)', group: BASIC, kind: 'object', blurb: 'A doughnut: wheels, chain links, rings, life buoys.',
    params: [len('d', 'Outside diameter', 2, 400, 0.5, 40), len('tube', 'Tube thickness', 0.5, 100, 0.5, 10), range('sides', 'Sides around', 6, 96, 1, 64), range('ring', 'Tube sides', 3, 48, 1, 24)],
    build({ CrossSection: CS }, p) {
      const tube = Math.min(p.tube, p.d / 2 * 0.98);
      return CS.circle(tube / 2, p.ring).translate([p.d / 2 - tube / 2, 0]).revolve(p.sides);
    },
  },
  {
    id: 'tube', axial: true, name: 'Tube', group: BASIC, kind: 'object', blurb: 'A hollow cylinder: pipes, cups, bearing seats, towers.',
    params: [len('d', 'Outside diameter', 1, 400, 0.5, 40), len('wall', 'Wall', 0.2, 100, 0.2, 3), len('h', 'Height', 0.5, 400, 0.5, 30), range('sides', 'Sides', 3, 96, 1, 64)],
    build({ Manifold: M }, p) {
      const r = p.d / 2, inner = Math.max(r - p.wall, r * 0.02);
      return M.cylinder(p.h, r, r, p.sides).subtract(M.cylinder(p.h + 2, inner, inner, p.sides).translate([0, 0, -1]));
    },
  },
  {
    id: 'wedge', name: 'Wedge', group: BASIC, kind: 'object', blurb: 'A ramp. Two make a roof; one makes a door stop.',
    params: [len('w', 'Length', 0.5, 400, 0.5, 40), len('d', 'Depth', 0.5, 400, 0.5, 30), len('h', 'Height', 0.5, 400, 0.5, 20)],
    build({ CrossSection: CS }, p) { return standUp(poly(CS, [[0, 0], [p.w, 0], [0, p.h]]).extrude(p.d)); },
  },
  {
    id: 'pyramid', name: 'Pyramid', group: BASIC, kind: 'object', blurb: 'A rectangular base rising to a point.',
    params: [len('w', 'Base width', 0.5, 400, 0.5, 40), len('d', 'Base depth', 0.5, 400, 0.5, 40), len('h', 'Height', 0.5, 400, 0.5, 30)],
    build({ CrossSection: CS }, p) { return CS.square([p.w, p.d], true).extrude(p.h, 0, 0, [0, 0]); },
  },
  {
    id: 'capsule', axial: true, name: 'Capsule', group: BASIC, kind: 'object', blurb: 'A pill: handles, limbs, rounded buttons.',
    params: [len('d', 'Diameter', 0.5, 200, 0.5, 16), len('l', 'Length', 0.5, 400, 0.5, 40), range('detail', 'Detail', 8, 64, 4, 32)],
    build({ Manifold: M }, p) {
      const r = p.d / 2, half = Math.max(p.l / 2 - r, 0.0001);
      return M.hull([M.sphere(r, p.detail).translate([0, 0, -half]), M.sphere(r, p.detail).translate([0, 0, half])]);
    },
  },
  {
    id: 'star', axial: true, name: 'Star', group: BASIC, kind: 'object', blurb: 'Taper the top to make it pointy in 3D.',
    params: [range('points', 'Points', 3, 16, 1, 5), len('d', 'Diameter', 1, 400, 0.5, 40), range('inner', 'Inner size', 15, 90, 1, 45, { unit: '%' }), len('h', 'Thickness', 0.2, 200, 0.2, 6), range('taper', 'Top size', 0, 100, 1, 100, { unit: '%' })],
    build({ CrossSection: CS }, p) {
      const r = p.d / 2;
      const t = p.taper / 100;
      return poly(CS, starPoints(p.points, r, (r * p.inner) / 100)).extrude(p.h, 0, 0, [t, t]);
    },
  },
  {
    id: 'heart', name: 'Heart', group: BASIC, kind: 'object', blurb: 'Keychains, game health pickups, gifts.',
    params: [len('w', 'Width', 1, 400, 0.5, 36), len('h', 'Thickness', 0.2, 200, 0.2, 5)],
    build({ CrossSection: CS }, p) {
      const s = p.w / 1.7071, o = s / (2 * Math.SQRT2);
      const shape = CS.union([CS.square([s, s], true).rotate(45), CS.circle(s / 2, 48).translate([-o, o]), CS.circle(s / 2, 48).translate([o, o])]);
      return shape.extrude(p.h);
    },
  },
  {
    id: 'text', name: 'Text', group: BASIC, kind: 'object', blurb: 'Raised letters, or set it to Hole to engrave a name.',
    params: [{ id: 'text', label: 'Text', type: 'text', default: 'HELLO', maxLength: 24 }, len('size', 'Letter height', 0.5, 200, 0.5, 10), len('depth', 'Depth', 0.2, 100, 0.2, 3)],
    build({ CrossSection: CS, font }, p) {
      if (!font) throw new Error('The lettering font has not loaded yet.');
      const { contours } = textOutline(font, p.text, p.size);
      if (!contours.length) throw new Error('Type some text for this shape.');
      const grow = p.size * 0.002;
      return CS.ofPolygons(contours, 'EvenOdd').offset(grow, 'Round', 2, 8).simplify(grow / 4).extrude(p.depth);
    },
  },
];

/* ── Architecture ─────────────────────────────────────────────────────── */
/* Defaults read as a 1:100 model in mm: 60 mm of wall is a 6 m wall. */

const architecture = [
  {
    id: 'wall', name: 'Wall with openings', group: ARCH, kind: 'building', blurb: 'Windows and a door are cut for you, spaced evenly along the wall.',
    params: [
      len('l', 'Length', 2, 1000, 0.5, 60), len('h', 'Height', 2, 400, 0.5, 27), len('t', 'Thickness', 0.2, 40, 0.1, 2),
      range('windows', 'Windows', 0, 12, 1, 2), len('ww', 'Window width', 1, 200, 0.5, 12), len('wh', 'Window height', 1, 200, 0.5, 12), len('sill', 'Sill height', 0, 200, 0.5, 9),
      select('door', 'Door', [['none', 'No door'], ['center', 'Middle'], ['left', 'Left end'], ['right', 'Right end']], 'center'),
      len('dw', 'Door width', 2, 100, 0.5, 9), len('dh', 'Door height', 2, 300, 0.5, 21),
    ],
    build({ Manifold: M }, p) {
      const wall = M.cube([p.l, p.t, p.h], true).translate([0, 0, p.h / 2]);
      const hasDoor = p.door !== 'none';
      const slots = p.windows + (hasDoor ? 1 : 0);
      if (!slots) return wall;
      const slotW = p.l / slots;
      const doorSlot = !hasDoor ? -1 : p.door === 'left' ? 0 : p.door === 'right' ? slots - 1 : Math.floor(slots / 2);
      const cuts = [];
      for (let k = 0; k < slots; k++) {
        const x = -p.l / 2 + slotW * (k + 0.5);
        if (k === doorSlot) {
          const dw = Math.min(p.dw, slotW * 0.85), dh = Math.min(p.dh, p.h * 0.94);
          const e = p.h * 0.05;
          cuts.push(M.cube([dw, p.t * 3, dh + e], true).translate([x, 0, (dh - e) / 2]));
        } else {
          const ww = Math.min(p.ww, slotW * 0.85);
          const sill = Math.min(p.sill, p.h * 0.8);
          const wh = Math.min(p.wh, p.h * 0.94 - sill);
          if (wh > 0) cuts.push(M.cube([ww, p.t * 3, wh], true).translate([x, 0, sill + wh / 2]));
        }
      }
      return cuts.length ? wall.subtract(M.union(cuts)) : wall;
    },
  },
  {
    id: 'stairs', name: 'Stairs', group: ARCH, kind: 'building', blurb: 'Rise × steps is the floor-to-floor height. Real stairs rise about 18 cm a step.',
    params: [range('steps', 'Steps', 2, 40, 1, 10), len('w', 'Width', 1, 400, 0.5, 10), len('run', 'Tread depth', 0.5, 50, 0.1, 2.8), len('rise', 'Rise per step', 0.2, 50, 0.1, 1.8)],
    build({ CrossSection: CS }, p) {
      const n = p.steps, pts = [[0, 0], [n * p.run, 0]];
      for (let i = n; i >= 1; i--) pts.push([i * p.run, i * p.rise], [(i - 1) * p.run, i * p.rise]);
      return standUp(poly(CS, pts).extrude(p.w));
    },
  },
  {
    id: 'spiral-stairs', axial: true, name: 'Spiral stairs', group: ARCH, kind: 'building', blurb: 'Steps wrapped around a centre pole.',
    params: [range('steps', 'Steps', 4, 48, 1, 14), len('r', 'Radius', 2, 200, 0.5, 10), len('rise', 'Rise per step', 0.2, 50, 0.1, 1.8), range('turn', 'Total turn', 90, 1080, 15, 300, { unit: '°' }), len('tread', 'Tread thickness', 0.2, 20, 0.1, 0.6), len('pole', 'Pole diameter', 0.5, 50, 0.1, 2.4)],
    build({ Manifold: M, CrossSection: CS }, p) {
      const da = (p.turn / p.steps) * (Math.PI / 180);
      // the pole is turned by an odd angle so no tread edge ever lands exactly on one of its corners
      const parts = [M.cylinder(p.steps * p.rise + p.rise, p.pole / 2, p.pole / 2, 32).rotate([0, 0, 3.17])];
      for (let i = 0; i < p.steps; i++) {
        // each tread starts inside the pole rather than at its centre, so treads never share an edge
        const a0 = i * da, a1 = a0 + da * 1.12, r0 = Math.min(p.pole * 0.3, p.r * 0.5), pts = [];
        for (let s = 0; s <= 8; s++) { const a = a0 + ((a1 - a0) * s) / 8; pts.push([p.r * Math.cos(a), p.r * Math.sin(a)]); }
        pts.push([r0 * Math.cos(a1), r0 * Math.sin(a1)], [r0 * Math.cos(a0), r0 * Math.sin(a0)]);
        parts.push(poly(CS, pts).extrude(p.tread).translate([0, 0, (i + 1) * p.rise - p.tread]));
      }
      return M.union(parts);
    },
  },
  {
    id: 'arch', name: 'Arch', group: ARCH, kind: 'building', blurb: 'Round (Roman), pointed (Gothic) or flat (a lintel).',
    params: [len('span', 'Opening width', 1, 400, 0.5, 16), len('h', 'Height', 2, 400, 0.5, 30), len('t', 'Pier & top thickness', 0.5, 100, 0.5, 4), len('d', 'Depth', 0.5, 200, 0.5, 4), select('style', 'Style', [['round', 'Round'], ['pointed', 'Pointed'], ['flat', 'Flat']], 'round')],
    build({ CrossSection: CS }, p) {
      const w = p.span + 2 * p.t, s = p.span;
      const rise = p.style === 'round' ? s / 2 : p.style === 'pointed' ? s * 0.866 : 0;
      const spring = Math.max(0, p.h - p.t - rise);
      const block = CS.square([w, p.h]).translate([-w / 2, 0]);
      const below = p.h * 0.01;
      const cuts = [CS.square([s, spring + below * 2]).translate([-s / 2, -below])];
      if (p.style === 'round') cuts.push(CS.circle(s / 2, 64).translate([0, spring]));
      if (p.style === 'pointed') {
        const lens = CS.circle(s, 96).translate([-s / 2, spring]).intersect(CS.circle(s, 96).translate([s / 2, spring]));
        cuts.push(lens.intersect(CS.square([s, rise * 1.1]).translate([-s / 2, spring])));
      }
      return standUp(block.subtract(CS.union(cuts)).extrude(p.d));
    },
  },
  {
    id: 'column', axial: true, name: 'Column', group: ARCH, kind: 'building', blurb: 'Flutes are the grooves on Greek columns. Add a base and capital for a classical look.',
    params: [len('d', 'Diameter', 0.5, 100, 0.1, 4), len('h', 'Height', 2, 600, 0.5, 30), range('flutes', 'Flutes', 0, 32, 1, 16), toggle('classical', 'Base and capital', true)],
    build({ Manifold: M }, p) {
      const r = p.d / 2;
      const capH = p.classical ? p.d * 0.55 : 0, baseH = p.classical ? p.d * 0.3 : 0;
      const shaftH = Math.max(p.h - capH - baseH, p.h * 0.3);
      let shaft = M.cylinder(shaftH, r, r * 0.92, 64).translate([0, 0, baseH]);
      if (p.flutes > 0) {
        const fr = Math.min((Math.PI * r) / p.flutes * 0.42, r * 0.25);
        const flutes = [];
        for (let i = 0; i < p.flutes; i++) {
          const a = (i * TAU) / p.flutes;
          flutes.push(M.cylinder(shaftH * 0.9, fr, fr * 0.92, 12).translate([r * 1.02 * Math.cos(a), r * 1.02 * Math.sin(a), baseH + shaftH * 0.05]));
        }
        shaft = shaft.subtract(M.union(flutes));
      }
      if (!p.classical) return shaft;
      const top = baseH + shaftH;
      return M.union([
        shaft,
        M.cube([p.d * 1.35, p.d * 1.35, baseH], true).translate([0, 0, baseH / 2]),
        M.cylinder(capH * 0.45, r * 0.92, r * 1.25, 48).translate([0, 0, top]),
        M.cube([p.d * 1.4, p.d * 1.4, capH * 0.55], true).translate([0, 0, top + capH * 0.45 + capH * 0.275]),
      ]);
    },
  },
  {
    id: 'roof-gable', name: 'Gable roof', group: ARCH, kind: 'building', blurb: 'Two slopes meeting at a ridge. A shell sits over walls; solid makes a block roof.',
    params: [len('l', 'Length (along the ridge)', 2, 1000, 0.5, 64), len('span', 'Span', 2, 600, 0.5, 44), len('rise', 'Rise', 0.5, 300, 0.5, 15), len('t', 'Shell (0 = solid)', 0, 40, 0.1, 1.5)],
    build({ CrossSection: CS }, p) {
      const tri = poly(CS, [[-p.span / 2, 0], [p.span / 2, 0], [0, p.rise]]);
      let profile = tri;
      if (p.t > 0) {
        const slope = Math.atan2(p.rise, p.span / 2);
        const drop = Math.min(p.t / Math.cos(slope), p.rise * 0.9);
        profile = tri.subtract(tri.translate([0, -drop]));
      }
      return alongX(profile.extrude(p.l));
    },
  },
  {
    id: 'roof-hip', name: 'Hip roof', group: ARCH, kind: 'building', blurb: 'Slopes on all four sides, rising to a short ridge.',
    params: [len('l', 'Length', 2, 1000, 0.5, 64), len('span', 'Span', 2, 600, 0.5, 44), len('rise', 'Rise', 0.5, 300, 0.5, 15)],
    build({ CrossSection: CS }, p) {
      const long = Math.max(p.l, p.span), short = Math.min(p.l, p.span);
      const ridge = Math.max((long - short) / long, 0.001);
      const roof = CS.square([long, short], true).extrude(p.rise, 0, 0, [ridge, 0.001]);
      return p.l >= p.span ? roof : roof.rotate([0, 0, 90]);
    },
  },
  {
    id: 'truss', name: 'Truss', group: ARCH, kind: 'building', blurb: 'Triangles hold their shape, so bridges and roofs are built from them.',
    params: [len('l', 'Span', 5, 1000, 0.5, 120), len('h', 'Height', 1, 300, 0.5, 20), range('bays', 'Panels', 2, 24, 1, 6), len('m', 'Member thickness', 0.2, 20, 0.1, 2), len('d', 'Depth', 0.2, 40, 0.1, 2), select('style', 'Pattern', [['warren', 'Warren (zig-zag)'], ['pratt', 'Pratt (verticals)'], ['howe', 'Howe (crossed)']], 'warren')],
    build({ CrossSection: CS }, p) {
      const n = p.bays, L = p.l, H = p.h, bars = [];
      const xs = Array.from({ length: n + 1 }, (_, i) => -L / 2 + (i * L) / n);
      bars.push(bar(CS, [xs[0], 0], [xs[n], 0], p.m));
      if (p.style === 'warren') {
        const tops = xs.slice(0, n).map((x) => x + L / (2 * n));
        bars.push(bar(CS, [tops[0], H], [tops[n - 1], H], p.m));
        for (let i = 0; i < n; i++) bars.push(bar(CS, [xs[i], 0], [tops[i], H], p.m), bar(CS, [tops[i], H], [xs[i + 1], 0], p.m));
      } else {
        bars.push(bar(CS, [xs[1], H], [xs[n - 1], H], p.m), bar(CS, [xs[0], 0], [xs[1], H], p.m), bar(CS, [xs[n - 1], H], [xs[n], 0], p.m));
        for (let i = 1; i < n; i++) bars.push(bar(CS, [xs[i], 0], [xs[i], H], p.m));
        for (let i = 1; i < n - 1; i++) {
          const toCentre = (xs[i] + xs[i + 1]) / 2 < 0;
          const pratt = p.style === 'pratt';
          // Pratt diagonals lean down toward the middle; Howe diagonals lean up toward it.
          const [a, b] = toCentre === pratt ? [[xs[i], H], [xs[i + 1], 0]] : [[xs[i], 0], [xs[i + 1], H]];
          bars.push(bar(CS, a, b, p.m));
        }
      }
      return standUp(CS.union(bars).extrude(p.d));
    },
  },
  {
    id: 'railing', name: 'Railing / fence', group: ARCH, kind: 'building', blurb: 'Posts with rails between them: balconies, fences, bridge sides.',
    params: [len('l', 'Length', 2, 1000, 0.5, 60), len('h', 'Height', 1, 200, 0.5, 10), range('posts', 'Posts', 2, 60, 1, 7), range('rails', 'Rails', 1, 6, 1, 2), len('t', 'Post thickness', 0.2, 20, 0.1, 1)],
    build({ Manifold: M }, p) {
      const parts = [];
      for (let i = 0; i < p.posts; i++) parts.push(M.cube([p.t, p.t, p.h], true).translate([-p.l / 2 + p.t / 2 + (i * (p.l - p.t)) / (p.posts - 1), 0, p.h / 2]));
      for (let r = 0; r < p.rails; r++) {
        const z = p.rails === 1 ? p.h - p.t / 2 : p.h * 0.3 + ((p.h * 0.7 - p.t / 2) * r) / (p.rails - 1);
        parts.push(M.cube([p.l, p.t * 0.8, p.t * 0.8], true).translate([0, 0, z]));
      }
      return M.union(parts);
    },
  },
];

/* ── Mechanisms & products ────────────────────────────────────────────── */

const mechanisms = [
  {
    id: 'gear', axial: true, name: 'Gear', group: MECH, kind: 'object', blurb: 'Gears only mesh with gears of the same module. Their centres sit (teeth A + teeth B) × module ÷ 2 apart.',
    params: [range('teeth', 'Teeth', 8, 80, 1, 20), len('module', 'Module (tooth size)', 0.5, 6, 0.25, 2), len('t', 'Thickness', 0.5, 100, 0.5, 6), len('bore', 'Centre hole', 0, 100, 0.5, 5), len('play', 'Backlash (print play)', 0, 2, 0.05, 0.15)],
    build({ Manifold: M, CrossSection: CS }, p) {
      const g = spurGearOutline({ module: p.module, teeth: p.teeth, backlash: Math.min(p.play, p.module * 0.5) });
      let gear = poly(CS, g.points).extrude(p.t);
      const bore = Math.min(p.bore, 2 * g.rootRadius * 0.8);
      if (bore > 0) gear = gear.subtract(M.cylinder(p.t + 2, bore / 2, bore / 2, 48).translate([0, 0, -1]));
      return gear;
    },
  },
  {
    id: 'spring', axial: true, name: 'Spring / coil', group: MECH, kind: 'object', blurb: 'A helix of wire: springs, screw threads you can see, spiral ramps.',
    params: [len('d', 'Coil diameter', 2, 200, 0.5, 20), len('wire', 'Wire thickness', 0.4, 40, 0.1, 3), range('turns', 'Turns', 1, 20, 0.5, 5), len('pitch', 'Pitch (height per turn)', 0.5, 100, 0.5, 6)],
    build({ Manifold: M, Mesh, track }, p) {
      const R = Math.max(p.d / 2 - p.wire / 2, p.wire * 0.6), pitch = Math.max(p.pitch, p.wire * 1.1);
      return track(new M(helixTube(Mesh, R, p.wire / 2, p.turns, pitch)));
    },
  },
  {
    id: 'knob', axial: true, name: 'Knob', group: MECH, kind: 'object', blurb: 'Grip ridges, a pointer line and a D-shaped hole that fits a potentiometer or motor shaft.',
    params: [len('d', 'Diameter', 4, 200, 0.5, 30), len('h', 'Height', 2, 100, 0.5, 16), range('ridges', 'Grip ridges', 0, 48, 1, 18), len('shaft', 'Shaft hole', 0, 40, 0.1, 6), toggle('flat', 'D-shaped (flat side)', true), toggle('pointer', 'Pointer line', true)],
    build({ Manifold: M }, p) {
      const r = p.d / 2;
      let knob = M.cylinder(p.h, r, r * 0.92, 72);
      if (p.ridges > 0) {
        const rr = Math.min(r * Math.sin(Math.PI / p.ridges) * 0.55, r * 0.12);
        const cuts = [];
        for (let i = 0; i < p.ridges; i++) { const a = (i * TAU) / p.ridges; cuts.push(M.cylinder(p.h * 0.8, rr, rr, 12).translate([r * Math.cos(a), r * Math.sin(a), -0.01])); }
        knob = knob.subtract(M.union(cuts));
      }
      if (p.pointer) knob = knob.subtract(M.cube([r * 0.85, r * 0.08, p.h * 0.12]).translate([r * 0.1, -r * 0.04, p.h * 0.9]));
      if (p.shaft > 0) {
        let hole = M.cylinder(p.h * 0.7, p.shaft / 2, p.shaft / 2, 32).translate([0, 0, -0.01]);
        if (p.flat) hole = hole.intersect(M.cube([p.shaft, p.shaft * 2, p.h * 2], true).translate([-p.shaft * 0.2, 0, 0]));
        knob = knob.subtract(hole);
      }
      return knob;
    },
  },
  {
    id: 'enclosure', name: 'Enclosure', group: MECH, kind: 'object', blurb: 'A product housing: an open box, or the lid that drops into it. Make both with the same size.',
    params: [len('w', 'Inside width', 2, 400, 0.5, 60), len('d', 'Inside depth', 2, 400, 0.5, 40), len('h', 'Inside height', 1, 300, 0.5, 25), len('wall', 'Wall', 0.4, 20, 0.2, 2), len('r', 'Corner radius', 0, 50, 0.5, 4), select('part', 'Part', [['box', 'Box'], ['lid', 'Lid (fits the box)']], 'box'), len('gap', 'Lid clearance', 0, 3, 0.05, 0.3)],
    build({ CrossSection: CS }, p) {
      const ow = p.w + 2 * p.wall, od = p.d + 2 * p.wall, ir = Math.max(p.r - p.wall, 0.01);
      if (p.part === 'lid') {
        const plate = roundedRect(CS, ow, od, p.r).extrude(p.wall);
        const lipW = Math.max(p.wall * 0.8, 0.4);
        const lipOuter = roundedRect(CS, p.w - 2 * p.gap, p.d - 2 * p.gap, Math.max(ir - p.gap, 0.01));
        const lipInner = roundedRect(CS, p.w - 2 * p.gap - 2 * lipW, p.d - 2 * p.gap - 2 * lipW, Math.max(ir - p.gap - lipW, 0.01));
        return plate.add(lipOuter.subtract(lipInner).extrude(Math.max(p.wall * 1.5, p.h * 0.08)).translate([0, 0, p.wall * 0.999]));
      }
      const outer = roundedRect(CS, ow, od, p.r).extrude(p.wall + p.h);
      return outer.subtract(roundedRect(CS, p.w, p.d, ir).extrude(p.h + 1).translate([0, 0, p.wall]));
    },
  },
  {
    id: 'hinge', name: 'Print-in-place hinge', group: MECH, kind: 'object', blurb: 'Two leaves around a captured pin, printed already assembled. Set the gap to your printer’s clearance.',
    params: [len('l', 'Length', 6, 200, 0.5, 30), len('leaf', 'Leaf width', 3, 100, 0.5, 12), len('t', 'Thickness', 1, 20, 0.1, 3), range('knuckles', 'Knuckles', 3, 9, 2, 5), len('gap', 'Clearance', 0.1, 1.5, 0.05, 0.4)],
    build({ Manifold: M }, p) {
      // Lies flat: the barrel's axis runs along X at height R, leaf A reaches +Y, leaf B −Y.
      // Even knuckles belong to A, which also owns the pin; B's knuckles are bored around it.
      const R = p.t, pin = R * 0.45, g = p.gap, n = p.knuckles, kl = p.l / n;
      const axis = (length, r, x0) => M.cylinder(length, r, r, 40).rotate([0, 90, 0]).translate([x0, 0, R]);
      const reach = R + g;
      const A = [M.cube([p.l, p.leaf, p.t]).translate([-p.l / 2, reach, 0]), axis(p.l - kl * 0.3, pin, -p.l / 2 + kl * 0.15)];
      const B = [M.cube([p.l, p.leaf, p.t]).translate([-p.l / 2, -reach - p.leaf, 0])];
      for (let k = 0; k < n; k++) {
        const x0 = -p.l / 2 + k * kl + (k ? g / 2 : 0), x1 = -p.l / 2 + (k + 1) * kl - (k < n - 1 ? g / 2 : 0);
        const web = M.cube([x1 - x0, reach + R * 0.01, p.t]);
        if (k % 2 === 0) A.push(axis(x1 - x0, R, x0), web.translate([x0, 0, 0]));
        else B.push(axis(x1 - x0, R, x0), web.translate([x0, -reach - R * 0.01, 0]));
      }
      return M.union(A).add(M.union(B).subtract(axis(p.l * 1.2, pin + g, -p.l * 0.6)));
    },
  },
  {
    id: 'standoff', axial: true, name: 'Screw post', group: MECH, kind: 'object', blurb: 'A boss for a self-tapping screw: 2.6 mm holes take M3 screws in PLA.',
    params: [len('d', 'Outside diameter', 1, 60, 0.1, 7), len('hole', 'Hole', 0, 40, 0.1, 2.6), len('h', 'Height', 0.5, 200, 0.5, 8), toggle('gusset', 'Support fins', true)],
    build({ Manifold: M }, p) {
      const r = p.d / 2;
      const parts = [M.cylinder(p.h, r, r, 40)];
      if (p.gusset) for (let i = 0; i < 4; i++) parts.push(standUp(M.extrude([[[0, 0], [r * 0.9, 0], [0, p.h * 0.6]]], r * 0.25)).translate([r * 0.8, r * 0.125, 0]).rotate([0, 0, i * 90]));
      const post = M.union(parts);
      const hr = Math.min(p.hole, p.d * 0.9) / 2;
      return hr > 0 ? post.subtract(M.cylinder(p.h, hr, hr, 32).translate([0, 0, p.h * 0.15])) : post;
    },
  },
];

/* ── Game & nature ────────────────────────────────────────────────────── */

const game = [
  {
    id: 'crate', name: 'Crate', group: GAME, kind: 'object', blurb: 'A framed box with recessed panels on every face.',
    params: [len('w', 'Width', 1, 400, 0.5, 40), len('d', 'Depth', 1, 400, 0.5, 40), len('h', 'Height', 1, 400, 0.5, 40), len('frame', 'Frame width', 0.2, 60, 0.2, 5)],
    build({ Manifold: M }, p) {
      const f = Math.min(p.frame, Math.min(p.w, p.d, p.h) * 0.3), r = f * 0.35;
      const cuts = [
        M.cube([r * 2, p.d - 2 * f, p.h - 2 * f], true).translate([p.w / 2, 0, 0]), M.cube([r * 2, p.d - 2 * f, p.h - 2 * f], true).translate([-p.w / 2, 0, 0]),
        M.cube([p.w - 2 * f, r * 2, p.h - 2 * f], true).translate([0, p.d / 2, 0]), M.cube([p.w - 2 * f, r * 2, p.h - 2 * f], true).translate([0, -p.d / 2, 0]),
        M.cube([p.w - 2 * f, p.d - 2 * f, r * 2], true).translate([0, 0, p.h / 2]), M.cube([p.w - 2 * f, p.d - 2 * f, r * 2], true).translate([0, 0, -p.h / 2]),
      ];
      return M.cube([p.w, p.d, p.h], true).subtract(M.union(cuts));
    },
  },
  {
    id: 'barrel', axial: true, name: 'Barrel', group: GAME, kind: 'object', blurb: 'A bulging barrel with raised hoops and a sunken lid.',
    params: [len('d', 'Belly diameter', 2, 400, 0.5, 36), len('h', 'Height', 2, 400, 0.5, 48), range('bulge', 'Bulge', 0, 40, 1, 14, { unit: '%' }), range('hoops', 'Hoops', 0, 6, 1, 2), range('sides', 'Sides', 6, 96, 1, 32)],
    build({ Manifold: M, CrossSection: CS }, p) {
      const rb = p.d / 2, re = rb / (1 + p.bulge / 100);
      const rAt = (z) => re + (rb - re) * Math.sin((Math.PI * z) / p.h);
      const pts = [[0, 0]];
      for (let k = 0; k <= 16; k++) { const z = (k / 16) * p.h; pts.push([rAt(z), z]); }
      pts.push([0, p.h]);
      let barrel = poly(CS, pts).revolve(p.sides);
      const band = Math.max(p.h * 0.035, 0.1);
      const hoops = [];
      for (let i = 0; i < p.hoops; i++) {
        const z = p.hoops === 1 ? p.h / 2 : p.h * (0.12 + (0.76 * i) / (p.hoops - 1));
        hoops.push(M.cylinder(band, rAt(z) + band * 0.5, rAt(z) + band * 0.5, p.sides).translate([0, 0, z - band / 2]));
      }
      if (hoops.length) barrel = barrel.add(M.union(hoops));
      return barrel.subtract(M.cylinder(p.h * 0.05, re * 0.85, re * 0.85, p.sides).translate([0, 0, p.h * 0.97]));
    },
  },
  {
    id: 'tree', axial: true, name: 'Low-poly tree', group: GAME, kind: 'object', blurb: 'Faceted trees for game levels and dioramas.',
    params: [len('h', 'Height', 4, 600, 0.5, 80), len('crown', 'Crown width', 2, 400, 0.5, 40), len('trunk', 'Trunk diameter', 0.5, 100, 0.5, 6), select('style', 'Style', [['pine', 'Pine'], ['round', 'Round'], ['cluster', 'Cluster']], 'pine'), range('sides', 'Facets', 4, 24, 1, 7)],
    build({ Manifold: M }, p) {
      const tr = p.trunk / 2, cr = p.crown / 2;
      const trunkH = p.style === 'pine' ? p.h * 0.28 : p.h * 0.45;
      const parts = [M.cylinder(trunkH + p.h * 0.05, tr * 1.25, tr, p.sides)];
      if (p.style === 'pine') {
        const tiers = 3, tierH = (p.h - trunkH) / 2;
        for (let i = 0; i < tiers; i++) parts.push(M.cylinder(tierH, cr * (1 - i * 0.22), 0, p.sides).translate([0, 0, trunkH + i * tierH * 0.5]).rotate([0, 0, i * 17]));
      } else if (p.style === 'round') {
        const rr = Math.min(cr, (p.h - trunkH) / 2 * 1.1);
        parts.push(M.sphere(rr, Math.max(4, Math.round(p.sides / 2) * 2)).scale([cr / rr, cr / rr, 1]).translate([0, 0, p.h - rr]));
      } else {
        const rr = Math.min(cr * 0.6, (p.h - trunkH) / 2);
        const seg = Math.max(4, Math.round(p.sides / 2) * 2);
        parts.push(M.sphere(rr, seg).translate([0, 0, p.h - rr]), M.sphere(rr * 0.8, seg).translate([cr * 0.45, cr * 0.1, p.h - rr * 1.5]), M.sphere(rr * 0.75, seg).translate([-cr * 0.4, -cr * 0.2, p.h - rr * 1.6]));
      }
      return M.union(parts);
    },
  },
  {
    id: 'rock', name: 'Rock', group: GAME, kind: 'object', blurb: 'Every seed is a different rock. Flatten it for stepping stones.',
    params: [len('d', 'Size', 1, 400, 0.5, 30), range('flat', 'Height', 20, 100, 1, 65, { unit: '%' }), range('rough', 'Roughness', 0, 60, 1, 30, { unit: '%' }), range('seed', 'Seed', 1, 999, 1, 7), range('detail', 'Detail', 8, 48, 4, 16)],
    build({ Manifold: M, noise }, p) {
      const r = p.d / 2, a = p.rough / 100, s = p.seed * 7.31, z = p.flat / 100;
      return M.sphere(r, p.detail).warp((v) => {
        const k = 1 + a * (noise3(noise, v[0] / r * 1.3 + s, v[1] / r * 1.3, v[2] / r * 1.3) - 0.5) * 2;
        v[0] *= k; v[1] *= k; v[2] *= k * z;
      });
    },
  },
  {
    id: 'gem', axial: true, name: 'Gem', group: GAME, kind: 'handheld', blurb: 'A cut crystal. Give it the Glow finish for a pickup.',
    params: [len('d', 'Width', 1, 200, 0.5, 20), len('h', 'Height', 1, 200, 0.5, 24), range('facets', 'Facets', 3, 24, 1, 8), range('table', 'Top size', 10, 90, 1, 55, { unit: '%' })],
    build({ Manifold: M }, p) {
      // one convex hull: the pavilion's tip, the girdle (widest ring) and the flat table on top
      const r = p.d / 2, hp = p.h * 0.62, rt = (r * p.table) / 100, pts = [[0, 0, 0]];
      for (let i = 0; i < p.facets; i++) {
        const a = (i * 2 * Math.PI) / p.facets, b = a + Math.PI / p.facets;
        pts.push([r * Math.cos(a), r * Math.sin(a), hp], [rt * Math.cos(b), rt * Math.sin(b), p.h]);
      }
      return M.hull(pts);
    },
  },
  {
    id: 'coin', axial: true, name: 'Coin', group: GAME, kind: 'handheld', blurb: 'A raised rim and emblem: coins, medals, buttons, tokens.',
    params: [len('d', 'Diameter', 1, 200, 0.5, 24), len('t', 'Thickness', 0.2, 40, 0.1, 3), select('emblem', 'Emblem', [['star', 'Star'], ['heart', 'Heart'], ['none', 'Plain']], 'star'), range('sides', 'Sides', 6, 96, 1, 64)],
    build({ Manifold: M, CrossSection: CS }, p) {
      const r = p.d / 2, rim = r * 0.12, depth = p.t * 0.22;
      let coin = M.cylinder(p.t, r, r, p.sides).subtract(M.cylinder(depth + 0.01, r - rim, r - rim, p.sides).translate([0, 0, p.t - depth]));
      if (p.emblem !== 'none') {
        const e = r * 0.55;
        const shape = p.emblem === 'star' ? poly(CS, starPoints(5, e, e * 0.45)) : CS.union([CS.square([e, e], true).rotate(45), CS.circle(e / 2, 32).translate([-e * 0.354, e * 0.354]), CS.circle(e / 2, 32).translate([e * 0.354, e * 0.354])]).translate([0, -e * 0.2]);
        coin = coin.add(shape.extrude(depth * 0.9).translate([0, 0, p.t - depth]));
      }
      return coin;
    },
  },
  {
    id: 'sword', name: 'Sword', group: GAME, kind: 'handheld', blurb: 'Blade, guard, grip and pommel in one piece.',
    params: [len('l', 'Blade length', 4, 400, 0.5, 70), len('w', 'Blade width', 0.5, 60, 0.5, 8), len('guard', 'Guard width', 1, 120, 0.5, 26), len('grip', 'Grip length', 1, 120, 0.5, 18), len('t', 'Thickness', 0.2, 20, 0.1, 2)],
    build({ Manifold: M, CrossSection: CS }, p) {
      const gh = p.w * 0.6, base = p.grip + gh;
      const tip = Math.min(p.w, p.l * 0.5);
      const blade = standUp(poly(CS, [[-p.w / 2, 0], [p.w / 2, 0], [p.w / 2, p.l - tip], [0, p.l], [-p.w / 2, p.l - tip]]).extrude(p.t)).translate([0, p.t / 2, base - 0.01]);
      return M.union([
        blade,
        M.cube([p.guard, p.t * 2.6, gh], true).translate([0, 0, p.grip + gh / 2]),
        M.cylinder(p.grip, p.w * 0.28, p.w * 0.32, 24),
        M.sphere(p.w * 0.45, 24).translate([0, 0, 0]),
      ]);
    },
  },
  {
    id: 'terrain', name: 'Terrain tile', group: GAME, kind: 'object', blurb: 'Hills on a base. Bigger feature size gives broad hills; the seed reshapes them.',
    params: [len('w', 'Width', 2, 1000, 0.5, 100), len('d', 'Depth', 2, 1000, 0.5, 100), len('base', 'Base thickness', 0.2, 100, 0.2, 4), len('amp', 'Hill height', 0, 300, 0.5, 15), len('feature', 'Feature size', 1, 500, 0.5, 40), range('seed', 'Seed', 1, 999, 1, 3), range('detail', 'Detail', 4, 48, 1, 24)],
    build({ Manifold: M, noise }, p) {
      const off = p.seed * 13.7, top = p.base - p.base * 1e-4;
      return M.cube([p.w, p.d, p.base]).translate([-p.w / 2, -p.d / 2, 0]).refine(p.detail).warp((v) => {
        if (v[2] >= top) v[2] = p.base + p.amp * noise.fbm(v[0] / p.feature + off, v[1] / p.feature - off, 4);
      });
    },
  },
];

/* ── Sketch your own ──────────────────────────────────────────────────── */

const sketches = [
  {
    id: 'sketch-extrude', name: 'Sketch → extrude', group: SKETCH, kind: 'object', blurb: 'Draw any outline, then pull it up. Twist it or shrink the top for vases, towers and tapered handles.',
    params: [
      { id: 'points', label: 'Outline', type: 'points', closed: true, len: true, max: 400, default: [[-20, -15], [20, -15], [20, 8], [0, 22], [-20, 8]] },
      len('h', 'Height', 0.2, 600, 0.5, 20), range('twist', 'Twist', -720, 720, 5, 0, { unit: '°' }), range('top', 'Top size', 0, 200, 1, 100, { unit: '%' }), range('smooth', 'Smooth corners', 0, 4, 1, 0),
    ],
    build({ CrossSection: CS }, p) {
      const pts = smoothPoints(p.points, p.smooth, true);
      if (pts.length < 3 || Math.abs(polygonArea(pts)) < 1e-9) throw new Error('The outline needs at least three points that enclose an area.');
      const section = poly(CS, pts);
      if (section.isEmpty()) throw new Error('The outline needs at least three points that enclose an area.');
      const t = p.top / 100, div = p.twist ? Math.ceil(Math.abs(p.twist) / 6) : 0;
      return section.extrude(p.h, div, p.twist, [t, t]);
    },
  },
  {
    id: 'sketch-revolve', axial: true, name: 'Sketch → spin (lathe)', group: SKETCH, kind: 'object', blurb: 'Draw half a silhouette beside the axis and spin it: vases, bottles, chess pieces, lamp shades, wheels.',
    params: [
      { id: 'points', label: 'Silhouette', type: 'points', closed: false, axis: true, len: true, max: 400, default: [[12, 0], [16, 8], [17, 18], [11, 30], [8, 38], [10, 44]] },
      range('degrees', 'Spin', 15, 360, 15, 360, { unit: '°' }), range('sides', 'Sides', 3, 96, 1, 64), len('wall', 'Hollow wall (0 = solid)', 0, 50, 0.2, 0), range('smooth', 'Smooth curve', 0, 4, 1, 2),
    ],
    build({ CrossSection: CS, Manifold: M }, p) {
      const line = smoothPoints(p.points.map(([x, y]) => [Math.max(0, x), y]), p.smooth, false);
      const outline = [[0, line[0][1]], ...line, [0, line[line.length - 1][1]]];
      if (line.length < 2 || Math.abs(polygonArea(outline)) < 1e-9) throw new Error('Draw a silhouette to the right of the axis with at least two points.');
      let region = poly(CS, outline);
      if (p.wall > 0) {
        const inner = region.offset(-p.wall, 'Round', 2, 16);
        if (!inner.isEmpty()) {
          const topY = Math.max(line[0][1], line[line.length - 1][1]);
          const lastX = (line[line.length - 1][1] >= line[0][1] ? line[line.length - 1] : line[0])[0];
          const cuts = [inner];
          if (lastX - p.wall > 0) cuts.push(CS.square([lastX - p.wall, p.wall * 3]).translate([0, topY - p.wall * 1.5]));
          region = region.subtract(CS.union(cuts));
        }
      }
      if (region.isEmpty()) throw new Error('The silhouette has no area to spin.');
      return region.revolve(p.sides, p.degrees);
    },
  },
];

export const SHAPES = [...basics, ...architecture, ...mechanisms, ...game, ...sketches];
export const SHAPE_GROUPS = [BASIC, ARCH, MECH, GAME, SKETCH];
export const shapeById = (id) => SHAPES.find((s) => s.id === id);
