(() => {
  'use strict';

  const Model = window.SphereSystemsModel;
  if (!Model) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const dec1Fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const dec2Fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

  const state = {
    // Lab 1
    radiusM: 60,
    coveragePct: 60,
    frequency: 3,
    viewMode: 'exosphere',
    unitMode: 'metric',
    yaw: 0.52,
    pitch: -0.28,
    autoSpin: !reducedMotion,
    baselineRadius: 60,
    doubledFromRadius: null,
    // Lab 2
    distanceM: 35,
    pixelPitchMm: 10,
    fovDeg: 160,
    // Lab 3
    acousticMode: 'steered',
    steerAngleDeg: 0,
    driverCount: 10,
    frequencyHz: 850,
    wavePlaying: !reducedMotion,
    wavePhase: 0.7,
    // Lab 4
    bandwidthMHz: 10,
    snrLinear: 10,
    // Mission tracking flags
    predictionCorrect: false,
    testedRadiusScaling: false,
    doubledRadius: false,
    maxFrequencyUsed: 3,
    reachedSeamlessAcuity: false,
    steeredOffAxis: false,
    usedDoubleB: false,
    usedDoubleSnr: false,
    comparedChannelScaling: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function setupHiDpi(canvas, cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  // ── Mission Strip ─────────────────────────────────────────────────────────
  function renderMissionStrip() {
    const strip = $('ss-mission-strip');
    if (!strip) return;
    if (!strip.children.length) {
      Model.MISSIONS.forEach((m) => {
        const card = document.createElement('div');
        card.className = 'ss-mission-card';
        card.dataset.missionId = m.id;
        card.innerHTML =
          '<span class="ss-mission-dot" aria-hidden="true">○</span>' +
          '<span><strong></strong><small></small></span>';
        card.querySelector('strong').textContent = m.title;
        card.querySelector('small').textContent = m.detail;
        strip.appendChild(card);
      });
    }
    const geom = Model.computeSphereGeometry(state);
    const acuity = Model.computeAcuityMetrics({
      distanceM: state.distanceM,
      pixelPitchMm: state.pixelPitchMm,
      fovDeg: state.fovDeg,
      screenAreaM2: geom.coveredAreaM2
    });
    if (acuity.arcmin <= 1.0) state.reachedSeamlessAcuity = true;
    if (state.frequency >= 4) state.maxFrequencyUsed = Math.max(state.maxFrequencyUsed, state.frequency);

    const status = Model.evaluateMissions({
      doubledRadius: state.doubledRadius,
      predictionCorrect: state.predictionCorrect,
      testedRadiusScaling: state.testedRadiusScaling,
      maxFrequencyUsed: state.maxFrequencyUsed,
      frequency: state.frequency,
      reachedSeamlessAcuity: state.reachedSeamlessAcuity,
      arcmin: acuity.arcmin,
      steeredOffAxis: state.steeredOffAxis,
      acousticMode: state.acousticMode,
      steerAngleDeg: state.steerAngleDeg,
      comparedChannelScaling: state.comparedChannelScaling,
      usedDoubleB: state.usedDoubleB,
      usedDoubleSnr: state.usedDoubleSnr
    });

    setText('ss-mission-pill', `Missions: ${status.completedCount}/${status.totalCount}`);
    const doneSet = new Set(status.completedIds);
    strip.querySelectorAll('.ss-mission-card').forEach((card) => {
      const done = doneSet.has(card.dataset.missionId);
      card.classList.toggle('is-done', done);
      card.querySelector('.ss-mission-dot').textContent = done ? '✓' : '○';
    });
  }

  // ── Lab 1: 3D Geodesic Sphere & Scaling Curve ─────────────────────────────
  function rotatePoint(p, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = p[0] * cy + p[2] * sy;
    const z1 = -p[0] * sy + p[2] * cy;
    const y2 = p[1] * cp - z1 * sp;
    const z2 = p[1] * sp + z1 * cp;
    return [x1, y2, z2];
  }

  function renderSphere3D(geom) {
    const canvas = $('ss-sphere-canvas');
    if (!canvas) return;
    const W = 620, H = 400;
    const ctx = setupHiDpi(canvas, W, H);

    // Background radial stage
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.48, 20, W * 0.5, H * 0.5, 320);
    bg.addColorStop(0, '#163552');
    bg.addColorStop(1, '#081523');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle ground grid ring scaled by radius
    const scaleRatio = 0.58 + 0.42 * ((state.radiusM - 10) / 110);
    const spherePx = 148 * scaleRatio;
    const cx = W * 0.5;
    const cy = H * 0.52;

    ctx.strokeStyle = 'rgba(130, 194, 224, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy + spherePx + 14, spherePx * 1.15, spherePx * 0.24, 0, 0, Math.PI * 2);
    ctx.stroke();

    const mesh = Model.buildGeodesicMesh(state.frequency);
    const rotated = mesh.vertices.map((v) => rotatePoint(v, state.yaw, state.pitch));
    const camDist = 3.6;

    const projected = rotated.map((v) => {
      const zCam = camDist - v[2];
      const f = (spherePx * camDist) / zCam;
      return [cx + v[0] * f, cy - v[1] * f, v[2]];
    });

    const lightDir = [0.45, 0.72, 0.53];
    const lightLen = Math.hypot(lightDir[0], lightDir[1], lightDir[2]);
    const lx = lightDir[0] / lightLen, ly = lightDir[1] / lightLen, lz = lightDir[2] / lightLen;

    const facesToDraw = [];
    for (let i = 0; i < mesh.faces.length; i++) {
      const face = mesh.faces[i];
      const r0 = rotated[face[0]];
      const r1 = rotated[face[1]];
      const r2 = rotated[face[2]];

      // Cutaway hides front-right quadrant in cutaway mode; interior shows back inner shell
      const avgX = (r0[0] + r1[0] + r2[0]) / 3;
      const avgZ = (r0[2] + r1[2] + r2[2]) / 3;
      const avgYOrig = mesh.faceCentroidsY[i];

      if (state.viewMode === 'cutaway' && avgX > 0.05 && avgZ > 0.05) {
        continue;
      }

      const ux = r1[0] - r0[0], uy = r1[1] - r0[1], uz = r1[2] - r0[2];
      const vx = r2[0] - r0[0], vy = r2[1] - r0[1], vz = r2[2] - r0[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const nLen = Math.hypot(nx, ny, nz) || 1;
      nx /= nLen; ny /= nLen; nz /= nLen;

      if (state.viewMode === 'exosphere' && nz < -0.08) continue;
      if (state.viewMode === 'interior' && nz > 0.08) continue;

      const facing = state.viewMode === 'interior' ? -1 : 1;
      const diff = Math.max(0.14, facing * (nx * lx + ny * ly + nz * lz));
      const inCap = avgYOrig >= geom.capCosThreshold;

      facesToDraw.push({
        i,
        depth: avgZ,
        p0: projected[face[0]],
        p1: projected[face[1]],
        p2: projected[face[2]],
        diff,
        inCap
      });
    }

    facesToDraw.sort((a, b) => a.depth - b.depth);

    for (let k = 0; k < facesToDraw.length; k++) {
      const f = facesToDraw[k];
      ctx.beginPath();
      ctx.moveTo(f.p0[0], f.p0[1]);
      ctx.lineTo(f.p1[0], f.p1[1]);
      ctx.lineTo(f.p2[0], f.p2[1]);
      ctx.closePath();

      if (f.inCap) {
        const rCol = Math.round(138 + 112 * f.diff);
        const gCol = Math.round(92 + 95 * f.diff);
        const bCol = Math.round(35 + 45 * f.diff);
        ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
        ctx.strokeStyle = 'rgba(255, 232, 184, 0.55)';
      } else {
        const rCol = Math.round(16 + 30 * f.diff);
        const gCol = Math.round(45 + 64 * f.diff);
        const bCol = Math.round(72 + 88 * f.diff);
        ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
        ctx.strokeStyle = 'rgba(130, 200, 230, 0.35)';
      }
      ctx.lineWidth = state.frequency >= 4 ? 0.8 : 1.15;
      ctx.fill();
      ctx.stroke();
    }

    // Center-to-surface radius indicator
    const tip = rotatePoint([1, 0, 0], state.yaw, state.pitch);
    const tipZ = camDist - tip[2];
    const tipF = (spherePx * camDist) / tipZ;
    const tipX = cx + tip[0] * tipF;
    const tipY = cy - tip[1] * tipF;

    ctx.strokeStyle = '#67d5f0';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const rLabel = state.unitMode === 'imperial'
      ? `r = ${intFmt.format(geom.radiusFt)} ft`
      : `r = ${geom.radiusM} m`;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = '#67d5f0';
    ctx.fillText(rLabel, (cx + tipX) * 0.5 + 8, (cy + tipY) * 0.5 - 8);

    // Top-left HUD badge
    ctx.fillStyle = 'rgba(8, 21, 35, 0.78)';
    ctx.fillRect(14, 14, 248, 52);
    ctx.strokeStyle = 'rgba(103, 213, 240, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, 248, 52);
    ctx.fillStyle = '#f4bc63';
    ctx.font = '700 12px system-ui, sans-serif';
    const modeLabel = state.viewMode === 'exosphere'
      ? 'Exosphere View'
      : (state.viewMode === 'interior' ? 'Interior Seating Bowl' : 'Cutaway Shell');
    ctx.fillText(`${modeLabel} · Freq ${geom.frequency}`, 24, 34);
    ctx.fillStyle = '#d7eaf5';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`${geom.faceCount} triangles · ${geom.edgeCount} struts · cap ${geom.coveragePct}%`, 24, 54);
  }

  function renderScalingChart() {
    const canvas = $('ss-scaling-canvas');
    if (!canvas) return;
    const W = 620, H = 170;
    const ctx = setupHiDpi(canvas, W, H);
    ctx.fillStyle = '#091827';
    ctx.fillRect(0, 0, W, H);

    const padL = 50, padR = 24, padT = 24, padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxR = 120;
    const minR = 10;

    // Grid
    ctx.strokeStyle = 'rgba(130, 194, 224, 0.14)';
    ctx.lineWidth = 1;
    [2, 4, 8, 12].forEach((mult) => {
      const y = padT + plotH - (Math.min(mult, 12) / 12) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = '#92b6ce';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillText(`${mult}×`, 14, y + 4);
    });

    const refR = 40; // Normalize relative to r = 40 m so 80 m hits 4x and 8x cleanly
    function xForR(r) {
      return padL + ((r - minR) / (maxR - minR)) * plotW;
    }
    function yForMult(m) {
      return padT + plotH - (Math.min(m, 12) / 12) * plotH;
    }

    // Volume curve (r/40)^3
    ctx.strokeStyle = '#67d5f0';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let r = minR; r <= maxR; r += 2) {
      const m = Math.pow(r / refR, 3);
      const x = xForR(r), y = yForMult(m);
      if (r === minR) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Area curve (r/40)^2
    ctx.strokeStyle = '#f4bc63';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let r = minR; r <= maxR; r += 2) {
      const m = Math.pow(r / refR, 2);
      const x = xForR(r), y = yForMult(m);
      if (r === minR) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current radius marker
    const curX = xForR(state.radiusM);
    const curA = Math.pow(state.radiusM / refR, 2);
    const curV = Math.pow(state.radiusM / refR, 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(curX, padT);
    ctx.lineTo(curX, padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f4bc63';
    ctx.beginPath();
    ctx.arc(curX, yForMult(curA), 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#67d5f0';
    ctx.beginPath();
    ctx.arc(curX, yForMult(curV), 5, 0, Math.PI * 2);
    ctx.fill();

    // Legend & x ticks
    ctx.fillStyle = '#d7eaf5';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText('Scaling relative to r₀ = 40 m:', padL, 15);
    ctx.fillStyle = '#f4bc63';
    ctx.fillText('Area (r/r₀)²', padL + 195, 15);
    ctx.fillStyle = '#67d5f0';
    ctx.fillText('Volume (r/r₀)³', padL + 290, 15);

    ctx.fillStyle = '#92b6ce';
    ctx.font = '600 11px system-ui, sans-serif';
    [10, 40, 80, 120].forEach((r) => {
      ctx.fillText(`${r} m`, xForR(r) - 12, H - 8);
    });
  }

  function updateLab1() {
    const geom = Model.computeSphereGeometry(state);
    const imp = state.unitMode === 'imperial';

    setText('ss-radius-value', imp ? `${intFmt.format(geom.radiusFt)} ft (${geom.radiusM} m)` : `${geom.radiusM} m`);
    setText('ss-coverage-value', `${geom.coveragePct}%`);
    setText('ss-detail-value', `Freq ${geom.frequency} (${geom.faceCount} Δ)`);

    setText('ss-area', imp ? `${intFmt.format(geom.areaFt2)} ft²` : `${intFmt.format(geom.areaM2)} m²`);
    setText('ss-diameter-note', imp
      ? `Diameter ${intFmt.format(geom.diameterFt)} ft`
      : `Diameter ${intFmt.format(geom.diameterM)} m`);
    setText('ss-covered', imp ? `${intFmt.format(geom.coveredAreaFt2)} ft²` : `${intFmt.format(geom.coveredAreaM2)} m²`);
    setText('ss-cap-angle', `Cap half-angle ${dec1Fmt.format(geom.capHalfAngleDeg)}°`);
    setText('ss-volume', imp ? `${intFmt.format(geom.volumeFt3)} ft³` : `${intFmt.format(geom.volumeM3)} m³`);
    setText('ss-mesh-stats', `${geom.faceCount} Δ · ${dec2Fmt.format(geom.areaErrorPct)}% err`);
    setText('ss-strut-note', `${geom.edgeCount} struts (${dec1Fmt.format(geom.minStrutM)}–${dec1Fmt.format(geom.maxStrutM)} m)`);
    setText('ss-mesh-caption', `${geom.faceCount} triangles · ${geom.edgeCount} struts · geometric chord error ${dec2Fmt.format(geom.areaErrorPct)}%`);

    const banner = $('ss-double-banner');
    if (banner) {
      if (state.doubledFromRadius != null) {
        const cmp = Model.compareRadiusScaling(state.doubledFromRadius, state.radiusM);
        banner.hidden = false;
        banner.textContent =
          `Doubled radius from ${state.doubledFromRadius} m → ${state.radiusM} m (×${dec2Fmt.format(cmp.radiusRatio)}): ` +
          `Surface area grew ×${dec2Fmt.format(cmp.areaRatio)} and interior volume grew ×${dec2Fmt.format(cmp.volumeRatio)}.`;
      } else {
        banner.hidden = true;
      }
    }

    renderSphere3D(geom);
    renderScalingChart();
    updateLab2();
    renderMissionStrip();
  }

  // ── Lab 2: Optics & Visual Acuity ─────────────────────────────────────────
  function renderAcuityLab(acuity) {
    const canvas = $('ss-acuity-canvas');
    if (!canvas) return;
    const W = 700, H = 300;
    const ctx = setupHiDpi(canvas, W, H);

    ctx.fillStyle = '#091827';
    ctx.fillRect(0, 0, W, H);

    // Divider
    ctx.strokeStyle = 'rgba(130, 194, 224, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * 0.52, 16);
    ctx.lineTo(W * 0.52, H - 16);
    ctx.stroke();

    // Left: Curved screen + seat geometry
    const screenCx = 250;
    const screenCy = 152;
    const screenR = 148;
    const halfFov = (state.fovDeg * Math.PI) / 360;
    const seatDistNorm = (state.distanceM - 5) / 75;
    const seatX = screenCx - 20 - seatDistNorm * 112;
    const seatY = screenCy;

    ctx.strokeStyle = '#f4bc63';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(screenCx - 45, screenCy, screenR, -halfFov * 0.65, halfFov * 0.65);
    ctx.stroke();

    // FOV lines from seat to screen edges
    const arcCx = screenCx - 45;
    const topX = arcCx + screenR * Math.cos(-halfFov * 0.65);
    const topY = screenCy + screenR * Math.sin(-halfFov * 0.65);
    const botX = arcCx + screenR * Math.cos(halfFov * 0.65);
    const botY = screenCy + screenR * Math.sin(halfFov * 0.65);

    ctx.fillStyle = 'rgba(103, 213, 240, 0.14)';
    ctx.beginPath();
    ctx.moveTo(seatX, seatY);
    ctx.lineTo(topX, topY);
    ctx.lineTo(botX, botY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(103, 213, 240, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(seatX, seatY);
    ctx.lineTo(topX, topY);
    ctx.moveTo(seatX, seatY);
    ctx.lineTo(botX, botY);
    ctx.stroke();

    // Seat marker
    ctx.fillStyle = '#67d5f0';
    ctx.beginPath();
    ctx.arc(seatX, seatY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(`Seat (${state.distanceM} m)`, Math.max(14, seatX - 32), seatY + 24);
    ctx.fillStyle = '#f4bc63';
    ctx.fillText(`Curved LED Screen (${state.pixelPitchMm} mm pitch)`, 20, 28);
    ctx.fillStyle = '#b3cde0';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`θ = ${dec2Fmt.format(acuity.arcmin)} arcmin per pixel`, 20, H - 18);

    // Right: Eye viewport simulation
    const eyeCx = 532;
    const eyeCy = 152;
    const eyeR = 110;

    ctx.save();
    ctx.beginPath();
    ctx.arc(eyeCx, eyeCy, eyeR, 0, Math.PI * 2);
    ctx.clip();

    // Sample horizon scene into pixel grid scaled by arcmin
    const cellSize = Math.max(2, Math.min(26, Math.round(acuity.arcmin * 5.2)));
    const gridGap = acuity.arcmin <= 1.0 ? 0 : Math.min(3, (acuity.arcmin - 1.0) * 0.9);
    for (let py = eyeCy - eyeR; py < eyeCy + eyeR; py += cellSize) {
      for (let px = eyeCx - eyeR; px < eyeCx + eyeR; px += cellSize) {
        const dx = (px + cellSize * 0.5 - eyeCx) / eyeR;
        const dy = (py + cellSize * 0.5 - eyeCy) / eyeR;
        const dist = Math.hypot(dx, dy);
        let rC, gC, bC;
        if (dist < 0.42) {
          // Glowing golden planet disc
          const shade = 1 - dist / 0.42;
          rC = Math.round(235 + 20 * shade);
          gC = Math.round(145 + 65 * shade);
          bC = Math.round(52 + 40 * shade);
        } else if (dy > 0.25) {
          // Horizon ocean band
          rC = 22;
          gC = Math.round(92 + 40 * (1 - dy));
          bC = Math.round(145 + 45 * (1 - dy));
        } else {
          // Deep twilight sky gradient
          rC = Math.round(18 + 30 * (1 - Math.abs(dy)));
          gC = Math.round(44 + 45 * (1 - Math.abs(dy)));
          bC = Math.round(92 + 60 * (1 - Math.abs(dy)));
        }
        ctx.fillStyle = `rgb(${rC}, ${gC}, ${bC})`;
        const drawSize = Math.max(1, cellSize - gridGap);
        ctx.fillRect(px, py, drawSize, drawSize);
      }
    }
    ctx.restore();

    ctx.strokeStyle = acuity.isSeamless ? '#4ade80' : '#f4bc63';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(eyeCx, eyeCy, eyeR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('What the eye sees', eyeCx - 56, 26);
    ctx.fillStyle = acuity.isSeamless ? '#4ade80' : '#f4bc63';
    ctx.fillText(
      acuity.isSeamless ? 'Seamless (≤ 1.0 arcmin)' : 'Individual pixels resolvable',
      eyeCx - 76,
      H - 16
    );
  }

  function updateLab2() {
    const geom = Model.computeSphereGeometry(state);
    const acuity = Model.computeAcuityMetrics({
      distanceM: state.distanceM,
      pixelPitchMm: state.pixelPitchMm,
      fovDeg: state.fovDeg,
      screenAreaM2: geom.coveredAreaM2
    });
    if (acuity.arcmin <= 1.0) state.reachedSeamlessAcuity = true;

    setText('ss-distance-value', `${state.distanceM} m`);
    setText('ss-pitch-value', `${state.pixelPitchMm} mm`);
    setText('ss-fov-value', `${state.fovDeg}°`);
    setText('ss-arcmin', `${dec2Fmt.format(acuity.arcmin)} arcmin`);
    setText('ss-ppd', `${dec1Fmt.format(acuity.ppd)} pixels/degree`);
    setText('ss-acuity-verdict', acuity.acuityBand === 'seamless'
      ? 'Seamless image'
      : (acuity.acuityBand === 'crisp' ? 'Near-seamless' : 'Visible pixel grid'));
    setText('ss-min-dist', `${dec1Fmt.format(acuity.minSeamlessDistM)} m`);
    setText('ss-megapixels', `${intFmt.format(acuity.totalMegapixels)} MP`);
    setText('ss-optics-caption', `Horizontal span ≈ ${intFmt.format(acuity.horizontalPixels)} px · 1.0 arcmin threshold at ${dec1Fmt.format(acuity.minSeamlessDistM)} m`);

    renderAcuityLab(acuity);
    renderMissionStrip();
  }

  // ── Lab 3: Acoustics & Phased-Array Wavefronts ────────────────────────────
  let waveOffscreen = null;

  function renderAcousticsLab(beam) {
    const canvas = $('ss-acoustics-canvas');
    if (!canvas) return;
    const W = 700, H = 340;
    const ctx = setupHiDpi(canvas, W, H);

    ctx.fillStyle = '#091827';
    ctx.fillRect(0, 0, W, H);

    const fieldH = 228;
    const gridW = 140;
    const gridH = 74;
    if (!waveOffscreen) {
      waveOffscreen = document.createElement('canvas');
      waveOffscreen.width = gridW;
      waveOffscreen.height = gridH;
    }
    const oCtx = waveOffscreen.getContext('2d');
    const img = oCtx.createImageData(gridW, gridH);
    const data = img.data;

    const arrayCenterX = gridW * 0.5;
    const arrayY = gridH - 5;
    const apertureCells = gridW * 0.36;
    const k = (2 * Math.PI) / Math.max(0.17, beam.wavelengthM);
    const meterPerCell = 28 / gridW;
    const phaseNow = state.wavePhase;
    const theta0 = (beam.steerAngleDeg * Math.PI) / 180;
    const splitTheta = (Math.max(18, Math.abs(beam.steerAngleDeg)) * Math.PI) / 180;

    // Precompute driver positions & phase offsets
    const nDrivers = beam.mode === 'whispering' ? 1 : beam.driverCount;
    const driverX = new Float32Array(nDrivers);
    const driverDelay = new Float32Array(nDrivers);
    const driverAmp = new Float32Array(nDrivers);

    if (beam.mode === 'whispering') {
      driverX[0] = arrayCenterX;
      driverDelay[0] = 0;
      driverAmp[0] = 1;
    } else {
      for (let d = 0; d < nDrivers; d++) {
        const u = nDrivers === 1 ? 0 : (d / (nDrivers - 1)) - 0.5;
        driverX[d] = arrayCenterX + u * apertureCells;
        const posM = u * beam.apertureM;
        if (beam.mode === 'steered') {
          driverDelay[d] = -k * posM * Math.sin(theta0);
          driverAmp[d] = 1 / nDrivers;
        } else {
          driverDelay[d] = 0;
          driverAmp[d] = Math.cos(k * posM * Math.sin(splitTheta)) / nDrivers;
        }
      }
    }

    const focusCx = arrayCenterX;
    const focusCy = gridH * 0.38;

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const idx = (gy * gridW + gx) * 4;
        // Clip outside curved dome auditorium
        const rx = (gx - arrayCenterX) / (gridW * 0.47);
        const ry = (gy - arrayY) / (gridH * 0.92);
        if (rx * rx + ry * ry > 1.04) {
          data[idx] = 8; data[idx + 1] = 20; data[idx + 2] = 34; data[idx + 3] = 255;
          continue;
        }

        let pressure = 0;
        if (beam.mode === 'whispering') {
          const distSrc = Math.hypot(gx - driverX[0], gy - arrayY) * meterPerCell;
          const distEcho = Math.hypot(gx - focusCx, gy - focusCy) * meterPerCell;
          pressure = 0.55 * Math.sin(k * distSrc - phaseNow) +
                     0.7 * Math.sin(k * distEcho - phaseNow + 1.4) / (1 + distEcho * 0.35);
        } else {
          for (let d = 0; d < nDrivers; d++) {
            const dist = Math.hypot(gx - driverX[d], gy - arrayY) * meterPerCell;
            const spread = 1 / Math.sqrt(0.35 + dist);
            pressure += driverAmp[d] * spread * Math.sin(k * dist - phaseNow + driverDelay[d]);
          }
          pressure *= 2.4;
        }

        const clamped = Math.max(-1, Math.min(1, pressure));
        if (clamped >= 0) {
          data[idx] = Math.round(14 + 230 * clamped);
          data[idx + 1] = Math.round(32 + 162 * clamped);
          data[idx + 2] = Math.round(52 + 60 * clamped);
        } else {
          const n = -clamped;
          data[idx] = Math.round(10 + 35 * n);
          data[idx + 1] = Math.round(28 + 150 * n);
          data[idx + 2] = Math.round(54 + 175 * n);
        }
        data[idx + 3] = 255;
      }
    }
    oCtx.putImageData(img, 0, 0);
    ctx.drawImage(waveOffscreen, 0, 0, W, fieldH);

    // Dome shell & speaker dots
    ctx.strokeStyle = '#a4d5e4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(W * 0.5, fieldH - 12, W * 0.47, fieldH * 0.88, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    // Target direction line
    if (beam.mode !== 'whispering') {
      const angles = beam.mode === 'dual'
        ? [-Math.max(18, Math.abs(beam.steerAngleDeg)), Math.max(18, Math.abs(beam.steerAngleDeg))]
        : [beam.steerAngleDeg];
      ctx.strokeStyle = 'rgba(244, 188, 99, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      angles.forEach((deg) => {
        const rad = (deg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(W * 0.5, fieldH - 12);
        ctx.lineTo(W * 0.5 + Math.sin(rad) * 190, fieldH - 12 - Math.cos(rad) * 190);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W * 0.5, fieldH * 0.38, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fca5a5';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillText('Echo hot spot', W * 0.5 + 24, fieldH * 0.38 + 4);
    }

    for (let d = 0; d < nDrivers; d++) {
      const px = (driverX[d] / gridW) * W;
      ctx.fillStyle = '#f4bc63';
      ctx.beginPath();
      ctx.arc(px, fieldH - 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bottom angular SPL plot (-75..+75 deg)
    const plotTop = fieldH + 14;
    const plotH = H - plotTop - 24;
    const plotL = 48;
    const plotR = W - 24;
    const plotW = plotR - plotL;

    ctx.fillStyle = '#0c1f31';
    ctx.fillRect(plotL, plotTop, plotW, plotH);
    ctx.strokeStyle = 'rgba(130, 194, 224, 0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(plotL, plotTop, plotW, plotH);

    const samples = Model.samplePolarPattern(beam, 151);
    ctx.strokeStyle = '#67d5f0';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    samples.forEach((pt, idx) => {
      const x = plotL + ((pt.angleDeg + 75) / 150) * plotW;
      const y = plotTop + plotH - pt.gain * (plotH - 10) - 4;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#b3cde0';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('SPL', 14, plotTop + plotH * 0.55);
    [-60, -30, 0, 30, 60].forEach((deg) => {
      const x = plotL + ((deg + 75) / 150) * plotW;
      ctx.fillText(`${deg}°`, x - 10, H - 7);
    });
  }

  function updateLab3() {
    const beam = Model.computeBeamforming({
      mode: state.acousticMode,
      driverCount: state.driverCount,
      frequencyHz: state.frequencyHz,
      steerAngleDeg: state.steerAngleDeg,
      apertureM: 6
    });
    if (beam.mode === 'steered' && Math.abs(beam.steerAngleDeg) >= 20) {
      state.steeredOffAxis = true;
    }

    setText('ss-steer-value', `${state.steerAngleDeg}°`);
    setText('ss-drivers-value', `${state.driverCount} drivers`);
    setText('ss-freq-value', `${state.frequencyHz} Hz`);
    setText('ss-wavelength', `${dec2Fmt.format(beam.wavelengthM)} m`);
    setText('ss-beamwidth', beam.mode === 'whispering' ? 'Unfocused' : `${dec1Fmt.format(beam.beamwidthDeg)}°`);
    setText('ss-array-status', beam.mode === 'whispering'
      ? 'Concave focal echo'
      : (beam.hasGratingLobe ? 'Side-lobe aliasing' : 'Clean spatial beam'));
    setText('ss-spacing-note', `Spacing ${dec2Fmt.format(beam.spacingM)} m vs λ/2 = ${dec2Fmt.format(beam.halfWavelengthM)} m`);
    setText('ss-acoustics-caption', beam.mode === 'whispering'
      ? 'Unbaffled dome reflects sound waves inward to a central focal zone'
      : (beam.mode === 'dual'
        ? `Dual-zone array splits beams symmetrically to ±${Math.max(18, Math.abs(beam.steerAngleDeg))}°`
        : `Phased delays align constructive wavefronts along ${beam.steerAngleDeg}°`));

    renderAcousticsLab(beam);
    renderMissionStrip();
  }

  // ── Lab 4: Shannon-Hartley Curve ──────────────────────────────────────────
  function renderChannelChart(ch) {
    const canvas = $('ss-channel-canvas');
    if (!canvas) return;
    const W = 640, H = 250;
    const ctx = setupHiDpi(canvas, W, H);

    ctx.fillStyle = '#091827';
    ctx.fillRect(0, 0, W, H);

    const padL = 56, padR = 24, padT = 26, padB = 34;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxCap = Math.max(100, Math.ceil((ch.doubleBandwidthMbps * 1.12) / 50) * 50);

    function xForSnr(snr) {
      return padL + ((snr - 1) / 39) * plotW;
    }
    function yForCap(c) {
      return padT + plotH - (Math.min(maxCap, c) / maxCap) * plotH;
    }

    // Gridlines
    ctx.strokeStyle = 'rgba(130, 194, 224, 0.14)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const capTick = (maxCap * g) / 4;
      const y = yForCap(capTick);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = '#92b6ce';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillText(`${Math.round(capTick)}`, 12, y + 4);
    }

    // 2x Bandwidth dashed curve
    ctx.strokeStyle = 'rgba(103, 213, 240, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let snr = 1; snr <= 40; snr += 1) {
      const c = 2 * ch.bandwidthMHz * Math.log2(1 + snr);
      const x = xForSnr(snr), y = yForCap(c);
      if (snr === 1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Active C = B log2(1 + S/N) curve
    ctx.strokeStyle = '#f4bc63';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    for (let snr = 1; snr <= 40; snr += 1) {
      const c = ch.bandwidthMHz * Math.log2(1 + snr);
      const x = xForSnr(snr), y = yForCap(c);
      if (snr === 1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Operating point + 2xB marker
    const curX = xForSnr(ch.snrLinear);
    const curY = yForCap(ch.capacityMbps);
    const dblY = yForCap(ch.doubleBandwidthMbps);

    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(curX, curY);
    ctx.lineTo(curX, dblY);
    ctx.stroke();

    ctx.fillStyle = '#f4bc63';
    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#67d5f0';
    ctx.beginPath();
    ctx.arc(curX, dblY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f4bc63';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText(`Current: ${dec1Fmt.format(ch.capacityMbps)} Mb/s`, Math.min(W - 165, curX + 10), Math.max(42, curY - 8));
    ctx.fillStyle = '#67d5f0';
    ctx.fillText(`2×B: ${dec1Fmt.format(ch.doubleBandwidthMbps)} Mb/s`, Math.min(W - 155, curX + 10), Math.max(26, dblY - 6));

    ctx.fillStyle = '#92b6ce';
    ctx.font = '600 11px system-ui, sans-serif';
    [1, 10, 20, 30, 40].forEach((s) => {
      ctx.fillText(`${s}:1`, xForSnr(s) - 10, H - 10);
    });
    ctx.fillText('Signal-to-Noise Ratio (S/N)', W * 0.5 - 70, H - 10);
  }

  function updateChannel() {
    const ch = Model.computeChannelCapacity({
      bandwidthMHz: state.bandwidthMHz,
      snrLinear: state.snrLinear
    });
    setText('ss-bandwidth-value', `${ch.bandwidthMHz} MHz`);
    setText('ss-snr-value', `${ch.snrLinear}:1`);
    setText('ss-capacity', `${dec1Fmt.format(ch.capacityMbps)} Mb/s`);
    setText('ss-snr-db', `${dec1Fmt.format(ch.snrDb)} dB`);
    setText('ss-spectral-eff', `${dec2Fmt.format(ch.spectralEfficiency)} b/s/Hz`);
    setText('ss-double-compare', `+100% vs. +${dec1Fmt.format(ch.doubleSnrGainPct)}%`);
    setText('ss-streams-note', `≈ ${dec1Fmt.format(ch.equivalent4kStreams)} streams @ 25 Mb/s`);

    const bar = $('ss-capacity-bar');
    if (bar) bar.style.width = `${ch.barPct}%`;

    renderChannelChart(ch);
    renderMissionStrip();
  }

  // ── Quiz Wiring ───────────────────────────────────────────────────────────
  function renderQuiz() {
    const list = $('ss-quiz-list');
    if (!list) return;
    list.innerHTML = '';
    Model.QUIZ_QUESTIONS.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'ss-quiz-card';
      card.dataset.questionId = q.id;
      const fs = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = `${idx + 1}. ${q.prompt}`;
      fs.appendChild(legend);

      q.options.forEach((opt) => {
        const label = document.createElement('label');
        label.className = 'ss-quiz-option';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = q.id;
        input.value = opt.value;
        const span = document.createElement('span');
        span.textContent = opt.label;
        label.appendChild(input);
        label.appendChild(span);
        fs.appendChild(label);
      });

      const explain = document.createElement('p');
      explain.className = 'ss-quiz-explain';
      explain.hidden = true;
      card.appendChild(fs);
      card.appendChild(explain);
      list.appendChild(card);
    });
  }

  function wireEvents() {
    // Prediction
    document.querySelectorAll('[data-predict]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-predict]').forEach((other) => {
          other.setAttribute('aria-pressed', String(other === btn));
        });
        state.predictionCorrect = btn.dataset.predict === '4';
        setText('ss-prediction-feedback', state.predictionCorrect
          ? 'Yes. Area contains r², so it grows 4×. Volume contains r³, so it grows 8×.'
          : 'Try setting radius to 40 m in Lab 1, then click Double the radius to compare area and volume.');
        renderMissionStrip();
      });
    });

    // Lab 1 controls
    const radiusEl = $('ss-radius');
    const coverageEl = $('ss-coverage');
    const detailEl = $('ss-detail');

    radiusEl.addEventListener('input', () => {
      state.radiusM = Number(radiusEl.value);
      state.doubledFromRadius = null;
      state.testedRadiusScaling = true;
      updateLab1();
    });
    coverageEl.addEventListener('input', () => {
      state.coveragePct = Number(coverageEl.value);
      updateLab1();
    });
    detailEl.addEventListener('input', () => {
      state.frequency = Number(detailEl.value);
      state.maxFrequencyUsed = Math.max(state.maxFrequencyUsed, state.frequency);
      updateLab1();
    });

    document.querySelectorAll('[data-venue]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = Model.VENUE_PRESETS[btn.dataset.venue];
        if (!preset) return;
        state.radiusM = preset.radiusM;
        state.coveragePct = preset.coveragePct;
        state.frequency = preset.frequency;
        state.doubledFromRadius = null;
        state.maxFrequencyUsed = Math.max(state.maxFrequencyUsed, preset.frequency);
        radiusEl.value = preset.radiusM;
        coverageEl.value = preset.coveragePct;
        detailEl.value = preset.frequency;
        updateLab1();
      });
    });

    document.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.viewMode = btn.dataset.view;
        document.querySelectorAll('[data-view]').forEach((other) => {
          other.setAttribute('aria-pressed', String(other === btn));
        });
        renderSphere3D(Model.computeSphereGeometry(state));
      });
    });

    document.querySelectorAll('[data-unit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.unitMode = btn.dataset.unit;
        document.querySelectorAll('[data-unit]').forEach((other) => {
          other.setAttribute('aria-pressed', String(other === btn));
        });
        updateLab1();
      });
    });

    $('ss-double').addEventListener('click', () => {
      const before = state.radiusM;
      const next = Math.min(120, before * 2);
      state.doubledFromRadius = before;
      state.radiusM = next;
      state.doubledRadius = next === before * 2;
      state.testedRadiusScaling = true;
      radiusEl.value = next;
      updateLab1();
    });

    $('ss-spin').addEventListener('click', () => {
      state.autoSpin = !state.autoSpin;
      const btn = $('ss-spin');
      btn.setAttribute('aria-pressed', String(state.autoSpin));
      btn.textContent = state.autoSpin ? 'Pause spin' : 'Auto-rotate';
    });

    $('ss-reset').addEventListener('click', () => {
      state.radiusM = 60;
      state.coveragePct = 60;
      state.frequency = 3;
      state.doubledFromRadius = null;
      radiusEl.value = 60;
      coverageEl.value = 60;
      detailEl.value = 3;
      updateLab1();
    });

    // Pointer + keyboard orbit on 3D canvas
    const sphereCanvas = $('ss-sphere-canvas');
    let dragActive = false;
    let lastX = 0;
    let lastY = 0;
    sphereCanvas.addEventListener('pointerdown', (e) => {
      dragActive = true;
      lastX = e.clientX;
      lastY = e.clientY;
      sphereCanvas.setPointerCapture(e.pointerId);
    });
    sphereCanvas.addEventListener('pointermove', (e) => {
      if (!dragActive) return;
      state.yaw += (e.clientX - lastX) * 0.01;
      state.pitch = Model.clamp(state.pitch + (e.clientY - lastY) * 0.01, -1.25, 1.25);
      lastX = e.clientX;
      lastY = e.clientY;
      renderSphere3D(Model.computeSphereGeometry(state));
    });
    sphereCanvas.addEventListener('pointerup', () => { dragActive = false; });
    sphereCanvas.addEventListener('pointercancel', () => { dragActive = false; });
    sphereCanvas.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { state.yaw -= 0.14; e.preventDefault(); }
      else if (e.key === 'ArrowRight') { state.yaw += 0.14; e.preventDefault(); }
      else if (e.key === 'ArrowUp') { state.pitch = Model.clamp(state.pitch - 0.1, -1.25, 1.25); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { state.pitch = Model.clamp(state.pitch + 0.1, -1.25, 1.25); e.preventDefault(); }
      else return;
      renderSphere3D(Model.computeSphereGeometry(state));
    });

    // Lab 2 controls
    const distEl = $('ss-distance');
    const pitchEl = $('ss-pitch');
    const fovEl = $('ss-fov');
    distEl.addEventListener('input', () => { state.distanceM = Number(distEl.value); updateLab2(); });
    pitchEl.addEventListener('input', () => { state.pixelPitchMm = Number(pitchEl.value); updateLab2(); });
    fovEl.addEventListener('input', () => { state.fovDeg = Number(fovEl.value); updateLab2(); });

    document.querySelectorAll('[data-display]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = Model.DISPLAY_PRESETS[btn.dataset.display];
        if (!p) return;
        state.distanceM = p.distanceM;
        state.pixelPitchMm = p.pixelPitchMm;
        state.fovDeg = p.fovDeg;
        distEl.value = p.distanceM;
        pitchEl.value = p.pixelPitchMm;
        fovEl.value = p.fovDeg;
        updateLab2();
      });
    });

    $('ss-optics-reset').addEventListener('click', () => {
      state.distanceM = 35;
      state.pixelPitchMm = 10;
      state.fovDeg = 160;
      distEl.value = 35;
      pitchEl.value = 10;
      fovEl.value = 160;
      updateLab2();
    });

    // Lab 3 controls
    const steerEl = $('ss-steer');
    const driversEl = $('ss-drivers');
    const freqEl = $('ss-freq');
    steerEl.addEventListener('input', () => { state.steerAngleDeg = Number(steerEl.value); updateLab3(); });
    driversEl.addEventListener('input', () => { state.driverCount = Number(driversEl.value); updateLab3(); });
    freqEl.addEventListener('input', () => { state.frequencyHz = Number(freqEl.value); updateLab3(); });

    document.querySelectorAll('[data-acoustic-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.acousticMode = btn.dataset.acousticMode;
        document.querySelectorAll('[data-acoustic-mode]').forEach((other) => {
          other.setAttribute('aria-pressed', String(other === btn));
        });
        updateLab3();
      });
    });

    $('ss-wave-play').addEventListener('click', () => {
      state.wavePlaying = !state.wavePlaying;
      const btn = $('ss-wave-play');
      btn.setAttribute('aria-pressed', String(state.wavePlaying));
      btn.textContent = state.wavePlaying ? 'Pause waves' : 'Play waves';
    });

    $('ss-acoustics-reset').addEventListener('click', () => {
      state.acousticMode = 'steered';
      state.steerAngleDeg = 0;
      state.driverCount = 10;
      state.frequencyHz = 850;
      steerEl.value = 0;
      driversEl.value = 10;
      freqEl.value = 850;
      document.querySelectorAll('[data-acoustic-mode]').forEach((other) => {
        other.setAttribute('aria-pressed', String(other.dataset.acousticMode === 'steered'));
      });
      updateLab3();
    });

    // Lab 4 controls
    const bwEl = $('ss-bandwidth');
    const snrEl = $('ss-snr');
    bwEl.addEventListener('input', () => { state.bandwidthMHz = Number(bwEl.value); updateChannel(); });
    snrEl.addEventListener('input', () => { state.snrLinear = Number(snrEl.value); updateChannel(); });

    $('ss-compare-b').addEventListener('click', () => {
      state.bandwidthMHz = Math.min(40, state.bandwidthMHz * 2);
      bwEl.value = state.bandwidthMHz;
      state.usedDoubleB = true;
      if (state.usedDoubleSnr) state.comparedChannelScaling = true;
      updateChannel();
    });

    $('ss-compare-snr').addEventListener('click', () => {
      state.snrLinear = Math.min(40, state.snrLinear * 2);
      snrEl.value = state.snrLinear;
      state.usedDoubleSnr = true;
      if (state.usedDoubleB) state.comparedChannelScaling = true;
      updateChannel();
    });

    $('ss-data-reset').addEventListener('click', () => {
      state.bandwidthMHz = 10;
      state.snrLinear = 10;
      bwEl.value = 10;
      snrEl.value = 10;
      updateChannel();
    });

    // Quiz
    $('ss-check-quiz').addEventListener('click', () => {
      const answers = {};
      Model.QUIZ_QUESTIONS.forEach((q) => {
        const checked = document.querySelector(`input[name="${q.id}"]:checked`);
        if (checked) answers[q.id] = checked.value;
      });
      const graded = Model.gradeQuiz(answers);
      graded.results.forEach((res) => {
        const card = document.querySelector(`.ss-quiz-card[data-question-id="${res.id}"]`);
        if (!card) return;
        card.classList.toggle('is-correct', res.isCorrect);
        card.classList.toggle('is-wrong', !res.isCorrect);
        const explain = card.querySelector('.ss-quiz-explain');
        explain.hidden = false;
        explain.textContent = (res.isCorrect ? 'Correct — ' : 'Check reasoning — ') + res.explanation;
      });
      setText('ss-quiz-feedback', `Score: ${graded.correct}/${graded.total} correct.`);
    });

    $('ss-reset-quiz').addEventListener('click', () => {
      document.querySelectorAll('#ss-quiz-list input[type="radio"]').forEach((inp) => { inp.checked = false; });
      document.querySelectorAll('.ss-quiz-card').forEach((card) => {
        card.classList.remove('is-correct', 'is-wrong');
        const explain = card.querySelector('.ss-quiz-explain');
        if (explain) { explain.hidden = true; explain.textContent = ''; }
      });
      setText('ss-quiz-feedback', '');
    });

    // Exit ticket
    const reveal = $('ss-reveal');
    const answer = $('ss-answer');
    reveal.addEventListener('click', () => {
      answer.hidden = !answer.hidden;
      reveal.setAttribute('aria-expanded', String(!answer.hidden));
      reveal.textContent = answer.hidden ? 'Show reasoning' : 'Hide reasoning';
    });
  }

  // Smooth animation loop (only runs when active and not reduced-motion)
  let lastTick = 0;
  function tick(ts) {
    if (lastTick === 0) lastTick = ts;
    const dt = Math.min(0.05, (ts - lastTick) / 1000);
    lastTick = ts;

    if (!reducedMotion) {
      if (state.autoSpin) {
        state.yaw += dt * 0.25;
        renderSphere3D(Model.computeSphereGeometry(state));
      }
      if (state.wavePlaying) {
        state.wavePhase = (state.wavePhase + dt * 4.4) % (Math.PI * 2);
        renderAcousticsLab(Model.computeBeamforming({
          mode: state.acousticMode,
          driverCount: state.driverCount,
          frequencyHz: state.frequencyHz,
          steerAngleDeg: state.steerAngleDeg,
          apertureM: 6
        }));
      }
    }
    requestAnimationFrame(tick);
  }

  renderQuiz();
  wireEvents();
  updateLab1();
  updateLab3();
  updateChannel();
  if (!reducedMotion) {
    requestAnimationFrame(tick);
  }
})();
