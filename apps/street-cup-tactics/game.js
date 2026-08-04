const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const homeScoreEl = document.querySelector("#homeScore");
const awayScoreEl = document.querySelector("#awayScore");
const clockEl = document.querySelector("#clock");
const difficultyEl = document.querySelector("#difficulty");
const startBtn = document.querySelector("#startBtn");
const overlay = document.querySelector("#overlay");
const overlayStart = document.querySelector("#overlayStart");

const FIELD = { w: 960, h: 600, goalW: 96, goalDepth: 24 };
const MATCH_TIME = 120;
const keys = new Set();
const CONTROL = {
  playerSpeed: 255,
  teammateSpeed: 170,
  routeSpeed: 245,
  pickupRadius: 32,
  tackleRadius: 52,
  autoSwitchRadius: 170
};

const LEVELS = {
  beginner: { aiSpeed: 1.18, aiKick: 7.2, chase: 0.55, keeper: 0.75, name: "Beginner" },
  pro: { aiSpeed: 1.52, aiKick: 8.4, chase: 0.82, keeper: 1.05, name: "Pro" },
  hardcore: { aiSpeed: 1.9, aiKick: 9.6, chase: 1.12, keeper: 1.34, name: "Hardcore" }
};

let state;
let lastTime = performance.now();
let pointer = { down: false, points: [], assigned: null };
let mouse = { x: FIELD.w / 2, y: FIELD.h / 2, active: false };
let lastMove = { x: 1, y: 0 };

function newPlayer(x, y, team, role) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    team,
    role,
    radius: role === "keeper" ? 16 : 14,
    route: [],
    flash: 0,
    home: { x, y }
  };
}

function resetMatch() {
  const players = [];
  const home = [
    [118, 300, "keeper"],
    [270, 182, "wing"],
    [286, 418, "wing"],
    [424, 255, "mid"],
    [440, 348, "striker"]
  ];
  const away = [
    [842, 300, "keeper"],
    [690, 182, "wing"],
    [674, 418, "wing"],
    [536, 255, "mid"],
    [520, 348, "striker"]
  ];

  home.forEach((p) => players.push(newPlayer(p[0], p[1], "home", p[2])));
  away.forEach((p) => players.push(newPlayer(p[0], p[1], "away", p[2])));

  state = {
    started: true,
    paused: false,
    ended: false,
    level: LEVELS[difficultyEl.value],
    players,
    active: 3,
    ball: { x: FIELD.w / 2, y: FIELD.h / 2, vx: 0, vy: 0, owner: null, free: true },
    homeScore: 0,
    awayScore: 0,
    timeLeft: MATCH_TIME,
    message: "Kickoff",
    messageTime: 1.5,
    shake: 0
  };
  updateHud();
  overlay.classList.add("hidden");
}

function resetKickoff(scoringTeam) {
  const homes = state.players.filter((p) => p.team === "home");
  const aways = state.players.filter((p) => p.team === "away");
  const homeSpots = [[118, 300], [270, 182], [286, 418], [424, 255], [440, 348]];
  const awaySpots = [[842, 300], [690, 182], [674, 418], [536, 255], [520, 348]];
  homes.forEach((p, i) => placePlayer(p, homeSpots[i][0], homeSpots[i][1]));
  aways.forEach((p, i) => placePlayer(p, awaySpots[i][0], awaySpots[i][1]));
  state.ball = { x: FIELD.w / 2, y: FIELD.h / 2, vx: scoringTeam === "home" ? -2 : 2, vy: 0, owner: null, free: true };
  state.active = 3;
  state.message = scoringTeam === "home" ? "Home scores!" : "Away scores!";
  state.messageTime = 1.8;
  state.shake = 10;
  updateHud();
}

function placePlayer(p, x, y) {
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.route = [];
  p.flash = 0;
}

