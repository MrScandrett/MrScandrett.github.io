import {
  SCENARIOS,
  COAL_RANKS,
  TRAP_TYPES,
  MISSIONS,
  clamp,
  computeBurialState,
  computeWindowDepths,
  getTrapProfile,
  evaluateWellDrill,
  computeTimescaleComparison,
  evaluateMissions,
} from './fossil-fuel-model.mjs';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function createCanvasController(canvas, drawFn) {
  if (globalThis.SimKit && typeof globalThis.SimKit.canvas2d === 'function') {
    return globalThis.SimKit.canvas2d(canvas, {
      onResize: () => drawFn(),
    });
  }
  const ctx = canvas.getContext('2d');
  const box = canvas.parentElement;
  const ctrl = {
    ctx,
    width: 640,
    height: 400,
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(240, box.clientWidth);
      const h = Math.max(200, box.clientHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctrl.width = w;
      ctrl.height = h;
      drawFn();
    },
  };
  if (globalThis.ResizeObserver) {
    new ResizeObserver(() => ctrl.resize()).observe(box);
  } else {
    window.addEventListener('resize', () => ctrl.resize());
  }
  ctrl.resize();
  return ctrl;
}

// ── Global Lesson State ──────────────────────────────────────────────────────
const simState = {
  material: 'coal',
  depthM: 1200,
  gradientCPerKm: 30,
  durationMyr: 60,
  playing: false,
  activePreset: null,
};

const missionProgress = {
  'crack-oil': false,
  'shift-window': false,
  'forge-anthracite': false,
  overcook: false,
  'strike-oil': false,
};

const trapState = {
  trapId: 'anticline',
  wellX: 0.4,
  targetY: 0.39,
  caprockIntact: true,
  porosityPct: 20,
  lastDrill: null,
};

// ── DOM References: Lab 1 ────────────────────────────────────────────────────
const basinCanvas = document.getElementById('basinCanvas');
const depthSlider = document.getElementById('simDepth');
const gradSlider = document.getElementById('simGrad');
const durSlider = document.getElementById('simDuration');
const depthValEl = document.getElementById('depthVal');
const gradValEl = document.getElementById('gradVal');
const durValEl = document.getElementById('durVal');
const readoutTemp = document.getElementById('readoutTemp');
const readoutPres = document.getElementById('readoutPres');
const readoutRo = document.getElementById('readoutRo');
const readoutStage = document.getElementById('readoutStage');
const yieldZoneLabel = document.getElementById('yieldZoneLabel');
const yieldBar = document.getElementById('yieldBar');
const yieldLegend = document.getElementById('yieldLegend');
const btnPlayBurial = document.getElementById('btnPlayBurial');
const btnResetBurial = document.getElementById('btnResetBurial');
const missionCounterPill = document.getElementById('missionCounterPill');
const missionStrip = document.getElementById('missionStrip');
const materialButtons = document.querySelectorAll('[data-material]');
const presetButtons = document.querySelectorAll('[data-scenario]');

// Particle state for Lab 1 & Lab 3
const basinParticles = Array.from({ length: 28 }, (_, i) => ({
  xFrac: ((i * 37) % 100) / 100,
  offset: (i * 0.13) % 1,
  speed: 0.25 + ((i * 19) % 10) * 0.03,
  radius: 2 + (i % 3),
}));

const trapParticles = Array.from({ length: 34 }, (_, i) => ({
  xFrac: 0.16 + (((i * 29) % 68) / 100),
  phase: (i * 0.11) % 1,
  speed: 0.18 + (i % 5) * 0.035,
  isGas: i % 3 === 0,
}));

function renderMissions() {
  const status = evaluateMissions(missionProgress);
  if (missionCounterPill) {
    missionCounterPill.textContent = `Missions: ${status.count}/${status.total}`;
  }
  if (!missionStrip) return;
  missionStrip.innerHTML = status.items
    .map(
      (item) => `
      <div class="mission-chip${item.completed ? ' done' : ''}" data-mission="${item.id}">
        <div class="mission-chip-head">
          <span aria-hidden="true">${item.completed ? '✓' : '○'}</span>
          <span>${item.title}</span>
        </div>
        <p>${item.hint}</p>
      </div>`
    )
    .join('');
}

function updateMissionsFromBurial(computed) {
  let changed = false;
  if (computed.material === 'petroleum' && computed.stageId === 'oil' && !missionProgress['crack-oil']) {
    missionProgress['crack-oil'] = true;
    changed = true;
  }
  if ((computed.gradientCPerKm <= 20 || computed.gradientCPerKm >= 40) && !missionProgress['shift-window']) {
    missionProgress['shift-window'] = true;
    changed = true;
  }
  if (
    computed.material === 'coal' &&
    computed.stageId === 'anthracite' &&
    computed.carbonPct >= 90 &&
    !missionProgress['forge-anthracite']
  ) {
    missionProgress['forge-anthracite'] = true;
    changed = true;
  }
  if ((computed.stageId === 'graphite' || computed.stageId === 'overcooked') && !missionProgress.overcook) {
    missionProgress.overcook = true;
    changed = true;
  }
  if (changed) renderMissions();
}

