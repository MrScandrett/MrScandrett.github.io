import { THREE } from '../vendor/three-bundle.min.js';
import { createScene } from './sim-kit-three.mjs';
import { createFlagCloth, upsampleGrid, WIND_PRESETS } from './flag-cloth.mjs';

// The same original SVG supplies the cloth's colours and the no-WebGL fallback.
// Construction: EO 10834, 10:19, union 0.76 × 7/13 of hoist, 50 stars.
// Motion is a cloth simulation (flag-cloth.mjs): gravity, wind pressure, gusts.
const stage = document.getElementById('pledgeStage');
const canvas = document.getElementById('flagCanvas');

const FLY = 3.8, HOIST = 2;
const HOIST_X = -1.9, TOP_Y = 1.65;
const POLE_X = -1.98;
const UPSAMPLE = 3;

// EO 10834 star layout in hoist units (H = 1): rows E = 0.054 apart, columns G = 0.063 apart.
function starCentres() {
  const stars = [];
  for (let row = 0; row < 9; row++) {
    for (let col = row % 2; col < 11; col += 2) stars.push([.063 * (col + 1), .054 * (row + 1)]);
  }
  return stars;
}

function starPath(ctx, cx, cy, radius) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 ? radius * .382 : radius;
    const a = -Math.PI / 2 + k * Math.PI / 5;
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
}

// Relief for the sewn flag: raised stripe seams, embroidered stars with a
// satin-stitch ridge, the canvas header and the hemmed fly end.
function clothRelief(width) {
  const height = Math.round(width / 1.9);
  const relief = document.createElement('canvas');
  relief.width = width; relief.height = height;
  const ctx = relief.getContext('2d');
  const unit = height; // one hoist
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, width, height);
  // Felled seams between stripes: a ridge with a slight trough each side.
  for (let s = 1; s < 13; s++) {
    const y = s * unit / 13;
    const g = ctx.createLinearGradient(0, y - unit * .006, 0, y + unit * .006);
    g.addColorStop(0, '#787878'); g.addColorStop(.45, '#a8a8a8'); g.addColorStop(.55, '#a8a8a8'); g.addColorStop(1, '#787878');
    ctx.fillStyle = g;
    ctx.fillRect(s * unit / 13 < unit * 7 / 13 ? unit * .76 : 0, y - unit * .006, width, unit * .012);
  }
  // The union is a separate panel sewn on: seam along its fly edge and foot.
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(unit * .76 - unit * .003, 0, unit * .006, unit * 7 / 13);
  ctx.fillRect(0, unit * 7 / 13 - unit * .003, unit * .76, unit * .006);
  // Embroidered stars: raised, with a soft edge so the relief has a slope.
  ctx.save();
  ctx.filter = `blur(${Math.max(1, unit * .0016)}px)`;
  ctx.fillStyle = '#b4b4b4';
  for (const [x, y] of starCentres()) { starPath(ctx, x * unit, y * unit, unit * .0308 * 1.03); ctx.fill(); }
  ctx.fillStyle = '#c8c8c8';
  for (const [x, y] of starCentres()) { starPath(ctx, x * unit, y * unit, unit * .0308 * .7); ctx.fill(); }
  ctx.restore();
  // Hemmed fly end, double-stitched.
  ctx.fillStyle = '#9c9c9c';
  ctx.fillRect(width - unit * .02, 0, unit * .02, height);
  ctx.fillStyle = '#6c6c6c';
  for (const x of [width - unit * .017, width - unit * .006]) ctx.fillRect(x, 0, Math.max(1, unit * .0015), height);
  return relief;
}

async function flagColours(maxSize) {
  const image = new Image();
  image.decoding = 'async';
  image.src = new URL('../images/american-flag.svg', import.meta.url).href;
  await image.decode();
  // Rasterise the vector flag larger than its nominal size so stars stay crisp on a projector.
  const width = Math.min(maxSize, 3800);
  const colours = document.createElement('canvas');
  colours.width = width; colours.height = Math.round(width / 1.9);
  colours.getContext('2d').drawImage(image, 0, 0, colours.width, colours.height);
  return colours;
}

