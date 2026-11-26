// Perspective City studio: draw footprints on a plan, watch them rise as a
// one-point-perspective skyline (marker on paper), or walk around them in 3D.
// The maths lives in perspective-city-core.mjs; this file is the page.

import {
  GRID, MAX_HEIGHT, MARKERS, STAMPS, FONT,
  makeBuilding, rectLoop, letterPieces, wordWidth, pointInLoops, centroid, bounds,
  translateLoops, selfIntersects, signedArea, sketchOps, project, vanishingPoint,
  tiersOf, spireHeight, sampleCity, randomCity, serializeCity, parseCity
} from './perspective-city-core.mjs';

const STORE = 'classroomos:perspective-city:v1';
const PAPER = '#fbfaf5';
const PENCIL = 'rgba(70, 110, 170, 0.32)';
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// The studio's markup lives here so the lesson page and Workbench's City plan tool share it.
const STUDIO_HTML = `      <div class="pc-toolbar" role="toolbar" aria-label="Drawing tools">
        <div class="pc-group" aria-label="Tool">
          <button type="button" data-tool="select" aria-pressed="false" title="Select and move (V)">↖ Select</button>
          <button type="button" data-tool="rect" aria-pressed="true" title="Draw a box (R)">▭ Box</button>
          <button type="button" data-tool="poly" aria-pressed="false" title="Draw any shape (P)">⬠ Shape</button>
          <button type="button" data-tool="stamp" aria-pressed="false" title="Stamp a footprint (S)">◈ Stamp</button>
          <button type="button" data-tool="word" aria-pressed="false" title="Block letters (T)">A Letters</button>
        </div>
        <div class="pc-group">
          <label>Stamp
            <select id="pc-stamp">
              <option value="box">Box</option><option value="slab">Slab</option><option value="ell">L</option>
              <option value="tee">T</option><option value="plus">Plus</option><option value="tri">Triangle</option>
              <option value="wedge">Wedge</option><option value="hex">Hexagon</option><option value="round">Round tower</option>
              <option value="ring">Courtyard</option><option value="star">Star</option>
            </select>
          </label>
          <label>Size <output id="pc-size-out">4</output>
            <input id="pc-size" type="range" min="1" max="5" step="0.5" value="2">
          </label>
          <label>Word <input id="pc-word" type="text" maxlength="8" value="CITY" autocomplete="off" spellcheck="false"></label>
        </div>
        <div class="pc-group">
          <button type="button" id="pc-undo" title="Undo (Ctrl+Z)">↶ Undo</button>
          <button type="button" id="pc-sample">Sample</button>
          <button type="button" id="pc-random">Random</button>
          <button type="button" id="pc-clear">Clear</button>
          <a id="pc-workbench" class="pc-workbench" hidden>Build it in Workbench →</a>
        </div>
      </div>

      <div class="pc-panes">
        <div class="pc-pane pc-plan-pane" data-night-keep>
          <p class="pc-pane-label"><strong>1 · Plan</strong> <span>draw footprints here</span></p>
          <canvas id="pc-plan" tabindex="0" aria-label="Plan view: a 24 by 24 grid. Draw footprints with the chosen tool. Keys: V select, R box, P shape, S stamp, T letters, N next tower, arrows move, [ and ] change height, Delete removes."></canvas>
        </div>
        <div class="pc-pane pc-view-pane" data-night-keep>
          <div class="pc-pane-label pc-tabs" role="tablist" aria-label="Skyline view">
            <button type="button" role="tab" data-view="sketch" aria-selected="true">2 · Sketch (one-point)</button>
            <button type="button" role="tab" data-view="3d" aria-selected="false">3D walk-around</button>
          </div>
          <canvas id="pc-sketch" tabindex="0" aria-label="Skyline drawn in one-point perspective from above. Drag anywhere, or use the arrow keys, to move the vanishing point."></canvas>
          <canvas id="pc-3d" hidden aria-label="3D model of the city. Drag to orbit, scroll to zoom."></canvas>
          <div id="pc-3d-tools" class="pc-3d-tools" hidden>
            <button type="button" id="pc-match">Match the sketch camera</button>
          </div>
        </div>
      </div>

      <div class="pc-controls">
        <fieldset class="pc-props">
          <legend id="pc-props-title">Next tower</legend>
          <label>Height <output id="pc-height-out">8</output>
            <input id="pc-height" type="range" min="0.5" max="20" step="0.5" value="8">
          </label>
          <div class="pc-inks" role="group" aria-label="Marker colour">
            <button type="button" data-ink="ink" style="--ink:#1f2328" aria-label="Black marker" aria-pressed="true"></button>
            <button type="button" data-ink="green" style="--ink:#1f9d55" aria-label="Green marker" aria-pressed="false"></button>
            <button type="button" data-ink="orange" style="--ink:#ef7d22" aria-label="Orange marker" aria-pressed="false"></button>
            <button type="button" data-ink="red" style="--ink:#d7342b" aria-label="Red marker" aria-pressed="false"></button>
            <button type="button" data-ink="blue" style="--ink:#2563eb" aria-label="Blue marker" aria-pressed="false"></button>
            <button type="button" data-ink="purple" style="--ink:#7c3aed" aria-label="Purple marker" aria-pressed="false"></button>
            <button type="button" data-ink="brown" style="--ink:#8a4b2a" aria-label="Brown marker" aria-pressed="false"></button>
          </div>
          <label>Fill
            <select id="pc-fill"><option value="paper">White paper</option><option value="tint">Light tint</option><option value="solid">Coloured in</option></select>
          </label>
          <label>Setbacks
            <select id="pc-tiers"><option value="1">None</option><option value="2">2 tiers</option><option value="3">3 tiers</option><option value="4">4 tiers</option></select>
          </label>
          <label>Roof
            <select id="pc-roof"><option value="flat">Flat</option><option value="spire">Pyramid spire</option></select>
          </label>
          <div class="pc-sel-actions">
            <button type="button" id="pc-duplicate">Copy</button>
            <button type="button" id="pc-delete">Delete</button>
          </div>
        </fieldset>

        <fieldset class="pc-camera">
          <legend>Camera &amp; marker</legend>
          <label>Camera height <output id="pc-camera-out">44</output>
            <input id="pc-camera" type="range" min="26" max="120" step="1" value="44">
          </label>
          <label>Marker weight
            <input id="pc-weight" type="range" min="1.5" max="7" step="0.5" value="4">
          </label>
          <label class="pc-check"><input id="pc-ortho" type="checkbox" checked> Construction lines to the VP</label>
          <label class="pc-check"><input id="pc-shade" type="checkbox"> Shade the walls</label>
          <label class="pc-check"><input id="pc-wobble" type="checkbox" checked> Hand-drawn wobble</label>
          <div class="pc-sel-actions">
            <button type="button" id="pc-fly" aria-pressed="false">▶ Fly over</button>
            <button type="button" id="pc-center">Centre VP</button>
            <button type="button" id="pc-shuffle">New heights</button>
          </div>
          <div class="pc-sel-actions">
            <button type="button" id="pc-png">Download PNG</button>
            <button type="button" id="pc-save">Save city</button>
            <button type="button" id="pc-open">Open city</button>
            <input id="pc-file" type="file" accept=".json,application/json" hidden aria-label="Open a saved city file">
          </div>
        </fieldset>
      </div>
      <p id="pc-status" class="pc-status" role="status" aria-live="polite"></p>
    `;

