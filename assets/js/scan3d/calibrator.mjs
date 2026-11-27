/**
 * scan3d/calibrator.mjs — Interactive Three.js 3D preview + landmark dot calibrator.
 *
 * Shared by the Classroom Fish Tank (`fish-upload.html`) and Brick Rally (`brick-rally.html`)
 * so any scanned photo-model or uploaded `.stl`/`.glb` uses the same orient-by-dots UX.
 * Runs exclusively on the repo's pinned `assets/vendor/three-bundle.min.js`.
 */

import { THREE, OrbitControls, STLLoader, GLTFLoader } from '../../vendor/three-bundle.min.js';
import { computeOrientationMatrix } from './core.mjs';

export const FISH_LANDMARKS = [
  { id: 'head', label: 'Head', color: 0xff3333, prompt: 'Click the HEAD on the 3D model' },
  { id: 'tail', label: 'Tail', color: 0x2288ff, prompt: 'Click the TAIL end' },
  { id: 'back', label: 'Back', color: 0x34d399, prompt: 'Click the TOP / BACK (fixes roll)' },
  { id: 'fin', label: 'Fins', color: 0xffcc00, max: 2, optional: true, prompt: 'Optional: click up to 2 fins, or continue' },
];

export const CAR_LANDMARKS = [
  { id: 'front', label: 'Nose', color: 0xff3333, prompt: 'Click the FRONT / NOSE of the model' },
  { id: 'rear', label: 'Rear', color: 0x2288ff, prompt: 'Click the REAR / BACK bumper' },
  { id: 'top', label: 'Roof', color: 0x34d399, prompt: 'Click the ROOF / TOP (fixes roll)' },
];

