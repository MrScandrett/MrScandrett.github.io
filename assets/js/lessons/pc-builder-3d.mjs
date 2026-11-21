import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

const CAMERA_PRESETS = {
  full: { pos: [6.4, 9.8, 10.6], target: [0.15, 0, 0.1] },
  cpu: { pos: [-1.1, 4.4, 3.3], target: [-1.05, 0.25, -0.85] },
  memory: { pos: [2.8, 5.2, 4.4], target: [1.55, 0.15, 0.35] },
  power: { pos: [5.4, 6.2, 7.6], target: [1.6, 0.2, 1.35] },
};

const LED_HEX = {
  off: 0x1e2b36,
  red: 0xff4b5c,
  amber: 0xffb347,
  white: 0xf4f8ff,
  green: 0x3be898,
};

/**
 * Create the interactive 3D PC assembly workbench inside the given canvas.
 * Returns null if WebGL is unavailable so the host studio can fall back to 2D.
 */
export function createPCWorkbench3D(canvas, callbacks = {}) {
  if (!canvas) return null;

  try {
    const { renderer, scene, camera, syncSize, dispose } = createScene(canvas, {
      THREE,
      clearColor: 0x0b1724,
      maxDpr: 1.8,
    });

    camera.position.set(...CAMERA_PRESETS.full.pos);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...CAMERA_PRESETS.full.target);
    controls.minDistance = 4;
    controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.enablePan = false;
    controls.update();

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Studio lighting & procedural PMREM reflections
    scene.add(new THREE.HemisphereLight(0xc5dcff, 0x1e3430, 0.88));
    const keyLight = new THREE.DirectionalLight(0xffeed5, 3.1);
    keyLight.position.set(-3.5, 9.5, 5.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    Object.assign(keyLight.shadow.camera, {
      left: -10,
      right: 10,
      top: 8,
      bottom: -8,
      near: 0.5,
      far: 28,
    });
    keyLight.shadow.normalBias = 0.025;
    keyLight.shadow.bias = -0.00015;
    keyLight.shadow.radius = 3;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8fcaff, 1.25);
    fillLight.position.set(6, 4.5, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xb7ffdf, 1.45);
    rimLight.position.set(-4.5, 3, -6.5);
    scene.add(rimLight);

    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x334451);
    for (const [x, y, z, w, h, intensity] of [
      [-4, 7, 3, 6, 4, 5],
      [5, 5, -3, 4, 5, 3],
      [-3, 3, -7, 5, 2, 2],
    ]) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setScalar(intensity),
          side: THREE.DoubleSide,
        }),
      );
      panel.position.set(x, y, z);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio, 0.08);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.65;
    pmrem.dispose();
    studio.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });

    function grain(kind) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      const pixels = ctx.createImageData(256, 256);
      let seed = 1729;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
          const v = Math.round(
            128 +
              (random() - 0.5) * (kind === 'metal' ? 18 : 30) +
              (kind === 'metal' ? Math.sin(y * 2.8) * 13 : x % 4 === 0 || y % 4 === 0 ? 5 : 0),
          );
          const i = (y * 256 + x) * 4;
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v;
          pixels.data[i + 3] = 255;
        }
      }
      ctx.putImageData(pixels, 0, 0);
      const texture = new THREE.CanvasTexture(c);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(kind === 'metal' ? 2 : 6, kind === 'metal' ? 2 : 6);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    }

    const pcbGrain = grain('pcb');
    const metalGrain = grain('metal');
    const plasticGrain = grain('plastic');

    const mat = (color, extra = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });

    const greenPcb = new THREE.MeshPhysicalMaterial({
      color: 0x125b44,
      roughness: 0.43,
      metalness: 0.12,
      clearcoat: 0.38,
      clearcoatRoughness: 0.3,
      bumpMap: pcbGrain,
      bumpScale: 0.012,
    });
    const dark = mat(0x18232b, { roughness: 0.76, bumpMap: plasticGrain, bumpScale: 0.008 });
    const black = mat(0x121b22, { roughness: 0.82, bumpMap: plasticGrain, bumpScale: 0.006 });
    const metal = mat(0xbac8cc, { metalness: 0.92, roughness: 0.3, bumpMap: metalGrain, bumpScale: 0.006 });
    const darkMetal = mat(0x4a5b68, { metalness: 0.82, roughness: 0.38, bumpMap: metalGrain, bumpScale: 0.006 });
    const copper = mat(0xc77d46, { metalness: 0.88, roughness: 0.28 });
    const gold = mat(0xe7af45, { metalness: 0.88, roughness: 0.27 });
    const white = mat(0xcbded4, { roughness: 0.62 });
    const traceMat = mat(0x428f70, { roughness: 0.38, metalness: 0.25 });

    function box(parent, w, h, d, x, y, z, material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.castShadow = w > 0.14 && d > 0.14 && h > 0.08;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function cylinder(parent, r, h, x, y, z, material, segments = 20) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function label(text, x, z, width = 1.5, size = 100, parent = scene, y = -0.192, color = '#d4e5df') {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = color;
      ctx.font = `700 ${size}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 64);
      const texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, width / 4),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }

    function triangle(parent, x, y, z) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.35, 0, 0, 0, 0, 0.35], 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0xffcb61, side: THREE.DoubleSide }),
      );
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }

    /* ── 1. WORKBENCH CHASSIS, STANDOFFS & ESD MAT ───────────────────────── */
    const benchGroup = new THREE.Group();
    scene.add(benchGroup);
    // Main open bench tray
    box(benchGroup, 14.4, 0.26, 9.8, 0.1, -0.7, 0.2, mat(0x1f2f40, { roughness: 0.85, bumpMap: plasticGrain, bumpScale: 0.018 }));
    // Subtle case rail / rear channel marker
    box(benchGroup, 0.16, 0.55, 7.6, 4.18, -0.35, 0, darkMetal);
    label('CABLE CHANNEL', 4.18, -3.55, 1.85, 58, benchGroup, -0.55, '#92b6ce');

    // ESD Mat dock & ground indicator on front-left corner
    box(benchGroup, 2.35, 0.08, 1.35, -5.1, -0.53, 3.25, mat(0x164a46, { roughness: 0.7 }));
    const esdLedMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const esdLed = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), esdLedMat);
    esdLed.position.set(-4.2, -0.45, 3.25);
    benchGroup.add(esdLed);
    label('ESD BENCH MAT', -5.25, 3.25, 1.8, 62, benchGroup, -0.47, '#9de5d1');

    // CPU ESD Tray on left
    box(benchGroup, 2.4, 0.14, 2.4, -5.1, -0.5, 0, mat(0x3b5266));
    for (const z of [-1.1, 1.1]) box(benchGroup, 2.4, 0.12, 0.12, -5.1, -0.37, z, dark);
    for (const x of [-6.2, -4.0]) box(benchGroup, 0.12, 0.12, 2.2, x, -0.37, 0, dark);
    label('CPU TRAY', -5.1, 1.55, 1.8, 86, benchGroup, -0.55);

    // 8 Brass hex standoffs anchored to the tray
    const standoffCoords = [
      [-3.65, -2.65],
      [0, -2.65],
      [3.65, -2.65],
      [-3.65, 0],
      [3.65, 0],
      [-3.65, 2.65],
      [0, 2.65],
      [3.65, 2.65],
    ];
    for (const [x, z] of standoffCoords) {
      cylinder(benchGroup, 0.12, 0.25, x, -0.46, z, gold, 6);
    }

    // Wall outlet dock at back-right
    box(benchGroup, 1.65, 0.35, 0.9, 5.45, -0.42, -3.35, dark);
    for (const dx of [-0.35, 0.35]) {
      box(benchGroup, 0.08, 0.06, 0.18, 5.45 + dx, -0.23, -3.35, black);
    }
    const wallLedMat = new THREE.MeshBasicMaterial({ color: 0x30414f });
    const wallLed = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), wallLedMat);
    wallLed.position.set(6.05, -0.22, -3.35);
    benchGroup.add(wallLed);
    label('WALL OUTLET', 5.45, -2.65, 1.5, 64, benchGroup, -0.55, '#9de5d1');

    /* ── 2. MOTHERBOARD GROUP (lowers smoothly onto standoffs) ───────────── */
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    const pcbTop = -0.21;
    const socketX = -1.05;
    const socketZ = -0.85;

    // Main PCB
    box(boardGroup, 8, 0.16, 6, 0, -0.29, 0, greenPcb);
    // Mounting rings + screws (screws appear once mounted)
    const boardScrews = [];
    for (const [x, z] of standoffCoords) {
      cylinder(boardGroup, 0.14, 0.018, x, pcbTop + 0.01, z, metal);
      const screw = cylinder(boardGroup, 0.07, 0.03, x, pcbTop + 0.025, z, black);
      boardScrews.push(screw);
    }

    // Copper traces
    for (let i = 0; i < 10; i++) {
      const z = 0.6 + i * 0.16;
      box(boardGroup, 0.65, 0.008, 0.012, 0.45, pcbTop + 0.006, z, traceMat);
      box(boardGroup, 0.012, 0.008, 0.35, 0.78 + i * 0.025, pcbTop + 0.006, z + 0.17, traceMat);
    }

    // 4 Keyed DIMM slots + end latches
    const dimmLatches = [];
    const dimmXs = [];
    for (let i = 0; i < 4; i++) {
      const x = 1.25 + i * 0.48;
      dimmXs.push(x);
      box(boardGroup, 0.23, 0.16, 3.55, x, -0.13, -0.7, black);
      for (const dx of [-0.09, 0.09]) box(boardGroup, 0.045, 0.17, 3.55, x + dx, -0.015, -0.7, dark);
      box(boardGroup, 0.15, 0.15, 0.095, x, -0.015, -0.43, dark);
      const latchTop = box(boardGroup, 0.29, 0.25, 0.2, x, 0.0, -2.57, white);
      const latchBot = box(boardGroup, 0.29, 0.25, 0.2, x, 0.0, 1.17, white);
      dimmLatches.push({ slot: i, top: latchTop, bot: latchBot });
      label(['A1', 'A2', 'B1', 'B2'][i], x, 1.4, 0.4, 100, boardGroup, pcbTop + 0.018);
    }

    // 24-pin ATX & 8-pin CPU_PWR headers
    box(boardGroup, 0.38, 0.4, 1.65, 3.45, 0, -0.65, black);
    for (let row = 0; row < 2; row++) {
      for (let pin = 0; pin < 12; pin++) {
        box(boardGroup, 0.095, 0.015, 0.075, 3.35 + row * 0.2, 0.208, -1.37 + pin * 0.13, dark);
      }
    }
    label('24-PIN', 3.35, 0.5, 0.72, 100, boardGroup, pcbTop + 0.018);

    box(boardGroup, 0.75, 0.3, 0.34, -2.1, -0.02, -2.65, black);
    label('CPU_PWR', -2.08, -2.35, 0.9, 100, boardGroup, pcbTop + 0.018);

    // VRM bank & finned heatsinks
    for (let i = 0; i < 6; i++) {
      box(boardGroup, 0.22, 0.23, 0.23, -2.55, -0.04, -1.95 + i * 0.4, mat(0x5b6268));
      cylinder(boardGroup, 0.09, 0.24, -2.87, -0.04, -1.95 + i * 0.4, metal);
    }
    for (let i = 0; i < 7; i++) box(boardGroup, 0.045, 0.35, 2.55, -3.14 + i * 0.085, 0.05, -0.95, dark);
    for (let i = 0; i < 7; i++) box(boardGroup, 1.9, 0.3, 0.045, -0.8, 0.025, -2.62 + i * 0.07, dark);

    // PCIe slots, M.2 connector, chipset heatsink, CMOS battery, SATA, Front Panel
    for (const [z, length] of [
      [1.25, 3.3],
      [2.25, 3.3],
      [1.8, 0.95],
    ]) {
      box(boardGroup, length, 0.2, 0.24, -1.25, -0.08, z, black);
      box(boardGroup, length - 0.13, 0.014, 0.065, -1.25, 0.028, z, gold);
      box(boardGroup, 0.12, 0.24, 0.3, -1.25 + length / 2, 0, z, white);
    }
    label('PCIe x16', -1.35, 1.52, 1.05, 100, boardGroup, pcbTop + 0.018);

    box(boardGroup, 0.18, 0.16, 0.34, 0.35, -0.09, 1.75, black);
    cylinder(boardGroup, 0.09, 0.1, 2.35, -0.13, 1.75, metal);
    label('M.2 / SSD', 1.35, 1.75, 1.35, 100, boardGroup, pcbTop + 0.018);

    box(boardGroup, 1.15, 0.16, 0.75, 1.25, -0.08, 2.2, dark);
    for (let i = 0; i < 9; i++) box(boardGroup, 0.065, 0.18, 0.75, 0.77 + i * 0.12, 0.08, 2.2, metal);
    cylinder(boardGroup, 0.33, 0.12, 3.15, -0.12, 0.9, metal);
    label('+', 3.15, 0.9, 0.3, 90, boardGroup, -0.052);
    for (let i = 0; i < 2; i++) box(boardGroup, 0.35, 0.24, 0.6, 3.42, -0.02, 1.8 + i * 0.65, dark);
    for (let i = 0; i < 8; i++) box(boardGroup, 0.08, 0.1, 0.08, -2.2 + i * 0.16, -0.08, 2.78, gold);
    label('FRONT PANEL', -1.55, 2.52, 1.25, 100, boardGroup, pcbTop + 0.018);

    // Rear I/O housings
    for (const [z, d, h] of [
      [-2.25, 0.5, 0.5],
      [-1.55, 0.65, 0.6],
      [-0.65, 0.7, 0.55],
      [0.25, 0.65, 0.75],
      [1.2, 0.75, 0.55],
    ]) {
      box(boardGroup, 0.6, h, d, -3.65, pcbTop + h / 2, z, metal);
      box(boardGroup, 0.018, h * 0.55, d * 0.65, -3.96, pcbTop + h / 2, z, black);
    }
    label('ALPHA / TRAINING BOARD', 0.1, 2.8, 2.25, 65, boardGroup, pcbTop + 0.018);

    // 5 Surface-mounted Diagnostic POST LEDs along right edge
    const postLedMats = {};
    const ledKeys = ['pwr', 'cpu', 'dram', 'vga', 'boot'];
    box(boardGroup, 0.42, 0.04, 1.15, 3.68, pcbTop + 0.02, -2.18, black);
    ledKeys.forEach((key, idx) => {
      const m = new THREE.MeshBasicMaterial({ color: LED_HEX.off });
      postLedMats[key] = m;
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), m);
      dot.position.set(3.72, pcbTop + 0.05, -2.56 + idx * 0.19);
      boardGroup.add(dot);
      label(key.toUpperCase(), 3.36, -2.56 + idx * 0.19, 0.42, 74, boardGroup, pcbTop + 0.02, '#9de5d1');
    });

    // CPU Socket & Retention Mechanism (mounted on boardGroup)
    box(boardGroup, 2.1, 0.12, 2.1, socketX, -0.1, socketZ, metal);
    const socket = box(boardGroup, 1.82, 0.2, 1.82, socketX, 0.06, socketZ, black);
    for (let x = 0; x < 18; x++) {
      for (let z = 0; z < 18; z++) {
        box(boardGroup, 0.022, 0.025, 0.04, socketX - 0.76 + x * 0.089, 0.173, socketZ - 0.76 + z * 0.089, gold);
      }
    }
    for (const x of [-2.2, 0.1]) {
      for (const z of [-2, 0.3]) {
        cylinder(boardGroup, 0.12, 0.03, x, pcbTop + 0.02, z, metal);
        cylinder(boardGroup, 0.055, 0.04, x, pcbTop + 0.04, z, black);
      }
    }
    label('CPU_FAN', 0.35, -1.95, 0.75, 100, boardGroup, pcbTop + 0.018);
    for (let i = 0; i < 4; i++) box(boardGroup, 0.045, 0.22, 0.045, 0.15 + i * 0.13, -0.02, -1.72, gold);
    triangle(boardGroup, socketX - 1.04, 0.19, socketZ - 1.04);

    // Translucent cyan ghost target above socket
    const ghost = box(
      boardGroup,
      1.72,
      0.15,
      1.72,
      socketX,
      1.5,
      socketZ,
      mat(0x9de5d1, { transparent: true, opacity: 0.18, depthWrite: false }),
    );
    ghost.add(new THREE.LineSegments(new THREE.EdgesGeometry(ghost.geometry), new THREE.LineBasicMaterial({ color: 0x9de5d1 })));
    ghost.castShadow = false;
    ghost.receiveShadow = false;

    const arm = new THREE.Group();
    arm.position.set(socketX + 1.16, 0.2, socketZ - 1.05);
    boardGroup.add(arm);
    box(arm, 0.07, 0.07, 2.2, 0, 0, 1.1, metal);
    box(arm, 0.4, 0.07, 0.07, -0.17, 0, 2.17, metal);

    const plate = new THREE.Group();
    plate.position.set(socketX, 0.24, socketZ - 1);
    boardGroup.add(plate);
    for (const x of [-0.94, 0.94]) box(plate, 0.16, 0.055, 2, x, 0, 1, metal);
    for (const z of [0.05, 1.95]) box(plate, 1.75, 0.055, 0.16, 0, 0, z, metal);
    box(boardGroup, 1.7, 0.16, 0.16, socketX, 0.18, socketZ - 1.08, metal);

    /* ── 3. INTERACTIVE CPU CHIP ─────────────────────────────────────────── */
    const cpuGroup = new THREE.Group();
    scene.add(cpuGroup);
    box(cpuGroup, 1.7, 0.13, 1.7, 0, 0, 0, mat(0x326f61));
    box(cpuGroup, 1.37, 0.1, 1.37, 0, 0.115, 0, metal);
    box(cpuGroup, 1.19, 0.035, 1.19, 0, 0.182, 0, metal);
    label('ALPHA', 0, 0, 0.93, 88, cpuGroup, 0.204);
    for (let i = 0; i < 7; i++) {
      for (const z of [-0.75, 0.75]) {
        box(cpuGroup, 0.05, 0.018, 0.035, -0.5 + i * 0.16, 0.079, z, gold);
      }
    }
    triangle(cpuGroup, -0.82, 0.08, -0.82);

    /* ── 4. THERMAL COMPOUND & TOWER COOLER + SPINNING FAN ───────────────── */
    const pasteMesh = cylinder(boardGroup, 0.28, 0.035, socketX, 0.48, socketZ, mat(0x9ca7b0, { metalness: 0.45, roughness: 0.35 }), 18);
    pasteMesh.visible = false;

    const coolerGroup = new THREE.Group();
    coolerGroup.position.set(socketX, 0.49, socketZ);
    boardGroup.add(coolerGroup);
    // Copper base & heatpipes
    box(coolerGroup, 1.28, 0.12, 1.28, 0, 0.06, 0, copper);
    for (const dx of [-0.42, -0.14, 0.14, 0.42]) {
      cylinder(coolerGroup, 0.048, 1.78, dx, 0.98, -0.18, copper, 10);
      cylinder(coolerGroup, 0.048, 1.78, dx, 0.98, 0.18, copper, 10);
    }
    // Stacked fin array
    for (let i = 0; i < 11; i++) {
      box(coolerGroup, 1.58, 0.032, 0.98, 0, 0.35 + i * 0.14, 0, metal);
    }
    // Top cap
    box(coolerGroup, 1.6, 0.08, 1.0, 0, 1.88, 0, dark);
    // Front fan shroud + spinning rotor
    box(coolerGroup, 1.48, 1.44, 0.24, 0, 1.06, 0.62, black);
    const cpuFanRotor = new THREE.Group();
    cpuFanRotor.position.set(0, 1.06, 0.66);
    coolerGroup.add(cpuFanRotor);
    cylinder(cpuFanRotor, 0.2, 0.12, 0, 0, 0, darkMetal, 16).rotation.x = Math.PI / 2;
    for (let b = 0; b < 7; b++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.56, 0.025),
        mat(0x6dd3ba, { roughness: 0.42 }),
      );
      const angle = (b / 7) * Math.PI * 2;
      blade.position.set(Math.cos(angle) * 0.35, Math.sin(angle) * 0.35, 0);
      blade.rotation.z = angle + 0.35;
      blade.rotation.y = 0.25;
      cpuFanRotor.add(blade);
    }
    coolerGroup.visible = false;

    /* ── 5. DDR4 RAM MODULES ─────────────────────────────────────────────── */
    const ramSticksGroup = new THREE.Group();
    boardGroup.add(ramSticksGroup);
    const ramStickMeshes = [];
    for (let i = 0; i < 4; i++) {
      const x = dimmXs[i];
      const stick = new THREE.Group();
      stick.position.set(x, 0.29, -0.7);
      // Black PCB + brushed dark heatsink + teal LED spreader bar
      box(stick, 0.08, 0.62, 3.3, 0, 0, 0, black);
      box(stick, 0.13, 0.56, 3.24, 0, 0.04, 0, darkMetal);
      box(stick, 0.1, 0.07, 3.2, 0, 0.35, 0, mat(0x2fb89a, { roughness: 0.35 }));
      ramSticksGroup.add(stick);
      ramStickMeshes.push(stick);
    }
    ramSticksGroup.visible = false;

    /* ── 6. M.2 NVMe SSD ─────────────────────────────────────────────────── */
    const ssdGroup = new THREE.Group();
    ssdGroup.position.set(1.36, -0.05, 1.75);
    boardGroup.add(ssdGroup);
    box(ssdGroup, 1.95, 0.045, 0.42, 0, 0, 0, black);
    box(ssdGroup, 0.42, 0.035, 0.32, -0.5, 0.035, 0, darkMetal);
    box(ssdGroup, 0.5, 0.03, 0.34, 0.12, 0.03, 0, dark);
    box(ssdGroup, 0.5, 0.03, 0.34, 0.68, 0.03, 0, dark);
    cylinder(ssdGroup, 0.06, 0.04, 0.96, 0.03, 0, metal, 12);
    ssdGroup.visible = false;

    /* ── 7. DISCRETE PCIe GRAPHICS CARD + DUAL SPINNING FANS ─────────────── */
    const gpuGroup = new THREE.Group();
    gpuGroup.position.set(-1.35, 0.58, 1.25);
    boardGroup.add(gpuGroup);
    // Shroud & backplate
    box(gpuGroup, 4.45, 0.96, 0.52, 0.25, 0, 0, dark);
    box(gpuGroup, 4.42, 0.98, 0.06, 0.25, 0, -0.25, darkMetal);
    // Teal top badge + copper heatpipe accents
    box(gpuGroup, 1.7, 0.12, 0.48, 0.35, 0.5, 0, mat(0x2fb89a, { roughness: 0.35 }));
    box(gpuGroup, 3.9, 0.08, 0.46, 0.2, -0.49, 0, copper);
    // Rear steel mounting bracket
    box(gpuGroup, 0.12, 1.15, 0.65, -2.02, -0.05, 0, metal);
    // 8-pin GPU power header on outer right edge
    box(gpuGroup, 0.38, 0.22, 0.22, 1.6, 0.55, 0.05, black);

    const gpuFans = [];
    for (const fx of [-0.75, 1.05]) {
      const fanRotor = new THREE.Group();
      fanRotor.position.set(fx, -0.02, 0.27);
      gpuGroup.add(fanRotor);
      cylinder(fanRotor, 0.14, 0.05, 0, 0, 0, metal, 14).rotation.x = Math.PI / 2;
      for (let b = 0; b < 7; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.36, 0.02), mat(0x52c7ac));
        const ang = (b / 7) * Math.PI * 2;
        blade.position.set(Math.cos(ang) * 0.22, Math.sin(ang) * 0.22, 0);
        blade.rotation.z = ang + 0.35;
        fanRotor.add(blade);
      }
      gpuFans.push(fanRotor);
    }
    gpuGroup.visible = false;

    /* ── 8. ENCLOSED PSU BAY ─────────────────────────────────────────────── */
    const psuGroup = new THREE.Group();
    psuGroup.position.set(5.45, 0.08, 1.75);
    scene.add(psuGroup);
    box(psuGroup, 1.85, 1.25, 2.35, 0, 0, 0, dark);
    // Fan grille louvers on top
    for (let i = -3; i <= 3; i++) {
      box(psuGroup, 1.4, 0.04, 0.06, 0, 0.63, i * 0.22, darkMetal);
    }
    const psuSwitchLedMat = new THREE.MeshBasicMaterial({ color: 0x2f4352 });
    const psuSwitchLed = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.12), psuSwitchLedMat);
    psuSwitchLed.position.set(0.65, 0.38, -1.16);
    psuGroup.add(psuSwitchLed);
    label('PSU 650W', 0, 0.72, 1.35, 76, psuGroup, 0.65, '#9de5d1');
    psuGroup.visible = false;

    /* ── 9. BRAIDED 3D CABLES (Neat vs. Untidy Airflow State) ────────────── */
    const cablesGroup = new THREE.Group();
    scene.add(cablesGroup);

    const cableMatAtx = mat(0xf6c453, { roughness: 0.45 });
    const cableMatEps = mat(0x69c0ff, { roughness: 0.45 });
    const cableMatPcie = mat(0xb794f4, { roughness: 0.45 });

    function makeCablePair(material, messyPts, tidyPts) {
      const makeTube = (pts) => {
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
        const geo = new THREE.TubeGeometry(curve, 26, 0.055, 8, false);
        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        cablesGroup.add(mesh);
        return mesh;
      };
      return {
        messy: makeTube(messyPts),
        tidy: makeTube(tidyPts),
      };
    }

    const cablePairs = {
      atx: makeCablePair(
        cableMatAtx,
        [
          [4.65, 0.15, 0.85],
          [3.6, 1.1, 0.5],
          [2.7, 0.9, -0.3],
          [3.45, 0.22, -0.65],
        ],
        [
          [4.65, 0.15, 0.85],
          [4.28, -0.1, 0.4],
          [4.12, -0.1, -0.55],
          [3.45, 0.22, -0.65],
        ],
      ),
      eps: makeCablePair(
        cableMatEps,
        [
          [4.6, 0.2, 0.6],
          [1.6, 1.75, 0.15],
          [-0.9, 1.9, -0.85], // passes close across CPU cooler area
          [-2.1, 0.18, -2.65],
        ],
        [
          [4.6, 0.2, 0.6],
          [4.22, -0.12, -2.2],
          [1.6, -0.12, -3.18],
          [-2.1, 0.18, -2.65],
        ],
      ),
      pcie: makeCablePair(
        cableMatPcie,
        [
          [4.6, 0.15, 1.2],
          [2.4, 1.35, 1.8],
          [0.9, 1.25, 1.5],
          [0.25, 1.14, 1.3],
        ],
        [
          [4.6, 0.15, 1.2],
          [4.18, -0.05, 1.45],
          [1.8, 0.45, 1.55],
          [0.25, 1.14, 1.3],
        ],
      ),
    };

    /* ── 10. DISPLAY & WALL POWER CORDS ──────────────────────────────────── */
    const displayCableGroup = new THREE.Group();
    scene.add(displayCableGroup);
    const displayMat = mat(0x2fd3ae, { roughness: 0.48 });
    const displayCableIntegrated = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-4.02, 0.12, -0.65),
          new THREE.Vector3(-4.95, 0.12, -1.6),
          new THREE.Vector3(-6.4, -0.25, -2.6),
        ]),
        18,
        0.048,
        8,
        false,
      ),
      displayMat,
    );
    const displayCableGpu = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-3.45, 0.56, 1.25),
          new THREE.Vector3(-4.5, 0.45, 1.75),
          new THREE.Vector3(-6.4, -0.2, 2.3),
        ]),
        18,
        0.048,
        8,
        false,
      ),
      displayMat,
    );
    displayCableGroup.add(displayCableIntegrated, displayCableGpu);

    const wallCableMesh = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(5.45, 0.1, 0.58),
          new THREE.Vector3(5.45, 0.18, -1.4),
          new THREE.Vector3(5.45, -0.22, -3.28),
        ]),
        18,
        0.068,
        8,
        false,
      ),
      mat(0x243442, { roughness: 0.65 }),
    );
    scene.add(wallCableMesh);
    wallCableMesh.visible = false;

    /* ── 11. ANIMATED DATA-FLOW SIGNAL PULSES ────────────────────────────── */
    const dataFlowGroup = new THREE.Group();
    scene.add(dataFlowGroup);
    const flowTracks = [
      {
        color: 0x38bdf8, // CPU <-> RAM
        curve: new THREE.CatmullRomCurve3([
          new THREE.Vector3(socketX, 0.12, socketZ),
          new THREE.Vector3(0.35, 0.12, -0.7),
          new THREE.Vector3(1.75, 0.25, -0.7),
        ]),
        needsGpu: false,
      },
      {
        color: 0xfbbf24, // RAM <-> SSD
        curve: new THREE.CatmullRomCurve3([
          new THREE.Vector3(1.75, 0.2, 0.4),
          new THREE.Vector3(1.5, 0.08, 1.2),
          new THREE.Vector3(1.36, 0.02, 1.75),
        ]),
        needsGpu: false,
      },
      {
        color: 0xc084fc, // CPU -> GPU -> Display
        curve: new THREE.CatmullRomCurve3([
          new THREE.Vector3(socketX, 0.14, socketZ + 0.6),
          new THREE.Vector3(-1.05, 0.4, 1.25),
          new THREE.Vector3(-3.35, 0.55, 1.25),
        ]),
        needsGpu: true,
      },
      {
        color: 0x4ade80, // PSU -> 24-pin
        curve: new THREE.CatmullRomCurve3([
          new THREE.Vector3(4.65, 0.15, 0.85),
          [4.28, -0.1, 0.4],
          [4.12, -0.1, -0.55],
          [3.45, 0.22, -0.65],
        ].map((p) => (Array.isArray(p) ? new THREE.Vector3(...p) : p))),
        needsGpu: false,
      },
    ];
    for (const track of flowTracks) {
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        new THREE.MeshBasicMaterial({ color: track.color }),
      );
      dataFlowGroup.add(pulse);
      track.mesh = pulse;
    }
    dataFlowGroup.visible = false;

    /* ── 12. ZONE HIGHLIGHT GUIDE + RAYCAST TARGETS ──────────────────────── */
    const zoneSpecs = {
      bench: { center: [-5.1, -0.4, 3.25], size: [2.6, 0.5, 1.6] },
      board: { center: [0, -0.1, 0], size: [8.2, 0.45, 6.2] },
      cpu: { center: [socketX, 0.28, socketZ], size: [2.3, 0.9, 2.3] },
      ram: { center: [2.0, 0.18, -0.7], size: [2.2, 0.75, 3.9] },
      ssd: { center: [1.35, -0.02, 1.75], size: [2.3, 0.45, 0.9] },
      gpu: { center: [-1.35, 0.42, 1.25], size: [4.6, 1.15, 0.9] },
      psu: { center: [5.45, 0.1, 1.75], size: [2.2, 1.4, 2.6] },
      display: { center: [-3.9, 0.28, -0.15], size: [1.3, 1.1, 3.8] },
      route: { center: [4.22, -0.1, -0.6], size: [0.95, 0.8, 6.8] },
      wall: { center: [5.45, -0.25, -3.35], size: [1.9, 0.65, 1.2] },
    };

    const hitTargets = [];
    for (const [zoneId, spec] of Object.entries(zoneSpecs)) {
      const hitMesh = new THREE.Mesh(
        new THREE.BoxGeometry(...spec.size),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hitMesh.position.set(...spec.center);
      hitMesh.userData.zoneId = zoneId;
      scene.add(hitMesh);
      hitTargets.push(hitMesh);
    }

    const guideOutlineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    const guideBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), guideOutlineMat);
    const guideEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(guideBox.geometry),
      new THREE.LineBasicMaterial({ color: 0x7dd3fc }),
    );
    guideBox.add(guideEdges);
    guideBox.visible = false;
    scene.add(guideBox);

    /* ── 13. LIVE STATE SYNCHRONIZATION & ANIMATION LOOP ─────────────────── */
    let currentView = {
      completed: new Set(),
      gpuEnabled: false,
      ramSticks: 2,
      cpu: { stage: 'tray', rotation: 1, socketOpen: false },
      booted: false,
      leds: { pwr: 'off', cpu: 'off', dram: 'off', vga: 'off', boot: 'off' },
      highlightZone: null,
      dataFlow: false,
    };

    let cpuDisplayRotSteps = 1;
    let lastCpuLogicalRot = 1;
    let cameraAnim = null;
    let transitionFrames = 0;
    let frameHandle = 0;
    let lastTime = performance.now();
    let flowClock = 0;

    const targetCpuPos = new THREE.Vector3(-5.1, -0.35, 0);
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function sync(nextState) {
      const prevStage = currentView.cpu.stage;
      const prevRot = lastCpuLogicalRot;

      currentView = {
        completed: new Set(nextState.completed || []),
        gpuEnabled: Boolean(nextState.gpuEnabled),
        ramSticks: nextState.ramSticks || 2,
        cpu: { ...(nextState.cpu || { stage: 'tray', rotation: 1, socketOpen: false }) },
        booted: Boolean(nextState.booted),
        leds: { ...(nextState.leds || { pwr: 'off', cpu: 'off', dram: 'off', vga: 'off', boot: 'off' }) },
        highlightZone: nextState.highlightZone || null,
        dataFlow: Boolean(nextState.dataFlow),
      };

      // Keep rotation monotonic so each 90° click spins forward cleanly
      if (currentView.cpu.stage === 'tray') {
        cpuDisplayRotSteps = 1;
      } else if (currentView.cpu.rotation !== prevRot) {
        cpuDisplayRotSteps += 1;
      } else if (prevStage === 'tray' && currentView.cpu.stage !== 'tray') {
        cpuDisplayRotSteps = currentView.cpu.rotation;
      }
      lastCpuLogicalRot = currentView.cpu.rotation;

      const has = (id) => currentView.completed.has(id);

      esdLedMat.color.setHex(has('safe') ? LED_HEX.green : LED_HEX.amber);
      boardScrews.forEach((s) => {
        s.visible = has('board');
      });

      pasteMesh.visible = has('paste');
      coolerGroup.visible = has('cooler');
      ramSticksGroup.visible = has('ram');
      if (has('ram')) {
        const activeSlots = currentView.ramSticks >= 4 ? [0, 1, 2, 3] : [1, 3];
        ramStickMeshes.forEach((stick, idx) => {
          stick.visible = activeSlots.includes(idx);
        });
        dimmLatches.forEach(({ slot, top, bot }) => {
          const closed = activeSlots.includes(slot);
          top.rotation.x = closed ? 0 : -0.45;
          bot.rotation.x = closed ? 0 : 0.45;
        });
      } else {
        dimmLatches.forEach(({ top, bot }) => {
          top.rotation.x = -0.45;
          bot.rotation.x = 0.45;
        });
      }

      ssdGroup.visible = has('ssd');
      gpuGroup.visible = currentView.gpuEnabled && has('gpu');
      psuGroup.visible = has('psu');
      psuSwitchLedMat.color.setHex(has('wall') ? LED_HEX.green : 0x2f4352);
      wallLedMat.color.setHex(has('wall') ? LED_HEX.green : 0x30414f);
      wallCableMesh.visible = has('wall');

      const tidy = has('route');
      cablePairs.atx.messy.visible = has('atx') && !tidy;
      cablePairs.atx.tidy.visible = has('atx') && tidy;
      cablePairs.eps.messy.visible = has('eps') && !tidy;
      cablePairs.eps.tidy.visible = has('eps') && tidy;
      cablePairs.pcie.messy.visible = currentView.gpuEnabled && has('pcie') && !tidy;
      cablePairs.pcie.tidy.visible = currentView.gpuEnabled && has('pcie') && tidy;

      displayCableIntegrated.visible = !currentView.gpuEnabled && has('display');
      displayCableGpu.visible = currentView.gpuEnabled && has('display');

      for (const k of ledKeys) {
        postLedMats[k].color.setHex(LED_HEX[currentView.leds[k]] || LED_HEX.off);
      }

      ghost.visible = currentView.cpu.stage === 'held';
      dataFlowGroup.visible = currentView.booted && currentView.dataFlow;
      flowTracks.forEach((tr) => {
        if (tr.needsGpu) tr.mesh.visible = currentView.gpuEnabled;
      });

      if (currentView.highlightZone && zoneSpecs[currentView.highlightZone]) {
        const spec = zoneSpecs[currentView.highlightZone];
        guideBox.position.set(...spec.center);
        guideBox.scale.set(...spec.size);
        guideBox.visible = true;
      } else {
        guideBox.visible = false;
      }

      transitionFrames = 40;
      ensureLoop();
    }

    function focusCamera(presetId = 'full') {
      const preset = CAMERA_PRESETS[presetId] || CAMERA_PRESETS.full;
      if (reducedMotion()) {
        camera.position.set(...preset.pos);
        controls.target.set(...preset.target);
        controls.update();
        draw();
        return;
      }
      cameraAnim = {
        pos: new THREE.Vector3(...preset.pos),
        target: new THREE.Vector3(...preset.target),
        steps: 34,
      };
      ensureLoop();
    }

    function draw() {
      syncSize();
      renderer.render(scene, camera);
    }

    function tick(now) {
      frameHandle = 0;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const factor = reducedMotion() ? 1 : 0.24;

      // Board height eases onto standoffs once installed
      const targetBoardY = currentView.completed.has('board') ? 0 : 0.42;
      boardGroup.position.y = THREE.MathUtils.lerp(boardGroup.position.y, targetBoardY, factor);

      // CPU position & rotation
      const stage = currentView.cpu.stage;
      if (stage === 'tray') {
        targetCpuPos.set(-5.1, -0.35, 0);
      } else if (stage === 'held') {
        targetCpuPos.set(socketX, 1.5, socketZ);
      } else {
        targetCpuPos.set(socketX, 0.265, socketZ);
      }
      cpuGroup.position.lerp(targetCpuPos, factor);
      cpuGroup.rotation.y = THREE.MathUtils.lerp(
        cpuGroup.rotation.y,
        (cpuDisplayRotSteps * Math.PI) / 2,
        factor,
      );

      // Socket retention arm & open-center load plate
      arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x, currentView.cpu.socketOpen ? -1.35 : 0, factor);
      plate.rotation.x = THREE.MathUtils.lerp(plate.rotation.x, currentView.cpu.socketOpen ? -1.65 : 0, factor);

      // Camera preset smoothing
      if (cameraAnim) {
        camera.position.lerp(cameraAnim.pos, factor);
        controls.target.lerp(cameraAnim.target, factor);
        controls.update();
        cameraAnim.steps -= 1;
        if (cameraAnim.steps <= 0 || reducedMotion()) {
          camera.position.copy(cameraAnim.pos);
          controls.target.copy(cameraAnim.target);
          controls.update();
          cameraAnim = null;
        }
      }

      // Spin cooler & GPU fans while booted
      const spinning = currentView.booted && !reducedMotion();
      if (spinning) {
        if (coolerGroup.visible) cpuFanRotor.rotation.z -= dt * 11;
        if (gpuGroup.visible) {
          gpuFans.forEach((f) => {
            f.rotation.z -= dt * 10;
          });
        }
      }

      // Animated 3D data flow pulses
      const flowing = currentView.booted && currentView.dataFlow;
      if (flowing) {
        flowClock = reducedMotion() ? 0.35 : (flowClock + dt * 0.48) % 1;
        flowTracks.forEach((tr, idx) => {
          if (!tr.mesh.visible) return;
          const u = (flowClock + idx * 0.25) % 1;
          tr.curve.getPointAt(u, tr.mesh.position);
        });
      }

      draw();

      if (transitionFrames > 0) transitionFrames -= 1;
      const keepGoing =
        !document.hidden &&
        (transitionFrames > 0 || cameraAnim !== null || spinning || (flowing && !reducedMotion()));

      if (keepGoing) {
        frameHandle = requestAnimationFrame(tick);
      }
    }

    function ensureLoop() {
      if (!frameHandle && !document.hidden) {
        lastTime = performance.now();
        frameHandle = requestAnimationFrame(tick);
      }
    }

    // Raycast clicks directly on 3D CPU, socket, retention arm, or zone targets
    const ray = new THREE.Raycaster();
    let pointerStart = null;

    canvas.addEventListener('pointerdown', (e) => {
      pointerStart = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('pointerup', (e) => {
      if (!pointerStart || Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 7) return;
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      ray.setFromCamera(
        new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1),
        camera,
      );

      // Prioritize direct interactive CPU elements when clicked
      const cpuMeshes = [...cpuGroup.children, ...arm.children, socket];
      const directHits = ray.intersectObjects(cpuMeshes, true);
      if (directHits.length) {
        const hitObj = directHits[0].object;
        if (cpuGroup.children.includes(hitObj) && callbacks.onCpuClick) {
          const stage = currentView.cpu.stage;
          callbacks.onCpuClick(stage === 'tray' ? 'pick' : stage === 'held' ? 'rotate' : 'latch');
          return;
        }
        if (arm.children.includes(hitObj) && callbacks.onCpuClick) {
          callbacks.onCpuClick(currentView.cpu.socketOpen ? 'latch' : 'open');
          return;
        }
        if (hitObj === socket && currentView.cpu.stage === 'held' && callbacks.onCpuClick) {
          callbacks.onCpuClick('seat');
          return;
        }
      }

      // Otherwise hit named assembly zones
      const zoneHits = ray.intersectObjects(hitTargets, false);
      if (zoneHits.length && callbacks.onZoneClick) {
        callbacks.onZoneClick(zoneHits[0].object.userData.zoneId);
      }
    });

    const onControlChange = () => draw();
    controls.addEventListener('change', onControlChange);
    const resizeObs = new ResizeObserver(draw);
    resizeObs.observe(canvas);
    const onAppResize = () => draw();
    const onVisibility = () => {
      if (document.hidden) {
        if (frameHandle) cancelAnimationFrame(frameHandle);
        frameHandle = 0;
      } else {
        ensureLoop();
      }
    };
    document.addEventListener('creation-app-resize', onAppResize);
    document.addEventListener('visibilitychange', onVisibility);

    draw();

    return {
      sync,
      focusCamera,
      resize: draw,
      destroy() {
        if (frameHandle) cancelAnimationFrame(frameHandle);
        resizeObs.disconnect();
        controls.removeEventListener('change', onControlChange);
        document.removeEventListener('creation-app-resize', onAppResize);
        document.removeEventListener('visibilitychange', onVisibility);
        controls.dispose();
        dispose();
      },
    };
  } catch (error) {
    console.warn('3D PC workbench unavailable, falling back to 2D blueprint:', error);
    return null;
  }
}
