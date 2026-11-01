/* profiles-revolve-loft-sweep.mjs — Profiles lesson
 * (lessons/3d-design/modeling/profiles-revolve-loft-sweep.html).
 *
 * Two widgets:
 *   [data-pr-lab]  Profile Lab: draw a profile on Workbench's own sketch pad
 *                  and see it extruded, revolved, lofted or swept, built by the
 *                  same Manifold kernel and the same shape code Workbench uses
 *                  (so "Open in Workbench" gives exactly what is on screen).
 *   [data-pr-cup]  Cup designer: a measured item → a revolved cup or sleeve
 *                  with a clearance, a printable wall and a floor.
 *
 * The arithmetic is pure and exported so tests can check it in Node.
 */

import { shapeById, smoothPoints } from '../workbench/shapes.mjs';
import { resolveParams, defaultParams, nice } from '../workbench/model.mjs';
import { DEFAULT_PRINTER, printerFit } from '../fab-io.mjs';

export const MODES = {
  extrude: { shape: 'sketch-extrude', label: 'Extrude', help: 'One closed outline, pushed straight up. Twist it or shrink the top to taper it.' },
  revolve: { shape: 'sketch-revolve', label: 'Revolve', help: 'Half a silhouette beside the orange spin axis, spun around it. Hollow wall turns a solid into a cup.' },
  loft: { shape: 'sketch-loft', label: 'Loft', help: 'A bottom outline and a top outline; the skin blends one into the other.' },
  sweep: { shape: 'sketch-sweep', label: 'Sweep', help: 'A path (seen from the front) and a cross-section; the section slides along the path.' },
};
export const PLA_DENSITY = 1.24;                    // g/cm³
export const CLEARANCES = { snug: 0.5, easy: 1, loose: 2 };   // mm per side
export const WALLS = [1.2, 1.6, 2.4];              // 3, 4, 6 beads of a 0.4 mm nozzle

/* ── pure helpers ─────────────────────────────────────────────────────── */

const area = (pts) => pts.reduce((a, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return a + x * y2 - x2 * y; }, 0) / 2;

/* The closed region a revolve silhouette makes (axis edge included), as the
   shape builds it: smoothed, then closed along the axis. */
export function revolveRegion(points, smooth = 0) {
  const line = smoothPoints(points.map(([x, y]) => [Math.max(0, x), y]), smooth, false);
  return [[0, line[0][1]], ...line, [0, line[line.length - 1][1]]];
}

/* Pappus's centroid theorem: a region turned through θ about an axis it does
   not cross sweeps a volume of A × (distance its centroid travels) = A·θ·x̄. */
export function pappus(region, degrees = 360) {
  let a = 0, cx = 0;
  region.forEach(([x, y], i) => { const [x2, y2] = region[(i + 1) % region.length]; const c = x * y2 - x2 * y; a += c; cx += (x + x2) * c; });
  a /= 2;
  const xBar = Math.abs(a) < 1e-12 ? 0 : cx / (6 * a);
  const A = Math.abs(a);
  return { area: A, xBar, volume: A * xBar * (degrees * Math.PI / 180) };
}

/* Volume of a cone frustum, radii r1 (bottom) and r2 (top), height h. */
export const frustum = (r1, r2, h) => (Math.PI * h * (r1 * r1 + r1 * r2 + r2 * r2)) / 3;

/* A cup or sleeve around a measured item.
   item: the item's diameter (mm); clearance: gap per side (mm); wall: wall and
   floor thickness (mm); depth: inside depth (mm); flare: how much wider the
   rim is than the base, on the radius (mm).
   The revolve shape hollows by offsetting the silhouette inward by `wall`, so
   the outside is drawn here and the inside follows. */
export function cupDesign({ item, clearance, wall, depth, flare = 0 }) {
  const innerR = item / 2 + clearance;
  const H = depth + wall;
  // the side leans out by flare over the height; offsetting square to a leaning
  // side moves it in by wall / cos(lean), so start a hair wider to keep the inner size
  const lean = Math.atan2(flare * 0.3, H * 0.55);
  const outerR = innerR + wall / Math.cos(lean);
  const points = [[outerR, 0], [outerR + flare * 0.3, H * 0.55], [outerR + flare, H]].map((p) => p.map((v) => nice(v)));
  const rimInner = innerR + flare;
  return {
    points, wall, smooth: flare ? 2 : 0,
    innerD: innerR * 2, outerD: outerR * 2, rimD: (outerR + flare) * 2, height: H,
    // straight-sided estimate a student can do by hand (mL = cm³)
    estimateMl: frustum(innerR, rimInner, depth) / 1000,
  };
}

