const gridEl = document.getElementById("astar-grid");
const statusEl = document.getElementById("astar-status");
const widthEl = document.getElementById("astar-grid-width");
const heightEl = document.getElementById("astar-grid-height");
const buildGridBtn = document.getElementById("astar-build-grid");
const modeEl = document.getElementById("astar-mode");
const heuristicEl = document.getElementById("astar-heuristic");
const fuelLabelEl = document.getElementById("astar-fuel-label");
const fuelInputEl = document.getElementById("astar-fuel-limit");
const speedEl = document.getElementById("astar-speed");
const runBtn = document.getElementById("astar-run");
const stepBtn = document.getElementById("astar-step");
const clearBtn = document.getElementById("astar-clear-search");
const toolButtons = Array.from(document.querySelectorAll(".astar-tool"));

const instrumentG = document.getElementById("astar-g");
const instrumentH = document.getElementById("astar-h");
const instrumentF = document.getElementById("astar-f");

const nodesExpandedEl = document.getElementById("astar-nodes-expanded");
const pathCostEl = document.getElementById("astar-path-cost");
const solveTimeEl = document.getElementById("astar-time");
const optimalityEl = document.getElementById("astar-optimality");
const compareBodyEl = document.getElementById("astar-compare-body");

const required = [
  gridEl,
  statusEl,
  widthEl,
  heightEl,
  buildGridBtn,
  modeEl,
  heuristicEl,
  fuelLabelEl,
  fuelInputEl,
  speedEl,
  runBtn,
  stepBtn,
  clearBtn,
  instrumentG,
  instrumentH,
  instrumentF,
  nodesExpandedEl,
  pathCostEl,
  solveTimeEl,
  optimalityEl,
  compareBodyEl
];

if (required.some((node) => !node)) {
  throw new Error("A* lab failed to initialize. Missing required DOM nodes.");
}

const TERRAIN = {
  clear: 1,
  sand: 3,
  blocked: Infinity
};

const MODE_COPY = {
  classic: "Classic mode: balanced mission routing.",
  fuel: "Fuel Critical mode: route cost cannot exceed max mission cost.",
  dynamic: "Dynamic Obstacles mode: debris appears mid-mission, then A* recalculates.",
  step: "Step mode: press Step Expansion to advance one node at a time."
};

const HEURISTIC_LABEL = {
  manhattan: "Manhattan",
  euclidean: "Euclidean",
  zero: "Zero (Dijkstra)"
};

