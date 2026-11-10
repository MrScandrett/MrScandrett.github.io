/* print-prep.mjs — the Print Prep page: open any mesh, choose which way up it
 * prints, export it for the slicer. The maths lives in print-orient.mjs and
 * the file reading in mesh-import.mjs; this file is only the page.
 */

import { THREE, OrbitControls } from '../vendor/three-bundle.min.js';
import { createScene } from './sim-kit-three.mjs';
import { DEFAULT_PRINTER, edgeReport, write3mf, writeBinaryStl } from './fab-io.mjs';
import { UNIT_NAMES, readMesh, toMillimetres } from './mesh-import.mjs';
import { IDENTITY, analyze, axisRotation, coplanarMask, layFlat, multiply, orient, partVolume, rankOrientations, samplePart, tidy } from './print-orient.mjs';

const $ = (id) => document.getElementById(id);
const el = {
  file: $('pp-file'), title: $('pp-title'), canvas: $('pp-canvas'), status: $('pp-status'), nogl: $('pp-nogl'), empty: $('pp-empty'), drop: $('pp-drop'),
  input: $('pp-file-input'), open: $('pp-open'), open2: $('pp-open-2'), sample: $('pp-sample'), undo: $('pp-undo'), redo: $('pp-redo'), fit: $('pp-fit'),
  units: $('pp-units'), scale: $('pp-scale'), unitsNote: $('pp-units-note'), size: $('pp-size'), partInfo: $('pp-part-info'),
  best: $('pp-best'), options: $('pp-options'), step: $('pp-step'), reset: $('pp-reset'), angle: $('pp-angle'), angleOut: $('pp-angle-out'),
  verdicts: $('pp-verdicts'), stl: $('pp-dl-stl'), stlTop: $('pp-dl-stl-top'), threemf: $('pp-dl-3mf'), pick: $('pp-pick'),
  help: $('pp-help'), helpDialog: $('pp-help-dialog'), helpClose: $('pp-help-close'), toast: $('pp-toast'),
};

const COLORS = { base: new THREE.Color('#e8792a'), overhang: new THREE.Color('#e0362c'), bridge: new THREE.Color('#f0a530'), contact: new THREE.Color('#36c28f'), hover: new THREE.Color('#4aa3ff') };

/* ── state ────────────────────────────────────────────────────────────── */

let model = null;     // { name, raw (file units, Z up), format, parts, warnings, unitGuess, edges }
let state = { unit: 'mm', scale: 100, R: IDENTITY };
let placed = null;    // current soup on the bed, mm
let report = null;    // analyze(placed)
let ranking = null;   // { results, R0 } from the last "Find the best side"
const undoStack = [], redoStack = [];

const mm = () => toMillimetres(model.raw, state.unit);
let mmCache = null;
function source() {
  if (!mmCache || mmCache.unit !== state.unit) mmCache = { unit: state.unit, positions: mm() };
  return mmCache.positions;
}

