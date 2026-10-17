/* workbench.mjs — the Workbench page (workbench.html).
 *
 * Students build anything from shapes: drop them in, turn some into holes,
 * group and pattern them, animate them, then print the result or take it into
 * a game engine. Geometry runs on Forge's Manifold engine (engine.mjs), the
 * project model and evaluation live in model.mjs (tested under node), and
 * this file wires them to the page. Work autosaves in this browser under one
 * localStorage key, and saves out as a .workbench.json file.
 */

import ManifoldModule from '../../vendor/manifold/manifold.js';
import { concat, createEngine } from '../forge/engine.mjs';
import { bounds as soupBounds, prepareForPrint, writeBinaryStl, writeObj } from '../fab-io.mjs';
import { SHAPES, SHAPE_GROUPS, shapeById } from './shapes.mjs';
import * as W from './model.mjs';
import { BLANKS, REALMS, TEMPLATES, finishTemplate, templateById } from './templates.mjs';
import { createThumbnailer, createView } from './view.mjs';
import { worldBodies, writeAnimatedGlb } from './export.mjs';
import { openSketch } from './sketch.mjs';

const STORE_KEY = 'classroomos:workbench:v1';
const PALETTE = [
  ['#e8792a', 'Orange'], ['#2f6fd6', 'Blue'], ['#2f9e5a', 'Green'], ['#d6403a', 'Red'], ['#f2c230', 'Yellow'], ['#8a5cd0', 'Purple'],
  ['#f2f0ea', 'White'], ['#2b2b2e', 'Black'], ['#9aa3ad', 'Grey'], ['#8a5a2b', 'Wood'], ['#d9a521', 'Gold'], ['#2b8a8a', 'Teal'],
];
const PIVOTS = [
  ['centre', 'Centre'], ['bottom', 'Bottom middle'], ['top', 'Top middle'], ['left', 'Left side'], ['right', 'Right side'],
  ['front', 'Front side'], ['back', 'Back side'], ['back-bottom', 'Back bottom edge (hinge)'], ['front-bottom', 'Front bottom edge'], ['custom', 'Custom point'],
];

const $ = (id) => document.getElementById(id);
const el = {
  name: $('wb-name'), preset: $('wb-preset'), canvas: $('wb-canvas'), status: $('wb-status'), nogl: $('wb-nogl'), legend: $('wb-legend'),
  shapes: $('wb-shapes'), search: $('wb-search'), templates: $('wb-templates'), libTabs: document.querySelectorAll('[data-lib-tab]'),
  libPanels: { shapes: $('wb-lib-shapes'), start: $('wb-lib-start') },
  modeTabs: document.querySelectorAll('[data-mode]'), panels: { build: $('wb-panel-build'), animate: $('wb-panel-animate'), export: $('wb-panel-export') },
  inspector: $('wb-inspector'), tree: $('wb-tree'), count: $('wb-count'),
  tools: document.querySelectorAll('[data-tool]'), gizmoModes: document.querySelectorAll('[data-gizmo]'), snap: $('wb-snap'), views: document.querySelectorAll('[data-view]'),
  timeline: $('wb-timeline'), play: $('wb-play'), scrub: $('wb-scrub'), time: $('wb-time'), lanes: $('wb-lanes'),
  animate: $('wb-animate'), duration: $('wb-duration'), loop: $('wb-loop'),
  arrange: $('wb-arrange'), printScale: $('wb-print-scale'), printScaleRow: $('wb-print-scale-row'), printView: $('wb-print-view'),
  verdicts: $('wb-verdicts'), stats: $('wb-stats'), stl: $('wb-dl-stl'), stlParts: $('wb-dl-parts'), glb: $('wb-dl-glb'), obj: $('wb-dl-obj'), png: $('wb-dl-png'),
  save: $('wb-save'), open: $('wb-open'), openFile: $('wb-open-file'), note: $('wb-note'), sketch: $('wb-sketch'), undo: $('wb-undo'), redo: $('wb-redo'),
};

/* ── state ────────────────────────────────────────────────────────────── */

let project = loadProject();
let selection = [];
let mode = 'build';
let gizmoMode = 'translate';
let time = 0;
let playing = false;
let engine = null;
let view = null;
let result = null;
let printResult = null;
let colorTurn = 0;
const cache = W.createShapeCache();
const noise = window.SimKit?.noise;
const undoLog = { past: [], future: [], now: JSON.stringify(project) };

function loadProject() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (raw) return W.validateProject(raw);
  } catch { /* fall through to a fresh project */ }
  return W.freshProject('print');
}

let persistTimer = 0;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, undoLog.now); } catch { /* private window: the page still works */ }
  }, 250);
}

/* Call after every finished change: one undo step each. */
function commit() {
  const now = JSON.stringify(project);
  if (now === undoLog.now) return;
  undoLog.past.push(undoLog.now);
  if (undoLog.past.length > 80) undoLog.past.shift();
  undoLog.future = [];
  undoLog.now = now;
  persist();
  refreshUndo();
}

function undo() { stepHistory(undoLog.past, undoLog.future, 'Undid the last change.'); }
function redo() { stepHistory(undoLog.future, undoLog.past, 'Redid it.'); }
function stepHistory(from, to, message) {
  if (!from.length) return;
  to.push(undoLog.now);
  undoLog.now = from.pop();
  project = JSON.parse(undoLog.now);
  selection = selection.filter((id) => W.findNode(project, id));
  projectChanged();
  persist();
  refreshUndo();
  say(message);
}
function refreshUndo() { el.undo.disabled = !undoLog.past.length; el.redo.disabled = !undoLog.future.length; }

const preset = () => W.PRESETS[project.preset] || W.PRESETS.print;
const units = () => preset().units;
const fmt = (v, digits = 4) => String(Number(Number(v).toPrecision(digits)));
const snapStep = () => Number(el.snap.value) || 0;
const snapValue = (v) => { const s = snapStep(); return W.nice(s ? Math.round(v / s) * s : v); };
const say = (text) => { el.note.textContent = text; };
const nodeOf = (id) => W.findNode(project, id)?.node || null;

/* ── geometry ─────────────────────────────────────────────────────────── */

let buildTimer = 0, building = false, dirty = false;
function schedule(delay = 40) {
  dirty = true;
  if (!buildTimer) buildTimer = setTimeout(rebuild, delay);
}

function rebuild() {
  buildTimer = 0;
  if (!engine || building || !dirty) return;
  dirty = false;
  building = true;
  const started = performance.now();
  try {
    result = engine.scoped((ctx) => W.evaluate(ctx, project, { cache, noise }));
  } catch (error) {
    console.error(error);
    result = { pieces: [], ghosts: [], bounds: {}, solid: {}, sizes: {}, errors: [{ id: null, message: error.message }] };
  }
  building = false;
  view?.sync(project, result, poses());
  view?.select(selection, gizmoOptions());
  renderTree();
  renderErrors();
  const ms = Math.round(performance.now() - started);
  el.status.textContent = result.errors.length ? `${result.errors.length} shape${result.errors.length > 1 ? 's' : ''} need attention` : `Built in ${ms} ms`;
  el.status.classList.toggle('is-bad', result.errors.length > 0);
  el.canvas.setAttribute('aria-label', sceneSummary());
  refreshSize();
  if (mode === 'export') schedulePrint();
  if (dirty) schedule(10);
}

function sceneSummary() {
  const n = W.countNodes(project.objects);
  const sel = selection.map((id) => nodeOf(id)?.name).filter(Boolean);
  return `3D workspace with ${n} shape${n === 1 ? '' : 's'}${sel.length ? `. Selected: ${sel.join(', ')}` : ''}. Drag to orbit, scroll to zoom.`;
}

/* ── animation ────────────────────────────────────────────────────────── */

