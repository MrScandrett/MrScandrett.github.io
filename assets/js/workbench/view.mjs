/* view.mjs — Workbench's 3D viewport: the workplane, one Three.js object per
 * project node (so the gizmo can stay attached while the scene rebuilds),
 * picking, the transform gizmo, camera views, print preview and thumbnails.
 *
 * Z is up everywhere, matching the print bed and the project's numbers. Every
 * node is   object (pos/rot/scale) → offset (−pivot) → children or mesh.
 */

import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { TransformControls, BufferGeometryUtils } from '../../vendor/three-extras.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { FINISHES, PRESETS, walk } from './model.mjs';

const STAGE = 0x1d2228;
const DEG = Math.PI / 180;
const CREASE = 30 * DEG;

export function geometryFromSoup(positions) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // smooth curved faces, keep sharp edges (a 64-sided cylinder reads round, a 7-sided tree stays faceted)
  const smooth = BufferGeometryUtils.toCreasedNormals(g, CREASE);
  g.dispose();
  return smooth;
}

export function materialFor(color, finish, envMap) {
  const f = FINISHES[finish] || FINISHES.matte;
  const m = new THREE.MeshStandardMaterial({ color, roughness: f.roughness, metalness: f.metalness, envMap, envMapIntensity: f.metalness ? 1 : 0.35 });
  if (f.emissive) { m.emissive = new THREE.Color(color); m.emissiveIntensity = f.emissive; }
  if (f.opacity) { m.transparent = true; m.opacity = f.opacity; m.depthWrite = false; }
  return m;
}

/* A soft studio gradient for reflections, so metal finishes read as metal. */
function studioEnvironment(renderer) {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const colors = [];
  const top = new THREE.Color('#f4f1ea'), mid = new THREE.Color('#8b97a3'), low = new THREE.Color('#2a3036');
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 10;
    const c = t > 0 ? mid.clone().lerp(top, t) : mid.clone().lerp(low, -t);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  geo.dispose();
  return env;
}

