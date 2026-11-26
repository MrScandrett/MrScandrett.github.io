(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function snapHalf(v) { return Math.round(v * 2) / 2; }
  function fmt1(v) { return Number(v).toFixed(1); }
  function fmt2(v) { return Number(v).toFixed(2); }
  function fmtClean(v) { return Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : fmt2(v); }
  function approxInt(v) { return Math.abs(v - Math.round(v)) < 0.005; }
  function pts(arr) { return arr.map(function (p) { return p.x.toFixed(2) + ',' + p.y.toFixed(2); }).join(' '); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpPt(p1, p2, t) { return { x: lerp(p1.x, p2.x, t), y: lerp(p1.y, p2.y, t) }; }
  function easeInOut(t) { return t * t * (3 - 2 * t); }

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, attrs[k]);
      }
    }
    return el;
  }

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }

  function classifyTriple(a, b, c) {
    if (!approxInt(a) || !approxInt(b) || !approxInt(c)) return 'Not a whole triple';
    var ia = Math.round(a), ib = Math.round(b), ic = Math.round(c);
    var g = gcd(ia, gcd(ib, ic));
    var lo = Math.min(ia, ib), hi = Math.max(ia, ib);
    if (g === 1) return lo + '-' + hi + '-' + ic + ' (Primitive)';
    return lo + '-' + hi + '-' + ic + ' (' + g + '× scaled)';
  }

  function formatRadical(a, b, c) {
    var sumSq = a * a + b * b;
    if (approxInt(sumSq)) {
      var n = Math.round(sumSq);
      if (approxInt(c)) return 'Exact: √' + n + ' = ' + Math.round(c);
      return 'Exact: √' + n + ' ≈ ' + fmt2(c);
    }
    return 'Exact: √' + fmt2(sumSq) + ' ≈ ' + fmt2(c);
  }

  /* ── Shared lesson state ────────────────────────────────────────── */
  var state = {
    a: 3,
    b: 4,
    pour: 1,
    pourPlaying: false,
    is3d: false,
    showAltitude: false,
    showTiles: false,
    proofT: 0,
    proofPlaying: false,
    hingeDeg: 90,
    rampRise: 2,
    rampRun: 24,
    ptA: { x: -3, y: -2 },
    ptB: { x: 3, y: 2 },
    boxW: 8,
    boxD: 6,
    boxH: 4
  };

  /* ── DOM references ─────────────────────────────────────────────── */
  var sliderA = document.getElementById('slider-a');
  var sliderB = document.getElementById('slider-b');
  var panelSliderA = document.getElementById('py-panel-slider-a');
  var panelSliderB = document.getElementById('py-panel-slider-b');
  var geoSvg = document.getElementById('geoCanvas');
  var draftingBoard = document.getElementById('drafting-board');
  var viewToggle = document.getElementById('view-toggle');
  var altToggle = document.getElementById('altitude-toggle');
  var tilesToggle = document.getElementById('tiles-toggle');
  var pourPlayBtn = document.getElementById('pour-play');
  var pourResetBtn = document.getElementById('pour-reset');
  var pourSlider = document.getElementById('pour-slider');

  var geo = {
    sqA: document.getElementById('squareA'),
    sqB: document.getElementById('squareB'),
    sqC: document.getElementById('squareC'),
    fillA: document.getElementById('fillA'),
    fillB: document.getElementById('fillB'),
    fillCA: document.getElementById('fillCA'),
    fillCB: document.getElementById('fillCB'),
    tilesGroup: document.getElementById('unitGridGroup'),
    altitudeLine: document.getElementById('altitudeLine'),
    tri: document.getElementById('trianglePath'),
    rightAngle: document.getElementById('rightAngle'),
    arcAlpha: document.getElementById('arcAlpha'),
    arcBeta: document.getElementById('arcBeta'),
    labelA: document.getElementById('labelA'),
    labelB: document.getElementById('labelB'),
    labelC: document.getElementById('labelC'),
    labelA2: document.getElementById('labelA2'),
    labelB2: document.getElementById('labelB2'),
    labelC2: document.getElementById('labelC2'),
    labelAlpha: document.getElementById('labelAlpha'),
    labelBeta: document.getElementById('labelBeta'),
    handleA: document.getElementById('handleA'),
    handleARing: document.getElementById('handleARing'),
    handleB: document.getElementById('handleB'),
    handleBRing: document.getElementById('handleBRing')
  };

  /* ══════════════════════════════════════════════════════════════════
     1. BLUEPRINT LAB (OUTWARD SQUARES + EUCLID SPLIT + WATER POUR)
     ══════════════════════════════════════════════════════════════════ */
  var currentTransform = null;

  function renderBlueprint() {
    var a = state.a;
    var b = state.b;
    var c = Math.sqrt(a * a + b * b);
    var areaA = a * a;
    var areaB = b * b;
    var areaC = c * c;
    var alpha = Math.atan2(a, b) * (180 / Math.PI);
    var beta = 90 - alpha;

    // Model coordinates: V1 = (0,0) right angle, V2 = (0,-a) top, V3 = (-b,0) left
    var mV1 = { x: 0, y: 0 };
    var mV2 = { x: 0, y: -a };
    var mV3 = { x: -b, y: 0 };

    // Outward squares
    var mSqA = [mV1, { x: a, y: 0 }, { x: a, y: -a }, mV2];
    var mSqB = [mV3, mV1, { x: 0, y: b }, { x: -b, y: b }];
    var mC2 = { x: -a, y: -a - b };
    var mC3 = { x: -a - b, y: -b };
    var mSqC = [mV3, mV2, mC2, mC3];

    // Euclid's altitude from V1 perpendicular to hypotenuse V3->V2
    var tHyp = (b * b) / areaC;
    var mH = { x: -b + tHyp * b, y: -tHyp * a };
    var mHp = { x: mH.x - a, y: mH.y - b };

    // Auto-fit into 700 x 620 SVG viewBox
    var minX = -a - b;
    var maxX = a;
    var minY = -a - b;
    var maxY = b;
    var spanX = maxX - minX;
    var spanY = maxY - minY;
    var pad = 48;
    var scale = Math.min((700 - pad * 2) / spanX, (620 - pad * 2) / spanY);
    var cx = 350;
    var cy = 310;
    var midX = (minX + maxX) / 2;
    var midY = (minY + maxY) / 2;

    function map(p) {
      return { x: cx + (p.x - midX) * scale, y: cy + (p.y - midY) * scale };
    }
    currentTransform = { cx: cx, cy: cy, midX: midX, midY: midY, scale: scale };

    var V1 = map(mV1), V2 = map(mV2), V3 = map(mV3);
    var sqA = mSqA.map(map);
    var sqB = mSqB.map(map);
    var sqC = mSqC.map(map);
    var C2 = map(mC2), C3 = map(mC3);
    var H = map(mH), Hp = map(mHp);

    geo.sqA.setAttribute('points', pts(sqA));
    geo.sqB.setAttribute('points', pts(sqB));
    geo.sqC.setAttribute('points', pts(sqC));
    geo.tri.setAttribute('d', 'M ' + V1.x.toFixed(2) + ' ' + V1.y.toFixed(2) +
      ' L ' + V2.x.toFixed(2) + ' ' + V2.y.toFixed(2) +
      ' L ' + V3.x.toFixed(2) + ' ' + V3.y.toFixed(2) + ' Z');

    // Liquid pour polygons (remaining water in A & B, poured water in C)
    var p = state.pour;
    var rem = 1 - p;
    if (rem > 0.005) {
      var aTopL = lerpPt(V1, V2, rem);
      var aTopR = lerpPt(sqA[1], sqA[2], rem);
      geo.fillA.setAttribute('points', pts([V1, sqA[1], aTopR, aTopL]));
      var bTopL = lerpPt(sqB[3], V3, rem);
      var bTopR = lerpPt(sqB[2], V1, rem);
      geo.fillB.setAttribute('points', pts([sqB[3], sqB[2], bTopR, bTopL]));
    } else {
      geo.fillA.setAttribute('points', '');
      geo.fillB.setAttribute('points', '');
    }

    if (p > 0.005) {
      // Blue chamber (a^2) fills from base H-V2 outward toward Hp-C2
      var fCA1 = lerpPt(H, Hp, p);
      var fCA2 = lerpPt(V2, C2, p);
      geo.fillCA.setAttribute('points', pts([H, V2, fCA2, fCA1]));
      // Green chamber (b^2) fills from base V3-H outward toward C3-Hp
      var fCB1 = lerpPt(V3, C3, p);
      var fCB2 = lerpPt(H, Hp, p);
      geo.fillCB.setAttribute('points', pts([V3, H, fCB2, fCB1]));
    } else {
      geo.fillCA.setAttribute('points', '');
      geo.fillCB.setAttribute('points', '');
    }

    // Euclid altitude split line
    if (state.showAltitude) {
      geo.altitudeLine.removeAttribute('hidden');
      geo.altitudeLine.setAttribute('x1', V1.x.toFixed(2));
      geo.altitudeLine.setAttribute('y1', V1.y.toFixed(2));
      geo.altitudeLine.setAttribute('x2', Hp.x.toFixed(2));
      geo.altitudeLine.setAttribute('y2', Hp.y.toFixed(2));
    } else {
      geo.altitudeLine.setAttribute('hidden', '');
    }

    // Unit square grid tiles
    geo.tilesGroup.innerHTML = '';
    if (state.showTiles) {
      var addGrid = function (origin, uVec, vVec, cols, rows) {
        for (var i = 1; i < cols; i++) {
          var t = i / cols;
          var pStart = { x: origin.x + uVec.x * t, y: origin.y + uVec.y * t };
          var pEnd = { x: pStart.x + vVec.x, y: pStart.y + vVec.y };
          geo.tilesGroup.appendChild(svgEl('line', {
            x1: pStart.x.toFixed(1), y1: pStart.y.toFixed(1),
            x2: pEnd.x.toFixed(1), y2: pEnd.y.toFixed(1)
          }));
        }
        for (var j = 1; j < rows; j++) {
          var s = j / rows;
          var qStart = { x: origin.x + vVec.x * s, y: origin.y + vVec.y * s };
          var qEnd = { x: qStart.x + uVec.x, y: qStart.y + uVec.y };
          geo.tilesGroup.appendChild(svgEl('line', {
            x1: qStart.x.toFixed(1), y1: qStart.y.toFixed(1),
            x2: qEnd.x.toFixed(1), y2: qEnd.y.toFixed(1)
          }));
        }
      };
      if (approxInt(a) && a <= 15) {
        var na = Math.round(a);
        addGrid(V2, { x: sqA[2].x - V2.x, y: sqA[2].y - V2.y }, { x: V1.x - V2.x, y: V1.y - V2.y }, na, na);
      }
      if (approxInt(b) && b <= 15) {
        var nb = Math.round(b);
        addGrid(V3, { x: V1.x - V3.x, y: V1.y - V3.y }, { x: sqB[3].x - V3.x, y: sqB[3].y - V3.y }, nb, nb);
      }
      if (approxInt(c) && c <= 22) {
        var nc = Math.round(c);
        addGrid(V3, { x: V2.x - V3.x, y: V2.y - V3.y }, { x: C3.x - V3.x, y: C3.y - V3.y }, nc, nc);
      }
    }

    // Right angle marker inside triangle at V1
    var ms = clamp(Math.min(a, b) * scale * 0.22, 10, 18);
    geo.rightAngle.setAttribute('d', 'M ' + (V1.x - ms).toFixed(1) + ' ' + V1.y.toFixed(1) +
      ' L ' + (V1.x - ms).toFixed(1) + ' ' + (V1.y - ms).toFixed(1) +
      ' L ' + V1.x.toFixed(1) + ' ' + (V1.y - ms).toFixed(1));

    // Acute angle arcs
    var arcR = clamp(Math.min(a, b) * scale * 0.3, 14, 28);
    var radAlpha = Math.atan2(a, b);
    geo.arcAlpha.setAttribute('d',
      'M ' + (V3.x + arcR).toFixed(1) + ' ' + V3.y.toFixed(1) +
      ' A ' + arcR + ' ' + arcR + ' 0 0 0 ' +
      (V3.x + arcR * Math.cos(radAlpha)).toFixed(1) + ' ' + (V3.y - arcR * Math.sin(radAlpha)).toFixed(1));
    geo.arcBeta.setAttribute('d',
      'M ' + V2.x.toFixed(1) + ' ' + (V2.y + arcR).toFixed(1) +
      ' A ' + arcR + ' ' + arcR + ' 0 0 1 ' +
      (V2.x - arcR * Math.cos(radAlpha)).toFixed(1) + ' ' + (V2.y + arcR * Math.sin(radAlpha)).toFixed(1));

    // Side labels positioned cleanly inside the triangle edges
    var place = function (el, x, y, txt) {
      el.setAttribute('x', x.toFixed(1));
      el.setAttribute('y', y.toFixed(1));
      el.textContent = txt;
    };
    place(geo.labelA, V1.x - 16, (V1.y + V2.y) / 2 + 5, 'a=' + fmtClean(a));
    place(geo.labelB, (V1.x + V3.x) / 2, V1.y - 10, 'b=' + fmtClean(b));
    var hypMid = lerpPt(V3, V2, 0.5);
    var nx = a / c, ny = b / c;
    place(geo.labelC, hypMid.x + nx * 16, hypMid.y + ny * 16, 'c=' + fmtClean(c));

    // Area labels centered in each square
    var sqACenter = map({ x: a / 2, y: -a / 2 });
    var sqBCenter = map({ x: -b / 2, y: b / 2 });
    var sqCCenter = map({ x: (mV3.x + mC2.x) / 2, y: (mV3.y + mC2.y) / 2 });
    place(geo.labelA2, sqACenter.x, sqACenter.y + 6, 'a² = ' + fmtClean(areaA));
    place(geo.labelB2, sqBCenter.x, sqBCenter.y + 6, 'b² = ' + fmtClean(areaB));
    place(geo.labelC2, sqCCenter.x, sqCCenter.y + 6, 'c² = ' + fmtClean(areaC));

    place(geo.labelAlpha, V3.x + arcR + 18, V3.y - 6, 'α ' + fmt1(alpha) + '°');
    place(geo.labelBeta, V2.x - 22, V2.y + arcR + 16, 'β ' + fmt1(beta) + '°');

    // Drag handles on V2 (a) and V3 (b)
    geo.handleA.setAttribute('cx', V2.x.toFixed(1));
    geo.handleA.setAttribute('cy', V2.y.toFixed(1));
    geo.handleARing.setAttribute('cx', V2.x.toFixed(1));
    geo.handleARing.setAttribute('cy', V2.y.toFixed(1));
    geo.handleB.setAttribute('cx', V3.x.toFixed(1));
    geo.handleB.setAttribute('cy', V3.y.toFixed(1));
    geo.handleBRing.setAttribute('cx', V3.x.toFixed(1));
    geo.handleBRing.setAttribute('cy', V3.y.toFixed(1));

    // Readouts (in-page + sidebar)
    document.getElementById('val-a').textContent = fmt1(a);
    document.getElementById('val-b').textContent = fmt1(b);
    document.getElementById('res-c').textContent = fmt2(c);
    document.getElementById('formula-text').textContent = fmtClean(a) + '² + ' + fmtClean(b) + '² = ' + fmtClean(c) + '²';
    document.getElementById('radical-text').textContent = formatRadical(a, b, c);
    document.getElementById('angle-alpha').textContent = fmt1(alpha) + '°';
    document.getElementById('angle-beta').textContent = fmt1(beta) + '°';
    document.getElementById('area-a').textContent = fmt2(areaA);
    document.getElementById('area-b').textContent = fmt2(areaB);
    document.getElementById('area-c').textContent = fmt2(areaC);
    document.getElementById('triple-check').textContent = classifyTriple(a, b, c);

    // Liquid pour readouts
    var pctA = (areaA / areaC) * 100 * p;
    var pctB = (areaB / areaC) * 100 * p;
    var pctTot = p * 100;
    document.getElementById('pour-a-text').textContent = Math.round(pctA) + '%';
    document.getElementById('pour-b-text').textContent = Math.round(pctB) + '%';
    document.getElementById('pour-total-text').textContent = Math.round(pctTot) + '%';
    document.getElementById('pour-a-fill').style.width = pctA.toFixed(1) + '%';
    document.getElementById('pour-b-fill').style.width = pctB.toFixed(1) + '%';
    document.getElementById('pour-total-fill').style.width = pctTot.toFixed(1) + '%';

    // Sync sliders & preset chips
    sliderA.value = a;
    sliderB.value = b;
    if (panelSliderA) panelSliderA.value = a;
    if (panelSliderB) panelSliderB.value = b;
    if (pourSlider) pourSlider.value = Math.round(p * 100);

    document.getElementById('py-panel-a').textContent = fmt1(a);
    document.getElementById('py-panel-b').textContent = fmt1(b);
    document.getElementById('py-panel-a2').textContent = fmt2(areaA);
    document.getElementById('py-panel-b2').textContent = fmt2(areaB);
    document.getElementById('py-panel-c2').textContent = fmt2(areaC);
    document.getElementById('py-panel-c').textContent = fmt2(c);
    document.getElementById('py-panel-alpha').textContent = fmt1(alpha) + '°';
    document.getElementById('py-panel-beta').textContent = fmt1(beta) + '°';
    document.getElementById('py-panel-tri-area').textContent = fmt2(0.5 * a * b);
    document.getElementById('py-panel-perim').textContent = fmt2(a + b + c);

    document.querySelectorAll('[data-triple]').forEach(function (btn) {
      var parts = btn.getAttribute('data-triple').split(',');
      var match = Math.abs(parseFloat(parts[0]) - a) < 0.01 && Math.abs(parseFloat(parts[1]) - b) < 0.01;
      btn.setAttribute('aria-pressed', match ? 'true' : 'false');
    });

    renderProof();
  }

  function setSides(newA, newB) {
    state.a = clamp(snapHalf(newA), 1, 15);
    state.b = clamp(snapHalf(newB), 1, 15);
    renderBlueprint();
  }

  sliderA.addEventListener('input', function () { setSides(parseFloat(sliderA.value), state.b); });
  sliderB.addEventListener('input', function () { setSides(state.a, parseFloat(sliderB.value)); });
  if (panelSliderA) panelSliderA.addEventListener('input', function () { setSides(parseFloat(panelSliderA.value), state.b); });
  if (panelSliderB) panelSliderB.addEventListener('input', function () { setSides(state.a, parseFloat(panelSliderB.value)); });

  document.querySelectorAll('[data-triple]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var parts = btn.getAttribute('data-triple').split(',');
      setSides(parseFloat(parts[0]), parseFloat(parts[1]));
    });
  });

  document.querySelectorAll('[data-load-triple]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var parts = btn.getAttribute('data-load-triple').split(',');
      setSides(parseFloat(parts[0]), parseFloat(parts[1]));
      var lab = document.getElementById('blueprint-lab');
      if (lab && lab.scrollIntoView) lab.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'start' });
    });
  });

  function bindToggle(btn, indId, key, afterFn) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      state[key] = !state[key];
      btn.setAttribute('aria-pressed', String(state[key]));
      var ind = document.getElementById(indId);
      if (ind) ind.classList.toggle('on', state[key]);
      if (afterFn) afterFn(state[key]);
    });
  }

  bindToggle(viewToggle, 'view-indicator', 'is3d', function (on) {
    draftingBoard.classList.toggle('is-3d', on);
  });
  bindToggle(altToggle, 'altitude-indicator', 'showAltitude', function () { renderBlueprint(); });
  bindToggle(tilesToggle, 'tiles-indicator', 'showTiles', function () { renderBlueprint(); });

  // Pointer drag handles on V2 (side a) & V3 (side b)
  function enableHandleDrag(handleEl, axis) {
    if (!handleEl || !geoSvg) return;
    var active = false;
    handleEl.addEventListener('pointerdown', function (e) {
      active = true;
      handleEl.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handleEl.addEventListener('pointermove', function (e) {
      if (!active || !currentTransform) return;
      var rect = geoSvg.getBoundingClientRect();
      var svgX = ((e.clientX - rect.left) / rect.width) * 700;
      var svgY = ((e.clientY - rect.top) / rect.height) * 620;
      var mx = (svgX - currentTransform.cx) / currentTransform.scale + currentTransform.midX;
      var my = (svgY - currentTransform.cy) / currentTransform.scale + currentTransform.midY;
      if (axis === 'a') setSides(-my, state.b);
      else setSides(state.a, -mx);
    });
    function stop() { active = false; }
    handleEl.addEventListener('pointerup', stop);
    handleEl.addEventListener('pointercancel', stop);
  }
  enableHandleDrag(geo.handleA, 'a');
  enableHandleDrag(geo.handleB, 'b');

  // Pour animation using SimKit.raf when available
  var pourRaf = window.SimKit && window.SimKit.raf ? window.SimKit.raf(geoSvg) : null;
  var pourLastTs = null;
  function tickPour(ts) {
    if (!state.pourPlaying) return;
    if (pourLastTs === null) pourLastTs = ts;
    var dt = Math.min(0.05, (ts - pourLastTs) / 1000);
    pourLastTs = ts;
    state.pour = Math.min(1, state.pour + dt * 0.55);
    renderBlueprint();
    if (state.pour >= 1) {
      state.pourPlaying = false;
      pourPlayBtn.textContent = 'Pour a² + b² → c²';
      return;
    }
    if (pourRaf) pourRaf(tickPour);
    else requestAnimationFrame(tickPour);
  }

  if (pourPlayBtn) {
    pourPlayBtn.addEventListener('click', function () {
      if (REDUCED_MOTION) {
        state.pour = state.pour >= 1 ? 0 : 1;
        renderBlueprint();
        return;
      }
      if (state.pour >= 1) state.pour = 0;
      state.pourPlaying = !state.pourPlaying;
      pourPlayBtn.textContent = state.pourPlaying ? 'Pause Pour' : 'Pour a² + b² → c²';
      pourLastTs = null;
      if (state.pourPlaying) {
        if (pourRaf) pourRaf(tickPour);
        else requestAnimationFrame(tickPour);
      }
    });
  }
  if (pourResetBtn) {
    pourResetBtn.addEventListener('click', function () {
      state.pourPlaying = false;
      state.pour = 0;
      pourPlayBtn.textContent = 'Pour a² + b² → c²';
      renderBlueprint();
    });
  }
  if (pourSlider) {
    pourSlider.addEventListener('input', function () {
      state.pourPlaying = false;
      pourPlayBtn.textContent = 'Pour a² + b² → c²';
      state.pour = parseFloat(pourSlider.value) / 100;
      renderBlueprint();
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     2. INTERACTIVE VISUAL PROOFS (REARRANGEMENT + ALGEBRAIC)
     ══════════════════════════════════════════════════════════════════ */
  var proofCanvas = document.getElementById('proofCanvas');
  var proofSlider = document.getElementById('proof-slider');
  var proofPlayBtn = document.getElementById('proof-play');
  var proofResetBtn = document.getElementById('proof-reset');
  var proofShowAB = document.getElementById('proof-show-ab');
  var proofShowC = document.getElementById('proof-show-c');

  function renderProof() {
    if (!proofCanvas) return;
    var a = state.a;
    var b = state.b;
    var c = Math.sqrt(a * a + b * b);
    var L = 340;
    var ox = 60;
    var oy = 60;
    var sa = (a / (a + b)) * L;
    var sb = (b / (a + b)) * L;
    var t = easeInOut(state.proofT);

    // Pure-translation 4-triangle rearrangement inside [0,L] x [0,L]
    // Start (t=0): a^2 at top-right [sb, L] x [0, sa], b^2 at bottom-left [0, sb] x [sa, L]
    // End   (t=1): central tilted square c^2 with vertices (sb,0), (L,sb), (sa,L), (0,sa)
    var triStart = [
      [{ x: 0, y: 0 }, { x: sb, y: 0 }, { x: 0, y: sa }],
      [{ x: sb, y: sa }, { x: 0, y: sa }, { x: sb, y: 0 }],
      [{ x: sb, y: L }, { x: L, y: L }, { x: sb, y: sa }],
      [{ x: L, y: sa }, { x: sb, y: sa }, { x: L, y: L }]
    ];
    var triEnd = [
      [{ x: 0, y: 0 }, { x: sb, y: 0 }, { x: 0, y: sa }],
      [{ x: L, y: L }, { x: sa, y: L }, { x: L, y: sb }],
      [{ x: 0, y: L }, { x: sa, y: L }, { x: 0, y: sa }],
      [{ x: L, y: 0 }, { x: sb, y: 0 }, { x: L, y: sb }]
    ];

    var toSvg = function (p) { return { x: ox + p.x, y: oy + p.y }; };

    // Update a^2, b^2, and c^2 backdrop squares
    var sqAEl = document.getElementById('proofSqA');
    var sqBEl = document.getElementById('proofSqB');
    var sqCEl = document.getElementById('proofSqC');
    var lblA = document.getElementById('proofLblA');
    var lblB = document.getElementById('proofLblB');
    var lblC = document.getElementById('proofLblC');

    sqAEl.setAttribute('x', (ox + sb).toFixed(1));
    sqAEl.setAttribute('y', oy.toFixed(1));
    sqAEl.setAttribute('width', sa.toFixed(1));
    sqAEl.setAttribute('height', sa.toFixed(1));

    sqBEl.setAttribute('x', ox.toFixed(1));
    sqBEl.setAttribute('y', (oy + sa).toFixed(1));
    sqBEl.setAttribute('width', sb.toFixed(1));
    sqBEl.setAttribute('height', sb.toFixed(1));

    var cPoly = [
      toSvg({ x: sb, y: 0 }),
      toSvg({ x: L, y: sb }),
      toSvg({ x: sa, y: L }),
      toSvg({ x: 0, y: sa })
    ];
    sqCEl.setAttribute('points', pts(cPoly));

    var abOpacity = clamp(1 - t * 2.1, 0, 1);
    var cOpacity = clamp((t - 0.52) * 2.1, 0, 1);
    sqAEl.setAttribute('opacity', abOpacity.toFixed(2));
    sqBEl.setAttribute('opacity', abOpacity.toFixed(2));
    lblA.setAttribute('opacity', abOpacity.toFixed(2));
    lblB.setAttribute('opacity', abOpacity.toFixed(2));
    sqCEl.setAttribute('opacity', cOpacity.toFixed(2));
    lblC.setAttribute('opacity', cOpacity.toFixed(2));

    lblA.setAttribute('x', (ox + sb + sa / 2).toFixed(1));
    lblA.setAttribute('y', (oy + sa / 2 + 6).toFixed(1));
    lblA.textContent = 'a² = ' + fmtClean(a * a);

    lblB.setAttribute('x', (ox + sb / 2).toFixed(1));
    lblB.setAttribute('y', (oy + sa + sb / 2 + 6).toFixed(1));
    lblB.textContent = 'b² = ' + fmtClean(b * b);

    lblC.setAttribute('x', (ox + L / 2).toFixed(1));
    lblC.setAttribute('y', (oy + L / 2 + 6).toFixed(1));
    lblC.textContent = 'c² = ' + fmtClean(c * c);

    for (var i = 0; i < 4; i++) {
      var polyEl = document.getElementById('proofTri' + (i + 1));
      var cur = [
        toSvg(lerpPt(triStart[i][0], triEnd[i][0], t)),
        toSvg(lerpPt(triStart[i][1], triEnd[i][1], t)),
        toSvg(lerpPt(triStart[i][2], triEnd[i][2], t))
      ];
      polyEl.setAttribute('points', pts(cur));
    }

    // Update narration & algebraic boxes
    var narr = document.getElementById('proof-narration');
    if (narr) {
      if (state.proofT < 0.15) {
        narr.innerHTML = '<strong>Layout 1 (a² + b²):</strong> Four congruent right triangles sit in two rectangles, leaving two uncovered squares of area <span class="py-pill py-pill-a">a² = ' + fmtClean(a * a) + '</span> and <span class="py-pill py-pill-b">b² = ' + fmtClean(b * b) + '</span>.';
      } else if (state.proofT > 0.85) {
        narr.innerHTML = '<strong>Layout 2 (c²):</strong> Those exact same 4 triangles slid into the four corners. No triangle changed size, so the uncovered middle square must have the exact same leftover area: <span class="py-pill py-pill-c">c² = ' + fmtClean(c * c) + '</span>.';
      } else {
        narr.innerHTML = '<strong>Sliding triangles…</strong> Watch the 4 congruent triangles translate without rotating. The total outer frame <span class="py-mono">(a + b)²</span> and triangle areas stay constant.';
      }
    }

    var boxTotal = (a + b) * (a + b);
    var fourTris = 2 * a * b;
    document.getElementById('proof-box-area').textContent = fmtClean(boxTotal);
    document.getElementById('proof-tri-area').textContent = fmtClean(fourTris);
    document.getElementById('proof-left-area').textContent = fmtClean(a * a + b * b);

    // Algebraic proof live numbers
    var alg1 = document.getElementById('alg-left-live');
    var alg2 = document.getElementById('alg-right-live');
    if (alg1 && alg2) {
      alg1.textContent = '(' + fmtClean(a) + ' + ' + fmtClean(b) + ')² = ' + fmtClean(a * a) + ' + ' + fmtClean(fourTris) + ' + ' + fmtClean(b * b) + ' = ' + fmtClean(boxTotal);
      alg2.textContent = '(' + fmtClean(a) + ' + ' + fmtClean(b) + ')² = ' + fmtClean(c * c) + ' + ' + fmtClean(fourTris) + ' = ' + fmtClean(boxTotal);
    }

    if (proofSlider) proofSlider.value = Math.round(state.proofT * 100);
  }

  var proofRaf = proofCanvas && window.SimKit && window.SimKit.raf ? window.SimKit.raf(proofCanvas) : null;
  var proofLastTs = null;
  var proofDir = 1;
  function tickProof(ts) {
    if (!state.proofPlaying) return;
    if (proofLastTs === null) proofLastTs = ts;
    var dt = Math.min(0.05, (ts - proofLastTs) / 1000);
    proofLastTs = ts;
    state.proofT = clamp(state.proofT + dt * 0.65 * proofDir, 0, 1);
    renderProof();
    if ((proofDir === 1 && state.proofT >= 1) || (proofDir === -1 && state.proofT <= 0)) {
      state.proofPlaying = false;
      proofPlayBtn.textContent = state.proofT >= 1 ? 'Animate Back' : 'Animate Rearrangement';
      return;
    }
    if (proofRaf) proofRaf(tickProof);
    else requestAnimationFrame(tickProof);
  }

  if (proofPlayBtn) {
    proofPlayBtn.addEventListener('click', function () {
      if (REDUCED_MOTION) {
        state.proofT = state.proofT >= 0.5 ? 0 : 1;
        renderProof();
        return;
      }
      proofDir = state.proofT >= 0.99 ? -1 : 1;
      state.proofPlaying = !state.proofPlaying;
      proofPlayBtn.textContent = state.proofPlaying ? 'Pause' : 'Animate Rearrangement';
      proofLastTs = null;
      if (state.proofPlaying) {
        if (proofRaf) proofRaf(tickProof);
        else requestAnimationFrame(tickProof);
      }
    });
  }
  if (proofResetBtn) {
    proofResetBtn.addEventListener('click', function () {
      state.proofPlaying = false;
      state.proofT = 0;
      proofPlayBtn.textContent = 'Animate Rearrangement';
      renderProof();
    });
  }
  if (proofShowAB) {
    proofShowAB.addEventListener('click', function () {
      state.proofPlaying = false;
      state.proofT = 0;
      proofPlayBtn.textContent = 'Animate Rearrangement';
      renderProof();
    });
  }
  if (proofShowC) {
    proofShowC.addEventListener('click', function () {
      state.proofPlaying = false;
      state.proofT = 1;
      proofPlayBtn.textContent = 'Animate Back';
      renderProof();
    });
  }
  if (proofSlider) {
    proofSlider.addEventListener('input', function () {
      state.proofPlaying = false;
      state.proofT = parseFloat(proofSlider.value) / 100;
      renderProof();
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     3. ANGLE-HINGE & CONVERSE LAB
     ══════════════════════════════════════════════════════════════════ */
  var hingeSlider = document.getElementById('hinge-angle');
  function renderConverse() {
    var deg = state.hingeDeg;
    var rad = deg * (Math.PI / 180);
    var a = 3, b = 4;
    var c2 = a * a + b * b - 2 * a * b * Math.cos(rad);
    var c = Math.sqrt(c2);
    var ab2 = a * a + b * b;

    var scale = 46;
    var hx = 220;
    var hy = 250;
    var pB = { x: hx + b * scale, y: hy };
    var pA = { x: hx + a * scale * Math.cos(rad), y: hy - a * scale * Math.sin(rad) };

    var triEl = document.getElementById('converseTri');
    var legAEl = document.getElementById('converseLegA');
    var legBEl = document.getElementById('converseLegB');
    var sideCEl = document.getElementById('converseSideC');
    var arcEl = document.getElementById('converseArc');
    var rightEl = document.getElementById('converseRightMark');

    triEl.setAttribute('points', pts([{ x: hx, y: hy }, pB, pA]));
    legBEl.setAttribute('x1', hx); legBEl.setAttribute('y1', hy);
    legBEl.setAttribute('x2', pB.x); legBEl.setAttribute('y2', pB.y);
    legAEl.setAttribute('x1', hx); legAEl.setAttribute('y1', hy);
    legAEl.setAttribute('x2', pA.x.toFixed(1)); legAEl.setAttribute('y2', pA.y.toFixed(1));
    sideCEl.setAttribute('x1', pA.x.toFixed(1)); sideCEl.setAttribute('y1', pA.y.toFixed(1));
    sideCEl.setAttribute('x2', pB.x); sideCEl.setAttribute('y2', pB.y);

    if (deg === 90) {
      arcEl.setAttribute('d', '');
      rightEl.setAttribute('d', 'M ' + hx + ' ' + (hy - 16) + ' L ' + (hx + 16) + ' ' + (hy - 16) + ' L ' + (hx + 16) + ' ' + hy);
    } else {
      rightEl.setAttribute('d', '');
      var r = 30;
      arcEl.setAttribute('d', 'M ' + (hx + r) + ' ' + hy + ' A ' + r + ' ' + r + ' 0 0 0 ' +
        (hx + r * Math.cos(rad)).toFixed(1) + ' ' + (hy - r * Math.sin(rad)).toFixed(1));
    }

    document.getElementById('converseLblA').setAttribute('x', ((hx + pA.x) / 2 - 22).toFixed(1));
    document.getElementById('converseLblA').setAttribute('y', ((hy + pA.y) / 2).toFixed(1));
    document.getElementById('converseLblB').setAttribute('x', ((hx + pB.x) / 2).toFixed(1));
    document.getElementById('converseLblB').setAttribute('y', hy + 22);
    document.getElementById('converseLblC').setAttribute('x', ((pA.x + pB.x) / 2 + 12).toFixed(1));
    document.getElementById('converseLblC').setAttribute('y', ((pA.y + pB.y) / 2 - 8).toFixed(1));
    document.getElementById('converseLblC').textContent = 'c = ' + fmt2(c);
    document.getElementById('converseLblAngle').setAttribute('x', hx + 36);
    document.getElementById('converseLblAngle').setAttribute('y', hy - 14);
    document.getElementById('converseLblAngle').textContent = 'γ = ' + deg + '°';

    document.getElementById('hinge-val').textContent = deg + '°';
    document.getElementById('converse-ab2').textContent = ab2.toFixed(1);
    document.getElementById('converse-c2').textContent = c2.toFixed(1);
    document.getElementById('converse-bar-ab').style.width = ((ab2 / 49) * 100).toFixed(1) + '%';
    document.getElementById('converse-bar-c').style.width = clamp((c2 / 49) * 100, 0, 100).toFixed(1) + '%';

    var badge = document.getElementById('converse-badge');
    var eqEl = document.getElementById('converse-ineq');
    if (deg === 90) {
      badge.textContent = 'Right Triangle (90°)';
      badge.className = 'py-status-badge py-status-right';
      eqEl.textContent = 'a² + b² = c²  (' + ab2.toFixed(1) + ' = ' + c2.toFixed(1) + ')';
    } else if (deg < 90) {
      badge.textContent = 'Acute Triangle (< 90°)';
      badge.className = 'py-status-badge py-status-acute';
      eqEl.textContent = 'a² + b² > c²  (' + ab2.toFixed(1) + ' > ' + c2.toFixed(1) + ')';
    } else {
      badge.textContent = 'Obtuse Triangle (> 90°)';
      badge.className = 'py-status-badge py-status-obtuse';
      eqEl.textContent = 'a² + b² < c²  (' + ab2.toFixed(1) + ' < ' + c2.toFixed(1) + ')';
    }
    if (hingeSlider) hingeSlider.value = deg;
  }

  if (hingeSlider) {
    hingeSlider.addEventListener('input', function () {
      state.hingeDeg = parseInt(hingeSlider.value, 10);
      renderConverse();
    });
  }
  document.querySelectorAll('[data-hinge]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.hingeDeg = parseInt(btn.getAttribute('data-hinge'), 10);
      renderConverse();
    });
  });

  /* ══════════════════════════════════════════════════════════════════
     4. TABBED WIDGETS (PROOFS + REAL-WORLD LABS)
     ══════════════════════════════════════════════════════════════════ */
  function initTabGroup(groupSelector) {
    var group = document.querySelector(groupSelector);
    if (!group) return;
    var tabs = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    function activate(tab) {
      tabs.forEach(function (t) {
        var sel = t === tab;
        t.setAttribute('aria-selected', sel ? 'true' : 'false');
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !sel;
      });
    }
    tabs.forEach(function (t, idx) {
      t.addEventListener('click', function () { activate(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); var next = tabs[(idx + 1) % tabs.length]; next.focus(); activate(next); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); var prev = tabs[(idx - 1 + tabs.length) % tabs.length]; prev.focus(); activate(prev); }
      });
    });
  }
  initTabGroup('[data-tab-group="proofs"]');
  initTabGroup('[data-tab-group="apps"]');

  /* ══════════════════════════════════════════════════════════════════
     5. REAL-WORLD INTERACTIVE LABS
     ══════════════════════════════════════════════════════════════════ */
  // 5A: Ramp & Roof Truss Lab
  var rampRiseInput = document.getElementById('ramp-rise-in');
  var rampRunInput = document.getElementById('ramp-run-in');
  function renderRamp() {
    var rise = state.rampRise;
    var run = state.rampRun;
    var len = Math.sqrt(rise * rise + run * run);
    var angle = Math.atan2(rise, run) * (180 / Math.PI);
    var grade = (rise / run) * 100;
    var adaOk = run >= rise * 12 - 1e-6;

    // SVG ramp scaling inside 480 x 260
    var x0 = 60, y0 = 215;
    var maxW = 360, maxH = 155;
    var s = Math.min(maxW / 24, maxH / 6);
    var rx = x0 + run * s;
    var ry = y0 - rise * s;

    document.getElementById('rampTri').setAttribute('points', pts([{ x: x0, y: y0 }, { x: rx, y: y0 }, { x: rx, y: ry }]));
    document.getElementById('rampRunLine').setAttribute('x1', x0);
    document.getElementById('rampRunLine').setAttribute('y1', y0);
    document.getElementById('rampRunLine').setAttribute('x2', rx);
    document.getElementById('rampRunLine').setAttribute('y2', y0);
    document.getElementById('rampRiseLine').setAttribute('x1', rx);
    document.getElementById('rampRiseLine').setAttribute('y1', y0);
    document.getElementById('rampRiseLine').setAttribute('x2', rx);
    document.getElementById('rampRiseLine').setAttribute('y2', ry);
    document.getElementById('rampHypLine').setAttribute('x1', x0);
    document.getElementById('rampHypLine').setAttribute('y1', y0);
    document.getElementById('rampHypLine').setAttribute('x2', rx);
    document.getElementById('rampHypLine').setAttribute('y2', ry);

    document.getElementById('rampLblRun').setAttribute('x', (x0 + rx) / 2);
    document.getElementById('rampLblRun').setAttribute('y', y0 + 22);
    document.getElementById('rampLblRun').textContent = 'Run = ' + fmt1(run) + ' ft';
    document.getElementById('rampLblRise').setAttribute('x', rx + 10);
    document.getElementById('rampLblRise').setAttribute('y', (y0 + ry) / 2 + 4);
    document.getElementById('rampLblRise').textContent = fmt1(rise) + ' ft';
    document.getElementById('rampLblLen').setAttribute('x', (x0 + rx) / 2 - 10);
    document.getElementById('rampLblLen').setAttribute('y', (y0 + ry) / 2 - 12);
    document.getElementById('rampLblLen').textContent = 'Ramp = ' + fmt2(len) + ' ft';

    document.getElementById('ramp-rise-val').textContent = fmt1(rise) + ' ft';
    document.getElementById('ramp-run-val').textContent = fmt1(run) + ' ft';
    document.getElementById('ramp-len-out').textContent = fmt2(len) + ' ft';
    document.getElementById('ramp-angle-out').textContent = fmt1(angle) + '° (' + fmt1(grade) + '% grade)';

    var adaEl = document.getElementById('ramp-ada-status');
    if (adaOk) {
      adaEl.textContent = 'ADA 1:12 Compliant (≤ 8.3% grade)';
      adaEl.className = 'py-status-badge py-status-right';
    } else {
      adaEl.textContent = 'Too steep for ADA 1:12 (needs ≥ ' + fmt1(rise * 12) + ' ft run)';
      adaEl.className = 'py-status-badge py-status-obtuse';
    }
  }
  if (rampRiseInput) rampRiseInput.addEventListener('input', function () { state.rampRise = parseFloat(rampRiseInput.value); renderRamp(); });
  if (rampRunInput) rampRunInput.addEventListener('input', function () { state.rampRun = parseFloat(rampRunInput.value); renderRamp(); });

  // 5B: Coordinate Distance Lab (-6..6 grid in 360x360 viewBox)
  var coordSvg = document.getElementById('coordCanvas');
  var coordGrid = document.getElementById('coordGridLines');
  function buildCoordGrid() {
    if (!coordGrid) return;
    coordGrid.innerHTML = '';
    for (var i = -6; i <= 6; i++) {
      var p = 180 + i * 26;
      var isAxis = i === 0;
      coordGrid.appendChild(svgEl('line', {
        x1: 24, y1: p, x2: 336, y2: p,
        stroke: isAxis ? 'currentColor' : 'var(--py-board-grid)',
        'stroke-width': isAxis ? '1.8' : '1',
        'stroke-opacity': isAxis ? '0.55' : '1'
      }));
      coordGrid.appendChild(svgEl('line', {
        x1: p, y1: 24, x2: p, y2: 336,
        stroke: isAxis ? 'currentColor' : 'var(--py-board-grid)',
        'stroke-width': isAxis ? '1.8' : '1',
        'stroke-opacity': isAxis ? '0.55' : '1'
      }));
    }
  }
  buildCoordGrid();

  function renderCoord() {
    if (!coordSvg) return;
    var A = state.ptA, B = state.ptB;
    var toPx = function (pt) { return { x: 180 + pt.x * 26, y: 180 - pt.y * 26 }; };
    var pA = toPx(A), pB = toPx(B), pCorner = toPx({ x: B.x, y: A.y });

    document.getElementById('coordDx').setAttribute('x1', pA.x); document.getElementById('coordDx').setAttribute('y1', pA.y);
    document.getElementById('coordDx').setAttribute('x2', pCorner.x); document.getElementById('coordDx').setAttribute('y2', pCorner.y);
    document.getElementById('coordDy').setAttribute('x1', pCorner.x); document.getElementById('coordDy').setAttribute('y1', pCorner.y);
    document.getElementById('coordDy').setAttribute('x2', pB.x); document.getElementById('coordDy').setAttribute('y2', pB.y);
    document.getElementById('coordDist').setAttribute('x1', pA.x); document.getElementById('coordDist').setAttribute('y1', pA.y);
    document.getElementById('coordDist').setAttribute('x2', pB.x); document.getElementById('coordDist').setAttribute('y2', pB.y);

    document.getElementById('coordPtA').setAttribute('cx', pA.x); document.getElementById('coordPtA').setAttribute('cy', pA.y);
    document.getElementById('coordPtB').setAttribute('cx', pB.x); document.getElementById('coordPtB').setAttribute('cy', pB.y);

    document.getElementById('coordLblA').setAttribute('x', pA.x - 6); document.getElementById('coordLblA').setAttribute('y', pA.y + 18);
    document.getElementById('coordLblA').textContent = 'A(' + A.x + ',' + A.y + ')';
    document.getElementById('coordLblB').setAttribute('x', pB.x + 8); document.getElementById('coordLblB').setAttribute('y', pB.y - 10);
    document.getElementById('coordLblB').textContent = 'B(' + B.x + ',' + B.y + ')';

    var dx = Math.abs(B.x - A.x);
    var dy = Math.abs(B.y - A.y);
    var d = Math.sqrt(dx * dx + dy * dy);
    document.getElementById('coord-dx-out').textContent = dx;
    document.getElementById('coord-dy-out').textContent = dy;
    document.getElementById('coord-d-out').textContent = fmt2(d);
    document.getElementById('coord-formula-out').textContent = 'd = √(' + dx + '² + ' + dy + '²) = √' + (dx * dx + dy * dy) + ' ≈ ' + fmt2(d);
  }

  function enableCoordDrag(el, key) {
    if (!el || !coordSvg) return;
    var active = false;
    el.addEventListener('pointerdown', function (e) { active = true; el.setPointerCapture(e.pointerId); e.preventDefault(); });
    el.addEventListener('pointermove', function (e) {
      if (!active) return;
      var rect = coordSvg.getBoundingClientRect();
      var sx = ((e.clientX - rect.left) / rect.width) * 360;
      var sy = ((e.clientY - rect.top) / rect.height) * 360;
      state[key].x = clamp(Math.round((sx - 180) / 26), -6, 6);
      state[key].y = clamp(Math.round((180 - sy) / 26), -6, 6);
      renderCoord();
    });
    var stop = function () { active = false; };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  }
  enableCoordDrag(document.getElementById('coordPtA'), 'ptA');
  enableCoordDrag(document.getElementById('coordPtB'), 'ptB');

  // 5C: 3D Box Diagonal Lab
  var boxWIn = document.getElementById('box-w');
  var boxDIn = document.getElementById('box-d');
  var boxHIn = document.getElementById('box-h');
  function renderBox3d() {
    var w = state.boxW, d = state.boxD, h = state.boxH;
    var floorDiag = Math.sqrt(w * w + d * d);
    var spaceDiag = Math.sqrt(w * w + d * d + h * h);

    // Isometric projection centered in 420 x 280
    var s = 11.5;
    var ox = 210, oy = 185;
    var cos30 = 0.866, sin30 = 0.5;
    function iso(x, y, z) {
      return {
        x: ox + (x - y) * cos30 * s,
        y: oy + (x + y) * sin30 * s - z * s
      };
    }
    var p000 = iso(0, 0, 0), pW00 = iso(w, 0, 0), pWD0 = iso(w, d, 0), p0D0 = iso(0, d, 0);
    var p00H = iso(0, 0, h), pW0H = iso(w, 0, h), pWDH = iso(w, d, h), p0DH = iso(0, d, h);

    var setSeg = function (id, p1, p2) {
      var el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('x1', p1.x.toFixed(1)); el.setAttribute('y1', p1.y.toFixed(1));
      el.setAttribute('x2', p2.x.toFixed(1)); el.setAttribute('y2', p2.y.toFixed(1));
    };
    document.getElementById('boxBackEdges').setAttribute('d',
      'M ' + p000.x.toFixed(1) + ' ' + p000.y.toFixed(1) + ' L ' + pW00.x.toFixed(1) + ' ' + pW00.y.toFixed(1) +
      ' M ' + p000.x.toFixed(1) + ' ' + p000.y.toFixed(1) + ' L ' + p0D0.x.toFixed(1) + ' ' + p0D0.y.toFixed(1) +
      ' M ' + p000.x.toFixed(1) + ' ' + p000.y.toFixed(1) + ' L ' + p00H.x.toFixed(1) + ' ' + p00H.y.toFixed(1));
    document.getElementById('boxFrontEdges').setAttribute('d',
      'M ' + pW00.x.toFixed(1) + ' ' + pW00.y.toFixed(1) + ' L ' + pWD0.x.toFixed(1) + ' ' + pWD0.y.toFixed(1) +
      ' L ' + p0D0.x.toFixed(1) + ' ' + p0D0.y.toFixed(1) +
      ' M ' + p00H.x.toFixed(1) + ' ' + p00H.y.toFixed(1) + ' L ' + pW0H.x.toFixed(1) + ' ' + pW0H.y.toFixed(1) +
      ' L ' + pWDH.x.toFixed(1) + ' ' + pWDH.y.toFixed(1) + ' L ' + p0DH.x.toFixed(1) + ' ' + p0DH.y.toFixed(1) + ' Z' +
      ' M ' + pW00.x.toFixed(1) + ' ' + pW00.y.toFixed(1) + ' L ' + pW0H.x.toFixed(1) + ' ' + pW0H.y.toFixed(1) +
      ' M ' + pWD0.x.toFixed(1) + ' ' + pWD0.y.toFixed(1) + ' L ' + pWDH.x.toFixed(1) + ' ' + pWDH.y.toFixed(1) +
      ' M ' + p0D0.x.toFixed(1) + ' ' + p0D0.y.toFixed(1) + ' L ' + p0DH.x.toFixed(1) + ' ' + p0DH.y.toFixed(1));

    setSeg('boxFloorDiag', p000, pWD0);
    setSeg('boxHeightEdge', pWD0, pWDH);
    setSeg('boxSpaceDiag', p000, pWDH);

    document.getElementById('box-w-val').textContent = w;
    document.getElementById('box-d-val').textContent = d;
    document.getElementById('box-h-val').textContent = h;
    document.getElementById('box-floor-out').textContent = fmt2(floorDiag);
    document.getElementById('box-space-out').textContent = fmt2(spaceDiag);
    document.getElementById('box-formula-out').textContent = 'D = √(' + w + '² + ' + d + '² + ' + h + '²) = √' + (w * w + d * d + h * h) + ' ≈ ' + fmt2(spaceDiag);
  }
  if (boxWIn) boxWIn.addEventListener('input', function () { state.boxW = parseInt(boxWIn.value, 10); renderBox3d(); });
  if (boxDIn) boxDIn.addEventListener('input', function () { state.boxD = parseInt(boxDIn.value, 10); renderBox3d(); });
  if (boxHIn) boxHIn.addEventListener('input', function () { state.boxH = parseInt(boxHIn.value, 10); renderBox3d(); });

  /* ══════════════════════════════════════════════════════════════════
     6. PRACTICE PROBLEMS + INFINITE DRILL GENERATOR
     ══════════════════════════════════════════════════════════════════ */
  var solvedSet = new Set();
  var TOTAL_CURATED = 6;

  function updateScore() {
    var el = document.getElementById('py-score');
    if (!el) return;
    el.textContent = solvedSet.size + ' / ' + TOTAL_CURATED + ' correct';
    el.classList.toggle('is-complete', solvedSet.size === TOTAL_CURATED);
  }

  function handleNumericCheck(num, expected, tol) {
    var input = document.getElementById('ans-' + num);
    var fb = document.getElementById('fb-' + num);
    var hint = document.getElementById('hint-' + num);
    var prob = document.getElementById('prob-' + num);
    var val = parseFloat(input.value);
    fb.className = 'py-feedback';

    if (isNaN(val)) {
      fb.textContent = 'Enter a number.';
      fb.classList.add('wrong');
      return;
    }

    if (Math.abs(val - expected) <= tol) {
      fb.textContent = '✓ Correct!';
      fb.classList.add('correct');
      hint.classList.remove('visible');
      input.disabled = true;
      prob.classList.add('solved');
      if (!solvedSet.has(num)) { solvedSet.add(num); updateScore(); }
    } else {
      fb.textContent = '✗ Try again';
      fb.classList.add('wrong');
      hint.classList.add('visible');
      prob.classList.remove('py-shake');
      void prob.offsetWidth;
      prob.classList.add('py-shake');
    }
  }

  document.querySelectorAll('[data-check-num]').forEach(function (btn) {
    var num = parseInt(btn.getAttribute('data-check-num'), 10);
    var expected = parseFloat(btn.getAttribute('data-expected'));
    var tol = parseFloat(btn.getAttribute('data-tol') || '0.15');
    btn.addEventListener('click', function () { handleNumericCheck(num, expected, tol); });
    var input = document.getElementById('ans-' + num);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); handleNumericCheck(num, expected, tol); }
      });
    }
  });

  // Problem 6: Converse classification buttons
  document.querySelectorAll('[data-converse-ans]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pick = btn.getAttribute('data-converse-ans');
      var fb = document.getElementById('fb-6');
      var hint = document.getElementById('hint-6');
      var prob = document.getElementById('prob-6');
      fb.className = 'py-feedback';
      if (pick === 'obtuse') {
        fb.textContent = '✓ Correct! 49 + 64 = 113 < 121';
        fb.classList.add('correct');
        hint.classList.remove('visible');
        prob.classList.add('solved');
        document.querySelectorAll('[data-converse-ans]').forEach(function (b) { b.disabled = true; });
        if (!solvedSet.has(6)) { solvedSet.add(6); updateScore(); }
      } else {
        fb.textContent = '✗ Compare 7² + 8² to 11²';
        fb.classList.add('wrong');
        hint.classList.add('visible');
        prob.classList.remove('py-shake');
        void prob.offsetWidth;
        prob.classList.add('py-shake');
      }
    });
  });

  // Infinite Drill Generator
  var drillModeEl = document.getElementById('drill-mode');
  var drillPromptEl = document.getElementById('drill-prompt');
  var drillSvgEl = document.getElementById('drill-svg');
  var drillInputEl = document.getElementById('drill-ans');
  var drillCheckBtn = document.getElementById('drill-check');
  var drillNewBtn = document.getElementById('drill-new');
  var drillRevealBtn = document.getElementById('drill-reveal');
  var drillFbEl = document.getElementById('drill-fb');
  var drillStepsEl = document.getElementById('drill-steps');
  var drillStreakEl = document.getElementById('drill-streak');
  var drillChoiceRow = document.getElementById('drill-choice-row');
  var drillNumRow = document.getElementById('drill-num-row');

  var DRILL_TRIPLES = [
    [3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17],
    [9, 12, 15], [7, 24, 25], [12, 16, 20], [10, 24, 26]
  ];
  var currentDrill = null;
  var drillStreak = 0;

  function drawDrillTriangle(aText, bText, cText, isRight) {
    if (!drillSvgEl) return;
    drillSvgEl.innerHTML = '';
    drillSvgEl.appendChild(svgEl('polygon', {
      points: '34,112 34,26 154,112',
      fill: 'var(--py-a-soft)',
      stroke: 'var(--py-tri-stroke)',
      'stroke-width': '2.4'
    }));
    if (isRight) {
      drillSvgEl.appendChild(svgEl('polyline', {
        points: '34,98 48,98 48,112',
        fill: 'none',
        stroke: 'var(--py-tri-stroke)',
        'stroke-width': '1.8'
      }));
    }
    var addTxt = function (x, y, txt, col) {
      var t = svgEl('text', { x: x, y: y, fill: col, 'font-size': '13', 'font-weight': '800', 'text-anchor': 'middle' });
      t.textContent = txt;
      drillSvgEl.appendChild(t);
    };
    addTxt(18, 72, aText, 'var(--py-a)');
    addTxt(94, 128, bText, 'var(--py-b)');
    addTxt(106, 62, cText, 'var(--py-c)');
  }

  function newDrillProblem() {
    if (!drillModeEl) return;
    var mode = drillModeEl.value;
    if (mode === 'mix') {
      var pool = ['hyp', 'leg', 'converse'];
      mode = pool[Math.floor(Math.random() * pool.length)];
    }

    drillFbEl.className = 'py-feedback';
    drillFbEl.textContent = '';
    drillStepsEl.hidden = true;
    if (drillInputEl) drillInputEl.value = '';

    if (mode === 'hyp') {
      drillNumRow.hidden = false;
      drillChoiceRow.hidden = true;
      var useTriple = Math.random() < 0.65;
      var a, b, c;
      if (useTriple) {
        var t = DRILL_TRIPLES[Math.floor(Math.random() * DRILL_TRIPLES.length)];
        a = t[0]; b = t[1]; c = t[2];
      } else {
        a = 2 + Math.floor(Math.random() * 8);
        b = 3 + Math.floor(Math.random() * 8);
        c = Math.round(Math.sqrt(a * a + b * b) * 10) / 10;
      }
      currentDrill = {
        type: 'num',
        expected: c,
        tol: useTriple ? 0.05 : 0.15,
        steps: 'c = √(' + a + '² + ' + b + '²) = √(' + (a * a) + ' + ' + (b * b) + ') = √' + (a * a + b * b) + (useTriple ? ' = ' + c : ' ≈ ' + c)
      };
      drillPromptEl.textContent = 'Find the missing hypotenuse c (round decimals to 1 place): a = ' + a + ', b = ' + b + '.';
      drawDrillTriangle('a=' + a, 'b=' + b, 'c=?', true);
    } else if (mode === 'leg') {
      drillNumRow.hidden = false;
      drillChoiceRow.hidden = true;
      var tr = DRILL_TRIPLES[Math.floor(Math.random() * DRILL_TRIPLES.length)];
      var askA = Math.random() < 0.5;
      var knownLeg = askA ? tr[1] : tr[0];
      var missingLeg = askA ? tr[0] : tr[1];
      currentDrill = {
        type: 'num',
        expected: missingLeg,
        tol: 0.05,
        steps: 'leg = √(' + tr[2] + '² − ' + knownLeg + '²) = √(' + (tr[2] * tr[2]) + ' − ' + (knownLeg * knownLeg) + ') = √' + (missingLeg * missingLeg) + ' = ' + missingLeg
      };
      drillPromptEl.textContent = 'Find the missing leg: hypotenuse c = ' + tr[2] + ' and one leg = ' + knownLeg + '.';
      drawDrillTriangle(askA ? 'a=?' : 'a=' + knownLeg, askA ? 'b=' + knownLeg : 'b=?', 'c=' + tr[2], true);
    } else {
      drillNumRow.hidden = true;
      drillChoiceRow.hidden = false;
      var kinds = ['right', 'acute', 'obtuse'];
      var kind = kinds[Math.floor(Math.random() * kinds.length)];
      var s1, s2, s3;
      if (kind === 'right') {
        var rt = DRILL_TRIPLES[Math.floor(Math.random() * 4)];
        s1 = rt[0]; s2 = rt[1]; s3 = rt[2];
      } else if (kind === 'acute') {
        s1 = 5 + Math.floor(Math.random() * 4);
        s2 = s1 + 1;
        s3 = s2 + 1; // since s1^2 + s2^2 > (s2+1)^2 for s1>=5
      } else {
        s1 = 4 + Math.floor(Math.random() * 3);
        s2 = s1 + 1;
        s3 = s1 + s2 - 1; // triangle inequality holds, s1^2 + s2^2 < s3^2
      }
      var sum = s1 * s1 + s2 * s2;
      var csq = s3 * s3;
      var cmp = sum === csq ? '=' : (sum > csq ? '>' : '<');
      currentDrill = {
        type: 'converse',
        expected: kind,
        steps: s1 + '² + ' + s2 + '² = ' + sum + ' ' + cmp + ' ' + s3 + '² (' + csq + '), so the triangle is ' + kind + '.'
      };
      drillPromptEl.textContent = 'Classify the triangle with sides ' + s1 + ', ' + s2 + ', and ' + s3 + ':';
      drawDrillTriangle(String(s1), String(s2), String(s3), false);
    }
  }

  function finishDrill(correct) {
    drillFbEl.className = 'py-feedback';
    if (correct) {
      drillStreak += 1;
      drillFbEl.textContent = '✓ Correct!';
      drillFbEl.classList.add('correct');
      drillStepsEl.textContent = currentDrill.steps;
      drillStepsEl.hidden = false;
    } else {
      drillStreak = 0;
      drillFbEl.textContent = '✗ Not quite — check the steps or try again';
      drillFbEl.classList.add('wrong');
    }
    drillStreakEl.textContent = 'Streak: ' + drillStreak;
  }

  if (drillCheckBtn) {
    drillCheckBtn.addEventListener('click', function () {
      if (!currentDrill || currentDrill.type !== 'num') return;
      var v = parseFloat(drillInputEl.value);
      if (isNaN(v)) {
        drillFbEl.className = 'py-feedback wrong';
        drillFbEl.textContent = 'Enter a number.';
        return;
      }
      finishDrill(Math.abs(v - currentDrill.expected) <= currentDrill.tol);
    });
    if (drillInputEl) {
      drillInputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); drillCheckBtn.click(); }
      });
    }
  }

  document.querySelectorAll('[data-drill-choice]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!currentDrill || currentDrill.type !== 'converse') return;
      finishDrill(btn.getAttribute('data-drill-choice') === currentDrill.expected);
    });
  });

  if (drillNewBtn) drillNewBtn.addEventListener('click', newDrillProblem);
  if (drillModeEl) drillModeEl.addEventListener('change', newDrillProblem);
  if (drillRevealBtn) {
    drillRevealBtn.addEventListener('click', function () {
      if (!currentDrill) return;
      drillStepsEl.textContent = currentDrill.steps;
      drillStepsEl.hidden = false;
    });
  }

  /* ── Initialize all views ──────────────────────────────────────── */
  renderBlueprint();
  renderConverse();
  renderRamp();
  renderCoord();
  renderBox3d();
  updateScore();
  newDrillProblem();
}());
