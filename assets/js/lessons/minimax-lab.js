const boardEl = document.getElementById("mm-board");
const resetBtn = document.getElementById("mm-reset");
const aiMoveBtn = document.getElementById("mm-ai-move");
const depthSelect = document.getElementById("mm-depth");
const fastWinsToggle = document.getElementById("mm-fast-wins");
const treeToggle = document.getElementById("mm-tree-toggle");

const turnRoleEl = document.getElementById("mm-turn-role");
const aiChoiceEl = document.getElementById("mm-ai-choice");
const gaugeNeedleEl = document.getElementById("mm-gauge-needle");
const tensionLabelEl = document.getElementById("mm-tension-label");
const dustLayerEl = document.getElementById("mm-dust-layer");
const eraserEl = document.getElementById("mm-eraser");

const metricDepthEl = document.getElementById("mm-metric-depth");
const metricNodesEl = document.getElementById("mm-metric-nodes");
const metricBranchEl = document.getElementById("mm-metric-branching");

const evalLogEl = document.getElementById("mm-eval-log");
const evalLogExpandBtn = document.getElementById("mm-log-expand");
const treePanelEl = document.getElementById("mm-tree-panel");
const treeEl = document.getElementById("mm-tree");

const debugToggle = document.getElementById("mm-debug-toggle");
const debugClearBtn = document.getElementById("mm-debug-clear");
const debugLogEl = document.getElementById("mm-debug-log");

const required = [
  boardEl,
  resetBtn,
  aiMoveBtn,
  depthSelect,
  fastWinsToggle,
  treeToggle,
  turnRoleEl,
  aiChoiceEl,
  gaugeNeedleEl,
  tensionLabelEl,
  dustLayerEl,
  eraserEl,
  metricDepthEl,
  metricNodesEl,
  metricBranchEl,
  evalLogEl,
  evalLogExpandBtn,
  treePanelEl,
  treeEl,
  debugToggle,
  debugClearBtn,
  debugLogEl
];

if (required.some((node) => !node)) {
  throw new Error("Minimax lab could not initialize. Missing required DOM nodes.");
}

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const state = {
  board: Array(9).fill(null),
  turn: "X",
  winner: null,
  lastMove: null,
  aiLastMove: null,
  aiHighlight: null,
  aiPending: false,
  thinkingTimer: null,
  heatmap: {},
  heatmapBestMoves: [],
  pendingMistakeMove: null,
  treeVisible: false,
  evalLogExpanded: false,
  preferFasterWins: false,
  debugEnabled: false,
  lastMetrics: {
    depth: 0,
    nodes: 0,
    branching: 0
  },
  lastEvalLog: [],
  debugLines: []
};

function moveLabel(index) {
  const row = Math.floor(index / 3) + 1;
  const col = "ABC"[index % 3];
  return `${col}${row}`;
}

function boardKey(board) {
  return board.map((cell) => cell || ".").join("");
}

function boardPretty(board) {
  return `${board[0] || "."}${board[1] || "."}${board[2] || "."}/${board[3] || "."}${board[4] || "."}${board[5] || "."}/${
    board[6] || "."
  }${board[7] || "."}${board[8] || "."}`;
}

function opposite(player) {
  return player === "X" ? "O" : "X";
}

function availableMoves(board) {
  const moves = [];
  for (let i = 0; i < board.length; i += 1) {
    if (!board[i]) moves.push(i);
  }
  return moves;
}

function getWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every(Boolean)) return "D";
  return null;
}

function terminalScore(winner) {
  if (winner === "X") return 1;
  if (winner === "O") return -1;
  return 0;
}

function terminalLabel(winner) {
  if (winner === "X") return "Win";
  if (winner === "O") return "Loss";
  return "Draw";
}

function adjustForDepth(score, depth, player) {
  if (!state.preferFasterWins) return score;
  const bump = depth * 0.01;
  if (player === "X") return score - bump;
  return score + bump;
}

function pushDebug(line) {
  if (!state.debugEnabled) return;
  state.debugLines.push(line);
  if (state.debugLines.length > 260) {
    state.debugLines = state.debugLines.slice(state.debugLines.length - 260);
  }
}

