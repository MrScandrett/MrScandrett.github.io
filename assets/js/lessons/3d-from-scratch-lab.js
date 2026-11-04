/**
 * 3D from Scratch: Interactive Engine Explorer Lab
 * Mr. Scandrett's ClassroomOS
 * Zero external 3D libraries: pure canvas 2D mathematics.
 */

(function () {
  'use strict';

  // --- TAB NAVIGATION ---
  const tabButtons = document.querySelectorAll('[data-engine-tab]');
  const tabPanels = document.querySelectorAll('.engine-panel');

  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      const active = btn.dataset.engineTab === tabId;
      btn.setAttribute('aria-selected', String(active));
      btn.classList.toggle('active', active);
    });
    tabPanels.forEach(panel => {
      const active = panel.id === `panel-${tabId}`;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.engineTab));
  });

  // ==========================================
  // TAB 1: 3D PROJECTION & ROTATION
  // ==========================================
  const projCanvas = document.getElementById('proj-canvas');
  if (projCanvas) {
    const ctx = projCanvas.getContext('2d');
    const fovSlider = document.getElementById('proj-fov');
    const distSlider = document.getElementById('proj-dist');
    const yawSlider = document.getElementById('proj-yaw');
    const pitchSlider = document.getElementById('proj-pitch');
    const modeSelect = document.getElementById('proj-mode');
    const modelSelect = document.getElementById('proj-model');

    const outFov = document.getElementById('val-proj-fov');
    const outDist = document.getElementById('val-proj-dist');
    const outYaw = document.getElementById('val-proj-yaw');
    const outPitch = document.getElementById('val-proj-pitch');

    const mathWorld = document.getElementById('math-world');
    const mathRel = document.getElementById('math-rel');
    const mathRot = document.getElementById('math-rot');
    const mathScreen = document.getElementById('math-screen');

    // 3D Models
    const models = {
      cube: {
        vertices: [
          [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
          [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1]
        ],
        edges: [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7]
        ]
      },
      pyramid: {
        vertices: [
          [-1.2, -1, -1.2], [1.2, -1, -1.2], [1.2, -1, 1.2], [-1.2, -1, 1.2],
          [0, 1.4, 0]
        ],
        edges: [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [0, 4], [1, 4], [2, 4], [3, 4]
        ]
      },
      diamond: {
        vertices: [
          [0, 1.5, 0], [0, -1.5, 0],
          [-1.2, 0, 0], [1.2, 0, 0], [0, 0, -1.2], [0, 0, 1.2]
        ],
        edges: [
          [0, 2], [0, 3], [0, 4], [0, 5],
          [1, 2], [1, 3], [1, 4], [1, 5],
          [2, 4], [4, 3], [3, 5], [5, 2]
        ]
      }
    };

    function renderProjection() {
      const w = projCanvas.width = projCanvas.clientWidth || 540;
      const h = projCanvas.height = 360;
      const cx = w / 2;
      const cy = h / 2;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Grid background
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Read values
      const fov = parseFloat(fovSlider.value);
      const camZ = -parseFloat(distSlider.value);
      const yawDeg = parseFloat(yawSlider.value);
      const pitchDeg = parseFloat(pitchSlider.value);
      const mode = modeSelect.value;
      const modelKey = modelSelect.value;

      if (outFov) outFov.textContent = String(fov);
      if (outDist) outDist.textContent = String(-camZ);
      if (outYaw) outYaw.textContent = yawDeg + '°';
      if (outPitch) outPitch.textContent = pitchDeg + '°';

      const yaw = (yawDeg * Math.PI) / 180;
      const pitch = (pitchDeg * Math.PI) / 180;
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

      const model = models[modelKey] || models.cube;
      const projected = [];

      // Transform and project each vertex
      for (let i = 0; i < model.vertices.length; i++) {
        const [vx, vy, vz] = model.vertices[i];

        // 1. World to Camera (Yaw around Y, Pitch around X)
        // Yaw
        const x1 = vx * cosY - vz * sinY;
        const z1 = vx * sinY + vz * cosY;
        const y1 = vy;

        // Pitch
        const y2 = y1 * cosP - z1 * sinP;
        const z2 = y1 * sinP + z1 * cosP;
        const x2 = x1;

        // Relative to camera Z
        const camRelZ = z2 - camZ;

        let screenX = 0;
        let screenY = 0;

        if (mode === 'perspective') {
          // Perspective division: x' = X * (FOV / Z)
          if (camRelZ > 0.1) {
            const factor = fov / camRelZ;
            screenX = cx + x2 * factor;
            screenY = cy - y2 * factor; // Canvas Y grows down
          } else {
            screenX = -9999;
            screenY = -9999;
          }
        } else {
          // Parallel / Axonometric projection
          const depthFactor = 2.0;
          screenX = cx + x2 * 45;
          screenY = cy - y2 * 45 + (z2 * 45) / depthFactor;
        }

        projected.push({ sx: screenX, sy: screenY, z: camRelZ, x2, y2, z2, orig: [vx, vy, vz] });
      }

      // Draw wireframe edges
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      for (const [i0, i1] of model.edges) {
        const p0 = projected[i0];
        const p1 = projected[i1];
        if (p0.sx > -500 && p1.sx > -500) {
          ctx.beginPath();
          ctx.moveTo(p0.sx, p0.sy);
          ctx.lineTo(p1.sx, p1.sy);
          ctx.stroke();
        }
      }

      // Draw vertices
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        if (p.sx > -500) {
          ctx.beginPath();
          const r = i === 0 ? 7 : 4.5;
          ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
          ctx.fillStyle = i === 0 ? '#ef4444' : '#60a5fa';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Vertex Label
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px monospace';
          ctx.fillText(`V${i}`, p.sx + 8, p.sy - 8);
        }
      }

      // Update Math Inspector with Vertex 0
      if (mathWorld && projected[0]) {
        const p0 = projected[0];
        mathWorld.textContent = `(${p0.orig[0]}, ${p0.orig[1]}, ${p0.orig[2]})`;
        mathRel.textContent = `ΔZ = ${p0.z.toFixed(2)}`;
        mathRot.textContent = `(${p0.x2.toFixed(2)}, ${p0.y2.toFixed(2)}, ${p0.z2.toFixed(2)})`;
        if (mode === 'perspective') {
          mathScreen.textContent = `(${Math.round(p0.sx)}, ${Math.round(p0.sy)}) [scaled by ${(fov / p0.z).toFixed(2)}]`;
        } else {
          mathScreen.textContent = `(${Math.round(p0.sx)}, ${Math.round(p0.sy)}) [parallel / no depth scaling]`;
        }
      }
    }

    [fovSlider, distSlider, yawSlider, pitchSlider, modeSelect, modelSelect].forEach(el => {
      if (el) el.addEventListener('input', renderProjection);
    });

    // Drag to orbit
    let isDragging = false;
    let lastMouseX = 0, lastMouseY = 0;
    projCanvas.addEventListener('mousedown', e => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      let yaw = (parseFloat(yawSlider.value) + dx * 0.7 + 360) % 360;
      let pitch = Math.max(-60, Math.min(60, parseFloat(pitchSlider.value) - dy * 0.5));
      yawSlider.value = String(Math.round(yaw));
      pitchSlider.value = String(Math.round(pitch));
      renderProjection();
    });

    renderProjection();
  }

  // ==========================================
  // TAB 2: WOLFENSTEIN 2D RAYCASTER
  // ==========================================
  const mapCanvas = document.getElementById('ray-map-canvas');
  const viewCanvas = document.getElementById('ray-view-canvas');

  if (mapCanvas && viewCanvas) {
    const mapCtx = mapCanvas.getContext('2d');
    const viewCtx = viewCanvas.getContext('2d');

    const fisheyeToggle = document.getElementById('ray-fisheye');
    const resSlider = document.getElementById('ray-res');
    const fovSlider = document.getElementById('ray-fov');
    const outRayRes = document.getElementById('val-ray-res');
    const outRayFov = document.getElementById('val-ray-fov');

    // 8x8 Tile Map (1 = solid wall, 0 = empty)
    const map = [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1]
    ];
    const MAP_SIZE = 8;
    const TILE_SIZE = 32;

    const player = {
      x: 2.5 * TILE_SIZE,
      y: 2.5 * TILE_SIZE,
      angle: 0.3,
      speed: 0,
      turnSpeed: 0
    };

    function castRays() {
      const mw = mapCanvas.width = 256;
      const mh = mapCanvas.height = 256;
      const vw = viewCanvas.width = 320;
      const vh = viewCanvas.height = 240;

      const numRays = parseInt(resSlider.value, 10);
      const fovDeg = parseFloat(fovSlider.value);
      const fovRad = (fovDeg * Math.PI) / 180;
      const correctFisheye = fisheyeToggle.checked;

      if (outRayRes) outRayRes.textContent = String(numRays);
      if (outRayFov) outRayFov.textContent = fovDeg + '°';

      // 1. Draw 2D Map
      mapCtx.fillStyle = '#020617';
      mapCtx.fillRect(0, 0, mw, mh);

      for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
          if (map[r][c] === 1) {
            mapCtx.fillStyle = '#334155';
            mapCtx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
          } else {
            mapCtx.fillStyle = '#0f172a';
            mapCtx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
          }
        }
      }

      // 2. Clear 3D Viewport (Sky & Floor)
      viewCtx.fillStyle = '#1e1b4b'; // ceiling
      viewCtx.fillRect(0, 0, vw, vh / 2);
      viewCtx.fillStyle = '#1e293b'; // floor
      viewCtx.fillRect(0, vh / 2, vw, vh / 2);

      const sliceWidth = vw / numRays;
      const halfFov = fovRad / 2;

      // 3. Cast Each Ray (DDA Algorithm)
      for (let i = 0; i < numRays; i++) {
        const rayAngle = player.angle - halfFov + (i / numRays) * fovRad;
        const cosA = Math.cos(rayAngle);
        const sinA = Math.sin(rayAngle);

        let distance = 0;
        let hitWall = false;
        let hitSide = 0; // 0 = horizontal wall, 1 = vertical wall

        // DDA variables
        let mapX = Math.floor(player.x / TILE_SIZE);
        let mapY = Math.floor(player.y / TILE_SIZE);

        const deltaDistX = Math.abs(1 / cosA);
        const deltaDistY = Math.abs(1 / sinA);

        let stepX, stepY, sideDistX, sideDistY;

        if (cosA < 0) {
          stepX = -1;
          sideDistX = (player.x / TILE_SIZE - mapX) * deltaDistX;
        } else {
          stepX = 1;
          sideDistX = (mapX + 1.0 - player.x / TILE_SIZE) * deltaDistX;
        }

        if (sinA < 0) {
          stepY = -1;
          sideDistY = (player.y / TILE_SIZE - mapY) * deltaDistY;
        } else {
          stepY = 1;
          sideDistY = (mapY + 1.0 - player.y / TILE_SIZE) * deltaDistY;
        }

        // Step through grid
        let steps = 0;
        while (!hitWall && steps < 20) {
          if (sideDistX < sideDistY) {
            sideDistX += deltaDistX;
            mapX += stepX;
            hitSide = 0;
          } else {
            sideDistY += deltaDistY;
            mapY += stepY;
            hitSide = 1;
          }

          if (mapX >= 0 && mapX < MAP_SIZE && mapY >= 0 && mapY < MAP_SIZE) {
            if (map[mapY][mapX] === 1) hitWall = true;
          } else {
            break;
          }
          steps++;
        }

        if (hitSide === 0) {
          distance = (mapX - player.x / TILE_SIZE + (1 - stepX) / 2) / cosA;
        } else {
          distance = (mapY - player.y / TILE_SIZE + (1 - stepY) / 2) / sinA;
        }
        distance *= TILE_SIZE;

        // Draw ray on 2D map
        const hitX = player.x + cosA * distance;
        const hitY = player.y + sinA * distance;
        mapCtx.strokeStyle = i === Math.floor(numRays / 2) ? '#fbbf24' : 'rgba(56, 189, 248, 0.25)';
        mapCtx.lineWidth = i === Math.floor(numRays / 2) ? 2 : 1;
        mapCtx.beginPath();
        mapCtx.moveTo(player.x, player.y);
        mapCtx.lineTo(hitX, hitY);
        mapCtx.stroke();

        // 4. Fisheye Correction & 3D Column Height
        let correctedDist = distance;
        if (correctFisheye) {
          correctedDist = distance * Math.cos(rayAngle - player.angle);
        }

        // Prevent division by zero
        correctedDist = Math.max(1, correctedDist);

        const distPlane = (vw / 2) / Math.tan(halfFov);
        const wallHeight = (TILE_SIZE / correctedDist) * distPlane;

        // Wall color and depth shading
        const shade = Math.max(0.2, Math.min(1.0, 1.2 - (correctedDist / 200)));
        let baseR = hitSide === 0 ? 56 : 37;
        let baseG = hitSide === 0 ? 189 : 99;
        let baseB = hitSide === 0 ? 248 : 235;

        const colorR = Math.round(baseR * shade);
        const colorG = Math.round(baseG * shade);
        const colorB = Math.round(baseB * shade);

        viewCtx.fillStyle = `rgb(${colorR}, ${colorG}, ${colorB})`;
        viewCtx.fillRect(
          i * sliceWidth,
          (vh - wallHeight) / 2,
          sliceWidth + 0.5,
          wallHeight
        );
      }

      // Draw Player on 2D map
      mapCtx.fillStyle = '#ef4444';
      mapCtx.beginPath();
      mapCtx.arc(player.x, player.y, 5, 0, Math.PI * 2);
      mapCtx.fill();

      // Heading indicator
      mapCtx.strokeStyle = '#ef4444';
      mapCtx.lineWidth = 2;
      mapCtx.beginPath();
      mapCtx.moveTo(player.x, player.y);
      mapCtx.lineTo(player.x + Math.cos(player.angle) * 14, player.y + Math.sin(player.angle) * 14);
      mapCtx.stroke();
    }

    // Keyboard & On-Screen Controls
    const keys = {};
    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
        keys[e.code] = true;
      }
    });
    window.addEventListener('keyup', e => {
      delete keys[e.code];
    });

    document.querySelectorAll('[data-ray-move]').forEach(btn => {
      const dir = btn.dataset.rayMove;
      const start = () => {
        if (dir === 'forward') player.speed = 2.0;
        if (dir === 'backward') player.speed = -2.0;
        if (dir === 'left') player.turnSpeed = -0.06;
        if (dir === 'right') player.turnSpeed = 0.06;
      };
      const stop = () => {
        player.speed = 0;
        player.turnSpeed = 0;
      };
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', stop);
      btn.addEventListener('mouseleave', stop);
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); start(); });
      btn.addEventListener('touchend', stop);
    });

    function updateRayMovement() {
      let speed = player.speed;
      let turnSpeed = player.turnSpeed;

      if (keys['KeyW'] || keys['ArrowUp']) speed = 2.0;
      if (keys['KeyS'] || keys['ArrowDown']) speed = -2.0;
      if (keys['KeyA'] || keys['ArrowLeft']) turnSpeed = -0.06;
      if (keys['KeyD'] || keys['ArrowRight']) turnSpeed = 0.06;

      player.angle += turnSpeed;

      if (speed !== 0) {
        const nx = player.x + Math.cos(player.angle) * speed;
        const ny = player.y + Math.sin(player.angle) * speed;

        const cellX = Math.floor(nx / TILE_SIZE);
        const cellY = Math.floor(ny / TILE_SIZE);

        if (map[cellY] && map[cellY][cellX] === 0) {
          player.x = nx;
          player.y = ny;
        }
      }

      castRays();
      requestAnimationFrame(updateRayMovement);
    }

    [fisheyeToggle, resSlider, fovSlider].forEach(el => {
      if (el) el.addEventListener('input', castRays);
    });

    // Map click to position player
    mapCanvas.addEventListener('click', e => {
      const rect = mapCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const cx = Math.floor(clickX / TILE_SIZE);
      const cy = Math.floor(clickY / TILE_SIZE);
      if (map[cy] && map[cy][cx] === 0) {
        player.x = clickX;
        player.y = clickY;
        castRays();
      }
    });

    castRays();
    requestAnimationFrame(updateRayMovement);
  }

  // ==========================================
  // TAB 3: MODE 7 PERSPECTIVE GROUND
  // ==========================================
  const mode7Canvas = document.getElementById('mode7-canvas');
  if (mode7Canvas) {
    const ctx = mode7Canvas.getContext('2d');
    const heightSlider = document.getElementById('m7-height');
    const horizonSlider = document.getElementById('m7-horizon');
    const speedSlider = document.getElementById('m7-speed');
    const headingSlider = document.getElementById('m7-heading');

    let posX = 0;
    let posY = 0;
    let heading = 0;

    function renderMode7() {
      const w = mode7Canvas.width = 360;
      const h = mode7Canvas.height = 240;

      const camHeight = parseFloat(heightSlider.value);
      const horizonY = parseFloat(horizonSlider.value);
      const speed = parseFloat(speedSlider.value) * 0.04;
      heading = (parseFloat(headingSlider.value) * Math.PI) / 180;

      // Advance position
      posX += Math.cos(heading) * speed;
      posY += Math.sin(heading) * speed;

      // Draw Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#1e1b4b');
      skyGrad.addColorStop(1, '#4338ca');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizonY);

      // Horizontal scanlines for ground plane
      const imgData = ctx.createImageData(w, h - horizonY);
      const data = imgData.data;

      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
      const fovFactor = 1.0;

      for (let y = horizonY; y < h; y++) {
        const scanDist = (camHeight * 80) / (y - horizonY + 0.1);
        const rowIdx = (y - horizonY) * w * 4;

        for (let x = 0; x < w; x++) {
          const normX = (x - w / 2) / (w / 2);

          // World space coordinate for this pixel
          const rx = normX * scanDist * fovFactor;
          const rz = scanDist;

          // Rotate by camera heading
          const worldU = posX + (rx * sinH + rz * cosH);
          const worldV = posY + (-rx * cosH + rz * sinH);

          // Checkerboard texture logic
          const checkU = Math.floor(worldU * 0.15);
          const checkV = Math.floor(worldV * 0.15);
          const isCheck = (checkU + checkV) % 2 === 0;

          // Fog shading based on distance
          const fog = Math.max(0.15, Math.min(1.0, 1.2 - scanDist * 0.007));

          let r = isCheck ? 139 : 79;
          let g = isCheck ? 92 : 70;
          let b = isCheck ? 246 : 229;

          // Add road strip in center
          if (Math.abs(worldU % 40) < 4) {
            r = 251; g = 191; b = 36;
          }

          const pixelIdx = rowIdx + x * 4;
          data[pixelIdx] = Math.round(r * fog);
          data[pixelIdx + 1] = Math.round(g * fog);
          data[pixelIdx + 2] = Math.round(b * fog);
          data[pixelIdx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, horizonY);

      // Red horizon divider
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.stroke();

      requestAnimationFrame(renderMode7);
    }

    [heightSlider, horizonSlider, speedSlider, headingSlider].forEach(el => {
      if (el) el.addEventListener('input', () => {});
    });

    renderMode7();
  }

  // ==========================================
  // TAB 4: SOFTWARE RAYTRACER
  // ==========================================
  const rtCanvas = document.getElementById('rt-canvas');
  if (rtCanvas) {
    const ctx = rtCanvas.getContext('2d');
    const lightSlider = document.getElementById('rt-light');
    const reflSlider = document.getElementById('rt-refl');
    const resSelect = document.getElementById('rt-res');

    function renderRaytracer() {
      const res = parseInt(resSelect.value, 10);
      const w = res;
      const h = Math.round(res * 0.75);

      rtCanvas.width = w;
      rtCanvas.height = h;

      const lightX = parseFloat(lightSlider.value);
      const reflectivity = parseFloat(reflSlider.value) / 100;

      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;

      // Sphere: center at (0, 0, 3.5), radius 1.2
      const sphere = { cx: 0, cy: 0, cz: 3.5, r: 1.15 };
      const light = { x: lightX, y: 3.0, z: 1.0 };

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          // Normalize screen coordinates (-1 to 1)
          const u = ((x / w) * 2 - 1) * (w / h);
          const v = -( (y / h) * 2 - 1 );

          // Ray Direction (Camera at 0, 0, 0 looking +Z)
          let dx = u;
          let dy = v;
          let dz = 1.8;
          const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
          dx /= mag; dy /= mag; dz /= mag;

          // Ray-Sphere Intersection
          const ocX = -sphere.cx;
          const ocY = -sphere.cy;
          const ocZ = -sphere.cz;

          const b = 2 * (dx * ocX + dy * ocY + dz * ocZ);
          const c = (ocX * ocX + ocY * ocY + ocZ * ocZ) - (sphere.r * sphere.r);
          const disc = b * b - 4 * c;

          let r = 15, g = 23, bCol = 42; // default background

          // Ground plane check (y = -1.2)
          let groundHitT = -1;
          if (dy < -0.01) {
            const t = (-1.2) / dy;
            if (t > 0) groundHitT = t;
          }

          let hitSphere = false;
          let hitT = 9999;

          if (disc > 0) {
            const t0 = (-b - Math.sqrt(disc)) / 2;
            if (t0 > 0.1) {
              hitSphere = true;
              hitT = t0;
            }
          }

          if (hitSphere && (groundHitT < 0 || hitT < groundHitT)) {
            // SPHERE HIT
            const px = dx * hitT;
            const py = dy * hitT;
            const pz = dz * hitT;

            // Normal
            let nx = (px - sphere.cx) / sphere.r;
            let ny = (py - sphere.cy) / sphere.r;
            let nz = (pz - sphere.cz) / sphere.r;

            // Shadow Ray toward light
            let lx = light.x - px;
            let ly = light.y - py;
            let lz = light.z - pz;
            const ldist = Math.sqrt(lx * lx + ly * ly + lz * lz);
            lx /= ldist; ly /= ldist; lz /= ldist;

            // Diffuse Lighting (Lambertian)
            const dot = Math.max(0, nx * lx + ny * ly + nz * lz);
            let baseR = 56, baseG = 189, baseB = 248;

            // Specular reflection bounce
            const reflDot = 2 * (dx * nx + dy * ny + dz * nz);
            const rx = dx - reflDot * nx;
            const ry = dy - reflDot * ny;
            const rz = dz - reflDot * nz;

            let reflR = 15, reflG = 23, reflB = 42;
            // Does reflection ray hit floor?
            if (ry < -0.01) {
              const floorT = (-1.2 - py) / ry;
              if (floorT > 0) {
                const fx = px + rx * floorT;
                const fz = pz + rz * floorT;
                const isCheck = (Math.floor(fx * 1.5) + Math.floor(fz * 1.5)) % 2 === 0;
                reflR = isCheck ? 180 : 70;
                reflG = isCheck ? 180 : 70;
                reflB = isCheck ? 180 : 70;
              }
            }

            r = Math.round(baseR * (0.15 + 0.85 * dot) * (1 - reflectivity) + reflR * reflectivity);
            g = Math.round(baseG * (0.15 + 0.85 * dot) * (1 - reflectivity) + reflG * reflectivity);
            bCol = Math.round(baseB * (0.15 + 0.85 * dot) * (1 - reflectivity) + reflB * reflectivity);

          } else if (groundHitT > 0) {
            // FLOOR HIT
            const px = dx * groundHitT;
            const py = -1.2;
            const pz = dz * groundHitT;

            // Shadow Ray from floor to light
            let lx = light.x - px;
            let ly = light.y - py;
            let lz = light.z - pz;
            const ldist = Math.sqrt(lx * lx + ly * ly + lz * lz);
            lx /= ldist; ly /= ldist; lz /= ldist;

            // Test if sphere blocks light to floor
            const sOcX = px - sphere.cx;
            const sOcY = py - sphere.cy;
            const sOcZ = pz - sphere.cz;
            const sB = 2 * (lx * sOcX + ly * sOcY + lz * sOcZ);
            const sC = (sOcX * sOcX + sOcY * sOcY + sOcZ * sOcZ) - (sphere.r * sphere.r);
            const sDisc = sB * sB - 4 * sC;

            let inShadow = false;
            if (sDisc > 0) {
              const st = (-sB - Math.sqrt(sDisc)) / 2;
              if (st > 0.1 && st < ldist) inShadow = true;
            }

            const isCheck = (Math.floor(px * 1.2) + Math.floor(pz * 1.2)) % 2 === 0;
            let floorTone = isCheck ? 160 : 70;
            if (inShadow) floorTone *= 0.3; // Hard cast shadow

            r = floorTone;
            g = floorTone;
            bCol = Math.round(floorTone * 1.15);
          }

          const idx = (y * w + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = bCol;
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
    }

    [lightSlider, reflSlider, resSelect].forEach(el => {
      if (el) el.addEventListener('input', renderRaytracer);
    });

    renderRaytracer();
  }

  // ==========================================
  // PRACTICE QUIZ ENGINE
  // ==========================================
  const quizContainers = document.querySelectorAll('[data-3d-quiz]');
  quizContainers.forEach(quiz => {
    const scriptTag = quiz.querySelector('script[type="application/json"]');
    if (!scriptTag) return;
    const questions = JSON.parse(scriptTag.textContent);
    let currentIndex = 0;
    let score = 0;

    const qPrompt = quiz.querySelector('.quiz-prompt');
    const qOpts = quiz.querySelector('.quiz-options');
    const qFeedback = quiz.querySelector('.quiz-feedback');
    const qScore = quiz.querySelector('.quiz-score');
    const nextBtn = quiz.querySelector('.quiz-next');

    function showQuestion(idx) {
      if (idx >= questions.length) {
        qPrompt.textContent = 'Quiz Complete!';
        qOpts.innerHTML = '';
        qFeedback.textContent = `You scored ${score} out of ${questions.length}. Great grasp of 3D fundamentals!`;
        qScore.textContent = '';
        nextBtn.hidden = true;
        return;
      }

      const q = questions[idx];
      qPrompt.textContent = `${idx + 1}. ${q.prompt}`;
      qOpts.innerHTML = '';
      qFeedback.textContent = '';
      nextBtn.hidden = true;

      q.opts.forEach((optText, oIdx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-opt-btn';
        btn.textContent = optText;
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          const allBtns = qOpts.querySelectorAll('button');
          allBtns.forEach(b => b.disabled = true);

          const isCorrect = oIdx === q.answer;
          if (isCorrect) {
            btn.classList.add('correct');
            qFeedback.textContent = '✓ Correct! ' + q.why;
            score++;
          } else {
            btn.classList.add('wrong');
            allBtns[q.answer].classList.add('correct');
            qFeedback.textContent = '✗ ' + q.why;
          }
          qScore.textContent = `Score: ${score} / ${idx + 1}`;
          nextBtn.hidden = false;
        });
        qOpts.appendChild(btn);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentIndex++;
        showQuestion(currentIndex);
      });
    }

    showQuestion(0);
  });

})();
