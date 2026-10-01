/* Ohm's Law lesson: circuit bench, I–V data logger, formula triangle, and solver. */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LED_DROP = 2;
  const LED_MAX_MA = 20;
  const QUARTER_WATT = 0.25;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const trim = (value, digits) => String(Number(value.toFixed(digits)));
  const volts = v => trim(v, 2) + ' V';
  const ohmsLabel = r => r >= 1000 ? trim(r / 1000, 2) + ' kΩ' : trim(r, 1) + ' Ω';
  const milliamps = a => trim(a * 1000, a * 1000 >= 100 ? 0 : 1) + ' mA';
  const watts = w => w >= 1 ? trim(w, 2) + ' W' : trim(w, 3) + ' W';

  function svgEl(name, attrs) {
    const el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key]));
    return el;
  }

  /* ── Hero formula triangle: cover a letter to reveal its formula ── */
  (function triangle() {
    const wrap = document.querySelector('[data-ohm-triangle]');
    if (!wrap) return;
    const buttons = Array.from(wrap.querySelectorAll('[data-cover]'));
    const readout = document.getElementById('ohm-tri-readout');
    const formulas = {
      V: ['V = I × R', 'Cover V: I and R sit side by side, so multiply.'],
      I: ['I = V ÷ R', 'Cover I: V sits over R, so divide.'],
      R: ['R = V ÷ I', 'Cover R: V sits over I, so divide.']
    };
    function cover(letter) {
      wrap.dataset.covered = letter;
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cover === letter)));
      readout.querySelector('strong').textContent = formulas[letter][0];
      readout.querySelector('small').textContent = formulas[letter][1];
    }
    buttons.forEach(b => b.addEventListener('click', () => cover(b.dataset.cover)));
  })();

  /* ── Circuit bench ── */
  const lab = document.getElementById('ohm-lab');
  if (!lab) return;

  const $ = id => document.getElementById(id);
  const voltage = $('ohm-voltage');
  const resistance = $('ohm-resistance');
  const modeButtons = Array.from(lab.querySelectorAll('[data-ohm-mode]'));
  const flowPath = lab.querySelector('.ohm-lab__flow-path');
  const dotLayer = lab.querySelector('.ohm-lab__dots');
  const heat = lab.querySelector('.ohm-lab__heat');
  const heatWaves = lab.querySelector('.ohm-lab__heat-waves');
  const ledGlow = lab.querySelector('.ohm-lab__led-glow');
  const out = {
    supply: $('ohm-voltage-out'),
    current: $('ohm-current'),
    resistorVoltage: $('ohm-resistor-voltage'),
    power: $('ohm-power'),
    currentFormula: $('ohm-current-formula'),
    voltageNote: $('ohm-voltage-note'),
    powerFormula: $('ohm-power-formula'),
    feedback: $('ohm-feedback'),
    challenge: $('ohm-challenge-feedback'),
    sourceLabel: lab.querySelector('[data-ohm-source-label]'),
    resistorLabel: lab.querySelector('[data-ohm-resistor-label]'),
    meterLabel: lab.querySelector('[data-ohm-meter-label]')
  };

  let mode = 'resistor';

  function readings() {
    const supply = Number(voltage.value);
    const ohms = Number(resistance.value);
    const ledOn = mode === 'led' && supply > LED_DROP;
    const acrossResistor = mode === 'led' ? Math.max(0, supply - LED_DROP) : supply;
    const amps = acrossResistor / ohms;
    return { supply, ohms, ledOn, acrossResistor, amps, watts: acrossResistor * amps };
  }

  /* Charges drift around the loop at a speed proportional to current. */
  const DOT_COUNT = 16;
  const pathLength = flowPath.getTotalLength();
  const dots = [];
  for (let i = 0; i < DOT_COUNT; i += 1) {
    const dot = svgEl('circle', { r: 4.5, class: 'ohm-lab__dot' });
    dotLayer.appendChild(dot);
    dots.push(dot);
  }
  let phase = 0;
  let speed = 0;
  function placeDots() {
    const gap = pathLength / DOT_COUNT;
    dots.forEach((dot, i) => {
      const p = flowPath.getPointAtLength((phase + i * gap) % pathLength);
      dot.setAttribute('cx', p.x.toFixed(1));
      dot.setAttribute('cy', p.y.toFixed(1));
    });
  }
  function tick(dt) {
    if (!speed) return;
    phase = (phase + speed * Math.min(dt, 0.1)) % pathLength;
    placeDots();
  }
  if (!reduceMotion) {
    if (window.SimKit) window.SimKit.loop(tick);
    else {
      let last = null;
      const raf = t => { if (last !== null) tick((t - last) / 1000); last = t; requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function render() {
    const r = readings();
    const flowing = r.amps > 0;
    lab.dataset.mode = mode;
    lab.dataset.state = flowing ? 'on' : 'off';
    modeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ohmMode === mode)));

    out.supply.value = volts(r.supply);
    out.sourceLabel.textContent = volts(r.supply);
    out.resistorLabel.textContent = ohmsLabel(r.ohms);
    out.meterLabel.textContent = 'Ammeter: ' + milliamps(r.amps);
    out.current.textContent = milliamps(r.amps);
    out.resistorVoltage.textContent = volts(r.acrossResistor);
    out.power.textContent = watts(r.watts);
    out.currentFormula.textContent = 'I = ' + volts(r.acrossResistor) + ' ÷ ' + ohmsLabel(r.ohms);
    out.voltageNote.textContent = mode === 'led'
      ? (r.ledOn ? volts(r.supply) + ' − 2 V LED drop' : 'Supply below the LED’s 2 V drop')
      : 'Whole supply lands on the resistor';
    out.powerFormula.textContent = 'P = ' + volts(r.acrossResistor) + ' × ' + milliamps(r.amps);

    /* 12 V across 100 Ω is ~120 mA; scale speed so that still reads as "fast" without blurring. */
    speed = flowing ? 18 + Math.min(r.amps * 1000, 125) * 3.2 : 0;
    if (reduceMotion || !flowing) placeDots();
    dotLayer.style.opacity = flowing ? '1' : '0.25';

    const heatLevel = Math.min(1, r.watts / QUARTER_WATT);
    heat.style.opacity = (0.12 + heatLevel * 0.88).toFixed(2);
    heatWaves.style.opacity = (heatLevel > 0.35 ? heatLevel : 0).toFixed(2);
    ledGlow.style.opacity = r.ledOn ? Math.min(1, 0.25 + r.amps * 1000 / LED_MAX_MA * 0.75).toFixed(2) : '0';
    lab.toggleAttribute('data-led-overdriven', r.ledOn && r.amps * 1000 > 30);

    let note;
    if (mode === 'led' && !r.ledOn) note = 'The supply is at or below the LED’s 2 V drop, so in this model no current flows and the LED stays dark.';
    else if (mode === 'led' && r.amps * 1000 > 30) note = 'About ' + milliamps(r.amps) + ' would overdrive a typical 20 mA indicator LED. Choose a larger resistor.';
    else if (r.watts > QUARTER_WATT) note = 'The resistor is dissipating ' + watts(r.watts) + ', more than a ¼ W resistor is rated for. It would overheat.';
    else if (r.watts > QUARTER_WATT / 2) note = 'Over 0.125 W: a ¼ W resistor works but has less than 50% margin. Feel the warning color?';
    else if (mode === 'led') note = 'The resistor only gets the voltage left over after the LED takes its 2 V.';
    else note = 'Same resistor, more voltage → more current. Same voltage, bigger resistor → less current.';
    out.feedback.textContent = note;
    out.challenge.textContent = '';
    drawGraph(r);
  }

  /* ── I–V graph and data log ── */
  const graph = $('ohm-graph');
  const plot = { x0: 52, x1: 344, y0: 222, y1: 18, vMax: 12, iMax: 0.125 };
  const gx = v => plot.x0 + (v / plot.vMax) * (plot.x1 - plot.x0);
  const gy = i => plot.y0 - (i / plot.iMax) * (plot.y0 - plot.y1);
  const graphLines = graph.querySelector('.ohm-graph__lines');
  const graphPoints = graph.querySelector('.ohm-graph__points');
  const opPoint = graph.querySelector('.ohm-graph__now');
  const dataBody = $('ohm-data-body');
  const dataEmpty = $('ohm-data-empty');
  const dataTable = dataBody.closest('table');
  const recorded = [];
  const palette = ['#0f7b8a', '#c2410c', '#6d28d9', '#15803d', '#b91c1c', '#1d4ed8', '#a16207', '#be185d'];
  const colorFor = ohms => palette[Number(resistance.querySelector('option[value="' + ohms + '"]').index) % palette.length];

  (function drawAxes() {
    const axes = graph.querySelector('.ohm-graph__axes');
    for (let v = 0; v <= plot.vMax; v += 2) {
      axes.appendChild(svgEl('line', { x1: gx(v), x2: gx(v), y1: plot.y1, y2: plot.y0, class: 'ohm-graph__grid' }));
      const t = svgEl('text', { x: gx(v), y: plot.y0 + 16, 'text-anchor': 'middle' });
      t.textContent = v;
      axes.appendChild(t);
    }
    for (let ma = 0; ma <= 125; ma += 25) {
      axes.appendChild(svgEl('line', { x1: plot.x0, x2: plot.x1, y1: gy(ma / 1000), y2: gy(ma / 1000), class: 'ohm-graph__grid' }));
      const t = svgEl('text', { x: plot.x0 - 7, y: gy(ma / 1000) + 4, 'text-anchor': 'end' });
      t.textContent = ma;
      axes.appendChild(t);
    }
  })();

  function lineFor(ohms, cls, color) {
    const vEnd = Math.min(plot.vMax, plot.iMax * ohms);
    const line = svgEl('line', { x1: gx(0), y1: gy(0), x2: gx(vEnd), y2: gy(vEnd / ohms), class: cls });
    if (color) line.style.stroke = color;
    return line;
  }

  function drawGraph(r) {
    graphLines.replaceChildren();
    const seen = new Set(recorded.map(p => p.ohms));
    seen.forEach(ohms => { if (ohms !== r.ohms) graphLines.appendChild(lineFor(ohms, 'ohm-graph__old-line', colorFor(ohms))); });
    graphLines.appendChild(lineFor(r.ohms, 'ohm-graph__line', colorFor(r.ohms)));
    opPoint.setAttribute('cx', gx(r.acrossResistor));
    opPoint.setAttribute('cy', gy(Math.min(r.amps, plot.iMax)));
    opPoint.style.fill = colorFor(r.ohms);
    graph.querySelector('[data-ohm-slope-label]').textContent = ohmsLabel(r.ohms) + ' line';
  }

  function renderData() {
    dataBody.replaceChildren();
    graphPoints.replaceChildren();
    dataEmpty.hidden = recorded.length > 0;
    dataTable.hidden = recorded.length === 0;
    recorded.forEach((p, i) => {
      const row = document.createElement('tr');
      [String(i + 1), ohmsLabel(p.ohms), volts(p.v), milliamps(p.i), p.i > 0 ? ohmsLabel(p.v / p.i) : '—']
        .forEach(text => { const td = document.createElement('td'); td.textContent = text; row.appendChild(td); });
      row.firstChild.style.boxShadow = 'inset 4px 0 0 ' + colorFor(p.ohms);
      dataBody.appendChild(row);
      graphPoints.appendChild(svgEl('circle', { cx: gx(p.v), cy: gy(Math.min(p.i, plot.iMax)), r: 5.5, class: 'ohm-graph__pt', style: 'stroke:' + colorFor(p.ohms) }));
    });
  }

  $('ohm-record').addEventListener('click', () => {
    const r = readings();
    if (recorded.length >= 12) recorded.shift();
    recorded.push({ ohms: r.ohms, v: r.acrossResistor, i: r.amps });
    renderData();
    drawGraph(r);
    checkPrediction();
  });
  $('ohm-clear').addEventListener('click', () => {
    recorded.length = 0;
    renderData();
    render();
    $('ohm-predict-result').textContent = '';
  });

  /* ── Predict, then test with recorded data ── */
  let prediction = null;
  const predictButtons = Array.from(lab.querySelectorAll('[data-predict]'));
  predictButtons.forEach(b => b.addEventListener('click', () => {
    prediction = b.dataset.predict;
    predictButtons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('ohm-predict-result').textContent = 'Prediction locked. Test it: keep one resistor, record a point at 3 V, then another at 6 V.';
    checkPrediction();
  }));

  function checkPrediction() {
    if (!prediction) return;
    for (let a = 0; a < recorded.length; a += 1) {
      for (let b = 0; b < recorded.length; b += 1) {
        const p = recorded[a], q = recorded[b];
        if (a === b || p.ohms !== q.ohms || p.v <= 0) continue;
        if (Math.abs(q.v / p.v - 2) < 0.01) {
          const verdict = prediction === 'double' ? 'Your prediction held up.' : 'Your data disagrees with your prediction.';
          $('ohm-predict-result').textContent = 'Evidence: ' + volts(p.v) + ' → ' + milliamps(p.i) + ', ' + volts(q.v) + ' → ' + milliamps(q.i) +
            '. Doubling the voltage doubled the current. ' + verdict;
          return;
        }
      }
    }
  }

  /* ── Controls ── */
  modeButtons.forEach(b => b.addEventListener('click', () => { mode = b.dataset.ohmMode; render(); }));
  voltage.addEventListener('input', render);
  resistance.addEventListener('change', render);
  $('ohm-reset').addEventListener('click', () => {
    mode = 'resistor';
    voltage.value = '5';
    resistance.value = '220';
    render();
  });
  $('ohm-check').addEventListener('click', () => {
    const r = readings();
    const ma = r.amps * 1000;
    if (r.supply !== 5 || mode !== 'led') out.challenge.textContent = 'Set the supply to exactly 5 V and switch to the LED loop first.';
    else if (ma < 10) out.challenge.textContent = 'Only ' + milliamps(r.amps) + '. The LED would be dim. Try a smaller resistor.';
    else if (ma > 20) out.challenge.textContent = milliamps(r.amps) + ' is over 20 mA. Try a larger resistor.';
    else if (r.watts >= 0.125) out.challenge.textContent = 'Current is in range, but the resistor is too hot. Try another value.';
    else out.challenge.textContent = 'Success: ' + milliamps(r.amps) + ' through the LED and ' + watts(r.watts) +
      ' in the resistor. Now explain why the resistor only has 3 V across it.';
  });

  placeDots();
  renderData();
  render();
})();