export function workbenchHref(base, mode, params, name) {
  const q = new URLSearchParams({ shape: MODES[mode].shape, name, params: JSON.stringify(params) });
  return `${base}workbench.html?${q}`;
}

const fmt = (v, d = 1) => (Number.isFinite(v) ? Number(v.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d }) : '–');

/* ═════════════════════════════════ DOM ═════════════════════════════════ */

const STORE = 'classroomos:profiles-lab:v1';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch { return null; } },
  set(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* storage off: the lab still works */ } },
};
const h = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids) if (kid != null) n.append(kid);
  return n;
};

let enginePromise = null;
function getEngine() {
  enginePromise ||= Promise.all([import('../../vendor/manifold/manifold.js'), import('../forge/engine.mjs')])
    .then(([{ default: Module }, { createEngine }]) => createEngine(Module, {}));
  return enginePromise;
}

let threePromise = null;
function getThree() {
  threePromise ||= Promise.all([import('../../vendor/three-bundle.min.js'), import('../sim-kit-three.mjs')])
    .then(([three, kit]) => ({ ...three, createScene: kit.createScene }));
  return threePromise;
}

/* A small on-demand Three.js viewer (renders on change, never loops). */
async function createViewer(canvas) {
  const { THREE, OrbitControls, createScene } = await getThree();
  const { renderer, scene, camera, syncSize } = createScene(canvas, { THREE, alpha: true, near: 1, far: 5000, fov: 35 });
  camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(-120, -200, 300); scene.add(sun);
  const back = new THREE.DirectionalLight(0xffffff, 0.5); back.position.set(150, 160, 80); scene.add(back);
  const controls = new OrbitControls(camera, canvas);
  const grid = new THREE.GridHelper(200, 20, 0x8b95a1, 0xc7ccd1);
  grid.rotation.x = Math.PI / 2; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
  const material = new THREE.MeshStandardMaterial({ color: 0xe8792a, roughness: 0.55, metalness: 0.05, flatShading: true });
  let mesh = null;
  const render = () => { syncSize(); renderer.render(scene, camera); };
  controls.addEventListener('change', render);
  new ResizeObserver(render).observe(canvas);
  return {
    show({ vertProperties, triVerts, numProp }, frame) {
      if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
      const pos = new Float32Array((triVerts.length) * 3);
      for (let i = 0; i < triVerts.length; i++) { const v = triVerts[i] * numProp; pos[i * 3] = vertProperties[v]; pos[i * 3 + 1] = vertProperties[v + 1]; pos[i * 3 + 2] = vertProperties[v + 2]; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.computeVertexNormals();
      g.computeBoundingBox();
      const b = g.boundingBox;
      // stand it on the grid, centred
      g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z);
      mesh = new THREE.Mesh(g, material);
      scene.add(mesh);
      if (frame) {
        const size = new THREE.Vector3().subVectors(b.max, b.min);
        const r = Math.max(40, size.length());
        camera.position.set(r * 0.9, -r * 1.25, r * 0.85);
        controls.target.set(0, 0, size.z * 0.42);
        controls.update();
      }
      render();
    },
    clear() { if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh = null; } render(); },
  };
}

/* ── Profile Lab ──────────────────────────────────────────────────────── */

