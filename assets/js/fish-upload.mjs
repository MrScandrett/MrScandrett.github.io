/**
 * fish-upload.mjs — Connects the Classroom Fish Tank upload form to the shared
 * ClassroomOS 3D Scanner (`scan3d/widget.mjs`) and 3D dot calibrator (`scan3d/calibrator.mjs`).
 */

import { mountScan3D } from './scan3d/widget.mjs';
import { createCalibrator, FISH_LANDMARKS } from './scan3d/calibrator.mjs';
import { defaultDotsForMesh, bytesToDataUrl } from './scan3d/core.mjs';

const PREVIEW_TARGET = 2.5;
const MAX_GLB_BYTES = 2 * 1024 * 1024;

const $scanMount = document.getElementById('fish-scan-mount');
const $tabScan = document.getElementById('tab-scan');
const $tabFile = document.getElementById('tab-file');
const $paneScan = document.getElementById('pane-scan');
const $paneFile = document.getElementById('pane-file');

const $section = document.getElementById('stl-preview-section');
const $canvas = document.getElementById('stl-preview-canvas');
const $guide = document.getElementById('dot-guide');
const $headBtn = document.getElementById('dot-btn-head');
const $tailBtn = document.getElementById('dot-btn-tail');
const $backBtn = document.getElementById('dot-btn-back');
const $finBtn = document.getElementById('dot-btn-fin');
const $resetBtn = document.getElementById('dot-reset-btn');
const $statHead = document.getElementById('dot-stat-head');
const $statTail = document.getElementById('dot-stat-tail');
const $statBack = document.getElementById('dot-stat-back');
const $statFin = document.getElementById('dot-stat-fin');
const $stlError = document.getElementById('stl-error');

const GUIDE_PREFIX = {
  head: '🔴 ',
  tail: '🔵 ',
  back: '🔺 ',
  fin: '🟡 ',
  done: '✅ ',
};

let calibrator = null;

function updateDotStatus(dots) {
  $statHead.textContent = dots?.head ? '🔴 Head ✓' : '🔴 Head';
  $statHead.classList.toggle('placed', Boolean(dots?.head));
  $statTail.textContent = dots?.tail ? '🔵 Tail ✓' : '🔵 Tail';
  $statTail.classList.toggle('placed', Boolean(dots?.tail));
  $statBack.textContent = dots?.back ? '🔺 Back ✓' : '🔺 Back';
  $statBack.classList.toggle('placed', Boolean(dots?.back));
  const finCount = dots?.fins?.length || 0;
  $statFin.textContent = finCount ? `🟡 Fins ✓ (${finCount})` : '🟡 Fins';
  $statFin.classList.toggle('placed', finCount > 0);
}

function syncDotData(dots) {
  if (dots?.head && dots?.tail) {
    window.stlDotData = {
      scale: PREVIEW_TARGET,
      head: dots.head,
      tail: dots.tail,
      back: dots.back || null,
      fins: dots.fins || [],
    };
  } else {
    window.stlDotData = null;
  }
}

function ensureCalibrator() {
  if (calibrator) return calibrator;
  calibrator = createCalibrator($canvas, {
    previewTarget: PREVIEW_TARGET,
    background: 0x020d1a,
    showGrid: true,
    landmarks: FISH_LANDMARKS,
    onGuide(mode, guideText) {
      const m = mode || 'head';
      $guide.textContent = `${GUIDE_PREFIX[m] || ''}${guideText}`;
      $guide.className = `dot-guide dot-guide-${m}`;
      [$headBtn, $tailBtn, $backBtn, $finBtn].forEach((b) => b.classList.remove('active'));
      if (m === 'head') $headBtn.classList.add('active');
      else if (m === 'tail') $tailBtn.classList.add('active');
      else if (m === 'back') $backBtn.classList.add('active');
      else if (m === 'fin') $finBtn.classList.add('active');
    },
    onChange({ dots }) {
      syncDotData(dots);
      updateDotStatus(dots);
    },
  });
  return calibrator;
}

