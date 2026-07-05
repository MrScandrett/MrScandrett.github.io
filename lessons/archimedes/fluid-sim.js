/**
 * Archimedes' Principle — Fluid Simulation
 *
 * Renders a physics-driven object (floating or sinking) inside a fluid tank.
 * Water is textured with a real Kelvin-Helmholtz shear instability pattern
 * extracted from The Well dataset (NeurIPS 2024, polymathic-ai.org/the_well).
 * Falls back to plain water if the asset is absent.
 *
 * KH instability is the shear-layer vortex structure that forms at the
 * boundary between two fluids moving at different velocities — exactly the
 * physics happening around a submerged object.
 */

/* ── Global helpers ─────────────────────────────────────────────────────── */
function _lerp(a, b, t) { return a + (b - a) * t; }

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y,         x + r, y);
  ctx.closePath();
}

function _arrow(ctx, x1, y1, x2, y2, color) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  const head = Math.min(9, len * 0.4);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * (ux - uy * 0.5), y2 - head * (uy + ux * 0.5));
  ctx.lineTo(x2 - head * (ux + uy * 0.5), y2 - head * (uy - ux * 0.5));
  ctx.closePath(); ctx.fill();
}

/* ── WaterSurface ───────────────────────────────────────────────────────────
 * Column/spring wave surface, ported from the classic dynamic-2D-water
 * technique (Michael Hoffman / Notch): the surface is a row of independent
 * vertical springs that pull back toward rest height and spread their
 * displacement to neighbouring columns each frame, producing physically
 * plausible propagating ripples instead of a canned sine overlay.
 * https://gamedevelopment.tutsplus.com/tutorials/make-a-splash-with-dynamic-2d-water-effects--gamedev-236
 */
class WaterSurface {
  constructor() {
    this.columns = [];
    this.spacing = 0;
    this.restY   = 0;
    this.width   = -1;
  }

  configure(width, restY) {
    if (width === this.width && restY === this.restY) return;
    this.width  = width;
    this.restY  = restY;
    const count = 90;
    this.spacing = width / (count - 1);
    this.columns = new Array(count);
    for (let i = 0; i < count; i++) this.columns[i] = { y: restY, vy: 0 };
  }

  reset() {
    for (const c of this.columns) { c.y = this.restY; c.vy = 0; }
  }

  // Kick the column(s) nearest xPx with a velocity impulse, falling off
  // across neighbours within spreadPx so an impact reads as one splash.
  impulse(xPx, velocity, spreadPx) {
    if (!this.columns.length) return;
    const centre     = Math.round(xPx / this.spacing);
    const spreadCols = Math.max(1, Math.round(spreadPx / this.spacing));
    for (let i = -spreadCols; i <= spreadCols; i++) {
      const ci = centre + i;
      if (ci < 0 || ci >= this.columns.length) continue;
      this.columns[ci].vy += velocity * (1 - Math.abs(i) / (spreadCols + 1));
    }
  }

  update(dt) {
    const TENSION = 0.01;
    const DAMP    = 0.005;
    const SPREAD  = 0.2;
    const PASSES  = 6;
    const k = dt * 60; // reference constants assume one call per 60fps frame

    const cols = this.columns;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      c.vy += (TENSION * (this.restY - c.y) - c.vy * DAMP) * k;
      c.y  += c.vy * k;
    }

    // Columns pull on their neighbours over several passes so displacement
    // spreads outward as a travelling wave rather than jumping instantly.
    const leftDeltas  = new Float32Array(cols.length);
    const rightDeltas = new Float32Array(cols.length);
    for (let pass = 0; pass < PASSES; pass++) {
      for (let i = 0; i < cols.length; i++) {
        if (i > 0) {
          leftDeltas[i] = SPREAD * (cols[i].y - cols[i - 1].y) * k;
          cols[i - 1].vy += leftDeltas[i];
        }
        if (i < cols.length - 1) {
          rightDeltas[i] = SPREAD * (cols[i].y - cols[i + 1].y) * k;
          cols[i + 1].vy += rightDeltas[i];
        }
      }
      for (let i = 0; i < cols.length; i++) {
        if (i > 0)               cols[i - 1].y += leftDeltas[i];
        if (i < cols.length - 1) cols[i + 1].y += rightDeltas[i];
      }
    }
  }
}

