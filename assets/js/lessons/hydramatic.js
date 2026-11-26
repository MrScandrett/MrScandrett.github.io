/* Hydra-Matic lesson UI: draws and drives all four labs. All physics is in hydramatic-engine.js. */
(function () {
  'use strict';
  var H = window.HydraMaticEngine;
  if (!H) return;

  var TAU = Math.PI * 2;
  var C = {
    eng: '#ff9a3c', turb: '#5cc8f0', band: '#d9534f', clutch: '#58b36f', ink: '#e8eef4', dim: '#8a9aad',
    bg: '#161b22', panel: '#202833', grid: 'rgba(232,238,244,.12)', brass: '#d9a23a', steel: '#8fa3b7', metal: '#3a4757',
    burgundy: '#a43743'
  };
  var GEAR_COLORS = ['#58b36f', '#5cc8f0', '#d9a23a', '#c07be0'];
  var MONO = 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';
  var VIS = 0.012;   // display radians per real rad/s

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  // Canvas drawn in fixed logical units (width/height attributes); backing store scales cleanly with DPR.
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
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* ======================= Flathead-6 Web Audio ======================= */

  function createEngineAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ctx = null, master = null, filter = null, osc1 = null, osc3 = null, g1 = null, g3 = null;
    var enabled = false, lastShiftCount = 0;

    function ensure() {
      if (ctx) return true;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      filter.Q.value = 1.4;

      osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      g1 = ctx.createGain();
      g1.gain.value = 0.55;

      osc3 = ctx.createOscillator();
      osc3.type = 'triangle';
      g3 = ctx.createGain();
      g3.gain.value = 0.35;

      osc1.connect(g1); g1.connect(filter);
      osc3.connect(g3); g3.connect(filter);
      filter.connect(master);
      master.connect(ctx.destination);
      osc1.start();
      osc3.start();
      return true;
    }

    function setEnabled(on) {
      enabled = !!on;
      if (!ensure()) return false;
      if (enabled && ctx.state === 'suspended') ctx.resume();
      if (!enabled && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      return enabled;
    }

    function update(snap, thr, paused, visible) {
      if (!ctx || !master) return;
      var t = ctx.currentTime;
      if (!enabled || paused || !visible) {
        master.gain.setTargetAtTime(0, t, 0.04);
        return;
      }
      // 4-stroke inline-6 fires 3 times per revolution: fundamental = rpm / 20 Hz
      var rpm = clamp(snap.engineRpm || 650, 450, 4800);
      var freq = clamp(rpm / 20, 24, 240);
      osc1.frequency.setTargetAtTime(freq, t, 0.03);
      osc3.frequency.setTargetAtTime(freq * 1.5, t, 0.03);
      filter.frequency.setTargetAtTime(170 + thr * 420 + (rpm / 4600) * 320, t, 0.04);
      var vol = 0.025 + thr * 0.045 + (rpm / 4600) * 0.025;
      if (snap.shifts !== lastShiftCount) {
        lastShiftCount = snap.shifts;
        // Brief low hydraulic thump on band/clutch swap
        var thump = ctx.createOscillator();
        var tg = ctx.createGain();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(105, t);
        thump.frequency.exponentialRampToValueAtTime(42, t + 0.09);
        tg.gain.setValueAtTime(0.11, t);
        tg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        thump.connect(tg); tg.connect(ctx.destination);
        thump.start(t); thump.stop(t + 0.11);
      }
      master.gain.setTargetAtTime(vol, t, 0.04);
    }

    return { setEnabled: setEnabled, update: update, isEnabled: function () { return enabled; } };
  }

  /* ======================= Road Scene & Art Deco Dashboard ======================= */

  var A0 = 0.75 * Math.PI, A1 = 2.25 * Math.PI;
  function dialAngle(v, min, max) { return A0 + clamp((v - min) / (max - min), 0, 1) * (A1 - A0); }

  function drawRoadStrip(ctx, W, S, snap) {
    var h = 64;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, h); ctx.clip();

    // Dusk sky gradient
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#131b26');
    sky.addColorStop(0.65, '#253344');
    sky.addColorStop(1, '#3b3332');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, h);

    // Distant rolling hills parallax
    var hillOff = (S.roadDist * 0.25) % 240;
    ctx.fillStyle = '#1c2633';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (var hx = -240; hx <= W + 240; hx += 120) {
      var px = hx - hillOff;
      ctx.quadraticCurveTo(px + 60, 20 + ((Math.abs(hx / 120) % 2) * 8), px + 120, 38);
    }
    ctx.lineTo(W, h); ctx.closePath(); ctx.fill();

    // Tilted road ribbon matching road grade
    var slopeAng = clamp(-Math.atan((S.grade || 0) / 100) * 0.42, -0.075, 0.06);
    ctx.save();
    ctx.translate(W * 0.5, 48);
    ctx.rotate(slopeAng);

    // Asphalt
    ctx.fillStyle = '#242c36';
    ctx.fillRect(-W, 0, W * 2, 42);
    ctx.strokeStyle = '#5d6b7c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-W, 0); ctx.lineTo(W, 0); ctx.stroke();

    // Scrolling roadside trees & mileposts
    var postStep = 140;
    var postOff = S.roadDist % postStep;
    for (var rx = -postStep; rx <= W + postStep; rx += postStep) {
      var wx = rx - postOff - W * 0.5;
      ctx.fillStyle = '#334d43';
      ctx.beginPath(); ctx.arc(wx + 40, -10, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5c4938'; ctx.fillRect(wx + 38.5, -4, 3, 4);
      ctx.fillStyle = '#cfd9e2'; ctx.fillRect(wx, -6, 2, 6);
    }

    // Centerline dashes
    var dashStep = 44;
    var dashOff = S.roadDist % dashStep;
    ctx.fillStyle = '#d9a23a';
    for (var dx = -dashStep; dx <= W + dashStep; dx += dashStep) {
      ctx.fillRect(dx - dashOff - W * 0.5, 7, 20, 2.2);
    }

    // 1940 Oldsmobile fastback silhouette
    var carX = -200;
    var pitch = clamp(-snap.accel * 0.008, -0.045, 0.045);
    ctx.save();
    ctx.translate(carX, 1);
    ctx.rotate(pitch);

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, -44, -2, 92, 6, 3); ctx.fill();

    // Exhaust puff under throttle
    if (S.thr > 0.12) {
      var puff = clamp(S.thr, 0.1, 1);
      ctx.fillStyle = 'rgba(210, 222, 234,' + (0.14 + puff * 0.18).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(-52 - (S.car.t * 40 % 14), -7, 3 + puff * 3, 0, TAU);
      ctx.arc(-62 - (S.car.t * 40 % 18), -9, 2.5 + puff * 2, 0, TAU);
      ctx.fill();
    }

    // Body (1940 burgundy fastback)
    ctx.fillStyle = C.burgundy;
    ctx.beginPath();
    ctx.moveTo(-42, -7);
    ctx.lineTo(-42, -16);
    ctx.quadraticCurveTo(-36, -24, -18, -26);
    ctx.lineTo(-4, -33);
    ctx.lineTo(18, -33);
    ctx.quadraticCurveTo(30, -25, 44, -20);
    ctx.lineTo(46, -7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d89c9f'; ctx.lineWidth = 1; ctx.stroke();

    // Windows
    ctx.fillStyle = '#9ecae1';
    ctx.beginPath();
    ctx.moveTo(-14, -25); ctx.lineTo(-3, -31); ctx.lineTo(16, -31); ctx.lineTo(25, -23); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#202833'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(4, -31); ctx.lineTo(4, -24); ctx.stroke();

    // Chrome beltline + bumpers
    ctx.fillStyle = '#dce4ec';
    ctx.fillRect(-38, -16, 80, 2);
    roundRect(ctx, -46, -10, 7, 4, 2); ctx.fill();
    roundRect(ctx, 41, -10, 7, 4, 2); ctx.fill();

    // Headlight beam & brake tail lamp
    ctx.fillStyle = 'rgba(255, 224, 150, 0.22)';
    ctx.beginPath(); ctx.moveTo(45, -15); ctx.lineTo(125, -23); ctx.lineTo(125, -5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = S.brake > 0.05 ? '#ff4040' : '#6e2126';
    ctx.beginPath(); ctx.arc(-41, -14, S.brake > 0.05 ? 3.2 : 2.2, 0, TAU); ctx.fill();

    // Whitewall wheels with spinning spokes
    [-25, 27].forEach(function (wx2) {
      ctx.beginPath(); ctx.arc(wx2, -5, 8.5, 0, TAU); ctx.fillStyle = '#101419'; ctx.fill();
      ctx.beginPath(); ctx.arc(wx2, -5, 5.5, 0, TAU); ctx.fillStyle = '#f2ede0'; ctx.fill();
      ctx.beginPath(); ctx.arc(wx2, -5, 3.2, 0, TAU); ctx.fillStyle = C.burgundy; ctx.fill();
      ctx.strokeStyle = '#d9a23a'; ctx.lineWidth = 1.2;
      for (var s = 0; s < 3; s++) {
        var sa = S.wheelAng + s * TAU / 3;
        ctx.beginPath(); ctx.moveTo(wx2, -5); ctx.lineTo(wx2 + Math.cos(sa) * 4.8, -5 + Math.sin(sa) * 4.8); ctx.stroke();
      }
    });

    ctx.restore();
    ctx.restore();

    // Corner HUD badges on road strip
    roundRect(ctx, 10, 8, 184, 20, 5);
    ctx.fillStyle = 'rgba(16, 21, 27, 0.78)'; ctx.fill();
    text(ctx, '1940 OLDSMOBILE · HYDRA-MATIC', 18, 21, { size: 9.5, color: '#ffcf8a', weight: 700 });

    var gradeTxt = S.grade === 0 ? 'FLAT ROAD (0%)' : (S.grade > 0 ? 'UPHILL +' + S.grade + '%' : 'DOWNHILL ' + S.grade + '%');
    roundRect(ctx, W - 128, 8, 118, 20, 5);
    ctx.fillStyle = 'rgba(16, 21, 27, 0.78)'; ctx.fill();
    text(ctx, gradeTxt, W - 69, 21, { size: 9.5, align: 'center', color: S.grade >= 8 ? C.eng : '#dbe4ec', weight: 700 });

    ctx.restore();
    ctx.strokeStyle = '#394759'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(W, h); ctx.stroke();
  }

  function drawDial(ctx, cx, cy, r, o) {
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.fillStyle = '#10151b'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#4a586a'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = C.panel; ctx.fill();
    if (o.redFrom != null) {
      ctx.beginPath(); ctx.arc(cx, cy, r - 5, dialAngle(o.redFrom, o.min, o.max), A1);
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(217,83,79,.85)'; ctx.stroke();
    }
    for (var v = o.min; v <= o.max + 1e-6; v += o.minor) {
      var major = Math.abs(v / o.major - Math.round(v / o.major)) < 1e-6;
      var a = dialAngle(v, o.min, o.max), c = Math.cos(a), s = Math.sin(a);
      var r1 = r - 3, r0 = r - (major ? 13 : 7);
      ctx.beginPath(); ctx.moveTo(cx + c * r0, cy + s * r0); ctx.lineTo(cx + c * r1, cy + s * r1);
      ctx.lineWidth = major ? 2 : 1.1; ctx.strokeStyle = major ? C.ink : C.dim; ctx.stroke();
      if (major) text(ctx, o.label(v), cx + c * (r - 23), cy + s * (r - 23), { align: 'center', base: 'middle', size: 10 });
    }
    text(ctx, o.title, cx, cy + r - 12, { align: 'center', size: 9.5, color: C.dim });
  }

  function needle(ctx, cx, cy, len, ang, color, w) {
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(ang) * 8, cy - Math.sin(ang) * 8);
    ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
  }

  function drawBar(ctx, x, y, w, h, value, max, color, label, valueText) {
    text(ctx, label, x, y - 4, { size: 9.5, color: C.dim });
    text(ctx, valueText, x + w, y - 4, { size: 9.5, align: 'right', color: C.ink });
    ctx.fillStyle = '#10151b'; roundRect(ctx, x, y, w, h, 3); ctx.fill();
    ctx.fillStyle = color; roundRect(ctx, x, y, Math.max(2, w * clamp(value / max, 0, 1)), h, 3); ctx.fill();
  }

  function drawDash(g, S, snap) {
    var ctx = g.ctx;
    ctx.clearRect(0, 0, g.W, g.H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);

    drawRoadStrip(ctx, g.W, S, snap);

    var cy = 152, r = 68;
    // Speedometer
    drawDial(ctx, 96, cy, r, { min: 0, max: 100, major: 20, minor: 10, label: function (v) { return v; }, title: 'MPH' });
    needle(ctx, 96, cy, 56, dialAngle(Math.abs(snap.mph), 0, 100), C.ink, 2.8);
    ctx.beginPath(); ctx.arc(96, cy, 5, 0, TAU); ctx.fillStyle = '#10151b'; ctx.fill();
    text(ctx, fmt(Math.abs(snap.mph), 0), 96, cy + 31, { align: 'center', size: 19, weight: 800 });

    // Dual-needle tachometer
    var tx = 266;
    drawDial(ctx, tx, cy, r, { min: 0, max: 5000, major: 1000, minor: 500, redFrom: 4400, label: function (v) { return v / 1000; }, title: 'RPM ×1000' });
    var ae = dialAngle(snap.engineRpm, 0, 5000), at = dialAngle(snap.turbineRpm, 0, 5000);
    if (snap.ratio) {
      ctx.beginPath(); ctx.arc(tx, cy, r - 35, Math.min(ae, at), Math.max(ae, at));
      ctx.lineWidth = 7; ctx.strokeStyle = snap.engineRpm >= snap.turbineRpm ? 'rgba(255,154,60,.55)' : 'rgba(92,200,240,.55)'; ctx.stroke();
    }
    needle(ctx, tx, cy, 52, at, C.turb, 2.6);
    needle(ctx, tx, cy, 60, ae, C.eng, 2.8);
    ctx.beginPath(); ctx.arc(tx, cy, 5, 0, TAU); ctx.fillStyle = '#10151b'; ctx.fill();
    text(ctx, 'eng ' + fmt(snap.engineRpm), tx, cy + 23, { align: 'center', size: 9.5, color: C.eng });
    text(ctx, 'turb ' + fmt(snap.turbineRpm), tx, cy + 35, { align: 'center', size: 9.5, color: C.turb });

    // Gear lamps
    var gx = 366, gy = 84;
    text(ctx, 'GEAR', gx + 28, gy - 5, { align: 'center', size: 9.5, color: C.dim });
    var inDrive = S.drive === 'D';
    for (var n = 4; n >= 1; n--) {
      var y = gy + (4 - n) * 25;
      var on = inDrive && snap.gear === n;
      var leaving = inDrive && snap.shifting && S.prevGear === n;
      var pulse = snap.shifting && on ? 0.55 + 0.45 * Math.sin(snap.shiftProgress * Math.PI * 4) : 1;
      ctx.fillStyle = on ? GEAR_COLORS[n - 1] : (leaving ? 'rgba(232,238,244,.28)' : '#232c37');
      ctx.globalAlpha = on ? pulse : 1;
      roundRect(ctx, gx, y, 56, 21, 5); ctx.fill(); ctx.globalAlpha = 1;
      text(ctx, String(n), gx + 28, y + 11.5, { align: 'center', base: 'middle', size: 13.5, weight: 800, color: on ? '#101418' : C.dim });
    }
    ctx.fillStyle = !inDrive ? C.brass : '#232c37'; roundRect(ctx, gx, gy + 102, 56, 21, 5); ctx.fill();
    text(ctx, 'N', gx + 28, gy + 113.5, { align: 'center', base: 'middle', size: 13.5, weight: 800, color: !inDrive ? '#101418' : C.dim });
    text(ctx, inDrive ? fmt(snap.ratio, 2) + ':1' : 'neutral', gx + 28, gy + 139, { align: 'center', size: 10.5, weight: 700 });
    if (snap.shifting && inDrive) text(ctx, 'SHIFTING', gx + 28, gy + 151, { align: 'center', size: 9, color: C.eng });
    else if (inDrive && S.thr >= H.KICKDOWN_THROTTLE && !S.hold) text(ctx, 'KICKDOWN', gx + 28, gy + 151, { align: 'center', size: 9, color: C.band });

    // Hydraulic Argument + mini live spool valve
    var bx = 446, bw = 296;
    text(ctx, 'THE HYDRAULIC ARGUMENT (0–15 PSI)', bx, 80, { size: 9.5, color: C.dim });
    var gov = snap.governor, hold = null, holdDown = null;
    if (inDrive && !S.hold && snap.gear < 4) hold = H.upshiftPsi(snap.gear, S.thr);
    if (inDrive && !S.hold && snap.gear > 1) holdDown = H.downshiftPsi(snap.gear - 1, S.thr);
    var pMax = 15;
    drawBar(ctx, bx, 95, bw, 12, Math.min(gov, pMax), pMax, C.turb, 'governor (speed²)', fmt(gov, 1) + ' psi');
    drawBar(ctx, bx, 125, bw, 12, hold == null ? 0 : hold, pMax, C.eng, 'spring + throttle', hold == null ? (S.hold ? 'gear held' : 'top gear') : fmt(hold, 1) + ' psi');
    if (hold != null) {
      var mx = bx + bw * clamp(hold / pMax, 0, 1);
      ctx.strokeStyle = C.eng; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, 92); ctx.lineTo(mx, 110); ctx.stroke();
    }
    if (holdDown != null) {
      var dx = bx + bw * clamp(holdDown / pMax, 0, 1);
      ctx.strokeStyle = C.dim; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(dx, 92); ctx.lineTo(dx, 110); ctx.stroke(); ctx.setLineDash([]);
    }
    drawBar(ctx, bx, 155, bw, 10, snap.throttle, 10, '#c8903a', 'throttle pedal pressure', fmt(snap.throttle, 1) + ' psi');

    // Compact live spool schematic
    var vy = 178, vh = 28;
    ctx.fillStyle = '#10151b'; roundRect(ctx, bx, vy, bw, vh, 5); ctx.fill();
    ctx.strokeStyle = '#3b4757'; ctx.lineWidth = 1; ctx.stroke();
    var targetSpool = !inDrive ? 0.5 : S.hold ? (snap.gear - 1) / 3 : hold == null ? 1 : clamp((gov - (holdDown || 0)) / Math.max(0.2, hold - (holdDown || 0)), 0, 1);
    S.miniSpool += (targetSpool - S.miniSpool) * 0.2;
    var chamberW = 60 + S.miniSpool * 70;
    ctx.fillStyle = 'rgba(92,200,240,0.32)'; ctx.fillRect(bx + 3, vy + 3, chamberW, vh - 6);
    ctx.fillStyle = 'rgba(255,154,60,0.28)'; ctx.fillRect(bx + chamberW + 44, vy + 3, bw - chamberW - 47, vh - 6);
    ctx.fillStyle = '#c9d4df'; roundRect(ctx, bx + chamberW, vy + 4, 44, vh - 8, 3); ctx.fill();
    text(ctx, 'GOV', bx + 8, vy + 18, { size: 9, color: C.turb, weight: 700 });
    text(ctx, 'SPOOL', bx + chamberW + 22, vy + 17.5, { size: 8.5, align: 'center', color: '#101418', weight: 800 });
    text(ctx, 'THR+SPR', bx + bw - 8, vy + 18, { size: 9, align: 'right', color: C.eng, weight: 700 });

    var msg = !inDrive ? 'Neutral: no gear engaged.' : S.hold ? 'Gear held by the driver.' : snap.gear >= 4 ? 'Top gear: all clutches locked 1:1.' :
      gov > hold ? 'Governor wins: ' + snap.gear + '→' + (snap.gear + 1) + ' valve slides!' : 'Spring + throttle hold ' + snap.gear + ' gear.';
    text(ctx, msg, bx, 224, { size: 10, color: C.ink });

    // Bottom telemetry strip
    ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(14, 238); ctx.lineTo(g.W - 14, 238); ctx.stroke();
    var wheelTorque = snap.ratio ? snap.coupTorque * snap.ratio * H.CAR.finalDrive : 0;
    text(ctx, 'Coupling slip ' + fmt(Math.max(0, snap.slip) * 100, 1) + '%', 20, 258, { size: 11.5 });
    text(ctx, 'Heat in oil ' + fmt(snap.lossKw, 1) + ' kW', 205, 258, { size: 11.5, color: C.eng });
    text(ctx, 'Coupling ' + fmt(snap.coupTorque, 0) + ' N·m', 385, 258, { size: 11.5 });
    text(ctx, 'At wheels ' + fmt(wheelTorque, 0) + ' N·m', 560, 258, { size: 11.5, color: C.clutch });
    text(ctx, 'Accel ' + fmt(snap.accel / 9.80665, 2) + ' g', 20, 278, { size: 11.5, color: C.dim });
    text(ctx, 'Grade ' + (S.grade > 0 ? '+' : '') + S.grade + '%', 205, 278, { size: 11.5, color: C.dim });
    text(ctx, 'Pedal ' + Math.round(S.thr * 100) + '%   Brake ' + Math.round(S.brake * 100) + '%', 385, 278, { size: 11.5, color: C.dim });
  }

  /* ======================= True Meshing Planetary Drawing ======================= */

  function drawExternalGear(ctx, cx, cy, teeth, pitchR, add, ded, angle, fill, stroke) {
    var outerR = pitchR + add, rootR = Math.max(4, pitchR - ded);
    var step = TAU / teeth;
    ctx.beginPath();
    for (var i = 0; i < teeth; i++) {
      var a = angle + i * step;
      var a0 = a - step * 0.36, a1 = a - step * 0.19, a2 = a + step * 0.19, a3 = a + step * 0.36;
      if (i === 0) ctx.moveTo(cx + Math.cos(a0) * rootR, cy + Math.sin(a0) * rootR);
      else ctx.lineTo(cx + Math.cos(a0) * rootR, cy + Math.sin(a0) * rootR);
      ctx.lineTo(cx + Math.cos(a1) * outerR, cy + Math.sin(a1) * outerR);
      ctx.lineTo(cx + Math.cos(a2) * outerR, cy + Math.sin(a2) * outerR);
      ctx.lineTo(cx + Math.cos(a3) * rootR, cy + Math.sin(a3) * rootR);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 1.1; ctx.strokeStyle = stroke; ctx.stroke();
  }

  function drawInternalRingGear(ctx, cx, cy, teeth, pitchR, add, ded, housingR, angle, phaseOff, fill, stroke) {
    var tipR = pitchR - add, rootR = pitchR + ded;
    var step = TAU / teeth;
    ctx.beginPath();
    ctx.arc(cx, cy, housingR, 0, TAU, false);
    for (var i = teeth - 1; i >= 0; i--) {
      var a = angle + (i + phaseOff) * step;
      var a3 = a + step * 0.36, a2 = a + step * 0.19, a1 = a - step * 0.19, a0 = a - step * 0.36;
      if (i === teeth - 1) ctx.moveTo(cx + Math.cos(a3) * rootR, cy + Math.sin(a3) * rootR);
      else ctx.lineTo(cx + Math.cos(a3) * rootR, cy + Math.sin(a3) * rootR);
      ctx.lineTo(cx + Math.cos(a2) * tipR, cy + Math.sin(a2) * tipR);
      ctx.lineTo(cx + Math.cos(a1) * tipR, cy + Math.sin(a1) * tipR);
      ctx.lineTo(cx + Math.cos(a0) * rootR, cy + Math.sin(a0) * rootR);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill('evenodd');
    ctx.lineWidth = 1.2; ctx.strokeStyle = stroke; ctx.stroke();
  }

  // a = { sun, ring, carrier, spin } angles in radians (clockwise positive on screen)
  function drawPlanetary(ctx, cx, cy, set, k, a, st) {
    var S = set.S, R = set.R, P = H.planetTeeth(set), i;
    var rs = S * k, rp = P * k, rr = R * k, orbit = (S + P) * k;
    var add = 0.9 * k, ded = 1.1 * k;

    // Internal ring gear (hollow annulus with true inner teeth)
    var ringPhaseOff = (P % 2 === 1) ? 0.5 : 0;
    var ringGrad = ctx.createRadialGradient(cx, cy, rr - ded, cx, cy, rr + 11);
    ringGrad.addColorStop(0, '#445468');
    ringGrad.addColorStop(1, '#2a3441');
    drawInternalRingGear(ctx, cx, cy, R, rr, add, ded, rr + 11, a.ring, ringPhaseOff, ringGrad, C.steel);
    // Rotation dot on ring rim
    ctx.fillStyle = C.steel;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a.ring) * (rr + 6), cy + Math.sin(a.ring) * (rr + 6), 2.8, 0, TAU); ctx.fill();

    // Sun gear with true meshing teeth
    var sunGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rs + add);
    sunGrad.addColorStop(0, '#52657c');
    sunGrad.addColorStop(1, '#2e3948');
    drawExternalGear(ctx, cx, cy, S, rs, add, ded, a.sun, sunGrad, C.steel);
    ctx.fillStyle = '#d8dee6';
    ctx.beginPath(); ctx.arc(cx + Math.cos(a.sun) * rs * 0.65, cy + Math.sin(a.sun) * rs * 0.65, 2.6, 0, TAU); ctx.fill();

    // Carrier spider arms at exact integer assembly offsets
    var offs = H.planetOffsets(set);
    var pos = offs.map(function (d) {
      var ac = a.carrier + d;
      return [cx + Math.cos(ac) * orbit, cy + Math.sin(ac) * orbit, d];
    });
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(5, rp * 0.46); ctx.strokeStyle = 'rgba(217,162,58,.62)';
    for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pos[i][0], pos[i][1]); ctx.stroke(); }
    ctx.lineCap = 'butt';

    // Planets with true meshing teeth interlocked simultaneously with sun & ring
    for (i = 0; i < 3; i++) {
      var px = pos[i][0], py = pos[i][1];
      var pAng = H.planetMeshAngle(set, pos[i][2], a.spin);
      var pGrad = ctx.createRadialGradient(px, py, 1, px, py, rp + add);
      pGrad.addColorStop(0, '#6a8099');
      pGrad.addColorStop(1, '#3f4f63');
      drawExternalGear(ctx, px, py, P, rp, add, ded, pAng, pGrad, '#aebccb');
      ctx.fillStyle = '#e8eef4';
      ctx.beginPath(); ctx.arc(px + Math.cos(pAng) * rp * 0.55, py + Math.sin(pAng) * rp * 0.55, 2.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, Math.max(2.6, k * 1.1), 0, TAU); ctx.fillStyle = C.brass; ctx.fill();
    }

    // Center hub
    var hubR = Math.max(5.5, rs * 0.28);
    ctx.beginPath(); ctx.arc(cx, cy, hubR, 0, TAU); ctx.fillStyle = C.brass; ctx.fill();

    // Clamping steel brake band + servo lug when held
    if (st && st.held) {
      var br = st.held === 'sun' ? rs + 6 : st.held === 'ring' ? rr + 14.5 : hubR + 5.5;
      ctx.lineWidth = 4.2; ctx.strokeStyle = C.band; ctx.setLineDash([8, 4]);
      ctx.beginPath(); ctx.arc(cx, cy, br, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      // Servo clamp tab at top
      ctx.fillStyle = C.band;
      roundRect(ctx, cx - 7, cy - br - 5, 14, 7, 2); ctx.fill();
    }

    // Green clutch lock ring when locked solid 1:1
    if (st && st.locked) {
      ctx.lineWidth = 3; ctx.strokeStyle = C.clutch;
      ctx.beginPath(); ctx.arc(cx, cy, rr + 14.5, 0, TAU); ctx.stroke();
      for (i = 0; i < 4; i++) {
        var la = a.carrier + i * (Math.PI / 2);
        ctx.fillStyle = C.clutch;
        ctx.beginPath(); ctx.arc(cx + Math.cos(la) * (rr + 14.5), cy + Math.sin(la) * (rr + 14.5), 3.2, 0, TAU); ctx.fill();
      }
    }
  }

  /* ======================= Cutaway Gearbox (Drive Sim) ======================= */

  function drawBox(g, S, snap) {
    var ctx = g.ctx;
    ctx.clearRect(0, 0, g.W, g.H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);

    var cy = 128;
    var cpX = 72, cpR = 44;
    var fx = 256, rx = 524;
    var fk = 1.72, rk = 1.44;
    var m = snap.members, holds = m ? m.holds : null;

    // Connecting shafts
    ctx.lineWidth = 8; ctx.strokeStyle = '#3b4757';
    ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(cpX - cpR, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cpX + cpR, cy); ctx.lineTo(fx - 70, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx + 6, cy); ctx.lineTo(rx - 6, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + 6, cy); ctx.lineTo(g.W - 14, cy); ctx.stroke();

    // Animated power-flow pulses along shafts
    if (m && Math.abs(snap.coupTorque) > 1) {
      var dir = snap.coupTorque >= 0 ? 1 : -1;
      var phase = (S.car.t * 2.4 * dir) % 1;
      if (phase < 0) phase += 1;
      ctx.fillStyle = dir > 0 ? C.eng : C.turb;
      [
        [cpX + cpR + 6, fx - 72],
        [fx + 10, rx - 10],
        [rx + 78, g.W - 18]
      ].forEach(function (seg) {
        var px = seg[0] + (seg[1] - seg[0]) * phase;
        ctx.beginPath(); ctx.arc(px, cy, 3.2, 0, TAU); ctx.fill();
      });
    }

    // Mini animated fluid coupling on left
    ctx.beginPath(); ctx.arc(cpX, cy, cpR, 0, TAU); ctx.fillStyle = '#1b232e'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#56677c'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cpX, cy, cpR - 6, Math.PI * 0.55, Math.PI * 1.45);
    ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,154,60,0.75)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cpX, cy, cpR - 6, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.strokeStyle = 'rgba(92,200,240,0.75)'; ctx.stroke();
    // Spinning pump/turbine indicator spokes
    for (var s = 0; s < 2; s++) {
      var pa = S.ang.pump + s * Math.PI, ta = S.ang.front.ring + s * Math.PI;
      ctx.strokeStyle = C.eng; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cpX - 10, cy); ctx.lineTo(cpX - 10 + Math.cos(pa) * 14, cy + Math.sin(pa) * 14); ctx.stroke();
      ctx.strokeStyle = C.turb;
      ctx.beginPath(); ctx.moveTo(cpX + 10, cy); ctx.lineTo(cpX + 10 + Math.cos(ta) * 14, cy + Math.sin(ta) * 14); ctx.stroke();
    }
    text(ctx, 'FLUID COUPLING', cpX, 20, { size: 10, align: 'center', weight: 800, color: C.eng });
    text(ctx, 'slip ' + fmt(Math.max(0, snap.slip) * 100, 1) + '%', cpX, 34, { size: 9.5, align: 'center', color: C.dim });
    text(ctx, fmt(snap.engineRpm) + '→' + fmt(snap.turbineRpm) + ' rpm', cpX, g.H - 12, { size: 9.5, align: 'center', color: C.turb });

    // Front and rear meshing planetary gearsets
    drawPlanetary(ctx, fx, cy, H.FRONT, fk, S.ang.front, { held: holds && holds.frontBand ? 'sun' : null, locked: holds && holds.frontClutch });
    drawPlanetary(ctx, rx, cy, H.REAR, rk, S.ang.rear, { held: holds && holds.rearBand ? 'ring' : null, locked: holds && holds.rearClutch });

    text(ctx, 'carrier→sun', (fx + rx) / 2, cy - 12, { size: 9.5, align: 'center', color: C.dim });
    var outTorque = m ? snap.coupTorque * snap.ratio : 0;
    text(ctx, 'OUTPUT SHAFT', g.W - 14, cy - 26, { size: 9.5, align: 'right', color: C.eng, weight: 700 });
    text(ctx, fmt(m ? m.out * H.RPM : 0) + ' rpm', g.W - 14, cy - 12, { size: 10.5, align: 'right', color: C.ink });
    text(ctx, fmt(outTorque, 0) + ' N·m', g.W - 14, cy + 24, { size: 11, align: 'right', color: C.clutch, weight: 800 });

    var fm = m ? m.front : { sun: 0, ring: 0, carrier: 0 }, rm = m ? m.rear : { sun: 0, ring: 0, carrier: 0 };
    function mem(o) { return 'sun ' + fmt(o.sun * H.RPM) + ' · ring ' + fmt(o.ring * H.RPM) + ' · car ' + fmt(o.carrier * H.RPM); }
    var fmode = !holds ? '—' : holds.frontBand ? 'REDUCE ×1.55 (sun band)' : 'DIRECT ×1 (clutch lock)';
    var rmode = !holds ? '—' : holds.rearBand ? 'REDUCE ×2.56 (ring band)' : 'DIRECT ×1 (clutch lock)';
    text(ctx, 'FRONT SET', fx, 20, { size: 10.5, align: 'center', weight: 800 });
    text(ctx, 'REAR SET', rx, 20, { size: 10.5, align: 'center', weight: 800 });
    text(ctx, fmode, fx, 34, { size: 9.5, align: 'center', color: holds && holds.frontBand ? C.band : C.clutch });
    text(ctx, rmode, rx, 34, { size: 9.5, align: 'center', color: holds && holds.rearBand ? C.band : C.clutch });
    text(ctx, mem(fm), fx, g.H - 12, { size: 9.5, align: 'center', color: C.dim });
    text(ctx, mem(rm), rx, g.H - 12, { size: 9.5, align: 'center', color: C.dim });

    if (!m) {
      ctx.fillStyle = 'rgba(22,27,34,.74)'; ctx.fillRect(0, 0, g.W, g.H);
      text(ctx, 'NEUTRAL: gearbox disconnected from wheels', g.W / 2, g.H / 2 + 4, { size: 13.5, align: 'center', weight: 800, color: C.brass });
    }
  }

  /* ======================= Interactive Shift Map ======================= */

  var MAP = { x0: 62, x1: 736, y0: 168, y1: 26, maxMph: 90 };
  function mapX(mph) { return MAP.x0 + (MAP.x1 - MAP.x0) * clamp(mph / MAP.maxMph, 0, 1); }
  function mapY(thr) { return MAP.y0 + (MAP.y1 - MAP.y0) * clamp(thr, 0, 1); }
  function invMapX(x) { return clamp((x - MAP.x0) / (MAP.x1 - MAP.x0), 0, 1) * MAP.maxMph; }
  function invMapY(y) { return clamp((y - MAP.y0) / (MAP.y1 - MAP.y0), 0, 1); }

  function drawMap(g, S, snap, curves) {
    var ctx = g.ctx, i, k;
    ctx.clearRect(0, 0, g.W, g.H);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);

    // Gear zones
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

    // Grid + axes
    ctx.lineWidth = 1; ctx.strokeStyle = C.grid;
    for (var m = 0; m <= MAP.maxMph; m += 10) {
      ctx.beginPath(); ctx.moveTo(mapX(m), MAP.y1); ctx.lineTo(mapX(m), MAP.y0); ctx.stroke();
      text(ctx, String(m), mapX(m), MAP.y0 + 14, { size: 9.5, align: 'center', color: C.dim });
    }
    for (var t = 0; t <= 1.001; t += 0.25) {
      ctx.beginPath(); ctx.moveTo(MAP.x0, mapY(t)); ctx.lineTo(MAP.x1, mapY(t)); ctx.stroke();
      text(ctx, Math.round(t * 100) + '%', MAP.x0 - 8, mapY(t) + 3, { size: 9.5, align: 'right', color: C.dim });
    }
    text(ctx, 'road speed (mph) — click or drag anywhere on map to jump', (MAP.x0 + MAP.x1) / 2, MAP.y0 + 29, { size: 10, align: 'center', color: C.dim });
    ctx.save(); ctx.translate(14, (MAP.y0 + MAP.y1) / 2); ctx.rotate(-Math.PI / 2);
    text(ctx, 'pedal', 0, 0, { size: 10, align: 'center', color: C.dim }); ctx.restore();

    // 90% Kickdown Detent line
    var ky = mapY(H.KICKDOWN_THROTTLE);
    ctx.strokeStyle = 'rgba(217,83,79,0.55)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(MAP.x0, ky); ctx.lineTo(MAP.x1, ky); ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, 'KICKDOWN DETENT (90%)', MAP.x1 - 6, ky - 4, { size: 8.5, align: 'right', color: '#f08a86' });

    // Shift curves
    for (k = 0; k < 3; k++) {
      var cv = curves[k], col = GEAR_COLORS[k + 1];
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash([]);
      ctx.beginPath(); for (i = 0; i < cv.up.length; i++) ctx[i ? 'lineTo' : 'moveTo'](mapX(cv.up[i].mph), mapY(cv.up[i].thr)); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); for (i = 0; i < cv.down.length; i++) ctx[i ? 'lineTo' : 'moveTo'](mapX(cv.down[i].mph), mapY(cv.down[i].thr)); ctx.stroke();
      ctx.setLineDash([]);
      var lab = cv.up[15];
      text(ctx, cv.from + '→' + cv.to, mapX(lab.mph) - 4, mapY(lab.thr) - 4, { size: 9.5, color: col, align: 'right' });
    }

    // Zone labels
    var zc = [mapX(10), mapX(22), mapX(38), mapX(68)];
    for (k = 0; k < 4; k++) text(ctx, k === 0 ? '1st' : k === 1 ? '2nd' : k === 2 ? '3rd' : '4th', zc[k], mapY(0.8), { size: 10.5, align: 'center', weight: 700, color: GEAR_COLORS[k] });

    // Trail & current operating point
    var trail = S.trail;
    ctx.lineWidth = 2;
    for (i = 1; i < trail.length; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (i / trail.length * 0.5).toFixed(2) + ')';
      ctx.beginPath(); ctx.moveTo(mapX(trail[i - 1].mph), mapY(trail[i - 1].thr)); ctx.lineTo(mapX(trail[i].mph), mapY(trail[i].thr)); ctx.stroke();
    }
    var px = mapX(Math.abs(snap.mph)), py = mapY(S.thr);
    ctx.beginPath(); ctx.arc(px, py, 6.5, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = GEAR_COLORS[snap.gear - 1]; ctx.stroke();

    // Hover crosshair + tooltip
    if (S.mapHover) {
      var hx = mapX(S.mapHover.mph), hy = mapY(S.mapHover.thr);
      ctx.strokeStyle = 'rgba(232,238,244,0.38)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(hx, MAP.y1); ctx.lineTo(hx, MAP.y0); ctx.moveTo(MAP.x0, hy); ctx.lineTo(MAP.x1, hy); ctx.stroke();
      ctx.setLineDash([]);
      var targetG = H.chooseGear(snap.gear, S.mapHover.mph, S.mapHover.thr);
      var tip = Math.round(S.mapHover.mph) + ' mph · ' + Math.round(S.mapHover.thr * 100) + '% · want ' + targetG + (targetG === 1 ? 'st' : targetG === 2 ? 'nd' : targetG === 3 ? 'rd' : 'th');
      var tx2 = clamp(hx + 10, MAP.x0, MAP.x1 - 165), ty2 = clamp(hy - 26, MAP.y1, MAP.y0 - 22);
      ctx.fillStyle = 'rgba(16,21,27,0.92)'; roundRect(ctx, tx2, ty2, 162, 20, 4); ctx.fill();
      ctx.strokeStyle = GEAR_COLORS[targetG - 1]; ctx.lineWidth = 1; ctx.stroke();
      text(ctx, tip, tx2 + 81, ty2 + 13.5, { size: 9, align: 'center', color: C.ink });
    }

    text(ctx, 'SHIFT MAP   solid: upshift   dashed: downshift', MAP.x0, 12, { size: 9.5, color: C.dim });
  }

  /* ======================= Main Driving Sim ======================= */

  function initDrive() {
    var cDash = $('#hm-dash'), cMap = $('#hm-map'), cBox = $('#hm-box');
    if (!cDash || !cMap || !cBox) return;
    var gD = setup(cDash), gM = setup(cMap), gB = setup(cBox);
    var curves = H.shiftCurves(21);
    var inThr = $('#hm-thr'), inBrake = $('#hm-brake'), inGrade = $('#hm-grade');
    var outThr = $('#hm-thr-out'), outBrake = $('#hm-brake-out'), outGrade = $('#hm-grade-out');
    var readout = $('#hm-readout'), live = $('#hm-live'), logEl = $('#hm-log');
    var sw30 = $('#hm-sw-30'), sw60 = $('#hm-sw-60');
    var gasBtn = $('#hm-pedal-gas'), brakeBtn = $('#hm-pedal-brake'), audioBtn = $('#hm-audio');
    var audio = createEngineAudio();
    var missions = { launch60: false, kickdown: false, overrun: false, hill: false };

    var S = {
      car: H.createCar(), thr: 0, brake: 0, grade: 0, drive: 'D', hold: 0, speed: 1, paused: false,
      trail: [], prevGear: 1, lastGear: 1, rest: true, t0: null, t30: null, t60: null, spaceDown: false,
      roadDist: 0, wheelAng: 0, miniSpool: 0, mapHover: null, mapDrag: false, savedThr: 0,
      ang: { pump: 0, front: { sun: 0, ring: 0, carrier: 0, spin: 0 }, rear: { sun: 0, ring: 0, carrier: 0, spin: 0 } }
    };
    var snap = H.stepCar(S.car, { thr: 0, drive: 'D' }, 1 / 60);
    var logs = [];
    var stageEls = SimKit.stage(cDash, cMap, cBox);
    var simVisible = true;
    SimKit.onScreen(stageEls, function (on) { simVisible = on; if (!on && audio) audio.update(snap, S.thr, S.paused, false); });

    function completeMission(key, label) {
      if (missions[key]) return;
      missions[key] = true;
      var el = $('[data-hm-mission="' + key + '"]');
      if (el) {
        el.classList.add('is-done');
        var dot = $('.hm-mission-dot', el);
        if (dot) dot.textContent = '✓';
      }
      if (live) live.textContent = 'Challenge completed: ' + label + '.';
    }

    function syncControls() {
      inThr.value = Math.round(S.thr * 100); outThr.textContent = Math.round(S.thr * 100) + '%';
      inBrake.value = Math.round(S.brake * 100); outBrake.textContent = Math.round(S.brake * 100) + '%';
      inGrade.value = S.grade; outGrade.textContent = (S.grade > 0 ? '+' : '') + S.grade + '%';
      $$('[data-hm-drive]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-hm-drive') === S.drive)); });
      $$('[data-hm-hold]').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-hm-hold')) === S.hold)); });
    }

    function updateStopwatch() {
      if (sw30) sw30.textContent = S.t30 !== null ? fmt(S.t30, 1) + ' s' : '—';
      if (sw60) sw60.textContent = S.t60 !== null ? fmt(S.t60, 1) + ' s' : '—';
    }

    function resetCar(mph, gear) {
      S.car = H.createCar({ mph: mph || 0, gear: gear || 1 });
      S.trail = []; S.prevGear = gear || 1; S.lastGear = gear || 1; S.t0 = S.t30 = S.t60 = null; S.rest = !mph;
      logs = []; renderLog(); updateStopwatch();
      snap = H.stepCar(S.car, { thr: S.thr, drive: S.drive }, 1 / 240);
      $$('#hm-gear-table tr').forEach(function (tr) { tr.classList.toggle('is-on', Number(tr.getAttribute('data-g')) === snap.gear); });
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

    if (audioBtn) {
      audioBtn.addEventListener('click', function () {
        if (!audio) return;
        var on = audio.setEnabled(!audio.isEnabled());
        audioBtn.textContent = on ? 'Sound: On' : 'Sound: Off';
        audioBtn.setAttribute('aria-pressed', String(on));
      });
    }

    // Hold-to-press tactile Gas & Brake buttons
    function bindHoldBtn(btn, onDown, onUp) {
      if (!btn) return;
      var active = false;
      function press(e) {
        if (active) return;
        active = true;
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        if (btn.setPointerCapture && e.pointerId != null) { try { btn.setPointerCapture(e.pointerId); } catch (_) {} }
        onDown(); syncControls();
      }
      function release() {
        if (!active) return;
        active = false;
        btn.classList.remove('is-active');
        btn.setAttribute('aria-pressed', 'false');
        onUp(); syncControls();
      }
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
      btn.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(e); } });
      btn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } });
    }
    bindHoldBtn(gasBtn, function () { S.savedThr = S.thr; S.thr = 1; S.brake = 0; }, function () { S.thr = 0; });
    bindHoldBtn(brakeBtn, function () { S.brake = 1; }, function () { S.brake = 0; });

    // Interactive Shift Map pointer jumping
    function mapCoords(e) {
      var rect = cMap.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (gM.W / rect.width);
      var y = (e.clientY - rect.top) * (gM.H / rect.height);
      return { mph: invMapX(x), thr: invMapY(y), inside: x >= MAP.x0 && x <= MAP.x1 && y >= MAP.y1 && y <= MAP.y0 };
    }
    function applyMapPoint(pt) {
      S.thr = pt.thr;
      S.car.v = pt.mph / H.MPS_TO_MPH;
      S.drive = 'D';
      S.hold = 0;
      var targetG = H.chooseGear(S.car.gear, pt.mph, pt.thr);
      S.car.gear = targetG;
      var wTurb = (S.car.v / H.CAR.wheelRadius) * H.CAR.finalDrive * H.gearRatio(targetG);
      S.car.wEng = Math.max(H.ENGINE.idleRad, wTurb * (1 + pt.thr * 0.05));
      S.lastGear = S.prevGear = targetG;
      snap = H.stepCar(S.car, { thr: S.thr, brake: S.brake, grade: S.grade, drive: S.drive, hold: S.hold }, 1 / 240);
      $$('#hm-gear-table tr').forEach(function (tr) { tr.classList.toggle('is-on', Number(tr.getAttribute('data-g')) === snap.gear); });
      syncControls();
    }
    cMap.style.cursor = 'crosshair';
    cMap.addEventListener('pointerdown', function (e) {
      var pt = mapCoords(e);
      if (!pt.inside) return;
      S.mapDrag = true;
      if (cMap.setPointerCapture) { try { cMap.setPointerCapture(e.pointerId); } catch (_) {} }
      applyMapPoint(pt);
    });
    cMap.addEventListener('pointermove', function (e) {
      var pt = mapCoords(e);
      S.mapHover = pt.inside ? { mph: pt.mph, thr: pt.thr } : null;
      if (S.mapDrag) applyMapPoint(pt);
    });
    cMap.addEventListener('pointerup', function () { S.mapDrag = false; });
    cMap.addEventListener('pointerleave', function () { S.mapHover = null; S.mapDrag = false; });

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
        S.roadDist += Math.abs(S.car.v) * h * 18;
        S.wheelAng += (S.car.v / H.CAR.wheelRadius) * h;

        if (snap.gear !== S.lastGear) {
          var prev = S.lastGear;
          S.prevGear = prev;
          var jump = Math.round(snap.turbineJump / 50) * 50;
          logs.unshift(prev + '→' + snap.gear + ' at ' + Math.round(Math.abs(snap.mph)) + ' mph, pedal ' + Math.round(S.thr * 100) + '%' +
            (Math.abs(jump) >= 100 ? ', turbine ' + (jump > 0 ? '+' : '') + fmt(jump) + ' rpm' : ''));
          renderLog();
          live.textContent = 'Shifted ' + prev + ' to ' + snap.gear + ' at ' + Math.round(Math.abs(snap.mph)) + ' miles per hour.';
          if (snap.gear < prev && S.thr >= H.KICKDOWN_THROTTLE && !S.hold) completeMission('kickdown', '4→3 Kickdown');
          if (snap.gear < prev && S.grade >= 8 && !S.hold) completeMission('hill', 'Hill Downshift');
          S.lastGear = snap.gear;
          $$('#hm-gear-table tr').forEach(function (tr) { tr.classList.toggle('is-on', Number(tr.getAttribute('data-g')) === snap.gear); });
        }

        // 0–30 / 0–60 stopwatch & discovery missions
        if (snap.mph < 0.3) { S.rest = true; S.t0 = S.t30 = S.t60 = null; updateStopwatch(); }
        else if (S.rest && S.t0 === null) S.t0 = S.car.t;
        if (S.t0 !== null && S.t30 === null && snap.mph >= 30) { S.t30 = S.car.t - S.t0; updateStopwatch(); }
        if (S.t0 !== null && S.t60 === null && snap.mph >= 60) { S.t60 = S.car.t - S.t0; updateStopwatch(); completeMission('launch60', '0–60 Launch'); }
        if (S.drive === 'D' && S.thr <= 0.02 && snap.mph >= 20 && snap.coupTorque < -5) completeMission('overrun', 'Engine Braking');

        // Gearset angles at real relative speeds
        S.ang.pump += (snap.engineRpm / H.RPM) * VIS * h;
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

      if (audio) audio.update(snap, S.thr, S.paused, simVisible);
      drawDash(gD, S, snap); drawBox(gB, S, snap); drawMap(gM, S, snap, curves);

      if (readT > 0.2) {
        readT = 0;
        var parts = [fmt(Math.abs(snap.mph)) + ' mph', S.drive === 'D' ? 'gear ' + snap.gear + ' (' + fmt(snap.ratio, 2) + ':1)' : 'neutral',
          'engine ' + fmt(snap.engineRpm) + ' rpm', 'turbine ' + fmt(snap.turbineRpm) + ' rpm', 'slip ' + fmt(Math.max(0, snap.slip) * 100, 1) + '%'];
        if (S.t30 !== null) parts.push('0–30 ' + fmt(S.t30, 1) + ' s');
        if (S.t60 !== null) parts.push('0–60 ' + fmt(S.t60, 1) + ' s');
        readout.textContent = parts.join(' · ');
      }
    }

    syncControls(); renderLog(); updateStopwatch();
    $$('#hm-gear-table tr').forEach(function (tr) { tr.classList.toggle('is-on', Number(tr.getAttribute('data-g')) === 1); });
    SimKit.loop(frame, { el: stageEls, maxDt: 0.05 });
    window.__hmSim = { S: S, scenario: scenario, snap: function () { return snap; }, missions: missions };
  }

  /* ======================= Fluid Coupling & Torque Converter Lab ======================= */

  function initCoupling() {
    var cv = $('#hm-cp'); if (!cv) return;
    var g = setup(cv), ctx = g.ctx;
    var inP = $('#hm-cp-p'), inT = $('#hm-cp-t'), oP = $('#hm-cp-p-out'), oT = $('#hm-cp-t-out'), ro = $('#hm-cp-readout');
    var mode = 'coupling';
    var parts = []; for (var i = 0; i < 44; i++) parts.push(i / 44 * TAU);
    var angP = 0, angT = 0, cx = 280, cy = 104, R = 74;

    function vals() { return { p: Number(inP.value), t: Number(inT.value) }; }
    function readout() {
      var v = vals(), wp = v.p / H.RPM, wt = v.t / H.RPM;
      var tPump = H.couplingTorque(wp, wt);
      var mult = mode === 'converter' ? H.torqueConverterMultiplier(wp, wt) : 1;
      var tTurb = tPump * mult;
      var pin = tPump * wp, pout = tTurb * wt, heat = Math.max(0, pin - pout);
      oP.textContent = fmt(v.p) + ' rpm'; oT.textContent = fmt(v.t) + ' rpm';
      if (mode === 'converter') {
        ro.textContent = 'Slip ' + fmt(Math.max(0, H.couplingSlip(wp, wt)) * 100, 1) + '% · Stator gain ' + fmt(mult, 2) + '× · Pump ' +
          fmt(tPump, 0) + ' N·m → Turbine ' + fmt(tTurb, 0) + ' N·m · heat ' + fmt(heat / 1000, 1) + ' kW';
      } else {
        ro.textContent = 'Slip ' + fmt(Math.max(0, H.couplingSlip(wp, wt)) * 100, 1) + '% · torque ' + fmt(tPump, 0) + ' N·m (1:1 in = out) · power in ' + fmt(pin / 1000, 1) +
          ' kW, out ' + fmt(pout / 1000, 1) + ' kW · heat ' + fmt(heat / 1000, 1) + ' kW' + (tPump < -1 ? ' · overrun: wheels drive engine' : '');
      }
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
    $$('[data-hm-cp-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-hm-cp-mode');
        $$('[data-hm-cp-mode]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-hm-cp-mode') === mode)); });
        readout();
      });
    });
    readout();

    SimKit.loop(function (dt) {
      var v = vals(), wp = v.p / H.RPM, wt = v.t / H.RPM;
      var tPump = H.couplingTorque(wp, wt);
      var mult = mode === 'converter' ? H.torqueConverterMultiplier(wp, wt) : 1;
      var tTurb = tPump * mult;
      var pin = tPump * wp, pout = tTurb * wt, heatKw = Math.max(0, (pin - pout) / 1000);
      var flow = Math.sign(wp * wp - wt * wt) * Math.sqrt(Math.abs(wp * wp - wt * wt)) / (4400 / H.RPM);
      angP += wp * 0.012 * dt * 60; angT += wt * 0.012 * dt * 60;
      var spd = flow * 7;
      for (var i = 0; i < parts.length; i++) parts[i] = (parts[i] + spd * dt + TAU) % TAU;

      ctx.clearRect(0, 0, g.W, g.H); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);

      // Thermal heat glow when dissipating significant heat in oil
      if (heatKw > 2) {
        var glowA = clamp(heatKw / 45, 0.08, 0.45);
        var hg = ctx.createRadialGradient(cx, cy, R - 34, cx, cy, R + 24);
        hg.addColorStop(0, 'rgba(255, 110, 40,' + glowA.toFixed(2) + ')');
        hg.addColorStop(1, 'rgba(255, 110, 40, 0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, R + 24, 0, TAU); ctx.fill();
      }

      // Torus halves
      ctx.lineWidth = 32;
      ctx.beginPath(); ctx.arc(cx, cy, R - 16, Math.PI / 2, Math.PI * 1.5); ctx.strokeStyle = 'rgba(255,154,60,.28)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R - 16, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = 'rgba(92,200,240,.28)'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = C.steel;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R - 32, 0, TAU); ctx.stroke();

      // Vanes
      ctx.lineWidth = 2;
      for (var k = 0; k < 9; k++) {
        var a = Math.PI / 2 + (k + 0.5) * Math.PI / 9;
        ctx.strokeStyle = C.eng; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 31), cy + Math.sin(a) * (R - 31)); ctx.lineTo(cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1)); ctx.stroke();
        var b = -Math.PI / 2 + (k + 0.5) * Math.PI / 9;
        ctx.strokeStyle = C.turb; ctx.beginPath(); ctx.moveTo(cx + Math.cos(b) * (R - 31), cy + Math.sin(b) * (R - 31)); ctx.lineTo(cx + Math.cos(b) * (R - 1), cy + Math.sin(b) * (R - 1)); ctx.stroke();
      }

      // Optional 1948 Stator ring at bottom/inner return path
      if (mode === 'converter') {
        var statorActive = mult > 1.01;
        ctx.fillStyle = statorActive ? 'rgba(217, 162, 58, 0.85)' : 'rgba(143, 163, 183, 0.35)';
        roundRect(ctx, cx - 10, cy + R - 33, 20, 34, 4); ctx.fill();
        ctx.strokeStyle = '#161b22'; ctx.lineWidth = 1.5;
        for (var sv = 0; sv < 3; sv++) {
          var sy = cy + R - 26 + sv * 10;
          ctx.beginPath(); ctx.moveTo(cx + 6, sy); ctx.quadraticCurveTo(cx, sy - 4, cx - 6, sy + 3); ctx.stroke();
        }
        text(ctx, statorActive ? 'STATOR LOCKED (' + fmt(mult, 2) + '×)' : 'STATOR FREEWHEELS (1.00×)', cx, 18, { size: 10, align: 'center', color: C.brass, weight: 800 });
      } else {
        text(ctx, 'NO STATOR: 1:1 TORQUE TRANSFER', cx, 18, { size: 10, align: 'center', color: C.dim, weight: 700 });
      }

      // Circulating oil particles with velocity tails
      for (var j = 0; j < parts.length; j++) {
        var th = parts[j] - Math.PI;
        var px = cx + Math.cos(th) * (R - 16), py = cy + Math.sin(th) * (R - 16);
        var pPrev = parts[j] - spd * 0.03 - Math.PI;
        ctx.strokeStyle = px < cx ? C.eng : C.turb;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(pPrev) * (R - 16), cy + Math.sin(pPrev) * (R - 16)); ctx.lineTo(px, py); ctx.stroke();
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, TAU); ctx.fillStyle = px < cx ? C.eng : C.turb; ctx.fill();
      }

      // Shafts with spokes
      function shaft(x0, x1, ang, color, label, torqueTxt) {
        ctx.lineWidth = 8; ctx.strokeStyle = '#3b4757'; ctx.beginPath(); ctx.moveTo(x0, 200); ctx.lineTo(x1, 200); ctx.stroke();
        var sx = (x0 + x1) / 2; ctx.lineWidth = 2; ctx.strokeStyle = color;
        ctx.beginPath(); ctx.arc(sx, 200, 14, 0, TAU); ctx.stroke();
        for (var s = 0; s < 3; s++) { ctx.beginPath(); ctx.moveTo(sx, 200); ctx.lineTo(sx + Math.cos(ang + s * TAU / 3) * 14, 200 + Math.sin(ang + s * TAU / 3) * 14); ctx.stroke(); }
        text(ctx, label, sx, 224, { size: 9.5, align: 'center', color: color });
        text(ctx, torqueTxt, sx, 178, { size: 9.5, align: 'center', color: C.ink, weight: 700 });
      }
      shaft(34, 194, angP, C.eng, 'ENGINE PUMP', fmt(tPump, 0) + ' N·m in');
      shaft(366, 526, angT, C.turb, 'GEARBOX TURBINE', fmt(tTurb, 0) + ' N·m out');
      ctx.strokeStyle = C.steel; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - R, cy + 8); ctx.lineTo(114, 200); ctx.moveTo(cx + R, cy + 8); ctx.lineTo(446, 200); ctx.stroke();

      text(ctx, 'oil flung out by pump...', 18, 34, { size: 10, color: C.eng });
      text(ctx, '...pushes turbine vanes', 542, 34, { size: 10, align: 'right', color: C.turb });
      text(ctx, Math.abs(flow) < 0.02 ? 'no net flow: zero torque' : (flow > 0 ? 'pump faster → forward drive' : 'turbine faster → engine braking'), cx, 196, { size: 9.5, align: 'center', color: C.ink });

      // Energy split bar at bottom
      var ex = 20, ew = g.W - 40, ey = 250;
      ctx.fillStyle = '#10151b'; roundRect(ctx, ex, ey, ew, 14, 4); ctx.fill();
      if (pin > 50) {
        var outFrac = clamp(pout / pin, 0, 1);
        var outW = ew * outFrac;
        ctx.fillStyle = C.clutch; roundRect(ctx, ex, ey, Math.max(0, outW), 14, 4); ctx.fill();
        if (1 - outFrac > 0.01) {
          ctx.fillStyle = C.eng; roundRect(ctx, ex + outW, ey, Math.max(2, ew - outW), 14, 4); ctx.fill();
        }
        text(ctx, 'Mechanical out: ' + fmt(pout / 1000, 1) + ' kW (' + fmt(outFrac * 100, 0) + '%)', ex, ey - 5, { size: 9.5, color: C.clutch });
        text(ctx, 'Oil heat loss: ' + fmt(heatKw, 1) + ' kW', ex + ew, ey - 5, { size: 9.5, align: 'right', color: C.eng });
      } else if (tPump < -1) {
        ctx.fillStyle = C.turb; roundRect(ctx, ex, ey, ew * 0.4, 14, 4); ctx.fill();
        text(ctx, 'Overrun engine braking: wheels spinning pump against compression', ex, ey - 5, { size: 9.5, color: C.turb });
      } else {
        text(ctx, 'Zero net power flow at matched speed', ex, ey - 5, { size: 9.5, color: C.dim });
      }
    }, { el: cv, maxDt: 0.05 });
  }

  /* ======================= Planetary Gear Lab ======================= */

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
    var playBtn = $('#hm-pl-play');
    var ang = { sun: 0, ring: 0, carrier: 0, spin: 0 };
    var paused = false;
    var state = { set: null, input: 'ring', held: 'sun', output: 'carrier', ratio: 1.55, members: null };

    function update(changed) {
      var inp = sIn.value, held = sHeld.value;
      if (inp === held) {
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

      tb.innerHTML = '';
      ARR.forEach(function (a) {
        var r = H.planetaryRatio(set, a[0], a[1], a[2]);
        var tr = document.createElement('tr');
        if (a[0] === inp && a[1] === held) tr.className = 'is-on';
        tr.innerHTML = '<td><button type="button" class="hm-row-btn" aria-pressed="' + String(a[0] === inp && a[1] === held) + '">' + NAMES[a[0]] + '</button></td>' +
          '<td>' + NAMES[a[1]] + '</td><td>' + NAMES[a[2]] + '</td><td class="hm-num">' + fmt(r, 3) + ' : 1</td><td>' + kind(r) + star(a[0], a[1]) + '</td>';
        tr.addEventListener('click', function () {
          sIn.value = a[0];
          sHeld.value = a[1];
          update();
        });
        tb.appendChild(tr);
      });
    }

    sIn.addEventListener('change', function () { update('in'); });
    sHeld.addEventListener('change', function () { update('held'); });
    rS.addEventListener('input', function () { update(); }); rP.addEventListener('input', function () { update(); });

    $$('[data-hm-pl-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-hm-pl-preset');
        if (p === 'front') { sIn.value = 'ring'; sHeld.value = 'sun'; rS.value = 22; rP.value = 9; }
        if (p === 'rear') { sIn.value = 'sun'; sHeld.value = 'ring'; rS.value = 32; rP.value = 9; }
        if (p === 'overdrive') { sIn.value = 'carrier'; sHeld.value = 'sun'; rS.value = 22; rP.value = 9; }
        if (p === 'reverse') { sIn.value = 'sun'; sHeld.value = 'carrier'; rS.value = 22; rP.value = 9; }
        update();
      });
    });

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        paused = !paused;
        playBtn.textContent = paused ? 'Play' : 'Pause';
        playBtn.setAttribute('aria-pressed', String(paused));
      });
    }

    update();

    function drawDirArrow(r, dir, color) {
      if (!dir) return;
      var cx = 280, cy = 160;
      var start = -0.35, end = 0.35;
      ctx.strokeStyle = color; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(cx, cy, r, start, end); ctx.stroke();
      var tipA = dir > 0 ? end : start;
      var tx = cx + Math.cos(tipA) * r, ty = cy + Math.sin(tipA) * r;
      var tangent = tipA + (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(tangent) * 6, ty + Math.sin(tangent) * 6);
      ctx.lineTo(tx + Math.cos(tangent + 2.4) * 5, ty + Math.sin(tangent + 2.4) * 5);
      ctx.lineTo(tx + Math.cos(tangent - 2.4) * 5, ty + Math.sin(tangent - 2.4) * 5);
      ctx.closePath(); ctx.fill();
    }

    SimKit.loop(function (dt) {
      var st = state, set = st.set, m = st.members;
      if (!paused) {
        ang.sun += m.sun * VIS * dt; ang.ring += m.ring * VIS * dt; ang.carrier += m.carrier * VIS * dt;
        ang.spin += H.planetSpin(set, m.sun, m.carrier) * VIS * dt;
      }
      ctx.clearRect(0, 0, g.W, g.H); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);
      var k = Math.min(3.2, 112 / set.R);
      var cx = 280, cy = 160;
      drawPlanetary(ctx, cx, cy, set, k, ang, { held: st.held });

      var P = H.planetTeeth(set);
      var roleR = { sun: set.S * k + 11, ring: set.R * k + 22, carrier: (set.S + P) * k };
      drawDirArrow(roleR[st.input], Math.sign(m[st.input]), C.turb);
      drawDirArrow(roleR[st.output], Math.sign(m[st.output]), C.eng);

      text(ctx, 'INPUT: ' + NAMES[st.input].toUpperCase(), 14, 22, { size: 11, color: C.turb, weight: 800 });
      text(ctx, 'HELD: ' + NAMES[st.held].toUpperCase(), 14, 40, { size: 11, color: C.band, weight: 800 });
      text(ctx, 'OUTPUT: ' + NAMES[st.output].toUpperCase(), 14, 58, { size: 11, color: C.eng, weight: 800 });
      text(ctx, 'in ' + fmt(250 * H.RPM) + ' rpm', g.W - 14, 22, { size: 11, align: 'right', color: C.turb });
      text(ctx, 'out ' + fmt(m[st.output] * H.RPM) + ' rpm', g.W - 14, 40, { size: 11, align: 'right', color: C.eng });
      text(ctx, 'ratio ' + fmt(st.ratio, 2) + ' : 1', g.W - 14, 58, { size: 11, align: 'right', weight: 800 });

      var ws = fmt(m.sun * H.RPM), wr = fmt(m.ring * H.RPM), wc = fmt(m.carrier * H.RPM);
      text(ctx, 'Willis: ' + set.S + '×(' + ws + ') + ' + set.R + '×(' + wr + ') = ' + (set.S + set.R) + '×(' + wc + ')  ·  P=' + P + 't',
        cx, g.H - 10, { size: 10, align: 'center', color: C.dim });
    }, { el: cv, maxDt: 0.05 });
  }

  /* ======================= Job 3: Hydraulic Brain Valve Lab ======================= */

  function initValveLab() {
    var cv = $('#hm-valve'); if (!cv) return;
    var g = setup(cv), ctx = g.ctx;
    var inMph = $('#hm-v-mph'), inThr = $('#hm-v-thr'), inSpring = $('#hm-v-spring');
    var oMph = $('#hm-v-mph-out'), oThr = $('#hm-v-thr-out'), oSpring = $('#hm-v-spring-out'), ro = $('#hm-valve-readout');
    var btnResetSpring = $('#hm-v-reset-spring'), btnKick = $('#hm-v-kickdown');

    var valveIdx = 1, isHigh = false, spoolPos = 0, govAngle = 0;

    function readState() {
      var mph = Number(inMph.value), thr = Number(inThr.value) / 100, spring = Number(inSpring.value);
      var vs = H.valveState(valveIdx, mph, thr, isHigh, spring);
      isHigh = vs.nextHigh;
      oMph.textContent = fmt(mph, 1) + ' mph';
      oThr.textContent = Math.round(thr * 100) + '%';
      oSpring.textContent = fmt(spring, 2) + ' psi';

      var gearLo = valveIdx, gearHi = valveIdx + 1;
      var msg = 'Valve ' + gearLo + '→' + gearHi + ': governor ' + fmt(vs.govPsi, 2) + ' psi vs. upshift threshold ' + fmt(vs.upPsi, 2) +
        ' psi (' + fmt(vs.upMph, 1) + ' mph), downshift ' + fmt(vs.downPsi, 2) + ' psi (' + fmt(vs.downMph, 1) + ' mph) · State: ' +
        (isHigh ? 'GEAR ' + gearHi + ' (clutch)' : 'GEAR ' + gearLo + ' (band)');
      if (vs.inHysteresisBand) msg += ' · inside hysteresis band (latched)';
      if (vs.kickdown) msg += ' · KICKDOWN DETENT!';
      ro.textContent = msg;
      return { mph: mph, thr: thr, spring: spring, vs: vs };
    }

    $$('[data-hm-valve]').forEach(function (b) {
      b.addEventListener('click', function () {
        valveIdx = Number(b.getAttribute('data-hm-valve'));
        $$('[data-hm-valve]').forEach(function (x) { x.setAttribute('aria-pressed', String(Number(x.getAttribute('data-hm-valve')) === valveIdx)); });
        inSpring.value = H.SHIFT_VALVES[valveIdx - 1].a.toFixed(2);
        isHigh = false;
        readState();
      });
    });

    inMph.addEventListener('input', readState);
    inThr.addEventListener('input', readState);
    inSpring.addEventListener('input', readState);

    if (btnResetSpring) {
      btnResetSpring.addEventListener('click', function () {
        inSpring.value = H.SHIFT_VALVES[valveIdx - 1].a.toFixed(2);
        readState();
      });
    }
    if (btnKick) {
      btnKick.addEventListener('click', function () {
        valveIdx = 3;
        $$('[data-hm-valve]').forEach(function (x) { x.setAttribute('aria-pressed', String(Number(x.getAttribute('data-hm-valve')) === 3)); });
        inSpring.value = H.SHIFT_VALVES[2].a.toFixed(2);
        isHigh = true;
        inMph.value = 44;
        inThr.value = 95;
        readState();
      });
    }

    var cur = readState();
    ['input'].forEach(function (ev) {
      inMph.addEventListener(ev, function () { cur = readState(); });
      inThr.addEventListener(ev, function () { cur = readState(); });
      inSpring.addEventListener(ev, function () { cur = readState(); });
    });

    SimKit.loop(function (dt) {
      cur = readState();
      var vs = cur.vs;
      var target = isHigh ? 1 : 0;
      spoolPos += (target - spoolPos) * Math.min(1, dt * 12);
      govAngle += (1.2 + cur.mph * 0.22) * dt;

      ctx.clearRect(0, 0, g.W, g.H);
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);

      // Left: spinning flyweight governor
      var gx = 68, gy = 114;
      ctx.strokeStyle = '#4e5e73'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(gx, gy - 46); ctx.lineTo(gx, gy + 46); ctx.stroke();
      var splay = 12 + clamp(cur.mph / 65, 0, 1) * 26;
      ctx.strokeStyle = C.turb; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(gx, gy - 32); ctx.lineTo(gx - splay, gy); ctx.lineTo(gx, gy + 32);
      ctx.moveTo(gx, gy - 32); ctx.lineTo(gx + splay, gy); ctx.lineTo(gx, gy + 32);
      ctx.stroke();
      var fw = Math.sin(govAngle) * 2;
      ctx.fillStyle = C.turb;
      ctx.beginPath(); ctx.arc(gx - splay, gy + fw, 7, 0, TAU); ctx.arc(gx + splay, gy - fw, 7, 0, TAU); ctx.fill();
      text(ctx, 'FLYWEIGHT', gx, 30, { size: 9.5, align: 'center', color: C.turb, weight: 700 });
      text(ctx, 'GOVERNOR', gx, 42, { size: 9.5, align: 'center', color: C.turb, weight: 700 });
      text(ctx, fmt(vs.govPsi, 2) + ' psi', gx, 184, { size: 11, align: 'center', color: C.turb, weight: 800 });

      // Valve body bore
      var bx = 132, bw = 296, by = 78, bh = 72;
      ctx.fillStyle = '#202833'; roundRect(ctx, bx, by, bw, bh, 8); ctx.fill();
      ctx.strokeStyle = '#56677c'; ctx.lineWidth = 2; ctx.stroke();

      // Output oil pipes at top of bore
      var gearLo = valveIdx, gearHi = valveIdx + 1;
      ctx.fillStyle = !isHigh ? C.band : '#2b3645';
      roundRect(ctx, bx + 98, by - 30, 44, 30, 4); ctx.fill();
      text(ctx, 'GEAR ' + gearLo, bx + 120, by - 36, { size: 9.5, align: 'center', color: !isHigh ? C.band : C.dim, weight: 800 });

      ctx.fillStyle = isHigh ? C.clutch : '#2b3645';
      roundRect(ctx, bx + 162, by - 30, 44, 30, 4); ctx.fill();
      text(ctx, 'GEAR ' + gearHi, bx + 184, by - 36, { size: 9.5, align: 'center', color: isHigh ? C.clutch : C.dim, weight: 800 });

      // Governor oil gallery pushing from left
      var spoolX = bx + 54 + spoolPos * 56;
      ctx.fillStyle = 'rgba(92,200,240,0.34)';
      ctx.fillRect(bx + 3, by + 6, spoolX - bx - 3, bh - 12);
      ctx.fillStyle = C.turb;
      ctx.fillRect(gx + 10, gy - 7, bx - gx - 8, 14);

      // Throttle oil gallery pushing from right
      var rightStart = spoolX + 122;
      ctx.fillStyle = 'rgba(255,154,60,0.3)';
      ctx.fillRect(rightStart, by + 6, bx + bw - 3 - rightStart, bh - 12);

      // Machined spool with two lands
      ctx.fillStyle = '#c8d3de';
      roundRect(ctx, spoolX, by + 10, 26, bh - 20, 3); ctx.fill();
      roundRect(ctx, spoolX + 94, by + 10, 26, bh - 20, 3); ctx.fill();
      ctx.fillStyle = '#9aaaba';
      ctx.fillRect(spoolX + 24, by + 27, 72, 18);

      // Return spring coils inside right chamber
      var sp0 = spoolX + 122, sp1 = bx + bw - 8, coils = 6;
      ctx.strokeStyle = '#e8eef4'; ctx.lineWidth = clamp(1.4 + cur.spring * 1.1, 1.4, 4);
      ctx.beginPath();
      for (var ci = 0; ci <= coils * 2; ci++) {
        var sx = sp0 + (sp1 - sp0) * (ci / (coils * 2));
        var sy = by + bh / 2 + (ci === 0 || ci === coils * 2 ? 0 : (ci % 2 === 1 ? -14 : 14));
        if (ci === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Right: Throttle valve & Kickdown detent
      var tx = 492, ty = 114;
      ctx.fillStyle = C.eng;
      ctx.fillRect(bx + bw - 2, ty - 7, tx - (bx + bw) - 18, 14);
      roundRect(ctx, tx - 22, ty - 34, 54, 68, 6);
      ctx.fillStyle = '#202833'; ctx.fill();
      ctx.strokeStyle = vs.kickdown ? C.band : C.eng; ctx.lineWidth = 2; ctx.stroke();
      text(ctx, 'THROTTLE', tx + 5, 30, { size: 9.5, align: 'center', color: C.eng, weight: 700 });
      text(ctx, '+ SPRING', tx + 5, 42, { size: 9.5, align: 'center', color: C.ink, weight: 700 });
      text(ctx, fmt(vs.upPsi, 2) + ' psi', tx + 5, 184, { size: 11, align: 'center', color: C.eng, weight: 800 });
      if (vs.kickdown) {
        roundRect(ctx, tx - 26, ty + 38, 62, 18, 4); ctx.fillStyle = C.band; ctx.fill();
        text(ctx, 'KICKDOWN', tx + 5, ty + 50, { size: 8.5, align: 'center', color: '#fff', weight: 800 });
      }

      // Bottom force comparison & hysteresis bar
      var barX = 24, barW = g.W - 48, barY = 216, maxP = Math.max(8, vs.upPsi * 1.35, vs.govPsi * 1.1);
      ctx.fillStyle = '#10151b'; roundRect(ctx, barX, barY, barW, 14, 4); ctx.fill();
      // Hysteresis zone shading
      var xDown = barX + barW * clamp(vs.downPsi / maxP, 0, 1);
      var xUp = barX + barW * clamp(vs.upPsi / maxP, 0, 1);
      ctx.fillStyle = 'rgba(217, 162, 58, 0.28)';
      ctx.fillRect(xDown, barY, Math.max(2, xUp - xDown), 14);
      // Governor bar
      ctx.fillStyle = C.turb;
      roundRect(ctx, barX, barY + 2, Math.max(2, barW * clamp(vs.govPsi / maxP, 0, 1)), 10, 3); ctx.fill();
      // Threshold markers
      ctx.strokeStyle = C.dim; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(xDown, barY - 4); ctx.lineTo(xDown, barY + 18); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.eng; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(xUp, barY - 4); ctx.lineTo(xUp, barY + 18); ctx.stroke();

      text(ctx, 'Downshift: ' + fmt(vs.downMph, 1) + ' mph (' + fmt(vs.downPsi, 2) + ' psi)', barX, 248, { size: 9.5, color: C.dim });
      text(ctx, 'Upshift: ' + fmt(vs.upMph, 1) + ' mph (' + fmt(vs.upPsi, 2) + ' psi)', barX + barW, 248, { size: 9.5, align: 'right', color: C.eng });
      if (vs.inHysteresisBand) {
        text(ctx, 'HYSTERESIS BAND (holds ' + (isHigh ? 'Gear ' + gearHi : 'Gear ' + gearLo) + ')', g.W / 2, 206, { size: 9.5, align: 'center', color: C.brass, weight: 800 });
      } else {
        text(ctx, isHigh ? 'HIGH: oil routed to Clutch (' + gearHi + ')' : 'LOW: oil routed to Band (' + gearLo + ')', g.W / 2, 206, { size: 9.5, align: 'center', color: isHigh ? C.clutch : C.band, weight: 800 });
      }
    }, { el: cv, maxDt: 0.05 });
  }

  function init() { initDrive(); initCoupling(); initPlanetary(); initValveLab(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
