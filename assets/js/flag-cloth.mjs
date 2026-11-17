// Flag cloth: a pure (DOM-free, Three-free) simulation of a flag on a pole.
//
// The cloth is a grid of particles joined by distance constraints (stretch,
// shear, bend) and solved with "small steps" XPBD: many substeps, one
// constraint pass each, which stays stiff and stable at classroom frame rates.
// Wind is real aerodynamics, not a drawn wave: every triangle feels pressure
// along its normal from the air moving past it, (½ρC·v⊥|v⊥|·A), plus a little
// skin friction along it. A flag ripples because that flat-plate pressure is
// unstable, so the folds, the travelling waves and the snapping fly end all
// come out of the physics. Gusts are noise carried downwind at the wind speed.
//
// Units are SI: metres, seconds, kilograms. The hoist (left) edge is pinned to
// the pole along the header; row 0 is the top of the flag.

const RHO_AIR = 1.2; // kg/m³

export const WIND_PRESETS = {
  // Beaufort 2–3 (light), 3–4 (gentle-moderate), 4–5 (fresh).
  calm: { speed: 4, gust: .35, swirl: .3, lift: .12 },
  medium: { speed: 5.5, gust: .3, swirl: .28, lift: .1 },
  strong: { speed: 8.5, gust: .28, swirl: .26, lift: .08 }
};

