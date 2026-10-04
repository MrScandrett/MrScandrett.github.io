(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('cat-canvas');
  let on = false;
  const sim = SimKit.canvas2d(canvas, { height: 320, onResize: () => { if (ready) draw(); } });
  var ready = true;
  const rate = ea => 1e12 * Math.exp(-ea * 1000 / (8.314 * Number($('cat-t-slider').value)));
  function duration(seconds) {
    if (seconds < 1) return (seconds * 1000).toPrecision(3) + ' ms';
    if (seconds < 120) return seconds.toPrecision(3) + ' s';
    if (seconds < 7200) return (seconds / 60).toPrecision(3) + ' min';
    if (seconds < 172800) return (seconds / 3600).toPrecision(3) + ' h';
    return (seconds / 86400).toPrecision(3) + ' days';
  }
  function draw() {
    const ctx = sim.ctx, w = sim.width, h = sim.height;
    const colors = SimKit.theme.colors();
    const ea = Number($('cat-ea-slider').value), lower = ea - 30;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, w, h);
    const left = 46, right = w - 20, top = 50, bottom = h - 55;
    const x = fraction => left + fraction * (right - left);
    const y = energy => bottom - (energy + 30) / 165 * (bottom - top);
    ctx.strokeStyle = colors.textMuted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();
    ctx.font = '12px sans-serif'; ctx.fillStyle = colors.text; ctx.textAlign = 'left';
    ctx.fillText('Energy (kJ/mol)', left, 20);
    ctx.textAlign = 'center'; ctx.fillText('Reaction progress → (not time)', (left + right) / 2, h - 12);
    for (const energy of [-20, 0, 40, 80, 120]) {
      ctx.textAlign = 'right'; ctx.fillText(energy, left - 7, y(energy) + 4);
    }
    function curve(barrier, color, dash) {
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(x(0), y(0)); ctx.lineTo(x(.14), y(0));
      ctx.bezierCurveTo(x(.3), y(0), x(.32), y(barrier), x(.5), y(barrier));
      ctx.bezierCurveTo(x(.68), y(barrier), x(.7), y(-20), x(.86), y(-20));
      ctx.lineTo(x(1), y(-20)); ctx.stroke(); ctx.setLineDash([]);
    }
    curve(ea, colors.text, [6, 4]);
    if (on) curve(lower, colors.accent, []);
    ctx.textAlign = 'center'; ctx.fillStyle = colors.text;
    ctx.fillText('No catalyst: ' + ea, x(.5), y(ea) - 10);
    if (on) { ctx.fillStyle = colors.accent; ctx.fillText('Catalyst: ' + lower, x(.5), y(lower) + 19); }
    ctx.fillStyle = colors.text; ctx.textAlign = 'left'; ctx.fillText('Reactants', x(0), y(0) + 19);
    ctx.textAlign = 'right'; ctx.fillText('Products', x(1), y(-20) + 19);
  }
  function update() {
    const ea = Number($('cat-ea-slider').value), temp = Number($('cat-t-slider').value);
    const kNo = rate(ea), kYes = rate(ea - 30), ratio = kYes / kNo;
    $('cat-t-val').textContent = temp + ' K'; $('cat-ea-val').textContent = ea + ' kJ/mol';
    for (const id of ['cat-toggle-btn', 'cat-local-toggle']) {
      $(id).textContent = 'Turn catalyst ' + (on ? 'OFF' : 'ON'); $(id).setAttribute('aria-pressed', String(on));
    }
    $('cat-r-rate').textContent = on ? ratio.toLocaleString('en-US', { maximumSignificantDigits: 3 }) + '×' : '1×';
    $('cat-r-ea').textContent = on ? ea - 30 : ea; $('cat-r-cat').textContent = on ? 'ON' : 'OFF';
    $('cat-k-no').textContent = kNo.toExponential(2); $('cat-k-yes').textContent = kYes.toExponential(2);
    $('cat-half-no').textContent = duration(Math.LN2 / kNo); $('cat-half-yes').textContent = duration(Math.LN2 / kYes);
    $('cat-description').textContent = 'At ' + temp + ' K, the selected route has a barrier of ' + (on ? ea - 30 : ea) + ' kJ/mol. Reactants: 0; products: −20; ΔH: −20 kJ/mol in both routes. ' + (on ? 'The catalyst lowers the barrier, leaving the endpoints unchanged.' : 'Turn the catalyst on to reveal the lower pathway.');
    draw();
  }
  window.catToggleCatalyst = () => { on = !on; update(); };
  window.catReset = () => { on = false; $('cat-t-slider').value = 300; $('cat-ea-slider').value = 80; update(); };
  ['cat-t-slider', 'cat-ea-slider'].forEach(id => $(id).addEventListener('input', update));
  const explanations = { 1: 'The catalyst is regenerated in the net reaction.', 2: 'A lower activation barrier makes the reaction faster.', 3: 'A less negative exponent increases k at the same temperature.', 4: 'The substrate binds at the active site.' };
  function feedback(n, correct, empty) {
    const fb = $('catfb-' + n);
    fb.className = 'cl-feedback ' + (correct ? 'ok' : 'err');
    fb.textContent = empty ? 'Choose or enter an answer first.' : correct ? '✓ Correct. ' + (explanations[n] || 'Convert kJ to J: exp(30000/(8.314 × 300)) ≈ 167,000×.') : 'Try again. Read the hint below.';
    $('cathint-' + n).style.display = !correct && !empty ? 'block' : 'none';
  }
  window.catCheckText = (n, ans) => feedback(n, $('catans-' + n).value === ans, !$('catans-' + n).value);
  window.catCheck = (n, ans, tol) => {
    const value = Number($('catans-' + n).value);
    feedback(n, Number.isFinite(value) && Math.abs(value - ans) <= tol, !$('catans-' + n).value);
  };
  SimKit.theme.onChange(() => draw());
  // Lighting variables may change independently of the selected theme.
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lighting'] });
  update();
})();