function commit(next, { keepRanking = false } = {}) {
  undoStack.push(state);
  if (undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
  state = { ...state, ...next };
  if (!keepRanking) clearRanking();
  update();
}

function undo() { if (!undoStack.length) return; redoStack.push(state); state = undoStack.pop(); syncInputs(); update(); }
function redo() { if (!redoStack.length) return; undoStack.push(state); state = redoStack.pop(); syncInputs(); update(); }

/* ── opening files ────────────────────────────────────────────────────── */

async function openBytes(bytes, name) {
  say(`Reading ${name}…`);
  try {
    const r = await readMesh(bytes, name);
    model = { name, raw: r.positions, format: r.format, parts: r.parts, warnings: r.warnings, unitGuess: r.units, edges: null };
    mmCache = null;
    undoStack.length = redoStack.length = 0;
    state = { unit: r.units.unit, scale: 100, R: IDENTITY };
    clearRanking();
    syncInputs();
    update({ frame: true });
    el.empty.hidden = true;
    [el.units, el.scale, el.best, el.reset, ...document.querySelectorAll('[data-rotate]')].forEach((b) => { b.disabled = false; });
    setTimeout(checkEdges, 30);
    if (r.warnings.length) toast(r.warnings.join(' '));
    hideStatus();
  } catch (err) {
    say(err.message || 'That file could not be read.', true);
  }
}

async function openFile(file) {
  if (!file) return;
  if (file.size > 300 * 1024 * 1024) { say('That file is over 300 MB. Simplify it in its own app first.', true); return; }
  await openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
}

function checkEdges() {
  if (!model) return;
  const target = model;
  const e = edgeReport(source(), 1e-4);
  if (target === model) { model.edges = e; renderVerdicts(); }
}

/* ── recompute + draw ─────────────────────────────────────────────────── */

let pending = 0;
function update({ frame = false } = {}) {
  if (!model) return;
  placed = orient(source(), state.R, state.scale / 100);
  report = analyze(placed, { limitDeg: +el.angle.value });
  model.volume = partVolume(placed);
  showMesh();
  if (frame) frameView('iso');
  renderInfo();
  renderVerdicts();
  markOptions();
  el.undo.disabled = !undoStack.length;
  el.redo.disabled = !redoStack.length;
  [el.stl, el.stlTop, el.threemf].forEach((b) => { b.disabled = false; });
  cancelAnimationFrame(pending);
}

const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString(undefined, { maximumFractionDigits: d });
const cm3 = (v) => (v / 1000 < 0.1 ? '<0.1' : fmt(v / 1000, 1));

function renderInfo() {
  const parts = model.parts.length > 1 ? ` · ${model.parts.length} parts` : '';
  el.file.textContent = model.name;
  el.title.textContent = model.parts.length === 1 && model.parts[0].name && model.parts[0].name !== 'Model' ? model.parts[0].name : model.name.replace(/\.[^.]+$/, '');
  el.partInfo.textContent = `${model.format.toUpperCase()} · ${(model.raw.length / 9).toLocaleString()} triangles${parts}`;
  const g = model.unitGuess;
  el.unitsNote.textContent = state.unit === g.unit ? g.reason : `You chose ${UNIT_NAMES[state.unit]}. ${g.certain ? 'The file itself says ' + UNIT_NAMES[g.unit] + '.' : ''}`.trim();
  const [x, y, z] = report.size;
  el.size.textContent = `${fmt(x)} × ${fmt(y)} × ${fmt(z)} mm`;
  const summary = verdicts().map((v) => `${v.tag}: ${v.text}`).join(' ');
  el.canvas.setAttribute('aria-label', `${el.title.textContent} on the print bed, ${fmt(x)} by ${fmt(y)} mm and ${fmt(z)} mm tall. ${summary}`);
}

function verdicts() {
  const out = [];
  const r = report;
  const printer = DEFAULT_PRINTER;
  if (r.fit.fits) out.push({ tone: 'ok', tag: 'FITS', text: r.fit.turned ? `Fits the ${printer.name} if you spin it 90° on the bed (Z).` : `Fits the ${printer.name} bed.` });
  else out.push({ tone: 'bad', tag: 'TOO BIG', text: `Over the ${printer.build.x} × ${printer.build.y} × ${printer.build.z} mm build area by ${r.fit.overBy.map((v) => fmt(v)).join(' × ')} mm. Try lying it down, or scale it.` });
  const [x, y, z] = r.size;
  if (Math.max(x, y, z) < 3) out.push({ tone: 'bad', tag: 'TINY', text: 'Under 3 mm across. Was the file saved in metres or inches? Change File units.' });
  if (r.supportVolume < 1 && r.overhangArea < 4) out.push({ tone: 'ok', tag: 'NO SUPPORTS', text: r.bridgeArea > 1 ? 'Nothing past the overhang limit. The amber faces are short bridges the printer spans in mid-air.' : 'Nothing past the overhang limit. Print with supports off.' });
  else out.push({ tone: r.supportVolume > 0.15 * Math.max(model.volume, 1) ? 'bad' : 'warn', tag: 'SUPPORTS', text: `About ${cm3(r.supportVolume)} cm³ of support under ${fmt(r.overhangArea / 100)} cm² of red overhang (the part itself is ${cm3(model.volume)} cm³; the Under view shows them). Turn supports on, or find a better side.` });
  const reference = Math.max(model.volume, 1) ** (2 / 3);
  if (r.contactArea < 1) out.push({ tone: 'bad', tag: 'NOT ON THE BED', text: 'Only a point or edge touches the bed. Lay a flat face down, or add a brim or raft in the slicer.' });
  else if (r.contactArea < 0.25 * reference) out.push({ tone: 'warn', tag: 'SMALL FOOT', text: `${fmt(r.contactArea)} mm² touches the bed. A tall part on a small foot can tip or let go: add a brim.` });
  else out.push({ tone: 'ok', tag: 'ON THE BED', text: `${fmt(r.contactArea)} mm² flat on the bed (green from underneath).` });
  if (z > 0) out.push({ tone: 'ok', tag: 'HEIGHT', text: `${fmt(z)} mm tall: about ${Math.ceil(z / 0.2).toLocaleString()} layers at 0.2 mm.` });
  if (model.edges) {
    const e = model.edges;
    if (e.watertight) out.push({ tone: 'ok', tag: 'CLOSED', text: 'Every edge is shared by exactly two faces: a solid the slicer can trust.' });
    else out.push({ tone: 'warn', tag: 'OPEN MESH', text: [e.openEdges && `${e.openEdges.toLocaleString()} open edges (holes)`, e.overusedEdges && `${e.overusedEdges.toLocaleString()} edges shared by 3+ faces`, e.flippedEdges && `${e.flippedEdges.toLocaleString()} flipped faces`].filter(Boolean).join(', ') + '. Most slicers repair this, but check the preview.' });
  } else out.push({ tone: 'ok', tag: 'CHECKING', text: 'Checking the mesh is closed…' });
  return out;
}

function renderVerdicts() {
  if (!report) return;
  el.verdicts.replaceChildren(...verdicts().map((v) => {
    const li = document.createElement('li');
    li.className = v.tone;
    const tag = document.createElement('span');
    tag.className = 'pp-tag';
    tag.textContent = v.tag;
    const text = document.createElement('span');
    text.textContent = v.text;
    li.append(tag, text);
    return li;
  }));
}

/* ── best side ────────────────────────────────────────────────────────── */

function clearRanking() { ranking = null; el.options.replaceChildren(); }

async function findBest() {
  if (!model) return;
  el.best.disabled = true;
  say('Trying each side face down…');
  const base = orient(source(), IDENTITY, state.scale / 100);
  const { results } = await rankOrientations(base, {
    limitDeg: +el.angle.value,
    onProgress: (k, n) => say(`Trying side ${k} of ${n}…`),
    pause: () => new Promise((r) => setTimeout(r, 0)),
  });
  // keep the distinct winners: different heights or supports, not the same pose spun around
  const shown = [];
  for (const r of results) {
    if (shown.length && (r.contactArea < 1 || !r.fit.fits)) continue; // balanced on an edge or too big: never a suggestion
    if (shown.some((s) => Math.abs(s.cost - r.cost) <= 1e-6 * Math.max(1, Math.abs(s.cost)) && Math.abs(s.height - r.height) < 0.01)) continue;
    shown.push(r);
    if (shown.length === 4) break;
  }
  ranking = shown;
  el.options.replaceChildren(...shown.map((r, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pp-option';
    b.dataset.index = i;
    const supports = r.supportVolume < 1 && r.overhangArea < 4 ? 'No supports' : `${cm3(r.supportVolume)} cm³ support`;
    const fit = r.fit.fits ? '' : ' · too big';
    b.innerHTML = `<strong>${i + 1}</strong><span><b>${i === 0 ? 'Best: ' : ''}${supports}</b>${fit}</span><small>${fmt(r.contactArea)} mm² on the bed · ${fmt(r.height)} mm tall</small>`;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => commit({ R: r.R }, { keepRanking: true }));
    li.append(b);
    return li;
  }));
  el.best.disabled = false;
  hideStatus();
  commit({ R: shown[0].R }, { keepRanking: true });
  toast(shown[0].supportVolume < 1 ? 'Laid on its best side: no supports needed.' : 'Laid on the side that needs the least support.');
}

