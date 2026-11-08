/* Path Studio: the Vector Drawing Studio's editor.
 * Geometry lives in vector-geometry.mjs (pure, tested); booleans in
 * vector-boolean.mjs (Manifold kernel, loaded on first use). This file is the
 * DOM: tools, gestures, inspector, layers, files. Artwork is kept as data;
 * guides and handles never enter exported files.
 */
import * as G from './vector-geometry.mjs';

const root = document.querySelector('#path-studio');
const $ = (id) => document.getElementById(`vs-${id}`);
const ns = 'http://www.w3.org/2000/svg';
const storageKey = 'classroom-path-studio-v1';
const canvas = $('canvas');
const ACCENT = '#1f7de0', ACCENT_2 = '#ad5b14';

let objects = [], sel = new Set(), tool = 'select', gesture = null;
let history = [], future = [], missions = {}, uid = 0, gid = 0, clipboard = null;
let defaults = { fill: '#176b65', stroke: '#163d47', strokeWidth: 0, opacity: 100 };
let shapeDefaults = { sides: 6, star: false, inner: 0.5, radius: 0 };
let editId = null, selNodes = new Set();      // Points tool: which path, which anchors ("sub:index")
let pen = null, penHover = null;              // Pen tool: { nodes: [...] } in artboard space
let marquee = null;

const copy = (v) => JSON.parse(JSON.stringify(v));
const find = (id) => objects.find((o) => o.id === id);
const indexOf = (id) => objects.findIndex((o) => o.id === id);
const selected = () => objects.filter((o) => sel.has(o.id));
const status = (message) => { $('status').textContent = message; };
const isTyping = (el) => el?.matches?.('input,textarea,select');
function replace(o) { const k = indexOf(o.id); if (k >= 0) objects[k] = o; }
function svgNode(tag, attrs = {}, parent) {
  const el = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  if (parent) parent.append(el);
  return el;
}
const px = () => { const r = canvas.getBoundingClientRect(); return G.BOARD.w / (r.width || G.BOARD.w); };

/* ── objects ─────────────────────────────────────────────── */
function make(type, x, y, w, h, extra = {}) {
  const names = { rect: 'Rectangle', ellipse: 'Ellipse', polygon: 'Polygon', path: 'Path', text: 'Text' };
  const o = { id: ++uid, type, name: names[type], x, y, w, h, rotation: 0, visible: true, locked: false, ...defaults, ...extra };
  if (type === 'rect') o.radius ??= shapeDefaults.radius;
  if (type === 'polygon') { o.sides ??= shapeDefaults.sides; o.star ??= shapeDefaults.star; o.inner ??= shapeDefaults.inner; if (o.star && o.name === 'Polygon') o.name = 'Star'; }
  return o;
}
function starter() {
  objects = []; uid = 0; gid = 0;
  const disc = make('ellipse', 160, 80, 320, 320, { name: 'Golden disc', fill: '#edb854' });
  const canopy = make('path', 220, 130, 200, 190, { name: 'Canopy · double-click to edit', fill: '#176b65',
    subpaths: [{ closed: true, nodes: [G.node([0, 100], null, [0, 0], 'corner'), G.node([100, 100], [100, 0], null, 'corner')] }] });
  const stem = make('rect', 312, 242, 12, 108, { name: 'Stem', fill: '#fffdf7', rotation: 18, radius: 6 });
  const word = make('text', 200, 412, 240, 34, { name: 'Club name', text: 'GROW TOGETHER', font: 'sans', size: 30, weight: 900, tracking: 1, fill: '#173f3e' });
  objects = [disc, canopy, stem, word];
  sel = new Set([canopy.id]);
}

/* ── history & storage ───────────────────────────────────── */
const snapshot = () => JSON.stringify({ objects, missions });
function remember(before) {
  if (before !== snapshot()) { history.push(before); if (history.length > 100) history.shift(); future = []; }
  persist(); render();
}
function change(fn) { const before = snapshot(); fn(); remember(before); }
function projectData() { return { version: 2, objects, missions, notes: document.getElementById('design-notes').value }; }
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(projectData())); $('save-status').textContent = 'Saved in this browser'; }
  catch { $('save-status').textContent = 'Storage unavailable · download a project'; }
}
function mission(key) { missions[key] = true; }
function checkShapes() { if (objects.filter((o) => o.type !== 'text').length >= 3) mission('shapes'); }
function load(data) {
  objects = data.objects; missions = data.missions; sel = new Set(); editId = null; selNodes = new Set(); pen = null;
  uid = Math.max(0, ...objects.map((o) => o.id)); gid = Math.max(0, ...objects.map((o) => o.group || 0));
}

/* ── groups ──────────────────────────────────────────────── */
const members = (g) => objects.filter((o) => o.group === g);
/** Keep each group's members next to each other in the stack, at the frontmost member's place. */
function tidyGroups() {
  const counts = new Map();
  objects.forEach((o) => { if (o.group != null) counts.set(o.group, (counts.get(o.group) || 0) + 1); });
  objects.forEach((o) => { if (o.group != null && counts.get(o.group) < 2) delete o.group; });
  const out = [], placed = new Set();
  for (let k = objects.length - 1; k >= 0; k--) {
    const o = objects[k];
    if (o.group == null) { out.push(o); continue; }
    if (placed.has(o.group)) continue;
    placed.add(o.group);
    const block = members(o.group);
    for (let j = block.length - 1; j >= 0; j--) out.push(block[j]);
  }
  objects = out.reverse();
}
/** The selection as movable units: a whole selected group moves as one. */
function units() {
  const out = [], byGroup = new Map();
  for (const o of selected()) {
    if (o.group != null && members(o.group).every((m) => sel.has(m.id))) {
      if (!byGroup.has(o.group)) { const u = { ids: [] }; byGroup.set(o.group, u); out.push(u); }
      byGroup.get(o.group).ids.push(o.id);
    } else out.push({ ids: [o.id] });
  }
  for (const u of out) u.bounds = G.unionBounds(u.ids.map((id) => G.objectBounds(find(id))));
  return out;
}
function selectHit(o, { add = false, direct = false } = {}) {
  const ids = !direct && o.group != null ? members(o.group).map((m) => m.id) : [o.id];
  if (add) {
    const all = ids.every((id) => sel.has(id));
    ids.forEach((id) => (all ? sel.delete(id) : sel.add(id)));
  } else if (!ids.every((id) => sel.has(id)) || direct) sel = new Set(ids);
}

