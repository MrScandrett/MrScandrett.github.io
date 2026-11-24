import { THREE, OrbitControls, GLTFLoader, MeshoptDecoder } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

const canvas = document.getElementById('vrm-canvas');
const wrap = document.getElementById('vrm-canvas-wrap');
const loadingEl = document.getElementById('vrm-loading');
const fallbackEl = document.getElementById('vrm-fallback');
const hudTitle = document.getElementById('vrm-hud-title');
const hudHint = document.getElementById('vrm-hud-hint');
const statMeshes = document.getElementById('vrm-stat-meshes');
const statTris = document.getElementById('vrm-stat-tris');
const statDims = document.getElementById('vrm-stat-dims');
const statStatus = document.getElementById('vrm-stat-status');
const noteEl = document.getElementById('vrm-specimen-note');

const presetBtns = Array.from(document.querySelectorAll('.vrm-preset-btn'));
const fileInput = document.getElementById('vrm-file-input');
const btnOrbit = document.getElementById('vrm-toggle-orbit');
const btnWire = document.getElementById('vrm-toggle-wire');
const btnGrid = document.getElementById('vrm-toggle-grid');
const btnLight = document.getElementById('vrm-toggle-light');
const btnReset = document.getElementById('vrm-reset-cam');

if (canvas && wrap) {
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {
    autoOrbit: !prefersReducedMotion,
    wireframe: false,
    showGrid: true,
    brightStudio: false,
    activeObjectUrl: null
  };

  let sceneBundle = null;
  let controls = null;
  let specimenRoot = null;
  let bboxHelper = null;
  let scaleGroup = null;
  let hemiLight = null;
  let keyLight = null;
  let fillLight = null;
  let rafId = 0;

  try {
    sceneBundle = createScene(canvas, { THREE, fov: 42, near: 0.05, far: 120, clearAlpha: 0 });
  } catch (err) {
    if (loadingEl) loadingEl.hidden = true;
    if (fallbackEl) {
      fallbackEl.hidden = false;
      fallbackEl.textContent = 'WebGL 3D preview is unavailable on this browser context, but all telemetry rules and GLB upload checklists below still apply.';
    }
  }

  if (sceneBundle) {
    const { renderer, scene, camera, syncSize } = sceneBundle;
    camera.position.set(2.4, 1.65, 2.8);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.7;
    controls.maxDistance = 12;
    controls.target.set(0, 0.55, 0);

    hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x334155, 0.85);
    scene.add(hemiLight);

    keyLight = new THREE.DirectionalLight(0xfff7ed, 2.1);
    keyLight.position.set(3.5, 5.2, 4.0);
    scene.add(keyLight);

    fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    fillLight.position.set(-4.0, 2.5, -3.0);
    scene.add(fillLight);

    scaleGroup = new THREE.Group();
    const grid = new THREE.GridHelper(4, 16, 0x6366f1, 0x334155);
    scaleGroup.add(grid);

    // 1-meter gallery pedestal bar at front edge for scale judgement
    const barGeo = new THREE.BoxGeometry(1.0, 0.03, 0.04);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4, metalness: 0.1 });
    const oneMeterBar = new THREE.Mesh(barGeo, barMat);
    oneMeterBar.position.set(0, 0.015, 1.15);
    scaleGroup.add(oneMeterBar);
    scene.add(scaleGroup);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    const disposeSpecimen = () => {
      if (bboxHelper) {
        scene.remove(bboxHelper);
        bboxHelper.dispose();
        bboxHelper = null;
      }
      if (!specimenRoot) return;
      scene.remove(specimenRoot);
      specimenRoot.traverse((node) => {
        if (node.isMesh) {
          if (node.geometry) node.geometry.dispose();
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((m) => {
            if (!m) return;
            ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach((k) => {
              if (m[k] && typeof m[k].dispose === 'function') m[k].dispose();
            });
            m.dispose();
          });
        }
      });
      specimenRoot = null;
    };

    const applyWireframe = (root, enabled) => {
      if (!root) return;
      root.traverse((node) => {
        if (!node.isMesh) return;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach((m) => {
          if (m) m.wireframe = enabled;
        });
      });
    };

    const updateLighting = () => {
      if (state.brightStudio) {
        hemiLight.intensity = 1.45;
        keyLight.intensity = 2.4;
        fillLight.intensity = 1.35;
      } else {
        hemiLight.intensity = 0.72;
        keyLight.intensity = 2.3;
        fillLight.intensity = 0.6;
      }
      if (btnLight) {
        btnLight.setAttribute('aria-pressed', String(state.brightStudio));
        btnLight.textContent = state.brightStudio ? 'Lighting: Bright Studio' : 'Lighting: Museum Spotlight';
      }
    };

    const resetView = () => {
      camera.position.set(2.3, 1.55, 2.7);
      controls.target.set(0, 0.55, 0);
      controls.update();
    };

    const loadModel = (url, title, note, isCustomBlob = false) => {
      if (loadingEl) {
        loadingEl.hidden = false;
        loadingEl.textContent = `Loading ${title}…`;
      }
      if (fallbackEl) fallbackEl.hidden = true;
      if (hudTitle) hudTitle.textContent = title;
      if (noteEl && note) noteEl.textContent = note;

      loader.load(
        url,
        (gltf) => {
          disposeSpecimen();
          specimenRoot = gltf.scene || gltf.scenes[0];

          let meshCount = 0;
          let triCount = 0;
          const materials = new Set();
          specimenRoot.traverse((node) => {
            if (node.isMesh) {
              meshCount += 1;
              const geo = node.geometry;
              if (geo) {
                if (geo.index) {
                  triCount += Math.round(geo.index.count / 3);
                } else if (geo.attributes && geo.attributes.position) {
                  triCount += Math.round(geo.attributes.position.count / 3);
                }
              }
              const mats = Array.isArray(node.material) ? node.material : [node.material];
              mats.forEach((m) => {
                if (m) materials.add(m);
              });
            }
          });

          const rawBox = new THREE.Box3().setFromObject(specimenRoot);
          const rawSize = new THREE.Vector3();
          const rawCenter = new THREE.Vector3();
          rawBox.getSize(rawSize);
          rawBox.getCenter(rawCenter);

          const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.0001);
          const targetExtent = 1.65;
          const fitScale = targetExtent / maxDim;

          const pivot = new THREE.Group();
          specimenRoot.position.sub(rawCenter);
          specimenRoot.position.y += rawSize.y * 0.5;
          pivot.add(specimenRoot);
          pivot.scale.setScalar(fitScale);
          specimenRoot = pivot;

          applyWireframe(specimenRoot, state.wireframe);
          scene.add(specimenRoot);

          bboxHelper = new THREE.Box3Helper(new THREE.Box3().setFromObject(specimenRoot), 0x38bdf8);
          bboxHelper.visible = state.showGrid;
          scene.add(bboxHelper);

          if (statMeshes) statMeshes.textContent = `${meshCount} mesh${meshCount === 1 ? '' : 'es'} · ${materials.size} mat`;
          if (statTris) statTris.textContent = triCount.toLocaleString() + ' tris';
          if (statDims) {
            statDims.textContent = `${rawSize.x.toFixed(2)} × ${rawSize.y.toFixed(2)} × ${rawSize.z.toFixed(2)} u`;
          }
          if (statStatus) {
            const overBudget = triCount > 100000;
            statStatus.className = 'vrm-metric-v ' + (overBudget ? 'warn' : 'ok');
            statStatus.textContent = overBudget ? 'Heavy (>100k tris — decimate)' : 'VR Ready (.glb)';
          }
          if (hudHint) {
            hudHint.textContent = `${triCount.toLocaleString()} tris · drag to orbit · scroll to zoom`;
          }

          resetView();
          if (loadingEl) loadingEl.hidden = true;
          if (isCustomBlob && state.activeObjectUrl === url) {
            URL.revokeObjectURL(url);
            state.activeObjectUrl = null;
          }
        },
        undefined,
        () => {
          if (loadingEl) loadingEl.hidden = true;
          if (fallbackEl) {
            fallbackEl.hidden = false;
            fallbackEl.textContent = 'Could not decode that .glb/.gltf file. Verify it is an uncorrupted binary .glb with embedded textures.';
          }
        }
      );
    };

    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        presetBtns.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
        loadModel(btn.dataset.modelUrl, btn.dataset.modelTitle, btn.dataset.modelNote);
      });
    });

    if (fileInput) {
      fileInput.addEventListener('change', (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        if (state.activeObjectUrl) URL.revokeObjectURL(state.activeObjectUrl);
        const blobUrl = URL.createObjectURL(file);
        state.activeObjectUrl = blobUrl;
        presetBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        loadModel(
          blobUrl,
          file.name,
          'Custom local file inspected in browser memory (never uploaded to a server). Check polygon count and real-world dimensions above.',
          true
        );
      });
    }

    if (btnOrbit) {
      btnOrbit.setAttribute('aria-pressed', String(state.autoOrbit));
      btnOrbit.addEventListener('click', () => {
        state.autoOrbit = !state.autoOrbit;
        btnOrbit.setAttribute('aria-pressed', String(state.autoOrbit));
      });
    }

    if (btnWire) {
      btnWire.addEventListener('click', () => {
        state.wireframe = !state.wireframe;
        btnWire.setAttribute('aria-pressed', String(state.wireframe));
        applyWireframe(specimenRoot, state.wireframe);
      });
    }

    if (btnGrid) {
      btnGrid.setAttribute('aria-pressed', String(state.showGrid));
      btnGrid.addEventListener('click', () => {
        state.showGrid = !state.showGrid;
        btnGrid.setAttribute('aria-pressed', String(state.showGrid));
        if (scaleGroup) scaleGroup.visible = state.showGrid;
        if (bboxHelper) bboxHelper.visible = state.showGrid;
      });
    }

    if (btnLight) {
      btnLight.addEventListener('click', () => {
        state.brightStudio = !state.brightStudio;
        updateLighting();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', resetView);
    }

    updateLighting();

    let lastT = performance.now();
    const tick = (now) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      syncSize();
      if (state.autoOrbit && specimenRoot) {
        specimenRoot.rotation.y += dt * 0.35;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(tick);

    const firstPreset = presetBtns[0];
    if (firstPreset) {
      loadModel(firstPreset.dataset.modelUrl, firstPreset.dataset.modelTitle, firstPreset.dataset.modelNote);
    }

    window.addEventListener('beforeunload', () => {
      cancelAnimationFrame(rafId);
      disposeSpecimen();
      sceneBundle.dispose();
    });
  }
}