function poses() {
  if (mode !== 'animate') return null;
  const map = new Map();
  for (const [id, keys] of Object.entries(project.animation.tracks)) { const p = W.samplePose(keys, time); if (p) map.set(id, p); }
  return map;
}

function poseOf(node) {
  if (mode === 'animate') { const p = W.samplePose(project.animation.tracks[node.id], time); if (p) return p; }
  return { pos: node.pos, rot: node.rot, scale: node.scale };
}

function setTime(t) {
  const d = project.animation.duration;
  time = Math.max(0, Math.min(d, t));
  el.scrub.value = String(time);
  el.time.textContent = `${time.toFixed(2)} s / ${d.toFixed(2)} s`;
  view?.setPoses(project, poses());
  refreshTransformFields();
  renderLanes();
}

function setPlaying(on) {
  playing = on && Object.keys(project.animation.tracks).length > 0;
  el.play.textContent = playing ? 'Pause' : 'Play';
  el.play.setAttribute('aria-pressed', String(playing));
  view?.setGizmoVisible(!playing && mode !== 'export');
}

function tick(dt) {
  if (!playing) return;
  const d = project.animation.duration;
  let t = time + dt;
  if (t > d) { if (project.animation.loop) t %= d; else { t = d; setPlaying(false); } }
  setTime(t);
}

/* ── selection ────────────────────────────────────────────────────────── */

function gizmoOptions() {
  const id = selection.length === 1 && mode !== 'export' && !playing ? selection[0] : null;
  return { gizmoId: id, mode: gizmoMode, snap: { move: snapStep() || null, turn: snapStep() ? 15 : null, scale: snapStep() ? 0.05 : null } };
}

function select(ids) {
  selection = [...new Set(ids)].filter((id) => W.findNode(project, id));
  view?.select(selection, gizmoOptions());
  renderInspector();
  renderTree();
  renderAnimatePanel();
  el.canvas.setAttribute('aria-label', sceneSummary());
}

/* Ids from the top of the tree down to `id`. */
function ancestry(id) {
  const chain = [];
  const seek = (nodes, trail) => nodes.some((n) => (n.id === id ? (chain.push(...trail, n.id), true) : n.type === 'group' && seek(n.children, [...trail, n.id])));
  seek(project.objects, []);
  return chain;
}

/* The first click picks the whole top-level object; clicking it again steps
   one group deeper, down to the single shape. */
function onPick(leafId, { shift }) {
  if (!leafId) { if (!shift) select([]); return; }
  const chain = ancestry(leafId);
  const current = selection.length === 1 ? selection[0] : null;
  const i = chain.indexOf(current);
  const target = i >= 0 && i < chain.length - 1 ? chain[i + 1] : i === chain.length - 1 ? current : chain[0];
  if (shift) select(selection.includes(target) ? selection.filter((s) => s !== target) : [...selection, target]);
  else select([target]);
}

/* ── editing ──────────────────────────────────────────────────────────── */

function nextColor() { const c = PALETTE[colorTurn % 6][0]; colorTurn++; return c; }

function shapeSize(node) {
  try { return engine ? engine.scoped((ctx) => W.shapeSize(ctx, node, { cache, noise })) : [0, 0, 0]; } catch { return [0, 0, 0]; }
}

function addShape(shapeId, at) {
  if (W.countNodes(project.objects) >= W.MAX_NODES) { say(`A project holds up to ${W.MAX_NODES} shapes.`); return; }
  const node = W.newShapeNode(project, shapeId, { color: nextColor() });
  const [x, y] = at || view?.target() || [0, 0];
  const size = shapeSize(node);
  node.pos = [snapValue(x), snapValue(y), W.nice(size[2] / 2)];
  project.objects.push(node);
  if (mode === 'export') setMode('build');
  commit();
  schedule(0);
  select([node.id]);
  say(`Added ${shapeById(shapeId).name}. Drag the arrows to move it, or type exact numbers on the right.`);
}

/* Move a node by a world-space amount, whatever group it sits in. */
function moveWorld(node, delta) {
  const inv = W.invert(W.parentWorld(project, node.id));
  const d = W.applyVector(inv, delta);
  node.pos = node.pos.map((v, k) => W.nice(v + d[k]));
}

function topmost(ids) {
  // drop any id whose ancestor is also selected
  return ids.filter((id) => !ancestry(id).slice(0, -1).some((a) => ids.includes(a)));
}

const TOOLS = {
  undo, redo,
  delete() {
    const ids = topmost(selection);
    if (!ids.length) return;
    for (const id of ids) { const hit = W.findNode(project, id); if (hit) hit.list.splice(hit.index, 1); }
    W.pruneTracks(project);
    commit(); select([]); schedule(0);
    say(`Deleted ${ids.length} item${ids.length > 1 ? 's' : ''}. Undo brings ${ids.length > 1 ? 'them' : 'it'} back.`);
  },
  duplicate() {
    const ids = topmost(selection);
    if (!ids.length) return;
    const step = preset().major, made = [], taken = new Set();
    for (const id of ids) {
      const hit = W.findNode(project, id);
      const copy = W.cloneNode(project, hit.node, taken);
      copy.pos = copy.pos.map((v, k) => (k < 2 ? W.nice(v + step) : v));
      hit.list.splice(hit.list.indexOf(hit.node) + 1, 0, copy);
      W.cloneTracks(project, hit.node, copy);
      made.push(copy.id);
    }
    commit(); schedule(0); select(made);
    say('Duplicated. The copy sits one grid square over.');
  },
  group() {
    const ids = topmost(selection);
    if (ids.length < 2) { say('Select two or more things (Shift-click) to group them.'); return; }
    const lists = new Set(ids.map((id) => W.findNode(project, id).list));
    if (lists.size > 1) { say('Pick things from the same group to group them together.'); return; }
    const box = combinedBounds(ids, 'solid');
    const centreWorld = box.min.map((v, k) => (v + box.max[k]) / 2);
    const centre = W.applyPoint(W.invert(W.parentWorld(project, ids[0])), centreWorld);
    const group = W.groupNodes(project, ids, centre, 'Group');
    commit(); schedule(0); select([group.id]);
    say('Grouped. Holes inside a group cut only the shapes in that group.');
  },
  ungroup() {
    const groups = selection.map(nodeOf).filter((n) => n?.type === 'group');
    if (!groups.length) { say('Select a group to ungroup it.'); return; }
    const freed = groups.flatMap((g) => W.ungroup(project, g.id).map((c) => c.id));
    commit(); schedule(0); select(freed);
  },
  hole() {
    const nodes = topmost(selection).map(nodeOf).filter(Boolean);
    if (!nodes.length) return;
    const on = !nodes.every((n) => n.hole);
    nodes.forEach((n) => { n.hole = on; });
    commit(); schedule(0); renderInspector();
    say(on ? 'Now a hole: it cuts every solid in its group (or the whole scene at the top level).' : 'Now solid.');
  },
  mirror(axis = 0) {
    const nodes = topmost(selection).map(nodeOf).filter(Boolean);
    nodes.forEach((n) => { n.scale = n.scale.map((s, k) => (k === axis ? -s : s)); });
    commit(); schedule(0); renderInspector();
  },
  floor() {
    for (const id of topmost(selection)) {
      const b = result?.solid?.[id];
      if (b) moveWorld(nodeOf(id), [0, 0, -b.min[2]]);
    }
    commit(); schedule(0); refreshTransformFields();
  },
  frame() { view?.frame(selection.length ? combinedBounds(selection, 'solid') : result?.solidAll); },
};

function combinedBounds(ids, kind = 'bounds') {
  let box = null;
  for (const id of ids) {
    const b = result?.[kind]?.[id] || result?.bounds?.[id];
    if (!b) continue;
    box = box ? { min: box.min.map((v, k) => Math.min(v, b.min[k])), max: box.max.map((v, k) => Math.max(v, b.max[k])) } : { min: [...b.min], max: [...b.max] };
  }
  return box;
}

