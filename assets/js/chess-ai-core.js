const boardElement = document.getElementById("chess-board");
const statusElement = document.getElementById("chess-status");
const logElement = document.getElementById("chess-log");
const resetButton = document.getElementById("chess-reset");
const depthSelect = document.getElementById("chess-depth");
const modelSelect = document.getElementById("chess-model");
const modelNoteElement = document.getElementById("chess-model-note");
const labElement = document.getElementById("chess-lab");
const ghostLayer = document.getElementById("chess-ghost-layer");
const advantageBarFill = document.getElementById("advantage-bar-fill");
const advantageText = document.getElementById("advantage-text");
const heuristicHud = document.getElementById("heuristic-hud");
const radarElement = document.getElementById("chess-radar");
const eraNoteElement = document.getElementById("chess-era-note");
const evalLabelElement = document.getElementById("chess-eval-label");

if (
  !boardElement ||
  !statusElement ||
  !logElement ||
  !resetButton ||
  !depthSelect ||
  !modelSelect ||
  !modelNoteElement ||
  !labElement ||
  !ghostLayer ||
  !advantageBarFill ||
  !advantageText ||
  !heuristicHud ||
  !radarElement ||
  !eraNoteElement ||
  !evalLabelElement
) {
  throw new Error("Chess lesson could not initialize. Missing required DOM nodes.");
}

const SIZE = 8;
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const MATE_SCORE = 100000;

const PIECE_TEXT = {
  WP: "♙",
  WN: "♘",
  WB: "♗",
  WR: "♖",
  WQ: "♕",
  WK: "♔",
  BP: "♟",
  BN: "♞",
  BB: "♝",
  BR: "♜",
  BQ: "♛",
  BK: "♚"
};

const PIECE_NAME = {
  WP: "White Pawn",
  WN: "White Knight",
  WB: "White Bishop",
  WR: "White Rook",
  WQ: "White Queen",
  WK: "White King",
  BP: "Black Pawn",
  BN: "Black Knight",
  BB: "Black Bishop",
  BR: "Black Rook",
  BQ: "Black Queen",
  BK: "Black King"
};

const PIECE_VALUE = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000
};

