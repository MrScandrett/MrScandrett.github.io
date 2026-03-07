// ─── Stockfish Web Worker ─────────────────────────────────────────────────────
const worker = new Worker("../assets/js/vendor/stockfish.js");
let stockfishReady = false;

// ─── DOM ──────────────────────────────────────────────────────────────────────
const boardElement  = document.getElementById("chess-board");
const statusElement = document.getElementById("chess-status");
const logElement    = document.getElementById("chess-log");
const resetButton   = document.getElementById("chess-reset");
const depthSelect   = document.getElementById("chess-depth");

if (!boardElement || !statusElement || !logElement || !resetButton || !depthSelect) {
  throw new Error("Deep Blue Chess could not initialize — missing DOM nodes.");
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SIZE  = 8;
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const PIECE_TEXT = {
  WP: "♙", WN: "♘", WB: "♗", WR: "♖", WQ: "♕", WK: "♔",
  BP: "♟", BN: "♞", BB: "♝", BR: "♜", BQ: "♛", BK: "♚"
};

const PIECE_NAME = {
  WP: "White Pawn",   WN: "White Knight", WB: "White Bishop",
  WR: "White Rook",   WQ: "White Queen",  WK: "White King",
  BP: "Black Pawn",   BN: "Black Knight", BB: "Black Bishop",
  BR: "Black Rook",   BQ: "Black Queen",  BK: "Black King"
};

const KNIGHT_DELTAS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_DELTAS   = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const BISHOP_DIRS   = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ROOK_DIRS     = [[-1,0],[1,0],[0,-1],[0,1]];
const QUEEN_DIRS    = [...BISHOP_DIRS, ...ROOK_DIRS];

// ─── Game State ───────────────────────────────────────────────────────────────
const state = {
  board:        [],
  turn:         "W",
  humanColor:   "W",
  aiColor:      "B",
  selected:     null,
  legalTargets: [],
  winner:       null,
  aiThinking:   false,
  inCheckColor: null,
  moveList:     [],   // UCI move strings sent to Stockfish
  log:          []
};

// ─── Board Utilities ──────────────────────────────────────────────────────────
function idx(row, col)  { return row * SIZE + col; }
function rowOf(index)   { return Math.floor(index / SIZE); }
function colOf(index)   { return index % SIZE; }
function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }
function colorOf(piece) { return piece ? piece[0] : null; }
function typeOf(piece)  { return piece ? piece[1] : null; }
function opposite(c)    { return c === "W" ? "B" : "W"; }

function toCoord(index) {
  return `${FILES[colOf(index)]}${SIZE - rowOf(index)}`;
}

function fromUciSquare(sq) {
  const col = FILES.indexOf(sq[0]);
  const row = SIZE - parseInt(sq[1], 10);
  return row * SIZE + col;
}

// ─── Move Generation ─────────────────────────────────────────────────────────
function findKing(board, color) {
  const target = `${color}K`;
  for (let i = 0; i < board.length; i++) if (board[i] === target) return i;
  return -1;
}

function isSquareAttacked(board, target, byColor) {
  const tr = rowOf(target), tc = colOf(target);

  for (let i = 0; i < board.length; i++) {
    const piece = board[i];
    if (!piece || colorOf(piece) !== byColor) continue;
    const type = typeOf(piece);
    const fr = rowOf(i), fc = colOf(i);

    if (type === "P") {
      const dir = byColor === "W" ? -1 : 1;
      if (fr + dir === tr && Math.abs(fc - tc) === 1) return true;
      continue;
    }
    if (type === "N") {
      for (const [dr, dc] of KNIGHT_DELTAS)
        if (fr + dr === tr && fc + dc === tc) return true;
      continue;
    }
    if (type === "K") {
      if (Math.max(Math.abs(fr - tr), Math.abs(fc - tc)) === 1) return true;
      continue;
    }
    const dirs = type === "B" ? BISHOP_DIRS : type === "R" ? ROOK_DIRS : QUEEN_DIRS;
    for (const [dr, dc] of dirs) {
      let r = fr + dr, c = fc + dc;
      while (inBounds(r, c)) {
        if (idx(r, c) === target) return true;
        if (board[idx(r, c)]) break;
        r += dr; c += dc;
      }
    }
  }
  return false;
}