function renderYieldPanel(computed) {
  if (!yieldBar || !yieldLegend || !yieldZoneLabel) return;

  if (computed.material === 'coal') {
    yieldZoneLabel.textContent = `${computed.zone} · ~${computed.energyMJkg} MJ/kg · 10 m peat → ${computed.compactionThicknessM} m`;
    const sum = computed.carbonPct + computed.moisturePct + computed.volatilesPct;
    const cW = (computed.carbonPct / sum) * 100;
    const mW = (computed.moisturePct / sum) * 100;
    const vW = Math.max(0, 100 - cW - mW);

    yieldBar.innerHTML = `
      <div class="yield-seg" style="width:${cW.toFixed(1)}%;background:#c89a4a;"></div>
      <div class="yield-seg" style="width:${mW.toFixed(1)}%;background:#38bdf8;"></div>
      <div class="yield-seg" style="width:${vW.toFixed(1)}%;background:#f59e0b;"></div>
    `;
    yieldLegend.innerHTML = `
      <span class="yield-legend-item"><i class="yield-dot" style="background:#c89a4a"></i>Fixed Carbon: <strong>${computed.carbonPct}%</strong></span>
      <span class="yield-legend-item"><i class="yield-dot" style="background:#38bdf8"></i>Moisture: <strong>${computed.moisturePct}%</strong></span>
      <span class="yield-legend-item"><i class="yield-dot" style="background:#f59e0b"></i>Volatiles (CH₄/CO₂): <strong>${computed.volatilesPct}%</strong></span>
    `;
  } else {
    yieldZoneLabel.textContent = `${computed.zone} · Maturity ${computed.roPct}% Rₒ`;
    yieldBar.innerHTML = `
      <div class="yield-seg" style="width:${computed.kerogenPct}%;background:#64748b;"></div>
      <div class="yield-seg" style="width:${computed.oilYieldPct}%;background:#4ade80;"></div>
      <div class="yield-seg" style="width:${computed.gasYieldPct}%;background:#38bdf8;"></div>
      <div class="yield-seg" style="width:${computed.graphitePct}%;background:#ef4444;"></div>
    `;
    yieldLegend.innerHTML = `
      <span class="yield-legend-item"><i class="yield-dot" style="background:#64748b"></i>Kerogen: <strong>${computed.kerogenPct}%</strong></span>
      <span class="yield-legend-item"><i class="yield-dot" style="background:#4ade80"></i>Crude Oil: <strong>${computed.oilYieldPct}%</strong></span>
      <span class="yield-legend-item"><i class="yield-dot" style="background:#38bdf8"></i>Natural Gas: <strong>${computed.gasYieldPct}%</strong></span>
      <span class="yield-legend-item"><i class="yield-dot" style="background:#ef4444"></i>Graphite Residue: <strong>${computed.graphitePct}%</strong></span>
    `;
  }
}

function updateLabUI() {
  const computed = computeBurialState(simState);
  depthSlider.value = String(computed.depthM);
  gradSlider.value = String(computed.gradientCPerKm);
  durSlider.value = String(computed.durationMyr);

  depthValEl.textContent = `${computed.depthM.toLocaleString()} m`;
  gradValEl.textContent = `${computed.gradientCPerKm} °C/km`;
  durValEl.textContent = `${computed.durationMyr} Myr`;

  readoutTemp.textContent = `${computed.tempC} °C`;
  readoutPres.textContent = `${computed.pressureMPa} MPa`;
  readoutRo.textContent = `${computed.roPct}% Rₒ`;
  readoutStage.textContent = computed.stageName;
  readoutStage.style.color = computed.accentColor;

  materialButtons.forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.material === simState.material ? 'true' : 'false');
  });

  presetButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.scenario === simState.activePreset);
  });

  if (btnPlayBurial) {
    btnPlayBurial.textContent = simState.playing ? '⏸ Pause Burial' : '▶ Animate Burial';
  }

  renderYieldPanel(computed);
  updateMissionsFromBurial(computed);
  return computed;
}

// ── Lab 1 Canvas Renderer ────────────────────────────────────────────────────
let basinCtrl;
let animClock = 0;

