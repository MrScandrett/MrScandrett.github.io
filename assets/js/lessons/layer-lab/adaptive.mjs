/* adaptive.mjs — makes Layer Lab fit whatever it is opened on.
 *
 * Layout is chosen from the editor's own size (it lives inside a lesson column,
 * so the window size alone says little):
 *   data-layout  compact (< 640px wide) · medium · wide (≥ 1000px)
 *   data-panels  dock (a column beside the canvas) · drawer (slides over the
 *                canvas from the right) · sheet (rises from the bottom, phones)
 *   data-short   present when the editor is under 520px tall (landscape phones)
 * CSS in photo-editing-workshop.css keys off those attributes.
 *
 * Also here: full screen (real browser full screen on touch devices, which hides
 * the address bar; "fill the window" elsewhere so Esc still belongs to the app),
 * touch gestures (two fingers pinch-zoom and pan, a stylus rejects the palm), a
 * long-press for hidden tools, arrow keys across the menu bar, and the touch
 * guard that stops a swipe down the lesson from painting on the poster.
 */
import { TOOLS, TOOLBOX } from './tools.mjs';
import { renderStatus } from './panels.mjs';
import { icon } from './icons.mjs';

const COMPACT_W = 640, WIDE_W = 1000, DOCK_W = 900, DOCK_H = 480, SHORT_H = 520;
const coarse = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : { matches: false };

/* ── layout ─────────────────────────────────────────────────────────── */

export function watchLayout(s) {
  const r = s.root;
  let frame = 0;
  const apply = () => {
    frame = 0;
    const { width: w, height: h } = r.getBoundingClientRect();
    if (!w) return;
    const layout = w < COMPACT_W ? 'compact' : w < WIDE_W ? 'medium' : 'wide';
    const panels = layout === 'compact' ? 'sheet' : w >= DOCK_W && h >= DOCK_H ? 'dock' : 'drawer';
    if (r.dataset.layout !== layout) r.dataset.layout = layout;
    const short = h < SHORT_H;
    r.toggleAttribute('data-short', short);
    // Paged: the panels show one page at a time with Layers as a tab (no room to stack them).
    const paged = panels === 'sheet' || (panels === 'drawer' && short);
    if (paged !== !!s.sheetMode) { s.sheetMode = paged; r.toggleAttribute('data-paged', paged); s.refreshPanels?.(); }
    if (r.dataset.panels !== panels) {
      const wasOverlay = s.panelsOverlay;
      r.dataset.panels = panels;
      s.panelsOverlay = panels !== 'dock';
      // Moving from a docked column to an overlay starts with it closed, so the canvas gets the room.
      if (s.panelsOverlay && !wasOverlay) s.overlayOpen = false;
      applyPanels(s);
    }
  };
  // Deferred a frame: changing data-layout resizes the editor, which would re-enter the observer.
  new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(apply); }).observe(r);
  apply();
}

export function showPanels(s, view) {
  if (view === false) {
    if (s.panelsOverlay) s.overlayOpen = false; else s.dockHidden = true;
  } else {
    if (view) s.sheetView = view;
    if (s.panelsOverlay) s.overlayOpen = true; else s.dockHidden = false;
  }
  applyPanels(s);
  if (view && s.panelsOverlay) s.el.panels.querySelector('[role=tab].on')?.focus({ preventScroll: true });
}

function applyPanels(s) {
  const shown = s.panelsOverlay ? !!s.overlayOpen : !s.dockHidden;
  s.panelsShown = shown;
  s.root.toggleAttribute('data-panels-open', shown);
  s.el.panels.dataset.view = s.sheetView;
  s.el.panels.inert = !shown;
  for (const b of s.root.querySelectorAll('.lls-panels-btn')) { b.setAttribute('aria-expanded', String(shown)); b.setAttribute('aria-pressed', String(shown)); }
  const dl = s.root.querySelector('.lls-dock-layers');
  dl?.setAttribute('aria-expanded', String(shown && s.sheetView === 'layers'));
  dl?.classList.toggle('on', shown && s.sheetView === 'layers');
  if (s.doc !== undefined) s.refreshPanels();
}

/* ── full screen ────────────────────────────────────────────────────── */

const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