function align(axis, where) {
  const ids = topmost(selection);
  const all = combinedBounds(ids, 'solid');
  if (!all || ids.length < 2) return;
  const goal = where === 'min' ? all.min[axis] : where === 'max' ? all.max[axis] : (all.min[axis] + all.max[axis]) / 2;
  for (const id of ids) {
    const b = result.solid[id] || result.bounds[id];
    if (!b) continue;
    const now = where === 'min' ? b.min[axis] : where === 'max' ? b.max[axis] : (b.min[axis] + b.max[axis]) / 2;
    const delta = [0, 0, 0];
    delta[axis] = goal - now;
    moveWorld(nodeOf(id), delta);
  }
  commit(); schedule(0);
}

function nudge(axis, amount) {
  const ids = topmost(selection);
  if (!ids.length) return;
  for (const id of ids) {
    const delta = [0, 0, 0];
    delta[axis] = amount;
    moveWorld(nodeOf(id), delta);
  }
  schedule(0); refreshTransformFields(); commitSoon();
}
let commitTimer = 0;
function commitSoon() { clearTimeout(commitTimer); commitTimer = setTimeout(commit, 400); }

/* Gizmo dragged: write the object back into the project (or key it, when animating). */
function onGizmoChange(object) {
  const node = nodeOf(object.userData.id);
  if (!node) return;
  const pose = {
    pos: object.position.toArray().map(W.nice),
    rot: [object.rotation.x, object.rotation.y, object.rotation.z].map((r) => W.nice((r * 180) / Math.PI) || 0),
    scale: object.scale.toArray().map((s) => W.nice(Math.abs(s) < 1e-3 ? Math.sign(s || 1) * 1e-3 : s)),
  };
  if (mode === 'animate') W.setKey(project, node.id, time, pose);
  else Object.assign(node, pose);
  refreshTransformFields();
  schedule(70);
  if (mode === 'animate') renderLanes();
}

/* ── local bounds, for pivot presets ──────────────────────────────────── */

function localBounds(node) {
  if (node.type === 'shape') {
    const soup = result?.pieces.find((p) => p.id === node.id)?.local || result?.ghosts.find((g) => g.id === node.id)?.local;
    return soup ? soupBounds(soup) : null;
  }
  let box = null;
  for (const c of node.children) {
    if (c.hole) continue;
    const b = localBounds(c);
    if (!b) continue;
    const m = W.localMatrix(c);
    for (let i = 0; i < 8; i++) {
      const p = W.applyPoint(m, [i & 1 ? b.max[0] : b.min[0], i & 2 ? b.max[1] : b.min[1], i & 4 ? b.max[2] : b.min[2]]);
      box = box ? { min: box.min.map((v, k) => Math.min(v, p[k])), max: box.max.map((v, k) => Math.max(v, p[k])) } : { min: [...p], max: [...p] };
    }
  }
  return box;
}

function pivotPoint(node, kind) {
  const b = localBounds(node);
  if (!b) return null;
  const c = b.min.map((v, k) => (v + b.max[k]) / 2);
  const P = {
    centre: c, bottom: [c[0], c[1], b.min[2]], top: [c[0], c[1], b.max[2]], left: [b.min[0], c[1], c[2]], right: [b.max[0], c[1], c[2]],
    front: [c[0], b.min[1], c[2]], back: [c[0], b.max[1], c[2]], 'back-bottom': [c[0], b.max[1], b.min[2]], 'front-bottom': [c[0], b.min[1], b.min[2]],
  };
  return P[kind]?.map(W.nice) || null;
}

function currentPivotKind(node) {
  for (const [kind] of PIVOTS) {
    if (kind === 'custom') continue;
    const p = pivotPoint(node, kind);
    if (p && p.every((v, k) => Math.abs(v - node.pivot[k]) < 1e-6 * Math.max(1, preset().plane[0]))) return kind;
  }
  return node.pivot.every((v) => v === 0) ? (node.type === 'shape' ? 'centre' : 'custom') : 'custom';
}

/* ── inspector ────────────────────────────────────────────────────────── */

function h(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) n.append(c);
  return n;
}

let uid = 0;
const fieldId = () => `wb-f${++uid}`;

function numberRow(label, value, { min, max, step, unit, onInput, onCommit, help }) {
  const id = fieldId();
  const range = h('input', { type: 'range', min, max, step, value, 'aria-hidden': 'true', tabindex: '-1' });
  const num = h('input', { type: 'number', id, min, max, step: 'any', value: fmt(value), inputmode: 'decimal' });
  const set = (v, from) => {
    const n = Math.min(Number(max), Math.max(Number(min), Number(v)));
    if (!Number.isFinite(n)) return;
    if (from !== range) range.value = String(n);
    if (from !== num) num.value = fmt(n);
    onInput(n);
  };
  range.addEventListener('input', () => set(range.value, range));
  range.addEventListener('change', () => onCommit?.());
  num.addEventListener('input', () => { if (num.value !== '' && Number.isFinite(Number(num.value))) set(num.value, num); });
  num.addEventListener('change', () => { set(num.value, num); num.value = fmt(Math.min(Number(max), Math.max(Number(min), Number(num.value) || 0))); onCommit?.(); });
  return h('div', { class: 'wb-field' },
    h('div', { class: 'wb-field-top' }, h('label', { for: id, text: label }), unit ? h('span', { class: 'wb-unit', text: unit }) : null),
    h('div', { class: 'wb-field-pair' }, range, num),
    help ? h('p', { class: 'wb-help', text: help }) : null);
}

/* Three number boxes. Transform rows (pos/rot/scale) edit the selection and
   refresh live; give `onChange(axis, value)` for anything else. */
function vectorRow(label, values, unit, key, step, onChange) {
  const ids = ['x', 'y', 'z'];
  const inputs = values.map((v, k) => h('input', { type: 'number', step: 'any', value: fmt(v), 'aria-label': `${label} ${ids[k].toUpperCase()}`, dataset: onChange ? {} : { vec: key, axis: String(k) } }));
  inputs.forEach((input, k) => {
    input.addEventListener('change', () => {
      const n = Number(input.value);
      if (!Number.isFinite(n)) return;
      if (onChange) { onChange(k, n); return; }
      editTransform(key, k, key === 'scale' ? n / 100 : n);
      commit();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const s = (step || 1) * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
      input.value = fmt(Number(input.value) + s);
      input.dispatchEvent(new Event('change'));
    });
  });
  return h('div', { class: 'wb-field' },
    h('div', { class: 'wb-field-top' }, h('span', { class: 'wb-label', text: label }), h('span', { class: 'wb-unit', text: unit })),
    h('div', { class: 'wb-vec' }, ...inputs.map((input, k) => h('label', { class: `wb-axis wb-axis-${ids[k]}` }, h('span', { text: ids[k].toUpperCase() }), input))));
}

function editTransform(key, axis, value) {
  for (const id of selection.length === 1 ? selection : []) {
    const node = nodeOf(id);
    if (!node) continue;
    const pose = poseOf(node);
    const next = { pos: [...pose.pos], rot: [...pose.rot], scale: [...pose.scale] };
    next[key][axis] = key === 'scale' && Math.abs(value) < 1e-3 ? 1e-3 : W.nice(value);
    if (mode === 'animate') { W.setKey(project, id, time, next); renderLanes(); } else Object.assign(node, next);
  }
  schedule(0);
}

function refreshTransformFields() {
  if (selection.length !== 1) return;
  const node = nodeOf(selection[0]);
  if (!node) return;
  const pose = poseOf(node);
  el.inspector.querySelectorAll('[data-vec]').forEach((input) => {
    if (document.activeElement === input) return;
    const v = pose[input.dataset.vec][Number(input.dataset.axis)];
    input.value = fmt(input.dataset.vec === 'scale' ? v * 100 : v);
  });
  refreshSize();
}

