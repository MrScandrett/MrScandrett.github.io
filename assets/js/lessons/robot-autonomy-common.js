/* Shared helpers for the Robot Autonomy lessons: quiz buttons, canvas pointer
   mapping, the small geometry used by every sim (rays vs. walls), and the
   all-ages layer (Explorer / Builder / Engineer levels, read-aloud, the Bolt
   mascot, screen-reader announcements, keyboard cursors, robot sprites). */
(function (global) {
  'use strict';

  var reducedMotion = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function initQuiz(root) {
    (root || document).querySelectorAll('.ra-question').forEach(function (question, qi) {
      var prompt = question.querySelector(':scope > p');
      if (prompt && !prompt.id) prompt.id = 'ra-q-' + qi;
      question.setAttribute('role', 'group');
      if (prompt) question.setAttribute('aria-labelledby', prompt.id);
      question.querySelectorAll('.ra-option').forEach(function (option) {
        option.type = 'button';
        option.addEventListener('click', function () {
          if (question.dataset.locked) return;
          question.dataset.locked = 'true';
          question.querySelectorAll('.ra-option').forEach(function (item) {
            item.disabled = true;
            if (item.dataset.choice === question.dataset.answer) item.classList.add('is-correct');
          });
          var correct = option.dataset.choice === question.dataset.answer;
          if (!correct) option.classList.add('is-wrong');
          question.classList.add(correct ? 'is-right' : 'is-missed');
          question.querySelector('.ra-feedback').textContent = (correct ? 'Correct. ' : 'Not quite. ') + question.dataset.explanation;
        });
      });
    });
  }

  // Canvas drawn at a fixed logical size (its width/height attributes) and
  // scaled by CSS; convert a pointer event to logical coordinates.
  function canvasPoint(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height
    };
  }

  // Distance along a ray from (x, y) at angle a to the nearest axis-aligned
  // rectangle {x, y, w, h}, or maxRange if nothing is hit.
  function rayCast(x, y, a, rects, maxRange) {
    var dx = Math.cos(a), dy = Math.sin(a), best = maxRange;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var t1 = (r.x - x) / dx, t2 = (r.x + r.w - x) / dx;
      var t3 = (r.y - y) / dy, t4 = (r.y + r.h - y) / dy;
      var tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
      var tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
      if (tmax >= 0 && tmin <= tmax) {
        var t = tmin >= 0 ? tmin : tmax;
        if (t < best) best = t;
      }
    }
    return best;
  }

  function hitsRect(x, y, pad, rects) {
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad) return true;
    }
    return false;
  }

  // Gaussian noise (Box–Muller).
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function loop(fn) {
    if (global.SimKit && global.SimKit.loop) return global.SimKit.loop(function (dt) { fn(Math.min(0.05, dt)); });
    var last = 0, id = 0;
    function tick(t) { var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t; fn(dt); id = requestAnimationFrame(tick); }
    id = requestAnimationFrame(tick);
    return { stop: function () { cancelAnimationFrame(id); } };
  }

  /* ── Screen-reader announcements ───────────────────────────────── */
  // One polite live region per page. Sims call announce() on meaningful
  // events (path found, goal reached), never every frame; repeats of the
  // same message are dropped so a stuck robot doesn't chatter.
  var liveEl = null, lastMsg = '', lastAt = 0;
  function announce(msg, force) {
    if (!msg) return;
    var now = Date.now();
    if (!force && msg === lastMsg && now - lastAt < 8000) return;
    lastMsg = msg; lastAt = now;
    if (!liveEl) {
      liveEl = document.createElement('div');
      liveEl.className = 'ra-sr-only';
      liveEl.setAttribute('role', 'status');
      liveEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveEl);
    }
    liveEl.textContent = '';
    setTimeout(function () { liveEl.textContent = msg; }, 60);
  }

  /* ── Keyboard cursor for canvas sims ───────────────────────────── */
  // Makes a canvas focusable and gives it a crosshair the arrow keys move.
  // opts: { step, x, y, onMove(cursor), onKey(key, cursor, event) -> true if handled,
  //         describe(cursor) -> string announced after each move }
  function keyCursor(canvas, opts) {
    opts = opts || {};
    var step = opts.step || 20;
    var cur = { x: opts.x != null ? opts.x : canvas.width / 2, y: opts.y != null ? opts.y : canvas.height / 2, focused: false, used: false };
    if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
    canvas.addEventListener('focus', function () { cur.focused = true; });
    canvas.addEventListener('blur', function () { cur.focused = false; });
    canvas.addEventListener('pointerdown', function () { cur.used = false; });
    canvas.addEventListener('keydown', function (e) {
      var k = e.key, mult = e.shiftKey ? 3 : 1, moved = false;
      if (k === 'ArrowLeft') { cur.x -= step * mult; moved = true; }
      else if (k === 'ArrowRight') { cur.x += step * mult; moved = true; }
      else if (k === 'ArrowUp') { cur.y -= step * mult; moved = true; }
      else if (k === 'ArrowDown') { cur.y += step * mult; moved = true; }
      if (moved) {
        cur.x = Math.max(step / 2, Math.min(canvas.width - step / 2, cur.x));
        cur.y = Math.max(step / 2, Math.min(canvas.height - step / 2, cur.y));
        cur.used = true;
        e.preventDefault();
        if (opts.onMove) opts.onMove(cur);
        if (opts.describe) announce(opts.describe(cur), true);
        return;
      }
      if (opts.onKey && opts.onKey(k === ' ' ? 'Enter' : k, cur, e)) { cur.used = true; e.preventDefault(); }
    });
    return cur;
  }

  function drawCursor(ctx, cur, color) {
    if (!cur || !cur.focused || !cur.used) return;
    ctx.save();
    ctx.strokeStyle = '#0f1d23'; ctx.lineWidth = 5;
    crosshair();
    ctx.strokeStyle = color || '#ffffff'; ctx.lineWidth = 2;
    crosshair();
    ctx.restore();
    function crosshair() {
      ctx.beginPath(); ctx.arc(cur.x, cur.y, 12, 0, Math.PI * 2);
      ctx.moveTo(cur.x - 20, cur.y); ctx.lineTo(cur.x - 6, cur.y); ctx.moveTo(cur.x + 6, cur.y); ctx.lineTo(cur.x + 20, cur.y);
      ctx.moveTo(cur.x, cur.y - 20); ctx.lineTo(cur.x, cur.y - 6); ctx.moveTo(cur.x, cur.y + 6); ctx.lineTo(cur.x, cur.y + 20);
      ctx.stroke();
    }
  }

  /* ── Shared sprites ────────────────────────────────────────────── */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Top-down two-wheeled robot facing +x after rotation by a.
  // opts: { body, outline, ghost (0–1 alpha), face: 'happy'|'oops'|null, light }
  function drawRobot(ctx, x, y, a, r, opts) {
    opts = opts || {};
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a || 0);
    if (opts.ghost != null) ctx.globalAlpha = opts.ghost;
    // wheels
    ctx.fillStyle = '#0b1418';
    roundRect(ctx, -r * 0.6, -r * 1.12, r * 1.2, r * 0.42, r * 0.16); ctx.fill();
    roundRect(ctx, -r * 0.6, r * 0.7, r * 1.2, r * 0.42, r * 0.16); ctx.fill();
    // body
    ctx.fillStyle = opts.body || '#146b8c';
    ctx.strokeStyle = opts.outline || '#e8f6fb'; ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // sensor bar on the front
    ctx.fillStyle = opts.light || '#f2bf3f';
    roundRect(ctx, r * 0.42, -r * 0.5, r * 0.36, r, r * 0.14); ctx.fill();
    if (opts.face && r >= 9) {
      // a face drawn upright-ish relative to heading, for younger viewers
      ctx.fillStyle = '#0f1d23';
      ctx.beginPath(); ctx.arc(r * 0.05, -r * 0.32, r * 0.13, 0, Math.PI * 2); ctx.arc(r * 0.05, r * 0.32, r * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0f1d23'; ctx.lineWidth = Math.max(1.2, r * 0.1); ctx.beginPath();
      if (opts.face === 'oops') ctx.arc(-r * 0.5, 0, r * 0.22, -Math.PI / 2, Math.PI / 2, true);
      else ctx.arc(-r * 0.22, 0, r * 0.3, -Math.PI / 2.6, Math.PI / 2.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFlag(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, s * 0.55, s * 0.6, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8f6fb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.55); ctx.lineTo(-s * 0.3, -s * 0.9); ctx.stroke();
    var fw = s * 0.95, fh = s * 0.6, cells = 4, cw = fw / cells, ch = fh / 2;
    for (var i = 0; i < cells; i++) for (var j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#0f1d23' : (color || '#b8d84b');
      ctx.fillRect(-s * 0.3 + i * cw, -s * 0.9 + j * ch, cw, ch);
    }
    ctx.strokeStyle = color || '#b8d84b'; ctx.lineWidth = 1.5; ctx.strokeRect(-s * 0.3, -s * 0.9, fw, fh);
    ctx.restore();
  }

  function drawPad(ctx, x, y, s, color, label) {
    ctx.save();
    ctx.fillStyle = color || '#146b8c';
    ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = color || '#146b8c'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    if (label) {
      ctx.fillStyle = '#e8f6fb'; ctx.font = '700 ' + Math.round(s * 0.95) + 'px IBM Plex Mono, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x, y + 1);
    }
    ctx.restore();
  }

  // A rounded boulder with a highlight, so obstacles read as objects, not dots.
  function drawRock(ctx, x, y, r, base) {
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#f08a55'); g.addColorStop(0.55, base || '#c65e2e'); g.addColorStop(1, '#7a3216');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  /* ── Bolt, the series mascot ───────────────────────────────────── */
  function mascotSVG(mood) {
    var eyes = mood === 'think'
      ? '<path d="M35 44h10M55 44h10" stroke="#12202a" stroke-width="5" stroke-linecap="round"/>'
      : mood === 'wow'
        ? '<circle cx="40" cy="44" r="7" fill="#12202a"/><circle cx="60" cy="44" r="7" fill="#12202a"/><circle cx="42" cy="42" r="2.2" fill="#fff"/><circle cx="62" cy="42" r="2.2" fill="#fff"/>'
        : '<circle cx="40" cy="44" r="5.5" fill="#12202a"/><circle cx="60" cy="44" r="5.5" fill="#12202a"/><circle cx="41.5" cy="42.5" r="1.8" fill="#fff"/><circle cx="61.5" cy="42.5" r="1.8" fill="#fff"/>';
    var mouth = mood === 'wow' ? '<ellipse cx="50" cy="60" rx="5" ry="6" fill="#12202a"/>'
      : mood === 'think' ? '<path d="M42 61q8-4 16 0" stroke="#12202a" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        : '<path d="M40 57q10 10 20 0" stroke="#12202a" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    var arm = mood === 'wave'
      ? '<path d="M82 88l12-22" stroke="#2d4a54" stroke-width="7" stroke-linecap="round"/><circle cx="95" cy="62" r="6" fill="#f2bf3f" stroke="#2d4a54" stroke-width="3"/>'
      : '<path d="M82 88l10 12" stroke="#2d4a54" stroke-width="7" stroke-linecap="round"/><circle cx="93" cy="103" r="6" fill="#f2bf3f" stroke="#2d4a54" stroke-width="3"/>';
    return '<svg viewBox="0 0 110 130" aria-hidden="true" focusable="false">' +
      '<path d="M50 22V8" stroke="#2d4a54" stroke-width="4"/><circle cx="50" cy="7" r="6" fill="#d94b41"/>' +
      '<rect x="18" y="22" width="64" height="52" rx="16" fill="#70c8e5" stroke="#2d4a54" stroke-width="4"/>' +
      '<rect x="27" y="31" width="46" height="36" rx="10" fill="#e8f6fb"/>' + eyes + mouth +
      '<rect x="28" y="78" width="44" height="34" rx="10" fill="#146b8c" stroke="#2d4a54" stroke-width="4"/>' +
      '<circle cx="50" cy="95" r="7" fill="#b8d84b" stroke="#2d4a54" stroke-width="3"/>' +
      '<path d="M18 88l-10 12" stroke="#2d4a54" stroke-width="7" stroke-linecap="round"/><circle cx="7" cy="103" r="6" fill="#f2bf3f" stroke="#2d4a54" stroke-width="3"/>' + arm +
      '<rect x="22" y="112" width="18" height="14" rx="5" fill="#12202a"/><rect x="60" y="112" width="18" height="14" rx="5" fill="#12202a"/>' +
      '</svg>';
  }

  /* ── Levels: Explorer (ages ~6–10), Builder (~11–14), Engineer (~15+) ── */
  // Elements tagged data-ra-for="explorer builder" show only at those levels.
  // Untagged content shows at every level.
  var LEVELS = [
    { id: 'explorer', label: 'Explorer', ages: 'ages 6–10', icon: '🧭' },
    { id: 'builder', label: 'Builder', ages: 'ages 11–14', icon: '🔧' },
    { id: 'engineer', label: 'Engineer', ages: 'ages 15+', icon: '📐' }
  ];
  function readLevel() {
    var m = /[?&]level=(explorer|builder|engineer)\b/.exec(location.search);
    if (m) return m[1];
    try { var s = localStorage.getItem('ra-level'); if (s && /^(explorer|builder|engineer)$/.test(s)) return s; } catch (e) { /* storage blocked */ }
    return 'builder';
  }
  function setLevel(level, buttons) {
    document.documentElement.setAttribute('data-ra-level', level);
    try { localStorage.setItem('ra-level', level); } catch (e) { /* storage blocked */ }
    (buttons || []).forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.level === level)); b.tabIndex = b.dataset.level === level ? 0 : -1; });
    document.dispatchEvent(new CustomEvent('ra-level', { detail: level }));
  }
  function initLevels() {
    var hero = document.querySelector('.ra-hero > div');
    if (!hero || document.querySelector('.ra-levels')) return;
    var wrap = document.createElement('div');
    wrap.className = 'ra-levels';
    wrap.innerHTML = '<span class="ra-levels-label" id="ra-levels-label">Choose your level</span>';
    var group = document.createElement('div');
    group.className = 'ra-levels-group';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-labelledby', 'ra-levels-label');
    var buttons = LEVELS.map(function (L) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ra-level'; b.dataset.level = L.id;
      b.setAttribute('role', 'radio');
      b.innerHTML = '<span aria-hidden="true">' + L.icon + '</span> <b>' + L.label + '</b><small>' + L.ages + '</small>';
      group.appendChild(b);
      return b;
    });
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { setLevel(b.dataset.level, buttons); announce(b.querySelector('b').textContent + ' level. The page now shows ' + (b.dataset.level === 'explorer' ? 'simpler words, stories, and hands-on games.' : b.dataset.level === 'engineer' ? 'extra math and deeper details.' : 'the standard lesson.'), true); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var next = buttons[(i + d + buttons.length) % buttons.length];
        next.focus(); next.click();
      });
    });
    wrap.appendChild(group);
    var meta = hero.querySelector('.ra-meta');
    if (meta) meta.insertAdjacentElement('afterend', wrap); else hero.appendChild(wrap);
    setLevel(readLevel(), buttons);
  }

  /* ── Read aloud ────────────────────────────────────────────────── */
  // Adds a "Read to me" button to every [data-ra-say] block, so early readers
  // and anyone who prefers listening can hear the explanation.
  function initReadAloud() {
    var synth = global.speechSynthesis;
    var blocks = document.querySelectorAll('[data-ra-say]');
    if (!synth || !global.SpeechSynthesisUtterance || !blocks.length) return;
    var active = null;
    function stop() {
      synth.cancel();
      if (active) { active.setAttribute('aria-pressed', 'false'); active.querySelector('span').textContent = 'Read to me'; }
      active = null;
    }
    blocks.forEach(function (block) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'ra-say';
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg><span>Read to me</span>';
      btn.addEventListener('click', function () {
        var was = active === btn;
        stop();
        if (was) return;
        var clone = block.cloneNode(true);
        clone.querySelectorAll('.ra-say, .ra-mascot, [aria-hidden="true"], .photo-credit').forEach(function (n) { n.remove(); });
        var u = new SpeechSynthesisUtterance(clone.textContent.replace(/\s+/g, ' ').trim());
        u.rate = 0.92;
        u.onend = function () { if (active === btn) stop(); };
        active = btn;
        btn.setAttribute('aria-pressed', 'true'); btn.querySelector('span').textContent = 'Stop reading';
        synth.speak(u);
      });
      var slot = block.querySelector('[data-ra-say-slot]');
      if (slot) slot.appendChild(btn); else block.insertBefore(btn, block.firstChild);
    });
    global.addEventListener('pagehide', stop);
  }

  function initMascots() {
    document.querySelectorAll('[data-ra-mascot]').forEach(function (el) {
      el.classList.add('ra-mascot');
      el.innerHTML = mascotSVG(el.getAttribute('data-ra-mascot'));
    });
  }

  global.RobotAutonomy = {
    initQuiz: initQuiz, canvasPoint: canvasPoint, rayCast: rayCast, hitsRect: hitsRect, gauss: gauss, loop: loop,
    announce: announce, keyCursor: keyCursor, drawCursor: drawCursor, reducedMotion: reducedMotion,
    roundRect: roundRect, drawRobot: drawRobot, drawFlag: drawFlag, drawPad: drawPad, drawRock: drawRock,
    mascotSVG: mascotSVG, level: function () { return document.documentElement.getAttribute('data-ra-level') || 'builder'; }
  };
  // Set the level attribute immediately so tagged content doesn't flash.
  document.documentElement.setAttribute('data-ra-level', readLevel());
  document.addEventListener('DOMContentLoaded', function () {
    initQuiz(document);
    initLevels();
    initMascots();
    initReadAloud();
  });
})(window);
