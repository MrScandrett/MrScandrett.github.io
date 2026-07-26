const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const fundsEl = document.getElementById("funds");
const popEl = document.getElementById("population");
const dateEl = document.getElementById("date");
const taxRateInput = document.getElementById("taxRate");
const taxRateValueEl = document.getElementById("taxRateValue");
const toolbar = document.getElementById("toolbar");
const newCityBtn = document.getElementById("newCityBtn");
const pauseBtn = document.getElementById("pauseBtn");

const TILE = 20;
const COLS = canvas.width / TILE;
const ROWS = canvas.height / TILE;

const TOOLS = {
  bulldoze: { cost: 1 },
  road: { cost: 10 },
  rzone: { cost: 20 },
  czone: { cost: 25 },
  izone: { cost: 25 },
  power: { cost: 15 },
  plant: { cost: 500 },
};

// Palette pulled from the KayKit "City Builder Bits" kit: chunky toy-block
// buildings in flat saturated colors with dark outlines and pale rooftops.
const COLORS = {
  grassA: "#5fbf62",
  grassB: "#57b25a",
  outline: "#26301f",
  road: "#4a4d55",
  roadLine: "#f4c430",
  power: "#8a8a2f",
  plant: "#454951",
  rzoneEmpty: "#cdeccb",
  czoneEmpty: "#cfe3f5",
  izoneEmpty: "#f0e2bd",
  // building body colors by level (1-3), KayKit brick red / mustard / teal-blue
  rzone: ["#f2b64e", "#e2704a", "#4f9d69", "#3d7a55"],
  czone: ["#7fb8e8", "#4a90d9", "#3d6fae", "#2f5588"],
  izone: ["#e2704a", "#d94f3d", "#b8402f", "#8f3324"],
  roof: "#e7ecef",
};

let grid = [];
let tool = "bulldoze";
let funds = 10000;
let population = 0;
let jobs = 0;
let monthCounter = 0;
let taxRate = 9;
let running = true;
let painting = false;

function emptyTile() {
  return { type: "grass", level: 0, powered: false };
}

function newCity() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(emptyTile());
    grid.push(row);
  }
  funds = 10000;
  population = 0;
  jobs = 0;
  monthCounter = 0;
  updateHUD();
}

function updateHUD() {
  fundsEl.textContent = `$${Math.max(0, Math.floor(funds)).toLocaleString()}`;
  popEl.textContent = population.toLocaleString();
  const year = 1900 + Math.floor(monthCounter / 12);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  dateEl.textContent = `${monthNames[monthCounter % 12]} ${year}`;
  taxRateValueEl.textContent = `${taxRate}%`;
}

function neighbors4(r, c) {
  return [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ].filter(([nr, nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS);
}

function nearRoad(r, c) {
  return neighbors4(r, c).some(([nr, nc]) => grid[nr][nc].type === "road");
}

function isConductive(tile) {
  return tile.type === "power" || tile.type === "plant" || tile.type === "road";
}

// Flood-fill power outward from every plant across the conductive network
// (power lines, roads, and the plants themselves).
function updatePower() {
  for (const row of grid) for (const t of row) t.powered = false;
  const queue = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].type === "plant") {
        grid[r][c].powered = true;
        queue.push([r, c]);
      }
    }
  }
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [nr, nc] of neighbors4(r, c)) {
      const t = grid[nr][nc];
      if (!t.powered && isConductive(t)) {
        t.powered = true;
        queue.push([nr, nc]);
      }
    }
  }
  // zoned lots draw power from an adjacent powered conductor without being
  // conductors themselves (so power doesn't leapfrog across whole districts)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = grid[r][c];
      if (t.type === "rzone" || t.type === "czone" || t.type === "izone") {
        t.powered = neighbors4(r, c).some(([nr, nc]) => grid[nr][nc].powered);
      }
    }
  }
}

function simulateTick() {
  updatePower();

  population = 0;
  jobs = 0;
  for (const row of grid) {
    for (const t of row) {
      if (t.type === "rzone") population += t.level * 18;
      if (t.type === "czone" || t.type === "izone") jobs += t.level * 12;
    }
  }

  const jobDemand = jobs > 0 ? Math.min(1, jobs / Math.max(1, population)) : 0.3;
  const workerDemand = population > 0 ? Math.min(1, population / Math.max(1, jobs)) : 0.3;

  let roadCount = 0;
  let powerCount = 0;
  let plantCount = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = grid[r][c];
      if (t.type === "road") roadCount++;
      if (t.type === "power") powerCount++;
      if (t.type === "plant") plantCount++;

      const isZone = t.type === "rzone" || t.type === "czone" || t.type === "izone";
      if (!isZone || t.level >= 3) continue;
      if (!t.powered || !nearRoad(r, c)) continue;

      const demand = t.type === "rzone" ? jobDemand : workerDemand;
      const chance = 0.03 + demand * 0.12;
      if (Math.random() < chance) t.level++;
    }
  }

  const upkeep = roadCount * 0.4 + powerCount * 0.3 + plantCount * 40;
  const income = (population + jobs) * (taxRate / 100) * 0.6;
  funds += income - upkeep;

  monthCounter++;
  updateHUD();
}

