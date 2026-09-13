const gridEl = document.getElementById("astar-grid");
const statusEl = document.getElementById("astar-status");
const cellDescriptionEl = document.getElementById("astar-cell-description");
const widthEl = document.getElementById("astar-grid-width");
const heightEl = document.getElementById("astar-grid-height");
const themeEl = document.getElementById("astar-theme");
const aiNameEl = document.getElementById("astar-ai-name");
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
const toolStartBtn = document.getElementById("astar-tool-start");
const toolGoalBtn = document.getElementById("astar-tool-goal");
const toolBlockedBtn = document.getElementById("astar-tool-blocked");
const toolSandBtn = document.getElementById("astar-tool-sand");

const missionTitleEl = document.getElementById("astar-mission-title");
const missionSubtitleEl = document.getElementById("astar-mission-subtitle");
const missionNarrativeEl = document.getElementById("astar-mission-narrative");
const legendStartEl = document.getElementById("astar-legend-start");
const legendGoalEl = document.getElementById("astar-legend-goal");
const legendBlockedEl = document.getElementById("astar-legend-blocked");
const legendSlowEl = document.getElementById("astar-legend-slow");

const instrumentG = document.getElementById("astar-g");
const instrumentH = document.getElementById("astar-h");
const instrumentF = document.getElementById("astar-f");

const nodesExpandedEl = document.getElementById("astar-nodes-expanded");
const pathCostEl = document.getElementById("astar-path-cost");
const solveTimeEl = document.getElementById("astar-time");
const optimalityEl = document.getElementById("astar-optimality");
const compareBodyEl = document.getElementById("astar-compare-body");

const scrubberEl = document.getElementById("astar-scrubber");
const playPauseBtn = document.getElementById("astar-play-pause");
const scrubberLabelEl = document.getElementById("astar-scrubber-label");
const showHeatmapEl = document.getElementById("astar-show-heatmap");

const required = [
  gridEl,
  statusEl,
  cellDescriptionEl,
  widthEl,
  heightEl,
  themeEl,
  aiNameEl,
  buildGridBtn,
  modeEl,
  heuristicEl,
  fuelLabelEl,
  fuelInputEl,
  speedEl,
  runBtn,
  stepBtn,
  clearBtn,
  toolStartBtn,
  toolGoalBtn,
  toolBlockedBtn,
  toolSandBtn,
  missionTitleEl,
  missionSubtitleEl,
  missionNarrativeEl,
  legendStartEl,
  legendGoalEl,
  legendBlockedEl,
  legendSlowEl,
  instrumentG,
  instrumentH,
  instrumentF,
  nodesExpandedEl,
  pathCostEl,
  solveTimeEl,
  optimalityEl,
  compareBodyEl,
  scrubberEl,
  playPauseBtn,
  scrubberLabelEl,
  showHeatmapEl
];

if (required.some((node) => !node)) {
  throw new Error("A* lab failed to initialize. Missing required DOM nodes.");
}

const TERRAIN = {
  clear: 1,
  sand: 3,
  blocked: Infinity
};

const PLATFORMER = {
  maxRunSpeed: 2,
  jumpVelocity: -4,
  maxFallSpeed: 3,
  gravity: 1,
  reversePenalty: 0.35,
  jumpPenalty: 0.45,
  airControlPenalty: 0.1,
  momentumPenalty: 0.08,
  hazardPenalty: 2
};

