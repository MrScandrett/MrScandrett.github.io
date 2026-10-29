/* Loose material on a vibrating plate, in real units.

   Sand: a grain resting on a plate that moves as A·sin ωt leaves the surface
   when the plate's downward acceleration exceeds gravity, i.e. when
   Γ = ω²A / g > 1. It takes off at the phase where sin φ = 1/Γ with the plate's
   velocity there, v₀ = ωA·√(1 − 1/Γ²), flies for t = 2v₀/g, and lands somewhere
   new. Where Γ < 1 nothing can launch it, so grains random-walk out of the loud
   regions and get stuck in the quiet bands around the nodal lines: that is the
   whole Chladni mechanism. The band is narrower when the drive is louder.

   The one tuned number is SCATTER: real grains are irregular and the bounce is
   inelastic, so the horizontal launch velocity is a random fraction of v₀. It is
   set so a strongly driven low mode draws its figure in about ten seconds, as on
   a real plate. The plate's own tilt at takeoff (slope ∇A/Γ) adds a small push
   toward the nodes. A grain can only relaunch at the same phase of a later
   cycle, so it hops at most once per vibration.

   Hop length goes as A²ω² ∝ Γ²/ω², so at equal Γ a high mode moves sand far more
   slowly than a low one: high-pitched figures need a stronger drive or patience.

   Air drag is linear (Stokes) with the grain's terminal velocity v_t, so its
   relaxation time is τ = v_t/g: about 0.2 s for a 0.3 mm sand grain (drag barely
   matters) but ~3 ms for a 30 µm spore of lycopodium powder, which in air can
   only drift a millimetre or so per hop.

   Fine powder in air (Faraday, 1831): the vibrating plate drives a steady
   "streaming" flow in the air next to it, from the nodes toward the antinodes,
   and light particles ride it. Rayleigh/Schlichting streaming goes as
   u ≈ (3/4ω)·∇(U²) with U = ωA the local plate velocity, i.e. u ≈ (3/2)·ωA·∇A:
   zero at nodes and antinodes, strongest in between, so powder is pushed off the
   nodes and gathers at the antinodes. Treat the 3/2 as order of magnitude. In a
   vacuum there is no air, and the same powder behaves like sand. */

export const G = 9.80665;
export const SCATTER = { sand: 0.6, powder: 0.6 };
export const TERMINAL = { sand: 2.0, powder: 0.03 }; // m/s in air

/* Sample |W| (m) and its gradient (dimensionless, per metre) from a field:
   { N, re, im, s } with complex displacement amplitudes on an N×N grid over
   nondimensional [-1, 1]², s = half-size in metres. */
export function sampleField(field, x, y, out = {}) {
  const { N, re, im } = field;
  const fx = (x + 1) / 2 * (N - 1), fy = (y + 1) / 2 * (N - 1);
  const i0 = Math.max(0, Math.min(N - 2, Math.floor(fx))), j0 = Math.max(0, Math.min(N - 2, Math.floor(fy)));
  const tx = Math.max(0, Math.min(1, fx - i0)), ty = Math.max(0, Math.min(1, fy - j0));
  const k = j0 * N + i0;
  const a00 = Math.hypot(re[k], im[k]), a10 = Math.hypot(re[k + 1], im[k + 1]);
  const a01 = Math.hypot(re[k + N], im[k + N]), a11 = Math.hypot(re[k + N + 1], im[k + N + 1]);
  out.A = (a00 * (1 - tx) + a10 * tx) * (1 - ty) + (a01 * (1 - tx) + a11 * tx) * ty;
  const cell = 2 * field.s / (N - 1);
  out.gx = ((a10 - a00) * (1 - ty) + (a11 - a01) * ty) / cell;
  out.gy = ((a01 - a00) * (1 - tx) + (a11 - a10) * tx) / cell;
  return out;
}

/* Takeoff of a grain resting where the plate moves with amplitude A at ω. */
export function takeoff(A, omega) {
  const gamma = omega * omega * A / G;
  if (gamma <= 1) return null;
  const v0 = omega * A * Math.sqrt(1 - 1 / (gamma * gamma));
  return { gamma, v0, flight: 2 * v0 / G };
}

/* Flight with linear drag (τ = v_t/g; τ = Infinity is a vacuum):
   z(t) = τ(v₀ + v_t)(1 − e^(−t/τ)) − v_t·t. Returns the time z returns to 0. */
export function flightTime(v0, tau) {
  if (!isFinite(tau)) return 2 * v0 / G;
  const vt = G * tau;
  let t = Math.min(2 * v0 / G, 2 * (v0 + vt) / G);
  for (let i = 0; i < 30; i++) {
    const e = Math.exp(-t / tau), z = tau * (v0 + vt) * (1 - e) - vt * t, dz = (v0 + vt) * e - vt;
    const step = z / dz;
    t = Math.max(t * 0.5, t - step);
    if (Math.abs(step) < 1e-9 * t) break;
  }
  return t;
}