function applyTool(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  const t = grid[r][c];
  const def = TOOLS[tool];

  if (tool === "bulldoze") {
    if (t.type === "grass") return;
    grid[r][c] = emptyTile();
    funds -= def.cost;
    updateHUD();
    return;
  }

  if (t.type !== "grass") return; // build on empty land only
  if (funds < def.cost) return;

  const typeMap = { road: "road", rzone: "rzone", czone: "czone", izone: "izone", power: "power", plant: "plant" };
  grid[r][c] = { type: typeMap[tool], level: 0, powered: false };
  funds -= def.cost;
  updateHUD();
}

function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawZoneBuilding(x, y, type, level, powered) {
  const colors = COLORS[type];
  const emptyColor = COLORS[`${type}Empty`];
  const bx = x + 2;
  const by = y + 2;
  const bw = TILE - 4;
  const bh = TILE - 4;

  if (level === 0) {
    roundRectPath(bx, by, bw, bh, 2);
    ctx.fillStyle = emptyColor;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 0.75;
    ctx.stroke();
    return;
  }

  // chunky toy-block building: colored body, pale flat roof cap, dark outline
  roundRectPath(bx, by, bw, bh, 2);
  ctx.fillStyle = colors[level - 1];
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  const roofH = Math.max(2, bh * 0.28);
  roundRectPath(bx + 1, by + 1, bw - 2, roofH, 1.5);
  ctx.fillStyle = COLORS.roof;
  ctx.fill();

  // window grid to suggest floors, more of them at higher levels
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const dots = level + 1;
  const winTop = by + roofH + 2;
  const winH = Math.max(1, by + bh - 3 - winTop);
  for (let i = 0; i < dots; i++) {
    for (let j = 0; j < dots; j++) {
      const dx = bx + 3 + i * ((bw - 6) / dots);
      const dy = winTop + j * (winH / dots);
      ctx.fillRect(dx, dy, 1.6, 1.6);
    }
  }

  // water tower accent on the tallest buildings, KayKit-style rooftop flair
  if (level === 3) {
    ctx.fillStyle = "#8a5a3c";
    ctx.beginPath();
    ctx.arc(bx + bw - 3, by + 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!powered) {
    ctx.strokeStyle = "rgba(217,79,61,0.85)";
    ctx.lineWidth = 1.25;
    roundRectPath(bx, by, bw, bh, 2);
    ctx.stroke();
  }
}

function draw() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      const t = grid[r][c];

      // KayKit-style two-tone checkerboard ground tile
      ctx.fillStyle = (r + c) % 2 === 0 ? COLORS.grassA : COLORS.grassB;
      ctx.fillRect(x, y, TILE, TILE);

      if (t.type === "road") {
        ctx.fillStyle = COLORS.road;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = COLORS.outline;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        ctx.strokeStyle = COLORS.roadLine;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y + TILE / 2);
        ctx.lineTo(x + TILE, y + TILE / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (t.type === "power") {
        ctx.strokeStyle = t.powered ? "#ffe14d" : "#8a8a2f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + TILE / 2);
        ctx.lineTo(x + TILE, y + TILE / 2);
        ctx.stroke();
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(x + TILE / 2 - 2, y + 3, 4, TILE - 6);
      } else if (t.type === "plant") {
        roundRectPath(x + 1, y + 1, TILE - 2, TILE - 2, 2);
        ctx.fillStyle = COLORS.plant;
        ctx.fill();
        ctx.strokeStyle = COLORS.outline;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#d94f3d";
        ctx.fillRect(x + 4, y + 2, 4, 8);
        ctx.fillStyle = "#ffe14d";
        ctx.beginPath();
        ctx.arc(x + 9.5, y + 7.5, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (t.type === "rzone" || t.type === "czone" || t.type === "izone") {
        drawZoneBuilding(x, y, t.type, t.level, t.powered);
      }
    }
  }

  // grid lines for readability
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * TILE, 0);
    ctx.lineTo(c * TILE, canvas.height);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * TILE);
    ctx.lineTo(canvas.width, r * TILE);
    ctx.stroke();
  }
}

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  return { r: Math.floor(y / TILE), c: Math.floor(x / TILE) };
}

canvas.addEventListener("mousedown", (e) => {
  painting = true;
  const { r, c } = cellFromEvent(e);
  applyTool(r, c);
});
window.addEventListener("mouseup", () => (painting = false));
canvas.addEventListener("mousemove", (e) => {
  if (!painting) return;
  const { r, c } = cellFromEvent(e);
  applyTool(r, c);
});
canvas.addEventListener("mouseleave", () => {});

toolbar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tool");
  if (!btn) return;
  tool = btn.dataset.tool;
  for (const el of toolbar.querySelectorAll(".tool")) el.classList.toggle("active", el === btn);
});

taxRateInput.addEventListener("input", () => {
  taxRate = Number(taxRateInput.value);
  updateHUD();
});

newCityBtn.addEventListener("click", newCity);

pauseBtn.addEventListener("click", () => {
  running = !running;
  pauseBtn.textContent = running ? "Pause" : "Resume";
});

let lastTick = 0;
function loop(now) {
  if (running && now - lastTick > 1000) {
    lastTick = now;
    simulateTick();
  }
  draw();
  requestAnimationFrame(loop);
}

newCity();
requestAnimationFrame(loop);
