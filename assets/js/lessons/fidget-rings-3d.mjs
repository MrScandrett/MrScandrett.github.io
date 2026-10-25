/* Locked-ring fidget: the real 3-D model for the Ring Stack Lab.

   Each ring is built from FidgetRings.triangles(p, i), the same triangles the
   STL download writes, so what you orbit is what you print. Rings ride the lift
   test one by one, and "Cut in half" slices the model through the centre with
   solid caps so the ridge sitting in the next ring's groove shows in 3-D.

   The cut runs through two of the star's inner corners (any diameter of a round
   fidget). Every ring is the same outline scaled, so that section is exactly
   ringOutline(p, i) with its radii times the outline's radius in that direction.

   Draws only when something changes. Loaded on demand by
   tinkercad-codeblocks-lab.js (Three.js is too big to load for every visitor). */
import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

export function mount(canvas, FR) {
  const { renderer, scene, camera, syncSize } = createScene(canvas, {
    THREE, alpha: true, fov: 32, near: 1, far: 4000, preserveDrawingBuffer: true
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.NeutralToneMapping;

  // Z is up, like the STL and the print bed.
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.62;  // a peek under the bed edge, not through it
  controls.addEventListener('change', draw);

  const sky = new THREE.HemisphereLight(0xf4f8ff, 0x3a4250, 1.5);
  sky.position.set(0, 0, 1);
  scene.add(sky);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.4;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xcfe3ff, 0.9);
  scene.add(rim);

  const bed = new THREE.Group();
  scene.add(bed);
  const rings = new THREE.Group();
  scene.add(rings);

  // Keeps the half where keep·x ≥ 0; set by setCutAngle().
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let cut = false, cutAngle = 0, cutScale = 1;
  let geoKey = '', fitKey = '', fitR = 0, fitTop = 0;
  const ringObjs = [];             // { group, mat, caps, shown, target }
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function draw() {
    syncSize();
    renderer.render(scene, camera);
  }

  function disposeGroup(g) {
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    g.clear();
  }

  function ringGeometry(p, i) {
    const tris = FR.triangles(p, i), pos = new Float32Array(tris.length * 9);
    let o = 0;
    for (const t of tris) for (const v of t) { pos[o++] = v[0]; pos[o++] = v[1]; pos[o++] = v[2]; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();      // flat: crisp slab steps and star facets
    if (p.shape === 'round') {
      // Round walls are a 48-gon standing in for a circle: shade them smooth.
      const n = g.attributes.normal.array;
      for (let k = 0; k < n.length; k += 3) {
        if (Math.abs(n[k + 2]) > 0.5) continue;
        const x = pos[k], y = pos[k + 1], l = Math.hypot(x, y) || 1, s = n[k] * x + n[k + 1] * y > 0 ? 1 : -1;
        n[k] = s * x / l; n[k + 1] = s * y / l; n[k + 2] = 0;
      }
    }
    return g;
  }

  function capGeometry(p, i) {
    const shape = new THREE.Shape();
    FR.ringOutline(p, i).forEach((q, m) => {
      const x = q[0] * cutScale, y = q[1];
      if (m) shape.lineTo(x, y); else shape.moveTo(x, y);
    });
    return new THREE.ShapeGeometry(shape);
  }

  function ringColor(i, n) {
    // Same hue ramp as the cutaway (and the classic stack): ring 1 teal → outer ring orange.
    return new THREE.Color().setHSL((190 - (i - 1) * (150 / Math.max(1, n - 1))) / 360, 0.58, 0.5);
  }

  function setCutAngle(shape) {
    const u = FR.unitOutline(shape), c = shape === 'round' ? u[0] : u[1];
    cutAngle = Math.atan2(c[1], c[0]);
    cutScale = Math.hypot(c[0], c[1]);
    clip.normal.set(-Math.sin(cutAngle), Math.cos(cutAngle), 0);
  }

  function buildBed(R) {
    disposeGroup(bed);
    const size = Math.ceil(R * 3.2 / 10) * 10, half = size / 2;
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, 3),
      new THREE.MeshStandardMaterial({ color: 0x2c3139, roughness: 0.82, metalness: 0.05 })
    );
    plate.position.z = -1.5;
    plate.receiveShadow = true;
    bed.add(plate);
    // 10 mm grid, so the fidget's size reads at a glance.
    const pts = [];
    for (let v = -half; v <= half + 1e-6; v += 10) pts.push(v, -half, 0.02, v, half, 0.02, -half, v, 0.02, half, v, 0.02);
    const grid = new THREE.BufferGeometry();
    grid.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    bed.add(new THREE.LineSegments(grid, new THREE.LineBasicMaterial({ color: 0x4a5361, transparent: true, opacity: 0.8 })));
  }

  function buildRings(p) {
    disposeGroup(rings);
    ringObjs.length = 0;
    setCutAngle(p.shape);
    const basis = new THREE.Matrix4();
    const d = new THREE.Vector3(Math.cos(cutAngle), Math.sin(cutAngle), 0), up = new THREE.Vector3(0, 0, 1);
    basis.makeBasis(d, up, new THREE.Vector3().crossVectors(d, up));
    for (let i = 1; i <= p.n; i++) {
      const color = ringColor(i, p.n);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0, clipShadows: true });
      const mesh = new THREE.Mesh(ringGeometry(p, i), mat);
      mesh.castShadow = mesh.receiveShadow = true;
      const group = new THREE.Group();
      group.add(mesh);
      // Caps: the section on both sides of the centre, a shade lighter so the cut reads as a cut.
      const capMat = new THREE.MeshStandardMaterial({ color: color.clone().offsetHSL(0, -0.08, 0.12), roughness: 0.7, side: THREE.DoubleSide });
      const caps = new THREE.Group();
      const capGeo = capGeometry(p, i);
      [1, -1].forEach(sx => {
        const c = new THREE.Mesh(capGeo, capMat);
        c.scale.x = sx;
        c.castShadow = true;
        caps.add(c);
      });
      caps.matrixAutoUpdate = false;
      caps.matrix.copy(basis);
      caps.visible = cut;
      group.add(caps);
      rings.add(group);
      ringObjs.push({ group, mat, shown: 0, target: 0 });
    }
    applyCut();
  }

  function applyCut() {
    ringObjs.forEach(r => {
      r.mat.clippingPlanes = cut ? [clip] : null;
      r.mat.needsUpdate = true;
      r.group.children[1].visible = cut;
    });
  }

  // Aim at the model from the current direction, far enough that it fills the view.
  function fit(R, top, dir, zoom) {
    const target = new THREE.Vector3(0, 0, top * 0.3);
    const v = dir || camera.position.clone().sub(controls.target);
    if (!dir && v.lengthSq() < 1e-6) v.set(-0.55, -1, 0.75);
    const radius = Math.hypot(R, top * 0.75);
    const fov = THREE.MathUtils.degToRad(camera.fov), dist = radius / Math.tan(fov / 2) / Math.min(1, Math.max(0.55, camera.aspect)) * (zoom || 0.92);
    controls.target.copy(target);
    camera.position.copy(target).add(v.normalize().multiplyScalar(dist));
    camera.near = dist / 50; camera.far = dist * 6;
    camera.updateProjectionMatrix();
    controls.minDistance = dist * 0.35;
    controls.maxDistance = dist * 2.5;
    controls.update();

    key.position.set(-R * 1.4, -R * 2, R * 3.2 + top);
    key.target.position.set(0, 0, top * 0.3);
    const sc = key.shadow.camera;
    sc.left = sc.bottom = -R * 1.7; sc.right = sc.top = R * 1.7;
    sc.near = 1; sc.far = R * 8 + top * 4;
    sc.updateProjectionMatrix();
    rim.position.set(R * 2, R * 1.5, top + R);
  }

  function frameStep() {
    let moving = false;
    ringObjs.forEach(r => {
      const d = r.target - r.shown;
      r.shown = Math.abs(d) < 0.01 || reduced ? r.target : r.shown + d * 0.22;
      if (r.shown !== r.target) moving = true;
      r.group.position.z = r.shown;
    });
    draw();
    if (moving) schedule();
  }
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    const run = () => { pending = false; frameStep(); };
    if (window.SimKit && SimKit.frame) SimKit.frame(canvas, run); else requestAnimationFrame(run);
  }

  // Default three-quarter view; with the cut on, face the cut face from a little above it.
  function viewDir() {
    if (!cut) return new THREE.Vector3(-0.55, -1, 0.75);
    return clip.normal.clone().negate().add(new THREE.Vector3(Math.cos(cutAngle) * 0.12, Math.sin(cutAngle) * 0.12, 0.32));
  }

  const R0 = p => p.r + (p.n - 1) * (p.w + p.g) + p.k * FR.slabRun(p.shape);

  return {
    // lifts: how far each ring is raised by the lift test (mm), innermost first.
    update(p, lifts) {
      const k = [p.shape, p.n, p.r, p.w, p.g, p.k, p.flat, p.step].join('|');
      if (k !== geoKey) {
        geoKey = k;
        buildRings(p);
        const R = R0(p), top = FR.ringHeight(p, p.n);
        // Re-aim only when the shape changes or the size changes a lot, so a
        // student's chosen view survives small slider moves.
        if (p.shape !== fitKey || Math.abs(R - fitR) / fitR > 0.2 || Math.abs(top - fitTop) > fitTop * 0.5 + 2) {
          if (Math.abs(R - fitR) / (fitR || 1) > 0.2 || p.shape !== fitKey) buildBed(R);
          fit(R, top);
          fitKey = p.shape; fitR = R; fitTop = top;
        }
      }
      ringObjs.forEach((r, i) => { r.target = lifts[i] || 0; });
      schedule();
    },
    setCut(on) {
      cut = !!on;
      applyCut();
      if (cut) fit(fitR, fitTop, viewDir(), 0.62);
      draw();
    },
    resetView() { fit(fitR, fitTop, viewDir(), cut ? 0.62 : 0); draw(); },
    resize() { if (syncSize()) draw(); },
    draw
  };
}