function simulateMove(board, index, player) {
  const next = board.slice();
  next[index] = player;
  return next;
}

function scoreForCurrentBoard(board, player, depthLimit) {
  const stats = { nodes: 0, maxDepth: 0, branchTotal: 0, branchSamples: 0, evalStates: [] };
  return minimax(board.slice(), player, 0, depthLimit, stats).score;
}

function computeHeatmap(board, player = "X") {
  const moves = availableMoves(board);
  const depthLimit = Math.max(1, Math.min(9, Number(depthSelect.value) || 9));
  const map = {};
  let bestScore = player === "X" ? -Infinity : Infinity;

  for (const move of moves) {
    const projected = simulateMove(board, move, player);
    const nextScore = scoreForCurrentBoard(projected, opposite(player), depthLimit - 1);
    map[move] = nextScore;
    if (player === "X") bestScore = Math.max(bestScore, nextScore);
    else bestScore = Math.min(bestScore, nextScore);
  }

  const bestMoves = moves.filter((move) => map[move] === bestScore);
  return { map, bestMoves, bestScore: Number.isFinite(bestScore) ? bestScore : 0 };
}

function tensionLabel(score) {
  if (score >= 0.75) return "X has a forced win";
  if (score >= 0.25) return "X is pressuring the board";
  if (score <= -0.75) return "O has a forced win";
  if (score <= -0.25) return "O is taking control";
  return "Perfect draw";
}

function updateTensionMeter() {
  const depthLimit = Math.max(1, Math.min(9, Number(depthSelect.value) || 9));
  const score = state.winner
    ? terminalScore(state.winner)
    : scoreForCurrentBoard(state.board, state.turn, depthLimit);

  const clamped = Math.max(-1, Math.min(1, score));
  const angle = clamped * 65;
  gaugeNeedleEl.style.transform = `rotate(${angle}deg)`;
  tensionLabelEl.textContent = tensionLabel(clamped);
}

function renderHeatmapCell(button, index) {
  if (state.turn !== "X" || state.winner || state.aiPending || state.board[index]) return;
  const score = state.heatmap[index];
  if (typeof score !== "number") return;

  button.classList.add("has-ghost");
  const ghost = document.createElement("span");
  ghost.className = "minimax-ghost-score";
  if (score > 0) ghost.classList.add("is-good");
  if (score < 0) ghost.classList.add("is-bad");
  ghost.textContent = score > 0 ? "+1" : score < 0 ? "-1" : "0";
  button.appendChild(ghost);
}

function updateHeatmapProjection() {
  if (state.turn === "X" && !state.winner && !state.aiPending) {
    const projection = computeHeatmap(state.board, "X");
    state.heatmap = projection.map;
    state.heatmapBestMoves = projection.bestMoves;
  } else {
    state.heatmap = {};
    state.heatmapBestMoves = [];
  }
}

function spawnChalkDust(index) {
  const cell = boardEl.querySelector(`[data-index="${index}"]`);
  if (!cell || !dustLayerEl) return;
  const boardRect = boardEl.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  const centerX = cellRect.left - boardRect.left + cellRect.width / 2;
  const centerY = cellRect.top - boardRect.top + cellRect.height / 2;

  for (let i = 0; i < 6; i += 1) {
    const particle = document.createElement("span");
    particle.className = "minimax-dust";
    particle.style.left = `${centerX + (Math.random() * 24 - 12)}px`;
    particle.style.top = `${centerY + (Math.random() * 18 - 9)}px`;
    particle.style.animationDelay = `${i * 20}ms`;
    dustLayerEl.appendChild(particle);
    window.setTimeout(() => particle.remove(), 700);
  }
}

function clearThinkingTimer() {
  if (state.thinkingTimer) {
    window.clearInterval(state.thinkingTimer);
    state.thinkingTimer = null;
  }
}

