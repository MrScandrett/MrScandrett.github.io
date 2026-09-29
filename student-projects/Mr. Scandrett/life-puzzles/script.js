import { emptyGrid, step, population, PUZZLES } from "./rules.js";

const SIZE = 14;
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const goalEl = document.getElementById("goal");
const puzzleEl = document.getElementById("puzzle");
const genEl = document.getElementById("gen");
const popEl = document.getElementById("pop");
const checkBtn = document.getElementById("checkBtn");
const runBtn = document.getElementById("runBtn");
const stepBtn = document.getElementById("stepBtn");
const resetBtn = document.getElementById("resetBtn");
const clearBtn = document.getElementById("clearBtn");
const hintBtn = document.getElementById("hintBtn");

const game = { drawing: emptyGrid(SIZE, SIZE), grid: emptyGrid(SIZE, SIZE), gen: 0, timer: null, painting: null, solved: new Set() };

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function currentPuzzle() {
  return PUZZLES.find((p) => p.id === puzzleEl.value) || null;
}

function build() {
  boardEl.innerHTML = "";
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "life-cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
      boardEl.appendChild(cell);
    }
  }
}

function render() {
  for (const cell of boardEl.children) {
    const alive = game.grid[cell.dataset.r][cell.dataset.c] === 1;
    cell.classList.toggle("alive", alive);
    cell.setAttribute("aria-pressed", alive ? "true" : "false");
  }
  genEl.textContent = String(game.gen);
  popEl.textContent = String(population(game.grid));
}

// drawing: press and drag to paint; the first cell decides whether you add or erase
function paintAt(target) {
  const cell = target.closest(".life-cell");
  if (!cell || game.painting === null) return;
  if (game.gen !== 0) backToDrawing();
  game.drawing[cell.dataset.r][cell.dataset.c] = game.painting;
  game.grid = game.drawing.map((row) => row.slice());
  render();
}

boardEl.addEventListener("pointerdown", (event) => {
  const cell = event.target.closest(".life-cell");
  if (!cell) return;
  stop();
  if (game.gen !== 0) backToDrawing();
  game.painting = game.drawing[cell.dataset.r][cell.dataset.c] ? 0 : 1;
  paintAt(event.target);
});
boardEl.addEventListener("pointerover", (event) => {
  if (event.buttons) paintAt(event.target);
});
window.addEventListener("pointerup", () => (game.painting = null));
boardEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const cell = event.target.closest(".life-cell");
  if (!cell) return;
  event.preventDefault();
  game.painting = game.drawing[cell.dataset.r][cell.dataset.c] ? 0 : 1;
  paintAt(cell);
  game.painting = null;
});

function advance() {
  game.grid = step(game.grid);
  game.gen += 1;
  render();
}

function stop() {
  window.clearTimeout(game.timer);
  game.timer = null;
  runBtn.textContent = "▶ Run";
}

function run(generations, onDone) {
  stop();
  runBtn.textContent = "⏸ Pause";
  let left = generations;
  (function tick() {
    if (left <= 0) {
      stop();
      onDone?.();
      return;
    }
    advance();
    left -= 1;
    game.timer = window.setTimeout(tick, 220);
  })();
}

function backToDrawing() {
  stop();
  game.grid = game.drawing.map((row) => row.slice());
  game.gen = 0;
  render();
}

function showGoal() {
  const p = currentPuzzle();
  goalEl.innerHTML = p
    ? `<strong>${p.title}:</strong> ${p.goal}${game.solved.has(p.id) ? " ✅" : ""}`
    : "<strong>Free play:</strong> draw anything and press Run. Try a row of 10 cells!";
  checkBtn.disabled = !p;
  hintBtn.disabled = !p;
}

checkBtn.addEventListener("click", () => {
  const p = currentPuzzle();
  if (!p) return;
  backToDrawing();
  if (!population(game.drawing)) {
    setStatus("Draw some living cells first: click or drag on the grid.", "warn");
    return;
  }
  const ok = p.check(game.drawing);
  setStatus("Testing… watch what your pattern does.");
  run(8, () => {
    if (ok) {
      game.solved.add(p.id);
      showGoal();
      setStatus(`Yes! Your pattern solves "${p.title}". Try the next puzzle.`, "win");
    } else {
      setStatus(`Not quite: that pattern doesn't solve "${p.title}". Press "Back to my drawing" and change it.`, "warn");
    }
  });
});

runBtn.addEventListener("click", () => {
  if (game.timer) {
    stop();
    return;
  }
  run(200);
});
stepBtn.addEventListener("click", () => {
  stop();
  advance();
});
resetBtn.addEventListener("click", backToDrawing);
clearBtn.addEventListener("click", () => {
  stop();
  game.drawing = emptyGrid(SIZE, SIZE);
  backToDrawing();
  setStatus("Cleared. Click or drag on the grid to draw living cells.");
});
hintBtn.addEventListener("click", () => {
  const p = currentPuzzle();
  if (p) setStatus(`Hint: ${p.hint}`);
});
puzzleEl.addEventListener("change", () => {
  showGoal();
  setStatus("Draw a pattern, then press Test my pattern.");
});

for (const p of PUZZLES) puzzleEl.add(new Option(p.title, p.id));
puzzleEl.add(new Option("Free play", "free"));

build();
render();
showGoal();
setStatus("Click or drag on the grid to draw living cells, then press Test my pattern.");
