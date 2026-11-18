/* Interactive States of Matter Labs:
 * 1. Molecular Dynamics Chamber & Maxwell-Boltzmann Speed Distribution (#md-canvas)
 * 2. Latent Heat & Phase-Change Calorimetry Curve (#heating-canvas)
 * 3. Pressure-Temperature (P-T) Phase Diagram Explorer (#pt-canvas)
 * 4. Check Your Understanding practice handlers
 */
(function () {
  'use strict';

  if (!window.SimKit) return;

  var R_GAS = 8.3144626; // J/(mol·K)

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hexToRgba(hex, alpha) {
    var clean = String(hex || '').replace('#', '');
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    if (clean.length !== 6) return 'rgba(56, 189, 248, ' + alpha + ')';
    var r = parseInt(clean.slice(0, 2), 16);
    var g = parseInt(clean.slice(2, 4), 16);
    var b = parseInt(clean.slice(4, 6), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  function isDarkPalette(colors) {
    var bg = String(colors && colors.bg ? colors.bg : '').trim();
    var m = bg.match(/#([0-9a-f]{3}|[0-9a-f]{6})/i);
    if (!m) {
      var rgb = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (!rgb) return false;
      return (0.2126 * Number(rgb[1]) + 0.7152 * Number(rgb[2]) + 0.0722 * Number(rgb[3])) < 128;
    }
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
  }

  var themePalette = {
    dark: false,
    canvasBg: '#0b1322',
    canvasGrid: 'rgba(148, 163, 184, 0.09)',
    ink: '#e2e8f0',
    muted: '#94a3b8',
    accent: '#2dd4bf'
  };

  function updatePalette(colors) {
    var dark = isDarkPalette(colors);
    themePalette.dark = dark;
    // Scientific instruments keep a crisp deep-slate chamber backdrop in all themes
    // while harmonizing accent highlights with the active site theme.
    themePalette.canvasBg = dark ? '#08101d' : '#0d1726';
    themePalette.canvasGrid = 'rgba(148, 163, 184, 0.09)';
    themePalette.ink = '#e2e8f0';
    themePalette.muted = '#94a3b8';
    themePalette.accent = colors.accent || '#2dd4bf';
  }

  SimKit.theme.onChange(updatePalette);

  function drawGrid(ctx, x, y, w, h, step) {
    ctx.save();
    ctx.strokeStyle = themePalette.canvasGrid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = x; gx <= x + w; gx += step) {
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
    }
    for (var gy = y; gy <= y + h; gy += step) {
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ═══════════════════════════════════════════════════════════════
     SIM 1 · MOLECULAR DYNAMICS CHAMBER & MAXWELL–BOLTZMANN CURVE
     ═══════════════════════════════════════════════════════════════ */
  (function initMolecularDynamics() {
    var canvas = document.getElementById('md-canvas');
    if (!canvas) return;

    var SUBSTANCES = {
      water: {
        name: 'Water (H₂O)',
        tm: 0,
        tb: 100,
        molarMass: 18.015,
        color: '#38bdf8',
        bondColor: 'rgba(94, 234, 212, 0.55)',
        note: 'Hydrogen bonds give H₂O unusually high melting (0 °C) and boiling (100 °C) points for its small molar mass.'
      },
      argon: {
        name: 'Argon (Ar)',
        tm: -189,
        tb: -186,
        molarMass: 39.948,
        color: '#a78bfa',
        bondColor: 'rgba(196, 181, 253, 0.50)',
        note: 'Weak London dispersion forces hold argon atoms together, so its liquid range spans just 3 °C (-189 °C to -186 °C).'
      },
      nitrogen: {
        name: 'Nitrogen (N₂)',
        tm: -210,
        tb: -196,
        molarMass: 28.014,
        color: '#34d399',
        bondColor: 'rgba(110, 231, 183, 0.50)',
        note: 'Nonpolar N₂ molecules require cryogenic cooling below -196 °C to condense into liquid nitrogen.'
      },
      iron: {
        name: 'Iron (Fe)',
        tm: 1538,
        tb: 2862,
        molarMass: 55.845,
        color: '#fb923c',
        bondColor: 'rgba(253, 186, 116, 0.55)',
        note: 'Strong metallic bonding locks Fe atoms in a rigid crystal until 1538 °C and keeps molten iron liquid up to 2862 °C.'
      }
    };

    var substanceEl = document.getElementById('substanceSelect');
    var sideSubstanceEl = document.getElementById('side-substance');
    var tempEl = document.getElementById('temp');
    var sideTempEl = document.getElementById('side-temp');
    var pistonEl = document.getElementById('pistonCompression');
    var showBondsEl = document.getElementById('showBondsToggle');
    var showVectorsEl = document.getElementById('showVectorsToggle');
    var pauseBtn = document.getElementById('mdPauseBtn');

    var tempValEl = document.getElementById('tempVal');
    var kelvinValEl = document.getElementById('kelvinVal');
    var phaseBadgeEl = document.getElementById('phaseBadge');
    var pressureValEl = document.getElementById('pressureVal');
    var vrmsValEl = document.getElementById('vrmsVal');
    var stateTextEl = document.getElementById('stateText');
    var substanceNoteEl = document.getElementById('substanceNote');
    var pistonValEl = document.getElementById('pistonVal');
    var sideTempValEl = document.getElementById('sideTempVal');

    var N = 48;
    var COLS = 8;
    var ROWS = 6;
    var NUM_BINS = 15;
    var MAX_U = 2.8;
    var PLASMA_TEMP = 3000;

    var particles = [];
    var electrons = [];
    var histSmooth = new Array(NUM_BINS).fill(0);
    var paused = false;
    var wallImpulse = 0;
    var pressureSmooth = 1.0;

    for (var i = 0; i < N; i++) {
      var ang = (i * 2.39996) % (Math.PI * 2);
      var spd = 0.65 + 0.7 * ((i * 7 % 11) / 10);
      particles.push({
        x: 0.2 + 0.6 * ((i % COLS) / (COLS - 1)),
        y: 0.45 + 0.45 * (Math.floor(i / COLS) / (ROWS - 1)),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        row: Math.floor(i / COLS),
        col: i % COLS,
        ion: i % 2 === 0
      });
    }

    for (var e = 0; e < 18; e++) {
      var ea = (e * 1.7) % (Math.PI * 2);
      electrons.push({
        x: 0.15 + 0.7 * ((e * 13 % 17) / 16),
        y: 0.2 + 0.7 * ((e * 5 % 11) / 10),
        vx: Math.cos(ea) * 3.4,
        vy: Math.sin(ea) * 3.4
      });
    }

    function getSub() {
      return SUBSTANCES[substanceEl ? substanceEl.value : 'water'] || SUBSTANCES.water;
    }

    function getTempC() {
      return tempEl ? Number(tempEl.value) : 20;
    }

    function getVolFrac() {
      return pistonEl ? Number(pistonEl.value) / 100 : 1.0;
    }

    function classifyPhase(sub, T) {
      if (T >= PLASMA_TEMP) return 'plasma';
      if (Math.abs(T - sub.tm) <= 2) return 'melting';
      if (Math.abs(T - sub.tb) <= 2) return 'boiling';
      if (T < sub.tm) return 'solid';
      if (T < sub.tb) return 'liquid';
      return 'gas';
    }

    function physicalVrms(sub, T) {
      var TK = Math.max(4, T + 273.15);
      var M = sub.molarMass * 1e-3;
      return Math.sqrt((3 * R_GAS * TK) / M);
    }

    function reducedThermalSpeed(sub, T, phase) {
      var TK = Math.max(10, T + 273.15);
      var TmK = Math.max(10, sub.tm + 273.15);
      var TbK = Math.max(TmK + 2, sub.tb + 273.15);

      if (phase === 'solid') {
        return lerp(0.18, 0.44, clamp(TK / TmK, 0.1, 1));
      }
      if (phase === 'melting') {
        return 0.50;
      }
      if (phase === 'liquid') {
        var frac = clamp((T - sub.tm) / Math.max(3, sub.tb - sub.tm), 0, 1);
        return lerp(0.54, 0.92, frac);
      }
      if (phase === 'boiling') {
        return 0.98;
      }
      if (phase === 'gas') {
        var span = Math.max(120, PLASMA_TEMP - sub.tb);
        var gFrac = clamp((T - sub.tb) / span, 0, 1);
        return 1.06 + 1.15 * Math.sqrt(gFrac);
      }
      return 2.25 + 0.35 * clamp((T - PLASMA_TEMP) / 200, 0, 1);
    }

    function updateReadouts(sub, T, phase, volFrac) {
      var TK = Math.max(0, T + 273.15);
      var vrms = physicalVrms(sub, T);
      var TbK = Math.max(10, sub.tb + 273.15);

      var labels = {
        solid: 'Solid (Crystal Lattice)',
        melting: 'Melting Equilibrium',
        liquid: 'Liquid (Fluid)',
        boiling: 'Boiling Equilibrium',
        gas: 'Gas (Compressible)',
        plasma: 'Plasma (Ionized)'
      };
      var desc = {
        solid: 'a solid: attractive forces lock particles into a vibrating crystal lattice with fixed shape and volume.',
        melting: 'solid–liquid equilibrium at the melting point (' + sub.tm + ' °C): added thermal energy disrupts crystal bonds while temperature pauses.',
        liquid: 'a liquid: particles stay close together under cohesive attractions while sliding past one another to take the container shape.',
        boiling: 'liquid–gas equilibrium at the boiling point (' + sub.tb + ' °C): fast molecules escape into the vapor space while liquid and gas coexist.',
        gas: 'a gas: kinetic energy overwhelms attractions, so particles travel freely and fill the entire available piston volume.',
        plasma: 'an ionized plasma: high-energy collisions strip electrons from atoms, creating positive ions (+) and fast free electrons (e⁻).'
      };

      // Illustrative chamber pressure indicator (atm): ideal-gas scaling in gas/plasma,
      // rising rapidly on compression in condensed phases.
      var targetP;
      if (phase === 'gas' || phase === 'plasma') {
        targetP = (TK / TbK) * (1.0 / volFrac);
      } else if (phase === 'boiling') {
        targetP = 1.0 / Math.max(0.55, volFrac);
      } else if (phase === 'liquid' || phase === 'melting') {
        var satFrac = clamp((T - sub.tm) / Math.max(3, sub.tb - sub.tm), 0.05, 1);
        targetP = 0.05 + 0.95 * Math.pow(satFrac, 2) + (volFrac < 0.56 ? (0.56 - volFrac) * 18 : 0);
      } else {
        targetP = 0.01 + (volFrac < 0.54 ? (0.54 - volFrac) * 24 : 0);
      }
      pressureSmooth = lerp(pressureSmooth, targetP, 0.2);

      if (tempValEl) tempValEl.textContent = T.toFixed(0);
      if (sideTempValEl) sideTempValEl.textContent = T.toFixed(0) + ' °C';
      if (kelvinValEl) kelvinValEl.textContent = TK.toFixed(0) + ' K';
      if (phaseBadgeEl) {
        phaseBadgeEl.textContent = labels[phase];
        phaseBadgeEl.dataset.phase = phase;
      }
      if (pressureValEl) {
        pressureValEl.textContent = pressureSmooth >= 10
          ? pressureSmooth.toFixed(1) + ' atm'
          : pressureSmooth.toFixed(2) + ' atm';
      }
      if (vrmsValEl) vrmsValEl.textContent = Math.round(vrms).toLocaleString() + ' m/s';
      if (pistonValEl) pistonValEl.textContent = Math.round(volFrac * 100) + '%';
      if (substanceNoteEl) substanceNoteEl.textContent = sub.note;
      if (stateTextEl) {
        stateTextEl.textContent = 'At ' + T + ' °C (' + Math.round(TK) + ' K), ' + sub.name + ' is ' + desc[phase];
      }
    }

    function stepPhysics(dt, box, sub, T, phase, volFrac) {
      var r = clamp(Math.min(box.w, box.h) * 0.029, 4.5, 8.5);
      var floorY = box.y + box.h;
      var ceilY = floorY - box.h * volFrac;
      var leftX = box.x + r;
      var rightX = box.x + box.w - r;
      var topY = ceilY + r;
      var botY = floorY - r;

      var vTarget = reducedThermalSpeed(sub, T, phase);
      var simScale = Math.min(box.w, box.h) * 0.52;
      var targetPxSpeed = vTarget * simScale;

      var latticeSpacingX = Math.min(r * 2.55, (box.w * 0.68) / COLS);
      var latticeSpacingY = latticeSpacingX * 0.866;
      var latticeWidth = (COLS - 1) * latticeSpacingX;
      var latticeOriginX = box.x + (box.w - latticeWidth) * 0.5;
      var latticeOriginY = botY - r * 0.2;

      var subSteps = 4;
      var h = dt / subSteps;
      var minDist = r * 2.15;
      var cutDist = r * 4.4;

      var springK = phase === 'solid' ? 140 : phase === 'melting' ? 45 : 0;
      var gravity = (phase === 'liquid' || phase === 'melting' || phase === 'boiling') ? simScale * 0.85 : 0;
      var attractK = phase === 'liquid' ? 18 : phase === 'boiling' ? 9 : phase === 'melting' ? 14 : 0;
      var repulseK = 420;

      for (var s = 0; s < subSteps; s++) {
        // Pairwise soft-core repulsion + short-range cohesion
        for (var i = 0; i < N; i++) {
          var pi = particles[i];
          var px = box.x + pi.x * box.w;
          var py = box.y + pi.y * box.h;
          var ax = 0;
          var ay = gravity;

          // Lattice restoring force in solid / partial in melting
          if (springK > 0) {
            var useSpring = phase === 'solid' || (phase === 'melting' && pi.row >= 2);
            if (useSpring) {
              var stagger = (pi.row % 2) * (latticeSpacingX * 0.45);
              var hx = latticeOriginX + pi.col * latticeSpacingX + stagger;
              var hy = latticeOriginY - (ROWS - 1 - pi.row) * latticeSpacingY;
              ax += (hx - px) * springK;
              ay += (hy - py) * springK;
            }
          }

          for (var j = i + 1; j < N; j++) {
            var pj = particles[j];
            var qx = box.x + pj.x * box.w;
            var qy = box.y + pj.y * box.h;
            var dx = qx - px;
            var dy = qy - py;
            var d2 = dx * dx + dy * dy;
            if (d2 > cutDist * cutDist || d2 < 1e-6) continue;

            var d = Math.sqrt(d2);
            var nx = dx / d;
            var ny = dy / d;

            if (d < minDist) {
              // Elastic collision velocity impulse + soft separation
              var overlap = minDist - d;
              var fRep = repulseK * overlap;
              ax -= nx * fRep;
              ay -= ny * fRep;

              var rvx = (pj.vx - pi.vx) * simScale;
              var rvy = (pj.vy - pi.vy) * simScale;
              var vn = rvx * nx + rvy * ny;
              if (vn < 0) {
                var imp = -vn / simScale;
                pi.vx -= nx * imp * 0.85;
                pi.vy -= ny * imp * 0.85;
                pj.vx += nx * imp * 0.85;
                pj.vy += ny * imp * 0.85;
              }
            } else if (attractK > 0 && d < cutDist) {
              var pull = attractK * (1 - (d - minDist) / (cutDist - minDist));
              ax += nx * pull;
              ay += ny * pull;
            }
          }

          // Update velocity (in normalized sim units)
          var vxPx = pi.vx * simScale + ax * h;
          var vyPx = pi.vy * simScale + ay * h;

          px += vxPx * h;
          py += vyPx * h;

          // Wall collisions with slight thermal jitter so speed histogram fills naturally
          if (px < leftX) {
            px = leftX;
            vxPx = Math.abs(vxPx) * 0.99;
            wallImpulse += Math.abs(vxPx);
          } else if (px > rightX) {
            px = rightX;
            vxPx = -Math.abs(vxPx) * 0.99;
            wallImpulse += Math.abs(vxPx);
          }
          if (py < topY) {
            py = topY;
            vyPx = Math.abs(vyPx) * 0.99;
            wallImpulse += Math.abs(vyPx);
          } else if (py > botY) {
            py = botY;
            vyPx = -Math.abs(vyPx) * 0.99;
          }

          pi.x = clamp((px - box.x) / box.w, 0.01, 0.99);
          pi.y = clamp((py - box.y) / box.h, 0.01, 0.99);
          pi.vx = vxPx / simScale;
          pi.vy = vyPx / simScale;
        }

        // Global RMS thermostat preserving individual particle speed distribution
        var sumSq = 0;
        for (var k = 0; k < N; k++) {
          sumSq += particles[k].vx * particles[k].vx + particles[k].vy * particles[k].vy;
        }
        var currentRms = Math.sqrt(sumSq / N);
        if (currentRms > 1e-4) {
          var scaleFactor = lerp(1.0, vTarget / currentRms, 0.14);
          for (var m = 0; m < N; m++) {
            particles[m].vx = clamp(particles[m].vx * scaleFactor, -5.5, 5.5);
            particles[m].vy = clamp(particles[m].vy * scaleFactor, -5.5, 5.5);
          }
        }
      }

      // Update free electrons when in plasma
      if (phase === 'plasma') {
        for (var q = 0; q < electrons.length; q++) {
          var el = electrons[q];
          el.x += el.vx * dt * 0.9;
          el.y += el.vy * dt * 0.9;
          if (el.x < 0.03 || el.x > 0.97) el.vx = -el.vx;
          if (el.y < 1 - volFrac + 0.03 || el.y > 0.97) el.vy = -el.vy;
          el.x = clamp(el.x, 0.03, 0.97);
          el.y = clamp(el.y, 1 - volFrac + 0.03, 0.97);
        }
      }

      // Sample normalized speeds into Maxwell-Boltzmann histogram
      var bins = new Array(NUM_BINS).fill(0);
      for (var p = 0; p < N; p++) {
        var spd = Math.hypot(particles[p].vx, particles[p].vy);
        var u = spd / Math.max(0.15, vTarget);
        var bin = Math.min(NUM_BINS - 1, Math.floor((u / MAX_U) * NUM_BINS));
        bins[bin] += 1 / N;
      }
      for (var b = 0; b < NUM_BINS; b++) {
        histSmooth[b] = lerp(histSmooth[b], bins[b], 0.15);
      }
    }

    function drawChamberAndDistribution(ctx, W, H, sub, T, phase, volFrac) {
      ctx.fillStyle = themePalette.canvasBg;
      ctx.fillRect(0, 0, W, H);
      drawGrid(ctx, 0, 0, W, H, 26);

      var stacked = W < 580;
      var chamberBox = stacked
        ? { x: 14, y: 14, w: W - 28, h: Math.round(H * 0.54) }
        : { x: 14, y: 14, w: Math.round(W * 0.56), h: H - 28 };
      var plotBox = stacked
        ? { x: 14, y: chamberBox.y + chamberBox.h + 14, w: W - 28, h: H - (chamberBox.y + chamberBox.h + 28) }
        : { x: chamberBox.x + chamberBox.w + 16, y: 14, w: W - (chamberBox.x + chamberBox.w + 30), h: H - 28 };

      // ── Left / Top: Piston Chamber ──
      var floorY = chamberBox.y + chamberBox.h;
      var ceilY = floorY - chamberBox.h * volFrac;

      // Active volume glow
      var bgGrad = ctx.createLinearGradient(0, ceilY, 0, floorY);
      if (phase === 'plasma') {
        bgGrad.addColorStop(0, 'rgba(244, 63, 94, 0.14)');
        bgGrad.addColorStop(1, 'rgba(168, 85, 247, 0.22)');
      } else if (phase === 'gas' || phase === 'boiling') {
        bgGrad.addColorStop(0, 'rgba(245, 158, 11, 0.08)');
        bgGrad.addColorStop(1, 'rgba(56, 189, 248, 0.10)');
      } else {
        bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
        bgGrad.addColorStop(1, hexToRgba(sub.color, 0.14));
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(chamberBox.x, ceilY, chamberBox.w, floorY - ceilY);

      // Piston dead space above movable wall
      if (ceilY > chamberBox.y + 2) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.fillRect(chamberBox.x, chamberBox.y, chamberBox.w, ceilY - chamberBox.y);
        // Piston rod
        ctx.fillStyle = '#64748b';
        ctx.fillRect(chamberBox.x + chamberBox.w * 0.5 - 8, chamberBox.y, 16, ceilY - chamberBox.y);
      }

      // Movable piston head
      ctx.fillStyle = '#475569';
      ctx.fillRect(chamberBox.x, ceilY - 6, chamberBox.w, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(chamberBox.x, ceilY - 6, chamberBox.w, 2);

      // Container outline
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(chamberBox.x, chamberBox.y, chamberBox.w, chamberBox.h);

      var r = clamp(Math.min(chamberBox.w, chamberBox.h) * 0.029, 4.5, 8.5);
      var showBonds = !showBondsEl || showBondsEl.checked;
      var showVectors = showVectorsEl && showVectorsEl.checked;

      // Cohesive bond network
      if (showBonds && (phase === 'solid' || phase === 'melting' || phase === 'liquid' || phase === 'boiling')) {
        var bondMax = r * (phase === 'solid' ? 3.5 : 3.2);
        ctx.save();
        ctx.strokeStyle = sub.bondColor;
        ctx.lineWidth = phase === 'solid' ? 1.5 : 1.1;
        if (phase !== 'solid') ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (var i = 0; i < N; i++) {
          var p1x = chamberBox.x + particles[i].x * chamberBox.w;
          var p1y = chamberBox.y + particles[i].y * chamberBox.h;
          for (var j = i + 1; j < N; j++) {
            var p2x = chamberBox.x + particles[j].x * chamberBox.w;
            var p2y = chamberBox.y + particles[j].y * chamberBox.h;
            var dx = p2x - p1x;
            var dy = p2y - p1y;
            if (dx * dx + dy * dy <= bondMax * bondMax) {
              ctx.moveTo(p1x, p1y);
              ctx.lineTo(p2x, p2y);
            }
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      // Particles
      var vNorm = reducedThermalSpeed(sub, T, phase);
      for (var k = 0; k < N; k++) {
        var pt = particles[k];
        var cx = chamberBox.x + pt.x * chamberBox.w;
        var cy = clamp(chamberBox.y + pt.y * chamberBox.h, ceilY + r, floorY - r);
        var spdRatio = Math.hypot(pt.vx, pt.vy) / Math.max(0.15, vNorm);

        // Hot fast particles shift slightly warmer
        var fillCol = sub.color;
        if (phase === 'plasma') {
          fillCol = pt.ion ? '#fb7185' : '#f59e0b';
        } else if (spdRatio > 1.45) {
          fillCol = '#fbbf24';
        }

        if (showVectors) {
          var vxLen = pt.vx * 18;
          var vyLen = pt.vy * 18;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + vxLen, cy + vyLen);
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.78)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        var grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.38, fillCol);
        grad.addColorStop(1, hexToRgba(fillCol, 0.85));
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        if (phase === 'plasma' && pt.ion) {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 9px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+', cx, cy + 0.5);
        }
      }

      // Free electrons in plasma
      if (phase === 'plasma') {
        for (var e = 0; e < electrons.length; e++) {
          var ex = chamberBox.x + electrons[e].x * chamberBox.w;
          var ey = clamp(chamberBox.y + electrons[e].y * chamberBox.h, ceilY + 4, floorY - 4);
          ctx.beginPath();
          ctx.arc(ex, ey, 2.7, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
        }
      }

      // Chamber overlay badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(chamberBox.x + 8, chamberBox.y + 8, 174, 24);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(sub.name + ' · V = ' + Math.round(volFrac * 100) + '%', chamberBox.x + 16, chamberBox.y + 20);

      // ── Right / Bottom: Maxwell–Boltzmann Speed Distribution ──
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(plotBox.x, plotBox.y, plotBox.w, plotBox.h);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(plotBox.x, plotBox.y, plotBox.w, plotBox.h);

      var padL = 16;
      var padR = 14;
      var padT = 32;
      var padB = 34;
      var gx = plotBox.x + padL;
      var gy = plotBox.y + padT;
      var gw = Math.max(40, plotBox.w - padL - padR);
      var gh = Math.max(40, plotBox.h - padT - padB);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11.5px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Speed Distribution (Maxwell–Boltzmann)', plotBox.x + 12, plotBox.y + 9);

      // Theoretical 2D distribution: P(u) = 2u * exp(-u^2), where u = v / v_rms.
      // Peak occurs at u = 1/sqrt(2) with P_max = sqrt(2/e) ≈ 0.8578.
      var binWidthU = MAX_U / NUM_BINS;
      var maxPdf = 0.92;
      var barW = gw / NUM_BINS;

      for (var b = 0; b < NUM_BINS; b++) {
        var density = histSmooth[b] / binWidthU;
        var bh = clamp(density / maxPdf, 0, 1) * gh;
        var bx = gx + b * barW + 1.5;
        var by = gy + gh - bh;
        ctx.fillStyle = hexToRgba(sub.color, 0.42);
        ctx.fillRect(bx, by, Math.max(1, barW - 3), bh);
        ctx.strokeStyle = hexToRgba(sub.color, 0.85);
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, Math.max(1, barW - 3), bh);
      }

      // Smooth theoretical curve
      ctx.beginPath();
      for (var step = 0; step <= 80; step++) {
        var uVal = (step / 80) * MAX_U;
        var pdf = 2 * uVal * Math.exp(-uVal * uVal);
        var pxPlot = gx + (uVal / MAX_U) * gw;
        var pyPlot = gy + gh - clamp(pdf / maxPdf, 0, 1) * gh;
        if (step === 0) ctx.moveTo(pxPlot, pyPlot);
        else ctx.lineTo(pxPlot, pyPlot);
      }
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Marker at v_rms (u = 1.0)
      var vrmsX = gx + (1.0 / MAX_U) * gw;
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(vrmsX, gy);
      ctx.lineTo(vrmsX, gy + gh);
      ctx.stroke();
      ctx.restore();

      var vrmsReal = physicalVrms(sub, T);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('v_rms ' + Math.round(vrmsReal) + ' m/s', vrmsX, gy + 2);

      // Axes labels
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, gy + gh);
      ctx.lineTo(gx + gw, gy + gh);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('0', gx, gy + gh + 6);
      ctx.textAlign = 'center';
      ctx.fillText('Particle Speed (m/s)', gx + gw * 0.5, gy + gh + 16);
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(vrmsReal * MAX_U) + '+', gx + gw, gy + gh + 6);
    }

    var surface = SimKit.canvas2d(canvas, {
      height: 360,
      onResize: function (ctx, w, h) {
        var sub = getSub();
        var T = getTempC();
        var phase = classifyPhase(sub, T);
        drawChamberAndDistribution(ctx, w, h, sub, T, phase, getVolFrac());
      }
    });

    function renderChamberNow() {
      if (!surface) return;
      var sub = getSub();
      var T = getTempC();
      var phase = classifyPhase(sub, T);
      var volFrac = getVolFrac();
      updateReadouts(sub, T, phase, volFrac);
      drawChamberAndDistribution(surface.ctx, surface.width, surface.height, sub, T, phase, volFrac);
    }

    function syncTempInputs(source) {
      if (!tempEl || !sideTempEl) return;
      if (source === 'main') sideTempEl.value = tempEl.value;
      else if (source === 'side') tempEl.value = sideTempEl.value;
    }

    function syncSubstanceInputs(source) {
      if (!substanceEl || !sideSubstanceEl) return;
      if (source === 'main') sideSubstanceEl.value = substanceEl.value;
      else if (source === 'side') substanceEl.value = sideSubstanceEl.value;
    }

    function applyPreset(presetName) {
      var sub = getSub();
      var targetT = 20;
      if (presetName === 'solid') {
        targetT = Math.max(-240, Math.round(sub.tm - Math.max(30, (sub.tb - sub.tm) * 0.4)));
      } else if (presetName === 'melting') {
        targetT = sub.tm;
      } else if (presetName === 'liquid') {
        targetT = Math.round(sub.tm + (sub.tb - sub.tm) * 0.35);
      } else if (presetName === 'boiling') {
        targetT = sub.tb;
      } else if (presetName === 'gas') {
        targetT = Math.min(2960, Math.round(sub.tb + Math.max(60, (sub.tb - sub.tm) * 0.5)));
      } else if (presetName === 'plasma') {
        targetT = 3150;
      }
      if (tempEl) tempEl.value = String(targetT);
      if (sideTempEl) sideTempEl.value = String(targetT);
      renderChamberNow();
    }

    if (tempEl) {
      tempEl.addEventListener('input', function () {
        syncTempInputs('main');
        renderChamberNow();
      });
    }
    if (sideTempEl) {
      sideTempEl.addEventListener('input', function () {
        syncTempInputs('side');
        renderChamberNow();
      });
    }
    if (substanceEl) {
      substanceEl.addEventListener('change', function () {
        syncSubstanceInputs('main');
        renderChamberNow();
      });
    }
    if (sideSubstanceEl) {
      sideSubstanceEl.addEventListener('change', function () {
        syncSubstanceInputs('side');
        renderChamberNow();
      });
    }
    if (pistonEl) {
      pistonEl.addEventListener('input', renderChamberNow);
    }
    if (showBondsEl) showBondsEl.addEventListener('change', renderChamberNow);
    if (showVectorsEl) showVectorsEl.addEventListener('change', renderChamberNow);
    document.querySelectorAll('.md-preset-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyPreset(btn.getAttribute('data-preset'));
      });
    });

    var loopHandle = SimKit.loop(function (dt) {
      var sub = getSub();
      var T = getTempC();
      var phase = classifyPhase(sub, T);
      var volFrac = getVolFrac();
      if (!paused) {
        var W = surface.width;
        var H = surface.height;
        var stacked = W < 580;
        var chamberBox = stacked
          ? { x: 14, y: 14, w: W - 28, h: Math.round(H * 0.54) }
          : { x: 14, y: 14, w: Math.round(W * 0.56), h: H - 28 };
        stepPhysics(dt, chamberBox, sub, T, phase, volFrac);
      }
      updateReadouts(sub, T, phase, volFrac);
      drawChamberAndDistribution(surface.ctx, surface.width, surface.height, sub, T, phase, volFrac);
    }, { el: SimKit.stage(canvas), maxDt: 0.033 });

    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        paused = !paused;
        pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
        pauseBtn.setAttribute('aria-pressed', String(paused));
        if (paused) loopHandle.pause();
        else loopHandle.resume();
      });
    }

    var initSub = getSub();
    var initT = getTempC();
    updateReadouts(initSub, initT, classifyPhase(initSub, initT), getVolFrac());
  })();

  /* ═══════════════════════════════════════════════════════════════
     SIM 2 · LATENT HEAT & PHASE-CHANGE CALORIMETRY LAB
     ═══════════════════════════════════════════════════════════════ */
  (function initHeatingLab() {
    var canvas = document.getElementById('heating-canvas');
    if (!canvas) return;

    var slider = document.getElementById('heatSlider');
    var playBtn = document.getElementById('heatPlayBtn');
    var qValEl = document.getElementById('heatQVal');
    var tempValEl = document.getElementById('heatTempVal');
    var phaseValEl = document.getElementById('heatPhaseVal');
    var evidenceEl = document.getElementById('heatEvidence');

    // 1.0 g H2O at 1 atm starting at -25 °C
    var Q1 = 52.5;    // 0 -> 52.5: -25 -> 0 °C (ice, c=2.1)
    var Q2 = 386.5;   // 52.5 -> 386.5: melting at 0 °C (dH_fus=334)
    var Q3 = 804.5;   // 386.5 -> 804.5: 0 -> 100 °C (liquid, c=4.18)
    var Q4 = 3064.5;  // 804.5 -> 3064.5: boiling at 100 °C (dH_vap=2260)
    var QMAX = 3135;  // 3064.5 -> 3135: 100 -> 135 °C (steam, c~2.01)

    function evalWaterState(Q) {
      if (Q <= Q1) {
        return {
          T: -25 + Q / 2.1,
          phase: 'Solid Ice',
          solid: 1, liquid: 0, gas: 0,
          ekFrac: 1, epFrac: 0,
          stage: 'ice',
          note: 'Added heat goes directly into average kinetic energy (vibrations), warming ice toward 0 °C.'
        };
      }
      if (Q <= Q2) {
        var fMelt = (Q - Q1) / (Q2 - Q1);
        return {
          T: 0,
          phase: 'Melting (Ice + Water)',
          solid: 1 - fMelt, liquid: fMelt, gas: 0,
          ekFrac: 0, epFrac: 1,
          stage: 'melting',
          note: 'Temperature pauses at 0 °C: 100% of added energy (ΔH_fus = 334 J/g) breaks rigid crystal lattice attractions.'
        };
      }
      if (Q <= Q3) {
        return {
          T: ((Q - Q2) / (Q3 - Q2)) * 100,
          phase: 'Liquid Water',
          solid: 0, liquid: 1, gas: 0,
          ekFrac: 1, epFrac: 0,
          stage: 'liquid',
          note: 'All crystal bonds are broken. Added thermal energy increases molecular kinetic speed from 0 °C to 100 °C.'
        };
      }
      if (Q <= Q4) {
        var fBoil = (Q - Q3) / (Q4 - Q3);
        return {
          T: 100,
          phase: 'Boiling (Water + Steam)',
          solid: 0, liquid: 1 - fBoil, gas: fBoil,
          ekFrac: 0, epFrac: 1,
          stage: 'boiling',
          note: 'Temperature pauses at 100 °C: ΔH_vap = 2,260 J/g separates molecules completely into vapor (nearly 7× ΔH_fus).'
        };
      }
      return {
        T: 100 + ((Q - Q4) / (QMAX - Q4)) * 35,
        phase: 'Superheated Steam',
        solid: 0, liquid: 0, gas: 1,
        ekFrac: 1, epFrac: 0,
        stage: 'steam',
        note: 'All liquid is vaporized. Added heat once again increases gas kinetic energy and temperature above 100 °C.'
      };
    }

    function drawHeatingCurve(ctx, W, H, Q) {
      ctx.fillStyle = themePalette.canvasBg;
      ctx.fillRect(0, 0, W, H);
      drawGrid(ctx, 0, 0, W, H, 28);

      var st = evalWaterState(Q);
      var stacked = W < 540;
      var graphW = stacked ? W - 28 : Math.round(W * 0.65);
      var graphH = stacked ? Math.round(H * 0.58) : H - 48;
      var gx = 52;
      var gy = 22;
      var gw = Math.max(80, graphW - gx + 8);
      var gh = Math.max(80, graphH - gy);

      function mapX(qVal) { return gx + (qVal / QMAX) * gw; }
      function mapY(tVal) { return gy + gh - ((tVal + 30) / 175) * gh; }

      // Phase plateau horizontal guides
      [0, 100].forEach(function (tGuide) {
        var py = mapY(tGuide);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
        ctx.beginPath();
        ctx.moveTo(gx, py);
        ctx.lineTo(gx + gw, py);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 10.5px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(tGuide + '°C', gx - 7, py);
      });

      // Axes
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy + gh);
      ctx.lineTo(gx + gw, gy + gh);
      ctx.stroke();

      // Axis titles
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 10.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Heat Added Q (J/g for 1.0 g H₂O)', gx + gw * 0.5, gy + gh + 10);

      // Curve segments
      var segs = [
        { qA: 0, tA: -25, qB: Q1, tB: 0, col: '#60a5fa', label: 'Ice' },
        { qA: Q1, tA: 0, qB: Q2, tB: 0, col: '#2dd4bf', label: 'Melt (334 J/g)' },
        { qA: Q2, tA: 0, qB: Q3, tB: 100, col: '#38bdf8', label: 'Liquid' },
        { qA: Q3, tA: 100, qB: Q4, tB: 100, col: '#f59e0b', label: 'Boil (2,260 J/g)' },
        { qA: Q4, tA: 100, qB: QMAX, tB: 135, col: '#fb7185', label: 'Steam' }
      ];

      segs.forEach(function (seg) {
        ctx.beginPath();
        ctx.moveTo(mapX(seg.qA), mapY(seg.tA));
        ctx.lineTo(mapX(seg.qB), mapY(seg.tB));
        ctx.strokeStyle = seg.col;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      // Plateau labels
      ctx.font = '700 10px Inter, sans-serif';
      ctx.fillStyle = '#5eead4';
      ctx.textAlign = 'center';
      ctx.fillText('ΔH_fus', mapX((Q1 + Q2) * 0.5), mapY(0) + 12);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('ΔH_vap = 2,260 J/g (long plateau)', mapX((Q3 + Q4) * 0.5), mapY(100) - 16);

      // Operating point marker
      var cx = mapX(Q);
      var cy = mapY(st.T);
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, gy + gh);
      ctx.lineTo(cx, cy);
      ctx.lineTo(gx, cy);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Right / bottom telemetry bars: Phase Fraction + Kinetic vs Potential Energy
      var panelBox = stacked
        ? { x: 16, y: gy + gh + 32, w: W - 32, h: H - (gy + gh + 40) }
        : { x: gx + gw + 22, y: 18, w: W - (gx + gw + 36), h: H - 36 };

      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(panelBox.x, panelBox.y, panelBox.w, panelBox.h);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.strokeRect(panelBox.x, panelBox.y, panelBox.w, panelBox.h);

      var px = panelBox.x + 14;
      var pw = panelBox.w - 28;
      var py = panelBox.y + 14;

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Phase Composition', px, py);

      var barY = py + 18;
      var barH = 22;
      var wSolid = pw * st.solid;
      var wLiquid = pw * st.liquid;
      var wGas = pw * st.gas;
      if (wSolid > 0) {
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(px, barY, wSolid, barH);
      }
      if (wLiquid > 0) {
        ctx.fillStyle = '#2dd4bf';
        ctx.fillRect(px + wSolid, barY, wLiquid, barH);
      }
      if (wGas > 0) {
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(px + wSolid + wLiquid, barY, wGas, barH);
      }
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
      ctx.strokeRect(px, barY, pw, barH);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText(
        'Solid ' + Math.round(st.solid * 100) + '% · Liquid ' + Math.round(st.liquid * 100) + '% · Gas ' + Math.round(st.gas * 100) + '%',
        px, barY + barH + 6
      );

      // Energy destination bar
      var eTitleY = barY + barH + 30;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillText('Where New Heat Is Going Now', px, eTitleY);

      var eBarY = eTitleY + 18;
      if (st.ekFrac > 0) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px, eBarY, pw * st.ekFrac, barH);
      }
      if (st.epFrac > 0) {
        ctx.fillStyle = '#a78bfa';
        ctx.fillRect(px + pw * st.ekFrac, eBarY, pw * st.epFrac, barH);
      }
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
      ctx.strokeRect(px, eBarY, pw, barH);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText(
        st.ekFrac > 0.5
          ? '100% Kinetic Energy (ΔT rising)'
          : '100% Potential Energy (breaking attractions)',
        px, eBarY + barH + 6
      );
    }

    function updateHeatingUI(ctxArg, wArg, hArg) {
      var Q = slider ? Number(slider.value) : 580;
      var st = evalWaterState(Q);
      if (qValEl) qValEl.textContent = Q.toFixed(0) + ' J/g';
      if (tempValEl) tempValEl.textContent = st.T.toFixed(1) + ' °C';
      if (phaseValEl) phaseValEl.textContent = st.phase;
      if (evidenceEl) evidenceEl.textContent = st.note;
      var c = ctxArg || (surface && surface.ctx);
      var w = wArg || (surface && surface.width);
      var h = hArg || (surface && surface.height);
      if (c && w && h) drawHeatingCurve(c, w, h, Q);
    }

    var surface = SimKit.canvas2d(canvas, {
      height: 310,
      onResize: function (ctx, w, h) {
        updateHeatingUI(ctx, w, h);
      }
    });

    if (slider) slider.addEventListener('input', function () { updateHeatingUI(); });

    document.querySelectorAll('.heat-preset-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!slider) return;
        slider.value = btn.getAttribute('data-q');
        updateHeatingUI();
      });
    });

    var autoHeating = false;
    var heatLoop = SimKit.loop(function (dt) {
      if (!autoHeating || !slider) return;
      var next = Number(slider.value) + dt * 210;
      if (next > QMAX) next = 0;
      slider.value = String(Math.round(next));
      updateHeatingUI();
    }, { el: SimKit.stage(canvas), maxDt: 0.05 });
    heatLoop.pause();

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        autoHeating = !autoHeating;
        playBtn.textContent = autoHeating ? '⏸ Pause Heating' : '▶ Auto-Heat Sample';
        playBtn.setAttribute('aria-pressed', String(autoHeating));
        if (autoHeating) heatLoop.resume();
        else heatLoop.pause();
      });
    }

    updateHeatingUI();
  })();

  /* ═══════════════════════════════════════════════════════════════
     SIM 3 · PRESSURE–TEMPERATURE (P–T) PHASE DIAGRAM EXPLORER
     ═══════════════════════════════════════════════════════════════ */
  (function initPhaseDiagram() {
    var canvas = document.getElementById('pt-canvas');
    if (!canvas) return;

    var subEl = document.getElementById('ptSubstance');
    var tempEl = document.getElementById('ptTemp');
    var pressEl = document.getElementById('ptPress'); // log10(P_atm)
    var tempValEl = document.getElementById('ptTempVal');
    var pressValEl = document.getElementById('ptPressVal');
    var stateEl = document.getElementById('ptReadoutState');
    var descEl = document.getElementById('ptReadoutDesc');

    var MODELS = {
      water: {
        name: 'Water (H₂O)',
        tMin: -50, tMax: 440,
        logPMin: -3.0, logPMax: 2.6,
        Tt: 0.01, Pt: 0.00604,
        Tc: 374, Pc: 217.7,
        meltingSlopeNeg: true,
        // Melting boundary: T_melt(P) slopes left with rising P (water's density anomaly; slope amplified for visibility)
        meltT: function (logP) {
          var logPt = Math.log10(0.00604);
          if (logP <= logPt) return 0.01;
          return Math.max(-34, 0.01 - 6.5 * (logP - logPt));
        },
        // Vaporization boundary: log10(P) vs T between Triple (0.01, 0.00604) and Critical (374, 217.7)
        vapLogP: function (T) {
          var logPt = Math.log10(0.00604);
          var logPc = Math.log10(217.7);
          var f = clamp((T - 0.01) / (374 - 0.01), 0, 1);
          // Smooth Antoine-like progression passing through (100 °C, logP = 0)
          return lerp(logPt, logPc, Math.pow(f, 0.62));
        },
        subLogP: function (T) {
          var logPt = Math.log10(0.00604);
          return logPt + (T - 0.01) * 0.036;
        }
      },
      co2: {
        name: 'Carbon Dioxide (CO₂)',
        tMin: -100, tMax: 60,
        logPMin: -2.0, logPMax: 2.5,
        Tt: -56.6, Pt: 5.11,
        Tc: 31.1, Pc: 72.8,
        meltingSlopeNeg: false,
        meltT: function (logP) {
          var logPt = Math.log10(5.11);
          return -56.6 + Math.max(0, logP - logPt) * 14.5;
        },
        vapLogP: function (T) {
          var logPt = Math.log10(5.11);
          var logPc = Math.log10(72.8);
          var f = clamp((T - (-56.6)) / (31.1 - (-56.6)), 0, 1);
          return lerp(logPt, logPc, Math.pow(f, 0.85));
        },
        subLogP: function (T) {
          var logPt = Math.log10(5.11);
          // Normal sublimation at 1 atm (logP = 0) occurs at -78.5 °C
          var slope = logPt / (-56.6 - (-78.5));
          return logPt + (T - (-56.6)) * slope;
        }
      }
    };

    function getModel() {
      return MODELS[subEl ? subEl.value : 'water'] || MODELS.water;
    }

    function classifyPoint(m, T, logP) {
      var P = Math.pow(10, logP);
      if (T >= m.Tc && P >= m.Pc) {
        return {
          phase: 'Supercritical Fluid',
          detail: 'Above the critical point (' + m.Tc + ' °C, ' + m.Pc + ' atm): liquid and gas densities merge into one dense, fluid phase.'
        };
      }
      if (Math.abs(T - m.Tt) < 4 && Math.abs(logP - Math.log10(m.Pt)) < 0.2) {
        return {
          phase: 'Near Triple Point',
          detail: 'All three phases—solid, liquid, and gas—can coexist in equilibrium at (' + m.Tt + ' °C, ' + m.Pt + ' atm).'
        };
      }
      if (T < m.Tt) {
        var subP = m.subLogP(T);
        if (logP > subP) {
          var meltBound = m.meltT(logP);
          if (m.meltingSlopeNeg && T > meltBound) {
            return {
              phase: 'Liquid',
              detail: 'High pressure lowered ice’s melting point below 0 °C (water’s density anomaly), producing liquid water below freezing.'
            };
          }
          return { phase: 'Solid', detail: 'Low temperature and sufficient pressure keep particles locked in a crystal solid.' };
        }
        return { phase: 'Gas (Vapor)', detail: 'Below the sublimation curve: solid transforms directly into gas without forming a liquid.' };
      }
      // T >= Tt
      var tMelt = m.meltT(logP);
      if (T < tMelt && logP > Math.log10(m.Pt)) {
        return { phase: 'Solid', detail: 'Pressure exceeds the melting boundary at this temperature, stabilizing the solid crystal.' };
      }
      if (T <= m.Tc) {
        var vapP = m.vapLogP(T);
        if (logP >= vapP) {
          return { phase: 'Liquid', detail: 'Inside the liquid stability window between the melting and vaporization boundaries.' };
        }
        return { phase: 'Gas (Vapor)', detail: 'Pressure is below the vapor pressure curve, so the substance exists as a gas.' };
      }
      return { phase: 'Gas (Vapor)', detail: 'Above the critical temperature but below critical pressure: behaves as a compressible vapor.' };
    }

    var pad = { l: 60, r: 22, t: 24, b: 42 };

    function getPlotRect(W, H) {
      return { x: pad.l, y: pad.t, w: Math.max(80, W - pad.l - pad.r), h: Math.max(80, H - pad.t - pad.b) };
    }

    function drawPTDiagram(ctx, W, H) {
      var m = getModel();
      var T = tempEl ? Number(tempEl.value) : 20;
      var logP = pressEl ? Number(pressEl.value) : 0;
      var P = Math.pow(10, logP);
      var rect = getPlotRect(W, H);

      ctx.fillStyle = themePalette.canvasBg;
      ctx.fillRect(0, 0, W, H);
      drawGrid(ctx, rect.x, rect.y, rect.w, rect.h, 30);

      function tx(t) { return rect.x + ((t - m.tMin) / (m.tMax - m.tMin)) * rect.w; }
      function py(lp) { return rect.y + rect.h - ((lp - m.logPMin) / (m.logPMax - m.logPMin)) * rect.h; }

      var logPt = Math.log10(m.Pt);
      var logPc = Math.log10(m.Pc);

      // Subtle region fills
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();

      // Supercritical box
      var scX = tx(m.Tc);
      var scY = py(logPc);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.16)';
      ctx.fillRect(scX, rect.y, rect.x + rect.w - scX, scY - rect.y);

      // Solid polygon
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y);
      ctx.lineTo(tx(m.meltT(m.logPMax)), rect.y);
      for (var lp = m.logPMax; lp >= logPt; lp -= 0.1) {
        ctx.lineTo(tx(m.meltT(lp)), py(lp));
      }
      ctx.lineTo(tx(m.Tt), py(logPt));
      for (var tS = m.Tt; tS >= m.tMin; tS -= 3) {
        ctx.lineTo(tx(tS), py(m.subLogP(tS)));
      }
      ctx.lineTo(rect.x, rect.y + rect.h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(96, 165, 250, 0.14)';
      ctx.fill();

      // Liquid polygon
      ctx.beginPath();
      for (var lp2 = m.logPMax; lp2 >= logPt; lp2 -= 0.1) {
        var pxM = tx(m.meltT(lp2));
        var pyM = py(lp2);
        if (lp2 === m.logPMax) ctx.moveTo(pxM, pyM);
        else ctx.lineTo(pxM, pyM);
      }
      ctx.lineTo(tx(m.Tt), py(logPt));
      for (var tV = m.Tt; tV <= m.Tc; tV += 3) {
        ctx.lineTo(tx(tV), py(m.vapLogP(tV)));
      }
      ctx.lineTo(scX, rect.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(45, 212, 191, 0.14)';
      ctx.fill();

      // Gas region wash
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y + rect.h);
      for (var tS2 = m.tMin; tS2 <= m.Tt; tS2 += 3) {
        ctx.lineTo(tx(tS2), py(m.subLogP(tS2)));
      }
      for (var tV2 = m.Tt; tV2 <= m.Tc; tV2 += 3) {
        ctx.lineTo(tx(tV2), py(m.vapLogP(tV2)));
      }
      ctx.lineTo(rect.x + rect.w, scY);
      ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.10)';
      ctx.fill();

      // Normal 1 atm reference line (logP = 0)
      var y1atm = py(0);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rect.x, y1atm);
      ctx.lineTo(rect.x + rect.w, y1atm);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('1 atm (sea level)', rect.x + rect.w - 6, y1atm - 5);

      // Phase boundary curves
      ctx.lineWidth = 2.6;
      // Sublimation curve
      ctx.beginPath();
      for (var tSub = m.tMin; tSub <= m.Tt; tSub += 2) {
        var sx = tx(tSub);
        var sy = py(m.subLogP(tSub));
        if (tSub === m.tMin) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.lineTo(tx(m.Tt), py(logPt));
      ctx.strokeStyle = '#60a5fa';
      ctx.stroke();

      // Melting curve
      ctx.beginPath();
      ctx.moveTo(tx(m.Tt), py(logPt));
      for (var lp3 = logPt; lp3 <= m.logPMax; lp3 += 0.08) {
        ctx.lineTo(tx(m.meltT(lp3)), py(lp3));
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();

      // Vaporization curve
      ctx.beginPath();
      for (var tVap = m.Tt; tVap <= m.Tc; tVap += 2) {
        var vx = tx(tVap);
        var vy = py(m.vapLogP(tVap));
        if (tVap === m.Tt) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.lineTo(scX, scY);
      ctx.strokeStyle = '#2dd4bf';
      ctx.stroke();

      // Supercritical dashed bounds
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(scX, scY);
      ctx.lineTo(scX, rect.y);
      ctx.moveTo(scX, scY);
      ctx.lineTo(rect.x + rect.w, scY);
      ctx.stroke();
      ctx.restore();

      // Region text labels
      ctx.font = '800 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText('SOLID', tx(lerp(m.tMin, m.Tt, 0.55)), py(lerp(logPt, m.logPMax, 0.45)));
      ctx.fillStyle = '#5eead4';
      ctx.fillText('LIQUID', tx(lerp(m.Tt, m.Tc, 0.42)), py(lerp(logPt, logPc, 0.58)));
      ctx.fillStyle = '#fcd34d';
      ctx.fillText('GAS / VAPOR', tx(lerp(m.Tt, m.tMax, 0.55)), py(lerp(m.logPMin, logPt, 0.52)));
      ctx.fillStyle = '#d8b4fe';
      ctx.fillText('SUPERCRITICAL', lerp(scX, rect.x + rect.w, 0.5), lerp(rect.y, scY, 0.48));

      // Triple & Critical Points
      var tpX = tx(m.Tt);
      var tpY = py(logPt);
      ctx.beginPath();
      ctx.arc(tpX, tpY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.font = '700 10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Triple Pt', tpX + 8, tpY + 4);

      ctx.beginPath();
      ctx.arc(scX, scY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#c084fc';
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.textAlign = 'right';
      ctx.fillText('Critical Pt', scX - 8, scY - 6);

      // User selected (T, P) marker
      var ux = tx(T);
      var uy = py(logP);
      ctx.beginPath();
      ctx.arc(ux, uy, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ux, uy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fb7185';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Frame & Ticks
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      var tTicks = m.tMax > 100 ? [-50, 0, 100, 200, 300, 400] : [-100, -60, -20, 20, 60];
      tTicks.forEach(function (tk) {
        var xPos = tx(tk);
        ctx.fillText(tk + '°C', xPos, rect.y + rect.h + 6);
      });
      ctx.fillText('Temperature (°C)', rect.x + rect.w * 0.5, rect.y + rect.h + 23);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      [-2, -1, 0, 1, 2].forEach(function (lpTick) {
        if (lpTick < m.logPMin || lpTick > m.logPMax) return;
        var pLabel = lpTick < 0 ? String(Math.pow(10, lpTick)) : String(Math.pow(10, lpTick));
        ctx.fillText(pLabel, rect.x - 7, py(lpTick));
      });
      ctx.save();
      ctx.translate(14, rect.y + rect.h * 0.5);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('Pressure (atm, log scale)', 0, 0);
      ctx.restore();

      // DOM Readouts
      var info = classifyPoint(m, T, logP);
      if (tempValEl) tempValEl.textContent = T.toFixed(1) + ' °C';
      if (pressValEl) {
        pressValEl.textContent = P >= 10 ? P.toFixed(1) + ' atm' : P >= 0.1 ? P.toFixed(2) + ' atm' : P.toFixed(3) + ' atm';
      }
      if (stateEl) stateEl.textContent = info.phase;
      if (descEl) descEl.textContent = m.name + ' at ' + T.toFixed(1) + ' °C and ' + (pressValEl ? pressValEl.textContent : '') + ': ' + info.detail;
    }

    var surface = SimKit.canvas2d(canvas, {
      height: 320,
      onResize: function (ctx, w, h) {
        drawPTDiagram(ctx, w, h);
      }
    });

    function syncSubstanceBounds() {
      var m = getModel();
      if (!tempEl || !pressEl) return;
      tempEl.min = String(m.tMin);
      tempEl.max = String(m.tMax);
      pressEl.min = String(m.logPMin);
      pressEl.max = String(m.logPMax);
      if (Number(tempEl.value) < m.tMin || Number(tempEl.value) > m.tMax) {
        tempEl.value = m === MODELS.co2 ? '-20' : '20';
      }
      if (Number(pressEl.value) < m.logPMin || Number(pressEl.value) > m.logPMax) {
        pressEl.value = '0';
      }
    }

    function redraw() {
      drawPTDiagram(surface.ctx, surface.width, surface.height);
    }

    if (subEl) {
      subEl.addEventListener('change', function () {
        syncSubstanceBounds();
        redraw();
      });
    }
    if (tempEl) tempEl.addEventListener('input', redraw);
    if (pressEl) pressEl.addEventListener('input', redraw);

    document.querySelectorAll('.pt-preset-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var m = getModel();
        var key = btn.getAttribute('data-pt');
        if (key === 'room') {
          tempEl.value = '20';
          pressEl.value = '0';
        } else if (key === 'triple') {
          tempEl.value = String(m.Tt);
          pressEl.value = String(Math.log10(m.Pt).toFixed(2));
        } else if (key === 'critical') {
          tempEl.value = String(m.Tc);
          pressEl.value = String(Math.log10(m.Pc).toFixed(2));
        } else if (key === 'supercritical') {
          tempEl.value = String(Math.min(m.tMax - 5, Math.round(m.Tc + (m.tMax - m.Tc) * 0.45)));
          pressEl.value = String((Math.min(m.logPMax - 0.1, Math.log10(m.Pc) + 0.25)).toFixed(2));
        } else if (key === 'sublimate') {
          tempEl.value = m === MODELS.co2 ? '-78.5' : '-10';
          pressEl.value = m === MODELS.co2 ? '0' : '-2.5';
        }
        redraw();
      });
    });

    // Pointer click/drag directly on the phase diagram
    var dragging = false;
    function setFromPointer(ev) {
      var rectCss = canvas.getBoundingClientRect();
      var x = ev.clientX - rectCss.left;
      var y = ev.clientY - rectCss.top;
      var plot = getPlotRect(surface.width, surface.height);
      var m = getModel();
      var fx = clamp((x - plot.x) / plot.w, 0, 1);
      var fy = clamp(1 - (y - plot.y) / plot.h, 0, 1);
      tempEl.value = (m.tMin + fx * (m.tMax - m.tMin)).toFixed(1);
      pressEl.value = (m.logPMin + fy * (m.logPMax - m.logPMin)).toFixed(2);
      redraw();
    }
    canvas.addEventListener('pointerdown', function (ev) {
      dragging = true;
      if (canvas.setPointerCapture) canvas.setPointerCapture(ev.pointerId);
      setFromPointer(ev);
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (dragging) setFromPointer(ev);
    });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('pointercancel', function () { dragging = false; });

    syncSubstanceBounds();
    redraw();
  })();

  /* ═══════════════════════════════════════════════════════════════
     CHECK YOUR UNDERSTANDING (5 PRACTICE QUESTIONS)
     ═══════════════════════════════════════════════════════════════ */
  (function initPractice() {
    var QUESTIONS = [
      { id: 1, type: 'select', answer: 'intact' },
      { id: 2, type: 'select', answer: 'empty-space' },
      { id: 3, type: 'select', answer: 'stays-100' },
      { id: 4, type: 'select', answer: 'sublimes' },
      { id: 5, type: 'number', answer: 3340, tol: 25 }
    ];

    QUESTIONS.forEach(function (q) {
      var btn = document.getElementById('som-check-' + q.id);
      var input = document.getElementById('som-ans-' + q.id);
      var fb = document.getElementById('som-fb-' + q.id);
      var hint = document.getElementById('som-hint-' + q.id);
      if (!btn || !input || !fb) return;

      btn.addEventListener('click', function () {
        var ok = false;
        if (q.type === 'select') {
          ok = input.value === q.answer;
        } else {
          var raw = input.value.trim();
          var num = Number(raw);
          ok = raw !== '' && !Number.isNaN(num) && Math.abs(num - q.answer) <= q.tol;
        }

        if (ok) {
          fb.textContent = '✓ Correct!';
          fb.className = 'som-feedback ok';
          if (hint) hint.hidden = true;
        } else {
          fb.textContent = 'Not quite — check the hint below and try again.';
          fb.className = 'som-feedback err';
          if (hint) hint.hidden = false;
        }
      });
    });
  })();
})();
