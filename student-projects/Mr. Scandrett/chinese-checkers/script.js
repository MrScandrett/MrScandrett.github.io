import {
  THREE,
  OrbitControls,
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  OutputPass,
  RoomEnvironment
} from "./vendor/three-game-bundle.min.js";

(() => {
  "use strict";

  // ============================================================== board math
  // The 121 holes of a Chinese-checkers star sit on one triangular lattice:
  // a radius-4 hex ("x+y+z=0", max(|x|,|y|,|z|)<=4, 61 holes) plus six
  // 10-hole triangular points, one glued to each hex edge.
  const DIRS = [
    [1, -1, 0], [1, 0, -1], [0, 1, -1],
    [-1, 1, 0], [-1, 0, 1], [0, -1, 1]
  ];
  // Cyclic edge order walking around the hexagon: x+, z-, y+, x-, z+, y-.
  const EDGES = [[0, 1], [2, -1], [1, 1], [0, -1], [2, 1], [1, -1]];

  function key(c) { return c[0] + "," + c[1] + "," + c[2]; }

  function buildHex() {
    const cells = [];
    for (let x = -4; x <= 4; x++) {
      for (let y = -4; y <= 4; y++) {
        const z = -x - y;
        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= 4) cells.push([x, y, z]);
      }
    }
    return cells;
  }

  function buildArm(axis, sign) {
    const B = (axis + 1) % 3;
    const C = (axis + 2) % 3;
    const cells = [];
    for (let d = 1; d <= 4; d++) {
      for (let k = 0; k <= 4 - d; k++) {
        const c = [0, 0, 0];
        c[axis] = sign * (4 + d);
        c[B] = sign * (-4 + k);
        c[C] = -c[axis] - c[B];
        cells.push(c);
      }
    }
    return cells;
  }

  function apexOf([axis, sign]) {
    const c = [0, 0, 0];
    c[axis] = sign * 8;
    c[(axis + 1) % 3] = sign * -4;
    c[(axis + 2) % 3] = -c[axis] - c[(axis + 1) % 3];
    return c;
  }

  function cornerBetween([axis, sign], [axis2, sign2]) {
    const c = [0, 0, 0];
    c[axis] = sign * 4;
    c[axis2] = sign2 * 4;
    return c;
  }

  const BOARD = new Map(); // key -> { c:[x,y,z], point:-1|0..5 }
  buildHex().forEach((c) => BOARD.set(key(c), { c, point: -1 }));
  EDGES.forEach(([axis, sign], idx) => {
    buildArm(axis, sign).forEach((c) => BOARD.set(key(c), { c, point: idx }));
  });

  const STAR_OUTLINE = [];
  for (let i = 0; i < 6; i++) {
    STAR_OUTLINE.push(apexOf(EDGES[i]));
    STAR_OUTLINE.push(cornerBetween(EDGES[i], EDGES[(i + 1) % 6]));
  }

  const HOLE_SIZE = 0.78; // lattice "size" parameter; spacing between holes = sqrt(3)*HOLE_SIZE
  function cubeToWorld([x, y, z]) {
    const q = x, r = z;
    const px = HOLE_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const pz = HOLE_SIZE * (1.5 * r);
    return [px, pz];
  }

  function neighborsOf(c) {
    const out = [];
    for (const d of DIRS) {
      const n = [c[0] + d[0], c[1] + d[1], c[2] + d[2]];
      if (BOARD.has(key(n))) out.push(n);
    }
    return out;
  }

  // ============================================================== players
  const POINT_COLORS = [0xe5484d, 0xf4a340, 0xf0d63d, 0x3fae57, 0x3f8ff0, 0xa05cf0];
  const POINT_NAMES = ["Red", "Orange", "Gold", "Green", "Blue", "Violet"];
  const PRESETS = {
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    6: [0, 1, 2, 3, 4, 5]
  };

  function pointCells(pointIdx) {
    const out = [];
    for (const hole of BOARD.values()) if (hole.point === pointIdx) out.push(hole.c);
    return out;
  }

  // ============================================================== three.js setup
  const canvas = document.getElementById("game");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 300);
  camera.position.set(0, 30, 27);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 14;
  controls.maxDistance = 48;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.12;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.HemisphereLight(0x8fa0ff, 0x231433, 0.9));
  const sun = new THREE.DirectionalLight(0xffe8c2, 1.6);
  sun.position.set(14, 26, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  const rim = new THREE.PointLight(0x8a5cff, 2.2, 60, 2);
  rim.position.set(-16, 10, -14);
  scene.add(rim);

  // ------------------------------------------------------------ nebula skydome
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform float uTime;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
      float noise(vec3 p){
        vec3 i=floor(p), f=fract(p);
        f = f*f*(3.0-2.0*f);
        float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
        float e=hash(i+vec3(0,0,1)), g=hash(i+vec3(1,0,1)), h=hash(i+vec3(0,1,1)), k=hash(i+vec3(1,1,1));
        float x1=mix(a,b,f.x), x2=mix(c,d,f.x), y1=mix(x1,x2,f.y);
        float x3=mix(e,g,f.x), x4=mix(h,k,f.x), y2=mix(x3,x4,f.y);
        return mix(y1,y2,f.z);
      }
      void main() {
        vec3 p = vPos * 2.4 + vec3(0.0, uTime * 0.012, 0.0);
        float n = noise(p) * 0.6 + noise(p * 2.3 + 5.0) * 0.3 + noise(p * 5.1) * 0.1;
        vec3 deep = vec3(0.02, 0.015, 0.05);
        vec3 violet = vec3(0.30, 0.14, 0.52);
        vec3 magenta = vec3(0.55, 0.18, 0.42);
        vec3 col = mix(deep, violet, smoothstep(0.25, 0.75, n));
        col = mix(col, magenta, smoothstep(0.6, 0.95, n) * 0.6);
        float band = smoothstep(-0.15, 0.35, vPos.y) * (1.0 - smoothstep(0.4, 0.95, vPos.y));
        col += band * vec3(0.18, 0.10, 0.30) * 0.6;
        float stars = step(0.9975, hash(floor(vPos * 340.0)));
        col += stars * (0.5 + 0.5 * sin(uTime * 3.0 + vPos.x * 100.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 24), skyMat);
  scene.add(sky);

  // ------------------------------------------------------------ board base
  function outlineToShape(points, scale) {
    const shape = new THREE.Shape();
    points.forEach((c, i) => {
      const [px, pz] = cubeToWorld(c);
      if (i === 0) shape.moveTo(px * scale, -pz * scale);
      else shape.lineTo(px * scale, -pz * scale);
    });
    shape.closePath();
    return shape;
  }

  const baseShape = outlineToShape(STAR_OUTLINE, 1.28);
  const baseGeo = new THREE.ExtrudeGeometry(baseShape, { depth: 0.9, bevelEnabled: true, bevelSize: 0.22, bevelThickness: 0.22, bevelSegments: 3, curveSegments: 1 });
  baseGeo.rotateX(Math.PI / 2);
  baseGeo.translate(0, -0.03, 0); // back cap (z=0) becomes the top face at y=0; nudge down to clear the hole caps

  function makePanelTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 180);
    g.addColorStop(0, "#241a3f");
    g.addColorStop(1, "#0c0818");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(180,150,255,0.06)";
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(128, 128, 20 + i * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const baseMat = new THREE.MeshStandardMaterial({ map: makePanelTexture(), roughness: 0.55, metalness: 0.35 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.receiveShadow = true;
  scene.add(base);

  // glowing rim just under the board edge
  const rimShape = outlineToShape(STAR_OUTLINE, 1.35);
  const rimGeo = new THREE.ShapeGeometry(rimShape);
  rimGeo.rotateX(Math.PI / 2);
  const rimMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x8a5cff) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform vec3 uColor;
      void main() {
        float d = distance(vUv, vec2(0.5));
        float glow = smoothstep(0.5, 0.3, d) * (0.5 + 0.5*sin(uTime*1.6));
        gl_FragColor = vec4(uColor, glow*0.18);
      }
    `
  });
  const rimGlow = new THREE.Mesh(rimGeo, rimMat);
  rimGlow.position.y = -1.02;
  scene.add(rimGlow);

  // ------------------------------------------------------------ holes
  const holeGeo = new THREE.CylinderGeometry(HOLE_SIZE * 0.42, HOLE_SIZE * 0.36, 0.12, 16);
  const holeMat = new THREE.MeshStandardMaterial({
    color: 0x07040f,
    emissive: 0x251344,
    emissiveIntensity: 0.42,
    roughness: 0.86,
    metalness: 0.12
  });
  const holeRimGeo = new THREE.TorusGeometry(HOLE_SIZE * 0.38, HOLE_SIZE * 0.055, 8, 20);
  holeRimGeo.rotateX(Math.PI / 2);
  const holeRimMat = new THREE.MeshBasicMaterial({
    color: 0xc8b5ff,
    toneMapped: false
  });
  const holeMeshes = [];
  for (const hole of BOARD.values()) {
    const [px, pz] = cubeToWorld(hole.c);
    const cup = new THREE.Mesh(holeGeo, holeMat);
    cup.position.set(px, -0.025, -pz);
    cup.receiveShadow = true;
    cup.userData.cube = hole.c;
    scene.add(cup);
    holeMeshes.push(cup);

    const rim = new THREE.Mesh(holeRimGeo, holeRimMat);
    rim.position.set(px, 0.045, -pz);
    scene.add(rim);
  }

  // pulsing highlight rings (pooled, shown/hidden per legal-move set)
  const RING_POOL_SIZE = 40;
  const ringGeo = new THREE.RingGeometry(HOLE_SIZE * 0.32, HOLE_SIZE * 0.5, 28);
  ringGeo.rotateX(-Math.PI / 2);
  function makeRingMat(color) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uKind: { value: 0.0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uKind;
        void main() {
          float pulse = 0.65 + 0.35*sin(uTime*4.0 + uKind*3.0);
          gl_FragColor = vec4(uColor * 1.4, pulse);
        }
      `
    });
  }
  const ringPool = [];
  for (let i = 0; i < RING_POOL_SIZE; i++) {
    const mesh = new THREE.Mesh(ringGeo, makeRingMat(0xffffff));
    mesh.visible = false;
    mesh.renderOrder = 2;
    scene.add(mesh);
    ringPool.push(mesh);
  }
  function clearRings() { ringPool.forEach((r) => (r.visible = false)); }
  function showRing(cube, color, kind) {
    const r = ringPool.find((x) => !x.visible);
    if (!r) return;
    const [px, pz] = cubeToWorld(cube);
    r.position.set(px, 0.05, -pz);
    r.material.uniforms.uColor.value.set(color);
    r.material.uniforms.uKind.value = kind;
    r.visible = true;
  }

  // selection halo
  const haloGeo = new THREE.RingGeometry(HOLE_SIZE * 0.55, HOLE_SIZE * 0.72, 32);
  haloGeo.rotateX(-Math.PI / 2);
  const haloMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xffffff) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform vec3 uColor;
      void main(){ float p = 0.5 + 0.5*sin(uTime*5.0); gl_FragColor = vec4(uColor, p*0.85); }
    `
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.visible = false;
  halo.renderOrder = 3;
  scene.add(halo);

  // target-point floor glow (shows during tutorial / subtly during play)
  function pointGlowMesh(pointIdx, color) {
    const cells = pointCells(pointIdx);
    const pts = cells.map((c) => cubeToWorld(c));
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => -p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const radius = Math.max(...pts.map((p) => Math.hypot(p[0] - cx, -p[1] - cz))) + HOLE_SIZE * 0.7;
    const geo = new THREE.CircleGeometry(radius, 24);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform vec3 uColor;
        void main(){
          float d = distance(vUv, vec2(0.5))*2.0;
          float glow = smoothstep(1.0, 0.0, d) * (0.35 + 0.15*sin(uTime*1.4));
          gl_FragColor = vec4(uColor, glow);
        }
      `
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, 0.03, cz);
    mesh.visible = false;
    mesh.renderOrder = 1;
    scene.add(mesh);
    return mesh;
  }
  const pointGlows = POINT_COLORS.map((c, i) => pointGlowMesh(i, c));

  // ------------------------------------------------------------ marbles
  const marbleGeo = new THREE.SphereGeometry(HOLE_SIZE * 0.44, 28, 20);
  function marbleMaterial(color) {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.1
    });
  }
  const marbleMatByPoint = POINT_COLORS.map(marbleMaterial);

  // ------------------------------------------------------------ hop-path preview arc
  const arcMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xffffff) } },
    vertexShader: `
      varying float vT;
      void main(){ vT = uv.x; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    `,
    fragmentShader: `
      varying float vT; uniform float uTime; uniform vec3 uColor;
      void main(){
        float stripe = fract(vT*8.0 - uTime*1.6);
        float a = smoothstep(0.0,0.15,stripe)*smoothstep(0.6,0.45,stripe);
        gl_FragColor = vec4(uColor*1.5, a*0.9 + 0.06);
      }
    `
  });
  let arcMeshes = [];
  function clearArcs() { arcMeshes.forEach((m) => scene.remove(m)); arcMeshes = []; }
  function addArc(fromCube, toCube, color) {
    const [fx, fz] = cubeToWorld(fromCube);
    const [tx, tz] = cubeToWorld(toCube);
    const mid = new THREE.Vector3((fx + tx) / 2, 1.8, -(fz + tz) / 2);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(fx, 0.3, -fz), mid, new THREE.Vector3(tx, 0.3, -tz)
    ]);
    const geo = new THREE.TubeGeometry(curve, 20, 0.045, 6, false);
    const mat = arcMat.clone();
    mat.uniforms.uColor.value = new THREE.Color(color);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    scene.add(mesh);
    arcMeshes.push(mesh);
  }

  // ------------------------------------------------------------ resize + composer
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.72);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    if (canvas.width === Math.round(w * renderer.getPixelRatio()) && canvas.height === Math.round(h * renderer.getPixelRatio())) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);

  // ============================================================== game state
  const els = {
    hud: document.getElementById("hud"),
    turnCard: document.getElementById("turnCard"),
    turnDot: document.getElementById("turnDot"),
    turnText: document.getElementById("turnText"),
    hint: document.getElementById("hint"),
    legend: document.getElementById("legend"),
    boot: document.getElementById("bootOverlay"),
    playerCountRow: document.getElementById("playerCountRow"),
    learnBtn: document.getElementById("learnBtn"),
    skipBtn: document.getElementById("skipBtn"),
    tutorial: document.getElementById("tutorialOverlay"),
    tutorialText: document.getElementById("tutorialText"),
    tutorialDots: document.getElementById("tutorialDots"),
    tutBack: document.getElementById("tutBack"),
    tutNext: document.getElementById("tutNext"),
    tutSkip: document.getElementById("tutSkip"),
    win: document.getElementById("winOverlay"),
    winTitle: document.getElementById("winTitle"),
    winSub: document.getElementById("winSub"),
    playAgainBtn: document.getElementById("playAgainBtn"),
    rulesBtn: document.getElementById("rulesBtn"),
    restartBtn: document.getElementById("restartBtn")
  };

  let playerCount = 2;
  let players = [];      // { pointIdx, color, name, isHuman }
  let pegs = [];          // { id, playerIdx, cube, mesh }
  let occupied = new Map(); // key -> peg
  let turnOrder = [];
  let turnIdx = 0;
  let selected = null;    // peg
  let legalSteps = [];
  let legalHops = new Map(); // key -> path (array of cube, excluding start)
  let animating = false;
  let gameOver = false;
  let flowVersion = 0;
  let aiTimer = null;

  function cancelPendingFlow() {
    flowVersion++;
    if (aiTimer !== null) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    animating = false;
  }

  function keyOf(c) { return key(c); }

  function setupPlayers(count) {
    const pts = PRESETS[count];
    players = pts.map((p, i) => ({
      pointIdx: p,
      color: POINT_COLORS[p],
      name: POINT_NAMES[p],
      isHuman: i === 0
    }));
    turnOrder = players.map((_, i) => i);
  }

  function clearPegs() {
    pegs.forEach((p) => scene.remove(p.mesh));
    pegs = [];
    occupied = new Map();
  }

  function setupPegs() {
    clearPegs();
    let id = 0;
    players.forEach((pl, playerIdx) => {
      const cells = pointCells(pl.pointIdx);
      cells.forEach((c) => {
        const mesh = new THREE.Mesh(marbleGeo, marbleMatByPoint[pl.pointIdx]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const [px, pz] = cubeToWorld(c);
        mesh.position.set(px, 0.34, -pz);
        scene.add(mesh);
        const peg = { id: id++, playerIdx, cube: c, mesh };
        pegs.push(peg);
        occupied.set(keyOf(c), peg);
      });
    });
  }

  function buildLegend() {
    els.legend.innerHTML = "";
    players.forEach((pl, i) => {
      const div = document.createElement("div");
      div.className = "legend-item";
      div.id = "legend-" + i;
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = "#" + pl.color.toString(16).padStart(6, "0");
      dot.style.boxShadow = "0 0 6px #" + pl.color.toString(16).padStart(6, "0");
      const label = document.createElement("span");
      label.textContent = pl.name + (pl.isHuman ? " (you)" : "") + ": 0/10";
      div.appendChild(dot);
      div.appendChild(label);
      els.legend.appendChild(div);
    });
  }

  function homeCountForTarget(playerIdx) {
    const pl = players[playerIdx];
    const targetIdx = (pl.pointIdx + 3) % 6;
    const cells = pointCells(targetIdx);
    let n = 0;
    for (const c of cells) {
      const peg = occupied.get(keyOf(c));
      if (peg && peg.playerIdx === playerIdx) n++;
    }
    return n;
  }

  function refreshLegend() {
    players.forEach((pl, i) => {
      const div = document.getElementById("legend-" + i);
      if (!div) return;
      const n = homeCountForTarget(i);
      div.lastChild.textContent = pl.name + (pl.isHuman ? " (you)" : "") + ": " + n + "/10";
      div.classList.toggle("active-turn", turnOrder[turnIdx] === i && !gameOver);
    });
  }

  // ------------------------------------------------------------ move rules
  function getStepMoves(cube) {
    return neighborsOf(cube).filter((n) => !occupied.has(keyOf(n)));
  }

  function getHopMoves(cube) {
    const visited = new Set([keyOf(cube)]);
    const parent = new Map();
    const results = [];
    let frontier = [cube];
    while (frontier.length) {
      const next = [];
      for (const pos of frontier) {
        for (const d of DIRS) {
          const mid = [pos[0] + d[0], pos[1] + d[1], pos[2] + d[2]];
          const land = [pos[0] + d[0] * 2, pos[1] + d[1] * 2, pos[2] + d[2] * 2];
          if (!BOARD.has(keyOf(mid)) || !BOARD.has(keyOf(land))) continue;
          if (!occupied.has(keyOf(mid))) continue;
          if (occupied.has(keyOf(land))) continue;
          if (visited.has(keyOf(land))) continue;
          visited.add(keyOf(land));
          parent.set(keyOf(land), pos);
          results.push(land);
          next.push(land);
        }
      }
      frontier = next;
    }
    return { results, parent };
  }

  function reconstructPath(land, parent, start) {
    const path = [land];
    let cur = land;
    while (keyOf(cur) !== keyOf(start)) {
      const p = parent.get(keyOf(cur));
      path.unshift(p);
      cur = p;
    }
    return path; // includes start as path[0]
  }

  // ------------------------------------------------------------ selection / highlighting
  function selectPeg(peg) {
    selected = peg;
    const steps = getStepMoves(peg.cube);
    const { results, parent } = getHopMoves(peg.cube);
    legalSteps = steps;
    legalHops = new Map();
    results.forEach((land) => legalHops.set(keyOf(land), reconstructPath(land, parent, peg.cube)));

    clearRings();
    const [px, pz] = cubeToWorld(peg.cube);
    halo.position.set(px, 0.05, -pz);
    halo.visible = true;

    const color = players[peg.playerIdx].color;
    steps.forEach((c) => showRing(c, color, 0));
    results.forEach((c) => showRing(c, color, 1));

    els.hint.textContent = (steps.length || results.length)
      ? "Tap a glowing hole to move. Tap your marble again to cancel."
      : "That marble has no legal moves right now.";
  }

  function deselect() {
    selected = null;
    legalSteps = [];
    legalHops = new Map();
    clearRings();
    clearArcs();
    halo.visible = false;
  }

  // ------------------------------------------------------------ animation helpers
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function animatePathMove(peg, path, done) {
    const version = flowVersion;
    animating = true;
    const segments = [];
    for (let i = 0; i < path.length - 1; i++) segments.push([path[i], path[i + 1]]);
    let segIdx = 0;

    function runSegment() {
      if (version !== flowVersion) return;
      if (segIdx >= segments.length) {
        animating = false;
        done();
        return;
      }
      const [from, to] = segments[segIdx];
      const [fx, fz] = cubeToWorld(from);
      const [tx, tz] = cubeToWorld(to);
      const dur = 320;
      const start = performance.now();
      const isHop = segments.length > 0 && Math.abs(to[0] - from[0]) + Math.abs(to[1] - from[1]) + Math.abs(to[2] - from[2]) > 2;
      const hopHeight = isHop ? 1.35 : 0.15;

      function frame(now) {
        if (version !== flowVersion) return;
        const t = Math.min(1, (now - start) / dur);
        const e = easeInOutQuad(t);
        const x = fx + (tx - fx) * e;
        const z = fz + (tz - fz) * e;
        const y = 0.34 + Math.sin(Math.PI * e) * hopHeight;
        peg.mesh.position.set(x, y, -z);
        if (t < 1) requestAnimationFrame(frame);
        else { segIdx++; runSegment(); }
      }
      requestAnimationFrame(frame);
    }
    runSegment();
  }

  function commitMove(peg, destCube) {
    occupied.delete(keyOf(peg.cube));
    peg.cube = destCube;
    occupied.set(keyOf(destCube), peg);
  }

  // ------------------------------------------------------------ turn flow
  function currentPlayerIdx() { return turnOrder[turnIdx]; }

  function updateTurnUI() {
    const pl = players[currentPlayerIdx()];
    els.turnCard.style.setProperty("--turn-color", "#" + pl.color.toString(16).padStart(6, "0"));
    els.turnText.textContent = pl.isHuman ? "Your move — " + pl.name : pl.name + " is thinking…";
    if (pl.isHuman) els.hint.textContent = "Tap one of your marbles to begin.";
    refreshLegend();
  }

  function checkWin(playerIdx) {
    if (homeCountForTarget(playerIdx) === 10) {
      gameOver = true;
      const pl = players[playerIdx];
      els.winTitle.textContent = pl.isHuman ? "You win! 🎉" : pl.name + " wins";
      els.winSub.textContent = pl.isHuman
        ? "Every one of your marbles made it across the board."
        : pl.name + " filled their point first. Give it another go!";
      els.win.hidden = false;
      return true;
    }
    return false;
  }

  function advanceTurn() {
    turnIdx = (turnIdx + 1) % turnOrder.length;
    updateTurnUI();
    maybeRunAI();
  }

  function finishHumanMove(peg, destCube, path) {
    animatePathMove(peg, path, () => {
      commitMove(peg, destCube);
      deselect();
      if (!checkWin(peg.playerIdx)) advanceTurn();
      else refreshLegend();
    });
  }

  // -------- simple AI: score every legal destination, favor progress toward target
  function targetCentroid(playerIdx) {
    const pl = players[playerIdx];
    const targetIdx = (pl.pointIdx + 3) % 6;
    const cells = pointCells(targetIdx);
    let sx = 0, sz = 0;
    cells.forEach((c) => { const [x, z] = cubeToWorld(c); sx += x; sz += z; });
    return [sx / cells.length, sz / cells.length];
  }

  function isInTarget(playerIdx, cube) {
    const pl = players[playerIdx];
    const targetIdx = (pl.pointIdx + 3) % 6;
    const hole = BOARD.get(keyOf(cube));
    return hole && hole.point === targetIdx;
  }

  function pickAIMove(playerIdx) {
    const [tx, tz] = targetCentroid(playerIdx);
    let best = null;
    const myPegs = pegs.filter((p) => p.playerIdx === playerIdx);
    for (const peg of myPegs) {
      const [fx, fz] = cubeToWorld(peg.cube);
      const distBefore = Math.hypot(fx - tx, fz - tz);
      const alreadyHome = isInTarget(playerIdx, peg.cube);

      const candidates = [];
      getStepMoves(peg.cube).forEach((c) => candidates.push({ cube: c, path: [peg.cube, c] }));
      const { results, parent } = getHopMoves(peg.cube);
      results.forEach((c) => candidates.push({ cube: c, path: reconstructPath(c, parent, peg.cube) }));

      for (const cand of candidates) {
        const [dx, dz] = cubeToWorld(cand.cube);
        const distAfter = Math.hypot(dx - tx, dz - tz);
        let score = distBefore - distAfter;
        if (isInTarget(playerIdx, cand.cube)) score += 3;
        if (alreadyHome) score -= 15;
        score += Math.random() * 0.35;
        if (!best || score > best.score) best = { peg, ...cand, score };
      }
    }
    return best;
  }

  function maybeRunAI() {
    if (gameOver) return;
    const pl = players[currentPlayerIdx()];
    if (pl.isHuman) return;
    const version = flowVersion;
    animating = true;
    aiTimer = setTimeout(() => {
      aiTimer = null;
      if (version !== flowVersion || gameOver) return;
      const move = pickAIMove(currentPlayerIdx());
      if (!move) { animating = false; advanceTurn(); return; }
      const color = pl.color;
      clearArcs();
      for (let i = 0; i < move.path.length - 1; i++) addArc(move.path[i], move.path[i + 1], color);
      animatePathMove(move.peg, move.path, () => {
        commitMove(move.peg, move.cube);
        clearArcs();
        if (!checkWin(currentPlayerIdx())) advanceTurn();
        else refreshLegend();
      });
    }, 550);
  }

  // ============================================================== pointer interaction
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  function pickPeg(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(pegs.map((p) => p.mesh), false);
    if (!hits.length) return null;
    return pegs.find((p) => p.mesh === hits[0].object) || null;
  }

  function pickHoleCube(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.intersectObjects(holeMeshes, false)[0];
    return hit ? hit.object.userData.cube : null;
  }

  function onPointerDown(ev) {
    if (animating || gameOver || els.boot.hidden === false || els.tutorial.hidden === false) return;
    const pl = players[currentPlayerIdx()];
    if (!pl.isHuman) return;
    const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const y = ev.touches ? ev.touches[0].clientY : ev.clientY;

    const peg = pickPeg(x, y);
    if (peg) {
      if (selected && selected.id === peg.id) { deselect(); els.hint.textContent = "Tap one of your marbles to begin."; return; }
      if (peg.playerIdx !== currentPlayerIdx()) { els.hint.textContent = "That's not your marble."; return; }
      selectPeg(peg);
      return;
    }

    if (!selected) return;
    const cube = pickHoleCube(x, y);
    if (!cube) return;
    const k = keyOf(cube);
    const isStep = legalSteps.some((c) => keyOf(c) === k);
    const hopPath = legalHops.get(k);
    if (isStep) {
      finishHumanMove(selected, cube, [selected.cube, cube]);
    } else if (hopPath) {
      finishHumanMove(selected, cube, hopPath);
    }
  }

  canvas.addEventListener("pointerdown", onPointerDown);

  // ============================================================== boot / tutorial / flow
  let bootCount = 2;
  els.playerCountRow.querySelectorAll(".count-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.playerCountRow.querySelectorAll(".count-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      bootCount = Number(btn.dataset.count);
    });
  });
  els.playerCountRow.querySelector('[data-count="2"]').classList.add("selected");

  const TUTORIAL_STEPS = [
    { text: "Every player starts with 10 marbles filling one point of the star.", focus: "home" },
    { text: "Your goal: move every marble into the point directly opposite yours — glowing here.", focus: "target" },
    { text: "The simplest move: slide one marble into any empty neighboring hole, one step at a time.", focus: "step" },
    { text: "The powerful move: hop over any marble — yours or an opponent's — into the empty hole right behind it. Nothing is captured; hopped marbles stay put.", focus: "hop" },
    { text: "Chain hops together in a single turn to cross the board fast. You can stop after any hop.", focus: "chain" },
    { text: "First player to fill their target point with all 10 marbles wins. Ready to play!", focus: "win" }
  ];
  let tutStep = 0;
  let tutPlayers = [];
  let tutorialMode = "onboarding"; // "onboarding" (from boot, ends by starting a game) | "rules" (mid-game, just closes)

  function tutorialSetupBoard() {
    setupPlayers(2);
    setupPegs();
    buildLegend();
    tutPlayers = players;
  }

  function renderTutorialStep() {
    clearRings();
    clearArcs();
    halo.visible = false;
    pointGlows.forEach((g) => (g.visible = false));

    els.tutorialDots.innerHTML = "";
    TUTORIAL_STEPS.forEach((_, i) => {
      const dot = document.createElement("span");
      if (i === tutStep) dot.className = "on";
      els.tutorialDots.appendChild(dot);
    });
    els.tutorialText.textContent = TUTORIAL_STEPS[tutStep].text;
    els.tutBack.disabled = tutStep === 0;
    const isLast = tutStep === TUTORIAL_STEPS.length - 1;
    els.tutNext.textContent = isLast ? (tutorialMode === "onboarding" ? "Start playing" : "Close") : "Next";
    els.tutSkip.hidden = tutorialMode === "rules";

    const focus = TUTORIAL_STEPS[tutStep].focus;
    const humanIdx = tutPlayers.findIndex((p) => p.isHuman);
    const redPoint = tutPlayers[humanIdx].pointIdx;
    const greenPoint = (redPoint + 3) % 6;
    // demo off real peg positions so a mid-game "rules" reopen never floats a halo over an empty hole
    const redPegCells = pegs.length ? pegs.filter((p) => p.playerIdx === humanIdx).map((p) => p.cube) : pointCells(redPoint);

    if (focus === "home") {
      pointGlows[redPoint].visible = true;
    } else if (focus === "target") {
      pointGlows[greenPoint].visible = true;
    } else if (focus === "step") {
      const cell = redPegCells.find((c) => getStepMoves(c).length > 0);
      if (cell) {
        const [px, pz] = cubeToWorld(cell);
        halo.position.set(px, 0.05, -pz);
        halo.visible = true;
        getStepMoves(cell).forEach((c) => showRing(c, POINT_COLORS[redPoint], 0));
      }
    } else if (focus === "hop" || focus === "chain") {
      // find a peg with a real multi-cell hop available for a vivid demo
      let demo = null;
      for (const c of redPegCells) {
        const { results, parent } = getHopMoves(c);
        if (results.length) { demo = { c, results, parent }; break; }
      }
      if (demo) {
        const [px, pz] = cubeToWorld(demo.c);
        halo.position.set(px, 0.05, -pz);
        halo.visible = true;
        const target = focus === "chain"
          ? demo.results.reduce((a, b) => (reconstructPath(a, demo.parent, demo.c).length >= reconstructPath(b, demo.parent, demo.c).length ? a : b))
          : demo.results[0];
        const path = reconstructPath(target, demo.parent, demo.c);
        showRing(target, POINT_COLORS[redPoint], 1);
        for (let i = 0; i < path.length - 1; i++) addArc(path[i], path[i + 1], POINT_COLORS[redPoint]);
      }
    } else if (focus === "win") {
      pointGlows[greenPoint].visible = true;
      pointGlows[redPoint].visible = true;
    }
  }

  function startTutorial() {
    tutorialMode = "onboarding";
    els.boot.hidden = true;
    els.tutorial.hidden = false;
    tutorialSetupBoard();
    tutStep = 0;
    renderTutorialStep();
  }

  function openRulesMidGame() {
    tutorialMode = "rules";
    tutPlayers = players;
    els.hud.hidden = true;
    els.tutorial.hidden = false;
    tutStep = 0;
    renderTutorialStep();
  }

  els.tutNext.addEventListener("click", () => {
    const isLast = tutStep === TUTORIAL_STEPS.length - 1;
    if (isLast) { endTutorial(); return; }
    tutStep++;
    renderTutorialStep();
  });
  els.tutBack.addEventListener("click", () => { if (tutStep > 0) { tutStep--; renderTutorialStep(); } });
  els.tutSkip.addEventListener("click", () => { if (tutorialMode === "onboarding") endTutorial(); });

  function endTutorial() {
    els.tutorial.hidden = true;
    clearRings(); clearArcs(); halo.visible = false;
    pointGlows.forEach((g) => (g.visible = false));
    if (tutorialMode === "onboarding") {
      startGame(bootCount);
    } else {
      els.hud.hidden = false;
      refreshLegend();
    }
  }

  els.learnBtn.addEventListener("click", startTutorial);
  els.skipBtn.addEventListener("click", () => { els.boot.hidden = true; startGame(bootCount); });
  els.rulesBtn.addEventListener("click", openRulesMidGame);

  els.restartBtn.addEventListener("click", () => {
    cancelPendingFlow();
    deselect();
    clearArcs();
    pointGlows.forEach((g) => (g.visible = false));
    els.hud.hidden = true;
    els.win.hidden = true;
    els.boot.hidden = false;
  });
  els.playAgainBtn.addEventListener("click", () => {
    startGame(bootCount);
  });

  function startGame(count) {
    cancelPendingFlow();
    gameOver = false;
    deselect();
    pointGlows.forEach((g) => (g.visible = false));
    setupPlayers(count);
    setupPegs();
    buildLegend();
    turnIdx = 0;
    els.hud.hidden = false;
    els.win.hidden = true;
    els.boot.hidden = true;
    els.tutorial.hidden = true;
    updateTurnUI();
    maybeRunAI();
  }

  // ============================================================== render loop
  let clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    resize();
    controls.update();
    const t = clock.getElapsedTime();
    skyMat.uniforms.uTime.value = t;
    rimMat.uniforms.uTime.value = t;
    haloMat.uniforms.uTime.value = t;
    pointGlows.forEach((g) => { if (g.material.uniforms) g.material.uniforms.uTime.value = t; });
    ringPool.forEach((r) => { if (r.visible) r.material.uniforms.uTime.value = t; });
    arcMeshes.forEach((m) => { m.material.uniforms.uTime.value = t; });
    composer.render();
  }
  resize();
  tick();
})();
