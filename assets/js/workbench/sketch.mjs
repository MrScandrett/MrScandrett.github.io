/* sketch.mjs — the 2D outline editor for Workbench's sketch shapes (extrude,
 * spin, loft, sweep), also used inline by the Profiles lesson.
 *
 * Click an empty spot to add a point (it goes into the nearest edge), drag a
 * point to move it, select one and press Delete or "Remove point" to drop it.
 * Arrow keys nudge the selected point one grid step; [ and ] pick the
 * previous / next point. Points snap to the project grid unless Snap is off.
 *
 * Three kinds of drawing:
 *   closed outline   (closed: true)                     a filled shape
 *   spin silhouette  (closed: false, axis: true)         the left edge is the
 *                    axis: points cannot cross it, and the outline closes along it
 *   open path        (closed: false, no axis)            a line the profile follows
 */

import { smoothPoints } from './shapes.mjs';
import { nice } from './model.mjs';

/* An editable sketch on any canvas. Returns a small controller. */
export function createSketchPad(canvas, {
  points, closed = true, axis = false, smooth = 0, grid = 1, units = 'mm',
  snap = () => true, onChange = () => {}, onCommit = () => {}, onInfo = () => {},
  colors = {},
}) {
  const ctx = canvas.getContext('2d');
  const C = {
    bg: '#1d2228', minor: '#2c343d', major: '#3b4652', zero: '#5d6874', axis: '#e0a64b',
    fill: 'rgba(232, 121, 42, 0.28)', stroke: '#e8792a', point: '#f4f1ea', selected: '#6fb6ff', ...colors,
  };
  const path = !closed && !axis;
  let pts = points.map((p) => [...p]);
  let passes = smooth;
  let selected = -1, drag = -1;
  const cssW = () => canvas.clientWidth || 560, cssH = () => canvas.clientHeight || 400;

  // view: fit the points with room to spare, keep the axis on screen for spins
  let view = fit();
  function fit() {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs, axis ? 0 : Infinity), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY, grid * 10);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const scale = Math.min(cssW(), cssH()) / (span * 1.5);
    return { cx, cy, scale };
  }
  const toScreen = ([x, y]) => [cssW() / 2 + (x - view.cx) * view.scale, cssH() / 2 - (y - view.cy) * view.scale];
  const toWorld = (sx, sy) => [view.cx + (sx - cssW() / 2) / view.scale, view.cy - (sy - cssH() / 2) / view.scale];
  const snapPoint = ([x, y]) => {
    const p = snap() ? [Math.round(x / grid) * grid, Math.round(y / grid) * grid] : [x, y];
    if (axis) p[0] = Math.max(0, p[0]);
    return p.map(nice);
  };

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const w = cssW(), h = cssH();
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
    // grid: a line every `step` units, darker every fifth
    let step = grid;
    while (step * view.scale < 9) step *= 5;
    const [x0, y1] = toWorld(0, 0), [x1, y0] = toWorld(w, h);
    for (let gx = Math.floor(x0 / step) * step; gx <= x1; gx += step) line([gx, y0], [gx, y1], Math.abs(Math.round(gx / step)) % 5 ? C.minor : C.major);
    for (let gy = Math.floor(y0 / step) * step; gy <= y1; gy += step) line([x0, gy], [x1, gy], Math.abs(Math.round(gy / step)) % 5 ? C.minor : C.major);
    line([x0, 0], [x1, 0], C.zero);
    line([0, y0], [0, y1], axis ? C.axis : C.zero, axis ? 2 : 1);
    if (axis) { ctx.fillStyle = C.axis; ctx.font = '600 12px system-ui, sans-serif'; const [ax] = toScreen([0, 0]); ctx.fillText('spin axis', ax + 6, 16); }
    // the outline the shape will really use (smoothed), then the editable points
    const shown = smoothPoints(pts, passes, closed);
    const outline = axis ? [[0, shown[0][1]], ...shown, [0, shown[shown.length - 1][1]]] : shown;
    ctx.beginPath();
    outline.forEach((p, i) => { const [sx, sy] = toScreen(p); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
    if (!path) { ctx.closePath(); ctx.fillStyle = C.fill; ctx.fill(); }
    ctx.strokeStyle = C.stroke; ctx.lineWidth = path ? 3 : 2; ctx.stroke();
    if (path) {
      // arrow at the end so the direction of travel reads
      const a = shown[shown.length - 2], b = shown[shown.length - 1];
      const [ax, ay] = toScreen(a), [bx, by] = toScreen(b);
      const ang = Math.atan2(by - ay, bx - ax);
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.lineTo(bx - 12 * Math.cos(ang - 0.45), by - 12 * Math.sin(ang - 0.45));
      ctx.lineTo(bx - 12 * Math.cos(ang + 0.45), by - 12 * Math.sin(ang + 0.45));
      ctx.closePath(); ctx.fillStyle = C.stroke; ctx.fill();
    }
    if (passes) {
      ctx.beginPath();
      pts.forEach((p, i) => { const [sx, sy] = toScreen(p); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
      if (closed) ctx.closePath();
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(244, 241, 234, 0.45)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    }
    pts.forEach((p, i) => {
      const [sx, sy] = toScreen(p);
      ctx.beginPath(); ctx.arc(sx, sy, i === selected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = i === selected ? C.selected : C.point; ctx.fill();
      ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke();
    });
    const sel = selected >= 0 ? ` · point ${selected + 1}: ${pts[selected][0]}, ${pts[selected][1]} ${units}` : '';
    onInfo(`${pts.length} points${sel}`);
  }
  function line(a, b, color, width = 1) {
    const [ax, ay] = toScreen(a), [bx, by] = toScreen(b);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }

  const local = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * (cssW() / (r.width || cssW())), (e.clientY - r.top) * (cssH() / (r.height || cssH()))]; };
  const nearest = ([sx, sy]) => {
    let best = -1, bestD = 14;
    pts.forEach((p, i) => { const [px, py] = toScreen(p); const d = Math.hypot(px - sx, py - sy); if (d < bestD) { best = i; bestD = d; } });
    return best;
  };
  function insertAt(p) {
    if (pts.length >= 64) return;
    // into the edge it is closest to (or onto the nearer end of an open line)
    let best = pts.length, bestD = Infinity;
    const edges = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < edges; i++) {
      const d = segDist(p, pts[i], pts[(i + 1) % pts.length]);
      if (d < bestD) { bestD = d; best = i + 1; }
    }
    if (!closed) {
      if (Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) < bestD) best = 0;
      if (Math.hypot(p[0] - pts[pts.length - 1][0], p[1] - pts[pts.length - 1][1]) < bestD) best = pts.length;
    }
    pts.splice(best, 0, p);
    selected = best;
  }
  const changed = () => { draw(); onChange(pts); };

  const onDown = (e) => {
    if (e.button > 0) return;
    const at = local(e), hit = nearest(at);
    canvas.setPointerCapture?.(e.pointerId);
    if (hit >= 0) { selected = drag = hit; draw(); } else { insertAt(snapPoint(toWorld(...at))); drag = selected; changed(); }
    e.preventDefault();
  };
  const onMove = (e) => { if (drag < 0) return; pts[drag] = snapPoint(toWorld(...local(e))); changed(); };
  const onUp = () => { if (drag >= 0) onCommit(pts); drag = -1; };
  const onWheel = (e) => { e.preventDefault(); view.scale *= Math.exp(-e.deltaY * 0.0015); draw(); };
  const onKey = (e) => {
    if (document.activeElement !== canvas) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected >= 0) { e.preventDefault(); remove(); return; }
    if (e.key === '[' || e.key === ']') { e.preventDefault(); selected = (Math.max(selected, 0) + (e.key === ']' ? 1 : pts.length - 1)) % pts.length; draw(); return; }
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (move) {
      e.preventDefault();
      if (selected < 0) selected = 0;
      const k = e.shiftKey ? 5 : 1;
      const [x, y] = pts[selected];
      pts[selected] = [nice(x + move[0] * grid * k), nice(y + move[1] * grid * k)];
      if (axis) pts[selected][0] = Math.max(0, pts[selected][0]);
      changed(); onCommit(pts);
    }
  };
  function remove() {
    if (selected < 0 || pts.length <= (closed ? 3 : 2)) return;
    pts.splice(selected, 1);
    selected = Math.min(selected, pts.length - 1);
    changed(); onCommit(pts);
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('keydown', onKey);

  return {
    get points() { return pts.map((p) => [...p]); },
    setPoints(next, refit = true) { pts = next.map((p) => [...p]); selected = -1; if (refit) view = fit(); draw(); },
    setSmooth(n) { passes = n; draw(); },
    fit() { view = fit(); draw(); },
    remove,
    draw,
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('keydown', onKey);
    },
  };
}

