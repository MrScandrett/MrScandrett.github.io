import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { rings, checks } from './codeblocks-rings.mjs';

export function createRingStudio(params) {
  const root = document.getElementById('cb-studio');
  const canvas = document.getElementById('cb-3d');
  const status = document.getElementById('cb-execution');
  let world, controls, group, shown = params().n, current;
  // Keep the dimension diagram and exports usable when WebGL is unavailable.
  try {
    world = createScene(canvas, { THREE, far: 1000, clearColor: 0xeaf2f5 });
    world.scene.add(new THREE.HemisphereLight(0xffffff, 0x506479, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(40, 90, 60); world.scene.add(light);
    world.scene.add(new THREE.GridHelper(120, 12, 0x7299aa, 0xc1d6df));
    group = new THREE.Group(); world.scene.add(group);
    controls = new OrbitControls(world.camera, canvas);
    controls.minDistance = 25; controls.maxDistance = 260;
    controls.maxPolarAngle = Math.PI / 2 - .02;
    controls.addEventListener('change', draw);
    new ResizeObserver(draw).observe(canvas);
    fit();
  } catch (error) {
    canvas.hidden = true;
    document.getElementById('cb-canvas').hidden = false;
    document.getElementById('cb-view-3d').disabled = true;
    document.getElementById('cb-view-3d').setAttribute('aria-pressed', 'false');
    document.getElementById('cb-view-top').setAttribute('aria-pressed', 'true');
    status.textContent = '3D is unavailable in this browser. Use the top-view dimension diagram.';
  }
  function draw() {
    if (!world || canvas.hidden) return;
    world.syncSize(); world.renderer.render(world.scene, world.camera);
  }
  function fit() {
    if (!world) return;
    const d = params().r * 2.5;
    world.camera.position.set(d, d * 1.15, d);
    controls.target.set(0, 0, 0); controls.update(); draw();
  }
  function visibility() {
    if (group) group.children.forEach((mesh, i) => { mesh.visible = i < shown; });
    const p = params();
    status.textContent = checks(p).every(c => c.ok)
      ? `Loop: ${shown} of ${p.n} rings built · ${shown ? 'last radius = ' + Number((p.r - (shown - 1) * (p.w + p.gap)).toFixed(2)) + ' mm' : 'ready to add the outer ring'}.`
      : 'Fix the dimensions below before building or exporting.';
    draw();
  }
  function rebuild(p) {
    const key = JSON.stringify(p);
    if (key === current) return;
    current = key; shown = p.n;
    if (group) {
      while (group.children.length) {
        const mesh = group.children[0]; group.remove(mesh);
        mesh.geometry.dispose(); mesh.material.dispose();
      }
      if (checks(p).every(c => c.ok)) rings(p).forEach((g, i) => {
        const shape = new THREE.Shape(); shape.absarc(0, 0, g.R, 0, Math.PI * 2, false);
        const hole = new THREE.Path(); hole.absarc(0, 0, g.r, 0, Math.PI * 2, true); shape.holes.push(hole);
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: g.h, bevelEnabled: false, curveSegments: 32 });
        geometry.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL((190 - i * 150 / Math.max(1, p.n - 1)) / 360, .65, .5), roughness: .38, metalness: .08 }));
        group.add(mesh);
      });
    }
    visibility();
  }
  document.getElementById('cb-step').addEventListener('click', () => { shown = shown >= params().n ? 1 : shown + 1; visibility(); });
  document.getElementById('cb-run').addEventListener('click', () => { shown = params().n; visibility(); });
  document.getElementById('cb-home').addEventListener('click', fit);
  ['3d', 'top'].forEach(mode => document.getElementById('cb-view-' + mode).addEventListener('click', () => {
    canvas.hidden = mode !== '3d'; document.getElementById('cb-canvas').hidden = mode !== 'top';
    ['3d', 'top'].forEach(v => document.getElementById('cb-view-' + v).setAttribute('aria-pressed', String(v === mode)));
    window.dispatchEvent(new Event('resize')); draw();
  }));
  const focus = document.getElementById('cb-focus');
  const anchor = document.createComment('Studio position');
  root.before(anchor);
  function expand(on) {
    if (on) document.body.append(root); else anchor.after(root);
    root.classList.toggle('cb-expanded', on); focus.setAttribute('aria-pressed', String(on));
    focus.textContent = on ? 'Exit studio · Esc' : 'Expand studio';
    document.body.style.overflow = on ? 'hidden' : '';
    window.dispatchEvent(new Event('resize')); draw();
  }
  focus.addEventListener('click', () => expand(!root.classList.contains('cb-expanded')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('cb-expanded')) { expand(false); focus.focus(); } });
  return { rebuild };
}