/**
 * Mount the studio into an element (empty, or holding the markup already).
 * opts.threeD      false drops the 3D walk-around tab (Workbench is the 3D view)
 * opts.workbench   a URL for the "Build it in Workbench" link, or a function to call instead
 * Returns { city() → save-file object, flush() → write the autosave now }.
 */
export function mountPerspectiveCity(root, opts = {}) {
  if (root.__perspectiveCity) return root.__perspectiveCity;
  if (!root.querySelector('#pc-plan')) root.insertAdjacentHTML('beforeend', STUDIO_HTML);
  if (opts.threeD === false) {
    root.querySelectorAll('[data-view="3d"], #pc-3d, #pc-3d-tools').forEach(n => n.remove());
    const tab = root.querySelector('[data-view="sketch"]');
    if (tab) tab.textContent = '2 · Sketch (one-point perspective)';
  }
  const api = init(root, opts);
  root.__perspectiveCity = api;
  return api;
}

for (const el of document.querySelectorAll('[data-perspective-city]')) {
  if (el.dataset.perspectiveCity !== 'manual') mountPerspectiveCity(el, { workbench: el.dataset.workbench || null });
}

function init(root, opts) {
  const $ = sel => root.querySelector(sel);
  const planCanvas = $('#pc-plan');
  const sketchCanvas = $('#pc-sketch');
  const threeCanvas = $('#pc-3d') || document.createElement('canvas');
  const statusEl = $('#pc-status');
  const propsTitle = $('#pc-props-title');
  const inputs = {
    h: $('#pc-height'), tiers: $('#pc-tiers'), roof: $('#pc-roof'), fill: $('#pc-fill'),
    D: $('#pc-camera'), ortho: $('#pc-ortho'), shade: $('#pc-shade'), wobble: $('#pc-wobble'),
    weight: $('#pc-weight'), stamp: $('#pc-stamp'), size: $('#pc-size'), word: $('#pc-word')
  };
  const hOut = $('#pc-height-out'), dOut = $('#pc-camera-out'), sizeOut = $('#pc-size-out');

  const state = {
    buildings: [], vx: GRID / 2, vy: GRID / 2, D: 44,
    tool: 'rect', ink: 'ink', selected: null,
    view: 'sketch', fly: false, flyT: 0
  };
  const grow = new Map(); // id → start time (ms)
  const undo = [];
  let draft = null;       // polygon in progress: [[x,y]...]
  let drag = null;        // active pointer gesture on the plan
  let hover = null;       // [x,y] plan point under the pointer
  let sketchDrag = null;
  let three = null;       // lazy 3D view

  // ── Persistence ──────────────────────────────────────────────
  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) { Object.assign(state, parseCity(raw)); return true; }
    } catch (e) { /* fall through to the sample */ }
    return false;
  }
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE, JSON.stringify(serializeCity(state))); } catch (e) { /* private mode */ }
    }, 250);
  }
  function snapshot() { return JSON.stringify(serializeCity(state)); }
  function pushUndo() {
    undo.push(snapshot());
    if (undo.length > 80) undo.shift();
  }
  function doUndo() {
    const prev = undo.pop();
    if (!prev) { say('Nothing to undo.'); return; }
    const sel = state.selected;
    Object.assign(state, parseCity(prev));
    state.selected = state.buildings.some(b => b.id === sel) ? sel : null;
    changed(false);
    say('Undone.');
  }

  function say(msg) { statusEl.textContent = msg; }

  function selectedBuilding() { return state.buildings.find(b => b.id === state.selected) || null; }

  function addBuildings(list, msg) {
    pushUndo();
    const now = performance.now();
    list.forEach((b, i) => { state.buildings.push(b); grow.set(b.id, now + i * 70); });
    state.selected = list.length === 1 ? list[0].id : null;
    changed(true);
    say(msg || `Built ${list.length === 1 ? 'a tower' : list.length + ' towers'}. ${state.buildings.length} in the city.`);
  }

  function newBuilding(loops) {
    return makeBuilding(loops, {
      h: +inputs.h.value, ink: state.ink, fill: inputs.fill.value,
      tiers: +inputs.tiers.value, roof: inputs.roof.value
    });
  }

  function changed(structural) {
    syncPanel();
    drawPlan();
    requestFrame();
    if (three && structural === true) three.rebuild();
    save();
  }

  // ── Building panel (edits the selection, or sets up the next tower) ──
  function syncPanel() {
    const b = selectedBuilding();
    propsTitle.textContent = b ? 'Selected tower' : 'Next tower';
    root.toggleAttribute('data-has-selection', !!b);
    if (b) {
      inputs.h.value = b.h; inputs.tiers.value = b.tiers; inputs.roof.value = b.roof; inputs.fill.value = b.fill;
      state.ink = b.ink;
    }
    hOut.textContent = `${(+inputs.h.value).toFixed(inputs.h.value % 1 ? 1 : 0)} (${Math.round(inputs.h.value * 4)} floors)`;
    root.querySelectorAll('[data-ink]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.ink === state.ink)));
    dOut.textContent = String(Math.round(state.D));
    inputs.D.value = state.D;
    sizeOut.textContent = String(+inputs.size.value * 2);
  }

  let editArmed = true;
  function editSelected(apply) {
    const b = selectedBuilding();
    if (!b) { syncPanel(); return; }
    if (editArmed) { pushUndo(); editArmed = false; }
    apply(b);
    changed(true);
  }
  for (const key of ['h', 'tiers', 'roof', 'fill']) {
    inputs[key].addEventListener('input', () => editSelected(b => {
      if (key === 'h') { b.h = +inputs.h.value; }
      else if (key === 'tiers') b.tiers = +inputs.tiers.value;
      else b[key] = inputs[key].value;
    }));
    inputs[key].addEventListener('change', () => { editArmed = true; });
  }
  root.querySelectorAll('[data-ink]').forEach(btn => btn.addEventListener('click', () => {
    state.ink = btn.dataset.ink;
    editArmed = true;
    if (selectedBuilding()) editSelected(b => { b.ink = state.ink; });
    else syncPanel();
    editArmed = true;
  }));
  inputs.D.addEventListener('input', () => { state.D = +inputs.D.value; changed('camera'); });
  for (const k of ['ortho', 'shade', 'wobble', 'weight']) inputs[k].addEventListener('input', () => requestFrame());
  inputs.size.addEventListener('input', () => { syncPanel(); drawPlan(); });
  inputs.stamp.addEventListener('change', () => setTool('stamp'));
  inputs.word.addEventListener('input', () => { inputs.word.value = sanitizeWord(inputs.word.value); setTool('word'); });

  function sanitizeWord(v) {
    return [...String(v).toUpperCase()].filter(ch => FONT[ch] || ch === ' ').join('').slice(0, 8);
  }

  // ── Tools ────────────────────────────────────────────────────
  function setTool(tool) {
    state.tool = tool;
    draft = null;
    root.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
    planCanvas.dataset.tool = tool;
    const tips = {
      select: 'Select: click a tower to edit it, drag to move it. Drag the orange eye to move the vanishing point.',
      rect: 'Box: drag on the plan to draw a rectangle footprint.',
      poly: 'Shape: click corners, then click the first corner (or press Enter) to close it.',
      stamp: 'Stamp: click to place the chosen footprint.',
      word: 'Letters: click to place the word as block-letter towers.'
    };
    say(tips[tool] || '');
    drawPlan();
  }
  root.querySelectorAll('[data-tool]').forEach(btn => btn.addEventListener('click', () => { setTool(btn.dataset.tool); planCanvas.focus({ preventScroll: true }); }));

  // ── Plan canvas ──────────────────────────────────────────────
  const plan = { ctx: planCanvas.getContext('2d'), w: 0, m: 0, cell: 0, dpr: 1 };

  function sizeCanvas(canvas, target) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    target.w = w; target.h = h; target.dpr = dpr;
  }

  function toPx([x, y]) { return [plan.m + x * plan.cell, plan.m + y * plan.cell]; }
  function fromEvent(e, snap = 1) {
    const r = planCanvas.getBoundingClientRect();
    const scale = r.width / plan.w || 1;
    const px = (e.clientX - r.left) / scale, py = (e.clientY - r.top) / scale;
    const x = (px - plan.m) / plan.cell, y = (py - plan.m) / plan.cell;
    const sx = snap ? Math.round(x / snap) * snap : x, sy = snap ? Math.round(y / snap) * snap : y;
    return [Math.max(0, Math.min(GRID, sx)), Math.max(0, Math.min(GRID, sy)), x, y];
  }

  function drawPlan() {
    sizeCanvas(planCanvas, plan);
    const { ctx, w, dpr } = plan;
    plan.m = Math.round(w * 0.035);
    plan.cell = (w - plan.m * 2) / GRID;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, w);
    // Grid
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      ctx.strokeStyle = i % 6 === 0 ? 'rgba(60, 100, 160, 0.30)' : 'rgba(60, 100, 160, 0.12)';
      const p = plan.m + i * plan.cell;
      ctx.beginPath(); ctx.moveTo(p, plan.m); ctx.lineTo(p, w - plan.m); ctx.moveTo(plan.m, p); ctx.lineTo(w - plan.m, p); ctx.stroke();
    }
    // Footprints
    const sel = state.selected;
    for (const b of state.buildings) {
      const col = MARKERS[b.ink];
      ctx.beginPath();
      for (const l of b.loops) traceLoop(ctx, l.map(toPx));
      ctx.globalAlpha = b.fill === 'solid' ? 0.85 : b.fill === 'tint' ? 0.3 : 0.12;
      ctx.fillStyle = col; ctx.fill('evenodd');
      ctx.globalAlpha = 1;
      ctx.lineWidth = b.id === sel ? 3 : 2; ctx.strokeStyle = b.fill === 'solid' ? MARKERS.ink : col; ctx.stroke();
      // Tier outlines and height label
      if (b.tiers > 1) {
        ctx.save(); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        tiersOf(b).slice(1).forEach(t => { ctx.beginPath(); for (const l of t.loops) traceLoop(ctx, l.map(toPx)); ctx.stroke(); });
        ctx.restore();
      }
      const [cx, cy] = toPx(labelSpot(b));
      ctx.font = `700 ${Math.max(10, plan.cell * 0.55)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = PAPER; ctx.strokeText(fmtH(b.h), cx, cy);
      ctx.fillStyle = '#1f2328'; ctx.fillText(fmtH(b.h), cx, cy);
      if (b.id === sel) {
        const bb = bounds(b.loops);
        const [x0, y0] = toPx([bb.x0, bb.y0]), [x1, y1] = toPx([bb.x1, bb.y1]);
        ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#ef7d22'; ctx.lineWidth = 2;
        ctx.strokeRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8); ctx.restore();
      }
    }
    // Ghosts and drafts
    ctx.save();
    ctx.strokeStyle = MARKERS[state.ink]; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    if (drag && drag.kind === 'rect') {
      ctx.beginPath(); traceLoop(ctx, rectLoop(drag.a[0], drag.a[1], drag.b[0], drag.b[1]).map(toPx)); ctx.stroke();
    }
    if (draft && draft.length) {
      ctx.beginPath();
      draft.forEach((p, i) => { const [x, y] = toPx(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      if (hover) { const [x, y] = toPx(hover); ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.setLineDash([]);
      draft.forEach((p, i) => { const [x, y] = toPx(p); ctx.beginPath(); ctx.arc(x, y, i === 0 ? 6 : 3.5, 0, Math.PI * 2); ctx.fillStyle = i === 0 ? '#ef7d22' : MARKERS[state.ink]; ctx.fill(); });
    }
    if (hover && !drag && (state.tool === 'stamp' || state.tool === 'word')) {
      ctx.globalAlpha = 0.6; ctx.beginPath();
      for (const loops of ghostLoops(hover)) for (const l of loops) traceLoop(ctx, l.map(toPx));
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // The camera's spot = where the vanishing point sits over the plan
    drawEye(ctx, toPx([state.vx, state.vy]), plan.cell);
  }

  function fmtH(h) { return (Math.round(h * 2) / 2).toString(); }

  function labelSpot(b) {
    const c = centroid(b.loops[0]);
    if (pointInLoops(c, b.loops)) return c;
    // Concave or ring footprints: use the first vertex nudged inward.
    const [x, y] = b.loops[0][0];
    return [x + 0.5, y + 0.5];
  }

  function drawEye(ctx, [x, y], cell) {
    const r = Math.max(7, cell * 0.45);
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ef7d22'; ctx.fillStyle = 'rgba(239, 125, 34, 0.18)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x + r * 1.6, y); ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y + r * 1.6); ctx.stroke();
    ctx.fillStyle = '#b4520f'; ctx.font = `700 ${Math.max(10, cell * 0.5)}px system-ui, sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('VP', x + r + 2, y - 2);
    ctx.restore();
  }

  function ghostLoops([x, y]) {
    if (state.tool === 'stamp') {
      const s = +inputs.size.value;
      return [STAMPS[inputs.stamp.value].make(x, y, s)];
    }
    const word = inputs.word.value || 'CITY';
    const out = [];
    const start = wordOrigin(word, x, y);
    [...word].forEach((ch, i) => { for (const loops of letterPieces(ch, start[0] + i * 6, start[1])) out.push(loops); });
    return out;
  }

  function wordOrigin(word, x, y) {
    const w = wordWidth(word);
    return [Math.max(0, Math.min(GRID - w, Math.round(x - w / 2))), Math.max(0, Math.min(GRID - 5, Math.round(y - 2)))];
  }

  function traceLoop(ctx, pts) {
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }

  function hitBuilding([, , x, y]) {
    for (let i = state.buildings.length - 1; i >= 0; i--) {
      if (pointInLoops([x, y], state.buildings[i].loops)) return state.buildings[i];
    }
    return null;
  }

  function nearEye([, , x, y]) {
    return Math.hypot(x - state.vx, y - state.vy) < 0.9;
  }

  planCanvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    planCanvas.focus({ preventScroll: true });
    stopFly();
    const p = fromEvent(e);
    if (nearEye(p) && state.tool !== 'poly') {
      drag = { kind: 'eye' };
    } else if (state.tool === 'select') {
      const b = hitBuilding(p);
      state.selected = b ? b.id : null;
      editArmed = true;
      if (b) drag = { kind: 'move', b, start: p, orig: b.loops, moved: false };
      changed(false);
    } else if (state.tool === 'rect') {
      drag = { kind: 'rect', a: p, b: p };
    } else if (state.tool === 'poly') {
      const pt = [p[0], p[1]];
      if (draft && draft.length >= 3 && Math.hypot(pt[0] - draft[0][0], pt[1] - draft[0][1]) < 0.6) { closeDraft(); return; }
      draft = draft || [];
      const last = draft[draft.length - 1];
      if (!last || last[0] !== pt[0] || last[1] !== pt[1]) draft.push(pt);
      drawPlan();
      return;
    } else if (state.tool === 'stamp' || state.tool === 'word') {
      placeGhost(p);
      return;
    }
    if (drag) planCanvas.setPointerCapture(e.pointerId);
  });

  planCanvas.addEventListener('pointermove', e => {
    const p = fromEvent(e);
    hover = [p[0], p[1]];
    if (!drag) {
      planCanvas.style.cursor = nearEye(p) ? 'grab' : '';
      if (state.tool === 'poly' && draft || state.tool === 'stamp' || state.tool === 'word') drawPlan();
      return;
    }
    if (drag.kind === 'eye') {
      state.vx = Math.max(-2, Math.min(GRID + 2, p[2]));
      state.vy = Math.max(-2, Math.min(GRID + 2, p[3]));
      changed('camera');
    } else if (drag.kind === 'rect') {
      drag.b = p; drawPlan();
    } else if (drag.kind === 'move') {
      const dx = Math.round(p[2] - drag.start[2]), dy = Math.round(p[3] - drag.start[3]);
      if (!drag.moved && (dx || dy)) { pushUndo(); drag.moved = true; }
      drag.b.loops = translateLoops(drag.orig, dx, dy);
      changed(true);
    }
  });

  planCanvas.addEventListener('pointerup', () => {
    if (!drag) return;
    if (drag.kind === 'rect') {
      let [x0, y0] = drag.a, [x1, y1] = drag.b;
      if (Math.abs(x1 - x0) < 1 && Math.abs(y1 - y0) < 1) { x0 -= 1; y0 -= 1; x1 = x0 + 2; y1 = y0 + 2; }
      if (x0 === x1) x1 = x0 + 1;
      if (y0 === y1) y1 = y0 + 1;
      addBuildings([newBuilding([rectLoop(x0, y0, x1, y1)])]);
    } else if (drag.kind === 'eye') {
      say(`Vanishing point moved. Every vertical edge now runs toward it.`);
    } else if (drag.kind === 'move' && drag.moved) {
      say('Tower moved.');
    }
    drag = null;
  });
  planCanvas.addEventListener('pointerleave', () => { hover = null; if (!drag) drawPlan(); });
  planCanvas.addEventListener('dblclick', () => { if (state.tool === 'poly') closeDraft(); });

  function closeDraft() {
    if (!draft || draft.length < 3) { say('A shape needs at least three corners.'); return; }
    const loop = draft.slice();
    draft = null;
    if (selfIntersects(loop)) { say('That shape crosses itself, so it could not stand up. Try again.'); drawPlan(); return; }
    if (Math.abs(signedArea(loop)) < 0.5) { say('That shape is too thin to build.'); drawPlan(); return; }
    addBuildings([newBuilding([loop])]);
  }

  function placeGhost(p) {
    if (state.tool === 'stamp') {
      addBuildings([newBuilding(ghostLoops(p)[0])]);
      return;
    }
    const word = inputs.word.value.trim() || 'CITY';
    const [x0, y0] = wordOrigin(word, p[0], p[1]);
    const inks = ['green', 'blue', 'red', 'purple', 'orange'];
    const list = [];
    [...word].forEach((ch, i) => {
      for (const loops of letterPieces(ch, x0 + i * 6, y0)) {
        list.push(makeBuilding(loops, { h: +inputs.h.value, ink: state.ink === 'ink' ? inks[i % inks.length] : state.ink, fill: inputs.fill.value, tiers: 1, roof: 'flat' }));
      }
    });
    if (!list.length) { say('Type a word with letters or numbers first.'); return; }
    addBuildings(list, `Built “${word}” as ${list.length} block-letter towers.`);
  }

  planCanvas.addEventListener('keydown', e => {
    const b = selectedBuilding();
    const k = e.key;
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { e.preventDefault(); doUndo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tools = { v: 'select', r: 'rect', p: 'poly', s: 'stamp', t: 'word' };
    if (tools[k.toLowerCase()]) { setTool(tools[k.toLowerCase()]); e.preventDefault(); return; }
    if (k === 'Escape') { draft = null; drag = null; drawPlan(); say('Cancelled.'); return; }
    if (k === 'Enter' && draft) { e.preventDefault(); closeDraft(); return; }
    if (k === 'n' || k === 'N') {
      if (!state.buildings.length) return;
      const i = state.buildings.findIndex(x => x.id === state.selected);
      const next = state.buildings[(i + (e.shiftKey ? -1 : 1) + state.buildings.length) % state.buildings.length];
      state.selected = next.id; editArmed = true; changed(false);
      say(`Selected tower ${state.buildings.indexOf(next) + 1} of ${state.buildings.length}, height ${fmtH(next.h)}.`);
      e.preventDefault(); return;
    }
    if (!b) return;
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
    const nudge = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (nudge) { e.preventDefault(); pushUndo(); b.loops = translateLoops(b.loops, nudge[0], nudge[1]); changed(true); return; }
    if (k === '[' || k === ']') {
      e.preventDefault(); pushUndo();
      b.h = Math.max(0.5, Math.min(MAX_HEIGHT, b.h + (k === ']' ? 1 : -1)));
      changed(true); say(`Height ${fmtH(b.h)}.`);
    }
  });

  function deleteSelected() {
    const b = selectedBuilding();
    if (!b) return;
    pushUndo();
    state.buildings = state.buildings.filter(x => x !== b);
    state.selected = null;
    changed(true);
    say('Tower removed.');
  }

  // ── Sketch canvas: one-point perspective in marker ───────────
  const sketch = { ctx: sketchCanvas.getContext('2d'), w: 0, h: 0, dpr: 1 };
  let frameQueued = false;

  function requestFrame() {
    if (frameQueued) return;
    frameQueued = true;
    const run = t => { frameQueued = false; tick(t); };
    if (window.SimKit && window.SimKit.frame) window.SimKit.frame(state.view === '3d' ? threeCanvas : sketchCanvas, run);
    else requestAnimationFrame(run);
  }

  let lastT = 0;
  function tick(t) {
    const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0;
    lastT = t;
    if (state.fly) {
      state.flyT += dt * (reduceMotion ? 0.12 : 0.35);
      const r = GRID * 0.32;
      state.vx = GRID / 2 + Math.cos(state.flyT) * r;
      state.vy = GRID / 2 + Math.sin(state.flyT) * r;
      drawPlan();
    }
    const now = performance.now();
    let animating = state.fly;
    for (const [id, start] of grow) {
      if (now - start > 900) grow.delete(id); else animating = true;
    }
    if (state.view === 'sketch') drawSketch(sketchCanvas, sketch);
    else if (three) three.render(heightFactor);
    if (animating) requestFrame(); else lastT = 0;
  }

  function heightFactor(b) {
    const start = grow.get(b.id);
    if (start == null || reduceMotion) return 1;
    const u = Math.max(0, Math.min(1, (performance.now() - start) / 850));
    const c = 1.4; // a small overshoot, like a tower settling
    return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
  }

  function viewFor(w, h) {
    const s = Math.min(w, h) / (GRID * 1.45);
    return { ox: w / 2 - (GRID / 2) * s, oy: h / 2 - (GRID / 2) * s, s, vx: state.vx, vy: state.vy, D: state.D };
  }

  function drawSketch(canvas, box, opts = {}) {
    if (!opts.fixed) sizeCanvas(canvas, box);
    const ctx = box.ctx;
    const { w, h, dpr } = box;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);
    const v = viewFor(w, h);
    const lw = +inputs.weight.value * Math.min(w, h) / 560;
    const wobble = inputs.wobble.checked ? lw * 0.9 : 0;
    const shade = inputs.shade.checked;
    const ops = sketchOps(state.buildings, v, b => b.h * heightFactor(b));
    const [vpx, vpy] = vanishingPoint(v);

    // Construction lines: from every roof corner back to the vanishing point.
    if (inputs.ortho.checked) {
      ctx.save();
      ctx.strokeStyle = PENCIL; ctx.lineWidth = Math.max(0.75, lw * 0.25); ctx.setLineDash([4, 5]);
      ctx.beginPath();
      for (const op of ops) {
        if (op.kind !== 'roof') continue;
        for (const l of op.loops) for (const [x, y] of l) {
          const dx = x - vpx, dy = y - vpy;
          ctx.moveTo(vpx, vpy); ctx.lineTo(x + dx * 0.06, y + dy * 0.06);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const op of ops) {
      const b = op.b;
      const col = MARKERS[b.ink];
      const line = b.fill === 'solid' ? MARKERS.ink : col;
      ctx.beginPath();
      if (op.kind === 'roof') for (const l of op.loops) markerPath(ctx, l, wobble);
      else markerPath(ctx, op.pts, wobble);
      ctx.fillStyle = faceFill(b, op, shade);
      ctx.fill('evenodd');
      ctx.strokeStyle = line; ctx.lineWidth = lw;
      ctx.stroke();
    }

    // Vanishing point
    ctx.save();
    ctx.strokeStyle = '#ef7d22'; ctx.fillStyle = '#ef7d22'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(vpx, vpy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(vpx, vpy, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `700 ${Math.max(11, w / 48)}px system-ui, sans-serif`;
    ctx.textBaseline = 'bottom'; ctx.fillStyle = '#b4520f';
    ctx.fillText('VP', vpx + 13, vpy - 6);
    ctx.restore();
  }

  function faceFill(b, op, shade) {
    const col = MARKERS[b.ink];
    const isTop = op.kind === 'roof';
    const s = isTop ? 0 : (shade ? op.shade : 0.15);
    if (b.fill === 'solid') return mix(col, '#1a1414', isTop ? 0 : 0.2 + 0.35 * s);
    const base = b.fill === 'tint' ? mix('#ffffff', col, 0.22) : '#ffffff';
    if (!shade || isTop) return base;
    return mix(base, '#5c6470', 0.05 + 0.28 * s);
  }

  /** A marker stroke: straight, or bowed a little by a hash of its ends (the same every frame). */
  function markerPath(ctx, pts, wobble) {
    pts.forEach(([x, y], i) => {
      if (!i) { ctx.moveTo(x, y); return; }
      segment(ctx, pts[i - 1], [x, y], wobble);
    });
    segment(ctx, pts[pts.length - 1], pts[0], wobble);
    ctx.closePath();
  }
  function segment(ctx, a, b, wobble) {
    if (!wobble) { ctx.lineTo(b[0], b[1]); return; }
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    // Hash on the unordered pair so shared edges bow the same way from both faces.
    const key = Math.round(a[0] * 7 + b[0] * 7) * 31 + Math.round(a[1] * 7 + b[1] * 7) * 17;
    const j = (((Math.sin(key) * 43758.5453) % 1) - 0.5) * 2 * Math.min(wobble, L * 0.04);
    const sgn = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? 1 : -1;
    ctx.quadraticCurveTo((a[0] + b[0]) / 2 - (dy / L) * j * sgn, (a[1] + b[1]) / 2 + (dx / L) * j * sgn, b[0], b[1]);
  }

  // Drag the vanishing point on the sketch too.
  sketchCanvas.addEventListener('pointerdown', e => {
    const r = sketchCanvas.getBoundingClientRect();
    const scale = r.width / sketch.w || 1;
    const px = (e.clientX - r.left) / scale, py = (e.clientY - r.top) / scale;
    const v = viewFor(sketch.w, sketch.h);
    const [vpx, vpy] = vanishingPoint(v);
    stopFly();
    sketchDrag = { v, near: Math.hypot(px - vpx, py - vpy) < 28 };
    sketchCanvas.setPointerCapture(e.pointerId);
    moveVpTo(px, py);
  });
  sketchCanvas.addEventListener('pointermove', e => {
    if (!sketchDrag) return;
    const r = sketchCanvas.getBoundingClientRect();
    const scale = r.width / sketch.w || 1;
    moveVpTo((e.clientX - r.left) / scale, (e.clientY - r.top) / scale);
  });
  sketchCanvas.addEventListener('pointerup', () => { if (sketchDrag) say('Vanishing point moved. Drag it again, or try ▶ Fly over.'); sketchDrag = null; });
  function moveVpTo(px, py) {
    const v = sketchDrag.v;
    state.vx = Math.max(-4, Math.min(GRID + 4, (px - v.ox) / v.s));
    state.vy = Math.max(-4, Math.min(GRID + 4, (py - v.oy) / v.s));
    changed('camera');
  }
  sketchCanvas.addEventListener('keydown', e => {
    const step = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, -0.5], ArrowDown: [0, 0.5] }[e.key];
    if (!step) return;
    e.preventDefault(); stopFly();
    state.vx += step[0]; state.vy += step[1];
    changed('camera');
  });

  // ── Buttons ──────────────────────────────────────────────────
  const on = (sel, fn) => { const el = $(sel); if (el) el.addEventListener('click', fn); };
  on('#pc-undo', doUndo);
  on('#pc-delete', deleteSelected);
  on('#pc-duplicate', () => {
    const b = selectedBuilding();
    if (!b) return;
    const copy = makeBuilding(translateLoops(b.loops, 1, 1), { ...b, id: undefined });
    addBuildings([copy], 'Copied. Drag the copy where you want it.');
  });
  on('#pc-sample', () => { pushUndo(); state.buildings = []; state.selected = null; addBuildings(sampleCity(), 'The sketchbook city. Drag the VP and watch every edge swing.'); });
  on('#pc-random', () => { pushUndo(); state.buildings = []; state.selected = null; addBuildings(randomCity(Math.floor(Math.random() * 1e9)), 'A random city. Tall towers cluster near the middle.'); });
  on('#pc-clear', () => { pushUndo(); state.buildings = []; state.selected = null; changed(true); say('Clear plan. Press Undo to bring the city back.'); });
  on('#pc-center', () => { stopFly(); state.vx = GRID / 2; state.vy = GRID / 2; changed('camera'); say('Vanishing point back in the centre.'); });
  on('#pc-shuffle', () => {
    if (!state.buildings.length) return;
    pushUndo();
    const now = performance.now();
    state.buildings.forEach((b, i) => {
      const [cx, cy] = centroid(b.loops[0]);
      const near = Math.hypot(cx - GRID / 2, cy - GRID / 2) / (GRID / 2);
      b.h = Math.max(1, Math.min(MAX_HEIGHT, Math.round(2 + (1 - near) * 10 + Math.random() * 7)));
      grow.set(b.id, now + i * 40);
    });
    changed(true); say('New heights. Notice how a taller tower leans farther from the VP.');
  });
  const flyBtn = $('#pc-fly');
  on('#pc-fly', () => { state.fly ? stopFly() : startFly(); });
  function startFly() {
    state.fly = true;
    state.flyT = Math.atan2(state.vy - GRID / 2, state.vx - GRID / 2);
    flyBtn.setAttribute('aria-pressed', 'true'); flyBtn.textContent = '❚❚ Stop';
    say('Flying over the city: the camera circles, so the vanishing point does too.');
    requestFrame();
  }
  function stopFly() {
    if (!state.fly) return;
    state.fly = false;
    flyBtn.setAttribute('aria-pressed', 'false'); flyBtn.textContent = '▶ Fly over';
    save();
  }

  on('#pc-png', () => {
    const off = document.createElement('canvas');
    off.width = off.height = 1600;
    const box = { ctx: off.getContext('2d'), w: 1600, h: 1600, dpr: 1 };
    drawSketch(off, box, { fixed: true });
    off.toBlob(blob => download(blob, 'perspective-city.png'), 'image/png');
  });
  on('#pc-save', () => {
    download(new Blob([JSON.stringify(serializeCity(state), null, 1)], { type: 'application/json' }), 'my-city.city.json');
  });
  const fileInput = $('#pc-file');
  on('#pc-open', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    try {
      if (f.size > 2e6) throw new Error('That file is too big to be a city.');
      const next = parseCity(await f.text());
      pushUndo();
      Object.assign(state, next);
      state.selected = null;
      const now = performance.now();
      state.buildings.forEach((b, i) => grow.set(b.id, now + i * 50));
      changed(true);
      say(`Opened ${f.name}: ${state.buildings.length} towers.`);
    } catch (err) {
      say(`Could not open that file. ${err.message}`);
    }
  });

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ── View tabs: Sketch | 3D ───────────────────────────────────
  root.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
  on('#pc-match', () => { if (three) three.matchSketch(); });

  async function setView(view) {
    state.view = view;
    root.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === view)));
    sketchCanvas.hidden = view !== 'sketch';
    threeCanvas.hidden = view !== '3d';
    const tools3d = $('#pc-3d-tools');
    if (tools3d) tools3d.hidden = view !== '3d';
    if (view === '3d' && !three) {
      say('Loading the 3D view…');
      try {
        three = await createThreeView(threeCanvas, state, heightFactor);
        three.rebuild();
        say('3D view: drag to orbit, scroll or pinch to zoom. “Match the sketch” puts the camera where the drawing’s eye is.');
      } catch (err) {
        say('The 3D view needs WebGL, which this browser could not start. The sketch view still works.');
        setView('sketch');
        return;
      }
    }
    requestFrame();
  }

  // ── Start ────────────────────────────────────────────────────
  if (!load()) {
    state.buildings = sampleCity();
    const now = performance.now() + 300;
    state.buildings.forEach((b, i) => grow.set(b.id, now + i * 90));
  }
  setTool(state.tool);
  syncPanel();
  drawPlan();
  requestFrame();
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => { drawPlan(); requestFrame(); if (three) three.resize(); });
    ro.observe(planCanvas); ro.observe(sketchCanvas); ro.observe(threeCanvas);
  }

  function flush() {
    clearTimeout(saveTimer);
    try { localStorage.setItem(STORE, JSON.stringify(serializeCity(state))); } catch (e) { /* private mode */ }
  }
  const wb = $('#pc-workbench');
  if (wb && opts.workbench) {
    wb.hidden = false;
    if (typeof opts.workbench === 'function') {
      wb.setAttribute('role', 'button'); wb.tabIndex = 0; wb.textContent = 'Raise it in Workbench →';
      const go = e => { e.preventDefault(); stopFly(); flush(); opts.workbench(serializeCity(state)); };
      wb.addEventListener('click', go);
      wb.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(e); });
    } else {
      wb.href = opts.workbench;
      wb.addEventListener('click', () => { stopFly(); flush(); });
    }
  }

  return {
    city: () => serializeCity(state),
    flush,
    /** Pick up a city saved by another page (the lesson and Workbench share one autosave). */
    reload() {
      if (load()) { state.selected = null; changed(true); }
      requestFrame();
    },
    redraw() { drawPlan(); requestFrame(); }
  };
}