export function setMaximized(s, on) {
  const r = s.root;
  if (!!s.maximized === on) return;
  s.maximized = on;
  r.classList.toggle('lls-maximized', on);
  document.documentElement.classList.toggle('lls-has-maximized', on);
  lift(r, on);
  const b = r.querySelector('[data-cmd="maximize"]');
  b.setAttribute('aria-pressed', String(on));
  b.title = on ? 'Exit full screen (F or Esc)' : 'Full screen (F)';
  b.innerHTML = `${icon(on ? 'shrink' : 'expand')}<span>${on ? 'Exit full screen' : 'Full screen'}</span>`;
  if (!s.fsWired) {
    s.fsWired = true;
    const sync = () => {
      if (fsElement() === r) s.realFullscreen = true;
      else if (s.realFullscreen) { s.realFullscreen = false; if (s.maximized) setMaximized(s, false); }
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
  }
  if (on) {
    s.engaged = true;
    // On phones and tablets the browser's own bars eat a third of the screen, so ask for real full
    // screen. With a mouse and keyboard, filling the window is enough and keeps Esc for the app.
    const req = r.requestFullscreen || r.webkitRequestFullscreen;
    if (coarse.matches && req && !fsElement()) {
      try { const p = req.call(r, { navigationUI: 'hide' }); p?.catch?.(() => {}); } catch { /* not allowed here: the CSS fallback already fills the window */ }
    }
  } else if (fsElement() === r) {
    try { const p = (document.exitFullscreen || document.webkitExitFullscreen).call(document); p?.catch?.(() => {}); } catch { /* ignore */ }
  }
  s.updateTouchGuard?.();
  requestAnimationFrame(() => s.fit());
}

/* Lesson layouts give <main> a z-index (and sometimes a transform), which traps a position:fixed
 * child under the site header. While maximized, neutralise those ancestors. */
const TRAPS = ['transform', 'filter', 'perspective', 'backdropFilter', 'contain'];
function lift(r, on) {
  if (!on) { for (const el of document.querySelectorAll('.lls-lift')) el.classList.remove('lls-lift'); return; }
  for (let el = r.parentElement; el && el !== document.documentElement; el = el.parentElement) {
    const cs = getComputedStyle(el);
    if (cs.zIndex !== 'auto' || cs.willChange !== 'auto' || TRAPS.some((p) => cs[p] && cs[p] !== 'none')) el.classList.add('lls-lift');
  }
}

/* ── touch guard ────────────────────────────────────────────────────── */

export function wireTouchGuard(s) {
  const veil = s.el.veil;
  const update = () => { veil.hidden = !(coarse.matches && !s.maximized && !s.touchActive); };
  veil.addEventListener('click', (e) => {
    if (e.target.closest('[data-cmd]')) return;
    s.touchActive = true;
    update();
    s.el.viewport.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && s.touchActive && !s.root.contains(e.target) && !e.target.closest?.('.lls-dialog')) { s.touchActive = false; update(); }
  }, true);
  coarse.addEventListener?.('change', update);
  s.updateTouchGuard = update;
  update();
}

/* ── canvas gestures ────────────────────────────────────────────────── */

/**
 * h.down(e) → true when a tool started, h.move(e), h.up(e).
 * Mouse and pen go straight through. A single finger waits HOLD ms (or until it moves) before the
 * tool starts, so a second finger arriving can turn the touch into pinch-zoom + two-finger pan
 * without leaving a brush dab behind. A quick tap still reaches the tool (bucket, wand, eyedropper).
 */
