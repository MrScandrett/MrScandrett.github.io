import { THREE, OrbitControls } from '../vendor/three-bundle.min.js';
import { createScene } from './sim-kit-three.mjs';

// A teaching sphere, not a geometric boundary of the sRGB gamut.
const RADIUS = 85;
const height = l => (l - 50) * 1.7;
const position = (l, a, b) => [a * .85, height(l), -b * .85];
function geometry(vertices, colors) {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return result;
}
function linearColor(rgb) {
  return new THREE.Color().setRGB(...rgb.map(v => v / 255), THREE.SRGBColorSpace).toArray();
}
export function createColorVolume(labToRgb) {
  const canvas = document.getElementById('lab-volume');
  const { scene, camera, renderer, syncSize } = createScene(canvas, { THREE, clearColor: '#f7f4ec', fov: 39, far: 1600 });
  // No lights or tone mapping: color patches retain their sRGB values.
  renderer.toneMapping = THREE.NoToneMapping;
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minDistance = 230;
  controls.maxDistance = 650;
  controls.target.set(0, 0, 0);
  function draw() {
    syncSize();
    const zoom = Math.min(1, camera.aspect);
    if (camera.zoom !== zoom) { camera.zoom = zoom; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
  }
  function reset() { camera.position.set(210, 150, 290); controls.target.set(0, 0, 0); controls.update(); draw(); }

  const shell = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  scene.add(shell);
  function rebuildShell(l) {
    const vertices = [], colors = [];
    // Retain the upper three-quarter shell and open the front quadrant down
    // to the selected layer, so the silhouette and exposed interior read as a sphere.
    const split = Math.acos(Math.max(-1, Math.min(1, height(l) / RADIUS)));
    function band(top, bottom, cut) {
      const rows = 48, columns = 128;
      function vertex(row, col) {
        const phi = top + (bottom - top) * row / rows, theta = col / columns * Math.PI * 2;
        const y = RADIUS * Math.cos(phi), radius = RADIUS * Math.sin(phi);
        const x = radius * Math.cos(theta), z = radius * Math.sin(theta);
        vertices.push(x, y, z);
        colors.push(...linearColor(labToRgb(y / 1.7 + 50, x / .85, -z / .85).rgb));
      }
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        if (cut && col < columns / 4) continue;
        [[row,col],[row+1,col],[row+1,col+1],[row,col],[row+1,col+1],[row,col+1]].forEach(([r,c]) => vertex(r,c));
      }
    }
    band(0, split, true); band(split, Math.PI, false);
    // Colored radial walls finish the two vertical edges of the cutaway.
    for (const theta of [0, Math.PI / 2]) {
      for (let row = 0; row < 48; row++) for (let col = 0; col < 32; col++) {
        function wall(r, c) {
          const y = height(l) + (RADIUS - height(l)) * r / 48;
          const radius = Math.sqrt(Math.max(0, RADIUS ** 2 - y ** 2)) * c / 32;
          const x = radius * Math.cos(theta), z = radius * Math.sin(theta);
          vertices.push(x,y,z); colors.push(...linearColor(labToRgb(y / 1.7 + 50,x / .85,-z / .85).rgb));
        }
        [[row,col],[row+1,col],[row+1,col+1],[row,col],[row+1,col+1],[row,col+1]].forEach(([r,c]) => wall(r,c));
      }
    }
    shell.geometry.dispose(); shell.geometry = geometry(vertices, colors);
  }

  function line(points, color, opacity = 1) {
    const object = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))), new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
    scene.add(object); return object;
  }
  line([[0,-85,0],[0,92,0]], '#625e55');
  line([[-92,0,0],[92,0,0]], '#625e55', .45);
  line([[0,0,-92],[0,0,92]], '#625e55', .45);
  function label(text, point) {
    const bitmap = document.createElement('canvas'); bitmap.width = 320; bitmap.height = 96;
    const ctx = bitmap.getContext('2d'); ctx.font = 'bold 36px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#f7f4ec'; ctx.lineWidth = 7; ctx.strokeText(text, 160, 48);
    ctx.fillStyle = '#35332e'; ctx.fillText(text, 160, 48);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(bitmap), depthTest: false }));
    sprite.position.set(...point); sprite.scale.set(76, 22.8, 1); scene.add(sprite);
  }
  label('L* 100 · white', [0,101,0]); label('L* 0 · black', [0,-101,0]);
  label('−a* Green', [-105,0,0]); label('+a* Red', [105,0,0]);
  label('+b* Yellow', [0,0,-105]); label('−b* Blue', [0,0,105]);

  const slice = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  scene.add(slice);
  const outline = line([[0,0,0],[0,0,0]], '#403d36', .7);
  const rings = new THREE.Group(); scene.add(rings);
  const marker = new THREE.Group();
  marker.add(new THREE.Mesh(new THREE.SphereGeometry(3.1, 20, 16), new THREE.MeshBasicMaterial({ color: '#fff', depthTest: false })));
  const dot = new THREE.Mesh(new THREE.SphereGeometry(1.9, 20, 16), new THREE.MeshBasicMaterial({ color: '#111', depthTest: false }));
  dot.position.z = .1; marker.add(dot); marker.renderOrder = 5;
  marker.children.forEach(child => { child.renderOrder = 5; }); scene.add(marker);
  let lastL;
  function update(l, a, b) {
    if (lastL !== l) {
      rebuildShell(l);
      const points = [], shades = [], radius = Math.sqrt(Math.max(0, RADIUS ** 2 - height(l) ** 2));
      const segments = 128, rows = 32;
      function vertex(row, col) {
        const r = radius * row / rows, theta = col / segments * Math.PI * 2;
        const x = r * Math.cos(theta), z = r * Math.sin(theta);
        points.push(x,height(l) + .08,z);
        shades.push(...linearColor(labToRgb(l,x / .85,-z / .85).rgb));
      }
      for (let row = 0; row < rows; row++) for (let col = 0; col < segments; col++) {
        [[row,col],[row+1,col],[row+1,col+1],[row,col],[row+1,col+1],[row,col+1]].forEach(([r,c]) => vertex(r,c));
      }
      slice.geometry.dispose(); slice.geometry = geometry(points, shades);
      const circle = r => Array.from({ length: 129 }, (_,i) => new THREE.Vector3(r*Math.cos(i/128*Math.PI*2),height(l)+.2,r*Math.sin(i/128*Math.PI*2)));
      outline.geometry.dispose(); outline.geometry = new THREE.BufferGeometry().setFromPoints(circle(radius));
      while (rings.children.length) { const ring = rings.children[0]; rings.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
      for (const fraction of [.2,.4,.6,.8]) {
        const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circle(radius*fraction)), new THREE.LineBasicMaterial({ color: '#383530', transparent: true, opacity: .35 })); rings.add(ring);
      }
      lastL = l;
    }
    const radius = Math.sqrt(Math.max(0, RADIUS ** 2 - height(l) ** 2));
    const distance = Math.hypot(a*.85,b*.85), scale = distance > radius ? radius / distance : 1;
    marker.position.set(...position(l,a*scale,b*scale));
    document.getElementById('lab-projection-note').textContent = distance > radius + .01 ? 'Your color lies beyond this schematic sphere’s slice; its marker is projected to the rim. The flat map shows its exact coordinates.' : 'The ring marks your selected color on this layer.';
    canvas.setAttribute('aria-label', `Rotatable CIELAB color volume. Selected slice L* ${l}; color a* ${a}, b* ${b}. Drag or use arrow keys to rotate.`);
    draw();
  }
  function turn(horizontal, vertical = 0) {
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += horizontal; spherical.phi = Math.max(.15, Math.min(Math.PI - .15, spherical.phi + vertical));
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update(); draw();
  }
  controls.addEventListener('change', draw);
  canvas.addEventListener('keydown', event => {
    const keys = { ArrowLeft: [-.15,0], ArrowRight: [.15,0], ArrowUp: [0,-.15], ArrowDown: [0,.15] };
    if (keys[event.key]) { event.preventDefault(); turn(...keys[event.key]); }
    if (event.key === 'Home') { event.preventDefault(); reset(); }
  });
  document.getElementById('lab-turn').addEventListener('click', () => turn(Math.PI / 2));
  document.getElementById('lab-view-reset').addEventListener('click', reset);
  new ResizeObserver(draw).observe(canvas);
  reset();
  return { update };
}
