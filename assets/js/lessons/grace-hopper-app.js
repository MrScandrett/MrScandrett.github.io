import {
  CHALLENGES,
  COBOL_PRESETS,
  COBOL_PRESET_ORDER,
  MARK_II_CASES,
  MARK_II_CASE_ORDER,
  SIGNAL_MEDIA,
  TRACE_EXERCISES,
  WIRE_PRESETS,
  WIRE_PRESET_ORDER,
  checkTraceSubmission,
  compileCobol,
  computeSignalPhysics,
  evaluateChallenges,
  executeCompiledProgram,
  formatDistance,
  formatDurationNs,
  simulateMarkIIRelays,
} from './grace-hopper-engine.js';

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

  function playTone(freq, duration = 0.1, type = 'triangle', gainPeak = 0.04) {
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

  /* ── Toast & Mastery Challenges ──────────────────────────────────────────── */
  const toastEl = document.getElementById('gh-toast');
  let toastTimer = null;
  function showToast(msg) {
    if (window.LessonContent?.toast) {
      window.LessonContent.toast(msg);
    }
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 3200);
  }

  const challengeProgress = {};
  const challengePill = document.getElementById('gh-challenge-pill');
  const challengeDrawer = document.getElementById('gh-challenges-drawer');
  const challengeList = document.getElementById('gh-challenges-list');
  const challengeCloseBtn = document.getElementById('gh-challenges-close');

  const modeTabs = [...document.querySelectorAll('[data-gh-tab]')];
  const modePanels = [...document.querySelectorAll('[data-gh-panel]')];
  let activeTab = 'compiler';

  let compilerSim2d = null;
  let wireSim2d = null;
  let bugSim2d = null;

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
      card.className = `gh-challenge-item${item.completed ? ' is-done' : ''}`;

      const top = document.createElement('div');
      top.className = 'gh-challenge-top';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const badge = document.createElement('span');
      badge.className = 'gh-challenge-state';
      badge.textContent = item.completed ? 'Done ✓' : 'Try it';
      top.append(title, badge);

      const desc = document.createElement('p');
      desc.textContent = item.description;

      const goBtn = document.createElement('button');
      goBtn.type = 'button';
      goBtn.className = 'gh-mini-btn';
      goBtn.textContent = item.completed ? 'Revisit workspace' : 'Go to workspace →';
      goBtn.addEventListener('click', () => {
        switchModeTab(item.tab);
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
      showToast(`✓ Challenge complete: ${ch.title}`);
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

  function resizeAllCanvases() {
    compilerSim2d?.resize();
    wireSim2d?.resize();
    bugSim2d?.resize();
  }

  function switchModeTab(tabId) {
    activeTab = tabId;
    modeTabs.forEach((btn) => {
      const isMatch = btn.dataset.ghTab === tabId;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-selected', String(isMatch));
      btn.tabIndex = isMatch ? 0 : -1;
    });
    modePanels.forEach((panel) => {
      panel.hidden = panel.dataset.ghPanel !== tabId;
    });
    if (tabId !== 'compiler') pauseCompilerPlayback();
    requestAnimationFrame(() => {
      resizeAllCanvases();
      window.dispatchEvent(new Event('resize'));
    });
  }

  modeTabs.forEach((btn, idx) => {
    btn.addEventListener('click', () => switchModeTab(btn.dataset.ghTab));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const nextIdx =
          e.key === 'ArrowRight'
            ? (idx + 1) % modeTabs.length
            : (idx - 1 + modeTabs.length) % modeTabs.length;
        modeTabs[nextIdx].focus();
        switchModeTab(modeTabs[nextIdx].dataset.ghTab);
      }
    });
  });

  document.addEventListener('creation-app-resize', () => {
    requestAnimationFrame(resizeAllCanvases);
  });

  /* ============================================================================
     TAB 1: FLOW-MATIC / COBOL MINI-COMPILER & CPU LAB
     ============================================================================ */
  const compilerCanvas = document.getElementById('gh-compiler-canvas');
  const presetSelect = document.getElementById('gh-preset-select');
  const compileBtn = document.getElementById('gh-compile-btn');
  const backBtn = document.getElementById('gh-back');
  const playBtn = document.getElementById('gh-play');
  const nextBtn = document.getElementById('gh-next');
  const resetBtn = document.getElementById('gh-reset');
  const bugToggleBtn = document.getElementById('gh-bug-toggle');
  const soundBtn = document.getElementById('gh-sound-toggle');
  const seekSlider = document.getElementById('gh-seek');

  const hudLeft = document.getElementById('gh-hud-left');
  const hudRight = document.getElementById('gh-hud-right');
  const statStage = document.getElementById('gh-stat-stage');
  const statRegs = document.getElementById('gh-stat-regs');
  const statBus = document.getElementById('gh-stat-bus');
  const statOut = document.getElementById('gh-stat-out');

  const codeEditor = document.getElementById('gh-code-editor');
  const editorStatus = document.getElementById('gh-editor-status');
  const errorBanner = document.getElementById('gh-compile-errors');
  const narrationBox = document.getElementById('gh-narration-box');
  const phasePill = document.getElementById('gh-phase-pill');
  const narrationText = document.getElementById('gh-narration-text');
  const teletypeBar = document.getElementById('gh-teletype-bar');

  const asmBody = document.getElementById('gh-asm-tbody');
  const binBody = document.getElementById('gh-bin-tbody');
  const symBody = document.getElementById('gh-sym-tbody');
  const pythonOut = document.getElementById('gh-python-out');
  const copyPythonBtn = document.getElementById('gh-copy-python');

  const inspTabs = [...document.querySelectorAll('[data-gh-insp-tab]')];
  const inspPanels = [...document.querySelectorAll('[data-gh-insp-panel]')];

  let currentPresetId = 'payroll';
  let injectHandCodeBug = false;
  let compiledProg = compileCobol(COBOL_PRESETS.payroll.source, { injectHandCodeBug });
  let execResult = executeCompiledProgram(compiledProg);
  let stepIdx = 0;
  let compilerPlaying = false;
  let compilerTimer = null;
  let compilerSound = false;
  let compilerAnimStart = -Infinity;
  let pulsePhase = 0;

  if (presetSelect) {
    COBOL_PRESET_ORDER.forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = COBOL_PRESETS[id].title;
      presetSelect.appendChild(opt);
    });
    presetSelect.value = currentPresetId;
  }

  if (codeEditor) {
    codeEditor.value = COBOL_PRESETS[currentPresetId].source;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function pauseCompilerPlayback() {
    if (compilerTimer) {
      clearInterval(compilerTimer);
      compilerTimer = null;
    }
    compilerPlaying = false;
    if (playBtn) {
      playBtn.textContent = 'Play';
      playBtn.setAttribute('aria-pressed', 'false');
    }
  }

  function playCompilerSound(step) {
    if (!compilerSound || !step) return;
    if (step.bugActive || step.runtimeError) playTone(150, 0.16, 'sawtooth', 0.04);
    else if (step.output.length && step.phase.includes('PRINT')) playTone(680, 0.14, 'sine', 0.045);
    else playTone(290 + (step.stepIndex % 6) * 35, 0.07, 'triangle', 0.028);
  }

  function startCompilerPlayback() {
    if (compilerPlaying || !compiledProg.ok) return;
    if (stepIdx >= execResult.steps.length - 1) stepIdx = 0;
    compilerPlaying = true;
    if (playBtn) {
      playBtn.textContent = 'Pause';
      playBtn.setAttribute('aria-pressed', 'true');
    }
    compilerTimer = setInterval(() => {
      if (stepIdx < execResult.steps.length - 1) {
        stepIdx += 1;
        compilerAnimStart = performance.now();
        playCompilerSound(execResult.steps[stepIdx]);
        renderCompiler();
      } else {
        pauseCompilerPlayback();
        renderCompiler();
      }
    }, 850);
    renderCompiler();
  }

  function seekCompiler(nextIdx) {
    pauseCompilerPlayback();
    if (!execResult.steps.length) return;
    stepIdx = Math.max(0, Math.min(execResult.steps.length - 1, nextIdx));
    compilerAnimStart = performance.now();
    playCompilerSound(execResult.steps[stepIdx]);
    renderCompiler();
  }

  function runCompile(fromUserEdit = false, preserveStep = false) {
    pauseCompilerPlayback();
    const src = codeEditor ? codeEditor.value : COBOL_PRESETS[currentPresetId].source;
    const candidate = compileCobol(src, { injectHandCodeBug });
    compiledProg = candidate;

    if (!candidate.ok) {
      execResult = { ok: false, steps: [], output: [], runtimeError: null };
      if (errorBanner) {
        const firstErr = candidate.errors[0];
        errorBanner.innerHTML = `<strong>Line ${firstErr.line}:</strong> ${escapeHtml(firstErr.message)} <em>${escapeHtml(firstErr.hint)}</em>`;
        errorBanner.hidden = false;
      }
      if (editorStatus) editorStatus.textContent = `${candidate.errors.length} error(s)`;
      renderCompiler();
      return;
    }

    if (errorBanner) errorBanner.hidden = true;
    if (editorStatus) {
      editorStatus.textContent = `${candidate.instructions.length} instructions · ${candidate.symbolTable.length} vars`;
    }

    execResult = executeCompiledProgram(candidate);
    stepIdx = preserveStep
      ? Math.min(stepIdx, Math.max(0, execResult.steps.length - 1))
      : fromUserEdit
        ? Math.max(0, execResult.steps.length - 1)
        : 0;

    if (fromUserEdit) {
      const presetSrc = COBOL_PRESETS[currentPresetId]?.source.trim();
      if (src.trim() !== presetSrc) {
        markChallenge('edit-cobol');
      }
      markChallenge('compile-run');
    }
    if (injectHandCodeBug && candidate.bugSummary) {
      markChallenge('catch-handcode-bug');
    }

    compilerAnimStart = performance.now();
    renderCompiler();
  }

  function drawCompilerFrame() {
    if (!compilerCanvas) return;
    const ctx = compilerCanvas.getContext('2d');
    const W = compilerSim2d ? compilerSim2d.width : compilerCanvas.clientWidth || 640;
    const H = compilerSim2d ? compilerSim2d.height : compilerCanvas.clientHeight || 310;
    if (!compilerSim2d) {
      compilerCanvas.width = W;
      compilerCanvas.height = H;
    }

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#101a2e');
    bg.addColorStop(1, '#070c17');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (!compiledProg.ok) {
      ctx.fillStyle = '#fda4af';
      ctx.font = '700 13px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Compiler halted — fix syntax in the COBOL editor →', W / 2, H / 2);
      return;
    }

    const step = execResult.steps[stepIdx] || execResult.steps[0];
    const insn = step.insnIndex >= 0 ? compiledProg.instructions[step.insnIndex] : null;
    const padX = 12;
    const topY = 28;

    // 1. Source Statement Banner
    const bannerH = 30;
    ctx.fillStyle = step.bugActive ? '#4c0519' : '#0f1d35';
    ctx.beginPath();
    ctx.roundRect(padX, topY, W - padX * 2, bannerH, 6);
    ctx.fill();
    ctx.strokeStyle = step.bugActive ? '#fda4af' : '#38bdf8';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = step.bugActive ? '#ffe4e6' : '#e0f2fe';
    ctx.font = `700 ${W < 480 ? 10.5 : 12}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bannerTxt = insn
      ? `LINE ${insn.sourceLine}: ${insn.sourceText}  →  ${insn.opcode} ${insn.operands}`
      : `${step.phase}: ${compiledProg.statements.length} statements → ${compiledProg.instructions.length} instructions`;
    ctx.fillText(bannerTxt, W / 2, topY + bannerH / 2, W - padX * 2 - 16);

    // 2. Memory Slots (Symbol Table Columns)
    const memEntries = Object.entries(step.memory);
    const memTop = topY + bannerH + 16;
    const memH = 54;
    const maxSlots = Math.min(6, Math.max(1, memEntries.length));
    const slotGap = 6;
    const availW = W - padX * 2;
    const slotW = (availW - slotGap * (maxSlots - 1)) / maxSlots;
    const slotCenters = {};

    memEntries.slice(0, maxSlots).forEach(([addr, info], idx) => {
      const sx = padX + idx * (slotW + slotGap);
      const cx = sx + slotW / 2;
      slotCenters[addr] = cx;
      const isRead = step.readAddr === addr;
      const isWrite = step.writeAddr === addr;
      const isBugSlot = step.bugActive && isRead;

      ctx.fillStyle = isBugSlot
        ? '#4c0519'
        : isWrite
          ? '#451a03'
          : isRead
            ? '#134e4a'
            : '#111b2e';
      ctx.beginPath();
      ctx.roundRect(sx, memTop, slotW, memH, 7);
      ctx.fill();
      ctx.strokeStyle = isBugSlot
        ? '#fda4af'
        : isWrite
          ? '#fbbf24'
          : isRead
            ? '#5eead4'
            : 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = isRead || isWrite ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = '#93c5fd';
      ctx.font = `700 ${slotW < 85 ? 8.5 : 9.5}px ui-monospace, monospace`;
      ctx.fillText(addr, cx, memTop + 12, slotW - 6);

      ctx.fillStyle = '#f8fafc';
      ctx.font = `800 ${slotW < 85 ? 11 : 13}px ui-monospace, monospace`;
      ctx.fillText(String(info.value), cx, memTop + 30, slotW - 6);

      ctx.fillStyle = isWrite ? '#fde68a' : isRead ? '#5eead4' : '#cbd5e1';
      ctx.font = `700 ${slotW < 85 ? 8.5 : 9.5}px sans-serif`;
      ctx.fillText(info.name, cx, memTop + 45, slotW - 6);
    });

    // 3. UNIVAC CPU & ALU Box
    const cpuTop = memTop + memH + 26;
    const outH = 34;
    const outY = H - outH - 10;
    const cpuH = Math.max(66, outY - cpuTop - 10);

    // Draw data bus lines between memory and CPU
    const busY = memTop + memH + 12;
    const animT = prefersReducedMotion()
      ? 1
      : Math.min(1, (performance.now() - compilerAnimStart) / 480);

    if (step.readAddr && slotCenters[step.readAddr] !== undefined) {
      const rx = slotCenters[step.readAddr];
      ctx.strokeStyle = step.bugActive ? '#fda4af' : '#2dd4bf';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx, memTop + memH);
      ctx.lineTo(rx, busY);
      ctx.lineTo(W / 2 - 42, busY);
      ctx.lineTo(W / 2 - 42, cpuTop);
      ctx.stroke();

      if (animT < 1) {
        const px = rx + (W / 2 - 42 - rx) * animT;
        ctx.fillStyle = step.bugActive ? '#ffe4e6' : '#99f6e4';
        ctx.beginPath();
        ctx.arc(px, busY, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (step.writeAddr && slotCenters[step.writeAddr] !== undefined) {
      const wx = slotCenters[step.writeAddr];
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2 + 42, cpuTop);
      ctx.lineTo(W / 2 + 42, busY + 4);
      ctx.lineTo(wx, busY + 4);
      ctx.lineTo(wx, memTop + memH);
      ctx.stroke();

      if (animT < 1) {
        const px = W / 2 + 42 + (wx - (W / 2 + 42)) * animT;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(px, busY + 4, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#111b2e';
    ctx.beginPath();
    ctx.roundRect(padX, cpuTop, W - padX * 2, cpuH, 9);
    ctx.fill();
    ctx.strokeStyle = step.bugActive ? '#fda4af' : '#2dd4bf';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // CPU Registers pills
    const regItems = [
      { label: 'R1 (Acc)', val: String(step.regs.R1), col: '#5eead4' },
      { label: 'R2 (ALU)', val: String(step.regs.R2), col: '#7dd3fc' },
      { label: 'PC', val: insn ? `#${insn.index}` : '—', col: '#fde68a' },
      { label: 'FLAGS', val: step.regs.FLAGS, col: '#c4b5fd' },
    ];
    const regGap = 8;
    const regW = Math.min(130, (W - padX * 2 - 24 - regGap * 3) / 4);
    const totalRegW = regW * 4 + regGap * 3;
    const regStartX = (W - totalRegW) / 2;

    regItems.forEach((r, idx) => {
      const rx = regStartX + idx * (regW + regGap);
      const ry = cpuTop + 10;
      const rh = Math.min(44, cpuH - 20);
      ctx.fillStyle = '#080e1a';
      ctx.beginPath();
      ctx.roundRect(rx, ry, regW, rh, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 9px sans-serif';
      ctx.fillText(r.label, rx + regW / 2, ry + 12);

      ctx.fillStyle = r.col;
      ctx.font = '800 12px ui-monospace, monospace';
      ctx.fillText(r.val, rx + regW / 2, ry + rh - 12);
    });

    if (cpuH > 80) {
      ctx.fillStyle = step.bugActive ? '#fda4af' : '#94a3b8';
      ctx.font = '600 10.5px ui-monospace, monospace';
      ctx.fillText(
        insn ? `32-bit word: ${insn.binary}` : 'A-0 / FLOW-MATIC compiler pipeline active',
        W / 2,
        cpuTop + cpuH - 12,
        W - padX * 2 - 20,
      );
    }

    // 4. Teletype Output Strip (Bottom)
    ctx.fillStyle = '#0d1525';
    ctx.beginPath();
    ctx.roundRect(padX, outY, W - padX * 2, outH, 7);
    ctx.fill();
    ctx.strokeStyle = step.output.length ? '#fbbf24' : 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = step.output.length ? (injectHandCodeBug ? '#fda4af' : '#fde68a') : '#94a3b8';
    ctx.font = '700 11.5px ui-monospace, monospace';
    const outSummary = step.output.length
      ? `TELETYPE OUT: ${step.output.join('  |  ')}`
      : 'TELETYPE OUT: waiting for DISPLAY instruction…';
    ctx.fillText(outSummary, W / 2, outY + outH / 2, W - padX * 2 - 16);
    ctx.textBaseline = 'alphabetic';
  }

  function renderCompiler() {
    drawCompilerFrame();

    if (!compiledProg.ok) {
      if (backBtn) backBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      if (playBtn) playBtn.disabled = true;
      if (statStage) statStage.textContent = 'Syntax Error';
      if (statRegs) statRegs.textContent = '—';
      if (statBus) statBus.textContent = '—';
      if (statOut) statOut.textContent = 'Fix code';
      return;
    }

    if (playBtn) playBtn.disabled = false;
    const total = execResult.steps.length;
    const step = execResult.steps[stepIdx] || execResult.steps[0];
    const activeInsnIdx = step.insnIndex;

    if (stepIdx >= total - 1 && execResult.ok && step.output.length) {
      markChallenge('compile-run');
    }

    if (backBtn) backBtn.disabled = stepIdx === 0;
    if (nextBtn) nextBtn.disabled = stepIdx >= total - 1;
    if (seekSlider) {
      seekSlider.max = String(total);
      seekSlider.value = String(stepIdx + 1);
      seekSlider.setAttribute('aria-valuetext', `Step ${stepIdx + 1} of ${total}: ${step.phase}`);
    }

    if (hudLeft) {
      hudLeft.textContent = `${COBOL_PRESETS[currentPresetId]?.title || 'Custom COBOL'} · Step ${stepIdx + 1}/${total}`;
    }
    if (hudRight) {
      hudRight.textContent = injectHandCodeBug ? 'Hand-Code Bug: ON' : 'Compiler Clean';
      hudRight.classList.toggle('is-bug', injectHandCodeBug || Boolean(step.bugActive));
    }

    if (statStage) statStage.textContent = step.stage.startsWith('compile') ? 'Compile' : `PC #${Math.max(0, activeInsnIdx)}`;
    if (statRegs) statRegs.textContent = `R1=${step.regs.R1} R2=${step.regs.R2}`;
    if (statBus) statBus.textContent = step.writeAddr ? `W→${step.writeAddr}` : step.readAddr ? `R←${step.readAddr}` : 'Internal';
    if (statOut) {
      statOut.textContent = step.output.length ? step.output[step.output.length - 1] : '—';
      statOut.classList.toggle('is-warn', Boolean(step.bugActive || step.runtimeError));
    }

    if (narrationBox) narrationBox.classList.toggle('is-bug', Boolean(step.bugActive || step.runtimeError));
    if (phasePill) phasePill.textContent = step.phase;
    if (narrationText) narrationText.textContent = step.detail;

    if (teletypeBar) {
      if (!step.output.length) {
        teletypeBar.innerHTML = '<span>Teletype output: waiting for DISPLAY…</span>';
      } else {
        teletypeBar.innerHTML =
          '<span>Teletype:</span> ' +
          step.output
            .map((line) => `<span class="gh-tape-chip${injectHandCodeBug ? ' is-bug' : ''}">${escapeHtml(line)}</span>`)
            .join('');
      }
    }

    if (asmBody) {
      asmBody.innerHTML = compiledProg.instructions
        .map((insn) => {
          const cls = insn.index === activeInsnIdx
            ? 'is-current'
            : insn.bugCorrupted
              ? 'is-bug'
              : '';
          return `<tr class="${cls}" data-insn-idx="${insn.index}">
            <td>#${insn.index}</td>
            <td><code>${escapeHtml(insn.opcode)} ${escapeHtml(insn.operands)}</code></td>
            <td>${escapeHtml(insn.comment)}</td>
          </tr>`;
        })
        .join('');
      asmBody.querySelectorAll('[data-insn-idx]').forEach((tr) => {
        tr.addEventListener('click', () => {
          const targetInsn = Number(tr.dataset.insnIdx);
          const match = execResult.steps.findIndex((s) => s.insnIndex === targetInsn && s.stage === 'execute');
          if (match >= 0) seekCompiler(match);
        });
      });
    }

    if (binBody) {
      binBody.innerHTML = compiledProg.instructions
        .map((insn) => {
          const cls = insn.index === activeInsnIdx
            ? 'is-current'
            : insn.bugCorrupted
              ? 'is-bug'
              : '';
          return `<tr class="${cls}">
            <td>#${insn.index}</td>
            <td><code>${escapeHtml(insn.hex)}</code></td>
            <td><code>${escapeHtml(insn.binary)}</code></td>
          </tr>`;
        })
        .join('');
    }

    if (symBody) {
      symBody.innerHTML = compiledProg.symbolTable
        .map((sym) => {
          const memVal = step.memory[sym.hexAddr]?.value ?? 0;
          const isRead = step.readAddr === sym.hexAddr;
          const isWrite = step.writeAddr === sym.hexAddr;
          const cls = isWrite ? 'is-write' : isRead ? 'is-read' : '';
          return `<tr class="${cls}">
            <th scope="row">${escapeHtml(sym.name)}</th>
            <td><code>${sym.hexAddr}</code></td>
            <td>${memVal}</td>
            <td>Line ${sym.declaredLine}</td>
          </tr>`;
        })
        .join('');
    }

    if (pythonOut) {
      pythonOut.innerHTML = compiledProg.pythonLines
        .map(
          (line, idx) =>
            `<span class="gh-code-line${idx === step.pyLine ? ' is-active' : ''}">${escapeHtml(line)}</span>`,
        )
        .join('');
    }
  }

  presetSelect?.addEventListener('change', (e) => {
    currentPresetId = e.target.value;
    if (codeEditor) codeEditor.value = COBOL_PRESETS[currentPresetId].source;
    runCompile(false, false);
  });

  compileBtn?.addEventListener('click', () => runCompile(true, false));

  bugToggleBtn?.addEventListener('click', () => {
    injectHandCodeBug = !injectHandCodeBug;
    bugToggleBtn.setAttribute('aria-pressed', String(injectHandCodeBug));
    bugToggleBtn.textContent = `Hand-Code Bug: ${injectHandCodeBug ? 'On' : 'Off'}`;
    runCompile(false, true);
  });

  backBtn?.addEventListener('click', () => seekCompiler(stepIdx - 1));
  nextBtn?.addEventListener('click', () => seekCompiler(stepIdx + 1));
  resetBtn?.addEventListener('click', () => seekCompiler(0));
  playBtn?.addEventListener('click', () =>
    compilerPlaying ? pauseCompilerPlayback() : startCompilerPlayback(),
  );
  seekSlider?.addEventListener('input', (e) => seekCompiler(Number(e.target.value) - 1));
  soundBtn?.addEventListener('click', () => {
    compilerSound = !compilerSound;
    soundBtn.setAttribute('aria-pressed', String(compilerSound));
    soundBtn.textContent = `Sound FX: ${compilerSound ? 'On' : 'Off'}`;
    if (compilerSound) playTone(440, 0.08, 'triangle', 0.04);
  });
  copyPythonBtn?.addEventListener('click', () => {
    const code = compiledProg.pythonLines.join('\n');
    navigator.clipboard?.writeText(code).catch(() => {});
    showToast('Python equivalent copied');
  });

  inspTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.ghInspTab;
      inspTabs.forEach((b) => {
        const active = b.dataset.ghInspTab === target;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      inspPanels.forEach((p) => {
        p.hidden = p.dataset.ghInspPanel !== target;
      });
    });
  });

  compilerCanvas?.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === ' ') {
      e.preventDefault();
      compilerPlaying ? pauseCompilerPlayback() : startCompilerPlayback();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekCompiler(stepIdx + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekCompiler(stepIdx - 1);
    } else if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      seekCompiler(0);
    }
  });

  if (compilerCanvas && window.SimKit?.canvas2d) {
    compilerSim2d = window.SimKit.canvas2d(compilerCanvas, {
      dpr: 2,
      onResize: () => drawCompilerFrame(),
    });
    window.SimKit.loop(
      (dt) => {
        if (activeTab !== 'compiler') return;
        const animating = compilerPlaying || performance.now() - compilerAnimStart < 520;
        if (animating && !prefersReducedMotion()) {
          pulsePhase += dt * 3;
          drawCompilerFrame();
        }
      },
      { el: window.SimKit.stage(compilerCanvas), maxDt: 0.05 },
    );
  }

  /* ============================================================================
     TAB 2: NANOSECOND & SPEED-OF-LIGHT WIRE LAB
     ============================================================================ */
  const wireCanvas = document.getElementById('gh-wire-canvas');
  const wirePresetWrap = document.getElementById('gh-wire-presets');
  const wireMediumSel = document.getElementById('gh-wire-medium');
  const wireTimeSlider = document.getElementById('gh-wire-time');
  const wireLenSlider = document.getElementById('gh-wire-length');
  const wireTimeOut = document.getElementById('gh-wire-time-out');
  const wireLenOut = document.getElementById('gh-wire-len-out');
  const wirePulseBtn = document.getElementById('gh-wire-pulse-btn');
  const wireAnalogyEl = document.getElementById('gh-wire-analogy');

  const wireHudLeft = document.getElementById('gh-wire-hud-left');
  const wireHudRight = document.getElementById('gh-wire-hud-right');
  const wireStatDist = document.getElementById('gh-wire-stat-dist');
  const wireStatVac = document.getElementById('gh-wire-stat-vac');
  const wireStatFreq = document.getElementById('gh-wire-stat-freq');
  const wireStatStatus = document.getElementById('gh-wire-stat-status');

  const sliderToNs = (v) => Math.pow(10, -0.7 + (Number(v) / 1000) * 9.7);
  const nsToSlider = (ns) =>
    Math.max(0, Math.min(1000, Math.round(((Math.log10(Math.max(0.2, ns)) + 0.7) / 9.7) * 1000)));
  const sliderToCm = (v) => Math.pow(10, -0.3 + (Number(v) / 1000) * 10.8);
  const cmToSlider = (cm) =>
    Math.max(0, Math.min(1000, Math.round(((Math.log10(Math.max(0.5, cm)) + 0.3) / 10.8) * 1000)));

  let wireState = {
    presetId: 'ns-1',
    timeNs: 1,
    mediumId: 'vacuum',
    wireLengthCm: 29.9,
  };
  let wirePulseT = 1;
  let wirePulseAnimating = false;

  if (wirePresetWrap) {
    WIRE_PRESET_ORDER.forEach((id) => {
      const p = WIRE_PRESETS[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `gh-mini-btn${id === wireState.presetId ? ' is-active' : ''}`;
      btn.dataset.wirePreset = id;
      btn.textContent = p.label;
      btn.addEventListener('click', () => {
        wireState = {
          presetId: id,
          timeNs: p.timeNs,
          mediumId: p.mediumId,
          wireLengthCm: p.wireLengthCm,
        };
        syncWireSlidersFromState();
        triggerWirePulse();
      });
      wirePresetWrap.appendChild(btn);
    });
  }

  if (wireMediumSel) {
    Object.values(SIGNAL_MEDIA).forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      wireMediumSel.appendChild(opt);
    });
    wireMediumSel.value = wireState.mediumId;
  }

  function syncWireSlidersFromState() {
    if (wireMediumSel) wireMediumSel.value = wireState.mediumId;
    if (wireTimeSlider) wireTimeSlider.value = String(nsToSlider(wireState.timeNs));
    if (wireLenSlider) wireLenSlider.value = String(cmToSlider(wireState.wireLengthCm));
    wirePresetWrap?.querySelectorAll('[data-wire-preset]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.wirePreset === wireState.presetId);
    });
  }

  function triggerWirePulse() {
    if (prefersReducedMotion()) {
      wirePulseT = 1;
      wirePulseAnimating = false;
    } else {
      wirePulseT = 0;
      wirePulseAnimating = true;
    }
    renderWire();
  }

  function drawWireFrame() {
    if (!wireCanvas) return;
    const ctx = wireCanvas.getContext('2d');
    const W = wireSim2d ? wireSim2d.width : wireCanvas.clientWidth || 620;
    const H = wireSim2d ? wireSim2d.height : wireCanvas.clientHeight || 280;
    if (!wireSim2d) {
      wireCanvas.width = W;
      wireCanvas.height = H;
    }

    const phys = computeSignalPhysics(wireState);

    ctx.fillStyle = '#060c17';
    ctx.fillRect(0, 0, W, H);

    // Subtle oscilloscope grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 24; x < W; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 24; y < H; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const padX = 36;
    const txX = padX + 26;
    const rxX = W - padX - 26;
    const trackW = Math.max(80, rxX - txX);
    const wireY = Math.round(H * 0.46);

    // Wire Conductor Bar
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(txX, wireY - 7, trackW, 14, 7);
    ctx.fill();
    ctx.strokeStyle = phys.arrivesInTick ? '#2dd4bf' : '#fb923c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Progress of the electromagnetic wave up to fractionReached
    const reachedRatio = Math.min(1, phys.fractionReached) * wirePulseT;
    const pulseX = txX + trackW * reachedRatio;

    const grad = ctx.createLinearGradient(txX, 0, pulseX, 0);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(1, phys.arrivesInTick ? '#5eead4' : '#fb7185');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(txX, wireY - 5, Math.max(4, pulseX - txX), 10, 5);
    ctx.fill();

    // Glowing wavefront head
    ctx.fillStyle = phys.arrivesInTick ? '#ccfbf1' : '#ffe4e6';
    ctx.beginPath();
    ctx.arc(pulseX, wireY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Hopper 11.8-inch (29.98 cm) reference tick when wire length is within 2m
    if (phys.wireLengthCm >= 10 && phys.wireLengthCm <= 250) {
      const hopperFrac = 29.98 / phys.wireLengthCm;
      if (hopperFrac > 0.05 && hopperFrac < 0.98) {
        const hx = txX + trackW * hopperFrac;
        ctx.strokeStyle = '#fbbf24';
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, wireY - 42);
        ctx.lineTo(hx, wireY + 34);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fde68a';
        ctx.font = '700 10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Hopper 1 ns (11.8 in)', hx, wireY - 48);
      }
    }

    // Transmitter & Receiver Nodes
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.roundRect(txX - 24, wireY - 22, 48, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TX', txX, wireY - 4);
    ctx.font = '600 9px ui-monospace, monospace';
    ctx.fillText('t = 0', txX, wireY + 10);

    ctx.fillStyle = phys.arrivesInTick ? '#14532d' : '#7f1d1d';
    ctx.beginPath();
    ctx.roundRect(rxX - 28, wireY - 22, 56, 44, 8);
    ctx.fill();
    ctx.strokeStyle = phys.arrivesInTick ? '#86efac' : '#fda4af';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 10px sans-serif';
    ctx.fillText('RX', rxX, wireY - 5);
    ctx.font = '600 8.5px ui-monospace, monospace';
    ctx.fillText(formatDistance(phys.wireLengthCm / 100).split(' (')[0], rxX, wireY + 10, 50);

    // Distance & Timing Status Readout Banner on Canvas
    const statusY = Math.round(H * 0.78);
    ctx.fillStyle = phys.arrivesInTick ? 'rgba(20, 83, 45, 0.7)' : 'rgba(136, 19, 55, 0.78)';
    ctx.beginPath();
    ctx.roundRect(padX, statusY - 18, W - padX * 2, 36, 8);
    ctx.fill();
    ctx.strokeStyle = phys.arrivesInTick ? '#86efac' : '#fda4af';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 11.5px ui-monospace, monospace';
    const msg = phys.arrivesInTick
      ? `SYNC OK: Pulse arrives in ${formatDurationNs(phys.requiredTimeNs)} (within ${phys.durationLabel} clock tick)`
      : `TIMING VIOLATION: Wire needs ${formatDurationNs(phys.requiredTimeNs)}, exceeds ${phys.durationLabel} tick!`;
    ctx.fillText(msg, W / 2, statusY, W - padX * 2 - 16);
    ctx.textBaseline = 'alphabetic';
  }

  function renderWire() {
    const phys = computeSignalPhysics(wireState);
    drawWireFrame();

    if (wireTimeOut) wireTimeOut.textContent = `${phys.durationLabel} (${phys.frequencyLabel})`;
    if (wireLenOut) wireLenOut.textContent = formatDistance(phys.wireLengthCm / 100);
    if (wireAnalogyEl) {
      wireAnalogyEl.innerHTML =
        `<strong>${phys.medium.label}:</strong> Signal covers <strong>${formatDistance(phys.mediumMeters)}</strong> in ${phys.durationLabel}. ${phys.analogy}`;
    }

    if (wireHudLeft) wireHudLeft.textContent = `${phys.medium.shortLabel} · ${phys.frequencyLabel}`;
    if (wireHudRight) {
      wireHudRight.textContent = phys.arrivesInTick ? 'SYNC OK' : 'TIMING VIOLATION';
      wireHudRight.classList.toggle('is-bug', !phys.arrivesInTick);
      wireHudRight.classList.toggle('is-ok', phys.arrivesInTick);
    }

    if (wireStatDist) wireStatDist.textContent = formatDistance(phys.mediumMeters);
    if (wireStatVac) wireStatVac.textContent = formatDistance(phys.vacuumMeters);
    if (wireStatFreq) wireStatFreq.textContent = phys.frequencyLabel;
    if (wireStatStatus) {
      wireStatStatus.textContent = phys.arrivesInTick ? 'Arrives OK' : 'Too Slow!';
      wireStatStatus.classList.toggle('is-warn', !phys.arrivesInTick);
    }

    if (!phys.arrivesInTick && activeTab === 'wire') {
      markChallenge('break-light-barrier');
    }
  }

  wireMediumSel?.addEventListener('change', (e) => {
    wireState.mediumId = e.target.value;
    wireState.presetId = '';
    syncWireSlidersFromState();
    triggerWirePulse();
  });

  wireTimeSlider?.addEventListener('input', (e) => {
    wireState.timeNs = sliderToNs(e.target.value);
    wireState.presetId = '';
    wirePresetWrap?.querySelectorAll('[data-wire-preset]').forEach((b) => b.classList.remove('is-active'));
    renderWire();
  });

  wireLenSlider?.addEventListener('input', (e) => {
    wireState.wireLengthCm = sliderToCm(e.target.value);
    wireState.presetId = '';
    wirePresetWrap?.querySelectorAll('[data-wire-preset]').forEach((b) => b.classList.remove('is-active'));
    renderWire();
  });

  wirePulseBtn?.addEventListener('click', () => {
    playTone(540, 0.08, 'sine', 0.03);
    triggerWirePulse();
  });

  if (wireCanvas && window.SimKit?.canvas2d) {
    wireSim2d = window.SimKit.canvas2d(wireCanvas, {
      dpr: 2,
      onResize: () => drawWireFrame(),
    });
    window.SimKit.loop(
      (dt) => {
        if (activeTab !== 'wire' || !wirePulseAnimating || prefersReducedMotion()) return;
        wirePulseT = Math.min(1, wirePulseT + dt * 1.35);
        drawWireFrame();
        if (wirePulseT >= 1) wirePulseAnimating = false;
      },
      { el: window.SimKit.stage(wireCanvas), maxDt: 0.05 },
    );
  }

  /* ============================================================================
     TAB 3: 1947 HARVARD MARK II RELAY PANEL F DEBUGGER
     ============================================================================ */
  const bugCanvas = document.getElementById('gh-bug-canvas');
  const bugCaseSel = document.getElementById('gh-bug-case');
  const bugBitBtns = [...document.querySelectorAll('[data-gh-bit]')];
  const bugRunBtn = document.getElementById('gh-bug-run-btn');
  const bugInspectBtn = document.getElementById('gh-bug-inspect-btn');
  const bugRepairBtn = document.getElementById('gh-bug-repair-btn');
  const bugResetBtn = document.getElementById('gh-bug-reset-btn');
  const relayPillsWrap = document.getElementById('gh-relay-pills');

  const bugHudLeft = document.getElementById('gh-bug-hud-left');
  const bugHudRight = document.getElementById('gh-bug-hud-right');
  const bugExpectedEl = document.getElementById('gh-bug-expected');
  const bugActualEl = document.getElementById('gh-bug-actual');
  const bugInspectText = document.getElementById('gh-bug-inspect-text');
  const bugLogbookEl = document.getElementById('gh-bug-logbook');

  let bugCaseId = 'relay-70-moth';
  let bugInputVal = MARK_II_CASES['relay-70-moth'].defaultInput;
  let bugSelectedRelay = 'R70';
  let bugInspected = false;
  let bugRepaired = false;
  let relayHitboxes = [];

  if (bugCaseSel) {
    MARK_II_CASE_ORDER.forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = MARK_II_CASES[id].shortTitle;
      bugCaseSel.appendChild(opt);
    });
    bugCaseSel.value = bugCaseId;
  }

  function syncBitButtons() {
    bugBitBtns.forEach((btn) => {
      const bitIdx = Number(btn.dataset.ghBit);
      const isOn = Boolean((bugInputVal >> bitIdx) & 1);
      btn.classList.toggle('is-on', isOn);
      btn.setAttribute('aria-pressed', String(isOn));
    });
  }

  function drawBugFrame() {
    if (!bugCanvas) return;
    const ctx = bugCanvas.getContext('2d');
    const W = bugSim2d ? bugSim2d.width : bugCanvas.clientWidth || 620;
    const H = bugSim2d ? bugSim2d.height : bugCanvas.clientHeight || 300;
    if (!bugSim2d) {
      bugCanvas.width = W;
      bugCanvas.height = H;
    }

    const sim = simulateMarkIIRelays(bugCaseId, bugInputVal, bugRepaired);
    ctx.fillStyle = '#080e1a';
    ctx.fillRect(0, 0, W, H);

    const padX = 12;
    const topY = 30;
    const bankH = Math.round((H - topY - 18) * 0.54);
    const gap = 6;
    const cardW = (W - padX * 2 - gap * 5) / 6;

    relayHitboxes = [];

    // Draw 6 Mark II Relays R67..R72
    sim.relays.forEach((relay, idx) => {
      const rx = padX + idx * (cardW + gap);
      const ry = topY;
      relayHitboxes.push({ id: relay.id, x: rx, y: ry, w: cardW, h: bankH });

      const selected = relay.id === bugSelectedRelay;
      ctx.fillStyle = selected ? '#1e293b' : '#111b2e';
      ctx.beginPath();
      ctx.roundRect(rx, ry, cardW, bankH, 8);
      ctx.fill();
      ctx.strokeStyle = relay.isFaulty
        ? '#fda4af'
        : selected
          ? '#fbbf24'
          : 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = selected || relay.isFaulty ? 2 : 1;
      ctx.stroke();

      // Relay Header
      ctx.fillStyle = selected ? '#fde68a' : '#e2e8f0';
      ctx.font = `800 ${cardW < 70 ? 10 : 11.5}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(relay.id, rx + cardW / 2, ry + 14);

      ctx.fillStyle = '#94a3b8';
      ctx.font = `600 ${cardW < 70 ? 8.5 : 9.5}px sans-serif`;
      ctx.fillText(relay.label, rx + cardW / 2, ry + 28, cardW - 6);

      // Coil & Mechanical Contact Graphic
      const cx = rx + cardW / 2;
      const cy = ry + bankH * 0.56;
      ctx.fillStyle = relay.coilEnergized ? '#0f766e' : '#1e293b';
      ctx.beginPath();
      ctx.roundRect(cx - 14, cy - 12, 28, 20, 4);
      ctx.fill();
      ctx.strokeStyle = relay.coilEnergized ? '#5eead4' : '#475569';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Contact arm
      ctx.strokeStyle = relay.isFaulty ? '#fb7185' : relay.contactClosed ? '#86efac' : '#94a3b8';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy + 20);
      ctx.lineTo(cx + 14, relay.contactClosed ? cy + 20 : cy + 12);
      ctx.stroke();

      // Output Lamp
      ctx.fillStyle = relay.actualOut ? '#22c55e' : '#334155';
      ctx.beginPath();
      ctx.arc(cx, ry + bankH - 14, 5.5, 0, Math.PI * 2);
      ctx.fill();
      if (relay.isFaulty) {
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Bottom Zoomed Mechanical Inspection Chamber
    const magY = topY + bankH + 10;
    const magH = H - magY - 10;
    const selRelay = sim.relays.find((r) => r.id === bugSelectedRelay) || sim.relays[3];

    ctx.fillStyle = '#111b2e';
    ctx.beginPath();
    ctx.roundRect(padX, magY, W - padX * 2, magH, 9);
    ctx.fill();
    ctx.strokeStyle = selRelay.isFaulty ? '#fda4af' : '#fbbf24';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Left text inside magnifier
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fde68a';
    ctx.font = '800 11.5px ui-monospace, monospace';
    ctx.fillText(`MAGNIFIER · ${selRelay.id} (${selRelay.role})`, padX + 12, magY + 18);

    ctx.fillStyle = selRelay.isFaulty ? '#ffe4e6' : '#cbd5e1';
    ctx.font = '600 11px sans-serif';
    const statusLine = bugInspected
      ? selRelay.faultSummary
      : 'Click "Inspect Selected" or tap a relay to open its dust cover.';
    ctx.fillText(statusLine, padX + 12, magY + 38, W - padX * 2 - 145);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 10.5px ui-monospace, monospace';
    ctx.fillText(
      `Coil: ${selRelay.coilEnergized ? 'ENERGIZED' : 'IDLE'}   Contacts: ${selRelay.contactClosed ? 'CLOSED' : 'OPEN'}   Out: ${selRelay.actualOut}`,
      padX + 12,
      magY + Math.min(magH - 14, 58),
      W - padX * 2 - 145,
    );

    // Right enlarged contact illustration
    const iconCx = W - padX - 66;
    const iconCy = magY + magH / 2 + 4;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(iconCx - 38, iconCy + 6);
    ctx.lineTo(iconCx - 10, iconCy + 6);
    ctx.moveTo(iconCx + 10, iconCy + 6);
    ctx.lineTo(iconCx + 38, iconCy + 6);
    ctx.stroke();

    // Moving armature bar
    ctx.strokeStyle = selRelay.isFaulty ? '#fb7185' : '#5eead4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(iconCx - 16, selRelay.contactClosed ? iconCy + 4 : iconCy - 8);
    ctx.lineTo(iconCx + 16, selRelay.contactClosed ? iconCy + 4 : iconCy - 12);
    ctx.stroke();

    // Draw moth silhouette when inspecting Relay #70 with moth fault active!
    if (bugInspected && selRelay.isFaulty && sim.caseInfo.faultType === 'moth') {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(iconCx - 6, iconCy - 2, 7, 4, -0.4, 0, Math.PI * 2);
      ctx.ellipse(iconCx + 6, iconCy - 2, 7, 4, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(iconCx, iconCy - 1, 2.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (bugInspected && selRelay.isFaulty && sim.caseInfo.faultType === 'stuck-closed') {
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(iconCx, iconCy + 4, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textBaseline = 'alphabetic';
  }

  function renderBugLab() {
    syncBitButtons();
    const sim = simulateMarkIIRelays(bugCaseId, bugInputVal, bugRepaired);
    drawBugFrame();

    if (bugHudLeft) bugHudLeft.textContent = sim.caseInfo.shortTitle;
    if (bugHudRight) {
      bugHudRight.textContent = sim.allMatch ? 'OUTPUT VERIFIED' : 'FAULT DETECTED';
      bugHudRight.classList.toggle('is-bug', !sim.allMatch);
      bugHudRight.classList.toggle('is-ok', sim.allMatch);
    }

    if (bugExpectedEl) {
      bugExpectedEl.textContent = `${sim.expectedValue} (${sim.expectedBinary})`;
    }
    if (bugActualEl) {
      bugActualEl.textContent = `${sim.actualValue} (${sim.actualBinary})`;
      bugActualEl.classList.toggle('is-mismatch', !sim.allMatch);
    }

    if (relayPillsWrap) {
      relayPillsWrap.innerHTML = '';
      sim.relays.forEach((relay) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `gh-relay-pill${relay.id === bugSelectedRelay ? ' is-selected' : ''}${relay.isFaulty ? ' is-fault' : ''}`;
        btn.textContent = relay.id;
        btn.setAttribute('aria-pressed', String(relay.id === bugSelectedRelay));
        btn.addEventListener('click', () => {
          bugSelectedRelay = relay.id;
          bugInspected = true;
          renderBugLab();
        });
        relayPillsWrap.appendChild(btn);
      });
    }

    const selRelay = sim.relays.find((r) => r.id === bugSelectedRelay) || sim.relays[3];
    if (bugInspectText) {
      if (!bugInspected) {
        bugInspectText.innerHTML =
          `<strong>Symptom:</strong> ${escapeHtml(sim.caseInfo.symptom)} Toggle input switches or click <strong>Inspect Selected</strong> to examine ${escapeHtml(bugSelectedRelay)}.`;
      } else if (selRelay.isFaulty) {
        bugInspectText.innerHTML =
          `<strong>Fault Found on ${escapeHtml(selRelay.id)}:</strong> ${escapeHtml(sim.caseInfo.inspectionNote)} Click <strong>Repair &amp; Log</strong> to fix it.`;
      } else if (bugRepaired) {
        bugInspectText.innerHTML =
          `<strong>${escapeHtml(selRelay.id)} Nominal:</strong> Repair verified — Panel F matches expected output across every input bit.`;
      } else {
        bugInspectText.innerHTML =
          `<strong>${escapeHtml(selRelay.id)} Healthy:</strong> ${escapeHtml(selRelay.faultSummary)}. Try inspecting another relay on Panel F!`;
      }
    }

    if (bugLogbookEl) {
      bugLogbookEl.innerHTML = bugRepaired
        ? `<strong>1947 Harvard Mark II Logbook · Entry Logged</strong>${escapeHtml(sim.caseInfo.logbookEntry)}`
        : `<strong>1947 Harvard Mark II Logbook · Pending Repair</strong>Suspected fault in Panel F (${escapeHtml(sim.caseInfo.symptom)}). Isolate faulty relay and log repair.`;
    }

    if (bugRepairBtn) {
      const canRepair = !bugRepaired && bugInspected && bugSelectedRelay === sim.caseInfo.faultRelay;
      bugRepairBtn.disabled = !canRepair;
    }

    if (bugCaseId === 'relay-70-moth' && bugRepaired) {
      markChallenge('debug-relay-70');
    }
  }

  bugCaseSel?.addEventListener('change', (e) => {
    bugCaseId = e.target.value;
    bugInputVal = MARK_II_CASES[bugCaseId].defaultInput;
    bugSelectedRelay = 'R70';
    bugInspected = false;
    bugRepaired = false;
    renderBugLab();
  });

  bugBitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const bit = Number(btn.dataset.ghBit);
      bugInputVal ^= 1 << bit;
      playTone(330 + bit * 55, 0.06, 'triangle', 0.03);
      renderBugLab();
    });
  });

  bugRunBtn?.addEventListener('click', () => {
    playTone(440, 0.08, 'triangle', 0.03);
    renderBugLab();
  });

  bugInspectBtn?.addEventListener('click', () => {
    bugInspected = true;
    playTone(580, 0.09, 'sine', 0.035);
    renderBugLab();
  });

  bugRepairBtn?.addEventListener('click', () => {
    bugRepaired = true;
    playTone(740, 0.14, 'sine', 0.045);
    renderBugLab();
  });

  bugResetBtn?.addEventListener('click', () => {
    bugInputVal = MARK_II_CASES[bugCaseId].defaultInput;
    bugInspected = false;
    bugRepaired = false;
    renderBugLab();
  });

  bugCanvas?.addEventListener('click', (e) => {
    const rect = bugCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = relayHitboxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (hit) {
      bugSelectedRelay = hit.id;
      bugInspected = true;
      playTone(500, 0.07, 'sine', 0.03);
      renderBugLab();
    }
  });

  if (bugCanvas && window.SimKit?.canvas2d) {
    bugSim2d = window.SimKit.canvas2d(bugCanvas, {
      dpr: 2,
      onResize: () => drawBugFrame(),
    });
  }

  /* ============================================================================
     UNSPOILED HAND-TRACE EXERCISE
     ============================================================================ */
  const traceTabs = [...document.querySelectorAll('[data-trace-mode]')];
  const traceGiven = document.getElementById('gh-trace-given');
  const traceBody = document.getElementById('gh-trace-tbody');
  const traceFeedback = document.getElementById('gh-trace-feedback');
  const traceBreakdown = document.getElementById('gh-trace-breakdown');
  const traceCheckBtn = document.getElementById('gh-trace-check');
  const traceRevealBtn = document.getElementById('gh-trace-reveal');
  const traceResetBtn = document.getElementById('gh-trace-reset');

  let activeTraceMode = 'cobol-trace';

  function renderTraceTable() {
    const ex = TRACE_EXERCISES[activeTraceMode];
    if (!ex || !traceBody) return;

    if (traceGiven) {
      traceGiven.innerHTML = ex.given.map((g) => `<span>${escapeHtml(g)}</span>`).join('');
    }

    traceBody.innerHTML = ex.rows
      .map(
        (row, idx) => `<tr>
          <td><strong>${escapeHtml(row.step)}</strong></td>
          <td><code>${escapeHtml(row.op)}</code></td>
          <td><code>${escapeHtml(row.dest)}</code></td>
          <td>
            <input
              type="text"
              inputmode="decimal"
              class="gh-trace-input"
              data-trace-idx="${idx}"
              placeholder="?"
              aria-label="${escapeHtml(row.step)} answer for ${escapeHtml(row.dest)}"
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
    const inputs = [...document.querySelectorAll('.gh-trace-input')];
    const submitted = inputs.map((el) => el.value);
    const report = checkTraceSubmission(activeTraceMode, submitted);

    inputs.forEach((el, idx) => {
      const ok = report.results[idx].ok;
      el.classList.toggle('is-ok', ok);
      el.classList.toggle('is-bad', !ok);
    });

    if (traceFeedback) {
      traceFeedback.className = `gh-feedback ${report.allCorrect ? 'ok' : 'err'}`;
      traceFeedback.textContent = report.allCorrect
        ? `✓ All ${report.total} correct!`
        : `${report.correctCount} / ${report.total} correct — check highlighted rows.`;
    }
    if (traceBreakdown) {
      const wrong = report.results.filter((r) => !r.ok);
      traceBreakdown.innerHTML = wrong.length
        ? wrong.map((w) => `<p>${escapeHtml(w.step)}: ${escapeHtml(w.hint)}</p>`).join('')
        : '<p>Every traced value matches exact execution!</p>';
    }
  });

  traceRevealBtn?.addEventListener('click', () => {
    const ex = TRACE_EXERCISES[activeTraceMode];
    const inputs = [...document.querySelectorAll('.gh-trace-input')];
    inputs.forEach((el, idx) => {
      el.value = String(ex.rows[idx].answer);
      el.classList.remove('is-bad');
      el.classList.add('is-ok');
    });
    if (traceFeedback) {
      traceFeedback.className = 'gh-feedback';
      traceFeedback.textContent = 'Answers shown.';
    }
    if (traceBreakdown) {
      traceBreakdown.innerHTML = ex.rows.map((r) => `<p>${escapeHtml(r.step)}: ${escapeHtml(r.hint)}</p>`).join('');
    }
  });

  traceResetBtn?.addEventListener('click', () => renderTraceTable());

  /* ============================================================================
     PRACTICE & DEBUGGING PROBLEMS CHECKER
     ============================================================================ */
  const hintsToggle = document.getElementById('gh-hints-toggle');
  const scoreBadge = document.getElementById('gh-practice-score');
  const solvedQuestions = new Set();

  hintsToggle?.addEventListener('change', (e) => {
    document.body.classList.toggle('gh-show-hints', e.target.checked);
  });

  document.querySelectorAll('.gh-practice button[data-check]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      const type = btn.dataset.check;
      const ans = btn.dataset.ans;
      const input = document.getElementById(`ghans-${q}`);
      const fb = document.getElementById(`ghfb-${q}`);
      const hint = document.getElementById(`ghhint-${q}`);
      if (!input || !fb) return;

      let ok = false;
      if (type === 'num') {
        const val = parseFloat(input.value);
        const tol = parseFloat(btn.dataset.tol || '0');
        if (Number.isNaN(val)) {
          fb.textContent = 'Enter a number.';
          fb.className = 'gh-feedback err';
          return;
        }
        ok = Math.abs(val - parseFloat(ans)) <= tol;
      } else {
        ok = input.value.trim().toLowerCase() === ans.toLowerCase();
      }

      if (ok) {
        fb.textContent = '✓ Correct!';
        fb.className = 'gh-feedback ok';
        solvedQuestions.add(q);
      } else {
        fb.textContent = '✗ Try again.';
        fb.className = 'gh-feedback err';
        if (hint) hint.style.display = 'block';
      }

      if (scoreBadge) {
        scoreBadge.textContent = `Completed: ${solvedQuestions.size} / 9`;
      }
    });
  });

  /* ── Initial Render ──────────────────────────────────────────────────────── */
  renderChallenges();
  syncWireSlidersFromState();
  runCompile(false, false);
  renderWire();
  renderBugLab();
  renderTraceTable();
})();