function isInCheck(board, color) {
  const k = findKing(board, color);
  if (k === -1) return true;
  return isSquareAttacked(board, k, opposite(color));
}

function maybePromotion(piece, to) {
  if (typeOf(piece) !== "P") return null;
  if (colorOf(piece) === "W" && rowOf(to) === 0)        return "WQ";
  if (colorOf(piece) === "B" && rowOf(to) === SIZE - 1) return "BQ";
  return null;
}

function applyMove(board, move) {
  const next = board.slice();
  const movingPiece = next[move.from];
  next[move.from] = null;
  next[move.to]   = move.promotion || movingPiece;
  return next;
}

function pushMove(moves, board, from, to, color) {
  const target = board[to];
  if (target && colorOf(target) === color) return false;
  if (target && typeOf(target) === "K")    return false;
  moves.push({ from, to, capture: target || null });
  return !target;
}

function pseudoMovesForPiece(board, from, piece) {
  const moves = [];
  const row = rowOf(from), col = colOf(from);
  const color = colorOf(piece), type = typeOf(piece);

  if (type === "P") {
    const dir = color === "W" ? -1 : 1;
    const startRow = color === "W" ? SIZE - 2 : 1;
    const fwdRow = row + dir;

    if (inBounds(fwdRow, col)) {
      const one = idx(fwdRow, col);
      if (!board[one]) {
        moves.push({ from, to: one, capture: null, promotion: maybePromotion(piece, one) });
        const fwd2Row = row + dir * 2;
        if (row === startRow && inBounds(fwd2Row, col)) {
          const two = idx(fwd2Row, col);
          if (!board[two]) moves.push({ from, to: two, capture: null });
        }
      }
    }
    for (const dc of [-1, 1]) {
      const nr = row + dir, nc = col + dc;
      if (!inBounds(nr, nc)) continue;
      const to = idx(nr, nc);
      const target = board[to];
      if (target && colorOf(target) !== color && typeOf(target) !== "K") {
        moves.push({ from, to, capture: target, promotion: maybePromotion(piece, to) });
      }
    }
    return moves;
  }

  if (type === "N") {
    for (const [dr, dc] of KNIGHT_DELTAS) {
      const nr = row + dr, nc = col + dc;
      if (inBounds(nr, nc)) pushMove(moves, board, from, idx(nr, nc), color);
    }
    return moves;
  }

  if (type === "K") {
    for (const [dr, dc] of KING_DELTAS) {
      const nr = row + dr, nc = col + dc;
      if (inBounds(nr, nc)) pushMove(moves, board, from, idx(nr, nc), color);
    }
    return moves;
  }

  const dirs = type === "B" ? BISHOP_DIRS : type === "R" ? ROOK_DIRS : QUEEN_DIRS;
  for (const [dr, dc] of dirs) {
    let nr = row + dr, nc = col + dc;
    while (inBounds(nr, nc)) {
      const cont = pushMove(moves, board, from, idx(nr, nc), color);
      if (!cont) break;
      nr += dr; nc += dc;
    }
  }
  return moves;
}

function legalMoves(board, color) {
  const all = [];
  for (let i = 0; i < board.length; i++) {
    const piece = board[i];
    if (!piece || colorOf(piece) !== color) continue;
    for (const move of pseudoMovesForPiece(board, i, piece)) {
      const next = applyMove(board, move);
      if (!isInCheck(next, color)) all.push({ ...move, piece });
    }
  }
  return all;
}

function analyzePosition(board, turn) {
  const moves   = legalMoves(board, turn);
  const inCheck = isInCheck(board, turn);
  if (moves.length > 0) return { over: false, winner: null, inCheck, moves };
  if (inCheck)          return { over: true,  winner: opposite(turn), inCheck, moves };
  return                       { over: true,  winner: "D", inCheck: false, moves };
}