/* ── ArchimedesFluidSim ─────────────────────────────────────────────────── */
const ArchimedesFluidSim = (() => {
  let canvas = null;
  let ctx2d  = null;
  let simulation = null;
  let isInitialized = false;

  const state = {
    fluidDensity:   1000,   // kg/m³
    objectDensity:  500,    // kg/m³
    objectMass:     1,      // kg
    fluidViscosity: 0.001,  // Pa·s
    gravity:        9.81,   // m/s²
    isRunning:      true,
    speed:          1.0,
  };

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) { console.error(`Canvas "${canvasId}" not found`); return false; }

    ctx2d = canvas.getContext('2d');
    if (!ctx2d) { console.error('Canvas 2D not supported'); return false; }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    try {
      simulation = new FluidSimulation(canvas, state);
      isInitialized = true;
      render();
      return true;
    } catch (e) {
      console.error('FluidSimulation init failed:', e);
      return false;
    }
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
  }

  function render() {
    if (!isInitialized || !simulation) return;
    if (state.isRunning) {
      simulation.step(state.speed / 60);
      updatePhysicsDisplay();
    }
    simulation.render();
    requestAnimationFrame(render);
  }

  function updatePhysicsDisplay() {
    const volume       = state.objectMass / state.objectDensity;
    const buoyantForce = state.fluidDensity * state.gravity * volume;
    const weightForce  = state.objectMass   * state.gravity;
    const netForce     = buoyantForce - weightForce;
    const willFloat    = netForce > 0;

    const display = document.querySelector('.ap-physics-display');
    if (!display) return;
    display.innerHTML = `
      <div class="physics-metric">
        <label>Object Density:</label><value>${state.objectDensity} kg/m³</value>
      </div>
      <div class="physics-metric">
        <label>Fluid Density:</label><value>${state.fluidDensity} kg/m³</value>
      </div>
      <div class="physics-metric">
        <label>Buoyant Force:</label><value>${buoyantForce.toFixed(2)} N</value>
      </div>
      <div class="physics-metric">
        <label>Weight Force:</label><value>${weightForce.toFixed(2)} N</value>
      </div>
      <div class="physics-metric">
        <label>Net Force:</label>
        <value class="${willFloat ? 'positive' : 'negative'}">
          ${netForce.toFixed(2)} N (${willFloat ? 'FLOATS' : 'SINKS'})
        </value>
      </div>`;
  }

  function setObjectDensity(density) {
    state.objectDensity = Math.max(10, Math.min(2000, density));
    updatePhysicsDisplay();
  }
  function setObjectMass(mass) {
    state.objectMass = Math.max(0.1, Math.min(100, mass));
    updatePhysicsDisplay();
  }
  function setFluidDensity(density) {
    state.fluidDensity = Math.max(500, Math.min(2000, density));
    updatePhysicsDisplay();
  }
  function disturbFluid(x, y, radius, strength) {
    if (simulation && simulation.disturb) simulation.disturb(x, y, radius, strength);
  }
  function toggleRunning() {
    state.isRunning = !state.isRunning;
    return state.isRunning;
  }
  function reset() {
    if (simulation && simulation.reset) simulation.reset();
    state.isRunning = true;
  }

  return {
    init,
    isInitialized: () => isInitialized,
    setObjectDensity, setObjectMass, setFluidDensity,
    disturbFluid, toggleRunning, reset,
    getState: () => ({ ...state }),
    setState: (s) => { Object.assign(state, s); updatePhysicsDisplay(); },
  };
})();

/* ── FluidSimulation ────────────────────────────────────────────────────── */
class FluidSimulation {
  constructor(canvas, stateRef) {
    this.canvas   = canvas;
    this.stateRef = stateRef;

    // Object animation state (normalised 0–1 in canvas height)
    this.objectY  = 0.55;
    this.objectVY = 0;
    this.flowOffset = 0;
    this.disturbances = [];
    this.water = new WaterSurface();

    // Kelvin-Helmholtz texture (loaded asynchronously)
    this.khCanvas = null;
    this._loadTexture();
  }

