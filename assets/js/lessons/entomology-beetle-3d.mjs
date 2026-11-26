import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';

const canvas = document.getElementById('bugCanvas');
if (canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const startPosition = new THREE.Vector3(5.1, 3.7, -6.3);
  camera.position.copy(startPosition);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.3, 0.15);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 4.3;
  controls.maxDistance = 11;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = Math.PI * 0.88;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotate = !prefersReducedMotion;
  controls.autoRotateSpeed = 0.75;

  scene.add(new THREE.HemisphereLight(0xf1ffd2, 0x102419, 3.1));
  const key = new THREE.DirectionalLight(0xfff3d1, 5.4);
  key.position.set(-4.5, 7, -4.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; scene.add(key);
  const frontFill = new THREE.DirectionalLight(0xcffafe, 3.3);
  frontFill.position.set(4, 3.5, -5); scene.add(frontFill);
  const rim = new THREE.DirectionalLight(0x38bdf8, 4.1);
  rim.position.set(5, 4, 5); scene.add(rim);
  const shellFill = new THREE.PointLight(0xa3e635, 24, 12, 1.6);
  shellFill.position.set(-3.5, 2.5, 3); scene.add(shellFill);
  const eyeCatchlight = new THREE.PointLight(0xffffff, 32, 8, 1.5);
  eyeCatchlight.position.set(0, 3.2, -4.5); scene.add(eyeCatchlight);
  const museumSpot = new THREE.SpotLight(0xffd99b, 52, 13, Math.PI * 0.21, 0.58, 1.3);
  museumSpot.position.set(-2.8, 6.5, -3.4); museumSpot.target.position.set(0, 0.2, 0.1);
  museumSpot.castShadow = true; museumSpot.shadow.mapSize.set(1024, 1024); scene.add(museumSpot, museumSpot.target);

  const beetle = new THREE.Group();
  beetle.rotation.x = -0.04;
  scene.add(beetle);

  const textureCanvas = (size = 512) => { const element = document.createElement('canvas'); element.width = element.height = size; return element; };
  const finishTexture = (element, color = false, repeat = [1, 1]) => {
    const texture = new THREE.CanvasTexture(element);
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  };
  const hash = (x, y) => {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  // Fine, UV-mapped cuticle grain. SphereGeometry and CylinderGeometry provide
  // the UVs; these maps control color, microscopic height, and roughness.
  const shellColorCanvas = textureCanvas();
  const shellColorContext = shellColorCanvas.getContext('2d');
  const shellPixels = shellColorContext.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const i = (y * 512 + x) * 4, grain = hash(x, y), stria = 0.5 + 0.5 * Math.sin(x * 0.22);
    shellPixels.data[i] = 18 + grain * 10 + stria * 4;
    shellPixels.data[i + 1] = 59 + grain * 24 + stria * 10;
    shellPixels.data[i + 2] = 43 + grain * 20 + stria * 8;
    shellPixels.data[i + 3] = 255;
  }
  shellColorContext.putImageData(shellPixels, 0, 0);
  shellColorContext.globalAlpha = 0.2; shellColorContext.strokeStyle = '#b7e4c7'; shellColorContext.lineWidth = 0.7;
  for (let i = 0; i < 75; i++) { const x = hash(i, 2) * 512, y = hash(i, 9) * 512, l = 5 + hash(i, 17) * 22; shellColorContext.beginPath(); shellColorContext.moveTo(x, y); shellColorContext.lineTo(x + hash(i, 31) * 4 - 2, y + l); shellColorContext.stroke(); }

  const cuticleBumpCanvas = textureCanvas();
  const bumpContext = cuticleBumpCanvas.getContext('2d');
  const bumpPixels = bumpContext.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const i = (y * 512 + x) * 4, pores = hash(x * 2, y * 2), stria = 8 * Math.sin(x * 0.22);
    const value = Math.max(0, Math.min(255, 116 + pores * 32 + stria));
    bumpPixels.data[i] = bumpPixels.data[i + 1] = bumpPixels.data[i + 2] = value; bumpPixels.data[i + 3] = 255;
  }
  bumpContext.putImageData(bumpPixels, 0, 0);

  const roughCanvas = textureCanvas();
  const roughContext = roughCanvas.getContext('2d');
  const roughPixels = roughContext.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const i = (y * 512 + x) * 4, value = 42 + hash(x + 91, y + 37) * 72;
    roughPixels.data[i] = roughPixels.data[i + 1] = roughPixels.data[i + 2] = value; roughPixels.data[i + 3] = 255;
  }
  roughContext.putImageData(roughPixels, 0, 0);

  // Hexagonal ommatidia maps make the compound eye read correctly even at
  // close zoom. The relief map gives every facet a tiny convex lens.
  function makeEyeMap(relief = false) {
    const element = textureCanvas(), context = element.getContext('2d');
    context.fillStyle = relief ? '#242424' : '#120405'; context.fillRect(0, 0, 512, 512);
    const radius = 12, dx = radius * 1.72, dy = radius * 1.49;
    for (let row = -1; row < 37; row++) for (let col = -1; col < 31; col++) {
      const cx = col * dx + (row % 2) * dx * 0.5, cy = row * dy;
      context.beginPath();
      for (let n = 0; n < 6; n++) { const angle = Math.PI / 3 * n; const px = cx + Math.cos(angle) * radius, py = cy + Math.sin(angle) * radius; n ? context.lineTo(px, py) : context.moveTo(px, py); }
      context.closePath();
      if (relief) {
        const gradient = context.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, radius);
        gradient.addColorStop(0, '#f4f4f4'); gradient.addColorStop(0.58, '#9a9a9a'); gradient.addColorStop(1, '#111'); context.fillStyle = gradient;
      } else {
        const glow = 35 + Math.floor(hash(row, col) * 24); context.fillStyle = `rgb(${glow + 16},${glow * 0.28},${glow * 0.2})`;
      }
      context.fill(); context.strokeStyle = relief ? '#080808' : '#7a2424'; context.lineWidth = 1.2; context.stroke();
    }
    return finishTexture(element, !relief, [2.4, 2.1]);
  }

  const shellColorMap = finishTexture(shellColorCanvas, true, [1.8, 2.7]);
  const cuticleBumpMap = finishTexture(cuticleBumpCanvas, false, [2.2, 3.2]);
  const roughnessMap = finishTexture(roughCanvas, false, [2, 3]);
  const eyeColorMap = makeEyeMap(false), eyeReliefMap = makeEyeMap(true);

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: shellColorMap, bumpMap: cuticleBumpMap, bumpScale: 0.025, roughnessMap,
    metalness: 0.64, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12,
    iridescence: 0.72, iridescenceIOR: 1.48, iridescenceThicknessRange: [140, 430]
  });
  const edgeMat = new THREE.MeshPhysicalMaterial({ color: 0x111b16, bumpMap: cuticleBumpMap, bumpScale: 0.018, metalness: 0.4, roughness: 0.34, clearcoat: 0.82, clearcoatRoughness: 0.18 });
  const jointMat = new THREE.MeshPhysicalMaterial({ color: 0x26342a, bumpMap: cuticleBumpMap, bumpScale: 0.012, metalness: 0.22, roughness: 0.48, clearcoat: 0.35 });
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: eyeColorMap, bumpMap: eyeReliefMap, bumpScale: 0.045, roughness: 0.2, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, ior: 1.38, specularIntensity: 1 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0x26342a, bumpMap: cuticleBumpMap, bumpScale: 0.018, roughness: 0.62, metalness: 0.1 });

  function ellipsoid(name, position, scale, material, segments = 48) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(20, segments / 2)), material);
    mesh.name = name; mesh.position.set(...position); mesh.scale.set(...scale);
    mesh.castShadow = true; mesh.receiveShadow = true; beetle.add(mesh); return mesh;
  }
  function segment(a, b, radius, material = jointMat, radial = 10, parent = beetle) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = new THREE.Vector3().subVectors(end, start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius, direction.length(), radial), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  function joint(point, radius = 0.1) { return ellipsoid('leg joint', point, [radius, radius, radius], jointMat, 18); }

  // Abdomen beneath the paired elytra, thorax, pronotum, and head.
  const abdomen = ellipsoid('abdomen', [0, 0.32, 0.82], [1.05, 0.48, 1.5], bellyMat);
  const leftElytron = ellipsoid('left elytron', [-0.39, 0.55, 0.79], [0.64, 0.43, 1.4], shellMat, 72);
  const rightElytron = ellipsoid('right elytron', [0.39, 0.55, 0.79], [0.64, 0.43, 1.4], shellMat, 72);
  // Shallow longitudinal grooves reinforce the natural UV grain of the elytra.
  const grooveMat = new THREE.MeshPhysicalMaterial({ color: 0x071a13, roughness: 0.42, metalness: 0.28, transparent: true, opacity: 0.56 });
  for (const side of [-1, 1]) for (let line = 0; line < 4; line++) {
    const center = side * 0.39, x = center + side * (-0.34 + line * 0.17), points = [];
    for (let n = 0; n < 18; n++) {
      const z = -0.35 + n * (2.25 / 17), zn = (z - 0.79) / 1.4, xn = (x - center) / 0.64;
      const dome = Math.sqrt(Math.max(0.02, 1 - zn * zn - xn * xn));
      points.push(new THREE.Vector3(x, 0.56 + 0.43 * dome, z));
    }
    const groove = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.007, 5, false), grooveMat);
    beetle.add(groove);
  }
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 2.35), edgeMat);
  seam.position.set(0, 0.91, 0.78); seam.castShadow = true; beetle.add(seam);
  ellipsoid('pronotum', [0, 0.43, -0.58], [0.91, 0.43, 0.73], shellMat);
  ellipsoid('head', [0, 0.39, -1.36], [0.65, 0.45, 0.64], edgeMat);

  // Compound eyes sit laterally, where their wide field of view is most useful.
  for (const side of [-1, 1]) {
    const compoundEye = ellipsoid('compound eye', [side * 0.56, 0.53, -1.54], [0.22, 0.26, 0.29], eyeMat, 72);
    compoundEye.rotation.y = side * 0.16;
    const eyeGlint = new THREE.Mesh(new THREE.SphereGeometry(0.035, 18, 12), new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.82 }));
    eyeGlint.position.set(side * 0.69, 0.67, -1.73); beetle.add(eyeGlint);
  }

  // Three articulated leg pairs: coxa, femur, tibia, and a fine tarsus.
  const legPlans = [
    { attach: [0.63, 0.28, -0.87], knee: [1.16, 0.05, -1.42], ankle: [1.65, -0.18, -1.7], foot: [2.02, -0.24, -1.77] },
    { attach: [0.75, 0.26, -0.34], knee: [1.38, 0.02, -0.28], ankle: [1.83, -0.19, -0.13], foot: [2.2, -0.24, -0.02] },
    { attach: [0.7, 0.25, 0.27], knee: [1.25, 0.03, 0.94], ankle: [1.65, -0.18, 1.48], foot: [2.02, -0.24, 1.72] }
  ];
  for (const side of [-1, 1]) {
    for (const plan of legPlans) {
      const mirror = p => [p[0] * side, p[1], p[2]];
      const a = mirror(plan.attach), k = mirror(plan.knee), n = mirror(plan.ankle), f = mirror(plan.foot);
      segment(a, k, 0.105); segment(k, n, 0.085); segment(n, f, 0.045);
      joint(k, 0.11); joint(n, 0.075);
      // Paired terminal claws.
      segment(f, [f[0] + side * 0.16, f[1] - 0.015, f[2] - 0.08], 0.018, edgeMat, 6);
      segment(f, [f[0] + side * 0.16, f[1] - 0.015, f[2] + 0.08], 0.018, edgeMat, 6);
    }
  }

  // Segmented antennae curve forward; each side has an anatomical pivot so
  // the living specimen can sweep them without pieces separating.
  const antennaGroups = [];
  for (const side of [-1, 1]) {
    const root = [side * 0.34, 0.55, -1.72];
    const points = [
      root, [side * 0.58, 0.68, -1.97], [side * 0.82, 0.77, -2.18],
      [side * 1.08, 0.78, -2.34], [side * 1.3, 0.68, -2.47]
    ];
    const antenna = new THREE.Group(); antenna.position.set(...root); beetle.add(antenna); antennaGroups.push({ group: antenna, side });
    const local = points.map(point => [point[0] - root[0], point[1] - root[1], point[2] - root[2]]);
    for (let i = 0; i < local.length - 1; i++) {
      segment(local[i], local[i + 1], 0.035 - i * 0.003, edgeMat, 7, antenna);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.045 - i * 0.004, 14, 9), edgeMat);
      bead.position.set(...local[i + 1]); bead.castShadow = true; antenna.add(bead);
    }
    segment([side * 0.25, 0.25, -1.83], [side * 0.48, 0.16, -2.12], 0.075, edgeMat, 9);
    const mandibleTip = [side * 0.28, 0.13, -2.32]; segment([side * 0.48, 0.16, -2.12], mandibleTip, 0.055, edgeMat, 8);
  }

  // Subtle abdominal segment lines visible when students orbit underneath.
  for (let i = 0; i < 5; i++) {
    const z = 0.05 + i * 0.38;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.76 - i * 0.035, 0.018, 6, 36), jointMat);
    band.rotation.x = Math.PI / 2; band.scale.y = 0.75; band.position.set(0, 0.18, z); beetle.add(band);
  }

  // A textured museum-tray setting: dark archival felt inside a walnut frame.
  const feltCanvas = textureCanvas(512), feltContext = feltCanvas.getContext('2d'), feltPixels = feltContext.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const i = (y * 512 + x) * 4, fibre = hash(x * 3, y * 5), thread = 4 * Math.sin((x + y) * 0.55);
    feltPixels.data[i] = 20 + fibre * 11 + thread; feltPixels.data[i + 1] = 31 + fibre * 13 + thread;
    feltPixels.data[i + 2] = 24 + fibre * 9 + thread; feltPixels.data[i + 3] = 255;
  }
  feltContext.putImageData(feltPixels, 0, 0);
  const feltMap = finishTexture(feltCanvas, true, [3, 2.3]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 5.1), new THREE.MeshStandardMaterial({ color: 0xffffff, map: feltMap, bumpMap: feltMap, bumpScale: 0.012, roughness: 0.96, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.3, 0.15); ground.receiveShadow = true; scene.add(ground);
  const woodMat = new THREE.MeshPhysicalMaterial({ color: 0x402615, roughness: 0.32, metalness: 0.05, clearcoat: 0.55, clearcoatRoughness: 0.28, bumpMap: cuticleBumpMap, bumpScale: 0.025 });
  const framePieces = [
    { size: [7, 0.24, 0.24], pos: [0, -0.18, -2.48] }, { size: [7, 0.24, 0.24], pos: [0, -0.18, 2.78] },
    { size: [0.24, 0.24, 5.5], pos: [-3.38, -0.18, 0.15] }, { size: [0.24, 0.24, 5.5], pos: [3.38, -0.18, 0.15] }
  ];
  for (const piece of framePieces) { const frame = new THREE.Mesh(new THREE.BoxGeometry(...piece.size), woodMat); frame.position.set(...piece.pos); frame.castShadow = true; frame.receiveShadow = true; scene.add(frame); }
  const brassMat = new THREE.MeshPhysicalMaterial({ color: 0xc79a4a, metalness: 0.78, roughness: 0.2, clearcoat: 0.8 });
  for (const x of [-3.18, 3.18]) for (const z of [-2.28, 2.58]) { const fastener = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 24), brassMat); fastener.position.set(x, -0.035, z); scene.add(fastener); }

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas); resize();

  const spinButton = document.getElementById('toggleSpin');
  const syncSpinButton = () => {
    spinButton.textContent = controls.autoRotate ? 'Pause spin' : 'Auto rotate';
    spinButton.setAttribute('aria-pressed', controls.autoRotate ? 'false' : 'true');
  };
  spinButton.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; syncSpinButton(); });
  document.getElementById('resetCamera').addEventListener('click', () => {
    camera.position.copy(startPosition); controls.target.set(0, 0.3, 0.15); controls.update();
  });
  syncSpinButton();

  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', event => {
    const step = event.shiftKey ? 0.22 : 0.1;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); controls.autoRotate = false; syncSpinButton();
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') spherical.theta -= step;
    if (event.key === 'ArrowRight') spherical.theta += step;
    if (event.key === 'ArrowUp') spherical.phi = Math.max(0.18, spherical.phi - step);
    if (event.key === 'ArrowDown') spherical.phi = Math.min(Math.PI * 0.88, spherical.phi + step);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update();
  });

  let elapsed = 0;
  function step(dt) {
    elapsed += dt;
    if (!prefersReducedMotion) {
      const t = elapsed;
      // Spiracular pumping gently moves an insect's abdomen while at rest.
      const breath = Math.sin(t * 1.45) * 0.012;
      abdomen.scale.y = 0.48 + breath;
      leftElytron.rotation.z = Math.sin(t * 0.72) * 0.0025;
      rightElytron.rotation.z = -Math.sin(t * 0.72) * 0.0025;
      beetle.position.y = Math.sin(t * 1.45) * 0.008;
      beetle.rotation.z = Math.sin(t * 0.43) * 0.0035;
      antennaGroups.forEach(({ group, side }, index) => {
        group.rotation.y = Math.sin(t * 1.18 + index * 1.7) * 0.075;
        group.rotation.z = side * (0.035 + Math.sin(t * 0.83 + index * 0.9) * 0.055);
        group.rotation.x = Math.sin(t * 1.51 + index * 2.2) * 0.025;
      });
    }
    controls.update();
    renderer.render(scene, camera);
  }

  renderer.render(scene, camera);
  if (window.SimKit && typeof window.SimKit.loop === 'function') {
    window.SimKit.loop(step, { el: window.SimKit.stage(canvas), maxDt: 0.05 });
  } else {
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => step(Math.min(clock.getDelta(), 0.05)));
  }
}