const state = {
  width: Number(widthEl.value),
  height: Number(heightEl.value),
  cells: [],
  start: { x: 1, y: 1 },
  goal: { x: 10, y: 6 },
  tool: "start",
  mode: modeEl.value,
  heuristic: heuristicEl.value,
  fuelLimit: Number(fuelInputEl.value),
  speed: Number(speedEl.value),
  frames: [],
  frameIndex: 0,
  currentFrame: null,
  timer: null,
  running: false,
  lastResult: null,
  pendingDynamicGrid: null
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function keyOf(x, y) {
  return `${x},${y}`;
}

function coordsFromKey(key) {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

function cellIndex(x, y) {
  return y * state.width + x;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < state.width && y < state.height;
}

function terrainAt(cells, x, y) {
  return cells[cellIndex(x, y)] || "clear";
}

function movementCost(cells, x, y) {
  const terrain = terrainAt(cells, x, y);
  return TERRAIN[terrain];
}

function isStart(x, y) {
  return state.start.x === x && state.start.y === y;
}

function isGoal(x, y) {
  return state.goal.x === x && state.goal.y === y;
}

function cloneFrame(frame) {
  return {
    type: frame.type,
    openSet: frame.openSet ? frame.openSet.slice() : [],
    closedSet: frame.closedSet ? frame.closedSet.slice() : [],
    pathSet: frame.pathSet ? frame.pathSet.slice() : [],
    currentKey: frame.currentKey || null,
    g: Number.isFinite(frame.g) ? frame.g : 0,
    h: Number.isFinite(frame.h) ? frame.h : 0,
    f: Number.isFinite(frame.f) ? frame.f : 0,
    expandedCount: frame.expandedCount || 0,
    message: frame.message || ""
  };
}

function heuristicValue(kind, x, y, gx, gy) {
  const dx = Math.abs(gx - x);
  const dy = Math.abs(gy - y);
  if (kind === "euclidean") {
    return Math.hypot(dx, dy);
  }
  if (kind === "zero") {
    return 0;
  }
  return dx + dy;
}

function chooseBestOpen(openMap) {
  let best = null;
  for (const node of openMap.values()) {
    if (!best) {
      best = node;
      continue;
    }
    if (node.f < best.f) {
      best = node;
      continue;
    }
    if (node.f === best.f && node.h < best.h) {
      best = node;
      continue;
    }
    if (node.f === best.f && node.h === best.h && node.g < best.g) {
      best = node;
    }
  }
  return best;
}

function reconstructPath(cameFrom, goalKey) {
  const path = [goalKey];
  let cursor = goalKey;
  while (cameFrom.has(cursor)) {
    cursor = cameFrom.get(cursor);
    path.unshift(cursor);
  }
  return path;
}

function runAStar(cells, start, goal, options) {
  const heuristic = options.heuristic || "manhattan";
  const fuelLimit = Number.isFinite(options.fuelLimit) ? options.fuelLimit : Infinity;
  const recordFrames = options.recordFrames !== false;

  const startKey = keyOf(start.x, start.y);
  const goalKey = keyOf(goal.x, goal.y);
  const openMap = new Map();
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const nodeScores = new Map();
  const frames = [];

  const startH = heuristicValue(heuristic, start.x, start.y, goal.x, goal.y);
  openMap.set(startKey, {
    key: startKey,
    x: start.x,
    y: start.y,
    g: 0,
    h: startH,
    f: startH
  });
  gScore.set(startKey, 0);
  nodeScores.set(startKey, { g: 0, h: startH, f: startH });

  let expandedCount = 0;
  let success = false;
  let finalKey = null;

  while (openMap.size > 0 && expandedCount < 6000) {
    const current = chooseBestOpen(openMap);
    if (!current) break;

    openMap.delete(current.key);
    if (closedSet.has(current.key)) continue;

    closedSet.add(current.key);
    expandedCount += 1;

    if (current.key === goalKey) {
      success = true;
      finalKey = current.key;
      if (recordFrames) {
        frames.push({
          type: "search",
          openSet: [...openMap.keys()],
          closedSet: [...closedSet],
          pathSet: [],
          currentKey: current.key,
          g: current.g,
          h: current.h,
          f: current.f,
          expandedCount,
          message: "Beacon reached. Reconstructing optimal route."
        });
      }
      break;
    }

    const neighbors = [
      [current.x + 1, current.y],
      [current.x - 1, current.y],
      [current.x, current.y + 1],
      [current.x, current.y - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (!inBounds(nx, ny)) continue;
      if (movementCost(cells, nx, ny) === Infinity) continue;

      const neighborKey = keyOf(nx, ny);
      if (closedSet.has(neighborKey)) continue;

      const stepCost = movementCost(cells, nx, ny);
      const tentativeG = current.g + stepCost;
      if (tentativeG > fuelLimit) continue;

      const previousG = gScore.get(neighborKey);
      if (previousG !== undefined && tentativeG >= previousG) continue;

      cameFrom.set(neighborKey, current.key);
      gScore.set(neighborKey, tentativeG);

      const h = heuristicValue(heuristic, nx, ny, goal.x, goal.y);
      const candidate = {
        key: neighborKey,
        x: nx,
        y: ny,
        g: tentativeG,
        h,
        f: tentativeG + h
      };

      openMap.set(neighborKey, candidate);
      nodeScores.set(neighborKey, { g: candidate.g, h: candidate.h, f: candidate.f });
    }

    if (recordFrames) {
      frames.push({
        type: "search",
        openSet: [...openMap.keys()],
        closedSet: [...closedSet],
        pathSet: [],
        currentKey: current.key,
        g: current.g,
        h: current.h,
        f: current.f,
        expandedCount,
        message: `Expanding node ${current.key.replace(",", ", ")}.`
      });
    }
  }

  const path = success ? reconstructPath(cameFrom, finalKey) : [];
  const finalCost = success ? gScore.get(goalKey) : null;

  return {
    success,
    frames,
    path,
    finalCost,
    expandedCount,
    nodeScores,
    closedSet,
    message: success ? "Mission route solved." : "Mission failed: no route under current constraints."
  };
}

function buildPathFrames(result, prefixExpansions = 0) {
  if (!result.path.length) return [];

  const frames = [];
  const closed = [...result.closedSet];

  for (let i = 0; i < result.path.length; i += 1) {
    const key = result.path[i];
    const scores = result.nodeScores.get(key) || { g: 0, h: 0, f: 0 };

    frames.push({
      type: "path",
      openSet: [],
      closedSet: closed,
      pathSet: result.path.slice(0, i + 1),
      currentKey: key,
      g: scores.g,
      h: scores.h,
      f: scores.f,
      expandedCount: prefixExpansions + result.expandedCount,
      message: `Final path step ${i + 1} of ${result.path.length}.`
    });
  }

  return frames;
}

function pickDynamicObstacle(path, cells) {
  if (path.length > 3) {
    const startIndex = Math.floor(path.length * 0.4);
    for (let i = startIndex; i < path.length - 1; i += 1) {
      const key = path[i];
      const { x, y } = coordsFromKey(key);
      if (isStart(x, y) || isGoal(x, y)) continue;
      if (terrainAt(cells, x, y) === "blocked") continue;
      return key;
    }
  }

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      if (isStart(x, y) || isGoal(x, y)) continue;
      if (terrainAt(cells, x, y) === "blocked") continue;
      return keyOf(x, y);
    }
  }

  return null;
}

function runDynamicMission(baseCells, options) {
  const firstPass = runAStar(baseCells, state.start, state.goal, {
    heuristic: options.heuristic,
    fuelLimit: options.fuelLimit,
    recordFrames: true
  });

  if (!firstPass.frames.length) {
    return {
      frames: firstPass.frames,
      result: firstPass,
      finalCells: baseCells.slice()
    };
  }

  const splitIndex = Math.max(1, Math.floor(firstPass.frames.length * 0.45));
  const combinedFrames = firstPass.frames.slice(0, splitIndex).map(cloneFrame);

  const shiftedCells = baseCells.slice();
  const obstacleKey = pickDynamicObstacle(firstPass.path, shiftedCells);

  let eventMessage = "Debris shifted. Recalculating route.";
  if (obstacleKey) {
    const { x, y } = coordsFromKey(obstacleKey);
    shiftedCells[cellIndex(x, y)] = "blocked";
    eventMessage = `Debris moved to (${x + 1}, ${y + 1}). Recalculating route.`;
  } else {
    eventMessage = "No safe tile found for dynamic obstacle. Continuing route.";
  }

  combinedFrames.push({
    type: "event",
    openSet: [],
    closedSet: [],
    pathSet: [],
    currentKey: obstacleKey,
    g: 0,
    h: 0,
    f: 0,
    expandedCount: splitIndex,
    message: eventMessage
  });

  const secondPass = runAStar(shiftedCells, state.start, state.goal, {
    heuristic: options.heuristic,
    fuelLimit: options.fuelLimit,
    recordFrames: true
  });

  for (const frame of secondPass.frames) {
    const mergedFrame = cloneFrame(frame);
    mergedFrame.expandedCount = splitIndex + frame.expandedCount;
    combinedFrames.push(mergedFrame);
  }

  const pathFrames = buildPathFrames(secondPass, splitIndex);
  combinedFrames.push(...pathFrames);

  return {
    frames: combinedFrames,
    result: {
      ...secondPass,
      expandedCount: splitIndex + secondPass.expandedCount
    },
    finalCells: shiftedCells
  };
}

function stopAnimation() {
  state.running = false;
  if (state.timer !== null) {
    window.clearTimeout(state.timer);
    state.timer = null;
  }
}

function resetInstruments() {
  instrumentG.textContent = "0.00";
  instrumentH.textContent = "0.00";
  instrumentF.textContent = "0.00";
}

function clearSearchOverlay() {
  stopAnimation();
  state.frames = [];
  state.frameIndex = 0;
  state.currentFrame = null;
  state.lastResult = null;
  state.pendingDynamicGrid = null;

  nodesExpandedEl.textContent = "0";
  pathCostEl.textContent = "--";
  solveTimeEl.textContent = "--";
  optimalityEl.textContent = "Pending";
  resetInstruments();

  renderGrid();
}

function updateStatus(text) {
  statusEl.textContent = text;
}

function applyFrame(rawFrame) {
  if (!rawFrame) return;

  const frame = {
    ...rawFrame,
    openSet: new Set(rawFrame.openSet || []),
    closedSet: new Set(rawFrame.closedSet || []),
    pathSet: new Set(rawFrame.pathSet || [])
  };

  if (frame.type === "event" && state.pendingDynamicGrid) {
    state.cells = state.pendingDynamicGrid.slice();
  }

  state.currentFrame = frame;

  instrumentG.textContent = frame.g.toFixed(2);
  instrumentH.textContent = frame.h.toFixed(2);
  instrumentF.textContent = frame.f.toFixed(2);
  nodesExpandedEl.textContent = String(frame.expandedCount || 0);

  if (frame.message) {
    updateStatus(frame.message);
  }

  renderGrid(frame);
}

function playAnimation() {
  stopAnimation();

  if (!state.frames.length) {
    updateStatus("No mission frames available. Adjust the map and try again.");
    return;
  }

  state.running = true;

  const tick = () => {
    if (!state.running) return;

    if (state.frameIndex >= state.frames.length) {
      stopAnimation();
      if (state.lastResult?.success) {
        updateStatus("Mission complete. Rover reached the beacon.");
      } else {
        updateStatus("Mission ended with no valid route.");
      }
      return;
    }

    applyFrame(state.frames[state.frameIndex]);
    state.frameIndex += 1;
    state.timer = window.setTimeout(tick, state.speed);
  };

  tick();
}

function fillComparisonTable(resultByHeuristic, selectedHeuristic) {
  const heuristicOrder = ["manhattan", "euclidean", "zero"];
  const rows = heuristicOrder
    .map((key) => {
      const item = resultByHeuristic[key];
      const cost = item.result.success ? item.result.finalCost.toFixed(2) : "--";
      const elapsed = `${item.ms.toFixed(1)} ms`;
      const selectedMark = key === selectedHeuristic ? " class=\"is-selected\"" : "";
      return `<tr${selectedMark}><td>${HEURISTIC_LABEL[key]}</td><td>${item.result.expandedCount}</td><td>${cost}</td><td>${elapsed}</td></tr>`;
    })
    .join("");

  compareBodyEl.innerHTML = rows;
}

function computeOptimalityLabel(selectedResult, dijkstraResult) {
  if (selectedResult.success && dijkstraResult.success) {
    const diff = selectedResult.finalCost - dijkstraResult.finalCost;
    if (Math.abs(diff) < 1e-9) {
      return "Optimal (matches Dijkstra)";
    }
    if (diff > 0) {
      return `Higher than Dijkstra by ${diff.toFixed(2)}`;
    }
    return "Lower than Dijkstra (check configuration)";
  }

  if (!selectedResult.success && !dijkstraResult.success) {
    return "No feasible route under this mission setup";
  }

  if (!selectedResult.success && dijkstraResult.success) {
    return "Selected heuristic/mode missed a feasible route";
  }

  return "Feasible route found";
}

function computeHeuristicComparison(cells, options) {
  const summary = {};
  const order = ["manhattan", "euclidean", "zero"];

  for (const kind of order) {
    const startedAt = performance.now();
    const result = runAStar(cells, state.start, state.goal, {
      heuristic: kind,
      fuelLimit: options.fuelLimit,
      recordFrames: false
    });
    const ms = performance.now() - startedAt;
    summary[kind] = { result, ms };
  }

  return summary;
}

function runMission() {
  stopAnimation();
  state.mode = modeEl.value;
  state.heuristic = heuristicEl.value;
  state.fuelLimit = Number(fuelInputEl.value);
  state.speed = Number(speedEl.value);

  const fuelLimit = state.mode === "fuel" ? state.fuelLimit : Infinity;
  const baseCells = state.cells.slice();

  resetInstruments();
  nodesExpandedEl.textContent = "0";
  pathCostEl.textContent = "--";
  solveTimeEl.textContent = "--";
  optimalityEl.textContent = "Pending";
  updateStatus("Mission in progress...");

  const solveStartedAt = performance.now();

  let missionFrames = [];
  let result;
  let finalCells = baseCells.slice();

  if (state.mode === "dynamic") {
    const dynamicOutcome = runDynamicMission(baseCells, {
      heuristic: state.heuristic,
      fuelLimit
    });

    missionFrames = dynamicOutcome.frames;
    result = dynamicOutcome.result;
    finalCells = dynamicOutcome.finalCells;
    state.pendingDynamicGrid = finalCells.slice();
  } else {
    result = runAStar(baseCells, state.start, state.goal, {
      heuristic: state.heuristic,
      fuelLimit,
      recordFrames: true
    });
    missionFrames = result.frames.concat(buildPathFrames(result));
    state.pendingDynamicGrid = null;
  }

  const solveMs = performance.now() - solveStartedAt;

  state.frames = missionFrames;
  state.frameIndex = 0;
  state.lastResult = result;

  nodesExpandedEl.textContent = String(result.expandedCount);
  pathCostEl.textContent = result.success ? result.finalCost.toFixed(2) : "--";
  solveTimeEl.textContent = `${solveMs.toFixed(1)} ms`;

  const comparison = computeHeuristicComparison(finalCells, { fuelLimit });
  fillComparisonTable(comparison, state.heuristic);
  optimalityEl.textContent = computeOptimalityLabel(result, comparison.zero.result);

  if (!missionFrames.length) {
    updateStatus("No route search steps available. Check map setup and try again.");
    return;
  }

  if (state.mode === "step") {
    renderGrid();
    updateStatus("Step mode ready. Press Step Expansion to advance the search.");
    return;
  }

  playAnimation();
}

function stepMission() {
  if (state.mode !== "step") return;

  if (!state.frames.length || state.frameIndex >= state.frames.length) {
    runMission();
    if (!state.frames.length) return;
  }

  applyFrame(state.frames[state.frameIndex]);
  state.frameIndex += 1;

  if (state.frameIndex >= state.frames.length) {
    if (state.lastResult?.success) {
      updateStatus("Step mode complete: beacon reached.");
    } else {
      updateStatus("Step mode complete: mission ended with no route.");
    }
  }
}

function setTool(tool) {
  state.tool = tool;
  for (const btn of toolButtons) {
    const active = btn.dataset.tool === tool;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function updateModeUI() {
  state.mode = modeEl.value;
  const fuelVisible = state.mode === "fuel";
  fuelLabelEl.hidden = !fuelVisible;
  fuelInputEl.hidden = !fuelVisible;

  const stepActive = state.mode === "step";
  stepBtn.disabled = !stepActive;

  updateStatus(MODE_COPY[state.mode]);
}

function createDefaultGrid() {
  state.width = Number(widthEl.value);
  state.height = Number(heightEl.value);
  state.cells = Array(state.width * state.height).fill("clear");

  state.start = {
    x: clamp(1, 0, state.width - 1),
    y: clamp(Math.floor(state.height / 2), 0, state.height - 1)
  };

  state.goal = {
    x: clamp(state.width - 2, 0, state.width - 1),
    y: clamp(Math.floor(state.height / 2), 0, state.height - 1)
  };

  for (let y = 1; y < state.height - 1; y += 1) {
    const ridgeX = clamp(Math.floor(state.width * 0.5), 1, state.width - 2);
    if (y !== state.start.y && y !== state.goal.y) {
      state.cells[cellIndex(ridgeX, y)] = "blocked";
    }
  }

  for (let y = 0; y < state.height; y += 1) {
    const sandX = clamp(Math.floor(state.width * 0.68), 0, state.width - 1);
    if (!isStart(sandX, y) && !isGoal(sandX, y) && state.cells[cellIndex(sandX, y)] !== "blocked") {
      state.cells[cellIndex(sandX, y)] = "sand";
    }
  }
}

function updateCellByTool(x, y) {
  if (!inBounds(x, y)) return;

  if (state.tool === "start") {
    if (isGoal(x, y) || terrainAt(state.cells, x, y) === "blocked") return;
    state.start = { x, y };
    return;
  }

  if (state.tool === "goal") {
    if (isStart(x, y) || terrainAt(state.cells, x, y) === "blocked") return;
    state.goal = { x, y };
    return;
  }

  if (isStart(x, y) || isGoal(x, y)) return;

  if (state.tool === "blocked") {
    state.cells[cellIndex(x, y)] = "blocked";
  } else if (state.tool === "sand") {
    state.cells[cellIndex(x, y)] = "sand";
  } else {
    state.cells[cellIndex(x, y)] = "clear";
  }
}

function terrainClass(terrain) {
  if (terrain === "blocked") return "is-debris";
  if (terrain === "sand") return "is-sand";
  return "is-clear";
}

function describeCell(x, y, terrain, frame) {
  let desc = "Clear";
  if (isStart(x, y)) desc = "Rover start";
  else if (isGoal(x, y)) desc = "Beacon goal";
  else if (terrain === "blocked") desc = "Debris blocked";
  else if (terrain === "sand") desc = "Sand cost three";

  const key = keyOf(x, y);
  if (frame?.currentKey === key) {
    desc += ", current expansion node";
  } else if (frame?.pathSet?.has(key)) {
    desc += ", final path";
  } else if (frame?.openSet?.has(key)) {
    desc += ", open set";
  } else if (frame?.closedSet?.has(key)) {
    desc += ", closed set";
  }

  return desc;
}

function renderGrid(frame = state.currentFrame) {
  gridEl.style.setProperty("--astar-cols", String(state.width));

  const fragment = document.createDocumentFragment();

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `astar-cell ${terrainClass(terrainAt(state.cells, x, y))}`;
      btn.dataset.x = String(x);
      btn.dataset.y = String(y);
      btn.setAttribute("role", "gridcell");

      const key = keyOf(x, y);
      if (frame?.openSet?.has(key)) btn.classList.add("is-open");
      if (frame?.closedSet?.has(key)) btn.classList.add("is-closed");
      if (frame?.pathSet?.has(key)) btn.classList.add("is-path");
      if (frame?.currentKey === key) btn.classList.add("is-current");
      if (isStart(x, y)) btn.classList.add("is-rover");
      if (isGoal(x, y)) btn.classList.add("is-beacon");

      if (isStart(x, y)) btn.textContent = "R";
      else if (isGoal(x, y)) btn.textContent = "B";
      else if (terrainAt(state.cells, x, y) === "blocked") btn.textContent = "#";
      else if (terrainAt(state.cells, x, y) === "sand") btn.textContent = "3";
      else if (frame?.pathSet?.has(key)) btn.textContent = "•";
      else btn.textContent = "";

      btn.setAttribute("aria-label", describeCell(x, y, terrainAt(state.cells, x, y), frame));
      fragment.appendChild(btn);
    }
  }

  gridEl.innerHTML = "";
  gridEl.appendChild(fragment);
}

buildGridBtn.addEventListener("click", () => {
  stopAnimation();
  createDefaultGrid();
  clearSearchOverlay();
  renderGrid();
  updateStatus("New mission grid ready. Paint cells, then run.");
});

gridEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (state.running) return;

  const x = Number(target.dataset.x);
  const y = Number(target.dataset.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  updateCellByTool(x, y);
  clearSearchOverlay();
  updateStatus("Grid updated. Run Mission to test the new route.");
});

for (const button of toolButtons) {
  button.addEventListener("click", () => setTool(button.dataset.tool || "start"));
}

modeEl.addEventListener("change", () => {
  updateModeUI();
  clearSearchOverlay();
});

heuristicEl.addEventListener("change", () => {
  state.heuristic = heuristicEl.value;
  clearSearchOverlay();
  updateStatus(`Heuristic set to ${HEURISTIC_LABEL[state.heuristic]}.`);
});

fuelInputEl.addEventListener("input", () => {
  state.fuelLimit = Number(fuelInputEl.value);
});

speedEl.addEventListener("input", () => {
  state.speed = Number(speedEl.value);
});

runBtn.addEventListener("click", runMission);
stepBtn.addEventListener("click", stepMission);
clearBtn.addEventListener("click", () => {
  clearSearchOverlay();
  updateStatus("Search overlay reset. Grid terrain unchanged.");
});

setTool("start");
createDefaultGrid();
updateModeUI();
clearSearchOverlay();
updateStatus("Mission ready. Place rover/beacon or press Run Mission.");
