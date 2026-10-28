/* Paper study: clip at a crease, then lift and rotate the moving polygons in 3D. */
(() => {
  'use strict';
  const svg = document.getElementById('og-fold-svg');
  if (!svg) return;
  const $ = (id) => document.getElementById(id);
  const side = 300;
  const square = [{ x: 0, y: 0 }, { x: side, y: 0 }, { x: side, y: side }, { x: 0, y: side }];
  const patterns = {
    diagonal: [{ name: 'Match opposite corners', a: [0, 0], b: [300, 300], direction: 'valley' }],
    book: [{ name: 'Match left and right edges', a: [150, 0], b: [150, 300], direction: 'valley' }],
    dart: [
      { name: 'Mark the center line from top to bottom', a: [150, 0], b: [150, 300], direction: 'valley' },
      { name: 'Unfold; draw from top center to left middle', a: [150, 0], b: [0, 150], direction: 'valley', unfold: true },
      { name: 'Draw from right middle to top center', a: [300, 150], b: [150, 0], direction: 'valley' },
      { name: 'Fold in half: draw from bottom center to top center', a: [150, 300], b: [150, 0], direction: 'valley' }
    ],
    waterbomb: [
      { name: 'First diagonal: match opposite corners', a: [0, 0], b: [300, 300], direction: 'valley' },
      { name: 'Unfold and crease the other diagonal', a: [300, 0], b: [0, 300], direction: 'valley', unfold: true },
      { name: 'Unfold, turn over, and crease across the middle', a: [0, 150], b: [300, 150], direction: 'mountain', unfold: true }
    ],
    crane: [
      { name: 'Crane start: crease one diagonal', a: [0, 0], b: [300, 300], direction: 'valley' },
      { name: 'Unfold and crease the second diagonal', a: [300, 0], b: [0, 300], direction: 'valley', unfold: true },
      { name: 'Turn over; fold across the middle', a: [0, 150], b: [300, 150], direction: 'mountain', unfold: true },
      { name: 'Unfold; fold the other middle line', a: [150, 0], b: [150, 300], direction: 'mountain', unfold: true }
    ]
  };
  let layers = [{ points: square, face: 0 }];
  let history = [];
  let creases = [];
  let pending = null;
  let progress = 0;
  let dragStart = null;
  let dragEnd = null;
  let frame = 0;
  let playing = false;
  let cameraAngle = true;
  let cameraYaw = -.24;
  let challengeStep = 0;
  let demo = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cross = (p, a, b) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  const point = (v) => ({ x: v[0], y: v[1] });
  const clean = (poly) => poly.filter((p, i) => i === 0 || Math.hypot(p.x - poly[i - 1].x, p.y - poly[i - 1].y) > .01);
  function clip(poly, a, b, keepPositive) {
    const out = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const d1 = cross(p, a, b) * (keepPositive ? 1 : -1);
      const d2 = cross(q, a, b) * (keepPositive ? 1 : -1);
      if (d1 >= -.0001) out.push(p);
      if ((d1 < -.0001 && d2 > .0001) || (d1 > .0001 && d2 < -.0001)) {
        const t = d1 / (d1 - d2);
        out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
      }
    });
    return clean(out);
  }
  function reflect(p, a, b, amount, direction) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const k = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    const x = a.x + k * dx, y = a.y + k * dy;
    const cosine = Math.cos(Math.PI * amount);
    const sine = Math.sin(Math.PI * amount) * (direction === 'mountain' ? -1 : 1);
    return { x: x + (p.x - x) * cosine, y: y + (p.y - y) * cosine, z: Math.hypot(p.x - x, p.y - y) * sine };
  }
  function folded(source, fold, amount) {
    const still = [], moved = [];
    const positive = fold.direction === 'valley';
    source.forEach((layer) => {
      const fixed = clip(layer.points, fold.a, fold.b, !positive);
      const moving = clip(layer.points, fold.a, fold.b, positive);
      if (fixed.length >= 3) still.push({ points: fixed, face: layer.face });
      if (moving.length >= 3) moved.push({ points: moving.map((p) => reflect(p, fold.a, fold.b, amount, fold.direction)), face: amount === 1 ? 1 - layer.face : layer.face });
    });
    return [...still, ...moved];
  }
  const fmt = (n) => Number(n.toFixed(1));
  function project(p, layer = 0) {
    const dx = p.x - 150, dy = p.y - 150;
    const z = (p.z || 0) + layer * 2.4;
    if (!cameraAngle) return { x: 250 + dx, y: 206 + dy - z * .12 };
    const yaw = cameraYaw, tilt = .45;
    const x = dx * Math.cos(yaw) + z * Math.sin(yaw);
    const depth = -dx * Math.sin(yaw) + z * Math.cos(yaw);
    return { x: 250 + x, y: 206 + dy * Math.cos(tilt) - depth * Math.sin(tilt) };
  }
  function unproject(event) {
    const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    const local = p.matrixTransform(svg.getScreenCTM().inverse());
    if (!cameraAngle) return { x: local.x - 100, y: local.y - 56 };
    const dx = (local.x - 250) / Math.cos(cameraYaw);
    const dy = (local.y - 206 - dx * Math.sin(cameraYaw) * Math.sin(.45)) / Math.cos(.45);
    return { x: dx + 150, y: dy + 150 };
  }
  function render() {
    const visible = pending ? folded(layers, pending, progress) : layers;
    const polys = visible.map((layer, i) => `<polygon points="${layer.points.map((p) => { const q = project(p, i); return `${fmt(q.x)},${fmt(q.y)}`; }).join(' ')}" fill="${layer.face ? 'url(#paper-reverse)' : 'url(#paper-front)'}" stroke="#6c432e" stroke-width="2" filter="url(#paper-shadow)"/>`).join('');
    const lines = creases.map((fold) => { const a = project(fold.a, visible.length), b = project(fold.b, visible.length); return `<line x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}" stroke="${fold.direction === 'mountain' ? '#b04745' : '#286b80'}" stroke-width="2" stroke-dasharray="7 5" opacity=".8"/>`; }).join('');
    const active = pending || (dragStart && dragEnd ? { a: dragStart, b: dragEnd } : null);
    const a = active ? project(active.a, visible.length + 1) : null, b = active ? project(active.b, visible.length + 1) : null;
    const guide = active ? `<line x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}" stroke="#f6e7a4" stroke-width="5" stroke-dasharray="8 5"/>` : '';
    svg.innerHTML = `<defs><linearGradient id="paper-front" x2=".8" y2="1"><stop stop-color="#f6c17a"/><stop offset="1" stop-color="#d68259"/></linearGradient><linearGradient id="paper-reverse" x2=".6" y2="1"><stop stop-color="#fff9e8"/><stop offset="1" stop-color="#ddd2b9"/></linearGradient><filter id="paper-shadow" x="-20%" y="-30%" width="150%" height="170%"><feDropShadow dx="1" dy="9" stdDeviation="7" flood-color="#102a2b" flood-opacity=".32"/></filter></defs><rect width="500" height="430" fill="#183b3b"/><path d="M0 350 Q250 275 500 350V430H0Z" fill="#1e4846"/><ellipse cx="250" cy="332" rx="180" ry="31" fill="#0b2a2d" opacity=".55"/><g stroke="#55817a" stroke-width="1" opacity=".45"><path d="M0 370H500M0 405H500M70 0V430M430 0V430"/></g><text x="24" y="37" fill="#e9e2c9" font-size="16" font-weight="700">${cameraAngle ? '3D WORKBENCH' : 'TOP VIEW'}</text><text x="24" y="406" fill="#c6dbd3" font-size="13">15 cm paper · drag to place a crease</text>${polys}${lines}${guide}`;
    const points = visible.flatMap((l) => l.points);
    const w = points.length ? (Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x))) / 20 : 0;
    const h = points.length ? (Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y))) / 20 : 0;
    $('og-fold-span').textContent = `${w.toFixed(1)} × ${h.toFixed(1)} cm`;
    $('og-fold-count').textContent = String(creases.length);
    $('og-fold-length').textContent = creases.length ? `${(Math.hypot(creases.at(-1).b.x - creases.at(-1).a.x, creases.at(-1).b.y - creases.at(-1).a.y) / 20).toFixed(1)} cm` : '—';
    $('og-fold-progress').value = String(Math.round(progress * 100));
    $('og-fold-undo').disabled = !history.length && !pending;
    const mission = $('og-fold-mission');
    const pattern = patterns[$('og-fold-pattern').value];
    if (mission) mission.textContent = demo ? 'Watching the fold sequence' : pattern ? `${Math.min(challengeStep, pattern.length)} / ${pattern.length} folds matched` : `${creases.length} fold${creases.length === 1 ? '' : 's'} in free study`;
  }
  function status(message) { $('og-fold-status').textContent = message; }
  function stop() { playing = false; demo = false; cancelAnimationFrame(frame); $('og-fold-play').textContent = 'Watch sequence'; }
  function reset(message = 'New sheet ready. Drag across it to place a crease.') {
    stop(); layers = [{ points: square, face: 0 }]; history = []; creases = []; pending = null; progress = 0; challengeStep = 0; demo = false;
    $('og-fold-instruction').textContent = 'Choose a preset crease or drag on the sheet.';
    status(message); render();
  }
  function commit() {
    if (!pending) return;
    history.push({ layers, creases: [...creases], challengeStep });
    layers = folded(layers, pending, 1);
    creases.push(pending);
    const pattern = patterns[$('og-fold-pattern').value];
    let matched = false;
    if (pattern && !demo && challengeStep < pattern.length) {
      const target = pattern[challengeStep];
      const sameLine = (p, q) => Math.hypot(p.x - q[0], p.y - q[1]) < 26;
      if (pending.direction === target.direction && sameLine(pending.a, target.a) && sameLine(pending.b, target.b)) {
        matched = true;
        challengeStep++;
        $('og-fold-instruction').textContent = challengeStep === pattern.length ? 'Challenge complete. Compare your model with real paper.' : `Next: ${pattern[challengeStep].name}`;
      }
    }
    status(pattern && !demo ? matched ? 'Crease matched. Check the next instruction.' : 'Crease made, but it does not match the next challenge step. Undo and try again.' : `${pending.name || 'Custom crease'} complete. Compare the shape with a real sheet.`);
    pending = null; progress = 0; render();
  }
  function begin(fold) {
    stop(); pending = fold; progress = 0;
    $('og-fold-instruction').textContent = fold.name || 'Custom crease: compare the folded span and crease length.';
    status(`Ready to fold: ${fold.name || 'custom crease'}. Move the progress slider to inspect the motion.`);
    render();
  }
  function animate(done) {
    const start = performance.now(), initial = progress;
    function tick(now) {
      progress = Math.min(1, initial + (1 - initial) * (now - start) / (reducedMotion.matches ? 1 : 700));
      render();
      if (progress < 1) frame = requestAnimationFrame(tick);
      else { commit(); if (done) done(); }
    }
    frame = requestAnimationFrame(tick);
  }
  const presets = {
    horizontal: [[0, 150], [300, 150]], vertical: [[150, 0], [150, 300]],
    diagonal: [[0, 0], [300, 300]], 'other-diagonal': [[300, 0], [0, 300]]
  };
  document.querySelectorAll('[data-fold-preset]').forEach((button) => button.addEventListener('click', () => {
    const [a, b] = presets[button.dataset.foldPreset];
    begin({ a: point(a), b: point(b), direction: $('og-fold-direction').value, name: `${button.textContent.trim()} fold` });
    animate();
  }));
  $('og-fold-progress').addEventListener('input', (event) => {
    if (!pending) return;
    stop(); progress = Number(event.target.value) / 100;
    if (progress === 1) commit(); else render();
  });
  $('og-fold-undo').addEventListener('click', () => {
    stop(); if (pending) { pending = null; progress = 0; }
    else if (history.length) { const previous = history.pop(); layers = previous.layers; creases = previous.creases; challengeStep = previous.challengeStep; }
    status('Previous fold restored.'); render();
  });
  $('og-fold-reset').addEventListener('click', () => reset());
  $('og-fold-view').addEventListener('click', () => { cameraAngle = !cameraAngle; $('og-fold-view').textContent = cameraAngle ? 'Top view' : '3D view'; render(); });
  $('og-fold-turn-left').addEventListener('click', () => { cameraAngle = true; cameraYaw = Math.max(-.7, cameraYaw - .16); $('og-fold-view').textContent = 'Top view'; render(); });
  $('og-fold-turn-right').addEventListener('click', () => { cameraAngle = true; cameraYaw = Math.min(.7, cameraYaw + .16); $('og-fold-view').textContent = 'Top view'; render(); });
  $('og-fold-unfold').addEventListener('click', () => { stop(); layers = [{ points: square, face: 0 }]; pending = null; progress = 0; status('Sheet unfolded. Creases remain for the next fold.'); render(); });
  $('og-fold-pattern').addEventListener('change', () => reset('Pattern selected. Press Play pattern to watch its folds.'));
  $('og-fold-play').addEventListener('click', () => {
    if (playing) { stop(); status('Playback paused.'); render(); return; }
    const pattern = patterns[$('og-fold-pattern').value];
    if (!pattern) { status('Choose a guided pattern to play.'); return; }
    reset('Playing guided pattern.'); playing = true; demo = true; $('og-fold-play').textContent = 'Pause';
    let index = 0;
    function next() {
      if (!playing) return;
      if (index >= pattern.length) { stop(); status('Pattern complete. Reset the sheet and try to match the folds yourself.'); render(); return; }
      const step = pattern[index++];
      if (step.unfold) { layers = [{ points: square, face: 0 }]; history = []; }
      pending = { ...step, a: point(step.a), b: point(step.b) }; progress = 0;
      $('og-fold-instruction').textContent = `${index} / ${pattern.length}: ${step.name}`;
      render(); animateGuide(next);
    }
    function animateGuide(done) {
      const start = performance.now();
      function tick(now) {
        if (!playing) return;
        progress = Math.min(1, (now - start) / (reducedMotion.matches ? 1 : 900)); render();
        if (progress < 1) frame = requestAnimationFrame(tick);
        else { commit(); frame = requestAnimationFrame(done); }
      }
      frame = requestAnimationFrame(tick);
    }
    next();
  });
  function sheetPoint(event) { const p = unproject(event); return { x: Math.max(0, Math.min(300, p.x)), y: Math.max(0, Math.min(300, p.y)) }; }
  svg.addEventListener('pointerdown', (event) => {
    const p = sheetPoint(event);
    if (p.x <= 0 || p.x >= 300 || p.y <= 0 || p.y >= 300) return;
    event.preventDefault();
    stop(); svg.setPointerCapture(event.pointerId); dragStart = p; dragEnd = p; render();
  });
  svg.addEventListener('pointermove', (event) => { if (dragStart) { dragEnd = sheetPoint(event); render(); } });
  svg.addEventListener('pointerup', (event) => {
    if (!dragStart) return;
    dragEnd = sheetPoint(event);
    const a = dragStart, b = dragEnd; dragStart = dragEnd = null;
    if (Math.hypot(b.x - a.x, b.y - a.y) < 45) { status('Drag farther across the sheet to make a crease.'); render(); return; }
    begin({ a, b, direction: $('og-fold-direction').value, name: 'Custom crease' });
  });
  svg.addEventListener('keydown', (event) => {
    const key = { h: 'horizontal', v: 'vertical', d: 'diagonal' }[event.key.toLowerCase()];
    if (key) { event.preventDefault(); document.querySelector(`[data-fold-preset="${key}"]`).click(); }
  });
  reset();
})();