// Tab switching inside the 3D section (Scan from Photos vs Upload STL/GLB)
function setSubTab(which) {
  const isScan = which === 'scan';
  $tabScan.setAttribute('aria-selected', String(isScan));
  $tabFile.setAttribute('aria-selected', String(!isScan));
  $paneScan.hidden = !isScan;
  $paneFile.hidden = isScan;
}
$tabScan?.addEventListener('click', () => setSubTab('scan'));
$tabFile?.addEventListener('click', () => setSubTab('file'));

// Mount the shared 3D Scanner widget
if ($scanMount) {
  mountScan3D($scanMount, {
    subject: 'fish',
    modes: ['views', 'turntable'],
    defaultMode: 'views',
    defaultProfile: 'rounded',
    forwardAxis: '+x',
    maxDim: 32,
    buildLabel: '🐠 Scan into 3D Fish',
    showExport: true,
    printPrepUrl: 'print-prep.html',
    introText: 'Place your clay, paper, or brick creature on a plain surface. Take 1–3 views (or a 360° spin) and we’ll turn it into a 3D swimming model.',
    viewSlots: [
      { key: 'side', title: 'Side', hint: 'Head pointing right', camHint: 'Side: head pointing right', required: true },
      { key: 'front', title: 'Front', hint: 'Look at the head', camHint: 'Front: look at the head', required: false },
      { key: 'top', title: 'Top', hint: 'Head pointing up', camHint: 'Top: head pointing up', required: false },
    ],
    onResultReady(result) {
      if (!result?.glbBytes || !result?.mesh) return;
      $stlError?.classList.remove('show');
      if (result.glbBytes.byteLength > MAX_GLB_BYTES) {
        if ($stlError) {
          $stlError.textContent = 'Scanned model is larger than 2 MB. Try fewer details or crop closer.';
          $stlError.classList.add('show');
        }
        return;
      }
      const dataURL = bytesToDataUrl(result.glbBytes, 'model/gltf-binary');
      const sizeKb = Math.max(1, Math.round(result.glbBytes.byteLength / 1024));
      const dots = defaultDotsForMesh(result.mesh, {
        forwardAxis: '+x',
        previewScale: PREVIEW_TARGET,
        keys: 'fish',
      });
      window.__setFishModel?.({
        dataURL,
        fileType: 'glb',
        label: `scanned-fish.glb (${sizeKb} KB)`,
        presetDots: dots,
        mesh: result.mesh,
      });
    },
  });
}

document.addEventListener('model-loaded', async (e) => {
  const { dataURL, fileType, presetDots, mesh } = e.detail || {};
  document.getElementById('stl-section').open = true;
  $section.style.display = 'block';
  await new Promise((r) => requestAnimationFrame(r));
  const cal = ensureCalibrator();
  cal.resize();

  if (mesh) {
    cal.loadScanMesh(mesh);
  } else if (fileType === 'glb') {
    await cal.loadGLB(dataURL);
  } else {
    await cal.loadSTL(dataURL);
  }

  if (presetDots) {
    cal.setDots(presetDots);
  } else {
    cal.setMode('head');
  }
  setTimeout(() => $section.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
});

document.addEventListener('stl-cleared', () => {
  $section.style.display = 'none';
  if (calibrator) calibrator.resetDots();
  window.stlDotData = null;
  updateDotStatus(null);
});

$headBtn.addEventListener('click', () => ensureCalibrator().setMode('head'));
$tailBtn.addEventListener('click', () => ensureCalibrator().setMode('tail'));
$backBtn.addEventListener('click', () => ensureCalibrator().setMode('back'));
$finBtn.addEventListener('click', () => ensureCalibrator().setMode('fin'));
$resetBtn.addEventListener('click', () => ensureCalibrator().resetDots());
