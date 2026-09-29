import { isOver, take, nimSum, computerMove } from "./rules.js";

const heapsEl = document.getElementById("heaps");
const turnEl = document.getElementById("turn");
const statusEl = document.getElementById("status");
const setupEl = document.getElementById("setup");
const firstEl = document.getElementById("first");
const youWinsEl = document.getElementById("youWins");
const cpuWinsEl = document.getElementById("cpuWins");
const newBtn = document.getElementById("newBtn");
const showBinaryEl = document.getElementById("showBinary");
const binaryEl = document.getElementById("binary");
const binaryTable = document.getElementById("binaryTable");

const game = { heaps: [3, 4, 5], turn: "you", over: false, score: { you: 0, cpu: 0 }, timer: null };

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function render() {
  heapsEl.innerHTML = "";
  game.heaps.forEach((count, h) => {
    const row = document.createElement("div");
    row.className = "heap";
    const label = document.createElement("span");
    label.className = "heap-label";
    label.textContent = `Row ${h + 1}`;
    row.appendChild(label);
    for (let i = 0; i < count; i += 1) {
      const stone = document.createElement("button");
      stone.type = "button";
      stone.className = "stone";
      const taking = count - i;
      stone.setAttribute("aria-label", `Row ${h + 1}: take ${taking} stone${taking === 1 ? "" : "s"}`);
      stone.dataset.heap = h;
      stone.dataset.index = i;
      stone.disabled = game.turn !== "you" || game.over;
      stone.addEventListener("pointerenter", () => showPick(h, i));
      stone.addEventListener("focus", () => showPick(h, i));
      stone.addEventListener("pointerleave", () => showPick(null));
      stone.addEventListener("blur", () => showPick(null));
      stone.addEventListener("click", () => playerTake(h, taking));
      row.appendChild(stone);
    }
    heapsEl.appendChild(row);
  });
  turnEl.textContent = game.over ? "Game over" : game.turn === "you" ? "Your turn: click a stone to take it and every stone to its right" : "Computer is thinking…";
  youWinsEl.textContent = String(game.score.you);
  cpuWinsEl.textContent = String(game.score.cpu);
  renderBinary();
}

// outline the stones a click would take
function showPick(heap, from) {
  for (const stone of heapsEl.querySelectorAll(".stone")) {
    stone.classList.toggle("pick", heap !== null && Number(stone.dataset.heap) === heap && Number(stone.dataset.index) >= from);
  }
}

function renderBinary() {
  binaryEl.hidden = !showBinaryEl.checked;
  if (binaryEl.hidden) return;
  const width = Math.max(3, ...game.heaps.map((h) => h.toString(2).length));
  const bits = (v) => v.toString(2).padStart(width, "0").split("");
  const rows = game.heaps.map((h, i) => `<tr><td>Row ${i + 1}</td><td>${h}</td>${bits(h).map((b) => `<td>${b}</td>`).join("")}</tr>`);
  const sum = nimSum(game.heaps);
  rows.push(`<tr class="sum"><td>XOR</td><td></td>${bits(sum).map((b) => `<td class="${b === "1" ? "odd" : ""}">${b}</td>`).join("")}</tr>`);
  binaryTable.innerHTML = rows.join("");
}

function finish(winner) {
  game.over = true;
  game.score[winner === "you" ? "you" : "cpu"] += 1;
  setStatus(winner === "you" ? "You took the last stone. You win!" : "The computer took the last stone and wins. Try going first, or turn on the math.", winner === "you" ? "win" : "warn");
  render();
}

function playerTake(heap, count) {
  if (game.turn !== "you" || game.over) return;
  game.heaps = take(game.heaps, heap, count);
  if (isOver(game.heaps)) {
    finish("you");
    return;
  }
  game.turn = "computer";
  setStatus(`You took ${count} from row ${heap + 1}.`);
  render();
  game.timer = window.setTimeout(computerTurn, 700);
}

function computerTurn() {
  const move = computerMove(game.heaps);
  game.heaps = take(game.heaps, move.heap, move.count);
  if (isOver(game.heaps)) {
    finish("computer");
    return;
  }
  game.turn = "you";
  const hopeful = nimSum(game.heaps) === 0 ? "" : " (It had no winning move, so it is hoping you slip.)";
  setStatus(`The computer took ${move.count} from row ${move.heap + 1}.${hopeful}`);
  render();
}

function newGame() {
  window.clearTimeout(game.timer);
  game.heaps = setupEl.value.split(",").map(Number);
  game.over = false;
  game.turn = firstEl.value === "computer" ? "computer" : "you";
  setStatus(game.turn === "you" ? "You go first. Take the last stone to win." : "The computer goes first.");
  render();
  if (game.turn === "computer") game.timer = window.setTimeout(computerTurn, 700);
}

newBtn.addEventListener("click", newGame);
setupEl.addEventListener("change", newGame);
firstEl.addEventListener("change", newGame);
showBinaryEl.addEventListener("change", renderBinary);

newGame();