/* ── drawing the artwork ─────────────────────────────────── */
function paint(o) {
  return { fill: o.fill, stroke: o.strokeWidth > 0 ? o.stroke : 'none', 'stroke-width': o.strokeWidth > 0 ? o.strokeWidth : null, opacity: o.opacity < 100 ? o.opacity / 100 : null };
}
function drawObject(o, parent, live = true) {
  const g = svgNode('g', live ? { 'data-object': o.id } : {}, parent);
  if (o.type === 'text') {
    const t = svgNode('text', { x: 0, y: o.size * 0.82, 'font-family': G.FONTS[o.font]?.css, 'font-size': o.size, 'font-weight': o.weight, 'letter-spacing': o.tracking || null, ...paint(o) }, g);
    t.textContent = o.text || ' ';
    if (live) {
      // Text boxes follow the words: measure once the glyphs are laid out.
      try { const w = t.getComputedTextLength(); if (w > 0) { o.w = Math.max(1, w); o.h = o.size * 1.05; } } catch { /* not rendered yet */ }
    }
  } else {
    const d = G.localPathData(o);
    svgNode('path', { d, ...paint(o), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
    // Unfilled outlines get a wide invisible edge so they can still be clicked.
    if (live && o.fill === 'none') svgNode('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': 12 * px(), 'pointer-events': 'stroke' }, g);
  }
  g.setAttribute('transform', G.transformOf(o));
  if (!o.visible) g.setAttribute('display', 'none');
  if (live && o.locked) g.setAttribute('pointer-events', 'none');
  return g;
}
function drawArtwork() {
  const layer = $('objects');
  layer.replaceChildren();
  objects.forEach((o) => drawObject(o, layer));
}

/* ── guides: selection frame, handles, points, pen preview ── */
function frame() {
  const list = selected().filter((o) => o.visible);
  if (!list.length) return null;
  if (list.length === 1) {
    const o = list[0];
    return { single: o, rot: o.rotation || 0, center: G.centerOf(o), corners: [[0, 0], [100, 0], [100, 100], [0, 100]].map((p) => G.toWorld(o, p)) };
  }
  const b = G.unionBounds(list.map(G.objectBounds));
  return { rot: 0, center: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], corners: [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]], b };
}
const HANDLES = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };
function handlePoint(f, [fx, fy]) {
  const [a, b, , d] = f.corners;
  return [a[0] + (b[0] - a[0]) * fx + (d[0] - a[0]) * fy, a[1] + (b[1] - a[1]) * fx + (d[1] - a[1]) * fy];
}
const guideLine = (k, extra = {}) => ({ fill: 'none', stroke: ACCENT, 'stroke-width': 1.2 * k, 'pointer-events': 'none', ...extra });
function outline(o, g, k) {
  if (o.type === 'text') svgNode('polygon', { points: [[0, 0], [100, 0], [100, 100], [0, 100]].map((p) => G.toWorld(o, p).join(',')).join(' '), ...guideLine(k, { 'stroke-dasharray': `${3 * k} ${3 * k}` }) }, g);
  else svgNode('path', { d: G.pathData(G.worldSubpaths(o)), ...guideLine(k) }, g);
}
function renderGuides() {
  const g = $('guides'), k = px();
  g.replaceChildren();
  if (tool === 'nodes') drawPointGuides(g, k);
  else {
    for (const o of selected()) if (o.visible) outline(o, g, k);
    const f = tool === 'select' && !gesture?.noFrame ? frame() : null;
    if (f) {
      svgNode('polygon', { points: f.corners.map((p) => p.join(',')).join(' '), ...guideLine(k, { stroke: ACCENT, 'stroke-dasharray': f.single ? null : `${4 * k} ${3 * k}` }) }, g);
      const top = handlePoint(f, HANDLES.n), dir = G.vec.norm(G.vec.sub(top, f.center));
      const knob = G.vec.add(top, G.vec.mul(dir.some(Boolean) ? dir : [0, -1], 26 * k));
      svgNode('line', { x1: top[0], y1: top[1], x2: knob[0], y2: knob[1], ...guideLine(k) }, g);
      svgNode('circle', { cx: knob[0], cy: knob[1], r: 6 * k, fill: '#fff', stroke: ACCENT, 'stroke-width': 1.5 * k, 'data-tf': 'rot', class: 'vs-h-rot' }, g);
      const s = 9 * k;
      for (const [name, at] of Object.entries(HANDLES)) {
        const [x, y] = handlePoint(f, at);
        svgNode('rect', { x: x - s / 2, y: y - s / 2, width: s, height: s, fill: '#fff', stroke: ACCENT, 'stroke-width': 1.5 * k, 'data-tf': name, class: `vs-h-${name}`, transform: f.rot ? `rotate(${f.rot} ${x} ${y})` : null }, g);
      }
    }
  }
  if (pen) drawPenGuides(g, k);
  if (marquee) {
    const [a, b] = marquee;
    svgNode('rect', { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), width: Math.abs(b[0] - a[0]), height: Math.abs(b[1] - a[1]), fill: '#1f7de014', ...guideLine(k, { fill: '#1f7de014', 'stroke-dasharray': `${4 * k} ${3 * k}` }) }, g);
  }
}
function drawPointGuides(g, k) {
  const o = find(editId);
  for (const s of selected()) if (s.id !== editId && s.visible) outline(s, g, k);
  if (!o || !o.visible) return;
  if (o.type === 'text') { outline(o, g, k); return; }
  const subs = G.worldSubpaths(o);
  svgNode('path', { d: G.pathData(subs), ...guideLine(k) }, g);
  const total = subs.reduce((n, s) => n + s.nodes.length, 0);
  subs.forEach((s, si) => s.nodes.forEach((n, ni) => {
    const key = `${si}:${ni}`, on = selNodes.has(key);
    const prevOn = selNodes.has(`${si}:${ni - 1}`) || (s.closed && ni === 0 && selNodes.has(`${si}:${s.nodes.length - 1}`));
    const nextOn = selNodes.has(`${si}:${ni + 1}`) || (s.closed && ni === s.nodes.length - 1 && selNodes.has(`${si}:0`));
    const showHandles = total <= 40 || on || prevOn || nextOn;
    for (const which of ['i', 'o']) {
      const h = n[which];
      if (!h || !showHandles) continue;
      svgNode('line', { x1: n.p[0], y1: n.p[1], x2: h[0], y2: h[1], ...guideLine(k, { stroke: ACCENT_2 }) }, g);
      svgNode('circle', { cx: h[0], cy: h[1], r: 4.5 * k, fill: ACCENT_2, stroke: '#fff', 'stroke-width': 1.2 * k, 'data-handle': `${key}:${which}`, class: 'vs-pt' }, g);
    }
  }));
  subs.forEach((s, si) => s.nodes.forEach((n, ni) => {
    const key = `${si}:${ni}`, on = selNodes.has(key), r = (on ? 5.5 : 4.5) * k;
    const attrs = { fill: on ? ACCENT : '#fff', stroke: ACCENT, 'stroke-width': 1.5 * k, 'data-anchor': key, class: 'vs-pt' };
    if (n.k === 'corner') svgNode('rect', { x: n.p[0] - r, y: n.p[1] - r, width: 2 * r, height: 2 * r, ...attrs }, g);
    else svgNode('circle', { cx: n.p[0], cy: n.p[1], r: r * 1.15, ...attrs }, g);
  }));
}
function drawPenGuides(g, k) {
  const nodes = pen.nodes;
  if (!nodes.length) return;
  const sub = { closed: false, nodes: [...nodes] };
  if (penHover && !gesture) sub.nodes = [...nodes, G.node(penHover)];
  svgNode('path', { d: G.pathData([sub]), fill: 'none', stroke: defaults.stroke, 'stroke-width': Math.max(1.5, defaults.strokeWidth) , 'stroke-dasharray': `${4 * k} ${3 * k}`, 'pointer-events': 'none' }, g);
  nodes.forEach((n, i) => {
    for (const h of [n.i, n.o]) if (h) {
      svgNode('line', { x1: n.p[0], y1: n.p[1], x2: h[0], y2: h[1], ...guideLine(k, { stroke: ACCENT_2 }) }, g);
      svgNode('circle', { cx: h[0], cy: h[1], r: 3.5 * k, fill: ACCENT_2, 'pointer-events': 'none' }, g);
    }
    const r = (i ? 4 : 6) * k;
    svgNode('rect', { x: n.p[0] - r, y: n.p[1] - r, width: 2 * r, height: 2 * r, fill: i ? '#fff' : '#edb854', stroke: ACCENT, 'stroke-width': 1.5 * k, 'pointer-events': 'none' }, g);
  });
}

