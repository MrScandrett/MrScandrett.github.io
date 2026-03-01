const boardElement = document.getElementById("chess-board");
const statusElement = document.getElementById("chess-status");
const logElement = document.getElementById("chess-log");
const resetButton = document.getElementById("chess-reset");
const depthSelect = document.getElementById("chess-depth");

if (!boardElement || !statusElement || !logElement || !resetButton || !depthSelect) {
  throw new Error("Chess AI Core could not initialize. Missing required DOM nodes.");
}

const SIZE = 4;
const FILES = ["a", "b", "c", "d"];

const PIECE_TEXT = {
  WK: "K",
  WR: "R",
  BK: "k",
  BR: "r"
};

const PIECE_NAME = {
  WK: "White King",
  WR: "White Rook",
  BK: "Black King",
  BR: "Black Rook"
};

const state = {
  board: [],
  turn: "W",
  humanColor: "W",
  aiColor: "B",
  selected: null,
  legalTargets: [],
  winner: null,
  aiThinking: false,
  log: []
};

function idx(row, col) {
  return row * SIZE + col;
}

function rowOf(index) {
  return Math.floor(index / SIZE);
}

function colOf(index) {
  return index % SIZE;
}

function inBounds(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function colorOf(piece) {
  return piece ? piece.charAt(0) : null;
}

function typeOf(piece) {
  return piece ? piece.charAt(1) : null;
}

function opposite(color) {
  return color === "W" ? "B" : "W";
}

function toCoord(index) {
  return `${FILES[colOf(index)]}${SIZE - rowOf(index)}`;
}

function clearLine(board, from, to) {
  const fromRow = rowOf(from);
  const fromCol = colOf(from);
  const toRow = rowOf(to);
  const toCol = colOf(to);

  const stepRow = Math.sign(toRow - fromRow);
  const stepCol = Math.sign(toCol - fromCol);

  let row = fromRow + stepRow;
  let col = fromCol + stepCol;

  while (row !== toRow || col !== toCol) {
    if (board[idx(row, col)]) return false;
    row += stepRow;
    col += stepCol;
  }

  return true;
}

function findKing(board, color) {
  const target = `${color}K`;
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === target) return i;
  }
  return -1;
}

function isSquareAttacked(board, target, byColor) {
  const targetRow = rowOf(target);
  const targetCol = colOf(target);

  for (let i = 0; i < board.length; i += 1) {
    const piece = board[i];
    if (!piece || colorOf(piece) !== byColor) continue;

    const pieceType = typeOf(piece);
    const fromRow = rowOf(i);
    const fromCol = colOf(i);

    if (pieceType === "K") {
      if (Math.max(Math.abs(fromRow - targetRow), Math.abs(fromCol - targetCol)) === 1) {
        return true;
      }
      continue;
    }

    if (pieceType === "R") {
      if (fromRow === targetRow || fromCol === targetCol) {
        if (clearLine(board, i, target)) return true;
      }
    }
  }

  return false;
}

function isInCheck(board, color) {
  const kingSquare = findKing(board, color);
  if (kingSquare === -1) return true;
  return isSquareAttacked(board, kingSquare, opposite(color));
}

function applyMove(board, move) {
  const next = board.slice();
  next[move.to] = next[move.from];
  next[move.from] = null;
  return next;
}

function pseudoMovesForPiece(board, from, piece) {
  const moves = [];
  const row = rowOf(from);
  const col = colOf(from);
  const color = colorOf(piece);

  if (typeOf(piece) === "K") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) continue;

        const to = idx(nextRow, nextCol);
        const target = board[to];
        if (target && colorOf(target) === color) continue;

        moves.push({ from, to, capture: target || null });
      }
    }

    return moves;
  }

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  for (const [dr, dc] of directions) {
    let nextRow = row + dr;
    let nextCol = col + dc;

    while (inBounds(nextRow, nextCol)) {
      const to = idx(nextRow, nextCol);
      const target = board[to];

      if (!target) {
        moves.push({ from, to, capture: null });
      } else {
        if (colorOf(target) !== color) {
          moves.push({ from, to, capture: target });
        }
        break;
      }

      nextRow += dr;
      nextCol += dc;
    }
  }

  return moves;
}

