/*
 * CrystalViewer — dependency-free 2D-canvas crystal structure renderer.
 * Renders real crystallographic unit cells (lattice parameters + fractional atomic coordinates) with an
 * orthographic projection and pre-rendered sphere sprites, so it runs at full speed on phones, Chromebooks and
 * machines without WebGL. Geometry (nearest-neighbour distance, coordination, packing fraction, density) is
 * computed from the cell, not typed in, so the numbers on screen are self-consistent.
 *
 * Data: lattice constants are typical literature values at room temperature unless noted (Å, degrees).
 * They were compiled from memory of standard crystallographic tables and should be spot-checked before citing.
 *
 * Usage:  const v = CrystalViewer.mount(hostElement);  v.setElement({ symbol, color, mass, density, melt, temp });
 * Pure helpers (no DOM): CrystalViewer.geometry(symbol, variantIndex, mass).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CrystalViewer = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* ── Structure types: lattice + basis builders ─────────────────────────── */
  var cubic = function (a) { return { a: a, b: a, c: a, alpha: 90, beta: 90, gamma: 90 }; };
  var hexL = function (a, c) { return { a: a, b: a, c: c, alpha: 90, beta: 90, gamma: 120 }; };
  var FCC = [[0, 0, 0], [0, .5, .5], [.5, 0, .5], [.5, .5, 0]];
  var frac = function (v) { return ((v % 1) + 1) % 1; };
  var wrap = function (list) { return list.map(function (p) { return [frac(p[0]), frac(p[1]), frac(p[2])]; }); };
  var cmce = function (y, z) {
    var base = [[0, y, z], [0, .5 - y, z + .5], [0, y + .5, .5 - z], [0, -y, -z]];
    var out = [];
    base.forEach(function (p) { out.push(p, [p[0] + .5, p[1] + .5, p[2]]); });
    return wrap(out);
  };

  var TYPES = {
    sc:   { name: 'Simple cubic', sg: 'Pm-3m', pearson: 'cP1', kind: 'packed', sup: [2, 2, 2],
            lat: function (p) { return cubic(p.a); }, basis: function () { return [[0, 0, 0]]; },
            note: 'Every atom sits at a cube corner. Very open (52% filled), so only polonium adopts it at room conditions.' },
    bcc:  { name: 'Body-centred cubic (bcc)', sg: 'Im-3m', pearson: 'cI2', kind: 'packed', sup: [2, 2, 2],
            lat: function (p) { return cubic(p.a); }, basis: function () { return [[0, 0, 0], [.5, .5, .5]]; },
            note: 'One atom at each corner plus one in the middle: 8 nearest neighbours plus 6 slightly farther. Typical of alkali metals and early transition metals; usually less ductile than fcc.' },
    fcc:  { name: 'Face-centred cubic (fcc, cubic close-packed)', sg: 'Fm-3m', pearson: 'cF4', kind: 'packed', sup: [2, 2, 2],
            lat: function (p) { return cubic(p.a); }, basis: function () { return FCC; },
            note: 'Atoms at corners and face centres, stacked ABCABC… along the body diagonal. 12 neighbours and 74% filled, the densest possible packing of equal spheres; many metals with slip planes in four directions are ductile.' },
    hcp:  { name: 'Hexagonal close-packed (hcp)', sg: 'P6₃/mmc', pearson: 'hP2', kind: 'packed', sup: [3, 3, 2],
            lat: function (p) { return hexL(p.a, p.c); }, basis: function () { return [[1 / 3, 2 / 3, .25], [2 / 3, 1 / 3, .75]]; },
            note: 'Layers stacked ABABAB… Like fcc it has 12 neighbours, but the ideal c/a ratio is 1.633. Real metals deviate, which changes how easily they deform.' },
    dhcp: { name: 'Double hexagonal close-packed (dhcp)', sg: 'P6₃/mmc', pearson: 'hP4', kind: 'packed', sup: [3, 3, 1],
            lat: function (p) { return hexL(p.a, p.c); }, basis: function () { return [[0, 0, 0], [0, 0, .5], [1 / 3, 2 / 3, .25], [2 / 3, 1 / 3, .75]]; },
            note: 'Layers stacked ABAC… (a mixture of hcp and fcc environments). Common among the light lanthanides and early actinides.' },
    diamond: { name: 'Diamond cubic', sg: 'Fd-3m', pearson: 'cF8', kind: 'covalent', sup: [2, 2, 2],
            lat: function (p) { return cubic(p.a); },
            basis: function () { var o = []; FCC.forEach(function (f) { o.push(f, [f[0] + .25, f[1] + .25, f[2] + .25]); }); return wrap(o); },
            note: 'Each atom bonds to 4 neighbours at the corners of a tetrahedron (sp³). Only 34% of the space is filled, which is why diamond-structure crystals are hard yet fairly light.' },
    graphite: { name: 'Graphite (layered hexagonal)', sg: 'P6₃/mmc', pearson: 'hP4', kind: 'layered', sup: [3, 3, 1],
            lat: function (p) { return hexL(p.a, p.c); }, basis: function () { return [[0, 0, .25], [0, 0, .75], [1 / 3, 2 / 3, .25], [2 / 3, 1 / 3, .75]]; },
            note: 'Flat honeycomb sheets (sp², 3 strong bonds per atom) stacked ABAB and held only by weak van der Waals forces, which is why graphite is slippery and conducts along the sheets.' },
    bsn:  { name: 'White tin (β-Sn, body-centred tetragonal)', sg: 'I4₁/amd', pearson: 'tI4', kind: 'packed', sup: [2, 2, 2],
            lat: function (p) { return { a: p.a, b: p.a, c: p.c, alpha: 90, beta: 90, gamma: 90 }; },
            basis: function () { return [[0, 0, 0], [0, .5, .25], [.5, .5, .5], [.5, 0, .75]]; },
            note: 'A distorted diamond arrangement squashed along c, giving 4 + 2 neighbours. It is metallic, unlike diamond-cubic grey tin below 13 °C.' },
    bct:  { name: 'Body-centred tetragonal (bct)', sg: 'I4/mmm', pearson: 'tI2', kind: 'packed', sup: [2, 2, 2],
            lat: function (p) { return { a: p.a, b: p.a, c: p.c, alpha: 90, beta: 90, gamma: 90 }; },
            basis: function () { return [[0, 0, 0], [.5, .5, .5]]; },
            note: 'A bcc cell stretched (or compressed) along c. Indium is almost face-centred cubic with a slight distortion.' },
    A7:   { name: 'Arsenic (A7, rhombohedral layers)', sg: 'R-3m', pearson: 'hR2', kind: 'layered', sup: [2, 2, 2],
            lat: function (p) { return { a: p.a, b: p.a, c: p.a, alpha: p.alpha, beta: p.alpha, gamma: p.alpha }; },
            basis: function (p) { return wrap([[p.u, p.u, p.u], [-p.u, -p.u, -p.u]]); },
            note: 'Puckered double layers: each atom has 3 close neighbours in its layer and 3 farther ones in the next. Going As → Sb → Bi the two distances converge and metallic character grows.' },
    trig: { name: 'Trigonal chains (helical)', sg: 'P3₁1 21', pearson: 'hP3', kind: 'layered', sup: [3, 3, 2],
            lat: function (p) { return hexL(p.a, p.c); }, basis: function (p) { return wrap([[p.x, 0, 1 / 3], [0, p.x, 2 / 3], [-p.x, -p.x, 0]]); },
            note: 'Atoms form spiral chains running along c, each atom covalently bonded to 2 neighbours. Chains are held together by weaker forces, giving fibrous, anisotropic crystals.' },
    hgrh: { name: 'Rhombohedral (α-Hg)', sg: 'R-3m', pearson: 'hR1', kind: 'packed', sup: [2, 2, 2],
            lat: function (p) { return { a: p.a, b: p.a, c: p.a, alpha: p.alpha, beta: p.alpha, gamma: p.alpha }; }, basis: function () { return [[0, 0, 0]]; },
            note: 'A cubic lattice sheared along its body diagonal. Mercury is liquid at room temperature; this is the solid below about 234 K.' },
    uAlpha: { name: 'α-Uranium (orthorhombic)', sg: 'Cmcm', pearson: 'oC4', kind: 'layered', sup: [2, 2, 2],
            lat: function (p) { return { a: p.a, b: p.b, c: p.c, alpha: 90, beta: 90, gamma: 90 }; },
            basis: function (p) { return wrap([[0, p.y, .25], [0, -p.y, .75], [.5, .5 + p.y, .25], [.5, .5 - p.y, .75]]); },
            note: 'Corrugated sheets of atoms, a low-symmetry structure with strongly directional bonding that makes uranium expand unevenly when heated.' },
    blackP: { name: 'Black phosphorus (orthorhombic)', sg: 'Cmce', pearson: 'oS8', kind: 'layered', sup: [2, 2, 2],
            lat: function (p) { return { a: p.a, b: p.b, c: p.c, alpha: 90, beta: 90, gamma: 90 }; }, basis: function (p) { return cmce(p.y, p.z); },
            note: 'Puckered honeycomb layers (3 bonds per atom), stacked with weak forces. This is the most stable form of phosphorus; white and red phosphorus are less stable forms.' },
    iodine: { name: 'Molecular crystal of I₂', sg: 'Cmce', pearson: 'oS8', kind: 'molecular', sup: [2, 2, 2],
            lat: function (p) { return { a: p.a, b: p.b, c: p.c, alpha: 90, beta: 90, gamma: 90 }; }, basis: function (p) { return cmce(p.y, p.z); },
            note: 'Discrete I₂ molecules packed in layers. The strong bond is inside each molecule; the crystal is held by weak van der Waals forces, so iodine sublimes easily.' },
    n2:   { name: 'Molecular crystal of N₂ (α-N₂)', sg: 'Pa-3', pearson: 'cP8', kind: 'molecular', sup: [2, 2, 2],
            lat: function (p) { return cubic(p.a); },
            basis: function (p) {
              var x = p.x;
              return wrap([[x, x, x], [.5 - x, -x, .5 + x], [-x, .5 + x, .5 - x], [.5 + x, .5 - x, -x], [-x, -x, -x], [.5 + x, x, .5 - x], [x, .5 - x, .5 + x], [.5 - x, .5 + x, x]]);
            },
            note: 'Each N₂ molecule points along a cube diagonal. Molecules interact only weakly, so nitrogen solidifies just below 63 K.' }
  };

  /* ── Element data: first variant is the default ────────────────────────── */
  var E = {};
  function put(sym, id, label, type, p, extra) { (E[sym] = E[sym] || []).push(Object.assign({ id: id, label: label, type: type, p: p }, extra || {})); }
  function many(list, type, fn) { list.forEach(function (r) { put(r[0], type, TYPES[type].name, type, fn(r)); }); }

  many([['Li', 3.51], ['Na', 4.291], ['K', 5.328], ['Rb', 5.585], ['Cs', 6.05], ['Ba', 5.028], ['Ra', 5.148], ['V', 3.024], ['Cr', 2.884],
        ['Fe', 2.866], ['Nb', 3.301], ['Mo', 3.147], ['Ta', 3.301], ['W', 3.165], ['Eu', 4.581]], 'bcc', function (r) { return { a: r[1] }; });
  many([['Al', 4.05], ['Ca', 5.588], ['Ni', 3.524], ['Cu', 3.615], ['Sr', 6.085], ['Rh', 3.803], ['Pd', 3.89], ['Ag', 4.086], ['Ir', 3.839],
        ['Pt', 3.924], ['Au', 4.078], ['Pb', 4.95], ['Yb', 5.485], ['Ce', 5.161], ['Th', 5.084], ['Ac', 5.311]], 'fcc', function (r) { return { a: r[1] }; });
  many([['Ne', 4.46], ['Ar', 5.31], ['Kr', 5.65], ['Xe', 6.13]], 'fcc', function (r) { return { a: r[1] }; });
  ['Ne', 'Ar', 'Kr', 'Xe'].forEach(function (s) { E[s][0].cold = true; E[s][0].label = 'Face-centred cubic (solid at cryogenic temperatures)'; });
  many([['Be', 2.286, 3.584], ['Mg', 3.209, 5.211], ['Sc', 3.309, 5.273], ['Ti', 2.951, 4.683], ['Co', 2.507, 4.069], ['Zn', 2.665, 4.947],
        ['Y', 3.647, 5.731], ['Zr', 3.232, 5.147], ['Tc', 2.735, 4.388], ['Ru', 2.706, 4.282], ['Cd', 2.979, 5.619], ['Hf', 3.196, 5.051],
        ['Re', 2.761, 4.456], ['Os', 2.734, 4.317], ['Tl', 3.457, 5.525], ['Gd', 3.636, 5.783], ['Tb', 3.601, 5.694], ['Dy', 3.59, 5.647],
        ['Ho', 3.578, 5.618], ['Er', 3.559, 5.585], ['Tm', 3.538, 5.554], ['Lu', 3.503, 5.551]], 'hcp', function (r) { return { a: r[1], c: r[2] }; });
  put('He', 'hcp', 'Hexagonal close-packed (solid helium needs > 25 atm)', 'hcp', { a: 3.57, c: 5.83 }, { cold: true });
  many([['La', 3.774, 12.171], ['Pr', 3.672, 11.833], ['Nd', 3.658, 11.797], ['Pm', 3.65, 11.65], ['Am', 3.468, 11.24], ['Cm', 3.496, 11.33],
        ['Bk', 3.416, 11.069], ['Cf', 3.39, 11.02]], 'dhcp', function (r) { return { a: r[1], c: r[2] }; });
  put('Po', 'sc', TYPES.sc.name + ' (α-Po)', 'sc', { a: 3.359 });
  put('Si', 'diamond', TYPES.diamond.name, 'diamond', { a: 5.431 });
  put('Ge', 'diamond', TYPES.diamond.name, 'diamond', { a: 5.658 });
  put('C', 'graphite', 'Graphite (stable form)', 'graphite', { a: 2.461, c: 6.708 });
  put('C', 'diamond', 'Diamond (metastable at 1 atm)', 'diamond', { a: 3.567 });
  put('Sn', 'bsn', 'White tin (β-Sn, stable above 13 °C)', 'bsn', { a: 5.831, c: 3.182 });
  put('Sn', 'diamond', 'Grey tin (α-Sn, stable below 13 °C)', 'diamond', { a: 6.489 });
  put('In', 'bct', TYPES.bct.name, 'bct', { a: 3.2523, c: 4.9461 });
  put('Pa', 'bct', TYPES.bct.name, 'bct', { a: 3.925, c: 3.238 });
  put('As', 'A7', 'Grey arsenic (A7)', 'A7', { a: 4.131, alpha: 54.13, u: .227 });
  put('Sb', 'A7', TYPES.A7.name, 'A7', { a: 4.507, alpha: 57.11, u: .2336 });
  put('Bi', 'A7', TYPES.A7.name, 'A7', { a: 4.746, alpha: 57.23, u: .234 });
  put('Se', 'trig', 'Grey selenium (trigonal chains)', 'trig', { a: 4.366, c: 4.954, x: .2254 });
  put('Te', 'trig', 'Tellurium (trigonal chains)', 'trig', { a: 4.457, c: 5.929, x: .2636 });
  put('Hg', 'hgrh', 'Solid mercury (below 234 K)', 'hgrh', { a: 3.005, alpha: 70.53 }, { cold: true });
  put('U', 'uAlpha', TYPES.uAlpha.name, 'uAlpha', { a: 2.854, b: 5.869, c: 4.955, y: .1025 });
  put('P', 'blackP', TYPES.blackP.name, 'blackP', { a: 3.314, b: 10.476, c: 4.374, y: .10168, z: .08056 });
  put('I', 'iodine', TYPES.iodine.name, 'iodine', { a: 7.18, b: 4.71, c: 9.81, y: .1543, z: .1174 });
  put('N', 'n2', TYPES.n2.name, 'n2', { a: 5.66, x: .0561 }, { cold: true });

  /* ── Geometry ──────────────────────────────────────────────────────────── */
  function latticeVectors(l) {
    var r = Math.PI / 180, ca = Math.cos(l.alpha * r), cb = Math.cos(l.beta * r), cg = Math.cos(l.gamma * r), sg = Math.sin(l.gamma * r);
    var cx = l.c * cb, cy = l.c * (ca - cb * cg) / sg;
    return [[l.a, 0, 0], [l.b * cg, l.b * sg, 0], [cx, cy, Math.sqrt(Math.max(0, l.c * l.c - cx * cx - cy * cy))]];
  }
  function toCart(v, f) {
    return [f[0] * v[0][0] + f[1] * v[1][0] + f[2] * v[2][0], f[0] * v[0][1] + f[1] * v[1][1] + f[2] * v[2][1], f[0] * v[0][2] + f[1] * v[1][2] + f[2] * v[2][2]];
  }
  function det(v) {
    return v[0][0] * (v[1][1] * v[2][2] - v[1][2] * v[2][1]) - v[0][1] * (v[1][0] * v[2][2] - v[1][2] * v[2][0]) + v[0][2] * (v[1][0] * v[2][1] - v[1][1] * v[2][0]);
  }
  function dist(a, b) { var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return Math.sqrt(x * x + y * y + z * z); }

  function geometry(symbol, variantIndex, mass) {
    var list = E[symbol];
    if (!list) return null;
    var variant = list[Math.min(variantIndex || 0, list.length - 1)];
    var type = TYPES[variant.type];
    var lat = type.lat(variant.p), vec = latticeVectors(lat), basis = type.basis(variant.p);
    var V = Math.abs(det(vec));
    // Distances from basis atom 0 to every periodic image of every basis atom.
    var origin = toCart(vec, basis[0]), ds = [];
    for (var i = -3; i <= 3; i++) for (var j = -3; j <= 3; j++) for (var k = -3; k <= 3; k++) {
      basis.forEach(function (b) {
        var d = dist(origin, toCart(vec, [b[0] + i, b[1] + j, b[2] + k]));
        if (d > 1e-4) ds.push(d);
      });
    }
    ds.sort(function (x, y) { return x - y; });
    var shells = [];
    ds.forEach(function (d) {
      var last = shells[shells.length - 1];
      if (last && d <= last.d * 1.04) { last.n++; last.dmax = d; }
      else if (shells.length < 3) shells.push({ d: d, dmax: d, n: 1 });
    });
    var d1 = shells[0].d;
    var covalentBonds = type.kind !== 'packed';
    var out = {
      symbol: symbol, variants: list, variantIndex: list.indexOf(variant), variant: variant, type: type, lat: lat, vec: vec,
      basis: basis, Z: basis.length, volume: V, d1: d1, shells: shells,
      apf: type.kind === 'packed' ? basis.length * (4 / 3) * Math.PI * Math.pow(d1 / 2, 3) / V : null,
      bondCut: d1 * 1.08, covalent: covalentBonds,
      density: mass ? basis.length * mass / (0.602214 * V) : null
    };
    return out;
  }

  function cellAtoms(geo, n) {
    var atoms = [], eps = 1e-3;
    geo.basis.forEach(function (b) {
      for (var i = -1; i <= n[0]; i++) for (var j = -1; j <= n[1]; j++) for (var k = -1; k <= n[2]; k++) {
        var f = [b[0] + i, b[1] + j, b[2] + k];
        if (f[0] >= -eps && f[0] <= n[0] + eps && f[1] >= -eps && f[1] <= n[1] + eps && f[2] >= -eps && f[2] <= n[2] + eps) {
          atoms.push({ f: f, c: toCart(geo.vec, f), layer: Math.round(frac(f[2] + eps / 2) * 1000) });
        }
      }
    });
    return atoms;
  }
  function bondsOf(atoms, cut) {
    var bonds = [];
    for (var i = 0; i < atoms.length; i++) for (var j = i + 1; j < atoms.length; j++) {
      if (dist(atoms[i].c, atoms[j].c) <= cut) bonds.push([i, j]);
    }
    return bonds;
  }

  /* ── Rendering ─────────────────────────────────────────────────────────── */
  var spriteCache = {};
  function sphereSprite(color) {
    if (spriteCache[color]) return spriteCache[color];
    var s = 96, c = document.createElement('canvas'); c.width = c.height = s;
    var g = c.getContext('2d'), rgb = hex(color);
    var grad = g.createRadialGradient(s * .36, s * .32, s * .04, s * .5, s * .5, s * .5);
    grad.addColorStop(0, mix(rgb, [255, 255, 255], .78));
    grad.addColorStop(.35, mix(rgb, [255, 255, 255], .12));
    grad.addColorStop(1, mix(rgb, [0, 0, 0], .55));
    g.fillStyle = grad; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 1, 0, TAU); g.fill();
    spriteCache[color] = c;
    return c;
  }
  function hex(h) {
    var m = String(h).replace('#', ''); if (m.length === 3) m = m.replace(/(.)/g, '$1$1');
    var n = parseInt(m, 16); return isNaN(n) ? [90, 120, 200] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) { return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ')'; }
  var LAYER_COLORS = ['#e4572e', '#2e86ab', '#f2a541', '#3aa76d', '#8e5ea2', '#c2185b', '#607d8b'];

  function mount(host, opts) {
    opts = opts || {};
    host.innerHTML = '';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var st = { view: 'cell', style: 'packed', spin: !reduce, vibrate: !reduce, layers: false, yaw: -0.65, pitch: 0.42, drag: null, variant: 0,
               el: null, geo: null, atoms: [], bonds: [], size: [2, 2, 2], visible: true, running: false, dirty: true, t0: 0, last: 0, jitter: [] };

    var root = document.createElement('div'); root.className = 'cv';
    var stage = document.createElement('div'); stage.className = 'cv-stage';
    var canvas = document.createElement('canvas'); canvas.className = 'cv-canvas'; canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
    var msg = document.createElement('div'); msg.className = 'cv-msg'; msg.hidden = true;
    stage.appendChild(canvas); stage.appendChild(msg);
    var ctl = document.createElement('div'); ctl.className = 'cv-ctl';
    var variantRow = document.createElement('div'); variantRow.className = 'cv-row'; variantRow.hidden = true;
    var info = document.createElement('dl'); info.className = 'cv-info';
    var note = document.createElement('p'); note.className = 'cv-note';
    var status = document.createElement('p'); status.className = 'cv-status'; status.setAttribute('aria-live', 'polite');
    root.appendChild(stage); root.appendChild(variantRow); root.appendChild(ctl); root.appendChild(info); root.appendChild(note); root.appendChild(status);
    host.appendChild(root);
    var ctx = canvas.getContext('2d');

    function btn(label, key, group) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cv-btn'; b.textContent = label; b.dataset.key = key;
      return b;
    }
    var controls = {};
    function toggle(label, key, get, set) {
      var b = btn(label, key); b.setAttribute('aria-pressed', String(!!get()));
      b.addEventListener('click', function () { set(); b.setAttribute('aria-pressed', String(!!get())); refresh(); });
      controls[key] = { b: b, get: get }; ctl.appendChild(b); return b;
    }
    function radio(labels, key, get, set) {
      var wrap = document.createElement('span'); wrap.className = 'cv-seg'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', key);
      labels.forEach(function (l) {
        var b = btn(l[1], l[0]); b.setAttribute('aria-pressed', String(get() === l[0]));
        b.addEventListener('click', function () { set(l[0]); [].forEach.call(wrap.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); rebuild(); });
        wrap.appendChild(b);
      });
      ctl.appendChild(wrap);
    }
    radio([['cell', 'Unit cell'], ['super', 'Crystal']], 'View', function () { return st.view; }, function (v) { st.view = v; });
    radio([['packed', 'Packed'], ['stick', 'Ball & stick']], 'Style', function () { return st.style; }, function (v) { st.style = v; });
    toggle('Spin', 'spin', function () { return st.spin; }, function () { st.spin = !st.spin; });
    toggle('Vibrate', 'vibrate', function () { return st.vibrate; }, function () { st.vibrate = !st.vibrate; });
    toggle('Layers', 'layers', function () { return st.layers; }, function () { st.layers = !st.layers; });
    var view = document.createElement('span'); view.className = 'cv-seg';
    [['Top', 0, Math.PI / 2], ['Side', 0, 0], ['Reset', -0.65, 0.42]].forEach(function (v) {
      var b = btn(v[0], v[0]); b.addEventListener('click', function () { st.yaw = v[1]; st.pitch = v[2]; refresh(); }); view.appendChild(b);
    });
    ctl.appendChild(view);

    function refresh() { st.dirty = true; if (!st.running) { st.running = true; requestAnimationFrame(frame); } }

    function resize() {
      var r = stage.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(160, Math.round(r.width)), h = Math.round(w * 0.72);
      canvas.style.height = h + 'px';
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      st.w = w; st.h = h; st.dpr = dpr; refresh();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);
    if (window.IntersectionObserver) new IntersectionObserver(function (e) { st.visible = e[0].isIntersecting; if (st.visible) refresh(); }).observe(canvas);

    /* pointer + keyboard rotation */
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', function (e) { st.drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-drag'); });
    canvas.addEventListener('pointermove', function (e) {
      if (!st.drag) return;
      st.yaw += (e.clientX - st.drag.x) * 0.012; st.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, st.pitch + (e.clientY - st.drag.y) * 0.012));
      st.drag = { x: e.clientX, y: e.clientY }; refresh();
    });
    function endDrag() { st.drag = null; canvas.classList.remove('is-drag'); }
    canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowUp: [0, -.15], ArrowDown: [0, .15] }[e.key];
      if (!d) return; e.preventDefault(); st.yaw += d[0]; st.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, st.pitch + d[1])); refresh();
    });

    function rebuild() {
      if (!st.geo) return;
      var g = st.geo, n = st.view === 'cell' ? [1, 1, 1] : g.type.sup;
      st.size = n; st.atoms = cellAtoms(g, n);
      st.bonds = st.style === 'stick' || g.covalent ? bondsOf(st.atoms, g.bondCut) : [];
      var cx = 0, cy = 0, cz = 0, span = [n[0], n[1], n[2]];
      var mid = toCart(g.vec, [n[0] / 2, n[1] / 2, n[2] / 2]); st.mid = mid;
      var rad = 0;
      st.atoms.forEach(function (a) { rad = Math.max(rad, dist(a.c, mid)); });
      st.rad = rad + g.d1 * 0.5;
      var layerSet = {}; st.atoms.forEach(function (a) { layerSet[a.layer] = 1; });
      var keys = Object.keys(layerSet).map(Number).sort(function (a, b) { return a - b; });
      st.atoms.forEach(function (a) { a.li = keys.indexOf(a.layer); });
      st.jitter = st.atoms.map(function () { return [Math.random() * TAU, Math.random() * TAU, Math.random() * TAU, .7 + Math.random() * .6]; });
      st.corners = [];
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) for (var k = 0; k < 2; k++) st.corners.push(toCart(g.vec, [i * n[0], j * n[1], k * n[2]]));
      refresh();
    }

    function frame(ts) {
      st.running = false;
      if (!st.geo || !st.w) return;
      if (!st.visible || document.hidden || !canvas.offsetParent) return;
      var dt = st.last ? Math.min(0.05, (ts - st.last) / 1000) : 0; st.last = ts;
      var animating = (st.spin && !st.drag) || st.vibrate;
      if (st.spin && !st.drag) st.yaw += dt * 0.35;
      if (animating || st.dirty) { draw(ts / 1000); st.dirty = false; }
      if (animating) { st.running = true; requestAnimationFrame(frame); } else st.last = 0;
    }

    function draw(t) {
      var g = st.geo, w = st.w, h = st.h, dpr = st.dpr;
      var cs = getComputedStyle(canvas), ink = cs.color || '#333';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      var cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
      var scale = Math.min(w, h) * 0.46 / st.rad, mid = st.mid;
      function proj(p) {
        var x = p[0] - mid[0], y = p[1] - mid[1], z = p[2] - mid[2];
        var x1 = x * cy - y * sy, y1 = x * sy + y * cy;
        var y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp;
        return [w / 2 + x1 * scale, h / 2 - z2 * scale, y2];
      }
      // amplitude of thermal motion: Lindemann rule (rms ~10% of neighbour distance at melting)
      var amp = 0;
      if (st.vibrate && st.el) {
        var ratio = st.el.melt > 0 ? Math.min(1, Math.max(0.05, st.el.temp / st.el.melt)) : 0.3;
        amp = 0.1 * g.d1 * Math.sqrt(ratio) * 0.82;
      }
      var color = st.el.color, baseR = g.d1 * (st.style === 'stick' ? 0.2 : 0.5) * (g.type.kind === 'layered' || g.type.kind === 'molecular' ? (st.style === 'stick' ? 1 : 0.9) : 1);
      var pts = st.atoms.map(function (a, i) {
        var c = a.c;
        if (amp) { var j = st.jitter[i], k = amp * j[3]; c = [c[0] + k * Math.sin(t * 5.1 + j[0]), c[1] + k * Math.sin(t * 4.3 + j[1]), c[2] + k * Math.sin(t * 5.7 + j[2])]; }
        return proj(c);
      });
      // unit-cell / supercell outline
      var cc = st.corners.map(proj);
      var edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      ctx.strokeStyle = ink; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); edges.forEach(function (e) { ctx.moveTo(cc[e[0]][0], cc[e[0]][1]); ctx.lineTo(cc[e[1]][0], cc[e[1]][1]); }); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      // depth-sorted atoms and bonds
      var zmin = Infinity, zmax = -Infinity; pts.forEach(function (p) { zmin = Math.min(zmin, p[2]); zmax = Math.max(zmax, p[2]); });
      var zr = zmax - zmin || 1, items = [];
      pts.forEach(function (p, i) { items.push({ z: p[2], atom: i }); });
      st.bonds.forEach(function (b) { items.push({ z: (pts[b[0]][2] + pts[b[1]][2]) / 2, bond: b }); });
      items.sort(function (a, b) { return b.z - a.z; });
      var rpx = baseR * scale;
      items.forEach(function (it) {
        var near = 1 - (it.z - zmin) / zr; // 1 = closest
        if (it.bond) {
          var p = pts[it.bond[0]], q = pts[it.bond[1]];
          ctx.strokeStyle = 'rgb(' + Math.round(110 + near * 60) + ',' + Math.round(118 + near * 60) + ',' + Math.round(130 + near * 60) + ')';
          ctx.lineWidth = Math.max(2, rpx * 0.5); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        } else {
          var a = st.atoms[it.atom], p2 = pts[it.atom];
          var col = st.layers ? LAYER_COLORS[a.li % LAYER_COLORS.length] : color;
          ctx.globalAlpha = 0.62 + 0.38 * near;
          ctx.drawImage(sphereSprite(col), p2[0] - rpx, p2[1] - rpx, rpx * 2, rpx * 2);
        }
      });
      ctx.globalAlpha = 1;
      // orientation gizmo (a, b, c axes)
      var origin = [0, 0, 0], ax = [[g.vec[0], 'a', '#d9534f'], [g.vec[1], 'b', '#3aa76d'], [g.vec[2], 'c', '#2e86ab']];
      var gx = 34, gy = h - 26, len = 18;
      ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ax.forEach(function (x) {
        var v = x[0], m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
        var u = [v[0] / m, v[1] / m, v[2] / m];
        var x1 = u[0] * cy - u[1] * sy, y1 = u[0] * sy + u[1] * cy, y2 = y1 * cp - u[2] * sp, z2 = y1 * sp + u[2] * cp;
        ctx.strokeStyle = x[2]; ctx.fillStyle = x[2]; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + x1 * len, gy - z2 * len); ctx.stroke();
        ctx.fillText(x[1], gx + x1 * (len + 8), gy - z2 * (len + 8));
      });
      ctx.fillStyle = ink; ctx.globalAlpha = 0.6; ctx.textAlign = 'right';
      ctx.fillText(st.view === 'cell' ? 'one unit cell' : st.size.join('×') + ' cells', w - 8, h - 10); ctx.globalAlpha = 1;
    }

    function fmt(n, d) { return Number(n).toFixed(d); }
    function renderInfo() {
      var g = st.geo, l = g.lat, rows = [];
      var lattice = 'a = ' + fmt(l.a, 3) + ' Å' + (Math.abs(l.b - l.a) > 1e-6 ? ', b = ' + fmt(l.b, 3) + ' Å' : '') + (Math.abs(l.c - l.a) > 1e-6 ? ', c = ' + fmt(l.c, 3) + ' Å' : '');
      var angles = [];
      if (l.alpha !== 90 || l.beta !== 90 || l.gamma !== 90) {
        if (l.alpha === l.beta && l.beta === l.gamma) angles.push('α = β = γ = ' + fmt(l.alpha, 2) + '°'); else if (l.gamma !== 90) angles.push('γ = ' + l.gamma + '°');
      }
      rows.push(['Structure', g.variant.label]);
      rows.push(['Space group · Pearson', g.type.sg + ' · ' + g.type.pearson]);
      rows.push(['Lattice', lattice + (angles.length ? ', ' + angles.join(', ') : '')]);
      if (Math.abs(l.c / l.a - 1) > 1e-6 && (g.variant.type === 'hcp')) rows.push(['c/a ratio', fmt(l.c / l.a, 3) + ' (ideal hcp 1.633)']);
      rows.push(['Atoms per cell', g.Z]);
      rows.push(['Neighbours', g.shells.slice(0, 2).map(function (s) { return s.n + ' at ' + fmt(s.d, 2) + ' Å'; }).join(' · ')]);
      if (g.apf != null) rows.push(['Packing fraction', fmt(g.apf * 100, 1) + '% of space filled']);
      if (g.density) rows.push(['Density from cell', fmt(g.density, 2) + ' g/cm³' + (st.el.density ? ' (data: ' + fmt(st.el.density, 2) + ')' : '')]);
      info.innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
      note.textContent = g.type.note;
      canvas.setAttribute('aria-label', st.el.symbol + ' crystal structure: ' + g.variant.label + ', ' + g.Z + ' atoms per unit cell. Drag or use arrow keys to rotate.');
    }

    function setElement(el) {
      st.el = el;
      var geo = geometry(el.symbol, st.variantFor === el.symbol ? st.variant : 0, el.mass);
      if (!geo) {
        st.geo = null; ctx.clearRect(0, 0, canvas.width, canvas.height);
        stage.classList.add('is-empty'); msg.hidden = false;
        msg.textContent = ['H', 'O', 'F', 'Cl', 'Br'].indexOf(el.symbol) >= 0
          ? el.name + ' crystallises as small molecules in low-symmetry cells, so no simple cell is drawn here.'
          : el.number >= 104 ? 'No experimental crystal structure has been determined for ' + el.name + '.'
          : el.name + ' has a large or low-symmetry unit cell (dozens of atoms), which this viewer does not draw.';
        info.innerHTML = ''; note.textContent = ''; status.textContent = ''; variantRow.hidden = true; ctl.hidden = true;
        return;
      }
      ctl.hidden = false; stage.classList.remove('is-empty'); msg.hidden = true;
      st.geo = geo; st.variant = geo.variantIndex; st.variantFor = el.symbol;
      variantRow.innerHTML = ''; variantRow.hidden = geo.variants.length < 2;
      geo.variants.forEach(function (v, i) {
        var b = btn(v.label.replace(/ \(.*$/, ''), String(i)); b.setAttribute('aria-pressed', String(i === geo.variantIndex));
        b.addEventListener('click', function () { st.variant = i; setElement(el); }); variantRow.appendChild(b);
      });
      var solid = !(el.melt > 0) || el.temp < el.melt;
      status.textContent = !solid ? el.name + ' is liquid or gas at ' + Math.round(el.temp) + ' K; the crystal below shows its solid form.'
        : geo.variant.cold ? el.name + ' only forms this solid at low temperature or high pressure.' : '';
      renderInfo(); rebuild(); resize();
    }

    return { setElement: setElement, refresh: refresh, state: st };
  }

  return { mount: mount, geometry: geometry, types: TYPES, elements: E };
}));
