import { attacks, conflicts, isSolution, solutionKey, backtrack, allSolutions, distinctSolutionCount } from "./rules.js";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const sizeEl = document.getElementById("size");
const factEl = document.getElementById("fact");
const queenCountEl = document.getElementById("queenCount");
const conflictCountEl = document.getElementById("conflictCount");
const showAttacksEl = document.getElementById("showAttacks");
const clearBtn = document.getElementById("clearBtn");
const foundTextEl = document.getElementById("foundText");
const foundFillEl = document.getElementById("foundFill");
const foundListEl = document.getElementById("foundList");
const solveBtn = document.getElementById("solveBtn");
const stepBtn = document.getElementById("stepBtn");
const speedEl = document.getElementById("speed");
const triedEl = document.getElementById("triedCount");
const backtrackEl = document.getElementById("backtrackCount");
const solverFoundEl = document.getElementById("solverFound");

const STORAGE_KEY = "eight-queens-found-v1";

const state = {
  n: 8,
  queens: [],
  hover: null,
  totalSolutions: 92,
  found: loadFound(),
  solver: null, // { steps, tried, backtracks, solutions, running, timer, highlight }
};

// ---------- saved solutions (per viewer, optional) ----------

function loadFound() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveFound() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.found));
  } catch {
    // storage is optional
  }
}

function foundForSize() {
  return (state.found[state.n] ||= []);
}

// ---------- board ----------

function hasQueen(row, col) {
  return state.queens.some((q) => q.row === row && q.col === col);
}

function buildBoard() {
  boardEl.innerHTML = "";
  boardEl.style.setProperty("--n", state.n);
  for (let row = 0; row < state.n; row += 1) {
    for (let col = 0; col < state.n; col += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `cell ${(row + col) % 2 ? "dark" : "light"}`;
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.setAttribute("role", "gridcell");
      cell.addEventListener("click", () => toggleQueen(row, col));
      cell.addEventListener("pointerenter", () => {
        state.hover = { row, col };
        render();
      });
      cell.addEventListener("pointerleave", () => {
        state.hover = null;
        render();
      });
      boardEl.appendChild(cell);
    }
  }
}

function render() {
  const n = state.n;
  const solverView = state.solver && state.solver.view;
  const queens = solverView ? solverView.cols.map((col, row) => ({ row, col })) : state.queens;
  const clashing = new Set();
  for (const [a, b] of conflicts(queens)) {
    clashing.add(`${a.row},${a.col}`);
    clashing.add(`${b.row},${b.col}`);
  }

  for (const cell of boardEl.children) {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const queen = queens.some((q) => q.row === row && q.col === col);
    const attacked = !queen && queens.some((q) => attacks(q, { row, col }));
    const previewed =
      !solverView && state.hover && !queen && !(state.hover.row === row && state.hover.col === col) && attacks(state.hover, { row, col });

    cell.textContent = queen ? "♛" : "";
    cell.classList.toggle("queen", queen);
    cell.classList.toggle("clash", queen && clashing.has(`${row},${col}`));
    cell.classList.toggle("attacked", attacked && showAttacksEl.checked);
    cell.classList.toggle("preview", Boolean(previewed));
    cell.classList.toggle("trying", Boolean(solverView && solverView.row === row && solverView.col === col));
    cell.classList.toggle("rejected", Boolean(solverView && solverView.type === "reject" && solverView.row === row && solverView.col === col));
    cell.setAttribute(
      "aria-label",
      `Row ${n - row}, column ${"ABCDEFGHIJ"[col]}${queen ? ", queen" : attacked ? ", attacked" : ""}`
    );
  }

  queenCountEl.textContent = `${queens.length} / ${n}`;
  conflictCountEl.textContent = String(conflicts(queens).length);
}

// ---------- playing ----------

function toggleQueen(row, col) {
  if (state.solver) stopSolver({ keepBoard: true });
  if (hasQueen(row, col)) {
    state.queens = state.queens.filter((q) => !(q.row === row && q.col === col));
  } else {
    if (state.queens.length >= state.n) {
      setStatus(`All ${state.n} queens are on the board. Click a queen to pick it up.`);
      return;
    }
    state.queens.push({ row, col });
  }
  afterChange();
}

