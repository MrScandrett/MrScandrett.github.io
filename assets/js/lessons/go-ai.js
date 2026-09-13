const SIZE = 9;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const KOMI = 6.5;
const GO_COLUMNS = ["A", "B", "C", "D", "E", "F", "G", "H", "J"];
const STAR_POINTS = new Set(["2,2", "2,6", "4,4", "6,2", "6,6"]);
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const AI_LEVELS = {
  easy: { candidates: 8, playouts: 5, depth: 42, label: "Curious" },
  standard: { candidates: 16, playouts: 10, depth: 62, label: "Strategic" },
  hard: { candidates: 24, playouts: 16, depth: 82, label: "Relentless" },
};

const byId = (id) => document.getElementById(id);

let board;
let koHash;
let blackCaps;
let whiteCaps;
let consecutivePasses;
let gameOver;
let aiThinking;
let lastPlaced;
let moveCount;
let lastEvent;
let moveLog;
let roundHistory;
let territoryVisible;
let hintPoint;
let aiLevel;
let aiTimer;

function createBoard() {
  return Array.from({ length: SIZE }, () => new Array(SIZE).fill(EMPTY));
}

function cloneBoard(value) {
  return value.map((row) => [...row]);
}

function inBounds(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function boardHash(value) {
  return value.flat().join("");
}

function getGroup(value, row, col) {
  const color = value[row][col];
  const stones = [];
  const liberties = new Set();
  const visited = new Set();
  const stack = [[row, col]];

  while (stack.length) {
    const [currentRow, currentCol] = stack.pop();
    const key = currentRow * SIZE + currentCol;
    if (visited.has(key)) continue;
    visited.add(key);
    stones.push([currentRow, currentCol]);

    for (const [rowDelta, colDelta] of DIRS) {
      const nextRow = currentRow + rowDelta;
      const nextCol = currentCol + colDelta;
      if (!inBounds(nextRow, nextCol)) continue;
      const nextKey = nextRow * SIZE + nextCol;
      if (value[nextRow][nextCol] === EMPTY) {
        liberties.add(nextKey);
      } else if (value[nextRow][nextCol] === color && !visited.has(nextKey)) {
        stack.push([nextRow, nextCol]);
      }
    }
  }

  return { stones, liberties };
}

function removeGroup(value, row, col) {
  const { stones } = getGroup(value, row, col);
  for (const [stoneRow, stoneCol] of stones) value[stoneRow][stoneCol] = EMPTY;
  return stones.length;
}

function evaluateMove(value, color, row, col, forbiddenHash) {
  if (!inBounds(row, col) || value[row][col] !== EMPTY) {
    return { ok: false, reason: "occupied" };
  }

  const nextBoard = cloneBoard(value);
  const opponent = color === BLACK ? WHITE : BLACK;
  nextBoard[row][col] = color;
  let captured = 0;

  for (const [rowDelta, colDelta] of DIRS) {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;
    if (!inBounds(nextRow, nextCol) || nextBoard[nextRow][nextCol] !== opponent) continue;
    if (getGroup(nextBoard, nextRow, nextCol).liberties.size === 0) {
      captured += removeGroup(nextBoard, nextRow, nextCol);
    }
  }

  const ownGroup = getGroup(nextBoard, row, col);
  if (ownGroup.liberties.size === 0) return { ok: false, reason: "no-liberties" };
  if (forbiddenHash && boardHash(nextBoard) === forbiddenHash) {
    return { ok: false, reason: "ko" };
  }

  return {
    ok: true,
    board: nextBoard,
    captured,
    liberties: ownGroup.liberties.size,
    groupSize: ownGroup.stones.length,
  };
}

function getLegalMoves(value, color, forbiddenHash) {
  const moves = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (value[row][col] !== EMPTY) continue;
      const result = evaluateMove(value, color, row, col, forbiddenHash);
      if (result.ok) moves.push([row, col]);
    }
  }
  return moves;
}

