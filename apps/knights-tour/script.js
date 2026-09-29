import { openMoves, warnsdorffTour } from "./rules.js";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const sizeEl = document.getElementById("size");
const visitedEl = document.getElementById("visited");
const optionsEl = document.getElementById("options");
const showCountsEl = document.getElementById("showCounts");
const undoBtn = document.getElementById("undoBtn");
const restartBtn = document.getElementById("restartBtn");
const autoBtn = document.getElementById("autoBtn");

const game = { n: 5, path: [], timer: null };

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function build() {
  boardEl.innerHTML = "";
  boardEl.style.setProperty("--n", game.n);
  for (let s = 0; s < game.n * game.n; s += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    const r = Math.floor(s / game.n);
    const c = s % game.n;
    cell.className = `cell ${(r + c) % 2 ? "dark" : "light"}`;
    cell.setAttribute("role", "gridcell");
    cell.addEventListener("click", () => clickSquare(s));
    boardEl.appendChild(cell);
  }
}

function render() {
  const { n, path } = game;
  const visited = new Set(path);
  const current = path[path.length - 1];
  const targets = path.length ? openMoves(n, current, visited) : [];
  [...boardEl.children].forEach((cell, s) => {
    const step = path.indexOf(s);
    cell.classList.toggle("visited", step >= 0 && s !== current);
    cell.classList.toggle("current", s === current);
    cell.classList.toggle("target", targets.includes(s));
    cell.textContent = s === current ? "♞" : step >= 0 ? String(step + 1) : "";
    if (targets.includes(s) && showCountsEl.checked) {
      const count = document.createElement("span");
      count.className = "count";
      count.textContent = openMoves(n, s, new Set([...visited, s])).length;
      cell.appendChild(count);
    }
    const row = n - Math.floor(s / n);
    const col = "ABCDEFGH"[s % n];
    cell.setAttribute("aria-label", `${col}${row}${step >= 0 ? `, visited as move ${step + 1}` : targets.includes(s) ? ", you can jump here" : ""}`);
  });
  visitedEl.textContent = `${path.length} / ${n * n}`;
  optionsEl.textContent = path.length ? String(targets.length) : "–";
  undoBtn.disabled = !path.length;
  boardEl.classList.toggle("solved-glow", path.length === n * n);
}

function report() {
  const { n, path } = game;
  if (!path.length) {
    setStatus("Click any square to put the knight down and start your tour.");
    return;
  }
  if (path.length === n * n) {
    setStatus(`Tour complete! The knight visited all ${n * n} squares.`, "win");
    return;
  }
  const options = openMoves(n, path[path.length - 1], new Set(path));
  if (!options.length) {
    setStatus(`Stuck after ${path.length} squares: no unvisited square is a knight's jump away. Undo, or restart and try Warnsdorff's rule.`, "warn");
    return;
  }
  setStatus(`${path.length} squares visited. Jump to one of the squares outlined in gold.`);
}

function clickSquare(s) {
  stopAuto();
  const { n, path } = game;
  if (!path.length) {
    path.push(s);
  } else {
    const options = openMoves(n, path[path.length - 1], new Set(path));
    if (!options.includes(s)) {
      setStatus(path.includes(s) ? "The knight has already been there." : "A knight can't jump there: it moves two squares one way and one square to the side.", "warn");
      return;
    }
    path.push(s);
  }
  render();
  report();
}

function stopAuto() {
  window.clearTimeout(game.timer);
  game.timer = null;
  autoBtn.textContent = "▶ Finish with the rule";
}

function autoStep() {
  const { n, path } = game;
  const full = warnsdorffTour(n, path[0], path);
  if (full.length === path.length) {
    stopAuto();
    report();
    return;
  }
  path.push(full[path.length]);
  render();
  report();
  game.timer = window.setTimeout(autoStep, 260);
}

autoBtn.addEventListener("click", () => {
  if (game.timer) {
    stopAuto();
    return;
  }
  if (!game.path.length) game.path.push(0);
  autoBtn.textContent = "⏸ Pause";
  autoStep();
});

undoBtn.addEventListener("click", () => {
  stopAuto();
  game.path.pop();
  render();
  report();
});

function restart() {
  stopAuto();
  game.n = Number(sizeEl.value);
  game.path = [];
  build();
  render();
  report();
}

restartBtn.addEventListener("click", restart);
sizeEl.addEventListener("change", restart);
showCountsEl.addEventListener("change", render);

restart();
