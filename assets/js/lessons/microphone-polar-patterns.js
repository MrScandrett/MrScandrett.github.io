/* Interactive Microphone Polar Pattern Lab + Challenge Briefs + Quick Check */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('polar-canvas');
  if (!canvas) return;
  var fit = window.SimKit ? SimKit.canvas2d(canvas, { box: canvas.parentElement }) : null;
  var ctx = fit ? fit.ctx : canvas.getContext('2d');

  var controls = ['pattern', 'voice-angle', 'monitor-angle', 'distance'].map($);
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };
  var angularDistance = function (a, b) { return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); };
  var lobe = function (a, center, width, level) { return level * Math.exp(-0.5 * Math.pow(angularDistance(a, center) / width, 2)); };

  var patterns = {
    cardioid: function (a) { return Math.max(0.001, (1 + Math.cos(a)) / 2); },
    supercardioid: function (a) { return Math.max(0.001, Math.abs(0.37 + 0.63 * Math.cos(a))); },
    omni: function () { return 1; },
    figure8: function (a) { return Math.max(0.001, Math.abs(Math.cos(a))); },
    shotgun: function (a) {
      return clamp(Math.max(
        lobe(a, 0, 0.27, 1),
        lobe(a, Math.PI, 0.38, 0.22),
        lobe(a, Math.PI * 0.39, 0.17, 0.13),
        lobe(a, -Math.PI * 0.39, 0.17, 0.13),
        lobe(a, Math.PI * 0.69, 0.16, 0.09),
        lobe(a, -Math.PI * 0.69, 0.16, 0.09)
      ), 0.001, 1);
    }
  };

  var nullAngles = {
    cardioid: [180],
    supercardioid: [-126, 126],
    omni: [],
    figure8: [-90, 90],
    shotgun: [-110, 110]
  };

  var names = {
    cardioid: 'Cardioid',
    supercardioid: 'Supercardioid',
    omni: 'Omnidirectional',
    figure8: 'Figure-eight',
    shotgun: 'Shotgun / lobar'
  };

  var activeBrief = '';
  function response(deg) { return patterns[$('pattern').value](deg * Math.PI / 180); }
  function point(cx, cy, radius, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
  }
  function plotRadius(gain, radius) {
    var db = Math.max(-30, 20 * Math.log10(Math.max(gain, 0.0001)));
    return radius * (db + 30) / 30;
  }
  function roundRect(x, y, w, h, rad, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rad);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function sourceMarker(cx, cy, r, angle, title, subtitle, color, side, yOffset) {
    var p = point(cx, cy, r + 26, angle);
    var edge = point(cx, cy, r + 4, angle);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = color + '99';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(edge[0], edge[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(p[0], p[1], 13, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#081016';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title[0], p[0], p[1]);

    var boxW = 104, boxH = 34;
    var boxX = side === 'left' ? p[0] - boxW - 18 : p[0] + 18;
    var boxY = p[1] - 17 + (yOffset || 0);
    roundRect(boxX, boxY, boxW, boxH, 8, 'rgba(7, 11, 16, 0.92)', 'rgba(255, 255, 255, 0.16)');
    ctx.textAlign = side === 'left' ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';
    var tx = side === 'left' ? boxX + boxW - 8 : boxX + 8;
    ctx.fillStyle = '#f4efe4';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText(title, tx, boxY + 14);
    ctx.fillStyle = '#a8b4c2';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(subtitle, tx, boxY + 27);
    ctx.restore();
    return { x: p[0], y: p[1] };
  }

  var lastMarkers = { voice: null, monitor: null, cx: 0, cy: 0 };

  function draw() {
    var w = fit ? fit.width : canvas.width;
    var h = fit ? fit.height : canvas.height;
    if (!w || !h) return;
    var cx = w / 2, cy = h / 2 + 4;
    var r = Math.min(w * 0.29, h * 0.36);
    lastMarkers.cx = cx; lastMarkers.cy = cy;

    ctx.clearRect(0, 0, w, h);
    var bg = ctx.createRadialGradient(cx, cy, 24, cx, cy, Math.max(w, h) * 0.65);
    bg.addColorStop(0, '#172534');
    bg.addColorStop(1, '#070b11');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    [-30, -20, -10, 0].forEach(function (db) {
      var rr = r * (db + 30) / 30;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = db === 0 ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.12)';
      ctx.stroke();
      if (db > -30) {
        ctx.fillStyle = '#8b99a8';
        ctx.font = '10px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(db + ' dB', cx + 5, cy - rr + 12);
      }
    });

    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    for (var d = 0; d < 360; d += 30) {
      var pt = point(cx, cy, r, d);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pt[0], pt[1]); ctx.stroke();
    }

    // Draw rejection nulls matching the legend
    var patKey = $('pattern').value;
    var nulls = nullAngles[patKey] || [];
    if (nulls.length) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      nulls.forEach(function (nd) {
        var np = point(cx, cy, r + 10, nd);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(np[0], np[1]); ctx.stroke();
      });
    }
    ctx.setLineDash([]);

    ctx.fillStyle = '#aeb9c5';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0° ON-AXIS', cx, cy - r - 6);
    ctx.fillText('180° REAR', cx, cy + r + 14);
    ctx.textAlign = 'right';
    ctx.fillText('−90°', cx - r - 8, cy + 4);
    ctx.textAlign = 'left';
    ctx.fillText('+90°', cx + r + 8, cy + 4);

    // Polar lobe curve
    ctx.beginPath();
    for (var deg = 0; deg <= 360; deg += 1) {
      var rr = plotRadius(response(deg), r);
      var p = point(cx, cy, rr, deg);
      if (deg === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    var fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    fill.addColorStop(0, 'rgba(240, 180, 72, 0.1)');
    fill.addColorStop(1, 'rgba(240, 180, 72, 0.42)');
    ctx.fillStyle = fill;
    ctx.strokeStyle = '#f6bd54';
    ctx.lineWidth = 3.2;
    ctx.fill();
    ctx.stroke();

    var voiceAngle = Number($('voice-angle').value);
    var monitorAngle = Number($('monitor-angle').value);
    var voiceSide = Math.sin(voiceAngle * Math.PI / 180) < 0 ? 'left' : 'right';
    var monitorSide = Math.sin(monitorAngle * Math.PI / 180) < 0 ? 'left' : 'right';
    var diffDeg = Math.abs(((voiceAngle - monitorAngle + 540) % 360) - 180);
    var monOffset = diffDeg < 26 ? 38 : 0;

    lastMarkers.voice = sourceMarker(cx, cy, r, voiceAngle, 'Performer', Math.round(response(voiceAngle) * 100) + '% pickup', '#66d28a', voiceSide, 0);
    lastMarkers.monitor = sourceMarker(cx, cy, r, monitorAngle, 'Monitor', Math.round(response(monitorAngle) * 100) + '% pickup', '#ff766c', monitorSide, monOffset);

    // Mic icon in center
    ctx.save();
    ctx.translate(cx, cy);
    roundRect(-8, -24, 16, 36, 7, '#e9f0f5', '#071018');
    ctx.strokeStyle = '#071018'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-12, -16); ctx.lineTo(12, -16); ctx.moveTo(-12, -8); ctx.lineTo(12, -8); ctx.stroke();
    ctx.fillStyle = '#59c8d8';
    ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(-6, -26); ctx.lineTo(6, -26); ctx.closePath(); ctx.fill();
    ctx.restore();

    roundRect(12, 12, 168, 40, 8, 'rgba(7, 11, 16, 0.85)', 'rgba(255, 255, 255, 0.14)');
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f6bd54';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.fillText(names[patKey], 22, 29);
    ctx.fillStyle = '#9aa8b8';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('Drag Performer / Monitor', 22, 43);
  }

  // Direct pointer drag on canvas for Performer / Monitor angles
  var dragging = null;
  function canvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  canvas.addEventListener('pointerdown', function (e) {
    var pt = canvasPos(e);
    var dv = lastMarkers.voice ? Math.hypot(pt.x - lastMarkers.voice.x, pt.y - lastMarkers.voice.y) : 999;
    var dm = lastMarkers.monitor ? Math.hypot(pt.x - lastMarkers.monitor.x, pt.y - lastMarkers.monitor.y) : 999;
    if (dv <= 28 || dm <= 28) {
      dragging = dv <= dm ? 'voice' : 'monitor';
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var pt = canvasPos(e);
    var deg = Math.round(Math.atan2(pt.y - lastMarkers.cy, pt.x - lastMarkers.cx) * 180 / Math.PI + 90);
    while (deg > 180) deg -= 360;
    while (deg < -180) deg += 360;
    $(dragging === 'voice' ? 'voice-angle' : 'monitor-angle').value = deg;
    update();
  });
  canvas.addEventListener('pointerup', function () { dragging = null; });
  canvas.addEventListener('pointercancel', function () { dragging = null; });

  // Web Audio Polar Pattern Audition (Voice + Monitor + Proximity Bass + Off-Axis Damping)
  var audioSys = null, polarNodes = null, audioOn = false;
  var audioBtn = $('mp-audio-btn');

  function ensurePolarAudio() {
    if (audioSys) return audioSys;
    var synth = window.AudioLabSynth;
    audioSys = synth ? synth.createContext({ gain: 0.36 }) : null;
    if (!audioSys) return null;
    var ctx = audioSys.ctx;

    var vBuf = synth.createKeysPhraseBuffer(ctx);
    var mBuf = synth.createNoiseBuffer(ctx, 2.0, 'pink', 5150);

    var vSrc = ctx.createBufferSource(); vSrc.buffer = vBuf; vSrc.loop = true;
    var mSrc = ctx.createBufferSource(); mSrc.buffer = mBuf; mSrc.loop = true;

    var proxShelf = ctx.createBiquadFilter(); proxShelf.type = 'lowshelf'; proxShelf.frequency.value = 145; proxShelf.gain.value = 0;
    var offAxisHF = ctx.createBiquadFilter(); offAxisHF.type = 'highshelf'; offAxisHF.frequency.value = 2600; offAxisHF.gain.value = 0;
    var vGain = ctx.createGain(); vGain.gain.value = 0.8;
    var mFilter = ctx.createBiquadFilter(); mFilter.type = 'bandpass'; mFilter.frequency.value = 1400; mFilter.Q.value = 0.9;
    var mGain = ctx.createGain(); mGain.gain.value = 0.05;
    var outGate = ctx.createGain(); outGate.gain.value = 0;

    vSrc.connect(proxShelf).connect(offAxisHF).connect(vGain).connect(outGate);
    mSrc.connect(mFilter).connect(mGain).connect(outGate);
    outGate.connect(audioSys.input);
    vSrc.start(); mSrc.start();

    polarNodes = { proxShelf: proxShelf, offAxisHF: offAxisHF, vGain: vGain, mGain: mGain, outGate: outGate };
    return audioSys;
  }

  function updatePolarAudio(voice, spill, distance) {
    if (!polarNodes || !audioSys) return;
    var ctx = audioSys.ctx;
    var sm = window.AudioLabSynth.smooth;
    var pat = $('pattern').value;
    // True inverse square relative to 20 cm baseline
    var distGain = clamp(20 / Math.max(5, distance), 0.12, 2.5);
    // Directional mics boost bass below 20 cm (proximity effect); Omni stays flat
    var proxDb = (pat === 'omni' || distance >= 22) ? 0 : clamp((22 - distance) * 0.48, 0, 8);
    var hfCutDb = voice < 0.7 ? -Math.min(10, (0.7 - voice) * 14) : 0;

    sm(polarNodes.proxShelf.gain, proxDb, ctx, 0.025);
    sm(polarNodes.offAxisHF.gain, hfCutDb, ctx, 0.025);
    sm(polarNodes.vGain.gain, voice * distGain * 0.55, ctx, 0.025);
    sm(polarNodes.mGain.gain, spill * 0.42, ctx, 0.025);
    sm(polarNodes.outGate.gain, audioOn && !document.hidden ? 1 : 0, ctx, 0.025);
  }

  var orbit = $('mp-orbit');
  var orbitTimer = null;
  function stopOrbit() {
    clearInterval(orbitTimer);
    orbitTimer = null;
    orbit.setAttribute('aria-pressed', 'false');
    orbit.textContent = '▶ Circle the mic';
  }
  orbit.addEventListener('click', function () {
    if (orbitTimer !== null) return stopOrbit();
    if (!audioOn) audioBtn.click();
    if (!audioOn) return;
    orbit.setAttribute('aria-pressed', 'true');
    orbit.textContent = 'Pause movement';
    orbitTimer = setInterval(function () {
      var angle = $('voice-angle');
      angle.value = (Number(angle.value) + 181) % 360 - 180;
      update();
    }, 40);
  });
  $('voice-angle').addEventListener('input', stopOrbit);
  canvas.addEventListener('pointerdown', stopOrbit);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopOrbit(); });

  if (audioBtn) {
    audioBtn.addEventListener('click', function () {
      audioOn = !audioOn;
      if (audioOn) {
        ensurePolarAudio();
        if (audioSys) audioSys.resume();
        else audioOn = false;
      }
      if (!audioOn) stopOrbit();
      audioBtn.setAttribute('aria-pressed', audioOn ? 'true' : 'false');
      audioBtn.classList.toggle('audio-on', audioOn);
      audioBtn.textContent = audioOn ? '🔇 Stop Audition' : '▶ Hear piano';
      update();
    });
  }

  function scoreBrief(advantage, voice, spill, distance) {
    if (!activeBrief) return;
    var pat = $('pattern').value;
    var rules = {
      podium: [voice > 0.75, spill < 0.30, distance < 45],
      interview: [pat === 'figure8' || pat === 'omni', distance < 100],
      choir: [pat === 'omni' || pat === 'cardioid', distance > 50],
      musical: [advantage > 10, spill < 0.25, distance < 35]
    };
    var checks = rules[activeBrief];
    var total = checks.length;
    var passed = checks.filter(Boolean).length;
    var text = {
      podium: 'Keep speech clear and close while pointing a directional null toward stage loudspeakers.',
      interview: 'Capture two opposing people evenly without handing off the mic (Figure-8 or Omni).',
      choir: 'Capture a wide ensemble evenly from back enough distance (> 50 cm) without isolating one singer.',
      musical: 'Close miking (< 35 cm), strong monitor rejection (< 25% spill), and > +10 dB signal advantage.'
    };
    $('brief-readout').className = 'te-readout ' + (passed === total ? 'good' : 'warn');
    $('brief-readout').innerHTML = '<strong>' + passed + '/' + total + ' constraints met.</strong> ' + text[activeBrief];
  }

  function update() {
    $('voice-angle-out').value = $('voice-angle').value + '°';
    $('monitor-angle-out').value = $('monitor-angle').value + '°';
    $('distance-out').value = $('distance').value + ' cm';
    var voice = response(Number($('voice-angle').value));
    var spill = response(Number($('monitor-angle').value));
    var distance = Number($('distance').value);
    // True inverse square relative to 20 cm reference (no clamp below 20 cm)
    var distanceFactor = 20 / Math.max(5, distance);
    var wanted = voice * distanceFactor;
    var advantage = 20 * Math.log10((wanted + 0.02) / (spill + 0.02));
    $('voice-pickup').textContent = Math.round(wanted * 100) + '%';
    $('monitor-spill').textContent = Math.round(spill * 100) + '%';
    $('signal-advantage').textContent = (advantage >= 0 ? '+' : '') + advantage.toFixed(1) + ' dB';

    var out = $('placement-readout');
    out.className = 'te-readout ' + (advantage > 10 ? 'good' : advantage > 2 ? 'warn' : 'bad');
    out.innerHTML = '<strong>' + names[$('pattern').value] + ':</strong> ' +
      (voice > 0.72 ? 'Performer on-axis. ' : 'Performer off-axis — tone & level drop. ') +
      (spill < 0.2 ? 'Monitor sits near a rejection null.' : 'Monitor bleed is high — feedback risk rises.') +
      (distance > 80 ? ' Distant placement raises room reverberation.' : distance < 15 && $('pattern').value !== 'omni' ? ' Close directional miking adds proximity bass warmth.' : '');

    draw();
    scoreBrief(advantage, voice, spill, distance);
    updatePolarAudio(voice, spill, distance);
  }

  // Workbench tab switching (supports #three-to-one hash navigation)
  var wbTabs = document.querySelectorAll('#polar-workbench .te-wb-tab[data-panel]');
  var wbPanels = document.querySelectorAll('#polar-workbench .te-wb-panel');
  function openTab(panelId) {
    var cabPlay = $('cab-play');
    if (panelId !== 'placement-studio' && cabPlay.getAttribute('aria-pressed') === 'true') cabPlay.click();
    if (panelId !== 'mp-panel-polar' && audioOn) audioBtn.click();
    if (panelId !== 'three-to-one') {
      var playing = document.querySelector('#three-to-one .audio-toggle[aria-pressed="true"]');
      if (playing) playing.click();
    }
    wbTabs.forEach(function (b) { b.setAttribute('aria-selected', b.dataset.panel === panelId ? 'true' : 'false'); });
    wbPanels.forEach(function (p) { p.hidden = p.id !== panelId; });
    if (panelId === 'mp-panel-polar' && fit) {
      setTimeout(function () { fit.resize(); draw(); }, 0);
    }
  }
  wbTabs.forEach(function (btn) {
    btn.addEventListener('click', function () { openTab(btn.dataset.panel); });
  });
  if (window.location.hash === '#three-to-one') openTab('three-to-one');
  window.addEventListener('hashchange', function () {
    if (window.location.hash === '#three-to-one') openTab('three-to-one');
  });
  document.querySelectorAll('[data-open-three-to-one]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openTab('three-to-one');
      $('polar-workbench').scrollIntoView({ behavior: 'smooth' });
    });
  });

  controls.forEach(function (c) { c.addEventListener('input', update); });
  document.querySelectorAll('[data-brief]').forEach(function (b) {
    b.addEventListener('click', function () {
      activeBrief = b.dataset.brief;
      document.querySelectorAll('[data-brief]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      update();
    });
  });

  // Multi-question Quick Check with Reset
  document.querySelectorAll('.te-check[data-answer]').forEach(function (group) {
    var ans = group.dataset.answer;
    var fb = group.nextElementSibling;
    group.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        group.querySelectorAll('button').forEach(function (b) { b.className = ''; });
        var ok = btn.dataset.choice === ans;
        btn.className = ok ? 'correct' : 'wrong';
        if (fb) fb.textContent = ok ? '✓ ' + (group.dataset.ok || 'Correct!') : '✗ ' + (group.dataset.bad || 'Try again.');
      });
    });
  });
  var resetQuizBtn = $('mp-quiz-reset');
  if (resetQuizBtn) {
    resetQuizBtn.addEventListener('click', function () {
      document.querySelectorAll('.te-check[data-answer]').forEach(function (group) {
        group.querySelectorAll('button').forEach(function (b) { b.className = ''; });
        if (group.nextElementSibling) group.nextElementSibling.textContent = 'Select an answer.';
      });
    });
  }

  document.addEventListener('creation-app-resize', function () { if (fit) fit.resize(); draw(); });
  document.addEventListener('visibilitychange', function () { update(); });
  update();
})();