const THEMES = {
  mars: {
    title: "Rescue Grid: The A* Mission",
    subtitle: "Guide the rover to the beacon using A* while terrain, fuel pressure, and mission rules change in real time.",
    startLabel: "Rover",
    goalLabel: "Beacon",
    blockedLabel: "Craters",
    slowLabel: "Sand",
    startSymbol: "🤖",
    goalSymbol: "📡",
    blockedSymbol: "🪨",
    slowSymbol: "🟡",
    narrative: "Navigate across the Martian surface to reach the rescue beacon while avoiding craters and slow sand zones.",
    bg: "#f9ebe0",
    bgDark: "#241814"
  },
  restaurant: {
    title: "Restaurant AI: Robot Waiter Route",
    subtitle: "Train the robot waiter to deliver food to the right table while avoiding chairs and slippery spills.",
    startLabel: "Robot",
    goalLabel: "Dinner Table",
    blockedLabel: "Chairs",
    slowLabel: "Spill",
    startSymbol: "🤖",
    goalSymbol: "🍽",
    blockedSymbol: "🪑",
    slowSymbol: "🧃",
    narrative: "Train the restaurant robot to deliver food to the correct table while avoiding chairs and slippery spills.",
    bg: "#f8fafc",
    bgDark: "#0f172a"
  },
  car: {
    title: "City Navigator: Self-Driving Car",
    subtitle: "Teach the car to reach its destination by finding the most efficient route through city streets.",
    startLabel: "Car",
    goalLabel: "Destination",
    blockedLabel: "Roadblocks",
    slowLabel: "Traffic",
    startSymbol: "🚗",
    goalSymbol: "🏠",
    blockedSymbol: "🚧",
    slowSymbol: "🚦",
    narrative: "Teach the car how to navigate city streets and reach the destination using the most efficient route.",
    bg: "#e2e8f0",
    bgDark: "#1e293b"
  },
  drone: {
    title: "Delivery Drone: Urban Route Planning",
    subtitle: "Program the drone to deliver a package through the city while avoiding buildings and wind zones.",
    startLabel: "Drone",
    goalLabel: "Delivery House",
    blockedLabel: "Buildings",
    slowLabel: "Wind Zones",
    startSymbol: "🚁",
    goalSymbol: "📦",
    blockedSymbol: "🏢",
    slowSymbol: "🌬",
    narrative: "Program the drone to deliver a package through the city while avoiding buildings and strong winds.",
    bg: "#f0f9ff",
    bgDark: "#0c4a6e"
  },
  firefighter: {
    title: "Emergency Route: Firefighter Rescue",
    subtitle: "Find the fastest route through blocked streets to reach the emergency location.",
    startLabel: "Fire Truck",
    goalLabel: "House on Fire",
    blockedLabel: "Debris",
    slowLabel: "Flooded Roads",
    startSymbol: "🚒",
    goalSymbol: "🏠",
    blockedSymbol: "🚧",
    slowSymbol: "🌊",
    narrative: "Find the fastest route through blocked streets to reach the emergency.",
    bg: "#f1f5f9",
    bgDark: "#0f172a"
  },
  hospital: {
    title: "Care Route: Hospital Robot",
    subtitle: "Train the hospital robot nurse to deliver medicine as quickly as possible.",
    startLabel: "Robot Nurse",
    goalLabel: "Patient Room",
    blockedLabel: "Closed Doors",
    slowLabel: "Crowded Hallway",
    startSymbol: "🤖",
    goalSymbol: "🛏",
    blockedSymbol: "🚪",
    slowSymbol: "👥",
    narrative: "Train the hospital robot to bring medicine to the patient as quickly as possible.",
    bg: "#f0fdf4",
    bgDark: "#064e3b"
  },
  treasure: {
    title: "Jungle Quest: Treasure Hunter",
    subtitle: "Plan the safest route through hazards to reach the treasure.",
    startLabel: "Explorer",
    goalLabel: "Treasure",
    blockedLabel: "Jungle",
    slowLabel: "Swamp",
    startSymbol: "🧭",
    goalSymbol: "💰",
    blockedSymbol: "🌳",
    slowSymbol: "🐊",
    narrative: "Find the safest path through the jungle to reach the treasure.",
    bg: "#ecfdf5",
    bgDark: "#022c22"
  },
  mario: {
    title: "Grid Platformer: Mario Adventure",
    subtitle: "Train Mario's AI brain to search with jump arcs, gravity, and momentum on the way to the flag.",
    startLabel: "Mario",
    goalLabel: "Flag",
    blockedLabel: "Blocks",
    slowLabel: "Enemy Tile",
    startSymbol: "🧑",
    goalSymbol: "🏁",
    blockedSymbol: "🧱",
    slowSymbol: "🐢",
    narrative: "Mario Adventure uses platformer physics: legal moves depend on support, gravity, jump height, and momentum, not just adjacent grid squares.",
    bg: "#e0f2fe",
    bgDark: "#0c4a6e"
  }
};

const FALLBACK_AI_NAME = "Byte";

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
  theme: themeEl.value,
  aiName: aiNameEl.value.trim(),
  heuristic: heuristicEl.value,
  showHeatmap: showHeatmapEl ? showHeatmapEl.checked : true,
  fuelLimit: Number(fuelInputEl.value),
  speed: Number(speedEl.value),
  frames: [],
  frameIndex: 0,
  currentFrame: null,
  timer: null,
  running: false,
  lastResult: null,
  pendingDynamicGrid: null,
  hoveredCell: null
};

function getTheme() {
  return THEMES[state.theme] || THEMES.mars;
}

function getAiName() {
  const candidate = String(state.aiName || "").trim();
  return candidate || FALLBACK_AI_NAME;
}

function modeCopy(mode) {
  const theme = getTheme();
  const ai = getAiName();
  const lowerStart = theme.startLabel.toLowerCase();
  if (mode === "fuel") {
    return `${ai} in Fuel Critical mode: keep total route cost within mission limits.`;
  }
  if (mode === "dynamic") {
    return `${ai} in Dynamic Obstacles mode: ${lowerStart} path may change while searching.`;
  }
  if (mode === "step") {
    return `${ai} in Step mode: press Step Expansion to advance one node at a time.`;
  }
  return `${ai} in Classic mode: balanced route planning.`;
}

function applyThemeUI() {
  const theme = getTheme();

  missionTitleEl.textContent = theme.title;
  missionSubtitleEl.textContent = theme.subtitle;
  missionNarrativeEl.textContent = theme.narrative;

  toolStartBtn.textContent = theme.startLabel;
  toolGoalBtn.textContent = theme.goalLabel;
  toolBlockedBtn.textContent = theme.blockedLabel;
  toolSandBtn.textContent = `${theme.slowLabel} (Cost 3)`;

  legendStartEl.textContent = `${theme.startLabel} (Start)`;
  legendGoalEl.textContent = `${theme.goalLabel} (Goal)`;
  legendBlockedEl.textContent = `${theme.blockedLabel} (Blocked)`;
  legendSlowEl.textContent = `${theme.slowLabel} (Cost 3)`;
}

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
  if (state.theme === "mario") {
    return platformerHeuristicValue(kind, x, y, gx, gy);
  }

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

function platformerHeuristicValue(kind, x, y, gx, gy) {
  const dx = Math.abs(gx - x);
  const dy = gy - y;
  const horizontalTicks = Math.ceil(dx / PLATFORMER.maxRunSpeed);
  const verticalTicks = dy < 0
    ? Math.ceil(Math.abs(dy) / Math.abs(PLATFORMER.jumpVelocity))
    : Math.ceil(Math.abs(dy) / PLATFORMER.maxFallSpeed);

  if (kind === "euclidean") {
    return Math.hypot(horizontalTicks, verticalTicks);
  }
  if (kind === "zero") {
    return 0;
  }
  return horizontalTicks + verticalTicks;
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

function runGridAStar(cells, start, goal, options) {
  const theme = getTheme();
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
          message: `${theme.goalLabel} reached. Reconstructing optimal route.`
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
        message: `Expanding node ${current.key.replace(",", ", ")}.`,
        cameFrom: new Map(cameFrom),
        nodeScores: new Map(nodeScores)
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
    cameFrom,
    message: success ? "Route solved." : "No route under current constraints."
  };
}

