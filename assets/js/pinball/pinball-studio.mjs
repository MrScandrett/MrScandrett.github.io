/* Pinball Construction Set: the studio. Build mode edits a table (plain JSON); Play mode
   runs it through pinball-core. All physics lives in the core; this file draws, edits and listens. */
import {
  W, H, BALL_R, GRID, PART_TYPES, FRAME, PLUNGER, snap, clamp, makePart, defaultTable, blankTable,
  validateTable, exportTable, createGame, advance, flipperGeom, FLIPPER_REST, distToSegment, partLength, MAX_PARTS,
} from './pinball-core.mjs';

const KEY = 'classroomos:pinball:v1';
const HI = 'classroomos:pinball:hi';
const $ = (sel, root = document) => root.querySelector(sel);

export function mount(root) {
  const canvas = $('[data-ps-canvas]', root);
  const ctx = canvas.getContext('2d');
  const el = {
    parts: $('[data-ps-parts]', root), inspector: $('[data-ps-inspector]', root), status: $('[data-ps-status]', root),
    score: $('[data-ps-score]', root), balls: $('[data-ps-balls]', root), mult: $('[data-ps-mult]', root), hi: $('[data-ps-hi]', root),
    name: $('[data-ps-name]', root), file: $('[data-ps-file]', root), mode: root.querySelectorAll('[data-ps-mode]'),
  };

  const state = {
    table: load() || defaultTable(), mode: 'build', tool: 'select', selected: null,
    drag: null, game: null, input: { left: false, right: false, plunge: false },
    undo: [], redo: [], hi: Number(safe(() => localStorage.getItem(HI)) || 0), muted: false,
    particles: [], trail: [], shake: 0, t: 0,
  };
  let scale = 1;

  /* ── persistence + undo ──────────────────────────────────── */
  function safe(fn) { try { return fn(); } catch { return null; } }
  function load() { const raw = safe(() => localStorage.getItem(KEY)); if (!raw) return null; const v = validateTable(raw); return v.ok ? v.table : null; }
  function save() { safe(() => localStorage.setItem(KEY, exportTable(state.table))); }
  function snapshot() { return JSON.stringify(state.table.parts); }
  function commit(before) {
    if (before === snapshot()) return;
    state.undo.push(before); if (state.undo.length > 100) state.undo.shift();
    state.redo.length = 0; save(); refreshUI();
  }
  function restore(json) { state.table.parts = JSON.parse(json); if (!state.table.parts.some((p) => p.id === state.selected)) state.selected = null; save(); refreshUI(); }
  function undo() { if (!state.undo.length) return; state.redo.push(snapshot()); restore(state.undo.pop()); }
  function redo() { if (!state.redo.length) return; state.undo.push(snapshot()); restore(state.redo.pop()); }
  const part = (id) => state.table.parts.find((p) => p.id === id);

  /* ── audio: tiny synth, created on first gesture ─────────── */
  let ac = null;
  function tone(freq, dur = 0.09, type = 'square', vol = 0.05, slide = 0) {
    if (state.muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator(), gn = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, ac.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ac.currentTime + dur);
      gn.gain.setValueAtTime(vol, ac.currentTime); gn.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + dur + 0.02);
    } catch { /* audio is a bonus */ }
  }
  const SOUND = {
    bumper: () => tone(520, 0.12, 'square', 0.06, 380), sling: () => tone(300, 0.08, 'sawtooth', 0.05, 200),
    target: () => { tone(660, 0.1, 'triangle', 0.07); setTimeout(() => tone(880, 0.12, 'triangle', 0.06), 70); },
    rollover: () => tone(980, 0.07, 'sine', 0.05), flipper: () => tone(140, 0.05, 'square', 0.04, -40),
    launch: () => tone(180, 0.35, 'sawtooth', 0.06, 700), drain: () => tone(300, 0.6, 'sawtooth', 0.06, -250),
    bonus: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.07), i * 90)),
    over: () => tone(220, 0.9, 'sawtooth', 0.07, -170), thud: () => tone(110, 0.05, 'square', 0.03),
  };

  /* ── canvas sizing and coordinates ───────────────────────── */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(240, canvas.clientWidth);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr * 1.5);
    scale = canvas.width / W;
  }
  new ResizeObserver(resize).observe(canvas); resize();
  function toBoard(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  /* ── build-mode editing ──────────────────────────────────── */
  function handlesOf(p) {
    const k = PART_TYPES[p.type].kind;
    if (k === 'segment') return [{ k: 'a', x: p.x, y: p.y }, { k: 'b', x: p.x2, y: p.y2 }];
    if (k === 'circle') return [{ k: 'r', x: p.x + p.r, y: p.y }];
    const g = flipperGeom(p, FLIPPER_REST); return [{ k: 'len', x: g.x2, y: g.y2 }];
  }
  function hitPart(pt) {
    const list = state.table.parts;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i], k = PART_TYPES[p.type].kind;
      if (k === 'segment' && distToSegment(pt.x, pt.y, p.x, p.y, p.x2, p.y2) < 12) return p;
      if (k === 'circle' && Math.hypot(pt.x - p.x, pt.y - p.y) < p.r + 6) return p;
      if (k === 'flipper') { const g = flipperGeom(p, FLIPPER_REST); if (distToSegment(pt.x, pt.y, g.x1, g.y1, g.x2, g.y2) < 16) return p; }
    }
    return null;
  }
  function onDown(e) {
    canvas.focus({ preventScroll: true });
    if (state.mode === 'play') { if (e.pointerType !== 'touch') return; return playPointer(e, true); }
    const pt = toBoard(e), before = snapshot();
    canvas.setPointerCapture(e.pointerId);
    if (state.tool !== 'select') {
      if (state.table.parts.length >= MAX_PARTS) { say(`That is the limit: ${MAX_PARTS} parts.`); return; }
      const p = makePart(state.tool, snap(pt.x), snap(pt.y));
      state.table.parts.push(p); state.selected = p.id;
      state.drag = { id: p.id, mode: 'place', before };
      return refreshUI();
    }
    const sel = state.selected && part(state.selected);
    if (sel) {
      for (const h of handlesOf(sel)) if (Math.hypot(pt.x - h.x, pt.y - h.y) < 16) { state.drag = { id: sel.id, mode: h.k, before }; return; }
    }
    const hit = hitPart(pt);
    state.selected = hit ? hit.id : null;
    if (hit) state.drag = { id: hit.id, mode: 'move', ox: pt.x, oy: pt.y, start: { ...hit }, before };
    refreshUI();
  }
  function onMove(e) {
    const d = state.drag; if (!d) return;
    const p = part(d.id); if (!p) return;
    const pt = toBoard(e), sx = clamp(snap(pt.x), 0, W), sy = clamp(snap(pt.y), 0, H);
    const k = PART_TYPES[p.type].kind;
    if (d.mode === 'move') {
      const dx = snap(pt.x - d.ox), dy = snap(pt.y - d.oy), s = d.start;
      p.x = clamp(s.x + dx, 0, W); p.y = clamp(s.y + dy, 0, H);
      if (k === 'segment') { p.x2 = clamp(s.x2 + dx, 0, W); p.y2 = clamp(s.y2 + dy, 0, H); }
    } else if (d.mode === 'a') { p.x = sx; p.y = sy; }
    else if (d.mode === 'b' || (d.mode === 'place' && k === 'segment')) { if (Math.hypot(sx - p.x, sy - p.y) >= 10) { p.x2 = sx; p.y2 = sy; } }
    else if (d.mode === 'r' || (d.mode === 'place' && k === 'circle')) p.r = clamp(Math.round(Math.hypot(pt.x - p.x, pt.y - p.y)), 4, 60);
    else if (d.mode === 'len' || (d.mode === 'place' && k === 'flipper')) p.len = clamp(Math.round(Math.hypot(pt.x - p.x, pt.y - p.y)), 40, 140);
    renderInspector();
  }
  function onUp() {
    const d = state.drag; if (!d) return; state.drag = null;
    if (d.mode === 'place') { setTool('select'); }
    commit(d.before);
  }
  function setTool(t) {
    state.tool = t;
    el.parts.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
    canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
    if (t !== 'select') say(`${PART_TYPES[t].label}: click on the table to place it${PART_TYPES[t].kind === 'segment' ? ', then drag to set its length' : PART_TYPES[t].kind === 'circle' ? ', then drag to set its size' : ''}.`);
  }
  function deleteSelected() {
    if (!state.selected) return; const before = snapshot();
    state.table.parts = state.table.parts.filter((p) => p.id !== state.selected); state.selected = null; commit(before);
  }
  function duplicateSelected() {
    const p = state.selected && part(state.selected); if (!p || state.table.parts.length >= MAX_PARTS) return;
    const before = snapshot(), c = { ...p, id: makePart(p.type, 0, 0).id, x: clamp(p.x + 20, 0, W), y: clamp(p.y + 20, 0, H) };
    if (c.x2 != null) { c.x2 = clamp(p.x2 + 20, 0, W); c.y2 = clamp(p.y2 + 20, 0, H); }
    state.table.parts.push(c); state.selected = c.id; commit(before);
  }

  /* ── modes ───────────────────────────────────────────────── */
  function setMode(m) {
    state.mode = m; root.dataset.psMode = m;
    el.mode.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.psMode === m)));
    if (m === 'play') {
      state.game = createGame(state.table); state.particles.length = 0; state.trail.length = 0;
      canvas.focus({ preventScroll: true }); canvas.style.cursor = 'default';
      say('Hold Space (or the Launch button) to pull the plunger back, then let go.');
    } else { state.game = null; say('Build mode. Pick a part, place it, then press Play.'); }
    refreshUI();
  }
  function say(msg) { el.status.textContent = msg; }

  function refreshUI() {
    el.name.textContent = state.table.name;
    $('[data-ps-undo]', root).disabled = !state.undo.length; $('[data-ps-redo]', root).disabled = !state.redo.length;
    $('[data-ps-count]', root).textContent = `${state.table.parts.length} parts`;
    renderInspector(); updateHud();
  }
  function renderInspector() {
    const p = state.selected && part(state.selected), box = el.inspector;
    if (!p) { box.innerHTML = '<p class="ps-muted">Click a part on the table to edit it, or pick one from the bin to add it. Drag handles to resize.</p>'; return; }
    const def = PART_TYPES[p.type], k = def.kind;
    const size = k === 'circle' ? ['Size', 'r', 4, 60, p.r] : k === 'flipper' ? ['Length', 'len', 40, 140, p.len] : ['Length', 'seg', 10, 400, Math.round(partLength(p))];
    box.innerHTML = `<h3><span class="ps-dot" style="background:${def.color}"></span>${def.label}</h3><p class="ps-muted">${def.hint}</p>
      <label class="ps-field">${size[0]}<input type="range" data-f="${size[1]}" min="${size[2]}" max="${size[3]}" value="${size[4]}"><output>${size[4]}</output></label>
      ${k === 'flipper' ? `<label class="ps-field">Side<select data-f="side"><option value="left"${p.side === 'left' ? ' selected' : ''}>Left (Z / ←)</option><option value="right"${p.side === 'right' ? ' selected' : ''}>Right (/ / →)</option></select></label>` : ''}
      <div class="ps-row"><button type="button" data-act="dup">Duplicate</button><button type="button" data-act="del" class="ps-danger">Delete</button></div>`;
  }
  el.inspector.addEventListener('input', (e) => {
    const p = state.selected && part(state.selected), f = e.target.dataset.f; if (!p || !f) return;
    if (!e.target._before) e.target._before = snapshot();
    const v = e.target.type === 'range' ? Number(e.target.value) : e.target.value;
    if (f === 'r' || f === 'len') p[f] = v; else if (f === 'side') p.side = v;
    else if (f === 'seg') { const a = Math.atan2(p.y2 - p.y, p.x2 - p.x); p.x2 = clamp(p.x + Math.cos(a) * v, 0, W); p.y2 = clamp(p.y + Math.sin(a) * v, 0, H); }
    const o = e.target.nextElementSibling; if (o && o.tagName === 'OUTPUT') o.textContent = Math.round(v);
  });
  el.inspector.addEventListener('change', (e) => { const b = e.target._before; e.target._before = null; if (b) commit(b); });
  el.inspector.addEventListener('click', (e) => {
    const a = e.target.dataset.act; if (a === 'del') deleteSelected(); else if (a === 'dup') duplicateSelected();
  });

  // Parts bin
  for (const [type, def] of Object.entries(PART_TYPES)) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.tool = type; b.setAttribute('aria-pressed', 'false'); b.title = def.hint;
    b.innerHTML = `<span class="ps-dot" style="background:${def.color}"></span>${def.label}`;
    el.parts.appendChild(b);
  }
  el.parts.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (state.mode === 'play') setMode('build'); setTool(state.tool === b.dataset.tool ? 'select' : b.dataset.tool); });

  /* ── toolbar ─────────────────────────────────────────────── */
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ps-mode],[data-ps-undo],[data-ps-redo],[data-ps-new],[data-ps-starter],[data-ps-export],[data-ps-import],[data-ps-mute]'); if (!b) return;
    if (b.dataset.psMode) setMode(b.dataset.psMode);
    else if ('psUndo' in b.dataset) undo(); else if ('psRedo' in b.dataset) redo();
    else if ('psNew' in b.dataset || 'psStarter' in b.dataset) {
      if (state.table.parts.length > 3 && !confirm('Replace the table you are building? (You can undo this.)')) return;
      const before = snapshot(); state.table = 'psNew' in b.dataset ? blankTable() : defaultTable(); state.selected = null;
      state.undo.push(before); state.redo.length = 0; save(); setMode('build'); refreshUI();
    } else if ('psExport' in b.dataset) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportTable(state.table)], { type: 'application/json' }));
      a.download = `${(state.table.name || 'table').replace(/[^\w-]+/g, '-').toLowerCase()}.pinball.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      say('Saved a .pinball.json file. Share it, then use Open to load it.');
    } else if ('psImport' in b.dataset) el.file.click();
    else if ('psMute' in b.dataset) { state.muted = !state.muted; b.setAttribute('aria-pressed', String(state.muted)); b.textContent = state.muted ? '🔇 Sound off' : '🔊 Sound on'; }
  });
  el.file.addEventListener('change', async () => {
    const f = el.file.files[0]; el.file.value = ''; if (!f) return;
    if (f.size > 500000) return say('That file is too big to be a table.');
    const v = validateTable(await f.text());
    if (!v.ok) return say(v.errors[0]);
    const before = snapshot(); state.table = v.table; state.selected = null; state.undo.push(before); save(); setMode('build');
    say(v.errors.length ? `Opened "${v.table.name}" (${v.errors.length} part${v.errors.length > 1 ? 's' : ''} skipped).` : `Opened "${v.table.name}".`);
  });
  el.name.addEventListener('click', () => { const n = prompt('Name your table', state.table.name); if (n && n.trim()) { state.table.name = n.trim().slice(0, 60); save(); refreshUI(); } });

  /* ── play-mode input ─────────────────────────────────────── */
  const KEYS = { KeyZ: 'left', ArrowLeft: 'left', KeyA: 'left', ShiftLeft: 'left', Slash: 'right', ArrowRight: 'right', KeyL: 'right', KeyD: 'right', ShiftRight: 'right', Space: 'plunge', ArrowDown: 'plunge' };
  function onKey(e, down) {
    if (e.target.matches('input,select,textarea')) return;
    if (state.mode === 'build') {
      if (!down) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selected) { e.preventDefault(); deleteSelected(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (e.key === 'Escape') { setTool('select'); state.selected = null; refreshUI(); }
      return;
    }
    const k = KEYS[e.code]; if (!k || (document.activeElement !== canvas && !e.target.closest('[data-pinball-studio]'))) return;
    e.preventDefault(); if (e.repeat) return;
    state.input[k] = down;
    if (down && k !== 'plunge') tone(k === 'left' ? 150 : 160, 0.04, 'square', 0.03);
    if (e.key === 'Escape') setMode('build');
  }
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.mode === 'play') return setMode('build'); onKey(e, true); });
  root.addEventListener('keyup', (e) => onKey(e, false));
  canvas.addEventListener('blur', () => { state.input.left = state.input.right = state.input.plunge = false; });
  function playPointer(e, down) { // touch: left third / right third flip, bottom-right launches
    const pt = toBoard(e);
    if (pt.x > 520 && pt.y > 600) state.input.plunge = down; else if (pt.x < W / 2) state.input.left = down; else state.input.right = down;
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', (e) => (state.mode === 'build' ? onMove(e) : null));
  canvas.addEventListener('pointerup', (e) => { if (state.mode === 'build') onUp(); else if (e.pointerType === 'touch') { state.input.left = state.input.right = state.input.plunge = false; } });
  canvas.addEventListener('pointercancel', () => { state.drag = null; state.input.left = state.input.right = state.input.plunge = false; });
  root.querySelectorAll('[data-ps-hold]').forEach((b) => {
    const k = b.dataset.psHold;
    const set = (v) => (e) => { e.preventDefault(); if (state.mode !== 'play') return; state.input[k] = v; };
    b.addEventListener('pointerdown', set(true)); b.addEventListener('pointerup', set(false)); b.addEventListener('pointerleave', set(false)); b.addEventListener('pointercancel', set(false));
  });

  function updateHud() {
    const g = state.game;
    el.score.textContent = String(g ? g.score : 0).padStart(7, '0');
    el.balls.textContent = g ? '●'.repeat(Math.max(0, g.balls)) || '—' : '3 ●';
    el.mult.textContent = `×${g ? g.multiplier : 1}`;
    el.hi.textContent = String(state.hi).padStart(7, '0');
  }

  /* ── drawing ─────────────────────────────────────────────── */
  const neon = (c, blur, w, fn) => { ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = blur * scale; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; fn(); ctx.restore(); };
  const line = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };

  function draw(dt) {
    state.t += dt;
    const g = state.game, play = state.mode === 'play';
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (state.shake > 0) { state.shake = Math.max(0, state.shake - dt * 30); ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake); }

    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0d0b2a'); bg.addColorStop(0.55, '#14103a'); bg.addColorStop(1, '#070616');
    ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);

    // soft playfield glow + build grid
    const gl = ctx.createRadialGradient(300, 380, 20, 300, 380, 420); gl.addColorStop(0, 'rgba(120,80,255,.18)'); gl.addColorStop(1, 'rgba(120,80,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    if (!play) {
      ctx.fillStyle = 'rgba(160,170,255,.16)';
      for (let x = GRID * 3; x < W; x += GRID * 3) for (let y = GRID * 3; y < H; y += GRID * 3) ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
    }
    // drain
    const dr = ctx.createLinearGradient(0, 840, 0, 900); dr.addColorStop(0, 'rgba(255,61,154,0)'); dr.addColorStop(1, 'rgba(255,61,154,.28)'); ctx.fillStyle = dr; ctx.fillRect(190, 840, 190, 60);

    // frame
    neon('#7a6cff', 14, 5, () => { ctx.beginPath(); for (const s of FRAME.slice(0, 4)) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); } ctx.stroke();
      ctx.beginPath(); ctx.moveTo(FRAME[4][0], FRAME[4][1]); for (const s of FRAME.slice(4)) ctx.lineTo(s[2], s[3]); ctx.stroke(); });
    // plunger
    const pull = g ? g.plunger.charge * 28 : 0;
    ctx.fillStyle = '#c9ccd8'; ctx.fillRect(PLUNGER.x - 8, PLUNGER.y + BALL_R + pull, 16, 6);
    ctx.strokeStyle = '#8e93a8'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const y = PLUNGER.y + BALL_R + pull + 6 + (i * (884 - (PLUNGER.y + BALL_R + pull + 6))) / 6; ctx.moveTo(PLUNGER.x - 7, y); ctx.lineTo(PLUNGER.x + 7, y + 2); }
    ctx.stroke();

    const parts = play ? g.parts : state.table.parts;
    const flash = (p) => (play && g.flash[p.id] ? Math.min(1, g.flash[p.id] / 0.18) : 0);
    for (const p of parts) {
      const def = PART_TYPES[p.type], f = flash(p), c = def.color;
      if (p.type === 'wall') neon(c, 10, 5, () => line(p.x, p.y, p.x2, p.y2));
      else if (p.type === 'sling') { neon(f ? '#fff' : c, 12 + f * 14, 8 + f * 3, () => line(p.x, p.y, p.x2, p.y2)); neon('#0b2a1c', 0, 3, () => line(p.x, p.y, p.x2, p.y2)); }
      else if (p.type === 'target') { const lit = play && g.lit[p.id]; neon(lit || f ? '#fff3c4' : c, lit ? 18 : 8, 9, () => line(p.x, p.y, p.x2, p.y2)); }
      else if (p.type === 'bumper') {
        const r = p.r * (1 + f * 0.12), gr = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
        gr.addColorStop(0, f ? '#fff' : '#ffb3d9'); gr.addColorStop(0.55, c); gr.addColorStop(1, '#6b0a3b');
        ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = (14 + f * 30) * scale; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.62, 0, 7); ctx.stroke();
      } else if (p.type === 'rollover') {
        const on = play && g.flash[p.id]; neon(on ? '#fff' : c, on ? 20 : 8, 3, () => { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 0.7, p.r * 1.25, 0, 0, 7); ctx.stroke(); });
        if (on) { ctx.fillStyle = 'rgba(179,136,255,.5)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 0.7, p.r * 1.25, 0, 0, 7); ctx.fill(); }
      } else if (p.type === 'post') {
        const gr = ctx.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, p.r); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#8a90a8');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      } else if (def.kind === 'flipper') {
        const fl = play && g.flippers.find((q) => q.id === p.id), gm = flipperGeom(p, fl ? fl.a : FLIPPER_REST);
        const dx = gm.x2 - gm.x1, dy = gm.y2 - gm.y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
        ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 14 * scale;
        const gr = ctx.createLinearGradient(gm.x1 + nx * 11, gm.y1 + ny * 11, gm.x1 - nx * 11, gm.y1 - ny * 11); gr.addColorStop(0, '#fff2c2'); gr.addColorStop(1, '#e09a00');
        ctx.fillStyle = gr; ctx.beginPath();
        ctx.arc(gm.x1, gm.y1, gm.r1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
        ctx.arc(gm.x2, gm.y2, gm.r2, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#7a4a00'; ctx.beginPath(); ctx.arc(gm.x1, gm.y1, 4, 0, 7); ctx.fill();
      }
    }

    // build-mode selection + handles
    if (!play && state.selected) {
      const p = part(state.selected);
      if (p) {
        ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        const k = PART_TYPES[p.type].kind;
        if (k === 'circle') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 7, 0, 7); ctx.stroke(); }
        else if (k === 'segment') { ctx.lineWidth = 1; line(p.x, p.y, p.x2, p.y2); }
        else { const gm = flipperGeom(p, FLIPPER_REST); ctx.beginPath(); ctx.arc(gm.x1, gm.y1, 16, 0, 7); ctx.stroke(); }
        ctx.restore();
        for (const h of handlesOf(p)) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#5b4bff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, 7, 0, 7); ctx.fill(); ctx.stroke(); }
      }
    }

    // ball, trail, particles
    if (play && g) {
      for (const ev of g.events) {
        const s = SOUND[ev.type]; if (s) s();
        if (ev.type === 'bumper' || ev.type === 'bonus') { burst(ev.x, ev.y, ev.type === 'bonus' ? '#ffd166' : '#ff3d9a', ev.type === 'bonus' ? 40 : 10); state.shake = ev.type === 'bonus' ? 10 : 3; }
        else if (ev.type === 'target' || ev.type === 'rollover') burst(ev.x, ev.y, PART_TYPES[ev.type].color, 8);
        else if (ev.type === 'drain') state.shake = 8;
        if (ev.type === 'drain' || ev.type === 'over') say(ev.type === 'over' ? 'Game over. Press Play to go again, or Build to tweak the table.' : `Ball lost. ${g.balls} left.`);
        if (ev.type === 'bonus') say('BONUS! 5,000 × multiplier. Multiplier is up.');
        if (ev.type === 'over' && g.score > state.hi) { state.hi = g.score; safe(() => localStorage.setItem(HI, String(g.score))); }
      }
      g.events.length = 0;
      const b = g.ball;
      if (b) {
        state.trail.push({ x: b.x, y: b.y }); if (state.trail.length > 14) state.trail.shift();
        state.trail.forEach((t, i) => { ctx.fillStyle = `rgba(160,190,255,${(i / state.trail.length) * 0.35})`; ctx.beginPath(); ctx.arc(t.x, t.y, BALL_R * (i / state.trail.length), 0, 7); ctx.fill(); });
        const gr = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, BALL_R);
        gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#b9c4e0'); gr.addColorStop(1, '#4a5273');
        ctx.save(); ctx.shadowColor = '#9fb4ff'; ctx.shadowBlur = 10 * scale; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, 7); ctx.fill(); ctx.restore();
      }
      if (g.status === 'ready' && b) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Hold SPACE, release to launch', 300, 640); }
      if (g.status === 'over') { ctx.fillStyle = 'rgba(5,4,20,.7)'; ctx.fillRect(0, 300, W, 200); ctx.fillStyle = '#ff3d9a'; ctx.font = '800 54px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', 300, 395); ctx.fillStyle = '#fff'; ctx.font = '700 24px system-ui, sans-serif'; ctx.fillText(String(g.score).toLocaleString() + (g.score >= state.hi && g.score > 0 ? '  ★ high score' : ''), 300, 440); }
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const q = state.particles[i]; q.life -= dt; if (q.life <= 0) { state.particles.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 400 * dt;
      ctx.globalAlpha = q.life / q.max; ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, 2.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  function burst(x, y, c, n) { if (state.particles.length > 200) return; for (let i = 0; i < n; i++) { const a = Math.random() * 7, s = 80 + Math.random() * 220; state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, c, life: 0.5, max: 0.5 }); } }

  /* ── loop ────────────────────────────────────────────────── */
  let last = performance.now();
  function frame() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state.mode === 'play' && state.game) {
      advance(state.game, dt, state.input);
    }
    draw(dt); updateHud();
  }
  if (window.SimKit && SimKit.loop) SimKit.loop(frame, { el: SimKit.stage(canvas) });
  else { const tick = () => { frame(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }

  refreshUI(); setTool('select'); say('Build mode. Pick a part, place it, then press Play.');
  root._pinball = { state, setMode };
  return state;
}
