// What is a 3D model? — Mesh Inspector, Repair Challenge, facet sim, record sheet and checks.
// The geometry and the watertight check live in what-is-a-3d-model.mesh.mjs (pure, no DOM).
import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import * as M from './what-is-a-3d-model.mesh.mjs';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = (n, d = 1) => {
  const s = (Math.abs(n) < 1e-9 ? 0 : n).toFixed(d);
  return s.replace('-', '−');
};

/* ═══════════════════════════════════════════════════════════════
   Mesh Inspector
   ═══════════════════════════════════════════════════════════════ */

const COLORS = {
  bg: 0x1b2433,
  face: new THREE.Color('#d9dee7'),
  faceBack: new THREE.Color('#5a6272'),
  outside: new THREE.Color('#3f7fe6'),
  inside: new THREE.Color('#e04848'),
  selected: new THREE.Color('#facc15'),
  flipped: new THREE.Color('#d946ef'),
  edge: new THREE.Color('#111827'),
  edgeBare: new THREE.Color('#e5e7eb'),
  open: new THREE.Color('#ff3b30'),
  nonManifold: new THREE.Color('#fb923c'),
  vert: new THREE.Color('#0ea5e9'),
  gap: new THREE.Color('#a3e635'),
  normal: new THREE.Color('#34d399')
};

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (_) { return false; }
}

