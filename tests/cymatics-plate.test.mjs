import test from 'node:test';
import assert from 'node:assert/strict';
import {
  freeCircleExact, circleRadialModes, freeSquareModes, polarRitz, squareBoltedModes, SQUARE_TRUST,
  buildPlate, modalForces, steadyAmplitude, relaxAmplitude, besselJ, MATERIALS
} from '../assets/js/cymatics/plate-physics.mjs';
import { GrainBed, takeoff, flightTime, driftDistance, G } from '../assets/js/cymatics/granular.mjs';

const rel = (a, b) => Math.abs(a / b - 1);

test('Bessel J matches tabulated values', () => {
  assert.ok(Math.abs(besselJ(0, 1) - 0.7651976866) < 1e-9);
  assert.ok(Math.abs(besselJ(1, 1) - 0.4400505857) < 1e-9);
  assert.ok(Math.abs(besselJ(0, 2.404825558)) < 1e-8, 'first zero of J0');
});

test('free circular plate: Ritz matches the exact Bessel frequency equation', () => {
  for (let n = 0; n <= 5; n++) {
    const exact = freeCircleExact(n, 0.3, 3);
    const ritz = circleRadialModes(n, { nu: 0.3, clamp: false, degree: 30 }).slice(0, 3);
    exact.forEach((k, i) => assert.ok(rel(Math.sqrt(ritz[i].eig), k * k) < 1e-5, `n=${n} s=${i}: ${Math.sqrt(ritz[i].eig)} vs ${k * k}`));
  }
  // Leissa (1969): free circular plate, ν = 0.3, λ² = 5.358 for two nodal diameters
  assert.ok(rel(freeCircleExact(2, 0.3, 1)[0] ** 2, 5.358) < 1e-3);
});

test('free square plate matches Leissa’s values (ν = 0.3)', () => {
  // λ² = ωa²√(ρh/D) with a the full side; our eigenvalue uses the half side
  const lam2 = freeSquareModes({ nu: 0.3, degree: 24 }).slice(0, 5).map(m => 4 * Math.sqrt(m.eig));
  [13.468, 19.596, 24.270, 34.801, 34.801].forEach((v, i) => assert.ok(rel(lam2[i], v) < 1e-3, `mode ${i}: ${lam2[i]}`));
});

test('polar solver on a disk reproduces the clamped-annulus circle solver', () => {
  for (const n of [0, 3]) {
    const polar = polarRitz({ nu: 0.29, bolt: 0.05, rho: () => 1, rmax: 1, harmonics: [{ n, trig: 'c' }], degree: 20, sectors: [[0, Math.PI / 2, 4]] });
    const radial = circleRadialModes(n, { nu: 0.29, bolt: 0.05 });
    for (let i = 0; i < 3; i++) assert.ok(rel(polar[i].eig, radial[i].eig) < 1e-6, `n=${n} s=${i}`);
  }
});

test('bolted square plate is converged in the range the lesson trusts', () => {
  const a = squareBoltedModes({ nu: 0.29, bolt: 0.05, harmonics: 12, degree: 16 });
  const b = squareBoltedModes({ nu: 0.29, bolt: 0.05, harmonics: 14, degree: 19 });
  for (const [sym, last] of Object.entries(SQUARE_TRUST)) {
    const ca = a.filter(m => m.sym === sym), cb = b.filter(m => m.sym === sym);
    // frequency ∝ √eig, so 1e-3 here is 0.05% in hertz
    for (let i = 0; i <= last; i++) assert.ok(rel(ca[i].eig, cb[i].eig) < 1e-3, `${sym} #${i}: ${ca[i].eig} vs ${cb[i].eig}`);
  }
});

test('clamping the bolt can only raise each frequency (Rayleigh’s constraint theorem)', () => {
  for (const n of [0, 1, 2, 5]) {
    const rigid = n <= 1 ? [0] : [];
    const free = [...rigid, ...circleRadialModes(n, { nu: 0.3, clamp: false }).map(m => m.eig)];
    const bolted = circleRadialModes(n, { nu: 0.3, bolt: 0.05 }).map(m => m.eig);
    for (let i = 0; i < 5; i++) assert.ok(bolted[i] >= free[i] * (1 - 1e-5), `n=${n} #${i}`);
  }
});