function drawBasinScene() {
  if (!basinCtrl) return;
  const { ctx, width: w, height: h } = basinCtrl;
  const computed = computeBurialState(simState);
  const windows = computeWindowDepths(
    simState.material,
    simState.gradientCPerKm,
    simState.durationMyr
  );

  const leftAxisW = 54;
  const rightAxisW = 60;
  const plotX = leftAxisW;
  const plotW = Math.max(120, w - leftAxisW - rightAxisW);
  const topMargin = 54;
  const bottomMargin = 42;
  const plotH = Math.max(120, h - topMargin - bottomMargin);

  const depthToY = (d) => topMargin + (clamp(d, 0, 6000) / 6000) * plotH;

  // 1. Background
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#070a0e';
  ctx.fillRect(0, 0, w, h);

  // 2. Surface biosphere strip (0..topMargin)
  if (simState.material === 'coal') {
    const sky = ctx.createLinearGradient(0, 0, 0, topMargin);
    sky.addColorStop(0, '#0f221b');
    sky.addColorStop(1, '#1b3828');
    ctx.fillStyle = sky;
    ctx.fillRect(plotX, 0, plotW, topMargin);

    // Stylized Carboniferous swamp trees
    ctx.fillStyle = '#2d5a3b';
    for (let tx = plotX + 22; tx < plotX + plotW - 15; tx += 52) {
      ctx.fillRect(tx - 2, 16, 4, topMargin - 16);
      ctx.beginPath();
      ctx.arc(tx, 16, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#4d3f23';
    ctx.fillRect(plotX, topMargin - 7, plotW, 7);
    ctx.fillStyle = '#d9f99d';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Carboniferous Swamp Forest (Land Plants)', plotX + 10, 15);
  } else {
    const sea = ctx.createLinearGradient(0, 0, 0, topMargin);
    sea.addColorStop(0, '#0c4a6e');
    sea.addColorStop(1, '#082f49');
    ctx.fillStyle = sea;
    ctx.fillRect(plotX, 0, plotW, topMargin);

    // Drifting plankton dots
    ctx.fillStyle = 'rgba(134, 239, 172, 0.72)';
    for (let px = plotX + 18; px < plotX + plotW - 12; px += 28) {
      const py = 20 + ((px * 7 + Math.floor(animClock * 12)) % (topMargin - 26));
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#bae6fd';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Sunlit Mesozoic Sea (Marine Algae & Plankton)', plotX + 10, 15);
  }

  // 3. Base rock strata bands
  const strataColors = ['#182230', '#1d2738', '#171f2c', '#121822', '#0d1118'];
  for (let i = 0; i < strataColors.length; i++) {
    const y0 = topMargin + (i / strataColors.length) * plotH;
    const y1 = topMargin + ((i + 1) / strataColors.length) * plotH;
    ctx.fillStyle = strataColors[i];
    ctx.fillRect(plotX, y0, plotW, y1 - y0);
  }

  // 4. Dynamic Thermal Window overlays
  windows.forEach((win) => {
    const y0 = depthToY(win.topM);
    const y1 = depthToY(win.bottomM);
    const bandH = y1 - y0;
    if (bandH <= 1) return;

    ctx.fillStyle = win.color;
    ctx.fillRect(plotX, y0, plotW, bandH);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(plotX, y0);
    ctx.lineTo(plotX + plotW, y0);
    ctx.stroke();
    ctx.setLineDash([]);

    if (bandH >= 18) {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.78)';
      ctx.font = '700 10px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(win.label.toUpperCase(), plotX + plotW - 10, y0 + 14);
    }
  });

  // 5. Left depth scale (0..6 km) and Right temperature ticks
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(plotX, topMargin);
  ctx.lineTo(plotX, topMargin + plotH);
  ctx.moveTo(plotX + plotW, topMargin);
  ctx.lineTo(plotX + plotW, topMargin + plotH);
  ctx.stroke();

  ctx.font = '600 10px ui-monospace, monospace';
  for (let km = 0; km <= 6; km++) {
    const y = depthToY(km * 1000);
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'right';
    ctx.fillText(`${km} km`, plotX - 8, y + 3);

    const tAtKm = Math.round(15 + km * simState.gradientCPerKm);
    ctx.fillStyle = tAtKm >= 150 ? '#7dd3fc' : tAtKm >= 60 ? '#86efac' : '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.fillText(`${tAtKm}°C`, plotX + plotW + 8, y + 3);
  }

  // 6. Active buried organic seam + parcel card
  const parcelY = depthToY(computed.depthM);
  const seamThickness =
    simState.material === 'coal'
      ? clamp(4 + (computed.compactionThicknessM / 10) * 14, 4, 18)
      : 10;

  ctx.fillStyle =
    simState.material === 'coal'
      ? computed.stageId === 'peat'
        ? '#7c6438'
        : computed.stageId === 'lignite'
        ? '#4e3820'
        : '#17191d'
      : '#101b16';
  ctx.fillRect(plotX, parcelY - seamThickness / 2, plotW, seamThickness);

  ctx.strokeStyle = computed.accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plotX, parcelY);
  ctx.lineTo(plotX + plotW, parcelY);
  ctx.stroke();

  // Rising expulsion particles
  if (computed.expulsionMode !== 'none') {
    const pColor =
      computed.expulsionMode === 'oil'
        ? 'rgba(74, 222, 128, 0.85)'
        : computed.expulsionMode === 'gas' || computed.expulsionMode === 'methane'
        ? 'rgba(56, 189, 248, 0.88)'
        : 'rgba(186, 230, 253, 0.65)';
    ctx.fillStyle = pColor;
    basinParticles.forEach((p) => {
      const travel = ((animClock * p.speed + p.offset) % 1) * Math.min(95, parcelY - topMargin);
      const px = plotX + 20 + p.xFrac * (plotW - 40);
      const py = parcelY - travel;
      if (py > topMargin + 4) {
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Parcel label badge
  const cardW = Math.min(plotW - 24, 330);
  const cardH = 54;
  const cardX = plotX + (plotW - cardW) / 2;
  const cardY = clamp(parcelY - cardH / 2, topMargin + 6, topMargin + plotH - cardH - 6);

  ctx.fillStyle = 'rgba(10, 14, 20, 0.92)';
  ctx.strokeStyle = computed.accentColor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = computed.accentColor;
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(computed.stageName, cardX + cardW / 2, cardY + 22);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '500 11px system-ui, sans-serif';
  const sub =
    computed.subtitle.length > 48 ? `${computed.subtitle.slice(0, 46)}…` : computed.subtitle;
  ctx.fillText(sub, cardX + cardW / 2, cardY + 41);

  // 7. Bottom status bar
  const barY = h - 34;
  ctx.fillStyle = 'rgba(8, 12, 17, 0.94)';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(plotX, barY, plotW, 26, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = computed.accentColor;
  ctx.font = '700 11.5px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(computed.statusText, plotX + plotW / 2, barY + 17);
}

// ── Lab 2: Coal 10-Meter Squeeze & Rank Inspector ────────────────────────────
const coalRankTabs = document.getElementById('coalRankTabs');
const squeezeFill = document.getElementById('squeezeFill');
const squeezeHeight = document.getElementById('squeezeHeight');
const coalRankTitle = document.getElementById('coalRankTitle');
const coalRankTemp = document.getElementById('coalRankTemp');
const coalCarbonBar = document.getElementById('coalCarbonBar');
const coalCarbonVal = document.getElementById('coalCarbonVal');
const coalMoistureBar = document.getElementById('coalMoistureBar');
const coalMoistureVal = document.getElementById('coalMoistureVal');
const coalEnergyBar = document.getElementById('coalEnergyBar');
const coalEnergyVal = document.getElementById('coalEnergyVal');
const coalRankDesc = document.getElementById('coalRankDesc');
const coalRankUses = document.getElementById('coalRankUses');

function selectCoalRank(rankId) {
  const rank = COAL_RANKS.find((r) => r.id === rankId) || COAL_RANKS[0];
  if (!coalRankTabs) return;

  coalRankTabs.querySelectorAll('.coal-tab').forEach((btn) => {
    btn.setAttribute('aria-selected', btn.dataset.rank === rank.id ? 'true' : 'false');
  });

  if (squeezeFill) {
    squeezeFill.style.height = `${clamp((rank.thicknessFrom10m / 10) * 100, 7, 100)}%`;
    squeezeFill.style.background = `linear-gradient(180deg, ${rank.swatchTop}, ${rank.swatchBottom})`;
  }
  if (squeezeHeight) squeezeHeight.textContent = `${rank.thicknessFrom10m} m`;
  if (coalRankTitle) coalRankTitle.textContent = `${rank.name} — ${rank.subtitle}`;
  if (coalRankTemp) coalRankTemp.textContent = `${rank.tempRange} · ${rank.depthRange}`;
  if (coalCarbonBar) coalCarbonBar.style.width = `${rank.carbonPct}%`;
  if (coalCarbonVal) coalCarbonVal.textContent = `${rank.carbonPct}%`;
  if (coalMoistureBar) coalMoistureBar.style.width = `${rank.moisturePct}%`;
  if (coalMoistureVal) coalMoistureVal.textContent = `${rank.moisturePct}%`;
  if (coalEnergyBar) coalEnergyBar.style.width = `${Math.round((rank.energyMJkg / 36) * 100)}%`;
  if (coalEnergyVal) coalEnergyVal.textContent = `${rank.energyMJkg} MJ/kg`;
  if (coalRankDesc) coalRankDesc.textContent = rank.description;
  if (coalRankUses) coalRankUses.textContent = `Primary uses: ${rank.uses}.`;
}

function initCoalInspector() {
  if (!coalRankTabs) return;
  coalRankTabs.innerHTML = COAL_RANKS.map(
    (r, idx) => `
    <button type="button" class="coal-tab" role="tab" data-rank="${r.id}" aria-selected="${idx === 0 ? 'true' : 'false'}">
      <span class="coal-tab-swatch" style="background:linear-gradient(180deg, ${r.swatchTop}, ${r.swatchBottom});"></span>
      <span>${r.name}</span>
    </button>`
  ).join('');

  coalRankTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.coal-tab');
    if (btn) selectCoalRank(btn.dataset.rank);
  });

  selectCoalRank('peat');
}

// ── Lab 3: Petroleum Trap & Exploration Drill Explorer ───────────────────────
const trapCanvas = document.getElementById('trapCanvas');
const trapSummaryEl = document.getElementById('trapSummary');
const trapSealBtn = document.getElementById('trapSealBtn');
const trapPorositySlider = document.getElementById('trapPorosity');
const trapPorosityVal = document.getElementById('trapPorosityVal');
const trapWellXSlider = document.getElementById('trapWellX');
const trapWellXVal = document.getElementById('trapWellXVal');
const trapTargetYSlider = document.getElementById('trapTargetY');
const trapTargetYVal = document.getElementById('trapTargetYVal');
const btnDrillWell = document.getElementById('btnDrillWell');
const wellLogCard = document.getElementById('wellLogCard');
const wellLogDepth = document.getElementById('wellLogDepth');
const wellLogFlow = document.getElementById('wellLogFlow');
const wellLogTitle = document.getElementById('wellLogTitle');
const wellLogDetail = document.getElementById('wellLogDetail');
const trapTabButtons = document.querySelectorAll('[data-trap]');

let trapCtrl;

function runWellDrill() {
  const result = evaluateWellDrill(trapState);
  trapState.lastDrill = result;

  if (wellLogCard) {
    wellLogCard.className = `well-log outcome-${result.outcome}`;
  }
  if (wellLogDepth) wellLogDepth.textContent = `TD: ${result.depthM.toLocaleString()} m`;
  if (wellLogFlow) wellLogFlow.textContent = result.flowEstimate;
  if (wellLogTitle) wellLogTitle.textContent = result.title;
  if (wellLogDetail) wellLogDetail.textContent = result.detail;

  if (result.outcome === 'oil' && !missionProgress['strike-oil']) {
    missionProgress['strike-oil'] = true;
    renderMissions();
  }
}

function updateTrapControlsUI() {
  const info = TRAP_TYPES[trapState.trapId];
  if (trapSummaryEl && info) trapSummaryEl.textContent = info.summary;
  trapTabButtons.forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.trap === trapState.trapId ? 'true' : 'false');
  });
  if (trapSealBtn) {
    trapSealBtn.setAttribute('aria-pressed', trapState.caprockIntact ? 'true' : 'false');
    trapSealBtn.querySelector('strong').textContent = trapState.caprockIntact
      ? 'Intact Shale'
      : 'Fractured (Leaking)';
  }
  if (trapPorositySlider) trapPorositySlider.value = String(trapState.porosityPct);
  if (trapPorosityVal) trapPorosityVal.textContent = `${trapState.porosityPct}%`;
  if (trapWellXSlider) trapWellXSlider.value = String(Math.round(trapState.wellX * 100));
  if (trapWellXVal) trapWellXVal.textContent = `${Math.round(trapState.wellX * 100)}%`;
  if (trapTargetYSlider) trapTargetYSlider.value = String(Math.round(trapState.targetY * 4200));
  if (trapTargetYVal) trapTargetYVal.textContent = `${Math.round(trapState.targetY * 4200).toLocaleString()} m`;
}

function drawTrapScene() {
  if (!trapCtrl) return;
  const { ctx, width: w, height: h } = trapCtrl;
  const profile = getTrapProfile(trapState.trapId);
  const surfaceY = h * 0.12;

  ctx.clearRect(0, 0, w, h);

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, surfaceY);
  sky.addColorStop(0, '#0b1424');
  sky.addColorStop(1, '#162338');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, surfaceY);

  // Overburden rock
  ctx.fillStyle = '#18212f';
  ctx.fillRect(0, surfaceY, w, h - surfaceY);

  // Helper to sample profile curves cleanly across canvas width
  const steps = 60;
  const traceBand = (topFn, botFn, xStart = 0, xEnd = 1) => {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const xf = xStart + (xEnd - xStart) * (i / steps);
      const px = xf * w;
      const py = topFn(xf) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    for (let i = steps; i >= 0; i--) {
      const xf = xStart + (xEnd - xStart) * (i / steps);
      ctx.lineTo(xf * w, botFn(xf) * h);
    }
    ctx.closePath();
  };

  // Reservoir sandstone & horizontal density-sorted fluid layers
  const resX0 = profile.id === 'pinchout' ? profile.xMin : 0;
  const resX1 = profile.id === 'pinchout' ? profile.xMax : profile.id === 'fault' ? profile.faultX : 1;

  ctx.save();
  traceBand(profile.resTop, profile.resBottom, resX0, resX1);
  ctx.clip();

  // Sandstone matrix
  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 0, w, h);

  const gocPx = profile.gocY * h;
  const owcPx = profile.owcY * h;

  if (trapState.caprockIntact) {
    // Brine water
    ctx.fillStyle = 'rgba(30, 64, 175, 0.72)';
    ctx.fillRect(0, owcPx, w, h - owcPx);
    // Oil column
    ctx.fillStyle = 'rgba(22, 163, 74, 0.9)';
    ctx.fillRect(0, gocPx, w, owcPx - gocPx);
    // Gas cap
    ctx.fillStyle = 'rgba(14, 165, 233, 0.92)';
    ctx.fillRect(0, 0, w, gocPx);

    // Contact lines
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.75)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(0, gocPx);
    ctx.lineTo(w, gocPx);
    ctx.moveTo(0, owcPx);
    ctx.lineTo(w, owcPx);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Depleted brine-flooded sandstone
    ctx.fillStyle = 'rgba(30, 58, 138, 0.75)';
    ctx.fillRect(0, 0, w, h);
  }

  // Sandstone grain dots scaled with porosity
  ctx.fillStyle = 'rgba(253, 230, 138, 0.32)';
  const grainStep = trapState.porosityPct > 22 ? 14 : trapState.porosityPct > 13 ? 18 : 24;
  for (let gx = 8; gx < w; gx += grainStep) {
    for (let gy = h * 0.2; gy < h * 0.75; gy += 14) {
      ctx.fillRect(gx + (gy % 7), gy, 1.8, 1.8);
    }
  }
  ctx.restore();

  // Impermeable Shale Caprock Seal
  ctx.save();
  traceBand(profile.sealTop, profile.sealBottom, 0, 1);
  ctx.fillStyle = '#334155';
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // Special structural features: Fault block or Salt diapir
  if (profile.id === 'fault') {
    const fx = profile.faultX * w;
    ctx.fillStyle = '#273244';
    ctx.fillRect(fx, h * 0.22, w - fx, h * 0.56);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(fx, h * 0.16);
    ctx.lineTo(fx, h * 0.84);
    ctx.stroke();
    ctx.fillStyle = '#fca5a5';
    ctx.font = '700 10.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Sealing Fault Plane', fx + 8, h * 0.28);
  }

  if (profile.id === 'salt-dome') {
    ctx.beginPath();
    ctx.moveTo(w * 0.44, h * 0.24);
    ctx.quadraticCurveTo(w * 0.5, h * 0.18, w * 0.56, h * 0.24);
    ctx.lineTo(w * 0.66, h * 0.86);
    ctx.lineTo(w * 0.34, h * 0.86);
    ctx.closePath();
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SALT DOME', w * 0.5, h * 0.52);
  }

  // Deep Organic Black Source Shale
  const sourcePx = profile.sourceY * h;
  ctx.fillStyle = '#0e1116';
  ctx.fillRect(0, sourcePx, w, h - sourcePx);
  ctx.strokeStyle = '#22c55e';
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(0, sourcePx);
  ctx.lineTo(w, sourcePx);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#86efac';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Kerogen Source Rock (Cooking at Depth)', 12, sourcePx + 20);

  // Migrating hydrocarbon bubbles rising from source rock
  trapParticles.forEach((p) => {
    const pyNorm = profile.sourceY - ((animClock * p.speed + p.phase) % 1) * (profile.sourceY - profile.owcY);
    const px = p.xFrac * w;
    const py = pyNorm * h;
    if (profile.isSalt(p.xFrac, pyNorm)) return;
    ctx.fillStyle = p.isGas ? 'rgba(56, 189, 248, 0.78)' : 'rgba(74, 222, 128, 0.78)';
    ctx.beginPath();
    ctx.arc(px, py, p.isGas ? 2.2 : 2.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Fractured seal surface seep animation
  if (!trapState.caprockIntact) {
    const seepX = profile.suggestedOilWell.x * w;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(seepX, profile.sealBottom(profile.suggestedOilWell.x) * h);
    ctx.lineTo(seepX + 8, surfaceY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(248, 113, 113, 0.85)';
    ctx.beginPath();
    ctx.ellipse(seepX + 8, surfaceY, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fecaca';
    ctx.font = '700 10.5px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Fracture Seep (Hydrocarbons Escaped)', seepX + 8, surfaceY - 8);
  }

  // Ground line
  ctx.strokeStyle = '#65a30d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, surfaceY);
  ctx.lineTo(w, surfaceY);
  ctx.stroke();

  // Drilling Derrick + Borehole
  const wx = trapState.wellX * w;
  const ty = clamp(trapState.targetY * h, surfaceY + 12, h - 10);

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(wx - 10, surfaceY);
  ctx.lineTo(wx, surfaceY - 24);
  ctx.lineTo(wx + 10, surfaceY);
  ctx.moveTo(wx - 6, surfaceY - 9);
  ctx.lineTo(wx + 6, surfaceY - 9);
  ctx.stroke();

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2.4;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(wx, surfaceY);
  ctx.lineTo(wx, ty);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle =
    trapState.lastDrill && trapState.lastDrill.outcome === 'oil'
      ? '#4ade80'
      : trapState.lastDrill && trapState.lastDrill.outcome === 'gas'
      ? '#38bdf8'
      : '#fbbf24';
  ctx.beginPath();
  ctx.arc(wx, ty, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ── Deep-Time Math Lab ───────────────────────────────────────────────────────
const tsFormationSlider = document.getElementById('tsFormation');
const tsConsumptionSlider = document.getElementById('tsConsumption');
const tsFormationVal = document.getElementById('tsFormationVal');
const tsConsumptionVal = document.getElementById('tsConsumptionVal');
const tsRatioEl = document.getElementById('tsRatio');
const tsClockEl = document.getElementById('tsClock');
const tsBiomassEl = document.getElementById('tsBiomass');
const tsClockSliver = document.getElementById('tsClockSliver');
const tsNarrativeEl = document.getElementById('tsNarrative');

function updateTimescaleLab() {
  if (!tsFormationSlider || !tsConsumptionSlider) return;
  const formationMyr = Number(tsFormationSlider.value);
  const consumptionYears = Number(tsConsumptionSlider.value);
  const res = computeTimescaleComparison({ formationMyr, consumptionYears });

  tsFormationVal.textContent = `${res.formationMyr} Myr`;
  tsConsumptionVal.textContent = `${res.consumptionYears} yrs`;
  tsRatioEl.textContent = `${res.ratio.toLocaleString()}×`;
  tsClockEl.textContent = res.clockFormatted;
  tsBiomassEl.textContent = `~${res.biomassKgPerLiter.toLocaleString()} kg/L`;

  if (tsClockSliver) {
    const pct = clamp((res.clockSeconds / 86400) * 100, 0.35, 100);
    tsClockSliver.style.width = `${pct}%`;
  }
  if (tsNarrativeEl) {
    tsNarrativeEl.textContent = `If ${res.formationMyr} million years of geologic accumulation were compressed into one 24-hour day, burning through reserves in ${res.consumptionYears} years takes just ${res.clockFormatted} — a ${res.ratio.toLocaleString()}:1 mismatch.`;
  }
}

// ── 6-Question Diagnostic Quiz ───────────────────────────────────────────────
const QUIZ_KEY = [
  {
    id: 'fq1',
    answer: 'burial',
    explain:
      'All three fossil fuels begin when dead organisms are buried quickly in oxygen-poor sediment before decomposers can recycle their carbon back into CO₂.',
  },
  {
    id: 'fq2',
    answer: 'plankton',
    explain:
      'Microscopic marine algae and plankton settling onto anoxic seafloors form kerogen—the primary source of crude oil and natural gas. Dinosaurs were far too rare.',
  },
  {
    id: 'fq3',
    answer: 'anthracite',
    explain:
      'Anthracite experiences the deepest burial heat and pressure (metagenesis), driving off moisture and volatiles until carbon reaches ~90–97%.',
  },
  {
    id: 'fq4',
    answer: 'rift',
    explain:
      'A steeper geothermal gradient heats kerogen faster with depth, shifting the 60–150 °C oil window shallower in the crust.',
  },
  {
    id: 'fq5',
    answer: 'buoyancy',
    explain:
      'Oil and natural gas are less dense than salty pore water (brine), so buoyancy pushes them upward until an impermeable caprock seal traps them—gas on top, oil below.',
  },
  {
    id: 'fq6',
    answer: 'overcooked',
    explain:
      'Above ~225 °C, liquid oil and methane thermally crack all the way down into non-combustible residual graphite.',
  },
];

function initQuiz() {
  const checkBtn = document.getElementById('checkAnswers');
  const resetBtn = document.getElementById('resetQuiz');
  const feedbackEl = document.getElementById('quizFeedback');
  if (!checkBtn || !feedbackEl) return;

  checkBtn.addEventListener('click', () => {
    let score = 0;
    let answered = 0;

    QUIZ_KEY.forEach((item) => {
      const card = document.querySelector(`[data-quiz-q="${item.id}"]`);
      const selected = document.querySelector(`input[name="${item.id}"]:checked`);
      const explainEl = card ? card.querySelector('.q-explain') : null;

      if (selected) answered += 1;
      const correct = selected && selected.value === item.answer;
      if (correct) score += 1;

      if (card) {
        card.classList.remove('is-correct', 'is-wrong');
        card.classList.add(correct ? 'is-correct' : 'is-wrong');
      }
      if (explainEl) {
        explainEl.hidden = false;
        explainEl.textContent = (correct ? 'Correct: ' : 'Review: ') + item.explain;
      }
    });

    feedbackEl.className = `feedback ${score === QUIZ_KEY.length ? 'correct' : 'try'}`;
    if (answered < QUIZ_KEY.length) {
      feedbackEl.textContent = `${score}/${QUIZ_KEY.length} correct (${QUIZ_KEY.length - answered} unanswered). Check the highlighted explanations above.`;
    } else if (score === QUIZ_KEY.length) {
      feedbackEl.textContent = `Outstanding! ${score}/${QUIZ_KEY.length} correct — you mastered burial maturation, kerogen cracking, and reservoir trapping.`;
    } else {
      feedbackEl.textContent = `${score}/${QUIZ_KEY.length} correct. Review the explanations above and test the scenarios in the simulators.`;
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      QUIZ_KEY.forEach((item) => {
        const card = document.querySelector(`[data-quiz-q="${item.id}"]`);
        document.querySelectorAll(`input[name="${item.id}"]`).forEach((inp) => {
          inp.checked = false;
        });
        if (card) {
          card.classList.remove('is-correct', 'is-wrong');
          const explainEl = card.querySelector('.q-explain');
          if (explainEl) explainEl.hidden = true;
        }
      });
      feedbackEl.className = 'feedback';
      feedbackEl.textContent = '';
    });
  }
}

// ── Wire All Events & Start Render Loop ──────────────────────────────────────
function init() {
  if (basinCanvas) {
    basinCtrl = createCanvasController(basinCanvas, drawBasinScene);

    // Drag/click directly on depth profile canvas (zoom-safe getBoundingClientRect)
    let draggingDepth = false;
    const setDepthFromClientY = (clientY) => {
      const rect = basinCanvas.getBoundingClientRect();
      const topPad = 54;
      const botPad = 42;
      const frac = clamp((clientY - rect.top - topPad) / Math.max(40, rect.height - topPad - botPad), 0, 1);
      simState.depthM = Math.round((frac * 6000) / 100) * 100;
      simState.activePreset = null;
      simState.playing = false;
      updateLabUI();
      drawBasinScene();
    };

    basinCanvas.addEventListener('pointerdown', (e) => {
      draggingDepth = true;
      basinCanvas.setPointerCapture?.(e.pointerId);
      setDepthFromClientY(e.clientY);
    });
    basinCanvas.addEventListener('pointermove', (e) => {
      if (draggingDepth) setDepthFromClientY(e.clientY);
    });
    basinCanvas.addEventListener('pointerup', () => {
      draggingDepth = false;
    });
    basinCanvas.addEventListener('pointercancel', () => {
      draggingDepth = false;
    });
  }

  depthSlider?.addEventListener('input', () => {
    simState.depthM = Number(depthSlider.value);
    simState.activePreset = null;
    simState.playing = false;
    updateLabUI();
    drawBasinScene();
  });

  gradSlider?.addEventListener('input', () => {
    simState.gradientCPerKm = Number(gradSlider.value);
    simState.activePreset = null;
    updateLabUI();
    drawBasinScene();
  });

  durSlider?.addEventListener('input', () => {
    simState.durationMyr = Number(durSlider.value);
    simState.activePreset = null;
    updateLabUI();
    drawBasinScene();
  });

  materialButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      simState.material = btn.dataset.material;
      simState.activePreset = null;
      updateLabUI();
      drawBasinScene();
    });
  });

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const scenario = SCENARIOS[btn.dataset.scenario];
      if (!scenario) return;
      simState.material = scenario.material;
      simState.depthM = scenario.depthM;
      simState.gradientCPerKm = scenario.gradientCPerKm;
      simState.durationMyr = scenario.durationMyr;
      simState.activePreset = scenario.id;
      simState.playing = false;
      updateLabUI();
      drawBasinScene();
    });
  });

  btnPlayBurial?.addEventListener('click', () => {
    if (!simState.playing && simState.depthM >= 5700) {
      simState.depthM = 200;
    }
    simState.playing = !simState.playing;
    simState.activePreset = null;
    updateLabUI();
  });

  btnResetBurial?.addEventListener('click', () => {
    simState.material = 'coal';
    simState.depthM = 1200;
    simState.gradientCPerKm = 30;
    simState.durationMyr = 60;
    simState.activePreset = null;
    simState.playing = false;
    updateLabUI();
    drawBasinScene();
  });

  // Lab 2
  initCoalInspector();

  // Lab 3
  if (trapCanvas) {
    trapCtrl = createCanvasController(trapCanvas, drawTrapScene);

    trapCanvas.addEventListener('pointerdown', (e) => {
      const rect = trapCanvas.getBoundingClientRect();
      trapState.wellX = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0.08, 0.92);
      trapState.targetY = clamp((e.clientY - rect.top) / Math.max(1, rect.height), 0.16, 0.9);
      updateTrapControlsUI();
      runWellDrill();
      drawTrapScene();
    });
  }

  trapTabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      trapState.trapId = btn.dataset.trap;
      const profile = getTrapProfile(trapState.trapId);
      trapState.wellX = profile.suggestedOilWell.x;
      trapState.targetY = profile.suggestedOilWell.y;
      updateTrapControlsUI();
      runWellDrill();
      drawTrapScene();
    });
  });

  trapSealBtn?.addEventListener('click', () => {
    trapState.caprockIntact = !trapState.caprockIntact;
    updateTrapControlsUI();
    runWellDrill();
    drawTrapScene();
  });

  trapPorositySlider?.addEventListener('input', () => {
    trapState.porosityPct = Number(trapPorositySlider.value);
    updateTrapControlsUI();
    runWellDrill();
    drawTrapScene();
  });

  trapWellXSlider?.addEventListener('input', () => {
    trapState.wellX = Number(trapWellXSlider.value) / 100;
    updateTrapControlsUI();
    runWellDrill();
    drawTrapScene();
  });

  trapTargetYSlider?.addEventListener('input', () => {
    trapState.targetY = Number(trapTargetYSlider.value) / 4200;
    updateTrapControlsUI();
    runWellDrill();
    drawTrapScene();
  });

  btnDrillWell?.addEventListener('click', () => {
    runWellDrill();
    drawTrapScene();
  });

  // Deep-Time Math Lab
  tsFormationSlider?.addEventListener('input', updateTimescaleLab);
  tsConsumptionSlider?.addEventListener('input', updateTimescaleLab);
  updateTimescaleLab();

  // Quiz
  initQuiz();

  // Initial sync
  renderMissions();
  updateLabUI();
  updateTrapControlsUI();
  runWellDrill();
  drawBasinScene();
  drawTrapScene();

  // Animation loop via SimKit (or rAF fallback)
  let lastTs = performance.now();
  const stepFrame = (dtSec) => {
    if (!prefersReducedMotion) {
      animClock += dtSec;
    }
    if (simState.playing) {
      simState.depthM = Math.min(6000, simState.depthM + dtSec * 480);
      if (simState.depthM >= 6000) {
        simState.playing = false;
      }
      updateLabUI();
    }
    drawBasinScene();
    drawTrapScene();
  };

  if (globalThis.SimKit && typeof globalThis.SimKit.loop === 'function') {
    globalThis.SimKit.loop((dt) => {
      stepFrame(Math.min(dt || 0.016, 0.05));
    });
  } else {
    const tick = (now) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;
      stepFrame(dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

init();
