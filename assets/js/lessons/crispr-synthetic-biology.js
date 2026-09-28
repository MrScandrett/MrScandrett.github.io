(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const GUIDE = 'AUGCCAUAGCUA'; // Short fictional teaching fragment, not a real guide.
  const outcomes = {
    disrupted: { label: 'Reporter disrupted', description: 'A small insertion or deletion can disrupt a gene, but not every small change does.', caption: 'Repair scenario: DNA is rejoined with a small change that disrupts reporter function.' },
    unchanged: { label: 'Function preserved', description: 'A repair can leave the reporter functional. A DNA cut does not prove a functional knockout.', caption: 'Repair scenario: DNA is rejoined and reporter function is preserved.' },
    template: { label: 'Reporter color changed', description: 'This scenario assumes a supplied DNA template and successful template-directed repair. Cas9 does not invent the replacement sequence.', caption: 'Repair scenario: a supplied template changes the reporter from green to cyan.' }
  };
  let state = { verified: false, stage: 0, playing: false, elapsed: 0, outcome: null, signal: true, light: false };
  let records = [];
  let dirty = true;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cut = SimKit.canvas2d($('cutCanvas'), { height: 200, onResize: () => { dirty = true; } });
  const dish = SimKit.canvas2d($('dishCanvas'), { onResize: () => { dirty = true; } });
  const colonies = Array.from({ length: 30 }, (_, i) => {
    const angle = i * 2.39996;
    const radius = Math.sqrt((i + .5) / 30) * .77;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, r: 2 + i % 3 };
  });
  function feedback(message, error = false) {
    $('recognitionFeedback').textContent = message;
    $('recognitionFeedback').dataset.error = String(error);
  }
  function renderGuide() {
    $('guideTiles').replaceChildren(...Array.from({ length: 12 }, (_, i) => {
      const span = document.createElement('span');
      const base = $('guideInput').value[i];
      const mismatch = !!base && base !== GUIDE[i];
      span.className = mismatch ? 'mismatch' : '';
      span.textContent = base || '·';
      span.title = `Position ${i + 1}: ${!base ? 'empty' : mismatch ? 'mismatch' : 'paired'}`;
      if (mismatch) { const mark = document.createElement('small'); mark.textContent = '×'; span.append(mark); }
      return span;
    }));
    $('pamDisplay').textContent = $('pamSelect').value;
    $('pamComplement').textContent = $('pamSelect').value === 'TGG' ? 'ACC' : 'ACT';
  }
  function output(edited) {
    if (!state.signal) return 'No fluorescence (signal off)';
    if (!state.light) return 'Not visible (light off)';
    if (edited && state.outcome === 'disrupted') return 'No fluorescence (disrupted)';
    return edited && state.outcome === 'template' ? 'Cyan fluorescence' : 'Green fluorescence';
  }
  function renderCircuit() {
    $('signalBtn').textContent = `Signal: ${state.signal ? 'on' : 'off'}`;
    $('signalBtn').setAttribute('aria-pressed', String(state.signal));
    $('lightBtn').textContent = `Excitation light: ${state.light ? 'on' : 'off'}`;
    $('lightBtn').setAttribute('aria-pressed', String(state.light));
    $('dishStatus').textContent = `Control: ${output(false)}. Comparison: ${output(true)}. ${state.outcome ? outcomes[state.outcome].label + '.' : 'No completed edit yet; both populations have a functional green reporter.'}`;
    dirty = true;
  }
  function controls() {
    $('stepBtn').disabled = !state.verified || state.stage === 3 || state.playing;
    $('runBtn').disabled = !state.verified || state.stage === 3;
    $('runBtn').textContent = state.playing ? 'Pause stages' : reducedMotion.matches ? 'Show final stage' : 'Play stages';
    $('replayBtn').disabled = !state.verified || state.stage !== 3;
    document.querySelectorAll('[data-phase]').forEach(el => {
      if (Number(el.dataset.phase) === state.stage) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
    dirty = true;
  }
  function invalidate() {
    state.verified = false; state.stage = 0; state.playing = false; state.elapsed = 0; state.outcome = null;
    $('stageCaption').textContent = 'Check a matching guide and valid PAM to unlock the cut model.';
    feedback('Conditions changed. Check recognition again.');
    renderGuide(); renderCircuit(); controls();
  }
  function recognize() {
    invalidate();
    const value = $('guideInput').value;
    if (!/^[AUCG]{12}$/.test(value)) { feedback('Enter exactly 12 RNA letters: A, U, C, or G. RNA uses U, not T.', true); return; }
    if (value !== GUIDE) { feedback('A mismatch is present. This exact-match teaching model rejects it. Real Cas9 can tolerate some mismatches, so this is not an off-target safety prediction.', true); return; }
    if ($('pamSelect').value !== 'TGG') { feedback('The guide matches, but TGA does not fit NGG. Recognition fails in this SpCas9 model.', true); return; }
    state.verified = true;
    feedback('Guide pairing and PAM both pass in this model. Now follow recognition, cutting, and repair.');
    $('stageCaption').textContent = 'Ready. Step through the model or play all three stages.';
    controls();
  }
  function advance() {
    if (!state.verified || state.stage >= 3) return;
    state.stage++;
    if (state.stage === 1) $('stageCaption').textContent = 'Recognition: Cas9 checks the PAM and the guide pairs with the complementary DNA strand.';
    if (state.stage === 2) $('stageCaption').textContent = 'Cut: the DNA strands break. A cut is not yet a repaired edit; reporter output has not been assigned.';
    if (state.stage === 3) {
      state.outcome = $('repairSelect').value;
      state.playing = false;
      $('stageCaption').textContent = outcomes[state.outcome].caption + ' Compare the populations below.';
      renderCircuit();
    }
    controls();
  }
  $('guideInput').addEventListener('input', () => { $('guideInput').value = $('guideInput').value.toUpperCase().replace(/\s/g, ''); invalidate(); });
  $('matchBtn').addEventListener('click', () => { $('guideInput').value = GUIDE; invalidate(); });
  $('mismatchBtn').addEventListener('click', () => { $('guideInput').value = 'C' + GUIDE.slice(1); invalidate(); });
  $('pamSelect').addEventListener('change', invalidate);
  $('repairSelect').addEventListener('change', () => { $('repairDescription').textContent = outcomes[$('repairSelect').value].description; invalidate(); });
  $('recognizeBtn').addEventListener('click', recognize);
  $('stepBtn').addEventListener('click', advance);
  $('runBtn').addEventListener('click', () => {
    if (!state.verified) return;
    if (reducedMotion.matches) { while (state.stage < 3) advance(); return; }
    state.playing = !state.playing; state.elapsed = 0; controls();
  });
  $('replayBtn').addEventListener('click', () => {
    state.stage = 0; state.playing = false; state.elapsed = 0; state.outcome = null;
    $('stageCaption').textContent = 'Replay ready. Use Next stage or Play stages.';
    controls(); renderCircuit();
  });
  $('signalBtn').addEventListener('click', () => { state.signal = !state.signal; renderCircuit(); });
  $('lightBtn').addEventListener('click', () => { state.light = !state.light; renderCircuit(); });
  function renderRecords() {
    const tbody = $('observations'); tbody.replaceChildren();
    if (!records.length) { const row = tbody.insertRow(); const cell = row.insertCell(); cell.colSpan = 3; cell.textContent = 'Run a comparison, then record what you see.'; }
    records.forEach(record => { const row = tbody.insertRow(); record.forEach(text => { row.insertCell().textContent = text; }); });
  }
  $('recordBtn').addEventListener('click', () => {
    records.unshift([state.outcome ? outcomes[state.outcome].label : 'Baseline (no completed edit)', `${state.signal ? 'On' : 'Off'} / ${state.light ? 'On' : 'Off'}`, `${output(false)} / ${output(true)}`]);
    records = records.slice(0, 6); renderRecords();
    $('dishStatus').textContent += ' Observation recorded.';
  });
  $('resetBtn').addEventListener('click', () => {
    state.signal = true; state.light = false; records = [];
    $('guideInput').value = ''; $('pamSelect').value = 'TGG'; $('repairSelect').value = 'disrupted';
    $('repairDescription').textContent = outcomes.disrupted.description;
    invalidate(); renderRecords(); feedback('Lab reset. Load a guide or build your own fragment, then check it.');
  });
  function drawCut() {
    const c = cut.ctx, w = cut.width, h = cut.height, x = w * .58;
    c.clearRect(0, 0, w, h); c.lineWidth = 3;
    for (const y of [104, 132]) {
      c.strokeStyle = '#b6a3dc'; c.beginPath(); c.moveTo(20, y);
      if (state.stage === 2) { c.lineTo(x - 14, y); c.moveTo(x + 14, y); }
      c.lineTo(w - 20, y); c.stroke();
    }
    c.font = '13px sans-serif'; c.fillStyle = '#f5f0ff'; c.fillText('DNA · two strands', 18, 180);
    if (state.stage < 3) {
      c.fillStyle = '#a78cd3'; c.beginPath(); c.ellipse(state.stage === 0 ? w * .25 : x, 65, 33, 23, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#241b36'; c.textAlign = 'center'; c.fillText('Cas9', state.stage === 0 ? w * .25 : x, 69); c.textAlign = 'left';
    }
    if (state.stage === 1) {
      c.strokeStyle = '#79e5bd'; c.lineWidth = 5; c.beginPath(); c.moveTo(x - 38, 143); c.lineTo(x + 5, 143); c.stroke();
      c.fillStyle = '#f5d778'; c.fillRect(x + 14, 98, 28, 10);
    }
    if (state.stage === 2) { c.fillStyle = '#f5d778'; c.fillText('Break', Math.max(16, x - 18), 95); }
    if (state.stage === 3) {
      c.strokeStyle = state.outcome === 'disrupted' ? '#ffb7a7' : state.outcome === 'template' ? '#77d7f5' : '#79e5bd';
      c.lineWidth = 6;
      for (const y of [104, 132]) { c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x + 22, y); c.stroke(); }
      c.fillStyle = '#f5f0ff'; c.textAlign = 'center'; c.fillText('Rejoined DNA', x, 70); c.textAlign = 'left';
    }
  }
  function drawDishes() {
    const c = dish.ctx, w = dish.width, h = dish.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = state.light ? '#28243d' : '#edf1f5'; c.fillRect(0, 0, w, h);
    const radius = Math.min(w * .20, (h - 85) / 2), y = h / 2 + 8;
    [false, true].forEach((edited, index) => {
      const x = w * (index ? .75 : .25);
      c.fillStyle = state.light ? '#37334e' : '#e1e5d9'; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
      c.strokeStyle = state.light ? '#c9c0e5' : '#827891'; c.lineWidth = 3; c.stroke();
      const glowing = state.signal && state.light && !(edited && state.outcome === 'disrupted');
      c.fillStyle = glowing ? edited && state.outcome === 'template' ? '#77d7f5' : '#79e5bd' : state.light ? '#8a839d' : '#879477';
      c.shadowColor = c.fillStyle; c.shadowBlur = glowing ? 8 : 0;
      colonies.forEach(cell => { c.beginPath(); c.arc(x + cell.x * radius, y + cell.y * radius, cell.r * Math.min(1, radius / 80), 0, Math.PI * 2); c.fill(); });
      c.shadowBlur = 0; c.fillStyle = state.light ? '#faf7ff' : '#302747'; c.textAlign = 'center'; c.font = 'bold 13px sans-serif';
      c.fillText(index ? 'Comparison' : 'Unedited control', x, 27);
      c.font = '12px sans-serif'; c.fillText(glowing ? edited && state.outcome === 'template' ? 'Cyan' : 'Green' : 'No visible fluorescence', x, h - 15);
    });
    c.textAlign = 'left';
  }
  reducedMotion.addEventListener('change', () => { state.playing = false; controls(); });
  SimKit.theme.onChange(() => { dirty = true; });
  renderGuide(); controls(); renderCircuit();
  SimKit.loop(dt => {
    if (state.playing) { state.elapsed += Math.min(dt, .1); if (state.elapsed >= 1.1) { state.elapsed = 0; advance(); } }
    if (dirty) { drawCut(); drawDishes(); dirty = false; }
  });
})();