function markOptions() {
  if (!ranking) return;
  el.options.querySelectorAll('.pp-option').forEach((b) => {
    const R = ranking[+b.dataset.index].R;
    b.setAttribute('aria-pressed', String(R.every((v, k) => Math.abs(v - state.R[k]) < 1e-9)));
  });
}

/* ── 3D view ──────────────────────────────────────────────────────────── */

let view = null;
function setupView() {
  try {
    const { scene, camera, renderer, syncSize } = createScene(el.canvas, { THREE, fov: 35, near: 1, far: 8000, clearColor: 0x1d2228 });
    const controls = new OrbitControls(camera, el.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x30363d, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-120, 260, 180);
    scene.add(key);
    const under = new THREE.DirectionalLight(0xffffff, 0.8);
    under.position.set(60, -200, 80);
    scene.add(under);
    const root = new THREE.Group();
    root.rotation.x = -Math.PI / 2; // printer Z-up → Three Y-up
    scene.add(root);
    const { x: bx, y: by, z: bz } = DEFAULT_PRINTER.build;
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(bx, by), new THREE.MeshStandardMaterial({ color: 0x2c333b, roughness: 0.95, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    bed.position.z = -0.3;
    root.add(bed);
    const grid = new THREE.GridHelper(Math.max(bx, by), Math.max(bx, by) / 10, 0x58626e, 0x3a424c);
    grid.rotation.x = Math.PI / 2;
    grid.scale.set(bx / Math.max(bx, by), 1, by / Math.max(bx, by));
    grid.position.z = -0.25;
    root.add(grid);
    const volume = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bx, by, bz)), new THREE.LineBasicMaterial({ color: 0x8fb4d8, transparent: true, opacity: 0.45 }));
    volume.position.z = bz / 2;
    root.add(volume);
    const parts = new THREE.Group();
    root.add(parts);
    view = { scene, camera, renderer, syncSize, controls, parts, volume, root };
    controls.addEventListener('start', () => setCameraButtons(null));
    syncSize();
    window.SimKit.loop(() => {
      controls.update();
      syncSize();
      renderer.render(scene, camera);
    }, { el: window.SimKit.stage ? window.SimKit.stage(el.canvas) : el.canvas });
    setupPicking();
  } catch (error) {
    view = null;
    el.canvas.hidden = true;
    el.nogl.hidden = false;
  }
}