export function createView(canvas, { onPick, onGizmoChange, onGizmoEnd, onDropShape }) {
  const { scene, camera, renderer, syncSize } = createScene(canvas, { THREE, fov: 35, near: 0.01, far: 100000, clearColor: STAGE, maxDpr: 2 });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.dampingFactor = 0.1;
  controls.screenSpacePanning = true;

  const env = studioEnvironment(renderer);
  scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x30363d, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  scene.add(key, fill);

  const plane = new THREE.Group();
  scene.add(plane);
  const root = new THREE.Group();
  scene.add(root);
  const preview = new THREE.Group();
  preview.visible = false;
  scene.add(preview);
  const helpers = new THREE.Group();
  scene.add(helpers);

  const gizmo = new TransformControls(camera, canvas);
  gizmo.setSize(0.9);
  const gizmoHelper = gizmo.getHelper();
  scene.add(gizmoHelper);
  gizmo.addEventListener('dragging-changed', (e) => {
    controls.enabled = !e.value;
    if (!e.value) onGizmoEnd?.();
  });
  gizmo.addEventListener('objectChange', () => { if (gizmo.object) onGizmoChange?.(gizmo.object); });

  const objects = new Map();           // id → { object, offset, mesh, edges, soup, look }
  const ghostMaterial = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.6 });
  const ghostEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xc9d4de, transparent: true, opacity: 0.75 });
  const selectionBoxes = [];
  let workplane = null;
  let unitsPerView = 100;

  /* ── workplane ── */
  function setWorkplane(presetId) {
    const p = PRESETS[presetId] || PRESETS.print;
    for (const c of [...plane.children]) { c.geometry?.dispose(); c.material?.dispose(); plane.remove(c); }
    const [w, d] = p.plane;
    const size = Math.max(w, d);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0x2c333b, roughness: 0.95 }));
    floor.position.z = -size * 1e-4;
    floor.receiveShadow = false;
    plane.add(floor);
    const lines = Math.round(size / p.major);
    const grid = new THREE.GridHelper(size, lines, 0x5d6874, 0x3d4550);
    grid.rotation.x = Math.PI / 2;
    grid.scale.set(w / size, 1, d / size);
    plane.add(grid);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, d)), new THREE.LineBasicMaterial({ color: 0x8fb4d8 }));
    edge.position.z = size * 1e-4;
    plane.add(edge);
    const axis = (color, to) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, size * 2e-4), to]), new THREE.LineBasicMaterial({ color }));
    plane.add(axis(0xe0574b, new THREE.Vector3(size * 0.08, 0, size * 2e-4)), axis(0x5fbf6a, new THREE.Vector3(0, size * 0.08, size * 2e-4)));
    key.position.set(-size * 0.5, -size * 0.9, size * 1.2);
    fill.position.set(size * 0.8, size * 0.6, size * 0.5);
    camera.near = size / 4000;
    camera.far = size * 60;
    camera.updateProjectionMatrix();
    unitsPerView = size;
    workplane = { w, d, size, grid: p.grid };
  }

  /* ── scene sync ── */
  function entry(id) {
    let e = objects.get(id);
    if (!e) {
      const object = new THREE.Group();
      const offset = new THREE.Group();
      object.add(offset);
      object.userData.id = id;
      e = { object, offset, mesh: null, edges: null, soup: null, look: '' };
      objects.set(id, e);
    }
    return e;
  }

  function clearMesh(e) {
    if (e.mesh) { e.mesh.geometry.dispose(); if (e.mesh.material !== ghostMaterial) e.mesh.material.dispose(); e.offset.remove(e.mesh); e.mesh = null; }
    if (e.edges) { e.edges.geometry.dispose(); e.offset.remove(e.edges); e.edges = null; }
    e.soup = null;
    e.look = '';
  }

  /* project + evaluate() result → the Three.js tree. poses: id → {pos, rot, scale}. */
  function sync(project, result, poses) {
    const live = new Set();
    const pieces = new Map(result.pieces.map((p) => [p.id, p]));
    const ghosts = new Map(result.ghosts.map((g) => [g.id, g]));
    walk(project.objects, (node, parent) => {
      live.add(node.id);
      const e = entry(node.id);
      const parent3d = parent ? entry(parent.id).offset : root;
      if (e.object.parent !== parent3d) parent3d.add(e.object);
      applyPose(e, node, poses?.get(node.id));
      if (node.type === 'group') { clearMesh(e); return; }
      const piece = pieces.get(node.id), ghost = ghosts.get(node.id);
      const soup = piece?.local || ghost?.local || null;
      if (!soup) { clearMesh(e); return; }
      const look = ghost ? 'ghost' : `${node.color}|${node.finish}`;
      if (soup !== e.soup) {
        clearMesh(e);
        const geo = geometryFromSoup(soup);
        e.mesh = new THREE.Mesh(geo, ghost ? ghostMaterial : materialFor(node.color, node.finish, env));
        e.mesh.userData.id = node.id;
        e.offset.add(e.mesh);
        if (ghost) {
          e.edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), ghostEdgeMaterial);
          e.offset.add(e.edges);
        }
        e.soup = soup;
        e.look = look;
      } else if (look !== e.look) {
        if (e.mesh.material !== ghostMaterial) e.mesh.material.dispose();
        e.mesh.material = ghost ? ghostMaterial : materialFor(node.color, node.finish, env);
        e.look = look;
      }
      e.mesh.renderOrder = ghost ? 2 : 0;
      e.mesh.visible = !ghost || ghostsShown;
      if (e.edges) e.edges.visible = e.mesh.visible;
    });
    for (const [id, e] of objects) {
      if (live.has(id)) continue;
      if (gizmo.object === e.object) gizmo.detach();
      clearMesh(e);
      e.object.parent?.remove(e.object);
      objects.delete(id);
    }
  }

  function applyPose(e, node, pose) {
    const pos = pose?.pos || node.pos, rot = pose?.rot || node.rot, scale = pose?.scale || node.scale;
    if (gizmo.dragging && gizmo.object === e.object) return;   // the gizmo owns it mid-drag
    e.object.position.set(pos[0], pos[1], pos[2]);
    e.object.rotation.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG, 'XYZ');
    e.object.scale.set(scale[0], scale[1], scale[2]);
    e.offset.position.set(-node.pivot[0], -node.pivot[1], -node.pivot[2]);
  }

  function setPoses(project, poses) {
    walk(project.objects, (node) => { const e = objects.get(node.id); if (e) applyPose(e, node, poses?.get(node.id)); });
  }

  /* ── selection + gizmo ── */
  function select(ids, { gizmoId = null, mode = 'translate', snap = null } = {}) {
    for (const b of selectionBoxes.splice(0)) { helpers.remove(b); b.geometry.dispose(); b.material.dispose(); }
    for (const id of ids) {
      const e = objects.get(id);
      if (!e) continue;
      const box = new THREE.BoxHelper(e.object, 0x6fb6ff);
      box.userData.id = id;
      helpers.add(box);
      selectionBoxes.push(box);
    }
    const e = gizmoId && objects.get(gizmoId);
    if (e) {
      if (gizmo.object !== e.object) gizmo.attach(e.object);   // re-attaching mid-drag would drop the drag
      gizmo.setMode(mode);
      gizmo.setTranslationSnap(snap?.move || null);
      gizmo.setRotationSnap(snap?.turn ? snap.turn * DEG : null);
      gizmo.setScaleSnap(snap?.scale || null);
    } else gizmo.detach();
  }

  function setGizmo(mode, snap) {
    gizmo.setMode(mode);
    gizmo.setTranslationSnap(snap?.move || null);
    gizmo.setRotationSnap(snap?.turn ? snap.turn * DEG : null);
    gizmo.setScaleSnap(snap?.scale || null);
  }

  function setGizmoVisible(on) { gizmoHelper.visible = on && Boolean(gizmo.object); gizmo.enabled = on; }

  /* Hole ghosts help while building; while animating or exporting they only get in the way. */
  let ghostsShown = true;
  function showGhosts(on) {
    ghostsShown = on;
    for (const e of objects.values()) if (e.mesh?.material === ghostMaterial) { e.mesh.visible = on; if (e.edges) e.edges.visible = on; }
  }

  /* ── picking ── */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function toNdc(event) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  function pick(event) {
    toNdc(event);
    const meshes = [];
    for (const e of objects.values()) if (e.mesh && e.mesh.visible) meshes.push(e.mesh);
    const hit = ray.intersectObjects(meshes, false);
    // a solid in front of a hole wins; otherwise the nearest surface
    const solid = hit.find((h) => h.object.material !== ghostMaterial);
    return (solid || hit[0])?.object.userData.id || null;
  }
  function floorPoint(event) {
    toNdc(event);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), p) ? [p.x, p.y] : null;
  }

  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, button: e.button }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || down.button !== 0) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 5 || gizmo.dragging || gizmo.axis) return;
    onPick?.(pick(e), { shift: e.shiftKey || e.metaKey || e.ctrlKey });
  });
  canvas.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('text/x-workbench-shape')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  canvas.addEventListener('drop', (e) => {
    const id = e.dataTransfer?.getData('text/x-workbench-shape');
    if (!id) return;
    e.preventDefault();
    onDropShape?.(id, floorPoint(e));
  });

  /* ── camera ── */
  function frame(box, direction) {
    const b = box || { min: [-workplane.w / 4, -workplane.d / 4, 0], max: [workplane.w / 4, workplane.d / 4, workplane.size / 8] };
    const centre = new THREE.Vector3(...b.min.map((v, k) => (v + b.max[k]) / 2));
    const radius = Math.max(new THREE.Vector3(...b.max).distanceTo(new THREE.Vector3(...b.min)) / 2, workplane.size * 0.02);
    const vFov = camera.fov * DEG, hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.08;
    const dir = direction ? new THREE.Vector3(...direction).normalize() : camera.position.clone().sub(controls.target).normalize();
    if (!direction && dir.lengthSq() < 0.5) dir.set(-0.55, -0.95, 0.62).normalize();
    controls.target.copy(centre);
    camera.position.copy(centre).addScaledVector(dir, dist);
    controls.update();
  }
  const VIEWS = { home: [-0.55, -0.95, 0.62], front: [0, -1, 0.0001], side: [1, 0, 0.0001], top: [0, -0.0001, 1], back: [0, 1, 0.0001] };
  const viewFrom = (name, box) => frame(box, VIEWS[name] || VIEWS.home);
  const target = () => [controls.target.x, controls.target.y];

  /* ── print preview: bodies straight from the print check ── */
  function showPrint(bodies, show) {
    for (const c of [...preview.children]) { c.geometry.dispose(); c.material.dispose(); preview.remove(c); }
    preview.visible = show;
    root.visible = !show;
    helpers.visible = !show;
    gizmoHelper.visible = !show && Boolean(gizmo.object);
    if (!show) return;
    const overhang = new THREE.Color('#e0362c'), bridge = new THREE.Color('#f0a530');
    for (const body of bodies) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(body.positions, 3));
      const colors = new Float32Array(body.positions.length);
      const base = new THREE.Color(body.color || '#e8792a');
      const mask = body.overhang?.mask || [];
      for (let t = 0; t < body.positions.length / 9; t++) {
        const c = mask[t] === 1 ? overhang : mask[t] === 2 ? bridge : base;
        for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], t * 9 + k * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      g.computeVertexNormals();
      preview.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, flatShading: true })));
    }
  }
  // The print check works in bed millimetres; show it at the project's scale on the workplane.
  function setPreviewScale(k) { preview.scale.setScalar(k); }

  /* ── render loop ── */
  let onFrame = null;
  let last = performance.now();
  window.SimKit.loop(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    onFrame?.(dt);
    controls.update();
    syncSize();
    for (const b of selectionBoxes) b.update();
    renderer.render(scene, camera);
  });

  function snapshot() {
    const was = [gizmoHelper.visible, helpers.visible];
    gizmoHelper.visible = false;
    helpers.visible = false;
    renderer.render(scene, camera);
    const url = canvas.toDataURL('image/png');
    [gizmoHelper.visible, helpers.visible] = was;
    return url;
  }

  return {
    THREE, scene, camera, renderer, controls, gizmo, objects, env,
    setWorkplane, sync, setPoses, select, setGizmo, setGizmoVisible, showGhosts, frame, viewFrom, target,
    showPrint, setPreviewScale, snapshot,
    set onFrame(fn) { onFrame = fn; },
    get unitsPerView() { return unitsPerView; },
    object3d: (id) => objects.get(id)?.object || null,
  };
}

/* Small rendered pictures of each shape for the library. One extra WebGL
   context, rendered one shape at a time when the browser is idle. */
export function createThumbnailer(size = 96) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return null; }
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 10000);
  camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404850, 1.5));
  const light = new THREE.DirectionalLight(0xffffff, 2.2);
  scene.add(light);
  const material = new THREE.MeshStandardMaterial({ color: 0xe8792a, roughness: 0.55 });
  return {
    render(soup) {
      const geo = geometryFromSoup(soup);
      const mesh = new THREE.Mesh(geo, material);
      scene.add(mesh);
      geo.computeBoundingSphere();
      const { center, radius } = geo.boundingSphere;
      const dir = new THREE.Vector3(-0.6, -1, 0.7).normalize();
      camera.position.copy(center).addScaledVector(dir, radius / Math.sin(15 * DEG) * 1.02);
      camera.lookAt(center);
      light.position.copy(camera.position).add(new THREE.Vector3(-radius, 0, radius * 2));
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      scene.remove(mesh);
      geo.dispose();
      return url;
    },
  };
}
