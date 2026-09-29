import { press, isSolved, randomPuzzle, fewestPresses } from "./rules.js";

const N = 5;
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const levelEl = document.getElementById("level");
const pressesEl = document.getElementById("presses");
const litEl = document.getElementById("lit");
const newBtn = document.getElementById("newBtn");
const restartBtn = document.getElementById("restartBtn");
const showSolutionEl = document.getElementById("showSolution");

const game = { start: [], board: [], presses: 0 };

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function build() {
  boardEl.innerHTML = "";
  for (let i = 0; i < N * N; i += 1) {
    const light = document.createElement("button");
    light.type = "button";
    light.className = "light";
    light.addEventListener("click", () => clickLight(i));
    boardEl.appendChild(light);
  }
}

function render() {
  const plan = showSolutionEl.checked ? new Set(fewestPresses(game.board, N) || []) : new Set();
  [...boardEl.children].forEach((light, i) => {
    light.classList.toggle("on", game.board[i] === 1);
    light.classList.toggle("press-me", plan.has(i));
    light.setAttribute("aria-label", `Row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}: ${game.board[i] ? "on" : "off"}${plan.has(i) ? ", press this one" : ""}`);
  });
  pressesEl.textContent = String(game.presses);
  litEl.textContent = String(game.board.reduce((a, b) => a + b, 0));
  boardEl.classList.toggle("solved-glow", isSolved(game.board));
}

function clickLight(i) {
  if (isSolved(game.board)) return;
  game.board = press(game.board, N, i);
  game.presses += 1;
  render();
  if (isSolved(game.board)) {
    const best = fewestPresses(game.start, N).length;
    setStatus(
      game.presses <= best ? `All lights out in ${game.presses} presses. That's the fewest possible!` : `All lights out in ${game.presses} presses. It can be done in ${best}.`,
      "win"
    );
  } else {
    setStatus("Keep going.");
  }
}

function newPuzzle() {
  game.start = randomPuzzle(N, Number(levelEl.value));
  restart();
}

function restart() {
  game.board = game.start.slice();
  game.presses = 0;
  render();
  const best = fewestPresses(game.start, N).length;
  setStatus(`Turn every light off. This one can be done in ${best} press${best === 1 ? "" : "es"}.`);
}

newBtn.addEventListener("click", newPuzzle);
restartBtn.addEventListener("click", restart);
levelEl.addEventListener("change", newPuzzle);
showSolutionEl.addEventListener("change", render);

build();
newPuzzle();
