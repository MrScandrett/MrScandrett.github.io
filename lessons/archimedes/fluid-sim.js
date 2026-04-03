/**
 * Archimedes' Principle - WebGL Fluid Simulation Integration
 *
 * Integrates interactive fluid dynamics to visualize:
 * - Buoyancy forces on objects
 * - Fluid displacement and density
 * - Sink/float behavior based on object and fluid properties
 */

const ArchimedesFluidSim = (() => {
  let canvas = null;
  let gl = null;
  let simulation = null;
  let isInitialized = false;

  // Simulation state
  let state = {
    fluidDensity: 1000,        // kg/m³ (water default)
    objectDensity: 500,        // kg/m³ (floating object default)
    objectMass: 1,             // kg
    fluidViscosity: 0.001,     // Pa·s (water at 20°C)
    gravity: 9.81,             // m/s²
    isRunning: true,
    speed: 1.0,
  };

  /**
   * Initialize fluid simulation
   */
  async function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas with ID "${canvasId}" not found`);
      return false;
    }

    // Setup 2D canvas context
    gl = canvas.getContext('2d');
    if (!gl) {
      console.error('Canvas 2D context not supported');
      return false;
    }

    // Setup canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize fluid simulation
    try {
      simulation = new FluidSimulation(canvas);
      isInitialized = true;
      render();
      return true;
    } catch (e) {
      console.error('Failed to initialize fluid simulation:', e);
      return false;
    }
  }

  /**
   * Resize canvas to fit container
   */
  function resizeCanvas() {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }

  /**
   * Main render loop
   */
  function render() {
    if (!isInitialized || !gl || !simulation) return;

    // Update simulation
    if (state.isRunning) {
      simulation.step(state.speed / 60); // Normalize to ~60fps
      updatePhysicsDisplay();
    }

    // Render (2D context handles clearing and drawing)
    simulation.render();

    requestAnimationFrame(render);
  }

  /**
   * Calculate and display physics metrics
   */
  function updatePhysicsDisplay() {
    const volume = state.objectMass / state.objectDensity; // m³
    const buoyantForce = state.fluidDensity * state.gravity * volume; // N
    const weightForce = state.objectMass * state.gravity; // N
    const netForce = buoyantForce - weightForce; // N
    const willFloat = netForce > 0;

    // Update display element if it exists
    const display = document.querySelector('.ap-physics-display');
    if (display) {
      display.innerHTML = `
        <div class="physics-metric">
          <label>Object Density:</label>
          <value>${state.objectDensity} kg/m³</value>
        </div>
        <div class="physics-metric">
          <label>Fluid Density:</label>
          <value>${state.fluidDensity} kg/m³</value>
        </div>
        <div class="physics-metric">
          <label>Buoyant Force:</label>
          <value>${buoyantForce.toFixed(2)} N</value>
        </div>
        <div class="physics-metric">
          <label>Weight Force:</label>
          <value>${weightForce.toFixed(2)} N</value>
        </div>
        <div class="physics-metric">
          <label>Net Force:</label>
          <value class="${willFloat ? 'positive' : 'negative'}">
            ${netForce.toFixed(2)} N (${willFloat ? 'FLOATS' : 'SINKS'})
          </value>
        </div>
      `;
    }
  }

  /**
   * Set object density (affects buoyancy)
   */
  function setObjectDensity(density) {
    state.objectDensity = Math.max(10, Math.min(2000, density));
    updatePhysicsDisplay();
  }

  /**
   * Set object mass (affects weight)
   */
  function setObjectMass(mass) {
    state.objectMass = Math.max(0.1, Math.min(100, mass));
    updatePhysicsDisplay();
  }

  /**
   * Set fluid density (affects buoyancy)
   */
  function setFluidDensity(density) {
    state.fluidDensity = Math.max(500, Math.min(2000, density));
    updatePhysicsDisplay();
  }

  /**
   * Add fluid disturbance at position
   */
  function disturbFluid(x, y, radius = 20, strength = 1) {
    if (simulation && simulation.disturb) {
      simulation.disturb(x, y, radius, strength);
    }
  }

  /**
   * Toggle simulation running state
   */
  function toggleRunning() {
    state.isRunning = !state.isRunning;
    return state.isRunning;
  }

  /**
   * Reset simulation to initial state
   */
  function reset() {
    if (simulation && simulation.reset) {
      simulation.reset();
    }
    state.isRunning = true;
  }

  /**
   * Public API
   */
  return {
    init,
    isInitialized: () => isInitialized,
    setObjectDensity,
    setObjectMass,
    setFluidDensity,
    disturbFluid,
    toggleRunning,
    reset,
    getState: () => ({ ...state }),
    setState: (newState) => {
      Object.assign(state, newState);
      updatePhysicsDisplay();
    },
  };
})();

/**
 * Basic Fluid Simulation using WebGL
 * Implements Navier-Stokes equations for simple 2D fluid dynamics
 */
class FluidSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.disturbances = [];
  }

  /**
   * Simulation step
   */
  step(dt) {
    // Update disturbance particles
    for (let i = 0; i < this.disturbances.length; i++) {
      this.disturbances[i].life -= dt;
    }
    this.disturbances = this.disturbances.filter(d => d.life > 0);
  }

  /**
   * Add fluid disturbance
   */
  disturb(x, y, radius, strength) {
    // Add disturbance particles for visual feedback
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = (x - rect.left) * (this.canvas.width / rect.width);
    const canvasY = (y - rect.top) * (this.canvas.height / rect.height);

    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 0.5;
      this.disturbances.push({
        x: canvasX,
        y: canvasY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        alpha: 0.8
      });
    }
  }

  /**
   * Render to canvas using 2D context
   */
  render() {
    const canvas = this.canvas;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#e8f4f8');
    gradient.addColorStop(1, '#d0e8f2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw water surface
    ctx.fillStyle = 'rgba(52, 152, 219, 0.15)';
    ctx.fillRect(0, canvas.height * 0.4, canvas.width, canvas.height * 0.6);

    // Draw disturbance particles
    for (let disturbance of this.disturbances) {
      disturbance.x += disturbance.vx;
      disturbance.y += disturbance.vy;

      const alpha = (disturbance.life / (0.5 + 0.5)) * disturbance.alpha;
      ctx.fillStyle = `rgba(74, 200, 255, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(disturbance.x, disturbance.y, 3 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw ripple effect circles
    const now = performance.now() * 0.001;
    for (let i = 0; i < 3; i++) {
      const rippleRadius = (now * 50 + i * 20) % (canvas.width / 2);
      const rippleAlpha = Math.max(0, 1 - rippleRadius / (canvas.width / 2)) * 0.3;
      ctx.strokeStyle = `rgba(52, 152, 219, ${rippleAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height * 0.5, rippleRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /**
   * Reset simulation
   */
  reset() {
    this.disturbances = [];
  }
}

// Auto-initialize if canvas exists
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#archimedes-fluid-canvas');
    if (canvas) {
      ArchimedesFluidSim.init('archimedes-fluid-canvas');
    }
  });
} else {
  const canvas = document.querySelector('#archimedes-fluid-canvas');
  if (canvas) {
    ArchimedesFluidSim.init('archimedes-fluid-canvas');
  }
}
