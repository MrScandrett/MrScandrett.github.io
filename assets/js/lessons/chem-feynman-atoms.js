/* ─────────────────────────────────────────────────────────
   SHARED UTILITIES
───────────────────────────────────────────────────────── */
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ─────────────────────────────────────────────────────────
   SIM 1 · ATOM MODEL
───────────────────────────────────────────────────────── */
(function () {
  const cv = document.getElementById('atomCanvas');
  const ctx = cv.getContext('2d');
  const protonSlider = document.getElementById('protonSlider');
  const speedSlider = document.getElementById('atomSpeed');
  const elementName = document.getElementById('elementName');
  const electronCount = document.getElementById('electronCount');
  const shellCount = document.getElementById('shellCount');
  const protonLabel = document.getElementById('protonLabel');

  const ELEMENTS = ['H','He','Li','Be','B','C','N','O','F','Ne',
                    'Na','Mg','Al','Si','P','S','Cl','Ar'];
  const ENAMES = ['Hydrogen','Helium','Lithium','Beryllium','Boron','Carbon',
                  'Nitrogen','Oxygen','Fluorine','Neon','Sodium','Magnesium',
                  'Aluminum','Silicon','Phosphorus','Sulfur','Chlorine','Argon'];
  const SHELL_CAP = [2, 8, 8];

  let electrons = [];
  let t = 0;

  function buildElectrons(protons) {
    electrons = [];
    let remaining = protons;
    for (let s = 0; s < SHELL_CAP.length && remaining > 0; s++) {
      const count = Math.min(remaining, SHELL_CAP[s]);
      const r = 55 + s * 38;
      for (let e = 0; e < count; e++) {
        electrons.push({
          shell: s,
          radius: r,
          angleOffset: (e / count) * Math.PI * 2,
          speed: 0.8 / (s + 1),
          color: ['#67e8f9','#a78bfa','#34d399'][s]
        });
      }
      remaining -= count;
    }
  }

  function resize() {
    const w = cv.parentElement.clientWidth;
    cv.width = w; cv.height = 320;
  }

  function draw() {
    const protons = Number(protonSlider.value);
    const speed = Number(speedSlider.value);
    t += 0.016 * speed;

    ctx.clearRect(0, 0, cv.width, cv.height);
    const cx = cv.width / 2, cy = cv.height / 2;

    // Glow bg
    const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, 120);
    grd.addColorStop(0, 'rgba(124,58,237,0.12)');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, cv.width, cv.height);

    // Shell rings
    const shells = [...new Set(electrons.map(e => e.shell))];
    shells.forEach(s => {
      ctx.beginPath();
      ctx.arc(cx, cy, 55 + s * 38, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke();
      ctx.setLineDash([]);
    });

    // Nucleus
    const nucleusR = 14 + protons * 0.6;
    const nGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusR);
    nGrd.addColorStop(0, '#fde68a'); nGrd.addColorStop(0.5, '#f59e0b');
    nGrd.addColorStop(1, '#d97706');
    ctx.beginPath(); ctx.arc(cx, cy, nucleusR, 0, Math.PI * 2);
    ctx.fillStyle = nGrd; ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.font = `bold ${Math.max(9, nucleusR * 0.6)}px Inter,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ELEMENTS[protons - 1], cx, cy);

    // Electrons
    electrons.forEach(e => {
      const angle = t * e.speed + e.angleOffset;
      const ex = cx + Math.cos(angle) * e.radius;
      const ey = cy + Math.sin(angle) * e.radius;
      // Trail
      ctx.beginPath();
      ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fillStyle = e.color + 'cc';
      ctx.fill();
      // Glow
      const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 10);
      eg.addColorStop(0, e.color + '60'); eg.addColorStop(1, 'transparent');
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.arc(ex, ey, 10, 0, Math.PI * 2); ctx.fill();
    });

    // Update labels
    protonLabel.textContent = protons;
    elementName.textContent = ENAMES[protons - 1];
    electronCount.textContent = protons;
    shellCount.textContent = shells.length;

    simRaf(draw);
  }

  protonSlider.addEventListener('input', () => buildElectrons(Number(protonSlider.value)));
  window.addEventListener('resize', () => { resize(); buildElectrons(Number(protonSlider.value)); });
  resize();
  buildElectrons(6);
  draw();
})();

/* ─────────────────────────────────────────────────────────
   SIM 2 · STATES OF MATTER
───────────────────────────────────────────────────────── */
(function () {
  const cv = document.getElementById('statesCanvas');
  const ctx = cv.getContext('2d');
  const tempSlider = document.getElementById('tempSlider');
  const tempLabel = document.getElementById('tempLabel');
  const stateName = document.getElementById('stateName');
  const avgSpeedEl = document.getElementById('avgSpeed');
  const pressureEl = document.getElementById('pressure');

  const N = 64;
  let particles = [];

  function initParticles(W, H) {
    particles = [];
    const cols = 8, rows = 8;
    for (let i = 0; i < N; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      particles.push({
        x: 40 + col * ((W - 80) / cols),
        y: 40 + row * ((H - 80) / rows),
        vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5),
        hue: 180 + rand(-30, 30)
      });
    }
  }

  function resize() {
    const w = cv.parentElement.clientWidth;
    cv.width = w; cv.height = 280;
    initParticles(w, 280);
  }

  let wallHits = 0, hitsAccum = 0, lastHitReset = Date.now();

  function draw() {
    const temp = Number(tempSlider.value) / 100;
    const W = cv.width, H = cv.height;
    const maxSpeed = temp * 4.5 + 0.1;

    let state, stateColor;
    if (temp < 0.3) { state = 'Solid'; stateColor = '#67e8f9'; }
    else if (temp < 0.65) { state = 'Liquid'; stateColor = '#a78bfa'; }
    else { state = 'Gas'; stateColor = '#34d399'; }

    ctx.clearRect(0, 0, W, H);
    const bgGrd = ctx.createLinearGradient(0,0,0,H);
    bgGrd.addColorStop(0,'rgba(12,20,40,0.95)'); bgGrd.addColorStop(1,'rgba(4,8,20,0.98)');
    ctx.fillStyle = bgGrd; ctx.fillRect(0,0,W,H);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    // Update particles
    let totalSpeed = 0;
    particles.forEach(p => {
      if (state === 'Solid') {
        p.vx += rand(-0.3, 0.3) * temp * 0.5;
        p.vy += rand(-0.3, 0.3) * temp * 0.5;
        p.vx *= 0.85; p.vy *= 0.85;
      } else if (state === 'Liquid') {
        p.vx += rand(-0.5, 0.5) * temp;
        p.vy += rand(-0.5, 0.5) * temp;
        const spd = Math.hypot(p.vx, p.vy);
        if (spd > maxSpeed) { p.vx *= maxSpeed / spd; p.vy *= maxSpeed / spd; }
        // Cohesion
        const centerX = W / 2, centerY = H / 2;
        const dx = centerX - p.x, dy = centerY - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 80) { p.vx += dx / dist * 0.08; p.vy += dy / dist * 0.08; }
      } else {
        const spd = Math.hypot(p.vx, p.vy);
        if (spd < 0.5) { p.vx = rand(-1,1); p.vy = rand(-1,1); }
        if (spd > maxSpeed) { p.vx *= maxSpeed / spd; p.vy *= maxSpeed / spd; }
        if (spd < maxSpeed * 0.5) { p.vx *= 1.05; p.vy *= 1.05; }
      }

      p.x += p.vx; p.y += p.vy;

      if (p.x < 14) { p.x = 14; p.vx = Math.abs(p.vx); hitsAccum++; }
      if (p.x > W - 14) { p.x = W - 14; p.vx = -Math.abs(p.vx); hitsAccum++; }
      if (p.y < 14) { p.y = 14; p.vy = Math.abs(p.vy); }
      if (p.y > H - 14) { p.y = H - 14; p.vy = -Math.abs(p.vy); }

      totalSpeed += Math.hypot(p.vx, p.vy);

      // Draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},80%,70%,0.88)`;
      ctx.fill();
    });

    const now = Date.now();
    if (now - lastHitReset > 500) {
      wallHits = hitsAccum * 2; hitsAccum = 0; lastHitReset = now;
    }

    tempLabel.textContent = Math.round(temp * 100) + '%';
    stateName.textContent = state;
    stateName.style.color = stateColor;
    avgSpeedEl.textContent = (totalSpeed / N).toFixed(2) + ' u/s';
    pressureEl.textContent = wallHits + ' hits/s';

    simRaf(draw);
  }

  window.addEventListener('resize', resize);
  resize(); draw();
})();

