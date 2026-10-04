// Pixel Courier — the whole game in one file.
// Made for the ClassroomOS 2D Game Developer Pathway. Every section is labelled with
// the lesson that explains it, so you can look up WHY each part works.
//
// Your art (palette, sprite frames, tiles, level) lives in art.js. Replace that file
// with the art.js you downloaded from the pathway and refresh the page.

const ART = window.PIXEL_COURIER_ART;
const TILE = 16;                      // every tile and sprite frame is 16 × 16 pixels
const VIEW_W = 320, VIEW_H = 180;     // lesson 04: fixed internal resolution, scaled by CSS

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = VIEW_W;
canvas.height = VIEW_H;
ctx.imageSmoothingEnabled = false;    // lesson 01: nearest-neighbour keeps pixels sharp

// ── Tuning (lesson 05) ─────────────────────────────────────────────────────
// Change one number, save, refresh, play. Jump height = JUMP_VEL² ÷ (2 × GRAVITY).
const MAX_RUN = 90;        // top running speed, pixels per second
const ACCEL = 900;         // how fast you reach top speed on the ground
const DECEL = 1100;        // how fast you stop when you let go
const AIR_ACCEL = 600;     // steering in the air
const GRAVITY = 900;       // pixels per second², pulling down
const FALL_MUL = 1.4;      // fall faster than you rise: feels less floaty
const JUMP_VEL = 280;      // launch speed of a jump
const JUMP_CUT = 0.45;     // releasing jump early multiplies upward speed by this
const MAX_FALL = 320;      // terminal velocity
const COYOTE = 0.1;        // seconds you can still jump after leaving a ledge
const BUFFER = 0.12;       // seconds a jump press is remembered before landing

// ── Art: turn "0"–"f" strings into small canvases (lessons 01–02) ──────────
const imageCache = new Map();
function bake(frame) {
  if (imageCache.has(frame)) return imageCache.get(frame);
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const g = c.getContext("2d");
  for (let i = 0; i < 256; i++) {
    const index = parseInt(frame[i], 16);
    if (index === 0) continue;                    // 0 = transparent
    g.fillStyle = ART.palette[index];
    g.fillRect(i % 16, Math.floor(i / 16), 1, 1);
  }
  imageCache.set(frame, c);
  return c;
}
// Pick the frame from elapsed TIME, not frame count (lesson 02).
function frameOf(sprite, anim, time) {
  const a = ART.sprites[sprite].anims[anim] || ART.sprites[sprite].anims.idle;
  return a.frames[Math.floor(time * a.fps) % a.frames.length];
}

// ── Level: a tilemap stored as text (lesson 03) ────────────────────────────
// Tile letters come from ART.tiles (G grass, D dirt, B brick, C crate, = plank, ^ spikes).
// Object letters: S spawn, P parcel, M mailbox, F checkpoint flag.
let map, W, H, objects, spawn, totalParcels;
function loadLevel() {
  H = ART.level.length;
  W = ART.level[0].length;
  map = [];
  objects = [];
  for (let y = 0; y < H; y++) {
    map.push([]);
    for (let x = 0; x < W; x++) {
      const c = ART.level[y][x];
      map[y].push(ART.tiles[c] ? c : ".");
      if (c === "S") spawn = { x: x * TILE + 3, y: y * TILE + 2 };
      if (c === "P") objects.push({ type: "parcel", x: x * TILE, y: y * TILE, taken: false });
      if (c === "M") objects.push({ type: "mailbox", x: x * TILE, y: y * TILE });
      if (c === "F") objects.push({ type: "flag", x: x * TILE, y: y * TILE, on: false });
    }
  }
  totalParcels = objects.filter(o => o.type === "parcel").length;
}
function tileAt(tx, ty) {
  if (tx < 0 || tx >= W) return "B";   // the level edges act like walls
  if (ty < 0 || ty >= H) return ".";
  return map[ty][tx];
}
const isSolid = c => ART.tiles[c] && ART.tiles[c].solid;
const isOneWay = c => ART.tiles[c] && ART.tiles[c].oneWay;
const isHazard = c => ART.tiles[c] && ART.tiles[c].hazard;

