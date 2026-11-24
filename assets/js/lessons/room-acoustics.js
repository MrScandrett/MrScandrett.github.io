/* Room Acoustics, Modes & Reverb Lab + Web Audio Room Auralization */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('room-canvas');
  if (!canvas) return;
  var fit = window.SimKit ? SimKit.canvas2d(canvas, { box: canvas.parentElement }) : null;
  var ctx = fit ? fit.ctx : canvas.getContext('2d');
  var C = 343;

  // Presets: [length, width, height, panels, curtains, baffles, audience]
  var presets = {
    classroom: [10, 8, 3, 25, 15, 20, 60],
    theatre:   [22, 16, 9, 45, 65, 50, 75],
    gym:       [34, 24, 11, 5, 0, 0, 0],
    studio:    [7, 5, 3, 75, 35, 55, 15]
  };

  var pos = { sx: 0.22, sy: 0.34, lx: 0.72, ly: 0.68 };
  var simClock = 0;

  function values() {
    return ['length', 'width', 'height', 'panels', 'curtains', 'baffles', 'audience'].map(function (id) {
      return Number($(id).value);
    });
  }

  function model() {
    var v = values();
    var l = v[0], w = v[1], h = v[2], panels = v[3], curtains = v[4], baffles = v[5], aud = v[6];
    var V = l * w * h;
    var S = 2 * (l * w + l * h + w * h);
    var base = 0.055 * S;
    var aPanels = (panels / 100) * (0.28 * S);
    var aCurtains = (curtains / 100) * (0.22 * S);
    var aBaffles = (baffles / 100) * (0.20 * S);
    var aPeople = (aud / 100) * Math.min(420, l * w * 1.1) * 0.48;
    var A = Math.max(1, base + aPanels + aCurtains + aBaffles + aPeople);
    var rt = 0.161 * V / A;
    var soft = panels * 0.4 + curtains * 0.32 + baffles * 0.28; // 0..100 effective damping
    var cost = panels * 45 + curtains * 35 + baffles * 50 + aud * 5;
    return {
      l: l, w: w, h: h, panels: panels, curtains: curtains, baffles: baffles, aud: aud,
      soft: soft, V: V, S: S, A: A, rt: rt, cost: cost
    };
  }

  function layout(m) {
    var W = fit ? fit.width : canvas.width;
    var H = fit ? fit.height : canvas.height;
    var maxW = Math.max(80, W - 96), maxH = Math.max(80, H - 72), aspect = m.l / m.w;
    var w = maxW, h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }
    return { x: (W - w) / 2, y: (H - h) / 2 + 4, w: w, h: h, scale: w / m.l, W: W, H: H };
  }

  function nearestHorizontalMode(m, target) {
    var best = null;
    var maxNx = Math.ceil(target * 2 * m.l / C) + 2;
    var maxNy = Math.ceil(target * 2 * m.w / C) + 2;
    for (var nx = 0; nx <= maxNx; nx++) {
      for (var ny = 0; ny <= maxNy; ny++) {
        if (nx === 0 && ny === 0) continue;
        var frequency = (C / 2) * Math.sqrt(Math.pow(nx / m.l, 2) + Math.pow(ny / m.w, 2));
        var diff = Math.abs(frequency - target);
        if (!best || diff < best.difference) {
          best = { nx: nx, ny: ny, nz: 0, frequency: frequency, difference: diff };
        }
      }
    }
    best.kind = best.nx > 0 && best.ny > 0 ? 'tangential' : 'axial';
    return best;
  }

  function pressureAt(mode, xFrac, yFrac) {
    return Math.cos(mode.nx * Math.PI * xFrac) * Math.cos(mode.ny * Math.PI * yFrac);
  }

  function resonanceGain(m, mode, targetHz) {
    var Q = Math.max(3, 18 - (m.soft / 100) * 13);
    var fm = mode.frequency || 1;
    var ratio = targetHz / fm;
    var denom = Math.sqrt(Math.pow(1 - ratio * ratio, 2) + Math.pow(ratio / Q, 2));
    return Math.min(1, Math.max(0.16, (1 / Math.max(0.05, denom)) / Q));
  }

  function background(W, H) {
    var g = ctx.createRadialGradient(W * 0.5, H * 0.48, 24, W * 0.5, H * 0.48, Math.max(W, H) * 0.6);
    g.addColorStop(0, '#172635');
    g.addColorStop(1, '#060a10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawAudience(m, r) {
    var count = Math.round((m.aud / 100) * Math.min(48, Math.max(10, (m.l * m.w) / 8)));
    var cols = 8;
    ctx.fillStyle = 'rgba(214, 224, 232, 0.45)';
    for (var i = 0; i < count; i++) {
      var col = i % cols, row = Math.floor(i / cols);
      var px = r.x + r.w * (0.55 + col * 0.048);
      var py = r.y + r.h * (0.18 + row * 0.09);
      if (px < r.x + r.w * 0.94 && py < r.y + r.h * 0.88) {
        ctx.beginPath(); ctx.arc(px, py, 2.8, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function imageCoordinate(index, size, source) {
    return index * size + (index % 2 === 0 ? source : size - source);
  }

  function drawTravel(m, r) {
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.fillStyle = 'rgba(89, 200, 216, ' + (0.03 + m.soft / 1600) + ')';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    drawAudience(m, r);
    var sourceX = pos.sx * m.l, sourceY = pos.sy * m.w;
    var maxDistance = Math.hypot(m.l, m.w) * 2.1;
    var visualSpeed = Math.max(m.l, m.w) / 1.85;
    var cycle = maxDistance / visualSpeed;
    var reflection = Math.max(0.1, 0.9 - 0.72 * (m.soft / 100));
    for (var pulse = 0; pulse < 4; pulse++) {
      var age = ((simClock + pulse * cycle / 4) % cycle + cycle) % cycle;
      var radiusM = age * visualSpeed;
      var fade = Math.max(0, 1 - age / cycle);
      for (var ix = -2; ix <= 2; ix++) {
        for (var iy = -2; iy <= 2; iy++) {
          var order = Math.abs(ix) + Math.abs(iy);
          if (order > 2) continue;
          var px = r.x + imageCoordinate(ix, m.l, sourceX) * r.scale;
          var py = r.y + imageCoordinate(iy, m.w, sourceY) * r.scale;
          var alpha = (order === 0 ? 0.68 : 0.42) * fade * Math.pow(reflection, order);
          if (alpha < 0.025) continue;
          ctx.beginPath();
          ctx.arc(px, py, radiusM * r.scale, 0, Math.PI * 2);
          ctx.strokeStyle = order === 0 ? 'rgba(89, 210, 225, ' + alpha + ')' : 'rgba(240, 180, 72, ' + alpha + ')';
          ctx.lineWidth = order === 0 ? 3 : 1.9;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(7, 11, 16, 0.78)';
    ctx.fillRect(r.x + 10, r.y + 10, 184, 38);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#59c8d8'; ctx.font = '800 11px system-ui, sans-serif';
    ctx.fillText('TRAVELING IMPULSE', r.x + 18, r.y + 26);
    ctx.fillStyle = '#92a2b2'; ctx.font = '9px system-ui, sans-serif';
    ctx.fillText('Drag S or L anywhere (incl. corners)', r.x + 18, r.y + 40);
  }

  // Offscreen cached mode grid for zero per-frame DOM/fillRect thrashing
  var modeBuf = document.createElement('canvas');
  var modeCtx = modeBuf.getContext('2d');
  var modeImg = null;
  var MW = 80, MH = 50;

  function drawModes(m, r, mode, targetHz) {
    if (!modeImg) {
      modeBuf.width = MW; modeBuf.height = MH;
      modeImg = modeCtx.createImageData(MW, MH);
    }
    var osc = Math.sin(simClock * 2.2);
    var resGain = resonanceGain(m, mode, targetHz);
    var d = modeImg.data;
    for (var row = 0; row < MH; row++) {
      var yf = (row + 0.5) / MH;
      for (var col = 0; col < MW; col++) {
        var xf = (col + 0.5) / MW;
        var p = pressureAt(mode, xf, yf);
        var amp = Math.abs(p);
        var positive = p * osc >= 0;
        var alpha = (0.04 + amp * 0.58 * resGain * (0.65 + 0.35 * Math.abs(osc))) * 255;
        var o = (row * MW + col) * 4;
        d[o] = positive ? 89 : 240;
        d[o + 1] = positive ? 200 : 180;
        d[o + 2] = positive ? 216 : 72;
        d[o + 3] = Math.min(255, alpha);
      }
    }
    modeCtx.putImageData(modeImg, 0, 0);

    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(modeBuf, r.x, r.y, r.w, r.h);

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 6]);
    for (var kx = 0; kx < mode.nx; kx++) {
      var px = r.x + r.w * (kx + 0.5) / mode.nx;
      ctx.beginPath(); ctx.moveTo(px, r.y); ctx.lineTo(px, r.y + r.h); ctx.stroke();
    }
    for (var ky = 0; ky < mode.ny; ky++) {
      var py = r.y + r.h * (ky + 0.5) / mode.ny;
      ctx.beginPath(); ctx.moveTo(r.x, py); ctx.lineTo(r.x + r.w, py); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = 'rgba(7, 11, 16, 0.84)';
    ctx.fillRect(r.x + 10, r.y + 10, 224, 48);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f0b448'; ctx.font = '800 11px system-ui, sans-serif';
    ctx.fillText(mode.kind.toUpperCase() + ' MODE (' + mode.nx + ',' + mode.ny + ',0)', r.x + 18, r.y + 26);
    ctx.fillStyle = '#d6e0e8'; ctx.font = '700 11px ui-monospace, monospace';
    ctx.fillText(mode.frequency.toFixed(1) + ' Hz', r.x + 18, r.y + 44);
    ctx.fillStyle = '#92a2b2'; ctx.font = '9px system-ui, sans-serif';
    ctx.fillText('Resonance ' + Math.round(resGain * 100) + '% · Dashed = node', r.x + 84, r.y + 44);
  }

  function drawMarkers(m, r, mode) {
    var items = [
      { key: 's', label: 'S', name: 'SOURCE', xf: pos.sx, yf: pos.sy, color: '#f0b448' },
      { key: 'l', label: 'L', name: 'LISTENER', xf: pos.lx, yf: pos.ly, color: '#66d28a' }
    ];
    items.forEach(function (item) {
      var x = r.x + r.w * item.xf;
      var y = r.y + r.h * item.yf;
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fillStyle = item.color; ctx.fill();
      ctx.strokeStyle = '#071018'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#071018'; ctx.font = '900 11px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.label, x, y + 0.5);

      var boxY = item.yf > 0.82 ? y - 34 : y + 15;
      ctx.fillStyle = 'rgba(7, 11, 16, 0.84)';
      ctx.fillRect(x - 32, boxY, 64, 15);
      ctx.fillStyle = '#e8eef3'; ctx.font = '800 8px system-ui, sans-serif';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(item.name, x, boxY + 11);
      if (mode && $('simulation-view').value === 'modes') {
        var amp = Math.abs(pressureAt(mode, item.xf, item.yf));
        ctx.fillStyle = '#cbd5e1'; ctx.font = '8px ui-monospace, monospace';
        ctx.fillText(Math.round(amp * 100) + '% P', x, boxY + (item.yf > 0.82 ? -4 : 25));
      }
    });
  }

  var lastLayout = null;
  function draw(m) {
    var r = layout(m);
    lastLayout = r;
    background(r.W, r.H);
    var target = Number($('frequency').value);
    var mode = nearestHorizontalMode(m, target);
    if ($('simulation-view').value === 'modes') drawModes(m, r, mode, target);
    else drawTravel(m, r);

    ctx.strokeStyle = 'rgba(240, 180, 72, ' + (0.45 + m.soft / 250) + ')';
    ctx.lineWidth = 8;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);

    drawMarkers(m, r, mode);
    ctx.fillStyle = '#a8b5c1'; ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(m.l + ' m', r.x + r.w / 2, r.y + r.h + 20);
    ctx.save(); ctx.translate(r.x - 22, r.y + r.h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(m.w + ' m', 0, 0); ctx.restore();
  }

  // 2-D pointer dragging for Source & Listener (including corners!)
  var dragging = null;
  function canvasPt(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (!lastLayout) return;
    var pt = canvasPt(e);
    var sx = lastLayout.x + lastLayout.w * pos.sx, sy = lastLayout.y + lastLayout.h * pos.sy;
    var lx = lastLayout.x + lastLayout.w * pos.lx, ly = lastLayout.y + lastLayout.h * pos.ly;
    var ds = Math.hypot(pt.x - sx, pt.y - sy);
    var dl = Math.hypot(pt.x - lx, pt.y - ly);
    if (ds <= 26 || dl <= 26) {
      dragging = ds <= dl ? 's' : 'l';
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging || !lastLayout) return;
    var pt = canvasPt(e);
    var xf = Math.max(0.03, Math.min(0.97, (pt.x - lastLayout.x) / lastLayout.w));
    var yf = Math.max(0.03, Math.min(0.97, (pt.y - lastLayout.y) / lastLayout.h));
    if (dragging === 's') {
      pos.sx = xf; pos.sy = yf;
      $('source-position').value = Math.round(xf * 100);
    } else {
      pos.lx = xf; pos.ly = yf;
      $('listener-position').value = Math.round(xf * 100);
    }
    update();
  });
  canvas.addEventListener('pointerup', function () { dragging = null; });
  canvas.addEventListener('pointercancel', function () { dragging = null; });

  // Web Audio Room Auralization (Clap IR + Speech Loop + Mode Tone)
  var audioSys = null, convNode = null, wetGain = null, dryGain = null;
  var speechSrc = null, speechGate = null, modeOsc = null, modeGate = null;
  var speechOn = false, modeToneOn = false, dryBypass = false, lastIrKey = '';

  function ensureAudio() {
    if (audioSys) return audioSys;
    var synth = window.AudioLabSynth;
    audioSys = synth ? synth.createContext({ gain: 0.45 }) : null;
    if (!audioSys) return null;
    var ctx = audioSys.ctx;

    convNode = ctx.createConvolver();
    dryGain = ctx.createGain(); dryGain.gain.value = 0.7;
    wetGain = ctx.createGain(); wetGain.gain.value = 0.65;
    convNode.connect(wetGain).connect(audioSys.input);
    dryGain.connect(audioSys.input);

    speechSrc = ctx.createBufferSource();
    speechSrc.buffer = synth.createVocalPhraseBuffer(ctx);
    speechSrc.loop = true;
    speechGate = ctx.createGain(); speechGate.gain.value = 0;
    speechSrc.connect(speechGate);
    speechGate.connect(dryGain);
    speechGate.connect(convNode);
    speechSrc.start();

    modeOsc = ctx.createOscillator();
    modeOsc.type = 'sine';
    modeOsc.frequency.value = 80;
    modeGate = ctx.createGain(); modeGate.gain.value = 0;
    modeOsc.connect(modeGate).connect(audioSys.input);
    modeOsc.start();
    return audioSys;
  }

  function syncRoomAudio(m, mode, targetHz) {
    if (!audioSys) return;
    var ctx = audioSys.ctx;
    var sm = window.AudioLabSynth.smooth;
    var irKey = m.rt.toFixed(2) + ':' + Math.round(m.soft / 8);
    if (convNode && irKey !== lastIrKey) {
      lastIrKey = irKey;
      convNode.buffer = window.AudioLabSynth.createRoomIR(ctx, {
        rt60: m.rt,
        damping: 0.15 + (m.soft / 100) * 0.72,
        l: m.l, w: m.w, h: m.h
      });
    }
    if (dryGain && wetGain) {
      sm(dryGain.gain, dryBypass ? 0.85 : 0.55, ctx, 0.02);
      sm(wetGain.gain, dryBypass ? 0 : Math.min(1.0, 0.35 + Math.min(2.0, m.rt) * 0.32), ctx, 0.02);
    }
    if (speechGate) {
      sm(speechGate.gain, speechOn && !document.hidden ? 0.6 : 0, ctx, 0.02);
    }
    if (modeOsc && modeGate) {
      sm(modeOsc.frequency, targetHz, ctx, 0.02);
      var sAmp = Math.abs(pressureAt(mode, pos.sx, pos.sy));
      var lAmp = Math.abs(pressureAt(mode, pos.lx, pos.ly));
      var res = resonanceGain(m, mode, targetHz);
      var g = modeToneOn && !document.hidden ? (0.015 + 0.16 * sAmp * lAmp * res) : 0;
      sm(modeGate.gain, g, ctx, 0.025);
    }
  }

  function playClap() {
    ensureAudio();
    if (!audioSys) return;
    audioSys.resume();
    syncRoomAudio(model(), nearestHorizontalMode(model(), Number($('frequency').value)), Number($('frequency').value));
    var src = audioSys.ctx.createBufferSource();
    src.buffer = window.AudioLabSynth.createClapBuffer(audioSys.ctx);
    var g = audioSys.ctx.createGain();
    g.gain.value = 0.85;
    src.connect(g);
    g.connect(dryGain);
    g.connect(convNode);
    src.start();
  }

  var btnClap = $('ra-clap-btn');
  var btnSpeech = $('ra-speech-btn');
  var btnModeTone = $('ra-mode-tone-btn');
  var btnBypass = $('ra-dry-btn');
  var btnCorner = $('ra-corner-btn');

  if (btnClap) btnClap.addEventListener('click', playClap);
  if (btnSpeech) {
    btnSpeech.addEventListener('click', function () {
      speechOn = !speechOn;
      if (speechOn) { ensureAudio(); if (audioSys) audioSys.resume(); }
      btnSpeech.setAttribute('aria-pressed', speechOn ? 'true' : 'false');
      btnSpeech.classList.toggle('audio-on', speechOn);
      btnSpeech.textContent = speechOn ? '🔇 Stop Speech' : '🗣️ Audition Speech';
      update();
    });
  }
  if (btnModeTone) {
    btnModeTone.addEventListener('click', function () {
      modeToneOn = !modeToneOn;
      if (modeToneOn) {
        ensureAudio();
        if (audioSys) audioSys.resume();
        if ($('simulation-view').value !== 'modes') $('simulation-view').value = 'modes';
      }
      btnModeTone.setAttribute('aria-pressed', modeToneOn ? 'true' : 'false');
      btnModeTone.classList.toggle('audio-on', modeToneOn);
      btnModeTone.textContent = modeToneOn ? '🔇 Stop Mode Tone' : '🔊 Mode Tone';
      update();
    });
  }
  if (btnBypass) {
    btnBypass.addEventListener('click', function () {
      dryBypass = !dryBypass;
      btnBypass.setAttribute('aria-pressed', dryBypass ? 'true' : 'false');
      btnBypass.textContent = dryBypass ? 'Dry Room: ON (No Reverb)' : 'In-Room Reverb: ON';
      update();
    });
  }
  if (btnCorner) {
    btnCorner.addEventListener('click', function () {
      pos.lx = 0.04; pos.ly = 0.04;
      $('listener-position').value = 4;
      if ($('simulation-view').value !== 'modes') $('simulation-view').value = 'modes';
      update();
    });
  }

  function updateModeReadout(m, mode) {
    var sourceAmp = Math.abs(pressureAt(mode, pos.sx, pos.sy));
    var listenerAmp = Math.abs(pressureAt(mode, pos.lx, pos.ly));
    var o = $('mode-readout');
    if (o) {
      o.className = 'te-readout ' + (listenerAmp < 0.2 ? 'warn' : '');
      o.innerHTML = '<strong>' + mode.frequency.toFixed(1) + ' Hz ' + mode.kind + ' mode (' + mode.nx + ', ' + mode.ny + ', 0).</strong> Source excitation: ' + Math.round(sourceAmp * 100) + '%. Listener pressure: ' + Math.round(listenerAmp * 100) + '%. ' +
        (sourceAmp < 0.2 ? 'Source sits near a node. ' : sourceAmp > 0.8 ? 'Source sits near an antinode. ' : '') +
        (listenerAmp < 0.2 ? 'Listener is in a nodal null.' : listenerAmp > 0.8 ? 'Listener is in a pressure peak (corner/wall buildup).' : 'Drag L into a dashed node or corner to compare.');
    }
  }

  function update() {
    var m = model();
    var target = Number($('frequency').value);
    var mode = nearestHorizontalMode(m, target);
    var isModes = $('simulation-view').value === 'modes';

    $('length-out').value = m.l + ' m';
    $('width-out').value = m.w + ' m';
    $('height-out').value = m.h + ' m';
    $('panels-out').value = m.panels + '%';
    $('curtains-out').value = m.curtains + '%';
    $('baffles-out').value = m.baffles + '%';
    $('audience-out').value = m.aud + '%';
    $('frequency-out').value = target + ' Hz';
    $('source-position-out').value = Math.round(pos.sx * 100) + '%';
    $('listener-position-out').value = Math.round(pos.lx * 100) + '%';
    $('frequency').disabled = !isModes && !modeToneOn;

    $('rt60').textContent = m.rt.toFixed(2) + ' s';
    $('volume').textContent = Math.round(m.V) + ' m³';
    $('nearest-mode').textContent = mode.frequency.toFixed(1) + ' Hz';

    var smallStudio = m.V < 200;
    var rating, cls, msg;
    if (smallStudio && m.rt >= 0.18 && m.rt <= 0.45) {
      rating = 'Tight studio';
      cls = 'good';
      msg = '<strong>Tight studio decay (' + m.rt.toFixed(2) + ' s).</strong> Controlled reflections for mixing and close-mic vocal tracking.';
    } else if (m.rt < 0.22) {
      rating = 'Very dry';
      cls = 'warn';
      msg = '<strong>Very dry (' + m.rt.toFixed(2) + ' s).</strong> Extremely dead room; speech may feel unnaturally close in large spaces.';
    } else if (m.rt <= 1.2) {
      rating = 'Clear speech';
      cls = 'good';
      msg = '<strong>Speech-friendly decay (' + m.rt.toFixed(2) + ' s).</strong> Direct syllables stay intelligible.';
    } else if (m.rt <= 2.2) {
      rating = 'Reverberant';
      cls = 'warn';
      msg = '<strong>Long decay (' + m.rt.toFixed(2) + ' s).</strong> Musical fullness, but fast speech smears.';
    } else {
      rating = 'Very reverberant';
      cls = 'bad';
      msg = '<strong>Intelligibility risk (' + m.rt.toFixed(2) + ' s).</strong> Tail masks incoming words; add audience, curtains, or panels.';
    }
    $('rating').textContent = rating;
    var o = $('acoustic-readout');
    o.className = 'te-readout ' + cls;
    o.innerHTML = msg;

    var costText = '$' + m.cost.toLocaleString();
    $('budget').textContent = costText;
    if ($('wb-budget')) $('wb-budget').textContent = costText;
    updateModeReadout(m, mode);
    syncRoomAudio(m, mode, target);
    draw(m);
  }

  function applyPreset(name) {
    var vals = presets[name];
    if (!vals) return;
    ['length', 'width', 'height', 'panels', 'curtains', 'baffles', 'audience'].forEach(function (id, i) {
      $(id).value = vals[i];
    });
    update();
  }

  $('preset').addEventListener('change', function (e) { applyPreset(e.target.value); });
  ['length', 'width', 'height', 'panels', 'curtains', 'baffles', 'audience', 'frequency'].forEach(function (id) {
    $(id).addEventListener('input', update);
  });
  $('source-position').addEventListener('input', function (e) {
    pos.sx = Number(e.target.value) / 100;
    update();
  });
  $('listener-position').addEventListener('input', function (e) {
    pos.lx = Number(e.target.value) / 100;
    update();
  });
  $('simulation-view').addEventListener('change', update);

  function loadGym() {
    $('preset').value = 'gym';
    applyPreset('gym');
  }
  $('load-gym').addEventListener('click', loadGym);
  if ($('wb-load-gym')) $('wb-load-gym').addEventListener('click', loadGym);

  function checkDesign() {
    var m = model();
    var gymSize = m.l >= 32 && m.w >= 22 && m.h >= 10;
    var pass = gymSize && m.rt <= 1.2 && m.cost <= 8000;
    var o = $('design-readout');
    o.className = 'te-readout ' + (pass ? 'good' : 'bad');
    if (!gymSize) {
      o.innerHTML = '<strong>Keep the room gymnasium-sized (34 × 24 × 11 m).</strong> Shrinking the room cheats the volume problem!';
    } else if (pass) {
      o.innerHTML = '<strong>Design accepted!</strong> RT60 = ' + m.rt.toFixed(2) + ' s for $' + m.cost.toLocaleString() + '. Filling audience seats ($500) + heavy curtains/panels drops RT60 most per dollar.';
    } else {
      o.innerHTML = '<strong>Keep iterating.</strong> ' + (m.rt > 1.2 ? 'RT60 (' + m.rt.toFixed(2) + ' s) exceeds 1.20 s. ' : '') + (m.cost > 8000 ? 'Cost ($' + m.cost.toLocaleString() + ') exceeds $8,000.' : '');
    }
    if ($('wb-gym-status')) {
      $('wb-gym-status').textContent = pass ? '✓ Gym solved (' + m.rt.toFixed(2) + ' s)' : (!gymSize ? 'Reset gym size' : 'Target: ≤1.2s / $8k');
    }
  }
  $('check-design').addEventListener('click', checkDesign);
  if ($('wb-check-gym')) $('wb-check-gym').addEventListener('click', checkDesign);

  if (window.SimKit && SimKit.loop) {
    SimKit.loop(function (dt) {
      simClock += dt;
      draw(model());
    }, { el: canvas, maxDt: 0.05 });
  }
  document.addEventListener('creation-app-resize', function () { if (fit) fit.resize(); draw(model()); });
  document.addEventListener('visibilitychange', function () { update(); });
  update();
})();