/* ─────────────────────────────────────────────────────────
   SIM 3 · ENERGY TRANSFORMER (Bouncing Ball)
───────────────────────────────────────────────────────── */
(function () {
  const cv = document.getElementById('energyCanvas');
  const ctx = cv.getContext('2d');
  const dropBtn = document.getElementById('dropBtn');
  const elastSlider = document.getElementById('elasticitySlider');
  const elasLabel = document.getElementById('elasLabel');
  const eKE = document.getElementById('eKE');
  const ePE = document.getElementById('ePE');
  const eHeat = document.getElementById('eHeat');
  const eTotal = document.getElementById('eTotal');

  let ball = { x: 0, y: 0, vy: 0, r: 16 };
  let dropped = false;
  let heatLost = 0;
  let totalEnergy = 100;

  function resize() {
    const w = cv.parentElement.clientWidth;
    cv.width = w; cv.height = 260;
    ball.x = w * 0.38; ball.y = 30; ball.vy = 0;
  }

  function reset() {
    ball.y = 30; ball.vy = 0; dropped = false; heatLost = 0;
    eKE.textContent = '100%'; ePE.textContent = '0%';
    eHeat.textContent = '0%'; eTotal.textContent = '100%';
  }

  dropBtn.addEventListener('click', () => { dropped = true; });
  elastSlider.addEventListener('input', () => {
    elasLabel.textContent = elastSlider.value + '%';
    reset();
  });

  const GRAVITY = 0.35;

  function draw() {
    const W = cv.width, H = cv.height;
    const floor = H - 24;
    const maxH = floor - 30 - ball.r;
    const elast = Number(elastSlider.value) / 100;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#030912'; ctx.fillRect(0, 0, W, H);

    if (dropped) {
      ball.vy += GRAVITY;
      ball.y += ball.vy;
      if (ball.y + ball.r >= floor) {
        ball.y = floor - ball.r;
        const before = 0.5 * ball.vy * ball.vy;
        ball.vy = -Math.abs(ball.vy) * elast;
        const after = 0.5 * ball.vy * ball.vy;
        heatLost += (before - after) / (maxH * GRAVITY * 2);
        heatLost = clamp(heatLost, 0, 1);
        if (Math.abs(ball.vy) < 0.5) { dropped = false; ball.vy = 0; }
      }
    }

    const heightFrac = clamp((floor - ball.r - ball.y) / maxH, 0, 1);
    const speedFrac = dropped ? clamp(Math.abs(ball.vy) / 12, 0, 1) : 0;
    const ke = Math.round(speedFrac * 100 * (1 - heatLost));
    const pe = Math.round(heightFrac * 100 * (1 - heatLost));
    const heat = Math.round(heatLost * 100);
    const total = clamp(pe + ke + heat, 0, 100);

    // Energy bar track (right side)
    const barX = W * 0.65, barW = W * 0.3, barY = 20, barH = H - 44;

    function drawBar(x, y, w, h, frac, label, color) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); roundRect(ctx, x, y, w, h, 6); ctx.fill();
      const fillH = h * frac;
      ctx.fillStyle = color;
      ctx.beginPath(); roundRect(ctx, x, y + h - fillH, w, fillH, 6); ctx.fill();
      ctx.fillStyle = 'rgba(224,234,248,0.55)'; ctx.font = '10px Inter,sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(label, x + w / 2, y + h + 14);
    }

    const bW = barW / 3 - 6;
    drawBar(barX,           barY, bW, barH, pe / 100,   'PE',   'rgba(124,58,237,0.8)');
    drawBar(barX + bW + 6,  barY, bW, barH, ke / 100,   'KE',   'rgba(6,182,212,0.8)');
    drawBar(barX + bW * 2 + 12, barY, bW, barH, heat/100,'Heat','rgba(251,113,133,0.7)');

    // Floor
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, floor, W * 0.62, 2);

    // Ball
    const ballGrd = ctx.createRadialGradient(ball.x - 4, ball.y - 4, 2, ball.x, ball.y, ball.r);
    ballGrd.addColorStop(0, '#a78bfa'); ballGrd.addColorStop(1, '#4f46e5');
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = ballGrd; ctx.fill();

    // Height indicator
    if (!dropped || ball.vy < 0) {
      ctx.beginPath(); ctx.setLineDash([3,3]);
      ctx.moveTo(ball.x + ball.r + 4, ball.y);
      ctx.lineTo(ball.x + ball.r + 4, floor);
      ctx.strokeStyle = 'rgba(124,58,237,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([]);
    }

    eKE.textContent = pe + '%';
    ePE.textContent = ke + '%';
    eHeat.textContent = heat + '%';
    eTotal.textContent = total + '%';

    simRaf(draw);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }

  window.addEventListener('resize', () => { resize(); reset(); });
  resize(); draw();
})();