const MODEL_PROFILES = {
  turochamp1951: {
    label: "Turochamp (1951)",
    logLabel: "Turochamp",
    summary: "Early rule-based style: shallow lookahead with noisier move choices.",
    themeTitle: "Paper Logic",
    themeKicker: "1951 · Hand-built rules",
    themePrompt: "Expect short lookahead, more surprises, and moves that feel clever one turn but shaky the next.",
    themeTags: ["Shallow search", "Rule-based", "More randomness"],
    eraSkin: "turochamp1951",
    logicNote: "Turing's hand-calculation era. The engine mostly counts pieces and only lightly rewards movement and shape.",
    evalWeights: { material: 0.95, mobility: 0.05, position: 0.02, pawnStructure: 0.03, kingSafety: 0.04 },
    baseDepth: 1,
    recommendedBudget: 2,
    variability: 0.58,
    blunderWindow: 210,
    materialWeight: 0.95,
    centerWeight: 0.35,
    pawnAdvanceWeight: 0.8,
    checkBonus: 9,
    captureBias: 0.12,
    thinkDelay: 1800
  },
  machack1967: {
    label: "Mac Hack VI (1967)",
    logLabel: "Mac Hack VI",
    summary: "Tournament-era search with stronger material play and moderate lookahead.",
    themeTitle: "Mainframe Green",
    themeKicker: "1967 · Tournament-era computing",
    themePrompt: "Watch for steadier material play and fewer obvious mistakes, but not the crushing calculation of later engines.",
    themeTags: ["Mainframe era", "Material-first", "Steadier search"],
    eraSkin: "deepblue1997",
    logicNote: "Tournament-era search with better move ordering and a broader sense of development, but still strongly material-first.",
    evalWeights: { material: 0.72, mobility: 0.16, position: 0.18, pawnStructure: 0.08, kingSafety: 0.12 },
    baseDepth: 2,
    recommendedBudget: 2,
    variability: 0.28,
    blunderWindow: 120,
    materialWeight: 1,
    centerWeight: 0.7,
    pawnAdvanceWeight: 0.9,
    checkBonus: 12,
    captureBias: 0.18,
    thinkDelay: 90
  },
  deepblue1997: {
    label: "Deep Blue Style (1997)",
    logLabel: "Deep Blue",
    summary: "Consistent alpha-beta search with aggressive tactical pressure.",
    themeTitle: "Supercomputer Blue",
    themeKicker: "1997 · Industrial brute force",
    themePrompt: "This era should feel colder and more tactical: sharper captures, faster punishment, and less hesitation.",
    themeTags: ["Alpha-beta", "Tactical pressure", "Custom hardware"],
    eraSkin: "deepblue1997",
    logicNote: "Brute-force search era. Deep Blue style rewards tactical forcing lines, activity, and exploiting king danger much more aggressively.",
    evalWeights: { material: 0.6, mobility: 0.2, position: 0.2, pawnStructure: 0.1, kingSafety: 0.24 },
    baseDepth: 3,
    recommendedBudget: 2,
    variability: 0.08,
    blunderWindow: 45,
    materialWeight: 1.03,
    centerWeight: 1.05,
    pawnAdvanceWeight: 1,
    checkBonus: 18,
    captureBias: 0.22,
    thinkDelay: 75
  },
  modern2020s: {
    label: "Modern Engine Style (2020s)",
    logLabel: "Modern Engine",
    summary: "Sharper positional scoring with low randomness and deeper practical play.",
    themeTitle: "Precision Engine",
    themeKicker: "2020s · Clean modern evaluation",
    themePrompt: "Look for calmer, cleaner positions and fewer flashy mistakes. The engine should feel more balanced and less chaotic.",
    themeTags: ["Lower randomness", "Better position play", "Deeper practical search"],
    eraSkin: "modern2020s",
    logicNote: "Modern engines blend raw calculation with broader positional judgment: pawn shape, king shelter, and quiet pressure all matter.",
    evalWeights: { material: 0.35, mobility: 0.2, position: 0.35, pawnStructure: 0.22, kingSafety: 0.18 },
    baseDepth: 3,
    recommendedBudget: 3,
    variability: 0.03,
    blunderWindow: 25,
    materialWeight: 1.07,
    centerWeight: 1.24,
    pawnAdvanceWeight: 1.15,
    checkBonus: 21,
    captureBias: 0.26,
    thinkDelay: 60
  }
};

const KNIGHT_DELTAS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1]
];

const KING_DELTAS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

const BISHOP_DIRS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1]
];

const ROOK_DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

const state = {
  board: [],
  turn: "W",
  humanColor: "W",
  aiColor: "B",
  aiModelId: "deepblue1997",
  selected: null,
  legalTargets: [],
  winner: null,
  aiThinking: false,
  inCheckColor: null,
  log: [],
  aiPreviewMoves: [],
  latestEval: 0
};

const initialModelId = new URLSearchParams(window.location.search).get("model");
if (initialModelId && MODEL_PROFILES[initialModelId]) {
  state.aiModelId = initialModelId;
  modelSelect.value = initialModelId;
}

