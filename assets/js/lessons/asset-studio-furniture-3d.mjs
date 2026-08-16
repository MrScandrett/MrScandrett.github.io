import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

const root = document.querySelector('[data-furniture-engine]');

if (root) {
  const q = selector => root.querySelector(selector);
  const qa = selector => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const challenges = {
    chair: {
      name: 'ARCADE_CHAIR_A', mission: 'Add the seat, two leg pairs, and back.',
      defaults: { width: 48, depth: 48, height: 45 },
      ranges: { width: [30, 75], depth: [25, 70], height: [25, 70] },
      target: { width: [42, 56], depth: [40, 58], height: [40, 50] },
      parts: [['seat', 'Seat'], ['front', 'Front legs'], ['rear', 'Rear legs'], ['back', 'Back']]
    },
    table: {
      name: 'SIDE_TABLE_A', mission: 'Add the top, both leg pairs, and a support apron.',
      defaults: { width: 68, depth: 52, height: 54 },
      ranges: { width: [40, 120], depth: [30, 90], height: [35, 90] },
      target: { width: [45, 90], depth: [40, 70], height: [42, 65] },
      parts: [['top', 'Table top'], ['front', 'Front legs'], ['rear', 'Rear legs'], ['apron', 'Support apron']]
    },
    shelf: {
      name: 'MEDIA_SHELF_A', mission: 'Build two sides, three shelves, and a stabilizing back.',
      defaults: { width: 82, depth: 34, height: 128 },
      ranges: { width: [45, 130], depth: [20, 65], height: [70, 180] },
      target: { width: [60, 105], depth: [25, 45], height: [95, 160] },
      parts: [['left', 'Left side'], ['right', 'Right side'], ['shelves', '3 shelves'], ['back', 'Back panel']]
    }
  };
  const surfaces = {
    plywood: { base: '#a86639', dark: '#57351f', light: '#d6a06d', metalness: 0.02 },
    plastic: { base: '#3158c7', dark: '#14285f', light: '#6a91ff', metalness: 0.05 },
    steel: { base: '#788393', dark: '#323947', light: '#c5ced6', metalness: 0.72 },
    fabric: { base: '#873f8e', dark: '#3c204f', light: '#c77ac8', metalness: 0.0 }
  };
  const state = {
    challenge: 'chair', added: new Set(), width: 48, depth: 48, height: 45,
    material: 'plywood', scale: 4, wear: 18, roughness: 62
  };

  const canvas = q('#furniture3dCanvas');
  let sceneApi = null;
  let model = null;
  let material = null;
  let controls = null;
  let texture = null;
  let seeker = null;
  let playerMarker = null;
  const coverSpots = [];
  const heldKeys = new Set();
  const hunt = { active: false, alert: 0, time: 30, elapsed: 0, moving: false };

  function textureCanvas() {
    const source = document.createElement('canvas');
    source.width = source.height = 128;
    const ctx = source.getContext('2d');
    const palette = surfaces[state.material];
    ctx.fillStyle = palette.base;
    ctx.fillRect(0, 0, 128, 128);
    const lines = Math.max(3, state.scale * 2);
    ctx.globalAlpha = .52;
    if (state.material === 'plywood') {
      for (let i = 0; i < lines; i += 1) {
        const y = (i / lines) * 128;
        ctx.strokeStyle = i % 3 ? palette.dark : palette.light;
        ctx.lineWidth = i % 3 ? 2 : 1;
        ctx.beginPath();
        for (let x = 0; x <= 128; x += 4) {
          const wave = Math.sin(x * .11 + i * 1.7) * (2 + state.scale * .22);
          x ? ctx.lineTo(x, y + wave) : ctx.moveTo(x, y + wave);
        }
        ctx.stroke();
      }
    } else if (state.material === 'fabric') {
      ctx.strokeStyle = palette.light;
      ctx.lineWidth = 1;
      const step = Math.max(4, 13 - state.scale);
      for (let n = -128; n < 256; n += step) {
        ctx.beginPath(); ctx.moveTo(n, 0); ctx.lineTo(n + 128, 128); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(n, 128); ctx.lineTo(n + 128, 0); ctx.stroke();
      }
    } else {
      const step = Math.max(7, 19 - state.scale);
      ctx.strokeStyle = state.material === 'steel' ? palette.light : palette.dark;
      ctx.lineWidth = 1;
      for (let y = 0; y < 128; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
    }
    ctx.globalAlpha = clamp(state.wear / 100, 0, .72);
    ctx.fillStyle = '#e8d3ad';
    const marks = Math.round(state.wear * .8);
    for (let i = 0; i < marks; i += 1) {
      const x = (i * 47 + 13) % 128, y = (i * 83 + 29) % 128;
      ctx.fillRect(x, y, 1 + (i % 4), 1 + ((i * 3) % 3));
    }
    ctx.globalAlpha = 1;
    return source;
  }

  function refreshMaterial() {
    if (!material) return;
    if (texture) texture.dispose();
    texture = new THREE.CanvasTexture(textureCanvas());
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.5, 2.5);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    const palette = surfaces[state.material];
    material.map = texture;
    material.roughness = state.roughness / 100;
    material.metalness = palette.metalness;
    material.needsUpdate = true;
  }

  function addBox(parent, size, position, rotation = null) {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2], 1, 1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    parent.add(mesh);
    return mesh;
  }

  function clearModel() {
    if (!model) return;
    model.traverse(child => { if (child.geometry) child.geometry.dispose(); });
    sceneApi.scene.remove(model);
  }

  function rebuildModel() {
    updateUi();
    if (!sceneApi || !material) return;
    clearModel();
    model = new THREE.Group();
    model.rotation.y = -.18;
    const w = state.width / 50;
    const d = state.depth / 50;
    const h = state.height / 50;
    const thick = clamp(Math.min(w, d) * .09, .07, .14);
    const leg = clamp(Math.min(w, d) * .075, .055, .11);
    const has = key => state.added.has(key);
    if (state.challenge === 'chair') {
      if (has('seat')) addBox(model, [w, thick, d], [0, h, 0]);
      const pair = z => { for (const x of [-w * .39, w * .39]) addBox(model, [leg, h, leg], [x, h / 2, z]); };
      if (has('front')) pair(d * .38);
      if (has('rear')) pair(-d * .38);
      if (has('back')) {
        for (const x of [-w * .39, w * .39]) addBox(model, [leg, h * .95, leg], [x, h * 1.46, -d * .39]);
        addBox(model, [w * .84, h * .43, thick], [0, h * 1.62, -d * .39]);
      }
    } else if (state.challenge === 'table') {
      if (has('top')) addBox(model, [w, thick * 1.15, d], [0, h, 0]);
      const pair = z => { for (const x of [-w * .41, w * .41]) addBox(model, [leg, h, leg], [x, h / 2, z]); };
      if (has('front')) pair(d * .39);
      if (has('rear')) pair(-d * .39);
      if (has('apron')) {
        addBox(model, [w * .83, thick * 1.3, leg], [0, h - thick * 1.15, d * .39]);
        addBox(model, [w * .83, thick * 1.3, leg], [0, h - thick * 1.15, -d * .39]);
      }
    } else {
      const side = clamp(w * .075, .08, .14);
      if (has('left')) addBox(model, [side, h, d], [-w / 2 + side / 2, h / 2, 0]);
      if (has('right')) addBox(model, [side, h, d], [w / 2 - side / 2, h / 2, 0]);
      if (has('shelves')) for (const y of [thick / 2, h * .48, h - thick / 2]) addBox(model, [w - side * 2, thick, d], [0, y, 0]);
      if (has('back')) addBox(model, [w - side * 2, h - thick * 2, thick * .55], [0, h / 2, -d / 2 + thick * .28]);
    }
    sceneApi.scene.add(model);
    updatePolyCount();
  }

  function makeRoomProp(parent, size, position, color = 0x765036) {
    const prop = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      new THREE.MeshStandardMaterial({ color, roughness: .82, flatShading: true })
    );
    prop.position.set(position[0], position[1], position[2]);
    parent.add(prop);
    return prop;
  }

  function createPropHuntRoom(scene) {
    const room = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x182240, roughness: .92, flatShading: true });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 3.4, .18), wallMat); backWall.position.set(0, 1.7, -4.8); room.add(backWall);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(.18, 3.4, 9.5), wallMat); leftWall.position.set(-5, 1.7, 0); room.add(leftWall);
    const rightWall = leftWall.clone(); rightWall.position.x = 5; room.add(rightWall);
    // Preset clutter creates readable hiding neighborhoods: dining, storage, and arcade lounge.
    makeRoomProp(room, [2.3,.16,1.25], [-2.9,1.05,-2.7]);
    for (const x of [-3.8,-2.05]) for (const z of [-3.08,-2.3]) makeRoomProp(room,[.12,1,.12],[x,.5,z],0x654127);
    makeRoomProp(room,[1.6,.72,.72],[3.25,.36,-3.25],0x70407d);
    makeRoomProp(room,[.7,1.25,.7],[4.1,.625,-2.7],0x283f91);
    makeRoomProp(room,[1.8,2.35,.42],[-3.75,1.175,2.65],0x805533);
    for (const y of [.12,1.12,2.2]) makeRoomProp(room,[1.7,.1,.6],[-3.75,y,2.55],0x9a673b);
    makeRoomProp(room,[1.15,.8,1.05],[3.7,.4,2.45],0x8b633d);
    makeRoomProp(room,[.85,.65,.85],[2.45,.325,3.2],0x685039);
    coverSpots.push(new THREE.Vector3(-2.9,0,-2.7),new THREE.Vector3(3.25,0,-3.25),new THREE.Vector3(-3.75,0,2.65),new THREE.Vector3(3.2,0,2.75));
    scene.add(room);

    seeker = new THREE.Group();
    const seekerMat = new THREE.MeshBasicMaterial({ color: 0xff5faf, wireframe: true });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.16,.22,.8,6),seekerMat); body.position.y=.72; seeker.add(body);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.17,1),seekerMat); head.position.y=1.28; seeker.add(head);
    const scanMat = new THREE.MeshBasicMaterial({ color:0xff4ea1, transparent:true, opacity:.1, side:THREE.DoubleSide, depthWrite:false });
    const scan = new THREE.Mesh(new THREE.ConeGeometry(1.7,3.8,12,1,true),scanMat); scan.rotation.x=Math.PI/2; scan.position.z=1.9; seeker.add(scan);
    scene.add(seeker);
  }

  function huntMessage(message, grade = null) {
    q('[data-furniture-report]').innerHTML = message;
    if (grade) q('[data-furniture-grade]').textContent = grade;
  }

  function stopHunt(result = 'exit') {
    if (!hunt.active) return;
    hunt.active = false;
    root.classList.remove('is-hunting');
    q('[data-prop-hunt-hud]').hidden = true;
    q('[data-prop-hunt-pad]').hidden = true;
    q('[data-prop-hunt-start]').textContent = 'Possess prop // test room';
    q('[data-viewport-help]').innerHTML = 'DRAG: ORBIT&nbsp;&nbsp; WHEEL: ZOOM&nbsp;&nbsp; R: RESET VIEW';
    heldKeys.clear();
    if (model) { model.position.set(0,0,0); model.rotation.y = -.18; }
    if (seeker) seeker.visible = false;
    if (playerMarker) playerMarker.visible = false;
    if (controls && sceneApi) {
      controls.enabled = true; controls.target.set(0,.8,0);
      sceneApi.camera.position.set(3.5,2.65,4.6); controls.update();
    }
    if (result === 'win') huntMessage('<strong>Prop hunt cleared.</strong> You stayed still, matched the room, and survived the full scan.', 'S');
    else if (result === 'caught') huntMessage('<strong>Disguise broken.</strong> Freeze outside the scan cone or park beside furniture with a matching surface.', 'X');
  }

  function toggleHunt() {
    if (hunt.active) { stopHunt('exit'); return; }
    const required = challenges[state.challenge].parts.map(([key]) => key);
    const missing = required.filter(key => !state.added.has(key));
    if (missing.length) {
      runCheck();
      huntMessage('<strong>Possession failed.</strong> Finish every assembly part before entering the test room.');
      return;
    }
    if (!sceneApi || !model || !seeker) {
      huntMessage('<strong>Prop Hunt needs WebGL.</strong> The rubric controls remain available on this device.');
      return;
    }
    hunt.active = true; hunt.alert = 0; hunt.time = 30; hunt.elapsed = 0;
    root.classList.add('is-hunting');
    q('[data-prop-hunt-hud]').hidden = false;
    q('[data-prop-hunt-pad]').hidden = false;
    q('[data-prop-hunt-start]').textContent = 'Exit prop hunt';
    q('[data-viewport-help]').textContent = 'WASD / ARROWS: MOVE   SHIFT: SPRINT   SPACE: FREEZE';
    q('[data-hunt-alert]').textContent = '0%'; q('[data-hunt-time]').textContent = '30'; q('[data-hunt-meter]').style.width = '0%';
    q('[data-furniture-grade]').textContent = 'H';
    q('[data-furniture-meter]').style.width = '0%';
    huntMessage('<strong>Scanner online.</strong> Blend near similar furniture and stop moving when the pink scan cone points at you.');
    model.position.set(0,0,2.05); model.rotation.y = Math.PI;
    seeker.visible = true;
    if (playerMarker) playerMarker.visible = true;
    controls.enabled = false;
    sceneApi.camera.position.set(0,7.2,8.4); sceneApi.camera.lookAt(0,.25,.35);
  }

  function updateHunt(dt) {
    if (!hunt.active || !model || !seeker) return;
    hunt.elapsed += dt; hunt.time = Math.max(0,30-hunt.elapsed);
    const dx = (heldKeys.has('d') || heldKeys.has('arrowright') ? 1 : 0) - (heldKeys.has('a') || heldKeys.has('arrowleft') ? 1 : 0);
    const dz = (heldKeys.has('s') || heldKeys.has('arrowdown') ? 1 : 0) - (heldKeys.has('w') || heldKeys.has('arrowup') ? 1 : 0);
    const freeze = heldKeys.has(' ');
    const speed = (heldKeys.has('shift') ? 2.25 : 1.35) * dt;
    hunt.moving = !freeze && (dx !== 0 || dz !== 0);
    if (hunt.moving) {
      const length = Math.hypot(dx,dz) || 1;
      model.position.x = clamp(model.position.x + dx/length*speed,-4.45,4.45);
      model.position.z = clamp(model.position.z + dz/length*speed,-4.25,4.25);
      model.rotation.y = Math.atan2(dx,dz);
    }
    if (playerMarker) playerMarker.position.set(model.position.x,.012,model.position.z);
    const t = hunt.elapsed * .48;
    seeker.position.set(Math.sin(t)*3.3,0,Math.sin(t*.63)*2.8);
    const forward = new THREE.Vector3(Math.cos(t),0,Math.cos(t*.63)*.63).normalize();
    seeker.rotation.y = Math.atan2(forward.x,forward.z);
    const towardProp = new THREE.Vector3().subVectors(model.position,seeker.position);
    const distance = towardProp.length(); towardProp.normalize();
    const inScan = distance < 4.5 && forward.dot(towardProp) > .48;
    const coverDistance = coverSpots.reduce((best,spot)=>Math.min(best,spot.distanceTo(model.position)),99);
    const coverBonus = coverDistance < 1.3 ? .48 : coverDistance < 2 ? .2 : 0;
    const materialBonus = state.material === 'plywood' ? .28 : state.material === 'fabric' ? .14 : 0;
    const exposure = Math.max(.18,1-coverBonus-materialBonus);
    const gain = inScan ? (hunt.moving ? 38 : 17)*exposure : -12;
    hunt.alert = clamp(hunt.alert + gain*dt,0,100);
    q('[data-hunt-alert]').textContent = `${Math.round(hunt.alert)}%`;
    q('[data-hunt-time]').textContent = Math.ceil(hunt.time);
    q('[data-hunt-meter]').style.width = `${hunt.alert}%`;
    q('[data-furniture-meter]').style.width = `${hunt.alert}%`;
    if (hunt.alert >= 100) stopHunt('caught');
    else if (hunt.time <= 0) stopHunt('win');
  }

  function updatePolyCount() {
    let tris = 0;
    if (model) model.traverse(child => {
      if (child.geometry) tris += child.geometry.index ? child.geometry.index.count / 3 : child.geometry.attributes.position.count / 3;
    });
    q('[data-furniture-polys]').textContent = `${Math.round(tris)} TRIS`;
  }

  function renderPartButtons() {
    const holder = q('[data-furniture-parts]');
    holder.replaceChildren();
    challenges[state.challenge].parts.forEach(([key, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.part = key;
      button.textContent = label;
      button.classList.toggle('is-added', state.added.has(key));
      button.setAttribute('aria-pressed', state.added.has(key));
      button.addEventListener('click', () => {
        state.added.has(key) ? state.added.delete(key) : state.added.add(key);
        rebuildModel();
      });
      holder.append(button);
    });
  }

  function updateUi() {
    const config = challenges[state.challenge];
    q('[data-furniture-name]').textContent = config.name;
    q('[data-furniture-mission]').textContent = config.mission;
    q('[data-furniture-progress]').textContent = `${state.added.size} / ${config.parts.length} PARTS`;
    qa('[data-part]').forEach(button => {
      const active = state.added.has(button.dataset.part);
      button.classList.toggle('is-added', active);
      button.setAttribute('aria-pressed', active);
    });
  }

  function resetBuild(keepChallenge = true) {
    const config = challenges[state.challenge];
    state.added.clear();
    Object.assign(state, config.defaults);
    ['width', 'depth', 'height'].forEach(key => {
      const input = q(`[data-furn-dimension="${key}"]`);
      input.min = config.ranges[key][0]; input.max = config.ranges[key][1]; input.value = state[key];
      q(`output[for="${input.id}"]`).textContent = state[key];
    });
    q('[data-furniture-grade]').textContent = '--';
    q('[data-furniture-meter]').style.width = '0%';
    q('[data-furniture-report]').innerHTML = '<strong>Build slot empty.</strong> Add the mission parts, set believable dimensions, then run the engine check.';
    renderPartButtons();
    rebuildModel();
  }

  function runCheck() {
    const config = challenges[state.challenge];
    const missing = config.parts.filter(([key]) => !state.added.has(key)).map(([, label]) => label.toLowerCase());
    const dimensions = ['width', 'depth', 'height'];
    const outOfRange = dimensions.filter(key => state[key] < config.target[key][0] || state[key] > config.target[key][1]);
    const surfaceProblems = [];
    if (state.wear > 58) surfaceProblems.push('wear is overpowering the base material');
    if (state.roughness < 18 || state.roughness > 88) surfaceProblems.push('roughness is too extreme for readable lighting');
    const assemblyScore = (config.parts.length - missing.length) / config.parts.length * 45;
    const dimensionScore = (dimensions.length - outOfRange.length) / dimensions.length * 35;
    const surfaceScore = (2 - surfaceProblems.length) / 2 * 20;
    const score = Math.round(assemblyScore + dimensionScore + surfaceScore);
    const grade = score >= 92 ? 'S' : score >= 78 ? 'A' : score >= 62 ? 'B' : score >= 45 ? 'C' : 'D';
    let message = '<strong>Engine check passed.</strong> The silhouette, scale, and surface read as a game-ready prop.';
    if (missing.length) message = `<strong>Assembly incomplete.</strong> Add ${missing.join(', ')}.`;
    else if (outOfRange.length) message = `<strong>Scale warning.</strong> Recheck ${outOfRange.join(', ')} against the brief.`;
    else if (surfaceProblems.length) message = `<strong>Material warning.</strong> ${surfaceProblems.join('; ')}.`;
    q('[data-furniture-grade]').textContent = grade;
    q('[data-furniture-meter]').style.width = `${score}%`;
    q('[data-furniture-report]').innerHTML = message;
  }

  qa('[data-furniture-challenge]').forEach(button => button.addEventListener('click', () => {
    state.challenge = button.dataset.furnitureChallenge;
    qa('[data-furniture-challenge]').forEach(item => item.classList.toggle('is-active', item === button));
    resetBuild();
  }));
  qa('[data-furn-dimension]').forEach(input => input.addEventListener('input', () => {
    const key = input.dataset.furnDimension;
    state[key] = Number(input.value);
    q(`output[for="${input.id}"]`).textContent = input.value;
    rebuildModel();
  }));
  qa('[data-furn-texture]').forEach(input => input.addEventListener('input', () => {
    const key = input.dataset.furnTexture;
    state[key] = Number(input.value);
    q(`output[for="${input.id}"]`).textContent = input.value;
    refreshMaterial();
  }));
  qa('[data-furn-material]').forEach(button => button.addEventListener('click', () => {
    state.material = button.dataset.furnMaterial;
    qa('[data-furn-material]').forEach(item => item.classList.toggle('is-active', item === button));
    refreshMaterial();
  }));
  q('[data-furniture-reset]').addEventListener('click', () => resetBuild());
  q('[data-furniture-test]').addEventListener('click', runCheck);
  q('[data-prop-hunt-start]').addEventListener('click', toggleHunt);
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (hunt.active && ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(key)) {
      event.preventDefault(); heldKeys.add(key);
    }
  });
  window.addEventListener('keyup', event => heldKeys.delete(event.key.toLowerCase()));
  qa('[data-hunt-key]').forEach(button => {
    const key = button.dataset.huntKey;
    button.addEventListener('pointerdown', event => { event.preventDefault(); heldKeys.add(key); button.setPointerCapture(event.pointerId); });
    button.addEventListener('pointerup', () => heldKeys.delete(key));
    button.addEventListener('pointercancel', () => heldKeys.delete(key));
  });

  const started = performance.now();
  const clock = q('[data-engine-clock]');
  window.setInterval(() => {
    const elapsed = Math.floor((performance.now() - started) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    clock.textContent = `SCENE 00:${minutes}:${seconds}`;
  }, 1000);

  function webglAvailable() {
    try {
      const probe = document.createElement('canvas');
      return Boolean(window.WebGLRenderingContext && (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
    } catch (_) { return false; }
  }

  if (webglAvailable()) {
    try {
      sceneApi = createScene(canvas, { THREE, fov: 38, near: .05, far: 60, maxDpr: 1, clearColor: 0x070b1b, antialias: false });
      const { renderer, scene, camera, syncSize } = sceneApi;
      renderer.setPixelRatio(.72);
      scene.fog = new THREE.Fog(0x070b1b, 5.5, 14);
      camera.position.set(3.5, 2.65, 4.6);
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = .08;
      controls.target.set(0, .8, 0);
      controls.minDistance = 2.3;
      controls.maxDistance = 8;
      controls.maxPolarAngle = Math.PI * .49;

      scene.add(new THREE.HemisphereLight(0x7fa2ff, 0x170b22, 2.15));
      const key = new THREE.DirectionalLight(0xffe4cf, 2.6); key.position.set(3, 6, 4); scene.add(key);
      const edge = new THREE.PointLight(0xbd4dff, 3.2, 8); edge.position.set(-3, 2.8, -2); scene.add(edge);

      const floorTextureCanvas = document.createElement('canvas');
      floorTextureCanvas.width = floorTextureCanvas.height = 64;
      const floorCtx = floorTextureCanvas.getContext('2d');
      floorCtx.fillStyle = '#101834'; floorCtx.fillRect(0, 0, 64, 64);
      floorCtx.fillStyle = '#182754'; floorCtx.fillRect(0, 0, 32, 32); floorCtx.fillRect(32, 32, 32, 32);
      floorCtx.strokeStyle = '#28469a'; floorCtx.strokeRect(.5, .5, 63, 63);
      const floorTexture = new THREE.CanvasTexture(floorTextureCanvas);
      floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; floorTexture.repeat.set(10, 10); floorTexture.magFilter = THREE.NearestFilter;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: floorTexture, roughness: .88, metalness: .05 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -.01; scene.add(floor);
      scene.add(new THREE.GridHelper(16, 24, 0x4e70d7, 0x24365f));
      createPropHuntRoom(scene);
      seeker.visible = false;
      playerMarker = new THREE.Mesh(
        new THREE.RingGeometry(.48,.54,24),
        new THREE.MeshBasicMaterial({ color:0x5fe6ff, transparent:true, opacity:.68, side:THREE.DoubleSide })
      );
      playerMarker.rotation.x = -Math.PI/2; playerMarker.visible = false; scene.add(playerMarker);

      const figure = new THREE.Group();
      const figureMat = new THREE.MeshBasicMaterial({ color: 0x63729f, wireframe: true, transparent: true, opacity: .52 });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(.13, .18, .75, 6), figureMat); torso.position.y = 1.12; figure.add(torso);
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.15, 1), figureMat); head.position.y = 1.68; figure.add(head);
      const limbs = [[-.11,.47,0,.1,.58,.08],[.11,.47,0,.1,.58,.08],[-.26,1.03,0,.08,.58,.07],[.26,1.03,0,.08,.58,.07]];
      limbs.forEach(([x,y,z,r,len]) => { const limb = new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,5),figureMat); limb.position.set(x,y,z); figure.add(limb); });
      figure.position.set(-1.5, 0, -.45); scene.add(figure);

      material = new THREE.MeshStandardMaterial({ roughness: .62, metalness: .02, flatShading: true });
      refreshMaterial();
      resetBuild();
      canvas.addEventListener('keydown', event => {
        if (event.key.toLowerCase() === 'r') {
          event.preventDefault(); camera.position.set(3.5, 2.65, 4.6); controls.target.set(0, .8, 0); controls.update();
        }
      });
      let lastFrame = performance.now();
      const loop = now => {
        const dt = Math.min(.05,(now-lastFrame)/1000); lastFrame = now;
        syncSize(); updateHunt(dt); controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } catch (error) {
      console.error('Furniture workshop could not start:', error);
      q('[data-engine-fallback]').hidden = false;
      resetBuild();
    }
  } else {
    q('[data-engine-fallback]').hidden = false;
    resetBuild();
  }
}
