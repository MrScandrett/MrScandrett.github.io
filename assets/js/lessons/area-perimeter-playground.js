/**
 * area-perimeter-playground.js
 * Comprehensive interactive engine for Area & Perimeter Playground:
 *  - Lab 1: Accessible Polyomino Grid Builder, Boundary Highlighter,
 *           Contiguity & Hole Analysis, Perimeter Walker Odometer, and AI Blackboard export.
 *  - Lab 2: Parallelogram, Triangle & Trapezoid Shear & Unfold Lab with
 *           continuous rearrangement scrubbing, animation loop, and slant height trap guard.
 *  - Lab 3: Embedded AI Smart Blackboard Studio with live geometric shape recognition,
 *           draggables, step-by-step Common Core proofs, and AI Voice speech synthesis.
 *  - Interactive Checks, Guided Practice Blackboard helpers, and Exit Ticket rubric verification.
 */
(function () {
  'use strict';

  // =========================================================================
  // Lab 1: Polyomino Grid Builder & Boundary Highlighter
  // =========================================================================
  var SIZE = 10;
  var grid = document.getElementById('arp-grid');
  var state = [];
  for (var r = 0; r < SIZE; r++) {
    state.push(new Array(SIZE).fill(false));
  }
  var cellEls = [];
  var isDragging = false;
  var paintMode = true;

  if (grid) {
    for (var row = 0; row < SIZE; row++) {
      var rowEls = [];
      for (var col = 0; col < SIZE; col++) {
        var cell = document.createElement('div');
        cell.className = 'arp-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-pressed', 'false');
        cell.setAttribute('aria-label', 'Row ' + (row + 1) + ', Column ' + (col + 1));

        (function (rIdx, cIdx, el) {
          el.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            isDragging = true;
            paintMode = !state[rIdx][cIdx];
            state[rIdx][cIdx] = paintMode;
            updateGrid();
          });
          el.addEventListener('pointerenter', function () {
            if (!isDragging) return;
            if (state[rIdx][cIdx] !== paintMode) {
              state[rIdx][cIdx] = paintMode;
              updateGrid();
            }
          });
          el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              state[rIdx][cIdx] = !state[rIdx][cIdx];
              updateGrid();
            }
          });
        })(row, col, cell);

        grid.appendChild(cell);
        rowEls.push(cell);
      }
      cellEls.push(rowEls);
    }

    window.addEventListener('pointerup', function () { isDragging = false; });
    window.addEventListener('pointercancel', function () { isDragging = false; });
  }

  var cellsEl = document.getElementById('arp-cells');
  var areaEl = document.getElementById('arp-area');
  var perimeterEl = document.getElementById('arp-perimeter');
  var sharedEl = document.getElementById('arp-shared');
  var compactnessEl = document.getElementById('arp-compactness');
  var topologyEl = document.getElementById('arp-topology');
  var walkStatusEl = document.getElementById('arp-walk-status');
  var fenceWalkBtn = document.getElementById('arp-fence-walk');
  var sendPolyBbBtn = document.getElementById('arp-send-poly-bb');
  var goalCompactEl = document.getElementById('arp-goal-compact');
  var goalStretchedEl = document.getElementById('arp-goal-stretched');
  var challengeWinEl = document.getElementById('arp-challenge-win');
  var foundCompact16 = false;
  var foundStretched16 = false;
  var walkTimer = null;
  var isWalking = false;

  function isFilled(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE && state[r][c];
  }

  function computeTopology(cellList) {
    if (cellList.length === 0) return { islands: 0, holes: 0, desc: 'Empty Grid' };

    // 1. Connected components (Islands)
    var visited = {};
    var islands = 0;
    var cellSet = {};
    cellList.forEach(function (pt) { cellSet[pt[0] + ',' + pt[1]] = true; });

    cellList.forEach(function (pt) {
      var key = pt[0] + ',' + pt[1];
      if (visited[key]) return;
      islands++;
      var q = [pt];
      visited[key] = true;
      while (q.length > 0) {
        var curr = q.shift();
        var cr = curr[0], cc = curr[1];
        var neighbors = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
        neighbors.forEach(function (nb) {
          var nKey = nb[0] + ',' + nb[1];
          if (cellSet[nKey] && !visited[nKey]) {
            visited[nKey] = true;
            q.push(nb);
          }
        });
      }
    });

    // 2. Interior Hole / Cavity Detection via outer boundary flood fill
    var outsideReachable = {};
    var floodQ = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if ((r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1) && !state[r][c]) {
          var oKey = r + ',' + c;
          if (!outsideReachable[oKey]) {
            outsideReachable[oKey] = true;
            floodQ.push([r, c]);
          }
        }
      }
    }
    while (floodQ.length > 0) {
      var oCurr = floodQ.shift();
      var or = oCurr[0], oc = oCurr[1];
      var oNb = [[or - 1, oc], [or + 1, oc], [or, oc - 1], [or, oc + 1]];
      oNb.forEach(function (nb) {
        var nr = nb[0], nc = nb[1];
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !state[nr][nc]) {
          var nbKey = nr + ',' + nc;
          if (!outsideReachable[nbKey]) {
            outsideReachable[nbKey] = true;
            floodQ.push([nr, nc]);
          }
        }
      });
    }

    var holeCells = 0;
    for (var hr = 0; hr < SIZE; hr++) {
      for (var hc = 0; hc < SIZE; hc++) {
        if (!state[hr][hc] && !outsideReachable[hr + ',' + hc]) {
          holeCells++;
        }
      }
    }

    var desc = islands === 1 ? '1 Connected Shape' : islands + ' Disjoint Islands';
    if (holeCells > 0) desc += ' · ' + holeCells + ' Hole Cell' + (holeCells > 1 ? 's' : '');
    return { islands: islands, holes: holeCells, desc: desc };
  }

  function updateGrid() {
    var count = 0;
    var perimeter = 0;
    var internalHalfEdges = 0;
    var activeCells = [];

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var on = state[r][c];
        var el = cellEls[r][c];
        if (!el) continue;
        el.classList.toggle('on', on);
        el.setAttribute('aria-pressed', on ? 'true' : 'false');

        var topOpen = on && !isFilled(r - 1, c);
        var rightOpen = on && !isFilled(r, c + 1);
        var bottomOpen = on && !isFilled(r + 1, c);
        var leftOpen = on && !isFilled(r, c - 1);

        el.classList.toggle('edge-t', topOpen);
        el.classList.toggle('edge-r', rightOpen);
        el.classList.toggle('edge-b', bottomOpen);
        el.classList.toggle('edge-l', leftOpen);

        if (!on) continue;
        count += 1;
        activeCells.push([r, c]);
        var openEdges = (topOpen ? 1 : 0) + (rightOpen ? 1 : 0) + (bottomOpen ? 1 : 0) + (leftOpen ? 1 : 0);
        perimeter += openEdges;
        internalHalfEdges += (4 - openEdges);
      }
    }

    var sharedPairs = internalHalfEdges / 2;
    if (cellsEl) cellsEl.textContent = count;
    if (areaEl) areaEl.textContent = count + ' sq units';
    if (perimeterEl) perimeterEl.textContent = perimeter + ' units';
    if (sharedEl) sharedEl.textContent = sharedPairs + (sharedPairs === 1 ? ' pair' : ' pairs');

    // Compactness index (16 * Area / P^2, max 1.00 for a square)
    var compactnessVal = perimeter > 0 ? (16 * count / (perimeter * perimeter)).toFixed(2) : '0.00';
    if (compactnessEl) compactnessEl.textContent = compactnessVal;

    var topo = computeTopology(activeCells);
    if (topologyEl) topologyEl.textContent = topo.desc;

    if (perimeter === 16 && count >= 12) {
      foundCompact16 = true;
      if (goalCompactEl) {
        goalCompactEl.classList.add('done');
        goalCompactEl.firstElementChild.innerHTML = '&#9745;';
      }
    }
    if (perimeter === 16 && count > 0 && count <= 9) {
      foundStretched16 = true;
      if (goalStretchedEl) {
        goalStretchedEl.classList.add('done');
        goalStretchedEl.firstElementChild.innerHTML = '&#9745;';
      }
    }
    if (foundCompact16 && foundStretched16 && challengeWinEl) {
      challengeWinEl.classList.add('visible');
    }
  }

  function stopFenceWalk() {
    if (walkTimer) {
      clearInterval(walkTimer);
      walkTimer = null;
    }
    isWalking = false;
    if (fenceWalkBtn) fenceWalkBtn.textContent = '🚶 Walk Perimeter Fence';
    if (walkStatusEl) walkStatusEl.style.display = 'none';
    document.querySelectorAll('.arp-cell.edge-walking').forEach(function (el) {
      el.classList.remove('edge-walking');
    });
  }

  function startFenceWalk() {
    stopFenceWalk();
    var openEdges = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (state[r][c]) {
          if (!isFilled(r - 1, c)) openEdges.push({ r: r, c: c, side: 'Top' });
          if (!isFilled(r, c + 1)) openEdges.push({ r: r, c: c, side: 'Right' });
          if (!isFilled(r + 1, c)) openEdges.push({ r: r, c: c, side: 'Bottom' });
          if (!isFilled(r, c - 1)) openEdges.push({ r: r, c: c, side: 'Left' });
        }
      }
    }

    if (openEdges.length === 0) {
      alert('Paint some squares on the grid first to walk the perimeter fence!');
      return;
    }

    isWalking = true;
    if (fenceWalkBtn) fenceWalkBtn.textContent = '⏹ Stop Walking';
    if (walkStatusEl) walkStatusEl.style.display = 'block';

    var step = 0;
    walkTimer = setInterval(function () {
      document.querySelectorAll('.arp-cell.edge-walking').forEach(function (el) {
        el.classList.remove('edge-walking');
      });

      if (step >= openEdges.length) {
        walkStatusEl.textContent = '✅ Fence Walk Finished: ' + openEdges.length + ' linear units measured! Internal shared seams were never stepped on.';
        stopFenceWalk();
        return;
      }

      var curr = openEdges[step];
      if (cellEls[curr.r] && cellEls[curr.r][curr.c]) {
        cellEls[curr.r][curr.c].classList.add('edge-walking');
      }
      walkStatusEl.textContent = '🚶 Walking Boundary: Step ' + (step + 1) + ' of ' + openEdges.length + ' (outer ' + curr.side + ' edge of cell [' + (curr.r + 1) + ',' + (curr.c + 1) + '])';
      step++;
    }, 160);
  }

  if (fenceWalkBtn) {
    fenceWalkBtn.addEventListener('click', function () {
      if (isWalking) stopFenceWalk();
      else startFenceWalk();
    });
  }

  if (sendPolyBbBtn) {
    sendPolyBbBtn.addEventListener('click', function () {
      var cells = [];
      for (var r = 0; r < SIZE; r++) {
        for (var c = 0; c < SIZE; c++) {
          if (state[r][c]) cells.push([r, c]);
        }
      }
      if (cells.length === 0) {
        alert('Paint a polyomino on the grid first!');
        return;
      }
      loadPresetToBlackboard('poly', { cells: cells });
      var bbSection = document.getElementById('arp-lab3-blackboard');
      if (bbSection) bbSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function clearGrid() {
    stopFenceWalk();
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) state[r][c] = false;
    }
  }

  var clearBtn = document.getElementById('arp-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      clearGrid();
      updateGrid();
    });
  }

  var r3x4Btn = document.getElementById('arp-rect-3x4');
  if (r3x4Btn) {
    r3x4Btn.addEventListener('click', function () {
      clearGrid();
      for (var r = 3; r < 6; r++) for (var c = 3; c < 7; c++) state[r][c] = true;
      updateGrid();
    });
  }

  var p1x7Btn = document.getElementById('arp-preset-1x7');
  if (p1x7Btn) {
    p1x7Btn.addEventListener('click', function () {
      clearGrid();
      for (var c = 1; c < 8; c++) state[4][c] = true;
      updateGrid();
    });
  }

  var p4x4Btn = document.getElementById('arp-preset-4x4');
  if (p4x4Btn) {
    p4x4Btn.addEventListener('click', function () {
      clearGrid();
      for (var r = 3; r < 7; r++) for (var c = 3; c < 7; c++) state[r][c] = true;
      updateGrid();
    });
  }

  var pLBtn = document.getElementById('arp-preset-l');
  if (pLBtn) {
    pLBtn.addEventListener('click', function () {
      clearGrid();
      for (var r = 2; r < 6; r++) state[r][3] = true;
      for (var c = 4; c < 7; c++) state[5][c] = true;
      updateGrid();
    });
  }

  var pPlusBtn = document.getElementById('arp-preset-plus');
  if (pPlusBtn) {
    pPlusBtn.addEventListener('click', function () {
      clearGrid();
      state[4][4] = true;
      state[3][4] = true;
      state[5][4] = true;
      state[4][3] = true;
      state[4][5] = true;
      updateGrid();
    });
  }

  // Initialize with 3x4 rectangle loaded
  for (var r0 = 3; r0 < 6; r0++) for (var c0 = 3; c0 < 7; c0++) state[r0][c0] = true;
  updateGrid();

  // =========================================================================
  // Lab 2: Shear & Unfold Geometric Lab (Parallelogram, Triangle, Trapezoid)
  // =========================================================================
  var svgEl = document.getElementById('arp-shear-svg');
  var modeParaBtn = document.getElementById('arp-mode-para');
  var modeTriBtn = document.getElementById('arp-mode-tri');
  var modeTrapBtn = document.getElementById('arp-mode-trap');
  var actionCutBtn = document.getElementById('arp-action-cut');
  var actionTwinBtn = document.getElementById('arp-action-twin');
  var actionTwinTrapBtn = document.getElementById('arp-action-twin-trap');
  var actionAnimateBtn = document.getElementById('arp-action-animate');
  var sendShearBbBtn = document.getElementById('arp-send-shear-bb');

  var sliderB = document.getElementById('arp-slider-b');
  var sliderH = document.getElementById('arp-slider-h');
  var sliderS = document.getElementById('arp-slider-s');
  var sliderA = document.getElementById('arp-slider-a');
  var sliderProgress = document.getElementById('arp-slider-progress');

  var valB = document.getElementById('arp-val-b');
  var valH = document.getElementById('arp-val-h');
  var valS = document.getElementById('arp-val-s');
  var valA = document.getElementById('arp-val-a');
  var valProgress = document.getElementById('arp-val-progress');

  var sliderABox = document.getElementById('arp-slider-a-box');
  var sliderSBox = document.getElementById('arp-slider-s-box');

  var shBh = document.getElementById('arp-sh-bh');
  var shSlant = document.getElementById('arp-sh-slant');
  var shArea = document.getElementById('arp-sh-area');
  var shPerim = document.getElementById('arp-sh-perim');
  var shInsight = document.getElementById('arp-sh-insight');
  var slantWarnPerim = document.getElementById('arp-slant-warn-perim');

  var labMode = 'parallelogram'; // 'parallelogram' | 'triangle' | 'trapezoid'
  var isAnimatingProof = false;
  var animRafId = null;

  function renderShearLab() {
    if (!svgEl || !sliderB || !sliderH) return;
    var b = Number(sliderB.value);
    var h = Number(sliderH.value);
    var s = sliderS ? Number(sliderS.value) : 2;
    var a = sliderA ? Number(sliderA.value) : 4;
    var progress = sliderProgress ? Number(sliderProgress.value) / 100 : 0;

    if (valB) valB.textContent = b + ' units';
    if (valH) valH.textContent = h + ' units';
    if (valS) valS.textContent = s + ' units';
    if (valA) valA.textContent = a + ' units';
    if (valProgress) valProgress.textContent = Math.round(progress * 100) + '%';

    var scale = 32;
    var originX = 76;
    var baseY = 226;
    var topY = baseY - h * scale;

    var gridMarkup = '';
    for (var gx = 0; gx <= 600; gx += scale) {
      gridMarkup += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="270" stroke="rgba(148,163,184,0.18)" stroke-width="1" />';
    }
    for (var gy = baseY; gy >= 0; gy -= scale) {
      gridMarkup += '<line x1="0" y1="' + gy + '" x2="600" y2="' + gy + '" stroke="rgba(148,163,184,0.18)" stroke-width="1" />';
    }

    var shapeMarkup = '';

    if (labMode === 'parallelogram') {
      var x0 = originX;
      var x1 = originX + b * scale;
      var x3 = originX + s * scale;
      var x2 = x3 + b * scale;

      var slantC = Math.sqrt(h * h + s * s);
      var paraArea = b * h;
      var paraPerim = 2 * (b + slantC);

      if (shBh) shBh.textContent = 'b=' + b + ', h=' + h;
      if (shSlant) shSlant.textContent = slantC.toFixed(2) + ' units';
      if (shArea) shArea.textContent = paraArea + ' sq units';
      if (shPerim) shPerim.textContent = paraPerim.toFixed(1) + ' units';
      if (slantWarnPerim) slantWarnPerim.textContent = paraPerim.toFixed(1) + ' units';

      if (progress > 0 && s > 0) {
        var slideDx = -progress * b * scale;
        // Static body
        shapeMarkup += '<polygon points="' + x0 + ',' + baseY + ' ' + x1 + ',' + baseY + ' ' + x1 + ',' + topY + ' ' + x3 + ',' + topY + '" fill="rgba(13,148,136,0.34)" stroke="#0d9488" stroke-width="2.5" />';
        // Ghost original overhang on right
        shapeMarkup += '<polygon points="' + x1 + ',' + baseY + ' ' + x2 + ',' + topY + ' ' + x1 + ',' + topY + '" fill="none" stroke="rgba(148,163,184,0.6)" stroke-dasharray="4,4" stroke-width="2" />';
        // Moving overhang triangle
        var ox0 = x1 + slideDx, oy0 = baseY;
        var ox1 = x2 + slideDx, oy1 = topY;
        var ox2 = x1 + slideDx, oy2 = topY;
        shapeMarkup += '<polygon points="' + ox0 + ',' + oy0 + ' ' + ox1 + ',' + oy1 + ' ' + ox2 + ',' + oy2 + '" fill="rgba(234,88,12,0.48)" stroke="#ea580c" stroke-width="2.5" />';
        shapeMarkup += '<text x="' + (x0 + (x1 - x0) / 2) + '" y="' + (topY - 14) + '" text-anchor="middle" fill="#0f766e" font-size="12.5" font-weight="700">Slide Progress ' + Math.round(progress * 100) + '% &rarr; Forms ' + b + ' &times; ' + h + ' Rectangle (' + paraArea + ' sq units)</text>';
      } else {
        shapeMarkup += '<polygon points="' + x0 + ',' + baseY + ' ' + x1 + ',' + baseY + ' ' + x2 + ',' + topY + ' ' + x3 + ',' + topY + '" fill="rgba(13,148,136,0.34)" stroke="#0d9488" stroke-width="2.5" />';
        if (s > 0) {
          shapeMarkup += '<line x1="' + x1 + '" y1="' + baseY + '" x2="' + x1 + '" y2="' + topY + '" stroke="#ea580c" stroke-dasharray="4,4" stroke-width="2" />';
        }
      }

      // Perpendicular altitude line
      var hLineX = x3;
      shapeMarkup += '<line x1="' + hLineX + '" y1="' + baseY + '" x2="' + hLineX + '" y2="' + topY + '" stroke="#dc2626" stroke-dasharray="5,4" stroke-width="2.2" />';
      shapeMarkup += '<rect x="' + hLineX + '" y="' + (baseY - 10) + '" width="10" height="10" fill="none" stroke="#dc2626" stroke-width="1.8" />';
      shapeMarkup += '<text x="' + (hLineX + 8) + '" y="' + (baseY - (h * scale) / 2 + 4) + '" fill="#dc2626" font-size="13" font-weight="700">h = ' + h + '</text>';
      shapeMarkup += '<text x="' + (x0 + (x1 - x0) / 2) + '" y="' + (baseY + 22) + '" text-anchor="middle" fill="#0f766e" font-size="13" font-weight="700">Base b = ' + b + ' units</text>';
      shapeMarkup += '<text x="' + ((x1 + x2) / 2 + 14) + '" y="' + ((baseY + topY) / 2) + '" fill="#64748b" font-size="12" font-weight="700">c = ' + slantC.toFixed(2) + '</text>';

      if (shInsight) {
        shInsight.innerHTML = '<strong>Key Insight (Parallelogram):</strong> Shearing slides horizontal cross-sections without altering thickness. The slanted side <em>c = ' + slantC.toFixed(2) + '</em> increases perimeter to ' + paraPerim.toFixed(1) + ', but sliding the right wedge proves the interior exactly equals a ' + b + ' &times; ' + h + ' rectangle of Area = ' + paraArea + ' sq units!';
      }
    } else if (labMode === 'triangle') {
      var tx0 = originX;
      var tx1 = originX + b * scale;
      var tx3 = originX + s * scale;

      var sideLeft = Math.sqrt(h * h + s * s);
      var sideRight = Math.sqrt(h * h + (b - s) * (b - s));
      var triArea = 0.5 * b * h;
      var triPerim = b + sideLeft + sideRight;

      if (shBh) shBh.textContent = 'b=' + b + ', h=' + h;
      if (shSlant) shSlant.textContent = sideLeft.toFixed(2) + ' & ' + sideRight.toFixed(2);
      if (shArea) shArea.textContent = triArea + ' sq units';
      if (shPerim) shPerim.textContent = triPerim.toFixed(1) + ' units';
      if (slantWarnPerim) slantWarnPerim.textContent = triPerim.toFixed(1) + ' units';

      // Primary triangle
      shapeMarkup += '<polygon points="' + tx0 + ',' + baseY + ' ' + tx1 + ',' + baseY + ' ' + tx3 + ',' + topY + '" fill="rgba(14,165,233,0.36)" stroke="#0284c7" stroke-width="2.5" />';

      if (progress > 0) {
        var midX = (tx1 + tx3) / 2;
        var midY = (baseY + topY) / 2;
        var rotDeg = 180 * progress;
        shapeMarkup += '<g transform="rotate(' + rotDeg + ' ' + midX + ' ' + midY + ')">';
        shapeMarkup += '<polygon points="' + tx0 + ',' + baseY + ' ' + tx1 + ',' + baseY + ' ' + tx3 + ',' + topY + '" fill="rgba(234,88,12,0.35)" stroke="#ea580c" stroke-dasharray="5,4" stroke-width="2.2" />';
        shapeMarkup += '</g>';
        shapeMarkup += '<text x="' + midX + '" y="' + (topY - 14) + '" text-anchor="middle" fill="#0369a1" font-size="12.5" font-weight="700">Twin Rotation ' + Math.round(progress * 100) + '% &rarr; 2 Twins = ' + b + ' &times; ' + h + ' Parallelogram &rarr; 1 Triangle = ' + triArea + ' sq units</text>';
      }

      // Perpendicular altitude line
      shapeMarkup += '<line x1="' + tx3 + '" y1="' + baseY + '" x2="' + tx3 + '" y2="' + topY + '" stroke="#dc2626" stroke-dasharray="5,4" stroke-width="2.2" />';
      shapeMarkup += '<rect x="' + tx3 + '" y="' + (baseY - 10) + '" width="10" height="10" fill="none" stroke="#dc2626" stroke-width="1.8" />';
      shapeMarkup += '<text x="' + (tx3 + 8) + '" y="' + (baseY - (h * scale) / 2 + 4) + '" fill="#dc2626" font-size="13" font-weight="700">h = ' + h + '</text>';
      shapeMarkup += '<text x="' + (tx0 + (tx1 - tx0) / 2) + '" y="' + (baseY + 22) + '" text-anchor="middle" fill="#0369a1" font-size="13" font-weight="700">Base b = ' + b + ' units</text>';

      if (shInsight) {
        shInsight.innerHTML = '<strong>Key Insight (Triangle):</strong> Rotating an identical twin triangle 180&deg; creates a full parallelogram of base ' + b + ' and height ' + h + ' (Area = ' + (b * h) + '). Therefore, a single triangle is always exactly half: &frac12; &times; ' + b + ' &times; ' + h + ' = ' + triArea + ' sq units!';
      }
    } else if (labMode === 'trapezoid') {
      var zx0 = originX;
      var zx1 = originX + b * scale;
      var zx2 = originX + a * scale;
      var zx3 = originX;

      var trapArea = 0.5 * (a + b) * h;
      var trapSlant = Math.sqrt(h * h + Math.pow(b - a, 2));
      var trapPerim = a + b + h + trapSlant;

      if (shBh) shBh.textContent = 'a=' + a + ', b=' + b + ', h=' + h;
      if (shSlant) shSlant.textContent = trapSlant.toFixed(2) + ' units';
      if (shArea) shArea.textContent = trapArea + ' sq units';
      if (shPerim) shPerim.textContent = trapPerim.toFixed(1) + ' units';
      if (slantWarnPerim) slantWarnPerim.textContent = trapPerim.toFixed(1) + ' units';

      // Primary trapezoid
      shapeMarkup += '<polygon points="' + zx0 + ',' + baseY + ' ' + zx1 + ',' + baseY + ' ' + zx2 + ',' + topY + ' ' + zx3 + ',' + topY + '" fill="rgba(168,85,247,0.32)" stroke="#9333ea" stroke-width="2.5" />';

      if (progress > 0) {
        var tMidX = (zx1 + zx2) / 2;
        var tMidY = (baseY + topY) / 2;
        var tRotDeg = 180 * progress;
        shapeMarkup += '<g transform="rotate(' + tRotDeg + ' ' + tMidX + ' ' + tMidY + ')">';
        shapeMarkup += '<polygon points="' + zx0 + ',' + baseY + ' ' + zx1 + ',' + baseY + ' ' + zx2 + ',' + topY + ' ' + zx3 + ',' + topY + '" fill="rgba(234,88,12,0.35)" stroke="#ea580c" stroke-dasharray="5,4" stroke-width="2.2" />';
        shapeMarkup += '</g>';
        shapeMarkup += '<text x="' + (zx0 + (zx1 - zx0) / 2) + '" y="' + (topY - 14) + '" text-anchor="middle" fill="#7e22ce" font-size="12.5" font-weight="700">2 Twins = Parallelogram of Base (' + a + '+' + b + ') = ' + (a + b) + ' &times; ' + h + ' = ' + ((a + b) * h) + ' &rarr; 1 Trapezoid = ' + trapArea + ' sq units</text>';
      }

      // Perpendicular altitude line
      shapeMarkup += '<line x1="' + zx0 + '" y1="' + baseY + '" x2="' + zx0 + '" y2="' + topY + '" stroke="#dc2626" stroke-dasharray="5,4" stroke-width="2.2" />';
      shapeMarkup += '<rect x="' + zx0 + '" y="' + (baseY - 10) + '" width="10" height="10" fill="none" stroke="#dc2626" stroke-width="1.8" />';
      shapeMarkup += '<text x="' + (zx0 + 8) + '" y="' + (baseY - (h * scale) / 2 + 4) + '" fill="#dc2626" font-size="13" font-weight="700">h = ' + h + '</text>';
      shapeMarkup += '<text x="' + (zx0 + (zx1 - zx0) / 2) + '" y="' + (baseY + 22) + '" text-anchor="middle" fill="#7e22ce" font-size="13" font-weight="700">Bottom Base b = ' + b + '</text>';
      shapeMarkup += '<text x="' + (zx3 + (zx2 - zx3) / 2) + '" y="' + (topY - 6) + '" text-anchor="middle" fill="#7e22ce" font-size="12" font-weight="700">Top Base a = ' + a + '</text>';

      if (shInsight) {
        shInsight.innerHTML = '<strong>Key Insight (Trapezoid):</strong> Inverting an identical twin trapezoid alongside the diagonal forms a parallelogram with combined base <em>(a + b) = ' + (a + b) + '</em> and height <em>h = ' + h + '</em>. One trapezoid is exactly half: <em>&frac12; &times; (a + b) &times; h = &frac12; &times; ' + (a + b) + ' &times; ' + h + ' = ' + trapArea + ' sq units</em>!';
      }
    }

    svgEl.innerHTML = gridMarkup + shapeMarkup;
  }

  if (modeParaBtn) {
    modeParaBtn.addEventListener('click', function () {
      labMode = 'parallelogram';
      modeParaBtn.classList.add('active');
      if (modeTriBtn) modeTriBtn.classList.remove('active');
      if (modeTrapBtn) modeTrapBtn.classList.remove('active');
      if (sliderABox) sliderABox.style.display = 'none';
      if (sliderSBox) sliderSBox.style.display = '';
      if (actionCutBtn) actionCutBtn.style.display = '';
      if (actionTwinBtn) actionTwinBtn.style.display = 'none';
      if (actionTwinTrapBtn) actionTwinTrapBtn.style.display = 'none';
      renderShearLab();
    });
  }

  if (modeTriBtn) {
    modeTriBtn.addEventListener('click', function () {
      labMode = 'triangle';
      modeTriBtn.classList.add('active');
      if (modeParaBtn) modeParaBtn.classList.remove('active');
      if (modeTrapBtn) modeTrapBtn.classList.remove('active');
      if (sliderABox) sliderABox.style.display = 'none';
      if (sliderSBox) sliderSBox.style.display = '';
      if (actionCutBtn) actionCutBtn.style.display = 'none';
      if (actionTwinBtn) actionTwinBtn.style.display = '';
      if (actionTwinTrapBtn) actionTwinTrapBtn.style.display = 'none';
      renderShearLab();
    });
  }

  if (modeTrapBtn) {
    modeTrapBtn.addEventListener('click', function () {
      labMode = 'trapezoid';
      modeTrapBtn.classList.add('active');
      if (modeParaBtn) modeParaBtn.classList.remove('active');
      if (modeTriBtn) modeTriBtn.classList.remove('active');
      if (sliderABox) sliderABox.style.display = '';
      if (sliderSBox) sliderSBox.style.display = 'none';
      if (actionCutBtn) actionCutBtn.style.display = 'none';
      if (actionTwinBtn) actionTwinBtn.style.display = 'none';
      if (actionTwinTrapBtn) actionTwinTrapBtn.style.display = '';
      renderShearLab();
    });
  }

  if (actionCutBtn) {
    actionCutBtn.addEventListener('click', function () {
      var cur = Number(sliderProgress.value);
      sliderProgress.value = cur > 50 ? 0 : 100;
      actionCutBtn.classList.toggle('active', Number(sliderProgress.value) === 100);
      renderShearLab();
    });
  }

  if (actionTwinBtn) {
    actionTwinBtn.addEventListener('click', function () {
      var cur = Number(sliderProgress.value);
      sliderProgress.value = cur > 50 ? 0 : 100;
      actionTwinBtn.classList.toggle('active', Number(sliderProgress.value) === 100);
      renderShearLab();
    });
  }

  if (actionTwinTrapBtn) {
    actionTwinTrapBtn.addEventListener('click', function () {
      var cur = Number(sliderProgress.value);
      sliderProgress.value = cur > 50 ? 0 : 100;
      actionTwinTrapBtn.classList.toggle('active', Number(sliderProgress.value) === 100);
      renderShearLab();
    });
  }

  if (actionAnimateBtn) {
    actionAnimateBtn.addEventListener('click', function () {
      if (isAnimatingProof) {
        cancelAnimationFrame(animRafId);
        isAnimatingProof = false;
        actionAnimateBtn.textContent = '▶ Animate Proof';
        return;
      }
      isAnimatingProof = true;
      actionAnimateBtn.textContent = '⏸ Pause Proof';
      var startVal = Number(sliderProgress.value);
      var targetVal = startVal >= 95 ? 0 : 100;
      var startTime = null;
      var duration = 1400;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var t = Math.min(1, elapsed / duration);
        var eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        sliderProgress.value = Math.round(startVal + (targetVal - startVal) * eased);
        renderShearLab();
        if (t < 1 && isAnimatingProof) {
          animRafId = requestAnimationFrame(step);
        } else {
          isAnimatingProof = false;
          actionAnimateBtn.textContent = '▶ Animate Proof';
        }
      }
      animRafId = requestAnimationFrame(step);
    });
  }

  if (sendShearBbBtn) {
    sendShearBbBtn.addEventListener('click', function () {
      var b = Number(sliderB.value);
      var h = Number(sliderH.value);
      var s = sliderS ? Number(sliderS.value) : 2;
      var a = sliderA ? Number(sliderA.value) : 4;
      if (labMode === 'parallelogram') {
        loadPresetToBlackboard('para', { b: b, h: h, s: s });
      } else if (labMode === 'triangle') {
        loadPresetToBlackboard('tri', { b: b, h: h });
      } else {
        loadPresetToBlackboard('trap', { a: a, b: b, h: h });
      }
      var bbSection = document.getElementById('arp-lab3-blackboard');
      if (bbSection) bbSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  [sliderB, sliderH, sliderS, sliderA, sliderProgress].forEach(function (input) {
    if (input) input.addEventListener('input', renderShearLab);
  });
  renderShearLab();

  // =========================================================================
  // Lab 3: AI Smart Blackboard Studio Engine
  // =========================================================================
  var bbCanvas = document.getElementById('arp-blackboard-canvas');
  var bbCtx = bbCanvas ? bbCanvas.getContext('2d') : null;
  var bbBannerText = document.getElementById('arp-bb-banner-text');
  var bbShapeName = document.getElementById('arp-bb-shape-name');
  var bbFormula = document.getElementById('arp-bb-formula');
  var bbAreaVal = document.getElementById('arp-bb-area-val');
  var bbPerimVal = document.getElementById('arp-bb-perim-val');
  var bbProofText = document.getElementById('arp-bb-proof-text');
  var bbVoiceBtn = document.getElementById('arp-bb-voice');
  var bbCopyBtn = document.getElementById('arp-bb-copy');
  var bbPopDockBtn = document.getElementById('arp-bb-popdock');

  var bbCurrentTool = 'pen'; // 'pen' | 'counter' | 'eraser'
  var bbStrokes = [];
  var bbCurrentStroke = [];
  var bbCounters = [];
  var bbActiveFigure = null;
  var bbDraggingHandle = null;
  var isBbDrawing = false;
  var isBbSpeaking = false;

  function resizeBbCanvas() {
    if (!bbCanvas || !bbCtx) return;
    var rect = bbCanvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    bbCanvas.width = Math.round(rect.width * dpr);
    bbCanvas.height = Math.round(rect.height * dpr);
    bbCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawBlackboard();
  }

  function redrawBlackboard() {
    if (!bbCanvas || !bbCtx) return;
    var w = bbCanvas.width / (window.devicePixelRatio || 1);
    var h = bbCanvas.height / (window.devicePixelRatio || 1);

    // Dark chalkboard background
    bbCtx.fillStyle = '#090e17';
    bbCtx.fillRect(0, 0, w, h);

    // Subtle coordinate chalk grid
    bbCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    bbCtx.lineWidth = 1;
    var gridSpacing = 28;
    for (var gx = gridSpacing; gx < w; gx += gridSpacing) {
      bbCtx.beginPath(); bbCtx.moveTo(gx, 0); bbCtx.lineTo(gx, h); bbCtx.stroke();
    }
    for (var gy = gridSpacing; gy < h; gy += gridSpacing) {
      bbCtx.beginPath(); bbCtx.moveTo(0, gy); bbCtx.lineTo(w, gy); bbCtx.stroke();
    }

    // Active figure rendering
    if (bbActiveFigure) {
      renderFigureOnBlackboard(bbCtx, bbActiveFigure);
    }

    // Historical freehand strokes
    bbStrokes.forEach(function (s) {
      bbCtx.strokeStyle = s.color || '#f8fafc';
      bbCtx.lineWidth = s.width || 3;
      bbCtx.lineCap = 'round';
      bbCtx.lineJoin = 'round';
      bbCtx.beginPath();
      s.pts.forEach(function (pt, idx) {
        if (idx === 0) bbCtx.moveTo(pt.x, pt.y);
        else bbCtx.lineTo(pt.x, pt.y);
      });
      bbCtx.stroke();
    });

    // Current in-progress stroke
    if (bbCurrentStroke.length > 1) {
      bbCtx.strokeStyle = '#38bdf8';
      bbCtx.lineWidth = 3;
      bbCtx.lineCap = 'round';
      bbCtx.beginPath();
      bbCurrentStroke.forEach(function (pt, idx) {
        if (idx === 0) bbCtx.moveTo(pt.x, pt.y);
        else bbCtx.lineTo(pt.x, pt.y);
      });
      bbCtx.stroke();
    }

    // Counters / Area Tiles
    bbCounters.forEach(function (c, idx) {
      bbCtx.fillStyle = '#38bdf8';
      bbCtx.beginPath();
      bbCtx.arc(c.x, c.y, 14, 0, Math.PI * 2);
      bbCtx.fill();
      bbCtx.strokeStyle = '#fff';
      bbCtx.lineWidth = 1.5;
      bbCtx.stroke();
      bbCtx.fillStyle = '#0f172a';
      bbCtx.font = 'bold 11px system-ui, sans-serif';
      bbCtx.textAlign = 'center';
      bbCtx.textBaseline = 'middle';
      bbCtx.fillText(String(idx + 1), c.x, c.y);
    });
  }

  function renderFigureOnBlackboard(ctx, fig) {
    var scale = 28;
    if (fig.type === 'rect') {
      var rx = fig.x, ry = fig.y, rw = fig.w, rh = fig.h;
      var l = Math.max(1, Math.round((rw / scale) * 10) / 10);
      var wid = Math.max(1, Math.round((rh / scale) * 10) / 10);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.fillRect(rx, ry, rw, rh);

      // Grid partitions
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 1;
      for (var xg = rx + scale; xg < rx + rw - 2; xg += scale) {
        ctx.beginPath(); ctx.moveTo(xg, ry); ctx.lineTo(xg, ry + rh); ctx.stroke();
      }
      for (var yg = ry + scale; yg < ry + rh - 2; yg += scale) {
        ctx.beginPath(); ctx.moveTo(rx, yg); ctx.lineTo(rx + rw, yg); ctx.stroke();
      }

      // Bold exterior perimeter
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.2;
      ctx.strokeRect(rx, ry, rw, rh);

      // Labels
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('ℓ = ' + l, rx + rw / 2, ry - 6);
      ctx.fillText('ℓ = ' + l, rx + rw / 2, ry + rh + 15);
      ctx.textAlign = 'right';
      ctx.fillText('w = ' + wid, rx - 8, ry + rh / 2);
      ctx.textAlign = 'left';
      ctx.fillText('w = ' + wid, rx + rw + 8, ry + rh / 2);

      // Center area & perimeter badge
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui';
      ctx.fillText('Area = ' + (l * wid).toFixed(1) + ' sq units', rx + rw / 2, ry + rh / 2 - 8);
      ctx.font = '11.5px system-ui';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('P = 2(' + l + '+' + wid + ') = ' + (2 * (l + wid)).toFixed(1), rx + rw / 2, ry + rh / 2 + 10);

      // Draggable corner handle
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(rx + rw, ry + rh, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    } else if (fig.type === 'para') {
      var px0 = fig.x, py0 = fig.y;
      var pb = fig.b, ph = fig.h, ps = fig.s;
      var pbU = Math.max(1, Math.round((pb / scale) * 10) / 10);
      var phU = Math.max(1, Math.round((ph / scale) * 10) / 10);
      var psU = Math.round((ps / scale) * 10) / 10;
      var pSlant = Math.sqrt(phU * phU + psU * psU).toFixed(2);

      var px1 = px0 + pb, py1 = py0;
      var px2 = px0 + pb + ps, py2 = py0 - ph;
      var px3 = px0 + ps, py3 = py0 - ph;

      ctx.fillStyle = 'rgba(13, 148, 136, 0.2)';
      ctx.beginPath();
      ctx.moveTo(px0, py0); ctx.lineTo(px1, py1); ctx.lineTo(px2, py2); ctx.lineTo(px3, py3);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 3.2;
      ctx.stroke();

      // Altitude line
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px3, py0); ctx.lineTo(px3, py3); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeRect(px3, py0 - 8, 8, 8);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(' h = ' + phU + ' (altitude)', px3 + 10, py0 - ph / 2);

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Base b = ' + pbU, px0 + pb / 2, py0 + 16);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText('c = ' + pSlant, (px1 + px2) / 2 + 14, (py1 + py2) / 2);

      // Overhang cut line
      ctx.strokeStyle = '#ea580c';
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(px1, py0); ctx.lineTo(px1, py2); ctx.stroke();
      ctx.setLineDash([]);

      // Draggable handle at top right
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(px2, py2, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    } else if (fig.type === 'tri') {
      var tx0 = fig.x, ty0 = fig.y;
      var tb = fig.b, th = fig.h;
      var tbU = Math.max(1, Math.round((tb / scale) * 10) / 10);
      var thU = Math.max(1, Math.round((th / scale) * 10) / 10);
      var tx1 = tx0 + tb, ty1 = ty0;
      var tx3 = tx0 + tb * 0.45, ty3 = ty0 - th;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
      ctx.beginPath();
      ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.lineTo(tx3, ty3);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3.2;
      ctx.stroke();

      // Altitude line
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(tx3, ty0); ctx.lineTo(tx3, ty3); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeRect(tx3, ty0 - 8, 8, 8);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(' h = ' + thU, tx3 + 10, ty0 - th / 2);

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Base b = ' + tbU, tx0 + tb / 2, ty0 + 16);

      // Handle at apex
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(tx3, ty3, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    } else if (fig.type === 'lshape') {
      var lx = fig.x, ly = fig.y;
      var u = scale;
      // Part 1: 4 wide x 2 high rectangle
      ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
      ctx.fillRect(lx, ly, 4 * u, 2 * u);
      // Part 2: 2 wide x 3 high rectangle
      ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
      ctx.fillRect(lx, ly + 2 * u, 2 * u, 3 * u);

      // Inner cut seam (dashed)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(lx, ly + 2 * u); ctx.lineTo(lx + 2 * u, ly + 2 * u); ctx.stroke();
      ctx.setLineDash([]);

      // Outer boundary
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 4 * u, ly);
      ctx.lineTo(lx + 4 * u, ly + 2 * u);
      ctx.lineTo(lx + 2 * u, ly + 2 * u);
      ctx.lineTo(lx + 2 * u, ly + 5 * u);
      ctx.lineTo(lx, ly + 5 * u);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('A₁ = 4×2 = 8', lx + 2 * u, ly + u);
      ctx.fillText('A₂ = 2×3 = 6', lx + u, ly + 3.5 * u);
      ctx.fillStyle = '#facc15';
      ctx.fillText('Total Area = 8 + 6 = 14 sq units', lx + 2.5 * u, ly + 5 * u + 20);
    } else if (fig.type === 'samep') {
      var uCell = 20;
      var sy = fig.y;
      // 4x4 Square
      var sqx = fig.x;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('Compact: 4×4 Square', sqx, sy - 10);
      ctx.fillStyle = 'rgba(234, 88, 12, 0.4)';
      ctx.fillRect(sqx, sy, 4 * uCell, 4 * uCell);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.2;
      ctx.strokeRect(sqx, sy, 4 * uCell, 4 * uCell);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 11.5px system-ui';
      ctx.fillText('P = 16 units · Area = 16 sq units', sqx, sy + 4 * uCell + 18);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10.5px system-ui';
      ctx.fillText('24 shared inner seams (fuses area inside)', sqx, sy + 4 * uCell + 34);

      // 1x7 Strip
      var stx = sqx + 4 * uCell + 40;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui';
      ctx.fillText('Stretched: 1×7 Strip', stx, sy - 10);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.4)';
      ctx.fillRect(stx, sy + 1.5 * uCell, 7 * uCell, uCell);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.2;
      ctx.strokeRect(stx, sy + 1.5 * uCell, 7 * uCell, uCell);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 11.5px system-ui';
      ctx.fillText('P = 16 units · Area = 7 sq units', stx, sy + 4 * uCell + 18);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10.5px system-ui';
      ctx.fillText('Only 6 shared seams (wastes fence outside)', stx, sy + 4 * uCell + 34);
    } else if (fig.type === 'poly') {
      var pCells = fig.cells || [];
      var pScale = 22;
      var ox = fig.x, oy = fig.y;
      var cMap = {};
      pCells.forEach(function (c) { cMap[c[0] + ',' + c[1]] = true; });

      pCells.forEach(function (c) {
        var r = c[0], col = c[1];
        var px = ox + col * pScale, py = oy + r * pScale;
        ctx.fillStyle = 'rgba(234, 88, 12, 0.72)';
        ctx.fillRect(px, py, pScale, pScale);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, pScale, pScale);

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3.2;
        if (!cMap[(r - 1) + ',' + col]) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + pScale, py); ctx.stroke(); }
        if (!cMap[(r + 1) + ',' + col]) { ctx.beginPath(); ctx.moveTo(px, py + pScale); ctx.lineTo(px + pScale, py + pScale); ctx.stroke(); }
        if (!cMap[r + ',' + (col - 1)]) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + pScale); ctx.stroke(); }
        if (!cMap[r + ',' + (col + 1)]) { ctx.beginPath(); ctx.moveTo(px + pScale, py); ctx.lineTo(px + pScale, py + pScale); ctx.stroke(); }
      });
    }
  }

  function updateBlackboardReport(fig) {
    if (!fig) return;
    var scale = 28;
    if (fig.type === 'rect') {
      var l = Math.max(1, Math.round((fig.w / scale) * 10) / 10);
      var w = Math.max(1, Math.round((fig.h / scale) * 10) / 10);
      var area = (l * w).toFixed(1);
      var perim = (2 * (l + w)).toFixed(1);
      if (bbShapeName) bbShapeName.textContent = 'Rectangle (' + l + ' \u00d7 ' + w + ')';
      if (bbFormula) bbFormula.textContent = 'A = \u2113 \u00d7 w \u00b7 P = 2(\u2113 + w)';
      if (bbAreaVal) bbAreaVal.textContent = area + ' sq units';
      if (bbPerimVal) bbPerimVal.textContent = perim + ' units';
      if (bbProofText) {
        bbProofText.innerHTML =
          '1. <strong>Classification:</strong> Orthogonal polygon with 4 right angles and pairwise congruent parallel sides.<br/>' +
          '2. <strong>Area Calculation:</strong> Length &ell; = ' + l + ' units, Width w = ' + w + ' units &rarr; Area = ' + l + ' &times; ' + w + ' = ' + area + ' square units.<br/>' +
          '3. <strong>Perimeter Calculation:</strong> Perimeter = 2 &times; (' + l + ' + ' + w + ') = ' + perim + ' linear boundary units.<br/>' +
          '4. <strong>Accuracy Confirmation:</strong> Enclosed interior squares count toward area; outer fence segments define perimeter without counting inner grid lines.';
      }
      if (bbBannerText) bbBannerText.textContent = '✨ Verified Rectangle: ' + l + ' \u00d7 ' + w + ' &rarr; Area = ' + area + ' sq units, Perimeter = ' + perim + ' units';
    } else if (fig.type === 'para') {
      var b = Math.max(1, Math.round((fig.b / scale) * 10) / 10);
      var h = Math.max(1, Math.round((fig.h / scale) * 10) / 10);
      var s = Math.round((fig.s / scale) * 10) / 10;
      var slantC = Math.sqrt(h * h + s * s).toFixed(2);
      var pArea = (b * h).toFixed(1);
      var pPerim = (2 * (b + Number(slantC))).toFixed(1);
      if (bbShapeName) bbShapeName.textContent = 'Parallelogram (b=' + b + ', h=' + h + ')';
      if (bbFormula) bbFormula.textContent = 'A = b \u00d7 h \u00b7 P = 2(b + c)';
      if (bbAreaVal) bbAreaVal.textContent = pArea + ' sq units';
      if (bbPerimVal) bbPerimVal.textContent = pPerim + ' units';
      if (bbProofText) {
        bbProofText.innerHTML =
          '1. <strong>Shear Invariance:</strong> Horizontal parallel strips slide sideways with zero change in altitude or layer area.<br/>' +
          '2. <strong>Area Calculation:</strong> Base b = ' + b + ', Perpendicular Height h = ' + h + ' &rarr; Area = ' + b + ' &times; ' + h + ' = ' + pArea + ' sq units.<br/>' +
          '3. <strong>Slant Side Warning:</strong> Slanted side c = &radic;(' + h + '&sup2; + ' + s + '&sup2;) = ' + slantC + ' units. Used exclusively for Perimeter (' + pPerim + ' units). Never use slant c for area!<br/>' +
          '4. <strong>Geometric Proof:</strong> Detaching the right overhang triangle and sliding it left proves equivalence to a ' + b + ' &times; ' + h + ' rectangle.';
      }
      if (bbBannerText) bbBannerText.textContent = '✨ Verified Parallelogram: b = ' + b + ', h = ' + h + ' &rarr; Area = ' + pArea + ' sq units (Slanted c = ' + slantC + ')';
    } else if (fig.type === 'tri') {
      var tb = Math.max(1, Math.round((fig.b / scale) * 10) / 10);
      var th = Math.max(1, Math.round((fig.h / scale) * 10) / 10);
      var tArea = (0.5 * tb * th).toFixed(1);
      if (bbShapeName) bbShapeName.textContent = 'Triangle (b=' + tb + ', h=' + th + ')';
      if (bbFormula) bbFormula.textContent = 'A = \u00bd \u00d7 b \u00d7 h';
      if (bbAreaVal) bbAreaVal.textContent = tArea + ' sq units';
      if (bbPerimVal) bbPerimVal.textContent = 'Variable';
      if (bbProofText) {
        bbProofText.innerHTML =
          '1. <strong>Congruent Twin Construction:</strong> An identical twin triangle rotated 180&deg; forms a parallelogram of base b = ' + tb + ' and perpendicular height h = ' + th + '.<br/>' +
          '2. <strong>Double Area:</strong> Parallelogram Area = b &times; h = ' + (tb * th).toFixed(1) + ' sq units.<br/>' +
          '3. <strong>Triangle Area Derivation:</strong> One single triangle has exactly half the twin parallelogram\'s area: &frac12; &times; ' + tb + ' &times; ' + th + ' = ' + tArea + ' sq units.';
      }
      if (bbBannerText) bbBannerText.textContent = '✨ Verified Triangle: b = ' + tb + ', h = ' + th + ' &rarr; Area = \u00bd \u00d7 ' + tb + ' \u00d7 ' + th + ' = ' + tArea + ' sq units';
    } else if (fig.type === 'lshape') {
      if (bbShapeName) bbShapeName.textContent = 'Composite L-Shape';
      if (bbFormula) bbFormula.textContent = 'A = A\u2081 + A\u2082 \u00b7 Decomposed Rectangles';
      if (bbAreaVal) bbAreaVal.textContent = '14.0 sq units';
      if (bbPerimVal) bbPerimVal.textContent = '18.0 units';
      if (bbProofText) {
        bbProofText.innerHTML =
          '1. <strong>Composite Decomposition:</strong> Split the irregular L-shape into two non-overlapping rectangles: Top R1 (4 &times; 2) and Bottom R2 (2 &times; 3).<br/>' +
          '2. <strong>Area Sum:</strong> Area = Area(R1) + Area(R2) = (4 &times; 2) + (2 &times; 3) = 8 + 6 = 14 sq units.<br/>' +
          '3. <strong>Perimeter Sum:</strong> Outer fence segments = 4 + 2 + 2 + 3 + 2 + 5 = 18 units. Notice the dashed seam (2 units) is internal and excluded from perimeter!';
      }
    } else if (fig.type === 'samep') {
      if (bbShapeName) bbShapeName.textContent = 'Isoperimetric Comparison';
      if (bbFormula) bbFormula.textContent = 'Fixed Perimeter P = 16 units';
      if (bbAreaVal) bbAreaVal.textContent = '16 vs 7 sq units';
      if (bbPerimVal) bbPerimVal.textContent = 'Both P = 16 units';
      if (bbProofText) {
        bbProofText.innerHTML =
          '1. <strong>Fixed Perimeter:</strong> Both the 4&times;4 square and 1&times;7 strip use exactly 16 units of boundary fence.<br/>' +
          '2. <strong>Internal Sharing:</strong> The compact square shares 24 internal unit edges, locking 16 square units within the perimeter.<br/>' +
          '3. <strong>Boundary Exposure:</strong> The elongated strip shares only 6 internal seams, exposing 16 fence segments to enclose only 7 square units.<br/>' +
          '4. <strong>Theorem:</strong> Compactness maximizes area for any constant perimeter!';
      }
    } else if (fig.type === 'poly') {
      var cells = fig.cells || [];
      var count = cells.length;
      var cSet = {};
      cells.forEach(function (c) { cSet[c[0] + ',' + c[1]] = true; });
      var perim = 0;
      var sharedHalf = 0;
      cells.forEach(function (c) {
        var r = c[0], col = c[1];
        if (!cSet[(r - 1) + ',' + col]) perim++; else sharedHalf++;
        if (!cSet[(r + 1) + ',' + col]) perim++; else sharedHalf++;
        if (!cSet[r + ',' + (col - 1)]) perim++; else sharedHalf++;
        if (!cSet[r + ',' + (col + 1)]) perim++; else sharedHalf++;
      });
      var sharedPairs = sharedHalf / 2;
      var comp = perim > 0 ? (16 * count / (perim * perim)).toFixed(2) : 0;
      if (bbShapeName) bbShapeName.textContent = 'Polyomino (' + count + ' squares)';
      if (bbFormula) bbFormula.textContent = 'A = \u2211 squares \u00b7 P = outer boundary edges';
      if (bbAreaVal) bbAreaVal.textContent = count + ' sq units';
      if (bbPerimVal) bbPerimVal.textContent = perim + ' units';
      if (bbProofText) {
        bbProofText.innerHTML =
          '1. <strong>Unit Count:</strong> ' + count + ' painted squares each contribute exactly 1 unit&sup2; of area &rarr; Area = ' + count + ' sq units.<br/>' +
          '2. <strong>Boundary Analysis:</strong> The outer fence has ' + perim + ' exposed unit edges. The ' + sharedPairs + ' internal shared edges are fused inside and do not add to perimeter.<br/>' +
          '3. <strong>Compactness Ratio:</strong> 16A/P&sup2; = ' + comp + ' (1.00 is a square, lower values represent elongated shapes).';
      }
    }
  }

  function loadPresetToBlackboard(presetKey, opts) {
    opts = opts || {};
    var scale = 28;
    if (presetKey === 'rect') {
      var lw = opts.l || 6;
      var wh = opts.w || 4;
      bbActiveFigure = {
        type: 'rect',
        x: 80,
        y: 70,
        w: lw * scale,
        h: wh * scale
      };
    } else if (presetKey === 'para') {
      var pb = opts.b || 7;
      var ph = opts.h || 4;
      var ps = typeof opts.s === 'number' ? opts.s : 2;
      bbActiveFigure = {
        type: 'para',
        x: 80,
        y: 200,
        b: pb * scale,
        h: ph * scale,
        s: ps * scale
      };
    } else if (presetKey === 'tri') {
      var tb = opts.b || 8;
      var th = opts.h || 5;
      bbActiveFigure = {
        type: 'tri',
        x: 80,
        y: 210,
        b: tb * scale,
        h: th * scale
      };
    } else if (presetKey === 'lshape') {
      bbActiveFigure = {
        type: 'lshape',
        x: 90,
        y: 55
      };
    } else if (presetKey === 'trap') {
      var ta = opts.a || 4;
      var tb2 = opts.b || 8;
      var th2 = opts.h || 4;
      bbActiveFigure = {
        type: 'para',
        x: 80,
        y: 200,
        b: (ta + tb2) * scale * 0.5,
        h: th2 * scale,
        s: 2 * scale
      };
    } else if (presetKey === 'samep') {
      bbActiveFigure = {
        type: 'samep',
        x: 60,
        y: 75
      };
    } else if (presetKey === 'poly') {
      bbActiveFigure = {
        type: 'poly',
        cells: opts.cells || [],
        x: 60,
        y: 40
      };
    }

    updateBlackboardReport(bbActiveFigure);
    redrawBlackboard();

    // Also sync to floating dock if dock is already open
    if (window.SmartBlackboardDock && typeof window.SmartBlackboardDock.isOpen === 'function' && window.SmartBlackboardDock.isOpen()) {
      if (presetKey === 'rect') window.SmartBlackboardDock.loadRectangle(opts.l || 6, opts.w || 4);
      else if (presetKey === 'para') window.SmartBlackboardDock.loadParallelogram(opts.b || 7, opts.h || 4, opts.s || 2);
      else if (presetKey === 'tri') window.SmartBlackboardDock.loadTriangle(opts.b || 8, opts.h || 5);
      else if (presetKey === 'samep') window.SmartBlackboardDock.loadSameP16();
      else if (presetKey === 'poly') window.SmartBlackboardDock.loadPolyomino(opts.cells);
    }
  }

  // Blackboard Interaction
  if (bbCanvas) {
    function getBbPos(e) {
      var rect = bbCanvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    bbCanvas.addEventListener('pointerdown', function (e) {
      var p = getBbPos(e);
      if (bbActiveFigure && bbActiveFigure.type === 'rect') {
        var rx = bbActiveFigure.x + bbActiveFigure.w;
        var ry = bbActiveFigure.y + bbActiveFigure.h;
        if (Math.hypot(rx - p.x, ry - p.y) < 24) {
          bbDraggingHandle = { target: 'rect_br', startW: bbActiveFigure.w, startH: bbActiveFigure.h, startX: p.x, startY: p.y };
          try { bbCanvas.setPointerCapture(e.pointerId); } catch (_) {}
          return;
        }
      }
      if (bbActiveFigure && bbActiveFigure.type === 'para') {
        var px = bbActiveFigure.x + bbActiveFigure.b + bbActiveFigure.s;
        var py = bbActiveFigure.y - bbActiveFigure.h;
        if (Math.hypot(px - p.x, py - p.y) < 24) {
          bbDraggingHandle = { target: 'para_tr', startH: bbActiveFigure.h, startS: bbActiveFigure.s, startX: p.x, startY: p.y };
          try { bbCanvas.setPointerCapture(e.pointerId); } catch (_) {}
          return;
        }
      }
      if (bbActiveFigure && bbActiveFigure.type === 'tri') {
        var tx = bbActiveFigure.x + bbActiveFigure.b * 0.45;
        var ty = bbActiveFigure.y - bbActiveFigure.h;
        if (Math.hypot(tx - p.x, ty - p.y) < 24) {
          bbDraggingHandle = { target: 'tri_apex', startH: bbActiveFigure.h, startB: bbActiveFigure.b, startX: p.x, startY: p.y };
          try { bbCanvas.setPointerCapture(e.pointerId); } catch (_) {}
          return;
        }
      }

      if (bbCurrentTool === 'counter') {
        bbCounters.push({ x: p.x, y: p.y });
        redrawBlackboard();
        return;
      }

      if (bbCurrentTool === 'eraser') {
        bbCounters = bbCounters.filter(function (c) { return Math.hypot(c.x - p.x, c.y - p.y) > 20; });
        bbStrokes = bbStrokes.filter(function (s) {
          return !s.pts.some(function (pt) { return Math.hypot(pt.x - p.x, pt.y - p.y) < 18; });
        });
        redrawBlackboard();
        return;
      }

      isBbDrawing = true;
      bbCurrentStroke = [p];
      try { bbCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    });

    bbCanvas.addEventListener('pointermove', function (e) {
      var p = getBbPos(e);
      if (bbDraggingHandle) {
        if (bbDraggingHandle.target === 'rect_br') {
          bbActiveFigure.w = Math.max(56, bbDraggingHandle.startW + (p.x - bbDraggingHandle.startX));
          bbActiveFigure.h = Math.max(40, bbDraggingHandle.startH + (p.y - bbDraggingHandle.startY));
          updateBlackboardReport(bbActiveFigure);
          redrawBlackboard();
          return;
        }
        if (bbDraggingHandle.target === 'para_tr') {
          bbActiveFigure.s = Math.max(-100, Math.min(150, bbDraggingHandle.startS + (p.x - bbDraggingHandle.startX)));
          bbActiveFigure.h = Math.max(40, Math.min(220, bbDraggingHandle.startH - (p.y - bbDraggingHandle.startY)));
          updateBlackboardReport(bbActiveFigure);
          redrawBlackboard();
          return;
        }
        if (bbDraggingHandle.target === 'tri_apex') {
          bbActiveFigure.h = Math.max(40, Math.min(220, bbDraggingHandle.startH - (p.y - bbDraggingHandle.startY)));
          updateBlackboardReport(bbActiveFigure);
          redrawBlackboard();
          return;
        }
      }

      if (!isBbDrawing) return;
      bbCurrentStroke.push(p);
      redrawBlackboard();
    });

    function stopBbDrawing(e) {
      if (bbDraggingHandle) {
        bbDraggingHandle = null;
        try { bbCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
        return;
      }
      if (!isBbDrawing) return;
      isBbDrawing = false;
      try { bbCanvas.releasePointerCapture(e.pointerId); } catch (_) {}

      if (bbCurrentStroke.length > 3) {
        bbStrokes.push({ pts: bbCurrentStroke, color: '#f8fafc', width: 3 });

        // Freehand 4-corner rectangle detection
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        bbCurrentStroke.forEach(function (pt) {
          minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
          minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
        });
        var bw = maxX - minX, bh = maxY - minY;
        var pStart = bbCurrentStroke[0], pEnd = bbCurrentStroke[bbCurrentStroke.length - 1];
        var isClosed = Math.hypot(pStart.x - pEnd.x, pStart.y - pEnd.y) < Math.max(35, Math.min(bw, bh) * 0.4);

        if (isClosed && bw > 45 && bh > 40) {
          bbActiveFigure = { type: 'rect', x: minX, y: minY, w: bw, h: bh };
          updateBlackboardReport(bbActiveFigure);
        }
      }
      bbCurrentStroke = [];
      redrawBlackboard();
    }

    bbCanvas.addEventListener('pointerup', stopBbDrawing);
    bbCanvas.addEventListener('pointercancel', stopBbDrawing);
  }

  // Blackboard Tools buttons
  document.querySelectorAll('.arp-bb-tool').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var t = btn.dataset.bbTool;
      if (t === 'clear') {
        bbStrokes = [];
        bbCounters = [];
        bbActiveFigure = null;
        if (bbShapeName) bbShapeName.textContent = 'Blackboard Cleared';
        if (bbAreaVal) bbAreaVal.textContent = '0 sq units';
        if (bbPerimVal) bbPerimVal.textContent = '0 units';
        if (bbBannerText) bbBannerText.textContent = '🧹 Blackboard cleared. Ready for your sketches or presets.';
        redrawBlackboard();
        return;
      }
      bbCurrentTool = t;
      document.querySelectorAll('.arp-bb-tool').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  // Blackboard Preset buttons
  document.querySelectorAll('.arp-bb-preset-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var p = btn.dataset.bbPreset;
      loadPresetToBlackboard(p);
    });
  });

  // AI Voice Speech Synthesis
  if (bbVoiceBtn) {
    bbVoiceBtn.addEventListener('click', function () {
      if (!('speechSynthesis' in window)) {
        alert('Speech synthesis is not supported in this browser.');
        return;
      }
      if (isBbSpeaking) {
        window.speechSynthesis.cancel();
        isBbSpeaking = false;
        bbVoiceBtn.textContent = '🔊 AI Voice';
        return;
      }
      var text = (bbProofText ? bbProofText.textContent : 'Area and Perimeter proof').replace(/[✨📐📦📏]/g, '');
      var utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.onend = function () {
        isBbSpeaking = false;
        bbVoiceBtn.textContent = '🔊 AI Voice';
      };
      isBbSpeaking = true;
      bbVoiceBtn.textContent = '⏹ Stop Voice';
      window.speechSynthesis.speak(utter);
    });
  }

  // Copy Proof
  if (bbCopyBtn) {
    bbCopyBtn.addEventListener('click', function () {
      var text = bbProofText ? bbProofText.textContent.replace(/\s+/g, ' ').trim() : '';
      navigator.clipboard.writeText(text).then(function () {
        if (bbBannerText) bbBannerText.textContent = '📋 Copied step-by-step mathematical proof to clipboard!';
        setTimeout(function () {
          if (bbBannerText) bbBannerText.textContent = '✨ AI Ready: Draw any shape, drag yellow vertex handles, or choose a geometric preset';
        }, 3000);
      });
    });
  }

  // Pop dock button
  if (bbPopDockBtn) {
    function openActiveFigureInDock(dock) {
      dock.open();
      if (!bbActiveFigure) return;
      if (bbActiveFigure.type === 'rect') {
        dock.loadRectangle(Math.round(bbActiveFigure.w / 28) || 6, Math.round(bbActiveFigure.h / 28) || 4);
      } else if (bbActiveFigure.type === 'para') {
        dock.loadParallelogram(Math.round(bbActiveFigure.w / 28) || 7, Math.round(bbActiveFigure.h / 28) || 4, Math.round(bbActiveFigure.s / 28) || 2);
      } else if (bbActiveFigure.type === 'tri') {
        dock.loadTriangle(Math.round(bbActiveFigure.w / 28) || 8, Math.round(bbActiveFigure.h / 28) || 5);
      } else if (bbActiveFigure.type === 'samep') {
        dock.loadSameP16();
      } else if (bbActiveFigure.type === 'poly') {
        dock.loadPolyomino(bbActiveFigure.cells || []);
      }
    }

    bbPopDockBtn.addEventListener('click', function () {
      if (window.SmartBlackboardDock) {
        openActiveFigureInDock(window.SmartBlackboardDock);
      } else if (window.ClassroomOSEnsureSmartWhiteboard) {
        window.ClassroomOSEnsureSmartWhiteboard(openActiveFigureInDock);
      } else {
        var wbBtn = document.querySelector('.nav-whiteboard-btn');
        if (wbBtn) wbBtn.click();
      }
    });
  }

  // Initialize Lab 3 with 6x4 rectangle
  loadPresetToBlackboard('rect', { l: 6, w: 4 });
  window.addEventListener('resize', resizeBbCanvas);
  setTimeout(resizeBbCanvas, 150);

  // =========================================================================
  // Interactive Check Quiz Engine
  // =========================================================================
  var questions = [
    { q: 'A rectangle is 5 units by 2 units. What is its area?', answer: 10, choices: [10, 14, 7, 12], feedback: 'Area = length x width = 5 x 2 = 10 square units.' },
    { q: 'A rectangle is 5 units by 2 units. What is its perimeter?', answer: 14, choices: [10, 14, 7, 20], feedback: 'Perimeter = 2 x (5 + 2) = 2 x 7 = 14 units.' },
    { q: 'A square has a side length of 6. What is its area?', answer: 36, choices: [24, 12, 36, 18], feedback: 'A square\'s area is side x side = 6 x 6 = 36.' },
    { q: 'A square has a side length of 6. What is its perimeter?', answer: 24, choices: [36, 24, 12, 30], feedback: 'A square\'s perimeter is 4 x side = 4 x 6 = 24.' },
    { q: 'Two rectangles both have a perimeter of 20. Rectangle A is 8 x 2 and Rectangle B is 5 x 5. Which has more area?', answer: 'Rectangle B', choices: ['Rectangle A', 'Rectangle B', 'They are equal', 'Cannot tell'], feedback: 'Rectangle A has area 16; Rectangle B (a square) has area 25. Equal perimeter does not mean equal area.' },
    { q: 'A parallelogram has base 8, perpendicular height 4, and slanted side 5. What is its area?', answer: 32, choices: [32, 40, 26, 20], feedback: 'Parallelogram area = base x perpendicular height = 8 x 4 = 32 sq units. (The slanted side 5 is used for perimeter, not area!)' },
    { q: 'A triangle has base 6 and perpendicular height 5. What is its area?', answer: 15, choices: [30, 15, 11, 22], feedback: 'Triangle area = 1/2 x base x height = 1/2 x 6 x 5 = 15 sq units.' }
  ];

  var questionEl = document.getElementById('arp-question');
  var options = document.getElementById('arp-options');
  var feedback = document.getElementById('arp-feedback');
  var score = document.getElementById('arp-score');
  var next = document.getElementById('arp-next');
  var qIndex = 0;
  var correct = 0;
  var attempted = 0;
  var locked = false;

  function renderQuestion() {
    if (!questionEl || !options || !feedback) return;
    var item = questions[qIndex % questions.length];
    locked = false;
    questionEl.textContent = item.q;
    options.innerHTML = '';
    feedback.textContent = 'Think about what area and perimeter each measure.';
    item.choices.forEach(function (choice) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'arp-choice';
      button.textContent = choice;
      button.addEventListener('click', function () {
        if (locked) return;
        locked = true;
        attempted += 1;
        if (choice === item.answer) {
          correct += 1;
          button.classList.add('correct');
          feedback.textContent = 'Correct. ' + item.feedback;
        } else {
          button.classList.add('wrong');
          Array.prototype.forEach.call(options.children, function (option) {
            if (String(option.textContent) === String(item.answer)) option.classList.add('correct');
          });
          feedback.textContent = 'Not quite. ' + item.feedback;
        }
        if (score) score.textContent = correct + '/' + attempted;
      });
      options.appendChild(button);
    });
    if (score) score.textContent = correct + '/' + attempted;
  }

  if (next) {
    next.addEventListener('click', function () {
      qIndex += 1;
      renderQuestion();
    });
  }
  renderQuestion();

  // =========================================================================
  // Guided Practice & AI Blackboard Problem Helpers
  // =========================================================================
  document.querySelectorAll('.arp-practice-item').forEach(function (item) {
    var input = item.querySelector('input');
    var button = item.querySelector('.arp-check');
    var feedbackNode = item.querySelector('.arp-mini-feedback');
    if (!button || !input) return;
    button.addEventListener('click', function () {
      var expected = Number(item.getAttribute('data-answer'));
      var actual = Number(input.value);
      if (feedbackNode) feedbackNode.className = 'arp-mini-feedback';
      if (input.value.trim() !== '' && actual === expected) {
        if (feedbackNode) {
          feedbackNode.textContent = 'Correct';
          feedbackNode.classList.add('ok');
        }
      } else {
        if (feedbackNode) {
          feedbackNode.textContent = 'Try again';
          feedbackNode.classList.add('no');
        }
      }
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') button.click();
    });
  });

  document.querySelectorAll('.arp-bb-solve-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var qid = btn.dataset.qid;
      var bbSection = document.getElementById('arp-lab3-blackboard');
      if (qid === '1') {
        loadPresetToBlackboard('rect', { l: 6, w: 4 });
      } else if (qid === '2') {
        loadPresetToBlackboard('rect', { l: 6, w: 4 });
      } else if (qid === '3') {
        loadPresetToBlackboard('rect', { l: 9, w: 9 });
      } else if (qid === '4') {
        loadPresetToBlackboard('rect', { l: 3, w: 7 });
      } else if (qid === '5') {
        loadPresetToBlackboard('para', { b: 7, h: 5, s: 3 });
      } else if (qid === '6') {
        loadPresetToBlackboard('tri', { b: 10, h: 3 });
      }
      if (bbSection) bbSection.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // =========================================================================
  // Exit Ticket AI Verification Assistant
  // =========================================================================
  var exitInput = document.getElementById('arp-exit-input');
  var exitCheckBtn = document.getElementById('arp-exit-check-btn');
  var exitCopyBbBtn = document.getElementById('arp-exit-copy-bb');
  var exitFeedback = document.getElementById('arp-exit-feedback');

  if (exitCheckBtn && exitInput && exitFeedback) {
    exitCheckBtn.addEventListener('click', function () {
      var val = exitInput.value.toLowerCase().trim();
      if (val.length < 15) {
        exitFeedback.className = 'arp-exit-feedback visible enrich';
        exitFeedback.innerHTML = '<strong>Needs more explanation:</strong> Please write a full mathematical sentence explaining your thinking.';
        return;
      }

      var hasUnitDistinction = /area|perimeter|inside|outside|fence|boundary|square unit|linear unit/i.test(val);
      var hasSharedEdges = /shared|inner|internal|seam|edge|compact|strip|24|6/i.test(val);
      var hasHeightDistinction = /perpendicular|altitude|height|slant|c|90|right/i.test(val);
      var hasTwinProof = /twin|rotate|half|180|parallelogram|triangle/i.test(val);

      var points = (hasUnitDistinction ? 1 : 0) + (hasSharedEdges ? 1 : 0) + (hasHeightDistinction ? 1 : 0) + (hasTwinProof ? 1 : 0);

      if (points >= 2) {
        exitFeedback.className = 'arp-exit-feedback visible pass';
        exitFeedback.innerHTML =
          '<strong>✅ AI Proof Verification Passed!</strong> Your explanation demonstrates sound conceptual understanding. ' +
          'You correctly connected the physical geometric principles (boundary fences, shared inner seams, and perpendicular altitudes) to their algebraic formulas.';
      } else {
        exitFeedback.className = 'arp-exit-feedback visible enrich';
        exitFeedback.innerHTML =
          '<strong>💡 AI Feedback &amp; Enrichment:</strong> Good start! To make your mathematical proof airtight, make sure to explicitly contrast: ' +
          '1) <em>Area</em> (internal 2D square coverage) vs <em>Perimeter</em> (1D outer boundary fence); ' +
          '2) Why compact shapes enclose more ground by sharing internal seams; ' +
          '3) Why perpendicular height <em>h</em> is used for area while slanted side <em>c</em> only affects perimeter.';
      }
    });
  }

  if (exitCopyBbBtn && exitInput) {
    exitCopyBbBtn.addEventListener('click', function () {
      var proof = bbProofText ? bbProofText.textContent.replace(/\s+/g, ' ').trim() : '';
      if (proof) {
        exitInput.value = (exitInput.value ? exitInput.value + '\n\n' : '') + '[AI Blackboard Proof]: ' + proof;
        exitInput.focus();
      }
    });
  }
})();
