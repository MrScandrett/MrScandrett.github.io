(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Shared state across missions so Mission 08 can summarize the live build
  const state = {
    chassis: { l: 140, w: 120, clear: 10, battPos: 50, ok: true },
    printing: { layer: 0.24, walls: 3, infill: 25, orient: 'flat', slicePct: 85, minutes: 48, grams: 14 },
    pen: { joint: 'butt', force: 2.0, deflectionDeg: 8.4, pass: false },
    gears: { driver: 12, driven: 36, ratio: 3.0, task: 'ramp', climbs: true },
    servo: { angle: 90, arm: 25, load: 100, momentNm: 0.025, safe: true },
    integration: { done: 4, total: 8, fault: 'nominal' },
    effector: { type: 'grip', reach: 100, jaw: 45, offset: 0, passes: 3, trialAnim: 1 }
  };

  function roundRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function prepareCanvas(canvas, logicalW, logicalH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(logicalW * dpr);
    const targetH = Math.round(logicalH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /* ── MISSION 01: CHASSIS ───────────────────────────────────────── */
  function chassis() {
    const l = +$('[data-rb="length"]').value;
    const w = +$('[data-rb="width"]').value;
    const clear = +$('[data-rb="clearance"]').value;
    const battInput = $('[data-rb="batt-pos"]');
    const battPos = battInput ? +battInput.value : 50;

    $('#rb-length').textContent = l;
    $('#rb-width').textContent = w;
    $('#rb-clearance').textContent = clear;
    if ($('#rb-batt-pos')) $('#rb-batt-pos').textContent = battPos;

    const sizeOk = l <= 150 && w <= 150;
    const clearOk = clear >= 8;
    const comOk = battPos >= 32 && battPos <= 68;
    const ok = sizeOk && clearOk && comOk;

    state.chassis = { l, w, clear, battPos, ok };

    const issues = [];
    if (!sizeOk) issues.push('exceeds 150 × 150 mm rule box');
    if (!clearOk) issues.push('ground clearance < 8 mm drags on floor seams');
    if (!comOk) issues.push(battPos < 32 ? 'rear-heavy CoM risks tipping backward' : 'nose-heavy CoM overloads front wheels');

    $('#rb-chassis-readout').innerHTML =
      `Footprint: ${l} × ${w} mm · Ground clearance: ${clear} mm · CoM: ${battPos}% from rear<br>` +
      `<strong class="${ok ? 'rb-ok' : 'rb-warn'}">${
        ok
          ? 'Constraint check: ready to print 100% paper fit-check.'
          : 'Revise: ' + issues.join('; ') + '.'
      }</strong>`;

    const v = $('#rb-boardviz');
    if (v) {
      v.style.width = Math.min(100, (l / 150) * 100) + '%';
      v.style.aspectRatio = `${l}/${w}`;
    }

    drawChassisCanvas();
    updateSpecTable();
  }

  function drawChassisCanvas() {
    const canvas = $('#rb-chassis-canvas');
    if (!canvas) return;
    const W = 620;
    const H = 330;
    const ctx = prepareCanvas(canvas, W, H);
    const { l, w, clear, battPos, ok } = state.chassis;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f181c';
    ctx.fillRect(0, 0, W, H);

    // Subtle millimeter grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 20; x < W; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 20; y < H; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Left viewport: Top view (scale: 1.45 px per mm)
    const scale = 1.42;
    const cx = 195;
    const cy = 165;
    const maxPx = 150 * scale;

    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText('TOP VIEW (150 × 150 mm RULE BOX)', 24, 24);

    // 150x150 rule box
    ctx.save();
    ctx.strokeStyle = '#f2bd3f';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(cx - maxPx / 2, cy - maxPx / 2, maxPx, maxPx);
    ctx.restore();

    const plateW = l * scale;
    const plateH = w * scale;
    const px = cx - plateW / 2;
    const py = cy - plateH / 2;

    // Wheels (4-wheel differential drive)
    const wheelL = Math.min(48, plateW * 0.34);
    const wheelT = 14;
    const axleX1 = px + plateW * 0.22;
    const axleX2 = px + plateW * 0.78;

    ctx.fillStyle = '#243137';
    ctx.strokeStyle = '#9aa9aa';
    ctx.lineWidth = 1.5;
    [
      [axleX1 - wheelL / 2, py - wheelT - 3],
      [axleX2 - wheelL / 2, py - wheelT - 3],
      [axleX1 - wheelL / 2, py + plateH + 3],
      [axleX2 - wheelL / 2, py + plateH + 3]
    ].forEach(([wx, wy]) => {
      roundRect(ctx, wx, wy, wheelL, wheelT, 4);
      ctx.fill();
      ctx.stroke();
    });

    // Chassis plate
    ctx.fillStyle = '#203640';
    ctx.strokeStyle = l <= 150 && w <= 150 ? '#57c7e8' : '#e05a47';
    ctx.lineWidth = 3;
    roundRect(ctx, px, py, plateW, plateH, 12);
    ctx.fill();
    ctx.stroke();

    // Wheelbase stability zone (green shaded rectangle between front and rear axles)
    const stabLeft = axleX1 + 6;
    const stabRight = axleX2 - 6;
    ctx.fillStyle = 'rgba(57, 116, 90, 0.25)';
    ctx.strokeStyle = '#5cd69a';
    ctx.lineWidth = 1.5;
    ctx.fillRect(stabLeft, py + 12, Math.max(10, stabRight - stabLeft), plateH - 24);
    ctx.strokeRect(stabLeft, py + 12, Math.max(10, stabRight - stabLeft), plateH - 24);

    // Controller board
    const ctrlW = Math.min(54, plateW * 0.32);
    const ctrlH = Math.min(46, plateH * 0.44);
    ctx.fillStyle = '#147a9b';
    ctx.strokeStyle = '#bceeff';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx - ctrlW * 0.3, cy - ctrlH / 2, ctrlW, ctrlH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UNO', cx + ctrlW * 0.2, cy + 3);

    // Battery pack (movable along length)
    const battW = Math.min(46, plateW * 0.28);
    const battH = Math.min(42, plateH * 0.4);
    const battCenterX = px + 22 + ((plateW - 44) * battPos) / 100;
    ctx.fillStyle = '#b95832';
    ctx.strokeStyle = '#ffd6b8';
    roundRect(ctx, battCenterX - battW / 2, cy - battH / 2, battW, battH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BATT', battCenterX, cy + 3);

    // Front Ultrasonic Sensor + Sight Cone
    const sensX = px + plateW - 14;
    ctx.fillStyle = '#705589';
    ctx.strokeStyle = '#e5d4f5';
    roundRect(ctx, sensX, cy - 16, 12, 32, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(157, 226, 239, 0.14)';
    ctx.beginPath();
    ctx.moveTo(sensX + 12, cy);
    ctx.lineTo(sensX + 58, cy - 28);
    ctx.lineTo(sensX + 58, cy + 28);
    ctx.closePath();
    ctx.fill();

    // Combined Center of Mass (⊕)
    const comX = px + plateW * (0.28 + 0.44 * (battPos / 100));
    const comOk = battPos >= 32 && battPos <= 68;
    ctx.strokeStyle = comOk ? '#90e2b7' : '#ff7b6b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(comX, cy, 8, 0, Math.PI * 2);
    ctx.moveTo(comX - 12, cy);
    ctx.lineTo(comX + 12, cy);
    ctx.moveTo(comX, cy - 12);
    ctx.lineTo(comX, cy + 12);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#d4e4e8';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText(`Footprint: ${l} × ${w} mm`, 24, H - 16);

    // Right viewport: Side view & ground clearance check
    const sx = 390;
    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText('SIDE VIEW & CLEARANCE', sx, 24);

    const groundY = 250;
    ctx.strokeStyle = '#8aa2ac';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, groundY);
    ctx.lineTo(W - 20, groundY);
    ctx.stroke();

    // 7 mm floor threshold bump
    const bumpH = 7 * 2.2;
    ctx.fillStyle = '#b95832';
    ctx.fillRect(sx + 95, groundY - bumpH, 22, bumpH);
    ctx.fillStyle = '#ffd6b8';
    ctx.font = '600 10px "IBM Plex Mono", monospace';
    ctx.fillText('7mm seam', sx + 82, groundY + 16);

    const clearPx = clear * 2.2;
    const sideW = Math.min(185, l * 1.15);
    const sideX = sx + 20;
    const plateBottomY = groundY - clearPx;
    const plateTopY = plateBottomY - 12;

    // Side chassis plate
    ctx.fillStyle = '#203640';
    ctx.strokeStyle = clear >= 8 ? '#90e2b7' : '#ff7b6b';
    ctx.lineWidth = 2.5;
    ctx.fillRect(sideX, plateTopY, sideW, 12);
    ctx.strokeRect(sideX, plateTopY, sideW, 12);

    // Side wheels
    const wheelR = 28;
    const wheelCY = groundY - wheelR;
    [sideX + sideW * 0.22, sideX + sideW * 0.78].forEach((wx) => {
      ctx.fillStyle = '#182226';
      ctx.strokeStyle = '#b9c2c1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wx, wheelCY, wheelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f2bd3f';
      ctx.beginPath();
      ctx.arc(wx, wheelCY, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Side battery & controller blocks
    const sideBattX = sideX + 12 + ((sideW - 48) * battPos) / 100;
    ctx.fillStyle = '#b95832';
    ctx.fillRect(sideBattX, plateTopY - 24, 34, 24);
    ctx.fillStyle = '#147a9b';
    ctx.fillRect(sideX + sideW * 0.45, plateTopY - 30, 40, 30);

    // Clearance status badge
    ctx.fillStyle = ok ? '#90e2b7' : '#ffd66f';
    ctx.font = '700 11px "IBM Plex Mono", monospace';
    ctx.fillText(`Clearance: ${clear} mm (${clear >= 8 ? 'CLEARS SEAM' : 'STRIKES SEAM'})`, sx, H - 16);
  }

  /* ── MISSION 02: PRINT PLAN (SLICER) ───────────────────────────── */
  function printPlan() {
    const layer = +$('[data-rb="layer"]').value;
    const infill = +$('[data-rb="infill"]').value;
    const orient = $('[data-rb="orientation"]').value;
    const wallsInput = $('[data-rb="walls"]');
    const walls = wallsInput ? +wallsInput.value : 3;
    const sliceInput = $('[data-rb="slice-pct"]');
    const slicePct = sliceInput ? +sliceInput.value : 85;

    $('#rb-layer').textContent = layer.toFixed(2);
    $('#rb-infill').textContent = infill;
    if ($('#rb-walls')) $('#rb-walls').textContent = walls;
    if ($('#rb-slice-pct')) $('#rb-slice-pct').textContent = slicePct;

    const baseMinutes = (0.24 / layer) * (22 + walls * 5 + infill * 0.35);
    const orientMult = orient === 'flat' ? 1.0 : orient === 'edge' ? 1.35 : 1.55;
    const minutes = Math.round(baseMinutes * orientMult);
    const grams = Math.round((8 + walls * 1.6 + infill * 0.14) * (orient === 'tilted' ? 1.28 : 1.0));

    state.printing = { layer, walls, infill, orient, slicePct, minutes, grams };

    const note =
      orient === 'flat'
        ? 'largest bed contact; strongest against vertical compression; horizontal hole top bridges slightly'
        : orient === 'edge'
          ? 'smaller footprint and rounder vertical hole; longer print and narrower bed adhesion'
          : 'requires support material (~28% extra filament) and leaves support marks on mounting faces';

    $('#rb-print-readout').textContent =
      `${layer.toFixed(2)} mm layers · ${walls} walls · ${infill}% infill · ${orient} (${minutes} min, ~${grams} g PLA): ${note}. Inspect every axle hole and mounting face in layer preview.`;

    drawSlicerCanvas();
    updateSpecTable();
  }

  function drawSlicerCanvas() {
    const canvas = $('#rb-slicer-canvas');
    if (!canvas) return;
    const W = 620;
    const H = 310;
    const ctx = prepareCanvas(canvas, W, H);
    const { layer, walls, infill, orient, slicePct, minutes, grams } = state.printing;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f181c';
    ctx.fillRect(0, 0, W, H);

    // Left side: Build plate elevation & layer stack
    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText(`LAYER STACK (${slicePct}% SCRUBBED)`, 22, 24);

    const bedY = 250;
    ctx.fillStyle = '#2d3f47';
    ctx.fillRect(24, bedY, 270, 12);

    const stepPx = Math.max(3, Math.round(layer * 22));
    const maxH = orient === 'flat' ? 120 : orient === 'edge' ? 175 : 155;
    const activeH = Math.round((maxH * slicePct) / 100);

    // Draw support material if tilted
    if (orient === 'tilted') {
      ctx.strokeStyle = '#b95832';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      for (let x = 75; x <= 225; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, bedY);
        ctx.lineTo(x, bedY - Math.min(activeH, 68));
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw stacked layers
    for (let yOff = stepPx; yOff <= activeH; yOff += stepPx) {
      const y = bedY - yOff;
      let x0 = 60;
      let x1 = 240;
      if (orient === 'flat') {
        if (yOff > 42) x1 = 120;
      } else if (orient === 'edge') {
        x0 = 105;
        x1 = 195;
      } else {
        const shift = Math.round(yOff * 0.35);
        x0 = 65 + shift;
        x1 = 175 + shift;
      }
      const isTopActive = yOff + stepPx > activeH;
      ctx.strokeStyle = isTopActive ? '#f2bd3f' : '#147a9b';
      ctx.lineWidth = Math.max(2, stepPx - 1);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#d4e4e8';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText(`Est: ${minutes} min · ${grams} g PLA`, 24, H - 16);

    // Right side: Cross-section toolpath & hole tolerance inspector
    const rx = 335;
    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText('TOOLPATH CROSS-SECTION & HOLE FIT', rx, 24);

    const boxX = rx;
    const boxY = 44;
    const boxW = 255;
    const boxH = 190;

    // Infill grid inside slice
    ctx.save();
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.clip();
    ctx.fillStyle = '#16242b';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    const spacing = Math.max(8, Math.round(48 - infill * 0.62));
    ctx.strokeStyle = 'rgba(242, 189, 63, 0.65)';
    ctx.lineWidth = 1.6;
    for (let d = -boxH; d < boxW + boxH; d += spacing) {
      ctx.beginPath();
      ctx.moveTo(boxX + d, boxY);
      ctx.lineTo(boxX + d - boxH, boxY + boxH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(boxX + d - boxH, boxY);
      ctx.lineTo(boxX + d, boxY + boxH);
      ctx.stroke();
    }
    ctx.restore();

    // Wall perimeter loops
    for (let wIdx = 0; wIdx < walls; wIdx++) {
      const inset = wIdx * 4.5;
      ctx.strokeStyle = wIdx === 0 ? '#57c7e8' : '#147a9b';
      ctx.lineWidth = 2.6;
      roundRect(ctx, boxX + inset, boxY + inset, boxW - inset * 2, boxH - inset * 2, Math.max(2, 10 - inset));
      ctx.stroke();
    }

    // Mounting / axle hole in the slice
    const hcx = boxX + boxW / 2;
    const hcy = boxY + boxH / 2;
    const hr = 32;
    ctx.fillStyle = '#0f181c';
    ctx.beginPath();
    ctx.arc(hcx, hcy, hr + walls * 3, 0, Math.PI * 2);
    ctx.fill();

    for (let wIdx = 0; wIdx < walls; wIdx++) {
      ctx.strokeStyle = wIdx === 0 ? '#90e2b7' : '#147a9b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(hcx, hcy, hr + wIdx * 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Show bridging droop if flat horizontal hole
    if (orient === 'flat') {
      ctx.strokeStyle = '#ff7b6b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(hcx - hr + 6, hcy - hr + 7);
      ctx.lineTo(hcx + hr - 6, hcy - hr + 7);
      ctx.stroke();
    }

    ctx.fillStyle = '#d4e4e8';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText(
      orient === 'edge' ? 'Vertical hole: crisp concentric walls' : 'Horizontal hole: test +0.3 mm clearance',
      rx,
      H - 16
    );
  }

  /* ── MISSION 03: 3D PEN JOINT LOAD TEST ────────────────────────── */
  function joints() {
    const active = $('[data-joint][aria-pressed="true"]');
    const type = active?.dataset.joint || 'butt';
    const forceInput = $('[data-rb="pen-force"]');
    const force = forceInput ? +forceInput.value : 2.0;
    if ($('#rb-pen-force')) $('#rb-pen-force').textContent = force.toFixed(1);

    const spans = { butt: 28, lap: 62, gusset: 88 };
    $('#rb-joint-bar').style.width = spans[type] + '%';
    const jointVal = $('#rb-joint-val');
    if (jointVal) {
      const labels = { butt: 'Butt seam (Weak)', lap: 'Lap joint (Moderate)', gusset: 'Gusset (Strongest)' };
      jointVal.textContent = labels[type] || type;
    }

    const flexFactor = { butt: 6.2, lap: 2.3, gusset: 0.7 }[type];
    const deflectionDeg = +(force * flexFactor).toFixed(1);
    const pass = deflectionDeg <= 6.0;

    state.pen = { joint: type, force, deflectionDeg, pass };

    const descriptions = {
      butt: 'Butt joint: quick, but the narrow seam carries the whole bending load.',
      lap: 'Lap joint: more bonded area and a longer load path across the corner.',
      gusset: 'Triangulated gusset: best for resisting a sideways bend without filling the whole part.'
    };

    $('#rb-joint-readout').innerHTML =
      `${descriptions[type]}<br>` +
      `At ${force.toFixed(1)} N push → sight-line tilt ≈ <strong>${deflectionDeg}°</strong> ` +
      `(<strong class="${pass ? 'rb-ok' : 'rb-warn'}">${pass ? 'survives 3-trial push test' : 'excessive flex—reinforce corner'}</strong>).`;

    drawPenCanvas();
    updateSpecTable();
  }

  function drawPenCanvas() {
    const canvas = $('#rb-pen-canvas');
    if (!canvas) return;
    const W = 620;
    const H = 290;
    const ctx = prepareCanvas(canvas, W, H);
    const { joint, force, deflectionDeg, pass } = state.pen;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f181c';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText(`3D-PEN MOUNT LOAD TEST (${joint.toUpperCase()} · ${force.toFixed(1)} N SIDE PUSH)`, 22, 24);

    const baseX = 110;
    const baseY = 230;

    // Chassis base plate
    ctx.fillStyle = '#253840';
    ctx.strokeStyle = '#75878d';
    ctx.lineWidth = 2;
    roundRect(ctx, baseX, baseY, 340, 22, 5);
    ctx.fill();
    ctx.stroke();

    // Vertical post anchored at (pivotX, baseY)
    const pivotX = 240;
    const pivotY = baseY;
    const rad = (deflectionDeg * Math.PI) / 180;

    // Stress glow at corner
    const stressRadius = joint === 'butt' ? 32 : joint === 'lap' ? 22 : 14;
    const grad = ctx.createRadialGradient(pivotX, pivotY, 2, pivotX, pivotY, stressRadius);
    grad.addColorStop(0, pass ? 'rgba(144,226,183,0.55)' : 'rgba(255,107,90,0.75)');
    grad.addColorStop(1, 'rgba(15,24,28,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, stressRadius, 0, Math.PI * 2);
    ctx.fill();

    // Reinforcements
    if (joint === 'lap') {
      ctx.fillStyle = '#f2bd3f';
      roundRect(ctx, pivotX - 24, pivotY - 46, 48, 52, 6);
      ctx.fill();
    } else if (joint === 'gusset') {
      ctx.fillStyle = '#39745a';
      ctx.strokeStyle = '#f2bd3f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pivotX - 75, pivotY);
      ctx.lineTo(pivotX, pivotY - 95);
      ctx.lineTo(pivotX, pivotY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#f2bd3f';
      ctx.beginPath();
      ctx.arc(pivotX, pivotY - 4, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    // Deflected vertical post & sensor head
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(-rad);

    ctx.fillStyle = '#147a9b';
    ctx.strokeStyle = '#bceeff';
    ctx.lineWidth = 2;
    roundRect(ctx, -10, -145, 20, 145, 6);
    ctx.fill();
    ctx.stroke();

    // Sensor head
    ctx.fillStyle = '#705589';
    roundRect(ctx, -16, -172, 36, 28, 5);
    ctx.fill();

    // Deflected sight cone
    ctx.fillStyle = pass ? 'rgba(144,226,183,0.18)' : 'rgba(255,123,107,0.22)';
    ctx.beginPath();
    ctx.moveTo(20, -158);
    ctx.lineTo(250, -205);
    ctx.lineTo(250, -110);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Push arrow from right
    const arrowY = pivotY - 140;
    ctx.strokeStyle = '#b95832';
    ctx.fillStyle = '#b95832';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pivotX + 115, arrowY);
    ctx.lineTo(pivotX + 28, arrowY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pivotX + 22, arrowY);
    ctx.lineTo(pivotX + 34, arrowY - 7);
    ctx.lineTo(pivotX + 34, arrowY + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd6b8';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText(`${force.toFixed(1)} N push`, pivotX + 42, arrowY - 10);

    ctx.fillStyle = pass ? '#90e2b7' : '#ffd66f';
    ctx.font = '700 11px "IBM Plex Mono", monospace';
    ctx.fillText(
      `Sight-line deflection: ${deflectionDeg}° (${pass ? 'AIM STABLE' : 'AIM DRIFTS OFF TARGET'})`,
      22,
      H - 16
    );
  }

  /* ── MISSION 04: MECHANISMS & GEARS ────────────────────────────── */
  let gearPhase = 0;

  function gears() {
    const a = +$('[data-rb="driver"]').value;
    const b = +$('[data-rb="driven"]').value;
    const taskSel = $('[data-rb="mech-task"]');
    const task = taskSel ? taskSel.value : 'ramp';
    const r = b / a;

    $('#rb-driver').textContent = a;
    $('#rb-driven').textContent = b;

    const reqRatio = { flat: 0.8, ramp: 2.1, lift: 3.4 }[task] || 2.1;
    const netTorque = +(r * 0.85).toFixed(2);
    const climbs = netTorque >= reqRatio * 0.85;

    state.gears = { driver: a, driven: b, ratio: r, task, climbs };

    $('#rb-gear-readout').innerHTML =
      `Ratio ${r.toFixed(2)}:1 · output speed ≈ ${(1 / r).toFixed(2)}× input · ideal torque ≈ ${r.toFixed(2)}× input (net ≈ ${netTorque}× after mesh friction).<br>` +
      `<strong class="${climbs ? 'rb-ok' : 'rb-warn'}">${
        climbs
          ? 'Task check: sufficient torque for selected load.'
          : 'Stall warning: ratio too low for this load—increase driven teeth or reduce driver teeth.'
      }</strong>`;

    $('#rb-torque-bar').style.width = Math.min(100, (r / 4) * 100) + '%';
    const torqueVal = $('#rb-torque-val');
    if (torqueVal) {
      torqueVal.textContent = `${r.toFixed(2)}× ratio (${climbs ? 'Climbs' : 'Stalls'})`;
    }

    drawGearCanvas();
    updateSpecTable();
  }

  function drawSpurGear(ctx, x, y, radius, teeth, angle, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const toothDepth = 5;
    const innerR = radius - toothDepth;
    const outerR = radius + toothDepth * 0.6;
    const step = (Math.PI * 2) / teeth;

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a0 = i * step;
      const a1 = a0 + step * 0.22;
      const a2 = a0 + step * 0.5;
      const a3 = a0 + step * 0.72;
      ctx.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
      ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
      ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Spokes / alignment mark
    ctx.strokeStyle = 'rgba(15,24,28,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(innerR * 0.78, 0);
    ctx.stroke();

    // Center bore
    ctx.fillStyle = '#0f181c';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(6, radius * 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawGearCanvas() {
    const canvas = $('#rb-gear-canvas');
    if (!canvas) return;
    const W = 620;
    const H = 300;
    const ctx = prepareCanvas(canvas, W, H);
    const { driver, driven, ratio, task, climbs } = state.gears;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f181c';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText(`SPUR GEAR TRAIN (${driver}T → ${driven}T · ${ratio.toFixed(2)}:1)`, 22, 24);

    const r1 = Math.max(20, Math.min(54, driver * 1.35));
    const r2 = Math.max(20, Math.min(78, driven * 1.35));
    const totalSpan = r1 + r2 + 4;
    const gx1 = Math.max(75, 165 - totalSpan * 0.45);
    const gx2 = gx1 + totalSpan;
    const gy = 155;

    drawSpurGear(ctx, gx1, gy, r1, driver, gearPhase, '#147a9b', '#bceeff');
    drawSpurGear(ctx, gx2, gy, r2, driven, -gearPhase * (driver / driven) + Math.PI / driven, '#f2bd3f', '#fff3c8');

    ctx.fillStyle = '#d4e4e8';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText(`Input: 120 RPM`, 22, H - 16);
    ctx.fillText(`Output: ${Math.round(120 / ratio)} RPM`, 165, H - 16);

    // Right side: Ramp / Load Dynamometer
    const rx = 365;
    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText('LOAD DYNAMOMETER', rx, 24);

    const slopeDeg = task === 'flat' ? 2 : task === 'ramp' ? 16 : 24;
    const slopeRad = (slopeDeg * Math.PI) / 180;
    const rampX0 = rx + 10;
    const rampY0 = 235;
    const rampLen = 215;
    const rampX1 = rampX0 + Math.cos(slopeRad) * rampLen;
    const rampY1 = rampY0 - Math.sin(slopeRad) * rampLen;

    ctx.strokeStyle = '#8aa2ac';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rampX0, rampY0);
    ctx.lineTo(rampX1, rampY1);
    ctx.lineTo(rampX1, rampY0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.stroke();

    // Robot climbing along the ramp
    const progress = climbs ? 0.55 + 0.22 * Math.sin(gearPhase * 0.5) : 0.22;
    const botX = rampX0 + Math.cos(slopeRad) * (rampLen * progress);
    const botY = rampY0 - Math.sin(slopeRad) * (rampLen * progress);

    ctx.save();
    ctx.translate(botX, botY - 12);
    ctx.rotate(-slopeRad);
    ctx.fillStyle = climbs ? '#39745a' : '#b95832';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    roundRect(ctx, -24, -16, 48, 20, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#172126';
    ctx.beginPath();
    ctx.arc(-14, 6, 8, 0, Math.PI * 2);
    ctx.arc(14, 6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = climbs ? '#90e2b7' : '#ffd66f';
    ctx.font = '700 11px "IBM Plex Mono", monospace';
    ctx.fillText(climbs ? 'STATUS: CLIMBS STEADILY' : 'STATUS: MOTOR STALLS ON GRADE', rx, H - 16);
  }

  /* ── MISSION 05: SERVOS ────────────────────────────────────────── */
  function servo() {
    const angle = +$('[data-rb="angle"]').value;
    const arm = +$('[data-rb="arm"]').value;
    const load = +$('[data-rb="load"]').value;

    $('#rb-angle').textContent = angle;
    $('#rb-arm').textContent = arm;
    $('#rb-load').textContent = load;

    const momentNm = +(((arm / 1000) * (load / 1000) * 9.81) * 10).toFixed(3); // matches existing formula (arm/10*load/1000*9.81)
    const inStopZone = angle <= 20 || angle >= 160;
    const overTorque = momentNm > 0.16;
    const safe = !inStopZone && !overTorque;

    state.servo = { angle, arm, load, momentNm, safe };

    $('#rb-servo-readout').innerHTML =
      `Commanded position: ${angle}°. Estimated load moment: ${momentNm.toFixed(3)} N·m. ` +
      `Check this against the servo's rated torque with a safety margin; never force the horn by hand while powered.<br>` +
      `<strong class="${safe ? 'rb-ok' : 'rb-warn'}">${
        inStopZone
          ? 'Hard-stop warning: angle is inside collision/binding zone (keep within 20°–160°).'
          : overTorque
            ? 'High load moment: shorten the horn distance or counterbalance the arm.'
            : 'Safe operating envelope: within mechanical stops and micro-servo torque margin.'
      }</strong>`;

    drawServoCanvas();
    updateSpecTable();
  }

  function drawServoCanvas() {
    const canvas = $('#rb-servo-canvas');
    if (!canvas) return;
    const W = 620;
    const H = 300;
    const ctx = prepareCanvas(canvas, W, H);
    const { angle, arm, load, momentNm, safe } = state.servo;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f181c';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText(`SERVO HORN SWEEP (${angle}° · ARM ${arm} mm · LOAD ${load} g)`, 22, 24);

    const sx = 210;
    const sy = 225;
    const arcR = 135;

    // Safe sweep sector (20° to 160°)
    ctx.fillStyle = 'rgba(57, 116, 90, 0.22)';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, arcR, Math.PI + (20 * Math.PI) / 180, Math.PI + (160 * Math.PI) / 180);
    ctx.closePath();
    ctx.fill();

    // Hard stop danger sectors (0–20° and 160–180°)
    ctx.fillStyle = 'rgba(185, 88, 50, 0.38)';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, arcR, Math.PI, Math.PI + (20 * Math.PI) / 180);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, arcR, Math.PI + (160 * Math.PI) / 180, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // Servo body
    ctx.fillStyle = '#147a9b';
    ctx.strokeStyle = '#bceeff';
    ctx.lineWidth = 2;
    roundRect(ctx, sx - 45, sy, 90, 46, 6);
    ctx.fill();
    ctx.stroke();

    // Horn arm + suspended mass
    const rad = Math.PI + (angle * Math.PI) / 180;
    const armLenPx = 45 + arm * 1.15;
    const tipX = sx + Math.cos(rad) * armLenPx;
    const tipY = sy + Math.sin(rad) * armLenPx;

    ctx.strokeStyle = '#f2bd3f';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Center spline hub
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Load mass + gravity vector
    const massR = Math.max(10, Math.min(24, 8 + load / 30));
    ctx.fillStyle = '#b95832';
    ctx.strokeStyle = '#ffd6b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tipX, tipY, massR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ff7b6b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY + massR);
    ctx.lineTo(tipX, tipY + massR + 28);
    ctx.stroke();

    // Right side: Torque budget gauge
    const gx = 415;
    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText('TORQUE & STOP MARGIN', gx, 24);

    ctx.fillStyle = '#1d2d35';
    roundRect(ctx, gx, 52, 175, 175, 8);
    ctx.fill();

    const pct = Math.min(100, Math.round((momentNm / 0.22) * 100));
    ctx.fillStyle = '#d4e4e8';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText(`Demand: ${momentNm.toFixed(3)} N·m`, gx + 14, 82);
    ctx.fillText(`Safe limit: 0.160 N·m`, gx + 14, 102);

    ctx.fillStyle = '#0f181c';
    ctx.fillRect(gx + 14, 118, 147, 20);
    ctx.fillStyle = pct > 72 ? '#b95832' : '#39745a';
    ctx.fillRect(gx + 14, 118, (147 * pct) / 100, 20);

    ctx.fillStyle = safe ? '#90e2b7' : '#ffd66f';
    ctx.fillText(safe ? 'POSE & TORQUE OK' : 'CHECK LIMIT / LOAD', gx + 14, 172);
    ctx.fillStyle = '#b9c2c1';
    ctx.fillText('Service loop: slack OK', gx + 14, 198);
  }

  /* ── MISSION 06: INTEGRATION & FAULT ISOLATION ─────────────────── */
  function integration() {
    const checks = $$('#rb-integration input');
    const done = checks.filter((x) => x.checked).length;
    const faultSel = $('[data-rb="fault-scenario"]');
    const fault = faultSel ? faultSel.value : 'nominal';

    state.integration = { done, total: checks.length, fault };

    $('#rb-integration-bar').style.width = (done / checks.length) * 100 + '%';
    const intVal = $('#rb-integration-val');
    if (intVal) {
      intVal.textContent = `${done} of ${checks.length} gates passed`;
    }

    const faultNotes = {
      nominal: 'All connected rails nominal. Advance one gate at a time and log each pass.',
      brownout:
        'Symptom: Controller resets when servo/motors start → Isolate: unplug servo/motors (return to Gate 3). Cause: shared 5V rail brownout; feed actuators from a separate regulated supply with common GND.',
      polarity:
        'Symptom: Left wheel spins backward on Forward command → Isolate: test on blocks at Gate 5. Cause: left motor driver phase wires swapped.',
      echo:
        'Symptom: Ultrasonic sensor stuck at 0 cm → Isolate: test sensor alone at Gate 4. Cause: Trig/Echo pins swapped or bracket lip blocking the acoustic cone.',
      bind:
        'Symptom: Servo buzzes and warms up at rest → Isolate: disconnect horn linkage at Gate 5. Cause: horn pressed on off-center, driving against a hard stop.'
    };

    $('#rb-integration-count').innerHTML =
      `<strong>${done} of ${checks.length} gates passed</strong><br>` +
      `<span class="${fault === 'nominal' ? 'rb-ok' : 'rb-warn'}">${faultNotes[fault]}</span>`;

    drawIntegrationCanvas();
    updateSpecTable();
  }

  function drawIntegrationCanvas() {
    const canvas = $('#rb-integration-canvas');
    if (!canvas) return;
    const W = 620;
    const H = 270;
    const ctx = prepareCanvas(canvas, W, H);
    const { done, total, fault } = state.integration;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f181c';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText(`LAYERED SYSTEM ARCHITECTURE (${done}/${total} GATES PASSED)`, 22, 24);

    const blocks = [
      { id: 'batt', label: '1. Battery + Switch', sub: '7.4V pack', x: 24, y: 58, w: 125, h: 64, gate: 2 },
      { id: 'ctrl', label: '2. Controller Logic', sub: 'UNO 5V + GND', x: 185, y: 58, w: 135, h: 64, gate: 3 },
      { id: 'sens', label: '3. Ultrasonic Sensor', sub: 'Trig / Echo', x: 365, y: 42, w: 225, h: 48, gate: 4 },
      { id: 'drv', label: '4. Drive + H-Bridge', sub: 'Raised wheels', x: 365, y: 104, w: 225, h: 48, gate: 5 },
      { id: 'srv', label: '5. Servo Mechanism', sub: 'Separate 5V + GND', x: 365, y: 166, w: 225, h: 48, gate: 6 }
    ];

    const faultMap = {
      nominal: null,
      brownout: 'srv',
      polarity: 'drv',
      echo: 'sens',
      bind: 'srv'
    };
    const faultyId = faultMap[fault];

    // Wires
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#b95832';
    ctx.beginPath();
    ctx.moveTo(149, 90);
    ctx.lineTo(185, 90);
    ctx.stroke();

    [
      [320, 75, 365, 66, '#147a9b'],
      [320, 90, 365, 128, '#b95832'],
      [320, 105, 365, 190, '#b95832']
    ].forEach(([x0, y0, x1, y1, col]) => {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    });

    blocks.forEach((b) => {
      const isFault = b.id === faultyId;
      const isPassed = done >= b.gate;
      ctx.fillStyle = isFault ? '#4a1e18' : isPassed ? '#1d3932' : '#1b2930';
      ctx.strokeStyle = isFault ? '#ff7b6b' : isPassed ? '#90e2b7' : '#59727d';
      ctx.lineWidth = isFault ? 3 : 2;
      roundRect(ctx, b.x, b.y, b.w, b.h, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 12px "IBM Plex Sans", sans-serif';
      ctx.fillText(b.label, b.x + 10, b.y + 22);
      ctx.fillStyle = isFault ? '#ffd66f' : '#b9c2c1';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText(isFault ? '⚠ FAULT ISOLATED HERE' : b.sub, b.x + 10, b.y + 40);
    });

    const railV = fault === 'brownout' ? '3.6V (SAG!)' : '5.0V NOMINAL';
    ctx.fillStyle = fault === 'brownout' ? '#ff7b6b' : '#90e2b7';
    ctx.font = '700 11px "IBM Plex Mono", monospace';
    ctx.fillText(`Logic 5V Rail: ${railV}`, 24, H - 16);
  }

  /* ── MISSION 07: END-EFFECTOR 3-TRIAL ARENA ────────────────────── */
  function effector() {
    const type = $('[data-rb="effector"]').value;
    const reach = +$('[data-rb="reach"]').value;
    const jaw = +$('[data-rb="jaw"]').value;
    const offsetInput = $('[data-rb="offset"]');
    const offset = offsetInput ? +offsetInput.value : 0;

    $('#rb-reach').textContent = reach;
    $('#rb-jaw').textContent = jaw;
    if ($('#rb-offset')) $('#rb-offset').textContent = offset;

    // Evaluate 3 trials with realistic placement/heading jitter (-4, 0, +4 mm)
    const jitters = [-4, 0, 4];
    const results = jitters.map((j) => {
      const err = Math.abs(offset + j);
      const reachOk = reach >= 95;
      if (!reachOk) return { ok: false, why: 'short of 100 mm line' };
      if (type === 'grip') {
        if (jaw < 42) return { ok: false, why: 'jaw < 42 mm cannot clear 40 mm ball' };
        if (err > (jaw - 36) * 0.75) return { ok: false, why: 'lateral offset hit finger tip' };
        return { ok: true, why: 'captured & carried across goal' };
      }
      if (type === 'scoop') {
        if (jaw < 38) return { ok: false, why: 'scoop narrower than 40 mm ball' };
        if (err > jaw * 0.45) return { ok: false, why: 'missed side lip of scoop' };
        return { ok: true, why: 'cradled & lifted into goal' };
      }
      // push arm
      if (err > jaw * 0.55) return { ok: false, why: 'glanced off edge of push bar' };
      return { ok: true, why: 'pushed cleanly across goal line' };
    });

    const passes = results.filter((r) => r.ok).length;
    state.effector = { type, reach, jaw, offset, passes, results, trialAnim: state.effector.trialAnim || 1 };

    const toolName = type === 'grip' ? 'Gripper' : type === 'push' ? 'Push arm' : 'Scoop';
    const fit =
      type === 'grip'
        ? jaw >= 40
          ? 'jaw opening can surround a 40 mm ball'
          : 'jaw is too narrow for a standard 40 mm ping-pong ball'
        : 'tool does not need to surround the ball';

    $('#rb-effector-readout').innerHTML =
      `${toolName} · ${reach} mm reach · ${jaw} mm width · ${offset} mm offset · ${fit}.<br>` +
      `<strong class="${passes >= 2 ? 'rb-ok' : 'rb-warn'}">3-Trial Score: ${passes}/3 passed (${results[0].why}).</strong>`;

    drawEffectorCanvas();
    updateSpecTable();
  }

  function drawEffectorCanvas() {
    const canvas = $('#rb-effector-canvas');
    if (!canvas) return;
    const W = 620;
    const H = 290;
    const ctx = prepareCanvas(canvas, W, H);
    const { type, reach, jaw, offset, passes, results = [] } = state.effector;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f181c';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 12px "IBM Plex Mono", monospace';
    ctx.fillText('100 mm START-TO-BALL ARENA (40 mm PING-PONG BALL)', 22, 24);

    const startX = 115;
    const ballStartX = startX + 100 * 1.9;
    const goalX = startX + 165 * 1.9;
    const midY = 152;

    // Start line, 100 mm ball line, and Goal zone
    ctx.strokeStyle = '#57c7e8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, 46);
    ctx.lineTo(startX, H - 38);
    ctx.moveTo(ballStartX, 46);
    ctx.lineTo(ballStartX, H - 38);
    ctx.stroke();

    ctx.fillStyle = 'rgba(57, 116, 90, 0.25)';
    ctx.fillRect(goalX, 46, 75, H - 84);
    ctx.strokeStyle = '#90e2b7';
    ctx.setLineDash([]);
    ctx.strokeRect(goalX, 46, 75, H - 84);

    ctx.fillStyle = '#b9c2c1';
    ctx.font = '600 10px "IBM Plex Mono", monospace';
    ctx.fillText('START (0 mm)', startX - 28, H - 22);
    ctx.fillText('BALL (100 mm)', ballStartX - 36, H - 22);
    ctx.fillStyle = '#90e2b7';
    ctx.fillText('GOAL ZONE', goalX + 8, H - 22);

    // Robot nose at startX
    ctx.fillStyle = '#203640';
    ctx.strokeStyle = '#f2bd3f';
    ctx.lineWidth = 3;
    roundRect(ctx, 24, midY - 48, startX - 24, 96, 10);
    ctx.fill();
    ctx.stroke();

    // End-effector extending by reach
    const reachPx = reach * 1.9;
    const jawPx = jaw * 1.35;
    const tipX = startX + reachPx;

    ctx.strokeStyle = '#147a9b';
    ctx.fillStyle = '#147a9b';
    ctx.lineWidth = 6;
    if (type === 'push') {
      ctx.beginPath();
      ctx.moveTo(startX, midY);
      ctx.lineTo(tipX, midY);
      ctx.moveTo(tipX, midY - jawPx / 2);
      ctx.lineTo(tipX, midY + jawPx / 2);
      ctx.stroke();
    } else if (type === 'scoop') {
      ctx.fillStyle = 'rgba(20, 122, 155, 0.35)';
      roundRect(ctx, tipX - 38, midY - jawPx / 2, 42, jawPx, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      // Gripper fingers
      ctx.beginPath();
      ctx.moveTo(startX, midY);
      ctx.lineTo(tipX - 34, midY);
      ctx.moveTo(tipX - 34, midY - jawPx / 2);
      ctx.lineTo(tipX + 8, midY - jawPx / 2);
      ctx.moveTo(tipX - 34, midY + jawPx / 2);
      ctx.lineTo(tipX + 8, midY + jawPx / 2);
      ctx.stroke();
    }

    // 3 trial balls showing pass/fail
    const jitters = [-4, 0, 4];
    jitters.forEach((j, idx) => {
      const ok = results[idx]?.ok;
      const by = midY + (offset + j) * 1.35;
      const bx = ok ? goalX + 34 : ballStartX + (reach >= 95 ? 24 : 0);

      // Ghost at 100 mm start position
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ballStartX, by, 24, 0, Math.PI * 2);
      ctx.stroke();

      if (idx === 1) {
        ctx.fillStyle = '#f8f7f1';
        ctx.strokeStyle = ok ? '#39745a' : '#b95832';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bx, by, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    ctx.fillStyle = passes >= 2 ? '#90e2b7' : '#ffd66f';
    ctx.font = '700 11px "IBM Plex Mono", monospace';
    ctx.fillText(`3-Trial Requirement (≥ 2/3): ${passes}/3 PASSED`, 22, H - 6);
  }

  /* ── MISSION 08: BUILD RECORD & LIVE SPEC TABLE ────────────────── */
  function updateSpecTable() {
    const tbody = $('#rb-spec-body');
    if (!tbody) return;
    const rows = [
      [
        '01 · Chassis',
        `${state.chassis.l} × ${state.chassis.w} mm, ${state.chassis.clear} mm clearance`,
        state.chassis.ok ? 'PASS (fits 150 mm box & stable CoM)' : 'REVISE (check footprint/clearance)'
      ],
      [
        '02 · Print plan',
        `${state.printing.layer.toFixed(2)} mm layer, ${state.printing.walls} walls, ${state.printing.infill}% (${state.printing.orient})`,
        `~${state.printing.minutes} min · ${state.printing.grams} g PLA`
      ],
      [
        '03 · 3D-pen mount',
        `${state.pen.joint} joint @ ${state.pen.force.toFixed(1)} N push`,
        `${state.pen.deflectionDeg}° tilt (${state.pen.pass ? 'PASS' : 'REINFORCE'})`
      ],
      [
        '04 · Mechanism',
        `${state.gears.driver}T → ${state.gears.driven}T (${state.gears.ratio.toFixed(2)}:1)`,
        state.gears.climbs ? 'PASS (climbs load)' : 'STALL RISK'
      ],
      [
        '05 · Servo axis',
        `${state.servo.angle}° pose, ${state.servo.arm} mm arm, ${state.servo.load} g`,
        `${state.servo.momentNm.toFixed(3)} N·m (${state.servo.safe ? 'SAFE' : 'LIMIT WARNING'})`
      ],
      [
        '06 · Integration',
        `${state.integration.done}/${state.integration.total} bring-up gates checked`,
        state.integration.fault === 'nominal' ? 'Nominal rails' : `Active drill: ${state.integration.fault}`
      ],
      [
        '07 · End-effector',
        `${state.effector.type}, ${state.effector.reach} mm reach, ${state.effector.jaw} mm jaw`,
        `${state.effector.passes}/3 controlled trials passed`
      ]
    ];

    tbody.innerHTML = rows
      .map(
        ([sub, spec, status]) =>
          `<tr><td><strong>${sub}</strong></td><td>${spec}</td><td>${status}</td></tr>`
      )
      .join('');
  }

  function documentBuild() {
    const name = $('[data-rb="robot-name"]').value.trim() || 'Our robot';
    const job = $('[data-rb="robot-job"]').value.trim() || 'a defined task';
    const change = $('[data-rb="robot-change"]').value.trim() || 'the next tested improvement';

    $('#rb-summary').textContent =
      `${name} (${state.chassis.l} × ${state.chassis.w} mm footprint, ${state.chassis.clear} mm clearance) was designed to ${job}. ` +
      `We arranged the chassis so the wheels, battery, controller, sensors, and ${state.effector.type} end-effector (${state.effector.reach} mm reach, ${state.effector.jaw} mm opening) could be mounted securely and serviced. ` +
      `Our drivetrain uses a ${state.gears.ratio.toFixed(2)}:1 gear ratio (${state.gears.driver}T driving ${state.gears.driven}T) and a servo load moment of ${state.servo.momentNm.toFixed(3)} N·m. ` +
      `During staged integration (${state.integration.done}/${state.integration.total} gates verified) and three-trial testing (${state.effector.passes}/3 passed), we recorded what happened instead of changing several variables at once. ` +
      `If we built another version, we would ${change}.`;

    updateSpecTable();
  }

  /* ── QUIZ HANDLER ──────────────────────────────────────────────── */
  function initQuiz() {
    $$('.rb-question').forEach((q) => {
      const answer = q.dataset.answer;
      const explanation = q.dataset.explanation || '';
      const feedback = $('.rb-feedback', q);
      $$('.rb-option', q).forEach((btn) => {
        btn.addEventListener('click', () => {
          $$('.rb-option', q).forEach((b) => {
            b.classList.remove('is-correct', 'is-wrong');
          });
          const correct = btn.dataset.choice === answer;
          btn.classList.add(correct ? 'is-correct' : 'is-wrong');
          if (feedback) {
            feedback.textContent = (correct ? 'Correct — ' : 'Try again — ') + explanation;
          }
        });
      });
    });
  }

  /* ── EVENT WIRING & PRESETS ────────────────────────────────────── */
  const handlers = {
    length: chassis,
    width: chassis,
    clearance: chassis,
    'batt-pos': chassis,
    layer: printPlan,
    walls: printPlan,
    infill: printPlan,
    orientation: printPlan,
    'slice-pct': printPlan,
    'pen-force': joints,
    driver: gears,
    driven: gears,
    'mech-task': gears,
    angle: servo,
    arm: servo,
    load: servo,
    'fault-scenario': integration,
    reach: effector,
    jaw: effector,
    offset: effector,
    effector: effector,
    'robot-name': documentBuild,
    'robot-job': documentBuild,
    'robot-change': documentBuild
  };

  $$('[data-rb]').forEach((el) => {
    const fn = handlers[el.dataset.rb];
    if (!fn) return;
    el.addEventListener('input', fn);
    el.addEventListener('change', fn);
  });

  $$('[data-joint]').forEach((b) =>
    b.addEventListener('click', () => {
      $$('[data-joint]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      joints();
    })
  );

  // Chassis presets
  const chassisPresets = {
    balanced: { length: 140, width: 120, clearance: 10, 'batt-pos': 50 },
    compact: { length: 115, width: 105, clearance: 12, 'batt-pos': 48 },
    rearheavy: { length: 140, width: 120, clearance: 10, 'batt-pos': 20 },
    oversize: { length: 168, width: 140, clearance: 6, 'batt-pos': 50 }
  };
  $$('[data-chassis-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = chassisPresets[btn.dataset.chassisPreset];
      if (!p) return;
      Object.entries(p).forEach(([k, v]) => {
        const input = $(`[data-rb="${k}"]`);
        if (input) input.value = v;
      });
      chassis();
    });
  });

  // Slicer presets
  const printPresets = {
    draft: { layer: 0.28, walls: 2, infill: 15, orientation: 'flat' },
    structural: { layer: 0.2, walls: 4, infill: 30, orientation: 'flat' },
    overkill: { layer: 0.12, walls: 5, infill: 55, orientation: 'tilted' }
  };
  $$('[data-print-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = printPresets[btn.dataset.printPreset];
      if (!p) return;
      Object.entries(p).forEach(([k, v]) => {
        const input = $(`[data-rb="${k}"]`);
        if (input) input.value = v;
      });
      printPlan();
    });
  });

  // Gear presets
  const gearPresets = {
    overdrive: { driver: 24, driven: 12 },
    direct: { driver: 20, driven: 20 },
    climber: { driver: 12, driven: 36 },
    winch: { driver: 10, driven: 50 }
  };
  $$('[data-gear-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = gearPresets[btn.dataset.gearPreset];
      if (!p) return;
      $('[data-rb="driver"]').value = p.driver;
      $('[data-rb="driven"]').value = p.driven;
      gears();
    });
  });

  // Servo pose presets
  $$('[data-servo-pose]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const angleInput = $('[data-rb="angle"]');
      if (angleInput) {
        angleInput.value = btn.dataset.servoPose;
        servo();
      }
    });
  });

  // End-effector trial button
  const runTrialsBtn = $('#rb-run-trials');
  if (runTrialsBtn) {
    runTrialsBtn.addEventListener('click', () => {
      effector();
    });
  }

  $$('#rb-integration input').forEach((x) => x.addEventListener('change', integration));
  $('#rb-make-summary').addEventListener('click', documentBuild);

  // Initial render
  chassis();
  printPlan();
  joints();
  gears();
  servo();
  integration();
  effector();
  documentBuild();
  initQuiz();

  // Gentle animation loop for the meshing gear train (Mission 04)
  if (!reducedMotion && window.SimKit && typeof window.SimKit.loop === 'function') {
    window.SimKit.loop((dt) => {
      gearPhase += dt * 1.8;
      drawGearCanvas();
    }, { el: SimKit.stage('#rb-chassis-canvas') });
  }
})();
