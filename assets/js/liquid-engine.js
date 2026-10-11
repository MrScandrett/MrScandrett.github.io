/**
 * LiquidEngine — small, shared liquid-motion primitives for ClassroomOS.
 *
 * This is deliberately a lightweight depiction/interaction engine, not a
 * general-purpose Navier–Stokes solver. It combines a 1-D shallow-water
 * surface model with bounded particles so lakes, rain, lava, honey, and
 * underwater accents can share stable motion and material vocabulary without
 * bringing in a physics dependency.
 *
 * Browser: window.LiquidEngine
 * Node:    require('./liquid-engine.js')
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LiquidEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TAU = Math.PI * 2;
  const MATERIALS = {
    water: {
      kind: 'water',
      density: 1000, viscosity: 0.08, spring: 0.42, damping: 1.65, spread: 0.24,
      color: '#1878c9', deepColor: '#073b88', highlight: 'rgba(210,245,255,.72)',
      flow: 0.18, gravity: 1, particleDrag: 0.02, glow: 'rgba(70,180,255,.12)'
    },
    lava: {
      kind: 'lava',
      density: 2700, viscosity: 0.72, spring: 0.18, damping: 3.2, spread: 0.12,
      color: '#f04a18', deepColor: '#6e160b', highlight: 'rgba(255,224,112,.8)',
      flow: 0.08, gravity: 0.55, particleDrag: 0.18, glow: 'rgba(255,72,16,.3)'
    },
    honey: {
      kind: 'honey',
      density: 1420, viscosity: 0.92, spring: 0.12, damping: 4.5, spread: 0.08,
      color: '#d89018', deepColor: '#6b3508', highlight: 'rgba(255,235,137,.72)',
      flow: 0.025, gravity: 0.75, particleDrag: 0.42, glow: 'rgba(255,172,24,.12)'
    },
    oil: {
      kind: 'oil',
      density: 850, viscosity: 0.3, spring: 0.28, damping: 2.2, spread: 0.16,
      color: '#4e5964', deepColor: '#111820', highlight: 'rgba(215,238,255,.4)',
      flow: 0.1, gravity: 0.9, particleDrag: 0.1, glow: 'rgba(190,220,240,.08)'
    },
    mercury: {
      kind: 'mercury',
      density: 13546, viscosity: 0.14, spring: 0.68, damping: 1.4, spread: 0.3,
      color: '#a9b8c4', deepColor: '#586773', highlight: 'rgba(255,255,255,.9)',
      flow: 0.12, gravity: 1, particleDrag: 0.04, glow: 'rgba(225,245,255,.16)'
    }
  };

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function material(input = 'water') {
    const base = typeof input === 'string' ? MATERIALS[input] : MATERIALS.water;
    return { ...base, ...(typeof input === 'object' ? input : {}) };
  }

  class Surface {
    constructor(options = {}) {
      this.maxColumns = clamp(Math.floor(options.maxColumns || 128), 8, 256);
      this.columns = [];
      this.spacing = 0;
      this.width = -1;
      this.restY = 0;
      this.material = material(options.material || 'water');
      this.flow = Number(options.flow ?? this.material.flow) || 0;
      this._left = new Float32Array(this.maxColumns);
      this._right = new Float32Array(this.maxColumns);
      this.configure(options.width || 0, options.restY || 0, options.columns || 90);
    }

    configure(width, restY, count = this.columns.length || 90) {
      count = clamp(Math.floor(count), 8, this.maxColumns);
      if (width === this.width && restY === this.restY && count === this.columns.length) return this;
      this.width = Math.max(1, width);
      this.restY = restY;
      this.spacing = this.width / (count - 1);
      this.columns = Array.from({ length: count }, () => ({ y: restY, vy: 0 }));
      return this;
    }

    setMaterial(next) { this.material = material(next); return this; }
    reset() { this.columns.forEach(column => { column.y = this.restY; column.vy = 0; }); return this; }

    impulse(xPx, velocity = 0, spreadPx = 20) {
      if (!this.columns.length) return this;
      const center = Math.round(clamp(xPx / this.spacing, 0, this.columns.length - 1));
      const spread = Math.max(1, Math.round(spreadPx / this.spacing));
      for (let i = -spread; i <= spread; i += 1) {
        const index = center + i;
        if (index >= 0 && index < this.columns.length) {
          this.columns[index].vy += velocity * (1 - Math.abs(i) / (spread + 1));
        }
      }
      return this;
    }

    update(deltaSeconds = 1 / 60) {
      if (!this.columns.length) return this;
      const safeDelta = clamp(Number(deltaSeconds) || 0, 0, 0.05);
      const steps = Math.max(1, Math.min(4, Math.ceil(safeDelta / (1 / 60))));
      const dt = safeDelta / steps;
      const m = this.material;
      for (let pass = 0; pass < steps; pass += 1) {
        for (let i = 0; i < this.columns.length; i += 1) {
          const column = this.columns[i];
          column.vy += ((this.restY - column.y) * m.spring - column.vy * m.damping) * dt;
          column.y += column.vy * dt;
        }
        this._left.fill(0, 0, this.columns.length);
        this._right.fill(0, 0, this.columns.length);
        const spread = m.spread * dt * 60;
        for (let i = 0; i < this.columns.length; i += 1) {
          if (i > 0) this._left[i] = spread * (this.columns[i].y - this.columns[i - 1].y);
          if (i + 1 < this.columns.length) this._right[i] = spread * (this.columns[i].y - this.columns[i + 1].y);
        }
        for (let i = 0; i < this.columns.length; i += 1) {
          if (i > 0) this.columns[i - 1].vy += this._left[i];
          if (i + 1 < this.columns.length) this.columns[i + 1].vy += this._right[i];
        }
      }
      return this;
    }

    sample(index) { return this.columns[clamp(Math.round(index), 0, this.columns.length - 1)]?.y ?? this.restY; }
  }

  class Particles {
    constructor(options = {}) {
      this.max = clamp(Math.floor(options.max || 180), 1, 1000);
      this.material = material(options.material || 'water');
      this.particles = [];
      this.gravity = Number(options.gravity ?? this.material.gravity) || 0;
      this.bounds = options.bounds || null;
    }

    emit(options = {}) {
      if (this.particles.length >= this.max) this.particles.shift();
      this.particles.push({
        x: Number(options.x) || 0, y: Number(options.y) || 0,
        vx: Number(options.vx) || 0, vy: Number(options.vy) || 0,
        radius: Math.max(0.5, Number(options.radius) || 2),
        life: Math.max(0.01, Number(options.life) || 1),
        maxLife: Math.max(0.01, Number(options.life) || 1),
        kind: options.kind || 'drop'
      });
      return this;
    }

    emitRain(options = {}) {
      const count = Math.min(this.max - this.particles.length, Math.max(0, Math.floor(options.count || 1)));
      for (let i = 0; i < count; i += 1) {
        this.emit({
          x: lerp(options.x ?? 0, options.x2 ?? options.x ?? 0, Math.random()),
          y: options.y ?? 0,
          vx: options.vx ?? 0,
          vy: options.vy ?? 80,
          radius: options.radius ?? 1.5,
          life: options.life ?? 1.2,
          kind: 'rain'
        });
      }
      return this;
    }

    update(deltaSeconds = 1 / 60) {
      const dt = clamp(Number(deltaSeconds) || 0, 0, 0.05);
      const drag = clamp(this.material.particleDrag, 0, 0.95);
      this.particles.forEach(particle => {
        particle.vy += this.gravity * 120 * dt;
        particle.vx *= 1 - drag * dt * 8;
        particle.vy *= 1 - drag * dt * 3;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt;
        if (this.bounds) {
          if (particle.x < this.bounds.left || particle.x > this.bounds.right) particle.vx *= -0.65;
          if (particle.y < this.bounds.top || particle.y > this.bounds.bottom) particle.vy *= -0.45;
          particle.x = clamp(particle.x, this.bounds.left, this.bounds.right);
          particle.y = clamp(particle.y, this.bounds.top, this.bounds.bottom);
        }
      });
      this.particles = this.particles.filter(particle => particle.life > 0);
      return this;
    }

    clear() { this.particles.length = 0; return this; }
  }

  function drawSurface(ctx, surface, options = {}) {
    if (!ctx || !surface?.columns.length) return;
    const width = options.width ?? surface.width;
    const bottom = options.bottom ?? ctx.canvas.height;
    const m = surface.material;
    const phase = Number(options.phase) || 0;
    const gradient = ctx.createLinearGradient(0, surface.restY, 0, bottom);
    gradient.addColorStop(0, options.color || m.color);
    gradient.addColorStop(0.16, options.color || m.color);
    gradient.addColorStop(1, options.deepColor || m.deepColor);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.moveTo(0, surface.sample(0));
    surface.columns.forEach((column, index) => ctx.lineTo(index * surface.spacing, column.y));
    ctx.lineTo(width, bottom); ctx.lineTo(0, bottom); ctx.closePath();
    ctx.fillStyle = gradient; ctx.fill();

    const isWater = m.kind === 'water';

    // Water gets broken, reflected streaks rather than repeated full-width
    // scanlines. This reads like a refractive volume and lets the scene under
    // a translucent surface remain visible.
    if (options.caustics !== false) {
      ctx.save();
      ctx.globalAlpha = options.causticsOpacity ?? (isWater ? 0.1 : 0.18);
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = options.causticColor || m.highlight;
      ctx.lineWidth = options.causticWidth || (isWater ? 1.2 : 1);
      const bands = isWater ? 11 : 7;
      for (let band = 0; band < bands; band += 1) {
        const y = surface.restY + 34 + band * ((bottom - surface.restY - 44) / Math.max(1, bands - 1));
        ctx.beginPath();
        for (let segment = -1; segment < 10; segment += 1) {
          const x = segment * (width / 8) + ((band * 47) % 31) - 18;
          const length = isWater ? width * (0.05 + ((band + segment + 9) % 4) * 0.018) : width * .12;
          const wobble = Math.sin(x * 0.018 + phase * 0.7 + band * 1.7) * (2 + band * 0.45);
          ctx.moveTo(x, y + wobble);
          ctx.quadraticCurveTo(x + length * .45, y + wobble - 2, x + length, y + wobble + 1);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // A soft reflected-sky ribbon immediately below the surface sells the
    // transition from air to water in a side view. Optional above-surface
    // glints are useful when the caller has already drawn a shoreline/sky.
    if (options.reflection !== false) {
      const reflection = ctx.createLinearGradient(0, surface.restY, 0, surface.restY + 42);
      reflection.addColorStop(0, options.reflectionColor || m.highlight);
      reflection.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = options.reflectionOpacity ?? (isWater ? 0.16 : 0.22);
      ctx.fillStyle = reflection;
      ctx.fillRect(0, surface.restY, width, 42);
      if (isWater && options.reflectionAbove) {
        ctx.globalAlpha = options.reflectionAboveOpacity ?? 0.13;
        ctx.strokeStyle = options.reflectionColor || m.highlight;
        ctx.lineWidth = options.reflectionAboveWidth || 1.4;
        for (let i = 0; i < 8; i += 1) {
          const x = ((i * width * .19) + phase * (12 + i * 2)) % (width + 90) - 45;
          const y = surface.restY - 6 - (i % 3) * 4;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + width * (.045 + (i % 2) * .025), y + Math.sin(phase + i) * 1.5); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    surface.columns.forEach((column, index) => index ? ctx.lineTo(index * surface.spacing, column.y) : ctx.moveTo(0, column.y));
    ctx.strokeStyle = options.highlight || m.highlight;
    ctx.lineWidth = options.lineWidth || (isWater ? 1.7 : 2);
    ctx.stroke();

    if (isWater && options.surfaceShadow !== false) {
      ctx.globalAlpha = options.surfaceShadowOpacity ?? 0.22;
      ctx.strokeStyle = options.surfaceShadowColor || 'rgba(1,40,80,.7)';
      ctx.lineWidth = options.surfaceShadowWidth || 3.5;
      ctx.beginPath();
      surface.columns.forEach((column, index) => index ? ctx.lineTo(index * surface.spacing, column.y + 3) : ctx.moveTo(0, column.y + 3));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Foam appears only on sharper crests, not uniformly across the waterline.
    if (options.foam !== false) {
      ctx.save();
      ctx.globalAlpha = options.foamOpacity ?? 0.72;
      ctx.strokeStyle = options.foamColor || m.highlight;
      ctx.lineCap = 'round';
      ctx.lineWidth = options.foamWidth || 2.4;
      for (let i = 1; i < surface.columns.length - 1; i += 1) {
        const left = surface.columns[i - 1].y;
        const current = surface.columns[i].y;
        const right = surface.columns[i + 1].y;
        const crest = current < left - 0.8 && current < right - 0.8;
        if (!crest) continue;
        const x = i * surface.spacing;
        ctx.beginPath();
        ctx.moveTo(x - surface.spacing * 0.7, current + 1);
        ctx.quadraticCurveTo(x, current - 2.5, x + surface.spacing * 0.7, current + 1);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawParticles(ctx, field, options = {}) {
    if (!ctx || !field) return;
    const color = options.color || field.material.highlight;
    ctx.save();
    field.particles.forEach(particle => {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      if (particle.kind === 'rain') {
        ctx.moveTo(particle.x, particle.y - particle.radius * 3);
        ctx.lineTo(particle.x + particle.vx * 0.01, particle.y + particle.radius * 3);
        ctx.lineTo(particle.x + particle.radius, particle.y + particle.radius * 2);
        ctx.closePath();
      } else ctx.arc(particle.x, particle.y, particle.radius, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  return {
    version: '1.0.0',
    materials: Object.freeze(Object.keys(MATERIALS)),
    material,
    Surface,
    Particles,
    createSurface: options => new Surface(options),
    createParticles: options => new Particles(options),
    drawSurface,
    drawParticles
  };
});
