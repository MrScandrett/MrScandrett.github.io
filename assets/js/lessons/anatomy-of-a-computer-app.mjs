import {
  BUILD_PROFILES,
  BUILD_ZONES,
  CPU_PROGRAM,
  DETECTIVE_CASES,
  DETECTIVE_TOOLS,
  HARDWARE_PARTS,
  INCOMPATIBLE_PARTS,
  INTERNET_STEPS,
  MEMORY_APPS,
  NETWORK_NODES,
  QUIZ_QUESTIONS,
  RAM_CAPACITY_GB,
  SOFTWARE_SCENARIOS,
  SSD_CAPACITY_GB,
  applyCpuStep,
  attemptPowerOn,
  attemptZonePlacement,
  createBuildState,
  createCpuCycleState,
  createDetectiveState,
  createMemoryState,
  createNetworkState,
  evaluateChallenges,
  evaluateNetworkStep,
  getAvailableNextTask,
  getProfileTasks,
  gradeQuiz,
  loadDemoCompletedBuild,
  memoryAction,
  runDiagnosticTool,
  setNetworkCondition,
  stepCpuCycle,
  stepNetwork,
  submitDiagnosis,
  submitInstallMethod,
} from './anatomy-of-a-computer-engine.mjs';
import { createPCWorkbench3D } from './pc-builder-3d.mjs';

