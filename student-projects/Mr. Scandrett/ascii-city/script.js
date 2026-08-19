(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var minimap = document.getElementById("minimap");
  var mctx = minimap.getContext("2d");
  var bootOverlay = document.getElementById("bootOverlay");
  var regenBtn = document.getElementById("regenBtn");
  var statSector = document.getElementById("stat-sector");
  var statHeading = document.getElementById("stat-heading");
  var statFps = document.getElementById("stat-fps");

  // ---- character grid geometry ---------------------------------------
  var COLS = 120;
  var ROWS = 44;
  var FONT_SIZE = 14;
  var FONT = FONT_SIZE + 'px "Courier New", monospace';
  ctx.font = FONT;
  var CHAR_W = Math.ceil(ctx.measureText("0").width);
  var CHAR_H = Math.round(FONT_SIZE * 1.34);
  canvas.width = COLS * CHAR_W;
  canvas.height = ROWS * CHAR_H;
  var HORIZON = ROWS / 2;

  // ---- city grid -------------------------------------------------------
  var ROAD = 0, BUILDING = 1, SIDEWALK = 2, PARK = 3;
  var CITY_BLOCKS = 6;
  var BLOCK = 6;
  var ROAD_W = 2;
  var PERIOD = BLOCK + ROAD_W;
  var GRID = CITY_BLOCKS * PERIOD;

  var grid, bHeight, bStyle, bSeed;
  var trees = [], lamps = [], cars = [], peds = [];
  var player = { x: 0, y: 0, angle: 0 };

  function idx(x, y) { return y * GRID + x; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function isWalkable(t) { return t === ROAD || t === SIDEWALK || t === PARK; }

  function generateCity() {
    grid = new Uint8Array(GRID * GRID);
    bHeight = new Float32Array(GRID * GRID);
    bStyle = new Uint8Array(GRID * GRID);
    bSeed = new Uint8Array(GRID * GRID);
    trees = []; lamps = []; cars = []; peds = [];

    for (var bx = 0; bx < CITY_BLOCKS; bx++) {
      for (var by = 0; by < CITY_BLOCKS; by++) {
        var ox = bx * PERIOD, oy = by * PERIOD;
        var roll = Math.random();
        var kind = roll < 0.15 ? "park" : roll < 0.26 ? "plaza" : "building";
        for (var lx = 0; lx < PERIOD; lx++) {
          for (var ly = 0; ly < PERIOD; ly++) {
            var x = ox + lx, y = oy + ly, i = idx(x, y);
            if (lx >= BLOCK || ly >= BLOCK) { grid[i] = ROAD; continue; }
            if (kind === "park") { grid[i] = PARK; continue; }
            if (kind === "plaza") { grid[i] = SIDEWALK; continue; }
            if (lx >= 1 && lx < BLOCK - 1 && ly >= 1 && ly < BLOCK - 1) {
              grid[i] = BUILDING;
              bHeight[i] = rand(3, 12);
              bStyle[i] = Math.random() < 0.28 ? 1 : 0;
              bSeed[i] = (Math.random() * 255) | 0;
            } else {
              grid[i] = SIDEWALK;
            }
          }
        }
      }
    }

    for (var x2 = 0; x2 < GRID; x2++) {
      for (var y2 = 0; y2 < GRID; y2++) {
        var t = grid[idx(x2, y2)];
        if (t === PARK && Math.random() < 0.32) {
          trees.push({ x: x2 + rand(0.2, 0.8), y: y2 + rand(0.2, 0.8) });
        } else if (t === SIDEWALK && Math.random() < 0.05) {
          trees.push({ x: x2 + 0.5, y: y2 + 0.5 });
        } else if (t === SIDEWALK && Math.random() < 0.035) {
          lamps.push({ x: x2 + 0.5, y: y2 + 0.5 });
        }
      }
    }

    var roadCells = [];
    for (var x3 = 0; x3 < GRID; x3++) {
      for (var y3 = 0; y3 < GRID; y3++) {
        if (grid[idx(x3, y3)] === ROAD) roadCells.push([x3, y3]);
      }
    }
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var c = 0; c < 26 && roadCells.length; c++) {
      var cell = pick(roadCells);
      var d = (Math.random() * 4) | 0;
      cars.push({
        x: cell[0] + 0.5, y: cell[1] + 0.5, dir: d,
        speed: rand(1.6, 2.6), hue: pick(["#ff5c8a", "#7cffb0", "#ffd166", "#7cd8ff", "#c88bff"]),
      });
    }

    var walkCells = [];
    for (var x4 = 0; x4 < GRID; x4++) {
      for (var y4 = 0; y4 < GRID; y4++) {
        var t4 = grid[idx(x4, y4)];
        if (t4 === SIDEWALK || t4 === PARK) walkCells.push([x4, y4]);
      }
    }
    for (var p = 0; p < 22 && walkCells.length; p++) {
      var wc = pick(walkCells);
      peds.push({ x: wc[0] + 0.5, y: wc[1] + 0.5, tx: wc[0] + 0.5, ty: wc[1] + 0.5, speed: rand(0.5, 0.9) });
    }

    var start = walkCells.length ? pick(walkCells) : [GRID / 2 | 0, GRID / 2 | 0];
    player.x = start[0] + 0.5;
    player.y = start[1] + 0.5;
    player.angle = rand(0, Math.PI * 2);

    buildStarfield();
  }

  var DIR_VEC = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  function dirVec(d) { return DIR_VEC[d]; }

  function neighborsWithRoad(cx, cy) {
    var out = [];
    for (var d = 0; d < 4; d++) {
      var v = DIR_VEC[d];
      var nx = cx + v[0], ny = cy + v[1];
      if (nx >= 0 && ny >= 0 && nx < GRID && ny < GRID && grid[idx(nx, ny)] === ROAD) out.push(d);
    }
    return out;
  }

  // ---- input -------------------------------------------------------
  var keys = Object.create(null);
  var CONTROL_KEYS = { w: 1, a: 1, s: 1, d: 1, q: 1, e: 1, arrowup: 1, arrowdown: 1, arrowleft: 1, arrowright: 1 };
  window.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if (CONTROL_KEYS[k]) e.preventDefault();
    keys[k] = true;
    if (k === "r") generateCity();
    if (k === "m") minimap.classList.toggle("hidden");
  });
  window.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });
  regenBtn.addEventListener("click", generateCity);
  bootOverlay.addEventListener("click", function () { bootOverlay.classList.add("hidden"); });

  // ---- player + sprite simulation -----------------------------------
  var RADIUS = 0.24;
  function blocked(x, y) {
    var cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) return true;
    return grid[idx(cx, cy)] === BUILDING;
  }

  function updatePlayer(dt) {
    var turn = 0;
    if (keys.a || keys.arrowleft) turn -= 1;
    if (keys.d || keys.arrowright) turn += 1;
    player.angle += turn * 2.1 * dt;

    var fwd = 0, strafe = 0;
    if (keys.w || keys.arrowup) fwd += 1;
    if (keys.s || keys.arrowdown) fwd -= 1;
    if (keys.e) strafe += 1;
    if (keys.q) strafe -= 1;

    var cos = Math.cos(player.angle), sin = Math.sin(player.angle);
    var speed = 3.1 * dt;
    var dx = (cos * fwd - sin * strafe) * speed;
    var dy = (sin * fwd + cos * strafe) * speed;

    var sx = dx >= 0 ? 1 : -1, sy = dy >= 0 ? 1 : -1;
    if (!blocked(player.x + dx + sx * RADIUS, player.y)) player.x += dx;
    if (!blocked(player.x, player.y + dy + sy * RADIUS)) player.y += dy;
  }

  function updateCars(dt) {
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      var v = DIR_VEC[c.dir];
      c.x += v[0] * c.speed * dt;
      c.y += v[1] * c.speed * dt;
      var cx = Math.floor(c.x), cy = Math.floor(c.y);
      var fracX = c.x - cx - 0.5, fracY = c.y - cy - 0.5;
      if (Math.abs(fracX) < 0.06 && Math.abs(fracY) < 0.06) {
        var options = neighborsWithRoad(cx, cy);
        if (options.length && (Math.random() < 0.35 || options.indexOf(c.dir) === -1)) {
          c.dir = pick(options);
        }
      }
      if (grid[idx(Math.max(0, Math.min(GRID - 1, Math.floor(c.x + v[0]))), Math.max(0, Math.min(GRID - 1, Math.floor(c.y + v[1]))))] !== ROAD) {
        var opts2 = neighborsWithRoad(cx, cy);
        if (opts2.length) c.dir = pick(opts2);
      }
    }
  }

  function updatePeds(dt) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      var ddx = p.tx - p.x, ddy = p.ty - p.y;
      var d = Math.sqrt(ddx * ddx + ddy * ddy);
      if (d < 0.08) {
        var cx = Math.floor(p.x), cy = Math.floor(p.y);
        var nx = cx + ((Math.random() * 3 | 0) - 1);
        var ny = cy + ((Math.random() * 3 | 0) - 1);
        if (nx >= 0 && ny >= 0 && nx < GRID && ny < GRID && isWalkable(grid[idx(nx, ny)]) && grid[idx(nx, ny)] !== ROAD) {
          p.tx = nx + rand(0.25, 0.75);
          p.ty = ny + rand(0.25, 0.75);
        }
      } else {
        p.x += (ddx / d) * p.speed * dt;
        p.y += (ddy / d) * p.speed * dt;
      }
    }
  }

  // ---- rendering buffer ------------------------------------------------
  var buf = new Array(COLS * ROWS);
  for (var bi = 0; bi < buf.length; bi++) buf[bi] = null;
  function setCell(col, row, ch, color) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if (ch === " ") { buf[row * COLS + col] = null; return; }
    buf[row * COLS + col] = { ch: ch, color: color };
  }

  var SHADE = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];
  function shadeChar(brightness) {
    var i = Math.max(0, Math.min(SHADE.length - 1, Math.round(brightness * (SHADE.length - 1))));
    return SHADE[i];
  }
  function lerpColor(c0, c1, t) {
    t = Math.max(0, Math.min(1, t));
    var r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
    var g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
    var b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  var FAR_WALL = [22, 26, 40], NEAR_WALL = [150, 210, 235];
  var FAR_EDGE = [30, 14, 42], NEAR_EDGE = [110, 60, 150];
  var FAR_FLOOR = [10, 8, 18], NEAR_FLOOR = [64, 56, 74];
  var FAR_SIDEWALK = [16, 20, 26], NEAR_SIDEWALK = [90, 110, 120];
  var FAR_PARK = [8, 20, 14], NEAR_PARK = [50, 120, 70];

  var zbuffer = new Float32Array(COLS);
  var rayDirXs = new Float32Array(COLS);
  var rayDirYs = new Float32Array(COLS);
  var MAX_DEPTH = 22;
  var WALL_SCALE = 6.6;

  function castColumn(col, dirX, dirY, planeX, planeY) {
    var cameraX = (2 * col) / COLS - 1;
    var rdx = dirX + planeX * cameraX;
    var rdy = dirY + planeY * cameraX;
    rayDirXs[col] = rdx; rayDirYs[col] = rdy;

    var mapX = Math.floor(player.x), mapY = Math.floor(player.y);
    var deltaX = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
    var deltaY = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
    var stepX, stepY, sideDistX, sideDistY;
    if (rdx < 0) { stepX = -1; sideDistX = (player.x - mapX) * deltaX; }
    else { stepX = 1; sideDistX = (mapX + 1 - player.x) * deltaX; }
    if (rdy < 0) { stepY = -1; sideDistY = (player.y - mapY) * deltaY; }
    else { stepY = 1; sideDistY = (mapY + 1 - player.y) * deltaY; }

    var side = 0, hit = false, edge = false, guard = 0;
    while (guard++ < 200) {
      if (sideDistX < sideDistY) { sideDistX += deltaX; mapX += stepX; side = 0; }
      else { sideDistY += deltaY; mapY += stepY; side = 1; }
      if (mapX < 0 || mapY < 0 || mapX >= GRID || mapY >= GRID) { hit = true; edge = true; break; }
      if (grid[idx(mapX, mapY)] === BUILDING) { hit = true; break; }
      if (sideDistX > MAX_DEPTH && sideDistY > MAX_DEPTH) break;
    }

    var dist = hit ? (side === 0 ? sideDistX - deltaX : sideDistY - deltaY) : MAX_DEPTH;
    dist = Math.max(dist, 0.05);
    zbuffer[col] = dist;

    var height = 6, style = 0, seed = 0;
    if (hit && !edge) {
      var i2 = idx(mapX, mapY);
      height = bHeight[i2] || 6;
      style = bStyle[i2];
      seed = bSeed[i2];
    } else if (edge) {
      height = 16; style = 2; seed = (mapX * 13 + mapY * 7) & 255;
    }

    var lineHeight = (height * WALL_SCALE) / dist;
    var drawStart = Math.round(HORIZON - lineHeight / 2);
    var drawEnd = Math.round(HORIZON + lineHeight / 2);
    var clampedStart = Math.max(0, drawStart);
    var clampedEnd = Math.min(ROWS, drawEnd);
    if (!hit || dist >= MAX_DEPTH) return;

    var distRatio = Math.min(1, dist / MAX_DEPTH);
    var brightness = (1 - distRatio) * (side === 1 ? 0.72 : 1);
    var farColor = style === 2 ? FAR_EDGE : FAR_WALL;
    var nearColor = style === 2 ? NEAR_EDGE : NEAR_WALL;
    var baseColor = lerpColor(farColor, nearColor, brightness);
    var totalSpan = drawEnd - drawStart || 1;

    for (var row = clampedStart; row < clampedEnd; row++) {
      var local = row - drawStart;
      var normalized = local / totalSpan;
      var ch = shadeChar(brightness);
      var color = baseColor;
      var band = Math.floor(local / 2) + seed + timeBucket;
      var lit = style !== 2 && band % 3 === 1 && ((col + seed * 7) % 5) < 2 && normalized > 0.08 && normalized < 0.92;
      if (lit) {
        ch = ((col + row) % 2 === 0) ? "#" : "%";
        color = style === 1 ? (((col + seed) % 2 === 0) ? "#ff5cf0" : "#4de8ff") : "#ffd27a";
      }
      setCell(col, row, ch, color);
    }
  }

  var timeBucket = 0;

  function drawWalls(dirX, dirY, planeX, planeY) {
    for (var col = 0; col < COLS; col++) castColumn(col, dirX, dirY, planeX, planeY);
  }

  function drawFloorAndSky(dirX, dirY, planeX, planeY) {
    var rayDirX0 = dirX - planeX, rayDirY0 = dirY - planeY;
    var rayDirX1 = dirX + planeX, rayDirY1 = dirY + planeY;
    for (var row = Math.ceil(HORIZON) + 1; row < ROWS; row++) {
      var rowDist = (0.55 * ROWS) / (row - HORIZON);
      if (rowDist > MAX_DEPTH) rowDist = MAX_DEPTH;
      var stepX = (rowDist * (rayDirX1 - rayDirX0)) / COLS;
      var stepY = (rowDist * (rayDirY1 - rayDirY0)) / COLS;
      var fx = player.x + rowDist * rayDirX0;
      var fy = player.y + rowDist * rayDirY0;
      var distRatio = Math.min(1, rowDist / MAX_DEPTH);
      var brightness = 1 - distRatio;
      for (var col = 0; col < COLS; col++) {
        if (rowDist < zbuffer[col]) {
          var cx = Math.floor(fx), cy = Math.floor(fy);
          var t = (cx >= 0 && cy >= 0 && cx < GRID && cy < GRID) ? grid[idx(cx, cy)] : ROAD;
          var far, near, ch;
          if (t === PARK) { far = FAR_PARK; near = NEAR_PARK; ch = ((cx * 31 + cy * 17) % 5 === 0) ? "," : "."; }
          else if (t === SIDEWALK) { far = FAR_SIDEWALK; near = NEAR_SIDEWALK; ch = ((cx + cy) % 4 === 0) ? "-" : "."; }
          else {
            far = FAR_FLOOR; near = NEAR_FLOOR;
            var alongX = (cx % PERIOD) === BLOCK || (cx % PERIOD) === BLOCK + 1;
            var centerLane = Math.abs((fx - cx) - 0.5) < 0.06 || Math.abs((fy - cy) - 0.5) < 0.06;
            var dash = ((cx + cy + Math.floor(fx * 2) + Math.floor(fy * 2)) % 6) < 2;
            ch = centerLane && dash ? "=" : (((cx * 7 + cy * 13) % 9 === 0) ? ":" : ".");
          }
          setCell(col, row, ch, lerpColor(far, near, brightness));
        }
        fx += stepX; fy += stepY;
      }
    }
  }

  var stars = [];
  function buildStarfield() {
    stars = [];
    var skyRows = Math.floor(HORIZON);
    for (var i = 0; i < 160; i++) {
      stars.push({
        col: (Math.random() * COLS) | 0,
        row: (Math.random() * skyRows) | 0,
        ch: pick([".", "*", "'"]),
        bright: Math.random() < 0.15,
      });
    }
  }

  function drawSky() {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      setCell(s.col, s.row, s.ch, s.bright ? "#dfe9ff" : "#4a4f78");
    }
  }

  // ---- billboard sprites ------------------------------------------------
  var TREE = [" o ", "ooo", " I ", " I "];
  var LAMP = ["o", "I", "I", "I"];
  var PED = ["o", "I", "^"];
  var CAR_H = [".==.", "####"];

  function projectSprite(wx, wy, dirX, dirY, planeX, planeY) {
    var relX = wx - player.x, relY = wy - player.y;
    var invDet = 1 / (planeX * dirY - dirX * planeY);
    var transformX = invDet * (dirY * relX - dirX * relY);
    var transformY = invDet * (-planeY * relX + planeX * relY);
    if (transformY <= 0.15) return null;
    var screenCol = ((COLS / 2) * (1 + transformX / transformY));
    return { col: screenCol, depth: transformY };
  }

  function drawTemplate(template, wx, wy, worldHeight, worldWidth, colorFn, dirX, dirY, planeX, planeY) {
    var proj = projectSprite(wx, wy, dirX, dirY, planeX, planeY);
    if (!proj) return;
    var spriteH = (worldHeight * WALL_SCALE) / proj.depth;
    var spriteW = spriteH * (template[0].length / template.length) * 0.5 * worldWidth;
    var top = HORIZON - spriteH / 2;
    var left = proj.col - spriteW / 2;
    var rows = template.length, cols = template[0].length;
    var colStart = Math.max(0, Math.floor(left));
    var colEnd = Math.min(COLS, Math.ceil(left + spriteW));
    if (colEnd - colStart <= 0) return;
    for (var sc = colStart; sc < colEnd; sc++) {
      if (proj.depth >= zbuffer[sc]) continue;
      var u = (sc - left) / spriteW;
      var tcol = Math.max(0, Math.min(cols - 1, Math.floor(u * cols)));
      var rowStart = Math.max(0, Math.floor(top));
      var rowEnd = Math.min(ROWS, Math.ceil(top + spriteH));
      for (var sr = rowStart; sr < rowEnd; sr++) {
        var v = (sr - top) / spriteH;
        var trow = Math.max(0, Math.min(rows - 1, Math.floor(v * rows)));
        var ch = template[trow][tcol];
        if (ch === " ") continue;
        setCell(sc, sr, ch, colorFn(proj.depth));
      }
    }
  }

  function fogColor(nearHex, depth) {
    var t = Math.max(0, 1 - depth / MAX_DEPTH);
    var c1 = hexToRgb(nearHex);
    return lerpColor([8, 6, 14], c1, t);
  }
  var hexCache = {};
  function hexToRgb(hex) {
    if (hexCache[hex]) return hexCache[hex];
    var n = parseInt(hex.slice(1), 16);
    var v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache[hex] = v;
    return v;
  }

  function drawSprites(dirX, dirY, planeX, planeY) {
    var all = [];
    for (var i = 0; i < trees.length; i++) all.push({ t: "tree", o: trees[i] });
    for (i = 0; i < lamps.length; i++) all.push({ t: "lamp", o: lamps[i] });
    for (i = 0; i < peds.length; i++) all.push({ t: "ped", o: peds[i] });
    for (i = 0; i < cars.length; i++) all.push({ t: "car", o: cars[i] });

    all.sort(function (a, b) {
      var da = (a.o.x - player.x) * (a.o.x - player.x) + (a.o.y - player.y) * (a.o.y - player.y);
      var db = (b.o.x - player.x) * (b.o.x - player.x) + (b.o.y - player.y) * (b.o.y - player.y);
      return db - da;
    });

    for (i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.t === "tree") {
        drawTemplate(TREE, e.o.x, e.o.y, 3.4, 1, function (d) { return fogColor("#4fd67c", d); }, dirX, dirY, planeX, planeY);
      } else if (e.t === "lamp") {
        drawTemplate(LAMP, e.o.x, e.o.y, 3.0, 0.4, function (d) { return fogColor("#ffcf6b", d); }, dirX, dirY, planeX, planeY);
      } else if (e.t === "ped") {
        drawTemplate(PED, e.o.x, e.o.y, 1.7, 0.6, function (d) { return fogColor("#e8e8ff", d); }, dirX, dirY, planeX, planeY);
      } else if (e.t === "car") {
        var hue = e.o.hue;
        drawTemplate(CAR_H, e.o.x, e.o.y, 1.5, 2.0, function (d) { return fogColor(hue, d); }, dirX, dirY, planeX, planeY);
      }
    }
  }

  // ---- compose + blit ----------------------------------------------------
  function flush() {
    ctx.fillStyle = "#050308";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = FONT;
    ctx.textBaseline = "top";
    for (var row = 0; row < ROWS; row++) {
      var runColor = null, runStart = -1, runText = "";
      for (var col = 0; col <= COLS; col++) {
        var cell = col < COLS ? buf[row * COLS + col] : null;
        var ch = cell ? cell.ch : null;
        var color = cell ? cell.color : null;
        if (color !== runColor || col === COLS) {
          if (runText) {
            ctx.fillStyle = runColor;
            ctx.fillText(runText, runStart * CHAR_W, row * CHAR_H);
          }
          runColor = color; runStart = col; runText = ch || "";
        } else if (ch) {
          runText += ch;
        }
        if (col < COLS) buf[row * COLS + col] = null;
      }
    }
  }

  function drawMinimap() {
    var w = minimap.width, h = minimap.height;
    mctx.clearRect(0, 0, w, h);
    mctx.fillStyle = "rgba(5,5,14,0.0)";
    var range = 14;
    var scale = w / (range * 2);
    var px = player.x, py = player.y;
    mctx.save();
    mctx.translate(w / 2, h / 2);
    for (var x = Math.floor(px - range); x < px + range; x++) {
      for (var y = Math.floor(py - range); y < py + range; y++) {
        if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
        var t = grid[idx(x, y)];
        if (t === BUILDING) mctx.fillStyle = "rgba(124,252,240,0.55)";
        else if (t === ROAD) mctx.fillStyle = "rgba(255,255,255,0.10)";
        else if (t === PARK) mctx.fillStyle = "rgba(80,200,120,0.25)";
        else continue;
        mctx.fillRect((x - px) * scale, (y - py) * scale, scale + 0.5, scale + 0.5);
      }
    }
    for (var c = 0; c < cars.length; c++) {
      var cr = cars[c];
      if (Math.abs(cr.x - px) > range || Math.abs(cr.y - py) > range) continue;
      mctx.fillStyle = cr.hue;
      mctx.fillRect((cr.x - px) * scale - 1, (cr.y - py) * scale - 1, 2, 2);
    }
    mctx.save();
    mctx.rotate(player.angle);
    mctx.fillStyle = "#ff7ce8";
    mctx.beginPath();
    mctx.moveTo(6, 0);
    mctx.lineTo(-4, -4);
    mctx.lineTo(-4, 4);
    mctx.closePath();
    mctx.fill();
    mctx.restore();
    mctx.restore();
  }

  var HEADINGS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
  function headingLabel(angle) {
    var a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var seg = Math.round(a / (Math.PI / 4)) % 8;
    return HEADINGS[seg];
  }

  // ---- main loop ----------------------------------------------------------
  var lastTime = 0, fpsAccum = 0, fpsCount = 0, fpsTimer = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;
    timeBucket = Math.floor(now / 2400);

    updatePlayer(dt);
    updateCars(dt);
    updatePeds(dt);

    var dirX = Math.cos(player.angle), dirY = Math.sin(player.angle);
    var fovScale = Math.tan((Math.PI / 3) / 2);
    var planeX = -dirY * fovScale, planeY = dirX * fovScale;

    drawSky();
    drawFloorAndSky(dirX, dirY, planeX, planeY);
    drawWalls(dirX, dirY, planeX, planeY);
    drawSprites(dirX, dirY, planeX, planeY);
    flush();
    drawMinimap();

    statSector.textContent =
      String(Math.floor(player.x / PERIOD)).padStart(2, "0") + "," + String(Math.floor(player.y / PERIOD)).padStart(2, "0");
    statHeading.textContent = headingLabel(player.angle);

    fpsAccum += dt; fpsCount++;
    fpsTimer += dt;
    if (fpsTimer > 0.5) {
      statFps.textContent = Math.round(fpsCount / fpsAccum);
      fpsAccum = 0; fpsCount = 0; fpsTimer = 0;
    }

    requestAnimationFrame(frame);
  }

  generateCity();
  requestAnimationFrame(function (t) { lastTime = t; requestAnimationFrame(frame); });
})();
