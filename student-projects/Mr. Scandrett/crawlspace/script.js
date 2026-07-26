/* ------------------------------------------------------------------------
 * Crawlspace -- a tribute to Rogue (1980), lit by one lantern.
 *
 * The dungeon underneath is exactly the one Rogue built: the map is divided
 * into a 3x3 grid of cells, one room is dropped per cell, and cells are
 * connected to their grid neighbours with straight tunnels. Every position is
 * still an integer cell, every fight is still a dice roll, and a turn still
 * only passes when the player spends one.
 *
 * What changed is that the characters are no longer the picture. Rogue printed
 * '#', '.', 'T' and '@' because a terminal was all it had; here each of those
 * is built out of primitives by the Grimoire kit in assets.js and shown by
 * torchlight. The glyphs are not gone -- they still run the parchment map in
 * the corner, which is the honest place for them, since the map is the thing
 * Rogue was really drawing.
 *
 * Rogue's two states of knowledge, "seen" and "visible", become the lighting
 * model: what you can see now is warm and lit by flame, what you only remember
 * is cold, flat and faintly blue.
 * ---------------------------------------------------------------------- */
import * as THREE from "three";
import {
  PALETTE,
  TORCH_LIGHT_COUNT,
  createAdventurer,
  createBedrock,
  createDustField,
  createGold,
  createLighting,
  createMonster,
  createPotion,
  createStairs,
  createTileLayer,
  createTorch,
  disposeLevel,
  flicker,
  seededRandom,
} from "./assets.js";

const canvas = document.getElementById("game");
const mapCanvas = document.getElementById("minimap");
const mapCtx = mapCanvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const messageEl = document.getElementById("message");
const overlay = document.getElementById("overlay");
const statEls = {
  depth: document.getElementById("stat-depth"),
  hp: document.getElementById("stat-hp"),
  atk: document.getElementById("stat-atk"),
  gold: document.getElementById("stat-gold"),
  potions: document.getElementById("stat-potions"),
  turn: document.getElementById("stat-turn"),
};

const MAP_COLS = 68;
const MAP_ROWS = 21;

const W = canvas.width;
const H = canvas.height;

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
  message = "You climb down into the crawlspace. The lantern is all you brought.";
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
    message = "You bump into cold stone.";
    return; // doesn't cost a turn
  }

  player.x = nx;
  player.y = ny;

  const item = itemAt(nx, ny);
  if (item) {
    if (item.kind === "gold") {
      player.gold += item.amount;
      message = `You gather ${item.amount} gold.`;
    } else {
      player.potions++;
      message = "You pocket a flask of green elixir.";
    }
    items = items.filter((i) => i !== item);
  } else if (tiles[ny][nx] === ">") {
    message = "Steps lead down into the dark. Press '>' to descend.";
  } else {
    message = "";
  }

  endTurn();
}

function quaffPotion() {
  if (gameOver) return;
  if (player.potions <= 0) {
    message = "Your satchel holds no elixir.";
    return;
  }
  player.potions--;
  const heal = rnd(6, 12);
  player.hp = Math.min(player.maxHp, player.hp + heal);
  message = `You drink the elixir and mend ${heal} wounds.`;
  endTurn();
}

