/* sketch.mjs — the 2D outline editor for Sketch → extrude and Sketch → spin.
 *
 * Click an empty spot to add a point (it goes into the nearest edge), drag a
 * point to move it, select one and press Delete or "Remove point" to drop it.
 * Points snap to the project grid unless Snap is off. For a spin, the left
 * edge is the axis: points cannot cross it, and the outline closes along it.
 */

import { smoothPoints } from './shapes.mjs';
import { nice } from './model.mjs';

export function openSketch(dialog, { points, closed, axis, smooth = 0, grid, units, title }, onDone) {
  const canvas = dialog.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const info = dialog.querySelector('[data-sketch-info]');
  const snapBox = dialog.querySelector('[data-sketch-snap]');
  dialog.querySelector('[data-sketch-title]').textContent = title;
  let pts = points.map((p) => [...p]);
  let selected = -1, drag = -1;
  const cssW = () => canvas.clientWidth || 560, cssH = () => canvas.clientHeight || 400;

  // view: fit the points with room to spare, keep the axis on screen for spins
  let view = fit();
  function fit() {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    let minX = Math.min(...xs, axis ? 0 : Infinity), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY, grid * 10);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const scale = Math.min(cssW(), cssH()) / (span * 1.5);
    return { cx, cy, scale };
  }
  const toScreen = ([x, y]) => [cssW() / 2 + (x - view.cx) * view.scale, cssH() / 2 - (y - view.cy) * view.scale];
  const toWorld = (sx, sy) => [view.cx + (sx - cssW() / 2) / view.scale, view.cy - (sy - cssH() / 2) / view.scale];
  const snap = ([x, y]) => {
    let p = snapBox.checked ? [Math.round(x / grid) * grid, Math.round(y / grid) * grid] : [x, y];
    if (axis) p[0] = Math.max(0, p[0]);
    return p.map(nice);
  };

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssW() * dpr; canvas.height = cssH() * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#1d2228'; ctx.fillRect(0, 0, cssW(), cssH());
    // grid: a line every `step` units, darker every fifth
    let step = grid;
    while (step * view.scale < 9) step *= 5;
    const [x0, y1] = toWorld(0, 0), [x1, y0] = toWorld(cssW(), cssH());
    for (let gx = Math.floor(x0 / step) * step; gx <= x1; gx += step) line([gx, y0], [gx, y1], Math.abs(Math.round(gx / step)) % 5 ? '#2c343d' : '#3b4652');
    for (let gy = Math.floor(y0 / step) * step; gy <= y1; gy += step) line([x0, gy], [x1, gy], Math.abs(Math.round(gy / step)) % 5 ? '#2c343d' : '#3b4652');
    line([x0, 0], [x1, 0], '#5d6874');
    line([0, y0], [0, y1], axis ? '#e0a64b' : '#5d6874', axis ? 2 : 1);
    if (axis) { ctx.fillStyle = '#e0a64b'; ctx.font = '600 12px system-ui, sans-serif'; const [ax] = toScreen([0, 0]); ctx.fillText('spin axis', ax + 6, 16); }
    // the outline the shape will really use (smoothed), then the editable points
    const shown = smoothPoints(pts, smooth, closed);
    const path = axis ? [[0, shown[0][1]], ...shown, [0, shown[shown.length - 1][1]]] : shown;
    ctx.beginPath();
    path.forEach((p, i) => { const [sx, sy] = toScreen(p); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
    ctx.closePath();
    ctx.fillStyle = 'rgba(232, 121, 42, 0.28)'; ctx.fill();
    ctx.strokeStyle = '#e8792a'; ctx.lineWidth = 2; ctx.stroke();
    if (smooth) {
      ctx.beginPath();
      pts.forEach((p, i) => { const [sx, sy] = toScreen(p); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
      if (closed) ctx.closePath();
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(244, 241, 234, 0.45)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    }
    pts.forEach((p, i) => {
      const [sx, sy] = toScreen(p);
      ctx.beginPath(); ctx.arc(sx, sy, i === selected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = i === selected ? '#6fb6ff' : '#f4f1ea'; ctx.fill();
      ctx.strokeStyle = '#1d2228'; ctx.lineWidth = 2; ctx.stroke();
    });
    const sel = selected >= 0 ? ` · point ${selected + 1}: ${pts[selected][0]}, ${pts[selected][1]} ${units}` : '';
    info.textContent = `${pts.length} points${sel}`;
  }
  function line(a, b, color, width = 1) {
    const [ax, ay] = toScreen(a), [bx, by] = toScreen(b);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }

  const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const nearest = ([sx, sy]) => {
    let best = -1, bestD = 12;
    pts.forEach((p, i) => { const [px, py] = toScreen(p); const d = Math.hypot(px - sx, py - sy); if (d < bestD) { best = i; bestD = d; } });
    return best;
  };
  function insertAt(p) {
    if (pts.length >= 64) return;
    // into the edge it is closest to (or onto the nearer end of an open line)
    let best = pts.length, bestD = Infinity;
    const edges = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < edges; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const d = segDist(p, a, b);
      if (d < bestD) { bestD = d; best = i + 1; }
    }
    if (!closed) {
      if (Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) < bestD) best = 0;
      if (Math.hypot(p[0] - pts[pts.length - 1][0], p[1] - pts[pts.length - 1][1]) < bestD) best = pts.length;
    }
    pts.splice(best, 0, p);
    selected = best;
  }

  const onDown = (e) => {
    const at = local(e), hit = nearest(at);
    canvas.setPointerCapture(e.pointerId);
    if (hit >= 0) { selected = drag = hit; } else { insertAt(snap(toWorld(...at))); drag = selected; }
    draw();
  };
  const onMove = (e) => { if (drag < 0) return; pts[drag] = snap(toWorld(...local(e))); draw(); };
  const onUp = () => { drag = -1; };
  const onWheel = (e) => { e.preventDefault(); const f = Math.exp(-e.deltaY * 0.0015); view.scale *= f; draw(); };
  const onKey = (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected >= 0 && document.activeElement === canvas) { e.preventDefault(); remove(); }
  };
  function remove() {
    if (selected < 0 || pts.length <= (closed ? 3 : 2)) return;
    pts.splice(selected, 1);
    selected = Math.min(selected, pts.length - 1);
    draw();
  }
  const buttons = {
    remove: dialog.querySelector('[data-sketch-remove]'),
    fit: dialog.querySelector('[data-sketch-fit]'),
    done: dialog.querySelector('[data-sketch-done]'),
    cancel: dialog.querySelector('[data-sketch-cancel]'),
  };
  const onRemove = () => remove();
  const onFit = () => { view = fit(); draw(); };
  const onDoneClick = () => { close(); onDone(pts); };
  const onCancel = () => close();
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('keydown', onKey);
  snapBox.addEventListener('change', draw);
  buttons.remove.addEventListener('click', onRemove);
  buttons.fit.addEventListener('click', onFit);
  buttons.done.addEventListener('click', onDoneClick);
  buttons.cancel.addEventListener('click', onCancel);
  dialog.addEventListener('close', cleanup, { once: true });
  function close() { if (dialog.open) dialog.close(); }
  function cleanup() {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('keydown', onKey);
    snapBox.removeEventListener('change', draw);
    buttons.remove.removeEventListener('click', onRemove);
    buttons.fit.removeEventListener('click', onFit);
    buttons.done.removeEventListener('click', onDoneClick);
    buttons.cancel.removeEventListener('click', onCancel);
  }
  dialog.showModal();
  requestAnimationFrame(() => { view = fit(); draw(); canvas.focus(); });
}

function segDist([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
