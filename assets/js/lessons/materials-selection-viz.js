(function () {
  'use strict';

  var MATS = {
    aluminum: { label: 'Aluminum', weight: 4, strength: 4, heatSafe: 1, flex: 2, cost: 3, jx: -0.1, jy: 0.1 },
    steel:    { label: 'Steel',    weight: 1, strength: 5, heatSafe: 1, flex: 1, cost: 2, jx: 0.0, jy: 0.0 },
    wood:     { label: 'Wood',     weight: 3, strength: 2, heatSafe: 4, flex: 2, cost: 2, jx: 0.0, jy: -0.1 },
    abs:      { label: 'ABS',      weight: 5, strength: 2, heatSafe: 3, flex: 4, cost: 1, jx: 0.0, jy: 0.1 },
    silicone: { label: 'Silicone', weight: 5, strength: 1, heatSafe: 5, flex: 5, cost: 2, jx: 0.0, jy: 0.0 },
    copper:   { label: 'Copper',   weight: 2, strength: 3, heatSafe: 1, flex: 2, cost: 4, jx: 0.1, jy: 0.0 },
    ceramic:  { label: 'Ceramic',  weight: 2, strength: 2, heatSafe: 5, flex: 1, cost: 3, jx: 0.0, jy: 0.0 }
  };

  var SCENARIOS = {
    bike: { xKey: 'weight', xLabel: 'Lightness (Weight Score)', xMin: 4, yKey: 'strength', yLabel: 'Strength Score', yMin: 4 },
    pan:  { xKey: 'heatSafe', xLabel: 'Heat Safety (Stays Cool)', xMin: 4, yKey: 'strength', yLabel: 'Strength Score', yMin: 2 },
    phone:{ xKey: 'flex', xLabel: 'Impact Flex Score', xMin: 4, yKey: 'weight', yLabel: 'Lightness Score', yMin: 4 }
  };

  function getActiveScenarioKey() {
    var sel = document.querySelector('.msl-scenario-btn.selected');
    if (sel && sel.dataset && sel.dataset.scenario) return sel.dataset.scenario;
    var txt = (document.getElementById('msl-brief') || {}).textContent || '';
    if (txt.indexOf('Pan Handle') !== -1) return 'pan';
    if (txt.indexOf('Phone Case') !== -1) return 'phone';
    return 'bike';
  }

  function getSelectedMatKey() {
    var row = document.querySelector('#msl-table-body tr.selected-row');
    if (row && row.dataset && row.dataset.mat) return row.dataset.mat;
    var btn = document.querySelector('.msl-mat-btn.selected');
    if (btn && btn.dataset && btn.dataset.mat) return btn.dataset.mat;
    return null;
  }

  function renderScatter(scKey, matKey) {
    var svg = document.getElementById('msl-scatter-svg');
    if (!svg) return;
    var sc = SCENARIOS[scKey] || SCENARIOS.bike;
    var padL = 52, padR = 24, padT = 34, padB = 42, W = 420, H = 260;
    var pw = W - padL - padR, ph = H - padT - padB;
    var xToPx = function (v) { return padL + ((v - 0.5) / 5.0) * pw; };
    var yToPx = function (v) { return padT + ph - ((v - 0.5) / 5.0) * ph; };

    var zoneX = xToPx(sc.xMin - 0.25);
    var zoneY = yToPx(5.5);
    var zoneW = xToPx(5.5) - zoneX;
    var zoneH = yToPx(sc.yMin - 0.25) - zoneY;

    var grid = '';
    for (var tick = 1; tick <= 5; tick++) {
      var gx = xToPx(tick).toFixed(1), gy = yToPx(tick).toFixed(1);
      grid += '<line x1="' + gx + '" y1="' + padT + '" x2="' + gx + '" y2="' + (H - padB) + '" stroke="#1e293b" stroke-width="1"/>';
      grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="#1e293b" stroke-width="1"/>';
      grid += '<text x="' + gx + '" y="' + (H - padB + 15) + '" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#94a3b8">' + tick + '</text>';
      grid += '<text x="' + (padL - 8) + '" y="' + (Number(gy) + 3.5) + '" text-anchor="end" font-family="system-ui,sans-serif" font-size="10" fill="#94a3b8">' + tick + '</text>';
    }

    var dots = '';
    Object.keys(MATS).forEach(function (k) {
      var m = MATS[k];
      var xv = m[sc.xKey] + m.jx;
      var yv = m[sc.yKey] + m.jy;
      var cx = xToPx(xv).toFixed(1);
      var cy = yToPx(yv).toFixed(1);
      var isSel = k === matKey;
      var passes = m[sc.xKey] >= sc.xMin && m[sc.yKey] >= sc.yMin;
      var fill = passes ? '#22c55e' : '#f97316';
      dots += '<g class="msl-scatter-node" data-node-mat="' + k + '" tabindex="0" role="button" aria-label="Select ' + m.label + '">' +
        (isSel ? '<circle cx="' + cx + '" cy="' + cy + '" r="12" fill="none" stroke="#fde047" stroke-width="2.5"/>' : '') +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (isSel ? 7.5 : 6) + '" fill="' + fill + '" stroke="#0f172a" stroke-width="1.5"/>' +
        '<text x="' + cx + '" y="' + (Number(cy) - 10) + '" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10.5" font-weight="' + (isSel ? '800' : '600') + '" fill="' + (isSel ? '#fde047' : '#e2e8f0') + '">' + m.label + '</text>' +
      '</g>';
    });

    svg.innerHTML =
      '<text x="' + padL + '" y="19" font-family="system-ui,sans-serif" font-size="11.5" font-weight="800" fill="#e2e8f0">Tradeoff Plot (Click a material dot)</text>' +
      '<rect x="' + padL + '" y="' + padT + '" width="' + pw + '" height="' + ph + '" fill="#0b1120" stroke="#334155"/>' +
      grid +
      '<rect x="' + zoneX.toFixed(1) + '" y="' + zoneY.toFixed(1) + '" width="' + zoneW.toFixed(1) + '" height="' + zoneH.toFixed(1) + '" fill="#22c55e" fill-opacity="0.16" stroke="#22c55e" stroke-dasharray="4 4"/>' +
      '<text x="' + (zoneX + 6).toFixed(1) + '" y="' + (zoneY + 14).toFixed(1) + '" font-family="system-ui,sans-serif" font-size="9.5" font-weight="800" fill="#4ade80">PASS ZONE</text>' +
      dots +
      '<text x="' + (padL + pw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10.5" font-weight="700" fill="#cbd5e1">' + sc.xLabel + '</text>' +
      '<text x="' + (-(padT + ph / 2)) + '" y="14" transform="rotate(-90)" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10.5" font-weight="700" fill="#cbd5e1">' + sc.yLabel + '</text>';

    svg.querySelectorAll('.msl-scatter-node').forEach(function (node) {
      var trigger = function () {
        var btn = document.querySelector('.msl-mat-btn[data-mat="' + node.dataset.nodeMat + '"]');
        if (btn) btn.click();
      };
      node.addEventListener('click', trigger);
      node.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
      });
    });
  }

  function renderRadar(scKey, matKey) {
    var svg = document.getElementById('msl-radar-svg');
    if (!svg) return;
    var sc = SCENARIOS[scKey] || SCENARIOS.bike;
    var m = matKey ? MATS[matKey] : null;
    var cx = 150, cy = 136, R = 82;
    var axes = [
      { key: 'weight', label: 'Weight' },
      { key: 'strength', label: 'Strength' },
      { key: 'heatSafe', label: 'Heat Safe' },
      { key: 'flex', label: 'Flexible' },
      { key: 'cost', label: 'Cost' }
    ];

    var pt = function (idx, val) {
      var angle = (-90 + idx * 72) * Math.PI / 180;
      var rad = (val / 5) * R;
      return [cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad];
    };

    var rings = '';
    for (var lvl = 1; lvl <= 5; lvl++) {
      var pts = axes.map(function (_, i) { return pt(i, lvl).map(function (n) { return n.toFixed(1); }).join(','); }).join(' ');
      rings += '<polygon points="' + pts + '" fill="none" stroke="#1e293b" stroke-width="1"/>';
    }

    var axisLines = '';
    axes.forEach(function (ax, i) {
      var pOuter = pt(i, 5);
      var pLbl = pt(i, 5.9);
      axisLines += '<line x1="' + cx + '" y1="' + cy + '" x2="' + pOuter[0].toFixed(1) + '" y2="' + pOuter[1].toFixed(1) + '" stroke="#334155" stroke-width="1"/>';
      axisLines += '<text x="' + pLbl[0].toFixed(1) + '" y="' + (pLbl[1] + 3).toFixed(1) + '" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#cbd5e1">' + ax.label + '</text>';
    });

    // Requirement dashed profile
    var reqPts = axes.map(function (ax, i) {
      var v = ax.key === sc.xKey ? sc.xMin : (ax.key === sc.yKey ? sc.yMin : 1);
      return pt(i, v).map(function (n) { return n.toFixed(1); }).join(',');
    }).join(' ');

    var matPoly = '';
    var caption = 'Pick a material to inspect profile';
    if (m) {
      var mPts = axes.map(function (ax, i) {
        return pt(i, m[ax.key]).map(function (n) { return n.toFixed(1); }).join(',');
      }).join(' ');
      matPoly = '<polygon points="' + mPts + '" fill="#6366f1" fill-opacity="0.45" stroke="#a5b4fc" stroke-width="2.5"/>';
      caption = m.label + ' Footprint';
    }

    svg.setAttribute('data-selected-mat', matKey || 'none');
    svg.innerHTML =
      '<text x="150" y="19" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11.5" font-weight="800" fill="#e2e8f0">' + caption + '</text>' +
      rings + axisLines +
      '<polygon points="' + reqPts + '" fill="none" stroke="#22c55e" stroke-width="1.8" stroke-dasharray="4 3"/>' +
      matPoly +
      '<text x="150" y="249" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9.5" fill="#94a3b8">Green dashed: minimum constraint · Indigo: selected</text>';
  }

  function updateAll() {
    var sc = getActiveScenarioKey();
    var mat = getSelectedMatKey();
    renderScatter(sc, mat);
    renderRadar(sc, mat);
  }

  document.addEventListener('DOMContentLoaded', function () {
    updateAll();
    var brief = document.getElementById('msl-brief');
    var tbody = document.getElementById('msl-table-body');
    if (window.MutationObserver) {
      if (brief) new MutationObserver(updateAll).observe(brief, { childList: true, subtree: true });
      if (tbody) new MutationObserver(updateAll).observe(tbody, { attributes: true, subtree: true, childList: true });
    }
    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('.msl-scenario-btn, .msl-mat-btn')) {
        setTimeout(updateAll, 0);
      }
    });
  });
})();