function updateHud() {
  homeScoreEl.textContent = state ? state.homeScore : "0";
  awayScoreEl.textContent = state ? state.awayScore : "0";
  const t = Math.max(0, Math.ceil(state ? state.timeLeft : MATCH_TIME));
  clockEl.textContent = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function norm(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function nearestPlayer(team, x, y, excludeActive = false) {
  let best = null;
  let bestD = Infinity;
  state.players.forEach((p, index) => {
    if (p.team !== team || (excludeActive && index === state.active)) return;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) {
      best = { player: p, index, d };
      bestD = d;
    }
  });
  return best;
}

function activePlayer() {
  return state.players[state.active];
}

function switchPlayer() {
  const ball = state.ball.owner ? state.ball.owner : state.ball;
  const nearest = nearestPlayer("home", ball.x, ball.y, false);
  if (nearest) {
    state.active = nearest.index;
    state.message = "Selected player";
    state.messageTime = 0.7;
  }
}

function autoSwitchPlayer() {
  if (state.ball.owner?.team === "home") {
    state.active = state.players.indexOf(state.ball.owner);
    return;
  }

  if (state.ball.owner?.team === "away") return;

  const active = activePlayer();
  const nearest = nearestPlayer("home", state.ball.x, state.ball.y, false);
  if (nearest && nearest.index !== state.active && nearest.d + 28 < dist(active, state.ball)) {
    state.active = nearest.index;
  }
}

function playerInput(dt) {
  const p = activePlayer();
  let ix = 0;
  let iy = 0;
  if (keys.has("arrowleft") || keys.has("a")) ix -= 1;
  if (keys.has("arrowright") || keys.has("d")) ix += 1;
  if (keys.has("arrowup") || keys.has("w")) iy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) iy += 1;

  const move = norm(ix, iy);
  const speed = ix || iy ? CONTROL.playerSpeed : 0;
  if (ix || iy) lastMove = move;
  p.vx = p.vx * 0.34 + move.x * speed * 0.66;
  p.vy = p.vy * 0.34 + move.y * speed * 0.66;

  if ((ix || iy) && !state.ball.owner) {
    const gap = dist(p, state.ball);
    if (gap < CONTROL.autoSwitchRadius) {
      const pull = norm(state.ball.x - p.x, state.ball.y - p.y);
      p.vx += pull.x * (CONTROL.autoSwitchRadius - gap) * dt * 5;
      p.vy += pull.y * (CONTROL.autoSwitchRadius - gap) * dt * 5;
    }
  }
}

function updatePlayer(p, dt, index) {
  const isHuman = index === state.active;
  if (isHuman) {
    playerInput(dt);
  } else if (p.team === "home") {
    updateTeammate(p, dt);
  } else {
    updateOpponent(p, dt);
  }

  const friction = p.team === "away" ? 0.82 : 0.74;
  p.vx *= friction;
  p.vy *= friction;

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = clamp(p.x, 44, FIELD.w - 44);
  p.y = clamp(p.y, 44, FIELD.h - 44);
  p.flash = Math.max(0, p.flash - dt);
}

function updateTeammate(p, dt) {
  if (p.route.length) {
    const target = p.route[0];
    runToward(p, target.x, target.y, CONTROL.routeSpeed, dt);
    if (Math.hypot(p.x - target.x, p.y - target.y) < 24) p.route.shift();
    return;
  }

  const ball = state.ball.owner || state.ball;
  const supportX = clamp(ball.x - 100 + (p.role === "wing" ? 36 : 0), 110, 720);
  const lane = p.role === "wing" ? (p.home.y < FIELD.h / 2 ? 160 : 440) : p.home.y;
  const shouldChase = !state.ball.owner && dist(p, state.ball) < 120;
  if (shouldChase) {
    runToward(p, state.ball.x, state.ball.y, 230, dt);
  } else {
    runToward(p, supportX, lane, CONTROL.teammateSpeed, dt);
  }
}

