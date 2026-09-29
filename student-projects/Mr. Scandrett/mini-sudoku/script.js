import { boxSize, peers, candidates, conflicts, isComplete, countSolutions, generate } from "./rules.js";

const boardEl = document.getElementById("board");
const paletteEl = document.getElementById("palette");
const statusEl = document.getElementById("status");
const sizeEl = document.getElementById("size");
const emptyEl = document.getElementById("empty");
const mistakesEl = document.getElementById("mistakes");
const newBtn = document.getElementById("newBtn");
const hintBtn = document.getElementById("hintBtn");
const solveBtn = document.getElementById("solveBtn");
const reportEl = document.getElementById("solveReport");

// fewer clues makes a harder puzzle
const CLUES = { 4: 6, 9: 36 };
const game = { n: 4, grid: [], given: [], solution: [], selected: 0 };

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function render() {
  const { n, grid, given, selected } = game;
  const b = boxSize(n);
  const bad = conflicts(grid, n);
  const peerSet = new Set(peers(n, selected));
  boardEl.style.setProperty("--n", n);
  boardEl.innerHTML = "";
  grid.forEach((v, i) => {
    const r = Math.floor(i / n);
    const c = i % n;
    const sq = document.createElement("button");
    sq.type = "button";
    sq.className = "sq";
    if (given[i]) sq.classList.add("given");
    if (c % b === b - 1 && c !== n - 1) sq.classList.add("box-right");
    if (r % b === b - 1 && r !== n - 1) sq.classList.add("box-bottom");
    if (i === selected) sq.classList.add("selected");
    else if (peerSet.has(i)) sq.classList.add("peer");
    if (bad.has(i) && !given[i]) sq.classList.add("bad");
    sq.textContent = v || "";
    sq.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}: ${v || "empty"}${given[i] ? ", given" : ""}`);
    sq.addEventListener("click", () => {
      game.selected = i;
      render();
    });
    boardEl.appendChild(sq);
  });

  paletteEl.innerHTML = "";
  for (let v = 1; v <= n; v += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = v;
    btn.addEventListener("click", () => place(v));
    paletteEl.appendChild(btn);
  }
  const erase = document.createElement("button");
  erase.type = "button";
  erase.textContent = "⌫";
  erase.setAttribute("aria-label", "Erase");
  erase.addEventListener("click", () => place(0));
  paletteEl.appendChild(erase);

  emptyEl.textContent = String(grid.filter((v) => !v).length);
  mistakesEl.textContent = String([...bad].filter((i) => !given[i]).length);
  boardEl.classList.toggle("solved-glow", isComplete(grid, n));
}

function place(v) {
  const { n, grid, given, selected } = game;
  if (given[selected]) {
    setStatus("That number was given at the start; it can't be changed.", "warn");
    return;
  }
  grid[selected] = v;
  render();
  if (isComplete(grid, n)) setStatus("Solved! Every row, column, and box has each number once.", "win");
  else if (conflicts(grid, n).has(selected)) setStatus(`${v} is already in that row, column, or box.`, "warn");
  else setStatus("Keep going.");
}

function newPuzzle() {
  game.n = Number(sizeEl.value);
  const { puzzle, solution } = generate(game.n, CLUES[game.n]);
  game.grid = puzzle.slice();
  game.given = puzzle.map(Boolean);
  game.solution = solution;
  game.selected = puzzle.indexOf(0);
  reportEl.textContent = "";
  render();
  setStatus("Click an empty square, then pick a number (or type it).");
}

hintBtn.addEventListener("click", () => {
  const { n, grid } = game;
  // first look for a square with only one possible number
  const forced = grid.findIndex((v, i) => !v && candidates(grid, n, i).length === 1);
  if (forced >= 0) {
    game.selected = forced;
    render();
    const [only] = candidates(grid, n, forced);
    setStatus(`Hint: the highlighted square can only be ${only}. Every other number is already in its row, column, or box.`);
    return;
  }
  const wrong = grid.findIndex((v, i) => v && v !== game.solution[i]);
  if (wrong >= 0) {
    game.selected = wrong;
    render();
    setStatus("Hint: the highlighted square doesn't match the answer. Try a different number there.", "warn");
    return;
  }
  setStatus("No square has just one choice right now. Look for a number that fits in only one place in a row or box.");
});

solveBtn.addEventListener("click", () => {
  const { n, given } = game;
  const clues = game.grid.map((v, i) => (given[i] ? v : 0));
  const { solution, steps } = countSolutions(clues, n, 1);
  game.grid = solution.slice();
  reportEl.textContent = `The computer tried ${steps.toLocaleString()} number${steps === 1 ? "" : "s"} to fill the ${clues.filter((v) => !v).length} empty squares.`;
  render();
  setStatus("Solved by backtracking.", "win");
});

document.addEventListener("keydown", (event) => {
  if (event.target.closest("select")) return;
  const { n } = game;
  if (new RegExp(`^[1-${n}]$`).test(event.key)) place(Number(event.key));
  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") place(0);
  const moves = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 };
  if (moves[event.key] !== undefined) {
    const next = game.selected + moves[event.key];
    if (next >= 0 && next < n * n) {
      event.preventDefault();
      game.selected = next;
      render();
    }
  }
});

newBtn.addEventListener("click", newPuzzle);
sizeEl.addEventListener("change", newPuzzle);

newPuzzle();
