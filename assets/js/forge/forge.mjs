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
  search: $('forge-search'), undo: $('forge-undo'), redo: $('forge-redo'), saved: $('forge-save-status'),
  summary: $('forge-check-summary'), checkLabel: $('forge-check-label'), checkCount: $('forge-check-count'),
  readiness: $('forge-export-readiness'), quickStats: $('forge-quick-stats'),

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
    settings: { ...DEFAULT_SETTINGS, ...pickSettings(saved.settings || {}) },
    color: COLORS.some((c) => c.value === saved.color) ? saved.color : COLORS[0].value,
    name: typeof saved.name === 'string' ? saved.name : '',
  };
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    el.saved.textContent = 'Saved in this browser';
  } catch {
    el.saved.textContent = 'Browser save unavailable — save a copy';
  }
}

const past = [], future = [];
let historyKey = '', historyTime = 0;
function checkpoint(key = '') {
  const now = performance.now();
  if (!key || key !== historyKey || now - historyTime > 700) {
    past.push(JSON.stringify(state));
    if (past.length > 60) past.shift();
  }
  historyKey = key;
  historyTime = now;
  future.length = 0;
  syncHistory();
}
function syncHistory() { el.undo.disabled = !past.length; el.redo.disabled = !future.length; }
function syncSettings() {
  el.name.value = state.name;
  el.clearance.value = state.settings.clearance;
  el.clearanceOut.textContent = `${Number(state.settings.clearance).toFixed(2)} mm`;
  el.layer.value = String(state.settings.layer);
  el.colors.querySelectorAll('input').forEach((i) => { i.checked = i.value === state.color; });
}
function navigatePart() {
  const url = new URL(location.href);
  url.searchParams.set('part', state.part);
  history.replaceState(null, '', url);
  el.parts.querySelectorAll('[data-part]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === state.part)));
}
function travelHistory(from, to) {
  if (!from.length) return;
  to.push(JSON.stringify(state));
  Object.assign(state, JSON.parse(from.pop()));
  historyKey = '';
  persist(); syncHistory(); syncSettings(); navigatePart(); renderControls();
  framed = false;
  schedule();
}

let toastTimer;
function notify(message) {
  clearTimeout(toastTimer);
  el.note.textContent = message;
  el.note.hidden = false;
  toastTimer = setTimeout(() => { el.note.hidden = true; }, 10000);
}
function activateTab(name, focus = false) {
  for (const tab of document.querySelectorAll('.forge-tabs [role="tab"]')) {
    const selected = tab.id === `forge-tab-${name}`;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(tab.getAttribute('aria-controls')).hidden = !selected;
    if (selected && focus) tab.focus();
  }
}


const currentPart = () => partById(state.part);
const currentParams = () => resolveParams(currentPart(), state.params[state.part] || {});

/* ── part library ─────────────────────────────────────────────────────── */

// Small line drawings make templates recognizable without loading 14 previews.
const PART_ICONS = {
  'rolling-tool': '<path d="M5 20V12Q16 2 27 12V20Z"/><circle cx="10" cy="23" r="4"/><circle cx="23" cy="23" r="4"/>',
  'wheel-axle': '<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="4"/><path d="M16 5V12M16 20V27M5 16H12M20 16H27"/>',
  case: '<rect x="4" y="10" width="24" height="17" rx="3"/><path d="M8 6H24M10 14V18M16 14V18M22 14V18M9 23H23"/>',
  captured: '<ellipse cx="16" cy="18" rx="12" ry="9"/><ellipse cx="16" cy="16" rx="8" ry="5"/><circle cx="16" cy="16" r="2"/>',
  spinner: '<path d="M12 13L9 6Q16 0 20 7L19 12L26 14Q30 22 22 25L17 21L11 26Q2 25 5 17Z"/><circle cx="16" cy="16" r="3"/>',
  hinge: '<path d="M4 7H14V26H4ZM18 7H28V26H18ZM14 9H18M14 15H18M14 22H18"/>',
  rings: '<path d="M16 3L20 11L29 12L23 19L24 28L16 24L8 28L9 19L3 12L12 11ZM16 10L18 15L23 16L19 20L16 18L12 20L13 16L9 15L14 14Z"/>',
  gears: '<circle cx="11" cy="12" r="7"/><circle cx="23" cy="23" r="6"/><circle cx="11" cy="12" r="2"/><circle cx="23" cy="23" r="2"/><path d="M11 2V5M1 12H4M11 19V22M18 12H21M23 14V17M29 23H32"/>',
  tag: '<path d="M3 12L11 5H28V26H11L3 19Z"/><circle cx="9" cy="16" r="2"/><path d="M15 12H24M15 16H22M15 20H24"/>',
  box: '<path d="M4 12L16 6L28 12V25L16 30L4 25ZM4 12L16 18L28 12M16 18V30M7 5L16 1L25 5"/>',
  stand: '<path d="M9 26L21 5L26 8L16 26H29V29H4V23H9Z"/>',
  clip: '<path d="M3 25H29M6 25V14Q6 4 14 6M18 6Q26 4 26 14V25M11 25V14Q11 11 14 11M18 11Q21 11 21 14V25"/>',
  comb: '<path d="M3 27V5H7V19H11V5H15V19H19V5H23V19H27V5H30V27Z"/>',
};
function renderLibrary() {
  el.parts.replaceChildren();
  for (const group of PART_GROUPS) {
    const parts = PARTS.filter((p) => p.group === group);
    if (!parts.length) continue;
    const h = document.createElement('h3');
    h.className = 'forge-group'; h.textContent = group;
    const list = document.createElement('ul');
    for (const part of parts) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'forge-part'; b.dataset.part = part.id;
      b.setAttribute('aria-pressed', String(part.id === state.part));
      b.title = part.blurb;
      b.innerHTML = `<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">${PART_ICONS[part.id] || '<path d="M7 26L16 4L27 26ZM5 21H29M9 15H24M12 9H21"/>'}</svg><strong></strong>`;
      b.querySelector('strong').textContent = part.name;
      b.addEventListener('click', () => selectPart(part.id));
      li.append(b); list.append(li);
    }
    const section = document.createElement('div');
    section.className = 'forge-group-wrap'; section.append(h, list); el.parts.append(section);
  }
  filterLibrary();
}
function filterLibrary() {
  const query = el.search.value.trim().toLowerCase();
  let count = 0;
  el.parts.querySelectorAll('.forge-group-wrap').forEach((group) => {
    let visible = 0;
    group.querySelectorAll('[data-part]').forEach((button) => {
      const part = partById(button.dataset.part);
      const match = `${part.name} ${part.blurb} ${part.group}`.toLowerCase().includes(query);
      button.parentElement.hidden = !match;
      if (match) visible++;
    });
    group.hidden = !visible; count += visible;
  });
  $('forge-part-count').textContent = `${count} part${count === 1 ? '' : 's'}`;
  $('forge-no-parts').hidden = count > 0;
  $('forge-search-clear').hidden = !query;
}
function selectPart(id) {
  if (!partById(id)) return;
  if (id !== state.part) { checkpoint(); state.part = id; persist(); }
  navigatePart(); renderControls(); activateTab('design');
  if (window.matchMedia('(max-width: 900px)').matches) $('forge-library-disclosure').open = false;
  framed = false; schedule();
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
    a.textContent = `Lesson: ${part.lesson.label}`;
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
      const measure = document.createElement('span');
      measure.className = 'forge-measure';
      const exact = document.createElement('input');
      Object.assign(exact, { type: 'number', min: spec.min, max: spec.max, step: spec.step, value: params[spec.id] });
      exact.setAttribute('aria-label', `${spec.label}${spec.unit ? ` (${spec.unit})` : ''}, exact value`);
      if (spec.help) exact.setAttribute('aria-describedby', `${id}-help`);
      const unit = document.createElement('span'); unit.textContent = spec.unit || '';
      measure.append(exact, unit); top.append(measure);
      input = document.createElement('input');
      Object.assign(input, { type: 'range', min: spec.min, max: spec.max, step: spec.step, value: params[spec.id] });
      input.setAttribute('aria-valuetext', fmt(params[spec.id], spec));
      input.addEventListener('input', () => {
        exact.value = input.value;
        input.setAttribute('aria-valuetext', fmt(input.value, spec));
        update(spec.id, Number(input.value));
      });
      const commitExact = (normalize = true) => {
        if (!exact.value || !Number.isFinite(exact.valueAsNumber)) { exact.value = currentParams()[spec.id]; return; }
        const clamped = Math.min(spec.max, Math.max(spec.min, exact.valueAsNumber));
        const value = Number((spec.min + Math.round((clamped - spec.min) / spec.step) * spec.step).toFixed(6));
        if (normalize) exact.value = value;
        input.value = value;
        input.setAttribute('aria-valuetext', fmt(value, spec));
        update(spec.id, value);
      };
      exact.addEventListener('input', () => { if (exact.validity.valid && exact.value !== '') commitExact(false); });
      exact.addEventListener('change', () => commitExact());
      exact.addEventListener('keydown', (event) => { if (event.key === 'Enter') exact.blur(); });
      input.addEventListener('change', () => { historyKey = ''; });
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
  if (currentParams()[id] === value) return;
  checkpoint(`param:${state.part}:${id}`);
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
    checkpoint('clearance');
    state.settings.clearance = Number(el.clearance.value);
    el.clearanceOut.textContent = `${state.settings.clearance.toFixed(2)} mm`;
    persist();
    schedule();
  });
  el.layer.addEventListener('change', () => { checkpoint(); state.settings.layer = Number(el.layer.value); persist(); schedule(); });
  el.colors.replaceChildren();
  for (const c of COLORS) {
    const label = document.createElement('label');
    label.className = 'forge-swatch';
    label.title = c.label;
    const input = document.createElement('input');
    Object.assign(input, { type: 'radio', name: 'forge-color', value: c.value, checked: c.value === state.color });
    input.setAttribute('aria-label', c.label);
    input.addEventListener('change', () => { checkpoint(); state.color = c.value; persist(); paint(); });
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
    controls.addEventListener('start', () => setCameraButtons(null));
    syncSize();
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
  if (!framed) { frame(cameraView); framed = true; }
}

