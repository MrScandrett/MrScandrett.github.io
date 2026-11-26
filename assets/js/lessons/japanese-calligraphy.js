/* Japanese Writing & Shodō Calligraphy Studio + Lesson Interactions */
(function () {
  'use strict';

  const DATA = window.JP_STROKE_DATA;
  if (!DATA) return;

  const { TECHNIQUES, SCRIPTS, FREE_PRESETS, HANKO_PRESETS, sampleSvgPath, evaluateStroke } = DATA;

  const BRUSH_PRESETS = {
    ofude: {
      id: 'ofude',
      name: 'Ōfude',
      scale: 1.25,
      bristles: 16,
      spread: 0.44,
      dryThreshold: 0.48,
      depletion: 0.00055,
      softness: 0.92
    },
    kofude: {
      id: 'kofude',
      name: 'Kofude',
      scale: 0.68,
      bristles: 10,
      spread: 0.28,
      dryThreshold: 0.34,
      depletion: 0.00038,
      softness: 0.98
    },
    kasure: {
      id: 'kasure',
      name: 'Dry Brush',
      scale: 1.35,
      bristles: 18,
      spread: 0.56,
      dryThreshold: 0.78,
      depletion: 0.00072,
      softness: 0.72
    }
  };

  const INK_COLORS = {
    sumi: { name: 'Sumi Black', rgb: [23, 21, 20], hex: '#171514' },
    charcoal: { name: 'Charcoal', rgb: [52, 49, 47], hex: '#34312f' },
    vermilion: { name: 'Vermilion', rgb: [185, 28, 28], hex: '#b91c1c' },
    indigo: { name: 'Aizome Indigo', rgb: [30, 58, 95], hex: '#1e3a5f' }
  };

  const state = {
    mode: 'guided', // 'guided' | 'free'
    script: 'hiragana',
    charIndex: 0,
    activeStrokeIndex: 0,
    strictGuide: true,
    showGrid: true,
    brush: 'ofude',
    baseSize: 22,
    absorbency: 42,
    inkColor: 'sumi',
    inkRemaining: 1.0,
    autoDip: true,
    freePresetId: 'ei',
    guideOpacity: 0.16,
    stampMode: false,
    hankoKanji: HANKO_PRESETS[0].kanji,
    guidedStrokes: [], // committed strokes in current guided char (norm 0..100)
    freeTraceStrokes: [], // strokes when strictGuide is false in guided mode (norm 0..100)
    freeStrokes: [], // strokes in free calligraphy mode (norm 0..1)
    stamps: [], // { x, y, kanji } in norm 0..1
    mastered: new Set(),
    demoCompleted: false,
    pulseUntil: 0,
    statusTone: 'info',
    statusText: 'Follow stroke 1 from the red dot, or press Animate All.'
  };

  // Pre-sample stroke paths for all characters
  Object.keys(SCRIPTS).forEach(key => {
    SCRIPTS[key].forEach(ch => {
      ch.strokes.forEach(st => {
        st.pts = sampleSvgPath(st.d, 48);
      });
    });
  });

  // ── DOM References ──────────────────────────────────────────
  const canvas = document.getElementById('shodoCanvas');
  if (!canvas) return;
  const paperFrame = document.getElementById('shodoPaperFrame');
  const modeGuidedBtn = document.getElementById('modeGuidedBtn');
  const modeFreeBtn = document.getElementById('modeFreeBtn');
  const guidedScriptTabs = document.getElementById('guidedScriptTabs');
  const guidedCharGrid = document.getElementById('guidedCharGrid');
  const freePresetWrap = document.getElementById('freePresetWrap');
  const freePresetList = document.getElementById('freePresetList');
  const guidedGuideOpacityNote = document.getElementById('freeOpacityWrap');

  const stageGlyphBadge = document.getElementById('stageGlyphBadge');
  const stageTitle = document.getElementById('stageTitle');
  const stageSubtitle = document.getElementById('stageSubtitle');
  const stageSpeakBtn = document.getElementById('stageSpeakBtn');
  const stageStatus = document.getElementById('stageStatus');

  const animateAllBtn = document.getElementById('animateAllBtn');
  const animateStepBtn = document.getElementById('animateStepBtn');
  const strictGuideBtn = document.getElementById('strictGuideBtn');
  const gridToggleBtn = document.getElementById('gridToggleBtn');
  const undoBtn = document.getElementById('undoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const savePngBtn = document.getElementById('savePngBtn');

  const guidedStepsPanel = document.getElementById('guidedStepsPanel');
  const stepListEl = document.getElementById('stepList');
  const stepProgressBadge = document.getElementById('stepProgressBadge');
  const charCulturalNote = document.getElementById('charCulturalNote');

  const brushSizeInput = document.getElementById('brushSizeInput');
  const brushSizeOut = document.getElementById('brushSizeOut');
  const absorbInput = document.getElementById('absorbInput');
  const absorbOut = document.getElementById('absorbOut');
  const inkMeterFill = document.getElementById('inkMeterFill');
  const inkMeterText = document.getElementById('inkMeterText');
  const dipBrushBtn = document.getElementById('dipBrushBtn');
  const autoDipInput = document.getElementById('autoDipInput');

  const freeHankoSection = document.getElementById('freeHankoSection');
  const stampToggleBtn = document.getElementById('stampToggleBtn');
  const hankoChoices = document.getElementById('hankoChoices');

  // ── Offscreen Buffers ───────────────────────────────────────
  const paperCanvas = document.createElement('canvas');
  const paperCtx = paperCanvas.getContext('2d');
  const inkCanvas = document.createElement('canvas');
  const inkCtx = inkCanvas.getContext('2d');
  let paperGeneratedW = 0;
  let paperGeneratedH = 0;
  let currentDpr = 1;

  // Animation state
  const raf = window.SimKit ? window.SimKit.raf(canvas) : window.requestAnimationFrame.bind(window);
  let animState = null; // { mode: 'all'|'step', strokeIdx, t, lastTs, waitMs }
  let animRafId = null;

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function currentChar() {
    const list = SCRIPTS[state.script] || SCRIPTS.hiragana;
    return list[Math.min(state.charIndex, list.length - 1)];
  }

  function currentPreset() {
    return FREE_PRESETS.find(p => p.id === state.freePresetId) || FREE_PRESETS[0];
  }

  function speak(text, lang) {
    if (!text || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'ja-JP';
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch {
      /* Speech synthesis optional across headless browsers */
    }
  }

  // ── Coordinate Helpers ──────────────────────────────────────
  function getGuideRect(w, h) {
    const pad = Math.max(18, Math.min(w, h) * 0.085);
    const size = Math.max(40, Math.min(w, h) - pad * 2);
    return {
      x: (w - size) * 0.5,
      y: (h - size) * 0.5,
      size
    };
  }

  function guideToCanvas(pt, rect) {
    return {
      x: rect.x + (pt.x / 100) * rect.size,
      y: rect.y + (pt.y / 100) * rect.size
    };
  }

  function canvasToNorm(cx, cy, w, h, coordMode) {
    if (coordMode === 'guided') {
      const rect = getGuideRect(w, h);
      return {
        x: ((cx - rect.x) / rect.size) * 100,
        y: ((cy - rect.y) / rect.size) * 100
      };
    }
    return {
      x: cx / Math.max(1, w),
      y: cy / Math.max(1, h)
    };
  }

  function normToCanvas(pt, w, h, coordMode) {
    if (coordMode === 'guided') {
      const rect = getGuideRect(w, h);
      return guideToCanvas(pt, rect);
    }
    return {
      x: pt.x * w,
      y: pt.y * h
    };
  }

  // ── Procedural Washi Paper Cache ────────────────────────────
  function buildWashiPaper(w, h, dpr) {
    paperCanvas.width = Math.max(1, Math.floor(w * dpr));
    paperCanvas.height = Math.max(1, Math.floor(h * dpr));
    paperCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Warm ivory hanshi base
    const grad = paperCtx.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.1, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    grad.addColorStop(0, '#fcf8ee');
    grad.addColorStop(0.75, '#f7f0df');
    grad.addColorStop(1, '#ede3cc');
    paperCtx.fillStyle = grad;
    paperCtx.fillRect(0, 0, w, h);

    // Subtle organic mulberry fibers (deterministic seed)
    let seed = 1337;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    paperCtx.lineWidth = 0.75;
    for (let i = 0; i < 160; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const len = 8 + rand() * 24;
      const ang = (rand() - 0.5) * 0.6 + (i % 3 === 0 ? Math.PI * 0.5 : 0);
      paperCtx.strokeStyle = i % 2 === 0 ? 'rgba(180, 158, 122, 0.11)' : 'rgba(255, 255, 255, 0.35)';
      paperCtx.beginPath();
      paperCtx.moveTo(x, y);
      paperCtx.quadraticCurveTo(
        x + Math.cos(ang) * len * 0.5 + (rand() - 0.5) * 4,
        y + Math.sin(ang) * len * 0.5 + (rand() - 0.5) * 4,
        x + Math.cos(ang) * len,
        y + Math.sin(ang) * len
      );
      paperCtx.stroke();
    }

    paperGeneratedW = w;
    paperGeneratedH = h;
  }

  // ── Multi-Bristle Shodō Brush Renderer ──────────────────────
  function hash01(a, b) {
    const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  function stampBristleDab(targetCtx, x, y, radius, angle, inkLoad, absorbency, brushSpec, colorRgb, distAccum, speed) {
    const [r, g, b] = colorRgb;
    const bristles = brushSpec.bristles;
    const spread = brushSpec.spread * radius;
    const dryFactor = Math.max(0, (brushSpec.dryThreshold - inkLoad) / Math.max(0.1, brushSpec.dryThreshold));
    const speedDry = Math.min(0.45, speed * 0.18);
    const kasureChance = Math.min(0.72, dryFactor * 0.85 + speedDry * 0.55);

    // Subtle nijimi bleed halo when brush moves slowly on absorbent paper
    if (absorbency > 8 && speed < 0.38 && inkLoad > 0.25) {
      const bleedAlpha = (absorbency / 100) * 0.032 * inkLoad * (1 - speed / 0.42);
      if (bleedAlpha > 0.004) {
        targetCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bleedAlpha.toFixed(3)})`;
        targetCtx.beginPath();
        targetCtx.ellipse(x, y, radius * 1.24, radius * 1.06, angle, 0, Math.PI * 2);
        targetCtx.fill();
      }
    }

    // Core dark ink footprint (drops slightly when very dry for authentic flying-white)
    const coreAlpha = (0.38 + 0.55 * inkLoad) * (1 - kasureChance * 0.48);
    targetCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0.08, coreAlpha).toFixed(3)})`;
    targetCtx.beginPath();
    targetCtx.ellipse(x, y, radius * 0.84, radius * 0.62, angle, 0, Math.PI * 2);
    targetCtx.fill();

    // Individual outer bristle tracks
    const perp = angle + Math.PI * 0.5;
    for (let i = 0; i < bristles; i++) {
      const frac = bristles > 1 ? (i / (bristles - 1)) * 2 - 1 : 0; // -1..1
      const edgeBias = Math.abs(frac);
      const dropRoll = hash01(i + 1, Math.floor(distAccum * 0.35));
      if (dropRoll < kasureChance * (0.35 + edgeBias * 0.85)) continue;

      const offset = frac * spread + (hash01(i * 3, distAccum * 0.1) - 0.5) * radius * 0.24;
      const bx = x + Math.cos(perp) * offset;
      const by = y + Math.sin(perp) * offset;
      const br = Math.max(0.9, radius * (0.28 + (1 - edgeBias) * 0.22));
      const bAlpha = (0.24 + 0.58 * inkLoad) * (1 - edgeBias * 0.38);

      targetCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bAlpha.toFixed(3)})`;
      targetCtx.beginPath();
      targetCtx.ellipse(bx, by, br * 1.12, br * 0.78, angle, 0, Math.PI * 2);
      targetCtx.fill();
    }
  }

  function renderStrokeToCtx(targetCtx, strokeRec, w, h) {
    const pts = strokeRec.points;
    if (!pts || !pts.length) return;
    const brushSpec = BRUSH_PRESETS[strokeRec.brush] || BRUSH_PRESETS.ofude;
    const color = INK_COLORS[strokeRec.color] || INK_COLORS.sumi;
    const baseRadius = Math.max(2, strokeRec.size * brushSpec.scale * 0.5);

    let distAccum = 0;
    const cPts = pts.map(p => {
      const cp = normToCanvas(p, w, h, strokeRec.coordMode);
      return { x: cp.x, y: cp.y, p: p.p, v: p.v, ink: p.ink };
    });

    // Initial 45-degree nyūhitsu footprint
    const p0 = cPts[0];
    const entryAng = cPts.length > 1
      ? Math.atan2(cPts[1].y - p0.y, cPts[1].x - p0.x)
      : -Math.PI * 0.25;
    stampBristleDab(
      targetCtx,
      p0.x,
      p0.y,
      baseRadius * p0.p,
      entryAng * 0.4 - Math.PI * 0.18,
      p0.ink,
      strokeRec.absorbency,
      brushSpec,
      color.rgb,
      0,
      p0.v
    );

    for (let i = 1; i < cPts.length; i++) {
      const a = cPts[i - 1];
      const b = cPts[i];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = segLen > 0.01 ? Math.atan2(b.y - a.y, b.x - a.x) : entryAng;
      const steps = Math.max(1, Math.ceil(segLen / 1.8));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const p = a.p + (b.p - a.p) * t;
        const v = a.v + (b.v - a.v) * t;
        const ink = a.ink + (b.ink - a.ink) * t;
        distAccum += segLen / steps;
        stampBristleDab(
          targetCtx,
          x,
          y,
          Math.max(1.5, baseRadius * p),
          ang,
          ink,
          strokeRec.absorbency,
          brushSpec,
          color.rgb,
          distAccum,
          v
        );
      }
    }
  }

  function rebuildInkLayer(optW, optH) {
    const w = optW || (canvasCtrl ? canvasCtrl.width : canvas.clientWidth);
    const h = optH || (canvasCtrl ? canvasCtrl.height : canvas.clientHeight);
    if (!w || !h) return;
    inkCtx.clearRect(0, 0, w, h);
    const list = state.mode === 'guided'
      ? (state.strictGuide ? state.guidedStrokes : state.freeTraceStrokes)
      : state.freeStrokes;
    list.forEach(st => renderStrokeToCtx(inkCtx, st, w, h));
  }

  // ── Guided & Free Overlay Rendering ─────────────────────────
  function drawGuideGrid(ctx, w, h) {
    if (!state.showGrid) return;
    ctx.save();
    if (state.mode === 'guided') {
      const r = getGuideRect(w, h);
      ctx.strokeStyle = 'rgba(185, 28, 28, 0.20)';
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y, r.size, r.size);
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(r.x + r.size * 0.5, r.y);
      ctx.lineTo(r.x + r.size * 0.5, r.y + r.size);
      ctx.moveTo(r.x, r.y + r.size * 0.5);
      ctx.lineTo(r.x + r.size, r.y + r.size * 0.5);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 134, 118, 0.16)';
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.size, r.y + r.size);
      ctx.moveTo(r.x + r.size, r.y);
      ctx.lineTo(r.x, r.y + r.size);
      ctx.stroke();
    } else {
      const m = Math.min(w, h) * 0.08;
      ctx.strokeStyle = 'rgba(185, 28, 28, 0.16)';
      ctx.lineWidth = 1;
      ctx.strokeRect(m, m, w - m * 2, h - m * 2);
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, m);
      ctx.lineTo(w * 0.5, h - m);
      ctx.moveTo(m, h * 0.5);
      ctx.lineTo(w - m, h * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function tracePolyline(ctx, pts, rect, maxRatio) {
    if (!pts || !pts.length) return;
    const limit = Math.max(1, Math.min(pts.length, Math.round(pts.length * maxRatio)));
    const p0 = guideToCanvas(pts[0], rect);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < limit; i++) {
      const p = guideToCanvas(pts[i], rect);
      ctx.lineTo(p.x, p.y);
    }
  }

  function drawCalligraphicDemoStroke(ctx, pts, rect, ratio, alpha, color) {
    const limit = Math.max(2, Math.min(pts.length, Math.round(pts.length * ratio)));
    const baseW = Math.max(6, rect.size * 0.072);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    for (let i = 1; i < limit; i++) {
      const prog = i / (pts.length - 1);
      const taper = 1 - Math.pow(prog, 2.2) * 0.42;
      const swell = Math.sin(prog * Math.PI) * 0.18 + 0.92;
      const a = guideToCanvas(pts[i - 1], rect);
      const b = guideToCanvas(pts[i], rect);
      ctx.lineWidth = Math.max(2, baseW * taper * swell);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHanko(ctx, cx, cy, size, kanji, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.88 : alpha;
    const half = size * 0.5;
    ctx.fillStyle = 'rgba(185, 28, 28, 0.92)';
    ctx.fillRect(cx - half, cy - half, size, size);
    ctx.strokeStyle = 'rgba(252, 248, 238, 0.85)';
    ctx.lineWidth = Math.max(1.5, size * 0.06);
    ctx.strokeRect(cx - half + 3, cy - half + 3, size - 6, size - 6);
    ctx.fillStyle = '#fcf8ee';
    ctx.font = `700 ${Math.round(size * 0.58)}px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kanji, cx, cy + size * 0.03);
    ctx.restore();
  }

  function drawFreeTehon(ctx, w, h) {
    const preset = currentPreset();
    if (!preset.text || state.guideOpacity <= 0) return;
    const chars = Array.from(preset.text);
    const pad = Math.min(w, h) * 0.12;
    const availH = h - pad * 2;
    const count = chars.length;
    const fontSize = Math.min(w * 0.52, (availH / Math.max(1, count)) * 0.86);

    ctx.save();
    ctx.fillStyle = `rgba(38, 32, 27, ${state.guideOpacity})`;
    ctx.font = `600 ${Math.round(fontSize)}px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const totalBlock = fontSize * count * 1.04;
    const startY = (h - totalBlock) * 0.5 + fontSize * 0.52;
    chars.forEach((ch, idx) => {
      ctx.fillText(ch, w * 0.5, startY + idx * fontSize * 1.04);
    });
    ctx.restore();
  }

  function drawArrowHead(ctx, from, to, color, size) {
    const ang = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.save();
    ctx.translate(to.x, to.y);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.65);
    ctx.lineTo(-size * 0.7, size * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function renderMainCanvas(optW, optH, optCtx) {
    const w = optW || (canvasCtrl ? canvasCtrl.width : canvas.clientWidth);
    const h = optH || (canvasCtrl ? canvasCtrl.height : canvas.clientHeight);
    const ctx = optCtx || (canvasCtrl ? canvasCtrl.ctx : canvas.getContext('2d'));
    if (!w || !h || !ctx) return;

    if (paperGeneratedW !== w || paperGeneratedH !== h) {
      buildWashiPaper(w, h, currentDpr);
    }

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(paperCanvas, 0, 0, w, h);
    drawGuideGrid(ctx, w, h);

    if (state.mode === 'guided') {
      const ch = currentChar();
      const rect = getGuideRect(w, h);
      const baseTrackW = Math.max(5, rect.size * 0.072);

      // 1. Faint silhouette of all strokes
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ch.strokes.forEach((st, idx) => {
        if (state.demoCompleted) {
          drawCalligraphicDemoStroke(ctx, st.pts, rect, 1, 0.84, '#1b1816');
          return;
        }
        const isDone = state.strictGuide && idx < state.activeStrokeIndex;
        const isActive = state.strictGuide && idx === state.activeStrokeIndex;
        tracePolyline(ctx, st.pts, rect, 1);
        if (isDone) {
          ctx.strokeStyle = 'rgba(22, 163, 74, 0.16)';
          ctx.lineWidth = baseTrackW;
        } else if (isActive) {
          ctx.strokeStyle = 'rgba(185, 28, 28, 0.24)';
          ctx.lineWidth = baseTrackW * 1.05;
        } else {
          ctx.strokeStyle = 'rgba(120, 108, 94, 0.18)';
          ctx.lineWidth = baseTrackW * 0.92;
        }
        ctx.stroke();
      });
      ctx.restore();

      // 2. Active animation overlay
      if (animState) {
        const upTo = animState.mode === 'all' ? animState.strokeIdx : animState.strokeIdx;
        const startFrom = animState.mode === 'all' ? 0 : animState.strokeIdx;
        for (let i = startFrom; i < upTo; i++) {
          drawCalligraphicDemoStroke(ctx, ch.strokes[i].pts, rect, 1, 0.88, '#171514');
        }
        const cur = ch.strokes[animState.strokeIdx];
        if (cur) {
          drawCalligraphicDemoStroke(ctx, cur.pts, rect, animState.t, 0.92, '#b91c1c');
          const ptIdx = Math.min(cur.pts.length - 1, Math.floor(animState.t * (cur.pts.length - 1)));
          const tip = guideToCanvas(cur.pts[ptIdx], rect);
          ctx.save();
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, Math.max(5, rect.size * 0.022), 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Active stroke numbered dot, arrow, and end-technique badge
      if (!animState && state.strictGuide && state.activeStrokeIndex < ch.strokes.length) {
        const st = ch.strokes[state.activeStrokeIndex];
        const pStart = guideToCanvas(st.pts[0], rect);
        const arrowIdx = Math.min(st.pts.length - 1, 7);
        const pArrowFrom = guideToCanvas(st.pts[Math.max(0, arrowIdx - 3)], rect);
        const pArrowTo = guideToCanvas(st.pts[arrowIdx], rect);
        const pEnd = guideToCanvas(st.pts[st.pts.length - 1], rect);

        const pulsing = performance.now() < state.pulseUntil;
        const dotR = Math.max(10, rect.size * 0.038) * (pulsing ? 1.18 : 1);

        // Direction arrow near start
        if (Math.hypot(pArrowTo.x - pArrowFrom.x, pArrowTo.y - pArrowFrom.y) > 2) {
          drawArrowHead(ctx, pArrowFrom, pArrowTo, '#b91c1c', Math.max(6, rect.size * 0.024));
        }

        // End marker
        const tech = TECHNIQUES[st.end] || TECHNIQUES.tome;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(pEnd.x, pEnd.y, Math.max(7, rect.size * 0.024), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#991b1b';
        ctx.font = `800 ${Math.max(9, Math.round(rect.size * 0.026))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tech.symbol, pEnd.x, pEnd.y + 0.5);
        ctx.restore();

        // Numbered start circle
        ctx.save();
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(pStart.x, pStart.y, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `800 ${Math.round(dotR * 1.1)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(state.activeStrokeIndex + 1), pStart.x, pStart.y + 0.5);
        ctx.restore();
      }

      // 4. Composite user ink layer
      ctx.drawImage(inkCanvas, 0, 0, w, h);

      // 5. Mastery seal on character completion
      if (state.strictGuide && state.activeStrokeIndex >= ch.strokes.length) {
        const sealSize = Math.max(30, Math.min(44, rect.size * 0.13));
        drawHanko(ctx, rect.x + rect.size - sealSize * 0.65, rect.y + rect.size - sealSize * 0.65, sealSize, '完', 0.9);
      }
    } else {
      // Free Calligraphy Mode
      drawFreeTehon(ctx, w, h);
      ctx.drawImage(inkCanvas, 0, 0, w, h);
      const sealSize = Math.max(36, Math.min(54, Math.min(w, h) * 0.11));
      state.stamps.forEach(s => {
        drawHanko(ctx, s.x * w, s.y * h, sealSize, s.kanji, 0.9);
      });
    }
  }

  // ── Canvas Sizing via SimKit ────────────────────────────────
  let canvasCtrl = null;
  canvasCtrl = window.SimKit
    ? window.SimKit.canvas2d(canvas, {
        box: paperFrame,
        onResize: (ctx, w, h) => {
          currentDpr = Math.max(1, canvas.width / Math.max(1, w));
          inkCanvas.width = canvas.width;
          inkCanvas.height = canvas.height;
          inkCtx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
          buildWashiPaper(w, h, currentDpr);
          rebuildInkLayer(w, h);
          renderMainCanvas(w, h, ctx);
        }
      })
    : {
        ctx: canvas.getContext('2d'),
        get width() { return canvas.clientWidth; },
        get height() { return canvas.clientHeight; },
        resize() {}
      };

  // ── Animation Controller ────────────────────────────────────
  function stopAnimation() {
    if (animRafId !== null) {
      if (raf.cancel) raf.cancel(animRafId);
      else window.cancelAnimationFrame(animRafId);
      animRafId = null;
    }
    animState = null;
  }

  function startAnimation(mode, startIdx) {
    if (state.mode !== 'guided') return;
    const ch = currentChar();
    const idx = Math.max(0, Math.min(ch.strokes.length - 1, startIdx || 0));
    stopAnimation();
    state.demoCompleted = false;

    if (prefersReducedMotion()) {
      state.demoCompleted = true;
      renderMainCanvas();
      setStatus('info', `Displayed full stroke model for ${ch.glyph} (${ch.strokes.length} strokes).`);
      return;
    }

    animState = {
      mode,
      strokeIdx: idx,
      t: 0,
      lastTs: null,
      waitMs: 0
    };
    setStatus('info', mode === 'all' ? `Animating all ${ch.strokes.length} strokes of ${ch.glyph}…` : `Animating stroke ${idx + 1} of ${ch.glyph}…`);

    function step(ts) {
      if (!animState) return;
      if (animState.lastTs === null) animState.lastTs = ts;
      const dt = Math.min(50, ts - animState.lastTs);
      animState.lastTs = ts;

      if (animState.waitMs > 0) {
        animState.waitMs -= dt;
      } else {
        animState.t += dt / 720;
        if (animState.t >= 1) {
          if (animState.mode === 'all' && animState.strokeIdx < ch.strokes.length - 1) {
            animState.strokeIdx++;
            animState.t = 0;
            animState.waitMs = 190;
          } else {
            const finishedMode = animState.mode;
            animState = null;
            animRafId = null;
            if (finishedMode === 'all') state.demoCompleted = true;
            renderMainCanvas();
            setStatus('info', finishedMode === 'all'
              ? `Demo complete — trace stroke ${Math.min(state.activeStrokeIndex + 1, ch.strokes.length)} from the red dot.`
              : `Stroke ${idx + 1} demo complete — your turn to brush it!`);
            return;
          }
        }
      }
      renderMainCanvas();
      animRafId = raf(step);
    }

    animRafId = raf(step);
  }

  // ── Pointer Brush Interaction ───────────────────────────────
  let activePointer = null; // { id, coordMode, lastX, lastY, lastTime, lastPressure, distAccum, points[] }

  function updateInkMeter() {
    const pct = Math.round(state.inkRemaining * 100);
    if (inkMeterFill) inkMeterFill.style.width = `${pct}%`;
    if (inkMeterText) inkMeterText.textContent = `${pct}%`;
  }

  function pointerLocal(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top
    };
  }

  function handlePointerDown(e) {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    stopAnimation();

    const w = canvasCtrl.width;
    const h = canvasCtrl.height;
    const pos = pointerLocal(e);

    if (state.mode === 'free' && state.stampMode) {
      const norm = canvasToNorm(pos.x, pos.y, w, h, 'free');
      state.stamps.push({
        x: Math.max(0.06, Math.min(0.94, norm.x)),
        y: Math.max(0.06, Math.min(0.94, norm.y)),
        kanji: state.hankoKanji
      });
      state.stampMode = false;
      syncStampUI();
      renderMainCanvas();
      setStatus('success', `Stamped vermilion seal「${state.hankoKanji}」on the paper.`);
      return;
    }

    if (state.demoCompleted) {
      state.demoCompleted = false;
    }

    if (state.autoDip) {
      state.inkRemaining = 1.0;
      updateInkMeter();
    }

    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }

    const coordMode = state.mode === 'guided' ? 'guided' : 'free';
    const norm = canvasToNorm(pos.x, pos.y, w, h, coordMode);
    const initialPressure = e.pointerType === 'pen' && e.pressure > 0
      ? Math.max(0.25, Math.min(1.2, e.pressure * 1.25))
      : 0.92;

    const pt = { x: norm.x, y: norm.y, p: initialPressure, v: 0.1, ink: state.inkRemaining };
    activePointer = {
      id: e.pointerId,
      coordMode,
      lastX: pos.x,
      lastY: pos.y,
      lastTime: performance.now(),
      lastPressure: initialPressure,
      distAccum: 0,
      points: [pt]
    };

    const brushSpec = BRUSH_PRESETS[state.brush] || BRUSH_PRESETS.ofude;
    const color = INK_COLORS[state.inkColor] || INK_COLORS.sumi;
    const baseRadius = Math.max(2, state.baseSize * brushSpec.scale * 0.5);
    stampBristleDab(
      inkCtx,
      pos.x,
      pos.y,
      baseRadius * initialPressure,
      -Math.PI * 0.25,
      state.inkRemaining,
      state.absorbency,
      brushSpec,
      color.rgb,
      0,
      0.1
    );
    renderMainCanvas();
  }

  function handlePointerMove(e) {
    if (!activePointer || activePointer.id !== e.pointerId) return;
    const w = canvasCtrl.width;
    const h = canvasCtrl.height;
    const pos = pointerLocal(e);
    const now = performance.now();
    const dt = Math.max(1, now - activePointer.lastTime);
    const dx = pos.x - activePointer.lastX;
    const dy = pos.y - activePointer.lastY;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.8) return;

    const speed = segLen / dt; // px/ms
    const velPressure = Math.max(0.24, Math.min(1.15, 1.12 - speed * 0.42));
    const targetPressure = e.pointerType === 'pen' && e.pressure > 0
      ? Math.max(0.24, Math.min(1.25, e.pressure * 1.15 * 0.7 + velPressure * 0.3))
      : velPressure;
    const smoothP = activePointer.lastPressure * 0.65 + targetPressure * 0.35;

    const brushSpec = BRUSH_PRESETS[state.brush] || BRUSH_PRESETS.ofude;
    const color = INK_COLORS[state.inkColor] || INK_COLORS.sumi;
    const baseRadius = Math.max(2, state.baseSize * brushSpec.scale * 0.5);

    // Deplete brush ink
    state.inkRemaining = Math.max(0.12, state.inkRemaining - segLen * brushSpec.depletion * (state.baseSize / 20));
    updateInkMeter();

    const ang = Math.atan2(dy, dx);
    const steps = Math.max(1, Math.ceil(segLen / 1.8));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const ix = activePointer.lastX + dx * t;
      const iy = activePointer.lastY + dy * t;
      const ip = activePointer.lastPressure + (smoothP - activePointer.lastPressure) * t;
      activePointer.distAccum += segLen / steps;
      stampBristleDab(
        inkCtx,
        ix,
        iy,
        Math.max(1.5, baseRadius * ip),
        ang,
        state.inkRemaining,
        state.absorbency,
        brushSpec,
        color.rgb,
        activePointer.distAccum,
        speed
      );
    }

    const norm = canvasToNorm(pos.x, pos.y, w, h, activePointer.coordMode);
    activePointer.points.push({ x: norm.x, y: norm.y, p: smoothP, v: speed, ink: state.inkRemaining });
    activePointer.lastX = pos.x;
    activePointer.lastY = pos.y;
    activePointer.lastTime = now;
    activePointer.lastPressure = smoothP;

    renderMainCanvas();
  }

  function finishPointerStroke(e) {
    if (!activePointer || activePointer.id !== e.pointerId) return;
    const finished = activePointer;
    activePointer = null;

    if (canvas.releasePointerCapture) {
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }

    const strokeRec = {
      coordMode: finished.coordMode,
      brush: state.brush,
      size: state.baseSize,
      color: state.inkColor,
      absorbency: state.absorbency,
      points: finished.points
    };

    if (state.mode === 'free') {
      state.freeStrokes.push(strokeRec);
      setStatus('info', `Stroke added (${state.freeStrokes.length} total).`);
      return;
    }

    if (!state.strictGuide) {
      state.freeTraceStrokes.push(strokeRec);
      setStatus('info', 'Free trace stroke added.');
      return;
    }

    const ch = currentChar();
    if (state.activeStrokeIndex >= ch.strokes.length) {
      // Already mastered; redraw clean committed strokes
      rebuildInkLayer();
      renderMainCanvas();
      return;
    }

    const targetStroke = ch.strokes[state.activeStrokeIndex];
    const result = evaluateStroke(finished.points, targetStroke.pts, targetStroke.end);

    if (result.pass) {
      state.guidedStrokes.push(strokeRec);
      state.activeStrokeIndex++;
      if (state.activeStrokeIndex >= ch.strokes.length) {
        state.mastered.add(ch.glyph);
        setStatus('success', `素晴らしい! Mastered ${ch.glyph} (${ch.romaji}) in ${ch.strokes.length} strokes.`);
        speak(ch.glyph);
        renderCharGrid();
      } else {
        setStatus('success', `${result.feedback} Next: stroke ${state.activeStrokeIndex + 1}.`);
      }
      renderStepList();
      renderMainCanvas();
    } else {
      state.pulseUntil = performance.now() + 900;
      rebuildInkLayer();
      renderMainCanvas();
      setStatus('error', result.feedback);
    }
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', finishPointerStroke);
  canvas.addEventListener('pointercancel', finishPointerStroke);

  // ── UI Rendering & State Sync ───────────────────────────────
  function setStatus(tone, text) {
    state.statusTone = tone;
    state.statusText = text;
    if (!stageStatus) return;
    stageStatus.className = `shodo-status is-${tone}`;
    stageStatus.textContent = text;
  }

  function renderCharGrid() {
    if (!guidedCharGrid) return;
    const list = SCRIPTS[state.script] || SCRIPTS.hiragana;
    guidedCharGrid.innerHTML = '';
    list.forEach((ch, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSelected = idx === state.charIndex;
      const isMastered = state.mastered.has(ch.glyph);
      btn.className = `shodo-char-tile${isSelected ? ' is-selected' : ''}${isMastered ? ' is-mastered' : ''}`;
      btn.setAttribute('aria-pressed', String(isSelected));
      btn.innerHTML = `<span class="shodo-tile-glyph">${ch.glyph}</span><span class="shodo-tile-romaji">${ch.romaji}</span>${isMastered ? '<span class="shodo-tile-check" aria-label="Mastered">✓</span>' : ''}`;
      btn.addEventListener('click', () => {
        selectCharacter(state.script, idx, true);
      });
      guidedCharGrid.appendChild(btn);
    });
  }

  function renderFreePresets() {
    if (!freePresetList) return;
    freePresetList.innerHTML = '';
    FREE_PRESETS.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = p.id === state.freePresetId;
      btn.className = `shodo-preset-btn${active ? ' is-active' : ''}`;
      btn.setAttribute('aria-pressed', String(active));
      btn.innerHTML = `<strong>${p.text || '白紙'}</strong><span>${p.romaji}</span>`;
      btn.addEventListener('click', () => {
        state.freePresetId = p.id;
        renderFreePresets();
        updateStageHeader();
        renderMainCanvas();
        if (p.text) speak(p.text);
      });
      freePresetList.appendChild(btn);
    });
  }

  function renderStepList() {
    if (!stepListEl) return;
    const ch = currentChar();
    stepListEl.innerHTML = '';
    if (stepProgressBadge) {
      stepProgressBadge.textContent = `${Math.min(state.activeStrokeIndex, ch.strokes.length)} / ${ch.strokes.length}`;
    }
    ch.strokes.forEach((st, idx) => {
      const tech = TECHNIQUES[st.end] || TECHNIQUES.tome;
      const isDone = state.strictGuide && idx < state.activeStrokeIndex;
      const isActive = state.strictGuide && idx === state.activeStrokeIndex;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `shodo-step-item${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`;
      btn.innerHTML = `
        <span class="shodo-step-num">${isDone ? '✓' : idx + 1}</span>
        <span class="shodo-step-body">
          <span class="shodo-step-top">
            <strong>Stroke ${idx + 1}</strong>
            <span class="shodo-tech-badge is-${tech.id}">${tech.kanji} ${tech.romaji}</span>
          </span>
          <span class="shodo-step-tip">${st.tip}</span>
        </span>
      `;
      btn.addEventListener('click', () => {
        startAnimation('step', idx);
      });
      stepListEl.appendChild(btn);
    });
    if (charCulturalNote) {
      charCulturalNote.textContent = ch.note;
    }
  }

  function updateStageHeader() {
    if (state.mode === 'guided') {
      const ch = currentChar();
      if (stageGlyphBadge) stageGlyphBadge.textContent = ch.glyph;
      if (stageTitle) stageTitle.textContent = `${ch.glyph} (${ch.romaji}) — ${ch.strokes.length} ${ch.strokes.length === 1 ? 'Stroke' : 'Strokes'}`;
      if (stageSubtitle) stageSubtitle.textContent = ch.desc;
      if (stageSpeakBtn) stageSpeakBtn.disabled = false;
    } else {
      const p = currentPreset();
      if (stageGlyphBadge) stageGlyphBadge.textContent = p.text ? Array.from(p.text)[0] : '書';
      if (stageTitle) stageTitle.textContent = `Free Shodō Studio · ${p.romaji}`;
      if (stageSubtitle) stageSubtitle.textContent = p.desc;
      if (stageSpeakBtn) stageSpeakBtn.disabled = !p.text;
    }
  }

  function syncModeUI() {
    const isGuided = state.mode === 'guided';
    if (modeGuidedBtn) {
      modeGuidedBtn.classList.toggle('is-active', isGuided);
      modeGuidedBtn.setAttribute('aria-selected', String(isGuided));
    }
    if (modeFreeBtn) {
      modeFreeBtn.classList.toggle('is-active', !isGuided);
      modeFreeBtn.setAttribute('aria-selected', String(!isGuided));
    }
    if (guidedScriptTabs) guidedScriptTabs.hidden = !isGuided;
    if (guidedCharGrid) guidedCharGrid.hidden = !isGuided;
    if (freePresetWrap) freePresetWrap.hidden = isGuided;
    if (guidedGuideOpacityNote) guidedGuideOpacityNote.hidden = isGuided;
    if (guidedStepsPanel) guidedStepsPanel.hidden = !isGuided;
    if (freeHankoSection) freeHankoSection.hidden = isGuided;

    if (animateAllBtn) animateAllBtn.hidden = !isGuided;
    if (animateStepBtn) animateStepBtn.hidden = !isGuided;
    if (strictGuideBtn) strictGuideBtn.hidden = !isGuided;

    if (isGuided) {
      state.stampMode = false;
      syncStampUI();
    }

    updateStageHeader();
    rebuildInkLayer();
    renderMainCanvas();
  }

  function syncStampUI() {
    if (!stampToggleBtn) return;
    stampToggleBtn.classList.toggle('is-active', state.stampMode);
    stampToggleBtn.setAttribute('aria-pressed', String(state.stampMode));
    canvas.style.cursor = state.stampMode ? 'cell' : 'crosshair';
  }

  function selectCharacter(scriptKey, index, withSpeech) {
    stopAnimation();
    state.script = scriptKey;
    state.charIndex = index;
    state.activeStrokeIndex = 0;
    state.guidedStrokes = [];
    state.freeTraceStrokes = [];
    state.demoCompleted = false;

    document.querySelectorAll('[data-script-tab]').forEach(btn => {
      const active = btn.dataset.scriptTab === scriptKey;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    const ch = currentChar();
    renderCharGrid();
    renderStepList();
    updateStageHeader();
    rebuildInkLayer();
    renderMainCanvas();
    setStatus('info', `Selected ${ch.glyph} (${ch.romaji}). Trace stroke 1 from the red dot.`);
    if (withSpeech) speak(ch.glyph);
  }

  function switchMode(mode) {
    if (state.mode === mode) return;
    stopAnimation();
    state.mode = mode;
    syncModeUI();
    if (mode === 'guided') {
      const ch = currentChar();
      setStatus('info', `Guided mode: practice ${ch.glyph} (${ch.romaji}) stroke by stroke.`);
    } else {
      setStatus('info', 'Free calligraphy mode: paint freely on hanshi paper or stamp your hanko seal.');
    }
  }

  // ── Wire Studio Controls ────────────────────────────────────
  if (modeGuidedBtn) modeGuidedBtn.addEventListener('click', () => switchMode('guided'));
  if (modeFreeBtn) modeFreeBtn.addEventListener('click', () => switchMode('free'));

  document.querySelectorAll('[data-script-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectCharacter(btn.dataset.scriptTab, 0, false);
    });
  });

  if (stageSpeakBtn) {
    stageSpeakBtn.addEventListener('click', () => {
      if (state.mode === 'guided') speak(currentChar().glyph);
      else if (currentPreset().text) speak(currentPreset().text);
    });
  }

  if (animateAllBtn) {
    animateAllBtn.addEventListener('click', () => startAnimation('all', 0));
  }
  if (animateStepBtn) {
    animateStepBtn.addEventListener('click', () => {
      const ch = currentChar();
      const idx = Math.min(state.activeStrokeIndex, ch.strokes.length - 1);
      startAnimation('step', idx);
    });
  }

  if (strictGuideBtn) {
    strictGuideBtn.addEventListener('click', () => {
      state.strictGuide = !state.strictGuide;
      strictGuideBtn.classList.toggle('is-active', state.strictGuide);
      strictGuideBtn.setAttribute('aria-pressed', String(state.strictGuide));
      strictGuideBtn.textContent = state.strictGuide ? 'Check: On' : 'Free Trace';
      renderStepList();
      rebuildInkLayer();
      renderMainCanvas();
      setStatus('info', state.strictGuide
        ? 'Guided stroke check enabled — follow each numbered stroke in order.'
        : 'Free trace enabled — brush freely over the character guide.');
    });
  }

  if (gridToggleBtn) {
    gridToggleBtn.addEventListener('click', () => {
      state.showGrid = !state.showGrid;
      gridToggleBtn.classList.toggle('is-active', state.showGrid);
      gridToggleBtn.setAttribute('aria-pressed', String(state.showGrid));
      renderMainCanvas();
    });
  }

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      stopAnimation();
      if (state.mode === 'guided') {
        if (state.strictGuide && state.guidedStrokes.length) {
          state.guidedStrokes.pop();
          state.activeStrokeIndex = Math.max(0, state.activeStrokeIndex - 1);
          renderStepList();
          rebuildInkLayer();
          renderMainCanvas();
          setStatus('info', `Undid last stroke. Back to stroke ${state.activeStrokeIndex + 1}.`);
        } else if (!state.strictGuide && state.freeTraceStrokes.length) {
          state.freeTraceStrokes.pop();
          rebuildInkLayer();
          renderMainCanvas();
        }
      } else {
        if (state.freeStrokes.length) {
          state.freeStrokes.pop();
          rebuildInkLayer();
          renderMainCanvas();
          setStatus('info', 'Undid last brush stroke.');
        } else if (state.stamps.length) {
          state.stamps.pop();
          renderMainCanvas();
          setStatus('info', 'Removed last seal stamp.');
        }
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      stopAnimation();
      state.demoCompleted = false;
      if (state.mode === 'guided') {
        state.guidedStrokes = [];
        state.freeTraceStrokes = [];
        state.activeStrokeIndex = 0;
        renderStepList();
        rebuildInkLayer();
        renderMainCanvas();
        setStatus('info', 'Paper cleared. Begin at stroke 1.');
      } else {
        state.freeStrokes = [];
        state.stamps = [];
        rebuildInkLayer();
        renderMainCanvas();
        setStatus('info', 'Hanshi paper cleared.');
      }
    });
  }

  if (savePngBtn) {
    savePngBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      const label = state.mode === 'guided' ? currentChar().romaji.replace(/[^a-z0-9]/gi, '-') : state.freePresetId;
      a.download = `shodo-${label || 'calligraphy'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      setStatus('success', 'Saved calligraphy artwork as PNG.');
    });
  }

  // Brush Rack Controls
  document.querySelectorAll('[data-brush-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.brush = btn.dataset.brushId;
      document.querySelectorAll('[data-brush-id]').forEach(b => {
        const active = b.dataset.brushId === state.brush;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
  });

  document.querySelectorAll('[data-ink-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.inkColor = btn.dataset.inkColor;
      document.querySelectorAll('[data-ink-color]').forEach(b => {
        const active = b.dataset.inkColor === state.inkColor;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
  });

  if (brushSizeInput) {
    brushSizeInput.addEventListener('input', () => {
      state.baseSize = Number(brushSizeInput.value);
      if (brushSizeOut) brushSizeOut.textContent = `${state.baseSize}px`;
    });
  }

  if (absorbInput) {
    absorbInput.addEventListener('input', () => {
      state.absorbency = Number(absorbInput.value);
      if (absorbOut) absorbOut.textContent = `${state.absorbency}%`;
    });
  }

  if (dipBrushBtn) {
    dipBrushBtn.addEventListener('click', () => {
      state.inkRemaining = 1.0;
      updateInkMeter();
      setStatus('info', 'Fresh sumi ink loaded onto the brush.');
    });
  }

  if (autoDipInput) {
    autoDipInput.addEventListener('change', () => {
      state.autoDip = autoDipInput.checked;
    });
  }

  document.querySelectorAll('[data-guide-opacity]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.guideOpacity = Number(btn.dataset.guideOpacity);
      document.querySelectorAll('[data-guide-opacity]').forEach(b => {
        const active = Number(b.dataset.guideOpacity) === state.guideOpacity;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      renderMainCanvas();
    });
  });

  if (stampToggleBtn) {
    stampToggleBtn.addEventListener('click', () => {
      state.stampMode = !state.stampMode;
      syncStampUI();
      if (state.stampMode) {
        setStatus('info', `Click anywhere on the paper to stamp「${state.hankoKanji}」.`);
      }
    });
  }

  if (hankoChoices) {
    HANKO_PRESETS.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `shodo-hanko-btn${idx === 0 ? ' is-active' : ''}`;
      btn.textContent = item.kanji;
      btn.title = item.label;
      btn.setAttribute('aria-label', `Seal ${item.label}`);
      btn.setAttribute('aria-pressed', String(idx === 0));
      btn.addEventListener('click', () => {
        state.hankoKanji = item.kanji;
        hankoChoices.querySelectorAll('button').forEach(b => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
      });
      hankoChoices.appendChild(btn);
    });
  }

  // Practice-in-Studio links from the Stroke-Order Rules lesson below
  document.querySelectorAll('[data-practice-char]').forEach(btn => {
    btn.addEventListener('click', () => {
      const glyph = btn.dataset.practiceChar;
      let foundScript = null;
      let foundIdx = -1;
      for (const sKey of Object.keys(SCRIPTS)) {
        const idx = SCRIPTS[sKey].findIndex(c => c.glyph === glyph);
        if (idx >= 0) {
          foundScript = sKey;
          foundIdx = idx;
          break;
        }
      }
      if (!foundScript) return;
      switchMode('guided');
      selectCharacter(foundScript, foundIdx, true);
      const studioEl = document.getElementById('shodo-studio');
      if (studioEl) studioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => startAnimation('all', 0), 220);
    });
  });

  document.addEventListener('creation-app-resize', () => {
    if (canvasCtrl.resize) canvasCtrl.resize();
  });

  // Initial Studio Boot
  renderFreePresets();
  selectCharacter('hiragana', 0, false);
  syncModeUI();
  updateInkMeter();

  // ── Sentence Builder (Preserved from Lesson) ────────────────
  const SENTENCE_PIECES = [
    { text: '私', role: 'subject', gloss: 'I' },
    { text: 'は', role: 'particle', gloss: '[topic]' },
    { text: '本', role: 'object', gloss: 'book' },
    { text: 'を', role: 'particle', gloss: '[object]' },
    { text: '読みます', role: 'verb', gloss: 'read' }
  ];

  const sentenceDock = document.getElementById('sentenceDock');
  const wordBank = document.getElementById('wordBank');
  const sentenceFeedback = document.getElementById('sentenceFeedback');
  const clearSentenceBtn = document.getElementById('clearSentenceBtn');
  const speakSentenceBtn = document.getElementById('speakSentenceBtn');
  let placedWords = [];

  function initSentence() {
    if (!sentenceDock || !wordBank) return;
    placedWords = [];
    sentenceDock.innerHTML = '<span style="color:#64748b; font-size:0.8rem; font-style:italic;" id="dockPlaceholder">Tap tiles below in SOV order →</span>';
    sentenceFeedback.className = 'feedback-msg info';
    sentenceFeedback.textContent = 'Target order: Topic/Subject (私) + Topic particle (は) + Object (本) + Object particle (を) + Verb (読みます)';
    if (speakSentenceBtn) speakSentenceBtn.style.display = 'none';

    const shuffled = [...SENTENCE_PIECES].sort(() => Math.random() - 0.5);
    wordBank.innerHTML = '';
    shuffled.forEach(w => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `word-tile ${w.role === 'particle' ? 'particle' : ''}`;
      b.innerHTML = `${w.text} <small>(${w.gloss})</small>`;
      b.dataset.text = w.text;
      b.addEventListener('click', () => {
        b.remove();
        placedWords.push(w);
        renderDock();
      });
      wordBank.appendChild(b);
    });
  }

  function renderDock() {
    sentenceDock.innerHTML = '';
    placedWords.forEach(w => {
      const span = document.createElement('span');
      span.className = `word-tile placed ${w.role === 'particle' ? 'particle' : ''}`;
      span.textContent = w.text;
      sentenceDock.appendChild(span);
    });

    const assembled = placedWords.map(w => w.text).join('');
    const targetStr = SENTENCE_PIECES.map(w => w.text).join('');

    if (placedWords.length === SENTENCE_PIECES.length) {
      if (assembled === targetStr) {
        sentenceFeedback.className = 'feedback-msg success';
        sentenceFeedback.textContent = 'Correct! 素晴らしい! Watashi wa hon o yomimasu (I read a book). Verbs always seal the end in SOV order.';
        if (speakSentenceBtn) speakSentenceBtn.style.display = 'inline-flex';
        speak(assembled);
      } else {
        sentenceFeedback.className = 'feedback-msg error';
        sentenceFeedback.textContent = 'Word order is off. Remember: [Topic/Subject] + [は] + [Object] + [を] + [Verb]. Reset and try again!';
      }
    }
  }

  if (clearSentenceBtn) clearSentenceBtn.addEventListener('click', initSentence);
  if (speakSentenceBtn) speakSentenceBtn.addEventListener('click', () => speak('私は本を読みます'));
  initSentence();

  // ── Quiz Handlers (Preserved from Lesson) ───────────────────
  function setupQuiz(optsId, feedbackId, answerSpeech) {
    const opts = document.querySelectorAll(`#${optsId} .quiz-opt`);
    const fb = document.getElementById(feedbackId);
    if (!opts.length || !fb) return;
    opts.forEach(btn => {
      btn.addEventListener('click', () => {
        opts.forEach(b => { b.disabled = true; });
        if (btn.dataset.correct === 'true') {
          btn.classList.add('correct');
          fb.className = 'feedback-msg success';
          fb.textContent = 'Correct! ✓';
          speak(answerSpeech);
        } else {
          btn.classList.add('incorrect');
          fb.className = 'feedback-msg error';
          fb.textContent = 'Not quite — try again!';
          window.setTimeout(() => {
            opts.forEach(b => { b.disabled = false; });
            btn.classList.remove('incorrect');
            fb.textContent = '';
          }, 1400);
        }
      });
    });
  }

  setupQuiz('q1Opts', 'q1Feedback', 'こんにちは');
  setupQuiz('q2Opts', 'q2Feedback', 'ありがとう');
}());
