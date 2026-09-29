import { TRAVELERS, startState, isGoal, danger, solveAll } from "./rules.js";

const ICON = { farmer: "👨‍🌾", wolf: "🐺", goat: "🐐", cabbage: "🥬" };
const bankEls = [document.getElementById("bank0"), document.getElementById("bank1")];
const boatEl = document.getElementById("boat");
const statusEl = document.getElementById("status");
const crossingsEl = document.getElementById("crossings");
const rowBtn = document.getElementById("rowBtn");
const undoBtn = document.getElementById("undoBtn");
const restartBtn = document.getElementById("restartBtn");
const solveBtn = document.getElementById("solveBtn");

const game = { state: startState(), passenger: null, history: [], lost: null, timer: null };

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function travelerButton(name) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "traveler";
  b.textContent = ICON[name];
  b.setAttribute("aria-label", name);
  return b;
}

function render() {
  const { state, passenger, lost } = game;
  bankEls.forEach((el) => (el.innerHTML = ""));
  boatEl.innerHTML = "";
  boatEl.className = `boat side-${state.farmer}`;
  boatEl.appendChild(travelerButton("farmer")).disabled = true;
  for (const name of TRAVELERS.slice(1)) {
    const b = travelerButton(name);
    const onFarmerSide = state[name] === state.farmer;
    if (lost && ((lost.includes("goat") && name === "goat" && lost.startsWith("The wolf")) || (lost.includes("cabbage") && name === "cabbage"))) {
      b.classList.add("eaten");
    }
    b.disabled = Boolean(lost) || Boolean(game.timer) || !onFarmerSide;
    b.title = onFarmerSide ? "Click to put in or take out of the boat" : "On the other side from the farmer";
    b.addEventListener("click", () => {
      game.passenger = game.passenger === name ? null : name;
      render();
    });
    if (name === passenger) boatEl.appendChild(b);
    else bankEls[state[name]].appendChild(b);
  }
  crossingsEl.textContent = String(game.history.length);
  rowBtn.disabled = Boolean(lost) || Boolean(game.timer) || isGoal(state);
  undoBtn.disabled = !game.history.length || Boolean(game.timer);
  document.getElementById("scene").classList.toggle("solved-glow", isGoal(state));
}

function row() {
  const { state, passenger } = game;
  game.history.push({ state: { ...state }, passenger });
  const next = { ...state, farmer: 1 - state.farmer };
  if (passenger) next[passenger] = 1 - state[passenger];
  game.state = next;
  game.passenger = null;
  const problem = danger(next);
  if (problem) {
    game.lost = problem;
    setStatus(`${problem} Press Undo to try again.`, "warn");
  } else if (isGoal(next)) {
    const n = game.history.length;
    setStatus(n === 7 ? "Everyone made it across in 7 crossings, the fewest possible!" : `Everyone made it across in ${n} crossings. It can be done in 7.`, "win");
  } else {
    setStatus(`The farmer rowed across${passenger ? ` with the ${passenger}` : " alone"}.`);
  }
  render();
}

rowBtn.addEventListener("click", row);

undoBtn.addEventListener("click", () => {
  const last = game.history.pop();
  if (!last) return;
  game.state = last.state;
  game.passenger = null;
  game.lost = null;
  setStatus("Undone. Try something else.");
  render();
});

function restart() {
  window.clearTimeout(game.timer);
  game.timer = null;
  game.state = startState();
  game.passenger = null;
  game.history = [];
  game.lost = null;
  setStatus("Click a traveler on the farmer's side to load the boat, then press Row across.");
  render();
}

restartBtn.addEventListener("click", restart);

solveBtn.addEventListener("click", () => {
  restart();
  const { solutions } = solveAll();
  const plan = solutions[0].slice();
  game.timer = -1;
  (function next() {
    if (!plan.length) {
      game.timer = null;
      render();
      return;
    }
    game.passenger = plan.shift();
    render();
    game.timer = window.setTimeout(() => {
      row();
      game.timer = window.setTimeout(next, 700);
    }, 700);
  })();
});

restart();
