import { THREE, OrbitControls } from "../../vendor/three-bundle.min.js";

const BOARD_SIZE = 8;
const HALF = (BOARD_SIZE - 1) / 2;

const THEMES = {
  turochamp1951: {
    world: 0x170f0a, fog: 0x170f0a, light: 0xe8dcc0, dark: 0x70472c,
    edge: 0x4a2c1d, white: 0xf3e8ce, black: 0x2b1a12, accent: 0xc5a45d, danger: 0x7c2636
  },
  deepblue1997: {
    world: 0x071a16, fog: 0x071a16, light: 0xe6dcc5, dark: 0x315747,
    edge: 0x422a1c, white: 0xf4ead4, black: 0x20252d, accent: 0xc7a55b, danger: 0x7f2938
  },
  modern2020s: {
    world: 0x081c18, fog: 0x081c18, light: 0xeee6d3, dark: 0x244c40,
    edge: 0x3c271b, white: 0xf7eedb, black: 0x202630, accent: 0xd0ae62, danger: 0x8a2e40
  }
};

function webglAvailable() {
  try {
    const probe = document.createElement("canvas");
    return Boolean(window.WebGLRenderingContext && (probe.getContext("webgl2") || probe.getContext("webgl")));
  } catch (_) {
    return false;
  }
}

// Slender Staunton silhouettes with turned collars and a shared weighted foot.
function profileForPiece(type) {
  const foot = [[0,0],[.29,0],[.35,.025],[.37,.065],[.37,.10],[.35,.14],[.30,.17],[.29,.20],[.28,.23],[.24,.25]];
  const stems = {
    P: [[.21,.29],[.16,.35],[.12,.47],[.12,.52],[.20,.55],[.21,.59],[.17,.63],[0,.64]],
    R: [[.23,.29],[.19,.40],[.18,.67],[.24,.72],[.28,.75],[.28,.80],[.27,.86],[.30,.89],[.30,1.02],[.23,1.02],[.23,.92],[0,.92]],
    B: [[.21,.30],[.15,.48],[.12,.72],[.17,.79],[.24,.82],[.24,.87],[.16,.91],[0,.92]],
    Q: [[.22,.30],[.16,.53],[.12,.84],[.17,.94],[.25,.98],[.25,1.03],[.17,1.07],[.22,1.16],[.27,1.23],[.27,1.28],[0,1.28]],
    K: [[.22,.30],[.16,.54],[.13,.90],[.17,1.01],[.25,1.05],[.25,1.10],[.18,1.14],[.20,1.23],[.19,1.29],[0,1.29]],
    N: [[.23,.29],[.23,.37],[.27,.40],[.27,.44],[.22,.48],[0,.48]]
  };
  return [...foot,...stems[type]];
}