test('frequencies scale like real plates: f ∝ h, f ∝ 1/L², f ∝ √(E/ρ(1−ν²))', () => {
  const base = buildPlate({ shape: 'circle', material: 'steel', size: 0.24, thickness: 0.0008 });
  const thick = buildPlate({ shape: 'circle', material: 'steel', size: 0.24, thickness: 0.0016 });
  assert.ok(rel(thick.modes[0].f, 2 * base.modes[0].f) < 1e-9);
  const big = buildPlate({ shape: 'circle', material: 'steel', size: 0.48, thickness: 0.0008, boltDiameter: 0.024 });
  assert.ok(rel(big.modes[0].f, base.modes[0].f / 4) < 1e-9);
  // steel and aluminium have nearly the same E/ρ, so nearly the same pitch
  const al = buildPlate({ shape: 'circle', material: 'aluminum', size: 0.24, thickness: 0.0008 });
  const ratio = Math.sqrt((MATERIALS.aluminum.E / MATERIALS.aluminum.rho / (1 - MATERIALS.aluminum.nu ** 2)) / (MATERIALS.steel.E / MATERIALS.steel.rho / (1 - MATERIALS.steel.nu ** 2)));
  assert.ok(Math.abs(al.modes[2].f / base.modes[2].f - ratio) < 0.02, 'only ν changes the mode shape');
});

test('a centred driver can only excite modes that move the centre of mass', () => {
  const sq = buildPlate({ shape: 'square', material: 'steel', size: 0.24, thickness: 0.0008 });
  for (const m of sq.modes) {
    if (m.sym === 'A1') continue;
    assert.equal(m.participation, 0, `${m.sym} mode at ${m.f.toFixed(1)} Hz`);
  }
  assert.ok(sq.modes.some(m => m.sym === 'A1' && Math.abs(m.participation) > 0.1));
  const ci = buildPlate({ shape: 'circle', material: 'steel', size: 0.24, thickness: 0.0008 });
  for (const m of ci.modes) if (m.n > 0) assert.equal(m.participation, 0);
  // a bow at the edge reaches the others
  const F = modalForces(sq, 2 * Math.PI * sq.modes[0].f, { type: 'bow', amplitude: 1, x: 1, y: 0.4 });
  assert.ok(Math.abs(F[0]) > 0);
});

test('mass-normalised modes: ∫ρh φ² dA = 1 on the display grid', () => {
  const ci = buildPlate({ shape: 'circle', material: 'brass', size: 0.2, thickness: 0.001 });
  const m = ci.modes[4], N = ci.N, cell = (2 * ci.s / (N - 1)) ** 2;
  let sum = 0;
  for (let k = 0; k < N * N; k++) {
    const x = ci.coords[k % N], y = ci.coords[Math.floor(k / N)];
    if (x * x + y * y <= 1) sum += ci.rhoH * (m.grid[k] * m.scale) ** 2 * cell;
  }
  assert.ok(Math.abs(sum - 1) < 0.03, `${sum}`);
});

test('a driven mode rings up to F/(2ζω²) with time constant 1/(ζω)', () => {
  const w = 2 * Math.PI * 300, zeta = 1 / 600, F = 1;
  const [re, im] = steadyAmplitude(F, w, w, zeta);
  assert.ok(Math.abs(re) < 1e-12 && rel(Math.abs(im), F / (2 * zeta * w * w)) < 1e-12);
  let A = [0, 0];
  const tau = 1 / (zeta * w), dt = tau / 50;
  for (let i = 0; i < 50; i++) A = relaxAmplitude(A, F, w, w, zeta, dt);
  assert.ok(rel(Math.hypot(...A) / Math.abs(im), 1 - Math.exp(-1)) < 1e-3, 'one time constant reaches 63%');
  for (let i = 0; i < 2000; i++) A = relaxAmplitude(A, F, w, w * 1.01, zeta, dt);
  const ss = steadyAmplitude(F, w, w * 1.01, zeta);
  assert.ok(Math.hypot(A[0] - ss[0], A[1] - ss[1]) < 1e-6 * Math.hypot(...ss), 'settles to the detuned steady state');
});