function updateOpponent(p, dt) {
  const level = state.level;
  const ball = state.ball.owner || state.ball;
  const hasBall = state.ball.owner === p;
  const pressure = dist(p, ball) < 300 * level.chase;

  if (hasBall) {
    runToward(p, 70, FIELD.h / 2, 230 * level.aiSpeed, dt);
    if (p.x < 260 || Math.random() < 0.01 * level.chase) kickFrom(p, -1, (FIELD.h / 2 - p.y) / 230, level.aiKick);
    return;
  }

  if (p.role === "keeper") {
    const y = clamp(ball.y, 230, 370);
    runToward(p, 842, y, 130 * level.keeper, dt);
    return;
  }

  if (pressure || state.ball.owner?.team === "home") {
    runToward(p, ball.x, ball.y, 185 * level.aiSpeed, dt);
  } else {
    runToward(p, p.home.x + Math.sin(performance.now() / 700 + p.home.y) * 30, p.home.y, 110 * level.aiSpeed, dt);
  }
}

function runToward(p, x, y, speed, dt) {
  const dir = norm(x - p.x, y - p.y);
  p.vx = p.vx * 0.7 + dir.x * speed * 0.3;
  p.vy = p.vy * 0.7 + dir.y * speed * 0.3;
}

function updateBall(dt) {
  if (state.ball.owner) {
    const p = state.ball.owner;
    const facing = p.team === "home" ? 1 : -1;
    state.ball.x = p.x + facing * 20;
    state.ball.y = p.y + 2;
    state.ball.vx = p.vx;
    state.ball.vy = p.vy;
    return;
  }

  state.ball.x += state.ball.vx * dt * 60;
  state.ball.y += state.ball.vy * dt * 60;
  state.ball.vx *= 0.986;
  state.ball.vy *= 0.986;

  if (state.ball.y < 38 || state.ball.y > FIELD.h - 38) {
    state.ball.y = clamp(state.ball.y, 38, FIELD.h - 38);
    state.ball.vy *= -0.76;
  }

  if (state.ball.x < 22 || state.ball.x > FIELD.w - 22) {
    const inGoal = Math.abs(state.ball.y - FIELD.h / 2) < FIELD.goalW / 2;
    if (inGoal && state.ball.x < 28) {
      state.awayScore += 1;
      resetKickoff("away");
      return;
    }
    if (inGoal && state.ball.x > FIELD.w - 28) {
      state.homeScore += 1;
      resetKickoff("home");
      return;
    }
    state.ball.x = clamp(state.ball.x, 22, FIELD.w - 22);
    state.ball.vx *= -0.72;
  }

  state.players.forEach((p) => {
    const pickup = p.team === "home" ? CONTROL.pickupRadius : p.radius + 12;
    if (dist(p, state.ball) < pickup) {
      state.ball.owner = p;
      p.flash = 0.25;
    }
  });
}

function kickFrom(p, xPower, yPower, force = 8.4) {
  if (state.ball.owner !== p && dist(p, state.ball) > 40) return;
  const dir = norm(xPower, yPower);
  state.ball.owner = null;
  state.ball.x = p.x + dir.x * 24;
  state.ball.y = p.y + dir.y * 24;
  state.ball.vx = dir.x * force;
  state.ball.vy = dir.y * force;
  p.vx -= dir.x * 60;
  p.vy -= dir.y * 60;
  p.flash = 0.35;
}

function humanKick() {
  const p = activePlayer();
  if (!p) return;
  let tx = mouse.active ? mouse.x - p.x : 1;
  let ty = mouse.active ? mouse.y - p.y : 0;
  const aimingWithKeys = keys.has("arrowleft") || keys.has("a") || keys.has("arrowright") || keys.has("d")
    || keys.has("arrowup") || keys.has("w") || keys.has("arrowdown") || keys.has("s");
  if (aimingWithKeys) {
    tx = lastMove.x;
    ty = lastMove.y;
  }

  if (state.ball.owner === p || dist(p, state.ball) < CONTROL.tackleRadius) {
    state.ball.owner = p;
    kickFrom(p, tx, ty, 10.2);
  } else {
    const target = nearestPlayer("away", p.x, p.y, false);
    if (target && target.d < CONTROL.tackleRadius) {
      target.player.vx += tx * 180;
      target.player.vy += ty * 110;
      target.player.flash = 0.4;
    }
  }
}