let mesh = null, hoverMask = null;
function showMesh() {
  if (!view) return;
  if (mesh) { mesh.geometry.dispose(); view.parts.remove(mesh); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(placed, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(placed.length), 3));
  geometry.computeVertexNormals();
  mesh = new THREE.Mesh(geometry, mesh?.material || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.02, flatShading: true, side: THREE.DoubleSide }));
  view.parts.add(mesh);
  hoverMask = null;
  view.volume.material.color.set(report.fit.fits ? 0x8fb4d8 : 0xff6b5e);
  view.volume.material.opacity = report.fit.fits ? 0.45 : 0.9;
  paint();
}

function paint() {
  if (!mesh) return;
  const colors = mesh.geometry.getAttribute('color');
  const { mask, contact } = report;
  for (let t = 0; t < mask.length; t++) {
    const c = hoverMask?.[t] ? COLORS.hover : contact[t] ? COLORS.contact : mask[t] === 1 ? COLORS.overhang : mask[t] === 2 ? COLORS.bridge : COLORS.base;
    for (let k = 0; k < 3; k++) colors.setXYZ(t * 3 + k, c.r, c.g, c.b);
  }
  colors.needsUpdate = true;
}

function setupPicking() {
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null, hoverFrame = 0, hovered = -1;
  const hit = (e) => {
    if (!mesh) return -1;
    const rect = el.canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(pointer, view.camera);
    const [first] = ray.intersectObject(mesh, false);
    return first ? first.faceIndex : -1;
  };
  const setHover = (t) => {
    if (t === hovered) return;
    hovered = t;
    hoverMask = t >= 0 && el.pick.checked && placed.length / 9 <= 400000 ? coplanarMask(placed, t) : null;
    el.canvas.classList.toggle('pp-picking', t >= 0 && el.pick.checked);
    paint();
  };
  el.canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button }; });
  el.canvas.addEventListener('pointerup', (e) => {
    if (!down || !el.pick.checked || down.button !== 0) { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 600;
    down = null;
    if (moved > 5 || !quick) return;
    const t = hit(e);
    if (t < 0) return;
    commit({ R: tidy(layFlat(placed, t, state.R)) });
    hovered = -2;
    toast('That face is on the bed now. Undo (Ctrl/⌘ Z) to go back.');
  });
  el.canvas.addEventListener('pointermove', (e) => {
    if (e.buttons || e.pointerType === 'touch') return;
    cancelAnimationFrame(hoverFrame);
    hoverFrame = requestAnimationFrame(() => setHover(hit(e)));
  });
  el.canvas.addEventListener('pointerleave', () => setHover(-1));
  el.pick.addEventListener('change', () => setHover(-1));
}