function refreshSize() {
  const out = el.inspector.querySelector('[data-size]');
  if (!out || selection.length !== 1) return;
  const b = result?.solid?.[selection[0]] || result?.bounds?.[selection[0]];
  out.textContent = b ? `${b.max.map((v, k) => fmt(v - b.min[k], 3)).join(' × ')} ${units()}` : '—';
}

function colorPicker(node) {
  // a group shows a colour only when every solid in it already has it
  const colors = new Set();
  W.walk([node], (n) => { if (n.type === 'shape' && !n.hole) colors.add(n.color); });
  const shown = colors.size === 1 ? [...colors][0] : node.type === 'shape' ? node.color : null;
  const swatches = PALETTE.map(([value, label]) => h('button', {
    type: 'button', class: 'wb-swatch', title: label, 'aria-label': label, 'aria-pressed': String(shown === value), style: `--sw:${value}`,
    onclick: () => { paint(node, value); },
  }));
  const custom = h('input', { type: 'color', value: shown || [...colors][0] || node.color, 'aria-label': colors.size > 1 ? 'Custom colour (paints every part)' : 'Custom colour', oninput: (e) => paint(node, e.target.value, false), onchange: () => commit() });
  return h('div', { class: 'wb-field' }, h('span', { class: 'wb-label', text: 'Colour' }), h('div', { class: 'wb-swatches' }, ...swatches, custom));
}

function paint(node, color, done = true) {
  W.walk([node], (n) => { n.color = color; });
  schedule(0);
  if (done) { commit(); renderInspector(); }
}

function renderInspector() {
  uid = 0;
  const box = { append: (...items) => el.inspector.append(...items.flat().filter((x) => x !== null && x !== undefined && x !== false)) };
  el.inspector.replaceChildren();
  if (!selection.length) {
    const empty = project.objects.length === 0;
    box.append(h('div', { class: 'wb-empty' },
      h('h3', { text: empty ? 'Start building' : 'Nothing selected' }),
      h('p', { text: empty ? 'Pick a shape on the left (or drag it onto the workplane), or open Start from for a ready-made project to take apart.' : 'Click a shape in the scene or in the list below. Click it again to reach a shape inside a group. Shift-click to select several.' }),
      h('dl', { class: 'wb-facts' },
        h('dt', { text: 'Project type' }), h('dd', { text: `${preset().label} — ${preset().hint}` }),
        h('dt', { text: 'Units' }), h('dd', { text: units() === 'mm' ? 'millimetres' : 'metres' }))));
    return;
  }
  if (selection.length > 1) {
    const ids = topmost(selection);
    const btn = (label, fn, extra = {}) => h('button', { type: 'button', onclick: fn, ...extra }, label);
    const axes = ['X', 'Y', 'Z'];
    box.append(h('h3', { class: 'wb-ins-title', text: `${ids.length} selected` }),
      h('div', { class: 'wb-btn-row' }, btn('Group', TOOLS.group), btn('Make holes / solids', TOOLS.hole), btn('Drop to floor', TOOLS.floor), btn('Delete', TOOLS.delete)),
      h('div', { class: 'wb-field' }, h('span', { class: 'wb-label', text: 'Line them up' }),
        ...axes.map((a, k) => h('div', { class: 'wb-align', role: 'group', 'aria-label': `Align along ${a}` },
          h('span', { text: a }), btn('Min', () => align(k, 'min'), { 'aria-label': `Align ${a} minimum` }), btn('Middle', () => align(k, 'mid'), { 'aria-label': `Align ${a} middle` }), btn('Max', () => align(k, 'max'), { 'aria-label': `Align ${a} maximum` })))));
    return;
  }
  const node = nodeOf(selection[0]);
  if (!node) return;
  const shape = node.type === 'shape' ? shapeById(node.shape) : null;
  const error = result?.errors.find((e) => e.id === node.id);
  const nameId = fieldId();
  box.append(
    h('div', { class: 'wb-field' }, h('label', { for: nameId, class: 'wb-label', text: shape ? `${shape.name} — name` : 'Group — name' }),
      h('input', { type: 'text', id: nameId, value: node.name, maxlength: '40', oninput: (e) => { node.name = e.target.value.slice(0, 40) || (shape ? shape.name : 'Group'); renderTree(); }, onchange: commit })),
    error ? h('p', { class: 'wb-error', role: 'alert', text: error.message }) : null,
    h('div', { class: 'wb-solid-hole', role: 'group', 'aria-label': 'Solid or hole' },
      h('button', { type: 'button', 'aria-pressed': String(!node.hole), onclick: () => { if (node.hole) TOOLS.hole(); } }, 'Solid'),
      h('button', { type: 'button', 'aria-pressed': String(node.hole), onclick: () => { if (!node.hole) TOOLS.hole(); } }, 'Hole')),
    node.hole ? h('p', { class: 'wb-help', text: 'Holes cut every solid in the same group. At the top level they cut everything they touch.' }) : null,
  );
  if (!node.hole) {
    box.append(colorPicker(node));
    const finishId = fieldId();
    box.append(h('div', { class: 'wb-field' }, h('label', { for: finishId, class: 'wb-label', text: 'Finish (for images and games)' }),
      h('select', { id: finishId, onchange: (e) => { W.walk([node], (n) => { n.finish = e.target.value; }); schedule(0); commit(); } },
        ...Object.entries(W.FINISHES).map(([value, f]) => h('option', { value, selected: node.finish === value, text: f.label })))));
  }
  if (shape) {
    if (shape.blurb) box.append(h('p', { class: 'wb-blurb', text: shape.blurb }));
    box.append(h('h4', { class: 'wb-section', text: 'Shape' }), ...shape.params.map((spec) => paramControl(node, shape, spec)));
  } else {
    box.append(h('p', { class: 'wb-help', text: `${node.children.length} item${node.children.length === 1 ? '' : 's'} inside. Click the group again in the scene to reach one of them.` }),
      h('div', { class: 'wb-btn-row' }, h('button', { type: 'button', onclick: TOOLS.ungroup }, 'Ungroup')));
  }
  const p = poseOf(node), u = units();
  const animated = Boolean(project.animation.tracks[node.id]);
  box.append(h('h4', { class: 'wb-section', text: mode === 'animate' ? `Pose at ${time.toFixed(2)} s` : 'Place' }),
    mode === 'build' && animated ? h('p', { class: 'wb-help', text: 'This one is animated. Its keys keep their own poses; change the motion on the Animate tab.' }) : null,
    vectorRow('Position', p.pos, u, 'pos', snapStep() || preset().grid),
    vectorRow('Turn', p.rot, 'degrees', 'rot', 15),
    vectorRow('Scale', p.scale.map((s) => s * 100), '%', 'scale', 5),
    h('p', { class: 'wb-size' }, h('span', { text: 'Size ' }), h('strong', { dataset: { size: '' } })),
    h('div', { class: 'wb-btn-row' },
      h('button', { type: 'button', onclick: TOOLS.floor }, 'Drop to floor'),
      h('button', { type: 'button', onclick: () => TOOLS.mirror(0), title: 'Flip left–right' }, 'Mirror X'),
      h('button', { type: 'button', onclick: () => TOOLS.mirror(1), title: 'Flip front–back' }, 'Mirror Y'),
      h('button', { type: 'button', onclick: () => TOOLS.mirror(2), title: 'Flip upside down' }, 'Mirror Z')));
  box.append(pivotControl(node), patternControl(node));
  refreshSize();
}

