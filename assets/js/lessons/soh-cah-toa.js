(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const rad = deg => deg * Math.PI / 180;

  function textAt(id, x, y, text, className) {
    const node = $(id);
    if (!node) return;
    node.setAttribute('x', x);
    node.setAttribute('y', y);
    node.textContent = text;
    if (className !== undefined) {
      node.setAttribute('class', className);
    }
  }

  function setLine(id, x1, y1, x2, y2, className) {
    const node = $(id);
    if (!node) return;
    node.setAttribute('x1', x1);
    node.setAttribute('y1', y1);
    node.setAttribute('x2', x2);
    node.setAttribute('y2', y2);
    if (className !== undefined) {
      node.setAttribute('class', className);
    }
  }

  /* ── 1. Interactive Color-Coded Right Triangle ───────────────── */
  function draw() {
    const a = Number($('angle').value);
    const h = Number($('scale').value);
    const top = $('reference').value === 'top';
    const theta = top ? 90 - a : a;
    const comp = 90 - theta;

    const width = 290 * Math.cos(rad(a));
    const height = 290 * Math.sin(rad(a));
    const x0 = 75;
    const y0 = 285;
    const x = x0 + width;
    const y = y0 - height;

    $('tri-shape').setAttribute('d', `M${x0} ${y0} L${x} ${y0} L${x} ${y} Z`);
    $('right-marker').setAttribute('d', `M${x - 16} ${y0} V${y0 - 16} H${x}`);

    // Color-coded segments swap between Opposite and Adjacent when reference changes
    setLine('side-bottom', x0, y0, x, y0, top ? 'side-opp' : 'side-adj');
    setLine('side-right', x, y0, x, y, top ? 'side-adj' : 'side-opp');
    setLine('side-hyp', x0, y0, x, y, 'side-hyp');

    // Reference angle arc (theta) and complementary angle arc (90 - theta)
    const rArc = 34;
    const bx = x0 + rArc * Math.cos(rad(a));
    const by = y0 - rArc * Math.sin(rad(a));
    const tx = x - rArc * Math.cos(rad(a));
    const ty = y + rArc * Math.sin(rad(a));

    const bottomWedge = `M ${x0} ${y0} L ${x0 + rArc} ${y0} A ${rArc} ${rArc} 0 0 0 ${bx} ${by} Z`;
    const bottomOpen = `M ${x0 + rArc} ${y0} A ${rArc} ${rArc} 0 0 0 ${bx} ${by}`;
    const topWedge = `M ${x} ${y} L ${x} ${y + rArc} A ${rArc} ${rArc} 0 0 1 ${tx} ${ty} Z`;
    const topOpen = `M ${x} ${y + rArc} A ${rArc} ${rArc} 0 0 1 ${tx} ${ty}`;

    if ($('theta-arc')) {
      $('theta-arc').setAttribute('d', top ? topWedge : bottomWedge);
    }
    if ($('comp-arc')) {
      $('comp-arc').setAttribute('d', top ? bottomOpen : topOpen);
    }

    // Angle labels
    textAt('angle-label', top ? x - 72 : x0 + 42, top ? y + 52 : y0 - 12, `θ = ${theta}°`);
    textAt('comp-label', top ? x0 + 42 : x - 88, top ? y0 - 12 : y + 48, `90°−θ = ${comp}°`);

    const o = h * Math.sin(rad(theta));
    const adj = h * Math.cos(rad(theta));
    const bottomLen = top ? o : adj;
    const rightLen = top ? adj : o;

    textAt(
      'adjacent-label',
      x0 + width / 2 - 58,
      y0 + 30,
      `${top ? 'Opposite' : 'Adjacent'} (${bottomLen.toFixed(2)})`,
      top ? 'side-opp' : 'side-adj'
    );
    textAt(
      'opposite-label',
      x + 12,
      y0 - height / 2 + 5,
      `${top ? 'Adjacent' : 'Opposite'} (${rightLen.toFixed(2)})`,
      top ? 'side-adj' : 'side-opp'
    );
    textAt(
      'hypotenuse-label',
      x0 + width / 2 - 95,
      y0 - height / 2 - 16,
      `Hypotenuse (${h})`,
      'side-hyp'
    );

    $('angle-value').textContent = `${a}°`;
    $('scale-value').textContent = h;
    $('side-readout').textContent =
      `Relative to θ = ${theta}°: opposite ≈ ${o.toFixed(2)}, adjacent ≈ ${adj.toFixed(2)}, hypotenuse = ${h}.`;

    if ($('co-function-readout')) {
      $('co-function-readout').innerHTML =
        `<strong>Complementary Angle Check:</strong> sin(${theta}°) = cos(${comp}°) ≈ <strong>${Math.sin(rad(theta)).toFixed(3)}</strong> — the <span class="st-opp">Opposite</span> of ${theta}° is the <span class="st-adj">Adjacent</span> of ${comp}°!`;
    }

    for (const [id, n, d] of [['sin', o, h], ['cos', adj, h], ['tan', o, adj]]) {
      $(`${id}-readout`).textContent = `${n.toFixed(2)} ÷ ${d.toFixed(2)} ≈ ${(n / d).toFixed(3)}`;
    }
  }

  for (const id of ['angle', 'scale', 'reference']) {
    $(id).addEventListener('input', draw);
    $(id).addEventListener('change', draw);
  }

  $('reset').addEventListener('click', () => {
    $('angle').value = 35;
    $('scale').value = 10;
    $('reference').value = 'bottom';
    draw();
  });

  /* ── 2. Ratio Selector & Active Card Highlight ───────────────── */
  $('pair').addEventListener('change', () => {
    const val = $('pair').value;
    $('pair-feedback').textContent = ({
      OH: 'SOH: sine uses opposite and hypotenuse (sin θ = O / H).',
      AH: 'CAH: cosine uses adjacent and hypotenuse (cos θ = A / H).',
      OA: 'TOA: tangent uses opposite and adjacent (tan θ = O / A).'
    })[val] || '';

    const map = { OH: 'card-soh', AH: 'card-cah', OA: 'card-toa' };
    for (const cardId of ['card-soh', 'card-cah', 'card-toa']) {
      const el = $(cardId);
      if (el) el.classList.toggle('is-active', map[val] === cardId);
    }
  });

  /* ── 3.5. Clinometer & Indirect Measurement Lab ──────────────── */
  const clinoPresets = {
    redwood: { name: 'Giant Redwood Tree', d: 45, angle: 52, eye: 1.6 },
    lighthouse: { name: 'Coastal Lighthouse', d: 60, angle: 34, eye: 1.5 },
    rocket: { name: 'Launch Rocket on Pad', d: 80, angle: 48, eye: 1.7 }
  };
  let activeClinoPreset = 'redwood';

  function renderTargetArtwork(type, xTarget, yGround, yTop) {
    const group = $('clino-target-art');
    if (!group) return;
    const hPx = Math.max(24, yGround - yTop);

    if (type === 'lighthouse') {
      const baseW = 28;
      const topW = 16;
      const lanternH = Math.min(20, hPx * 0.18);
      const bodyY = yTop + lanternH;
      group.innerHTML = `
        <polygon points="${xTarget - baseW / 2},${yGround} ${xTarget + baseW / 2},${yGround} ${xTarget + topW / 2},${bodyY} ${xTarget - topW / 2},${bodyY}" fill="rgba(220,38,38,0.18)" stroke="currentColor" stroke-width="1.6"/>
        <rect x="${xTarget - topW / 2 - 2}" y="${yTop}" width="${topW + 4}" height="${lanternH}" rx="2" fill="rgba(250,204,21,0.35)" stroke="currentColor" stroke-width="1.5"/>
        <polygon points="${xTarget},${yTop + lanternH / 2} ${xTarget - 55},${yTop - 12} ${xTarget - 55},${yTop + 18}" fill="rgba(250,204,21,0.22)"/>
      `;
    } else if (type === 'rocket') {
      const bodyW = 18;
      const noseH = Math.min(26, hPx * 0.22);
      const bodyY = yTop + noseH;
      group.innerHTML = `
        <line x1="${xTarget + 16}" y1="${yGround}" x2="${xTarget + 16}" y2="${yTop + 8}" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" opacity="0.5"/>
        <rect x="${xTarget - bodyW / 2}" y="${bodyY}" width="${bodyW}" height="${Math.max(10, yGround - bodyY)}" rx="3" fill="rgba(148,163,184,0.28)" stroke="currentColor" stroke-width="1.6"/>
        <polygon points="${xTarget - bodyW / 2},${bodyY} ${xTarget + bodyW / 2},${bodyY} ${xTarget},${yTop}" fill="rgba(37,99,235,0.28)" stroke="currentColor" stroke-width="1.6"/>
        <polygon points="${xTarget - bodyW / 2},${yGround} ${xTarget - bodyW / 2 - 8},${yGround} ${xTarget - bodyW / 2},${yGround - 18}" fill="rgba(239,68,68,0.35)" stroke="currentColor" stroke-width="1.2"/>
        <polygon points="${xTarget + bodyW / 2},${yGround} ${xTarget + bodyW / 2 + 8},${yGround} ${xTarget + bodyW / 2},${yGround - 18}" fill="rgba(239,68,68,0.35)" stroke="currentColor" stroke-width="1.2"/>
      `;
    } else {
      // Giant Redwood Tree
      const trunkW = 14;
      const trunkTop = yGround - hPx * 0.35;
      const midY1 = yTop + hPx * 0.28;
      const midY2 = yTop + hPx * 0.52;
      const canopyBottom = yGround - hPx * 0.2;
      group.innerHTML = `
        <rect x="${xTarget - trunkW / 2}" y="${trunkTop}" width="${trunkW}" height="${yGround - trunkTop}" fill="rgba(180,83,9,0.35)" stroke="currentColor" stroke-width="1.4"/>
        <polygon points="${xTarget},${yTop} ${xTarget - 24},${midY1} ${xTarget + 24},${midY1}" fill="rgba(21,128,61,0.25)" stroke="currentColor" stroke-width="1.4"/>
        <polygon points="${xTarget},${yTop + hPx * 0.14} ${xTarget - 32},${midY2} ${xTarget + 32},${midY2}" fill="rgba(21,128,61,0.22)" stroke="currentColor" stroke-width="1.4"/>
        <polygon points="${xTarget},${yTop + hPx * 0.3} ${xTarget - 38},${canopyBottom} ${xTarget + 38},${canopyBottom}" fill="rgba(21,128,61,0.2)" stroke="currentColor" stroke-width="1.4"/>
      `;
    }
  }

  function drawClinometer() {
    if (!$('clino-dist') || !$('clino-angle') || !$('clino-eye')) return;
    const d = Number($('clino-dist').value);
    const theta = Number($('clino-angle').value);
    const h0 = Number($('clino-eye').value);

    const rise = d * Math.tan(rad(theta));
    const totalH = h0 + rise;
    const sight = d / Math.cos(rad(theta));

    $('clino-dist-val').textContent = `${d} m`;
    $('clino-angle-val').textContent = `${theta}°`;
    $('clino-eye-val').textContent = `${h0.toFixed(1)} m`;

    $('clino-rise-stat').textContent = `${rise.toFixed(1)} m`;
    $('clino-total-stat').textContent = `${totalH.toFixed(1)} m`;
    $('clino-sight-stat').textContent = `${sight.toFixed(1)} m`;

    const presetName = (clinoPresets[activeClinoPreset] && clinoPresets[activeClinoPreset].name) || 'Target';
    $('clino-equation').innerHTML =
      `<strong>${presetName}:</strong><br>` +
      `tan(${theta}°) = <span class="st-opp">rise</span> ÷ <span class="st-adj">${d} m</span> → ` +
      `<span class="st-opp">rise</span> = ${d} × tan(${theta}°) ≈ <strong>${rise.toFixed(1)} m</strong><br>` +
      `Total height <strong>H</strong> = h₀ + rise = ${h0.toFixed(1)} + ${rise.toFixed(1)} = <strong>${totalH.toFixed(1)} m</strong>`;

    // SVG coordinates
    const xObs = 70;
    const yGround = 295;
    // Keep eye level visually clear (between 22 and 34 px above ground)
    const eyePx = 18 + (h0 - 1.0) * 10;
    const yEye = yGround - eyePx;

    // Horizontal span scales with d, and vertical rise scales so triangle stays inside viewBox
    const xTarget = 195 + ((d - 10) / 90) * 235;
    const rawRisePx = (xTarget - xObs) * Math.tan(rad(theta));
    const maxRisePx = yEye - 38;
    const scaleFactor = rawRisePx > maxRisePx ? maxRisePx / rawRisePx : 1;
    const risePx = Math.max(24, rawRisePx * scaleFactor);
    const yTop = yEye - risePx;

    renderTargetArtwork(activeClinoPreset, xTarget, yGround, yTop);

    setLine('clino-eye-seg', xObs, yGround, xObs, yEye);
    if ($('clino-observer-head')) {
      $('clino-observer-head').setAttribute('cx', xObs);
      $('clino-observer-head').setAttribute('cy', yEye - 5);
    }

    setLine('clino-adj-line', xObs, yEye, xTarget, yEye, 'side-adj');
    setLine('clino-opp-line', xTarget, yEye, xTarget, yTop, 'side-opp');
    setLine('clino-hyp-line', xObs, yEye, xTarget, yTop, 'side-hyp');

    if ($('clino-right-marker')) {
      $('clino-right-marker').setAttribute('d', `M${xTarget - 13} ${yEye} V${yEye - 13} H${xTarget}`);
    }

    // Angle of elevation arc at observer's eye
    const drawAngleRad = Math.atan2(risePx, xTarget - xObs);
    const rArc = 32;
    const ax = xObs + rArc * Math.cos(drawAngleRad);
    const ay = yEye - rArc * Math.sin(drawAngleRad);
    if ($('clino-arc')) {
      $('clino-arc').setAttribute('d', `M ${xObs} ${yEye} L ${xObs + rArc} ${yEye} A ${rArc} ${rArc} 0 0 0 ${ax} ${ay} Z`);
    }

    textAt('clino-theta-label', xObs + 38, yEye - 8, `θ = ${theta}°`);
    textAt('clino-d-label', (xObs + xTarget) / 2 - 42, yEye + 20, `d = ${d} m`, 'side-adj');
    textAt('clino-rise-label', xTarget + 10, (yEye + yTop) / 2 + 4, `rise = ${rise.toFixed(1)} m`, 'side-opp');
    textAt('clino-eye-label', xObs - 52, yGround - eyePx / 2 + 4, `h₀=${h0.toFixed(1)}m`);
    textAt('clino-total-label', Math.max(180, xTarget - 65), Math.max(22, yTop - 10), `H = ${totalH.toFixed(1)} m`);
  }

  for (const id of ['clino-dist', 'clino-angle', 'clino-eye']) {
    const el = $(id);
    if (el) {
      el.addEventListener('input', drawClinometer);
      el.addEventListener('change', drawClinometer);
    }
  }

  document.querySelectorAll('[data-clino-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-clino-preset');
      const preset = clinoPresets[key];
      if (!preset) return;
      activeClinoPreset = key;
      document.querySelectorAll('[data-clino-preset]').forEach(b => b.classList.toggle('is-active', b === btn));
      $('clino-dist').value = preset.d;
      $('clino-angle').value = preset.angle;
      $('clino-eye').value = preset.eye;
      ['clino-dist', 'clino-angle', 'clino-eye'].forEach(id => {
        $(id).dispatchEvent(new Event('input'));
      });
      drawClinometer();
    });
  });

  /* ── 4. Practice Challenges ──────────────────────────────────── */
  const questions = [
    {title:'Identify a ratio',text:'Relative to θ, opposite = 6 and hypotenuse = 10. Choose the ratio and enter its value.',ratio:'sin',answer:.6,unit:'ratio',hint:'O and H appear in SOH. Divide opposite by hypotenuse.',solution:'sin θ = 6 / 10 = 0.6.'},
    {title:'Find the opposite side',text:'θ = 30° and hypotenuse = 12 cm. Find the opposite side.',ratio:'sin',answer:6,unit:'cm',hint:'sin 30° = x / 12. Multiply both sides by 12.',solution:'x = 12 × sin 30° = 6.0 cm.'},
    {title:'Find the adjacent side',text:'θ = 60° and hypotenuse = 14 cm. Find the adjacent side.',ratio:'cos',answer:7,unit:'cm',hint:'A and H mean CAH: cos 60° = x / 14.',solution:'x = 14 × cos 60° = 7.0 cm.'},
    {title:'Find the hypotenuse',text:'θ = 40° and adjacent = 8 cm. Find the hypotenuse.',ratio:'cos',answer:8/Math.cos(rad(40)),unit:'cm',hint:'cos 40° = 8 / h. Multiply by h, then divide by cos 40°.',solution:'h = 8 / cos 40° ≈ 10.4 cm. It is longer than the adjacent side.'},
    {title:'Measure a height',text:'You stand 20 m horizontally from a tree. The angle from the ground to its top is 35°. Treat the observation point as ground level. Find the height.',ratio:'tan',answer:20*Math.tan(rad(35)),unit:'m',hint:'Height is opposite; ground distance is adjacent. tan 35° = height / 20.',solution:'height = 20 × tan 35° ≈ 14.0 m. For an eye-level observation, add your eye height.'},
    {title:'Find an angle',text:'Opposite = 5 cm and adjacent = 12 cm. Find θ in degrees.',ratio:'tan',answer:Math.atan(5/12)*180/Math.PI,unit:'degrees',hint:'tan θ = 5 / 12. Use inverse tangent in degree mode.',solution:'θ = tan⁻¹(5 / 12) ≈ 22.6°.'}
  ];
  let index = 0;
  const solved = new Set();

  function load() {
    const q = questions[index];
    $('progress').textContent = `Challenge ${index+1} of ${questions.length} · ${solved.size} solved`;
    $('challenge-title').textContent = q.title;
    $('challenge-text').textContent = q.text;
    $('answer-label').textContent = `Your answer (${q.unit})`;
    $('choice').value = '';
    $('answer').value = '';
    $('feedback').textContent = '';
    $('hint-text').textContent = '';
    $('next').disabled = index === questions.length - 1;
  }

  $('practice-form').addEventListener('submit', event => {
    event.preventDefault();
    const q = questions[index], value = $('answer').value.trim();
    if (!$('choice').value) { $('feedback').textContent = 'Choose a ratio first. Which two sides are involved?'; return; }
    if ($('choice').value !== q.ratio) { $('feedback').textContent = `Try again. ${q.hint}`; return; }
    if (!value || !Number.isFinite(Number(value))) { $('feedback').textContent = 'The ratio is right. Enter a numerical answer.'; return; }
    if (Math.abs(Number(value)-q.answer) > .051) { $('feedback').textContent = `The ratio is right. Check your rearrangement and degree mode. ${q.hint}`; return; }
    solved.add(index);
    $('feedback').textContent = `Correct! ${q.solution}${solved.size === questions.length ? ' All six challenges solved.' : ''}`;
    $('progress').textContent = `Challenge ${index+1} of ${questions.length} · ${solved.size} solved`;
  });

  $('hint').addEventListener('click', () => { $('hint-text').textContent = questions[index].hint; });
  $('next').addEventListener('click', () => {
    if (index < questions.length - 1) {
      index++;
      load();
      $('challenge-title').setAttribute('tabindex', '-1');
      $('challenge-title').focus();
    }
  });
  $('restart').addEventListener('click', () => { index = 0; solved.clear(); load(); });

  /* ── 5. Sticky Steps Bar Scroll-Spy ──────────────────────────── */
  const stepLinks = Array.from(document.querySelectorAll('.ll-lesson-steps a'));
  const simScroller = document.querySelector('.ll-sim');
  if (stepLinks.length && simScroller) {
    const sections = stepLinks
      .map(link => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    simScroller.addEventListener('scroll', () => {
      const scrollTop = simScroller.scrollTop + 120;
      let currentId = sections[0] ? sections[0].id : '';
      for (const sec of sections) {
        if (sec.offsetTop <= scrollTop) {
          currentId = sec.id;
        }
      }
      stepLinks.forEach(link => {
        link.classList.toggle('ll-step-active', link.getAttribute('href') === `#${currentId}`);
      });
    }, { passive: true });
  }

  draw();
  drawClinometer();
  load();
})();
