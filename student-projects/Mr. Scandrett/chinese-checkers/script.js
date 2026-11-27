import {
  THREE,
  OrbitControls,
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  OutputPass,
  RoomEnvironment
} from "./vendor/three-game-bundle.min.js";
// Same-WiFi play: the class site's shared lobby (esbuild bundles it into app.min.js).
import { mountLobbyPanel, joinCodeFromHash } from "../../../assets/js/lan-play/lobby-panel.mjs";

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
  const holeGeo = new THREE.CylinderGeometry(HOLE_SIZE * 0.4, HOLE_SIZE * 0.34, 0.14, 20);
  const holeMat = new THREE.MeshStandardMaterial({
    color: 0x160d25,
    emissive: 0x6f45a8,
    emissiveIntensity: 0.82,
    roughness: 0.72,
    metalness: 0.18
  });
  const holeRimGeo = new THREE.RingGeometry(HOLE_SIZE * 0.29, HOLE_SIZE * 0.46, 28);
  // RingGeometry faces +Z by default. Rotate toward +Y for the tabletop.
  holeRimGeo.rotateX(-Math.PI / 2);
  const holeRimMat = new THREE.MeshBasicMaterial({
    color: 0xd9caff,
    toneMapped: false,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.84
  });
  const holeMeshes = [];
  for (const hole of BOARD.values()) {
    const [px, pz] = cubeToWorld(hole.c);
    const cup = new THREE.Mesh(holeGeo, holeMat);
    cup.position.set(px, 0.015, -pz);
    cup.receiveShadow = true;
    cup.userData.cube = hole.c;
    scene.add(cup);
    holeMeshes.push(cup);

    const rim = new THREE.Mesh(holeRimGeo, holeRimMat);
    rim.position.set(px, 0.22, -pz);
    rim.renderOrder = 1;
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
    // A wider field of view keeps the six-point board fully visible in the
    // deliberately tall mobile play surface.
    camera.fov = camera.aspect < 0.9 ? 56 : 42;
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
    restartBtn: document.getElementById("restartBtn"),
    onlineBtn: document.getElementById("onlineBtn"),
    online: document.getElementById("onlineOverlay"),
    onlineCard: document.getElementById("onlineCard")
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
  // Online play (null when playing alone). The host is the referee: it checks every move and
  // publishes the whole board; guests only ask for moves and draw the boards that arrive.
  let online = null;        // { role: "host" | "guest", room, mySeat }
  let sending = false;      // a guest's move is on its way to the host
  let hostMoves = [];       // guests' moves that arrived while a marble was still hopping
  let guestStates = [];     // boards from the host waiting for the current animation
  let boardLive = false;    // a game is on the table (the HUD can be hidden by the rules card)

  function cancelPendingFlow() {
    flowVersion++;
    if (aiTimer !== null) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    animating = false;
  }

  function keyOf(c) { return key(c); }

  // kind: "local" (this device), "remote" (a classmate), "cpu". Alone, you are always seat 0.
  function setupPlayers(count, seats = null, mySeat = 0) {
    const pts = PRESETS[count];
    players = pts.map((p, i) => {
      const seat = seats && seats[i];
      const kind = !seats ? (i === 0 ? "local" : "cpu")
        : i === mySeat ? "local"
        : seat && seat.kind !== "cpu" ? "remote" : "cpu";
      return {
        pointIdx: p,
        color: POINT_COLORS[p],
        name: POINT_NAMES[p],
        who: seat && seat.kind !== "cpu" ? seat.name : null,
        away: !!(seat && seat.away),
        kind,
        isHuman: kind === "local"
      };
    });
    turnOrder = players.map((_, i) => i);
  }

  function labelOf(pl) {
    let s = pl.name;
    if (pl.who && !pl.isHuman) s += " · " + pl.who;
    if (pl.isHuman) s += " (you)";
    else if (online && (pl.kind === "cpu" || pl.away)) s += " (computer)";
    return s;
  }

  // Only the host (or a solo game) runs the computer players.
  function isComputer(i) {
    if (!online) return players[i].kind === "cpu";
    if (online.role !== "host") return false;
    return online.room.isComputer(i);
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
      label.textContent = labelOf(pl) + ": 0/10";
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
      div.lastChild.textContent = labelOf(pl) + ": " + n + "/10";
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
    if (pl.isHuman) els.turnText.textContent = "Your move — " + pl.name;
    else if (online && pl.kind === "remote" && !pl.away) els.turnText.textContent = "Waiting for " + pl.who + " (" + pl.name + ")…";
    else els.turnText.textContent = pl.name + " is thinking…";
    if (pl.isHuman) els.hint.textContent = "Tap one of your marbles to begin.";
    else if (online && !players.some((p) => p.isHuman)) els.hint.textContent = "You're watching this game.";
    else if (online) els.hint.textContent = "Watch the board — you'll move when it's your turn.";
    refreshLegend();
  }

  function showWin(playerIdx) {
    gameOver = true;
    const pl = players[playerIdx];
    const who = pl.who && !pl.isHuman ? pl.who + " (" + pl.name + ")" : pl.name;
    els.winTitle.textContent = pl.isHuman ? "You win! 🎉" : who + " wins";
    els.winSub.textContent = pl.isHuman
      ? "Every one of your marbles made it across the board."
      : who + " filled their point first. Give it another go!";
    // online, only the host starts the next game
    const guest = online && online.role === "guest";
    els.playAgainBtn.hidden = guest;
    if (guest) els.winSub.textContent += " Waiting for the host to start the next game…";
    els.win.hidden = false;
  }

  // The whole game in a few hundred bytes: where every marble is (by peg id), whose turn, who won.
  function snapshot(winner) {
    return { count: players.length, pos: pegs.map((p) => keyOf(p.cube)), turn: turnIdx, win: winner };
  }

  // Every move goes through here: yours, the computer's, and (on the host) a classmate's.
  // The board changes at once; the marble then hops there on screen.
  function playMove(peg, destCube, path) {
    commitMove(peg, destCube);
    const winner = homeCountForTarget(peg.playerIdx) === 10 ? peg.playerIdx : -1;
    if (winner >= 0) gameOver = true;
    else turnIdx = (turnIdx + 1) % turnOrder.length;
    if (online && online.role === "host") online.room.publish(snapshot(winner), { peg: peg.id, path: path.map(keyOf) });
    showMove(peg, path, () => afterMove(winner));
  }

  function showMove(peg, path, done) {
    const pl = players[peg.playerIdx];
    deselect();
    // other players' moves leave a glowing trail so you can follow what happened
    if (!pl.isHuman) for (let i = 0; i < path.length - 1; i++) addArc(path[i], path[i + 1], pl.color);
    animatePathMove(peg, path, () => { clearArcs(); done(); });
  }

  function afterMove(winner) {
    if (winner >= 0) { showWin(winner); refreshLegend(); return; }
    updateTurnUI();
    maybeRunAI();
    drainHostMoves();
  }

  function finishHumanMove(peg, destCube, path) {
    if (online && online.role === "guest") {
      // ask the host; the marble moves when the host's new board comes back
      sending = true;
      els.hint.textContent = "Sending your move…";
      online.room.move({ peg: peg.id, to: keyOf(destCube) });
      return;
    }
    playMove(peg, destCube, path);
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
    if (gameOver || animating || aiTimer !== null) return;
    const pl = players[currentPlayerIdx()];
    if (!isComputer(currentPlayerIdx())) return;
    const version = flowVersion;
    animating = true;
    aiTimer = setTimeout(() => {
      aiTimer = null;
      if (version !== flowVersion || gameOver) return;
      animating = false;
      if (!isComputer(currentPlayerIdx())) return; // a classmate came back while we waited
      const move = pickAIMove(currentPlayerIdx());
      if (!move) {
        // no legal move: pass (on the host, tell everyone whose turn it is now)
        turnIdx = (turnIdx + 1) % turnOrder.length;
        if (online && online.role === "host") online.room.publish(snapshot(-1), null);
        afterMove(-1);
        return;
      }
      playMove(move.peg, move.cube, move.path);
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
    if (animating || sending || gameOver || els.boot.hidden === false || els.tutorial.hidden === false || els.online.hidden === false) return;
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
    const humanIdx = Math.max(0, tutPlayers.findIndex((p) => p.isHuman)); // 0 when only watching
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

  function stopBoard() {
    cancelPendingFlow();
    deselect();
    clearArcs();
    pointGlows.forEach((g) => (g.visible = false));
    els.hud.hidden = true;
    els.win.hidden = true;
    boardLive = false;
  }

  els.restartBtn.addEventListener("click", () => {
    stopBoard();
    if (online && online.role === "host") {
      // back to the lobby: same room and code, the host can change seats and start again
      online.room.toLobby();
      openOnline("lobby");
      return;
    }
    if (online) {
      if (!confirm("Leave this game? The computer will play your marbles until you rejoin.")) { els.hud.hidden = false; return; }
      panel.leave();
    }
    els.boot.hidden = false;
  });
  els.playAgainBtn.addEventListener("click", () => {
    if (online && online.role === "host") { beginOnlineGame(online.room); return; }
    startGame(bootCount);
  });

  // seats/mySeat: from the online room. Without them it's you (Red) against the computer.
  function startGame(count, { seats = null, mySeat = 0 } = {}) {
    cancelPendingFlow();
    gameOver = false;
    sending = false;
    hostMoves = [];
    guestStates = [];
    deselect();
    pointGlows.forEach((g) => (g.visible = false));
    setupPlayers(count, seats, mySeat);
    setupPegs();
    buildLegend();
    turnIdx = 0;
    boardLive = true;
    els.hud.hidden = false;
    els.win.hidden = true;
    els.boot.hidden = true;
    els.tutorial.hidden = true;
    els.online.hidden = true;
    els.restartBtn.title = online ? (online.role === "host" ? "Back to the lobby" : "Leave the game") : "Restart game";
    if (online) faceSeat(players[mySeat] ? players[mySeat].pointIdx : 0);
    updateTurnUI();
    maybeRunAI();
  }

  // Turn the table so your own point is nearest you.
  function faceSeat(pointIdx) {
    let sx = 0, sz = 0;
    for (const c of pointCells(pointIdx)) { const [x, z] = cubeToWorld(c); sx += x; sz -= z; }
    const len = Math.hypot(sx, sz) || 1;
    const r = Math.hypot(camera.position.x, camera.position.z) || 27;
    camera.position.set((sx / len) * r, camera.position.y, (sz / len) * r);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  // ============================================================== play with classmates
  // The lobby (names, codes, seats) is the shared lan-play panel; this part is the board.

  function seatColor(i, count) {
    const p = PRESETS[count][i];
    return { name: POINT_NAMES[p], color: "#" + POINT_COLORS[p].toString(16).padStart(6, "0") };
  }

  const panel = mountLobbyPanel(els.onlineCard, {
    app: "chinese-checkers",
    game: "Chinese Checkers",
    seatCounts: [2, 3, 4, 6],
    seatCount: bootCount,
    seatLabel: seatColor,
    onRoom: (room, role) => {
      online = { role, room, mySeat: role === "host" ? 0 : -1 };
      if (role === "host") wireHost(room);
      else wireGuest(room);
    },
    onHostStart: (host, { resume } = {}) => {
      if (resume) { els.online.hidden = true; els.hud.hidden = false; return; }
      beginOnlineGame(host);
    },
    onClose: () => { els.online.hidden = true; els.boot.hidden = false; },
    onLeave: (room) => {
      if (!online || online.room !== room) return;
      online = null;
      stopBoard();
    }
  });

  function openOnline(view) {
    els.boot.hidden = true;
    els.win.hidden = true;
    els.online.hidden = false;
    if (view === "lobby") panel.showLobby();
    else panel.open();
  }
  els.onlineBtn.addEventListener("click", () => openOnline("menu"));

  function beginOnlineGame(host) {
    online.mySeat = 0;
    startGame(host.seats.length, { seats: host.seats, mySeat: 0 });
    host.begin(snapshot(-1));
  }

  // ---- host: the referee
  function wireHost(host) {
    host.on("move", (move, seat) => {
      hostMoves.push({ move, seat, from: host.seats[seat] && host.seats[seat].id });
      drainHostMoves();
    });
    const relabel = () => {
      if (!boardLive || players.length !== host.seats.length) return;
      host.seats.forEach((s, i) => { players[i].away = !!s.away; if (s.kind !== "cpu") players[i].who = s.name; });
      refreshLegend();
      updateTurnUI();
      maybeRunAI(); // someone dropped out on their turn: the computer takes it
    };
    host.on("leave", (i, name) => { relabel(); if (!els.hud.hidden) els.hint.textContent = name + " dropped out. The computer plays for them until they're back."; });
    host.on("back", (i, name) => { relabel(); if (!els.hud.hidden) els.hint.textContent = name + " is back."; });
    host.on("join", (i, name) => { if (!els.online.hidden) return; els.hint.textContent = name + " joined the lobby."; });
  }

  // A classmate's move is checked with the same rules as a tap on this screen.
  function drainHostMoves() {
    while (hostMoves.length && !animating && !gameOver) {
      const { move, seat, from } = hostMoves.shift();
      const why = checkRemoteMove(move, seat);
      if (why) { online.room.reject(from, why); continue; }
      const peg = pegs[move.peg];
      const dest = BOARD.get(move.to).c;
      const path = remotePath(peg, dest);
      playMove(peg, dest, path);
    }
  }

  function remotePath(peg, dest) {
    const k = keyOf(dest);
    if (getStepMoves(peg.cube).some((c) => keyOf(c) === k)) return [peg.cube, dest];
    const { results, parent } = getHopMoves(peg.cube);
    return results.some((c) => keyOf(c) === k) ? reconstructPath(dest, parent, peg.cube) : null;
  }

  function checkRemoteMove(move, seat) {
    if (!online || online.role !== "host") return "No game running.";
    if (seat !== currentPlayerIdx()) return "It isn't your turn.";
    if (!move || !Number.isInteger(move.peg) || typeof move.to !== "string") return "That move didn't make sense.";
    const peg = pegs[move.peg];
    if (!peg || peg.playerIdx !== seat) return "That's not your marble.";
    if (!BOARD.has(move.to) || !remotePath(peg, BOARD.get(move.to).c)) return "That hole isn't a legal move.";
    return null;
  }

  // ---- guest: draw what the host says
  function wireGuest(guest) {
    const startFrom = (info, st) => {
      online.mySeat = info.mySeat;
      startGame(st.count, { seats: info.seats, mySeat: info.mySeat });
      snapTo(st);
    };
    guest.on("start", (info) => {
      const st = cleanState(info.state);
      if (st) startFrom(info, st);
    });
    guest.on("state", (info) => {
      const st = cleanState(info.state);
      if (!st) return;
      // a board for a game we never saw start (we joined late, or missed it): start from it
      if (!boardLive || st.count !== players.length) { startFrom(info, st); return; }
      guestStates.push({ st, last: info.skipped ? null : info.last });
      drainGuestStates();
    });
    guest.on("lobby", (lobby) => {
      if (!boardLive || players.length !== lobby.seats.length) return;
      lobby.seats.forEach((s, i) => { players[i].away = !!s.away; if (s.kind !== "cpu") players[i].who = s.name; });
      refreshLegend();
      if (!animating) updateTurnUI();
    });
    guest.on("backToLobby", () => { stopBoard(); openOnline("lobby"); });
    guest.on("reject", (reason) => {
      sending = false;
      deselect();
      els.hint.textContent = reason || "The host didn't accept that move.";
    });
    guest.on("end", () => {
      if (!online || online.room !== guest) return;
      online = null;
      stopBoard();
      els.online.hidden = false; // the panel says why
    });
  }

  // The host could be anyone on the relay, so its board is checked before it's drawn.
  function cleanState(st) {
    if (!st || !PRESETS[st.count] || !Array.isArray(st.pos) || st.pos.length !== st.count * 10) return null;
    const seen = new Set();
    for (const k of st.pos) {
      if (typeof k !== "string" || !BOARD.has(k) || seen.has(k)) return null;
      seen.add(k);
    }
    const turn = Number.isInteger(st.turn) && st.turn >= 0 && st.turn < st.count ? st.turn : 0;
    const win = Number.isInteger(st.win) && st.win >= 0 && st.win < st.count ? st.win : -1;
    return { count: st.count, pos: st.pos, turn, win };
  }

  function snapTo(st) {
    occupied = new Map();
    pegs.forEach((peg, i) => {
      peg.cube = BOARD.get(st.pos[i]).c;
      const [px, pz] = cubeToWorld(peg.cube);
      peg.mesh.position.set(px, 0.34, -pz);
      occupied.set(st.pos[i], peg);
    });
    turnIdx = st.turn;
    gameOver = st.win >= 0;
    sending = false;
    deselect();
    if (gameOver) showWin(st.win);
    updateTurnUI();
  }

  function drainGuestStates() {
    if (animating || !guestStates.length) return;
    const { st, last } = guestStates.shift();
    // animate the hop when we can see where it started; otherwise just jump to the new board
    const peg = last && Number.isInteger(last.peg) ? pegs[last.peg] : null;
    const path = peg && Array.isArray(last.path) && last.path.length >= 2 && last.path.length <= 40 &&
      last.path.every((k) => typeof k === "string" && BOARD.has(k)) &&
      last.path[0] === keyOf(peg.cube) && last.path[last.path.length - 1] === st.pos[peg.id]
      ? last.path.map((k) => BOARD.get(k).c) : null;
    if (!path) { snapTo(st); drainGuestStates(); return; }
    showMove(peg, path, () => { snapTo(st); drainGuestStates(); });
  }

  // a shared link (…#join=BKZT) opens the lobby and joins
  const linkCode = joinCodeFromHash();
  if (linkCode) {
    openOnline("menu");
    panel.join(linkCode);
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