/* ── panels ──────────────────────────────────────────────── */
function render() {
  drawArtwork();
  renderGuides();
  renderLayers();
  syncFields();
  canvas.dataset.tool = tool;
  root.querySelector('[data-command=undo]').disabled = !history.length;
  root.querySelector('[data-command=redo]').disabled = !future.length;
  const labels = {
    shapes: ['Add three shapes', 'Three shapes added'], curve: ['Edit a curve handle', 'Curve handle edited'],
    combine: ['Combine two shapes', 'Shapes combined'], arrange: ['Change the stacking order', 'Stacking order changed'], export: ['Export your SVG', 'SVG exported'],
  };
  document.querySelectorAll('[data-mission]').forEach((el) => {
    const [todo, done] = labels[el.dataset.mission] || ['', ''];
    el.textContent = missions[el.dataset.mission] ? `✓ ${done}` : `○ ${todo}`;
  });
}
function layerRow(o, panel, indent) {
  const row = document.createElement('div');
  row.className = `vs-layer${sel.has(o.id) ? ' selected' : ''}${indent ? ' vs-in-group' : ''}${o.locked ? ' locked' : ''}`;
  const pick = document.createElement('button');
  pick.type = 'button'; pick.textContent = o.name; pick.setAttribute('aria-pressed', String(sel.has(o.id)));
  pick.title = 'Click to select. Shift-click to add.';
  pick.addEventListener('click', (e) => {
    if (o.locked) { status(`${o.name} is locked. Unlock it to select it.`); return; }
    if (e.shiftKey) { sel.has(o.id) ? sel.delete(o.id) : sel.add(o.id); } else sel = new Set([o.id]);
    if (tool === 'nodes') { editId = o.id; selNodes = new Set(); }
    render(); status(`Selected ${o.name}.`);
  });
  const lock = document.createElement('button');
  lock.type = 'button'; lock.textContent = o.locked ? '🔒' : '🔓'; lock.className = 'vs-ico';
  lock.setAttribute('aria-label', `${o.locked ? 'Unlock' : 'Lock'} ${o.name}`);
  lock.addEventListener('click', () => change(() => { o.locked = !o.locked; if (o.locked) sel.delete(o.id); }));
  const eye = document.createElement('button');
  eye.type = 'button'; eye.textContent = o.visible ? 'Hide' : 'Show';
  eye.setAttribute('aria-label', `${o.visible ? 'Hide' : 'Show'} ${o.name}`);
  eye.addEventListener('click', () => change(() => { o.visible = !o.visible; }));
  row.append(pick, lock, eye); panel.append(row);
}
function renderLayers() {
  const panel = $('layers');
  panel.replaceChildren();
  if (!objects.length) { panel.textContent = 'An empty artboard. Draw your first shape.'; return; }
  const done = new Set();
  for (const o of [...objects].reverse()) {
    if (o.group == null) { layerRow(o, panel, false); continue; }
    if (done.has(o.group)) continue;
    done.add(o.group);
    const block = members(o.group).reverse(), all = block.every((m) => sel.has(m.id));
    const head = document.createElement('div');
    head.className = `vs-layer vs-group-head${all ? ' selected' : ''}`;
    const pick = document.createElement('button');
    pick.type = 'button'; pick.textContent = `▾ Group · ${block.length} objects`; pick.setAttribute('aria-pressed', String(all));
    pick.addEventListener('click', (e) => {
      const ids = block.filter((m) => !m.locked).map((m) => m.id);
      if (e.shiftKey) ids.forEach((id) => sel.add(id)); else sel = new Set(ids);
      render(); status('Selected the group. Double-click an object on the artboard, or pick it below, to work on it alone.');
    });
    const eye = document.createElement('button');
    const shown = block.some((m) => m.visible);
    eye.type = 'button'; eye.textContent = shown ? 'Hide' : 'Show';
    eye.setAttribute('aria-label', `${shown ? 'Hide' : 'Show'} group`);
    eye.addEventListener('click', () => change(() => block.forEach((m) => { m.visible = !shown; })));
    head.append(pick, eye); panel.append(head);
    block.forEach((m) => layerRow(m, panel, true));
  }
}
const num = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : '');
function setField(id, value, disabled = false) {
  const el = $(id);
  el.disabled = disabled;
  if (document.activeElement === el) return;
  if (el.type === 'checkbox') el.checked = !!value; else el.value = value;
}
function syncFields() {
  const list = selected(), one = list.length === 1 ? list[0] : null, any = list.length > 0;
  const style = one || list[0] || defaults;
  $('selection-label').textContent = !any ? 'New object style' : one ? ({ rect: 'Rectangle', ellipse: 'Ellipse', polygon: one.star ? 'Star' : 'Polygon', path: 'Path', text: 'Text' })[one.type] : `${list.length} objects`;
  setField('name', one ? one.name : '', !one);
  setField('fill', style.fill === 'none' ? '#176b65' : style.fill);
  setField('stroke', style.stroke);
  setField('no-fill', style.fill === 'none');
  setField('stroke-width', num(style.strokeWidth));
  setField('opacity', num(style.opacity));
  const f = frame(), b = f && (one ? null : f.b);
  setField('x', one ? num(one.x) : b ? num(b.x0) : '', !any);
  setField('y', one ? num(one.y) : b ? num(b.y0) : '', !any);
  setField('width', one ? num(one.w) : b ? num(b.x1 - b.x0) : '', !any);
  setField('height', one ? num(one.h) : b ? num(b.y1 - b.y0) : '', !any);
  setField('rotation', one ? num(one.rotation) : '', !one);
  $('rect-fields').hidden = !(one?.type === 'rect' || (!any && tool === 'rect'));
  setField('radius', num(one?.type === 'rect' ? one.radius : shapeDefaults.radius));
  $('polygon-fields').hidden = !(one?.type === 'polygon' || (!any && tool === 'polygon'));
  const poly = one?.type === 'polygon' ? one : shapeDefaults;
  setField('sides', poly.sides); setField('star', poly.star); setField('inner', Math.round(poly.inner * 100), !poly.star);
  $('text-fields').hidden = one?.type !== 'text';
  if (one?.type === 'text') { setField('text', one.text); setField('font', one.font); setField('size', num(one.size)); setField('weight', String(one.weight)); setField('tracking', num(one.tracking)); }
  // Points panel
  const target = tool === 'nodes' ? find(editId) : null;
  $('node-panel').hidden = !target || target.type === 'text';
  if (target && target.type !== 'text') {
    const subs = G.shapeSubpaths(target), count = subs.reduce((n, s) => n + s.nodes.length, 0);
    $('node-label').textContent = selNodes.size ? `${selNodes.size} of ${count} selected` : `${count} points`;
    ['node-corner', 'node-smooth', 'node-symmetric', 'node-delete', 'node-break'].forEach((c) => { root.querySelector(`[data-command="${c}"]`).disabled = !selNodes.size; });
    const closed = subs.every((s) => s.closed);
    $('close-btn').textContent = closed ? 'Open path' : 'Close path';
  }
  const shapes = list.filter((o) => o.type !== 'text');
  const unitCount = any ? units().length : 0;
  $('align-to').textContent = unitCount > 1 ? 'to each other' : 'to artboard';
  const enable = {
    duplicate: any, delete: any, group: list.length > 1, ungroup: list.some((o) => o.group != null),
    'flip-x': shapes.length > 0, 'flip-y': shapes.length > 0, 'to-path': list.some((o) => ['rect', 'ellipse', 'polygon'].includes(o.type)), lock: any,
    front: any, raise: any, lower: any, back: any, 'dist-x': unitCount >= 3, 'dist-y': unitCount >= 3,
    'bool-unite': shapes.length >= 2, 'bool-minus': shapes.length >= 2, 'bool-intersect': shapes.length >= 2, 'bool-exclude': shapes.length >= 2,
  };
  for (const a of ['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom']) enable[`align-${a}`] = any;
  for (const [cmd, on] of Object.entries(enable)) { const b = root.querySelector(`[data-command="${cmd}"]`); if (b) b.disabled = !on; }
}

