/* Chladni plate physics: real thin-plate (Kirchhoff–Love) vibration modes.

   A Chladni plate obeys  D ∇⁴w + ρh ∂²w/∂t² = p(x, y, t),  D = E h³ / 12(1 − ν²).
   This module solves that equation for a plate bolted at its centre with free
   edges (how classroom plates are mounted on a wave driver), in SI units:

   - Circle: the modes separate exactly into R(r)·cos nθ / sin nθ. Each n is a 1-D
     Rayleigh–Ritz problem on the annulus b ≤ r ≤ a, with the bolt (radius b)
     clamped exactly (R = R' = 0 at r = b).
   - Square: 2-D Rayleigh–Ritz with orthonormal Legendre products. Every stiffness
     entry is a product of 1-D integrals, so assembly is exact and fast. The bolt is
     a stiff penalty on w over its footprint.

   Results are checked in tests/cymatics-plate.test.mjs against the exact Bessel
   solution of the free circular plate and Leissa's free square plate values.

   Units: metres, kilograms, seconds, hertz. Nondimensional coordinates run over
   [-1, 1] (square half-side or circle radius = 1). A nondimensional eigenvalue
   λ = ω² ρh s⁴ / D, where s is the half-side or radius. */

export const MATERIALS = {
  steel:    { label: 'Steel',          E: 200e9, rho: 7850, nu: 0.29, color: '#a7adb5' },
  aluminum: { label: 'Aluminium',      E: 69e9,  rho: 2700, nu: 0.33, color: '#cfd5dc' },
  brass:    { label: 'Brass',          E: 105e9, rho: 8500, nu: 0.34, color: '#c9a24a' },
  glass:    { label: 'Glass (soda-lime)', E: 70e9, rho: 2500, nu: 0.22, color: '#9fc9c4' },
  acrylic:  { label: 'Acrylic',        E: 3.2e9, rho: 1180, nu: 0.37, color: '#d9e8f2' }
};

export const G = 9.80665;

/* ── Numerics ─────────────────────────────────────────────────── */

export function gaussLegendre(n) {
  const x = new Float64Array(n), w = new Float64Array(n);
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), dp = 0;
    for (let it = 0; it < 100; it++) {
      let p0 = 1, p1 = z;
      for (let k = 2; k <= n; k++) { const p2 = ((2 * k - 1) * z * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p2; }
      dp = n * (z * p1 - p0) / (z * z - 1);
      const dz = p1 / dp;
      z -= dz;
      if (Math.abs(dz) < 1e-15) break;
    }
    x[i] = -z; x[n - 1 - i] = z;
    w[i] = w[n - 1 - i] = 2 / ((1 - z * z) * dp * dp);
  }
  return { x, w };
}

/* Orthonormal Legendre L_k = √((2k+1)/2)·P_k and its first two derivatives at x,
   for k = 0..P. Uses P'_{k+1} = P'_{k-1} + (2k+1)P_k, which stays finite at ±1. */
export function legendre(P, x, out) {
  const p = out ? out.p : new Float64Array(P + 1), d1 = out ? out.d1 : new Float64Array(P + 1), d2 = out ? out.d2 : new Float64Array(P + 1);
  p.fill(0); d1.fill(0); d2.fill(0);
  p[0] = 1;
  if (P >= 1) { p[1] = x; d1[1] = 1; }
  for (let k = 1; k < P; k++) {
    p[k + 1] = ((2 * k + 1) * x * p[k] - k * p[k - 1]) / (k + 1);
    d1[k + 1] = d1[k - 1] + (2 * k + 1) * p[k];
    d2[k + 1] = d2[k - 1] + (2 * k + 1) * d1[k];
  }
  for (let k = 0; k <= P; k++) { const s = Math.sqrt((2 * k + 1) / 2); p[k] *= s; d1[k] *= s; d2[k] *= s; }
  return { p, d1, d2 };
}

/* Symmetric eigenproblem (array of Float64Array rows; destroyed). Householder
   reduction to tridiagonal form, then implicit QL with Wilkinson shifts
   (tred2/tqli). Returns eigenvalues ascending, eigenvectors as arrays. */