test('a grain lifts off only when plate acceleration exceeds g', () => {
  const w = 2 * Math.PI * 200;
  assert.equal(takeoff(0.99 * G / (w * w), w), null);
  const t = takeoff(4 * G / (w * w), w);
  assert.ok(rel(t.gamma, 4) < 1e-12);
  assert.ok(rel(t.v0, w * 4 * G / (w * w) * Math.sqrt(1 - 1 / 16)) < 1e-12);
  assert.ok(rel(t.flight, 2 * t.v0 / G) < 1e-12);
});

test('air drag kills a light powder’s sideways hop but only trims sand’s', () => {
  const v0 = 0.5, vacuum = driftDistance(1, flightTime(v0, Infinity), Infinity);
  assert.ok(rel(vacuum, 2 * v0 / G) < 1e-12);
  const reach = vt => driftDistance(1, flightTime(v0, vt / G), vt / G) / vacuum;
  assert.ok(reach(2.0) > 0.7, `sand keeps ${reach(2.0)}`);
  assert.ok(reach(0.03) < 0.05, `powder keeps ${reach(0.03)}`);
});

function stripeField(A0, s = 0.12, N = 81) {
  // standing wave with nodes at x = ±0.5: |W| = A0|cos(πx)|
  const re = new Float32Array(N * N), im = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) re[j * N + i] = A0 * Math.cos(Math.PI * (-1 + 2 * i / (N - 1)));
  return { N, re, im, s };
}

function seeded(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

test('sand collects in the quiet bands around nodal lines; louder drive, thinner bands', () => {
  const omega = 2 * Math.PI * 400;
  const widths = [];
  for (const gammaMax of [150, 400]) {
    const field = stripeField(gammaMax * G / (omega * omega));
    const bed = new GrainBed({ count: 600, inside: (x, y) => Math.abs(x) <= 1 && Math.abs(y) <= 1, spawn: r => [r() * 2 - 1, r() * 2 - 1], rng: seeded(7) });
    for (let i = 0; i < 1200; i++) bed.step(1 / 60, { field, omega });
    const nearNode = bed.grains.filter(g => Math.abs(Math.abs(g.x) - 0.5) < 0.12).length / bed.grains.length;
    assert.ok(nearNode > 0.8, `Γmax=${gammaMax}: ${nearNode}`);
    widths.push(bed.grains.reduce((s, g) => s + Math.abs(Math.abs(g.x) - 0.5), 0) / bed.grains.length);
  }
  assert.ok(widths[1] < widths[0], `bands ${widths}`);
});

test('fine powder goes to the antinodes in air and to the nodes in a vacuum (Faraday 1831)', () => {
  const omega = 2 * Math.PI * 400, field = stripeField(250 * G / (omega * omega));
  const run = air => {
    const bed = new GrainBed({ count: 400, kind: 'powder', inside: (x, y) => Math.abs(x) <= 1 && Math.abs(y) <= 1, spawn: r => [r() * 2 - 1, r() * 2 - 1], rng: seeded(11) });
    for (let i = 0; i < 1200; i++) bed.step(1 / 60, { field, omega, air });
    const share = test => bed.grains.filter(g => test(Math.abs(g.x))).length / bed.grains.length;
    return { node: share(x => Math.abs(x - 0.5) < 0.15), antinode: share(x => x < 0.15 || x > 0.85) };
  };
  assert.ok(run(false).node > 0.9, 'vacuum: powder behaves like sand');
  assert.ok(run(true).antinode > 0.7, 'air: streaming carries it to the antinodes');
});
