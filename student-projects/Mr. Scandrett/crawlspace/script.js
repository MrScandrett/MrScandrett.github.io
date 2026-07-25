/* ------------------------------------------------------------------------
 * Crawlspace -- a tribute to Rogue (1980).
 *
 * Like the original curses-based Rogue, the whole game is just characters
 * on a grid: '#' walls/tunnels, '.' room floor, letters for monsters. The
 * dungeon generator also borrows Rogue's actual layout trick: the map is
 * divided into a 3x3 grid of cells, one room is dropped per cell, and
 * cells are connected to their grid neighbors with straight tunnels.
 * ---------------------------------------------------------------------- */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");

const CHAR_W = 10;
const CHAR_H = 18;
const MAP_COLS = 68;
const MAP_ROWS = 21;
const ROWS = MAP_ROWS + 2; // + status line + message line

canvas.width = MAP_COLS * CHAR_W;
canvas.height = ROWS * CHAR_H;

const MONSTER_TYPES = [
  { ch: "r", name: "rat", hp: 3, atk: 1, xp: 2, minDepth: 1 },
  { ch: "s", name: "snake", hp: 4, atk: 2, xp: 3, minDepth: 1 },
  { ch: "g", name: "goblin", hp: 6, atk: 2, xp: 4, minDepth: 2 },
  { ch: "o", name: "orc", hp: 10, atk: 3, xp: 7, minDepth: 3 },
  { ch: "T", name: "troll", hp: 16, atk: 5, xp: 15, minDepth: 5 },
];

let tiles, rooms, monsters, items, player, depth, turnCount, message, gameOver, seen, visible;

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeTilesGrid() {
  const grid = [];
  for (let y = 0; y < MAP_ROWS; y++) grid.push(new Array(MAP_COLS).fill(" "));
  return grid;
}

function carveRoom(room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      tiles[y][x] = ".";
    }
  }
}

function carveCorridor(x1, y1, x2, y2) {
  let x = x1;
  let y = y1;
  while (x !== x2) {
    if (tiles[y][x] === " ") tiles[y][x] = "#";
    x += x2 > x ? 1 : -1;
  }
  while (y !== y2) {
    if (tiles[y][x] === " ") tiles[y][x] = "#";
    y += y2 > y ? 1 : -1;
  }
  if (tiles[y][x] === " ") tiles[y][x] = "#";
}

function roomCenter(room) {
  return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
}

function generateLevel() {
  tiles = makeTilesGrid();
  rooms = [];

  const gridCols = 3;
  const gridRows = 3;
  const cellW = Math.floor(MAP_COLS / gridCols);
  const cellH = Math.floor(MAP_ROWS / gridRows);

  for (let gr = 0; gr < gridRows; gr++) {
    for (let gc = 0; gc < gridCols; gc++) {
      const cellX = gc * cellW + 1;
      const cellY = gr * cellH + 1;
      const w = rnd(4, Math.max(4, cellW - 4));
      const h = rnd(3, Math.max(3, cellH - 4));
      const x = rnd(cellX, Math.max(cellX, cellX + (cellW - w) - 2));
      const y = rnd(cellY, Math.max(cellY, cellY + (cellH - h) - 2));
      const room = { x, y, w, h, gr, gc };
      rooms.push(room);
      carveRoom(room);
    }
  }

  const at = (gr, gc) => rooms[gr * gridCols + gc];
  for (let gr = 0; gr < gridRows; gr++) {
    for (let gc = 0; gc < gridCols; gc++) {
      if (gc < gridCols - 1) {
        const a = roomCenter(at(gr, gc));
        const b = roomCenter(at(gr, gc + 1));
        carveCorridor(a.x, a.y, b.x, b.y);
      }
      if (gr < gridRows - 1) {
        const a = roomCenter(at(gr, gc));
        const b = roomCenter(at(gr + 1, gc));
        carveCorridor(a.x, a.y, b.x, b.y);
      }
    }
  }

  const startRoom = rooms[0];
  const stairRoom = rooms[rooms.length - 1];
  const start = roomCenter(startRoom);
  const stairs = roomCenter(stairRoom);
  tiles[stairs.y][stairs.x] = ">";

  monsters = [];
  const monsterCount = rnd(4, 7);
  const available = MONSTER_TYPES.filter((m) => m.minDepth <= depth);
  for (let i = 0; i < monsterCount; i++) {
    const room = rooms[rnd(1, rooms.length - 1)];
    const pos = randomFloorInRoom(room);
    if (!pos) continue;
    const type = available[rnd(0, available.length - 1)];
    monsters.push({ ...type, x: pos.x, y: pos.y, hp: type.hp, maxHp: type.hp });
  }

  items = [];
  const itemCount = rnd(4, 6);
  for (let i = 0; i < itemCount; i++) {
    const room = rooms[rnd(0, rooms.length - 1)];
    const pos = randomFloorInRoom(room);
    if (!pos) continue;
    const isGold = Math.random() < 0.6;
    items.push(isGold ? { ch: "$", kind: "gold", amount: rnd(5, 20) * depth, x: pos.x, y: pos.y } : { ch: "!", kind: "potion", x: pos.x, y: pos.y });
  }

  seen = makeTilesGrid().map((row) => row.map(() => false));
  visible = makeTilesGrid().map((row) => row.map(() => false));

  return start;
}