// ─── UCI Helpers ──────────────────────────────────────────────────────────────
function moveToUci(move) {
  const promo = move.promotion ? move.promotion[1].toLowerCase() : "";
  return toCoord(move.from) + toCoord(move.to) + promo;
}

function uciToMove(board, uciStr) {
  const from      = fromUciSquare(uciStr.slice(0, 2));
  const to        = fromUciSquare(uciStr.slice(2, 4));
  const promoChar = uciStr[4];
  const piece     = board[from];
  let promotion   = null;

  if (promoChar) {
    // Stockfish promotes Black's pawn
    promotion = `B${promoChar.toUpperCase()}`;
  } else {
    promotion = maybePromotion(piece, to);
  }

  return { from, to, capture: board[to] || null, promotion, piece };
}

// ─── Notation & Log ───────────────────────────────────────────────────────────
function notation(move, movingPiece) {
  const pieceText   = PIECE_TEXT[movingPiece] || movingPiece;
  const captureText = move.capture ? ` x ${PIECE_TEXT[move.capture] || move.capture}` : " ->";
  const promo       = move.promotion ? ` = ${PIECE_TEXT[move.promotion]}` : "";
  return `${pieceText} ${toCoord(move.from)}${captureText} ${toCoord(move.to)}${promo}`;
}

function pushLog(text) {
  state.log.unshift(text);
  if (state.log.length > 28) state.log.length = 28;
}