  _loadTexture() {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width  = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      this.khCanvas = c;
    };
    // Path works from both /lessons/ and local dev server roots
    img.src = '../assets/data/kelvin-helmholtz.png';
  }

  step(dt) {
    const s = this.stateRef;

    // Layout constants (normalised)
    const WATER_Y  = 0.30;
    const OBJ_HALF = 0.10;
    const FLOOR_Y  = 0.92;

    const willFloat = s.objectDensity < s.fluidDensity;

    if (willFloat) {
      // Float to equilibrium: fraction submerged = ρ_obj / ρ_fluid
      const subFrac = s.objectDensity / s.fluidDensity;
      // Object centre at: waterY + (2·subFrac − 1)·OBJ_HALF
      const target = WATER_Y + (2 * subFrac - 1) * OBJ_HALF;
      // Spring toward target, damped by viscosity
      const spring = (target - this.objectY) * 8;
      const damp   = -this.objectVY * (4 + s.fluidViscosity * 2000);
      this.objectVY += (spring + damp) * dt;
      this.objectY  += this.objectVY * dt;
    } else {
      // Sink: buoyancy < weight
      // a = g·(ρ_fluid/ρ_obj − 1), downward when ratio < 1
      const a = s.gravity * (s.fluidDensity / s.objectDensity - 1);
      this.objectVY -= a * dt * 0.12;           // scale for screen units
      this.objectVY *= (1 - s.fluidViscosity * 800 * dt);
      this.objectY  += this.objectVY * dt;

      // Floor
      if (this.objectY + OBJ_HALF > FLOOR_Y) {
        this.objectY  = FLOOR_Y - OBJ_HALF;
        this.objectVY = Math.min(0, this.objectVY) * -0.08;
      }
    }

    // Water surface: spring/column simulation
    const canvasH = this.canvas.height;
    this.water.configure(this.canvas.width, WATER_Y * canvasH);
    this.water.update(dt);
    // The object agitates the surface directly beneath it while it's near
    // the interface — settles to calm automatically as objectVY decays.
    // Scaled by dt: this runs every frame, so it must be a rate, not a
    // flat per-frame nudge, or it overwhelms the surface's weak damping.
    if (Math.abs(this.objectY - WATER_Y) < OBJ_HALF * 1.6) {
      this.water.impulse(this.canvas.width / 2, this.objectVY * canvasH * 0.02 * dt, OBJ_HALF * canvasH * 1.8);
    }

    // Scroll KH texture proportionally to object speed
    this.flowOffset = (this.flowOffset + Math.abs(this.objectVY) * 90 * dt + 4 * dt) % 512;

    // Disturbance particles
    for (const d of this.disturbances) {
      d.x += d.vx; d.y += d.vy;
      d.vy += 20 * dt;  // gravity pull particles down
      d.life -= dt;
    }
    this.disturbances = this.disturbances.filter(d => d.life > 0);
  }

  disturb(x, y, radius, strength) {
    // x/y arrive already relative to the canvas element (see archimedes-principle.html)
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width  / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const cx = x * scaleX;
    const cy = y * scaleY;

    this.water.impulse(cx, 45 * strength, radius * scaleX);

    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = (1 + Math.random() * 2) * strength;
      this.disturbances.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1.5,
        life: 0.5 + Math.random() * 0.5,
      });
    }
  }

  render() {
    const canvas = this.canvas;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const s = this.stateRef;

    const WATER_Y  = Math.round(0.30 * H);
    const OBJ_HALF = Math.round(0.10 * H);
    const objCY    = Math.round(this.objectY * H);
    const objX     = Math.round(W / 2);
    const willFloat = s.objectDensity < s.fluidDensity;

    /* ── Air above waterline ─────────────────────────────────────────── */
    const skyGrad = ctx.createLinearGradient(0, 0, 0, WATER_Y);
    skyGrad.addColorStop(0, '#c8dff0');
    skyGrad.addColorStop(1, '#deedf7');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, WATER_Y);

    /* ── Water surface (column/spring simulation) ─────────────────────── */
    // Must match step()'s configure() call exactly (unrounded) or the
    // restY equality check there will fail every frame and flatten the waves.
    this.water.configure(W, 0.30 * H);
    const cols = this.water.columns;
    const spacing = this.water.spacing;

    /* ── Water body (KH texture tiled), clipped to the wavy surface ──── */
    const waterH = H - WATER_Y;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, cols[0].y);
    for (let i = 1; i < cols.length; i++) ctx.lineTo(i * spacing, cols[i].y);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.clip();

    // Base water fill
    const waterGrad = ctx.createLinearGradient(0, WATER_Y, 0, H);
    waterGrad.addColorStop(0, `rgba(35,110,200,0.65)`);
    waterGrad.addColorStop(1, `rgba(15, 60,140,0.80)`);
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, WATER_Y - 40, W, waterH + 40);

    // KH texture overlay — opacity scales with velocity (more visible when object moves fast)
    if (this.khCanvas) {
      const kw = this.khCanvas.width;
      const kh = this.khCanvas.height;
      const scale = waterH / kh;
      const tw = kw * scale;
      const baseAlpha = 0.12 + Math.min(0.30, Math.abs(this.objectVY) * 0.6);
      ctx.globalAlpha = baseAlpha;
      // Tile horizontally, scroll leftward
      const startX = -(this.flowOffset * scale) % tw;
      for (let tx = startX - tw; tx < W + tw; tx += tw) {
        ctx.drawImage(this.khCanvas, tx, WATER_Y, tw, waterH);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    /* ── Sky-coloured cap where ripples crest above the rest line ────── */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, cols[0].y);
    for (let i = 1; i < cols.length; i++) ctx.lineTo(i * spacing, cols[i].y);
    ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = '#c8dff0';
    ctx.fill();

    // Glint line along the crest
    ctx.beginPath();
    ctx.moveTo(0, cols[0].y);
    for (let i = 1; i < cols.length; i++) ctx.lineTo(i * spacing, cols[i].y);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    /* ── Tank floor ─────────────────────────────────────────────────── */
    ctx.fillStyle = 'rgba(20,50,100,0.35)';
    ctx.fillRect(0, H * 0.92, W, H * 0.08);
    ctx.strokeStyle = 'rgba(80,140,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H * 0.92); ctx.lineTo(W, H * 0.92); ctx.stroke();

    /* ── Object shadow (cast on floor when near bottom) ─────────────── */
    if (!willFloat) {
      const floorY = H * 0.92;
      const dist   = floorY - (objCY + OBJ_HALF);
      if (dist < H * 0.25) {
        const shadowAlpha = (1 - dist / (H * 0.25)) * 0.25;
        const shadowW = OBJ_HALF * (1.5 + dist / H * 3);
        ctx.fillStyle = `rgba(0,20,60,${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(objX, floorY, shadowW, OBJ_HALF * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* ── Object ─────────────────────────────────────────────────────── */
    // Colour interpolated from light wood (low density) → dark metal (high density)
    const ratio  = Math.min(s.objectDensity / s.fluidDensity, 2.5) / 2.5;
    const objR   = Math.round(_lerp(210, 70,  ratio));
    const objG   = Math.round(_lerp(150, 75,  ratio));
    const objB   = Math.round(_lerp( 70, 95,  ratio));
    const corner = OBJ_HALF * 0.28;

    // Body
    ctx.fillStyle = `rgb(${objR},${objG},${objB})`;
    _roundRect(ctx, objX - OBJ_HALF, objCY - OBJ_HALF, OBJ_HALF * 2, OBJ_HALF * 2, corner);
    ctx.fill();

    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    _roundRect(ctx, objX - OBJ_HALF * 0.7, objCY - OBJ_HALF * 0.82, OBJ_HALF * 1.4, OBJ_HALF * 0.45, corner * 0.5);
    ctx.fill();

    // Border
    ctx.strokeStyle = `rgba(${Math.max(0,objR-40)},${Math.max(0,objG-40)},${Math.max(0,objB-30)},0.85)`;
    ctx.lineWidth = 1.5;
    _roundRect(ctx, objX - OBJ_HALF, objCY - OBJ_HALF, OBJ_HALF * 2, OBJ_HALF * 2, corner);
    ctx.stroke();

    /* ── Displacement / force arrows ────────────────────────────────── */
    const arrowAlpha = Math.min(0.9, Math.abs(this.objectVY) * 4 + 0.35);
    const dir = willFloat ? -1 : 1;   // up for float, down for sink
    const arrowLen = OBJ_HALF * 0.9;
    ctx.globalAlpha = arrowAlpha;
    for (const side of [-1, 1]) {
      const ax = objX + side * (OBJ_HALF + 14);
      _arrow(ctx, ax, objCY - dir * arrowLen * 0.5,
                  ax, objCY + dir * arrowLen * 0.5,
                  willFloat ? 'rgba(100,220,120,0.9)' : 'rgba(255,140,100,0.9)');
    }
    ctx.globalAlpha = 1;

    /* ── Float / Sink label ─────────────────────────────────────────── */
    const label    = willFloat ? '↑ FLOATS' : '↓ SINKS';
    const labelClr = willFloat ? '#27ae60' : '#e74c3c';
    ctx.font      = `bold ${Math.max(11, Math.round(H * 0.045))}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = labelClr;
    ctx.globalAlpha = 0.92;
    ctx.fillText(label, 10, 22);
    ctx.globalAlpha = 1;

    /* ── Submerged fraction label (when floating) ───────────────────── */
    if (willFloat) {
      const pct = Math.round(s.objectDensity / s.fluidDensity * 100);
      ctx.font      = `${Math.max(9, Math.round(H * 0.033))}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`${pct}% submerged`, 10, 22 + Math.round(H * 0.052));
    }

    /* ── Data credit ────────────────────────────────────────────────── */
    if (this.khCanvas) {
      ctx.font      = `${Math.max(8, Math.round(H * 0.030))}px system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillText('K-H flow · The Well (NeurIPS 2024)', W - 8, H - 6);
    }
    ctx.textAlign = 'left';

    /* ── Disturbance particles ──────────────────────────────────────── */
    for (const d of this.disturbances) {
      ctx.fillStyle = `rgba(160,220,255,${d.life * 0.8})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  reset() {
    this.objectY    = 0.55;
    this.objectVY   = 0;
    this.flowOffset = 0;
    this.disturbances = [];
    this.water.reset();
  }
}

/* ── Auto-init ─────────────────────────────────────────────────────────── */
function _tryInit() {
  const canvas = document.querySelector('#archimedes-fluid-canvas');
  if (canvas) ArchimedesFluidSim.init('archimedes-fluid-canvas');
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _tryInit);
} else {
  _tryInit();
}
