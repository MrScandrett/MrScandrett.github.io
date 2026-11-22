/* MST Visualiser for lessons/computer-science/algorithms-and-ai/minimum-spanning-tree.html.
 * The algorithms live in mst-core.js (DOM-free, tested); this file only draws and wires.
 * Each algorithm is a precomputed trace, so Step and Back are just moving through it. */
(function () {
  'use strict';
  /* Practice checkers (used by the onclick handlers in the Practice Problems card). */
  function mark(n, ok, emptyMsg, empty) {
    const input = document.getElementById('mstans-' + n);
    const fb = document.getElementById('mstfb-' + n);
    const hint = document.getElementById('msthint-' + n);
    fb.className = 'cl-feedback';
    if (empty) { fb.textContent = emptyMsg; fb.classList.add('err'); return; }
    fb.textContent = ok ? '✓ Correct!' : '✗ Try again';
    fb.classList.add(ok ? 'ok' : 'err');
    hint.style.display = ok ? 'none' : 'block';
    input.style.borderColor = ok ? '#34c759' : '#ff3b30';
  }
  window.mstCheck = function (n, correct, tol) {
    const val = parseFloat(document.getElementById('mstans-' + n).value);
    mark(n, Math.abs(val - correct) <= tol, 'Enter a number.', isNaN(val));
  };
  window.mstCheckText = function (n, correct) {
    const v = document.getElementById('mstans-' + n).value;
    mark(n, v === correct, 'Make a selection.', !v);
  };
})();

