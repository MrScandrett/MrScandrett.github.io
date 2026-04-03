/**
 * Event Horizon Telescope - Animation & Effects Module
 *
 * Provides the core animation infrastructure including:
 * - Throttled requestAnimationFrame loop (60/30 FPS)
 * - Easing functions for smooth transitions
 * - Animation state manager with queue
 * - Canvas effects pipeline (blur, phase-noise, vignette)
 * - Performance monitoring
 */

const EHTAnimations = (() => {
  // Configuration
  const config = {
    fpsSync: 60,        // High quality with synchronized data
    fpsUnsync: 30,      // Lower quality when data unsynchronized
    enablePerformanceMonitoring: true,
    maxFrameSkips: 3,   // After this many skips, drop FPS
  };

  // State
  let isRunning = false;
  let isSynchronized = true;
  let frameCount = 0;
  let frameSkipCount = 0;
  let lastFrameTime = 0;
  let currentFps = config.fpsSync;
  let targetFrameTime = 1000 / currentFps;

  // Animation queue
  const animations = [];
  const performanceMetrics = {
    frameTime: 0,
    fps: 0,
    skippedFrames: 0,
  };

  /**
   * Easing Functions
   */
  const easings = {
    linear: (t) => t,

    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => 1 + (--t) * t * t,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 + (--t) * (2 * (--t)) * (2 * t),

    easeInQuart: (t) => t * t * t * t,
    easeOutQuart: (t) => 1 - (--t) * t * t * t,
    easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

    easeInQuint: (t) => t * t * t * t * t,
    easeOutQuint: (t) => 1 + (--t) * t * t * t * t,
    easeInOutQuint: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,

    easeInExpo: (t) => (t === 0) ? 0 : Math.pow(2, 10 * t - 10),
    easeOutExpo: (t) => (t === 1) ? 1 : 1 - Math.pow(2, -10 * t),
    easeInOutExpo: (t) => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
      return (2 - Math.pow(2, -20 * t + 10)) / 2;
    },

    easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
    easeOutCirc: (t) => Math.sqrt(1 - (--t) * t),
    easeInOutCirc: (t) => {
      if (t < 0.5) return (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2;
      return (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
    },

    easeOutElastic: (t) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },

    easeOutBounce: (t) => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },

    // Smooth step variants
    smoothstep: (t) => {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t);
    },

    smootherstep: (t) => {
      t = Math.max(0, Math.min(1, t));
      return t * t * t * (t * (t * 6 - 15) + 10);
    },
  };

  /**
   * Animation object structure
   */
  class Animation {
    constructor(id, update, duration, easing = 'easeInOutQuad', onComplete = null) {
      this.id = id;
      this.update = update;
      this.duration = duration; // ms
      this.easing = typeof easing === 'string' ? easings[easing] : easing;
      this.onComplete = onComplete;
      this.elapsed = 0;
      this.paused = false;
      this.pausedAt = 0;
    }

    update_frame(deltaTime) {
      if (this.paused) return false;

      this.elapsed += deltaTime;
      const progress = Math.min(1, this.elapsed / this.duration);
      const eased = this.easing(progress);

      this.update(eased, progress);

      if (progress >= 1) {
        if (this.onComplete) this.onComplete();
        return true; // Animation complete, remove from queue
      }
      return false;
    }

    pause() {
      this.paused = true;
      this.pausedAt = this.elapsed;
    }

    resume() {
      this.paused = false;
    }

    cancel() {
      return true; // Mark for removal
    }
  }

  /**
   * Canvas Effects Pipeline
   */
  const effects = {
    /**
     * Gaussian blur using box blur approximation
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} radius - Blur radius in pixels
     */
    blur: (ctx, radius) => {
      if (radius <= 0) return;

      const canvas = ctx.canvas;
      const w = canvas.width;
      const h = canvas.height;

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Simple box blur (3 passes for better quality)
      const boxSize = Math.ceil(radius);
      for (let pass = 0; pass < 3; pass++) {
        blurPass(data, w, h, boxSize);
      }

      ctx.putImageData(imageData, 0, 0);
    },

    /**
     * Phase noise for data desynchronization effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} intensity - Noise intensity (0-1)
     * @param {number} time - Animation time for coherent noise
     */
    phaseNoise: (ctx, intensity, time = 0) => {
      if (intensity <= 0) return;

      const canvas = ctx.canvas;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Simplex-like noise using sin-based random
      for (let i = 0; i < data.length; i += 4) {
        const idx = i / 4;
        const x = idx % canvas.width;
        const y = Math.floor(idx / canvas.width);

        const noise = Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time) * intensity;
        const noiseVal = Math.abs(noise) * 255;

        data[i] += noiseVal * 0.3;     // R
        data[i + 1] += noiseVal * 0.2; // G
        data[i + 2] += noiseVal * 0.1; // B
        // A unchanged

        // Clamp to valid range
        data[i] = Math.min(255, data[i]);
        data[i + 1] = Math.min(255, data[i + 1]);
        data[i + 2] = Math.min(255, data[i + 2]);
      }

      ctx.putImageData(imageData, 0, 0);
    },

    /**
     * Vignette (darkening at edges)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} intensity - Vignette darkness (0-1)
     * @param {number} falloff - How quickly darkness increases (0-1)
     */
    vignette: (ctx, intensity = 0.3, falloff = 0.6) => {
      const canvas = ctx.canvas;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const idx = i / 4;
        const x = idx % w;
        const y = Math.floor(idx / w);

        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vignette = 1 - Math.pow(dist / maxDist, falloff) * intensity;

        data[i] *= vignette;
        data[i + 1] *= vignette;
        data[i + 2] *= vignette;
      }

      ctx.putImageData(imageData, 0, 0);
    },
  };

  /**
   * Blur helper: single pass of box blur
   */
  function blurPass(data, w, h, radius) {
    const temp = new Uint8ClampedArray(data.length);

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.max(0, Math.min(w - 1, x + dx));
          const idx = (y * w + nx) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }

        const idx = (y * w + x) * 4;
        temp[idx] = r / count;
        temp[idx + 1] = g / count;
        temp[idx + 2] = b / count;
        temp[idx + 3] = a / count;
      }
    }

    // Vertical pass
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          const ny = Math.max(0, Math.min(h - 1, y + dy));
          const idx = (ny * w + x) * 4;
          r += temp[idx];
          g += temp[idx + 1];
          b += temp[idx + 2];
          a += temp[idx + 3];
          count++;
        }

        const idx = (y * w + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }
  }

  /**
   * Public API
   */
  return {
    /**
     * Initialize the animation system
     */
    init: function() {
      isRunning = true;
      lastFrameTime = performance.now();
      this.loop();
    },

    /**
     * Stop the animation system
     */
    stop: function() {
      isRunning = false;
    },

    /**
     * Main animation loop
     */
    loop: function() {
      if (!isRunning) return;

      const now = performance.now();
      const deltaTime = now - lastFrameTime;

      // Update target FPS based on synchronization state
      const targetFps = isSynchronized ? config.fpsSync : config.fpsUnsync;
      if (currentFps !== targetFps) {
        currentFps = targetFps;
        targetFrameTime = 1000 / currentFps;
      }

      // Throttle frame updates
      if (deltaTime >= targetFrameTime) {
        lastFrameTime = now;
        frameCount++;

        // Update all active animations
        for (let i = animations.length - 1; i >= 0; i--) {
          if (animations[i].update_frame(deltaTime)) {
            animations.splice(i, 1);
          }
        }

        // Update performance metrics
        if (config.enablePerformanceMonitoring) {
          performanceMetrics.frameTime = deltaTime;
          performanceMetrics.fps = Math.round(1000 / deltaTime);
          performanceMetrics.skippedFrames = frameSkipCount;
        }
      } else {
        frameSkipCount++;
      }

      // Reset skip counter periodically
      if (frameCount % 300 === 0) {
        frameSkipCount = 0;
      }

      requestAnimationFrame(() => this.loop());
    },

    /**
     * Add animation to queue
     * @param {string} id - Unique animation ID
     * @param {function} update - Update callback (eased, progress) => {}
     * @param {number} duration - Duration in milliseconds
     * @param {string|function} easing - Easing function name or custom function
     * @param {function} onComplete - Callback when animation completes
     * @returns {Animation} Animation object
     */
    animate: function(id, update, duration, easing = 'easeInOutQuad', onComplete = null) {
      // Cancel existing animation with same ID
      const existingIdx = animations.findIndex(a => a.id === id);
      if (existingIdx !== -1) {
        animations.splice(existingIdx, 1);
      }

      const anim = new Animation(id, update, duration, easing, onComplete);
      animations.push(anim);
      return anim;
    },

    /**
     * Pause animation by ID
     */
    pauseAnimation: function(id) {
      const anim = animations.find(a => a.id === id);
      if (anim) anim.pause();
    },

    /**
     * Resume animation by ID
     */
    resumeAnimation: function(id) {
      const anim = animations.find(a => a.id === id);
      if (anim) anim.resume();
    },

    /**
     * Cancel animation by ID
     */
    cancelAnimation: function(id) {
      const idx = animations.findIndex(a => a.id === id);
      if (idx !== -1) {
        animations.splice(idx, 1);
        return true;
      }
      return false;
    },

    /**
     * Cancel all animations
     */
    cancelAll: function() {
      animations.length = 0;
    },

    /**
     * Set synchronization state (affects FPS)
     */
    setSynchronized: function(sync) {
      isSynchronized = sync;
    },

    /**
     * Get easing function by name
     */
    getEasing: function(name) {
      return easings[name] || easings.easeInOutQuad;
    },

    /**
     * Get all available easing names
     */
    getEasingNames: function() {
      return Object.keys(easings);
    },

    /**
     * Canvas effects
     */
    effects: effects,

    /**
     * Get performance metrics
     */
    getMetrics: function() {
      return { ...performanceMetrics };
    },

    /**
     * Check if any animations are active
     */
    hasActiveAnimations: function() {
      return animations.length > 0;
    },

    /**
     * Get animation count
     */
    getAnimationCount: function() {
      return animations.length;
    },
  };
})();

// Auto-initialize on script load (if document is ready)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    EHTAnimations.init();
  });
} else {
  EHTAnimations.init();
}
