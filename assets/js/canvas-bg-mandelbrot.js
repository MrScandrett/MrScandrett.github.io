/**
 * canvas-bg-mandelbrot.js — lazy-loaded WebGL renderer for the 'mandelbrot'
 * site background (canvas-bg.js falls back to its small CPU version when
 * this returns null: no WebGL, or no highp floats in fragment shaders).
 *
 * The camera tours real deep-zoom landmarks of the set (Seahorse Valley,
 * Elephant Valley, Misiurewicz spirals, a ring of mini-brots), flying between them
 * on a van Wijk–Nuij path: zoom out, pan, dive back in at a steady
 * perceived speed. The tour runs on the wall clock, so every page shows
 * the same moment of it and the dive carries on across page loads.
 *
 * Colour is the smooth escape count on a log scale (bands stay even at any
 * depth) mapped through the theme swatch, plus a distance-estimate glow
 * that draws the boundary's filaments as thin lines of light.
 *
 * float32 limits the deepest view to a half-height of ~1.5e-4 (about
 * 8,000× from the overview) before pixels turn blocky.
 */
(function () {
  'use strict';

  var FALLBACK_SWATCH = ['#05010f', '#5b0e9b', '#ff8c00', '#ffd23f'];

  var MANDELBROT_THEME_PALETTES = {
    day:         ['#020b17', '#004b99', '#0071e3', '#7cd0ff'],
    sakura:      ['#13020b', '#731346', '#ff6b9d', '#ffd4e5'],
    diamond:     ['#020d18', '#004c66', '#00c6ff', '#d0f8ff'],
    emerald:     ['#021308', '#0a4d29', '#22c55e', '#a7f3d0'],
    topaz:       ['#140b01', '#663d00', '#ff9f00', '#ffe875'],
    goldfish:    ['#140601', '#8c2c04', '#ff6a1a', '#ffc233'],
    cobblestone: ['#0a0b0d', '#33373d', '#8a8d91', '#e2e6eb'],
    bark:        ['#120a05', '#4a2c14', '#c48238', '#fcd385'],
    night:       ['#03050d', '#142247', '#3b82f6', '#a5c9ff'],
    vaporwave:   ['#07000d', '#590059', '#ff007f', '#00ffff'],
    mandelbrot:  ['#05010f', '#5b0e9b', '#ff8c00', '#ffd23f'],
    lavalamp:    ['#0a0103', '#7a081a', '#ff1a40', '#ff8ca3']
  };

  /* Each stop: a point on the boundary and how deep to dive there.
   * Checked numerically to keep detail (not solid interior or empty
   * exterior) all the way down to `depth`. */
  var TOUR = [
    { name: 'Seahorse Valley',  x: -0.743643887037151,  y: 0.131825904205330,  depth: 1.5e-4 },
    { name: 'Elephant Valley',  x: 0.2925755,           y: -0.0149977,         depth: 6e-4 },
    { name: 'Lightning spiral', x: 0.001643721971153,   y: -0.822467633298876, depth: 1.5e-4 },
    { name: 'Misiurewicz arm',  x: -0.77568377,         y: 0.13646737,         depth: 1.5e-4 },
    { name: 'Quad spiral',      x: 0.27322626,          y: 0.595153338,        depth: 3e-4 },
    { name: 'Triple spiral',    x: -0.0883,             y: 0.6549,             depth: 3e-4 }
  ];
  var RHO = Math.SQRT2;     // van Wijk–Nuij zoom/pan trade-off
  var SPEED = 0.085;        // path units per second (calm, meditative floating)
  var DWELL = 20;           // seconds resting at each depth (chill, lava-lamp pace)
  var MAX_ITER = 480;       // shader loop bound; per-frame count scales with depth

  /* ── van Wijk & Nuij, "Smooth and efficient zooming and panning" ── */
  function flight(a, b) {
    var w0 = a.depth, w1 = b.depth;
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1e-12) {
      var k = w1 < w0 ? -1 : 1;
      return { S: Math.abs(Math.log(w1 / w0)) / RHO, at: function (s) { return { x: a.x, y: a.y, w: w0 * Math.exp(k * RHO * s) }; } };
    }
    var r2 = RHO * RHO, r4 = r2 * r2;
    function r(i) {
      var wi = i ? w1 : w0;
      var bi = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * r4 * d * d) / (2 * wi * r2 * d);
      return Math.log(Math.sqrt(bi * bi + 1) - bi);
    }
    var r0 = r(0), r1 = r(1);
    return {
      S: (r1 - r0) / RHO,
      at: function (s) {
        var u = w0 / r2 * (Math.cosh(r0) * Math.tanh(RHO * s + r0) - Math.sinh(r0));
        return { x: a.x + dx / d * u, y: a.y + dy / d * u, w: w0 * Math.cosh(r0) / Math.cosh(RHO * s + r0) };
      }
    };
  }

  var legs = TOUR.map(function (stop, i) {
    var f = flight(stop, TOUR[(i + 1) % TOUR.length]);
    return { from: stop, f: f, fly: f.S / SPEED };
  });
  var cycle = legs.reduce(function (sum, leg) { return sum + DWELL + leg.fly; }, 0);

  // Ease the ends of each flight a little so the camera settles into a dive
  // rather than stopping dead, without slowing the middle of the trip.
  function ease(s) { return s - Math.sin(2 * Math.PI * s) / (2 * Math.PI) * 0.7; }

  function view(seconds) {
    var tt = ((seconds % cycle) + cycle) % cycle;
    for (var i = 0; i < legs.length; i++) {
      var leg = legs[i];
      if (tt < DWELL) return { x: leg.from.x, y: leg.from.y, w: leg.from.depth, stop: leg.from.name };
      tt -= DWELL;
      if (tt < leg.fly) {
        var v = leg.f.at(ease(tt / leg.fly) * leg.f.S);
        v.stop = null;
        return v;
      }
      tt -= leg.fly;
    }
    var last = legs[0].from;
    return { x: last.x, y: last.y, w: last.depth, stop: last.name };
  }

  function hexToRgb01(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.replace(/./g, '$&$&');
    var n = parseInt(hex, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function themeSwatch() {
    var registry = window.ClassroomOSThemeRegistry;
    var id = document.documentElement.dataset.theme || 'day';
    var swatch = (registry && typeof registry.getMandelSwatch === 'function')
      ? registry.getMandelSwatch(id)
      : (MANDELBROT_THEME_PALETTES[id] || FALLBACK_SWATCH);
    return swatch.slice(0, 4).map(hexToRgb01);
  }

  var VERTEX = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAGMENT = [
    'precision highp float;',
    'uniform vec2 res;',
    'uniform vec2 center;',
    'uniform float halfH;',
    'uniform vec2 rot;',
    'uniform int maxIter;',
    'uniform float phase;',
    'uniform vec2 jitter;',
    'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;',
    'uniform float scaleTexture;',
    // Looping palette base → c1 → c2 → c3 → c2 → c1 → base, so it cycles without seams.
    'vec3 pal(float t){',
    '  t = fract(t) * 6.0; float f = smoothstep(0.0, 1.0, fract(t));',
    '  if (t < 1.0) return mix(c0 * 2.5, c1, f);',
    '  if (t < 2.0) return mix(c1, c2, f);',
    '  if (t < 3.0) return mix(c2, c3, f);',
    '  if (t < 4.0) return mix(c3, c2, f);',
    '  if (t < 5.0) return mix(c2, c1, f);',
    '  return mix(c1, c0 * 2.5, f);',
    '}',
    'void main(){',
    '  vec2 q = (gl_FragCoord.xy + jitter - 0.5 * res) / (0.5 * res.y);',
    '  vec2 c = center + halfH * vec2(q.x * rot.x - q.y * rot.y, q.x * rot.y + q.y * rot.x);',
    '  float px = 2.0 * halfH / res.y;',
    '  vec2 vig = gl_FragCoord.xy / res - 0.5;',
    '  float shade = 1.0 - 0.55 * dot(vig, vig);',
    '  float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;',
    // Skip the main cardioid and period-2 bulb outright: they are interior
    // and would otherwise spend every iteration when the view is wide.
    '  float xq = c.x - 0.25; float qq = xq * xq + c.y * c.y;',
    '  bool inside = qq * (qq + xq) <= 0.25 * c.y * c.y || (c.x + 1.0) * (c.x + 1.0) + c.y * c.y <= 0.0625;',
    '  vec2 z = vec2(0.0); vec2 dz = vec2(0.0); float r2 = 0.0; int n = 0;',
    '  if (!inside) {',
    '    for (int i = 0; i < ' + MAX_ITER + '; i++) {',
    '      if (i >= maxIter) break;',
    '      dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x) + vec2(1.0, 0.0);',
    '      z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;',
    '      r2 = dot(z, z); n = i;',
    '      if (r2 > 1024.0) break;',
    '    }',
    '    inside = r2 <= 1024.0;',
    '  }',
    '  vec3 col;',
    '  if (inside) {',
    '    col = c0 * 1.4 + c1 * 0.12;',
    '  } else {',
    '    float mu = float(n) + 2.0 - log2(log2(r2) * 0.5);',
    '    float dzl = length(dz);',
    // Distance to the set in pixels: <1 on a filament, growing outward.
    '    float de = dzl > 0.0 ? 0.5 * log(r2) * sqrt(r2) / dzl / px : 0.0;',
    '    float near = exp(-de * 0.04);',
    '    vec3 band = pal(log2(max(mu, 1.0)) * 0.38 + phase);',
    '    col = mix(c0 * 1.8, band, 0.25 + 0.65 * near);',
    '    float glow = exp(-de * 0.9);',
    '    col += mix(c3, vec3(1.0), 0.25) * glow * 0.45;',
    '  }',
    '  if (scaleTexture > 0.5) {',
    '    vec2 scUv = gl_FragCoord.xy / 32.0;',
    '    float scRow = floor(scUv.y);',
    '    if (mod(scRow, 2.0) == 1.0) scUv.x += 0.5;',
    '    vec2 fsc = fract(scUv);',
    '    float scDist = length(fsc - vec2(0.5, 0.0));',
    '    float scShimmer = 0.82 + 0.32 * sin(scUv.x * 1.6 + scUv.y * 2.4 + phase * 6.28318);',
    '    float scEdge = smoothstep(0.42, 0.49, scDist) * (1.0 - smoothstep(0.49, 0.56, scDist));',
    '    float scSpec = pow(clamp(1.0 - abs(scDist - 0.42) * 4.5, 0.0, 1.0), 2.5) * scShimmer;',
    '    float scBody = (1.0 - smoothstep(0.0, 0.48, scDist) * 0.18);',
    '    col = col * scBody + scEdge * c3 * 0.42 + scSpec * c3 * 0.35;',
    '  }',
    '  gl_FragColor = vec4(col * shade + dither, 1.0);',
    '}'
  ].join('\n');

  function create() {
    var surface = document.createElement('canvas');
    // Software WebGL (blocklisted GPU, no drivers) takes ~0.5 s a frame here
    // and would freeze the page; the CPU fallback is the better choice there.
    var gl = surface.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, failIfMajorPerformanceCaveat: true });
    if (!gl) return null;
    var debug = gl.getExtension('WEBGL_debug_renderer_info');
    if (debug && /swiftshader|llvmpipe|softpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))) return null;
    var high = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!high || high.precision < 23) return null;   // mediump fractals are mush

    function shader(type, source) {
      var s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    } catch (_) { return null; }
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var attr = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
    var loc = {};
    ['res', 'center', 'halfH', 'rot', 'maxIter', 'phase', 'jitter', 'c0', 'c1', 'c2', 'c3', 'scaleTexture'].forEach(function (n) { loc[n] = gl.getUniformLocation(program, n); });

    // Resolution is in CSS pixels × renderScale (never device pixels: the
    // glow is already soft). It steps down when frames run long, and the
    // frame rate drops to 30 once it has hit the floor.
    var width = 0, height = 0, renderScale = 0.75, MIN_SCALE = 0.35;
    var frames = 0, lastDraw = 0, lastNow = null, slowFrames = 0, capped = false, gaps = [], current = null, stalls = 0;
    var swatchTheme = null, swatch = null;

    // Temporal anti-aliasing: each frame samples a different sub-pixel
    // offset and is blended over the last (the drawing buffer is kept), so
    // filaments finer than a pixel average out instead of glittering as
    // the camera zooms. The camera moves slowly enough that this reads as
    // a faint motion blur at most.
    var JITTER = [[0.25, 0.75], [0.75, 0.25], [0.125, 0.375], [0.625, 0.875], [0.375, 0.125], [0.875, 0.625], [0.5, 0.5], [0, 0]];
    var fresh = true;
    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);

    function resize(w, h) {
      width = w; height = h;
      var scale = Math.min(renderScale, Math.sqrt(1.2e6 / Math.max(1, w * h)));
      surface.width = Math.max(1, Math.round(w * scale));
      surface.height = Math.max(1, Math.round(h * scale));
      gl.viewport(0, 0, surface.width, surface.height);
      fresh = true;
    }

    function adapt(gap) {
      gaps.push(gap); if (gaps.length > 120) gaps.shift();
      // ~40 fps or worse for about a second: shed pixels.
      slowFrames = gap > 25 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames < 45) return;
      slowFrames = 0;
      if (renderScale > MIN_SCALE) { renderScale = Math.max(MIN_SCALE, renderScale * 0.8); resize(width, height); }
      else capped = true;
    }

    surface.addEventListener('webglcontextlost', function (e) { e.preventDefault(); api.failed = true; });

    var api = {
      failed: false,
      pause: function () { lastNow = null; fresh = true; },
      stats: function () {
        var sorted = gaps.slice().sort(function (a, b) { return a - b; });
        return {
          frames: frames, resolutionScale: renderScale, fpsCap: capped ? 30 : 60,
          frameMsP95: sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.95)] : 0,
          surface: [surface.width, surface.height], view: current, cycleSeconds: cycle
        };
      },
      // `seconds` lets tests pin the tour to a moment; normally the wall clock.
      draw: function (ctx, w, h, now, seconds) {
        if (api.failed) return false;
        if (w !== width || h !== height) resize(w, h);
        if (lastNow !== null) adapt(now - lastNow);
        lastNow = now;
        if (capped && now - lastDraw < 1000 / 30 - 1) { ctx.drawImage(surface, 0, 0, w, h); return true; }
        lastDraw = now;

        var clock = seconds != null ? seconds : Date.now() / 1000;
        var v = view(clock);
        current = v;
        var angle = clock * 0.004 + Math.sin(clock * 0.012) * 0.06;
        var depth = Math.max(0, Math.log2(1.25 / v.w));
        var iter = Math.round(Math.min(MAX_ITER, 72 + 30 * depth));

        var theme = document.documentElement.dataset.theme || 'day';
        if (theme !== swatchTheme) {
          swatchTheme = theme;
          swatch = themeSwatch();
          fresh = true;
        }

        gl.uniform2f(loc.res, surface.width, surface.height);
        gl.uniform2f(loc.center, v.x, v.y);
        gl.uniform1f(loc.halfH, v.w);
        gl.uniform2f(loc.rot, Math.cos(angle), Math.sin(angle));
        gl.uniform1i(loc.maxIter, iter);
        gl.uniform1f(loc.phase, (clock * 0.0035) % 1);
        gl.uniform1f(loc.scaleTexture, theme === 'goldfish' ? 1.0 : 0.0);
        var j = JITTER[frames % JITTER.length];
        gl.uniform2f(loc.jitter, j[0] - 0.5, j[1] - 0.5);
        if (fresh) gl.disable(gl.BLEND);
        else { gl.enable(gl.BLEND); gl.blendColor(0, 0, 0, 0.35); }
        fresh = false;
        gl.uniform3fv(loc.c0, swatch[0]);
        gl.uniform3fv(loc.c1, swatch[1]);
        gl.uniform3fv(loc.c2, swatch[2]);
        gl.uniform3fv(loc.c3, swatch[3] || swatch[2]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        var begin = performance.now();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(surface, 0, 0, w, h);
        frames++;
        // drawImage waits for the GPU; if that alone keeps taking longer
        // than a frame even at the lowest resolution, hand back to the CPU path.
        stalls = performance.now() - begin > 60 ? stalls + 1 : 0;
        if (stalls > 4 && renderScale <= MIN_SCALE) api.failed = true;
        else if (stalls > 4) { renderScale = MIN_SCALE; resize(width, height); stalls = 0; }
        return true;
      }
    };
    return api;
  }

  window.ClassroomOSMandelbrot = { create: create, view: view, tour: TOUR, cycleSeconds: cycle };
})();
