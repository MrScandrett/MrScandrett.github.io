import { magicSum, lineSums, isMagic, LO_SHU, DURER } from "./rules.js";

const boardEl = document.getElementById("board");
const paletteEl = document.getElementById("palette");
const sumsEl = document.getElementById("sums");
const statusEl = document.getElementById("status");
const sizeEl = document.getElementById("size");
const targetEl = document.getElementById("target");
const clearBtn = document.getElementById("clearBtn");
const hintBtn = document.getElementById("hintBtn");
const revealBtn = document.getElementById("revealBtn");

const game = { n: 3, square: new Array(9).fill(0), selected: 0 };

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function render() {
  const { n, square, selected } = game;
  const target = magicSum(n);
  boardEl.style.setProperty("--n", n);
  boardEl.innerHTML = "";
  square.forEach((v, i) => {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = `slot${i === selected ? " selected" : ""}`;
    slot.textContent = v || "";
    slot.setAttribute("aria-label", `Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}: ${v || "empty"}`);
    slot.addEventListener("click", () => {
      game.selected = i;
      render();
    });
    boardEl.appendChild(slot);
  });

  paletteEl.innerHTML = "";
  for (let v = 1; v <= n * n; v += 1) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = v;
    b.disabled = square.includes(v);
    b.addEventListener("click", () => place(v));
    paletteEl.appendChild(b);
  }
  const erase = document.createElement("button");
  erase.type = "button";
  erase.textContent = "⌫";
  erase.setAttribute("aria-label", "Erase the selected square");
  erase.addEventListener("click", () => place(0));
  paletteEl.appendChild(erase);

  sumsEl.innerHTML = "";
  for (const line of lineSums(square, n)) {
    const chip = document.createElement("span");
    chip.className = `sum${line.full ? (line.sum === target ? " good" : " bad") : ""}`;
    chip.textContent = `${line.name}: ${line.sum}`;
    sumsEl.appendChild(chip);
  }
  targetEl.textContent = `Magic sum: every line must add up to ${target}.`;
  boardEl.classList.toggle("solved-glow", isMagic(square, n));
}

function place(v) {
  const { n, square } = game;
  if (v && square.includes(v)) return;
  square[game.selected] = v;
  // move on to the next empty square
  if (v) {
    const next = square.findIndex((x, i) => !x && i > game.selected);
    const first = square.indexOf(0);
    game.selected = next >= 0 ? next : first >= 0 ? first : game.selected;
  }
  render();
  if (isMagic(square, n)) setStatus(`Magic! Every line adds up to ${magicSum(n)}.`, "win");
  else if (square.every(Boolean)) setStatus("All numbers placed, but some lines are off. Swap a few and watch the totals.", "warn");
  else setStatus("Keep going.");
}

function reset() {
  game.n = Number(sizeEl.value);
  game.square = new Array(game.n * game.n).fill(0);
  game.selected = 0;
  render();
  setStatus(`Place the numbers 1 to ${game.n * game.n} so every line adds up to ${magicSum(game.n)}.`);
}

hintBtn.addEventListener("click", () => {
  if (game.n === 3) {
    setStatus("Hint: 5 must go in the center: it is the middle number, and it sits on four lines. Even numbers go in the corners.");
  } else {
    setStatus("Hint: in Dürer's square, the four corners add up to 34, and so do the four center squares.");
  }
});

revealBtn.addEventListener("click", () => {
  game.square = (game.n === 3 ? LO_SHU : DURER).slice();
  render();
  setStatus(
    game.n === 3 ? "The Lo Shu square from ancient China. Every 3 × 3 magic square is this one, turned or flipped." : "Albrecht Dürer's square from 1514. Look at the bottom row: 15 14.",
    "win"
  );
});

document.addEventListener("keydown", (event) => {
  if (event.target.closest("select")) return;
  if (/^[1-9]$/.test(event.key) && game.n === 3) place(Number(event.key));
  if (event.key === "Backspace" || event.key === "Delete") place(0);
});

clearBtn.addEventListener("click", reset);
sizeEl.addEventListener("change", reset);

reset();
