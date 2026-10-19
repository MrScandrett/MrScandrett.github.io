(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const GUIDE = 'AUGCCAUAGCUA'; // Short fictional teaching fragment, not a real guide.
  const GUIDE = 'AUGCCAUAGCUA'; // 12-base teaching fragment
  const TARGET_DNA = 'ATGCCATAGCTA';
  const TARGET_COMPLEMENT = 'TACGGTATCGAT';

  const PAM_INFO = {
    TGG: { valid: true, note: 'TGG matches canonical SpCas9 5′-NGG-3′ motif (N = T).' },
    CGG: { valid: true, note: 'CGG matches canonical SpCas9 5′-NGG-3′ motif (N = C).' },
    AGG: { valid: true, note: 'AGG matches canonical SpCas9 5′-NGG-3′ motif (N = A).' },
    TGA: { valid: false, note: 'TGA fails SpCas9 5′-NGG-3′ rule: ends in GA instead of GG.' },
    CCC: { valid: false, note: 'CCC fails SpCas9 5′-NGG-3′ rule: lacks the required GG dinucleotide.' }
  };

  const outcomes = {
    disrupted: { label: 'Reporter disrupted', description: 'A small insertion or deletion can disrupt a gene, but not every small change does.', caption: 'Repair scenario: DNA is rejoined with a small change that disrupts reporter function.' },
    unchanged: { label: 'Function preserved', description: 'A repair can leave the reporter functional. A DNA cut does not prove a functional knockout.', caption: 'Repair scenario: DNA is rejoined and reporter function is preserved.' },
    template: { label: 'Reporter color changed', description: 'This scenario assumes a supplied DNA template and successful template-directed repair. Cas9 does not invent the replacement sequence.', caption: 'Repair scenario: a supplied template changes the reporter from green to cyan.' }
    disrupted: {
      label: 'NHEJ: Reporter Disrupted (Knockout)',
      description: 'Non-Homologous End Joining (NHEJ) rejoins the cut with a 1-base deletion. This creates a frameshift mutation that destroys reporter function.',
      caption: 'Cellular repair outcome: NHEJ introduces an indel (deletion) that knocks out reporter fluorescence.'
    },
    unchanged: {
      label: 'Exact Ligation: Function Preserved',
      description: 'The cell directly ligates the broken ends without error, restoring the original sequence. Reporter function remains intact.',
      caption: 'Cellular repair outcome: error-free ligation restores the original sequence and keeps the green reporter functional.'
    },
    template: {
      label: 'HDR: Donor Template Knock-In (Cyan Reporter)',
      description: 'Homology-Directed Repair (HDR) uses a supplied synthetic DNA template to precisely rewrite the chromophore codon, shifting fluorescence from green to cyan.',
      caption: 'Cellular repair outcome: Homology-Directed Repair (HDR) incorporates the template, producing cyan fluorescence.'
    }
  };
  let state = { verified: false, stage: 0, playing: false, elapsed: 0, outcome: null, signal: true, light: false };

  const QUESTIONS = [
    {
      id: 'q1',
      title: '1. Viewing Conditions',
      prompt: 'Both populations are dark when the excitation light is turned off. What can you scientifically conclude?',
      options: [
        { id: 'a', text: 'The reporter gene must have been knocked out by Cas9.', correct: false, explanation: 'Incorrect. Even an intact, fully expressed fluorescent protein is dark without excitation photons.' },
        { id: 'b', text: 'The viewing conditions cannot reveal fluorescence without excitation light.', correct: true, explanation: 'Correct! Fluorescent proteins require excitation light to absorb and emit photons. Darkness alone does not prove a gene disruption.' },
        { id: 'c', text: 'Cas9 must have cleaved the DNA at an off-target site.', correct: false, explanation: 'Incorrect. The absence of light tells us nothing about Cas9 cutting activity.' }
      ]
    },
    {
      id: 'q2',
      title: '2. PAM Recognition',
      prompt: 'Why does SpCas9 require a 5′-NGG-3′ PAM motif immediately next to the target site before unwinding DNA?',
      options: [
        { id: 'a', text: 'Cas9 uses PAM recognition as an initial kinetic anchor before unzipping DNA.', correct: true, explanation: 'Correct! Cas9 tests the short PAM motif first; only when a PAM is present does it expend energy unwinding the double helix to test guide RNA matching.' },
        { id: 'b', text: 'The PAM sequence is where the cell’s repair proteins bind after cutting.', correct: false, explanation: 'Incorrect. The PAM is recognized strictly by Cas9 before cutting, not by repair enzymes.' },
        { id: 'c', text: 'The PAM becomes part of the guide RNA transcript.', correct: false, explanation: 'Incorrect. The PAM is a sequence on the genomic DNA, never part of the guide RNA.' }
      ]
    },
    {
      id: 'q3',
      title: '3. Repair Pathways',
      prompt: 'Why does converting a green reporter into a cyan reporter require a supplied donor DNA template?',
      options: [
        { id: 'a', text: 'Cas9 synthesizes the new nucleotides directly during cleavage.', correct: false, explanation: 'Incorrect. Cas9 is strictly an endonuclease (molecular scissors); it has no polymerase or synthesis capability.' },
        { id: 'b', text: 'The cell uses Homology-Directed Repair (HDR) to copy the donor template into the cut site.', correct: true, explanation: 'Correct! To write a specific new sequence (such as a point mutation), the cell must copy an exogenously supplied repair template via HDR.' },
        { id: 'c', text: 'NHEJ randomly mutates the DNA until it accidentally produces cyan.', correct: false, explanation: 'Incorrect. NHEJ generates random insertions and deletions (indels) that almost always destroy protein function rather than creating a specific alternate color.' }
      ]
    },
    {
      id: 'q4',
      title: '4. Genetic Circuits',
      prompt: 'A bacterial colony has an intact wild-type reporter gene, and blue excitation light is ON, yet no green fluorescence appears. What is the most plausible explanation?',
      options: [
        { id: 'a', text: 'The upstream regulatory signal (inducer) is absent, so transcription remains turned off.', correct: true, explanation: 'Correct! In synthetic biology circuits, expression requires an active input signal to induce the promoter. Without induction, the gene is not transcribed.' },
        { id: 'b', text: 'The petri dish agar destroyed the DNA double helix.', correct: false, explanation: 'Incorrect. Nutrient agar supports living bacterial colonies.' },
        { id: 'c', text: 'Fluorescent proteins require pitch darkness to be seen.', correct: false, explanation: 'Incorrect. Fluorescent proteins require excitation light of the appropriate wavelength (e.g. 488nm blue) to fluoresce.' }
      ]
    }
  ];

  let state = {
    verified: false,
    stage: 0,
    playing: false,
    elapsed: 0,
    outcome: null,
    signal: true,
    light: false,
    activeQuiz: 0,
    quizAnswers: {}
  };

  let records = [];
  let dirty = true;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cut = SimKit.canvas2d($('cutCanvas'), { height: 200, onResize: () => { dirty = true; } });

  const cut = SimKit.canvas2d($('cutCanvas'), { height: 230, onResize: () => { dirty = true; } });
  const dish = SimKit.canvas2d($('dishCanvas'), { onResize: () => { dirty = true; } });
  const colonies = Array.from({ length: 30 }, (_, i) => {
    const angle = i * 2.39996;
    const radius = Math.sqrt((i + .5) / 30) * .77;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, r: 2 + i % 3 };

  // 36 bacterial colonies arranged naturally on agar
  const colonies = Array.from({ length: 36 }, (_, i) => {
    const angle = i * 2.39996 + 0.4;
    const radius = Math.sqrt((i + 0.5) / 36) * 0.76;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      r: 2.2 + (i % 4) * 0.8
    };
  });

  function feedback(message, error = false) {
    $('recognitionFeedback').textContent = message;
    $('recognitionFeedback').dataset.error = String(error);
    const el = $('recognitionFeedback');
    if (!el) return;
    el.textContent = message;
    el.dataset.error = String(error);
  }

  function renderGuide() {
    $('guideTiles').replaceChildren(...Array.from({ length: 12 }, (_, i) => {
    const input = $('guideInput');
    const value = (input ? input.value : '').toUpperCase();
    const container = $('guideTiles');
    if (!container) return;

    container.replaceChildren(...Array.from({ length: 12 }, (_, i) => {
      const span = document.createElement('span');
      const base = $('guideInput').value[i];
      const base = value[i] || '';
      const mismatch = !!base && base !== GUIDE[i];
      span.className = mismatch ? 'mismatch' : '';
      span.textContent = base || '·';
      span.title = `Position ${i + 1}: ${!base ? 'empty' : mismatch ? 'mismatch' : 'paired'}`;
      if (mismatch) { const mark = document.createElement('small'); mark.textContent = '×'; span.append(mark); }
      span.tabIndex = 0;
      span.setAttribute('role', 'button');
      span.setAttribute('aria-label', `Position ${i + 1}: ${base ? base : 'empty'}. Click to cycle nucleotide.`);
      span.title = `Position ${i + 1}: ${!base ? 'empty (click to set)' : mismatch ? `mismatch with ${GUIDE[i]}` : 'correctly paired'} (click to cycle)`;

      if (mismatch) {
        const mark = document.createElement('small');
        mark.textContent = '×';
        span.append(mark);
      }

      span.addEventListener('click', () => cycleBase(i));
      span.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cycleBase(i);
        }
      });

      return span;
    }));
    const paired = [...$('guideInput').value.slice(0, 12)].filter((base, i) => base === GUIDE[i]).length;
    $('pairingStatus').textContent = `${paired} of 12 positions paired · ${$('guideInput').value.length} letters entered`;
    $('pamDisplay').textContent = $('pamSelect').value;
    $('pamComplement').textContent = $('pamSelect').value === 'TGG' ? 'ACC' : 'ACT';

    const paired = [...value.slice(0, 12)].filter((base, i) => base === GUIDE[i]).length;
    const pairingEl = $('pairingStatus');
    if (pairingEl) {
      pairingEl.textContent = `${paired} of 12 bases complementary · ${value.length}/12 letters entered`;
    }

    const pamVal = $('pamSelect') ? $('pamSelect').value : 'TGG';
    const pamDisp = $('pamDisplay');
    if (pamDisp) pamDisp.textContent = pamVal;

    const pamComp = $('pamComplement');
    if (pamComp) {
      const compMap = { A: 'T', T: 'A', C: 'G', G: 'C' };
      pamComp.textContent = pamVal.split('').map(b => compMap[b] || 'N').join('');
    }
  }

  function cycleBase(index) {
    const input = $('guideInput');
    if (!input) return;
    const BASES = ['A', 'U', 'C', 'G'];
    let current = (input.value || '').toUpperCase();
    while (current.length < 12) current += 'A';
    const curBase = current[index] || 'A';
    const nextBase = BASES[(BASES.indexOf(curBase) + 1) % BASES.length];
    input.value = current.slice(0, index) + nextBase + current.slice(index + 1);
    invalidate();
  }

  function output(edited) {
    if (!state.signal) return 'No fluorescence (signal off)';
    if (!state.light) return 'Not visible (light off)';
    if (edited && state.outcome === 'disrupted') return 'No fluorescence (disrupted)';
    return edited && state.outcome === 'template' ? 'Cyan fluorescence' : 'Green fluorescence';
    if (!state.signal) return 'No fluorescence (promoter uninduced)';
    if (!state.light) return 'Not visible (excitation light off)';
    if (edited && state.outcome === 'disrupted') return 'No fluorescence (reporter knockout)';
    if (edited && state.outcome === 'template') return 'Cyan fluorescence (476 nm)';
    return 'Green fluorescence (509 nm)';
  }

  function renderCircuit() {
    $('signalBtn').textContent = `Signal: ${state.signal ? 'on' : 'off'}`;
    $('signalBtn').setAttribute('aria-pressed', String(state.signal));
    $('lightBtn').textContent = `Excitation light: ${state.light ? 'on' : 'off'}`;
    $('lightBtn').setAttribute('aria-pressed', String(state.light));
    $('dishStatus').textContent = `Control: ${output(false)}. Comparison: ${output(true)}. ${state.outcome ? outcomes[state.outcome].label + '.' : 'No completed edit yet; both populations have a functional green reporter.'}`;
    const sigBtn = $('signalBtn');
    if (sigBtn) {
      sigBtn.textContent = `Signal: ${state.signal ? 'Present (ON)' : 'Absent (OFF)'}`;
      sigBtn.setAttribute('aria-pressed', String(state.signal));
    }
    const lightBtn = $('lightBtn');
    if (lightBtn) {
      lightBtn.textContent = `Excitation Light: ${state.light ? '488nm Blue ON' : 'Room Light (OFF)'}`;
      lightBtn.setAttribute('aria-pressed', String(state.light));
    }

    const statusEl = $('dishStatus');
    if (statusEl) {
      statusEl.textContent = `Control: ${output(false)}. Comparison: ${output(true)}. ${state.outcome ? outcomes[state.outcome].label + '.' : 'Baseline control: wild-type green reporter intact.'}`;
    }

    const hudSignal = $('hudSignal');
    if (hudSignal) hudSignal.textContent = state.signal ? 'Signal: Active' : 'Signal: Inactive';
    const hudLight = $('hudLight');
    if (hudLight) hudLight.textContent = state.light ? 'Filter: 488nm Blue' : 'Filter: Ambient Light';

    dirty = true;
  }

  function controls() {
    $('stepBtn').disabled = !state.verified || state.stage === 3 || state.playing;
    $('runBtn').disabled = !state.verified || state.stage === 3;
    $('runBtn').textContent = state.playing ? 'Pause stages' : reducedMotion.matches ? 'Show final stage' : 'Play stages';
    $('replayBtn').disabled = !state.verified || state.stage !== 3;
    const stepBtn = $('stepBtn');
    if (stepBtn) stepBtn.disabled = !state.verified || state.stage === 3 || state.playing;

    const runBtn = $('runBtn');
    if (runBtn) {
      runBtn.disabled = !state.verified || state.stage === 3;
      runBtn.textContent = state.playing ? 'Pause stages' : reducedMotion.matches ? 'Show final stage' : 'Play stages';
    }

    const replayBtn = $('replayBtn');
    if (replayBtn) replayBtn.disabled = !state.verified || state.stage !== 3;

    document.querySelectorAll('[data-phase]').forEach(el => {
      if (Number(el.dataset.phase) === state.stage) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
    $('sequenceEvidence').textContent = state.stage === 3 ? ({ disrupted: 'Before: ATGCCATAGCTA → after: ATGCCATA–CTA (one base deleted). In this chosen scenario, reporter function is lost.', unchanged: 'Before: ATGCCATAGCTA → after: ATGCCATAGCTA (original sequence restored). Reporter function is preserved.', template: 'Before: ATGCCATAGCTA → after: ATGCCATCGCTA (template-specified change). The larger, unshown template is assumed to produce a cyan reporter.' })[state.outcome] : 'No repaired sequence yet. Complete the repair stage to compare evidence.';

    const seqEl = $('sequenceEvidence');
    if (seqEl) {
      if (state.stage === 3 && state.outcome) {
        const evidenceMap = {
          disrupted: 'Wild-type: 5′-ATGCCATAGCTA-3′ → Repaired: 5′-ATGCCATA–CTA-3′ (1bp deletion). The resulting frameshift disrupts the fluorophore reading frame.',
          unchanged: 'Wild-type: 5′-ATGCCATAGCTA-3′ → Repaired: 5′-ATGCCATAGCTA-3′ (Sequence perfectly restored). The full green fluorescent protein is synthesized.',
          template: 'Wild-type: 5′-ATGCCATAGCTA-3′ → Repaired: 5′-ATGCCATCGCTA-3′ (Template knock-in). Donor template codon substitution Tyr66His produces cyan fluorescent protein.'
        };
        seqEl.textContent = evidenceMap[state.outcome] || '';
      } else {
        seqEl.textContent = 'No repaired sequence yet. Complete the repair stage to examine molecular evidence.';
      }
    }

    dirty = true;
  }

  function invalidate() {
    state.verified = false; state.stage = 0; state.playing = false; state.elapsed = 0; state.outcome = null;
    $('stageCaption').textContent = 'Check a matching guide and valid PAM to unlock the cut model.';
    $('guideInput').removeAttribute('aria-invalid');
    feedback('Conditions changed. Check recognition again.');
    renderGuide(); renderCircuit(); controls();
    state.verified = false;
    state.stage = 0;
    state.playing = false;
    state.elapsed = 0;
    state.outcome = null;
    const stageCaption = $('stageCaption');
    if (stageCaption) stageCaption.textContent = 'Check a matching guide and valid PAM to unlock the cut model.';
    const guideInput = $('guideInput');
    if (guideInput) guideInput.removeAttribute('aria-invalid');
    feedback('Conditions changed. Check recognition again to continue.');
    renderGuide();
    renderCircuit();
    controls();
  }

  function recognize() {
    invalidate();
    const value = $('guideInput').value;
    if (!/^[AUCG]{12}$/.test(value)) { $('guideInput').setAttribute('aria-invalid', 'true'); feedback('Enter exactly 12 RNA letters: A, U, C, or G. RNA uses U, not T.', true); return; }
    if (value !== GUIDE) { feedback('A mismatch is present. This exact-match teaching model rejects it. Real Cas9 can tolerate some mismatches, so this is not an off-target safety prediction.', true); return; }
    if ($('pamSelect').value !== 'TGG') { feedback('The guide matches, but TGA does not fit NGG. Recognition fails in this SpCas9 model.', true); return; }
    const input = $('guideInput');
    const value = input ? input.value.toUpperCase() : '';
    if (!/^[AUCG]{12}$/.test(value)) {
      if (input) input.setAttribute('aria-invalid', 'true');
      feedback('Enter exactly 12 RNA letters: A, U, C, or G. RNA uses Uracil (U), not Thymine (T).', true);
      return;
    }
    if (value !== GUIDE) {
      feedback('Mismatch detected! This model requires exact complementary pairing. Real Cas9 may tolerate some distal mismatches, but exact pairing ensures high fidelity.', true);
      return;
    }

    const pamVal = $('pamSelect') ? $('pamSelect').value : 'TGG';
    const pamInfo = PAM_INFO[pamVal] || { valid: false, note: 'Unknown PAM motif.' };
    if (!pamInfo.valid) {
      feedback(`Guide RNA matches, but ${pamVal} fails: ${pamInfo.note} Cas9 requires a valid PAM to trigger DNA unwinding.`, true);
      return;
    }

    state.verified = true;
    feedback('Guide pairing and PAM both pass in this model. Now follow recognition, cutting, and repair.');
    $('stageCaption').textContent = 'Ready. Step through the model or play all three stages.';
    feedback(`Recognition successful! Guide RNA paired with target DNA, and PAM (${pamVal}) satisfied 5′-NGG-3′. Now step through recognition, cut, and repair.`);
    const stageCaption = $('stageCaption');
    if (stageCaption) stageCaption.textContent = 'Ready. Step through the stages or press Play stages to run the animation.';
    controls();
  }

  function advance() {
    if (!state.verified || state.stage >= 3) return;
    state.stage++;
    if (state.stage === 1) $('stageCaption').textContent = 'Recognition: Cas9 checks the PAM and the guide pairs with the complementary DNA strand.';
    if (state.stage === 2) $('stageCaption').textContent = 'Cut: the DNA strands break. A cut is not yet a repaired edit; reporter output has not been assigned.';
    const stageCaption = $('stageCaption');
    if (state.stage === 1 && stageCaption) {
      stageCaption.textContent = 'Stage 1 · Recognition: Cas9 binds the PAM motif, unzips DNA, and guide RNA pairs with the target strand forming an R-loop.';
    }
    if (state.stage === 2 && stageCaption) {
      stageCaption.textContent = 'Stage 2 · Cleavage: The HNH and RuvC nuclease domains cleave both DNA strands 3bp upstream of the PAM, creating a Double-Strand Break (DSB).';
    }
    if (state.stage === 3) {
      state.outcome = $('repairSelect').value;
      state.outcome = $('repairSelect') ? $('repairSelect').value : 'disrupted';
      state.playing = false;
      $('stageCaption').textContent = outcomes[state.outcome].caption + ' Compare the populations below.';
      if (stageCaption) {
        stageCaption.textContent = outcomes[state.outcome].caption + ' Examine the repaired sequence and compare the petri dishes below.';
      }
      renderCircuit();
    }
    controls();
  }
  $('guideInput').addEventListener('input', () => { $('guideInput').value = $('guideInput').value.toUpperCase().replace(/\s/g, ''); invalidate(); });
  $('matchBtn').addEventListener('click', () => { $('guideInput').value = GUIDE; invalidate(); });
  $('mismatchBtn').addEventListener('click', () => { $('guideInput').value = 'C' + GUIDE.slice(1); invalidate(); });
  $('pamSelect').addEventListener('change', invalidate);
  $('repairSelect').addEventListener('change', () => { $('repairDescription').textContent = outcomes[$('repairSelect').value].description; state.stage = 0; state.playing = false; state.elapsed = 0; state.outcome = null; $('stageCaption').textContent = state.verified ? 'New repair scenario ready. Use Next stage or Play stages; guide and PAM remain verified.' : 'Check a matching guide and valid PAM to unlock the cut model.'; controls(); renderCircuit(); });
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
    $('exportBtn').disabled = !records.length;
    const tbody = $('observations'); tbody.replaceChildren();
    if (!records.length) { const row = tbody.insertRow(); const cell = row.insertCell(); cell.colSpan = 3; cell.textContent = 'Run a comparison, then record what you see.'; }
    records.forEach(record => { const row = tbody.insertRow(); record.forEach(text => { row.insertCell().textContent = text; }); });
  }
  $('recordBtn').addEventListener('click', () => {
    records.unshift([state.outcome ? outcomes[state.outcome].label : 'Baseline (no completed edit)', `${state.signal ? 'On' : 'Off'} / ${state.light ? 'On' : 'Off'}`, `${output(false)} / ${output(true)}`]);
    records = records.slice(0, 6); renderRecords();
    $('dishStatus').textContent += ' Observation recorded.';
  });
  $('claimBtn').addEventListener('click', () => {
    const answer = $('claimSelect').value;
    $('claimFeedback').textContent = answer === 'light' ? 'Supported. With no excitation light, even a functional reporter is not visibly fluorescent. Restore the light and compare with the control; sequence evidence is needed to confirm an edit.' : answer ? 'That goes beyond the evidence. Darkness without excitation light cannot establish whether cutting or repair occurred. Test the viewing conditions first.' : 'Choose a claim before checking.';
  });
  $('exportBtn').addEventListener('click', () => {
    const content = ['CRISPR classroom model — observation record', 'Chosen scenarios, not measured editing rates. Most recent observation first.', '', ...records.map((r, i) => `${i + 1}. ${r.join(' | ')}`)].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'crispr-observations.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('resetBtn').addEventListener('click', () => {
    state.signal = true; state.light = false; records = []; $('claimSelect').value = ''; $('claimFeedback').textContent = 'Choose the conclusion supported by the observation.';
    $('guideInput').value = ''; $('pamSelect').value = 'TGG'; $('repairSelect').value = 'disrupted';
    $('repairDescription').textContent = outcomes.disrupted.description;
    invalidate(); renderRecords(); feedback('Lab reset. Load a guide or build your own fragment, then check it.');
  });

  // --- Visuals: Cas9 Cut & Repair Canvas ---
  function drawCut() {
    const c = cut.ctx, w = cut.width, h = cut.height, x = w * .58;
    c.clearRect(0, 0, w, h); c.lineWidth = 3;
    for (const y of [104, 132]) {
      c.strokeStyle = '#b6a3dc'; c.beginPath(); c.moveTo(20, y);
      if (state.stage === 2) { c.lineTo(x - 14, y); c.moveTo(x + 14, y); }
      c.lineTo(w - 20, y); c.stroke();
    const c = cut.ctx;
    const w = cut.width;
    const h = cut.height;
    c.clearRect(0, 0, w, h);

    const isNight = document.documentElement.dataset.lighting === 'night';
    const strandY1 = 92;
    const strandY2 = 142;
    const startX = 35;
    const baseSpacing = Math.min(48, (w - 70) / 16);
    const cutIndex = 8; // 3bp upstream of PAM (between position 8 and 9)
    const cutX = startX + cutIndex * baseSpacing;
    const pamX = startX + 12 * baseSpacing;

    const baseColors = {
      A: '#34d399', // emerald
      T: '#a78bfa', // violet
      U: '#fb923c', // coral orange (RNA)
      C: '#fbbf24', // amber
      G: '#38bdf8'  // cyan
    };

    // Draw background grid/track
    c.fillStyle = isNight ? '#1a1429' : '#281f3d';
    c.fillRect(0, 0, w, h);

    // 1. Draw Phosphodiester Backbones
    c.lineWidth = 3;
    const drawBackbone = (y, split) => {
      c.beginPath();
      if (split && state.stage >= 2) {
        c.moveTo(startX - 10, y);
        c.lineTo(cutX - 10, y);
        c.moveTo(cutX + 10, y);
        c.lineTo(startX + 15 * baseSpacing + 10, y);
      } else {
        c.moveTo(startX - 10, y);
        c.lineTo(startX + 15 * baseSpacing + 10, y);
      }
      c.stroke();
    };

    c.strokeStyle = '#8571a8';
    drawBackbone(strandY1, state.stage === 2);
    drawBackbone(strandY2, state.stage === 2);

    // Labels for 5' and 3' ends
    c.font = '600 11px "IBM Plex Mono", monospace';
    c.fillStyle = '#bfaed8';
    c.textAlign = 'right';
    c.fillText('5′', startX - 14, strandY1 + 4);
    c.fillText('3′', startX - 14, strandY2 + 4);
    c.textAlign = 'left';
    c.fillText('3′', startX + 15 * baseSpacing + 14, strandY1 + 4);
    c.fillText('5′', startX + 15 * baseSpacing + 14, strandY2 + 4);

    // 2. Draw Target DNA Base Pairs & Hydrogen Bonds
    const pamVal = $('pamSelect') ? $('pamSelect').value : 'TGG';
    const fullUpper = TARGET_DNA + pamVal;
    const fullLower = TARGET_COMPLEMENT + (pamVal === 'TGG' ? 'ACC' : pamVal === 'CGG' ? 'GCC' : pamVal === 'AGG' ? 'TCC' : 'ACT');

    for (let i = 0; i < 15; i++) {
      const x = startX + i * baseSpacing;
      const isPam = i >= 12;
      const upperLetter = fullUpper[i] || 'N';
      const lowerLetter = fullLower[i] || 'N';

      // Hydrogen bonds (dashed rungs)
      if (state.stage < 1 || isPam || state.stage === 3) {
        c.strokeStyle = 'rgba(210, 195, 235, 0.4)';
        c.lineWidth = 1.5;
        c.setLineDash([3, 3]);
        c.beginPath();
        c.moveTo(x, strandY1 + 8);
        c.lineTo(x, strandY2 - 8);
        c.stroke();
        c.setLineDash([]);
      }

      // Upper strand nucleotide node
      c.fillStyle = baseColors[upperLetter] || '#999';
      c.beginPath();
      c.arc(x, strandY1, 6, 0, Math.PI * 2);
      c.fill();

      // Lower strand nucleotide node
      c.fillStyle = baseColors[lowerLetter] || '#999';
      c.beginPath();
      c.arc(x, strandY2, 6, 0, Math.PI * 2);
      c.fill();

      // Letter annotations
      c.font = '700 11px "IBM Plex Mono", monospace';
      c.textAlign = 'center';
      c.fillStyle = isPam ? '#fde047' : '#f5f0ff';
      c.fillText(upperLetter, x, strandY1 - 10);
      c.fillText(lowerLetter, x, strandY2 + 18);
    }
    c.font = '13px sans-serif'; c.fillStyle = '#f5f0ff'; c.fillText('DNA · two strands', 18, 180);

    // 3. Highlight PAM Region
    c.strokeStyle = '#f5d778';
    c.lineWidth = 2;
    c.strokeRect(pamX - baseSpacing * 0.4, strandY1 - 24, baseSpacing * 3 - 4, strandY2 - strandY1 + 48);
    c.fillStyle = '#f5d778';
    c.font = '700 10px Manrope, sans-serif';
    c.textAlign = 'center';
    c.fillText('PAM (5′-NGG-3′)', pamX + baseSpacing, strandY1 - 28);

    // 4. Cas9 Ribonucleoprotein & Guide RNA
    if (state.stage < 3) {
      c.fillStyle = '#a78cd3'; c.beginPath(); c.ellipse(state.stage === 0 ? w * .25 : x, 65, 33, 23, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#241b36'; c.textAlign = 'center'; c.fillText('Cas9', state.stage === 0 ? w * .25 : x, 69); c.textAlign = 'left';
      const casX = state.stage === 0 ? startX + 3 * baseSpacing : cutX + 2 * baseSpacing;
      const casY = (strandY1 + strandY2) / 2;

      // Cas9 Bilobed Protein Silhouette
      c.save();
      c.fillStyle = 'rgba(124, 75, 189, 0.45)';
      c.strokeStyle = '#a78cd3';
      c.lineWidth = 2;

      // REC Lobe (Recognition lobe)
      c.beginPath();
      c.ellipse(casX - 25, casY - 30, 48, 34, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // NUC Lobe (Nuclease lobe)
      c.fillStyle = 'rgba(99, 66, 160, 0.65)';
      c.beginPath();
      c.ellipse(casX + 15, casY + 10, 52, 42, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Labels
      c.fillStyle = '#f5f0ff';
      c.font = '800 12px Manrope, sans-serif';
      c.textAlign = 'center';
      c.fillText('Cas9', casX, casY - 26);
      c.font = '600 9px Manrope, sans-serif';
      c.fillStyle = '#e0d4f5';
      c.fillText('REC Lobe', casX - 30, casY - 36);
      c.fillText('NUC Lobe (RuvC + HNH)', casX + 15, casY + 38);
      c.restore();

      // Stage 1: Guide RNA invaded and paired (R-loop)
      if (state.stage === 1) {
        c.strokeStyle = '#fb923c';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(startX - 5, strandY2 - 14);
        c.lineTo(pamX - baseSpacing * 0.4, strandY2 - 14);
        c.stroke();

        // Guide RNA base pairing pins
        for (let i = 0; i < 12; i++) {
          const gx = startX + i * baseSpacing;
          c.fillStyle = '#fb923c';
          c.beginPath();
          c.arc(gx, strandY2 - 14, 4, 0, Math.PI * 2);
          c.fill();

          c.strokeStyle = '#fb923c';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(gx, strandY2 - 14);
          c.lineTo(gx, strandY2 - 5);
          c.stroke();
        }

        c.fillStyle = '#fdba74';
        c.font = '700 10px Manrope, sans-serif';
        c.textAlign = 'center';
        c.fillText('Guide RNA · R-Loop', startX + 6 * baseSpacing, strandY2 - 22);

        // Cleavage indicators at active sites
        c.fillStyle = '#ef4444';
        c.font = '700 11px Manrope, sans-serif';
        c.fillText('✂ Cut Site', cutX, strandY1 - 22);
      }
    }
    if (state.stage === 1) {
      c.strokeStyle = '#79e5bd'; c.lineWidth = 5; c.beginPath(); c.moveTo(x - 38, 143); c.lineTo(x + 5, 143); c.stroke();
      c.fillStyle = '#f5d778'; c.fillRect(x + 14, 98, 28, 10);

    // Stage 2: Double-Strand Break
    if (state.stage === 2) {
      c.strokeStyle = '#f87171';
      c.lineWidth = 3;
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(cutX, strandY1 - 20);
      c.lineTo(cutX, strandY2 + 20);
      c.stroke();
      c.setLineDash([]);

      c.fillStyle = '#fca5a5';
      c.font = '800 12px Manrope, sans-serif';
      c.textAlign = 'center';
      c.fillText('Double-Strand Break (DSB)', cutX, 36);
      c.font = '600 10px Manrope, sans-serif';
      c.fillText('Cleaved 3bp upstream of PAM', cutX, 52);
    }
    if (state.stage === 2) { c.fillStyle = '#f5d778'; c.fillText('Break', Math.max(16, x - 18), 95); }

    // Stage 3: Repaired outcome visualization
    if (state.stage === 3) {
      c.strokeStyle = state.outcome === 'disrupted' ? '#ffb7a7' : state.outcome === 'template' ? '#77d7f5' : '#79e5bd';
      c.save();
      const outcome = state.outcome;
      let outcomeColor = '#4ade80';
      let outcomeTitle = 'Direct Repair (Wild-Type)';

      if (outcome === 'disrupted') {
        outcomeColor = '#f87171';
        outcomeTitle = 'NHEJ Repair: Indel Disruption (Knockout)';
      } else if (outcome === 'template') {
        outcomeColor = '#38bdf8';
        outcomeTitle = 'HDR Repair: Donor Template Knock-In (Cyan)';
      }

      // Splice patch across cut site
      c.strokeStyle = outcomeColor;
      c.lineWidth = 6;
      for (const y of [104, 132]) { c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x + 22, y); c.stroke(); }
      c.fillStyle = '#f5f0ff'; c.textAlign = 'center'; c.fillText('Rejoined DNA', x, 70); c.textAlign = 'left';
      c.beginPath();
      c.moveTo(cutX - 25, strandY1);
      c.lineTo(cutX + 25, strandY1);
      c.moveTo(cutX - 25, strandY2);
      c.lineTo(cutX + 25, strandY2);
      c.stroke();

      c.fillStyle = outcomeColor;
      c.font = '800 13px Manrope, sans-serif';
      c.textAlign = 'center';
      c.fillText(outcomeTitle, cutX, 36);

      if (outcome === 'disrupted') {
        c.fillStyle = '#fca5a5';
        c.font = '700 11px "IBM Plex Mono", monospace';
        c.fillText('Δ1bp Frameshift Scar', cutX, 56);
      } else if (outcome === 'template') {
        c.fillStyle = '#7dd3fc';
        c.font = '700 11px "IBM Plex Mono", monospace';
        c.fillText('Donor Template Knock-In: Tyr66His', cutX, 56);
      } else {
        c.fillStyle = '#86efac';
        c.font = '700 11px "IBM Plex Mono", monospace';
        c.fillText('Original Sequence Restored', cutX, 56);
      }

      c.restore();
    }
  }

  // --- Visuals: Fluorescent Reporter Petri Dishes ---
  function drawDishes() {
    const c = dish.ctx, w = dish.width, h = dish.height;
    const c = dish.ctx;
    const w = dish.width;
    const h = dish.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = state.light ? '#28243d' : '#edf1f5'; c.fillRect(0, 0, w, h);
    const radius = Math.min(w * .20, (h - 85) / 2), y = h / 2 + 8;

    const isExcited = state.light;
    const isNight = document.documentElement.dataset.lighting === 'night';

    // Background illumination
    c.fillStyle = isExcited ? '#121424' : isNight ? '#1b1728' : '#eaf0f5';
    c.fillRect(0, 0, w, h);

    const dishRadius = Math.min(w * 0.22, (h - 75) / 2);
    const centerY = h / 2 + 10;

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
      const centerX = w * (index ? 0.75 : 0.25);

      // Petri Dish Outer Rim & Glass Bevel
      const rimGradient = c.createRadialGradient(centerX, centerY, dishRadius * 0.9, centerX, centerY, dishRadius + 4);
      if (isExcited) {
        rimGradient.addColorStop(0, '#222842');
        rimGradient.addColorStop(1, '#3b4366');
      } else {
        rimGradient.addColorStop(0, '#e5ded1');
        rimGradient.addColorStop(1, '#cdc3b2');
      }

      c.fillStyle = rimGradient;
      c.beginPath();
      c.arc(centerX, centerY, dishRadius + 4, 0, Math.PI * 2);
      c.fill();

      // Nutrient Agar Bed
      const agarGradient = c.createRadialGradient(centerX - dishRadius * 0.2, centerY - dishRadius * 0.2, dishRadius * 0.1, centerX, centerY, dishRadius);
      if (isExcited) {
        agarGradient.addColorStop(0, '#1a1f33');
        agarGradient.addColorStop(1, '#0e1222');
      } else {
        agarGradient.addColorStop(0, '#f9f6ee');
        agarGradient.addColorStop(1, '#ece5d4');
      }

      c.fillStyle = agarGradient;
      c.beginPath();
      c.arc(centerX, centerY, dishRadius, 0, Math.PI * 2);
      c.fill();

      // Dish Glass Border
      c.strokeStyle = isExcited ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.35)';
      c.lineWidth = 2.5;
      c.stroke();

      // Determine Colony Fluorescence
      const isInduced = state.signal;
      const isFluorescing = isInduced && isExcited && !(edited && state.outcome === 'disrupted');
      const isCyan = edited && state.outcome === 'template';

      let colonyColor;
      let glowColor;

      if (!isExcited) {
        // Room white light: colonies look like natural off-white bacterial spots
        colonyColor = '#d6cca8';
        glowColor = 'transparent';
      } else if (!isInduced) {
        // Excitation light on, but uninduced (no reporter protein produced)
        colonyColor = '#333b4f';
        glowColor = 'transparent';
      } else if (isFluorescing) {
        // Active reporter fluorescence!
        if (isCyan) {
          colonyColor = '#38bdf8';
          glowColor = 'rgba(56, 189, 248, 0.75)';
        } else {
          colonyColor = '#4ade80';
          glowColor = 'rgba(74, 222, 128, 0.75)';
        }
      } else {
        // Edited knockout under blue light: dark non-fluorescent autofluorescence
        colonyColor = '#2d3345';
        glowColor = 'transparent';
      }

      // Draw Bacterial Colonies
      c.save();
      colonies.forEach(cell => {
        const cx = centerX + cell.x * dishRadius;
        const cy = centerY + cell.y * dishRadius;
        const cr = cell.r * Math.min(1.2, dishRadius / 80);

        if (isFluorescing) {
          c.shadowColor = glowColor;
          c.shadowBlur = 12;
        }

        c.fillStyle = colonyColor;
        c.beginPath();
        c.arc(cx, cy, cr, 0, Math.PI * 2);
        c.fill();
      });
      c.restore();

      // Header Labels above Dish
      c.textAlign = 'center';
      c.font = '800 13px Manrope, sans-serif';
      c.fillStyle = isExcited ? '#f8fafc' : isNight ? '#f5f0ff' : '#1e1b2e';
      c.fillText(index ? 'Plate B: CRISPR Edited Population' : 'Plate A: Unedited Control (Wild-Type)', centerX, 26);

      // Status text below Dish
      c.font = '600 12px Manrope, sans-serif';
      let outcomeLabel = 'Green (509nm)';
      if (!isExcited) outcomeLabel = 'Translucent (Room light)';
      else if (!isInduced) outcomeLabel = 'Dark (Uninduced)';
      else if (edited && state.outcome === 'disrupted') outcomeLabel = 'Dark (Gene Knockout)';
      else if (edited && state.outcome === 'template') outcomeLabel = 'Cyan (476nm)';

      c.fillStyle = isFluorescing ? (isCyan ? '#38bdf8' : '#4ade80') : (isExcited ? '#94a3b8' : '#64748b');
      c.fillText(outcomeLabel, centerX, h - 16);
    });

    c.textAlign = 'left';
  }
  reducedMotion.addEventListener('change', () => { state.playing = false; controls(); });
  SimKit.theme.onChange(() => { dirty = true; });
  renderGuide(); controls(); renderCircuit();

  // --- Interactive Assessment Checkpoint ---
  function renderQuiz() {
    const q = QUESTIONS[state.activeQuiz];
    const container = $('quizQuestionContainer');
    if (!container) return;

    // Render Question Tab Buttons
    const nav = $('quizNav');
    if (nav) {
      nav.replaceChildren(...QUESTIONS.map((item, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cr-quiz-tab' + (idx === state.activeQuiz ? ' is-active' : '');
        if (state.quizAnswers[idx]?.correct) btn.classList.add('is-correct');
        btn.textContent = `Question ${idx + 1}`;
        btn.setAttribute('aria-label', `Go to Question ${idx + 1}`);
        btn.addEventListener('click', () => {
          state.activeQuiz = idx;
          renderQuiz();
        });
        return btn;
      }));
    }

    // Render Active Question & Options
    const qTitle = $('quizTitle');
    if (qTitle) qTitle.textContent = q.prompt;

    const optionsContainer = $('quizOptions');
    if (optionsContainer) {
      optionsContainer.replaceChildren(...q.options.map(opt => {
        const label = document.createElement('label');
        label.className = 'cr-quiz-option';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `quiz-option-${q.id}`;
        radio.value = opt.id;
        radio.checked = state.quizAnswers[state.activeQuiz]?.selectedId === opt.id;

        const textSpan = document.createElement('span');
        textSpan.textContent = opt.text;

        label.append(radio, textSpan);

        radio.addEventListener('change', () => {
          state.quizAnswers[state.activeQuiz] = {
            selectedId: opt.id,
            correct: opt.correct,
            explanation: opt.explanation
          };
          renderQuizFeedback();
          renderQuiz();
        });

        return label;
      }));
    }

    renderQuizFeedback();
  }

  function renderQuizFeedback() {
    const feedbackEl = $('quizFeedback');
    if (!feedbackEl) return;

    const answer = state.quizAnswers[state.activeQuiz];
    if (!answer) {
      feedbackEl.className = 'cr-quiz-feedback';
      feedbackEl.textContent = '';
      return;
    }

    feedbackEl.className = `cr-quiz-feedback is-visible ${answer.correct ? 'is-correct' : 'is-incorrect'}`;
    feedbackEl.innerHTML = `<strong>${answer.correct ? '✓ Correct! ' : '✗ Keep thinking: '}</strong>${answer.explanation}`;
  }

  // --- Observations & Export ---
  function renderRecords() {
    const exportBtn = $('exportBtn');
    const copyBtn = $('copyBtn');
    if (exportBtn) exportBtn.disabled = !records.length;
    if (copyBtn) copyBtn.disabled = !records.length;

    const tbody = $('observations');
    if (!tbody) return;
    tbody.replaceChildren();

    if (!records.length) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.textContent = 'Run an experiment comparison above, then click Record observation.';
      return;
    }

    records.forEach(record => {
      const row = tbody.insertRow();
      record.forEach(text => {
        const cell = row.insertCell();
        cell.textContent = text;
      });
    });
  }

  function recordObservation() {
    const outcomeLabel = state.outcome ? outcomes[state.outcome].label : 'Baseline (Wild-Type Reporter)';
    const condition = `Signal: ${state.signal ? 'On' : 'Off'} | Light: ${state.light ? '488nm Blue' : 'Room Light'}`;
    const result = `Control: ${output(false)} | Edited: ${output(true)}`;

    records.unshift([outcomeLabel, condition, result]);
    records = records.slice(0, 8);
    renderRecords();

    const statusEl = $('dishStatus');
    if (statusEl) statusEl.textContent += ' Observation recorded in table.';
  }

  // Event Listeners
  const guideInput = $('guideInput');
  if (guideInput) {
    guideInput.addEventListener('input', () => {
      guideInput.value = guideInput.value.toUpperCase().replace(/[^AUCG]/g, '');
      invalidate();
    });
  }

  const matchBtn = $('matchBtn');
  if (matchBtn) matchBtn.addEventListener('click', () => {
    if (guideInput) guideInput.value = GUIDE;
    invalidate();
  });

  const mismatchBtn = $('mismatchBtn');
  if (mismatchBtn) mismatchBtn.addEventListener('click', () => {
    if (guideInput) guideInput.value = 'C' + GUIDE.slice(1);
    invalidate();
  });

  const pamSelect = $('pamSelect');
  if (pamSelect) pamSelect.addEventListener('change', invalidate);

  const repairSelect = $('repairSelect');
  if (repairSelect) {
    repairSelect.addEventListener('change', () => {
      const descEl = $('repairDescription');
      if (descEl && outcomes[repairSelect.value]) {
        descEl.textContent = outcomes[repairSelect.value].description;
      }
      state.stage = 0;
      state.playing = false;
      state.elapsed = 0;
      state.outcome = null;
      const stageCaption = $('stageCaption');
      if (stageCaption) {
        stageCaption.textContent = state.verified
          ? 'New repair scenario selected. Use Next stage or Play stages to observe this cellular repair mechanism.'
          : 'Check a matching guide and valid PAM to unlock the cut model.';
      }
      controls();
      renderCircuit();
    });
  }

  const recognizeBtn = $('recognizeBtn');
  if (recognizeBtn) recognizeBtn.addEventListener('click', recognize);

  const stepBtn = $('stepBtn');
  if (stepBtn) stepBtn.addEventListener('click', advance);

  const runBtn = $('runBtn');
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      if (!state.verified) return;
      if (reducedMotion.matches) {
        while (state.stage < 3) advance();
        return;
      }
      state.playing = !state.playing;
      state.elapsed = 0;
      controls();
    });
  }

  const replayBtn = $('replayBtn');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      state.stage = 0;
      state.playing = false;
      state.elapsed = 0;
      state.outcome = null;
      const stageCaption = $('stageCaption');
      if (stageCaption) stageCaption.textContent = 'Replay ready. Use Next stage or Play stages.';
      controls();
      renderCircuit();
    });
  }

  const signalBtn = $('signalBtn');
  if (signalBtn) signalBtn.addEventListener('click', () => {
    state.signal = !state.signal;
    renderCircuit();
  });

  const lightBtn = $('lightBtn');
  if (lightBtn) lightBtn.addEventListener('click', () => {
    state.light = !state.light;
    renderCircuit();
  });

  const recordBtn = $('recordBtn');
  if (recordBtn) recordBtn.addEventListener('click', recordObservation);

  const exportBtn = $('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const content = [
        'CRISPR & Synthetic Biology Lab — ClassroomOS Observation Record',
        'Date: ' + new Date().toLocaleDateString(),
        'Guide RNA target: 5′-AUGCCAUAGCUA-3′ | Valid PAM motif: 5′-NGG-3′',
        '-----------------------------------------------------------------',
        ...records.map((r, i) => `${i + 1}. [${r[0]}]\n   Conditions: ${r[1]}\n   Result: ${r[2]}\n`)
      ].join('\n');
      const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'crispr-observations.txt';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  const copyBtn = $('copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const content = records.map((r, i) => `${i + 1}. ${r[0]} | ${r[1]} | ${r[2]}`).join('\n');
      try {
        await navigator.clipboard.writeText(content);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied to clipboard!';
        setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
      } catch (err) {
        feedback('Could not access clipboard directly.', true);
      }
    });
  }

  const resetBtn = $('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.signal = true;
      state.light = false;
      records = [];
      state.quizAnswers = {};
      state.activeQuiz = 0;
      if (guideInput) guideInput.value = '';
      if (pamSelect) pamSelect.value = 'TGG';
      if (repairSelect) repairSelect.value = 'disrupted';
      const descEl = $('repairDescription');
      if (descEl) descEl.textContent = outcomes.disrupted.description;
      invalidate();
      renderRecords();
      renderQuiz();
      feedback('Lab reset. Build or load a guide RNA fragment, then check recognition.');
    });
  }

  reducedMotion.addEventListener('change', () => {
    state.playing = false;
    controls();
  });

  SimKit.theme.onChange(() => {
    dirty = true;
  });

  // Initialization
  renderGuide();
  controls();
  renderCircuit();
  renderRecords();
  renderQuiz();

  SimKit.loop(dt => {
    if (state.playing) { state.elapsed += Math.min(dt, .1); if (state.elapsed >= 1.1) { state.elapsed = 0; advance(); } }
    if (dirty) { drawCut(); drawDishes(); dirty = false; }
    if (state.playing) {
      state.elapsed += Math.min(dt, 0.1);
      if (state.elapsed >= 1.2) {
        state.elapsed = 0;
        advance();
      }
    }
    if (dirty) {
      drawCut();
      drawDishes();
      dirty = false;
    }
  });
})();
