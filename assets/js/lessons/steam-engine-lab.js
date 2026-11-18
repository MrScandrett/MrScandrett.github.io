/* James Watt lesson: Engine House lab, Newcomen's Dilemma chart, and the coal curve.
   The physics is in steam-engine-model.js (tested); this file only draws and wires
   controls. Needs sim-kit.js. */
(function () {
  'use strict';
  var M = window.SteamEngineModel;
  if (!window.SimKit || !M) return;

  var colors = SimKit.theme.colors();
  var $ = function (id) { return document.getElementById(id); };

  /* ── Shared helpers ─────────────────────────────────────────── */
  function mix(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    var g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    var bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  /* 25 °C blue → 60 °C violet → 100 °C red */
  function heat(tC) {
    var t = Math.max(0, Math.min(1, (tC - 25) / 75));
    return t < 0.5 ? mix('#2563eb', '#9333ea', t / 0.5) : mix('#9333ea', '#dc2626', (t - 0.5) / 0.5);
  }
  function fmt(n, d) { return n.toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
  function isDark() {
    var m = /rgb\D*(\d+)\D+(\d+)\D+(\d+)/.exec(getComputedStyle(document.body).backgroundColor || '');
    var hex = /^#([0-9a-f]{6})$/i.exec(colors.bg || '');
    var r, g, b;
    if (hex) { var p = parseInt(hex[1], 16); r = p >> 16 & 255; g = p >> 8 & 255; b = p & 255; }
    else if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
    else return false;
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
  }

  /* ── Engine House ───────────────────────────────────────────── */
  var engineCanvas = $('se-engine');
  var chillIn = $('se-chill'), chillOut = $('se-chill-out'), chillLabel = $('se-chill-label');
  var slowIn = $('se-slow'), playBtn = $('se-play'), resetBtn = $('se-reset');
  var readout = $('se-readout'), phaseOut = $('se-phase');
  var radios = document.querySelectorAll('input[name="se-engine"]');
  var DEPTH = 60;  // m of mine shaft
  var chills = { newcomen: 60, watt: 60 };
  var engine = 'newcomen';
  var u = 0, playing = true;
  var totals = { strokes: 0, coal: 0, water: 0 };

  function current() { return M.stroke(engine, chills[engine]); }

  var PHASE_TEXT = {
    newcomen: {
      steam: '1 · Steam fills the cylinder. The heavy pump rods pull the beam down on the mine side, so the piston rises.',
      condense: '2 · A jet of cold water sprays inside the cylinder. The steam condenses, and the walls cool down with it.',
      power: '3 · Power stroke: the air above the open piston pushes it into the near-vacuum and lifts water from the mine.',
      rest: '4 · Next stroke, the new steam must first heat the cold iron back to 100 °C. Most of it condenses doing that.'
    },
    watt: {
      steam: '1 · Steam fills the cylinder. Its steam jacket keeps the walls at about 100 °C the whole time.',
      condense: '2 · A valve opens to the separate condenser. Steam rushes in there and condenses in the cold water.',
      power: '3 · Power stroke: steam above the closed piston pushes it down into the vacuum. The air pump clears the condenser.',
      rest: '4 · The cylinder never cooled, so the next steam fills it instead of condensing on cold iron.'
    }
  };

  function updateReadout() {
    var s = current();
    chillOut.textContent = fmt(chills[engine]) + ' °C';
    chillLabel.textContent = engine === 'watt' ? 'Condenser temperature' : 'How cold the spray leaves the cylinder';
    readout.innerHTML =
      '<strong>' + (engine === 'watt' ? 'Watt engine' : 'Newcomen engine') + ', each stroke:</strong> ' +
      'push ' + fmt(s.forceKN, 1) + ' kN on the piston · work ' + fmt(s.workKJ) + ' kJ · ' +
      'steam ' + fmt(s.steam, 2) + ' kg, of which <strong>' + fmt(s.wasteShare * 100) + '%</strong> only reheated cold iron · ' +
      'coal ' + fmt(s.coalKg, 2) + ' kg · duty <strong>' + fmt(s.duty, 1) + ' million</strong> ft·lb per bushel · about ' +
      fmt(s.horsepower) + ' hp at ' + M.STROKES_PER_MIN + ' strokes a minute.';
    $('se-bar-fill').style.width = (s.fillSteam / 3.4 * 100) + '%';
    $('se-bar-waste').style.width = (s.wasteSteam / 3.4 * 100) + '%';
    $('se-bar-fill-n').textContent = fmt(s.fillSteam, 2) + ' kg';
    $('se-bar-waste-n').textContent = fmt(s.wasteSteam, 2) + ' kg';

    var n = M.stroke('newcomen', chills.newcomen), w = M.stroke('watt', chills.watt);
    var cn = M.coalToLift(n, 1000, DEPTH), cw = M.coalToLift(w, 1000, DEPTH);
    $('se-cmp-n').textContent = fmt(cn) + ' kg';
    $('se-cmp-w').textContent = fmt(cw) + ' kg';
    $('se-cmp-n-chill').textContent = fmt(chills.newcomen) + ' °C';
    $('se-cmp-w-chill').textContent = fmt(chills.watt) + ' °C';
    var saved = cn - cw;
    $('se-cmp-saving').textContent = saved > 0
      ? 'Watt saves ' + fmt(saved) + ' kg (' + fmt(saved / cn * 100) + '%). Boulton & Watt charged one third of the saving every year: ' + fmt(saved / 3) + ' kg of coal’s worth per 1,000 tonnes pumped.'
      : 'With these settings the Watt engine saves nothing. Try a colder condenser.';

    var best = M.bestNewcomenChill();
    goal('se-goal-best', engine === 'newcomen' && Math.abs(chills.newcomen - best.chill) <= 5);
    goal('se-goal-watt', engine === 'watt' && w.duty >= 18);
    goal('se-goal-third', saved / cn >= 2 / 3);
    renderDilemma();
  }
  function goal(id, ok) { var el = $(id); if (el && ok) el.setAttribute('data-ok', 'true'); }

  function setEngine(next) {
    engine = next === 'watt' ? 'watt' : 'newcomen';
    chillIn.value = chills[engine];
    totals = { strokes: 0, coal: 0, water: 0 };
    lastPhase = '';
    tick(0);
    showCounters();
    updateReadout();
    drawEngine();
  }

  for (var i = 0; i < radios.length; i++) {
    radios[i].addEventListener('change', function (e) { if (e.target.checked) setEngine(e.target.value); });
  }
  chillIn.addEventListener('input', function () { chills[engine] = +chillIn.value; updateReadout(); drawEngine(); });
  resetBtn.addEventListener('click', function () { totals = { strokes: 0, coal: 0, water: 0 }; showCounters(); drawEngine(); });
  playBtn.addEventListener('click', function () {
    playing = !playing;
    playBtn.textContent = playing ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(!playing));
    if (playing) loop.resume(); else loop.pause();
  });

  var engineView = SimKit.canvas2d(engineCanvas, { onResize: function () { drawEngine(); } });
  var countersOut = $('se-counters');

  /* Draw in a fixed 760 × 430 design space, scaled to fit. */
  function drawEngine() {
    if (!engineView) return;
    var ctx = engineView.ctx, W = engineView.width, H = engineView.height;
    var dark = isDark();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var dpr = engineCanvas.width / W;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var k = Math.min(W / 760, H / 430);
    var ox = (W - 760 * k) / 2;
    ctx.translate(ox, 0);
    ctx.scale(k, k);
    var grow = Math.min(2, Math.max(1, 0.8 / k));
    function font(px, bold) { return (bold ? '600 ' : '') + Math.round(px * grow) + 'px system-ui, -apple-system, Segoe UI, sans-serif'; }

    var watt = engine === 'watt';
    var p = M.phase(u);
    var chill = chills[engine];
    var wall = M.wallTemp(engine, chill, u);
    var ink = colors.text || '#1d1d1f';
    var muted = colors.textMuted || '#6e6e73';
    var iron = dark ? '#9ca3af' : '#4b5563';
    var ironDark = dark ? '#d1d5db' : '#1f2937';
    var GROUND = 300;

    // Taller phone canvas: a header band above the scene holds the wall temperature.
    var band = Math.max(0, H / k - 430);
    ctx.fillStyle = dark ? '#111827' : '#eef2f7';
    ctx.fillRect(-ox / k, 0, 760 + 2 * ox / k, band + GROUND);
    ctx.translate(0, band);
    // sky / earth
    ctx.fillStyle = dark ? '#3b2f25' : '#cdb79e';
    ctx.fillRect(-ox / k, GROUND, 760 + 2 * ox / k, 130);
    ctx.fillStyle = dark ? '#2b221b' : '#b89f84';
    for (var sx = 0; sx < 760; sx += 38) { ctx.fillRect(sx + (sx % 76 ? 8 : 20), GROUND + 30 + (sx % 3) * 22, 14, 4); }

    // engine house wall (the "bob wall" the beam rests on)
    ctx.fillStyle = dark ? '#7c3a2a' : '#b45f45';
    ctx.fillRect(296, 78, 38, GROUND - 78);
    ctx.strokeStyle = dark ? '#5b2a1f' : '#8f4632';
    ctx.lineWidth = 1;
    for (var by = 86; by < GROUND; by += 12) {
      ctx.beginPath(); ctx.moveTo(296, by); ctx.lineTo(334, by); ctx.stroke();
      var off = (by / 12) % 2 ? 309 : 321;
      ctx.beginPath(); ctx.moveTo(off, by - 12); ctx.lineTo(off, by); ctx.stroke();
    }

    // beam
    var theta = (p.piston - 0.5) * 0.17;
    var PX = 315, PY = 70, ARM = 190;
    var lx = PX - ARM * Math.cos(theta), ly = PY - ARM * Math.sin(theta);
    var rx = PX + ARM * Math.cos(theta), ry = PY + ARM * Math.sin(theta);

    // mine shaft + water
    ctx.fillStyle = dark ? '#0b0f14' : '#4a3b2e';
    ctx.fillRect(488, GROUND, 40, 125);
    var poolY = 395;
    ctx.fillStyle = '#2563eb';
    ctx.globalAlpha = 0.75; ctx.fillRect(488, poolY, 40, 30); ctx.globalAlpha = 1;
    // rising main (pump pipe) and discharge
    ctx.fillStyle = iron;
    ctx.fillRect(500, 150, 16, GROUND + 100 - 150);
    ctx.fillRect(516, 262, 52, 10);
    // pump rod
    var rodTop = ry + 14;
    ctx.strokeStyle = ironDark; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx, rodTop + 60); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(508, rodTop + 60); ctx.lineTo(508, GROUND + 95 - (p.piston) * 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx, rodTop + 60); ctx.lineTo(508, rodTop + 60); ctx.stroke();
    // water pouring out on the power stroke
    if (p.name === 'power') {
      ctx.fillStyle = '#3b82f6';
      for (var d = 0; d < 7; d++) {
        var f = ((p.t * 5 + d / 7) % 1);
        ctx.globalAlpha = 0.9 - f * 0.5;
        ctx.beginPath(); ctx.arc(570 + f * 10, 270 + f * f * 28, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = dark ? '#1e3a8a' : '#93c5fd';
    ctx.fillRect(566, 292, 70, 8);

    // boiler + fire (under the cylinder, like Newcomen's "haystack" boiler)
    var cx = 140, CYL_TOP = 128, CYL_BOT = 248, CW = 62;
    var fire = 0.55 + 0.25 * Math.sin(u * Math.PI * 14) * 0.5 + (watt ? 0 : 0.2);
    ctx.fillStyle = dark ? '#57534e' : '#78716c';
    ctx.beginPath(); ctx.moveTo(84, GROUND); ctx.lineTo(84, 278); ctx.quadraticCurveTo(140, 236, 196, 278); ctx.lineTo(196, GROUND); ctx.closePath(); ctx.fill();
    var grad = ctx.createRadialGradient(140, GROUND + 6, 4, 140, GROUND + 6, 52);
    grad.addColorStop(0, 'rgba(253,186,116,' + fire + ')');
    grad.addColorStop(0.5, 'rgba(234,88,12,' + (fire * 0.7) + ')');
    grad.addColorStop(1, 'rgba(234,88,12,0)');
    ctx.fillStyle = grad; ctx.fillRect(88, GROUND - 6, 104, 34);
    // steam valve pipe from boiler to cylinder bottom
    var steamOpen = p.name === 'steam';
    ctx.fillStyle = iron; ctx.fillRect(cx - 7, CYL_BOT, 14, 252 - CYL_BOT + 10);
    ctx.fillStyle = steamOpen ? '#16a34a' : '#b91c1c';
    ctx.beginPath(); ctx.arc(cx, 256, 5, 0, Math.PI * 2); ctx.fill();

    // steam jacket (Watt)
    if (watt) {
      ctx.fillStyle = dark ? 'rgba(248,113,113,0.18)' : 'rgba(220,38,38,0.12)';
      ctx.fillRect(cx - CW / 2 - 10, CYL_TOP - 4, CW + 20, CYL_BOT - CYL_TOP + 8);
      ctx.strokeStyle = iron; ctx.lineWidth = 2;
      ctx.strokeRect(cx - CW / 2 - 10, CYL_TOP - 4, CW + 20, CYL_BOT - CYL_TOP + 8);
    }

    // cylinder interior: steam density
    var pistonY = CYL_BOT - 10 - p.piston * (CYL_BOT - CYL_TOP - 24);
    var steamAlpha = p.name === 'steam' ? 0.75 : p.name === 'condense' ? 0.75 * (1 - p.t) : 0.04;
    ctx.fillStyle = dark ? '#0f172a' : '#ffffff';
    ctx.fillRect(cx - CW / 2, CYL_TOP, CW, CYL_BOT - CYL_TOP);
    ctx.fillStyle = 'rgba(203,213,225,' + steamAlpha + ')';
    ctx.fillRect(cx - CW / 2, pistonY + 8, CW, CYL_BOT - pistonY - 8);
    if (p.name === 'steam' || p.name === 'condense') {
      ctx.fillStyle = dark ? 'rgba(241,245,249,0.75)' : 'rgba(100,116,139,0.55)';
      for (var q = 0; q < 16; q++) {
        var ph = (q * 0.618 + u * 3) % 1;
        var px = cx - CW / 2 + 6 + ((q * 37) % (CW - 12));
        var py = pistonY + 12 + ph * (CYL_BOT - pistonY - 16);
        if (py < CYL_BOT - 2) { ctx.globalAlpha = steamAlpha; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }
    // Newcomen's injection spray
    if (!watt) {
      ctx.fillStyle = iron;
      ctx.fillRect(196, 96, 44, 22);                    // cistern on the wall
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(199, 99, 38, 10);
      ctx.fillStyle = iron;
      ctx.fillRect(214, 118, 6, 122); ctx.fillRect(cx + CW / 2, 234, 214 - cx - CW / 2 + 6, 6);
      if (p.name === 'condense') {
        ctx.fillStyle = '#60a5fa';
        for (var j = 0; j < 22; j++) {
          var a = -Math.PI / 2 + (j / 21 - 0.5) * 2.4;
          var rr = 6 + p.t * 60 * (0.5 + ((j * 7) % 5) / 8);
          var dx = cx + Math.cos(a) * rr * 0.5, dy = CYL_BOT - 14 + Math.sin(a) * rr;
          if (dy > pistonY + 8) { ctx.beginPath(); ctx.arc(dx, dy, 2, 0, Math.PI * 2); ctx.fill(); }
        }
      }
    }
    // Watt's separate condenser + air pump in a cold-water cistern
    if (watt) {
      var tank = { x: 196, y: 196, w: 86, h: GROUND - 196 };
      ctx.fillStyle = dark ? 'rgba(37,99,235,0.35)' : 'rgba(96,165,250,0.45)';
      ctx.fillRect(tank.x, tank.y, tank.w, tank.h);
      ctx.strokeStyle = iron; ctx.lineWidth = 2; ctx.strokeRect(tank.x, tank.y, tank.w, tank.h);
      ctx.fillStyle = heat(chill);
      ctx.fillRect(208, 228, 24, 58);                   // condenser
      ctx.fillStyle = iron;
      ctx.fillRect(244, 214, 22, 72);                   // air pump barrel
      ctx.fillRect(cx + CW / 2 + 10, 262, 208 - cx - CW / 2 - 10, 8); // eduction pipe
      ctx.fillRect(232, 270, 12, 6);
      // air pump rod hangs from the beam
      var ax = 255, ay = PY - (PX - ax) * Math.sin(theta) / Math.cos(theta);
      ctx.strokeStyle = ironDark; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, 232 + (1 - p.piston) * 20); ctx.stroke();
      // steam rushing to the condenser
      if (p.name === 'condense' || (p.name === 'power' && p.t < 0.35)) {
        ctx.fillStyle = dark ? 'rgba(241,245,249,0.85)' : 'rgba(71,85,105,0.7)';
        for (var e = 0; e < 8; e++) {
          var g2 = ((p.t * 3 + e / 8) % 1);
          ctx.beginPath(); ctx.arc(cx + CW / 2 + 10 + g2 * 50, 266, 2.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    // cylinder walls coloured by temperature
    ctx.strokeStyle = heat(wall); ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(cx - CW / 2, CYL_TOP); ctx.lineTo(cx - CW / 2, CYL_BOT); ctx.lineTo(cx + CW / 2, CYL_BOT); ctx.lineTo(cx + CW / 2, CYL_TOP); ctx.stroke();
    if (watt) {
      ctx.beginPath(); ctx.moveTo(cx - CW / 2, CYL_TOP); ctx.lineTo(cx - 5, CYL_TOP); ctx.moveTo(cx + 5, CYL_TOP); ctx.lineTo(cx + CW / 2, CYL_TOP); ctx.stroke();
      ctx.fillStyle = 'rgba(203,213,225,0.45)';
      ctx.fillRect(cx - CW / 2 + 4, CYL_TOP + 4, CW - 8, Math.max(0, pistonY - CYL_TOP - 4));
    }
    // piston + rod + chain to the arch head
    ctx.fillStyle = ironDark; ctx.fillRect(cx - CW / 2 + 4, pistonY, CW - 8, 9);
    ctx.strokeStyle = ironDark; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, pistonY); ctx.lineTo(cx, ly + 14); ctx.stroke();

    // the beam itself
    ctx.save();
    ctx.translate(PX, PY); ctx.rotate(theta);
    ctx.fillStyle = dark ? '#a16207' : '#854d0e';
    ctx.fillRect(-ARM - 4, -9, 2 * ARM + 8, 18);
    ctx.strokeStyle = dark ? '#78350f' : '#5c3308'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-ARM - 4, -9, 2 * ARM + 8, 18);
    ctx.restore();
    ctx.fillStyle = ironDark;
    ctx.beginPath(); ctx.arc(PX, PY, 7, 0, Math.PI * 2); ctx.fill();

    // labels
    ctx.fillStyle = ink;
    ctx.font = font(13, true);
    ctx.textAlign = 'center';
    ctx.fillText('Cylinder', cx, CYL_TOP - (watt ? 12 : 8));
    ctx.fillText('Boiler', 140, GROUND + 42);
    ctx.fillText('Beam', PX + 70, PY - 20);
    ctx.textAlign = 'right';
    ctx.fillText('Mine shaft, ' + DEPTH + ' m deep', 480, 412);
    ctx.textAlign = 'center';
    if (grow <= 1.2) {
      if (watt) ctx.fillText('Condenser', 239, 190);
      else ctx.fillText('Cold water', 218, 90);
    }
    ctx.font = font(13, true);
    ctx.fillStyle = heat(wall);
    if (grow > 1.2) {
      // Small screens: no room beside the cylinder, so it goes in the header band.
      ctx.textAlign = 'left';
      ctx.fillText('Cylinder walls ' + Math.round(wall) + ' °C' + (watt ? ' (steam jacket)' : ''), 14, -band + 16 + 13 * grow);
      ctx.textAlign = 'center';
    } else {
      ctx.textAlign = 'right';
      ctx.fillText('walls ' + Math.round(wall) + ' °C', cx - CW / 2 - 16, 186);
      ctx.font = font(12);
      if (watt) { ctx.fillStyle = muted; ctx.fillText('in a steam jacket', cx - CW / 2 - 16, 204); }
      ctx.textAlign = 'center';
    }

  }

  function showCounters() {
    if (!countersOut) return;
    countersOut.textContent = (engine === 'watt' ? 'Watt engine' : 'Newcomen engine') + ' so far: ' + fmt(totals.strokes) + ' strokes · ' +
      fmt(totals.coal, 1) + ' kg of coal burned · ' + fmt(totals.water / 1000, 1) + ' tonnes of water lifted from the mine.';
  }

  var lastPhase = '';
  function tick(dt) {
    var period = (slowIn.checked ? 14 : 60 / M.STROKES_PER_MIN);
    var before = u;
    u += dt / period;
    if (u >= 1) {
      u -= 1;
      var s = current();
      totals.strokes += 1;
      totals.coal += s.coalKg;
      totals.water += M.waterPerStroke(s, DEPTH);
      showCounters();
    }
    var ph = slowIn.checked ? M.phase(u).name : 'fast';
    if (ph !== lastPhase) {
      lastPhase = ph;
      phaseOut.textContent = ph === 'fast'
        ? 'Real speed: ' + M.STROKES_PER_MIN + ' strokes a minute, day and night. Tick Slow motion to follow each step.'
        : PHASE_TEXT[engine][ph];
    }
    drawEngine();
  }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var loop = SimKit.loop(tick, { el: SimKit.stage(engineCanvas), maxDt: 0.1 });
  if (reduced) {
    playing = false; loop.pause(); playBtn.textContent = 'Play'; playBtn.setAttribute('aria-pressed', 'true');
    u = 0.2; lastPhase = ''; tick(0);
  }

  /* ── Newcomen's Dilemma chart ───────────────────────────────── */
  var dilemmaCanvas = $('se-dilemma');
  var dilemmaView = dilemmaCanvas ? SimKit.canvas2d(dilemmaCanvas, { height: 360, onResize: function () { renderDilemma(); } }) : null;

  function renderDilemma() {
    if (!dilemmaView) return;
    var ctx = dilemmaView.ctx, W = dilemmaView.width, H = dilemmaView.height;
    var ink = colors.text || '#1d1d1f', muted = colors.textMuted || '#6e6e73';
    ctx.clearRect(0, 0, W, H);
    var L = 58, R = W - 18, T1 = 26, B1 = 140, T2 = 190, B2 = H - 36;
    var x = function (t) { return L + (t - M.CHILL_MIN) / (M.CHILL_MAX - M.CHILL_MIN) * (R - L); };
    var yF = function (f) { return B1 - f / 35 * (B1 - T1); };
    var yD = function (d) { return B2 - d / 22 * (B2 - T2); };
    ctx.font = '12px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.lineWidth = 1;
    // axes and grid
    function grid(top, bottom, ticks, map, unit) {
      ctx.strokeStyle = 'rgba(127,127,127,0.25)'; ctx.fillStyle = muted; ctx.textAlign = 'right';
      for (var i = 0; i < ticks.length; i++) {
        var yy = map(ticks[i]);
        ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(R, yy); ctx.stroke();
        ctx.fillText(ticks[i] + unit, L - 6, yy + 4);
      }
      ctx.strokeStyle = muted;
      ctx.beginPath(); ctx.moveTo(L, top); ctx.lineTo(L, bottom); ctx.lineTo(R, bottom); ctx.stroke();
    }
    grid(T1, B1, [0, 10, 20, 30], yF, '');
    grid(T2, B2, [0, 5, 10, 15, 20], yD, '');
    ctx.textAlign = 'center'; ctx.fillStyle = muted;
    for (var t = 30; t <= 90; t += 10) {
      ctx.fillText(t + ' °C', x(t), B2 + 16);
      ctx.fillText(t + ' °C', x(t), B1 + 16);
    }
    ctx.fillStyle = ink; ctx.textAlign = 'left';
    ctx.font = '600 13px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Push on the piston (kN): colder is stronger', L, T1 - 10);
    ctx.fillText('Duty (million ft·lb per bushel of coal)', L, T2 - 10);
    ctx.font = '12px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'right';
    ctx.fillText('← colder cold spot · warmer cold spot →', R, H - 6);

    function curve(fn, map, color, dash) {
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash(dash || []);
      ctx.beginPath();
      for (var c = M.CHILL_MIN; c <= M.CHILL_MAX; c += 1) {
        var yy = map(fn(c));
        if (c === M.CHILL_MIN) ctx.moveTo(x(c), yy); else ctx.lineTo(x(c), yy);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    var NC = '#c2410c', WC = '#2563eb';
    curve(function (c) { return M.stroke('newcomen', c).forceKN; }, yF, NC);
    curve(function (c) { return M.stroke('newcomen', c).duty; }, yD, NC);
    curve(function (c) { return M.stroke('watt', c).duty; }, yD, WC);

    // measured duties for reference
    ctx.font = '11px system-ui, -apple-system, Segoe UI, sans-serif';
    M.HISTORICAL_DUTY.forEach(function (h) {
      var yy = yD(h.duty);
      ctx.strokeStyle = h.engine === 'watt' ? WC : NC; ctx.globalAlpha = 0.55; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(R, yy); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.textAlign = 'right';
      ctx.fillText('measured: ' + h.label + ' ≈ ' + h.duty, R - 4, yy - 4);
    });

    // best Newcomen point
    var best = M.bestNewcomenChill();
    ctx.fillStyle = NC;
    ctx.beginPath(); ctx.arc(x(best.chill), yD(best.duty), 4, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillText('Newcomen’s best', x(best.chill), yD(best.duty) + 18);

    // current settings
    [['newcomen', NC], ['watt', WC]].forEach(function (pair) {
      var s = M.stroke(pair[0], chills[pair[0]]);
      var on = pair[0] === engine;
      ctx.strokeStyle = pair[1]; ctx.fillStyle = on ? pair[1] : (colors.bg || '#fff'); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x(s.chill), yD(s.duty), on ? 7 : 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (pair[0] === 'newcomen') { ctx.beginPath(); ctx.arc(x(s.chill), yF(s.forceKN), on ? 7 : 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    });
    // legend
    ctx.textAlign = 'right'; ctx.font = '600 12px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillStyle = WC; ctx.fillText('● Watt', R, T2 - 10);
    ctx.fillStyle = NC; ctx.fillText('● Newcomen', R - ctx.measureText('● Watt').width - 14, T2 - 10);
    ctx.fillText('● Newcomen', R, T1 - 10);
  }

  /* ── Coal output curve ───────────────────────────────────────── */
  var coalCanvas = $('se-coal');
  var coalView = coalCanvas ? SimKit.canvas2d(coalCanvas, { height: 320, onResize: function () { renderCoal(); } }) : null;

  function renderCoal() {
    if (!coalView) return;
    var ctx = coalView.ctx, W = coalView.width, H = coalView.height;
    var ink = colors.text || '#1d1d1f', muted = colors.textMuted || '#6e6e73';
    ctx.clearRect(0, 0, W, H);
    var L = 52, R = W - 16, T = 26, B = H - 34;
    var x = function (y) { return L + (y - 1700) / (1913 - 1700) * (R - L); };
    var y = function (m) { return B - m / 300 * (B - T); };
    ctx.font = '12px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.strokeStyle = 'rgba(127,127,127,0.25)'; ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.lineWidth = 1;
    [0, 100, 200, 300].forEach(function (m) {
      ctx.beginPath(); ctx.moveTo(L, y(m)); ctx.lineTo(R, y(m)); ctx.stroke();
      ctx.fillText(m + ' Mt', L - 6, y(m) + 4);
    });
    ctx.textAlign = 'center';
    var step = W < 420 ? 50 : 25;
    for (var yr = 1700; yr <= 1900; yr += step) ctx.fillText(String(yr), x(yr), B + 18);
    ctx.strokeStyle = muted;
    ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, B); ctx.lineTo(R, B); ctx.stroke();

    function marker(year, label, row) {
      ctx.strokeStyle = muted; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(x(year), T); ctx.lineTo(x(year), B); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ink; ctx.textAlign = 'left';
      ctx.fillText(label, x(year) + 4, T + 12 + row * 16);
    }
    marker(1776, 'Watt’s first engines (1776)', 0);
    marker(1829, 'Rocket (1829)', 1);

    var D = M.COAL_OUTPUT;
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3;
    ctx.beginPath();
    D.forEach(function (d, i) { if (i) ctx.lineTo(x(d[0]), y(d[1])); else ctx.moveTo(x(d[0]), y(d[1])); });
    ctx.stroke();
    ctx.fillStyle = '#b45309';
    D.forEach(function (d) { ctx.beginPath(); ctx.arc(x(d[0]), y(d[1]), 3.5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.font = '600 12px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('287 Mt in 1913', x(1913) - 6, y(287) + 4);
  }

  SimKit.theme.onChange(function (c) { colors = c; drawEngine(); renderDilemma(); renderCoal(); });
  slowIn.addEventListener('change', function () { lastPhase = ''; tick(0); });
  setEngine('newcomen');
  renderCoal();
})();
