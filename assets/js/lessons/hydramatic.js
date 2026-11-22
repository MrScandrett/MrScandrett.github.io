/* Hydra-Matic lesson UI: draws and drives the three labs. All physics is in hydramatic-engine.js. */
(function () {
  'use strict';
  var H = window.HydraMaticEngine;
  if (!H) return;

  var TAU = Math.PI * 2;
  var C = {
    eng: '#ff9a3c', turb: '#5cc8f0', band: '#d9534f', clutch: '#58b36f', ink: '#e8eef4', dim: '#7f8fa0',
    bg: '#161b22', panel: '#202833', grid: 'rgba(232,238,244,.12)', brass: '#d9a23a', steel: '#8fa3b7', metal: '#3a4757'
  };
  var GEAR_COLORS = ['#58b36f', '#5cc8f0', '#d9a23a', '#c07be0'];
  var MONO = 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  // Canvas drawn in fixed logical units (the width/height attributes); the backing store follows devicePixelRatio.
  function setup(canvas) {
    var W = canvas.width, Hh = canvas.height;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(Hh * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, W: W, H: Hh, canvas: canvas };
  }

  function text(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.weight || 600) + ' ' + (o.size || 12) + 'px ' + MONO;
    ctx.fillStyle = o.color || C.ink;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(s, x, y);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ======================= Dashboard ======================= */

  var A0 = 0.75 * Math.PI, A1 = 2.25 * Math.PI;

  function dialAngle(v, min, max) { return A0 + clamp((v - min) / (max - min), 0, 1) * (A1 - A0); }

  function drawDial(ctx, cx, cy, r, o) {
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, TAU); ctx.fillStyle = '#10151b'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#3b4757'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = C.panel; ctx.fill();
    if (o.redFrom != null) {
      ctx.beginPath(); ctx.arc(cx, cy, r - 6, dialAngle(o.redFrom, o.min, o.max), A1);
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(217,83,79,.85)'; ctx.stroke();
    }
    ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink;
    for (var v = o.min; v <= o.max + 1e-6; v += o.minor) {
      var major = Math.abs(v / o.major - Math.round(v / o.major)) < 1e-6;
      var a = dialAngle(v, o.min, o.max), c = Math.cos(a), s = Math.sin(a);
      var r1 = r - 3, r0 = r - (major ? 16 : 9);
      ctx.beginPath(); ctx.moveTo(cx + c * r0, cy + s * r0); ctx.lineTo(cx + c * r1, cy + s * r1);
      ctx.lineWidth = major ? 2.4 : 1.2; ctx.strokeStyle = major ? C.ink : C.dim; ctx.stroke();
      if (major) text(ctx, o.label(v), cx + c * (r - 29), cy + s * (r - 29), { align: 'center', base: 'middle', size: 11 });
    }
    text(ctx, o.title, cx, cy + 66, { align: 'center', size: 10.5, color: C.dim });
  }

  function needle(ctx, cx, cy, len, ang, color, w) {
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(ang) * 10, cy - Math.sin(ang) * 10);
    ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
  }

  function drawBar(ctx, x, y, w, h, value, max, color, label, valueText) {
    text(ctx, label, x, y - 6, { size: 10, color: C.dim });
    text(ctx, valueText, x + w, y - 6, { size: 10, align: 'right', color: C.ink });
    ctx.fillStyle = '#10151b'; roundRect(ctx, x, y, w, h, 4); ctx.fill();
    ctx.fillStyle = color; roundRect(ctx, x, y, Math.max(2, w * clamp(value / max, 0, 1)), h, 4); ctx.fill();
  }

  function drawDash(g, S, snap) {
    var ctx = g.ctx;
    ctx.clearRect(0, 0, g.W, g.H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);

    // speedometer
    drawDial(ctx, 112, 116, 88, { min: 0, max: 100, major: 20, minor: 10, label: function (v) { return v; }, title: 'ROAD SPEED, MPH' });
    needle(ctx, 112, 116, 72, dialAngle(Math.abs(snap.mph), 0, 100), C.ink, 3);
    text(ctx, fmt(Math.abs(snap.mph), 0), 112, 156, { align: 'center', size: 22, weight: 800 });

    // tachometer: orange = engine (pump), blue = turbine
    var tx = 322, ty = 116, tr = 88;
    drawDial(ctx, tx, ty, tr, { min: 0, max: 5000, major: 1000, minor: 500, redFrom: 4400, label: function (v) { return v / 1000; }, title: 'RPM x 1000' });
    var ae = dialAngle(snap.engineRpm, 0, 5000), at = dialAngle(snap.turbineRpm, 0, 5000);
    if (snap.ratio) {   // the slip wedge: the lost revolutions
      ctx.beginPath(); ctx.arc(tx, ty, tr - 44, Math.min(ae, at), Math.max(ae, at));
      ctx.lineWidth = 8; ctx.strokeStyle = snap.engineRpm >= snap.turbineRpm ? 'rgba(255,154,60,.55)' : 'rgba(92,200,240,.55)'; ctx.stroke();
    }
    needle(ctx, tx, ty, 70, at, C.turb, 3);
    needle(ctx, tx, ty, 78, ae, C.eng, 3);
    ctx.beginPath(); ctx.arc(tx, ty, 6, 0, TAU); ctx.fillStyle = '#10151b'; ctx.fill();
    text(ctx, 'eng ' + fmt(snap.engineRpm), tx, ty + 34, { align: 'center', size: 10.5, color: C.eng });
    text(ctx, 'turb ' + fmt(snap.turbineRpm), tx, ty + 48, { align: 'center', size: 10.5, color: C.turb });

    // gear lamps
    var gx = 452, gy = 22;
    text(ctx, 'GEAR', gx + 30, gy - 6, { align: 'center', size: 10, color: C.dim });
    var inDrive = S.drive === 'D';
    for (var n = 4; n >= 1; n--) {
      var y = gy + (4 - n) * 34;
      var on = inDrive && snap.gear === n;
      var leaving = inDrive && snap.shifting && S.prevGear === n;
      var pulse = snap.shifting && on ? 0.55 + 0.45 * Math.sin(snap.shiftProgress * Math.PI * 4) : 1;
      ctx.fillStyle = on ? GEAR_COLORS[n - 1] : (leaving ? 'rgba(232,238,244,.28)' : '#232c37');
      ctx.globalAlpha = on ? pulse : 1;
      roundRect(ctx, gx, y, 60, 28, 6); ctx.fill(); ctx.globalAlpha = 1;
      text(ctx, String(n), gx + 30, y + 15, { align: 'center', base: 'middle', size: 16, weight: 800, color: on ? '#101418' : C.dim });
    }
    ctx.fillStyle = !inDrive ? C.brass : '#232c37'; roundRect(ctx, gx, gy + 140, 60, 28, 6); ctx.fill();
    text(ctx, 'N', gx + 30, gy + 155, { align: 'center', base: 'middle', size: 16, weight: 800, color: !inDrive ? '#101418' : C.dim });
    text(ctx, inDrive ? fmt(snap.ratio, 2) + ' : 1' : 'no drive', gx + 30, gy + 188, { align: 'center', size: 12, weight: 700 });
    if (snap.shifting && inDrive) text(ctx, 'SHIFTING', gx + 30, gy + 204, { align: 'center', size: 10, color: C.eng });

    // the hydraulic argument
    var bx = 548, bw = 196;
    text(ctx, 'THE HYDRAULIC ARGUMENT', bx, 14, { size: 10, color: C.dim });
    var gov = snap.governor, hold = null, holdDown = null;
    if (inDrive && !S.hold && snap.gear < 4) hold = H.upshiftPsi(snap.gear, S.thr);
    if (inDrive && !S.hold && snap.gear > 1) holdDown = H.downshiftPsi(snap.gear - 1, S.thr);
    var max = 10;
    drawBar(ctx, bx, 40, bw, 16, Math.min(gov, max), max, C.turb, 'governor (speed)', fmt(gov, 1) + ' psi');
    drawBar(ctx, bx, 84, bw, 16, hold == null ? 0 : hold, max, C.eng, 'spring + throttle', hold == null ? (S.hold ? 'gear held' : 'top gear') : fmt(hold, 1) + ' psi');
    if (hold != null) {   // trip mark on the governor bar
      var mx = bx + bw * clamp(hold / max, 0, 1);
      ctx.strokeStyle = C.eng; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, 36); ctx.lineTo(mx, 60); ctx.stroke();
    }
    if (holdDown != null) {
      var dx = bx + bw * clamp(holdDown / max, 0, 1);
      ctx.strokeStyle = C.dim; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(dx, 36); ctx.lineTo(dx, 60); ctx.stroke(); ctx.setLineDash([]);
    }
    drawBar(ctx, bx, 128, bw, 16, snap.throttle, 10, '#c8903a', 'throttle pedal pressure', fmt(snap.throttle, 1) + ' psi');
    var msg = !inDrive ? 'Neutral: no gear engaged.' : S.hold ? 'Gear held by the driver.' : snap.gear >= 4 ? 'Top gear: no valve left.' :
      gov > hold ? 'Governor wins: ' + snap.gear + '→' + (snap.gear + 1) + ' moves.' : 'Spring + throttle hold it.';
    text(ctx, msg, bx, 168, { size: 10.5, color: C.ink });
    text(ctx, 'solid: trips up · dashed: drops', bx, 184, { size: 9.5, color: C.dim });

    // slip strip
    ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(14, 232); ctx.lineTo(g.W - 14, 232); ctx.stroke();
    text(ctx, 'Coupling slip ' + fmt(Math.max(0, snap.slip) * 100, 1) + '%', 20, 256, { size: 12 });
    text(ctx, 'Heat in the oil ' + fmt(snap.lossKw, 1) + ' kW', 210, 256, { size: 12, color: C.eng });
    text(ctx, 'Torque through coupling ' + fmt(snap.coupTorque, 0) + ' N·m', 420, 256, { size: 12 });
    text(ctx, 'Acceleration ' + fmt(snap.accel / 9.80665, 2) + ' g', 20, 280, { size: 12, color: C.dim });
    text(ctx, 'Grade ' + (S.grade > 0 ? '+' : '') + S.grade + '%', 210, 280, { size: 12, color: C.dim });
    text(ctx, 'Pedal ' + Math.round(S.thr * 100) + '%   Brake ' + Math.round(S.brake * 100) + '%', 420, 280, { size: 12, color: C.dim });
  }

  /* ======================= Shift map ======================= */

  var MAP = { x0: 62, x1: 736, y0: 212, y1: 28, maxMph: 90 };
  function mapX(mph) { return MAP.x0 + (MAP.x1 - MAP.x0) * clamp(mph / MAP.maxMph, 0, 1); }
  function mapY(thr) { return MAP.y0 + (MAP.y1 - MAP.y0) * clamp(thr, 0, 1); }

  function drawMap(g, S, snap, curves) {
    var ctx = g.ctx, i, k;
    ctx.clearRect(0, 0, g.W, g.H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);
    // gear zones between the upshift curves
    for (k = 0; k < 4; k++) {
      ctx.beginPath();
      var right = k < 3 ? curves[k].up : null, left = k > 0 ? curves[k - 1].up : null;
      if (right) { for (i = 0; i < right.length; i++) ctx[i ? 'lineTo' : 'moveTo'](mapX(right[i].mph), mapY(right[i].thr)); }
      else { ctx.moveTo(mapX(MAP.maxMph), mapY(0)); ctx.lineTo(mapX(MAP.maxMph), mapY(1)); }
      if (left) { for (i = left.length - 1; i >= 0; i--) ctx.lineTo(mapX(left[i].mph), mapY(left[i].thr)); }
      else { ctx.lineTo(mapX(0), mapY(1)); ctx.lineTo(mapX(0), mapY(0)); }
      ctx.closePath();
      ctx.fillStyle = GEAR_COLORS[k]; ctx.globalAlpha = (S.drive === 'D' && snap.gear === k + 1) ? 0.28 : 0.1; ctx.fill(); ctx.globalAlpha = 1;
    }
    // grid + axes
    ctx.lineWidth = 1; ctx.strokeStyle = C.grid; ctx.fillStyle = C.dim;
    for (var m = 0; m <= MAP.maxMph; m += 10) {
      ctx.beginPath(); ctx.moveTo(mapX(m), MAP.y1); ctx.lineTo(mapX(m), MAP.y0); ctx.stroke();
      text(ctx, String(m), mapX(m), MAP.y0 + 15, { size: 10, align: 'center', color: C.dim });
    }
    for (var t = 0; t <= 1.001; t += 0.25) {
      ctx.beginPath(); ctx.moveTo(MAP.x0, mapY(t)); ctx.lineTo(MAP.x1, mapY(t)); ctx.stroke();
      text(ctx, Math.round(t * 100) + '%', MAP.x0 - 8, mapY(t) + 3, { size: 10, align: 'right', color: C.dim });
    }
    text(ctx, 'road speed (mph)', (MAP.x0 + MAP.x1) / 2, MAP.y0 + 31, { size: 10.5, align: 'center', color: C.dim });
    ctx.save(); ctx.translate(14, (MAP.y0 + MAP.y1) / 2); ctx.rotate(-Math.PI / 2);
    text(ctx, 'accelerator pedal', 0, 0, { size: 10.5, align: 'center', color: C.dim }); ctx.restore();
    // curves
    for (k = 0; k < 3; k++) {
      var cv = curves[k], col = GEAR_COLORS[k + 1];
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.setLineDash([]);
      ctx.beginPath(); for (i = 0; i < cv.up.length; i++) ctx[i ? 'lineTo' : 'moveTo'](mapX(cv.up[i].mph), mapY(cv.up[i].thr)); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]);
      ctx.beginPath(); for (i = 0; i < cv.down.length; i++) ctx[i ? 'lineTo' : 'moveTo'](mapX(cv.down[i].mph), mapY(cv.down[i].thr)); ctx.stroke();
      ctx.setLineDash([]);
      var lab = cv.up[16];
      text(ctx, cv.from + '→' + cv.to, mapX(lab.mph) - 5, mapY(lab.thr) - 4, { size: 10, color: col, align: 'right' });
    }
    // zone labels along the bottom
    var zc = [mapX(15) - 20, mapX(24), mapX(39), mapX(68)];
    for (k = 0; k < 4; k++) text(ctx, k === 0 ? '1st' : k === 1 ? '2nd' : k === 2 ? '3rd' : '4th gear', zc[k], mapY(0.92), { size: 11, align: 'center', weight: 700, color: GEAR_COLORS[k] });
    // trail and dot
    var trail = S.trail;
    ctx.lineWidth = 2;
    for (i = 1; i < trail.length; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (i / trail.length * 0.5).toFixed(2) + ')';
      ctx.beginPath(); ctx.moveTo(mapX(trail[i - 1].mph), mapY(trail[i - 1].thr)); ctx.lineTo(mapX(trail[i].mph), mapY(trail[i].thr)); ctx.stroke();
    }
    var px = mapX(Math.abs(snap.mph)), py = mapY(S.thr);
    ctx.beginPath(); ctx.arc(px, py, 7, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = GEAR_COLORS[snap.gear - 1]; ctx.stroke();
    text(ctx, 'SHIFT MAP   solid: upshift   dashed: downshift', MAP.x0, 11, { size: 10, color: C.dim });
  }

  /* ======================= Planetary drawing (shared) ======================= */

  // a = { sun, ring, carrier, spin } angles in radians (clockwise positive on screen)
  function drawPlanetary(ctx, cx, cy, set, k, a, st) {
    var S = set.S, R = set.R, P = H.planetTeeth(set), i;
    var rs = S * k, rp = P * k, rr = R * k, orbit = (S + P) * k;
    // ring
    ctx.beginPath(); ctx.arc(cx, cy, rr + 7, 0, TAU); ctx.lineWidth = 14; ctx.strokeStyle = C.metal; ctx.stroke();
    ctx.lineWidth = 1.4; ctx.strokeStyle = C.steel; ctx.beginPath();
    for (i = 0; i < R; i++) { var ar = a.ring + i * TAU / R; ctx.moveTo(cx + Math.cos(ar) * rr, cy + Math.sin(ar) * rr); ctx.lineTo(cx + Math.cos(ar) * (rr - 4.5), cy + Math.sin(ar) * (rr - 4.5)); }
    ctx.stroke();
    var rm = a.ring; ctx.fillStyle = C.steel; ctx.beginPath(); ctx.arc(cx + Math.cos(rm) * (rr + 7), cy + Math.sin(rm) * (rr + 7), 3.4, 0, TAU); ctx.fill();
    // sun
    ctx.beginPath(); ctx.arc(cx, cy, rs, 0, TAU); ctx.fillStyle = '#2f3a48'; ctx.fill();
    ctx.strokeStyle = C.steel; ctx.beginPath();
    for (i = 0; i < S; i++) { var as = a.sun + i * TAU / S; ctx.moveTo(cx + Math.cos(as) * rs, cy + Math.sin(as) * rs); ctx.lineTo(cx + Math.cos(as) * (rs + 4.5), cy + Math.sin(as) * (rs + 4.5)); }
    ctx.stroke();
    ctx.fillStyle = C.steel; ctx.beginPath(); ctx.arc(cx + Math.cos(a.sun) * rs * 0.7, cy + Math.sin(a.sun) * rs * 0.7, 3.4, 0, TAU); ctx.fill();
    // carrier arms
    var pos = [];
    for (i = 0; i < 3; i++) { var ac = a.carrier + i * TAU / 3; pos.push([cx + Math.cos(ac) * orbit, cy + Math.sin(ac) * orbit]); }
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(5, rp * 0.5); ctx.strokeStyle = 'rgba(217,162,58,.55)';
    for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pos[i][0], pos[i][1]); ctx.stroke(); }
    ctx.lineCap = 'butt';
    // planets
    for (i = 0; i < 3; i++) {
      var px = pos[i][0], py = pos[i][1];
      ctx.beginPath(); ctx.arc(px, py, rp, 0, TAU); ctx.fillStyle = '#4b5b70'; ctx.fill();
      ctx.strokeStyle = C.steel; ctx.beginPath();
      for (var j = 0; j < P; j++) { var ap = a.spin + j * TAU / P; ctx.moveTo(px + Math.cos(ap) * rp, py + Math.sin(ap) * rp); ctx.lineTo(px + Math.cos(ap) * (rp + 4), py + Math.sin(ap) * (rp + 4)); }
      ctx.stroke();
      ctx.fillStyle = '#e8eef4'; ctx.beginPath(); ctx.arc(px + Math.cos(a.spin) * rp * 0.55, py + Math.sin(a.spin) * rp * 0.55, 2.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU); ctx.fillStyle = C.brass; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(6, rs * 0.28), 0, TAU); ctx.fillStyle = C.brass; ctx.fill();
    // what is held or locked
    if (st && st.held) {
      ctx.lineWidth = 4; ctx.strokeStyle = C.band; ctx.setLineDash([7, 4]);
      ctx.beginPath();
      if (st.held === 'sun') ctx.arc(cx, cy, rs + 8, 0, TAU);
      else if (st.held === 'ring') ctx.arc(cx, cy, rr + 18, 0, TAU);
      else ctx.arc(cx, cy, Math.max(6, rs * 0.28) + 7, 0, TAU);
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (st && st.locked) {
      ctx.lineWidth = 3; ctx.strokeStyle = C.clutch;
      ctx.beginPath(); ctx.arc(cx, cy, rr + 18, 0, TAU); ctx.stroke();
    }
  }

  var VIS = 0.012;   // display radians per real rad/s (so 3,000 rpm turns about 0.6 rev/s on screen)

  function drawBox(g, S, snap) {
    var ctx = g.ctx;
    ctx.clearRect(0, 0, g.W, g.H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);
    var fx = 200, rx = 566, cy = 164;
    var fk = 2.35, rk = 1.9;
    var m = snap.members, holds = m ? m.holds : null;
    // shafts
    ctx.lineWidth = 8; ctx.strokeStyle = '#3b4757';
    ctx.beginPath(); ctx.moveTo(12, cy); ctx.lineTo(fx - 100, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx + 8, cy); ctx.lineTo(rx - 8, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + 8, cy); ctx.lineTo(g.W - 14, cy); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = C.turb; ctx.beginPath(); ctx.moveTo(12, cy); ctx.lineTo(fx - 100, cy); ctx.stroke();
    text(ctx, 'TURBINE IN', 12, cy - 12, { size: 10, color: C.turb });
    text(ctx, fmt(snap.turbineRpm) + ' rpm', 12, cy + 22, { size: 10, color: C.turb });
    text(ctx, 'carrier → sun', (fx + rx) / 2, cy - 12, { size: 10, align: 'center', color: C.dim });
    text(ctx, 'TO WHEELS', g.W - 12, cy - 12, { size: 10, align: 'right', color: C.eng });
    text(ctx, fmt(m ? m.out * H.RPM : 0) + ' rpm', g.W - 12, cy + 22, { size: 11, align: 'right', color: C.eng });

    drawPlanetary(ctx, fx, cy, H.FRONT, fk, S.ang.front, { held: holds && holds.frontBand ? 'sun' : null, locked: holds && holds.frontClutch });
    drawPlanetary(ctx, rx, cy, H.REAR, rk, S.ang.rear, { held: holds && holds.rearBand ? 'ring' : null, locked: holds && holds.rearClutch });

    var fm = m ? m.front : { sun: 0, ring: 0, carrier: 0 }, rm = m ? m.rear : { sun: 0, ring: 0, carrier: 0 };
    function mem(o) { return 'sun ' + fmt(o.sun * H.RPM) + '  ring ' + fmt(o.ring * H.RPM) + '  carrier ' + fmt(o.carrier * H.RPM); }
    var fmode = !holds ? '—' : holds.frontBand ? 'REDUCE  ×1.55  (band holds the sun)' : 'DIRECT  ×1  (clutch locks the set)';
    var rmode = !holds ? '—' : holds.rearBand ? 'REDUCE  ×2.56  (band holds the ring)' : 'DIRECT  ×1  (clutch locks the set)';
    text(ctx, 'FRONT SET', fx, 18, { size: 11, align: 'center', weight: 800 });
    text(ctx, 'REAR SET', rx, 18, { size: 11, align: 'center', weight: 800 });
    text(ctx, fmode, fx, 33, { size: 10, align: 'center', color: holds && holds.frontBand ? C.band : C.clutch });
    text(ctx, rmode, rx, 33, { size: 10, align: 'center', color: holds && holds.rearBand ? C.band : C.clutch });
    text(ctx, mem(fm) + ' rpm', fx, g.H - 10, { size: 10, align: 'center', color: C.dim });
    text(ctx, mem(rm) + ' rpm', rx, g.H - 10, { size: 10, align: 'center', color: C.dim });
    if (!m) {
      ctx.fillStyle = 'rgba(22,27,34,.72)'; ctx.fillRect(0, 0, g.W, g.H);
      text(ctx, 'NEUTRAL: the box is not connected to the wheels', g.W / 2, g.H / 2 + 4, { size: 14, align: 'center', weight: 800, color: C.brass });
    }
  }

  /* ======================= Main sim ======================= */

  function initDrive() {
    var cDash = $('#hm-dash'), cMap = $('#hm-map'), cBox = $('#hm-box');
    if (!cDash || !cMap || !cBox) return;
    var gD = setup(cDash), gM = setup(cMap), gB = setup(cBox);
    var curves = H.shiftCurves(21);
    var inThr = $('#hm-thr'), inBrake = $('#hm-brake'), inGrade = $('#hm-grade');
    var outThr = $('#hm-thr-out'), outBrake = $('#hm-brake-out'), outGrade = $('#hm-grade-out');
    var readout = $('#hm-readout'), live = $('#hm-live'), logEl = $('#hm-log');
    var S = {
      car: H.createCar(), thr: 0, brake: 0, grade: 0, drive: 'D', hold: 0, speed: 1, paused: false,
      trail: [], prevGear: 1, lastGear: 1, rest: true, t0: null, t30: null, t60: null, spaceDown: false,
      ang: { front: { sun: 0, ring: 0, carrier: 0, spin: 0 }, rear: { sun: 0, ring: 0, carrier: 0, spin: 0 } }
    };
    var snap = H.stepCar(S.car, { thr: 0, drive: 'D' }, 1 / 60);
    var logs = [];

    function syncControls() {
      inThr.value = Math.round(S.thr * 100); outThr.textContent = Math.round(S.thr * 100) + '%';
      inBrake.value = Math.round(S.brake * 100); outBrake.textContent = Math.round(S.brake * 100) + '%';
      inGrade.value = S.grade; outGrade.textContent = (S.grade > 0 ? '+' : '') + S.grade + '%';
      $$('[data-hm-drive]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-hm-drive') === S.drive)); });
      $$('[data-hm-hold]').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-hm-hold')) === S.hold)); });
    }

    function resetCar(mph, gear) {
      S.car = H.createCar({ mph: mph || 0, gear: gear || 1 });
      S.trail = []; S.prevGear = gear || 1; S.lastGear = gear || 1; S.t0 = S.t30 = S.t60 = null; S.rest = !mph;
      logs = []; renderLog();
      snap = H.stepCar(S.car, { thr: S.thr, drive: S.drive }, 1 / 240);
    }

    function renderLog() {
      logEl.innerHTML = '';
      if (!logs.length) { var li = document.createElement('li'); li.textContent = 'No shifts yet.'; logEl.appendChild(li); return; }
      logs.slice(0, 8).forEach(function (t) { var li = document.createElement('li'); li.textContent = t; logEl.appendChild(li); });
    }

    var SCN = {
      launch: { mph: 0, gear: 1, thr: 1, grade: 0 },
      cruise: { mph: 45, gear: 4, thr: 0.18, grade: 0 },
      hill: { mph: 40, gear: 4, thr: 0.6, grade: 12 },
      coast: { mph: 55, gear: 4, thr: 0, grade: 0 }
    };
    function scenario(name) {
      var c = SCN[name]; if (!c) return;
      S.thr = c.thr; S.grade = c.grade; S.brake = 0; S.drive = 'D'; S.hold = 0; S.paused = false;
      $('#hm-play').textContent = 'Pause'; $('#hm-play').setAttribute('aria-pressed', 'false');
      syncControls(); resetCar(c.mph, c.gear);
    }

    inThr.addEventListener('input', function () { S.thr = inThr.value / 100; outThr.textContent = inThr.value + '%'; });
    inBrake.addEventListener('input', function () { S.brake = inBrake.value / 100; outBrake.textContent = inBrake.value + '%'; });
    inGrade.addEventListener('input', function () { S.grade = Number(inGrade.value); syncControls(); });
    $('#hm-speed').addEventListener('change', function (e) { S.speed = Number(e.target.value); });
    $$('[data-hm-scn]').forEach(function (b) { b.addEventListener('click', function () { scenario(b.getAttribute('data-hm-scn')); }); });
    $$('[data-hm-drive]').forEach(function (b) { b.addEventListener('click', function () { S.drive = b.getAttribute('data-hm-drive'); syncControls(); }); });
    $$('[data-hm-hold]').forEach(function (b) { b.addEventListener('click', function () { S.hold = Number(b.getAttribute('data-hm-hold')); syncControls(); }); });
    $('#hm-play').addEventListener('click', function (e) {
      S.paused = !S.paused; e.currentTarget.textContent = S.paused ? 'Play' : 'Pause'; e.currentTarget.setAttribute('aria-pressed', String(S.paused));
    });
    $('#hm-reset').addEventListener('click', function () { S.thr = 0; S.brake = 0; S.grade = 0; S.drive = 'D'; S.hold = 0; syncControls(); resetCar(0, 1); });

    cDash.addEventListener('keydown', function (e) {
      var k = e.key, used = true;
      if (k === 'ArrowUp') S.thr = clamp(Math.round(S.thr * 10 + 1) / 10, 0, 1);
      else if (k === 'ArrowDown') S.thr = clamp(Math.round(S.thr * 10 - 1) / 10, 0, 1);
      else if (k === ' ') { S.brake = 1; S.spaceDown = true; }
      else if (k === 'n' || k === 'N') S.drive = 'N';
      else if (k === 'd' || k === 'D') S.drive = 'D';
      else if (k >= '0' && k <= '4') S.hold = Number(k);
      else used = false;
      if (used) { e.preventDefault(); syncControls(); }
    });
    cDash.addEventListener('keyup', function (e) { if (e.key === ' ' && S.spaceDown) { S.spaceDown = false; S.brake = 0; syncControls(); } });

    var readT = 0;
    function frame(dt) {
      if (!S.paused) {
        var h = Math.min(dt, 0.05) * S.speed;
        snap = H.stepCar(S.car, { thr: S.thr, brake: S.brake, grade: S.grade, drive: S.drive, hold: S.hold }, h);
        if (snap.gear !== S.lastGear) {
          S.prevGear = S.lastGear;
          var jump = Math.round(snap.turbineJump / 50) * 50;
          logs.unshift(S.lastGear + '→' + snap.gear + ' at ' + Math.round(Math.abs(snap.mph)) + ' mph, pedal ' + Math.round(S.thr * 100) + '%' +
            (Math.abs(jump) >= 100 ? ', turbine ' + (jump > 0 ? '+' : '') + fmt(jump) + ' rpm' : ''));
          renderLog();
          live.textContent = 'Shifted ' + S.lastGear + ' to ' + snap.gear + ' at ' + Math.round(Math.abs(snap.mph)) + ' miles per hour.';
          S.lastGear = snap.gear;
          $$('#hm-gear-table tr').forEach(function (tr) { tr.classList.toggle('is-on', Number(tr.getAttribute('data-g')) === snap.gear); });
        }
        // 0–30 / 0–60 stopwatch
        if (snap.mph < 0.3) { S.rest = true; S.t0 = S.t30 = S.t60 = null; }
        else if (S.rest && S.t0 === null) S.t0 = S.car.t;
        if (S.t0 !== null && S.t30 === null && snap.mph >= 30) S.t30 = S.car.t - S.t0;
        if (S.t0 !== null && S.t60 === null && snap.mph >= 60) S.t60 = S.car.t - S.t0;
        // gearset angles at their real relative speeds
        var m = snap.members, f = S.ang.front, r = S.ang.rear;
        if (m) {
          f.sun += m.front.sun * VIS * h; f.ring += m.front.ring * VIS * h; f.carrier += m.front.carrier * VIS * h;
          f.spin += H.planetSpin(H.FRONT, m.front.sun, m.front.carrier) * VIS * h;
          r.sun += m.rear.sun * VIS * h; r.ring += m.rear.ring * VIS * h; r.carrier += m.rear.carrier * VIS * h;
          r.spin += H.planetSpin(H.REAR, m.rear.sun, m.rear.carrier) * VIS * h;
        }
        S.trail.push({ mph: Math.abs(snap.mph), thr: S.thr });
        if (S.trail.length > 90) S.trail.shift();
        readT += dt;
      }
      drawDash(gD, S, snap); drawMap(gM, S, snap, curves); drawBox(gB, S, snap);
      if (readT > 0.2) {
        readT = 0;
        var parts = [fmt(Math.abs(snap.mph)) + ' mph', S.drive === 'D' ? 'gear ' + snap.gear + ' (' + fmt(snap.ratio, 2) + ':1)' : 'neutral',
          'engine ' + fmt(snap.engineRpm) + ' rpm', 'turbine ' + fmt(snap.turbineRpm) + ' rpm', 'slip ' + fmt(Math.max(0, snap.slip) * 100, 1) + '%'];
        if (S.t30 !== null) parts.push('0–30 ' + fmt(S.t30, 1) + ' s');
        if (S.t60 !== null) parts.push('0–60 ' + fmt(S.t60, 1) + ' s');
        readout.textContent = parts.join(' · ');
      }
    }

    syncControls(); renderLog();
    $$('#hm-gear-table tr').forEach(function (tr) { tr.classList.toggle('is-on', Number(tr.getAttribute('data-g')) === 1); });
    SimKit.loop(frame, { el: SimKit.stage(cDash, cMap, cBox), maxDt: 0.05 });
    window.__hmSim = { S: S, scenario: scenario, snap: function () { return snap; } };
  }

  /* ======================= Fluid coupling lab ======================= */

  function initCoupling() {
    var cv = $('#hm-cp'); if (!cv) return;
    var g = setup(cv), ctx = g.ctx;
    var inP = $('#hm-cp-p'), inT = $('#hm-cp-t'), oP = $('#hm-cp-p-out'), oT = $('#hm-cp-t-out'), ro = $('#hm-cp-readout');
    var parts = []; for (var i = 0; i < 44; i++) parts.push(i / 44 * TAU);
    var angP = 0, angT = 0, cx = 280, cy = 104, R = 78;

    function vals() { return { p: Number(inP.value), t: Number(inT.value) }; }
    function readout() {
      var v = vals(), wp = v.p / H.RPM, wt = v.t / H.RPM;
      var T = H.couplingTorque(wp, wt), pin = T * wp, pout = T * wt, heat = pin - pout;
      oP.textContent = fmt(v.p) + ' rpm'; oT.textContent = fmt(v.t) + ' rpm';
      ro.textContent = 'Slip ' + fmt(Math.max(0, H.couplingSlip(wp, wt)) * 100, 1) + '% · torque ' + fmt(T, 0) + ' N·m (same on both sides) · power in ' + fmt(pin / 1000, 1) +
        ' kW, out ' + fmt(pout / 1000, 1) + ' kW · heat ' + fmt(heat / 1000, 1) + ' kW' + (T < -1 ? ' · overrun: the wheels drive the engine' : '');
    }
    inP.addEventListener('input', readout); inT.addEventListener('input', readout);
    $$('[data-hm-cp]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-hm-cp');
        if (k === 'stall') { inP.value = 1700; inT.value = 0; }
        if (k === 'cruise') { inP.value = 3000; inT.value = 2910; }
        if (k === 'coast') { inP.value = 800; inT.value = 2400; }
        readout();
      });
    });
    readout();

    SimKit.loop(function (dt) {
      var v = vals(), wp = v.p / H.RPM, wt = v.t / H.RPM;
      var flow = Math.sign(wp * wp - wt * wt) * Math.sqrt(Math.abs(wp * wp - wt * wt)) / (4400 / H.RPM);   // -1..1
      angP += wp * 0.012 * dt * 60; angT += wt * 0.012 * dt * 60;
      var spd = flow * 7;
      for (var i = 0; i < parts.length; i++) parts[i] = (parts[i] + spd * dt + TAU) % TAU;
      ctx.clearRect(0, 0, g.W, g.H); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);
      // the two halves
      ctx.lineWidth = 34;
      ctx.beginPath(); ctx.arc(cx, cy, R - 16, Math.PI / 2, Math.PI * 1.5); ctx.strokeStyle = 'rgba(255,154,60,.28)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R - 16, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = 'rgba(92,200,240,.28)'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = C.steel;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R - 34, 0, TAU); ctx.stroke();
      // vanes
      ctx.lineWidth = 2;
      for (var k = 0; k < 9; k++) {
        var a = Math.PI / 2 + (k + 0.5) * Math.PI / 9;
        ctx.strokeStyle = C.eng; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 33), cy + Math.sin(a) * (R - 33)); ctx.lineTo(cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1)); ctx.stroke();
        var b = -Math.PI / 2 + (k + 0.5) * Math.PI / 9;
        ctx.strokeStyle = C.turb; ctx.beginPath(); ctx.moveTo(cx + Math.cos(b) * (R - 33), cy + Math.sin(b) * (R - 33)); ctx.lineTo(cx + Math.cos(b) * (R - 1), cy + Math.sin(b) * (R - 1)); ctx.stroke();
      }
      // circulating oil (clockwise on screen: up the pump side, down the turbine side)
      for (var j = 0; j < parts.length; j++) {
        var th = parts[j] - Math.PI / 2 + Math.PI;   // 0 = bottom, increasing clockwise
        var px = cx + Math.cos(th - Math.PI / 2) * (R - 17), py = cy + Math.sin(th - Math.PI / 2) * (R - 17);
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, TAU); ctx.fillStyle = px < cx ? C.eng : C.turb; ctx.fill();
      }
      // shafts with spokes
      function shaft(x0, x1, ang, color, label) {
        ctx.lineWidth = 8; ctx.strokeStyle = '#3b4757'; ctx.beginPath(); ctx.moveTo(x0, 214); ctx.lineTo(x1, 214); ctx.stroke();
        var sx = (x0 + x1) / 2; ctx.lineWidth = 2; ctx.strokeStyle = color;
        ctx.beginPath(); ctx.arc(sx, 214, 15, 0, TAU); ctx.stroke();
        for (var s = 0; s < 3; s++) { ctx.beginPath(); ctx.moveTo(sx, 214); ctx.lineTo(sx + Math.cos(ang + s * TAU / 3) * 15, 214 + Math.sin(ang + s * TAU / 3) * 15); ctx.stroke(); }
        text(ctx, label, sx, 236, { size: 10, align: 'center', color: color });
      }
      shaft(40, 200, angP, C.eng, 'ENGINE SHAFT (pump)');
      shaft(360, 520, angT, C.turb, 'GEARBOX SHAFT (turbine)');
      ctx.strokeStyle = C.steel; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - R, cy + 8); ctx.lineTo(120, 214); ctx.moveTo(cx + R, cy + 8); ctx.lineTo(440, 214); ctx.stroke();
      text(ctx, 'oil climbs the pump vanes...', 28, 28, { size: 10.5, color: C.eng });
      text(ctx, '...crosses, pushes the turbine', 548, 28, { size: 10.5, align: 'right', color: C.turb });
      text(ctx, Math.abs(flow) < 0.02 ? 'no net flow: no torque' : (flow > 0 ? 'pump faster: torque forward' : 'turbine faster: torque backward'), cx, 200, { size: 10.5, align: 'center', color: C.ink });
    }, { el: cv, maxDt: 0.05 });
  }

  /* ======================= Planetary lab ======================= */

  var MEMBERS = ['sun', 'ring', 'carrier'];
  var NAMES = { sun: 'Sun', ring: 'Ring', carrier: 'Carrier' };
  var FORMULA = {
    'ring|sun': function (S, R) { return '1 + S/R = 1 + ' + S + '/' + R; },
    'sun|ring': function (S, R) { return '1 + R/S = 1 + ' + R + '/' + S; },
    'carrier|sun': function (S, R) { return 'R/(S+R) = ' + R + '/' + (S + R); },
    'carrier|ring': function (S, R) { return 'S/(S+R) = ' + S + '/' + (S + R); },
    'sun|carrier': function (S, R) { return '−R/S = −' + R + '/' + S; },
    'ring|carrier': function (S, R) { return '−S/R = −' + S + '/' + R; }
  };
  var ARR = [['ring', 'sun', 'carrier'], ['sun', 'ring', 'carrier'], ['carrier', 'sun', 'ring'], ['carrier', 'ring', 'sun'], ['sun', 'carrier', 'ring'], ['ring', 'carrier', 'sun']];

  function kind(r) {
    if (r < -1) return 'Reverse, strong reduction';
    if (r < 0) return 'Reverse, speed-up';
    if (r > 1.0001) return 'Reduction (torque up)';
    return 'Overdrive (speed up)';
  }
  function star(i, h) {
    if (i === 'ring' && h === 'sun') return ' ★ Hydra-Matic front set';
    if (i === 'sun' && h === 'ring') return ' ★ Hydra-Matic rear set';
    return '';
  }

  function initPlanetary() {
    var cv = $('#hm-pl'); if (!cv) return;
    var g = setup(cv), ctx = g.ctx;
    var sIn = $('#hm-pl-in'), sHeld = $('#hm-pl-held'), rS = $('#hm-pl-s'), rP = $('#hm-pl-p');
    var oS = $('#hm-pl-s-out'), oP = $('#hm-pl-p-out'), tR = $('#hm-pl-r'), tOut = $('#hm-pl-out'), ro = $('#hm-pl-readout'), tb = $('#hm-pl-table');
    var ang = { sun: 0, ring: 0, carrier: 0, spin: 0 };
    var state = { set: null, input: 'ring', held: 'sun', output: 'carrier', ratio: 1.55, members: null };

    function update(changed) {
      var inp = sIn.value, held = sHeld.value;
      if (inp === held) {   // the two roles must differ: move the one that did not just change
        var other = MEMBERS.filter(function (m) { return m !== inp; })[0];
        if (changed === 'held') { sIn.value = inp = other; } else { sHeld.value = held = other; }
      }
      var S = Number(rS.value), P = Number(rP.value), R = S + 2 * P;
      var set = { name: 'Lab set', S: S, R: R };
      var out = MEMBERS.filter(function (m) { return m !== inp && m !== held; })[0];
      var ratio = H.planetaryRatio(set, inp, held, out);
      var m = { sun: null, ring: null, carrier: null }; m[inp] = 250; m[held] = 0;
      var solved = H.willis(set, m);
      state = { set: set, input: inp, held: held, output: out, ratio: ratio, members: solved };
      oS.textContent = S; oP.textContent = P; tR.textContent = 'Ring teeth R = S + 2P = ' + R;
      tOut.textContent = 'Output: ' + NAMES[out];
      var f = FORMULA[inp + '|' + held];
      ro.textContent = NAMES[inp] + ' in, ' + NAMES[held].toLowerCase() + ' held, ' + NAMES[out].toLowerCase() + ' out → ratio ' + fmt(ratio, 3) + ' : 1 = ' + f(S, R) + ' · ' + kind(ratio);
      // table of all six
      tb.innerHTML = '';
      ARR.forEach(function (a) {
        var r = H.planetaryRatio(set, a[0], a[1], a[2]);
        var tr = document.createElement('tr');
        if (a[0] === inp && a[1] === held) tr.className = 'is-on';
        tr.innerHTML = '<td>' + NAMES[a[0]] + '</td><td>' + NAMES[a[1]] + '</td><td>' + NAMES[a[2]] + '</td><td class="hm-num">' + fmt(r, 3) + ' : 1</td><td>' + kind(r) + star(a[0], a[1]) + '</td>';
        tb.appendChild(tr);
      });
    }
    sIn.addEventListener('change', function () { update('in'); });
    sHeld.addEventListener('change', function () { update('held'); });
    rS.addEventListener('input', function () { update(); }); rP.addEventListener('input', function () { update(); });
    update();

    SimKit.loop(function (dt) {
      var st = state, set = st.set, m = st.members;
      ang.sun += m.sun * VIS * dt; ang.ring += m.ring * VIS * dt; ang.carrier += m.carrier * VIS * dt;
      ang.spin += H.planetSpin(set, m.sun, m.carrier) * VIS * dt;
      ctx.clearRect(0, 0, g.W, g.H); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);
      var k = Math.min(3.4, 118 / set.R);
      var cx = 280, cy = 166;
      drawPlanetary(ctx, cx, cy, set, k, ang, { held: st.held });
      var rr = set.R * k;
      text(ctx, 'INPUT: ' + NAMES[st.input].toUpperCase(), 14, 22, { size: 11, color: C.turb, weight: 800 });
      text(ctx, 'HELD: ' + NAMES[st.held].toUpperCase(), 14, 40, { size: 11, color: C.band, weight: 800 });
      text(ctx, 'OUTPUT: ' + NAMES[st.output].toUpperCase(), 14, 58, { size: 11, color: C.eng, weight: 800 });
      text(ctx, 'in ' + fmt(250 * H.RPM) + ' rpm', g.W - 14, 22, { size: 11, align: 'right', color: C.turb });
      text(ctx, 'out ' + fmt(m[st.output] * H.RPM) + ' rpm', g.W - 14, 40, { size: 11, align: 'right', color: C.eng });
      text(ctx, 'ratio ' + fmt(st.ratio, 2) + ' : 1', g.W - 14, 58, { size: 11, align: 'right', weight: 800 });
      text(ctx, 'planet gears: ' + H.planetTeeth(set) + ' teeth', cx, g.H - 8, { size: 10, align: 'center', color: C.dim });
    }, { el: cv, maxDt: 0.05 });
  }

  function init() { initDrive(); initCoupling(); initPlanetary(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