// Small deterministic value noise so the module needs nothing from the page.
function hash(x, y, seed) {
  const s = Math.sin((x + y * 57 + seed * 131) * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise2(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c + (d - c) * fx - a - (b - a) * fx) * fy;
}
// Two octaves, centred on zero, roughly in [-1, 1].
function turbulence(x, y, seed) {
  return (noise2(x, y, seed) * 1.33 + noise2(x * 2.1 + 17.3, y * 2.1 - 4.1, seed) * .67) - 1;
}

export function createFlagCloth(options = {}) {
  const width = options.width ?? 3.8;
  const height = options.height ?? 2;
  const cols = options.cols ?? 44;
  const rows = options.rows ?? 24;
  const x0 = options.x ?? 0;
  const yTop = options.y ?? 0;
  const areal = options.areal ?? .2; // kg/m², a sewn nylon flag with seams and embroidery
  const substeps = options.substeps ?? 10;
  const gravity = options.gravity ?? 9.81;
  const damping = options.damping ?? .12; // 1/s, air drag the pressure model misses
  const drag = options.drag ?? 1.15; // flat-plate normal pressure coefficient
  const friction = options.friction ?? .025;
  const stretchCompliance = options.stretchCompliance ?? 0;
  const shearCompliance = options.shearCompliance ?? 1e-6;
  const bendCompliance = options.bendCompliance ?? 3e-4;
  const seed = options.seed ?? 1;

  const nx = cols + 1, ny = rows + 1, n = nx * ny;
  const dx = width / cols, dy = height / rows;
  const pos = new Float32Array(n * 3);
  const prev = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const force = new Float32Array(n * 3);
  const wind = new Float32Array(n * 3);
  const invMass = new Float32Array(n);
  const mass = areal * width * height / n;

  // Start flying with a gentle droop toward the fly, so a short settle is enough.
  for (let r = 0; r < ny; r++) {
    for (let c = 0; c < nx; c++) {
      const i = r * nx + c;
      pos[i * 3] = x0 + c * dx;
      pos[i * 3 + 1] = yTop - r * dy;
      pos[i * 3 + 2] = 0;
      invMass[i] = c === 0 ? 0 : 1 / mass;
    }
  }
  prev.set(pos);
  const pinned = new Float32Array(pos);

  // Constraints: [a, b, rest, compliance], packed into typed arrays.
  const list = [];
  const id = (r, c) => r * nx + c;
  const add = (a, b, compliance) => {
    const ddx = pos[a * 3] - pos[b * 3], ddy = pos[a * 3 + 1] - pos[b * 3 + 1];
    list.push(a, b, Math.hypot(ddx, ddy), compliance);
  };
  for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) {
    if (c < cols) add(id(r, c), id(r, c + 1), stretchCompliance);
    if (r < rows) add(id(r, c), id(r + 1, c), stretchCompliance);
    if (c < cols && r < rows) {
      add(id(r, c), id(r + 1, c + 1), shearCompliance);
      add(id(r, c + 1), id(r + 1, c), shearCompliance);
    }
    if (c < cols - 1) add(id(r, c), id(r, c + 2), bendCompliance);
    if (r < rows - 1) add(id(r, c), id(r + 2, c), bendCompliance);
  }
  const count = list.length / 4;
  const ca = new Uint32Array(count), cb = new Uint32Array(count);
  const rest = new Float32Array(count), compliance = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    ca[k] = list[k * 4]; cb[k] = list[k * 4 + 1];
    rest[k] = list[k * 4 + 2]; compliance[k] = list[k * 4 + 3];
  }

  // Long-range attachments (Kim, Chentanez & Müller 2012): no particle may
  // drift farther from a hoist point than the cloth between them allows. It is
  // one-sided and cheap, and stops the fly end stretching when it snaps.
  const tetherRows = [];
  for (let k = 0; k <= 6; k++) tetherRows.push(Math.round(k * rows / 6));
  const tetherPin = new Uint32Array(n * tetherRows.length);
  const tetherLen = new Float32Array(n * tetherRows.length);
  for (let i = 0, t = 0; i < n; i++) {
    for (const r of tetherRows) {
      const p = r * nx;
      tetherPin[t] = p;
      tetherLen[t++] = Math.hypot(pos[i * 3] - pos[p * 3], pos[i * 3 + 1] - pos[p * 3 + 1]);
    }
  }
  const tethersPer = tetherRows.length;

  let time = 0;
  const air = { ...WIND_PRESETS.calm };

  // Air velocity at every particle: the mean wind blowing toward +x, with
  // gusts and swirl that ride downwind at the wind speed (frozen turbulence).
  function sampleWind() {
    const u = air.speed;
    const travel = time * u;
    // A slow whole-field surge, so the flag lifts and sags between gusts.
    const surge = 1 + air.gust * .6 * turbulence(time * .23, 3.7, seed + 9);
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1];
      const sx = (x - travel) * .55, sy = y * .55;
      const gust = 1 + air.gust * turbulence(sx, sy + time * .07, seed);
      wind[i * 3] = u * surge * gust;
      wind[i * 3 + 1] = u * (air.lift * turbulence(sx + 40, sy, seed + 3));
      wind[i * 3 + 2] = u * air.swirl * turbulence(sx - 40, sy * 1.3, seed + 5);
    }
  }

  // Aerodynamic force on every triangle, shared out to its corners.
  function aero(a, b, c) {
    const a3 = a * 3, b3 = b * 3, c3 = c * 3;
    const e1x = pos[b3] - pos[a3], e1y = pos[b3 + 1] - pos[a3 + 1], e1z = pos[b3 + 2] - pos[a3 + 2];
    const e2x = pos[c3] - pos[a3], e2y = pos[c3 + 1] - pos[a3 + 1], e2z = pos[c3 + 2] - pos[a3 + 2];
    let nxv = e1y * e2z - e1z * e2y, nyv = e1z * e2x - e1x * e2z, nzv = e1x * e2y - e1y * e2x;
    const twiceArea = Math.hypot(nxv, nyv, nzv);
    if (twiceArea < 1e-9) return;
    nxv /= twiceArea; nyv /= twiceArea; nzv /= twiceArea;
    const area = twiceArea / 2;
    const rx = (wind[a3] + wind[b3] + wind[c3] - vel[a3] - vel[b3] - vel[c3]) / 3;
    const ry = (wind[a3 + 1] + wind[b3 + 1] + wind[c3 + 1] - vel[a3 + 1] - vel[b3 + 1] - vel[c3 + 1]) / 3;
    const rz = (wind[a3 + 2] + wind[b3 + 2] + wind[c3 + 2] - vel[a3 + 2] - vel[b3 + 2] - vel[c3 + 2]) / 3;
    const vn = rx * nxv + ry * nyv + rz * nzv;
    const p = .5 * RHO_AIR * drag * vn * Math.abs(vn) * area / 3;
    const tx = rx - vn * nxv, ty = ry - vn * nyv, tz = rz - vn * nzv;
    const s = .5 * RHO_AIR * friction * Math.hypot(tx, ty, tz) * area / 3;
    const fx = p * nxv + s * tx, fy = p * nyv + s * ty, fz = p * nzv + s * tz;
    force[a3] += fx; force[a3 + 1] += fy; force[a3 + 2] += fz;
    force[b3] += fx; force[b3 + 1] += fy; force[b3 + 2] += fz;
    force[c3] += fx; force[c3 + 1] += fy; force[c3 + 2] += fz;
  }

  function computeForces() {
    force.fill(0);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * nx + c;
      aero(i, i + nx, i + 1);
      aero(i + 1, i + nx, i + nx + 1);
    }
  }

  function substep(h) {
    const decay = Math.exp(-damping * h);
    for (let i = 0; i < n; i++) {
      const w = invMass[i];
      const i3 = i * 3;
      prev[i3] = pos[i3]; prev[i3 + 1] = pos[i3 + 1]; prev[i3 + 2] = pos[i3 + 2];
      if (!w) continue;
      vel[i3] = (vel[i3] + force[i3] * w * h) * decay;
      vel[i3 + 1] = (vel[i3 + 1] + (force[i3 + 1] * w - gravity) * h) * decay;
      vel[i3 + 2] = (vel[i3 + 2] + force[i3 + 2] * w * h) * decay;
      pos[i3] += vel[i3] * h; pos[i3 + 1] += vel[i3 + 1] * h; pos[i3 + 2] += vel[i3 + 2] * h;
    }
    const h2 = h * h;
    for (let k = 0; k < count; k++) {
      const a = ca[k], b = cb[k];
      const wa = invMass[a], wb = invMass[b];
      const wsum = wa + wb;
      if (!wsum) continue;
      const a3 = a * 3, b3 = b * 3;
      const gx = pos[a3] - pos[b3], gy = pos[a3 + 1] - pos[b3 + 1], gz = pos[a3 + 2] - pos[b3 + 2];
      const len = Math.sqrt(gx * gx + gy * gy + gz * gz);
      if (len < 1e-9) continue;
      const C = len - rest[k];
      // Bending pairs resist compression only weakly, so folds can form.
      if (C < 0 && compliance[k] > shearCompliance) {
        const lambda = -C / (wsum + compliance[k] * 5 / h2) / len;
        pos[a3] += gx * lambda * wa; pos[a3 + 1] += gy * lambda * wa; pos[a3 + 2] += gz * lambda * wa;
        pos[b3] -= gx * lambda * wb; pos[b3 + 1] -= gy * lambda * wb; pos[b3 + 2] -= gz * lambda * wb;
        continue;
      }
      const lambda = -C / (wsum + compliance[k] / h2) / len;
      pos[a3] += gx * lambda * wa; pos[a3 + 1] += gy * lambda * wa; pos[a3 + 2] += gz * lambda * wa;
      pos[b3] -= gx * lambda * wb; pos[b3 + 1] -= gy * lambda * wb; pos[b3 + 2] -= gz * lambda * wb;
    }
    for (let i = 0, t = 0; i < n; i++) {
      if (!invMass[i]) { t += tethersPer; continue; }
      const i3 = i * 3;
      for (let k = 0; k < tethersPer; k++, t++) {
        const p3 = tetherPin[t] * 3;
        const gx = pos[i3] - pos[p3], gy = pos[i3 + 1] - pos[p3 + 1], gz = pos[i3 + 2] - pos[p3 + 2];
        const len = Math.sqrt(gx * gx + gy * gy + gz * gz);
        if (len <= tetherLen[t]) continue;
        const s = tetherLen[t] / len;
        pos[i3] = pos[p3] + gx * s; pos[i3 + 1] = pos[p3 + 1] + gy * s; pos[i3 + 2] = pos[p3 + 2] + gz * s;
      }
    }
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      if (!invMass[i]) {
        pos[i3] = pinned[i3]; pos[i3 + 1] = pinned[i3 + 1]; pos[i3 + 2] = pinned[i3 + 2];
        vel[i3] = vel[i3 + 1] = vel[i3 + 2] = 0;
        continue;
      }
      vel[i3] = (pos[i3] - prev[i3]) / h;
      vel[i3 + 1] = (pos[i3 + 1] - prev[i3 + 1]) / h;
      vel[i3 + 2] = (pos[i3 + 2] - prev[i3 + 2]) / h;
    }
  }

  // Advance by dt seconds. Long frames are split so a hitch never explodes the cloth.
  function step(dt) {
    let remaining = Math.min(Math.max(dt, 0), .25);
    while (remaining > 1e-6) {
      const frame = Math.min(remaining, 1 / 60);
      remaining -= frame;
      time += frame;
      sampleWind();
      const h = frame / substeps;
      for (let s = 0; s < substeps; s++) {
        // Pressure is refreshed every other substep: it is smooth on that scale.
        if (!(s & 1)) computeForces();
        substep(h);
      }
    }
  }

  // Ease the wind toward a preset (or any {speed, gust, swirl, lift}).
  function setWind(target, blend = 1) {
    for (const key of Object.keys(air)) {
      if (Number.isFinite(target[key])) air[key] += (target[key] - air[key]) * blend;
    }
  }

  function settle(seconds) {
    for (let t = 0; t < seconds; t += 1 / 60) step(1 / 60);
  }

  // Diagnostics for tests: worst stretch of any warp/weft thread, how far the
  // fly end reaches from the pole, and whether anything went non-finite.
  function stats() {
    let maxStrain = 0, finite = true, reach = 0, kinetic = 0;
    for (let k = 0; k < count; k++) {
      if (compliance[k] !== stretchCompliance) continue;
      const a3 = ca[k] * 3, b3 = cb[k] * 3;
      const len = Math.hypot(pos[a3] - pos[b3], pos[a3 + 1] - pos[b3 + 1], pos[a3 + 2] - pos[b3 + 2]);
      maxStrain = Math.max(maxStrain, Math.abs(len / rest[k] - 1));
    }
    for (let i = 0; i < n * 3; i++) if (!Number.isFinite(pos[i])) finite = false;
    for (let r = 0; r < ny; r++) reach += pos[(r * nx + cols) * 3] - x0;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      kinetic += .5 * mass * (vel[i3] ** 2 + vel[i3 + 1] ** 2 + vel[i3 + 2] ** 2);
    }
    return { maxStrain, finite, reach: reach / ny / width, kinetic, time };
  }

  return { cols, rows, nx, ny, positions: pos, wind: air, step, settle, setWind, stats };
}