function activeModel() {
  return MODEL_PROFILES[state.aiModelId] || MODEL_PROFILES.deepblue1997;
}

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
    if (!piece || piece[0] !== byColor) continue;

    const pieceType = piece[1];
    const fromRow = rowOf(i);
    const fromCol = colOf(i);

    if (pieceType === "P") {
      const dir = byColor === "W" ? -1 : 1;
      if (fromRow + dir === targetRow && Math.abs(fromCol - targetCol) === 1) {
        return true;
      }
      continue;
    }

    if (pieceType === "N") {
      for (const [dr, dc] of KNIGHT_DELTAS) {
        if (fromRow + dr === targetRow && fromCol + dc === targetCol) {
          return true;
        }
      }
      continue;
    }

    if (pieceType === "K") {
      if (Math.max(Math.abs(fromRow - targetRow), Math.abs(fromCol - targetCol)) === 1) {
        return true;
      }
      continue;
    }

    const dirs = pieceType === "B" ? BISHOP_DIRS : pieceType === "R" ? ROOK_DIRS : QUEEN_DIRS;

    for (const [dr, dc] of dirs) {
      let row = fromRow + dr;
      let col = fromCol + dc;

      while (inBounds(row, col)) {
        const square = idx(row, col);
        if (square === target) return true;
        if (board[square]) break;
        row += dr;
        col += dc;
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

function maybePromotion(piece, to) {
  if (typeOf(piece) !== "P") return null;
  const row = rowOf(to);
  if (colorOf(piece) === "W" && row === 0) return "WQ";
  if (colorOf(piece) === "B" && row === SIZE - 1) return "BQ";
  return null;
}

function applyMove(board, move) {
  const next = board.slice();
  const movingPiece = next[move.from];
  next[move.from] = null;
  next[move.to] = move.promotion || movingPiece;
  return next;
}

function pushMove(moves, board, from, to, color, allowKingCapture = false) {
  const target = board[to];
  if (target && colorOf(target) === color) return false;
  if (target && typeOf(target) === "K" && !allowKingCapture) return false;
  moves.push({ from, to, capture: target || null });
  return !target;
}

function pseudoMovesForPiece(board, from, piece, attackOnly = false) {
  const moves = [];
  const row = rowOf(from);
  const col = colOf(from);
  const color = piece[0];
  const type = piece[1];

  if (type === "P") {
    const dir = color === "W" ? -1 : 1;
    const startRow = color === "W" ? SIZE - 2 : 1;

    if (!attackOnly) {
      const forwardOneRow = row + dir;
      if (inBounds(forwardOneRow, col)) {
        const one = idx(forwardOneRow, col);
        if (!board[one]) {
          moves.push({ from, to: one, capture: null, promotion: maybePromotion(piece, one) });

          const forwardTwoRow = row + dir * 2;
          if (row === startRow && inBounds(forwardTwoRow, col)) {
            const two = idx(forwardTwoRow, col);
            if (!board[two]) {
              moves.push({ from, to: two, capture: null });
            }
          }
        }
      }
    }

    for (const dc of [-1, 1]) {
      const nextRow = row + dir;
      const nextCol = col + dc;
      if (!inBounds(nextRow, nextCol)) continue;

      const to = idx(nextRow, nextCol);
      const target = board[to];

      if (attackOnly) {
        moves.push({ from, to, capture: target || null });
      } else if (target && colorOf(target) !== color && typeOf(target) !== "K") {
        moves.push({ from, to, capture: target, promotion: maybePromotion(piece, to) });
      }
    }

    return moves;
  }

  if (type === "N") {
    for (const [dr, dc] of KNIGHT_DELTAS) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (!inBounds(nextRow, nextCol)) continue;
      pushMove(moves, board, from, idx(nextRow, nextCol), color);
    }
    return moves;
  }

  if (type === "K") {
    for (const [dr, dc] of KING_DELTAS) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (!inBounds(nextRow, nextCol)) continue;
      pushMove(moves, board, from, idx(nextRow, nextCol), color);
    }
    return moves;
  }

  const dirs = type === "B" ? BISHOP_DIRS : type === "R" ? ROOK_DIRS : QUEEN_DIRS;

  for (const [dr, dc] of dirs) {
    let nextRow = row + dr;
    let nextCol = col + dc;

    while (inBounds(nextRow, nextCol)) {
      const cont = pushMove(moves, board, from, idx(nextRow, nextCol), color);
      if (!cont) break;
      nextRow += dr;
      nextCol += dc;
    }
  }

  return moves;
}

function moveOrderScore(move, movingPiece) {
  let score = 0;
  if (move.capture) {
    score += PIECE_VALUE[move.capture[1]] * 10 - PIECE_VALUE[movingPiece[1]];
  }
  if (move.promotion) score += 8000;
  return score;
}

function legalMoves(board, color) {
  const all = [];

  for (let i = 0; i < board.length; i += 1) {
    const piece = board[i];
    if (!piece || piece[0] !== color) continue;

    const pseudo = pseudoMovesForPiece(board, i, piece, false);

    for (const move of pseudo) {
      const captured = board[move.to];
      board[move.from] = null;
      board[move.to] = move.promotion || piece;
      const isCheck = isInCheck(board, color);
      board[move.from] = piece;
      board[move.to] = captured;
      if (!isCheck) all.push({ ...move, piece });
    }
  }

  all.sort((a, b) => moveOrderScore(b, b.piece) - moveOrderScore(a, a.piece));
  return all;
}