function renderLog() {
  logElement.innerHTML = "";
  for (const item of state.log) {
    const li = document.createElement("li");
    li.textContent = item;
    logElement.appendChild(li);
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────
function statusText() {
  if (!stockfishReady)            return "Stockfish is loading…";
  if (state.winner === "W")       return "White wins by checkmate. Reset to play again.";
  if (state.winner === "B")       return "Black (Stockfish) wins by checkmate. Reset to play again.";
  if (state.winner === "D")       return "Draw by stalemate. Reset to play again.";
  if (state.aiThinking)           return "Stockfish is searching…";
  const checkNote = state.inCheckColor === state.turn ? " — you are in check!" : "";
  return `Your move as White${checkNote}`;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function updateGameStatus() {
  const analysis    = analyzePosition(state.board, state.turn);
  state.inCheckColor = analysis.inCheck ? state.turn : null;
  state.winner       = analysis.over    ? analysis.winner : null;
  return analysis;
}

function renderBoard() {
  boardElement.innerHTML = "";
  const checkSquare = state.inCheckColor ? findKing(state.board, state.inCheckColor) : -1;

  for (let i = 0; i < state.board.length; i++) {
    const row = rowOf(i), col = colOf(i);
    const piece = state.board[i];

    const button = document.createElement("button");
    button.type = "button";
    button.className = `chess-square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
    button.setAttribute("role", "gridcell");
    button.dataset.index = String(i);

    if (state.selected    === i) button.classList.add("selected");
    if (state.legalTargets.includes(i)) button.classList.add("target");
    if (checkSquare       === i) button.classList.add("in-check");

    if (piece) {
      button.textContent = PIECE_TEXT[piece] || piece;
      button.classList.add(colorOf(piece) === "W" ? "chess-piece-white" : "chess-piece-black");
      button.setAttribute("aria-label", `${PIECE_NAME[piece]} on ${toCoord(i)}`);
    } else {
      button.textContent = "";
      button.setAttribute("aria-label", `Empty square ${toCoord(i)}`);
    }

    button.addEventListener("click", () => onSquareClick(i));
    boardElement.appendChild(button);
  }

  statusElement.textContent = statusText();
  renderLog();
}

// ─── Player Input ─────────────────────────────────────────────────────────────
function selectTargets(from) {
  return legalMoves(state.board, state.humanColor)
    .filter(m => m.from === from)
    .map(m => m.to);
}

function performMove(move, actorLabel) {
  const movingPiece = state.board[move.from];
  state.board = applyMove(state.board, move);
  state.moveList.push(moveToUci(move));
  pushLog(`${actorLabel}: ${notation(move, movingPiece)}`);
}

function onSquareClick(index) {
  if (!stockfishReady || state.winner || state.aiThinking || state.turn !== state.humanColor) return;

  const piece      = state.board[index];
  const isOwnPiece = piece && colorOf(piece) === state.humanColor;

  // No selection yet — pick a piece
  if (state.selected === null) {
    if (!isOwnPiece) return;
    state.selected     = index;
    state.legalTargets = selectTargets(index);
    renderBoard();
    return;
  }

  // Deselect
  if (index === state.selected) {
    state.selected     = null;
    state.legalTargets = [];
    renderBoard();
    return;
  }

  // Switch selection to another own piece
  if (isOwnPiece) {
    state.selected     = index;
    state.legalTargets = selectTargets(index);
    renderBoard();
    return;
  }

  // Attempt move
  if (!state.legalTargets.includes(index)) return;

  const options = legalMoves(state.board, state.humanColor);
  const move    = options.find(m => m.from === state.selected && m.to === index);
  if (!move) return;

  performMove(move, "White");
  state.selected     = null;
  state.legalTargets = [];
  state.turn         = state.aiColor;

  updateGameStatus();
  renderBoard();

  if (!state.winner) runStockfishAI();
}

// ─── Stockfish AI ─────────────────────────────────────────────────────────────
function runStockfishAI() {
  if (state.winner || state.turn !== state.aiColor || !stockfishReady) return;

  state.aiThinking = true;
  renderBoard();

  const movesStr = state.moveList.join(" ");
  const posCmd   = movesStr
    ? `position startpos moves ${movesStr}`
    : "position startpos";
  const depth = parseInt(depthSelect.value, 10) || 12;

  worker.postMessage(posCmd);
  worker.postMessage(`go depth ${depth}`);
}

worker.onmessage = (event) => {
  const line = typeof event.data === "string" ? event.data : String(event.data);

  if (line === "uciok") {
    worker.postMessage("isready");
    return;
  }

  if (line === "readyok") {
    stockfishReady = true;
    renderBoard(); // update status from "loading…" to "Your move"
    return;
  }

  if (line.startsWith("bestmove")) {
    // Guard against stale responses after a reset
    if (!state.aiThinking) return;

    const uciMove = line.split(" ")[1];
    if (!uciMove || uciMove === "(none)") {
      state.aiThinking = false;
      updateGameStatus();
      renderBoard();
      return;
    }

    const move = uciToMove(state.board, uciMove);
    if (!move.piece) {
      state.aiThinking = false;
      renderBoard();
      return;
    }

    performMove(move, "Stockfish");
    state.turn         = state.humanColor;
    state.selected     = null;
    state.legalTargets = [];
    state.aiThinking   = false;

    updateGameStatus();
    renderBoard();
  }
};

// ─── Game Init ────────────────────────────────────────────────────────────────
function freshBoard() {
  const board     = new Array(SIZE * SIZE).fill(null);
  const backRank  = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let c = 0; c < SIZE; c++) {
    board[idx(0, c)] = `B${backRank[c]}`;
    board[idx(1, c)] = "BP";
    board[idx(6, c)] = "WP";
    board[idx(7, c)] = `W${backRank[c]}`;
  }
  return board;
}

function resetGame() {
  if (stockfishReady) worker.postMessage("stop");

  state.board        = freshBoard();
  state.turn         = "W";
  state.selected     = null;
  state.legalTargets = [];
  state.winner       = null;
  state.aiThinking   = false;
  state.inCheckColor = null;
  state.moveList     = [];
  state.log          = [
    "New game — you play White against Stockfish.",
    "Note: no castling or en passant in this classroom build."
  ];

  updateGameStatus();
  renderBoard();
}

resetButton.addEventListener("click", resetGame);

// Show board immediately; "Stockfish is loading…" until readyok
resetGame();
worker.postMessage("uci");
