/* Materials & Strength · Hook Load Lab
   A printed wall hook (5 mm back plate, 8 mm wide, 5 mm-deep arm, 30 mm reach) holds a bucket.
   Students choose print orientation, wall count, infill, inside-corner fillet and filament, then
   compare an estimated *relative* strength and see where it would break.

   The model is a comparison, not a forecast. What it does:
   - Bending strength of the arm/plate section ∝ I / (h/2). The section is a solid skin of
     walls × 0.45 mm (we assume top/bottom layers are set to about the same thickness) around an
     infill core that adds (infill fraction)^1.5 of its own I: sparse, crossing infill lines carry
     less than their share.
   - The inside corner multiplies peak stress by a fillet factor Kt = 1 + 0.27 / sqrt(r / h)
     (r ≥ 0.2 mm, since a nozzle can't print a perfectly sharp corner), a fit to the shape of
     Peterson's shoulder-fillet charts in bending.
   - A leg whose pull crosses the layers keeps only part of its strength: 0.5 for PLA, 0.6 for
     PETG (published PLA tests mostly fall between about 25% and 75%).
   - TPU is so flexible that the arm droops until the bucket slides off long before it breaks.
   Reference hook (index 100): PLA, lying on its side, 3 walls, 20% infill, 2 mm fillet. */