async function mountLab(root) {
  const $ = (s) => root.querySelector(s);
  const [{ createSketchPad }] = await Promise.all([import('../workbench/sketch.mjs')]);
  const saved = store.get();
  const state = { mode: MODES[saved?.mode] ? saved.mode : 'revolve', params: {} };
  for (const [m, def] of Object.entries(MODES)) {
    const shape = shapeById(def.shape);
    state.params[m] = resolveParams(shape, saved?.params?.[m] || defaultParams(shape, 'print'), 'print');
  }
  if (root.prPending) { state.mode = 'revolve'; state.params.revolve = resolveParams(shapeById(MODES.revolve.shape), { ...state.params.revolve, ...root.prPending }, 'print'); root.prPending = null; }
  const canvases = [$('[data-pr-pad="0"]'), $('[data-pr-pad="1"]')];
  const pads = [];
  let activePad = 0, viewer = null, engine = null, framed = false, timer = 0, built = null;
  const status = $('[data-pr-stats]');
  status.textContent = 'Starting the geometry engine…';

  const specsOf = (m) => shapeById(MODES[m].shape).params;
  const pointSpecs = (m) => specsOf(m).filter((s) => s.type === 'points');
  const smoothFor = (m, spec) => (spec.smooth === undefined ? state.params[m].smooth : spec.smooth ? state.params[m][spec.smooth] : 0) || 0;

  function setMode(m) {
    state.mode = m;
    root.querySelectorAll('[data-pr-mode]').forEach((b) => { const on = b.dataset.prMode === m; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    $('[data-pr-mode-help]').textContent = MODES[m].help;
    root.dataset.prActive = m;
    makePads();
    renderParams();
    framed = false;
    schedule(0);
  }

  function makePads() {
    pads.splice(0).forEach((p) => p.destroy());
    const specs = pointSpecs(state.mode);
    canvases.forEach((canvas, i) => {
      const wrap = canvas.closest('[data-pr-pad-wrap]');
      const spec = specs[i];
      wrap.hidden = !spec;
      if (!spec) return;
      wrap.querySelector('[data-pr-pad-label]').textContent = spec.label + (spec.axis ? ' (right of the spin axis)' : spec.path ? ' (seen from the front)' : spec.id === 'profile' ? ' (the cross-section)' : '');
      canvas.setAttribute('aria-label', `${spec.label} sketch. Click to add a point, drag a point to move it, arrow keys nudge the selected point, Delete removes it.`);
      const info = wrap.querySelector('[data-pr-pad-info]');
      const pad = createSketchPad(canvas, {
        points: state.params[state.mode][spec.id], closed: spec.closed, axis: spec.axis, smooth: smoothFor(state.mode, spec), grid: 1, units: 'mm',
        snap: () => $('[data-pr-snap]').checked,
        onChange: (pts) => { state.params[state.mode][spec.id] = pts.map((p) => [...p]); schedule(40); },
        onCommit: () => save(),
        onInfo: (text) => { info.textContent = text; },
      });
      canvas.addEventListener('focus', () => { activePad = i; });
      canvas.addEventListener('pointerdown', () => { activePad = i; });
      pads[i] = pad;
    });
    requestAnimationFrame(() => pads.forEach((p) => { p?.fit(); }));
  }

  function renderParams() {
    const box = $('[data-pr-params]');
    box.replaceChildren();
    for (const spec of specsOf(state.mode)) {
      if (spec.type !== 'range') continue;
      const id = `pr-${state.mode}-${spec.id}`;
      const value = state.params[state.mode][spec.id];
      const unit = spec.unit || (spec.len ? ' mm' : '');
      const out = h('output', { for: id, text: `${value}${unit}` });
      const input = h('input', { type: 'range', id, min: spec.min, max: spec.max, step: spec.step, value });
      input.addEventListener('input', () => {
        state.params[state.mode][spec.id] = Number(input.value);
        out.textContent = `${input.value}${unit}`;
        pointSpecs(state.mode).forEach((ps, i) => pads[i]?.setSmooth(smoothFor(state.mode, ps)));
        schedule(30);
      });
      input.addEventListener('change', save);
      box.append(h('label', { class: 'pr-param', for: id }, h('span', { text: spec.label }), input, out));
      if (spec.help) box.append(h('p', { class: 'pr-note', text: spec.help }));
    }
  }

  function save() { store.set({ mode: state.mode, params: state.params }); }

  function schedule(ms) { clearTimeout(timer); timer = setTimeout(rebuild, ms); }

  function rebuild() {
    if (!engine) return;
    const m = state.mode, shape = shapeById(MODES[m].shape);
    const params = resolveParams(shape, state.params[m], 'print');
    let out;
    try {
      out = engine.scoped((ctx) => {
        const solid = shape.build({ ...ctx, noise: window.SimKit?.noise }, params);
        if (solid.status() !== 'NoError' || solid.isEmpty()) throw new Error('This drawing does not make a closed solid. Try moving a point.');
        const mesh = solid.getMesh();
        const b = solid.boundingBox();
        const r = {
          mesh: { numProp: mesh.numProp, vertProperties: Float32Array.from(mesh.vertProperties), triVerts: Uint32Array.from(mesh.triVerts) },
          volume: solid.volume(), size: b.max.map((v, i) => v - b.min[i]), genus: solid.genus(),
        };
        if (m === 'revolve' && params.wall > 0) {
          const full = shape.build({ ...ctx, noise: window.SimKit?.noise }, { ...params, wall: 0 });
          r.solidVolume = full.volume();
        }
        return r;
      });
    } catch (error) {
      built = null;
      root.dataset.prState = JSON.stringify({ mode: m, error: error.message });
      status.replaceChildren(h('p', { class: 'pr-bad', text: error.message }));
      return;
    }
    built = out;
    viewer?.show(out.mesh, !framed);
    framed = true;
    report(m, params, out);
    const href = workbenchHref(root.dataset.prBase || '../../../', m, params, `my-${m}`);
    $('[data-pr-open]').href = href;
    root.dataset.prState = JSON.stringify({ mode: m, volume: +out.volume.toFixed(1), size: out.size.map((v) => +v.toFixed(1)), triangles: out.mesh.triVerts.length / 3 });
  }

  function report(m, params, out) {
    const cm3 = out.volume / 1000;
    const fit = printerFit(out.size);
    const rows = [
      ['Size', `${out.size.map((v) => fmt(v)).join(' × ')} mm`],
      ['Volume', `${fmt(cm3, 1)} cm³ · about ${fmt(cm3 * PLA_DENSITY, 0)} g of PLA if printed solid`],
      ['Printer', fit.fits ? `fits the ${DEFAULT_PRINTER.name}${fit.turned ? ' (turned)' : ''}` : `too big for the ${DEFAULT_PRINTER.name}`],
    ];
    if (m === 'revolve') {
      const region = revolveRegion(params.points, params.smooth);
      const p = pappus(region, params.degrees);
      if (params.wall > 0) {
        rows.push(['Holds', `${fmt((out.solidVolume - out.volume) / 1000, 0)} mL of water to the rim (the solid minus the hollow)`]);
        rows.push(['Pappus', `the solid silhouette: A ${fmt(p.area, 0)} mm² × ${fmt(params.degrees, 0)}° × x̄ ${fmt(p.xBar)} mm = ${fmt(p.volume / 1000, 1)} cm³ (model: ${fmt(out.solidVolume / 1000, 1)} cm³)`]);
      } else {
        const gap = ((p.volume - out.volume) / p.volume) * 100;
        rows.push(['Pappus', `A ${fmt(p.area, 0)} mm² × turn ${fmt((params.degrees * Math.PI) / 180, 2)} rad × x̄ ${fmt(p.xBar)} mm = ${fmt(p.volume / 1000, 1)} cm³. The model's ${params.sides} flat sides give ${fmt(cm3, 1)} cm³ (${fmt(gap, 2)}% less).`]);
      }
    }
    status.replaceChildren(h('dl', { class: 'pr-dl' }, ...rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])));
  }

  root.querySelectorAll('[data-pr-mode]').forEach((b) => b.addEventListener('click', () => { setMode(b.dataset.prMode); save(); }));
  root.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    const keys = Object.keys(MODES), i = keys.indexOf(state.mode);
    const next = e.key === 'ArrowRight' ? keys[(i + 1) % keys.length] : e.key === 'ArrowLeft' ? keys[(i + keys.length - 1) % keys.length] : null;
    if (!next) return;
    e.preventDefault(); setMode(next); root.querySelector(`[data-pr-mode="${next}"]`).focus();
  });
  $('[data-pr-remove]').addEventListener('click', () => pads[activePad]?.remove());
  $('[data-pr-reset]').addEventListener('click', () => {
    const shape = shapeById(MODES[state.mode].shape);
    state.params[state.mode] = defaultParams(shape, 'print');
    setMode(state.mode); save();
  });
  $('[data-pr-snap]').addEventListener('change', () => pads.forEach((p) => p?.draw()));
  new ResizeObserver(() => pads.forEach((p) => p?.draw())).observe(canvases[0].closest('[data-pr-pads]'));

  // the cup designer hands its silhouette over here
  root.addEventListener('pr:load', (e) => {
    root.prPending = null;
    state.params.revolve = resolveParams(shapeById(MODES.revolve.shape), { ...state.params.revolve, ...e.detail }, 'print');
    setMode('revolve'); save();
  });

  setMode(state.mode);
  try {
    [engine, viewer] = await Promise.all([getEngine(), createViewer($('[data-pr-view]')).catch((err) => { $('[data-pr-view]').closest('.pr-view-box').replaceWith(h('p', { class: 'pr-bad', text: `The 3D view could not start (${err.message}). The numbers below still update.` })); return null; })]);
  } catch (err) {
    status.replaceChildren(h('p', { class: 'pr-bad', text: `The geometry engine could not start (${err.message}). You can still open your drawing in Workbench.` }));
    return;
  }
  rebuild();
}

