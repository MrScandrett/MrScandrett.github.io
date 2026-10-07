/* forge.mjs — the Forge page (forge.html): part picker, parameter controls,
 * live 3D preview on the MakerBot bed, print checks, and downloads.
 *
 * Geometry and checks live in engine.mjs / parts.mjs (tested under node);
 * this file only wires them to the page. Work is saved in this browser under
 * one localStorage key, and as a .forge.json project file students can keep.
 */

import ManifoldModule from '../../vendor/manifold/manifold.js';
import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { DEFAULT_PRINTER, bounds, placeOnBed, prepareForPrint, writeBinaryStl, writeGlb, writeObj } from '../fab-io.mjs';
import { DEFAULT_SETTINGS, concat, createEngine, resolveParams } from './engine.mjs';
import { PARTS, PART_GROUPS, partById } from './parts.mjs';

const STORE_KEY = 'classroomos:forge:v1';
const FORMAT = 'classroomos-forge';
const COLORS = [
  { value: '#e8792a', label: 'Orange' }, { value: '#2f6fd6', label: 'Blue' }, { value: '#2f9e5a', label: 'Green' },
  { value: '#d6403a', label: 'Red' }, { value: '#f2f0ea', label: 'White' }, { value: '#2b2b2e', label: 'Black' },
  { value: '#8a5cd0', label: 'Purple' }, { value: '#f2c230', label: 'Yellow' },
];
const BRIDGE = new THREE.Color('#f0a530');
const OVERHANG = new THREE.Color('#e0362c');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (id) => document.getElementById(id);
const el = {
  parts: $('forge-parts'), title: $('forge-part-title'), blurb: $('forge-blurb'), params: $('forge-params'),
  stats: $('forge-stats'), verdicts: $('forge-verdicts'), status: $('forge-status'), canvas: $('forge-canvas'),
  nogl: $('forge-nogl'), name: $('forge-project-name'), clearance: $('forge-clearance'), clearanceOut: $('forge-clearance-out'),
  layer: $('forge-layer'), colors: $('forge-colors'), showOverhangs: $('forge-show-overhangs'), resetView: $('forge-reset-view'),
  stl: $('forge-dl-stl'), partStls: $('forge-dl-parts'), glb: $('forge-dl-glb'), obj: $('forge-dl-obj'), save: $('forge-save'), open: $('forge-open'),
  openFile: $('forge-open-file'), note: $('forge-export-note'),
};

/* ── state ────────────────────────────────────────────────────────────── */

const state = loadState();
let result = null;
let engine = null;

function loadState() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch { saved = {}; }
  const fromUrl = new URLSearchParams(location.search).get('part');
  return {
    part: partById(fromUrl) ? fromUrl : (partById(saved.part) ? saved.part : PARTS[0].id),
    params: typeof saved.params === 'object' && saved.params ? saved.params : {},
    settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}) },
    color: COLORS.some((c) => c.value === saved.color) ? saved.color : COLORS[0].value,
    name: typeof saved.name === 'string' ? saved.name : '',
  };
}

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private window: work stays on the page */ }
}

const currentPart = () => partById(state.part);
const currentParams = () => resolveParams(currentPart(), state.params[state.part]);

/* ── part library ─────────────────────────────────────────────────────── */

function renderLibrary() {
  el.parts.replaceChildren();
  for (const group of PART_GROUPS) {
    const parts = PARTS.filter((p) => p.group === group);
    if (!parts.length) continue;
    const h = document.createElement('h3');
    h.className = 'forge-group';
    h.textContent = group;
    const list = document.createElement('ul');
    for (const part of parts) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'forge-part';
      b.dataset.part = part.id;
      b.setAttribute('aria-pressed', String(part.id === state.part));
      b.innerHTML = '<strong></strong><span></span>';
      b.querySelector('strong').textContent = part.name;
      b.querySelector('span').textContent = part.blurb;
      b.addEventListener('click', () => selectPart(part.id));
      li.append(b);
      list.append(li);
    }
    const section = document.createElement('div');
    section.className = 'forge-group-wrap';
    section.append(h, list);
    el.parts.append(section);
  }
}

