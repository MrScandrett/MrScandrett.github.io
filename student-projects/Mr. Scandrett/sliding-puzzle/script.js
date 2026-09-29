import { solvedBoard, isSolved, movableTiles, slide, shuffle, isSolvable, solveAStar } from "./rules.js";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const sizeEl = document.getElementById("size");
const movesEl = document.getElementById("moves");
const misplacedEl = document.getElementById("misplaced");
const shuffleBtn = document.getElementById("shuffleBtn");
const solveBtn = document.getElementById("solveBtn");
const loydBtn = document.getElementById("loydBtn");
const reportEl = document.getElementById("searchReport");

const game = { n: 3, board: solvedBoard(3), moves: 0, timer: null, loyd: false };

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function render() {
  const { n, board } = game;
  boardEl.style.setProperty("--n", n);
  boardEl.innerHTML = "";
  const movable = movableTiles(board, n);
  board.forEach((v, i) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    if (!v) {
      tile.classList.add("gap");
      tile.setAttribute("aria-hidden", "true");
      tile.tabIndex = -1;
    } else {
      tile.textContent = v;
      if (v === i + 1) tile.classList.add("home");
      if (movable.includes(i)) tile.classList.add("movable");
      tile.setAttribute("aria-label", `Tile ${v}${movable.includes(i) ? ", can slide" : ""}`);
      tile.addEventListener("click", () => clickTile(i));
    }
    boardEl.appendChild(tile);
  });
  movesEl.textContent = String(game.moves);
  misplacedEl.textContent = String(board.filter((v, i) => v && v !== i + 1).length);
  boardEl.classList.toggle("solved-glow", isSolved(board));
}

function clickTile(i) {
  stopSolving();
  const next = slide(game.board, i, game.n);
  if (!next) {
    setStatus("Only a tile next to the gap can slide.", "warn");
    return;
  }
  game.board = next;
  game.moves += 1;
  render();
  if (isSolved(game.board)) setStatus(`Solved in ${game.moves} moves!`, "win");
  else setStatus(game.loyd ? "Keep trying… (Loyd's puzzle)" : "Keep going.");
}

function newShuffle() {
  stopSolving();
  game.n = Number(sizeEl.value);
  // enough random slides to mix well, few enough that A* stays quick on 4 x 4
  game.board = shuffle(game.n, game.n === 3 ? 60 : 36);
  game.moves = 0;
  game.loyd = false;
  reportEl.textContent = "";
  render();
  setStatus("Put the tiles in order. Green tiles are already home.");
}

function stopSolving() {
  window.clearTimeout(game.timer);
  game.timer = null;
  solveBtn.disabled = false;
}

solveBtn.addEventListener("click", () => {
  stopSolving();
  if (!isSolvable(game.board, game.n)) {
    reportEl.textContent = "A* checked the parity first: this arrangement can never be solved, so there is nothing to search for.";
    setStatus("Unsolvable! Two tiles are swapped, and no sequence of slides can swap them back.", "warn");
    return;
  }
  const { moves, explored } = solveAStar(game.board, game.n, 150000);
  if (!moves) {
    reportEl.textContent = `A* examined ${explored.toLocaleString()} positions and ran out of time. Try a new shuffle.`;
    return;
  }
  reportEl.textContent = `A* examined ${explored.toLocaleString()} positions and found the shortest solution: ${moves.length} moves.`;
  solveBtn.disabled = true;
  const queue = moves.slice();
  (function play() {
    if (!queue.length) {
      stopSolving();
      setStatus(`Solved by A* in ${moves.length} moves, the fewest possible.`, "win");
      return;
    }
    game.board = slide(game.board, queue.shift(), game.n);
    game.moves += 1;
    render();
    game.timer = window.setTimeout(play, 280);
  })();
});

loydBtn.addEventListener("click", () => {
  stopSolving();
  sizeEl.value = "4";
  game.n = 4;
  const board = solvedBoard(4);
  [board[13], board[14]] = [board[14], board[13]];
  game.board = board;
  game.moves = 0;
  game.loyd = true;
  reportEl.textContent = "";
  render();
  setStatus("Loyd's puzzle: only 14 and 15 are swapped. Can you fix it? (Press Solve with A* when you want the answer.)");
});

document.addEventListener("keydown", (event) => {
  if (event.target.closest("select")) return;
  const { n, board } = game;
  const gap = board.indexOf(0);
  // the arrow moves a tile in that direction, into the gap
  const from = { ArrowUp: gap + n, ArrowDown: gap - n, ArrowLeft: gap + 1, ArrowRight: gap - 1 }[event.key];
  if (from === undefined) return;
  if (movableTiles(board, n).includes(from)) {
    event.preventDefault();
    clickTile(from);
  }
});

shuffleBtn.addEventListener("click", newShuffle);
sizeEl.addEventListener("change", newShuffle);

newShuffle();
