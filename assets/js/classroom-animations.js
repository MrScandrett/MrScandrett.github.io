/**
 * classroom-animations.js — ClassroomOS Shared Animation Engine
 *
 * Global animation infrastructure available to every lesson.
 * Provides:
 *   - Throttled requestAnimationFrame loop (60 FPS target)
 *   - 16 easing functions for smooth transitions
 *   - Animation queue with ID-based management
 *   - Canvas effects pipeline (blur, phase-noise, vignette)
 *   - Performance monitoring (frame time, FPS, skips)
 *
 * Usage:
 *   ClassroomAnimations.animate('my-anim', (eased) => {
 *     el.style.opacity = eased;
 *   }, 300, 'easeOutQuad');
 *
 * Include BEFORE lesson-layout.js:
 *   <script src="../assets/js/classroom-animations.js"></script>
 *
 * Backward compat: window.EHTAnimations is aliased to this module.
 */

const ClassroomAnimations = (() => {
  const config = {
    fps: 60,
    enablePerformanceMonitoring: true,
  };

  let isRunning = false;
  let frameCount = 0;
  let frameSkipCount = 0;
  let lastFrameTime = 0;
  const targetFrameTime = 1000 / config.fps;

  const animations = [];
  const performanceMetrics = {
    frameTime: 0,
    fps: 0,
    skippedFrames: 0,
  };

  // ─── Easing Functions ───────────────────────────────────────────────────────

  const easings = {
    linear: (t) => t,

    easeInQuad:    (t) => t * t,
    easeOutQuad:   (t) => t * (2 - t),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    easeInCubic:    (t) => t * t * t,
    easeOutCubic:   (t) => 1 + (--t) * t * t,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 + (--t) * (2 * (--t)) * (2 * t),

    easeInQuart:    (t) => t * t * t * t,
    easeOutQuart:   (t) => 1 - (--t) * t * t * t,
    easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

    easeInQuint:    (t) => t * t * t * t * t,
    easeOutQuint:   (t) => 1 + (--t) * t * t * t * t,
    easeInOutQuint: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,

    easeInExpo:  (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
    easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeInOutExpo: (t) => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
    },

    easeInCirc:  (t) => 1 - Math.sqrt(1 - t * t),
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
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1)       return n1 * t * t;
      if (t < 2 / d1)       return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1)     return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },

    smoothstep: (t) => {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t);
    },

    smootherstep: (t) => {
      t = Math.max(0, Math.min(1, t));
      return t * t * t * (t * (t * 6 - 15) + 10);
    },
  };

  // ─── Animation Object ────────────────────────────────────────────────────────

  class Animation {
    constructor(id, update, duration, easing = 'easeInOutQuad', onComplete = null) {
      this.id         = id;
      this.update     = update;
      this.duration   = duration;
      this.easing     = typeof easing === 'string' ? (easings[easing] || easings.easeInOutQuad) : easing;
      this.onComplete = onComplete;
      this.elapsed    = 0;
      this.paused     = false;
    }

    tick(deltaTime) {
      if (this.paused) return false;
      this.elapsed += deltaTime;
      const progress = Math.min(1, this.elapsed / this.duration);
      this.update(this.easing(progress), progress);
      if (progress >= 1) {
        if (this.onComplete) this.onComplete();
        return true; // done — remove from queue
      }
      return false;
    }

    pause()  { this.paused = true; }
    resume() { this.paused = false; }
  }

  // ─── Canvas Effects Pipeline ─────────────────────────────────────────────────

  const effects = {
    /**
     * Box-blur approximation (3 passes for quality)
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} radius
     */
    blur(ctx, radius) {
      if (radius <= 0) return;
      const { canvas } = ctx;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const boxSize = Math.ceil(radius);
      for (let i = 0; i < 3; i++) blurPass(data.data, canvas.width, canvas.height, boxSize);
      ctx.putImageData(data, 0, 0);
    },

    /**
     * Phase-noise overlay — interference / desync effect
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} intensity  0–1
     * @param {number} time       animation clock value
     */
    phaseNoise(ctx, intensity, time = 0) {
      if (intensity <= 0) return;
      const { canvas } = ctx;
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const idx = i / 4;
        const x = idx % canvas.width;
        const y = Math.floor(idx / canvas.width);
        const n = Math.abs(Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time) * intensity) * 255;
        d[i]     = Math.min(255, d[i]     + n * 0.3);
        d[i + 1] = Math.min(255, d[i + 1] + n * 0.2);
        d[i + 2] = Math.min(255, d[i + 2] + n * 0.1);
      }
      ctx.putImageData(img, 0, 0);
    },

    /**
     * Vignette — darken edges
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} intensity  0–1
     * @param {number} falloff    0–1
     */
    vignette(ctx, intensity = 0.3, falloff = 0.6) {
      const { canvas } = ctx;
      const { width: w, height: h } = canvas;
      const cx = w / 2, cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const idx = i / 4;
        const dx = (idx % w) - cx;
        const dy = Math.floor(idx / w) - cy;
        const v = 1 - Math.pow(Math.sqrt(dx * dx + dy * dy) / maxDist, falloff) * intensity;
        d[i] *= v; d[i + 1] *= v; d[i + 2] *= v;
      }
      ctx.putImageData(img, 0, 0);
    },
  };

  function blurPass(data, w, h, radius) {
    const tmp = new Uint8ClampedArray(data.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.max(0, Math.min(w - 1, x + dx));
          const i = (y * w + nx) * 4;
          r += data[i]; g += data[i+1]; b += data[i+2]; a += data[i+3]; n++;
        }
        const i = (y * w + x) * 4;
        tmp[i] = r/n; tmp[i+1] = g/n; tmp[i+2] = b/n; tmp[i+3] = a/n;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = Math.max(0, Math.min(h - 1, y + dy));
          const i = (ny * w + x) * 4;
          r += tmp[i]; g += tmp[i+1]; b += tmp[i+2]; a += tmp[i+3]; n++;
        }
        const i = (y * w + x) * 4;
        data[i] = r/n; data[i+1] = g/n; data[i+2] = b/n; data[i+3] = a/n;
      }
    }
  }

  // ─── Main Loop ───────────────────────────────────────────────────────────────

  function loop() {
    if (!isRunning) return;

    const now = performance.now();
    const delta = now - lastFrameTime;

    if (delta >= targetFrameTime) {
      lastFrameTime = now;
      frameCount++;

      for (let i = animations.length - 1; i >= 0; i--) {
        if (animations[i].tick(delta)) animations.splice(i, 1);
      }

      if (config.enablePerformanceMonitoring) {
        performanceMetrics.frameTime    = delta;
        performanceMetrics.fps          = Math.round(1000 / delta);
        performanceMetrics.skippedFrames = frameSkipCount;
      }
    } else {
      frameSkipCount++;
    }

    if (frameCount % 300 === 0) frameSkipCount = 0;

    requestAnimationFrame(loop);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  const api = {
    init() {
      if (isRunning) return;
      isRunning = true;
      lastFrameTime = performance.now();
      loop();
    },

    stop() {
      isRunning = false;
    },

    /**
     * Schedule an animation.
     * @param {string}          id         Unique ID — cancels any existing animation with same ID
     * @param {function}        update     Called each frame with (easedProgress, rawProgress)
     * @param {number}          duration   Milliseconds
     * @param {string|function} easing     Easing name or custom function (default: 'easeInOutQuad')
     * @param {function}        onComplete Called when animation finishes
     * @returns {Animation}
     */
    animate(id, update, duration, easing = 'easeInOutQuad', onComplete = null) {
      const idx = animations.findIndex(a => a.id === id);
      if (idx !== -1) animations.splice(idx, 1);
      const anim = new Animation(id, update, duration, easing, onComplete);
      animations.push(anim);
      return anim;
    },

    pauseAnimation(id)  { const a = animations.find(a => a.id === id); if (a) a.pause(); },
    resumeAnimation(id) { const a = animations.find(a => a.id === id); if (a) a.resume(); },

    cancelAnimation(id) {
      const idx = animations.findIndex(a => a.id === id);
      if (idx !== -1) { animations.splice(idx, 1); return true; }
      return false;
    },

    cancelAll() { animations.length = 0; },

    getEasing(name)  { return easings[name] || easings.easeInOutQuad; },
    getEasingNames() { return Object.keys(easings); },

    effects,
    getMetrics()          { return { ...performanceMetrics }; },
    hasActiveAnimations() { return animations.length > 0; },
    getAnimationCount()   { return animations.length; },

    // EHT backward-compat: setSynchronized is a no-op here (kept so eht-ui.js doesn't error)
    setSynchronized() {},
  };

  return api;
})();

// ─── Global exposure ──────────────────────────────────────────────────────────

window.ClassroomAnimations = ClassroomAnimations;

// Backward compatibility — EHT code still calls EHTAnimations.animate(...)
window.EHTAnimations = ClassroomAnimations;

// Auto-start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ClassroomAnimations.init());
} else {
  ClassroomAnimations.init();
}
