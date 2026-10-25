// Fold & Unfold: a CAD-style blueprint game. Mounts on every [data-blueprint-game].
//   Unfold: see the 3D part, draft its Top / Front / Right views on the sheet.
//   Fold:   read the three-view blueprint, build the solid on the print bed.
// Geometry and grading live in core.mjs; this file is the drafting app around them.

import {
  VIEWS, LEVELS, PUZZLES, crop, trim, size, drawings, parseSeg, segKey,
  unitSegments, gradeUnfold, gradeFold, randomPart,
} from './core.mjs';

const NS = 'http://www.w3.org/2000/svg';
const STORE = 'classroomos:blueprint-game:v1';
const S = 34;                 // sheet px per grid square
const VIEW_NAMES = { top: 'TOP', front: 'FRONT', right: 'RIGHT SIDE' };
const VIEW_KEYS = { t: 'top', f: 'front', r: 'right' };
const DEG = Math.PI / 180;
const ISO = Math.atan(1 / Math.SQRT2) / DEG;   // 35.26°, true isometric elevation
const NAMED = { SW: [-45, ISO], SE: [45, ISO], NE: [135, ISO], NW: [-135, ISO] };
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function el(name, attrs = {}, parent) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

function readStore() {
  try { return { unfold: 0, fold: 0, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return { unfold: 0, fold: 0 }; }
}
function writeStore(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* private window */ } }

const emptyDrawing = () => Object.fromEntries(VIEWS.map((v) => [v, { visible: new Set(), hidden: new Set() }]));
const cloneDrawing = (d) => Object.fromEntries(VIEWS.map((v) => [v, { visible: new Set(d[v].visible), hidden: new Set(d[v].hidden) }]));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

const TEMPLATE = `
<div class="bpg-app" data-mode="unfold">
  <div class="bpg-titlebar">
    <span class="bpg-logo" aria-hidden="true">A</span>
    <span class="bpg-file" data-file>FOLD-UNFOLD.dwg</span>
    <div class="bpg-modes" role="tablist" aria-label="Game mode">
      <button type="button" role="tab" data-mode-btn="unfold" aria-selected="true">Unfold · 3D → blueprint</button>
      <button type="button" role="tab" data-mode-btn="fold" aria-selected="false">Fold · blueprint → 3D</button>
    </div>
  </div>
  <div class="bpg-ribbon" role="toolbar" aria-label="Drafting tools">
    <div class="bpg-group" data-for="unfold">
      <div class="bpg-btns">
        <button type="button" data-tool="line" aria-pressed="true" title="Line (L)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 20 4"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="4" r="2"/></svg>Line</button>
        <button type="button" data-tool="erase" aria-pressed="false" title="Erase (E)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 21-4-4L15 5l6 6-10 10H7ZM10 10l6 6M7 21h13"/></svg>Erase</button>
      </div>
      <span class="bpg-group-label">Draw</span>
    </div>
    <div class="bpg-group" data-for="unfold">
      <div class="bpg-btns">
        <label class="bpg-select"><span class="bpg-swatch" data-swatch aria-hidden="true"></span><select data-layer aria-label="Current layer">
          <option value="visible">VISIBLE</option><option value="hidden">HIDDEN</option></select></label>
      </div>
      <span class="bpg-group-label">Layers (H)</span>
    </div>
    <div class="bpg-group bpg-group-wide" data-for="fold">
      <div class="bpg-btns bpg-howto">Click a bed square to stack a block. Shift-click or right-click to remove one.
        <label class="bpg-check"><input type="checkbox" data-overlay> Overlay my views (hint)</label></div>
      <span class="bpg-group-label">Build</span>
    </div>
    <div class="bpg-group">
      <div class="bpg-btns">
        <label class="bpg-select"><select data-level aria-label="Level">
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard · hidden lines</option></select></label>
        <button type="button" data-act="new">New part</button>
      </div>
      <span class="bpg-group-label">Part</span>
    </div>
    <div class="bpg-group">
      <div class="bpg-btns">
        <button type="button" data-act="undo" title="Undo (Ctrl+Z)">Undo</button>
        <button type="button" data-act="clear">Clear</button>
      </div>
      <span class="bpg-group-label">Modify</span>
    </div>
    <div class="bpg-group">
      <div class="bpg-btns">
        <button type="button" class="bpg-primary" data-act="check">Check</button>
        <button type="button" data-act="reveal">Reveal</button>
      </div>
      <span class="bpg-group-label">Review</span>
    </div>
  </div>
  <div class="bpg-work">
    <div class="bpg-pane bpg-model">
      <div class="bpg-pane-head"><span>[Model] <b data-model-title>3D part</b></span>
        <span class="bpg-named" role="group" aria-label="Named views">
          <button type="button" data-named="SW" title="Southwest isometric">SW</button><button type="button" data-named="SE" title="Southeast isometric">SE</button><button type="button" data-named="NE" title="Northeast isometric">NE</button><button type="button" data-named="NW" title="Northwest isometric">NW</button>
        </span></div>
      <svg class="bpg-model-svg" data-model viewBox="0 0 480 360" tabindex="0" role="img" aria-roledescription="3D viewport"></svg>
      <div class="bpg-glass">
        <button type="button" data-act="glass" aria-pressed="false">Glass box</button>
        <input type="range" min="0" max="100" value="0" data-glass aria-label="Glass box: folded to unfolded" disabled>
        <span class="bpg-glass-note" data-glass-note></span>
      </div>
      <div class="bpg-plate-wrap" data-for="fold">
        <div class="bpg-plate-edge">BACK</div>
        <div class="bpg-plate" data-plate role="group" aria-label="Print bed. Each square is a column of blocks."></div>
        <div class="bpg-plate-edge">FRONT · you stand here</div>
      </div>
    </div>
    <div class="bpg-pane bpg-paper">
      <div class="bpg-pane-head"><span>[Layout] Sheet A-101 · <b data-sheet-title></b></span><span data-view-badge></span></div>
      <svg class="bpg-sheet-svg" data-sheet tabindex="0" role="group" aria-roledescription="drawing sheet"></svg>
    </div>
  </div>
  <div class="bpg-cmd">
    <div class="bpg-log" data-log role="log" aria-live="polite"></div>
    <label class="bpg-prompt"><span data-prompt-label>Command:</span>
      <input type="text" data-cmd autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type HELP, or LINE 0,0 3,0" aria-label="Command line"></label>
  </div>
  <div class="bpg-status">
    <span class="bpg-coords" data-coords>FRONT  0, 0</span>
    <button type="button" data-toggle="grid" aria-pressed="true">GRID</button>
    <span class="bpg-on">SNAP</span><span class="bpg-on">ORTHO</span>
    <span data-layer-status>LAYER: VISIBLE</span>
    <span class="bpg-score" data-score></span>
  </div>
</div>`;

class BlueprintGame {
  constructor(root) {
    this.root = root;
    root.innerHTML = TEMPLATE;
    const $ = (s) => root.querySelector(s);
    this.app = $('.bpg-app');
    this.sheet = $('[data-sheet]');
    this.model = $('[data-model]');
    this.plateEl = $('[data-plate]');
    this.logEl = $('[data-log]');
    this.cmd = $('[data-cmd]');
    this.glassRange = $('[data-glass]');
    this.store = readStore();
    this.st = {
      mode: 'unfold', level: 'easy', tool: 'line', layer: 'visible', view: 'front', grid: true,
      start: null, cursor: null, prompt: null, feedback: null, solved: false, revealed: false,
      overlay: false, cam: { az: 35, el: 28 }, glass: false, t: 0,
    };
    this.seen = {};
    this.history = [];
    this.cmdHistory = [];
    this.wire();
    this.newPart();
    this.log('ClassroomOS CAD ready. Type HELP for commands.', 'sys');
  }