function initInspector(root) {
  const canvas = $('canvas', root);
  const labels = $('.wm-labels', root);
  const status = $('[data-wm-status]', root);
  const readout = $('[data-wm-selection]', root);
  const counts = $('[data-wm-counts]', root);
  const report = $('[data-wm-report]', root);
  const toolMsg = $('[data-wm-toolmsg]', root);

  if (!hasWebGL()) {
    canvas.hidden = true;
    status.textContent = 'This browser cannot draw 3D (WebGL is off). Use the diagrams below and a paper model instead.';
    return;
  }

  const { renderer, scene, camera, syncSize } = createScene(canvas, { THREE, fov: 40, near: 1, far: 2000, clearColor: COLORS.bg });
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.minDistance = 25;
  controls.maxDistance = 400;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(0.4, 1, 0.7);
  camera.add(sun);
  scene.add(camera);

  const grid = new THREE.GridHelper(80, 8, 0x8090a8, 0x46536a);   // 10 mm squares on the bed
  scene.add(grid);
  // Data is Z up (CAD, printing). Three.js is Y up, so the model group is turned −90° about X.
  const world = new THREE.Group();
  world.rotation.x = -Math.PI / 2;
  scene.add(world);
  const axesGroup = new THREE.Group();
  world.add(axesGroup);
  const modelGroup = new THREE.Group();
  world.add(modelGroup);

  const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1);
  const unitCone = new THREE.ConeGeometry(1, 1, 14, 1);
  const unitSphere = new THREE.SphereGeometry(1, 16, 12);
  const Y = new THREE.Vector3(0, 1, 0);

  function rod(a, b, radius, color, group) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const d = B.clone().sub(A);
    const L = d.length();
    const mesh = new THREE.Mesh(unitCyl, new THREE.MeshBasicMaterial({ color }));
    mesh.scale.set(radius, L, radius);
    mesh.position.copy(A).addScaledVector(d, 0.5);
    mesh.quaternion.setFromUnitVectors(Y, d.normalize());
    group.add(mesh);
    return mesh;
  }
  function arrow(from, dir, length, radius, color, group) {
    const D = new THREE.Vector3(...dir).normalize();
    const head = Math.min(length * 0.32, 3.2);
    const tip = new THREE.Vector3(...from).addScaledVector(D, length - head);
    rod(from, tip.toArray(), radius, color, group);
    const cone = new THREE.Mesh(unitCone, new THREE.MeshBasicMaterial({ color }));
    cone.scale.set(radius * 2.6, head, radius * 2.6);
    cone.position.copy(tip).addScaledVector(D, head / 2);
    cone.quaternion.setFromUnitVectors(Y, D);
    group.add(cone);
  }

  // Axes: X red, Y green, Z blue (the colours every 3D app uses).
  const AXES = [['X', [1, 0, 0], '#ef4444'], ['Y', [0, 1, 0], '#22c55e'], ['Z', [0, 0, 1], '#3b82f6']];
  for (const [, dir, color] of AXES) arrow([0, 0, 0], dir, 32, 0.35, new THREE.Color(color), axesGroup);

  const state = {
    mode: 'inspect',
    shape: 'cube',
    mesh: M.buildShape('cube'),
    show: { faces: true, edges: true, verts: true, nums: false, normals: false, orient: false, xray: false, axes: true },
    pick: 'vertex',
    sel: null,
    reveal: false,
    puzzle: null,
    checked: false,
    hints: false
  };
  let analysis = M.analyze(state.mesh);
  let pickMesh = null, triFace = [];

  function disposeGroup(group) {
    for (const child of [...group.children]) {
      group.remove(child);
      if (child.geometry && child.geometry !== unitCyl && child.geometry !== unitCone && child.geometry !== unitSphere) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
  }

  const isSel = (type, id) => state.sel && state.sel.type === type && state.sel.id === id;

  function faceColor(fi, back) {
    if (isSel('face', fi)) return COLORS.selected;
    if (state.hints && analysis.flipped.includes(fi)) return COLORS.flipped;
    if (state.show.orient) return back ? COLORS.inside : COLORS.outside;
    return back ? COLORS.faceBack : COLORS.face;
  }

  function rebuild() {
    analysis = M.analyze(state.mesh);
    disposeGroup(modelGroup);
    const m = state.mesh;
    const pos = [], front = [], back = [];
    triFace = [];
    m.f.forEach((face, fi) => {
      const cf = faceColor(fi, false), cb = faceColor(fi, true);
      for (let i = 1; i < face.length - 1; i++) {
        for (const vi of [face[0], face[i], face[i + 1]]) {
          pos.push(...m.v[vi]);
          front.push(cf.r, cf.g, cf.b);
          back.push(cb.r, cb.g, cb.b);
        }
        triFace.push(fi);
      }
    });
    const makeGeo = colors => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      g.computeVertexNormals();
      return g;
    };
    const xray = state.show.xray;
    const faceMat = side => new THREE.MeshLambertMaterial({
      vertexColors: true, side, transparent: xray, opacity: xray ? 0.38 : 1, depthWrite: !xray,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
    });
    if (state.show.faces) {
      modelGroup.add(new THREE.Mesh(makeGeo(back), faceMat(THREE.BackSide)));
      modelGroup.add(new THREE.Mesh(makeGeo(front), faceMat(THREE.FrontSide)));
    }
    pickMesh = new THREE.Mesh(makeGeo(front), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    pickMesh.visible = false;
    modelGroup.add(pickMesh);

    if (state.show.edges || state.hints) {
      for (const e of analysis.edges.values()) {
        let color = state.show.faces ? COLORS.edge : COLORS.edgeBare;
        let r = 0.28;
        if (state.hints && e.faces.length === 1) { color = COLORS.open; r = 0.5; }
        if (state.hints && e.faces.length > 2) { color = COLORS.nonManifold; r = 0.5; }
        if (!state.show.edges && color !== COLORS.open && color !== COLORS.nonManifold) continue;
        if (isSel('edge', e.key)) { color = COLORS.selected; r = 0.6; }
        rod(m.v[e.a], m.v[e.b], r, color, modelGroup);
      }
    } else if (state.sel && state.sel.type === 'edge') {
      const e = analysis.edges.get(state.sel.id);
      if (e) rod(m.v[e.a], m.v[e.b], 0.6, COLORS.selected, modelGroup);
    }
    const gapVerts = new Set(analysis.gaps.flat());
    for (const vi of M.usedVertices(m)) {
      const hint = state.hints && gapVerts.has(vi);
      const sel = isSel('vertex', vi);
      if (!state.show.verts && !hint && !sel) continue;
      const s = new THREE.Mesh(unitSphere, new THREE.MeshBasicMaterial({ color: sel ? COLORS.selected : hint ? COLORS.gap : COLORS.vert }));
      s.scale.setScalar(sel || hint ? 1.35 : 0.95);
      s.position.set(...m.v[vi]);
      modelGroup.add(s);
    }
    if (state.show.normals) {
      m.f.forEach((_, fi) => arrow(M.faceCentroid(m, fi), M.faceNormal(m, fi), 8, 0.3, COLORS.normal, modelGroup));
    }
    axesGroup.visible = state.show.axes;
    grid.visible = state.show.axes;
    buildLabels();
    renderCounts();
    renderSelection();
    renderReport();
    requestRender();
  }

  /* ── Labels (HTML over the canvas) ─────────────────────────── */
  let labelEls = [];
  function buildLabels() {
    labels.textContent = '';
    labelEls = [];
    if (state.show.nums) {
      for (const vi of M.usedVertices(state.mesh)) {
        const el = document.createElement('span');
        el.className = 'wm-label wm-label-vert';
        el.textContent = vi;
        labels.append(el);
        labelEls.push({ el, p: state.mesh.v[vi] });
      }
    }
    if (state.show.axes) {
      for (const [name, dir, color] of AXES) {
        const el = document.createElement('span');
        el.className = 'wm-label wm-label-axis';
        el.style.color = color;
        el.textContent = name;
        labels.append(el);
        labelEls.push({ el, p: dir.map(x => x * 36) });
      }
    }
  }
  const tmp = new THREE.Vector3();
  function toScreen(p) {
    tmp.set(...p).applyMatrix4(world.matrixWorld).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: (tmp.x + 1) / 2 * r.width, y: (1 - tmp.y) / 2 * r.height, z: tmp.z, w: r.width, h: r.height };
  }
  function placeLabels() {
    for (const { el, p } of labelEls) {
      const s = toScreen(p);
      el.hidden = s.z > 1;
      el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
    }
  }

  /* ── Rendering on demand (paused off-screen by SimKit.frame) ─ */
  let pending = false;
  function tick() {
    pending = false;
    syncSize();
    controls.update();
    world.updateMatrixWorld();
    renderer.render(scene, camera);
    placeLabels();
  }
  function requestRender() {
    if (pending) return;
    pending = true;
    if (window.SimKit && SimKit.frame) SimKit.frame(canvas, tick);
    else requestAnimationFrame(tick);
  }
  controls.addEventListener('change', requestRender);
  if ('ResizeObserver' in window) new ResizeObserver(requestRender).observe(canvas);
  else window.addEventListener('resize', requestRender);

  function fitCamera() {
    const box = new THREE.Box3();
    for (const p of state.mesh.v) box.expandByPoint(new THREE.Vector3(p[0], p[2], -p[1]));
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(14, box.getSize(new THREE.Vector3()).length() / 2);
    controls.target.copy(c);
    camera.position.copy(c).add(new THREE.Vector3(1.1, 0.85, 1.45).normalize().multiplyScalar(r * 4.4));
    controls.update();
  }

  /* ── Picking ───────────────────────────────────────────────── */
  const ray = new THREE.Raycaster();
  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    const m = state.mesh;
    let found = null;
    if (state.pick === 'face') {
      const ndc = new THREE.Vector2(x / rect.width * 2 - 1, -(y / rect.height) * 2 + 1);
      world.updateMatrixWorld();
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(pickMesh, false)[0];
      if (hit) found = { type: 'face', id: triFace[hit.faceIndex] };
    } else if (state.pick === 'vertex') {
      let best = null;
      for (const vi of M.usedVertices(m)) {
        const s = toScreen(m.v[vi]);
        const d = Math.hypot(s.x - x, s.y - y);
        if (d < 22 && (!best || s.z < best.z - 0.0005 || (Math.abs(s.z - best.z) <= 0.0005 && d < best.d))) best = { vi, d, z: s.z };
      }
      if (best) found = { type: 'vertex', id: best.vi };
    } else {
      let best = null;
      for (const e of analysis.edges.values()) {
        const a = toScreen(m.v[e.a]), b = toScreen(m.v[e.b]);
        const dx = b.x - a.x, dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
        const d = Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
        const z = a.z + t * (b.z - a.z);
        if (d < 14 && (!best || d < best.d - 4 || (d < best.d + 4 && z < best.z))) best = { key: e.key, d, z };
      }
      if (best) found = { type: 'edge', id: best.key };
    }
    select(found);
  }
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) pickAt(e.clientX, e.clientY);
    down = null;
  });

  function select(sel) {
    state.sel = sel;
    rebuild();
  }

  function elementsOfPick() {
    if (state.pick === 'vertex') return M.usedVertices(state.mesh).map(id => ({ type: 'vertex', id }));
    if (state.pick === 'edge') return [...analysis.edges.keys()].map(id => ({ type: 'edge', id }));
    return state.mesh.f.map((_, id) => ({ type: 'face', id }));
  }
  function step(dir) {
    const list = elementsOfPick();
    if (!list.length) return;
    let i = state.sel && state.sel.type === state.pick ? list.findIndex(s => s.id === state.sel.id) : -1;
    i = (i + dir + list.length) % list.length;
    select(list[i]);
  }

  /* ── Readouts ──────────────────────────────────────────────── */
  function direction(n) {
    const names = [['X', 0], ['Y', 1], ['Z', 2]];
    const big = names.filter(([, i]) => Math.abs(n[i]) > 0.2).map(([a, i]) => (n[i] < 0 ? '−' : '+') + a);
    return big.join(' ');
  }
  function renderSelection() {
    const m = state.mesh, s = state.sel;
    if (!s) {
      readout.innerHTML = `<p class="wm-muted">Click ${state.pick === 'edge' ? 'an' : 'a'} ${state.pick} on the model, or step through them with ◀ ▶.</p>`;
      return;
    }
    if (s.type === 'vertex') {
      const [x, y, z] = m.v[s.id];
      const uses = m.f.filter(f => f.includes(s.id)).length;
      readout.innerHTML = `<p><strong>Vertex ${s.id}</strong> · a corner used by ${uses} face${uses === 1 ? '' : 's'}</p>
        <p class="wm-coord"><span>CAD / STL · millimetres · Z up</span><code>(${fmt(x)}, ${fmt(y)}, ${fmt(z)})</code></p>
        <p class="wm-coord"><span>glTF game file · metres · Y up</span><code>(${fmt(x / 1000, 3)}, ${fmt(z / 1000, 3)}, ${fmt(-y / 1000, 3)})</code></p>`;
    } else if (s.type === 'edge') {
      const e = analysis.edges.get(s.id);
      if (!e) { state.sel = null; renderSelection(); return; }
      const L = M.dist(m.v[e.a], m.v[e.b]);
      const n = e.faces.length;
      const verdict = n === 2 ? 'shared by 2 faces: closed here ✓'
        : n === 1 ? 'used by only 1 face: an open edge (the rim of a hole or a crack)'
          : `shared by ${n} faces: non-manifold (more than two faces meet here)`;
      readout.innerHTML = `<p><strong>Edge ${e.a}–${e.b}</strong> · ${fmt(L)} mm long</p><p>${verdict}</p>`;
    } else {
      const face = m.f[s.id];
      if (!face) { state.sel = null; renderSelection(); return; }
      const n = M.faceNormal(m, s.id);
      readout.innerHTML = `<p><strong>Face ${s.id}</strong> · ${face.length} corners · ${fmt(M.faceArea(m, s.id), 0)} mm²</p>
        <p>Corner order: <code>${face.join(' → ')}</code></p>
        <p class="wm-coord"><span>Normal (points ${direction(n)})</span><code>(${fmt(n[0], 2)}, ${fmt(n[1], 2)}, ${fmt(n[2], 2)})</code></p>`;
    }
  }

  function renderCounts() {
    const a = analysis;
    const show = state.reveal || state.mode === 'repair';
    const cell = v => (show ? v : '?');
    counts.innerHTML = `
      <div><dt>Vertices V</dt><dd>${cell(a.V)}</dd></div>
      <div><dt>Edges E</dt><dd>${cell(a.E)}</dd></div>
      <div><dt>Faces F</dt><dd>${cell(a.F)}</dd></div>
      <div><dt>V − E + F</dt><dd>${cell(String(a.euler).replace('-', '−'))}</dd></div>
      <div><dt>Triangles in an STL</dt><dd>${cell(a.triangles)}</dd></div>
      <div><dt>Binary STL size</dt><dd>${show ? M.binaryStlBytes(a.triangles) + ' bytes' : '?'}</dd></div>`;
    const btn = $('[data-wm-reveal]', root);
    if (btn) btn.textContent = state.reveal ? 'Hide counts' : 'Reveal counts';
  }

  function renderReport() {
    if (state.mode !== 'repair' || !state.puzzle) return;
    const total = state.puzzle.faults.length;
    $('[data-wm-moves]', root).textContent = `${state.puzzle.moves} move${state.puzzle.moves === 1 ? '' : 's'} · ${total} fault${total === 1 ? '' : 's'} hidden in this ${M.SHAPES[state.puzzle.shape].label.toLowerCase()}`;
    if (!state.checked) {
      report.innerHTML = '<p class="wm-muted">Press <strong>Check watertight</strong> to run the same test a slicer runs.</p>';
      report.dataset.ok = '';
      return;
    }
    const a = analysis;
    const row = (n, label, explain) => `<li class="${n ? 'is-bad' : 'is-ok'}"><b>${n}</b> ${label}<span>${n ? explain : 'none ✓'}</span></li>`;
    let html = '<ul class="wm-checklist">'
      + row(a.open.length, 'open edges', 'edges with a face on one side only: a hole or a crack')
      + row(a.nonManifold.length, 'non-manifold edges', 'more than two faces share an edge: something extra is stuck on')
      + row(a.flipped.length, 'flipped faces', 'faces whose normal points into the solid')
      + row(a.gaps.length, 'gaps', `corners less than ${M.GAP_TOLERANCE} mm apart that should be one corner`)
      + '</ul>';
    if (a.watertight) {
      const cm3 = a.volume / 1000;
      html += `<p class="wm-verdict is-ok"><strong>Watertight ✓</strong> Every edge has exactly two faces and every normal points out, so the slicer knows exactly what is inside. Volume ${fmt(cm3, 2)} cm³ · about ${fmt(cm3 * M.PLA_DENSITY, 1)} g of PLA if printed solid. V − E + F = ${a.euler}.</p>`;
    } else {
      html += '<p class="wm-verdict is-bad"><strong>Not watertight yet.</strong> A slicer could not tell inside from outside here.</p>';
    }
    report.innerHTML = html;
    report.dataset.ok = a.watertight ? 'yes' : 'no';
  }

  /* ── Modes, shapes, puzzles ────────────────────────────────── */
  function setMode(mode) {
    state.mode = mode;
    for (const b of $$('[data-wm-mode]', root)) b.setAttribute('aria-pressed', String(b.dataset.wmMode === mode));
    for (const p of $$('[data-wm-pane]', root)) p.hidden = p.dataset.wmPane !== mode;
    root.dataset.mode = mode;
    toolMsg.textContent = '';
    if (mode === 'inspect') {
      state.hints = false;
      syncToggle('hints');
      loadShape(state.shape);
    } else {
      loadPuzzle();
    }
  }
  function loadShape(id) {
    state.shape = id;
    state.mesh = M.buildShape(id);
    state.sel = null;
    state.reveal = false;
    $('[data-wm-shape-note]', root).textContent = M.SHAPES[id].note;
    rebuild();
    fitCamera();
    status.textContent = `${M.SHAPES[id].label} loaded.`;
  }
  function loadPuzzle() {
    const seedEl = $('[data-wm-seed]', root);
    const seed = Math.max(1, Math.min(99, parseInt(seedEl.value, 10) || 1));
    seedEl.value = seed;
    const level = parseInt($('[data-wm-level]', root).value, 10) || 2;
    const p = M.makePuzzle(seed, level);
    state.puzzle = { ...p, seed, level, moves: 0, start: M.cloneMesh(p.mesh), history: [] };
    state.mesh = M.cloneMesh(p.mesh);
    state.sel = null;
    state.checked = false;
    rebuild();
    fitCamera();
    status.textContent = `Puzzle ${seed}, level ${level}: a broken ${M.SHAPES[p.shape].label.toLowerCase()}.`;
  }
  function apply(result, msg) {
    if (!result.ok) { toolMsg.textContent = result.msg; status.textContent = result.msg; return; }
    state.puzzle.history.push(state.mesh);
    state.mesh = result.mesh;
    state.puzzle.moves++;
    state.sel = null;
    toolMsg.textContent = msg;
    status.textContent = msg;
    rebuild();
  }
  function needSel(type) {
    if (state.sel && state.sel.type === type) return true;
    const msg = `Pick ${type === 'edge' ? 'an' : 'a'} ${type} first: choose “${type[0].toUpperCase() + type.slice(1)}” under Pick, then click it on the model.`;
    toolMsg.textContent = msg;
    status.textContent = msg;
    return false;
  }
  const tools = {
    flip() { if (needSel('face')) apply({ ok: true, mesh: M.flipFace(state.mesh, state.sel.id) }, `Face ${state.sel.id} flipped: its corner order is reversed, so its normal now points the other way.`); },
    delete() { if (needSel('face')) apply({ ok: true, mesh: M.deleteFace(state.mesh, state.sel.id) }, `Face ${state.sel.id} deleted.`); },
    fill() {
      if (!needSel('edge')) return;
      const r = M.fillHole(state.mesh, state.sel.id);
      apply(r, r.ok ? `Hole filled with a new ${r.size}-corner face, wound to face outward.` : '');
    },
    weld() {
      if (!needSel('vertex')) return;
      const r = M.weldVertex(state.mesh, state.sel.id);
      apply(r, r.ok ? `Welded: corners ${r.dropped} and ${r.kept} (${fmt(r.distance)} mm apart) are now one corner, ${r.kept}.` : '');
    },
    undo() {
      const prev = state.puzzle.history.pop();
      if (!prev) { toolMsg.textContent = 'Nothing to undo.'; return; }
      state.mesh = prev;
      state.puzzle.moves++;
      state.sel = null;
      toolMsg.textContent = 'Undone.';
      rebuild();
    },
    restart() {
      state.mesh = M.cloneMesh(state.puzzle.start);
      state.puzzle.history = [];
      state.puzzle.moves = 0;
      state.sel = null;
      state.checked = false;
      toolMsg.textContent = 'Back to the broken mesh you started with.';
      rebuild();
    },
    check() {
      state.checked = true;
      rebuild();
      status.textContent = analysis.watertight ? 'Watertight. Ready for the slicer.' : 'Not watertight yet.';
    }
  };

  /* ── Wiring ─────────────────────────────────────────────────── */
  function syncToggle(key) {
    const el = $(`[data-wm-show="${key}"]`, root);
    if (el) el.checked = key === 'hints' ? state.hints : state.show[key];
  }
  for (const b of $$('[data-wm-mode]', root)) b.addEventListener('click', () => setMode(b.dataset.wmMode));
  const shapeSel = $('[data-wm-shape]', root);
  for (const [id, s] of Object.entries(M.SHAPES)) shapeSel.add(new Option(s.label, id));
  shapeSel.addEventListener('change', () => loadShape(shapeSel.value));
  const levelSel = $('[data-wm-level]', root);
  for (const [id, l] of Object.entries(M.LEVELS)) levelSel.add(new Option(l.label, id, id === '2', id === '2'));
  $('[data-wm-load]', root).addEventListener('click', loadPuzzle);
  $('[data-wm-next]', root).addEventListener('click', () => {
    const seedEl = $('[data-wm-seed]', root);
    seedEl.value = (parseInt(seedEl.value, 10) || 0) % 99 + 1;
    loadPuzzle();
  });
  for (const el of $$('[data-wm-show]', root)) {
    el.addEventListener('change', () => {
      const key = el.dataset.wmShow;
      if (key === 'hints') state.hints = el.checked; else state.show[key] = el.checked;
      rebuild();
    });
    syncToggle(el.dataset.wmShow);
  }
  for (const el of $$('[data-wm-pick]', root)) {
    el.addEventListener('change', () => {
      if (!el.checked) return;
      state.pick = el.value;
      state.sel = null;
      rebuild();
    });
  }
  $('[data-wm-prev]', root).addEventListener('click', () => step(-1));
  $('[data-wm-step]', root).addEventListener('click', () => step(1));
  $('[data-wm-reveal]', root).addEventListener('click', () => { state.reveal = !state.reveal; renderCounts(); });
  for (const b of $$('[data-wm-tool]', root)) b.addEventListener('click', () => tools[b.dataset.wmTool]());
  $('[data-wm-reset-view]', root).addEventListener('click', () => { fitCamera(); requestRender(); });

  setMode('inspect');
  // a hook for the lesson's own buttons and for tests
  root.wmInspector = { state, analyze: () => analysis, select, tools, setMode, loadShape, loadPuzzle };
}

