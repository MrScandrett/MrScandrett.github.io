/**
 * LiquidEngine — small, shared liquid-motion primitives for ClassroomOS.
 *
 * This is deliberately a lightweight depiction/interaction engine, not a
 * general-purpose Navier–Stokes solver. It combines a 1-D shallow-water
 * surface model, bounded particles, a 2-D depth-averaged grid flow over
 * terrain (DepthField: lava fields, floods, mudflows) and buoyant thermal
 * blobs (ThermalBlobs: lava lamps), so lakes, rain, lava, honey, and
 * underwater accents can share stable motion and material vocabulary without
 * bringing in a physics dependency. Three.js rendering for these lives in
 * liquid-engine-three.mjs.
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

  // A compact 3-D, ground-hugging particle flow for materials such as lava,
  // mud, or snow. The caller supplies the terrain height and downhill vector;
  // the engine supplies viscosity, gravity, cooling, and stable bounded motion.
  class FlowParticles {
    constructor(options = {}) {
      this.max = clamp(Math.floor(options.max || 600), 1, 2000);
      this.material = material(options.material || 'lava');
      this.particles = [];
      this.gravity = Number(options.gravity ?? 4.5) || 0;
      this.groundAt = typeof options.groundAt === 'function' ? options.groundAt : (() => 0);
      this.slopeAt = typeof options.slopeAt === 'function' ? options.slopeAt : (() => ({ x: 0, z: 0 }));
      this.bounds = options.bounds || null;
    }

    emit(options = {}) {
      if (this.particles.length >= this.max) this.particles.shift();
      const life = Math.max(0.1, Number(options.life) || 6);
      this.particles.push({
        x: Number(options.x) || 0, y: Number(options.y) || 0, z: Number(options.z) || 0,
        vx: Number(options.vx) || 0, vy: Number(options.vy) || 0, vz: Number(options.vz) || 0,
        life, maxLife: life, age: 0,
        size: Math.max(0.03, Number(options.size) || 0.18),
        temperature: clamp(Number(options.temperature ?? 1), 0, 1)
      });
      return this;
    }

    update(deltaSeconds = 1 / 60) {
      const dt = clamp(Number(deltaSeconds) || 0, 0, 0.05);
      const viscosity = clamp(this.material.viscosity, 0.01, 1.5);
      const flowPower = 0.7 + this.material.flow * 4;
      const drag = Math.exp(-viscosity * 2.6 * dt);
      for (const particle of this.particles) {
        particle.age += dt;
        particle.life -= dt;
        if (particle.life <= 0) continue;

        particle.vy -= this.gravity * dt;
        const ground = this.groundAt(particle.x, particle.z) + 0.045;
        if (particle.y <= ground) {
          particle.y = ground;
          if (particle.vy < 0) particle.vy *= -0.16;
          const slope = this.slopeAt(particle.x, particle.z) || { x: 0, z: 0 };
          particle.vx += slope.x * flowPower * (1 + particle.temperature) * dt;
          particle.vz += slope.z * flowPower * (1 + particle.temperature) * dt;
          particle.vy *= 0.55;
        }
        particle.vx *= drag; particle.vz *= drag; particle.vy *= Math.exp(-viscosity * 1.2 * dt);
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.z += particle.vz * dt;
        particle.temperature = clamp(particle.temperature - dt / particle.maxLife * 0.55, 0, 1);

        if (this.bounds) {
          particle.x = clamp(particle.x, this.bounds.left, this.bounds.right);
          particle.z = clamp(particle.z, this.bounds.front, this.bounds.back);
        }
      }
      this.particles = this.particles.filter(particle => particle.life > 0);
      return this;
    }

    clear() { this.particles.length = 0; return this; }
  }

  // A depth-averaged (shallow-layer) liquid on a 2-D grid over terrain. Each
  // cell holds a column of liquid (depth) and the heat it carries (energy =
  // depth × heat), so volume is conserved exactly: material only moves between
  // cells, toward lower ground + liquid surfaces, and pools in hollows. A yield
  // threshold lets viscous liquid pile up before it escapes; cooling (lava)
  // immobilises thin toes first and leaves the crust in place. Edge cells take
  // inflow but never drain, so the boundary retains liquid. World units are the
  // caller's (x/z on the grid, y = height); dt in seconds.
  const NEIGHBOURS = 8;
  class DepthField {
    constructor(options = {}) {
      this.cols = clamp(Math.floor(options.cols || options.size || 64), 3, 512);
      this.rows = clamp(Math.floor(options.rows || options.size || this.cols), 3, 512);
      this.cellSize = Number(options.cellSize) || 1;
      this.originX = Number(options.originX ?? -(this.cols - 1) * this.cellSize / 2);
      this.originZ = Number(options.originZ ?? -(this.rows - 1) * this.cellSize / 2);
      this.material = material(options.material || 'lava');
      // 0 = stiff (rhyolite-like), 1 = runny (basalt-like). Callers may change it per step.
      this.fluidity = clamp(Number(options.fluidity ?? 1 - this.material.viscosity), 0, 1);
      this.supply = Number(options.supply ?? 1);
      this.yieldDrop = Number(options.yieldDrop ?? 0.09);
      this.solidus = Number(options.solidus ?? 0.16);
      this.cooling = Number(options.cooling ?? (this.material.kind === 'lava' ? 1 : 0));
      this.fixedStep = Number(options.fixedStep) || 0.1;
      const cells = this.cols * this.rows;
      this.ground = new Float32Array(cells);
      this.depth = new Float32Array(cells);
      this.energy = new Float32Array(cells);
      this._delta = new Float32Array(cells);
      this._heatDelta = new Float32Array(cells);
      this._drops = new Float32Array(NEIGHBOURS);
      const c = this.cols;
      this._offsets = [-1, 1, -c, c, -c - 1, -c + 1, c - 1, c + 1];
      this.sources = [];
      this.supplied = 0;
      this._accumulator = 0;
      if (options.groundAt) this.setGround(options.groundAt);
    }

    get cellArea() { return this.cellSize * this.cellSize; }
    index(gx, gz) { return gz * this.cols + gx; }
    positionOf(i) {
      return { x: this.originX + (i % this.cols) * this.cellSize, z: this.originZ + Math.floor(i / this.cols) * this.cellSize };
    }
    // Nearest cell to a world point, or -1 outside the grid.
    cellAt(x, z) {
      const gx = Math.round((x - this.originX) / this.cellSize);
      const gz = Math.round((z - this.originZ) / this.cellSize);
      return gx < 0 || gz < 0 || gx >= this.cols || gz >= this.rows ? -1 : this.index(gx, gz);
    }

    setGround(groundAt) {
      for (let i = 0; i < this.ground.length; i += 1) {
        const p = this.positionOf(i);
        this.ground[i] = groundAt(p.x, p.z);
      }
      return this;
    }

    // Sources pour `rate × supply` depth units per second into their cell.
    addSource(x, z, rate = 1) {
      const index = this.cellAt(x, z);
      if (index >= 0) this.sources.push({ index, rate });
      return index;
    }
    clearSources() { this.sources.length = 0; return this; }

    pour(index, amount, heat = 1) {
      if (index < 0 || index >= this.depth.length || !(amount > 0)) return this;
      this.depth[index] += amount;
      this.energy[index] += amount * heat;
      this.supplied += amount * this.cellArea;
      return this;
    }

    heatAt(index) { const d = this.depth[index]; return d > 0.001 ? this.energy[index] / d : 0; }

    step(dt = this.fixedStep) {
      const { cols, rows, depth, energy, ground, _delta: delta, _heatDelta: heatDelta, _drops: drops, _offsets: offsets } = this;
      const fluidity = clamp(this.fluidity, 0, 1);
      for (const source of this.sources) this.pour(source.index, this.supply * source.rate * dt);
      delta.fill(0); heatDelta.fill(0);
      const yieldDrop = (1 - fluidity) * this.yieldDrop;
      const mobility = 0.12 + fluidity * 1.5;
      for (let z = 1; z < rows - 1; z += 1) for (let x = 1; x < cols - 1; x += 1) {
        const i = z * cols + x, d = depth[i];
        if (d < 0.001) continue;
        const heat = this.cooling ? energy[i] / d : 1;
        if (heat < this.solidus) continue;
        const surface = ground[i] + d;
        let total = 0;
        for (let k = 0; k < NEIGHBOURS; k += 1) {
          const j = i + offsets[k];
          drops[k] = Math.max(0, surface - ground[j] - depth[j] - yieldDrop) / (k < 4 ? 1 : Math.SQRT2);
          drops[k] *= drops[k];
          total += drops[k];
        }
        if (!total) continue;
        // Never move more than 42% of a column per step, so the scheme stays stable.
        const moved = Math.min(d * 0.42, total * dt * mobility * heat * heat);
        for (let k = 0; k < NEIGHBOURS; k += 1) if (drops[k] > 0) {
          const amount = moved * drops[k] / total, j = i + offsets[k];
          delta[j] += amount; heatDelta[j] += amount * heat;
        }
        delta[i] -= moved; heatDelta[i] -= moved * heat;
      }
      for (let i = 0; i < depth.length; i += 1) {
        depth[i] = Math.max(0, depth[i] + delta[i]);
        // Thin toes cool faster than deep insulated pools; the crust stays.
        const cooling = this.cooling ? Math.exp(-dt * this.cooling * (0.003 + 0.006 / (0.08 + depth[i]))) : 1;
        energy[i] = Math.max(0, energy[i] + heatDelta[i]) * cooling;
      }
      return this;
    }

    // Fixed-step update; returns how many steps ran (0 = nothing changed).
    update(deltaSeconds) {
      this._accumulator += clamp(Number(deltaSeconds) || 0, 0, 1);
      let steps = 0;
      while (this._accumulator >= this.fixedStep) { this.step(this.fixedStep); this._accumulator -= this.fixedStep; steps += 1; }
      return steps;
    }

    // Bilinear sample of a per-cell array at fractional grid coordinates.
    sample(field, gx, gz) {
      const x0 = clamp(Math.floor(gx), 0, this.cols - 2), z0 = clamp(Math.floor(gz), 0, this.rows - 2);
      const fx = gx - x0, fz = gz - z0, i = z0 * this.cols + x0, c = this.cols;
      return lerp(lerp(field[i], field[i + 1], fx), lerp(field[i + c], field[i + c + 1], fx), fz);
    }

    stats(options = {}) {
      const coverDepth = options.coverDepth ?? 0.018, hotHeat = options.hotHeat ?? 0.45;
      let covered = 0, hot = 0, maxDepth = 0, sum = 0;
      for (let i = 0; i < this.depth.length; i += 1) {
        const d = this.depth[i];
        sum += d;
        if (d > maxDepth) maxDepth = d;
        if (d > coverDepth) { covered += 1; if (this.heatAt(i) > hotHeat) hot += 1; }
      }
      const volume = sum * this.cellArea;
      return { covered, hot, maxDepth, volume, supplied: this.supplied, balanceError: this.supplied - volume };
    }

    reset() {
      this.depth.fill(0); this.energy.fill(0);
      this.supplied = 0; this._accumulator = 0;
      return this;
    }
  }

  // Buoyant blobs of a heated liquid in a cooler one (a lava lamp). Wax heats
  // near the bottom, rises, cools near the top and sinks; cool blobs that touch
  // merge (area-weighted), and a big hot blob moving fast splits in two. Units
  // are pixels with y down, stepped at a fixed 60 Hz so behaviour does not
  // depend on the display's refresh rate. `mix` is a pair of paint weights the
  // renderer blends between, carried through merges.
  class ThermalBlobs {
    constructor(options = {}) {
      this.count = clamp(Math.floor(options.count || 8), 1, 24);
      this.random = typeof options.random === 'function' ? options.random : Math.random;
      this.bodies = [];
      this.width = 0;
      this.height = 0;
      this.seconds = 0;
      this.steps = 0;
      this._accumulator = 0;
      if (options.width && options.height) this.resize(options.width, options.height);
    }

    resize(width, height) {
      if (this.width && this.height) this.bodies.forEach(b => { b.x *= width / this.width; b.y *= height / this.height; });
      this.width = width; this.height = height;
      if (!this.bodies.length) for (let i = 0; i < this.count; i += 1) {
        this.bodies.push({
          x: (i + 0.5) * width / this.count, y: height * (0.15 + this.random() * 0.8),
          r: Math.min(width / 12, 32 + this.random() * 28), vx: 0, vy: 0,
          temp: this.random(), mix: [i % 2 ? 0 : 1, i % 2 ? 1 : 0], age: 0
        });
      }
      return this;
    }

    step(pointer) {
      const dt = 1 / 60, { width, height, bodies } = this;
      this.seconds += dt; this.steps += 1;
      for (const b of bodies) {
        b.age += dt;
        const y = b.y / height;
        // Heater below 80%, cooling above 20%, slow drift toward neutral between.
        const target = y > 0.8 ? 1 : y < 0.2 ? 0 : 0.48;
        b.temp += (target - b.temp) * (y > 0.8 || y < 0.2 ? 0.008 : 0.0003);
        b.vy = (b.vy - (b.temp - 0.48) * 2.8) * 0.985;
        b.vx = (b.vx + Math.sin(this.seconds * 0.35 + b.y * 0.004) * 0.7) * 0.96;
        if (pointer && pointer.active) {
          const dx = b.x - pointer.x, dy = b.y - pointer.y, d = Math.hypot(dx, dy);
          if (d > 1 && d < 180) {
            b.vx += dx / d * (1 - d / 180) * 4 + pointer.vx * 0.2;
            b.vy += dy / d * (1 - d / 180) * 4 + pointer.vy * 0.2;
          }
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.x = Math.max(b.r, Math.min(width - b.r, b.x));
        if (b.y > height - 15) { b.y = height - 15; b.vy = Math.min(0, b.vy); }
        if (b.y < b.r * 0.5) { b.y = b.r * 0.5; b.vy = Math.max(0, b.vy); }
      }
      for (let i = 0; i < bodies.length; i += 1) for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i], b = bodies[j];
        if (a.temp < 0.45 && b.temp < 0.45 && Math.hypot(a.x - b.x, a.y - b.y) < (a.r + b.r) * 0.55) {
          const aa = a.r * a.r, bb = b.r * b.r, total = aa + bb;
          a.x = (a.x * aa + b.x * bb) / total; a.y = (a.y * aa + b.y * bb) / total;
          a.vx = (a.vx * aa + b.vx * bb) / total; a.vy = (a.vy * aa + b.vy * bb) / total;
          a.temp = (a.temp * aa + b.temp * bb) / total;
          a.mix = a.mix.map((c, k) => (c * aa + b.mix[k] * bb) / total);
          a.r = Math.sqrt(total); a.age = 0;
          bodies.splice(j--, 1);
        }
      }
      if (bodies.length < this.count) bodies.some(b => {
        if (b.temp > 0.65 && b.r > 40 && b.age > 8 && Math.abs(b.vy) > 20) {
          const r = b.r / Math.SQRT2;
          b.r = r; b.age = 0;
          bodies.push({ x: b.x + r * 0.5, y: b.y + r, vx: -b.vx, vy: b.vy * 0.8, r, temp: b.temp, mix: b.mix.slice(), age: 0 });
          b.y -= r;
          return true;
        }
        return false;
      });
      return this;
    }

    // Fixed-step update; returns how many steps ran.
    update(deltaSeconds, pointer) {
      this._accumulator += Math.min(0.1, Math.max(0, Number(deltaSeconds) || 0));
      let steps = 0;
      while (this._accumulator >= 1 / 60) { this.step(pointer); this._accumulator -= 1 / 60; steps += 1; }
      return steps;
    }

    pause() { this._accumulator = 0; return this; }
    area() { return this.bodies.reduce((sum, b) => sum + b.r * b.r, 0); }
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
    version: '1.1.0',
    materials: Object.freeze(Object.keys(MATERIALS)),
    material,
    Surface,
    Particles,
    FlowParticles,
    DepthField,
    ThermalBlobs,
    createSurface: options => new Surface(options),
    createParticles: options => new Particles(options),
    createFlowParticles: options => new FlowParticles(options),
    createDepthField: options => new DepthField(options),
    createThermalBlobs: options => new ThermalBlobs(options),
    drawSurface,
    drawParticles
  };
});
