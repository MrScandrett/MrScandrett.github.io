(function () {
  // Physics, grading and constants live in assets/js/lessons/bridge-lab-core.js (tested).
  const Core = window.BridgeLabCore;
  const { TARGET_LOAD, AMBULANCE_WEIGHT, LEVEL_BUDGET, LEFT_ANCHOR_ID, RIGHT_ANCHOR_ID, DECK_Y, BUILD_ZONE, GRID,
    ROAD_FAILURE_SAG, ROAD_FAILURE_SLOPE, VERLET_DAMPING, MATERIALS, REQUIRED_TRIANGLES,
    nodeMapFrom, distance, clamp, computeCost, findRoadPath, locateVehicle } = Core;
  const FAILURE_MESSAGES = {
    strain: 'One or more members stretched too far. Shorten the longest panel or swap a critical brace to steel.',
    sag: 'The road sagged too much. Add lower joints and triangles under the longest road panels.',
    slope: 'The road became too steep for the ambulance. Pull the deck flatter with deeper support triangles.'
  };

  const TOOL_HINTS = {
    move: {
      label: 'Move Tool',
      copy: 'Move selected. Drag any free joint to change the bridge shape and update the member lengths.',
      prompt: 'Drag joints to flatten the road or deepen the truss before the next test.'
    },
    road: {
      label: 'Road Tool',
      copy: 'Road selected. Click the grid to place a joint, then click another joint to connect a road segment.',
      prompt: 'Road is the driveable deck. Keep it continuous and reasonably flat from bank to bank.'
    },
    wood: {
      label: 'Wood Tool',
      copy: 'Wood selected. Use it for short braces and triangles under the deck where cost matters.',
      prompt: 'Wood is cheaper than steel. Use it to turn long flat spans into smaller triangular panels.'
    },
    steel: {
      label: 'Steel Tool',
      copy: 'Steel selected. Save it for longer spans, bottom chords, or braces that keep stretching.',
      prompt: 'Steel is stiffer and pricier. Use it where wood keeps sagging too much.'
    },
    delete: {
      label: 'Delete Tool',
      copy: 'Delete selected. Click one member or one non-anchor joint to remove it from the design.',
      prompt: 'Trim extra pieces, remove bad joints, and watch the budget come back under control.'
    }
  };

  const toolButtons = document.querySelectorAll('[data-tool]');
  const testButton = document.getElementById('bridge-test-btn');
  const exampleButton = document.getElementById('bridge-example-btn');
  const resetButton = document.getElementById('bridge-reset-btn');
  const undoButton = document.getElementById('bridge-undo-btn');
  const blueprintToggle = document.getElementById('bridge-blueprint-toggle');

  const svg = document.getElementById('bridge-svg');
  const stage = document.getElementById('bridge-stage');
  const reactionLayer = document.getElementById('bridge-reaction-layer');
  const memberLayer = document.getElementById('bridge-member-layer');
  const nodeLayer = document.getElementById('bridge-node-layer');
  const selectionLayer = document.getElementById('bridge-selection-layer');
  const ambulance = document.getElementById('bridge-ambulance');

  const statusCard = document.getElementById('bridge-status-card');
  const statusPill = document.getElementById('bridge-status-pill');
  const budgetDisplay = document.getElementById('bridge-budget-display');
  const budgetSummary = document.getElementById('bridge-budget-summary');
  const budgetBar = document.getElementById('bridge-budget-bar');
  const riskSummary = document.getElementById('bridge-risk-summary');
  const riskBar = document.getElementById('bridge-risk-bar');
  const targetEl = document.getElementById('bridge-target');
  const deckPathEl = document.getElementById('bridge-deck-path');
  const strainEl = document.getElementById('bridge-strain');
  const sagEl = document.getElementById('bridge-sag');
  const slopeEl = document.getElementById('bridge-slope');
  const vehicleStatusEl = document.getElementById('bridge-vehicle-status');
  const verdictEl = document.getElementById('bridge-verdict');
  const stageNote = document.getElementById('bridge-stage-note');
  const toolCopy = document.getElementById('bridge-tool-copy');
  const toolLabel = document.getElementById('bridge-tool-label');
  const stagePrompt = document.getElementById('bridge-stage-prompt');
  const replayBtn = document.getElementById('bridge-replay-btn');
  const scoreEl = document.getElementById('bridge-score');
  const bestScoreEl = document.getElementById('bridge-best-score');
  const attemptsEl = document.getElementById('bridge-attempts');
  const readyRoadEl = document.getElementById('bridge-ready-road');
  const readyTrianglesEl = document.getElementById('bridge-ready-triangles');
  const readyBudgetEl = document.getElementById('bridge-ready-budget');
  const readyTestedEl = document.getElementById('bridge-ready-tested');
  const missionSteps = document.querySelectorAll('[data-mission-step]');
  const triangleStepNote = document.querySelector('[data-mission-step="triangles"] small');
  const quizScoreEl = document.getElementById('bridge-quiz-score');

  let bridgeState = createStarterState();
  let selectedTool = 'road';
  let selectedNodeId = null;
  let dragState = null;
  let suppressClick = false;
  let animationFrameId = 0;
  let testState = createEmptyTestState();
  let testSpeed = 1;
  let history = [];
  let attempts = 0;
  let lastScore = null;
  let bestScore = readBestScore();
  let editNotice = '';
  const quizResults = new Map();

  function readBestScore() {
    try {
      const value = Number(window.localStorage.getItem('bridge-lab-best-score'));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch (error) {
      return null;
    }
  }

  function saveBestScore(score) {
    try {
      window.localStorage.setItem('bridge-lab-best-score', String(score));
    } catch (error) {
      /* Storage can be unavailable in private or embedded contexts. */
    }
  }

  function cloneBridgeState(state) {
    return {
      nodes: state.nodes.map((node) => Object.assign({}, node)),
      members: state.members.map((member) => Object.assign({}, member)),
      nextNodeId: state.nextNodeId,
      nextMemberId: state.nextMemberId
    };
  }

  function rememberState() {
    history.push(cloneBridgeState(bridgeState));
    if (history.length > 30) history.shift();
    undoButton.disabled = false;
  }

  // Keep an undo step only when the edit changed something (tapping a joint used to add one).
  function commitIfChanged(before) {
    if (JSON.stringify(before) === JSON.stringify(cloneBridgeState(bridgeState))) return;
    history.push(before);
    if (history.length > 30) history.shift();
    undoButton.disabled = false;
  }

  function undoLastChange() {
    if (!history.length || testState.running) return;
    bridgeState = history.pop();
    editNotice = '';
    selectedNodeId = null;
    lastScore = null;
    clearTestState();
    undoButton.disabled = history.length === 0;
    render();
    updateDashboard();
  }

  function createNode(id, x, y, fixed) {
    return {
      id,
      x,
      y,
      fixed: Boolean(fixed)
    };
  }

  function createMember(id, a, b, type, nodes) {
    return {
      id,
      a,
      b,
      type,
      restLength: distance(nodeMapFrom(nodes).get(a), nodeMapFrom(nodes).get(b))
    };
  }

  function createStarterState() {
    const nodes = [
      createNode(LEFT_ANCHOR_ID, 170, DECK_Y, true),
      createNode(1, 280, DECK_Y, false),
      createNode(2, 390, DECK_Y, false),
      createNode(3, 500, DECK_Y, false),
      createNode(RIGHT_ANCHOR_ID, 610, DECK_Y, true)
    ];

    return {
      nodes,
      members: [
        createMember(0, 0, 1, 'road', nodes),
        createMember(1, 1, 2, 'road', nodes),
        createMember(2, 2, 3, 'road', nodes),
        createMember(3, 3, 4, 'road', nodes)
      ],
      nextNodeId: 5,
      nextMemberId: 4
    };
  }

  function createExampleState() {
    const nodes = [
      createNode(LEFT_ANCHOR_ID, 170, DECK_Y, true),
      createNode(1, 280, DECK_Y, false),
      createNode(2, 390, DECK_Y, false),
      createNode(3, 500, DECK_Y, false),
      createNode(RIGHT_ANCHOR_ID, 610, DECK_Y, true),
      createNode(5, 225, 244, false),
      createNode(6, 335, 244, false),
      createNode(7, 445, 244, false),
      createNode(8, 555, 244, false)
    ];

    return {
      nodes,
      members: [
        createMember(0, 0, 1, 'road', nodes),
        createMember(1, 1, 2, 'road', nodes),
        createMember(2, 2, 3, 'road', nodes),
        createMember(3, 3, 4, 'road', nodes),
        createMember(4, 0, 5, 'wood', nodes),
        createMember(5, 5, 1, 'wood', nodes),
        createMember(6, 1, 6, 'wood', nodes),
        createMember(7, 6, 2, 'wood', nodes),
        createMember(8, 2, 7, 'wood', nodes),
        createMember(9, 7, 3, 'wood', nodes),
        createMember(10, 3, 8, 'wood', nodes),
        createMember(11, 8, 4, 'wood', nodes),
        createMember(12, 5, 6, 'steel', nodes),
        createMember(13, 6, 7, 'steel', nodes),
        createMember(14, 7, 8, 'steel', nodes)
      ],
      nextNodeId: 9,
      nextMemberId: 15
    };
  }

  function createEmptyTestState() {
    return {
      running: false,
      finished: false,
      result: 'edit',
      message: 'Connect the road, add triangles, then run the ambulance test.',
      progress: 0,
      path: null,
      simNodes: null,
      memberRatios: new Map(),
      memberStress: new Map(),
      maxStrain: 0,
      maxSag: 0,
      maxSlope: 0,
      vehicleLabel: 'Waiting on the left bank',
      collapsing: false,
      collapseFrames: 0,
      collapseMessage: '',
      reactionForces: {
        left: 0,
        right: 0
      },
      elapsedMs: 0,
      failureFeedbackPlayed: false,
      run: null,
      tickBudget: 0
    };
  }

  function nodeById(nodes, id) {
    return nodes.find((node) => node.id === id) || null;
  }

  function isBuildTool(tool) {
    return tool === 'road' || tool === 'wood' || tool === 'steel';
  }

  function formatCurrency(value) {
    return '$' + Math.round(value).toLocaleString();
  }

  function asPercent(value) {
    return Math.round(value * 100) + '%';
  }

  function memberBetween(state, a, b) {
    return state.members.find((member) => {
      return (member.a === a && member.b === b) || (member.a === b && member.b === a);
    }) || null;
  }

  function setMemberRestLength(member) {
    const lookup = nodeMapFrom(bridgeState.nodes);
    member.restLength = distance(lookup.get(member.a), lookup.get(member.b));
  }

  function updateConnectedRestLengths(nodeId) {
    bridgeState.members.forEach((member) => {
      if (member.a === nodeId || member.b === nodeId) {
        setMemberRestLength(member);
      }
    });
  }

  function stopAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
  }

  function clearTestState() {
    stopAnimation();
    testState = createEmptyTestState();
  }

  function loadState(factory) {
    rememberState();
    bridgeState = factory();
    editNotice = '';
    selectedNodeId = null;
    dragState = null;
    suppressClick = false;
    ambulance.classList.remove('bridge-amb-running');
    replayBtn.style.display = 'none';
    clearTestState();
    lastScore = null;
    render();
    updateDashboard();
  }

  function computeMemberStress(displayNodes) {
    return Core.computeMemberStress(bridgeState, displayNodes);
  }

  function ratiosFromStress(stressMap) {
    const ratios = new Map();
    stressMap.forEach((entry, memberId) => {
      ratios.set(memberId, entry.ratio);
    });
    return ratios;
  }

  function stressStyle(member, stress) {
    const material = MATERIALS[member.type];
    const baseline = {
      stroke: material.color,
      width: material.width,
      className: 'bridge-member',
      opacity: member.type === 'road' ? '1' : '0.95'
    };

    if (!stress) {
      return baseline;
    }

    let ratio = stress.ratio;
    if (testState.collapsing) {
      ratio = Math.max(ratio, Math.min(1.35, (testState.collapseFrames / 38) * 1.45));
    }

    if (ratio < 0.08) {
      return baseline;
    }

    const intensity = clamp(0, ratio, 1.3);
    const lightness = stress.mode === 'tension'
      ? (84 - (intensity * 38))
      : (88 - (intensity * 46));
    const stroke = stress.mode === 'tension'
      ? 'hsl(209 100% ' + lightness.toFixed(1) + '%)'
      : 'hsl(5 94% ' + lightness.toFixed(1) + '%)';

    return {
      stroke,
      width: (material.width * (1 + Math.min(0.55, intensity * 0.34))).toFixed(2),
      className: 'bridge-member bridge-member--active',
      opacity: (0.86 + Math.min(0.14, intensity * 0.1)).toFixed(2)
    };
  }

  function computeReactionForces(path, nodes, progress) {
    if (!path || path.length < 2) {
      return { left: 0, right: 0 };
    }

    const lookup = nodeMapFrom(nodes);
    const left = lookup.get(LEFT_ANCHOR_ID);
    const right = lookup.get(RIGHT_ANCHOR_ID);
    const vehicle = locateVehicle(path, nodes, progress);

    if (!left || !right || !vehicle) {
      return {
        left: TARGET_LOAD * 0.5,
        right: TARGET_LOAD * 0.5
      };
    }

    const span = Math.max(1, right.x - left.x);
    const t = clamp(0, (vehicle.x - left.x) / span, 1);
    const deadLoad = TARGET_LOAD * 0.18;
    const liveLoad = TARGET_LOAD * 0.82;

    return {
      left: (deadLoad * 0.5) + (liveLoad * (1 - t)),
      right: (deadLoad * 0.5) + (liveLoad * t)
    };
  }

  function reactionArrowMarkup(anchor, force, side) {
    const height = 18 + (force * 0.85);
    const width = 11 + (force * 0.06);
    const shaftWidth = Math.max(2.5, width * 0.18);
    const tipY = anchor.y - height;
    const baseY = anchor.y + 16;
    const direction = side === 'left' ? -1 : 1;
    const labelX = anchor.x + (direction * 20);
    const labelAnchor = side === 'left' ? 'end' : 'start';

    return '<g class="bridge-reaction-vector" aria-hidden="true">' +
      '<path d="M ' + anchor.x.toFixed(1) + ' ' + baseY.toFixed(1) +
      ' L ' + anchor.x.toFixed(1) + ' ' + (tipY + 22).toFixed(1) +
      '" stroke="rgba(104, 255, 188, 0.68)" stroke-width="' + shaftWidth.toFixed(1) +
      '" stroke-linecap="round"></path>' +
      '<path d="M ' + (anchor.x - (width * 0.5)).toFixed(1) + ' ' + (tipY + 18).toFixed(1) +
      ' L ' + anchor.x.toFixed(1) + ' ' + tipY.toFixed(1) +
      ' L ' + (anchor.x + (width * 0.5)).toFixed(1) + ' ' + (tipY + 18).toFixed(1) +
      '" fill="rgba(104, 255, 188, 0.48)"></path>' +
      '<text x="' + labelX.toFixed(1) + '" y="' + (tipY - 10).toFixed(1) + '" fill="rgba(230,255,243,0.9)" font-size="12" font-weight="700" text-anchor="' + labelAnchor + '">' +
      Math.round(force) + ' kN</text>' +
      '</g>';
  }

  function renderReactionVectors(displayNodes) {
    const lookup = nodeMapFrom(displayNodes);
    const leftAnchor = lookup.get(LEFT_ANCHOR_ID);
    const rightAnchor = lookup.get(RIGHT_ANCHOR_ID);

    if (!leftAnchor || !rightAnchor) {
      reactionLayer.innerHTML = '';
      return;
    }

    const forces = (testState.running || testState.finished)
      ? testState.reactionForces
      : { left: TARGET_LOAD * 0.5, right: TARGET_LOAD * 0.5 };

    reactionLayer.innerHTML = [
      reactionArrowMarkup(leftAnchor, forces.left, 'left'),
      reactionArrowMarkup(rightAnchor, forces.right, 'right')
    ].join('');
  }

  function triggerFailureFeedback() {
    stage.classList.remove('is-shaking');
    void stage.offsetWidth;
    stage.classList.add('is-shaking');
    window.setTimeout(function () {
      stage.classList.remove('is-shaking');
    }, 480);

    if (window.navigator && typeof window.navigator.vibrate === 'function') {
      window.navigator.vibrate([85, 45, 120]);
    }
  }

  function renderVehicle(displayNodes) {
    window.BridgePuppet({ displayNodes, bridgeState, testState, ambulance, findRoadPath, locateVehicle });
  }

  function render() {
    const displayNodes = (testState.running || testState.finished) && testState.simNodes ? testState.simNodes : bridgeState.nodes;
    const lookup = nodeMapFrom(displayNodes);
    const stressMap = (testState.running || testState.finished) ? testState.memberStress : new Map();

    memberLayer.innerHTML = bridgeState.members.map((member) => {
      const a = lookup.get(member.a);
      const b = lookup.get(member.b);
      const style = stressStyle(member, stressMap.get(member.id));

      return window.BridgeMaterials.member(member, a, b, style, stressMap.get(member.id));
    }).join('');

    nodeLayer.innerHTML = displayNodes.map(window.BridgeMaterials.node).join('');

    if (!testState.running && !testState.finished && selectedNodeId != null) {
      const selected = lookup.get(selectedNodeId);
      selectionLayer.innerHTML = selected
        ? '<circle cx="' + selected.x.toFixed(1) + '" cy="' + selected.y.toFixed(1) + '" r="13" fill="none" stroke="#1f7bd3" stroke-width="3" stroke-dasharray="5 4"></circle>'
        : '';
    } else {
      selectionLayer.innerHTML = '';
    }

    renderReactionVectors(displayNodes);
    renderVehicle(displayNodes);
  }

  function finishTest(result, message) {
    stopAnimation();
    testState.running = false;
    testState.collapsing = false;
    testState.finished = true;
    testState.result = result;
    testState.message = message;
    testState.vehicleLabel = result === 'pass'
      ? 'Reached the clinic'
      : result === 'warn'
        ? 'Crossed, but over budget'
        : 'Test failed';
    testState.memberStress = testState.simNodes ? computeMemberStress(testState.simNodes) : new Map();
    testState.memberRatios = ratiosFromStress(testState.memberStress);
    testState.reactionForces = testState.path
      ? computeReactionForces(testState.path, testState.simNodes || bridgeState.nodes, testState.progress)
      : { left: 0, right: 0 };
    lastScore = result === 'pass' && testState.run ? Core.calculateScore(bridgeState, testState.run) : null;
    if (lastScore != null && (bestScore == null || lastScore > bestScore)) {
      bestScore = lastScore;
      saveBestScore(bestScore);
    }
    ambulance.classList.remove('bridge-amb-running');
    replayBtn.style.display = '';
    render();
    updateDashboard();
  }

  function runTest() {
    if (testState.running) return;
    attempts += 1;
    const path = findRoadPath(bridgeState, bridgeState.nodes);

    if (!path) {
      clearTestState();
      testState.finished = true;
      testState.result = 'fail';
      testState.message = 'The road is broken. Connect one continuous deck from bank to bank before you test.';
      testState.vehicleLabel = 'Cannot start';
      render();
      updateDashboard();
      return;
    }

    stopAnimation();
    selectedNodeId = null;
    testState = createEmptyTestState();
    testState.running = true;
    testState.run = Core.createCrossing(bridgeState);
    testState.path = path;
    testState.simNodes = testState.run.simNodes;
    testState.memberStress = computeMemberStress(testState.simNodes);
    testState.memberRatios = ratiosFromStress(testState.memberStress);
    testState.reactionForces = computeReactionForces(path, testState.simNodes, 0);
    testState.message = 'Ambulance rolling onto the bridge. Blue members are in tension, red members are in compression, and the green arrows show support reactions.';
    testState.vehicleLabel = 'Rolling onto the bridge';
    ambulance.classList.add('bridge-amb-running');
    replayBtn.style.display = 'none';

    let lastTimestamp = performance.now();

    function syncFromRun() {
      const run = testState.run;
      testState.progress = run.progress;
      testState.maxStrain = run.maxStrain;
      testState.maxSag = run.maxSag;
      testState.maxSlope = run.maxSlope;
      testState.memberStress = computeMemberStress(testState.simNodes);
      testState.memberRatios = ratiosFromStress(testState.memberStress);
      testState.reactionForces = computeReactionForces(testState.path, testState.simNodes, testState.progress);
    }

    function tick(timestamp) {
      if (!testState.running) {
        return;
      }

      /* ── Collapse animation (visual only: the result is already decided) ── */
      if (testState.collapsing) {
        testState.collapseFrames += 1;
        testState.simNodes.forEach(function (node) {
          if (node.fixed) { node.x = node.homeX; node.y = node.homeY; return; }
          var vx = (node.x - node.prevX) * VERLET_DAMPING;
          var vy = (node.y - node.prevY) * VERLET_DAMPING;
          node.prevX = node.x; node.prevY = node.y;
          node.x = clamp(BUILD_ZONE.left - 60, node.x + vx, BUILD_ZONE.right + 60);
          node.y = clamp(BUILD_ZONE.top - 20,  node.y + vy + 2.0, BUILD_ZONE.bottom + 120);
        });
        testState.memberStress = computeMemberStress(testState.simNodes);
        testState.memberRatios = ratiosFromStress(testState.memberStress);
        testState.reactionForces = computeReactionForces(testState.path, testState.simNodes, testState.progress);
        render();
        if (testState.collapseFrames >= 38) {
          finishTest('fail', testState.collapseMessage);
          return;
        }
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      // Fixed physics ticks: one tick per 60 Hz frame at 1×, whatever the screen's refresh
      // rate. Speed changes how many ticks are shown per frame, never the physics, so ½×,
      // 1× and 2× (and 60 Hz vs 120 Hz screens) reach the same verdict.
      const elapsed = Math.max(0, timestamp - lastTimestamp);
      testState.elapsedMs += elapsed;
      lastTimestamp = timestamp;
      testState.tickBudget = Math.min(testState.tickBudget + (elapsed / 16.6667) * testSpeed, 4);
      const run = testState.run;
      while (testState.tickBudget >= 1 && run.status === 'running') {
        Core.advanceCrossing(bridgeState, run);
        testState.tickBudget -= 1;
      }
      syncFromRun();
      testState.vehicleLabel = Math.round(testState.progress * 100) + '% across';
      render();
      updateDashboard();

      if (run.status === 'fail') {
        testState.collapsing = true;
        testState.collapseFrames = 0;
        testState.collapseMessage = FAILURE_MESSAGES[run.reason];
        if (!testState.failureFeedbackPlayed) {
          triggerFailureFeedback();
          testState.failureFeedbackPlayed = true;
        }
        verdictEl.textContent = 'Structure failing — collapse in progress.';
        statusPill.textContent = 'Collapsing';
        statusCard.classList.add('bridge-status-fail');
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      if (run.status === 'arrived') {
        if (computeCost(bridgeState) > LEVEL_BUDGET) {
          finishTest('warn', 'The ambulance made it, but the design missed the budget target. Remove extras or replace some steel with wood.');
        } else {
          finishTest('pass', 'Ambulance delivered. The road stayed flat enough and the load path held together.');
        }
        return;
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    animationFrameId = requestAnimationFrame(tick);
    render();
    updateDashboard();
  }

  function pointFromEvent(event) {
    // viewBox is "meet"-fitted: map through the drawn (maybe letterboxed) area, not the box.
    const b = svg.getBoundingClientRect(), k = Math.min(b.width / 780, b.height / 380) || 1;
    return { x: (event.clientX - b.left - (b.width - 780 * k) / 2) / k, y: (event.clientY - b.top - (b.height - 380 * k) / 2) / k };
  }

  function pointInBuildZone(point) {
    return point.x >= BUILD_ZONE.left - 10 &&
      point.x <= BUILD_ZONE.right + 10 &&
      point.y >= BUILD_ZONE.top - 10 &&
      point.y <= BUILD_ZONE.bottom + 10;
  }

  function snapPoint(point) {
    const snappedX = BUILD_ZONE.left + (Math.round((point.x - BUILD_ZONE.left) / GRID.x) * GRID.x);
    const snappedY = BUILD_ZONE.top + (Math.round((point.y - BUILD_ZONE.top) / GRID.y) * GRID.y);

    return {
      x: clamp(BUILD_ZONE.left, snappedX, BUILD_ZONE.right),
      y: clamp(BUILD_ZONE.top, snappedY, BUILD_ZONE.bottom)
    };
  }

  function nodeNearPoint(point, ignoreId) {
    return bridgeState.nodes.find((node) => {
      return node.id !== ignoreId && distance(node, point) < 16;
    }) || null;
  }

  function addNode(point) {
    const existing = nodeNearPoint(point, null);
    if (existing) {
      return existing;
    }

    const node = createNode(bridgeState.nextNodeId, point.x, point.y, false);
    bridgeState.nextNodeId += 1;
    bridgeState.nodes.push(node);
    return node;
  }

  function removeNode(nodeId) {
    const node = nodeById(bridgeState.nodes, nodeId);
    if (!node || node.fixed) {
      return;
    }

    bridgeState.nodes = bridgeState.nodes.filter((candidate) => candidate.id !== nodeId);
    bridgeState.members = bridgeState.members.filter((member) => member.a !== nodeId && member.b !== nodeId);

    if (selectedNodeId === nodeId) {
      selectedNodeId = null;
    }
  }

  function removeMember(memberId) {
    bridgeState.members = bridgeState.members.filter((member) => member.id !== memberId);
  }

  function connectNodes(a, b, type) {
    if (a === b) {
      return false;
    }
    const span = distance(nodeById(bridgeState.nodes, a), nodeById(bridgeState.nodes, b));
    if (Core.memberTooLong(type, span)) {
      editNotice = MATERIALS[type].label + ' members can be at most ' + Core.toMeters(MATERIALS[type].maxLength).toFixed(1) +
        ' m; that gap is ' + Core.toMeters(span).toFixed(1) + ' m. Add a joint in between' +
        (type !== 'steel' && !Core.memberTooLong('steel', span) ? ', or use steel, which spans further.' : '.');
      return false;
    }
    editNotice = '';

    const existing = memberBetween(bridgeState, a, b);

    if (existing) {
      existing.type = type;
      setMemberRestLength(existing);
    } else {
      bridgeState.members.push({
        id: bridgeState.nextMemberId,
        a,
        b,
        type,
        restLength: distance(nodeById(bridgeState.nodes, a), nodeById(bridgeState.nodes, b))
      });
      bridgeState.nextMemberId += 1;
    }

    selectedNodeId = b;
    return true;
  }

  function setTool(tool) {
    selectedTool = tool;
    if (!isBuildTool(tool)) {
      selectedNodeId = null;
    }

    toolButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tool === tool);
      button.setAttribute('aria-pressed', button.dataset.tool === tool ? 'true' : 'false');
    });

    updateDashboard();
    render();
  }

  function handleNodeInteraction(nodeId) {
    clearTestState();
    const node = nodeById(bridgeState.nodes, nodeId);
    if (!node) {
      return;
    }

    const before = cloneBridgeState(bridgeState);
    if (selectedTool === 'delete') {
      removeNode(nodeId);
    } else if (selectedTool === 'move') {
      selectedNodeId = nodeId;
    } else if (isBuildTool(selectedTool)) {
      if (selectedNodeId == null) {
        selectedNodeId = nodeId;
      } else if (selectedNodeId === nodeId) {
        selectedNodeId = null;
      } else {
        connectNodes(selectedNodeId, nodeId, selectedTool);
      }
    }

    commitIfChanged(before);
    render();
    updateDashboard();
  }

  function handleMemberInteraction(memberId) {
    if (selectedTool !== 'delete') {
      return;
    }

    clearTestState();
    rememberState();
    removeMember(memberId);
    render();
    updateDashboard();
  }

  function handleStageClick(point) {
    if (!pointInBuildZone(point)) {
      selectedNodeId = null;
      render();
      updateDashboard();
      return;
    }

    if (!isBuildTool(selectedTool)) {
      selectedNodeId = null;
      render();
      updateDashboard();
      return;
    }

    clearTestState();
    const before = cloneBridgeState(bridgeState);
    const node = addNode(snapPoint(point));

    if (selectedNodeId != null && selectedNodeId !== node.id) {
      connectNodes(selectedNodeId, node.id, selectedTool);
    } else {
      selectedNodeId = node.id;
    }

    commitIfChanged(before);
    render();
    updateDashboard();
  }

  function loadReport(bracing, loaded, peaks) {
    if (!loaded) return '';
    const idle = Core.idleMembers(bridgeState, peaks);
    const idleCost = idle.reduce((sum, member) => sum + Core.memberCost(bridgeState, member), 0);
    let text = loaded.length + ' of your ' + bracing.length + ' triangles carried load.';
    if (loaded.length < REQUIRED_TRIANGLES) text += ' Move triangles to where the ambulance pushes: under or over the road panels.';
    if (idle.length) text += ' ' + idle.length + ' member' + (idle.length === 1 ? '' : 's') + ' did almost nothing (' + formatCurrency(idleCost) + ' you could trim).';
    return text;
  }

  function updateDashboard() {
    const cost = computeCost(bridgeState);
    const budgetDelta = LEVEL_BUDGET - cost;
    const budgetRatio = cost / LEVEL_BUDGET;
    const path = findRoadPath(bridgeState, bridgeState.nodes);
    const bracing = Core.bracingTriangles(bridgeState);
    const peaks = testState.finished && testState.run ? testState.run.peakRatios : null;
    const loaded = peaks ? Core.loadedTriangles(bracing, peaks) : null;
    const triangleCount = loaded ? loaded.length : bracing.length;
    const trianglesDone = triangleCount >= REQUIRED_TRIANGLES;
    const tested = testState.running || testState.finished;
    const riskValue = tested
      ? Math.max(testState.maxStrain, testState.maxSag / ROAD_FAILURE_SAG, testState.maxSlope / ROAD_FAILURE_SLOPE)
      : 0;

    budgetDisplay.innerHTML = formatCurrency(cost) + '<small>Budget spent</small>';
    budgetSummary.textContent = budgetDelta >= 0
      ? formatCurrency(budgetDelta) + ' left'
      : formatCurrency(Math.abs(budgetDelta)) + ' over';
    budgetBar.style.width = Math.min(100, budgetRatio * 100).toFixed(1) + '%';
    budgetBar.style.background = budgetDelta >= 0
      ? 'linear-gradient(90deg, #62c96b, #35a160)'
      : 'linear-gradient(90deg, #f3c148, #e24a3b)';

    riskSummary.textContent = tested ? asPercent(Math.min(riskValue, 1.5)) + ' of limit' : 'Run the test';
    riskBar.style.width = Math.min(100, riskValue * 100).toFixed(1) + '%';
    targetEl.textContent = TARGET_LOAD + ' kN design load (' + AMBULANCE_WEIGHT + ' kN ambulance)';
    deckPathEl.textContent = path ? 'Connected from bank to bank' : 'Gap not connected';
    strainEl.textContent = tested ? asPercent(testState.maxStrain) : 'Not tested';
    sagEl.textContent = tested ? testState.maxSag.toFixed(1) + ' px' : 'Not tested';
    slopeEl.textContent = tested ? asPercent(testState.maxSlope) : 'Not tested';
    vehicleStatusEl.textContent = tested ? testState.vehicleLabel : 'Waiting on the left bank';
    scoreEl.textContent = lastScore == null ? '—' : lastScore.toLocaleString();
    bestScoreEl.textContent = bestScore == null ? '—' : bestScore.toLocaleString();
    attemptsEl.textContent = String(attempts);
    readyRoadEl.classList.toggle('is-ready', Boolean(path));
    readyTrianglesEl.classList.toggle('is-ready', trianglesDone);
    readyTrianglesEl.textContent = Math.min(triangleCount, REQUIRED_TRIANGLES) + '/' + REQUIRED_TRIANGLES +
      (loaded ? ' triangles carried load' : ' bracing triangles');
    triangleStepNote.textContent = !bracing.length
      ? 'Four that carry load'
      : loaded
        ? loaded.length + ' of ' + bracing.length + ' carried load'
        : bracing.length + (bracing.length < REQUIRED_TRIANGLES ? ' of ' + REQUIRED_TRIANGLES : '') + ' touch the road';
    readyBudgetEl.classList.toggle('is-ready', budgetDelta >= 0);
    readyTestedEl.classList.toggle('is-ready', testState.finished);
    undoButton.disabled = history.length === 0 || testState.running;

    // Each step is done on its own terms; the active one is the first that isn't.
    const stepDone = {
      road: Boolean(path),
      triangles: trianglesDone,
      test: testState.finished,
      deliver: testState.finished && testState.result === 'pass'
    };
    const order = ['road', 'triangles', 'test', 'deliver'];
    const activeKey = order.find((key) => !stepDone[key]);
    missionSteps.forEach((step) => {
      const key = step.dataset.missionStep;
      step.classList.toggle('is-active', key === activeKey);
      step.classList.toggle('is-complete', stepDone[key]);
      const badge = step.querySelector('span');
      badge.textContent = stepDone[key] ? '✓' : String(order.indexOf(key) + 1);
    });
    toolCopy.textContent = TOOL_HINTS[selectedTool].copy;
    toolLabel.textContent = TOOL_HINTS[selectedTool].label;
    stagePrompt.textContent = TOOL_HINTS[selectedTool].prompt;

    statusCard.classList.remove('bridge-status-pass', 'bridge-status-fail', 'bridge-status-warn');

    if (testState.running) {
      statusPill.textContent = 'Ambulance testing';
      verdictEl.textContent = 'Testing in progress. Watch the road shape, the blue-vs-red force flow, and the support arrows at each bank.';
      stageNote.textContent = 'Blue members are being pulled in tension. Red members are being squeezed in compression. If the deck dips too far, the run will fail.';
    } else if (testState.finished && testState.result === 'pass') {
      statusPill.textContent = 'Clinic reached';
      statusCard.classList.add('bridge-status-pass');
      verdictEl.textContent = testState.message + ' ' + loadReport(bracing, loaded, peaks);
      stageNote.textContent = 'This design kept the deck nearly level. Notice how the reaction arrows balance out once the load reaches the clinic bank.';
    } else if (testState.finished && testState.result === 'warn') {
      statusPill.textContent = 'Over budget';
      statusCard.classList.add('bridge-status-warn');
      verdictEl.textContent = testState.message + ' ' + loadReport(bracing, loaded, peaks);
      stageNote.textContent = 'The bridge works, but it costs too much. Keep the efficient load path, then trim expensive members that are not carrying much stress.';
    } else if (testState.finished && testState.result === 'fail') {
      statusPill.textContent = 'Bridge failed';
      statusCard.classList.add('bridge-status-fail');
      verdictEl.textContent = testState.message;
      stageNote.textContent = testState.message;
    } else if (editNotice) {
      statusPill.textContent = 'Edit mode';
      verdictEl.textContent = editNotice;
      stageNote.textContent = editNotice;
    } else if (!path) {
      statusPill.textContent = 'Edit mode';
      verdictEl.textContent = 'Build one continuous road from the start bank to the clinic bank before you test.';
      stageNote.textContent = 'Road pieces are the only parts the ambulance can drive on. Connect the gap first, then reinforce it.';
    } else if (budgetDelta < 0) {
      statusPill.textContent = 'Edit mode';
      verdictEl.textContent = 'This design is over budget. Trim extra members or replace some steel with cheaper wood before testing.';
      stageNote.textContent = 'The deck is connected, but the cost target is blown. Remove unused members and keep only the triangles that carry load.';
    } else {
      statusPill.textContent = 'Edit mode';
      verdictEl.textContent = bracing.length >= REQUIRED_TRIANGLES
        ? 'Road connected and braced. Run the ambulance test to see which triangles actually carry load.'
        : 'Road connected. Add triangles that touch the road (three joints in a line don\'t count), then run the ambulance test.';
      stageNote.textContent = 'The starter road is only the beginning. The strongest student designs make deep triangles below the longest panels.';
    }
  }

  svg.addEventListener('pointerdown', function (event) {
    if (testState.running) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const nodeElement = target ? target.closest('[data-node-id]') : null;

    if (selectedTool !== 'move' || !nodeElement) {
      return;
    }

    const nodeId = Number(nodeElement.dataset.nodeId);
    const node = nodeById(bridgeState.nodes, nodeId);

    if (!node || node.fixed) {
      return;
    }

    clearTestState();
    selectedNodeId = nodeId;
    dragState = {
      pointerId: event.pointerId,
      nodeId,
      moved: false,
      before: cloneBridgeState(bridgeState)
    };
    suppressClick = false;
    svg.setPointerCapture(event.pointerId);
    render();
    updateDashboard();
  });

  svg.addEventListener('pointermove', function (event) {
    if (!dragState) {
      return;
    }

    const point = snapPoint(pointFromEvent(event));
    const overlap = nodeNearPoint(point, dragState.nodeId);

    if (overlap) {
      return;
    }

    const node = nodeById(bridgeState.nodes, dragState.nodeId);

    if (!node) {
      return;
    }

    if (Math.abs(node.x - point.x) < 0.5 && Math.abs(node.y - point.y) < 0.5) {
      return;
    }
    const overlong = bridgeState.members.find((member) => {
      if (member.a !== node.id && member.b !== node.id) return false;
      const other = nodeById(bridgeState.nodes, member.a === node.id ? member.b : member.a);
      return Core.memberTooLong(member.type, distance(point, other));
    });
    if (overlong) {
      editNotice = 'That would stretch a ' + MATERIALS[overlong.type].label.toLowerCase() + ' member past its ' +
        Core.toMeters(MATERIALS[overlong.type].maxLength).toFixed(1) + ' m limit.';
      updateDashboard();
      return;
    }
    editNotice = '';
    if (!dragState.moved) {
      history.push(dragState.before);
      if (history.length > 30) history.shift();
    }
    dragState.moved = true;
    suppressClick = true;

    node.x = point.x;
    node.y = point.y;
    updateConnectedRestLengths(node.id);
    render();
    updateDashboard();
  });

  window.addEventListener('pointerup', function (event) {
    if (!dragState) {
      return;
    }

    if (svg.hasPointerCapture(dragState.pointerId)) {
      svg.releasePointerCapture(dragState.pointerId);
    }

    dragState = null;
    window.setTimeout(function () {
      suppressClick = false;
    }, 0);
  });

  svg.addEventListener('click', function (event) {
    if (testState.running) {
      return;
    }

    if (suppressClick) {
      suppressClick = false;
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const nodeElement = target ? target.closest('[data-node-id]') : null;
    const memberElement = target ? target.closest('[data-member-id]') : null;

    if (nodeElement) {
      handleNodeInteraction(Number(nodeElement.dataset.nodeId));
      return;
    }

    if (memberElement) {
      handleMemberInteraction(Number(memberElement.dataset.memberId));
      return;
    }

    handleStageClick(pointFromEvent(event));
  });

  toolButtons.forEach((button) => {
    button.addEventListener('click', function () {
      setTool(button.dataset.tool);
    });
  });

  testButton.addEventListener('click', runTest);
  exampleButton.addEventListener('click', function () {
    loadState(createExampleState);
  });
  resetButton.addEventListener('click', function () {
    loadState(createStarterState);
  });
  undoButton.addEventListener('click', undoLastChange);

  replayBtn.addEventListener('click', runTest);
  blueprintToggle.addEventListener('change', function () {
    stage.classList.toggle('is-blueprint', blueprintToggle.checked);
  });

  document.querySelectorAll('[data-speed]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      testSpeed = parseFloat(btn.dataset.speed);
      document.querySelectorAll('[data-speed]').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
    });
  });

  document.querySelectorAll('.bridge-question').forEach((question) => {
    const answer = question.dataset.answer;
    const explanation = question.dataset.explanation;
    const feedback = question.querySelector('.bridge-feedback');
    const options = question.querySelectorAll('.bridge-option');

    options.forEach((option) => {
      option.addEventListener('click', function () {
        options.forEach((button) => {
          button.classList.remove('is-correct', 'is-wrong');
          if (button.dataset.choice === answer) {
            button.classList.add('is-correct');
          }
        });

        if (option.dataset.choice === answer) {
          quizResults.set(question, true);
          feedback.className = 'bridge-feedback correct';
          feedback.textContent = 'Correct. ' + explanation;
        } else {
          quizResults.set(question, false);
          option.classList.add('is-wrong');
          feedback.className = 'bridge-feedback wrong';
          feedback.textContent = 'Not quite. ' + explanation;
        }
        const correctCount = Array.from(quizResults.values()).filter(Boolean).length;
        quizScoreEl.textContent = correctCount + ' of ' + document.querySelectorAll('.bridge-question').length + ' correct';
      });
    });
  });

  document.addEventListener('keydown', function (event) {
    const typing = event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]');
    if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undoLastChange();
    }
    if (event.key === 'Enter' && document.activeElement === svg && !testState.running) {
      runTest();
    }
  });

  render();
  updateDashboard();
}());