export function symmetricEigen(A) {
  const n = A.length, z = A, d = new Float64Array(n), e = new Float64Array(n);
  for (let i = n - 1; i > 0; i--) {
    const l = i - 1;
    let h = 0, scale = 0;
    if (l > 0) {
      for (let k = 0; k <= l; k++) scale += Math.abs(z[i][k]);
      if (scale === 0) e[i] = z[i][l];
      else {
        for (let k = 0; k <= l; k++) { z[i][k] /= scale; h += z[i][k] * z[i][k]; }
        let f = z[i][l];
        const g = f >= 0 ? -Math.sqrt(h) : Math.sqrt(h);
        e[i] = scale * g; h -= f * g; z[i][l] = f - g; f = 0;
        for (let j = 0; j <= l; j++) {
          z[j][i] = z[i][j] / h;
          let gg = 0;
          for (let k = 0; k <= j; k++) gg += z[j][k] * z[i][k];
          for (let k = j + 1; k <= l; k++) gg += z[k][j] * z[i][k];
          e[j] = gg / h; f += e[j] * z[i][j];
        }
        const hh = f / (h + h);
        for (let j = 0; j <= l; j++) {
          const ff = z[i][j], gg = e[j] - hh * ff;
          e[j] = gg;
          for (let k = 0; k <= j; k++) z[j][k] -= ff * e[k] + gg * z[i][k];
        }
      }
    } else e[i] = z[i][l];
    d[i] = h;
  }
  d[0] = 0; e[0] = 0;
  for (let i = 0; i < n; i++) {
    const l = i - 1;
    if (d[i]) {
      for (let j = 0; j <= l; j++) {
        let g = 0;
        for (let k = 0; k <= l; k++) g += z[i][k] * z[k][j];
        for (let k = 0; k <= l; k++) z[k][j] -= g * z[k][i];
      }
    }
    d[i] = z[i][i]; z[i][i] = 1;
    for (let j = 0; j <= l; j++) z[j][i] = z[i][j] = 0;
  }
  for (let i = 1; i < n; i++) e[i - 1] = e[i];
  e[n - 1] = 0;
  for (let l = 0; l < n; l++) {
    let iter = 0, m;
    do {
      for (m = l; m < n - 1; m++) { const dd = Math.abs(d[m]) + Math.abs(d[m + 1]); if (Math.abs(e[m]) <= 1e-15 * dd) break; }
      if (m !== l) {
        if (iter++ === 60) break;
        let g = (d[l + 1] - d[l]) / (2 * e[l]);
        let r = Math.hypot(g, 1);
        g = d[m] - d[l] + e[l] / (g + (g >= 0 ? Math.abs(r) : -Math.abs(r)));
        let s = 1, c = 1, p = 0, i;
        for (i = m - 1; i >= l; i--) {
          let f = s * e[i];
          const b = c * e[i];
          e[i + 1] = r = Math.hypot(f, g);
          if (r === 0) { d[i + 1] -= p; e[m] = 0; break; }
          s = f / r; c = g / r; g = d[i + 1] - p; r = (d[i] - g) * s + 2 * c * b; p = s * r; d[i + 1] = g + p; g = c * r - b;
          for (let k = 0; k < n; k++) { f = z[k][i + 1]; z[k][i + 1] = s * z[k][i] + c * f; z[k][i] = c * z[k][i] - s * f; }
        }
        if (r === 0 && i >= l) continue;
        d[l] -= p; e[l] = g; e[m] = 0;
      }
    } while (m !== l);
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => d[a] - d[b]);
  return { values: order.map(i => d[i]), vectors: order.map(i => Float64Array.from(z, row => row[i])) };
}

/* K x = λ M x with M symmetric positive (semi)definite. Directions where M is
   numerically null are dropped, which keeps an over-complete basis well posed. */
export function generalizedEigen(K, M) {
  const n = K.length;
  const me = symmetricEigen(M.map(r => Float64Array.from(r)));
  const maxM = Math.max(...me.values);
  const keep = [];
  me.values.forEach((v, i) => { if (v > 1e-11 * maxM) keep.push(i); });
  const m = keep.length;
  const T = keep.map(i => { const v = me.vectors[i], s = 1 / Math.sqrt(me.values[i]); return v.map(x => x * s); });
  const KT = T.map(t => { const r = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += K[i][j] * t[j]; r[i] = s; } return r; });
  const C = Array.from({ length: m }, (_, a) => { const r = new Float64Array(m); for (let b = 0; b < m; b++) { let s = 0; for (let i = 0; i < n; i++) s += T[a][i] * KT[b][i]; r[b] = s; } return r; });
  for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) { const s = (C[a][b] + C[b][a]) / 2; C[a][b] = C[b][a] = s; }
  const ce = symmetricEigen(C);
  return {
    values: ce.values,
    vectors: ce.vectors.map(y => { const x = new Float64Array(n); for (let a = 0; a < m; a++) for (let i = 0; i < n; i++) x[i] += T[a][i] * y[a]; return x; })
  };
}

/* ── Bessel functions (used by the exact free-plate check) ────── */

export function besselJ(n, x) {
  if (x === 0) return n === 0 ? 1 : 0;
  const ax = Math.abs(x), tox = 2 / ax;
  let m = 2 * Math.floor((Math.max(n, Math.ceil(ax)) + 30) / 2);
  let bjp = 0, bj = 1, ans = 0, sum = 0, jsum = false;
  for (let j = m; j > 0; j--) {
    const bjm = j * tox * bj - bjp;
    bjp = bj; bj = bjm;
    if (Math.abs(bj) > 1e10) { bj *= 1e-10; bjp *= 1e-10; ans *= 1e-10; sum *= 1e-10; }
    if (jsum) sum += bj;
    jsum = !jsum;
    if (j === n) ans = bjp;
  }
  if (n === 0) ans = bj;
  sum = 2 * sum - bj;
  const r = ans / sum;
  return x < 0 && n % 2 ? -r : r;
}