/* ── inspector edits ─────────────────────────────────────── */
function validNumber(el) { return el.type !== 'number' || (el.checkValidity() && Number.isFinite(el.valueAsNumber)); }
function onField(id, fn) {
  $(id).addEventListener('change', (e) => {
    if (!validNumber(e.target)) { syncFields(); return; }
    const value = e.target.type === 'number' ? e.target.valueAsNumber : e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    change(() => fn(value));
  });
}
for (const [id, key] of [['fill', 'fill'], ['stroke', 'stroke'], ['stroke-width', 'strokeWidth'], ['opacity', 'opacity']]) {
  onField(id, (v) => { defaults[key] = v; selected().forEach((o) => { o[key] = v; }); });
}
onField('no-fill', (on) => { const fill = on ? 'none' : $('fill').value; defaults.fill = fill; selected().forEach((o) => { o.fill = fill; }); });
onField('name', (v) => { const [o] = selected(); if (o) o.name = v.slice(0, 60) || o.name; });
function setBox(key, v) {
  const list = selected();
  if (list.length === 1) {
    const o = list[0];
    if (key === 'rotation') { o.rotation = G.normAngle(v); return; }
    if (key === 'x' || key === 'y') { o[key] = v; return; }
    const k = v / (key === 'w' ? o.w : o.h);
    if (o.type === 'text') { o.size = Math.max(4, Math.min(400, o.size * k)); o[key] = v; return; }
    const pivot = G.toWorld(o, [0, 0]);
    // Grow from the box's top-left corner, in the object's own frame.
    const r = o.rotation || 0, local = G.rotate(G.centerOf(o), pivot, -r);
    const sx = key === 'w' ? k : 1, sy = key === 'h' ? k : 1;
    const c = G.rotate([pivot[0] + (local[0] - pivot[0]) * sx, pivot[1] + (local[1] - pivot[1]) * sy], pivot, r);
    o.w *= sx; o.h *= sy; o.x = c[0] - o.w / 2; o.y = c[1] - o.h / 2;
    return;
  }
  const b = G.unionBounds(list.map(G.objectBounds));
  if (key === 'x' || key === 'y') {
    const d = v - (key === 'x' ? b.x0 : b.y0);
    list.forEach((o) => replace(G.translate(o, key === 'x' ? d : 0, key === 'y' ? d : 0)));
  } else if (key === 'w' || key === 'h') {
    const k = v / (key === 'w' ? b.x1 - b.x0 : b.y1 - b.y0);
    list.forEach((o) => replace(G.scaleAbout(o, [b.x0, b.y0], key === 'w' ? k : 1, key === 'h' ? k : 1)));
  }
}
onField('x', (v) => setBox('x', v)); onField('y', (v) => setBox('y', v));
onField('width', (v) => setBox('w', v)); onField('height', (v) => setBox('h', v));
onField('rotation', (v) => setBox('rotation', v));
onField('radius', (v) => { shapeDefaults.radius = v; selected().filter((o) => o.type === 'rect').forEach((o) => { o.radius = v; }); });
onField('sides', (v) => { shapeDefaults.sides = Math.round(v); selected().filter((o) => o.type === 'polygon').forEach((o) => { o.sides = Math.round(v); }); });
onField('star', (v) => { shapeDefaults.star = v; selected().filter((o) => o.type === 'polygon').forEach((o) => { o.star = v; if (/^(Polygon|Star)$/.test(o.name)) o.name = v ? 'Star' : 'Polygon'; }); });
onField('inner', (v) => { shapeDefaults.inner = v / 100; selected().filter((o) => o.type === 'polygon').forEach((o) => { o.inner = v / 100; }); });
const textField = (id, key, map = (v) => v) => onField(id, (v) => selected().filter((o) => o.type === 'text').forEach((o) => { o[key] = map(v); }));
textField('text', 'text', (v) => v.slice(0, 120));
textField('font', 'font'); textField('size', 'size'); textField('weight', 'weight', Number); textField('tracking', 'tracking');

/* ── tools ───────────────────────────────────────────────── */
const tips = {
  select: 'Click to select, Shift-click to add, drag empty space to box-select. Square handles resize; the round one rotates.',
  nodes: 'Click a shape to show its points. Drag points and handles; Alt-drag a handle for a sharp turn. Double-click the outline to add a point.',
  pen: 'Click for a corner, drag for a curve. Click the first point to close; Enter or Escape finishes an open path.',
  rect: 'Drag a rectangle. Shift for a square, Alt from the centre. Set rounded corners in Design properties.',
  ellipse: 'Drag an ellipse. Shift for a circle, Alt from the centre.',
  polygon: 'Drag a polygon. Set sides, or make it a star, in Design properties. Shift keeps it regular.',
  text: 'Click to add text, then type the words and pick a font in Design properties.',
};
function setTool(next) {
  if (pen && next !== 'pen') finishPen();
  tool = next;
  root.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
  $('tool-tip').textContent = tips[tool];
  if (tool === 'nodes') {
    const list = selected();
    editId = list.length ? list[list.length - 1].id : null;
    selNodes = new Set();
  }
  canvas.dataset.tool = tool;
  renderGuides(); syncFields();
}
root.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

function rawPoint(e) {
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(canvas.getScreenCTM().inverse());
  return [Math.max(-1000, Math.min(1640, p.x)), Math.max(-1000, Math.min(1480, p.y))];
}
const GRID = 10;
const snapOn = () => $('snap').checked;
const snap = (v) => (snapOn() ? Math.round(v / GRID) * GRID : v);
const point = (e) => { const p = rawPoint(e); return [snap(p[0]), snap(p[1])]; };

/* ── pen ─────────────────────────────────────────────────── */
function finishPen(closed = false) {
  const p = pen; pen = null; penHover = null;
  if (!p || p.nodes.length < 2) { renderGuides(); if (p?.nodes.length === 1) status('A path needs at least two points.'); return; }
  change(() => {
    const sub = { closed, nodes: p.nodes.map((n) => ({ ...n, k: n.i && n.o ? n.k : 'corner' })) };
    const base = make('path', 0, 0, 1, 1, closed ? {} : { fill: 'none', strokeWidth: Math.max(3, defaults.strokeWidth) });
    const o = G.withWorldSubpaths(base, [sub], 0);
    o.name = closed ? 'Pen shape' : 'Pen line';
    objects.push(o); sel = new Set([o.id]); checkShapes();
  });
  status(closed ? 'Shape closed. Switch to Points (A) to fine-tune it.' : 'Open path finished. Switch to Points (A) to fine-tune it.');
}