function setCameraButtons(name) {
  document.querySelectorAll('[data-camera]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.camera === name)));
}
let cameraView = 'iso';
function frameView(name = cameraView) {
  cameraView = name;
  setCameraButtons(name);
  if (!view) return;
  view.syncSize();
  const [w, d, h] = report ? report.size : [DEFAULT_PRINTER.build.x, DEFAULT_PRINTER.build.y, 40];
  const radius = Math.max(Math.hypot(w, d, h) / 2, 25);
  const vFov = (view.camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * view.camera.aspect);
  const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.05;
  const target = new THREE.Vector3(0, h / 2, 0);
  const dir = { iso: [-0.55, 0.62, 0.95], top: [0, 1, 0.0001], front: [0, 0, 1], side: [1, 0, 0], under: [0.0001, -1, 0.35] }[name] || [-0.55, 0.62, 0.95];
  view.controls.target.copy(target);
  view.camera.position.copy(target).add(new THREE.Vector3(...dir).normalize().multiplyScalar(distance));
  view.camera.far = Math.max(8000, distance * 4);
  view.camera.updateProjectionMatrix();
  view.controls.update();
}

/* ── export ───────────────────────────────────────────────────────────── */

function baseName() { return (model?.name || 'part').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 60) || 'part'; }

function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function exportStl() {
  if (!placed) return;
  download(`${baseName()}-print.stl`, writeBinaryStl(placed, 'ClassroomOS Print Prep: mm, Z up'), 'model/stl');
  toast(`STL downloaded: ${el.size.textContent}. Open it in your slicer.`);
}

function export3mf() {
  if (!placed) return;
  const bodies = model.parts.length > 1
    ? model.parts.map((p) => ({ name: p.name, positions: placed.subarray(p.start * 9, (p.start + p.count) * 9) }))
    : [{ name: el.title.textContent || baseName(), positions: placed }];
  download(`${baseName()}-print.3mf`, write3mf(bodies, { title: el.title.textContent, application: 'ClassroomOS Print Prep' }), 'model/3mf');
  toast(`3MF downloaded, in millimetres${bodies.length > 1 ? `, with ${bodies.length} separate parts` : ''}.`);
}