// Smooth a (cols+1)×(rows+1) grid of points onto a grid `factor` times finer
// with Catmull–Rom splines, so a coarse simulation renders as soft curved cloth
// instead of visible facets. `out` holds (cols·f+1)×(rows·f+1) points.
export function upsampleGrid(src, nx, ny, factor, out) {
  const ox = (nx - 1) * factor + 1, oy = (ny - 1) * factor + 1;
  const tmp = upsampleGrid.tmp && upsampleGrid.tmp.length === ox * ny * 3
    ? upsampleGrid.tmp : (upsampleGrid.tmp = new Float32Array(ox * ny * 3));
  const target = out || new Float32Array(ox * oy * 3);
  const weights = [];
  for (let s = 0; s <= factor; s++) {
    const t = s / factor, t2 = t * t, t3 = t2 * t;
    weights.push([(-t3 + 2 * t2 - t) / 2, (3 * t3 - 5 * t2 + 2) / 2, (-3 * t3 + 4 * t2 + t) / 2, (t3 - t2) / 2]);
  }
  // Rows first (along x), then columns (along y).
  const pass = (from, to, length, lines, strideIn, lineIn, strideOut, lineOut) => {
    for (let line = 0; line < lines; line++) {
      for (let seg = 0; seg < length - 1; seg++) {
        const i1 = (line * lineIn + seg * strideIn) * 3, i2 = i1 + strideIn * 3;
        // Past either edge, extend the line straight (a ghost point), so the
        // edge segments keep even spacing instead of bunching at the hem.
        const i0 = seg > 0 ? i1 - strideIn * 3 : -1;
        const i3 = seg < length - 2 ? i2 + strideIn * 3 : -1;
        for (let s = 0; s < factor + (seg === length - 2 ? 1 : 0); s++) {
          const w = weights[s];
          const o = (line * lineOut + (seg * factor + s) * strideOut) * 3;
          for (let d = 0; d < 3; d++) {
            const v1 = from[i1 + d], v2 = from[i2 + d];
            const v0 = i0 >= 0 ? from[i0 + d] : 2 * v1 - v2;
            const v3 = i3 >= 0 ? from[i3 + d] : 2 * v2 - v1;
            to[o + d] = w[0] * v0 + w[1] * v1 + w[2] * v2 + w[3] * v3;
          }
        }
      }
    }
  };
  pass(src, tmp, nx, ny, 1, nx, 1, ox);
  pass(tmp, target, ny, ox, ox, 1, ox, 1);
  return target;
}