function paint() {
  if (!view) return;
  const show = el.showOverhangs.checked;
  view.parts.children.forEach((mesh, i) => {
    // nested pieces sit inside each other, so shade every other one darker to
    // tell neighbours apart (a dozen locked rings would otherwise fade to black)
    const base = new THREE.Color(state.color);
    if (result?.layout?.nested && i % 2) base.offsetHSL(0, 0, -0.2);
    const colors = mesh.geometry.getAttribute('color');
    const mask = mesh.userData.mask;
    for (let t = 0; t < mask.length; t++) {
      const c = show && mask[t] === 1 ? OVERHANG : show && mask[t] === 2 ? BRIDGE : base;
      for (let k = 0; k < 3; k++) colors.setXYZ(t * 3 + k, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
  });
}

let cameraView = 'iso';
function setCameraButtons(name) {
  document.querySelectorAll('[data-camera]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.camera === name)));
}
function frame(name = 'iso') {
  if (typeof name !== 'string') name = 'iso';
  cameraView = name;
  setCameraButtons(name);
  if (!view || !result?.layout) return;
  view.syncSize();
  const [w, d, h] = result.layout.size;
  // distance that fits the bounding sphere in the narrower of the two view angles
  const radius = Math.max(Math.hypot(w, d, h) / 2, 25);
  const vFov = (view.camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * view.camera.aspect);
  const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.05;
  const target = new THREE.Vector3(0, h / 2, 0);
  view.controls.target.copy(target);
  view.camera.position.copy(target).add(new THREE.Vector3(...({ iso: [-0.55, 0.62, 0.95], top: [0, 1, 0.0001], front: [0, 0, 1], side: [1, 0, 0] }[name] || [-0.55, 0.62, 0.95])).normalize().multiplyScalar(distance));
  view.controls.update();
}

/* ── build + report ───────────────────────────────────────────────────── */

let pending = 0;
function schedule() {
  clearTimeout(pending);
  [el.stl, el.glb, el.obj, el.partStls].forEach((b) => { b.disabled = true; });
  el.readiness.textContent = 'Updating your model…';
  el.checkLabel.textContent = 'Updating print checks…';
  el.status.textContent = 'Updating model…';
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
  const bad = result.verdicts.filter((v) => v.tone === 'bad').length;
  const warn = result.verdicts.filter((v) => v.tone === 'warn').length;
  const failed = result.error || !result.bodies.length;
  el.summary.dataset.tone = failed || bad ? 'bad' : warn ? 'warn' : 'ok';
  const summary = failed ? 'Model unavailable — review the checks' : bad ? `${bad} issue${bad === 1 ? '' : 's'} to fix before printing` : warn ? `${warn} note${warn === 1 ? '' : 's'} to review before printing` : 'Print checks passed';
  el.checkLabel.textContent = summary;
  el.checkCount.textContent = bad + warn || '';
  el.readiness.textContent = failed ? 'Adjust your design before exporting.' : bad || warn ? `${summary}. You can export, but review the Checks tab first.` : 'Print checks passed. Export your model, then review it in your slicer.';
  el.quickStats.textContent = result.stats.filter((s) => ['Print size', 'PLA', 'Print time'].includes(s.label)).map((s) => `${s.label}: ${s.value}`).join(' · ');
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
  notify(`Saved ${slug()}.stl — ${result.bodies.length} part${result.bodies.length > 1 ? 's' : ''} on one plate.` + (red ? ` ${red} red check${red > 1 ? 's' : ''} still showing: review the Checks tab before printing.` : ' Slice at ' + state.settings.layer + ' mm layers.'));
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
  notify(`Saved ${names.join(' and ')}. Load them together and they land exactly where they sat on the plate.`);
}

function gameBodies() {
  return result.bodies.map((b) => ({ name: b.name, color: state.color, positions: placeOnBed(b.positions) }));
}

function exportGlb() {
  if (!result?.bodies.length) return;
  download(writeGlb(gameBodies()), `${slug()}.glb`, 'model/gltf-binary');
  notify(`Saved ${slug()}.glb — each part is its own object, base at the origin, real size in metres.`);
}

function exportObj() {
  if (!result?.bodies.length) return;
  download(writeObj(gameBodies(), { comment: `${slug()} — ClassroomOS Forge` }), `${slug()}.obj`, 'text/plain');
  notify(`Saved ${slug()}.obj (metres, Y-up).`);
}

function saveProject() {
  const project = {
    format: FORMAT, version: 1, name: state.name, part: state.part,
    params: currentParams(), settings: state.settings, color: state.color, savedAt: new Date().toISOString(),
  };
  download(JSON.stringify(project, null, 2), `${slug()}.forge.json`, 'application/json');
  notify(`Saved ${slug()}.forge.json — open it here any time to keep working.`);
}

async function openProject(file) {
  try {
    const project = JSON.parse(await file.text());
    if (project?.format !== FORMAT || !partById(project.part)) throw new Error('not a Forge project');
    const params = resolveParams(partById(project.part), project.params && typeof project.params === 'object' ? project.params : {});
    const settings = { ...DEFAULT_SETTINGS, ...pickSettings(project.settings) };
    checkpoint();
    state.part = project.part;
    state.params[project.part] = params;
    state.settings = settings;
    if (COLORS.some((c) => c.value === project.color)) state.color = project.color;
    state.name = typeof project.name === 'string' ? project.name.slice(0, 40) : '';
    persist(); syncSettings(); selectPart(state.part);
    notify(`Opened ${file.name}.`);
  } catch (error) {
    notify(`${file.name} is not a Forge project file (.forge.json).`);
  }
}

function pickSettings(s = {}) {
  if (!s || typeof s !== 'object') s = {};
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
  el.name.addEventListener('input', () => { checkpoint('name'); state.name = el.name.value; persist(); });
  el.search.addEventListener('input', filterLibrary);
  $('forge-search-clear').addEventListener('click', () => { el.search.value = ''; filterLibrary(); el.search.focus(); });
  el.undo.addEventListener('click', () => travelHistory(past, future));
  el.redo.addEventListener('click', () => travelHistory(future, past));
  $('forge-reset-design').addEventListener('click', () => {
    checkpoint(); delete state.params[state.part]; persist(); renderControls(); schedule();
    notify('Starting dimensions restored. Use Undo to bring back your edits.');
  });
  const tabs = [...document.querySelectorAll('.forge-tabs [role="tab"]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab.id.replace('forge-tab-', '')));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault(); activateTab(tabs[next].id.replace('forge-tab-', ''), true);
    });
  });
  const showPanel = (name) => {
    activateTab(name, true);
    if (window.matchMedia('(max-width: 620px)').matches) $(`forge-tab-${name}`).scrollIntoView({ block: 'start', behavior: reduceMotion ? 'instant' : 'smooth' });
  };
  $('forge-export-open').addEventListener('click', () => showPanel('export'));
  el.summary.addEventListener('click', () => showPanel('checks'));
  $('forge-save-export').addEventListener('click', saveProject);
  const dialog = $('forge-help-dialog');
  $('forge-help').addEventListener('click', () => dialog.showModal());
  $('forge-help-close').addEventListener('click', () => dialog.close());
  document.querySelectorAll('[data-camera]').forEach((b) => b.addEventListener('click', () => frame(b.dataset.camera)));
  el.canvas.addEventListener('keydown', (event) => {
    if (!view || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '='].includes(event.key)) return;
    event.preventDefault();
    const offset = view.camera.position.clone().sub(view.controls.target);
    if (['+', '-', '='].includes(event.key)) offset.multiplyScalar(event.key === '-' ? 1.15 : 1 / 1.15);
    else {
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += event.key === 'ArrowLeft' ? -.15 : event.key === 'ArrowRight' ? .15 : 0;
      spherical.phi += event.key === 'ArrowUp' ? -.15 : event.key === 'ArrowDown' ? .15 : 0;
      spherical.makeSafe(); offset.setFromSpherical(spherical);
    }
    view.camera.position.copy(view.controls.target).add(offset); view.controls.update(); setCameraButtons(null);
  });
  document.addEventListener('keydown', (event) => {
    if (dialog.open) return;
    const typing = event.target.closest('input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), select, textarea, [contenteditable="true"]');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveProject(); }
    if (typing) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? travelHistory(future, past) : travelHistory(past, future); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); travelHistory(future, past); }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'f') { event.preventDefault(); frame(); }
  });
  $('forge-library-disclosure').open = !window.matchMedia('(max-width: 900px)').matches;
  persist();
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
    el.status.hidden = false;
    el.status.textContent = 'The geometry engine could not start. Reload to try again.';
    el.checkLabel.textContent = 'Forge could not start. Reload to try again.';
    el.readiness.textContent = 'The geometry engine is unavailable. Reload to try again.';
    console.error(error);
    return;
  }
  rebuild();
  if (reduceMotion && view) view.controls.enableDamping = false;
}

start();