function paramControl(node, shape, spec) {
  const f = W.shapeScale(project.preset, shape.id);
  const value = node.params[spec.id];
  const changed = () => { keepBottom(node, () => { node.params = W.resolveParams(shape, node.params, project.preset); }); schedule(30); };
  if (spec.type === 'select') {
    const id = fieldId();
    return h('div', { class: 'wb-field' }, h('label', { for: id, class: 'wb-label', text: spec.label }),
      h('select', { id, onchange: (e) => { node.params[spec.id] = e.target.value; changed(); commit(); } },
        ...spec.options.map((o) => h('option', { value: o.value, selected: o.value === value, text: o.label }))));
  }
  if (spec.type === 'toggle') {
    return h('label', { class: 'wb-check' }, h('input', { type: 'checkbox', checked: value, onchange: (e) => { node.params[spec.id] = e.target.checked; changed(); commit(); } }), h('span', { text: spec.label }));
  }
  if (spec.type === 'text') {
    const id = fieldId();
    return h('div', { class: 'wb-field' }, h('label', { for: id, class: 'wb-label', text: spec.label }),
      h('input', { type: 'text', id, value, maxlength: String(spec.maxLength || 24), oninput: (e) => { node.params[spec.id] = e.target.value; changed(); }, onchange: commit }));
  }
  if (spec.type === 'points') {
    return h('div', { class: 'wb-field' }, h('span', { class: 'wb-label', text: spec.label }),
      h('button', { type: 'button', class: 'wb-primary-soft', onclick: () => editSketch(node, shape, spec) }, `Edit the ${spec.label.toLowerCase()} (${value.length} points)`),
      h('p', { class: 'wb-help', text: spec.axis ? 'Draw half the silhouette to the right of the spin axis.' : 'Click to add points, drag to move them.' }));
  }
  const lim = W.paramLimits(spec, f);
  return numberRow(spec.label, value, {
    min: lim.min, max: lim.max, step: spec.len ? lim.step : spec.step, unit: spec.unit || (spec.len ? units() : ''), help: spec.help,
    onInput: (v) => { node.params[spec.id] = v; changed(); }, onCommit: commit,
  });
}

/* Changing a shape's height grows it upward, as if it stood on the floor. */
function keepBottom(node, change) {
  const level = Math.abs(node.rot[0] % 360) < 1e-6 && Math.abs(node.rot[1] % 360) < 1e-6;
  const before = level ? shapeSize(node)[2] : 0;
  change();
  if (!level) return;
  const after = shapeSize(node)[2];
  node.pos[2] = W.nice(node.pos[2] + ((after - before) * node.scale[2]) / 2);
  refreshTransformFields();
}

function editSketch(node, shape, spec) {
  openSketch(el.sketch, {
    points: node.params[spec.id], closed: spec.closed, axis: spec.axis, smooth: node.params.smooth || 0,
    grid: preset().grid, units: units(), title: `${shape.name}: ${spec.label.toLowerCase()}`,
  }, (pts) => {
    keepBottom(node, () => { node.params[spec.id] = pts; node.params = W.resolveParams(shape, node.params, project.preset); });
    commit(); schedule(0); renderInspector();
  });
}

function pivotControl(node) {
  const id = fieldId();
  const kind = currentPivotKind(node);
  const custom = h('div', { hidden: kind !== 'custom' }, vectorRowPivot(node));
  const select = h('select', { id, onchange: (e) => {
    if (e.target.value === 'custom') { custom.hidden = false; return; }
    const p = pivotPoint(node, e.target.value);
    if (!p) return;
    W.setPivot(node, p);
    commit(); schedule(0); renderInspector();
  } }, ...PIVOTS.map(([value, label]) => h('option', { value, selected: value === kind, text: label })));
  return h('details', { class: 'wb-more', open: mode === 'animate' || undefined },
    h('summary', { text: 'Pivot (what it turns around)' }),
    h('div', { class: 'wb-field' }, h('label', { for: id, class: 'wb-label', text: 'Turn and scale around' }), select,
      h('p', { class: 'wb-help', text: 'Moving the pivot never moves the object. Put a lid’s pivot on its back edge and it opens like a hinge.' })),
    custom);
}

function vectorRowPivot(node) {
  return vectorRow('Pivot point (inside the object)', node.pivot, units(), 'pivot', preset().grid, (k, v) => {
    const p = [...node.pivot];
    p[k] = v;
    W.setPivot(node, p);
    commit(); schedule(0); refreshTransformFields();
  });
}

function patternControl(node) {
  const u = units(), step = preset().major;
  const count = h('input', { type: 'number', min: '2', max: '64', step: '1', value: '3', 'aria-label': 'How many in total' });
  const kind = h('select', { 'aria-label': 'Pattern type' }, h('option', { value: 'circle', text: 'In a circle (around a centre)' }), h('option', { value: 'line', text: 'In a line' }));
  const keep = () => {};
  const line = vectorRow('Gap between copies', [step, 0, 0], u, 'line', preset().grid, keep);
  const circle = vectorRow('Circle centre', [0, 0, 0], u, 'centre', preset().grid, keep);
  const angle = h('input', { type: 'number', min: '1', max: '360', step: '1', value: '360', 'aria-label': 'Spread angle in degrees' });
  const sync = () => { line.hidden = kind.value !== 'line'; circle.hidden = angleRow.hidden = kind.value !== 'circle'; };
  const angleRow = h('label', { class: 'wb-inline' }, h('span', { text: 'Spread over' }), angle, h('span', { text: '° (360 = all the way round)' }));
  kind.addEventListener('change', sync);
  const apply = () => {
    const vals = (row) => [...row.querySelectorAll('input')].map((i) => Number(i.value) || 0);
    const copies = W.patternCopies(project, node, { mode: kind.value, count: Number(count.value), step: vals(line), centre: vals(circle), angle: Number(angle.value) || 360 });
    const hit = W.findNode(project, node.id);
    hit.list.splice(hit.index + 1, 0, ...copies);
    commit(); schedule(0); select([node.id, ...copies.map((c) => c.id)]);
    say(`Made ${copies.length} cop${copies.length === 1 ? 'y' : 'ies'}. Press Group (Ctrl+G) to keep them together.`);
  };
  const box = h('details', { class: 'wb-more' }, h('summary', { text: 'Repeat (pattern)' }),
    h('div', { class: 'wb-field' }, kind),
    h('label', { class: 'wb-inline' }, h('span', { text: 'How many in total' }), count),
    line, circle, angleRow,
    h('p', { class: 'wb-help', text: 'A circle pattern turns each copy as it goes round: spinner lobes, gear teeth, a ring of columns.' }),
    h('div', { class: 'wb-btn-row' }, h('button', { type: 'button', class: 'wb-primary-soft', onclick: apply }, 'Make copies')));
  sync();
  return box;
}

function renderErrors() {
  if (selection.length === 1) {
    const box = el.inspector.querySelector('.wb-error');
    const err = result?.errors.find((e) => e.id === selection[0]);
    if (Boolean(box) !== Boolean(err) || (box && err && box.textContent !== err.message)) renderInspector();
  }
}

/* ── scene list ───────────────────────────────────────────────────────── */

function renderTree() {
  const errs = new Set((result?.errors || []).map((e) => e.id));
  const list = (nodes) => h('ul', { role: 'group' }, ...nodes.map((n) => h('li', {},
    h('button', {
      type: 'button', class: `wb-node${n.hole ? ' is-hole' : ''}`, 'aria-pressed': String(selection.includes(n.id)),
      onclick: (e) => (e.shiftKey ? select(selection.includes(n.id) ? selection.filter((s) => s !== n.id) : [...selection, n.id]) : select([n.id])),
    },
    h('span', { class: 'wb-node-icon', 'aria-hidden': 'true', style: n.hole ? null : `--sw:${n.type === 'group' ? '#8fb4d8' : n.color}`, text: n.type === 'group' ? '▤' : n.hole ? '◌' : '' }),
    h('span', { class: 'wb-node-name', text: n.name }),
    project.animation.tracks[n.id] ? h('span', { class: 'wb-node-tag', title: 'Animated', text: '▶' }) : null,
    n.hole ? h('span', { class: 'wb-node-tag', text: 'hole' }) : null,
    errs.has(n.id) ? h('span', { class: 'wb-node-warn', title: 'Needs attention', text: '!' }) : null),
    n.type === 'group' && n.children.length ? list(n.children) : null)));
  el.tree.replaceChildren(project.objects.length ? list(project.objects) : h('p', { class: 'wb-help', text: 'Nothing here yet.' }));
  const n = W.countNodes(project.objects);
  el.count.textContent = `${n} / ${W.MAX_NODES}`;
}

