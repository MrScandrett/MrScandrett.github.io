/* Graphing Calculator lesson (lessons/mathematics/advanced-and-calculus/graphing-calculator.html).
 * Moved out of the page's inline <script>s so the browser can cache it and the maths can be tested.
 * Needs sim-kit.js and graph-expr.js loaded first. Two parts, in the order the page ran them:
 * the calculator itself, then the side-panel bridge and practice quiz. */
  (function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════
       APP / LESSON MODE
    ═══════════════════════════════════════════════════════ */
    const GC_MODE_KEY = 'classroomos-graph-mode';
    function loadMode() {
      try {
        const saved = window.localStorage.getItem(GC_MODE_KEY);
        if (saved === 'app' || saved === 'lesson') return saved;
      } catch (e) {}
      return 'app';
    }
    function saveMode(mode) {
      try { window.localStorage.setItem(GC_MODE_KEY, mode); } catch (e) {}
    }
    let gcMode = loadMode();

    /* Expression parsing lives in graph-expr.js: pure, no DOM, tested
       (node --test tests/graph-expr.test.mjs). */
    const evalExpr = window.GraphExpr.evaluate;
    const validateExpr = window.GraphExpr.isValid;

    /* ═══════════════════════════════════════════════════════
       CANVAS & VIEW STATE
    ═══════════════════════════════════════════════════════ */
    const canvas   = document.getElementById('gc-canvas');
    let ctx        = null;
    const coordsEl = document.getElementById('gc-coords');

    if (!canvas) return;

    // View state
    const view = { xMin: -10, xMax: 10, yMin: -7.5, yMax: 7.5 };
    const DEFAULT_VIEW = { xMin: -10, xMax: 10, yMin: -7.5, yMax: 7.5 };

    // Plotted functions
    const COLORS = ['#007aff', '#ff3b30', '#34c759', '#ff9500', '#af52de', '#30b0c7', '#ff375f'];
    let fns = []; // { expr, color }
    let colorIdx = 0;
    const MODEL_FN_ID = 'gc-model';
    const DATA_FN_ID = 'gc-data';
    const PROBABILITY_SAMPLE = [
      [1, 0.5], [2, 0.5], [5, 0.6], [10, 0.7], [20, 0.6], [50, 0.54], [100, 0.51]
    ];
    const AUTO_IMPORT_KEY = 'classroomos-graph-data';
    const modelState = {
      mode: 'beginner',
      family: 'linear',
      lock: 'none',
      linear: { m: 1, b: 0 },
      quadratic: { a: 1, h: 0, k: 0 },
      trig: { a: 1, f: 1, k: 0 },
      domain: { min: -10, max: 10 },
      annotations: true,
      intersections: true,
      animate: false,
      invalid: true,
      animationPhase: 0,
      dataPoints: []
    };

    // Dragging
    let dragging = false;
    let dragStart = { x: 0, y: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0 };

    // Trace
    let tracePos = null; // { x, y } in canvas pixels

    /* ─── Coordinate transforms ─────────────────────────── */
    function toCanvasX(wx) {
      return (wx - view.xMin) / (view.xMax - view.xMin) * canvas.width;
    }
    function toCanvasY(wy) {
      return canvas.height - (wy - view.yMin) / (view.yMax - view.yMin) * canvas.height;
    }
    function toWorldX(cx) {
      return view.xMin + (cx / canvas.width)  * (view.xMax - view.xMin);
    }
    function toWorldY(cy) {
      return view.yMin + (1 - cy / canvas.height) * (view.yMax - view.yMin);
    }

    /* ─── Resize handler ────────────────────────────────── */
    function resizeCanvas() { stage.resize(); }

    /* ─── Drawing ───────────────────────────────────────── */
    function draw() {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(0, 0, W, H);

      drawGrid(W, H);
      drawAxes(W, H);

      // Plot functions
      fns.forEach(fn => plotFn(fn));

      if (modelState.invalid) drawDomainShading();
      if (modelState.annotations) drawFocusAnnotations();
      if (modelState.intersections) drawIntersections();
      if (modelState.animate) drawAnimatedPoint();

      // Trace crosshair
      if (tracePos) drawTrace(tracePos.cx, tracePos.cy);
    }

    function niceStep(range, targetTicks) {
      const raw = range / targetTicks;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const nice = [1, 2, 2.5, 5, 10].find(n => n * mag >= raw);
      return nice * mag;
    }

    function drawGrid(W, H) {
      const xRange = view.xMax - view.xMin;
      const yRange = view.yMax - view.yMin;
      const step = niceStep(Math.max(xRange, yRange), 12);

      ctx.strokeStyle = '#ffffff0d';
      ctx.lineWidth = 0.8;

      // Vertical grid lines
      const xStart = Math.ceil(view.xMin / step) * step;
      for (let wx = xStart; wx <= view.xMax + step * 0.01; wx += step) {
        const cx = toCanvasX(wx);
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
      }

      // Horizontal grid lines
      const yStart = Math.ceil(view.yMin / step) * step;
      for (let wy = yStart; wy <= view.yMax + step * 0.01; wy += step) {
        const cy = toCanvasY(wy);
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
      }

      // Axis tick labels
      ctx.fillStyle = '#ffffff44';
      ctx.font = `${Math.max(9, Math.min(11, W * 0.018))}px Inter, sans-serif`;
      ctx.textAlign = 'center';

      const ax0 = toCanvasX(0);
      const ay0 = toCanvasY(0);
      const labelPad = 4;

      for (let wx = xStart; wx <= view.xMax + step * 0.01; wx += step) {
        const val = Math.round(wx / step) * step; // avoid float noise
        if (Math.abs(val) < step * 0.01) continue; // skip 0
        const cx = toCanvasX(val);
        const labelY = Math.min(Math.max(ay0 + 14, 14), H - 4);
        ctx.fillText(round4(val), cx, labelY);
      }

      ctx.textAlign = 'right';
      for (let wy = yStart; wy <= view.yMax + step * 0.01; wy += step) {
        const val = Math.round(wy / step) * step;
        if (Math.abs(val) < step * 0.01) continue;
        const cy = toCanvasY(val);
        const labelX = Math.min(Math.max(ax0 - 5, 24), W - 4);
        ctx.fillText(round4(val), labelX, cy + 3.5);
      }
    }

    function drawAxes(W, H) {
      const ax0 = Math.max(0, Math.min(W, toCanvasX(0)));
      const ay0 = Math.max(0, Math.min(H, toCanvasY(0)));

      ctx.strokeStyle = '#ffffff66';
      ctx.lineWidth = 1.5;

      // x-axis
      ctx.beginPath(); ctx.moveTo(0, ay0); ctx.lineTo(W, ay0); ctx.stroke();
      // y-axis
      ctx.beginPath(); ctx.moveTo(ax0, 0); ctx.lineTo(ax0, H); ctx.stroke();

      // Axis arrows
      const aw = 6;
      ctx.fillStyle = '#ffffff66';
      // → right arrow on x-axis
      ctx.beginPath();
      ctx.moveTo(W, ay0);
      ctx.lineTo(W - aw, ay0 - aw * 0.5);
      ctx.lineTo(W - aw, ay0 + aw * 0.5);
      ctx.fill();
      // ↑ up arrow on y-axis
      ctx.beginPath();
      ctx.moveTo(ax0, 0);
      ctx.lineTo(ax0 - aw * 0.5, aw);
      ctx.lineTo(ax0 + aw * 0.5, aw);
      ctx.fill();

      // Axis labels
      ctx.fillStyle = '#ffffff88';
      ctx.font = `bold ${Math.max(10, Math.min(13, W * 0.022))}px Inter, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('x', W - 14, ay0 - 8);
      ctx.textAlign = 'center';
      ctx.fillText('y', ax0 + 9, 14);
    }

    function plotFn(fn) {
      if (fn.kind === 'data') {
        plotDataFn(fn);
        return;
      }

      const W = canvas.width;
      const steps = W * 2;
      const xRange = view.xMax - view.xMin;

      ctx.strokeStyle = fn.color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap  = 'round';
      ctx.shadowColor = fn.color + '55';
      ctx.shadowBlur  = 6;

      ctx.beginPath();
      let penDown = false;
      let prevCy = null;

      for (let i = 0; i <= steps; i++) {
        const wx = view.xMin + (i / steps) * xRange;
        const wy = evalExpr(fn.expr, wx);

        if (isNaN(wy) || !isFinite(wy)) {
          penDown = false;
          continue;
        }

        const cx = toCanvasX(wx);
        const cy = toCanvasY(wy);

        // Break line on large jumps (asymptotes)
        if (penDown && prevCy !== null && Math.abs(cy - prevCy) > canvas.height * 1.2) {
          penDown = false;
        }

        if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
        else          { ctx.lineTo(cx, cy); }

        prevCy = cy;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function plotDataFn(fn) {
      const points = Array.isArray(fn.points) ? fn.points : [];
      if (!points.length) return;

      ctx.strokeStyle = fn.color;
      ctx.fillStyle = fn.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = fn.color + '44';
      ctx.shadowBlur = 4;
      ctx.beginPath();

      points.forEach((point, index) => {
        const cx = toCanvasX(point.x);
        const cy = toCanvasY(point.y);
        if (index === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });

      ctx.stroke();
      ctx.shadowBlur = 0;

      points.forEach(point => {
        const cx = toCanvasX(point.x);
        const cy = toCanvasY(point.y);
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = fn.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.25;
        ctx.stroke();
      });
    }

    function drawTrace(cx, cy) {
      const wx = toWorldX(cx);
      const W  = canvas.width, H = canvas.height;

      // Crosshair lines
      ctx.strokeStyle = '#ffffff30';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
      ctx.setLineDash([]);

      // Dots on each curve at this x
      fns.forEach(fn => {
        const wy = evaluateFnAt(fn, wx);
        if (isNaN(wy)) return;
        const fcy = toCanvasY(wy);
        if (fcy < -10 || fcy > H + 10) return;

        ctx.beginPath();
        ctx.arc(cx, fcy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = fn.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    function round4(n) {
      return Math.abs(n) < 1e-9 ? 0 : parseFloat(n.toPrecision(4));
    }

    function formatNumber(n) {
      const rounded = round4(n);
      return Number.isInteger(rounded) ? String(rounded) : String(rounded);
    }

    function withSign(n) {
      return n < 0 ? `- ${formatNumber(Math.abs(n))}` : `+ ${formatNumber(n)}`;
    }

    function evaluateFnAt(fn, x) {
      if (!fn) return NaN;
      if (fn.domain && (x < fn.domain.min || x > fn.domain.max)) return NaN;
      if (fn.kind === 'data') return interpolateDataY(fn.points || [], x);
      return evalExpr(fn.expr, x);
    }

    function interpolateDataY(points, x) {
      if (!points || points.length < 2) return NaN;
      if (x < points[0].x || x > points[points.length - 1].x) return NaN;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        if (x >= a.x && x <= b.x) {
          const t = (x - a.x) / (b.x - a.x || 1);
          return a.y + (b.y - a.y) * t;
        }
      }
      return NaN;
    }

    function getFnById(id) {
      return fns.find(fn => fn.id === id) || null;
    }

    function getFocusFn() {
      return getFnById(MODEL_FN_ID) || getFnById(DATA_FN_ID) || fns[0] || null;
    }

    function drawPoint(wx, wy, color, radius) {
      const cx = toCanvasX(wx);
      const cy = toCanvasY(wy);
      if (!isFinite(cx) || !isFinite(cy)) return;
      ctx.beginPath();
      ctx.arc(cx, cy, radius || 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    function drawLabel(text, cx, cy, color, align) {
      ctx.save();
      ctx.font = `600 ${Math.max(10, Math.min(12, canvas.width * 0.017))}px Inter, sans-serif`;
      ctx.textAlign = align || 'left';
      ctx.textBaseline = 'middle';
      const metrics = ctx.measureText(text);
      const padX = 6;
      const padY = 4;
      const width = metrics.width + padX * 2;
      const height = 22;
      const x = align === 'right' ? cx - width : cx;
      ctx.fillStyle = 'rgba(13,13,20,0.82)';
      roundRect(ctx, x, cy - height / 2, width, height, 8);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(text, x + padX, cy);
      ctx.restore();
    }

    function roundRect(context, x, y, w, h, r) {
      context.beginPath();
      context.moveTo(x + r, y);
      context.arcTo(x + w, y, x + w, y + h, r);
      context.arcTo(x + w, y + h, x, y + h, r);
      context.arcTo(x, y + h, x, y, r);
      context.arcTo(x, y, x + w, y, r);
      context.closePath();
    }

    function drawDomainShading() {
      const focus = getFnById(MODEL_FN_ID);
      if (!focus || !focus.domain) return;
      const min = Math.max(view.xMin, focus.domain.min);
      const max = Math.min(view.xMax, focus.domain.max);
      const leftX = toCanvasX(min);
      const rightX = toCanvasX(max);

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      if (focus.domain.min > view.xMin) ctx.fillRect(0, 0, Math.max(0, leftX), canvas.height);
      if (focus.domain.max < view.xMax) ctx.fillRect(Math.min(canvas.width, rightX), 0, Math.max(0, canvas.width - rightX), canvas.height);
      ctx.restore();
    }

    function drawFocusAnnotations() {
      const focus = getFocusFn();
      if (!focus) return;

      if (focus.id === MODEL_FN_ID && focus.meta && focus.meta.family === 'linear') {
        drawLinearAnnotations(focus);
      } else if (focus.id === MODEL_FN_ID && focus.meta && focus.meta.family === 'quadratic') {
        drawQuadraticAnnotations(focus);
      } else if (focus.id === MODEL_FN_ID && focus.meta && focus.meta.family === 'trig') {
        drawTrigAnnotations(focus);
      } else if (focus.id === DATA_FN_ID) {
        drawDataAnnotations(focus);
      }
    }

    function drawLinearAnnotations(fn) {
      const m = fn.meta.params.m;
      const b = fn.meta.params.b;
      const x0 = 0;
      const y0 = b;
      const x1 = 1;
      const y1 = m + b;

      drawPoint(x0, y0, '#34c759', 5);
      drawLabel(`y-int (0, ${formatNumber(y0)})`, toCanvasX(x0) + 10, toCanvasY(y0) - 16, '#34c759');

      ctx.save();
      ctx.strokeStyle = '#af52de';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(toCanvasX(x0), toCanvasY(y0));
      ctx.lineTo(toCanvasX(x1), toCanvasY(y0));
      ctx.lineTo(toCanvasX(x1), toCanvasY(y1));
      ctx.stroke();
      ctx.restore();

      drawLabel(`run 1`, toCanvasX(0.5) - 18, toCanvasY(y0) + 18, '#af52de');
      drawLabel(`rise ${formatNumber(m)}`, toCanvasX(x1) + 10, toCanvasY((y0 + y1) / 2), '#af52de');
    }

    function drawQuadraticAnnotations(fn) {
      const h = fn.meta.params.h;
      const k = fn.meta.params.k;
      drawPoint(h, k, '#ff9500', 5.5);
      drawLabel(`vertex (${formatNumber(h)}, ${formatNumber(k)})`, toCanvasX(h) + 10, toCanvasY(k) - 16, '#ff9500');
      ctx.save();
      ctx.strokeStyle = 'rgba(255,149,0,0.55)';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(toCanvasX(h), 0);
      ctx.lineTo(toCanvasX(h), canvas.height);
      ctx.stroke();
      ctx.restore();
    }

    function drawTrigAnnotations(fn) {
      const amplitude = fn.meta.params.a;
      const frequency = fn.meta.params.f;
      const offset = fn.meta.params.k;
      const period = (2 * Math.PI) / frequency;
      const xStart = Math.max(fn.domain ? fn.domain.min : view.xMin, view.xMin);
      const xEnd = Math.min(xStart + period, view.xMax);

      ctx.save();
      ctx.strokeStyle = 'rgba(48,176,199,0.8)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(toCanvasX(xStart), toCanvasY(offset));
      ctx.lineTo(toCanvasX(xEnd), toCanvasY(offset));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toCanvasX(xStart), toCanvasY(offset));
      ctx.lineTo(toCanvasX(xStart), toCanvasY(offset + amplitude));
      ctx.stroke();
      ctx.restore();

      drawPoint(xStart, offset + amplitude, '#30b0c7', 5);
      drawLabel(`amplitude ${formatNumber(amplitude)}`, toCanvasX(xStart) + 10, toCanvasY(offset + amplitude) - 16, '#30b0c7');
      drawLabel(`period ${formatNumber(period)}`, toCanvasX((xStart + xEnd) / 2) - 22, toCanvasY(offset) + 18, '#30b0c7');
    }

    function drawDataAnnotations(fn) {
      const points = fn.points || [];
      if (!points.length) return;
      const last = points[points.length - 1];
      drawLabel(`latest (${formatNumber(last.x)}, ${formatNumber(last.y)})`, toCanvasX(last.x) + 10, toCanvasY(last.y) - 16, fn.color);
    }

    function findIntersectionsBetween(fnA, fnB) {
      const results = [];
      if (!fnA || !fnB) return results;
      const start = Math.max(view.xMin, fnA.domain ? fnA.domain.min : view.xMin, fnB.domain ? fnB.domain.min : view.xMin);
      const end = Math.min(view.xMax, fnA.domain ? fnA.domain.max : view.xMax, fnB.domain ? fnB.domain.max : view.xMax);
      const steps = 1200;
      let prevX = start;
      let prevDiff = evaluateFnAt(fnA, prevX) - evaluateFnAt(fnB, prevX);

      for (let i = 1; i <= steps; i++) {
        const x = start + ((end - start) * i / steps);
        const diff = evaluateFnAt(fnA, x) - evaluateFnAt(fnB, x);
        if (isNaN(prevDiff) || isNaN(diff)) {
          prevX = x;
          prevDiff = diff;
          continue;
        }
        if (Math.abs(diff) < 1e-3 || prevDiff === 0 || diff * prevDiff < 0) {
          const ratio = Math.abs(prevDiff) + Math.abs(diff);
          const rootX = ratio ? (prevX * Math.abs(diff) + x * Math.abs(prevDiff)) / ratio : x;
          const rootY = evaluateFnAt(fnA, rootX);
          if (isFinite(rootY) && !results.some(pt => Math.abs(pt.x - rootX) < 0.08 && Math.abs(pt.y - rootY) < 0.08)) {
            results.push({ x: rootX, y: rootY });
          }
        }
        prevX = x;
        prevDiff = diff;
      }
      return results.slice(0, 6);
    }

    function drawIntersections() {
      if (fns.length < 2) return;
      const intersections = findIntersectionsBetween(fns[0], fns[1]);
      intersections.forEach((point, index) => {
        drawPoint(point.x, point.y, '#f5f5f7', 4.8);
        const offsetY = 18 + (index % 3) * 26;
        drawLabel(`meet: (${formatNumber(point.x)}, ${formatNumber(point.y)})`, toCanvasX(point.x) + 9, toCanvasY(point.y) - offsetY, '#f5f5f7');
      });
    }

    function drawAnimatedPoint() {
      const focus = getFocusFn();
      if (!focus) return;
      const min = focus.domain ? focus.domain.min : view.xMin;
      const max = focus.domain ? focus.domain.max : view.xMax;
      const span = Math.max(0.1, max - min);
      const wx = min + (modelState.animationPhase % 1) * span;
      const wy = evaluateFnAt(focus, wx);
      if (!isFinite(wy)) return;

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(toCanvasX(wx), toCanvasY(0));
      ctx.lineTo(toCanvasX(wx), toCanvasY(wy));
      ctx.stroke();
      ctx.restore();

      drawPoint(wx, wy, '#ffffff', 5);
      drawLabel(`moving point`, toCanvasX(wx) + 10, toCanvasY(wy) - 16, '#ffffff');
    }

    /* ─── Zoom helpers ──────────────────────────────────── */
    function zoom(factor, cx, cy) {
      const wx = cx !== undefined ? toWorldX(cx) : (view.xMin + view.xMax) / 2;
      const wy = cy !== undefined ? toWorldY(cy) : (view.yMin + view.yMax) / 2;

      const xRange = (view.xMax - view.xMin) * factor;
      const yRange = (view.yMax - view.yMin) * factor;
      const xRatio = cx !== undefined ? cx / canvas.width : 0.5;
      const yRatio = cy !== undefined ? 1 - cy / canvas.height : 0.5;

      view.xMin = wx - xRange * xRatio;
      view.xMax = wx + xRange * (1 - xRatio);
      view.yMin = wy - yRange * yRatio;
      view.yMax = wy + yRange * (1 - yRatio);
      draw();
    }

    function autoFitY() {
      const values = [];
      const sampleCount = Math.max(240, Math.min(900, canvas.width));

      fns.forEach(fn => {
        if (fn.kind === 'data') {
          (fn.points || []).forEach(point => {
            if (point.x >= view.xMin && point.x <= view.xMax && isFinite(point.y)) values.push(point.y);
          });
          return;
        }

        const start = Math.max(view.xMin, fn.domain ? fn.domain.min : view.xMin);
        const end = Math.min(view.xMax, fn.domain ? fn.domain.max : view.xMax);
        if (end <= start) return;
        for (let i = 0; i <= sampleCount; i++) {
          const y = evaluateFnAt(fn, start + (end - start) * i / sampleCount);
          if (isFinite(y) && Math.abs(y) < 1e6) values.push(y);
        }
      });

      if (!values.length) {
        announceGraph('There are no visible graph values to fit.');
        return;
      }

      values.sort((a, b) => a - b);
      const trim = values.length > 40 ? Math.floor(values.length * 0.02) : 0;
      let min = values[trim];
      let max = values[values.length - 1 - trim];
      if (min === max) {
        min -= 1;
        max += 1;
      }
      const padding = Math.max((max - min) * 0.12, 0.5);
      view.yMin = min - padding;
      view.yMax = max + padding;
      syncWindowFromView();
      draw();
      announceGraph(`Vertical window fit from ${formatNumber(view.yMin)} to ${formatNumber(view.yMax)}.`);
    }

    function announceGraph(message) {
      const announcer = document.getElementById('gc-graph-announcer');
      if (announcer) announcer.textContent = message;
    }

    function graphShareUrl() {
      const url = new URL(window.location.href);
      const expressions = fns
        .filter(fn => fn.kind === 'expr')
        .map(fn => fn.expr)
        .slice(0, COLORS.length);
      if (expressions.length) url.searchParams.set('graph', expressions.join('|'));
      else url.searchParams.delete('graph');
      url.searchParams.set('view', [view.xMin, view.xMax, view.yMin, view.yMax].map(round4).join(','));
      url.hash = 'gc-calculator';
      return url.toString();
    }

    function loadSharedGraph() {
      const params = new URLSearchParams(window.location.search);
      const graph = params.get('graph');
      const sharedView = params.get('view');
      if (!graph) return false;

      const expressions = graph.split('|').map(value => value.trim()).filter(Boolean).slice(0, COLORS.length);
      const validExpressions = expressions.filter(validateExpr);
      if (!validExpressions.length) return false;

      clearAll();
      validExpressions.forEach(expr => addFn(expr));

      if (sharedView) {
        const bounds = sharedView.split(',').map(Number);
        if (
          bounds.length === 4 &&
          bounds.every(Number.isFinite) &&
          bounds[1] > bounds[0] &&
          bounds[3] > bounds[2]
        ) {
          [view.xMin, view.xMax, view.yMin, view.yMax] = bounds;
          syncWindowFromView();
          draw();
        }
      }
      announceGraph(`Shared graph loaded with ${validExpressions.length} ${validExpressions.length === 1 ? 'function' : 'functions'}.`);
      return true;
    }

    /* ─── Canvas events ─────────────────────────────────── */
    canvas.addEventListener('mousedown', function (e) {
      dragging = true;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      dragStart = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top)  * scaleY,
        xMin: view.xMin, xMax: view.xMax, yMin: view.yMin, yMax: view.yMax
      };
    });

    canvas.addEventListener('mousemove', function (e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top)  * scaleY;

      if (dragging) {
        const dx = dragStart.x - cx;
        const dy = dragStart.y - cy;
        const wxPx = (dragStart.xMax - dragStart.xMin) / canvas.width;
        const wyPx = (dragStart.yMax - dragStart.yMin) / canvas.height;
        view.xMin = dragStart.xMin + dx * wxPx;
        view.xMax = dragStart.xMax + dx * wxPx;
        view.yMin = dragStart.yMin - dy * wyPx;
        view.yMax = dragStart.yMax - dy * wyPx;
      }

      tracePos = { cx, cy };
      const wx = round4(toWorldX(cx));
      const wy = round4(toWorldY(cy));
      if (coordsEl) coordsEl.textContent = `x: ${wx}  y: ${wy}`;

      draw();
    });

    canvas.addEventListener('mouseup',    () => { dragging = false; });
    canvas.addEventListener('mouseleave', () => { dragging = false; tracePos = null; draw(); if (coordsEl) coordsEl.textContent = 'x: —  y: —'; });

    // Scroll to zoom
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top)  * scaleY;
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      zoom(factor, cx, cy);
    }, { passive: false });

    // Touch pan
    let lastTouch = null;
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1 && lastTouch) {
        e.preventDefault();
        const dx = lastTouch.x - e.touches[0].clientX;
        const dy = lastTouch.y - e.touches[0].clientY;
        const rect = canvas.getBoundingClientRect();
        const wxPx = (view.xMax - view.xMin) / rect.width;
        const wyPx = (view.yMax - view.yMin) / rect.height;
        view.xMin += dx * wxPx; view.xMax += dx * wxPx;
        view.yMin -= dy * wyPx; view.yMax -= dy * wyPx;
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        draw();
      }
    }, { passive: false });
    canvas.addEventListener('touchend', () => { lastTouch = null; }, { passive: true });
    canvas.addEventListener('keydown', function (e) {
      const panKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (panKeys.includes(e.key)) {
        e.preventDefault();
        const xStep = (view.xMax - view.xMin) * (e.shiftKey ? 0.25 : 0.08);
        const yStep = (view.yMax - view.yMin) * (e.shiftKey ? 0.25 : 0.08);
        if (e.key === 'ArrowLeft')  { view.xMin -= xStep; view.xMax -= xStep; }
        if (e.key === 'ArrowRight') { view.xMin += xStep; view.xMax += xStep; }
        if (e.key === 'ArrowUp')    { view.yMin += yStep; view.yMax += yStep; }
        if (e.key === 'ArrowDown')  { view.yMin -= yStep; view.yMax -= yStep; }
        syncWindowFromView();
        draw();
        announceGraph(`Graph moved ${e.key.replace('Arrow', '').toLowerCase()}.`);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoom(1 / 1.3);
        announceGraph('Graph zoomed in.');
      } else if (e.key === '-') {
        e.preventDefault();
        zoom(1.3);
        announceGraph('Graph zoomed out.');
      } else if (e.key === '0') {
        e.preventDefault();
        Object.assign(view, DEFAULT_VIEW);
        syncWindowFromView();
        draw();
        announceGraph('Graph view reset.');
      }
    });

    // Zoom buttons
    document.getElementById('gc-zoom-in') .addEventListener('click', () => zoom(1 / 1.3));
    document.getElementById('gc-zoom-out').addEventListener('click', () => zoom(1.3));
    document.getElementById('gc-zoom-reset').addEventListener('click', () => {
      Object.assign(view, DEFAULT_VIEW);
      draw();
    });

    /* ─── Function management ───────────────────────────── */
    function nextColor() {
      const color = COLORS[colorIdx % COLORS.length];
      colorIdx++;
      return color;
    }

    function syncColorIndex() {
      colorIdx = fns.length % COLORS.length;
    }

    function addFn(expr, options) {
      const opts = options || {};
      if (fns.length >= COLORS.length) {
        showError('Max 7 functions. Clear some first.');
        return false;
      }
      if (!validateExpr(expr)) {
        showError('Could not parse that expression. Try 2x+1, |x|, sqrt(x), or (x+1)(x-1).');
        return false;
      }
      const fn = {
        id: opts.id || ('fn-' + Date.now() + '-' + Math.random().toString(16).slice(2, 7)),
        expr,
        color: opts.color || nextColor(),
        kind: 'expr',
        domain: opts.domain || null,
        meta: opts.meta || null
      };
      if (opts.id) fns = fns.filter(existing => existing.id !== opts.id);
      fns.push(fn);
      clearError();
      renderFnList();
      draw();
      return true;
    }

    function upsertExpressionFn(id, expr, options) {
      const opts = options || {};
      if (!validateExpr(expr)) return false;
      const existing = getFnById(id);
      const color = opts.color || (existing && existing.color) || nextColor();
      const fn = {
        id,
        expr,
        color,
        kind: 'expr',
        domain: opts.domain || null,
        meta: opts.meta || null
      };
      fns = fns.filter(item => item.id !== id);
      fns.unshift(fn);
      renderFnList();
      draw();
      return true;
    }

    function upsertDataFn(points, options) {
      const opts = options || {};
      if (!points.length) return false;
      const existing = getFnById(DATA_FN_ID);
      const color = opts.color || (existing && existing.color) || '#ff9500';
      fns = fns.filter(item => item.id !== DATA_FN_ID);
      fns.push({
        id: DATA_FN_ID,
        kind: 'data',
        color,
        points,
        meta: { family: 'data', label: opts.label || 'Imported data' }
      });
      renderFnList();
      draw();
      return true;
    }

    function removeFn(idx) {
      const removed = fns[idx];
      fns.splice(idx, 1);
      if (removed && removed.id === MODEL_FN_ID) updateModelFunction();
      renderFnList();
      syncColorIndex();
      draw();
    }

    function clearAll() {
      fns = [];
      syncColorIndex();
      renderFnList();
      draw();
    }

    function loadMission(exprs) {
      clearAll();
      clearError();
      Object.assign(view, DEFAULT_VIEW);
      exprs.forEach(expr => addFn(expr));
      if (eqInput) eqInput.value = '';
    }

    function renderFnList() {
      const lists = [
        document.getElementById('gc-fn-list'),
        document.getElementById('gc-panel-fn-list')
      ].filter(Boolean);
      const summary = document.getElementById('gc-graph-summary');
      if (summary) {
        const first = fns[0];
        const count = fns.length;
        const firstLabel = !first
          ? 'ready for an equation'
          : first.kind === 'data'
            ? ((first.meta && first.meta.label) || 'data points')
            : `y = ${first.expr}`;
        summary.textContent = `${count} ${count === 1 ? 'function' : 'functions'} · ${firstLabel}`;
        summary.title = summary.textContent;
      }

      lists.forEach(list => {
        if (fns.length === 0) {
          list.innerHTML = '<span style="font-size:0.78rem;color:var(--text-muted,#6e6e73);">None yet — add one above.</span>';
          return;
        }
        list.innerHTML = '';
        fns.forEach((fn, i) => {
          const item = document.createElement('div');
          item.className = 'gc-fn-item';
          const swatch = document.createElement('span');
          swatch.className = 'gc-fn-swatch';
          swatch.style.background = fn.color;
          const label = document.createElement('span');
          label.className = 'gc-fn-expr';
          const text = fn.kind === 'data'
            ? (fn.meta && fn.meta.label ? fn.meta.label : 'Imported data')
            : 'y = ' + fn.expr;
          label.title = text;
          label.textContent = text;
          const del = document.createElement('button');
          del.className = 'gc-fn-remove';
          del.setAttribute('aria-label', 'Remove ' + text);
          del.textContent = '✕';
          del.addEventListener('click', () => removeFn(i));
          item.append(swatch, label, del);
          list.appendChild(item);
        });
      });
    }

    function showError(msg) {
      const el = document.getElementById('gc-parse-error');
      if (el) el.textContent = msg;
      ['gc-hero-input', 'gc-panel-eq-input'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) inp.classList.add('is-error');
      });
    }
    function clearError() {
      const el = document.getElementById('gc-parse-error');
      if (el) el.textContent = '';
      ['gc-hero-input', 'gc-panel-eq-input'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) inp.classList.remove('is-error');
      });
    }

    /* ─── UI events ─────────────────────────────────────── */
    const addBtn   = document.getElementById('gc-add-btn');
    const eqInput  = document.getElementById('gc-eq-input');
    const clearBtn = document.getElementById('gc-clear-btn');
    const presets  = document.getElementById('gc-presets');
    const missions = document.getElementById('gc-missions');

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        const expr = eqInput.value.trim();
        if (!expr) return;
        if (addFn(expr)) eqInput.value = '';
      });
    }

    if (eqInput) {
      eqInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          const expr = eqInput.value.trim();
          if (!expr) return;
          if (addFn(expr)) eqInput.value = '';
        }
      });
      eqInput.addEventListener('input', clearError);
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', clearAll);
    }

    if (presets) {
      presets.addEventListener('click', function (e) {
        const btn = e.target.closest('.gc-preset-btn');
        if (!btn) return;
        addFn(btn.dataset.eq);
      });
    }

    if (missions) {
      missions.addEventListener('click', function (e) {
        const btn = e.target.closest('.gc-mission-btn');
        if (!btn) return;
        loadMission(btn.dataset.eqs.split('|'));
      });
    }

    window.gcPlotExpression = function (expr) {
      return addFn(expr);
    };
    window.gcClearGraphFunctions = function () {
      clearAll();
    };

    /* ─── Modeling studio ───────────────────────────────── */
    const sliderConfig = {
      linear: {
        m: document.getElementById('gc-slider-linear-m'),
        b: document.getElementById('gc-slider-linear-b')
      },
      quadratic: {
        a: document.getElementById('gc-slider-quadratic-a'),
        h: document.getElementById('gc-slider-quadratic-h'),
        k: document.getElementById('gc-slider-quadratic-k')
      },
      trig: {
        a: document.getElementById('gc-slider-trig-a'),
        f: document.getElementById('gc-slider-trig-f'),
        k: document.getElementById('gc-slider-trig-k')
      }
    };

    const valueLabels = {
      'linear-m': document.getElementById('gc-value-linear-m'),
      'linear-b': document.getElementById('gc-value-linear-b'),
      'quadratic-a': document.getElementById('gc-value-quadratic-a'),
      'quadratic-h': document.getElementById('gc-value-quadratic-h'),
      'quadratic-k': document.getElementById('gc-value-quadratic-k'),
      'trig-a': document.getElementById('gc-value-trig-a'),
      'trig-f': document.getElementById('gc-value-trig-f'),
      'trig-k': document.getElementById('gc-value-trig-k'),
      'domain-min': document.getElementById('gc-value-domain-min'),
      'domain-max': document.getElementById('gc-value-domain-max')
    };

    const generatedEqEl = document.getElementById('gc-generated-eq');
    const lockNoteEl = document.getElementById('gc-lock-note');
    const insightSummaryEl = document.getElementById('gc-insight-summary');
    const insightListEl = document.getElementById('gc-insight-list');
    const dataInputEl = document.getElementById('gc-data-input');
    const dataStatusEl = document.getElementById('gc-data-status');
    const missionPromptEl = document.getElementById('gc-mission-prompt');
    const termTooltipEl = document.getElementById('gc-term-tooltip');
    const termTitleEl = document.getElementById('gc-term-title');
    const termBodyEl = document.getElementById('gc-term-body');
    const dockEl = document.querySelector('.gc-dock');
    const sidepanelEl = document.getElementById('gc-sidepanel');
    const sidepanelTitleEl = document.getElementById('gc-sidepanel-title');

    const termDefinitions = {
      slope: {
        title: 'Slope',
        body: 'Slope is rise over run. Change x by 1 and watch how much y changes. The dashed triangle on the graph makes that rate visible.'
      },
      intercept: {
        title: 'Intercept',
        body: 'An intercept is where the graph crosses an axis. For lines, the y-intercept is the start value when x = 0.'
      },
      vertex: {
        title: 'Vertex',
        body: 'The vertex is the highest or lowest point of a parabola. Move it and the whole parabola follows that turning point.'
      },
      period: {
        title: 'Period',
        body: 'The period is one full repeat of a wave. When frequency goes up, the period gets shorter and the wave repeats faster.'
      }
    };

    const panelTitles = {
      help: 'Quick Help',
      functions: 'Function Picker',
      missions: 'Mission Lab',
      goals: 'Achievements',
      settings: 'Overlay Settings',
      quiz: 'Quick Check'
    };

    const missionConfigs = {
      slope: {
        family: 'linear',
        lock: 'm',
        prompt: 'What changed when only slope moved? Look for steepness, not vertical shifting.',
        values: { m: 2, b: 0 }
      },
      shift: {
        family: 'linear',
        lock: 'b',
        prompt: 'What changed when only the intercept moved? Notice the line slides without changing steepness.',
        values: { m: 1, b: 3 }
      },
      wave: {
        family: 'trig',
        lock: 'f',
        prompt: 'What changed when only frequency moved? Watch how tightly the wave repeats.',
        values: { a: 1, f: 2, k: 0 }
      }
    };

    const achievementConfigs = {
      slope: { family: 'linear', lock: 'm', mode: 'beginner', values: { m: 3, b: 1 } },
      shift: { family: 'linear', lock: 'b', mode: 'beginner', values: { m: 1, b: -3 } },
      wave: { family: 'trig', lock: 'none', mode: 'beginner', values: { a: 2, f: 1, k: 0 } }
    };
    const calculatorState = {
      screen: 'home',
      entry: '',
      second: false,
      alpha: false,
      equations: ['x', '', ''],
      history: ['Ready for input.'],
      window: { xmin: -10, xmax: 10, ymin: -7.5, ymax: 7.5 },
      tableRows: []
    };
    const tiViewTitleEl = document.getElementById('gc-ti-view-title');
    const tiDisplayEl = document.getElementById('gc-ti-display');
    const tiEntryLabelEl = document.getElementById('gc-ti-entry-label');
    const tiEntryTextEl = document.getElementById('gc-ti-entry-text');
    const tiHistoryLabelEl = document.getElementById('gc-ti-history-label');
    const tiModeBitEl = document.getElementById('gc-ti-bit-mode');
    const tiSecondBitEl = document.getElementById('gc-ti-bit-second');
    const tiAlphaBitEl = document.getElementById('gc-ti-bit-alpha');
    const tablePanelEl = document.getElementById('gc-table-panel');
    const tableBodyEl = document.getElementById('gc-table-body');

    function setActiveChip(containerId, attr, value) {
      const parent = document.getElementById(containerId);
      if (!parent) return;
      parent.querySelectorAll('.gc-chip').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset[attr] === value);
      });
    }

    function updateSliderVisibility() {
      const mode = modelState.mode;
      document.querySelectorAll('#gc-slider-groups [data-families]').forEach(card => {
        const families = (card.getAttribute('data-families') || '').split(/\s+/);
        const matchesFamily = families.includes(modelState.family);
        let visible = matchesFamily;
        if (modelState.family === 'quadratic' && mode === 'beginner' && /quadratic-(h|k)/.test(card.querySelector('input').id)) visible = false;
        if (modelState.family === 'trig' && mode === 'beginner' && /trig-k/.test(card.querySelector('input').id)) visible = false;
        card.hidden = !visible;
      });
    }

    function applyLockState() {
      const lock = modelState.lock;
      Object.entries(sliderConfig).forEach(([family, controls]) => {
        Object.entries(controls).forEach(([key, input]) => {
          if (!input) return;
          const lockApplies = (
            (lock === 'm' && family === 'linear' && key === 'm') ||
            (lock === 'b' && family === 'linear' && key === 'b') ||
            (lock === 'a' && ((family === 'trig' && key === 'a') || (family === 'quadratic' && key === 'a'))) ||
            (lock === 'f' && family === 'trig' && key === 'f')
          );
          input.disabled = lock !== 'none' && !lockApplies;
        });
      });

      const notes = {
        none: 'Open exploration mode. Students can compare several changes at once.',
        m: 'Only slope moves now, so students can isolate steepness without confusing it with shifting.',
        b: 'Only the intercept moves now, so students can see that the line slides without changing steepness.',
        a: 'Only amplitude or vertical stretch changes now, so students can isolate height and compression.',
        f: 'Only frequency changes now, so students can track how fast the pattern repeats.'
      };
      if (lockNoteEl) lockNoteEl.textContent = notes[lock] || notes.none;
    }

    function buildModelExpression() {
      if (modelState.family === 'linear') {
        const { m, b } = modelState.linear;
        return `${formatNumber(m)}*x ${withSign(b)}`;
      }
      if (modelState.family === 'quadratic') {
        const { a, h, k } = modelState.quadratic;
        return `${formatNumber(a)}*(x - (${formatNumber(h)}))^2 ${withSign(k)}`;
      }
      if (modelState.family === 'trig') {
        const { a, f, k } = modelState.trig;
        return `${formatNumber(a)}*sin(${formatNumber(f)}*x) ${withSign(k)}`;
      }
      return null;
    }

    function updateInsightPanel() {
      if (!insightSummaryEl || !insightListEl) return;

      let summary = '';
      let bullets = [];
      if (modelState.family === 'linear') {
        summary = `Slope ${formatNumber(modelState.linear.m)} means y changes by ${formatNumber(modelState.linear.m)} for every 1 step in x, while the intercept ${formatNumber(modelState.linear.b)} controls where the line crosses the y-axis.`;
        bullets = [
          'The green point marks the y-intercept, so students can see the graph start value directly.',
          'The dashed triangle shows rise over run instead of leaving slope as an abstract ratio.',
          'Lock `b` to prove that changing intercept slides the line without changing steepness.'
        ];
      } else if (modelState.family === 'quadratic') {
        summary = `The coefficient ${formatNumber(modelState.quadratic.a)} controls whether the parabola opens up or down and how tightly it bends, while (${formatNumber(modelState.quadratic.h)}, ${formatNumber(modelState.quadratic.k)}) sets the vertex.`;
        bullets = [
          'The orange point marks the vertex, the graph’s highest or lowest point.',
          'The dashed symmetry line helps students connect the shape to its center.',
          'A negative a-value flips the parabola and a larger absolute value makes it narrower.'
        ];
      } else if (modelState.family === 'trig') {
        const period = round4((2 * Math.PI) / modelState.trig.f);
        summary = `Amplitude ${formatNumber(modelState.trig.a)} controls wave height, frequency ${formatNumber(modelState.trig.f)} controls how fast it repeats, and the period is about ${formatNumber(period)}.`;
        bullets = [
          'The turquoise marker shows the top of one wave cycle.',
          'The dashed horizontal measure shows one full period.',
          'Lock frequency to feel repetition speed without changing height.'
        ];
      } else {
        summary = 'Data mode turns observations into a graph so students can connect simulation, measurement, and interpretation.';
        bullets = [
          'Imported points stay visible as dots, not just as a smooth line.',
          'Use convergence data from probability lessons to show long-run behavior.',
          'Students can compare real data with a modeled function by plotting both together.'
        ];
      }

      insightSummaryEl.textContent = summary;
      insightListEl.innerHTML = bullets.map(item => `<li>${item}</li>`).join('');
    }

    function updateGeneratedEquation() {
      if (!generatedEqEl) return;
      if (modelState.family === 'data') {
        generatedEqEl.textContent = 'Data mode: plot measured points and compare them against other functions.';
        return;
      }
      const expr = buildModelExpression();
      generatedEqEl.textContent = 'y = ' + expr;
    }

    function updateModelFunction() {
      updateSliderVisibility();
      applyLockState();
      updateGeneratedEquation();
      updateInsightPanel();

      Object.entries(valueLabels).forEach(([key, node]) => {
        if (!node) return;
        const parts = key.split('-');
        if (key === 'domain-min') node.textContent = formatNumber(modelState.domain.min);
        else if (key === 'domain-max') node.textContent = formatNumber(modelState.domain.max);
        else node.textContent = formatNumber(modelState[parts[0]][parts[1]]);
      });

      if (modelState.family === 'data') {
        fns = fns.filter(fn => fn.id !== MODEL_FN_ID);
        renderFnList();
        draw();
        return;
      }

      const expr = buildModelExpression();
      upsertExpressionFn(MODEL_FN_ID, expr, {
        color: '#007aff',
        domain: { min: modelState.domain.min, max: modelState.domain.max },
        meta: {
          family: modelState.family,
          params: modelState[modelState.family]
        }
      });
    }

    function setMode(mode) {
      modelState.mode = mode;
      setActiveChip('gc-mode-chips', 'mode', mode);
      updateModelFunction();
    }

    function setFamily(family) {
      modelState.family = family;
      setActiveChip('gc-family-chips', 'family', family);
      updateModelFunction();
    }

    function setLock(lock) {
      modelState.lock = lock;
      setActiveChip('gc-lock-chips', 'lock', lock);
      updateModelFunction();
    }

    function applyFamilyValues(family, values) {
      if (!family || !values || !modelState[family]) return;
      Object.entries(values).forEach(([key, value]) => {
        modelState[family][key] = value;
        const input = sliderConfig[family] && sliderConfig[family][key];
        if (input) input.value = value;
      });
      updateModelFunction();
    }

    function openPanel(panelName) {
      if (!sidepanelEl) return;
      sidepanelEl.classList.add('is-open');
      if (sidepanelTitleEl) sidepanelTitleEl.textContent = panelTitles[panelName] || 'Quick Panel';
      document.querySelectorAll('.gc-panel-view').forEach(view => {
        view.hidden = view.dataset.panelView !== panelName;
      });
      document.querySelectorAll('.gc-dock-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.panel === panelName);
      });
      sidepanelEl.dataset.openPanel = panelName;
    }

    function closePanel() {
      if (!sidepanelEl) return;
      sidepanelEl.classList.remove('is-open');
      delete sidepanelEl.dataset.openPanel;
      document.querySelectorAll('.gc-dock-btn').forEach(btn => btn.classList.remove('is-active'));
    }

    function showTerm(term) {
      const def = termDefinitions[term];
      if (!def || !termTooltipEl || !termTitleEl || !termBodyEl) return;
      termTitleEl.textContent = def.title;
      termBodyEl.textContent = def.body;
      termTooltipEl.classList.add('is-open');
    }

    function launchMission(name) {
      const config = missionConfigs[name];
      if (!config) return;
      setMode('beginner');
      setFamily(config.family);
      setLock(config.lock);
      applyFamilyValues(config.family, config.values);
      if (missionPromptEl) missionPromptEl.textContent = config.prompt;
      openPanel('missions');
    }

    function triggerAchievement(name) {
      const config = achievementConfigs[name];
      if (!config) return;
      setMode(config.mode);
      setFamily(config.family);
      setLock(config.lock);
      applyFamilyValues(config.family, config.values);
      openPanel('goals');
    }

    function syncWindowFromView() {
      calculatorState.window = {
        xmin: round4(view.xMin),
        xmax: round4(view.xMax),
        ymin: round4(view.yMin),
        ymax: round4(view.yMax)
      };
    }

    function applyWindowToView() {
      view.xMin = calculatorState.window.xmin;
      view.xMax = calculatorState.window.xmax;
      view.yMin = calculatorState.window.ymin;
      view.yMax = calculatorState.window.ymax;
      draw();
    }

    function setCalculatorMessage(message) {
      calculatorState.history.unshift(message);
      calculatorState.history = calculatorState.history.slice(0, 6);
      renderCalculatorScreen();
    }

    function renderCalculatorScreen() {
      if (!tiDisplayEl || !tiEntryTextEl || !tiViewTitleEl || !tiEntryLabelEl) return;

      const screen = calculatorState.screen;
      tiViewTitleEl.textContent = screen.toUpperCase();
      if (tiModeBitEl) tiModeBitEl.textContent = screen === 'y=' ? 'Y=' : screen.charAt(0).toUpperCase() + screen.slice(1);
      if (tiSecondBitEl) tiSecondBitEl.style.opacity = calculatorState.second ? '1' : '0.38';
      if (tiAlphaBitEl) tiAlphaBitEl.style.opacity = calculatorState.alpha ? '1' : '0.38';
      if (tiHistoryLabelEl) tiHistoryLabelEl.textContent = calculatorState.history[0] || 'Ready';

      let display = '';
      let label = 'Input';
      let entry = calculatorState.entry;

      if (screen === 'home') {
        display = calculatorState.history.slice(0, 4).join('\n');
        label = 'Home';
      } else if (screen === 'y=') {
        display = calculatorState.equations.map((eq, index) => `Y${index + 1}=${eq || ''}`).join('\n');
        label = 'Y1';
        entry = calculatorState.equations[0];
      } else if (screen === 'window') {
        const w = calculatorState.window;
        display = `Xmin=${formatNumber(w.xmin)}\nXmax=${formatNumber(w.xmax)}\nYmin=${formatNumber(w.ymin)}\nYmax=${formatNumber(w.ymax)}`;
        label = 'xmin,xmax,ymin,ymax';
        entry = calculatorState.entry || `${formatNumber(w.xmin)},${formatNumber(w.xmax)},${formatNumber(w.ymin)},${formatNumber(w.ymax)}`;
      } else if (screen === 'graph') {
        display = `Graphing Y1=${calculatorState.equations[0] || ' '}\nWindow X:[${formatNumber(view.xMin)}, ${formatNumber(view.xMax)}]\nWindow Y:[${formatNumber(view.yMin)}, ${formatNumber(view.yMax)}]`;
        label = 'Graph';
        entry = calculatorState.equations[0];
      } else if (screen === 'table') {
        display = 'Table mode uses the current focus function and the current graph window.';
        label = 'Table';
      } else if (screen === 'mode') {
        display = 'Angle: Degree\nInterface: TI-inspired\nGraph engine: live canvas';
        label = 'Mode';
        entry = '';
      }

      tiDisplayEl.textContent = display;
      tiEntryLabelEl.textContent = label;
      tiEntryTextEl.textContent = entry || ' ';
    }

    function setCalculatorScreen(screen) {
      calculatorState.screen = screen;
      if (screen !== 'table') tablePanelEl?.classList.remove('is-open');
      renderCalculatorScreen();
    }

    function upsertCalculatorY1() {
      const expr = calculatorState.equations[0].trim();
      if (!expr) return false;
      const ok = upsertExpressionFn('gc-y1', expr, {
        color: '#ff3b30',
        meta: { family: 'calculator', source: 'Y1' }
      });
      if (ok) setCalculatorMessage(`Graphed Y1 = ${expr}`);
      else setCalculatorMessage('Y1 could not be graphed.');
      return ok;
    }

    function evaluateHomeEntry() {
      const expr = calculatorState.entry.trim();
      if (!expr) return;
      if (/[xX]/.test(expr)) {
        addFn(expr);
        setCalculatorMessage(`Plotted ${expr}`);
      } else {
        const value = evalExpr(expr, 0);
        setCalculatorMessage(isNaN(value) ? 'Expression could not be evaluated.' : `${expr} = ${formatNumber(value)}`);
      }
      calculatorState.entry = '';
      renderCalculatorScreen();
    }

    function commitWindowEntry() {
      const values = calculatorState.entry.split(',').map(part => parseFloat(part.trim()));
      if (values.length !== 4 || values.some(value => !isFinite(value))) {
        setCalculatorMessage('Window expects xmin,xmax,ymin,ymax');
        return;
      }
      calculatorState.window = { xmin: values[0], xmax: values[1], ymin: values[2], ymax: values[3] };
      applyWindowToView();
      calculatorState.entry = '';
      setCalculatorMessage('Window updated.');
    }

    function buildTableRows() {
      const focus = getFnById('gc-y1') || getFocusFn();
      if (!focus || !tableBodyEl) return;
      const rows = [];
      const start = Math.ceil(view.xMin);
      const end = Math.floor(view.xMax);
      for (let x = start; x <= Math.min(end, start + 10); x++) {
        const y = evaluateFnAt(focus, x);
        rows.push({ x, y: isNaN(y) ? 'undef' : formatNumber(y) });
      }
      calculatorState.tableRows = rows;
      tableBodyEl.innerHTML = rows.map(row => `<tr><td>${row.x}</td><td>${row.y}</td></tr>`).join('');
    }

    function handleCalculatorKey(key) {
      if (key === 'SECOND') {
        calculatorState.second = !calculatorState.second;
        renderCalculatorScreen();
        return;
      }
      if (key === 'ALPHA') {
        calculatorState.alpha = !calculatorState.alpha;
        renderCalculatorScreen();
        return;
      }
      if (key === 'Y=' || key === 'WINDOW' || key === 'GRAPH' || key === 'TABLE' || key === 'MODE' || key === 'HOME') {
        const target = key === 'Y=' ? 'y=' : key.toLowerCase();
        if (target === 'graph') {
          syncWindowFromView();
          upsertCalculatorY1();
        }
        if (target === 'table') {
          buildTableRows();
          tablePanelEl?.classList.add('is-open');
        }
        setCalculatorScreen(target);
        return;
      }
      if (key === 'ZOOM') {
        Object.assign(view, DEFAULT_VIEW);
        syncWindowFromView();
        setCalculatorMessage('Zoom reset to default window.');
        setCalculatorScreen('graph');
        return;
      }
      if (key === 'TRACE') {
        modelState.animate = !modelState.animate;
        const animateToggle = document.getElementById('gc-toggle-animate');
        if (animateToggle) animateToggle.checked = modelState.animate;
        draw();
        setCalculatorMessage(modelState.animate ? 'Trace animation on.' : 'Trace animation off.');
        setCalculatorScreen('graph');
        return;
      }
      if (key === 'CLEAR') {
        calculatorState.entry = '';
        if (calculatorState.screen === 'y=') calculatorState.equations[0] = '';
        renderCalculatorScreen();
        return;
      }
      if (key === 'DEL') {
        if (calculatorState.screen === 'y=') calculatorState.equations[0] = calculatorState.equations[0].slice(0, -1);
        else calculatorState.entry = calculatorState.entry.slice(0, -1);
        renderCalculatorScreen();
        return;
      }
      if (key === 'ENTER') {
        if (calculatorState.screen === 'home') evaluateHomeEntry();
        else if (calculatorState.screen === 'y=') {
          upsertCalculatorY1();
          setCalculatorScreen('graph');
        } else if (calculatorState.screen === 'window') {
          commitWindowEntry();
        }
        return;
      }

      const value = key === 'pi' ? 'pi' : key;
      if (calculatorState.screen === 'y=') calculatorState.equations[0] += value;
      else calculatorState.entry += value;
      renderCalculatorScreen();
    }

    function parseDataPoints(text) {
      return String(text || '')
        .split(/\n+/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.split(',').map(part => parseFloat(part.trim())))
        .filter(parts => parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]))
        .sort((a, b) => a[0] - b[0])
        .map(parts => ({ x: parts[0], y: parts[1] }));
    }

    function setDataStatus(text, tone) {
      if (!dataStatusEl) return;
      dataStatusEl.textContent = text;
      dataStatusEl.style.color = tone === 'error' ? '#ff3b30' : tone === 'success' ? '#34c759' : 'var(--text-muted, #5c5c62)';
    }

    function importDataPoints(text, label) {
      const points = parseDataPoints(text);
      if (!points.length) {
        setDataStatus('No valid points found. Use one x,y pair per line.', 'error');
        return;
      }
      modelState.dataPoints = points;
      setFamily('data');
      upsertDataFn(points, { label: label || 'Imported data' });
      setDataStatus(`Imported ${points.length} data point${points.length === 1 ? '' : 's'} and connected them on the graph.`, 'success');
      const xValues = points.map(point => point.x);
      const yValues = points.map(point => point.y);
      view.xMin = Math.min(DEFAULT_VIEW.xMin, Math.min.apply(null, xValues) - 1);
      view.xMax = Math.max(DEFAULT_VIEW.xMax, Math.max.apply(null, xValues) + 1);
      view.yMin = Math.min(DEFAULT_VIEW.yMin, Math.min.apply(null, yValues) - 1);
      view.yMax = Math.max(DEFAULT_VIEW.yMax, Math.max.apply(null, yValues) + 1);
      draw();
    }

    function tryAutoImportData() {
      try {
        const raw = window.localStorage.getItem(AUTO_IMPORT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.points)) {
          const points = parsed.points
            .filter(point => point && Number.isFinite(point.x) && Number.isFinite(point.y))
            .map(point => ({ x: point.x, y: point.y }));
          if (points.length) {
            if (dataInputEl) dataInputEl.value = points.map(point => `${point.x},${point.y}`).join('\n');
            importDataPoints(points.map(point => `${point.x},${point.y}`).join('\n'), parsed.label || 'Imported lesson data');
          }
        }
      } catch (error) {
        // Ignore malformed cross-lesson payloads.
      }
    }

    Object.entries(sliderConfig).forEach(([family, controls]) => {
      Object.entries(controls).forEach(([key, input]) => {
        if (!input) return;
        input.addEventListener('input', function () {
          modelState[family][key] = parseFloat(input.value);
          updateModelFunction();
        });
      });
    });

    const domainMinInput = document.getElementById('gc-domain-min');
    const domainMaxInput = document.getElementById('gc-domain-max');
    if (domainMinInput) {
      domainMinInput.addEventListener('input', function () {
        const nextMin = parseFloat(domainMinInput.value);
        modelState.domain.min = Math.min(nextMin, modelState.domain.max - 1);
        domainMinInput.value = modelState.domain.min;
        updateModelFunction();
      });
    }
    if (domainMaxInput) {
      domainMaxInput.addEventListener('input', function () {
        const nextMax = parseFloat(domainMaxInput.value);
        modelState.domain.max = Math.max(nextMax, modelState.domain.min + 1);
        domainMaxInput.value = modelState.domain.max;
        updateModelFunction();
      });
    }

    document.getElementById('gc-mode-chips')?.addEventListener('click', function (e) {
      const btn = e.target.closest('.gc-chip[data-mode]');
      if (!btn) return;
      setMode(btn.dataset.mode);
    });

    document.getElementById('gc-family-chips')?.addEventListener('click', function (e) {
      const btn = e.target.closest('.gc-chip[data-family]');
      if (!btn) return;
      setFamily(btn.dataset.family);
    });

    document.getElementById('gc-lock-chips')?.addEventListener('click', function (e) {
      const btn = e.target.closest('.gc-chip[data-lock]');
      if (!btn) return;
      setLock(btn.dataset.lock);
    });

    document.getElementById('gc-toggle-annotations')?.addEventListener('change', function (e) {
      modelState.annotations = e.target.checked;
      draw();
    });
    document.getElementById('gc-toggle-intersections')?.addEventListener('change', function (e) {
      modelState.intersections = e.target.checked;
      draw();
    });
    document.getElementById('gc-toggle-animate')?.addEventListener('change', function (e) {
      modelState.animate = e.target.checked;
      draw();
    });
    document.getElementById('gc-toggle-invalid')?.addEventListener('change', function (e) {
      modelState.invalid = e.target.checked;
      draw();
    });

    document.getElementById('gc-import-data-btn')?.addEventListener('click', function () {
      importDataPoints(dataInputEl ? dataInputEl.value : '', 'Imported data');
    });

    document.getElementById('gc-load-probability-btn')?.addEventListener('click', function () {
      const text = PROBABILITY_SAMPLE.map(point => point.join(',')).join('\n');
      if (dataInputEl) dataInputEl.value = text;
      importDataPoints(text, 'Coin flip convergence');
    });

    document.getElementById('gc-clear-data-btn')?.addEventListener('click', function () {
      fns = fns.filter(fn => fn.id !== DATA_FN_ID);
      modelState.dataPoints = [];
      renderFnList();
      draw();
      setDataStatus('Data graph cleared. Your manual functions and slider model are still available.', 'info');
    });

    document.getElementById('gc-export-btn')?.addEventListener('click', function () {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'graphing-calculator.png';
      link.click();
    });

    dockEl?.addEventListener('click', function (e) {
      const btn = e.target.closest('.gc-dock-btn');
      if (!btn) return;
      const panel = btn.dataset.panel;
      if (sidepanelEl && sidepanelEl.dataset.openPanel === panel && sidepanelEl.classList.contains('is-open')) {
        closePanel();
        return;
      }
      openPanel(panel);
    });

    document.getElementById('gc-panel-close')?.addEventListener('click', closePanel);
    document.getElementById('gc-open-help')?.addEventListener('click', function () {
      openPanel('help');
    });
    document.getElementById('gc-hero-help-btn')?.addEventListener('click', function () {
      openPanel('help');
    });

    const heroInput = document.getElementById('gc-hero-input');
    const heroPlotBtn = document.getElementById('gc-hero-plot-btn');
    heroPlotBtn?.addEventListener('click', function () {
      const expr = heroInput?.value.trim();
      if (!expr) return;
      addFn(expr);
      if (heroInput) heroInput.value = '';
    });
    heroInput?.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      heroPlotBtn?.click();
    });
    heroInput?.addEventListener('input', clearError);

    document.querySelectorAll('[data-hero-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addFn(btn.dataset.heroPreset);
      });
    });
    document.querySelectorAll('[data-hero-mission]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        launchMission(btn.dataset.heroMission);
      });
    });

    document.querySelector('[data-panel-view="help"]')?.addEventListener('click', function (e) {
      const termBtn = e.target.closest('.gc-term-btn');
      if (termBtn) {
        showTerm(termBtn.dataset.term);
        return;
      }
      const hookBtn = e.target.closest('.gc-hook-btn');
      if (hookBtn) {
        setMode('beginner');
        setFamily(hookBtn.dataset.hookFamily);
        openPanel('help');
      }
    });

    document.querySelector('[data-panel-view="functions"]')?.addEventListener('click', function (e) {
      const btn = e.target.closest('.gc-picker-btn');
      if (!btn) return;
      if (btn.dataset.pickerFamily) {
        setFamily(btn.dataset.pickerFamily);
        setLock('none');
      } else if (btn.dataset.presetEq) {
        addFn(btn.dataset.presetEq);
      }
    });

    document.querySelector('[data-panel-view="missions"]')?.addEventListener('click', function (e) {
      const btn = e.target.closest('.gc-mission-launch');
      if (!btn) return;
      launchMission(btn.dataset.mission);
    });

    document.querySelector('[data-panel-view="goals"]')?.addEventListener('click', function (e) {
      const btn = e.target.closest('.gc-achievement-btn');
      if (!btn) return;
      triggerAchievement(btn.dataset.achievement);
    });

    document.querySelector('[data-panel-view="settings"]')?.addEventListener('click', function (e) {
      const btn = e.target.closest('.gc-overlay-btn');
      if (!btn) return;
      const target = document.getElementById(btn.dataset.overlayTarget);
      if (!target) return;
      target.checked = !target.checked;
      target.dispatchEvent(new Event('change'));
    });

    document.getElementById('gc-open-full-quiz')?.addEventListener('click', function () {
      if (gcMode !== 'lesson') { saveMode('lesson'); applyMode('lesson'); }
      closePanel();
      document.querySelector('.gc-quiz')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (document.querySelector('.gc-graph-stack')?.classList.contains('is-focus')) {
        setGraphFocus(false);
      } else {
        closePanel();
      }
    });

    document.getElementById('gc-ti-keypad')?.addEventListener('click', function (e) {
      const btn = e.target.closest('.gc-ti-key');
      if (!btn) return;
      handleCalculatorKey(btn.dataset.tiKey);
    });

    const graphStackEl = document.querySelector('.gc-graph-stack');
    const focusGraphBtn = document.getElementById('gc-focus-graph');

    function setGraphFocus(active) {
      if (!graphStackEl || !focusGraphBtn) return;
      graphStackEl.classList.toggle('is-focus', active);
      document.body.classList.toggle('gc-focus-active', active);
      focusGraphBtn.setAttribute('aria-pressed', String(active));
      focusGraphBtn.setAttribute('aria-label', active ? 'Exit graph focus mode' : 'Show only the graph');
      focusGraphBtn.querySelector('.gc-tool-label').textContent = active ? 'Exit' : 'Focus';
      focusGraphBtn.title = active ? 'Exit graph focus mode' : 'Show only the graph';
      window.requestAnimationFrame(resizeCanvas);
      announceGraph(active ? 'Graph focus mode opened. Press Escape to exit.' : 'Graph focus mode closed.');
    }

    document.getElementById('gc-auto-fit')?.addEventListener('click', autoFitY);
    focusGraphBtn?.addEventListener('click', function () {
      setGraphFocus(!graphStackEl.classList.contains('is-focus'));
    });
    document.getElementById('gc-copy-link')?.addEventListener('click', async function () {
      const button = this;
      const label = button.querySelector('.gc-tool-label');
      const originalLabel = label.textContent;
      try {
        await navigator.clipboard.writeText(graphShareUrl());
        label.textContent = 'Copied';
        button.classList.add('is-success');
        announceGraph('A shareable link to this graph was copied.');
      } catch (error) {
        window.prompt('Copy this graph link:', graphShareUrl());
        label.textContent = 'Ready';
        announceGraph('The shareable graph link is ready to copy.');
      }
      window.setTimeout(() => {
        label.textContent = originalLabel;
        button.classList.remove('is-success');
      }, 1800);
    });

    function animateFrame() {
      modelState.animationPhase = (modelState.animationPhase + 0.0035) % 1;
      if (modelState.animate) draw();
      window.requestAnimationFrame(animateFrame);
    }

    /* ─── Init ──────────────────────────────────────────── */
    const heroSection = document.querySelector('.gc-hero');
    const calculatorSection = document.getElementById('gc-calculator');
    const focusShell = document.querySelector('.gc-focus-shell');
    const workstage = document.querySelector('.gc-workstage');
    const pageShell = document.querySelector('.gc-page-shell');
    const modeToggleBtn = document.getElementById('gc-mode-toggle');

    /* Snapshot the authored (Lesson-mode) document order once, before any
       reorder ever runs, using invisible anchor comment nodes — so switching
       back to Lesson mode after App mode is a reliable replay instead of an
       algebraic reversal of the App-mode DOM moves. */
    const authoredOrder = [];
    function snapshotAuthoredOrder() {
      if (!pageShell) return;
      const tracked = [];
      if (focusShell) tracked.push(focusShell);
      Array.from(pageShell.querySelectorAll('.gc-detail-section')).forEach(section => tracked.push(section));
      tracked.forEach(node => {
        const anchor = document.createComment('gc-anchor');
        node.parentElement.insertBefore(anchor, node.nextSibling);
        authoredOrder.push({ node: node, anchor: anchor });
      });
    }
    function restoreAuthoredOrder() {
      authoredOrder.forEach(function (entry) {
        if (entry.node.nextSibling !== entry.anchor) {
          entry.anchor.parentElement.insertBefore(entry.node, entry.anchor);
        }
      });
    }

    function reflowForMode(mode) {
      if (mode === 'app') {
        if (workstage && calculatorSection && calculatorSection.parentElement !== workstage) {
          workstage.prepend(calculatorSection);
        }
        if (pageShell && focusShell) {
          let supportStack = document.getElementById('gc-support-stack');
          if (!supportStack) {
            supportStack = document.createElement('div');
            supportStack.id = 'gc-support-stack';
            supportStack.className = 'gc-support-stack';
            focusShell.insertAdjacentElement('afterend', supportStack);
          }
          Array.from(pageShell.querySelectorAll('.gc-detail-section')).forEach(section => {
            supportStack.appendChild(section);
          });
        }
        if (heroSection && focusShell && focusShell.previousElementSibling !== heroSection) {
          heroSection.insertAdjacentElement('afterend', focusShell);
        }
      } else {
        restoreAuthoredOrder();
      }
    }

    function applyMode(mode) {
      document.documentElement.setAttribute('data-gc-mode', mode);
      gcMode = mode;
      if (modeToggleBtn) {
        modeToggleBtn.setAttribute('aria-pressed', mode === 'lesson' ? 'true' : 'false');
        const label = modeToggleBtn.querySelector('.gc-mode-toggle-label');
        if (label) label.textContent = mode === 'lesson' ? 'Switch to App Mode' : 'Switch to Lesson Mode';
      }
      reflowForMode(mode);
    }

    modeToggleBtn?.addEventListener('click', function () {
      const next = gcMode === 'lesson' ? 'app' : 'lesson';
      saveMode(next);
      applyMode(next);
    });

    snapshotAuthoredOrder();
    applyMode(gcMode);

    const stage = SimKit.canvas2d(canvas, { box: canvas.parentElement, dpr: false, onResize: function (rCtx) {
      ctx = rCtx;
      draw();
    } });

    updateModelFunction();
    loadSharedGraph();
    syncWindowFromView();
    renderCalculatorScreen();
    tryAutoImportData();
    window.requestAnimationFrame(animateFrame);

    /* ═══════════════════════════════════════════════════════
       MINI-GRAPH WIDGET — a small, independent, page-scoped
       live graph you can drop into any lesson example via
       <div class="gc-mini-graph" data-expr="..." data-view="...">.
       Each instance keeps its own view/canvas closure; none of
       them touch the singleton view/fns/modelState above, which
       power only #gc-calculator.
    ═══════════════════════════════════════════════════════ */
    function mountMiniGraph(container) {
      const exprs = (container.dataset.expr || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!exprs.length) return;
      const viewParts = (container.dataset.view || '-10,10,-10,10').split(',').map(Number);
      const miniView = { xMin: viewParts[0], xMax: viewParts[1], yMin: viewParts[2], yMax: viewParts[3] };
      const height = Number(container.dataset.height) || 160;
      const interactive = container.dataset.interactive === 'true';
      const userColors = (container.dataset.colors || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

      container.classList.add('gc-mini-graph-mounted');
      container.style.height = height + 'px';
      const miniCanvas = document.createElement('canvas');
      container.appendChild(miniCanvas);

      let miniCtx = null, miniWidth = 0, miniHeight = 0;

      function palette() {
        const theme = SimKit.theme.colors();
        const fallback = [theme.accent, '#ff9500', '#34c759', '#ff375f'];
        return exprs.map(function (_, i) { return userColors[i] || fallback[i % fallback.length]; });
      }

      function toCanvasX(x) { return ((x - miniView.xMin) / (miniView.xMax - miniView.xMin)) * miniWidth; }
      function toCanvasY(y) { return miniHeight - ((y - miniView.yMin) / (miniView.yMax - miniView.yMin)) * miniHeight; }

      function render() {
        if (!miniCtx) return;
        const theme = SimKit.theme.colors();
        const colors = palette();
        miniCtx.clearRect(0, 0, miniWidth, miniHeight);

        // Axes (only drawn if they fall within the current view).
        miniCtx.strokeStyle = theme.textMuted;
        miniCtx.lineWidth = 1;
        if (miniView.yMin <= 0 && miniView.yMax >= 0) {
          const y0 = toCanvasY(0);
          miniCtx.beginPath(); miniCtx.moveTo(0, y0); miniCtx.lineTo(miniWidth, y0); miniCtx.stroke();
        }
        if (miniView.xMin <= 0 && miniView.xMax >= 0) {
          const x0 = toCanvasX(0);
          miniCtx.beginPath(); miniCtx.moveTo(x0, 0); miniCtx.lineTo(x0, miniHeight); miniCtx.stroke();
        }

        exprs.forEach(function (expr, i) {
          miniCtx.strokeStyle = colors[i];
          miniCtx.lineWidth = 2;
          miniCtx.beginPath();
          let penDown = false;
          const steps = Math.max(64, Math.floor(miniWidth));
          for (let s = 0; s <= steps; s++) {
            const x = miniView.xMin + (s / steps) * (miniView.xMax - miniView.xMin);
            let y;
            try { y = evalExpr(expr, x); } catch (e) { y = NaN; }
            if (!isFinite(y)) { penDown = false; continue; }
            const cx = toCanvasX(x);
            const cy = toCanvasY(y);
            if (!penDown) { miniCtx.moveTo(cx, cy); penDown = true; }
            else { miniCtx.lineTo(cx, cy); }
          }
          miniCtx.stroke();
        });
      }

      const miniStage = SimKit.canvas2d(miniCanvas, { box: container, dpr: 2, onResize: function (rCtx, w, h) {
        miniCtx = rCtx; miniWidth = w; miniHeight = h;
        render();
      } });

      SimKit.theme.onChange(render);

      if (interactive) {
        let dragging = false;
        let lastX = 0, lastY = 0;
        miniCanvas.addEventListener('pointerdown', function (e) {
          dragging = true; lastX = e.clientX; lastY = e.clientY;
          miniCanvas.setPointerCapture(e.pointerId);
        });
        miniCanvas.addEventListener('pointermove', function (e) {
          if (!dragging) return;
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX; lastY = e.clientY;
          const spanX = miniView.xMax - miniView.xMin;
          const spanY = miniView.yMax - miniView.yMin;
          const shiftX = -(dx / miniWidth) * spanX;
          const shiftY = (dy / miniHeight) * spanY;
          miniView.xMin += shiftX; miniView.xMax += shiftX;
          miniView.yMin += shiftY; miniView.yMax += shiftY;
          render();
        });
        miniCanvas.addEventListener('pointerup', function () { dragging = false; });
        miniCanvas.addEventListener('pointercancel', function () { dragging = false; });
        miniCanvas.addEventListener('wheel', function (e) {
          e.preventDefault();
          const factor = e.deltaY > 0 ? 1.1 : 0.9;
          const cx = (miniView.xMin + miniView.xMax) / 2;
          const cy = (miniView.yMin + miniView.yMax) / 2;
          const spanX = (miniView.xMax - miniView.xMin) * factor;
          const spanY = (miniView.yMax - miniView.yMin) * factor;
          miniView.xMin = cx - spanX / 2; miniView.xMax = cx + spanX / 2;
          miniView.yMin = cy - spanY / 2; miniView.yMax = cy + spanY / 2;
          render();
        }, { passive: false });
      }
    }

    function mountAllMiniGraphs() {
      document.querySelectorAll('.gc-mini-graph').forEach(mountMiniGraph);
    }
    mountAllMiniGraphs();

    /* ═══════════════════════════════════════════════════════
       QUICK CHECK QUIZ
    ═══════════════════════════════════════════════════════ */
    const quizQuestions = document.querySelectorAll('.gc-question');
    const quizScore = document.getElementById('gc-quiz-score');
    const quizReset = document.getElementById('gc-quiz-reset');

    function updateQuizScore() {
      if (!quizScore) return;
      const total = quizQuestions.length;
      let answered = 0;
      let correct = 0;

      quizQuestions.forEach(function (question) {
        if (question.dataset.answered === 'true') answered++;
        if (question.dataset.result === 'correct') correct++;
      });

      quizScore.textContent = answered === total
        ? `${correct} / ${total} correct`
        : `${correct} / ${total} correct · ${total - answered} to go`;
    }

    quizQuestions.forEach(function (question) {
      const answer      = question.dataset.answer;
      const explanation = question.dataset.explanation;
      const feedback    = question.querySelector('.gc-q-feedback');
      const options     = question.querySelectorAll('.gc-option');

      options.forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (opt.disabled) return;
          options.forEach(function (o) {
            o.disabled = true;
            o.classList.remove('is-correct', 'is-wrong');
            if (o.dataset.choice === answer) o.classList.add('is-correct');
          });
          if (opt.dataset.choice !== answer) opt.classList.add('is-wrong');
          question.dataset.answered = 'true';
          question.dataset.result = opt.dataset.choice === answer ? 'correct' : 'wrong';
          feedback.textContent = (opt.dataset.choice === answer ? '✓ Correct. ' : '✗ Not quite. ') + explanation;
          feedback.style.color = opt.dataset.choice === answer ? '#34c759' : '#ff3b30';
          updateQuizScore();
        });
      });
    });

    if (quizReset) {
      quizReset.addEventListener('click', function () {
        quizQuestions.forEach(function (question) {
          delete question.dataset.answered;
          delete question.dataset.result;
          const feedback = question.querySelector('.gc-q-feedback');
          const options = question.querySelectorAll('.gc-option');
          options.forEach(function (opt) {
            opt.disabled = false;
            opt.classList.remove('is-correct', 'is-wrong');
          });
          feedback.textContent = '';
          feedback.style.color = 'var(--text-muted, #6e6e73)';
        });
        updateQuizScore();
      });
    }

    updateQuizScore();

  })();

  /* ── Panel controls bridge to graphing calculator ── */
  (function () {
    /* Panel "Plot" button triggers in-page add button */
    var panelInput  = document.getElementById('gc-panel-eq-input');
    var panelAddBtn = document.getElementById('gc-panel-add-btn');
    var inPageInput = document.getElementById('gc-eq-input');
    var inPageBtn   = document.getElementById('gc-add-btn');
    var panelFnList = document.getElementById('gc-panel-fn-list');
    var inPageFnList = document.getElementById('gc-fn-list');

    if (panelAddBtn && inPageBtn && panelInput && inPageInput) {
      panelAddBtn.addEventListener('click', function () {
        inPageInput.value = panelInput.value;
        inPageBtn.click();
        panelInput.value = '';
        syncFnList();
      });
      panelInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') panelAddBtn.click();
      });
    }
    else if (panelAddBtn && panelInput && window.gcPlotExpression) {
      panelAddBtn.addEventListener('click', function () {
        var expr = panelInput.value.trim();
        if (!expr) return;
        window.gcPlotExpression(expr);
        panelInput.value = '';
      });
      panelInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') panelAddBtn.click();
      });
    }
    if (panelInput) {
      panelInput.addEventListener('input', function () {
        panelInput.classList.remove('is-error');
        var errEl = document.getElementById('gc-parse-error');
        if (errEl) errEl.textContent = '';
      });
    }

    /* Panel clear button */
    var panelClearBtn  = document.getElementById('gc-panel-clear-btn');
    var inPageClearBtn = document.getElementById('gc-clear-btn');
    if (panelClearBtn && inPageClearBtn) {
      panelClearBtn.addEventListener('click', function () {
        inPageClearBtn.click();
        syncFnList();
      });
    }
    else if (panelClearBtn && window.gcClearGraphFunctions) {
      panelClearBtn.addEventListener('click', function () {
        window.gcClearGraphFunctions();
      });
    }

    /* Panel preset chips → fire ll:preset and also plot via in-page */
    document.addEventListener('ll:preset', function (e) {
      var vals = e.detail && e.detail.values;
      if (vals && vals.eq && inPageInput && inPageBtn) {
        inPageInput.value = vals.eq;
        inPageBtn.click();
        setTimeout(syncFnList, 50);
      }
      else if (vals && vals.eq && window.gcPlotExpression) {
        window.gcPlotExpression(vals.eq);
      }
    });

    /* Sync fn list display from in-page to panel */
    function syncFnList() {
      if (!panelFnList || !inPageFnList) return;
      panelFnList.innerHTML = inPageFnList.innerHTML;
      /* forward remove-button clicks back to in-page list */
      panelFnList.querySelectorAll('.gc-fn-remove').forEach(function (btn, idx) {
        btn.addEventListener('click', function () {
          var inPageBtns = inPageFnList.querySelectorAll('.gc-fn-remove');
          if (inPageBtns[idx]) inPageBtns[idx].click();
          setTimeout(syncFnList, 50);
        });
      });
    }

    /* Watch in-page fn-list for mutations and keep panel in sync */
    if (inPageFnList && panelFnList) {
      var mo = new MutationObserver(function () { syncFnList(); });
      mo.observe(inPageFnList, { childList: true, subtree: true, characterData: true });
    }

    /* In-page mission buttons also update panel fn list */
    document.querySelectorAll('.gc-mission-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setTimeout(syncFnList, 100); });
    });

    /* In-page preset buttons */
    document.querySelectorAll('#gc-presets .gc-preset-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setTimeout(syncFnList, 100); });
    });
  })();