function analyzeTerritory(value) {
  const owner = Array.from({ length: SIZE }, () => new Array(SIZE).fill(EMPTY));
  const claimed = new Uint8Array(SIZE * SIZE);
  let black = 0;
  let white = KOMI;

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (value[row][col] === BLACK) {
        black += 1;
        continue;
      }
      if (value[row][col] === WHITE) {
        white += 1;
        continue;
      }
      if (claimed[row * SIZE + col]) continue;

      const region = [];
      const borders = new Set();
      const stack = [[row, col]];
      const seen = new Set([row * SIZE + col]);

      while (stack.length) {
        const [currentRow, currentCol] = stack.pop();
        region.push([currentRow, currentCol]);
        for (const [rowDelta, colDelta] of DIRS) {
          const nextRow = currentRow + rowDelta;
          const nextCol = currentCol + colDelta;
          if (!inBounds(nextRow, nextCol)) continue;
          const nextKey = nextRow * SIZE + nextCol;
          if (value[nextRow][nextCol] === EMPTY && !seen.has(nextKey)) {
            seen.add(nextKey);
            stack.push([nextRow, nextCol]);
          } else if (value[nextRow][nextCol] !== EMPTY) {
            borders.add(value[nextRow][nextCol]);
          }
        }
      }

      const regionOwner = borders.size === 1 ? [...borders][0] : EMPTY;
      for (const [emptyRow, emptyCol] of region) {
        claimed[emptyRow * SIZE + emptyCol] = 1;
        owner[emptyRow][emptyCol] = regionOwner;
      }
      if (regionOwner === BLACK) black += region.length;
      if (regionOwner === WHITE) white += region.length;
    }
  }

  return { black, white, owner };
}

function scoreBoard(value) {
  const { black, white } = analyzeTerritory(value);
  return { black, white };
}

function tacticalValue(value, color, row, col, forbiddenHash) {
  const result = evaluateMove(value, color, row, col, forbiddenHash);
  if (!result.ok) return -Infinity;
  const centerDistance = Math.abs(row - 4) + Math.abs(col - 4);
  let nearbyFriends = 0;
  let pressuredEnemies = 0;

  for (const [rowDelta, colDelta] of DIRS) {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;
    if (!inBounds(nextRow, nextCol)) continue;
    if (value[nextRow][nextCol] === color) nearbyFriends += 1;
    if (value[nextRow][nextCol] && value[nextRow][nextCol] !== color) {
      const enemyGroup = getGroup(value, nextRow, nextCol);
      if (enemyGroup.liberties.size <= 2) pressuredEnemies += 1;
    }
  }

  return (
    result.captured * 45 +
    pressuredEnemies * 7 +
    nearbyFriends * 3 +
    Math.min(result.liberties, 4) * 2 +
    result.groupSize * 0.35 -
    centerDistance * 0.25
  );
}

function randomPlayout(startBoard, color, forbiddenHash, maxDepth) {
  let simulationBoard = cloneBoard(startBoard);
  let simulationKoHash = forbiddenHash;
  let passes = 0;

  for (let step = 0; step < maxDepth; step++) {
    const sampled = [];
    for (let attempt = 0; attempt < 18; attempt++) {
      const row = Math.floor(Math.random() * SIZE);
      const col = Math.floor(Math.random() * SIZE);
      if (simulationBoard[row][col] !== EMPTY) continue;
      const result = evaluateMove(simulationBoard, color, row, col, simulationKoHash);
      if (result.ok) sampled.push({ row, col, result });
      if (sampled.length === 4) break;
    }

    if (!sampled.length) {
      passes += 1;
      if (passes >= 2) break;
    } else {
      passes = 0;
      const choice = sampled[Math.floor(Math.random() * sampled.length)];
      const oldHash = boardHash(simulationBoard);
      simulationBoard = choice.result.board;
      simulationKoHash = oldHash;
    }
    color = color === BLACK ? WHITE : BLACK;
  }

  const { black, white } = scoreBoard(simulationBoard);
  return black - white;
}

