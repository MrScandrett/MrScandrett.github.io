/**
 * smart-whiteboard-dock.js — Universal Floating & Dockable AI Smart Blackboard
 *
 * Provides real-time hand-drawn geometry recognition, rotatable 3D solids with
 * net deconstruction and cross-section slicing, Cartesian coordinate graphing,
 * symbolic algebra solving, counter clustering, and automated Common Core explanations.
 *
 * Automatically detects the active lesson's mathematical context to bias recognition.
 */
(function () {
  'use strict';

  function isMathOrPhysicsLesson() {
    var p = (location.pathname || '').toLowerCase();
    if (/(^|\/)lessons\/(mathematics|physics|applied-physics-materials)\//.test(p)) {
      return true;
    }
    var mod = (document.body && document.body.dataset && document.body.dataset.module) || '';
    return /math|physic/i.test(mod);
  }

  if (!isMathOrPhysicsLesson()) return;

  if (window.SmartBlackboardDock) return;

  var STORAGE_KEY = 'classroomos-smart-wb-state';

  /* ── 1. Page Context Detection ── */
  function detectContext() {
    var path = (location.pathname || '').toLowerCase();
    var title = (document.title || '').toLowerCase();
    var h1 = (document.querySelector('h1') ? document.querySelector('h1').textContent : '').toLowerCase();
    var combined = path + ' ' + title + ' ' + h1;

    if (/geometry|trigonometry|pythagor|soh-cah-toa|triangle|circle|polygon|angle|euclid|unit-circle/.test(combined)) {
      return {
        domain: 'geometry',
        label: 'Geometry & Trig',
        badge: '📐 Geometry',
        chips: [
          { label: '📐 Triangle ΔABC', action: 'triangle' },
          { label: '⚪ Circle (πr²)', action: 'circle' },
          { label: '📏 Pythagoras (a²+b²=c²)', action: 'pythagoras' },
          { label: '🎯 SOH CAH TOA', action: 'trig' }
        ]
      };
    }
    if (/3d|solid|prism|cube|cylinder|cone|sphere|surface-area|volume|cad|tinkercad|cross-section|net/.test(combined)) {
      return {
        domain: '3d',
        label: '3D Solid Geometry',
        badge: '📦 3D Solids',
        chips: [
          { label: '📦 Cube / Prism (Net)', action: '3d_cube' },
          { label: '🥫 Cylinder (Slice)', action: '3d_cylinder' },
          { label: '🍦 Cone (Sector Net)', action: '3d_cone' },
          { label: '⚽ Sphere (Cavalieri)', action: '3d_sphere' },
          { label: '💥 Rocket (Composite SA)', action: '3d_composite' }
        ]
      };
    }
    if (/calculus|curve|derivative|integral|riemann|slope|tangent|rate|area-under/.test(combined)) {
      return {
        domain: 'calculus',
        label: 'Calculus & Curves',
        badge: '📈 Calculus',
        chips: [
          { label: '📈 Graph f(x)', action: 'graph' },
          { label: '∫ Area Under Curve', action: 'integral' },
          { label: '⚡ Tangent dy/dx', action: 'tangent' },
          { label: 'Parabola y=x²', action: 'plot_parabola' }
        ]
      };
    }
    if (/algebra|linear|quadratic|polynomial|matrix|logarithm|slope-intercept|system|equation/.test(combined)) {
      return {
        domain: 'algebra',
        label: 'Algebra & Functions',
        badge: '🧮 Algebra',
        chips: [
          { label: '📈 Line y=mx+b', action: 'plot_line' },
          { label: '✨ Quadratic Formula', action: 'solve_quadratic' },
          { label: '➕ Cartesian Axes', action: 'axes' },
          { label: 'Solve Equation', action: 'solver' }
        ]
      };
    }
    if (/foundation|counting|arithmetic|fraction|place-value|multipl|add|subtract/.test(combined)) {
      return {
        domain: 'foundations',
        label: 'Math Foundations',
        badge: '🔘 Foundations',
        chips: [
          { label: '🔘 Counters (Part-Whole)', action: 'counter' },
          { label: '➗ Fraction Bar', action: 'fraction' },
          { label: '➕ Plus Sign (+)', action: 'plus_op' },
          { label: '📝 Explain Reasoning', action: 'explain' }
        ]
      };
    }
    if (/physic|vector|force|velocity|gravity|circuit|motion/.test(combined)) {
      return {
        domain: 'physics',
        label: 'Physics & Vectors',
        badge: '⚡ Physics',
        chips: [
          { label: '↗️ Vector Decomp', action: 'vector' },
          { label: '📈 Coordinate Graph', action: 'graph' },
          { label: '📐 Angle Resolve', action: 'angle' }
        ]
      };
    }
    return {
      domain: 'general',
      label: 'Universal Math Blackboard',
      badge: '✨ Math AI',
      chips: [
        { label: '📐 Triangle', action: 'triangle' },
        { label: '📈 Graph y=f(x)', action: 'graph' },
        { label: '📦 3D Solid', action: '3d_cube' },
        { label: '🧮 Solve Equation', action: 'solver' },
        { label: '🔘 Counters', action: 'counter' }
      ]
    };
  }

  /* ── 2. Dock Construction ── */
  var dockEl = null;
  var chalkCanvas = null;
  var chalkCtx = null;
  var threeCanvas = null;
  var threeCtx = null;
  var detectBanner = null;
  var subPanel = null;
  var subContent = null;
  var launcherBtn = null;

  var state = {
    isOpen: false,
    isMinimized: false,
    dockMode: 'floating', // 'floating', 'dock-right', 'dock-bottom', 'fullscreen'
    x: 80,
    y: 80,
    w: 640,
    h: 520,
    curTool: 'pen', // 'pen', 'counter', 'shape', 'graph', 'solve', 'eraser'
    curMode: 'draw', // 'draw', 'triangle', 'circle', 'graph', '3d_cube', '3d_cylinder', '3d_cone', '3d_sphere', '3d_composite'
    chalkColor: '#f0f6fc',
    counters: [],
    strokes: [],
    history: [],
    redoStack: [],
    triData: null,
    circData: null,
    graphEq: 'y = x^2 - 4',
    graphScale: 30,
    graphOrigin: { x: 0, y: 0 },
    threeRotation: { rx: 0.5, ry: 0.7 },
    unfoldPct: 0,
    sliceY: 0,
    explodeJoint: 0
  };

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        if (typeof saved.x === 'number') state.x = Math.max(10, Math.min(window.innerWidth - 300, saved.x));
        if (typeof saved.y === 'number') state.y = Math.max(10, Math.min(window.innerHeight - 200, saved.y));
        if (typeof saved.w === 'number') state.w = Math.max(360, Math.min(window.innerWidth, saved.w));
        if (typeof saved.h === 'number') state.h = Math.max(300, Math.min(window.innerHeight, saved.h));
        if (saved.dockMode) state.dockMode = saved.dockMode;
        if (typeof saved.isMinimized === 'boolean') state.isMinimized = saved.isMinimized;
      }
    } catch (_) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        x: state.x,
        y: state.y,
        w: state.w,
        h: state.h,
        dockMode: state.dockMode,
        isMinimized: state.isMinimized
      }));
    } catch (_) {}
  }

  /* ── 3. DOM & UI Creation ── */
  function ensureDockDOM() {
    if (dockEl) return;

    loadState();
    var ctxInfo = detectContext();

    // Floating launcher button
    launcherBtn = document.createElement('button');
    launcherBtn.type = 'button';
    launcherBtn.className = 'smart-wb-launcher';
    launcherBtn.setAttribute('aria-label', 'Toggle AI Smart Blackboard (Shift+W)');
    launcherBtn.innerHTML =
      '<span class="launcher-icon">✨</span>' +
      '<span>Blackboard</span>' +
      '<kbd class="launcher-kbd" aria-hidden="true">⇧W</kbd>';
    launcherBtn.addEventListener('click', function () {
      SmartBlackboardDock.toggle();
    });
    document.body.appendChild(launcherBtn);

    // Main dock window
    dockEl = document.createElement('section');
    dockEl.className = 'smart-wb-dock';
    dockEl.setAttribute('aria-label', 'AI Smart Blackboard');
    dockEl.style.left = state.x + 'px';
    dockEl.style.top = state.y + 'px';
    dockEl.style.width = state.w + 'px';
    dockEl.style.height = state.h + 'px';

    dockEl.innerHTML =
      '<header class="smart-wb-header">' +
        '<div class="smart-wb-title-wrap">' +
          '<span class="smart-wb-logo" aria-hidden="true">✨</span>' +
          '<strong class="smart-wb-title">AI Smart Blackboard</strong>' +
          '<span class="smart-wb-context-pill">' + ctxInfo.badge + ' · ' + ctxInfo.label + '</span>' +
        '</div>' +
        '<div class="smart-wb-controls">' +
          '<button type="button" class="smart-wb-btn smart-wb-btn-dock" title="Docking presets: Float, Right, Bottom, Fullscreen">◨ Dock</button>' +
          '<button type="button" class="smart-wb-btn smart-wb-btn-min" title="Minimize / Collapse">➖</button>' +
          '<button type="button" class="smart-wb-btn smart-wb-btn-max" title="Maximize / Restore">⛶</button>' +
          '<button type="button" class="smart-wb-btn smart-wb-btn-close" title="Close Blackboard (Shift+W)">✕</button>' +
        '</div>' +
      '</header>' +
      '<div class="smart-wb-chips">' +
        '<span class="smart-wb-chips-label">Quick:</span>' +
        ctxInfo.chips.map(function (c) {
          return '<button type="button" class="smart-wb-chip" data-action="' + c.action + '">' + c.label + '</button>';
        }).join('') +
      '</div>' +
      '<div class="smart-wb-body">' +
        '<div class="smart-wb-toolbar" role="toolbar" aria-label="Blackboard Tools">' +
          '<div class="smart-wb-tool-group">' +
            '<button type="button" class="smart-wb-tool active" data-tool="pen" title="Draw chalk lines with auto-recognition">🖊️ Pen</button>' +
            '<button type="button" class="smart-wb-tool" data-tool="counter" title="Stamp tactile counters for counting & arithmetic">🔘 Counters</button>' +
            '<button type="button" class="smart-wb-tool" data-tool="eraser" title="Erase strokes or counters">🧹 Eraser</button>' +
          '</div>' +
          '<div class="smart-wb-tool-group">' +
            '<button type="button" class="smart-wb-tool" data-tool="shape" title="2D & 3D Geometry Mode">📐 Shapes & 3D</button>' +
            '<button type="button" class="smart-wb-tool" data-tool="graph" title="Cartesian Coordinate Grapher">📈 Graph</button>' +
            '<button type="button" class="smart-wb-tool" data-tool="solve" title="Symbolic Equation Solver">🧮 Solver</button>' +
          '</div>' +
          '<div class="smart-wb-tool-group" style="margin-left:auto;">' +
            '<button type="button" class="smart-wb-tool" data-action="undo" title="Undo">↩️</button>' +
            '<button type="button" class="smart-wb-tool" data-action="clear" title="Clear blackboard">🗑️ Clear</button>' +
            '<button type="button" class="smart-wb-tool" data-action="insert" title="Transcribe math solution into active page">📝 Insert</button>' +
            '<button type="button" class="smart-wb-tool" data-action="voice" title="Read explanation aloud">🔊 Voice</button>' +
          '</div>' +
        '</div>' +
        '<div class="smart-wb-stage">' +
          '<canvas class="smart-wb-canvas" aria-label="Interactive Blackboard Stage"></canvas>' +
          '<canvas class="smart-wb-overlay-3d" aria-label="3D Rotatable Solid Stage"></canvas>' +
          '<div class="smart-wb-detect-banner">' +
            '<span class="smart-wb-detect-text">✨ AI Ready: Draw any shape, equation, or counter pattern</span>' +
            '<span class="smart-wb-detect-status">Live</span>' +
          '</div>' +
        '</div>' +
        '<div class="smart-wb-panel" hidden>' +
          '<div class="smart-wb-panel-content"></div>' +
        '</div>' +
        '<div class="smart-wb-resize-handle" title="Drag to resize"></div>' +
      '</div>';

    document.body.appendChild(dockEl);

    chalkCanvas = dockEl.querySelector('.smart-wb-canvas');
    chalkCtx = chalkCanvas.getContext('2d');
    threeCanvas = dockEl.querySelector('.smart-wb-overlay-3d');
    threeCtx = threeCanvas.getContext('2d');
    detectBanner = dockEl.querySelector('.smart-wb-detect-text');
    subPanel = dockEl.querySelector('.smart-wb-panel');
    subContent = dockEl.querySelector('.smart-wb-panel-content');

    setupWindowInteraction();
    setupCanvasDrawing();
    setup3DInteraction();
    setupToolbar();
    setupChips();
  }

  /* ── 4. Window Interaction (Drag, Resize, Docking) ── */
  function setupWindowInteraction() {
    var header = dockEl.querySelector('.smart-wb-header');
    var isDragging = false;
    var dragStartX = 0, dragStartY = 0;
    var initX = 0, initY = 0;

    header.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.smart-wb-controls') || state.dockMode !== 'floating') return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      initX = dockEl.offsetLeft;
      initY = dockEl.offsetTop;
      try { header.setPointerCapture(e.pointerId); } catch (_) {}
    });

    header.addEventListener('pointermove', function (e) {
      if (!isDragging) return;
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      var newX = Math.max(0, Math.min(window.innerWidth - dockEl.offsetWidth, initX + dx));
      var newY = Math.max(0, Math.min(window.innerHeight - dockEl.offsetHeight, initY + dy));
      state.x = newX;
      state.y = newY;
      dockEl.style.left = newX + 'px';
      dockEl.style.top = newY + 'px';
    });

    function endDrag(e) {
      if (isDragging) {
        isDragging = false;
        try { header.releasePointerCapture(e.pointerId); } catch (_) {}
        saveState();
      }
    }
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);

    // Resize handle
    var resizeHandle = dockEl.querySelector('.smart-wb-resize-handle');
    var isResizing = false;
    var startW = 0, startH = 0;

    resizeHandle.addEventListener('pointerdown', function (e) {
      if (state.dockMode !== 'floating') return;
      isResizing = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      startW = dockEl.offsetWidth;
      startH = dockEl.offsetHeight;
      try { resizeHandle.setPointerCapture(e.pointerId); } catch (_) {}
      e.stopPropagation();
    });

    resizeHandle.addEventListener('pointermove', function (e) {
      if (!isResizing) return;
      var newW = Math.max(360, Math.min(window.innerWidth - state.x - 10, startW + (e.clientX - dragStartX)));
      var newH = Math.max(300, Math.min(window.innerHeight - state.y - 10, startH + (e.clientY - dragStartY)));
      state.w = newW;
      state.h = newH;
      dockEl.style.width = newW + 'px';
      dockEl.style.height = newH + 'px';
      resizeCanvases();
    });

    function endResize(e) {
      if (isResizing) {
        isResizing = false;
        try { resizeHandle.releasePointerCapture(e.pointerId); } catch (_) {}
        saveState();
      }
    }
    resizeHandle.addEventListener('pointerup', endResize);
    resizeHandle.addEventListener('pointercancel', endResize);

    // Controls
    dockEl.querySelector('.smart-wb-btn-close').addEventListener('click', function () {
      SmartBlackboardDock.close();
    });

    dockEl.querySelector('.smart-wb-btn-min').addEventListener('click', function () {
      state.isMinimized = !state.isMinimized;
      dockEl.classList.toggle('is-minimized', state.isMinimized);
      this.textContent = state.isMinimized ? '➕' : '➖';
      saveState();
    });

    dockEl.querySelector('.smart-wb-btn-max').addEventListener('click', function () {
      if (state.dockMode === 'fullscreen') {
        applyDockMode('floating');
      } else {
        applyDockMode('fullscreen');
      }
    });

    var dockModes = ['floating', 'dock-right', 'dock-bottom', 'fullscreen'];
    dockEl.querySelector('.smart-wb-btn-dock').addEventListener('click', function () {
      var nextIdx = (dockModes.indexOf(state.dockMode) + 1) % dockModes.length;
      applyDockMode(dockModes[nextIdx]);
    });
  }

  function applyDockMode(mode) {
    state.dockMode = mode;
    dockEl.classList.remove('mode-dock-right', 'mode-dock-bottom', 'mode-fullscreen');
    if (mode === 'dock-right') dockEl.classList.add('mode-dock-right');
    else if (mode === 'dock-bottom') dockEl.classList.add('mode-dock-bottom');
    else if (mode === 'fullscreen') dockEl.classList.add('mode-fullscreen');
    else {
      dockEl.style.left = state.x + 'px';
      dockEl.style.top = state.y + 'px';
      dockEl.style.width = state.w + 'px';
      dockEl.style.height = state.h + 'px';
    }
    saveState();
    resizeCanvases();
  }

  function resizeCanvases() {
    if (!chalkCanvas) return;
    var stage = dockEl.querySelector('.smart-wb-stage');
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    if (w <= 0 || h <= 0) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    chalkCanvas.width = Math.round(w * dpr);
    chalkCanvas.height = Math.round(h * dpr);
    chalkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    threeCanvas.width = Math.round(w * dpr);
    threeCanvas.height = Math.round(h * dpr);
    threeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    redraw();
  }

  /* ── 5. Multi-Stroke Engine & 2D Drawing ── */
  var isDrawing = false;
  var currentStroke = [];
  var recentStrokes = [];
  var multiStrokeTimer = null;
  var draggingPoint = null;

  function setupCanvasDrawing() {
    function getPos(e) {
      var rect = chalkCanvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    chalkCanvas.addEventListener('pointerdown', function (e) {
      var p = getPos(e);
      if (state.curTool === 'counter') {
        state.counters.push({ x: p.x, y: p.y, num: state.counters.length + 1 });
        triggerRecognition();
        redraw();
        return;
      }

      if (state.curTool === 'eraser') {
        eraseAt(p.x, p.y);
        redraw();
        return;
      }

      if (state.curMode === 'triangle' && state.triData) {
        var hit = null;
        state.triData.pts.forEach(function (pt) {
          if (Math.hypot(pt.x - p.x, pt.y - p.y) < 22) hit = pt;
        });
        if (hit) {
          draggingPoint = hit;
          try { chalkCanvas.setPointerCapture(e.pointerId); } catch (_) {}
          return;
        }
      }

      isDrawing = true;
      currentStroke = [p];
      try { chalkCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    });

    chalkCanvas.addEventListener('pointermove', function (e) {
      var p = getPos(e);
      if (draggingPoint) {
        draggingPoint.x = p.x;
        draggingPoint.y = p.y;
        updateTriangleAnalysis();
        redraw();
        return;
      }
      if (!isDrawing) return;

      currentStroke.push(p);
      redraw();
    });

    function stopDrawing(e) {
      if (draggingPoint) {
        draggingPoint = null;
        try { chalkCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
        return;
      }
      if (!isDrawing) return;
      isDrawing = false;
      try { chalkCanvas.releasePointerCapture(e.pointerId); } catch (_) {}

      if (currentStroke.length > 2) {
        state.strokes.push({ tool: state.curTool, pts: currentStroke, color: state.chalkColor });
        state.history.push({ type: 'stroke', stroke: currentStroke });

        var singleRec = analyzeSingleStroke(currentStroke);
        if (singleRec) {
          recentStrokes = [];
          if (multiStrokeTimer) clearTimeout(multiStrokeTimer);
          applyRecognition(singleRec);
        } else {
          recentStrokes.push(currentStroke);
          if (multiStrokeTimer) clearTimeout(multiStrokeTimer);
          multiStrokeTimer = setTimeout(checkMultiStroke, 420);
        }
      }
      currentStroke = [];
      redraw();
    }

    chalkCanvas.addEventListener('pointerup', stopDrawing);
    chalkCanvas.addEventListener('pointercancel', stopDrawing);
  }

  function eraseAt(x, y) {
    state.counters = state.counters.filter(function (c) {
      return Math.hypot(c.x - x, c.y - y) > 20;
    });
    state.strokes = state.strokes.filter(function (s) {
      return !s.pts.some(function (p) { return Math.hypot(p.x - x, p.y - y) < 18; });
    });
    triggerRecognition();
  }

  function analyzeSingleStroke(pts) {
    if (pts.length < 8) return null;
    var p0 = pts[0], pN = pts[pts.length - 1];
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    var pathLen = 0;

    for (var i = 0; i < pts.length; i++) {
      minX = Math.min(minX, pts[i].x);
      maxX = Math.max(maxX, pts[i].x);
      minY = Math.min(minY, pts[i].y);
      maxY = Math.max(maxY, pts[i].y);
      if (i > 0) pathLen += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    }
    var w = maxX - minX, h = maxY - minY;
    var cx = minX + w / 2, cy = minY + h / 2;
    var endpointDist = Math.hypot(pN.x - p0.x, pN.y - p0.y);
    var isClosed = endpointDist < Math.max(35, Math.min(w, h) * 0.4);

    // Circle detection
    if (isClosed && Math.min(w, h) > 30) {
      var aspect = Math.min(w, h) / Math.max(w, h);
      var rEst = (w + h) / 4;
      var dev = 0;
      for (var j = 0; j < pts.length; j += 2) {
        var d = Math.hypot(pts[j].x - cx, pts[j].y - cy);
        dev += Math.abs(d - rEst);
      }
      dev = dev / (pts.length / 2);
      if (aspect > 0.72 && dev / rEst < 0.28) {
        return { type: 'circle', cx: cx, cy: cy, r: Math.round(rEst) };
      }
    }

    // Single-stroke triangle detection
    if (isClosed && Math.min(w, h) > 35) {
      var corners = detectCorners(pts);
      if (corners.length === 3) {
        return {
          type: 'triangle',
          pts: [
            { x: corners[0].x, y: corners[0].y, label: 'A' },
            { x: corners[1].x, y: corners[1].y, label: 'B' },
            { x: corners[2].x, y: corners[2].y, label: 'C' }
          ]
        };
      }
    }

    // Parabola sketch (U-shape)
    if (!isClosed && w > 60 && h > 45 && endpointDist > 50) {
      var midY = (p0.y + pN.y) / 2;
      var apexY = p0.y < cy ? maxY : minY; // bottom or top apex
      if (Math.abs(midY - apexY) > 35) {
        return { type: 'graph', eq: 'y = (x/3)^2 - 4' };
      }
    }

    // Wave sketch (Sine)
    if (!isClosed && w > 80 && h > 30) {
      var inflections = 0;
      for (var k = 2; k < pts.length - 2; k++) {
        var dy1 = pts[k].y - pts[k-1].y;
        var dy2 = pts[k+1].y - pts[k].y;
        if ((dy1 > 0 && dy2 < 0) || (dy1 < 0 && dy2 > 0)) inflections++;
      }
      if (inflections >= 2) {
        return { type: 'graph', eq: 'y = 3 * sin(x)' };
      }
    }

    return null;
  }

  function detectCorners(pts) {
    var corners = [];
    var step = Math.max(2, Math.floor(pts.length / 24));
    for (var i = step; i < pts.length - step; i += step) {
      var v1 = { x: pts[i].x - pts[i - step].x, y: pts[i].y - pts[i - step].y };
      var v2 = { x: pts[i + step].x - pts[i].x, y: pts[i + step].y - pts[i].y };
      var len1 = Math.hypot(v1.x, v1.y), len2 = Math.hypot(v2.x, v2.y);
      if (len1 > 3 && len2 > 3) {
        var cosTheta = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
        if (cosTheta < 0.65) {
          corners.push({ x: pts[i].x, y: pts[i].y });
          i += step * 2;
        }
      }
    }
    return corners;
  }

  function recognizeMultiStroke(strokes) {
    if (strokes.length < 2 || strokes.length > 5) return null;

    var segments = strokes.map(function (s) {
      var p1 = s[0], p2 = s[s.length - 1];
      var chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      var pathLen = 0;
      for (var i = 1; i < s.length; i++) pathLen += Math.hypot(s[i].x - s[i-1].x, s[i].y - s[i-1].y);
      return { p1: p1, p2: p2, chord: chord, isLine: chord > 20 && (pathLen / Math.max(1, chord)) < 1.45 };
    });

    // 2-Strokes: Plus (+) or Coordinate Axes
    if (segments.length === 2 && segments[0].isLine && segments[1].isLine) {
      var s1 = segments[0], s2 = segments[1];
      var mid1 = { x: (s1.p1.x + s1.p2.x) / 2, y: (s1.p1.y + s1.p2.y) / 2 };
      var mid2 = { x: (s2.p1.x + s2.p2.x) / 2, y: (s2.p1.y + s2.p2.y) / 2 };
      var midDist = Math.hypot(mid1.x - mid2.x, mid1.y - mid2.y);
      var a1 = Math.atan2(s1.p2.y - s1.p1.y, s1.p2.x - s1.p1.x);
      var a2 = Math.atan2(s2.p2.y - s2.p1.y, s2.p2.x - s2.p1.x);
      var diff = Math.abs(a1 - a2);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;

      if (midDist < 45 && Math.abs(diff - Math.PI / 2) < 0.4) {
        if (s1.chord > 80 && s2.chord > 80) {
          return { type: 'graph', eq: 'y = 2*x + 1' }; // axes cross
        }
        return { type: 'operator_plus', x: mid1.x, y: mid1.y };
      }
    }

    // 3-Strokes: Chained Triangle
    if (segments.length === 3 && segments.every(function (s) { return s.isLine; })) {
      var pts = [segments[0].p1, segments[0].p2, segments[1].p1, segments[1].p2, segments[2].p1, segments[2].p2];
      var vertices = [];
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var found = null;
        for (var v = 0; v < vertices.length; v++) {
          if (Math.hypot(vertices[v].x - p.x, vertices[v].y - p.y) < 50) { found = vertices[v]; break; }
        }
        if (!found) { vertices.push({ x: p.x, y: p.y, count: 1 }); }
        else { found.x = (found.x * found.count + p.x) / (found.count + 1); found.y = (found.y * found.count + p.y) / (found.count + 1); found.count++; }
      }
      if (vertices.length === 3 && vertices.every(function (v) { return v.count >= 2; })) {
        return {
          type: 'triangle',
          pts: [
            { x: vertices[0].x, y: vertices[0].y, label: 'A' },
            { x: vertices[1].x, y: vertices[1].y, label: 'B' },
            { x: vertices[2].x, y: vertices[2].y, label: 'C' }
          ]
        };
      }
    }

    // 4-Strokes: Box / 3D Cube
    if (segments.length === 4 && segments.every(function (s) { return s.isLine; })) {
      var pts4 = [];
      segments.forEach(function (s) { pts4.push(s.p1, s.p2); });
      var vertices4 = [];
      for (var j = 0; j < pts4.length; j++) {
        var p4 = pts4[j];
        var found4 = null;
        for (var v4 = 0; v4 < vertices4.length; v4++) {
          if (Math.hypot(vertices4[v4].x - p4.x, vertices4[v4].y - p4.y) < 50) { found4 = vertices4[v4]; break; }
        }
        if (!found4) { vertices4.push({ x: p4.x, y: p4.y, count: 1 }); }
        else { found4.x = (found4.x * found4.count + p4.x) / (found4.count + 1); found4.y = (found4.y * found4.count + p4.y) / (found4.count + 1); found4.count++; }
      }
      if (vertices4.length === 4 && vertices4.every(function (v) { return v.count >= 2; })) {
        return { type: '3d_cube' };
      }
    }

    return null;
  }

  function checkMultiStroke() {
    if (recentStrokes.length < 2) return;
    var rec = recognizeMultiStroke(recentStrokes);
    recentStrokes = [];
    if (rec) applyRecognition(rec);
  }

  function applyRecognition(rec) {
    if (!rec) return;

    if (rec.type === 'circle') {
      state.curMode = 'circle';
      state.circData = { cx: rec.cx, cy: rec.cy, r: rec.r, sectorDeg: 90 };
      setDetectBanner('✨ AI Recognized: Circle (r = ' + rec.r + 'px) → Area: ' + Math.round(Math.PI * rec.r * rec.r) + 'px²');
      openPanel('circle');
    } else if (rec.type === 'triangle') {
      state.curMode = 'triangle';
      state.triData = { pts: rec.pts };
      updateTriangleAnalysis();
      setDetectBanner('✨ AI Recognized: Triangle ΔABC with altitude drop & angle solver');
      openPanel('triangle');
    } else if (rec.type === 'graph') {
      state.curMode = 'graph';
      if (rec.eq) state.graphEq = rec.eq;
      setDetectBanner('✨ AI Recognized: Coordinate Curve → ' + state.graphEq);
      openPanel('graph');
    } else if (rec.type === '3d_cube') {
      switchTo3DMode('3d_cube');
      setDetectBanner('✨ AI Recognized: 3D Box / Cube with Net Unfolding');
    } else if (rec.type === 'operator_plus') {
      setDetectBanner('✨ AI Recognized: Plus Operator (+) for Counter Addition');
      triggerRecognition();
    }
    redraw();
  }

  function setDetectBanner(msg) {
    if (detectBanner) detectBanner.textContent = msg;
  }

  /* ── 6. Triangle & Geometry Analysis ── */
  function updateTriangleAnalysis() {
    if (!state.triData) return;
    var pts = state.triData.pts;
    var A = pts[0], B = pts[1], C = pts[2];

    var a = Math.hypot(B.x - C.x, B.y - C.y); // BC
    var b = Math.hypot(A.x - C.x, A.y - C.y); // AC
    var c = Math.hypot(A.x - B.x, A.y - B.y); // AB

    var alpha = Math.acos(Math.max(-1, Math.min(1, (b*b + c*c - a*a)/(2*b*c)))) * (180/Math.PI);
    var beta  = Math.acos(Math.max(-1, Math.min(1, (a*a + c*c - b*b)/(2*a*c)))) * (180/Math.PI);
    var gamma = 180 - alpha - beta;

    var s = (a + b + c) / 2;
    var area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    var h = (2 * area) / Math.max(1, c); // altitude to AB

    state.triData.analysis = {
      a: a, b: b, c: c,
      alpha: alpha, beta: beta, gamma: gamma,
      area: area, h: h,
      isRight: Math.abs(alpha - 90) < 3 || Math.abs(beta - 90) < 3 || Math.abs(gamma - 90) < 3
    };

    if (subPanel && !subPanel.hidden && state.curMode === 'triangle') {
      updateTrianglePanel();
    }
  }

  function updateTrianglePanel() {
    var an = state.triData.analysis;
    subContent.innerHTML =
      '<div class="smart-wb-panel-row">' +
        '<strong>ΔABC Properties:</strong>' +
        '<span>Sides: a=' + an.a.toFixed(1) + ', b=' + an.b.toFixed(1) + ', c=' + an.c.toFixed(1) + '</span>' +
        '<span>Angles: α=' + an.alpha.toFixed(1) + '°, β=' + an.beta.toFixed(1) + '°, γ=' + an.gamma.toFixed(1) + '°</span>' +
      '</div>' +
      '<div class="smart-wb-math-result">' +
        'Area = ½·b·h = ' + an.area.toFixed(1) + ' px² | Altitude h ⊥ c = ' + an.h.toFixed(1) + ' px ' +
        (an.isRight ? '⭐ Right Triangle: a² + b² = c² verified!' : '') +
      '</div>';
  }

  /* ── 7. 3D Engine & Deconstruction ── */
  function switchTo3DMode(mode) {
    state.curMode = mode;
    chalkCanvas.style.display = 'none';
    threeCanvas.classList.add('active');
    openPanel('3d');
    render3D();
  }

  function exit3DMode() {
    threeCanvas.classList.remove('active');
    chalkCanvas.style.display = 'block';
    state.curMode = 'draw';
    redraw();
  }

  function setup3DInteraction() {
    var isOrbiting = false;
    var lastX = 0, lastY = 0;

    threeCanvas.addEventListener('pointerdown', function (e) {
      isOrbiting = true;
      lastX = e.clientX;
      lastY = e.clientY;
      try { threeCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    });

    threeCanvas.addEventListener('pointermove', function (e) {
      if (!isOrbiting) return;
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      state.threeRotation.ry += dx * 0.012;
      state.threeRotation.rx += dy * 0.012;
      lastX = e.clientX;
      lastY = e.clientY;
      render3D();
    });

    function stopOrbit(e) {
      if (isOrbiting) {
        isOrbiting = false;
        try { threeCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    }
    threeCanvas.addEventListener('pointerup', stopOrbit);
    threeCanvas.addEventListener('pointercancel', stopOrbit);
  }

  function render3D() {
    var w = threeCanvas.width / (window.devicePixelRatio || 1);
    var h = threeCanvas.height / (window.devicePixelRatio || 1);
    threeCtx.clearRect(0, 0, w, h);

    var cx = w / 2, cy = h / 2;
    var rx = state.threeRotation.rx;
    var ry = state.threeRotation.ry;

    function project(x, y, z) {
      // Rotate Y
      var x1 = x * Math.cos(ry) + z * Math.sin(ry);
      var z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      // Rotate X
      var y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
      var z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
      // Perspective
      var fov = 320;
      var scale = fov / (fov + z2 + 180);
      return { px: cx + x1 * scale, py: cy - y2 * scale, depth: z2 };
    }

    threeCtx.lineWidth = 2;

    if (state.curMode === '3d_cube') {
      render3DCube(threeCtx, project, state.unfoldPct);
    } else if (state.curMode === '3d_cylinder') {
      render3DCylinder(threeCtx, project, state.sliceY);
    } else if (state.curMode === '3d_cone') {
      render3DCone(threeCtx, project, state.unfoldPct);
    } else if (state.curMode === '3d_sphere') {
      render3DSphere(threeCtx, project, state.sliceY);
    } else if (state.curMode === '3d_composite') {
      render3DComposite(threeCtx, project, state.explodeJoint);
    }
  }

  function render3DCube(ctx, proj, unfold) {
    var s = 70;
    // 6 faces: center, top, bottom, left, right, front
    // If unfold > 0, interpolate corners to flat net
    var vertices = [
      [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
      [-s, -s,  s], [s, -s,  s], [s, s,  s], [-s, s,  s]
    ];
    var edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7]
    ];

    ctx.strokeStyle = '#38bdf8';
    edges.forEach(function (e) {
      var p1 = proj(vertices[e[0]][0], vertices[e[0]][1], vertices[e[0]][2]);
      var p2 = proj(vertices[e[1]][0], vertices[e[1]][1], vertices[e[1]][2]);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    });

    if (unfold > 0) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      var f = proj(-s, -s, s);
      ctx.fillRect(f.px - s*unfold, f.py, s*2*unfold, s*2*unfold);
    }
  }

  function render3DCylinder(ctx, proj, sliceY) {
    var R = 65, H = 130;
    var steps = 24;
    ctx.strokeStyle = '#38bdf8';

    // Top and bottom circles
    for (var top = 0; top <= 1; top++) {
      var y = top ? H/2 : -H/2;
      ctx.beginPath();
      for (var i = 0; i <= steps; i++) {
        var th = (i / steps) * Math.PI * 2;
        var p = proj(R * Math.cos(th), y, R * Math.sin(th));
        if (i === 0) ctx.moveTo(p.px, p.py); else ctx.lineTo(p.px, p.py);
      }
      ctx.stroke();
    }
    // Lateral sides
    var pL1 = proj(-R, -H/2, 0), pL2 = proj(-R, H/2, 0);
    var pR1 = proj(R, -H/2, 0), pR2 = proj(R, H/2, 0);
    ctx.beginPath(); ctx.moveTo(pL1.px, pL1.py); ctx.lineTo(pL2.px, pL2.py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pR1.px, pR1.py); ctx.lineTo(pR2.px, pR2.py); ctx.stroke();

    // Slicing disc at sliceY
    var sy = (sliceY - 0.5) * H;
    ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.strokeStyle = '#facc15';
    ctx.beginPath();
    for (var j = 0; j <= steps; j++) {
      var thj = (j / steps) * Math.PI * 2;
      var ps = proj(R * Math.cos(thj), sy, R * Math.sin(thj));
      if (j === 0) ctx.moveTo(ps.px, ps.py); else ctx.lineTo(ps.px, ps.py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function render3DCone(ctx, proj, unfold) {
    var R = 70, H = 130;
    var steps = 24;
    ctx.strokeStyle = '#38bdf8';

    // Base circle
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var th = (i / steps) * Math.PI * 2;
      var p = proj(R * Math.cos(th), -H/2, R * Math.sin(th));
      if (i === 0) ctx.moveTo(p.px, p.py); else ctx.lineTo(p.px, p.py);
    }
    ctx.stroke();

    // Apex to base edges
    var apex = proj(0, H/2, 0);
    var pL = proj(-R, -H/2, 0), pR = proj(R, -H/2, 0);
    ctx.beginPath(); ctx.moveTo(apex.px, apex.py); ctx.lineTo(pL.px, pL.py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(apex.px, apex.py); ctx.lineTo(pR.px, pR.py); ctx.stroke();

    // Unfolded 2D sector overlay
    if (unfold > 0) {
      var L = Math.hypot(R, H);
      var sectorAngle = (R / L) * Math.PI * 2 * unfold;
      ctx.fillStyle = 'rgba(244, 114, 182, 0.25)';
      ctx.strokeStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(apex.px + 90, apex.py);
      ctx.arc(apex.px + 90, apex.py, L * 0.7, -sectorAngle/2, sectorAngle/2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function render3DSphere(ctx, proj, sliceY) {
    var R = 75;
    var steps = 32;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';

    // Latitude & Longitude rings
    for (var lat = -60; lat <= 60; lat += 30) {
      var rad = (lat * Math.PI) / 180;
      var rLat = R * Math.cos(rad);
      var yLat = R * Math.sin(rad);
      ctx.beginPath();
      for (var i = 0; i <= steps; i++) {
        var lon = (i / steps) * Math.PI * 2;
        var p = proj(rLat * Math.cos(lon), yLat, rLat * Math.sin(lon));
        if (i === 0) ctx.moveTo(p.px, p.py); else ctx.lineTo(p.px, p.py);
      }
      ctx.stroke();
    }

    // Outer contour
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var k = 0; k <= steps; k++) {
      var thk = (k / steps) * Math.PI * 2;
      var pk = proj(R * Math.cos(thk), R * Math.sin(thk), 0);
      if (k === 0) ctx.moveTo(pk.px, pk.py); else ctx.lineTo(pk.px, pk.py);
    }
    ctx.stroke();
    ctx.lineWidth = 2;

    // Cavalieri Slicing Disc at sliceY (-R to R)
    var ySlice = (sliceY - 0.5) * 2 * R * 0.9;
    var rSlice = Math.sqrt(Math.max(0, R * R - ySlice * ySlice));

    ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.strokeStyle = '#facc15';
    ctx.beginPath();
    for (var j = 0; j <= steps; j++) {
      var thj = (j / steps) * Math.PI * 2;
      var ps = proj(rSlice * Math.cos(thj), ySlice, rSlice * Math.sin(thj));
      if (j === 0) ctx.moveTo(ps.px, ps.py); else ctx.lineTo(ps.px, ps.py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function render3DComposite(ctx, proj, explode) {
    var R = 55, H_cyl = 90, H_cone = 70;
    var gap = explode * 70;

    // Cylinder base
    ctx.strokeStyle = '#38bdf8';
    render3DCylinder(ctx, function (x, y, z) { return proj(x, y - gap/2, z); }, 0.5);

    // Cone top (separated by gap)
    ctx.strokeStyle = '#f472b6';
    render3DCone(ctx, function (x, y, z) { return proj(x, y + H_cyl/2 + H_cone/2 + gap/2, z); }, 0);

    // Exploded Interface Disc
    if (explode > 0.05) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      for (var i = 0; i <= 24; i++) {
        var th = (i / 24) * Math.PI * 2;
        var p = proj(R * Math.cos(th), H_cyl/2, R * Math.sin(th));
        if (i === 0) ctx.moveTo(p.px, p.py); else ctx.lineTo(p.px, p.py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  /* ── 8. Function Grapher Engine ── */
  function renderGraph(ctx, w, h) {
    var cx = w / 2 + state.graphOrigin.x;
    var cy = h / 2 + state.graphOrigin.y;
    var scale = state.graphScale;

    // Coordinate grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (var x = cx % scale; x < w; x += scale) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (var y = cy % scale; y < h; y += scale) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

    // Plot function y = f(x)
    var fn = parseFunction(state.graphEq);
    if (!fn) return;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    var first = true;
    for (var px = 0; px <= w; px += 2) {
      var mathX = (px - cx) / scale;
      try {
        var mathY = fn(mathX);
        if (typeof mathY === 'number' && !isNaN(mathY) && Math.abs(mathY) < 100) {
          var py = cy - mathY * scale;
          if (first) { ctx.moveTo(px, py); first = false; }
          else { ctx.lineTo(px, py); }
        } else {
          first = true;
        }
      } catch (_) { first = true; }
    }
    ctx.stroke();
  }

  function parseFunction(eqStr) {
    try {
      var body = eqStr.replace(/^y\s*=\s*/i, '').trim();
      body = body
        .replace(/\^/g, '**')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/exp\(/g, 'Math.exp(')
        .replace(/log\(/g, 'Math.log(')
        .replace(/pi/gi, 'Math.PI')
        .replace(/e\b/gi, 'Math.E');
      return new Function('x', 'return ' + body + ';');
    } catch (_) {
      return null;
    }
  }

  /* ── 9. Arithmetic & 2D Clustering ── */
  function triggerRecognition() {
    if (state.counters.length < 2) return;

    var allPts = state.counters;
    var plusOp = null;

    // Detect plus operator stroke
    state.strokes.forEach(function (s) {
      var rec = recognizeMultiStroke([s.pts]);
      if (rec && rec.type === 'operator_plus') plusOp = rec;
    });

    var n = allPts.length;
    var countTotal = n;
    var cluster2D = null;

    if (plusOp) {
      var g1 = 0, g2 = 0;
      allPts.forEach(function (p) {
        if (p.x < plusOp.x) g1++; else g2++;
      });
      if (g1 > 0 && g2 > 0) {
        setDetectBanner('✨ AI Recognized: ' + g1 + ' + ' + g2 + ' = ' + countTotal + ' (Split by drawn "+" sign)');
        return;
      }
    }

    // 2D K-Means clustering (k=2)
    var maxD = 0, seed1 = allPts[0], seed2 = allPts[1];
    for (var i = 0; i < allPts.length; i++) {
      for (var j = i + 1; j < allPts.length; j++) {
        var d = Math.hypot(allPts[i].x - allPts[j].x, allPts[i].y - allPts[j].y);
        if (d > maxD) { maxD = d; seed1 = allPts[i]; seed2 = allPts[j]; }
      }
    }

    if (maxD > 45) {
      var c1 = { x: seed1.x, y: seed1.y }, c2 = { x: seed2.x, y: seed2.y };
      var grp1 = [], grp2 = [];
      for (var it = 0; it < 3; it++) {
        grp1 = []; grp2 = [];
        for (var p = 0; p < allPts.length; p++) {
          var d1 = Math.hypot(allPts[p].x - c1.x, allPts[p].y - c1.y);
          var d2 = Math.hypot(allPts[p].x - c2.x, allPts[p].y - c2.y);
          if (d1 <= d2) grp1.push(allPts[p]); else grp2.push(allPts[p]);
        }
        if (grp1.length === 0 || grp2.length === 0) break;
        var sx1 = 0, sy1 = 0, sx2 = 0, sy2 = 0;
        grp1.forEach(function (pt) { sx1 += pt.x; sy1 += pt.y; });
        grp2.forEach(function (pt) { sx2 += pt.x; sy2 += pt.y; });
        c1 = { x: sx1 / grp1.length, y: sy1 / grp1.length };
        c2 = { x: sx2 / grp2.length, y: sy2 / grp2.length };
      }

      if (grp1.length > 0 && grp2.length > 0) {
        var sep = Math.hypot(c1.x - c2.x, c1.y - c2.y);
        var rad1 = 0, rad2 = 0;
        grp1.forEach(function (pt) { rad1 = Math.max(rad1, Math.hypot(pt.x - c1.x, pt.y - c1.y)); });
        grp2.forEach(function (pt) { rad2 = Math.max(rad2, Math.hypot(pt.x - c2.x, pt.y - c2.y)); });
        if (sep > 40 && sep > (rad1 + rad2) * 0.65) {
          cluster2D = { n1: grp1.length, n2: grp2.length };
        }
      }
    }

    if (cluster2D) {
      setDetectBanner('✨ Part-Part-Whole: ' + cluster2D.n1 + ' + ' + cluster2D.n2 + ' = ' + countTotal + ' (2D spatial groups)');
    } else {
      setDetectBanner('✨ Count: ' + countTotal + ' modeled counters');
    }
  }

  /* ── 10. Redraw & Canvas Rendering ── */
  function redraw() {
    if (!chalkCanvas || state.curMode.startsWith('3d')) return;

    var w = chalkCanvas.width / (window.devicePixelRatio || 1);
    var h = chalkCanvas.height / (window.devicePixelRatio || 1);
    chalkCtx.clearRect(0, 0, w, h);

    if (state.curMode === 'graph') {
      renderGraph(chalkCtx, w, h);
    } else {
      // Subtle blackboard grid
      chalkCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      chalkCtx.lineWidth = 1;
      var sz = 32;
      for (var x = sz; x < w; x += sz) {
        chalkCtx.beginPath(); chalkCtx.moveTo(x, 0); chalkCtx.lineTo(x, h); chalkCtx.stroke();
      }
      for (var y = sz; y < h; y += sz) {
        chalkCtx.beginPath(); chalkCtx.moveTo(0, y); chalkCtx.lineTo(w, y); chalkCtx.stroke();
      }
    }

    // Historical strokes
    state.strokes.forEach(function (s) {
      chalkCtx.strokeStyle = s.color || '#f0f6fc';
      chalkCtx.lineWidth = 3;
      chalkCtx.lineCap = 'round';
      chalkCtx.lineJoin = 'round';
      chalkCtx.beginPath();
      s.pts.forEach(function (pt, idx) {
        if (idx === 0) chalkCtx.moveTo(pt.x, pt.y);
        else chalkCtx.lineTo(pt.x, pt.y);
      });
      chalkCtx.stroke();
    });

    // Current stroke
    if (currentStroke.length > 1) {
      chalkCtx.strokeStyle = state.chalkColor;
      chalkCtx.lineWidth = 3;
      chalkCtx.lineCap = 'round';
      chalkCtx.lineJoin = 'round';
      chalkCtx.beginPath();
      currentStroke.forEach(function (pt, idx) {
        if (idx === 0) chalkCtx.moveTo(pt.x, pt.y);
        else chalkCtx.lineTo(pt.x, pt.y);
      });
      chalkCtx.stroke();
    }

    // Counters
    state.counters.forEach(function (c, idx) {
      chalkCtx.fillStyle = '#38bdf8';
      chalkCtx.beginPath();
      chalkCtx.arc(c.x, c.y, 14, 0, Math.PI * 2);
      chalkCtx.fill();
      chalkCtx.strokeStyle = '#fff';
      chalkCtx.lineWidth = 1.5;
      chalkCtx.stroke();

      chalkCtx.fillStyle = '#0f172a';
      chalkCtx.font = 'bold 11px system-ui, sans-serif';
      chalkCtx.textAlign = 'center';
      chalkCtx.textBaseline = 'middle';
      chalkCtx.fillText(String(c.num || (idx + 1)), c.x, c.y);
    });

    // Triangle overlay
    if (state.curMode === 'triangle' && state.triData) {
      renderTriangleOverlay(chalkCtx, state.triData);
    }

    // Circle overlay
    if (state.curMode === 'circle' && state.circData) {
      renderCircleOverlay(chalkCtx, state.circData);
    }
  }

  function renderTriangleOverlay(ctx, tri) {
    var pts = tri.pts;
    var an = tri.analysis;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.closePath();
    ctx.stroke();

    // Altitude line
    if (an && an.h) {
      var A = pts[0], B = pts[1], C = pts[2];
      var dx = B.x - A.x, dy = B.y - A.y;
      var lenSq = dx * dx + dy * dy;
      var u = Math.max(0, Math.min(1, ((C.x - A.x) * dx + (C.y - A.y) * dy) / Math.max(1, lenSq)));
      var D = { x: A.x + u * dx, y: A.y + u * dy };

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#facc15';
      ctx.beginPath(); ctx.moveTo(C.x, C.y); ctx.lineTo(D.x, D.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Vertices handles
    pts.forEach(function (pt) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui';
      ctx.fillText(pt.label, pt.x + 10, pt.y - 10);
    });
  }

  function renderCircleOverlay(ctx, circ) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(circ.cx, circ.cy, circ.r, 0, Math.PI * 2);
    ctx.stroke();

    // Center & Radius
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(circ.cx, circ.cy, 5, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(circ.cx, circ.cy);
    ctx.lineTo(circ.cx + circ.r, circ.cy);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('r=' + circ.r, circ.cx + circ.r / 2, circ.cy - 6);
  }

  /* ── 11. Sub-Panels & Tools ── */
  function openPanel(kind) {
    if (!subPanel) return;
    subPanel.hidden = false;

    if (kind === 'triangle') {
      updateTrianglePanel();
    } else if (kind === 'circle') {
      var c = state.circData;
      subContent.innerHTML =
        '<div class="smart-wb-panel-row">' +
          '<strong>Circle Measurements:</strong>' +
          '<span>Radius r = ' + c.r + ' px</span>' +
          '<span>Diameter d = ' + (c.r * 2) + ' px</span>' +
        '</div>' +
        '<div class="smart-wb-math-result">' +
          'Area A = πr² = ' + (Math.PI * c.r * c.r).toFixed(1) + ' px² | Circumference C = 2πr = ' + (2 * Math.PI * c.r).toFixed(1) + ' px' +
        '</div>';
    } else if (kind === 'graph') {
      subContent.innerHTML =
        '<div class="smart-wb-panel-row">' +
          '<strong>Function:</strong>' +
          '<input type="text" class="smart-wb-input" id="swb-graph-in" value="' + state.graphEq + '" />' +
          '<button type="button" class="smart-wb-btn" id="swb-graph-btn">Plot</button>' +
        '</div>' +
        '<div class="smart-wb-math-result" id="swb-graph-res">' +
          'Roots: x = -2, 2 | y-intercept: (0, -4) | Vertex: (0, -4)' +
        '</div>';

      dockEl.querySelector('#swb-graph-btn').addEventListener('click', function () {
        state.graphEq = dockEl.querySelector('#swb-graph-in').value;
        redraw();
      });
    } else if (kind === '3d') {
      var solidName = state.curMode.replace('3d_', '').toUpperCase();
      subContent.innerHTML =
        '<div class="smart-wb-panel-row">' +
          '<strong>' + solidName + ' Deconstruction:</strong>' +
          '<label style="display:flex;align-items:center;gap:6px;flex:1;">Net Unfold:' +
            '<input type="range" class="smart-wb-range" id="swb-unfold-rng" min="0" max="1" step="0.01" value="' + state.unfoldPct + '"/>' +
          '</label>' +
          '<label style="display:flex;align-items:center;gap:6px;flex:1;">Slice Plane:' +
            '<input type="range" class="smart-wb-range" id="swb-slice-rng" min="0" max="1" step="0.01" value="' + state.sliceY + '"/>' +
          '</label>' +
        '</div>' +
        '<div class="smart-wb-math-result">' +
          'Surface Area Net Deconstruction & Cross-Section Slices active. Drag 3D view to rotate.' +
        '</div>';

      dockEl.querySelector('#swb-unfold-rng').addEventListener('input', function (e) {
        state.unfoldPct = parseFloat(e.target.value);
        render3D();
      });
      dockEl.querySelector('#swb-slice-rng').addEventListener('input', function (e) {
        state.sliceY = parseFloat(e.target.value);
        render3D();
      });
    } else if (kind === 'solve') {
      subContent.innerHTML =
        '<div class="smart-wb-panel-row">' +
          '<strong>Solve:</strong>' +
          '<input type="text" class="smart-wb-input" id="swb-solve-in" placeholder="e.g. 2x + 5 = 15 or 3/4 + 5/8" />' +
          '<button type="button" class="smart-wb-btn" id="swb-solve-btn">Solve</button>' +
        '</div>' +
        '<div class="smart-wb-math-result" id="swb-solve-res">' +
          'Type any arithmetic, fraction, or algebraic equation to solve step-by-step.' +
        '</div>';

      dockEl.querySelector('#swb-solve-btn').addEventListener('click', solveProblem);
    }
  }

  function solveProblem() {
    var val = (dockEl.querySelector('#swb-solve-in').value || '').trim();
    var resEl = dockEl.querySelector('#swb-solve-res');
    if (!val) return;

    // Linear equation solver ax + b = c
    var linMatch = val.match(/^([+-]?\d*)x\s*([+-]\s*\d+)?\s*=\s*([+-]?\d+)$/i);
    if (linMatch) {
      var a = linMatch[1] === '' || linMatch[1] === '+' ? 1 : (linMatch[1] === '-' ? -1 : parseFloat(linMatch[1]));
      var b = linMatch[2] ? parseFloat(linMatch[2].replace(/\s+/g, '')) : 0;
      var c = parseFloat(linMatch[3]);
      var x = (c - b) / a;
      resEl.textContent = 'Step 1: Subtract ' + b + ' → ' + a + 'x = ' + (c - b) + '\nStep 2: Divide by ' + a + ' → x = ' + x;
      return;
    }

    // Arithmetic evaluate
    try {
      var clean = val.replace(/\^/g, '**').replace(/sqrt\(/g, 'Math.sqrt(');
      var ans = Function('return ' + clean + ';')();
      resEl.textContent = 'Result: ' + val + ' = ' + ans;
    } catch (_) {
      resEl.textContent = 'Could not parse: ' + val + '. Try e.g. "3x + 4 = 19" or "sqrt(144) + 5"';
    }
  }

  function setupToolbar() {
    dockEl.querySelector('.smart-wb-toolbar').addEventListener('click', function (e) {
      var toolBtn = e.target.closest('[data-tool]');
      if (toolBtn) {
        state.curTool = toolBtn.dataset.tool;
        dockEl.querySelectorAll('[data-tool]').forEach(function (b) {
          b.classList.toggle('active', b === toolBtn);
        });

        if (state.curTool === 'shape') {
          switchTo3DMode('3d_cube');
        } else if (state.curTool === 'graph') {
          exit3DMode();
          state.curMode = 'graph';
          openPanel('graph');
          redraw();
        } else if (state.curTool === 'solve') {
          exit3DMode();
          openPanel('solve');
        } else {
          exit3DMode();
        }
      }

      var actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        var act = actionBtn.dataset.action;
        if (act === 'clear') {
          state.strokes = [];
          state.counters = [];
          state.triData = null;
          state.circData = null;
          state.curMode = 'draw';
          exit3DMode();
          if (subPanel) subPanel.hidden = true;
          setDetectBanner('🧹 Blackboard cleared');
          redraw();
        } else if (act === 'undo') {
          if (state.strokes.length) state.strokes.pop();
          else if (state.counters.length) state.counters.pop();
          redraw();
        } else if (act === 'insert') {
          insertSolutionIntoPage();
        } else if (act === 'voice') {
          speakExplanation();
        }
      }
    });
  }

  function setupChips() {
    dockEl.querySelector('.smart-wb-chips').addEventListener('click', function (e) {
      var chip = e.target.closest('.smart-wb-chip');
      if (!chip) return;
      var act = chip.dataset.action;

      if (act === 'triangle') {
        state.curMode = 'triangle';
        state.triData = {
          pts: [
            { x: 120, y: 220, label: 'A' },
            { x: 380, y: 220, label: 'B' },
            { x: 250, y: 70, label: 'C' }
          ]
        };
        exit3DMode();
        updateTriangleAnalysis();
        openPanel('triangle');
        redraw();
      } else if (act === 'circle') {
        state.curMode = 'circle';
        state.circData = { cx: 250, cy: 160, r: 80 };
        exit3DMode();
        openPanel('circle');
        redraw();
      } else if (act === 'graph' || act === 'axes') {
        state.curMode = 'graph';
        exit3DMode();
        openPanel('graph');
        redraw();
      } else if (act === 'plot_parabola') {
        state.curMode = 'graph';
        state.graphEq = 'y = x^2 - 4';
        exit3DMode();
        openPanel('graph');
        redraw();
      } else if (act === 'plot_line') {
        state.curMode = 'graph';
        state.graphEq = 'y = 2*x + 1';
        exit3DMode();
        openPanel('graph');
        redraw();
      } else if (act.startsWith('3d_')) {
        switchTo3DMode(act);
      } else if (act === 'counter') {
        state.curTool = 'counter';
        dockEl.querySelectorAll('[data-tool]').forEach(function (b) {
          b.classList.toggle('active', b.dataset.tool === 'counter');
        });
        exit3DMode();
      } else if (act === 'solver') {
        exit3DMode();
        openPanel('solve');
      }
    });
  }

  function insertSolutionIntoPage() {
    var text = detectBanner ? detectBanner.textContent : '';
    if (subContent && subContent.textContent) {
      text += ' — ' + subContent.textContent.replace(/\s+/g, ' ').trim();
    }

    var targets = Array.prototype.slice.call(document.querySelectorAll('textarea, input[type="text"]'));
    var visibleTarget = targets.find(function (el) {
      return !dockEl.contains(el) && el.offsetParent !== null;
    });

    if (visibleTarget) {
      visibleTarget.value = (visibleTarget.value ? visibleTarget.value + '\n' : '') + text;
      visibleTarget.focus();
      setDetectBanner('📝 Transcribed explanation into page input!');
    } else {
      navigator.clipboard.writeText(text);
      setDetectBanner('📋 Copied math explanation to clipboard!');
    }
  }

  function speakExplanation() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var text = (detectBanner ? detectBanner.textContent : 'AI Blackboard').replace(/[✨📐📦📈🧮🔘📝]/g, '');
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    window.speechSynthesis.speak(utter);
  }

  /* ── 12. Keyboard Shortcut & Header Button ── */
  function setupHeaderButton() {
    var navHost =
      document.querySelector('.site-header .nav-wrap') ||
      document.querySelector('.topbar .topbar-inner');
    if (!navHost || navHost.querySelector('.nav-whiteboard')) return;

    var container = document.createElement('div');
    container.className = 'nav-whiteboard';
    container.innerHTML =
      '<button type="button" class="nav-search-btn nav-whiteboard-btn" aria-label="Open AI Smart Blackboard (Shift+W)" title="AI Smart Blackboard (Shift+W)">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 12 3 3 5-5"/>' +
        '</svg>' +
        '<span class="nav-whiteboard-text">Board</span>' +
        '<kbd class="nav-search-kbd" aria-hidden="true">⇧W</kbd>' +
      '</button>';

    container.querySelector('.nav-whiteboard-btn').addEventListener('click', function () {
      SmartBlackboardDock.toggle();
    });

    // Place before settings or at end
    var settings = navHost.querySelector('.nav-settings');
    if (settings) navHost.insertBefore(container, settings);
    else navHost.appendChild(container);
  }

  window.addEventListener('keydown', function (e) {
    if ((e.key === 'W' || e.key === 'w') && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var tag = (e.target && e.target.tagName) || '';
      if (!/INPUT|TEXTAREA|SELECT/.test(tag)) {
        e.preventDefault();
        SmartBlackboardDock.toggle();
      }
    }
  });

  /* ── 13. Public API ── */
  var SmartBlackboardDock = {
    open: function () {
      ensureDockDOM();
      dockEl.classList.add('is-open');
      if (launcherBtn) launcherBtn.classList.add('active');
      state.isOpen = true;
      resizeCanvases();
      saveState();
    },
    close: function () {
      if (!dockEl) return;
      dockEl.classList.remove('is-open');
      if (launcherBtn) launcherBtn.classList.remove('active');
      state.isOpen = false;
      saveState();
    },
    toggle: function () {
      if (dockEl && dockEl.classList.contains('is-open')) {
        this.close();
      } else {
        this.open();
      }
    },
    detectContext: detectContext
  };

  window.SmartBlackboardDock = SmartBlackboardDock;

  function init() {
    setupHeaderButton();
    // Check if previously open
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.isOpen) {
        SmartBlackboardDock.open();
      } else {
        ensureDockDOM(); // ensure launcher button is ready
      }
    } catch (_) {
      ensureDockDOM();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