function checkPossessionSteals() {
  if (!state.ball.owner) return;
  const owner = state.ball.owner;
  state.players.forEach((p) => {
    if (p === owner || p.team === owner.team) return;
    if (dist(p, owner) < p.radius + owner.radius - 2) {
      const odds = p.team === "home" ? 0.018 : 0.012 * state.level.chase;
      if (Math.random() < odds) {
        state.ball.owner = p;
        p.flash = 0.35;
      }
    }
  });
}

function update(dt) {
  if (!state?.started || state.paused || state.ended) return;
  state.timeLeft -= dt;
  state.messageTime = Math.max(0, state.messageTime - dt);
  state.shake = Math.max(0, state.shake - dt * 28);

  if (state.timeLeft <= 0) {
    state.ended = true;
    const result = state.homeScore === state.awayScore
      ? "Full time: draw"
      : state.homeScore > state.awayScore
        ? "Full time: home wins"
        : "Full time: away wins";
    state.message = result;
    state.messageTime = 999;
    overlay.querySelector("h2").textContent = result;
    overlay.querySelector("p").textContent = "Change the level and start another match when you are ready.";
    overlayStart.textContent = "Rematch";
    overlay.classList.remove("hidden");
  }

  autoSwitchPlayer();
  state.players.forEach((p, i) => updatePlayer(p, dt, i));
  checkPossessionSteals();
  updateBall(dt);
  updateHud();
}