  // ── puzzle setup ────────────────────────────────────────────
  nextPuzzle() {
    const list = PUZZLES[this.st.level], key = this.st.mode + ':' + this.st.level;
    const i = this.seen[key] = (this.seen[key] ?? -1) + 1;
    if (i < list.length) return list[i];
    return randomPart(this.st.level, Math.random, list.map((p) => p.heights));
  }

  newPart(part = this.nextPuzzle()) {
    const st = this.st;
    st.part = { name: part.name, heights: trim(part.heights) };
    st.target = drawings(st.part.heights);
    st.dims = size(st.part.heights);
    st.G = Math.max(st.dims.W, st.dims.D, st.dims.H + 1, 4) + 2;   // room for the title block
    st.drawn = emptyDrawing();
    const P = Math.max(st.dims.W, st.dims.D, 3) + 1;
    st.plate = Array.from({ length: P }, () => Array(P).fill(0));
    st.maxH = Math.min(st.dims.H + 1, 5);
    st.start = null; st.prompt = null; st.feedback = null; st.solved = false; st.revealed = false;
    st.glass = false; st.t = 0;
    this.stopGlass();
    this.history = [];
    this.buildPlate();
    this.renderAll();
    const task = st.mode === 'unfold' ? 'Draft its TOP, FRONT and RIGHT views.' : 'Build the solid this blueprint shows.';
    this.log('NEW  ' + st.part.name + ' · ' + LEVELS[st.level].label + '. ' + task, 'sys');
  }