export function besselI(n, x) {
  n = Math.abs(n);
  let term = Math.pow(x / 2, n);
  for (let k = 1; k <= n; k++) term /= k;
  let sum = term;
  for (let m = 1; m < 400; m++) {
    term *= (x * x / 4) / (m * (m + n));
    sum += term;
    if (term < 1e-17 * sum) break;
  }
  return sum;
}

/* Exact nondimensional frequencies k (λ = k⁴, radius 1) of a completely free
   circular plate with n nodal diameters: roots of the 2×2 free-edge determinant
   for w = [A J_n(kr) + B I_n(kr)] cos nθ. */
export function freeCircleExact(n, nu, count) {
  const J = k => besselJ(n, k);
  const Jd = k => ((n === 0 ? -besselJ(1, k) : besselJ(n - 1, k)) - besselJ(n + 1, k)) / 2;
  const I = k => besselI(n, k), Id = k => (besselI(n - 1, k) + besselI(n + 1, k)) / 2;
  const det = k => {
    const j = J(k), jd = Jd(k), i = I(k), id = Id(k), q = (1 - nu) * n * n;
    const MJ = -(1 - nu) * k * jd - (k * k - q) * j;
    const MI = -(1 - nu) * k * id + (k * k + q) * i;
    const VJ = -k * k * k * jd - q * (k * jd - j);
    const VI = k * k * k * id - q * (k * id - i);
    return (MJ * VI - MI * VJ) / i;
  };
  const roots = [];
  let prev = det(0.5), kPrev = 0.5;
  for (let k = 0.52; roots.length < count && k < 80; k += 0.02) {
    const v = det(k);
    if (Math.sign(v) !== Math.sign(prev)) {
      let lo = kPrev, hi = k, flo = prev;
      for (let it = 0; it < 80; it++) {
        const mid = (lo + hi) / 2, fm = det(mid);
        if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid;
      }
      roots.push((lo + hi) / 2);
    }
    prev = v; kPrev = k;
  }
  return roots;
}

/* ── Circular plate: exact angular separation, 1-D Ritz in r ──── */

/* Radial modes for n nodal diameters. bolt = b/a (0 with clamp=false gives the
   completely free plate). Returns [{ eig, coeffs }] with ∫R² r dr = 1. */
export function circleRadialModes(n, { nu, bolt = 0, clamp = true, degree = 30, quad = 96 } = {}) {
  const P = degree;
  const free = !clamp;
  const r0 = free ? 0 : bolt;
  const gl = gaussLegendre(quad);
  const span = 1 - r0;
  const N = P + 1;
  const K = Array.from({ length: N }, () => new Float64Array(N));
  const M = Array.from({ length: N }, () => new Float64Array(N));
  const R = new Float64Array(N), R1 = new Float64Array(N), R2 = new Float64Array(N);
  for (let q = 0; q < quad; q++) {
    const s = gl.x[q], r = r0 + span * (s + 1) / 2, wq = gl.w[q] * span / 2 * r;
    radialBasis(n, P, r, r0, free, R, R1, R2);
    const Lp = new Float64Array(N), Q = new Float64Array(N), T = new Float64Array(N);
    for (let a = 0; a < N; a++) {
      Q[a] = R1[a] / r - n * n * R[a] / (r * r);
      Lp[a] = R2[a] + Q[a];
      T[a] = R1[a] / r - R[a] / (r * r);
    }
    for (let a = 0; a < N; a++) {
      for (let b = a; b < N; b++) {
        const k = Lp[a] * Lp[b] - (1 - nu) * (R2[a] * Q[b] + Q[a] * R2[b]) + 2 * (1 - nu) * n * n * T[a] * T[b];
        K[a][b] += wq * k; M[a][b] += wq * R[a] * R[b];
      }
    }
  }
  for (let a = 0; a < N; a++) for (let b = 0; b < a; b++) { K[a][b] = K[b][a]; M[a][b] = M[b][a]; }
  const eg = generalizedEigen(K, M);
  const out = [];
  // rigid-body motions of a free plate come out at ~0 (round-off); elastic modes start near 28
  eg.values.forEach((eig, i) => { if (eig > 1e-2) out.push({ eig, coeffs: eg.vectors[i] }); });
  return out;
}

const scratchL = new Map();
function scratch(P) {
  let b = scratchL.get(P);
  if (!b) { b = { p: new Float64Array(P + 1), d1: new Float64Array(P + 1), d2: new Float64Array(P + 1) }; scratchL.set(P, b); }
  return b;
}

