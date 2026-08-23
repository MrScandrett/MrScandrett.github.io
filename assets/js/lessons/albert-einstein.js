(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var speedInput = document.getElementById('ae-speed');
  var relCanvas = document.getElementById('ae-relativity-canvas');
  var photoCanvas = document.getElementById('ae-photoelectric-canvas');
  var relSurface = SimKit.canvas2d(relCanvas);
  var photoSurface = SimKit.canvas2d(photoCanvas);
  var relState = { elapsed: 0, running: false, geometry: true };
  var photoPhase = 0;

  function beta() { return Number(speedInput.value) / 100; }
  function gamma() { var b = beta(); return 1 / Math.sqrt(1 - b * b); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function triangle(phase) {
    var normalized = ((phase % 1) + 1) % 1;
    return normalized < 0.5 ? normalized * 2 : 2 - normalized * 2;
  }
  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function roundRect(ctx, x, y, w, h, radius) {
    var r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fillRoundRect(ctx, x, y, w, h, radius, fill, stroke) {
    roundRect(ctx, x, y, w, h, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function glowDot(ctx, x, y, radius, color) {
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = radius * 3; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff7c2'; ctx.beginPath(); ctx.arc(x - radius * .22, y - radius * .22, Math.max(1.2, radius * .28), 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function drawStars(ctx, w, h, seedOffset) {
    ctx.save();
    for (var i = 0; i < 44; i += 1) {
      var x = ((i * 83 + seedOffset * 37) % 997) / 997 * w;
      var y = ((i * i * 29 + seedOffset * 71) % 991) / 991 * h;
      var radius = i % 9 === 0 ? 1.5 : i % 3 === 0 ? 1 : .55;
      ctx.globalAlpha = .22 + (i % 5) * .11; ctx.fillStyle = i % 7 === 0 ? '#fde68a' : '#dbeafe';
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawTag(ctx, text, x, y, align) {
    ctx.save(); ctx.font = '800 10px ui-monospace, SFMono-Regular, Consolas, monospace';
    var width = ctx.measureText(text).width + 18; var left = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
    fillRoundRect(ctx, left, y - 14, width, 22, 5, 'rgba(7,21,47,.88)', 'rgba(147,197,253,.28)');
    ctx.fillStyle = '#dbeafe'; ctx.textAlign = align || 'center'; ctx.fillText(text, x, y + 1); ctx.restore();
  }

  function updateRelativityReadouts(announce) {
    var b = beta();
    var g = gamma();
    var shipTime = relState.elapsed / g;
    document.getElementById('ae-slider-label').textContent = b.toFixed(2) + ' c';
    document.getElementById('ae-speed-out').textContent = b.toFixed(2) + ' c';
    document.getElementById('ae-gamma-out').textContent = g.toFixed(3);
    document.getElementById('ae-earth-time').textContent = relState.elapsed.toFixed(2) + ' y';
    document.getElementById('ae-ship-time').textContent = shipTime.toFixed(2) + ' y';
    if (announce) document.getElementById('ae-run-status').textContent = announce;
  }

  function resetRelativity() {
    relState.elapsed = 0;
    relState.running = false;
    updateRelativityReadouts('READY · ' + beta().toFixed(2) + ' c');
    drawRelativity();
  }

  function drawRelativity() {
    var ctx = relSurface.ctx;
    var w = relSurface.width;
    var h = relSurface.height;
    var g = gamma();
    var progress = clamp(relState.elapsed / g, 0, 1);
    var compact = w < 500;
    var top = Math.max(88, h * 0.30);
    var bottom = Math.min(h - 66, h * 0.75);
    var leftClockX = w * 0.17;
    var zoneStart = w * 0.42;
    var zoneEnd = w * 0.87;
    var shipX = zoneStart + (zoneEnd - zoneStart) * progress;
    var shipPhotonY = bottom - (bottom - top) * triangle(progress);
    var earthPhotonY = bottom - (bottom - top) * triangle(relState.elapsed);
    var gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#030914'); gradient.addColorStop(.55, '#0b2143'); gradient.addColorStop(1, '#201b57');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    drawStars(ctx, w, h, 2);

    ctx.save();
    var earthGlow = ctx.createRadialGradient(leftClockX, h + 50, 8, leftClockX, h + 50, w * .25);
    earthGlow.addColorStop(0, 'rgba(96,165,250,.42)'); earthGlow.addColorStop(.55, 'rgba(30,64,175,.2)'); earthGlow.addColorStop(1, 'rgba(30,64,175,0)');
    ctx.fillStyle = earthGlow; ctx.fillRect(0, h * .55, w * .36, h * .45);
    ctx.fillStyle = '#0b2444'; ctx.beginPath(); ctx.arc(leftClockX, h + 76, w * .24, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#60a5fa'; ctx.globalAlpha = .55; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.restore();

    drawTag(ctx, compact ? 'EARTH LAB' : 'EARTH REFERENCE CLOCK', leftClockX, 28, 'center');
    drawTag(ctx, compact ? 'MOVING SHIP' : 'SHIP CLOCK · EARTH FRAME', (zoneStart + zoneEnd) / 2, 28, 'center');
    ctx.fillStyle = '#93c5fd'; ctx.font = '600 ' + (compact ? '8px' : '10px') + ' system-ui'; ctx.textAlign = 'center';
    ctx.fillText('1.00 y per tick', leftClockX, 51);
    ctx.fillText(g.toFixed(2) + ' Earth y per ship tick', (zoneStart + zoneEnd) / 2, 51);

    var chamberWidth = clamp(w * .065, 22, 54);
    var chamberGradient = ctx.createLinearGradient(leftClockX - chamberWidth, 0, leftClockX + chamberWidth, 0);
    chamberGradient.addColorStop(0, 'rgba(14,116,144,.22)'); chamberGradient.addColorStop(.5, 'rgba(186,230,253,.10)'); chamberGradient.addColorStop(1, 'rgba(14,116,144,.25)');
    fillRoundRect(ctx, leftClockX - chamberWidth / 2, top - 16, chamberWidth, bottom - top + 32, chamberWidth / 2, chamberGradient, 'rgba(125,211,252,.55)');
    ctx.strokeStyle = '#b6c6d9'; ctx.lineWidth = 5;
    line(ctx, leftClockX - chamberWidth * .58, top, leftClockX + chamberWidth * .58, top);
    line(ctx, leftClockX - chamberWidth * .58, bottom, leftClockX + chamberWidth * .58, bottom);
    ctx.strokeStyle = 'rgba(125,211,252,.55)'; ctx.lineWidth = 2; line(ctx, leftClockX, top, leftClockX, bottom);
    ctx.fillStyle = '#233b58'; fillRoundRect(ctx, leftClockX - chamberWidth * .85, bottom + 12, chamberWidth * 1.7, 11, 3, '#233b58', '#64748b');
    line(ctx, leftClockX - chamberWidth * .55, bottom + 23, leftClockX - chamberWidth * .78, bottom + 37);
    line(ctx, leftClockX + chamberWidth * .55, bottom + 23, leftClockX + chamberWidth * .78, bottom + 37);
    glowDot(ctx, leftClockX, earthPhotonY, compact ? 5.5 : 7, '#facc15');

    ctx.save();
    ctx.strokeStyle = 'rgba(147,197,253,.18)'; ctx.lineWidth = 1.5;
    for (var streak = 0; streak < 6; streak += 1) {
      var sy = top - 26 + streak * ((bottom - top + 52) / 5);
      line(ctx, zoneStart - 8, sy, zoneEnd + 20, sy);
    }
    ctx.restore();

    if (relState.geometry) {
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(250,204,21,.62)'; ctx.lineWidth = 2;
      line(ctx, zoneStart, bottom, (zoneStart + zoneEnd) / 2, top);
      line(ctx, (zoneStart + zoneEnd) / 2, top, zoneEnd, bottom);
      ctx.setLineDash([]); ctx.fillStyle = '#fde68a'; ctx.font = '700 ' + (compact ? '8px' : '10px') + ' system-ui';
      ctx.fillText(compact ? 'longer path · same c' : 'photon route: longer path, unchanged c', (zoneStart + zoneEnd) / 2, bottom + 31); ctx.restore();
    }

    var shipWidth = clamp(w * .082, 34, 68);
    var shipTop = top - 28; var shipBottom = bottom + 28; var shipHeight = shipBottom - shipTop;
    ctx.save();
    ctx.shadowColor = 'rgba(96,165,250,.35)'; ctx.shadowBlur = 18;
    var hull = ctx.createLinearGradient(shipX - shipWidth, shipTop, shipX + shipWidth, shipBottom);
    hull.addColorStop(0, '#334155'); hull.addColorStop(.38, '#dbe7f3'); hull.addColorStop(.52, '#718096'); hull.addColorStop(1, '#1e293b');
    ctx.beginPath();
    ctx.moveTo(shipX - shipWidth * .72, shipTop + 14); ctx.quadraticCurveTo(shipX, shipTop - 8, shipX + shipWidth * .84, shipTop + 15);
    ctx.lineTo(shipX + shipWidth, shipTop + shipHeight * .5); ctx.lineTo(shipX + shipWidth * .84, shipBottom - 15);
    ctx.quadraticCurveTo(shipX, shipBottom + 8, shipX - shipWidth * .72, shipBottom - 14); ctx.closePath();
    ctx.fillStyle = hull; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    fillRoundRect(ctx, shipX - shipWidth * .43, top - 13, shipWidth * .86, bottom - top + 26, 9, 'rgba(7,21,47,.88)', '#67e8f9');
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 5;
    line(ctx, shipX - shipWidth * .35, top, shipX + shipWidth * .35, top);
    line(ctx, shipX - shipWidth * .35, bottom, shipX + shipWidth * .35, bottom);
    ctx.strokeStyle = 'rgba(103,232,249,.48)'; ctx.lineWidth = 1; line(ctx, shipX, top, shipX, bottom);
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(shipX + shipWidth * .62, shipTop + shipHeight * .48, shipWidth * .16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7dd3fc'; ctx.stroke();
    var flame = ctx.createLinearGradient(shipX - shipWidth * 1.3, 0, shipX - shipWidth * .65, 0);
    flame.addColorStop(0, 'rgba(96,165,250,0)'); flame.addColorStop(.55, 'rgba(96,165,250,.45)'); flame.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = flame; ctx.beginPath(); ctx.moveTo(shipX - shipWidth * .7, shipTop + shipHeight * .42); ctx.lineTo(shipX - shipWidth * 1.45, shipTop + shipHeight * .5); ctx.lineTo(shipX - shipWidth * .7, shipTop + shipHeight * .58); ctx.closePath(); ctx.fill();
    glowDot(ctx, shipX, shipPhotonY, compact ? 5.5 : 7, '#facc15');

    ctx.strokeStyle = 'rgba(96,165,250,.72)'; ctx.lineWidth = 2; line(ctx, zoneStart - 8, bottom + 45, zoneEnd + 14, bottom + 45);
    ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.moveTo(zoneEnd + 14, bottom + 45); ctx.lineTo(zoneEnd + 3, bottom + 39); ctx.lineTo(zoneEnd + 3, bottom + 51); ctx.closePath(); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#cbd5e1'; ctx.font = '700 10px ui-monospace, monospace';
    ctx.fillText('EARTH Δt  ' + relState.elapsed.toFixed(2) + ' y', leftClockX, h - 17);
    ctx.fillText('SHIP Δτ  ' + (relState.elapsed / g).toFixed(2) + ' y', (zoneStart + zoneEnd) / 2, h - 17);
  }

  speedInput.addEventListener('input', resetRelativity);
  document.querySelectorAll('[data-speed]').forEach(function (button) {
    button.addEventListener('click', function () { speedInput.value = button.dataset.speed; resetRelativity(); });
  });
  document.getElementById('ae-run').addEventListener('click', function () {
    if (relState.elapsed >= gamma()) relState.elapsed = 0;
    if (reducedMotion) {
      relState.elapsed = gamma(); relState.running = false;
      updateRelativityReadouts('COMPLETE · reduced-motion snapshot'); drawRelativity(); return;
    }
    relState.running = true; updateRelativityReadouts('RUNNING · one ship tick');
  });
  document.getElementById('ae-pause').addEventListener('click', function () {
    relState.running = false; updateRelativityReadouts('PAUSED · ' + relState.elapsed.toFixed(2) + ' Earth y');
  });
  document.getElementById('ae-step').addEventListener('click', function () {
    relState.running = false; relState.elapsed = Math.min(gamma(), relState.elapsed + 0.1);
    updateRelativityReadouts(relState.elapsed >= gamma() ? 'COMPLETE · one ship tick' : 'STEPPED · +0.10 Earth y'); drawRelativity();
  });
  document.getElementById('ae-reset').addEventListener('click', resetRelativity);
  document.getElementById('ae-geometry').addEventListener('click', function () {
    relState.geometry = !relState.geometry;
    this.setAttribute('aria-pressed', String(relState.geometry)); this.textContent = relState.geometry ? 'Geometry on' : 'Geometry off'; drawRelativity();
  });

  function wavelengthColor(nm) {
    if (nm < 380) return '#8b5cf6';
    if (nm < 450) return '#6366f1';
    if (nm < 495) return '#3b82f6';
    if (nm < 570) return '#22c55e';
    if (nm < 590) return '#eab308';
    if (nm < 620) return '#f97316';
    return '#ef4444';
  }
  function photoValues() {
    var wavelength = Number(document.getElementById('ae-wavelength').value);
    var intensity = Number(document.getElementById('ae-intensity').value);
    var work = Number(document.getElementById('ae-metal').value);
    var energy = 1239.841984 / wavelength;
    return { wavelength: wavelength, intensity: intensity, work: work, energy: energy, ke: Math.max(0, energy - work), emitting: energy >= work };
  }
  function updatePhotoelectric() {
    var values = photoValues();
    document.getElementById('ae-wavelength-out').textContent = values.wavelength + ' nm';
    document.getElementById('ae-intensity-out').textContent = values.intensity + '%';
    document.getElementById('ae-photon-energy').textContent = values.energy.toFixed(2) + ' eV';
    document.getElementById('ae-work-function').textContent = values.work.toFixed(2) + ' eV';
    document.getElementById('ae-electron-ke').textContent = values.ke.toFixed(2) + ' eV';
    var emission = document.getElementById('ae-emission');
    emission.className = 'ae-emission ' + (values.emitting ? 'on' : 'off');
    emission.textContent = values.emitting ? 'Electrons emitted' : 'Below threshold';
    document.getElementById('ae-photo-status').textContent = values.emitting ? 'EMISSION · KE ' + values.ke.toFixed(2) + ' eV' : 'NO EMISSION';
    drawPhotoelectric();
  }
  function drawPhotoelectric() {
    var ctx = photoSurface.ctx;
    var w = photoSurface.width;
    var h = photoSurface.height;
    var values = photoValues();
    var compact = w < 500;
    var plateX = w * 0.59;
    var collectorX = w * 0.86;
    var tubeLeft = w * 0.21;
    var tubeTop = h * .18;
    var tubeBottom = h * .82;
    var background = ctx.createLinearGradient(0, 0, 0, h);
    background.addColorStop(0, '#020713'); background.addColorStop(.72, '#071b34'); background.addColorStop(1, '#0f2237');
    ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); drawStars(ctx, w, h * .72, 7);
    ctx.fillStyle = 'rgba(15,23,42,.78)'; ctx.fillRect(0, h * .83, w, h * .17);
    ctx.strokeStyle = 'rgba(148,163,184,.24)'; line(ctx, 0, h * .83, w, h * .83);

    var tubeGradient = ctx.createLinearGradient(0, tubeTop, 0, tubeBottom);
    tubeGradient.addColorStop(0, 'rgba(186,230,253,.18)'); tubeGradient.addColorStop(.18, 'rgba(15,42,70,.38)'); tubeGradient.addColorStop(.82, 'rgba(2,12,27,.72)'); tubeGradient.addColorStop(1, 'rgba(125,211,252,.13)');
    ctx.lineWidth = 2; fillRoundRect(ctx, tubeLeft, tubeTop, w * .72, tubeBottom - tubeTop, 34, tubeGradient, 'rgba(186,230,253,.54)');
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.30)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tubeLeft + 34, tubeTop + 29, 18, Math.PI * 1.08, Math.PI * 1.63); ctx.stroke();
    line(ctx, tubeLeft + 57, tubeTop + 12, collectorX - 18, tubeTop + 12); ctx.restore();

    drawTag(ctx, compact ? 'LAMP' : 'MONOCHROMATIC LAMP', w * .11, 26, 'center');
    drawTag(ctx, compact ? 'METAL' : 'EMITTER PLATE', plateX, 26, 'center');
    drawTag(ctx, compact ? 'COLLECT' : 'ELECTRON COLLECTOR', collectorX, 26, 'center');

    var lampX = w * .11; var lampY = h * .50;
    ctx.save(); ctx.shadowColor = wavelengthColor(values.wavelength); ctx.shadowBlur = 24;
    var lampGlow = ctx.createRadialGradient(lampX, lampY, 2, lampX, lampY, 35);
    lampGlow.addColorStop(0, '#fff'); lampGlow.addColorStop(.25, wavelengthColor(values.wavelength)); lampGlow.addColorStop(1, 'rgba(37,99,235,0)');
    ctx.fillStyle = lampGlow; ctx.beginPath(); ctx.arc(lampX, lampY, 35, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#26364a'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lampX - 27, lampY - 28); ctx.lineTo(lampX + 4, lampY - 18); ctx.lineTo(lampX + 4, lampY + 18); ctx.lineTo(lampX - 27, lampY + 28); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = wavelengthColor(values.wavelength); ctx.beginPath(); ctx.arc(lampX + 7, lampY, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 9px ui-monospace, monospace'; ctx.fillText(values.wavelength + ' nm', lampX + 7, lampY + 3);
    var beamGradient = ctx.createLinearGradient(lampX + 18, 0, plateX - 14, 0);
    beamGradient.addColorStop(0, wavelengthColor(values.wavelength)); beamGradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.globalAlpha = .11 + values.intensity / 900; ctx.fillStyle = beamGradient;
    ctx.beginPath(); ctx.moveTo(lampX + 17, lampY - 12); ctx.lineTo(plateX - 12, tubeTop + 30); ctx.lineTo(plateX - 12, tubeBottom - 30); ctx.lineTo(lampX + 17, lampY + 12); ctx.closePath(); ctx.fill(); ctx.restore();

    var photons = 3 + Math.round(values.intensity / 14);
    for (var i = 0; i < photons; i += 1) {
      var laneY = tubeTop + 27 + (i + 1) * ((tubeBottom - tubeTop - 54) / (photons + 1));
      var travel = ((photoPhase + i / photons) % 1);
      var px = lampX + 24 + travel * (plateX - lampX - 41);
      ctx.save(); ctx.translate(px, laneY); ctx.strokeStyle = wavelengthColor(values.wavelength); ctx.lineWidth = 2; ctx.shadowColor = wavelengthColor(values.wavelength); ctx.shadowBlur = 8;
      ctx.beginPath();
      for (var wave = -10; wave <= 10; wave += 2) {
        var waveY = Math.sin((wave + 10) * .7) * 2.5;
        if (wave === -10) ctx.moveTo(wave, waveY); else ctx.lineTo(wave, waveY);
      }
      ctx.stroke(); ctx.fillStyle = wavelengthColor(values.wavelength); ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(7, -4); ctx.lineTo(7, 4); ctx.closePath(); ctx.fill(); ctx.restore();
    }

    var plateGradient = ctx.createLinearGradient(plateX - 14, 0, plateX + 14, 0);
    plateGradient.addColorStop(0, '#334155'); plateGradient.addColorStop(.28, '#e2e8f0'); plateGradient.addColorStop(.5, '#94a3b8'); plateGradient.addColorStop(.82, '#f8fafc'); plateGradient.addColorStop(1, '#475569');
    ctx.fillStyle = plateGradient; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plateX - 10, tubeTop + 22); ctx.quadraticCurveTo(plateX + 18, h * .5, plateX - 10, tubeBottom - 22); ctx.lineTo(plateX + 9, tubeBottom - 22); ctx.quadraticCurveTo(plateX + 35, h * .5, plateX + 9, tubeTop + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(collectorX + 10, tubeTop + 30); ctx.quadraticCurveTo(collectorX - 24, h * .5, collectorX + 10, tubeBottom - 30); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.fillRect(collectorX + 7, tubeTop + 27, 8, tubeBottom - tubeTop - 54);

    if (values.emitting) {
      var electronCount = 2 + Math.round(values.intensity / 18);
      for (var e = 0; e < electronCount; e += 1) {
        var eProgress = ((photoPhase * (1 + values.ke * .12) + e / electronCount) % 1);
        var baseY = tubeTop + 24 + (e + 1) * ((tubeBottom - tubeTop - 48) / (electronCount + 1));
        var ex = plateX + 17 + eProgress * (collectorX - plateX - 28);
        var ey = baseY - Math.sin(eProgress * Math.PI) * (18 + values.ke * 4);
        ctx.save(); ctx.strokeStyle = 'rgba(103,232,249,.28)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(plateX + 15, baseY); ctx.quadraticCurveTo((plateX + collectorX) / 2, baseY - 26 - values.ke * 4, collectorX - 13, baseY); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.shadowColor = '#67e8f9'; ctx.shadowBlur = 12; ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#07152f'; ctx.font = '900 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText('−', ex, ey + 2.5);
      }
    } else {
      fillRoundRect(ctx, (plateX + collectorX) / 2 - (compact ? 50 : 72), h * .47, compact ? 100 : 144, 32, 7, 'rgba(127,29,29,.72)', 'rgba(252,165,165,.5)');
      ctx.fillStyle = '#fecaca'; ctx.font = '800 ' + (compact ? '8px' : '10px') + ' system-ui'; ctx.textAlign = 'center';
      ctx.fillText('NEEDS ' + values.work.toFixed(2) + ' eV PER PHOTON', (plateX + collectorX) / 2, h * .47 + 20);
    }

    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2;
    line(ctx, plateX, tubeBottom, plateX, h * .91); line(ctx, collectorX, tubeBottom, collectorX, h * .91); line(ctx, plateX, h * .91, collectorX, h * .91);
    var meterX = (plateX + collectorX) / 2; var meterY = h * .91;
    fillRoundRect(ctx, meterX - 24, meterY - 16, 48, 27, 6, '#e5e7eb', '#94a3b8');
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; line(ctx, meterX, meterY + 1, meterX + (values.emitting ? 15 : -12), meterY - 10);
    ctx.fillStyle = '#0f172a'; ctx.font = '900 7px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('CURRENT', meterX, meterY + 8);
    ctx.fillStyle = '#94a3b8'; ctx.font = '600 ' + (compact ? '8px' : '9px') + ' system-ui';
    ctx.fillText('brightness → photon count', w * .27, h - 7);
    ctx.fillText('frequency → energy each', w * .76, h - 7);
  }
  ['ae-wavelength', 'ae-intensity'].forEach(function (id) { document.getElementById(id).addEventListener('input', updatePhotoelectric); });
  document.getElementById('ae-metal').addEventListener('change', updatePhotoelectric);
  document.querySelectorAll('[data-wavelength]').forEach(function (button) {
    button.addEventListener('click', function () { document.getElementById('ae-wavelength').value = button.dataset.wavelength; updatePhotoelectric(); });
  });

  function updateMassEnergy() {
    var milligrams = Math.max(0, Number(document.getElementById('ae-mass').value) || 0);
    var joules = milligrams * 1e-6 * 299792458 * 299792458;
    document.getElementById('ae-energy-j').textContent = joules.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' J';
    document.getElementById('ae-energy-kwh').textContent = (joules / 3600000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' kWh';
  }
  document.getElementById('ae-mass').addEventListener('input', updateMassEnergy);

  var predictionKeys = {
    relativity: { answer: 'slower', correct: 'Yes. In Earth’s frame, the longer diagonal light path takes more time while light still travels at c.', wrong: 'Run the clock once and compare elapsed times. The photon still travels at c, but its Earth-frame path is longer.' },
    photoelectric: { answer: 'no-emit', correct: 'Yes. More below-threshold photons do not give any one electron enough energy to escape.', wrong: 'Test red light at maximum intensity, then shorten the wavelength. Energy per photon—not brightness alone—controls the threshold.' }
  };
  document.querySelectorAll('[data-prediction]').forEach(function (field) {
    var config = predictionKeys[field.dataset.prediction];
    field.querySelectorAll('.ae-choice').forEach(function (button) {
      button.addEventListener('click', function () {
        field.querySelectorAll('.ae-choice').forEach(function (choice) { choice.classList.remove('correct', 'wrong'); choice.setAttribute('aria-pressed', 'false'); });
        var correct = button.dataset.choice === config.answer;
        button.classList.add(correct ? 'correct' : 'wrong'); button.setAttribute('aria-pressed', 'true');
        var feedback = field.querySelector('.ae-feedback'); feedback.textContent = correct ? config.correct : config.wrong; feedback.classList.toggle('good', correct);
      });
    });
  });

  var reviewResults = new Map();
  function updateScore() {
    var correct = 0; reviewResults.forEach(function (value) { if (value) correct += 1; });
    document.getElementById('ae-score').textContent = correct + ' of 5 correct';
  }
  document.querySelectorAll('.ae-question').forEach(function (question) {
    question.querySelectorAll('.ae-option').forEach(function (option) {
      option.addEventListener('click', function () {
        question.querySelectorAll('.ae-option').forEach(function (button) { button.classList.remove('correct', 'wrong'); button.setAttribute('aria-pressed', 'false'); });
        var correct = option.dataset.choice === question.dataset.answer;
        option.classList.add(correct ? 'correct' : 'wrong'); option.setAttribute('aria-pressed', 'true');
        if (!correct) question.querySelector('[data-choice="' + question.dataset.answer + '"]').classList.add('correct');
        var feedback = question.querySelector('.ae-feedback'); feedback.textContent = (correct ? 'Correct. ' : 'Revise your answer. ') + question.dataset.explain; feedback.classList.toggle('good', correct);
        reviewResults.set(question, correct); updateScore();
      });
    });
  });
  document.getElementById('ae-check-explanation').addEventListener('click', function () {
    var text = document.getElementById('ae-synthesis').value.toLowerCase();
    var checks = [
      { hit: /reference frame|earth|observer/.test(text), label: 'name the observer or reference frame' },
      { hit: /constant|same speed|\bc\b/.test(text), label: 'state that light speed remains c' },
      { hit: /longer|diagonal|path/.test(text), label: 'compare the photon’s path length' },
      { hit: /time|tick|elapsed|slow/.test(text), label: 'connect path length to elapsed time' }
    ];
    var met = checks.filter(function (item) { return item.hit; });
    var missing = checks.filter(function (item) { return !item.hit; }).map(function (item) { return item.label; });
    var feedback = document.getElementById('ae-synthesis-feedback');
    feedback.textContent = met.length === 4 ? 'Strong evidence chain: you identified the frame, constant light speed, longer path, and longer elapsed time.' : 'You have ' + met.length + ' of 4 evidence pieces. Next, ' + missing.join('; ') + '.';
    feedback.classList.toggle('good', met.length === 4);
  });
  document.getElementById('ae-reset-review').addEventListener('click', function () {
    reviewResults.clear(); updateScore();
    document.querySelectorAll('.ae-question').forEach(function (question) {
      question.querySelectorAll('.ae-option').forEach(function (button) { button.classList.remove('correct', 'wrong'); button.setAttribute('aria-pressed', 'false'); });
      question.querySelector('.ae-feedback').textContent = '';
    });
    document.getElementById('ae-synthesis').value = ''; document.getElementById('ae-synthesis-feedback').textContent = '';
  });

  var panel = document.getElementById('ae-side-panel');
  var openPanelButton = document.querySelector('.ll-open-btn');
  var closePanelButton = document.querySelector('.ll-panel-close');
  var tabs = Array.from(document.querySelectorAll('.ll-tab[role="tab"]'));
  function activateTab(tab, focus) {
    tabs.forEach(function (item) {
      var selected = item === tab;
      item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1;
      var pane = document.getElementById(item.dataset.pane); pane.classList.toggle('ll-active', selected); pane.hidden = !selected;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { activateTab(tab, false); });
    tab.addEventListener('keydown', function (event) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      var next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activateTab(tabs[next], true);
    });
  });
  function setPanelOpen(open, moveFocus) {
    panel.setAttribute('aria-hidden', String(!open)); panel.inert = !open;
    openPanelButton.setAttribute('aria-expanded', String(open));
    if (moveFocus) (open ? tabs.find(function (tab) { return tab.getAttribute('aria-selected') === 'true'; }) : openPanelButton).focus();
  }
  closePanelButton.addEventListener('click', function () { setPanelOpen(false, true); });
  openPanelButton.addEventListener('click', function () { setPanelOpen(true, true); });
  if (window.matchMedia('(max-width: 960px)').matches) setPanelOpen(false, false);

  SimKit.loop(function (dt) {
    if (relState.running) {
      relState.elapsed = Math.min(gamma(), relState.elapsed + Math.min(dt, 0.05) * 1.15);
      if (relState.elapsed >= gamma()) { relState.running = false; updateRelativityReadouts('COMPLETE · one ship tick'); }
      else updateRelativityReadouts();
    }
    if (!reducedMotion) photoPhase = (photoPhase + Math.min(dt, 0.05) * .38) % 1;
    drawRelativity(); drawPhotoelectric();
  });

  resetRelativity(); updatePhotoelectric(); updateMassEnergy(); updateScore();
}());
