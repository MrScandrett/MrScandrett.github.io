import {
  CARD_DECK_PRESETS,
  CHALLENGES,
  LOOM_COLS,
  LOOM_NOTES,
  NOTE_G_PRESETS,
  PRESET_ORDER,
  TRACE_EXERCISES,
  buildEngineTrace,
  checkTraceSubmission,
  cloneLoomGrid,
  decodeBinaryCard,
  decodeDecimalCard,
  encodeBinaryCard,
  encodeDecimalCard,
  encodeLoomColumn,
  evaluateChallenges,
  executeCardDeck,
  generateDeckPython,
} from './ada-lovelace-engine.js';

(function () {
  'use strict';

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Gentle Web Audio Synth (User-Gesture Only) ──────────────────────────── */
  let sharedAudioCtx = null;
  function getAudioCtx() {
    if (!sharedAudioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) sharedAudioCtx = new Ctor();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  }

  function playTone(freq, duration = 0.14, type = 'triangle', gainPeak = 0.05) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainPeak, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {
      /* Audio blocked or unavailable */
    }
  }

  /* ── Challenge Tracker & Studio Navigation ───────────────────────────────── */
  const challengeProgress = {};
  const challengePill = document.getElementById('al-challenge-pill');
  const challengeDrawer = document.getElementById('al-challenges-drawer');
  const challengeList = document.getElementById('al-challenges-list');
  const challengeCloseBtn = document.getElementById('al-challenges-close');

  const modeTabs = [...document.querySelectorAll('[data-al-tab]')];
  const modePanels = [...document.querySelectorAll('[data-al-panel]')];
  let activeTab = 'engine';

  function renderChallenges() {
    const items = evaluateChallenges(challengeProgress);
    const doneCount = items.filter((c) => c.completed).length;
    if (challengePill) {
      challengePill.textContent = `Challenges: ${doneCount} / ${items.length}`;
    }
    if (!challengeList) return;
    challengeList.innerHTML = '';
    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = `al-challenge-item${item.completed ? ' is-done' : ''}`;

      const top = document.createElement('div');
      top.className = 'al-challenge-top';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const badge = document.createElement('span');
      badge.className = 'al-challenge-state';
      badge.textContent = item.completed ? 'Done ✓' : 'Try it';
      top.append(title, badge);

      const desc = document.createElement('p');
      desc.textContent = item.description;

      const goBtn = document.createElement('button');
      goBtn.type = 'button';
      goBtn.className = 'al-mini-btn';
      goBtn.textContent = item.completed ? 'Revisit workspace' : 'Go to workspace →';
      goBtn.addEventListener('click', () => {
        switchModeTab(item.tab);
        if (item.preset && presetSelect) {
          presetSelect.value = item.preset;
          loadPreset(item.preset);
        }
        toggleChallengesDrawer(false);
      });

      card.append(top, desc, goBtn);
      challengeList.appendChild(card);
    });
  }

  function markChallenge(id) {
    if (challengeProgress[id]) return;
    challengeProgress[id] = true;
    renderChallenges();
    const ch = CHALLENGES.find((c) => c.id === id);
    if (ch) {
      window.LessonContent?.toast?.(`✓ Challenge complete: ${ch.title}`);
    }
  }

  function toggleChallengesDrawer(force) {
    if (!challengeDrawer || !challengePill) return;
    const open = typeof force === 'boolean' ? force : challengeDrawer.hidden;
    challengeDrawer.hidden = !open;
    challengePill.setAttribute('aria-expanded', String(open));
  }

  challengePill?.addEventListener('click', () => toggleChallengesDrawer());
  challengeCloseBtn?.addEventListener('click', () => toggleChallengesDrawer(false));

  function switchModeTab(tabId) {
    activeTab = tabId;
    modeTabs.forEach((btn) => {
      const isMatch = btn.dataset.alTab === tabId;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-selected', String(isMatch));
      btn.tabIndex = isMatch ? 0 : -1;
    });
    modePanels.forEach((panel) => {
      panel.hidden = panel.dataset.alPanel !== tabId;
    });
    if (tabId !== 'engine') pauseEngine();
    if (tabId !== 'loom') stopLoomPlayback();
    requestAnimationFrame(() => {
      engineSim2d?.resize();
      loomSim2d?.resize();
      window.dispatchEvent(new Event('resize'));
    });
  }

  modeTabs.forEach((btn, idx) => {
    btn.addEventListener('click', () => switchModeTab(btn.dataset.alTab));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const nextIdx =
          e.key === 'ArrowRight'
            ? (idx + 1) % modeTabs.length
            : (idx - 1 + modeTabs.length) % modeTabs.length;
        modeTabs[nextIdx].focus();
        switchModeTab(modeTabs[nextIdx].dataset.alTab);
      }
    });
  });

  /* ============================================================================
     TAB 1: NOTE G ANALYTICAL ENGINE STUDIO
     ============================================================================ */
  const engineCanvas = document.getElementById('al-engine-canvas');
  const presetSelect = document.getElementById('al-preset-select');
  const bugToggleBtn = document.getElementById('al-bug-toggle');
  const backBtn = document.getElementById('al-back');
  const playBtn = document.getElementById('al-play');
  const nextBtn = document.getElementById('al-next');
  const resetBtn = document.getElementById('al-reset');
  const speedSelect = document.getElementById('al-speed-select');
  const soundBtn = document.getElementById('al-sound-toggle');
  const seekSlider = document.getElementById('al-seek');

  const hudLeft = document.getElementById('al-hud-left');
  const hudRight = document.getElementById('al-hud-right');
  const statStep = document.getElementById('al-stat-step');
  const statOp = document.getElementById('al-stat-op');
  const statRead = document.getElementById('al-stat-read');
  const statWrite = document.getElementById('al-stat-write');

  const narrationBox = document.getElementById('al-narration-box');
  const phasePill = document.getElementById('al-phase-pill');
  const narrationText = document.getElementById('al-narration-text');
  const tapeBar = document.getElementById('al-tape-bar');
  const storeBody = document.getElementById('al-store-tbody');
  const tableBody = document.getElementById('al-1843-tbody');
  const pythonOut = document.getElementById('al-python-out');
  const copyPythonBtn = document.getElementById('al-copy-python');

  const inspTabs = [...document.querySelectorAll('[data-al-insp-tab]')];
  const inspPanels = [...document.querySelectorAll('[data-al-insp-panel]')];

  let currentPresetId = 'note-g-n1';
  let injectOp4Bug = false;
  let currentTrace = buildEngineTrace(currentPresetId, { injectOp4Bug });
  let stepIdx = 0;
  let enginePlaying = false;
  let engineTimer = null;
  let engineSound = false;
  let gearAngle = 0;
  let transitionStart = -Infinity;
  let engineSim2d = null;

  if (presetSelect) {
    PRESET_ORDER.forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = NOTE_G_PRESETS[id].shortTitle;
      presetSelect.appendChild(opt);
    });
    presetSelect.value = currentPresetId;
  }

  function updateEngineChallenges(step) {
    if (!step) return;
    if (step.bugActive) markChallenge('catch-1843-bug');
    const produced = (label) =>
      step.tape.some((t) => t.label === label && !t.isBuggy && !t.preloaded);
    if (!injectOp4Bug && produced('B1')) {
      markChallenge('run-note-g');
    }
    if (!injectOp4Bug && produced('B7')) {
      markChallenge('witness-inner-loop');
    }
  }

  function pauseEngine() {
    if (engineTimer) {
      clearInterval(engineTimer);
      engineTimer = null;
    }
    enginePlaying = false;
    if (playBtn) {
      playBtn.textContent = 'Play';
      playBtn.setAttribute('aria-pressed', 'false');
    }
  }

  function scheduleEnginePlayback() {
    if (engineTimer) clearInterval(engineTimer);
    const speed = Number(speedSelect?.value || 2);
    const delayMs = Math.max(220, 1500 - speed * 250);
    engineTimer = setInterval(() => {
      if (stepIdx < currentTrace.steps.length - 1) {
        stepIdx += 1;
        transitionStart = performance.now();
        gearAngle += 0.7;
        playEngineTick();
        renderEngine();
      } else {
        pauseEngine();
        renderEngine();
      }
    }, delayMs);
  }

  function playEngine() {
    if (enginePlaying) return;
    if (stepIdx >= currentTrace.steps.length - 1) stepIdx = 0;
    enginePlaying = true;
    if (playBtn) {
      playBtn.textContent = 'Pause';
      playBtn.setAttribute('aria-pressed', 'true');
    }
    scheduleEnginePlayback();
    renderEngine();
  }

  function seekEngine(nextIndex) {
    pauseEngine();
    stepIdx = Math.max(0, Math.min(currentTrace.steps.length - 1, nextIndex));
    transitionStart = performance.now();
    gearAngle += 0.7;
    playEngineTick();
    renderEngine();
  }

  function playEngineTick() {
    if (!engineSound) return;
    const step = currentTrace.steps[stepIdx];
    if (!step) return;
    if (step.bugActive) playTone(145, 0.2, 'sawtooth', 0.04);
    else if (step.opNum === 24) playTone(660, 0.22, 'sine', 0.05);
    else playTone(260 + (step.opNum % 8) * 32, 0.08, 'triangle', 0.03);
  }

  function loadPreset(presetId, preserveStep = false) {
    pauseEngine();
    currentPresetId = presetId;
    const preset = NOTE_G_PRESETS[presetId];
    if (bugToggleBtn) {
      bugToggleBtn.disabled = !preset.supportsBug;
      if (!preset.supportsBug) {
        injectOp4Bug = false;
        bugToggleBtn.setAttribute('aria-pressed', 'false');
        bugToggleBtn.textContent = '1843 Op 4 Bug: Off';
      }
    }
    currentTrace = buildEngineTrace(currentPresetId, { injectOp4Bug });
    stepIdx = preserveStep
      ? Math.min(stepIdx, currentTrace.steps.length - 1)
      : 0;
    if (seekSlider) {
      seekSlider.max = String(currentTrace.steps.length);
      seekSlider.value = String(stepIdx + 1);
    }
    renderStatic1843Table();
    renderEngine();
  }

  function renderStatic1843Table() {
    if (!tableBody) return;
    if (!currentTrace.tableRows.length) {
      tableBody.innerHTML =
        '<tr><td colspan="3">Warm-Up preset uses whole numbers. Switch to any Note G preset to inspect Ada’s 25 operations.</td></tr>';
      return;
    }
    tableBody.innerHTML = currentTrace.tableRows
      .map(
        (row) => `<tr class="is-clickable" data-op-row="${row.op}">
          <td>Op ${row.op}</td>
          <td>${row.instr}</td>
          <td>${row.meaning}</td>
        </tr>`,
      )
      .join('');
    tableBody.querySelectorAll('[data-op-row]').forEach((tr) => {
      tr.addEventListener('click', () => {
        const targetOp = Number(tr.dataset.opRow);
        const matchIdx = currentTrace.steps.findIndex((s) => s.opNum === targetOp);
        if (matchIdx >= 0) seekEngine(matchIdx);
      });
    });
  }

  function drawEngineFrame() {
    if (!engineCanvas) return;
    const ctx = engineCanvas.getContext('2d');
    const W = engineSim2d ? engineSim2d.width : engineCanvas.clientWidth || 680;
    const H = engineSim2d ? engineSim2d.height : engineCanvas.clientHeight || 340;
    if (!engineSim2d) {
      engineCanvas.width = W;
      engineCanvas.height = H;
    }

    const step = currentTrace.steps[stepIdx] || currentTrace.steps[0];
    const prior = stepIdx > 0 ? currentTrace.steps[stepIdx - 1] : null;
    const cols = step.columns;
    const nCols = cols.length;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#21190f');
    bgGrad.addColorStop(1, '#0e0b08');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 1. Punched Card Reader Bar (top)
    const padX = W < 440 ? 8 : 14;
    const cardY = 34;
    const cardH = 34;
    ctx.fillStyle = step.bugActive ? '#fde2e4' : '#f4e6c7';
    ctx.beginPath();
    ctx.roundRect(padX, cardY, W - padX * 2, cardH, 6);
    ctx.fill();
    ctx.strokeStyle = step.bugActive ? '#be123c' : '#a16207';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Decorative punched card notches along left edge
    ctx.fillStyle = '#1c1306';
    for (let h = 0; h < 3; h++) {
      ctx.beginPath();
      ctx.arc(padX + 14 + (h % 2) * 9, cardY + 10 + h * 7, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = step.bugActive ? '#881337' : '#291a05';
    ctx.font = `700 ${W < 500 ? 11 : 12.5}px ui-monospace, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cardLabel = step.opNum === 0
      ? step.cardText
      : `OP ${step.opNum} (${step.opSymbol}): ${step.cardText}`;
    ctx.fillText(cardLabel, W / 2, cardY + cardH / 2, W - 96);

    // 2. Store Gear Columns
    const storeTop = cardY + cardH + 18;
    const millH = 54;
    const millY = H - millH - 12;
    const railY = millY - 22;
    const colH = Math.max(82, railY - storeTop - 22);
    const availW = W - padX * 2;
    const colGap = W < 440 ? (nCols > 10 ? 2 : 5) : (nCols > 10 ? 4 : 8);
    const colW = Math.max(12, (availW - colGap * (nCols - 1)) / nCols);

    // Group brackets for Note G
    if (nCols > 10) {
      const drawGroupLabel = (startIdx, count, label, color) => {
        const gx = padX + startIdx * (colW + colGap);
        const gw = count * colW + (count - 1) * colGap;
        ctx.fillStyle = color;
        ctx.font = `700 ${W < 440 ? 8 : 9.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, gx + gw / 2, storeTop - 8, gw);
      };
      drawGroupLabel(0, 3, 'DATA', '#5eead4');
      drawGroupLabel(3, 10, 'WORKING STORE', '#fbbf24');
      drawGroupLabel(13, 4, 'RESULTS', '#c4b5fd');
    }

    const animT = prefersReducedMotion()
      ? 1
      : Math.min(1, (performance.now() - transitionStart) / 550);

    const colCenters = {};
    cols.forEach((col, i) => {
      const x = padX + i * (colW + colGap);
      const cx = x + colW / 2;
      colCenters[col.id] = cx;
      const isRead = step.reads.includes(col.id);
      const isWrite = step.writes.includes(col.id);
      const isBug = step.bugActive && (isRead || isWrite);

      // Brass/Teal column body
      const cGrad = ctx.createLinearGradient(x, 0, x + colW, 0);
      if (isBug && isWrite) {
        cGrad.addColorStop(0, '#881337');
        cGrad.addColorStop(0.5, '#be123c');
        cGrad.addColorStop(1, '#881337');
      } else if (isWrite) {
        cGrad.addColorStop(0, '#92400e');
        cGrad.addColorStop(0.5, '#d97706');
        cGrad.addColorStop(1, '#92400e');
      } else if (isRead) {
        cGrad.addColorStop(0, '#115e59');
        cGrad.addColorStop(0.5, '#0f766e');
        cGrad.addColorStop(1, '#115e59');
      } else if (col.group === 'result') {
        cGrad.addColorStop(0, '#2e1d4a');
        cGrad.addColorStop(0.5, '#432b6d');
        cGrad.addColorStop(1, '#2e1d4a');
      } else {
        cGrad.addColorStop(0, '#2a2012');
        cGrad.addColorStop(0.5, '#3e2f1a');
        cGrad.addColorStop(1, '#2a2012');
      }

      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.roundRect(x, storeTop + 18, colW, colH - 18, 5);
      ctx.fill();
      ctx.strokeStyle = isBug
        ? '#fda4af'
        : isWrite
          ? '#fbbf24'
          : isRead
            ? '#5eead4'
            : 'rgba(251,191,36,0.28)';
      ctx.lineWidth = isRead || isWrite ? 1.8 : 1;
      ctx.stroke();

      // Gear teeth rings on the wheel column
      const ringCount = 4;
      for (let g = 0; g < ringCount; g++) {
        const gy = storeTop + 34 + g * ((colH - 46) / Math.max(1, ringCount - 1));
        const shift = (isRead || isWrite) && !prefersReducedMotion()
          ? Math.sin(gearAngle + g * 0.9) * 2.5
          : 0;
        ctx.strokeStyle = isWrite
          ? 'rgba(254, 240, 138, 0.55)'
          : isRead
            ? 'rgba(94, 234, 212, 0.55)'
            : 'rgba(217, 119, 6, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 3 + shift, gy);
        ctx.lineTo(x + colW - 3 + shift, gy);
        ctx.stroke();
      }

      // Value Pill at top of column
      ctx.fillStyle = isWrite ? '#1c1204' : '#120e09';
      ctx.beginPath();
      ctx.roundRect(x - 1, storeTop, colW + 2, 24, 4);
      ctx.fill();
      ctx.strokeStyle = isWrite ? '#fbbf24' : isRead ? '#5eead4' : '#574429';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = isBug
        ? '#fecdd3'
        : isWrite
          ? '#fef08a'
          : isRead
            ? '#99f6e4'
            : '#f5e8ce';
      ctx.font = `700 ${colW < 22 ? 8 : colW < 34 ? 9.5 : 11}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(col.value, cx, storeTop + 12, colW - 2);

      // Register Name below column
      ctx.fillStyle = isWrite ? '#fde047' : isRead ? '#5eead4' : '#d6cbba';
      ctx.font = `700 ${colW < 22 ? 7.5 : colW < 34 ? 9 : 10.5}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(col.id, cx, storeTop + colH + 3, colW + 2);
    });

    // 3. Ingress / Egress Rails to The Mill
    const millCenter = W / 2;
    step.reads.forEach((regId) => {
      const rx = colCenters[regId];
      if (rx == null) return;
      ctx.strokeStyle = step.bugActive ? '#fda4af' : '#2dd4bf';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(rx, storeTop + colH + 14);
      ctx.lineTo(rx, railY);
      ctx.lineTo(millCenter - 36, railY);
      ctx.lineTo(millCenter - 36, millY);
      ctx.stroke();

      if (animT < 1) {
        const bx = rx + (millCenter - 36 - rx) * animT;
        ctx.fillStyle = step.bugActive ? '#ffe4e6' : '#99f6e4';
        ctx.beginPath();
        ctx.arc(bx, railY, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    step.writes.forEach((regId) => {
      const wx = colCenters[regId];
      if (wx == null) return;
      ctx.strokeStyle = step.bugActive ? '#fb7185' : '#fbbf24';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(millCenter + 36, millY);
      ctx.lineTo(millCenter + 36, railY + 4);
      ctx.lineTo(wx, railY + 4);
      ctx.lineTo(wx, storeTop + colH + 14);
      ctx.stroke();
    });

    // 4. The Mill Processor Box (bottom)
    ctx.fillStyle = '#1d160d';
    ctx.beginPath();
    ctx.roundRect(padX, millY, W - padX * 2, millH, 8);
    ctx.fill();
    ctx.strokeStyle = step.bugActive ? '#fda4af' : '#d97706';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Animated rotating cogwheels left & right inside The Mill
    const drawCog = (cx, cy, r, angle, color) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
      ctx.stroke();
      for (let t = 0; t < 8; t++) {
        const a = (t * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
        ctx.lineTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2));
        ctx.stroke();
      }
      ctx.restore();
    };
    drawCog(padX + 26, millY + millH / 2, 13, gearAngle, '#fbbf24');
    drawCog(W - padX - 26, millY + millH / 2, 13, -gearAngle, '#5eead4');

    ctx.fillStyle = step.bugActive ? '#fecdd3' : '#fef3c7';
    ctx.font = `700 ${W < 500 ? 11 : 12.5}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`THE MILL: ${step.millText}`, W / 2, millY + 19, W - 110);

    // Overwrite or Branch pill inside Mill
    let subNote = `Pass counter n = ${step.n}`;
    if (step.bugActive) subNote = step.bugNote?.message || '1843 Op 4 typo active!';
    else if (step.overwrote) {
      subNote = `Overwrite: ${step.overwrote.reg} replaced ${step.overwrote.oldVal} → ${step.overwrote.newVal}`;
    } else if (prior && step.branchTaken) {
      subNote = `Branch decision: ${step.branchTaken}`;
    }
    ctx.fillStyle = step.bugActive ? '#fda4af' : '#99f6e4';
    ctx.font = '600 10.5px sans-serif';
    ctx.fillText(subNote, W / 2, millY + 39, W - 110);
    ctx.textBaseline = 'alphabetic';
  }

  function renderEngine() {
    const step = currentTrace.steps[stepIdx] || currentTrace.steps[0];
    const prior = stepIdx > 0 ? currentTrace.steps[stepIdx - 1] : null;
    const total = currentTrace.steps.length;

    updateEngineChallenges(step);
    drawEngineFrame();

    if (backBtn) backBtn.disabled = stepIdx === 0;
    if (nextBtn) nextBtn.disabled = stepIdx >= total - 1;
    if (seekSlider) {
      seekSlider.max = String(total);
      seekSlider.value = String(stepIdx + 1);
      seekSlider.setAttribute('aria-valuetext', `Step ${stepIdx + 1} of ${total}: ${step.cardText}`);
    }

    if (hudLeft) hudLeft.textContent = `${NOTE_G_PRESETS[currentPresetId].badge} · n = ${step.n}`;
    if (hudRight) {
      hudRight.textContent = injectOp4Bug ? '1843 Op 4 Bug: ON' : 'Exact Fractions';
      hudRight.classList.toggle('is-bug', Boolean(step.bugActive || injectOp4Bug));
    }

    if (statStep) statStep.textContent = `${stepIdx + 1} / ${total}`;
    if (statOp) statOp.textContent = step.opNum === 0 ? 'Setup' : `Op ${step.opNum}`;
    if (statRead) statRead.textContent = step.reads.length ? step.reads.join(', ') : '—';
    if (statWrite) statWrite.textContent = step.writes.length ? step.writes.join(', ') : '—';

    if (narrationBox) narrationBox.classList.toggle('is-bug', Boolean(step.bugActive));
    if (phasePill) phasePill.textContent = step.phase;
    if (narrationText) narrationText.textContent = step.detail;

    // Printer Tape
    if (tapeBar) {
      if (!step.tape.length) {
        tapeBar.innerHTML = '<span>Printer tape: waiting for output…</span>';
      } else {
        tapeBar.innerHTML =
          '<span>Printer tape:</span> ' +
          step.tape
            .map(
              (t) =>
                `<span class="al-tape-chip${t.isBuggy ? ' is-bug' : ''}">${t.label} = ${t.value} <small>(mod. ${t.modernLabel})</small></span>`,
            )
            .join('');
      }
    }

    // Store Inspector Table
    if (storeBody) {
      storeBody.innerHTML = step.columns
        .map((col, idx) => {
          const prevVal = prior ? prior.columns[idx]?.value || '—' : '—';
          const isRead = step.reads.includes(col.id);
          const isWrite = step.writes.includes(col.id);
          const changed = prior && prevVal !== col.value;
          const status = isWrite && changed && prevVal !== '—'
            ? 'Overwrite'
            : isWrite
              ? 'Write'
              : isRead
                ? 'Read'
                : 'Idle';
          const cls = isWrite ? 'is-write' : isRead ? 'is-read' : '';
          return `<tr class="${cls}">
            <th scope="row">${col.id}</th>
            <td>${col.role}</td>
            <td>${col.value}</td>
            <td>${prevVal}</td>
            <td>${status}</td>
          </tr>`;
        })
        .join('');
    }

    // Highlight active 1843 Table row
    if (tableBody) {
      tableBody.querySelectorAll('[data-op-row]').forEach((tr) => {
        const match = Number(tr.dataset.opRow) === step.opNum;
        tr.classList.toggle('is-current', match);
        if (match && activeTab === 'engine') {
          tr.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    // Synchronized Python lines
    if (pythonOut) {
      pythonOut.innerHTML = step.pythonLines
        .map(
          (line, idx) =>
            `<span class="al-code-line${idx === step.pythonActiveLine ? ' is-active' : ''}">${line
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')}</span>`,
        )
        .join('');
    }
  }

  presetSelect?.addEventListener('change', (e) => loadPreset(e.target.value));
  bugToggleBtn?.addEventListener('click', () => {
    injectOp4Bug = !injectOp4Bug;
    bugToggleBtn.setAttribute('aria-pressed', String(injectOp4Bug));
    bugToggleBtn.textContent = `1843 Op 4 Bug: ${injectOp4Bug ? 'On' : 'Off'}`;
    loadPreset(currentPresetId, true);
  });
  backBtn?.addEventListener('click', () => seekEngine(stepIdx - 1));
  nextBtn?.addEventListener('click', () => seekEngine(stepIdx + 1));
  resetBtn?.addEventListener('click', () => seekEngine(0));
  playBtn?.addEventListener('click', () => (enginePlaying ? pauseEngine() : playEngine()));
  speedSelect?.addEventListener('change', () => {
    if (enginePlaying) scheduleEnginePlayback();
  });
  seekSlider?.addEventListener('input', (e) => seekEngine(Number(e.target.value) - 1));
  soundBtn?.addEventListener('click', () => {
    engineSound = !engineSound;
    soundBtn.setAttribute('aria-pressed', String(engineSound));
    soundBtn.textContent = `Sound FX: ${engineSound ? 'On' : 'Off'}`;
    if (engineSound) playTone(440, 0.08, 'triangle', 0.04);
  });
  copyPythonBtn?.addEventListener('click', () => {
    const code = (currentTrace.steps[stepIdx]?.pythonLines || []).join('\n');
    navigator.clipboard?.writeText(code).catch(() => {});
    window.LessonContent?.toast?.('Python reference copied');
  });

  inspTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.alInspTab;
      inspTabs.forEach((b) => {
        const active = b.dataset.alInspTab === target;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      inspPanels.forEach((p) => {
        p.hidden = p.dataset.alInspPanel !== target;
      });
    });
  });

  engineCanvas?.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === ' ') {
      e.preventDefault();
      enginePlaying ? pauseEngine() : playEngine();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekEngine(stepIdx + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekEngine(stepIdx - 1);
    } else if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      seekEngine(0);
    }
  });

  if (engineCanvas && window.SimKit?.canvas2d) {
    engineSim2d = window.SimKit.canvas2d(engineCanvas, {
      dpr: 2,
      onResize: () => drawEngineFrame(),
    });
    window.SimKit.loop(
      (dt) => {
        if (activeTab !== 'engine') return;
        const moving = enginePlaying || performance.now() - transitionStart < 600;
        if (moving && !prefersReducedMotion()) {
          gearAngle += dt * 2.2;
          drawEngineFrame();
        }
      },
      { el: window.SimKit.stage(engineCanvas), maxDt: 0.05 },
    );
  }

  /* ============================================================================
     TAB 2: PUNCH-CARD PROGRAMMER
     ============================================================================ */
  const cardModeDecimalBtn = document.getElementById('al-cmode-decimal');
  const cardModeBinaryBtn = document.getElementById('al-cmode-binary');
  const decimalPanel = document.getElementById('al-card-decimal-panel');
  const binaryPanel = document.getElementById('al-card-binary-panel');
  const cardTargetReg = document.getElementById('al-card-target-reg');
  const decimalGrid = document.getElementById('al-decimal-grid');
  const decimalValBadge = document.getElementById('al-decimal-val');
  const binaryHolesWrap = document.getElementById('al-binary-holes');
  const binaryPatBadge = document.getElementById('al-binary-pat');
  const binaryValBadge = document.getElementById('al-binary-val');

  const deckAddForm = document.getElementById('al-deck-form');
  const deckOpSel = document.getElementById('al-deck-op');
  const deckASel = document.getElementById('al-deck-a');
  const deckBSel = document.getElementById('al-deck-b');
  const deckDestSel = document.getElementById('al-deck-dest');
  const deckRepeatSel = document.getElementById('al-deck-repeat');
  const deckListEl = document.getElementById('al-deck-list');
  const regStripEl = document.getElementById('al-reg-strip');
  const deckStatusEl = document.getElementById('al-deck-status');
  const deckPythonEl = document.getElementById('al-deck-python');
  const deckStepBtn = document.getElementById('al-deck-step');
  const deckRunBtn = document.getElementById('al-deck-run');
  const deckResetBtn = document.getElementById('al-deck-reset');

  let deckState = {
    initialRegisters: { ...CARD_DECK_PRESETS['ticket-bill'].initialRegisters },
    cards: CARD_DECK_PRESETS['ticket-bill'].cards.map((c) => ({ ...c })),
    repeatCount: CARD_DECK_PRESETS['ticket-bill'].repeatCount,
  };
  let deckExecResult = executeCardDeck(deckState);
  let deckStepCursor = -1; // -1 = initial state before step 0
  let binaryBits = encodeBinaryCard(10);

  function renderNumberCardUI() {
    const targetReg = cardTargetReg?.value || 'V1';
    const currentVal = Number(deckState.initialRegisters[targetReg] || 0);
    const digits = encodeDecimalCard(currentVal);

    if (decimalValBadge) {
      decimalValBadge.textContent = `${targetReg} = ${decodeDecimalCard(digits)}`;
    }
    if (decimalGrid) {
      const colNames = ['Hundreds', 'Tens', 'Ones'];
      decimalGrid.innerHTML = '';
      colNames.forEach((label, colIdx) => {
        const colDiv = document.createElement('div');
        colDiv.className = 'al-dec-col';
        const title = document.createElement('span');
        title.className = 'al-dec-col-title';
        title.textContent = label;
        const btns = document.createElement('div');
        btns.className = 'al-dec-digits';
        for (let d = 0; d <= 9; d++) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `al-dec-btn${digits[colIdx] === d ? ' is-punched' : ''}`;
          b.textContent = String(d);
          b.setAttribute('aria-label', `${label} digit ${d}`);
          b.setAttribute('aria-pressed', String(digits[colIdx] === d));
          b.addEventListener('click', () => {
            const nextDigits = [...digits];
            nextDigits[colIdx] = d;
            deckState.initialRegisters[targetReg] = decodeDecimalCard(nextDigits);
            recomputeDeck(false);
            renderNumberCardUI();
            playTone(340 + d * 22, 0.06, 'triangle', 0.03);
          });
          btns.appendChild(b);
        }
        colDiv.append(title, btns);
        decimalGrid.appendChild(colDiv);
      });
    }

    if (binaryHolesWrap) {
      binaryHolesWrap.innerHTML = '';
      binaryBits.forEach((bit, idx) => {
        const col = document.createElement('div');
        col.className = 'al-bin-col';
        const wt = document.createElement('small');
        wt.textContent = String(1 << (7 - idx));
        const hole = document.createElement('button');
        hole.type = 'button';
        hole.className = `al-hole-btn${bit ? ' is-punched' : ''}`;
        hole.setAttribute('aria-label', `Bit ${1 << (7 - idx)}`);
        hole.setAttribute('aria-pressed', String(Boolean(bit)));
        hole.addEventListener('click', () => {
          binaryBits[idx] = binaryBits[idx] ? 0 : 1;
          syncBinaryToRegister();
        });
        col.append(wt, hole);
        binaryHolesWrap.appendChild(col);
      });
    }
    if (binaryPatBadge) binaryPatBadge.textContent = binaryBits.join('');
    if (binaryValBadge) {
      binaryValBadge.textContent = `Decimal: ${decodeBinaryCard(binaryBits)}`;
    }
  }

  function syncBinaryToRegister() {
    const val = decodeBinaryCard(binaryBits);
    const targetReg = cardTargetReg?.value || 'V1';
    deckState.initialRegisters[targetReg] = val;
    recomputeDeck(false);
    renderNumberCardUI();
    playTone(300 + val, 0.06, 'triangle', 0.025);
  }

  function recomputeDeck(runToEnd = false) {
    deckExecResult = executeCardDeck(deckState);
    if (runToEnd) {
      deckStepCursor = deckExecResult.steps.length - 1;
      markChallenge('program-mill');
    } else {
      deckStepCursor = -1;
    }
    renderDeckUI();
  }

  function renderDeckUI() {
    const activeStep =
      deckStepCursor >= 0 ? deckExecResult.steps[deckStepCursor] : null;
    const shownRegs = activeStep
      ? activeStep.registers
      : deckExecResult.initialRegisters;
    const writtenReg = activeStep ? activeStep.dest : null;

    if (regStripEl) {
      regStripEl.innerHTML = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
        .map(
          (id) => `<div class="al-reg-box${writtenReg === id ? ' is-write' : ''}">
            <span>${id}</span><strong>${shownRegs[id]}</strong>
          </div>`,
        )
        .join('');
    }

    if (deckRepeatSel) deckRepeatSel.value = String(deckState.repeatCount);

    if (deckListEl) {
      if (!deckState.cards.length) {
        deckListEl.innerHTML =
          '<p class="al-narration-text">Deck empty. Add an Operation Card above or pick a starter deck.</p>';
      } else {
        deckListEl.innerHTML = '';
        deckState.cards.forEach((card, idx) => {
          const item = document.createElement('div');
          const isActive = activeStep && activeStep.cardIndex === idx;
          item.className = `al-deck-item${isActive ? ' is-active' : ''}`;
          const sym = card.op === '*' ? '×' : card.op === '/' ? '÷' : card.op === '-' ? '−' : '+';
          const code = document.createElement('span');
          code.className = 'al-deck-code';
          code.textContent = `${idx + 1}. ${card.dest} ← ${card.a} ${sym} ${card.b}`;

          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'al-mini-btn';
          del.textContent = '✕';
          del.setAttribute('aria-label', `Remove card ${idx + 1}`);
          del.addEventListener('click', () => {
            deckState.cards.splice(idx, 1);
            recomputeDeck(false);
          });

          item.append(code, del);
          deckListEl.appendChild(item);
        });
      }
    }

    if (deckStatusEl) {
      if (activeStep) {
        deckStatusEl.textContent = activeStep.error
          ? activeStep.error
          : `Pass ${activeStep.pass}/${deckExecResult.repeatCount} · Card ${activeStep.cardIndex + 1}: ${activeStep.calcText}`;
      } else if (!deckState.cards.length) {
        deckStatusEl.textContent = 'Add cards or load a preset deck, then press Step or Run Deck.';
      } else {
        deckStatusEl.textContent = `Ready · ${deckState.cards.length} card(s) × ${deckState.repeatCount} pass(es).`;
      }
    }

    if (deckPythonEl) {
      deckPythonEl.textContent = generateDeckPython(deckState);
    }
  }

  cardModeDecimalBtn?.addEventListener('click', () => {
    cardModeDecimalBtn.classList.add('is-active');
    cardModeDecimalBtn.setAttribute('aria-selected', 'true');
    cardModeBinaryBtn?.classList.remove('is-active');
    cardModeBinaryBtn?.setAttribute('aria-selected', 'false');
    if (decimalPanel) decimalPanel.hidden = false;
    if (binaryPanel) binaryPanel.hidden = true;
  });

  cardModeBinaryBtn?.addEventListener('click', () => {
    cardModeBinaryBtn.classList.add('is-active');
    cardModeBinaryBtn.setAttribute('aria-selected', 'true');
    cardModeDecimalBtn?.classList.remove('is-active');
    cardModeDecimalBtn?.setAttribute('aria-selected', 'false');
    if (binaryPanel) binaryPanel.hidden = false;
    if (decimalPanel) decimalPanel.hidden = true;
    binaryBits = encodeBinaryCard(
      Number(deckState.initialRegisters[cardTargetReg?.value || 'V1'] || 0),
    );
    renderNumberCardUI();
  });

  cardTargetReg?.addEventListener('change', () => {
    binaryBits = encodeBinaryCard(
      Number(deckState.initialRegisters[cardTargetReg.value] || 0),
    );
    renderNumberCardUI();
  });

  document.querySelectorAll('[data-bin-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.binPreset;
      const val = kind === 'random' ? Math.floor(Math.random() * 256) : Number(kind);
      binaryBits = encodeBinaryCard(val);
      syncBinaryToRegister();
    });
  });

  document.querySelectorAll('[data-deck-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deckPreset;
      if (id === 'clear') {
        deckState.cards = [];
        deckState.repeatCount = 1;
      } else if (CARD_DECK_PRESETS[id]) {
        const p = CARD_DECK_PRESETS[id];
        deckState = {
          initialRegisters: { ...p.initialRegisters },
          cards: p.cards.map((c) => ({ ...c })),
          repeatCount: p.repeatCount,
        };
      }
      renderNumberCardUI();
      recomputeDeck(false);
    });
  });

  deckAddForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    deckState.cards.push({
      op: deckOpSel?.value || '+',
      a: deckASel?.value || 'V1',
      b: deckBSel?.value || 'V2',
      dest: deckDestSel?.value || 'V4',
    });
    recomputeDeck(false);
  });

  deckRepeatSel?.addEventListener('change', () => {
    deckState.repeatCount = Number(deckRepeatSel.value || 1);
    recomputeDeck(false);
  });

  deckStepBtn?.addEventListener('click', () => {
    if (!deckExecResult.steps.length) return;
    deckStepCursor =
      deckStepCursor >= deckExecResult.steps.length - 1 ? 0 : deckStepCursor + 1;
    markChallenge('program-mill');
    renderDeckUI();
    playTone(380, 0.08, 'triangle', 0.035);
  });

  deckRunBtn?.addEventListener('click', () => {
    if (!deckExecResult.steps.length) return;
    deckStepCursor = deckExecResult.steps.length - 1;
    markChallenge('program-mill');
    renderDeckUI();
    playTone(540, 0.14, 'sine', 0.045);
  });

  deckResetBtn?.addEventListener('click', () => {
    deckStepCursor = -1;
    renderDeckUI();
  });

  /* ============================================================================
     TAB 3: POETICAL SCIENCE JACQUARD LOOM
     ============================================================================ */
  const loomMatrixEl = document.getElementById('al-loom-matrix');
  const loomCanvas = document.getElementById('al-loom-canvas');
  const loomPlayBtn = document.getElementById('al-loom-play');
  const loomTempoSel = document.getElementById('al-loom-tempo');
  const loomMuteBtn = document.getElementById('al-loom-mute');
  const encBinEl = document.getElementById('al-enc-binary');
  const encDecEl = document.getElementById('al-enc-decimal');
  const encNotesEl = document.getElementById('al-enc-notes');
  const encHeddlesEl = document.getElementById('al-enc-heddles');

  let loomGrid = cloneLoomGrid('victorian-chime');
  let loomBeat = 0;
  let loomPlaying = false;
  let loomMuted = false;
  let loomTimer = null;
  let loomSim2d = null;
  let shuttleProgress = 0;

  function updateLoomEncoding(col) {
    const info = encodeLoomColumn(loomGrid, col);
    if (encBinEl) encBinEl.textContent = info.binary;
    if (encDecEl) encDecEl.textContent = String(info.decimal);
    if (encNotesEl) {
      encNotesEl.textContent = info.activeNotes.length
        ? info.activeNotes.join(' + ')
        : 'Rest';
    }
    if (encHeddlesEl) {
      encHeddlesEl.textContent = info.liftedHeddles.length
        ? `#${info.liftedHeddles.join(', #')}`
        : 'None';
    }
  }

  function renderLoomMatrix() {
    if (!loomMatrixEl) return;
    loomMatrixEl.innerHTML = '';

    const corner = document.createElement('span');
    corner.className = 'al-matrix-colhead';
    corner.textContent = 'Note';
    loomMatrixEl.appendChild(corner);

    for (let c = 0; c < LOOM_COLS; c++) {
      const head = document.createElement('span');
      head.className = `al-matrix-colhead${c === loomBeat ? ' is-beat' : ''}`;
      head.textContent = `B${c + 1}`;
      loomMatrixEl.appendChild(head);
    }

    LOOM_NOTES.forEach((note, r) => {
      const lbl = document.createElement('span');
      lbl.className = 'al-matrix-rowlabel';
      lbl.textContent = note.name;
      loomMatrixEl.appendChild(lbl);

      for (let c = 0; c < LOOM_COLS; c++) {
        const on = Boolean(loomGrid[r][c]);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `al-loom-cell${on ? ' is-punched' : ''}${c === loomBeat ? ' is-beat' : ''}`;
        btn.textContent = on ? '●' : '○';
        btn.setAttribute('aria-label', `${note.name} beat ${c + 1}`);
        btn.setAttribute('aria-pressed', String(on));
        btn.addEventListener('click', () => {
          loomGrid[r][c] = on ? 0 : 1;
          loomBeat = c;
          if (!on && !loomMuted) playTone(note.freq, 0.3, 'sine', 0.06);
          markChallenge('weave-music');
          renderLoomMatrix();
          updateLoomEncoding(loomBeat);
          drawLoomCanvas();
        });
        loomMatrixEl.appendChild(btn);
      }
    });
  }

  function drawLoomCanvas() {
    if (!loomCanvas) return;
    const ctx = loomCanvas.getContext('2d');
    const W = loomSim2d ? loomSim2d.width : loomCanvas.clientWidth || 560;
    const H = loomSim2d ? loomSim2d.height : loomCanvas.clientHeight || 240;
    if (!loomSim2d) {
      loomCanvas.width = W;
      loomCanvas.height = H;
    }

    ctx.fillStyle = '#120e09';
    ctx.fillRect(0, 0, W, H);

    const padX = 18;
    const padY = 22;
    const weaveW = W - padX * 2;
    const weaveH = H - padY * 2;
    const colW = weaveW / LOOM_COLS;
    const rowH = weaveH / LOOM_NOTES.length;

    // Vertical warp threads
    ctx.strokeStyle = 'rgba(247, 241, 227, 0.16)';
    ctx.lineWidth = 1.5;
    for (let x = padX + 8; x < W - padX; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, padY);
      ctx.lineTo(x, H - padY);
      ctx.stroke();
    }

    // Active beat column highlight
    ctx.fillStyle = 'rgba(124, 58, 237, 0.18)';
    ctx.fillRect(padX + loomBeat * colW, padY - 4, colW, weaveH + 8);

    // Horizontal weft threads woven per punched card column
    LOOM_NOTES.forEach((note, r) => {
      const y = padY + r * rowH + rowH / 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(W - padX, y);
      ctx.stroke();

      for (let c = 0; c < LOOM_COLS; c++) {
        if (!loomGrid[r][c]) continue;
        const x0 = padX + c * colW + 4;
        const wCell = colW - 8;
        ctx.fillStyle = note.color;
        ctx.beginPath();
        ctx.roundRect(x0, y - rowH * 0.28, wCell, rowH * 0.56, 5);
        ctx.fill();

        // Interwoven warp thread accents & gold brocade nodes
        ctx.strokeStyle = 'rgba(255, 248, 225, 0.32)';
        ctx.lineWidth = 1.4;
        for (let wx = x0 + 9; wx < x0 + wCell - 4; wx += 14) {
          ctx.beginPath();
          ctx.moveTo(wx, y - rowH * 0.28);
          ctx.lineTo(wx, y + rowH * 0.28);
          ctx.stroke();
        }
        ctx.fillStyle = c === loomBeat ? '#fef08a' : 'rgba(254, 243, 199, 0.8)';
        ctx.beginPath();
        ctx.arc(x0 + wCell / 2, y, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Gold brocade highlight when active beat passes
        if (c === loomBeat) {
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.8;
          ctx.strokeRect(x0, y - rowH * 0.28, wCell, rowH * 0.56);
        }
      }

      ctx.fillStyle = '#e7decb';
      ctx.font = '700 9.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(note.name, 4, y);
    });

    // Animated wooden shuttle
    if (loomPlaying && !prefersReducedMotion()) {
      const sx = padX + shuttleProgress * weaveW;
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(sx, H - 10, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textBaseline = 'alphabetic';
  }

  function playLoomBeat(col) {
    if (!loomMuted) {
      LOOM_NOTES.forEach((note, r) => {
        if (loomGrid[r][col]) playTone(note.freq, 0.35, 'sine', 0.05);
      });
    }
    updateLoomEncoding(col);
    renderLoomMatrix();
    drawLoomCanvas();
  }

  function stopLoomPlayback() {
    if (loomTimer) {
      clearInterval(loomTimer);
      loomTimer = null;
    }
    loomPlaying = false;
    if (loomPlayBtn) {
      loomPlayBtn.textContent = '▶ Play & Weave';
      loomPlayBtn.setAttribute('aria-pressed', 'false');
    }
    drawLoomCanvas();
  }

  function startLoomPlayback() {
    stopLoomPlayback();
    loomPlaying = true;
    markChallenge('weave-music');
    if (loomPlayBtn) {
      loomPlayBtn.textContent = '■ Stop';
      loomPlayBtn.setAttribute('aria-pressed', 'true');
    }
    const bpm = Number(loomTempoSel?.value || 120);
    const intervalMs = Math.round(60000 / (bpm * 2));
    playLoomBeat(loomBeat);
    loomTimer = setInterval(() => {
      loomBeat = (loomBeat + 1) % LOOM_COLS;
      playLoomBeat(loomBeat);
    }, intervalMs);
  }

  loomPlayBtn?.addEventListener('click', () => {
    if (loomPlaying) stopLoomPlayback();
    else startLoomPlayback();
  });

  loomTempoSel?.addEventListener('change', () => {
    if (loomPlaying) startLoomPlayback();
  });

  loomMuteBtn?.addEventListener('click', () => {
    loomMuted = !loomMuted;
    loomMuteBtn.setAttribute('aria-pressed', String(loomMuted));
    loomMuteBtn.textContent = loomMuted ? 'Muted' : 'Audio: On';
  });

  document.querySelectorAll('[data-loom-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.loomPreset;
      loomGrid = cloneLoomGrid(id);
      loomBeat = 0;
      if (id !== 'clear') markChallenge('weave-music');
      renderLoomMatrix();
      updateLoomEncoding(0);
      drawLoomCanvas();
    });
  });

  if (loomCanvas && window.SimKit?.canvas2d) {
    loomSim2d = window.SimKit.canvas2d(loomCanvas, {
      dpr: 2,
      onResize: () => drawLoomCanvas(),
    });
    window.SimKit.loop(
      (dt) => {
        if (activeTab !== 'loom' || !loomPlaying || prefersReducedMotion()) return;
        shuttleProgress = (shuttleProgress + dt * 1.4) % 1;
        drawLoomCanvas();
      },
      { el: window.SimKit.stage(loomCanvas), maxDt: 0.05 },
    );
  }

  /* ============================================================================
     UNSPOILED TRACE EXERCISE (Warm-Up + 1843 Note G Bug Hunt)
     ============================================================================ */
  const traceTabs = [...document.querySelectorAll('[data-trace-mode]')];
  const traceGiven = document.getElementById('al-trace-given');
  const traceBody = document.getElementById('al-trace-tbody');
  const traceFeedback = document.getElementById('al-trace-feedback');
  const traceBreakdown = document.getElementById('al-trace-breakdown');
  const traceCheckBtn = document.getElementById('al-trace-check');
  const traceRevealBtn = document.getElementById('al-trace-reveal');
  const traceResetBtn = document.getElementById('al-trace-reset');

  let activeTraceMode = 'warmup-overwrite';

  function renderTraceTable() {
    const ex = TRACE_EXERCISES[activeTraceMode];
    if (!ex || !traceBody) return;

    if (traceGiven) {
      traceGiven.innerHTML =
        activeTraceMode === 'warmup-overwrite'
          ? '<span>V1 = 10</span><span>V2 = 4</span><span>V3 = 6</span>'
          : '<span>V1 = 1</span><span>V2 = 2</span><span>V3 = 4 (n)</span><span>V13 starts at 0</span>';
    }

    traceBody.innerHTML = ex.rows
      .map(
        (row, idx) => `<tr>
          <td><strong>${row.step}</strong></td>
          <td><code>${row.op}</code></td>
          <td><code>${row.dest}</code></td>
          <td>
            <input
              type="text"
              inputmode="text"
              class="al-trace-input"
              data-trace-idx="${idx}"
              placeholder="?"
              aria-label="${row.step} result for ${row.dest}"
            />
          </td>
        </tr>`,
      )
      .join('');

    if (traceFeedback) traceFeedback.textContent = '';
    if (traceBreakdown) traceBreakdown.innerHTML = '';
  }

  traceTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTraceMode = btn.dataset.traceMode;
      traceTabs.forEach((b) => {
        const on = b.dataset.traceMode === activeTraceMode;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      renderTraceTable();
    });
  });

  traceCheckBtn?.addEventListener('click', () => {
    const inputs = [...document.querySelectorAll('.al-trace-input')];
    const submitted = inputs.map((el) => el.value);
    const report = checkTraceSubmission(activeTraceMode, submitted);

    inputs.forEach((el, idx) => {
      const ok = report.results[idx].ok;
      el.classList.toggle('is-ok', ok);
      el.classList.toggle('is-bad', !ok);
    });

    if (traceFeedback) {
      traceFeedback.className = `al-feedback ${report.allCorrect ? 'ok' : 'err'}`;
      traceFeedback.textContent = report.allCorrect
        ? `✓ All ${report.total} correct!`
        : `${report.correctCount} / ${report.total} correct — check highlighted rows.`;
    }
    if (traceBreakdown) {
      const wrong = report.results.filter((r) => !r.ok);
      traceBreakdown.innerHTML = wrong.length
        ? wrong.map((w) => `<p>${w.step}: ${w.hint}</p>`).join('')
        : '<p>Every register value matches exact execution!</p>';
    }
  });

  traceRevealBtn?.addEventListener('click', () => {
    const ex = TRACE_EXERCISES[activeTraceMode];
    const inputs = [...document.querySelectorAll('.al-trace-input')];
    inputs.forEach((el, idx) => {
      el.value = ex.rows[idx].answer.den === 1n
        ? String(ex.rows[idx].answer.num)
        : `${ex.rows[idx].answer.num}/${ex.rows[idx].answer.den}`;
      el.classList.remove('is-bad');
      el.classList.add('is-ok');
    });
    if (traceFeedback) {
      traceFeedback.className = 'al-feedback';
      traceFeedback.textContent = 'Answers shown.';
    }
    if (traceBreakdown) {
      traceBreakdown.innerHTML = ex.rows.map((r) => `<p>${r.step}: ${r.hint}</p>`).join('');
    }
  });

  traceResetBtn?.addEventListener('click', () => renderTraceTable());

  /* ============================================================================
     PRACTICE & DEBUGGING CHECKER
     ============================================================================ */
  const hintsToggle = document.getElementById('al-hints-toggle');
  const scoreBadge = document.getElementById('al-practice-score');
  const solvedQuestions = new Set();

  hintsToggle?.addEventListener('change', (e) => {
    document.body.classList.toggle('al-show-hints', e.target.checked);
  });

  document.querySelectorAll('.al-practice button[data-check]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      const type = btn.dataset.check;
      const ans = btn.dataset.ans;
      const input = document.getElementById(`alans-${q}`);
      const fb = document.getElementById(`alfb-${q}`);
      const hint = document.getElementById(`alhint-${q}`);
      if (!input || !fb) return;

      let ok = false;
      if (type === 'num') {
        const val = parseFloat(input.value);
        const tol = parseFloat(btn.dataset.tol || '0');
        if (Number.isNaN(val)) {
          fb.textContent = 'Enter a number.';
          fb.className = 'al-feedback err';
          return;
        }
        ok = Math.abs(val - parseFloat(ans)) <= tol;
      } else {
        ok = input.value.trim().toLowerCase() === ans.toLowerCase();
      }

      if (ok) {
        fb.textContent = '✓ Correct!';
        fb.className = 'al-feedback ok';
        solvedQuestions.add(q);
      } else {
        fb.textContent = '✗ Try again.';
        fb.className = 'al-feedback err';
        if (hint) hint.style.display = 'block';
      }

      if (scoreBadge) {
        scoreBadge.textContent = `Completed: ${solvedQuestions.size} / 9`;
      }
    });
  });

  /* ── Initial Render ──────────────────────────────────────────────────────── */
  renderChallenges();
  renderStatic1843Table();
  renderEngine();
  renderNumberCardUI();
  renderDeckUI();
  renderLoomMatrix();
  updateLoomEncoding(0);
  drawLoomCanvas();
  renderTraceTable();
})();
