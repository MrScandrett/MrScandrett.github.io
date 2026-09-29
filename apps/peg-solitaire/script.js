import { SIZE, CENTER, onBoard, startBoard, jumpsFrom, allJumps, jump, pegCount, isWon, SOLUTION, moveFromTo } from "./rules.js";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const pegsEl = document.getElementById("pegs");
const jumpsEl = document.getElementById("jumps");
const undoBtn = document.getElementById("undoBtn");
const restartBtn = document.getElementById("restartBtn");
const demoBtn = document.getElementById("demoBtn");

const game = { board: startBoard(), history: [], selected: null, timer: null };

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function build() {
  boardEl.innerHTML = "";
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const hole = document.createElement("button");
    hole.type = "button";
    hole.className = "hole";
    if (!onBoard(i)) {
      hole.classList.add("off");
      hole.tabIndex = -1;
      hole.setAttribute("aria-hidden", "true");
    } else {
      hole.addEventListener("click", () => clickHole(i));
    }
    if (i === CENTER) hole.classList.add("center");
    boardEl.appendChild(hole);
  }
}

function render() {
  const { board, selected } = game;
  const landings = selected === null ? [] : jumpsFrom(board, selected).map((m) => m.to);
  [...boardEl.children].forEach((hole, i) => {
    if (!onBoard(i)) return;
    hole.classList.toggle("peg", board[i] === 1);
    hole.classList.toggle("selected", i === selected);
    hole.classList.toggle("landing", landings.includes(i));
    hole.setAttribute(
      "aria-label",
      `Row ${Math.floor(i / SIZE) + 1}, column ${(i % SIZE) + 1}: ${board[i] ? "peg" : "empty"}${i === CENTER ? " (center)" : ""}${landings.includes(i) ? ", jump here" : ""}`
    );
  });
  pegsEl.textContent = String(pegCount(board));
  jumpsEl.textContent = String(allJumps(board).length);
  undoBtn.disabled = !game.history.length || Boolean(game.timer);
  boardEl.classList.toggle("solved-glow", isWon(board));
}

function report() {
  const { board } = game;
  const left = pegCount(board);
  if (isWon(board)) setStatus("One peg left, right in the center. A perfect game!", "win");
  else if (!allJumps(board).length) setStatus(`No more jumps: ${left} pegs left${left === 1 ? ", but not in the center" : ""}. Undo, or restart and try again.`, "warn");
  else setStatus(`${left} pegs left.`);
}

function clickHole(i) {
  if (game.timer) return;
  const { board, selected } = game;
  if (board[i]) {
    if (!jumpsFrom(board, i).length) {
      game.selected = null;
      setStatus("That peg has no jump right now: it needs a neighbor with an empty hole just beyond.", "warn");
    } else {
      game.selected = selected === i ? null : i;
      if (game.selected !== null) setStatus("Now click a green-ringed hole to jump into.");
    }
    render();
    return;
  }
  if (selected === null) return;
  const move = moveFromTo(board, selected, i);
  if (!move) {
    setStatus("That peg can't jump there. Jumps go over one neighbor into the empty hole right behind it.", "warn");
    return;
  }
  game.history.push(board);
  game.board = jump(board, move);
  game.selected = null;
  render();
  report();
}

undoBtn.addEventListener("click", () => {
  if (!game.history.length) return;
  game.board = game.history.pop();
  game.selected = null;
  render();
  report();
});

function restart() {
  window.clearTimeout(game.timer);
  game.timer = null;
  demoBtn.textContent = "▶ Play the solution";
  game.board = startBoard();
  game.history = [];
  game.selected = null;
  render();
  setStatus("Click a peg that can jump (there are 4 to choose from), then the hole it lands in.");
}

restartBtn.addEventListener("click", restart);

demoBtn.addEventListener("click", () => {
  restart();
  demoBtn.textContent = "Playing…";
  let k = 0;
  (function next() {
    if (k >= SOLUTION.length) {
      game.timer = null;
      demoBtn.textContent = "▶ Play the solution";
      render();
      report();
      return;
    }
    const [from, to] = SOLUTION[k];
    game.selected = from;
    render();
    game.timer = window.setTimeout(() => {
      game.history.push(game.board);
      game.board = jump(game.board, moveFromTo(game.board, from, to));
      game.selected = null;
      k += 1;
      setStatus(`Jump ${k} of 31.`);
      render();
      game.timer = window.setTimeout(next, 250);
    }, 350);
  })();
});

build();
restart();