function chooseBestMove(value, color, forbiddenHash) {
  const settings = AI_LEVELS[aiLevel];
  let moves = getLegalMoves(value, color, forbiddenHash);
  if (!moves.length) return null;

  moves = moves
    .map(([row, col]) => ({
      row,
      col,
      tactical: tacticalValue(value, color, row, col, forbiddenHash) + Math.random() * 4,
    }))
    .sort((a, b) => b.tactical - a.tactical)
    .slice(0, settings.candidates);

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const candidate of moves) {
    const placed = evaluateMove(value, color, candidate.row, candidate.col, forbiddenHash);
    if (!placed.ok) continue;
    let total = candidate.tactical * 1.8;
    const oldHash = boardHash(value);
    const opponent = color === BLACK ? WHITE : BLACK;

    for (let playout = 0; playout < settings.playouts; playout++) {
      const score = randomPlayout(placed.board, opponent, oldHash, settings.depth);
      total += color === BLACK ? score : -score;
    }

    if (total > bestScore) {
      bestScore = total;
      bestMove = candidate;
    }
  }

  return [bestMove.row, bestMove.col];
}

function formatMoveLabel(row, col) {
  return `${GO_COLUMNS[col]}${SIZE - row}`;
}

function setStatus(message) {
  byId("go-status").textContent = message;
}

function explainIllegalMove(reason) {
  if (reason === "occupied") return "That crossing already has a stone. Choose an empty point.";
  if (reason === "no-liberties") return "That move has no breathing space. Connect elsewhere or capture first.";
  if (reason === "ko") return "Ko rule: you cannot immediately recreate the previous board.";
  return "That move is not legal. Try another crossing.";
}

function syncText(id, value) {
  const element = byId(id);
  if (element) element.textContent = String(value);
}

function snapshotGame() {
  return {
    board: cloneBoard(board),
    koHash,
    blackCaps,
    whiteCaps,
    consecutivePasses,
    lastPlaced: lastPlaced ? [...lastPlaced] : null,
    moveCount,
    lastEvent,
    moveLog: [...moveLog],
  };
}

function restoreSnapshot(snapshot) {
  board = cloneBoard(snapshot.board);
  koHash = snapshot.koHash;
  blackCaps = snapshot.blackCaps;
  whiteCaps = snapshot.whiteCaps;
  consecutivePasses = snapshot.consecutivePasses;
  lastPlaced = snapshot.lastPlaced ? [...snapshot.lastPlaced] : null;
  moveCount = snapshot.moveCount;
  lastEvent = snapshot.lastEvent;
  moveLog = [...snapshot.moveLog];
  gameOver = false;
  aiThinking = false;
  hintPoint = null;
  renderBoard();
}

function updateMission() {
  const mission = byId("go-mission");
  const text = byId("go-mission-text");
  let biggestGroup = 0;
  const seen = new Set();

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] !== BLACK || seen.has(row * SIZE + col)) continue;
      const group = getGroup(board, row, col);
      group.stones.forEach(([groupRow, groupCol]) => seen.add(groupRow * SIZE + groupCol));
      biggestGroup = Math.max(biggestGroup, group.stones.length);
    }
  }

  if (blackCaps > 0) {
    mission.classList.add("is-complete");
    text.textContent = `Capture achieved — ${blackCaps} White stone${blackCaps === 1 ? "" : "s"} removed.`;
  } else if (biggestGroup >= 3) {
    mission.classList.add("is-complete");
    text.textContent = "Connected group built. Next mission: capture one White stone.";
  } else {
    mission.classList.remove("is-complete");
    text.textContent = `Build a connected group of three Black stones (${biggestGroup}/3).`;
  }
}