/* Workbench's modal sketch dialog. */
export function openSketch(dialog, { points, closed, axis, smooth = 0, grid, units, title }, onDone) {
  const canvas = dialog.querySelector('canvas');
  const info = dialog.querySelector('[data-sketch-info]');
  const snapBox = dialog.querySelector('[data-sketch-snap]');
  dialog.querySelector('[data-sketch-title]').textContent = title;
  const pad = createSketchPad(canvas, {
    points, closed, axis, smooth, grid, units,
    snap: () => snapBox.checked,
    onInfo: (text) => { info.textContent = text; },
  });
  const buttons = {
    remove: dialog.querySelector('[data-sketch-remove]'),
    fit: dialog.querySelector('[data-sketch-fit]'),
    done: dialog.querySelector('[data-sketch-done]'),
    cancel: dialog.querySelector('[data-sketch-cancel]'),
  };
  const onRemove = () => pad.remove();
  const onFit = () => pad.fit();
  const onDoneClick = () => { const pts = pad.points; close(); onDone(pts); };
  const onCancel = () => close();
  snapBox.addEventListener('change', pad.draw);
  buttons.remove.addEventListener('click', onRemove);
  buttons.fit.addEventListener('click', onFit);
  buttons.done.addEventListener('click', onDoneClick);
  buttons.cancel.addEventListener('click', onCancel);
  dialog.addEventListener('close', cleanup, { once: true });
  function close() { if (dialog.open) dialog.close(); }
  function cleanup() {
    pad.destroy();
    snapBox.removeEventListener('change', pad.draw);
    buttons.remove.removeEventListener('click', onRemove);
    buttons.fit.removeEventListener('click', onFit);
    buttons.done.removeEventListener('click', onDoneClick);
    buttons.cancel.removeEventListener('click', onCancel);
  }
  dialog.showModal();
  requestAnimationFrame(() => { pad.fit(); canvas.focus(); });
}

function segDist([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