function radialBasis(n, P, r, r0, free, R, R1, R2) {
  if (free) {
    const t = 2 * r * r - 1, L = legendre(P, t, scratch(P));
    const rn = Math.pow(r, n), rn1 = n >= 1 ? Math.pow(r, n - 1) : 0, rn2 = n >= 2 ? Math.pow(r, n - 2) : 0;
    for (let k = 0; k <= P; k++) {
      R[k] = rn * L.p[k];
      R1[k] = n * rn1 * L.p[k] + 4 * rn * r * L.d1[k];
      R2[k] = n * (n - 1) * rn2 * L.p[k] + (8 * n + 4) * rn * L.d1[k] + 16 * rn * r * r * L.d2[k];
    }
    return;
  }
  const span = 1 - r0, u = (r - r0) / span, s = 2 * u - 1, L = legendre(P, s, scratch(P));
  for (let k = 0; k <= P; k++) {
    R[k] = u * u * L.p[k];
    R1[k] = (2 * u * L.p[k] + 2 * u * u * L.d1[k]) / span;
    R2[k] = (2 * L.p[k] + 8 * u * L.d1[k] + 4 * u * u * L.d2[k]) / (span * span);
  }
}

/* R(r) for the clamped annulus, continued smoothly past r = 1 (display only). */
function evalRadialExtended(n, coeffs, r, bolt) {
  if (r < bolt) return 0;
  const P = coeffs.length - 1;
  let buf = evalBuf.get(P);
  if (!buf) { buf = [new Float64Array(P + 1), new Float64Array(P + 1), new Float64Array(P + 1)]; evalBuf.set(P, buf); }
  const [R, R1, R2] = buf;
  radialBasis(n, P, r, bolt, false, R, R1, R2);
  let v = 0;
  for (let k = 0; k <= P; k++) v += coeffs[k] * R[k];
  return v;
}

const evalBuf = new Map();
export function evalRadial(n, coeffs, r, { bolt = 0, clamp = true } = {}) {
  const P = coeffs.length - 1;
  const free = !clamp, r0 = free ? 0 : bolt;
  if (r > 1 || r < r0) return 0;
  let buf = evalBuf.get(P);
  if (!buf) { buf = [new Float64Array(P + 1), new Float64Array(P + 1), new Float64Array(P + 1)]; evalBuf.set(P, buf); }
  const [R, R1, R2] = buf;
  radialBasis(n, P, Math.max(r, 1e-9), r0, free, R, R1, R2);
  let v = 0;
  for (let k = 0; k <= P; k++) v += coeffs[k] * R[k];
  return v;
}

/* ── Free square plate: 2-D Ritz, Legendre products ───────────── */

/* Completely free square plate (no bolt), orthonormal Legendre products split by
   parity. Every stiffness entry is a product of exact 1-D integrals. This is the
   reference used to check the energy functional against Leissa's published values;
   the bolted plate below uses the polar solver, which clamps the bolt exactly. */
export function freeSquareModes({ nu, degree = 24 } = {}) {
  const P = degree;
  const gl = gaussLegendre(P + 3);
  // 1-D integrals: A2 = ∫L_i'' L_k'', B = ∫L_i'' L_k, C1 = ∫L_i' L_k'
  const A2 = [], B = [], C1 = [];
  for (let i = 0; i <= P; i++) { A2.push(new Float64Array(P + 1)); B.push(new Float64Array(P + 1)); C1.push(new Float64Array(P + 1)); }
  for (let q = 0; q < gl.x.length; q++) {
    const L = legendre(P, gl.x[q]), w = gl.w[q];
    for (let i = 0; i <= P; i++) for (let k = 0; k <= P; k++) {
      A2[i][k] += w * L.d2[i] * L.d2[k];
      B[i][k] += w * L.d2[i] * L.p[k];
      C1[i][k] += w * L.d1[i] * L.d1[k];
    }
  }
  const modes = [];
  for (const [px, py] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
    const idx = [];
    for (let i = px; i <= P; i += 2) for (let j = py; i + j <= P; j += 2) idx.push([i, j]);
    const n = idx.length;
    const K = Array.from({ length: n }, () => new Float64Array(n));
    for (let a = 0; a < n; a++) {
      const [i, j] = idx[a];
      for (let b = a; b < n; b++) {
        const [k, l] = idx[b];
        K[a][b] = K[b][a] = (j === l ? A2[i][k] : 0) + (i === k ? A2[j][l] : 0)
          + nu * (B[i][k] * B[l][j] + B[k][i] * B[j][l])
          + 2 * (1 - nu) * C1[i][k] * C1[j][l];
      }
    }
    // the basis is orthonormal on the square, so M = I
    symmetricEigen(K).values.forEach(eig => { if (eig > 1e-2) modes.push({ eig, parity: [px, py] }); });
  }
  return modes.sort((a, b) => a.eig - b.eig);
}

/* ── Bolted plate of any star-shaped outline: polar Ritz ────────
   Basis U_k(r)·cos nθ or sin nθ on b ≤ r ≤ ρ(θ), with U_k = u²·L_k(2u − 1),
   u = (r − b)/(rmax − b), so w = ∂w/∂r = 0 on the bolt circle exactly.
   sectors: [[θ0, θ1, copies]] integration wedges; copies counts how many
   symmetric images of the wedge make up the whole plate. */
