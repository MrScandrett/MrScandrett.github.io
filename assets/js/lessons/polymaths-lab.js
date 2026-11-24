(function (global) {
  'use strict';

  var Core = global.PolymathsCore;
  var SimKit = global.SimKit;
  if (!Core) return;

  // 1. Sampling vs. Specialization Trajectory Lab
  var trajLab = document.getElementById('pop-trajectory-lab');
  if (trajLab && SimKit) {
    var canvas = trajLab.querySelector('#pop-traj-canvas');
    var breadthEl = trajLab.querySelector('#pop-breadth');
    var depthEl = trajLab.querySelector('#pop-depth');
    var transferEl = trajLab.querySelector('#pop-transfer');
    var shiftEl = trajLab.querySelector('#pop-shift');
    var breadthOut = trajLab.querySelector('#pop-breadth-out');
    var depthOut = trajLab.querySelector('#pop-depth-out');
    var transferOut = trajLab.querySelector('#pop-transfer-out');
    var readoutEl = trajLab.querySelector('#pop-traj-readout');

    var theme = SimKit.theme.colors();
    var isDark = function () {
      return document.documentElement.dataset.lighting === 'night';
    };

    var c2d = null;

    function drawTrajectory() {
      if (!canvas || !c2d || !c2d.width || !c2d.height) return;
      var breadth = Number(breadthEl.value);
      var depth = Number(depthEl.value);
      var transfer = Number(transferEl.value);
      var fieldShift = shiftEl.checked;

      breadthOut.textContent = breadth + (breadth === 1 ? ' field' : ' fields');
      depthOut.textContent = depth + '%';
      transferOut.textContent = transfer + '%';

      var sim = Core.simulateTrajectories({
        samplingBreadth: breadth,
        anchorDepth: depth,
        transferPractice: transfer,
        fieldShift: fieldShift,
        years: 12
      });

      var dark = isDark();
      var bg = dark ? '#191b26' : '#faf9fe';
      var grid = dark ? 'rgba(255,255,255,0.12)' : 'rgba(30,21,51,0.12)';
      var ink = theme.text || (dark ? '#f5f5f7' : '#1e1533');
      var muted = dark ? '#a7a7bc' : '#586477';
      var cSpec = dark ? '#fb923c' : '#ea580c';
      var cDab = dark ? '#94a3b8' : '#64748b';
      var cPoly = dark ? '#a78bfa' : '#7c3aed';
      var cShift = dark ? '#f87171' : '#dc2626';

      var w = c2d.width;
      var h = c2d.height;
      var ctx = c2d.ctx;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      var padL = 44;
      var padR = 18;
      var padT = 32;
      var padB = 34;
      var pw = Math.max(60, w - padL - padR);
      var ph = Math.max(60, h - padT - padB);
      var n = sim.years.length - 1;

      function xOf(yr) { return padL + (yr / n) * pw; }
      function yOf(val) { return padT + ph - (val / 100) * ph; }

      // Grid lines
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      [0, 25, 50, 75, 100].forEach(function (v) {
        var gy = yOf(v);
        ctx.beginPath();
        ctx.moveTo(padL, gy);
        ctx.lineTo(padL + pw, gy);
        ctx.stroke();
        ctx.fillStyle = muted;
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.fillText(String(v), 12, gy + 3.5);
      });

      [0, 3, 6, 9, 12].forEach(function (yr) {
        var gx = xOf(yr);
        ctx.fillStyle = muted;
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.fillText('Yr ' + yr, gx - 10, h - 10);
      });

      // Midpoint field shift line
      if (fieldShift) {
        var sx = xOf(sim.shiftYear);
        ctx.save();
        ctx.strokeStyle = cShift;
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, padT);
        ctx.lineTo(sx, padT + ph);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = cShift;
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.fillText('Field shift (Yr ' + sim.shiftYear + ')', sx + 5, padT + 12);
      }

      function drawSeries(arr, color, dashed) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = dashed ? 2 : 3;
        if (dashed) ctx.setLineDash([5, 4]);
        ctx.beginPath();
        arr.forEach(function (val, idx) {
          var px = xOf(idx);
          var py = yOf(val);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
      }

      drawSeries(sim.unanchoredDabbler, cDab, true);
      drawSeries(sim.earlySpecialist, cSpec, false);
      drawSeries(sim.anchoredPolymath, cPoly, false);

      // Crossover marker
      if (sim.crossoverYear !== null) {
        var cx = xOf(sim.crossoverYear);
        var cy = yOf(sim.anchoredPolymath[sim.crossoverYear]);
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = cPoly;
        ctx.fill();
        ctx.strokeStyle = bg;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Legend
      var items = [
        { label: 'Anchored Polymath', color: cPoly },
        { label: 'Early Specialist', color: cSpec },
        { label: 'Unanchored Dabbler', color: cDab }
      ];
      var lx = padL;
      items.forEach(function (item) {
        ctx.fillStyle = item.color;
        ctx.fillRect(lx, 10, 12, 4);
        ctx.fillStyle = ink;
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.fillText(item.label, lx + 16, 15);
        lx += ctx.measureText(item.label).width + 32;
      });

      var crossMsg = sim.crossoverYear !== null
        ? 'Anchored Polymath overtakes Early Specialist at Year ' + sim.crossoverYear + '.'
        : 'Increase Anchor Depth or Transfer Practice for the Polymath curve to surpass the Early Specialist.';
      readoutEl.textContent =
        'Year 12 conceptual adaptability — Anchored Polymath: ' + sim.finalScores.polymath.toFixed(0) +
        ' · Early Specialist: ' + sim.finalScores.specialist.toFixed(0) +
        ' · Unanchored Dabbler: ' + sim.finalScores.dabbler.toFixed(0) +
        '. ' + crossMsg;
    }

    c2d = SimKit.canvas2d(canvas, {
      height: 270,
      onResize: function () { drawTrajectory(); }
    });

    [breadthEl, depthEl, transferEl, shiftEl].forEach(function (el) {
      el.addEventListener('input', drawTrajectory);
      el.addEventListener('change', drawTrajectory);
    });

    SimKit.theme.onChange(function (colors) {
      theme = colors;
      drawTrajectory();
    });

    drawTrajectory();
  }

  // 2. Polymath Gallery Domain Filter
  var filterBar = document.getElementById('pop-gallery-filters');
  var galleryCount = document.getElementById('pop-gallery-count');
  var cards = Array.prototype.slice.call(document.querySelectorAll('#pop-sec-gallery .pop-poly-card'));
  if (filterBar && cards.length) {
    function applyFilter(catId) {
      var shown = 0;
      cards.forEach(function (card) {
        var cats = (card.dataset.domains || '').split(/\s+/);
        var match = catId === 'all' || cats.indexOf(catId) !== -1;
        card.hidden = !match;
        if (match) shown++;
      });
      if (galleryCount) {
        galleryCount.textContent = 'Showing ' + shown + ' of ' + cards.length + ' polymaths';
      }
      filterBar.querySelectorAll('button[data-filter]').forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.filter === catId));
      });
    }

    Core.DOMAIN_FILTERS.forEach(function (f) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = f.label;
      btn.dataset.filter = f.id;
      btn.setAttribute('aria-pressed', String(f.id === 'all'));
      btn.addEventListener('click', function () { applyFilter(f.id); });
      filterBar.appendChild(btn);
    });
    applyFilter('all');
  }

  // 3. Anchor + Orbit Collision Planner
  var planner = document.getElementById('pop-collision-planner');
  if (planner) {
    var anchorSel = planner.querySelector('#pop-anchor-select');
    var orbitSel = planner.querySelector('#pop-orbit-select');
    var anchorCustom = planner.querySelector('#pop-anchor-custom');
    var orbitCustom = planner.querySelector('#pop-orbit-custom');
    var genBtn = planner.querySelector('#pop-generate-collision');
    var outBox = planner.querySelector('#pop-collision-output');

    if (anchorSel && orbitSel) {
      Core.COLLISION_FIELDS.forEach(function (field, i) {
        var o1 = document.createElement('option');
        o1.value = field.id;
        o1.textContent = field.label;
        if (i === 1) o1.selected = true;
        anchorSel.appendChild(o1);

        var o2 = document.createElement('option');
        o2.value = field.id;
        o2.textContent = field.label;
        if (i === 0) o2.selected = true;
        orbitSel.appendChild(o2);
      });

      function updateCollision() {
        var res = Core.buildCollisionPrompt(
          anchorSel.value,
          orbitSel.value,
          anchorCustom ? anchorCustom.value : '',
          orbitCustom ? orbitCustom.value : ''
        );
        outBox.replaceChildren();
        var title = document.createElement('strong');
        title.textContent = res.pairLabel;
        var p1 = document.createElement('p');
        p1.textContent = 'Method transfer: ' + res.transferMethod;
        var p2 = document.createElement('p');
        p2.textContent = 'Historical parallel: ' + res.historicalParallel;
        var p3 = document.createElement('p');
        p3.textContent = 'Project collision: ' + res.projectIdea;
        outBox.append(title, p1, p2, p3);
      }

      [anchorSel, orbitSel].forEach(function (el) {
        el.addEventListener('change', updateCollision);
      });
      if (genBtn) genBtn.addEventListener('click', updateCollision);
      updateCollision();
    }
  }
}(window));