function randomFloorInRoom(room) {
  for (let tries = 0; tries < 20; tries++) {
    const x = rnd(room.x, room.x + room.w - 1);
    const y = rnd(room.y, room.y + room.h - 1);
    if (tiles[y][x] === "." && !(player && player.x === x && player.y === y)) return { x, y };
  }
  return null;
}

function newGame() {
  depth = 1;
  turnCount = 0;
  gameOver = false;
  player = { hp: 20, maxHp: 20, atk: 3, gold: 0, potions: 1, x: 0, y: 0 };
  const start = generateLevel();
  player.x = start.x;
  player.y = start.y;
  message = "You descend into the crawlspace. Good luck.";
  updateVisibility();
}

function roomAt(x, y) {
  return rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

function updateVisibility() {
  visible = makeTilesGrid().map((row) => row.map(() => false));
  const room = roomAt(player.x, player.y);
  if (room) {
    for (let y = room.y - 1; y <= room.y + room.h; y++) {
      for (let x = room.x - 1; x <= room.x + room.w; x++) {
        if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
          visible[y][x] = true;
          seen[y][x] = true;
        }
      }
    }
  } else {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = player.x + dx;
        const y = player.y + dy;
        if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
          visible[y][x] = true;
          seen[y][x] = true;
        }
      }
    }
  }
}

function isWalkable(x, y) {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return false;
  const t = tiles[y][x];
  return t === "." || t === "#" || t === ">";
}

function monsterAt(x, y) {
  return monsters.find((m) => m.x === x && m.y === y && m.hp > 0);
}

function itemAt(x, y) {
  return items.find((i) => i.x === x && i.y === y);
}

function playerTurn(dx, dy) {
  if (gameOver) return;
  const nx = player.x + dx;
  const ny = player.y + dy;

  const target = monsterAt(nx, ny);
  if (target) {
    const dmg = rnd(1, player.atk);
    target.hp -= dmg;
    if (target.hp <= 0) {
      message = `You slay the ${target.name}! (+${target.xp * 3} gold)`;
      player.gold += target.xp * 3;
      monsters = monsters.filter((m) => m !== target);
    } else {
      message = `You hit the ${target.name} for ${dmg}.`;
    }
    endTurn();
    return;
  }

  if (!isWalkable(nx, ny)) {
    message = "You bump into a wall.";
    return; // doesn't cost a turn
  }

  player.x = nx;
  player.y = ny;

  const item = itemAt(nx, ny);
  if (item) {
    if (item.kind === "gold") {
      player.gold += item.amount;
      message = `You found ${item.amount} gold.`;
    } else {
      player.potions++;
      message = "You found a healing potion.";
    }
    items = items.filter((i) => i !== item);
  } else if (tiles[ny][nx] === ">") {
    message = "You found the stairs down. Press '>' to descend.";
  } else {
    message = "";
  }

  endTurn();
}

function quaffPotion() {
  if (gameOver) return;
  if (player.potions <= 0) {
    message = "You have no potions.";
    return;
  }
  player.potions--;
  const heal = rnd(6, 12);
  player.hp = Math.min(player.maxHp, player.hp + heal);
  message = `You quaff a potion and recover ${heal} HP.`;
  endTurn();
}

function descend() {
  if (gameOver) return;
  if (tiles[player.y][player.x] !== ">") {
    message = "There are no stairs here.";
    return;
  }
  depth++;
  player.maxHp += 3;
  player.hp = Math.min(player.maxHp, player.hp + 5);
  player.atk += 1;
  const start = generateLevel();
  player.x = start.x;
  player.y = start.y;
  message = `You descend to depth ${depth}.`;
  updateVisibility();
}

