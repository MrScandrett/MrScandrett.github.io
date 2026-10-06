// Boolean lab for Blender Lesson 02 (Windows & Doors): WallPanel + WindowCut with a
// Blender-style Boolean modifier panel, Outliner eye/camera toggles, Display As, Apply,
// a render preview, a guided drill and a repair bench built from the lesson's Fix list.
//
// Both objects are axis-aligned boxes, so Difference/Intersect/Union are computed
// exactly as box arithmetic (A − B splits A into at most six boxes); every opening
// size and margin the lab reports is the real result. Coordinates are Blender's (Z up).
import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

const lab = document.querySelector('[data-bl-boolean]');
if (lab) init(lab);

function init(lab) {
  const $ = sel => lab.querySelector(sel);
  const canvas = $('[data-bbl-canvas]');
  if (!hasWebGL()) { lab.classList.add('is-unavailable'); $('[data-bbl-nowebgl]').hidden = false; return; }

  const EPS = 1e-4;
  const NAMES = { wall: 'WallPanel', cut: 'WindowCut' };
  const OTHER = { wall: 'cut', cut: 'wall' };
  const b2t = (x, y, z) => new THREE.Vector3(x, z, -y);
  const near = (a, b, eps = 0.005) => Math.abs(a - b) <= eps;
  const trim = n => { const r = Math.round(n * 1000) / 1000; return String(Object.is(r, -0) ? 0 : r); };

  // ── state ─────────────────────────────────────────────────────────────────
  const fresh = () => ({
    objs: {
      wall: { exists: true, loc: [0, 0, 1], dim: [2, 0.15, 2], eye: true, cam: true, display: 'textured', baked: null },
      cut: { exists: true, loc: [0, 0, 1], dim: [1.2, 0.45, 1.2], eye: true, cam: true, display: 'textured', baked: null }
    },
    mod: null, // { owner, op, object, solver, viewport, render }
    selected: ['cut'],
    active: 'cut'
  });
  let state = fresh();
  let undoStack = [];
  let redoStack = [];
  let renderView = false;
  let dirty = true;

  const clone = s => JSON.parse(JSON.stringify(s));
  function commit(mutator, event = { type: 'edit' }) {
    undoStack.push(clone(state));
    if (undoStack.length > 60) undoStack.shift();
    redoStack = [];
    mutator(state);
    changed(event);
  }
  function undo() {
    if (!undoStack.length) { say('Nothing to undo.'); return; }
    redoStack.push(clone(state));
    state = undoStack.pop();
    say('Undo.');
    changed({ type: 'undo' });
  }
  function redo() {
    if (!redoStack.length) { say('Nothing to redo.'); return; }
    undoStack.push(clone(state));
    state = redoStack.pop();
    say('Redo.');
    changed({ type: 'redo' });
  }

  // ── box arithmetic ────────────────────────────────────────────────────────
  const boxOf = o => ({ min: o.loc.map((c, i) => c - o.dim[i] / 2), max: o.loc.map((c, i) => c + o.dim[i] / 2) });
  const thick = b => [0, 1, 2].every(i => b.max[i] - b.min[i] > 1e-6);
  function overlap(a, b) {
    const o = { min: [0, 1, 2].map(i => Math.max(a.min[i], b.min[i])), max: [0, 1, 2].map(i => Math.min(a.max[i], b.max[i])) };
    return thick(o) ? o : null;
  }
  function subtract(a, b) {
    const o = overlap(a, b);
    if (!o) return [a];
    const out = [];
    const rest = { min: [...a.min], max: [...a.max] };
    for (const ax of [0, 1, 2]) {
      if (o.min[ax] > rest.min[ax]) { const p = { min: [...rest.min], max: [...rest.max] }; p.max[ax] = o.min[ax]; out.push(p); }
      if (o.max[ax] < rest.max[ax]) { const p = { min: [...rest.min], max: [...rest.max] }; p.min[ax] = o.max[ax]; out.push(p); }
      rest.min[ax] = o.min[ax];
      rest.max[ax] = o.max[ax];
    }
    return out.filter(thick);
  }
  function bounds(boxes) {
    if (!boxes.length) return null;
    return { min: [0, 1, 2].map(i => Math.min(...boxes.map(b => b.min[i]))), max: [0, 1, 2].map(i => Math.max(...boxes.map(b => b.max[i]))) };
  }
  // An object's own mesh: its box, or the boxes baked in by Apply (stored relative to loc
  // and scaled with Dimensions, like real mesh data under an object transform).
  function baseBoxes(id) {
    const o = state.objs[id];
    if (!o.baked) return [boxOf(o)];
    const s = o.dim.map((d, i) => d / o.baked.dim[i]);
    return o.baked.boxes.map(b => ({ min: b.min.map((v, i) => o.loc[i] + v * s[i]), max: b.max.map((v, i) => o.loc[i] + v * s[i]) }));
  }
  // Flush faces between owner and operand (same plane, overlapping area).
  function coplanarFaces(a, b) {
    const faces = [];
    for (const ax of [0, 1, 2]) {
      const others = [0, 1, 2].filter(i => i !== ax);
      if (!others.every(i => Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i]) > 1e-6)) continue;
      if (Math.abs(a.min[ax] - b.min[ax]) < EPS) faces.push({ ax, side: 'min' });
      if (Math.abs(a.max[ax] - b.max[ax]) < EPS) faces.push({ ax, side: 'max' });
    }
    return faces;
  }
  function modActive(forRender) {
    const m = state.mod;
    if (!m || !state.objs[m.owner].exists) return false;
    return forRender ? m.render : m.viewport;
  }
  function evaluated(id, forRender) {
    const base = baseBoxes(id);
    const m = state.mod;
    if (!modActive(forRender) || m.owner !== id || !m.object || !state.objs[m.object].exists) return base;
    const operand = bounds(baseBoxes(m.object));
    if (m.op === 'union') return [...base, operand];
    if (m.op === 'intersect') return base.map(b => overlap(b, operand)).filter(Boolean);
    let out = base.flatMap(b => subtract(b, operand));
    if (m.solver === 'fast') {
      // Fast can't resolve flush faces: it leaves a paper-thin cap over the cut.
      base.forEach(b => coplanarFaces(b, operand).forEach(({ ax, side }) => {
        const o = overlap(b, operand);
        if (!o) return;
        const skin = { min: [...o.min], max: [...o.max] };
        if (side === 'min') skin.max[ax] = b.min[ax] + 0.004; else skin.min[ax] = b.max[ax] - 0.004;
        out.push(skin);
      }));
    }
    return out;
  }

  // What the cut did to WallPanel, in words and numbers.
  function analysis() {
    const m = state.mod;
    const res = { kind: 'none', through: false, flush: false, margins: null, size: null };
    if (!m) { res.text = 'No modifier yet. WallPanel is still a plain box.'; return res; }
    const owner = NAMES[m.owner];
    if (!state.objs[m.owner].exists) { res.text = `${owner} was deleted.`; return res; }
    if (!m.object || !state.objs[m.object].exists) { res.kind = 'no-object'; res.text = `The Boolean on ${owner} has an empty Object field, so it does nothing.`; return res; }
    if (!m.viewport) { res.kind = 'hidden-mod'; res.text = 'The modifier’s viewport toggle is off, so the viewport shows the uncut mesh.'; }
    const A = bounds(baseBoxes(m.owner));
    const B = bounds(baseBoxes(m.object));
    const o = overlap(A, B);
    if (!o) { res.kind = 'miss'; res.text = `${NAMES[m.object]} doesn’t touch ${owner}, so there is nothing to ${m.op === 'union' ? 'join' : 'cut'}.`; return res; }
    if (m.op === 'union') { res.kind = 'union'; res.text = `Union: ${owner} now also includes ${NAMES[m.object]}’s volume, a block sticking out of both faces. Not a window.`; return res; }
    if (m.op === 'intersect') { res.kind = 'intersect'; res.text = `Intersect: only the overlap survives, a ${trim(o.max[0] - o.min[0])} × ${trim(o.max[1] - o.min[1])} × ${trim(o.max[2] - o.min[2])} m block. The rest of ${owner} is gone.`; return res; }
    if (m.owner !== 'wall') { res.kind = 'wrong-owner'; res.text = 'The Boolean is on WindowCut, so the wall is cutting the cutter: only WindowCut’s two ends stick out. Put the modifier on WallPanel.'; return res; }
    // Difference on the wall: look through Y (wall thickness)
    const front = B.min[1] - A.min[1], back = A.max[1] - B.max[1];
    res.flush = Math.abs(front) < EPS || Math.abs(back) < EPS;
    res.through = front <= EPS && back <= EPS;
    res.margins = { left: o.min[0] - A.min[0], right: A.max[0] - o.max[0], bottom: o.min[2] - A.min[2], top: A.max[2] - o.max[2] };
    res.size = [o.max[0] - o.min[0], o.max[2] - o.min[2]];
    const edges = Object.entries(res.margins).filter(([, v]) => v <= EPS).map(([k]) => k);
    if (!res.through) {
      res.kind = 'pocket';
      res.text = `A pocket, not an opening: WindowCut stops ${trim(Math.max(front, back))} m short of the wall’s ${front > back ? 'front' : 'back'} face, so a skin of wall is left.`;
    } else {
      res.kind = edges.length ? 'notch' : 'opening';
      const size = `${trim(res.size[0])} × ${trim(res.size[1])} m`;
      if (edges.includes('bottom') && !edges.includes('top')) res.text = `A doorway: ${size}, open at floor level. Wall left: ${trim(res.margins.left)} m left, ${trim(res.margins.right)} m right, ${trim(res.margins.top)} m above.`;
      else if (edges.length) res.text = `A ${size} notch: the cut breaks through the wall’s ${edges.join(' and ')} edge${edges.length > 1 ? 's' : ''}, so there is no frame on that side.`;
      else {
        const even = Object.values(res.margins).every(v => near(v, res.margins.left));
        res.text = `Through-opening ${size}. Wall left around it: ${even ? `${trim(res.margins.left)} m on every side` : `left ${trim(res.margins.left)}, right ${trim(res.margins.right)}, bottom ${trim(res.margins.bottom)}, top ${trim(res.margins.top)} m`}.`;
      }
      if (res.flush && m.solver === 'fast') {
        res.kind = 'capped';
        res.text = `A paper-thin cap covers the ${trim(res.size[0])} × ${trim(res.size[1])} m opening. WindowCut’s faces sit exactly flush with the wall’s, and the Fast solver can’t resolve flush faces. Make WindowCut deeper than the wall.`;
      } else if (res.flush) {
        res.kind = 'flush';
        res.text += ' Warning: its faces sit exactly flush with the wall’s. Exact copes, but make WindowCut deeper than the wall so the cut is reliable.';
      }
    }
    return res;
  }

  // ── three.js scene ────────────────────────────────────────────────────────
  const { renderer, scene, camera, syncSize } = createScene(canvas, { THREE, fov: 38, near: 0.05, far: 200, clearColor: 0x3d3d3d });
  const renderCam = new THREE.PerspectiveCamera(32, 1, 0.05, 200);
  renderCam.position.copy(b2t(2.6, -5.6, 1.9));
  renderCam.lookAt(b2t(0, 0, 1));
  camera.position.copy(b2t(3.3, -4.4, 2.6));
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(b2t(0, 0, 1));
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.minDistance = 1.2;
  controls.maxDistance = 25;
  controls.addEventListener('change', () => { dirty = true; });
  controls.update();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.copy(b2t(-3, -5, 6));
  scene.add(sun);
  const back = new THREE.DirectionalLight(0xffffff, 0.6);
  back.position.copy(b2t(4, 5, 3));
  scene.add(back);

  const grid = new THREE.GridHelper(20, 40, 0x5a5a5a, 0x4d4d4d);
  grid.material.transparent = true;
  grid.material.depthWrite = false;
  grid.renderOrder = -1;
  scene.add(grid);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.001;
  scene.add(floor);

  const MAT = {
    wall: new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.7, }),
    cut: new THREE.MeshStandardMaterial({ color: 0x8fb3d9, roughness: 0.55, }),
    renderCut: new THREE.MeshStandardMaterial({ color: 0x6f6a64, roughness: 0.8 })
  };
  const content = new THREE.Group();
  scene.add(content);
  const pickables = [];

  function boxMesh(b, material) {
    const size = [0, 1, 2].map(i => b.max[i] - b.min[i]);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[2], size[1]), material);
    mesh.position.copy(b2t((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2));
    return mesh;
  }
  function boxEdges(b, color, opacity = 1) {
    const size = [0, 1, 2].map(i => b.max[i] - b.min[i]);
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size[0], size[2], size[1]));
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthTest: opacity === 1 }));
    line.position.copy(b2t((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2));
    line.renderOrder = 3;
    return line;
  }
  // One watertight mesh per object: split space on every box boundary, fill the cells
  // inside any box, and keep only faces between a filled and an empty cell. No interior
  // faces means no seams where the Difference pieces meet.
  function solidGeometry(boxes) {
    const cuts = [0, 1, 2].map(i => [...new Set(boxes.flatMap(b => [b.min[i], b.max[i]]).map(v => Math.round(v * 1e6) / 1e6))].sort((a, b) => a - b));
    const n = cuts.map(c => c.length - 1);
    const filled = (i, j, k) => {
      if (i < 0 || j < 0 || k < 0 || i >= n[0] || j >= n[1] || k >= n[2]) return false;
      const c = [(cuts[0][i] + cuts[0][i + 1]) / 2, (cuts[1][j] + cuts[1][j + 1]) / 2, (cuts[2][k] + cuts[2][k + 1]) / 2];
      return boxes.some(b => [0, 1, 2].every(a => c[a] > b.min[a] && c[a] < b.max[a]));
    };
    const pos = [], nor = [];
    const quad = (corners, normal) => {
      const [a, b, c, d] = corners.map(p => b2t(...p));
      const nt = b2t(...normal);
      const tri = [a, b, c, a, c, d];
      if (new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).dot(nt) < 0) tri.splice(0, 6, a, c, b, a, d, c);
      tri.forEach(v => { pos.push(v.x, v.y, v.z); nor.push(nt.x, nt.y, nt.z); });
    };
    for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) for (let k = 0; k < n[2]; k++) {
      if (!filled(i, j, k)) continue;
      const lo = [cuts[0][i], cuts[1][j], cuts[2][k]], hi = [cuts[0][i + 1], cuts[1][j + 1], cuts[2][k + 1]];
      const idx = [i, j, k];
      for (const ax of [0, 1, 2]) for (const dir of [-1, 1]) {
        const nb = [...idx]; nb[ax] += dir;
        if (filled(...nb)) continue;
        const [u, v] = [0, 1, 2].filter(a => a !== ax);
        const plane = dir < 0 ? lo[ax] : hi[ax];
        const pt = (uu, vv) => { const p = []; p[ax] = plane; p[u] = uu; p[v] = vv; return p; };
        const normal = [0, 0, 0]; normal[ax] = dir;
        quad([pt(lo[u], lo[v]), pt(hi[u], lo[v]), pt(hi[u], hi[v]), pt(lo[u], hi[v])], normal);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return geo;
  }
  function rebuild() {
    content.children.slice().forEach(child => { content.remove(child); child.traverse(n => { n.geometry?.dispose(); if (n.material && !Object.values(MAT).includes(n.material)) n.material.dispose(); }); });
    pickables.length = 0;
    ['wall', 'cut'].forEach(id => {
      const o = state.objs[id];
      if (!o.exists) return;
      const visible = renderView ? o.cam : o.eye;
      if (!visible) return;
      const boxes = evaluated(id, renderView);
      const group = new THREE.Group();
      const wire = !renderView && (o.display === 'wire' || o.display === 'bounds');
      if (boxes.length && wire) {
        if (o.display === 'bounds') group.add(boxEdges(bounds(boxes), 0x111111));
        else {
          const line = new THREE.LineSegments(new THREE.EdgesGeometry(solidGeometry(boxes), 1), new THREE.LineBasicMaterial({ color: 0x111111 }));
          line.renderOrder = 3;
          group.add(line);
        }
      } else if (boxes.length) {
        group.add(new THREE.Mesh(solidGeometry(boxes), renderView && id === 'cut' ? MAT.renderCut : MAT[id]));
      }
      const bb = bounds(boxes) || boxOf(o);
      const pick = boxMesh(bb, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
      pick.userData.id = id;
      group.add(pick);
      pickables.push(pick);
      if (!renderView && state.selected.includes(id)) group.add(boxEdges(bounds(baseBoxes(id)), state.active === id ? 0xffaa40 : 0xf15800));
      content.add(group);
    });
    grid.visible = !renderView;
    floor.visible = renderView;
    renderer.setClearColor(renderView ? 0xb9c4cf : 0x3d3d3d);
    dirty = true;
  }

  // ── viewport picking ──────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  let downAt = null;
  canvas.addEventListener('pointerdown', event => { downAt = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointerup', event => {
    if (!downAt || renderView || Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 5 || event.button !== 0) return;
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    select(hit ? hit.object.userData.id : null, event.shiftKey);
  });
  function select(id, add) {
    if (!id) { state.selected = []; say('Deselected.'); }
    else if (add) { state.selected = state.selected.includes(id) ? state.selected.filter(s => s !== id) : [...state.selected, id]; state.active = id; }
    else { state.selected = [id]; state.active = id; say(`Selected ${NAMES[id]}.`); }
    changed({ type: 'select' });
  }

  // ── panels ────────────────────────────────────────────────────────────────
  const outliner = $('[data-bbl-outliner]');
  const itemPanel = $('[data-bbl-item]');
  const modPanel = $('[data-bbl-mod]');
  const resultEl = $('[data-bbl-result]');
  const statusEl = $('[data-bbl-status]');
  const say = msg => { statusEl.textContent = msg; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderOutliner() {
    const rows = [`<li><button type="button" class="bbl-row is-collection" data-bbl-select="all"><span aria-hidden="true">▤</span>WindowModule</button></li>`];
    ['wall', 'cut'].forEach(id => {
      const o = state.objs[id];
      if (!o.exists) return;
      const sel = state.selected.includes(id);
      rows.push(`<li class="bbl-obj"><button type="button" class="bbl-row${sel ? ' is-selected' : ''}${state.active === id ? ' is-active' : ''}" data-bbl-select="${id}" aria-pressed="${sel}"><span aria-hidden="true">▣</span>${NAMES[id]}${state.mod?.owner === id ? '<i title="Has a modifier" aria-label="has a modifier">🔧</i>' : ''}</button>`
        + `<button type="button" class="bbl-toggle" data-bbl-eye="${id}" aria-pressed="${o.eye}" aria-label="${NAMES[id]} visible in viewport (H)" title="Hide in viewport (H)">${o.eye ? '👁' : '◡'}</button>`
        + `<button type="button" class="bbl-toggle" data-bbl-cam="${id}" aria-pressed="${o.cam}" aria-label="${NAMES[id]} included in renders" title="Disable in renders">${o.cam ? '📷' : '⊘'}</button></li>`);
    });
    outliner.innerHTML = rows.join('');
  }
  function numField(label, kind, i, value, disabled) {
    return `<label><span>${label}</span><input type="number" step="0.01" inputmode="decimal" data-bbl-num="${kind}" data-axis="${i}" value="${trim(value)}"${disabled ? ' disabled' : ''}></label>`;
  }
  function renderItem() {
    const id = state.active;
    const o = id && state.objs[id];
    if (!o || !o.exists) { itemPanel.innerHTML = '<p class="bbl-empty">Select an object in the Outliner or viewport.</p>'; return; }
    const multi = state.selected.length > 1;
    itemPanel.innerHTML = `<h4>${NAMES[id]}${multi ? ' <small>+ moving the whole module</small>' : ''}</h4>
      <fieldset><legend>Location (m)</legend>${['X', 'Y', 'Z'].map((a, i) => numField(a, 'loc', i, o.loc[i])).join('')}</fieldset>
      <fieldset><legend>Dimensions (m)</legend>${['X', 'Y', 'Z'].map((a, i) => numField(a, 'dim', i, o.dim[i], multi)).join('')}</fieldset>
      <label class="bbl-select"><span>Viewport Display → Display As</span><select data-bbl-display>${['textured', 'solid', 'wire', 'bounds'].map(v => `<option value="${v}"${o.display === v ? ' selected' : ''}>${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}</select></label>`;
  }
  function renderModifier() {
    const id = state.active;
    const o = id && state.objs[id];
    if (!o || !o.exists) { modPanel.innerHTML = ''; return; }
    const m = state.mod;
    if (!m || m.owner !== id) {
      const elsewhere = m ? `<p class="bbl-note">The Boolean lives on ${NAMES[m.owner]}. Select it to edit the modifier.</p>` : '';
      modPanel.innerHTML = `<h4>Modifiers · ${NAMES[id]}</h4>${elsewhere}<p class="bbl-empty">${NAMES[id]} has no modifiers.</p>${m ? '' : `<button type="button" class="bbl-add" data-bbl-add>Add Modifier → Generate → Boolean</button>`}`;
      return;
    }
    const other = OTHER[id];
    const opBtn = op => `<button type="button" data-bbl-op="${op}" aria-pressed="${m.op === op}">${op[0].toUpperCase() + op.slice(1)}</button>`;
    modPanel.innerHTML = `<h4>Modifiers · ${NAMES[id]}</h4>
      <div class="bbl-mod">
        <div class="bbl-mod-head"><b>🔧 Boolean</b>
          <button type="button" class="bbl-toggle" data-bbl-modflag="viewport" aria-pressed="${m.viewport}" aria-label="Show modifier in viewport" title="Show in viewport">🖥</button>
          <button type="button" class="bbl-toggle" data-bbl-modflag="render" aria-pressed="${m.render}" aria-label="Use modifier in renders" title="Use in renders">📷</button>
          <button type="button" data-bbl-apply title="Apply (writes the result into the mesh)">Apply</button>
          <button type="button" class="bbl-toggle" data-bbl-remove aria-label="Remove modifier" title="Remove modifier">✕</button>
        </div>
        <div class="bbl-seg" role="group" aria-label="Operation">${opBtn('intersect')}${opBtn('union')}${opBtn('difference')}</div>
        <label class="bbl-select"><span>Operand Type</span><select disabled><option>Object</option></select></label>
        <label class="bbl-select"><span>Object</span><select data-bbl-object><option value="">—</option>${state.objs[other].exists ? `<option value="${other}"${m.object === other ? ' selected' : ''}>${NAMES[other]}</option>` : ''}</select></label>
        <div class="bbl-seg" role="group" aria-label="Solver"><span>Solver</span><button type="button" data-bbl-solver="fast" aria-pressed="${m.solver === 'fast'}">Fast</button><button type="button" data-bbl-solver="exact" aria-pressed="${m.solver === 'exact'}">Exact</button></div>
      </div>`;
  }
  function renderResult() {
    const a = analysis();
    resultEl.textContent = a.text;
    resultEl.dataset.kind = a.kind;
  }

  lab.addEventListener('click', handleClick);
  function handleClick(event) {
    const t = event.target.closest('button');
    if (!t || !lab.contains(t)) return;
    const d = t.dataset;
    if (d.bblSelect === 'all') {
      state.selected = ['wall', 'cut'].filter(id => state.objs[id].exists);
      state.active = state.selected.includes('wall') ? 'wall' : state.selected[0] || null;
      say('Selected the whole WindowModule collection. Location now moves both objects together.');
      changed({ type: 'select' });
    } else if (d.bblSelect) select(d.bblSelect, event.shiftKey);
    else if (d.bblEye) toggleFlag(d.bblEye, 'eye');
    else if (d.bblCam) toggleFlag(d.bblCam, 'cam');
    else if (d.bblAdd !== undefined) addModifier();
    else if (d.bblOp) commit(s => { s.mod.op = d.bblOp; }, { type: 'op', op: d.bblOp });
    else if (d.bblSolver) commit(s => { s.mod.solver = d.bblSolver; }, { type: 'solver' });
    else if (d.bblModflag) commit(s => { s.mod[d.bblModflag] = !s.mod[d.bblModflag]; }, { type: 'modflag' });
    else if (d.bblApply !== undefined) applyModifier();
    else if (d.bblRemove !== undefined) commit(s => { s.mod = null; }, { type: 'remove' });
    else if (d.bblCmd === 'undo') undo();
    else if (d.bblCmd === 'redo') redo();
    else if (d.bblCmd === 'delete') deleteSelected();
    else if (d.bblCmd === 'reset') { commit(s => Object.assign(s, fresh()), { type: 'reset' }); say('Reset to the start of step 2: WallPanel and WindowCut, no modifier. Undo brings your work back.'); }
    else if (d.bblCmd === 'render') setRenderView(!renderView);
    else if (d.bblCase) loadCase(Number(d.bblCase));
  }
  function toggleFlag(id, flag) {
    commit(s => { s.objs[id][flag] = !s.objs[id][flag]; }, { type: flag });
    const on = state.objs[id][flag];
    say(flag === 'eye' ? `${NAMES[id]} ${on ? 'shown in' : 'hidden from'} the viewport. Renders ${state.objs[id].cam ? 'still include it' : 'skip it'}.` : `${NAMES[id]} ${on ? 'included in' : 'disabled for'} renders. The viewport is unaffected.`);
  }
  function addModifier() {
    const id = state.active;
    commit(s => { s.mod = { owner: id, op: 'difference', object: null, solver: 'exact', viewport: true, render: true }; }, { type: 'add' });
    say(`Added a Boolean modifier to ${NAMES[id]}. Its Object field is empty, so nothing changes yet.`);
  }
  function applyModifier() {
    const m = state.mod;
    const boxes = evaluated(m.owner, false);
    if (!boxes.length) { say('Apply would leave an empty mesh. Check the operation first.'); return; }
    const bb = bounds(boxes);
    const center = [0, 1, 2].map(i => (bb.min[i] + bb.max[i]) / 2);
    commit(s => {
      const o = s.objs[m.owner];
      o.loc = center;
      o.dim = [0, 1, 2].map(i => bb.max[i] - bb.min[i]);
      o.baked = { dim: [...o.dim], boxes: boxes.map(b => ({ min: b.min.map((v, i) => v - center[i]), max: b.max.map((v, i) => v - center[i]) })) };
      s.mod = null;
    }, { type: 'apply' });
    say(`Applied: the cut is now part of ${NAMES[m.owner]}’s mesh and the modifier is gone. Deleting WindowCut is safe now, but nothing about the opening can be adjusted.`);
  }
  function deleteSelected() {
    const ids = state.selected.filter(id => state.objs[id].exists);
    if (!ids.length) { say('Select something to delete.'); return; }
    commit(s => {
      ids.forEach(id => { s.objs[id].exists = false; if (s.mod?.object === id) s.mod.object = null; if (s.mod?.owner === id) s.mod = null; });
      s.selected = [];
      s.active = null;
    }, { type: 'delete', ids });
    const broke = ids.includes('cut') && state.mod?.owner === 'wall';
    say(`Deleted ${ids.map(id => NAMES[id]).join(' and ')}.${broke ? ' The Boolean lost its Object, so the opening closed. Undo (Ctrl+Z) brings the cutter back.' : ''}`);
  }
  function setRenderView(on) {
    renderView = on;
    lab.classList.toggle('is-render', on);
    $('[data-bbl-cmd="render"]').setAttribute('aria-pressed', String(on));
    $('[data-bbl-viewlabel]').textContent = on ? 'Render preview · Camera' : 'User Perspective · Solid';
    controls.enabled = !on;
    say(on ? 'Render preview: what the camera sees. Eye (H) toggles don’t matter here; camera toggles and the modifier’s render toggle do.' : 'Back in the viewport.');
    changed({ type: on ? 'render' : 'viewport' }, false);
  }

  lab.addEventListener('input', event => {
    const t = event.target;
    if (!t.matches('[data-bbl-num]')) return;
    const v = parseFloat(t.value);
    if (!Number.isFinite(v)) return;
    const kind = t.dataset.bblNum, axis = Number(t.dataset.axis);
    if (kind === 'dim' && v <= 0) return;
    if (!t.dataset.editing) { undoStack.push(clone(state)); redoStack = []; t.dataset.editing = '1'; }
    const id = state.active;
    if (kind === 'loc') {
      const delta = v - state.objs[id].loc[axis];
      state.selected.forEach(sid => { state.objs[sid].loc[axis] += delta; });
      if (!state.selected.includes(id)) state.objs[id].loc[axis] = v;
    } else state.objs[id].dim[axis] = v;
    changed({ type: 'num' }, false);
  });
  lab.addEventListener('change', event => {
    const t = event.target;
    if (t.matches('[data-bbl-num]')) { delete t.dataset.editing; changed({ type: 'num' }); }
    else if (t.matches('[data-bbl-display]')) { commit(s => { s.objs[s.active].display = t.value; }, { type: 'display' }); say(t.value === 'wire' || t.value === 'bounds' ? `${NAMES[state.active]} draws as an outline in the viewport. It would still render solid: Display As is viewport-only.` : `${NAMES[state.active]} draws solid in the viewport.`); }
    else if (t.matches('[data-bbl-object]')) { commit(s => { s.mod.object = t.value || null; }, { type: 'object' }); say(t.value ? `Boolean Object set to ${NAMES[t.value]}.` : 'Boolean Object cleared.'); }
  });

  // keyboard shortcuts while focus is inside the viewport
  const view = $('.bbl-view');
  view.addEventListener('keydown', event => {
    if (event.target !== view) return;
    const ctrl = event.ctrlKey || event.metaKey;
    let handled = true;
    if (ctrl && event.code === 'KeyZ') event.shiftKey ? redo() : undo();
    else if (event.code === 'KeyH' && event.altKey) commit(s => { Object.values(s.objs).forEach(o => { o.eye = true; }); }, { type: 'eye' });
    else if (event.code === 'KeyH' && !ctrl) { const ids = state.selected.filter(id => state.objs[id].exists); if (ids.length) commit(s => ids.forEach(id => { s.objs[id].eye = false; }), { type: 'eye' }); say(ids.length ? `Hid ${ids.map(id => NAMES[id]).join(', ')} in the viewport (Alt+H reveals).` : 'Select something to hide.'); }
    else if ((event.code === 'KeyX' || event.code === 'Delete') && !ctrl) deleteSelected();
    else if (event.code === 'F12') setRenderView(!renderView);
    else handled = false;
    if (handled) event.preventDefault();
  });
  canvas.addEventListener('pointerdown', () => view.focus({ preventScroll: true }));

  // ── drill + repair bench ──────────────────────────────────────────────────
  const W = () => state.objs.wall, C = () => state.objs.cut;
  const goodCut = () => { const a = analysis(); return state.mod?.owner === 'wall' && state.mod.op === 'difference' && state.mod.object === 'cut' && a.through && !a.flush && a.kind === 'opening'; };
  const missions = [
    { title: 'Put a Boolean on the wall', html: 'Select <b>WallPanel</b> (Outliner or click it), then press <b>Add Modifier → Generate → Boolean</b>. The modifier belongs on the object that <em>loses</em> volume.', check: () => state.mod?.owner === 'wall' },
    { title: 'Choose the cutter', html: 'Leave Operation on <b>Difference</b> and set Object to <b>WindowCut</b>. Orbit (drag) to look through the opening and see the wall’s thickness.', check: () => goodCut() },
    { title: 'Draw the cutter as Wire', html: 'Select <b>WindowCut</b> and set <b>Display As → Wire</b>. Now you can see the opening while the cutter stays editable.', check: () => C().display === 'wire' && goodCut() },
    { title: 'Compare the three operations', html: 'Select WallPanel and try <b>Union</b> and <b>Intersect</b>, reading the result line each time, then go back to <b>Difference</b>.', check: (e, st) => { if (e.type === 'op') st[e.op] = true; return st.union && st.intersect && goodCut(); } },
    { title: 'Hide it from the viewport and renders', html: 'Close WindowCut’s <b>eye</b> (or select it and press <kbd>H</kbd>), turn off its <b>camera</b> toggle, then press <b>Render preview</b> (<kbd>F12</kbd>). The opening should be clean.', check: e => e.type === 'render' && !C().eye && !C().cam && goodCut() && state.mod.render },
    { title: 'Stretch: turn it into a doorway', html: 'Leave Render preview, reveal WindowCut, and set its Dimensions to <b>0.9, 0.45, 1.82</b> and Location to <b>0, 0, 0.9</b>. The result line should say “doorway”.', check: () => C().exists && [0.9, 0.45, 1.82].every((v, i) => near(C().dim[i], v)) && [0, 0, 0.9].every((v, i) => near(C().loc[i], v)) && analysis().text.startsWith('A doorway') }
  ];
  const finished = () => { const s = fresh(); s.mod = { owner: 'wall', op: 'difference', object: 'cut', solver: 'exact', viewport: true, render: true }; Object.assign(s.objs.cut, { eye: false, cam: false, display: 'wire' }); s.selected = ['wall']; s.active = 'wall'; return s; };
  const cases = [
    { title: 'The wall is still solid', setup: s => { s.mod.object = null; }, check: () => goodCut(), why: 'The Boolean had no Object. A modifier with an empty operand does nothing at all.' },
    { title: 'Everything vanished except a square block', setup: s => { s.mod.op = 'intersect'; }, check: () => goodCut(), why: 'Intersect keeps only the overlap. Difference is the operation that removes the cutter’s volume.' },
    { title: 'A paper-thin cap covers the opening', setup: s => { s.objs.cut.dim[1] = 0.15; s.mod.solver = 'fast'; }, check: () => goodCut() && C().dim[1] > W().dim[1] + 0.01, why: 'The cutter was exactly as deep as the wall, so their faces were flush. Make it deeper (0.45 m) so it sticks out of both faces; Exact is the safer solver.' },
    { title: 'The opening only goes partway in', setup: s => { s.objs.cut.loc[1] = 0.2; }, check: () => goodCut(), why: 'WindowCut had slid back along Y, so it stopped short of the front face and left a pocket. Centre it at Y = 0.' },
    { title: 'A grey block fills the opening in the render', setup: s => { s.objs.cut.cam = true; }, check: () => goodCut() && !C().cam && state.mod.render, why: 'H and the eye only hide things in the viewport. The cutter’s camera toggle decides whether it renders.' },
    { title: 'The render shows a solid wall', setup: s => { s.mod.render = false; }, check: () => goodCut() && state.mod.render && !C().cam, why: 'The modifier’s own camera icon was off, so renders used the uncut wall. Leave that one on; turn off the cutter’s camera toggle instead.' },
    { title: 'I moved the wall and the window stayed behind', setup: s => { s.objs.wall.loc[0] = 0.8; }, check: () => goodCut() && near(C().loc[0], W().loc[0]) && near(C().loc[2], W().loc[2]), why: 'The cutter is a separate object. Select the WindowModule collection (both objects) before moving, or move WindowCut to match.' },
    { title: 'I deleted the cutter and the opening closed', setup: s => { s.objs.cut.exists = false; s.mod.object = null; }, preUndo: true, check: () => goodCut() && C().exists, why: 'A live Boolean needs its cutter. Undo the delete (Ctrl+Z). Only delete the cutter after Apply, and only in a copy of the file.' }
  ];
  const drill = { i: 0, st: {} };
  const fixed = new Set();
  let currentCase = null;
  function loadCase(n) {
    const c = cases[n];
    undoStack = [];
    redoStack = [];
    if (c.preUndo) undoStack.push(finished());
    state = finished();
    c.setup(state);
    currentCase = n;
    if (renderView) setRenderView(false);
    say(`Broken file loaded: “${c.title}”. Find the cause and fix it.`);
    changed({ type: 'case' });
  }
  function runChecks(e) {
    let guard = 0;
    while (drill.i < missions.length && guard++ < 8 && missions[drill.i].check(e, drill.st)) {
      drill.i += 1;
      drill.st = {};
      e = { type: 'state' };
      const msg = drill.i < missions.length ? `✓ Step done. Next: ${missions[drill.i].title}.` : '✓ Drill complete. Try the repair bench, then build it for real in Blender.';
      queueMicrotask(() => say(msg)); // after the action's own status line
    }
    if (currentCase !== null && !fixed.has(currentCase) && cases[currentCase].check(e)) {
      fixed.add(currentCase);
      const why = cases[currentCase].why;
      queueMicrotask(() => say(`✓ Fixed: ${why}`));
    }
    renderDrill();
  }
  function renderDrill() {
    const done = drill.i >= missions.length;
    const m = missions[Math.min(drill.i, missions.length - 1)];
    $('[data-bbl-drill-count]').textContent = done ? `All ${missions.length} steps done` : `Step ${drill.i + 1} of ${missions.length}`;
    $('[data-bbl-drill-bar]').style.width = `${(drill.i / missions.length) * 100}%`;
    $('[data-bbl-drill-title]').textContent = done ? 'Drill complete' : m.title;
    $('[data-bbl-drill-body]').innerHTML = done ? 'You cut the opening, compared the operations, and hid the cutter the right way. Now open the repair bench.' : m.html;
    $('[data-bbl-skip]').hidden = done;
    $('[data-bbl-cases]').innerHTML = cases.map((c, n) => `<li><button type="button" data-bbl-case="${n}" aria-pressed="${currentCase === n}">${fixed.has(n) ? '✓ ' : ''}${esc(c.title)}</button>${fixed.has(n) ? `<p>${esc(c.why)}</p>` : ''}</li>`).join('');
  }
  $('[data-bbl-skip]').addEventListener('click', () => { drill.i += 1; drill.st = {}; runChecks({ type: 'state' }); });

  // ── pump + loop ───────────────────────────────────────────────────────────
  function changed(e, panels = true) {
    rebuild();
    renderOutliner();
    if (panels) { renderItem(); renderModifier(); }
    renderResult();
    runChecks(e);
  }
  function frame() {
    if (syncSize()) {
      renderCam.aspect = camera.aspect;
      renderCam.updateProjectionMatrix();
      dirty = true;
    }
    if (controls.enabled && controls.update()) dirty = true;
    if (dirty) { dirty = false; renderer.render(scene, renderView ? renderCam : camera); }
    requestAnimationFrame(frame);
  }
  new ResizeObserver(() => { dirty = true; }).observe(canvas);

  changed({ type: 'state' });
  say('Drag to orbit, scroll to zoom, click to select. Follow the drill on the right.');
  requestAnimationFrame(frame);
  lab.bblLab = { get state() { return clone(state); }, analysis, get drillStep() { return drill.i; }, get fixed() { return [...fixed]; } };

  function hasWebGL() {
    try { const probe = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (probe.getContext('webgl2') || probe.getContext('webgl'))); }
    catch { return false; }
  }
}