/* ── pointer input ───────────────────────────────────────── */
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || gesture) return;
  e.preventDefault();
  if (isDoublePress(e) && onDoublePress(e)) return;
  canvas.focus({ preventScroll: true });
  const p = point(e), raw = rawPoint(e), k = px();
  const hitEl = e.target.closest('[data-object]');
  const hit = hitEl ? find(Number(hitEl.dataset.object)) : null;
  const before = snapshot();
  const start = (g) => { gesture = { ...g, before, start: p, raw, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); };

  if (tool === 'pen') {
    if (!pen) pen = { nodes: [] };
    const first = pen.nodes[0];
    if (first && pen.nodes.length >= 2 && G.vec.dist(raw, first.p) < 9 * k) { start({ mode: 'pen-close', noFrame: true }); return; }
    pen.nodes.push(G.node(p));
    start({ mode: 'pen', noFrame: true });
    status(`${pen.nodes.length} point${pen.nodes.length > 1 ? 's' : ''} · drag to curve, click the first point to close, Enter to finish.`);
    renderGuides();
    return;
  }
  if (tool === 'text') {
    change(() => { const o = make('text', p[0], p[1], 200, 34, { text: 'YOUR MARK', font: 'sans', size: 32, weight: 900, tracking: 0, fill: defaults.fill === 'none' ? '#173f3e' : defaults.fill }); objects.push(o); sel = new Set([o.id]); });
    setTool('select'); $('text').focus(); $('text').select();
    return;
  }
  if (tool === 'select') {
    const tf = e.target.closest('[data-tf]')?.dataset.tf;
    if (tf) {
      const f = frame();
      start({ mode: tf === 'rot' ? 'rotate' : 'scale', handle: tf, frame: f, originals: selected().map(copy) });
      return;
    }
    if (hit && !hit.locked) {
      selectHit(hit, { add: e.shiftKey });
      if (!sel.has(hit.id)) { render(); return; }
      if (e.altKey) {
        // Alt-drag copies: duplicate in place, then move the copies.
        const copies = duplicate(selected(), 0);
        sel = new Set(copies.map((o) => o.id));
      }
      start({ mode: 'move', originals: selected().map(copy), bounds: G.unionBounds(selected().map(G.objectBounds)) });
      render();
      return;
    }
    if (!e.shiftKey) sel = new Set();
    marquee = [raw, raw];
    start({ mode: 'marquee', add: e.shiftKey, noFrame: true });
    render();
    return;
  }
  if (tool === 'nodes') {
    const target = find(editId);
    const handleEl = e.target.closest('[data-handle]'), anchorEl = e.target.closest('[data-anchor]');
    if (target && (handleEl || anchorEl)) {
      const subs = G.worldSubpaths(target);
      if (handleEl) {
        const [si, ni, which] = handleEl.dataset.handle.split(':');
        start({ mode: 'handle', si: +si, ni: +ni, which, subs, original: copy(target) });
      } else {
        const key = anchorEl.dataset.anchor;
        if (e.shiftKey) { selNodes.has(key) ? selNodes.delete(key) : selNodes.add(key); }
        else if (!selNodes.has(key)) selNodes = new Set([key]);
        start({ mode: 'anchor', subs, original: copy(target) });
      }
      render();
      return;
    }
    if (hit && !hit.locked && hit.id !== editId) {
      editId = hit.id; sel = new Set([hit.id]); selNodes = new Set();
      if (hit.type === 'text') status('Text has no points to edit. Use Design properties to change it.');
      else status(`${hit.name}: ${G.shapeSubpaths(hit).reduce((n, s) => n + s.nodes.length, 0)} points. Drag one, or box-select several.`);
      render();
      return;
    }
    if (!e.shiftKey) selNodes = new Set();
    marquee = [raw, raw];
    start({ mode: 'node-marquee', noFrame: true });
    if (!hit && !target) { editId = null; sel = new Set(); }
    render();
    return;
  }
  // rect / ellipse / polygon
  const o = make(tool, p[0], p[1], 1, 1);
  objects.push(o); sel = new Set([o.id]);
  start({ mode: 'draw', obj: o.id });
  render();
});

canvas.addEventListener('pointermove', (e) => {
  if (!gesture) {
    if (tool === 'pen' && pen) { penHover = point(e); renderGuides(); }
    return;
  }
  if (gesture.id !== e.pointerId) return;
  const g = gesture, p = point(e), raw = rawPoint(e);
  if (g.mode === 'pen' || g.mode === 'pen-close') {
    const n = g.mode === 'pen' ? pen.nodes[pen.nodes.length - 1] : pen.nodes[0];
    if (G.vec.dist(raw, g.raw) < 3 * px()) return;
    const drag = raw, mirror = [2 * n.p[0] - drag[0], 2 * n.p[1] - drag[1]];
    if (g.mode === 'pen') { n.o = drag; n.i = e.altKey ? n.i : (pen.nodes.length > 1 ? mirror : null); n.k = e.altKey ? 'corner' : 'symmetric'; }
    else { n.i = mirror; if (n.o) n.k = 'symmetric'; }
    g.curved = true;
    renderGuides();
    return;
  }
  if (g.mode === 'marquee' || g.mode === 'node-marquee') { marquee[1] = raw; renderGuides(); return; }
  if (g.mode === 'move') {
    let dx = p[0] - g.start[0], dy = p[1] - g.start[1];
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    if (snapOn()) { dx = snap(g.bounds.x0 + dx) - g.bounds.x0; dy = snap(g.bounds.y0 + dy) - g.bounds.y0; }
    g.originals.forEach((o) => replace(G.translate(o, dx, dy)));
  }
  if (g.mode === 'rotate') {
    const c = g.frame.center;
    let a = (Math.atan2(raw[1] - c[1], raw[0] - c[0]) - Math.atan2(g.raw[1] - c[1], g.raw[0] - c[0])) * 180 / Math.PI;
    if (e.shiftKey) {
      // Snap the resulting angle (single object) or the turn (several) to 15°.
      const base = g.frame.single ? g.frame.rot : 0;
      a = Math.round((base + a) / 15) * 15 - base;
    }
    g.originals.forEach((o) => replace(G.rotateAbout(o, c, a)));
    status(`Rotate ${Math.round(G.normAngle((g.frame.single ? g.frame.rot : 0) + a))}°`);
  }
  if (g.mode === 'scale') scaleGesture(g, raw, e);
  if (g.mode === 'draw') {
    const o = find(g.obj);
    let dx = p[0] - g.start[0], dy = p[1] - g.start[1];
    if (e.shiftKey) {
      // Equal sides: a square, a circle, or a polygon at its true proportions.
      const aspect = o.type === 'polygon' ? G.polygonAspect(o.sides, o.star, o.inner) : 1;
      const w = Math.max(Math.abs(dx), Math.abs(dy) / aspect);
      dx = (dx < 0 ? -1 : 1) * w; dy = (dy < 0 ? -1 : 1) * w * aspect;
    }
    if (e.altKey) { o.x = g.start[0] - Math.abs(dx); o.y = g.start[1] - Math.abs(dy); o.w = Math.max(1, 2 * Math.abs(dx)); o.h = Math.max(1, 2 * Math.abs(dy)); }
    else { o.x = g.start[0] + Math.min(0, dx); o.y = g.start[1] + Math.min(0, dy); o.w = Math.max(1, Math.abs(dx)); o.h = Math.max(1, Math.abs(dy)); }
  }
  if (g.mode === 'anchor' || g.mode === 'handle') {
    const subs = copy(g.subs);
    if (g.mode === 'handle') {
      G.moveHandle(subs[g.si], g.ni, g.which, raw, e.altKey);
      if (snapOn()) { /* handles follow the pointer exactly; snapping them makes curves lumpy */ }
      mission('curve');
    } else {
      let d = [p[0] - g.start[0], p[1] - g.start[1]];
      if (e.shiftKey) d = Math.abs(d[0]) > Math.abs(d[1]) ? [d[0], 0] : [0, d[1]];
      for (const key of selNodes) {
        const [si, ni] = key.split(':').map(Number), n = subs[si]?.nodes[ni];
        if (n) G.moveAnchor(subs[si], ni, [n.p[0] + d[0], n.p[1] + d[1]]);
      }
    }
    replace(G.withWorldSubpaths(g.original, subs));
    g.moved = true;
  }
  drawArtwork(); renderGuides(); syncFields();
});