// A soft daylight sky for reflections on the pole, finial and cloth sheen.
function skyEnvironment(renderer) {
  const sky = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(10, 32, 16);
  const colours = [];
  const zenith = new THREE.Color(0x6f9cc4), horizon = new THREE.Color(0xe6eef2), ground = new THREE.Color(0x7f8a7c);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10;
    const c = y >= 0 ? horizon.clone().lerp(zenith, Math.pow(y, .6)) : horizon.clone().lerp(ground, Math.min(1, -y * 4));
    colours.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  sky.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(.9, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.5) }));
  sunDisc.position.set(-3, 5, 7).setLength(9);
  sky.add(sunDisc);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(sky, .02);
  pmrem.dispose();
  geometry.dispose();
  return target.texture;
}

async function createFlag() {
  const { renderer, scene, camera, syncSize } = createScene(canvas, {
    THREE, alpha: true, fov: 32, near: .1, far: 40, maxDpr: 2
  });
  const boardMode = document.documentElement.hasAttribute('data-classroom-board');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.environment = skyEnvironment(renderer);
  scene.environmentIntensity = .55;

  scene.add(new THREE.HemisphereLight(0xe9f1ff, 0x8a8f86, .9));
  // Afternoon sun from the upper left and in front, grazing the folds.
  const sun = new THREE.DirectionalLight(0xfff3e0, 3.1);
  sun.position.set(-3, 5, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(boardMode ? 1024 : 2048, boardMode ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -3.2, right: 3.2, top: 3, bottom: -3, near: 1, far: 18 });
  sun.shadow.bias = -.0006;
  sun.shadow.normalBias = .025;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd4e4ff, .45);
  fill.position.set(4, 1, -4);
  scene.add(fill);

  const maxTexture = Math.min(renderer.capabilities.maxTextureSize, boardMode ? 2048 : 3800);
  const colours = new THREE.CanvasTexture(await flagColours(maxTexture));
  colours.colorSpace = THREE.SRGBColorSpace;
  colours.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const relief = new THREE.CanvasTexture(clothRelief(Math.min(maxTexture, 2048)));
  relief.anisotropy = colours.anisotropy;

  const cloth = new THREE.MeshPhysicalMaterial({
    map: colours, bumpMap: relief, bumpScale: 1.6,
    roughness: .82, metalness: 0, sheen: .35, sheenRoughness: .55, sheenColor: 0xffffff,
    side: THREE.DoubleSide, shadowSide: THREE.DoubleSide
  });
  // Thin nylon lets sunlight through: where a fold faces away from the sun,
  // the side we see glows with the light passing through the cloth.
  const translucency = { sunDir: { value: new THREE.Vector3() }, sunColor: { value: new THREE.Color() }, amount: { value: .32 } };
  cloth.onBeforeCompile = shader => {
    shader.uniforms.uSunDir = translucency.sunDir;
    shader.uniforms.uSunColor = translucency.sunColor;
    shader.uniforms.uTranslucency = translucency.amount;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSunDir;\nuniform vec3 uSunColor;\nuniform float uTranslucency;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        float throughCloth = max(dot(-normal, uSunDir), 0.0);
        reflectedLight.directDiffuse += diffuseColor.rgb * uSunColor * uTranslucency * throughCloth * (0.35 + 0.65 * throughCloth);`);
  };

  const sim = createFlagCloth({ width: FLY, height: HOIST, x: HOIST_X, y: TOP_Y, substeps: boardMode ? 8 : 10 });
  const geometry = new THREE.PlaneGeometry(FLY, HOIST, sim.cols * UPSAMPLE, sim.rows * UPSAMPLE);
  const positions = geometry.attributes.position;
  positions.setUsage(THREE.DynamicDrawUsage);
  const flag = new THREE.Mesh(geometry, cloth);
  flag.frustumCulled = false;
  flag.castShadow = flag.receiveShadow = true;
  scene.add(flag);

  // Flagpole: tapered satin aluminium with a gilded ball, a truck (pulley
  // housing) and the halyard rope running down to the cleat.
  const aluminium = new THREE.MeshStandardMaterial({ color: 0xd5dade, roughness: .28, metalness: .9 });
  const gilt = new THREE.MeshStandardMaterial({ color: 0xd6b25e, roughness: .22, metalness: 1 });
  const rope = new THREE.MeshStandardMaterial({ color: 0xf1ede2, roughness: .9 });
  const canvasCloth = new THREE.MeshStandardMaterial({ color: 0xf3efe2, roughness: .95, bumpMap: relief, bumpScale: .4 });
  function add(geometryPart, material, x, y, z = 0, shadow = true) {
    const mesh = new THREE.Mesh(geometryPart, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  add(new THREE.CylinderGeometry(.03, .045, 6, 32), aluminium, POLE_X, -1.2);
  add(new THREE.CylinderGeometry(.05, .045, .07, 24), aluminium, POLE_X, 1.84);
  add(new THREE.CylinderGeometry(.03, .03, .03, 16), gilt, POLE_X, 1.885);
  add(new THREE.SphereGeometry(.08, 32, 20), gilt, POLE_X, 1.97);
  // Halyard: the running line from the truck to the top snap, the bottom snap down,
  // and the return line hanging beside the pole.
  const line = (x, y1, y2, z) => add(new THREE.CylinderGeometry(.0055, .0055, Math.abs(y1 - y2), 8), rope, x, (y1 + y2) / 2, z);
  line(-1.948, 1.82, TOP_Y - .02, .012);
  line(-1.948, TOP_Y - HOIST + .02, -3.6, .012);
  line(-2.022, 1.82, -3.6, -.012);
  // Canvas header with brass grommets and snap hooks.
  add(new THREE.BoxGeometry(.06, HOIST, .012), canvasCloth, -1.925, TOP_Y - HOIST / 2);
  const brass = new THREE.MeshStandardMaterial({ color: 0xb59a5a, roughness: .3, metalness: 1 });
  for (const y of [TOP_Y - .045, TOP_Y - HOIST + .045]) {
    add(new THREE.TorusGeometry(.017, .006, 8, 20), brass, -1.925, y, .008);
    const snap = add(new THREE.TorusGeometry(.024, .005, 8, 20), aluminium, -1.946, y + (y > 0 ? .03 : -.03), .012);
    snap.rotation.y = Math.PI / 2;
    snap.scale.set(1, 1.6, 1);
  }

  const render = new Float32Array(positions.array.length);
  let target = WIND_PRESETS[stage.dataset.wind] || WIND_PRESETS.calm;
  sim.setWind(target);
  // Fly for a moment before the first frame so the flag opens already in the wind.
  sim.settle(boardMode ? 1 : 1.6);

  function updateMesh() {
    upsampleGrid(sim.positions, sim.nx, sim.ny, UPSAMPLE, render);
    positions.array.set(render);
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  function advance(dt) {
    target = WIND_PRESETS[stage.dataset.wind] || WIND_PRESETS.calm;
    sim.setWind(target, 1 - Math.exp(-dt * 1.2));
    sim.step(dt);
    updateMesh();
  }
  const sunView = new THREE.Vector3();
  function draw() {
    sunView.copy(sun.position).normalize().transformDirection(camera.matrixWorldInverse);
    translucency.sunDir.value.copy(sunView);
    translucency.sunColor.value.copy(sun.color).multiplyScalar(sun.intensity);
    renderer.render(scene, camera);
  }
  function frameCamera() {
    if (!canvas.clientWidth || !canvas.clientHeight) return false;
    syncSize();
    // Contain the flag, finial, and a generous length of pole at every aspect.
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const distance = Math.max(5.25 / aspect, 4.4) / (2 * Math.tan(THREE.MathUtils.degToRad(16)));
    camera.position.set(.2, .55, distance);
    camera.lookAt(-.03, .25, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return true;
  }
  updateMesh();
  if (frameCamera()) draw();
  stage.dataset.renderer = 'ready';
  // Only the canvas is announced once the static fallback has been replaced.
  stage.querySelector('.flag-fallback').setAttribute('aria-hidden', 'true');
  const loop = SimKit.loop(dt => { advance(dt); draw(); }, { el: canvas, maxDt: .06 });
  function syncMotion() {
    if (stage.dataset.view !== 'rendered' || stage.dataset.motion === 'paused' || stage.dataset.crawl === 'paused') loop.pause();
    else loop.resume();
  }
  new MutationObserver(syncMotion).observe(stage, { attributes: true, attributeFilter: ['data-view', 'data-motion', 'data-crawl'] });
  const resize = new ResizeObserver(() => { if (frameCamera()) draw(); });
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
