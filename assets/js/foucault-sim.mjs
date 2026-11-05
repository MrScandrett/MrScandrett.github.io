// 3D Foucault pendulum with a ring of dominoes. Used by lessons/physics/mechanics/pendulum.html.
//
// Physics: the pendulum is integrated (RK4) in the Earth-fixed frame, where the horizontal
// equations of motion pick up a Coriolis term from the vertical component of Earth's spin,
// Omega_z = Omega * sin(latitude):
//     x'' = -w^2 x + 2 Omega_z y'      y'' = -w^2 y - 2 Omega_z x'
// The swing plane therefore turns at Omega_z (clockwise from above in the northern
// hemisphere). Real precession takes ~32 h at Paris, so the sim speeds the Earth up by a
// "time-lapse" factor k (Omega_eff = k * Omega) while the pendulum keeps its real swing rate.
import { THREE, OrbitControls } from '../vendor/three-bundle.min.js';
import { createScene } from './sim-kit-three.mjs';

const OMEGA_EARTH = 7.2921159e-5; // rad/s (sidereal)
const G = 9.81;
const H = 13;            // pivot height (m)
const L = 12.1;          // wire length (m)
const W2 = G / L;        // omega^2 of the swing
const RING_R = 3.0;      // domino ring radius
const AMP = 3.12;        // swing amplitude: tip just crosses the ring
const N_DOM = 24;
const SUBSTEP = 1 / 240;

const root = document.getElementById('foucaultSim');
if (root) {
  try {
    init(root);
  } catch (err) {
    console.error('Foucault sim failed to start:', err);
    const note = document.createElement('p');
    note.className = 'fc-note';
    note.setAttribute('role', 'alert');
    note.style.padding = '1rem';
    note.textContent = 'The 3D pendulum could not start (' + (err && err.message ? err.message : 'WebGL unavailable') + '). Try a current browser with hardware acceleration turned on, then reload the page.';
    root.prepend(note);
  }
}