function scaleGesture(g, raw, e) {
  const f = g.frame, h = HANDLES[g.handle], rot = f.rot;
  // Work in the frame's own (unrotated) coordinates, centred on the frame.
  const toF = (q) => G.rotate(q, f.center, -rot);
  const cs = f.corners.map(toF);
  const x0 = Math.min(...cs.map((c) => c[0])), x1 = Math.max(...cs.map((c) => c[0]));
  const y0 = Math.min(...cs.map((c) => c[1])), y1 = Math.max(...cs.map((c) => c[1]));
  const q = toF(raw);
  const fromCentre = e.altKey;
  const fx = fromCentre ? (x0 + x1) / 2 : h[0] === 0 ? x1 : x0;
  const fy = fromCentre ? (y0 + y1) / 2 : h[1] === 0 ? y1 : y0;
  const ex = h[0] === 0 ? x0 : x1, ey = h[1] === 0 ? y0 : y1;
  let sx = h[0] === 0.5 ? 1 : (q[0] - fx) / (ex - fx || 1);
  let sy = h[1] === 0.5 ? 1 : (q[1] - fy) / (ey - fy || 1);
  sx = Math.max(0.01, sx); sy = Math.max(0.01, sy);
  const onlyText = g.originals.every((o) => o.type === 'text');
  if (e.shiftKey || onlyText) {
    const s = h[0] === 0.5 ? sy : h[1] === 0.5 ? sx : Math.max(sx, sy);
    sx = sy = s;
  }
  const origin = G.rotate([fx, fy], f.center, rot);
  if (f.single) {
    const o = g.originals[0];
    const c = G.rotate(G.centerOf(o), origin, -rot);
    const c2 = G.rotate([origin[0] + (c[0] - origin[0]) * sx, origin[1] + (c[1] - origin[1]) * sy], origin, rot);
    const w = Math.max(1, o.w * sx), hh = Math.max(1, o.h * sy);
    const out = { ...o, w, h: hh, x: c2[0] - w / 2, y: c2[1] - hh / 2 };
    if (o.type === 'text') out.size = Math.max(4, Math.min(400, o.size * sy));
    replace(out);
  } else g.originals.forEach((o) => replace(G.scaleAbout(o, origin, sx, sy)));
  status(`Scale ${Math.round(sx * 100)}% × ${Math.round(sy * 100)}%`);
}

function endGesture(e, cancel = false) {
  if (!gesture || gesture.id !== e.pointerId) return;
  const g = gesture;
  gesture = null;
  if (g.mode === 'pen' || g.mode === 'pen-close') {
    if (cancel) { if (g.mode === 'pen') pen.nodes.pop(); renderGuides(); return; }
    if (g.curved) mission('curve');
    if (g.mode === 'pen-close') { finishPen(true); return; }
    renderGuides();
    return;
  }
  if (g.mode === 'marquee' || g.mode === 'node-marquee') {
    const [a, b] = marquee; marquee = null;
    const box = { x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) };
    const tiny = box.x1 - box.x0 < 2 && box.y1 - box.y0 < 2;
    if (g.mode === 'marquee' && !tiny) {
      for (const o of objects) {
        if (!o.visible || o.locked) continue;
        const ob = G.objectBounds(o);
        if (ob.x0 <= box.x1 && ob.x1 >= box.x0 && ob.y0 <= box.y1 && ob.y1 >= box.y0) (o.group != null ? members(o.group) : [o]).forEach((m) => { if (!m.locked) sel.add(m.id); });
      }
    }
    if (g.mode === 'node-marquee' && !tiny) {
      const target = find(editId);
      if (target && target.type !== 'text') G.worldSubpaths(target).forEach((s, si) => s.nodes.forEach((n, ni) => {
        if (n.p[0] >= box.x0 && n.p[0] <= box.x1 && n.p[1] >= box.y0 && n.p[1] <= box.y1) selNodes.add(`${si}:${ni}`);
      }));
    }
    render();
    if (g.mode === 'marquee' && sel.size) status(`${sel.size} object${sel.size > 1 ? 's' : ''} selected.`);
    return;
  }
  if (cancel) { load({ ...JSON.parse(g.before), notes: '' }); render(); return; }
  if (g.mode === 'draw') {
    const o = find(g.obj);
    if (o && (o.w < 4 || o.h < 4)) { objects = objects.filter((x) => x.id !== o.id); sel = new Set(); render(); status('Drag a little farther to draw a shape.'); return; }
    checkShapes();
  }
  if ((g.mode === 'anchor' || g.mode === 'handle') && g.moved && g.original.type !== 'path') status(`${g.original.name} is now a path with editable points.`);
  remember(g.before);
}
canvas.addEventListener('pointerup', (e) => endGesture(e));
canvas.addEventListener('pointercancel', (e) => endGesture(e, true));
canvas.addEventListener('pointerleave', () => { if (penHover) { penHover = null; renderGuides(); } });

/* Double-press, detected by hand: every press re-renders the artwork, so the
 * element under the first press is gone by the second and the browser never
 * fires click/dblclick. Returns true when the double-press did something. */
let lastPress = null;
function isDoublePress(e) {
  const now = performance.now(), last = lastPress;
  lastPress = { t: now, x: e.clientX, y: e.clientY };
  if (!last || now - last.t > 450 || Math.hypot(e.clientX - last.x, e.clientY - last.y) > 8) return false;
  lastPress = null;
  return true;
}
function onDoublePress(e) {
  const under = document.elementFromPoint(e.clientX, e.clientY) || e.target;
  const hitEl = under.closest?.('[data-object]');
  const hit = hitEl ? find(Number(hitEl.dataset.object)) : null;
  if (tool === 'select') {
    if (!hit || hit.locked) return false;
    if (hit.group != null && !(sel.size === 1 && sel.has(hit.id))) { sel = new Set([hit.id]); render(); status(`Picked ${hit.name} out of its group. Double-click again to edit its points.`); return true; }
    if (hit.type === 'text') { sel = new Set([hit.id]); render(); $('text').focus(); $('text').select(); return true; }
    sel = new Set([hit.id]); setTool('nodes'); editId = hit.id; render();
    status(`Editing the points of ${hit.name}. Press V to go back to Select.`);
    return true;
  }
  if (tool === 'pen' && pen) { finishPen(false); return true; }
  if (tool !== 'nodes') return false;
  const target = find(editId);
  if (!target || target.type === 'text') return false;
  const anchorEl = under.closest?.('[data-anchor]');
  const raw = rawPoint(e);
  let handled = true;
  change(() => {
    const subs = G.worldSubpaths(target);
    if (anchorEl) {
      const [si, ni] = anchorEl.dataset.anchor.split(':').map(Number);
      const n = subs[si].nodes[ni];
      G.setNodeKind(subs[si], ni, n.k === 'corner' ? 'smooth' : 'corner');
      selNodes = new Set([`${si}:${ni}`]);
      status(n.k === 'corner' ? 'Point is now a corner.' : 'Point is now smooth: its handles stay in line.');
      if (n.k !== 'corner') mission('curve');
    } else {
      const near = G.nearestOnSubpaths(subs, raw);
      if (!near || near.d > 10 * px()) { handled = false; return; }
      const at = G.insertNode(subs[near.sub], near.seg, near.t);
      selNodes = new Set([`${near.sub}:${at}`]);
      status('Point added. The curve keeps its shape until you move it.');
    }
    replace(G.withWorldSubpaths(target, subs));
  });
  return handled;
}