/* Horizontal distance for launch speed v_h after time t with drag time τ. */
export function driftDistance(vh, t, tau) {
  return isFinite(tau) ? vh * tau * (1 - Math.exp(-t / tau)) : vh * t;
}

/* Streaming velocity (m/s, vector) of the air layer that carries fine powder. */
export function streamingVelocity(A, gx, gy, omega) {
  const k = 1.5 * omega * A;
  return [k * gx, k * gy];
}

/* A bed of grains, positions in nondimensional plate coordinates.
   inside(x, y) says whether a point is on the plate (outside → it fell off). */
export class GrainBed {
  constructor({ count, kind = 'sand', inside, spawn, rng = Math.random }) {
    this.kind = kind; this.inside = inside; this.spawn = spawn; this.rng = rng;
    this.t = 0;
    this.grains = Array.from({ length: count }, () => this.fresh());
  }

  fresh() {
    const [x, y] = this.spawn(this.rng);
    return { x, y, x0: x, y0: y, x1: x, y1: y, tLaunch: 0, tLand: 0, tNext: 0, v0: 0, airborne: false, spike: 0 };
  }

  resprinkle() { this.grains = this.grains.map(() => this.fresh()); }

  /* Advance real time by dt seconds.
     env = { field, omega, air (default true; false is a vacuum) } */
  step(dt, env) {
    const { field, omega } = env;
    const t1 = this.t + dt, s = field.s, scatter = SCATTER[this.kind] ?? SCATTER.sand;
    const smp = {};
    let hopping = 0;
    const air = env.air !== false, streaming = this.kind === 'powder' && air;
    const tau = air ? (TERMINAL[this.kind] ?? TERMINAL.sand) / G : Infinity;
    for (const g of this.grains) {
      if (streaming) {
        // air near the plate drifts toward the antinodes and carries the powder with it
        const p = this.pose(g);
        sampleField(field, p.x, p.y, smp);
        const [ux, uy] = streamingVelocity(smp.A, smp.gx, smp.gy, omega);
        const dx = ux * dt / s, dy = uy * dt / s;
        g.x += dx; g.y += dy; g.x0 += dx; g.y0 += dy; g.x1 += dx; g.y1 += dy;
      }
      let guard = 0;
      while (Math.max(g.tLand, g.tNext) <= t1 && guard++ < 8) {
        // landed (or resting): settle at the landing point, then try to launch again
        if (g.airborne) { g.x = g.x1; g.y = g.y1; g.airborne = false; }
        if (!this.inside(g.x, g.y)) { Object.assign(g, this.fresh(), { tLand: g.tLand, tNext: g.tNext }); }
        const now = Math.max(g.tLand, g.tNext, this.t);
        sampleField(field, g.x, g.y, smp);
        const lift = takeoff(smp.A, omega);
        if (!lift) { g.tLand = g.tNext = t1 + 1e-9; break; }
        const ang = this.rng() * 2 * Math.PI, mag = scatter * Math.sqrt(-2 * Math.log(this.rng() + 1e-12)) / Math.SQRT2;
        const tilt = 1 / lift.gamma;
        const vx = lift.v0 * (mag * Math.cos(ang) - smp.gx * tilt), vy = lift.v0 * (mag * Math.sin(ang) - smp.gy * tilt);
        const flight = flightTime(lift.v0, tau), reach = driftDistance(1, flight, tau);
        g.airborne = true; g.v0 = lift.v0; g.tau = tau;
        g.x0 = g.x; g.y0 = g.y;
        g.x1 = g.x + vx * reach / s; g.y1 = g.y + vy * reach / s;
        g.tLaunch = now; g.tLand = now + flight;
        // a grain can only take off again at the same phase of a later cycle
        g.tNext = now + Math.ceil(flight * omega / (2 * Math.PI) + 1e-9) * 2 * Math.PI / omega;
      }
      if (g.airborne && g.tLand > t1) hopping++;
    }
    this.t = t1;
    return hopping / Math.max(1, this.grains.length);
  }

  /* Where a grain is right now: position and height above the plate (m). */
  pose(g) {
    if (!g.airborne) return { x: g.x, y: g.y, z: 0 };
    const t = Math.max(0, Math.min(this.t, g.tLand) - g.tLaunch), T = Math.max(1e-9, g.tLand - g.tLaunch);
    const f = driftDistance(1, t, g.tau) / driftDistance(1, T, g.tau);
    const z = isFinite(g.tau)
      ? g.tau * (g.v0 + G * g.tau) * (1 - Math.exp(-t / g.tau)) - G * g.tau * t
      : g.v0 * t - G * t * t / 2;
    return { x: g.x0 + (g.x1 - g.x0) * f, y: g.y0 + (g.y1 - g.y0) * f, z: Math.max(0, z) };
  }
}
