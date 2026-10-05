import { newGame, topDisk, canMove, move, isSolved, bestMove, solveFourPegs, fewestMoves } from "./rules.js";

const disksEl = document.getElementById("disks");
const pegsEl = document.getElementById("pegs");
const stageEl = document.getElementById("stage");
const solveNoteEl = document.getElementById("solveNote");
const moveCountEl = document.getElementById("moveCount");
const minMovesEl = document.getElementById("minMoves");
const undoBtn = document.getElementById("undoBtn");
const hintBtn = document.getElementById("hintBtn");
const restartBtn = document.getElementById("restartBtn");
const solveBtn = document.getElementById("solveBtn");
const speedEl = document.getElementById("speed");
const statusEl = document.getElementById("status");
let pegEls = [];
const growthBody = document.querySelector("#growth tbody");

// rainbow from the biggest disk (red) to the smallest (violet)
const DISK_COLORS = ["#8e44ad", "#3867d6", "#0fb9b1", "#20bf6b", "#f7b731", "#fa8231", "#eb3b5a", "#b33939"];

const game = {
  pegs: 3,
  plan: null, // queued moves while showing the four-peg solution
  disks: 4,
  state: newGame(4),
  history: [],
  selected: null, // peg index holding the lifted disk
  hint: null,
  solving: false,
  timer: null,
  lastMoved: null,
};

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function buildPegs() {
  stageEl.innerHTML = "";
  stageEl.style.setProperty("--pegs", game.pegs);
  pegEls = [];
  for (let p = 0; p < game.pegs; p += 1) {
    const peg = document.createElement("button");
    peg.type = "button";
    peg.className = `peg${p === game.pegs - 1 ? " target" : ""}`;
    peg.addEventListener("click", () => clickPeg(p));
    stageEl.appendChild(peg);
    pegEls.push(peg);
  }
}

function render() {
  const { disks, state } = game;
  pegEls.forEach((pegEl, p) => {
    pegEl.innerHTML = '<span class="rod"></span><span class="base"></span>';
    const stack = document.createElement("span");
    stack.className = "stack";
    state[p].forEach((size, i) => {
      const disk = document.createElement("span");
      disk.className = "disk";
      disk.style.width = `${28 + (size / disks) * 68}%`;
      disk.style.background = DISK_COLORS[(size - 1) % DISK_COLORS.length];
      disk.textContent = size;
      const isTop = i === state[p].length - 1;
      if (isTop && game.selected === p) disk.classList.add("lifted");
      if (isTop && game.lastMoved === p) disk.classList.add("dropped");
      stack.appendChild(disk);
    });
    pegEl.appendChild(stack);
    pegEl.classList.toggle("selected", game.selected === p);
    pegEl.classList.toggle("hint-from", Boolean(game.hint && game.hint.from === p));
    pegEl.classList.toggle("hint-to", Boolean(game.hint && game.hint.to === p));
    const top = topDisk(state, p);
    pegEl.setAttribute(
      "aria-label",
      `Peg ${p + 1}${p === game.pegs - 1 ? " (goal)" : ""}: ${state[p].length ? `${state[p].length} disks, top disk ${top}` : "empty"}`
    );
  });
  moveCountEl.textContent = String(game.history.length);
  minMovesEl.textContent = fewestMoves(game.disks, game.pegs).toLocaleString();
  undoBtn.disabled = !game.history.length || game.solving;
  hintBtn.disabled = game.solving || isSolved(state, disks) || game.pegs === 4;
}

function doMove(from, to) {
  game.history.push(game.state);
  game.state = move(game.state, from, to);
  game.lastMoved = to;
  game.hint = null;
  game.selected = null;
}

function checkWin() {
  if (!isSolved(game.state, game.disks)) return false;
  const used = game.history.length;
  const best = fewestMoves(game.disks, game.pegs);
  setStatus(
    used === best
      ? `Solved in ${used} moves, the fewest possible! Try ${game.disks < 8 ? game.disks + 1 : "fewer"} disks next.`
      : `Solved in ${used} moves. The fewest possible is ${best}. Can you find the shortcut?`,
    "win"
  );
  document.getElementById("stage").classList.add("solved");
  return true;
}

function clickPeg(p) {
  if (game.solving || isSolved(game.state, game.disks)) return;
  if (game.selected === null) {
    if (topDisk(game.state, p) === null) {
      setStatus(`Peg ${p + 1} is empty. Pick a peg with a disk on it.`, "warn");
      return;
    }
    game.selected = p;
    game.lastMoved = null;
    setStatus(`Disk ${topDisk(game.state, p)} is lifted. Click the peg to put it on.`);
    render();
    return;
  }
  const from = game.selected;
  if (from === p) {
    game.selected = null;
    setStatus("Disk put back down.");
    render();
    return;
  }
  if (!canMove(game.state, from, p)) {
    setStatus(`Disk ${topDisk(game.state, from)} can't go on disk ${topDisk(game.state, p)}: a bigger disk may never sit on a smaller one.`, "warn");
    pegEls[p].classList.remove("shake");
    void pegEls[p].offsetWidth;
    pegEls[p].classList.add("shake");
    return;
  }
  const disk = topDisk(game.state, from);
  game.plan = null; // a hand move means the four-peg demo must start over
  doMove(from, p);
  render();
  if (!checkWin()) setStatus(`Moved disk ${disk} to peg ${p + 1}.`);
}

