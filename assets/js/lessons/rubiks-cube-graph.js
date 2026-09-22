/**
 * rubiks-cube-graph.js — the Cayley graph of the Rubik's Cube group.
 *
 * Vertices are cube states, edges are single quarter turns. The full graph has
 * 43 quintillion vertices, so mode 1 draws the ball of radius r around "solved"
 * (built by real breadth-first search over the model in rubiks-cube-solver.js),
 * and mode 2 draws the cycle a repeated move sequence traces (its order).
 */
(function () {
  'use strict';
  var Cube = window.RubiksCube;
  var canvas = document.getElementById('rcg-canvas');
  if (!Cube || !canvas) return;

  var GENS = ['U', "U'", 'D', "D'", 'R', "R'", 'L', "L'", 'F', "F'", 'B', "B'"];
  var FACE_HEX = { U: '#ffd500', D: '#f2f2f0', F: '#00a94f', B: '#3b82f6', L: '#e0324f', R: '#ff7a1f' };
  var MAX_DEPTH = 3;
  var $ = function (id) { return document.getElementById(id); };
  var ctx = canvas.getContext('2d');

  var mode = 'ball';
  var depth = 2;
  var graph = null;         // { nodes, index, layers }
  var walkPath = [];        // moves applied from solved by the walker
  var hover = -1;
  var cyc = null;           // { seq, states, order }
  var W = 0, H = 0;

  /* ── BFS ball ─────────────────────────────────────────────────────────── */

  function buildGraph() {
    var start = Cube.SOLVED.slice();
    var nodes = [{ st: start, key: start.join(''), d: 0, parent: -1, via: null, path: [] }];
    var index = {}; index[nodes[0].key] = 0;
    var layers = [[0]];
    for (var d = 1; d <= MAX_DEPTH; d++) {
      var layer = [];
      layers[d - 1].forEach(function (pi) {
        GENS.forEach(function (g) {
          var st = Cube.applyMove(nodes[pi].st, g), key = st.join('');
          if (index[key] !== undefined) return;
          index[key] = nodes.length;
          layer.push(nodes.length);
          nodes.push({ st: st, key: key, d: d, parent: pi, via: g, path: nodes[pi].path.concat(g) });
        });
      });
      layers.push(layer);
    }
    // adjacency (only within the ball), keeping the generator that links a pair
    nodes.forEach(function (n, i) {
      n.adj = [];
      if (n.d >= MAX_DEPTH) return;
      GENS.forEach(function (g) {
        var j = index[Cube.applyMove(n.st, g).join('')];
        if (j !== undefined) n.adj.push({ to: j, g: g });
      });
    });
    return { nodes: nodes, index: index, layers: layers };
  }

  /* Radial layout: each node owns an angular wedge sized by its subtree. */
  function layout(g) {
    var nodes = g.nodes, kids = nodes.map(function () { return []; });
    nodes.forEach(function (n, i) { if (n.parent >= 0) kids[n.parent].push(i); });
    var size = new Array(nodes.length).fill(1);
    for (var i = nodes.length - 1; i > 0; i--) size[nodes[i].parent] += size[i];
    function place(i, a0, a1) {
      nodes[i].ang = (a0 + a1) / 2;
      var a = a0;
      kids[i].forEach(function (k) {
        var span = (a1 - a0) * size[k] / (size[i] - 1);
        place(k, a, a + span); a += span;
      });
    }
    place(0, -Math.PI / 2, 1.5 * Math.PI);
  }

  function visible(n) { return n.d <= depth; }

  /* ── Drawing ──────────────────────────────────────────────────────────── */

  function css(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = w; H = h;
  }

  function pos(n) {
    var R = Math.min(W, H) / 2 - 16;
    var r = n.d === 0 ? 0 : R * Math.pow(n.d / depth, 0.85);
    return [W / 2 + Math.cos(n.ang) * r, H / 2 + Math.sin(n.ang) * r];
  }

  function walkerIndex() {
    if (!graph) return -1;
    var st = Cube.applySeq(Cube.SOLVED, walkPath);
    var i = graph.index[st.join('')];
    return i === undefined ? -1 : i;
  }

  function drawBall() {
    var nodes = graph.nodes, wi = walkerIndex();
    var text = css('--text', '#1d1d1f');
    ctx.lineWidth = 1;
    nodes.forEach(function (n, i) {
      if (!visible(n)) return;
      var p = pos(n);
      n.adj.forEach(function (e) {
        if (e.to < i || !visible(nodes[e.to])) return;
        var q = pos(nodes[e.to]);
        ctx.strokeStyle = FACE_HEX[e.g.charAt(0)];
        ctx.globalAlpha = depth >= 3 ? 0.22 : 0.55;
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      });
    });
    ctx.globalAlpha = 1;
    // highlighted path (hover or walker)
    var target = hover >= 0 ? hover : wi;
    if (target >= 0) {
      ctx.lineWidth = 3; ctx.strokeStyle = text; ctx.beginPath();
      for (var k = target; k >= 0; k = nodes[k].parent) {
        var p2 = pos(nodes[k]);
        if (k === target) ctx.moveTo(p2[0], p2[1]); else ctx.lineTo(p2[0], p2[1]);
      }
      ctx.stroke();
    }
    var r = depth >= 3 ? 1.1 : depth === 2 ? 3.6 : 6;
    nodes.forEach(function (n, i) {
      if (!visible(n)) return;
      var p = pos(n);
      ctx.fillStyle = n.d === 0 ? '#22c55e' : text;
      ctx.globalAlpha = n.d === 0 ? 1 : 0.75;
      ctx.beginPath(); ctx.arc(p[0], p[1], n.d === 0 ? 8 : r, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (wi >= 0) {
      var w = pos(nodes[wi]);
      ctx.fillStyle = '#8b5cf6'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w[0], w[1], 8, 0, 7); ctx.fill(); ctx.stroke();
    }
    if (hover >= 0) {
      var h = pos(nodes[hover]);
      ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h[0], h[1], 9, 0, 7); ctx.stroke();
    }
  }

  function drawCycle() {
    var text = css('--text', '#1d1d1f');
    if (!cyc) return;
    var n = cyc.order, R = Math.min(W, H) / 2 - 30, cx = W / 2, cy = H / 2;
    function at(i) {
      var a = -Math.PI / 2 + 2 * Math.PI * i / n;
      return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    }
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2; ctx.beginPath();
    for (var i = 0; i <= n; i++) { var p = at(i % n); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
    ctx.stroke();
    var rr = n > 200 ? 1.6 : n > 60 ? 2.6 : n > 20 ? 4 : 7;
    for (var j = 0; j < n; j++) {
      var q = at(j);
      ctx.fillStyle = j === 0 ? '#22c55e' : text;
      ctx.beginPath(); ctx.arc(q[0], q[1], j === 0 ? Math.max(rr, 5) : rr, 0, 7); ctx.fill();
      if (n <= 24) {
        var lx = cx + (q[0] - cx) * 1.11, ly = cy + (q[1] - cy) * 1.11;
        ctx.fillStyle = text; ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(j), lx, ly);
      }
    }
    ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('order ' + n, cx, cy - 8);
    ctx.font = '12px system-ui, sans-serif'; ctx.globalAlpha = 0.7;
    ctx.fillText('(' + cyc.seq.join(' ') + ')^' + n + ' = solved', cx, cy + 14);
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (!W) size();
    ctx.clearRect(0, 0, W, H);
    if (mode === 'ball') drawBall(); else drawCycle();
  }

  /* ── Ball-mode UI ─────────────────────────────────────────────────────── */

  function fmt(n) { return n.toLocaleString('en-US'); }

  function renderCounts() {
    var body = $('rcg-counts');
    var rows = '', total = 0;
    graph.layers.forEach(function (l, d) {
      total += l.length;
      rows += '<tr' + (d <= depth ? '' : ' class="rcg-dim"') + '><td>' + d + '</td><td>' + fmt(l.length) +
        '</td><td>' + (d ? (l.length / graph.layers[d - 1].length).toFixed(1) + '×' : '—') + '</td></tr>';
    });
    body.innerHTML = rows;
  }

  function renderInfo() {
    var el = $('rcg-info');
    if (mode !== 'ball') return;
    var wi = walkerIndex();
    var word = walkPath.length ? walkPath.join(' ') : '(empty — the solved cube)';
    var msg = 'Walker: ' + word + '. ';
    if (wi >= 0) {
      msg += 'This state is exactly ' + graph.nodes[wi].d + ' quarter-turn' + (graph.nodes[wi].d === 1 ? '' : 's') + ' from solved.';
    } else {
      msg += 'That state is more than ' + MAX_DEPTH + ' turns from solved, so it lies beyond the drawn graph.';
    }
    if (hover >= 0) msg += ' Hovering: ' + (graph.nodes[hover].path.join(' ') || 'solved') + ' (' + graph.nodes[hover].d + ' turns).';
    el.textContent = msg;
  }

  function nearest(mx, my) {
    var best = -1, bd = 14 * 14;
    graph.nodes.forEach(function (n, i) {
      if (!visible(n)) return;
      var p = pos(n), dx = p[0] - mx, dy = p[1] - my, dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = i; }
    });
    return best;
  }

  function setWalk(path) {
    walkPath = path;
    if (walkPath.length > 40) walkPath = walkPath.slice(-40);
    renderInfo(); draw();
  }

  /* ── Cycle-mode ───────────────────────────────────────────────────────── */

  function parseSeq(s) {
    var toks = s.trim().split(/\s+/).filter(Boolean), out = [];
    for (var i = 0; i < toks.length; i++) {
      var m = /^([UDLRFB])(2|'|2')?$/.exec(toks[i].replace(/’/g, "'"));
      if (!m) return null;
      if (m[2] === '2' || m[2] === "2'") out.push(m[1], m[1]); else out.push(m[1] + (m[2] || ''));
    }
    return out;
  }

  function runCycle() {
    var input = $('rcg-seq'), err = $('rcg-seq-err');
    var seq = parseSeq(input.value);
    if (!seq || !seq.length) {
      err.textContent = "Use moves like U, R', F2 separated by spaces."; return;
    }
    err.textContent = '';
    var st = Cube.SOLVED.slice(), order = 0;
    do { st = Cube.applySeq(st, seq); order++; } while (!Cube.isSolved(st) && order < 1300);
    cyc = { seq: input.value.trim().split(/\s+/), order: order };
    $('rcg-cycle-info').textContent = 'Repeating ' + cyc.seq.join(' ') + ' returns the cube to solved after ' + order +
      ' repetitions, so it traces a cycle of length ' + order + ' through the graph. ' +
      'That number is the element’s order. Its cycle is a copy of Z' + order + ' inside the cube group.';
    draw();
  }

  /* ── Wiring ───────────────────────────────────────────────────────────── */

  function setMode(m) {
    mode = m;
    document.querySelectorAll('[data-rcg-mode]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.rcgMode === m));
    });
    $('rcg-ball-ui').hidden = m !== 'ball';
    $('rcg-cycle-ui').hidden = m !== 'cycle';
    canvas.setAttribute('aria-label', m === 'ball'
      ? 'Cayley graph: cube states within ' + depth + ' turns of solved, drawn as rings'
      : 'Cycle traced by repeating a move sequence');
    if (m === 'cycle' && !cyc) runCycle();
    renderInfo(); draw();
  }

  function init() {
    graph = buildGraph(); layout(graph);
    size(); renderCounts(); renderInfo();

    document.querySelectorAll('[data-rcg-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.dataset.rcgMode); });
    });
    $('rcg-depth').addEventListener('input', function (e) {
      depth = +e.target.value; $('rcg-depth-out').textContent = depth;
      canvas.setAttribute('aria-label', 'Cayley graph: cube states within ' + depth + ' turns of solved, drawn as rings');
      renderCounts(); draw();
    });
    var gens = $('rcg-gens');
    GENS.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rc-btn rcg-gen'; b.textContent = g;
      b.style.borderBottom = '3px solid ' + FACE_HEX[g.charAt(0)];
      b.setAttribute('aria-label', 'Turn ' + g.charAt(0) + (g.length > 1 ? ' counterclockwise' : ' clockwise'));
      b.addEventListener('click', function () {
        var last = walkPath[walkPath.length - 1];
        setWalk(last === Cube.invertMove(g) ? walkPath.slice(0, -1) : walkPath.concat(g));
      });
      gens.appendChild(b);
    });
    $('rcg-reset').addEventListener('click', function () { setWalk([]); });
    $('rcg-undo').addEventListener('click', function () { setWalk(walkPath.slice(0, -1)); });

    canvas.addEventListener('mousemove', function (e) {
      if (mode !== 'ball') return;
      var r = canvas.getBoundingClientRect();
      var h = nearest(e.clientX - r.left, e.clientY - r.top);
      if (h !== hover) { hover = h; renderInfo(); draw(); }
    });
    canvas.addEventListener('mouseleave', function () { hover = -1; renderInfo(); draw(); });
    canvas.addEventListener('click', function () {
      if (mode === 'ball' && hover >= 0) setWalk(graph.nodes[hover].path.slice());
    });

    $('rcg-preset').addEventListener('change', function (e) {
      if (e.target.value) { $('rcg-seq').value = e.target.value; runCycle(); }
    });
    $('rcg-run').addEventListener('click', runCycle);
    $('rcg-seq').addEventListener('keydown', function (e) { if (e.key === 'Enter') runCycle(); });

    window.addEventListener('resize', function () { size(); draw(); });
    new MutationObserver(draw).observe(document.documentElement, { attributes: true });
    setMode('ball');
  }

  init();
}());
