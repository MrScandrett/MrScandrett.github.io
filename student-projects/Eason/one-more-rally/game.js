const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  level: document.querySelector("#levelText"),
  goal: document.querySelector("#goalText"),
  score: document.querySelector("#scoreText"),
  lives: document.querySelector("#livesText"),
  best: document.querySelector("#bestText"),
  percent: document.querySelector("#percentText"),
  progress: document.querySelector("#progressBar"),
  card: document.querySelector("#messageCard"),
  chapter: document.querySelector("#chapterText"),
  title: document.querySelector("#titleText"),
  story: document.querySelector("#storyText"),
  start: document.querySelector("#startButton"),
  pause: document.querySelector("#pauseButton"),
  restart: document.querySelector("#restartButton"),
  assist: document.querySelector("#assistToggle")
};

const W = canvas.width;
const H = canvas.height;
const player = { x: 26, y: H / 2 - 48, w: 15, h: 96, target: H / 2 };
const friend = { x: W - 41, y: H / 2 - 48, w: 15, h: 96 };
const ball = { x: W / 2, y: H / 2, r: 10, vx: 5, vy: 3 };
const keys = new Set();
const sparks = [];

let level = 1;
let rally = 0;
let totalKindness = 0;
let lives = 5;
let best = Number(localStorage.getItem("one-more-rally-best") || 1);
let state = "intro";
let lastTime = 0;

const chapters = [
  "A little light appears in a window.",
  "A friend writes, I am still here.",
  "The playground gets quiet, but the ball keeps answering.",
  "Every return becomes a tiny thank-you.",
  "The sky fills with names everyone remembers.",
  "Someone who felt alone starts cheering.",
  "The final rally carries all 100 lights home."
];

function levelSettings(n) {
  return {
    goal: Math.min(30, 3 + Math.floor(n / 4)),
    speed: 4.8 + n * 0.08,
    friendSkill: Math.min(0.97, 0.52 + n * 0.004),
    paddle: Math.max(58, 102 - Math.floor(n / 3)),
    ball: Math.max(6, 10 - Math.floor(n / 24)),
    drift: Math.min(2.4, n * 0.025)
  };
}

function chapterFor(n) {
  return Math.min(chapters.length - 1, Math.floor((n - 1) / 15));
}

function setUi() {
  const s = levelSettings(level);
  ui.level.textContent = `${level} / 100`;
  ui.goal.textContent = s.goal;
  ui.score.textContent = totalKindness;
  ui.lives.textContent = lives;
  ui.best.textContent = best;
  ui.percent.textContent = `${level}%`;
  ui.progress.style.width = `${level}%`;
}

function showCard(title, story, button = "Start Level") {
  ui.chapter.textContent = `Chapter ${chapterFor(level) + 1}`;
  ui.title.textContent = title;
  ui.story.textContent = story;
  ui.start.textContent = button;
  ui.card.classList.remove("hidden");
}

function hideCard() {
  ui.card.classList.add("hidden");
}

function resetBall(direction = 1) {
  const s = levelSettings(level);
  ball.x = W / 2;
  ball.y = H / 2;
  ball.r = s.ball;
  ball.vx = s.speed * direction;
  ball.vy = (Math.random() > 0.5 ? 1 : -1) * (2.2 + Math.random() * 2.2);
}

function startLevel() {
  const s = levelSettings(level);
  player.h = s.paddle;
  friend.h = s.paddle;
  player.y = H / 2 - player.h / 2;
  friend.y = H / 2 - friend.h / 2;
  rally = 0;
  lives = Math.max(lives, 3);
  resetBall(Math.random() > 0.5 ? 1 : -1);
  state = "playing";
  hideCard();
  setUi();
}

function restartGame() {
  level = 1;
  rally = 0;
  totalKindness = 0;
  lives = 5;
  state = "intro";
  setUi();
  showCard("One More Rally", "Win 100 gentle levels by keeping hope in motion.", "Start Level");
}

function completeLevel() {
  totalKindness += level;
  best = Math.max(best, level);
  localStorage.setItem("one-more-rally-best", best);

  if (level === 100) {
    state = "won";
    setUi();
    showCard(
      "All 100 Lights Are Home",
      "The last ball fades into morning. Nobody had to be perfect. Everybody kept trying.",
      "Play Again"
    );
    return;
  }

  const story = chapters[chapterFor(level)];
  level += 1;
  state = "between";
  setUi();
  showCard(`Level ${level}: One More`, story, "Start Level");
}

function loseLife() {
  lives -= 1;
  setUi();
  if (lives <= 0) {
    state = "between";
    lives = 5;
    setUi();
    showCard(
      "Try Again, Brave Heart",
      "Missing the ball is part of learning. Take a breath and send the next light.",
      "Retry Level"
    );
  } else {
    resetBall(ball.vx > 0 ? -1 : 1);
  }
}