(function () {
  'use strict';

  var LINE = 0.45, B = 8, H = 5, REACH = 30;
  var MATERIALS = {
    pla:  { name: 'PLA',  strength: 1.0,  across: 0.5, stiff: 1.0,   flexible: false },
    petg: { name: 'PETG', strength: 0.85, across: 0.6, stiff: 0.45,  flexible: false },
    tpu:  { name: 'TPU',  strength: 0.5,  across: 0.6, stiff: 0.012, flexible: true }
  };
  var ORIENT = {
    side:    { name: 'Lying on its side', arm: false, plate: false, support: 'None: the whole L sits flat on the bed.' },
    upright: { name: 'Standing, as it hangs', arm: false, plate: true, support: 'None: the bottom edge sits on the bed.' },
    back:    { name: 'On its back', arm: true, plate: false, support: 'A small support under the hook\'s lip, which sticks out sideways.' }
  };
  var REF = { orient: 'side', walls: 3, infill: 20, fillet: 2, material: 'pla' };
  var DROOP_PX = 55; // drawn droop at which the bucket slides off a TPU hook

  function section(walls, infill) {
    var s = Math.min(walls * LINE, H / 2, B / 2);
    var bi = Math.max(0, B - 2 * s), hi = Math.max(0, H - 2 * s);
    var iSolid = B * H * H * H / 12, iCore = bi * hi * hi * hi / 12;
    var p = Math.max(0, Math.min(1, infill / 100));
    var I = iSolid - iCore + Math.pow(p, 1.5) * iCore;
    var area = B * H - bi * hi + p * bi * hi;
    return { skin: s, I: I, iFrac: I / iSolid, areaFrac: area / (B * H), solid: hi <= 0.001 };
  }
  function kt(r) { var re = Math.max(r, 0.2); return 1 + 0.27 / Math.sqrt(re / H); }

  function evaluate(cfg) {
    var m = MATERIALS[cfg.material], o = ORIENT[cfg.orient], sec = section(cfg.walls, cfg.infill);
    var k = kt(cfg.fillet);
    var base = m.strength * sec.iFrac / (k * (REACH - Math.min(cfg.fillet, 4)));
    var armCap = base * (o.arm ? m.across : 1);
    var plateCap = base * (o.plate ? m.across : 1);
    var cap = Math.min(armCap, plateCap);
    var where = o.arm ? 'arm' : (o.plate ? 'plate' : 'corner');
    return { cap: cap, where: where, sec: sec, kt: k, m: m, o: o };
  }
  var refRaw = evaluate(REF).cap;

  function model(cfg) {
    var e = evaluate(cfg);
    var index = 100 * e.cap / refRaw;
    var mode = 'snap';
    if (e.m.flexible) {
      // droop (px) = 0.06 × load / (stiffness × I fraction); bucket slides off at DROOP_PX
      var slide = DROOP_PX * e.m.stiff * e.sec.iFrac / 0.06;
      if (slide < index) { index = slide; mode = 'droop'; }
    } else if (cfg.material === 'petg') mode = 'tear';
    var refArea = section(REF.walls, REF.infill).areaFrac;
    return {
      index: index,
      plastic: 100 * e.sec.areaFrac / refArea,
      perPlastic: 100 * (index / 100) / (e.sec.areaFrac / refArea),
      where: e.where, mode: mode, kt: e.kt, sec: e.sec,
      support: e.o.support, orientName: e.o.name, materialName: e.m.name
    };
  }
  function droopFor(cfg, load) {
    var e = evaluate(cfg);
    return Math.min(90, 0.06 * load / (e.m.stiff * e.sec.iFrac));
  }

  window.MaterialsStrength = { model: model, kt: kt, section: section, REF: REF };

  var root = document.querySelector('[data-ms-lab]');
  if (!root) return;
  var canvas = root.querySelector('canvas');
  var $ = function (sel) { return root.querySelector(sel); };
  var inputs = {
    walls: $('#ms-walls'), infill: $('#ms-infill'), fillet: $('#ms-fillet'), material: $('#ms-material')
  };
  var out = { walls: $('#ms-walls-out'), infill: $('#ms-infill-out'), fillet: $('#ms-fillet-out') };
  var status = $('[data-ms-status]');
  var stats = $('[data-ms-stats]');
  var checks = $('[data-ms-checks]');
  var compareBody = $('[data-ms-compare]');

  function readCfg() {
    var o = root.querySelector('input[name="ms-orient"]:checked');
    return {
      orient: o ? o.value : 'side',
      walls: +inputs.walls.value,
      infill: +inputs.infill.value,
      fillet: +inputs.fillet.value,
      material: inputs.material.value
    };
  }
  function setCfg(cfg) {
    var r = root.querySelector('input[name="ms-orient"][value="' + cfg.orient + '"]');
    if (r) r.checked = true;
    inputs.walls.value = cfg.walls; inputs.infill.value = cfg.infill;
    inputs.fillet.value = cfg.fillet; inputs.material.value = cfg.material;
  }

  var WHERE_TEXT = {
    corner: 'Through the inside corner, tearing across the plastic roads: a rough, jagged break.',
    plate: 'The back plate splits along one layer, right where the arm joins: a flat, smooth break.',
    arm: 'The arm snaps off along one layer at its root: a flat, smooth break.'
  };
  function whereText(r) {
    if (r.mode === 'droop') return 'It doesn\'t snap. The arm bends down until the bucket slides off the tip.';
    var t = WHERE_TEXT[r.where];
    if (r.mode === 'tear') t += ' PETG bends and turns white at that spot before it tears.';
    return t;
  }

  // ---------- drawing ----------
  var kit = window.SimKit ? window.SimKit.canvas2d(canvas, { onResize: function () { draw(); } }) : null;
  var ctx = kit ? kit.ctx : canvas.getContext('2d');
  var VW = 820, VH = 440;
  var pal;
  function luminance(c) {
    var m = /rgba?\(([^)]+)\)/.exec(c), r, g, b;
    if (m) { var p = m[1].split(',').map(parseFloat); r = p[0]; g = p[1]; b = p[2]; }
    else if (/^#([0-9a-f]{6})$/i.test(c)) { r = parseInt(c.substr(1, 2), 16); g = parseInt(c.substr(3, 2), 16); b = parseInt(c.substr(5, 2), 16); }
    else return 1;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  function makePalette() {
    var dark = false;
    try {
      var bg = window.SimKit ? window.SimKit.theme.colors().bg : getComputedStyle(document.documentElement).getPropertyValue('--bg');
      dark = luminance(String(bg).trim()) < 0.4 || document.documentElement.getAttribute('data-lighting') === 'night';
    } catch (e) { /* default light */ }
    if (document.documentElement.hasAttribute('data-print-mode')) dark = false;
    return dark ? {
      bg: '#16202c', panel: '#1e2a38', ink: '#e8eef5', muted: '#a9b6c6', line: '#3b4a5c',
      wall: '#2b3746', wallLine: '#5b6b7e', plastic: '#f6c453', plasticDark: '#c9861a', outline: '#fde68a',
      bucket: '#8fa1b5', washer: '#cbd5e1', hot: '220,38,38', good: '#4ade80', bad: '#f87171', accent: '#38bdf8', support: '#94a3b8'
    } : {
      bg: '#f8fafc', panel: '#eef2f6', ink: '#0f172a', muted: '#475569', line: '#cbd5e1',
      wall: '#e5e7eb', wallLine: '#9ca3af', plastic: '#fcd34d', plasticDark: '#b45309', outline: '#78350f',
      bucket: '#94a3b8', washer: '#64748b', hot: '220,38,38', good: '#15803d', bad: '#b91c1c', accent: '#0e7490', support: '#94a3b8'
    };
  }
  pal = makePalette();
  if (window.SimKit) window.SimKit.theme.onChange(function () { pal = makePalette(); draw(); });

  // hook outline in local px (6 px per mm): plate x 0..30, y 0..240; arm y 210..240 to x 210; lip x 180..210 from y 162
  function outline(R) {
    var pts = [[0, 0], [30, 0]];
    if (R > 0.5) {
      pts.push([30, 210 - R]);
      for (var i = 1; i < 12; i++) {
        var a = Math.PI - (i / 12) * (Math.PI / 2);
        pts.push([30 + R + R * Math.cos(a), 210 - R + R * Math.sin(a)]);
      }
      pts.push([30 + R, 210]);
    } else pts.push([30, 210]);
    pts.push([180, 210], [180, 162], [210, 162], [210, 240], [0, 240]);
    return densify(pts, 6);
  }
  function densify(pts, step) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      var n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (var j = 0; j < n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    return out;
  }
  function warper(d) {
    return function (x, y) {
      if (x <= 30 || !d) return [x, y];
      var t = (x - 30) / 150;
      return [x, y + d * t * t * (3 - t) / 2];
    };
  }
  function tracePoly(pts, w, close) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var p = w(pts[i][0], pts[i][1]);
      if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
    }
    if (close) ctx.closePath();
  }
  function line(w, x1, y1, x2, y2) {
    tracePoly(densify([[x1, y1], [x2, y2]], 6).concat([[x2, y2]]), w, false);
    ctx.stroke();
  }

  function drawHookBody(cfg, R, w) {
    var pts = outline(R);
    ctx.save();
    tracePoly(pts, w, true);
    ctx.fillStyle = pal.plastic; ctx.fill();
    ctx.clip();
    ctx.lineWidth = 1.2;
    var i;
    if (cfg.orient === 'side') {
      var p = cfg.infill / 100;
      if (p > 0) {
        var gap = Math.max(5, (2 * LINE / p) * 6);
        ctx.strokeStyle = pal.plasticDark; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
        for (i = -260; i < 260; i += gap) { line(w, i, 250, i + 250, 0); line(w, i, 0, i + 250, 250); }
        ctx.globalAlpha = 1;
      }
      var band = LINE * 6;
      for (i = Math.min(cfg.walls, 6); i >= 1; i--) {
        tracePoly(pts, w, true);
        ctx.lineWidth = 2 * i * band;
        ctx.strokeStyle = i % 2 ? pal.plasticDark : pal.plastic;
        ctx.stroke();
      }
    } else if (cfg.orient === 'upright') {
      ctx.strokeStyle = pal.plasticDark;
      for (i = 3; i < 240; i += 6) line(w, -5, i, 215, i);
    } else {
      ctx.strokeStyle = pal.plasticDark;
      for (i = 3; i < 214; i += 6) line(w, i, -5, i, 245);
    }
    ctx.restore();
    tracePoly(pts, w, true);
    ctx.lineWidth = 2.2; ctx.strokeStyle = pal.outline; ctx.stroke();
  }

  function weakSpot(where, R) {
    if (where === 'plate') return [16, 206 - R];
    if (where === 'arm') return [36 + R * 0.6, 220];
    return [30 + R * 0.3 - 2, 212 - R * 0.3];
  }
  function splitPolys(where, R) {
    var c = [30 + R * 0.29, 210 - R * 0.29];
    if (where === 'plate') {
      var yb = 209 - R;
      return { keep: [[-60, -60], [320, -60], [320, yb], [-60, yb]], fall: [[-60, yb], [320, yb], [320, 460], [-60, 460]], crack: [[0, yb], [30, yb]], pivot: [30, yb] };
    }
    if (where === 'arm') {
      var xb = 30 + Math.max(1, R * 0.4);
      return { keep: [[-60, -60], [xb, -60], [xb, 460], [-60, 460]], fall: [[xb, -60], [320, -60], [320, 460], [xb, 460]], crack: [[xb, 210 - R * 0.6], [xb, 240]], pivot: [xb, 240] };
    }
    var jag = [c, [c[0] - 7, c[1] + 8], [c[0] - 4, c[1] + 14], [c[0] - 13, c[1] + 21], [c[0] - 10, c[1] + 27]];
    var end = [Math.max(4, c[0] - 22), 240];
    jag.push(end);
    var keep = [[-60, -60], [c[0], -60]].concat(jag).concat([[end[0], 460], [-60, 460]]);
    var fall = [[c[0], -60], [320, -60], [320, 460], [end[0], 460]].concat(jag.slice().reverse());
    return { keep: keep, fall: fall, crack: jag, pivot: end };
  }
  function clipPoly(poly) {
    ctx.beginPath();
    poly.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.closePath(); ctx.clip();
  }

  function drawBucket(x, y, load) {
    ctx.strokeStyle = pal.muted; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x, y + 40, x - 4, y + 60, x - 34, y + 86);
    ctx.moveTo(x, y); ctx.bezierCurveTo(x, y + 40, x + 4, y + 60, x + 34, y + 86); ctx.stroke();
    var top = y + 86;
    ctx.beginPath(); ctx.moveTo(x - 40, top); ctx.lineTo(x + 40, top); ctx.lineTo(x + 32, top + 62); ctx.lineTo(x - 32, top + 62); ctx.closePath();
    ctx.fillStyle = pal.bucket; ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; ctx.stroke();
    var n = Math.min(36, Math.floor(load / 4));
    ctx.fillStyle = pal.washer;
    for (var i = 0; i < n; i++) {
      var row = Math.floor(i / 6), col = i % 6;
      ctx.beginPath(); ctx.ellipse(x - 25 + col * 10, top + 54 - row * 7, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  var anim = null; // { load, rate, broken, t, cap, mode, droop }
  var loop = null;

  function draw() {
    if (!kit) return;
    var W = kit.width, Hh = kit.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var dpr = canvas.width / Math.max(1, W);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, Hh);
    var s = Math.min(W / VW, Hh / VH);
    ctx.translate((W - VW * s) / 2, (Hh - VH * s) / 2);
    ctx.scale(s, s);
    var cfg = readCfg(), r = model(cfg), R = cfg.fillet * 6;
    var load = anim ? anim.load : 0;

    // wall
    ctx.fillStyle = pal.wall; ctx.fillRect(28, 14, 22, 300);
    ctx.strokeStyle = pal.wallLine; ctx.lineWidth = 2;
    for (var y = 14; y < 314; y += 12) { ctx.beginPath(); ctx.moveTo(28, y + 12); ctx.lineTo(50, y); ctx.stroke(); }
    ctx.fillStyle = pal.muted; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('wall', 39, 330);

    ctx.save();
    ctx.translate(50, 40);
    var droop = anim && !anim.broken ? (anim.droop || 0) : (anim && anim.mode === 'droop' ? anim.droop : 0);
    var w = warper(droop);
    var bx = 168, bucketGone = anim && anim.broken;
    if (anim && anim.broken && anim.mode !== 'droop') {
      var sp = splitPolys(r.where, R), ft = anim.t;
      ctx.save(); clipPoly(sp.keep); drawHookBody(cfg, R, w); ctx.restore();
      ctx.save();
      ctx.translate(sp.pivot[0], sp.pivot[1] + 260 * ft * ft);
      ctx.rotate((r.where === 'plate' ? 0.35 : 0.9) * ft);
      ctx.translate(-sp.pivot[0], -sp.pivot[1]);
      ctx.save(); clipPoly(sp.fall); drawHookBody(cfg, R, w); ctx.restore();
      drawBucket(bx, 210, load);
      ctx.restore();
      ctx.strokeStyle = pal.bad; ctx.lineWidth = 3.5;
      tracePoly(sp.crack, function (a, b) { return [a, b]; }, false); ctx.stroke();
    } else {
      drawHookBody(cfg, R, w);
      var tipY = w(bx, 210)[1];
      if (anim && anim.mode === 'droop' && anim.broken) {
        ctx.save(); ctx.translate(14 * anim.t, 300 * anim.t * anim.t); drawBucket(bx, tipY, load); ctx.restore();
      } else drawBucket(bx, tipY, load);
    }
    // weak spot marker and heat
    var ws = weakSpot(r.where, R);
    if (r.mode !== 'droop' && !(bucketGone)) {
      var heat = anim ? Math.min(1, load / Math.max(1, r.index)) : 0;
      if (heat > 0) {
        var g = ctx.createRadialGradient(ws[0], ws[1], 1, ws[0], ws[1], 34);
        g.addColorStop(0, 'rgba(' + pal.hot + ',' + (0.9 * heat) + ')');
        g.addColorStop(1, 'rgba(' + pal.hot + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ws[0], ws[1], 34, 0, Math.PI * 2); ctx.fill();
      }
      ctx.setLineDash([4, 3]); ctx.strokeStyle = pal.bad; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ws[0], ws[1], 13, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pal.bad; ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('weak spot', ws[0] + 46, ws[1] - 34);
      ctx.beginPath(); ctx.moveTo(ws[0] + 10, ws[1] - 10); ctx.lineTo(ws[0] + 44, ws[1] - 30); ctx.strokeStyle = pal.bad; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (anim && anim.broken) {
      ctx.fillStyle = pal.bad; ctx.font = '800 26px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(anim.mode === 'droop' ? 'SLID OFF' : 'SNAP!', 60, 120);
    }
    ctx.restore();

    ctx.fillStyle = pal.muted; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(cfg.orient === 'side' ? 'Cut-away: walls and infill' : 'Layer lines (drawn 5× thicker)', 60, 26);

    drawPrinterInset(cfg, 330, 14);
    drawSectionInset(cfg, 590, 14);
    drawMeter(r, load, 330, 250);
  }

  function panel(x, y, w, h, title) {
    ctx.fillStyle = pal.panel; ctx.strokeStyle = pal.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 10) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = pal.ink; ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(title, x + 12, y + 22);
  }

  function drawPrinterInset(cfg, x, y) {
    panel(x, y, 240, 218, 'How it sat on the printer');
    var bedY = y + 196;
    ctx.strokeStyle = pal.muted; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 14, bedY); ctx.lineTo(x + 226, bedY); ctx.stroke();
    var pts = outline(cfg.fillet * 6), s, i;
    ctx.save();
    if (cfg.orient === 'side') {
      s = 0.62;
      for (i = 4; i >= 0; i--) {
        ctx.save();
        ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([s, 0, -s * 0.9, s * 0.32, x + 120, bedY - 84 - i * 5])));
        tracePoly(pts, function (a, b) { return [a, b]; }, true);
        ctx.fillStyle = i % 2 ? pal.plastic : pal.plasticDark; ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = pal.muted; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('every layer is the whole L', x + 14, y + 44);
    } else if (cfg.orient === 'upright') {
      s = 0.6;
      ctx.translate(x + 60, bedY - 240 * s); ctx.scale(s, s);
      tracePoly(pts, function (a, b) { return [a, b]; }, true);
      ctx.fillStyle = pal.plastic; ctx.fill(); ctx.save(); ctx.clip();
      ctx.strokeStyle = pal.plasticDark; ctx.lineWidth = 2;
      for (i = 4; i < 240; i += 10) { ctx.beginPath(); ctx.moveTo(-5, i); ctx.lineTo(215, i); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = pal.outline; ctx.lineWidth = 2; tracePoly(pts, function (a, b) { return [a, b]; }, true); ctx.stroke();
    } else {
      s = 0.6;
      ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([0, -s, s, 0, x + 40, bedY])));
      // support under the lip: local x 30..180 below lip (y 162..210)
      ctx.fillStyle = pal.support; ctx.globalAlpha = 0.6;
      for (i = 166; i < 208; i += 8) ctx.fillRect(30, i, 150, 3);
      ctx.globalAlpha = 1;
      tracePoly(pts, function (a, b) { return [a, b]; }, true);
      ctx.fillStyle = pal.plastic; ctx.fill(); ctx.save(); ctx.clip();
      ctx.strokeStyle = pal.plasticDark; ctx.lineWidth = 2;
      for (i = 4; i < 214; i += 10) { ctx.beginPath(); ctx.moveTo(i, -5); ctx.lineTo(i, 245); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = pal.outline; ctx.lineWidth = 2; tracePoly(pts, function (a, b) { return [a, b]; }, true); ctx.stroke();
    }
    ctx.restore();
    if (cfg.orient === 'back') {
      ctx.fillStyle = pal.muted; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('grey = support', x + 150, y + 44);
    }
  }

  function drawSectionInset(cfg, x, y) {
    panel(x, y, 220, 218, 'Arm cut in half');
    var sc = 22, w = B * sc, h = H * sc, ox = x + (220 - w) / 2, oy = y + 52;
    ctx.fillStyle = pal.bg; ctx.fillRect(ox, oy, w, h);
    var p = cfg.infill / 100, skin = Math.min(cfg.walls * LINE, H / 2) * sc, i;
    if (p > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, w, h); ctx.clip();
      var gap = Math.max(10, (2 * LINE / p) * sc);
      ctx.strokeStyle = pal.plastic; ctx.lineWidth = LINE * sc;
      for (i = -h; i < w + h; i += gap) {
        ctx.beginPath(); ctx.moveTo(ox + i, oy + h); ctx.lineTo(ox + i + h, oy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox + i, oy); ctx.lineTo(ox + i + h, oy + h); ctx.stroke();
      }
      ctx.restore();
    }
    for (i = 0; i < Math.min(cfg.walls, 6); i++) {
      var o = i * LINE * sc + LINE * sc / 2;
      if (o > Math.min(w, h) / 2) break;
      ctx.strokeStyle = i % 2 ? pal.plastic : pal.plasticDark; ctx.lineWidth = LINE * sc;
      ctx.strokeRect(ox + o, oy + o, w - 2 * o, h - 2 * o);
    }
    ctx.strokeStyle = pal.outline; ctx.lineWidth = 1.5; ctx.strokeRect(ox, oy, w, h);
    ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = pal.bad; ctx.fillText('top: pulled hardest', x + 110, oy - 8);
    ctx.fillStyle = pal.accent; ctx.fillText('bottom: pushed hardest', x + 110, oy + h + 18);
    ctx.fillStyle = pal.muted; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('skin ' + (skin / sc).toFixed(2) + ' mm of 2.5 mm', x + 110, oy + h + 40);
    ctx.fillText('8 × 5 mm, to scale', x + 110, oy + h + 58);
  }

  function drawMeter(r, load, x, y) {
    panel(x, y, 480, 172, 'Comparison strength (not a forecast)');
    var bx = x + 16, bw = 448, by = y + 46, bh = 28, max = 150;
    ctx.fillStyle = pal.line; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = pal.accent; ctx.fillRect(bx, by, bw * Math.min(1, r.index / max), bh);
    var rx = bx + bw * 100 / max;
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(rx, by - 6); ctx.lineTo(rx, by + bh + 6); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = pal.ink; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('reference hook = 100', rx, by + bh + 20);
    ctx.font = '800 30px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(Math.round(r.index), bx, y + 128);
    ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = pal.muted;
    ctx.fillText(r.mode === 'droop' ? 'droops before it breaks' : 'strength index', bx + 64, y + 118);
    ctx.fillText('plastic used: ' + Math.round(r.plastic) + ' · strength per plastic: ' + Math.round(r.perPlastic), bx + 64, y + 136);
    // load bar
    var ly = y + 150;
    ctx.fillStyle = pal.line; ctx.fillRect(bx, ly, bw, 8);
    if (load > 0) { ctx.fillStyle = anim && anim.broken ? pal.bad : pal.ink; ctx.fillRect(bx, ly, bw * Math.min(1, load / max), 8); }
    ctx.fillStyle = pal.muted; ctx.textAlign = 'right'; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(load > 0 ? 'load in bucket: ' + Math.round(load) : 'press Hang the bucket', bx + bw, y + 128);
  }

  // ---------- readouts ----------
  function li(text, ok) {
    var el = document.createElement('li');
    el.textContent = text;
    if (ok != null) el.setAttribute('data-ok', ok ? 'true' : 'false');
    return el;
  }
  function update() {
    var cfg = readCfg(), r = model(cfg);
    out.walls.textContent = cfg.walls + ' (' + (cfg.walls * LINE).toFixed(2) + ' mm)';
    out.infill.textContent = cfg.infill + '%';
    out.fillet.textContent = cfg.fillet === 0 ? 'sharp' : cfg.fillet + ' mm';
    stats.innerHTML = '';
    [
      ['Strength index', Math.round(r.index) + (r.mode === 'droop' ? ' (bucket slides off)' : '')],
      ['Plastic used', Math.round(r.plastic) + ' (reference = 100)'],
      ['Strength per plastic', Math.round(r.perPlastic)],
      ['Corner factor', '×' + r.kt.toFixed(2) + ' peak stress'],
      ['Breaks', whereText(r)],
      ['Supports', r.support]
    ].forEach(function (row) {
      var d = document.createElement('div');
      var dt = document.createElement('dt'); dt.textContent = row[0];
      var dd = document.createElement('dd'); dd.textContent = row[1];
      d.appendChild(dt); d.appendChild(dd); stats.appendChild(d);
    });
    checks.innerHTML = '';
    checks.appendChild(li(cfg.walls >= 2 ? 'At least 2 walls (' + (cfg.walls * LINE).toFixed(2) + ' mm skin)' : 'Only 1 wall: thinner than 2 nozzle widths, may print with gaps', cfg.walls >= 2));
    checks.appendChild(li(cfg.orient === 'side' ? 'Pull runs along the layers' : 'Pull crosses a layer line at the corner', cfg.orient === 'side'));
    checks.appendChild(li(cfg.fillet >= 1 ? 'Inside corner has a fillet' : 'Sharp inside corner concentrates stress', cfg.fillet >= 1));
    checks.appendChild(li(cfg.material === 'tpu' ? 'TPU is too bendy for a hook that must hold its shape' : (cfg.material === 'petg' ? 'PETG: tougher, bends before it breaks' : 'PLA: stiff, but snaps with little warning; softens near 55–60 °C'), cfg.material !== 'tpu'));
    if (!anim) status.textContent = r.orientName + ', ' + cfg.walls + ' walls, ' + cfg.infill + '% infill, ' + (cfg.fillet ? cfg.fillet + ' mm fillet' : 'sharp corner') + ', ' + r.materialName + ': strength index ' + Math.round(r.index) + '. ' + whereText(r);
    draw();
  }

  function stopAnim() { if (loop) { loop.stop(); loop = null; } }
  function startTest() {
    stopAnim();
    var cfg = readCfg(), r = model(cfg);
    anim = { load: 0, rate: Math.max(28, r.index / 2.6), broken: false, t: 0, mode: r.mode, droop: 0, cap: r.index, cfg: cfg };
    status.textContent = 'Adding washers to the bucket…';
    var step = function (dt) {
      dt = Math.min(dt, 0.05);
      if (!anim.broken) {
        anim.load = Math.min(anim.cap, anim.load + anim.rate * dt);
        var d = droopFor(anim.cfg, anim.load);
        if (anim.mode === 'tear' && anim.load > 0.7 * anim.cap) d += 10 * (anim.load / anim.cap - 0.7) / 0.3;
        anim.droop = d;
        if (anim.load >= anim.cap - 1e-6) {
          anim.broken = true;
          status.textContent = (anim.mode === 'droop' ? 'The bucket slid off at load ' : 'It broke at load ') + Math.round(anim.cap) + ' (reference hook = 100). ' + whereText(r);
        }
      } else {
        anim.t += dt;
        if (anim.t > 1.6) { stopAnim(); }
      }
      draw();
    };
    if (window.SimKit) loop = window.SimKit.loop(step, { el: window.SimKit.stage(canvas) });
    else { anim.load = anim.cap; anim.broken = true; anim.t = 1.6; draw(); }
  }
  function reset() { stopAnim(); anim = null; update(); }

  root.addEventListener('input', function (e) {
    if (e.target.closest('[data-ms-controls]')) { stopAnim(); anim = null; update(); }
  });
  root.addEventListener('change', function (e) {
    if (e.target.closest('[data-ms-controls]')) { stopAnim(); anim = null; update(); }
  });
  $('[data-ms-test]').addEventListener('click', startTest);
  $('[data-ms-reset]').addEventListener('click', reset);
  root.querySelectorAll('[data-ms-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setCfg(JSON.parse(btn.getAttribute('data-ms-preset')));
      reset();
    });
  });
  var compared = 0;
  $('[data-ms-add]').addEventListener('click', function () {
    var cfg = readCfg(), r = model(cfg);
    if (compared >= 8) compareBody.removeChild(compareBody.firstElementChild);
    var tr = document.createElement('tr');
    [r.orientName, cfg.walls, cfg.infill + '%', cfg.fillet ? cfg.fillet + ' mm' : 'sharp', r.materialName, Math.round(r.index), Math.round(r.plastic),
      r.mode === 'droop' ? 'slides off' : r.where === 'corner' ? 'corner, jagged' : r.where === 'plate' ? 'plate layer' : 'arm layer']
      .forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    compareBody.appendChild(tr);
    compared = compareBody.children.length;
    var empty = root.querySelector('[data-ms-compare-empty]');
    if (empty) empty.hidden = true;
  });
  $('[data-ms-clear]').addEventListener('click', function () {
    compareBody.innerHTML = ''; compared = 0;
    var empty = root.querySelector('[data-ms-compare-empty]');
    if (empty) empty.hidden = false;
  });

  update();

  // ---------- load-test record sheet ----------
  var sheet = document.querySelector('[data-ms-record]');
  if (sheet) {
    var calc = function () {
      ['a', 'b'].forEach(function (k) {
        var g = parseFloat(sheet.querySelector('#ms-rec-' + k + '-load').value);
        var n = sheet.querySelector('[data-ms-newtons="' + k + '"]');
        n.textContent = isFinite(g) && g > 0 ? (g / 1000 * 9.81).toFixed(1) + ' N' : '—';
      });
      var a = parseFloat(sheet.querySelector('#ms-rec-a-load').value);
      var b = parseFloat(sheet.querySelector('#ms-rec-b-load').value);
      var res = sheet.querySelector('[data-ms-ratio]');
      if (a > 0 && b > 0) {
        var hi = Math.max(a, b), lo = Math.min(a, b);
        res.textContent = 'Hook ' + (a >= b ? 'A' : 'B') + ' held ' + (hi / lo).toFixed(2) + '× as much as hook ' + (a >= b ? 'B' : 'A') + '. Compare that with the lab\'s index ratio, then explain any difference.';
      } else res.textContent = 'Enter both break loads (grams) to compare.';
    };
    sheet.addEventListener('input', calc);
    calc();
  }
})();
