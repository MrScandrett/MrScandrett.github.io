import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { rings, checks } from './codeblocks-rings.mjs';

export function createRingStudio(params) {
  const canvas = document.getElementById('cb-3d');
  const status = document.getElementById('cb-execution');
  const playBtn = document.getElementById('cb-play-rings');
  let world, controls, group, gridHelper, shown = params().n, current;
  let playing = false, playTimer = null;

  function themeBg() {
    const bg = window.SimKit?.theme?.colors?.()?.bg;
    return bg || '#eaf2f5';
  }
  function rebuildGrid(isDark) {
    if (!world) return;
    if (gridHelper) {
      world.scene.remove(gridHelper);
      gridHelper.geometry?.dispose();
      if (Array.isArray(gridHelper.material)) gridHelper.material.forEach((m) => m.dispose());
      else gridHelper.material?.dispose();
    }
    gridHelper = new THREE.GridHelper(
      120,
      12,
      isDark ? 0x64748b : 0x7299aa,
      isDark ? 0x334155 : 0xc1d6df
    );
    world.scene.add(gridHelper);
  }
  function syncTheme() {
    if (!world) return;
    const bg = themeBg();
    const c = new THREE.Color(bg);
    world.scene.background = c;
    canvas.style.background = bg;
    const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
    rebuildGrid(lum < 0.5);
    draw();
  }

  // Keep the dimension diagram and exports usable when WebGL is unavailable.
  try {
    world = createScene(canvas, { THREE, far: 1000, clearColor: new THREE.Color(themeBg()).getHex() });
    world.scene.add(new THREE.HemisphereLight(0xffffff, 0x506479, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(40, 90, 60);
    world.scene.add(light);
    group = new THREE.Group();
    world.scene.add(group);
    syncTheme();
    window.SimKit?.theme?.onChange?.(syncTheme);
    controls = new OrbitControls(world.camera, canvas);
    controls.minDistance = 25;
    controls.maxDistance = 260;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
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
    world.syncSize();
    world.renderer.render(world.scene, world.camera);
  }
  function fit() {
    if (!world) return;
    const d = params().r * 2.5;
    world.camera.position.set(d, d * 1.15, d);
    controls.target.set(0, 0, 0);
    controls.update();
    draw();
  }
  function stopPlay() {
    clearTimeout(playTimer);
    playTimer = null;
    if (!playing) return;
    playing = false;
    if (playBtn) {
      playBtn.textContent = 'Play loop';
      playBtn.setAttribute('aria-pressed', 'false');
    }
  }
  function visibility() {
    if (group) group.children.forEach((mesh, i) => { mesh.visible = i < shown; });
    const p = params();
    status.textContent = checks(p).every((c) => c.ok)
      ? `Loop: ${shown} of ${p.n} rings built · ${shown ? 'last radius = ' + Number((p.r - (shown - 1) * (p.w + p.gap)).toFixed(2)) + ' mm' : 'ready to add the outer ring'}.`
      : 'Fix the dimensions below before building or exporting.';
    draw();
  }
  function tickPlay() {
    if (!playing) return;
    const p = params();
    if (shown < p.n) {
      shown++;
      visibility();
      playTimer = setTimeout(tickPlay, 480);
    } else {
      stopPlay();
    }
  }
  function rebuild(p) {
    const key = JSON.stringify(p);
    if (key === current) return;
    stopPlay();
    current = key;
    shown = p.n;
    if (group) {
      while (group.children.length) {
        const mesh = group.children[0];
        group.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      if (checks(p).every((c) => c.ok)) {
        rings(p).forEach((g, i) => {
          const shape = new THREE.Shape();
          shape.absarc(0, 0, g.R, 0, Math.PI * 2, false);
          const hole = new THREE.Path();
          hole.absarc(0, 0, g.r, 0, Math.PI * 2, true);
          shape.holes.push(hole);
          const geometry = new THREE.ExtrudeGeometry(shape, { depth: g.h, bevelEnabled: false, curveSegments: 64 });
          geometry.rotateX(-Math.PI / 2);
          const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
              color: new THREE.Color().setHSL((190 - (i * 150) / Math.max(1, p.n - 1)) / 360, 0.65, 0.5),
              roughness: 0.38,
              metalness: 0.08
            })
          );
          group.add(mesh);
        });
      }
    }
    visibility();
  }

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (playing) {
        stopPlay();
        return;
      }
      const p = params();
      if (checks(p).some((c) => !c.ok)) return;
      playing = true;
      playBtn.textContent = 'Pause loop';
      playBtn.setAttribute('aria-pressed', 'true');
      shown = 1;
      visibility();
      playTimer = setTimeout(tickPlay, 480);
    });
  }
  document.getElementById('cb-step').addEventListener('click', () => {
    stopPlay();
    shown = shown >= params().n ? 1 : shown + 1;
    visibility();
  });
  document.getElementById('cb-run').addEventListener('click', () => {
    stopPlay();
    shown = params().n;
    visibility();
  });
  document.getElementById('cb-home').addEventListener('click', fit);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPlay();
  });
  ['3d', 'top'].forEach((mode) =>
    document.getElementById('cb-view-' + mode).addEventListener('click', () => {
      canvas.hidden = mode !== '3d';
      document.getElementById('cb-canvas').hidden = mode !== 'top';
      ['3d', 'top'].forEach((v) =>
        document.getElementById('cb-view-' + v).setAttribute('aria-pressed', String(v === mode))
      );
      window.dispatchEvent(new Event('resize'));
      draw();
    })
  );
  return { rebuild };
}