export function wireGestures(s, h) {
  const ov = s.el.overlay;
  const HOLD = 90, SLOP = 8;
  const touches = new Map();
  let pending = null, live = null, pinch = null, latch = false, pens = 0;

  const capture = (e) => { try { ov.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ } };
  const start = (e) => { if (h.down(e)) live = e.pointerId; };
  const flush = () => { if (!pending) return; const { e, timer } = pending; clearTimeout(timer); pending = null; start(e); };
  const pair = () => { const [a, b] = [...touches.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  const beginPinch = () => {
    if (pending) { clearTimeout(pending.timer); pending = null; }
    if (live != null) { const last = touches.get(live)?.e; live = null; if (last) h.up(last); }
    const p = pair(), v = s.view;
    pinch = { ...p, zoom: v.zoom, panX: v.panX, panY: v.panY };
    latch = true;
  };
  const doPinch = () => {
    const p = pair(), v = s.view, r = s.el.viewport.getBoundingClientRect();
    const z = Math.min(64, Math.max(0.02, pinch.zoom * p.d / pinch.d));
    const dx = (pinch.x - r.left - pinch.panX) / pinch.zoom, dy = (pinch.y - r.top - pinch.panY) / pinch.zoom;
    v.zoom = z; v.panX = p.x - r.left - dx * z; v.panY = p.y - r.top - dy * z;
    s.redraw();
    renderStatus(s);
  };

  ov.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') {
      if (e.pointerType === 'pen') pens++;
      capture(e);
      e.preventDefault();
      start(e);
      return;
    }
    if (pens) return; // a palm resting on the glass while drawing with a stylus
    e.preventDefault();
    capture(e);
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, e });
    if (!s.doc) return;
    if (touches.size === 2) { beginPinch(); return; }
    if (touches.size > 2 || latch) return;
    pending = { e, x: e.clientX, y: e.clientY, timer: setTimeout(flush, HOLD) };
  });

  ov.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY, e });
      if (pinch && touches.size >= 2) { doPinch(); return; }
      if (pending?.e.pointerId === e.pointerId && Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > SLOP) flush();
      if (live !== e.pointerId) return;
    }
    h.move(e);
  });

  const end = (e, cancelled) => {
    if (e.pointerType !== 'touch') {
      if (e.pointerType === 'pen') pens = Math.max(0, pens - 1);
      live = null;
      h.up(e);
      return;
    }
    if (!touches.has(e.pointerId)) return;
    if (pending?.e.pointerId === e.pointerId) {
      if (cancelled) { clearTimeout(pending.timer); pending = null; } else flush();
    }
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, e });
    if (live === e.pointerId) { live = null; h.up(e); }
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    if (!touches.size) latch = false;
  };
  ov.addEventListener('pointerup', (e) => end(e, false));
  ov.addEventListener('pointercancel', (e) => end(e, true));
}

/* ── long-press for hidden tools ────────────────────────────────────── */

export function wireLongPress(s) {
  const box = s.el.toolbox;
  let timer = 0, fired = false, at = null;
  box.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.lls-tool');
    fired = false;
    if (!t || e.pointerType === 'mouse') return;
    const group = TOOLBOX.find((g) => g[0] === t.dataset.group);
    if (group.length < 2) return;
    at = { x: e.clientX, y: e.clientY };
    timer = setTimeout(() => {
      fired = true;
      navigator.vibrate?.(10);
      s.popup(t, group.map((id) => ({ label: TOOLS[id].label, shortcut: TOOLS[id].key, action: () => s.setTool(id) })), 'Tools');
    }, 450);
  });
  const cancel = () => clearTimeout(timer);
  box.addEventListener('pointermove', (e) => { if (at && Math.hypot(e.clientX - at.x, e.clientY - at.y) > 10) cancel(); });
  box.addEventListener('pointerup', cancel);
  box.addEventListener('pointercancel', cancel);
  // The click that ends a long-press must not also switch tools.
  box.addEventListener('click', (e) => { if (fired) { fired = false; e.stopPropagation(); e.preventDefault(); } }, true);
  box.addEventListener('contextmenu', (e) => { if (e.pointerType && e.pointerType !== 'mouse' && e.target.closest('.lls-tool')) { e.preventDefault(); e.stopPropagation(); } }, true);
}

/* ── menu bar keys ──────────────────────────────────────────────────── */

export function wireMenubarKeys(s) {
  const bar = s.root.querySelector('.lls-menubar');
  bar.addEventListener('keydown', (e) => {
    const items = [...bar.querySelectorAll(':scope > button')].filter((b) => b.offsetParent && !b.disabled);
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const go = (j) => { e.preventDefault(); items[(j + items.length) % items.length].focus(); };
    if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else if (e.key === 'ArrowDown' && items[i].dataset.menu) { e.preventDefault(); s.openMenu(items[i].dataset.menu, items[i]); }
  });
}