/* ═══════════════════════════════════════════════════════════════
   Curve → facets (2-D canvas)
   ═══════════════════════════════════════════════════════════════ */

function initFacets(root) {
  const canvas = $('canvas', root);
  const slider = $('input[type=range]', root);
  const out = $('[data-facet-out]', root);
  const ctx = canvas.getContext('2d');
  const R = 10;   // mm

  function draw() {
    const n = parseInt(slider.value, 10);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 320, h = canvas.clientHeight || 240;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const style = getComputedStyle(canvas);
    const ink = style.color || '#1f2937';
    const cx = w / 2, cy = h / 2, px = Math.min(w, h) * 0.42;   // px per 10 mm
    // true circle (what CAD stores)
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = '#2f80ed';
    ctx.beginPath(); ctx.arc(cx, cy, px, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // facets (what the mesh stores)
    ctx.fillStyle = 'rgba(234, 120, 40, 0.16)';
    ctx.strokeStyle = '#d9480f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(t) * px, y = cy + Math.sin(t) * px;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink;
    for (let i = 0; i < n && n <= 48; i++) {
      const t = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(cx + Math.cos(t) * px, cy + Math.sin(t) * px, 3, 0, Math.PI * 2); ctx.fill();
    }
    // sag marker on the first facet
    const t0 = -Math.PI / 2, t1 = t0 + Math.PI * 2 / n, tm = (t0 + t1) / 2;
    const chordMid = [(Math.cos(t0) + Math.cos(t1)) / 2, (Math.sin(t0) + Math.sin(t1)) / 2];
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + chordMid[0] * px, cy + chordMid[1] * px);
    ctx.lineTo(cx + Math.cos(tm) * px, cy + Math.sin(tm) * px);
    ctx.stroke();
    const sag = M.chordSag(R, n);
    const tris = M.cylinderTriangles(n);
    out.innerHTML = `<b>${n}</b> flat sides · the facets miss the true circle by up to <b>${sag.toFixed(sag < 0.1 ? 3 : 2)} mm</b> · a 20 mm-wide cylinder made this way is <b>${tris}</b> triangles (${M.binaryStlBytes(tris).toLocaleString()} bytes as a binary STL).`
      + (sag < 0.1 ? ' That error is smaller than one 0.2 mm printed layer, so the printer cannot show it.' : sag > 0.4 ? ' You would see and feel these flats on a print.' : '');
  }
  slider.addEventListener('input', draw);
  if ('ResizeObserver' in window) new ResizeObserver(draw).observe(canvas);
  if (window.SimKit && SimKit.theme && SimKit.theme.onChange) SimKit.theme.onChange(draw);
  draw();
}

