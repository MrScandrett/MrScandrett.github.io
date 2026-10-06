// Practice viewport for Blender Lesson 01: a browser stand-in for Blender's 3D Viewport
// that answers to the same keys (G/R/S + X/Y/Z + typed numbers, Tab, N, Numpad views,
// Shift+A, Shift+D, Shift+S, F2, Ctrl+Z) and runs a drill that mirrors the lesson's
// navigation lap, transform rehearsal, and display-block build.
//
// Scene objects live under `world`, a group rotated so its children use Blender's
// Z-up coordinates directly; every number shown to students is in Blender space.
import { THREE } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

const lab = document.querySelector('[data-bl-practice]');
if (lab) init(lab);

function init(lab) {
  const V3 = THREE.Vector3;
  const DEG = Math.PI / 180;
  const FOV = 40;
  const AXES = { x: new V3(1, 0, 0), y: new V3(0, 1, 0), z: new V3(0, 0, 1) };
  const AXIS_HEX = { x: 0xff3352, y: 0x8bdc00, z: 0x2890ff };
  const AXIS_CSS = { x: '#ff3352', y: '#8bdc00', z: '#2890ff' };
  const COLOR_ACTIVE = 0xffaa40;
  const COLOR_SELECTED = 0xf15800;
  const COLOR_IDLE_WIRE = 0x111111;
  const VIEWS = {
    front: { yaw: 0, pitch: 0, label: 'Front' },
    back: { yaw: Math.PI, pitch: 0, label: 'Back' },
    right: { yaw: Math.PI / 2, pitch: 0, label: 'Right' },
    left: { yaw: -Math.PI / 2, pitch: 0, label: 'Left' },
    top: { yaw: 0, pitch: Math.PI / 2, label: 'Top' },
    bottom: { yaw: 0, pitch: -Math.PI / 2, label: 'Bottom' }
  };

  const $ = sel => lab.querySelector(sel);
  const view3d = $('.blp-view');
  const canvas = $('[data-blp-canvas]');
  const gizmoCanvas = $('[data-blp-gizmo]');
  const statusEl = $('[data-blp-status]');
  const modalEl = $('[data-blp-modal]');
  const viewLabelEl = $('[data-blp-viewlabel]');
  const sidebarEl = $('[data-blp-sidebar]');
  const menuEl = $('[data-blp-menu]');
  const renameForm = $('[data-blp-rename]');
  const renameInput = renameForm.querySelector('input');
  const outlinerEl = $('[data-blp-outliner]');
  const modeButton = $('[data-blp-mode]');
  const emulateBox = $('[data-blp-emulate]');

  if (!hasWebGL()) {
    lab.classList.add('is-unavailable');
    $('[data-blp-nowebgl]').hidden = false;
    return;
  }

  const b2t = v => new V3(v.x, v.z, -v.y);
  const near = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;
  // setFromPoints() reuses an existing buffer in three r180 and drops points past its old size
  const setPts = (geo, pts) => {
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap(p => [p.x, p.y, p.z]), 3));
    geo.computeBoundingSphere();
    return geo;
  };
  const nearV = (v, x, y, z) => near(v.x, x) && near(v.y, y) && near(v.z, z);
  const trim = n => { const r = Math.round(n * 1000) / 1000; return String(Object.is(r, -0) ? 0 : r); };
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* per-viewer convenience only */ } }
  };

  // ── renderer, cameras, lights, grid ───────────────────────────────────────
  const { renderer, scene, camera: persp, syncSize } = createScene(canvas, { THREE, fov: FOV, near: 0.05, far: 600, clearColor: 0x3d3d3d });
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -600, 600);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.6));
  const headlight = new THREE.DirectionalLight(0xffffff, 1.5);
  scene.add(headlight, headlight.target);

  const world = new THREE.Group();
  world.rotation.x = -Math.PI / 2;
  scene.add(world);

  const grid = new THREE.GridHelper(40, 40, 0x585858, 0x585858);
  grid.material.transparent = true;
  grid.material.opacity = 0.75;
  grid.material.depthWrite = false;
  grid.renderOrder = -2;
  scene.add(grid);
  const axisLine = (axis, len) => {
    const a = AXES[axis];
    const geo = new THREE.BufferGeometry().setFromPoints([a.clone().multiplyScalar(-len), a.clone().multiplyScalar(len)]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: AXIS_HEX[axis], transparent: true, opacity: 0.85, depthWrite: false }));
    line.renderOrder = -1;
    return line;
  };
  world.add(axisLine('x', 20), axisLine('y', 20));

  const constraintLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false }));
  constraintLine.renderOrder = 10;
  constraintLine.visible = false;
  world.add(constraintLine);

  const cursor3d = new V3();
  const cursorArt = buildCursorArt();
  scene.add(cursorArt);

  const meshMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.62, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const faceSelMaterial = new THREE.MeshBasicMaterial({ color: 0xffa028, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });

  // ── state ─────────────────────────────────────────────────────────────────
  let objects = [];
  let selected = new Set();
  let active = null;
  let mode = 'object';
  let editObj = null;
  let modal = null;
  let undoStack = [];
  let redoStack = [];
  let sidebarOpen = false;
  let lastPointer = null;
  let dirty = true;
  let uid = 0;
  const navStats = { orbit: 0, pan: 0, zoom: 0 };
  const view = { target: new V3(0, 0, 0), yaw: 40 * DEG, pitch: 24 * DEG, dist: 16, ortho: false, autoOrtho: false, axis: null, camera: false };
  const editArt = { faces: null, wire: null, points: null };
  emulateBox.checked = store.get('blp-emulate-numpad') === '1';

  // ── objects ───────────────────────────────────────────────────────────────
  const byId = id => objects.find(o => o.id === id);
  const cubeObj = () => byId('cube');

  function uniqueName(base) {
    if (!objects.some(o => o.name === base)) return base;
    for (let n = 1; ; n++) { const name = `${base}.${String(n).padStart(3, '0')}`; if (!objects.some(o => o.name === name)) return name; }
  }

  function createObject(kind, opts = {}) {
    const node = new THREE.Group();
    const obj = { id: opts.id || `o${++uid}`, kind, prim: opts.prim || null, name: opts.name, node };
    if (kind === 'mesh') {
      const geo = obj.prim === 'plane' ? new THREE.PlaneGeometry(2, 2) : new THREE.BoxGeometry(2, 2, 2);
      weld(obj, geo);
      obj.mesh = new THREE.Mesh(geo, meshMaterial);
      obj.outline = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: COLOR_SELECTED }));
      obj.outline.renderOrder = 2;
      node.add(obj.mesh, obj.outline);
      obj.pick = obj.mesh;
      obj.faceSel = new Set(obj.faces.map((_, i) => i));
      applyCorners(obj);
    } else {
      obj.art = kind === 'camera' ? buildCameraArt() : buildLightArt();
      obj.pick = new THREE.Mesh(new THREE.SphereGeometry(kind === 'camera' ? 0.9 : 0.45, 8, 6), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
      node.add(obj.art, obj.pick);
    }
    obj.pick.userData.obj = obj;
    world.add(node);
    objects.push(obj);
    return obj;
  }

  function removeObject(obj) {
    world.remove(obj.node);
    obj.node.traverse(child => { if (child.geometry) child.geometry.dispose(); });
    objects = objects.filter(o => o !== obj);
    selected.delete(obj.id);
    if (active === obj.id) active = null;
  }

  // Box/plane geometry keeps split vertices per face; weld them into shared corners so
  // moving a face drags every coincident vertex, and record each quad face's corners.
  function weld(obj, geo) {
    const pos = geo.attributes.position;
    const keyed = new Map();
    obj.corners = [];
    obj.cornerOf = new Int32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
      let id = keyed.get(key);
      if (id === undefined) { id = obj.corners.length; keyed.set(key, id); obj.corners.push(new V3(pos.getX(i), pos.getY(i), pos.getZ(i))); }
      obj.cornerOf[i] = id;
    }
    const idx = geo.index.array;
    obj.faces = [];
    const edgeKeys = new Map();
    for (let t = 0; t < idx.length / 3; t += 2) {
      const tris = [0, 1].map(k => [0, 1, 2].map(j => obj.cornerOf[idx[(t + k) * 3 + j]]));
      const count = new Map();
      tris.forEach(tri => tri.forEach((a, j) => { const b = tri[(j + 1) % 3]; const key = a < b ? `${a}-${b}` : `${b}-${a}`; count.set(key, (count.get(key) || 0) + 1); }));
      const edges = [...count].filter(([, c]) => c === 1).map(([key]) => key.split('-').map(Number));
      edges.forEach(([a, b]) => edgeKeys.set(`${a}-${b}`, [a, b]));
      obj.faces.push({ tris, edges, corners: [...new Set(tris.flat())] });
    }
    obj.edges = [...edgeKeys.values()];
  }

  function applyCorners(obj) {
    const geo = obj.mesh.geometry;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const c = obj.corners[obj.cornerOf[i]]; pos.setXYZ(i, c.x, c.y, c.z); }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    setPts(obj.outline.geometry, obj.edges.flatMap(([a, b]) => [obj.corners[a], obj.corners[b]]));
    if (obj === editObj) refreshEditArt();
  }

  function lineArt(points, closed) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return closed ? new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: 0x000000 })) : new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x000000 }));
  }
  function buildCameraArt() {
    const g = new THREE.Group();
    const w = 0.5, h = 0.32, d = -1;
    const c = [new V3(-w, -h, d), new V3(w, -h, d), new V3(w, h, d), new V3(-w, h, d)];
    const o = new V3();
    g.add(lineArt([o, c[0], o, c[1], o, c[2], o, c[3], c[0], c[1], c[1], c[2], c[2], c[3], c[3], c[0]]));
    g.add(lineArt([new V3(-0.18, h + 0.06, d), new V3(0.18, h + 0.06, d), new V3(0.18, h + 0.06, d), new V3(0, h + 0.28, d), new V3(0, h + 0.28, d), new V3(-0.18, h + 0.06, d)]));
    return g;
  }
  function buildLightArt() {
    const g = new THREE.Group();
    const ring = [];
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ring.push(new V3(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0)); }
    const loop = lineArt(ring, true);
    g.add(loop, lineArt([new V3(0, 0, -0.12), new V3(0, 0, -2.4)]));
    g.userData.billboard = loop;
    return g;
  }
  function buildCursorArt() {
    const g = new THREE.Group();
    const pts = [];
    const colors = [];
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2;
      pts.push(new V3(Math.cos(a0), Math.sin(a0), 0), new V3(Math.cos(a1), Math.sin(a1), 0));
      const c = i % 2 ? [1, 1, 1] : [1, 0.15, 0.15];
      colors.push(...c, ...c);
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(pts);
    ringGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = { vertexColors: true, depthTest: false };
    g.add(new THREE.LineSegments(ringGeo, new THREE.LineBasicMaterial(mat)));
    const ticks = [[1.3, 0], [2.2, 0], [-1.3, 0], [-2.2, 0], [0, 1.3], [0, 2.2], [0, -1.3], [0, -2.2]].map(([x, y]) => new V3(x, y, 0));
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), new THREE.LineBasicMaterial({ color: 0x111111, depthTest: false })));
    g.renderOrder = 9;
    g.children.forEach(child => { child.renderOrder = 9; });
    return g;
  }

  function defaultScene() {
    objects.slice().forEach(removeObject);
    createObject('mesh', { id: 'cube', prim: 'cube', name: 'Cube' });
    const cam = createObject('camera', { id: 'camera', name: 'Camera' });
    cam.node.position.set(7.3589, -6.9258, 4.9583);
    cam.node.rotation.set(63.559 * DEG, 0, 46.692 * DEG, 'ZYX');
    const light = createObject('light', { id: 'light', name: 'Light' });
    light.node.position.set(4.0762, 1.0055, 5.9039);
    selected = new Set(['cube']);
    active = 'cube';
    mode = 'object';
    editObj = null;
    cursor3d.set(0, 0, 0);
    detachEditArt();
  }

  // ── snapshots (undo) ──────────────────────────────────────────────────────
  function snapshot() {
    return {
      objs: objects.map(o => ({ id: o.id, kind: o.kind, prim: o.prim, name: o.name, p: o.node.position.toArray(), q: o.node.quaternion.toArray(), s: o.node.scale.toArray(), c: o.corners ? o.corners.map(v => v.toArray()) : null, f: o.faceSel ? [...o.faceSel] : null })),
      sel: [...selected], active, mode, editId: editObj?.id || null, cursor: cursor3d.toArray()
    };
  }
  function restore(snap) {
    detachEditArt();
    objects.slice().forEach(removeObject);
    snap.objs.forEach(s => {
      const o = createObject(s.kind, { id: s.id, prim: s.prim, name: s.name });
      o.node.position.fromArray(s.p);
      o.node.quaternion.fromArray(s.q);
      o.node.scale.fromArray(s.s);
      if (s.c) { o.corners = s.c.map(a => new V3().fromArray(a)); o.faceSel = new Set(s.f); applyCorners(o); }
    });
    selected = new Set(snap.sel.filter(byId));
    active = byId(snap.active) ? snap.active : null;
    mode = snap.mode;
    editObj = snap.editId ? byId(snap.editId) : null;
    if (mode === 'edit' && !editObj) mode = 'object';
    cursor3d.fromArray(snap.cursor);
    if (editObj) attachEditArt();
  }
  function pushUndo(snap) {
    undoStack.push(snap);
    if (undoStack.length > 80) undoStack.shift();
    redoStack = [];
  }
  function undo() {
    if (modal) return;
    if (!undoStack.length) { say('Nothing left to undo.'); return; }
    redoStack.push(snapshot());
    restore(undoStack.pop());
    say(`Undo. ${describeActive()}`);
    changed({ type: 'undo' });
  }
  function redo() {
    if (modal) return;
    if (!redoStack.length) { say('Nothing to redo.'); return; }
    undoStack.push(snapshot());
    restore(redoStack.pop());
    say(`Redo. ${describeActive()}`);
    changed({ type: 'redo' });
  }

  // ── measurements ──────────────────────────────────────────────────────────
  function dims(obj) {
    if (!obj?.mesh) return null;
    const size = obj.mesh.geometry.boundingBox.getSize(new V3());
    return new V3(size.x * Math.abs(obj.node.scale.x), size.y * Math.abs(obj.node.scale.y), size.z * Math.abs(obj.node.scale.z));
  }
  // three.js 'ZYX' order is the same rotation as Blender's default XYZ Euler
  function eulerDeg(obj) {
    const e = new THREE.Euler().setFromQuaternion(obj.node.quaternion, 'ZYX');
    return new V3(e.x / DEG, e.y / DEG, e.z / DEG);
  }
  const triple = v => `${trim(v.x)}, ${trim(v.y)}, ${trim(v.z)}`;
  function describeActive() {
    const o = byId(active);
    if (!o) return '';
    const d = dims(o);
    return `${o.name}: Location ${triple(o.node.position)}${d ? `, Dimensions ${triple(d)}` : ''}.`;
  }
  function pristine(o) {
    if (!o) return false;
    const r = eulerDeg(o);
    return nearV(o.node.position, 0, 0, 0) && nearV(r, 0, 0, 0) && nearV(dims(o), 2, 2, 2);
  }

  // ── view (Blender-style turntable) ────────────────────────────────────────
  const activeCam = () => (view.ortho ? ortho : persp);
  function viewBasis() {
    const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch), cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
    const offset = new V3(cp * sy, -cp * cy, sp);
    const right = new V3(cy, sy, 0);
    const up = new V3().crossVectors(offset, right);
    return { offset, right, up };
  }
  function updateCameras() {
    const { offset, right, up } = viewBasis();
    const pos = b2t(view.target.clone().addScaledVector(offset, view.dist));
    const basis = new THREE.Matrix4().makeBasis(b2t(right), b2t(up), b2t(offset));
    const aspect = Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1);
    const halfH = view.dist * Math.tan((FOV / 2) * DEG);
    [persp, ortho].forEach(cam => { cam.position.copy(pos); cam.quaternion.setFromRotationMatrix(basis); });
    ortho.left = -halfH * aspect; ortho.right = halfH * aspect; ortho.top = halfH; ortho.bottom = -halfH;
    ortho.updateProjectionMatrix();
    persp.aspect = aspect;
    persp.updateProjectionMatrix();
    persp.updateMatrixWorld();
    ortho.updateMatrixWorld();
    headlight.position.copy(pos).add(b2t(up.clone().multiplyScalar(view.dist * 0.6).addScaledVector(right, -view.dist * 0.4)));
    headlight.target.position.copy(b2t(view.target));
  }
  function worldPerPixel(point) {
    const { offset } = viewBasis();
    const camPos = view.target.clone().addScaledVector(offset, view.dist);
    const depth = view.ortho ? view.dist : Math.max(point.clone().sub(camPos).dot(offset.clone().negate()), 0.05);
    return (2 * depth * Math.tan((FOV / 2) * DEG)) / Math.max(canvas.clientHeight, 1);
  }
  function project(point) {
    const v = b2t(point).project(activeCam());
    return { x: ((v.x + 1) / 2) * canvas.clientWidth, y: ((1 - v.y) / 2) * canvas.clientHeight };
  }
  function leaveAxisView() {
    if (view.axis || view.camera) {
      view.axis = null;
      view.camera = false;
      if (view.autoOrtho) { view.ortho = false; view.autoOrtho = false; }
    }
  }
  function orbit(dYaw, dPitch) {
    leaveAxisView();
    view.yaw += dYaw;
    view.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, view.pitch + dPitch));
    navStats.orbit += Math.abs(dYaw) + Math.abs(dPitch);
    changed({ type: 'nav' }, false);
  }
  function pan(dx, dy) {
    const { right, up } = viewBasis();
    const w = worldPerPixel(view.target);
    view.target.addScaledVector(right, -dx * w).addScaledVector(up, dy * w);
    navStats.pan += Math.hypot(dx, dy);
    changed({ type: 'nav' }, false);
  }
  function zoom(factor) {
    view.dist = Math.max(0.4, Math.min(220, view.dist * factor));
    navStats.zoom += 1;
    changed({ type: 'nav' }, false);
  }
  function setAxisView(name) {
    const v = VIEWS[name];
    view.yaw = v.yaw;
    view.pitch = v.pitch;
    view.axis = name;
    view.camera = false;
    if (!view.ortho) { view.ortho = true; view.autoOrtho = true; }
    say(`${v.label} view.`);
    changed({ type: 'view', name });
  }
  function toggleOrtho() {
    view.ortho = !view.ortho;
    view.autoOrtho = false;
    say(view.ortho ? 'Orthographic: no perspective shrinking, good for measuring.' : 'Perspective view.');
    changed({ type: 'view', name: view.ortho ? 'ortho' : 'persp' });
  }
  function cameraView() {
    const cam = objects.find(o => o.kind === 'camera');
    if (!cam) { say('There is no Camera object in this scene.'); return; }
    const forward = new V3(0, 0, -1).applyQuaternion(cam.node.quaternion);
    const offset = forward.clone().negate();
    view.pitch = Math.asin(Math.max(-1, Math.min(1, offset.z)));
    view.yaw = Math.atan2(offset.x, -offset.y);
    view.dist = 10;
    view.target.copy(cam.node.position).addScaledVector(forward, view.dist);
    view.ortho = false;
    view.autoOrtho = false;
    view.axis = null;
    view.camera = true;
    say('Looking through the Camera: this is what a render would show.');
    changed({ type: 'view', name: 'camera' });
  }
  function frameObjects(list, label) {
    if (!list.length) { say('Nothing is selected to frame. Click an object (or its Outliner row) first.'); return false; }
    const box = new THREE.Box3();
    list.forEach(o => { o.node.updateMatrixWorld(true); box.expandByObject(o.mesh || o.pick); });
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    // box is in three.js world space; bring the centre back into Blender space
    view.target.set(sphere.center.x, -sphere.center.z, sphere.center.y);
    view.dist = Math.max(1.5, sphere.radius / Math.sin((FOV / 2) * DEG) * 1.1);
    leaveAxisView();
    say(label);
    return true;
  }
  function frameSelected() {
    const list = mode === 'edit' ? [editObj] : [...selected].map(byId).filter(Boolean);
    if (frameObjects(list, 'Frame Selected: the view is centred on your selection.')) changed({ type: 'frame' });
  }
  function frameAll(resetCursor) {
    if (resetCursor) cursor3d.set(0, 0, 0);
    if (frameObjects(objects, resetCursor ? 'View reset: 3D cursor back at the origin and everything framed.' : 'Frame All.')) changed({ type: 'frame-all' });
  }

  // ── picking ───────────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  function rayAt(px) {
    const ndc = new THREE.Vector2((px.x / canvas.clientWidth) * 2 - 1, -(px.y / canvas.clientHeight) * 2 + 1);
    activeCam().updateMatrixWorld();
    raycaster.setFromCamera(ndc, activeCam());
    return raycaster;
  }
  function pickObject(px) {
    const hit = rayAt(px).intersectObjects(objects.map(o => o.pick), false)[0];
    return hit ? hit.object.userData.obj : null;
  }
  function pickFace(px) {
    const hit = rayAt(px).intersectObject(editObj.mesh, false)[0];
    return hit ? Math.floor(hit.faceIndex / 2) : null;
  }
  function clickSelect(px, shift) {
    if (mode === 'edit') {
      const face = pickFace(px);
      if (face === null) { if (!shift) editObj.faceSel.clear(); }
      else if (shift) { editObj.faceSel.has(face) ? editObj.faceSel.delete(face) : editObj.faceSel.add(face); }
      else editObj.faceSel = new Set([face]);
      const n = editObj.faceSel.size;
      say(n ? `${n} face${n === 1 ? '' : 's'} selected${face !== null ? ` (${faceName(editObj, face)})` : ''}.` : 'No faces selected.');
      changed({ type: 'select' });
      return;
    }
    const obj = pickObject(px);
    if (!obj) { if (!shift) { selected.clear(); say('Deselected everything.'); } changed({ type: 'select' }); return; }
    if (shift) {
      if (selected.has(obj.id) && active === obj.id) { selected.delete(obj.id); active = null; }
      else { selected.add(obj.id); active = obj.id; }
    } else { selected = new Set([obj.id]); active = obj.id; }
    say(selected.has(obj.id) ? `Selected ${obj.name}.` : `Deselected ${obj.name}.`);
    changed({ type: 'select' });
  }
  function faceName(obj, face) {
    const f = obj.faces[face];
    const normal = new V3().subVectors(obj.corners[f.tris[0][1]], obj.corners[f.tris[0][0]]).cross(new V3().subVectors(obj.corners[f.tris[0][2]], obj.corners[f.tris[0][0]])).normalize();
    normal.applyQuaternion(obj.node.quaternion);
    const names = [['x', 'right', 'left'], ['y', 'back', 'front'], ['z', 'top', 'bottom']];
    const best = names.reduce((a, b) => (Math.abs(normal[b[0]]) > Math.abs(normal[a[0]]) ? b : a));
    return `${normal[best[0]] >= 0 ? best[1] : best[2]} face`;
  }

  // ── edit-mode drawing ─────────────────────────────────────────────────────
  function attachEditArt() {
    detachEditArt();
    editArt.faces = new THREE.Mesh(new THREE.BufferGeometry(), faceSelMaterial);
    editArt.wire = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true }));
    editArt.points = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 6, sizeAttenuation: false, vertexColors: true }));
    editArt.wire.renderOrder = 3;
    editArt.points.renderOrder = 4;
    editObj.node.add(editArt.faces, editArt.wire, editArt.points);
    refreshEditArt();
  }
  function detachEditArt() {
    ['faces', 'wire', 'points'].forEach(key => {
      const item = editArt[key];
      if (item) { item.parent?.remove(item); item.geometry.dispose(); if (key !== 'faces') item.material.dispose(); editArt[key] = null; }
    });
  }
  function refreshEditArt() {
    if (!editObj || !editArt.faces) return;
    const o = editObj;
    const selCorners = new Set([...o.faceSel].flatMap(f => o.faces[f].corners));
    const selEdges = new Set([...o.faceSel].flatMap(f => o.faces[f].edges.map(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`))));
    setPts(editArt.faces.geometry, [...o.faceSel].flatMap(f => o.faces[f].tris.flat().map(c => o.corners[c])));
    const wirePts = [], wireCol = [];
    o.edges.forEach(([a, b]) => {
      const on = selEdges.has(a < b ? `${a}-${b}` : `${b}-${a}`);
      wirePts.push(o.corners[a], o.corners[b]);
      const c = on ? [1, 0.63, 0.16] : [0.07, 0.07, 0.07];
      wireCol.push(...c, ...c);
    });
    setPts(editArt.wire.geometry, wirePts);
    editArt.wire.geometry.setAttribute('color', new THREE.Float32BufferAttribute(wireCol, 3));
    setPts(editArt.points.geometry, o.corners);
    editArt.points.geometry.setAttribute('color', new THREE.Float32BufferAttribute(o.corners.flatMap((_, i) => (selCorners.has(i) ? [1, 0.63, 0.16] : [0.05, 0.05, 0.05])), 3));
  }

  // ── modes, adding, deleting, renaming ─────────────────────────────────────
  function toggleEditMode() {
    if (modal) return;
    if (mode === 'edit') {
      mode = 'object';
      detachEditArt();
      editObj = null;
      say(`Object Mode. ${describeActive()}`);
      changed({ type: 'mode' });
      return;
    }
    const obj = byId(active);
    if (!obj || !selected.has(obj.id)) { say('Select a mesh object first, then press Tab.'); return; }
    if (obj.kind !== 'mesh') { say(`${obj.name} is a ${obj.kind}. Only meshes have Edit Mode.`); return; }
    mode = 'edit';
    editObj = obj;
    attachEditArt();
    say(`Edit Mode on ${obj.name}. Faces you click turn orange; ${obj.faceSel.size} selected now.`);
    changed({ type: 'mode' });
  }
  function addPrimitive(prim) {
    closeMenu();
    if (mode === 'edit') { say(`You're in Edit Mode. In Blender this would merge the new ${prim} into ${editObj.name}'s mesh. Press Tab for Object Mode first.`); return; }
    pushUndo(snapshot());
    const obj = createObject('mesh', { prim, name: uniqueName(prim === 'plane' ? 'Plane' : 'Cube') });
    obj.node.position.copy(cursor3d);
    selected = new Set([obj.id]);
    active = obj.id;
    say(`Added ${obj.name} at the 3D cursor (${triple(cursor3d)}).`);
    changed({ type: 'add', prim });
  }
  function deleteSelected() {
    if (mode === 'edit') { say('Deleting faces is a Lesson 02 move. Here, Tab back to Object Mode to delete whole objects.'); return; }
    const list = [...selected].map(byId).filter(Boolean);
    if (!list.length) { say('Nothing selected to delete.'); return; }
    pushUndo(snapshot());
    list.forEach(removeObject);
    say(`Deleted ${list.map(o => o.name).join(', ')}. Ctrl+Z brings ${list.length === 1 ? 'it' : 'them'} back.`);
    changed({ type: 'delete' });
  }
  function duplicateSelected() {
    if (mode === 'edit') { say('Shift+D in Edit Mode duplicates faces inside the mesh; this practice viewport duplicates whole objects in Object Mode.'); return; }
    const list = [...selected].map(byId).filter(Boolean);
    if (!list.length) { say('Select something to duplicate.'); return; }
    const undoSnap = snapshot();
    const copies = list.map(o => {
      const c = createObject(o.kind, { prim: o.prim, name: uniqueName(o.name.replace(/\.\d{3}$/, '')) });
      c.node.position.copy(o.node.position);
      c.node.quaternion.copy(o.node.quaternion);
      c.node.scale.copy(o.node.scale);
      if (o.corners) { c.corners = o.corners.map(v => v.clone()); c.faceSel = new Set(o.faceSel); applyCorners(c); }
      return c;
    });
    selected = new Set(copies.map(c => c.id));
    active = copies[copies.length - 1].id;
    startModal('G', { undoSnap, isDup: true });
  }
  function snapCursor(kind) {
    closeMenu();
    if (kind === 'origin') { cursor3d.set(0, 0, 0); say('3D cursor moved to the world origin (0, 0, 0). New objects appear here.'); }
    else if (kind === 'selected') {
      const piv = selectionPivot();
      if (!piv) { say('Select something first.'); return; }
      cursor3d.copy(piv);
      say(`3D cursor moved to the selection (${triple(cursor3d)}).`);
    } else if (kind === 'selection-to-cursor') {
      if (mode === 'edit' || !selected.size) { say('Select objects in Object Mode first.'); return; }
      pushUndo(snapshot());
      [...selected].map(byId).forEach(o => o.node.position.copy(cursor3d));
      say(`Moved the selection to the 3D cursor. ${describeActive()}`);
    }
    changed({ type: 'cursor', kind });
  }
  function placeCursor(px) {
    const ray = rayAt(px).ray;
    const hit = raycaster.intersectObjects(objects.filter(o => o.mesh).map(o => o.mesh), false)[0];
    let point = hit ? hit.point : null;
    if (!point) {
      const ground = new THREE.Plane(new V3(0, 1, 0), 0);
      point = ray.intersectPlane(ground, new V3());
    }
    if (!point) return;
    cursor3d.set(point.x, -point.z, point.y);
    say(`3D cursor placed at ${triple(cursor3d)}.`);
    changed({ type: 'cursor', kind: 'place' });
  }
  function openRename() {
    const obj = byId(active);
    if (!obj) { say('Select an object to rename.'); return; }
    renameForm.hidden = false;
    renameInput.value = obj.name;
    renameInput.focus();
    renameInput.select();
  }
  function closeRename(commit) {
    if (renameForm.hidden) return;
    const obj = byId(active);
    const name = renameInput.value.trim().slice(0, 48);
    renameForm.hidden = true;
    view3d.focus({ preventScroll: true });
    if (!commit || !obj || !name || name === obj.name) return;
    pushUndo(snapshot());
    obj.name = objects.some(o => o !== obj && o.name === name) ? uniqueName(name) : name;
    say(`Renamed to ${obj.name}.`);
    changed({ type: 'rename' });
  }

  // ── popup menus (Shift+A / Shift+S) ───────────────────────────────────────
  function openMenu(title, items) {
    menuEl.replaceChildren();
    const head = document.createElement('p');
    head.className = 'blp-menu-title';
    head.textContent = title;
    menuEl.append(head);
    items.forEach(([label, action]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', action);
      menuEl.append(button);
    });
    const p = lastPointer || { x: canvas.clientWidth / 2, y: canvas.clientHeight / 3 };
    menuEl.hidden = false;
    menuEl.style.left = `${Math.min(p.x, canvas.clientWidth - menuEl.offsetWidth - 8)}px`;
    menuEl.style.top = `${Math.min(p.y, canvas.clientHeight - menuEl.offsetHeight - 8)}px`;
    menuEl.querySelector('button').focus({ preventScroll: true });
  }
  function closeMenu() {
    if (menuEl.hidden) return;
    menuEl.hidden = true;
    view3d.focus({ preventScroll: true });
  }
  menuEl.addEventListener('keydown', event => {
    const buttons = [...menuEl.querySelectorAll('button')];
    const i = buttons.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenu(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); buttons[(i + 1) % buttons.length].focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length].focus(); }
  });

  // ── modal transforms (G / R / S) ──────────────────────────────────────────
  function selectionPivot() {
    if (mode === 'edit') {
      const ids = editCornerIds();
      if (!ids.length) return null;
      editObj.node.updateMatrix();
      const sum = new V3();
      ids.forEach(id => sum.add(editObj.corners[id].clone().applyMatrix4(editObj.node.matrix)));
      return sum.divideScalar(ids.length);
    }
    const list = [...selected].map(byId).filter(Boolean);
    if (!list.length) return null;
    return list.reduce((sum, o) => sum.add(o.node.position), new V3()).divideScalar(list.length);
  }
  const editCornerIds = () => [...new Set([...editObj.faceSel].flatMap(f => editObj.faces[f].corners))];
  const pointerOrCenter = () => (lastPointer ? { ...lastPointer } : { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 });

  function startModal(op, extra = {}) {
    const pivot = selectionPivot();
    if (!pivot) { say(mode === 'edit' ? 'Select a face first: click it (Shift+click adds more).' : 'Select an object first: left-click it or its Outliner row.'); return; }
    const start = mode === 'edit'
      ? { corners: editObj.corners.map(v => v.clone()), ids: editCornerIds() }
      : { objs: [...selected].map(byId).filter(Boolean).map(o => ({ o, p: o.node.position.clone(), q: o.node.quaternion.clone(), s: o.node.scale.clone() })) };
    let m0 = pointerOrCenter();
    if (op === 'S' || op === 'R') {
      const p = project(pivot);
      const d = Math.hypot(m0.x - p.x, m0.y - p.y);
      if (d < 40) m0 = { x: p.x + 80, y: p.y };
    }
    modal = { op, axis: null, typed: '', undoSnap: extra.undoSnap || snapshot(), isDup: !!extra.isDup, start, pivot, m0, angAcc: 0, angLast: null, snap: false };
    updateModal();
    changed({ type: 'modal-start', op }, false);
  }
  function restoreStart() {
    if (modal.start.objs) modal.start.objs.forEach(({ o, p, q, s }) => { o.node.position.copy(p); o.node.quaternion.copy(q); o.node.scale.copy(s); });
    else { editObj.corners = modal.start.corners.map(v => v.clone()); applyCorners(editObj); }
  }
  function typedValue() {
    if (!modal.typed || modal.typed === '-' || modal.typed === '.' || modal.typed === '-.') return null;
    const v = parseFloat(modal.typed);
    return Number.isFinite(v) ? v : null;
  }
  function axisMouse(a, dx, dy) {
    const p0 = project(modal.pivot);
    const p1 = project(modal.pivot.clone().add(a));
    const dir = { x: p1.x - p0.x, y: p1.y - p0.y };
    const len2 = dir.x * dir.x + dir.y * dir.y;
    if (len2 < 4) return -dy * worldPerPixel(modal.pivot);
    return (dx * dir.x + dy * dir.y) / len2;
  }
  function modalValue() {
    const m = lastPointer || modal.m0;
    const dx = m.x - modal.m0.x, dy = m.y - modal.m0.y;
    const typed = typedValue();
    const axisName = modal.axis ? modal.axis.toUpperCase() : '';
    const along = modal.axis ? ` along global ${axisName}` : '';
    const shown = v => (modal.typed ? `${modal.typed}|` : trim(v));
    const { offset, right, up } = viewBasis();
    if (modal.op === 'G') {
      if (modal.axis) {
        let v = typed ?? axisMouse(AXES[modal.axis], dx, dy);
        if (typed === null && modal.snap) v = Math.round(v);
        return { d: AXES[modal.axis].clone().multiplyScalar(v), text: `Move · D: ${shown(v)} m${along}` };
      }
      if (typed !== null) return { d: new V3(typed, 0, 0), text: `Move · Dx: ${shown(typed)} m (a typed number goes along X until you press an axis key)` };
      const w = worldPerPixel(modal.pivot);
      const d = right.clone().multiplyScalar(dx * w).addScaledVector(up, -dy * w);
      if (modal.snap) d.set(Math.round(d.x), Math.round(d.y), Math.round(d.z));
      return { d, text: `Move · Dx: ${trim(d.x)}  Dy: ${trim(d.y)}  Dz: ${trim(d.z)} m (free: press X, Y or Z to lock an axis)` };
    }
    if (modal.op === 'R') {
      const axisVec = modal.axis ? AXES[modal.axis] : offset.clone().negate();
      let deg;
      if (typed !== null) deg = typed;
      else {
        const p = project(modal.pivot);
        const cur = Math.atan2(-(m.y - p.y), m.x - p.x);
        if (modal.angLast === null) modal.angLast = Math.atan2(-(modal.m0.y - p.y), modal.m0.x - p.x);
        let delta = cur - modal.angLast;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        modal.angAcc += delta;
        modal.angLast = cur;
        const sign = modal.axis ? (AXES[modal.axis].dot(offset) >= 0 ? 1 : -1) : -1;
        deg = (sign * modal.angAcc) / DEG;
        if (modal.snap) deg = Math.round(deg / 5) * 5;
      }
      return { axisVec, angle: deg * DEG, text: `Rotate · ${shown(deg)}°${modal.axis ? along : ' around the view axis'}` };
    }
    let f;
    if (typed !== null) f = typed;
    else {
      const p = project(modal.pivot);
      f = Math.hypot(m.x - p.x, m.y - p.y) / Math.max(Math.hypot(modal.m0.x - p.x, modal.m0.y - p.y), 24);
      if (modal.snap) f = Math.round(f * 10) / 10;
    }
    const factor = modal.axis ? new V3(1, 1, 1).setComponent('xyz'.indexOf(modal.axis), f) : new V3(f, f, f);
    return { factor, uniform: !modal.axis, f, text: `Scale · ${shown(f)}${modal.axis ? along : ' on every axis'}` };
  }
  function transformPoint(w0, r) {
    const piv = modal.pivot;
    if (modal.op === 'G') return w0.clone().add(r.d);
    if (modal.op === 'R') return w0.clone().sub(piv).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(r.axisVec, r.angle)).add(piv);
    return w0.clone().sub(piv).multiply(r.factor).add(piv);
  }
  function applyModal(r) {
    if (modal.start.objs) {
      modal.start.objs.forEach(({ o, p, q, s }) => {
        o.node.position.copy(transformPoint(p, r));
        if (modal.op === 'R') o.node.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(r.axisVec, r.angle).multiply(q));
        else o.node.quaternion.copy(q);
        const scale = s.clone();
        if (modal.op === 'S') {
          if (r.uniform) scale.multiplyScalar(r.f);
          else {
            const basis = new THREE.Matrix4().makeRotationFromQuaternion(q);
            const cols = [new V3(), new V3(), new V3()];
            basis.extractBasis(cols[0], cols[1], cols[2]);
            ['x', 'y', 'z'].forEach((axis, i) => {
              const fi = r.factor.getComponent(i);
              if (fi === 1) return;
              const j = cols.reduce((best, col, k) => (Math.abs(col.getComponent(i)) > Math.abs(cols[best].getComponent(i)) ? k : best), 0);
              scale.setComponent(j, scale.getComponent(j) * fi);
            });
          }
        }
        o.node.scale.copy(scale);
      });
    } else {
      editObj.node.updateMatrix();
      const M = editObj.node.matrix;
      const inv = M.clone().invert();
      editObj.corners = modal.start.corners.map(v => v.clone());
      modal.start.ids.forEach(id => { editObj.corners[id] = transformPoint(modal.start.corners[id].clone().applyMatrix4(M), r).applyMatrix4(inv); });
      applyCorners(editObj);
    }
  }
  function updateModal() {
    const r = modalValue();
    applyModal(r);
    modalEl.hidden = false;
    modalEl.textContent = `${r.text}   ·   Enter or click: confirm   ·   Esc or right-click: cancel`;
    if (modal.axis) {
      const a = AXES[modal.axis];
      setPts(constraintLine.geometry, [modal.pivot.clone().addScaledVector(a, -500), modal.pivot.clone().addScaledVector(a, 500)]);
      constraintLine.material.color.setHex(AXIS_HEX[modal.axis]);
      constraintLine.visible = true;
    } else constraintLine.visible = false;
    refreshSidebar();
    dirty = true;
  }
  function endModalDisplay() {
    modalEl.hidden = true;
    constraintLine.visible = false;
  }
  const OP_NAME = { G: 'Moved', R: 'Rotated', S: 'Scaled' };
  function confirmModal() {
    const m = modal;
    modal = null;
    endModalDisplay();
    pushUndo(m.undoSnap);
    const what = mode === 'edit' ? `the selected face${editObj.faceSel.size === 1 ? '' : 's'}` : [...selected].map(id => byId(id)?.name).join(', ');
    say(`${m.isDup ? 'Duplicated and moved' : OP_NAME[m.op]} ${what}${m.axis ? ` along ${m.axis.toUpperCase()}` : ''}. ${describeActive()}`);
    changed({ type: 'transform', op: m.op, axis: m.axis, typed: m.typed !== '' });
  }
  function cancelModal() {
    const m = modal;
    restoreStart();
    modal = null;
    endModalDisplay();
    if (m.isDup) pushUndo(m.undoSnap);
    say(m.isDup ? 'Duplicate kept in place; the move was cancelled.' : 'Cancelled. Nothing changed.');
    changed({ type: 'cancel', op: m.op, axis: m.axis });
  }
  function modalKey(code, key) {
    if (code === 'KeyX' || code === 'KeyY' || code === 'KeyZ') {
      const axis = code[3].toLowerCase();
      modal.axis = modal.axis === axis ? null : axis;
    } else if (code === 'KeyG' || code === 'KeyR' || code === 'KeyS') {
      const op = code[3];
      if (op !== modal.op) { restoreStart(); modal.op = op; modal.angAcc = 0; modal.angLast = null; }
    } else if (/^[0-9]$/.test(key) || key === '.' || key === ',') modal.typed += key === ',' ? '.' : key;
    else if (key === '-' || code === 'NumpadSubtract') modal.typed = modal.typed.startsWith('-') ? modal.typed.slice(1) : `-${modal.typed}`;
    else if (code === 'Backspace') modal.typed = modal.typed.slice(0, -1);
    else if (code === 'Enter' || code === 'NumpadEnter') { confirmModal(); return true; }
    else if (code === 'Escape') { cancelModal(); return true; }
    else return false;
    updateModal();
    return true;
  }

  // ── keyboard ──────────────────────────────────────────────────────────────
  const NUMPAD_FROM_DIGIT = { Digit0: 'Numpad0', Digit1: 'Numpad1', Digit2: 'Numpad2', Digit3: 'Numpad3', Digit4: 'Numpad4', Digit5: 'Numpad5', Digit6: 'Numpad6', Digit7: 'Numpad7', Digit8: 'Numpad8', Digit9: 'Numpad9' };
  function numpadKey(code, ctrl) {
    switch (code) {
      case 'Numpad1': setAxisView(ctrl ? 'back' : 'front'); return true;
      case 'Numpad3': setAxisView(ctrl ? 'left' : 'right'); return true;
      case 'Numpad7': setAxisView(ctrl ? 'bottom' : 'top'); return true;
      case 'Numpad5': toggleOrtho(); return true;
      case 'Numpad0': cameraView(); return true;
      case 'NumpadDecimal': frameSelected(); return true;
      case 'Numpad4': orbit(-15 * DEG, 0); return true;
      case 'Numpad6': orbit(15 * DEG, 0); return true;
      case 'Numpad8': orbit(0, -15 * DEG); return true;
      case 'Numpad2': orbit(0, 15 * DEG); return true;
      default: return false;
    }
  }
  function handleKey(e) {
    const { code, key } = e;
    const ctrl = e.ctrlKey || e.metaKey;
    if (modal) { if (code === 'ControlLeft' || code === 'ControlRight') { modal.snap = true; return true; } return modalKey(code, key); }
    if (ctrl && code === 'KeyZ') { e.shiftKey ? redo() : undo(); return true; }
    if (ctrl && code === 'KeyY') { redo(); return true; }
    if (ctrl && code === 'KeyS') { say('Ctrl+S saves in real Blender. This practice viewport has nothing to save, but keep the habit.'); return true; }
    const numCode = emulateBox.checked && NUMPAD_FROM_DIGIT[code] ? NUMPAD_FROM_DIGIT[code] : code;
    if (numCode.startsWith('Numpad') && numpadKey(numCode, ctrl)) return true;
    if (ctrl || (e.altKey && code !== 'KeyA')) return false;
    if (e.shiftKey) {
      if (code === 'KeyA') { openMenu('Add · Mesh', [['Cube', () => addPrimitive('cube')], ['Plane', () => addPrimitive('plane')]]); return true; }
      if (code === 'KeyD') { duplicateSelected(); return true; }
      if (code === 'KeyS') { openMenu('Snap', [['Cursor to World Origin', () => snapCursor('origin')], ['Cursor to Selected', () => snapCursor('selected')], ['Selection to Cursor', () => snapCursor('selection-to-cursor')]]); return true; }
      if (code === 'KeyC') { frameAll(true); return true; }
      return false;
    }
    switch (code) {
      case 'KeyG': case 'KeyR': case 'KeyS': startModal(code[3]); return true;
      case 'Tab': toggleEditMode(); return true;
      case 'KeyN': toggleSidebar(); return true;
      case 'KeyA':
        if (e.altKey) { if (mode === 'edit') editObj.faceSel.clear(); else selected.clear(); say('Deselected everything (Alt+A).'); }
        else if (mode === 'edit') { editObj.faceSel = new Set(editObj.faces.map((_, i) => i)); say('Selected every face (A).'); }
        else { selected = new Set(objects.map(o => o.id)); if (!active && objects[0]) active = objects[0].id; say('Selected every object (A).'); }
        changed({ type: 'select' });
        return true;
      case 'KeyX': case 'Delete': deleteSelected(); return true;
      case 'F2': openRename(); return true;
      case 'Home': frameAll(false); return true;
      case 'Digit1': case 'Digit2': case 'Digit3':
        if (mode === 'edit') { say(code === 'Digit3' ? 'Face Select (3) is already on.' : 'Vertex (1) and Edge (2) select work in real Blender. This practice sticks to Face Select (3).'); return true; }
        say('No numpad? Tick "Emulate Numpad" above, or use the view buttons and the axis gizmo.');
        return true;
      case 'Escape': view3d.blur(); say('Keyboard released. Click the viewport to use Blender keys again.'); return true;
      default: return false;
    }
  }
  view3d.addEventListener('keydown', event => {
    if (event.target !== view3d) return;
    if (handleKey(event)) event.preventDefault();
  });
  view3d.addEventListener('keyup', event => {
    if (modal && (event.code === 'ControlLeft' || event.code === 'ControlRight')) { modal.snap = false; updateModal(); }
  });

  // ── pointer: select, navigate, drive transforms ───────────────────────────
  const localPoint = event => { const r = canvas.getBoundingClientRect(); return { x: event.clientX - r.left, y: event.clientY - r.top }; };
  let drag = null;
  const touches = new Map();
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('pointerdown', event => {
    view3d.focus({ preventScroll: true });
    closeMenu();
    const p = localPoint(event);
    lastPointer = p;
    if (event.pointerType === 'touch') {
      touches.set(event.pointerId, p);
      canvas.setPointerCapture(event.pointerId);
      drag = touches.size === 1 ? { kind: 'touch', start: p, last: p, moved: false } : { kind: 'pinch', mid: midpoint(), span: span() };
      return;
    }
    if (modal) {
      event.preventDefault();
      if (event.button === 0) confirmModal();
      else if (event.button === 2) cancelModal();
      return;
    }
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      drag = { kind: event.shiftKey ? 'pan' : event.ctrlKey ? 'zoom' : 'orbit', last: p };
      return;
    }
    if (event.button === 2 && event.shiftKey) { placeCursor(p); return; }
    if (event.button === 0) clickSelect(p, event.shiftKey);
  });
  canvas.addEventListener('pointermove', event => {
    const p = localPoint(event);
    lastPointer = p;
    if (event.pointerType === 'touch' && touches.has(event.pointerId)) {
      touches.set(event.pointerId, p);
      if (drag?.kind === 'touch') {
        if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 6) drag.moved = true;
        if (modal) { updateModal(); return; }
        if (drag.moved) orbit(-(p.x - drag.last.x) * 0.008, (p.y - drag.last.y) * 0.008);
        drag.last = p;
      } else if (drag?.kind === 'pinch' && touches.size >= 2) {
        const mid = midpoint(), s = span();
        if (drag.span > 0 && s > 0) zoom(drag.span / s);
        pan(mid.x - drag.mid.x, mid.y - drag.mid.y);
        drag.mid = mid;
        drag.span = s;
      }
      return;
    }
    if (modal) { modal.snap = event.ctrlKey; updateModal(); return; }
    if (!drag) return;
    const dx = p.x - drag.last.x, dy = p.y - drag.last.y;
    drag.last = p;
    if (drag.kind === 'orbit') orbit(-dx * 0.008, dy * 0.008);
    else if (drag.kind === 'pan') pan(dx, dy);
    else if (drag.kind === 'zoom') zoom(Math.exp(dy * 0.01));
  });
  const endPointer = event => {
    if (event.pointerType === 'touch') {
      const wasTap = drag?.kind === 'touch' && !drag.moved;
      touches.delete(event.pointerId);
      if (wasTap) { if (modal) confirmModal(); else clickSelect(localPoint(event), false); }
      drag = touches.size === 1 ? { kind: 'touch', start: [...touches.values()][0], last: [...touches.values()][0], moved: true } : null;
      return;
    }
    drag = null;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { if (!modal) lastPointer = null; });
  const midpoint = () => { const pts = [...touches.values()]; return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }; };
  const span = () => { const pts = [...touches.values()]; return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); };
  canvas.addEventListener('wheel', event => {
    if (document.activeElement !== view3d) { lab.classList.add('show-focus-hint'); return; }
    event.preventDefault();
    zoom(event.deltaY > 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });

  view3d.addEventListener('focusin', () => lab.classList.add('has-focus'));
  view3d.addEventListener('focusout', event => {
    if (view3d.contains(event.relatedTarget)) return;
    lab.classList.remove('has-focus', 'show-focus-hint');
    if (modal && !lab.contains(event.relatedTarget)) cancelModal();
  });

  // ── navigation gizmo + its drag buttons ───────────────────────────────────
  const gctx = gizmoCanvas.getContext('2d');
  let gizmoHits = [];
  function drawGizmo() {
    const size = gizmoCanvas.clientWidth || 96;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (gizmoCanvas.width !== Math.round(size * dpr)) { gizmoCanvas.width = Math.round(size * dpr); gizmoCanvas.height = Math.round(size * dpr); }
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gctx.clearRect(0, 0, size, size);
    const c = size / 2, R = size / 2 - 13;
    gctx.fillStyle = 'rgba(255,255,255,0.07)';
    gctx.beginPath(); gctx.arc(c, c, size / 2 - 2, 0, Math.PI * 2); gctx.fill();
    const inv = activeCam().quaternion.clone().invert();
    const items = [];
    ['x', 'y', 'z'].forEach(axis => [1, -1].forEach(sign => {
      const v = b2t(AXES[axis].clone().multiplyScalar(sign)).applyQuaternion(inv);
      items.push({ axis, sign, x: c + v.x * R, y: c - v.y * R, z: v.z });
    }));
    items.sort((a, b) => a.z - b.z);
    items.forEach(it => {
      if (it.sign > 0) {
        gctx.strokeStyle = AXIS_CSS[it.axis];
        gctx.lineWidth = 2;
        gctx.beginPath(); gctx.moveTo(c, c); gctx.lineTo(it.x, it.y); gctx.stroke();
      }
      gctx.beginPath();
      gctx.arc(it.x, it.y, it.sign > 0 ? 9 : 7, 0, Math.PI * 2);
      gctx.fillStyle = it.sign > 0 ? AXIS_CSS[it.axis] : `${AXIS_CSS[it.axis]}55`;
      gctx.fill();
      if (it.sign < 0) { gctx.strokeStyle = AXIS_CSS[it.axis]; gctx.lineWidth = 1.5; gctx.stroke(); }
      if (it.sign > 0) {
        gctx.fillStyle = '#111';
        gctx.font = '700 10px "DM Sans", sans-serif';
        gctx.textAlign = 'center';
        gctx.textBaseline = 'middle';
        gctx.fillText(it.axis.toUpperCase(), it.x, it.y + 0.5);
      }
    });
    gizmoHits = items.slice().reverse();
  }
  const GIZMO_VIEW = { 'x1': 'right', 'x-1': 'left', 'y1': 'back', 'y-1': 'front', 'z1': 'top', 'z-1': 'bottom' };
  let gizmoDrag = null;
  gizmoCanvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    view3d.focus({ preventScroll: true });
    gizmoCanvas.setPointerCapture(event.pointerId);
    gizmoDrag = { x: event.clientX, y: event.clientY, moved: false };
  });
  gizmoCanvas.addEventListener('pointermove', event => {
    if (!gizmoDrag) return;
    const dx = event.clientX - gizmoDrag.x, dy = event.clientY - gizmoDrag.y;
    if (!gizmoDrag.moved && Math.hypot(dx, dy) < 3) return;
    gizmoDrag.moved = true;
    gizmoDrag.x = event.clientX;
    gizmoDrag.y = event.clientY;
    orbit(-dx * 0.012, dy * 0.012);
  });
  gizmoCanvas.addEventListener('pointerup', event => {
    if (gizmoDrag && !gizmoDrag.moved) {
      const r = gizmoCanvas.getBoundingClientRect();
      const x = event.clientX - r.left, y = event.clientY - r.top;
      const hit = gizmoHits.find(it => Math.hypot(it.x - x, it.y - y) < 11);
      if (hit) setAxisView(GIZMO_VIEW[`${hit.axis}${hit.sign}`]);
    }
    gizmoDrag = null;
  });
  lab.querySelectorAll('[data-blp-navdrag]').forEach(button => {
    let last = null;
    button.addEventListener('pointerdown', event => { event.preventDefault(); view3d.focus({ preventScroll: true }); button.setPointerCapture(event.pointerId); last = { x: event.clientX, y: event.clientY }; });
    button.addEventListener('pointermove', event => {
      if (!last) return;
      const dx = event.clientX - last.x, dy = event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };
      if (button.dataset.blpNavdrag === 'pan') pan(dx, dy); else zoom(Math.exp(dy * 0.01));
    });
    button.addEventListener('pointerup', () => { last = null; });
    button.addEventListener('click', () => { if (button.dataset.blpNavdrag === 'zoom') zoom(1 / 1.25); });
  });

  // ── header buttons, on-screen keys ────────────────────────────────────────
  lab.querySelectorAll('[data-blp-view]').forEach(button => button.addEventListener('click', () => {
    const name = button.dataset.blpView;
    if (VIEWS[name]) setAxisView(name);
    else if (name === 'ortho') toggleOrtho();
    else if (name === 'frame') frameSelected();
    else if (name === 'camera') cameraView();
  }));
  modeButton.addEventListener('click', toggleEditMode);
  lab.querySelector('[data-blp-cmd="undo"]').addEventListener('click', undo);
  lab.querySelector('[data-blp-cmd="redo"]').addEventListener('click', redo);
  lab.querySelector('[data-blp-cmd="sidebar"]').addEventListener('click', toggleSidebar);
  lab.querySelector('[data-blp-reset]').addEventListener('click', () => {
    if (modal) cancelModal();
    pushUndo(snapshot());
    defaultScene();
    view.target.set(0, 0, 0); view.yaw = 40 * DEG; view.pitch = 24 * DEG; view.dist = 16; view.ortho = false; view.axis = null; view.camera = false;
    say('Scene reset to Blender\'s startup file: Cube, Camera, Light. Ctrl+Z undoes the reset.');
    changed({ type: 'reset' });
  });
  emulateBox.addEventListener('change', () => {
    store.set('blp-emulate-numpad', emulateBox.checked ? '1' : '0');
    say(emulateBox.checked ? 'Emulate Numpad on: the number row now changes views, just like the Blender preference. In Edit Mode it also takes over 1, 2, 3.' : 'Emulate Numpad off.');
  });
  lab.querySelectorAll('[data-blp-key]').forEach(button => {
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => {
      const [code, key = ''] = button.dataset.blpKey.split('|');
      const mods = (button.dataset.blpMods || '').split(' ');
      handleKey({ code, key, shiftKey: mods.includes('shift'), ctrlKey: mods.includes('ctrl'), altKey: mods.includes('alt'), metaKey: false });
    });
  });
  renameForm.addEventListener('submit', event => { event.preventDefault(); closeRename(true); });
  renameInput.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRename(false); } });
  renameInput.addEventListener('blur', event => { if (!renameForm.contains(event.relatedTarget)) closeRename(true); });

  // ── panels ────────────────────────────────────────────────────────────────
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    sidebarEl.hidden = !sidebarOpen;
    lab.querySelector('[data-blp-cmd="sidebar"]').setAttribute('aria-pressed', String(sidebarOpen));
    refreshSidebar();
    say(sidebarOpen ? 'Sidebar open. The Item tab shows exact Location, Rotation, Scale and Dimensions.' : 'Sidebar hidden (N brings it back).');
    changed({ type: 'sidebar' }, false);
  }
  function row(label, v, unit) {
    return `<div class="blp-field"><span>${label}</span><b>${trim(v.x)}${unit}</b><b>${trim(v.y)}${unit}</b><b>${trim(v.z)}${unit}</b></div>`;
  }
  function refreshSidebar() {
    if (!sidebarOpen) return;
    const o = byId(active);
    const body = sidebarEl.querySelector('[data-blp-item]');
    if (!o) { body.innerHTML = '<p class="blp-empty">Nothing active. Click an object.</p>'; return; }
    let html = `<p class="blp-item-name">${escapeHtml(o.name)}</p><div class="blp-field blp-field-head"><span></span><i>X</i><i>Y</i><i>Z</i></div>`;
    if (mode === 'edit' && o === editObj) {
      const piv = selectionPivot();
      html += piv ? row('Median', piv, ' m') : '<p class="blp-empty">No faces selected.</p>';
      html += '<p class="blp-note">Edit Mode shows the selection’s median point. The object’s Location is in Object Mode.</p>';
    } else {
      html += row('Location', o.node.position, ' m') + row('Rotation', eulerDeg(o), '°') + row('Scale', o.node.scale, '');
    }
    const d = dims(o);
    if (d) html += row('Dimensions', d, ' m');
    body.innerHTML = html;
  }
  function refreshOutliner() {
    outlinerEl.replaceChildren(...objects.map(o => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `blp-row is-${o.kind}${selected.has(o.id) ? ' is-selected' : ''}${active === o.id ? ' is-active' : ''}`;
      button.setAttribute('aria-pressed', String(selected.has(o.id)));
      button.innerHTML = `<span aria-hidden="true">${o.kind === 'mesh' ? '▣' : o.kind === 'camera' ? '◭' : '✺'}</span>${escapeHtml(o.name)}`;
      button.addEventListener('click', event => {
        if (modal) return;
        if (mode === 'edit' && o !== editObj) { say(`Tab out of Edit Mode before selecting ${o.name}.`); return; }
        if (event.shiftKey) { selected.has(o.id) && active === o.id ? selected.delete(o.id) : selected.add(o.id); active = selected.has(o.id) ? o.id : active; }
        else { selected = new Set([o.id]); active = o.id; }
        say(`Selected ${o.name} in the Outliner. Move the pointer back over the viewport for shortcuts.`);
        changed({ type: 'select' });
      });
      li.append(button);
      return li;
    }));
  }
  function refreshChrome() {
    modeButton.textContent = mode === 'edit' ? 'Edit Mode' : 'Object Mode';
    modeButton.setAttribute('aria-pressed', String(mode === 'edit'));
    lab.classList.toggle('is-edit', mode === 'edit');
    const label = view.camera ? 'Camera Perspective' : view.axis ? `${VIEWS[view.axis].label} ${view.ortho ? 'Orthographic' : 'Perspective'}` : `User ${view.ortho ? 'Orthographic' : 'Perspective'}`;
    viewLabelEl.innerHTML = `${label}<br><span>(1) Collection | ${escapeHtml(byId(active)?.name || '—')}</span>`;
    objects.forEach(o => {
      const isSel = selected.has(o.id);
      const color = active === o.id ? COLOR_ACTIVE : COLOR_SELECTED;
      if (o.outline) { o.outline.visible = isSel && mode === 'object'; o.outline.material.color.setHex(color); }
      if (o.art) o.art.traverse(child => { if (child.material) child.material.color.setHex(isSel ? color : 0x000000); });
    });
    if (editObj) refreshEditArt();
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function say(msg) { statusEl.textContent = msg; }

  // ── drill ─────────────────────────────────────────────────────────────────
  const atBuild = c => c && nearV(c.node.position, 0, 0, 1) && nearV(eulerDeg(c), 0, 0, 0);
  const missions = [
    { title: 'Open the Sidebar', html: 'Click inside the viewport, then press <kbd>N</kbd>. The Item tab holds the exact numbers you will check all lesson.', check: () => sidebarOpen },
    { title: 'Orbit around the Cube', html: 'Drag with the <b>middle mouse button</b> until you can see three faces. No middle button? <kbd>Alt</kbd>+left-drag, drag the axis gizmo, or drag one finger on a touch screen.', check: () => navStats.orbit > 0.8 },
    { title: 'Pan and zoom', html: '<kbd>Shift</kbd>+middle-drag (or drag the ✋ button) to slide the view, then scroll the wheel (or drag 🔍) to zoom.', check: () => navStats.pan > 60 && navStats.zoom >= 3 },
    { title: 'Front view, then Top view', html: 'Press <kbd>Numpad 1</kbd> for Front, then <kbd>Numpad 7</kbd> for Top. No numpad? Click the gizmo’s <b>-Y</b> then <b>Z</b> bubble, or tick Emulate Numpad.', check: (e, st) => { if (e.type === 'view' && e.name === 'front') st.front = true; return e.type === 'view' && e.name === 'top' && st.front; } },
    { title: 'Frame Selected', html: 'Click <b>Cube</b> in the Outliner, then press <kbd>Numpad .</kbd> (or the Frame button). This is your rescue when you get lost in space.', check: e => e.type === 'frame' && selected.has('cube') },
    { title: 'Move exactly 2 along X', html: 'With Cube selected and the pointer over the viewport, type <kbd>G</kbd> <kbd>X</kbd> <kbd>2</kbd> <kbd>Enter</kbd>. The Sidebar should read Location X = 2 m.', check: e => e.type === 'transform' && nearV(cubeObj()?.node.position || new V3(9), 2, 0, 0) },
    { title: 'Undo it', html: 'Press <kbd>Ctrl</kbd>+<kbd>Z</kbd>. Location goes back to 0, 0, 0.', check: e => e.type === 'undo' && pristine(cubeObj()) },
    { title: 'Rotate 45° around Z, then undo', html: 'Type <kbd>R</kbd> <kbd>Z</kbd> <kbd>4</kbd> <kbd>5</kbd> <kbd>Enter</kbd>, check Rotation Z = 45°, then <kbd>Ctrl</kbd>+<kbd>Z</kbd>.', check: (e, st) => { const c = cubeObj(); if (e.type === 'transform' && c && near(eulerDeg(c).z, 45)) st.done = true; return e.type === 'undo' && st.done && pristine(c); } },
    { title: 'Scale by 2, then undo', html: 'Type <kbd>S</kbd> <kbd>2</kbd> <kbd>Enter</kbd>. Dimensions become 4, 4, 4: scaling multiplies. Then undo.', check: (e, st) => { const c = cubeObj(); if (e.type === 'transform' && c && nearV(dims(c), 4, 4, 4)) st.done = true; return e.type === 'undo' && st.done && pristine(c); } },
    { title: 'Start a move, then cancel', html: 'Type <kbd>G</kbd> <kbd>Z</kbd>, move the mouse so the Cube rides up and down, then press <kbd>Esc</kbd> (or right-click). Nothing should change.', check: e => e.type === 'cancel' && e.op === 'G' && e.axis === 'z' && pristine(cubeObj()) },
    { title: 'Build: widen and lift the block', html: 'Type <kbd>S</kbd> <kbd>X</kbd> <kbd>2</kbd> <kbd>Enter</kbd>, then <kbd>G</kbd> <kbd>Z</kbd> <kbd>1</kbd> <kbd>Enter</kbd>. Target: Location 0, 0, 1 and Dimensions 4, 2, 2.', check: e => { const c = cubeObj(); return e.type === 'transform' && atBuild(c) && nearV(dims(c), 4, 2, 2); } },
    { title: 'Name it', html: 'Press <kbd>F2</kbd>, type <code>Display_Block</code>, and press <kbd>Enter</kbd>.', check: () => cubeObj()?.name === 'Display_Block' },
    { title: 'Lift only the top face', html: '<kbd>Tab</kbd> into Edit Mode. Every face starts selected, so press <kbd>Alt</kbd>+<kbd>A</kbd>, click just the top face, type <kbd>G</kbd> <kbd>Z</kbd> <kbd>1</kbd> <kbd>Enter</kbd>, then <kbd>Tab</kbd> back. Target: Dimensions 4, 2, 3 with Location still 0, 0, 1.', check: e => { const c = cubeObj(); return e.type === 'mode' && mode === 'object' && atBuild(c) && nearV(dims(c), 4, 2, 3); } },
    { title: 'Add the floor', html: 'In Object Mode: <kbd>Shift</kbd>+<kbd>S</kbd> → Cursor to World Origin, <kbd>Shift</kbd>+<kbd>A</kbd> → Plane, type <kbd>S</kbd> <kbd>3</kbd> <kbd>Enter</kbd>, then <kbd>F2</kbd> and name it <code>Display_Floor</code>. Target: Dimensions 6, 6, 0 at 0, 0, 0.', check: () => objects.some(o => o.prim === 'plane' && o.name === 'Display_Floor' && nearV(o.node.position, 0, 0, 0) && nearV(dims(o), 6, 6, 0)) }
  ];
  const drill = { i: 0, state: {} };
  const drillEl = $('[data-blp-drill]');
  function runDrill(e) {
    let guard = 0;
    while (drill.i < missions.length && guard++ < missions.length && missions[drill.i].check(e, drill.state)) {
      drill.i += 1;
      drill.state = {};
      e = { type: 'state' };
      if (drill.i < missions.length) say(`✓ Step done. Next: ${missions[drill.i].title}.`);
      else say('✓ Drill complete! Now build the same display block in real Blender and check the same numbers.');
    }
    renderDrill();
  }
  function renderDrill() {
    const done = drill.i >= missions.length;
    const m = missions[Math.min(drill.i, missions.length - 1)];
    drillEl.querySelector('[data-blp-drill-count]').textContent = done ? `All ${missions.length} steps done` : `Step ${drill.i + 1} of ${missions.length}`;
    drillEl.querySelector('[data-blp-drill-bar]').style.width = `${(drill.i / missions.length) * 100}%`;
    drillEl.querySelector('[data-blp-drill-title]').textContent = done ? 'Drill complete' : m.title;
    drillEl.querySelector('[data-blp-drill-body]').innerHTML = done ? 'You rehearsed the navigation lap, the transform rehearsal, and the build. Now do it for real in Blender, then check the numbers in its Sidebar.' : m.html;
    drillEl.querySelector('[data-blp-skip]').hidden = done;
    drillEl.querySelector('[data-blp-drill-list]').replaceChildren(...missions.map((mi, i) => {
      const li = document.createElement('li');
      li.textContent = mi.title;
      if (i < drill.i) li.className = 'is-done';
      else if (i === drill.i) { li.className = 'is-current'; li.setAttribute('aria-current', 'step'); }
      return li;
    }));
  }
  drillEl.querySelector('[data-blp-skip]').addEventListener('click', () => { drill.i += 1; drill.state = {}; runDrill({ type: 'state' }); });
  drillEl.querySelector('[data-blp-restart]').addEventListener('click', () => { drill.i = 0; drill.state = {}; navStats.orbit = navStats.pan = navStats.zoom = 0; renderDrill(); say('Drill restarted from step 1. Reset scene too if the Cube has moved.'); });

  // ── change pump + render loop ─────────────────────────────────────────────
  let outlinerQueued = false;
  function changed(e, structural = true) {
    dirty = true;
    refreshChrome();
    refreshSidebar();
    if (structural && !outlinerQueued) { outlinerQueued = true; queueMicrotask(() => { outlinerQueued = false; refreshOutliner(); }); }
    runDrill(e);
  }
  function render() {
    if (syncSize()) dirty = true;
    if (!dirty) return;
    dirty = false;
    updateCameras();
    const cam = activeCam();
    cursorArt.position.copy(b2t(cursor3d));
    cursorArt.quaternion.copy(cam.quaternion);
    cursorArt.scale.setScalar(worldPerPixel(cursor3d) * 9);
    objects.forEach(o => {
      const bill = o.art?.userData.billboard;
      if (bill) { o.node.updateMatrixWorld(true); bill.quaternion.copy(o.node.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(cam.quaternion)); }
    });
    renderer.render(scene, cam);
    drawGizmo();
  }
  function frame() { render(); requestAnimationFrame(frame); }
  new ResizeObserver(() => { dirty = true; }).observe(canvas);
  window.addEventListener('theme:changed', () => { dirty = true; });

  defaultScene();
  refreshOutliner();
  changed({ type: 'state' }, false);
  say('Click the viewport to give it the keyboard, then follow the drill. Esc with no tool running hands the keyboard back to the page.');
  requestAnimationFrame(frame);

  // exposed for automated checks (scripts drive the page with Playwright)
  lab.blPractice = { get state() { return snapshot(); }, get drillStep() { return drill.i; }, dims: id => dims(byId(id))?.toArray(), view, navStats };

  function hasWebGL() {
    try { const probe = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (probe.getContext('webgl2') || probe.getContext('webgl'))); }
    catch { return false; }
  }
}