  setMode(mode) {
    if (mode === this.st.mode) return;
    this.st.mode = mode;
    this.app.dataset.mode = mode;
    this.root.querySelectorAll('[data-mode-btn]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.modeBtn === mode)));
    this.newPart();
  }

  // ── the user's work ─────────────────────────────────────────
  snapshot() {
    this.history.push(this.st.mode === 'unfold' ? { drawn: cloneDrawing(this.st.drawn) } : { plate: this.st.plate.map((r) => r.slice()) });
    if (this.history.length > 200) this.history.shift();
    this.st.feedback = null;
  }

  undo() {
    const last = this.history.pop();
    if (!last) return this.log('Nothing to undo.', 'warn');
    if (last.drawn) this.st.drawn = last.drawn;
    if (last.plate) this.st.plate = last.plate;
    this.st.feedback = null;
    this.renderAll();
    this.log('UNDO');
  }

  clear() {
    const st = this.st;
    this.snapshot();
    if (st.mode === 'unfold') st.drawn = emptyDrawing();
    else st.plate = st.plate.map((r) => r.map(() => 0));
    st.start = null;
    this.renderAll();
    this.log('CLEAR  everything erased (Undo brings it back).');
  }

  addLine(view, a, b, layer = this.st.layer) {
    const keys = unitSegments(a.u, a.v, b.u, b.v);
    if (!keys) { this.log('ORTHO is on: lines run straight across or straight up.', 'warn'); return false; }
    if (!keys.length) return false;
    this.snapshot();
    const d = this.st.drawn[view], other = layer === 'visible' ? 'hidden' : 'visible';
    keys.forEach((k) => { d[layer].add(k); d[other].delete(k); });
    this.renderSheet();
    return true;
  }

  eraseKeys(view, keys) {
    const d = this.st.drawn[view];
    const hit = keys.filter((k) => d.visible.has(k) || d.hidden.has(k));
    if (!hit.length) return 0;
    this.snapshot();
    hit.forEach((k) => { d.visible.delete(k); d.hidden.delete(k); });
    this.renderSheet();
    return hit.length;
  }

  setHeight(c, r, h) {
    const st = this.st;
    if (!st.plate[r] || st.plate[r][c] == null) return;
    const next = Math.max(0, Math.min(st.maxH, h));
    if (next === st.plate[r][c]) return;
    this.snapshot();
    st.plate[r][c] = next;
    this.renderPlate();
    this.renderModel();
    this.renderSheet();
  }

  // ── review ──────────────────────────────────────────────────
  check() {
    const st = this.st;
    if (st.mode === 'unfold') {
      const hiddenCounts = LEVELS[st.level].hidden;
      const res = gradeUnfold(st.target, st.drawn, { hidden: hiddenCounts });
      st.feedback = res;
      this.renderSheet();
      if (res.ok) return this.win();
      const parts = VIEWS.map((v) => {
        const r = res.views[v];
        if (r.ok) return VIEW_NAMES[v] + ' ✓';
        const bits = [];
        if (r.missingVisible.length) bits.push(plural(r.missingVisible.length, 'missing line'));
        if (r.extraVisible.length) bits.push(plural(r.extraVisible.length, 'extra line'));
        if (r.missingHidden.length) bits.push(plural(r.missingHidden.length, 'missing hidden line'));
        if (hiddenCounts && r.extraHidden.length) bits.push(plural(r.extraHidden.length, 'extra hidden line'));
        return VIEW_NAMES[v] + ': ' + bits.join(', ');
      });
      this.log('CHECK  ' + parts.join(' · ') + '. Pink dashes = missing, red = extra.', 'warn');
      const wrong = VIEWS.reduce((n, v) => n + res.views[v].wrongLayer.length, 0);
      if (wrong) this.log('Hint: ' + plural(wrong, 'line') + ' you drew solid ' + (wrong === 1 ? 'is' : 'are') + ' behind something. Put ' + (wrong === 1 ? 'it' : 'them') + ' on the HIDDEN layer (dashed).', 'hint');
      else if (!hiddenCounts && VIEWS.some((v) => st.target[v].hidden.size)) this.log('Tip: this part has hidden edges. They don’t count on this level, but try them on the HIDDEN layer.', 'hint');
      return;
    }
    const built = trim(st.plate);
    if (!built.length) return this.log('CHECK  The bed is empty. Click a square on the bed to stack blocks.', 'warn');
    const res = gradeFold(st.part.heights, st.plate);
    st.feedback = res;
    this.renderSheet();
    if (res.ok) return this.win();
    const parts = VIEWS.map((v) => VIEW_NAMES[v] + (res.views[v].ok ? ' ✓' : ' ✗'));
    this.log('CHECK  ' + parts.join(' · ') + '. On the sheet, red = your solid makes this line, pink = the blueprint needs it.', 'warn');
  }

  win() {
    const st = this.st;
    if (!st.solved && !st.revealed) {
      this.store[st.mode] = (this.store[st.mode] || 0) + 1;
      writeStore(this.store);
    }
    st.solved = true;
    this.renderStatus();
    this.renderSheet();
    const msg = st.mode === 'unfold'
      ? 'All three views match. Watch the glass box unfold into your blueprint.'
      : 'Your solid casts exactly these three views. Watch them fold out of the glass box.';
    this.log('✔ ' + (st.revealed ? 'Matches (after a reveal).' : 'Solved!') + ' ' + msg, 'ok');
    this.setGlass(true);
    this.animateGlass(1);
  }

  reveal() {
    const st = this.st;
    st.revealed = true;
    if (st.mode === 'fold') {
      this.snapshot();
      const { W, D } = st.dims, P = st.plate.length;
      const c0 = Math.floor((P - W) / 2), r0 = Math.floor((P - D) / 2);
      st.plate = st.plate.map((row, r) => row.map((_, c) => st.part.heights[r - r0]?.[c - c0] || 0));
      this.renderPlate();
      this.renderModel();
    }
    this.renderSheet();
    this.updateGlassControls();
    this.log('REVEAL  ' + (st.mode === 'unfold' ? 'The answer is drawn in green. Copy it, then Check.' : 'The bed now holds one solid that fits. Press New part to earn a solve.'), 'hint');
  }

  // ── glass box ───────────────────────────────────────────────
  glassAllowed() {
    const st = this.st;
    return st.mode === 'fold' || st.solved || st.revealed;
  }

  setGlass(on) {
    this.st.glass = on && this.glassAllowed();
    if (!this.st.glass) this.st.t = 0;
    this.updateGlassControls();
    this.renderModel();
  }

  updateGlassControls() {
    const st = this.st, allowed = this.glassAllowed();
    const btn = this.root.querySelector('[data-act="glass"]');
    btn.setAttribute('aria-pressed', String(st.glass));
    btn.disabled = !allowed;
    this.glassRange.disabled = !st.glass;
    this.glassRange.value = String(Math.round(st.t * 100));
    this.root.querySelector('[data-glass-note]').textContent = !allowed
      ? 'Unlocks when your drawing checks out (or after Reveal).'
      : st.glass ? (st.t > 0.98 ? 'Unfolded: the sheet’s layout.' : st.t < 0.02 ? 'Folded: views on the glass walls.' : 'Unfolding…') : 'Put the part in a glass box.';
  }

  // Frames go through SimKit's gate when the page has it, so an off-screen box waits.
  frame(cb) { return window.SimKit?.frame ? window.SimKit.frame(this.model, cb) : requestAnimationFrame(cb); }
  stopGlass() {
    if (this.anim == null) return;
    if (window.SimKit?.frame) window.SimKit.frame.cancel(this.model, this.anim); else cancelAnimationFrame(this.anim);
    this.anim = null;
  }

  animateGlass(to) {
    const st = this.st;
    this.stopGlass();
    if (reduceMotion()) { st.t = to; this.updateGlassControls(); this.renderModel(); return; }
    const from = st.t, start = performance.now(), dur = 1700 * Math.abs(to - from) + 1;
    const frame = (cb) => this.frame(cb);
    const step = (now) => {
      const k = Math.min(1, (now - start) / dur);
      st.t = from + (to - from) * ease(k);
      this.updateGlassControls();
      this.renderModel();
      this.anim = k < 1 ? frame(step) : null;
    };
    this.anim = frame(step);
  }

  // ── wiring ──────────────────────────────────────────────────
  wire() {
    const root = this.root, st = this.st;
    root.querySelectorAll('[data-mode-btn]').forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.modeBtn)));
    root.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => this.setTool(b.dataset.tool)));
    root.querySelector('[data-layer]').addEventListener('change', (e) => this.setLayer(e.target.value));
    root.querySelector('[data-level]').addEventListener('change', (e) => { st.level = e.target.value; this.newPart(); });
    root.querySelector('[data-overlay]').addEventListener('change', (e) => { st.overlay = e.target.checked; this.renderSheet(); });
    root.querySelector('[data-toggle="grid"]').addEventListener('click', (e) => {
      st.grid = !st.grid; e.currentTarget.setAttribute('aria-pressed', String(st.grid)); this.renderSheet();
    });
    const acts = {
      new: () => this.newPart(), undo: () => this.undo(), clear: () => this.clear(),
      check: () => this.check(), reveal: () => this.reveal(),
      glass: () => { this.setGlass(!st.glass); if (st.glass) this.animateGlass(st.t > 0.5 ? 0 : 1); },
    };
    root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => acts[b.dataset.act]()));
    root.querySelectorAll('[data-named]').forEach((b) => b.addEventListener('click', () => {
      [st.cam.az, st.cam.el] = NAMED[b.dataset.named]; this.renderModel();
    }));
    this.glassRange.addEventListener('input', () => { this.stopGlass(); st.t = this.glassRange.value / 100; this.updateGlassControls(); this.renderModel(); });

    this.wireModel();
    this.wireSheet();
    this.wireCommandLine();
    this.app.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.target !== this.cmd) { e.preventDefault(); this.undo(); }
    });
  }

  setTool(tool) {
    this.st.tool = tool;
    this.st.start = null;
    this.root.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
    this.renderCursor();
    this.log(tool === 'line' ? 'LINE  click a start point, then each next point. Esc ends the chain.' : 'ERASE  click or drag across lines to remove them.');
  }

  setLayer(layer) {
    this.st.layer = layer;
    this.root.querySelector('[data-layer]').value = layer;
    this.renderStatus();
  }

  setView(view) {
    if (this.st.view === view) return;
    this.st.view = view;
    this.st.start = null;
    this.renderSheet();
  }

  wireModel() {
    const svg = this.model;
    let drag = null;
    svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const box = svg.getBoundingClientRect(), k = 480 / box.width;
      this.orbit((e.clientX - drag.x) * k * 0.6, (e.clientY - drag.y) * k * 0.45);
      drag = { x: e.clientX, y: e.clientY };
    });
    const end = () => { drag = null; };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] }[e.key];
      if (d) { e.preventDefault(); this.orbit(...d); }
    });
    svg.setAttribute('aria-label', 'The part in 3D. Drag, or use the arrow keys, to orbit.');
  }

  orbit(daz, del) {
    const cam = this.st.cam;
    cam.az = ((cam.az + daz + 540) % 360) - 180;
    cam.el = Math.max(6, Math.min(85, cam.el + del));
    this.renderModel();
  }

  // Sheet pointer → { view, u, v } snapped to the grid (zoom-safe: bounding box + clientX).
  sheetPoint(e) {
    const box = this.sheet.getBoundingClientRect(), vb = this.sheet.viewBox.baseVal;
    const x = vb.x + (e.clientX - box.left) / box.width * vb.width;
    const y = vb.y + (e.clientY - box.top) / box.height * vb.height;
    for (const view of VIEWS) {
      const o = this.vp(view), G = this.st.G;
      if (x >= o.x && x <= o.x + G * S && y >= o.y && y <= o.y + G * S) {
        const fu = (x - o.x) / S - 1, fv = G - 1 - (y - o.y) / S;
        const clamp = (n) => Math.max(-1, Math.min(G - 1, n));
        return { view, u: clamp(Math.round(fu)), v: clamp(Math.round(fv)), fu, fv };
      }
    }
    return null;
  }

  // Nearest unit segment to a point, within a third of a square.
  nearestSeg(p) {
    const cands = [];
    const hu = Math.floor(p.fu), hv = Math.round(p.fv);
    cands.push({ key: segKey('h', hu, hv), d: Math.abs(p.fv - hv) });
    const vu = Math.round(p.fu), vv = Math.floor(p.fv);
    cands.push({ key: segKey('v', vu, vv), d: Math.abs(p.fu - vu) });
    cands.sort((a, b) => a.d - b.d);
    return cands[0].d < 0.34 ? cands[0].key : null;
  }

  orthoSnap(a, b) {
    if (!a) return b;
    return Math.abs(b.u - a.u) >= Math.abs(b.v - a.v) ? { ...b, v: a.v } : { ...b, u: a.u };
  }

  wireSheet() {
    const svg = this.sheet, st = this.st;
    let down = null, erasing = false;
    svg.addEventListener('contextmenu', (e) => { if (st.mode === 'unfold') e.preventDefault(); });
    svg.addEventListener('pointerdown', (e) => {
      if (st.mode !== 'unfold') return;
      const p = this.sheetPoint(e);
      if (!p) return;
      if (e.button === 2) { st.start = null; this.renderCursor(); return; }
      svg.focus({ preventScroll: true });
      svg.setPointerCapture(e.pointerId);
      if (p.view !== st.view) { this.setView(p.view); }
      st.cursor = p;
      if (st.tool === 'erase') {
        erasing = true;
        const k = this.nearestSeg(p);
        if (k) this.eraseKeys(p.view, [k]);
        return;
      }
      down = { u: p.u, v: p.v };
      this.clickPoint(p);
    });
    svg.addEventListener('pointermove', (e) => {
      const p = this.sheetPoint(e);
      if (p) st.cursor = p;
      if (p && erasing && p.view === st.view) {
        const k = this.nearestSeg(p);
        if (k) this.eraseKeys(p.view, [k]);
      }
      this.renderCursor();
    });
    svg.addEventListener('pointerup', (e) => {
      erasing = false;
      if (!down || st.tool !== 'line') { down = null; return; }
      const p = this.sheetPoint(e);
      // Press-drag-release draws one segment; a plain click leaves the chain open.
      if (p && p.view === st.view && st.start && (p.u !== down.u || p.v !== down.v)) {
        const end = this.orthoSnap(st.start, p);
        if (this.addLine(st.view, st.start, end)) this.log('LINE  ' + this.fmt(st.start) + ' → ' + this.fmt(end));
        st.start = null;
        this.renderCursor();
      }
      down = null;
    });
    svg.addEventListener('pointerleave', () => { if (!st.start) { st.cursor = null; this.renderCursor(); } });
    svg.addEventListener('keydown', (e) => this.sheetKey(e));
  }

  fmt(p) { return p.u + ',' + p.v; }

  clickPoint(p) {
    const st = this.st;
    if (!st.start) {
      st.start = { u: p.u, v: p.v };
      this.renderCursor();
      return;
    }
    const end = this.orthoSnap(st.start, p);
    if (end.u === st.start.u && end.v === st.start.v) return;
    if (this.addLine(st.view, st.start, end)) this.log('LINE  ' + this.fmt(st.start) + ' → ' + this.fmt(end));
    st.start = { u: end.u, v: end.v };
    this.renderCursor();
  }

  sheetKey(e) {
    const st = this.st;
    if (st.mode !== 'unfold' || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[k];
    if (move) {
      e.preventDefault();
      const c = st.cursor && st.cursor.view === st.view ? st.cursor : { view: st.view, u: 0, v: 0 };
      const G = st.G, clamp = (n) => Math.max(-1, Math.min(G - 1, n));
      st.cursor = { view: st.view, u: clamp(c.u + move[0]), v: clamp(c.v + move[1]) };
      st.cursor.fu = st.cursor.u; st.cursor.fv = st.cursor.v;
      this.renderCursor();
      return;
    }
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      const c = st.cursor && st.cursor.view === st.view ? st.cursor : { view: st.view, u: 0, v: 0, fu: 0, fv: 0 };
      st.cursor = c;
      if (st.tool === 'line') this.clickPoint(c);
      else this.log(this.eraseKeys(st.view, [segKey('h', c.u, c.v), segKey('v', c.u, c.v)]) ? 'ERASE  removed lines starting at ' + this.fmt(c) : 'ERASE  no line starts at ' + this.fmt(c) + '.', 'sys');
      return;
    }
    if (k === 'Escape') { st.start = null; this.renderCursor(); return; }
    const lower = k.toLowerCase();
    if (VIEW_KEYS[lower]) { this.setView(VIEW_KEYS[lower]); return; }
    if (lower === 'l') this.setTool('line');
    else if (lower === 'e') this.setTool('erase');
    else if (lower === 'h') this.setLayer(st.layer === 'visible' ? 'hidden' : 'visible');
  }

  // ── command line ────────────────────────────────────────────
  wireCommandLine() {
    let hi = 0;
    this.cmd.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = this.cmd.value.trim();
        this.cmd.value = '';
        if (text) { this.cmdHistory.push(text); if (this.cmdHistory.length > 50) this.cmdHistory.shift(); }
        hi = this.cmdHistory.length;
        this.run(text);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!this.cmdHistory.length) return;
        e.preventDefault();
        hi = Math.max(0, Math.min(this.cmdHistory.length, hi + (e.key === 'ArrowUp' ? -1 : 1)));
        this.cmd.value = this.cmdHistory[hi] || '';
      } else if (e.key === 'Escape') {
        this.st.prompt = null; this.st.start = null; this.cmd.value = ''; this.renderPrompt(); this.renderCursor();
      }
    });
  }

  point(token, from) {
    const m = /^(@)?(-?\d+),(-?\d+)$/.exec(token);
    if (!m) return null;
    const u = +m[2], v = +m[3];
    if (m[1]) return from ? { u: from.u + u, v: from.v + v } : null;
    return { u, v };
  }

  run(raw) {
    const st = this.st;
    const text = raw.replace(/\s*,\s*/g, ',').trim();
    const tokens = text.split(/\s+/).filter(Boolean);
    const word = (tokens[0] || '').toUpperCase();

    // Inside LINE / ERASE prompts, bare points continue the command.
    if (st.prompt && (!word || /^@?-?\d/.test(word))) {
      if (!word) { this.log(st.prompt + '  done.'); st.prompt = null; st.start = null; this.renderPrompt(); this.renderCursor(); return; }
      this.echo(raw);
      return this.feedPoints(tokens);
    }
    if (!word) return;
    this.echo(raw);
    st.prompt = null;
    const arg = (tokens[1] || '').toUpperCase();
    const unfoldOnly = () => { if (st.mode !== 'unfold') { this.log('That command is for Unfold mode. In Fold mode use BUILD x,y n.', 'warn'); return true; } return false; };
    switch (word) {
      case 'L': case 'LINE':
        if (unfoldOnly()) return;
        this.setToolQuiet('line');
        st.prompt = 'LINE'; st.start = null;
        if (tokens.length > 1) this.feedPoints(tokens.slice(1));
        else this.log('LINE  Specify first point (x,y from the ✚ origin of the ' + VIEW_NAMES[st.view] + ' view):', 'sys');
        break;
      case 'E': case 'ERASE':
        if (unfoldOnly()) return;
        st.prompt = 'ERASE'; st.start = null;
        if (tokens.length > 1) this.feedPoints(tokens.slice(1));
        else this.log('ERASE  Specify both ends of the line to erase:', 'sys');
        break;
      case 'V': case 'VIEW': {
        const v = { T: 'top', TOP: 'top', F: 'front', FRONT: 'front', R: 'right', RIGHT: 'right' }[arg];
        if (!v) return this.log('VIEW TOP, VIEW FRONT or VIEW RIGHT', 'warn');
        this.setView(v); this.log('Current view: ' + VIEW_NAMES[v]);
        break;
      }
      case 'LA': case 'LAYER': {
        const layer = arg.startsWith('H') ? 'hidden' : arg.startsWith('V') ? 'visible' : null;
        if (!layer) return this.log('LAYER VISIBLE or LAYER HIDDEN', 'warn');
        this.setLayer(layer); this.log('Current layer: ' + layer.toUpperCase());
        break;
      }
      case 'B': case 'BUILD': {
        if (st.mode !== 'fold') return this.log('BUILD is for Fold mode.', 'warn');
        const p = this.point(tokens[1] || '');
        const n = Number(tokens[2]);
        const P = st.plate.length;
        if (!p || !Number.isInteger(n)) return this.log('BUILD x,y n · x = column from the left, y = row from the front (both from 0), n = blocks high', 'warn');
        if (p.u < 0 || p.v < 0 || p.u >= P || p.v >= P) return this.log('That square is off the bed (0–' + (P - 1) + ').', 'warn');
        this.setHeight(p.u, P - 1 - p.v, n);
        this.log('Column ' + p.u + ', row ' + p.v + ' → ' + plural(st.plate[P - 1 - p.v][p.u], 'block'));
        break;
      }
      case 'U': case 'UNDO': this.undo(); break;
      case 'CLEAR': this.clear(); break;
      case 'CHECK': case 'AUDIT': this.check(); break;
      case 'REVEAL': this.reveal(); break;
      case 'NEW': this.newPart(); break;
      case 'FOLD': this.setMode('fold'); break;
      case 'UNFOLD': this.setMode('unfold'); break;
      case 'ORBIT': case '3DORBIT': this.log('Drag the 3D viewport to orbit, or press SW / SE / NE / NW.'); break;
      case 'GLASS': if (!this.glassAllowed()) this.log('The glass box unlocks after a correct Check or a Reveal.', 'warn'); else { this.setGlass(true); this.animateGlass(st.t > 0.5 ? 0 : 1); } break;
      case 'HELP': case '?':
        this.log('LINE x,y x,y …  (or LINE, then points; @dx,dy is relative)  ·  ERASE x,y x,y  ·  VIEW TOP|FRONT|RIGHT  ·  LAYER VISIBLE|HIDDEN  ·  UNDO  ·  CLEAR  ·  CHECK  ·  REVEAL  ·  NEW  ·  FOLD / UNFOLD  ·  BUILD x,y n (Fold mode)', 'sys');
        this.log('On the sheet: arrows move the crosshair, Enter places a point, Esc ends a chain, T/F/R pick a view, L/E pick a tool, H swaps layer.', 'sys');
        break;
      default: this.log('Unknown command "' + tokens[0] + '". Type HELP.', 'warn');
    }
    this.renderPrompt();
  }

  setToolQuiet(tool) {
    this.st.tool = tool;
    this.root.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
  }

  feedPoints(tokens) {
    const st = this.st;
    for (const tok of tokens) {
      const p = this.point(tok, st.start);
      if (!p) { this.log('"' + tok + '" isn’t a point. Use x,y or @dx,dy.', 'warn'); break; }
      const G = st.G;
      if (p.u < -1 || p.v < -1 || p.u > G - 1 || p.v > G - 1) { this.log('Point ' + this.fmt(p) + ' is off the ' + VIEW_NAMES[st.view] + ' grid.', 'warn'); break; }
      if (!st.start) { st.start = p; continue; }
      if (st.prompt === 'ERASE') {
        const keys = unitSegments(st.start.u, st.start.v, p.u, p.v);
        if (!keys) { this.log('ORTHO is on: erase along a straight line.', 'warn'); break; }
        const n = this.eraseKeys(st.view, keys);
        this.log('ERASE  ' + plural(n, 'unit') + ' removed.');
        st.start = null;
      } else {
        if (this.addLine(st.view, st.start, p)) this.log('LINE  ' + this.fmt(st.start) + ' → ' + this.fmt(p));
        st.start = p;
      }
    }
    this.renderPrompt();
    this.renderCursor();
  }

  renderPrompt() {
    const st = this.st, label = this.root.querySelector('[data-prompt-label]');
    label.textContent = st.prompt ? (st.prompt === 'LINE' ? (st.start ? 'LINE  next point:' : 'LINE  first point:') : (st.start ? 'ERASE  other end:' : 'ERASE  first end:')) : 'Command:';
  }

  echo(text) { this.log('Command: ' + text, 'echo'); }

  log(text, kind = '') {
    const line = document.createElement('div');
    line.className = 'bpg-log-line' + (kind ? ' is-' + kind : '');
    line.textContent = text;
    this.logEl.appendChild(line);
    while (this.logEl.children.length > 40) this.logEl.firstChild.remove();
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  // ── print bed (Fold mode) ───────────────────────────────────
  buildPlate() {
    const st = this.st, P = st.plate.length;
    this.plateEl.replaceChildren();
    this.plateEl.style.setProperty('--n', P);
    for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bpg-cell';
      b.dataset.r = r; b.dataset.c = c;
      b.tabIndex = r === P - 1 && c === 0 ? 0 : -1;
      b.addEventListener('click', (e) => {
        const h = st.plate[r][c];
        this.setHeight(c, r, e.shiftKey ? h - 1 : h >= st.maxH ? 0 : h + 1);
      });
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); this.setHeight(c, r, st.plate[r][c] - 1); });
      b.addEventListener('keydown', (e) => this.plateKey(e, r, c));
      this.plateEl.appendChild(b);
    }
    this.renderPlate();
  }

  plateKey(e, r, c) {
    const st = this.st, P = st.plate.length;
    const move = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (move) {
      e.preventDefault();
      const nr = Math.max(0, Math.min(P - 1, r + move[0])), nc = Math.max(0, Math.min(P - 1, c + move[1]));
      const next = this.plateEl.querySelector(`[data-r="${nr}"][data-c="${nc}"]`);
      this.plateEl.querySelectorAll('.bpg-cell').forEach((b) => { b.tabIndex = b === next ? 0 : -1; });
      next.focus();
      return;
    }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); this.setHeight(c, r, +e.key); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); this.setHeight(c, r, st.plate[r][c] + 1); }
    else if (e.key === '-' || e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); this.setHeight(c, r, st.plate[r][c] - 1); }
  }

  renderPlate() {
    const st = this.st, P = st.plate.length;
    this.plateEl.querySelectorAll('.bpg-cell').forEach((b) => {
      const r = +b.dataset.r, c = +b.dataset.c, h = st.plate[r][c];
      b.textContent = h ? String(h) : '';
      b.style.setProperty('--h', h / st.maxH);
      b.classList.toggle('has-blocks', h > 0);
      b.setAttribute('aria-label', 'Column ' + c + ', row ' + (P - 1 - r) + ' from the front: ' + plural(h, 'block'));
    });
  }

  // ── rendering ───────────────────────────────────────────────
  renderAll() {
    this.root.querySelector('[data-model-title]').textContent = this.st.mode === 'unfold' ? this.st.part.name + ' (folded: 3D)' : 'Your build on the bed';
    this.renderModel();
    this.renderSheet();
    this.renderStatus();
    this.updateGlassControls();
    this.renderPrompt();
  }

  renderStatus() {
    const st = this.st;
    this.root.querySelector('[data-layer-status]').textContent = 'LAYER: ' + st.layer.toUpperCase();
    this.root.querySelector('[data-swatch]').dataset.layer = st.layer;
    this.root.querySelector('[data-score]').textContent = 'Solved · Unfold ' + (this.store.unfold || 0) + ' · Fold ' + (this.store.fold || 0) + (st.solved ? '  ✔' : '');
    this.root.querySelector('[data-file]').textContent = st.part.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-') + '.dwg';
  }

  // Top-left corner of each view's grid on the sheet (third-angle layout).
  vp(view) {
    const G = this.st.G, m = 0.5 * S, gap = 1.2 * S;
    return { top: { x: m, y: m }, front: { x: m, y: m + G * S + gap }, right: { x: m + G * S + gap, y: m + G * S + gap } }[view];
  }

  xy(view, u, v) {
    const o = this.vp(view), G = this.st.G;
    return [o.x + (1 + u) * S, o.y + (G - 1 - v) * S];
  }

  segLine(parent, view, key, cls) {
    const { dir, u, v } = parseSeg(key);
    const [x1, y1] = this.xy(view, u, v);
    const [x2, y2] = this.xy(view, dir === 'h' ? u + 1 : u, dir === 'h' ? v : v + 1);
    return el('line', { x1, y1, x2, y2, class: cls }, parent);
  }

  renderSheet() {
    const st = this.st, svg = this.sheet, G = st.G;
    const m = 0.5 * S, gap = 1.2 * S, Wpx = 2 * m + 2 * G * S + gap, Hpx = Wpx;
    svg.setAttribute('viewBox', `0 0 ${Wpx} ${Hpx}`);
    svg.replaceChildren();
    const defs = el('defs', {}, svg);
    const mk = el('marker', { id: this.uid('arrow'), viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 1 10 5 0 9z', class: 'bpg-dim-head' }, mk);
    el('rect', { x: 0, y: 0, width: Wpx, height: Hpx, class: 'bpg-sheet-bg' }, svg);
    el('rect', { x: 4, y: 4, width: Wpx - 8, height: Hpx - 8, class: 'bpg-sheet-border' }, svg);

    const fold = st.mode === 'fold';
    const built = fold && (st.overlay || st.feedback) ? drawings(st.plate) : null;
    for (const view of VIEWS) {
      const o = this.vp(view), g = el('g', { class: 'bpg-vp' + (!fold && view === st.view ? ' is-active' : '') }, svg);
      el('rect', { x: o.x, y: o.y, width: G * S, height: G * S, class: 'bpg-vp-frame' }, g);
      if (st.grid) {
        const grid = el('g', { class: 'bpg-grid' }, g);
        for (let i = 1; i < G; i++) {
          el('line', { x1: o.x + i * S, y1: o.y, x2: o.x + i * S, y2: o.y + G * S }, grid);
          el('line', { x1: o.x, y1: o.y + i * S, x2: o.x + G * S, y2: o.y + i * S }, grid);
        }
      }
      const label = el('text', { x: o.x + 6, y: o.y + 15, class: 'bpg-vp-label' }, g);
      label.textContent = VIEW_NAMES[view];
      if (!fold) this.ucs(g, view);

      const lines = el('g', {}, g);
      if (fold) {
        this.drawTarget(lines, view, st.target[view], 'bpg-line');
        if (st.overlay && built) this.drawTarget(lines, view, built[view], 'bpg-line bpg-mine');
        this.dims(lines, view);
        const fb = st.feedback?.views?.[view];
        if (fb && !fb.ok) {
          fb.missing.forEach((s) => this.segLine(lines, view, s.key, 'bpg-miss'));
          fb.extra.forEach((s) => this.segLine(lines, view, s.key, 'bpg-extra'));
        }
      } else {
        if (st.revealed) {
          const fbv = st.feedback?.views?.[view];
          const du = fbv ? fbv.du : 0, dv = fbv ? fbv.dv : 0;
          const shift = (set) => new Set([...set].map((k) => { const p = parseSeg(k); return segKey(p.dir, p.u + du, p.v + dv); }));
          this.drawTarget(lines, view, { visible: shift(st.target[view].visible), hidden: shift(st.target[view].hidden) }, 'bpg-line bpg-ghost');
        }
        const d = st.drawn[view];
        d.visible.forEach((k) => this.segLine(lines, view, k, 'bpg-line'));
        d.hidden.forEach((k) => this.segLine(lines, view, k, 'bpg-line bpg-hidden'));
        const fb = st.feedback?.views?.[view];
        if (fb && !fb.ok) {
          [...fb.missingVisible, ...fb.missingHidden].forEach((k) => this.segLine(lines, view, k, 'bpg-miss'));
          [...fb.extraVisible, ...(LEVELS[st.level].hidden ? fb.extraHidden : [])].forEach((k) => this.segLine(lines, view, k, 'bpg-extra'));
        }
        if (st.solved) this.dims(lines, view);
      }
      if (st.feedback?.views?.[view]?.ok) {
        const t = el('text', { x: o.x + G * S - 6, y: o.y + G * S - 7, class: 'bpg-vp-ok', 'text-anchor': 'end' }, g);
        t.textContent = '✓ matches';
      }
    }
    this.titleBlock(svg);
    this.cursorLayer = el('g', { class: 'bpg-cursor-layer' }, svg);
    this.root.querySelector('[data-sheet-title]').textContent = fold ? 'Blueprint to build from' : 'Your three views';
    this.root.querySelector('[data-view-badge]').textContent = fold ? 'read only' : 'drawing in: ' + VIEW_NAMES[st.view];
    svg.setAttribute('aria-label', fold
      ? `Blueprint of ${st.part.name}: top view above the front view, right side view beside it. Solid lines are visible edges, dashed lines are hidden edges.`
      : `Drawing sheet with top, front and right side grids. Current view ${VIEW_NAMES[st.view]}. Arrow keys move the crosshair, Enter places a point, Escape ends a line chain, T F R switch views.`);
    this.renderCursor();
  }

  uid(name) {
    if (!this._uid) this._uid = 'bpg' + Math.random().toString(36).slice(2, 7);
    return this._uid + '-' + name;
  }

  drawTarget(parent, view, d, cls) {
    d.visible.forEach((k) => this.segLine(parent, view, k, cls));
    d.hidden.forEach((k) => this.segLine(parent, view, k, cls + ' bpg-hidden'));
  }

  // AutoCAD's L-shaped UCS icon at each view's origin.
  ucs(parent, view) {
    const [x, y] = this.xy(view, 0, 0);
    const g = el('g', { class: 'bpg-ucs' }, parent);
    el('path', { d: `M${x} ${y} h${S * 0.9} M${x} ${y} v${-S * 0.9}` }, g);
    el('rect', { x: x - 3, y: y - 3, width: 6, height: 6 }, g);
    const tx = el('text', { x: x + S * 0.95, y: y + 4 }, g); tx.textContent = 'X';
    const ty = el('text', { x: x - 4, y: y - S * 0.98, 'text-anchor': 'middle' }, g); ty.textContent = 'Y';
  }

  // Overall dimensions, 1 square = 10 mm.
  dims(parent, view) {
    const { W, D, H } = this.st.dims;
    const g = el('g', { class: 'bpg-dim' }, parent);
    const along = (a, b, off, value, vertical) => {
      const [x1, y1] = this.xy(view, a.u, a.v), [x2, y2] = this.xy(view, b.u, b.v);
      const ox = vertical ? -off * S : 0, oy = vertical ? 0 : off * S;
      el('line', { x1, y1, x2: x1 + ox * 1.15, y2: y1 + oy * 1.15, class: 'bpg-dim-ext' }, g);
      el('line', { x1: x2, y1: y2, x2: x2 + ox * 1.15, y2: y2 + oy * 1.15, class: 'bpg-dim-ext' }, g);
      el('line', { x1: x1 + ox, y1: y1 + oy, x2: x2 + ox, y2: y2 + oy, 'marker-start': `url(#${this.uid('arrow')})`, 'marker-end': `url(#${this.uid('arrow')})` }, g);
      const t = el('text', { x: (x1 + x2) / 2 + ox - (vertical ? 4 : 0), y: (y1 + y2) / 2 + oy - (vertical ? 0 : 4), 'text-anchor': 'middle' }, g);
      if (vertical) t.setAttribute('transform', `rotate(-90 ${(x1 + x2) / 2 + ox - 4} ${(y1 + y2) / 2 + oy})`);
      t.textContent = value * 10;
    };
    if (view === 'front') { along({ u: 0, v: 0 }, { u: W, v: 0 }, 0.6, W); along({ u: 0, v: 0 }, { u: 0, v: H }, 0.6, H, true); }
    if (view === 'right') along({ u: 0, v: 0 }, { u: D, v: 0 }, 0.6, D);
    if (view === 'top') along({ u: 0, v: 0 }, { u: 0, v: D }, 0.6, D, true);
  }

  titleBlock(svg) {
    const st = this.st, G = st.G, m = 0.5 * S, gap = 1.2 * S;
    const x = m + G * S + gap, y = m, w = G * S, h = G * S;
    const g = el('g', { class: 'bpg-tb' }, svg);
    el('rect', { x, y, width: w, height: h, class: 'bpg-tb-frame' }, g);
    const rows = [
      ['CLASSROOMOS CAD', ''],
      ['PART', st.part.name],
      ['TASK', st.mode === 'unfold' ? 'Draw 3 views' : 'Build the solid'],
      ['LEVEL', LEVELS[st.level].label + (LEVELS[st.level].hidden ? ' + hidden' : '')],
      ['SCALE', '1 sq = 10 mm'],
      ['PROJ.', ''],
      ['DRAWN', 'you'],
      ['CHECKED', st.solved ? (st.revealed ? '✔ revealed' : '✔ approved') : '—'],
      ['DWG NO.', 'A-101 · 1/1'],
    ];
    const rh = h / rows.length, vx = x + 72;
    rows.forEach(([k, v], i) => {
      const ry = y + i * rh;
      if (i) el('line', { x1: x, y1: ry, x2: x + w, y2: ry, class: 'bpg-tb-rule' }, g);
      const a = el('text', { x: x + 8, y: ry + rh * 0.66, class: i ? 'bpg-tb-key' : 'bpg-tb-head' }, g); a.textContent = k;
      if (v) { const b = el('text', { x: vx, y: ry + rh * 0.66, class: 'bpg-tb-val' }, g); b.textContent = v; }
      if (k === 'PROJ.') {
        // third-angle symbol: the cone's side view, with its end view on the right
        const sh = rh * 0.72, cx = vx + sh * 0.5, cy = ry + rh / 2, r1 = sh * 0.5, r2 = sh * 0.26;
        el('path', { d: `M${cx - sh * 0.5} ${cy - r1} L${cx + sh * 0.5} ${cy - r2} L${cx + sh * 0.5} ${cy + r2} L${cx - sh * 0.5} ${cy + r1}Z`, class: 'bpg-tb-sym' }, g);
        el('circle', { cx: cx + sh * 1.5, cy, r: r1, class: 'bpg-tb-sym' }, g);
        el('circle', { cx: cx + sh * 1.5, cy, r: r2, class: 'bpg-tb-sym' }, g);
        const t = el('text', { x: cx + sh * 2.3, y: ry + rh * 0.66, class: 'bpg-tb-val' }, g); t.textContent = '3rd angle';
      }
    });
  }

  renderCursor() {
    const st = this.st, g = this.cursorLayer;
    if (!g) return;
    g.replaceChildren();
    const c = st.cursor;
    const coords = this.root.querySelector('[data-coords]');
    if (st.mode !== 'unfold' || !c) { coords.textContent = st.mode === 'unfold' ? VIEW_NAMES[st.view] + '  —' : 'BED  ' + st.plate.length + ' × ' + st.plate.length; return; }
    const view = c.view, o = this.vp(view), G = st.G;
    let p = { u: c.u, v: c.v };
    if (st.start && view === st.view && st.tool === 'line') {
      p = this.orthoSnap(st.start, p);
      const [x1, y1] = this.xy(view, st.start.u, st.start.v), [x2, y2] = this.xy(view, p.u, p.v);
      el('line', { x1, y1, x2, y2, class: 'bpg-rubber' + (st.layer === 'hidden' ? ' bpg-hidden' : '') }, g);
      el('circle', { cx: x1, cy: y1, r: 4, class: 'bpg-start' }, g);
    }
    const [x, y] = this.xy(view, p.u, p.v);
    el('line', { x1: o.x, y1: y, x2: o.x + G * S, y2: y, class: 'bpg-cross' }, g);
    el('line', { x1: x, y1: o.y, x2: x, y2: o.y + G * S, class: 'bpg-cross' }, g);
    el('rect', { x: x - 5, y: y - 5, width: 10, height: 10, class: 'bpg-pickbox' + (st.tool === 'erase' ? ' is-erase' : '') }, g);
    const len = st.start && view === st.view ? Math.abs(p.u - st.start.u) + Math.abs(p.v - st.start.v) : 0;
    coords.textContent = VIEW_NAMES[view] + '  ' + p.u + ', ' + p.v + (len ? '   length ' + len * 10 + ' mm' : '');
  }

  // ── 3D model space ──────────────────────────────────────────
  // Orthographic orbit camera; painter's order over unit cubes.
  renderModel() {
    const st = this.st, svg = this.model;
    svg.replaceChildren();
    const fold = st.mode === 'fold';
    const heights = fold ? st.plate : st.part.heights;
    const box = fold ? crop(st.plate) : { heights: st.part.heights, r0: 0, c0: 0 };
    const solid = box.heights;
    const sz = size(solid);
    const bedW = fold ? st.plate.length : sz.W + 2, bedD = fold ? st.plate.length : sz.D + 2;
    const bx0 = fold ? 0 : -1, bz0 = fold ? 0 : -1;
    const Hview = Math.max(fold ? st.maxH : sz.H, 1);
    const center = { x: bx0 + bedW / 2, y: Hview / 2, z: bz0 + bedD / 2 };

    const glassOn = st.glass && solid.length;
    const k = glassOn ? ease(st.t) : 0;
    const userAz = glassOn ? Math.max(10, Math.min(80, st.cam.az)) : st.cam.az;
    const userEl = glassOn ? Math.max(10, Math.min(75, st.cam.el)) : st.cam.el;
    const az = userAz * (1 - k) * DEG, elv = userEl * (1 - k) * DEG;
    const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(elv), se = Math.sin(elv);
    const rot = (x, y, z) => {
      const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
      return [x1, y * ce - z1 * se, y * se + z1 * ce];
    };

    // Glass-box geometry (world coordinates) in folded → unfolded positions.
    const gm = 0.5, ox = box.c0, oz = box.r0, W = sz.W, D = sz.D, H = sz.H;
    const ang = (Math.PI / 2) * k, sA = Math.sin(ang), cA = Math.cos(ang);
    const zF = oz + D + gm;
    const panelPt = {
      front: (u, v) => [ox + u, v, zF],
      top: (u, v) => { const d = gm + v; return [ox + u, H + gm + d * sA, zF - d * cA]; },
      right: (u, v) => { const d = gm + u; return [ox + W + gm + d * sA, v, zF - d * cA]; },
    };
    const panelRect = { front: [W, H], top: [W, D], right: [D, H] };

    // Fit: fixed for the bed, or to the unfolding box.
    const pts = [];
    for (const x of [bx0, bx0 + bedW]) for (const z of [bz0, bz0 + bedD]) for (const y of [0, Hview]) pts.push([x, y, z]);
    if (glassOn) for (const view of VIEWS) {
      const [pw, ph] = panelRect[view];
      for (const [u, v] of [[-gm, -gm], [pw + gm, -gm], [-gm, ph + gm], [pw + gm, ph + gm]]) pts.push(panelPt[view](u, v));
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y, z] of pts) {
      const [X, Y] = rot(x - center.x, y - center.y, z - center.z);
      minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, -Y); maxY = Math.max(maxY, -Y);
    }
    if (!glassOn) {   // keep scale steady while orbiting the bed
      const r = Math.hypot(bedW, bedD, Hview) / 2;
      minX = -r; maxX = r; minY = -r * 0.85; maxY = r * 0.85;
    }
    const VW = 480, VH = 360, pad = 22;
    const scale = Math.min((VW - 2 * pad) / (maxX - minX), (VH - 2 * pad - 14) / (maxY - minY));
    const offX = VW / 2 - ((minX + maxX) / 2) * scale, offY = VH / 2 - 6 - ((minY + maxY) / 2) * scale;
    const P = (x, y, z) => {
      const [X, Y, Z] = rot(x - center.x, y - center.y, z - center.z);
      return [offX + X * scale, offY - Y * scale, Z];
    };
    const poly = (corners, cls, parent = svg) => el('polygon', { points: corners.map((c) => { const [X, Y] = P(...c); return X.toFixed(1) + ',' + Y.toFixed(1); }).join(' '), class: cls }, parent);

    el('rect', { x: 0, y: 0, width: VW, height: VH, class: 'bpg-model-bg' }, svg);
    // print bed
    poly([[bx0, 0, bz0], [bx0 + bedW, 0, bz0], [bx0 + bedW, 0, bz0 + bedD], [bx0, 0, bz0 + bedD]], 'bpg-bed');
    const bedGrid = el('g', { class: 'bpg-bed-grid' }, svg);
    const seg3 = (a, b, cls, parent) => { const [x1, y1] = P(...a), [x2, y2] = P(...b); return el('line', { x1, y1, x2, y2, class: cls }, parent); };
    for (let i = 0; i <= bedW; i++) seg3([bx0 + i, 0, bz0], [bx0 + i, 0, bz0 + bedD], '', bedGrid);
    for (let i = 0; i <= bedD; i++) seg3([bx0, 0, bz0 + i], [bx0 + bedW, 0, bz0 + i], '', bedGrid);
    const [fx, fy] = P(bx0 + bedW / 2, 0, bz0 + bedD + 0.75);
    const front = el('text', { x: fx, y: fy + 4, class: 'bpg-front-tag', 'text-anchor': 'middle' }, svg);
    front.textContent = 'FRONT';
    front.style.opacity = String(1 - k);

    // cubes, far to near
    const filled = (x, y, z) => z >= 0 && z < heights.length && x >= 0 && x < heights[z].length && y >= 0 && y < heights[z][x];
    const L = [0.42, 0.78, 0.47];
    const faces = [
      { n: [0, 1, 0], q: (x, y, z) => [[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]] },
      { n: [0, 0, 1], q: (x, y, z) => [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]] },
      { n: [0, 0, -1], q: (x, y, z) => [[x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z]] },
      { n: [1, 0, 0], q: (x, y, z) => [[x + 1, y, z], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z]] },
      { n: [-1, 0, 0], q: (x, y, z) => [[x, y, z], [x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z]] },
    ].filter((f) => rot(...f.n)[2] > 1e-6);
    const cubes = [];
    heights.forEach((row, z) => row.forEach((h, x) => { for (let y = 0; y < h; y++) cubes.push([x, y, z, rot(x + 0.5 - center.x, y + 0.5 - center.y, z + 0.5 - center.z)[2]]); }));
    cubes.sort((a, b) => a[3] - b[3]);
    const solidG = el('g', { class: 'bpg-solid' + (fold ? ' is-build' : '') }, svg);
    for (const [x, y, z] of cubes) {
      for (const f of faces) {
        if (filled(x + f.n[0], y + f.n[1], z + f.n[2])) continue;
        const light = 0.5 + 0.5 * Math.max(0, f.n[0] * L[0] + f.n[1] * L[1] + f.n[2] * L[2]);
        const p = poly(f.q(x, y, z), 'bpg-face', solidG);
        p.style.setProperty('--shade', light.toFixed(3));
      }
    }

    if (glassOn) {
      const views = fold ? drawings(st.plate) : st.target;
      const order = VIEWS.map((view) => {
        const [pw, ph] = panelRect[view];
        return { view, depth: P(...panelPt[view](pw / 2, ph / 2))[2] };
      }).sort((a, b) => a.depth - b.depth);
      const glassG = el('g', { class: 'bpg-glassbox' }, svg);
      for (const { view } of order) {
        const [pw, ph] = panelRect[view], f = panelPt[view];
        poly([f(-gm, -gm), f(pw + gm, -gm), f(pw + gm, ph + gm), f(-gm, ph + gm)], 'bpg-pane-glass', glassG);
        const draw = (set, cls) => set.forEach((key) => {
          const { dir, u, v } = parseSeg(key);
          seg3(f(u, v), f(dir === 'h' ? u + 1 : u, dir === 'h' ? v : v + 1), cls, glassG);
        });
        draw(views[view].hidden, 'bpg-pline bpg-hidden');
        draw(views[view].visible, 'bpg-pline');
        const [lx, ly] = P(...f(-gm + 0.1, ph + gm - 0.1));
        const t = el('text', { x: lx + 3, y: ly + 11, class: 'bpg-pane-label' }, glassG);
        t.textContent = VIEW_NAMES[view];
      }
    }

    // UCS tripod (AutoCAD axes: X right, Y into the screen, Z up)
    const tri = el('g', { class: 'bpg-tripod' }, svg);
    const tx = 34, ty = VH - 30;
    for (const [axis, v, cls] of [['X', [1, 0, 0], 'is-x'], ['Y', [0, 0, -1], 'is-y'], ['Z', [0, 1, 0], 'is-z']]) {
      const [X, Y] = rot(...v);
      el('line', { x1: tx, y1: ty, x2: tx + X * 20, y2: ty - Y * 20, class: cls }, tri);
      const t = el('text', { x: tx + X * 27, y: ty - Y * 27 + 4, class: cls, 'text-anchor': 'middle' }, tri);
      t.textContent = axis;
    }
    const cap = el('text', { x: VW - 10, y: VH - 10, class: 'bpg-model-cap', 'text-anchor': 'end' }, svg);
    cap.textContent = glassOn ? (k > 0.98 ? 'Glass box unfolded = the blueprint layout' : 'Glass box ' + Math.round(k * 100) + '% unfolded') : 'Parallel projection · drag to orbit';
  }
}

function mount(root) {
  if (root.dataset.blueprintReady) return;
  root.dataset.blueprintReady = '1';
  new BlueprintGame(root);
}

document.querySelectorAll('[data-blueprint-game]').forEach(mount);
