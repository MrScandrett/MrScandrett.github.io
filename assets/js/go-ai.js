// ─── Constants ────────────────────────────────────────────────────────────────
const SIZE = 9;
const EMPTY = 0, BLACK = 1, WHITE = 2;
const KOMI = 6.5; // Standard komi: White compensation for going second

// Star points (hoshi) on a 9×9 board, 0-indexed
const STAR_POINTS = new Set(["2,2", "2,6", "4,4", "6,2", "6,6"]);

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// ─── Board Utilities ──────────────────────────────────────────────────────────
function createBoard() {
  return Array.from({ length: SIZE }, () => new Array(SIZE).fill(EMPTY));
}

function cloneBoard(b) {
  return b.map((row) => [...row]);
}

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function boardHash(b) {
  return b.flat().join("");
}

// ─── Group & Liberty Logic ────────────────────────────────────────────────────
// Flood-fill to find all connected stones of the same color + their liberties.
function getGroup(board, r, c) {
  const color = board[r][c];
  const stones = [];
  const liberties = new Set();
  const visited = new Set();
  const stack = [[r, c]];

  while (stack.length) {
    const [cr, cc] = stack.pop();
    const key = cr * SIZE + cc;
    if (visited.has(key)) continue;
    visited.add(key);
    stones.push([cr, cc]);

    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (!inBounds(nr, nc)) continue;
      const nk = nr * SIZE + nc;
      if (board[nr][nc] === EMPTY) {
        liberties.add(nk);
      } else if (board[nr][nc] === color && !visited.has(nk)) {
        stack.push([nr, nc]);
      }
    }
  }
  return { stones, liberties };
}

function removeGroup(board, r, c) {
  const { stones } = getGroup(board, r, c);
  for (const [sr, sc] of stones) board[sr][sc] = EMPTY;
  return stones.length;
}

// ─── Move Logic ───────────────────────────────────────────────────────────────
// Returns { board, captured } if the move is legal, or null if illegal.
function tryPlace(board, color, r, c, prevHash) {
  if (board[r][c] !== EMPTY) return null;

  const nb = cloneBoard(board);
  const opp = color === BLACK ? WHITE : BLACK;
  nb[r][c] = color;

  // Capture any opponent groups that now have zero liberties.
  let captured = 0;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (!inBounds(nr, nc) || nb[nr][nc] !== opp) continue;
    const { liberties } = getGroup(nb, nr, nc);
    if (liberties.size === 0) captured += removeGroup(nb, nr, nc);
  }

  // Suicide rule: own group must have at least one liberty after captures.
  const { liberties: ownLibs } = getGroup(nb, r, c);
  if (ownLibs.size === 0) return null;

  // Ko rule: cannot recreate the board state from the previous turn.
  if (prevHash && boardHash(nb) === prevHash) return null;

  return { board: nb, captured };
}

function getLegalMoves(board, color, prevHash) {
  const moves = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === EMPTY && tryPlace(board, color, r, c, prevHash)) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

// ─── Territory Scoring (Chinese / Area Counting) ──────────────────────────────
// Returns { black, white } where white already includes KOMI.
function scoreBoard(board) {
  let black = 0, white = 0;
  const claimed = new Uint8Array(SIZE * SIZE);

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === BLACK) { black++; continue; }
      if (board[r][c] === WHITE) { white++; continue; }
      if (claimed[r * SIZE + c]) continue;

      // Flood-fill empty region to find its border colors.
      const region = [];
      const borders = new Set();
      const stack = [[r, c]];
      const seen = new Set([r * SIZE + c]);

      while (stack.length) {
        const [cr, cc] = stack.pop();
        region.push([cr, cc]);
        for (const [dr, dc] of DIRS) {
          const nr = cr + dr, nc = cc + dc;
          if (!inBounds(nr, nc)) continue;
          const nk = nr * SIZE + nc;
          if (board[nr][nc] === EMPTY && !seen.has(nk)) {
            seen.add(nk);
            stack.push([nr, nc]);
          } else if (board[nr][nc] !== EMPTY) {
            borders.add(board[nr][nc]);
          }
        }
      }

      for (const [er, ec] of region) claimed[er * SIZE + ec] = 1;

      // If bordered by exactly one color, that color owns the territory.
      if (borders.size === 1) {
        const owner = [...borders][0];
        if (owner === BLACK) black += region.length;
        else white += region.length;
      }
    }
  }

  return { black, white: white + KOMI };
}

// ─── Monte Carlo Random Playout ───────────────────────────────────────────────
// Plays random legal moves from the given position and returns the score.
// Positive = Black leads; negative = White leads (before komi).
function randomPlayout(board, color, prevHash) {
  board = cloneBoard(board);
  let passes = 0;
  let hash = prevHash;

  for (let i = 0; i < 100; i++) {
    // Try up to 20 random positions rather than enumerating all legal moves.
    let placed = false;
    const tried = new Set();
    for (let t = 0; t < 20; t++) {
      const r = Math.floor(Math.random() * SIZE);
      const c = Math.floor(Math.random() * SIZE);
      const k = r * SIZE + c;
      if (tried.has(k) || board[r][c] !== EMPTY) { tried.add(k); continue; }
      tried.add(k);
      const result = tryPlace(board, color, r, c, hash);
      if (result) {
        hash = boardHash(result.board);
        board = result.board;
        placed = true;
        break;
      }
    }

    if (!placed) {
      if (++passes >= 2) break;
    } else {
      passes = 0;
    }
    color = color === BLACK ? WHITE : BLACK;
  }

  const { black, white } = scoreBoard(board);
  return black - white; // positive = Black winning
}