export function polarRitz({ nu, bolt, rho, rmax, harmonics, degree, sectors, nr, nt }) {
  const basis = [];
  for (const h of harmonics) for (let k = 0; k <= degree; k++) basis.push({ n: h.n, trig: h.trig, k });
  const nb = basis.length;
  nr = nr || degree + 14; nt = nt || 2 * harmonics.length + 14;
  const glr = gaussLegendre(nr), glt = gaussLegendre(nt);
  const pr = [], pt = [], pw = [];
  for (const [t0, t1, copies] of sectors) {
    for (let a = 0; a < nt; a++) {
      const th = t0 + (t1 - t0) * (glt.x[a] + 1) / 2, wt = glt.w[a] * (t1 - t0) / 2;
      const R = rho(th);
      for (let q = 0; q < nr; q++) {
        const r = bolt + (R - bolt) * (glr.x[q] + 1) / 2;
        pr.push(r); pt.push(th); pw.push(wt * glr.w[q] * (R - bolt) / 2 * r * copies);
      }
    }
  }
  const np = pr.length;
  const Bxx = new Float64Array(nb), Byy = new Float64Array(nb), Bxy = new Float64Array(nb), B0 = new Float64Array(nb);
  const K = Array.from({ length: nb }, () => new Float64Array(nb));
  const M = Array.from({ length: nb }, () => new Float64Array(nb));
  const mean = new Float64Array(nb);
  const span = rmax - bolt;
  const L = { p: new Float64Array(degree + 1), d1: new Float64Array(degree + 1), d2: new Float64Array(degree + 1) };
  const U = new Float64Array(degree + 1), U1 = new Float64Array(degree + 1), U2 = new Float64Array(degree + 1);
  for (let i = 0; i < np; i++) {
    const r = pr[i], th = pt[i], w = pw[i];
    radialU(r, bolt, span, degree, L, U, U1, U2);
    const c = Math.cos(th), sn = Math.sin(th), cc = c * c, ss = sn * sn, sc = sn * c;
    for (let b = 0; b < nb; b++) {
      const { n, trig, k } = basis[b];
      const cn = Math.cos(n * th), sn_ = Math.sin(n * th);
      const T = trig === 'c' ? cn : sn_, Tp = trig === 'c' ? -n * sn_ : n * cn;
      const wv = U[k] * T, wrr = U2[k] * T, A = U1[k] * T / r - n * n * wv / (r * r), Bm = (U1[k] * Tp - U[k] * Tp / r) / r;
      Bxx[b] = cc * wrr + ss * A - 2 * sc * Bm;
      Byy[b] = ss * wrr + cc * A + 2 * sc * Bm;
      Bxy[b] = sc * (wrr - A) + (cc - ss) * Bm;
      B0[b] = wv;
      mean[b] += w * wv;
    }
    const k1 = w, k2 = w * nu, k3 = w * 2 * (1 - nu);
    for (let a = 0; a < nb; a++) {
      const xa = Bxx[a], ya = Byy[a], za = Bxy[a], ma = B0[a] * w;
      const Ka = K[a], Ma = M[a];
      const ax = k1 * xa + k2 * ya, ay = k1 * ya + k2 * xa, az = k3 * za;
      for (let b = a; b < nb; b++) {
        Ka[b] += ax * Bxx[b] + ay * Byy[b] + az * Bxy[b];
        Ma[b] += ma * B0[b];
      }
    }
  }
  for (let a = 0; a < nb; a++) for (let b = 0; b < a; b++) { K[a][b] = K[b][a]; M[a][b] = M[b][a]; }
  const eg = generalizedEigen(K, M);
  return eg.values.map((eig, m) => {
    const coeffs = eg.vectors[m];
    let mn = 0;
    for (let b = 0; b < nb; b++) mn += coeffs[b] * mean[b];
    return { eig, coeffs, basis, mean: mn, bolt, span, degree };
  });
}

function radialU(r, bolt, span, P, L, U, U1, U2) {
  const u = (r - bolt) / span;
  legendre(P, 2 * u - 1, L);
  for (let k = 0; k <= P; k++) {
    U[k] = u * u * L.p[k];
    U1[k] = (2 * u * L.p[k] + 2 * u * u * L.d1[k]) / span;
    U2[k] = (2 * L.p[k] + 8 * u * L.d1[k] + 4 * u * u * L.d2[k]) / (span * span);
  }
}

/* Mode value at polar point (r, θ), nondimensional. */
export function evalPolarMode(mode, r, th) {
  if (r < mode.bolt) return 0;
  const P = mode.degree;
  const L = scratch(P), U = new Float64Array(P + 1), U1 = new Float64Array(P + 1), U2 = new Float64Array(P + 1);
  radialU(r, mode.bolt, mode.span, P, L, U, U1, U2);
  let v = 0;
  mode.basis.forEach(({ n, trig, k }, b) => { v += mode.coeffs[b] * U[k] * (trig === 'c' ? Math.cos(n * th) : Math.sin(n * th)); });
  return v;
}

export const SQUARE_TRUST = { A1: 12, B1: 12, A2: 12, B2: 12, E: 26 };