/* ─────────────────────────────────────────────────────────
   SIM 4a · ORBITAL MECHANICS
───────────────────────────────────────────────────────── */
(function () {
  const cv = document.getElementById('orbitCanvas');
  const ctx = cv.getContext('2d');
  const massSlider = document.getElementById('massSlider');
  const velSlider = document.getElementById('velSlider');
  const massLabel = document.getElementById('massLabel');
  const velLabel = document.getElementById('velLabel');
  const resetBtn = document.getElementById('resetOrbit');

  let planet, trail = [];

  function resize() { cv.width = cv.parentElement.clientWidth; cv.height = 300; }

  function resetPlanet() {
    const W = cv.width, H = cv.height;
    const cx = W / 2, cy = H / 2;
    const vel = Number(velSlider.value);
    const r0 = 90;
    planet = { x: cx + r0, y: cy, vx: 0, vy: -vel * 2.2 };
    trail = [];
  }

  const G = 5000;
  function step() {
    const W = cv.width, H = cv.height;
    const cx = W / 2, cy = H / 2;
    const mass = Number(massSlider.value);
    const dx = cx - planet.x, dy = cy - planet.y;
    const dist2 = dx * dx + dy * dy;
    const dist = Math.sqrt(dist2);
    const force = G * mass / dist2;
    planet.vx += (dx / dist) * force * 0.016;
    planet.vy += (dy / dist) * force * 0.016;
    planet.x += planet.vx * 0.016 * 60;
    planet.y += planet.vy * 0.016 * 60;
    trail.push({ x: planet.x, y: planet.y });
    if (trail.length > 300) trail.shift();
    if (dist > 500 || dist < 10) resetPlanet();
  }

  function draw() {
    const W = cv.width, H = cv.height;
    ctx.fillStyle = '#030912'; ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137.5 * W) % W, sy = (i * 97.3 * H) % H;
      ctx.beginPath(); ctx.arc(sx % W, sy % H, 0.8, 0, Math.PI * 2); ctx.fill();
    }

    const mass = Number(massSlider.value);
    const vel = Number(velSlider.value);
    massLabel.textContent = mass.toFixed(1) + '×';
    velLabel.textContent = vel.toFixed(2) + '×';

    const cx = W / 2, cy = H / 2;
    // Star
    const starR = 12 + mass * 4;
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, starR);
    sg.addColorStop(0, '#fde68a'); sg.addColorStop(0.6, '#f59e0b'); sg.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.beginPath(); ctx.arc(cx, cy, starR, 0, Math.PI * 2);
    ctx.fillStyle = sg; ctx.fill();

    // Trail
    if (trail.length > 2) {
      ctx.beginPath(); ctx.moveTo(trail[0].x, trail[0].y);
      trail.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = 'rgba(167,139,250,0.35)'; ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Planet
    for (let s = 0; s < 4; s++) step();
    const pg = ctx.createRadialGradient(planet.x - 2, planet.y - 2, 0, planet.x, planet.y, 8);
    pg.addColorStop(0, '#67e8f9'); pg.addColorStop(1, '#0891b2');
    ctx.beginPath(); ctx.arc(planet.x, planet.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = pg; ctx.fill();

    simRaf(draw);
  }

  resetBtn.addEventListener('click', resetPlanet);
  massSlider.addEventListener('input', resetPlanet);
  velSlider.addEventListener('input', resetPlanet);
  window.addEventListener('resize', () => { resize(); resetPlanet(); });
  resize(); resetPlanet(); draw();
})();

