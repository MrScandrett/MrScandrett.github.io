// Millimeters; the same 64-sided, aligned polygons are used in every ring.
export const PRESETS = {
  quiet: { n: 3, r: 26, gap: 0.6, h: 4, w: 3 },
  pocket: { n: 4, r: 22, gap: 0.6, h: 3, w: 2.4 },
  test: { n: 2, r: 14, gap: 0.6, h: 2, w: 3 }
};
export function rings(p) {
  return Array.from({ length: p.n }, (_, k) => ({
    i: k + 1, R: p.r - k * (p.w + p.gap),
    r: p.r - k * (p.w + p.gap) - p.w, z: 0, h: p.h
  }));
}
export function checks(p) {
  const finite = ['n', 'r', 'gap', 'h', 'w'].every(k => Number.isFinite(p[k]));
  const inner = p.r - (p.n - 1) * (p.w + p.gap) - p.w;
  return [
    { ok: finite && Number.isInteger(p.n) && p.n >= 2 && p.n <= 6, text: '2–6 rings; no skipped or silently clamped shapes.' },
    { ok: finite && inner >= 4, text: 'Smallest hole radius ≥ 4 mm (no solid discs or collapsed holes).' },
    { ok: finite && p.w >= 2 && p.w <= 5, text: 'Walls 2–5 mm; at least five nominal 0.4 mm extrusion widths.' },
    { ok: finite && p.gap * Math.cos(Math.PI / 64) >= 0.39 && p.gap <= 1.2, text: 'Radial gap 0.4–1.2 mm; polygon-edge clearance ≥ 0.39 mm.' },
    { ok: finite && p.h >= 2 && p.h <= 8, text: 'Height 2–8 mm; every piece rests on z = 0 with no overhang.' },
    { ok: finite && p.r > 0 && 2 * p.r <= 80, text: 'Footprint ≤ 80 × 80 mm; verify it fits your printer.' }
  ];
}
export function recipe(p) {
  const f = n => Number(n.toFixed(3)).toString();
  return [
    'TINKERCAD CODEBLOCKS — MANUAL TRANSCRIPTION CHECKLIST (mm)',
    'Not executable text or a Codeblocks import file. Indented rows go inside Repeat.',
    `Create variable radius = ${f(p.r)}`,
    `Repeat ${p.n} times`,
    '  Add Cylinder [SOLID]: Radius = radius; H = '+f(p.h)+'; Sides = 64; Edge = 0; Edge Steps = 1',
    '  Move: x = 0; y = 0; z = '+f(p.h / 2),
    '  Add Cylinder [HOLE]: Radius = [radius − '+f(p.w)+']; H = '+f(p.h + 2)+'; Sides = 64; Edge = 0; Edge Steps = 1',
    '  Move: x = 0; y = 0; z = '+f(p.h / 2),
    '  Create Group (all shapes created so far, including hole)',
    '  Change variable radius by '+f(-(p.w + p.gap)),
    'End Repeat',
    '',
    'Build OUTSIDE to INSIDE. Cylinders centered on origin; Move lifts bottom to bed.',
    'Expected outer diameter / hole diameter / height:',
    ...rings(p).map(g => `Ring ${g.i}: ${f(g.R*2)} / ${f(g.r*2)} / ${f(g.h)} mm`),
    '',
    'Digital geometry checks only; physical fit requires a clearance test print.',
    ...checks(p).map(c => (c.ok ? 'PASS: ' : 'FAIL: ') + c.text)
  ].join('\n');
}
  /* ── STL (ASCII), one closed tube per ring ─────────────────────────── */
export function stl(list) {
    if (!list.length || list.some(g => !Number.isFinite(g.R + g.r + g.h) || g.r <= 0 || g.R <= g.r || g.h <= 0)) throw new Error('Invalid ring geometry');
    var SEG = 64, out = ['solid nested_rings'];
    function facet(a, b, c) {
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      out.push(' facet normal ' + (nx / l).toFixed(5) + ' ' + (ny / l).toFixed(5) + ' ' + (nz / l).toFixed(5),
        '  outer loop',
        '   vertex ' + a.map(f).join(' '), '   vertex ' + b.map(f).join(' '), '   vertex ' + c.map(f).join(' '),
        '  endloop', ' endfacet');
    }
    function f(n) { return n.toFixed(4); }
    function quad(a, b, c, d) { facet(a, b, c); facet(a, c, d); }
    list.forEach(function (g) {
      var z0 = g.z, z1 = g.z + g.h, R = g.R, r = g.r;
      for (var k = 0; k < SEG; k++) {
        var a0 = 2 * Math.PI * k / SEG, a1 = 2 * Math.PI * (k + 1) / SEG;
        var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        var o00 = [R * c0, R * s0, z0], o10 = [R * c1, R * s1, z0], o01 = [R * c0, R * s0, z1], o11 = [R * c1, R * s1, z1];
        quad(o00, o10, o11, o01);                                         // outer wall
        if (r > 0) {
          var i00 = [r * c0, r * s0, z0], i10 = [r * c1, r * s1, z0], i01 = [r * c0, r * s0, z1], i11 = [r * c1, r * s1, z1];
          quad(i10, i00, i01, i11);                                       // inner wall
          quad(o01, o11, i11, i01);                                       // top
          quad(o10, o00, i00, i10);                                       // bottom
        } else {
          facet([0, 0, z1], o01, o11);
          facet([0, 0, z0], o10, o00);
        }
      }
    });
    out.push('endsolid nested_rings');
    return out.join('\n');
  }