function addSpark(x, y, color) {
  for (let i = 0; i < 10; i += 1) {
    sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 28,
      color
    });
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function paddleHit(p) {
  return ball.x + ball.r > p.x &&
    ball.x - ball.r < p.x + p.w &&
    ball.y + ball.r > p.y &&
    ball.y - ball.r < p.y + p.h;
}

function updatePaddles(dt) {
  const step = 520 * dt;
  if (keys.has("arrowup") || keys.has("w")) player.target -= step;
  if (keys.has("arrowdown") || keys.has("s")) player.target += step;

  player.target = clamp(player.target, player.h / 2, H - player.h / 2);
  player.y += (player.target - (player.y + player.h / 2)) * Math.min(1, 12 * dt);
  player.y = clamp(player.y, 0, H - player.h);

  const s = levelSettings(level);
  const helper = ui.assist.checked ? 0.13 : 0;
  const target = ball.y - friend.h / 2 + Math.sin(performance.now() / 360) * s.drift * 18;
  friend.y += (target - friend.y) * (s.friendSkill + helper) * dt * 8;
  friend.y = clamp(friend.y, 0, H - friend.h);
}

function updateBall(dt) {
  ball.x += ball.vx * dt * 60;
  ball.y += ball.vy * dt * 60;

  if (ball.y < ball.r || ball.y > H - ball.r) {
    ball.y = clamp(ball.y, ball.r, H - ball.r);
    ball.vy *= -1;
    addSpark(ball.x, ball.y, "#ffd166");
  }

  if (paddleHit(player) && ball.vx < 0) {
    const offset = (ball.y - (player.y + player.h / 2)) / (player.h / 2);
    ball.vx = Math.abs(ball.vx) * 1.018;
    ball.vy = offset * 5.2;
    rally += 1;
    addSpark(ball.x, ball.y, "#71d99e");
  }

  if (paddleHit(friend) && ball.vx > 0) {
    const offset = (ball.y - (friend.y + friend.h / 2)) / (friend.h / 2);
    ball.vx = -Math.abs(ball.vx) * 1.018;
    ball.vy = offset * 5.2;
    rally += 1;
    addSpark(ball.x, ball.y, "#4b9fff");
  }

  if (rally >= levelSettings(level).goal) completeLevel();
  if (ball.x < -40 || ball.x > W + 40) loseLife();
}

function updateSparks() {
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const p = sparks[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    if (p.life <= 0) sparks.splice(i, 1);
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#bfefff");
  sky.addColorStop(1, "#fff2c8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  for (let i = 0; i < 9; i += 1) {
    const x = (i * 127 + level * 11) % W;
    const y = 46 + (i % 4) * 45;
    ctx.beginPath();
    ctx.ellipse(x, y, 42, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(23, 50, 77, 0.16)";
  ctx.setLineDash([10, 14]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W / 2, 20);
  ctx.lineTo(W / 2, H - 20);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaddle(p, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  roundedRect(p.x, p.y, p.w, p.h, 8);
  ctx.fill();
}

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function draw() {
  drawBackground();

  ctx.fillStyle = "rgba(255, 209, 102, 0.45)";
  for (let i = 0; i < Math.min(level, 100); i += 1) {
    const x = 70 + (i % 20) * 43;
    const y = H - 34 - Math.floor(i / 20) * 18;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPaddle(player, "#ef6f6c");
  drawPaddle(friend, "#4b9fff");

  ctx.fillStyle = "#17324d";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  sparks.forEach((p) => {
    ctx.globalAlpha = p.life / 28;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(23, 50, 77, 0.86)";
  ctx.font = "700 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${rally} / ${levelSettings(level).goal}`, W / 2, 42);

  if (state === "paused") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#17324d";
    ctx.font = "800 42px Arial";
    ctx.fillText("Paused", W / 2, H / 2);
  }
}

function tick(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  if (state === "playing") {
    updatePaddles(dt);
    updateBall(dt);
  }
  updateSparks();
  draw();
  requestAnimationFrame(tick);
}

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  player.target = ((event.clientY - rect.top) / rect.height) * H;
});

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key === " ") {
    event.preventDefault();
    if (state === "playing") state = "paused";
    else if (state === "paused") state = "playing";
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

ui.start.addEventListener("click", () => {
  if (state === "won") restartGame();
  else startLevel();
});

ui.pause.addEventListener("click", () => {
  if (state === "playing") state = "paused";
  else if (state === "paused") state = "playing";
});

ui.restart.addEventListener("click", restartGame);

setUi();
showCard("One More Rally", "A gentle 100-level Pong story about trying again, helping a friend, and filling the sky with memory lights.", "Start Level");
requestAnimationFrame(tick);