/* ═══════════════════════════════════════════════════════════════
   Record sheet (V − E + F) and practice problems
   ═══════════════════════════════════════════════════════════════ */

function initRecordSheet(table) {
  for (const row of $$('tr[data-euler-row]', table)) {
    const [v, e, f] = ['v', 'e', 'f'].map(k => $(`[data-k="${k}"]`, row));
    const out = $('output', row);
    const update = () => {
      const nums = [v, e, f].map(i => parseInt(i.value, 10));
      if (nums.some(Number.isNaN)) { out.textContent = ''; return; }
      const x = nums[0] - nums[1] + nums[2];
      out.textContent = String(x).replace('-', '−') + (x === 2 ? ' ✓' : '');
    };
    [v, e, f].forEach(i => i.addEventListener('input', update));
  }
}

function initProblems() {
  for (const p of $$('.fl-problem[data-answer]')) {
    const input = $('input, select', p), btn = $('button', p), fb = $('.fl-feedback', p), hint = $('.fl-hint', p);
    const showHint = () => { if (hint) { hint.hidden = false; hint.style.display = 'block'; } };
    const check = () => {
      let ok;
      if (input.tagName === 'SELECT') {
        if (!input.value) { fb.textContent = 'Choose an answer.'; fb.className = 'fl-feedback err'; return; }
        ok = input.value === p.dataset.answer;
      } else {
        const val = parseFloat(String(input.value).replace(',', '.').replace('−', '-'));
        const ans = parseFloat(p.dataset.answer), tol = parseFloat(p.dataset.tol || '0');
        if (Number.isNaN(val)) { fb.textContent = 'Enter a number.'; fb.className = 'fl-feedback err'; return; }
        ok = Math.abs(val - ans) <= tol + 1e-9;
      }
      if (ok) { fb.textContent = '✓ Correct'; fb.className = 'fl-feedback ok'; showHint(); }
      else { fb.textContent = '✗ Not yet. Read the hint.'; fb.className = 'fl-feedback err'; showHint(); }
    };
    btn.addEventListener('click', check);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  }
}

const inspector = $('[data-wm-inspector]');
if (inspector) initInspector(inspector);
const facets = $('[data-wm-facets]');
if (facets) initFacets(facets);
const sheet = $('[data-euler-sheet]');
if (sheet) initRecordSheet(sheet);
initProblems();
