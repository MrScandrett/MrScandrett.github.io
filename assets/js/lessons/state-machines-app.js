import {
  CHALLENGES,
  MEALY_10_MACHINE,
  MOORE_10_MACHINE,
  PRESETS,
  PRESET_ORDER,
  STATE_PALETTE,
  addState,
  analyzeMachine,
  cloneMachine,
  computeCircleLayout,
  computeNestingStates,
  createBlankMachine,
  createMooreMealyComparison,
  createRuntime,
  evaluateChallenges,
  generateCode,
  getPreset,
  parseEventSequence,
  removeState,
  removeTransition,
  setStartState,
  toggleAccepting,
  upsertTransition,
  validateMachine,
} from './state-machines-engine.js';

(function () {
  'use strict';

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── DOM References ──────────────────────────────────────────────────── */
  const studioRoot = document.getElementById('sm-studio');
  if (!studioRoot) return;

  const modeTabs = Array.from(document.querySelectorAll('[data-sm-tab]'));
  const modePanels = Array.from(document.querySelectorAll('[data-sm-panel]'));
  const challengePillBtn = document.getElementById('sm-challenge-pill');

  // Tab 1: Simulator
  const presetSelect = document.getElementById('sm-preset-select');
  const predictToggleBtn = document.getElementById('sm-predict-toggle');
  const autoToggleBtn = document.getElementById('sm-auto-toggle');
  const layoutBtn = document.getElementById('sm-layout-btn');
  const resetBtn = document.getElementById('sm-reset-btn');
  const simCanvas = document.getElementById('sm-canvas');
  const hudLeft = document.getElementById('sm-hud-left');
  const hudRight = document.getElementById('sm-hud-right');
  const worldVizEl = document.getElementById('sm-world-viz');
  const statStateEl = document.getElementById('sm-stat-state');
  const statOutputEl = document.getElementById('sm-stat-output');
  const statEventEl = document.getElementById('sm-stat-event');
  const statStepsEl = document.getElementById('sm-stat-steps');
  const statExtraLabelEl = document.getElementById('sm-stat-extra-label');
  const eventBtnsEl = document.getElementById('sm-event-btns');
  const seqInput = document.getElementById('sm-seq-input');
  const seqStepBtn = document.getElementById('sm-seq-step');
  const seqRunBtn = document.getElementById('sm-seq-run');
  const seqPresetBtn = document.getElementById('sm-seq-preset');
  const inspTabs = Array.from(document.querySelectorAll('[data-sm-insp-tab]'));
  const inspPanels = Array.from(document.querySelectorAll('[data-sm-insp-panel]'));
  const logListEl = document.getElementById('sm-log-list');
  const clearLogBtn = document.getElementById('sm-clear-log');
  const matrixWrapEl = document.getElementById('sm-matrix-wrap');
  const codeLangBtns = Array.from(document.querySelectorAll('[data-sm-lang]'));
  const codeOutEl = document.getElementById('sm-code-out');
  const codeCopyBtn = document.getElementById('sm-code-copy');

  // Tab 2: Builder & Challenges
  const forkBtn = document.getElementById('sm-fork-btn');
  const blankBtn = document.getElementById('sm-blank-btn');
  const loadSimBtn = document.getElementById('sm-load-sim-btn');
  const builderTitleEl = document.getElementById('sm-builder-title');
  const builderCanvas = document.getElementById('sm-builder-canvas');
  const anStatesEl = document.getElementById('sm-an-states');
  const anUnreachEl = document.getElementById('sm-an-unreach');
  const anDeadEl = document.getElementById('sm-an-dead');
  const anCompleteEl = document.getElementById('sm-an-complete');
  const anMsgEl = document.getElementById('sm-an-msg');
  const buildSubtabs = Array.from(document.querySelectorAll('[data-sm-build-tab]'));
  const buildSubpanels = Array.from(document.querySelectorAll('[data-sm-build-panel]'));

  const addStateForm = document.getElementById('sm-add-state-form');
  const newStateName = document.getElementById('sm-new-state-name');
  const newStateOutput = document.getElementById('sm-new-state-output');
  const newStateColor = document.getElementById('sm-new-state-color');
  const newStateAccept = document.getElementById('sm-new-state-accept');
  const stateChipList = document.getElementById('sm-state-list');

  const addTransForm = document.getElementById('sm-add-trans-form');
  const trFromSelect = document.getElementById('sm-tr-from');
  const trEventInput = document.getElementById('sm-tr-event');
  const trToSelect = document.getElementById('sm-tr-to');
  const trOutputInput = document.getElementById('sm-tr-output');
  const transChipList = document.getElementById('sm-trans-list');
  const builderStatusEl = document.getElementById('sm-builder-status');
  const challengesListEl = document.getElementById('sm-challenges-list');

  // Tab 3: Moore vs Mealy & Memory Wall
  const mmFeed0Btn = document.getElementById('sm-mm-0');
  const mmFeed1Btn = document.getElementById('sm-mm-1');
  const mmDemoBtn = document.getElementById('sm-mm-demo');
  const mmResetBtn = document.getElementById('sm-mm-reset');
  const mmMooreCanvas = document.getElementById('sm-moore-canvas');
  const mmMealyCanvas = document.getElementById('sm-mealy-canvas');
  const mmMooreBadge = document.getElementById('sm-mm-moore-badge');
  const mmMealyBadge = document.getElementById('sm-mm-mealy-badge');
  const mmTableBody = document.getElementById('sm-mm-tbody');
  const depthSlider = document.getElementById('sm-depth-slider');
  const depthValEl = document.getElementById('sm-depth-val');
  const depthStatesEl = document.getElementById('sm-depth-states');
  const depthSampleEl = document.getElementById('sm-depth-sample');
  const depthChainEl = document.getElementById('sm-depth-chain');

  // Practice Problems
  const practiceScoreEl = document.getElementById('sm-practice-score');

  /* ── Studio State ────────────────────────────────────────────────────── */
  let activePresetId = 'traffic';
  let activeMachine = getPreset('traffic');
  let runtime = createRuntime(activeMachine);
  let customMachine = createBlankMachine('My State Machine');

  let predictMode = false;
  let predictedState = null;
  let predictCorrect = 0;
  let predictAttempts = 0;
  let autoTimer = null;
  let autoRunning = false;
  let seqQueue = [];
  let tapeHistory = [];
  let tapeIndex = -1;
  let activeCodeLang = 'js';
  let activeEdgeKey = null; // { from, to, event }

  let simAnim = null; // { fromId, toId, event, startMs, durationMs }
  let warnFlashUntil = 0;
  let mmMooreAnim = null;
  let mmMealyAnim = null;

  const progress = {
    predictCorrectCount: 0,
    vacuumRouteDone: false,
    vacuumTrace: [],
    vacuumGapFixed: false,
    dfaAcceptedSeen: false,
    dfaRejectedSeen: false,
    customLoopBuilt: false,
    customEdited: false,
  };

  const mmComparison = createMooreMealyComparison();

  /* ── Canvas Setup via SimKit ─────────────────────────────────────────── */
  function createCanvasHelper(canvasEl, onDraw) {
    if (window.SimKit && typeof window.SimKit.canvas2d === 'function') {
      return window.SimKit.canvas2d(canvasEl, {
        onResize: () => onDraw(),
      });
    }
    const ctx = canvasEl.getContext('2d');
    const resize = () => {
      const box = canvasEl.parentElement || canvasEl;
      const w = Math.max(1, box.clientWidth);
      const h = Math.max(1, box.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = Math.floor(w * dpr);
      canvasEl.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      onDraw();
    };
    window.addEventListener('resize', resize);
    resize();
    return {
      ctx,
      get width() {
        return Math.max(1, (canvasEl.parentElement || canvasEl).clientWidth);
      },
      get height() {
        return Math.max(1, (canvasEl.parentElement || canvasEl).clientHeight);
      },
      resize,
    };
  }

  /* ── Graph Drawing Engine ────────────────────────────────────────────── */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex || '#38bdf8').replace('#', '');
    if (clean.length !== 6) return `rgba(56, 189, 248, ${alpha})`;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function drawRoundedPill(ctx, x, y, text, bg, border, textColor, font = '600 10.5px ui-monospace, Menlo, monospace') {
    ctx.save();
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const padX = 7;
    const w = metrics.width + padX * 2;
    const h = 18;
    const rx = x - w / 2;
    const ry = y - h / 2;
    ctx.beginPath();
    ctx.roundRect(rx, ry, w, h, 9);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }

  function drawArrowHead(ctx, x, y, angle, color, size = 8.5) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(angle - 0.38), y - size * Math.sin(angle - 0.38));
    ctx.lineTo(x - size * Math.cos(angle + 0.38), y - size * Math.sin(angle + 0.38));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function computeNodePositions(machine, W, H, compact = false) {
    const states = machine.states || [];
    const narrow = W < 460 || H < 280;
    const nodeR = compact
      ? clamp(Math.min(W, H) * 0.13, 17, 24)
      : narrow
      ? clamp(Math.min(W, H) * 0.095, 16, 25)
      : clamp(Math.min(W, H) * 0.115, 22, 33);
    const padX = nodeR + (compact ? 22 : narrow ? 20 : 34);
    const padTop = nodeR + (compact ? 24 : narrow ? 24 : 34);
    const padBottom = nodeR + (compact ? 20 : narrow ? 22 : 28);
    const usableW = Math.max(40, W - padX * 2);
    const usableH = Math.max(40, H - padTop - padBottom);

    const fallback = computeCircleLayout(states);
    const positions = states.map((s, idx) => {
      const nx = typeof s.x === 'number' ? clamp(s.x, 0.05, 0.95) : fallback[idx].x;
      const ny = typeof s.y === 'number' ? clamp(s.y, 0.05, 0.95) : fallback[idx].y;
      return {
        state: s,
        x: padX + nx * usableW,
        y: padTop + ny * usableH,
        r: nodeR,
      };
    });
    return { positions, nodeR };
  }

  function renderStateGraph(helper, machine, opts = {}) {
    if (!helper) return;
    const { ctx, width: W, height: H } = helper;
    if (W < 10 || H < 10) return;

    const compact = Boolean(opts.compact);
    const currentId = opts.currentState ?? machine.start;
    const predictedId = opts.predictedState ?? null;
    const anim = opts.anim ?? null;
    const highlightTransition = opts.highlightTransition ?? null;
    const warnFlash = Boolean(opts.warnFlash);

    ctx.clearRect(0, 0, W, H);

    // Subtle blueprint grid dots
    ctx.save();
    ctx.fillStyle = 'rgba(148, 210, 189, 0.09)';
    const step = compact ? 24 : 28;
    for (let gx = step; gx < W; gx += step) {
      for (let gy = step; gy < H; gy += step) {
        ctx.fillRect(gx, gy, 1.2, 1.2);
      }
    }
    ctx.restore();

    const { positions, nodeR } = computeNodePositions(machine, W, H, compact);
    const posMap = new Map(positions.map((p) => [p.state.id, p]));
    if (positions.length === 0) return;

    // Graph centroid for outward self-loop orientation
    const cx = positions.reduce((acc, p) => acc + p.x, 0) / positions.length;
    const cy = positions.reduce((acc, p) => acc + p.y, 0) / positions.length;

    const transitions = machine.transitions || [];
    const upwardSelfLoops = new Set();
    // Group edges sharing (from, to) to prevent overlapping labels
    const pairBuckets = new Map();
    for (const tr of transitions) {
      const key = `${tr.from}\u0000${tr.to}`;
      if (!pairBuckets.has(key)) pairBuckets.set(key, []);
      pairBuckets.get(key).push(tr);
    }

    // 1. Draw transitions
    for (const tr of transitions) {
      const fromPos = posMap.get(tr.from);
      const toPos = posMap.get(tr.to);
      if (!fromPos || !toPos) continue;

      const bucket = pairBuckets.get(`${tr.from}\u0000${tr.to}`) || [tr];
      const bucketIdx = bucket.indexOf(tr);
      const isSelf = tr.from === tr.to;
      const hasReverse =
        !isSelf && pairBuckets.has(`${tr.to}\u0000${tr.from}`);

      const isPulsing =
        anim &&
        anim.fromId === tr.from &&
        anim.toId === tr.to &&
        anim.event === tr.event;
      const isHighlighted =
        isPulsing ||
        (highlightTransition &&
          highlightTransition.from === tr.from &&
          highlightTransition.event === tr.event);

      const strokeColor = isHighlighted
        ? '#7dd3fc'
        : tr.from === currentId
        ? 'rgba(134, 239, 172, 0.72)'
        : 'rgba(148, 163, 184, 0.45)';
      const lineWidth = isHighlighted ? 2.8 : tr.from === currentId ? 2 : 1.5;
      const labelText =
        machine.kind === 'mealy' && tr.output
          ? `${tr.event}/${tr.output}`
          : tr.event;

      if (isSelf) {
        let dirX = fromPos.x - cx;
        let dirY = fromPos.y - cy;
        if (Math.hypot(dirX, dirY) < 8) {
          dirX = 0;
          dirY = -1;
        }
        const startHasLeftArrow =
          tr.from === machine.start && fromPos.x > nodeR + 48;
        const baseAngle = startHasLeftArrow
          ? -Math.PI / 2 + bucketIdx * 0.65
          : Math.atan2(dirY, dirX) + bucketIdx * 0.6;
        if (Math.sin(baseAngle) < -0.25) {
          upwardSelfLoops.add(tr.from);
        }
        const loopDist = nodeR + (compact ? 17 : 22) + bucketIdx * 10;
        const loopR = compact ? 13 : 16;
        const lx = fromPos.x + Math.cos(baseAngle) * loopDist;
        const ly = fromPos.y + Math.sin(baseAngle) * loopDist;

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.arc(lx, ly, loopR, baseAngle - 2.35, baseAngle + 2.35);
        ctx.stroke();

        // Arrowhead near node return
        const endAng = baseAngle + 2.35;
        const ax = lx + Math.cos(endAng) * loopR;
        const ay = ly + Math.sin(endAng) * loopR;
        drawArrowHead(ctx, ax, ay, endAng + Math.PI / 2, strokeColor, compact ? 6.5 : 7.5);
        ctx.restore();

        const labelX = clamp(
          fromPos.x + Math.cos(baseAngle) * (loopDist + loopR + 10),
          32,
          W - 32
        );
        const labelY = clamp(
          fromPos.y + Math.sin(baseAngle) * (loopDist + loopR + 10),
          14,
          H - 14
        );
        drawRoundedPill(
          ctx,
          labelX,
          labelY,
          labelText,
          isHighlighted ? '#0e4a66' : 'rgba(11, 17, 25, 0.92)',
          isHighlighted ? '#7dd3fc' : 'rgba(148, 210, 189, 0.35)',
          isHighlighted ? '#ffffff' : '#e2e8f0',
          compact ? '600 9.5px ui-monospace, monospace' : '600 10.5px ui-monospace, monospace'
        );
      } else {
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / dist;
        const uy = dy / dist;
        // Normal points consistently to the left of directed edge from->to
        const nx = -uy;
        const ny = ux;

        let curveMag = 0;
        if (hasReverse) {
          curveMag = (compact ? 26 : 34) + bucketIdx * (compact ? 28 : 48);
        } else if (bucket.length > 1) {
          curveMag = (bucketIdx - (bucket.length - 1) / 2) * (compact ? 38 : 68);
        }

        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        const cpx = midX + nx * curveMag;
        const cpy = midY + ny * curveMag;

        // Tangents at endpoints for clean perimeter docking
        const startAng = Math.atan2(cpy - fromPos.y, cpx - fromPos.x);
        const endAng = Math.atan2(toPos.y - cpy, toPos.x - cpx);
        const sx = fromPos.x + Math.cos(startAng) * (nodeR + 3);
        const sy = fromPos.y + Math.sin(startAng) * (nodeR + 3);
        const ex = toPos.x - Math.cos(endAng) * (nodeR + 5);
        const ey = toPos.y - Math.sin(endAng) * (nodeR + 5);

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cpx, cpy, ex, ey);
        ctx.stroke();
        ctx.restore();

        drawArrowHead(ctx, ex, ey, endAng, strokeColor, compact ? 7 : 8.5);

        // Stagger label along Bezier when multiple parallel edges share (from, to)
        const lt = bucket.length > 1 ? 0.43 + (bucketIdx % 2) * 0.14 : 0.5;
        const lmt = 1 - lt;
        const lx = clamp(lmt * lmt * sx + 2 * lmt * lt * cpx + lt * lt * ex, 34, W - 34);
        const ly = clamp(lmt * lmt * sy + 2 * lmt * lt * cpy + lt * lt * ey, 14, H - 14);
        drawRoundedPill(
          ctx,
          lx,
          ly,
          labelText,
          isHighlighted ? '#0e4a66' : 'rgba(11, 17, 25, 0.92)',
          isHighlighted ? '#7dd3fc' : 'rgba(148, 210, 189, 0.35)',
          isHighlighted ? '#ffffff' : '#e2e8f0',
          compact ? '600 9.5px ui-monospace, monospace' : '600 10.5px ui-monospace, monospace'
        );

        // Traveling pulse orb along active Bezier
        if (isPulsing && anim) {
          const t = clamp(anim.progress, 0, 1);
          const mt = 1 - t;
          const px = mt * mt * sx + 2 * mt * t * cpx + t * t * ex;
          const py = mt * mt * sy + 2 * mt * t * cpy + t * t * ey;
          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, compact ? 4.5 : 6, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#7dd3fc';
          ctx.shadowBlur = 14;
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // 2. Start entry indicator arrow
    const startPos = posMap.get(machine.start);
    if (startPos) {
      const fromLeft = startPos.x > nodeR + 48;
      const sx = fromLeft ? startPos.x - nodeR - 32 : startPos.x - nodeR * 0.7;
      const sy = fromLeft ? startPos.y : Math.max(12, startPos.y - nodeR - 26);
      const ang = Math.atan2(startPos.y - sy, startPos.x - sx);
      const ex = startPos.x - Math.cos(ang) * (nodeR + 4);
      const ey = startPos.y - Math.sin(ang) * (nodeR + 4);
      ctx.save();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      drawArrowHead(ctx, ex, ey, ang, '#4ade80', 7.5);
      ctx.fillStyle = '#86efac';
      ctx.font = compact ? '700 9px system-ui, sans-serif' : '700 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('START', sx + (fromLeft ? 8 : 0), sy - 6);
      ctx.restore();
    }

    // 3. Draw state nodes
    for (const pos of positions) {
      const { state, x, y, r } = pos;
      const isActive = state.id === currentId;
      const isPred = predictedId === state.id;
      const color = state.color || '#38bdf8';

      // Warn flash ring on unhandled event
      if (isActive && warnFlash) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r + 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.restore();
      }

      // Prediction highlight ring
      if (isPred) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.restore();
        drawRoundedPill(
          ctx,
          x,
          Math.max(12, y - r - 15),
          'PREDICTED',
          '#78350f',
          '#fbbf24',
          '#fef3c7',
          '700 9px system-ui, sans-serif'
        );
      }

      // Accepting double ring
      if (state.accepting) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r + 4.5, 0, Math.PI * 2);
        ctx.strokeStyle = isActive ? '#bbf7d0' : color;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      }

      // Main circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (isActive) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = compact ? 12 : 18;
      } else {
        ctx.fillStyle = hexToRgba(color, 0.16);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isActive ? '#ffffff' : color;
      ctx.lineWidth = isActive ? 2.6 : 1.7;
      ctx.stroke();
      ctx.restore();

      // State label
      ctx.save();
      ctx.fillStyle = isActive ? '#061018' : '#f1f5f9';
      if (isActive && (color === '#6366f1' || color === '#8b5cf6' || color === '#a855f7' || color === '#ef4444')) {
        ctx.fillStyle = '#ffffff';
      }
      const fontSize = compact ? 10 : Math.min(12, Math.max(9.5, r * 0.36));
      ctx.font = `${isActive ? '800' : '700'} ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = state.label || state.id;
      if (label.length > 9) {
        const mid = Math.ceil(label.length / 2);
        ctx.fillText(label.slice(0, mid), x, y - 5);
        ctx.fillText(label.slice(mid), x, y + 6);
      } else {
        ctx.fillText(label, x, y);
      }
      ctx.restore();

      // Moore output badge placed outward from graph centroid (desktop/wide stage)
      if (!compact && W >= 440 && state.output && machine.kind !== 'mealy') {
        const placeAbove = y < cy - 8 && !upwardSelfLoops.has(state.id) && !isPred;
        const outY = placeAbove
          ? Math.max(14, y - r - 13)
          : Math.min(H - 12, y + r + 13);
        drawRoundedPill(
          ctx,
          x,
          outY,
          state.output,
          isActive ? 'rgba(14, 74, 102, 0.92)' : 'rgba(15, 23, 42, 0.84)',
          isActive ? '#7dd3fc' : 'rgba(148, 210, 189, 0.22)',
          isActive ? '#ffffff' : '#9fb7c7',
          '600 9.5px ui-monospace, monospace'
        );
      }
    }
  }

  /* ── Canvas Helpers Init ─────────────────────────────────────────────── */
  let simCanvasHelper = null;
  let builderCanvasHelper = null;
  let mooreCanvasHelper = null;
  let mealyCanvasHelper = null;

  simCanvasHelper = createCanvasHelper(simCanvas, drawSim);
  builderCanvasHelper = createCanvasHelper(builderCanvas, drawBuilder);
  mooreCanvasHelper = createCanvasHelper(mmMooreCanvas, drawMooreMealy);
  mealyCanvasHelper = createCanvasHelper(mmMealyCanvas, drawMooreMealy);

  function drawSim() {
    const now = performance.now();
    renderStateGraph(simCanvasHelper, activeMachine, {
      currentState: runtime.getState(),
      predictedState: predictMode ? predictedState : null,
      anim: simAnim,
      highlightTransition: activeEdgeKey,
      warnFlash: now < warnFlashUntil,
    });
  }

  function drawBuilder() {
    renderStateGraph(builderCanvasHelper, customMachine, {
      currentState: customMachine.start,
      compact: false,
    });
  }

  function drawMooreMealy() {
    renderStateGraph(mooreCanvasHelper, MOORE_10_MACHINE, {
      currentState: mmComparison.getMooreState(),
      anim: mmMooreAnim,
      compact: true,
    });
    renderStateGraph(mealyCanvasHelper, MEALY_10_MACHINE, {
      currentState: mmComparison.getMealyState(),
      anim: mmMealyAnim,
      compact: true,
    });
  }

  /* ── Animation Loop via SimKit.loop ──────────────────────────────────── */
  let animLoop = null;
  function ensureAnimLoop() {
    if (prefersReducedMotion()) return;
    if (animLoop) {
      animLoop.resume();
      return;
    }
    if (window.SimKit && typeof window.SimKit.loop === 'function') {
      animLoop = window.SimKit.loop(
        () => {
          const now = performance.now();
          let active = false;
          if (simAnim) {
            simAnim.progress = (now - simAnim.startMs) / simAnim.durationMs;
            if (simAnim.progress >= 1) simAnim = null;
            else active = true;
            drawSim();
          }
          if (now < warnFlashUntil) {
            active = true;
            drawSim();
          }
          if (mmMooreAnim) {
            mmMooreAnim.progress = (now - mmMooreAnim.startMs) / mmMooreAnim.durationMs;
            if (mmMooreAnim.progress >= 1) mmMooreAnim = null;
            else active = true;
            drawMooreMealy();
          }
          if (mmMealyAnim) {
            mmMealyAnim.progress = (now - mmMealyAnim.startMs) / mmMealyAnim.durationMs;
            if (mmMealyAnim.progress >= 1) mmMealyAnim = null;
            else active = true;
            drawMooreMealy();
          }
          if (!active && animLoop) animLoop.pause();
        },
        { el: studioRoot }
      );
      animLoop.pause();
    }
  }
  ensureAnimLoop();

  function triggerSimPulse(fromId, toId, event) {
    if (prefersReducedMotion()) {
      simAnim = null;
      drawSim();
      return;
    }
    simAnim = { fromId, toId, event, startMs: performance.now(), durationMs: 380 };
    ensureAnimLoop();
  }

  /* ── Synchronized Mini-World Visualizer ──────────────────────────────── */
  function renderWorldViz() {
    const stateId = runtime.getState();
    const stateObj = runtime.getStateObj(stateId);
    const id = activeMachine.id;

    if (id === 'traffic') {
      worldVizEl.innerHTML = `
        <div class="sm-world-badge">
          <div class="sm-signal-housing" aria-hidden="true">
            <span class="sm-lamp sm-lamp--red${stateId === 'RED' ? ' is-lit' : ''}"></span>
            <span class="sm-lamp sm-lamp--yellow${stateId === 'YELLOW' ? ' is-lit' : ''}"></span>
            <span class="sm-lamp sm-lamp--green${stateId === 'GREEN' ? ' is-lit' : ''}"></span>
          </div>
        </div>
        <div class="sm-world-copy">
          <strong>Signal Output: ${escapeHtml(stateObj?.output || stateId)}</strong>
          <span>${stateId === 'RED' ? 'Crosswalk clear · Cars stopped.' : stateId === 'GREEN' ? 'Main lane moving · Watch for timer.' : 'Prepare to stop at intersection.'}</span>
        </div>`;
      return;
    }

    if (id === 'vacuum') {
      const icons = { Clean: '🧹', Avoid: '↩️', Dock: '🔋', Charge: '⚡' };
      const notes = {
        Clean: 'Brushes spinning · Sweeping open floor.',
        Avoid: 'Front bumper tripped · Reversing & turning.',
        Dock: 'Homing on IR beacon · Note: what if an obstacle blocks the path?',
        Charge: 'Docked safely · Recharging battery to 100%.',
      };
      worldVizEl.innerHTML = `
        <div class="sm-world-badge" style="font-size:1.35rem;" aria-hidden="true">${icons[stateId] || '🤖'}</div>
        <div class="sm-world-copy">
          <strong>Robot Mode: ${escapeHtml(stateId)} (${escapeHtml(stateObj?.output || '')})</strong>
          <span>${escapeHtml(notes[stateId] || 'Following active transition rule.')}</span>
        </div>`;
      return;
    }

    if (id === 'vending') {
      const icons = { Idle: '💤', HasMoney: '🪙', Dispensing: '📦' };
      worldVizEl.innerHTML = `
        <div class="sm-world-badge" style="font-size:1.35rem;" aria-hidden="true">${icons[stateId] || '🥤'}</div>
        <div class="sm-world-copy">
          <strong>Dispenser Display: ${escapeHtml(stateObj?.output || stateId)}</strong>
          <span>${stateId === 'Idle' ? 'Waiting for $1 coin.' : stateId === 'HasMoney' ? 'Credit loaded · Select item or refund.' : 'Chute unlocked · Collect item to reset.'}</span>
        </div>`;
      return;
    }

    if (id === 'lock') {
      const dots =
        stateId === 'Digit1' ? '● ○ ○' :
        stateId === 'Digit2' ? '● ● ○' :
        stateId === 'Unlocked' ? '● ● ●' :
        stateId === 'Error' ? '✕ ✕ ✕' : '○ ○ ○';
      worldVizEl.innerHTML = `
        <div class="sm-world-badge" style="font-family:ui-monospace,monospace;font-size:0.9rem;color:#7dd3fc;">${dots}</div>
        <div class="sm-world-copy">
          <strong>Keypad Status: ${escapeHtml(stateId)}</strong>
          <span>${escapeHtml(stateObj?.output || '')}</span>
        </div>`;
      return;
    }

    if (id === 'binary-dfa') {
      const cells = tapeHistory.length
        ? tapeHistory
            .map(
              (bit, i) =>
                `<span class="sm-tape-cell${i === tapeIndex ? ' is-head' : ''}">${escapeHtml(bit)}</span>`
            )
            .join('')
        : '<span class="sm-tape-cell is-head">ε</span>';
      const accepted = runtime.isAccepting();
      worldVizEl.innerHTML = `
        <div class="sm-world-badge">
          <div class="sm-tape-cells" aria-label="Binary tape">${cells}</div>
        </div>
        <div class="sm-world-copy">
          <strong>Tape Verdict: ${accepted ? 'ACCEPT (Even 0s)' : 'REJECT (Odd 0s)'}</strong>
          <span>Empty string ε has zero 0s (even), so start state Even0 accepts.</span>
        </div>`;
      return;
    }

    worldVizEl.innerHTML = `
      <div class="sm-world-badge" style="font-size:1.25rem;" aria-hidden="true">${runtime.isAccepting() ? '★' : '⚙'}</div>
      <div class="sm-world-copy">
        <strong>${escapeHtml(activeMachine.title)} · ${escapeHtml(stateId)}</strong>
        <span>${escapeHtml(stateObj?.output || activeMachine.subtitle || 'Active state')}</span>
      </div>`;
  }

  function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  /* ── Simulator UI Updates ────────────────────────────────────────────── */
  function updateTelemetry(lastEventLabel = '—') {
    const stateId = runtime.getState();
    const stateObj = runtime.getStateObj(stateId);
    statStateEl.textContent = stateId || '—';
    statOutputEl.textContent = stateObj?.output || (runtime.isAccepting() ? 'ACCEPT' : '—');
    statEventEl.textContent = lastEventLabel;
    if (predictMode) {
      statExtraLabelEl.textContent = 'Predict';
      statStepsEl.textContent = `${predictCorrect}/${predictAttempts}`;
    } else {
      statExtraLabelEl.textContent = 'Steps';
      statStepsEl.textContent = String(runtime.getStepCount());
    }

    if (predictMode) {
      hudLeft.textContent = predictedState
        ? `Predicted: ${predictedState} · Now fire an event`
        : 'Predict Mode: click a target node on the graph';
      hudLeft.className = 'sm-hud-pill is-predict';
    } else if (activeMachine.kind === 'dfa') {
      hudLeft.textContent = runtime.isAccepting() ? 'ACCEPTING STATE ★' : 'NON-ACCEPTING STATE';
      hudLeft.className = `sm-hud-pill ${runtime.isAccepting() ? 'is-ok' : 'is-warn'}`;
    } else {
      hudLeft.textContent = `Start: ${activeMachine.start} · ${activeMachine.states.length} states`;
      hudLeft.className = 'sm-hud-pill';
    }
    hudRight.textContent = activeMachine.title;
  }

  function renderEventButtons() {
    const current = runtime.getState();
    const events = activeMachine.events || [];
    eventBtnsEl.innerHTML = '';

    events.forEach((ev, idx) => {
      const tr = runtime.getTransition(current, ev.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `sm-evt-btn${tr ? '' : ' is-unhandled'}`;
      btn.dataset.eventId = ev.id;
      const keyNum = idx < 9 ? `<span class="sm-evt-key">${idx + 1}</span>` : '';
      const targetTag = tr
        ? `<span class="sm-evt-target">→ ${escapeHtml(tr.to)}</span>`
        : '<span class="sm-evt-target" style="color:#fbbf24;">(no rule)</span>';
      btn.innerHTML = `${keyNum}<span>${escapeHtml(ev.icon ? ev.icon + ' ' : '')}${escapeHtml(ev.label || ev.id)}</span>${targetTag}`;
      btn.addEventListener('click', () => fireEvent(ev.id));
      eventBtnsEl.appendChild(btn);
    });
  }

  function renderMatrix() {
    const states = activeMachine.states || [];
    const events = activeMachine.events || [];
    const current = runtime.getState();
    if (!states.length || !events.length) {
      matrixWrapEl.innerHTML = '<p style="font-size:0.75rem;color:#9fb7c7;">Add events and transitions to view matrix.</p>';
      return;
    }

    const headCols = events
      .map((e) => `<th scope="col">${escapeHtml(e.id)}</th>`)
      .join('');
    const rows = states
      .map((s) => {
        const isCurrent = s.id === current;
        const cells = events
          .map((e) => {
            const tr = (activeMachine.transitions || []).find(
              (t) => t.from === s.id && t.event === e.id
            );
            const activeCell =
              activeEdgeKey &&
              activeEdgeKey.from === s.id &&
              activeEdgeKey.event === e.id;
            if (!tr) {
              return `<td class="sm-matrix-empty${activeCell ? ' is-active-cell' : ''}">—</td>`;
            }
            if (isCurrent) {
              return `<td class="${activeCell ? 'is-active-cell' : ''}"><button type="button" class="sm-matrix-cell-btn" data-matrix-fire="${escapeHtml(e.id)}" title="Click to fire ${escapeHtml(e.id)}">${escapeHtml(tr.to)}</button></td>`;
            }
            return `<td class="${activeCell ? 'is-active-cell' : ''}">${escapeHtml(tr.to)}</td>`;
          })
          .join('');
        return `<tr class="${isCurrent ? 'is-active-row' : ''}"><th scope="row">${s.id === activeMachine.start ? '→ ' : ''}${escapeHtml(s.id)}${s.accepting ? ' ★' : ''}</th>${cells}</tr>`;
      })
      .join('');

    matrixWrapEl.innerHTML = `<table class="sm-matrix" aria-label="State transition table"><thead><tr><th scope="col">State \\ Event</th>${headCols}</tr></thead><tbody>${rows}</tbody></table>`;
    matrixWrapEl.querySelectorAll('[data-matrix-fire]').forEach((btn) => {
      btn.addEventListener('click', () => fireEvent(btn.dataset.matrixFire));
    });
  }

  function renderCodeExport() {
    codeOutEl.textContent = generateCode(activeMachine, activeCodeLang);
    codeLangBtns.forEach((btn) => {
      const match = btn.dataset.smLang === activeCodeLang;
      btn.classList.toggle('is-active', match);
      btn.setAttribute('aria-pressed', String(match));
    });
  }

  function appendLog(res, extraNote = '') {
    if (logListEl.dataset.empty === 'true') {
      logListEl.innerHTML = '';
      logListEl.dataset.empty = 'false';
    }
    const item = document.createElement('div');
    item.className = `sm-log-item${res.transitioned ? '' : ' is-warn'}`;
    const outDetail = res.mealyOutput || res.mooreOutput;
    item.innerHTML = `<strong>#${runtime.getStepCount()}</strong> ${escapeHtml(res.message)}${outDetail ? `<small>Output: ${escapeHtml(outDetail)}${extraNote ? ' · ' + escapeHtml(extraNote) : ''}</small>` : extraNote ? `<small>${escapeHtml(extraNote)}</small>` : ''}`;
    logListEl.appendChild(item);
    while (logListEl.children.length > 60) {
      logListEl.removeChild(logListEl.firstElementChild);
    }
    logListEl.scrollTop = logListEl.scrollHeight;
  }

  function trackProgressAfterStep(res) {
    if (activeMachine.id === 'vacuum' && res.transitioned) {
      progress.vacuumTrace.push(res.to);
      // Verify Clean -> Avoid -> Dock -> Charge order appears in trace
      const t = progress.vacuumTrace;
      const iAvoid = t.indexOf('Avoid');
      const iDock = iAvoid >= 0 ? t.indexOf('Dock', iAvoid) : -1;
      const iCharge = iDock >= 0 ? t.indexOf('Charge', iDock) : -1;
      if (iAvoid >= 0 && iDock > iAvoid && iCharge > iDock) {
        progress.vacuumRouteDone = true;
      }
    }
    if (activeMachine.id === 'binary-dfa' && runtime.getStepCount() > 0) {
      if (runtime.isAccepting()) progress.dfaAcceptedSeen = true;
      else progress.dfaRejectedSeen = true;
    }
    refreshChallengesUI();
  }

  function fireEvent(eventId) {
    const res = runtime.step(eventId);
    let predictNote = '';

    if (predictMode) {
      if (!predictedState) {
        predictNote = 'Tip: click a state node first to lock a prediction.';
      } else {
        predictAttempts += 1;
        if (predictedState === res.to) {
          predictCorrect += 1;
          progress.predictCorrectCount = predictCorrect;
          predictNote = `Prediction ✓ (${predictedState})`;
        } else {
          predictNote = `Predicted ${predictedState}, got ${res.to}`;
        }
        predictedState = null;
      }
    }

    if (activeMachine.id === 'binary-dfa' && (eventId === '0' || eventId === '1')) {
      tapeHistory.push(eventId);
      tapeIndex = tapeHistory.length - 1;
    }

    if (res.transitioned) {
      activeEdgeKey = { from: res.from, to: res.to, event: eventId };
      triggerSimPulse(res.from, res.to, eventId);
    } else {
      activeEdgeKey = null;
      warnFlashUntil = performance.now() + 550;
      ensureAnimLoop();
    }

    appendLog(res, predictNote);
    updateTelemetry(res.transitioned ? eventId : `${eventId} (no rule)`);
    renderWorldViz();
    renderEventButtons();
    renderMatrix();
    trackProgressAfterStep(res);
    drawSim();
  }

  function stopAuto() {
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
    autoRunning = false;
    autoToggleBtn.classList.remove('is-active');
    autoToggleBtn.setAttribute('aria-pressed', 'false');
    autoToggleBtn.textContent = 'Auto: Off';
  }

  function startAuto() {
    stopAuto();
    const autoEvt = activeMachine.autoEvent || activeMachine.events?.[0]?.id;
    if (!autoEvt) return;
    autoRunning = true;
    autoToggleBtn.classList.add('is-active');
    autoToggleBtn.setAttribute('aria-pressed', 'true');
    autoToggleBtn.textContent = 'Auto: On';

    const tick = () => {
      if (!autoRunning) return;
      if (!document.hidden && !modePanels[0].hidden) {
        fireEvent(autoEvt);
      }
      autoTimer = setTimeout(tick, activeMachine.autoDelayMs || 1600);
    };
    autoTimer = setTimeout(tick, activeMachine.autoDelayMs || 1600);
  }

  function loadMachineIntoSimulator(machineDef, presetId = 'custom') {
    stopAuto();
    activePresetId = presetId;
    activeMachine = cloneMachine(machineDef);
    runtime = createRuntime(activeMachine);
    seqQueue = [];
    tapeHistory = [];
    tapeIndex = -1;
    activeEdgeKey = null;
    predictedState = null;
    simAnim = null;

    if (presetId !== 'custom' && presetSelect.value !== presetId) {
      presetSelect.value = presetId;
    }
    if (presetId === 'vacuum') {
      progress.vacuumTrace = [runtime.getState()];
    }

    logListEl.innerHTML = '<div class="sm-log-item">Ready — trigger an event button, press 1–9 on the graph, or click a neighbor node.</div>';
    logListEl.dataset.empty = 'true';

    // Update quick sequence button
    if (activeMachine.quickSequence) {
      seqPresetBtn.hidden = false;
      seqPresetBtn.textContent = activeMachine.quickSequence.label;
      seqInput.placeholder = activeMachine.id === 'binary-dfa' ? 'e.g. 1010 or 101' : 'e.g. ' + activeMachine.quickSequence.events.join(', ');
    } else {
      seqPresetBtn.hidden = true;
      seqInput.placeholder = 'Comma-separated events…';
    }

    // Auto button visibility/availability
    const canAuto = Boolean(activeMachine.auto || activeMachine.events?.some((e) => e.id === 'timer'));
    autoToggleBtn.disabled = !canAuto;
    autoToggleBtn.style.opacity = canAuto ? '1' : '0.45';

    updateTelemetry('—');
    renderWorldViz();
    renderEventButtons();
    renderMatrix();
    renderCodeExport();
    drawSim();

    if (activeMachine.auto && !prefersReducedMotion()) {
      startAuto();
    }
  }

  /* ── Populate Preset Dropdown ────────────────────────────────────────── */
  function initPresetDropdown() {
    presetSelect.innerHTML = '';
    PRESET_ORDER.forEach((id) => {
      const p = PRESETS[id];
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${p.title} (${p.states.length} states)`;
      presetSelect.appendChild(opt);
    });
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = 'Custom (from Builder)';
    presetSelect.appendChild(customOpt);
  }
  initPresetDropdown();

  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (val === 'custom') {
      loadMachineIntoSimulator(customMachine, 'custom');
    } else {
      loadMachineIntoSimulator(getPreset(val), val);
    }
  });

  predictToggleBtn.addEventListener('click', () => {
    predictMode = !predictMode;
    predictedState = null;
    predictToggleBtn.classList.toggle('is-active', predictMode);
    predictToggleBtn.setAttribute('aria-pressed', String(predictMode));
    if (predictMode && autoRunning) stopAuto();
    updateTelemetry(statEventEl.textContent);
    drawSim();
  });

  autoToggleBtn.addEventListener('click', () => {
    if (autoRunning) stopAuto();
    else startAuto();
  });

  layoutBtn.addEventListener('click', () => {
    activeMachine.states = computeCircleLayout(activeMachine.states);
    drawSim();
  });

  resetBtn.addEventListener('click', () => {
    loadMachineIntoSimulator(
      activePresetId === 'custom' ? customMachine : getPreset(activePresetId),
      activePresetId
    );
  });

  clearLogBtn.addEventListener('click', () => {
    logListEl.innerHTML = '<div class="sm-log-item">Log cleared. Current state: ' + escapeHtml(runtime.getState()) + '</div>';
    logListEl.dataset.empty = 'true';
  });

  /* ── Sequence / Tape Runner ──────────────────────────────────────────── */
  seqStepBtn.addEventListener('click', () => {
    if (seqQueue.length === 0) {
      seqQueue = parseEventSequence(activeMachine, seqInput.value);
    }
    if (seqQueue.length === 0) return;
    const nextEvt = seqQueue.shift();
    fireEvent(nextEvt);
  });

  seqRunBtn.addEventListener('click', () => {
    const events = parseEventSequence(activeMachine, seqInput.value);
    if (events.length === 0) return;
    if (autoRunning) stopAuto();
    if (activeMachine.id === 'binary-dfa') {
      runtime.reset();
      tapeHistory = [];
      tapeIndex = -1;
    }
    events.forEach((evt) => fireEvent(evt));
    seqQueue = [];
  });

  seqPresetBtn.addEventListener('click', () => {
    if (!activeMachine.quickSequence) return;
    const evts = activeMachine.quickSequence.events;
    seqInput.value = activeMachine.id === 'binary-dfa' ? evts.join('') : evts.join(', ');
    seqRunBtn.click();
  });

  /* ── Inspector Subtabs & Code Export ─────────────────────────────────── */
  inspTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.smInspTab;
      inspTabs.forEach((t) => {
        const active = t.dataset.smInspTab === target;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      inspPanels.forEach((p) => {
        p.hidden = p.dataset.smInspPanel !== target;
      });
    });
  });

  codeLangBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCodeLang = btn.dataset.smLang;
      renderCodeExport();
    });
  });

  codeCopyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codeOutEl.textContent || '');
      codeCopyBtn.textContent = 'Copied ✓';
      setTimeout(() => {
        codeCopyBtn.textContent = 'Copy';
      }, 1400);
    } catch {
      codeCopyBtn.textContent = 'Select text';
    }
  });

  /* ── Canvas Pointer Drag + Click-to-Predict / Click-to-Step ──────────── */
  function attachCanvasPointer(canvasEl, getMachineRef, onRedraw, onClickNode) {
    let drag = null;

    function toCanvasCoords(ev) {
      const rect = canvasEl.getBoundingClientRect();
      return {
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
        W: Math.max(1, rect.width),
        H: Math.max(1, rect.height),
      };
    }

    canvasEl.addEventListener('pointerdown', (ev) => {
      const { x, y, W, H } = toCanvasCoords(ev);
      const machine = getMachineRef();
      const { positions } = computeNodePositions(machine, W, H, false);
      const hit = positions.find((p) => Math.hypot(p.x - x, p.y - y) <= p.r + 5);
      if (!hit) return;
      canvasEl.setPointerCapture(ev.pointerId);
      drag = {
        nodeId: hit.state.id,
        startX: x,
        startY: y,
        moved: false,
      };
    });

    canvasEl.addEventListener('pointermove', (ev) => {
      const { x, y, W, H } = toCanvasCoords(ev);
      const machine = getMachineRef();
      if (drag) {
        if (Math.hypot(x - drag.startX, y - drag.startY) > 4) {
          drag.moved = true;
        }
        if (drag.moved) {
          const padX = 56;
          const padTop = 56;
          const padBottom = 50;
          const nx = clamp((x - padX) / Math.max(40, W - padX * 2), 0.06, 0.94);
          const ny = clamp((y - padTop) / Math.max(40, H - padTop - padBottom), 0.06, 0.94);
          const target = machine.states.find((s) => s.id === drag.nodeId);
          if (target) {
            target.x = Number(nx.toFixed(3));
            target.y = Number(ny.toFixed(3));
            onRedraw();
          }
        }
        return;
      }
      const { positions } = computeNodePositions(machine, W, H, false);
      const hover = positions.some((p) => Math.hypot(p.x - x, p.y - y) <= p.r + 5);
      canvasEl.style.cursor = hover ? 'pointer' : 'default';
    });

    const endDrag = (ev) => {
      if (!drag) return;
      const wasClick = !drag.moved;
      const nodeId = drag.nodeId;
      drag = null;
      if (canvasEl.hasPointerCapture(ev.pointerId)) {
        canvasEl.releasePointerCapture(ev.pointerId);
      }
      if (wasClick && onClickNode) onClickNode(nodeId);
    };

    canvasEl.addEventListener('pointerup', endDrag);
    canvasEl.addEventListener('pointercancel', () => {
      drag = null;
    });
  }

  attachCanvasPointer(
    simCanvas,
    () => activeMachine,
    drawSim,
    (nodeId) => {
      if (predictMode) {
        predictedState = nodeId;
        updateTelemetry(statEventEl.textContent);
        drawSim();
        return;
      }
      const current = runtime.getState();
      const matchingTr = (activeMachine.transitions || []).find(
        (t) => t.from === current && t.to === nodeId
      );
      if (matchingTr) {
        fireEvent(matchingTr.event);
      }
    }
  );

  attachCanvasPointer(
    builderCanvas,
    () => customMachine,
    drawBuilder,
    null
  );

  /* ── Keyboard Shortcuts on #sm-canvas ────────────────────────────────── */
  simCanvas.addEventListener('keydown', (e) => {
    const num = parseInt(e.key, 10);
    const events = activeMachine.events || [];
    if (!Number.isNaN(num) && num >= 1 && num <= events.length) {
      e.preventDefault();
      fireEvent(events[num - 1].id);
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      resetBtn.click();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      predictToggleBtn.click();
    } else if (e.key === ' ') {
      if (!autoToggleBtn.disabled) {
        e.preventDefault();
        autoToggleBtn.click();
      }
    }
  });

  /* ── Tab 2: Build & Debug Studio ─────────────────────────────────────── */
  function refreshBuilderUI() {
    builderTitleEl.textContent = customMachine.title || 'Custom Machine';
    const analysis = analyzeMachine(customMachine);
    const validation = validateMachine(customMachine);

    anStatesEl.textContent = `${analysis.stateCount} / ${analysis.transitionCount}`;
    anUnreachEl.textContent = String(analysis.unreachable.length);
    anDeadEl.textContent = String(analysis.deadEnds.length);
    anCompleteEl.textContent = `${analysis.completeness}%`;

    const notes = [];
    if (!validation.valid) {
      notes.push(`Error: ${validation.errors[0]}`);
    }
    if (analysis.unreachable.length > 0) {
      notes.push(`Unreachable: ${analysis.unreachable.join(', ')}`);
    }
    if (analysis.deadEnds.length > 0) {
      notes.push(`Dead-ends (no exit): ${analysis.deadEnds.join(', ')}`);
    }
    const dockMissing = analysis.missingPairs.find(
      (p) => p.state === 'Dock' && p.event === 'obstacle'
    );
    if (dockMissing) {
      notes.push('Edge-case notice: Dock + obstacle has no rule yet.');
    }

    if (notes.length > 0) {
      anMsgEl.className = 'sm-analyzer-msg is-warn';
      anMsgEl.textContent = notes.join(' · ');
    } else {
      anMsgEl.className = 'sm-analyzer-msg is-ok';
      anMsgEl.textContent = `Healthy graph! All ${analysis.stateCount} states reachable, 0 dead-ends, ${analysis.hasCycle ? 'cycle active' : 'acyclic'}.`;
    }

    // Update From / To dropdowns
    const stateOpts = customMachine.states
      .map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.id)}</option>`)
      .join('');
    const prevFrom = trFromSelect.value;
    const prevTo = trToSelect.value;
    trFromSelect.innerHTML = stateOpts;
    trToSelect.innerHTML = stateOpts;
    if (customMachine.states.some((s) => s.id === prevFrom)) trFromSelect.value = prevFrom;
    if (customMachine.states.some((s) => s.id === prevTo)) trToSelect.value = prevTo;
    else if (customMachine.states.length > 1) trToSelect.selectedIndex = 1;

    // Render state chips
    stateChipList.innerHTML = '';
    customMachine.states.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'sm-chip-row';
      const isStart = customMachine.start === s.id;
      row.innerHTML = `
        <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${escapeHtml(s.color)};margin-right:6px;"></span><strong>${escapeHtml(s.id)}</strong>${s.output ? ` · <span style="color:#9fb7c7;">${escapeHtml(s.output)}</span>` : ''}</span>
        <div class="sm-chip-actions">
          <button type="button" class="sm-mini-btn${isStart ? ' is-active' : ''}" data-state-start="${escapeHtml(s.id)}">${isStart ? 'Start ✓' : 'Set Start'}</button>
          <button type="button" class="sm-mini-btn${s.accepting ? ' is-active' : ''}" data-state-acc="${escapeHtml(s.id)}">${s.accepting ? 'Accept ★' : 'Accept?'}</button>
          <button type="button" class="sm-mini-btn" data-state-del="${escapeHtml(s.id)}" aria-label="Delete state ${escapeHtml(s.id)}">✕</button>
        </div>`;
      stateChipList.appendChild(row);
    });

    stateChipList.querySelectorAll('[data-state-start]').forEach((btn) => {
      btn.addEventListener('click', () => {
        customMachine = setStartState(customMachine, btn.dataset.stateStart);
        progress.customEdited = true;
        refreshBuilderUI();
      });
    });
    stateChipList.querySelectorAll('[data-state-acc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        customMachine = toggleAccepting(customMachine, btn.dataset.stateAcc);
        progress.customEdited = true;
        refreshBuilderUI();
      });
    });
    stateChipList.querySelectorAll('[data-state-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        try {
          customMachine = removeState(customMachine, btn.dataset.stateDel);
          progress.customEdited = true;
          builderStatusEl.textContent = '';
          refreshBuilderUI();
        } catch (err) {
          builderStatusEl.textContent = err.message;
        }
      });
    });

    // Render transition chips
    transChipList.innerHTML = '';
    customMachine.transitions.forEach((tr) => {
      const row = document.createElement('div');
      row.className = 'sm-chip-row';
      row.innerHTML = `
        <span><code>${escapeHtml(tr.from)}</code> —[<strong>${escapeHtml(tr.event)}</strong>]→ <code>${escapeHtml(tr.to)}</code>${tr.output ? ` <span style="color:#9fb7c7;">(${escapeHtml(tr.output)})</span>` : ''}</span>
        <button type="button" class="sm-mini-btn" data-tr-from="${escapeHtml(tr.from)}" data-tr-evt="${escapeHtml(tr.event)}" aria-label="Remove transition ${escapeHtml(tr.from)} on ${escapeHtml(tr.event)}">✕</button>`;
      transChipList.appendChild(row);
    });
    transChipList.querySelectorAll('[data-tr-from]').forEach((btn) => {
      btn.addEventListener('click', () => {
        customMachine = removeTransition(
          customMachine,
          btn.dataset.trFrom,
          btn.dataset.trEvt
        );
        progress.customEdited = true;
        refreshBuilderUI();
      });
    });

    if (
      progress.customEdited &&
      analysis.stateCount >= 3 &&
      analysis.unreachable.length === 0 &&
      analysis.deadEnds.length === 0 &&
      analysis.hasCycle
    ) {
      progress.customLoopBuilt = true;
    }
    if (
      customMachine.states.some((s) => s.id === 'Dock') &&
      customMachine.transitions.some((t) => t.from === 'Dock' && t.event === 'obstacle')
    ) {
      progress.vacuumGapFixed = true;
    }

    refreshChallengesUI();
    drawBuilder();
  }

  addStateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      customMachine = addState(customMachine, {
        id: newStateName.value,
        output: newStateOutput.value,
        color: newStateColor.value || STATE_PALETTE[customMachine.states.length % STATE_PALETTE.length],
        accepting: newStateAccept.checked,
      });
      progress.customEdited = true;
      newStateName.value = '';
      newStateOutput.value = '';
      newStateAccept.checked = false;
      builderStatusEl.textContent = 'State added.';
      refreshBuilderUI();
    } catch (err) {
      builderStatusEl.textContent = err.message;
    }
  });

  addTransForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      customMachine = upsertTransition(customMachine, {
        from: trFromSelect.value,
        event: trEventInput.value,
        to: trToSelect.value,
        output: trOutputInput.value,
      });
      progress.customEdited = true;
      trEventInput.value = '';
      trOutputInput.value = '';
      builderStatusEl.textContent = 'Transition rule saved.';
      refreshBuilderUI();
    } catch (err) {
      builderStatusEl.textContent = err.message;
    }
  });

  forkBtn.addEventListener('click', () => {
    const sourceId = activePresetId === 'custom' ? 'vacuum' : activePresetId;
    customMachine = cloneMachine(getPreset(sourceId));
    customMachine.id = 'custom';
    customMachine.title = `Custom ${PRESETS[sourceId]?.title || 'FSM'}`;
    progress.customEdited = false;
    builderStatusEl.textContent = `Forked ${PRESETS[sourceId]?.title || sourceId}. Edit states or add rules below.`;
    refreshBuilderUI();
  });

  blankBtn.addEventListener('click', () => {
    customMachine = createBlankMachine('My State Machine');
    progress.customEdited = false;
    builderStatusEl.textContent = 'Started a fresh 2-state template.';
    refreshBuilderUI();
  });

  loadSimBtn.addEventListener('click', () => {
    switchStudioTab('sim');
    presetSelect.value = 'custom';
    loadMachineIntoSimulator(customMachine, 'custom');
  });

  buildSubtabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.smBuildTab;
      buildSubtabs.forEach((b) => {
        const active = b.dataset.smBuildTab === target;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      buildSubpanels.forEach((p) => {
        p.hidden = p.dataset.smBuildPanel !== target;
      });
    });
  });

  function refreshChallengesUI() {
    const res = evaluateChallenges(progress, customMachine);
    challengePillBtn.textContent = `Challenges: ${res.count} / ${res.total}`;
    challengesListEl.innerHTML = '';
    CHALLENGES.forEach((ch) => {
      const done = Boolean(res.completed[ch.id]);
      const card = document.createElement('article');
      card.className = `sm-challenge-card${done ? ' is-done' : ''}`;
      card.innerHTML = `
        <div class="sm-challenge-head">
          <strong>${escapeHtml(ch.title)}</strong>
          <span class="sm-challenge-badge">${done ? 'Solved ✓' : 'Open'}</span>
        </div>
        <p>${escapeHtml(ch.desc)}</p>
        <p style="margin-top:0.25rem;color:#93c5fd;"><em>Hint:</em> ${escapeHtml(ch.hint)}</p>`;
      challengesListEl.appendChild(card);
    });
  }

  challengePillBtn.addEventListener('click', () => {
    switchStudioTab('builder');
    const chTab = buildSubtabs.find((b) => b.dataset.smBuildTab === 'challenges');
    chTab?.click();
  });

  /* ── Tab 3: Moore vs. Mealy & Memory Wall Lab ────────────────────────── */
  function renderMooreMealyUI() {
    const rows = mmComparison.getRows();
    const last = rows[rows.length - 1];
    mmMooreBadge.textContent = `State: ${mmComparison.getMooreState()} · Out: ${last ? last.mooreOut : '0'}`;
    mmMealyBadge.textContent = `State: ${mmComparison.getMealyState()} · Last Out: ${last ? last.mealyOut : '—'}`;

    if (rows.length === 0) {
      mmTableBody.innerHTML = '<tr><td colspan="6" style="color:#9fb7c7;">Feed bits 0 or 1 above to watch Moore (3 states) and Mealy (2 states) respond to the sequence "10".</td></tr>';
    } else {
      mmTableBody.innerHTML = rows
        .map(
          (r) => `
          <tr class="${r.detected ? 'is-detected' : ''}">
            <td>#${r.tick}</td>
            <td><strong>${escapeHtml(r.bit)}</strong></td>
            <td>${escapeHtml(r.mooreFrom)} → ${escapeHtml(r.mooreTo)}</td>
            <td><strong>${escapeHtml(r.mooreOut)}</strong></td>
            <td>${escapeHtml(r.mealyFrom)} → ${escapeHtml(r.mealyTo)}</td>
            <td><strong>${escapeHtml(r.mealyOut)}</strong>${r.detected ? ' ★' : ''}</td>
          </tr>`
        )
        .join('');
      const wrap = mmTableBody.closest('.sm-mm-table-wrap');
      if (wrap) wrap.scrollTop = wrap.scrollHeight;
    }
    drawMooreMealy();
  }

  function feedComparatorBit(bit) {
    const row = mmComparison.feedBit(bit);
    if (!prefersReducedMotion()) {
      const now = performance.now();
      mmMooreAnim = { fromId: row.mooreFrom, toId: row.mooreTo, event: bit, startMs: now, durationMs: 320 };
      mmMealyAnim = { fromId: row.mealyFrom, toId: row.mealyTo, event: bit, startMs: now, durationMs: 320 };
      ensureAnimLoop();
    }
    renderMooreMealyUI();
  }

  mmFeed0Btn.addEventListener('click', () => feedComparatorBit('0'));
  mmFeed1Btn.addEventListener('click', () => feedComparatorBit('1'));
  mmDemoBtn.addEventListener('click', () => {
    mmComparison.reset();
    mmComparison.feedString('010110');
    renderMooreMealyUI();
  });
  mmResetBtn.addEventListener('click', () => {
    mmComparison.reset();
    mmMooreAnim = null;
    mmMealyAnim = null;
    renderMooreMealyUI();
  });

  function renderMemoryWall() {
    const info = computeNestingStates(depthSlider.value);
    depthValEl.textContent = String(info.maxDepth);
    depthStatesEl.textContent = `${info.minimumStates} states`;
    depthSampleEl.textContent = info.sampleBalanced;
    depthChainEl.innerHTML = info.stateNames
      .map(
        (name) =>
          `<span class="sm-depth-node${name === 'Error' ? ' is-err' : ''}">${escapeHtml(name)}</span>`
      )
      .join('');
  }
  depthSlider.addEventListener('input', renderMemoryWall);

  /* ── Studio Mode Tab Switcher ────────────────────────────────────────── */
  function switchStudioTab(targetId) {
    modeTabs.forEach((tab) => {
      const active = tab.dataset.smTab === targetId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    modePanels.forEach((panel) => {
      panel.hidden = panel.dataset.smPanel !== targetId;
    });
    requestAnimationFrame(() => {
      if (targetId === 'sim') {
        simCanvasHelper.resize();
        drawSim();
      } else if (targetId === 'builder') {
        builderCanvasHelper.resize();
        refreshBuilderUI();
      } else if (targetId === 'theory') {
        mooreCanvasHelper.resize();
        mealyCanvasHelper.resize();
        renderMooreMealyUI();
      }
    });
  }

  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => switchStudioTab(tab.dataset.smTab));
  });

  document.addEventListener('creation-app-resize', () => {
    simCanvasHelper.resize();
    builderCanvasHelper.resize();
    mooreCanvasHelper.resize();
    mealyCanvasHelper.resize();
  });

  /* ── Editorial Practice Problems ─────────────────────────────────────── */
  const solvedQuestions = new Set();
  const practiceButtons = Array.from(document.querySelectorAll('[data-sm-check]'));

  function updatePracticeScore() {
    if (practiceScoreEl) {
      practiceScoreEl.textContent = `Score: ${solvedQuestions.size} / ${practiceButtons.length}`;
    }
  }

  practiceButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const qNum = btn.dataset.smCheck;
      const type = btn.dataset.smType || 'text';
      const answer = btn.dataset.smAnswer;
      const input = document.getElementById(`smans-${qNum}`);
      const fb = document.getElementById(`smfb-${qNum}`);
      const hint = document.getElementById(`smhint-${qNum}`);
      if (!input || !fb) return;

      fb.className = 'sm-feedback';
      let correct = false;

      if (type === 'number') {
        const val = parseFloat(input.value);
        if (Number.isNaN(val)) {
          fb.textContent = 'Enter a number.';
          fb.classList.add('err');
          return;
        }
        correct = Math.abs(val - parseFloat(answer)) <= 0.001;
      } else {
        if (!input.value) {
          fb.textContent = 'Make a selection.';
          fb.classList.add('err');
          return;
        }
        correct = input.value === answer;
      }

      if (correct) {
        fb.textContent = '✓ Correct!';
        fb.classList.add('ok');
        if (hint) hint.hidden = true;
        input.style.borderColor = '#16a34a';
        solvedQuestions.add(qNum);
      } else {
        fb.textContent = '✗ Try again';
        fb.classList.add('err');
        if (hint) hint.hidden = false;
        input.style.borderColor = '#dc2626';
      }
      updatePracticeScore();
    });
  });

  /* ── Initialize ──────────────────────────────────────────────────────── */
  loadMachineIntoSimulator(getPreset('traffic'), 'traffic');
  refreshBuilderUI();
  renderMooreMealyUI();
  renderMemoryWall();
  updatePracticeScore();
})();
