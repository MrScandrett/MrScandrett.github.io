import {
  GRID_SIZE,
  FULL_FOV_UAS,
  DISPLAY_FOV_UAS,
  TARGETS,
  STATIONS,
  getTarget,
  getStation,
  greatCirclePoints,
  canStationObserveTarget,
  stationElevationDeg,
  computeArrayMetrics,
  computeSkyFft,
  generateAnalyticSkyModel,
  extractSkyModelFromRgba,
  synthesizeArrayImage,
  sampleColormap
} from './event-horizon-telescope-model.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TRACK_COLORS = [
  '#76d6d1',
  '#f6c86a',
  '#c99cff',
  '#75e0b5',
  '#ff9e83',
  '#8ad7ff',
  '#f2a7d8',
  '#d7e678'
];

const MOVEMENT_CONFIGS = {
  listen: {
    number: 'I',
    title: 'Listen',
    prompt:
      'Begin with one station. It records a 1.3 mm radio wave with an atomic clock timestamp, but one viewpoint cannot resolve sky structure alone.',
    stations: ['alma'],
    viewMode: 'reconstructed'
  },
  connect: {
    number: 'II',
    title: 'Connect',
    prompt:
      'Add a second synchronized station to form the first baseline. Compare an intra-site pair (2.6 km) against a trans-oceanic pair (~9,500 km).',
    stations: ['alma', 'apex'],
    viewMode: 'dirty'
  },
  accumulate: {
    number: 'III',
    title: 'Accumulate',
    prompt:
      'Add continents and sweep Earth’s rotation. Watch each pair carve an arc across the u–v plane, turning sparse fringes into a constrained ring.',
    stations: ['alma', 'apex', 'jcmt', 'sma'],
    viewMode: 'reconstructed'
  },
  resolve: {
    number: 'IV',
    title: 'Resolve',
    prompt:
      'With the full 2017 array, compare the Dirty FFT against Högbom CLEAN deconvolution—or switch targets from M87* to Sagittarius A*.',
    stations: STATIONS.map((s) => s.id),
    viewMode: 'reconstructed'
  },
  reflect: {
    number: 'V',
    title: 'Reflect',
    prompt:
      'Trace the full chain: synchronized station pairs form baselines → Earth rotation fills the u–v plane → algorithms reconstruct the shadow.',
    stations: STATIONS.map((s) => s.id),
    viewMode: 'reconstructed'
  }
};

const state = {
  targetId: 'm87',
  active: new Set(['alma']),
  synced: true,
  movement: 'listen',
  viewMode: 'reconstructed',
  palette: 'ember',
  synthesisHours: 8,
  isRotating: false,
  showScale: true,
  showCompare: false,
  compareSplit: 0.5,
  sgraBlur: false,
  hoveredPairId: null,
  pinnedPairId: null,
  correlatorPhase: 0
};

const skyCache = {
  m87Analytic: generateAnalyticSkyModel('m87', GRID_SIZE),
  m87Photo: null,
  sgra: generateAnalyticSkyModel('sgra', GRID_SIZE),
  ffts: new Map()
};

function getActiveSkyModel() {
  if (state.targetId === 'sgra') {
    return { key: 'sgra', model: skyCache.sgra };
  }
  if (skyCache.m87Photo) {
    return { key: 'm87-photo', model: skyCache.m87Photo };
  }
  return { key: 'm87-analytic', model: skyCache.m87Analytic };
}

function getSkyFft(key, model) {
  let cached = skyCache.ffts.get(key);
  if (!cached) {
    cached = computeSkyFft(model, GRID_SIZE);
    skyCache.ffts.set(key, cached);
  }
  return cached;
}

const el = {
  viewport: document.querySelector('.ll-viewport'),
  movementNumber: document.getElementById('movementNumber'),
  movementTitle: document.getElementById('movementTitle'),
  movementPrompt: document.getElementById('movementPrompt'),
  rotationOverlay: document.getElementById('rotationOverlay'),
  baselineLayer: document.getElementById('baselineLayer'),
  stationLayer: document.getElementById('stationLayer'),
  mapTooltip: document.getElementById('mapTooltip'),
  stationList: document.getElementById('stationList'),
  activeCount: document.getElementById('activeCount'),
  baselineCount: document.getElementById('baselineCount'),
  baselineValue: document.getElementById('baselineValue'),
  resolutionValue: document.getElementById('resolutionValue'),
  alertBar: document.getElementById('alertBar'),
  statusTitle: document.getElementById('statusTitle'),
  statusWhy: document.getElementById('statusWhy'),
  statusNext: document.getElementById('statusNext'),
  mapNote: document.getElementById('mapNote'),
  imageBadge: document.getElementById('imageBadge'),
  imageNote: document.getElementById('imageNote'),
  pairInspector: document.getElementById('pairInspector'),
  uvCaption: document.getElementById('uvCaption'),
  correlatorTitle: document.getElementById('correlatorTitle'),
  correlatorStatus: document.getElementById('correlatorStatus'),
  stageSyncButton: document.getElementById('stageSyncButton'),
  syncButton: document.getElementById('syncButton'),
  rotationPlayButton: document.getElementById('rotationPlayButton'),
  synthesisHours: document.getElementById('synthesisHours'),
  synthesisHoursLabel: document.getElementById('synthesisHoursLabel'),
  scaleToggleButton: document.getElementById('scaleToggleButton'),
  compareToggleButton: document.getElementById('compareToggleButton'),
  sgraBlurButton: document.getElementById('sgraBlurButton'),
  compareSplitControl: document.getElementById('compareSplitControl'),
  compareSplit: document.getElementById('compareSplit'),
  chilePresetButton: document.getElementById('chilePresetButton'),
  longPairButton: document.getElementById('longPairButton'),
  widePresetButton: document.getElementById('widePresetButton'),
  americasPresetButton: document.getElementById('americasPresetButton'),
  selectAllButton: document.getElementById('selectAllButton'),
  dropAlmaButton: document.getElementById('dropAlmaButton'),
  clearButton: document.getElementById('clearButton'),
  switchSgraButton: document.getElementById('switchSgraButton'),
  checkUnderstandingButton: document.getElementById('checkUnderstandingButton'),
  checkFeedback: document.getElementById('checkFeedback'),
  canvas: document.getElementById('reconstructionCanvas'),
  coverageCanvas: document.getElementById('coverageCanvas'),
  correlatorCanvas: document.getElementById('correlatorCanvas')
};

const ctx = el.canvas?.getContext('2d');
const coverageCtx = el.coverageCanvas?.getContext('2d');
const correlatorCtx = el.correlatorCanvas?.getContext('2d');
const stationButtons = new Map();

const offscreenGridCanvas = document.createElement('canvas');
offscreenGridCanvas.width = GRID_SIZE;
offscreenGridCanvas.height = GRID_SIZE;
const offscreenGridCtx = offscreenGridCanvas.getContext('2d');
const offscreenImageData = offscreenGridCtx.createImageData(GRID_SIZE, GRID_SIZE);