function analyzePosition(board, turn) {
  const moves = legalMoves(board, turn);
  const inCheck = isInCheck(board, turn);

  if (moves.length > 0) {
    return { over: false, winner: null, inCheck, moves };
  }

  if (inCheck) {
    return { over: true, winner: opposite(turn), inCheck, moves };
  }

  return { over: true, winner: "D", inCheck: false, moves };
}

function evaluate(board, perspective, profile) {
  let score = 0;

  for (let i = 0; i < board.length; i += 1) {
    const piece = board[i];
    if (!piece) continue;

    const color = piece[0];
    const type = piece[1];
    const row = rowOf(i);
    const col = colOf(i);
    const baseValue = PIECE_VALUE[type] || 0;

    const centerDist = Math.abs(row - 3.5) + Math.abs(col - 3.5);
    const baseCenter = type === "P" ? 2.5 - centerDist * 0.4 : 3 - centerDist * 0.5;
    const centerBonus = baseCenter * profile.centerWeight;

    let pawnAdvance = 0;
    if (type === "P") {
      const advancement = color === "W" ? SIZE - 1 - row : row;
      pawnAdvance = advancement * profile.pawnAdvanceWeight;
    }

    const signed = color === perspective ? 1 : -1;
    score += signed * (baseValue * profile.materialWeight + centerBonus + pawnAdvance);
  }

  if (isInCheck(board, opposite(perspective))) score += profile.checkBonus;
  if (isInCheck(board, perspective)) score -= profile.checkBonus;

  return score;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeMetric(value, scale) {
  return clamp(0.5 + value / scale, 0, 1);
}

function materialBalance(board, perspective) {
  let total = 0;
  for (const piece of board) {
    if (!piece) continue;
    const value = PIECE_VALUE[typeOf(piece)] || 0;
    total += colorOf(piece) === perspective ? value : -value;
  }
  return total;
}

function centralityScore(index) {
  const row = rowOf(index);
  const col = colOf(index);
  return Math.max(0, 4 - (Math.abs(row - 3.5) + Math.abs(col - 3.5)));
}

function pawnStructureBalance(board, perspective) {
  let score = 0;

  for (let col = 0; col < SIZE; col += 1) {
    let ownPawns = 0;
    let enemyPawns = 0;
    for (let row = 0; row < SIZE; row += 1) {
      const piece = board[idx(row, col)];
      if (piece === `${perspective}P`) ownPawns += 1;
      if (piece === `${opposite(perspective)}P`) enemyPawns += 1;
    }
    if (ownPawns > 1) score -= (ownPawns - 1) * 16;
    if (enemyPawns > 1) score += (enemyPawns - 1) * 16;
  }

  for (let i = 0; i < board.length; i += 1) {
    const piece = board[i];
    if (typeOf(piece) !== "P") continue;
    const color = colorOf(piece);
    const sign = color === perspective ? 1 : -1;
    const row = rowOf(i);
    const col = colOf(i);
    const forward = color === "W" ? -1 : 1;
    const supportRow = row - forward;
    let supported = false;

    for (const dc of [-1, 1]) {
      const supportCol = col + dc;
      if (!inBounds(supportRow, supportCol)) continue;
      if (board[idx(supportRow, supportCol)] === `${color}P`) {
        supported = true;
      }
    }

    if (supported) score += sign * 10;
  }

  return score;
}

function kingSafetyBalance(board, perspective) {
  const ownKing = findKing(board, perspective);
  const enemyKing = findKing(board, opposite(perspective));
  if (ownKing === -1 || enemyKing === -1) return 0;

  function kingExposure(kingSquare, kingColor) {
    let exposure = 0;
    const row = rowOf(kingSquare);
    const col = colOf(kingSquare);

    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) {
          exposure += 6;
          continue;
        }

        const square = idx(nextRow, nextCol);
        if (isSquareAttacked(board, square, opposite(kingColor))) exposure += 16;
        const occupant = board[square];
        if (occupant === `${kingColor}P`) exposure -= 5;
      }
    }

    return exposure;
  }

  return kingExposure(enemyKing, opposite(perspective)) - kingExposure(ownKing, perspective);
}

