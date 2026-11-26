/* part-viewer.mjs — a small 3D window that builds one Forge part, assembles its printed pieces and
 * plays the part's demo: the lessons' "see it in 3D" view. It runs the same engine, parts and
 * demo-player as forge.html, so students watch the exact pieces Forge would print.
 *
 *   const viewer = await mountPartViewer(host, { partId: 'planetary', params: { sun: 12 } });
 *   viewer.show('worm', { teeth: 30 });   // rebuild with another part or settings
 *   viewer.setPlaying(false);
 *
 * The host gets a canvas plus a caption line. Needs sim-kit.js on the page (for the paused-off-screen loop).
 */

import ManifoldModule from '../../vendor/manifold/manifold.js';
import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { createEngine } from './engine.mjs';
import { partById } from './parts.mjs';
import { createDemoPlayer } from './demo-player.mjs';

const PALETTE = ['#e8792a', '#2f8fd6', '#a9b8c6', '#c9d3dc', '#6f8398', '#5cc8f0', '#d9a441', '#8a5cd0'];
let enginePromise = null;

export async function mountPartViewer(host, { partId, params = {}, colors = PALETTE, onReport } = {}) {
  host.classList.add('pv-host');
  const canvas = document.createElement('canvas');
  canvas.className = 'pv-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '3D model');
  canvas.tabIndex = 0;
  const caption = document.createElement('p');
  caption.className = 'pv-caption';
  caption.setAttribute('role', 'status');
  caption.textContent = 'Loading the 3D engine…';
  host.append(canvas, caption);

  const { scene, camera, renderer, syncSize } = createScene(canvas, { THREE, fov: 32, near: 1, far: 4000, clearColor: 0x16202b });
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x30363d, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-120, 260, 180);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(200, 80, -160);
  scene.add(fill);
  const root = new THREE.Group();
  root.rotation.x = -Math.PI / 2;             // parts are Z-up millimetres
  scene.add(root);
  const parts = new THREE.Group();
  root.add(parts);

  let player = null, playing = true, framed = false, token = 0;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.SimKit.loop((dt) => {
    if (player && playing) player.tick(Math.min(dt, 0.1) * (reduce ? 0.5 : 1));
    controls.update();
    syncSize();
    renderer.render(scene, camera);
  }, { el: canvas });

  if (!enginePromise) enginePromise = createEngine(ManifoldModule, {});
  const engine = await enginePromise;

  function frame(size) {
    syncSize();
    const [w, d, h] = size;
    const radius = Math.max(Math.hypot(w, d, h) / 2, 20);
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 0.9;
    const target = new THREE.Vector3(0, h / 2, 0);
    controls.target.copy(target);
    camera.position.copy(target).add(new THREE.Vector3(-0.5, 0.75, 0.9).normalize().multiplyScalar(distance));
    controls.update();
  }

  function show(id, given = {}) {
    const part = partById(id);
    const mine = ++token;
    if (!part) { caption.textContent = 'No printable model for this one yet.'; return null; }
    const result = engine.run(part, given);
    if (mine !== token) return null;
    if (player) player.stop();
    player = null;
    for (const child of [...parts.children]) { child.geometry.dispose(); child.material.dispose(); parts.remove(child); }
    if (result.error) { caption.textContent = `Could not build it: ${result.error}`; return result; }
    const meshes = result.bodies.map((body, i) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(body.positions, 3));
      geometry.computeVertexNormals();
      const ghost = result.demo?.ghost?.includes(i);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.55, metalness: 0.05, flatShading: true, transparent: ghost, opacity: ghost ? 0.3 : 1, depthWrite: !ghost }));
      parts.add(mesh);
      return mesh;
    });
    if (result.demo) {
      player = createDemoPlayer(THREE, { group: parts, meshes, bodies: result.bodies, demo: result.demo });
      caption.textContent = `${result.demo.input}: ${result.demo.note} Drag to turn the view.`;
    } else {
      caption.textContent = `${part.name}. Drag to turn the view.`;
    }
    canvas.setAttribute('aria-label', `3D model of the printable ${part.name}, ${result.demo ? 'moving: ' + result.demo.note : 'standing still'}`);
    if (!framed || id !== show.last) { frame(player ? player.size : result.layout.size); framed = true; }
    show.last = id;
    if (onReport) onReport(result);
    return result;
  }

  if (partId) show(partId, params);
  return {
    show,
    setPlaying(on) { playing = on; },
    get playing() { return playing; },
    refit() { if (player) frame(player.size); },
  };
}
