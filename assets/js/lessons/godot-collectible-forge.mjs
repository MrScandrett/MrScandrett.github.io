import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../../js/sim-kit-three.mjs';

const forge = document.querySelector('[data-asset-forge]');
if (forge) {
  const canvas = forge.querySelector('[data-model-canvas]');
  const stage = createScene(canvas, { THREE, fov: 38, clearColor: 0x071e2c, maxDpr: 2 });
  const { renderer, scene, camera } = stage;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3.5;
  controls.maxDistance = 8;
  controls.target.set(0, .15, 0);

  const state = {
    dimension: '2.5d',
    world: 'skyway',
    shape: 'crystal',
    detail: 'none',
    color: '#69e6ff',
    texture: 'smooth',
    width: 1,
    height: 1.2,
    depth: .65,
    twist: 15,
    roughness: .35,
    glow: true
  };

  scene.add(new THREE.HemisphereLight(0xbdeaff, 0x173244, 2.3));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(4, 6, 5);
  keyLight.castShadow = true;
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x69e6ff, 18, 9);
  rimLight.position.set(-3, 1.8, 3);
  scene.add(rimLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x102f42, roughness: .92, metalness: .08 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.36;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(6.2, 18, 0x4a8aa9, 0x21485e);
  grid.position.y = -1.34;
  scene.add(grid);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);
  let model = null;
  let textureMap = null;

  const disposeModel = () => {
    if (!model) return;
    model.traverse(child => {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
      else child.material?.dispose();
    });
    modelRoot.remove(model);
    textureMap?.dispose();
    textureMap = null;
  };

  const makeTexture = (kind, color) => {
    if (kind === 'smooth') return null;
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = textureCanvas.height = 128;
    const context = textureCanvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = .28;
    context.strokeStyle = '#071e2c';
    context.fillStyle = '#ffffff';
    context.lineWidth = 7;
    if (kind === 'stripes') {
      for (let x = -128; x < 256; x += 34) { context.beginPath(); context.moveTo(x, 128); context.lineTo(x + 128, 0); context.stroke(); }
    }
    if (kind === 'grid') {
      context.lineWidth = 3;
      for (let p = 0; p <= 128; p += 24) { context.beginPath(); context.moveTo(p, 0); context.lineTo(p, 128); context.moveTo(0, p); context.lineTo(128, p); context.stroke(); }
    }
    if (kind === 'stone') {
      for (let i = 0; i < 90; i += 1) { const size = 1 + (i % 5); context.beginPath(); context.arc((i * 47) % 128, (i * 83) % 128, size, 0, Math.PI * 2); context.fill(); }
    }
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  };

  const geometryFor = shape => {
    if (shape === 'sphere') return new THREE.SphereGeometry(1, 32, 20);
    if (shape === 'cube') return new THREE.BoxGeometry(1.7, 1.7, 1.7, 3, 3, 3);
    if (shape === 'capsule') return new THREE.CapsuleGeometry(.68, 1.05, 10, 24);
    if (shape === 'ring') return new THREE.TorusGeometry(.82, .28, 16, 42);
    return new THREE.OctahedronGeometry(1.18, 1);
  };

  const materialFor = (color = state.color, detail = false) => {
    if (!detail) textureMap = makeTexture(state.texture, state.color);
    return new THREE.MeshStandardMaterial({
      color,
      map: detail ? null : textureMap,
      roughness: detail ? .22 : state.roughness,
      metalness: detail ? .65 : Math.max(.08, .5 - state.roughness * .35),
      emissive: state.glow ? new THREE.Color(color).multiplyScalar(detail ? .28 : .14) : new THREE.Color(0x000000),
      emissiveIntensity: state.glow ? 1.4 : 0
    });
  };

  const buildModel = () => {
    disposeModel();
    model = new THREE.Group();
    const body = new THREE.Mesh(geometryFor(state.shape), materialFor());
    body.castShadow = true;
    body.receiveShadow = true;
    model.add(body);
    if (state.detail === 'halo') {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.35, .08, 12, 48), materialFor('#ffd166', true));
      halo.rotation.x = Math.PI / 2.8;
      model.add(halo);
    }
    if (state.detail === 'core') {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.43, 1), materialFor('#ffffff', true));
      model.add(core);
    }
    if (state.detail === 'fins') {
      [-1, 1].forEach(side => {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(.32, .85, 4), materialFor('#ffd166', true));
        fin.position.x = side * 1.05;
        fin.rotation.z = side * Math.PI / 2;
        model.add(fin);
      });
    }
    modelRoot.add(model);
    updateTransform();
  };

  const updateTransform = () => {
    if (!model) return;
    const flatDepth = state.dimension === '2d' ? .12 : state.depth;
    model.scale.set(state.width, state.height, flatDepth);
    model.rotation.y = THREE.MathUtils.degToRad(state.twist);
  };

  const updateCamera = () => {
    controls.enabled = state.dimension !== '2d';
    controls.enableRotate = state.dimension !== '2d';
    if (state.dimension === '2d') camera.position.set(0, .1, 6);
    if (state.dimension === '2.5d') camera.position.set(4.2, 3.3, 5.6);
    if (state.dimension === '3d') camera.position.set(3.8, 2.5, 5.2);
    camera.lookAt(0, .1, 0);
    controls.target.set(0, .1, 0);
    controls.update();
    forge.querySelector('[data-view-mode]').textContent = state.dimension === '2d' ? '2D FRONT VIEW' : state.dimension === '2.5d' ? '2.5D ISOMETRIC' : '3D ORBIT VIEW';
    forge.querySelector('[data-view-hint]').textContent = state.dimension === '2d' ? 'Front view locked · scroll to zoom' : 'Drag to orbit · scroll to zoom';
    updateTransform();
  };

  const setActive = (selector, value, key) => {
    forge.querySelectorAll(selector).forEach(button => button.classList.toggle('is-active', button.dataset[key] === value));
  };

  forge.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.dimension) {
      state.dimension = button.dataset.dimension;
      setActive('[data-dimension]', state.dimension, 'dimension');
      updateCamera();
    }
    if (button.dataset.shape) {
      state.shape = button.dataset.shape;
      setActive('[data-shape]', state.shape, 'shape');
      buildModel();
    }
    if (button.dataset.world) {
      state.world = button.dataset.world;
      setActive('[data-world]', state.world, 'world');
    }
    if (button.dataset.color) {
      state.color = button.dataset.color;
      forge.querySelector('[data-custom-color]').value = state.color;
      setActive('[data-color]', state.color, 'color');
      buildModel();
    }
    if (button.matches('[data-deploy-model]')) {
      const payload = { ...state };
      window.dispatchEvent(new CustomEvent('collectible-model-deployed', { detail: payload }));
      forge.querySelector('[data-deploy-status]').textContent = `${state.shape} deployed to the ${state.world} ${state.dimension} world.`;
      button.textContent = 'Deployed ✓';
      window.setTimeout(() => { button.textContent = 'Deploy to preset world →'; }, 1500);
    }
  });

  forge.addEventListener('input', event => {
    const input = event.target;
    if (input.dataset.mold) {
      state[input.dataset.mold] = Number(input.value);
      const output = forge.querySelector(`[data-output="${input.dataset.mold}"]`);
      output.textContent = input.dataset.mold === 'twist' ? `${input.value}°` : Number(input.value).toFixed(2);
      updateTransform();
    }
    if (input.dataset.material === 'roughness') {
      state.roughness = Number(input.value);
      forge.querySelector('[data-output="roughness"]').textContent = state.roughness.toFixed(2);
      buildModel();
    }
    if (input.dataset.material === 'glow') { state.glow = input.checked; buildModel(); }
    if (input.matches('[data-custom-color]')) {
      state.color = input.value;
      forge.querySelectorAll('[data-color]').forEach(button => button.classList.remove('is-active'));
      buildModel();
    }
  });

  forge.addEventListener('change', event => {
    const input = event.target;
    if (input.matches('[data-detail]')) { state.detail = input.value; buildModel(); }
    if (input.matches('[data-texture]')) { state.texture = input.value; buildModel(); }
  });

  updateCamera();
  buildModel();
  let previous = performance.now();
  const animate = now => {
    const delta = Math.min((now - previous) / 1000, .05);
    previous = now;
    stage.syncSize();
    if (model && state.dimension === '3d' && !matchMedia('(prefers-reduced-motion: reduce)').matches) modelRoot.rotation.y += delta * .28;
    else if (state.dimension !== '3d') modelRoot.rotation.y += (0 - modelRoot.rotation.y) * Math.min(1, delta * 6);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}