function platformerStateKey(x, y, vx, vy) {
  return `${x},${y}|${vx},${vy}`;
}

function isPlatformerSolid(cells, x, y) {
  if (x < 0 || x >= state.width) return true;
  if (y < 0 || y >= state.height) return true;
  return terrainAt(cells, x, y) === "blocked";
}

function hasPlatformerSupport(cells, x, y) {
  return isPlatformerSolid(cells, x, y + 1);
}

function applyPlatformerInput(vx, inputX) {
  let nextVx = vx;

  if (inputX > 0) {
    nextVx += 1;
  } else if (inputX < 0) {
    nextVx -= 1;
  } else if (nextVx > 0) {
    nextVx -= 1;
  } else if (nextVx < 0) {
    nextVx += 1;
  }

  return clamp(nextVx, -PLATFORMER.maxRunSpeed, PLATFORMER.maxRunSpeed);
}

function projectNodesToCells(nodes) {
  const cellKeys = new Set();
  for (const node of nodes) {
    if (!node) continue;
    cellKeys.add(node.cellKey || keyOf(node.x, node.y));
  }
  return [...cellKeys];
}

function projectStateKeysToCells(keys, stateByKey) {
  const cellKeys = new Set();
  for (const stateKey of keys) {
    const node = stateByKey.get(stateKey);
    if (!node) continue;
    cellKeys.add(node.cellKey || keyOf(node.x, node.y));
  }
  return [...cellKeys];
}

function compressPlatformerScoresByCell(stateByKey) {
  const nodeScores = new Map();

  for (const node of stateByKey.values()) {
    const existing = nodeScores.get(node.cellKey);
    if (!existing || node.g < existing.g) {
      nodeScores.set(node.cellKey, { g: node.g, h: node.h, f: node.f });
    }
  }

  return nodeScores;
}

function getPlatformerActions(grounded) {
  if (grounded) {
    return [
      { inputX: -1, jump: false, label: "run left" },
      { inputX: 0, jump: false, label: "wait" },
      { inputX: 1, jump: false, label: "run right" },
      { inputX: -1, jump: true, label: "jump left" },
      { inputX: 0, jump: true, label: "jump straight" },
      { inputX: 1, jump: true, label: "jump right" }
    ];
  }

  return [
    { inputX: -1, jump: false, label: "air drift left" },
    { inputX: 0, jump: false, label: "coast" },
    { inputX: 1, jump: false, label: "air drift right" }
  ];
}

function simulatePlatformerStep(cells, node, action) {
  const wasGrounded = hasPlatformerSupport(cells, node.x, node.y);
  let nextVx = applyPlatformerInput(node.vx, action.inputX);
  let nextVy = wasGrounded
    ? (action.jump ? PLATFORMER.jumpVelocity : 0)
    : clamp(node.vy + PLATFORMER.gravity, PLATFORMER.jumpVelocity, PLATFORMER.maxFallSpeed);

  let x = node.x;
  let y = node.y;
  let touchedHazard = false;
  const trail = [keyOf(x, y)];
  const horizontalDir = Math.sign(nextVx);
  const verticalDir = Math.sign(nextVy);
  const totalHorizontalSteps = Math.abs(nextVx);
  const totalVerticalSteps = Math.abs(nextVy);
  const microSteps = Math.max(totalHorizontalSteps, totalVerticalSteps, 1);

  let movedX = 0;
  let movedY = 0;

  for (let step = 0; step < microSteps; step += 1) {
    if (movedY < totalVerticalSteps) {
      const targetY = y + verticalDir;
      if (isPlatformerSolid(cells, x, targetY)) {
        nextVy = 0;
        movedY = totalVerticalSteps;
      } else {
        y = targetY;
        movedY += 1;
        touchedHazard = touchedHazard || terrainAt(cells, x, y) === "sand";
        if (trail[trail.length - 1] !== keyOf(x, y)) {
          trail.push(keyOf(x, y));
        }
      }
    }

    if (movedX < totalHorizontalSteps) {
      const targetX = x + horizontalDir;
      if (isPlatformerSolid(cells, targetX, y)) {
        nextVx = 0;
        movedX = totalHorizontalSteps;
      } else {
        x = targetX;
        movedX += 1;
        touchedHazard = touchedHazard || terrainAt(cells, x, y) === "sand";
        if (trail[trail.length - 1] !== keyOf(x, y)) {
          trail.push(keyOf(x, y));
        }
      }
    }
  }

  let cost = 1;
  if (action.jump && wasGrounded) {
    cost += PLATFORMER.jumpPenalty;
  }
  if (!wasGrounded) {
    cost += PLATFORMER.airControlPenalty;
  }
  if (Math.sign(node.vx) !== 0 && action.inputX !== 0 && Math.sign(node.vx) !== Math.sign(action.inputX)) {
    cost += PLATFORMER.reversePenalty;
  }
  if (Math.abs(nextVx) > 0) {
    cost += Math.abs(nextVx) * PLATFORMER.momentumPenalty;
  }
  if (touchedHazard || terrainAt(cells, x, y) === "sand") {
    cost += PLATFORMER.hazardPenalty;
  }

  return {
    key: platformerStateKey(x, y, nextVx, nextVy),
    cellKey: keyOf(x, y),
    x,
    y,
    vx: nextVx,
    vy: nextVy,
    cost,
    trail,
    actionLabel: action.label
  };
}