function selectPart(id) {
  if (!partById(id)) return;
  state.part = id;
  persist();
  el.parts.querySelectorAll('[data-part]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === id)));
  const url = new URL(location.href);
  url.searchParams.set('part', id);
  history.replaceState(null, '', url);
  renderControls();
  framed = false;
  schedule();
}

/* ── parameter controls ───────────────────────────────────────────────── */

const fmt = (v, spec) => `${spec.step < 1 ? Number(v).toFixed(String(spec.step).split('.')[1]?.length || 1) : v}${spec.unit ? (spec.unit.startsWith('%') || spec.unit === '°' ? '' : ' ') + spec.unit : ''}`;

function renderControls() {
  const part = currentPart();
  const params = currentParams();
  el.title.textContent = part.name;
  el.blurb.replaceChildren(document.createTextNode(part.blurb + ' '));
  if (part.lesson) {
    const a = document.createElement('a');
    a.href = part.lesson.href;
    a.textContent = `Lesson: ${part.lesson.label} →`;
    el.blurb.append(a);
  }
  el.params.replaceChildren();
  for (const spec of part.params) {
    const field = document.createElement('div');
    field.className = 'forge-field';
    field.dataset.param = spec.id;
    const id = `fp-${part.id}-${spec.id}`;
    const top = document.createElement('div');
    top.className = 'forge-field-top';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = spec.label;
    top.append(label);
    let input;
    if (spec.type === 'range') {
      const out = document.createElement('output');
      out.htmlFor = id;
      out.textContent = fmt(params[spec.id], spec);
      top.append(out);
      input = document.createElement('input');
      Object.assign(input, { type: 'range', min: spec.min, max: spec.max, step: spec.step, value: params[spec.id] });
      input.addEventListener('input', () => { out.textContent = fmt(input.value, spec); update(spec.id, Number(input.value)); });
    } else if (spec.type === 'select') {
      input = document.createElement('select');
      for (const o of spec.options) input.add(new Option(o.label, o.value, false, o.value === params[spec.id]));
      input.addEventListener('change', () => update(spec.id, input.value, true));
    } else if (spec.type === 'toggle') {
      field.classList.add('forge-field-toggle');
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = params[spec.id];
      input.addEventListener('change', () => update(spec.id, input.checked, true));
      top.prepend(input);
    } else if (spec.type === 'text') {
      input = document.createElement('input');
      Object.assign(input, { type: 'text', value: params[spec.id], maxLength: spec.maxLength || 24, spellcheck: false });
      input.addEventListener('input', () => update(spec.id, input.value));
    }
    input.id = id;
    field.append(top);
    if (spec.type !== 'toggle') field.append(input);
    if (spec.help) {
      const help = document.createElement('p');
      help.className = 'forge-help';
      help.id = `${id}-help`;
      help.textContent = spec.help;
      input.setAttribute('aria-describedby', help.id);
      field.append(help);
    }
    el.params.append(field);
  }
  applyVisibility();
}

function applyVisibility() {
  const part = currentPart();
  const params = currentParams();
  for (const spec of part.params) {
    const field = el.params.querySelector(`[data-param="${spec.id}"]`);
    if (field) field.hidden = spec.showIf ? !spec.showIf(params) : false;
  }
}

function update(id, value, structural = false) {
  state.params[state.part] = { ...currentParams(), [id]: value };
  persist();
  if (structural) applyVisibility();
  schedule();
}

/* ── printer settings ─────────────────────────────────────────────────── */

function renderSettings() {
  el.clearance.value = state.settings.clearance;
  el.clearanceOut.textContent = `${Number(state.settings.clearance).toFixed(2)} mm`;
  el.layer.value = String(state.settings.layer);
  el.clearance.addEventListener('input', () => {
    state.settings.clearance = Number(el.clearance.value);
    el.clearanceOut.textContent = `${state.settings.clearance.toFixed(2)} mm`;
    persist();
    schedule();
  });
  el.layer.addEventListener('change', () => { state.settings.layer = Number(el.layer.value); persist(); schedule(); });
  el.colors.replaceChildren();
  for (const c of COLORS) {
    const label = document.createElement('label');
    label.className = 'forge-swatch';
    label.title = c.label;
    const input = document.createElement('input');
    Object.assign(input, { type: 'radio', name: 'forge-color', value: c.value, checked: c.value === state.color });
    input.setAttribute('aria-label', c.label);
    input.addEventListener('change', () => { state.color = c.value; persist(); paint(); });
    const dot = document.createElement('span');
    dot.style.background = c.value;
    label.append(input, dot);
    el.colors.append(label);
  }
  document.querySelectorAll('[data-goto-part]').forEach((b) => b.addEventListener('click', () => selectPart(b.dataset.gotoPart)));
}

/* ── 3D view ──────────────────────────────────────────────────────────── */

let view = null;
let framed = false;

function setupView() {
  try {
    const { scene, camera, renderer, syncSize } = createScene(el.canvas, { THREE, fov: 35, near: 1, far: 5000, clearColor: 0x1d2228 });
    const controls = new OrbitControls(camera, el.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x30363d, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-120, 260, 180);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(200, 80, -160);
    scene.add(fill);

    // The bed, in the printer's own Z-up millimetres; the root group turns Z-up into Three's Y-up.
    const root = new THREE.Group();
    root.rotation.x = -Math.PI / 2;
    scene.add(root);
    const { x: bx, y: by } = DEFAULT_PRINTER.build;
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(bx, by), new THREE.MeshStandardMaterial({ color: 0x2c333b, roughness: 0.95 }));
    bed.position.z = -0.3;
    root.add(bed);
    const grid = new THREE.GridHelper(Math.max(bx, by), Math.max(bx, by) / 10, 0x58626e, 0x3a424c);
    grid.rotation.x = Math.PI / 2;
    grid.scale.set(bx / Math.max(bx, by), 1, by / Math.max(bx, by));
    grid.position.z = -0.25;
    root.add(grid);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(bx, by)), new THREE.LineBasicMaterial({ color: 0x8fb4d8 }));
    edge.position.z = -0.2;
    root.add(edge);
    const parts = new THREE.Group();
    root.add(parts);
    view = { scene, camera, renderer, syncSize, controls, parts };
    window.SimKit.loop(() => {
      controls.update();
      syncSize();
      renderer.render(scene, camera);
    });
  } catch (error) {
    view = null;
    el.canvas.hidden = true;
    el.nogl.hidden = false;
  }
}