function updateControls() {
  const disabled = gameOver || aiThinking;
  ["go-pass", "go-pass-main", "go-resign", "go-resign-main", "go-hint"].forEach((id) => {
    if (byId(id)) byId(id).disabled = disabled;
  });
  byId("go-undo").disabled = disabled || roundHistory.length === 0;
  byId("go-difficulty").disabled = aiThinking;
  byId("go-difficulty-panel").disabled = aiThinking;
}

function updateHud() {
  const turnLabel = gameOver ? "Game complete" : aiThinking ? "White is searching" : "Black to play";
  const { black, white } = scoreBoard(board);
  const lead = black === white
    ? "Even"
    : black > white
      ? `Black +${(black - white).toFixed(1)}`
      : `White +${(white - black).toFixed(1)}`;

  syncText("go-turn-label", turnLabel);
  syncText("go-turn-label-panel", gameOver ? "Complete" : aiThinking ? "White" : "Black");
  syncText("go-move-count", moveCount);
  syncText("go-move-count-panel", moveCount);
  syncText("go-score-estimate", `Black ${black.toFixed(1)} | White ${white.toFixed(1)} (${lead})`);
  syncText("go-last-move", lastEvent);
  syncText("black-captures", blackCaps);
  syncText("white-captures", whiteCaps);
  syncText("black-captures-panel", blackCaps);
  syncText("white-captures-panel", whiteCaps);

  const log = byId("go-move-log");
  log.replaceChildren();
  const items = moveLog.length ? [...moveLog].reverse().slice(0, 6) : ["No moves yet"];
  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    log.appendChild(listItem);
  });

  updateMission();
  updateControls();
}

function territoryClass(row, col, territory) {
  if (!territoryVisible || board[row][col] !== EMPTY) return "";
  if (territory[row][col] === BLACK) return " territory-black";
  if (territory[row][col] === WHITE) return " territory-white";
  return " territory-neutral";
}

function renderBoard() {
  const container = byId("go-board");
  const territory = analyzeTerritory(board).owner;
  container.replaceChildren();

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const cell = document.createElement("button");
      const point = formatMoveLabel(row, col);
      const isHint = hintPoint && hintPoint[0] === row && hintPoint[1] === col;
      cell.type = "button";
      cell.className = `go-intersection${isHint ? " is-hint" : ""}${territoryClass(row, col, territory)}`;
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-rowindex", String(row + 1));
      cell.setAttribute("aria-colindex", String(col + 1));
      cell.setAttribute("aria-label", `Empty intersection ${point}`);

      if (STAR_POINTS.has(`${row},${col}`)) {
        const dot = document.createElement("span");
        dot.className = "go-hoshi";
        cell.appendChild(dot);
      }

      if (board[row][col] !== EMPTY) {
        const stone = document.createElement("span");
        const isLast = lastPlaced && lastPlaced[0] === row && lastPlaced[1] === col;
        stone.className = `go-stone ${board[row][col] === BLACK ? "black" : "white"}${isLast ? " last" : ""}`;
        cell.appendChild(stone);
        cell.setAttribute("aria-label", `${board[row][col] === BLACK ? "Black" : "White"} stone at ${point}${isLast ? ", last move" : ""}`);
      }

      cell.disabled = board[row][col] !== EMPTY || gameOver || aiThinking;
      if (!cell.disabled) cell.addEventListener("click", () => handlePlayerMove(row, col));
      cell.addEventListener("keydown", handleBoardKeydown);
      container.appendChild(cell);
    }
  }

  updateHud();
}

function handleBoardKeydown(event) {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const cell = event.currentTarget;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  const rowDelta = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
  const colDelta = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
  const nextRow = Math.max(0, Math.min(SIZE - 1, row + rowDelta));
  const nextCol = Math.max(0, Math.min(SIZE - 1, col + colDelta));
  byId("go-board").querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"]`)?.focus();
}

