/**
 * Bug Bots Studio & Interactive Lesson App
 * Drives Tab 1 (Genghis Subsumption & Gait Lab), Tab 2 (Bristle-Bot Physics Lab),
 * Mastery Challenges, Reading Layer Sync, and Quick Check Quiz.
 */
(function () {
  'use strict';

  const E = window.BugBotsEngine;
  const SK = window.SimKit;
  if (!E || !SK) return;

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ── Studio Mode Tabs ───────────────────────────────────────────────────
  let activeTab = 'hexapod';
  const tabs = $$('[data-bb-tab]');
  const panels = $$('[data-bb-panel]');

  function switchTab(id) {
    activeTab = id;
    tabs.forEach((btn) => {
      const on = btn.dataset.bbTab === id;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.bbPanel !== id;
    });
    if (id === 'hexapod') hexView?.resize();
    if (id === 'bristle') bristleView?.resize();
  }

  tabs.forEach((btn, idx) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.bbTab));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].focus();
        switchTab(tabs[next].dataset.bbTab);
      }
    });
  });

  // ── Challenges Drawer ──────────────────────────────────────────────────
  const progress = { avoidRock: false, findHeat: false, legFault: false, bristleStraight: false };
  const chalPill = $('bb-challenge-pill');
  const chalDrawer = $('bb-challenges-drawer');
  const chalClose = $('bb-challenges-close');
  const chalList = $('bb-challenges-list');

  function renderChallenges() {
    const res = E.evaluateChallenges(progress);
    if (chalPill) chalPill.textContent = `Challenges: ${res.count} / ${res.total}`;
    if (chalList) {
      chalList.innerHTML = E.CHALLENGES.map((c) => {
        const done = res.completed[c.id];
        return `<div class="bb-chal-item ${done ? 'is-done' : ''}"><strong>${done ? '✓ ' : ''}${c.title}</strong>${c.desc}</div>`;
      }).join('');
    }
  }

  if (chalPill && chalDrawer) {
    chalPill.addEventListener('click', () => {
      const open = chalDrawer.hidden;
      chalDrawer.hidden = !open;
      chalPill.setAttribute('aria-expanded', String(open));
    });
  }
  if (chalClose && chalDrawer) {
    chalClose.addEventListener('click', () => {
      chalDrawer.hidden = true;
      chalPill?.setAttribute('aria-expanded', 'false');
    });
  }
  renderChallenges();

  // ── Tab 1: Genghis Hexapod & Subsumption Lab ───────────────────────────
  const hexCanvas = $('bb-hex-canvas');
  const hexBox = $('bb-hex-box');
  let hexView = null;
  const hexState = E.createHexapodState({ arenaW: 420, arenaH: 310 });
  let hexRunning = !reducedMotion;
  let hexGroundOffset = 0;

  // Build interactive 8-layer buttons & leg-jam chips
  const layerStackEl = $('bb-layer-stack');
  const layerBtns = [];
  if (layerStackEl) {
    for (let i = E.LAYERS.length - 1; i >= 0; i--) {
      const layer = E.LAYERS[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bb-layer-btn';
      btn.dataset.layerIndex = String(layer.id);
      btn.setAttribute('aria-pressed', String(Boolean(hexState.layers[layer.key])));
      btn.title = layer.desc;
      btn.innerHTML =
        `<span class="bb-layer-num">${layer.id}</span>` +
        `<span class="bb-layer-name">${layer.name}</span>` +
        `<span class="bb-layer-state">ON</span>` +
        `<span class="bb-layer-dot" aria-hidden="true"></span>`;
      btn.addEventListener('click', () => {
        hexState.layers[layer.key] = !hexState.layers[layer.key];
        btn.setAttribute('aria-pressed', String(hexState.layers[layer.key]));
        E.stepHexapod(hexState, 0);
        syncHexUI();
      });
      layerStackEl.appendChild(btn);
      layerBtns[layer.id] = btn;
    }
  }

  const legChipsEl = $('bb-leg-chips');
  const legChipMap = {};
  if (legChipsEl) {
    E.LEGS.forEach((leg) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bb-leg-chip';
      btn.textContent = leg.id;
      btn.setAttribute('aria-pressed', 'false');
      btn.title = `Jam or restore ${leg.id} leg`;
      btn.addEventListener('click', () => {
        hexState.disabledLegs[leg.index] = !hexState.disabledLegs[leg.index];
        btn.setAttribute('aria-pressed', String(hexState.disabledLegs[leg.index]));
        E.stepHexapod(hexState, 0);
        syncHexUI();
      });
      legChipsEl.appendChild(btn);
      legChipMap[leg.index] = btn;
    });
  }

  const gaitBtns = $$('[data-bb-gait]');
  gaitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      hexState.gait = btn.dataset.bbGait;
      gaitBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      E.stepHexapod(hexState, 0);
      syncHexUI();
    });
  });

  const speedSlider = $('bb-speed');
  const speedOut = $('bb-speed-out');
  if (speedSlider) {
    speedSlider.addEventListener('input', () => {
      hexState.speed = parseFloat(speedSlider.value);
      if (speedOut) speedOut.textContent = hexState.speed.toFixed(1) + '×';
    });
  }

  const hexRunBtn = $('bb-hex-run');
  function syncHexRunBtn() {
    if (!hexRunBtn) return;
    hexRunBtn.textContent = hexRunning ? '❚❚ Pause' : '▶ Run';
    hexRunBtn.setAttribute('aria-pressed', String(hexRunning));
  }
  if (hexRunBtn) {
    hexRunBtn.addEventListener('click', () => {
      hexRunning = !hexRunning;
      syncHexRunBtn();
    });
  }
  syncHexRunBtn();

  const hexStepBtn = $('bb-hex-step');
  if (hexStepBtn) {
    hexStepBtn.addEventListener('click', () => {
      hexRunning = false;
      syncHexRunBtn();
      E.stepHexapod(hexState, 0.045);
      hexGroundOffset = (hexGroundOffset + 45 * hexState.speed * 0.045) % 44;
      syncHexUI();
      drawHexCanvas();
    });
  }

  const hexResetBtn = $('bb-hex-reset');
  if (hexResetBtn) {
    hexResetBtn.addEventListener('click', () => {
      const prevGait = hexState.gait;
      const prevSpeed = hexState.speed;
      const fresh = E.createHexapodState({ arenaW: 420, arenaH: 310, gait: prevGait, speed: prevSpeed });
      Object.assign(hexState, fresh);
      layerBtns.forEach((btn, idx) => {
        if (btn) btn.setAttribute('aria-pressed', String(hexState.layers[E.LAYERS[idx].key]));
      });
      Object.values(legChipMap).forEach((btn) => btn.setAttribute('aria-pressed', 'false'));
      E.stepHexapod(hexState, 0);
      syncHexUI();
      drawHexCanvas();
    });
  }

  function syncHexUI() {
    const stab = hexState.stability || { groundedCount: 0, stable: false, marginPx: 0 };
    const winLayer = E.LAYERS[hexState.winningLayer];

    const statGrounded = $('bb-stat-grounded');
    const statStability = $('bb-stat-stability');
    const statWinner = $('bb-stat-winner');
    const statRate = $('bb-stat-rate');

    if (statGrounded) statGrounded.textContent = `${stab.groundedCount} / 6`;
    if (statStability) {
      statStability.textContent = !hexState.layers.standup
        ? 'Collapsed'
        : stab.stable
          ? `Stable (+${stab.marginPx.toFixed(0)}px)`
          : 'Unstable!';
      statStability.style.color = !hexState.layers.standup || !stab.stable ? '#fb7185' : '#4ade80';
    }
    if (statWinner) {
      statWinner.textContent = winLayer ? `${winLayer.id}: ${winLayer.name}` : 'None (Off)';
    }
    if (statRate) {
      statRate.textContent = `${hexState.stepsPerSec.toFixed(1)}/s`;
    }

    layerBtns.forEach((btn, idx) => {
      if (!btn) return;
      const key = E.LAYERS[idx].key;
      const on = Boolean(hexState.layers[key]);
      const firing = Boolean(hexState.firingLayers[idx]);
      const winning = hexState.winningLayer === idx;
      btn.classList.toggle('is-firing', on && firing);
      btn.classList.toggle('is-winning', on && winning);
      const st = btn.querySelector('.bb-layer-state');
      if (st) st.textContent = !on ? 'OFF' : winning ? 'ACTIVE' : firing ? 'RUN' : 'IDLE';
    });

    // Sync reading-section diagram if present
    $$('#layer-viz .bb-layer').forEach((el) => {
      const li = Number(el.dataset.layer);
      el.classList.toggle('firing', Boolean(hexState.firingLayers[li]));
    });

    // Challenge tracking
    let changed = false;
    if (!progress.avoidRock && hexState.avoidCount > 0 && !hexState.colliding) {
      progress.avoidRock = true;
      changed = true;
    }
    if (!progress.findHeat && hexState.heatReachedCount > 0 && hexState.layers.steeredProwl) {
      progress.findHeat = true;
      changed = true;
    }
    if (!progress.legFault && hexState.disabledLegs.some(Boolean) && stab.stable && hexState.layers.walk) {
      progress.legFault = true;
      changed = true;
    }
    if (changed) renderChallenges();
  }

  // Arena & Inspector Canvas Geometry
  function getHexLayout(w, h) {
    const arenaBox = { x: 8, y: 8, w: Math.round(w * 0.57) - 12, h: h - 16 };
    const inspBox = { x: arenaBox.x + arenaBox.w + 8, y: 8, w: w - (arenaBox.x + arenaBox.w + 16), h: h - 16 };
    const scale = Math.min(arenaBox.w / hexState.arenaW, arenaBox.h / hexState.arenaH);
    const ox = arenaBox.x + (arenaBox.w - hexState.arenaW * scale) / 2;
    const oy = arenaBox.y + (arenaBox.h - hexState.arenaH * scale) / 2;
    return { arenaBox, inspBox, scale, ox, oy };
  }

  let draggingTarget = false;
  if (hexCanvas && hexBox) {
    hexView = SK.canvas2d(hexCanvas, { box: hexBox, onResize: () => drawHexCanvas() });

    hexCanvas.addEventListener('pointerdown', (e) => {
      if (!hexView) return;
      const rect = hexCanvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const L = getHexLayout(hexView.width, hexView.height);

      // Check inspector side first (click foot to jam/restore leg)
      if (px >= L.inspBox.x) {
        const icx = L.inspBox.x + L.inspBox.w / 2;
        const icy = L.inspBox.y + L.inspBox.h / 2 + 6;
        const isc = Math.min(L.inspBox.w, L.inspBox.h) / 185;
        for (const lp of hexState.legPoses) {
          const fx = icx + lp.fx * isc;
          const fy = icy + lp.fy * isc;
          if (Math.hypot(px - fx, py - fy) < 22) {
            hexState.disabledLegs[lp.index] = !hexState.disabledLegs[lp.index];
            legChipMap[lp.index]?.setAttribute('aria-pressed', String(hexState.disabledLegs[lp.index]));
            E.stepHexapod(hexState, 0);
            syncHexUI();
            drawHexCanvas();
            return;
          }
        }
        return;
      }

      // Arena coords
      const ax = (px - L.ox) / L.scale;
      const ay = (py - L.oy) / L.scale;
      if (ax < 0 || ay < 0 || ax > hexState.arenaW || ay > hexState.arenaH) return;

      if (Math.hypot(ax - hexState.target.x, ay - hexState.target.y) < 26) {
        draggingTarget = true;
        hexCanvas.setPointerCapture(e.pointerId);
        return;
      }

      // Toggle rock
      const hitIdx = hexState.rocks.findIndex((r) => Math.hypot(ax - r.x, ay - r.y) <= r.r + 6);
      if (hitIdx >= 0) {
        hexState.rocks.splice(hitIdx, 1);
      } else if (Math.hypot(ax - hexState.x, ay - hexState.y) > 28) {
        hexState.rocks.push({ x: ax, y: ay, r: 20 });
      }
      drawHexCanvas();
    });

    hexCanvas.addEventListener('pointermove', (e) => {
      if (!draggingTarget || !hexView) return;
      const rect = hexCanvas.getBoundingClientRect();
      const L = getHexLayout(hexView.width, hexView.height);
      hexState.target.x = Math.max(20, Math.min(hexState.arenaW - 20, (e.clientX - rect.left - L.ox) / L.scale));
      hexState.target.y = Math.max(20, Math.min(hexState.arenaH - 20, (e.clientY - rect.top - L.oy) / L.scale));
      drawHexCanvas();
    });

    hexCanvas.addEventListener('pointerup', () => { draggingTarget = false; });
  }

  function drawHexCanvas() {
    if (!hexView || hexView.width < 40 || hexView.height < 40 || activeTab !== 'hexapod') return;
    const ctx = hexView.ctx;
    const W = hexView.width;
    const H = hexView.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#060a0e';
    ctx.fillRect(0, 0, W, H);

    const L = getHexLayout(W, H);

    // ── Left: Arena View ──────────────────────────────────────────
    const { arenaBox, scale, ox, oy } = L;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(arenaBox.x, arenaBox.y, arenaBox.w, arenaBox.h, 8);
    ctx.clip();
    ctx.fillStyle = '#0c151c';
    ctx.fillRect(arenaBox.x, arenaBox.y, arenaBox.w, arenaBox.h);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    RoboticsVisuals.floor(ctx, hexState.arenaW, hexState.arenaH, { step: 24 });
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(2, 2, hexState.arenaW - 4, hexState.arenaH - 4);

    // Rough terrain pebble patches
    hexState.pebbles.forEach((p) => {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.09)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
      ctx.setLineDash([4 / scale, 4 / scale]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(253, 230, 138, 0.55)';
      ctx.font = `700 ${Math.round(9 / scale)}px "IBM Plex Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('ROUGH', p.x, p.y + 3 / scale);
    });

    // Trail
    if (hexState.trail.length > 1) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 2.5 / scale;
      ctx.beginPath();
      hexState.trail.forEach((pt, idx) => (idx ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
    }

    // Rocks
    hexState.rocks.forEach((r) => {
      const g = ctx.createRadialGradient(r.x - r.r * 0.3, r.y - r.r * 0.35, 2, r.x, r.y, r.r);
      g.addColorStop(0, '#f59e0b');
      g.addColorStop(0.65, '#9a3412');
      g.addColorStop(1, '#431407');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(254, 215, 170, 0.35)';
      ctx.lineWidth = 1.5 / scale;
      ctx.stroke();
    });

    // IR Heat Target (draggable)
    const tx = hexState.target.x;
    const ty = hexState.target.y;
    const hg = ctx.createRadialGradient(tx, ty, 3, tx, ty, 28);
    hg.addColorStop(0, 'rgba(251, 113, 133, 0.95)');
    hg.addColorStop(0.45, 'rgba(245, 158, 11, 0.42)');
    hg.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(tx, ty, 28, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fda4af';
    ctx.lineWidth = 2 / scale;
    ctx.beginPath(); ctx.arc(tx, ty, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffe4e6';
    ctx.font = `700 ${Math.round(9 / scale)}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('HEAT', tx, ty - 14);

    // Genghis robot in arena (orient top-down body: body faces -y, so rotate heading + PI/2)
    ctx.save();
    RoboticsVisuals.shadow(ctx, hexState.x + 2, hexState.y + 4, 24, 21);
    ctx.translate(hexState.x, hexState.y);
    ctx.rotate(hexState.heading + Math.PI / 2);

    // Whisker rays (drawn in body space, where front is -y)
    if (hexState.layers.whiskers && hexState.layers.standup) {
      [
        { ang: -Math.PI / 2 - 0.52, hit: hexState.leftWhiskerHit },
        { ang: -Math.PI / 2 + 0.52, hit: hexState.rightWhiskerHit }
      ].forEach((w) => {
        ctx.strokeStyle = w.hit ? '#fb7185' : 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = (w.hit ? 2.6 : 1.5) / scale;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(Math.cos(w.ang) * 48, Math.sin(w.ang) * 48);
        ctx.stroke();
      });
    }

    // Mini 6 legs
    hexState.legPoses.forEach((lp) => {
      ctx.strokeStyle = lp.disabled ? '#475569' : lp.isSwing ? '#38bdf8' : '#f59e0b';
      ctx.lineWidth = 2.2 / scale;
      ctx.beginPath();
      ctx.moveTo(lp.hx * 0.36, lp.hy * 0.36);
      ctx.lineTo(lp.fx * 0.36, lp.fy * 0.36);
      ctx.stroke();
    });

    // Body oval
    ctx.fillStyle = RoboticsVisuals.gradient(ctx, -9, -13, 10, 14,
      hexState.colliding ? ['#fa8a69', '#7f1d1d'] : ['#c58136', '#5d3a1d', '#241c1b']);
    ctx.strokeStyle = hexState.layers.standup ? '#f59e0b' : '#64748b';
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(-4, -9, 2.2, 0, Math.PI * 2); ctx.arc(4, -9, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.restore();
    ctx.restore();

    ctx.fillStyle = '#fde68a';
    ctx.font = '700 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ARENA · CLICK ROCKS · DRAG HEAT', arenaBox.x + 8, arenaBox.y + 15);

    // ── Right: Close-Up Gait & Support-Polygon Inspector ───────────
    const { inspBox } = L;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(inspBox.x, inspBox.y, inspBox.w, inspBox.h, 8);
    ctx.clip();
    RoboticsVisuals.floor(ctx, inspBox.w, inspBox.h, { x: inspBox.x, y: inspBox.y, step: 0 });

    const icx = inspBox.x + inspBox.w / 2;
    const icy = inspBox.y + inspBox.h / 2 + 6;
    const isc = Math.max(0.1, Math.min(inspBox.w, inspBox.h) / 185);

    // Scrolling ground stripes moving backward (+y) as robot walks
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.09)';
    ctx.lineWidth = 1;
    for (let gy = -110; gy <= 110; gy += 28) {
      const yy = icy + (((gy + hexGroundOffset) % 220 + 220) % 220) - 110;
      ctx.beginPath();
      ctx.moveTo(inspBox.x + 10, yy);
      ctx.lineTo(inspBox.x + inspBox.w - 10, yy);
      ctx.stroke();
    }

    // Support polygon (convex hull of grounded feet)
    const stab = hexState.stability;
    if (stab.hull.length >= 3) {
      ctx.beginPath();
      stab.hull.forEach((pt, idx) => {
        const px = icx + pt.x * isc;
        const py = icy + pt.y * isc;
        if (idx) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = stab.stable ? 'rgba(74, 222, 128, 0.14)' : 'rgba(251, 113, 133, 0.16)';
      ctx.fill();
      ctx.strokeStyle = stab.stable ? '#4ade80' : '#fb7185';
      ctx.lineWidth = 1.6;
      ctx.setLineDash(stab.stable ? [] : [5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw stance legs, body, then swing legs
    function drawInspLeg(lp) {
      const ax = icx + lp.hx * isc;
      const ay = icy + lp.hy * isc;
      const bx = icx + lp.fx * isc;
      const by = icy + lp.fy * isc;
      const mx = (ax + bx) / 2 + lp.hx * 0.18 * isc;
      const my = (ay + by) / 2 + lp.hy * 0.18 * isc;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(mx, my);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = lp.disabled ? '#475569' : lp.isSwing ? '#38bdf8' : '#f59e0b';
      ctx.lineWidth = lp.isSwing ? 2.2 : 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (lp.disabled) ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(bx, by, lp.isSwing ? 3.5 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = lp.disabled ? '#fb7185' : lp.isSwing ? 'rgba(56, 189, 248, 0.65)' : '#f59e0b';
      ctx.fill();

      // Label
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.max(1, Math.hypot(dx, dy));
      ctx.fillStyle = lp.disabled ? '#fda4af' : lp.isSwing ? '#7dd3fc' : '#fde68a';
      ctx.font = '700 9px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lp.id, bx + (dx / len) * 11, by + (dy / len) * 11 + 3);
    }

    hexState.legPoses.forEach((lp) => { if (!lp.isSwing && !lp.disabled) drawInspLeg(lp); });

    // Body + CoM crosshair
    ctx.fillStyle = '#1d1409';
    ctx.strokeStyle = hexState.layers.standup ? '#f59e0b' : '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(icx, icy, 26 * isc, 36 * isc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Eyes facing up (-y)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(icx - 7 * isc, icy - 20 * isc, 3 * isc, 0, Math.PI * 2);
    ctx.arc(icx + 7 * isc, icy - 20 * isc, 3 * isc, 0, Math.PI * 2);
    ctx.fill();

    // CoM crosshair
    ctx.strokeStyle = stab.stable ? '#4ade80' : '#fb7185';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(icx, icy, 6, 0, Math.PI * 2);
    ctx.moveTo(icx - 9, icy); ctx.lineTo(icx + 9, icy);
    ctx.moveTo(icx, icy - 9); ctx.lineTo(icx, icy + 9);
    ctx.stroke();

    hexState.legPoses.forEach((lp) => { if (lp.isSwing || lp.disabled) drawInspLeg(lp); });

    ctx.fillStyle = '#9de2ef';
    ctx.font = '700 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SUPPORT POLYGON (CLICK LEG)', inspBox.x + 8, inspBox.y + 15);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Amber = grounded · Blue = lifted', inspBox.x + 8, inspBox.y + inspBox.h - 8);

    ctx.restore();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.24)';
    ctx.lineWidth = 1;
    ctx.strokeRect(arenaBox.x + 0.5, arenaBox.y + 0.5, arenaBox.w - 1, arenaBox.h - 1);
    ctx.strokeRect(inspBox.x + 0.5, inspBox.y + 0.5, inspBox.w - 1, inspBox.h - 1);
  }

  // ── Tab 2: Bristle-Bot Physics Lab ─────────────────────────────────────
  const bristleCanvas = $('bb-bristle-canvas');
  const bristleBox = $('bb-bristle-box');
  let bristleView = null;
  let bristleState = E.createBristleState();
  const bristleParams = { bristleAngleDeg: 32, motorHz: 150, weightBias: 0, surface: 'desk' };
  let bristleRunning = !reducedMotion;

  const angleSlider = $('bb-angle');
  const angleOut = $('bb-angle-out');
  const motorSlider = $('bb-motor');
  const motorOut = $('bb-motor-out');
  const biasSlider = $('bb-bias');
  const biasOut = $('bb-bias-out');
  const surfSelect = $('bb-surface');
  const bristleRunBtn = $('bb-bristle-run');
  const bristleResetBtn = $('bb-bristle-reset');

  function syncBristleReadout() {
    const phys = E.computeBristleBotPhysics(bristleParams);
    const vEl = $('bb-b-speed');
    const yEl = $('bb-b-yaw');
    const tEl = $('bb-b-time');
    const rEl = $('bb-b-status');
    const vrd = $('bb-bristle-verdict');

    if (vEl) vEl.textContent = `${phys.vCmPerSec.toFixed(1)} cm/s`;
    if (yEl) yEl.textContent = `${phys.yawDegPerSec >= 0 ? '+' : ''}${phys.yawDegPerSec.toFixed(0)}°/s`;
    if (tEl) tEl.textContent = `${bristleState.elapsed.toFixed(1)} s`;
    if (rEl) rEl.textContent = bristleState.finished ? 'FINISHED!' : bristleRunning ? 'Racing' : 'Paused';
    if (vrd) vrd.textContent = phys.verdict;

    if (bristleState.finished && !progress.bristleStraight) {
      progress.bristleStraight = true;
      renderChallenges();
    }
  }

  if (angleSlider) {
    angleSlider.addEventListener('input', () => {
      bristleParams.bristleAngleDeg = +angleSlider.value;
      if (angleOut) angleOut.textContent = `${bristleParams.bristleAngleDeg}°`;
      syncBristleReadout();
    });
  }
  if (motorSlider) {
    motorSlider.addEventListener('input', () => {
      bristleParams.motorHz = +motorSlider.value;
      if (motorOut) motorOut.textContent = `${bristleParams.motorHz} Hz`;
      syncBristleReadout();
    });
  }
  if (biasSlider) {
    biasSlider.addEventListener('input', () => {
      bristleParams.weightBias = +biasSlider.value;
      if (biasOut) {
        const b = bristleParams.weightBias;
        biasOut.textContent = Math.abs(b) < 0.05 ? 'Centered' : b < 0 ? `${Math.round(-b * 100)}% Left` : `${Math.round(b * 100)}% Right`;
      }
      syncBristleReadout();
    });
  }
  if (surfSelect) {
    surfSelect.addEventListener('change', () => {
      bristleParams.surface = surfSelect.value;
      syncBristleReadout();
    });
  }
  if (bristleRunBtn) {
    bristleRunBtn.addEventListener('click', () => {
      bristleRunning = !bristleRunning;
      bristleRunBtn.textContent = bristleRunning ? '❚❚ Pause' : '▶ Race';
      bristleRunBtn.setAttribute('aria-pressed', String(bristleRunning));
      syncBristleReadout();
    });
  }
  if (bristleResetBtn) {
    bristleResetBtn.addEventListener('click', () => {
      bristleState = E.createBristleState();
      bristleRunning = true;
      if (bristleRunBtn) {
        bristleRunBtn.textContent = '❚❚ Pause';
        bristleRunBtn.setAttribute('aria-pressed', 'true');
      }
      syncBristleReadout();
      drawBristleCanvas();
    });
  }

  if (bristleCanvas && bristleBox) {
    bristleView = SK.canvas2d(bristleCanvas, { box: bristleBox, onResize: () => drawBristleCanvas() });
  }

  function drawBristleCanvas() {
    if (!bristleView || bristleView.width < 40 || bristleView.height < 40 || activeTab !== 'bristle') return;
    const ctx = bristleView.ctx;
    const W = bristleView.width;
    const H = bristleView.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#070b0f';
    ctx.fillRect(0, 0, W, H);

    const phys = E.computeBristleBotPhysics(bristleParams);
    const splitY = Math.round(H * 0.44);

    // ── Top: Side-view Ratchet Slow-Mo ────────────────────────────
    RoboticsVisuals.floor(ctx, W - 16, splitY - 14, { x: 8, y: 8, step: 20 });
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.strokeRect(8.5, 8.5, W - 17, splitY - 15);

    const floorY = splitY - 22;
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(18, floorY); ctx.lineTo(W - 18, floorY); ctx.stroke();

    const osc = Math.sin(bristleState.vibPhase);
    const bodyY = floorY - 36 + osc * 4.5;
    const botLeft = Math.round(W * 0.22);
    const botW = Math.min(220, Math.round(W * 0.4));
    const rad = (bristleParams.bristleAngleDeg * Math.PI) / 180;
    const leanPx = Math.sin(rad) * 26;

    // Angled bristles
    const numB = 8;
    for (let i = 0; i < numB; i++) {
      const bx = botLeft + 18 + (i * (botW - 36)) / (numB - 1);
      const flex = osc > 0 ? leanPx * 0.14 : -leanPx * 0.08;
      ctx.strokeStyle = osc > 0 ? '#4ade80' : '#38bdf8';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, bodyY + 14);
      ctx.lineTo(bx - leanPx - flex, floorY);
      ctx.stroke();
    }

    // Toothbrush head, coin cell and offset mass shown on the same moving body.
    RoboticsVisuals.shadow(ctx, botLeft + botW / 2, floorY + 2, botW * .66, 8);
    RoboticsVisuals.plate(ctx, botLeft, bodyY, botW, 14, 5,
      RoboticsVisuals.gradient(ctx, 0, bodyY, 0, bodyY + 14, ['#84bac9', '#37536e', '#182c3e']), '#d1e9ef');
    const batteryX = botLeft + botW * .18;
    RoboticsVisuals.plate(ctx, batteryX, bodyY - 9, botW * .24, 9, 3,
      RoboticsVisuals.gradient(ctx, batteryX, bodyY - 9, batteryX + botW * .24, bodyY, ['#eaf0ef', '#879da6', '#324453']), '#a7c0c8');
    const motorX = botLeft + botW * .65;
    ctx.strokeStyle = '#f89d78'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(batteryX + botW * .20, bodyY - 8);
    ctx.quadraticCurveTo(batteryX + botW * .27, bodyY - 19, motorX - 7, bodyY - 10);
    ctx.stroke();
    RoboticsVisuals.joint(ctx, motorX, bodyY - 8, 10);
    RoboticsVisuals.disc(ctx, motorX + 5 * Math.cos(bristleState.vibPhase),
      bodyY - 8 + 5 * osc, 2.8, '#fa9455');

    ctx.fillStyle = '#fde68a';
    ctx.font = '700 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`RATCHET SIDE VIEW · ${osc > 0 ? 'DOWNSTROKE (GRIP)' : 'UPSTROKE (SPRING FORWARD)'}`, 18, 24);
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`v ≈ ${phys.vCmPerSec.toFixed(1)} cm/s →`, botLeft + botW + 20, bodyY + 10);

    // ── Bottom: Top-down Race Track ───────────────────────────────
    const trackTop = splitY + 4;
    const trackH = H - trackTop - 8;
    const surfColors = {
      desk: '#12202a',
      tile: '#162730',
      cardboard: '#231b12',
      carpet: '#1d1624'
    };
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(8, trackTop, W - 16, trackH, 8);
    ctx.clip();
    ctx.fillStyle = surfColors[bristleParams.surface] || '#12202a';
    ctx.fillRect(8, trackTop, W - 16, trackH);

    // Scale logical 600x220 track into trackTop..trackH
    const sc = Math.min((W - 24) / 600, (trackH - 8) / 220);
    const ox = 12 + ((W - 24) - 600 * sc) / 2;
    const oy = trackTop + 4 + ((trackH - 8) - 220 * sc) / 2;
    ctx.translate(ox, oy);
    ctx.scale(sc, sc);

    // Start & Finish lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(42, 16); ctx.lineTo(42, 204); ctx.stroke();
    ctx.strokeStyle = bristleState.finished ? '#4ade80' : '#f59e0b';
    ctx.beginPath(); ctx.moveTo(540, 25); ctx.lineTo(540, 195); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 10px "IBM Plex Mono", monospace';
    ctx.fillText('START', 22, 214);
    ctx.fillStyle = bristleState.finished ? '#4ade80' : '#fde68a';
    ctx.fillText('FINISH', 520, 214);

    // Trail
    if (bristleState.trail.length > 1) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      bristleState.trail.forEach((pt, idx) => (idx ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
    }

    // Top-down vibrating bot
    ctx.save();
    ctx.translate(bristleState.x, bristleState.y);
    ctx.rotate(bristleState.heading);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-16, -9, 32, 18, 6);
    ctx.fill();
    ctx.stroke();
    // LED eyes
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(10, -4, 2.5, 0, Math.PI * 2); ctx.arc(10, 4, 2.5, 0, Math.PI * 2); ctx.fill();
    // Weight bias indicator dot
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(-4, bristleParams.weightBias * 7, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.restore();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.strokeRect(8.5, trackTop + 0.5, W - 17, trackH - 1);
  }

  // ── Quick Check Quiz ───────────────────────────────────────────────────
  $$('.bb-question').forEach((q) => {
    const answer = q.dataset.answer;
    const explanation = q.dataset.explanation || '';
    const feedback = q.querySelector('.bb-feedback');
    $$('.bb-option', q).forEach((btn) => {
      btn.addEventListener('click', () => {
        if (q.dataset.locked) return;
        q.dataset.locked = 'true';
        const correct = btn.dataset.choice === answer;
        $$('.bb-option', q).forEach((b) => {
          b.disabled = true;
          if (b.dataset.choice === answer) b.classList.add('is-correct');
        });
        if (!correct) btn.classList.add('is-wrong');
        if (feedback) feedback.textContent = (correct ? 'Correct. ' : 'Not quite. ') + explanation;
      });
    });
  });

  // ── Main Loops (off-screen paused via SimKit.loop) ─────────────────────
  E.stepHexapod(hexState, 0);
  syncHexUI();
  drawHexCanvas();
  syncBristleReadout();
  drawBristleCanvas();

  if (hexCanvas) {
    SK.loop((dt) => {
      if (activeTab !== 'hexapod') return;
      if (hexRunning) {
        E.stepHexapod(hexState, dt);
        if (hexState.layers.standup && hexState.layers.walk) {
          hexGroundOffset = (hexGroundOffset + dt * 45 * hexState.speed) % 44;
        }
        syncHexUI();
      }
      drawHexCanvas();
    }, { el: SK.stage(hexCanvas), maxDt: 0.05 });
  }

  if (bristleCanvas) {
    SK.loop((dt) => {
      if (activeTab !== 'bristle') return;
      if (bristleRunning) {
        E.stepBristleBot(bristleState, bristleParams, dt);
        syncBristleReadout();
      }
      drawBristleCanvas();
    }, { el: SK.stage(bristleCanvas), maxDt: 0.05 });
  }
})();
