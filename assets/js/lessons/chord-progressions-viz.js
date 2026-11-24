/* Live SVG visualizers for Chord Progressions (#playground):
 * 1) Functional Gravity Map (Home / Away / Pull zones with active path arrows)
 * 2) Voice-Leading Pitch Ribbon (triad tones tracked across loop cards)
 */
(function () {
  'use strict';

  var loopEl = document.getElementById('cp-loop');
  var keySel = document.getElementById('cp-loop-key');
  var diagramsEl = document.getElementById('cp-loop-diagrams');
  if (!loopEl || !keySel || !diagramsEl) return;

  var ns = 'http://www.w3.org/2000/svg';
  var OFFSETS = [0, 2, 4, 5, 7, 9, 11];
  var NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  var QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];
  var NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  var KEY_PCS = { C: 0, G: 7, D: 2, A: 9, E: 4, F: 5, Bb: 10, Eb: 3 };
  var FILL_COLORS = ['#beeeda', '#c7eaff', '#e2d6ff', '#cdeeb8', '#ffdb9b', '#ffd3e5', '#ffcfc4'];
  var STROKE_COLORS = ['#059669', '#2563eb', '#7c3aed', '#16a34a', '#d97706', '#db2777', '#dc2626'];
  var INK_COLORS = ['#14382b', '#153954', '#39265a', '#2b411e', '#513413', '#59263e', '#552c22'];

  // Node positions in the 420x250 Functional Gravity Map SVG
  var NODES = [
    { deg: 0, x: 78,  y: 96,  zone: 'Home' },  // I
    { deg: 5, x: 78,  y: 162, zone: 'Home' },  // vi
    { deg: 2, x: 78,  y: 214, zone: 'Color' }, // iii
    { deg: 3, x: 210, y: 102, zone: 'Away' },  // IV
    { deg: 1, x: 210, y: 176, zone: 'Away' },  // ii
    { deg: 4, x: 342, y: 102, zone: 'Pull' },  // V
    { deg: 6, x: 342, y: 176, zone: 'Pull' }   // vii°
  ];

  var wrap = document.createElement('section');
  wrap.id = 'cp-live-viz';
  wrap.className = 'cp-live-viz';
  wrap.setAttribute('aria-label', 'Live loop visualizations');

  var grid = document.createElement('div');
  grid.className = 'cp-viz-grid';

  var mapCard = document.createElement('article');
  mapCard.className = 'cp-viz-card';
  mapCard.innerHTML = '<h4>Harmonic Gravity Path</h4><p class="cp-viz-sub">Watch how your loop moves between Home, Away, and Pull.</p>';
  var mapHost = document.createElement('div');
  mapCard.appendChild(mapHost);

  var voiceCard = document.createElement('article');
  voiceCard.className = 'cp-viz-card';
  voiceCard.innerHTML = '<h4>Voice-Leading Ribbon</h4><p class="cp-viz-sub">Flat lines are shared notes staying put; angled lines show smooth chord steps.</p>';
  var voiceHost = document.createElement('div');
  voiceCard.appendChild(voiceHost);

  grid.append(mapCard, voiceCard);
  wrap.appendChild(grid);
  diagramsEl.insertAdjacentElement('afterend', wrap);

  function svgEl(tag, attrs, parent, text) {
    var el = document.createElementNS(ns, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    }
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }

  function scaleChords() {
    var key = keySel.value || 'C';
    var letters = 'CDEFGAB';
    var natural = [0, 2, 4, 5, 7, 9, 11];
    var first = letters.indexOf(key[0]);
    var tonic = natural[first] + (key[1] === 'b' ? -1 : key[1] === '#' ? 1 : 0);
    return OFFSETS.map(function (offset, i) {
      var letter = (first + i) % 7;
      var acc = ((tonic + offset - natural[letter] + 18) % 12) - 6;
      return letters[letter] + (acc < 0 ? '♭'.repeat(-acc) : acc > 0 ? '♯'.repeat(acc) : '') + QUALITIES[i];
    });
  }

  function readLoopState() {
    var cards = Array.prototype.slice.call(loopEl.querySelectorAll('button.cp-chord'));
    var degrees = [];
    var playingIdx = -1;
    cards.forEach(function (btn, idx) {
      var m = btn.className.match(/cp-degree-(\d)/);
      if (m) degrees.push(Number(m[1]) - 1);
      if (btn.classList.contains('cp-playing')) playingIdx = idx;
    });
    return { degrees: degrees, playingIdx: playingIdx };
  }

  function chordTriadPcs(degree, tonicPc) {
    return [
      (tonicPc + OFFSETS[degree % 7]) % 12,
      (tonicPc + OFFSETS[(degree + 2) % 7]) % 12,
      (tonicPc + OFFSETS[(degree + 4) % 7]) % 12
    ];
  }

  function closestPitch(pc, target) {
    var best = 60 + pc;
    var bestDist = 999;
    for (var oct = 48; oct <= 72; oct += 12) {
      var cand = oct + pc;
      if (cand < 55 || cand > 81) continue;
      var dist = Math.abs(cand - target);
      if (dist < bestDist) {
        bestDist = dist;
        best = cand;
      }
    }
    return best;
  }

  function voiceLoopSmooth(degrees, tonicPc) {
    if (!degrees.length) return [];
    var result = [];
    var firstPcs = chordTriadPcs(degrees[0], tonicPc);
    var prev = firstPcs.map(function (pc) {
      var m = 60 + pc;
      if (m < 60) m += 12;
      return m;
    }).sort(function (a, b) { return a - b; });
    result.push(prev);

    for (var i = 1; i < degrees.length; i++) {
      var pcs = chordTriadPcs(degrees[i], tonicPc);
      // Try all 6 permutations of assigning 3 chord tones to 3 previous voices and pick minimal total step distance
      var perms = [
        [pcs[0], pcs[1], pcs[2]],
        [pcs[0], pcs[2], pcs[1]],
        [pcs[1], pcs[0], pcs[2]],
        [pcs[1], pcs[2], pcs[0]],
        [pcs[2], pcs[0], pcs[1]],
        [pcs[2], pcs[1], pcs[0]]
      ];
      var bestVoicing = null;
      var bestCost = 999;
      perms.forEach(function (perm) {
        var voiced = perm.map(function (pc, vIdx) { return closestPitch(pc, prev[vIdx]); });
        var cost = voiced.reduce(function (sum, m, vIdx) { return sum + Math.abs(m - prev[vIdx]); }, 0);
        if (cost < bestCost) {
          bestCost = cost;
          bestVoicing = voiced;
        }
      });
      prev = bestVoicing;
      result.push(prev);
    }
    return result;
  }

  function renderGravityMap(state, names) {
    var svg = svgEl('svg', { viewBox: '0 0 420 250', role: 'img', class: 'cp-viz-svg' });
    svgEl('title', {}, svg, 'Harmonic gravity map for the current loop');
    var defs = svgEl('defs', {}, svg);
    var marker = svgEl('marker', { id: 'cp-viz-arrow', viewBox: '0 0 10 10', refX: '8.5', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto' }, defs);
    svgEl('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: '#0f172a' }, marker);

    // Background card & zone panels
    svgEl('rect', { width: 420, height: 250, rx: 12, fill: '#fffdf7', stroke: '#cbd5e1', 'stroke-width': 1.5 }, svg);
    var zones = [
      { x: 14, w: 128, title: 'HOME · TONIC', fill: '#ecfdf5', stroke: '#a7f3d0', text: '#065f46' },
      { x: 148, w: 124, title: 'AWAY · MOTION', fill: '#eff6ff', stroke: '#bfdbfe', text: '#1e40af' },
      { x: 278, w: 128, title: 'PULL · DOMINANT', fill: '#fffbeb', stroke: '#fde68a', text: '#92400e' }
    ];
    zones.forEach(function (z) {
      svgEl('rect', { x: z.x, y: 14, width: z.w, height: 222, rx: 10, fill: z.fill, stroke: z.stroke, 'stroke-width': 1.2 }, svg);
      svgEl('text', { x: z.x + z.w / 2, y: 34, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 10, 'font-weight': 800, fill: z.text }, svg, z.title);
    });

    var nodeByDeg = {};
    NODES.forEach(function (n) { nodeByDeg[n.deg] = n; });

    // Arrows along the user's loop
    var degs = state.degrees;
    for (var i = 0; i < degs.length; i++) {
      var a = nodeByDeg[degs[i]];
      var b = nodeByDeg[degs[(i + 1) % degs.length]];
      if (!a || !b) continue;
      var activeEdge = state.playingIdx === i;
      if (a === b) {
        svgEl('circle', { cx: a.x, cy: a.y - 26, r: 10, fill: 'none', stroke: activeEdge ? '#0f172a' : '#64748b', 'stroke-width': activeEdge ? 2.6 : 1.6, 'stroke-dasharray': i === degs.length - 1 ? '4 3' : '' }, svg);
        continue;
      }
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var len = Math.hypot(dx, dy) || 1;
      var ux = dx / len;
      var uy = dy / len;
      var sx = a.x + ux * 24;
      var sy = a.y + uy * 24;
      var ex = b.x - ux * 27;
      var ey = b.y - uy * 27;
      var mx = (sx + ex) / 2 - uy * (18 + (i % 2) * 8);
      var my = (sy + ey) / 2 + ux * (18 + (i % 2) * 8);
      svgEl('path', {
        d: 'M ' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' Q ' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1),
        fill: 'none',
        stroke: activeEdge ? '#0f172a' : '#475569',
        'stroke-width': activeEdge ? 3 : 1.8,
        'stroke-dasharray': i === degs.length - 1 ? '5 3' : '',
        'marker-end': 'url(#cp-viz-arrow)'
      }, svg);
    }

    var activeDeg = state.playingIdx >= 0 ? degs[state.playingIdx] : -1;
    var used = {};
    degs.forEach(function (d) { used[d] = true; });

    NODES.forEach(function (n) {
      var inLoop = !!used[n.deg];
      var isNow = activeDeg === n.deg;
      svgEl('circle', {
        cx: n.x, cy: n.y, r: isNow ? 25 : 22,
        fill: FILL_COLORS[n.deg],
        stroke: isNow ? '#0f172a' : STROKE_COLORS[n.deg],
        'stroke-width': isNow ? 3.5 : inLoop ? 2.2 : 1.2,
        opacity: inLoop || !degs.length ? 1 : 0.48
      }, svg);
      svgEl('text', {
        x: n.x, y: n.y - 1, 'text-anchor': 'middle',
        'font-family': 'system-ui, sans-serif', 'font-size': 13, 'font-weight': 800,
        fill: INK_COLORS[n.deg]
      }, svg, NUMERALS[n.deg]);
      svgEl('text', {
        x: n.x, y: n.y + 13, 'text-anchor': 'middle',
        'font-family': 'ui-monospace, Menlo, monospace', 'font-size': 9.5, 'font-weight': 700,
        fill: INK_COLORS[n.deg]
      }, svg, names[n.deg]);
    });

    if (!degs.length) {
      svgEl('text', { x: 210, y: 230, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 11, 'font-weight': 700, fill: '#475569' }, svg, 'Add chords to trace your harmonic path.');
    }
    mapHost.replaceChildren(svg);
  }

  function renderVoiceRibbon(state, names) {
    var svg = svgEl('svg', { viewBox: '0 0 420 250', role: 'img', class: 'cp-viz-svg' });
    svgEl('title', {}, svg, 'Smooth voice-leading pitch ribbon for the current loop');
    svgEl('rect', { width: 420, height: 250, rx: 12, fill: '#fffdf7', stroke: '#cbd5e1', 'stroke-width': 1.5 }, svg);

    var tonicPc = KEY_PCS[keySel.value] || 0;
    var degs = state.degrees;
    if (!degs.length) {
      svgEl('text', { x: 210, y: 128, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 12.5, 'font-weight': 700, fill: '#475569' }, svg, 'Tap chords above to see smooth voice leading.');
      voiceHost.replaceChildren(svg);
      return;
    }

    var voicings = voiceLoopSmooth(degs, tonicPc);
    var minMidi = 54, maxMidi = 82;
    var leftPad = 38, rightPad = 18, topPad = 34, bottomPad = 34;
    var plotW = 420 - leftPad - rightPad;
    var plotH = 250 - topPad - bottomPad;

    function yForMidi(m) {
      return topPad + plotH - ((m - minMidi) / (maxMidi - minMidi)) * plotH;
    }

    // Subtle octave gridlines (C4=60, G4=67, C5=72)
    [60, 67, 72, 79].forEach(function (m) {
      var y = yForMidi(m);
      svgEl('line', { x1: leftPad, x2: 420 - rightPad, y1: y, y2: y, stroke: '#e2e8f0', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
      var label = NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);
      svgEl('text', { x: leftPad - 6, y: y + 3.5, 'text-anchor': 'end', 'font-family': 'ui-monospace, monospace', 'font-size': 9.5, fill: '#64748b' }, svg, label);
    });

    var stepX = degs.length === 1 ? 0 : plotW / (degs.length - 1);
    var xs = degs.map(function (_, i) { return degs.length === 1 ? leftPad + plotW / 2 : leftPad + i * stepX; });

    // Column bands & chord labels
    degs.forEach(function (deg, i) {
      var x = xs[i];
      var isNow = state.playingIdx === i;
      if (isNow) {
        svgEl('rect', { x: x - 18, y: 12, width: 36, height: 226, rx: 8, fill: FILL_COLORS[deg], opacity: 0.45 }, svg);
      }
      svgEl('text', { x: x, y: 22, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 11, 'font-weight': 800, fill: '#0f172a' }, svg, NUMERALS[deg]);
      svgEl('text', { x: x, y: 236, 'text-anchor': 'middle', 'font-family': 'ui-monospace, monospace', 'font-size': 10, 'font-weight': 700, fill: STROKE_COLORS[deg] }, svg, names[deg]);
    });

    // Connect 3 voices smoothly
    var voiceColors = ['#0f766e', '#2563eb', '#b45309'];
    for (var v = 0; v < 3; v++) {
      for (var i = 0; i < voicings.length - 1; i++) {
        var y1 = yForMidi(voicings[i][v]);
        var y2 = yForMidi(voicings[i + 1][v]);
        var common = voicings[i][v] === voicings[i + 1][v];
        svgEl('line', {
          x1: xs[i], y1: y1, x2: xs[i + 1], y2: y2,
          stroke: common ? '#16a34a' : voiceColors[v],
          'stroke-width': common ? 2.8 : 2,
          'stroke-opacity': common ? 0.95 : 0.72
        }, svg);
      }
    }

    // Note dots
    voicings.forEach(function (chord, i) {
      var isNow = state.playingIdx === i;
      chord.forEach(function (midi, v) {
        var cy = yForMidi(midi);
        svgEl('circle', {
          cx: xs[i], cy: cy, r: isNow ? 6.5 : 5,
          fill: FILL_COLORS[degs[i]],
          stroke: isNow ? '#0f172a' : voiceColors[v],
          'stroke-width': isNow ? 2.4 : 1.8
        }, svg);
      });
    });

    voiceHost.replaceChildren(svg);
  }

  function update() {
    var state = readLoopState();
    var names = scaleChords();
    renderGravityMap(state, names);
    renderVoiceRibbon(state, names);
  }

  var obs = new MutationObserver(update);
  obs.observe(loopEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  keySel.addEventListener('change', update);
  update();
})();