/* ── small UI helpers ─────────────────────────────────────────────────── */

function say(text, bad = false) { el.status.textContent = text; el.status.hidden = false; el.status.dataset.tone = bad ? 'bad' : ''; }
function hideStatus() { el.status.hidden = true; }
let toastTimer = 0;
function toast(text) {
  el.toast.textContent = text;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 4200);
}
function syncInputs() { el.units.value = state.unit; el.scale.value = String(state.scale); }

/* ── wiring ───────────────────────────────────────────────────────────── */

const pickFile = () => el.input.click();
el.open.addEventListener('click', pickFile);
el.open2.addEventListener('click', pickFile);
el.input.addEventListener('change', () => { const f = el.input.files[0]; el.input.value = ''; openFile(f); });
el.sample.addEventListener('click', () => openBytes(new Uint8Array(writeBinaryStl(samplePart(), 'solid L-bracket')), 'sample-bracket.stl'));
el.undo.addEventListener('click', undo);
el.redo.addEventListener('click', redo);
el.fit.addEventListener('click', () => frameView());
el.best.addEventListener('click', findBest);
el.reset.addEventListener('click', () => commit({ R: IDENTITY }));
el.units.addEventListener('change', () => commit({ unit: el.units.value }));
el.scale.addEventListener('change', () => {
  const v = Math.min(10000, Math.max(1, +el.scale.value || 100));
  el.scale.value = String(v);
  if (v !== state.scale) commit({ scale: v });
});
el.angle.addEventListener('input', () => {
  el.angleOut.textContent = `${el.angle.value}°`;
  clearRanking();
  if (model) update();
});
document.querySelectorAll('[data-rotate]').forEach((b) => b.addEventListener('click', () => {
  const turn = axisRotation(b.dataset.rotate, +b.dataset.dir * +el.step.value);
  commit({ R: tidy(multiply(turn, state.R)) });
}));
document.querySelectorAll('[data-camera]').forEach((b) => b.addEventListener('click', () => frameView(b.dataset.camera)));
el.stl.addEventListener('click', exportStl);
el.stlTop.addEventListener('click', exportStl);
el.threemf.addEventListener('click', export3mf);
el.help.addEventListener('click', () => el.helpDialog.showModal());
el.helpClose.addEventListener('click', () => el.helpDialog.close());

// drag and drop anywhere on the stage
for (const type of ['dragenter', 'dragover']) el.drop.addEventListener(type, (e) => { e.preventDefault(); el.drop.classList.add('pp-dragging'); });
el.drop.addEventListener('dragleave', (e) => { if (!el.drop.contains(e.relatedTarget)) el.drop.classList.remove('pp-dragging'); });
el.drop.addEventListener('drop', (e) => {
  e.preventDefault();
  el.drop.classList.remove('pp-dragging');
  openFile(e.dataTransfer?.files?.[0]);
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, dialog')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  else if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); pickFile(); }
  else if (!mod && !e.altKey && (e.key === 'f' || e.key === 'F')) frameView();
});

setupView();
frameView('iso');

// ?model=assets/models/x.stl opens a file from this site (lessons link to their own examples); ?sample opens the bracket.
const params = new URLSearchParams(location.search);
if (params.has('model')) {
  try {
    const url = new URL(params.get('model'), location.href);
    if (url.origin !== location.origin) throw new Error('Print Prep only opens models from this site by link. Download it and use Open.');
    say('Loading model…');
    fetch(url).then((r) => { if (!r.ok) throw new Error(`Could not load ${url.pathname} (${r.status}).`); return r.arrayBuffer(); })
      .then((b) => openBytes(new Uint8Array(b), decodeURIComponent(url.pathname.split('/').pop() || 'model.stl')))
      .catch((err) => say(err.message, true));
  } catch (err) { say(err.message, true); }
} else if (params.has('sample')) el.sample.click();