function mix(a, b, t) {
  const pa = hex(a), pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ── 3D view (loaded on first use) ──────────────────────────────

async function createThreeView(canvas, state, heightFactor) {
  const base = new URL('../../vendor/three-bundle.min.js', import.meta.url).href;
  const kit = new URL('../sim-kit-three.mjs', import.meta.url).href;
  const [{ THREE, OrbitControls }, { createScene }] = await Promise.all([import(base), import(kit)]);
  const { renderer, scene, camera, syncSize } = createScene(canvas, { THREE, fov: 45, near: 0.1, far: 400, clearColor: 0xfbfaf5 });
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b2a4, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-10, 30, -14);
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GRID, GRID), new THREE.MeshBasicMaterial({ color: 0xf1ede2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(GRID / 2, -0.01, GRID / 2);
  scene.add(ground);
  const grid = new THREE.GridHelper(GRID, GRID, 0x9fb3cf, 0xd3dbe6);
  grid.position.set(GRID / 2, 0, GRID / 2);
  scene.add(grid);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshBasicMaterial({ color: 0xef7d22 }));
  scene.add(eye);
  const eyeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xef7d22, dashSize: 0.6, gapSize: 0.4 }));
  scene.add(eyeLine);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(GRID / 2, 2, GRID / 2);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 6; controls.maxDistance = 140;
  camera.position.set(GRID / 2 + 22, 26, GRID / 2 + 30);
  controls.update();

  const city = new THREE.Group();
  scene.add(city);
  const groups = new Map();

  function shapeFrom(loops) {
    const toV = ([x, y]) => new THREE.Vector2(x, -y);
    const shape = new THREE.Shape(loops[0].map(toV));
    for (const h of loops.slice(1)) shape.holes.push(new THREE.Path(h.map(toV)));
    return shape;
  }

  function materialFor(b, top) {
    const col = new THREE.Color(MARKERS[b.ink]);
    let c = new THREE.Color(0xffffff);
    if (b.fill === 'tint') c = c.lerp(col, 0.25);
    if (b.fill === 'solid') c = col.clone().lerp(new THREE.Color(0x1a1414), top ? 0 : 0.2);
    return new THREE.MeshLambertMaterial({ color: c, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  }

  function dispose(obj) {
    obj.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }

  function rebuild() {
    for (const g of groups.values()) { city.remove(g); dispose(g); }
    groups.clear();
    for (const b of state.buildings) {
      const g = new THREE.Group();
      const inkColor = b.fill === 'solid' ? MARKERS.ink : MARKERS[b.ink];
      for (const t of tiersOf(b)) {
        const geo = new THREE.ExtrudeGeometry(shapeFrom(t.loops), { depth: t.z1 - t.z0, bevelEnabled: false, curveSegments: 1 });
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, t.z0, 0);
        const mesh = new THREE.Mesh(geo, materialFor(b, false));
        g.add(mesh);
        g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: inkColor })));
      }
      if (b.roof === 'spire') {
        const tiers = tiersOf(b);
        const top = tiers[tiers.length - 1];
        const ring = top.loops[0];
        const [cx, cy] = centroid(ring);
        const apex = [cx, top.z1 + spireHeight(b), cy];
        const pos = [];
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i], c = ring[(i + 1) % ring.length];
          pos.push(a[0], top.z1, a[1], ...apex, c[0], top.z1, c[1]);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.computeVertexNormals();
        const mat = materialFor(b, true); mat.side = THREE.DoubleSide;
        g.add(new THREE.Mesh(geo, mat));
        g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: inkColor })));
      }
      g.userData.b = b;
      city.add(g);
      groups.set(b.id, g);
    }
    render(heightFactor);
  }

  function render(hf) {
    syncSize();
    for (const g of groups.values()) g.scale.y = Math.max(0.001, hf(g.userData.b));
    const eyeY = Math.min(state.D, 30);
    eye.position.set(state.vx, eyeY, state.vy);
    eyeLine.geometry.setFromPoints([new THREE.Vector3(state.vx, 0, state.vy), new THREE.Vector3(state.vx, eyeY, state.vy)]);
    eyeLine.computeLineDistances();
    renderer.render(scene, camera);
  }

  function matchSketch() {
    // The sketch's eye sits D above the plan, looking straight down.
    camera.position.set(state.vx, state.D, state.vy + 0.001);
    controls.target.set(state.vx, 0, state.vy);
    camera.fov = 2 * Math.atan((GRID * 1.45 / 2) / state.D) * 180 / Math.PI;
    // The sketch centres the plan, not the VP: slide the frame the same way (an off-axis view).
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const s = Math.min(w, h) / (GRID * 1.45) * (h / Math.min(w, h));
    camera.setViewOffset(w, h, -(state.vx - GRID / 2) * s, -(state.vy - GRID / 2) * s, w, h);
    eye.visible = eyeLine.visible = false;
    matched = true;
    controls.update();
    render(heightFactor);
  }
  let matched = false;

  controls.addEventListener('change', () => render(heightFactor));
  canvas.addEventListener('pointerdown', () => {
    if (!matched) return;
    matched = false;
    camera.fov = 45; camera.clearViewOffset();
    eye.visible = eyeLine.visible = true;
    camera.updateProjectionMatrix();
  });

  return { rebuild, render, matchSketch, resize: () => render(heightFactor) };
}
