(function () {
  'use strict';

  var Core = window.RadioactiveDecayCore;
  var SimKit = window.SimKit;
  if (!Core || !SimKit) return;

  var NS = 'http://www.w3.org/2000/svg';
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(id) { return document.getElementById(id); }

  function svgEl(tag, attrs, text) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    return el;
  }

  /* ======================================================================
     Shared SVG Segrè Nuclide Chart (N on x-axis, Z on y-axis)
     ====================================================================== */
  function drawChart(svg, trail, opts) {
    opts = opts || {};
    var W = 560;
    var H = 400;
    var pad = 46;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var fr = opts.frame || trail;
    var ns = fr.map(function (t) { return t.a - t.z; });
    var zs = fr.map(function (t) { return t.z; });
    var margin = opts.margin || 4;
    var minN = Math.max(0, Math.min.apply(null, ns) - margin);
    var maxN = Math.max.apply(null, ns) + margin;
    var minZ = Math.max(0, Math.min.apply(null, zs) - margin);
    var maxZ = Math.max.apply(null, zs) + margin;
    var spanN = Math.max(maxN - minN, 12);
    var spanZ = Math.max(maxZ - minZ, 10);
    var cell = Math.min((W - pad * 1.45) / spanN, (H - pad * 1.45) / spanZ);

    function X(n) { return pad + (n - minN) * cell; }
    function Y(z) { return H - pad - (z - minZ) * cell; }

    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#08101b' }));

    var gs = spanN > 60 ? 10 : spanN > 28 ? 5 : 2;
    for (var n = Math.ceil(minN / gs) * gs; n <= minN + spanN; n += gs) {
      svg.appendChild(svgEl('line', { x1: X(n), y1: Y(minZ), x2: X(n), y2: Y(minZ + spanZ), stroke: 'rgba(160,210,240,0.10)' }));
      svg.appendChild(svgEl('text', { x: X(n), y: H - pad + 16, 'text-anchor': 'middle', 'font-size': 10, fill: '#9bb6d0' }, n));
    }
    for (var z = Math.ceil(minZ / gs) * gs; z <= minZ + spanZ; z += gs) {
      svg.appendChild(svgEl('line', { x1: X(minN), y1: Y(z), x2: X(minN + spanN), y2: Y(z), stroke: 'rgba(160,210,240,0.10)' }));
      svg.appendChild(svgEl('text', { x: pad - 8, y: Y(z) + 3, 'text-anchor': 'end', 'font-size': 10, fill: '#9bb6d0' }, z));
    }

    svg.appendChild(svgEl('text', { x: W / 2, y: H - 8, 'text-anchor': 'middle', 'font-size': 12, fill: '#c4d8ec', 'font-weight': 700 }, 'Neutrons (N) →'));
    svg.appendChild(svgEl('text', { x: 14, y: H / 2, 'font-size': 12, fill: '#c4d8ec', 'font-weight': 700, transform: 'rotate(-90 14 ' + H / 2 + ')', 'text-anchor': 'middle' }, 'Protons (Z) →'));

    // N = Z dashed reference line
    var diagPts = [];
    for (var dz = Math.max(0, Math.floor(minZ)); dz <= minZ + spanZ; dz++) {
      if (dz >= minN - 1 && dz <= minN + spanN + 1) diagPts.push(X(dz) + ',' + Y(dz));
    }
    if (diagPts.length > 1) {
      svg.appendChild(svgEl('polyline', {
        points: diagPts.join(' '),
        fill: 'none',
        stroke: 'rgba(160,210,240,0.22)',
        'stroke-width': 1.2,
        'stroke-dasharray': '4 4'
      }));
    }

    // Approximate stability trend + real stable nuclide squares
    var trendPts = [];
    for (var zz = Math.max(1, Math.floor(minZ)); zz <= minZ + spanZ; zz += 0.5) {
      var nn = Core.approxStabilityN(zz);
      if (nn >= minN - 2 && nn <= minN + spanN + 2) trendPts.push(X(nn) + ',' + Y(zz));
    }
    if (trendPts.length > 1) {
      svg.appendChild(svgEl('polyline', {
        points: trendPts.join(' '),
        fill: 'none',
        stroke: 'rgba(79,220,154,0.18)',
        'stroke-width': 10,
        'stroke-linecap': 'round'
      }));
    }

    var sqSize = Math.max(4, Math.min(11, cell * 0.72));
    Core.STABLE_NUCLIDES.forEach(function (pair) {
      var sz = pair[0];
      var sn = pair[1];
      if (sn < minN - 0.5 || sn > minN + spanN + 0.5 || sz < minZ - 0.5 || sz > minZ + spanZ + 0.5) return;
      svg.appendChild(svgEl('rect', {
        x: X(sn) - sqSize / 2,
        y: Y(sz) - sqSize / 2,
        width: sqSize,
        height: sqSize,
        rx: 1.5,
        fill: 'rgba(79, 220, 154, 0.34)',
        stroke: 'rgba(79, 220, 154, 0.55)',
        'stroke-width': 0.8
      }));
    });

    svg.appendChild(svgEl('text', { x: W - pad + 10, y: 20, 'text-anchor': 'end', 'font-size': 10.5, fill: '#9bb6d0' }, 'green squares = stable nuclides'));

    // Optional faint preview of full chain
    if (opts.fullChain && opts.fullChain.length > 1) {
      var ghostPts = opts.fullChain.map(function (t) { return X(t.a - t.z) + ',' + Y(t.z); }).join(' ');
      svg.appendChild(svgEl('polyline', {
        points: ghostPts,
        fill: 'none',
        stroke: 'rgba(183,166,255,0.22)',
        'stroke-width': 1.8,
        'stroke-dasharray': '3 4'
      }));
    }

    // Arrowhead markers
    var defs = svgEl('defs', {});
    Object.keys(Core.DECAY_MODES).forEach(function (m) {
      var mk = svgEl('marker', {
        id: 'ar-' + svg.id + '-' + m.replace('-', 'minus').replace('+', 'plus'),
        viewBox: '0 0 10 10',
        refX: 8.5,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: 'auto-start-reverse'
      });
      mk.appendChild(svgEl('path', { d: 'M0 0L10 5L0 10z', fill: Core.DECAY_MODES[m].color }));
      defs.appendChild(mk);
    });
    svg.appendChild(defs);

    for (var i = 1; i < trail.length; i++) {
      var p = trail[i - 1];
      var q = trail[i];
      var m = q.mode || 'gamma';
      var col = Core.DECAY_MODES[m].color;
      if (p.z === q.z && p.a === q.a) {
        svg.appendChild(svgEl('circle', {
          cx: X(q.a - q.z),
          cy: Y(q.z),
          r: 15,
          fill: 'none',
          stroke: col,
          'stroke-width': 2.2,
          'stroke-dasharray': '3 3'
        }));
        continue;
      }
      svg.appendChild(svgEl('line', {
        x1: X(p.a - p.z),
        y1: Y(p.z),
        x2: X(q.a - q.z),
        y2: Y(q.z),
        stroke: col,
        'stroke-width': 2.6,
        'marker-end': 'url(#ar-' + svg.id + '-' + m.replace('-', 'minus').replace('+', 'plus') + ')'
      }));
    }

    trail.forEach(function (t, idx) {
      var cx = X(t.a - t.z);
      var cy = Y(t.z);
      var last = idx === trail.length - 1;
      var dot = svgEl('circle', {
        cx: cx,
        cy: cy,
        r: last ? 7.5 : 4.8,
        fill: last ? '#ffffff' : (t.gas ? '#f6c35b' : '#b7a6ff'),
        stroke: '#08101b',
        'stroke-width': 1.6
      });
      if (opts.onSelectIndex) {
        dot.style.cursor = 'pointer';
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('role', 'button');
        dot.setAttribute('aria-label', Core.formatLabel(t.z, t.a));
        dot.addEventListener('click', function () { opts.onSelectIndex(idx); });
        dot.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            opts.onSelectIndex(idx);
          }
        });
      }
      svg.appendChild(dot);

      if (last || idx === 0 || trail.length <= 3) {
        var lblText = Core.formatLabel(t.z, t.a, t.tag || '');
        var tx = cx + 10;
        var ty = idx === 0 && trail.length > 1 ? cy + 14 : cy - 9;
        if (tx > W - 74) tx = cx - 56;
        if (ty < 20) ty = cy + 16;
        svg.appendChild(svgEl('text', {
          x: tx,
          y: ty,
          'font-size': 11.5,
          'font-weight': 700,
          fill: last ? '#ffffff' : '#d6ebff'
        }, lblText));
      }
    });
  }

  /* ======================================================================
     Simulation 1: Decay Lab (Nucleus Chamber + Chart + Predict Mode)
     ====================================================================== */
  var labSel = $('lab-nuc');
  var labOut = $('lab-out');
  var labChart = $('lab-chart');
  var labCanvas = $('lab-nucleus');
  var labPredictToggle = $('lab-predict-toggle');
  var labPredictInputs = $('lab-predict-inputs');
  var labPredA = $('lab-pred-a');
  var labPredZ = $('lab-pred-z');
  var labStreakEl = $('lab-streak');

  var predictMode = false;
  var streak = 0;
  var labState = {
    nuc: Core.LAB_NUCLIDES[0],
    mode: null,
    animT: 1,
    animating: false,
    nucleons: []
  };

  function buildNucleonCluster(z, a) {
    // Representative compact cluster (exact count up to 44 nucleons, scaled to 44 for heavy nuclei)
    var total = Math.min(a, 44);
    var pCount = Math.max(1, Math.round((z / a) * total));
    var list = [];
    for (var i = 0; i < total; i++) {
      var angle = i * 2.3999632; // golden angle spiral
      var radius = Math.sqrt((i + 0.5) / total) * 34;
      list.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        isProton: i < pCount,
        phase: (i * 0.73) % (Math.PI * 2)
      });
    }
    // Mix protons and neutrons deterministically so cluster looks interleaved
    list.sort(function (u, v) { return (u.x * 13 + u.y * 7) - (v.x * 13 + v.y * 7); });
    return list;
  }

  var nucSurface = SimKit.canvas2d(labCanvas, { height: 220 });

  function drawNucleusFrame(tSec) {
    var ctx = nucSurface.ctx;
    var W = nucSurface.width;
    var H = nucSurface.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#08101b';
    ctx.fillRect(0, 0, W, H);

    var n = labState.nuc;
    var mode = labState.mode;
    var p = labState.animT; // 0 -> 1
    var cx = W * (mode ? 0.38 - Math.sin(Math.min(1, p) * Math.PI) * 0.03 : 0.48);
    var cy = H * 0.52;

    // Subtle nuclear potential halo
    var grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 68);
    grad.addColorStop(0, mode === 'gamma' && p < 0.7 ? 'rgba(246,195,91,0.34)' : 'rgba(56,189,248,0.16)');
    grad.addColorStop(1, 'rgba(8,16,27,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 68, 0, Math.PI * 2);
    ctx.fill();

    // Excited gamma rings before photon release
    if ((n.tag === 'm' && !mode) || (mode === 'gamma' && p < 0.55)) {
      var pulse = prefersReducedMotion ? 1 : (0.5 + 0.5 * Math.sin(tSec * 6));
      ctx.strokeStyle = 'rgba(246, 195, 91, ' + (0.35 + pulse * 0.45) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 44 + pulse * 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw packed nucleons
    var wobble = prefersReducedMotion ? 0 : 1.1;
    for (var i = 0; i < labState.nucleons.length; i++) {
      var item = labState.nucleons[i];
      // Alpha skips 4 outer nucleons after trigger
      if (mode === 'alpha' && i >= labState.nucleons.length - 4) continue;
      var nx = cx + item.x + Math.cos(tSec * 3.1 + item.phase) * wobble;
      var ny = cy + item.y + Math.sin(tSec * 2.7 + item.phase) * wobble;
      var fillProton = item.isProton;
      if (mode === 'beta-' && i === 0 && p > 0.2) fillProton = true;
      if (mode === 'beta+' && i === 0 && p > 0.2) fillProton = false;

      ctx.beginPath();
      ctx.arc(nx, ny, 6.2, 0, Math.PI * 2);
      ctx.fillStyle = fillProton ? '#ff7a94' : '#5882b4';
      ctx.fill();
      ctx.strokeStyle = '#08101b';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      if (mode && i === 0 && (mode === 'beta-' || mode === 'beta+') && p < 0.6) {
        ctx.beginPath();
        ctx.arc(nx, ny, 11, 0, Math.PI * 2);
        ctx.strokeStyle = mode === 'beta-' ? '#38bdf8' : '#4fdc9a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Emitted particle trajectory
    if (mode) {
      var ex = cx + 44 + p * (W * 0.48);
      var ey = cy;
      if (mode === 'alpha') {
        var clusterOffsets = [[-4, -4], [4, -4], [-4, 4], [4, 4]];
        for (var k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.arc(ex + clusterOffsets[k][0], ey + clusterOffsets[k][1], 5.6, 0, Math.PI * 2);
          ctx.fillStyle = k < 2 ? '#ff7a94' : '#5882b4';
          ctx.fill();
          ctx.strokeStyle = '#08101b';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.fillStyle = '#ff99ad';
        ctx.font = '700 12px Inter, sans-serif';
        ctx.fillText('⁴₂He (α)', ex - 18, ey - 18);
      } else if (mode === 'beta-' || mode === 'beta+') {
        var isMinus = mode === 'beta-';
        ctx.strokeStyle = isMinus ? 'rgba(56,189,248,0.45)' : 'rgba(79,220,154,0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 20, cy);
        ctx.lineTo(ex, ey - 14);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ex, ey - 14, 5, 0, Math.PI * 2);
        ctx.fillStyle = isMinus ? '#38bdf8' : '#4fdc9a';
        ctx.fill();
        ctx.fillStyle = '#eef6ff';
        ctx.font = '700 12px Inter, sans-serif';
        ctx.fillText(isMinus ? 'e⁻ (β⁻)' : 'e⁺ (β⁺)', ex - 16, ey - 26);

        // Antineutrino / neutrino wave
        ctx.strokeStyle = 'rgba(183, 166, 255, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (var wx = 0; wx <= 36; wx += 3) {
          var px = ex - 36 + wx;
          var py = ey + 20 + Math.sin(wx * 0.45 - tSec * 10) * 4;
          if (wx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.fillStyle = '#d3c9ff';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillText(isMinus ? 'ν̄' : 'ν', ex + 4, ey + 24);
      } else if (mode === 'gamma') {
        ctx.strokeStyle = '#f6c35b';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        var waveStart = Math.max(cx + 38, ex - 70);
        for (var gx = waveStart; gx <= ex; gx += 3) {
          var gy = ey + Math.sin((gx - tSec * 180) * 0.25) * 9;
          if (gx === waveStart) ctx.moveTo(gx, gy); else ctx.lineTo(gx, gy);
        }
        ctx.stroke();
        ctx.fillStyle = '#ffe19b';
        ctx.font = '700 12px Inter, sans-serif';
        ctx.fillText('γ photon', ex - 22, ey - 16);
      }
    }

    // Bottom info legend inside chamber
    var shownZ = mode ? Core.stepDecay(n.z, n.a, mode).z : n.z;
    var shownA = mode ? Core.stepDecay(n.z, n.a, mode).a : n.a;
    var shownN = shownA - shownZ;
    ctx.fillStyle = '#c4d8ec';
    ctx.font = '600 11.5px "JetBrains Mono", monospace';
    ctx.fillText(
      Core.formatLabel(shownZ, shownA, !mode ? (n.tag || '') : '') + ' · ' + shownZ + ' p⁺ (rose) / ' + shownN + ' n⁰ (blue)',
      12,
      H - 12
    );
  }

  SimKit.loop(function (dt, ts) {
    if (labState.animating) {
      labState.animT = prefersReducedMotion ? 1 : Math.min(1, labState.animT + dt * 1.15);
      if (labState.animT >= 1) labState.animating = false;
    }
    drawNucleusFrame(ts / 1000);
  }, { el: SimKit.stage(labCanvas), maxDt: 0.05 });

  Core.LAB_NUCLIDES.forEach(function (n, i) {
    var opt = document.createElement('option');
    opt.value = i;
    opt.textContent = Core.formatLabel(n.z, n.a, n.tag || '') + ' (' + Core.nameFor(n.z) + ', Z=' + n.z + ')';
    labSel.appendChild(opt);
  });

  function labReset() {
    var n = Core.LAB_NUCLIDES[+labSel.value];
    labState.nuc = n;
    labState.mode = null;
    labState.animT = 1;
    labState.animating = false;
    labState.nucleons = buildNucleonCluster(n.z, n.a);
    if (labPredA) labPredA.value = '';
    if (labPredZ) labPredZ.value = '';
    drawChart(labChart, [{ z: n.z, a: n.a, tag: n.tag }], { margin: 5 });
    labOut.innerHTML =
      '<div class="eq">' + Core.formatNuclide(n.z, n.a, n.tag || '') + ' · ' + Core.formatFullName(n.z, n.a, n.tag || '') + '</div>' +
      'Half-life: <b>' + n.hl + '</b> · Real-world role: ' + n.use + '<br>' +
      (predictMode
        ? '<span class="warn">Predict Mode ON:</span> optionally enter daughter A &amp; Z above, then click the decay mode you predict.'
        : 'Choose a decay mode to watch the nucleus transform and move across the chart.');
  }

  function labTry(mode) {
    var n = Core.LAB_NUCLIDES[+labSel.value];
    var cons = Core.checkConservation(n.z, n.a, mode);
    var okMode = mode === n.real;

    labState.nuc = n;
    labState.mode = mode;
    labState.animT = prefersReducedMotion ? 1 : 0.04;
    labState.animating = !prefersReducedMotion;
    labState.nucleons = buildNucleonCluster(n.z, n.a);

    var trail = [{ z: n.z, a: n.a, tag: n.tag }, { z: cons.daughterZ, a: cons.daughterA, mode: mode }];
    drawChart(labChart, trail, { margin: 5 });

    var html = '<div class="eq">' + Core.formatEquation(n.z, n.a, mode, n.tag || '') + '</div>';
    html += 'Conservation check: <b>A</b> ' + n.a + ' = ' + cons.daughterA + ' + ' + cons.emittedA +
      ' · <b>Z</b> ' + n.z + ' = ' + cons.daughterZ + ' + (' + (cons.emittedZ >= 0 ? '+' + cons.emittedZ : cons.emittedZ) + ')<br>';

    if (!cons.validElement) {
      html += '<span class="rd-no">Outside valid element range.</span><br>';
    } else if (mode === 'gamma') {
      html += 'Daughter: <b>' + Core.formatFullName(cons.daughterZ, cons.daughterA) + '</b> (same element, lower nuclear energy).<br>';
    } else {
      html += 'Daughter: <b>' + Core.formatFullName(cons.daughterZ, cons.daughterA) + ' (' + Core.formatLabel(cons.daughterZ, cons.daughterA) + ')</b> — atomic number ' +
        (cons.daughterZ < n.z ? 'drops by ' + (n.z - cons.daughterZ) : 'rises by ' + (cons.daughterZ - n.z)) + '.<br>';
    }

    if (predictMode) {
      var rawA = labPredA.value.trim();
      var rawZ = labPredZ.value.trim();
      var numbersEntered = rawA !== '' && rawZ !== '';
      var numbersOk = !numbersEntered || (+rawA === cons.daughterA && +rawZ === cons.daughterZ);
      if (okMode && numbersOk) {
        streak++;
        html += '<span class="rd-ok">✓ Prediction spot-on!</span> ';
      } else {
        streak = 0;
        if (numbersEntered && !numbersOk) {
          html += '<span class="rd-no">✗ Your predicted numbers were A=' + rawA + ', Z=' + rawZ + ' (step gives A=' + cons.daughterA + ', Z=' + cons.daughterZ + ').</span> ';
        }
      }
      if (labStreakEl) labStreakEl.textContent = 'Streak: ' + streak;
    }

    if (okMode) {
      html += '<span class="rd-ok">✓ Main natural route for ' + Core.formatLabel(n.z, n.a, n.tag || '') + '.</span> ' +
        (n.note ? n.note + ' ' : '') + 'Role: ' + n.use;
    } else {
      html += '<span class="rd-no">✗ Hypothetical step only.</span> ' +
        Core.formatLabel(n.z, n.a, n.tag || '') + ' naturally decays by <b>' + Core.DECAY_MODES[n.real].name + '</b>. ' +
        Core.explainWrongMode(n, mode);
    }
    labOut.innerHTML = html;
  }

  labSel.addEventListener('change', labReset);
  Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (btn) {
    btn.addEventListener('click', function () { labTry(btn.getAttribute('data-mode')); });
  });
  if (labPredictToggle) {
    labPredictToggle.addEventListener('click', function () {
      predictMode = !predictMode;
      labPredictToggle.setAttribute('aria-pressed', String(predictMode));
      labPredictToggle.textContent = predictMode ? 'Predict Mode: ON' : 'Predict Mode: OFF';
      if (labPredictInputs) labPredictInputs.hidden = !predictMode;
      labReset();
    });
  }
  labReset();

  /* ======================================================================
     Simulation 2: Half-Life Simulator (SimKit + Log₂ + Geiger Audio + Trails)
     ====================================================================== */
  var cvA = $('hl-atoms');
  var cvG = $('hl-graph');
  var surfA = SimKit.canvas2d(cvA, { height: 340 });
  var surfG = SimKit.canvas2d(cvG, { height: 260 });

  var hlState = {
    n0: 400,
    half: 5,
    atoms: [],
    flashes: [],
    elapsed: 0,
    hist: [],
    ghostTrials: [],
    running: false,
    scaleMode: 'linear',
    audioOn: false,
    accum: 0,
    dtStep: 0.1
  };

  var audioCtx = null;
  function playGeigerClicks(count) {
    if (!hlState.audioOn || !count) return;
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    var capped = Math.min(6, count);
    var now = audioCtx.currentTime;
    for (var i = 0; i < capped; i++) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1600 + Math.random() * 900, now + i * 0.008);
      gain.gain.setValueAtTime(0.08, now + i * 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.008 + 0.008);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + i * 0.008);
      osc.stop(now + i * 0.008 + 0.01);
    }
  }

  function hlReset(saveTrail) {
    if (saveTrail && hlState.hist.length > 2) {
      hlState.ghostTrials.push(hlState.hist.slice());
      if (hlState.ghostTrials.length > 4) hlState.ghostTrials.shift();
    }
    hlState.atoms = new Array(hlState.n0).fill(true);
    hlState.flashes = new Float32Array(hlState.n0);
    hlState.elapsed = 0;
    hlState.accum = 0;
    hlState.hist = [[0, hlState.n0]];
    hlState.running = false;
    $('hl-run').textContent = '▶ Start';
    hlDraw();
  }

  function hlAdvance(dt, instantHalve) {
    var p = instantHalve ? 0.5 : Core.stepDecayProbability(dt, hlState.half);
    var left = 0;
    var clicks = 0;
    for (var i = 0; i < hlState.n0; i++) {
      if (hlState.atoms[i]) {
        if (Math.random() < p) {
          hlState.atoms[i] = false;
          hlState.flashes[i] = prefersReducedMotion ? 0 : 0.35;
          clicks++;
        } else {
          left++;
        }
      }
    }
    hlState.elapsed += instantHalve ? hlState.half : dt;
    hlState.hist.push([hlState.elapsed, left]);
    playGeigerClicks(clicks);
    if (left === 0 || hlState.elapsed >= hlState.half * 6) {
      hlState.running = false;
      $('hl-run').textContent = '▶ Start';
    }
  }

  function hlDraw() {
    var cA = surfA.ctx;
    var AW = surfA.width;
    var AH = surfA.height;
    cA.clearRect(0, 0, AW, AH);
    cA.fillStyle = '#08101b';
    cA.fillRect(0, 0, AW, AH);

    var cols = Math.round(Math.sqrt(hlState.n0));
    var padA = 10;
    var cw = (AW - padA * 2) / cols;
    var ch = (AH - padA * 2) / cols;
    var rLive = Math.max(2.2, Math.min(12, Math.min(cw, ch) * 0.36));
    var rDead = Math.max(1.5, rLive * 0.42);

    for (var i = 0; i < hlState.n0; i++) {
      var x = padA + (i % cols + 0.5) * cw;
      var y = padA + (Math.floor(i / cols) + 0.5) * ch;
      if (hlState.flashes[i] > 0) {
        cA.beginPath();
        cA.arc(x, y, rLive * 1.45, 0, Math.PI * 2);
        cA.fillStyle = 'rgba(255, 122, 148, ' + (hlState.flashes[i] / 0.35 * 0.55) + ')';
        cA.fill();
      }
      cA.beginPath();
      cA.arc(x, y, hlState.atoms[i] ? rLive : rDead, 0, Math.PI * 2);
      cA.fillStyle = hlState.atoms[i] ? '#38bdf8' : '#2f3d57';
      cA.fill();
    }

    // Graph
    var cG = surfG.ctx;
    var W = surfG.width;
    var H = surfG.height;
    var L = 44;
    var B = 28;
    var T = 14;
    var R = 14;
    cG.clearRect(0, 0, W, H);
    cG.fillStyle = '#08101b';
    cG.fillRect(0, 0, W, H);

    var tmax = hlState.half * 6;
    var isLog = hlState.scaleMode === 'log2';
    var logMax = Math.log2(hlState.n0);

    function X(t) { return L + (W - L - R) * (t / tmax); }
    function Y(n) {
      if (!isLog) return T + (H - T - B) * (1 - n / hlState.n0);
      var clamped = Math.max(1, n);
      return T + (H - T - B) * (1 - Math.log2(clamped) / logMax);
    }

    cG.strokeStyle = 'rgba(160, 210, 240, 0.14)';
    cG.fillStyle = '#9bb6d0';
    cG.font = '10.5px Inter, sans-serif';
    cG.lineWidth = 1;

    if (!isLog) {
      for (var k = 0; k <= 4; k++) {
        var val = Math.round(hlState.n0 * k / 4);
        var yy = Y(val);
        cG.beginPath(); cG.moveTo(L, yy); cG.lineTo(W - R, yy); cG.stroke();
        cG.fillText(String(val), 6, yy + 3);
      }
    } else {
      for (var d = 0; d <= 5; d++) {
        var lv = Math.max(1, Math.round(hlState.n0 / Math.pow(2, d)));
        var ly = Y(lv);
        cG.beginPath(); cG.moveTo(L, ly); cG.lineTo(W - R, ly); cG.stroke();
        cG.fillText(String(lv), 6, ly + 3);
      }
    }

    for (var h = 0; h <= 6; h++) {
      var xx = X(h * hlState.half);
      cG.beginPath(); cG.moveTo(xx, T); cG.lineTo(xx, H - B); cG.stroke();
      cG.fillText(h + 't½', xx - 7, H - 9);
    }

    // Ghost trials
    hlState.ghostTrials.forEach(function (trial) {
      cG.strokeStyle = 'rgba(183, 166, 255, 0.35)';
      cG.lineWidth = 1.4;
      cG.beginPath();
      trial.forEach(function (pt, idx) {
        if (pt[0] > tmax) return;
        var gx = X(pt[0]);
        var gy = Y(pt[1]);
        if (idx === 0) cG.moveTo(gx, gy); else cG.lineTo(gx, gy);
      });
      cG.stroke();
    });

    // Ideal theoretical curve
    cG.strokeStyle = '#eef6ff';
    cG.lineWidth = 1.8;
    cG.setLineDash([5, 4]);
    cG.beginPath();
    for (var t = 0; t <= tmax; t += tmax / 100) {
      var ideal = Core.expectedRemaining(hlState.n0, t, hlState.half);
      if (t === 0) cG.moveTo(X(t), Y(ideal)); else cG.lineTo(X(t), Y(ideal));
    }
    cG.stroke();
    cG.setLineDash([]);

    // Active trial curve
    cG.strokeStyle = '#ff7a94';
    cG.lineWidth = 2.4;
    cG.beginPath();
    hlState.hist.forEach(function (pt, idx) {
      if (pt[0] > tmax) return;
      var px = X(pt[0]);
      var py = Y(pt[1]);
      if (idx === 0) cG.moveTo(px, py); else cG.lineTo(px, py);
    });
    cG.stroke();

    var left = hlState.hist[hlState.hist.length - 1][1];
    $('hl-time').textContent = hlState.elapsed.toFixed(1) + ' s';
    $('hl-n').textContent = (hlState.elapsed / hlState.half).toFixed(2);
    $('hl-left').textContent = left + ' / ' + hlState.n0;
    $('hl-ideal').textContent = Math.round(Core.expectedRemaining(hlState.n0, hlState.elapsed, hlState.half));
    $('hl-rate').textContent = Core.activityRate(left, hlState.half).toFixed(1) + ' /s';
  }

  SimKit.loop(function (dt) {
    var dirty = false;
    for (var i = 0; i < hlState.flashes.length; i++) {
      if (hlState.flashes[i] > 0) {
        hlState.flashes[i] = Math.max(0, hlState.flashes[i] - dt);
        dirty = true;
      }
    }
    if (hlState.running) {
      hlState.accum += dt;
      while (hlState.accum >= hlState.dtStep && hlState.running) {
        hlState.accum -= hlState.dtStep;
        hlAdvance(hlState.dtStep, false);
        dirty = true;
      }
    }
    if (dirty) hlDraw();
  }, { el: SimKit.stage(cvA, cvG), maxDt: 0.05 });

  $('hl-run').addEventListener('click', function () {
    if (hlState.running) {
      hlState.running = false;
      this.textContent = '▶ Start';
      return;
    }
    var lastLeft = hlState.hist[hlState.hist.length - 1][1];
    if (lastLeft === 0 || hlState.elapsed >= hlState.half * 6) hlReset(true);
    hlState.running = true;
    this.textContent = '⏸ Pause';
  });

  $('hl-step-hl').addEventListener('click', function () {
    if (hlState.elapsed >= hlState.half * 6 || hlState.hist[hlState.hist.length - 1][1] === 0) return;
    hlAdvance(hlState.half, true);
    hlDraw();
  });

  $('hl-reset').addEventListener('click', function () { hlReset(true); });
  $('hl-clear-trails').addEventListener('click', function () {
    hlState.ghostTrials = [];
    hlDraw();
  });
  $('hl-t').addEventListener('input', function () {
    hlState.half = +this.value;
    $('hl-tv').textContent = hlState.half;
    hlReset(false);
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-hl-size]'), function (btn) {
    btn.addEventListener('click', function () {
      hlState.n0 = +btn.getAttribute('data-hl-size');
      hlState.ghostTrials = [];
      Array.prototype.forEach.call(document.querySelectorAll('[data-hl-size]'), function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      hlReset(false);
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-hl-scale]'), function (btn) {
    btn.addEventListener('click', function () {
      hlState.scaleMode = btn.getAttribute('data-hl-scale');
      Array.prototype.forEach.call(document.querySelectorAll('[data-hl-scale]'), function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      hlDraw();
    });
  });

  if ($('hl-audio')) {
    $('hl-audio').addEventListener('click', function () {
      hlState.audioOn = !hlState.audioOn;
      this.setAttribute('aria-pressed', String(hlState.audioOn));
      this.textContent = hlState.audioOn ? '🔊 Geiger click: ON' : '🔇 Geiger click: OFF';
    });
  }

  hlReset(false);

  /* ======================================================================
     Radiocarbon Dating Bench
     ====================================================================== */
  var c14Slider = $('c14-pct');
  var c14Svg = $('c14-svg');
  var c14PresetsWrap = $('c14-presets');

  if (c14PresetsWrap) {
    Core.C14_SPECIMENS.forEach(function (sp) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rd-seg-btn';
      btn.setAttribute('data-c14-preset', sp.id);
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = sp.label;
      btn.addEventListener('click', function () {
        c14Slider.value = String(sp.pct);
        renderC14(sp);
        Array.prototype.forEach.call(c14PresetsWrap.querySelectorAll('button'), function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
      });
      c14PresetsWrap.appendChild(btn);
    });
  }

  function renderC14(activeSpecimen) {
    var pct = +c14Slider.value;
    var res = Core.radiocarbonAge(pct);
    $('c14-pv').textContent = pct.toFixed(1).replace(/\.0$/, '');

    var fillC = $('c14-bar-c');
    var fillN = $('c14-bar-n');
    if (fillC && fillN) {
      fillC.style.width = pct + '%';
      fillN.style.width = (100 - pct) + '%';
      $('c14-lbl-c').textContent = '¹⁴C remaining: ' + pct.toFixed(1).replace(/\.0$/, '') + '%';
      $('c14-lbl-n').textContent = 'Decayed to ¹⁴N: ' + (100 - pct).toFixed(1).replace(/\.0$/, '') + '%';
    }

    var outEl = $('c14-out');
    var specNote = activeSpecimen ? '<b>Specimen:</b> ' + activeSpecimen.label + ' — ' + activeSpecimen.note + '<br>' : '';
    if (res.outOfRange) {
      outEl.innerHTML = specNote +
        '<div class="eq">¹⁴C ≈ 0% · Beyond radiocarbon range (&gt; ~57,000 years)</div>' +
        '<span class="rd-no">' + res.warning + '</span>';
    } else {
      outEl.innerHTML = specNote +
        '<div class="eq">t = 5,730 × log₂(100 / ' + pct.toFixed(1).replace(/\.0$/, '') + ') = ' + Math.round(res.ageYears).toLocaleString() + ' years</div>' +
        res.halfLives.toFixed(2) + ' half-lives have passed. ' +
        (res.warning ? '<span class="rd-warn">' + res.warning + '</span>' : 'Relative to the estimated starting C-14 ratio.');
    }

    if (c14Svg) {
      while (c14Svg.firstChild) c14Svg.removeChild(c14Svg.firstChild);
      var W = 320;
      var H = 165;
      var L = 36;
      var B = 24;
      var T = 12;
      var R = 12;
      var maxYr = 40000;
      c14Svg.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#08101b', rx: 6 }));
      function CX(yr) { return L + (W - L - R) * Math.min(1, yr / maxYr); }
      function CY(p) { return T + (H - T - B) * (1 - p / 100); }

      [0, 50, 100].forEach(function (pv) {
        c14Svg.appendChild(svgEl('line', { x1: L, y1: CY(pv), x2: W - R, y2: CY(pv), stroke: 'rgba(160,210,240,0.14)' }));
        c14Svg.appendChild(svgEl('text', { x: L - 5, y: CY(pv) + 3, 'text-anchor': 'end', 'font-size': 9.5, fill: '#9bb6d0' }, pv + '%'));
      });
      [0, 10000, 20000, 30000, 40000].forEach(function (yr) {
        c14Svg.appendChild(svgEl('line', { x1: CX(yr), y1: T, x2: CX(yr), y2: H - B, stroke: 'rgba(160,210,240,0.12)' }));
        c14Svg.appendChild(svgEl('text', { x: CX(yr), y: H - 7, 'text-anchor': 'middle', 'font-size': 9.5, fill: '#9bb6d0' }, (yr / 1000) + 'k yr'));
      });

      var pts = [];
      for (var yr = 0; yr <= maxYr; yr += 1000) {
        var pv2 = 100 * Math.pow(0.5, yr / Core.C14_HALF_LIFE);
        pts.push(CX(yr) + ',' + CY(pv2));
      }
      c14Svg.appendChild(svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: '#38bdf8', 'stroke-width': 2.2 }));

      if (!res.outOfRange) {
        var clampedYr = Math.min(maxYr, res.ageYears);
        var mx = CX(clampedYr);
        var my = CY(pct);
        c14Svg.appendChild(svgEl('circle', { cx: mx, cy: my, r: 5, fill: '#ff7a94', stroke: '#ffffff', 'stroke-width': 1.5 }));
      }
    }
  }

  c14Slider.addEventListener('input', function () {
    if (c14PresetsWrap) {
      Array.prototype.forEach.call(c14PresetsWrap.querySelectorAll('button'), function (b) {
        b.setAttribute('aria-pressed', 'false');
      });
    }
    renderC14(null);
  });
  renderC14(null);

  /* ======================================================================
     Simulation 3: Multi-Chain Decay Explorer
     ====================================================================== */
  var chainSelect = $('chain-select');
  var chainStrip = $('chain-strip');
  var chChart = $('chain-chart');
  var chainPlayBtn = $('chain-play');

  var chainState = {
    key: 'u238',
    index: 0,
    playing: false,
    accum: 0
  };

  Object.keys(Core.DECAY_CHAINS).forEach(function (k) {
    var ch = Core.DECAY_CHAINS[k];
    var opt = document.createElement('option');
    opt.value = k;
    opt.textContent = ch.title;
    chainSelect.appendChild(opt);
  });

  function renderChainStrip() {
    var chain = Core.DECAY_CHAINS[chainState.key];
    chainStrip.innerHTML = '';
    chain.steps.forEach(function (st, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rd-chain-pill';
      if (idx < chainState.index) btn.classList.add('is-visited');
      if (idx === chainState.index) btn.classList.add('is-active');
      if (st.gas) btn.classList.add('is-gas');
      if (st.stable) btn.classList.add('is-stable');
      btn.textContent = Core.formatLabel(st.z, st.a);
      if (st.gas) {
        var sm = document.createElement('small');
        sm.textContent = 'gas';
        btn.appendChild(sm);
      }
      btn.addEventListener('click', function () {
        chainState.playing = false;
        if (chainPlayBtn) chainPlayBtn.textContent = '▶ Auto-play';
        chainState.index = idx;
        renderChain();
      });
      chainStrip.appendChild(btn);
    });
  }

  function renderChain() {
    var sum = Core.summarizeChainProgress(chainState.key, chainState.index);
    var steps = sum.chain.steps;
    var trail = steps.slice(0, chainState.index + 1);

    if ($('chain-sub')) $('chain-sub').textContent = sum.chain.subtitle;
    drawChart(chChart, trail, {
      frame: [steps[0], steps[steps.length - 1]],
      fullChain: steps,
      margin: 4,
      onSelectIndex: function (idx) {
        chainState.playing = false;
        if (chainPlayBtn) chainPlayBtn.textContent = '▶ Auto-play';
        chainState.index = idx;
        renderChain();
      }
    });
    renderChainStrip();

    var c = sum.current;
    var outHtml = '';
    if (chainState.index === 0) {
      outHtml = '<div class="eq">' + Core.formatNuclide(c.z, c.a) + ' · ' + Core.formatFullName(c.z, c.a) + '</div>' +
        'Starting parent nuclide · Half-life: <b>' + c.hl + '</b>. Step forward to follow the chain down to stable lead.';
    } else {
      var p = sum.prev;
      outHtml = '<div class="eq">' + Core.formatEquation(p.z, p.a, c.mode) + '</div>' +
        Core.DECAY_MODES[c.mode].name + ' · Step ' + chainState.index + ' of ' + sum.totalSteps + '<br>' +
        'Now holding <b>' + Core.formatFullName(c.z, c.a) + ' (' + Core.formatLabel(c.z, c.a) + ')</b> · half-life <b>' + c.hl + '</b>' +
        (c.note ? '<br>' + c.note : '') +
        (sum.isStable ? '<br><span class="rd-ok">✓ Stable ' + Core.formatFullName(c.z, c.a) + '. The decay series ends here.</span>' : '');
    }
    $('chain-out').innerHTML = outHtml;
    $('chain-alphas').textContent = String(sum.alphaCount);
    $('chain-betas').textContent = String(sum.betaCount);
    $('chain-da').textContent = String(sum.deltaA);
    $('chain-dz').textContent = (sum.deltaZ >= 0 ? '+' : '') + sum.deltaZ;

    $('chain-prev').disabled = chainState.index <= 0;
    $('chain-next').disabled = sum.isStable;
  }

  SimKit.loop(function (dt) {
    if (!chainState.playing) return;
    chainState.accum += dt;
    if (chainState.accum >= 0.9) {
      chainState.accum = 0;
      var len = Core.DECAY_CHAINS[chainState.key].steps.length;
      if (chainState.index < len - 1) {
        chainState.index++;
        renderChain();
      } else {
        chainState.playing = false;
        chainPlayBtn.textContent = '▶ Auto-play';
      }
    }
  }, { el: SimKit.stage(chChart), maxDt: 0.1 });

  chainSelect.addEventListener('change', function () {
    chainState.key = chainSelect.value;
    chainState.index = 0;
    chainState.playing = false;
    chainPlayBtn.textContent = '▶ Auto-play';
    renderChain();
  });
  $('chain-prev').addEventListener('click', function () {
    if (chainState.index > 0) {
      chainState.playing = false;
      chainPlayBtn.textContent = '▶ Auto-play';
      chainState.index--;
      renderChain();
    }
  });
  $('chain-next').addEventListener('click', function () {
    var len = Core.DECAY_CHAINS[chainState.key].steps.length;
    if (chainState.index < len - 1) {
      chainState.index++;
      renderChain();
    }
  });
  $('chain-end').addEventListener('click', function () {
    chainState.playing = false;
    chainPlayBtn.textContent = '▶ Auto-play';
    chainState.index = Core.DECAY_CHAINS[chainState.key].steps.length - 1;
    renderChain();
  });
  $('chain-reset').addEventListener('click', function () {
    chainState.playing = false;
    chainPlayBtn.textContent = '▶ Auto-play';
    chainState.index = 0;
    renderChain();
  });
  chainPlayBtn.addEventListener('click', function () {
    var len = Core.DECAY_CHAINS[chainState.key].steps.length;
    if (chainState.index >= len - 1) chainState.index = 0;
    chainState.playing = !chainState.playing;
    chainState.accum = 0;
    this.textContent = chainState.playing ? '⏸ Pause' : '▶ Auto-play';
    renderChain();
  });
  renderChain();

  /* ======================================================================
     Simulation 4: Radiation Shielding & Inverse-Square Lab
     ====================================================================== */
  var shCanvas = $('shield-canvas');
  if (shCanvas) {
    var shSurf = SimKit.canvas2d(shCanvas, { height: 230 });
    var shRad = $('shield-rad');
    var shMat = $('shield-mat');
    var shThick = $('shield-thick');
    var shDist = $('shield-dist');

    Object.keys(Core.SHIELD_MATERIALS).forEach(function (k) {
      var m = Core.SHIELD_MATERIALS[k];
      var o = document.createElement('option');
      o.value = k;
      o.textContent = m.name + ' (' + m.density + ')';
      shMat.appendChild(o);
    });
    shMat.value = 'aluminum';

    var beamParticles = [];
    for (var bp = 0; bp < 42; bp++) {
      beamParticles.push({
        phase: (bp / 42),
        lane: ((bp * 7) % 11) / 10 - 0.5,
        kind: bp % 3 === 0 ? 'alpha' : (bp % 3 === 1 ? 'beta' : 'gamma')
      });
    }

    function readShield() {
      return Core.computeTransmission({
        radiation: shRad.value,
        material: shMat.value,
        thicknessMm: +shThick.value,
        distanceM: +shDist.value
      });
    }

    function updateShieldUI() {
      var res = readShield();
      $('shield-thick-v').textContent = res.thicknessMm.toFixed(1) + ' mm';
      $('shield-dist-v').textContent = res.distanceM.toFixed(1) + ' m';
      $('shield-through').textContent = (res.shieldFraction * 100).toFixed(1) + '%';
      $('shield-dist-f').textContent = (res.distanceFactor * 100).toFixed(1) + '%';
      $('shield-total').textContent = (res.combinedFraction * 100).toFixed(1) + '%';
      if ($('shield-meter')) $('shield-meter').style.width = Math.min(100, res.combinedFraction * 100) + '%';
      $('shield-out').innerHTML = '<div class="eq">Detector intensity: ' + (res.combinedFraction * 100).toFixed(1) + '% of 1.0 m unshielded beam</div>' + res.explanation;
    }

    SimKit.loop(function (dt, ts) {
      var ctx = shSurf.ctx;
      var W = shSurf.width;
      var H = shSurf.height;
      var res = readShield();
      var t = prefersReducedMotion ? 0.35 : ts / 1000;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#08101b';
      ctx.fillRect(0, 0, W, H);

      var srcX = 34;
      var cy = H * 0.52;
      var barrierX = W * 0.35;
      var barrierW = res.material.key === 'air' ? 4 : Math.max(8, Math.min(54, 6 + res.thicknessMm * 0.48));
      var detX = W * (0.48 + (res.distanceM - 1) / 4 * 0.42);

      // Distance scale bar
      ctx.strokeStyle = 'rgba(160, 210, 240, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(srcX, H - 24);
      ctx.lineTo(detX, H - 24);
      ctx.stroke();
      ctx.fillStyle = '#9bb6d0';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('d = ' + res.distanceM.toFixed(1) + ' m', (srcX + detX) / 2 - 26, H - 8);

      // Source canister
      ctx.fillStyle = '#25354d';
      ctx.strokeStyle = '#9bb6d0';
      ctx.lineWidth = 1.5;
      ctx.fillRect(srcX - 20, cy - 28, 28, 56);
      ctx.strokeRect(srcX - 20, cy - 28, 28, 56);
      ctx.fillStyle = '#eef6ff';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillText('Source', srcX - 24, cy - 36);

      // Barrier
      if (res.material.key !== 'air') {
        ctx.fillStyle = res.material.color;
        ctx.fillRect(barrierX, 34, barrierW, H - 72);
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.strokeRect(barrierX, 34, barrierW, H - 72);
      } else {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(160,210,240,0.35)';
        ctx.strokeRect(barrierX, 34, 16, H - 72);
        ctx.setLineDash([]);
      }
      ctx.fillStyle = '#c4d8ec';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillText(res.material.name, barrierX - 6, 24);

      // Detector probe
      ctx.fillStyle = '#14263c';
      ctx.strokeStyle = res.combinedFraction > 0.05 ? '#f6c35b' : '#4fdc9a';
      ctx.lineWidth = 2;
      ctx.fillRect(detX, cy - 36, 20, 72);
      ctx.strokeRect(detX, cy - 36, 20, 72);
      ctx.fillStyle = '#eef6ff';
      ctx.fillText('Detector', detX - 10, cy - 44);

      // Animated particles
      var spreadMax = 18 + (res.distanceM - 1) * 14;
      for (var i = 0; i < beamParticles.length; i++) {
        var bp = beamParticles[i];
        var mode = res.radiation === 'mixed' ? bp.kind : res.radiation;
        var passFrac = res.radiation === 'mixed'
          ? (mode === 'alpha' ? res.components.alphaShield : mode === 'beta' ? res.components.betaShield : res.components.gammaShield)
          : res.shieldFraction;
        var passes = ((i * 37) % 100) / 100 < passFrac;

        var u = (bp.phase + t * (mode === 'gamma' ? 0.65 : mode === 'beta' ? 0.5 : 0.34)) % 1;
        var maxTravel = passes ? detX : (barrierX + Math.min(barrierW - 2, 4 + ((i * 13) % 10)));
        var px = srcX + 10 + u * (maxTravel - (srcX + 10));
        var spread = ((px - srcX) / Math.max(1, detX - srcX)) * spreadMax;
        var py = cy + bp.lane * spread * 2;
        if (mode === 'gamma') py += Math.sin(px * 0.12 - t * 9) * 4;

        var col = mode === 'alpha' ? '#ff7a94' : (mode === 'beta' ? '#38bdf8' : '#f6c35b');
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px, py, mode === 'alpha' ? 4.2 : (mode === 'beta' ? 2.8 : 2.3), 0, Math.PI * 2);
        ctx.fill();
      }
    }, { el: SimKit.stage(shCanvas), maxDt: 0.05 });

    [shRad, shMat, shThick, shDist].forEach(function (ctrl) {
      ctrl.addEventListener('input', updateShieldUI);
      ctrl.addEventListener('change', updateShieldUI);
    });
    updateShieldUI();
  }

  /* ======================================================================
     Section 7: Interactive Equation Drill & Conceptual Checks
     ====================================================================== */
  var drillIdx = 0;
  var drillAttempted = 0;
  var drillCorrect = 0;
  var selectedDrillMode = null;

  var drillQ = $('drill-q');
  var drillInputs = $('drill-inputs');
  var drillModeBtns = $('drill-mode-btns');
  var drillA = $('drill-a');
  var drillZ = $('drill-z');
  var drillPreview = $('drill-preview');
  var drillFb = $('drill-fb');
  var drillHint = $('drill-hint');
  var drillScore = $('drill-score');

  function updateDrillPreview() {
    if (!drillPreview) return;
    var p = Core.PRACTICE_PROBLEMS[drillIdx];
    if (p.kind === 'mode') {
      drillPreview.textContent = selectedDrillMode
        ? 'Selected mode: ' + Core.DECAY_MODES[selectedDrillMode].name
        : 'Pick one of the four decay modes above.';
      return;
    }
    var zv = parseInt(drillZ.value, 10);
    var av = parseInt(drillA.value, 10);
    if (Number.isFinite(zv) && zv >= 1 && zv < Core.SYMBOLS.length && Number.isFinite(av)) {
      drillPreview.textContent = 'Preview: ' + Core.formatNuclide(zv, av) + ' (' + Core.formatFullName(zv, av) + ')';
    } else if (Number.isFinite(zv) && zv >= 1 && zv < Core.SYMBOLS.length) {
      drillPreview.textContent = 'Element Z = ' + zv + ' → ' + Core.nameFor(zv) + ' (' + Core.symbolFor(zv) + ')';
    } else {
      drillPreview.textContent = 'Enter mass number A and atomic number Z.';
    }
  }

  function loadDrillProblem() {
    var p = Core.PRACTICE_PROBLEMS[drillIdx];
    drillQ.textContent = 'Problem ' + (drillIdx + 1) + ' of ' + Core.PRACTICE_PROBLEMS.length + ': ' + p.prompt;
    drillFb.textContent = '';
    drillFb.className = 'rd-drill-fb';
    drillHint.hidden = true;
    drillHint.textContent = p.hint;
    selectedDrillMode = null;

    if (p.kind === 'daughter') {
      drillInputs.hidden = false;
      drillModeBtns.hidden = true;
      drillA.value = '';
      drillZ.value = '';
    } else {
      drillInputs.hidden = true;
      drillModeBtns.hidden = false;
      Array.prototype.forEach.call(drillModeBtns.querySelectorAll('button'), function (b) {
        b.classList.remove('is-active');
      });
    }
    updateDrillPreview();
  }

  if (drillQ) {
    Array.prototype.forEach.call(drillModeBtns.querySelectorAll('[data-drill-mode]'), function (btn) {
      btn.addEventListener('click', function () {
        selectedDrillMode = btn.getAttribute('data-drill-mode');
        Array.prototype.forEach.call(drillModeBtns.querySelectorAll('[data-drill-mode]'), function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        updateDrillPreview();
      });
    });

    [drillA, drillZ].forEach(function (inp) {
      inp.addEventListener('input', updateDrillPreview);
    });

    $('drill-check').addEventListener('click', function () {
      var p = Core.PRACTICE_PROBLEMS[drillIdx];
      var res = Core.checkPracticeAnswer(p, {
        a: drillA.value,
        z: drillZ.value,
        mode: selectedDrillMode
      });
      drillAttempted++;
      if (res.correct) drillCorrect++;
      drillFb.textContent = (res.correct ? '✓ ' : '✗ ') + res.message;
      drillFb.className = 'rd-drill-fb ' + (res.correct ? 'rd-ok' : 'rd-no');
      drillScore.textContent = 'Score: ' + drillCorrect + ' / ' + drillAttempted;
    });

    $('drill-hint-btn').addEventListener('click', function () {
      drillHint.hidden = !drillHint.hidden;
    });

    $('drill-next').addEventListener('click', function () {
      drillIdx = (drillIdx + 1) % Core.PRACTICE_PROBLEMS.length;
      loadDrillProblem();
    });

    loadDrillProblem();
  }

  // Interactive Conceptual Check cards
  Array.prototype.forEach.call(document.querySelectorAll('[data-qcheck]'), function (card) {
    var correct = card.getAttribute('data-qcheck');
    var explain = card.getAttribute('data-qexplain') || '';
    var fb = card.querySelector('.rd-q-fb');
    var btns = card.querySelectorAll('[data-qans]');
    Array.prototype.forEach.call(btns, function (btn) {
      btn.addEventListener('click', function () {
        var chosen = btn.getAttribute('data-qans');
        var ok = chosen === correct;
        Array.prototype.forEach.call(btns, function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        fb.innerHTML = (ok ? '<span class="rd-ok">✓ Correct.</span> ' : '<span class="rd-no">✗ Try again.</span> ') + explain;
      });
    });
  });
})();