function descend() {
  if (gameOver) return;
  if (tiles[player.y][player.x] !== ">") {
    message = "There are no steps here.";
    return;
  }
  depth++;
  player.maxHp += 3;
  player.hp = Math.min(player.maxHp, player.hp + 5);
  player.atk += 1;
  const start = generateLevel();
  player.x = start.x;
  player.y = start.y;
  message = `You descend to depth ${depth}. The air turns colder.`;
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
      message = `The ${m.name} strikes you for ${dmg}.`;
      if (player.hp <= 0) {
        player.hp = 0;
        gameOver = true;
        message = `You fall on depth ${depth}. Press 'r' to try the dark again.`;
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

/* ------------------------------------------------------------------------
 * Renderer
 *
 * Nothing past this line writes to the simulation. It reads the same tiles,
 * monsters, items and player the loop above owns, and rebuilds its own scene
 * when it notices those have been replaced.
 * ---------------------------------------------------------------------- */

// Map coordinates become world coordinates as col -> x and row -> -y, with
// cell centres on the half. Height runs along +Z, floor surface at zero.
function worldX(col) {
  return col + 0.5;
}
function worldY(row) {
  return -(row + 0.5);
}

// How far off vertical the camera sits, and how much of the dungeon it holds.
// Orthographic, because this is a map you are standing on rather than a view
// down a corridor: a rat twelve cells away is exactly as big as the one at
// your feet, which is the only way a grid stays countable.
const CAMERA_TILT = 0.52;
const VIEW_ROWS = 11;
const CAMERA_DISTANCE = 60;
const MOVE_TWEEN = 14; // how sharply a model chases its logical cell
const DUST_COUNT = 220;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(W, H, false);
renderer.setClearColor(PALETTE.dark, 1);
// Firelight close up is many times brighter than the far side of a room, and
// a linear mapping just clips it to a white disc. Rolling the highlights off
// is what keeps a torch looking hot instead of looking blown out.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();

const halfHeight = VIEW_ROWS / 2;
const halfWidth = (halfHeight * W) / H;
// The tilt only costs vertical extent, hence the cos: a cell stays square.
const camera = new THREE.OrthographicCamera(
  -halfWidth,
  halfWidth,
  halfHeight * Math.cos(CAMERA_TILT),
  -halfHeight * Math.cos(CAMERA_TILT),
  0.1,
  400
);
camera.up.set(0, 0, 1);

const lights = createLighting(scene);
scene.add(createBedrock(MAP_COLS, MAP_ROWS));

const dust = createDustField(DUST_COUNT);
scene.add(dust);
const motes = [];

const adventurer = createAdventurer();
scene.add(adventurer);

// Everything a level owns hangs off one group, so a descent is one removal.
let levelGroup = null;
let tileLayers = [];
let torches = [];
let stairsModel = null;
let builtTiles = null; // identity check: generateLevel() hands out a fresh grid

// Rendered positions, kept apart from logical ones so models walk between
// cells instead of teleporting. The simulation never reads any of this.
const bodies = new Map(); // entity object -> render state
const playerBody = { x: 0, y: 0, facing: 0, lunge: 0, lungeX: 0, lungeY: 0, hurt: 0, hp: 0 };
let lastPaintedTurn = -1;
let cameraX = 0;
let cameraY = 0;
let shake = 0;

function buildLevel() {
  if (levelGroup) {
    scene.remove(levelGroup);
    disposeLevel(levelGroup);
  }
  levelGroup = new THREE.Group();

  const floors = [];
  const rubble = [];
  const walls = [];
  let stairsCell = null;

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const t = tiles[row][col];
      const cell = { col, row, x: worldX(col), y: worldY(row), seed: col * 4093 + row * 131 };
      if (t === ">") {
        // No flagstone here: a slab over the shaft would cap it, and the whole
        // point of the tile is that the floor stops.
        stairsCell = cell;
      } else if (t === ".") {
        floors.push(cell);
      } else if (t === "#") {
        rubble.push(cell);
      } else if (touchesOpenGround(col, row)) {
        // Only the rock actually facing a room or tunnel gets dressed as
        // masonry. The rest of the map is solid ground and stays unbuilt.
        walls.push(cell);
      }
    }
  }

  // Two courses per wall cell, so the coping line catches the torchlight.
  tileLayers = [
    createTileLayer("floor", floors),
    createTileLayer("rubble", rubble),
    createTileLayer("wall", walls),
    createTileLayer("wallCap", walls),
  ];
  for (const layer of tileLayers) levelGroup.add(layer);

  stairsModel = createStairs();
  if (stairsCell) {
    stairsModel.position.set(stairsCell.x, stairsCell.y, 0);
    stairsModel.userData.cell = stairsCell;
  }
  levelGroup.add(stairsModel);

  placeTorches();
  scene.add(levelGroup);
  builtTiles = tiles;
  lastPaintedTurn = -1;
}

