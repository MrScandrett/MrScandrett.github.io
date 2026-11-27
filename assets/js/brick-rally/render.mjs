// Brick Rally renderer: the garage turntable/editor and the race scene, on one canvas,
// with the site's single pinned Three.js build.

import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { W, L, H, CELL, LAYER, WHEEL_R, PALETTE, buildCarMesh, wheelLayout, hexToRgb } from './car-model.mjs';
import { buildTrack, locate, pointAt } from './track.mjs';

const BODY_LIFT = WHEEL_R * 0.55;

const THEMES = {
  baseplate: { sky: 0x9ed4ff, fog: 0xbfe3ff, ground: '#3f9c4a', stud: '#4fb25a', apron: 0x5fb36a, props: ['tree', 'pile'] },
  desert: { sky: 0xf6d7a4, fog: 0xf3dcb4, ground: '#d9b46c', stud: '#e5c47e', apron: 0xc9a35d, props: ['cactus', 'pile'] },
  volcano: { sky: 0x3b2a3f, fog: 0x4a3040, ground: '#4b4346', stud: '#5a5154', apron: 0x5d5155, props: ['rock', 'lava'] },
};

function studTexture(base, stud) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(0,0,0,.18)';
  g.beginPath(); g.arc(34, 34, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = stud;
  g.beginPath(); g.arc(32, 32, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.beginPath(); g.arc(29, 29, 6, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#5b5f63'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},.06)`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  g.fillStyle = '#f4f4f4'; g.fillRect(62, 0, 4, 64);   // centre dash
  g.fillStyle = '#e8e8e8'; g.fillRect(2, 0, 3, 128); g.fillRect(123, 0, 3, 128); // edge lines
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fafafa'; g.fillRect(x * 16, y * 16, 16, 16); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function labelSprite(text, color = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = '700 30px system-ui, sans-serif';
  const w = Math.min(244, g.measureText(text).width + 28);
  g.fillStyle = 'rgba(10,14,22,.72)';
  g.beginPath(); g.roundRect((256 - w) / 2, 8, w, 46, 23); g.fill();
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 32, 230);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true }));
  s.scale.set(4, 1, 1);
  return s;
}

function bodyGeometry(cells, opts) {
  const m = buildCarMesh(cells, opts);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
  // vertex colours are authored in sRGB; convert so they match the palette swatches
  const lin = new Float32Array(m.colors.length);
  const tmp = new THREE.Color();
  for (let i = 0; i < lin.length; i += 3) { tmp.setRGB(m.colors[i], m.colors[i + 1], m.colors[i + 2], THREE.SRGBColorSpace); lin[i] = tmp.r; lin[i + 1] = tmp.g; lin[i + 2] = tmp.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(lin, 3));
  geo.computeBoundingSphere();
  return geo;
}

function scanBodyGeometry(mesh, targetSize) {
  const b = mesh.bounds || { min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5], size: [1, 1, 1] };
  const sx = Math.max(b.size[0], 1e-4);
  const sy = Math.max(b.size[1], 1e-4);
  const sz = Math.max(b.size[2], 1e-4);
  const fitW = Math.max(targetSize.w, 1.4);
  const fitH = Math.max(targetSize.h, 0.9);
  const fitL = Math.max(targetSize.l, 2.2);
  const s = Math.min(fitW / sx, fitH / sy, fitL / sz);
  const cx = (b.min[0] + b.max[0]) / 2;
  const cy = b.min[1];
  const cz = (b.min[2] + b.max[2]) / 2;

  const pos = new Float32Array(mesh.positions.length);
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] = (mesh.positions[i] - cx) * s;
    pos[i + 1] = (mesh.positions[i + 1] - cy) * s;
    pos[i + 2] = (mesh.positions[i + 2] - cz) * s;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(mesh.normals), 3));
  if (mesh.colors) {
    const lin = new Float32Array(mesh.colors.length);
    const tmp = new THREE.Color();
    for (let i = 0; i < lin.length; i += 3) {
      tmp.setRGB(mesh.colors[i], mesh.colors[i + 1], mesh.colors[i + 2], THREE.SRGBColorSpace);
      lin[i] = tmp.r; lin[i + 1] = tmp.g; lin[i + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(lin, 3));
  }
  if (mesh.indices) geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  geo.computeBoundingSphere();
  return { geo, height: sy * s };
}