(function () {
  'use strict';
  const M = window.MstCore;
  const canvas = document.getElementById('mst-canvas');
  if (!M || !canvas || !window.SimKit) return;

  const $ = (id) => document.getElementById(id);
  const ui = {
    wrap: canvas.parentElement,
    narr: $('mst-narration'),
    queue: $('mst-queue'),
    queueLabel: $('mst-queue-label'),
    r1: $('mst-r-cost'), r1l: $('mst-r-cost-label'),
    r2: $('mst-r-added'), r2l: $('mst-r-added-label'),
    r3: $('mst-r-considered'), r3l: $('mst-r-considered-label'),
    slider: $('mst-node-count'), sliderVal: $('mst-node-val'),
    play: $('mst-play'), back: $('mst-back'), step: $('mst-step'),
    stepBar: $('mst-stepbar'), buildBar: $('mst-buildbar'),
    instr: $('mst-sim-instructions')
  };
  const legends = { kruskal: $('mst-legend-kruskal'), prim: $('mst-legend-prim'), build: $('mst-legend-build') };
  const modeBtns = { kruskal: $('mst-algo-kruskal'), prim: $('mst-algo-prim'), build: $('mst-algo-build') };

  const C = { add: '#34c759', rej: '#ff3b30', cur: '#ff9f0a', front: '#007aff', mine: '#5856d6' };
  const INSTR = {
    kruskal: 'Kruskal looks at the edges cheapest first (the queue below) and keeps each one unless its two ends are <em>already</em> joined. Node colours show which pieces have joined up so far.',
    prim: 'Prim grows one tree from a start node. The blue edges cross from the tree to everything else; each step takes the cheapest of them. Click a node before the first step to start somewhere else.',
    build: 'Your turn: click edges to build your own spanning tree, then press <strong>Check my tree</strong>. Can you match the cheapest possible cost?'
  };

  let S = { mode: 'kruskal', g: null, k: 0, kr: null, pr: null, start: 0, chosen: new Set(), reveal: false, checked: null };
  let view = { w: 600, h: 300, pts: [] };
  let player = null, acc = 0;

  const L = (i) => M.label(i);
  const ename = (i) => L(S.g.edges[i].a) + '–' + L(S.g.edges[i].b);
  const night = () => document.documentElement.getAttribute('data-lighting') === 'night';

  /* ── Graph + traces ─────────────────────────────── */
  function generate(seed) {
    stopPlay();
    const n = parseInt(ui.slider.value, 10);
    S.g = M.makeGraph(n, seed == null ? (Math.random() * 1e9) | 0 : seed);
    S.kr = M.kruskalTrace(S.g);
    S.start = 0;
    S.pr = M.primTrace(S.g, 0);
    S.chosen = new Set();
    resetSteps();
  }
  function resetSteps() {
    stopPlay();
    S.k = 0; S.reveal = false; S.checked = null;
    render();
  }
  const trace = () => (S.mode === 'prim' ? S.pr : S.kr);

  /* ── What every edge and node looks like at step k ── */
  function snapshot() {
    const { g, k } = S;
    const edgeState = new Array(g.edges.length).fill('none');
    const nodeFill = new Array(g.nodes.length).fill(null);
    let current = -1, cycle = [], cost = 0, added = 0, considered = 0;

    if (S.mode === 'kruskal') {
      const steps = S.kr.steps.slice(0, k);
      steps.forEach((s) => { edgeState[s.edge] = s.action === 'add' ? 'added' : 'rejected'; });
      const last = steps[steps.length - 1];
      if (last) { current = last.edge; cost = last.cost; if (last.action === 'reject') cycle = last.cycle; }
      added = steps.filter((s) => s.action === 'add').length;
      considered = steps.length;
      if (k === S.kr.steps.length) edgeState.forEach((st, i) => { if (st === 'none') edgeState[i] = 'skipped'; });
      const tree = last ? last.tree : [];
      const comp = M.components(g.nodes.length, tree, g.edges);
      const sizes = {};
      comp.of.forEach((c) => { sizes[c] = (sizes[c] || 0) + 1; });
      comp.of.forEach((c, i) => { if (sizes[c] > 1) nodeFill[i] = c; });
    } else if (S.mode === 'prim') {
      const steps = S.pr.steps.slice(0, k);
      const last = steps[steps.length - 1];
      const inTree = new Set(last ? last.inTree : [S.start]);
      steps.forEach((s) => { edgeState[s.edge] = 'added'; });
      g.edges.forEach((e, i) => {
        if (edgeState[i] === 'added') return;
        const ai = inTree.has(e.a), bi = inTree.has(e.b);
        if (ai !== bi) edgeState[i] = 'frontier';
        else if (ai && bi) edgeState[i] = 'rejected';
      });
      inTree.forEach((v) => { nodeFill[v] = 0; });
      if (last) { current = last.edge; cost = last.cost; }
      added = steps.length;
      considered = steps.reduce((t, s) => t + s.frontier.length, 0);
    } else {
      S.chosen.forEach((i) => { edgeState[i] = 'mine'; });
      if (S.reveal) S.kr.tree.forEach((i) => { if (edgeState[i] !== 'mine') edgeState[i] = 'answer'; else edgeState[i] = 'mine-ok'; });
      const comp = M.components(g.nodes.length, Array.from(S.chosen), g.edges);
      const sizes = {};
      comp.of.forEach((c) => { sizes[c] = (sizes[c] || 0) + 1; });
      comp.of.forEach((c, i) => { if (sizes[c] > 1) nodeFill[i] = c; });
    }
    return { edgeState, nodeFill, current, cycle, cost, added, considered };
  }

  /* ── Drawing ────────────────────────────────────── */
  const sized = SimKit.canvas2d(canvas, { box: ui.wrap, onResize: (ctx, w, h) => { view.w = w; view.h = h; draw(); } });
  const ctx = sized.ctx;

  function layout() {
    const pad = Math.max(26, Math.min(40, view.w * 0.05));
    view.pts = S.g.nodes.map((p) => ({ x: pad + p.x * (view.w - pad * 2), y: pad + p.y * (view.h - pad * 2) }));
    view.r = Math.max(11, Math.min(17, Math.min(view.w, view.h) / 18));
  }

  function compColour(c, alpha) {
    const hue = [28, 205, 140, 285, 350, 55, 175, 245, 95, 320, 10, 190][c % 12];
    return `hsla(${hue}, 85%, ${night() ? 45 : 70}%, ${alpha})`;
  }

  function draw() {
    if (!S.g) return;
    layout();
    const { w, h, pts, r } = view;
    const dark = night();
    const text = SimKit.theme.colors().text;
    const bg = getComputedStyle(ui.wrap).backgroundColor || (dark ? '#1c1c1e' : '#f7f8fa');
    const font = getComputedStyle(document.body).fontFamily;
    const snap = snapshot();
    ctx.clearRect(0, 0, w, h);

    // Prim: shade the tree so the cut is visible.
    if (S.mode === 'prim') {
      ctx.fillStyle = dark ? 'rgba(52,199,89,0.16)' : 'rgba(52,199,89,0.14)';
      snap.nodeFill.forEach((f, i) => { if (f === 0) { ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, r * 2.1, 0, Math.PI * 2); ctx.fill(); } });
    }

    const style = {
      none:      [dark ? 'rgba(255,255,255,0.22)' : '#c5c7cf', 1.6, []],
      skipped:   [dark ? 'rgba(255,255,255,0.12)' : '#e1e2e7', 1.2, [4, 4]],
      added:     [C.add, 4.5, []],
      rejected:  [C.rej, 2, [6, 5]],
      frontier:  [C.front, 2.6, []],
      mine:      [C.mine, 4.5, []],
      'mine-ok': [C.add, 4.5, []],
      answer:    [C.add, 3, [3, 5]]
    };
    const order = ['skipped', 'none', 'rejected', 'answer', 'frontier', 'mine', 'mine-ok', 'added'];
    const idx = S.g.edges.map((_, i) => i).sort((a, b) => order.indexOf(snap.edgeState[a]) - order.indexOf(snap.edgeState[b]));

    // Highlight the loop a rejected edge would close.
    if (snap.cycle.length) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,59,48,0.4)';
      ctx.lineWidth = 12; ctx.lineCap = 'round';
      snap.cycle.concat(snap.current).forEach((i) => { const e = S.g.edges[i]; ctx.beginPath(); ctx.moveTo(pts[e.a].x, pts[e.a].y); ctx.lineTo(pts[e.b].x, pts[e.b].y); ctx.stroke(); });
      ctx.restore();
    }

    idx.forEach((i) => {
      const e = S.g.edges[i];
      const [col, lw, dash] = style[snap.edgeState[i]];
      ctx.save();
      if (i === snap.current) {
        ctx.strokeStyle = C.cur; ctx.lineWidth = lw + 6; ctx.globalAlpha = 0.45; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pts[e.a].x, pts[e.a].y); ctx.lineTo(pts[e.b].x, pts[e.b].y); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pts[e.a].x, pts[e.a].y); ctx.lineTo(pts[e.b].x, pts[e.b].y); ctx.stroke();
      ctx.restore();
    });

    // Weight pills, drawn after every line so no line crosses a number.
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    S.g.edges.forEach((e, i) => {
      const st = snap.edgeState[i];
      const mx = (pts[e.a].x + pts[e.b].x) / 2, my = (pts[e.a].y + pts[e.b].y) / 2;
      const strong = st !== 'none' && st !== 'skipped';
      ctx.font = `${strong ? 800 : 600} ${Math.round(r * 0.72)}px ${font}`;
      const tw = ctx.measureText(String(e.w)).width + 8, th = r * 1.05;
      ctx.fillStyle = bg;
      ctx.strokeStyle = i === snap.current ? C.cur : (strong ? style[st][0] : 'transparent');
      ctx.lineWidth = 1.5;
      roundRect(mx - tw / 2, my - th / 2, tw, th, th / 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = st === 'skipped' ? (dark ? 'rgba(255,255,255,0.35)' : '#9aa0ab') : text;
      ctx.fillText(String(e.w), mx, my + 0.5);
    });

    // Nodes.
    pts.forEach((p, i) => {
      const f = snap.nodeFill[i];
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = f == null ? (dark ? '#2c2c2e' : '#fff') : (S.mode === 'prim' ? (dark ? '#1f5130' : '#d6f5dd') : compColour(f, 1));
      ctx.fill();
      const isStart = S.mode === 'prim' && i === S.start;
      ctx.strokeStyle = isStart ? C.add : (dark ? 'rgba(255,255,255,0.7)' : '#3a3a3c');
      ctx.lineWidth = isStart ? 3.5 : 2;
      ctx.stroke();
      ctx.fillStyle = f == null ? text : (dark ? '#fff' : '#1d1d1f');
      ctx.font = `800 ${Math.round(r * 0.85)}px ${font}`;
      ctx.fillText(L(i), p.x, p.y + 0.5);
    });
    ctx.textBaseline = 'alphabetic';
  }

  function roundRect(x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  /* ── Words: narration, queue, readouts ──────────── */
  function narrate(snap) {
    const n = S.g.nodes.length;
    const t = trace();
    if (S.mode === 'build') {
      const r = S.checked;
      if (S.reveal) return `Dashed green shows a cheapest tree: cost <strong>${S.kr.cost}</strong>. Solid green edges are ones you got right.`;
      if (!r) return S.chosen.size ? `${S.chosen.size} of ${n - 1} edges chosen. Keep going, then press <strong>Check my tree</strong>.` : `Click an edge to add it to your network. A spanning tree on ${n} nodes needs exactly ${n - 1} edges.`;
      if (r.hasCycle) return `Not a tree yet: <strong>${ename(r.cycleEdge)}</strong> closes a loop, so one of those edges is wasted cable.`;
      if (r.pieces > 1) return `Not connected yet: your network is in <strong>${r.pieces} separate pieces</strong>. ${r.count < r.need ? `Add ${r.need - r.count} more edge${r.need - r.count === 1 ? ' that joins' : 's that join'} them.` : 'Swap one for an edge that joins them.'}`;
      if (r.optimal) return `✓ <strong>Perfect.</strong> Your tree costs ${r.cost}, the cheapest possible. That's a minimum spanning tree.`;
      return `It's a spanning tree, costing <strong>${r.cost}</strong>, but the cheapest possible is ${r.best} (${r.cost - r.best} less). Look for an expensive edge you could swap for a cheaper one across the same gap.`;
    }
    if (S.k === 0) {
      return S.mode === 'kruskal'
        ? `Every node starts as its own piece. Kruskal will look at the ${S.g.edges.length} edges cheapest first. Press <strong>Step</strong>.`
        : `The tree starts as just <strong>${L(S.start)}</strong>. The blue edges cross out of it; Prim takes the cheapest. Press <strong>Step</strong>.`;
    }
    const s = t.steps[S.k - 1];
    const e = S.g.edges[s.edge];
    const done = S.k === t.steps.length;
    let msg;
    if (S.mode === 'kruskal') {
      if (s.action === 'add') msg = `<strong>${ename(s.edge)} (${e.w})</strong> joins two separate pieces, so it's safe: <span class="mst-ok">added</span>.`;
      else msg = `<strong>${ename(s.edge)} (${e.w})</strong>: ${L(e.a)} and ${L(e.b)} are already joined by ${pathText(s.cycle, e.a)}. Adding it would close a loop: <span class="mst-no">rejected</span>.`;
    } else {
      const cheaper = s.frontier.length - 1;
      msg = `Of the <strong>${s.frontier.length}</strong> edge${s.frontier.length === 1 ? '' : 's'} leaving the tree, <strong>${ename(s.edge)} (${e.w})</strong> is the cheapest${cheaper ? '' : ' (and the only one)'}: <span class="mst-ok">added</span>, pulling in <strong>${L(s.newNode)}</strong>.`;
    }
    if (done) {
      const other = S.mode === 'kruskal' ? "Prim's" : "Kruskal's";
      const skipped = S.mode === 'kruskal' ? S.g.edges.length - S.kr.steps.length : 0;
      msg += ` <br><strong>Done:</strong> ${n - 1} edges, total cost <strong>${t.cost}</strong>${skipped ? `; the ${skipped} dearest edge${skipped === 1 ? ' was' : 's were'} never needed` : ''}. Switch to ${other} — it finds the same total.`;
    }
    return msg;
  }

  function pathText(cycle, from) {
    const seq = [from];
    cycle.forEach((i) => { const e = S.g.edges[i]; seq.push(seq[seq.length - 1] === e.a ? e.b : e.a); });
    return seq.map(L).join('–');
  }

  function renderQueue(snap) {
    const chips = [];
    if (S.mode === 'kruskal') {
      ui.queueLabel.textContent = 'Edge queue (cheapest first)';
      S.kr.order.forEach((i) => chips.push([i, snap.edgeState[i], i === snap.current]));
    } else if (S.mode === 'prim') {
      ui.queueLabel.textContent = S.k === S.pr.steps.length ? 'Tree edges, in the order Prim added them' : 'Edges leaving the tree right now (the cut)';
      if (S.k === S.pr.steps.length) S.pr.tree.forEach((i) => chips.push([i, 'added', false]));
      else {
        const front = snap.edgeState.map((st, i) => (st === 'frontier' ? i : -1)).filter((i) => i >= 0)
          .sort((a, b) => S.g.edges[a].w - S.g.edges[b].w || a - b);
        front.forEach((i, j) => chips.push([i, 'frontier', j === 0]));
      }
    } else {
      ui.queueLabel.textContent = 'Your edges';
      Array.from(S.chosen).sort((a, b) => S.g.edges[a].w - S.g.edges[b].w).forEach((i) => chips.push([i, 'mine', false]));
      if (!chips.length) { ui.queue.innerHTML = '<span class="mst-chip-empty">None yet</span>'; return; }
    }
    ui.queue.innerHTML = chips.map(([i, st, cur]) =>
      `<span class="mst-chip mst-chip--${st}${cur ? ' is-current' : ''}">${ename(i)} <b>${S.g.edges[i].w}</b></span>`).join('');
    const curEl = ui.queue.querySelector('.is-current');
    if (curEl) ui.queue.scrollLeft = Math.max(0, curEl.offsetLeft - ui.queue.clientWidth / 2 + curEl.offsetWidth / 2);
    else if (S.mode === 'kruskal' && S.k === 0) ui.queue.scrollLeft = 0;
  }

  function render() {
    if (!S.g) return;
    const snap = snapshot();
    const n = S.g.nodes.length;
    const t = trace();
    if (S.mode === 'build') {
      const r = M.checkTree(S.g, Array.from(S.chosen));
      ui.r1l.textContent = 'Your cost'; ui.r1.textContent = S.chosen.size ? r.cost : '—';
      ui.r2l.textContent = 'Edges chosen'; ui.r2.textContent = `${r.count} / ${r.need}`;
      ui.r3l.textContent = 'Pieces'; ui.r3.textContent = r.pieces;
    } else {
      ui.r1l.textContent = 'Total cost'; ui.r1.textContent = S.k ? snap.cost : '—';
      ui.r2l.textContent = 'Edges added'; ui.r2.textContent = `${snap.added} / ${n - 1}`;
      ui.r3l.textContent = S.mode === 'prim' ? 'Edges compared' : 'Considered';
      ui.r3.textContent = snap.considered;
      ui.back.disabled = S.k === 0;
      ui.step.disabled = S.k >= t.steps.length;
      ui.play.disabled = S.k >= t.steps.length && !player;
    }
    ui.play.textContent = player ? '❚❚ Pause' : '▶ Play';
    ui.narr.innerHTML = narrate(snap);
    renderQueue(snap);
    draw();
  }

  /* ── Controls ───────────────────────────────────── */
  function step(dir) {
    if (S.mode === 'build') return;
    S.k = Math.max(0, Math.min(trace().steps.length, S.k + dir));
    if (S.k >= trace().steps.length) stopPlay();
    render();
  }
  function runAll() { if (S.mode === 'build') return; stopPlay(); S.k = trace().steps.length; render(); }

  function stopPlay() { if (player) { player.stop(); player = null; } }
  function togglePlay() {
    if (player) { stopPlay(); render(); return; }
    if (S.k >= trace().steps.length) S.k = 0;
    acc = 0;
    player = SimKit.loop((dt) => {
      acc += dt;
      if (acc >= 0.9) { acc = 0; step(1); }
    }, { el: SimKit.stage(canvas), maxDt: 0.2 });
    step(1);
  }

  function setMode(mode) {
    S.mode = mode;
    Object.keys(modeBtns).forEach((m) => {
      modeBtns[m].classList.toggle('is-active', m === mode);
      modeBtns[m].setAttribute('aria-pressed', String(m === mode));
      legends[m].hidden = m !== mode;
    });
    ui.instr.innerHTML = INSTR[mode];
    ui.stepBar.hidden = mode === 'build';
    ui.buildBar.hidden = mode !== 'build';
    resetSteps();
  }

  function canvasPoint(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: (ev.clientX - rect.left) * (view.w / rect.width), y: (ev.clientY - rect.top) * (view.h / rect.height) };
  }
  function hit(p) {
    const ni = view.pts.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) <= view.r + 4);
    if (ni >= 0) return { node: ni };
    let best = -1, bd = 14;
    S.g.edges.forEach((e, i) => {
      const a = view.pts[e.a], b = view.pts[e.b];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
      const d = Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best >= 0 ? { edge: best } : {};
  }

  canvas.addEventListener('click', (ev) => {
    if (!S.g) return;
    const h = hit(canvasPoint(ev));
    if (S.mode === 'build' && h.edge != null) {
      if (S.chosen.has(h.edge)) S.chosen.delete(h.edge); else S.chosen.add(h.edge);
      S.checked = null; S.reveal = false;
      render();
    } else if (S.mode === 'prim' && h.node != null && S.k === 0) {
      S.start = h.node;
      S.pr = M.primTrace(S.g, h.node);
      render();
    }
  });
  canvas.addEventListener('mousemove', (ev) => {
    if (!S.g) return;
    const h = hit(canvasPoint(ev));
    canvas.style.cursor = (S.mode === 'build' && h.edge != null) || (S.mode === 'prim' && S.k === 0 && h.node != null) ? 'pointer' : 'default';
  });
  canvas.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === ' ' || k === 'Enter' || k === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (k === 'ArrowLeft' || k === 'Backspace') { e.preventDefault(); step(-1); }
    else if (k === 'p' || k === 'P') { e.preventDefault(); togglePlay(); }
    else if (k === 'r' || k === 'R') { e.preventDefault(); S.chosen.clear(); resetSteps(); }
  });

  Object.keys(modeBtns).forEach((m) => modeBtns[m].addEventListener('click', () => setMode(m)));
  ui.step.addEventListener('click', () => { stopPlay(); step(1); });
  ui.back.addEventListener('click', () => { stopPlay(); step(-1); });
  ui.play.addEventListener('click', togglePlay);
  $('mst-reset').addEventListener('click', resetSteps);
  $('mst-check').addEventListener('click', () => { S.checked = M.checkTree(S.g, Array.from(S.chosen)); S.reveal = false; render(); });
  $('mst-reveal').addEventListener('click', () => { S.reveal = !S.reveal; S.checked = null; render(); });
  $('mst-clear').addEventListener('click', () => { S.chosen.clear(); S.checked = null; S.reveal = false; render(); });
  ui.slider.addEventListener('input', () => { ui.sliderVal.textContent = ui.slider.value; });
  ui.slider.addEventListener('change', () => generate());

  window.mstGenerate = () => generate();
  window.mstRunAll = runAll;
  window.mstReset = () => { S.chosen.clear(); resetSteps(); };

  SimKit.theme.onChange(draw);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lighting'] });

  ui.sliderVal.textContent = ui.slider.value;
  generate(2026);
  setMode('kruskal');
})();