function touchesOpenGround(col, row) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = col + dx;
      const y = row + dy;
      if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) continue;
      if (tiles[y][x] !== " ") return true;
    }
  }
  return false;
}

// Sconces are bracketed along a room's long walls at regular intervals, not
// scattered at random. Rogue's rooms are simply lit when you are inside them,
// and every room has to earn that the honest way here -- so each one gets
// enough flames to reach its own corners, staggered top against bottom so the
// floor is never striped.
function placeTorches() {
  torches = [];
  const pick = seededRandom(depth * 104729 + rooms.length);
  for (const room of rooms) {
    // The wall above the room looks down it (world -Y, the model's own
    // forward, so no turn); the wall below it looks back up (a half turn).
    const edges = [
      { row: room.y - 1, from: room.x + 1, turn: 0 },
      { row: room.y + room.h, from: room.x + 4, turn: Math.PI },
    ];
    for (const edge of edges) {
      if (edge.row < 0 || edge.row >= MAP_ROWS) continue;
      for (let col = edge.from; col < room.x + room.w; col += 6) {
        if (col < 0 || col >= MAP_COLS) continue;
        if (tiles[edge.row][col] !== " ") continue; // a doorway, not a wall
        const torch = createTorch();
        torch.position.set(worldX(col), worldY(edge.row), 0);
        torch.rotation.z = edge.turn;
        torch.userData.cell = { col, row: edge.row };
        torch.userData.phase = pick() * Math.PI * 2;
        levelGroup.add(torch);
        torches.push(torch);
      }
    }
  }
}

// Rogue's two states of knowledge, painted straight onto the stone. Cells you
// can see keep their warm quarry colour and let the flames do the work; cells
// you only remember go cold and dim with distance, so an explored level stays
// readable without ever pretending to be lit.
const tintNow = new THREE.Color();
const memoryTint = new THREE.Color(PALETTE.memory);

function paintVisibility() {
  for (const layer of tileLayers) {
    const cells = layer.userData.cells;
    const shades = layer.userData.shades;
    const placements = layer.userData.matrices;
    const matrices = layer.instanceMatrix.array;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const known = seen[cell.row][cell.col];
      // Stone nobody has walked past is not dark, it is absent: a black block
      // still catches a specular highlight and ghosts through the dark.
      if (known) matrices.set(placements.subarray(i * 16, i * 16 + 16), i * 16);
      else matrices.fill(0, i * 16, i * 16 + 16);
      if (!known) continue;

      const shade = shades[i];
      if (visible[cell.row][cell.col]) {
        tintNow.setScalar(shade);
      } else {
        const dist = Math.hypot(cell.col - player.x, cell.row - player.y);
        tintNow.copy(memoryTint).multiplyScalar(shade * Math.max(0.45, 1 - dist / 46));
      }
      layer.setColorAt(i, tintNow);
    }
    layer.instanceMatrix.needsUpdate = true;
    if (layer.instanceColor) layer.instanceColor.needsUpdate = true;
  }
  lastPaintedTurn = turnCount;
}