function positionalBalance(board, perspective) {
  let score = 0;
  for (let i = 0; i < board.length; i += 1) {
    const piece = board[i];
    if (!piece) continue;
    const sign = colorOf(piece) === perspective ? 1 : -1;
    score += sign * centralityScore(i) * (typeOf(piece) === "P" ? 6 : 10);
  }
  return score;
}

function mobilityBalance(board, perspective) {
  return legalMoves(board, perspective).length - legalMoves(board, opposite(perspective)).length;
}

function heuristicSnapshot(board, perspective, profile) {
  const metrics = {
    material: materialBalance(board, perspective),
    mobility: mobilityBalance(board, perspective),
    position: positionalBalance(board, perspective),
    pawnStructure: pawnStructureBalance(board, perspective),
    kingSafety: kingSafetyBalance(board, perspective)
  };

  const weights = profile.evalWeights || {};
  const normalized = {
    material: normalizeMetric(metrics.material, 1400),
    mobility: normalizeMetric(metrics.mobility, 20),
    position: normalizeMetric(metrics.position, 120),
    pawnStructure: normalizeMetric(metrics.pawnStructure, 90),
    kingSafety: normalizeMetric(metrics.kingSafety, 90)
  };

  return { metrics, normalized, weights };
}

function renderRadar(profile) {
  const weights = profile.evalWeights || {};
  const axes = [
    { key: "material", label: "Material" },
    { key: "mobility", label: "Mobility" },
    { key: "position", label: "Position" },
    { key: "pawnStructure", label: "Pawns" },
    { key: "kingSafety", label: "King" }
  ];
  const cx = 110;
  const cy = 110;
  const radius = 76;
  const levels = [0.25, 0.5, 0.75, 1];

  const rings = levels.map((level) => {
    const points = axes.map((axis, index) => {
      const angle = (-Math.PI / 2) + (Math.PI * 2 * index / axes.length);
      const x = cx + Math.cos(angle) * radius * level;
      const y = cy + Math.sin(angle) * radius * level;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");
    return `<polygon class="chess-radar-grid" points="${points}"></polygon>`;
  }).join("");

  const spokes = axes.map((axis, index) => {
    const angle = (-Math.PI / 2) + (Math.PI * 2 * index / axes.length);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    return `<line class="chess-radar-grid" x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"></line>`;
  }).join("");

  const shapePoints = axes.map((axis, index) => {
    const angle = (-Math.PI / 2) + (Math.PI * 2 * index / axes.length);
    const level = clamp(weights[axis.key] || 0, 0, 1);
    const x = cx + Math.cos(angle) * radius * level;
    const y = cy + Math.sin(angle) * radius * level;
    return { x, y };
  });

  const labels = axes.map((axis, index) => {
    const angle = (-Math.PI / 2) + (Math.PI * 2 * index / axes.length);
    const x = cx + Math.cos(angle) * (radius + 22);
    const y = cy + Math.sin(angle) * (radius + 22);
    return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle">${axis.label}</text>`;
  }).join("");

  radarElement.innerHTML = `
    ${rings}
    ${spokes}
    <polygon class="chess-radar-shape" points="${shapePoints.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")}"></polygon>
    ${shapePoints.map((point) => `<circle class="chess-radar-point" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="3"></circle>`).join("")}
    ${labels}
  `;
}

function updateAdvantage(score) {
  const clamped = clamp(score, -1400, 1400);
  const percent = Math.abs(clamped) / 1400 * 50;
  advantageBarFill.classList.toggle("is-black", clamped < 0);
  advantageBarFill.style.height = `${percent}%`;
  advantageText.textContent = `${(clamped / 100).toFixed(1)}`;

  if (clamped > 30) {
    evalLabelElement.textContent = "White Better";
  } else if (clamped < -30) {
    evalLabelElement.textContent = "Black Better";
  } else {
    evalLabelElement.textContent = "Balanced";
  }
}

function updateHeuristicHud() {
  const profile = activeModel();
  const snapshot = heuristicSnapshot(state.board, state.aiColor, profile);
  const rows = [
    ["Material", snapshot.weights.material || 0],
    ["Mobility", snapshot.weights.mobility || 0],
    ["Position", snapshot.weights.position || 0],
    ["Pawn Structure", snapshot.weights.pawnStructure || 0],
    ["King Safety", snapshot.weights.kingSafety || 0]
  ];

  heuristicHud.innerHTML = rows.map(([label, value]) => `
    <div class="chess-heuristic-row">
      <span>${label}</span>
      <strong>${Math.round(value * 100)}%</strong>
      <div class="chess-heuristic-meter"><span style="width:${Math.round(value * 100)}%"></span></div>
    </div>
  `).join("");

  eraNoteElement.innerHTML = `<strong>${profile.label}</strong><br>${profile.logicNote}`;
  renderRadar(profile);
}

function squareCenter(index) {
  const size = boardElement.clientWidth / SIZE;
  return {
    x: colOf(index) * size + size / 2,
    y: rowOf(index) * size + size / 2
  };
}

function renderGhostLines() {
  const size = boardElement.clientWidth || 0;
  if (!size) {
    ghostLayer.innerHTML = "";
    return;
  }

  ghostLayer.setAttribute("viewBox", `0 0 ${size} ${size}`);
  const lines = state.aiPreviewMoves.slice(0, 3).map((entry, index) => {
    const from = squareCenter(entry.move.from);
    const to = squareCenter(entry.move.to);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2 - 0.12 * size + index * 6;
    return `
      <path
        class="chess-ghost-line ${index === 0 ? "is-primary" : ""}"
        d="M ${from.x.toFixed(2)} ${from.y.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${to.x.toFixed(2)} ${to.y.toFixed(2)}"
      ></path>
    `;
  }).join("");

  ghostLayer.innerHTML = lines;
}

function computeControlHeatmap(board, color, profile) {
  const control = new Array(SIZE * SIZE).fill(0);
  const enemyKing = findKing(board, opposite(color));

  for (let i = 0; i < board.length; i += 1) {
    const piece = board[i];
    if (!piece || colorOf(piece) !== color) continue;

    const attacks = pseudoMovesForPiece(board, i, piece, true);
    const pieceBase =
      typeOf(piece) === "P" ? 0.45 :
      typeOf(piece) === "N" ? 0.78 :
      typeOf(piece) === "B" ? 0.72 :
      typeOf(piece) === "R" ? 0.86 :
      typeOf(piece) === "Q" ? 1 :
      0.54;

    for (const move of attacks) {
      let pressure = pieceBase;
      pressure += centralityScore(move.to) * (profile.centerWeight || 0) * 0.08;
      if (enemyKing !== -1 && Math.max(Math.abs(rowOf(enemyKing) - rowOf(move.to)), Math.abs(colOf(enemyKing) - colOf(move.to))) <= 1) {
        pressure += (profile.checkBonus || 0) * 0.02;
      }
      control[move.to] += pressure;
    }
  }

  const max = Math.max(...control, 0.01);
  return control.map((value) => clamp(value / max, 0, 1));
}

function scoreForDisplay(board) {
  return evaluate(board, "W", activeModel());
}

function minimax(board, turn, depth, alpha, beta, perspective, profile, ply = 0) {
  if (depth <= 0) {
    return { score: evaluate(board, perspective, profile), move: null };
  }

  const analysis = analyzePosition(board, turn);
  if (analysis.over) {
    if (analysis.winner === "D") return { score: 0, move: null };
    const sign = analysis.winner === perspective ? 1 : -1;
    return { score: sign * (MATE_SCORE - ply), move: null };
  }

  const moves = analysis.moves;
  const maximizing = turn === perspective;
  let bestMove = null;

  if (maximizing) {
    let bestScore = -Infinity;

    for (const move of moves) {
      const captured = board[move.to];
      const piece = board[move.from];
      board[move.from] = null;
      board[move.to] = move.promotion || piece;
      const result = minimax(board, opposite(turn), depth - 1, alpha, beta, perspective, profile, ply + 1);
      board[move.from] = piece;
      board[move.to] = captured;

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
    const captured = board[move.to];
    const piece = board[move.from];
    board[move.from] = null;
    board[move.to] = move.promotion || piece;
    const result = minimax(board, opposite(turn), depth - 1, alpha, beta, perspective, profile, ply + 1);
    board[move.from] = piece;
    board[move.to] = captured;

    if (result.score < bestScore) {
      bestScore = result.score;
      bestMove = move;
    }

    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }

  return { score: bestScore, move: bestMove };
}

function resolveSearchDepth(profile) {
  const budget = Math.max(1, Math.min(3, Number(depthSelect.value) || profile.recommendedBudget || 2));
  return Math.max(1, Math.min(4, profile.baseDepth + (budget - 2)));
}

function scoreCandidateMove(board, move, depth, profile) {
  const next = applyMove(board, move);
  if (depth <= 1) {
    return evaluate(next, state.aiColor, profile);
  }

  const result = minimax(next, opposite(state.aiColor), depth - 1, -Infinity, Infinity, state.aiColor, profile, 1);
  let score = result.score;

  if (move.capture) {
    score += (PIECE_VALUE[typeOf(move.capture)] || 0) * profile.captureBias;
  }

  return score;
}

function getAiCandidateMoves(board, profile) {
  const analysis = analyzePosition(board, state.aiColor);
  if (analysis.over || analysis.moves.length === 0) return [];

  const depth = resolveSearchDepth(profile);
  const scored = analysis.moves.map((move) => ({
    move,
    score: scoreCandidateMove(board, move, depth, profile)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function chooseAiMove(board, profile) {
  const scored = getAiCandidateMoves(board, profile);
  const best = scored[0];
  if (!best) return null;

  const topPool = scored.filter((entry, index) => {
    if (index >= Math.min(4, scored.length)) return false;
    return entry.score >= best.score - profile.blunderWindow;
  });

  if (topPool.length === 0) return best.move;
  if (topPool.length === 1 || Math.random() > profile.variability) return topPool[0].move;

  const randomIndex = Math.floor(Math.random() * topPool.length);
  return topPool[randomIndex].move;
}

function selectTargets(from) {
  const options = legalMoves(state.board, state.humanColor);
  return options.filter((move) => move.from === from).map((move) => move.to);
}

function notation(move, movingPiece) {
  const from = toCoord(move.from);
  const to = toCoord(move.to);
  const pieceText = PIECE_TEXT[movingPiece] || movingPiece;
  const captureText = move.capture ? ` x ${PIECE_TEXT[move.capture] || move.capture}` : " ->";
  const promo = move.promotion ? ` = ${PIECE_TEXT[move.promotion]}` : "";
  return `${pieceText} ${from}${captureText} ${to}${promo}`;
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

function statusText() {
  const model = activeModel();
  if (state.winner === "W") return "White wins by checkmate. Reset to play again.";
  if (state.winner === "B") return `Black (${model.label}) wins by checkmate. Reset to play again.`;
  if (state.winner === "D") return "Draw by stalemate. Reset to play again.";
  if (state.aiThinking) return `${model.label} is thinking...`;

  const checkNote = state.inCheckColor === state.turn ? " (in check)" : "";
  if (state.turn === state.humanColor) {
    return `Your move as White${checkNote}.`;
  }
  return `Black (${model.label}) to move${checkNote}.`;
}

function updateAesthetic() {
  const model = activeModel();
  const era = model.eraSkin || state.aiModelId;
  document.body.dataset.chessTheme = state.aiModelId;
  document.body.dataset.chessEra = era;
  labElement.dataset.modelTheme = era;
}

function renderModelNote() {
  const model = activeModel();
  updateAesthetic();
  modelNoteElement.innerHTML = `
    <span class="chess-model-kicker">${model.themeKicker}</span>
    <strong class="chess-model-title">${model.themeTitle}</strong>
    <p class="chess-model-summary"><strong>${model.label}</strong>: ${model.summary}</p>
    <p class="chess-model-prompt"><strong>What to notice:</strong> ${model.themePrompt}</p>
    <div class="chess-model-tags">${model.themeTags.map((tag) => `<span>${tag}</span>`).join("")}</div>
  `;
}

function renderBoard() {
  boardElement.innerHTML = "";

  const checkSquare = state.inCheckColor ? findKing(state.board, state.inCheckColor) : -1;
  const controlHeatmap = computeControlHeatmap(state.board, state.aiColor, activeModel());

  for (let i = 0; i < state.board.length; i += 1) {
    const row = rowOf(i);
    const col = colOf(i);
    const piece = state.board[i];

    const button = document.createElement("button");
    button.type = "button";
    button.className = `chess-square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
    button.setAttribute("role", "gridcell");
    button.dataset.index = String(i);
    button.style.setProperty("--control-alpha", (controlHeatmap[i] * 0.42).toFixed(3));

    if (state.selected === i) button.classList.add("selected");
    if (state.legalTargets.includes(i)) button.classList.add("target");
    if (checkSquare === i) button.classList.add("in-check");

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

  depthSelect.disabled = state.aiThinking;
  modelSelect.disabled = state.aiThinking;

  state.latestEval = scoreForDisplay(state.board);
  updateAdvantage(state.latestEval);
  updateHeuristicHud();
  renderModelNote();
  renderGhostLines();
  statusElement.textContent = statusText();
  renderLog();
}

function updateGameStatus() {
  const analysis = analyzePosition(state.board, state.turn);
  state.inCheckColor = analysis.inCheck ? state.turn : null;
  state.winner = analysis.over ? analysis.winner : null;
  return analysis;
}

function performMove(move, actorLabel) {
  const movingPiece = state.board[move.from];
  state.board = applyMove(state.board, move);
  pushLog(`${actorLabel}: ${notation(move, movingPiece)}`);
}

function runAiTurn() {
  if (state.winner || state.turn !== state.aiColor) return;

  const model = activeModel();
  const candidates = getAiCandidateMoves(state.board, model);
  state.aiPreviewMoves = candidates.slice(0, 3);
  state.aiThinking = true;
  renderBoard();

  window.setTimeout(() => {
    const analysis = analyzePosition(state.board, state.aiColor);

    if (analysis.over || analysis.moves.length === 0) {
      state.aiPreviewMoves = [];
      state.aiThinking = false;
      updateGameStatus();
      renderBoard();
      return;
    }

    const move = chooseAiMove(state.board, model) || analysis.moves[0];

    performMove(move, model.logLabel);
    state.turn = state.humanColor;
    state.selected = null;
    state.legalTargets = [];
    state.aiPreviewMoves = [];

    state.aiThinking = false;
    updateGameStatus();
    renderBoard();
  }, model.thinkDelay);
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

  updateGameStatus();
  renderBoard();

  if (!state.winner) {
    runAiTurn();
  }
}

function freshBoard() {
  const board = new Array(SIZE * SIZE).fill(null);
  const backRank = ["R", "N", "B", "Q", "K", "B", "N", "R"];

  for (let c = 0; c < SIZE; c += 1) {
    board[idx(0, c)] = `B${backRank[c]}`;
    board[idx(1, c)] = "BP";
    board[idx(6, c)] = "WP";
    board[idx(7, c)] = `W${backRank[c]}`;
  }

  return board;
}

function resetGame() {
  const model = activeModel();
  state.board = freshBoard();
  state.turn = "W";
  state.selected = null;
  state.legalTargets = [];
  state.winner = null;
  state.aiThinking = false;
  state.inCheckColor = null;
  state.aiPreviewMoves = [];
  state.log = [
    `New 8x8 game started vs ${model.label}.`,
    `Model note: ${model.summary}`,
    "Rules in this lab: full piece movement + check/checkmate/stalemate, no castling or en passant."
  ];

  updateGameStatus();
  renderBoard();
}

function syncModelSelection(shouldReset) {
  const selectedId = modelSelect.value;
  if (MODEL_PROFILES[selectedId]) {
    state.aiModelId = selectedId;
  } else {
    modelSelect.value = state.aiModelId;
  }

  const profile = activeModel();
  depthSelect.value = String(profile.recommendedBudget);
  renderModelNote();

  if (shouldReset) resetGame();
}

resetButton.addEventListener("click", () => {
  resetGame();
});

modelSelect.addEventListener("change", () => {
  syncModelSelection(true);
});

window.addEventListener("resize", () => {
  renderGhostLines();
});

syncModelSelection(false);
resetGame();