function afterChange() {
  render();
  const n = state.n;
  const pairs = conflicts(state.queens).length;
  if (isSolution(state.queens, n)) {
    const key = solutionKey(state.queens, n);
    const list = foundForSize();
    if (list.includes(key)) {
      setStatus(`Solved! You already found this one: it is solution ${list.indexOf(key) + 1} in your list.`, "win");
    } else {
      list.push(key);
      saveFound();
      renderFound();
      setStatus(`Solved! That is a new one: ${list.length} of ${state.totalSolutions} found.`, "win");
    }
    boardEl.classList.add("solved");
    return;
  }
  boardEl.classList.remove("solved");
  if (pairs) setStatus(`${pairs} pair${pairs === 1 ? "" : "s"} of queens can attack each other (shown in red).`, "warn");
  else if (state.queens.length) setStatus(`${state.queens.length} safe so far. ${n - state.queens.length} to go.`);
  else setStatus("Click a square to place a queen. Hover to preview its attack lines.");
}

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function renderFound() {
  const list = foundForSize();
  foundTextEl.textContent = `You have found ${list.length} of ${state.totalSolutions}.`;
  foundFillEl.style.width = `${state.totalSolutions ? (100 * list.length) / state.totalSolutions : 0}%`;
  foundListEl.innerHTML = "";
  list.forEach((key, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `#${i + 1}  ${key.replace(/,/g, " ")}`;
    btn.title = "Show this solution (numbers are the queen's column in each row, top to bottom)";
    btn.addEventListener("click", () => {
      stopSolver();
      state.queens = key.split(",").map((c, row) => ({ row, col: Number(c) - 1 }));
      afterChange();
    });
    li.appendChild(btn);
    foundListEl.appendChild(li);
  });
}

function setSize(n) {
  stopSolver();
  state.n = n;
  state.queens = [];
  state.totalSolutions = allSolutions(n).length;
  const distinct = distinctSolutionCount(n);
  factEl.textContent = state.totalSolutions
    ? `${n} × ${n}: ${state.totalSolutions} solution${state.totalSolutions === 1 ? "" : "s"}, ${distinct} truly different (not counting rotations and mirror images).`
    : `${n} × ${n}: no solution exists. Try it and see why!`;
  buildBoard();
  renderFound();
  resetSolverStats();
  afterChange();
}

// ---------- backtracking animation ----------

function resetSolverStats() {
  triedEl.textContent = "0";
  backtrackEl.textContent = "0";
  solverFoundEl.textContent = "0";
}

function startSolver() {
  state.queens = [];
  boardEl.classList.remove("solved");
  state.solver = { steps: backtrack(state.n), tried: 0, backtracks: 0, solutions: 0, running: false, timer: null, view: { cols: [] } };
  resetSolverStats();
}

function solverStep() {
  const s = state.solver;
  const { value: step, done } = s.steps.next();
  if (done) {
    pauseSolver();
    setStatus(`Search finished: the computer checked the whole board and found all ${s.solutions} solutions.`, "win");
    solveBtn.textContent = "▶ Watch it solve";
    state.solver = null;
    return false;
  }
  s.view = step;
  if (step.type === "place" || step.type === "reject") s.tried += 1;
  if (step.type === "remove") s.backtracks += 1;
  triedEl.textContent = s.tried.toLocaleString();
  backtrackEl.textContent = s.backtracks.toLocaleString();

  if (step.type === "solution") {
    s.solutions += 1;
    solverFoundEl.textContent = String(s.solutions);
    s.view = { cols: step.cols };
    boardEl.classList.add("solved");
    setStatus(`Solution ${s.solutions} found after trying ${s.tried.toLocaleString()} squares. Press play to keep searching.`, "win");
    render();
    pauseSolver();
    return false;
  }
  boardEl.classList.remove("solved");
  const where = `row ${step.row + 1}, column ${step.col + 1}`;
  if (step.type === "place") setStatus(`Row ${step.row + 1}: ${where} is safe, so the computer places a queen there.`);
  if (step.type === "reject") setStatus(`Row ${step.row + 1}: ${where} is attacked. Try the next column.`);
  if (step.type === "remove") setStatus(`Dead end. Backtrack: pick up the queen in row ${step.row + 1} and try its next column.`, "warn");
  render();
  return true;
}

function delay() {
  const t = Number(speedEl.value);
  return Math.round(900 * Math.pow(0.95, t)); // 900 ms down to about 5 ms
}

function runSolver() {
  const s = state.solver;
  if (!s || !s.running) return;
  if (!solverStep()) return;
  s.timer = window.setTimeout(runSolver, delay());
}

function pauseSolver() {
  const s = state.solver;
  if (!s) return;
  s.running = false;
  window.clearTimeout(s.timer);
  solveBtn.textContent = "▶ Keep searching";
}

function stopSolver({ keepBoard = false } = {}) {
  if (!state.solver) return;
  const cols = state.solver.view?.cols || [];
  pauseSolver();
  state.solver = null;
  solveBtn.textContent = "▶ Watch it solve";
  state.queens = keepBoard ? cols.map((col, row) => ({ row, col })) : [];
}

solveBtn.addEventListener("click", () => {
  if (!state.solver) startSolver();
  const s = state.solver;
  if (s.running) {
    pauseSolver();
    return;
  }
  s.running = true;
  solveBtn.textContent = "⏸ Pause";
  runSolver();
});

stepBtn.addEventListener("click", () => {
  if (!state.solver) startSolver();
  pauseSolver();
  solverStep();
});

clearBtn.addEventListener("click", () => {
  stopSolver();
  state.queens = [];
  resetSolverStats();
  afterChange();
});

sizeEl.addEventListener("change", () => setSize(Number(sizeEl.value)));
showAttacksEl.addEventListener("change", render);

setSize(8);