function renderThinkingOverlay() {
  if (!state.aiPending) return;
  const openMoves = availableMoves(state.board);
  openMoves.forEach((move) => {
    const button = boardEl.querySelector(`[data-index="${move}"]`);
    if (!button) return;
    const mark = document.createElement("span");
    mark.className = "minimax-thinking-mark";
    mark.textContent = Math.random() > 0.5 ? "X" : "O";
    button.appendChild(mark);
  });
}

function animateResetBoard(onClear) {
  if (!eraserEl) {
    onClear();
    return Promise.resolve();
  }

  eraserEl.classList.add("is-active");
  return new Promise((resolve) => {
    window.setTimeout(() => {
      onClear();
    }, 360);
    window.setTimeout(() => {
      eraserEl.classList.remove("is-active");
      resolve();
    }, 760);
  });
}

function minimax(board, player, depth, depthLimit, stats) {
  stats.nodes += 1;
  stats.maxDepth = Math.max(stats.maxDepth, depth);

  const winner = getWinner(board);
  if (winner) {
    const score = terminalScore(winner);
    if (stats.evalStates.length < 220) {
      stats.evalStates.push({
        board: boardPretty(board),
        score,
        depth,
        label: terminalLabel(winner)
      });
    }
    pushDebug(`terminal d${depth} ${boardKey(board)} => ${score} (${terminalLabel(winner)})`);
    return { score, move: null };
  }

  if (depth >= depthLimit) {
    if (stats.evalStates.length < 220) {
      stats.evalStates.push({
        board: boardPretty(board),
        score: 0,
        depth,
        label: "Cutoff"
      });
    }
    pushDebug(`cutoff d${depth} ${boardKey(board)} => 0`);
    return { score: 0, move: null };
  }

  const moves = availableMoves(board);
  stats.branchTotal += moves.length;
  stats.branchSamples += 1;

  let bestScore = player === "X" ? -Infinity : Infinity;
  let bestMove = moves[0] ?? null;

  for (const move of moves) {
    board[move] = player;
    const child = minimax(board, opposite(player), depth + 1, depthLimit, stats);
    board[move] = null;

    const candidateScore = adjustForDepth(child.score, depth + 1, player);

    pushDebug(
      `d${depth} ${player === "X" ? "MAX" : "MIN"} move ${moveLabel(move)} child=${child.score.toFixed(2)} adjusted=${candidateScore.toFixed(2)}`
    );

    if (player === "X") {
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestMove = move;
      }
    } else if (candidateScore < bestScore) {
      bestScore = candidateScore;
      bestMove = move;
    }
  }

  return { score: bestScore, move: bestMove };
}

function buildTreeNode(board, player, depth, depthLimit) {
  const winner = getWinner(board);
  const node = {
    id: `${depth}-${boardKey(board)}-${player}`,
    board: board.slice(),
    player,
    depth,
    move: null,
    score: 0,
    terminal: null,
    children: [],
    bestChildId: null
  };

  if (winner) {
    node.score = terminalScore(winner);
    node.terminal = terminalLabel(winner);
    return node;
  }

  if (depth >= depthLimit) {
    node.score = 0;
    node.terminal = "Cutoff";
    return node;
  }

  const moves = availableMoves(board);
  if (!moves.length) {
    node.score = 0;
    node.terminal = "Draw";
    return node;
  }

  let bestScore = player === "X" ? -Infinity : Infinity;
  let bestChildId = null;

  for (const move of moves) {
    board[move] = player;
    const child = buildTreeNode(board, opposite(player), depth + 1, depthLimit);
    board[move] = null;

    child.move = move;
    node.children.push(child);

    const candidate = adjustForDepth(child.score, depth + 1, player);

    if (player === "X") {
      if (candidate > bestScore) {
        bestScore = candidate;
        bestChildId = child.id;
      }
    } else if (candidate < bestScore) {
      bestScore = candidate;
      bestChildId = child.id;
    }
  }

  node.score = bestScore;
  node.bestChildId = bestChildId;
  return node;
}

function collectTreeLevels(node, levels = []) {
  if (!levels[node.depth]) levels[node.depth] = [];
  levels[node.depth].push(node);
  for (const child of node.children) {
    collectTreeLevels(child, levels);
  }
  return levels;
}