function drawField() {
  const stripeW = FIELD.w / 10;
  for (let i = 0; i < 10; i += 1) {
    ctx.fillStyle = i % 2 ? "#2d814f" : "#28784a";
    ctx.fillRect(i * stripeW, 0, stripeW, FIELD.h);
  }

  ctx.strokeStyle = "rgba(246, 241, 223, 0.82)";
  ctx.lineWidth = 4;
  ctx.strokeRect(38, 38, FIELD.w - 76, FIELD.h - 76);
  ctx.beginPath();
  ctx.moveTo(FIELD.w / 2, 38);
  ctx.lineTo(FIELD.w / 2, FIELD.h - 38);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(FIELD.w / 2, FIELD.h / 2, 76, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeRect(38, 198, 126, 204);
  ctx.strokeRect(FIELD.w - 164, 198, 126, 204);
  ctx.fillStyle = "#f0d77e";
  ctx.fillRect(12, FIELD.h / 2 - FIELD.goalW / 2, FIELD.goalDepth, FIELD.goalW);
  ctx.fillRect(FIELD.w - 36, FIELD.h / 2 - FIELD.goalW / 2, FIELD.goalDepth, FIELD.goalW);

  ctx.fillStyle = "rgba(10, 18, 15, 0.16)";
  for (let y = 62; y < FIELD.h; y += 58) {
    ctx.fillRect(0, y, FIELD.w, 2);
  }
}

function drawPlayer(p, index) {
  const selected = index === state.active;
  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 15, 17, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p.team === "home" ? "#55aaff" : "#f05a42";
  ctx.strokeStyle = selected ? "#f6c64f" : "#111715";
  ctx.lineWidth = selected ? 5 : 3;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1a1510";
  ctx.fillRect(-8, -2, 16, 4);
  ctx.fillStyle = p.team === "home" ? "#d9efff" : "#ffd7cf";
  ctx.fillRect(-7, -14, 14, 7);

  if (p.flash > 0) {
    ctx.strokeStyle = "rgba(246, 198, 79, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 7 + Math.sin(performance.now() / 42) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoutes() {
  state.players.forEach((p, index) => {
    if (p.team !== "home" || !p.route.length) return;
    ctx.strokeStyle = index === state.active ? "rgba(246, 198, 79, 0.66)" : "rgba(84, 166, 255, 0.72)";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    p.route.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
    ctx.setLineDash([]);
  });

  if (pointer.down && pointer.points.length > 1) {
    ctx.strokeStyle = "rgba(246, 198, 79, 0.92)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    pointer.points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }
}

function drawBall() {
  const b = state.ball;
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + 10, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#faf8e8";
  ctx.strokeStyle = "#121816";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(b.x - 7, b.y);
  ctx.lineTo(b.x + 7, b.y);
  ctx.moveTo(b.x, b.y - 7);
  ctx.lineTo(b.x, b.y + 7);
  ctx.stroke();
}

function drawMessage() {
  if (state.messageTime <= 0) return;
  ctx.save();
  ctx.fillStyle = "rgba(12, 18, 16, 0.72)";
  ctx.strokeStyle = "rgba(246, 198, 79, 0.86)";
  ctx.lineWidth = 2;
  roundedRect(FIELD.w / 2 - 170, 58, 340, 58, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f6f1df";
  ctx.font = "800 24px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(state.message, FIELD.w / 2, 94);
  ctx.restore();
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, FIELD.w, FIELD.h);
  if (state?.shake) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawField();

  if (!state) {
    ctx.restore();
    return;
  }

  drawRoutes();
  state.players.forEach((p, i) => drawPlayer(p, i));
  drawBall();
  drawMessage();
  ctx.restore();
}

function frame(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * FIELD.w,
    y: ((event.clientY - rect.top) / rect.height) * FIELD.h
  };
}

function updateMouse(event) {
  mouse = { ...canvasPoint(event), active: true };
}

function simplifyRoute(points) {
  const route = [];
  points.forEach((point) => {
    const prev = route[route.length - 1];
    if (!prev || Math.hypot(prev.x - point.x, prev.y - point.y) > 26) {
      route.push({
        x: clamp(point.x, 54, FIELD.w - 54),
        y: clamp(point.y, 54, FIELD.h - 54)
      });
    }
  });
  return route.slice(0, 10);
}

canvas.addEventListener("pointerdown", (event) => {
  if (!state?.started || state.ended) return;
  canvas.setPointerCapture(event.pointerId);
  const point = canvasPoint(event);
  mouse = { ...point, active: true };
  const nearest = nearestPlayer("home", point.x, point.y, true);
  pointer = {
    down: true,
    points: [point],
    assigned: nearest ? nearest.player : activePlayer()
  };
});

canvas.addEventListener("pointermove", (event) => {
  updateMouse(event);
  if (!pointer.down) return;
  pointer.points.push(canvasPoint(event));
});

canvas.addEventListener("pointerup", (event) => {
  if (!pointer.down) return;
  updateMouse(event);
  canvas.releasePointerCapture(event.pointerId);
  const route = simplifyRoute(pointer.points);
  if (pointer.assigned && route.length > 1) {
    pointer.assigned.route = route;
    state.message = "Route drawn";
    state.messageTime = 0.75;
  } else {
    const point = canvasPoint(event);
    const nearest = nearestPlayer("home", point.x, point.y, false);
    if (nearest && nearest.d < 60) {
      state.active = nearest.index;
      state.message = "Selected player";
      state.messageTime = 0.65;
    }
  }
  pointer = { down: false, points: [], assigned: null };
});

canvas.addEventListener("pointerleave", () => {
  mouse.active = false;
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "shift"].includes(key)) {
    event.preventDefault();
  }
  keys.add(key);
  if (!state?.started) return;
  if (key === " ") humanKick();
  if (key === "shift") switchPlayer();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

startBtn.addEventListener("click", resetMatch);
overlayStart.addEventListener("click", resetMatch);
difficultyEl.addEventListener("change", () => {
  if (state?.started && !state.ended) {
    state.level = LEVELS[difficultyEl.value];
    state.message = LEVELS[difficultyEl.value].name;
    state.messageTime = 0.9;
  }
});

resetMatch();
overlay.classList.remove("hidden");
requestAnimationFrame(frame);