/* ─────────────────────────────────────────────────────────
   SIM 4b · BOHR ATOM
───────────────────────────────────────────────────────── */
(function () {
  const cv = document.getElementById('bohrCanvas');
  const ctx = cv.getContext('2d');
  const slider = document.getElementById('bohrSlider');
  const labelEl = document.getElementById('bohrLabel');
  const radEl = document.getElementById('bohrRadius');
  const enEl = document.getElementById('bohrEnergy');

  let t = 0;
  function resize() { cv.width = cv.parentElement.clientWidth; cv.height = 300; }

  function draw() {
    const n = Number(slider.value);
    const r = n * n;
    const energy = (-13.6 / (n * n)).toFixed(2);
    labelEl.textContent = n; radEl.textContent = r; enEl.textContent = energy + ' eV';

    const W = cv.width, H = cv.height;
    ctx.fillStyle = '#030912'; ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * 0.38 / (n * n);

    // All shells 1..n
    for (let s = 1; s <= n; s++) {
      const sr = s * s * scale;
      ctx.beginPath(); ctx.arc(cx, cy, sr, 0, Math.PI * 2);
      ctx.strokeStyle = s === n ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)';
      ctx.lineWidth = s === n ? 1.5 : 1;
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
    }

    // Nucleus (proton)
    const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
    pg.addColorStop(0, '#fde68a'); pg.addColorStop(1, '#d97706');
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill();
    ctx.fillStyle = '#1c1917'; ctx.font = 'bold 10px Inter,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('p+', cx, cy);

    // Electron on shell n
    const orbR = r * scale;
    const spd = 1.2 / (n * n);
    t += 0.016 * 40 * spd;
    const ex = cx + Math.cos(t) * orbR, ey = cy + Math.sin(t) * orbR;

    // Electron glow
    const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 12);
    eg.addColorStop(0, 'rgba(103,232,249,0.7)'); eg.addColorStop(1, 'transparent');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#67e8f9'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 7px Inter,sans-serif';
    ctx.fillText('e⁻', ex, ey);

    // n label
    ctx.fillStyle = 'rgba(167,139,250,0.8)'; ctx.font = 'bold 12px Inter,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`n = ${n}   r = ${r}a₀`, 12, 22);
    ctx.fillText(`E = ${energy} eV`, 12, 40);

    simRaf(draw);
  }

  window.addEventListener('resize', resize);
  resize(); draw();
})();