function lathePiece(type, material) {
  const root = new THREE.Group();
  const add = (geometry, x=0, y=0, z=0, mat=material) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x,y,z);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  add(new THREE.LatheGeometry(profileForPiece(type).map(([x,y])=>new THREE.Vector2(x,y)),64));
  if (type === "P") add(new THREE.SphereGeometry(.185,32,24),0,.76);
  if (type === "R") {
    for(let i=0;i<6;i++) {
      const angle=i*Math.PI/3;
      const tooth=add(new THREE.BoxGeometry(.15,.16,.15),Math.cos(angle)*.25,1.08,Math.sin(angle)*.25);
      tooth.rotation.y=-angle;
    }
  }
  if (type === "B") {
    // A pointed mitre rather than a second pawn sphere.
    const points=[[0,.90],[.10,.92],[.19,1.02],[.20,1.10],[.17,1.18],[.11,1.26],[.035,1.36],[0,1.38]];
    add(new THREE.LatheGeometry(points.map(([x,y])=>new THREE.Vector2(x,y)),48));
    add(new THREE.SphereGeometry(.045,20,16),0,1.39);
    const groove=add(new THREE.BoxGeometry(.027,.25,.018),.035,1.15,-.178,
      new THREE.MeshStandardMaterial({color:0x3a3830,roughness:.8}));
    groove.rotation.z=-.45;
  }
  if (type === "Q") {
    for(let i=0;i<8;i++) {
      const angle=i*Math.PI/4;
      const prong=add(new THREE.ConeGeometry(.055,.23,16),Math.cos(angle)*.23,1.35,Math.sin(angle)*.23);
      prong.rotation.z=-Math.cos(angle)*.35;
      prong.rotation.x=Math.sin(angle)*.35;
      add(new THREE.SphereGeometry(.046,16,12),Math.cos(angle)*.265,1.46,Math.sin(angle)*.265);
    }
    add(new THREE.SphereGeometry(.075,24,16),0,1.39);
  }
  if(type === "K") {
    const cross=new THREE.Shape();
    cross.moveTo(-.045,0);cross.lineTo(.045,0);cross.lineTo(.045,.18);cross.lineTo(.17,.18);
    cross.lineTo(.17,.27);cross.lineTo(.045,.27);cross.lineTo(.045,.40);cross.lineTo(-.045,.40);
    cross.lineTo(-.045,.27);cross.lineTo(-.17,.27);cross.lineTo(-.17,.18);cross.lineTo(-.045,.18);cross.closePath();
    add(new THREE.ExtrudeGeometry(cross,{depth:.07,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:3,steps:1}),0,1.26,-.035);
  }
  if(type === "N") {
    // Beveled horse profile with a swept neck, muzzle, mane and ears.
    const horse=new THREE.Shape();
    horse.moveTo(-.20,.43);horse.bezierCurveTo(-.28,.65,-.27,.95,-.13,1.19);
    horse.lineTo(-.18,1.48);horse.lineTo(-.045,1.40);horse.lineTo(.045,1.47);
    horse.lineTo(.13,1.28);horse.bezierCurveTo(.22,1.25,.29,1.13,.39,1.04);
    horse.lineTo(.34,.91);horse.lineTo(.15,.92);horse.lineTo(.05,1.01);
    horse.bezierCurveTo(-.04,.86,.16,.66,.23,.44);horse.closePath();
    const head=add(new THREE.ExtrudeGeometry(horse,{depth:.19,bevelEnabled:true,bevelSegments:4,bevelSize:.045,bevelThickness:.045,curveSegments:24,steps:1}));
    head.rotation.y=Math.PI/2;head.position.x=-.095;
    const eyeMaterial=new THREE.MeshStandardMaterial({color:material.color.getHex()===0xf4ead4?0x38332b:0xaaa69b,roughness:.3});
    for(const side of [-1,1]) add(new THREE.SphereGeometry(.026,16,12),side*.145,1.23,-.09,eyeMaterial);
  }
  root.scale.setScalar(.82);
  return root;
}

// Broad studio softboxes create continuous highlights on both ivory and ebony.
function studioEnvironment(renderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x6e7780);
  const panel = (color,intensity,x,y,z,w,h) => {
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));
    mesh.position.set(x,y,z);mesh.lookAt(0,0,0);studio.add(mesh);
  };
  panel(0xfff2da,5,-4,6,3,5,7);
  panel(0xddeaff,4,5,3,-3,3,6);
  panel(0xffffff,2,0,8,0,6,4);
  const generator=new THREE.PMREMGenerator(renderer);
  const environment=generator.fromScene(studio,.08);
  generator.dispose();
  studio.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
  return environment;
}

function walnutTexture() {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=512;
  const ctx=canvas.getContext("2d");
  const pixels=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++) {
    const grain=Math.sin(y*.24+Math.sin(x*.012)*2)+.4*Math.sin(y*1.5+x*.015);
    const n=grain*5;const k=(y*512+x)*4;
    pixels.data[k]=69+n;pixels.data[k+1]=46+n*.7;pixels.data[k+2]=32+n*.4;pixels.data[k+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=8;
  return texture;
}

function squarePosition(index) {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  return { x: col - HALF, z: row - HALF };
}

function disposeChildren(group) {
  group.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
  group.clear();
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
  });
  object.parent?.remove(object);
}