function roleTag(player) {
  return player === "X"
    ? '<span class="minimax-role-max">MAX</span>'
    : '<span class="minimax-role-min">MIN</span>';
}

function renderTree() {
  if (!state.treeVisible) {
    treePanelEl.hidden = true;
    return;
  }

  treePanelEl.hidden = false;
  treeEl.innerHTML = "";

  const partialDepth = Math.min(3, Number(depthSelect.value) || 9);
  const root = buildTreeNode(state.board.slice(), state.turn, 0, partialDepth);
  const levels = collectTreeLevels(root);

  for (let d = 0; d < levels.length; d += 1) {
    const row = document.createElement("section");
    row.className = "minimax-tree-level";

    const heading = document.createElement("h4");
    heading.textContent = `Depth ${d}`;
    row.appendChild(heading);

    const nodesWrap = document.createElement("div");
    nodesWrap.className = "minimax-tree-nodes";

    for (const node of levels[d]) {
      const article = document.createElement("article");
      article.className = "minimax-tree-node";

      if (node.terminal) {
        article.classList.add("is-terminal");
      } else if (node.player === "X") {
        article.classList.add("is-max");
      } else {
        article.classList.add("is-min");
      }

      const title = document.createElement("p");
      title.className = "minimax-tree-node-title";
      title.innerHTML = node.move === null ? `ROOT · ${roleTag(node.player)}` : `${moveLabel(node.move)} · ${roleTag(node.player)}`;

      const boardState = document.createElement("p");
      boardState.className = "minimax-tree-node-board";
      boardState.textContent = boardPretty(node.board);

      const score = document.createElement("p");
      score.className = "minimax-tree-node-score";
      score.textContent = `score ${node.score.toFixed(2)}`;

      article.append(title, boardState, score);

      if (node.terminal) {
        const terminal = document.createElement("p");
        terminal.className = "minimax-tree-node-terminal";
        terminal.textContent = node.terminal;
        article.appendChild(terminal);
      } else if (node.bestChildId) {
        const best = node.children.find((child) => child.id === node.bestChildId);
        if (best && Number.isInteger(best.move)) {
          const pick = document.createElement("p");
          pick.className = "minimax-tree-node-pick";
          pick.textContent = `best -> ${moveLabel(best.move)}`;
          article.appendChild(pick);
        }
      }

      nodesWrap.appendChild(article);
    }

    row.appendChild(nodesWrap);
    treeEl.appendChild(row);
  }
}

function updateMetrics(metrics) {
  state.lastMetrics = metrics;
  metricDepthEl.textContent = String(metrics.depth);
  metricNodesEl.textContent = String(metrics.nodes);
  metricBranchEl.textContent = metrics.branching.toFixed(2);
}

function renderEvalLog(entries) {
  state.lastEvalLog = entries.slice(0, 220);
  evalLogEl.innerHTML = "";

  if (!entries.length) {
    evalLogEl.textContent = "Run an AI move to populate evaluated states.";
    evalLogEl.classList.remove("is-expanded");
    state.evalLogExpanded = false;
    evalLogExpandBtn.hidden = true;
    evalLogExpandBtn.setAttribute("aria-expanded", "false");
    evalLogExpandBtn.textContent = "Show more";
    return;
  }

  const frag = document.createDocumentFragment();
  for (const entry of entries) {
    const line = document.createElement("div");
    line.className = "minimax-log-line";
    line.textContent = `d${entry.depth} ${entry.board} => ${entry.score.toFixed(2)} (${entry.label})`;
    frag.appendChild(line);
  }
  evalLogEl.appendChild(frag);

  const shouldShowToggle = entries.length > 14;
  evalLogExpandBtn.hidden = !shouldShowToggle;
  if (!shouldShowToggle) {
    evalLogEl.classList.remove("is-expanded");
    state.evalLogExpanded = false;
    evalLogExpandBtn.setAttribute("aria-expanded", "false");
    evalLogExpandBtn.textContent = "Show more";
    return;
  }

  evalLogEl.classList.toggle("is-expanded", state.evalLogExpanded);
  evalLogExpandBtn.setAttribute("aria-expanded", state.evalLogExpanded ? "true" : "false");
  evalLogExpandBtn.textContent = state.evalLogExpanded ? "Show less" : "Show more";
}

