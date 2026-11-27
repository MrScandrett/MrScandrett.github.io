import {
  KEYFRAME_AGES,
  GEOLOGIC_PERIODS,
  MISSIONS,
  SPEED_PRESETS,
  QUIZ_QUESTIONS,
  getGeologicPeriod,
  getNarrativeFrame,
  getContinentLabels,
  getFossilMarkers,
  getTectonicEvents,
  classifyPaleolatitude,
  computeSeafloorMetrics,
  computeDriftDistance,
  evaluateMissions,
  gradeQuiz
} from './pangaea-model.mjs';

(function () {
  'use strict';

  const EarthEngine = window.EarthEngine;
  const d3 = window.d3;
  const SimKit = window.SimKit;
  if (!EarthEngine || !d3 || !SimKit) return;

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const geoCache = Object.create(null);
  const SPHERE = { type: 'Sphere' };
  const graticule = d3.geoGraticule().step([30, 30])();
  const equatorLine = {
    type: 'LineString',
    coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, 0])
  };
  const tropicN = {
    type: 'LineString',
    coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, 23.5])
  };
  const tropicS = {
    type: 'LineString',
    coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, -23.5])
  };

  const state = {
    time: 240,
    playing: false,
    loop: false,
    speed: 1,
    rafId: null,
    lastFrameTs: 0,
    projectionMode: 'flat', // 'flat' | 'globe'
    centerLon: 10,
    centerLat: -10,
    showLabels: true,
    showFossils: false,
    showTectonics: false,
    showModernOutline: false,
    probe: null, // { lonLat: [lon, lat], onLand: boolean, belt: string, clue: string }
    missions: {
      sawPangaeaFossils: false,
      comparedAncientWithModern: false,
      visitedGlobeSouth: false,
      probedAncientCrust: false
    }
  };

  // ── DOM References ──
  const mapCanvas = document.getElementById('driftMap');
  const mapLoadingEl = document.getElementById('mapLoading');
  const playButton = document.getElementById('playButton');
  const stepBackBtn = document.getElementById('stepBackBtn');
  const stepFwdBtn = document.getElementById('stepFwdBtn');
  const speedBtn = document.getElementById('speedBtn');
  const loopBtn = document.getElementById('loopBtn');
  const resetButton = document.getElementById('resetButton');
  const slider = document.getElementById('timeSlider');
  const keyframeButtons = Array.from(document.querySelectorAll('.pd-keyframe-button'));
  const periodButtons = Array.from(document.querySelectorAll('.pd-period-seg'));

  const projButtons = Array.from(document.querySelectorAll('[data-proj]'));
  const camGroup = document.getElementById('camGroup');
  const camButtons = Array.from(document.querySelectorAll('[data-cam]'));
  const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
  const toggleFossilsBtn = document.getElementById('toggleFossilsBtn');
  const toggleTectonicsBtn = document.getElementById('toggleTectonicsBtn');
  const toggleOutlineBtn = document.getElementById('toggleOutlineBtn');

  const timeBadge = document.getElementById('timeBadge');
  const periodBadge = document.getElementById('periodBadge');
  const outlineBadge = document.getElementById('outlineBadge');
  const fossilLegend = document.getElementById('fossilLegend');
  const probeCard = document.getElementById('probeCard');
  const probeClose = document.getElementById('probeClose');
  const probeCoordsEl = document.getElementById('probeCoords');
  const probeSurfaceEl = document.getElementById('probeSurface');
  const probeBeltEl = document.getElementById('probeBelt');
  const probeNoteEl = document.getElementById('probeNote');

  const narrativeTitle = document.getElementById('narrativeTitle');
  const stageSummary = document.getElementById('stageSummary');
  const periodCalloutTitle = document.getElementById('periodCalloutTitle');
  const periodCalloutDesc = document.getElementById('periodCalloutDesc');
  const timeLabel = document.getElementById('timeLabel');

  const readoutTime = document.getElementById('readoutTime');
  const readoutStage = document.getElementById('readoutStage');
  const readoutOcean = document.getElementById('readoutOcean');
  const readoutMotion = document.getElementById('readoutMotion');
  const atlanticWidthVal = document.getElementById('atlanticWidthVal');
  const atlanticWidthFill = document.getElementById('atlanticWidthFill');
  const indiaLatVal = document.getElementById('indiaLatVal');
  const indiaLatFill = document.getElementById('indiaLatFill');
  const guideTitle = document.getElementById('guideTitle');
  const guideList = document.getElementById('guideList');
  const guideNote = document.getElementById('guideNote');
  const missionBadge = document.getElementById('missionBadge');
  const missionListEl = document.getElementById('missionList');

  let activeMapRequest = 0;
  let lastRenderedAge = null;
  let mapSize = { width: 1000, height: 600 };
  let ctx = null;
  const mapStage = SimKit.canvas2d(mapCanvas, {
    onResize: (c, w, h) => {
      ctx = c;
      mapSize = { width: w, height: h };
      if (lastRenderedAge !== null && geoCache[lastRenderedAge]) {
        drawMapFrame(lastRenderedAge);
      }
    }
  });
  ctx = mapStage.ctx;

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function formatCoords(lon, lat) {
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(1)}°${ns}, ${Math.abs(lon).toFixed(1)}°${ew}`;
  }

  function getActiveProjection() {
    const w = mapSize.width || 1000;
    const h = mapSize.height || 600;
    if (state.projectionMode === 'globe') {
      return EarthEngine.projection('globe', {
        rotate: [-state.centerLon, -state.centerLat],
        extent: [[24, 18], [w - 24, h - 18]]
      });
    }
    return EarthEngine.projection('natural-earth', {
      extent: [[14, 16], [w - 14, h - 16]]
    });
  }

  async function fetchLocalKeyframe(time) {
    const age = EarthEngine.reconstruction.nearestAge(time);
    if (geoCache[age]) return geoCache[age];
    const geo = await EarthEngine.reconstruction.load(age);
    geoCache[age] = geo;
    return geo;
  }

  // ── Drawing ──
  function drawLandShadowed(pathGen, geojson) {
    ctx.save();
    ctx.beginPath();
    pathGen(geojson);
    const h = mapSize.height || 600;
    const landFill = ctx.createLinearGradient(0, h * 0.12, 0, h * 0.92);
    landFill.addColorStop(0, '#96b980');
    landFill.addColorStop(0.55, '#719663');
    landFill.addColorStop(1, '#4f6e52');
    ctx.fillStyle = landFill;
    ctx.shadowColor = 'rgba(4, 12, 20, 0.32)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    // Nonzero fill creates clean continental unions without drawing internal plate partition edges.
    ctx.fill();
    ctx.restore();
  }

  function drawPillText(text, x, y, color = '#f2f8ff') {
    ctx.save();
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = 'rgba(4, 16, 28, 0.9)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawFossilOverlay(proj, age) {
    const suites = getFossilMarkers(age);
    const pathGen = d3.geoPath(proj).context(ctx);
    ctx.save();

    for (const suite of suites) {
      const visiblePoints = [];
      for (const pt of suite.points) {
        if (state.projectionMode === 'globe' && !EarthEngine.visible(proj, pt.coords)) continue;
        const xy = proj(pt.coords);
        if (xy) visiblePoints.push({ ...pt, xy });
      }
      if (visiblePoints.length >= 2) {
        ctx.beginPath();
        for (let i = 0; i < visiblePoints.length - 1; i++) {
          pathGen({
            type: 'LineString',
            coordinates: [visiblePoints[i].coords, visiblePoints[i + 1].coords]
          });
        }
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = suite.color;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      for (const vp of visiblePoints) {
        ctx.beginPath();
        ctx.arc(vp.xy[0], vp.xy[1], 5.2, 0, Math.PI * 2);
        ctx.fillStyle = suite.color;
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = '#041423';
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawTectonicOverlay(proj, age) {
    const events = getTectonicEvents(age);
    ctx.save();
    for (const ev of events) {
      if (state.projectionMode === 'globe' && !EarthEngine.visible(proj, ev.coords)) continue;
      const xy = proj(ev.coords);
      if (!xy) continue;

      const icon = ev.kind === 'divergent' ? '⟷' : ev.kind === 'convergent' ? '▲' : '≈';
      const color = ev.kind === 'divergent' ? '#fde047' : ev.kind === 'convergent' ? '#fb7185' : '#7dd3fc';
      ctx.beginPath();
      ctx.arc(xy[0], xy[1], 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(4, 17, 29, 0.84)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.font = '800 10px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(icon, xy[0], xy[1] + 0.5);
      drawPillText(ev.label, xy[0], xy[1] + 17, color);
    }
    ctx.restore();
  }

  function drawMapFrame(age) {
    const w = mapSize.width || 1000;
    const h = mapSize.height || 600;
    const proj = getActiveProjection();
    const pathGen = d3.geoPath(proj).context(ctx);

    ctx.clearRect(0, 0, w, h);

    // Ocean sphere
    ctx.beginPath();
    pathGen(SPHERE);
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.44, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.52);
    bg.addColorStop(0, '#0f3652');
    bg.addColorStop(1, '#061a2b');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(110, 172, 224, 0.34)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Graticule + Equator & Tropics
    ctx.beginPath();
    pathGen(graticule);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    pathGen(equatorLine);
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.24)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    pathGen(tropicN);
    pathGen(tropicS);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.16)';
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();

    // Active MULLER2019 snapshot
    if (geoCache[age]) {
      drawLandShadowed(pathGen, geoCache[age]);
    }

    // Optional 0 Ma modern reference outline (explicitly labeled)
    if (state.showModernOutline && geoCache[0] && age !== 0) {
      ctx.save();
      ctx.beginPath();
      pathGen(geoCache[0]);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.55)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.restore();
    }

    if (state.showFossils) {
      drawFossilOverlay(proj, age);
    }

    if (state.showTectonics) {
      drawTectonicOverlay(proj, age);
    }

    if (state.showLabels) {
      for (const lbl of getContinentLabels(age)) {
        if (state.projectionMode === 'globe' && !EarthEngine.visible(proj, lbl.coords)) continue;
        const xy = proj(lbl.coords);
        if (xy) drawPillText(lbl.name, xy[0], xy[1], '#f3f9ff');
      }
    }

    // Active surface probe pin
    if (state.probe) {
      const vis = state.projectionMode !== 'globe' || EarthEngine.visible(proj, state.probe.lonLat);
      if (vis) {
        const xy = proj(state.probe.lonLat);
        if (xy) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(xy[0], xy[1], 8, 0, Math.PI * 2);
          ctx.strokeStyle = '#7dd3fc';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(xy[0], xy[1], 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  function renderMap(time, forceRedraw = false) {
    const age = EarthEngine.reconstruction.nearestAge(time);
    if (!forceRedraw && lastRenderedAge === age && geoCache[age]) return;
    const reqId = ++activeMapRequest;

    if (geoCache[age]) {
      drawMapFrame(age);
      lastRenderedAge = age;
      mapLoadingEl.style.display = 'none';
      return;
    }

    mapLoadingEl.style.display = 'flex';
    fetchLocalKeyframe(age)
      .then(() => {
        if (reqId !== activeMapRequest) return;
        if (EarthEngine.reconstruction.nearestAge(state.time) !== age) return;
        drawMapFrame(age);
        lastRenderedAge = age;
        mapLoadingEl.style.display = 'none';
      })
      .catch((err) => {
        if (reqId !== activeMapRequest) return;
        mapLoadingEl.replaceChildren();
        const span = document.createElement('span');
        span.className = 'pd-load-error';
        span.textContent = 'This reconstruction frame could not load. Try another age or reload.';
        mapLoadingEl.appendChild(span);
        console.error(err);
      });
  }

  // ── Narrative & Mission UI ──
  function renderMissions() {
    const { completed, count, total } = evaluateMissions(state.missions);
    missionBadge.textContent = `${count}/${total}`;
    missionListEl.replaceChildren(
      ...MISSIONS.map((m) => {
        const li = document.createElement('li');
        li.className = 'pd-mission-item' + (completed[m.id] ? ' is-done' : '');
        const title = document.createElement('span');
        title.className = 'pd-mission-title';
        title.textContent = (completed[m.id] ? '✓ ' : '○ ') + m.title;
        const detail = document.createElement('span');
        detail.className = 'pd-mission-detail';
        detail.textContent = m.detail;
        li.append(title, detail);
        return li;
      })
    );
  }

  function checkMissions() {
    const age = EarthEngine.reconstruction.nearestAge(state.time);
    let dirty = false;
    if (age >= 200 && state.showFossils && !state.missions.sawPangaeaFossils) {
      state.missions.sawPangaeaFossils = true;
      dirty = true;
    }
    if (age >= 100 && state.showModernOutline && !state.missions.comparedAncientWithModern) {
      state.missions.comparedAncientWithModern = true;
      dirty = true;
    }
    if (state.projectionMode === 'globe' && state.centerLat <= -25 && !state.missions.visitedGlobeSouth) {
      state.missions.visitedGlobeSouth = true;
      dirty = true;
    }
    if (dirty) renderMissions();
  }

  function updateProbeCard() {
    if (!state.probe) {
      probeCard.hidden = true;
      return;
    }
    const { lonLat, onLand, belt, clue } = state.probe;
    probeCoordsEl.textContent = formatCoords(lonLat[0], lonLat[1]);
    probeSurfaceEl.textContent = onLand ? 'Continental Crust (Reconstructed Outline)' : 'Deep Ocean Basin';
    probeBeltEl.textContent = `${belt} · ${EarthEngine.reconstruction.nearestAge(state.time)} Ma`;
    probeNoteEl.textContent = clue;
    probeCard.hidden = false;
  }

  let lastNarrativeAge = null;
  let lastFrameTime = null;

  function renderNarrative(time) {
    const age = EarthEngine.reconstruction.nearestAge(time);
    const frame = getNarrativeFrame(age);
    const period = getGeologicPeriod(age);
    const timeText = age === 0 ? 'Today (0 Ma)' : `${age} million years ago`;

    if (lastNarrativeAge !== age) {
      timeBadge.textContent = age === 0 ? 'Today' : `${age} Ma`;
      periodBadge.textContent = period.name;
      periodBadge.style.setProperty('--pd-period-color', period.color);
      periodCalloutTitle.textContent = `${period.name} · ${period.era}`;
      periodCalloutDesc.textContent = period.summary;
      timeLabel.textContent = age === 0 ? 'Today' : `${age} Ma`;
      readoutTime.textContent = timeText;
      slider.setAttribute('aria-valuetext', timeText);
      slider.setAttribute('aria-valuenow', String(240 - age));
      lastNarrativeAge = age;
    }

    if (lastFrameTime !== frame.time) {
      narrativeTitle.textContent = frame.title;
      stageSummary.textContent = frame.summary;
      readoutStage.textContent = frame.title;
      readoutOcean.textContent = frame.ocean;
      readoutMotion.textContent = frame.motion;
      guideTitle.textContent = frame.title;
      guideNote.textContent = `${frame.note} Displayed snapshot: ${age} Ma.`;

      atlanticWidthVal.textContent = `~${frame.atlanticKmApprox.toLocaleString()} km`;
      atlanticWidthFill.style.width = `${Math.round((frame.atlanticKmApprox / 5600) * 100)}%`;

      const latStr = frame.indiaLatApprox >= 0 ? `${frame.indiaLatApprox}°N` : `${Math.abs(frame.indiaLatApprox)}°S`;
      indiaLatVal.textContent = latStr;
      indiaLatFill.style.width = `${Math.round(((frame.indiaLatApprox + 55) / 80) * 100)}%`;

      guideList.replaceChildren(
        ...frame.guide.map((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          return li;
        })
      );

      keyframeButtons.forEach((btn) => {
        const isActive = Number(btn.dataset.time) === frame.time;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      lastFrameTime = frame.time;
    }

    if (state.showModernOutline && age !== 0) {
      outlineBadge.textContent = `Overlay: 0 Ma modern outline · Frame: ${age} Ma`;
      outlineBadge.hidden = false;
    } else {
      outlineBadge.hidden = true;
    }
    fossilLegend.hidden = !state.showFossils;
  }

  function render(time, forceRedraw = false) {
    renderMap(time, forceRedraw);
    renderNarrative(time);
    slider.value = String(Math.round(240 - time));
    checkMissions();
  }

  // ── Playback ──
  function stopPlayback() {
    state.playing = false;
    state.lastFrameTs = 0;
    playButton.textContent = 'Play timelapse';
    playButton.setAttribute('aria-label', 'Play timelapse simulation');
    playButton.setAttribute('aria-pressed', 'false');
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }

  function tickPlayback(ts) {
    if (!state.playing) return;
    if (!state.lastFrameTs) state.lastFrameTs = ts;
    const dt = Math.min((ts - state.lastFrameTs) / 1000, 0.1);
    state.lastFrameTs = ts;
    state.time = clamp(state.time - dt * 22 * state.speed, 0, 240);
    render(state.time);

    const prefetchAge = EarthEngine.reconstruction.nearestAge(Math.max(0, state.time - 10));
    if (!geoCache[prefetchAge]) fetchLocalKeyframe(prefetchAge).catch(() => {});

    if (state.time <= 0) {
      if (state.loop) {
        state.time = 240;
        render(state.time);
      } else {
        stopPlayback();
        return;
      }
    }
    state.rafId = requestAnimationFrame(tickPlayback);
  }

  function startPlayback() {
    if (state.time <= 0) {
      state.time = 240;
      render(state.time);
    }
    state.playing = true;
    state.lastFrameTs = 0;
    playButton.textContent = 'Pause timelapse';
    playButton.setAttribute('aria-label', 'Pause timelapse simulation');
    playButton.setAttribute('aria-pressed', 'true');
    state.rafId = requestAnimationFrame(tickPlayback);
  }

  // ── Camera Animation & Pointer Controls ──
  let camAnimId = null;
  function animateCameraTo(lon, lat) {
    if (camAnimId) cancelAnimationFrame(camAnimId);
    if (prefersReducedMotion) {
      state.centerLon = lon;
      state.centerLat = lat;
      checkMissions();
      drawMapFrame(EarthEngine.reconstruction.nearestAge(state.time));
      return;
    }
    const startLon = state.centerLon;
    const startLat = state.centerLat;
    const startTs = performance.now();
    const duration = 450;

    function step(now) {
      const u = Math.min(1, (now - startTs) / duration);
      const ease = 1 - Math.pow(1 - u, 3);
      state.centerLon = startLon + (lon - startLon) * ease;
      state.centerLat = startLat + (lat - startLat) * ease;
      drawMapFrame(EarthEngine.reconstruction.nearestAge(state.time));
      if (u < 1) {
        camAnimId = requestAnimationFrame(step);
      } else {
        camAnimId = null;
        checkMissions();
      }
    }
    camAnimId = requestAnimationFrame(step);
  }

  let dragInfo = null;
  mapCanvas.addEventListener('pointerdown', (e) => {
    dragInfo = {
      x: e.clientX,
      y: e.clientY,
      moved: false,
      startLon: state.centerLon,
      startLat: state.centerLat
    };
    if (state.projectionMode === 'globe') {
      mapCanvas.setPointerCapture?.(e.pointerId);
    }
  });

  mapCanvas.addEventListener('pointermove', (e) => {
    if (!dragInfo) return;
    const dx = e.clientX - dragInfo.x;
    const dy = e.clientY - dragInfo.y;
    if (Math.hypot(dx, dy) > 5) dragInfo.moved = true;
    if (state.projectionMode === 'globe' && dragInfo.moved) {
      state.centerLon = dragInfo.startLon - dx * 0.35;
      state.centerLat = clamp(dragInfo.startLat + dy * 0.35, -85, 85);
      drawMapFrame(EarthEngine.reconstruction.nearestAge(state.time));
      checkMissions();
    }
  });

  mapCanvas.addEventListener('pointerup', (e) => {
    if (!dragInfo) return;
    const wasClick = !dragInfo.moved;
    dragInfo = null;
    if (!wasClick) return;

    const rect = mapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const proj = getActiveProjection();
    const lonLat = proj.invert ? proj.invert([x, y]) : null;
    if (!lonLat || !Number.isFinite(lonLat[0]) || !Number.isFinite(lonLat[1])) return;
    if (state.projectionMode === 'globe' && !EarthEngine.visible(proj, lonLat)) return;

    const age = EarthEngine.reconstruction.nearestAge(state.time);
    const geo = geoCache[age];
    const onLand = geo ? d3.geoContains(geo, lonLat) : false;
    const { belt, clue } = classifyPaleolatitude(lonLat[1]);
    state.probe = { lonLat, onLand, belt, clue };
    if (onLand && age >= 100 && !state.missions.probedAncientCrust) {
      state.missions.probedAncientCrust = true;
      renderMissions();
    }
    updateProbeCard();
    drawMapFrame(age);
  });

  probeClose.addEventListener('click', () => {
    state.probe = null;
    updateProbeCard();
    drawMapFrame(EarthEngine.reconstruction.nearestAge(state.time));
  });

  // ── Toolbar & Overlay Event Wiring ──
  playButton.addEventListener('click', () => (state.playing ? stopPlayback() : startPlayback()));
  resetButton.addEventListener('click', () => {
    stopPlayback();
    state.time = 240;
    render(state.time, true);
  });

  stepBackBtn.addEventListener('click', () => {
    stopPlayback();
    const age = EarthEngine.reconstruction.nearestAge(state.time);
    state.time = clamp(age + 10, 0, 240);
    render(state.time);
  });

  stepFwdBtn.addEventListener('click', () => {
    stopPlayback();
    const age = EarthEngine.reconstruction.nearestAge(state.time);
    state.time = clamp(age - 10, 0, 240);
    render(state.time);
  });

  const SPEEDS = [0.5, 1, 2];
  speedBtn.addEventListener('click', () => {
    const nextIdx = (SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length;
    state.speed = SPEEDS[nextIdx];
    speedBtn.textContent = `${state.speed}× Speed`;
  });

  loopBtn.addEventListener('click', () => {
    state.loop = !state.loop;
    loopBtn.setAttribute('aria-pressed', state.loop ? 'true' : 'false');
    loopBtn.textContent = state.loop ? 'Loop: On' : 'Loop: Off';
  });

  slider.addEventListener('input', () => {
    stopPlayback();
    state.time = EarthEngine.reconstruction.nearestAge(240 - Number(slider.value));
    render(state.time);
  });

  keyframeButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      stopPlayback();
      state.time = Number(btn.dataset.time);
      render(state.time);
    })
  );

  periodButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      stopPlayback();
      state.time = Number(btn.dataset.age);
      render(state.time);
    })
  );

  function setProjectionMode(mode) {
    state.projectionMode = mode;
    mapCanvas.classList.toggle('is-globe', mode === 'globe');
    camGroup.hidden = mode !== 'globe';
    projButtons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.proj === mode ? 'true' : 'false'));
    checkMissions();
    render(state.time, true);
  }

  projButtons.forEach((btn) => btn.addEventListener('click', () => setProjectionMode(btn.dataset.proj)));

  const CAM_PRESETS = {
    atlantic: [-25, 10],
    gondwana: [20, -52],
    tethys: [62, -12],
    global: [10, 15]
  };
  camButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const target = CAM_PRESETS[btn.dataset.cam] || [10, 0];
      camButtons.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      if (state.projectionMode !== 'globe') setProjectionMode('globe');
      animateCameraTo(target[0], target[1]);
    })
  );

  function bindOverlayToggle(btn, key, onEnable) {
    btn.addEventListener('click', () => {
      state[key] = !state[key];
      btn.setAttribute('aria-pressed', state[key] ? 'true' : 'false');
      if (state[key] && onEnable) onEnable();
      checkMissions();
      renderNarrative(state.time);
      drawMapFrame(EarthEngine.reconstruction.nearestAge(state.time));
    });
  }

  bindOverlayToggle(toggleLabelsBtn, 'showLabels');
  bindOverlayToggle(toggleFossilsBtn, 'showFossils');
  bindOverlayToggle(toggleTectonicsBtn, 'showTectonics');
  bindOverlayToggle(toggleOutlineBtn, 'showModernOutline', () => {
    if (!geoCache[0]) {
      fetchLocalKeyframe(0)
        .then(() => drawMapFrame(EarthEngine.reconstruction.nearestAge(state.time)))
        .catch(() => {});
    }
  });

  // Jump buttons inside Evidence Cards
  document.querySelectorAll('[data-jump-age]').forEach((btn) => {
    btn.addEventListener('click', () => {
      stopPlayback();
      const targetAge = Number(btn.dataset.jumpAge);
      const overlay = btn.dataset.jumpOverlay;
      if (overlay === 'fossils' && !state.showFossils) {
        state.showFossils = true;
        toggleFossilsBtn.setAttribute('aria-pressed', 'true');
      } else if (overlay === 'outline' && !state.showModernOutline) {
        state.showModernOutline = true;
        toggleOutlineBtn.setAttribute('aria-pressed', 'true');
        fetchLocalKeyframe(0).catch(() => {});
      }
      state.time = targetAge;
      render(state.time, true);
      document.getElementById('pd-timelapse')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && document.activeElement !== slider) {
      return;
    }
    if (document.activeElement?.id === 'seafloorCanvas') return;
    if (e.code === 'Space') {
      e.preventDefault();
      state.playing ? stopPlayback() : startPlayback();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      stopPlayback();
      state.time = clamp(EarthEngine.reconstruction.nearestAge(state.time) + 10, 0, 240);
      render(state.time);
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      stopPlayback();
      state.time = clamp(EarthEngine.reconstruction.nearestAge(state.time) - 10, 0, 240);
      render(state.time);
    } else if (e.code === 'Home') {
      e.preventDefault();
      stopPlayback();
      state.time = 240;
      render(state.time);
    } else if (e.code === 'End') {
      e.preventDefault();
      stopPlayback();
      state.time = 0;
      render(state.time);
    } else if (e.key === 'r' || e.key === 'R') {
      stopPlayback();
      state.time = 240;
      render(state.time);
    } else if (e.key === 'g' || e.key === 'G') {
      setProjectionMode(state.projectionMode === 'flat' ? 'globe' : 'flat');
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.playing) stopPlayback();
  });

  // ── Seafloor Spreading & Paleomagnetic Tape Lab ──
  const sfCanvas = document.getElementById('seafloorCanvas');
  const sfRateSlider = document.getElementById('sfRateSlider');
  const sfRateOut = document.getElementById('sfRateOut');
  const sfFlipBtn = document.getElementById('sfFlipBtn');
  const sfAutoBtn = document.getElementById('sfAutoBtn');
  const sfPauseBtn = document.getElementById('sfPauseBtn');
  const sfDistanceEl = document.getElementById('sfDistance');
  const sfAgeEl = document.getElementById('sfAge');
  const sfFullRateEl = document.getElementById('sfFullRate');
  const sfPolarityEl = document.getElementById('sfPolarity');

  if (sfCanvas) {
    const sfState = {
      halfRate: 3.0, // cm/yr
      simAgeMa: 24,
      currentPolarity: 1, // 1 = Normal, -1 = Reversed
      autoFlip: true,
      paused: false,
      lastFlipAgeMa: 24,
      probeDistKm: 280,
      probeSide: 1, // 1 right, -1 left
      bands: [
        { startAge: 0, endAge: 4, polarity: 1 },
        { startAge: 4, endAge: 8.5, polarity: -1 },
        { startAge: 8.5, endAge: 13, polarity: 1 },
        { startAge: 13, endAge: 18, polarity: -1 },
        { startAge: 18, endAge: 24, polarity: 1 }
      ]
    };

    const MAX_BASIN_HALF_KM = 1200;
    let sfSize = { width: 800, height: 270 };
    let sctx = null;
    const sfStage = SimKit.canvas2d(sfCanvas, {
      onResize: (c, w, h) => {
        sctx = c;
        sfSize = { width: w, height: h };
        drawSeafloor();
      }
    });
    sctx = sfStage.ctx;

    function polarityAtDistanceKm(distKm) {
      const m = computeSeafloorMetrics(distKm, sfState.halfRate);
      for (const b of sfState.bands) {
        if (m.crustAgeMa >= b.startAge && m.crustAgeMa <= b.endAge) return b.polarity;
      }
      return sfState.currentPolarity;
    }

    function updateSeafloorReadouts() {
      const m = computeSeafloorMetrics(sfState.probeDistKm, sfState.halfRate);
      const pol = polarityAtDistanceKm(sfState.probeDistKm);
      sfDistanceEl.textContent = `${sfState.probeSide < 0 ? '−' : '+'}${m.distanceKm.toFixed(0)} km`;
      sfAgeEl.textContent = `${m.crustAgeMa.toFixed(1)} Ma`;
      sfFullRateEl.textContent = `${m.fullRateCmPerYr.toFixed(1)} cm/yr`;
      sfPolarityEl.textContent = pol === 1 ? 'Normal (+)' : 'Reversed (−)';
      sfPolarityEl.style.color = pol === 1 ? '#7dd3fc' : '#fbbf24';
    }

    function drawSeafloor() {
      const w = sfSize.width || 800;
      const h = sfSize.height || 270;
      const cx = w / 2;
      const waterTop = 18;
      const crustTop = 82;
      const crustH = 68;
      const kmToPx = (w * 0.46) / MAX_BASIN_HALF_KM;

      sctx.clearRect(0, 0, w, h);

      // Ocean column
      const seaGrad = sctx.createLinearGradient(0, waterTop, 0, crustTop);
      seaGrad.addColorStop(0, '#0a2d49');
      seaGrad.addColorStop(1, '#04182a');
      sctx.fillStyle = seaGrad;
      sctx.fillRect(0, 0, w, crustTop);

      // Mantle beneath crust
      const mantleGrad = sctx.createLinearGradient(0, crustTop + crustH, 0, h);
      mantleGrad.addColorStop(0, '#431407');
      mantleGrad.addColorStop(1, '#1c0a04');
      sctx.fillStyle = mantleGrad;
      sctx.fillRect(0, crustTop + crustH, w, h - (crustTop + crustH));

      // Upwelling magma plume at ridge axis
      const plumeGrad = sctx.createRadialGradient(cx, crustTop + crustH + 40, 8, cx, crustTop + crustH + 20, 90);
      plumeGrad.addColorStop(0, 'rgba(251, 146, 60, 0.95)');
      plumeGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.55)');
      plumeGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      sctx.fillStyle = plumeGrad;
      sctx.fillRect(cx - 100, crustTop - 4, 200, h - crustTop);

      // Symmetrical basalt magnetic stripes on both flanks
      const kmPerMa = sfState.halfRate * 10;
      for (const b of sfState.bands) {
        const innerKm = b.startAge * kmPerMa;
        const outerKm = Math.min(MAX_BASIN_HALF_KM, b.endAge * kmPerMa);
        if (innerKm >= MAX_BASIN_HALF_KM || outerKm <= innerKm) continue;
        const x1 = innerKm * kmToPx;
        const bw = (outerKm - innerKm) * kmToPx;
        sctx.fillStyle = b.polarity === 1 ? '#38bdf8' : '#f59e0b';
        sctx.fillRect(cx + x1, crustTop, bw, crustH);
        sctx.fillRect(cx - x1 - bw, crustTop, bw, crustH);

        // Subtle polarity arrows inside wide stripes
        if (bw > 20) {
          sctx.fillStyle = '#041421';
          sctx.font = '800 12px system-ui, sans-serif';
          sctx.textAlign = 'center';
          sctx.textBaseline = 'middle';
          const arrow = b.polarity === 1 ? '↑' : '↓';
          sctx.fillText(arrow, cx + x1 + bw / 2, crustTop + crustH / 2);
          sctx.fillText(arrow, cx - x1 - bw / 2, crustTop + crustH / 2);
        }
      }

      // Ridge rift notch & spreading arrows
      sctx.fillStyle = '#fb923c';
      sctx.beginPath();
      sctx.moveTo(cx - 10, crustTop + crustH);
      sctx.lineTo(cx, crustTop + 8);
      sctx.lineTo(cx + 10, crustTop + crustH);
      sctx.closePath();
      sctx.fill();

      sctx.fillStyle = '#f8fafc';
      sctx.font = '700 11px system-ui, sans-serif';
      sctx.textAlign = 'center';
      sctx.fillText('Mid-Ocean Ridge Axis (0 Ma)', cx, 36);
      sctx.fillText('← Plate moves west          Plate moves east →', cx, 58);

      // Probe & mirror twin highlight
      const px = cx + sfState.probeSide * sfState.probeDistKm * kmToPx;
      const mx = cx - sfState.probeSide * sfState.probeDistKm * kmToPx;

      sctx.save();
      sctx.strokeStyle = '#ffffff';
      sctx.lineWidth = 2;
      sctx.beginPath();
      sctx.moveTo(px, crustTop - 10);
      sctx.lineTo(px, crustTop + crustH + 10);
      sctx.stroke();

      sctx.setLineDash([4, 3]);
      sctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      sctx.beginPath();
      sctx.moveTo(mx, crustTop - 6);
      sctx.lineTo(mx, crustTop + crustH + 6);
      sctx.stroke();
      sctx.restore();

      sctx.fillStyle = '#e6f4ff';
      sctx.font = '700 11px system-ui, sans-serif';
      sctx.fillText('Core Probe', px, crustTop - 16);
      sctx.fillText('Mirror Twin', mx, crustTop + crustH + 22);

      // Legend bottom
      sctx.textAlign = 'left';
      sctx.fillStyle = '#7dd3fc';
      sctx.fillText('■ Normal Polarity (↑)', 14, h - 14);
      sctx.fillStyle = '#fbbf24';
      sctx.fillText('■ Reversed Polarity (↓)', 165, h - 14);
      sctx.textAlign = 'right';
      sctx.fillStyle = '#cfe4f5';
      sctx.fillText('Mantle upwelling & symmetric seafloor growth', w - 14, h - 14);
    }

    function flipPolarity() {
      sfState.currentPolarity *= -1;
      sfState.lastFlipAgeMa = sfState.simAgeMa;
      sfState.bands.unshift({ startAge: 0, endAge: 0.05, polarity: sfState.currentPolarity });
    }

    SimKit.loop(
      (dt) => {
        if (!sfState.paused) {
          const dAgeMa = dt * 1.4;
          sfState.simAgeMa += dAgeMa;
          for (const b of sfState.bands) {
            b.startAge += dAgeMa;
            b.endAge += dAgeMa;
          }
          if (sfState.bands.length) {
            sfState.bands[0].startAge = 0;
          }
          // Prune bands beyond basin width
          const maxAge = MAX_BASIN_HALF_KM / (sfState.halfRate * 10) + 15;
          while (sfState.bands.length > 2 && sfState.bands[sfState.bands.length - 1].startAge > maxAge) {
            sfState.bands.pop();
          }
          if (sfState.autoFlip && sfState.simAgeMa - sfState.lastFlipAgeMa >= 4.2) {
            flipPolarity();
          }
        }
        drawSeafloor();
        updateSeafloorReadouts();
      },
      { el: sfCanvas, maxDt: 0.05 }
    );

    sfRateSlider.addEventListener('input', () => {
      sfState.halfRate = Number(sfRateSlider.value);
      sfRateOut.textContent = `${sfState.halfRate.toFixed(1)} cm/yr`;
      drawSeafloor();
      updateSeafloorReadouts();
    });

    sfFlipBtn.addEventListener('click', () => {
      flipPolarity();
      drawSeafloor();
      updateSeafloorReadouts();
    });

    sfAutoBtn.addEventListener('click', () => {
      sfState.autoFlip = !sfState.autoFlip;
      sfAutoBtn.setAttribute('aria-pressed', sfState.autoFlip ? 'true' : 'false');
      sfAutoBtn.textContent = sfState.autoFlip ? 'Auto-Reversals: On' : 'Auto-Reversals: Off';
    });

    sfPauseBtn.addEventListener('click', () => {
      sfState.paused = !sfState.paused;
      sfPauseBtn.setAttribute('aria-pressed', sfState.paused ? 'true' : 'false');
      sfPauseBtn.textContent = sfState.paused ? 'Resume Spreading' : 'Pause Spreading';
    });

    function setProbeFromClientX(clientX) {
      const rect = sfCanvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const cx = rect.width / 2;
      const kmToPx = (rect.width * 0.46) / MAX_BASIN_HALF_KM;
      const dx = x - cx;
      sfState.probeSide = dx < 0 ? -1 : 1;
      sfState.probeDistKm = clamp(Math.abs(dx) / kmToPx, 0, MAX_BASIN_HALF_KM);
      drawSeafloor();
      updateSeafloorReadouts();
    }

    let sfDragging = false;
    sfCanvas.addEventListener('pointerdown', (e) => {
      sfDragging = true;
      setProbeFromClientX(e.clientX);
    });
    window.addEventListener('pointermove', (e) => {
      if (sfDragging) setProbeFromClientX(e.clientX);
    });
    window.addEventListener('pointerup', () => {
      sfDragging = false;
    });
    sfCanvas.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        const delta = e.code === 'ArrowRight' ? 40 : -40;
        const signed = clamp(sfState.probeSide * sfState.probeDistKm + delta, -MAX_BASIN_HALF_KM, MAX_BASIN_HALF_KM);
        sfState.probeSide = signed < 0 ? -1 : 1;
        sfState.probeDistKm = Math.abs(signed);
        drawSeafloor();
        updateSeafloorReadouts();
      }
    });

    updateSeafloorReadouts();
  }

  // ── Drift Speed & Deep-Time Calculator ──
  const TIME_STEPS = [
    { years: 1, label: '1 year' },
    { years: 10, label: '10 years' },
    { years: 100, label: '100 years (1 century)' },
    { years: 1000, label: '1,000 years' },
    { years: 100000, label: '100,000 years' },
    { years: 1000000, label: '1 million years (1 Ma)' },
    { years: 10000000, label: '10 million years (10 Ma)' },
    { years: 50000000, label: '50 million years (50 Ma)' },
    { years: 100000000, label: '100 million years (100 Ma)' },
    { years: 200000000, label: '200 million years (200 Ma)' }
  ];

  const spRateSlider = document.getElementById('spRateSlider');
  const spRateOut = document.getElementById('spRateOut');
  const spTimeSlider = document.getElementById('spTimeSlider');
  const spTimeOut = document.getElementById('spTimeOut');
  const spPresetsEl = document.getElementById('spPresets');
  const spDistanceKmEl = document.getElementById('spDistanceKm');
  const spDistanceMiEl = document.getElementById('spDistanceMi');
  const spBenchmarkEl = document.getElementById('spBenchmark');
  const spBarUs = document.getElementById('spBarUs');
  const spBarAtlantic = document.getElementById('spBarAtlantic');
  const spBarIndia = document.getElementById('spBarIndia');

  function updateSpeedCalculator() {
    if (!spRateSlider || !spTimeSlider) return;
    const rate = Number(spRateSlider.value);
    const step = TIME_STEPS[Number(spTimeSlider.value)] || TIME_STEPS[8];
    const res = computeDriftDistance(rate, step.years);

    spRateOut.textContent = `${rate.toFixed(1)} cm/yr`;
    spTimeOut.textContent = step.label;
    spDistanceKmEl.textContent =
      res.km >= 10
        ? `${Math.round(res.km).toLocaleString()} km`
        : res.km >= 0.1
          ? `${res.km.toFixed(2)} km`
          : `${res.meters.toFixed(2)} m`;
    spDistanceMiEl.textContent =
      res.miles >= 10
        ? `${Math.round(res.miles).toLocaleString()} mi`
        : `${res.cm.toFixed(1)} cm`;
    spBenchmarkEl.textContent = res.benchmark;

    spBarUs.style.width = `${Math.min(100, (res.km / 4500) * 100)}%`;
    spBarAtlantic.style.width = `${Math.min(100, (res.km / 5570) * 100)}%`;
    spBarIndia.style.width = `${Math.min(100, (res.km / 6500) * 100)}%`;
  }

  if (spPresetsEl) {
    spPresetsEl.replaceChildren(
      ...SPEED_PRESETS.map((preset) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pd-pill-btn';
        btn.dataset.speedPreset = preset.id;
        btn.setAttribute('aria-pressed', preset.id === 'atlantic' ? 'true' : 'false');
        btn.title = preset.note;
        btn.textContent = `${preset.label} (${preset.rateCmPerYr} cm/yr)`;
        btn.addEventListener('click', () => {
          spRateSlider.value = String(preset.rateCmPerYr);
          spPresetsEl.querySelectorAll('button').forEach((b) =>
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false')
          );
          updateSpeedCalculator();
        });
        return btn;
      })
    );
    spRateSlider.addEventListener('input', () => {
      spPresetsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      updateSpeedCalculator();
    });
    spTimeSlider.addEventListener('input', updateSpeedCalculator);
    updateSpeedCalculator();
  }

  // ── Quiz ──
  const quizBtn = document.getElementById('pd-check-quiz');
  const quizResetBtn = document.getElementById('pd-reset-quiz');
  const quizResultEl = document.getElementById('pd-quiz-result');

  if (quizBtn) {
    quizBtn.addEventListener('click', () => {
      const answers = {};
      for (const q of QUIZ_QUESTIONS) {
        const checked = document.querySelector(`input[name="${q.id}"]:checked`);
        answers[q.id] = checked ? checked.value : '';
      }
      const result = gradeQuiz(answers);
      for (const detail of result.details) {
        const noteEl = document.getElementById(`${detail.id}-note`);
        if (!noteEl) continue;
        noteEl.hidden = false;
        noteEl.className = 'pd-quiz-item-note ' + (detail.correct ? 'is-right' : 'is-wrong');
        noteEl.textContent = (detail.correct ? '✓ Correct: ' : '↺ Review: ') + detail.explanation;
      }
      quizResultEl.className = 'pd-quiz-feedback ' + (result.score === result.total ? 'correct' : 'try');
      quizResultEl.textContent =
        result.score === result.total
          ? `Terrific! ${result.score}/${result.total} correct. You connected continental fit, fossil bands, seafloor magnetic stripes, and plate tectonics.`
          : `${result.score}/${result.total} correct. Check the highlighted explanations above and try again.`;
    });
  }

  if (quizResetBtn) {
    quizResetBtn.addEventListener('click', () => {
      for (const q of QUIZ_QUESTIONS) {
        document.querySelectorAll(`input[name="${q.id}"]`).forEach((input) => {
          input.checked = false;
        });
        const noteEl = document.getElementById(`${q.id}-note`);
        if (noteEl) {
          noteEl.hidden = true;
          noteEl.textContent = '';
        }
      }
      quizResultEl.textContent = '';
      quizResultEl.className = 'pd-quiz-feedback';
    });
  }

  // ── Init ──
  async function init() {
    renderMissions();
    renderNarrative(state.time);
    mapLoadingEl.style.display = 'flex';
    try {
      await Promise.all([fetchLocalKeyframe(state.time), fetchLocalKeyframe(0)]);
      mapLoadingEl.style.display = 'none';
      render(state.time, true);

      // Warm remaining keyframe stops in background
      for (const stopAge of KEYFRAME_AGES) {
        if (!geoCache[stopAge]) fetchLocalKeyframe(stopAge).catch(() => {});
      }
      fetchLocalKeyframe(230).catch(() => {});
    } catch (err) {
      mapLoadingEl.replaceChildren();
      const errSpan = document.createElement('span');
      errSpan.className = 'pd-load-error';
      errSpan.textContent = 'Could not load local GPlates reconstruction frames. Check the geodata files and reload.';
      mapLoadingEl.appendChild(errSpan);
      console.error('Local reconstruction load error:', err);
    }
  }

  init();
})();