const squareRho = th => 1 / Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th)));

/* The bolted square plate, split by the square's symmetry classes so each block
   is small. A₁/A₂/B₁/B₂ are symmetric or antisymmetric about the diagonals too,
   so they integrate over one eighth; the E pair (odd in x, even in y, and its
   90° turn) integrates over a quarter. Only A₁ modes move the plate's centre of
   mass, so only A₁ can be driven through a centred bolt. */
export function squareBoltedModes({ nu, bolt, harmonics = 12, degree = 16 } = {}) {
  const H = harmonics, eighth = [[0, Math.PI / 4, 8]], quarter = [[0, Math.PI / 4, 4], [Math.PI / 4, Math.PI / 2, 4]];
  const series = (start, step, trig) => Array.from({ length: H / 2 }, (_, m) => ({ n: start + step * m, trig }));
  const classes = [
    { sym: 'A1', harmonics: series(0, 4, 'c'), sectors: eighth },
    { sym: 'B1', harmonics: series(2, 4, 'c'), sectors: eighth },
    { sym: 'A2', harmonics: series(4, 4, 's'), sectors: eighth },
    { sym: 'B2', harmonics: series(2, 4, 's'), sectors: eighth },
    { sym: 'E', harmonics: Array.from({ length: H }, (_, m) => ({ n: 2 * m + 1, trig: 'c' })), sectors: quarter }
  ];
  const out = [];
  for (const c of classes) {
    const modes = polarRitz({ nu, bolt, rho: squareRho, rmax: Math.SQRT2, harmonics: c.harmonics, degree, sectors: c.sectors });
    modes.forEach((m, i) => { if (m.eig > 1e-2) out.push({ ...m, sym: c.sym, classIndex: i }); });
  }
  return out.sort((a, b) => a.eig - b.eig);
}

/* ── The physical plate ───────────────────────────────────────── */

/* Build a plate in SI units.
   opts: { shape: 'square'|'circle', material, size (m: side or diameter),
           thickness (m), boltDiameter (m), grid (display samples per side) }
   Mode fields are mass-normalised: ∫ρh φ² dA = 1 (φ in m/√kg). */
export function buildPlate(opts) {
  const mat = MATERIALS[opts.material] || MATERIALS.steel;
  const shape = opts.shape === 'circle' ? 'circle' : 'square';
  const h = opts.thickness, s = opts.size / 2;
  const D = mat.E * h * h * h / (12 * (1 - mat.nu * mat.nu));
  const rhoH = mat.rho * h;
  const bolt = Math.min(0.3, (opts.boltDiameter || 0.012) / 2 / s);
  const omegaScale = Math.sqrt(D / (rhoH * s ** 4)); // ω = omegaScale·√λ
  const N = opts.grid || 121;
  const geomKey = shape + ':' + mat.nu + ':' + bolt.toFixed(5) + ':' + N;
  let geom = geometryCache.get(geomKey);
  if (!geom) { geom = buildGeometry(shape, mat.nu, bolt, N); geometryCache.set(geomKey, geom); }
  const norm = 1 / (s * Math.sqrt(rhoH));
  const modes = geom.modes.map((m, i) => {
    const omega = omegaScale * Math.sqrt(m.eig);
    return {
      index: i, eig: m.eig, omega, f: omega / (2 * Math.PI), label: m.label, sym: m.sym,
      n: m.n, s: m.s, ang: m.ang, nodalDiameters: m.n,
      grid: m.grid, scale: norm, // physical φ at grid point k = grid[k]·scale
      participation: m.meanNd * s * Math.sqrt(rhoH), // ρh∫φ dA, couples the mode to a moving bolt
      sampleNd: m.sample // nondimensional (x, y) → nondimensional φ
    };
  });
  return {
    shape, material: mat, materialKey: opts.material, h, s, size: opts.size, D, rhoH, bolt, N, modes,
    coords: geom.coords,
    area: shape === 'circle' ? Math.PI * s * s * (1 - bolt * bolt) : 4 * s * s - Math.PI * (bolt * s) ** 2,
    mass: rhoH * (shape === 'circle' ? Math.PI * s * s : 4 * s * s),
    trustedF: omegaScale * Math.sqrt(geom.trustedEig) / (2 * Math.PI),
    /* bending waves are dispersive: speed grows as √f */
    bendingWavelength(f) { const w = 2 * Math.PI * f; return 2 * Math.PI * Math.pow(D / (rhoH * w * w), 0.25); },
    bendingSpeed(f) { const w = 2 * Math.PI * f; return Math.sqrt(w) * Math.pow(D / rhoH, 0.25); },
    inside(xn, yn) {
      const r2 = xn * xn + yn * yn;
      if (r2 < bolt * bolt) return false;
      return shape === 'circle' ? r2 <= 1 : Math.abs(xn) <= 1 && Math.abs(yn) <= 1;
    }
  };
}

const geometryCache = new Map();