// ── Game state (lesson 10) ─────────────────────────────────────────────────
let mode = "title";             // "title" → "play" ⇄ "paused" → "win"
let player, camera, checkpoint, time, collected, falls, particles, shake, hitStop;
let best = Number(localStorage.getItem("pixel-courier-best")) || null;

function reset() {
  loadLevel();
  checkpoint = { ...spawn };
  player = { x: spawn.x, y: spawn.y, w: 10, h: 14, vx: 0, vy: 0, onFloor: false,
    coyote: 0, buffer: 0, cut: false, facing: 1, state: "idle", animTime: 0, sx: 1, sy: 1, landTimer: 0 };
  camera = { x: 0, y: H * TILE - VIEW_H };
  time = 0; collected = 0; falls = 0; particles = []; shake = 0; hitStop = 0;
}

// ── Input: held keys + "just pressed" this step ────────────────────────────
const keys = {}, pressed = {};
const KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowDown: "down", KeyS: "down",
  Space: "jump", ArrowUp: "jump", KeyW: "jump", KeyP: "pause", Escape: "pause", Enter: "jump" };
addEventListener("keydown", e => {
  const k = KEYMAP[e.code]; if (!k) return;
  e.preventDefault();
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
});
addEventListener("keyup", e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

// ── Movement + collision (lessons 05–06) ───────────────────────────────────
const approach = (v, target, step) => v < target ? Math.min(v + step, target) : Math.max(v - step, target);

function moveX(dx) {
  const p = player;
  p.x += dx;
  const top = Math.floor(p.y / TILE), bottom = Math.floor((p.y + p.h - 0.01) / TILE);
  const tx = dx > 0 ? Math.floor((p.x + p.w - 0.01) / TILE) : Math.floor(p.x / TILE);
  for (let ty = top; ty <= bottom; ty++) {
    if (isSolid(tileAt(tx, ty))) {
      p.x = dx > 0 ? tx * TILE - p.w : (tx + 1) * TILE;   // push back out the way we came
      p.vx = 0;
      return;
    }
  }
}
function moveY(dy) {
  const p = player;
  const oldBottom = p.y + p.h;
  p.y += dy;
  const left = Math.floor(p.x / TILE), right = Math.floor((p.x + p.w - 0.01) / TILE);
  const ty = dy > 0 ? Math.floor((p.y + p.h - 0.01) / TILE) : Math.floor(p.y / TILE);
  for (let tx = left; tx <= right; tx++) {
    const c = tileAt(tx, ty);
    // one-way planks only catch you while falling onto their top, unless you hold ↓ + jump
    const plank = isOneWay(c) && dy > 0 && oldBottom <= ty * TILE + 0.01 && !(keys.down && keys.jump);
    if (isSolid(c) || plank) {
      if (dy > 0) { p.y = ty * TILE - p.h; p.onFloor = true; } else p.y = (ty + 1) * TILE;
      p.vy = 0;
      return;
    }
  }
}

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;   // AABB test
}

function puff(x, y, n, color) {
  for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 40, life: 0.4, color });
}

function die() {
  falls++;
  shake = 0.45;                          // lesson 09: screen shake
  puff(player.x + 5, player.y + 7, 14, ART.palette[5]);
  Object.assign(player, { x: checkpoint.x, y: checkpoint.y, vx: 0, vy: 0 });
}