/* ── Ohm's Law solver with unit conversion ── */
(function solver() {
  'use strict';
  const root = document.getElementById('ohm-solver');
  if (!root) return;

  const QUANTITIES = {
    V: { name: 'Voltage', base: 'V', units: { V: 1, mV: 0.001 } },
    I: { name: 'Current', base: 'A', units: { A: 1, mA: 0.001 } },
    R: { name: 'Resistance', base: 'Ω', units: { 'Ω': 1, 'kΩ': 1000 } }
  };
  const DEFAULTS = { V: ['9', 'V'], I: ['20', 'mA'], R: ['470', 'Ω'] };
  const fields = Array.from(root.querySelectorAll('[data-solver-field]'));
  const unknownButtons = Array.from(root.querySelectorAll('[data-solve-for]'));
  const steps = root.querySelector('#ohm-solver-steps');
  const answer = root.querySelector('#ohm-solver-answer');
  let unknown = 'I';

  const fmt = n => String(Number(n.toPrecision(4)));
  function pretty(qty, base) {
    if (!isFinite(base)) return '—';
    if (qty === 'I' && Math.abs(base) < 1) return fmt(base * 1000) + ' mA';
    if (qty === 'R' && Math.abs(base) >= 1000) return fmt(base / 1000) + ' kΩ';
    if (qty === 'V' && Math.abs(base) < 1 && base !== 0) return fmt(base * 1000) + ' mV';
    return fmt(base) + ' ' + QUANTITIES[qty].base;
  }

  function setup() {
    const known = Object.keys(QUANTITIES).filter(q => q !== unknown);
    unknownButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.solveFor === unknown)));
    fields.forEach((field, i) => {
      const qty = known[i];
      const q = QUANTITIES[qty];
      field.dataset.qty = qty;
      field.querySelector('label').textContent = q.name + ' (' + qty + ')';
      const input = field.querySelector('input');
      const select = field.querySelector('select');
      input.value = DEFAULTS[qty][0];
      select.replaceChildren(...Object.keys(q.units).map(u => new Option(u, u, false, u === DEFAULTS[qty][1])));
    });
    solve();
  }

  function solve() {
    const vals = {};
    const lines = [];
    let ok = true;
    fields.forEach(field => {
      const qty = field.dataset.qty;
      const input = field.querySelector('input');
      const unit = field.querySelector('select').value;
      const raw = Number(input.value);
      if (input.value.trim() === '' || !isFinite(raw) || raw <= 0) { ok = false; return; }
      const factor = QUANTITIES[qty].units[unit];
      vals[qty] = raw * factor;
      if (factor !== 1) lines.push('Convert: ' + raw + ' ' + unit + ' = ' + fmt(raw * factor) + ' ' + QUANTITIES[qty].base);
    });
    if (!ok) {
      steps.replaceChildren();
      answer.textContent = 'Enter two positive numbers.';
      return;
    }
    let result, formula, sub;
    if (unknown === 'V') { result = vals.I * vals.R; formula = 'V = I × R'; sub = 'V = ' + fmt(vals.I) + ' A × ' + fmt(vals.R) + ' Ω'; }
    if (unknown === 'I') { result = vals.V / vals.R; formula = 'I = V ÷ R'; sub = 'I = ' + fmt(vals.V) + ' V ÷ ' + fmt(vals.R) + ' Ω'; }
    if (unknown === 'R') { result = vals.V / vals.I; formula = 'R = V ÷ I'; sub = 'R = ' + fmt(vals.V) + ' V ÷ ' + fmt(vals.I) + ' A'; }
    lines.push('Choose: ' + formula, 'Substitute: ' + sub, 'Calculate: ' + unknown + ' = ' + fmt(result) + ' ' + QUANTITIES[unknown].base);
    const power = unknown === 'V' ? result * vals.I : unknown === 'I' ? vals.V * result : vals.V * vals.I;
    steps.replaceChildren(...lines.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    answer.textContent = QUANTITIES[unknown].name + ' = ' + pretty(unknown, result) + ' · Power = ' + fmt(power) + ' W';
  }

  unknownButtons.forEach(b => b.addEventListener('click', () => { unknown = b.dataset.solveFor; setup(); }));
  fields.forEach(field => {
    field.querySelector('input').addEventListener('input', solve);
    field.querySelector('select').addEventListener('change', solve);
  });
  setup();
})();
