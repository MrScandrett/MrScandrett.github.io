const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
const stageWrap = document.querySelector(".stage-wrap");
const gravityInput = document.querySelector("#gravity");
const bounceInput = document.querySelector("#bounce");
const sizeInput = document.querySelector("#size");
const pauseButton = document.querySelector("#pause");
const shakeButton = document.querySelector("#shake");
const clearButton = document.querySelector("#clear");
const shapeCount = document.querySelector("#shapeCount");
const energyLabel = document.querySelector("#energyLabel");
const hint = document.querySelector("#hint");
const toolButtons = [...document.querySelectorAll(".tool")];

const colors = ["#2368e8", "#15a274", "#ffb13b", "#ec4e5e", "#8057e8", "#22a6c7"];
const shapes = [];
const particles = [];
const walls = [];
let tool = "ball";
let paused = false;
let pointerDown = false;
let lastDrop = 0;
let rampStart = null;
let pointer = null;
let width = 1;
let height = 1;
let lastTime = performance.now();

function resize() {
  const rect = stageWrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  width = Math.max(320, rect.width);
  height = Math.max(320, rect.height);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

function localPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function addShape(x, y, kind = tool) {
  const size = Number(sizeInput.value);
  const shape = {
    kind,
    x,
    y,
    r: kind === "ball" ? size * 0.52 : size * 0.68,
    w: size * 1.45,
    h: size * 1.05,
    vx: (Math.random() - 0.5) * 5,
    vy: -2 - Math.random() * 2,
    angle: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.18,
    color: randomColor(),
    shine: Math.random() * 0.25 + 0.62,
  };

  shapes.push(shape);
  pop(x, y, shape.color, 8);
  trimShapes();
  updateStats();
  hint.classList.add("hidden");
}

function addWall(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < 34) return;

  walls.push({
    x1: a.x,
    y1: a.y,
    x2: b.x,
    y2: b.y,
    color: randomColor(),
  });
  if (walls.length > 10) walls.shift();
  hint.classList.add("hidden");
}

function trimShapes() {
  while (shapes.length > 85) shapes.shift();
}

function pop(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.8) * 6,
      life: 1,
      size: Math.random() * 5 + 2,
      color,
    });
  }
}

function resolveFloor(shape) {
  const radius = shape.kind === "ball" ? shape.r : Math.max(shape.w, shape.h) * 0.5;
  const bounce = Number(bounceInput.value);

  if (shape.x < radius) {
    shape.x = radius;
    shape.vx = Math.abs(shape.vx) * bounce;
  }
  if (shape.x > width - radius) {
    shape.x = width - radius;
    shape.vx = -Math.abs(shape.vx) * bounce;
  }
  if (shape.y > height - radius) {
    shape.y = height - radius;
    shape.vy = -Math.abs(shape.vy) * bounce;
    shape.vx *= 0.985;
    shape.spin *= 0.96;
    if (Math.abs(shape.vy) > 5) pop(shape.x, height - radius, shape.color, 3);
  }
  if (shape.y < radius) {
    shape.y = radius;
    shape.vy = Math.abs(shape.vy) * bounce;
  }
}

function resolveWalls(shape) {
  const radius = shape.kind === "ball" ? shape.r : Math.max(shape.w, shape.h) * 0.5;
  const bounce = Number(bounceInput.value);

  for (const wall of walls) {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const lengthSq = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((shape.x - wall.x1) * dx + (shape.y - wall.y1) * dy) / lengthSq));
    const px = wall.x1 + t * dx;
    const py = wall.y1 + t * dy;
    const nx = shape.x - px;
    const ny = shape.y - py;
    const distance = Math.hypot(nx, ny);

    if (distance > 0 && distance < radius + 7) {
      const normalX = nx / distance;
      const normalY = ny / distance;
      const dot = shape.vx * normalX + shape.vy * normalY;
      shape.x += normalX * (radius + 7 - distance);
      shape.y += normalY * (radius + 7 - distance);

      if (dot < 0) {
        shape.vx -= (1 + bounce) * dot * normalX;
        shape.vy -= (1 + bounce) * dot * normalY;
        shape.spin += (Math.random() - 0.5) * 0.09;
        if (Math.abs(dot) > 4) pop(px, py, wall.color, 2);
      }
    }
  }
}

function collideShapes() {
  const bounce = Number(bounceInput.value);

  for (let i = 0; i < shapes.length; i += 1) {
    for (let j = i + 1; j < shapes.length; j += 1) {
      const a = shapes[i];
      const b = shapes[j];
      const ar = a.kind === "ball" ? a.r : Math.max(a.w, a.h) * 0.5;
      const br = b.kind === "ball" ? b.r : Math.max(b.w, b.h) * 0.5;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ar + br;

      if (dist > 0 && dist < minDist) {
        const nx = dx / dist;
        const ny = dy / dist;
        const push = (minDist - dist) * 0.5;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const speed = rvx * nx + rvy * ny;

        if (speed < 0) {
          const impulse = -(1 + bounce * 0.8) * speed * 0.5;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
          a.spin -= impulse * 0.012;
          b.spin += impulse * 0.012;
        }
      }
    }
  }
}

