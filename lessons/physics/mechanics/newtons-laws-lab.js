/* Newton's Garden — Force Lab
   Simulator for lessons/physics/mechanics/newtons-laws.html.

   Three modes, all in real SI units with a fixed-step integrator:
     drop  — apples (or a hammer and feather) fall from Newton's tree:
             balanced forces while hanging (Law 1), a = F/m once the stem
             snaps (Law 2), and the action-reaction pair at the bonk (Law 3).
     push  — Newton pushes an apple cart (applied force, friction, F = ma),
             with an optional second lane for side-by-side comparisons.
     skate — Newton and a cart push off each other on ice (Law 3: equal
             forces, unequal accelerations, equal and opposite momentum).

   Needs assets/js/sim-kit.js (canvas sizing, rAF loop, theme colours). */
(function () {
  'use strict';

  var lab = document.getElementById('ng-lab');
  if (!lab || !window.SimKit) return;

  function $(sel, el) { return (el || lab).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || lab).querySelectorAll(sel)); }

  var stage = $('.ng-stage');
  var canvas = $('#ng-canvas');
  var view = SimKit.canvas2d(canvas, { box: stage });
  var ctx = view.ctx;
  var graphCanvas = $('#ng-graph');
  var gview = SimKit.canvas2d(graphCanvas, { box: graphCanvas.parentElement });
  var gctx = gview.ctx;

  var chipEl = $('#ng-law-chip');
  var captionEl = $('#ng-caption-text');
  var continueBtn = $('#ng-continue');
  var readoutBox = $('#ng-readouts');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Data ─────────────────────────────────────────────────── */
  var WORLDS = {
    earth:   { name: 'Earth',    g: 9.8,  rho: 1.2,  sky: ['#9fd3fb', '#e9f6ff'], ground: '#86b24f', soil: '#5b7a2c' },
    moon:    { name: 'the Moon', g: 1.62, rho: 0,    sky: ['#04050b', '#1b1e2c'], ground: '#a8a8ad', soil: '#6d6d73' },
    mars:    { name: 'Mars',     g: 3.71, rho: 0.02, sky: ['#d99a6c', '#f4d6bb'], ground: '#b65a2e', soil: '#7a3416' },
    jupiter: { name: 'Jupiter',  g: 24.8, rho: 0.16, sky: ['#c98e57', '#f1d7b0'], ground: '#9c7650', soil: '#6b4c2f' }
  };
  /* cda = drag coefficient × frontal area (m²). Feather numbers give a
     terminal speed of about 1 m/s in Earth air, roughly a real feather. */
  var OBJECTS = {
    apple:   { name: 'Apple',          m: 0.15,  cda: 0.0024, kind: 'apple',   px: 10, bounce: 0.3 },
    big:     { name: 'Big apple',      m: 0.4,   cda: 0.0045, kind: 'apple',   px: 13, bounce: 0.3 },
    giant:   { name: 'Giant apple',    m: 10,    cda: 0.033,  kind: 'apple',   px: 23, bounce: 0.2 },
    feather: { name: 'Falcon feather', m: 0.03,  cda: 0.4,    kind: 'feather', px: 16, bounce: 0 },
    hammer:  { name: 'Hammer',         m: 1.3,   cda: 0.012,  kind: 'hammer',  px: 17, bounce: 0.05 }
  };
  /* Stopping distance: how far the apple squashes into whatever it hits. */
  var HEADGEAR = {
    bare:   { name: 'bare head',    d: 0.01 },
    wig:    { name: 'curly wig',    d: 0.03 },
    helmet: { name: 'foam helmet',  d: 0.08 }
  };
  var SURFACES = {
    none:  { name: 'Frictionless', mu: 0 },
    ice:   { name: 'Ice',          mu: 0.02 },
    grass: { name: 'Grass',        mu: 0.12 },
    mud:   { name: 'Mud',          mu: 0.35 }
  };
  var STATIC_FACTOR = 1.3;          // μs = 1.3 μk
  var EARTH_MASS = 5.97e24;
  var HEAD_TOP = 1.75;              // top of Newton's wig, m
  var CART_HALF = 0.6;              // half the cart length, m
  var REACH = 0.61;                 // feet → hands when leaning into a push, m
  var RUN_MAX = 9;                  // Newton's top running speed (a good sprinter), m/s
  var SHOVE_TIME = 0.5;             // skate push-off duration, s
  var GROUND_PX = 46;

  var COLORS = {
    weight: '#dc2626', support: '#2563eb', drag: '#ea580c', applied: '#16a34a',
    net: '#7c3aed', vel: '#0f766e', a: '#c2410c', b: '#2563eb'
  };

  /* ── Settings (bound to [data-set] controls) ──────────────── */
  var S = {
    mode: 'drop', speed: 0.25, paused: false, showForces: true, showStrobe: true,
    obj: 'apple', race: 'none', world: 'earth', air: true, height: 2.5, head: 'bare',
    force: 100, load: 50, surface: 'ice', compare: false, forceB: 200, loadB: 50,
    mNewton: 70, mCart: 20, shove: 200
  };
  var MODE_SPEED = { drop: 0.25, push: 1, skate: 0.25 };
  var DROP_KEYS = ['obj', 'race', 'world', 'air', 'height', 'head'];
  var PUSH_RESET_KEYS = ['load', 'loadB', 'compare'];
  var SKATE_KEYS = ['mNewton', 'mCart', 'shove'];

  /* ── Formatting ───────────────────────────────────────────── */
  function fix(v, d) {
    if (!isFinite(v)) return '—';
    var s = v.toFixed(d);
    return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
  }
  function nice(v) {
    var a = Math.abs(v);
    if (a >= 100) return fix(v, 0);
    if (a >= 10) return fix(v, 1);
    if (a >= 0.1 || a === 0) return fix(v, 2);
    return fix(v, 3);
  }
  var SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function sci(v) {
    if (v === 0) return '0';
    var e = Math.floor(Math.log10(Math.abs(v)));
    var m = v / Math.pow(10, e);
    return m.toFixed(1) + ' × 10' + String(e).split('').map(function (c) { return SUP[c]; }).join('');
  }
  function speedLabel(s) { return { 1: '1×', 0.5: '½×', 0.25: '¼×', 0.1: '⅒×' }[s] || s + '×'; }

  /* ── Settings plumbing ────────────────────────────────────── */
  var OUT = {
    height: function () { return fix(S.height, 1) + ' m'; },
    force: function () { return S.force + ' N'; },
    forceB: function () { return S.forceB + ' N'; },
    load: function () { return S.load + ' kg'; },
    loadB: function () { return S.loadB + ' kg'; },
    mNewton: function () { return S.mNewton + ' kg'; },
    mCart: function () { return S.mCart + ' kg'; },
    shove: function () { return S.shove + ' N'; }
  };
  function readEl(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'range' || el.hasAttribute('data-num')) return Number(el.value);
    return el.value;
  }
  function showOut(key) {
    $$('[data-out="' + key + '"]').forEach(function (o) { o.textContent = OUT[key] ? OUT[key]() : String(S[key]); });
  }
  function setSetting(key, val) {
    S[key] = val;
    $$('[data-set="' + key + '"]').forEach(function (el) {
      if (el.type === 'checkbox') el.checked = !!val; else el.value = String(val);
    });
    showOut(key);
  }
  function syncDropUi() {
    var noAir = WORLDS[S.world].rho === 0;
    $$('[data-set="air"]').forEach(function (el) { el.disabled = noAir; });
    $$('[data-air-note]').forEach(function (el) { el.hidden = !noAir; });
    $$('[data-single-only]').forEach(function (el) { el.hidden = S.race !== 'none'; });
  }
  function syncPushUi() {
    $$('[data-compare-only]').forEach(function (el) { el.hidden = !S.compare; });
  }
  function onSetting(key) {
    if (DROP_KEYS.indexOf(key) >= 0) { syncDropUi(); resetDrop(); }
    if (PUSH_RESET_KEYS.indexOf(key) >= 0) { syncPushUi(); resetPush(); }
    if (SKATE_KEYS.indexOf(key) >= 0) resetSkate();
    if (key === 'speed') S.speed = Number(S.speed);
  }
  $$('[data-set]').forEach(function (el) {
    var key = el.getAttribute('data-set');
    el.addEventListener(el.type === 'range' ? 'input' : 'change', function () {
      S[key] = readEl(el);
      // the same setting can appear twice (lab + side panel); keep both in step
      setSetting(key, S[key]);
      onSetting(key);
    });
  });

  /* ── Drawing helpers ──────────────────────────────────────── */
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function pill(text, x, y, color, align) {
    ctx.save();
    ctx.font = '700 13px Inter, system-ui, sans-serif';
    var w = ctx.measureText(text).width + 14, h = 22;
    var left = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    left = Math.max(4, Math.min(view.width - w - 4, left));
    ctx.fillStyle = 'rgba(255,255,255,0.93)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    roundRect(ctx, left, y - h / 2, w, h, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, left + 7, y + 0.5);
    ctx.restore();
  }
  /* Arrow from (x0,y0) to (x1,y1) in px with an optional pill label. */
  function arrow(x0, y0, x1, y1, color, label, labelAlign, labelDx, labelDy) {
    var dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    if (len < 2) return;
    var ux = dx / len, uy = dy / len, head = Math.min(13, len * 0.6);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 - ux * head * 0.8, y1 - uy * head * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * head - uy * head * 0.55, y1 - uy * head + ux * head * 0.55);
    ctx.lineTo(x1 - ux * head + uy * head * 0.55, y1 - uy * head - ux * head * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (label) pill(label, x1 + (labelDx || 0), y1 + (labelDy || 0), color, labelAlign);
  }
  /* Force arrows span forces from a few millinewtons to ~100 N, so their
     lengths grow with log(F). Within one free-body diagram, use scaledLen
     relative to a reference force so the arrows still compare honestly. */
  function logLen(F) { return Math.min(110, 20 + 24 * Math.log10(1 + F / 0.05)); }

  function drawSky(world, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, world.sky[0]);
    g.addColorStop(1, world.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (world === WORLDS.moon) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (var i = 0; i < 40; i++) {
        var sx = (i * 137.5) % w, sy = (i * 71.3) % (h * 0.6);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      // Earth in the lunar sky
      ctx.beginPath(); ctx.arc(w - 70, 56, 22, 0, Math.PI * 2); ctx.fillStyle = '#2f6fd1'; ctx.fill();
      ctx.beginPath(); ctx.arc(w - 76, 50, 9, 0, Math.PI * 2); ctx.fillStyle = '#4fa35a'; ctx.fill();
    } else if (world === WORLDS.jupiter) {
      ctx.fillStyle = 'rgba(160,90,40,0.18)';
      for (var b = 0; b < 4; b++) ctx.fillRect(0, 30 + b * 46, w, 16);
    } else {
      ctx.beginPath();
      ctx.arc(w - 70, 56, world === WORLDS.mars ? 16 : 26, 0, Math.PI * 2);
      ctx.fillStyle = world === WORLDS.mars ? 'rgba(255,240,210,0.8)' : 'rgba(255,214,102,0.85)';
      ctx.fill();
    }
  }
  function drawGroundBand(world, w, h, groundY, kind) {
    ctx.fillStyle = world.ground;
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = world.soil;
    ctx.fillRect(0, groundY, w, 4);
    if (kind === 'grass' && world === WORLDS.earth) {
      ctx.strokeStyle = 'rgba(60,100,30,0.55)';
      ctx.lineWidth = 1.5;
      for (var x = 6; x < w; x += 17) {
        ctx.beginPath();
        ctx.moveTo(x, groundY + 2);
        ctx.lineTo(x - 3, groundY - 5);
        ctx.moveTo(x + 4, groundY + 2);
        ctx.lineTo(x + 6, groundY - 4);
        ctx.stroke();
      }
    }
  }

  /* Isaac Newton: x,y = feet in px, u = px per metre.
     o.pose: 'stand' | 'push';  o.face: 'up' | 'ahead' | 'ouch' | 'happy';
     o.dir: 1 faces right, -1 faces left; o.walk: stride phase (radians). */
  function drawNewton(x, y, u, o) {
    o = o || {};
    var c = ctx;
    function m(v) { return v * u; }
    c.save();
    c.translate(x, y);
    c.scale(o.dir || 1, 1);
    if (o.pose === 'push') c.rotate(0.2);
    var stroke = Math.max(2, m(0.1));
    var swing = o.walk ? Math.sin(o.walk) * 0.16 : 0;
    // legs (white stockings, dark breeches)
    c.lineCap = 'round';
    [[-0.06, swing], [0.06, -swing]].forEach(function (leg) {
      c.strokeStyle = '#e5e7eb';
      c.lineWidth = stroke;
      c.beginPath(); c.moveTo(m(leg[0] + leg[1] * 0.5), -m(0.45)); c.lineTo(m(leg[0] + leg[1]), -m(0.05)); c.stroke();
      c.strokeStyle = '#1f2937';
      c.beginPath(); c.moveTo(m(leg[0]), -m(0.85)); c.lineTo(m(leg[0] + leg[1] * 0.5), -m(0.45)); c.stroke();
      // shoe or skate
      c.fillStyle = '#111827';
      c.beginPath(); c.ellipse(m(leg[0] + leg[1] + 0.04), -m(0.03), m(0.08), m(0.035), 0, 0, Math.PI * 2); c.fill();
      if (o.skates) {
        c.strokeStyle = '#94a3b8';
        c.lineWidth = Math.max(1.5, m(0.025));
        c.beginPath(); c.moveTo(m(leg[0] + leg[1] - 0.06), m(0.02)); c.lineTo(m(leg[0] + leg[1] + 0.16), m(0.02)); c.stroke();
      }
    });
    // coat
    c.fillStyle = '#3b4a6b';
    roundRect(c, -m(0.2), -m(1.46), m(0.4), m(0.74), m(0.08));
    c.fill();
    c.fillStyle = '#2c3854';
    c.fillRect(-m(0.012), -m(1.4), m(0.024), m(0.66));
    c.fillStyle = '#d4af37';
    for (var k = 0; k < 4; k++) { c.beginPath(); c.arc(m(0.05), -m(1.34 - k * 0.13), Math.max(1, m(0.014)), 0, Math.PI * 2); c.fill(); }
    // cravat
    c.fillStyle = '#f8fafc';
    c.beginPath(); c.moveTo(-m(0.06), -m(1.46)); c.lineTo(m(0.06), -m(1.46)); c.lineTo(0, -m(1.3)); c.closePath(); c.fill();
    // arms
    c.strokeStyle = '#3b4a6b';
    c.lineWidth = Math.max(2, m(0.085));
    var hands;
    if (o.pose === 'push') hands = [[0.12, 1.36, 0.43, 1.02], [0.04, 1.36, 0.41, 0.96]];
    else if (o.face === 'ouch') hands = [[0.15, 1.38, 0.13, 1.66], [-0.15, 1.38, -0.13, 1.66]];
    else hands = [[0.17, 1.38, 0.24, 0.92], [-0.17, 1.38, -0.24, 0.92]];
    hands.forEach(function (a) {
      c.beginPath(); c.moveTo(m(a[0]), -m(a[1])); c.lineTo(m(a[2]), -m(a[3])); c.stroke();
      c.fillStyle = '#f1d3b3';
      c.beginPath(); c.arc(m(a[2]), -m(a[3]), Math.max(1.5, m(0.045)), 0, Math.PI * 2); c.fill();
    });
    // wig (behind head)
    var hy = -m(1.58), hr = m(0.115);
    c.fillStyle = '#eceff3';
    c.strokeStyle = '#a3aab5';
    c.lineWidth = Math.max(1, m(0.012));
    [[0, 1.63, 0.14], [-0.13, 1.53, 0.065], [0.13, 1.53, 0.065], [-0.14, 1.43, 0.06], [0.14, 1.43, 0.06]].forEach(function (cl) {
      c.beginPath(); c.arc(m(cl[0]), -m(cl[1]), m(cl[2]), 0, Math.PI * 2); c.fill(); c.stroke();
    });
    // face
    c.fillStyle = '#f1d3b3';
    c.strokeStyle = '#3b2f22';
    c.lineWidth = Math.max(1, m(0.014));
    c.beginPath(); c.arc(0, hy, hr, 0, Math.PI * 2); c.fill(); c.stroke();
    var ey = hy - m(0.01), lift = o.face === 'up' ? -m(0.025) : 0;
    c.fillStyle = '#1f2937';
    c.strokeStyle = '#1f2937';
    if (o.face === 'ouch') {
      c.lineWidth = Math.max(1, m(0.016));
      [-0.045, 0.045].forEach(function (ex) {
        var r = m(0.018);
        c.beginPath();
        c.moveTo(m(ex) - r, ey - r); c.lineTo(m(ex) + r, ey + r);
        c.moveTo(m(ex) + r, ey - r); c.lineTo(m(ex) - r, ey + r);
        c.stroke();
      });
      c.beginPath(); c.ellipse(0, hy + m(0.055), m(0.022), m(0.028), 0, 0, Math.PI * 2); c.fill();
    } else {
      [-0.045, 0.045].forEach(function (ex) {
        c.beginPath(); c.arc(m(ex) + (o.face === 'ahead' ? m(0.015) : 0), ey + lift, Math.max(1, m(0.014)), 0, Math.PI * 2); c.fill();
      });
      c.lineWidth = Math.max(1, m(0.012));
      c.beginPath();
      if (o.face === 'up') { c.arc(0, hy + m(0.055), m(0.018), 0, Math.PI * 2); c.stroke(); }
      else { c.arc(0, hy + m(0.025), m(o.face === 'happy' ? 0.045 : 0.035), 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
    }
    if (o.helmet) {
      c.fillStyle = 'rgba(200,230,255,0.22)';
      c.strokeStyle = 'rgba(220,240,255,0.9)';
      c.lineWidth = Math.max(1, m(0.02));
      c.beginPath(); c.arc(0, -m(1.58), m(0.24), 0, Math.PI * 2); c.fill(); c.stroke();
    }
    if (o.foam) {
      c.fillStyle = '#facc15';
      c.strokeStyle = '#a16207';
      c.lineWidth = Math.max(1, m(0.012));
      c.beginPath(); c.ellipse(0, -m(1.7), m(0.17), m(0.08), 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
  }

  function drawApple(x, y, r, rot, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#fda4af');
    g.addColorStop(0.5, '#dc2626');
    g.addColorStop(1, '#8f1717');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4d6b25';
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 0.1, -r * 1.25); ctx.stroke();
    ctx.fillStyle = '#5b8a1c';
    ctx.beginPath(); ctx.ellipse(r * 0.38, -r * 1.12, r * 0.32, r * 0.15, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawFeather(x, y, r, rot, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    ctx.rotate((rot || 0) - 0.9);
    ctx.fillStyle = '#d6c7ad';
    ctx.strokeStyle = '#8b6f47';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.35, r * 1.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, r * 1.3); ctx.lineTo(0, -r); ctx.stroke();
    ctx.restore();
  }
  function drawHammer(x, y, r, rot, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(-r * 0.12, -r * 1.1, r * 0.24, r * 1.7);
    ctx.fillStyle = '#6b7280';
    roundRect(ctx, -r * 0.7, r * 0.45, r * 1.4, r * 0.5, 3);
    ctx.fill();
    ctx.restore();
  }
  function drawObject(o, x, y, rot, alpha) {
    if (o.kind === 'feather') drawFeather(x, y, o.px, rot, alpha);
    else if (o.kind === 'hammer') drawHammer(x, y, o.px, rot, alpha);
    else drawApple(x, y, o.px, rot, alpha);
  }
  /* px from the object's drawing origin down to its lowest point */
  function bottomOffset(o) {
    if (o.kind === 'hammer') return o.px * 0.95;
    if (o.kind === 'feather') return o.px * 0.9;
    return o.px;
  }

  function drawCart(x, groundY, u, load, rot, sled, label) {
    function m(v) { return v * u; }
    ctx.save();
    ctx.translate(x, groundY);
    if (sled) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = Math.max(2, m(0.05));
      ctx.beginPath();
      ctx.moveTo(-m(0.62), -m(0.04)); ctx.lineTo(m(0.55), -m(0.04));
      ctx.quadraticCurveTo(m(0.7), -m(0.04), m(0.7), -m(0.18));
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, m(0.03));
      [-0.4, 0.4].forEach(function (p) { ctx.beginPath(); ctx.moveTo(m(p), -m(0.04)); ctx.lineTo(m(p), -m(0.25)); ctx.stroke(); });
    } else {
      [-0.38, 0.38].forEach(function (p) {
        ctx.save();
        ctx.translate(m(p), -m(0.16));
        ctx.rotate(rot || 0);
        ctx.fillStyle = '#3f2a1a';
        ctx.beginPath(); ctx.arc(0, 0, m(0.16), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c9a26b';
        ctx.lineWidth = Math.max(1, m(0.025));
        for (var s = 0; s < 3; s++) {
          ctx.beginPath(); ctx.moveTo(-m(0.13), 0); ctx.lineTo(m(0.13), 0); ctx.stroke();
          ctx.rotate(Math.PI / 3);
        }
        ctx.restore();
      });
    }
    // apple pile — more apples for more load
    var count = Math.max(0, Math.min(26, Math.round((load - 10) / 5)));
    var ar = Math.max(2, m(0.075));
    for (var i = 0; i < count; i++) {
      var row = Math.floor(i / 7), col = i % 7;
      var ax = -m(0.45) + col * m(0.15) + (row % 2) * m(0.07);
      var ay = -m(0.82) - row * m(0.11);
      if (ax > m(0.5)) continue;
      ctx.fillStyle = i % 3 ? '#dc2626' : '#b91c1c';
      ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.fill();
    }
    // box
    ctx.fillStyle = '#b07a43';
    ctx.strokeStyle = '#6f4421';
    ctx.lineWidth = Math.max(1, m(0.02));
    roundRect(ctx, -m(CART_HALF), -m(0.85), m(CART_HALF * 2), m(0.6), m(0.05));
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(111,68,33,0.55)';
    [-0.65, -0.45].forEach(function (yy) { ctx.beginPath(); ctx.moveTo(-m(0.58), m(yy)); ctx.lineTo(m(0.58), m(yy)); ctx.stroke(); });
    if (label && u > 30) {
      ctx.fillStyle = '#fff7ed';
      ctx.font = '800 ' + Math.max(11, Math.min(16, m(0.16))) + 'px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, -m(0.55));
    }
    ctx.restore();
  }

  /* Top-right status: world, slow-motion, paused */
  function drawHud(lines) {
    ctx.save();
    ctx.font = '700 13px Inter, system-ui, sans-serif';
    var y = 14;
    lines.forEach(function (t) {
      if (!t) return;
      var w = ctx.measureText(t).width + 16;
      ctx.fillStyle = 'rgba(17,24,39,0.72)';
      roundRect(ctx, view.width - w - 12, y, w, 24, 12);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(t, view.width - w - 4, y + 12.5);
      y += 30;
    });
    ctx.restore();
  }
  function timeLines(t) {
    return [
      't = ' + fix(t, 2) + ' s',
      S.speed !== 1 ? speedLabel(S.speed) + ' slow motion' : '',
      S.paused ? '⏸ Paused' : ''
    ];
  }

  /* ── Caption + readouts ───────────────────────────────────── */
  var lastCaption = '';
  function caption(law, text) {
    var key = law + '|' + text;
    if (key === lastCaption) return;
    lastCaption = key;
    chipEl.textContent = law;
    chipEl.setAttribute('data-law', /3/.test(law) ? '3' : /2/.test(law) ? '2' : '1');
    captionEl.textContent = text;
  }

  var readoutSig = '';
  function readouts(list) {
    var sig = list.map(function (r) { return r[0]; }).join('|');
    if (sig !== readoutSig) {
      readoutSig = sig;
      readoutBox.innerHTML = '';
      list.forEach(function (r) {
        var cell = document.createElement('div');
        cell.className = 'ng-readout';
        if (r[3]) cell.style.setProperty('--ro-color', r[3]);
        cell.innerHTML = '<span class="ng-ro-label"></span><span class="ng-ro-val"></span><span class="ng-ro-unit"></span>';
        cell.children[0].textContent = r[0];
        readoutBox.appendChild(cell);
      });
    }
    var cells = readoutBox.children;
    list.forEach(function (r, i) {
      var c = cells[i];
      if (c.children[1].textContent !== r[1]) c.children[1].textContent = r[1];
      if (c.children[2].textContent !== r[2]) c.children[2].textContent = r[2];
    });
  }

  /* ═════════════════════════ DROP MODE ═════════════════════════ */
  var drop;
  function dropLayout() {
    var racing = S.race !== 'none';
    var targets = racing ? [{ x: -0.4, key: S.obj }, { x: 0.45, key: S.race }] : [{ x: 0, key: S.obj }];
    return {
      racing: racing,
      newtonX: racing ? 1.55 : 0,
      targets: targets,
      startBottom: (racing ? 0 : HEAD_TOP) + S.height
    };
  }
  function resetDrop() {
    var L = dropLayout();
    drop = {
      L: L, phase: 'hang', t: 0, shake: 0, frozen: false, impact: null, recT: 0,
      bodies: L.targets.map(function (tg, i) {
        return {
          i: i, o: OBJECTS[tg.key], x: tg.x, y: L.startBottom, vx: 0, vy: 0, a: 0, drag: 0,
          ghosts: [], nextGhost: 0, landedAt: null, onGround: false, resting: false, hitHead: false,
          rot: 0, hist: [[0, 0]]
        };
      })
    };
    continueBtn.hidden = true;
  }
  function dropEnv() {
    var W = WORLDS[S.world];
    return { g: W.g, rho: S.air ? W.rho : 0, world: W };
  }
  function shakeTree() {
    if (S.mode !== 'drop') return;
    if (drop.phase !== 'hang') resetDrop();
    drop.phase = 'shake';
    drop.shake = 0;
    S.paused = false;
    syncPause();
  }
  function continueDrop() {
    if (!drop.impact) return;
    var b = drop.bodies[0];
    b.vy = drop.impact.v * b.o.bounce;
    b.vx = 0.9;
    drop.frozen = false;
    drop.phase = 'after';
    continueBtn.hidden = true;
  }
  function stepDropReal(realDt) {
    if (drop.phase !== 'shake') return;
    drop.shake += realDt;
    if (drop.shake >= (reduceMotion ? 0.05 : 0.5)) { drop.phase = 'fall'; drop.t = 0; }
  }
  function stepDrop(dt) {
    var d = drop;
    if (d.frozen || (d.phase !== 'fall' && d.phase !== 'after')) return;
    var env = dropEnv(), g = env.g, rho = env.rho;
    var n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n;
    for (var k = 0; k < n && !d.frozen; k++) {
      d.t += h;
      for (var bi = 0; bi < d.bodies.length; bi++) {
        var b = d.bodies[bi];
        if (b.resting) continue;
        var o = b.o;
        if (b.onGround) {
          // rolling to a stop on the grass
          var dec = 0.35 * g * h;
          b.vx = Math.abs(b.vx) <= dec ? 0 : b.vx - Math.sign(b.vx) * dec;
          b.x += b.vx * h;
          b.rot += b.vx * h / 0.04 * 0.25;
          if (b.vx === 0) b.resting = true;
          continue;
        }
        b.drag = 0.5 * rho * o.cda * b.vy * b.vy;                    // N, opposes motion
        var ay = -g - Math.sign(b.vy) * b.drag / o.m;
        b.a = ay;
        b.vy += ay * h;
        b.y += b.vy * h;
        b.x += b.vx * h;
        if (o.kind === 'apple' && b.vx) b.rot += b.vx * h * 6;
        if (d.phase === 'fall' && b.landedAt == null && !b.hitHead && d.t >= b.nextGhost) {
          b.ghosts.push({ x: b.x, y: b.y, t: d.t });
          b.nextGhost += 0.05;
        }
        var headHit = !d.L.racing && !b.hitHead && Math.abs(b.x - d.L.newtonX) < 0.2;
        var surf = headHit ? HEAD_TOP : 0;
        if (b.y <= surf && b.vy < 0) {
          b.y = surf;
          if (headHit) { headImpact(b, g); break; }
          if (b.landedAt == null) { b.landedAt = d.t; b.impactV = -b.vy; }
          if (-b.vy > 0.8 && o.bounce > 0) { b.vy = -b.vy * o.bounce; }
          else { b.vy = 0; b.onGround = true; if (!b.vx) b.resting = true; }
        }
      }
      // speed-time history (downward speed), stopped once each object lands
      if (d.t - d.recT >= 1 / 90) {
        d.recT = d.t;
        d.bodies.forEach(function (b) {
          if (b.landedAt == null && !b.hitHead) b.hist.push([d.t, -b.vy]);
        });
      }
    }
    var allDown = d.bodies.every(function (b) { return d.L.racing ? b.landedAt != null && (b.resting || b.onGround) : b.resting; });
    if (allDown && d.phase !== 'done') d.phase = 'done';
  }
  function headImpact(b, g) {
    var d = drop, v = -b.vy, stop = HEADGEAR[S.head].d;
    var F = b.o.m * v * v / (2 * stop) + b.o.m * g;   // average contact force while stopping
    b.hist.push([d.t, v]);
    b.hitHead = true;
    b.landedAt = d.t;
    b.vy = 0;
    d.impact = { v: v, F: F, stopTime: 2 * stop / Math.max(v, 1e-6), t: d.t };
    d.frozen = true;
    d.phase = 'impact';
    continueBtn.hidden = false;
  }

  function drawDrop() {
    var d = drop, L = d.L, env = dropEnv(), W = view.width, H = view.height;
    var groundY = H - GROUND_PX;
    var topReserve = Math.max(110, Math.min(150, H * 0.3));
    var s = (groundY - topReserve) / Math.max(L.startBottom, 2.2);   // always room for Newton
    var ox = W * (L.racing ? 0.46 : 0.56);
    function sx(x) { return ox + x * s; }
    function sy(y) { return groundY - y * s; }

    drawSky(env.world, W, H);
    if (env.world === WORLDS.earth) {
      ctx.fillStyle = 'rgba(134,178,79,0.35)';
      ctx.beginPath(); ctx.ellipse(W * 0.2, groundY + 10, W * 0.35, 60, 0, Math.PI, 0); ctx.fill();
    }
    drawGroundBand(env.world, W, H, groundY, 'grass');

    // ruler
    ctx.save();
    ctx.strokeStyle = 'rgba(17,24,39,0.55)';
    ctx.fillStyle = env.world === WORLDS.moon ? '#e5e7eb' : '#1f2937';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    var step = s > 40 ? 0.5 : 1;
    for (var m = 0; m <= L.startBottom + 0.01; m += step) {
      var yy = sy(m), whole = Math.abs(m - Math.round(m)) < 1e-6;
      ctx.beginPath(); ctx.moveTo(16, yy); ctx.lineTo(whole ? 30 : 24, yy); ctx.stroke();
      if (whole) ctx.fillText(m + ' m', 34, yy);
    }
    ctx.beginPath(); ctx.moveTo(16, sy(0)); ctx.lineTo(16, sy(L.startBottom)); ctx.stroke();
    ctx.restore();

    // tree
    var maxR = Math.max.apply(null, d.bodies.map(function (b) { return b.o.px; }));
    var branchPy = sy(L.startBottom) - maxR * 2 - 14;
    var shakeOff = d.phase === 'shake' ? Math.sin(d.shake * 40) * 4 : 0;
    var trunkX = sx(L.racing ? -1.25 : -1.15);
    var canR = Math.max(62, Math.min(118, H * 0.24));
    ctx.fillStyle = '#6b4630';
    ctx.fillRect(trunkX - 14, branchPy - 6, 28, groundY - branchPy + 8);
    ctx.save();
    ctx.translate(shakeOff, 0);
    var cx = trunkX + canR * 0.55, cy = branchPy - canR * 0.45;
    [[0, 0, 1], [-0.6, 0.25, 0.7], [0.65, 0.2, 0.75], [0.15, -0.45, 0.72], [1.05, 0.45, 0.5]].forEach(function (p, i) {
      ctx.fillStyle = i % 2 ? '#5c8f22' : '#4d7c0f';
      ctx.beginPath(); ctx.arc(cx + p[0] * canR, cy + p[1] * canR, p[2] * canR, 0, Math.PI * 2); ctx.fill();
    });
    [[-0.4, 0.05], [0.45, -0.15], [0.05, 0.4], [-0.75, 0.45]].forEach(function (p) {
      drawApple(cx + p[0] * canR, cy + p[1] * canR, 7, 0, 0.8);
    });
    // branch reaching over the drop points
    var tipX = Math.max.apply(null, d.bodies.map(function (b) { return sx(b.x); })) + 26;
    ctx.strokeStyle = '#6b4630';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(trunkX, branchPy + 12); ctx.quadraticCurveTo((trunkX + tipX) / 2, branchPy - 8, tipX, branchPy); ctx.stroke();
    ctx.restore();

    // drop-height marker
    var b0 = d.bodies[0];
    var markX = sx(b0.x) + (L.racing ? -40 : 150);
    var targetY = L.racing ? 0 : HEAD_TOP;
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(17,24,39,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(markX, sy(L.startBottom)); ctx.lineTo(markX, sy(targetY)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(markX - 6, sy(L.startBottom)); ctx.lineTo(markX + 6, sy(L.startBottom));
    ctx.moveTo(markX - 6, sy(targetY)); ctx.lineTo(markX + 6, sy(targetY));
    ctx.stroke();
    ctx.restore();
    pill('h = ' + fix(S.height, 1) + ' m', markX + (L.racing ? -8 : 8), (sy(L.startBottom) + sy(targetY)) / 2, '#374151', L.racing ? 'right' : 'left');

    // Newton
    var face = d.phase === 'impact' || (d.phase !== 'hang' && b0.hitHead) ? 'ouch' : L.racing ? 'ahead' : 'up';
    if (L.racing && d.phase === 'done') face = 'happy';
    drawNewton(sx(L.newtonX), groundY, s, {
      face: face, dir: L.racing ? -1 : 1,
      helmet: env.world !== WORLDS.earth, foam: !L.racing && S.head === 'helmet'
    });

    // strobe ghosts
    if (S.showStrobe) {
      d.bodies.forEach(function (b) {
        b.ghosts.forEach(function (gh) {
          drawObject(b.o, sx(gh.x), sy(gh.y) - bottomOffset(b.o), 0, 0.22);
        });
      });
    }

    // stems + objects
    d.bodies.forEach(function (b) {
      var o = b.o;
      var px = sx(b.x) + (d.phase === 'shake' ? shakeOff : 0);
      var sway = 0, rot = b.rot;
      if (o.kind === 'feather' && env.rho > 0 && !b.onGround && d.phase !== 'hang') {
        sway = Math.sin(d.t * 5 + b.i) * 10;
        rot = Math.sin(d.t * 5 + b.i) * 0.5;
      }
      var py = sy(b.y) - bottomOffset(o);
      if (d.phase === 'hang' || d.phase === 'shake') {
        ctx.strokeStyle = '#4d6b25';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py - o.px); ctx.lineTo(px, branchPy); ctx.stroke();
      }
      drawObject(o, px + sway, py, rot, 1);
      if (L.racing && u_labels()) pill(String.fromCharCode(65 + b.i) + ': ' + o.name, px, sy(L.startBottom) - maxR * 2 - 34, b.i ? COLORS.b : COLORS.a, 'center');
      if (L.racing && b.landedAt != null) pill(fix(b.landedAt, 2) + ' s', px, groundY + 22, b.i ? COLORS.b : COLORS.a, 'center');
    });

    // free-body arrows
    if (S.showForces && d.phase !== 'impact') {
      d.bodies.forEach(function (b) {
        if (b.resting || b.onGround) return;
        var o = b.o, Wt = o.m * env.g, len = logLen(Wt);
        var px = sx(b.x), cy = sy(b.y) - bottomOffset(o);
        var lab = !L.racing || b.i === 0;
        var side = L.racing && b.i === 0 ? 'right' : 'left';
        var off = side === 'right' ? -8 : 8;
        arrow(px, cy, px, cy + o.px + len, COLORS.weight, lab || L.racing ? 'W = ' + nice(Wt) + ' N' : '', side, off, -4);
        if (d.phase === 'hang' || d.phase === 'shake') {
          arrow(px, cy, px, cy - o.px - len, COLORS.support, 'stem T = ' + nice(Wt) + ' N', side, off, 4);
        } else if (b.drag > Wt * 0.01) {
          var dl = len * Math.min(1, b.drag / Wt);
          arrow(px + (side === 'right' ? -6 : 6), cy, px + (side === 'right' ? -6 : 6), cy - o.px - dl, COLORS.drag, 'air ' + nice(b.drag) + ' N', side, off, 0);
        }
      });
    }

    // impact: the action–reaction pair
    if (d.impact && (d.phase === 'impact' || d.phase === 'after' || d.phase === 'done')) {
      var hx = sx(L.newtonX), hy = sy(HEAD_TOP);
      if (d.phase === 'impact') {
        var al = Math.max(38, Math.min(60, s * 0.9));
        arrow(hx - 8, hy, hx - 8, hy + al, COLORS.weight, 'Apple on Newton: ' + nice(d.impact.F) + ' N ↓', 'right', -14, -al / 2);
        arrow(hx + 8, hy, hx + 8, hy - al, COLORS.support, 'Newton on apple: ' + nice(d.impact.F) + ' N ↑', 'left', 14, al / 2);
        ctx.save();
        ctx.font = '900 30px Georgia, "Times New Roman", serif';
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.textAlign = 'center';
        ctx.translate(hx - 70, hy - 60);
        ctx.rotate(-0.15);
        ctx.strokeText('BONK!', 0, 0);
        ctx.fillText('BONK!', 0, 0);
        ctx.restore();
      } else if (d.phase !== 'hang') {
        // stars circling the dazed scientist
        for (var st = 0; st < 3; st++) {
          var ang = performance.now() / 400 + st * 2.1;
          ctx.fillStyle = '#facc15';
          ctx.font = '16px system-ui';
          ctx.fillText('★', hx + Math.cos(ang) * 0.22 * s - 6, hy - 0.06 * s + Math.sin(ang) * 0.06 * s);
        }
      }
    }

    drawHud(['On ' + env.world.name + ' · g = ' + env.g + ' m/s²'].concat(d.phase === 'hang' ? [] : timeLines(d.t)));
  }
  function u_labels() { return view.width > 420; }

  function dropCaption() {
    var d = drop, env = dropEnv(), b = d.bodies[0], o = b.o, Wt = o.m * env.g;
    if (d.L.racing) {
      var b1 = d.bodies[1];
      if (d.phase === 'hang') return caption('Law 1', 'Both hang at rest: each stem pulls up exactly as hard as gravity pulls down. Shake the tree to drop them together.');
      if (d.phase === 'shake') return caption('Law 1', 'Shaking the branch…');
      if (d.phase === 'fall') {
        return caption('Law 2', 'Gravity pulls the ' + o.name.toLowerCase() + ' with ' + nice(Wt) + ' N and the ' + b1.o.name.toLowerCase() + ' with ' + nice(b1.o.m * env.g) +
          ' N. Divide each by its mass: a = F ÷ m = ' + env.g + ' m/s² for both' + (env.rho ? ', until air resistance starts to matter.' : '.'));
      }
      var ta = b.landedAt, tb = b1.landedAt;
      if (Math.abs(ta - tb) < 0.005) return caption('Law 2', 'A tie: both landed at ' + fix(ta, 2) + ' s. Bigger pull, but more mass to move; the acceleration comes out the same.');
      var slow = ta > tb ? b : b1, fast = ta > tb ? b1 : b;
      return caption('Law 2', 'The ' + fast.o.name.toLowerCase() + ' won (' + fix(fast.landedAt, 2) + ' s vs ' + fix(slow.landedAt, 2) +
        ' s). Air pushes up on the ' + slow.o.name.toLowerCase() + ' almost as hard as gravity pulls it down, so its net force, and its acceleration, stays small.');
    }
    switch (d.phase) {
      case 'hang':
        return caption('Law 1', 'At rest: the stem pulls up with ' + nice(Wt) + ' N and gravity pulls down with ' + nice(Wt) + ' N. Balanced forces, net force 0, so the apple stays put.');
      case 'shake':
        return caption('Law 1', 'Shaking the branch… the stem is about to snap.');
      case 'fall':
        return caption('Law 2', 'The stem snapped, so gravity is unbalanced: a = F ÷ m = ' + nice(Wt) + ' ÷ ' + o.m + ' = ' + env.g +
          ' m/s². The strobe gaps grow because it speeds up the whole way down.');
      case 'impact':
        var im = d.impact;
        return caption('Law 3', 'BONK! The apple pushes down on Newton\'s head with ' + nice(im.F) + ' N and his head pushes up on the apple with ' + nice(im.F) +
          ' N. Equal size, opposite directions, on two different objects. (The ' + HEADGEAR[S.head].name + ' stops it in ' + fix(im.stopTime * 1000, 1) + ' ms.)');
      default:
        return caption('Law 1', b.resting ? 'The apple rolled to a stop: friction from the grass was the outside force that stopped it.' : 'The apple bounces off and rolls. Friction from the grass will slow it down.');
    }
  }
  function dropReadouts() {
    var d = drop, env = dropEnv();
    if (d.L.racing) {
      return readouts(d.bodies.map(function (b) {
        var tag = String.fromCharCode(65 + b.i) + ': ' + b.o.name;
        return [tag + ' weight', nice(b.o.m * env.g), 'N · m = ' + b.o.m + ' kg', b.i ? COLORS.b : COLORS.a];
      }).concat(d.bodies.map(function (b) {
        var tag = String.fromCharCode(65 + b.i);
        var a = d.phase === 'hang' || d.phase === 'shake' || b.landedAt != null ? 0 : -b.a;
        return [tag + ' acceleration', fix(a, 2), 'm/s² ↓', b.i ? COLORS.b : COLORS.a];
      })).concat(d.bodies.map(function (b) {
        var tag = String.fromCharCode(65 + b.i);
        return [tag + ' landed at', b.landedAt == null ? '—' : fix(b.landedAt, 2), 's', b.i ? COLORS.b : COLORS.a];
      })));
    }
    var b = d.bodies[0], o = b.o, Wt = o.m * env.g;
    var falling = d.phase === 'fall';
    var net = d.phase === 'hang' || d.phase === 'shake' ? 0 : falling ? Wt - b.drag : null;
    var list = [
      ['Mass', String(o.m), 'kg'],
      ['Weight  W = mg', nice(Wt), 'N'],
      ['Net force', net == null ? '—' : nice(net), 'N ↓'],
      ['Acceleration', net == null ? '—' : fix(net / o.m, 2), 'm/s² ↓'],
      ['Speed', d.impact ? fix(d.impact.v, 2) : fix(Math.max(0, -b.vy), 2), d.impact ? 'm/s at impact' : 'm/s'],
      ['Impact force', d.impact ? nice(d.impact.F) : '—', 'N (avg)'],
      ['Earth pulled up by apple', sci(Wt / EARTH_MASS), 'm/s²']
    ];
    if (env.rho > 0) list.splice(3, 0, ['Air resistance', nice(b.drag), 'N ↑']);
    readouts(list);
  }
  function dropGraph() {
    return {
      ylabel: 'speed ↓ (m/s)',
      series: drop.bodies.map(function (b) {
        return { label: drop.L.racing ? String.fromCharCode(65 + b.i) + ': ' + b.o.name : b.o.name, color: b.i ? COLORS.b : COLORS.a, pts: b.hist };
      })
    };
  }

  /* ═════════════════════════ PUSH MODE ═════════════════════════ */
  var push;
  function newLane(force, load) {
    return { force: force, load: load, x: 0, v: 0, nx: -CART_HALF - REACH, contact: true, walk: 0, fapp: 0, fric: 0, a: 0, status: 'rest', hist: [[0, 0]] };
  }
  function resetPush() {
    push = { t: 0, pushing: false, autoUntil: null, released: false, recT: 0, cam: 0.6, scale: null,
      lanes: [newLane(S.force, S.load)].concat(S.compare ? [newLane(S.forceB, S.loadB)] : []) };
    if (S.mode === 'push') updatePushButtons();
  }
  function setPushing(on, seconds) {
    push.pushing = on;
    push.autoUntil = on && seconds ? push.t + seconds : null;
    if (on) push.released = false; else push.released = true;
    S.paused = false;
    syncPause();
    updatePushButtons();
  }
  function updatePushButtons() {
    $$('[data-act="push-toggle"]').forEach(function (b) {
      b.textContent = push.pushing ? '✋ Let go' : '👉 Start pushing';
      b.setAttribute('aria-pressed', push.pushing ? 'true' : 'false');
    });
  }
  function stepPush(dt) {
    var p = push, g = 9.8, mu = SURFACES[S.surface].mu, mus = mu * STATIC_FACTOR;
    p.lanes[0].force = S.force;
    if (p.lanes[1]) p.lanes[1].force = S.forceB;
    var left = dt;
    while (left > 1e-12) {
      // land exactly on the auto-release instant so 2 s × a gives a clean speed
      var h = Math.min(0.004, left);
      if (p.autoUntil != null && p.t + h > p.autoUntil) h = Math.max(1e-9, p.autoUntil - p.t);
      left -= h;
      p.t += h;
      p.lanes.forEach(function (L) {
        var m = L.load, contactX = L.x - CART_HALF - REACH;
        // Newton runs to the cart if he's behind; he can't run faster than RUN_MAX
        if (p.pushing) {
          var gap = contactX - L.nx;
          if (L.v <= RUN_MAX && (L.contact || gap <= RUN_MAX * h + 1e-9)) { L.nx = contactX; L.walk += Math.max(0, gap) * 6; L.contact = true; }
          else { L.nx += RUN_MAX * h; L.walk += RUN_MAX * h * 6; L.contact = false; }
        } else L.contact = false;
        var F = L.contact ? L.force : 0, N = m * g, fric, a;
        if (Math.abs(L.v) < 1e-6) {
          if (F <= mus * N) { fric = -F; a = 0; L.v = 0; L.status = F > 0 ? 'stuck' : (L.status === 'coast' ? 'stopped' : L.status === 'stopped' ? 'stopped' : 'rest'); }
          else { fric = -mu * N; a = (F + fric) / m; L.status = 'pushed'; }
        } else {
          fric = -Math.sign(L.v) * mu * N;
          a = (F + fric) / m;
          L.status = F > 0 ? 'pushed' : (L.contact ? 'pushed' : (p.pushing ? 'chasing' : 'coast'));
        }
        var v1 = L.v + a * h;
        if (F === 0 && L.v !== 0 && Math.sign(v1) !== Math.sign(L.v)) { v1 = 0; a = 0; L.status = 'stopped'; }
        L.v = v1;
        L.x += L.v * h;
        L.fapp = F; L.fric = fric; L.a = a;
        if (F > 0 && a !== 0) L.aPush = a;
      });
      if (p.autoUntil != null && p.t >= p.autoUntil - 1e-9) { p.pushing = false; p.autoUntil = null; p.released = true; updatePushButtons(); }
      if (p.t - p.recT >= 1 / 30) {
        p.recT = p.t;
        p.lanes.forEach(function (L) { L.hist.push([p.t, L.v, L.fapp > 0]); if (L.hist.length > 1800) L.hist.shift(); });
      }
    }
  }
  function fitCamera(cam, minX, maxX, base, w, dt) {
    var span = Math.max(0.1, maxX - minX);
    var want = Math.max(10, Math.min(base, (w - 120) / span));
    var center = (minX + maxX) / 2;
    var k = 1 - Math.exp(-(dt || 0.016) * 5);
    cam.scale = cam.scale == null ? want : cam.scale + (want - cam.scale) * k;
    cam.center = cam.center == null ? center : cam.center + (center - cam.center) * k;
  }
  function drawDistanceTicks(sx, groundY, s, W, color) {
    var step = s > 60 ? 1 : s > 25 ? 2 : 5;
    var first = Math.floor((0 - sx(0)) / s / step) * step - step;
    ctx.save();
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    for (var m = first; sx(m) < W + 40; m += step) {
      var x = sx(m);
      if (x < -40) continue;
      ctx.beginPath(); ctx.moveTo(x, groundY + 4); ctx.lineTo(x, groundY + 12); ctx.stroke();
      ctx.fillText(m + ' m', x, groundY + 25);
    }
    ctx.restore();
  }
  function drawPush(realDt) {
    var p = push, W = view.width, H = view.height, lanes = p.lanes;
    var laneGap = lanes.length > 1 ? Math.min(110, H * 0.3) : 0;
    var groundY = H - GROUND_PX;
    var base = Math.min((groundY - 70 - laneGap) / 2.3, W / 5.5);
    var minX = Infinity, maxX = -Infinity;
    lanes.forEach(function (L) { minX = Math.min(minX, L.nx - 0.4); maxX = Math.max(maxX, L.x + CART_HALF + 0.4); });
    fitCamera(p, minX, maxX, base, W, realDt);
    var s = p.scale;
    function sx(x) { return W / 2 + (x - p.center) * s; }

    drawSky(WORLDS.earth, W, H);
    // parallax fence
    ctx.strokeStyle = 'rgba(120,85,50,0.45)';
    ctx.lineWidth = 3;
    var fenceY = groundY - laneGap - Math.min(60, 0.9 * s);
    for (var f = Math.floor(p.center / 2 - 20) * 2; f < p.center + 60; f += 2) {
      var fx = W / 2 + (f - p.center * 0.6) * s * 0.6;
      if (fx < -10 || fx > W + 10) continue;
      ctx.beginPath(); ctx.moveTo(fx, fenceY); ctx.lineTo(fx, groundY - laneGap); ctx.stroke();
    }
    var surf = S.surface;
    var surfColor = { none: '#cfe8f7', ice: '#d8f0fb', grass: '#86b24f', mud: '#7a5532' }[surf];
    ctx.fillStyle = surfColor;
    ctx.fillRect(0, groundY - laneGap, W, H - groundY + laneGap);
    if (surf === 'mud') {
      ctx.fillStyle = 'rgba(60,35,15,0.45)';
      for (var i = 0; i < 40; i++) {
        var mx = ((i * 97 - p.center * s) % (W + 60) + W + 60) % (W + 60) - 30;
        ctx.beginPath(); ctx.ellipse(mx, groundY - laneGap + 8 + (i * 37) % (H - groundY + laneGap - 10), 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (surf === 'none' || surf === 'ice') {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      for (var j = 0; j < 12; j++) {
        var ix = ((j * 131 - p.center * s) % (W + 80) + W + 80) % (W + 80) - 40;
        ctx.beginPath(); ctx.moveTo(ix, groundY + 14); ctx.lineTo(ix + 30, groundY + 8); ctx.stroke();
      }
    }
    if (laneGap) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(0, groundY - laneGap / 2 + 6); ctx.lineTo(W, groundY - laneGap / 2 + 6); ctx.stroke();
      ctx.setLineDash([]);
    }
    drawDistanceTicks(sx, groundY, s, W, surf === 'mud' ? '#fef3c7' : '#1f2937');

    // back lane first so the front lane overlaps it
    for (var li = lanes.length - 1; li >= 0; li--) {
      var L = lanes[li], gy = groundY - (li ? laneGap : 0);
      var cxp = sx(L.x);
      var tag = lanes.length > 1 ? (li ? 'B' : 'A') : '';
      drawCart(cxp, gy, s, L.load, L.x / 0.16, false, (tag ? tag + ' · ' : '') + L.load + ' kg');
      drawNewton(sx(L.nx), gy, s, {
        pose: L.contact ? 'push' : 'stand', face: L.status === 'stuck' ? 'ouch' : 'ahead',
        walk: (p.pushing && !L.contact) || (L.contact && L.v > 0.05) ? L.walk : 0
      });
      if (!S.showForces) continue;
      var cy = gy - 0.55 * s, k = Math.min(0.55, 150 / 300);
      if (L.fapp > 0) arrow(cxp, cy, cxp + L.fapp * k, cy, COLORS.applied, 'push ' + nice(L.fapp) + ' N', 'left', 6, -16);
      if (Math.abs(L.fric) > 0.05) arrow(cxp, gy - 0.12 * s, cxp + L.fric * k, gy - 0.12 * s, COLORS.drag, 'friction ' + nice(Math.abs(L.fric)) + ' N', 'right', -6, 16);
      var net = L.fapp + L.fric;
      var ny = gy - 1.25 * s - 18;
      if (Math.abs(net) > 0.05) arrow(cxp, ny, cxp + net * k, ny, COLORS.net, 'net ' + nice(net) + ' N', net > 0 ? 'left' : 'right', net > 0 ? 6 : -6, -16);
      else pill('net force 0 N', cxp, ny, COLORS.net, 'center');
      if (L.v > 0.02) arrow(cxp, ny - 30, cxp + Math.min(200, L.v * 18), ny - 30, COLORS.vel, 'v = ' + fix(L.v, 2) + ' m/s', 'left', 6, -14);
    }
    drawHud(['Earth · ' + SURFACES[surf].name + (SURFACES[surf].mu ? ' (μ = ' + SURFACES[surf].mu + ')' : '')].concat(timeLines(p.t)));
  }
  function pushCaption() {
    var L = push.lanes[0], mu = SURFACES[S.surface].mu;
    if (push.lanes.length > 1) {
      var B = push.lanes[1];
      if (push.t === 0) return caption('Law 2', 'Two lanes, one rule. Lane A: ' + S.force + ' N on ' + S.load + ' kg. Lane B: ' + S.forceB + ' N on ' + S.loadB + ' kg. Push both and compare the accelerations.');
      if (!L.fapp && !B.fapp && L.aPush != null && B.aPush != null) {
        return caption('Law 2', 'While pushed, lane A got a = ' + fix(L.aPush, 2) + ' m/s² and lane B got a = ' + fix(B.aPush, 2) + ' m/s² (' + fix(B.aPush / L.aPush, 2) +
          '× as much). Compare the slopes of the two lines on the graph.');
      }
      return caption('Law 2', 'Lane A: a = ' + nice(L.fapp + L.fric) + ' ÷ ' + L.load + ' = ' + fix(L.a, 2) + ' m/s².  Lane B: a = ' + nice(B.fapp + B.fric) + ' ÷ ' + B.load + ' = ' + fix(B.a, 2) + ' m/s².');
    }
    var net = L.fapp + L.fric;
    switch (L.status) {
      case 'rest': return caption('Law 1', 'The cart is at rest with no unbalanced force on it. Choose a push and a surface, then push.');
      case 'stuck': return caption('Law 1', 'Newton pushes with ' + nice(L.fapp) + ' N but static friction pushes back with ' + nice(L.fapp) + ' N. Net force 0, so no acceleration. He needs more than ' + nice(mu * STATIC_FACTOR * L.load * 9.8) + ' N to break it loose.');
      case 'pushed': return caption('Law 2', 'a = net force ÷ mass = (' + nice(L.fapp) + ' − ' + nice(Math.abs(L.fric)) + ') ÷ ' + L.load + ' = ' + fix(net / L.load, 2) + ' m/s². Each second the cart gains another ' + fix(net / L.load, 2) + ' m/s.');
      case 'chasing': return caption('Law 1', L.v > RUN_MAX ? 'The cart is faster than Newton can run (' + RUN_MAX + ' m/s). No contact means no push.' : 'Newton runs to catch the cart. Until he touches it he can\'t push it.');
      case 'coast': return mu === 0
        ? caption('Law 1', 'Newton let go and there is no friction: zero net force, so the cart keeps the same speed (' + fix(L.v, 2) + ' m/s) forever. That\'s inertia.')
        : caption('Law 1', 'Newton let go. The only horizontal force left is friction (' + nice(Math.abs(L.fric)) + ' N backward), so the cart slows at ' + fix(Math.abs(L.a), 2) + ' m/s².');
      case 'stopped': return caption('Law 1', 'Friction brought the cart to rest after ' + fix(L.x, 1) + ' m. On frictionless ice it would never have stopped.');
    }
  }
  function pushReadouts() {
    var lanes = push.lanes;
    if (lanes.length > 1) {
      var list = [];
      lanes.forEach(function (L, i) {
        var tag = i ? 'B' : 'A', col = i ? COLORS.b : COLORS.a;
        list.push([tag + ' net force', nice(L.fapp + L.fric), 'N on ' + L.load + ' kg', col]);
        list.push([tag + ' acceleration', fix(L.a, 2), 'm/s²', col]);
        list.push([tag + ' speed', fix(L.v, 2), 'm/s', col]);
      });
      return readouts(list);
    }
    var L = lanes[0];
    readouts([
      ['Push (applied)', nice(L.fapp), 'N →', COLORS.applied],
      ['Friction', nice(Math.abs(L.fric)), 'N ←', COLORS.drag],
      ['Net force', nice(L.fapp + L.fric), 'N', COLORS.net],
      ['Mass', String(L.load), 'kg'],
      ['Acceleration', fix(L.a, 2), 'm/s²'],
      ['Speed', fix(L.v, 2), 'm/s', COLORS.vel],
      ['Distance', fix(L.x, 1), 'm']
    ]);
  }
  function pushGraph() {
    return {
      ylabel: 'speed (m/s)', shadeKey: true,
      series: push.lanes.map(function (L, i) {
        return { label: push.lanes.length > 1 ? (i ? 'Lane B' : 'Lane A') : 'Cart', color: i ? COLORS.b : COLORS.a, pts: L.hist };
      })
    };
  }

  /* ═════════════════════════ SKATE MODE ═════════════════════════ */
  var skate;
  function resetSkate() {
    skate = { phase: 'ready', t: 0, xN: -REACH - CART_HALF, vN: 0, xC: 0, vC: 0, recT: 0, scale: null, center: null,
      histN: [[0, 0]], histC: [[0, 0]] };
  }
  function shoveOff() {
    if (S.mode !== 'skate') return;
    if (skate.phase !== 'ready') resetSkate();
    skate.phase = 'push';
    S.paused = false;
    syncPause();
  }
  function stepSkate(dt) {
    var k = skate;
    if (k.phase === 'ready' || k.phase === 'done') return;
    var left = dt;
    while (left > 1e-12) {
      var pushing = k.phase === 'push';
      var h = Math.min(0.002, left);
      if (pushing && k.t + h > SHOVE_TIME) h = Math.max(1e-9, SHOVE_TIME - k.t);
      left -= h;
      var F = pushing ? S.shove : 0;
      k.vC += F / S.mCart * h;
      k.vN -= F / S.mNewton * h;
      k.xC += k.vC * h;
      k.xN += k.vN * h;
      k.t += h;
      if (pushing && k.t >= SHOVE_TIME - 1e-9) k.phase = 'glide';
      if (k.t >= 8) { k.phase = 'done'; break; }
    }
    if (k.t - k.recT >= 1 / 60 || k.phase === 'done') {
      k.recT = k.t;
      k.histN.push([k.t, k.vN]);
      k.histC.push([k.t, k.vC]);
    }
  }
  function drawSkate(realDt) {
    var k = skate, W = view.width, H = view.height, groundY = H - GROUND_PX - 10;
    var base = Math.min((groundY - 90) / 2.1, W / 6);
    fitCamera(k, Math.min(k.xN - 0.6, -3), Math.max(k.xC + CART_HALF + 0.3, 3), base, W, realDt);
    var s = k.scale;
    function sx(x) { return W / 2 + (x - k.center) * s; }
    // rink
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#dbeafe'); g.addColorStop(1, '#f8fafc');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, groundY - 30, W, H);
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(0, groundY - 34, W, 4);
    ctx.strokeStyle = 'rgba(220,38,38,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx(0), groundY - 30); ctx.lineTo(sx(0), H); ctx.stroke();
    drawDistanceTicks(sx, groundY, s, W, '#1e3a8a');

    var cxp = sx(k.xC), nxp = sx(k.xN);
    drawCart(cxp, groundY, s, Math.min(S.mCart, 140), 0, true, S.mCart + ' kg');
    drawNewton(nxp, groundY, s, { pose: k.phase === 'ready' || k.phase === 'push' ? 'push' : 'stand', face: k.phase === 'ready' ? 'ahead' : 'happy', skates: true });
    if (s > 20) pill('Newton ' + S.mNewton + ' kg', nxp, groundY - 1.95 * s - 10, '#334155', 'center');

    // off-screen indicators
    if (cxp > W - 10) pill('cart → ' + fix(k.xC, 1) + ' m', W - 8, groundY - 60, COLORS.b, 'right');
    if (nxp < 10) pill('← Newton ' + fix(k.xN, 1) + ' m', 8, groundY - 60, COLORS.a, 'left');

    if (S.showForces) {
      var y = groundY - 0.62 * s, len = Math.min(140, S.shove * 0.35);
      if (k.phase === 'push' || k.phase === 'ready') {
        var faint = k.phase === 'ready';
        ctx.save();
        if (faint) ctx.globalAlpha = 0.35;
        arrow(cxp - CART_HALF * s, y, cxp - CART_HALF * s + len, y, COLORS.b, 'Newton on cart: ' + S.shove + ' N', 'left', 6, -18);
        arrow(nxp, y - 0.25 * s, nxp - len, y - 0.25 * s, COLORS.a, 'Cart on Newton: ' + S.shove + ' N', 'right', -6, -18);
        ctx.restore();
      } else {
        if (Math.abs(k.vC) > 0.01) arrow(cxp, y - 0.7 * s, cxp + Math.min(220, k.vC * 16), y - 0.7 * s, COLORS.vel, 'v = ' + fix(k.vC, 2) + ' m/s', 'left', 6, -14);
        if (Math.abs(k.vN) > 0.01) arrow(nxp, y - 1.25 * s, nxp + Math.max(-220, k.vN * 16), y - 1.25 * s, COLORS.vel, 'v = ' + fix(Math.abs(k.vN), 2) + ' m/s', 'right', -6, -14);
      }
    }
    drawHud(['Frictionless ice'].concat(k.phase === 'ready' ? [] : timeLines(k.t)));
  }
  function skateCaption() {
    var k = skate, aC = S.shove / S.mCart, aN = S.shove / S.mNewton;
    if (k.phase === 'ready') return caption('Law 3', 'Newton (' + S.mNewton + ' kg, on skates) and a ' + S.mCart + ' kg cart sit still on frictionless ice. Press Push off!');
    if (k.phase === 'push') return caption('Law 3', 'Newton pushes the cart with ' + S.shove + ' N →, and the cart pushes Newton with ' + S.shove + ' N ←. Always equal and opposite, on two different objects.');
    return caption('Laws 2 + 3', 'Same force, different masses: cart a = ' + S.shove + ' ÷ ' + S.mCart + ' = ' + nice(aC) + ' m/s², Newton a = ' + S.shove + ' ÷ ' + S.mNewton + ' = ' + nice(aN) +
      ' m/s². Now nothing pushes either one, so both glide at a steady speed (Law 1).');
  }
  function skateReadouts() {
    var k = skate, on = k.phase === 'push';
    var pN = S.mNewton * k.vN, pC = S.mCart * k.vC;
    readouts([
      ['Force on cart', on ? String(S.shove) : '0', k.phase === 'ready' || on ? 'N →' : 'N now (' + S.shove + ' N during shove)', COLORS.b],
      ['Force on Newton', on ? String(S.shove) : '0', k.phase === 'ready' || on ? 'N ←' : 'N now (' + S.shove + ' N during shove)', COLORS.a],
      ['Cart acceleration', on ? nice(S.shove / S.mCart) : '0', 'm/s²', COLORS.b],
      ['Newton acceleration', on ? nice(S.shove / S.mNewton) : '0', 'm/s²', COLORS.a],
      ['Cart speed', fix(k.vC, 2), 'm/s →', COLORS.b],
      ['Newton speed', fix(Math.abs(k.vN), 2), 'm/s ←', COLORS.a],
      ['Momentum  p = mv', nice(pC) + ' / ' + nice(pN), 'kg·m/s (cart / Newton)'],
      ['Total momentum', nice(pC + pN), 'kg·m/s']
    ]);
  }
  function skateGraph() {
    return {
      ylabel: 'velocity (m/s, + = right)',
      series: [
        { label: 'Cart', color: COLORS.b, pts: skate.histC },
        { label: 'Newton', color: COLORS.a, pts: skate.histN }
      ]
    };
  }

  /* ═════════════════════════ GRAPH ═════════════════════════ */
  function niceStep(range, ticks) {
    var raw = range / ticks, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  function drawGraph() {
    var spec = S.mode === 'drop' ? dropGraph() : S.mode === 'push' ? pushGraph() : skateGraph();
    var c = gctx, w = gview.width, h = gview.height, col = SimKit.theme.colors();
    c.clearRect(0, 0, w, h);
    var padL = 44, padR = 12, padT = 26, padB = 30;
    var tMax = 1, vMin = 0, vMax = 1;
    spec.series.forEach(function (s) {
      s.pts.forEach(function (p) { tMax = Math.max(tMax, p[0]); vMin = Math.min(vMin, p[1]); vMax = Math.max(vMax, p[1]); });
    });
    var tStep = niceStep(tMax, 5);
    tMax = Math.ceil(tMax / tStep) * tStep;
    var vStep = niceStep(vMax - vMin, 4);
    vMax = Math.ceil(vMax / vStep) * vStep;
    vMin = Math.floor(vMin / vStep) * vStep;
    function X(t) { return padL + t / tMax * (w - padL - padR); }
    function Y(v) { return padT + (vMax - v) / (vMax - vMin || 1) * (h - padT - padB); }
    c.font = '600 11px Inter, system-ui, sans-serif';
    c.lineWidth = 1;
    c.strokeStyle = col.textMuted;
    c.fillStyle = col.textMuted;
    c.globalAlpha = 0.25;
    for (var v = vMin; v <= vMax + 1e-9; v += vStep) { c.beginPath(); c.moveTo(padL, Y(v)); c.lineTo(w - padR, Y(v)); c.stroke(); }
    c.globalAlpha = 1;
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    for (v = vMin; v <= vMax + 1e-9; v += vStep) c.fillText(+v.toFixed(6) + '', padL - 6, Y(v));
    c.textAlign = 'center';
    c.textBaseline = 'top';
    for (var t = 0; t <= tMax + 1e-9; t += tStep) c.fillText(+t.toFixed(6) + '', X(t), h - padB + 6);
    c.fillText('time (s)', (padL + w - padR) / 2, h - 13);
    c.strokeStyle = col.text;
    c.beginPath(); c.moveTo(padL, padT); c.lineTo(padL, h - padB); c.lineTo(w - padR, h - padB); c.stroke();
    if (vMin < 0) { c.beginPath(); c.moveTo(padL, Y(0)); c.lineTo(w - padR, Y(0)); c.stroke(); }
    c.textAlign = 'left';
    c.fillStyle = col.text;
    c.fillText(spec.ylabel, 6, 6);
    // pushing shading (lane A)
    if (spec.shadeKey && spec.series[0]) {
      c.fillStyle = 'rgba(22,163,74,0.12)';
      var pts = spec.series[0].pts;
      for (var i = 1; i < pts.length; i++) if (pts[i][2]) c.fillRect(X(pts[i - 1][0]), padT, X(pts[i][0]) - X(pts[i - 1][0]) + 0.5, h - padT - padB);
    }
    var lx = w - padR;
    spec.series.slice().reverse().forEach(function (s) {
      c.strokeStyle = s.color;
      c.lineWidth = 2.5;
      c.beginPath();
      s.pts.forEach(function (p, i) { if (i) c.lineTo(X(p[0]), Y(p[1])); else c.moveTo(X(p[0]), Y(p[1])); });
      c.stroke();
      c.font = '700 11px Inter, system-ui, sans-serif';
      var tw = c.measureText(s.label).width;
      lx -= tw + 22;
      c.fillStyle = s.color;
      c.fillRect(lx, 9, 12, 3);
      c.fillStyle = col.text;
      c.fillText(s.label, lx + 16, 4);
    });
  }

  /* ═════════════════════ PREDICT, THEN TEST ═════════════════════ */
  function cfg(obj) { Object.keys(obj).forEach(function (k) { setSetting(k, obj[k]); }); syncDropUi(); syncPushUi(); }
  var QUESTIONS = {
    drop: [
      {
        q: 'A giant 10 kg apple and a normal 0.15 kg apple drop from the same branch with no air. Which lands first?',
        choices: ['The giant apple', 'They land together', 'The small apple'], answer: 1,
        setup: function () { cfg({ obj: 'giant', race: 'apple', world: 'earth', air: false, height: 3 }); resetDrop(); shakeTree(); },
        done: function () { return drop.phase === 'done'; },
        explain: 'Gravity pulls the giant apple about 65× harder (98 N vs 1.5 N), but it also has 65× more mass to get moving. a = F ÷ m = 9.8 m/s² for both, so they tie.'
      },
      {
        q: 'Apollo 15, 1971: on the Moon, astronaut David Scott dropped a hammer and a falcon feather at the same moment. Which hit the ground first?',
        choices: ['The hammer', 'They landed together', 'The feather'], answer: 1,
        setup: function () { cfg({ obj: 'hammer', race: 'feather', world: 'moon', height: 1.5 }); resetDrop(); shakeTree(); },
        done: function () { return drop.phase === 'done'; },
        explain: 'The Moon has no air, so gravity is the only force. Both accelerate at 1.62 m/s² and land together, just as Galileo and Newton predicted.'
      },
      {
        q: 'Same hammer and feather, but on Earth with air. Which lands first?',
        choices: ['The hammer', 'They land together', 'The feather'], answer: 0,
        setup: function () { cfg({ obj: 'hammer', race: 'feather', world: 'earth', air: true, height: 1.5 }); resetDrop(); shakeTree(); },
        done: function () { return drop.phase === 'done'; },
        explain: 'Air pushes up on the feather almost as hard as gravity pulls it down, so its net force, and acceleration, is tiny. The hammer\'s air drag is small next to its weight.'
      },
      {
        q: 'Newton swaps his bare head (the apple squashes 1 cm) for a foam helmet that squashes 8 cm. The force on his head will be…',
        choices: ['Bigger', 'About the same', 'Much smaller'], answer: 2,
        setup: function () { cfg({ obj: 'apple', race: 'none', world: 'earth', air: true, height: 2.5, head: 'helmet' }); resetDrop(); shakeTree(); },
        done: function () { return !!drop.impact; },
        explain: 'The apple has to lose the same speed either way. Stretching the stop over 8 cm instead of 1 cm takes about 8× longer, so the force is about 8× smaller. Helmets, airbags and crumple zones all work this way.'
      }
    ],
    push: [
      {
        q: 'On frictionless ice, lane A pushes a 50 kg cart with 100 N. Lane B pushes an identical cart with 200 N. B\'s acceleration is…',
        choices: ['The same', 'Twice as big', 'Half as big', 'Four times as big'], answer: 1,
        setup: function () { cfg({ surface: 'none', compare: true, force: 100, load: 50, forceB: 200, loadB: 50 }); resetPush(); setPushing(true, 2); },
        done: function () { return push.released && push.t >= 2; },
        explain: 'a = F ÷ m: 100 ÷ 50 = 2 m/s² and 200 ÷ 50 = 4 m/s². Double the net force, double the acceleration. Lane B\'s line on the graph is twice as steep.'
      },
      {
        q: 'Both lanes push with 100 N, but lane B\'s cart is loaded to 100 kg instead of 50 kg. B\'s acceleration is…',
        choices: ['The same', 'Twice as big', 'Half as big'], answer: 2,
        setup: function () { cfg({ surface: 'none', compare: true, force: 100, load: 50, forceB: 100, loadB: 100 }); resetPush(); setPushing(true, 2); },
        done: function () { return push.released && push.t >= 2; },
        explain: '100 ÷ 50 = 2 m/s² but 100 ÷ 100 = 1 m/s². Double the mass (double the inertia) and the same force gives half the acceleration.'
      },
      {
        q: 'On frictionless ice, Newton pushes the cart for 2 seconds and then lets go. What does the cart do next?',
        choices: ['Slows down and stops', 'Keeps the same speed', 'Keeps speeding up'], answer: 1,
        setup: function () { cfg({ surface: 'none', compare: false, force: 100, load: 50 }); resetPush(); setPushing(true, 2); },
        done: function () { return push.t >= 4.5; },
        explain: 'Once he lets go there is no friction and no push: zero net force. By Law 1 the cart keeps its velocity. The flat part of the graph means zero acceleration.'
      },
      {
        q: 'In thick mud, Newton pushes a 100 kg cart with 150 N and it won\'t budge. How big is the friction force?',
        choices: ['0 N', 'Less than 150 N', 'Exactly 150 N', 'More than 150 N'], answer: 2,
        setup: function () { cfg({ surface: 'mud', compare: false, force: 150, load: 100 }); resetPush(); setPushing(true, 2); },
        done: function () { return push.t >= 1; },
        explain: 'The cart isn\'t accelerating, so the net force must be 0: static friction matches the push exactly (150 N), up to its limit of about 446 N here.'
      }
    ],
    skate: [
      {
        q: 'Newton (70 kg) shoves a 20 kg cart on the ice. During the shove, which force is bigger?',
        choices: ['Newton\'s push on the cart', 'The cart\'s push on Newton', 'They are exactly equal'], answer: 2,
        setup: function () { cfg({ mNewton: 70, mCart: 20, shove: 200 }); resetSkate(); shoveOff(); },
        done: function () { return skate.t >= SHOVE_TIME; },
        explain: 'Law 3: the two forces are an action–reaction pair, always equal in size and opposite in direction. 200 N each way, no matter the masses.'
      },
      {
        q: 'After the same shove, who slides away faster?',
        choices: ['Newton', 'The cart', 'Same speed'], answer: 1,
        setup: function () { cfg({ mNewton: 70, mCart: 20, shove: 200 }); resetSkate(); shoveOff(); },
        done: function () { return skate.t >= 1.5; },
        explain: 'Same 200 N for 0.5 s on each, but a = F ÷ m: the cart gets 10 m/s², Newton only 2.9 m/s². Their momenta (mass × velocity) are equal and opposite: about 100 kg·m/s each way.'
      },
      {
        q: 'Load the cart until it weighs the same as Newton (70 kg). After the shove…',
        choices: ['Newton moves faster', 'The cart moves faster', 'They move apart at the same speed'], answer: 2,
        setup: function () { cfg({ mNewton: 70, mCart: 70, shove: 200 }); resetSkate(); shoveOff(); },
        done: function () { return skate.t >= 1.5; },
        explain: 'Equal forces on equal masses give equal accelerations, so they glide apart at the same speed in opposite directions.'
      }
    ]
  };
  var qState = { drop: 0, push: 0, skate: 0 }, picked = null, pending = null;
  var qEl = $('#ng-q'), qCount = $('#ng-q-count'), choicesEl = $('#ng-choices'), testBtn = $('#ng-test'), nextBtn = $('#ng-next'), verdictEl = $('#ng-verdict');
  function renderQuestion() {
    var list = QUESTIONS[S.mode], q = list[qState[S.mode]];
    picked = null;
    pending = null;
    qEl.textContent = q.q;
    qCount.textContent = (qState[S.mode] + 1) + ' / ' + list.length;
    choicesEl.innerHTML = '';
    q.choices.forEach(function (text, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ng-choice';
      b.textContent = text;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        if (pending && pending.revealed) return;
        picked = i;
        $$('.ng-choice', choicesEl).forEach(function (c, j) { c.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
        testBtn.disabled = false;
      });
      choicesEl.appendChild(b);
    });
    testBtn.disabled = true;
    verdictEl.hidden = true;
    verdictEl.className = 'ng-verdict';
  }
  testBtn.addEventListener('click', function () {
    if (picked == null) return;
    var q = QUESTIONS[S.mode][qState[S.mode]];
    pending = { q: q, revealed: false, mode: S.mode };
    verdictEl.hidden = false;
    verdictEl.className = 'ng-verdict';
    verdictEl.textContent = 'Locked in. Watch the lab…';
    q.setup();
  });
  nextBtn.addEventListener('click', function () {
    qState[S.mode] = (qState[S.mode] + 1) % QUESTIONS[S.mode].length;
    renderQuestion();
  });
  function checkPending() {
    if (!pending || pending.revealed || pending.mode !== S.mode || !pending.q.done()) return;
    pending.revealed = true;
    var right = picked === pending.q.answer;
    verdictEl.className = 'ng-verdict ' + (right ? 'is-right' : 'is-wrong');
    verdictEl.textContent = (right ? '✓ Your prediction was right. ' : '✗ Not quite: the answer is “' + pending.q.choices[pending.q.answer] + '.” ') + pending.q.explain;
    $$('.ng-choice', choicesEl).forEach(function (c, j) {
      if (j === pending.q.answer) c.classList.add('is-answer');
    });
  }

  /* ═════════════════════ MODES, CONTROLS, LOOP ═════════════════════ */
  var modeTabs = $$('.ng-mode');
  function setMode(mode) {
    S.mode = mode;
    modeTabs.forEach(function (t) {
      var on = t.getAttribute('data-mode') === mode;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    $$('.ng-controls').forEach(function (p) { p.hidden = p.getAttribute('data-for') !== mode; });
    setSetting('speed', MODE_SPEED[mode]);
    S.paused = false;
    syncPause();
    if (mode === 'drop') resetDrop();
    if (mode === 'push') resetPush();
    if (mode === 'skate') resetSkate();
    readoutSig = '';
    renderQuestion();
  }
  modeTabs.forEach(function (t, i) {
    t.addEventListener('click', function () { setMode(t.getAttribute('data-mode')); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var next = modeTabs[(i + d + modeTabs.length) % modeTabs.length];
      next.focus();
      next.click();
    });
  });

  var pauseBtns = $$('[data-act="pause"]');
  function syncPause() {
    pauseBtns.forEach(function (b) {
      b.textContent = S.paused ? '▶ Play' : '⏸ Pause';
      b.setAttribute('aria-pressed', S.paused ? 'true' : 'false');
    });
  }
  var ACTIONS = {
    shake: shakeTree,
    'reset-drop': resetDrop,
    'push-toggle': function () { setPushing(!push.pushing); },
    'push-2s': function () { if (push.lanes.some(function (L) { return L.v !== 0 || L.x !== 0; })) resetPush(); setPushing(true, 2); },
    'reset-push': function () { resetPush(); },
    shove: shoveOff,
    'reset-skate': resetSkate,
    pause: function () { S.paused = !S.paused; syncPause(); }
  };
  lab.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (b && ACTIONS[b.getAttribute('data-act')]) ACTIONS[b.getAttribute('data-act')]();
  });
  continueBtn.addEventListener('click', continueDrop);

  /* Scenario shortcuts — used by the side panel presets and the
     "Try it in the lab" buttons in each law's section. */
  var SCENARIOS = {
    'drop-classic': function () { setMode('drop'); cfg({ obj: 'apple', race: 'none', world: 'earth', air: true, height: 2.5, head: 'bare' }); resetDrop(); },
    'drop-race': function () { setMode('drop'); cfg({ obj: 'giant', race: 'apple', world: 'earth', air: false, height: 3 }); resetDrop(); },
    apollo: function () { setMode('drop'); cfg({ obj: 'hammer', race: 'feather', world: 'moon', height: 1.5 }); resetDrop(); },
    helmet: function () { setMode('drop'); cfg({ obj: 'apple', race: 'none', world: 'earth', head: 'helmet', height: 2.5 }); resetDrop(); },
    'push-ice': function () { setMode('push'); cfg({ surface: 'none', compare: false, force: 100, load: 50 }); resetPush(); },
    'push-compare': function () { setMode('push'); cfg({ surface: 'none', compare: true, force: 100, load: 50, forceB: 200, loadB: 50 }); resetPush(); },
    'push-mud': function () { setMode('push'); cfg({ surface: 'mud', compare: false, force: 150, load: 100 }); resetPush(); },
    'skate-cart': function () { setMode('skate'); cfg({ mNewton: 70, mCart: 20, shove: 200 }); resetSkate(); },
    'skate-equal': function () { setMode('skate'); cfg({ mNewton: 70, mCart: 70, shove: 200 }); resetSkate(); }
  };
  function runScenario(name, scroll) {
    if (!SCENARIOS[name]) return false;
    SCENARIOS[name]();
    if (scroll) {
      var target = document.getElementById('newton-lab');
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
    return true;
  }
  document.addEventListener('ll:preset', function (e) { runScenario(e.detail && e.detail.name, true); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ng-scenario]');
    if (!b) return;
    e.preventDefault();
    runScenario(b.getAttribute('data-ng-scenario'), true);
  });
  window.NewtonLab = { scenario: runScenario, setMode: setMode, state: function () { return { S: S, drop: drop, push: push, skate: skate }; } };

  setSetting('speed', S.speed);
  Object.keys(OUT).forEach(showOut);
  syncDropUi();
  syncPushUi();
  resetPush();
  resetSkate();
  setMode('drop');

  SimKit.loop(function (dt) {
    var real = Math.min(dt, 0.05);
    if (!S.paused) {
      var simDt = real * S.speed;
      if (S.mode === 'drop') { stepDropReal(real); stepDrop(simDt); }
      else if (S.mode === 'push') stepPush(simDt);
      else stepSkate(simDt);
    }
    if (!view.width || !view.height) return;
    ctx.clearRect(0, 0, view.width, view.height);
    if (S.mode === 'drop') { drawDrop(); dropCaption(); dropReadouts(); }
    else if (S.mode === 'push') { drawPush(real); pushCaption(); pushReadouts(); }
    else { drawSkate(real); skateCaption(); skateReadouts(); }
    drawGraph();
    checkPending();
  });
}());