/* ── Cup designer ─────────────────────────────────────────────────────── */

function mountCup(root) {
  const $ = (s) => root.querySelector(s);
  const read = () => ({
    item: Math.max(1, Number($('[data-pr-cup-item]').value) || 0),
    clearance: CLEARANCES[$('[data-pr-cup-fit]').value] ?? 1,
    wall: Number($('[data-pr-cup-wall]').value) || 2.4,
    depth: Math.max(5, Number($('[data-pr-cup-depth]').value) || 0),
    flare: Number($('[data-pr-cup-flare]').value) || 0,
  });
  let design = null;
  function update() {
    const input = read();
    design = cupDesign(input);
    $('[data-pr-cup-flare-out]').textContent = `${input.flare} mm`;
    const fit = printerFit([design.rimD, design.rimD, design.height]);
    const out = $('[data-pr-cup-out]');
    out.replaceChildren(
      h('p', { class: 'pr-big' }, 'Inside ', h('strong', { text: `Ø ${fmt(design.innerD, 1)} mm` }), ` at the floor = ${fmt(input.item, 1)} + 2 × ${input.clearance} clearance`),
      h('ul', { class: 'pr-list' },
        h('li', { text: `Outside: Ø ${fmt(design.outerD, 1)} mm at the base, Ø ${fmt(design.rimD, 1)} mm at the rim` }),
        h('li', { text: `Height: ${fmt(design.height, 1)} mm = ${fmt(input.depth, 0)} deep + ${input.wall} floor` }),
        h('li', { text: `Wall and floor: ${input.wall} mm = ${Math.round(input.wall / 0.4)} beads of a 0.4 mm nozzle` }),
        h('li', { text: `Holds about ${fmt(design.estimateMl, 0)} mL (π × r² × depth${input.flare ? ', as a cone frustum' : ''})` }),
        h('li', { class: fit.fits ? '' : 'pr-bad', text: fit.fits ? `Fits the ${DEFAULT_PRINTER.name} standing up.` : `Too big for the ${DEFAULT_PRINTER.name}: make it shorter or narrower.` })),
      h('p', { class: 'pr-note', text: `Silhouette to draw (radius, height): ${design.points.map(([x, y]) => `(${fmt(x, 2)}, ${fmt(y, 1)})`).join(' → ')}. Radius is half the diameter.` }),
    );
    drawSection($('[data-pr-cup-svg]'), input, design);
    const params = { points: design.points, wall: input.wall, sides: 96, smooth: design.smooth, degrees: 360 };
    $('[data-pr-cup-open]').href = workbenchHref(root.dataset.prBase || '../../../', 'revolve', params, 'my-cup');
    root.dataset.prState = JSON.stringify({ innerD: +design.innerD.toFixed(2), outerD: +design.outerD.toFixed(2), height: design.height, ml: Math.round(design.estimateMl) });
  }
  root.addEventListener('input', update);
  root.addEventListener('change', update);
  $('[data-pr-cup-load]').addEventListener('click', () => {
    const lab = document.querySelector('[data-pr-lab]');
    if (!lab || !design) return;
    const detail = { points: design.points, wall: read().wall, sides: 96, smooth: design.smooth, degrees: 360 };
    lab.prPending = detail;   // read by the lab if it hasn't started yet
    lab.dispatchEvent(new CustomEvent('pr:load', { detail }));
    lab.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  update();
}

/* A to-scale cross-section through the cup: walls hatched, the item dashed. */
function drawSection(svg, input, d) {
  const ns = 'http://www.w3.org/2000/svg';
  const W = 420, H = 300, pad = 46;
  const span = Math.max(d.rimD, d.outerD) + 20, tall = d.height + 14;
  const k = Math.min((W - pad * 2) / span, (H - pad - 30) / tall);
  const cx = W / 2, base = H - 34;
  const X = (r) => cx + r * k, Y = (z) => base - z * k;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const add = (tag, a, text) => { const e = document.createElementNS(ns, tag); for (const [key, v] of Object.entries(a)) e.setAttribute(key, v); if (text != null) e.textContent = text; svg.append(e); return e; };
  const line = smoothPoints(d.points, d.smooth, false);
  const outer = line.map(([r, z]) => [r, z]);
  // inner surface: the outer moved in by the wall (straight-line approximation for the drawing)
  const inner = outer.map(([r, z]) => [r - (d.outerD / 2 - d.innerD / 2), Math.max(z, input.wall)]);
  const side = (sign) => [...outer.map(([r, z]) => `${X(sign * r)},${Y(z)}`), ...[...inner].reverse().map(([r, z]) => `${X(sign * r)},${Y(z)}`)].join(' ');
  add('polygon', { points: side(1), class: 'pr-sec-wall' });
  add('polygon', { points: side(-1), class: 'pr-sec-wall' });
  add('rect', { x: X(-d.outerD / 2), y: Y(input.wall), width: d.outerD * k, height: input.wall * k, class: 'pr-sec-wall' });
  // the measured item, dashed
  const itemH = Math.min(tall - 4, input.depth + 12);
  add('rect', { x: X(-input.item / 2), y: Y(input.wall + itemH), width: input.item * k, height: itemH * k, class: 'pr-sec-item' });
  add('line', { x1: cx, x2: cx, y1: Y(d.height + 10), y2: base + 8, class: 'pr-sec-axis' });
  add('line', { x1: 10, x2: W - 10, y1: base, y2: base, class: 'pr-sec-ground' });
  // dimensions
  const dim = (x1, x2, y, text) => {
    add('line', { x1, x2, y1: y, y2: y, class: 'pr-sec-dim' });
    add('line', { x1, x2: x1, y1: y - 5, y2: y + 5, class: 'pr-sec-dim' });
    add('line', { x1: x2, x2, y1: y - 5, y2: y + 5, class: 'pr-sec-dim' });
    add('text', { x: (x1 + x2) / 2, y: y - 6, 'text-anchor': 'middle', class: 'pr-sec-label' }, text);
  };
  dim(X(-d.innerD / 2), X(d.innerD / 2), Y(input.wall) - 14, `inside Ø ${fmt(d.innerD, 1)}`);
  dim(X(-d.outerD / 2), X(d.outerD / 2), base + 20, `outside Ø ${fmt(d.outerD, 1)} mm`);
  add('text', { x: X(input.item / 2) - 4, y: Y(input.wall + itemH) - 6, 'text-anchor': 'end', class: 'pr-sec-label pr-sec-item-label' }, `item Ø ${fmt(input.item, 1)}`);
  const hx = X(d.rimD / 2) + 14;
  add('line', { x1: hx, x2: hx, y1: Y(0), y2: Y(d.height), class: 'pr-sec-dim' });
  add('text', { x: hx + 6, y: Y(d.height / 2), class: 'pr-sec-label' }, `${fmt(d.height, 1)}`);
}

if (typeof document !== 'undefined') {
  const start = () => {
    document.querySelectorAll('[data-pr-cup]').forEach(mountCup);
    document.querySelectorAll('[data-pr-lab]').forEach((root) => {
      // start the engine and 3D view only when the lab comes near the screen
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        mountLab(root).catch((err) => { root.querySelector('[data-pr-stats]').textContent = `The Profile Lab could not start (${err.message}).`; });
      }, { rootMargin: '600px' });
      io.observe(root);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}
