/* A discrete feedback model; independent of the grade-specific worksheet state.
   Each loop pass is played as four phases (read → error → command → send) so
   the highlighted pseudocode line always matches what the robot is doing. */
(() => {
  'use strict';
  const x = document.getElementById('connection-x');
  const y = document.getElementById('connection-y');
  if (!x || !y) return;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screen = (a, b) => ({ x: 50 + 32 * a, y: 254 - 32 * b });
  const set = (el, attrs) => { for (const k in attrs) el.setAttribute(k, attrs[k]); };
  const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

  // axis tick numbers
  const ticks = $('cn-ticks');
  for (let i = 0; i <= 10; i++) { const t = document.createElementNS(NS, 'text'); set(t, { x: 50 + 32 * i, y: 270, 'text-anchor': 'middle' }); t.textContent = i; ticks.appendChild(t); }
  for (let j = 1; j <= 7; j++) { const t = document.createElementNS(NS, 'text'); set(t, { x: 40, y: 258 - 32 * j, 'text-anchor': 'end' }); t.textContent = j; ticks.appendChild(t); }
  if (reduceMotion) document.querySelectorAll('#connection-target animate').forEach((a) => a.remove());

  const robotEl = $('connection-robot'), bodyEl = $('cn-robot-body');
  const lines = {};
  document.querySelectorAll('[data-cn-line]').forEach((el) => { lines[el.dataset.cnLine] = el; });
  const stepBtn = $('connection-step'), autoBtn = $('connection-auto');

  let position = { x: 2, y: 2 };
  let shown = { x: 2, y: 2, heading: 0 };   // drawn (tweened) pose
  let trail = [{ x: 2, y: 2 }];
  let steps = 0, phase = null, phaseT = 0, auto = false, command = { x: 0, y: 0 }, measured = { x: 2, y: 2 };
  const PHASES = [['read', 360], ['err', 340], ['cmd', 320], ['send', 460]];

  const target = () => ({ x: Number(x.value), y: Number(y.value) });
  const reached = () => { const t = target(); return t.x === position.x && t.y === position.y; };

  function highlight(name) { Object.keys(lines).forEach((k) => lines[k].classList.toggle('is-pc', k === name)); }

  function drawStatic() {
    const t = target();
    $('connection-x-value').value = t.x;
    $('connection-y-value').value = t.y;
    const tg = screen(t.x, t.y);
    $('connection-target').setAttribute('transform', `translate(${tg.x} ${tg.y})`);
    // trail
    $('cn-trail').setAttribute('points', trail.map((p) => { const s = screen(p.x, p.y); return s.x + ',' + s.y; }).join(' '));
    const dots = $('cn-trail-dots');
    dots.textContent = '';
    trail.slice(0, -1).forEach((p) => { const s = screen(p.x, p.y), c = document.createElementNS(NS, 'circle'); set(c, { cx: s.x, cy: s.y, r: 3, class: 'cn-dot' }); dots.appendChild(c); });
    const dx = t.x - measured.x, dy = t.y - measured.y;
    const done = dx === 0 && dy === 0;
    $('connection-status').innerHTML =
      `<span>Measured position <b>(${measured.x}, ${measured.y})</b> · Target <b>(${t.x}, ${t.y})</b></span>` +
      `<span>Error <b class="is-x">Δx = ${signed(dx)}</b> <b class="is-y">Δy = ${signed(dy)}</b></span>` +
      `<span>Command <b>x ${signed(command.x) || '0'}, y ${signed(command.y) || '0'}</b> · Loop passes <b>${steps}</b></span>` +
      (done ? '<span class="is-done">Target reached — error is zero, so the command is "stay". Move the target to try again.</span>' : '');
    stepBtn.disabled = phase !== null || (done && reached());
    $('connection-svg-desc').textContent = `Robot at (${position.x}, ${position.y}); target at (${t.x}, ${t.y}). Horizontal error ${dx}; vertical error ${dy}.`;
  }

  function drawError(alpha) {
    const t = target();
    const r = screen(shown.x, shown.y), tg = screen(t.x, t.y), corner = { x: tg.x, y: r.y };
    set($('connection-error'), { x1: r.x, y1: r.y, x2: tg.x, y2: tg.y });
    set($('cn-dx'), { x1: r.x, y1: r.y, x2: corner.x, y2: corner.y, opacity: alpha });
    set($('cn-dy'), { x1: corner.x, y1: corner.y, x2: tg.x, y2: tg.y, opacity: alpha });
    const dx = t.x - measured.x, dy = t.y - measured.y;
    const lx = $('cn-dx-label'), ly = $('cn-dy-label');
    set(lx, { x: (r.x + corner.x) / 2, y: r.y + (dy >= 0 ? 16 : -8), 'text-anchor': 'middle', opacity: dx ? alpha : 0 });
    lx.textContent = 'Δx ' + signed(dx);
    set(ly, { x: corner.x + (dx >= 0 ? 8 : -8), y: (corner.y + tg.y) / 2 + 4, 'text-anchor': dx >= 0 ? 'start' : 'end', opacity: dy ? alpha : 0 });
    ly.textContent = 'Δy ' + signed(dy);
  }

  function drawRobot() {
    const r = screen(shown.x, shown.y);
    robotEl.setAttribute('transform', `translate(${r.x} ${r.y})`);
    bodyEl.setAttribute('transform', `rotate(${shown.heading})`);
  }

  function startPass() {
    if (phase !== null) return;
    if (reached()) { if (auto) toggleAuto(false); return; }
    phase = 0; phaseT = 0;
    enterPhase();
  }

  function enterPhase() {
    const [name] = PHASES[phase];
    highlight(name);
    if (name === 'read') { measured = { x: position.x, y: position.y }; $('cn-ping').classList.add('is-on'); }
    if (name === 'cmd') {
      const t = target();
      command = { x: Math.sign(t.x - measured.x), y: Math.sign(t.y - measured.y) };
      const r = screen(position.x, position.y), n = screen(position.x + command.x, position.y + command.y);
      set($('cn-cmd'), { x1: r.x, y1: r.y, x2: r.x + (n.x - r.x) * .9, y2: r.y + (n.y - r.y) * .9, opacity: 1 });
      if (command.x || command.y) shown.targetHeading = Math.atan2(-(command.y), command.x) * 180 / Math.PI;
    }
    if (name === 'send') {
      shown.from = { x: position.x, y: position.y };
      position = { x: position.x + command.x, y: position.y + command.y };
    }
    drawStatic();
  }

  function finishPass() {
    steps += 1;
    trail.push({ x: position.x, y: position.y });
    if (trail.length > 40) trail.shift();
    measured = { x: position.x, y: position.y };
    $('cn-cmd').setAttribute('opacity', 0);
    phase = null;
    highlight(null);
    drawStatic();
    if (auto && reached()) toggleAuto(false);
  }

  function toggleAuto(on) {
    auto = on;
    autoBtn.textContent = auto ? '❚❚ Pause' : '▶ Auto-run';
    autoBtn.setAttribute('aria-pressed', String(auto));
    if (auto) startPass();
  }

  // shortest-way heading interpolation
  function turnToward(cur, goal, f) { let d = ((goal - cur + 540) % 360) - 180; return cur + d * f; }

  let last = null;
  function frame(ts) {
    const dt = last === null ? 0 : Math.min(0.1, (ts - last) / 1000);
    last = ts;
    if (phase !== null) {
      const [name, ms] = PHASES[phase];
      phaseT += dt * 1000 * (reduceMotion ? 4 : 1);
      const f = Math.min(1, phaseT / ms);
      if (name === 'read') { const ping = $('cn-ping'), r = screen(shown.x, shown.y); set(ping, { cx: r.x, cy: r.y, r: 8 + 34 * f, opacity: 1 - f }); }
      if (name === 'err') drawError(f);
      if (name === 'cmd' && shown.targetHeading != null) shown.heading = turnToward(shown.heading, shown.targetHeading, Math.min(1, f * 1.5));
      if (name === 'send') {
        const e = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        shown.x = shown.from.x + (position.x - shown.from.x) * e;
        shown.y = shown.from.y + (position.y - shown.from.y) * e;
      }
      if (f >= 1) {
        if (name === 'read') $('cn-ping').classList.remove('is-on');
        phase += 1; phaseT = 0;
        if (phase >= PHASES.length) { shown.x = position.x; shown.y = position.y; finishPass(); if (auto) setTimeout(startPass, reduceMotion ? 0 : 260); }
        else enterPhase();
      }
    }
    drawRobot();
    if (phase === null || PHASES[phase][0] !== 'err') drawError(1);
    requestAnimationFrame(frame);
  }

  x.addEventListener('input', drawStatic);
  y.addEventListener('input', () => { drawStatic(); if (auto && phase === null) startPass(); });
  x.addEventListener('input', () => { if (auto && phase === null) startPass(); });
  stepBtn.addEventListener('click', startPass);
  autoBtn.addEventListener('click', () => toggleAuto(!auto));
  $('connection-reset').addEventListener('click', () => {
    toggleAuto(false);
    phase = null; highlight(null);
    position = { x: 2, y: 2 }; measured = { x: 2, y: 2 }; shown = { x: 2, y: 2, heading: 0 };
    trail = [{ x: 2, y: 2 }]; steps = 0; command = { x: 0, y: 0 };
    x.value = 8; y.value = 6;
    $('cn-cmd').setAttribute('opacity', 0);
    drawStatic();
  });
  drawStatic();
  requestAnimationFrame(frame);
})();
