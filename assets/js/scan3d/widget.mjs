/**
 * scan3d/widget.mjs — Shared interactive photo-to-3D capture & refinement widget.
 *
 * Supports:
 *  - 3-View orthographic capture (Side, Front, Top)
 *  - 360° Turntable capture (4, 6, or 8 views)
 *  - Live camera capture with orientation guides + file upload
 *  - Per-shot rotate (90°), mirror flip, clear, and eyedropper background pick
 *  - Mask sensitivity slider + "Keep inside colors" toggle with live preview
 *  - Optional 3D Print / Game export (.GLB, .STL, Send to Print Prep via handoff.mjs)
 */

import {
  transformImageData,
  segmentImage,
  carveVolume,
  volumeToMesh,
  encodeColoredGlb,
  encodeStl,
} from './core.mjs';
import { sendAndOpen } from '../handoff.mjs';

const DEFAULT_VIEW_SLOTS = [
  { key: 'side', title: 'Side', hint: 'Facing right', camHint: 'Side: facing right', required: true },
  { key: 'front', title: 'Front', hint: 'Look at the front', camHint: 'Front: look at the front', required: false },
  { key: 'top', title: 'Top', hint: 'Front pointing up', camHint: 'Top: front pointing up', required: false },
];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function makeTurntableSlots(count) {
  const slots = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.round((i * 360) / count);
    const label = angle === 0 ? 'Side (0°)'
      : angle === 90 ? 'Front (90°)'
      : angle === 180 ? 'Other side (180°)'
      : angle === 270 ? 'Back (270°)'
      : `${angle}°`;
    slots.push({
      key: `tt_${i}`,
      angleDeg: angle,
      title: `${angle}°`,
      hint: i === 0 ? 'Facing right' : `Turn ${angle}°`,
      camHint: `Photo ${i + 1}/${count}: ${label}`,
      required: i < 2,
    });
  }
  return slots;
}

/**
 * Mount the shared 3D Scanner UI inside `container`.
 */