// A model is made when its entity first appears and dropped when it dies or
// the level is replaced -- for a roguelike that is a handful per descent.
function syncBodies() {
  const live = new Set([...monsters, ...items]);
  for (const [entity, body] of bodies) {
    if (live.has(entity)) continue;
    scene.remove(body.model);
    disposeLevel(body.model);
    bodies.delete(entity);
  }
  for (const entity of live) {
    if (bodies.has(entity)) continue;
    let model;
    if (entity.kind === "gold") model = createGold(entity.x * 31 + entity.y);
    else if (entity.kind === "potion") model = createPotion();
    else model = createMonster(entity.ch);
    model.position.set(worldX(entity.x), worldY(entity.y), 0);
    scene.add(model);
    bodies.set(entity, {
      model,
      x: worldX(entity.x),
      y: worldY(entity.y),
      facing: 0,
      hurt: 0,
      hp: entity.hp ?? 0,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function approach(current, target, dt) {
  return current + (target - current) * Math.min(1, dt * MOVE_TWEEN);
}

function turnToward(current, target, rate) {
  const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return current + delta * Math.min(1, rate);
}

function draw(time, dt) {
  if (tiles !== builtTiles) buildLevel();
  syncBodies();
  if (turnCount !== lastPaintedTurn) paintVisibility();

  drawAdventurer(time, dt);
  drawTorches(time);
  drawEntities(time, dt);
  driftDust(dt);
  frameCamera(dt);
  renderer.render(scene, camera);
}

function drawAdventurer(time, dt) {
  const wasX = playerBody.x;
  const wasY = playerBody.y;
  playerBody.x = approach(playerBody.x, worldX(player.x), dt);
  playerBody.y = approach(playerBody.y, worldY(player.y), dt);
  const stepX = playerBody.x - wasX;
  const stepY = playerBody.y - wasY;
  if (Math.abs(stepX) + Math.abs(stepY) > 0.0015) {
    playerBody.facing = turnToward(playerBody.facing, Math.atan2(stepY, stepX), dt * 9);
  }

  if (player.hp < playerBody.hp) {
    playerBody.hurt = 0.4;
    shake = 0.12;
  }
  playerBody.hp = player.hp;
  playerBody.hurt = Math.max(0, playerBody.hurt - dt);
  playerBody.lunge = Math.max(0, playerBody.lunge - dt * 4);

  const stride = Math.abs(Math.sin(time * 0.004)) * 0.02;
  adventurer.position.set(
    playerBody.x + playerBody.lungeX * playerBody.lunge * 0.3,
    playerBody.y + playerBody.lungeY * playerBody.lunge * 0.3,
    stride
  );
  // Every model in the kit is built facing -Y, so a heading of θ is a turn of
  // θ + 90°. Then a stagger when hit, and a slump when killed.
  adventurer.rotation.z = playerBody.facing + Math.PI / 2;
  adventurer.rotation.x = gameOver ? 1.3 : playerBody.hurt * 0.3;

  // The lantern is the game's key light. It hangs off the model's own arm, so
  // it swings when the adventurer turns, and it gutters the whole time.
  const gutter = flicker(time, 0);
  adventurer.userData.arm.position.z = 0.52 + Math.sin(time * 0.003) * 0.02;
  adventurer.userData.wick.scale.setScalar(0.32 + gutter * 0.16);
  adventurer.userData.arm.getWorldPosition(lights.lantern.position);
  lights.lantern.position.z = 0.6;
  // On death the lantern is on the floor, not out: dim, steady, and still
  // showing the shape of whatever finished the job.
  lights.lantern.intensity = gameOver ? 1.5 : 3.4 + gutter * 1.6;
}

// Only sconces in the room you are standing in are burning: the dungeon is not
// lit for your benefit. Three real lights are recycled to the nearest of them,
// so the shader's light count never grows with the size of the level.
function drawTorches(time) {
  const burning = [];
  for (const torch of torches) {
    const cell = torch.userData.cell;
    const lit = visible[cell.row][cell.col];
    torch.visible = lit || seen[cell.row][cell.col];
    const f = lit ? flicker(time, torch.userData.phase) : 0;
    torch.userData.core.scale.setScalar(0.26 + f * 0.2);
    torch.userData.core.material.opacity = lit ? 0.7 + f * 0.3 : 0;
    torch.userData.halo.scale.setScalar(lit ? 0.9 + f * 0.4 : 0.001);
    if (lit) burning.push({ torch, f, d: Math.hypot(cell.col - player.x, cell.row - player.y) });
  }
  burning.sort((a, b) => a.d - b.d);
  for (let i = 0; i < TORCH_LIGHT_COUNT; i++) {
    const light = lights.torchLights[i];
    const nearest = burning[i];
    if (!nearest) {
      light.intensity = 0;
      continue;
    }
    light.position.set(nearest.torch.position.x, nearest.torch.position.y, 0.8);
    light.intensity = 2.4 + nearest.f * 1.3;
  }

  const stairsCell = stairsModel && stairsModel.userData.cell;
  if (stairsCell) {
    stairsModel.visible = seen[stairsCell.row][stairsCell.col];
    stairsModel.userData.draught.material.opacity = 0.11 + Math.sin(time * 0.0015) * 0.05;
  }
}

function drawEntities(time, dt) {
  for (const [entity, body] of bodies) {
    const model = body.model;
    body.x = approach(body.x, worldX(entity.x), dt);
    body.y = approach(body.y, worldY(entity.y), dt);
    model.visible = visible[entity.y][entity.x];

    // Treasure just idles: coins turn on the spot, elixir breathes.
    if (entity.kind) {
      model.position.set(body.x, body.y, Math.sin(time * 0.002 + body.phase) * 0.03);
      model.rotation.z = time * 0.0006 + body.phase;
      continue;
    }

    if (entity.hp < body.hp) body.hurt = 0.3;
    body.hp = entity.hp;
    body.hurt = Math.max(0, body.hurt - dt);

    // Monsters look at what they are walking toward, which down here is you.
    const toPlayer = Math.atan2(worldY(player.y) - body.y, worldX(player.x) - body.x);
    body.facing = turnToward(body.facing, toPlayer, dt * 6);

    const bob = Math.sin(time * model.userData.bobSpeed + body.phase) * model.userData.bobHeight;
    const recoil = body.hurt * 0.18;
    model.position.set(body.x - Math.cos(toPlayer) * recoil, body.y - Math.sin(toPlayer) * recoil, bob);
    model.rotation.z = body.facing + Math.PI / 2;
    model.rotation.x = -body.hurt * 0.5;
  }
}

// Motes are recycled around the adventurer rather than scattered through the
// level: dust nobody can see is dust nobody should pay for.
function driftDust(dt) {
  const pos = dust.geometry.attributes.position;
  const col = dust.geometry.attributes.color;
  const warm = new THREE.Color(PALETTE.torch);
  for (let i = 0; i < DUST_COUNT; i++) {
    let mote = motes[i];
    if (!mote || mote.life <= 0) {
      mote = motes[i] = {
        dx: (Math.random() - 0.5) * 14,
        dy: (Math.random() - 0.5) * 10,
        z: Math.random() * 1.4,
        rise: 0.04 + Math.random() * 0.12,
        drift: (Math.random() - 0.5) * 0.1,
        life: 2 + Math.random() * 6,
      };
    }
    mote.life -= dt;
    mote.z += mote.rise * dt;
    mote.dx += mote.drift * dt;
    pos.setXYZ(i, playerBody.x + mote.dx, playerBody.y + mote.dy, mote.z);
    // Brightest near the lantern, faded at both ends of its life.
    const near = Math.max(0, 1 - Math.hypot(mote.dx, mote.dy) / 5.5);
    const fade = Math.min(1, mote.life * 0.5) * near * 0.8;
    col.setXYZ(i, warm.r * fade, warm.g * fade, warm.b * fade);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
}

function frameCamera(dt) {
  cameraX += (playerBody.x - cameraX) * Math.min(1, dt * 5);
  cameraY += (playerBody.y - cameraY) * Math.min(1, dt * 5);

  // Stop at the edges of the map so the view never drifts off into bedrock.
  const marginX = halfWidth - 1.5;
  const marginY = halfHeight - 1.5;
  const x = Math.min(Math.max(cameraX, marginX), MAP_COLS - marginX);
  const y = Math.min(Math.max(cameraY, -MAP_ROWS + marginY), -marginY);

  shake = Math.max(0, shake - dt * 0.6);
  const jolt = shake > 0 ? (Math.random() - 0.5) * shake : 0;

  camera.position.set(
    x + jolt,
    y - Math.sin(CAMERA_TILT) * CAMERA_DISTANCE,
    Math.cos(CAMERA_TILT) * CAMERA_DISTANCE
  );
  camera.lookAt(x, y, 0);
}

/* --- The page around the canvas ---------------------------------------- */

// The glyphs did not survive as the game, but they are still the best map
// anyone has drawn of a dungeon like this, so they keep the corner in ink.
const MAP_SCALE = 5;
mapCanvas.width = MAP_COLS * MAP_SCALE;
mapCanvas.height = MAP_ROWS * MAP_SCALE;

function drawMinimap() {
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCtx.font = `${MAP_SCALE + 3}px "Courier New", monospace`;
  mapCtx.textBaseline = "top";
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      if (!seen[y][x]) continue;
      const t = tiles[y][x];
      if (t === " ") continue;
      const lit = visible[y][x];
      if (t === ">") mapCtx.fillStyle = lit ? "#ffd98a" : "#8a7038";
      else if (t === "#") mapCtx.fillStyle = lit ? "#a08a66" : "#4a4034";
      else mapCtx.fillStyle = lit ? "#cbb693" : "#5d5344";
      mapCtx.fillText(t, x * MAP_SCALE, y * MAP_SCALE - 2);
    }
  }
  for (const m of monsters) {
    if (!visible[m.y][m.x]) continue;
    mapCtx.fillStyle = "#d8564a";
    mapCtx.fillText(m.ch, m.x * MAP_SCALE, m.y * MAP_SCALE - 2);
  }
  for (const item of items) {
    if (!visible[item.y][item.x]) continue;
    mapCtx.fillStyle = item.kind === "gold" ? "#ffd166" : "#7fe6bb";
    mapCtx.fillText(item.ch, item.x * MAP_SCALE, item.y * MAP_SCALE - 2);
  }
  mapCtx.fillStyle = "#fff6e2";
  mapCtx.fillText("@", player.x * MAP_SCALE, player.y * MAP_SCALE - 2);
}

function syncHud() {
  statEls.depth.textContent = depth;
  statEls.hp.textContent = `${player.hp}/${player.maxHp}`;
  statEls.hp.classList.toggle("low", player.hp <= player.maxHp * 0.34);
  statEls.atk.textContent = player.atk;
  statEls.gold.textContent = player.gold;
  statEls.potions.textContent = player.potions;
  statEls.turn.textContent = turnCount;
  messageEl.textContent = message;
  messageEl.classList.toggle("dire", gameOver);

  overlay.hidden = !gameOver;
  if (gameOver) {
    overlay.querySelector(".overlay-sub").textContent =
      `Depth ${depth} · ${player.gold} gold · ${turnCount} turns — press R to go back down`;
  }
}

let lastTime = 0;
function loop(t) {
  const dt = Math.min((t - lastTime) / 1000, 0.05) || 0;
  lastTime = t;
  draw(t, dt);
  drawMinimap();
  syncHud();
  requestAnimationFrame(loop);
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

// A swing has no place in the turn loop, so the renderer works it out for
// itself: if there is a monster in the cell being walked into, the model
// leans that way for a moment instead of standing still through the fight.
function noteSwing(dx, dy) {
  if (!monsterAt(player.x + dx, player.y + dy)) return;
  playerBody.lunge = 1;
  playerBody.lungeX = dx;
  playerBody.lungeY = -dy;
}

window.addEventListener("keydown", (e) => {
  if (e.key === "r" && gameOver) {
    restart();
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
    noteSwing(move[0], move[1]);
    playerTurn(move[0], move[1]);
  }
});

function restart() {
  newGame();
  playerBody.x = worldX(player.x);
  playerBody.y = worldY(player.y);
  playerBody.hp = player.hp;
  playerBody.facing = 0;
  cameraX = playerBody.x;
  cameraY = playerBody.y;
  shake = 0;
}

startBtn.addEventListener("click", restart);

restart();
requestAnimationFrame(loop);
