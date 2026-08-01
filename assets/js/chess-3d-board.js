import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const BOARD_SIZE = 8;
const HALF = (BOARD_SIZE - 1) / 2;

const THEMES = {
  turochamp1951: {
    world: 0x170f0a, fog: 0x170f0a, light: 0xe8dcc0, dark: 0x70472c,
    edge: 0x4a2c1d, white: 0xf3e8ce, black: 0x2b1a12, accent: 0xc5a45d, danger: 0x7c2636
  },
  deepblue1997: {
    world: 0x071a16, fog: 0x071a16, light: 0xe6dcc5, dark: 0x315747,
    edge: 0x422a1c, white: 0xf4ead4, black: 0x172c26, accent: 0xc7a55b, danger: 0x7f2938
  },
  modern2020s: {
    world: 0x081c18, fog: 0x081c18, light: 0xeee6d3, dark: 0x244c40,
    edge: 0x3c271b, white: 0xf7eedb, black: 0x142a24, accent: 0xd0ae62, danger: 0x8a2e40
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

function profileForPiece(type) {
  switch (type) {
    case "P": return [[0, 0], [.34, 0], [.39, .12], [.3, .2], [.21, .54], [.3, .62], [.29, .75], [.18, .82], [.22, .96], [0, 1.02]];
    case "R": return [[0, 0], [.42, 0], [.46, .12], [.34, .2], [.29, .72], [.39, .79], [.42, .98], [.3, 1.05], [0, 1.05]];
    case "B": return [[0, 0], [.41, 0], [.45, .12], [.32, .2], [.21, .62], [.31, .73], [.25, .88], [.16, 1.12], [0, 1.22]];
    case "Q": return [[0, 0], [.45, 0], [.48, .12], [.34, .2], [.25, .78], [.36, .89], [.3, 1.05], [.4, 1.2], [.24, 1.34], [0, 1.39]];
    case "K": return [[0, 0], [.46, 0], [.49, .12], [.35, .2], [.26, .78], [.36, .9], [.3, 1.1], [.26, 1.24], [0, 1.3]];
    default: return [[0, 0], [.42, 0], [.46, .12], [.32, .2], [.22, .72], [.3, .82], [0, .9]];
  }
}

function lathePiece(type, material) {
  const points = profileForPiece(type).map(([x, y]) => new THREE.Vector2(x, y));
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.LatheGeometry(points, 28), material);
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  if (type === "P") {
    const head = new THREE.Mesh(new THREE.SphereGeometry(.23, 22, 16), material);
    head.position.y = 1.02;
    head.castShadow = true;
    root.add(head);
  } else if (type === "R") {
    for (let i = 0; i < 4; i += 1) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(.2, .19, .2), material);
      const angle = i * Math.PI / 2 + Math.PI / 4;
      merlon.position.set(Math.cos(angle) * .25, 1.12, Math.sin(angle) * .25);
      merlon.rotation.y = -angle;
      merlon.castShadow = true;
      root.add(merlon);
    }
  } else if (type === "B") {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 14), material);
    crown.scale.y = 1.35;
    crown.position.y = 1.2;
    crown.castShadow = true;
    root.add(crown);
  } else if (type === "Q") {
    for (let i = 0; i < 6; i += 1) {
      const jewel = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 8), material);
      const angle = i * Math.PI / 3;
      jewel.position.set(Math.cos(angle) * .3, 1.4, Math.sin(angle) * .3);
      jewel.castShadow = true;
      root.add(jewel);
    }
  } else if (type === "K") {
    const vertical = new THREE.Mesh(new THREE.BoxGeometry(.09, .42, .09), material);
    const horizontal = new THREE.Mesh(new THREE.BoxGeometry(.3, .09, .09), material);
    vertical.position.y = 1.48;
    horizontal.position.y = 1.5;
    vertical.castShadow = horizontal.castShadow = true;
    root.add(vertical, horizontal);
  } else if (type === "N") {
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .55, 6, 12), material);
    neck.position.set(0, 1.02, .06);
    neck.rotation.z = -.2;
    neck.castShadow = true;
    const muzzle = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .32, 5, 10), material);
    muzzle.rotation.x = Math.PI / 2.25;
    muzzle.position.set(0, 1.34, -.16);
    muzzle.castShadow = true;
    const ears = [-1, 1].map((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.075, .25, 8), material);
      ear.position.set(side * .11, 1.58, .02);
      ear.rotation.z = side * -.12;
      ear.castShadow = true;
      return ear;
    });
    root.add(neck, muzzle, ...ears);
  }

  root.scale.setScalar(.72);
  return root;
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
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.theme.world);
    this.scene.fog = new THREE.FogExp2(this.theme.fog, .022);
    this.camera = new THREE.PerspectiveCamera(39, 1, .1, 80);
    this.camera.position.set(0, 8.4, 10.2);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, .35, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .065;
    this.controls.enablePan = false;
    this.controls.minDistance = 7.5;
    this.controls.maxDistance = 17;
    this.controls.minPolarAngle = .48;
    this.controls.maxPolarAngle = 1.24;

    this.scene.add(new THREE.HemisphereLight(0xfff1d2, 0x07130f, 1.45));
    this.keyLight = new THREE.DirectionalLight(0xffe9c2, 3.2);
    this.keyLight.position.set(-5, 11, 7);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = this.keyLight.shadow.camera.bottom = -7;
    this.keyLight.shadow.camera.right = this.keyLight.shadow.camera.top = 7;
    this.scene.add(this.keyLight);
    this.rimLight = new THREE.PointLight(this.theme.accent, 18, 24, 2);
    this.rimLight.position.set(5, 5, -5);
    this.scene.add(this.rimLight);

    this.boardRoot = new THREE.Group();
    const plinthMat = new THREE.MeshStandardMaterial({ color: this.theme.edge, roughness: .38, metalness: .14 });
    this.plinthMaterial = plinthMat;
    this.trimMaterial = new THREE.MeshStandardMaterial({ color: this.theme.accent, roughness: .26, metalness: .72 });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(9.32, .12, 9.32), this.trimMaterial);
    trim.position.y = -.16;
    trim.castShadow = true;
    this.boardRoot.add(trim);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(9.15, .42, 9.15), plinthMat);
    plinth.position.y = -.31;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    this.boardRoot.add(plinth);

    const squareGeometry = new THREE.BoxGeometry(.985, .16, .985);
    for (let index = 0; index < 64; index += 1) {
      const { x, z } = squarePosition(index);
      const row = Math.floor(index / 8);
      const col = index % 8;
      const material = new THREE.MeshStandardMaterial({
        color: (row + col) % 2 === 0 ? this.theme.light : this.theme.dark,
        roughness: .66,
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
      new THREE.CircleGeometry(15, 72),
      new THREE.MeshStandardMaterial({ color: 0x061510, roughness: .94, metalness: .04 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.54;
    floor.receiveShadow = true;
    this.scene.add(floor, this.boardRoot, this.pieceRoot, this.effectRoot);

    this.whiteMaterial = new THREE.MeshPhysicalMaterial({ color: this.theme.white, roughness: .2, metalness: .3, clearcoat: .75, clearcoatRoughness: .18 });
    this.blackMaterial = new THREE.MeshPhysicalMaterial({ color: this.theme.black, roughness: .24, metalness: .52, clearcoat: .62, clearcoatRoughness: .22 });

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.animate();
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
    this.plinthMaterial.color.set(this.theme.edge);
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
    if (piece[1] === "N") model.rotation.y = piece[0] === "W" ? 0 : Math.PI;
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
    this.camera.updateProjectionMatrix();
  }

  home() {
    if (!this.available) return;
    this.flipped = false;
    this.moveCameraTo(new THREE.Vector3(0, 8.4, 10.2));
  }

  flip() {
    if (!this.available) return;
    this.flipped = !this.flipped;
    this.moveCameraTo(new THREE.Vector3(0, 8.4, this.flipped ? -10.2 : 10.2));
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
    requestAnimationFrame(this.animate);
    const time = this.clock.getElapsedTime();
    const now = performance.now();

    if (this.cameraTween) {
      const progress = Math.min(1, (now - this.cameraTween.startedAt) / this.cameraTween.duration);
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
        const progress = Math.min(1, (now - movement.startedAt) / movement.duration);
        const eased = easeInOutCubic(progress);
        if (movement.kind === "capture") {
          piece.scale.setScalar(.72 * (1 - eased));
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