(function initAnatomyLesson() {
  'use strict';

  const studio = document.getElementById('pc-builder');
  if (!studio) return;

  /* ── Shared State ──────────────────────────────────────────────────────── */
  let buildState = createBuildState('classroom');
  const sessionFlags = {
    caughtIncompatible: false,
    hasBootedAny: false,
    hasBootedGpu: false,
  };
  let memoryState = createMemoryState();
  let cpuCycleState = createCpuCycleState();
  let networkState = createNetworkState();
  let detectiveState = createDetectiveState();

  let activeTab = 'build';
  let activeSubtab = 'parts';
  let viewMode = '3d'; // '3d' | '2d'
  let dataFlowEnabled = false;
  let highlightZone = null;
  let netPlayTimer = 0;

  /* ── Studio Mode Tabs & Mastery Challenges ─────────────────────────────── */
  const modeTabs = [...document.querySelectorAll('[data-ac-tab]')];
  const modePanels = [...document.querySelectorAll('[data-ac-panel]')];
  const challengePill = document.getElementById('ac-challenge-pill');
  const challengesDrawer = document.getElementById('ac-challenges-drawer');
  const challengesClose = document.getElementById('ac-challenges-close');
  const challengesList = document.getElementById('ac-challenges-list');

  let workbench3d = null;

  function setActiveTab(tabId) {
    activeTab = tabId;
    modeTabs.forEach((tab) => {
      const match = tab.dataset.acTab === tabId;
      tab.classList.toggle('is-active', match);
      tab.setAttribute('aria-selected', String(match));
      tab.tabIndex = match ? 0 : -1;
    });
    modePanels.forEach((panel) => {
      panel.hidden = panel.dataset.acPanel !== tabId;
    });
    if (tabId === 'build' && workbench3d) {
      requestAnimationFrame(() => workbench3d.resize());
    }
    if (tabId !== 'network' && netPlayTimer) {
      clearInterval(netPlayTimer);
      netPlayTimer = 0;
      syncNetPlayButton();
    }
  }

  modeTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.acTab));
    tab.addEventListener('keydown', (event) => {
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % modeTabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + modeTabs.length) % modeTabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = modeTabs.length - 1;
      if (next !== null) {
        event.preventDefault();
        modeTabs[next].focus();
        setActiveTab(modeTabs[next].dataset.acTab);
      }
    });
  });

  function updateChallenges() {
    const evalBuild = {
      ...buildState,
      caughtIncompatible: buildState.caughtIncompatible || sessionFlags.caughtIncompatible,
      hasBootedAny: buildState.hasBootedAny || sessionFlags.hasBootedAny,
      hasBootedGpu: buildState.hasBootedGpu || sessionFlags.hasBootedGpu,
    };
    const summary = evaluateChallenges({
      build: evalBuild,
      memory: memoryState,
      network: networkState,
      detective: detectiveState,
    });
    challengePill.textContent = `Challenges: ${summary.count} / ${summary.total}`;
    challengePill.classList.toggle('is-complete', summary.count === summary.total);

    challengesList.replaceChildren();
    for (const item of summary.items) {
      const card = document.createElement('div');
      card.className = `ac-challenge-item${item.done ? ' is-done' : ''}`;

      const badge = document.createElement('span');
      badge.className = 'ac-challenge-badge';
      badge.textContent = item.done ? '✓' : '○';
      badge.setAttribute('aria-hidden', 'true');

      const copy = document.createElement('div');
      copy.className = 'ac-challenge-copy';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const desc = document.createElement('p');
      desc.textContent = item.desc;
      copy.append(title, desc);

      const goBtn = document.createElement('button');
      goBtn.type = 'button';
      goBtn.className = 'ac-mini-btn';
      goBtn.textContent = item.done ? 'Done' : 'Open Lab';
      goBtn.addEventListener('click', () => {
        toggleChallengesDrawer(false);
        setActiveTab(item.tab);
      });

      card.append(badge, copy, goBtn);
      challengesList.append(card);
    }
  }

  function toggleChallengesDrawer(forceOpen) {
    const open = forceOpen !== undefined ? forceOpen : challengesDrawer.hidden;
    challengesDrawer.hidden = !open;
    challengePill.setAttribute('aria-expanded', String(open));
    if (open) challengesClose.focus();
  }

  challengePill.addEventListener('click', () => toggleChallengesDrawer());
  challengesClose.addEventListener('click', () => {
    toggleChallengesDrawer(false);
    challengePill.focus();
  });

  /* ── TAB 1: 3D PC BUILDER & 2D BLUEPRINT ─────────────────────────────── */
  const profileSelect = document.getElementById('pc-profile-select');
  const camButtons = [...document.querySelectorAll('[data-cam-preset]')];
  const viewToggleBtn = document.getElementById('pc-view-toggle');
  const demoBtn = document.getElementById('pc-demo-btn');
  const flowToggleBtn = document.getElementById('pc-flow-toggle');
  const wrap3d = document.getElementById('pc3d-wrap');
  const canvas3d = document.getElementById('pc3d-canvas');
  const wrap2d = document.getElementById('pc2d-wrap');
  const case2dEl = document.getElementById('pc-case');
  const cables2dSvg = document.getElementById('pc-cables');
  const hudLeftEl = document.getElementById('pc-hud-left');

  const partsEl = document.getElementById('pc-parts');
  const checklistEl = document.getElementById('pc-checklist');
  const briefEl = document.getElementById('pc-brief');
  const progressEl = document.getElementById('pc-progress');
  const meterEl = document.getElementById('pc-meter');
  const feedbackEl = document.getElementById('pc-feedback');
  const screenEl = document.getElementById('pc-screen');

  const actionIdleEl = document.getElementById('pc-guide-idle');
  const cpuPanelEl = document.getElementById('pc-cpu-panel');
  const cpuAlignStatusEl = document.getElementById('pc-cpu-align');
  const cpuButtons = [...document.querySelectorAll('[data-cpu-action]')];
  const installPanelEl = document.getElementById('pc-install');
  const installTitleEl = document.getElementById('pc-install-title');
  const methodsEl = document.getElementById('pc-methods');

  const bootBtn = document.getElementById('pc-boot');
  const hintBtn = document.getElementById('pc-hint');
  const resetBtn = document.getElementById('pc-reset');
  const subtabs = [...document.querySelectorAll('[data-pc-subtab]')];
  const subpanels = [...document.querySelectorAll('[data-pc-subpanel]')];

  function setSubtab(name) {
    activeSubtab = name;
    subtabs.forEach((btn) => {
      const match = btn.dataset.pcSubtab === name;
      btn.classList.toggle('is-active', match);
      btn.setAttribute('aria-selected', String(match));
    });
    subpanels.forEach((panel) => {
      panel.hidden = panel.dataset.pcSubpanel !== name;
    });
  }

  subtabs.forEach((btn) => btn.addEventListener('click', () => setSubtab(btn.dataset.pcSubtab)));

  function setFeedback(text, tone = 'info') {
    feedbackEl.textContent = text;
    feedbackEl.dataset.tone = tone;
  }

  function setViewMode(mode) {
    if (mode === '3d' && !workbench3d) {
      viewMode = '2d';
      viewToggleBtn.disabled = true;
      viewToggleBtn.textContent = '2D Blueprint';
    } else {
      viewMode = mode;
      viewToggleBtn.textContent = viewMode === '3d' ? '2D Blueprint' : '3D Workbench';
    }
    wrap3d.hidden = viewMode !== '3d';
    wrap2d.hidden = viewMode !== '2d';
    camButtons.forEach((b) => {
      b.disabled = viewMode !== '3d';
    });
    if (viewMode === '3d' && workbench3d) {
      requestAnimationFrame(() => workbench3d.resize());
    }
  }

  viewToggleBtn.addEventListener('click', () => {
    setViewMode(viewMode === '3d' ? '2d' : '3d');
  });

  function sync3DScene() {
    if (!workbench3d) return;
    const spec = BUILD_PROFILES[buildState.profile];
    const leds = buildState.lastPost?.leds || { pwr: 'off', cpu: 'off', dram: 'off', vga: 'off', boot: 'off' };
    workbench3d.sync({
      completed: buildState.completed,
      gpuEnabled: spec.gpu,
      ramSticks: spec.ramSticks,
      cpu: buildState.cpu,
      booted: buildState.booted,
      leds,
      highlightZone,
      dataFlow: dataFlowEnabled,
    });
  }

  function renderPostLeds() {
    const leds = buildState.lastPost?.leds || { pwr: 'off', cpu: 'off', dram: 'off', vga: 'off', boot: 'off' };
    for (const [key, state] of Object.entries(leds)) {
      const el = document.getElementById(`led-${key}`);
      if (el) el.dataset.ledState = state;
    }
  }

  function renderCpuControls() {
    const cpu = buildState.cpu;
    const showCpu =
      buildState.completed.has('board') &&
      (buildState.selectedPart === 'cpu' ||
        buildState.pendingInstallTaskId === 'cpu' ||
        (cpu.stage !== 'tray' && !buildState.completed.has('cpu')));

    cpuPanelEl.hidden = !showCpu;
    if (showCpu) {
      installPanelEl.hidden = true;
      actionIdleEl.hidden = true;
    }

    const aligned = cpu.rotation === 0;
    const rotDeg = (cpu.rotation * 90) % 360;
    cpuAlignStatusEl.textContent =
      cpu.stage === 'latched'
        ? 'CPU Seated & Latched ✓'
        : `Corner: ${aligned ? 'Aligned ✓' : `${rotDeg}° off`} · Arm: ${cpu.socketOpen ? 'Open' : 'Closed'}`;

    cpuButtons.forEach((b) => {
      const a = b.dataset.cpuAction;
      if (a === 'pick') b.disabled = cpu.stage !== 'tray';
      else if (a === 'rotate') b.disabled = cpu.stage !== 'held';
      else if (a === 'open') b.disabled = cpu.socketOpen || cpu.stage === 'latched';
      else if (a === 'seat') b.disabled = cpu.stage !== 'held';
      else if (a === 'latch') b.disabled = cpu.stage !== 'seated' || !cpu.socketOpen;
      else if (a === 'reset') b.disabled = buildState.completed.has('paste');
    });
  }

  function renderBuildWorkbench() {
    const spec = BUILD_PROFILES[buildState.profile];
    const tasks = getProfileTasks(buildState.profile);

    hudLeftEl.textContent = `${spec.name} · ${spec.ramSticks}×DDR4 · ${spec.gpu ? 'PCIe GPU' : 'Integrated GFX'}`;
    briefEl.textContent = spec.brief;
    progressEl.textContent = `${buildState.completed.size} / ${tasks.length} steps · ${buildState.mistakes} retries`;
    meterEl.max = tasks.length;
    meterEl.value = buildState.completed.size;

    // Render Parts & Tools Tray
    partsEl.replaceChildren();
    for (const item of [...tasks, ...INCOMPATIBLE_PARTS]) {
      const isDone = buildState.completed.has(item.id);
      const isWrong = item.id.startsWith('wrong-');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `ac-part-btn${isDone ? ' is-done' : ''}${isWrong ? ' is-incompatible' : ''}`;
      btn.dataset.buildPart = item.id;
      btn.disabled = isDone;
      btn.draggable = !isDone;
      btn.setAttribute('aria-pressed', String(buildState.selectedPart === item.id));

      const title = document.createElement('span');
      title.className = 'ac-part-title';
      title.textContent = `${isDone ? '✓ ' : ''}${item.label}`;

      const tag = document.createElement('span');
      tag.className = 'ac-part-tag';
      tag.textContent = isWrong ? 'Check fit!' : item.category;

      btn.append(title, tag);
      btn.addEventListener('click', () => {
        buildState.selectedPart = item.id;
        buildState.pendingInstallTaskId = null;
        const matchedTask = tasks.find((t) => t.id === item.id);
        highlightZone = matchedTask ? matchedTask.zone : item.id === 'wrong-cpu' ? 'cpu' : 'ram';
        if (matchedTask) {
          const z = BUILD_ZONES.find((zone) => zone.id === matchedTask.zone);
          if (z && workbench3d) workbench3d.focusCamera(z.cameraPreset);
        }
        renderBuildWorkbench();
        setFeedback(
          matchedTask?.interactiveCpu && buildState.completed.has('board')
            ? 'CPU selected! Click the CPU socket in 3D/2D or use the precision CPU controls.'
            : `${item.label} selected. Click its destination zone inside the case.`,
          'info',
        );
      });
      btn.addEventListener('dragstart', (event) => {
        buildState.selectedPart = item.id;
        event.dataTransfer?.setData('text/plain', item.id);
      });
      partsEl.append(btn);
    }

    // Render 2D Blueprint Case Zones
    case2dEl.replaceChildren();
    for (const zone of BUILD_ZONES) {
      if (zone.id === 'gpu' && !spec.gpu) continue;
      const zoneBtn = document.createElement('button');
      zoneBtn.type = 'button';
      zoneBtn.dataset.buildZone = zone.id;
      zoneBtn.className = `pc-zone pc-zone-${zone.id}`;
      zoneBtn.textContent = zone.shortLabel;
      zoneBtn.setAttribute('aria-pressed', String(highlightZone === zone.id));

      const installed = tasks.filter((t) => t.zone === zone.id && buildState.completed.has(t.id));
      if (installed.length) {
        zoneBtn.classList.add('pc-filled');
        const sub = document.createElement('span');
        sub.textContent = installed.map((t) => t.shortLabel).join(' · ');
        zoneBtn.append(sub);
      }

      zoneBtn.addEventListener('click', () => handleZoneSelect(zone.id));
      zoneBtn.addEventListener('dragover', (event) => event.preventDefault());
      zoneBtn.addEventListener('drop', (event) => {
        event.preventDefault();
        const droppedId = event.dataTransfer?.getData('text/plain');
        if (droppedId) buildState.selectedPart = droppedId;
        handleZoneSelect(zone.id);
      });
      case2dEl.append(zoneBtn);
    }

    // 2D Cables SVG
    const cableIds = spec.gpu ? ['atx', 'eps', 'pcie'] : ['atx', 'eps'];
    const tidy = buildState.completed.has('route');
    cables2dSvg.innerHTML = cableIds
      .filter((id) => buildState.completed.has(id))
      .map((id, i) => {
        const end = [
          [350, 210],
          [260, 170],
          [300, 380],
        ][i];
        const color = ['#ffc86a', '#7dd3fc', '#c5acff'][i];
        return `<path d="M 450 490 C ${tidy ? 570 : 130} ${tidy ? 550 : 300}, ${tidy ? 570 : 180} ${end[1]}, ${end[0]} ${end[1]}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;
      })
      .join('');
    case2dEl.classList.toggle('pc-tidy', tidy);

    // Render Build Checklist
    checklistEl.replaceChildren();
    for (const task of tasks) {
      const li = document.createElement('li');
      const done = buildState.completed.has(task.id);
      li.className = done ? 'is-done' : '';
      li.textContent = `${done ? '✓' : '○'} ${task.label} — ${task.note}`;
      checklistEl.append(li);
    }

    // Contextual Install Method / CPU Controls / Idle Guide
    renderCpuControls();
    if (cpuPanelEl.hidden) {
      if (buildState.pendingInstallTaskId) {
        actionIdleEl.hidden = true;
      } else {
        installPanelEl.hidden = true;
        actionIdleEl.hidden = false;
      }
    }

    // Update Data Flow button
    flowToggleBtn.disabled = !buildState.booted;
    flowToggleBtn.setAttribute('aria-pressed', String(dataFlowEnabled && buildState.booted));
    flowToggleBtn.textContent = `Data Flow: ${dataFlowEnabled && buildState.booted ? 'On' : 'Off'}`;

    renderPostLeds();
    sync3DScene();
    updateChallenges();
  }

  function handleZoneSelect(zoneId) {
    // Allow direct CPU interaction in 3D/2D even if student clicked CPU zone directly
    if (zoneId === 'cpu' && !buildState.selectedPart && buildState.completed.has('board') && !buildState.completed.has('cpu')) {
      buildState.selectedPart = 'cpu';
    }

    const res = attemptZonePlacement(buildState, buildState.selectedPart, zoneId);
    if (!res.ok) {
      if (res.reason === 'incompatible') sessionFlags.caughtIncompatible = true;
      setFeedback(res.feedback, 'warn');
      renderBuildWorkbench();
      return;
    }

    if (res.mode === 'cpu') {
      highlightZone = 'cpu';
      if (workbench3d) workbench3d.focusCamera('cpu');
      renderBuildWorkbench();
      setFeedback(res.feedback, 'info');
      return;
    }

    // Show 2-choice safe installation confirmation inline
    highlightZone = zoneId;
    renderBuildWorkbench();
    actionIdleEl.hidden = true;
    cpuPanelEl.hidden = true;
    installPanelEl.hidden = false;
    installTitleEl.textContent = `Install: ${res.task.shortLabel}`;
    methodsEl.replaceChildren();

    for (const method of res.methods) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ac-method-btn';
      btn.textContent = method.text;
      btn.addEventListener('click', () => {
        const outcome = submitInstallMethod(buildState, res.task.id, method.correct);
        if (!outcome.ok) {
          setFeedback(outcome.feedback, 'warn');
          renderBuildWorkbench();
          // Keep install prompt open for retry
          installPanelEl.hidden = false;
          actionIdleEl.hidden = true;
          return;
        }
        highlightZone = null;
        setFeedback(outcome.feedback, 'ok');
        renderBuildWorkbench();
        partsEl.querySelector('button:not(:disabled)')?.focus();
      });
      methodsEl.append(btn);
    }

    setFeedback(res.feedback, 'info');
    methodsEl.querySelector('button')?.focus();
  }

  function handleCpuAction(action) {
    const res = applyCpuStep(buildState, action);
    setFeedback(res.message, res.ok ? (res.completedCpu ? 'ok' : 'info') : 'warn');
    if (res.completedCpu) {
      highlightZone = null;
    }
    renderBuildWorkbench();
  }

  cpuButtons.forEach((btn) =>
    btn.addEventListener('click', () => handleCpuAction(btn.dataset.cpuAction)),
  );

  camButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      camButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      workbench3d?.focusCamera(btn.dataset.camPreset);
    }),
  );

  bootBtn.addEventListener('click', () => {
    const post = attemptPowerOn(buildState);
    if (post.ok) {
      sessionFlags.hasBootedAny = true;
      if (BUILD_PROFILES[buildState.profile].gpu) sessionFlags.hasBootedGpu = true;
      dataFlowEnabled = true;
      screenEl.textContent = post.postLines.slice(0, 3).join('  |  ');
      setFeedback(post.feedback, 'ok');
    } else {
      screenEl.textContent = `${post.title} · ${post.postLines[0]}`;
      setFeedback(post.feedback, 'warn');
    }
    renderBuildWorkbench();
  });

  hintBtn.addEventListener('click', () => {
    const next = getAvailableNextTask(buildState);
    if (!next) {
      setFeedback('Every part is installed! Click "Power On" to run POST diagnostics.', 'ok');
      return;
    }
    buildState.selectedPart = next.id;
    highlightZone = next.zone;
    const z = BUILD_ZONES.find((zone) => zone.id === next.zone);
    if (z && workbench3d) workbench3d.focusCamera(z.cameraPreset);
    setFeedback(`Next step: ${next.label} -> ${z?.label || next.zone}. ${next.note}`, 'info');
    renderBuildWorkbench();
  });

  demoBtn.addEventListener('click', () => {
    const post = loadDemoCompletedBuild(buildState);
    sessionFlags.hasBootedAny = true;
    if (BUILD_PROFILES[buildState.profile].gpu) sessionFlags.hasBootedGpu = true;
    dataFlowEnabled = true;
    highlightZone = null;
    screenEl.textContent = post.postLines.slice(0, 3).join('  |  ');
    setFeedback(
      'Demo build loaded & powered on! Orbit the 3D view, toggle Data Flow, or switch profiles to compare integrated vs. discrete GPU hardware.',
      'ok',
    );
    workbench3d?.focusCamera('full');
    renderBuildWorkbench();
  });

  flowToggleBtn.addEventListener('click', () => {
    if (!buildState.booted) return;
    dataFlowEnabled = !dataFlowEnabled;
    renderBuildWorkbench();
  });

  function resetBuild(profileId = buildState.profile) {
    buildState = createBuildState(profileId);
    buildState.caughtIncompatible = sessionFlags.caughtIncompatible;
    buildState.hasBootedAny = sessionFlags.hasBootedAny;
    buildState.hasBootedGpu = sessionFlags.hasBootedGpu;
    dataFlowEnabled = false;
    highlightZone = null;
    screenEl.textContent = 'MONITOR · standby (finish assembly before power-on)';
    setFeedback('New build started. Begin with ESD workspace preparation on the bench mat.', 'info');
    workbench3d?.focusCamera('full');
    renderBuildWorkbench();
  }

  resetBtn.addEventListener('click', () => resetBuild(buildState.profile));
  profileSelect.addEventListener('change', () => resetBuild(profileSelect.value));

  // Initialize 3D WebGL Workbench (falls back seamlessly to 2D if unavailable)
  workbench3d = createPCWorkbench3D(canvas3d, {
    onZoneClick: (zoneId) => handleZoneSelect(zoneId),
    onCpuClick: (action) => {
      if (buildState.completed.has('board') && !buildState.completed.has('cpu')) {
        buildState.selectedPart = 'cpu';
      }
      handleCpuAction(action);
    },
  });
  if (!workbench3d) {
    setViewMode('2d');
  } else {
    setViewMode('3d');
  }

  /* ── TAB 2: MEMORY & CPU EXECUTION LAB ───────────────────────────────── */
  const memPredictSelect = document.getElementById('mem-predict');
  const memRamBar = document.getElementById('mem-ram-bar');
  const memRamLabel = document.getElementById('mem-ram-label');
  const memPowerBadge = document.getElementById('mem-power-badge');
  const memRamDocEl = document.getElementById('mem-ram-doc');
  const memAppsEl = document.getElementById('mem-apps');
  const memSsdBar = document.getElementById('mem-ssd-bar');
  const memSsdLabel = document.getElementById('mem-ssd-label');
  const memSsdDocEl = document.getElementById('mem-ssd-doc');
  const memNoteEl = document.getElementById('mem-note');
  const memAutosaveBtn = document.getElementById('mem-autosave');

  const cpuPhasesEls = [...document.querySelectorAll('[data-cpu-phase]')];
  const cpuProgListEl = document.getElementById('cpu-program-list');
  const cpuPcEl = document.getElementById('cpu-reg-pc');
  const cpuIrEl = document.getElementById('cpu-reg-ir');
  const cpuRegAEl = document.getElementById('cpu-reg-a');
  const cpuRegBEl = document.getElementById('cpu-reg-b');
  const cpuAluEl = document.getElementById('cpu-reg-alu');
  const cpuOutEl = document.getElementById('cpu-reg-out');
  const cpuNoteEl = document.getElementById('cpu-cycle-note');

  function renderMemoryLab() {
    const pctRam = Math.min(100, Math.round((memoryState.ramUsedGb / RAM_CAPACITY_GB) * 100));
    memRamBar.style.width = `${pctRam}%`;
    memRamBar.dataset.pressure = memoryState.ramPressure;
    memRamLabel.textContent = memoryState.powerOn
      ? `${memoryState.ramUsedGb} / ${RAM_CAPACITY_GB} GB${memoryState.swapGb > 0 ? ` (+${memoryState.swapGb} GB SSD swap!)` : ''}`
      : '0.0 / 16 GB (Power OFF)';

    memPowerBadge.textContent = memoryState.powerOn ? 'POWER ON' : 'POWER OFF';
    memPowerBadge.dataset.power = memoryState.powerOn ? 'on' : 'off';

    memRamDocEl.textContent = memoryState.powerOn
      ? memoryState.ramDoc || 'RAM doc buffer: empty'
      : 'Cleared on power loss!';
    memRamDocEl.classList.toggle('is-wiped', !memoryState.powerOn);

    memAutosaveBtn.setAttribute('aria-pressed', String(memoryState.autosave));
    memAutosaveBtn.textContent = `Autosave: ${memoryState.autosave ? 'On' : 'Off'}`;

    memAppsEl.replaceChildren();
    for (const app of MEMORY_APPS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = memoryState.powerOn && memoryState.openApps.has(app.id);
      btn.className = `ac-app-pill${active ? ' is-open' : ''}`;
      btn.setAttribute('aria-pressed', String(active));
      btn.disabled = !memoryState.powerOn;
      btn.textContent = `${app.name} (${app.ramGb} GB)`;
      btn.addEventListener('click', () => {
        memoryAction(memoryState, 'toggleApp', app.id);
        renderMemoryLab();
      });
      memAppsEl.append(btn);
    }

    const pctSsd = Math.min(100, Math.round((memoryState.ssdUsedGb / SSD_CAPACITY_GB) * 100));
    memSsdBar.style.width = `${pctSsd}%`;
    memSsdLabel.textContent = `${memoryState.ssdUsedGb} / ${SSD_CAPACITY_GB} GB (${SSD_CAPACITY_GB - memoryState.ssdUsedGb} GB free)`;
    memSsdDocEl.textContent = memoryState.savedDoc || 'No saved story file yet';

    memNoteEl.textContent = memoryState.predictionOutcome
      ? `${memoryState.lastNote} ${memoryState.predictionOutcome}`
      : memoryState.lastNote;
    updateChallenges();
  }

  function renderCpuLab() {
    cpuPhasesEls.forEach((el) => {
      el.classList.toggle('is-active', el.dataset.cpuPhase === cpuCycleState.phase);
    });
    cpuProgListEl.replaceChildren();
    CPU_PROGRAM.forEach((instr, i) => {
      const li = document.createElement('li');
      const isCurrent = !cpuCycleState.done && i === cpuCycleState.pc;
      li.className = isCurrent ? 'is-current' : '';
      li.innerHTML = `<code>[${instr.addr}] ${instr.text}</code>`;
      cpuProgListEl.append(li);
    });
    cpuPcEl.textContent = cpuCycleState.done ? 'DONE' : String(cpuCycleState.pc);
    cpuIrEl.textContent = cpuCycleState.ir;
    cpuRegAEl.textContent = String(cpuCycleState.regA);
    cpuRegBEl.textContent = String(cpuCycleState.regB);
    cpuAluEl.textContent = String(cpuCycleState.aluOut);
    cpuOutEl.textContent = cpuCycleState.screenOut;
    cpuNoteEl.textContent = cpuCycleState.explanation;
  }

  memPredictSelect.addEventListener('change', () => {
    memoryAction(memoryState, 'setPrediction', memPredictSelect.value);
    renderMemoryLab();
  });
  document.getElementById('mem-write').addEventListener('click', () => {
    memoryAction(memoryState, 'writeDraft');
    renderMemoryLab();
  });
  document.getElementById('mem-save').addEventListener('click', () => {
    memoryAction(memoryState, 'save');
    renderMemoryLab();
  });
  memAutosaveBtn.addEventListener('click', () => {
    memoryAction(memoryState, 'toggleAutosave');
    renderMemoryLab();
  });
  document.getElementById('mem-power-off').addEventListener('click', () => {
    memoryAction(memoryState, 'cutPower');
    renderMemoryLab();
  });
  document.getElementById('mem-power-on').addEventListener('click', () => {
    memoryAction(memoryState, 'powerOn');
    renderMemoryLab();
  });
  document.getElementById('mem-open').addEventListener('click', () => {
    memoryAction(memoryState, 'openSaved');
    renderMemoryLab();
  });
  document.getElementById('mem-reset').addEventListener('click', () => {
    memoryAction(memoryState, 'reset');
    memPredictSelect.value = '';
    renderMemoryLab();
  });
  document.getElementById('mem-add-video').addEventListener('click', () => {
    memoryAction(memoryState, 'addBigVideo');
    renderMemoryLab();
  });
  document.getElementById('mem-clear-videos').addEventListener('click', () => {
    memoryAction(memoryState, 'clearVideos');
    renderMemoryLab();
  });

  document.getElementById('cpu-step').addEventListener('click', () => {
    stepCpuCycle(cpuCycleState);
    renderCpuLab();
  });
  document.getElementById('cpu-reset').addEventListener('click', () => {
    cpuCycleState = createCpuCycleState();
    renderCpuLab();
  });

  /* ── TAB 3: INTERNET PACKET JOURNEY LAB ──────────────────────────────── */
  const netPrevBtn = document.getElementById('net-prev');
  const netPlayBtn = document.getElementById('net-play');
  const netNextBtn = document.getElementById('net-next');
  const netResetBtn = document.getElementById('net-reset');
  const netCountEl = document.getElementById('net-step-count');

  const netWifiBtn = document.getElementById('net-toggle-wifi');
  const netIspBtn = document.getElementById('net-toggle-isp');
  const netDnsBtn = document.getElementById('net-toggle-dns');
  const netHttpsBtn = document.getElementById('net-toggle-https');

  const netTitleEl = document.getElementById('net-step-title');
  const netStatusEl = document.getElementById('net-step-status');
  const netDetailEl = document.getElementById('net-step-detail');
  const netPktSrc = document.getElementById('net-pkt-src');
  const netPktDst = document.getElementById('net-pkt-dst');
  const netPktProto = document.getElementById('net-pkt-proto');
  const netPktPayload = document.getElementById('net-pkt-payload');
  const netPillsEl = document.getElementById('net-step-pills');
  const netSvg = document.getElementById('net-svg');

  function syncNetPlayButton() {
    netPlayBtn.textContent = netPlayTimer ? 'Pause' : 'Play Trip';
    netPlayBtn.setAttribute('aria-pressed', String(Boolean(netPlayTimer)));
  }

  function renderNetworkLab() {
    const view = evaluateNetworkStep(networkState);
    netCountEl.textContent = `Step ${view.stepIndex + 1} / ${view.totalSteps}`;
    netPrevBtn.disabled = view.stepIndex === 0;
    netNextBtn.disabled = view.stepIndex === view.totalSteps - 1;

    netWifiBtn.setAttribute('aria-pressed', String(networkState.wifiConnected));
    netWifiBtn.textContent = `Wi-Fi: ${networkState.wifiConnected ? 'ON' : 'OFF'}`;
    netIspBtn.setAttribute('aria-pressed', String(networkState.ispOnline));
    netIspBtn.textContent = `ISP Internet: ${networkState.ispOnline ? 'ON' : 'DOWN'}`;
    netDnsBtn.setAttribute('aria-pressed', String(networkState.dnsCached));
    netDnsBtn.textContent = `DNS Cache: ${networkState.dnsCached ? 'HIT' : 'EMPTY'}`;
    netHttpsBtn.setAttribute('aria-pressed', String(networkState.httpsEnabled));
    netHttpsBtn.textContent = `HTTPS: ${networkState.httpsEnabled ? 'ENCRYPTED' : 'HTTP'}`;

    netTitleEl.textContent = view.step.title;
    netStatusEl.textContent =
      view.status === 'blocked' ? 'BLOCKED' : view.status === 'cached' ? 'CACHED' : 'OK';
    netStatusEl.dataset.netStatus = view.status;
    netDetailEl.textContent = view.detail;

    netPktSrc.textContent = view.packet.src;
    netPktDst.textContent = view.packet.dst;
    netPktProto.textContent = view.packet.protocol;
    netPktPayload.textContent = view.packet.payload;

    // Render step selector pills
    netPillsEl.replaceChildren();
    INTERNET_STEPS.forEach((step, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `ac-step-pill${idx === view.stepIndex ? ' is-active' : ''}`;
      btn.textContent = `${idx + 1}. ${step.title}`;
      btn.addEventListener('click', () => {
        stepNetwork(networkState, idx, true);
        renderNetworkLab();
      });
      netPillsEl.append(btn);
    });

    // Update SVG links and node highlights
    const linkWifi = netSvg.querySelector('[data-net-link="wifi"]');
    const linkDns = netSvg.querySelector('[data-net-link="dns"]');
    const linkIsp = netSvg.querySelector('[data-net-link="isp"]');
    const linkServer = netSvg.querySelector('[data-net-link="server"]');

    if (linkWifi) linkWifi.setAttribute('data-state', networkState.wifiConnected ? 'up' : 'down');
    if (linkDns) linkDns.setAttribute('data-state', networkState.wifiConnected && networkState.ispOnline ? 'up' : 'down');
    if (linkIsp) linkIsp.setAttribute('data-state', networkState.wifiConnected && networkState.ispOnline ? 'up' : 'down');
    if (linkServer) linkServer.setAttribute('data-state', networkState.wifiConnected && networkState.ispOnline ? 'up' : 'down');

    netSvg.querySelectorAll('[data-net-node]').forEach((nodeEl) => {
      const id = nodeEl.getAttribute('data-net-node');
      nodeEl.classList.toggle('is-active', id === view.activeTo || id === view.activeFrom);
      nodeEl.classList.toggle('is-blocked', id === view.stalledAt);
    });

    const targetNode = NETWORK_NODES.find((n) => n.id === view.activeTo) || NETWORK_NODES[0];
    const orb = document.getElementById('net-packet-orb');
    if (orb) {
      orb.setAttribute('cx', String(targetNode.x));
      orb.setAttribute('cy', String(targetNode.y - 34));
      orb.setAttribute('fill', view.status === 'blocked' ? '#fb7185' : view.status === 'cached' ? '#fbbf24' : '#38bdf8');
    }

    updateChallenges();
  }

  netPrevBtn.addEventListener('click', () => {
    stepNetwork(networkState, -1);
    renderNetworkLab();
  });
  netNextBtn.addEventListener('click', () => {
    stepNetwork(networkState, 1);
    renderNetworkLab();
  });
  netResetBtn.addEventListener('click', () => {
    if (netPlayTimer) {
      clearInterval(netPlayTimer);
      netPlayTimer = 0;
      syncNetPlayButton();
    }
    const testedOutage = networkState.testedIspOutage;
    networkState = createNetworkState();
    networkState.testedIspOutage = testedOutage;
    renderNetworkLab();
  });
  netPlayBtn.addEventListener('click', () => {
    if (netPlayTimer) {
      clearInterval(netPlayTimer);
      netPlayTimer = 0;
      syncNetPlayButton();
      return;
    }
    if (networkState.stepIndex >= INTERNET_STEPS.length - 1) {
      stepNetwork(networkState, 0, true);
      renderNetworkLab();
    }
    netPlayTimer = setInterval(() => {
      if (networkState.stepIndex >= INTERNET_STEPS.length - 1) {
        clearInterval(netPlayTimer);
        netPlayTimer = 0;
        syncNetPlayButton();
        return;
      }
      stepNetwork(networkState, 1);
      renderNetworkLab();
    }, 1150);
    syncNetPlayButton();
  });

  netWifiBtn.addEventListener('click', () => {
    setNetworkCondition(networkState, 'wifiConnected', !networkState.wifiConnected);
    renderNetworkLab();
  });
  netIspBtn.addEventListener('click', () => {
    setNetworkCondition(networkState, 'ispOnline', !networkState.ispOnline);
    if (!networkState.ispOnline && networkState.wifiConnected && networkState.stepIndex >= 2) {
      networkState.testedIspOutage = true;
    }
    renderNetworkLab();
  });
  netDnsBtn.addEventListener('click', () => {
    setNetworkCondition(networkState, 'dnsCached', !networkState.dnsCached);
    renderNetworkLab();
  });
  netHttpsBtn.addEventListener('click', () => {
    setNetworkCondition(networkState, 'httpsEnabled', !networkState.httpsEnabled);
    renderNetworkLab();
  });

  /* ── TAB 4: HARDWARE DETECTIVE ───────────────────────────────────────── */
  const detCaseTabsEl = document.getElementById('det-case-tabs');
  const detScoreEl = document.getElementById('det-score');
  const detTitleEl = document.getElementById('det-title');
  const detSymptomEl = document.getElementById('det-symptom');
  const detToolsEl = document.getElementById('det-tools');
  const detReadingsEl = document.getElementById('det-readings');
  const detOptionsEl = document.getElementById('det-options');
  const detVerdictEl = document.getElementById('det-verdict');

  function renderDetectiveLab() {
    const activeCase =
      DETECTIVE_CASES.find((c) => c.id === detectiveState.activeCaseId) || DETECTIVE_CASES[0];
    const inspected = detectiveState.inspectedByCase[activeCase.id] || new Set();

    detScoreEl.textContent = `Solved: ${detectiveState.solvedIds.size} / ${DETECTIVE_CASES.length}`;

    detCaseTabsEl.replaceChildren();
    DETECTIVE_CASES.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const solved = detectiveState.solvedIds.has(c.id);
      btn.className = `ac-case-tab${c.id === activeCase.id ? ' is-active' : ''}${solved ? ' is-solved' : ''}`;
      btn.textContent = `${solved ? '✓ ' : ''}Case ${idx + 1}`;
      btn.addEventListener('click', () => {
        detectiveState.activeCaseId = c.id;
        detectiveState.lastResult = null;
        renderDetectiveLab();
      });
      detCaseTabsEl.append(btn);
    });

    detTitleEl.textContent = activeCase.title;
    detSymptomEl.textContent = activeCase.symptom;

    detToolsEl.replaceChildren();
    for (const tool of DETECTIVE_TOOLS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      const used = inspected.has(tool.id);
      btn.className = `ac-tool-btn${used ? ' is-used' : ''}`;
      btn.setAttribute('aria-pressed', String(used));
      btn.textContent = `${used ? '✓ ' : ''}${tool.label}`;
      btn.addEventListener('click', () => {
        runDiagnosticTool(detectiveState, activeCase.id, tool.id);
        renderDetectiveLab();
      });
      detToolsEl.append(btn);
    }

    detReadingsEl.replaceChildren();
    if (!inspected.size) {
      const p = document.createElement('p');
      p.className = 'ac-det-empty';
      p.textContent = 'Run one or more diagnostic tools above to gather hardware telemetry before choosing a diagnosis.';
      detReadingsEl.append(p);
    } else {
      for (const tool of DETECTIVE_TOOLS) {
        if (!inspected.has(tool.id)) continue;
        const item = document.createElement('div');
        item.className = `ac-reading-item${tool.id === activeCase.keyTool ? ' is-key' : ''}`;
        const label = document.createElement('strong');
        label.textContent = tool.label;
        const text = document.createElement('span');
        text.textContent = activeCase.readings[tool.id];
        item.append(label, text);
        detReadingsEl.append(item);
      }
    }

    detOptionsEl.replaceChildren();
    activeCase.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ac-choice-btn';
      btn.textContent = optText;
      btn.addEventListener('click', () => {
        const res = submitDiagnosis(detectiveState, activeCase.id, idx);
        renderDetectiveLab();
        detVerdictEl.textContent = res.feedback;
        detVerdictEl.dataset.tone = res.ok ? 'ok' : 'warn';
      });
      detOptionsEl.append(btn);
    });

    if (detectiveState.lastResult && detectiveState.lastResult.caseId === activeCase.id) {
      detVerdictEl.textContent = detectiveState.lastResult.feedback;
      detVerdictEl.dataset.tone = detectiveState.lastResult.ok ? 'ok' : 'warn';
    } else if (detectiveState.solvedIds.has(activeCase.id)) {
      detVerdictEl.textContent = `✓ Solved: ${activeCase.explanation}`;
      detVerdictEl.dataset.tone = 'ok';
    } else {
      detVerdictEl.textContent = 'Inspect telemetry, then select the evidence-backed diagnosis.';
      detVerdictEl.dataset.tone = 'info';
    }

    updateChallenges();
  }

  /* ── EDITORIAL INTERACTIVES (Hardware Explorer, Software Tracer, Quiz) ── */
  const partButtons = [...document.querySelectorAll('[data-part]')];
  const partDetailEl = document.getElementById('part-detail');

  partButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      partButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const part = HARDWARE_PARTS[Number(btn.dataset.part)];
      if (!part || !partDetailEl) return;
      partDetailEl.replaceChildren();
      const h3 = document.createElement('h3');
      h3.textContent = `${part.short} · ${part.full}`;
      const pRole = document.createElement('p');
      pRole.textContent = part.role;
      const pMeta = document.createElement('p');
      pMeta.innerHTML = `<strong>Specs:</strong> ${part.specs} · <strong>Location:</strong> ${part.location}`;
      const pAnalogy = document.createElement('p');
      pAnalogy.innerHTML = `<strong>Kitchen analogy:</strong> ${part.analogy}`;
      partDetailEl.append(h3, pRole, pMeta, pAnalogy);
    });
  });

  const scenarioBtns = [...document.querySelectorAll('[data-stack-scenario]')];
  const stackOutputEl = document.getElementById('stack-trace-output');

  function renderSoftwareScenario(id) {
    const scenario = SOFTWARE_SCENARIOS.find((s) => s.id === id) || SOFTWARE_SCENARIOS[0];
    scenarioBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.stackScenario === scenario.id)));
    if (!stackOutputEl) return;
    stackOutputEl.replaceChildren();
    const lead = document.createElement('p');
    lead.className = 'ac-stack-summary';
    lead.innerHTML = `<strong>${scenario.title}:</strong> ${scenario.summary}`;
    const ol = document.createElement('ol');
    ol.className = 'ac-stack-steps';
    for (const step of scenario.layers) {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = step.layer;
      const span = document.createElement('span');
      span.textContent = step.detail;
      li.append(strong, span);
      ol.append(li);
    }
    stackOutputEl.append(lead, ol);
  }

  scenarioBtns.forEach((btn) => {
    btn.addEventListener('click', () => renderSoftwareScenario(btn.dataset.stackScenario));
  });
  renderSoftwareScenario('draw');

  // Quick studio jump buttons inside editorial cards
  document.querySelectorAll('[data-jump-studio]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.jumpStudio);
      studio.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // 7-Question Check Your Understanding Quiz
  const quizForm = document.getElementById('anatomy-quiz');
  const quizResultEl = document.getElementById('quiz-result');
  if (quizForm) {
    quizForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(quizForm);
      const selected = QUIZ_QUESTIONS.map((q) => {
        const val = data.get(q.id);
        return val === null ? -1 : Number(val);
      });
      const graded = gradeQuiz(selected);
      graded.results.forEach((item) => {
        const fb = document.getElementById(`quiz-fb-${item.id}`);
        if (!fb) return;
        fb.hidden = false;
        fb.dataset.tone = item.correct ? 'ok' : 'warn';
        fb.textContent = `${item.correct ? '✓ Correct: ' : '✗ Review: '}${item.explanation}`;
      });
      if (quizResultEl) {
        quizResultEl.textContent = `${graded.score} of ${graded.total} correct. ${
          graded.allCorrect
            ? 'Excellent! Explain your reasoning for Question 6 and Question 7 to a partner.'
            : 'Review the inline notes above, adjust your answers, and re-check.'
        }`;
      }
    });
  }

  /* ── Initial Render ────────────────────────────────────────────────────── */
  setActiveTab('build');
  setSubtab('parts');
  renderBuildWorkbench();
  renderMemoryLab();
  renderCpuLab();
  renderNetworkLab();
  renderDetectiveLab();
})();
