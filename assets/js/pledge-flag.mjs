import { THREE } from '../vendor/three-bundle.min.js';
import { createScene } from './sim-kit-three.mjs';

// The same original SVG supplies the full-resolution cloth and no-WebGL fallback.
// Construction: EO 10834, 10:19, union 0.76 x 7/13 of hoist, 50 stars.
const stage = document.getElementById('pledgeStage');
const canvas = document.getElementById('flagCanvas');

async function createFlag() {
  const { renderer, scene, camera, syncSize } = createScene(canvas, {
    THREE, alpha: true, fov: 32, near: .1, far: 40, maxDpr: 2
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  scene.add(new THREE.HemisphereLight(0xf3f7ff, 0x788c9a, 1.55));
  const sun = new THREE.DirectionalLight(0xfff7e9, 2.8);
  sun.position.set(-3, 5, 7);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd9eaff, .7);
  fill.position.set(3, 1, -3);
  scene.add(fill);

  const texture = await new THREE.TextureLoader().loadAsync(new URL('../images/american-flag.svg', import.meta.url).href);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // Fine woven relief, deterministic and deliberately subtle at classroom distance.
  const weave = document.createElement('canvas');
  weave.width = weave.height = 128;
  const ctx = weave.getContext('2d');
  const pixels = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      const v = 128 + 28 * Math.sin(x * Math.PI / 2) + 20 * Math.sin(y * Math.PI / 2);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const bump = new THREE.CanvasTexture(weave);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(24, 13);
  const cloth = new THREE.MeshPhysicalMaterial({
    map: texture, bumpMap: bump, bumpScale: .009,
    roughness: .93, metalness: 0, sheen: .16, sheenRoughness: .8, side: THREE.DoubleSide
  });
  const columns = 96;
  const rows = 48;
  const geometry = new THREE.PlaneGeometry(3.8, 2, columns, rows);
  const flag = new THREE.Mesh(geometry, cloth);
  flag.frustumCulled = false;
  scene.add(flag);

  const silver = new THREE.MeshStandardMaterial({ color: 0xc9d1d7, roughness: .32, metalness: .65 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb6a16c, roughness: .35, metalness: .55 });
  function cylinder(radiusTop, radiusBottom, height, material, x, y, z = 0) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 24), material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  }
  // The pole stays upright, and both hoist attachments remain fixed.
  cylinder(.027, .04, 4.8, silver, -1.98, -.6);
  cylinder(.043, .043, .055, silver, -1.98, 1.8);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(.075, 24, 16), brass);
  finial.position.set(-1.98, 1.91, 0);
  scene.add(finial);
  const header = new THREE.Mesh(new THREE.PlaneGeometry(.065, 2), new THREE.MeshStandardMaterial({ color: 0xf6f3e9, roughness: 1, side: THREE.DoubleSide }));
  header.position.set(-1.925, .65, .005);
  scene.add(header);
  for (const y of [1.59, -.29]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.035, .009, 8, 20), brass);
    ring.position.set(-1.925, y, .025);
    scene.add(ring);
    cylinder(.009, .009, .1, silver, -1.97, y);
  }

  const positions = geometry.attributes.position;
  const centerX = new Float32Array(columns + 1);
  const centerZ = new Float32Array(columns + 1);
  const presets = {
    calm: { speed: .85, bend: .55, flutter: .015 },
    medium: { speed: 1.25, bend: .72, flutter: .027 },
    strong: { speed: 1.65, bend: .88, flutter: .04 }
  };
  let time = 1.1;
  let breeze = { ...presets.calm };
  function deform(dt) {
    const target = presets[stage.dataset.wind] || presets.calm;
    const blend = 1 - Math.exp(-dt * 3);
    for (const key of Object.keys(breeze)) breeze[key] += (target[key] - breeze[key]) * blend;
    time += dt * breeze.speed;
    centerX[0] = -1.9;
    centerZ[0] = 0;
    // Integrate tangent angles along the fly to preserve cloth length in the
    // primary folds, instead of stretching a rectangular plane back and forth.
    for (let x = 1; x <= columns; x++) {
      const u = (x - .5) / columns;
      const angle = breeze.bend * Math.sqrt(u) * Math.sin(u * 10 - time * 2);
      centerX[x] = centerX[x - 1] + 3.8 / columns * Math.cos(angle);
      centerZ[x] = centerZ[x - 1] + 3.8 / columns * Math.sin(angle);
    }
    for (let y = 0; y <= rows; y++) {
      const v = y / rows;
      for (let x = 0; x <= columns; x++) {
        const u = x / columns;
        const i = y * (columns + 1) + x;
        const edgeFlutter = breeze.flutter * u * u * Math.sin(u * 23 + v * 7 - time * 3.2);
        positions.setXYZ(i, centerX[x], 1.65 - v * 2 - .13 * Math.pow(u, 1.3) + edgeFlutter,
          centerZ[x] + .065 * u * Math.sin(v * 9 + u * 12 - time * 2));
      }
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  function frameCamera() {
    syncSize();
    // Contain the flag, finial, and a generous length of pole at every aspect.
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const distance = Math.max(5.25 / aspect, 4.4) / (2 * Math.tan(THREE.MathUtils.degToRad(16)));
    camera.position.set(.2, .55, distance);
    camera.lookAt(-.03, .25, 0);
    camera.updateProjectionMatrix();
  }
  function draw() { renderer.render(scene, camera); }
  deform(0);
  frameCamera();
  draw();
  stage.dataset.renderer = 'ready';
  // Only the canvas is announced once the static fallback has been replaced.
  stage.querySelector('.flag-fallback').setAttribute('aria-hidden', 'true');
  let loop = SimKit.loop(dt => { deform(dt); draw(); }, { el: canvas, maxDt: .06 });
  function syncMotion() {
    if (stage.dataset.motion === 'paused' || stage.dataset.crawl === 'paused') loop.pause();
    else loop.resume();
  }
  new MutationObserver(syncMotion).observe(stage, { attributes: true, attributeFilter: ['data-motion', 'data-crawl'] });
  const resize = new ResizeObserver(() => { frameCamera(); draw(); });
  resize.observe(canvas);
  syncMotion();
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    loop.pause();
    stage.dataset.renderer = 'fallback';
    stage.querySelector('.flag-fallback').removeAttribute('aria-hidden');
    canvas.setAttribute('aria-hidden', 'true');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    draw();
    stage.dataset.renderer = 'ready';
    stage.querySelector('.flag-fallback').setAttribute('aria-hidden', 'true');
    canvas.removeAttribute('aria-hidden');
    syncMotion();
  });
}

createFlag().catch(error => {
  // The accurate SVG remains visible if WebGL or texture loading is unavailable.
  canvas.setAttribute('aria-hidden', 'true');
  stage.dataset.renderer = 'fallback';
  console.warn('Using the static American flag:', error.message);
});