const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.34, 18).rotateZ(Math.PI / 2);
const hubGeo = new THREE.CylinderGeometry(WHEEL_R * 0.5, WHEEL_R * 0.5, 0.36, 12).rotateZ(Math.PI / 2);
const treadGeo = new THREE.BoxGeometry(0.36, 0.08, 0.16);
const tyreMat = new THREE.MeshLambertMaterial({ color: 0x1b1d20 });
const hubMat = new THREE.MeshLambertMaterial({ color: 0xc9ccd1 });
const bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

/** A drivable car object: body + four wheels + soft shadow. */
export function makeCarObject(cells, { fixedOrigin = false, label = null, customMesh = null } = {}) {
  const root = new THREE.Group();
  const m = buildCarMesh(cells, { studs: false });
  const useFixed = fixedOrigin && !customMesh;
  let bodyGeo, bodyHeight = m.size.h;
  if (customMesh) {
    const built = scanBodyGeometry(customMesh, m.size);
    bodyGeo = built.geo;
    bodyHeight = built.height;
  } else {
    bodyGeo = bodyGeometry(cells, { fixedOrigin: useFixed });
  }
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = BODY_LIFT;
  root.add(body);
  const wheels = [];
  for (const w of wheelLayout(cells, { fixedOrigin: useFixed })) {
    const steer = new THREE.Group();
    steer.position.set(w.x, WHEEL_R, w.z);
    const spin = new THREE.Group();
    spin.add(new THREE.Mesh(wheelGeo, tyreMat), new THREE.Mesh(hubGeo, hubMat));
    for (let k = 0; k < 6; k++) { const t = new THREE.Mesh(treadGeo, tyreMat); t.position.set(0, Math.cos(k * Math.PI / 3) * WHEEL_R, Math.sin(k * Math.PI / 3) * WHEEL_R); t.rotation.x = -k * Math.PI / 3; spin.add(t); }
    steer.add(spin);
    root.add(steer);
    wheels.push({ steer, spin, front: w.front });
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(m.size.w + 1.2, m.size.l + 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.position.y = 0.03;
  root.add(shadow);
  if (label) { label.position.y = BODY_LIFT + bodyHeight + 1.3; root.add(label); }
  return {
    root, body, wheels,
    pose(state) {
      root.position.set(state.x, 0, state.z);
      root.rotation.y = state.h;
      for (const w of wheels) {
        if (w.front) w.steer.rotation.y = -(state.steer || 0) * 0.45;
        w.spin.rotation.x = state.wheelSpin || 0;
      }
      body.rotation.z = (state.steer || 0) * Math.min(1, Math.hypot(state.vx || 0, state.vz || 0) / 40) * 0.05;
    },
    dispose() {
      body.geometry.dispose(); shadow.geometry.dispose();
      if (label) { label.material.map.dispose(); label.material.dispose(); }
    },
  };
}

// ---------------------------------------------------------------------------------------

export class Scene3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 900);
    this.mode = null;
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (this._w === w && this._h === h) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _lights(scene, sky = 0xddeeff, ground = 0x445533) {
    scene.add(new THREE.HemisphereLight(sky, ground, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(30, 60, 20);
    scene.add(sun);
  }

  // ---------------- garage ----------------

  showGarage() {
    this.disposeScene();
    this.mode = 'garage';
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1d2633);
    this._lights(scene, 0xffffff, 0x334455);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.25, 48), new THREE.MeshLambertMaterial({ color: 0x8a9099 }));
    plate.position.y = -0.13;
    scene.add(plate);
    const tex = studTexture('#5b616b', '#6c727c');
    tex.repeat.set(16, 16);
    const top = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tex }));
    top.position.y = 0.005;
    scene.add(top);
    // build volume outline (only shown while building)
    const box = new THREE.Box3(new THREE.Vector3(-W / 2 * CELL, BODY_LIFT, -L / 2 * CELL), new THREE.Vector3(W / 2 * CELL, BODY_LIFT + H * LAYER, L / 2 * CELL));
    this.volume = new THREE.Box3Helper(box, 0x6fb7ff);
    this.volume.visible = false;
    scene.add(this.volume);
    const floorGrid = new THREE.GridHelper(1, 1);
    floorGrid.visible = false;
    this.ghost = new THREE.Mesh(new THREE.BoxGeometry(CELL, LAYER, CELL), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }));
    this.ghost.visible = false;
    scene.add(this.ghost);
    this.turntable = new THREE.Group();
    scene.add(this.turntable);
    this.camera.fov = 45; this.camera.near = 0.05; this.camera.updateProjectionMatrix();
    this.camera.position.set(4.6, 3.2, 5.4);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 0.9, 0);
    this.controls.enableDamping = true;
    this.controls.minDistance = 3; this.controls.maxDistance = 14;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.autoRotate = true; this.controls.autoRotateSpeed = 1.2;
    this.controls.enablePan = false;
  }

  setGarageCar(cells, customMesh = null) {
    if (this.garageCar) { this.turntable.remove(this.garageCar.root); this.garageCar.dispose(); }
    this.garageCar = makeCarObject(cells, { fixedOrigin: true, customMesh });
    this.garageCar.pose({ x: 0, z: 0, h: 0 });
    this.turntable.add(this.garageCar.root);
    this.pickMesh?.geometry.dispose();
    this.pickMesh = new THREE.Mesh(bodyGeometry(cells, { studs: false, fixedOrigin: true }), new THREE.MeshBasicMaterial({ visible: false }));
    this.pickMesh.position.y = BODY_LIFT;
    this.cells = cells;
  }

  setBuilding(on) {
    this.building = on;
    if (!this.controls) return;
    this.controls.autoRotate = !on;
    this.volume.visible = on;
    if (!on) this.ghost.visible = false;
  }

  /**
   * What a click at (clientX, clientY) touches in the editor: the brick hit (`hit`) and the
   * empty cell next to the face hit (`add`), both as {x, y, z} grid cells or null.
   */
  pick(clientX, clientY) {
    if (this.mode !== 'garage' || !this.pickMesh) return null;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    this.pickMesh.updateMatrixWorld();
    const toCell = (p) => ({ x: Math.floor(p.x / CELL + W / 2), y: Math.floor((p.y - BODY_LIFT) / LAYER), z: Math.floor(p.z / CELL + L / 2) });
    const inside = (c) => c.x >= 0 && c.y >= 0 && c.z >= 0 && c.x < W && c.y < H && c.z < L;
    const hits = ray.intersectObject(this.pickMesh);
    if (hits.length) {
      const h = hits[0], n = h.face.normal;
      const hit = toCell(h.point.clone().addScaledVector(n, -0.01));
      const add = toCell(h.point.clone().addScaledVector(n, 0.01));
      return { hit: inside(hit) ? hit : null, add: inside(add) ? add : null };
    }
    // empty spot on the floor of the build volume
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BODY_LIFT);
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(plane, p)) {
      const c = toCell(p.setY(BODY_LIFT + 0.01));
      if (inside(c)) return { hit: null, add: c };
    }
    return null;
  }

  showGhost(cell, color) {
    if (!this.ghost) return;
    if (!cell) { this.ghost.visible = false; return; }
    this.ghost.visible = true;
    this.ghost.material.color.set(color || '#ffffff');
    this.ghost.position.set((cell.x + 0.5 - W / 2) * CELL, BODY_LIFT + (cell.y + 0.5) * LAYER, (cell.z + 0.5 - L / 2) * CELL);
  }

  // ---------------- race ----------------

  loadTrack(def) {
    this.disposeScene();
    this.mode = 'race';
    const T = this.track = buildTrack(def);
    const th = THEMES[def.theme] || THEMES.baseplate;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(th.sky);
    scene.fog = new THREE.Fog(th.fog, 120, 420);
    this._lights(scene, 0xffffff, th.apron);
    this.camera.fov = 65; this.camera.near = 0.1; this.camera.updateProjectionMatrix();

    // ground: one huge baseplate
    const gt = studTexture(th.ground, th.stud);
    gt.repeat.set(220, 220);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(440, 440).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: gt }));
    scene.add(ground);

    // road + apron ribbons
    const ribbon = (half, y, uv) => {
      const pos = [], uvs = [], idx = [];
      for (let i = 0; i <= T.N; i++) {
        const k = i % T.N, rx = T.tz[k], rz = -T.tx[k];
        pos.push(T.xs[k] - rx * half, y, T.zs[k] - rz * half, T.xs[k] + rx * half, y, T.zs[k] + rz * half);
        const v = (i === T.N ? T.length : T.s[k]) / 8;
        uvs.push(0, v, 1, v);
        if (i < T.N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    scene.add(new THREE.Mesh(ribbon(T.wall, 0.02, false), new THREE.MeshLambertMaterial({ color: th.apron, side: THREE.DoubleSide })));
    scene.add(new THREE.Mesh(ribbon(T.half, 0.05, true), new THREE.MeshLambertMaterial({ map: roadTexture(), side: THREE.DoubleSide })));

    // start line + gantry
    const p0 = pointAt(T, 0), heading = Math.atan2(p0.tx, p0.tz);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(T.def.width, 2).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: checkerTexture() }));
    line.position.set(p0.x, 0.07, p0.z); line.rotation.y = heading;
    scene.add(line);
    const gantry = new THREE.Group();
    const pillarGeo = new THREE.BoxGeometry(1, 7, 1);
    const red = new THREE.MeshLambertMaterial({ color: 0xc91a09 });
    for (const s of [-1, 1]) { const pl = new THREE.Mesh(pillarGeo, red); pl.position.set(s * (T.half + 1.2), 3.5, 0); gantry.add(pl); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(T.def.width + 3.4, 1.4, 1), new THREE.MeshLambertMaterial({ map: checkerTexture() }));
    beam.position.y = 7.4; gantry.add(beam);
    gantry.position.set(p0.x, 0, p0.z); gantry.rotation.y = heading;
    scene.add(gantry);

    // curbs and brick walls (instanced: one draw call each)
    const curbGeo = new THREE.BoxGeometry(0.9, 0.18, 1.9);
    const wallGeo = new THREE.BoxGeometry(0.8, 0.96, 1.9);
    const curbN = Math.floor(T.length / 2) * 2, wallN = Math.floor(T.length / 2) * 2 * 2;
    const curbs = new THREE.InstancedMesh(curbGeo, new THREE.MeshLambertMaterial(), curbN);
    const walls = new THREE.InstancedMesh(wallGeo, new THREE.MeshLambertMaterial(), wallN);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const col = new THREE.Color();
    const wallColors = [1, 2, 3, 6, 7, 9].map(i => PALETTE[i].hex);
    let ci = 0, wi = 0, seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < Math.floor(T.length / 2); k++) {
      const p = pointAt(T, k * 2 + 1);
      q.setFromAxisAngle(up, Math.atan2(p.tx, p.tz));
      for (const side of [-1, 1]) {
        v.set(p.x + p.tz * side * (T.half + 0.45), 0.09, p.z - p.tx * side * (T.half + 0.45));
        curbs.setMatrixAt(ci, m4.compose(v, q, one));
        curbs.setColorAt(ci++, col.set(k % 2 ? '#f4f4f4' : '#c91a09'));
        for (let row = 0; row < 2; row++) {
          const pp = pointAt(T, k * 2 + 1 + row);
          v.set(pp.x + pp.tz * side * (T.wall + 0.4), 0.48 + row * 0.96, pp.z - pp.tx * side * (T.wall + 0.4));
          q.setFromAxisAngle(up, Math.atan2(pp.tx, pp.tz));
          walls.setMatrixAt(wi, m4.compose(v, q, one));
          walls.setColorAt(wi++, col.set(wallColors[Math.floor(rnd() * wallColors.length)]));
        }
      }
    }
    curbs.count = ci; walls.count = wi;
    scene.add(curbs, walls);

    // scenery outside the walls
    const props = new THREE.Group();
    const tryPlace = (x, z, clear) => Math.abs(locate(T, x, z).lateral) > T.wall + clear;
    const box = (w, h, d, color, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color })); m.position.set(x, y, z); props.add(m); };
    let placed = 0;
    for (let tries = 0; tries < 900 && placed < 90; tries++) {
      const x = (rnd() - 0.5) * 380, z = (rnd() - 0.5) * 380;
      if (!tryPlace(x, z, 6)) continue;
      placed++;
      const kind = th.props[Math.floor(rnd() * th.props.length)];
      if (kind === 'tree') { box(0.8, 2.4, 0.8, 0x6b4226, x, 1.2, z); box(3.2, 1.2, 3.2, 0x237841, x, 3, z); box(2.2, 1.2, 2.2, 0x2f8f4e, x, 4.2, z); box(1.2, 1.2, 1.2, 0x3aa35c, x, 5.4, z); }
      else if (kind === 'cactus') { box(1, 4, 1, 0x3c7d3a, x, 2, z); box(2.4, 0.8, 0.8, 0x3c7d3a, x, 2.2, z); box(0.8, 1.6, 0.8, 0x3c7d3a, x - 1, 3, z); }
      else if (kind === 'rock') { box(3, 1.6, 2.4, 0x3a3436, x, 0.8, z); box(1.6, 1, 1.4, 0x2d2829, x + 0.6, 2, z); }
      else if (kind === 'lava') { box(3, 0.2, 3, 0xff5a1f, x, 0.1, z); box(1.2, 0.3, 1.2, 0xffc13b, x, 0.2, z); }
      else { for (let b = 0; b < 4; b++) box(2, 0.96, 1, new THREE.Color(wallColors[Math.floor(rnd() * wallColors.length)]), x + (b % 2) * 1.1, 0.48 + Math.floor(b / 2) * 0.96, z + (b % 2) * 0.4); }
    }
    if (def.theme === 'volcano') {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(6, 26, 30, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0x3a2f31 }));
      cone.position.set(0, 15, 0);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(6, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff6a1a }));
      glow.position.set(0, 29.5, 0);
      if (tryPlace(0, 0, 18)) props.add(cone, glow);
    }
    scene.add(props);
    this.cars = new Map();
    this.cam = null;
  }

  addCar(id, cells, name, color, customMesh = null) {
    this.removeCar(id);
    const obj = makeCarObject(cells, { label: name ? labelSprite(name, color) : null, customMesh });
    this.scene.add(obj.root);
    this.cars.set(id, obj);
    return obj;
  }

  removeCar(id) {
    const o = this.cars?.get(id);
    if (!o) return;
    this.scene.remove(o.root); o.dispose();
    this.cars.delete(id);
  }

  poseCar(id, state) { this.cars?.get(id)?.pose(state); }

  /** Chase camera; `snap` jumps straight to position (race start, respawn). */
  follow(state, dt, snap = false) {
    const fx = Math.sin(state.h), fz = Math.cos(state.h);
    const speed = Math.hypot(state.vx || 0, state.vz || 0);
    const want = new THREE.Vector3(state.x - fx * 8.5, 4 + speed * 0.02, state.z - fz * 8.5);
    const look = new THREE.Vector3(state.x + fx * 5, 1.2, state.z + fz * 5);
    if (!this.cam || snap) this.cam = { pos: want.clone(), look: look.clone() };
    const k = 1 - Math.exp(-dt * 7);
    this.cam.pos.lerp(want, k); this.cam.look.lerp(look, Math.min(1, k * 1.6));
    this.camera.position.copy(this.cam.pos);
    this.camera.lookAt(this.cam.look);
    const fov = 63 + Math.min(12, speed * 0.25);
    if (Math.abs(this.camera.fov - fov) > 0.1) { this.camera.fov += (fov - this.camera.fov) * k; this.camera.updateProjectionMatrix(); }
  }

  /** Slow fly-around for the countdown or results. */
  orbit(t) {
    const T = this.track; if (!T) return;
    const p = pointAt(T, 0);
    this.camera.position.set(p.x + Math.cos(t * 0.3) * 30, 14, p.z + Math.sin(t * 0.3) * 30);
    this.camera.lookAt(p.x, 0, p.z);
  }

  render() {
    this.resize();
    if (this.controls) this.controls.update();
    if (this.scene) this.renderer.render(this.scene, this.camera);
  }

  disposeScene() {
    this.controls?.dispose(); this.controls = null;
    if (this.garageCar) { this.garageCar.dispose(); this.garageCar = null; }
    this.cars?.forEach(o => o.dispose()); this.cars = null;
    this.scene?.traverse(o => {
      if (o.isMesh || o.isInstancedMesh) { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : [m]).forEach(mm => { mm?.map?.dispose?.(); mm?.dispose?.(); }); }
    });
    this.scene = null; this.track = null; this.volume = null; this.ghost = null; this.turntable = null; this.pickMesh = null;
  }
}

export { hexToRgb };