// ── One fixed physics step (lesson 04) ─────────────────────────────────────
function update(dt) {
  if (mode !== "play") {
    if (pressed.jump) { if (mode === "win") reset(); mode = "play"; }
    return;
  }
  if (pressed.pause) { mode = "paused"; return; }
  if (hitStop > 0) { hitStop -= dt; return; }   // lesson 09: tiny freeze on pickups
  time += dt;
  const p = player;

  // run
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (dir) p.facing = dir;
  const rate = dir ? (p.onFloor ? ACCEL : AIR_ACCEL) : (p.onFloor ? DECEL : AIR_ACCEL * 0.5);
  p.vx = approach(p.vx, dir * MAX_RUN, rate * dt);

  // jump with coyote time + jump buffer
  p.coyote = p.onFloor ? COYOTE : p.coyote - dt;
  p.buffer = pressed.jump ? BUFFER : p.buffer - dt;
  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = -JUMP_VEL; p.buffer = 0; p.coyote = 0; p.cut = false;
    p.sx = 0.75; p.sy = 1.3;                   // stretch on take-off
    puff(p.x + 5, p.y + p.h, 5, "#e9dcc3");
  }
  if (!keys.jump && p.vy < 0 && !p.cut) { p.vy *= JUMP_CUT; p.cut = true; }   // variable jump height
  p.vy = Math.min(p.vy + GRAVITY * (p.vy > 0 ? FALL_MUL : 1) * dt, MAX_FALL);

  // move in small sub-steps, X then Y, so we never tunnel or snag
  const wasOnFloor = p.onFloor, impact = p.vy;
  p.onFloor = false;
  const dx = p.vx * dt, dy = p.vy * dt;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  for (let i = 0; i < steps; i++) { moveX(dx / steps); moveY(dy / steps); }
  if (p.onFloor && !wasOnFloor) {
    p.sx = 1.3; p.sy = 0.72;                   // squash on landing
    puff(p.x + 5, p.y + p.h, 4, "#e9dcc3");
    if (impact > 220) p.landTimer = 0.12;
  }
  p.sx += (1 - p.sx) * Math.min(1, dt * 14);
  p.sy += (1 - p.sy) * Math.min(1, dt * 14);

  // animation state machine: physics decides, animation reports (lesson 08)
  p.landTimer -= dt;
  let next = "idle";
  if (!p.onFloor) next = p.vy < 0 ? "jump" : "fall";
  else if (p.landTimer > 0) next = "land";
  else if (Math.abs(p.vx) > 8) next = "run";
  if (next !== p.state) { p.state = next; p.animTime = 0; }
  p.animTime += dt;

  // hazards: spikes use a small hitbox in the bottom of the tile (lesson 06)
  for (let ty = Math.floor(p.y / TILE); ty <= Math.floor((p.y + p.h) / TILE); ty++) {
    for (let tx = Math.floor(p.x / TILE); tx <= Math.floor((p.x + p.w) / TILE); tx++) {
      if (isHazard(tileAt(tx, ty)) && overlaps(p.x + 2, p.y + 2, p.w - 4, p.h - 2, tx * TILE + 2, ty * TILE + 9, 12, 7)) return die();
    }
  }
  if (p.y > H * TILE + 32) return die();

  // parcels, checkpoints, mailbox
  for (const o of objects) {
    if (o.type === "parcel" && !o.taken && overlaps(p.x, p.y, p.w, p.h, o.x + 2, o.y + 4, 12, 10)) {
      o.taken = true; collected++; hitStop = 0.07;
      puff(o.x + 8, o.y + 8, 12, ART.palette[7]);
    }
    if (o.type === "flag" && !o.on && overlaps(p.x, p.y, p.w, p.h, o.x, o.y, 16, 16)) {
      o.on = true; checkpoint = { x: o.x + 3, y: o.y + 2 };
    }
    if (o.type === "mailbox" && collected === totalParcels && overlaps(p.x, p.y, p.w, p.h, o.x, o.y, 16, 16)) {
      mode = "win";
      if (!best || time < best) { best = time; localStorage.setItem("pixel-courier-best", String(best)); }
    }
  }

  // camera: dead zone + smoothing + clamp (lesson 07)
  const DZ_W = 56, DZ_H = 48;
  const px = p.x + p.w / 2 + p.facing * 24, py = p.y + p.h / 2;   // 24 px look-ahead
  let tx = camera.x, ty = camera.y;
  const left = (VIEW_W - DZ_W) / 2, top = (VIEW_H - DZ_H) / 2;
  if (px < camera.x + left) tx = px - left; else if (px > camera.x + left + DZ_W) tx = px - left - DZ_W;
  if (py < camera.y + top) ty = py - top; else if (py > camera.y + top + DZ_H) ty = py - top - DZ_H;
  tx = Math.max(0, Math.min(tx, W * TILE - VIEW_W));
  ty = Math.max(0, Math.min(ty, H * TILE - VIEW_H));
  const k = 1 - Math.exp(-8 * dt);
  camera.x += (tx - camera.x) * k;
  camera.y += (ty - camera.y) * k;

  for (const q of particles) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 200 * dt; q.life -= dt; }
  particles = particles.filter(q => q.life > 0);
  shake = Math.max(0, shake - dt);
}