function legalMoves(board, color) {
  const all = [];

  for (let i = 0; i < board.length; i += 1) {
    const piece = board[i];
    if (!piece || colorOf(piece) !== color) continue;

    const pseudo = pseudoMovesForPiece(board, i, piece);

    for (const move of pseudo) {
      const next = applyMove(board, move);
      if (findKing(next, color) === -1) continue;
      if (isInCheck(next, color)) continue;
      all.push(move);
    }
  }

  return all;
}

function outcomeForTurn(board, turn) {
  const whiteKing = findKing(board, "W");
  const blackKing = findKing(board, "B");

  if (whiteKing === -1) return { type: "win", winner: "B" };
  if (blackKing === -1) return { type: "win", winner: "W" };

  const moves = legalMoves(board, turn);
  if (moves.length) return null;

  if (isInCheck(board, turn)) {
    return { type: "win", winner: opposite(turn) };
  }

  return { type: "draw", winner: null };
}

function evaluate(board, perspective) {
  const terminal = outcomeForTurn(board, perspective);
  if (terminal?.type === "win") {
    return terminal.winner === perspective ? 10000 : -10000;
  }
  if (terminal?.type === "draw") return 0;

  let score = 0;
  for (const piece of board) {
    if (!piece) continue;
    const value = typeOf(piece) === "K" ? 1000 : 5;
    score += colorOf(piece) === perspective ? value : -value;
  }

  const ownMobility = legalMoves(board, perspective).length;
  const oppMobility = legalMoves(board, opposite(perspective)).length;
  score += (ownMobility - oppMobility) * 0.12;

  if (isInCheck(board, opposite(perspective))) score += 0.4;
  if (isInCheck(board, perspective)) score -= 0.4;

  return score;
}

function minimax(board, turn, depth, alpha, beta, perspective) {
  const currentOutcome = outcomeForTurn(board, turn);
  if (depth === 0 || currentOutcome) {
    return { score: evaluate(board, perspective), move: null };
  }

  const moves = legalMoves(board, turn);
  if (!moves.length) {
    return { score: evaluate(board, perspective), move: null };
  }

  const maximizing = turn === perspective;
  let bestMove = null;

  if (maximizing) {
    let bestScore = -Infinity;
    for (const move of moves) {
      const next = applyMove(board, move);
      const result = minimax(next, opposite(turn), depth - 1, alpha, beta, perspective);

      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = move;
      }

      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    return { score: bestScore, move: bestMove };
  }

  let bestScore = Infinity;
  for (const move of moves) {
    const next = applyMove(board, move);
    const result = minimax(next, opposite(turn), depth - 1, alpha, beta, perspective);

    if (result.score < bestScore) {
      bestScore = result.score;
      bestMove = move;
    }

    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }

  return { score: bestScore, move: bestMove };
}

function selectTargets(from) {
  const options = legalMoves(state.board, state.humanColor);
  return options.filter((move) => move.from === from).map((move) => move.to);
}

function notation(move, movingPiece) {
  const capture = move.capture ? ` x ${move.capture}` : "";
  return `${movingPiece} ${toCoord(move.from)} -> ${toCoord(move.to)}${capture}`;
}

function pushLog(text) {
  state.log.unshift(text);
  if (state.log.length > 24) state.log.length = 24;
}

function renderLog() {
  logElement.innerHTML = "";
  for (const item of state.log) {
    const li = document.createElement("li");
    li.textContent = item;
    logElement.appendChild(li);
  }
}

function statusText() {
  if (state.winner === "W") return "White wins. Reset to play again.";
  if (state.winner === "B") return "Black wins. Reset to play again.";
  if (state.winner === "D") return "Draw (stalemate). Reset to play again.";
  if (state.aiThinking) return "Black AI is thinking...";
  if (state.turn === state.humanColor) return "Your move as White.";
  return "Black to move.";
}