function showBodies() {
  if (!view) return;
  for (const child of [...view.parts.children]) { child.geometry.dispose(); child.material.dispose(); view.parts.remove(child); }
  for (const body of result.bodies) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(body.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(body.positions.length), 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.02, flatShading: true }));
    mesh.userData.mask = body.overhang.mask;
    view.parts.add(mesh);
  }
  paint();
  if (!framed) { frame(); framed = true; }
}

function paint() {
  if (!view) return;
  const show = el.showOverhangs.checked;
  view.parts.children.forEach((mesh, i) => {
    // nested pieces sit inside each other, so shade each one differently to tell them apart
    const base = new THREE.Color(state.color);
    if (result?.layout?.nested && i > 0) base.offsetHSL(0, 0, -0.2 * i);
    const colors = mesh.geometry.getAttribute('color');
    const mask = mesh.userData.mask;
    for (let t = 0; t < mask.length; t++) {
      const c = show && mask[t] === 1 ? OVERHANG : show && mask[t] === 2 ? BRIDGE : base;
      for (let k = 0; k < 3; k++) colors.setXYZ(t * 3 + k, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
  });
}

function frame() {
  if (!view || !result?.layout) return;
  const [w, d, h] = result.layout.size;
  // distance that fits the bounding sphere in the narrower of the two view angles
  const radius = Math.max(Math.hypot(w, d, h) / 2, 25);
  const vFov = (view.camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * view.camera.aspect);
  const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.05;
  const target = new THREE.Vector3(0, h / 2, 0);
  view.controls.target.copy(target);
  view.camera.position.copy(target).add(new THREE.Vector3(-0.55, 0.62, 0.95).normalize().multiplyScalar(distance));
  view.controls.update();
}

/* ── build + report ───────────────────────────────────────────────────── */

let pending = 0;
function schedule() {
  clearTimeout(pending);
  el.status.textContent = 'Building…';
  el.status.hidden = false;
  pending = setTimeout(rebuild, 90);
}

function rebuild() {
  if (!engine) return;
  const started = performance.now();
  const part = currentPart();
  result = engine.run(part, state.params[state.part], state.settings);
  result.bodies.forEach((b) => { b.color = state.color; });
  renderReport();
  showBodies();
  const ms = Math.round(performance.now() - started);
  el.status.textContent = result.error ? 'This design could not be built.' : `Built in ${ms} ms`;
  el.status.hidden = !result.error;
  const disabled = Boolean(result.error) || !result.bodies.length;
  [el.stl, el.glb, el.obj, el.partStls].forEach((b) => { b.disabled = disabled; });
  el.partStls.hidden = result.bodies.length < 2;
  const summary = result.verdicts.map((v) => `${v.tag}: ${v.text}`).join(' ');
  el.canvas.setAttribute('aria-label', `${part.name} on the print bed. ${summary}`);
}

function renderReport() {
  el.stats.replaceChildren(...result.stats.map((s) => {
    const li = document.createElement('li');
    li.innerHTML = '<span></span><strong></strong>';
    li.querySelector('span').textContent = s.label;
    li.querySelector('strong').textContent = s.value;
    return li;
  }));
  const order = { bad: 0, warn: 1, ok: 2 };
  const sorted = [...result.verdicts].sort((a, b) => order[a.tone] - order[b.tone]);
  el.verdicts.replaceChildren(...sorted.map((v) => {
    const li = document.createElement('li');
    li.className = `is-${v.tone}`;
    li.innerHTML = '<b></b><span></span>';
    li.querySelector('b').textContent = v.tag;
    li.querySelector('span').textContent = v.text;
    return li;
  }));
}

/* ── files ────────────────────────────────────────────────────────────── */

function slug() {
  const base = (state.name || '').trim() || currentPart().id;
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'forge-part';
}

function download(data, filename, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
}

function exportStl() {
  if (!result?.bodies.length) return;
  const plate = prepareForPrint(concat(result.bodies.map((b) => b.positions)), { yUp: false });
  const header = `${slug()} | ${currentPart().name} | ClassroomOS Forge`;
  download(writeBinaryStl(plate, header), `${slug()}.stl`, 'model/stl');
  const red = result.verdicts.filter((v) => v.tone === 'bad').length;
  el.note.textContent = `Saved ${slug()}.stl — ${result.bodies.length} part${result.bodies.length > 1 ? 's' : ''} on one plate.` + (red ? ` ${red} red check${red > 1 ? 's' : ''} still showing: it will print, but expect that failure.` : ' Slice at ' + state.settings.layer + ' mm layers.');
}

/* Each body as its own STL, e.g. for two filament colours. Every body keeps
   its place on the plate, so nested pieces load back inside each other. */
function exportPartStls() {
  if (!result?.bodies.length) return;
  const { min, max } = bounds(concat(result.bodies.map((b) => b.positions)));
  const shift = [-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, -min[2]];
  const names = [];
  for (const body of result.bodies) {
    const p = prepareForPrint(body.positions, { yUp: false });
    const own = bounds(body.positions);
    // prepareForPrint centres each body on its own; put it back where it sat on the plate
    const back = [0, 1].map((k) => (own.min[k] + own.max[k]) / 2 + shift[k]).concat(own.min[2] + shift[2]);
    for (let i = 0; i < p.length; i += 3) { p[i] += back[0]; p[i + 1] += back[1]; p[i + 2] += back[2]; }
    const file = `${slug()}-${body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.stl`;
    download(writeBinaryStl(p, `${slug()} ${body.name} | ClassroomOS Forge`), file, 'model/stl');
    names.push(file);
  }
  el.note.textContent = `Saved ${names.join(' and ')}. Load them together and they land exactly where they sat on the plate.`;
}

function gameBodies() {
  return result.bodies.map((b) => ({ name: b.name, color: state.color, positions: placeOnBed(b.positions) }));
}

function exportGlb() {
  if (!result?.bodies.length) return;
  download(writeGlb(gameBodies()), `${slug()}.glb`, 'model/gltf-binary');
  el.note.textContent = `Saved ${slug()}.glb — each part is its own object, base at the origin, real size in metres.`;
}

function exportObj() {
  if (!result?.bodies.length) return;
  download(writeObj(gameBodies(), { comment: `${slug()} — ClassroomOS Forge` }), `${slug()}.obj`, 'text/plain');
  el.note.textContent = `Saved ${slug()}.obj (metres, Y-up).`;
}

function saveProject() {
  const project = {
    format: FORMAT, version: 1, name: state.name, part: state.part,
    params: currentParams(), settings: state.settings, color: state.color, savedAt: new Date().toISOString(),
  };
  download(JSON.stringify(project, null, 2), `${slug()}.forge.json`, 'application/json');
  el.note.textContent = `Saved ${slug()}.forge.json — open it here any time to keep working.`;
}

async function openProject(file) {
  try {
    const project = JSON.parse(await file.text());
    if (project?.format !== FORMAT || !partById(project.part)) throw new Error('not a Forge project');
    state.part = project.part;
    state.params[project.part] = resolveParams(partById(project.part), project.params);
    state.settings = { ...DEFAULT_SETTINGS, ...pickSettings(project.settings) };
    if (COLORS.some((c) => c.value === project.color)) state.color = project.color;
    state.name = typeof project.name === 'string' ? project.name.slice(0, 40) : '';
    persist();
    el.name.value = state.name;
    el.clearance.value = state.settings.clearance;
    el.clearanceOut.textContent = `${Number(state.settings.clearance).toFixed(2)} mm`;
    el.layer.value = String(state.settings.layer);
    el.colors.querySelectorAll('input').forEach((i) => { i.checked = i.value === state.color; });
    selectPart(state.part);
    el.note.textContent = `Opened ${file.name}.`;
  } catch (error) {
    el.note.textContent = `${file.name} is not a Forge project file (.forge.json).`;
  }
}

function pickSettings(s = {}) {
  const out = {};
  const c = Number(s.clearance);
  if (Number.isFinite(c) && c >= 0.1 && c <= 0.8) out.clearance = c;
  if ([0.1, 0.2, 0.3].includes(Number(s.layer))) out.layer = Number(s.layer);
  return out;
}

/* ── start ────────────────────────────────────────────────────────────── */

async function start() {
  renderLibrary();
  renderControls();
  renderSettings();
  el.name.value = state.name;
  el.name.addEventListener('input', () => { state.name = el.name.value; persist(); });
  el.showOverhangs.addEventListener('change', paint);
  el.resetView.addEventListener('click', frame);
  el.stl.addEventListener('click', exportStl);
  el.partStls.addEventListener('click', exportPartStls);
  el.glb.addEventListener('click', exportGlb);
  el.obj.addEventListener('click', exportObj);
  el.save.addEventListener('click', saveProject);
  el.open.addEventListener('click', () => el.openFile.click());
  el.openFile.addEventListener('change', () => { const f = el.openFile.files[0]; if (f) openProject(f); el.openFile.value = ''; });
  [el.stl, el.glb, el.obj, el.partStls].forEach((b) => { b.disabled = true; });
  setupView();
  try {
    const font = await fetch(new URL('../../vendor/fonts/droid-sans-bold.typeface.json', import.meta.url)).then((r) => r.json());
    engine = await createEngine(ManifoldModule, { font });
  } catch (error) {
    el.status.textContent = 'The geometry engine could not start in this browser.';
    console.error(error);
    return;
  }
  rebuild();
  if (reduceMotion && view) view.controls.enableDamping = false;
}

start();