function renderDebugLog() {
  debugLogEl.textContent = state.debugLines.length ? state.debugLines.join("\n") : "Debug logging is idle.";
}

function outcomeMessage(winner) {
  if (winner === "X") return "Game over: X (Maximizer) wins.";
  if (winner === "O") return "Game over: O (Minimizer) wins.";
  if (winner === "D") return "Game over: Draw.";
  return "";
}

function renderTurnRole() {
  if (state.winner) {
    turnRoleEl.className = "minimax-turn-pill minimax-terminal";
    turnRoleEl.textContent = outcomeMessage(state.winner);
    return;
  }

  if (state.turn === "X") {
    turnRoleEl.className = "minimax-turn-pill minimax-role-max";
    turnRoleEl.textContent = "X turn · Maximizer";
  } else {
    turnRoleEl.className = "minimax-turn-pill minimax-role-min";
    turnRoleEl.textContent = "O turn · Minimizer";
  }
}

function renderBoard() {
  boardEl.innerHTML = "";

  for (let i = 0; i < 9; i += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "minimax-cell";
    button.setAttribute("role", "gridcell");
    button.dataset.index = String(i);

    const row = Math.floor(i / 3) + 1;
    const col = (i % 3) + 1;
    button.setAttribute("aria-label", `Cell ${row}, ${col}`);

    const value = state.board[i];
    if (value) {
      button.textContent = value;
      button.classList.add(value === "X" ? "is-max" : "is-min");
    }

    if (state.lastMove === i) {
      button.classList.add("is-last-move");
    }

    if (state.aiHighlight === i || state.aiLastMove === i) {
      button.classList.add("is-ai-choice");
    }

    if (state.pendingMistakeMove === i) {
      button.classList.add("is-mistake");
    }

    button.disabled = Boolean(value) || Boolean(state.winner) || state.turn !== "X" || state.aiPending;
    button.addEventListener("click", () => {
      onPlayerMove(i);
    });

    renderHeatmapCell(button, i);
    boardEl.appendChild(button);
  }

  if (state.aiPending) {
    renderThinkingOverlay();
  }

  aiMoveBtn.disabled = state.winner !== null || state.turn !== "O" || state.aiPending;
}

function setWinnerIfEnded() {
  state.winner = getWinner(state.board);
}

function applyMove(index, player) {
  if (state.board[index] || state.winner) return;
  state.board[index] = player;
  state.lastMove = index;
  spawnChalkDust(index);
  if (player === "O") {
    state.aiLastMove = index;
  }
  setWinnerIfEnded();
  if (!state.winner) {
    state.turn = opposite(player);
  }
}

function runAiSearchAndMove() {
  if (state.winner || state.turn !== "O" || state.aiPending) return;
  state.aiPending = true;

  const stats = {
    nodes: 0,
    maxDepth: 0,
    branchTotal: 0,
    branchSamples: 0,
    evalStates: []
  };

  const depthLimit = Math.max(1, Math.min(9, Number(depthSelect.value) || 9));
  const result = minimax(state.board.slice(), "O", 0, depthLimit, stats);

  const metrics = {
    depth: stats.maxDepth,
    nodes: stats.nodes,
    branching: stats.branchSamples ? stats.branchTotal / stats.branchSamples : 0
  };

  updateMetrics(metrics);
  renderEvalLog(stats.evalStates);
  renderDebugLog();

  if (!Number.isInteger(result.move)) {
    state.aiPending = false;
    renderBoard();
    return;
  }

  state.aiHighlight = result.move;
  state.aiLastMove = result.move;
  aiChoiceEl.textContent = `AI chose ${moveLabel(result.move)} with score ${result.score.toFixed(2)}.`;
  renderTurnRole();
  renderBoard();

  const thinkingDuration = 520;
  const start = performance.now();
  clearThinkingTimer();
  state.thinkingTimer = window.setInterval(() => {
    const elapsed = performance.now() - start;
    const progress = Math.min(1, elapsed / thinkingDuration);
    metricNodesEl.textContent = String(Math.max(1, Math.round(metrics.nodes * progress)));
    renderBoard();
  }, 70);

  window.setTimeout(() => {
    clearThinkingTimer();
    applyMove(result.move, "O");
    state.aiHighlight = null;
    state.aiPending = false;
    renderTurnRole();
    updateHeatmapProjection();
    updateTensionMeter();
    renderBoard();
    renderTree();
  }, thinkingDuration);
}