function monsterTurns() {
  for (const m of monsters) {
    if (m.hp <= 0) continue;
    const dist = Math.abs(m.x - player.x) + Math.abs(m.y - player.y);
    if (dist > 9) continue; // asleep / out of range, like Rogue's wandering monsters
    const adjacent = Math.abs(m.x - player.x) <= 1 && Math.abs(m.y - player.y) <= 1;
    if (adjacent) {
      const dmg = rnd(1, m.atk);
      player.hp -= dmg;
      message = `The ${m.name} hits you for ${dmg}.`;
      if (player.hp <= 0) {
        player.hp = 0;
        gameOver = true;
        message = `You die on depth ${depth}. Press 'r' to try again.`;
      }
      continue;
    }
    // simple step-toward-target chase, no pathfinding -- pure Manhattan bias
    const dx = Math.sign(player.x - m.x);
    const dy = Math.sign(player.y - m.y);
    const options = [
      { x: m.x + dx, y: m.y + dy },
      { x: m.x + dx, y: m.y },
      { x: m.x, y: m.y + dy },
    ];
    for (const opt of options) {
      if (isWalkable(opt.x, opt.y) && !monsterAt(opt.x, opt.y) && !(opt.x === player.x && opt.y === player.y)) {
        m.x = opt.x;
        m.y = opt.y;
        break;
      }
    }
  }
}

function endTurn() {
  turnCount++;
  if (!gameOver) monsterTurns();
  updateVisibility();
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${CHAR_H - 4}px "Courier New", monospace`;
  ctx.textBaseline = "top";

  // status line
  const statusText = `Depth: ${depth}   HP: ${player.hp}/${player.maxHp}   Atk: ${player.atk}   Gold: ${player.gold}   Potions: ${player.potions}   Turn: ${turnCount}`;
  ctx.fillStyle = "#7cff9c";
  ctx.fillText(statusText, 4, 2);

  // map
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      if (!seen[y][x]) continue;
      const isVisible = visible[y][x];
      const t = tiles[y][x];
      let ch = t;
      let color = "#555";
      if (t === "#") color = isVisible ? "#8a8a8a" : "#3a3a3a";
      else if (t === ".") color = isVisible ? "#6a6a6a" : "#2e2e2e";
      else if (t === ">") color = isVisible ? "#ffe14d" : "#7a7133";

      ctx.fillStyle = color;
      ctx.fillText(ch, x * CHAR_W, (y + 1) * CHAR_H);
    }
  }

  // items (only when currently visible)
  for (const item of items) {
    if (!visible[item.y][item.x]) continue;
    ctx.fillStyle = item.kind === "gold" ? "#ffe14d" : "#ff6fd8";
    ctx.fillText(item.ch, item.x * CHAR_W, (item.y + 1) * CHAR_H);
  }

  // monsters (only when currently visible)
  for (const m of monsters) {
    if (m.hp <= 0 || !visible[m.y][m.x]) continue;
    ctx.fillStyle = "#ff5c5c";
    ctx.fillText(m.ch, m.x * CHAR_W, (m.y + 1) * CHAR_H);
  }

  // player
  ctx.fillStyle = "#ffffff";
  ctx.fillText("@", player.x * CHAR_W, (player.y + 1) * CHAR_H);

  // message line
  ctx.fillStyle = gameOver ? "#ff5c5c" : "#d8d8d8";
  ctx.fillText(message, 4, (MAP_ROWS + 1) * CHAR_H + 2);

  requestAnimationFrame(draw);
}

const KEY_MOVES = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
  k: [0, -1],
  j: [0, 1],
  h: [-1, 0],
  l: [1, 0],
  y: [-1, -1],
  u: [1, -1],
  b: [-1, 1],
  n: [1, 1],
};

window.addEventListener("keydown", (e) => {
  if (e.key === "r" && gameOver) {
    newGame();
    return;
  }
  if (gameOver) return;

  if (e.key === "q") {
    e.preventDefault();
    quaffPotion();
    return;
  }
  if (e.key === ">" || e.key === ".") {
    e.preventDefault();
    if (e.key === ">") descend();
    return;
  }
  const move = KEY_MOVES[e.key];
  if (move) {
    e.preventDefault();
    playerTurn(move[0], move[1]);
  }
});

startBtn.addEventListener("click", newGame);

newGame();
requestAnimationFrame(draw);