function recordMove(label) {
  moveLog.push(label);
  if (moveLog.length > 24) moveLog.shift();
}

function handlePlayerMove(row, col) {
  if (gameOver || aiThinking) return;
  const result = evaluateMove(board, BLACK, row, col, koHash);
  if (!result.ok) {
    setStatus(explainIllegalMove(result.reason));
    return;
  }

  roundHistory.push(snapshotGame());
  if (roundHistory.length > 10) roundHistory.shift();
  const oldHash = boardHash(board);
  board = result.board;
  koHash = oldHash;
  blackCaps += result.captured;
  lastPlaced = [row, col];
  moveCount += 1;
  lastEvent = `Black played ${formatMoveLabel(row, col)}`;
  recordMove(`${moveCount}. Black · ${formatMoveLabel(row, col)}${result.captured ? ` (+${result.captured})` : ""}`);
  consecutivePasses = 0;
  hintPoint = null;

  renderBoard();
  triggerAI();
}

function handlePlayerPass() {
  if (gameOver || aiThinking) return;
  roundHistory.push(snapshotGame());
  lastPlaced = null;
  lastEvent = "Black passed";
  consecutivePasses += 1;
  moveCount += 1;
  recordMove(`${moveCount}. Black · pass`);
  if (consecutivePasses >= 2) {
    endGame();
    return;
  }
  setStatus("You passed. White is searching…");
  renderBoard();
  triggerAI();
}

function handleResign() {
  if (gameOver || aiThinking) return;
  gameOver = true;
  lastPlaced = null;
  lastEvent = "Black resigned";
  recordMove("Black resigned");
  setStatus("White wins by resignation. Start a new game and try a different opening.");
  renderBoard();
}

function triggerAI() {
  aiThinking = true;
  setStatus(`${AI_LEVELS[aiLevel].label} AI is evaluating the board…`);
  renderBoard();

  aiTimer = window.setTimeout(() => {
    const move = chooseBestMove(board, WHITE, koHash);
    if (!move) {
      consecutivePasses += 1;
      aiThinking = false;
      lastPlaced = null;
      lastEvent = "White passed";
      moveCount += 1;
      recordMove(`${moveCount}. White · pass`);
      if (consecutivePasses >= 2) {
        endGame();
        return;
      }
      setStatus("White passed. Your turn.");
      renderBoard();
      return;
    }

    const [row, col] = move;
    const result = evaluateMove(board, WHITE, row, col, koHash);
    if (!result.ok) {
      aiThinking = false;
      setStatus("White abandoned an invalid line. Your turn.");
      renderBoard();
      return;
    }

    const oldHash = boardHash(board);
    board = result.board;
    koHash = oldHash;
    whiteCaps += result.captured;
    lastPlaced = [row, col];
    moveCount += 1;
    lastEvent = `White played ${formatMoveLabel(row, col)}`;
    recordMove(`${moveCount}. White · ${formatMoveLabel(row, col)}${result.captured ? ` (+${result.captured})` : ""}`);
    consecutivePasses = 0;
    aiThinking = false;
    renderBoard();
    setStatus(result.captured
      ? `White captured ${result.captured} stone${result.captured === 1 ? "" : "s"} at ${formatMoveLabel(row, col)}. Your turn.`
      : `White played ${formatMoveLabel(row, col)}. Your turn.`);
  }, 90);
}

function showHint() {
  if (gameOver || aiThinking) return;
  const legalMoves = getLegalMoves(board, BLACK, koHash);
  if (!legalMoves.length) {
    setStatus("No legal placement is available. Passing is the best move.");
    return;
  }

  const { row, col } = legalMoves
    .map(([moveRow, moveCol]) => ({
      row: moveRow,
      col: moveCol,
      value: tacticalValue(board, BLACK, moveRow, moveCol, koHash),
    }))
    .sort((a, b) => b.value - a.value)[0];

  hintPoint = [row, col];
  const result = evaluateMove(board, BLACK, row, col, koHash);
  const reason = result.captured
    ? `It captures ${result.captured} White stone${result.captured === 1 ? "" : "s"}.`
    : result.groupSize > 1
      ? "It strengthens a connected group."
      : "It creates useful breathing room near the center.";
  setStatus(`Hint: consider ${formatMoveLabel(row, col)}. ${reason}`);
  renderBoard();
}

