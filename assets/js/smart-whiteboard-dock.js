/**
 * smart-whiteboard-dock.js — Universal Floating & Dockable AI Smart Blackboard
 *
 * Provides real-time hand-drawn geometry recognition, rotatable 3D solids with
 * net deconstruction and cross-section slicing, Cartesian coordinate graphing,
 * symbolic algebra solving, counter clustering, and automated Common Core explanations.
 *
 * It also reads handwriting (the ✍️ Write tool), takes typed or spoken commands (the Ask box),
 * balances chemical equations, cuts solids at any angle, looks up lessons / glossary terms /
 * quiz questions, and records the lesson with class notes. That thinking lives in three
 * DOM-free files under smart-board/ (tests: tests/smart-board.test.mjs); see section 11b.
 *
 * Automatically detects the active lesson's mathematical context to bias recognition.
 */
(function () {
  'use strict';

  // Captured now: document.currentScript is only set while this file first runs.
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  var SITE_ROOT = SCRIPT_SRC ? new URL('../../', SCRIPT_SRC).href : '';

  function isMathOrPhysicsLesson() {
    var p = (location.pathname || '').toLowerCase();
    if (/(^|\/)lessons\/(mathematics|physics|applied-physics-materials|chemistry)\//.test(p)) {
      return true;
    }
    var mod = (document.body && document.body.dataset && document.body.dataset.module) || '';
    return /math|physic|chem/i.test(mod);
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

    if (/(^|\/)lessons\/chemistry\//.test(path)) {
      return {
        domain: 'chemistry',
        label: 'Chemistry Board',
        badge: '⚗️ Chemistry',
        chips: [
          { label: '⚗️ Balance H₂ + O₂', action: 'ask:H2 + O2 = H2O' },
          { label: '🔥 Burn propane', action: 'ask:C3H8 + O2 = CO2 + H2O' },
          { label: '✍️ Watch it write', action: 'write:2H2+O2=2H2O' },
          { label: '❓ Quiz me', action: 'ask:quiz me' }
        ]
      };
    }

    if (/area-perimeter|polyomino|isoperimetric|boundary-highlighter/.test(combined) || (/area/.test(combined) && /perimeter/.test(combined))) {
      return {
        domain: 'area_perimeter',
        label: 'Area & Perimeter Studio',
        badge: '📏 Area & Perimeter',
        chips: [
          { label: '🔲 Rectangle (A=ℓ·w, P=2(ℓ+w))', action: 'area_rect' },
          { label: '▱ Parallelogram (A=b·h, Slant c)', action: 'area_para' },
          { label: '🔺 Triangle (A=½b·h)', action: 'triangle' },
          { label: '🎯 Same Perimeter P=16 Proof', action: 'same_p16' },
          { label: '▦ Polyomino Grid', action: 'area_poly' },
          { label: '🔘 Counters', action: 'counter' }
        ]
      };
    }
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
    rectData: null,
    paraData: null,
    polyData: null,
    graphEq: 'y = x^2 - 4',
    graphScale: 30,
    graphOrigin: { x: 0, y: 0 },
    threeRotation: { rx: 0.5, ry: 0.7 },
    unfoldPct: 0,
    sliceY: 0,
    explodeJoint: 0,
    slice: { tilt: 0, spin: 0, offset: 0 }, // the cutting plane (see BoardMath.sliceSolid)
    surface: null,                          // { fn, text } for z = f(x, y)
    inkAnswer: null                         // { x, y, text } chalked under a handwritten line
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
        '<button type="button" class="smart-wb-chip" data-action="ask:help">💡 What can it do?</button>' +
      '</div>' +
      '<div class="smart-wb-body">' +
        '<div class="smart-wb-toolbar" role="toolbar" aria-label="Blackboard Tools">' +
          '<div class="smart-wb-tool-group">' +
            '<button type="button" class="smart-wb-tool active" data-tool="pen" title="Draw chalk lines with auto-recognition">🖊️ Pen</button>' +
            '<button type="button" class="smart-wb-tool" data-tool="write" title="Write an equation by hand, then pause: the board reads it, graphs it, solves it or balances it">✍️ Write</button>' +
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
            '<button type="button" class="smart-wb-tool" data-action="record" title="Record the board (and your voice) to a video file on this computer">⏺ Rec</button>' +
            '<button type="button" class="smart-wb-tool" data-action="summary" title="Class notes: everything put on the board this session">📋 Notes</button>' +
          '</div>' +
        '</div>' +
        '<form class="smart-wb-ask" autocomplete="off">' +
          '<button type="button" class="smart-wb-tutor" title="Board helper: press to hear the explanation read aloud" aria-label="Read the explanation aloud">' +
            '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">' +
              '<rect x="5" y="8" width="22" height="18" rx="6" fill="currentColor" opacity="0.18"/>' +
              '<rect x="5" y="8" width="22" height="18" rx="6" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
              '<path d="M16 8V4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="3.4" r="1.6" fill="currentColor"/>' +
              '<circle cx="11.5" cy="15" r="1.9" fill="currentColor"/><circle cx="20.5" cy="15" r="1.9" fill="currentColor"/>' +
              '<rect class="smart-wb-tutor-mouth" x="12" y="20" width="8" height="2" rx="1" fill="currentColor"/>' +
            '</svg>' +
          '</button>' +
          '<input type="text" class="smart-wb-input smart-wb-ask-in" aria-label="Ask the board" placeholder="Ask the board: graph y = x^2 - 4 · slice the cube into a hexagon · quiz me on gravity" />' +
          '<button type="submit" class="smart-wb-btn">Go</button>' +
          '<button type="button" class="smart-wb-btn smart-wb-mic" aria-pressed="false" aria-label="Voice command" title="Say a command">🎤</button>' +
        '</form>' +
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
    setupAsk();
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

      if (state.curMode === 'area_rect' && state.rectData) {
        var rd = state.rectData;
        if (Math.hypot(rd.x + rd.w - p.x, rd.y + rd.h - p.y) < 26) {
          draggingPoint = { target: 'rect_br', startW: rd.w, startH: rd.h, startX: p.x, startY: p.y };
          try { chalkCanvas.setPointerCapture(e.pointerId); } catch (_) {}
          return;
        }
      }

      if (state.curMode === 'area_para' && state.paraData) {
        var pd = state.paraData;
        if (Math.hypot(pd.x + pd.s + pd.b - p.x, pd.y - pd.h - p.y) < 26) {
          draggingPoint = { target: 'para_tr', startB: pd.b, startH: pd.h, startS: pd.s, startX: p.x, startY: p.y };
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
        if (draggingPoint.target === 'rect_br') {
          state.rectData.w = Math.max(60, Math.min(500, draggingPoint.startW + (p.x - draggingPoint.startX)));
          state.rectData.h = Math.max(40, Math.min(350, draggingPoint.startH + (p.y - draggingPoint.startY)));
          updateAreaRectAnalysis();
          redraw();
          return;
        }
        if (draggingPoint.target === 'para_tr') {
          state.paraData.s = Math.max(-120, Math.min(160, draggingPoint.startS + (p.x - draggingPoint.startX)));
          state.paraData.h = Math.max(40, Math.min(240, draggingPoint.startH - (p.y - draggingPoint.startY)));
          updateAreaParaAnalysis();
          redraw();
          return;
        }
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

      if (state.curTool === 'write') {
        // Handwriting: keep every stroke (a decimal point is one dot) and read the line after a pause.
        addInkStroke(currentStroke);
        currentStroke = [];
        redraw();
        return;
      }

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
      if (corners.length === 4) {
        return {
          type: 'area_rect',
          x: minX,
          y: minY,
          w: Math.max(50, w),
          h: Math.max(40, h)
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
    } else if (rec.type === 'area_rect') {
      state.curMode = 'area_rect';
      state.rectData = { x: rec.x, y: rec.y, w: rec.w, h: rec.h };
      updateAreaRectAnalysis();
      var scale = 30;
      var lU = Math.round((rec.w / scale) * 10) / 10;
      var wU = Math.round((rec.h / scale) * 10) / 10;
      setDetectBanner('✨ AI Recognized: Rectangle (' + lU + ' × ' + wU + ') → Area: ' + (lU * wU).toFixed(1) + ' sq units | Perimeter: ' + (2 * (lU + wU)).toFixed(1) + ' units');
      openPanel('area_rect');
    } else if (rec.type === 'operator_plus') {
      setDetectBanner('✨ AI Recognized: Plus Operator (+) for Counter Addition');
      triggerRecognition();
    }
    if (rec.type !== 'operator_plus' && rec.type !== 'graph' && detectBanner) {
      logEvent('shape', detectBanner.textContent.replace(/^✨ AI Recognized: /, ''));
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

  function updateAreaRectAnalysis() {
    if (!state.rectData) return;
    if (subPanel && !subPanel.hidden && state.curMode === 'area_rect') {
      updateAreaRectPanel();
    }
  }

  function updateAreaRectPanel() {
    if (!state.rectData) return;
    var r = state.rectData;
    var scale = 30;
    var lU = Math.max(1, Math.round((r.w / scale) * 10) / 10);
    var wU = Math.max(1, Math.round((r.h / scale) * 10) / 10);
    var area = (lU * wU).toFixed(1);
    var perim = (2 * (lU + wU)).toFixed(1);
    var diag = Math.hypot(lU, wU).toFixed(2);
    subContent.innerHTML =
      '<div class="smart-wb-panel-row">' +
        '<strong>Rectangle Dimensions:</strong>' +
        '<span>Length ℓ = ' + lU + ' u | Width w = ' + wU + ' u | Diagonal d = ' + diag + ' u</span>' +
      '</div>' +
      '<div class="smart-wb-math-result">' +
        'Area A = ℓ × w = ' + lU + ' × ' + wU + ' = ' + area + ' sq units | ' +
        'Perimeter P = 2(ℓ + w) = 2(' + lU + ' + ' + wU + ') = ' + perim + ' units ' +
        '<span style="opacity:0.85;font-size:0.82rem;">(Drag bottom-right handle on board to resize)</span>' +
      '</div>';
  }

  function updateAreaParaAnalysis() {
    if (!state.paraData) return;
    if (subPanel && !subPanel.hidden && state.curMode === 'area_para') {
      updateAreaParaPanel();
    }
  }

  function updateAreaParaPanel() {
    if (!state.paraData) return;
    var p = state.paraData;
    var scale = 28;
    var bU = Math.max(1, Math.round((p.b / scale) * 10) / 10);
    var hU = Math.max(1, Math.round((p.h / scale) * 10) / 10);
    var sU = Math.round((p.s / scale) * 10) / 10;
    var slantC = Math.sqrt(hU * hU + sU * sU).toFixed(2);
    var area = (bU * hU).toFixed(1);
    var perim = (2 * (bU + Number(slantC))).toFixed(1);
    subContent.innerHTML =
      '<div class="smart-wb-panel-row">' +
        '<strong>Parallelogram &amp; Shear Analysis:</strong>' +
        '<span>Base b = ' + bU + ' u | Height h = ' + hU + ' u | Slanted side c = ' + slantC + ' u</span>' +
      '</div>' +
      '<div class="smart-wb-math-result">' +
        'Area A = b × h = ' + bU + ' × ' + hU + ' = ' + area + ' sq units | ' +
        'Perimeter P = 2(b + c) = ' + perim + ' units ' +
        '<span style="color:#facc15;">⭐ Accuracy Alert: Only perpendicular altitude h measures area; slanted side c is for perimeter!</span>' +
      '</div>';
  }

  function updateAreaPolyPanel() {
    if (!state.polyData || !state.polyData.cells) return;
    var cells = state.polyData.cells;
    var count = cells.length;
    var cellSet = {};
    cells.forEach(function (c) { cellSet[c[0] + ',' + c[1]] = true; });
    var perimeter = 0;
    var sharedHalf = 0;
    cells.forEach(function (c) {
      var r = c[0], col = c[1];
      var open = 0;
      if (!cellSet[(r - 1) + ',' + col]) open++; else sharedHalf++;
      if (!cellSet[(r + 1) + ',' + col]) open++; else sharedHalf++;
      if (!cellSet[r + ',' + (col - 1)]) open++; else sharedHalf++;
      if (!cellSet[r + ',' + (col + 1)]) open++; else sharedHalf++;
      perimeter += open;
    });
    var sharedPairs = sharedHalf / 2;
    var compactness = perimeter > 0 ? (16 * count / (perimeter * perimeter)).toFixed(2) : 0;
    subContent.innerHTML =
      '<div class="smart-wb-panel-row">' +
        '<strong>Polyomino Boundary Breakdown:</strong>' +
        '<span>Cells = ' + count + ' sq units | Outer Perimeter = ' + perimeter + ' units</span>' +
        '<span>Shared Internal Edges = ' + sharedPairs + ' pairs | Compactness = ' + compactness + '</span>' +
      '</div>' +
      '<div class="smart-wb-math-result">' +
        'Area = ' + count + ' sq units · Perimeter = ' + perimeter + ' units. ' +
        'Internal seams (' + sharedPairs + ' pairs) do not count toward outer perimeter fence!' +
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
      render3DCylinder(threeCtx, project, null);
    } else if (state.curMode === '3d_cone') {
      render3DCone(threeCtx, project, state.unfoldPct);
    } else if (state.curMode === '3d_sphere') {
      render3DSphere(threeCtx, project, null);
    } else if (state.curMode === '3d_composite') {
      render3DComposite(threeCtx, project, state.explodeJoint);
    } else if (state.curMode === '3d_surface') {
      render3DSurface(threeCtx, project);
    }
    // The cutting plane's cross-section, at any angle (cube, cylinder, cone, sphere).
    renderSection(threeCtx, project);
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
    var R = 70, H = 140; // radius 2, height 4 board units (35 px each), as in BoardMath.SOLIDS
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

    if (sliceY == null) return; // the cross-section is drawn by renderSection()

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
    var R = 70, H = 140;
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
    var R = 70;
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
    if (sliceY == null) return; // the cross-section is drawn by renderSection()

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

    // Numbers along the axes
    if (scale >= 18) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      var every = scale >= 26 ? 1 : 2;
      for (var nx = Math.ceil(-cx / scale); nx * scale + cx < w; nx++) {
        if (nx !== 0 && nx % every === 0) ctx.fillText(String(nx), cx + nx * scale, cy + 4);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (var ny = Math.ceil((cy - h) / scale); cy - ny * scale > 0; ny++) {
        if (ny !== 0 && ny % every === 0) ctx.fillText(String(ny), cx - 5, cy - ny * scale);
      }
    }

    // Plot the curve: y = f(x), or every (x, y) that satisfies an equation in both
    var g = currentGraph();
    if (!g) return;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    if (g.kind === 'implicit') {
      renderImplicit(ctx, g.fn, w, h, cx, cy, scale);
      return;
    }
    ctx.beginPath();
    var first = true;
    var lastPy = 0;
    for (var px = 0; px <= w; px += 2) {
      var mathY = g.fn((px - cx) / scale, 0);
      if (typeof mathY === 'number' && isFinite(mathY) && Math.abs(mathY) < 1e4) {
        var py = cy - mathY * scale;
        // A jump taller than the board is an asymptote (tan x, 1/x), not a line to draw.
        if (first || Math.abs(py - lastPy) > h) { ctx.moveTo(px, py); first = false; }
        else { ctx.lineTo(px, py); }
        lastPy = py;
      } else {
        first = true;
      }
    }
    ctx.stroke();

    // Label what matters: where it crosses the axes and where it turns
    function mark(mx, my, label, colour) {
      var sx = cx + mx * scale, sy = cy - my * scale;
      if (sx < 4 || sx > w - 4 || sy < 30 || sy > h - 4) return;
      ctx.fillStyle = colour;
      ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, sx + 7, sy - 4);
    }
    var an = g.analysis;
    an.roots.slice(0, 12).forEach(function (r) { mark(r, 0, '(' + r + ', 0)', '#facc15'); });
    if (an.yIntercept != null && an.roots.indexOf(0) < 0) mark(0, an.yIntercept, '(0, ' + an.yIntercept + ')', '#4ade80');
    an.turning.forEach(function (t) {
      if (t.x === 0 && an.yIntercept === t.y) return;
      mark(t.x, t.y, '(' + t.x + ', ' + t.y + ')', '#f472b6');
    });
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

    // Rectangle overlay
    if (state.curMode === 'area_rect' && state.rectData) {
      renderAreaRectOverlay(chalkCtx, state.rectData);
    }

    // Parallelogram overlay
    if (state.curMode === 'area_para' && state.paraData) {
      renderAreaParaOverlay(chalkCtx, state.paraData);
    }

    // Same P=16 overlay
    if (state.curMode === 'same_p16') {
      renderSameP16Overlay(chalkCtx, w, h);
    }

    // Polyomino overlay
    if (state.curMode === 'area_poly' && state.polyData) {
      renderAreaPolyOverlay(chalkCtx, state.polyData);
    }

    // The answer to a handwritten line, chalked underneath it
    if (state.inkAnswer && state.curMode !== 'graph') {
      chalkCtx.fillStyle = '#facc15';
      chalkCtx.font = 'bold 20px system-ui, sans-serif';
      chalkCtx.textAlign = 'left';
      chalkCtx.textBaseline = 'top';
      chalkCtx.fillText(state.inkAnswer.text, Math.max(8, state.inkAnswer.x), Math.min(h - 28, state.inkAnswer.y));
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

  function renderAreaRectOverlay(ctx, r) {
    var scale = 30;
    var x = r.x, y = r.y, w = r.w, h = r.h;
    var lU = Math.max(1, Math.round((w / scale) * 10) / 10);
    var wU = Math.max(1, Math.round((h / scale) * 10) / 10);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    for (var gx = x + scale; gx < x + w - 2; gx += scale) {
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
    }
    for (var gy = y + scale; gy < y + h - 2; gy += scale) {
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('ℓ = ' + lU, x + w / 2, y - 6);
    ctx.textBaseline = 'top';
    ctx.fillText('ℓ = ' + lU, x + w / 2, y + h + 6);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('w = ' + wU, x - 8, y + h / 2);
    ctx.textAlign = 'left';
    ctx.fillText('w = ' + wU, x + w + 8, y + h / 2);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px system-ui';
    ctx.fillText('Area = ' + (lU * wU).toFixed(1) + ' sq units', x + w / 2, y + h / 2 - 8);
    ctx.font = '12px system-ui';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('P = 2(' + lU + ' + ' + wU + ') = ' + (2 * (lU + wU)).toFixed(1), x + w / 2, y + h / 2 + 12);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x + w, y + h, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function renderAreaParaOverlay(ctx, p) {
    var scale = 28;
    var x = p.x, y = p.y, b = p.b, h = p.h, s = p.s;
    var bU = Math.max(1, Math.round((b / scale) * 10) / 10);
    var hU = Math.max(1, Math.round((h / scale) * 10) / 10);
    var sU = Math.round((s / scale) * 10) / 10;
    var slantC = Math.sqrt(hU * hU + sU * sU).toFixed(2);

    var x0 = x, y0 = y;
    var x1 = x + b, y1 = y;
    var x2 = x + b + s, y2 = y - h;
    var x3 = x + s, y3 = y - h;

    ctx.fillStyle = 'rgba(13, 148, 136, 0.18)';
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x3, y0);
    ctx.lineTo(x3, y3);
    ctx.stroke();
    ctx.setLineDash([]);

    var sz = 8;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x3, y0 - sz, sz, sz);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(' h = ' + hU + ' (altitude)', x3 + 10, y0 - h / 2);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Base b = ' + bU, x0 + b / 2, y0 + 16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText('c = ' + slantC, (x1 + x2) / 2 + 14, (y1 + y2) / 2);

    ctx.strokeStyle = '#ea580c';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, y0);
    ctx.lineTo(x1, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x2, y2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function renderSameP16Overlay(ctx, w, h) {
    var u = 22;
    var topY = 60;
    var sqX = 40;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Compact: 4×4 Square', sqX, topY - 14);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('Perimeter = 16 units | Area = 16 sq units', sqX, topY + 4 * u + 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui';
    ctx.fillText('Shared inner seams: 24 pairs (fuses area inside)', sqX, topY + 4 * u + 38);

    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        var cx = sqX + c * u, cy = topY + r * u;
        ctx.fillStyle = 'rgba(234, 88, 12, 0.4)';
        ctx.fillRect(cx, cy, u, u);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, u, u);
      }
    }
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(sqX, topY, 4 * u, 4 * u);

    var stX = sqX + 4 * u + 50;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Stretched: 1×7 Strip', stX, topY - 14);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('Perimeter = 16 units | Area = 7 sq units', stX, topY + 4 * u + 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui';
    ctx.fillText('Shared inner seams: only 6 pairs (wastes fence outside)', stX, topY + 4 * u + 38);

    for (var sc = 0; sc < 7; sc++) {
      var scx = stX + sc * u, scy = topY + 1.5 * u;
      ctx.fillStyle = 'rgba(14, 165, 233, 0.4)';
      ctx.fillRect(scx, scy, u, u);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(scx, scy, u, u);
    }
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(stX, topY + 1.5 * u, 7 * u, u);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('⭐ Proof: Compact square holds 2.3× area of strip with the same 16-unit fence!', sqX, topY + 4 * u + 65);
  }

  function renderAreaPolyOverlay(ctx, poly) {
    if (!poly || !poly.cells) return;
    var cells = poly.cells;
    var u = 24;
    var offsetX = 60, offsetY = 50;
    var cellSet = {};
    cells.forEach(function (c) { cellSet[c[0] + ',' + c[1]] = true; });

    cells.forEach(function (c) {
      var r = c[0], col = c[1];
      var px = offsetX + col * u, py = offsetY + r * u;
      ctx.fillStyle = 'rgba(234, 88, 12, 0.75)';
      ctx.fillRect(px, py, u, u);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, u, u);

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.5;
      if (!cellSet[(r - 1) + ',' + col]) {
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + u, py); ctx.stroke();
      }
      if (!cellSet[(r + 1) + ',' + col]) {
        ctx.beginPath(); ctx.moveTo(px, py + u); ctx.lineTo(px + u, py + u); ctx.stroke();
      }
      if (!cellSet[r + ',' + (col - 1)]) {
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + u); ctx.stroke();
      }
      if (!cellSet[r + ',' + (col + 1)]) {
        ctx.beginPath(); ctx.moveTo(px + u, py); ctx.lineTo(px + u, py + u); ctx.stroke();
      }
    });
  }

  /* ── 11. Sub-Panels & Tools ── */
  var panelKind = '';

  function openPanel(kind) {
    if (!subPanel) return;
    subPanel.hidden = false;
    panelKind = kind;

    if (kind === 'triangle') {
      updateTrianglePanel();
    } else if (kind === 'area_rect') {
      updateAreaRectPanel();
    } else if (kind === 'area_para') {
      updateAreaParaPanel();
    } else if (kind === 'same_p16') {
      subContent.innerHTML =
        '<div class="smart-wb-panel-row">' +
          '<strong>Same Perimeter (P = 16) Proof:</strong>' +
          '<span>Square (4×4): Area = 16, Shared Inner Edges = 24 pairs</span>' +
          '<span>Strip (1×7): Area = 7, Shared Inner Edges = 6 pairs</span>' +
        '</div>' +
        '<div class="smart-wb-math-result">' +
          '⭐ Isoperimetric Theorem: For fixed boundary fence P, compact shapes minimize exposed surface and maximize internal area!' +
        '</div>';
    } else if (kind === 'area_poly') {
      updateAreaPolyPanel();
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
          '<input type="text" class="smart-wb-input" id="swb-graph-in" aria-label="Equation to graph" value="' + esc(state.graphEq) + '" />' +
          '<button type="button" class="smart-wb-btn" id="swb-graph-btn">Plot</button>' +
        '</div>' +
        '<div class="smart-wb-math-result" id="swb-graph-res">' +
          esc(brainReady() ? graphFacts(currentGraph()) : 'Working it out…') +
        '</div>';

      var graphIn = dockEl.querySelector('#swb-graph-in');
      var plot = function () { runMath(graphIn.value, { source: 'typed' }); };
      dockEl.querySelector('#swb-graph-btn').addEventListener('click', plot);
      graphIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); plot(); } });
    } else if (kind === '3d') {
      var key = state.curMode.replace('3d_', '');
      var presets = SLICE_PRESETS[key];
      var picks = [['cube', 'Cube'], ['cylinder', 'Cylinder'], ['cone', 'Cone'], ['sphere', 'Sphere'], ['composite', 'Cone on a cylinder']];
      var html =
        '<div class="smart-wb-panel-row smart-wb-wrap">' +
          '<strong>Solid:</strong>' +
          picks.map(function (p) {
            return '<button type="button" class="smart-wb-chip' + (p[0] === key ? ' is-on' : '') + '" data-solid="' + p[0] + '">' + p[1] + '</button>';
          }).join('') +
        '</div>';
      function slider(label, field, min, max, step, value, unit) {
        return '<label class="smart-wb-slider">' + label +
          '<input type="range" class="smart-wb-range" data-field="' + field + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '"/>' +
          '<output>' + num(value, 2) + unit + '</output></label>';
      }
      if (key === 'surface') {
        html += '<div class="smart-wb-math-result" id="swb-slice-res">' + esc(state.surface ? state.surface.text : '') +
          ' for x and y from −3 to 3. Colour shows height: blue is low, red is high. Drag the picture to turn it.</div>';
      } else if (presets) {
        html +=
          '<div class="smart-wb-panel-row smart-wb-wrap">' +
            '<strong>Cut it into a:</strong>' +
            presets.map(function (p, i) { return '<button type="button" class="smart-wb-chip" data-cut="' + i + '">' + p[0] + '</button>'; }).join('') +
          '</div>' +
          '<div class="smart-wb-panel-row smart-wb-wrap">' +
            slider('Tilt', 'tilt', 0, 90, 1, state.slice.tilt, '°') +
            slider('Turn', 'spin', 0, 180, 1, state.slice.spin, '°') +
            slider('Slide', 'offset', -1, 1, 0.02, state.slice.offset, '') +
            (key === 'cube' || key === 'cone' ? slider('Unfold', 'unfold', 0, 1, 0.01, state.unfoldPct, '') : '') +
          '</div>' +
          '<div class="smart-wb-math-result" id="swb-slice-res">Cross-section: working it out…</div>';
      } else {
        html +=
          '<div class="smart-wb-panel-row smart-wb-wrap">' + slider('Pull apart', 'explode', 0, 1, 0.01, state.explodeJoint, '') + '</div>' +
          '<div class="smart-wb-math-result">A cone on a cylinder: pull them apart to see the hidden circle where they join. Drag the picture to turn it.</div>';
      }
      subContent.innerHTML = readRow() + html;
      wireReadRow();

      subContent.querySelectorAll('[data-solid]').forEach(function (btn) {
        btn.addEventListener('click', function () { switchTo3DMode('3d_' + btn.dataset.solid); });
      });
      subContent.querySelectorAll('[data-cut]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var p = presets[+btn.dataset.cut];
          state.slice = { tilt: p[1], spin: p[2], offset: p[3] };
          openPanel('3d');
          render3D();
        });
      });
      subContent.querySelectorAll('[data-field]').forEach(function (input) {
        input.addEventListener('input', function () {
          var v = parseFloat(input.value);
          var field = input.dataset.field;
          if (field === 'unfold') state.unfoldPct = v;
          else if (field === 'explode') state.explodeJoint = v;
          else state.slice[field] = v;
          input.nextElementSibling.textContent = num(v, 2) + (field === 'tilt' || field === 'spin' ? '°' : '');
          render3D();
        });
      });
    } else if (kind === 'solve') {
      subContent.innerHTML = solveRow('') +
        '<div class="smart-wb-math-result" id="swb-solve-res">' +
          'Type arithmetic, fractions, an equation in x, or a chemical equation to balance.' +
        '</div>';
      wireSolveRow();
    }
  }

  function solveRow(value) {
    return '<div class="smart-wb-panel-row">' +
        '<strong>Solve:</strong>' +
        '<input type="text" class="smart-wb-input" id="swb-solve-in" aria-label="Problem to solve" value="' + esc(value) + '" placeholder="e.g. 2x + 5 = 15, 3/4 + 5/8 or H2 + O2 = H2O" />' +
        '<button type="button" class="smart-wb-btn" id="swb-solve-btn">Solve</button>' +
      '</div>';
  }

  function wireSolveRow() {
    var input = dockEl.querySelector('#swb-solve-in');
    if (!input) return;
    dockEl.querySelector('#swb-solve-btn').addEventListener('click', solveProblem);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); solveProblem(); } });
  }

  function solveProblem() {
    var val = (dockEl.querySelector('#swb-solve-in').value || '').trim();
    if (!val) return;
    runMath(val, { source: 'solver' });
  }

  function selectTool(tool) {
    state.curTool = tool;
    dockEl.querySelectorAll('[data-tool]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tool === tool);
    });

    if (tool === 'shape') {
      switchTo3DMode('3d_cube');
    } else if (tool === 'graph') {
      exit3DMode();
      state.curMode = 'graph';
      openPanel('graph');
      redraw();
    } else if (tool === 'solve') {
      exit3DMode();
      openPanel('solve');
    } else {
      exit3DMode();
      if (tool === 'write') {
        loadBrain();
        setDetectBanner('✍️ Write an equation in print, like y = x² − 4 or 2x + 5 = 15, then pause');
      }
    }
  }

  function clearBoard() {
    resetInk();
    lastRead = null;
    state.strokes = [];
    state.counters = [];
    state.triData = null;
    state.circData = null;
    state.inkAnswer = null;
    state.curMode = 'draw';
    exit3DMode();
    if (subPanel) subPanel.hidden = true;
    setDetectBanner('🧹 Blackboard cleared');
    redraw();
  }

  function undoLast() {
    if (state.strokes.length) {
      var gone = state.strokes.pop();
      var at = ink.records.indexOf(gone);
      if (at >= 0) { ink.records.splice(at, 1); ink.strokes.splice(at, 1); state.inkAnswer = null; }
    } else if (state.counters.length) state.counters.pop();
    redraw();
  }

  function setupToolbar() {
    dockEl.querySelector('.smart-wb-toolbar').addEventListener('click', function (e) {
      var toolBtn = e.target.closest('[data-tool]');
      if (toolBtn) selectTool(toolBtn.dataset.tool);

      var actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        var act = actionBtn.dataset.action;
        if (act === 'clear') clearBoard();
        else if (act === 'undo') undoLast();
        else if (act === 'insert') insertSolutionIntoPage();
        else if (act === 'voice') speakExplanation();
        else if (act === 'record') { if (rec) stopRecording(); else openRecordPanel(); }
        else if (act === 'summary') showSummary();
      }
    });
  }

  function setupChips() {
    dockEl.querySelector('.smart-wb-chips').addEventListener('click', function (e) {
      var chip = e.target.closest('.smart-wb-chip');
      if (!chip) return;
      runChip(chip.dataset.action);
    });
  }

  function runChip(act) {
    {
      if (act.indexOf('ask:') === 0) {
        handleCommand(act.slice(4), 'typed');
      } else if (act.indexOf('write:') === 0) {
        writeDemo(act.slice(6));
      } else if (act === 'triangle') {
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
      } else if (act === 'area_rect') {
        state.curMode = 'area_rect';
        state.rectData = { x: 140, y: 100, w: 240, h: 160 };
        exit3DMode();
        updateAreaRectAnalysis();
        openPanel('area_rect');
        setDetectBanner('✨ Loaded Rectangle: ℓ = 8, w = 5.3 → Area = 42.7 sq units | Perimeter = 26.7 units');
        redraw();
      } else if (act === 'area_para') {
        state.curMode = 'area_para';
        state.paraData = { x: 110, y: 220, b: 200, h: 112, s: 56 };
        exit3DMode();
        updateAreaParaAnalysis();
        openPanel('area_para');
        setDetectBanner('✨ Loaded Parallelogram: b = 7.1, h = 4.0 → Area = 28.4 sq units | Slant c = 4.5');
        redraw();
      } else if (act === 'same_p16') {
        state.curMode = 'same_p16';
        exit3DMode();
        openPanel('same_p16');
        setDetectBanner('✨ Same Perimeter (P = 16) Comparison: Compact 4×4 (A=16) vs Stretched 1×7 (A=7)');
        redraw();
      } else if (act === 'area_poly') {
        state.curMode = 'area_poly';
        exit3DMode();
        state.polyData = {
          cells: [
            [2, 3], [2, 4], [2, 5],
            [3, 3], [3, 4], [3, 5],
            [4, 3], [4, 4]
          ],
          size: 10
        };
        openPanel('area_poly');
        setDetectBanner('✨ Polyomino: 8 squares · Exterior perimeter highlighted in glowing yellow');
        redraw();
      } else if (act === 'circle') {
        state.curMode = 'circle';
        state.circData = { cx: 250, cy: 160, r: 80 };
        exit3DMode();
        openPanel('circle');
        redraw();
      } else if (act === 'tangent') {
        state.curMode = 'graph';
        state.graphEq = 'y = x^2';
        exit3DMode();
        openPanel('graph');
        setDetectBanner('⚡ Tangent dy/dx: Parabola y = x² · Tangent slope at x₀ is f\'(x₀) = 2x₀');
        redraw();
      } else if (act === 'integral') {
        state.curMode = 'graph';
        state.graphEq = 'y = x^2';
        exit3DMode();
        openPanel('graph');
        setDetectBanner('∫ Area Under Curve: Accumulating Riemann slices ∫ x² dx = ⅓ x³');
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
    }
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
    if (!('speechSynthesis' in window)) {
      setDetectBanner('🔊 This browser cannot read aloud.');
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    var text = detectBanner ? detectBanner.textContent : 'AI Blackboard';
    var result = subPanel && !subPanel.hidden ? subContent.querySelector('.smart-wb-math-result') : null;
    if (result && result.textContent.trim()) text += '. ' + result.textContent;
    text = text.replace(/→/g, ' gives ')
      .replace(/[\u2190-\u21FF\u2300-\u23FF\u2600-\u27BF\uFE0F]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, ' ')
      .replace(/\s+/g, ' ');
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.onend = utter.onerror = function () { setSpeaking(false); };
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }

  /* ── 11b. The board's brain: handwriting, commands, voice, lookup, recording, notes ──
   * The thinking lives in three DOM-free files under smart-board/ (board-math.js,
   * ink-recognizer.js, board-assist.js); this section is the wiring. Everything runs in the
   * browser. The only thing that can leave it is voice input, which uses the browser's own
   * speech service and is off until the teacher turns it on. */
  var brainState = 'idle';
  var brainWaiters = [];

  function brainReady() {
    return !!(window.BoardMath && window.InkRecognizer && window.BoardAssist);
  }

  function loadBrain(cb) {
    if (brainReady()) { brainState = 'ready'; if (cb) cb(); return; }
    if (cb) brainWaiters.push(cb);
    if (brainState === 'loading') return;
    brainState = 'loading';
    var names = ['board-math.js', 'ink-recognizer.js', 'board-assist.js'];
    var left = names.length;
    names.forEach(function (name) {
      var s = document.createElement('script');
      s.src = SCRIPT_SRC ? new URL('smart-board/' + name, SCRIPT_SRC).href : '/assets/js/smart-board/' + name;
      s.onload = function () {
        if (--left > 0) return;
        brainState = 'ready';
        var waiting = brainWaiters;
        brainWaiters = [];
        waiting.forEach(function (fn) { fn(); });
        if (state.curMode.indexOf('3d') === 0) render3D(); else redraw();
        if (panelKind === 'graph' && subPanel && !subPanel.hidden) openPanel('graph');
      };
      s.onerror = function () {
        brainState = 'failed';
        setDetectBanner('The board could not load its maths helpers. Check the connection, then reopen the board.');
      };
      document.head.appendChild(s);
    });
  }

  function esc(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(v, places) {
    var p = Math.pow(10, places == null ? 2 : places);
    return String(Math.round(v * p) / p);
  }

  /* Session log: what the class summary and the recording are built from. */
  var events = [];
  var sessionStart = 0;
  var snapshotTimer = null;

  function logEvent(kind, text, detail) {
    if (!sessionStart) sessionStart = Date.now();
    var last = events[events.length - 1];
    var ev;
    if (last && last.kind === kind && last.text === text) { ev = last; ev.detail = detail; }
    else { ev = { t: Date.now() - sessionStart, kind: kind, text: text, detail: detail || '' }; events.push(ev); }
    if (kind === 'said' || kind === 'lookup') return;
    if (snapshotTimer) clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(function () {
      var withPictures = events.filter(function (e) { return e.image; }).length;
      if (withPictures >= 16 && !ev.image) return;
      try { ev.image = snapshot(420); } catch (_) {}
    }, 180);
  }

  function paintComposite(ctx, w, h, withBanner) {
    ctx.fillStyle = '#0f141c';
    ctx.fillRect(0, 0, w, h);
    var src = threeCanvas.classList.contains('active') ? threeCanvas : chalkCanvas;
    if (src.width && src.height) ctx.drawImage(src, 0, 0, w, h);
    if (!withBanner || !detectBanner) return;
    var size = Math.max(11, Math.round(w / 52));
    ctx.fillStyle = 'rgba(18, 24, 34, 0.9)';
    ctx.fillRect(0, 0, w, size * 2.1);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(detectBanner.textContent, size * 0.8, size * 1.05, w - size * 1.6);
  }

  function snapshot(width) {
    var stage = dockEl.querySelector('.smart-wb-stage');
    var ratio = stage.clientHeight / Math.max(1, stage.clientWidth);
    var c = document.createElement('canvas');
    c.width = width;
    c.height = Math.max(120, Math.round(width * ratio));
    paintComposite(c.getContext('2d'), c.width, c.height, true);
    return c.toDataURL('image/jpeg', 0.62);
  }

  /* ── Maths from a line of text (typed, spoken or handwritten) ── */
  var lastRead = null; // { text, source: 'ink' } while the panel should offer a correction box
  var graphCache = { src: null, res: null };

  function currentGraph() {
    if (!window.BoardMath) return null;
    if (graphCache.src !== state.graphEq) {
      graphCache = { src: state.graphEq, res: window.BoardMath.interpret(state.graphEq) };
    }
    var r = graphCache.res;
    return r && (r.kind === 'graph' || r.kind === 'implicit') ? r : null;
  }

  function graphFacts(res) {
    if (!res) return 'That is not something the board can graph yet. Try y = x^2 - 4, y = sin(x) or x^2 + y^2 = 25.';
    if (res.kind === 'implicit') return 'Every point (x, y) that makes ' + res.text + ' true.';
    var a = res.analysis, bits = [];
    var roots = a.roots.filter(function (r) { return Math.abs(r) <= 12; });
    bits.push(roots.length ? 'Crosses the x-axis at x = ' + roots.slice(0, 6).join(', ') + (roots.length > 6 ? ', …' : '') : 'Never crosses the x-axis here');
    if (a.yIntercept != null) bits.push('y-intercept (0, ' + a.yIntercept + ')');
    a.turning.filter(function (t) { return Math.abs(t.x) <= 12; }).slice(0, 3).forEach(function (t) {
      bits.push((t.kind === 'min' ? 'Lowest' : 'Highest') + ' turning point (' + t.x + ', ' + t.y + ')');
    });
    return bits.join(' | ');
  }

  function readRow() {
    if (!lastRead || lastRead.source !== 'ink') return '';
    return '<div class="smart-wb-panel-row">' +
        '<strong>I read:</strong>' +
        '<input type="text" class="smart-wb-input" id="swb-read-in" aria-label="What the board read from your handwriting" value="' + esc(lastRead.text) + '" />' +
        '<button type="button" class="smart-wb-btn" id="swb-read-btn">Use this</button>' +
      '</div>';
  }

  function wireReadRow() {
    var btn = dockEl.querySelector('#swb-read-btn');
    var input = dockEl.querySelector('#swb-read-in');
    if (!btn || !input) return;
    function go() { runMath(input.value, { source: 'ink', corrected: true }); }
    btn.addEventListener('click', go);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  }

  function showResult(html, fromSolver) {
    if (!subPanel) return;
    subPanel.hidden = false;
    var typed = fromSolver && dockEl.querySelector('#swb-solve-in');
    subContent.innerHTML = (typed ? solveRow(typed.value) : readRow()) + html;
    if (typed) wireSolveRow(); else { wireReadRow(); panelKind = 'result'; }
  }

  function inkToAnswer(answer) {
    if (ink.box && ink.records.length) state.inkAnswer = { x: ink.box.minX, y: ink.box.maxY + 30, text: answer };
  }

  function consumeInk() {
    state.strokes = state.strokes.filter(function (s) { return ink.records.indexOf(s) < 0; });
    resetInk();
  }

  function runMath(text, opts) {
    opts = opts || {};
    if (!brainReady()) { loadBrain(function () { runMath(text, opts); }); return; }
    var res = window.BoardMath.interpret(text);
    var fromInk = opts.source === 'ink';
    if (!fromInk) lastRead = null;
    var prefix = fromInk ? '✍️ Read “' + text + '” → ' : '✨ ';
    var keep = opts.source === 'solver';

    if (res.kind === 'graph' || res.kind === 'implicit') {
      if (fromInk) consumeInk();
      state.curMode = 'graph';
      state.graphEq = res.text;
      exit3DMode();
      state.curMode = 'graph';
      openPanel('graph');
      setDetectBanner(prefix + 'Graph of ' + res.text);
      logEvent('graph', res.text, graphFacts(res));
      redraw();
      return res;
    }
    if (res.kind === 'surface') {
      if (fromInk) consumeInk();
      state.surface = { fn: res.fn, text: res.text };
      switchTo3DMode('3d_surface');
      setDetectBanner(prefix + '3D surface ' + res.text + ' · drag to rotate');
      logEvent('graph', res.text, 'a 3D surface');
      return res;
    }
    exit3DMode();
    if (res.kind === 'solve') {
      var ans = res.roots.length ? 'x = ' + res.roots.join(' or x = ') : 'no real solution';
      setDetectBanner(prefix + res.equation + '  →  ' + ans);
      showResult('<div class="smart-wb-math-result"><strong>' + esc(res.equation) + '</strong><br>' +
        res.steps.map(function (st, i) { return 'Step ' + (i + 1) + ': ' + esc(st); }).join('<br>') + '</div>', keep);
      if (fromInk) inkToAnswer(ans);
      logEvent('solve', res.equation, ans);
    } else if (res.kind === 'arithmetic') {
      var val = res.fraction && res.fraction !== String(res.value) ? res.fraction + ' = ' + res.value : String(res.value);
      setDetectBanner(prefix + res.text + ' = ' + val);
      showResult('<div class="smart-wb-math-result">' + esc(res.text) + ' = <strong>' + esc(val) + '</strong></div>', keep);
      if (fromInk) inkToAnswer('= ' + val);
      logEvent('solve', res.text, '= ' + val);
    } else if (res.kind === 'check') {
      var verdict = res.isTrue ? 'True: both sides are ' + res.left : 'Not true: the left side is ' + res.left + ', the right side is ' + res.right;
      setDetectBanner(prefix + res.text + ' · ' + verdict);
      showResult('<div class="smart-wb-math-result">' + esc(res.text) + '<br><strong>' + esc(verdict) + '</strong></div>', keep);
      if (fromInk) inkToAnswer(res.isTrue ? '✓ true' : '✗ ' + res.left + ' ≠ ' + res.right);
      logEvent('solve', res.text, verdict);
    } else if (res.kind === 'chem') {
      if (res.ok) {
        setDetectBanner(prefix + 'Balanced: ' + res.balanced);
        showResult('<div class="smart-wb-math-result"><strong>' + esc(res.balanced) + '</strong><br>' +
          'Atoms on each side: ' + res.atoms.map(function (a) { return esc(a.el) + ' ' + a.left + ' = ' + a.right; }).join(' · ') + '</div>', keep);
        if (fromInk) inkToAnswer(res.balanced);
        logEvent('chem', res.balanced, res.atoms.map(function (a) { return a.el + ' ' + a.left; }).join(', ') + ' atoms each side');
      } else {
        setDetectBanner(prefix + 'That equation cannot be balanced as written');
        showResult('<div class="smart-wb-math-result">' + esc(res.reason) + '</div>', keep);
      }
    } else {
      setDetectBanner(fromInk ? '✍️ I read “' + text + '” but could not make maths of it. Fix it below, or write it again.' : 'The board could not read “' + text + '”. Type help for examples.');
      if (fromInk) { lastRead = { text: text, source: 'ink' }; showResult(''); }
    }
    redraw();
    return res;
  }

  /* ── Handwriting (the ✍️ Write tool) ── */
  var ink = { strokes: [], records: [], box: null, timer: null };

  function resetInk() {
    if (ink.timer) clearTimeout(ink.timer);
    ink = { strokes: [], records: [], box: null, timer: null };
  }

  function strokeBox(pts) {
    var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    pts.forEach(function (p) {
      b.minX = Math.min(b.minX, p.x); b.maxX = Math.max(b.maxX, p.x);
      b.minY = Math.min(b.minY, p.y); b.maxY = Math.max(b.maxY, p.y);
    });
    return b;
  }

  function addInkStroke(pts) {
    var box = strokeBox(pts);
    if (ink.box) {
      // A stroke well above or below the line being written starts a new line.
      var lineH = Math.max(ink.box.maxY - ink.box.minY, 30);
      var mid = (box.minY + box.maxY) / 2;
      if (mid < ink.box.minY - lineH * 0.9 || mid > ink.box.maxY + lineH * 0.9) {
        resetInk();
        state.inkAnswer = null;
      }
    }
    var record = { tool: 'write', pts: pts, color: state.chalkColor };
    state.strokes.push(record);
    ink.strokes.push(pts);
    ink.records.push(record);
    ink.box = ink.box ? {
      minX: Math.min(ink.box.minX, box.minX), minY: Math.min(ink.box.minY, box.minY),
      maxX: Math.max(ink.box.maxX, box.maxX), maxY: Math.max(ink.box.maxY, box.maxY)
    } : box;
    if (ink.timer) clearTimeout(ink.timer);
    ink.timer = setTimeout(readInk, 950);
  }

  function readInk() {
    ink.timer = null;
    if (!ink.strokes.length) return;
    if (!brainReady()) { loadBrain(readInk); return; }
    var read = window.InkRecognizer.readLine(ink.strokes);
    var meaning = read.text ? window.BoardMath.interpret(read.text) : { kind: 'unknown' };
    if (read.confidence >= 0.4 && meaning.kind !== 'unknown') {
      lastRead = { text: read.text, source: 'ink' };
      runMath(read.text, { source: 'ink' });
      return;
    }
    platformHandwriting(function (words) {
      if (words) {
        lastRead = { text: words, source: 'ink' };
        handleCommand(words, 'ink');
      } else {
        runMath(read.text, { source: 'ink' });
      }
    });
  }

  // Chromebooks and some other Chrome builds ship an on-device handwriting recogniser that
  // reads whole words. When the built-in template matcher can't read a line, ask it.
  function platformHandwriting(done) {
    if (!navigator.createHandwritingRecognizer || typeof window.HandwritingStroke !== 'function') { done(''); return; }
    try {
      navigator.createHandwritingRecognizer({ languages: ['en'] }).then(function (hw) {
        var drawing = hw.startDrawing({ recognitionType: 'text', alternatives: 1 });
        ink.strokes.forEach(function (pts) {
          var st = new window.HandwritingStroke();
          pts.forEach(function (p, i) { st.addPoint({ x: p.x, y: p.y, t: i * 8 }); });
          drawing.addStroke(st);
        });
        return drawing.getPrediction().then(function (preds) {
          try { drawing.clear(); hw.finish(); } catch (_) {}
          done(preds && preds[0] && preds[0].text ? preds[0].text : '');
        });
      }).catch(function () { done(''); });
    } catch (_) { done(''); }
  }

  var demoTimer = null;

  /** Writes `text` on the board in the built-in hand, then reads it like any handwriting. */
  function writeDemo(text) {
    if (!brainReady()) { loadBrain(function () { writeDemo(text); }); return; }
    if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
    selectTool('write');
    resetInk();
    state.inkAnswer = null;
    state.strokes = state.strokes.filter(function (s) { return s.tool !== 'write'; });
    var stage = dockEl.querySelector('.smart-wb-stage');
    var size = Math.max(34, Math.min(58, stage.clientWidth / (text.length * 0.62 + 2)));
    var strokes = window.InkRecognizer.sample(text, { x: 36, y: Math.max(70, stage.clientHeight * 0.3), size: size, jitter: 1.1, seed: Date.now() % 9973 });
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setDetectBanner('✍️ Writing ' + text + ' …');
    if (still) {
      strokes.forEach(addInkStroke);
      redraw();
      return;
    }
    var si = 0, pi = 0;
    demoTimer = setInterval(function () {
      if (si >= strokes.length) { clearInterval(demoTimer); demoTimer = null; currentStroke = []; redraw(); return; }
      pi += 3;
      currentStroke = strokes[si].slice(0, pi);
      if (pi >= strokes[si].length) { addInkStroke(strokes[si]); currentStroke = []; si++; pi = 0; }
      redraw();
    }, 16);
  }

  /* ── Cross-sections ── */
  var SLICE_PRESETS = {
    cube: [['Square', 0, 0, 0], ['Rectangle', 45, 0, 0], ['Triangle', 54.74, 45, 0.6], ['Hexagon', 54.74, 45, 0]],
    cylinder: [['Circle', 0, 0, 0], ['Ellipse', 35, 0, 0], ['Rectangle', 90, 0, 0]],
    cone: [['Circle', 0, 0, 0], ['Ellipse', 35, 0, 0], ['Parabola', 63.43, 0, 0], ['Hyperbola', 80, 0, 0.3], ['Triangle', 90, 0, 0]],
    sphere: [['Great circle', 0, 0, 0], ['Small circle', 0, 0, 0.6]]
  };
  var UNIT_PX = 35; // one board unit in the 3D view

  function solidKey() {
    var key = state.curMode.replace('3d_', '');
    return SLICE_PRESETS[key] ? key : null;
  }

  function renderSection(ctx, proj) {
    var key = solidKey();
    if (!key || !window.BoardMath) return;
    var sec = window.BoardMath.sliceSolid(key, state.slice);
    if (sec && sec.points.length >= 3) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.36)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      sec.points.forEach(function (p, i) {
        var q = proj(p[0] * UNIT_PX, p[1] * UNIT_PX, p[2] * UNIT_PX);
        if (i === 0) ctx.moveTo(q.px, q.py); else ctx.lineTo(q.px, q.py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (key === 'cube') {
        ctx.fillStyle = '#facc15';
        sec.points.forEach(function (p) {
          var q = proj(p[0] * UNIT_PX, p[1] * UNIT_PX, p[2] * UNIT_PX);
          ctx.beginPath(); ctx.arc(q.px, q.py, 3.5, 0, Math.PI * 2); ctx.fill();
        });
      }
      ctx.lineWidth = 2;
    }
    var out = dockEl.querySelector('#swb-slice-res');
    if (out && sec) {
      var label = window.BoardMath.SOLIDS[key].label;
      var facts = sec.area > 0
        ? sec.shape + ' · area ' + num(sec.area) + ' sq units · ' + (sec.radius != null ? 'circumference ' : 'perimeter ') + num(sec.perimeter) + ' units'
        : sec.shape;
      out.textContent = 'Cross-section: ' + facts;
      setDetectBanner('🔪 ' + label + ' cut at ' + num(state.slice.tilt, 1) + '° → ' + facts);
      logEvent('solid', label + ' cross-section', facts);
    }
  }

  function render3DSurface(ctx, proj) {
    var s = state.surface;
    if (!s) return;
    var n = 22, R = 3, S = 27, zCap = 4.5, zScale = S * 0.8;
    var grid = [], lo = Infinity, hi = -Infinity, i, j;
    for (i = 0; i <= n; i++) {
      grid.push([]);
      for (j = 0; j <= n; j++) {
        var x = -R + 2 * R * i / n, y = -R + 2 * R * j / n;
        var z = s.fn(x, y);
        if (!isFinite(z)) { grid[i].push(null); continue; }
        var zc = Math.max(-zCap, Math.min(zCap, z));
        var p = proj(x * S, zc * zScale, y * S);
        p.z = zc; p.cut = zc !== z;
        lo = Math.min(lo, zc); hi = Math.max(hi, zc);
        grid[i].push(p);
      }
    }
    // Axes
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 12px system-ui';
    [['x', R * S * 1.25, 0, 0], ['z', 0, zCap * zScale, 0], ['y', 0, 0, R * S * 1.25]].forEach(function (ax) {
      var a = proj(-ax[1], -ax[2], -ax[3]), b = proj(ax[1], ax[2], ax[3]);
      ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
      ctx.fillText(ax[0], b.px + 5, b.py);
    });
    ctx.lineWidth = 1.5;
    function seg(a, b) {
      if (!a || !b || (a.cut && b.cut)) return;
      var t = hi > lo ? ((a.z + b.z) / 2 - lo) / (hi - lo) : 0.5;
      ctx.strokeStyle = 'hsl(' + Math.round(205 - 165 * t) + ', 90%, 62%)';
      ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
    }
    for (i = 0; i <= n; i++) for (j = 0; j <= n; j++) {
      if (i < n) seg(grid[i][j], grid[i + 1][j]);
      if (j < n) seg(grid[i][j], grid[i][j + 1]);
    }
  }

  function renderImplicit(ctx, fn, w, h, cx, cy, scale) {
    var step = 5;
    var cols = Math.ceil(w / step) + 1, rows = Math.ceil(h / step) + 1;
    var prev = null;
    ctx.beginPath();
    for (var r = 0; r < rows; r++) {
      var row = new Float64Array(cols);
      for (var c = 0; c < cols; c++) row[c] = fn((c * step - cx) / scale, (cy - r * step) / scale);
      if (prev) {
        for (var k = 0; k < cols - 1; k++) {
          var a = prev[k], b = prev[k + 1], d = row[k], e = row[k + 1];
          if (!isFinite(a + b + d + e)) continue;
          var pts = [];
          var x0 = k * step, y0 = (r - 1) * step;
          if ((a < 0) !== (b < 0)) pts.push([x0 + step * a / (a - b), y0]);
          if ((d < 0) !== (e < 0)) pts.push([x0 + step * d / (d - e), y0 + step]);
          if ((a < 0) !== (d < 0)) pts.push([x0, y0 + step * a / (a - d)]);
          if ((b < 0) !== (e < 0)) pts.push([x0 + step, y0 + step * b / (b - e)]);
          for (var q = 0; q + 1 < pts.length; q += 2) { ctx.moveTo(pts[q][0], pts[q][1]); ctx.lineTo(pts[q + 1][0], pts[q + 1][1]); }
        }
      }
      prev = row;
    }
    ctx.stroke();
  }

  /* ── Commands: the Ask box and the microphone ── */
  var dataCache = {};

  function loadData(name, cb) {
    if (dataCache[name]) { cb(dataCache[name]); return; }
    var url = SITE_ROOT ? new URL('data/' + name + '.json', SITE_ROOT).href : '/data/' + name + '.json';
    fetch(url).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (json) { dataCache[name] = json; cb(json); })
      .catch(function () { setDetectBanner('The board could not load that part of the site. Check the connection.'); });
  }

  function siteHref(path) {
    return SITE_ROOT ? new URL(path, SITE_ROOT).href : '/' + path;
  }

  function showLessons(query, opts) {
    loadData('lessons', function (catalog) {
      var hits = window.BoardAssist.searchLessons(catalog.lessons || [], query, 5);
      if (!hits.length) {
        setDetectBanner(opts && opts.guessed ? 'The board did not understand “' + query + '”. Type help for what it can do.' : 'No lesson found for “' + query + '”.');
        return;
      }
      exitSolidKeepPanel();
      setDetectBanner('📚 ' + hits.length + ' lesson' + (hits.length > 1 ? 's' : '') + ' on “' + query + '”');
      showResult('<div class="smart-wb-lookup"><strong>Lessons on “' + esc(query) + '”</strong><ul>' +
        hits.map(function (l) {
          return '<li><a href="' + esc(siteHref(l.url)) + '" target="_blank" rel="noopener">' + esc(l.title) + '</a>' +
            '<span> · ' + esc(l.primaryModule || '') + '</span><br><small>' + esc((l.summary || '').slice(0, 150)) + '</small></li>';
        }).join('') + '</ul></div>');
      logEvent('lookup', 'Lessons on “' + query + '”', hits.map(function (l) { return l.title; }).join('; '));
    });
  }

  function showDefinition(term) {
    loadData('glossary', function (glossary) {
      var found = window.BoardAssist.findTerm(glossary.terms || glossary, term);
      if (!found) { showLessons(term, { guessed: false }); return; }
      exitSolidKeepPanel();
      setDetectBanner('📖 ' + found.term + ': ' + found.definition);
      showResult('<div class="smart-wb-math-result"><strong>' + esc(found.term) + '</strong><br>' + esc(found.definition) + '</div>');
      logEvent('lookup', 'What is ' + found.term + '?', found.definition);
    });
  }

  var quizCount = 0;

  function showQuiz(topic) {
    loadData('daily-double-bank', function (bank) {
      var seed = Math.floor(Date.now() / 1000) + quizCount++ * 7;
      var q = window.BoardAssist.pickQuiz(bank.questions || [], topic, seed);
      if (!q) { setDetectBanner('No quiz question about “' + topic + '” yet. Try: quiz me on gravity, fractions, circuits …'); return; }
      exitSolidKeepPanel();
      var choices = q.choices.slice();
      for (var i = choices.length - 1; i > 0; i--) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        var j = seed % (i + 1);
        var tmp = choices[i]; choices[i] = choices[j]; choices[j] = tmp;
      }
      setDetectBanner('❓ Quiz' + (topic ? ' on ' + topic : '') + ': ' + q.clue);
      showResult('<div class="smart-wb-quiz"><strong>' + esc(q.category || 'Quiz') + ':</strong> ' + esc(q.clue) +
        '<div class="smart-wb-quiz-choices">' + choices.map(function (c, n) {
          return '<button type="button" class="smart-wb-btn smart-wb-choice" data-choice="' + esc(c) + '">' + 'ABCD'.charAt(n) + '. ' + esc(c) + '</button>';
        }).join('') + '</div><div class="smart-wb-math-result" id="swb-quiz-res" hidden></div></div>');
      var box = subContent.querySelector('.smart-wb-quiz-choices');
      box.addEventListener('click', function (e) {
        var btn = e.target.closest('.smart-wb-choice');
        if (!btn || box.dataset.done) return;
        box.dataset.done = '1';
        var right = btn.dataset.choice === q.answer;
        box.querySelectorAll('.smart-wb-choice').forEach(function (b) {
          b.disabled = true;
          if (b.dataset.choice === q.answer) b.classList.add('is-right');
          else if (b === btn) b.classList.add('is-wrong');
        });
        var res = subContent.querySelector('#swb-quiz-res');
        res.hidden = false;
        res.innerHTML = (right ? '✓ Correct. ' : '✗ The answer is ' + esc(q.answer) + '. ') + esc(q.explanation || '') +
          (q.lesson ? ' <a href="' + esc(siteHref(q.lesson)) + '" target="_blank" rel="noopener">Lesson: ' + esc(q.lessonTitle || 'open') + '</a>' : '') +
          ' <button type="button" class="smart-wb-btn" id="swb-quiz-next">Another question</button>';
        res.querySelector('#swb-quiz-next').addEventListener('click', function () { showQuiz(topic); });
        logEvent('lookup', 'Quiz: ' + q.clue, 'Answer: ' + q.answer + (right ? ' (answered correctly)' : ' (missed)'));
      });
    });
  }

  function showHelp() {
    exitSolidKeepPanel();
    setDetectBanner('💡 Type or say any of these. With ✍️ Write, write an equation and pause.');
    showResult('<div class="smart-wb-lookup"><strong>The board understands:</strong><ul>' +
      window.BoardAssist.HELP.map(function (line) {
        return '<li>' + line.split('·').map(function (ex) {
          return '<button type="button" class="smart-wb-chip" data-ask="' + esc(ex.trim()) + '">' + esc(ex.trim()) + '</button>';
        }).join(' ') + '</li>';
      }).join('') +
      '<li><button type="button" class="smart-wb-chip" data-write="y=x^2-4">✍️ Watch it write y = x² − 4</button> ' +
      '<button type="button" class="smart-wb-chip" data-write="2H2+O2=2H2O">✍️ Watch it write 2H₂ + O₂ = 2H₂O</button></li>' +
      '</ul><small>Handwriting reads printed digits, x y, + − = ( ) / and, for chemistry, H C N O. Type anything else.</small></div>');
  }

  // Leave a 3D solid for the flat board without closing the panel the caller is about to fill.
  function exitSolidKeepPanel() {
    if (state.curMode.indexOf('3d') === 0) exit3DMode();
  }

  function ensureSolid(solid) {
    var want = solid ? '3d_' + solid : (solidKey() ? state.curMode : '3d_cube');
    if (state.curMode !== want) switchTo3DMode(want);
  }

  function handleCommand(text, source) {
    if (!brainReady()) { loadBrain(function () { handleCommand(text, source); }); return; }
    var cmd = window.BoardAssist.parseCommand(text);
    if (cmd.action === 'none') return;
    if (source === 'voice') logEvent('said', text);
    switch (cmd.action) {
      case 'math': runMath(cmd.text, { source: source === 'ink' ? 'ink' : source }); break;
      case 'solid':
        switchTo3DMode('3d_' + cmd.solid);
        setDetectBanner('📦 ' + window.BoardMath.SOLIDS[cmd.solid].label + ' · drag to rotate, use the sliders to cut it');
        logEvent('solid', window.BoardMath.SOLIDS[cmd.solid].label, 'shown in 3D');
        break;
      case 'slice':
        ensureSolid(cmd.solid);
        if (typeof cmd.tilt === 'number') state.slice.tilt = Math.max(0, Math.min(90, cmd.tilt));
        if (typeof cmd.spin === 'number') state.slice.spin = cmd.spin;
        if (typeof cmd.offset === 'number') state.slice.offset = cmd.offset;
        openPanel('3d');
        render3D();
        break;
      case 'unfold':
        ensureSolid(cmd.solid);
        state.unfoldPct = cmd.amount;
        openPanel('3d');
        render3D();
        setDetectBanner(cmd.amount ? '📦 Unfolded into its net' : '📦 Folded back up');
        break;
      case 'rotate':
        ensureSolid(cmd.solid);
        state.threeRotation.ry += cmd.dir * cmd.degrees * Math.PI / 180;
        render3D();
        break;
      case 'shape': runChip(cmd.shape); break;
      case 'clear': clearBoard(); break;
      case 'undo': undoLast(); break;
      case 'lesson': showLessons(cmd.query, cmd); break;
      case 'define': showDefinition(cmd.term); break;
      case 'quiz': showQuiz(cmd.topic); break;
      case 'record': if (cmd.on) openRecordPanel(); else stopRecording(); break;
      case 'summary': showSummary(); break;
      case 'speak': speakExplanation(); break;
      case 'hush': if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setSpeaking(false); break;
      case 'help': showHelp(); break;
    }
  }

  var VOICE_KEY = 'classroomos-smart-wb-voice';
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var listening = null;

  function setMicLive(on) {
    var btn = dockEl.querySelector('.smart-wb-mic');
    if (!btn) return;
    btn.classList.toggle('is-live', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function toggleMic() {
    if (!SpeechRec) {
      setDetectBanner('🎤 This browser has no speech recognition. Type the same commands in the Ask box.');
      return;
    }
    if (listening) { listening.stop(); return; }
    var agreed = false;
    try { agreed = localStorage.getItem(VOICE_KEY) === 'ok'; } catch (_) {}
    if (agreed) { startListening(); return; }
    showResult('<div class="smart-wb-lookup"><strong>Turn on voice commands?</strong><br>' +
      'The board uses this browser\'s own speech recognition. In Chrome, Edge and Safari that can send the sound of your voice to the browser maker (Google, Microsoft or Apple) to be turned into text. ' +
      'Nothing is sent to or stored by this site, and the microphone is only on while the 🎤 button is lit.' +
      '<div class="smart-wb-panel-row" style="margin-top:6px;">' +
        '<button type="button" class="smart-wb-btn" id="swb-voice-yes">Turn on voice</button>' +
        '<button type="button" class="smart-wb-btn" id="swb-voice-no">Not now</button>' +
      '</div></div>');
    subContent.querySelector('#swb-voice-yes').addEventListener('click', function () {
      try { localStorage.setItem(VOICE_KEY, 'ok'); } catch (_) {}
      subPanel.hidden = true;
      startListening();
    });
    subContent.querySelector('#swb-voice-no').addEventListener('click', function () { subPanel.hidden = true; });
  }

  function startListening() {
    var input = dockEl.querySelector('.smart-wb-ask-in');
    var rec;
    try { rec = new SpeechRec(); } catch (_) { setDetectBanner('🎤 Speech recognition is not available here.'); return; }
    rec.lang = document.documentElement.lang || 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var heard = '', final = false;
      for (var i = 0; i < e.results.length; i++) {
        heard += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      input.value = heard.trim();
      if (final && input.value) { handleCommand(input.value, 'voice'); }
    };
    rec.onerror = function (e) {
      setDetectBanner(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? '🎤 The microphone was not allowed. Allow it in the address bar, or type instead.'
        : '🎤 Did not catch that. Press the microphone and try again, or type it.');
    };
    rec.onend = function () { listening = null; setMicLive(false); };
    try { rec.start(); } catch (_) { return; }
    listening = rec;
    setMicLive(true);
    setDetectBanner('🎤 Listening… say “graph y equals x squared”, “slice the cone at 60 degrees”, “quiz me on gravity”');
  }

  function setupAsk() {
    var form = dockEl.querySelector('.smart-wb-ask');
    var input = dockEl.querySelector('.smart-wb-ask-in');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) { showHelpWhenReady(); return; }
      handleCommand(text, 'typed');
      input.select();
    });
    dockEl.querySelector('.smart-wb-mic').addEventListener('click', toggleMic);
    if (!SpeechRec) dockEl.querySelector('.smart-wb-mic').title = 'Voice commands need a browser with speech recognition (Chrome, Edge or Safari)';
    dockEl.querySelector('.smart-wb-tutor').addEventListener('click', speakExplanation);
    // Example chips inside the panel (help screen) run through the same door as typing.
    subPanel.addEventListener('click', function (e) {
      var ask = e.target.closest('[data-ask]');
      if (ask) { input.value = ask.dataset.ask; handleCommand(ask.dataset.ask, 'typed'); return; }
      var write = e.target.closest('[data-write]');
      if (write) writeDemo(write.dataset.write);
    });
  }

  function showHelpWhenReady() {
    if (brainReady()) showHelp(); else loadBrain(showHelp);
  }

  /* ── Recording and class notes ── */
  var rec = null;
  var lastRecordingUrl = null;

  function recButton() { return dockEl.querySelector('[data-action="record"]'); }

  function updateRecButton() {
    var btn = recButton();
    if (!btn) return;
    btn.classList.toggle('is-recording', !!rec);
    btn.textContent = rec ? '⏹ ' + window.BoardAssist.clock(Date.now() - rec.started) : '⏺ Rec';
    btn.title = rec ? 'Stop recording' : 'Record the board (and your voice) to a video file on this computer';
  }

  function openRecordPanel() {
    if (rec) return;
    if (!window.MediaRecorder || !chalkCanvas.captureStream) {
      setDetectBanner('⏺ This browser cannot record the board. Class notes still work: press 📋 Notes.');
      return;
    }
    showResult('<div class="smart-wb-lookup"><strong>Record this lesson</strong><br>' +
      'Makes a video of the board on this computer. Nothing is uploaded; you choose where to save it when you stop.' +
      '<div class="smart-wb-panel-row" style="margin-top:6px;">' +
        '<button type="button" class="smart-wb-btn" id="swb-rec-voice">Board + my voice</button>' +
        '<button type="button" class="smart-wb-btn" id="swb-rec-silent">Board only</button>' +
      '</div></div>');
    subContent.querySelector('#swb-rec-voice').addEventListener('click', function () { startRecording(true); });
    subContent.querySelector('#swb-rec-silent').addEventListener('click', function () { startRecording(false); });
  }

  function startRecording(withMic) {
    if (rec) return;
    var stage = dockEl.querySelector('.smart-wb-stage');
    var w = Math.max(320, Math.round(stage.clientWidth)), h = Math.max(240, Math.round(stage.clientHeight));
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    function paint() { paintComposite(ctx, w, h, true); }
    paint();
    var stream = canvas.captureStream(12);

    function begin(audio) {
      if (audio) audio.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
      var type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].filter(function (t) {
        return window.MediaRecorder.isTypeSupported(t);
      })[0];
      var mr;
      try { mr = new window.MediaRecorder(stream, type ? { mimeType: type } : undefined); }
      catch (_) { setDetectBanner('⏺ This browser could not start a recording.'); return; }
      var chunks = [];
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () { finishRecording(new Blob(chunks, { type: mr.mimeType || type || 'video/webm' })); };
      rec = { mr: mr, audio: audio, stream: stream, started: Date.now(), paint: setInterval(paint, 83), tick: setInterval(updateRecButton, 1000), length: 0 };
      mr.start(1000);
      updateRecButton();
      if (subPanel) subPanel.hidden = true;
      setDetectBanner('⏺ Recording the board' + (audio ? ' and your voice' : '') + '. Press ⏹ to stop and save.');
    }

    if (withMic && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(begin, function () {
        setDetectBanner('⏺ No microphone allowed, so this recording has no sound.');
        begin(null);
      });
    } else begin(null);
  }

  function stopRecording() {
    if (!rec) { setDetectBanner('⏺ Nothing is being recorded.'); return; }
    clearInterval(rec.paint);
    clearInterval(rec.tick);
    rec.length = Date.now() - rec.started;
    try { rec.mr.stop(); } catch (_) {}
    rec.stream.getTracks().forEach(function (t) { t.stop(); });
    if (rec.audio) rec.audio.getTracks().forEach(function (t) { t.stop(); });
  }

  function finishRecording(blob) {
    var length = rec ? rec.length : 0;
    rec = null;
    updateRecButton();
    if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl);
    lastRecordingUrl = URL.createObjectURL(blob);
    var ext = /mp4/.test(blob.type) ? 'mp4' : 'webm';
    var name = 'blackboard-' + new Date().toISOString().slice(0, 10) + '.' + ext;
    setDetectBanner('⏹ Recording ready: ' + window.BoardAssist.clock(length) + ', ' + num(blob.size / 1048576, 1) + ' MB');
    showResult('<div class="smart-wb-lookup"><strong>Recording ready</strong> (' + window.BoardAssist.clock(length) + ', ' + num(blob.size / 1048576, 1) + ' MB). It is only in this tab until you save it.' +
      '<div class="smart-wb-panel-row" style="margin-top:6px;">' +
        '<a class="smart-wb-btn" href="' + lastRecordingUrl + '" download="' + name + '">⬇ Save video</a>' +
        '<button type="button" class="smart-wb-btn" data-ask="summary">📋 Class notes</button>' +
      '</div></div>');
  }

  function buildSummary() {
    var heading = document.querySelector('h1');
    return window.BoardAssist.summarize(events, {
      title: 'Blackboard notes: ' + ((heading && heading.textContent.trim()) || document.title || 'lesson'),
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    });
  }

  function summaryPage(sum) {
    var css = 'body{font:16px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1b2430}' +
      'h1{font-size:1.5rem;margin-bottom:0}h2{font-size:1.1rem;margin-top:1.6rem}.meta{color:#566}' +
      'figure{margin:1rem 0;break-inside:avoid}img{max-width:100%;border-radius:8px;border:1px solid #ccd}figcaption{font-size:.92rem;color:#334}';
    var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(sum.title) + '</title><style>' + css + '</style></head><body>' +
      '<h1>' + esc(sum.title) + '</h1><p class="meta">' + esc(sum.date) + ' · ' + esc(sum.duration) + ' · ' + sum.timeline.length + ' steps</p>';
    sum.sections.forEach(function (sec) {
      html += '<h2>' + esc(sec.heading) + '</h2><ul>' + sec.items.map(function (it) { return '<li>' + esc(it) + '</li>'; }).join('') + '</ul>';
    });
    if (sum.timeline.length) {
      html += '<h2>Step by step</h2>';
      sum.timeline.forEach(function (st) {
        html += st.image
          ? '<figure><img alt="The board at ' + esc(st.at) + '" src="' + st.image + '"><figcaption><strong>' + esc(st.at) + '</strong> ' + esc(st.text) + '</figcaption></figure>'
          : '<p><strong>' + esc(st.at) + '</strong> ' + esc(st.text) + '</p>';
      });
    }
    return html + '</body></html>';
  }

  function showSummary() {
    if (!brainReady()) { loadBrain(showSummary); return; }
    var sum = buildSummary();
    exitSolidKeepPanel();
    setDetectBanner('📋 Class notes: ' + sum.timeline.length + ' steps so far');
    showResult('<div class="smart-wb-lookup"><strong>' + esc(sum.title) + '</strong>' +
      '<pre class="smart-wb-notes">' + esc(sum.text) + '</pre>' +
      '<div class="smart-wb-panel-row">' +
        '<button type="button" class="smart-wb-btn" id="swb-notes-copy">Copy</button>' +
        '<button type="button" class="smart-wb-btn" id="swb-notes-save">⬇ Save as a page (with board pictures)</button>' +
      '</div></div>');
    subContent.querySelector('#swb-notes-copy').addEventListener('click', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(sum.text).then(function () { setDetectBanner('📋 Notes copied'); }, function () {});
    });
    subContent.querySelector('#swb-notes-save').addEventListener('click', function () {
      var blob = new Blob([summaryPage(sum)], { type: 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'blackboard-notes-' + new Date().toISOString().slice(0, 10) + '.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    });
  }

  function setSpeaking(on) {
    var tutor = dockEl && dockEl.querySelector('.smart-wb-tutor');
    if (tutor) tutor.classList.toggle('is-speaking', on);
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
      loadBrain();
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
    isOpen: function () {
      return !!(dockEl && dockEl.classList.contains('is-open'));
    },
    detectContext: detectContext,
    /** Run anything the Ask box accepts: SmartBlackboardDock.ask('graph y = x^2 - 4') */
    ask: function (text) {
      this.open();
      handleCommand(text, 'typed');
    },
    /** Write a line on the board in the built-in hand, then read it like handwriting. */
    write: function (text) {
      this.open();
      writeDemo(text);
    },
    notes: function () {
      return brainReady() ? buildSummary() : null;
    },
    loadRectangle: function (l, w) {
      this.open();
      var scale = 30;
      state.curMode = 'area_rect';
      exit3DMode();
      state.rectData = {
        x: 100,
        y: 80,
        w: Math.round((l || 6) * scale),
        h: Math.round((w || 4) * scale)
      };
      updateAreaRectAnalysis();
      openPanel('area_rect');
      setDetectBanner('✨ Loaded Rectangle: ℓ = ' + (l || 6) + ', w = ' + (w || 4) + ' → Area = ' + ((l || 6) * (w || 4)) + ', Perimeter = ' + (2 * ((l || 6) + (w || 4))));
      redraw();
    },
    loadParallelogram: function (b, h, s) {
      this.open();
      var scale = 28;
      state.curMode = 'area_para';
      exit3DMode();
      state.paraData = {
        x: 80,
        y: 220,
        b: Math.round((b || 7) * scale),
        h: Math.round((h || 4) * scale),
        s: Math.round((typeof s === 'number' ? s : 2) * scale)
      };
      updateAreaParaAnalysis();
      openPanel('area_para');
      var c = Math.sqrt((h || 4) * (h || 4) + (s || 2) * (s || 2)).toFixed(2);
      setDetectBanner('✨ Loaded Parallelogram: b = ' + (b || 7) + ', h = ' + (h || 4) + ' → Area = ' + ((b || 7) * (h || 4)) + ' sq units (Slanted c = ' + c + ')');
      redraw();
    },
    loadTriangle: function (b, h) {
      this.open();
      var scale = 28;
      state.curMode = 'triangle';
      exit3DMode();
      var basePx = (b || 6) * scale;
      var hPx = (h || 4) * scale;
      state.triData = {
        pts: [
          { x: 100, y: 220, label: 'A' },
          { x: 100 + basePx, y: 220, label: 'B' },
          { x: 100 + basePx * 0.45, y: 220 - hPx, label: 'C' }
        ]
      };
      updateTriangleAnalysis();
      openPanel('triangle');
      setDetectBanner('✨ Loaded Triangle: b = ' + (b || 6) + ', h = ' + (h || 4) + ' → Area = ½·b·h = ' + (0.5 * (b || 6) * (h || 4)) + ' sq units');
      redraw();
    },
    loadSameP16: function () {
      this.open();
      state.curMode = 'same_p16';
      exit3DMode();
      openPanel('same_p16');
      setDetectBanner('✨ Same Perimeter (P = 16) Comparison: Compact 4×4 (A=16) vs Stretched 1×7 (A=7)');
      redraw();
    },
    loadPolyomino: function (cells, gridSize) {
      this.open();
      state.curMode = 'area_poly';
      exit3DMode();
      state.polyData = { cells: cells || [], size: gridSize || 10 };
      openPanel('area_poly');
      setDetectBanner('✨ Loaded Grid Polyomino: ' + (cells ? cells.length : 0) + ' units → Exterior Perimeter & Shared Seams Analyzed');
      redraw();
    },
    loadCalculusCurve: function (eq, x0, slope, desc) {
      this.open();
      state.curMode = 'graph';
      exit3DMode();
      if (eq) state.graphEq = eq;
      openPanel('graph');
      setDetectBanner(desc || ('✨ Loaded Calculus Curve: ' + (eq || state.graphEq) + (typeof x0 === 'number' ? ' at x₀ = ' + x0 : '')));
      redraw();
    }
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