function update(dt) {
  const gravity = Number(gravityInput.value) * 48;

  for (const shape of shapes) {
    shape.vy += gravity * dt;
    shape.x += shape.vx * 60 * dt;
    shape.y += shape.vy * 60 * dt;
    shape.angle += shape.spin * 60 * dt;
    shape.vx *= 0.999;
    shape.vy *= 0.999;
    resolveWalls(shape);
    resolveFloor(shape);
  }

  collideShapes();

  for (const particle of particles) {
    particle.vy += gravity * 0.32 * dt;
    particle.x += particle.vx * 60 * dt;
    particle.y += particle.vy * 60 * dt;
    particle.life -= dt * 1.7;
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

function drawShape(shape) {
  ctx.save();
  ctx.translate(shape.x, shape.y);
  ctx.rotate(shape.angle);
  ctx.shadowColor = "rgba(43, 74, 130, 0.2)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = shape.color;

  if (shape.kind === "ball") {
    const gradient = ctx.createRadialGradient(-shape.r * 0.35, -shape.r * 0.45, 2, 0, 0, shape.r);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${shape.shine})`);
    gradient.addColorStop(0.34, shape.color);
    gradient.addColorStop(1, "#1c376f");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, shape.r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    roundRect(-shape.w / 2, -shape.h / 2, shape.w, shape.h, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(-shape.w * 0.32, -shape.h * 0.3, shape.w * 0.32, shape.h * 0.18);
  }

  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawWalls() {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const wall of walls) {
    ctx.strokeStyle = "rgba(36, 48, 79, 0.18)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1 + 4);
    ctx.lineTo(wall.x2, wall.y2 + 4);
    ctx.stroke();

    ctx.strokeStyle = wall.color;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1);
    ctx.lineTo(wall.x2, wall.y2);
    ctx.stroke();
  }

  if (rampStart && pointer) {
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(36, 48, 79, 0.55)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(rampStart.x, rampStart.y);
    ctx.lineTo(pointer.x, pointer.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function render() {
  ctx.clearRect(0, 0, width, height);
  drawWalls();
  for (const shape of shapes) drawShape(shape);
  drawParticles();
}

function updateStats() {
  shapeCount.textContent = `${shapes.length} ${shapes.length === 1 ? "shape" : "shapes"}`;
  const energy = shapes.reduce((sum, shape) => sum + Math.abs(shape.vx) + Math.abs(shape.vy), 0) / Math.max(1, shapes.length);
  energyLabel.textContent = energy > 11 ? "wild" : energy > 5 ? "bouncy" : "calm";
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  if (!paused) {
    update(dt);
    updateStats();
  }
  render();
  requestAnimationFrame(loop);
}

function handlePointerDown(event) {
  pointerDown = true;
  pointer = localPoint(event);
  canvas.setPointerCapture(event.pointerId);

  if (tool === "wall") {
    rampStart = pointer;
  } else {
    addShape(pointer.x, pointer.y, tool);
    lastDrop = performance.now();
  }
}

function handlePointerMove(event) {
  pointer = localPoint(event);
  if (!pointerDown || tool === "wall") return;

  const now = performance.now();
  if (now - lastDrop > 82) {
    addShape(pointer.x, pointer.y, tool);
    lastDrop = now;
  }
}

function handlePointerUp() {
  if (tool === "wall" && rampStart && pointer) {
    addWall(rampStart, pointer);
  }
  pointerDown = false;
  rampStart = null;
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tool = button.dataset.tool;
    toolButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.textContent = paused ? "Play" : "Pause";
});

shakeButton.addEventListener("click", () => {
  for (const shape of shapes) {
    shape.vx += (Math.random() - 0.5) * 12;
    shape.vy -= Math.random() * 11 + 2;
    shape.spin += (Math.random() - 0.5) * 0.35;
  }
});

clearButton.addEventListener("click", () => {
  shapes.length = 0;
  particles.length = 0;
  walls.length = 0;
  hint.classList.remove("hidden");
  updateStats();
});

canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerup", handlePointerUp);
canvas.addEventListener("pointercancel", handlePointerUp);
window.addEventListener("resize", resize);

resize();
addWall({ x: width * 0.12, y: height * 0.7 }, { x: width * 0.42, y: height * 0.54 });
addWall({ x: width * 0.62, y: height * 0.48 }, { x: width * 0.9, y: height * 0.62 });
requestAnimationFrame(loop);