function buildGeometry(shape, nu, bolt, N) {
  const coords = new Float64Array(N);
  for (let i = 0; i < N; i++) coords[i] = -1 + 2 * i / (N - 1);
  const rr = new Float64Array(N * N), th = new Float64Array(N * N);
  for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
    const k = gy * N + gx; rr[k] = Math.hypot(coords[gx], coords[gy]); th[k] = Math.atan2(coords[gy], coords[gx]);
  }
  const raw = [];
  let trustedEig;
  if (shape === 'circle') {
    const NMAX = 18, DEG = 30, TRUST_S = 9, LUT = 600, LUT_EXT = 660;
    trustedEig = Infinity;
    for (let n = 0; n <= NMAX + 1; n++) {
      const rad = circleRadialModes(n, { nu, bolt, clamp: true, degree: DEG });
      if (n === NMAX + 1) { trustedEig = Math.min(trustedEig, rad[0].eig); break; }
      trustedEig = Math.min(trustedEig, rad[TRUST_S].eig);
      rad.slice(0, TRUST_S + 2).forEach((m, si) => {
        // the table runs a little past the rim (the polynomial continues smoothly) so
        // display interpolation at the edge never blends in zeros from outside
        const table = new Float64Array(LUT_EXT + 1);
        for (let i = 0; i <= LUT_EXT; i++) table[i] = evalRadialExtended(n, m.coeffs, i / LUT, bolt);
        let meanNd = 0;
        if (n === 0) {
          const gl = gaussLegendre(64);
          for (let q = 0; q < 64; q++) { const r = bolt + (1 - bolt) * (gl.x[q] + 1) / 2; meanNd += gl.w[q] * (1 - bolt) / 2 * evalRadial(0, m.coeffs, r, { bolt }) * r; }
          meanNd *= 2 * Math.PI / Math.sqrt(2 * Math.PI);
        }
        for (const ang of n === 0 ? ['c'] : ['c', 's']) {
          raw.push({ eig: m.eig, n, s: si, ang, table, meanNd, sym: n === 0 ? 'axisymmetric' : n + ' nodal diameter' + (n > 1 ? 's' : ''), label: n + ' diameter' + (n === 1 ? '' : 's') + ', ' + si + ' circle' + (si === 1 ? '' : 's') });
        }
      });
    }
    raw.sort((a, b) => a.eig - b.eig);
    const kept = raw.filter(m => m.eig <= trustedEig * 1.25).slice(0, 220);
    raw.length = 0; raw.push(...kept);
    const radial = new Map();
    for (const m of raw) {
      const inv = 1 / Math.sqrt(m.n === 0 ? 2 * Math.PI : Math.PI);
      const radAt = r => {
        const f = Math.min(r, LUT_EXT / LUT) * LUT, i = Math.min(LUT_EXT - 1, Math.floor(f)), t = f - i;
        return m.table[i] * (1 - t) + m.table[i + 1] * t;
      };
      m.sample = (x, y) => Math.hypot(x, y) > 1 ? 0 : radAt(Math.hypot(x, y)) * (m.ang === 'c' ? Math.cos(m.n * Math.atan2(y, x)) : Math.sin(m.n * Math.atan2(y, x))) * inv;
      let rv = radial.get(m.table);
      if (!rv) { rv = new Float32Array(N * N); for (let k = 0; k < rv.length; k++) rv[k] = radAt(rr[k]); radial.set(m.table, rv); }
      const grid = new Float32Array(N * N);
      for (let k = 0; k < grid.length; k++) grid[k] = rv[k] * (m.ang === 'c' ? Math.cos(m.n * th[k]) : Math.sin(m.n * th[k])) * inv;
      m.grid = grid;
    }
  } else {
    const all = squareBoltedModes({ nu, bolt });
    // frequencies converged to 0.05% through these per-class indices (see tests)
    trustedEig = Math.min(...Object.entries(SQUARE_TRUST).map(([sym, idx]) => all.filter(m => m.sym === sym)[idx].eig));
    const symName = { A1: 'fully symmetric', A2: 'antisymmetric about every mirror line', B1: 'antisymmetric about the diagonals', B2: 'antisymmetric about the centre lines', E: 'one-sided (a turned pair)' };
    for (const m of all.filter(m => m.eig <= trustedEig * 1.25)) {
      const pair = m.sym === 'E' ? [false, true] : [false];
      for (const swap of pair) {
        const sample = (x, y) => {
          if (Math.abs(x) > 1 || Math.abs(y) > 1) return 0;
          return swap ? evalPolarMode(m, Math.hypot(x, y), Math.atan2(x, y)) : evalPolarMode(m, Math.hypot(x, y), Math.atan2(y, x));
        };
        raw.push({ eig: m.eig, sym: m.sym, ang: swap ? 's' : 'c', meanNd: m.sym === 'A1' ? m.mean : 0, label: symName[m.sym], mode: m, swap, sample });
      }
    }
    raw.sort((a, b) => a.eig - b.eig);
    fillSquareGrids(raw, N, coords, bolt);
  }
  return { modes: raw, trustedEig, coords };
}