function onPlayerMove(index) {
  if (state.turn !== "X" || state.winner || state.board[index]) return;

  if (state.heatmapBestMoves.length) {
    state.pendingMistakeMove = state.heatmapBestMoves.includes(index) ? null : index;
  }
  applyMove(index, "X");
  aiChoiceEl.textContent = "AI is evaluating replies...";
  renderTurnRole();
  updateHeatmapProjection();
  updateTensionMeter();
  renderBoard();
  renderTree();

  if (!state.winner) {
    window.setTimeout(() => {
      runAiSearchAndMove();
    }, 120);
  } else {
    aiChoiceEl.textContent = outcomeMessage(state.winner);
  }
}

function resetGame({ animate = true } = {}) {
  clearThinkingTimer();
  const runReset = () => {
    state.board = Array(9).fill(null);
    state.turn = "X";
    state.winner = null;
    state.lastMove = null;
    state.aiLastMove = null;
    state.aiHighlight = null;
    state.aiPending = false;
    state.evalLogExpanded = false;
    state.pendingMistakeMove = null;
    state.heatmap = {};
    state.heatmapBestMoves = [];

    aiChoiceEl.textContent = "AI choice will appear here after search.";

    updateMetrics({ depth: 0, nodes: 0, branching: 0 });
    renderEvalLog([]);
    renderTurnRole();
    updateHeatmapProjection();
    updateTensionMeter();
    renderBoard();
    renderTree();
    renderDebugLog();
  };

  if (animate) {
    animateResetBoard(runReset);
  } else {
    runReset();
  }
}

resetBtn.addEventListener("click", () => {
  resetGame();
});

aiMoveBtn.addEventListener("click", () => {
  runAiSearchAndMove();
});

depthSelect.addEventListener("change", () => {
  updateHeatmapProjection();
  updateTensionMeter();
  renderBoard();
  renderTree();
});

fastWinsToggle.addEventListener("change", () => {
  state.preferFasterWins = fastWinsToggle.checked;
  aiChoiceEl.textContent = state.preferFasterWins
    ? "Depth bias enabled: engine prefers faster outcomes in equal-score lines."
    : "Depth bias disabled: pure terminal-score minimax.";
  updateHeatmapProjection();
  updateTensionMeter();
  renderBoard();
  renderTree();
});

treeToggle.addEventListener("change", () => {
  state.treeVisible = treeToggle.checked;
  if (state.treeVisible) {
    treePanelEl.open = window.matchMedia("(min-width: 900px)").matches;
  }
  renderTree();
});

evalLogExpandBtn.addEventListener("click", () => {
  state.evalLogExpanded = !state.evalLogExpanded;
  evalLogEl.classList.toggle("is-expanded", state.evalLogExpanded);
  evalLogExpandBtn.setAttribute("aria-expanded", state.evalLogExpanded ? "true" : "false");
  evalLogExpandBtn.textContent = state.evalLogExpanded ? "Show less" : "Show more";
});

debugToggle.addEventListener("change", () => {
  state.debugEnabled = debugToggle.checked;
  if (!state.debugEnabled) {
    state.debugLines.push("Debug logging disabled.");
  } else {
    state.debugLines.push("Debug logging enabled.");
  }
  renderDebugLog();
});

debugClearBtn.addEventListener("click", () => {
  state.debugLines = [];
  renderDebugLog();
});

resetGame({ animate: false });