/* ── animate panel + timeline ─────────────────────────────────────────── */

function renderAnimatePanel() {
  const box = el.animate;
  box.replaceChildren();
  el.duration.value = String(project.animation.duration);
  el.loop.checked = project.animation.loop;
  if (selection.length !== 1) {
    box.append(h('p', { class: 'wb-help', text: 'Select one shape or group. Then move the time slider under the scene and move, turn or scale it: Workbench records a key at that moment and fills in the motion between keys.' }));
    return;
  }
  const node = nodeOf(selection[0]);
  if (!node) return;
  const keys = project.animation.tracks[node.id] || [];
  const here = keys.find((k) => Math.abs(k.t - time) < 1e-3);
  const easeId = fieldId();
  const axis = h('select', { 'aria-label': 'Spin axis' }, ...['z', 'y', 'x'].map((a) => h('option', { value: a, text: `around ${a.toUpperCase()}` })));
  const turns = h('input', { type: 'number', step: '0.5', value: '1', 'aria-label': 'Turns per loop' });
  box.append(
    h('h3', { class: 'wb-ins-title', text: node.name }),
    h('div', { class: 'wb-btn-row' },
      h('button', { type: 'button', class: 'wb-primary-soft', onclick: () => { W.setKey(project, node.id, time, poseOf(node)); commit(); renderAnimatePanel(); renderLanes(); renderTree(); } }, here ? 'Update key here' : 'Add key here'),
      here ? h('button', { type: 'button', onclick: () => { const ks = project.animation.tracks[node.id]; ks.splice(ks.indexOf(here), 1); if (!ks.length) delete project.animation.tracks[node.id]; commit(); setTime(time); renderAnimatePanel(); renderTree(); } }, 'Delete this key') : null),
    keys.length ? h('div', { class: 'wb-keys' }, h('span', { class: 'wb-label', text: 'Keys' }),
      ...keys.map((k) => h('button', { type: 'button', 'aria-pressed': String(k === here), onclick: () => { setTime(k.t); renderAnimatePanel(); } }, `${k.t.toFixed(2)} s`))) : h('p', { class: 'wb-help', text: 'No keys yet. Its first key also records where it rests now, at 0 s.' }),
    here ? h('div', { class: 'wb-field' }, h('label', { for: easeId, class: 'wb-label', text: 'Motion from this key to the next' }),
      h('select', { id: easeId, onchange: (e) => { here.ease = e.target.value; commit(); setTime(time); } }, ...Object.entries(W.EASES).map(([value, label]) => h('option', { value, selected: here.ease === value, text: label })))) : null,
    h('h4', { class: 'wb-section', text: 'Make it spin' }),
    h('div', { class: 'wb-inline' }, h('span', { text: 'Turn' }), turns, h('span', { text: 'times' }), axis),
    h('div', { class: 'wb-btn-row' }, h('button', { type: 'button', onclick: () => { W.addSpin(project, node.id, axis.value, Number(turns.value) || 1); commit(); setTime(time); renderAnimatePanel(); renderTree(); say('Spinning at a steady speed. It turns around its pivot.'); } }, 'Spin over the loop')),
    keys.length ? h('div', { class: 'wb-btn-row' }, h('button', { type: 'button', onclick: () => { delete project.animation.tracks[node.id]; commit(); setTime(time); renderAnimatePanel(); renderTree(); } }, 'Remove its animation')) : null,
    h('p', { class: 'wb-help', text: 'Things turn and scale around their pivot (Build → Pivot). Put a lid’s pivot on its back edge, a ball’s on its bottom so it squashes on the floor.' }));
}

function renderLanes() {
  if (mode !== 'animate') return;
  const d = project.animation.duration;
  const rows = [];
  W.walk(project.objects, (n) => {
    const keys = project.animation.tracks[n.id];
    if (!keys) return;
    rows.push(h('div', { class: `wb-lane${selection.includes(n.id) ? ' is-selected' : ''}` },
      h('button', { type: 'button', class: 'wb-lane-name', onclick: () => select([n.id]), text: n.name }),
      h('div', { class: 'wb-lane-track' }, ...keys.map((k) => h('button', {
        type: 'button', class: `wb-key${Math.abs(k.t - time) < 1e-3 ? ' is-here' : ''}`, style: `left:${(k.t / d) * 100}%`,
        'aria-label': `${n.name} key at ${k.t.toFixed(2)} seconds`, onclick: () => { select([n.id]); setTime(k.t); renderAnimatePanel(); },
      })), h('span', { class: 'wb-playhead', style: `left:${(time / d) * 100}%` }))));
  });
  el.lanes.replaceChildren(...(rows.length ? rows : [h('p', { class: 'wb-help', text: 'Animated shapes appear here with a diamond for each key.' })]));
}

/* ── modes ────────────────────────────────────────────────────────────── */