/* Each square mode is evaluated on a polar table (separable, cheap) and then
   resampled onto the display grid; E partners reuse their twin's table with x↔y. */
function fillSquareGrids(raw, N, coords, bolt) {
  const NR = 160, NT = 720, span = Math.SQRT2 - bolt;
  const rs = Float64Array.from({ length: NR }, (_, i) => bolt + span * i / (NR - 1));
  const tables = new Map();
  for (const m of raw) {
    const mode = m.mode;
    let tab = tables.get(mode);
    if (!tab) {
      const P = mode.degree, L = scratch(P), U = new Float64Array(P + 1), U1 = new Float64Array(P + 1), U2 = new Float64Array(P + 1);
      const harm = [...new Set(mode.basis.map(b => b.n + b.trig))];
      const radialSum = harm.map(() => new Float64Array(NR));
      for (let i = 0; i < NR; i++) {
        radialU(rs[i], bolt, span, P, L, U, U1, U2);
        mode.basis.forEach((b, j) => { radialSum[harm.indexOf(b.n + b.trig)][i] += mode.coeffs[j] * U[b.k]; });
      }
      tab = new Float32Array(NR * NT);
      harm.forEach((key, h) => {
        const n = parseInt(key, 10), trig = key.slice(-1);
        for (let t = 0; t < NT; t++) {
          const a = 2 * Math.PI * t / NT, T = trig === 'c' ? Math.cos(n * a) : Math.sin(n * a);
          for (let i = 0; i < NR; i++) tab[t * NR + i] += radialSum[h][i] * T;
        }
      });
      tables.set(mode, tab);
    }
    const grid = new Float32Array(N * N);
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const x = coords[gx], y = coords[gy], r = Math.hypot(x, y);
      if (r < bolt) continue;
      let a = m.swap ? Math.atan2(x, y) : Math.atan2(y, x);
      if (a < 0) a += 2 * Math.PI;
      const ft = a / (2 * Math.PI) * NT, t0 = Math.floor(ft) % NT, t1 = (t0 + 1) % NT, wt = ft - Math.floor(ft);
      const fr = (r - bolt) / span * (NR - 1), i0 = Math.min(NR - 2, Math.floor(fr)), wr = fr - i0;
      grid[gy * N + gx] = (tab[t0 * NR + i0] * (1 - wr) + tab[t0 * NR + i0 + 1] * wr) * (1 - wt)
        + (tab[t1 * NR + i0] * (1 - wr) + tab[t1 * NR + i0 + 1] * wr) * wt;
    }
    m.grid = grid;
  }
}

/* ── Driving the plate ────────────────────────────────────────── */

/* Generalised modal force for each mode at angular frequency ω.
   drive = { type: 'driver', amplitude: Z (m) }  the bolt shakes up and down by Z
         | { type: 'bow', amplitude: F (N), x, y } point force at nondimensional x,y
   For the driver we solve for motion relative to the bolt, so the inertial load
   ρh·ω²Z acts on every mode in proportion to ρh∫φ dA. */
export function modalForces(plate, omega, drive) {
  return plate.modes.map(m => {
    if (drive.type === 'bow') return drive.amplitude * m.sampleNd(drive.x, drive.y) * m.scale;
    return omega * omega * drive.amplitude * m.participation;
  });
}

/* Steady-state complex modal amplitude: q = F / (ω_i² − ω² + 2iζω_iω). */
export function steadyAmplitude(Fi, wi, w, zeta) {
  const re = wi * wi - w * w, im = 2 * zeta * wi * w, d = re * re + im * im;
  return [Fi * re / d, -Fi * im / d];
}

/* Advance a mode's complex amplitude (envelope at drive ω) by dt toward steady
   state. Ring-up and ring-down take about 1/(ζω_i) seconds, as on a real plate:
   A' = (F − H⁻¹A) / (2iω + 2ζω_i), solved exactly for F constant over the step. */
export function relaxAmplitude(A, Fi, wi, w, zeta, dt) {
  const [sre, sim] = steadyAmplitude(Fi, wi, w, zeta);
  const hre = wi * wi - w * w, him = 2 * zeta * wi * w;  // H⁻¹
  const dre = 2 * zeta * wi, dim = 2 * w;                // 2iω + 2ζω_i
  const dd = dre * dre + dim * dim;
  const kre = (hre * dre + him * dim) / dd, kim = (him * dre - hre * dim) / dd;
  const decay = Math.exp(-kre * dt), c = Math.cos(kim * dt) * decay, s = -Math.sin(kim * dt) * decay;
  const ere = A[0] - sre, eim = A[1] - sim;
  return [sre + ere * c - eim * s, sim + ere * s + eim * c];
}

/* RMS flexing displacement (relative to the bolt) for complex modal amplitudes:
   with mass-normalised modes ∫ρh|w|² dA = Σ|q|². */
export function rmsDisplacement(plate, q) {
  let s = 0;
  for (const [re, im] of q) s += re * re + im * im;
  return Math.sqrt(s / (plate.rhoH * plate.area));
}
