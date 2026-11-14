import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

function hasWebGL() {
  try {
    const probe = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
  } catch (_) {
    return false;
  }
}

const canvas = document.getElementById('we-balloon-canvas');
const noWebGLMsg = document.getElementById('we-balloon-nowebgl');
const staticDemo = document.getElementById('we-static-demo');

if (canvas && staticDemo) {
  if (!hasWebGL()) {
    canvas.hidden = true;
    if (noWebGLMsg) noWebGLMsg.hidden = false;
  } else {
    const { renderer, scene, camera, syncSize } = createScene(canvas, {
      THREE, fov: 36, near: 0.1, far: 20, alpha: true, clearAlpha: 0
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

    camera.position.set(0, 0.55, 3.5);
    camera.lookAt(0, 0.35, 0);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.35, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    controls.minPolarAngle = Math.PI * 0.28;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.update();

    /* ── Lighting: three-point + soft ambient fill ── */
    scene.add(new THREE.HemisphereLight(0xfff6e6, 0x33291f, 0.55));
    const key = new THREE.DirectionalLight(0xfff1e0, 1.7);
    key.position.set(2.2, 3.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 8;
    key.shadow.camera.left = -1.6;
    key.shadow.camera.right = 1.6;
    key.shadow.camera.top = 1.6;
    key.shadow.camera.bottom = -1.6;
    key.shadow.radius = 3;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xcfe3ff, 0.5);
    fill.position.set(-2.6, 1.3, 1.9);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 1.0);
    rim.position.set(-1.1, 2.6, -2.9);
    scene.add(rim);

    const chargeLight = new THREE.PointLight(0x38bdf8, 0, 3.2);
    chargeLight.position.set(0, 0.95, 0.7);
    scene.add(chargeLight);

    /* ── Ground contact shadow ── */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.ShadowMaterial({ opacity: 0.22 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.39;
    ground.receiveShadow = true;
    scene.add(ground);

    /* ── Head ── */
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x93a1b3, roughness: 0.85, metalness: 0.04 })
    );
    head.scale.set(1, 0.62, 1);
    head.position.set(0, -0.05, 0);
    head.castShadow = true;
    head.receiveShadow = true;
    scene.add(head);

    /* ── Balloon (group: sphere + knot + string) ── */
    const balloonGroup = new THREE.Group();
    const balloon = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 48, 48),
      new THREE.MeshPhysicalMaterial({ color: 0xe0331f, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12, metalness: 0 })
    );
    balloon.scale.set(0.86, 1.05, 0.86);
    balloon.castShadow = true;
    balloonGroup.add(balloon);

    const knotMat = new THREE.MeshStandardMaterial({ color: 0xb3271a, roughness: 0.4 });
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 10), knotMat);
    knot.rotation.x = Math.PI;
    knot.position.y = -0.53;
    balloonGroup.add(knot);

    const stringCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, -0.57, 0),
      new THREE.Vector3(-0.03, -0.66, 0),
      new THREE.Vector3(0, -0.75, 0)
    );
    const stringMesh = new THREE.Mesh(
      new THREE.TubeGeometry(stringCurve, 8, 0.008, 6, false),
      knotMat
    );
    balloonGroup.add(stringMesh);

    balloonGroup.position.set(0, 1.05, 0);
    scene.add(balloonGroup);

    /* ── Spark arc mesh (shown briefly on discharge) ── */
    const sparkPoints = [
      new THREE.Vector3(0, 0.55, 0),
      new THREE.Vector3(-0.08, 0.68, 0.05),
      new THREE.Vector3(0.07, 0.80, -0.04),
      new THREE.Vector3(0, 0.94, 0)
    ];
    const sparkGeom = new THREE.BufferGeometry().setFromPoints(sparkPoints);
    const sparkMat = new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0 });
    const sparkLine = new THREE.Line(sparkGeom, sparkMat);
    scene.add(sparkLine);

    /* ── Hair: 9 curved, tapered 3D locks ── */
    const HAIR_SEG = 16;
    const HAIR_RAD = 8;
    const HAIR_COLOR_BASE = new THREE.Color(0x5c3a1e);
    const HAIR_COLOR_TIP = new THREE.Color(0xe0a35c);

    function buildIndices(segments, radial) {
      const indices = [];
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < radial; j++) {
          const a = (radial + 1) * i + j;
          const b = (radial + 1) * (i + 1) + j;
          const c = (radial + 1) * (i + 1) + (j + 1);
          const d = (radial + 1) * i + (j + 1);
          indices.push(a, b, d, b, c, d);
        }
      }
      return indices;
    }
    const hairIndices = buildIndices(HAIR_SEG, HAIR_RAD);
    const hairVertCount = (HAIR_SEG + 1) * (HAIR_RAD + 1);

    function fillStrandArrays(curve, baseRadius, tipRadius, posArr, normArr, colorArr) {
      const frames = curve.computeFrenetFrames(HAIR_SEG, false);
      const tmpColor = new THREE.Color();
      let vi = 0;
      let ci = 0;
      for (let i = 0; i <= HAIR_SEG; i++) {
        const t = i / HAIR_SEG;
        const point = curve.getPointAt(t);
        const radius = THREE.MathUtils.lerp(baseRadius, tipRadius, Math.pow(t, 0.6));
        const N = frames.normals[i];
        const B = frames.binormals[i];
        tmpColor.copy(HAIR_COLOR_BASE).lerp(HAIR_COLOR_TIP, t);
        for (let j = 0; j <= HAIR_RAD; j++) {
          const v = (j / HAIR_RAD) * Math.PI * 2;
          const sin = Math.sin(v);
          const cos = -Math.cos(v);
          const nx = cos * N.x + sin * B.x;
          const ny = cos * N.y + sin * B.y;
          const nz = cos * N.z + sin * B.z;
          posArr[vi] = point.x + radius * nx;
          posArr[vi + 1] = point.y + radius * ny;
          posArr[vi + 2] = point.z + radius * nz;
          normArr[vi] = nx;
          normArr[vi + 1] = ny;
          normArr[vi + 2] = nz;
          vi += 3;
          colorArr[ci] = tmpColor.r;
          colorArr[ci + 1] = tmpColor.g;
          colorArr[ci + 2] = tmpColor.b;
          ci += 3;
        }
      }
    }

    const STRAND_COUNT = 9;
    const rootXs = [-0.34, -0.255, -0.17, -0.085, 0, 0.085, 0.17, 0.255, 0.34];
    const lengths = [0.28, 0.33, 0.38, 0.43, 0.46, 0.43, 0.38, 0.33, 0.28];
    const restTipOffs = [-0.05, -0.04, -0.025, -0.01, 0, 0.01, 0.025, 0.04, 0.05];
    const zOffsets = [0.03, -0.025, 0.035, -0.015, 0.03, -0.015, 0.035, -0.025, 0.03];
    const rootY = 0.30;
    const hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0.06 });

    const strands = [];
    for (let s = 0; s < STRAND_COUNT; s++) {
      const geometry = new THREE.BufferGeometry();
      geometry.setIndex(hairIndices);
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(hairVertCount * 3), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(hairVertCount * 3), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(hairVertCount * 3), 3));
      const mesh = new THREE.Mesh(geometry, hairMat);
      mesh.castShadow = true;
      scene.add(mesh);

      const rootX = rootXs[s];
      const z = zOffsets[s];
      const len = lengths[s];
      const tipOff = restTipOffs[s];
      strands.push({
        mesh,
        geometry,
        z,
        root: new THREE.Vector3(rootX, rootY, z),
        restC1: new THREE.Vector3(rootX + tipOff * 0.9, rootY + len * 0.35, z),
        restC2: new THREE.Vector3(rootX + tipOff * 0.35, rootY + len * 0.75, z),
        restTip: new THREE.Vector3(rootX + tipOff, rootY + len, z),
        chargedC1: new THREE.Vector3(rootX * 0.8, rootY + len * 1.3 * 0.35, z),
        chargedC2: new THREE.Vector3(rootX * 0.45, rootY + len * 1.3 * 0.75, z),
        chargedTip: new THREE.Vector3(rootX * 0.28, rootY + len * 1.3, z)
      });
    }

    const tmpC1 = new THREE.Vector3();
    const tmpC2 = new THREE.Vector3();
    const tmpTip = new THREE.Vector3();
    function updateStrand(strand, amount) {
      tmpC1.copy(strand.restC1).lerp(strand.chargedC1, amount);
      tmpC2.copy(strand.restC2).lerp(strand.chargedC2, amount);
      tmpTip.copy(strand.restTip).lerp(strand.chargedTip, amount);
      const curve = new THREE.CubicBezierCurve3(strand.root, tmpC1, tmpC2, tmpTip);
      fillStrandArrays(
        curve,
        0.021,
        0.0032,
        strand.geometry.attributes.position.array,
        strand.geometry.attributes.normal.array,
        strand.geometry.attributes.color.array
      );
      strand.geometry.attributes.position.needsUpdate = true;
      strand.geometry.attributes.normal.needsUpdate = true;
      strand.geometry.attributes.color.needsUpdate = true;
      strand.geometry.computeBoundingSphere();
    }

    let chargeAmount = 0;
    let lastDrawnAmount = -1;
    let sparkTimer = 0;
    const clock = new THREE.Clock();

    function loop() {
      window.SimKit.frame(canvas, loop);
      const dt = Math.min(clock.getDelta(), 0.1);
      syncSize();
      controls.update();

      if (staticDemo.dataset.spark === 'true') {
        sparkTimer = 0.42;
        delete staticDemo.dataset.spark;
      }

      const parsedLevel = parseFloat(staticDemo.dataset.chargeLevel);
      const target = Number.isFinite(parsedLevel)
        ? Math.max(0, Math.min(1, parsedLevel))
        : (staticDemo.classList.contains('is-charged') ? 1 : 0);

      const rate = 3.2;
      if (chargeAmount < target) chargeAmount = Math.min(target, chargeAmount + dt * rate);
      else if (chargeAmount > target) chargeAmount = Math.max(target, chargeAmount - dt * rate);

      if (Math.abs(chargeAmount - lastDrawnAmount) > 0.0008) {
        for (const strand of strands) updateStrand(strand, chargeAmount);
        balloonGroup.position.y = THREE.MathUtils.lerp(1.05, 0.92, chargeAmount);
        balloonGroup.rotation.z = THREE.MathUtils.lerp(0, -0.05, chargeAmount);
        lastDrawnAmount = chargeAmount;
      }

      if (sparkTimer > 0) {
        sparkTimer = Math.max(0, sparkTimer - dt);
        const flash = sparkTimer / 0.42;
        sparkMat.opacity = flash;
        chargeLight.intensity = chargeAmount * 1.4 + flash * 4.5;
      } else {
        sparkMat.opacity = 0;
        chargeLight.intensity = chargeAmount * 1.4;
      }

      renderer.render(scene, camera);
    }
    loop();
  }
}
