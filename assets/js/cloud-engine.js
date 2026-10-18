/**
 * cloud-engine.js — Atmospheric Cloud, Smoke & Gas Physics Particle Engine
 * Mr. Scandrett's ClassroomOS
 *
 * Simulates fluid dynamics, thermal buoyancy, adiabatic expansion,
 * condensation at the Lifting Condensation Level (LCL), wind shear,
 * vortex turbulence, and game engine particle billows for:
 *   - Atmospheric Clouds (Cumulus, Cumulonimbus, Stratus Fog, Cirrus)
 *   - Combustion & Smoke (Chimney smoke, industrial stacks, campfires, volcanic ash)
 *   - Gases & Vapors (Water cycle evaporation, steam vents, heavy creeping gases)
 */
(function (global) {
  'use strict';

  // ── CONSTANTS & METEOROLOGICAL FORMULAS ─────────────────────────────────────
  const DRY_ADIABATIC_LAPSE_RATE_F = 5.4; // °F per 1,000 ft
  const DEW_POINT_LAPSE_RATE_F = 1.0;    // °F per 1,000 ft
  const LCL_SPREAD_RATE_F = 4.4;         // Spread closes at 4.4°F per 1,000 ft
  const DEFAULT_MAX_ALTITUDE_FT = 10000; // Sky height span in feet
  const SPRITE_SIZE = 128;               // Offscreen texture size in pixels

  /**
   * Calculates Lifting Condensation Level (LCL) in feet.
   * LCL (feet) ≈ ((Temp - DewPoint) / 4.4) * 1000
   */
  function calculateLCL(tempF, dewF) {
    const spread = Math.max(0, tempF - dewF);
    return Math.round((spread / LCL_SPREAD_RATE_F) * 1000);
  }

  // ── PROCEDURAL 3D VOLUMETRIC SPRITE GENERATOR (OFFSCREEN CACHE) ────────────
  let spriteCache = null;

  function makeCanvas(size = SPRITE_SIZE) {
    if (typeof document !== 'undefined' && document.createElement) {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      return c;
    }
    // Node.js headless fallback mock
    return {
      width: size,
      height: size,
      getContext: () => ({
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        scale: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        drawImage: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} })
      })
    };
  }

  /**
   * Generates a photorealistic 3D volumetric cloud billow with spherical normal lighting,
   * multi-octave cauliflower bump displacement, directional solar illumination, and forward Mie scattering.
   */
  function make3DVolumetricSprite(size, type = 'body') {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.46;

      // Sun Light Vector: upper-left (-0.55, -0.65, 0.52)
      const nlx = -0.55, nly = -0.65, nlz = 0.52;
      const lLen = Math.hypot(nlx, nly, nlz) || 1;
      const lx = nlx / lLen, ly = nly / lLen, lz = nlz / lLen;

      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const idx = (py * size + px) * 4;
          const dx = (px - cx) / radius;
          const dy = (py - cy) / radius;
          const distSq = dx * dx + dy * dy;

          if (distSq >= 1.0) {
            data[idx + 3] = 0;
            continue;
          }

          const dist = Math.sqrt(distSq);

          // Base spherical surface normal
          let nz = Math.sqrt(1.0 - distSq);
          let nx = dx;
          let ny = dy;

          // Multi-octave cauliflower bump displacement
          const b1 = Math.sin(dx * 8.0 + dy * 5.5) * 0.22 + Math.cos(dy * 7.0 - dx * 4.0) * 0.18;
          const b2 = Math.sin(dx * 16.0 - dy * 12.0) * 0.11 + Math.cos(dx * 14.0 + dy * 18.0) * 0.09;
          const b3 = Math.sin(dx * 32.0 + dy * 28.0) * 0.05;
          const bump = b1 + b2 + b3;

          nx += bump * 0.45;
          ny += bump * 0.45;
          nz = Math.max(0.08, nz + bump * 0.25);

          const nLen = Math.hypot(nx, ny, nz) || 1;
          nx /= nLen; ny /= nLen; nz /= nLen;

          // Directional diffuse lighting (N . L)
          const dot = nx * lx + ny * ly + nz * lz;
          const diffuse = Math.max(0, dot);

          // Vertical height in lobe (top faces direct sun, bottom faces ground shadow)
          const vertFactor = 0.5 - dy * 0.5; // 1 at top, 0 at bottom

          // Forward Mie scattering (silver lining rim highlight along sun-facing silhouette)
          const rim = Math.pow(1.0 - Math.abs(nz), 2.2) * Math.max(0, -dx * lx - dy * ly) * 1.5;

          // Soft edge density falloff
          const edgeAlpha = Math.pow(Math.cos(dist * Math.PI * 0.5), 1.15);

          let r, g, b, alpha;

          if (type === 'highlight') {
            // Sunlit Crown: brilliant ivory-white highlights with strong silver lining
            const lum = Math.min(1.0, 0.48 + diffuse * 0.52 + rim * 0.45);
            r = 255;
            g = Math.round(252 * lum + (1 - lum) * 235);
            b = Math.round(246 * lum + (1 - lum) * 220);
            alpha = edgeAlpha * Math.min(1.0, 0.55 + diffuse * 0.45 + rim * 0.45);
          } else if (type === 'shadow') {
            // Extinction Base / Underside: cool atmospheric slate blue-gray
            const lum = Math.max(0, 0.22 + diffuse * 0.35 + vertFactor * 0.3);
            r = Math.round(48 + lum * 70);
            g = Math.round(60 + lum * 75);
            b = Math.round(82 + lum * 85);
            alpha = edgeAlpha * 0.95;
          } else if (type === 'smoke_3d') {
            // Charcoal Soot Billow: deep turbulent self-shadowed ash
            const lum = Math.max(0, 0.18 + diffuse * 0.65 + vertFactor * 0.2);
            r = Math.round(38 + lum * 75);
            g = Math.round(40 + lum * 75);
            b = Math.round(46 + lum * 80);
            alpha = edgeAlpha * 0.92;
          } else if (type === 'ash') {
            // Volcanic Ash Plume Billow: heavy, gritty particulate billow with extinction shadow
            const lum = Math.max(0, 0.14 + diffuse * 0.72 + vertFactor * 0.24 + rim * 0.22);
            r = Math.round(36 + lum * 72);
            g = Math.round(34 + lum * 68);
            b = Math.round(38 + lum * 70);
            alpha = edgeAlpha * 0.96;
          } else if (type === 'pyroclastic') {
            // Churning pyroclastic surge: hot internal gas core, rolling dark ash mantle
            const coreDist = dist / 0.65;
            if (coreDist < 1.0) {
              const f = 1.0 - coreDist;
              r = Math.min(255, Math.round(220 + f * 35));
              g = Math.round(90 + f * 95);
              b = Math.round(25 + f * 40);
              alpha = edgeAlpha * 0.95;
            } else {
              const lum = Math.max(0, 0.16 + diffuse * 0.64 + vertFactor * 0.25);
              r = Math.round(52 + lum * 70);
              g = Math.round(42 + lum * 60);
              b = Math.round(36 + lum * 55);
              alpha = edgeAlpha * 0.94;
            }
          } else if (type === 'mono' || type === 'volumetric_mono') {
            // Volumetric Monochrome Mask (Ideal for Three.js PointsMaterial or custom canvas tinting)
            // Multiplying by vertex color preserves realistic 3D lighting, bumps, and rim
            const lum = Math.min(1.0, Math.max(0.18, 0.22 + diffuse * 0.62 + vertFactor * 0.22 + rim * 0.38));
            const val = Math.round(lum * 255);
            r = val; g = val; b = val;
            alpha = edgeAlpha * 0.96;
          } else if (type === 'golden' || type === 'sunset') {
            // Sunset Golden-Hour Cumulus: rich amber undertones, warm gold body, brilliant pale rim
            const lum = Math.min(1.2, 0.30 + diffuse * 0.65 + vertFactor * 0.35 + rim * 0.4);
            r = Math.min(255, Math.round(230 + lum * 25));
            g = Math.min(255, Math.round(150 + lum * 90));
            b = Math.min(255, Math.round(50 + lum * 140));
            alpha = edgeAlpha * 0.94;
          } else if (type === 'steam_3d' || type === 'steam') {
            // Volumetric Condensing Steam / Vapor with soft translucent cauliflower billows
            const lum = Math.min(1.0, 0.42 + diffuse * 0.52 + rim * 0.38);
            r = Math.round(238 + lum * 17);
            g = Math.round(244 + lum * 11);
            b = Math.round(252 + lum * 3);
            alpha = edgeAlpha * 0.78 * (0.35 + diffuse * 0.65);
          } else if (type === 'smoke_hot') {
            // Incandescent fire core fading into smoke
            const coreDist = dist / 0.7;
            if (coreDist < 1.0) {
              const f = 1.0 - coreDist;
              r = 255;
              g = Math.round(120 + f * 110);
              b = Math.round(20 + f * 60);
              alpha = edgeAlpha * (0.85 + f * 0.15);
            } else {
              const lum = Math.max(0, 0.2 + diffuse * 0.5);
              r = Math.round(50 + lum * 60);
              g = Math.round(45 + lum * 55);
              b = Math.round(45 + lum * 55);
              alpha = edgeAlpha * 0.85;
            }
          } else {
            // Main Volumetric Cloud Body:
            // Top and sunward sides catch warm diffuse illumination; underside in ambient shadow
            const lum = Math.min(1.2, 0.35 + diffuse * 0.6 + vertFactor * 0.25 + rim * 0.3);
            r = Math.min(255, Math.round(175 + lum * 80));
            g = Math.min(255, Math.round(190 + lum * 65));
            b = Math.min(255, Math.round(210 + lum * 45));
            alpha = edgeAlpha * 0.9;
          }

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(Math.max(0, Math.min(255, alpha * 255)));
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return c;
    }

  function initSpriteCache() {
    if (spriteCache) return spriteCache;

    spriteCache = {};

    // 1. Volumetric 3D Cumulus Billows
    spriteCache.cumulus_body = make3DVolumetricSprite(SPRITE_SIZE, 'body');
    spriteCache.cumulus_highlight = make3DVolumetricSprite(SPRITE_SIZE, 'highlight');
    spriteCache.cumulus_shadow = make3DVolumetricSprite(SPRITE_SIZE, 'shadow');
    spriteCache.cumulus = spriteCache.cumulus_body;
    spriteCache.cumulus_dark = spriteCache.cumulus_shadow;
    spriteCache.cumulus_golden = make3DVolumetricSprite(SPRITE_SIZE, 'golden');

    // 2. Volumetric 3D Smoke & Ash Plumes
    spriteCache.smoke = make3DVolumetricSprite(SPRITE_SIZE, 'smoke_3d');
    spriteCache.smoke_hot = make3DVolumetricSprite(SPRITE_SIZE, 'smoke_hot');
    spriteCache.ash = make3DVolumetricSprite(SPRITE_SIZE, 'ash');
    spriteCache.pyroclastic = make3DVolumetricSprite(SPRITE_SIZE, 'pyroclastic');
    spriteCache.volumetric_mono = make3DVolumetricSprite(SPRITE_SIZE, 'mono');
    spriteCache.steam = make3DVolumetricSprite(SPRITE_SIZE, 'steam_3d');

    // 3. Cirrus Wisp — Stretched 3D feathered ice-crystal wisp
    {
      const c = makeCanvas();
      const ctx = c.getContext('2d');
      const cx = SPRITE_SIZE / 2;
      const cy = SPRITE_SIZE / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(2.2, 0.4);
      const grad = ctx.createRadialGradient(-SPRITE_SIZE * 0.05, -SPRITE_SIZE * 0.05, 0, 0, 0, SPRITE_SIZE * 0.28);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
      grad.addColorStop(0.35, 'rgba(240, 248, 255, 0.65)');
      grad.addColorStop(0.7, 'rgba(215, 235, 255, 0.25)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, SPRITE_SIZE * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      spriteCache.cirrus = c;
    }

    // 5. Gas Plume — Smooth volumetric neutral puff for dynamic color tinting
    {
      const c = makeCanvas();
      const ctx = c.getContext('2d');
      const cx = SPRITE_SIZE / 2;
      const cy = SPRITE_SIZE / 2;
      const rad = SPRITE_SIZE * 0.46;

      const grad = ctx.createRadialGradient(cx * 0.9, cy * 0.9, 0, cx, cy, rad);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.65)');
      grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.25)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();

      spriteCache.gas = c;
    }

    // 6. Glowing Ember — Additive fiery spark
    {
      const c = makeCanvas();
      const ctx = c.getContext('2d');
      const cx = SPRITE_SIZE / 2;
      const cy = SPRITE_SIZE / 2;
      const rad = SPRITE_SIZE * 0.4;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.18, 'rgba(255, 225, 90, 0.95)');
      grad.addColorStop(0.45, 'rgba(255, 100, 20, 0.7)');
      grad.addColorStop(0.8, 'rgba(210, 40, 10, 0.25)');
      grad.addColorStop(1, 'rgba(180, 20, 10, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();

      spriteCache.ember = c;
    }

    // 7. Rain Streak — Directional falling raindrop
    {
      const c = makeCanvas();
      const ctx = c.getContext('2d');
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SPRITE_SIZE / 2, 10);
      ctx.lineTo(SPRITE_SIZE / 2, SPRITE_SIZE - 10);
      ctx.stroke();

      spriteCache.rain = c;
    }

    return spriteCache;
  }

  // ── BUILT-IN PRESETS ────────────────────────────────────────────────────────
  const PRESETS = {
    cumulus: {
      id: 'cumulus',
      name: 'Cumulus (Fair Weather)',
      description: 'Puffy convective clouds with crisp flat bases at the LCL condensation ceiling and billowing cauliflower heads.',
      category: 'cloud',
      maxParticles: 350,
      spawnRate: 4,
      spriteType: 'cumulus',
      particleLife: 14,
      initialSize: 32,
      growthRate: 3.2,
      maxSize: 130,
      buoyancy: -0.38, // Upward acceleration
      drag: 0.985,
      turbulence: 1.2,
      windSpeed: 4.5, // mph
      windAngle: 0,   // degrees (0 = West to East, blowing right)
      windShear: 0.8,
      cloudBaseFollowsLCL: true,
      phaseChange: true,
      hasRain: false,
      hasLightning: false,
      groundEmitters: 4,
      skyGradient: ['#0f284e', '#2563eb', '#60a5fa', '#bae6fd']
    },

    cumulonimbus: {
      id: 'cumulonimbus',
      name: 'Cumulonimbus (Thunderhead & Rain)',
      description: 'Massive towering storm cloud with violent convective updrafts, dark rain curtain, and spreading anvil top.',
      category: 'cloud',
      maxParticles: 500,
      spawnRate: 6,
      spriteType: 'cumulus',
      shadowSprite: 'cumulus_dark',
      particleLife: 18,
      initialSize: 45,
      growthRate: 4.5,
      maxSize: 180,
      buoyancy: -0.75, // Strong thermal updraft
      drag: 0.98,
      turbulence: 2.4,
      windSpeed: 8,
      windAngle: 0,
      windShear: 2.2, // Strong upper jet creates horizontal anvil blow-off
      cloudBaseFollowsLCL: true,
      phaseChange: true,
      hasRain: true,
      rainIntensity: 35,
      hasLightning: true,
      groundEmitters: 5,
      skyGradient: ['#090d16', '#1e293b', '#334155', '#475569']
    },

    stratus_fog: {
      id: 'stratus_fog',
      name: 'Stratus & Ground Fog',
      description: 'Low-hanging horizontal layer of microscopic water droplets with gentle laminar flow and high terrain coverage.',
      category: 'cloud',
      maxParticles: 320,
      spawnRate: 4,
      spriteType: 'steam',
      particleLife: 16,
      initialSize: 50,
      growthRate: 1.8,
      maxSize: 140,
      buoyancy: -0.04, // Very weak buoyant lift
      drag: 0.97,
      turbulence: 0.45,
      windSpeed: 2.0,
      windAngle: 0,
      windShear: 0.2,
      cloudBaseFollowsLCL: false,
      altitudeOffset: 0.12, // Close to surface
      phaseChange: false,
      hasRain: false,
      hasLightning: false,
      groundEmitters: 6,
      skyGradient: ['#1e293b', '#334155', '#64748b', '#94a3b8']
    },

    cirrus: {
      id: 'cirrus',
      name: 'Cirrus (High-Altitude Ice Wisps)',
      description: 'Delicate fibrous strands of pure ice crystals above 20,000 ft, stretched by high-altitude jet wind shear into mare\'s tails.',
      category: 'cloud',
      maxParticles: 200,
      spawnRate: 2,
      spriteType: 'cirrus',
      particleLife: 15,
      initialSize: 55,
      growthRate: 1.2,
      maxSize: 150,
      buoyancy: 0.0,
      drag: 0.99,
      turbulence: 0.6,
      windSpeed: 14.0,
      windAngle: 0,
      windShear: 1.5,
      cloudBaseFollowsLCL: false,
      altitudeOffset: 0.82, // Upper troposphere
      phaseChange: false,
      hasRain: false,
      hasLightning: false,
      groundEmitters: 3,
      skyGradient: ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc']
    },

    chimney_smoke: {
      id: 'chimney_smoke',
      name: 'Chimney / Industrial Plume',
      description: 'Hot buoyant combustion gases rising from a point source, entraining surrounding air into billowing vortices that bend downwind.',
      category: 'smoke',
      maxParticles: 280,
      spawnRate: 4,
      spriteType: 'smoke',
      particleLife: 10,
      initialSize: 14,
      growthRate: 4.8,
      maxSize: 120,
      buoyancy: -0.65, // Hot gas rises fast
      drag: 0.98,
      turbulence: 1.6,
      windSpeed: 5.5,
      windAngle: 0,
      windShear: 1.1,
      cloudBaseFollowsLCL: false,
      pointEmitter: true,
      emitterPos: { x: 0.25, y: 0.78 },
      phaseChange: false,
      hasRain: false,
      hasLightning: false,
      skyGradient: ['#1e293b', '#334155', '#475569', '#64748b']
    },

    volcano_ash: {
      id: 'volcano_ash',
      name: 'Volcano Explosive Ash Column',
      description: 'Massive pyroclastic eruption column rising thousands of feet, billowing into a dark umbrella cloud with glowing hot embers.',
      category: 'smoke',
      maxParticles: 450,
      spawnRate: 6,
      spriteType: 'smoke',
      emberSprite: 'ember',
      hasEmbers: true,
      emberRate: 3,
      particleLife: 16,
      initialSize: 22,
      growthRate: 5.2,
      maxSize: 170,
      buoyancy: -1.1, // Explosive vertical thrust
      drag: 0.978,
      turbulence: 2.8,
      windSpeed: 4.0,
      windAngle: 0,
      windShear: 1.6,
      cloudBaseFollowsLCL: false,
      pointEmitter: true,
      emitterPos: { x: 0.5, y: 0.88 },
      phaseChange: false,
      hasRain: false,
      hasLightning: false,
      skyGradient: ['#0f0502', '#260f08', '#451a03', '#78350f']
    },

    water_cycle_evaporation: {
      id: 'water_cycle_evaporation',
      name: 'Water Cycle: Evaporation to Cloud',
      description: 'Micro water vapor evaporates off water, rises buoyant through the air column, and condenses into a cloud bank at the LCL.',
      category: 'gas',
      maxParticles: 350,
      spawnRate: 4,
      spriteType: 'cumulus',
      vaporSprite: 'steam',
      particleLife: 14,
      initialSize: 18,
      growthRate: 3.5,
      maxSize: 110,
      buoyancy: -0.42,
      drag: 0.985,
      turbulence: 0.9,
      windSpeed: 3.5,
      windAngle: 0,
      windShear: 0.6,
      cloudBaseFollowsLCL: true,
      phaseChange: true,
      waterSurface: true,
      hasRain: true,
      rainIntensity: 18,
      groundEmitters: 4,
      skyGradient: ['#0369a1', '#0284c7', '#38bdf8', '#bae6fd']
    },

    campfire_smoke: {
      id: 'campfire_smoke',
      name: 'Campfire Smoke & Embers',
      description: 'Wisps of blue-gray woodsmoke curling lazily in gentle air currents with glowing sparks lifting from hot embers.',
      category: 'smoke',
      maxParticles: 200,
      spawnRate: 3,
      spriteType: 'smoke',
      emberSprite: 'ember',
      hasEmbers: true,
      emberRate: 2,
      particleLife: 9,
      initialSize: 10,
      growthRate: 4.0,
      maxSize: 85,
      buoyancy: -0.5,
      drag: 0.98,
      turbulence: 1.4,
      windSpeed: 2.5,
      windAngle: 0,
      windShear: 0.7,
      pointEmitter: true,
      emitterPos: { x: 0.5, y: 0.86 },
      skyGradient: ['#090d16', '#0f172a', '#1e293b', '#334155']
    },

    steam_vent: {
      id: 'steam_vent',
      name: 'High-Pressure Steam Jet',
      description: 'High-velocity geothermal or industrial steam escaping a nozzle, rapidly expanding and dissipating into ambient air.',
      category: 'gas',
      maxParticles: 260,
      spawnRate: 6,
      spriteType: 'steam',
      particleLife: 6,
      initialSize: 12,
      growthRate: 5.5,
      maxSize: 95,
      buoyancy: -0.85,
      drag: 0.965,
      turbulence: 2.0,
      windSpeed: 3.0,
      windAngle: 0,
      windShear: 0.8,
      pointEmitter: true,
      emitterPos: { x: 0.35, y: 0.86 },
      skyGradient: ['#0f172a', '#1e293b', '#334155', '#475569']
    },

    heavy_gas: {
      id: 'heavy_gas',
      name: 'Dense Creeping Gas (CO₂ / Vapor)',
      description: 'Dense, cold gas with negative buoyancy sinking to the ground, rolling across terrain depressions, and slowly diffusing.',
      category: 'gas',
      maxParticles: 280,
      spawnRate: 4,
      spriteType: 'gas',
      gasTint: 'rgba(52, 211, 153, 0.75)', // Emerald-green vapor
      particleLife: 15,
      initialSize: 25,
      growthRate: 2.2,
      maxSize: 100,
      buoyancy: 0.35, // Positive value = gravity pull downwards
      drag: 0.97,
      turbulence: 0.7,
      windSpeed: 2.0,
      windAngle: 0,
      windShear: 0.2,
      pointEmitter: true,
      emitterPos: { x: 0.2, y: 0.4 },
      skyGradient: ['#062e24', '#064e3b', '#065f46', '#047857']
    }
  };

  // ── PARTICLE OBJECT POOLING ─────────────────────────────────────────────────
  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.active = false;
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.size = 10;
      this.growth = 1;
      this.maxSize = 100;
      this.age = 0;
      this.life = 10;
      this.alpha = 0;
      this.maxAlpha = 0.85;
      this.rotation = 0;
      this.vRot = 0;
      this.sprite = 'cumulus';
      this.isEmber = false;
      this.isRain = false;
      this.condensed = false;
      this.tint = null;
    }
  }

  // ── CLOUD ENGINE CORE CLASS ─────────────────────────────────────────────────
  class CloudEngineSystem {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {Object} options
     */
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      this.options = Object.assign({}, options);

      // Environment & Thermodynamics
      this.surfaceTempF = options.tempF != null ? options.tempF : 75;
      this.dewPointF = options.dewPointF != null ? options.dewPointF : 55;
      this.maxAltitudeFt = options.maxAltitudeFt || DEFAULT_MAX_ALTITUDE_FT;
      this.lclFeet = calculateLCL(this.surfaceTempF, this.dewPointF);

      // Active Preset
      this.preset = PRESETS[options.preset] || PRESETS.cumulus;

      // Particle Pool
      this.maxParticles = this.options.maxParticles || this.preset.maxParticles || 400;
      this.pool = new Array(this.maxParticles);
      for (let i = 0; i < this.maxParticles; i++) {
        this.pool[i] = new Particle();
      }

      // Rain drop pool (for precipitation)
      this.maxRain = 120;
      this.rainPool = new Array(this.maxRain);
      for (let i = 0; i < this.maxRain; i++) {
        this.rainPool[i] = new Particle();
        this.rainPool[i].isRain = true;
      }

      // Wind & Physical Forces
      this.windSpeed = options.windSpeed != null ? options.windSpeed : this.preset.windSpeed;
      this.windAngle = options.windAngle != null ? options.windAngle : this.preset.windAngle;
      this.windShear = options.windShear != null ? options.windShear : this.preset.windShear;
      this.turbulence = options.turbulence != null ? options.turbulence : this.preset.turbulence;

      // Interaction & State
      this.interactive = options.interactive !== false;
      this.showLCL = options.showLCL !== false;
      this.showAltitudeGuide = options.showAltitudeGuide !== false;
      this.customEmitters = [];
      this.lightningTimer = 0;
      this.lightningFlash = 0;
      this.simTime = 0;
      this.running = false;
      this.rafId = null;
      this.lastTime = null;

      // Mouse / Touch disturbance
      this.mouse = { x: -1000, y: -1000, down: false, vx: 0, vy: 0, lastX: 0, lastY: 0 };

      // Initialize Sprite Textures
      initSpriteCache();

      // DPR and sizing setup
      this.width = canvas ? canvas.clientWidth || 800 : 800;
      this.height = canvas ? canvas.clientHeight || 450 : 450;
      this.dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.min(window.devicePixelRatio, 2) : 1;

      if (this.canvas) {
        this.initCanvasSizing();
        this.bindEvents();
      }

      this.applyPreset(this.preset);
      this.start();
    }

    initCanvasSizing() {
      if (typeof window !== 'undefined' && window.SimKit && window.SimKit.canvas2d) {
        this.simKitHelper = window.SimKit.canvas2d(this.canvas, {
          dpr: this.options.dpr || 2,
          onResize: (ctx, w, h) => {
            this.width = w;
            this.height = h;
          }
        });
        this.width = this.simKitHelper.width;
        this.height = this.simKitHelper.height;
      } else {
        this.resize();
        this.resizeHandler = () => this.resize();
        if (typeof window !== 'undefined') {
          window.addEventListener('resize', this.resizeHandler);
        }
      }
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const cssWidth = Math.max(1, Math.floor(rect.width || 800));
      const cssHeight = Math.max(1, Math.floor(rect.height || 450));
      this.width = cssWidth;
      this.height = cssHeight;
      this.dpr = Math.min(global.devicePixelRatio || 1, 2);

      this.canvas.width = Math.floor(cssWidth * this.dpr);
      this.canvas.height = Math.floor(cssHeight * this.dpr);
      if (this.ctx) {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }
    }

    bindEvents() {
      if (!this.canvas || !this.interactive) return;

      const getPos = (e) => {
        const r = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - r.left, y: clientY - r.top };
      };

      this.canvas.addEventListener('mousedown', (e) => {
        const pos = getPos(e);
        this.mouse.down = true;
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        this.mouse.lastX = pos.x;
        this.mouse.lastY = pos.y;
        this.triggerThermal(pos.x, pos.y);
      });

      this.canvas.addEventListener('mousemove', (e) => {
        const pos = getPos(e);
        this.mouse.vx = (pos.x - this.mouse.lastX) * 0.5;
        this.mouse.vy = (pos.y - this.mouse.lastY) * 0.5;
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        this.mouse.lastX = pos.x;
        this.mouse.lastY = pos.y;
      });

      const onUp = () => {
        this.mouse.down = false;
        this.mouse.x = -1000;
        this.mouse.y = -1000;
      };
      this.canvas.addEventListener('mouseup', onUp);
      this.canvas.addEventListener('mouseleave', onUp);

      // Touch support
      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          const pos = getPos(e);
          this.mouse.down = true;
          this.mouse.x = pos.x;
          this.mouse.y = pos.y;
          this.mouse.lastX = pos.x;
          this.mouse.lastY = pos.y;
          this.triggerThermal(pos.x, pos.y);
        }
      }, { passive: true });

      this.canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          const pos = getPos(e);
          this.mouse.vx = (pos.x - this.mouse.lastX) * 0.5;
          this.mouse.vy = (pos.y - this.mouse.lastY) * 0.5;
          this.mouse.x = pos.x;
          this.mouse.y = pos.y;
          this.mouse.lastX = pos.x;
          this.mouse.lastY = pos.y;
        }
      }, { passive: true });

      this.canvas.addEventListener('touchend', onUp);
    }

    /**
     * Spawns an interactive thermal updraft at (x, y)
     */
    triggerThermal(x, y) {
      for (let i = 0; i < 6; i++) {
        const p = this.allocParticle();
        if (!p) break;
        p.x = x + (Math.random() - 0.5) * 30;
        p.y = y + (Math.random() - 0.5) * 15;
        p.vx = (Math.random() - 0.5) * 1.5;
        p.vy = -2.5 - Math.random() * 2.0;
        p.size = this.preset.initialSize * 0.8;
        p.growth = this.preset.growthRate * 1.2;
        p.maxSize = this.preset.maxSize;
        p.life = this.preset.particleLife * 0.8;
        p.age = 0;
        p.alpha = 0.1;
        p.maxAlpha = 0.9;
        p.rotation = Math.random() * Math.PI * 2;
        p.vRot = (Math.random() - 0.5) * 0.04;
        p.sprite = this.preset.spriteType;
      }
    }

    /**
     * Converts an altitude in feet to Canvas Y coordinate.
     */
    altitudeToY(altFt) {
      const groundY = this.height - 25;
      const skyTopY = 20;
      const norm = Math.max(0, Math.min(1, altFt / this.maxAltitudeFt));
      return groundY - norm * (groundY - skyTopY);
    }

    /**
     * Converts a Canvas Y coordinate to altitude in feet.
     */
    yToAltitude(y) {
      const groundY = this.height - 25;
      const skyTopY = 20;
      const norm = (groundY - y) / (groundY - skyTopY);
      return Math.round(Math.max(0, norm * this.maxAltitudeFt));
    }

    allocParticle() {
      for (let i = 0; i < this.maxParticles; i++) {
        if (!this.pool[i].active) {
          this.pool[i].reset();
          this.pool[i].active = true;
          return this.pool[i];
        }
      }
      return null;
    }

    allocRainDrop() {
      for (let i = 0; i < this.maxRain; i++) {
        if (!this.rainPool[i].active) {
          this.rainPool[i].reset();
          this.rainPool[i].active = true;
          this.rainPool[i].isRain = true;
          return this.rainPool[i];
        }
      }
      return null;
    }

    /**
     * Changes active preset (e.g. 'cumulus', 'cumulonimbus', 'chimney_smoke')
     */
    setPreset(nameOrConfig) {
      const preset = typeof nameOrConfig === 'string' ? PRESETS[nameOrConfig] : nameOrConfig;
      if (!preset) return;
      this.preset = preset;
      this.applyPreset(preset);
    }

    applyPreset(preset) {
      // Clear active particles for clean transition
      for (let i = 0; i < this.maxParticles; i++) {
        this.pool[i].active = false;
      }
      for (let i = 0; i < this.maxRain; i++) {
        this.rainPool[i].active = false;
      }

      this.windSpeed = preset.windSpeed;
      this.windAngle = preset.windAngle;
      this.windShear = preset.windShear;
      this.turbulence = preset.turbulence;

      if (this.options.onPresetChange) {
        this.options.onPresetChange(preset);
      }
    }

    /**
     * Updates thermodynamic parameters (Temperature and Dew Point).
     */
    setThermodynamics({ tempF, dewPointF }) {
      if (tempF != null) this.surfaceTempF = Number(tempF);
      if (dewPointF != null) this.dewPointF = Number(dewPointF);
      this.lclFeet = calculateLCL(this.surfaceTempF, this.dewPointF);

      if (this.options.onLCLChange) {
        this.options.onLCLChange(this.lclFeet);
      }
    }

    /**
     * Updates wind parameters.
     * @param {number} speedMph
     * @param {number|string} angleOrCompass (e.g., 0, 90, 180, 270 or 'N', 'E', 'S', 'W')
     */
    setWind(speedMph, angleOrCompass = 0) {
      if (speedMph != null) this.windSpeed = Number(speedMph);

      if (typeof angleOrCompass === 'string') {
        const map = { N: 270, NE: 315, E: 0, SE: 45, S: 90, SW: 135, W: 180, NW: 225 };
        this.windAngle = map[angleOrCompass.toUpperCase()] || 0;
      } else if (angleOrCompass != null) {
        this.windAngle = Number(angleOrCompass);
      }
    }

    setTurbulence(val) {
      this.turbulence = Math.max(0, Number(val));
    }

    triggerLightning() {
      this.lightningFlash = 1.0;
    }

    /**
     * Synchronizes live readings from WeatherEngine
     */
    syncWithWeatherEngine(weatherData) {
      if (!weatherData) return;

      // Match preset to weather code if available first
      const code = weatherData.weatherCode;
      if (code != null) {
        if (code >= 95) {
          this.setPreset('cumulonimbus');
        } else if (code >= 51 && code <= 67) {
          this.setPreset('cumulonimbus'); // Rain showers
        } else if (code === 45 || code === 48) {
          this.setPreset('stratus_fog');
        } else if (code === 1 || code === 2) {
          this.setPreset('cumulus');
        } else if (code === 3) {
          this.setPreset('stratus_fog');
        }
      }

      // Then apply live thermodynamic and wind data
      if (weatherData.temperature != null && weatherData.dewPoint != null) {
        this.setThermodynamics({
          tempF: weatherData.temperature,
          dewPointF: weatherData.dewPoint
        });
      }
      if (weatherData.wind != null) {
        this.setWind(weatherData.wind, weatherData.windDirection || 0);
      }
    }

    // ── EMITTER SPAWNING ───────────────────────────────────────────────────────
    spawnParticles(dt) {
      const p = this.preset;
      const groundY = this.height - 25;
      const count = Math.ceil(p.spawnRate * dt * 25);

      for (let s = 0; s < count; s++) {
        let spawnX = 0;
        let spawnY = 0;

        if (p.pointEmitter && p.emitterPos) {
          spawnX = this.width * p.emitterPos.x + (Math.random() - 0.5) * 8;
          spawnY = this.height * p.emitterPos.y;
        } else if (p.waterSurface) {
          // Evaporation across entire water body
          spawnX = Math.random() * this.width;
          spawnY = groundY - 2;
        } else if (p.altitudeOffset != null) {
          // Pre-placed layer like Stratus or Cirrus
          spawnX = Math.random() * (this.width + 100) - 50;
          spawnY = this.height * (1 - p.altitudeOffset) + (Math.random() - 0.5) * 40;
        } else {
          // Ground thermals (patches where sun warms the ground)
          const emitterIdx = Math.floor(Math.random() * (p.groundEmitters || 4));
          const step = this.width / ((p.groundEmitters || 4) + 1);
          const baseCenter = step * (emitterIdx + 1);
          spawnX = baseCenter + (Math.random() - 0.5) * (step * 0.6);
          spawnY = groundY - 5;
        }

        const particle = this.allocParticle();
        if (!particle) break;

        particle.x = spawnX;
        particle.y = spawnY;
        particle.vx = (Math.random() - 0.5) * 0.4;
        particle.vy = p.buoyancy ? (p.buoyancy * (0.8 + Math.random() * 0.4)) : -0.2;
        particle.size = p.initialSize * (0.8 + Math.random() * 0.4);
        particle.growth = p.growthRate;
        particle.maxSize = p.maxSize * (0.8 + Math.random() * 0.4);
        particle.life = p.particleLife * (0.85 + Math.random() * 0.3);
        particle.age = 0;
        particle.rotation = Math.random() * Math.PI * 2;
        particle.vRot = (Math.random() - 0.5) * 0.03;
        particle.tint = p.gasTint || null;

        // In water cycle or cumulus with phaseChange, start faint/invisible until LCL
        if (p.phaseChange) {
          const lclY = this.altitudeToY(this.lclFeet);
          if (particle.y > lclY) {
            particle.condensed = false;
            particle.alpha = 0.04;
            particle.maxAlpha = 0.12; // Vapor shimmer
            particle.sprite = p.vaporSprite || 'steam';
          } else {
            particle.condensed = true;
            particle.alpha = 0.2;
            particle.maxAlpha = 0.88;
            particle.sprite = p.spriteType;
          }
        } else {
          particle.condensed = true;
          particle.alpha = 0.1;
          particle.maxAlpha = 0.85;
          particle.sprite = p.spriteType;
        }

        // Volcanic or campfire glowing embers
        if (p.hasEmbers && Math.random() < 0.25) {
          const ember = this.allocParticle();
          if (ember) {
            ember.x = spawnX;
            ember.y = spawnY;
            ember.vx = (Math.random() - 0.5) * 2.2;
            ember.vy = p.buoyancy * 1.5 - Math.random() * 1.5;
            ember.size = 6 + Math.random() * 6;
            ember.growth = -0.3; // Embers shrink as they burn out
            ember.maxSize = 12;
            ember.life = 3.5 + Math.random() * 2.5;
            ember.age = 0;
            ember.alpha = 1.0;
            ember.maxAlpha = 1.0;
            ember.isEmber = true;
            ember.sprite = p.emberSprite || 'ember';
          }
        }
      }

      // Spawning rain in Cumulonimbus or Water Cycle
      if (p.hasRain) {
        const rainDrops = Math.ceil((p.rainIntensity || 20) * dt * 8);
        const lclY = this.altitudeToY(this.lclFeet);
        for (let r = 0; r < rainDrops; r++) {
          const drop = this.allocRainDrop();
          if (!drop) break;
          // Rain falls from under the cloud base
          drop.x = this.width * 0.25 + Math.random() * (this.width * 0.5);
          drop.y = lclY + 10 + Math.random() * 30;
          drop.vx = (this.windSpeed * 0.2);
          drop.vy = 12 + Math.random() * 6; // High terminal velocity
          drop.size = 24;
          drop.life = 2.0;
          drop.age = 0;
          drop.alpha = 0.6;
          drop.sprite = 'rain';
        }
      }
    }

    // ── SIMULATION STEP (FLUID & PARTICLE PHYSICS) ──────────────────────────────
    update(dt) {
      this.simTime += dt;
      const groundY = this.height - 25;
      const lclY = this.altitudeToY(this.lclFeet);

      // Fade lightning flash
      if (this.lightningFlash > 0) {
        this.lightningFlash = Math.max(0, this.lightningFlash - dt * 2.5);
      } else if (this.preset.hasLightning) {
        // Random atmospheric lightning discharges in severe storms
        this.lightningTimer += dt;
        if (this.lightningTimer > 7 + Math.random() * 5) {
          this.triggerLightning();
          this.lightningTimer = 0;
        }
      }

      // Spawn new particles
      this.spawnParticles(dt);

      // Global Wind vectors
      const windRad = (this.windAngle * Math.PI) / 180;
      const baseWindX = Math.cos(windRad) * this.windSpeed * 0.75;
      const baseWindY = Math.sin(windRad) * this.windSpeed * 0.75;

      // Update regular particles
      for (let i = 0; i < this.maxParticles; i++) {
        const p = this.pool[i];
        if (!p.active) continue;

        p.age += dt;
        if (p.age >= p.life) {
          p.active = false;
          continue;
        }

        const progress = p.age / p.life;

        // Size expansion over time (fluid diffusion)
        if (p.growth > 0) {
          p.size = Math.min(p.maxSize, p.size + p.growth * dt * 24);
        } else {
          p.size = Math.max(1, p.size + p.growth * dt * 20);
        }

        p.rotation += p.vRot;

        // Altitude wind shear: wind speed increases with height above ground
        const altNorm = Math.max(0, Math.min(1, (groundY - p.y) / (groundY - 20)));
        const shearFactor = 1.0 + (this.windShear * altNorm * 1.5);
        const windX = baseWindX * shearFactor;
        const windY = baseWindY * shearFactor;

        // Vortex / Eddy turbulence (multi-frequency curl field)
        const turbFreq = 0.007;
        const turbTime = this.simTime * 0.9;
        const eddyX = (Math.sin(p.y * turbFreq + turbTime) * 1.6 + Math.cos(p.y * turbFreq * 2 - turbTime) * 0.8) * this.turbulence;
        const eddyY = (Math.cos(p.x * turbFreq + turbTime) * 1.2 - Math.sin(p.x * turbFreq * 2 + turbTime) * 0.6) * this.turbulence;

        // Buoyant acceleration (warm smoke or latent heat boost)
        let buoy = this.preset.buoyancy || -0.2;
        if (p.isEmber) buoy = -0.1; // Embers suffer gravity

        // Phase change dynamics: invisible water vapor condensing at LCL!
        if (this.preset.phaseChange) {
          if (!p.condensed && p.y <= lclY) {
            // Crossed the Lifting Condensation Level!
            p.condensed = true;
            p.sprite = this.preset.spriteType;
            p.maxAlpha = 0.88;
            p.alpha = Math.max(p.alpha, 0.4);
            // Latent heat boost: condensation accelerates updraft
            p.vy -= 0.6;
          } else if (p.condensed && p.y > lclY + 15) {
            // Sunk below condensation level: evaporate back to vapor
            p.condensed = false;
            p.sprite = this.preset.vaporSprite || 'steam';
            p.maxAlpha = 0.15;
          }
        }

        // Apply acceleration & forces
        p.vx += (windX + eddyX) * dt * 1.2;
        p.vy += (buoy + eddyY + windY) * dt * 1.5;

        // Drag / air resistance
        p.vx *= this.preset.drag || 0.98;
        p.vy *= this.preset.drag || 0.98;

        // Interactive mouse push disturbance
        if (this.interactive && this.mouse.down) {
          const dx = p.x - this.mouse.x;
          const dy = p.y - this.mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 10000 && distSq > 1) { // 100px radius
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / 100) * 8;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Integrate position
        p.x += p.vx * dt * 45;
        p.y += p.vy * dt * 45;

        // Smooth fade-in and fade-out envelope
        if (progress < 0.15) {
          p.alpha = (progress / 0.15) * p.maxAlpha;
        } else if (progress > 0.65) {
          p.alpha = ((1 - progress) / 0.35) * p.maxAlpha;
        } else {
          p.alpha = p.maxAlpha;
        }

        // Boundary handling: wrap horizontally or kill if way off screen
        if (p.x < -100) p.x = this.width + 50;
        if (p.x > this.width + 100) p.x = -50;
        if (p.y < -150 || p.y > this.height + 50) {
          p.active = false;
        }
      }

      // Update rain particles
      for (let r = 0; r < this.maxRain; r++) {
        const drop = this.rainPool[r];
        if (!drop.active) continue;

        drop.age += dt;
        drop.x += (baseWindX * 0.4 + drop.vx) * dt * 50;
        drop.y += drop.vy * dt * 50;

        if (drop.y >= groundY) {
          drop.active = false;
        }
      }
    }

    // ── RENDERING PASSES ────────────────────────────────────────────────────────
    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const groundY = h - 25;
      const lclY = this.altitudeToY(this.lclFeet);
      const cache = initSpriteCache();

      // Clear Canvas
      ctx.clearRect(0, 0, w, h);

      // 1. Sky Background Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      const colors = this.preset.skyGradient || ['#0a192f', '#1e293b', '#334155'];
      for (let i = 0; i < colors.length; i++) {
        skyGrad.addColorStop(i / (colors.length - 1), colors[i]);
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Lightning screen flash
      if (this.lightningFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningFlash * 0.75})`;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Altitude Scale & LCL Guide Line
      if (this.showAltitudeGuide) {
        this.renderAltitudeGuides(ctx, w, h, groundY);
      }

      if (this.showLCL && (this.preset.cloudBaseFollowsLCL || this.preset.phaseChange)) {
        this.renderLCLIndicator(ctx, w, lclY);
      }

      // 3. Emitter Graphics (Chimney, Volcano caldera, or Ocean water)
      this.renderLandscape(ctx, w, h, groundY);

      // 4. Render Rain Droplets
      if (this.preset.hasRain && cache && cache.rain) {
        ctx.save();
        for (let r = 0; r < this.maxRain; r++) {
          const drop = this.rainPool[r];
          if (!drop.active) continue;
          ctx.globalAlpha = drop.alpha;
          ctx.drawImage(cache.rain, drop.x, drop.y, 2, drop.size);
        }
        ctx.restore();
      }

      // 5. Render Volumetric 3D Cloud & Smoke Particles (Multi-Tier Depth Passes)
      if (cache) {
        // Collect active particles
        const actives = [];
        for (let i = 0; i < this.maxParticles; i++) {
          if (this.pool[i].active) actives.push(this.pool[i]);
        }

        // Sort into depth tiers so dark underside shadows render first,
        // followed by the core 3D volume, and finally the sunlit tops and rims!
        actives.sort((a, b) => b.y - a.y); // Draw bottom/base first, top/crowns on top

        for (let i = 0; i < actives.length; i++) {
          const p = actives[i];
          let spr = cache[p.sprite] || cache.cumulus;

          // For clouds with volumetric depth:
          if (p.sprite === 'cumulus' || p.sprite === 'cumulus_body') {
            const distAboveLCL = lclY - p.y;
            if (distAboveLCL < 25) {
              // Underside / Base Tier: dark light-extinction shadow
              spr = cache.cumulus_shadow;
            } else if (distAboveLCL > 90 || p.vy < -0.8) {
              // Top Crown Tier: direct sunlit highlight with silver lining
              spr = cache.cumulus_highlight;
            } else {
              // Mid-body Tier: 3D illuminated cauliflower body
              spr = cache.cumulus_body;
            }
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

          if (p.isEmber) {
            ctx.globalCompositeOperation = 'lighter';
          }

          ctx.translate(p.x, p.y);
          if (p.rotation) ctx.rotate(p.rotation);

          const displaySize = p.size * (this.options.particleRenderScale || 1);
          const half = displaySize / 2;
          ctx.drawImage(spr, -half, -half, displaySize, displaySize);
          ctx.restore();
        }
      }

      // 6. Terrain Foreground Bar
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, groundY, w, 25);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, groundY, w, 3);
    }

    renderAltitudeGuides(ctx, w, h, groundY) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

      const stepFt = 2000;
      for (let alt = 2000; alt < this.maxAltitudeFt; alt += stepFt) {
        const y = this.altitudeToY(alt);
        ctx.beginPath();
        ctx.setLineDash([4, 6]);
        ctx.moveTo(35, y);
        ctx.lineTo(w - 10, y);
        ctx.stroke();

        ctx.fillText(`${alt.toLocaleString()} FT`, 8, y + 3);
      }
      ctx.restore();
    }

    renderLCLIndicator(ctx, w, lclY) {
      ctx.save();
      ctx.strokeStyle = '#00d9f5';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);

      ctx.beginPath();
      ctx.moveTo(0, lclY);
      ctx.lineTo(w, lclY);
      ctx.stroke();

      // Badge label
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0, 217, 245, 0.18)';
      ctx.strokeStyle = 'rgba(0, 217, 245, 0.45)';
      ctx.lineWidth = 1;
      const badgeW = 210;
      const badgeH = 20;
      const badgeX = w - badgeW - 12;
      const badgeY = lclY - 24;

      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00d9f5';
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillText(`LCL CLOUD BASE: ${this.lclFeet.toLocaleString()} FT`, badgeX + 8, badgeY + 14);
      ctx.restore();
    }

    renderLandscape(ctx, w, h, groundY) {
      if (this.preset.id === 'chimney_smoke') {
        // Draw cute school / cottage rooftop with smoking chimney
        const emX = w * (this.preset.emitterPos ? this.preset.emitterPos.x : 0.25);
        ctx.save();
        ctx.fillStyle = '#7f1d1d'; // Brick chimney
        ctx.fillRect(emX - 10, groundY - 45, 20, 45);
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(emX - 13, groundY - 50, 26, 6);

        // Roof slope
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(emX - 70, groundY);
        ctx.lineTo(emX - 5, groundY - 55);
        ctx.lineTo(emX + 60, groundY);
        ctx.fill();
        ctx.restore();
      } else if (this.preset.id === 'volcano_ash') {
        // Volcanic caldera cone
        const emX = w * 0.5;
        ctx.save();
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.moveTo(emX - 160, groundY);
        ctx.lineTo(emX - 35, groundY - 55);
        ctx.lineTo(emX + 35, groundY - 55);
        ctx.lineTo(emX + 160, groundY);
        ctx.fill();

        // Glowing magma crater
        const magmaGrad = ctx.createLinearGradient(emX, groundY - 55, emX, groundY - 45);
        magmaGrad.addColorStop(0, '#f97316');
        magmaGrad.addColorStop(1, '#ef4444');
        ctx.fillStyle = magmaGrad;
        ctx.fillRect(emX - 30, groundY - 55, 60, 6);
        ctx.restore();
      } else if (this.preset.waterSurface) {
        // Ocean / Lake water body
        ctx.save();
        const waterGrad = ctx.createLinearGradient(0, groundY - 8, 0, groundY + 25);
        waterGrad.addColorStop(0, '#0284c7');
        waterGrad.addColorStop(1, '#0369a1');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, groundY - 8, w, 33);

        // Gentle surface shimmer
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const sx = (this.simTime * 20 + i * 110) % w;
          ctx.beginPath();
          ctx.moveTo(sx, groundY - 4);
          ctx.lineTo(sx + 25, groundY - 4);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // ── MAIN LOOP LIFECYCLE ───────────────────────────────────────────────────
    start() {
      if (this.running) return;
      this.running = true;
      this.lastTime = null;

      const tick = (timestamp) => {
        if (!this.running) return;
        if (this.lastTime === null) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        this.rafId = (typeof window !== 'undefined') ? window.requestAnimationFrame(tick) : null;
      };

      if (typeof window !== 'undefined' && window.SimKit && window.SimKit.loop) {
        this.simKitLoop = window.SimKit.loop((dt) => {
          this.update(Math.min(dt, 0.1));
          this.render();
        });
      } else if (typeof window !== 'undefined') {
        this.rafId = window.requestAnimationFrame(tick);
      }
    }

    stop() {
      this.running = false;
      if (this.simKitLoop && this.simKitLoop.pause) {
        this.simKitLoop.pause();
      }
      if (this.rafId && typeof window !== 'undefined') {
        window.cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    destroy() {
      this.stop();
      if (this.simKitHelper && this.simKitHelper.destroy) {
        this.simKitHelper.destroy();
      }
      if (this.resizeHandler && typeof window !== 'undefined') {
        window.removeEventListener('resize', this.resizeHandler);
      }
      if (this.canvas) {
        this.canvas.replaceWith(this.canvas.cloneNode(true));
      }
    }
  }

  /**
   * Renders a realistic, volumetric 3D cloud cluster with directional sunlight,
   * organic cauliflower billows, and dark self-shadowed base onto any Canvas 2D context.
   * @param {CanvasRenderingContext2D} ctx - Target canvas 2D context
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} width - Approximate cloud width
   * @param {number} height - Approximate cloud height
   * @param {Object} options - Configuration options (darkBase, storm, time, etc.)
   */
  function renderCloudCluster(ctx, cx, cy, width, height, options = {}) {
    const cache = initSpriteCache();
    if (!cache) return;

    const time = options.time || 0;
    const isStorm = !!options.storm;
    const isGolden = !!options.golden || options.tint === 'sunset' || options.tint === 'golden';
    const isAsh = options.tint === 'ash';
    const isSteam = options.tint === 'steam';
    const hasDarkBase = options.darkBase !== false;
    const alpha = options.opacity != null ? options.opacity : 1.0;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Select sprite sets based on cluster atmosphere
    let baseSpr = cache.cumulus_shadow;
    let bodySpr = cache.cumulus_body;
    let crownSpr = cache.cumulus_highlight;

    if (isGolden) {
      bodySpr = cache.cumulus_golden;
      crownSpr = cache.cumulus_highlight;
    } else if (isStorm) {
      bodySpr = cache.cumulus_shadow;
      crownSpr = cache.cumulus_body;
    } else if (isAsh) {
      baseSpr = cache.smoke;
      bodySpr = cache.ash;
      crownSpr = cache.ash;
    } else if (isSteam) {
      baseSpr = cache.steam;
      bodySpr = cache.steam;
      crownSpr = cache.steam;
    }

    // Hierarchical multi-tier billow layout:
    // Pass 1: Dark Extinction Base (anchored near cloud floor)
    const baseWidth = width * 0.92;
    const basePuffs = 7;
    if (hasDarkBase || isStorm || isAsh) {
      for (let i = 0; i < basePuffs; i++) {
        const u = (i / (basePuffs - 1)) - 0.5; // -0.5 to +0.5
        const px = cx + u * baseWidth + Math.sin(time * 0.4 + i) * 3;
        const py = cy + height * 0.22 + Math.cos(time * 0.35 + i) * 2;
        const pSize = height * (isStorm || isAsh ? 0.95 : 0.72);
        ctx.globalAlpha = alpha * 0.88;
        ctx.drawImage(baseSpr, px - pSize / 2, py - pSize / 2, pSize, pSize);
      }
    }

    // Pass 2: Main Convective Mid-Body Lobes (3D Normal Lit)
    const midPuffs = 9;
    for (let i = 0; i < midPuffs; i++) {
      const u = (i / (midPuffs - 1)) - 0.5;
      const arc = 1 - u * u * 3.8; // Parabolic dome
      const px = cx + u * width * 0.85 + Math.cos(time * 0.5 + i * 1.5) * 4;
      const py = cy - arc * height * 0.25 + Math.sin(time * 0.45 + i * 1.2) * 3;
      const pSize = height * (0.8 + Math.max(0, arc) * 0.35);
      ctx.globalAlpha = alpha * 0.94;
      ctx.drawImage(bodySpr, px - pSize / 2, py - pSize / 2, pSize, pSize);
    }

    // Pass 3: Sunlit Cauliflower Tops & Highlights
    const crownPuffs = 6;
    for (let i = 0; i < crownPuffs; i++) {
      const u = ((i + 0.5) / crownPuffs) - 0.5;
      const arc = Math.max(0, 1 - u * u * 3.6);
      const px = cx + u * width * 0.65 + Math.sin(time * 0.6 + i * 2.1) * 3;
      const py = cy - height * 0.35 - arc * height * 0.38 + Math.cos(time * 0.5 + i * 1.8) * 3;
      const pSize = height * (0.7 + arc * 0.38);
      ctx.globalAlpha = alpha * 0.98;
      ctx.drawImage(crownSpr, px - pSize / 2, py - pSize / 2, pSize, pSize);
    }

    ctx.restore();
  }

  // ── FACTORY API ─────────────────────────────────────────────────────────────
  const CloudEngine = {
    PRESETS,
    DRY_ADIABATIC_LAPSE_RATE_F,
    DEW_POINT_LAPSE_RATE_F,
    LCL_SPREAD_RATE_F,
    calculateLCL,
    renderCloudCluster,

    /**
     * Retrieves a cached 3D volumetric sprite canvas by name.
     * @param {string} name - 'cumulus', 'cumulus_highlight', 'cumulus_shadow', 'cumulus_golden', 'smoke', 'smoke_hot', 'ash', 'pyroclastic', 'steam', 'volumetric_mono', 'cirrus'
     * @returns {HTMLCanvasElement|null}
     */
    getSprite(name) {
      const cache = initSpriteCache();
      return cache ? cache[name] || cache.cumulus_body : null;
    },

    /**
     * Generates a new standalone volumetric sprite canvas of the requested size and type.
     * @param {number} size
     * @param {string} type - 'body', 'highlight', 'shadow', 'golden', 'smoke_3d', 'smoke_hot', 'ash', 'pyroclastic', 'steam_3d', 'mono'
     * @returns {HTMLCanvasElement}
     */
    makeVolumetricSprite(size, type = 'body') {
      initSpriteCache();
      return make3DVolumetricSprite(size, type);
    },

    /**
     * Creates an optimized Three.js CanvasTexture from a volumetric 3D sprite.
     * @param {Object} THREE - Three.js namespace
     * @param {string} type - 'mono', 'ash', 'pyroclastic', 'smoke_3d', 'steam_3d', 'body', 'golden'
     * @param {number} size - texture width and height
     * @returns {THREE.CanvasTexture|null}
     */
    createThreeTexture(THREE, type = 'mono', size = 128) {
      if (!THREE || !THREE.CanvasTexture) return null;
      initSpriteCache();
      const canvas = make3DVolumetricSprite(size, type);
      const tex = new THREE.CanvasTexture(canvas);
      if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    },

    /**
     * Instantiates and attaches a CloudEngine simulation to a canvas element.
     * @param {HTMLCanvasElement|string} canvasOrId
     * @param {Object} options
     * @returns {CloudEngineSystem}
     */
    attach(canvasOrId, options = {}) {
      const canvas = typeof canvasOrId === 'string' ? document.getElementById(canvasOrId) : canvasOrId;
      if (!canvas) {
        console.warn(`[CloudEngine] Canvas element not found:`, canvasOrId);
        return null;
      }
      return new CloudEngineSystem(canvas, options);
    },

    System: CloudEngineSystem
  };

  // ── EXPORT GLOBALLY ─────────────────────────────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudEngine;
  }
  global.CloudEngine = CloudEngine;

})(typeof window !== 'undefined' ? window : globalThis);