function runMarioAStar(cells, start, goal, options) {
  const theme = getTheme();
  const heuristic = options.heuristic || "manhattan";
  const fuelLimit = Number.isFinite(options.fuelLimit) ? options.fuelLimit : Infinity;
  const recordFrames = options.recordFrames !== false;

  const startKey = platformerStateKey(start.x, start.y, 0, 0);
  const openMap = new Map();
  const closedStates = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const stateByKey = new Map();
  const frames = [];

  const startNode = {
    key: startKey,
    cellKey: keyOf(start.x, start.y),
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    trail: [keyOf(start.x, start.y)],
    g: 0,
    h: heuristicValue(heuristic, start.x, start.y, goal.x, goal.y),
    f: heuristicValue(heuristic, start.x, start.y, goal.x, goal.y)
  };

  openMap.set(startKey, startNode);
  gScore.set(startKey, 0);
  stateByKey.set(startKey, startNode);

  let expandedCount = 0;
  let success = false;
  let finalKey = null;

  while (openMap.size > 0 && expandedCount < 16000) {
    const current = chooseBestOpen(openMap);
    if (!current) break;

    openMap.delete(current.key);
    if (closedStates.has(current.key)) continue;

    closedStates.add(current.key);
    expandedCount += 1;

    if (current.x === goal.x && current.y === goal.y) {
      success = true;
      finalKey = current.key;
      if (recordFrames) {
        frames.push({
          type: "search",
          openSet: projectNodesToCells(openMap.values()),
          closedSet: projectStateKeysToCells(closedStates, stateByKey),
          pathSet: [],
          currentKey: current.cellKey,
          g: current.g,
          h: current.h,
          f: current.f,
          expandedCount,
          message: `${theme.goalLabel} reached with vx=${current.vx}, vy=${current.vy}. Reconstructing route.`
        });
      }
      break;
    }

    const grounded = hasPlatformerSupport(cells, current.x, current.y);
    const actions = getPlatformerActions(grounded);

    for (const action of actions) {
      const neighbor = simulatePlatformerStep(cells, current, action);
      if (closedStates.has(neighbor.key)) continue;

      const tentativeG = current.g + neighbor.cost;
      if (tentativeG > fuelLimit) continue;

      const previousG = gScore.get(neighbor.key);
      if (previousG !== undefined && tentativeG >= previousG) continue;

      const h = heuristicValue(heuristic, neighbor.x, neighbor.y, goal.x, goal.y);
      const candidate = {
        ...neighbor,
        g: tentativeG,
        h,
        f: tentativeG + h
      };

      cameFrom.set(candidate.key, current.key);
      gScore.set(candidate.key, tentativeG);
      openMap.set(candidate.key, candidate);
      stateByKey.set(candidate.key, candidate);
    }

    if (recordFrames) {
      frames.push({
        type: "search",
        openSet: projectNodesToCells(openMap.values()),
        closedSet: projectStateKeysToCells(closedStates, stateByKey),
        pathSet: [],
        currentKey: current.cellKey,
        g: current.g,
        h: current.h,
        f: current.f,
        expandedCount,
        message: `Expanding (${current.x + 1}, ${current.y + 1}) with vx=${current.vx}, vy=${current.vy}.`
      });
    }
  }

  const statePath = success ? reconstructPath(cameFrom, finalKey) : [];
  const pathScores = [];
  for (const stateKey of statePath) {
    const node = stateByKey.get(stateKey);
    if (!node) continue;

    const trail = Array.isArray(node.trail) && node.trail.length ? node.trail : [node.cellKey];
    for (const trailKey of trail) {
      if (pathScores[pathScores.length - 1]?.key === trailKey) continue;
      pathScores.push({
        key: trailKey,
        g: node.g,
        h: node.h,
        f: node.f
      });
    }
  }

  return {
    success,
    frames,
    path: pathScores.map((entry) => entry.key),
    pathScores,
    finalCost: success ? gScore.get(finalKey) : null,
    expandedCount,
    nodeScores: compressPlatformerScoresByCell(stateByKey),
    closedSet: new Set(projectStateKeysToCells(closedStates, stateByKey)),
    message: success ? "Route solved with platformer physics." : "No platform route under current constraints."
  };
}

function runAStar(cells, start, goal, options) {
  if (state.theme === "mario") {
    return runMarioAStar(cells, start, goal, options);
  }
  return runGridAStar(cells, start, goal, options);
}