function restart() {
  stopSolving();
  game.disks = Number(disksEl.value);
  game.pegs = Number(pegsEl.value);
  game.state = newGame(game.disks, game.pegs);
  game.plan = null;
  buildPegs();
  solveNoteEl.textContent =
    game.pegs === 4
      ? "With four pegs it shows the Frame–Stewart method from the start: park the small disks, move the big ones with three pegs, then bring the small ones back."
      : "It solves from wherever the disks are now, always choosing a move on the shortest path to the goal.";
  solveBtn.textContent = game.pegs === 4 ? "▶ Watch Frame–Stewart" : "▶ Solve from here";
  game.history = [];
  game.selected = null;
  game.hint = null;
  game.lastMoved = null;
  document.getElementById("stage").classList.remove("solved");
  setStatus(`Move all ${game.disks} disks to peg ${game.pegs}. The fewest possible moves is ${fewestMoves(game.disks, game.pegs)}.`);
  render();
}

function showHint() {
  const hint = bestMove(game.state, game.disks);
  if (!hint) return;
  game.selected = null;
  game.hint = hint;
  setStatus(`Hint: move disk ${hint.disk} from peg ${hint.from + 1} to peg ${hint.to + 1}.`);
  render();
}

// ---------- auto-solve ----------

function delay() {
  return Math.round(1200 * Math.pow(0.955, Number(speedEl.value))); // about 1.2 s down to 12 ms
}

function solveStep() {
  const hint = game.pegs === 4 ? game.plan.shift() : bestMove(game.state, game.disks);
  if (!hint) {
    stopSolving();
    checkWin();
    return;
  }
  doMove(hint.from, hint.to);
  setStatus(`Computer: disk ${hint.disk} from peg ${hint.from + 1} to peg ${hint.to + 1}.`);
  render();
  if (checkWin()) {
    stopSolving();
    return;
  }
  game.timer = window.setTimeout(solveStep, delay());
}

function stopSolving() {
  game.solving = false;
  window.clearTimeout(game.timer);
  solveBtn.textContent = game.pegs === 4 ? "▶ Watch Frame–Stewart" : "▶ Solve from here";
  render();
}

solveBtn.addEventListener("click", () => {
  if (game.solving) {
    stopSolving();
    setStatus("Paused. Take over, or press solve to continue.");
    return;
  }
  if (isSolved(game.state, game.disks)) restart();
  if (game.pegs === 4 && !game.plan) {
    // the four-peg method is shown from the starting position
    restart();
    game.plan = [...solveFourPegs(game.disks)];
  }
  game.solving = true;
  game.selected = null;
  solveBtn.textContent = "⏸ Pause";
  solveStep();
});

// ---------- controls ----------

undoBtn.addEventListener("click", () => {
  if (!game.history.length || game.solving) return;
  game.state = game.history.pop();
  game.plan = null;
  game.selected = null;
  game.hint = null;
  game.lastMoved = null;
  document.getElementById("stage").classList.remove("solved");
  setStatus("Move undone.");
  render();
});
hintBtn.addEventListener("click", showHint);
restartBtn.addEventListener("click", restart);
disksEl.addEventListener("change", restart);
pegsEl.addEventListener("change", restart);

document.addEventListener("keydown", (event) => {
  if (event.target.closest("select, input")) return;
  const p = ["1", "2", "3", "4"].indexOf(event.key);
  if (p >= 0 && p < game.pegs) clickPeg(p);
  if (event.key === "Escape" && game.selected !== null) {
    game.selected = null;
    render();
  }
});

// ---------- growth table ----------

function humanDuration(seconds) {
  const units = [
    ["year", 31557600],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [name, size] of units) {
    if (seconds >= size) {
      const value = seconds / size;
      const shown = value >= 1e6 ? `${(value / 1e9 >= 1 ? value / 1e9 : value / 1e6).toFixed(0)} ${value / 1e9 >= 1 ? "billion" : "million"}` : Math.round(value).toLocaleString();
      return `about ${shown} ${name}${value >= 1.5 ? "s" : ""}`;
    }
  }
  return "0 seconds";
}

for (const n of [3, 5, 8, 10, 20, 32, 64]) {
  const row = document.createElement("tr");
  const moves = BigInt(2) ** BigInt(n) - BigInt(1);
  row.innerHTML = `<td>${n}</td><td>${moves.toLocaleString()}</td><td>${humanDuration(Number(moves))}</td>`;
  growthBody.appendChild(row);
}

restart();
