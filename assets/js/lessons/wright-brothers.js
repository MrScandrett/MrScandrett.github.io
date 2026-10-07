(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const angle = $('angle'), speed = $('speed');
  let trials = [];
  const model = () => {
    const a = +angle.value, v = +speed.value;
    const cl = a <= 12 ? .2 + .09 * a : Math.max(.3, 1.28 - .075 * (a - 12));
    const cd = .06 + .002 * a * a;
    return {a, v, lift: cl * (v / 10) ** 2, drag: cd * (v / 10) ** 2};
  };
  const canvas = $('wing-canvas');
  let kit;
  kit = SimKit.canvas2d(canvas, { onResize: () => draw() });
  function draw() {
    if (!kit) return;
    const c = kit.ctx, w = kit.width, h = kit.height, m = model(), colors = SimKit.theme.colors();
    c.clearRect(0, 0, w, h); c.fillStyle = colors.bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = colors.textMuted; c.lineWidth = 1;
    for (let y = 60; y < h - 30; y += 30) { c.beginPath(); c.moveTo(12, y); c.lineTo(w - 12, y); c.stroke(); c.beginPath(); c.moveTo(w - 23, y - 4); c.lineTo(w - 12, y); c.lineTo(w - 23, y + 4); c.stroke(); }
    const x = w * .52, y = h * .57, len = Math.min(180, w * .5);
    c.save(); c.translate(x, y); c.rotate(m.a * Math.PI / 180); c.fillStyle = colors.accentStrong;
    c.beginPath(); c.moveTo(-len / 2, 0); c.quadraticCurveTo(-len / 2, -30, len / 2, 0); c.quadraticCurveTo(0, 10, -len / 2, 0); c.fill(); c.restore();
    function arrow(dx, dy, label) { c.strokeStyle = colors.text; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke(); const theta = Math.atan2(dy, dx); c.beginPath(); c.moveTo(x + dx - 10 * Math.cos(theta - .5), y + dy - 10 * Math.sin(theta - .5)); c.lineTo(x + dx, y + dy); c.lineTo(x + dx - 10 * Math.cos(theta + .5), y + dy - 10 * Math.sin(theta + .5)); c.stroke(); c.fillStyle = colors.text; c.font = '14px sans-serif'; c.fillText(label, x + dx + 8, y + dy - 8); }
    arrow(0, -Math.min(h * .36, 35 + m.lift * 35), 'Lift'); arrow(Math.min(w * .27, 25 + m.drag * 30), 0, 'Drag');
    c.fillStyle = colors.text; c.font = '14px sans-serif'; c.fillText('Airflow →', 14, 28);
    canvas.setAttribute('aria-label', `Wing at ${m.a} degrees; relative lift ${m.lift.toFixed(2)}, drag ${m.drag.toFixed(2)}. ${m.a > 12 ? 'Stalled' : 'Before stall'} in this model.`);
  }
  function update() { const m = model(); $('angle-value').value = `${m.a}°`; $('speed-value').value = `${m.v} m/s`; $('lift-value').textContent = m.lift.toFixed(2); $('drag-value').textContent = m.drag.toFixed(2); $('flow-state').textContent = m.a > 12 ? 'Stalled' : 'Before stall'; draw(); }
  [angle, speed].forEach(el => el.addEventListener('input', update));
  $('record').addEventListener('click', () => {
    if (!$('prediction').value) { $('lab-feedback').textContent = 'Choose a prediction first. Then record your test.'; $('prediction').focus(); return; }
    if (trials.length >= 6) { $('lab-feedback').textContent = 'Your notebook has six trials. Reset to begin a new comparison.'; return; }
    trials.push(model());
    $('trials').innerHTML = trials.map((m, i) => `<tr><th scope="row">${i + 1}</th><td>${m.a}°</td><td>${m.v} m/s</td><td>${m.lift.toFixed(2)}</td><td>${m.drag.toFixed(2)}</td></tr>`).join('');
    const fixed = trials.filter(m => m.v === trials[0].v);
    const compared = [6, 12, 20].every(a => fixed.some(m => m.a === a));
    $('lab-feedback').textContent = compared ? 'Comparison complete: at the same airspeed, lift rises from 6° to 12°, then falls at 20°. Revisit your prediction: the steep wing stalled. Use the notebook values as evidence.' : `Trial ${trials.length} recorded. Compare 6°, 12°, and 20° at the same airspeed to isolate the effect of angle.`;
  });
  $('reset').addEventListener('click', () => { trials = []; $('trials').replaceChildren(); angle.value = 6; speed.value = 10; $('prediction').value = ''; $('lab-feedback').textContent = 'Experiment reset. Make a prediction, then record tests at 6°, 12°, and 20°.'; update(); });
  const axes = {
    pitch: ['Pitch: nose tilts up or down', 'Pitch: nose up or down around a wing-to-wing axis. The Flyer used a forward elevator.', 'M35 100H365'],
    roll: ['Roll: one wing rises while the other falls', 'Roll: banking around a nose-to-tail axis. The Wrights twisted the wings using wing-warping.', 'M200 10V190'],
    yaw: ['Yaw: nose points left or right', 'Yaw: nose left or right around a vertical axis. A movable rudder helped coordinate turns with wing-warping.', 'M180 100H220 M200 80V120']
  };
  document.querySelectorAll('[data-axis]').forEach(button => button.addEventListener('click', () => { const key = button.dataset.axis, data = axes[key]; document.querySelectorAll('[data-axis]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); $('axis-title').textContent = data[0]; $('axis-copy').textContent = data[1]; $('axis-line').setAttribute('d', data[2]); }));
  $('check-answer').addEventListener('click', () => { const value = $('answer').value; $('answer-feedback').textContent = value === 'test' ? 'Yes. Holding test conditions constant helps reveal how wing design changes lift and drag. Measurements can challenge a prediction and guide a redesign.' : value ? 'Try again. Choose a method that measures the wing’s behavior while keeping other conditions the same.' : 'Choose an approach before checking.'; });
  SimKit.theme.onChange(draw); update();
})();