function buildPathFrames(result, prefixExpansions = 0) {
  if (!result.path.length) return [];

  const frames = [];
  const closed = [...result.closedSet];

  for (let i = 0; i < result.path.length; i += 1) {
    const key = result.path[i];
    const scores = result.pathScores?.[i] || result.nodeScores.get(key) || { g: 0, h: 0, f: 0 };

    frames.push({
      type: "path",
      openSet: [],
      closedSet: closed,
    pathSet: new Set(result.path.slice(0, i + 1)),
    pathArray: result.path.slice(0, i + 1),
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
  const theme = getTheme();
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

  let eventMessage = `${theme.blockedLabel} shifted. Recalculating route.`;
  if (obstacleKey) {
    const { x, y } = coordsFromKey(obstacleKey);
    shiftedCells[cellIndex(x, y)] = "blocked";
    eventMessage = `${theme.blockedLabel} moved to (${x + 1}, ${y + 1}). Recalculating route.`;
  } else {
    eventMessage = `No safe tile found for new ${theme.blockedLabel.toLowerCase()}. Continuing route.`;
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
  if (playPauseBtn) {
    playPauseBtn.textContent = "▶";
    playPauseBtn.title = "Play Mission";
  }
}

function resetInstruments() {
  instrumentG.textContent = "0.00";
  instrumentH.textContent = "0.00";
  instrumentF.textContent = "0.00";
}

function updateDecisionInspector(frame) {
  const whyEl = document.getElementById("astar-decision-why");
  const detailEl = document.getElementById("astar-decision-detail");
  if (!whyEl || !detailEl) return;

  if (!frame) {
    whyEl.textContent = "Ready to inspect";
    detailEl.textContent = "Click 'Run Mission' or step through the search to analyze the algorithm's decisions in real time.";
    return;
  }

  const theme = getTheme();
  const ai = getAiName();

  if (frame.type === "event") {
    whyEl.textContent = "⚠️ Dynamic Obstacle Shifted!";
    detailEl.textContent = `${frame.message} The AI's existing path is blocked, triggering an immediate recalculation of the optimal route.`;
    return;
  }

  const { x, y } = coordsFromKey(frame.currentKey || "0,0");
  const colLetter = String.fromCharCode(65 + x);
  const rowNum = y + 1;
  const cellName = `${colLetter}${rowNum}`;

  if (frame.type === "path") {
    whyEl.textContent = `📍 Path Node: ${cellName}`;
    detailEl.textContent = `This cell is confirmed as part of the optimal path to the ${theme.goalLabel.toLowerCase()}. Cost so far g(n) = ${frame.g.toFixed(2)}.`;
  } else if (frame.type === "search") {
    if (frame.currentKey === keyOf(state.goal.x, state.goal.y)) {
      whyEl.textContent = `🏁 Goal Reached at ${cellName}!`;
      detailEl.textContent = `A* has successfully found the target. It will now backtrack using parent pointers to draw the optimal path.`;
    } else {
      whyEl.textContent = `🔍 Expanding Cell: ${cellName}`;
      
      const heuristicName = HEURISTIC_LABEL[state.heuristic] || state.heuristic;
      let heuristicExplanation = "";
      if (state.heuristic === "zero") {
        heuristicExplanation = "Dijkstra's algorithm has no directional heuristic (h = 0), so it expands cells in radial rings of uniform cost.";
      } else if (state.heuristic === "manhattan") {
        heuristicExplanation = "Manhattan distance measures horizontal + vertical steps. It assumes no diagonal movement.";
      } else if (state.heuristic === "euclidean") {
        heuristicExplanation = "Euclidean distance measures the direct straight-line distance, like a drone flying.";
      }

      detailEl.innerHTML = `
        ${ai} selected <strong>${cellName}</strong> because it has the lowest total cost in the Open Set:
        <br/><strong style="color: #3b82f6;">f(n) = ${frame.f.toFixed(2)}</strong> (g: ${frame.g.toFixed(2)} + h: ${frame.h.toFixed(2)}).
        <br/><span style="font-size: 0.85rem; color: #64748b;">${heuristicExplanation}</span>
      `;
    }
  }
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

  if (scrubberEl) {
    scrubberEl.max = 0;
    scrubberEl.value = 0;
    scrubberEl.disabled = true;
  }
  if (playPauseBtn) {
    playPauseBtn.disabled = true;
    playPauseBtn.textContent = "▶";
    playPauseBtn.title = "Play Mission";
  }
  if (scrubberLabelEl) {
    scrubberLabelEl.textContent = "0 / 0";
  }
  
  updateDecisionInspector(null);
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
    pathSet: new Set(rawFrame.pathSet || []),
    pathArray: Array.isArray(rawFrame.pathSet) ? rawFrame.pathSet : (rawFrame.pathArray || []),
    cameFrom: rawFrame.cameFrom || new Map(),
    nodeScores: rawFrame.nodeScores || new Map()
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
    updateStatus(`${getAiName()}: ${frame.message}`);
  }

  updateDecisionInspector(frame);
  renderGrid(frame);
}

function playAnimation() {
  const theme = getTheme();
  const ai = getAiName();
  stopAnimation();

  if (!state.frames.length) {
    updateStatus("No mission frames available. Adjust the map and try again.");
    return;
  }

  state.running = true;
  if (playPauseBtn) {
    playPauseBtn.textContent = "⏸";
    playPauseBtn.title = "Pause Mission";
  }

  const tick = () => {
    if (!state.running) return;

    if (state.frameIndex >= state.frames.length) {
      stopAnimation();
      if (state.lastResult?.success) {
        updateStatus(`${ai} reached the ${theme.goalLabel.toLowerCase()}. Mission complete.`);
      } else {
        updateStatus(`${ai} could not find a valid route.`);
      }
      return;
    }

    applyFrame(state.frames[state.frameIndex]);
    
    if (scrubberEl) {
      scrubberEl.value = state.frameIndex;
    }
    if (scrubberLabelEl) {
      scrubberLabelEl.textContent = `${state.frameIndex + 1} / ${state.frames.length}`;
    }

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
  const ai = getAiName();
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
  updateStatus(`${ai} is exploring...`);

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
    updateStatus(`${ai} found no route search steps. Check map setup and try again.`);
    return;
  }

  if (scrubberEl) {
    scrubberEl.max = Math.max(0, missionFrames.length - 1);
    scrubberEl.value = 0;
    scrubberEl.disabled = missionFrames.length === 0;
  }
  if (playPauseBtn) {
    playPauseBtn.disabled = missionFrames.length === 0;
  }
  if (scrubberLabelEl) {
    scrubberLabelEl.textContent = missionFrames.length > 0 ? `1 / ${missionFrames.length}` : "0 / 0";
  }

  if (state.mode === "step") {
    renderGrid();
    updateStatus(`${ai} is ready in Step mode. Press Step Expansion to advance.`);
    return;
  }

  playAnimation();
}

function stepMission() {
  const ai = getAiName();
  const theme = getTheme();
  if (state.mode !== "step") return;

  if (!state.frames.length || state.frameIndex >= state.frames.length) {
    runMission();
    if (!state.frames.length) return;
  }

  applyFrame(state.frames[state.frameIndex]);
  
  if (scrubberEl) {
    scrubberEl.value = state.frameIndex;
  }
  if (scrubberLabelEl) {
    scrubberLabelEl.textContent = `${state.frameIndex + 1} / ${state.frames.length}`;
  }

  state.frameIndex += 1;

  if (state.frameIndex >= state.frames.length) {
    if (state.lastResult?.success) {
      updateStatus(`Step mode complete: ${ai} reached the ${theme.goalLabel.toLowerCase()}.`);
    } else {
      updateStatus(`Step mode complete: ${ai} ended with no valid route.`);
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

  updateStatus(modeCopy(state.mode));
}

function createDefaultGrid() {
  state.width = Number(widthEl.value);
  state.height = Number(heightEl.value);
  state.cells = Array(state.width * state.height).fill("clear");

  if (state.theme === "mario") {
    const floorY = state.height - 1;
    const groundY = clamp(floorY - 1, 0, state.height - 1);
    const pipeX = clamp(Math.floor(state.width * 0.35), 2, state.width - 5);
    const midPlatformY = clamp(state.height - 3, 2, floorY - 1);
    const upperPlatformY = clamp(state.height - 5, 1, midPlatformY - 1);
    const midStart = clamp(pipeX + 1, 3, state.width - 5);
    const midEnd = clamp(midStart + 2, midStart, state.width - 3);
    const upperStart = clamp(midEnd + 1, midEnd + 1, state.width - 3);
    const upperEnd = clamp(upperStart + 2, upperStart, state.width - 2);

    state.start = { x: 1, y: groundY };
    state.goal = { x: clamp(upperEnd - 1, upperStart, upperEnd), y: clamp(upperPlatformY - 1, 0, state.height - 1) };

    for (let x = 0; x < state.width; x += 1) {
      state.cells[cellIndex(x, floorY)] = "blocked";
    }

    for (let x = midStart; x <= midEnd; x += 1) {
      state.cells[cellIndex(x, midPlatformY)] = "blocked";
    }

    for (let x = upperStart; x <= upperEnd; x += 1) {
      state.cells[cellIndex(x, upperPlatformY)] = "blocked";
    }

    state.cells[cellIndex(pipeX, floorY)] = "blocked";
    if (groundY >= 0) {
      state.cells[cellIndex(pipeX, groundY)] = "blocked";
    }
    if (state.height > 9) {
      state.cells[cellIndex(pipeX, clamp(groundY - 1, 0, state.height - 1))] = "blocked";
    }

    const enemyTiles = [
      { x: clamp(pipeX + 1, 0, state.width - 1), y: groundY },
      { x: clamp(midStart + 1, 0, state.width - 1), y: clamp(midPlatformY - 1, 0, state.height - 1) }
    ];

    for (const tile of enemyTiles) {
      if (isStart(tile.x, tile.y) || isGoal(tile.x, tile.y)) continue;
      if (terrainAt(state.cells, tile.x, tile.y) === "blocked") continue;
      state.cells[cellIndex(tile.x, tile.y)] = "sand";
    }

    return;
  }

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
  if (!inBounds(x, y)) return false;

  if (state.tool === "start") {
    if (isGoal(x, y) || terrainAt(state.cells, x, y) === "blocked") return false;
    if (state.start.x === x && state.start.y === y) return false;
    state.start = { x, y };
    return true;
  }

  if (state.tool === "goal") {
    if (isStart(x, y) || terrainAt(state.cells, x, y) === "blocked") return false;
    if (state.goal.x === x && state.goal.y === y) return false;
    state.goal = { x, y };
    return true;
  }

  if (isStart(x, y) || isGoal(x, y)) return false;

  const oldTerrain = terrainAt(state.cells, x, y);
  let newTerrain = "clear";
  if (state.tool === "blocked") {
    newTerrain = "blocked";
  } else if (state.tool === "sand") {
    newTerrain = "sand";
  }

  if (oldTerrain === newTerrain) return false;
  state.cells[cellIndex(x, y)] = newTerrain;
  return true;
}

function terrainClass(terrain) {
  if (terrain === "blocked") return "is-debris";
  if (terrain === "sand") return "is-sand";
  return "is-clear";
}

function describeCell(x, y, terrain, frame) {
  const theme = getTheme();
  const cellName = `${String.fromCharCode(65 + x)}${y + 1}`;
  let desc = `${cellName}: Clear`;
  if (isStart(x, y)) desc = `${cellName}: ${theme.startLabel} start`;
  else if (isGoal(x, y)) desc = `${cellName}: ${theme.goalLabel} goal`;
  else if (terrain === "blocked") desc = `${cellName}: ${theme.blockedLabel} blocked`;
  else if (terrain === "sand") desc = `${cellName}: ${theme.slowLabel} cost three`;

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
  if (!gridEl.getContext) return;
  const ctx = gridEl.getContext("2d");
  const theme = getTheme();
  const isNight = getComputedStyle(document.body).getPropertyValue('--is-night-theme') === 'true';

  const dpr = window.devicePixelRatio || 1;
  const rect = gridEl.getBoundingClientRect();
  const cWidth = rect.width;
  const cHeight = (rect.width / state.width) * state.height;

  if (gridEl.width !== Math.round(cWidth * dpr) || gridEl.height !== Math.round(cHeight * dpr)) {
    gridEl.width = Math.round(cWidth * dpr);
    gridEl.height = Math.round(cHeight * dpr);
    gridEl.style.height = `${cHeight}px`;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cWidth, cHeight);
  ctx.save();

  const cellW = cWidth / state.width;
  
  const gap = 2;
  const size = cellW - gap;
  const maxH = heuristicValue(state.heuristic, 0, 0, state.goal.x, state.goal.y) || 1;
  
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = `${Math.max(10, Math.floor(size * 0.55))}px 'IBM Plex Mono', monospace`;

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const key = keyOf(x, y);
      const cx = x * cellW + gap / 2;
      const cy = y * cellW + gap / 2;
      
      const terrain = terrainAt(state.cells, x, y);
      let bgColor = isNight ? "#1e293b" : "#f1f5f9";
      
      if (terrain === "blocked") {
        bgColor = isNight ? "#475569" : "#94a3b8"; 
      } else if (terrain === "sand") {
        bgColor = isNight ? "#ca8a04" : "#fcd34d"; 
      } else {
        if (state.showHeatmap) {
          const hVal = heuristicValue(state.heuristic, x, y, state.goal.x, state.goal.y);
          const intensity = Math.max(0, 1 - (hVal / maxH));
          const hue = 220 - (intensity * 175); // Blue to Gold
          const light = isNight ? 20 + intensity * 20 : 90 - intensity * 20;
          bgColor = `hsla(${hue}, 80%, ${light}%, 1)`;
        } else {
          bgColor = isNight ? (theme.bgDark || "#1e293b") : (theme.bg || "#f1f5f9");
        }
      }
      
      ctx.fillStyle = bgColor;
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(cx, cy, size, size, 4); ctx.fill();
      } else {
        ctx.fillRect(cx, cy, size, size);
      }

      // Draw grid coordinates in a very subtle font
      ctx.save();
      ctx.fillStyle = isNight ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)";
      ctx.font = `${Math.max(8, Math.floor(size * 0.22))}px 'IBM Plex Mono', monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const colLetter = String.fromCharCode(65 + x);
      const rowNum = y + 1;
      ctx.fillText(`${colLetter}${rowNum}`, cx + 4, cy + 4);
      ctx.restore();

      if (frame?.closedSet?.has(key) || state.lastResult?.closedSet?.has(key)) {
        ctx.fillStyle = isNight ? "rgba(148, 163, 184, 0.3)" : "rgba(148, 163, 184, 0.5)";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, size, size, 4); ctx.fill(); } 
        else { ctx.fillRect(cx, cy, size, size); }
      }
      if (frame?.openSet?.has(key)) {
        ctx.fillStyle = isNight ? "rgba(59, 130, 246, 0.4)" : "rgba(59, 130, 246, 0.5)";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, size, size, 4); ctx.fill(); } 
        else { ctx.fillRect(cx, cy, size, size); }
      }
      if (frame?.currentKey === key) {
        ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, size, size, 4); ctx.fill(); }
        else { ctx.fillRect(cx, cy, size, size); }
      }
      if (frame?.type === "event" && frame.currentKey === key) {
        ctx.save();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = Math.max(2.5, size * 0.12);
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 12;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx + 1, cy + 1, size - 2, size - 2, 4); ctx.stroke(); }
        else { ctx.strokeRect(cx + 1, cy + 1, size - 2, size - 2); }
        ctx.restore();
      }

      const parentKey = frame?.cameFrom?.get(key) || state.lastResult?.cameFrom?.get(key);
      if (parentKey && (frame?.closedSet?.has(key) || state.lastResult?.closedSet?.has(key)) && !isStart(x, y) && !isGoal(x, y)) {
        const { x: px, y: py } = coordsFromKey(parentKey);
        const pcx = px * cellW + cellW / 2;
        const pcy = py * cellW + cellW / 2;
        const ccx = x * cellW + cellW / 2;
        const ccy = y * cellW + cellW / 2;
        
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(ccx + (pcx - ccx) * 0.35, ccy + (pcy - ccy) * 0.35);
        ctx.strokeStyle = isNight ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = Math.max(1.5, size * 0.08);
        ctx.lineCap = "round";
        ctx.stroke();
      }
      
      let symbol = "";
      if (isStart(x, y)) symbol = theme.startSymbol;
      else if (isGoal(x, y)) symbol = theme.goalSymbol;
      else if (terrain === "blocked") symbol = theme.blockedSymbol;
      else if (terrain === "sand") symbol = theme.slowSymbol;
      
      if (symbol) {
        ctx.fillStyle = isNight ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.8)";
        ctx.fillText(symbol, cx + size/2, cy + size/2 + (size * 0.05));
      }
    }
  }

  const path = Array.isArray(frame?.pathArray) && frame.pathArray.length > 0 ? frame.pathArray : (state.lastResult?.path || []);
  if (path.length > 0) {
    ctx.beginPath();
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = Math.max(4, size * 0.25);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 8;
    
    for (let i = 0; i < path.length; i++) {
      const { x, y } = coordsFromKey(path[i]);
      const px = x * cellW + cellW / 2;
      const py = y * cellW + cellW / 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  if (state.hoveredCell && inBounds(state.hoveredCell.x, state.hoveredCell.y)) {
    const { x, y } = state.hoveredCell;
    const key = keyOf(x, y);
    const scores = frame?.nodeScores?.get(key) || state.lastResult?.nodeScores?.get(key);
    
    if (scores) {
      const cx = x * cellW + gap / 2;
      const cy = y * cellW + gap / 2;
      
      const hudW = Math.max(70, size * 1.8);
      const hudH = Math.max(54, size * 1.4);
      const hx = Math.min(cx, cWidth - hudW);
      const hy = Math.max(cy - hudH - 8, 0);

      ctx.fillStyle = isNight ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 12;
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(hx, hy, hudW, hudH, 6); ctx.fill();
      } else {
        ctx.fillRect(hx, hy, hudW, hudH);
      }
      ctx.shadowBlur = 0;

      ctx.lineWidth = 1;
      ctx.strokeStyle = isNight ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
      ctx.stroke();

      ctx.font = "bold 11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      ctx.fillStyle = "#3b82f6";
      ctx.fillText(`g: ${scores.g.toFixed(1)}`, hx + 8, hy + 8);
      
      ctx.fillStyle = "#22c55e";
      ctx.fillText(`h: ${scores.h.toFixed(1)}`, hx + 8, hy + 22);

      ctx.beginPath();
      ctx.moveTo(hx + 8, hy + 37);
      ctx.lineTo(hx + hudW - 8, hy + 37);
      ctx.stroke();

      ctx.fillStyle = isNight ? "#f8fafc" : "#0f172a";
      ctx.fillText(`f: ${scores.f.toFixed(1)}`, hx + 8, hy + 41);
    }
  }
  
  ctx.restore();
}

buildGridBtn.addEventListener("click", () => {
  const ai = getAiName();
  stopAnimation();
  createDefaultGrid();
  clearSearchOverlay();
  renderGrid();
  updateStatus(`New mission grid ready. ${ai} is waiting for instructions.`);
});

let isPainting = false;

function handlePointer(event) {
  if (state.running) return;
  if (event.type === "pointermove" && !isPainting) return;
  event.preventDefault(); // Prevents dragging artifacts on desktop

  const rect = gridEl.getBoundingClientRect();
  const cellW = rect.width / state.width;
  const x = Math.floor((event.clientX - rect.left) / cellW);
  const y = Math.floor((event.clientY - rect.top) / cellW);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  if (updateCellByTool(x, y)) {
    clearSearchOverlay();
    if (event.type === "pointerdown") {
      updateStatus(`${getAiName()} found a new map setup. Run Mission to test the route.`);
    }
  }
}

gridEl.addEventListener("pointerdown", (event) => {
  isPainting = true;
  handlePointer(event);
});

gridEl.addEventListener("pointermove", (event) => {
  const rect = gridEl.getBoundingClientRect();
  const cellW = rect.width / state.width;
  const hx = Math.floor((event.clientX - rect.left) / cellW);
  const hy = Math.floor((event.clientY - rect.top) / cellW);
  if (inBounds(hx, hy)) {
    const isNewCell = !state.hoveredCell || state.hoveredCell.x !== hx || state.hoveredCell.y !== hy;
    state.hoveredCell = { x: hx, y: hy };
    if (!state.running) requestAnimationFrame(() => renderGrid(state.currentFrame));
    if (isNewCell) {
      const terrain = terrainAt(state.cells, hx, hy);
      cellDescriptionEl.textContent = describeCell(hx, hy, terrain, state.currentFrame);
    }
  }
  handlePointer(event);
});

gridEl.addEventListener("pointerleave", () => {
  state.hoveredCell = null;
  cellDescriptionEl.textContent = "";
  if (!state.running) requestAnimationFrame(() => renderGrid(state.currentFrame));
});

window.addEventListener("pointerup", () => {
  isPainting = false;
});

window.addEventListener("pointercancel", () => {
  isPainting = false;
});

window.addEventListener("resize", () => {
  renderGrid();
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
  updateStatus(`${getAiName()} switched to ${HEURISTIC_LABEL[state.heuristic]} heuristic.`);
});

themeEl.addEventListener("change", () => {
  state.theme = themeEl.value;
  applyThemeUI();
  clearSearchOverlay();
  renderGrid();
  if (state.theme === "mario") {
    updateStatus(`${getAiName()} loaded Mario Adventure. Press Build Grid for the platform layout with gravity and jump physics.`);
    return;
  }
  updateStatus(`${getAiName()} loaded the ${getTheme().title} theme.`);
});

aiNameEl.addEventListener("input", () => {
  state.aiName = aiNameEl.value.trim();
  updateStatus(modeCopy(state.mode));
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
  updateStatus(`${getAiName()} reset search overlays. Grid terrain unchanged.`);
});

scrubberEl.addEventListener("input", (event) => {
  stopAnimation();
  const index = Number(event.target.value);
  state.frameIndex = index;
  applyFrame(state.frames[index]);
  if (scrubberLabelEl) {
    scrubberLabelEl.textContent = `${index + 1} / ${state.frames.length}`;
  }
});

playPauseBtn.addEventListener("click", () => {
  if (state.running) {
    stopAnimation();
  } else {
    if (state.frameIndex >= state.frames.length) {
      state.frameIndex = 0;
    }
    playAnimation();
  }
});

showHeatmapEl.addEventListener("change", () => {
  state.showHeatmap = showHeatmapEl.checked;
  renderGrid();
});

setTool("start");
state.theme = themeEl.value;
state.aiName = aiNameEl.value.trim();
applyThemeUI();
createDefaultGrid();
updateModeUI();
clearSearchOverlay();
updateStatus(`${getAiName()} is ready. Place start/goal tiles or press Run Mission.`);
