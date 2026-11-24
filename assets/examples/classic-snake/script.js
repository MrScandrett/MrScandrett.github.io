// Change these two values to tune the board and the pace.
const boardSize = 20;
const tickMs = 150;
const canvas = document.querySelector("canvas");
const pen = canvas.getContext("2d");
const colors = getComputedStyle(document.documentElement);
const start = document.querySelector("#start");
const statusLine = document.querySelector("#status");
const turns = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  ArrowUp: [0, -1], ArrowDown: [0, 1]
};
let snake, food, direction, nextDirection, timer;

function reset() {
  const mid = Math.floor(boardSize / 2);
  snake = [[mid, mid], [mid - 1, mid], [mid - 2, mid]];
  direction = nextDirection = turns.ArrowRight;
  placeFood();
  draw();
}

function placeFood() {
  const empty = [];
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      if (!snake.some(([sx, sy]) => sx === x && sy === y)) empty.push([x, y]);
    }
  }
  food = empty[Math.floor(Math.random() * empty.length)];
}

function paint([x, y], color, round) {
  const cell = canvas.width / boardSize;
  pen.fillStyle = colors.getPropertyValue(color);
  if (round) {
    pen.beginPath();
    pen.arc((x + 0.5) * cell, (y + 0.5) * cell, cell * 0.35, 0, 2 * Math.PI);
    pen.fill();
  } else {
    pen.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
  }
}

function draw() {
  pen.clearRect(0, 0, canvas.width, canvas.height);
  snake.forEach((part, i) => paint(part, i === 0 ? "--head" : "--snake"));
  if (food) paint(food, "--food", true);
  document.querySelector("#score").textContent = "Score " + (snake.length - 3);
}

function finish(message) {
  clearInterval(timer);
  timer = null;
  statusLine.textContent = message;
  start.textContent = "Play again";
}

function tick() {
  direction = nextDirection;
  const x = snake[0][0] + direction[0];
  const y = snake[0][1] + direction[1];
  const eating = x === food[0] && y === food[1];
  // The tail leaves its square on a normal move.
  const body = eating ? snake : snake.slice(0, -1);
  if (x < 0 || y < 0 || x >= boardSize || y >= boardSize ||
      body.some(([sx, sy]) => sx === x && sy === y)) {
    finish("Game over. Try another route.");
    return;
  }
  snake.unshift([x, y]);
  if (eating) placeFood();
  else snake.pop();
  draw();
  if (!food) finish("You filled the board!");
}

function steer(key) {
  const turn = turns[key];
  if (turn && !(turn[0] === -direction[0] && turn[1] === -direction[1])) {
    nextDirection = turn;
  }
}

start.onclick = () => {
  clearInterval(timer);
  reset();
  start.textContent = "Restart";
  statusLine.textContent = "Eat the dots. Avoid walls and your tail.";
  canvas.focus();
  timer = setInterval(tick, tickMs);
};
document.addEventListener("keydown", event => {
  if (timer && Object.hasOwn(turns, event.key)) {
    event.preventDefault();
    steer(event.key);
  }
});
document.querySelectorAll("[data-turn]").forEach(button => {
  button.onclick = () => steer(button.dataset.turn);
});
reset();