/* ─────────────────────────────────────────────────────────
   SIM 5 · GAS MOLECULE STATISTICS
───────────────────────────────────────────────────────── */
(function () {
  const cv = document.getElementById('gasCanvas');
  const ctx = cv.getContext('2d');
  const tempSlider = document.getElementById('gasTempSlider');
  const countSlider = document.getElementById('gasCountSlider');
  const gasTempEl = document.getElementById('gasTemp');
  const gasCountEl = document.getElementById('gasCount');
  const gasAvgEl = document.getElementById('gasAvgSpd');
  const gasHitsEl = document.getElementById('gasHits');
  const gasPressEl = document.getElementById('gasPressure');

  let molecules = [];
  let hitCount = 0, hitAccum = 0, lastHit = Date.now();

  function resize() { cv.width = cv.parentElement.clientWidth; cv.height = 300; }

  function maxwellSpeed(temp) {
    const u1 = Math.random(), u2 = Math.random(), u3 = Math.random();
    const v = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.abs(v) * Math.sqrt(temp / 100) * 2.5 + 0.3;
  }

  function buildMolecules(N, temp) {
    const W = cv.width, H = cv.height;
    molecules = [];
    for (let i = 0; i < N; i++) {
      const spd = maxwellSpeed(temp);
      const angle = Math.random() * Math.PI * 2;
      molecules.push({
        x: rand(14, W - 14), y: rand(14, H - 54),
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        hue: 180 + rand(-60, 80)
      });
    }
  }

  function draw() {
    const temp = Number(tempSlider.value);
    const N = Number(countSlider.value);
    gasTempEl.textContent = temp + ' K';
    gasCountEl.textContent = N;

    if (molecules.length !== N) buildMolecules(N, temp);

    const W = cv.width, H = cv.height;
    const boxH = H - 50;
    ctx.fillStyle = '#030912'; ctx.fillRect(0, 0, W, H);

    // Box
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(8, 8, W - 16, boxH - 8);

    let totalSpd = 0;
    const speeds = [];

    molecules.forEach(m => {
      const targetSpd = maxwellSpeed(temp);
      const curSpd = Math.hypot(m.vx, m.vy);
      const scale = lerp(curSpd, targetSpd, 0.005) / Math.max(curSpd, 0.01);
      m.vx *= scale; m.vy *= scale;

      m.x += m.vx; m.y += m.vy;
      let hit = false;
      if (m.x < 12) { m.x = 12; m.vx = Math.abs(m.vx); hit = true; }
      if (m.x > W - 12) { m.x = W - 12; m.vx = -Math.abs(m.vx); hit = true; }
      if (m.y < 12) { m.y = 12; m.vy = Math.abs(m.vy); }
      if (m.y > boxH - 12) { m.y = boxH - 12; m.vy = -Math.abs(m.vy); }
      if (hit) hitAccum++;

      const spd = Math.hypot(m.vx, m.vy);
      totalSpd += spd;
      speeds.push(spd);

      ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${m.hue},80%,70%,0.9)`; ctx.fill();
    });

    const now = Date.now();
    if (now - lastHit > 400) {
      hitCount = Math.round(hitAccum * 2.5); hitAccum = 0; lastHit = now;
    }

    // Histogram
    const avgSpd = totalSpd / N;
    const bins = 12; const binW = (W - 20) / bins;
    const maxSpd = 10;
    const counts = new Array(bins).fill(0);
    speeds.forEach(s => { const b = clamp(Math.floor(s / maxSpd * bins), 0, bins - 1); counts[b]++; });
    const maxCount = Math.max(...counts, 1);

    const histY = boxH + 4, histH = 36;
    counts.forEach((c, i) => {
      const fillH = (c / maxCount) * histH;
      const alpha = 0.35 + (i / bins) * 0.5;
      ctx.fillStyle = `rgba(124,58,237,${alpha})`;
      ctx.fillRect(10 + i * binW, histY + histH - fillH, binW - 2, fillH);
    });
    ctx.fillStyle = 'rgba(224,234,248,0.35)'; ctx.font = '9px Inter,sans-serif';
    ctx.textAlign = 'left'; ctx.fillText('Speed distribution →', 10, histY - 2);

    gasAvgEl.textContent = avgSpd.toFixed(2) + ' u/s';
    gasHitsEl.textContent = hitCount;
    gasPressEl.textContent = (hitCount * avgSpd * 0.01).toFixed(1) + ' Pa';

    simRaf(draw);
  }

  window.addEventListener('resize', () => { resize(); molecules = []; });
  tempSlider.addEventListener('input', () => { molecules = []; });
  countSlider.addEventListener('input', () => { molecules = []; });
  resize(); draw();
})();

/* ─────────────────────────────────────────────────────────
   FEYNMAN STEPS INTERACTIVE
───────────────────────────────────────────────────────── */
(function () {
  const steps = document.querySelectorAll('.feynman-step-card');
  const detail = document.getElementById('feynmanDetail');
  const details = [
    `<strong>Step 1: Guess (Form a Hypothesis)</strong><br><br>
    Feynman called this a "guess" deliberately — to cut through the pretense that scientists arrive
    at ideas through pure logic. Every scientific theory begins with imagination. Einstein imagined
    riding a beam of light. Darwin imagined a common ancestor. Newton guessed that the force pulling
    an apple also holds the moon. The guess has to be specific enough that you can test it. A guess
    that can explain anything explains nothing.`,

    `<strong>Step 2: Compute the Consequences</strong><br><br>
    Once you have a hypothesis, you ask: if this were true, what would we observe? You use mathematics
    to follow the logic of your guess all the way to predictions. "If atoms repel when compressed and
    attract when stretched, then gases under pressure should behave like this, and liquids should have
    surface tension like that." The math is not the guess — it's what your guess implies.`,

    `<strong>Step 3: Compare with Experiment</strong><br><br>
    This is where imagination meets reality. You run an experiment or make an observation, and you
    check: does the world behave the way your guess predicted? Not approximately — precisely. This is
    why measurement matters. "Nature cannot be fooled," as Feynman said after the Challenger disaster.
    The experiment is the final judge, not the scientist, not the institution, not the textbook.`,

    `<strong>Step 4: If Wrong — Discard</strong><br><br>
    This is the most important step and the one most people find hardest. If your beautiful, elegant,
    logically perfect theory disagrees with experiment — it's wrong. Period. Not "probably wrong" or
    "wrong in edge cases." Wrong. Throw it out and guess again. Feynman considered this willingness
    to discard beloved theories the core virtue of science — and the hardest one to practice.`
  ];

  steps.forEach(card => {
    card.addEventListener('click', () => {
      steps.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      detail.innerHTML = details[Number(card.dataset.step)];
    });
  });
})();
