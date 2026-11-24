'use strict';
(function () {
  var wrap = document.getElementById('tab-live-map-wrap');
  var cfgEl = document.getElementById('lab-config');
  var gameEl = document.getElementById('lab-game');
  var presetEl = document.getElementById('lab-preset');
  var runBtn = document.getElementById('lab-run');
  var resetBtn = document.getElementById('lab-reset');
  if (!wrap || !cfgEl || !gameEl) return;

  var ns = 'http://www.w3.org/2000/svg';
  var selectedId = null;

  wrap.innerHTML =
    '<div class="tab-map-head">' +
      '<h3 class="tab-map-title">Live Room-Graph Map (syncs with JSON config &amp; active room)</h3>' +
      '<div class="tab-map-legend">' +
        '<span><i class="tab-map-dot" style="background:#10b981"></i>Current room</span>' +
        '<span><i class="tab-map-dot" style="background:#f59e0b"></i>Win room</span>' +
        '<span><i class="tab-map-dot" style="background:#dc2626"></i>Unreachable</span>' +
      '</div>' +
    '</div>' +
    '<div class="tab-map-svg-wrap"><svg id="tab-live-map" viewBox="0 0 760 280" role="img" aria-label="Interactive state graph of rooms and exits"></svg></div>' +
    '<p class="tab-map-inspector" id="tab-map-inspector">Click any room node to inspect its exits and contents.</p>';

  var svg = document.getElementById('tab-live-map');
  var inspector = document.getElementById('tab-map-inspector');

  var DIRS = {
    n: [0, -1], north: [0, -1], fore: [0, -1], bow: [0, -1], up: [0.6, -1], u: [0.6, -1],
    s: [0, 1], south: [0, 1], aft: [0, 1], stern: [0, 1], down: [-0.6, 1], d: [-0.6, 1],
    e: [1, 0], east: [1, 0], inland: [1, 0], starboard: [1, 0], right: [1, 0],
    w: [-1, 0], west: [-1, 0], sea: [-1, 0], port: [-1, 0], left: [-1, 0],
    ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1]
  };
  var FALLBACK_DELTAS = [
    [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1],
    [2, 0], [0, 2], [-2, 0], [0, -2]
  ];

  function el(tag, attrs, text) {
    var node = document.createElementNS(ns, tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        node.setAttribute(k, String(attrs[k]));
      }
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function currentRoomName() {
    var chips = gameEl.querySelectorAll('.adv-chip');
    for (var i = 0; i < chips.length; i++) {
      var t = chips[i].textContent || '';
      if (t.indexOf('📍') !== -1) {
        return t.replace('📍', '').trim();
      }
    }
    return '';
  }

  function parseTarget(exitVal) {
    if (typeof exitVal === 'string') return { to: exitVal, locked: false, needs: '' };
    if (exitVal && typeof exitVal === 'object' && exitVal.to) {
      return { to: exitVal.to, locked: Boolean(exitVal.needs), needs: exitVal.needs || '' };
    }
    return null;
  }

  function layoutGraph(cfg) {
    var rooms = cfg && cfg.rooms && typeof cfg.rooms === 'object' ? cfg.rooms : {};
    var ids = Object.keys(rooms);
    var startId = cfg.start && rooms[cfg.start] ? cfg.start : ids[0];
    var coords = {};
    var used = {};
    var reachable = {};

    function claim(id, gx, gy) {
      var key = gx + ',' + gy;
      if (!used[key]) {
        used[key] = id;
        coords[id] = [gx, gy];
        return;
      }
      for (var r = 1; r <= 6; r++) {
        for (var i = 0; i < FALLBACK_DELTAS.length; i++) {
          var cx = gx + FALLBACK_DELTAS[i][0] * r;
          var cy = gy + FALLBACK_DELTAS[i][1] * r;
          var ck = cx + ',' + cy;
          if (!used[ck]) {
            used[ck] = id;
            coords[id] = [cx, cy];
            return;
          }
        }
      }
      coords[id] = [gx, gy];
    }

    if (startId) {
      var queue = [startId];
      reachable[startId] = true;
      claim(startId, 0, 0);
      while (queue.length) {
        var cur = queue.shift();
        var base = coords[cur];
        var exits = (rooms[cur] && rooms[cur].exits) || {};
        var dirKeys = Object.keys(exits);
        for (var d = 0; d < dirKeys.length; d++) {
          var dirName = dirKeys[d];
          var info = parseTarget(exits[dirName]);
          if (!info || !rooms[info.to] || reachable[info.to]) continue;
          reachable[info.to] = true;
          var vec = DIRS[dirName.toLowerCase()] || FALLBACK_DELTAS[d % FALLBACK_DELTAS.length];
          claim(info.to, Math.round(base[0] + vec[0]), Math.round(base[1] + vec[1]));
          queue.push(info.to);
        }
      }
    }

    // Place unreachable rooms cleanly at the bottom row
    var maxY = 0;
    for (var k in coords) {
      if (coords[k][1] > maxY) maxY = coords[k][1];
    }
    var orphanIndex = 0;
    ids.forEach(function (id) {
      if (!reachable[id]) {
        claim(id, orphanIndex++, maxY + 1);
      }
    });

    return { ids: ids, rooms: rooms, startId: startId, coords: coords, reachable: reachable };
  }

  function inspectRoom(id, cfg, graph) {
    var room = graph.rooms[id];
    if (!room) return;
    selectedId = id;
    var exits = room.exits ? Object.keys(room.exits).map(function (dir) {
      var t = parseTarget(room.exits[dir]);
      return t ? (dir + '→' + t.to + (t.locked ? ' (needs ' + t.needs + ')' : '')) : dir;
    }) : [];
    var items = [];
    if (cfg.items && typeof cfg.items === 'object') {
      Object.keys(cfg.items).forEach(function (itemKey) {
        if (cfg.items[itemKey] && cfg.items[itemKey].at === id) {
          items.push(cfg.items[itemKey].name || itemKey);
        }
      });
    }
    inspector.textContent =
      'Room "' + (room.name || id) + '" [' + id + '] · ' +
      (graph.reachable[id] ? 'Reachable from start' : '⚠ Unreachable orphan room') +
      (exits.length ? ' · Exits: ' + exits.join(', ') : ' · Dead end (no exits)') +
      (items.length ? ' · Items here: ' + items.join(', ') : '');
  }

  function render() {
    var cfg;
    try {
      cfg = JSON.parse(cfgEl.value || '{}');
    } catch (e) {
      svg.setAttribute('viewBox', '0 0 760 120');
      svg.replaceChildren(
        el('text', { x: 380, y: 65, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 13, fill: '#b91c1c' },
          'Fix JSON syntax in the config box to redraw the live room graph.')
      );
      inspector.textContent = 'Waiting for valid JSON config…';
      return;
    }

    var graph = layoutGraph(cfg);
    if (!graph.ids.length) {
      svg.setAttribute('viewBox', '0 0 760 120');
      svg.replaceChildren(
        el('text', { x: 380, y: 65, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 13, fill: '#64748b' },
          'Add rooms to "rooms" in your config to see the state graph.')
      );
      return;
    }

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    graph.ids.forEach(function (id) {
      var p = graph.coords[id];
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    });

    var cellW = 192;
    var cellH = 104;
    var nodeW = 148;
    var nodeH = 54;
    var padX = 48;
    var padY = 38;
    var vw = Math.max(540, (maxX - minX) * cellW + nodeW + padX * 2);
    var vh = Math.max(190, (maxY - minY) * cellH + nodeH + padY * 2);
    svg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);

    var centerOf = {};
    graph.ids.forEach(function (id) {
      var p = graph.coords[id];
      var cx = padX + (p[0] - minX) * cellW + nodeW / 2;
      var cy = padY + (p[1] - minY) * cellH + nodeH / 2;
      centerOf[id] = [cx, cy];
    });

    var defs = el('defs', {});
    var marker = el('marker', { id: 'tab-live-arr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' });
    marker.appendChild(el('path', { d: 'M 0 1 L 8 5 L 0 9 z', fill: '#64748b' }));
    var markerLock = el('marker', { id: 'tab-live-arr-lock', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' });
    markerLock.appendChild(el('path', { d: 'M 0 1 L 8 5 L 0 9 z', fill: '#d97706' }));
    defs.appendChild(marker);
    defs.appendChild(markerLock);

    var edgeLayer = el('g', {});
    var nodeLayer = el('g', {});

    // Map directed edges and offset opposite pairs slightly
    var hasEdge = {};
    graph.ids.forEach(function (fromId) {
      var exits = (graph.rooms[fromId] && graph.rooms[fromId].exits) || {};
      Object.keys(exits).forEach(function (dir) {
        var t = parseTarget(exits[dir]);
        if (t && graph.rooms[t.to]) hasEdge[fromId + '->' + t.to] = true;
      });
    });

    graph.ids.forEach(function (fromId) {
      var exits = (graph.rooms[fromId] && graph.rooms[fromId].exits) || {};
      Object.keys(exits).forEach(function (dir) {
        var t = parseTarget(exits[dir]);
        if (!t || !centerOf[t.to] || t.to === fromId) return;
        var a = centerOf[fromId];
        var b = centerOf[t.to];
        var dx = b[0] - a[0];
        var dy = b[1] - a[1];
        var len = Math.hypot(dx, dy) || 1;
        var ux = dx / len;
        var uy = dy / len;
        var reverse = Boolean(hasEdge[t.to + '->' + fromId]);
        var curve = reverse ? 14 : 0;
        var nx = -uy * curve;
        var ny = ux * curve;
        var x1 = a[0] + ux * (nodeW * 0.34);
        var y1 = a[1] + uy * (nodeH * 0.36);
        var x2 = b[0] - ux * (nodeW * 0.42);
        var y2 = b[1] - uy * (nodeH * 0.44);
        var mx = (x1 + x2) / 2 + nx;
        var my = (y1 + y2) / 2 + ny;
        var dAttr = 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Q ' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1);

        edgeLayer.appendChild(el('path', {
          d: dAttr,
          fill: 'none',
          stroke: t.locked ? '#d97706' : '#64748b',
          'stroke-width': t.locked ? 2 : 1.7,
          'stroke-dasharray': t.locked ? '5 4' : 'none',
          'marker-end': t.locked ? 'url(#tab-live-arr-lock)' : 'url(#tab-live-arr)'
        }));
        var lblText = dir + (t.locked ? ' 🔒' : '');
        edgeLayer.appendChild(el('rect', {
          x: mx - Math.max(18, lblText.length * 3.4), y: my - 9,
          width: Math.max(36, lblText.length * 6.8), height: 15, rx: 4,
          fill: t.locked ? '#fef3c7' : '#f1f5f9', stroke: t.locked ? '#f59e0b' : '#cbd5e1', 'stroke-width': 0.8
        }));
        edgeLayer.appendChild(el('text', {
          x: mx, y: my + 2, 'text-anchor': 'middle',
          'font-family': 'ui-monospace, monospace', 'font-size': 9.5, 'font-weight': 700,
          fill: t.locked ? '#92400e' : '#334155'
        }, lblText));
      });
    });

    var activeName = currentRoomName();
    var winRoom = cfg.win && cfg.win.room ? cfg.win.room : '';

    graph.ids.forEach(function (id) {
      var room = graph.rooms[id];
      var c = centerOf[id];
      var x = c[0] - nodeW / 2;
      var y = c[1] - nodeH / 2;
      var isReachable = Boolean(graph.reachable[id]);
      var isActive = activeName && activeName !== 'Somewhere dark' && (room.name || id) === activeName;
      var isStart = id === graph.startId;
      var isWin = id === winRoom;
      var isDark = Boolean(room.dark);

      var fill = '#ffffff';
      var stroke = '#475569';
      var strokeW = 1.6;
      if (!isReachable) { fill = '#fef2f2'; stroke = '#dc2626'; strokeW = 2; }
      else if (isActive) { fill = '#ecfdf5'; stroke = '#059669'; strokeW = 3; }
      else if (isWin) { fill = '#fffbeb'; stroke = '#d97706'; strokeW = 2.2; }
      else if (isDark) { fill = '#f1f5f9'; stroke = '#334155'; }

      var g = el('g', {
        class: 'tab-map-node',
        tabindex: '0',
        role: 'button',
        'aria-label': (room.name || id) + (isActive ? ', current room' : '')
      });

      g.appendChild(el('rect', {
        class: 'tab-node-box',
        x: x, y: y, width: nodeW, height: nodeH, rx: 10,
        fill: fill, stroke: stroke, 'stroke-width': strokeW,
        'stroke-dasharray': isReachable ? 'none' : '5 3'
      }));

      var badges = [];
      if (isActive) badges.push(['YOU', '#059669']);
      else if (isStart) badges.push(['START', '#0f766e']);
      if (isWin) badges.push(['WIN', '#d97706']);
      if (!isReachable) badges.push(['ORPHAN', '#dc2626']);
      else if (isDark) badges.push(['DARK', '#475569']);

      var bx = x + 8;
      badges.slice(0, 2).forEach(function (b) {
        var bw = b[0].length * 6.5 + 10;
        g.appendChild(el('rect', { x: bx, y: y + 6, width: bw, height: 14, rx: 7, fill: b[1] }));
        g.appendChild(el('text', { x: bx + bw / 2, y: y + 16, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 8.5, 'font-weight': 700, fill: '#fff' }, b[0]));
        bx += bw + 4;
      });

      var title = (room.name || id);
      if (title.length > 20) title = title.slice(0, 19) + '…';
      g.appendChild(el('text', {
        x: c[0], y: y + (badges.length ? 36 : 29), 'text-anchor': 'middle',
        'font-family': 'system-ui, sans-serif', 'font-size': 12, 'font-weight': 700, fill: '#0f172a'
      }, title));

      g.appendChild(el('text', {
        x: c[0], y: y + nodeH - 6, 'text-anchor': 'middle',
        'font-family': 'ui-monospace, monospace', 'font-size': 9.5, fill: '#64748b'
      }, 'id: ' + id));

      g.addEventListener('click', function () { inspectRoom(id, cfg, graph); });
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          inspectRoom(id, cfg, graph);
        }
      });
      nodeLayer.appendChild(g);
    });

    svg.replaceChildren(defs, edgeLayer, nodeLayer);
    if (selectedId && graph.rooms[selectedId]) {
      inspectRoom(selectedId, cfg, graph);
    } else if (activeName === 'Somewhere dark') {
      inspector.textContent = 'You are in a dark room without light! Light a source (like a flashlight) or inspect any node above.';
    }
  }

  var timer = null;
  function scheduleRender() {
    clearTimeout(timer);
    timer = setTimeout(render, 120);
  }

  cfgEl.addEventListener('input', scheduleRender);
  if (presetEl) presetEl.addEventListener('change', function () { setTimeout(render, 30); });
  if (runBtn) runBtn.addEventListener('click', function () { setTimeout(render, 30); });
  if (resetBtn) resetBtn.addEventListener('click', function () { setTimeout(render, 30); });

  var mo = new MutationObserver(render);
  mo.observe(gameEl, { childList: true, subtree: true, characterData: true });

  // Wait a microtask in case inline preset init populates #lab-config right after
  render();
  setTimeout(render, 60);
})();