/* ── commands ────────────────────────────────────────────── */
function duplicate(list, offset = 16) {
  const groupMap = new Map(), out = [];
  for (const o of list) {
    const c = copy(o);
    c.id = ++uid; c.x += offset; c.y += offset;
    if (offset) c.name = `${o.name} copy`.slice(0, 60);
    if (o.group != null) { if (!groupMap.has(o.group)) groupMap.set(o.group, ++gid); c.group = groupMap.get(o.group); }
    out.push(c);
  }
  objects.push(...out);
  tidyGroups();
  return out;
}
function nodeKeys() { return [...selNodes].map((k) => k.split(':').map(Number)); }
function editPoints(fn) {
  const target = find(editId);
  if (!target || target.type === 'text') return;
  change(() => {
    const subs = G.worldSubpaths(target);
    const result = fn(subs, target);
    if (result === false) return;
    const kept = (result || subs).filter((s) => s.nodes.length >= 1);
    if (!kept.length) { objects = objects.filter((o) => o.id !== target.id); sel.delete(target.id); editId = null; selNodes = new Set(); return; }
    replace(G.withWorldSubpaths(target, kept));
  });
}
function align(mode) {
  const list = units();
  if (!list.length) return;
  const target = list.length > 1 ? G.unionBounds(list.map((u) => u.bounds)) : { x0: 0, y0: 0, x1: G.BOARD.w, y1: G.BOARD.h };
  const deltas = mode.startsWith('dist') ? G.distributeDeltas(list.map((u) => u.bounds), mode === 'dist-x' ? 'x' : 'y') : G.alignDeltas(list.map((u) => u.bounds), mode, target);
  change(() => list.forEach((u, k) => u.ids.forEach((id) => replace(G.translate(find(id), deltas[k][0], deltas[k][1])))));
  status(list.length > 1 ? 'Aligned to each other.' : 'Aligned to the artboard.');
}
const G_OPS = { unite: 'Unite', minus: 'Minus front', intersect: 'Intersect', exclude: 'Exclude' };
let kernelPromise = null;
const getKernel = () => (kernelPromise ||= Promise.all([import('../../vendor/manifold/manifold.js'), import('./vector-boolean.mjs')])
  .then(async ([{ default: Module }, booleans]) => { const k = await Module(); k.setup(); return { k, booleans }; }));
async function combineShapes(op) {
  const operands = objects.filter((o) => sel.has(o.id) && o.type !== 'text' && o.visible);
  if (operands.length < 2) { status('Select two or more shapes (text cannot be combined).'); return; }
  status('Combining…');
  let kit;
  try { kit = await getKernel(); } catch { kernelPromise = null; status('Could not load the shape kernel. Check the connection and try again.'); return; }
  let result;
  try { result = kit.booleans.combine(kit.k, operands, op); } catch { status('Those shapes could not be combined.'); return; }
  change(() => {
    // The result takes the frontmost operand's place in the stack.
    const top = Math.max(...operands.map((o) => indexOf(o.id)));
    const at = objects.slice(0, top).filter((o) => !operands.includes(o)).length;
    objects = objects.filter((o) => !operands.includes(o));
    if (result) { result.id = ++uid; objects.splice(at, 0, result); sel = new Set([result.id]); } else sel = new Set();
    tidyGroups();
    mission('combine');
  });
  const subs = result?.subpaths.length || 0;
  status(result ? `${G_OPS[op]} → one path${subs > 1 ? ` in ${subs} parts` : ''}. Its points are editable (A).` : 'Nothing was left: those shapes do not overlap that way.');
}
function reorder(kind) {
  const list = selected();
  if (!list.length) return;
  change(() => {
    const picked = objects.filter((o) => sel.has(o.id)), rest = objects.filter((o) => !sel.has(o.id));
    if (kind === 'front') objects = [...rest, ...picked];
    else if (kind === 'back') objects = [...picked, ...rest];
    else {
      const step = kind === 'raise' ? 1 : -1;
      const order = objects.map((o, i) => i).filter((i) => sel.has(objects[i].id));
      if (step > 0) order.reverse();
      for (const i of order) {
        let j = i + step;
        while (j >= 0 && j < objects.length && sel.has(objects[j].id)) j += step;
        if (j < 0 || j >= objects.length) continue;
        // Hop over a whole group rather than splitting it.
        const g = objects[j].group;
        if (g != null && !sel.has(objects[j].id)) while (j + step >= 0 && j + step < objects.length && objects[j + step].group === g) j += step;
        const [o] = objects.splice(i, 1);
        objects.splice(j, 0, o);
      }
    }
    tidyGroups();
    mission('arrange');
  });
}
function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  status(`Downloaded ${name}.`);
}
function exportSvg() {
  const svg = svgNode('svg', { xmlns: ns, viewBox: `0 0 ${G.BOARD.w} ${G.BOARD.h}`, width: G.BOARD.w, height: G.BOARD.h });
  svgNode('title', {}, svg).textContent = 'Emblem made in Path Studio';
  const groups = new Map();
  for (const o of objects) {
    if (!o.visible) continue;
    let parent = svg;
    if (o.group != null) {
      if (!groups.has(o.group)) groups.set(o.group, svgNode('g', { id: `group-${o.group}` }, svg));
      parent = groups.get(o.group);
    }
    const el = drawObject(o, parent, false);
    el.setAttribute('id', `${o.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'shape'}-${o.id}`);
  }
  return new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
}
async function exportPng() {
  const url = URL.createObjectURL(exportSvg());
  try {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = 1280; c.height = 960;
    c.getContext('2d').drawImage(img, 0, 0, 1280, 960);
    c.toBlob((blob) => { if (blob) download(blob, 'my-emblem.png'); else status('PNG export failed. Try SVG.'); });
  } catch { status('PNG export failed. Try SVG.'); } finally { URL.revokeObjectURL(url); }
}
function undo(redo = false) {
  const from = redo ? future : history, to = redo ? history : future;
  if (!from.length) return;
  to.push(snapshot());
  const data = JSON.parse(from.pop());
  const keep = new Set([...sel]);
  objects = data.objects; missions = data.missions;
  sel = new Set([...keep].filter((id) => find(id)));
  if (!find(editId)) editId = null;
  selNodes = new Set(); pen = null;
  persist(); render(); status(redo ? 'Change restored.' : 'Change undone.');
}
function nudge(dx, dy) {
  if (tool === 'nodes' && selNodes.size && find(editId)) {
    editPoints((subs) => { for (const [si, ni] of nodeKeys()) { const n = subs[si]?.nodes[ni]; if (n) G.moveAnchor(subs[si], ni, [n.p[0] + dx, n.p[1] + dy]); } });
    return;
  }
  if (!sel.size) return;
  change(() => selected().forEach((o) => replace(G.translate(o, dx, dy))));
}
function deleteSelection() {
  if (tool === 'nodes' && selNodes.size && find(editId)) {
    editPoints((subs) => {
      const keys = nodeKeys().sort((a, b) => b[1] - a[1]);
      let refused = false;
      for (const [si, ni] of keys) if (subs[si] && !G.deleteNode(subs[si], ni)) { subs[si].nodes = []; refused = true; }
      selNodes = new Set();
      status(refused ? 'A path with fewer than two points was removed.' : 'Point deleted.');
    });
    return;
  }
  if (!sel.size) return;
  change(() => { objects = objects.filter((o) => !sel.has(o.id)); sel = new Set(); editId = null; tidyGroups(); });
}
const commands = {
  new: () => change(() => { objects = []; sel = new Set(); missions = {}; pen = null; editId = null; status('New artboard. Undo brings your previous artwork back.'); }),
  starter: () => change(() => { starter(); missions = {}; pen = null; editId = null; status('Starter badge opened. Double-click the canopy to edit its points.'); }),
  undo: () => undo(), redo: () => undo(true),
  duplicate: () => { if (sel.size) change(() => { const c = duplicate(selected()); sel = new Set(c.map((o) => o.id)); checkShapes(); }); },
  delete: deleteSelection,
  group: () => {
    if (sel.size < 2) return;
    change(() => { const g = ++gid; selected().forEach((o) => { o.group = g; }); tidyGroups(); });
    status('Grouped. Click any part to select the group; double-click to pick one part.');
  },
  ungroup: () => change(() => { selected().forEach((o) => { delete o.group; }); tidyGroups(); status('Ungrouped.'); }),
  'flip-x': () => { const f = frame(); if (f) change(() => selected().forEach((o) => replace(G.flip(o, 'x', f.center)))); },
  'flip-y': () => { const f = frame(); if (f) change(() => selected().forEach((o) => replace(G.flip(o, 'y', f.center)))); },
  'to-path': () => change(() => { selected().filter((o) => o.type !== 'path' && o.type !== 'text').forEach((o) => replace(G.toPath(o))); status('Converted to a path. Press A to edit its points.'); }),
  lock: () => change(() => { selected().forEach((o) => { o.locked = true; }); status('Locked. Unlock it with 🔓 in the Objects list.'); sel = new Set(); }),
  front: () => reorder('front'), raise: () => reorder('raise'), lower: () => reorder('lower'), back: () => reorder('back'),
  fit: () => { $('zoom').value = '1'; zoom(); root.querySelector('.vs-canvas-scroll').scrollTo(0, 0); },
  svg: () => { download(exportSvg(), 'my-emblem.svg'); mission('export'); persist(); render(); },
  png: exportPng,
  save: () => download(new Blob([JSON.stringify(projectData(), null, 2)], { type: 'application/json' }), 'my-emblem.path-studio.json'),
  open: () => { $('project-file').value = ''; $('project-file').click(); },
  'node-corner': () => editPoints((subs) => nodeKeys().forEach(([si, ni]) => subs[si] && G.setNodeKind(subs[si], ni, 'corner'))),
  'node-smooth': () => { editPoints((subs) => nodeKeys().forEach(([si, ni]) => subs[si] && G.setNodeKind(subs[si], ni, 'smooth'))); mission('curve'); },
  'node-symmetric': () => { editPoints((subs) => nodeKeys().forEach(([si, ni]) => subs[si] && G.setNodeKind(subs[si], ni, 'symmetric'))); mission('curve'); },
  'node-delete': deleteSelection,
  'node-break': () => {
    const [first] = nodeKeys();
    if (!first) return;
    editPoints((subs) => {
      const [si, ni] = first;
      const pieces = G.breakAt(subs[si], ni);
      subs.splice(si, 1, ...pieces);
      selNodes = new Set();
      status(pieces.length > 1 ? 'Path cut in two at that point.' : 'Path opened at that point.');
      return subs;
    });
  },
  'path-close': () => editPoints((subs, target) => {
    const close = !subs.every((s) => s.closed);
    subs.forEach((s) => { if (s.nodes.length >= 3 || !close) s.closed = close; });
    if (close && target.fill === 'none') target.fill = defaults.fill === 'none' ? '#176b65' : defaults.fill;
  }),
  fullscreen: async () => {
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    if (root.classList.contains('vs-expanded')) { root.classList.remove('vs-expanded'); root.querySelector('[data-command=fullscreen]').textContent = 'Full screen'; return; }
    try { await root.requestFullscreen(); } catch { root.classList.add('vs-expanded'); root.querySelector('[data-command=fullscreen]').textContent = 'Exit full screen'; }
  },
};
for (const a of ['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom']) commands[`align-${a}`] = () => align(a);
commands['dist-x'] = () => align('dist-x'); commands['dist-y'] = () => align('dist-y');
for (const op of ['unite', 'minus', 'intersect', 'exclude']) commands[`bool-${op}`] = () => combineShapes(op);
// A button can disable itself (Combine needs two shapes; it leaves one), which drops
// focus to <body> and kills the shortcuts. Hand focus back to the studio.
const keepFocus = () => { const el = document.activeElement; if (!root.contains(el) || el?.disabled) root.focus({ preventScroll: true }); };
root.querySelectorAll('[data-command]').forEach((b) => b.addEventListener('click', async () => {
  if (gesture) return;
  try { await commands[b.dataset.command]?.(); } finally { keepFocus(); }
}));
document.addEventListener('fullscreenchange', () => { root.querySelector('[data-command=fullscreen]').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; });