function renderBoard() {
  boardElement.innerHTML = "";

  for (let i = 0; i < state.board.length; i += 1) {
    const row = rowOf(i);
    const col = colOf(i);
    const piece = state.board[i];

    const button = document.createElement("button");
    button.type = "button";
    button.className = `chess-square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
    button.setAttribute("role", "gridcell");
    button.dataset.index = String(i);

    if (state.selected === i) button.classList.add("selected");
    if (state.legalTargets.includes(i)) button.classList.add("target");

    if (piece) {
      button.textContent = PIECE_TEXT[piece] || piece;
      button.classList.add(colorOf(piece) === "W" ? "chess-piece-white" : "chess-piece-black");
      button.setAttribute("aria-label", `${PIECE_NAME[piece]} on ${toCoord(i)}`);
    } else {
      button.textContent = "";
      button.setAttribute("aria-label", `Empty square ${toCoord(i)}`);
    }

    button.addEventListener("click", () => {
      onSquareClick(i);
    });

    boardElement.appendChild(button);
  }

  statusElement.textContent = statusText();
  renderLog();
}

function advanceTurn() {
  const outcome = outcomeForTurn(state.board, state.turn);
  if (!outcome) return false;

  if (outcome.type === "draw") state.winner = "D";
  if (outcome.type === "win") state.winner = outcome.winner;
  return true;
}

function performMove(move, actorLabel) {
  const movingPiece = state.board[move.from];
  state.board = applyMove(state.board, move);
  pushLog(`${actorLabel}: ${notation(move, movingPiece)}`);
}

function runAiTurn() {
  if (state.winner || state.turn !== state.aiColor) return;

  state.aiThinking = true;
  renderBoard();

  window.setTimeout(() => {
    const depth = Math.max(2, Math.min(4, Number(depthSelect.value) || 3));
    const result = minimax(state.board, state.aiColor, depth, -Infinity, Infinity, state.aiColor);
    const move = result.move;

    state.aiThinking = false;
    if (!move) {
      advanceTurn();
      renderBoard();
      return;
    }

    performMove(move, "Black");
    state.turn = state.humanColor;
    if (!advanceTurn()) {
      state.selected = null;
      state.legalTargets = [];
      renderBoard();
      return;
    }

    state.selected = null;
    state.legalTargets = [];
    renderBoard();
  }, 40);
}

function onSquareClick(index) {
  if (state.winner || state.aiThinking || state.turn !== state.humanColor) return;

  const piece = state.board[index];
  const isOwnPiece = piece && colorOf(piece) === state.humanColor;

  if (state.selected === null) {
    if (!isOwnPiece) return;
    state.selected = index;
    state.legalTargets = selectTargets(index);
    renderBoard();
    return;
  }

  if (index === state.selected) {
    state.selected = null;
    state.legalTargets = [];
    renderBoard();
    return;
  }

  if (isOwnPiece) {
    state.selected = index;
    state.legalTargets = selectTargets(index);
    renderBoard();
    return;
  }

  if (!state.legalTargets.includes(index)) return;

  const options = legalMoves(state.board, state.humanColor);
  const move = options.find((candidate) => candidate.from === state.selected && candidate.to === index);
  if (!move) return;

  performMove(move, "White");
  state.selected = null;
  state.legalTargets = [];
  state.turn = state.aiColor;

  if (!advanceTurn()) {
    renderBoard();
    runAiTurn();
    return;
  }

  renderBoard();
}

function freshBoard() {
  const board = new Array(SIZE * SIZE).fill(null);
  board[idx(0, 0)] = "BK";
  board[idx(0, 3)] = "BR";
  board[idx(3, 0)] = "WK";
  board[idx(3, 3)] = "WR";
  return board;
}

function resetGame() {
  state.board = freshBoard();
  state.turn = "W";
  state.selected = null;
  state.legalTargets = [];
  state.winner = null;
  state.aiThinking = false;
  state.log = ["New game started."];
  renderBoard();
}

resetButton.addEventListener("click", () => {
  resetGame();
});

resetGame();