export function mountScan3D(container, opts = {}) {
  const {
    subject = 'creation',
    modes = ['views', 'turntable'],
    defaultMode = 'views',
    styleOptions = null,
    defaultStyle = 'mesh',
    defaultProfile = 'rounded',
    forwardAxis = '+z',
    maxDim = 32,
    buildLabel = 'Build 3D scan',
    showExport = true,
    printPrepUrl = null,
    viewSlots = DEFAULT_VIEW_SLOTS,
    introText = 'Place your creation on a plain table or sheet of paper. Fill the frame and keep the background uncluttered.',
    onScan = null,
    onResultReady = null,
  } = opts;

  let captureMode = modes.includes(defaultMode) ? defaultMode : modes[0];
  let styleId = styleOptions?.[0]?.id ? (styleOptions.find((s) => s.id === defaultStyle)?.id || styleOptions[0].id) : defaultStyle;
  let ttCount = 4;
  let thresholdOffset = 0;
  let keepInside = true;
  let bgSamples = [];

  // Map of slot key -> { raw: ImageData, rotate: 0|90|180|270, flipX: boolean, seg: object|null }
  const shots = new Map();
  let lastResult = null;
  let stream = null;
  let camKey = null;

  const hasCam = Boolean(navigator.mediaDevices?.getUserMedia);

  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 's3d';
  root.innerHTML = `
    <p class="s3d-intro">${esc(introText)}</p>
    <div class="s3d-controls-bar">
      ${modes.length > 1 ? `
        <div class="s3d-seg" role="group" aria-label="Capture mode">
          <button type="button" data-s3d-mode="views" aria-pressed="${captureMode === 'views'}">3-View</button>
          <button type="button" data-s3d-mode="turntable" aria-pressed="${captureMode === 'turntable'}">360° Turntable</button>
        </div>
      ` : ''}
      ${styleOptions && styleOptions.length > 1 ? `
        <div class="s3d-seg" role="group" aria-label="Output style">
          ${styleOptions.map((s) => `<button type="button" data-s3d-style="${esc(s.id)}" aria-pressed="${s.id === styleId}">${esc(s.label)}</button>`).join('')}
        </div>
      ` : ''}
    </div>
    <div class="s3d-tt-bar" data-s3d-tt-bar ${captureMode === 'turntable' ? '' : 'hidden'}>
      <label class="s3d-tt-select">
        <span>Turn angles</span>
        <select data-s3d-tt-count>
          <option value="4" selected>4 photos (every 90°)</option>
          <option value="6">6 photos (every 60°)</option>
          <option value="8">8 photos (every 45°)</option>
        </select>
      </label>
      <span class="s3d-hint">Rotate your ${esc(subject)} counter-clockwise on the table.</span>
    </div>
    <div class="s3d-shots" data-s3d-shots></div>
    <div class="s3d-cam" data-s3d-cam hidden>
      <div class="s3d-cam-stage">
        <video playsinline muted></video>
        <div class="s3d-cam-guide" data-s3d-cam-guide></div>
      </div>
      <div class="s3d-cam-actions">
        <button type="button" class="s3d-primary" data-s3d-snap>Snap photo</button>
        <button type="button" data-s3d-cam-close>Close camera</button>
      </div>
    </div>
    <details class="s3d-tune">
      <summary>Refine mask &amp; background</summary>
      <div class="s3d-tune-body">
        <label class="s3d-slider-row">
          <span>Mask sensitivity</span>
          <input type="range" min="-40" max="40" step="2" value="0" data-s3d-sens />
          <output data-s3d-sens-val>Auto</output>
        </label>
        <div class="s3d-tune-row">
          <label class="s3d-check">
            <input type="checkbox" checked data-s3d-inside />
            Keep inside colors
          </label>
          <button type="button" class="s3d-mini-btn" data-s3d-bg-reset hidden>Reset bg pick</button>
        </div>
        <p class="s3d-hint">Tip: click any photo preview to tell the scanner what color the background is.</p>
      </div>
    </details>
    <button type="button" class="s3d-primary s3d-build" data-s3d-build disabled>${esc(buildLabel)}</button>
    <p class="s3d-status" data-s3d-status role="status" aria-live="polite"></p>
    ${showExport ? `
      <div class="s3d-export" data-s3d-export hidden>
        <button type="button" data-s3d-dl-glb>Download .GLB</button>
        <button type="button" data-s3d-dl-stl>Download .STL</button>
        ${printPrepUrl ? '<button type="button" data-s3d-print-prep>Print Prep ↗</button>' : ''}
      </div>
    ` : ''}
  `;
  container.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const shotsEl = $('[data-s3d-shots]');
  const buildBtn = $('[data-s3d-build]');
  const statusEl = $('[data-s3d-status]');
  const camBox = $('[data-s3d-cam]');
  const camVideo = camBox.querySelector('video');
  const camGuide = $('[data-s3d-cam-guide]');
  const bgResetBtn = $('[data-s3d-bg-reset]');
  const exportBar = $('[data-s3d-export]');

  function activeSlots() {
    return captureMode === 'turntable' ? makeTurntableSlots(ttCount) : viewSlots;
  }

  async function imageDataFrom(source) {
    const max = 240;
    const w0 = source.videoWidth || source.width;
    const h0 = source.videoHeight || source.height;
    const k = Math.min(1, max / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.max(8, Math.round(w0 * k));
    c.height = Math.max(8, Math.round(h0 * k));
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(source, 0, 0, c.width, c.height);
    return g.getImageData(0, 0, c.width, c.height);
  }

  function currentSegOpts() {
    return {
      bgColor: bgSamples.length ? bgSamples : null,
      thresholdOffset,
      floodFill: keepInside,
      fillHoles: keepInside,
    };
  }

  const toCanvasImageData = (img) => (typeof ImageData !== 'undefined' && img instanceof ImageData
    ? img
    : new ImageData(new Uint8ClampedArray(img.data), img.width, img.height));

  function refreshShotCard(slot) {
    const card = shotsEl.querySelector(`[data-s3d-shot="${slot.key}"]`);
    if (!card) return;
    const entry = shots.get(slot.key);
    const canvas = card.querySelector('canvas');
    const note = card.querySelector('.s3d-shot-note');
    const tools = card.querySelector('.s3d-shot-tools');

    if (!entry) {
      canvas.width = 160; canvas.height = 120;
      canvas.getContext('2d').clearRect(0, 0, 160, 120);
      card.classList.remove('has-shot', 'bad-shot');
      note.textContent = slot.required ? 'Needed' : 'Optional';
      tools.hidden = true;
      return;
    }

    const img = transformImageData(entry.raw, { rotate: entry.rotate, flipX: entry.flipX });
    const seg = segmentImage(img, currentSegOpts());
    entry.transformed = img;
    entry.seg = seg;

    canvas.width = img.width;
    canvas.height = img.height;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.putImageData(toCanvasImageData(img), 0, 0);
    if (seg) {
      const over = g.getImageData(0, 0, img.width, img.height);
      for (let p = 0; p < seg.mask.length; p++) {
        if (!seg.mask[p]) over.data[p * 4 + 3] = 65;
      }
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.putImageData(over, 0, 0);
      g.strokeStyle = '#ffd400';
      g.lineWidth = Math.max(2, Math.round(Math.max(img.width, img.height) / 90));
      g.strokeRect(seg.bbox.x0, seg.bbox.y0, seg.bbox.x1 - seg.bbox.x0, seg.bbox.y1 - seg.bbox.y0);
    }

    card.classList.add('has-shot');
    card.classList.toggle('bad-shot', !seg);
    note.textContent = seg ? 'Got it' : 'Not found — tap bg or adjust sensitivity';
    tools.hidden = false;
  }

  function updateBuildAvailability() {
    const slots = activeSlots();
    if (captureMode === 'turntable') {
      const loaded = slots.filter((s) => shots.get(s.key)?.seg).length;
      buildBtn.disabled = loaded < 2;
    } else {
      buildBtn.disabled = !shots.get('side')?.seg;
    }
    bgResetBtn.hidden = bgSamples.length === 0;
  }

  function renderSlots() {
    const slots = activeSlots();
    shotsEl.dataset.cols = String(slots.length <= 3 ? 3 : 2);
    shotsEl.innerHTML = slots.map((slot) => `
      <div class="s3d-shot" data-s3d-shot="${esc(slot.key)}">
        <div class="s3d-shot-preview">
          <canvas aria-label="${esc(slot.title)} photo preview — click background to sample color"></canvas>
          <div class="s3d-shot-tools" hidden>
            <button type="button" data-s3d-rot="${esc(slot.key)}" aria-label="Rotate ${esc(slot.title)} photo 90°" title="Rotate 90°">↻</button>
            <button type="button" data-s3d-flip="${esc(slot.key)}" aria-label="Flip ${esc(slot.title)} photo horizontally" title="Flip left/right">⇄</button>
            <button type="button" data-s3d-del="${esc(slot.key)}" aria-label="Remove ${esc(slot.title)} photo" title="Remove">✕</button>
          </div>
        </div>
        <strong>${esc(slot.title)}</strong>
        <small>${esc(slot.hint)}</small>
        <span class="s3d-shot-note">${slot.required ? 'Needed' : 'Optional'}</span>
        <div class="s3d-shot-btns">
          <label class="s3d-filebtn">
            Photo
            <input type="file" accept="image/*" capture="environment" aria-label="Choose ${esc(slot.title)} photo" />
          </label>
          ${hasCam ? `<button type="button" data-s3d-cam-open="${esc(slot.key)}">Camera</button>` : ''}
        </div>
      </div>
    `).join('');

    for (const slot of slots) {
      const card = shotsEl.querySelector(`[data-s3d-shot="${slot.key}"]`);
      const input = card.querySelector('input[type=file]');
      const canvas = card.querySelector('canvas');

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const bmp = await createImageBitmap(file);
          const img = await imageDataFrom(bmp);
          bmp.close?.();
          shots.set(slot.key, { raw: img, rotate: 0, flipX: false, seg: null });
          refreshShotCard(slot);
          updateBuildAvailability();
        } catch {
          statusEl.textContent = 'That file could not be read as an image.';
        }
        input.value = '';
      });

      canvas.addEventListener('click', (e) => {
        const entry = shots.get(slot.key);
        if (!entry?.transformed) return;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = Math.max(0, Math.min(entry.transformed.width - 1, Math.floor(((e.clientX - rect.left) / rect.width) * entry.transformed.width)));
        const py = Math.max(0, Math.min(entry.transformed.height - 1, Math.floor(((e.clientY - rect.top) / rect.height) * entry.transformed.height)));
        const i = (py * entry.transformed.width + px) * 4;
        const picked = [entry.transformed.data[i], entry.transformed.data[i + 1], entry.transformed.data[i + 2]];
        if (bgSamples.length >= 4) bgSamples.shift();
        bgSamples.push(picked);
        refreshAllShots();
        statusEl.textContent = 'Sampled background color from your tap.';
      });

      refreshShotCard(slot);
    }

    updateBuildAvailability();
  }

  function refreshAllShots() {
    for (const slot of activeSlots()) refreshShotCard(slot);
    updateBuildAvailability();
  }

  shotsEl.addEventListener('click', (e) => {
    const rotBtn = e.target.closest('[data-s3d-rot]');
    if (rotBtn) {
      const k = rotBtn.dataset.s3dRot;
      const entry = shots.get(k);
      if (entry) {
        entry.rotate = (entry.rotate + 90) % 360;
        refreshAllShots();
      }
      return;
    }
    const flipBtn = e.target.closest('[data-s3d-flip]');
    if (flipBtn) {
      const k = flipBtn.dataset.s3dFlip;
      const entry = shots.get(k);
      if (entry) {
        entry.flipX = !entry.flipX;
        refreshAllShots();
      }
      return;
    }
    const delBtn = e.target.closest('[data-s3d-del]');
    if (delBtn) {
      shots.delete(delBtn.dataset.s3dDel);
      refreshAllShots();
      return;
    }
    const camBtn = e.target.closest('[data-s3d-cam-open]');
    if (camBtn) {
      openCamera(camBtn.dataset.s3dCamOpen);
    }
  });

  async function openCamera(key) {
    camKey = key;
    const slot = activeSlots().find((s) => s.key === key);
    camGuide.textContent = slot?.camHint || key;
    try {
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
          audio: false,
        });
        camVideo.srcObject = stream;
      }
      camBox.hidden = false;
      await camVideo.play();
    } catch {
      statusEl.textContent = 'No camera available — use Photo upload instead.';
      closeCamera();
    }
  }

  function closeCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    camKey = null;
    camBox.hidden = true;
  }

  $('[data-s3d-snap]').addEventListener('click', async () => {
    if (!camKey) return;
    const img = await imageDataFrom(camVideo);
    shots.set(camKey, { raw: img, rotate: 0, flipX: false, seg: null });
    refreshAllShots();
    const slots = activeSlots();
    const idx = slots.findIndex((s) => s.key === camKey);
    const next = slots.slice(idx + 1).find((s) => !shots.has(s.key));
    if (next) openCamera(next.key);
    else closeCamera();
  });
  $('[data-s3d-cam-close]').addEventListener('click', closeCamera);

  // Mode + style toggles
  $$('[data-s3d-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      captureMode = btn.dataset.s3dMode;
      $$('[data-s3d-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      $('[data-s3d-tt-bar]').hidden = captureMode !== 'turntable';
      closeCamera();
      renderSlots();
    });
  });

  $$('[data-s3d-style]').forEach((btn) => {
    btn.addEventListener('click', () => {
      styleId = btn.dataset.s3dStyle;
      $$('[data-s3d-style]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    });
  });

  $('[data-s3d-tt-count]')?.addEventListener('change', (e) => {
    ttCount = +e.target.value;
    renderSlots();
  });

  const sensInput = $('[data-s3d-sens]');
  const sensVal = $('[data-s3d-sens-val]');
  sensInput.addEventListener('input', () => {
    thresholdOffset = +sensInput.value;
    sensVal.textContent = thresholdOffset === 0 ? 'Auto' : (thresholdOffset > 0 ? `+${thresholdOffset}` : String(thresholdOffset));
    refreshAllShots();
  });

  const insideCheck = $('[data-s3d-inside]');
  insideCheck.addEventListener('change', () => {
    keepInside = insideCheck.checked;
    refreshAllShots();
  });

  bgResetBtn.addEventListener('click', () => {
    bgSamples = [];
    refreshAllShots();
    statusEl.textContent = 'Reset to automatic background detection.';
  });

  function buildScanInput() {
    const segOpts = currentSegOpts();
    const slots = activeSlots();
    if (captureMode === 'turntable') {
      const list = [];
      for (const s of slots) {
        const entry = shots.get(s.key);
        if (!entry) continue;
        list.push({
          angleDeg: s.angleDeg,
          img: entry.transformed || transformImageData(entry.raw, { rotate: entry.rotate, flipX: entry.flipX }),
          seg: entry.seg,
          ...segOpts,
        });
      }
      return list;
    }
    const obj = {};
    for (const s of slots) {
      const entry = shots.get(s.key);
      if (!entry) continue;
      obj[s.key] = {
        img: entry.transformed || transformImageData(entry.raw, { rotate: entry.rotate, flipX: entry.flipX }),
        seg: entry.seg,
        ...segOpts,
      };
    }
    return obj;
  }

  function runScan() {
    statusEl.textContent = 'Carving 3D shape from your photos…';
    try {
      const scanInput = buildScanInput();
      if (onScan) {
        const res = onScan({
          input: scanInput,
          mode: captureMode,
          style: styleId,
          segOpts: currentSegOpts(),
          forwardAxis,
          maxDim,
          defaultProfile,
        });
        if (res) {
          lastResult = res;
          if (exportBar && res.glbBytes && res.stlBytes) exportBar.hidden = false;
          onResultReady?.(res);
          return res;
        }
      }

      const volume = carveVolume(scanInput, {
        maxDim,
        profile: defaultProfile,
        segOpts: currentSegOpts(),
      });
      const mesh = volumeToMesh(volume, {
        style: styleId === 'voxels' ? 'voxel' : 'smooth',
        forwardAxis,
        targetSize: 1.0,
      });
      const glbBytes = encodeColoredGlb(mesh, { name: `Scanned_${subject}` });
      const stlBytes = encodeStl(mesh, { sizeMm: 80, header: `ClassroomOS ${subject}` });
      const res = {
        volume,
        mesh,
        glbBytes,
        stlBytes,
        mode: captureMode,
        style: styleId,
        report: {
          voxels: volume.voxelCount,
          triangles: mesh.triangleCount,
          views: volume.viewsUsed,
        },
      };
      lastResult = res;
      if (exportBar) exportBar.hidden = false;
      statusEl.textContent = `Built 3D ${subject} (${mesh.triangleCount} triangles from ${volume.viewsUsed.length} view${volume.viewsUsed.length > 1 ? 's' : ''}).`;
      onResultReady?.(res);
      return res;
    } catch (err) {
      statusEl.textContent = err.message || 'Scan failed. Check your photos and try again.';
      return null;
    }
  }

  buildBtn.addEventListener('click', () => {
    buildBtn.disabled = true;
    requestAnimationFrame(() => {
      runScan();
      updateBuildAvailability();
    });
  });

  function downloadBlob(bytes, filename, mime) {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  if (exportBar) {
    $('[data-s3d-dl-glb]')?.addEventListener('click', () => {
      if (!lastResult?.glbBytes) return;
      downloadBlob(lastResult.glbBytes, `scanned-${subject}.glb`, 'model/gltf-binary');
    });
    $('[data-s3d-dl-stl]')?.addEventListener('click', () => {
      if (!lastResult?.stlBytes) return;
      downloadBlob(lastResult.stlBytes, `scanned-${subject}.stl`, 'model/stl');
    });
    $('[data-s3d-print-prep]')?.addEventListener('click', async () => {
      if (!lastResult?.stlBytes || !printPrepUrl) return;
      try {
        await sendAndOpen(printPrepUrl, {
          bytes: lastResult.stlBytes,
          filename: `scanned-${subject}.stl`,
          from: '3D Scanner',
        });
      } catch (err) {
        statusEl.textContent = err.message;
      }
    });
  }

  renderSlots();

  return {
    setShot(key, img) {
      shots.set(key, { raw: img, rotate: 0, flipX: false, seg: null });
      refreshAllShots();
    },
    setMode(m) {
      if (!modes.includes(m)) return;
      captureMode = m;
      $$('[data-s3d-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s3dMode === m)));
      $('[data-s3d-tt-bar]').hidden = captureMode !== 'turntable';
      renderSlots();
    },
    setStyle(s) {
      styleId = s;
      $$('[data-s3d-style]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s3dStyle === s)));
    },
    setStatus(msg) {
      statusEl.textContent = msg;
    },
    showExportResult(res) {
      lastResult = res;
      if (exportBar) exportBar.hidden = !(res?.glbBytes && res?.stlBytes);
    },
    runScan,
    getState: () => ({ captureMode, styleId, shots, lastResult }),
    destroy() {
      closeCamera();
      container.innerHTML = '';
    },
  };
}