function setMode(next) {
  mode = next;
  el.modeTabs.forEach((t) => { const on = t.dataset.mode === mode; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  Object.entries(el.panels).forEach(([k, p]) => { p.hidden = k !== mode; });
  el.timeline.hidden = mode !== 'animate';
  if (mode !== 'animate') { setPlaying(false); }
  if (mode !== 'export' && el.printView.checked) { el.printView.checked = false; view?.showPrint([], false); el.legend.hidden = true; }
  view?.setGizmoVisible(mode !== 'export');
  view?.showGhosts(mode === 'build');
  view?.select(selection, gizmoOptions());
  setTime(mode === 'animate' ? time : 0);
  view?.setPoses(project, poses());
  renderInspector();
  renderAnimatePanel();
  renderLanes();
  if (mode === 'export') { renderExport(); schedulePrint(0); }
}

/* ── print + export ───────────────────────────────────────────────────── */

let printTimer = 0;
function schedulePrint(delay = 250) { clearTimeout(printTimer); printTimer = setTimeout(runPrint, delay); }

function runPrint() {
  if (!engine) return null;
  const part = {
    params: [],
    build: (ctx) => {
      const { bodies } = W.printBodies(ctx, project, { cache, noise });
      if (!bodies.length) throw new Error('There is nothing solid to print yet. Holes on their own print nothing.');
      return { bodies, layout: project.print.arrange === 'apart' ? 'apart' : 'nested' };
    },
  };
  printResult = engine.run(part, {});
  renderPrintReport();
  if (el.printView.checked) showPrintView();
  return printResult;
}

function showPrintView() {
  const k = project.print.printScale / preset().toMm;
  view?.setPreviewScale(k);
  view?.showPrint(printResult?.bodies || [], true);
  el.legend.hidden = false;
}

function renderExport() {
  const m = units() === 'm';
  el.printScaleRow.hidden = !m;
  el.printScale.value = String(project.print.printScale);
  el.arrange.value = project.print.arrange;
  const animated = Object.keys(project.animation.tracks).length > 0;
  el.glb.textContent = animated ? 'GLB with animation' : 'GLB for games';
}

function renderPrintReport() {
  if (!printResult) return;
  const order = { bad: 0, warn: 1, ok: 2 };
  el.verdicts.replaceChildren(...[...printResult.verdicts].sort((a, b) => order[a.tone] - order[b.tone]).map((v) => h('li', { class: `is-${v.tone}` }, h('b', { text: v.tag }), h('span', { text: v.text }))));
  const scale = units() === 'm' ? [{ label: 'Model scale', value: `1 : ${project.print.printScale}` }] : [];
  el.stats.replaceChildren(...[...scale, ...printResult.stats].map((s) => h('li', {}, h('span', { text: s.label }), h('strong', { text: s.value }))));
  const off = Boolean(printResult.error) || !printResult.bodies.length;
  el.stl.disabled = off;
  el.stlParts.hidden = printResult.bodies.length < 2;
  el.stlParts.disabled = off;
}

function slug() {
  return (project.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'workbench-model';
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
  const r = runPrint();
  if (!r?.bodies.length) { say(r?.error || 'Nothing to print yet.'); return; }
  const plate = prepareForPrint(concat(r.bodies.map((b) => b.positions)), { yUp: false });
  download(writeBinaryStl(plate, `${slug()} | ClassroomOS Workbench`), `${slug()}.stl`, 'model/stl');
  const red = r.verdicts.filter((v) => v.tone === 'bad').length;
  say(`Saved ${slug()}.stl — ${r.bodies.length} part${r.bodies.length > 1 ? 's' : ''} on one plate${units() === 'm' ? ` at 1 : ${project.print.printScale}` : ''}.` + (red ? ` ${red} red check${red > 1 ? 's' : ''} still showing; read them before you print.` : ''));
}

function exportPartStls() {
  const r = runPrint();
  if (!r?.bodies.length) return;
  const names = [];
  for (const body of r.bodies) {
    const file = `${slug()}-${body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.stl`;
    download(writeBinaryStl(prepareForPrint(body.positions, { yUp: false }), `${slug()} ${body.name} | ClassroomOS Workbench`), file, 'model/stl');
    names.push(file);
  }
  say(`Saved ${names.length} STL files, one per part.`);
}

async function exportGlb() {
  if (!result?.pieces.length) { say('Add a solid shape first.'); return; }
  try {
    const { glb, animated } = await writeAnimatedGlb(project, result);
    download(glb, `${slug()}.glb`, 'model/gltf-binary');
    say(`Saved ${slug()}.glb — Y-up, real size in metres, one object per shape${animated ? `, with a ${project.animation.duration} s animation` : ''}. Drop it into Godot, Unity, Blender or the Asset Bench.`);
  } catch (error) { say(`Could not make the GLB: ${error.message}`); }
}

function exportObj() {
  if (!result?.pieces.length) { say('Add a solid shape first.'); return; }
  download(writeObj(worldBodies(project, result), { comment: `${slug()} — ClassroomOS Workbench` }), `${slug()}.obj`, 'text/plain');
  say(`Saved ${slug()}.obj (metres, Y-up, one object per shape).`);
}

function exportPng() {
  if (!view) return;
  const url = view.snapshot();
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug()}.png`;
  link.click();
  say(`Saved ${slug()}.png of the current view.`);
}

function saveProject() {
  download(JSON.stringify({ ...project, savedAt: new Date().toISOString() }, null, 1), `${slug()}.workbench.json`, 'application/json');
  say(`Saved ${slug()}.workbench.json — open it here any time to keep working.`);
}

async function openProject(file) {
  try {
    const next = W.validateProject(JSON.parse(await file.text()));
    project = next;
    selection = [];
    commit();
    projectChanged(true);
    say(`Opened ${file.name}. Undo brings back what you had before.`);
  } catch (error) {
    say(error instanceof SyntaxError ? `${file.name} is not a Workbench project file (.workbench.json).` : error.message);
  }
}

/* ── library + templates ──────────────────────────────────────────────── */

const thumbs = new Map();
function renderLibrary() {
  const q = el.search.value.trim().toLowerCase();
  el.shapes.replaceChildren();
  for (const group of SHAPE_GROUPS) {
    const shapes = SHAPES.filter((s) => s.group === group && (!q || `${s.name} ${s.blurb} ${group}`.toLowerCase().includes(q)));
    if (!shapes.length) continue;
    el.shapes.append(h('h3', { class: 'wb-group', text: group }), h('ul', { class: 'wb-shape-grid' }, ...shapes.map((s) => h('li', {},
      h('button', {
        type: 'button', class: 'wb-shape', draggable: 'true', title: s.blurb, dataset: { shape: s.id },
        onclick: () => addShape(s.id), ondragstart: (e) => { e.dataTransfer.setData('text/x-workbench-shape', s.id); e.dataTransfer.effectAllowed = 'copy'; },
      }, h('img', { alt: '', src: thumbs.get(s.id) || null, width: '64', height: '64', loading: 'lazy', dataset: { thumb: s.id } }), h('span', { text: s.name }))))));
  }
  if (!el.shapes.children.length) el.shapes.append(h('p', { class: 'wb-help', text: 'No shape matches that. Try “box”, “roof” or “gear”.' }));
}

function renderTemplates() {
  el.templates.replaceChildren(
    h('h3', { class: 'wb-group', text: 'Start empty' }),
    h('div', { class: 'wb-blanks' }, ...BLANKS.map((b) => h('button', { type: 'button', class: 'wb-blank', onclick: () => startBlank(b.preset) }, h('strong', { text: W.PRESETS[b.preset].label }), h('span', { text: b.hint })))),
    ...REALMS.flatMap((realm) => [
      h('h3', { class: 'wb-group', text: realm }),
      h('ul', { class: 'wb-template-list' }, ...TEMPLATES.filter((t) => t.realm === realm).map((t) => h('li', {},
        h('button', { type: 'button', class: 'wb-template', onclick: () => startTemplate(t.id) }, h('strong', { text: t.title }), h('span', { text: t.blurb }))))),
    ]));
}

function startBlank(presetId) {
  project = W.freshProject(presetId, '');
  selection = [];
  commit();
  projectChanged(true);
  showLibrary('shapes');
  say(`New ${W.PRESETS[presetId].label.toLowerCase()} project (${W.PRESETS[presetId].hint.toLowerCase()}). Undo brings back what you had.`);
}

function startTemplate(id) {
  if (!engine) { say('The geometry engine is still starting. Try again in a moment.'); return; }
  const t = templateById(id);
  project = finishTemplate(t, (node) => shapeSize(node));
  selection = [];
  commit();
  projectChanged(true);
  say(`Opened “${t.title}”. Click any part to see how it is made. Undo brings back what you had before.`);
  if (Object.keys(project.animation.tracks).length) { setMode('animate'); setPlaying(true); }
}

function showLibrary(tab) {
  el.libTabs.forEach((t) => { const on = t.dataset.libTab === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  Object.entries(el.libPanels).forEach(([k, p]) => { p.hidden = k !== tab; });
}

/* Thumbnails, one shape at a time while the browser is idle. */
function renderThumbnails() {
  const maker = createThumbnailer(128);
  if (!maker) return;
  const queue = SHAPES.map((s) => s.id);
  // the render loop can leave no idle time at all, so never wait long
  const idle = window.requestIdleCallback ? (fn) => window.requestIdleCallback(fn, { timeout: 120 }) : (fn) => setTimeout(fn, 30);
  const next = () => {
    const id = queue.shift();
    if (!id) return;
    try {
      const node = W.newShapeNode(W.freshProject('print'), id);
      const url = maker.render(engine.scoped((ctx) => W.shapeSoup(ctx, node, { cache, noise })));
      thumbs.set(id, url);
      el.shapes.querySelectorAll(`img[data-thumb="${id}"]`).forEach((img) => { img.src = url; });
    } catch { /* a shape without a picture still works */ }
    idle(next);
  };
  idle(next);
}

/* ── whole-project refresh ────────────────────────────────────────────── */

function projectChanged(reframe = false) {
  el.name.value = project.name || '';
  el.preset.textContent = `${preset().label} · ${preset().units}`;
  el.preset.title = preset().hint;
  fillSnap();
  if (view) view.setWorkplane(project.preset);
  printResult = null;
  if (mode === 'animate' && !Object.keys(project.animation.tracks).length) setMode('build');
  setTime(Math.min(time, project.animation.duration));
  el.scrub.max = String(project.animation.duration);
  dirty = true;
  rebuild();
  if (reframe && view) view.frame(result?.solidAll);
  select(selection);
  if (mode === 'export') { renderExport(); schedulePrint(0); }
}

/* Snap steps are 1, 5 or 10 grid squares (or off); the choice survives a change of units. */
let snapTimes = 1;
function fillSnap() {
  const g = preset().grid, u = units();
  el.snap.replaceChildren(...[1, 5, 10, 0].map((t) => h('option', { value: String(W.nice(g * t)), text: t ? `${fmt(g * t)} ${u}` : 'Off', dataset: { times: String(t) } })));
  el.snap.selectedIndex = [1, 5, 10, 0].indexOf(snapTimes);
}

/* ── events ───────────────────────────────────────────────────────────── */

function wire() {
  el.name.addEventListener('input', () => { project.name = el.name.value.slice(0, 60); });
  el.name.addEventListener('change', commit);
  el.search.addEventListener('input', renderLibrary);
  el.libTabs.forEach((t) => t.addEventListener('click', () => showLibrary(t.dataset.libTab)));
  el.modeTabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));
  tablistKeys(el.libTabs, (t) => showLibrary(t.dataset.libTab));
  tablistKeys(el.modeTabs, (t) => setMode(t.dataset.mode));
  el.tools.forEach((b) => b.addEventListener('click', () => TOOLS[b.dataset.tool]?.()));
  el.gizmoModes.forEach((b) => b.addEventListener('click', () => setGizmoMode(b.dataset.gizmo)));
  el.snap.addEventListener('change', () => { snapTimes = Number(el.snap.selectedOptions[0].dataset.times); view?.select(selection, gizmoOptions()); });
  el.views.forEach((b) => b.addEventListener('click', () => view?.viewFrom(b.dataset.view, selection.length ? combinedBounds(selection, 'solid') : result?.solidAll)));
  el.play.addEventListener('click', () => setPlaying(!playing));
  el.scrub.addEventListener('input', () => { setPlaying(false); setTime(Number(el.scrub.value)); renderAnimatePanel(); });
  el.duration.addEventListener('change', () => {
    const d = Math.max(0.25, Math.min(60, Number(el.duration.value) || 2));
    const f = d / project.animation.duration;
    // stretch the keys with the loop, so the motion keeps its rhythm
    for (const keys of Object.values(project.animation.tracks)) keys.forEach((k) => { k.t = W.nice(k.t * f); });
    project.animation.duration = d;
    el.scrub.max = String(d);
    commit(); setTime(time * f); renderAnimatePanel();
  });
  el.loop.addEventListener('change', () => { project.animation.loop = el.loop.checked; commit(); });
  el.arrange.addEventListener('change', () => { project.print.arrange = el.arrange.value; commit(); schedulePrint(0); });
  el.printScale.addEventListener('change', () => { const v = Math.round(Number(el.printScale.value)); if (v >= 1 && v <= 1000) { project.print.printScale = v; commit(); schedulePrint(0); } else el.printScale.value = String(project.print.printScale); });
  el.printView.addEventListener('change', () => { if (el.printView.checked) { if (!printResult) runPrint(); showPrintView(); } else { view?.showPrint([], false); el.legend.hidden = true; } });
  el.stl.addEventListener('click', exportStl);
  el.stlParts.addEventListener('click', exportPartStls);
  el.glb.addEventListener('click', exportGlb);
  el.obj.addEventListener('click', exportObj);
  el.png.addEventListener('click', exportPng);
  el.save.addEventListener('click', saveProject);
  el.open.addEventListener('click', () => el.openFile.click());
  el.openFile.addEventListener('change', () => { const f = el.openFile.files[0]; if (f) openProject(f); el.openFile.value = ''; });
  document.addEventListener('keydown', onKey);
}

function tablistKeys(tabs, activate) {
  const list = [...tabs];
  list.forEach((t, i) => t.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = list[(i + d + list.length) % list.length];
    next.focus();
    activate(next);
  }));
}

function setGizmoMode(m) {
  gizmoMode = m;
  el.gizmoModes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gizmo === m)));
  view?.setGizmo(m, gizmoOptions().snap);
}

function onKey(e) {
  const t = e.target;
  if (t.closest?.('input, textarea, select, [contenteditable], dialog')) return;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  const act = (fn) => { e.preventDefault(); fn(); };
  if (ctrl && k === 'z' && !e.shiftKey) return act(undo);
  if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) return act(redo);
  if (ctrl && k === 'd') return act(TOOLS.duplicate);
  if (ctrl && k === 'g') return act(e.shiftKey ? TOOLS.ungroup : TOOLS.group);
  if (ctrl) return;
  if (k === 'delete' || k === 'backspace') return act(TOOLS.delete);
  if (k === 'escape') return act(() => select([]));
  if (k === 'w') return act(() => setGizmoMode('translate'));
  if (k === 'e') return act(() => setGizmoMode('rotate'));
  if (k === 'r') return act(() => setGizmoMode('scale'));
  if (k === 'h') return act(TOOLS.hole);
  if (k === 'f') return act(TOOLS.frame);
  if (k === 'd' && e.shiftKey) return act(TOOLS.duplicate);
  if (k === ' ' && mode === 'animate') return act(() => setPlaying(!playing));
  const step = (snapStep() || preset().grid) * (e.shiftKey ? 10 : 1);
  if (!selection.length || !['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'pageup', 'pagedown'].includes(k)) return;
  e.preventDefault();
  if (k === 'arrowleft') nudge(0, -step);
  if (k === 'arrowright') nudge(0, step);
  if (k === 'arrowup') nudge(1, step);
  if (k === 'arrowdown') nudge(1, -step);
  if (k === 'pageup') nudge(2, step);
  if (k === 'pagedown') nudge(2, -step);
}

/* ── start ────────────────────────────────────────────────────────────── */

async function start() {
  wire();
  renderLibrary();
  renderTemplates();
  refreshUndo();
  setGizmoMode('translate');
  try {
    view = createView(el.canvas, {
      onPick, onGizmoChange,
      onGizmoEnd: () => { commit(); refreshTransformFields(); if (mode === 'animate') renderAnimatePanel(); },
      onDropShape: (id, at) => addShape(id, at),
    });
    view.onFrame = tick;
    view.setWorkplane(project.preset);
  } catch (error) {
    console.error(error);
    view = null;
    el.canvas.hidden = true;
    el.nogl.hidden = false;
  }
  projectChanged();
  el.status.textContent = 'Starting the geometry engine…';
  try {
    const font = await fetch(new URL('../../vendor/fonts/droid-sans-bold.typeface.json', import.meta.url)).then((r) => r.json());
    engine = await createEngine(ManifoldModule, { font });
  } catch (error) {
    console.error(error);
    el.status.textContent = 'The geometry engine could not start in this browser.';
    return;
  }
  dirty = true;
  rebuild();
  view?.frame(result?.solidAll);
  if (!openFromLink() && !project.objects.length) showLibrary('start');
  renderThumbnails();
}

/* workbench.html?template=house or ?new=building (from lesson links). Your
   own project stays one undo away, and the link is cleared so a reload keeps
   working on whatever you did next. */
function openFromLink() {
  const params = new URLSearchParams(location.search);
  const template = params.get('template'), blank = params.get('new');
  if (!template && !blank) return false;
  window.history.replaceState(null, '', location.pathname + location.hash);
  if (template && templateById(template)) { startTemplate(template); return true; }
  if (blank && W.PRESETS[blank]) { startBlank(blank); return true; }
  return false;
}

start();