const m87ReferenceImage = new Image();
m87ReferenceImage.decoding = 'async';
m87ReferenceImage.addEventListener('load', () => {
  try {
    const tmp = document.createElement('canvas');
    tmp.width = 128;
    tmp.height = 128;
    const tCtx = tmp.getContext('2d');
    tCtx.drawImage(m87ReferenceImage, 0, 0, 128, 128);
    const imgData = tCtx.getImageData(0, 0, 128, 128);
    skyCache.m87Photo = extractSkyModelFromRgba(
      imgData.data,
      128,
      128,
      GRID_SIZE,
      TARGETS.m87.ringDiameterUas
    );
    skyCache.ffts.delete('m87-photo');
    lastSynthSignature = '';
    renderAll();
  } catch {
    // Fallback to analytic M87* model if pixel extraction is blocked
  }
});
m87ReferenceImage.src = '../../assets/thumbs/m87-blackhole.jpg';

let cachedMetrics = null;
let cachedSynthesis = null;
let lastSynthSignature = '';
let cachedPlotGeometry = null;
let animFrameId = null;
let lastAnimTime = 0;

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function projectLonLat(lon, lat) {
  return {
    x: ((lon + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 520
  };
}

function getInspectedPairId() {
  return state.hoveredPairId || state.pinnedPairId;
}

function getCurrentMetricsAndSynthesis() {
  const { key, model } = getActiveSkyModel();
  const activeKey = [...state.active].sort().join(',');
  const signature = `${state.targetId}|${activeKey}|${state.synced}|${state.synthesisHours.toFixed(1)}|${state.sgraBlur}|${key}|${state.isRotating ? 'anim' : 'still'}`;

  if (signature !== lastSynthSignature || !cachedMetrics || !cachedSynthesis) {
    cachedMetrics = computeArrayMetrics({
      activeIds: state.active,
      targetId: state.targetId,
      synced: state.synced,
      synthesisHours: state.synthesisHours
    });
    const skyFft = getSkyFft(key, model);
    const cleanIterations = state.isRotating ? 52 : 120;
    cachedSynthesis = synthesizeArrayImage({
      skyModel: model,
      skyFft,
      tracks: cachedMetrics.activeTracks,
      synced: state.synced,
      cleanIterations,
      sgraBlur: state.targetId === 'sgra' && state.sgraBlur
    });
    lastSynthSignature = signature;
  }

  return { metrics: cachedMetrics, synth: cachedSynthesis };
}

function renderStationList() {
  if (!el.stationList) return;
  el.stationList.innerHTML = '';
  stationButtons.clear();

  STATIONS.forEach((station) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'eht-station-button';
    button.dataset.stationId = station.id;
    button.innerHTML = `
      <span class="eht-station-row">
        <strong>${station.short} · ${station.name}</strong>
        <span class="eht-station-status" data-status></span>
      </span>
      <small>${station.region} · ${station.dish} · ${station.elevationM.toLocaleString()} m</small>
    `;
    button.addEventListener('click', () => toggleStation(station.id));
    stationButtons.set(station.id, button);
    el.stationList.appendChild(button);
  });
}

function toggleStation(stationId) {
  if (state.active.has(stationId)) {
    state.active.delete(stationId);
  } else {
    state.active.add(stationId);
  }
  renderAll();
}

function showMapTooltip(text, svgX, svgY) {
  if (!el.mapTooltip) return;
  el.mapTooltip.textContent = text;
  el.mapTooltip.hidden = false;
  const pctX = Math.max(8, Math.min(92, (svgX / 1000) * 100));
  const pctY = Math.max(10, Math.min(86, (svgY / 520) * 100));
  el.mapTooltip.style.left = `${pctX}%`;
  el.mapTooltip.style.top = `${pctY}%`;
}

function hideMapTooltip() {
  if (el.mapTooltip) el.mapTooltip.hidden = true;
}

function buildGeodesicPathD(pts) {
  let d = '';
  for (let i = 0; i < pts.length; i += 1) {
    const p = projectLonLat(pts[i].lon, pts[i].lat);
    const jump = i > 0 && Math.abs(pts[i].lon - pts[i - 1].lon) > 180;
    d += `${i === 0 || jump ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }
  return d;
}

function renderMap(metrics) {
  if (!el.baselineLayer || !el.stationLayer) return;
  const target = metrics.target;

  // Rotation & horizon visibility overlay
  if (el.rotationOverlay) {
    el.rotationOverlay.innerHTML = '';
    const gha = target.centerGhaHours + (state.synthesisHours > 0 ? state.synthesisHours / 2 - 4 : 0);
    let subLon = -(gha * 15) % 360;
    if (subLon > 180) subLon -= 360;
    if (subLon < -180) subLon += 360;
    const meridianX = projectLonLat(subLon, 0).x;

    // Southern polar horizon limit for northern targets (e.g., M87* at dec +12.4 deg)
    if (target.decDeg > 12 - 90) {
      const limitLat = target.decDeg - 78;
      if (limitLat > -89.5) {
        const limitY = projectLonLat(0, limitLat).y;
        const band = document.createElementNS(SVG_NS, 'rect');
        band.setAttribute('x', '0');
        band.setAttribute('y', limitY.toFixed(1));
        band.setAttribute('width', '1000');
        band.setAttribute('height', (520 - limitY).toFixed(1));
        band.setAttribute('class', 'eht-horizon-mask');
        el.rotationOverlay.appendChild(band);

        const limitLine = document.createElementNS(SVG_NS, 'line');
        limitLine.setAttribute('x1', '0');
        limitLine.setAttribute('y1', limitY.toFixed(1));
        limitLine.setAttribute('x2', '1000');
        limitLine.setAttribute('y2', limitY.toFixed(1));
        limitLine.setAttribute('class', 'eht-horizon-line');
        el.rotationOverlay.appendChild(limitLine);
      }
    }

    const meridian = document.createElementNS(SVG_NS, 'line');
    meridian.setAttribute('x1', meridianX.toFixed(1));
    meridian.setAttribute('y1', '0');
    meridian.setAttribute('x2', meridianX.toFixed(1));
    meridian.setAttribute('y2', '520');
    meridian.setAttribute('class', 'eht-transit-meridian');
    el.rotationOverlay.appendChild(meridian);
  }

  el.baselineLayer.innerHTML = '';
  el.stationLayer.innerHTML = '';

  const inspectedId = getInspectedPairId();

  metrics.activeTracks.forEach((track, idx) => {
    const pts = greatCirclePoints(track.from, track.to, 28);
    const d = buildGeodesicPathD(pts);
    const mid = projectLonLat(pts[Math.floor(pts.length / 2)].lon, pts[Math.floor(pts.length / 2)].lat);
    const isHighlighted = inspectedId === track.id;
    const isDimmed = Boolean(inspectedId && !isHighlighted);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('data-pair-id', track.id);
    const classes = ['baseline-arc'];
    if (!state.synced) classes.push('is-unsynced');
    if (isHighlighted) classes.push('is-highlighted');
    if (isDimmed) classes.push('is-dimmed');
    path.setAttribute('class', classes.join(' '));
    if (state.synced) {
      path.style.stroke = isHighlighted
        ? '#ffffff'
        : TRACK_COLORS[idx % TRACK_COLORS.length];
    }

    const hit = document.createElementNS(SVG_NS, 'path');
    hit.setAttribute('d', d);
    hit.setAttribute('fill', 'none');
    hit.setAttribute('class', 'baseline-hit');
    hit.addEventListener('mouseenter', () => {
      state.hoveredPairId = track.id;
      showMapTooltip(
        `${track.from.short}–${track.to.short} · ${Math.round(track.chordKm).toLocaleString()} km · ${Math.round(track.maxUvMl).toLocaleString()} Mλ`,
        mid.x,
        mid.y
      );
      refreshHighlightViews();
    });
    hit.addEventListener('mouseleave', () => {
      state.hoveredPairId = null;
      hideMapTooltip();
      refreshHighlightViews();
    });
    hit.addEventListener('click', (event) => {
      event.stopPropagation();
      state.pinnedPairId = state.pinnedPairId === track.id ? null : track.id;
      refreshHighlightViews();
    });

    el.baselineLayer.appendChild(path);
    el.baselineLayer.appendChild(hit);
  });

  STATIONS.forEach((station) => {
    const point = projectLonLat(station.lon, station.lat);
    const isSelected = state.active.has(station.id);
    const canSee = canStationObserveTarget(station, target);
    const isActiveObservable = isSelected && canSee;
    const isBlocked = isSelected && !canSee;

    const group = document.createElementNS(SVG_NS, 'g');
    const groupClasses = ['station-group'];
    if (isActiveObservable) groupClasses.push('is-active');
    if (isBlocked) groupClasses.push('is-blocked');
    group.setAttribute('class', groupClasses.join(' '));
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '0');
    group.setAttribute('aria-pressed', String(isSelected));

    const elevNow = stationElevationDeg(station, target, target.centerGhaHours);
    const elevNote = canSee
      ? `max transit ≈ ${Math.round(elevNow)}°`
      : `below ${target.name} horizon`;
    const ariaLabel = `${station.short} (${station.name}, ${station.region}) — ${isSelected ? 'selected' : 'inactive'}, ${elevNote}`;
    group.setAttribute('aria-label', ariaLabel);

    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = ariaLabel;

    const halo = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('cx', point.x);
    halo.setAttribute('cy', point.y);
    halo.setAttribute('r', '14');
    halo.setAttribute(
      'class',
      isBlocked ? 'station-halo is-blocked' : isActiveObservable ? 'station-halo is-active' : 'station-halo'
    );

    const leader = document.createElementNS(SVG_NS, 'line');
    leader.setAttribute('x1', point.x);
    leader.setAttribute('y1', point.y);
    leader.setAttribute('x2', point.x + station.labelDx * 0.74);
    leader.setAttribute('y2', point.y + station.labelDy * 0.74);
    leader.setAttribute(
      'class',
      isBlocked ? 'station-leader is-blocked' : isActiveObservable ? 'station-leader is-active' : 'station-leader'
    );

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r', isSelected ? '5.4' : '4.5');
    circle.setAttribute(
      'class',
      isBlocked ? 'station-dot is-blocked' : isActiveObservable ? 'station-dot is-active' : 'station-dot'
    );

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', point.x + station.labelDx);
    label.setAttribute('y', point.y + station.labelDy);
    label.setAttribute(
      'class',
      isBlocked ? 'station-label is-blocked' : isActiveObservable ? 'station-label is-active' : 'station-label'
    );
    label.textContent = isBlocked ? `${station.short} ✕` : station.short;

    group.addEventListener('click', () => toggleStation(station.id));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleStation(station.id);
      }
    });
    group.addEventListener('mouseenter', () => {
      showMapTooltip(
        `${station.short} · ${station.region} · ${station.dish} (${elevNote})`,
        point.x,
        point.y
      );
    });
    group.addEventListener('mouseleave', hideMapTooltip);

    group.appendChild(title);
    group.appendChild(halo);
    group.appendChild(leader);
    group.appendChild(circle);
    group.appendChild(label);
    el.stationLayer.appendChild(group);
  });
}

function drawSingleStationScope(width, height, metrics) {
  const target = metrics.target;
  const activeStation = metrics.observableStations[0];

  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    10,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.72
  );
  bg.addColorStop(0, '#0a1826');
  bg.addColorStop(1, '#03080d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle oscilloscope graticule
  ctx.strokeStyle = 'rgba(118, 214, 209, 0.09)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    const y = (height * i) / 6;
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }

  if (!activeStation) {
    ctx.fillStyle = 'rgba(220, 233, 230, 0.8)';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const message =
      metrics.horizonBlockedStations.length > 0
        ? `${metrics.horizonBlockedStations.map((s) => s.short).join(', ')} cannot see ${target.name} above the horizon`
        : 'Select at least two stations to form a baseline';
    ctx.fillText(message, width / 2, height / 2);
    ctx.textAlign = 'left';
    return;
  }

  // Draw live 1.3 mm time-series amplitude + hydrogen-maser clock ticks
  const waveTop = height * 0.25;
  const waveHeight = height * 0.46;
  const waveMid = waveTop + waveHeight / 2;

  ctx.strokeStyle = 'rgba(243, 154, 82, 0.35)';
  ctx.lineWidth = 1;
  for (let tick = 0; tick <= 12; tick += 1) {
    const tx = 28 + ((width - 56) * tick) / 12;
    ctx.beginPath();
    ctx.moveTo(tx, waveTop);
    ctx.lineTo(tx, waveTop + 10);
    ctx.stroke();
  }

  ctx.strokeStyle = '#76d6d1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const phase = state.correlatorPhase;
  for (let x = 28; x <= width - 28; x += 2) {
    const norm = (x - 28) / Math.max(1, width - 56);
    const envelope = 0.55 + 0.45 * Math.sin(norm * 10 - phase * 0.7);
    const carrier =
      Math.sin(norm * 72 - phase * 2.4) * 0.65 +
      Math.sin(norm * 127 + phase * 1.1) * 0.35;
    const y = waveMid + envelope * carrier * (waveHeight * 0.38);
    if (x === 28) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#dce9e6';
  ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(
    `${activeStation.short} · 230 GHz single-dish time series (no spatial comparison)`,
    28,
    waveTop - 16
  );

  ctx.fillStyle = 'rgba(220, 233, 230, 0.72)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    '1 station records brightness vs. time — add a 2nd station to sample 2D sky structure',
    width / 2,
    height * 0.84
  );
  ctx.textAlign = 'left';
}

function renderReconstructionCanvas(metrics, synth) {
  if (!el.canvas || !ctx) return;
  const rect = el.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  el.canvas.width = Math.round(rect.width * dpr);
  el.canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;

  if (metrics.baselinePairs === 0 && state.viewMode !== 'psf') {
    drawSingleStationScope(width, height, metrics);
    return;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#03080d';
  ctx.fillRect(0, 0, width, height);

  if (metrics.baselinePairs === 0 && state.viewMode === 'psf') {
    ctx.fillStyle = 'rgba(220, 233, 230, 0.76)';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Form at least one baseline to inspect its Dirty Beam (PSF)', width / 2, height / 2);
    ctx.textAlign = 'left';
    return;
  }

  const field =
    state.viewMode === 'psf'
      ? synth.psfImage
      : state.viewMode === 'dirty'
        ? synth.dirtyImage
        : synth.cleanImage;

  const data = offscreenImageData.data;
  for (let i = 0; i < field.length; i += 1) {
    const [r, g, b] = sampleColormap(field[i], state.palette);
    const p = i * 4;
    data[p] = r;
    data[p + 1] = g;
    data[p + 2] = b;
    data[p + 3] = 255;
  }
  offscreenGridCtx.putImageData(offscreenImageData, 0, 0);

  // Crop central DISPLAY_FOV_UAS (120 uas) from FULL_FOV_UAS (300 uas)
  const cropRatio = DISPLAY_FOV_UAS / FULL_FOV_UAS;
  const cropPx = GRID_SIZE * cropRatio;
  const cropOrigin = (GRID_SIZE - cropPx) / 2;

  const pad = 12;
  const drawSide = Math.max(40, Math.min(width, height) - pad * 2);
  const drawX = (width - drawSide) / 2;
  const drawY = (height - drawSide) / 2;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    offscreenGridCanvas,
    cropOrigin,
    cropOrigin,
    cropPx,
    cropPx,
    drawX,
    drawY,
    drawSide,
    drawSide
  );
  ctx.restore();

  // Optional side-by-side comparison wipe with real 2019 M87* EHT release photo
  if (
    state.showCompare &&
    state.targetId === 'm87' &&
    state.viewMode !== 'psf' &&
    m87ReferenceImage.complete &&
    m87ReferenceImage.naturalWidth > 0
  ) {
    const splitX = drawX + drawSide * state.compareSplit;
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, drawY, drawX + drawSide - splitX, drawSide);
    ctx.clip();
    ctx.drawImage(m87ReferenceImage, drawX, drawY, drawSide, drawSide);
    ctx.restore();

    ctx.strokeStyle = 'rgba(220, 233, 230, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(splitX, drawY);
    ctx.lineTo(splitX, drawY + drawSide);
    ctx.stroke();

    ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(3, 8, 13, 0.78)';
    ctx.fillRect(drawX + 6, drawY + 6, 94, 18);
    ctx.fillRect(drawX + drawSide - 102, drawY + 6, 96, 18);
    ctx.fillStyle = '#76d6d1';
    ctx.fillText('Your synthesis', drawX + 11, drawY + 18);
    ctx.fillStyle = '#f39a52';
    ctx.textAlign = 'right';
    ctx.fillText('Real 2019 M87*', drawX + drawSide - 11, drawY + 18);
    ctx.textAlign = 'left';
  }

  // Angular scale bar in microarcseconds
  if (state.showScale) {
    const target = metrics.target;
    const barUas = target.ringDiameterUas;
    const barPx = (barUas / DISPLAY_FOV_UAS) * drawSide;
    const bx = drawX + 14;
    const by = drawY + drawSide - 16;

    ctx.strokeStyle = 'rgba(220, 233, 230, 0.88)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + barPx, by);
    ctx.moveTo(bx, by - 4);
    ctx.lineTo(bx, by + 4);
    ctx.moveTo(bx + barPx, by - 4);
    ctx.lineTo(bx + barPx, by + 4);
    ctx.stroke();

    ctx.fillStyle = 'rgba(220, 233, 230, 0.9)';
    ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`${barUas} μas (${target.physicalSpanText})`, bx, by - 8);
  }
}

function drawCoveragePlot(metrics) {
  if (!el.coverageCanvas || !coverageCtx) return;
  const rect = el.coverageCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  el.coverageCanvas.width = Math.round(rect.width * dpr);
  el.coverageCanvas.height = Math.round(rect.height * dpr);
  coverageCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;
  const margin = { left: 52, right: 20, top: 18, bottom: 42 };
  const plotWidth = Math.max(1, width - margin.left - margin.right);
  const plotHeight = Math.max(1, height - margin.top - margin.bottom);

  coverageCtx.clearRect(0, 0, width, height);
  coverageCtx.fillStyle = '#030813';
  coverageCtx.fillRect(0, 0, width, height);

  const axisMax = 10000; // ±10 Gλ = ±10,000 Mλ square scale
  const side = Math.min(plotWidth, plotHeight);
  const ox = margin.left + (plotWidth - side) / 2;
  const oy = margin.top + (plotHeight - side) / 2;
  const xFor = (u) => ox + ((u + axisMax) / (axisMax * 2)) * side;
  const yFor = (v) => oy + ((axisMax - v) / (axisMax * 2)) * side;
  const pxPerMl = side / (axisMax * 2);

  // Resolution reference rings (25 μas, 50 μas, 100 μas)
  coverageCtx.save();
  coverageCtx.setLineDash([3, 4]);
  coverageCtx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  [25, 50, 100].forEach((uas) => {
    const rMl = 206265 / uas;
    const rPx = rMl * pxPerMl;
    coverageCtx.strokeStyle = 'rgba(118, 214, 209, 0.14)';
    coverageCtx.lineWidth = 1;
    coverageCtx.beginPath();
    coverageCtx.arc(xFor(0), yFor(0), rPx, 0, Math.PI * 2);
    coverageCtx.stroke();
    coverageCtx.fillStyle = 'rgba(140, 165, 170, 0.65)';
    coverageCtx.fillText(`${uas} μas`, xFor(0) + 4, yFor(rMl) + 10);
  });
  coverageCtx.restore();

  // Grid lines & ticks
  coverageCtx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  coverageCtx.textAlign = 'center';
  coverageCtx.textBaseline = 'top';
  for (let val = -10000; val <= 10000; val += 2500) {
    const x = xFor(val);
    const y = yFor(val);
    coverageCtx.strokeStyle = val === 0 ? 'rgba(220, 235, 255, 0.32)' : 'rgba(138, 215, 255, 0.08)';
    coverageCtx.lineWidth = val === 0 ? 1.2 : 1;
    coverageCtx.beginPath();
    coverageCtx.moveTo(x, oy);
    coverageCtx.lineTo(x, oy + side);
    coverageCtx.moveTo(ox, y);
    coverageCtx.lineTo(ox + side, y);
    coverageCtx.stroke();

    if (val % 5000 === 0) {
      coverageCtx.fillStyle = 'rgba(205, 220, 242, 0.65)';
      coverageCtx.fillText(`${val / 1000}`, x, oy + side + 7);
      if (val !== -10000) {
        coverageCtx.save();
        coverageCtx.textAlign = 'right';
        coverageCtx.textBaseline = 'middle';
        coverageCtx.fillText(`${val / 1000}`, ox - 8, y);
        coverageCtx.restore();
      }
    }
  }

  coverageCtx.fillStyle = 'rgba(225, 235, 255, 0.78)';
  coverageCtx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  coverageCtx.textAlign = 'right';
  coverageCtx.fillText('u (Gλ) →', ox + side, height - 12);
  coverageCtx.save();
  coverageCtx.translate(14, oy);
  coverageCtx.rotate(-Math.PI / 2);
  coverageCtx.fillText('v (Gλ) →', 0, 0);
  coverageCtx.restore();

  cachedPlotGeometry = {
    xFor,
    yFor,
    tracks: metrics.activeTracks
  };

  if (metrics.activeTracks.length === 0) {
    coverageCtx.fillStyle = 'rgba(213, 230, 255, 0.72)';
    coverageCtx.font = '700 12px system-ui, sans-serif';
    coverageCtx.textAlign = 'center';
    coverageCtx.textBaseline = 'middle';
    coverageCtx.fillText(
      'Select two simultaneously visible stations to plot u–v tracks.',
      ox + side / 2,
      oy + side / 2
    );
    return;
  }

  const inspectedId = getInspectedPairId();

  metrics.activeTracks.forEach((track, idx) => {
    const isHighlighted = inspectedId === track.id;
    const isDimmed = Boolean(inspectedId && !isHighlighted);
    const color = state.synced
      ? isHighlighted
        ? '#ffffff'
        : TRACK_COLORS[idx % TRACK_COLORS.length]
      : 'rgba(255, 126, 126, 0.5)';

    coverageCtx.strokeStyle = color;
    coverageCtx.lineWidth = isHighlighted ? 2.6 : 1.4;
    coverageCtx.globalAlpha = isDimmed ? 0.22 : state.synced ? 0.85 : 0.48;

    for (const sign of [-1, 1]) {
      if (track.points.length === 1) {
        const pt = track.points[0];
        coverageCtx.fillStyle = color;
        coverageCtx.beginPath();
        coverageCtx.arc(xFor(pt.u * sign), yFor(pt.v * sign), isHighlighted ? 4.2 : 3.0, 0, Math.PI * 2);
        coverageCtx.fill();
      } else {
        coverageCtx.beginPath();
        track.points.forEach((pt, pIdx) => {
          const x = xFor(pt.u * sign);
          const y = yFor(pt.v * sign);
          if (pIdx === 0) coverageCtx.moveTo(x, y);
          else coverageCtx.lineTo(x, y);
        });
        coverageCtx.stroke();

        // Highlight current end-of-synthesis sample point
        const endPt = track.points.at(-1);
        coverageCtx.fillStyle = color;
        coverageCtx.beginPath();
        coverageCtx.arc(
          xFor(endPt.u * sign),
          yFor(endPt.v * sign),
          isHighlighted ? 3.4 : 2.1,
          0,
          Math.PI * 2
        );
        coverageCtx.fill();
      }
    }
  });
  coverageCtx.globalAlpha = 1;

  // Origin (zero-spacing anchor)
  coverageCtx.fillStyle = '#ffffff';
  coverageCtx.beginPath();
  coverageCtx.arc(xFor(0), yFor(0), 2.5, 0, Math.PI * 2);
  coverageCtx.fill();

  if (!state.synced) {
    coverageCtx.fillStyle = 'rgba(31, 7, 10, 0.88)';
    coverageCtx.fillRect(ox + 10, oy + side / 2 - 22, side - 20, 44);
    coverageCtx.fillStyle = '#ffabab';
    coverageCtx.font = '700 11px system-ui, sans-serif';
    coverageCtx.textAlign = 'center';
    coverageCtx.textBaseline = 'middle';
    coverageCtx.fillText(
      'Geometry exists, but phases cannot correlate without clock sync.',
      ox + side / 2,
      oy + side / 2
    );
  }
}

function drawCorrelatorStrip(metrics) {
  if (!el.correlatorCanvas || !correlatorCtx) return;
  const rect = el.correlatorCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  el.correlatorCanvas.width = Math.round(rect.width * dpr);
  el.correlatorCanvas.height = Math.round(rect.height * dpr);
  correlatorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;
  correlatorCtx.clearRect(0, 0, width, height);
  correlatorCtx.fillStyle = '#03080d';
  correlatorCtx.fillRect(0, 0, width, height);

  const inspectedId = getInspectedPairId();
  const featuredTrack =
    metrics.activeTracks.find((t) => t.id === inspectedId) ||
    metrics.activeTracks[metrics.activeTracks.length - 1] ||
    null;

  if (el.correlatorTitle && el.correlatorStatus) {
    if (!featuredTrack) {
      const one = metrics.observableStations[0];
      el.correlatorTitle.textContent = one
        ? `Atomic Clock · ${one.short} (1.3 mm)`
        : 'Correlator · Waiting for 2 stations';
      el.correlatorStatus.textContent = one
        ? 'Recording maser timestamps · awaiting 2nd station'
        : 'Select stations to correlate';
      el.correlatorStatus.className = 'eht-corr-status is-idle';
    } else {
      el.correlatorTitle.textContent = `Correlator · ${featuredTrack.from.short} × ${featuredTrack.to.short} (${Math.round(featuredTrack.chordKm).toLocaleString()} km)`;
      el.correlatorStatus.textContent = state.synced
        ? `Fringe lock · ${Math.round(featuredTrack.maxUvMl).toLocaleString()} Mλ`
        : 'Clock drift — fringes scrambled';
      el.correlatorStatus.className = `eht-corr-status ${state.synced ? 'is-locked' : 'is-lost'}`;
    }
  }

  const splitX = width * 0.68;
  const phase = state.correlatorPhase;

  // Left region: 2 station 1.3 mm waveforms + maser ticks
  correlatorCtx.strokeStyle = 'rgba(118, 214, 209, 0.2)';
  correlatorCtx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 1) {
    const tx = 12 + ((splitX - 24) * i) / 10;
    correlatorCtx.beginPath();
    correlatorCtx.moveTo(tx, 6);
    correlatorCtx.lineTo(tx, 14);
    correlatorCtx.stroke();
  }

  const waveW = Math.max(40, splitX - 24);
  const drawWave = (yCenter, color, offsetPhase, jitter) => {
    correlatorCtx.strokeStyle = color;
    correlatorCtx.lineWidth = 1.6;
    correlatorCtx.beginPath();
    for (let x = 0; x <= waveW; x += 2) {
      const t = x / waveW;
      const noise = jitter ? Math.sin(x * 1.9 + phase * 5.7) * 0.6 : 0;
      const y =
        yCenter +
        Math.sin(t * 28 - phase * 2.1 + offsetPhase + noise) *
          (0.65 + 0.35 * Math.sin(t * 6)) *
          8;
      if (x === 0) correlatorCtx.moveTo(12 + x, y);
      else correlatorCtx.lineTo(12 + x, y);
    }
    correlatorCtx.stroke();
  };

  drawWave(height * 0.36, '#76d6d1', 0, false);
  if (featuredTrack) {
    drawWave(
      height * 0.72,
      state.synced ? '#f6c86a' : '#ff7e7e',
      state.synced ? 0.5 : phase * 3.1,
      !state.synced
    );
  }

  // Divider
  correlatorCtx.strokeStyle = 'rgba(118, 214, 209, 0.16)';
  correlatorCtx.beginPath();
  correlatorCtx.moveTo(splitX, 6);
  correlatorCtx.lineTo(splitX, height - 6);
  correlatorCtx.stroke();

  // Right region: Cross-correlation fringe amplitude vs lag
  const lagW = width - splitX - 24;
  const lagStart = splitX + 12;
  const lagBase = height * 0.78;

  correlatorCtx.strokeStyle = featuredTrack && !state.synced ? '#ff7e7e' : '#f39a52';
  correlatorCtx.lineWidth = 1.7;
  correlatorCtx.beginPath();
  for (let x = 0; x <= lagW; x += 2) {
    const u = (x / Math.max(1, lagW)) * 2 - 1; // -1..1
    let amp = 0;
    if (featuredTrack) {
      if (state.synced) {
        amp = Math.exp(-u * u * 18) * Math.cos(u * 18) * (height * 0.56);
      } else {
        amp = Math.sin(u * 41 + phase * 4.3) * Math.cos(u * 19 - phase * 2.7) * (height * 0.18);
      }
    } else {
      amp = Math.sin(u * 12 + phase) * 2;
    }
    const y = lagBase - Math.max(0, amp);
    if (x === 0) correlatorCtx.moveTo(lagStart + x, y);
    else correlatorCtx.lineTo(lagStart + x, y);
  }
  correlatorCtx.stroke();
}

function renderReadout(metrics, synth) {
  const target = metrics.target;
  const chordText =
    metrics.longestChordKm > 0 ? `${Math.round(metrics.longestChordKm).toLocaleString()} km` : 'Not formed yet';

  if (el.activeCount) {
    el.activeCount.textContent =
      metrics.horizonBlockedStations.length > 0
        ? `${metrics.observableStations.length} active (${metrics.horizonBlockedStations.length} blocked)`
        : `${metrics.observableStations.length} of ${STATIONS.length}`;
  }
  if (el.baselineCount) {
    el.baselineCount.textContent = `${metrics.baselinePairs} pair${metrics.baselinePairs === 1 ? '' : 's'}`;
  }
  if (el.baselineValue) {
    el.baselineValue.textContent = chordText;
  }
  if (el.resolutionValue) {
    el.resolutionValue.textContent = metrics.resolutionUas
      ? `≈ ${Math.round(metrics.resolutionUas).toLocaleString()} μas`
      : 'Not available';
  }

  if (el.alertBar) el.alertBar.className = `eht-alert ${metrics.alertClass}`;
  if (el.statusTitle) el.statusTitle.textContent = metrics.statusTitle;
  if (el.statusWhy) el.statusWhy.textContent = metrics.statusWhy;
  if (el.statusNext) {
    const isNotice = metrics.statusNext.startsWith('Notice:');
    el.statusNext.innerHTML = `<b>${isNotice ? 'Notice:' : 'Next:'}</b> ${metrics.statusNext.replace(/^(Notice|Next):\s*/, '')}`;
  }

  if (el.mapNote) {
    if (!state.synced && metrics.baselinePairs > 0) {
      el.mapNote.textContent = 'Clock sync OFF — geometry exists, phases cannot correlate.';
    } else if (metrics.horizonBlockedStations.length > 0) {
      el.mapNote.textContent = `${metrics.baselinePairs} active pair${metrics.baselinePairs === 1 ? '' : 's'} · ${metrics.horizonBlockedStations.map((s) => s.short).join(', ')} below ${target.name} horizon`;
    } else {
      el.mapNote.textContent = `${metrics.baselinePairs} correlated pair${metrics.baselinePairs === 1 ? '' : 's'} · ${metrics.uvFilledCells} u–v cells`;
    }
  }

  if (el.imageBadge) {
    el.imageBadge.textContent = `${target.name} · ${
      state.viewMode === 'psf'
        ? 'Dirty Beam (PSF)'
        : state.viewMode === 'dirty'
          ? 'Dirty Fourier Synthesis'
          : 'CLEAN Reconstruction'
    }`;
  }

  if (el.imageNote) {
    if (metrics.baselinePairs === 0 && state.viewMode !== 'psf') {
      el.imageNote.textContent =
        'One dish records a 1D radio signal over time. Select a second station to sample 2D spatial frequencies.';
    } else if (!state.synced) {
      el.imageNote.textContent =
        'Randomized visibility phases collapse the Fourier synthesis into incoherent speckle noise.';
    } else if (state.viewMode === 'psf') {
      el.imageNote.textContent =
        'This point-spread function is the inverse FFT of the u–v mask. Gaps in u–v space create these sidelobes.';
    } else if (state.viewMode === 'dirty') {
      el.imageNote.textContent =
        'Direct inverse 2D FFT of sampled visibilities. Notice sidelobes and streaks where u–v tracks are sparse.';
    } else {
      const beamTxt =
        synth.beamFwhmMinorUas && synth.beamFwhmMajorUas
          ? `Restoring beam ≈ ${Math.round(synth.beamFwhmMinorUas)}×${Math.round(synth.beamFwhmMajorUas)} μas.`
          : '';
      el.imageNote.textContent = `${beamTxt} False color shows 1.3 mm radio intensity, not visible light.`;
    }
  }

  if (el.uvCaption) {
    const windowLabel =
      state.synthesisHours <= 0
        ? 'Snapshot (0 h)'
        : `${state.synthesisHours.toFixed(1)} h Earth rotation`;
    el.uvCaption.textContent = `Projected baselines for ${target.name} (dec ${target.decDeg > 0 ? '+' : ''}${target.decDeg.toFixed(1)}°) over ${windowLabel}. Axes in gigawavelengths (Gλ) at 1.3 mm; dashed circles show angular-scale equivalents.`;
  }

  // Pair inspector readout
  if (el.pairInspector) {
    const inspectedId = getInspectedPairId();
    const pair = metrics.activeTracks.find((t) => t.id === inspectedId);
    if (pair) {
      el.pairInspector.textContent = `Baseline ${pair.from.short}–${pair.to.short}: ${Math.round(pair.chordKm).toLocaleString()} km chord · max ${Math.round(pair.maxUvMl).toLocaleString()} Mλ (fringe ≈ ${Math.round(pair.minFringeUas).toLocaleString()} μas)`;
    } else if (metrics.activeTracks.length > 0) {
      el.pairInspector.textContent = 'Hover or click any baseline arc or u–v curve to inspect its chord & fringe spacing.';
    } else {
      el.pairInspector.textContent = 'Form a baseline to inspect individual spatial-frequency tracks.';
    }
  }

  // Sync buttons
  [el.syncButton, el.stageSyncButton].forEach((btn) => {
    if (!btn) return;
    btn.classList.toggle('is-on', state.synced);
    btn.setAttribute('aria-pressed', String(state.synced));
    if (btn === el.stageSyncButton) {
      btn.textContent = state.synced ? 'Clock Sync: ON' : 'Clock Sync: OFF';
    } else {
      btn.textContent = state.synced ? 'Clock sync ON' : 'Clock sync OFF';
    }
  });

  // Target switcher
  document.querySelectorAll('.eht-target-btn').forEach((btn) => {
    const active = btn.dataset.target === state.targetId;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // View mode pills
  document.querySelectorAll('.eht-view-btn').forEach((btn) => {
    const active = btn.dataset.view === state.viewMode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // Palette pills
  document.querySelectorAll('.eht-palette-btn').forEach((btn) => {
    const active = btn.dataset.palette === state.palette;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  if (el.scaleToggleButton) {
    el.scaleToggleButton.classList.toggle('is-active', state.showScale);
    el.scaleToggleButton.setAttribute('aria-pressed', String(state.showScale));
  }

  if (el.compareToggleButton) {
    const compareSupported = state.targetId === 'm87';
    el.compareToggleButton.hidden = !compareSupported;
    el.compareToggleButton.classList.toggle('is-active', state.showCompare && compareSupported);
    el.compareToggleButton.setAttribute('aria-pressed', String(state.showCompare && compareSupported));
  }

  if (el.compareSplitControl) {
    el.compareSplitControl.hidden = !(
      state.showCompare &&
      state.targetId === 'm87' &&
      state.viewMode !== 'psf' &&
      metrics.baselinePairs > 0
    );
  }

  if (el.sgraBlurButton) {
    el.sgraBlurButton.hidden = state.targetId !== 'sgra';
    el.sgraBlurButton.classList.toggle('is-active', state.sgraBlur);
    el.sgraBlurButton.setAttribute('aria-pressed', String(state.sgraBlur));
  }

  if (el.synthesisHours) {
    el.synthesisHours.value = String(state.synthesisHours);
  }
  if (el.synthesisHoursLabel) {
    el.synthesisHoursLabel.textContent =
      state.synthesisHours <= 0 ? 'Snapshot (0 h)' : `${state.synthesisHours.toFixed(1)} h`;
  }
  if (el.rotationPlayButton) {
    el.rotationPlayButton.classList.toggle('is-active', state.isRotating);
    el.rotationPlayButton.setAttribute('aria-pressed', String(state.isRotating));
    el.rotationPlayButton.textContent = state.isRotating ? '❚❚ Pause' : '▶ Rotate Earth';
  }

  // Station buttons
  STATIONS.forEach((station) => {
    const btn = stationButtons.get(station.id);
    if (!btn) return;
    const selected = state.active.has(station.id);
    const observable = canStationObserveTarget(station, target);
    btn.classList.toggle('is-active', selected && observable);
    btn.classList.toggle('is-blocked', selected && !observable);
    btn.setAttribute('aria-pressed', String(selected));

    const badge = btn.querySelector('[data-status]');
    if (badge) {
      if (!observable) {
        badge.textContent = 'Below horizon';
        badge.className = 'eht-station-status is-blocked';
      } else if (selected) {
        badge.textContent = 'Online';
        badge.className = 'eht-station-status is-online';
      } else {
        badge.textContent = 'Standby';
        badge.className = 'eht-station-status';
      }
    }
  });
}

function refreshHighlightViews() {
  const { metrics } = getCurrentMetricsAndSynthesis();
  renderMap(metrics);
  drawCoveragePlot(metrics);
  drawCorrelatorStrip(metrics);
  if (el.pairInspector) {
    const inspectedId = getInspectedPairId();
    const pair = metrics.activeTracks.find((t) => t.id === inspectedId);
    if (pair) {
      el.pairInspector.textContent = `Baseline ${pair.from.short}–${pair.to.short}: ${Math.round(pair.chordKm).toLocaleString()} km chord · max ${Math.round(pair.maxUvMl).toLocaleString()} Mλ (fringe ≈ ${Math.round(pair.minFringeUas).toLocaleString()} μas)`;
    } else if (metrics.activeTracks.length > 0) {
      el.pairInspector.textContent = 'Hover or click any baseline arc or u–v curve to inspect its chord & fringe spacing.';
    }
  }
}

function renderAll() {
  const { metrics, synth } = getCurrentMetricsAndSynthesis();
  renderMap(metrics);
  renderReadout(metrics, synth);
  renderReconstructionCanvas(metrics, synth);
  drawCoveragePlot(metrics);
  drawCorrelatorStrip(metrics);
}

function enterMovement(movement) {
  const cfg = MOVEMENT_CONFIGS[movement];
  if (!cfg) return;
  state.movement = movement;
  state.active = new Set(cfg.stations);
  state.synced = true;
  state.viewMode = cfg.viewMode;
  state.pinnedPairId = null;
  state.hoveredPairId = null;
  if (movement === 'connect') {
    state.synthesisHours = 4;
  } else if (movement === 'accumulate' || movement === 'resolve') {
    state.synthesisHours = 8;
  }
  if (el.viewport) el.viewport.dataset.movement = movement;
  if (el.movementNumber) el.movementNumber.textContent = cfg.number;
  if (el.movementTitle) el.movementTitle.textContent = cfg.title;
  if (el.movementPrompt) el.movementPrompt.textContent = cfg.prompt;
  renderAll();
}

function setTarget(targetId) {
  if (!TARGETS[targetId] || state.targetId === targetId) return;
  state.targetId = targetId;
  state.hoveredPairId = null;
  state.pinnedPairId = null;
  if (targetId === 'sgra') {
    state.showCompare = false;
  }
  renderAll();
}

function bindEvents() {
  document.querySelectorAll('.eht-score-tabs .ll-tab').forEach((tab) => {
    tab.addEventListener('click', () => enterMovement(tab.dataset.movement));
  });

  document.querySelectorAll('[data-next-pane]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = document.querySelector(`.ll-tab[data-pane="${btn.dataset.nextPane}"]`);
      if (targetTab) targetTab.click();
    });
  });

  document.querySelectorAll('.eht-target-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTarget(btn.dataset.target));
  });

  document.querySelectorAll('.eht-view-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.viewMode = btn.dataset.view;
      renderAll();
    });
  });

  document.querySelectorAll('.eht-palette-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.palette = btn.dataset.palette;
      renderAll();
    });
  });

  [el.syncButton, el.stageSyncButton].forEach((btn) => {
    btn?.addEventListener('click', () => {
      state.synced = !state.synced;
      renderAll();
    });
  });

  el.rotationPlayButton?.addEventListener('click', () => {
    state.isRotating = !state.isRotating;
    if (state.isRotating && state.synthesisHours >= 11.8) {
      state.synthesisHours = 0;
    }
    lastSynthSignature = '';
    renderAll();
  });

  el.synthesisHours?.addEventListener('input', () => {
    state.isRotating = false;
    state.synthesisHours = Number(el.synthesisHours.value);
    renderAll();
  });

  el.scaleToggleButton?.addEventListener('click', () => {
    state.showScale = !state.showScale;
    renderAll();
  });

  el.compareToggleButton?.addEventListener('click', () => {
    state.showCompare = !state.showCompare;
    renderAll();
  });

  el.compareSplit?.addEventListener('input', () => {
    state.compareSplit = Number(el.compareSplit.value) / 100;
    renderAll();
  });

  el.sgraBlurButton?.addEventListener('click', () => {
    state.sgraBlur = !state.sgraBlur;
    renderAll();
  });

  // Preset buttons
  el.chilePresetButton?.addEventListener('click', () => {
    state.active = new Set(['alma', 'apex']);
    state.synced = true;
    renderAll();
  });

  el.longPairButton?.addEventListener('click', () => {
    state.active = new Set(['alma', 'jcmt']);
    state.synced = true;
    state.synthesisHours = 2;
    state.viewMode = 'dirty';
    renderAll();
  });

  el.widePresetButton?.addEventListener('click', () => {
    state.active = new Set(['alma', 'apex', 'jcmt', 'sma']);
    state.synced = true;
    state.viewMode = 'reconstructed';
    renderAll();
  });

  el.americasPresetButton?.addEventListener('click', () => {
    state.active = new Set(['alma', 'apex', 'lmt', 'smt', 'spt']);
    state.synced = true;
    state.viewMode = 'reconstructed';
    renderAll();
  });

  el.selectAllButton?.addEventListener('click', () => {
    state.active = new Set(STATIONS.map((s) => s.id));
    state.synced = true;
    renderAll();
  });

  el.dropAlmaButton?.addEventListener('click', () => {
    if (state.active.size <= 1) {
      state.active = new Set(STATIONS.map((s) => s.id));
    }
    state.active.delete('alma');
    renderAll();
  });

  el.clearButton?.addEventListener('click', () => {
    state.active = new Set();
    state.pinnedPairId = null;
    state.hoveredPairId = null;
    renderAll();
  });

  el.switchSgraButton?.addEventListener('click', () => {
    state.targetId = 'sgra';
    state.active = new Set(STATIONS.map((s) => s.id));
    state.synced = true;
    state.viewMode = 'reconstructed';
    state.showCompare = false;
    renderAll();
  });

  // Interactive u-v canvas hover / pin hit-testing
  el.coverageCanvas?.addEventListener('mousemove', (event) => {
    if (!cachedPlotGeometry || !cachedPlotGeometry.tracks.length) return;
    const rect = el.coverageCanvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    let bestId = null;
    let bestDist = 13;

    for (const track of cachedPlotGeometry.tracks) {
      for (const sign of [-1, 1]) {
        for (const pt of track.points) {
          const px = cachedPlotGeometry.xFor(pt.u * sign);
          const py = cachedPlotGeometry.yFor(pt.v * sign);
          const d = Math.hypot(mx - px, my - py);
          if (d < bestDist) {
            bestDist = d;
            bestId = track.id;
          }
        }
      }
    }

    if (bestId !== state.hoveredPairId) {
      state.hoveredPairId = bestId;
      refreshHighlightViews();
    }
  });

  el.coverageCanvas?.addEventListener('mouseleave', () => {
    if (state.hoveredPairId !== null) {
      state.hoveredPairId = null;
      refreshHighlightViews();
    }
  });

  el.coverageCanvas?.addEventListener('click', () => {
    if (state.hoveredPairId) {
      state.pinnedPairId = state.pinnedPairId === state.hoveredPairId ? null : state.hoveredPairId;
      refreshHighlightViews();
    }
  });

  // Click empty map background clears pinned pair
  document.getElementById('ehtMap')?.addEventListener('click', (event) => {
    if (event.target.id === 'ehtMap' || event.target.classList.contains('eht-natural-earth-map')) {
      if (state.pinnedPairId) {
        state.pinnedPairId = null;
        refreshHighlightViews();
      }
    }
  });

  // Quick check (4 questions)
  el.checkUnderstandingButton?.addEventListener('click', () => {
    const q1 = document.querySelector('input[name="eht-q1"]:checked');
    const q2 = document.querySelector('input[name="eht-q2"]:checked');
    const q3 = document.querySelector('input[name="eht-q3"]:checked');
    const q4 = document.querySelector('input[name="eht-q4"]:checked');
    if (!el.checkFeedback) return;

    if (!q1 || !q2 || !q3 || !q4) {
      el.checkFeedback.textContent = 'Choose one answer for all four questions.';
      el.checkFeedback.className = 'eht-check-feedback is-try';
      return;
    }

    const expected = { q1: 'b', q2: 'a', q3: 'c', q4: 'b' };
    const answers = { q1: q1.value, q2: q2.value, q3: q3.value, q4: q4.value };
    const score = Object.keys(expected).filter((k) => answers[k] === expected[k]).length;

    if (score === 4) {
      el.checkFeedback.textContent =
        '4/4 — Exact. You connected baseline geometry, radio-intensity colormaps, South Pole horizon visibility, and phase synchronization.';
      el.checkFeedback.className = 'eht-check-feedback is-correct';
    } else {
      const hints = [];
      if (answers.q1 !== expected.q1) hints.push('Q1: adding a station adds baselines, it never changes the black hole');
      if (answers.q2 !== expected.q2) hints.push('Q2: orange maps 1.3 mm radio brightness, not visible color');
      if (answers.q3 !== expected.q3) hints.push('Q3: M87* (+12.4°) stays below the South Pole horizon, while Sgr A* (−29.0°) stays up 24 h');
      if (answers.q4 !== expected.q4) hints.push('Q4: losing atomic clock sync scrambles wave phases into speckle noise');
      el.checkFeedback.textContent = `${score}/4 correct. Check ${hints.join('; ')}.`;
      el.checkFeedback.className = 'eht-check-feedback is-try';
    }
  });

  // Responsive canvas resizes
  window.addEventListener('resize', renderAll);
  document.addEventListener('ll:panel', () => {
    window.requestAnimationFrame(renderAll);
  });

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => renderAll());
    if (el.canvas) observer.observe(el.canvas);
    if (el.coverageCanvas) observer.observe(el.coverageCanvas);
    if (el.correlatorCanvas) observer.observe(el.correlatorCanvas);
  }
}

function animationTick(now) {
  if (!lastAnimTime) lastAnimTime = now;
  const dt = Math.min(0.1, (now - lastAnimTime) / 1000);
  lastAnimTime = now;

  if (!reducedMotionQuery.matches) {
    state.correlatorPhase += dt * 3.4;
    const { metrics } = getCurrentMetricsAndSynthesis();
    drawCorrelatorStrip(metrics);
    if (metrics.baselinePairs === 0 && state.viewMode !== 'psf') {
      renderReconstructionCanvas(metrics, cachedSynthesis);
    }
  }

  if (state.isRotating) {
    state.synthesisHours += dt * 1.4;
    if (state.synthesisHours >= 12) {
      state.synthesisHours = 12;
      state.isRotating = false;
      lastSynthSignature = '';
      renderAll();
    } else {
      renderAll();
    }
  }

  animFrameId = window.requestAnimationFrame(animationTick);
}

function openDesktopPanel() {
  if (window.matchMedia('(min-width: 681px)').matches && window.LessonLayout?.openPanel) {
    window.LessonLayout.openPanel(true);
  }
}

function init() {
  renderStationList();
  bindEvents();
  enterMovement('listen');

  if (document.readyState === 'complete') {
    openDesktopPanel();
  } else {
    document.addEventListener(
      'DOMContentLoaded',
      () => window.setTimeout(openDesktopPanel, 0),
      { once: true }
    );
  }

  if (animFrameId === null) {
    animFrameId = window.requestAnimationFrame(animationTick);
  }
}

init();