function init(root) {
  const canvas = root.querySelector('canvas');
  const $ = (id) => root.querySelector('#' + id);
  const panBtn = $('fcPan'), playBtn = $('fcPlay'), resetBtn = $('fcReset'), topBtn = $('fcTop'), sideBtn = $('fcSide');
  const latIn = $('fcLat'), latOut = $('fcLatOut'), speedSel = $('fcSpeed');
  const clockOut = $('fcClock'), planeOut = $('fcPlane'), downOut = $('fcDown'), periodOut = $('fcPeriod');

  const { renderer, scene, camera, syncSize } = createScene(canvas, { THREE, fov: 45, far: 200, clearColor: 0x0b1020 });
  scene.fog = new THREE.Fog(0x0b1020, 30, 80);

  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1b2236, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 16, 8);
  scene.add(sun);

  // Floor with degree ticks so the swing-plane turn is easy to read.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(5.2, 96), new THREE.MeshStandardMaterial({ color: 0x1f2a44, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const tickPts = [];
  for (let d = 0; d < 360; d += 5) {
    const a = d * Math.PI / 180, r0 = d % 45 === 0 ? 4.1 : 4.5, r1 = 4.8;
    tickPts.push(new THREE.Vector3(r0 * Math.cos(a), 0.005, -r0 * Math.sin(a)), new THREE.Vector3(r1 * Math.cos(a), 0.005, -r1 * Math.sin(a)));
  }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPts), new THREE.LineBasicMaterial({ color: 0x5b6b91 })));

  // Ceiling mount, wire, bob, pointer.
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 24), new THREE.MeshStandardMaterial({ color: 0x8a94a8, metalness: 0.6, roughness: 0.4 }));
  mount.position.y = H + 0.15;
  scene.add(mount);
  const wireGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, H, 0), new THREE.Vector3(0, 1, 0)]);
  const wire = new THREE.Line(wireGeo, new THREE.LineBasicMaterial({ color: 0xe2e8f0 }));
  scene.add(wire);
  const bob = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24), new THREE.MeshStandardMaterial({ color: 0xffb020, metalness: 0.8, roughness: 0.25 }));
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0xff375f }));
  pointer.rotation.x = Math.PI; // tip down
  pointer.position.y = -0.6;
  bob.add(ball, pointer);
  scene.add(bob);

  // Floor trail of the pointer tip.
  const TRAIL_MAX = 6000;
  const trailPos = new Float32Array(TRAIL_MAX * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setDrawRange(0, 0);
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0x64d2ff, transparent: true, opacity: 0.55 }));
  trail.frustumCulled = false;
  scene.add(trail);
  let trailN = 0;

  // Dominoes: hinge on the outer bottom edge so they topple outward.
  const domGeo = new THREE.BoxGeometry(0.12, 0.9, 0.5);
  const dominoes = [];
  for (let k = 0; k < N_DOM; k++) {
    const th = (k / N_DOM) * Math.PI * 2;
    const hinge = new THREE.Group();
    hinge.position.set((RING_R + 0.06) * Math.cos(th), 0, -(RING_R + 0.06) * Math.sin(th));
    hinge.rotation.y = th;
    const mesh = new THREE.Mesh(domGeo, new THREE.MeshStandardMaterial({ color: k % 2 ? 0xf5f5f7 : 0xe8e8ec, roughness: 0.5 }));
    mesh.position.set(-0.06, 0.45, 0);
    hinge.add(mesh);
    scene.add(hinge);
    dominoes.push({ th, hinge, mat: mesh.material, fallen: false, fall: 0 });
  }
  const HALF_ANG = 0.25 / RING_R + 0.02;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;       // pan parallel to the screen, not along the floor
  controls.panSpeed = 1;
  controls.zoomSpeed = 0.8;
  controls.minPolarAngle = 0.001;
  controls.maxPolarAngle = Math.PI * 0.495; // keep the camera above the floor
  controls.minDistance = 3;
  controls.maxDistance = 45;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.listenToKeyEvents(canvas);       // arrow keys pan when the canvas has focus
  canvas.tabIndex = 0;
  canvas.style.outline = 'none';
  const PAN_LIMIT = new THREE.Box3(new THREE.Vector3(-8, 0.2, -8), new THREE.Vector3(8, H - 1, 8));
  let panMode = false;
  function setPanMode(v) {
    panMode = v;
    controls.mouseButtons.LEFT = v ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.touches.ONE = v ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    panBtn.textContent = v ? 'Drag: Pan' : 'Drag: Orbit';
    panBtn.setAttribute('aria-pressed', String(v));
  }
  function view(pos, target) { camera.position.set(...pos); controls.target.set(...target); controls.update(); }
  const sideView = () => view([9, 7, 15.5], [0, 5.3, 0]);
  const topView = () => view([0, 15, 0.01], [0, 0, 0]); // screen-up is -z, matching the math frame
  sideView();

  // ---- state ----
  let x, y, vx, vy, t, knocked, planeAngle, lastTurnAngle, lastRdot;
  function reset() {
    x = AMP; y = 0; vx = 0; vy = 0; t = 0; knocked = 0;
    planeAngle = 0; lastTurnAngle = 0; lastRdot = 0;
    trailN = 0; trailGeo.setDrawRange(0, 0);
    dominoes.forEach((d) => { d.fallen = false; d.fall = 0; d.hinge.rotation.z = 0; });
    draw();
    readouts();
  }

  const omegaZ = () => OMEGA_EARTH * Number(speedSel.value) * Math.sin(Number(latIn.value) * Math.PI / 180);

  function deriv(s, oz) {
    return [s[2], s[3], -W2 * s[0] + 2 * oz * s[3], -W2 * s[1] - 2 * oz * s[2]];
  }
  function step(h) {
    const oz = omegaZ();
    const s = [x, y, vx, vy];
    const k1 = deriv(s, oz);
    const k2 = deriv(s.map((v, i) => v + h / 2 * k1[i]), oz);
    const k3 = deriv(s.map((v, i) => v + h / 2 * k2[i]), oz);
    const k4 = deriv(s.map((v, i) => v + h * k3[i]), oz);
    const n = s.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    x = n[0]; y = n[1]; vx = n[2]; vy = n[3];
    t += h;

    // Swing-plane angle: sampled at each turnaround (max radius), unwrapped mod pi.
    const rdot = x * vx + y * vy;
    if (lastRdot * rdot < 0 && Math.hypot(x, y) > 0.5) {
      let a = Math.atan2(y, x);
      a += Math.round((lastTurnAngle - a) / Math.PI) * Math.PI;
      lastTurnAngle = a;
      planeAngle = a;
    }
    lastRdot = rdot;

    // Pointer vs dominoes.
    const r = Math.hypot(x, y);
    if (r >= RING_R) {
      const a = Math.atan2(y, x);
      for (const d of dominoes) {
        if (d.fallen) continue;
        const da = Math.abs(Math.atan2(Math.sin(a - d.th), Math.cos(a - d.th)));
        if (da < HALF_ANG) { d.fallen = true; knocked++; }
      }
    }
  }

  function draw() {
    const r = Math.min(Math.hypot(x, y), L * 0.95);
    const px = x, pz = -y;
    const by = H - Math.sqrt(L * L - r * r);
    bob.position.set(px, by - 0.0, pz);
    const p = wireGeo.attributes.position;
    p.setXYZ(1, px, by + 0.4, pz);
    p.needsUpdate = true;
    // Pointer tip projected to the floor for the trail.
    if (trailN < TRAIL_MAX) {
      trailPos.set([px, 0.02, pz], trailN * 3);
      trailN++;
      trailGeo.setDrawRange(0, trailN);
      trailGeo.attributes.position.needsUpdate = true;
    }
  }

  function fmtClock(sec) {
    const total = Math.floor(sec * Number(speedSel.value));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60);
    return `${h} h ${String(m).padStart(2, '0')} min`;
  }
  function readouts() {
    latOut.textContent = `${Math.abs(Number(latIn.value))}° ${Number(latIn.value) >= 0 ? 'N' : 'S'}`;
    clockOut.textContent = fmtClock(t);
    planeOut.textContent = `${(-planeAngle * 180 / Math.PI + 0).toFixed(1)}° clockwise`;
    const s = Math.abs(Math.sin(Number(latIn.value) * Math.PI / 180));
    downOut.textContent = `${knocked} / ${N_DOM}`;
    periodOut.textContent = s < 0.01 ? 'never (at the equator the plane does not turn)' : `${(23.934 / s).toFixed(1)} h for a full turn`;
  }

  // ---- loop ----
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setPlaying(v) {
    playing = v;
    playBtn.textContent = v ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(!v));
  }
  let last = performance.now(), acc = 0, rdTick = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    syncSize();
    if (playing) {
      acc += dt;
      while (acc >= SUBSTEP) { step(SUBSTEP); acc -= SUBSTEP; }
      draw();
    }
    for (const d of dominoes) {
      if (d.fallen && d.fall < 1) d.fall = Math.min(1, d.fall + dt * 2.5);
      d.hinge.rotation.z = -d.fall * 1.45;
      d.mat.emissive.setHex(d.fallen ? 0x401020 : 0x000000);
    }
    if ((rdTick += dt) > 0.1) { rdTick = 0; readouts(); }
    controls.update();
    controls.target.clamp(PAN_LIMIT.min, PAN_LIMIT.max); // stop panning the scene out of view
    renderer.render(scene, camera);
  }

  playBtn.addEventListener('click', () => setPlaying(!playing));
  resetBtn.addEventListener('click', reset);
  topBtn.addEventListener('click', topView);
  sideBtn.addEventListener('click', sideView);
  panBtn.addEventListener('click', () => setPanMode(!panMode));
  latIn.addEventListener('input', readouts);
  speedSel.addEventListener('change', readouts);

  setPanMode(false);
  setPlaying(playing);
  reset();
  requestAnimationFrame(frame);
}