/* ── keyboard ────────────────────────────────────────────── */
root.addEventListener('keydown', (e) => {
  if (isTyping(e.target) || gesture) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); undo(e.shiftKey); return; }
  if (mod && k === 'y') { e.preventDefault(); undo(true); return; }
  if (mod && k === 'd') { e.preventDefault(); commands.duplicate(); return; }
  if (mod && k === 'a') { e.preventDefault(); if (tool === 'nodes' && find(editId)) { selNodes = new Set(G.shapeSubpaths(find(editId)).flatMap((s, si) => s.nodes.map((n, ni) => `${si}:${ni}`))); } else sel = new Set(objects.filter((o) => o.visible && !o.locked).map((o) => o.id)); render(); return; }
  if (mod && k === 'g') { e.preventDefault(); e.shiftKey ? commands.ungroup() : commands.group(); return; }
  if (mod && k === 'c') { if (sel.size) { clipboard = copy(selected()); status(`Copied ${clipboard.length} object${clipboard.length > 1 ? 's' : ''}.`); e.preventDefault(); } return; }
  if (mod && k === 'x') { if (sel.size) { clipboard = copy(selected()); deleteSelection(); e.preventDefault(); } return; }
  if (mod && k === 'v') { if (clipboard) { e.preventDefault(); change(() => { const c = duplicate(clipboard, 12); clipboard = copy(c); sel = new Set(c.map((o) => o.id)); }); } return; }
  if (mod && (e.key === ']' || e.key === '}')) { e.preventDefault(); reorder(e.shiftKey ? 'front' : 'raise'); return; }
  if (mod && (e.key === '[' || e.key === '{')) { e.preventDefault(); reorder(e.shiftKey ? 'back' : 'lower'); return; }
  if (e.key === 'Escape') {
    if (pen) { finishPen(false); return; }
    if (tool === 'nodes' && selNodes.size) { selNodes = new Set(); render(); return; }
    sel = new Set(); editId = null;
    root.classList.remove('vs-expanded');
    root.querySelector('[data-command=fullscreen]').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
    render(); return;
  }
  if (e.key === 'Enter' && pen) { e.preventDefault(); finishPen(false); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (pen) { pen.nodes.pop(); if (!pen.nodes.length) pen = null; renderGuides(); return; } deleteSelection(); return; }
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const n = e.shiftKey ? 10 : 1;
    nudge(k === 'arrowleft' ? -n : k === 'arrowright' ? n : 0, k === 'arrowup' ? -n : k === 'arrowdown' ? n : 0);
    return;
  }
  if (mod || e.altKey) return;
  const tools = { v: 'select', a: 'nodes', p: 'pen', r: 'rect', e: 'ellipse', s: 'polygon', t: 'text' };
  if (tools[k]) { e.preventDefault(); setTool(tools[k]); }
});

/* ── files & start-up ────────────────────────────────────── */
$('grid').addEventListener('change', () => { $('grid-art').style.display = $('grid').checked ? '' : 'none'; });
function zoom() { root.querySelector('.vs-paper').style.width = `${Number($('zoom').value) * 100}%`; requestAnimationFrame(() => { drawArtwork(); renderGuides(); }); }
$('zoom').addEventListener('change', zoom);
$('project-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw Error('Project too large');
    const data = G.validateProject(JSON.parse(await file.text()));
    change(() => { load(data); document.getElementById('design-notes').value = data.notes; });
    status('Editable project opened.');
  } catch { status('Could not open this file. Choose a Path Studio JSON project smaller than 2 MB. Your current artwork is kept.'); }
});
const notes = document.getElementById('design-notes');
notes.addEventListener('input', persist);
document.getElementById('export-notes').addEventListener('click', () => download(new Blob([notes.value], { type: 'text/plain;charset=utf-8' }), 'emblem-reflection.txt'));
new ResizeObserver(() => { if (!gesture) renderGuides(); }).observe(canvas);
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) { const data = G.validateProject(JSON.parse(saved)); load(data); notes.value = data.notes; status('Your local workspace has been restored.'); }
  else starter();
} catch { starter(); $('save-status').textContent = 'Download a project to keep your work'; }
render();