// ─── AI Move Selection (Monte Carlo) ─────────────────────────────────────────
// Evaluates up to 25 candidate moves using 25 random playouts each.
function chooseBestMove(board, color, prevHash) {
  let moves = getLegalMoves(board, color, prevHash);
  if (!moves.length) return null; // AI passes

  // Shuffle for variety then limit candidates to keep response fast.
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }
  if (moves.length > 25) moves = moves.slice(0, 25);

  const PLAYOUTS = 25;
  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const [r, c] of moves) {
    const placed = tryPlace(board, color, r, c, prevHash);
    if (!placed) continue;

    const newHash = boardHash(placed.board);
    const opp = color === BLACK ? WHITE : BLACK;
    let total = 0;

    for (let p = 0; p < PLAYOUTS; p++) {
      const score = randomPlayout(placed.board, opp, newHash);
      // Normalise: both colors want their own score to be higher.
      total += color === BLACK ? score : -score;
    }

    if (total > bestScore) { bestScore = total; bestMove = [r, c]; }
  }

  return bestMove;
}

// ─── Game State ───────────────────────────────────────────────────────────────
let board, prevHash, blackCaps, whiteCaps, consecutivePasses, gameOver, aiThinking, lastPlaced;

function resetGame() {
  board = createBoard();
  prevHash = null;
  blackCaps = 0;   // white stones captured by black
  whiteCaps = 0;   // black stones captured by white
  consecutivePasses = 0;
  gameOver = false;
  aiThinking = false;
  lastPlaced = null;

  document.getElementById("go-pass").disabled = false;
  document.getElementById("go-resign").disabled = false;
  renderBoard();
  setStatus("Your turn — place a Black stone on any intersection.");
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function setStatus(msg) {
  document.getElementById("go-status").textContent = msg;
}

function updateCaptures() {
  document.getElementById("black-captures").textContent = blackCaps;
  document.getElementById("white-captures").textContent = whiteCaps;
}

function renderBoard() {
  const container = document.getElementById("go-board");
  container.innerHTML = "";

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "go-intersection";
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}`);

      // Hoshi dot
      if (STAR_POINTS.has(`${r},${c}`)) {
        const dot = document.createElement("span");
        dot.className = "go-hoshi";
        cell.appendChild(dot);
      }

      // Stone
      if (board[r][c] !== EMPTY) {
        const stone = document.createElement("span");
        const isLast = lastPlaced && lastPlaced[0] === r && lastPlaced[1] === c;
        stone.className = `go-stone ${board[r][c] === BLACK ? "black" : "white"}${isLast ? " last" : ""}`;
        cell.appendChild(stone);
        cell.setAttribute("aria-label",
          `${board[r][c] === BLACK ? "Black" : "White"} stone, row ${r + 1}, column ${c + 1}`);
      }

      // Interactivity
      if (!gameOver && !aiThinking && board[r][c] === EMPTY) {
        cell.addEventListener("click", () => handlePlayerMove(r, c));
      } else {
        cell.disabled = board[r][c] !== EMPTY || gameOver || aiThinking;
      }

      container.appendChild(cell);
    }
  }

  updateCaptures();
}

// ─── Game Actions ─────────────────────────────────────────────────────────────
function handlePlayerMove(r, c) {
  if (gameOver || aiThinking) return;

  const result = tryPlace(board, BLACK, r, c, prevHash);
  if (!result) return; // illegal move — silently ignore

  blackCaps += result.captured;
  prevHash = boardHash(result.board);
  board = result.board;
  lastPlaced = [r, c];
  consecutivePasses = 0;

  renderBoard();
  if (!gameOver) triggerAI();
}

function handlePlayerPass() {
  if (gameOver || aiThinking) return;
  consecutivePasses++;
  if (consecutivePasses >= 2) { endGame(); return; }
  lastPlaced = null;
  setStatus("You passed. AI is thinking…");
  triggerAI();
}

function handleResign() {
  if (gameOver) return;
  gameOver = true;
  lastPlaced = null;
  setStatus("You resigned. White wins.");
  document.getElementById("go-pass").disabled = true;
  document.getElementById("go-resign").disabled = true;
  renderBoard();
}

function triggerAI() {
  aiThinking = true;
  renderBoard();

  // Yield to the browser to paint the "AI is thinking…" state first.
  setTimeout(() => {
    const move = chooseBestMove(board, WHITE, prevHash);

    if (!move) {
      consecutivePasses++;
      aiThinking = false;
      if (consecutivePasses >= 2) { endGame(); return; }
      setStatus("AI passed. Your turn — place a Black stone.");
      lastPlaced = null;
      renderBoard();
      return;
    }

    const [r, c] = move;
    const result = tryPlace(board, WHITE, r, c, prevHash);
    if (!result) { aiThinking = false; return; } // shouldn't happen

    whiteCaps += result.captured;
    prevHash = boardHash(result.board);
    board = result.board;
    lastPlaced = [r, c];
    consecutivePasses = 0;
    aiThinking = false;

    renderBoard();
    setStatus("Your turn — place a Black stone.");
  }, 30);
}

function endGame() {
  gameOver = true;
  const { black, white } = scoreBoard(board);
  const winner = black > white ? "Black" : "White";
  const hi = Math.max(black, white).toFixed(1);
  const lo = Math.min(black, white).toFixed(1);
  setStatus(`Game over — ${winner} wins ${hi}–${lo}${white > black ? ` (includes ${KOMI} komi)` : ""}.`);
  document.getElementById("go-pass").disabled = true;
  document.getElementById("go-resign").disabled = true;
  renderBoard();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.getElementById("go-reset").addEventListener("click", resetGame);
document.getElementById("go-pass").addEventListener("click", handlePlayerPass);
document.getElementById("go-resign").addEventListener("click", handleResign);

resetGame();