function arrayBufferFromInput(input) {
  if (input instanceof ArrayBuffer) return Promise.resolve(input);
  if (ArrayBuffer.isView(input)) return Promise.resolve(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
  return fetch(input).then(r => r.arrayBuffer());
}

/**
 * Mount a 3D preview & dot-placement calibrator on `canvas`.
 */
export function createCalibrator(canvas, opts = {}) {
  const {
    previewTarget = 2.5,
    background = 0x020d1a,
    showGrid = true,
    landmarks = FISH_LANDMARKS,
    defaultColor = '#4fc3f7',
    onChange = null,
    onGuide = null,
  } = opts;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(background, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 200);
  camera.position.set(0, 1.1, 5.2);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  scene.add(new THREE.HemisphereLight(0xd8f0ff, 0x26384a, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(5, 10, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x4488dd, 0.9);
  fill.position.set(-5, 2, -4);
  scene.add(fill);

  if (showGrid) {
    const grid = new THREE.GridHelper(8, 14, 0x163046, 0x0c1b29);
    grid.position.y = -1.75;
    scene.add(grid);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const markerGeo = new THREE.SphereGeometry(0.1, 12, 12);

  let modelObj = null;
  let solidColor = defaultColor;
  let mode = landmarks[0]?.id || 'done';
  let dots = {};
  let dotMeshes = {};
  let disposed = false;
  let rafId = 0;

  const initDotState = () => {
    dots = {};
    dotMeshes = {};
    for (const lm of landmarks) {
      if ((lm.max || 1) > 1) {
        dots[lm.id] = [];
        dotMeshes[lm.id] = [];
      } else {
        dots[lm.id] = null;
        dotMeshes[lm.id] = null;
      }
    }
  };
  initDotState();

  function clearModel() {
    if (!modelObj) return;
    scene.remove(modelObj);
    modelObj.traverse?.((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        const m = o.material;
        (Array.isArray(m) ? m : [m]).forEach((mm) => mm?.dispose?.());
      }
    });
    modelObj = null;
  }

  function clearDotMeshes() {
    for (const lm of landmarks) {
      const m = dotMeshes[lm.id];
      if (Array.isArray(m)) m.forEach((x) => scene.remove(x));
      else if (m) scene.remove(m);
    }
    initDotState();
  }

  function makeMarker(color) {
    const mat = new THREE.MeshBasicMaterial({ color, depthTest: false });
    const m = new THREE.Mesh(markerGeo, mat);
    m.renderOrder = 999;
    return m;
  }

  function nextUnplacedMode() {
    for (const lm of landmarks) {
      if ((lm.max || 1) > 1) {
        if (!lm.optional && dots[lm.id].length < lm.max) return lm.id;
      } else if (!dots[lm.id]) {
        return lm.id;
      }
    }
    const opt = landmarks.find((l) => l.optional && (l.max || 1) > 1 && dots[l.id].length < l.max);
    if (opt && mode === opt.id) return opt.id;
    const firstOpt = landmarks.find((l) => l.optional);
    if (firstOpt && mode !== 'done') return firstOpt.id;
    return 'done';
  }

  function emitChange() {
    const lm = landmarks.find((l) => l.id === mode);
    const guide = mode === 'done'
      ? 'All set! Ready to use.'
      : (lm?.prompt || 'Click on the model to place a marker');
    onGuide?.(mode, guide);
    onChange?.({ mode, guide, dots: getDots() });
  }

  function setMode(nextMode) {
    mode = nextMode;
    emitChange();
  }

  function resetDots() {
    clearDotMeshes();
    mode = landmarks[0]?.id || 'done';
    emitChange();
  }

  function placeDot(id, pt) {
    const lm = landmarks.find((l) => l.id === id);
    if (!lm) return;
    if ((lm.max || 1) > 1) {
      if (dots[id].length >= lm.max) {
        const old = dotMeshes[id].shift();
        if (old) scene.remove(old);
        dots[id].shift();
      }
      const m = makeMarker(lm.color);
      m.position.set(pt[0], pt[1], pt[2]);
      scene.add(m);
      dotMeshes[id].push(m);
      dots[id].push([pt[0], pt[1], pt[2]]);
      if (dots[id].length >= lm.max) {
        mode = 'done';
      }
    } else {
      if (dotMeshes[id]) scene.remove(dotMeshes[id]);
      const m = makeMarker(lm.color);
      m.position.set(pt[0], pt[1], pt[2]);
      scene.add(m);
      dotMeshes[id] = m;
      dots[id] = [pt[0], pt[1], pt[2]];
      const idx = landmarks.indexOf(lm);
      const next = landmarks.slice(idx + 1).find((l) => (l.max || 1) > 1 || !dots[l.id]);
      mode = next ? next.id : nextUnplacedMode();
    }
    emitChange();
  }

  function setDots(dotData) {
    clearDotMeshes();
    if (!dotData) {
      mode = landmarks[0]?.id || 'done';
      emitChange();
      return;
    }
    for (const lm of landmarks) {
      const val = dotData[lm.id] ?? (lm.id === 'fin' ? dotData.fins : null);
      if ((lm.max || 1) > 1 && Array.isArray(val)) {
        for (const p of val.slice(0, lm.max)) {
          if (!Array.isArray(p) || p.length < 3) continue;
          const m = makeMarker(lm.color);
          m.position.set(p[0], p[1], p[2]);
          scene.add(m);
          dotMeshes[lm.id].push(m);
          dots[lm.id].push([p[0], p[1], p[2]]);
        }
      } else if (Array.isArray(val) && val.length >= 3) {
        const m = makeMarker(lm.color);
        m.position.set(val[0], val[1], val[2]);
        scene.add(m);
        dotMeshes[lm.id] = m;
        dots[lm.id] = [val[0], val[1], val[2]];
      }
    }
    const requiredDone = landmarks.filter((l) => !l.optional).every((l) => Boolean(dots[l.id]));
    mode = requiredDone ? 'done' : nextUnplacedMode();
    emitChange();
  }

  function getDots() {
    const out = { scale: previewTarget };
    for (const lm of landmarks) {
      if ((lm.max || 1) > 1) {
        out[lm.id === 'fin' ? 'fins' : lm.id] = dots[lm.id].map((p) => [...p]);
      } else {
        out[lm.id] = dots[lm.id] ? [...dots[lm.id]] : null;
      }
    }
    return out;
  }

  function fitObject(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    const maxExt = Math.max(sz.x, sz.y, sz.z) || 1;
    const s = previewTarget / maxExt;
    obj.scale.multiplyScalar(s);
    obj.position.sub(center.multiplyScalar(s));
    obj.updateMatrixWorld(true);
  }

  function loadScanMesh(mesh) {
    clearModel();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mesh.positions), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(mesh.normals), 3));
    if (mesh.colors) {
      const lin = new Float32Array(mesh.colors.length);
      const tmp = new THREE.Color();
      for (let i = 0; i < lin.length; i += 3) {
        tmp.setRGB(mesh.colors[i], mesh.colors[i + 1], mesh.colors[i + 2], THREE.SRGBColorSpace);
        lin[i] = tmp.r; lin[i + 1] = tmp.g; lin[i + 2] = tmp.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(lin, 3));
    }
    if (mesh.indices) geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    geo.computeBoundingBox();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: Boolean(mesh.colors),
      color: mesh.colors ? 0xffffff : new THREE.Color(solidColor),
      roughness: 0.5,
      metalness: 0.06,
    });
    const m = new THREE.Mesh(geo, mat);
    fitObject(m);
    modelObj = m;
    scene.add(modelObj);
    resetDots();
  }

  async function loadSTL(input, colorHex = solidColor) {
    solidColor = colorHex;
    const buf = await arrayBufferFromInput(input);
    const geo = new STLLoader().parse(buf);
    geo.computeVertexNormals();
    clearModel();
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(solidColor),
      roughness: 0.42,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    fitObject(m);
    modelObj = m;
    scene.add(modelObj);
    resetDots();
  }

  async function loadGLB(input) {
    const loader = new GLTFLoader();
    const gltf = await new Promise((res, rej) => {
      if (typeof input === 'string') {
        loader.load(input, res, undefined, rej);
      } else {
        arrayBufferFromInput(input).then((buf) => loader.parse(buf, '', res, rej)).catch(rej);
      }
    });
    clearModel();
    const root = gltf.scene;
    fitObject(root);
    modelObj = root;
    scene.add(modelObj);
    resetDots();
  }

  function setColor(hex) {
    solidColor = hex;
    if (!modelObj) return;
    modelObj.traverse?.((o) => {
      if (o.isMesh && o.material && !o.material.vertexColors && o.material.color) {
        o.material.color.set(hex);
      }
    });
  }

  /**
   * Extract a normalized, oriented `{ positions, normals, colors, indices, bounds }`
   * mesh from whatever model is currently loaded in the calibrator.
   */
  function extractOrientedMesh({ forwardAxis = '+z', centerY = false } = {}) {
    if (!modelObj) return null;
    modelObj.updateMatrixWorld(true);
    const pos = [];
    const col = [];
    const indices = [];
    const tmpV = new THREE.Vector3();
    const tmpC = new THREE.Color();

    modelObj.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const geo = o.geometry;
      const pAttr = geo.getAttribute('position');
      if (!pAttr) return;
      const cAttr = geo.getAttribute('color');
      const matColor = o.material?.color ? o.material.color : new THREE.Color(solidColor);
      const base = pos.length / 3;

      for (let i = 0; i < pAttr.count; i++) {
        tmpV.fromBufferAttribute(pAttr, i).applyMatrix4(o.matrixWorld);
        pos.push(tmpV.x, tmpV.y, tmpV.z);
        if (cAttr) {
          tmpC.setRGB(cAttr.getX(i), cAttr.getY(i), cAttr.getZ(i));
          tmpC.convertLinearToSRGB();
          col.push(tmpC.r, tmpC.g, tmpC.b);
        } else {
          tmpC.copy(matColor).convertLinearToSRGB();
          col.push(tmpC.r, tmpC.g, tmpC.b);
        }
      }
      if (geo.index) {
        const idxArr = geo.index.array;
        for (let i = 0; i < idxArr.length; i++) indices.push(base + idxArr[i]);
      } else {
        for (let i = 0; i < pAttr.count; i++) indices.push(base + i);
      }
    });

    if (!pos.length) return null;
    const d = getDots();
    const m4 = computeOrientationMatrix(d, { forwardAxis });
    const positions = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      positions[i]     = m4[0] * x + m4[4] * y + m4[8] * z;
      positions[i + 1] = m4[1] * x + m4[5] * y + m4[9] * z;
      positions[i + 2] = m4[2] * x + m4[6] * y + m4[10] * z;
    }

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        if (positions[i + k] < min[k]) min[k] = positions[i + k];
        if (positions[i + k] > max[k]) max[k] = positions[i + k];
      }
    }
    const cx = (min[0] + max[0]) / 2;
    const cy = centerY ? (min[1] + max[1]) / 2 : min[1];
    const cz = (min[2] + max[2]) / 2;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] -= cx;
      positions[i + 1] -= cy;
      positions[i + 2] -= cz;
    }
    const nv = positions.length / 3;
    const idxOut = nv > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
    const normals = new Float32Array(positions.length);
    for (let i = 0; i < idxOut.length; i += 3) {
      const ia = idxOut[i] * 3, ib = idxOut[i + 1] * 3, ic = idxOut[i + 2] * 3;
      const ux = positions[ib] - positions[ia], uy = positions[ib + 1] - positions[ia + 1], uz = positions[ib + 2] - positions[ia + 2];
      const vx = positions[ic] - positions[ia], vy = positions[ic + 1] - positions[ia + 1], vz = positions[ic + 2] - positions[ia + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      normals[ia] += nx; normals[ia + 1] += ny; normals[ia + 2] += nz;
      normals[ib] += nx; normals[ib + 1] += ny; normals[ib + 2] += nz;
      normals[ic] += nx; normals[ic + 1] += ny; normals[ic + 2] += nz;
    }
    for (let i = 0; i < normals.length; i += 3) {
      const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
      normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len;
    }
    const bMin = [Infinity, Infinity, Infinity];
    const bMax = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        if (positions[i + k] < bMin[k]) bMin[k] = positions[i + k];
        if (positions[i + k] > bMax[k]) bMax[k] = positions[i + k];
      }
    }
    return {
      positions,
      normals,
      colors: new Float32Array(col),
      indices: idxOut,
      bounds: { min: bMin, max: bMax, size: [bMax[0] - bMin[0], bMax[1] - bMin[1], bMax[2] - bMin[2]] },
      vertexCount: nv,
      triangleCount: idxOut.length / 3,
    };
  }

  let down = null;
  const onPointerDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6 || !modelObj || mode === 'done') return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(modelObj, true);
    if (!hits.length) return;
    const p = hits[0].point;
    placeDot(mode, [p.x, p.y, p.z]);
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  function resize() {
    const parent = canvas.parentElement;
    const w = parent ? parent.clientWidth : canvas.clientWidth;
    const h = canvas.clientHeight || 260;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let ro = null;
  if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
    ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement);
  }
  resize();

  const loop = () => {
    if (disposed) return;
    rafId = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  };
  loop();

  return {
    loadScanMesh,
    loadSTL,
    loadGLB,
    setMode,
    setDots,
    resetDots,
    getDots,
    setColor,
    extractOrientedMesh,
    resize,
    hasModel: () => Boolean(modelObj),
    dispose() {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      clearDotMeshes();
      clearModel();
      markerGeo.dispose();
      controls.dispose();
      renderer.dispose();
    },
  };
}