// ── Drawing, back to front (lessons 04 and 07) ─────────────────────────────
function draw() {
  const cx = Math.round(camera.x + (shake ? (Math.random() - 0.5) * shake * 16 : 0));   // snap to whole pixels
  const cy = Math.round(camera.y + (shake ? (Math.random() - 0.5) * shake * 16 : 0));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, "#d8f3f9"); sky.addColorStop(1, "#fff4d8");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // parallax hills: move at 30% of the camera speed
  ctx.fillStyle = "#9fd8e6";
  for (let i = -1; i < 8; i++) {
    const x = i * 64 - ((cx * 0.3) % 64);
    ctx.beginPath(); ctx.moveTo(x, VIEW_H); ctx.lineTo(x + 32, 90); ctx.lineTo(x + 64, VIEW_H); ctx.fill();
  }

  ctx.setTransform(1, 0, 0, 1, -cx, -cy);          // world space: screen = world − camera
  for (let y = 0; y < H; y++) for (let x = Math.floor(cx / TILE); x <= Math.floor((cx + VIEW_W) / TILE) && x < W; x++) {
    const c = map[y][x];
    if (c !== ".") ctx.drawImage(bake(ART.tiles[c].px), x * TILE, y * TILE);
  }
  for (const o of objects) {
    if (o.type === "parcel" && o.taken) continue;
    ctx.drawImage(bake(frameOf(o.type, o.on ? "on" : "idle", time)), o.x, o.y);
  }
  const p = player;
  ctx.save();
  ctx.translate(Math.round(p.x + p.w / 2), Math.round(p.y + p.h));
  ctx.scale(p.facing * p.sx, p.sy);                 // flip to face left; squash & stretch
  ctx.drawImage(bake(frameOf("courier", p.state, p.animTime)), -8, -16);
  ctx.restore();
  for (const q of particles) { ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); }

  // HUD in screen space
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(26,28,44,.78)"; ctx.fillRect(4, 4, 92, 14);
  ctx.fillStyle = "#ffc93c"; ctx.font = "8px monospace";
  ctx.fillText(`${collected}/${totalParcels}  ${time.toFixed(1)}s`, 10, 14);

  if (mode !== "play") {
    ctx.fillStyle = "rgba(26,28,44,.72)"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = "center"; ctx.fillStyle = "#ffc93c"; ctx.font = "bold 16px monospace";
    ctx.fillText({ title: "PIXEL COURIER", paused: "PAUSED", win: "DELIVERED!" }[mode], VIEW_W / 2, 70);
    ctx.fillStyle = "#f4f4f4"; ctx.font = "8px monospace";
    if (mode === "win") ctx.fillText(`Time ${time.toFixed(2)}s · Falls ${falls} · Best ${best.toFixed(2)}s`, VIEW_W / 2, 92);
    else ctx.fillText("Collect every parcel, then reach the mailbox.", VIEW_W / 2, 92);
    ctx.fillStyle = "#73eff7"; ctx.fillText("Press Space", VIEW_W / 2, 130);
    ctx.textAlign = "left";
  }
}

// ── The loop: fixed 60 Hz physics, draw every refresh (lesson 04) ──────────
const STEP = 1 / 60;
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min((now - last) / 1000, 0.25);
  last = now;
  while (acc >= STEP) {
    update(STEP);
    for (const k in pressed) delete pressed[k];   // "just pressed" lasts one step
    acc -= STEP;
  }
  draw();
  requestAnimationFrame(frame);
}
reset();
canvas.focus();
requestAnimationFrame(frame);