function easeInOutCubic(value) {
  return value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export class ChessBoard3D {
  constructor({ canvas, host, loading, onSquareClick }) {
    this.canvas = canvas;
    this.host = host;
    this.loading = loading;
    this.onSquareClick = onSquareClick;
    this.available = webglAvailable();
    this.themeId = "deepblue1997";
    this.theme = THEMES[this.themeId];
    this.squares = [];
    this.pieceRoot = new THREE.Group();
    this.effectRoot = new THREE.Group();
    this.pieceMeshes = new Map();
    this.pieceAnimations = new Map();
    this.pointerStart = null;
    this.flipped = false;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!this.available) {
      host.classList.add("is-unavailable");
      loading.innerHTML = "<strong>3D unavailable.</strong><span>Using the accessible 2D board.</span>";
      return;
    }

    this.initScene();
    this.bindInput();
    const syncInteraction = () => {
      if (!this.available) return;
      const workspace = this.host.closest("[data-creation-app]");
      const expanded = document.fullscreenElement === workspace || workspace?.classList.contains("creation-app-expanded");
      this.controls.enableZoom = Boolean(expanded);
      this.canvas.style.touchAction = expanded ? "none" : "pan-y";
    };
    document.addEventListener("fullscreenchange", syncInteraction);
    document.addEventListener("creation-app-resize", syncInteraction);
    syncInteraction();
    requestAnimationFrame(() => {
      loading.hidden = true;
      host.classList.add("is-ready");
      this.resize();
    });
  }

  initScene() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.theme.world);
    this.scene.environment = studioEnvironment(this.renderer).texture;
    this.scene.environmentIntensity = .65;
    this.camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
    this.camera.position.set(4.4, 13.8, 17.6);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, .2, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .065;
    this.controls.enablePan = false;
    this.controls.minZoom = .65;
    this.controls.maxZoom = 1.7;
    this.controls.minDistance = 7.5;
    this.controls.maxDistance = 30;
    this.controls.minPolarAngle = .08;
    this.controls.maxPolarAngle = 1.24;

    this.scene.add(new THREE.HemisphereLight(0xfff1d2, 0x606a7b, .65));
    this.keyLight = new THREE.DirectionalLight(0xffeedb, 2.2);
    this.keyLight.position.set(-5, 11, 7);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = this.keyLight.shadow.camera.bottom = -7;
    this.keyLight.shadow.camera.right = this.keyLight.shadow.camera.top = 7;
    this.keyLight.shadow.normalBias = .025;
    this.keyLight.shadow.bias = -.00015;
    this.keyLight.shadow.radius = 4;
    this.scene.add(this.keyLight);
    const fillLight = new THREE.DirectionalLight(0xd9e9ff, 1.2);
    fillLight.position.set(3, 7, -6);
    this.scene.add(fillLight);
    this.rimLight = new THREE.PointLight(this.theme.accent, 18, 24, 2);
    this.rimLight.position.set(5, 5, -5);
    this.scene.add(this.rimLight);

    this.boardRoot = new THREE.Group();
    const plinthMat = new THREE.MeshStandardMaterial({ map: walnutTexture(), roughness: .32, metalness: 0 });
    this.plinthMaterial = plinthMat;
    this.trimMaterial = new THREE.MeshStandardMaterial({ color: this.theme.accent, roughness: .35, metalness: .65 });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(8.84, .035, 8.84), this.trimMaterial);
    trim.position.y = -.24;
    trim.castShadow = true;
    this.boardRoot.add(trim);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(8.95, .28, 8.95), plinthMat);
    plinth.position.y = -.10;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    this.boardRoot.add(plinth);

    // Coordinates are part of the board, so they orbit and flip with the table.
    for (let i = 0; i < 8; i += 1) {
      for (const [label, x, z] of [["abcdefgh"[i], i - HALF, 4.22], [String(8 - i), -4.22, i - HALF]]) {
        const stamp = document.createElement("canvas");
        stamp.width = stamp.height = 128;
        const context = stamp.getContext("2d");
        context.font = "600 86px sans-serif";
        context.fillStyle = "#eee7d0";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(label, 64, 64);
        const texture = new THREE.CanvasTexture(stamp);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
        const marker = new THREE.Mesh(new THREE.PlaneGeometry(.23, .23), material);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(x, .048, z);
        this.boardRoot.add(marker);
      }
    }


    const squareGeometry = new THREE.BoxGeometry(.985, .16, .985);
    for (let index = 0; index < 64; index += 1) {
      const { x, z } = squarePosition(index);
      const row = Math.floor(index / 8);
      const col = index % 8;
      const material = new THREE.MeshStandardMaterial({
        color: (row + col) % 2 === 0 ? this.theme.light : this.theme.dark,
        roughness: .32,
        metalness: .03,
        emissive: 0x000000
      });
      const square = new THREE.Mesh(squareGeometry, material);
      square.position.set(x, 0, z);
      square.receiveShadow = true;
      square.userData.squareIndex = index;
      this.squares.push(square);
      this.boardRoot.add(square);
    }

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x061510, roughness: .94, metalness: 0, envMapIntensity: .12 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.54;
    floor.receiveShadow = true;
    this.scene.add(floor, this.boardRoot, this.pieceRoot, this.effectRoot);

    this.whiteMaterial = new THREE.MeshPhysicalMaterial({ color: this.theme.white, roughness: .25, metalness: 0, clearcoat: .65, clearcoatRoughness: .24, envMapIntensity: .8 });
    this.blackMaterial = new THREE.MeshPhysicalMaterial({ color: this.theme.black, roughness: .28, metalness: .02, clearcoat: .8, clearcoatRoughness: .20, envMapIntensity: 1.2 });

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.loop = window.SimKit.loop(this.animate);
  }

  bindInput() {
    this.canvas.addEventListener("pointerdown", (event) => {
      this.pointerStart = { x: event.clientX, y: event.clientY };
    });
    this.canvas.addEventListener("pointerup", (event) => {
      if (!this.pointerStart) return;
      const travel = Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y);
      this.pointerStart = null;
      if (travel > 6) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects([...this.squares, ...this.pieceRoot.children], true)[0];
      let object = hit && hit.object;
      while (object && object.userData.squareIndex == null) object = object.parent;
      if (object && object.userData.squareIndex != null) this.onSquareClick(object.userData.squareIndex);
    });
  }

  setTheme(themeId) {
    const normalized = themeId === "turochamp1951" ? themeId : themeId === "modern2020s" ? themeId : "deepblue1997";
    if (normalized === this.themeId || !this.available) return;
    this.themeId = normalized;
    this.theme = THEMES[normalized];
    this.scene.background.set(this.theme.world);
    this.scene.fog.color.set(this.theme.fog);
    this.plinthMaterial.color.set(0xffffff);
    this.trimMaterial.color.set(this.theme.accent);
    this.rimLight.color.set(this.theme.accent);
    this.whiteMaterial.color.set(this.theme.white);
    this.blackMaterial.color.set(this.theme.black);
  }

  createPiece(piece, index, startIndex = index) {
    const model = lathePiece(piece[1], piece[0] === "W" ? this.whiteMaterial : this.blackMaterial);
    const start = squarePosition(startIndex);
    model.position.set(start.x, .1, start.z);
    model.userData.piece = piece;
    model.userData.squareIndex = index;
    model.traverse((child) => { child.userData.squareIndex = index; });
    if (piece[1] === "N") model.rotation.y = piece[0] === "W" ? -.42 : Math.PI - .42;
    this.pieceRoot.add(model);
    this.pieceMeshes.set(index, model);
    return model;
  }

  removePiece(index, animate = false) {
    const model = this.pieceMeshes.get(index);
    if (!model) return;
    this.pieceMeshes.delete(index);
    if (animate && !this.reduceMotion) {
      this.pieceAnimations.set(model, { kind: "capture", startedAt: performance.now(), duration: 180 });
      return;
    }
    this.pieceAnimations.delete(model);
    disposeObject(model);
  }

  syncPieces(position) {
    const move = position.lastMove;
    if (move && this.pieceMeshes.has(move.from) && position.board[move.to]) {
      this.removePiece(move.to, true);
      let model = this.pieceMeshes.get(move.from);
      const nextPiece = position.board[move.to];
      this.pieceMeshes.delete(move.from);

      if (model.userData.piece !== nextPiece) {
        disposeObject(model);
        model = this.createPiece(nextPiece, move.to, move.from);
      } else {
        model.userData.squareIndex = move.to;
        model.traverse((child) => { child.userData.squareIndex = move.to; });
        this.pieceMeshes.set(move.to, model);
      }

      const from = squarePosition(move.from);
      const to = squarePosition(move.to);
      model.position.set(from.x, .1, from.z);
      this.pieceAnimations.set(model, { kind: "move", from, to, startedAt: performance.now(), duration: this.reduceMotion ? 0 : 360 });
    }

    for (const [index, model] of [...this.pieceMeshes]) {
      if (!position.board[index] || position.board[index] !== model.userData.piece) this.removePiece(index);
    }

    position.board.forEach((piece, index) => {
      if (!piece || this.pieceMeshes.has(index)) return;
      this.createPiece(piece, index);
    });
  }

  render(position) {
    if (!this.available) return;
    this.currentSelected = position.selected;
    this.setTheme(position.theme);
    disposeChildren(this.effectRoot);
    const checkSquare = position.checkSquare;

    this.squares.forEach((square, index) => {
      const row = Math.floor(index / 8);
      const col = index % 8;
      const baseColor = (row + col) % 2 === 0 ? this.theme.light : this.theme.dark;
      square.material.color.set(baseColor);
      square.material.emissive.set(0x000000);
      square.material.emissiveIntensity = 0;
      square.position.y = 0;
      if (position.heatmap[index] > .08) {
        square.material.emissive.set(this.theme.danger);
        square.material.emissiveIntensity = position.heatmap[index] * .42;
      }
      if (position.lastMove && (position.lastMove.from === index || position.lastMove.to === index)) {
        square.material.emissive.set(this.theme.accent);
        square.material.emissiveIntensity = .36;
      }
      if (position.targets.includes(index)) {
        square.material.emissive.set(0x66ff9b);
        square.material.emissiveIntensity = .72;
        square.position.y = .055;
      }
      if (position.selected === index) {
        square.material.emissive.set(this.theme.accent);
        square.material.emissiveIntensity = 1;
        square.position.y = .085;
      }
      if (checkSquare === index) {
        square.material.emissive.set(0xff203f);
        square.material.emissiveIntensity = 1.25;
      }
    });

    this.syncPieces(position);

    position.previews.slice(0, 3).forEach((entry, previewIndex) => {
      const start = squarePosition(entry.move.from);
      const end = squarePosition(entry.move.to);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(start.x, .32, start.z),
        new THREE.Vector3((start.x + end.x) / 2, 1.35 + previewIndex * .15, (start.z + end.z) / 2),
        new THREE.Vector3(end.x, .32, end.z)
      );
      const line = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, previewIndex === 0 ? .045 : .026, 8, false),
        new THREE.MeshBasicMaterial({ color: this.theme.accent, transparent: true, opacity: previewIndex === 0 ? .9 : .42 })
      );
      this.effectRoot.add(line);
    });
  }

  resize() {
    if (!this.available) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(16)) / this.camera.aspect));
    this.camera.updateProjectionMatrix();
  }

  home() {
    if (!this.available) return;
    this.flipped = false;
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.moveCameraTo(new THREE.Vector3(4.4, 13.8, 17.6));
  }

  overhead() {
    if (!this.available) return;
    this.flipped = false;
    this.moveCameraTo(new THREE.Vector3(0, 22, 2.7));
  }

  flip() {
    if (!this.available) return;
    this.flipped = !this.flipped;
    this.moveCameraTo(new THREE.Vector3(this.flipped ? -4.4 : 4.4, 13.8, this.flipped ? -17.6 : 17.6));
  }

  moveCameraTo(destination) {
    this.cameraTween = {
      from: this.camera.position.clone(),
      to: destination,
      startedAt: performance.now(),
      duration: this.reduceMotion ? 0 : 520
    };
    this.controls.enabled = false;
  }

  animate = () => {
    if (!this.available) return;

    const time = this.clock.getElapsedTime();
    const now = performance.now();

    if (this.cameraTween) {
      const progress = Math.min(1, (now - this.cameraTween.startedAt) / Math.max(1, this.cameraTween.duration));
      this.camera.position.lerpVectors(this.cameraTween.from, this.cameraTween.to, easeInOutCubic(progress));
      this.camera.lookAt(this.controls.target);
      if (progress >= 1) {
        this.cameraTween = null;
        this.controls.enabled = true;
        this.controls.update();
      }
    } else {
      this.controls.update();
    }

    [...this.pieceRoot.children].forEach((piece) => {
      const movement = this.pieceAnimations.get(piece);
      if (movement) {
        const progress = Math.min(1, (now - movement.startedAt) / Math.max(1, movement.duration));
        const eased = easeInOutCubic(progress);
        if (movement.kind === "capture") {
          piece.scale.setScalar(.82 * (1 - eased));
          piece.position.y = .1 - eased * .12;
          if (progress >= 1) {
            this.pieceAnimations.delete(piece);
            disposeObject(piece);
          }
          return;
        }
        piece.position.x = THREE.MathUtils.lerp(movement.from.x, movement.to.x, eased);
        piece.position.z = THREE.MathUtils.lerp(movement.from.z, movement.to.z, eased);
        piece.position.y = .1 + Math.sin(progress * Math.PI) * .34;
        if (progress >= 1) {
          piece.position.set(movement.to.x, .1, movement.to.z);
          this.pieceAnimations.delete(piece);
        }
        return;
      }
      const selected = piece.userData.squareIndex === this.currentSelected;
      piece.position.y = .1 + (selected ? .08 + Math.sin(time * 4) * .025 : 0);
    });
    this.renderer.render(this.scene, this.camera);
  };
}