function toggleTerritory() {
  territoryVisible = !territoryVisible;
  const button = byId("go-territory");
  button.setAttribute("aria-pressed", String(territoryVisible));
  button.textContent = territoryVisible ? "Hide territory" : "Territory view";
  setStatus(territoryVisible
    ? "Territory view: dark dots favor Black, light dots favor White, and gold is still contested."
    : "Territory view hidden. Your turn.");
  renderBoard();
}

function undoRound() {
  if (gameOver || aiThinking || !roundHistory.length) return;
  const snapshot = roundHistory.pop();
  restoreSnapshot(snapshot);
  setStatus("Round undone. Try a different Black move.");
}

function setAiLevel(value) {
  if (!AI_LEVELS[value] || aiThinking) return;
  aiLevel = value;
  byId("go-difficulty").value = value;
  byId("go-difficulty-panel").value = value;
  try {
    localStorage.setItem("go-ai-level", value);
  } catch {
    // Storage is optional.
  }
  setStatus(`${AI_LEVELS[value].label} AI selected. The new strength applies to White's next move.`);
}

function resetGame() {
  window.clearTimeout(aiTimer);
  board = createBoard();
  koHash = null;
  blackCaps = 0;
  whiteCaps = 0;
  consecutivePasses = 0;
  gameOver = false;
  aiThinking = false;
  lastPlaced = null;
  moveCount = 0;
  lastEvent = "None yet";
  moveLog = [];
  roundHistory = [];
  territoryVisible = false;
  hintPoint = null;
  byId("go-territory").setAttribute("aria-pressed", "false");
  byId("go-territory").textContent = "Territory view";
  renderBoard();
  setStatus("Your turn. Place a Black stone, or ask for a hint to learn a strong opening.");
}

function endGame() {
  gameOver = true;
  aiThinking = false;
  const { black, white } = scoreBoard(board);
  const winner = black > white ? "Black" : "White";
  const margin = Math.abs(black - white).toFixed(1);
  lastEvent = `${winner} won by ${margin}`;
  recordMove(`${winner} wins · +${margin}`);
  territoryVisible = true;
  byId("go-territory").setAttribute("aria-pressed", "true");
  byId("go-territory").textContent = "Hide territory";
  setStatus(`Game over — ${winner} wins by ${margin} points. The final territory is now highlighted.`);
  renderBoard();
}

function bindClick(id, handler) {
  byId(id)?.addEventListener("click", handler);
}

let savedLevel = "standard";
try {
  savedLevel = localStorage.getItem("go-ai-level") || "standard";
} catch {
  // Storage is optional.
}
aiLevel = AI_LEVELS[savedLevel] ? savedLevel : "standard";

bindClick("go-reset", resetGame);
bindClick("go-reset-main", resetGame);
bindClick("go-pass", handlePlayerPass);
bindClick("go-pass-main", handlePlayerPass);
bindClick("go-resign", handleResign);
bindClick("go-resign-main", handleResign);
bindClick("go-hint", showHint);
bindClick("go-territory", toggleTerritory);
bindClick("go-undo", undoRound);
byId("go-difficulty").addEventListener("change", (event) => setAiLevel(event.target.value));
byId("go-difficulty-panel").addEventListener("change", (event) => setAiLevel(event.target.value));
byId("go-difficulty").value = aiLevel;
byId("go-difficulty-panel").value = aiLevel;
resetGame();
