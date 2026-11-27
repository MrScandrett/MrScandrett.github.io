/* ─────────────────────────────────────────────────────────────────────
   GameTutorial — shared runtime for the Tiny-Loop game tutorials
   (lessons/computer-science/graphics-and-games/game-tutorials/*.html).

   Each tutorial page keeps only what is specific to its game: its state,
   update() and render(). Everything the nine pages used to copy-paste
   lives here instead:

   - canvasGame(): fixed 60 Hz timestep (the game runs at the same speed
     on a 60 Hz Chromebook and a 120 Hz iPad), crisp DPR-aware canvas at a
     fixed logical resolution, a start gate so real-time games don't play
     themselves before anyone scrolls to them, auto-pause on tab switch /
     scroll-away / focus loss, and keyboard input scoped to the game so
     arrow keys and Space still scroll the rest of the page.
   - touch controls that feed the same input as the keyboard.
   - bindConfig(): the "Tune the Game" panel — live updates, content vs.
     rule badges, the live config code peek, reset, and share links.
   - mountSeries(): the nine-archetype strip and prev/next pager.

   Needs assets/js/sim-kit.js loaded first (SimKit.loop).
   ───────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var SERIES = [
    { slug: 'catch',   num: 1,  title: 'Catch',       icon: '⭐' },
    { slug: 'clicker', num: 3,  title: 'Clicker',     icon: '🖱️' },
    { slug: 'maze',    num: 4,  title: 'Maze',        icon: '🧩' },
    { slug: 'flappy',  num: 5,  title: 'Flappy',      icon: '🐦' },
    { slug: 'pong',    num: 6,  title: 'Pong',        icon: '🏓' },
    { slug: 'shooter', num: 7,  title: 'Shooter',     icon: '🫧' },
    { slug: 'rhythm',  num: 8,  title: 'Rhythm',      icon: '🎵' },
    { slug: 'quiz',    num: 9,  title: 'Quiz Quest',  icon: '❓' },
    { slug: 'cyoa',    num: 10, title: 'Story',       icon: '📖' }
  ];

  var KIT_SRC = document.currentScript && document.currentScript.src;

  var STEP = 1 / 60;
  var reducedMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Storage (per-viewer conveniences only; every read/write guarded) ── */
  function load(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  function loadRaw(key) {
    try { return global.localStorage.getItem(key); } catch (e) { return null; }
  }

  /* ── Sound synthesizer (opt-in, off by default) ───────────────────── */
  var soundOn = false;
  (function initSoundPref() {
    var stored = loadRaw('gt-sound');
    if (stored == null) stored = loadRaw('gt-rhythm-sound');
    soundOn = stored === '"1"' || stored === '1';
  }());

  var audioCtx = null;
  var soundButtons = [];

  function syncSoundButtons() {
    soundButtons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(soundOn));
      btn.textContent = soundOn ? '🔊 Sound on' : '🔈 Sound off';
    });
  }

  function tone(freq, gain, dur, type, endFreq, delay) {
    if (!soundOn) return;
    try {
      var Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var start = audioCtx.currentTime + (delay || 0);
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || 'triangle';
      o.frequency.setValueAtTime(Math.max(20, freq), start);
      if (endFreq && endFreq > 0) {
        o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + dur);
      }
      g.gain.setValueAtTime(Math.max(0.001, gain || 0.1), start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(start);
      o.stop(start + dur + 0.01);
    } catch (e) { /* audio blocked or unavailable */ }
  }

  function playSound(name) {
    if (!soundOn) return;
    switch (name) {
      case 'good':
        tone(523.25, 0.11, 0.08, 'triangle', null, 0);
        tone(659.25, 0.11, 0.11, 'triangle', null, 0.06);
        break;
      case 'bad':
        tone(165, 0.11, 0.18, 'sawtooth', 82, 0);
        break;
      case 'hit':
        tone(460, 0.08, 0.05, 'square', null, 0);
        break;
      case 'wall':
        tone(226, 0.06, 0.045, 'square', null, 0);
        break;
      case 'step':
        tone(340, 0.05, 0.035, 'triangle', 260, 0);
        break;
      case 'bump':
        tone(130, 0.08, 0.09, 'sawtooth', 75, 0);
        break;
      case 'flap':
        tone(280, 0.09, 0.075, 'triangle', 460, 0);
        break;
      case 'pew':
        tone(740, 0.06, 0.075, 'square', 280, 0);
        break;
      case 'pop':
        tone(520, 0.1, 0.08, 'sine', 780, 0);
        break;
      case 'click':
        tone(440, 0.07, 0.04, 'triangle', 540, 0);
        break;
      case 'upgrade':
        tone(523.25, 0.09, 0.07, 'triangle', null, 0);
        tone(659.25, 0.09, 0.07, 'triangle', null, 0.055);
        tone(783.99, 0.11, 0.11, 'triangle', null, 0.11);
        break;
      case 'win':
        tone(523.25, 0.1, 0.09, 'triangle', null, 0);
        tone(659.25, 0.1, 0.09, 'triangle', null, 0.08);
        tone(783.99, 0.1, 0.09, 'triangle', null, 0.16);
        tone(1046.5, 0.12, 0.22, 'triangle', null, 0.24);
        break;
      case 'lose':
        tone(329.63, 0.1, 0.11, 'sawtooth', null, 0);
        tone(246.94, 0.1, 0.12, 'sawtooth', null, 0.1);
        tone(174.61, 0.11, 0.2, 'sawtooth', null, 0.2);
        break;
      default:
        tone(440, 0.08, 0.06, 'triangle', null, 0);
    }
  }

  function ensureHudGroup(container) {
    if (!container) return null;
    if (container.classList.contains('hud-group')) return container;
    var grp = container.querySelector('.hud-group');
    if (!grp) {
      grp = el('span', 'hud-group');
      container.appendChild(grp);
    }
    return grp;
  }

  function mountSoundToggle(container) {
    var host = ensureHudGroup(container);
    if (!host) return null;
    var existing = host.querySelector('.gt-sound-btn');
    if (existing) return existing;
    var btn = el('button', 'gt-hud-btn gt-sound-btn');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      soundOn = !soundOn;
      save('gt-sound', soundOn ? '1' : '0');
      syncSoundButtons();
      if (soundOn) tone(523.25, 0.12, 0.11, 'triangle');
    });
    soundButtons.push(btn);
    syncSoundButtons();
    host.appendChild(btn);
    return btn;
  }

  function mountXRay(container, onToggle) {
    var host = ensureHudGroup(container);
    if (!host) return null;
    var active = false;
    var btn = el('button', 'gt-hud-btn gt-xray-btn', '🔍 X-Ray');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'Toggle engine X-Ray overlay (hitboxes, vectors, and state)';
    btn.addEventListener('click', function () {
      active = !active;
      btn.setAttribute('aria-pressed', String(active));
      if (onToggle) onToggle(active);
    });
    host.appendChild(btn);
    return btn;
  }

  /* ── Shared Self-Check Quizzes ────────────────────────────────────── */
  function mountQuizzes(root) {
    var scope = root || document;
    var sections = Array.prototype.slice.call(scope.querySelectorAll('.gt-quiz-section, .pong-quiz-section'));
    // Fallback for pages whose quiz cards live in a plain section
    if (!sections.length) {
      var seen = [];
      Array.prototype.forEach.call(scope.querySelectorAll('.gt-quiz-card, .pong-quiz-card'), function (card) {
        var sec = card.closest('section') || card.parentNode;
        if (sec && seen.indexOf(sec) === -1) seen.push(sec);
      });
      sections = seen;
    }

    sections.forEach(function (section) {
      var cards = Array.prototype.slice.call(section.querySelectorAll('.gt-quiz-card, .pong-quiz-card'));
      if (!cards.length) return;

      var bar = section.querySelector('.gt-quiz-bar');
      var scoreEl, resetBtn;
      if (!bar) {
        bar = el('div', 'gt-quiz-bar');
        scoreEl = el('span', 'gt-quiz-score');
        resetBtn = el('button', 'gt-quiz-reset', '↺ Reset Quiz');
        resetBtn.type = 'button';
        bar.appendChild(scoreEl);
        bar.appendChild(resetBtn);
        section.appendChild(bar);
      } else {
        scoreEl = bar.querySelector('.gt-quiz-score');
        resetBtn = bar.querySelector('.gt-quiz-reset');
      }

      function updateScore() {
        var correct = 0;
        var answered = 0;
        cards.forEach(function (c) {
          var sel = c.querySelector('button[data-selected]');
          if (sel) {
            answered++;
            if (sel.getAttribute('data-selected') === 'correct') correct++;
          }
        });
        if (scoreEl) {
          scoreEl.textContent = answered === 0
            ? 'Score: 0 / ' + cards.length + ' (select an answer above)'
            : 'Score: ' + correct + ' / ' + cards.length + ' correct';
        }
      }

      cards.forEach(function (card) {
        if (card.dataset.gtQuizBound === '1') return;
        card.dataset.gtQuizBound = '1';
        var buttons = Array.prototype.slice.call(card.querySelectorAll('.gt-quiz-options button, .pong-quiz-options button'));
        var feedback = card.querySelector('.gt-quiz-feedback, .pong-quiz-feedback');
        buttons.forEach(function (btn) {
          if (!btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', 'false');
          btn.addEventListener('click', function () {
            buttons.forEach(function (b) {
              b.removeAttribute('data-selected');
              b.setAttribute('aria-pressed', 'false');
            });
            var ok = btn.dataset.answer === 'correct';
            btn.setAttribute('data-selected', ok ? 'correct' : 'wrong');
            btn.setAttribute('aria-pressed', 'true');
            if (feedback) feedback.textContent = btn.dataset.explain || '';
            updateScore();
          });
        });
      });

      if (resetBtn && resetBtn.dataset.gtQuizReset !== '1') {
        resetBtn.dataset.gtQuizReset = '1';
        resetBtn.addEventListener('click', function () {
          cards.forEach(function (card) {
            Array.prototype.forEach.call(card.querySelectorAll('button[data-selected], button[aria-pressed]'), function (b) {
              b.removeAttribute('data-selected');
              b.setAttribute('aria-pressed', 'false');
            });
            var fb = card.querySelector('.gt-quiz-feedback, .pong-quiz-feedback');
            if (fb) fb.textContent = '';
          });
          updateScore();
        });
      }

      updateScore();
    });
  }

  function markPlayed(slug) {
    var played = load('gt-played', []);
    if (played.indexOf(slug) === -1) { played.push(slug); save('gt-played', played); }
  }

  /* best(slug, 'score', 12) → { best, isNew }. lowerIsBetter for step counts. */
  var remixActive = false;
  function best(slug, key, value, lowerIsBetter) {
    var storeKey = 'gt-best-' + slug + '-' + key;
    var prev = load(storeKey, null);
    if (value == null || remixActive) return { best: prev, isNew: false };   // remixed rounds don't set records
    var isNew = prev == null || (lowerIsBetter ? value < prev : value > prev);
    if (isNew) save(storeKey, value);
    return { best: isNew ? value : prev, isNew: isNew };
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ── Series strip + pager ─────────────────────────────────────────── */
  function mountSeries(slug) {
    var played = load('gt-played', []);
    var index = -1;
    SERIES.forEach(function (s, i) { if (s.slug === slug) index = i; });

    var strip = document.querySelector('[data-gt-series]');
    if (strip) {
      var label = el('p', 'gt-series-label');
      label.appendChild(el('span', null, 'Tiny-Loop Tutorials · ' + (index + 1) + ' of ' + SERIES.length));
      var back = el('a', null, '← All archetypes');
      back.href = '../game-design-thinking.html#archetype-grid';
      label.appendChild(back);
      strip.appendChild(label);

      var list = el('ol');
      SERIES.forEach(function (s) {
        var li = el('li');
        var a = el('a', 'gt-chip');
        a.href = s.slug + '.html';
        if (s.slug === slug) a.setAttribute('aria-current', 'page');
        a.appendChild(el('span', 'gt-chip-icon', s.icon)).setAttribute('aria-hidden', 'true');
        a.appendChild(el('span', 'gt-chip-name', s.title));
        if (played.indexOf(s.slug) !== -1) {
          var done = el('span', 'gt-chip-done', '✓');
          done.setAttribute('aria-hidden', 'true');
          a.appendChild(done);
          a.setAttribute('aria-label', s.title + ' (played)');
        }
        li.appendChild(a);
        list.appendChild(li);
      });
      strip.appendChild(list);
    }

    // The shared Game Dev Route: links this tutorial to its history era and the
    // 2D pathway lessons that explain its theory (data lives in game-dev-route.js).
    var hero = document.querySelector('.cl-hero');
    if (hero && !document.querySelector('[data-game-route]')) {
      var route = el('div');
      route.setAttribute('data-game-route', 'tutorial:' + slug);
      hero.parentNode.insertBefore(route, hero.nextSibling);
      if (global.GameDevRoute) global.GameDevRoute.init();
      else if (KIT_SRC) {
        var s = document.createElement('script');
        s.src = new URL('game-dev-route.js', KIT_SRC).href;
        document.head.appendChild(s);
      }
    }

    var pager = document.querySelector('[data-gt-pager]');
    if (pager && index !== -1) {
      [[SERIES[index - 1], false], [SERIES[index + 1], true]].forEach(function (pair) {
        var s = pair[0];
        if (!s) { pager.appendChild(el('span')); return; }
        var a = el('a', 'next-card' + (pair[1] ? ' is-next' : ''));
        a.href = s.slug + '.html';
        var icon = el('span', 'next-card-icon', s.icon);
        icon.setAttribute('aria-hidden', 'true');
        var text = el('span');
        text.appendChild(el('strong', null, (pair[1] ? 'Next: ' : 'Previous: ') + s.title));
        text.appendChild(el('small', null, 'Archetype #' + s.num));
        if (pair[1]) { a.appendChild(text); a.appendChild(icon); }
        else { a.appendChild(icon); a.appendChild(text); }
        pager.appendChild(a);
      });
    }
  }

  /* ── Overlay (ready / paused / game over) ─────────────────────────── */
  function overlay(wrap) {
    var box = wrap.querySelector('.gt-overlay');
    if (!box) {
      box = el('div', 'gt-overlay');
      wrap.appendChild(box);
    }
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    var title = el('div', 'gt-overlay-title');
    var sub = el('div', 'gt-overlay-sub');
    var btn = el('button', 'gt-overlay-btn');
    btn.type = 'button';
    var keys = el('div', 'gt-overlay-keys');
    // The button is only in the DOM while it has a label (audits flag empty buttons, even hidden ones).
    box.appendChild(title); box.appendChild(sub); box.appendChild(keys);
    var handler = null;
    btn.addEventListener('click', function () { if (handler) handler(); });

    return {
      el: box,
      show: function (o) {
        title.textContent = o.title || '';
        sub.textContent = o.sub || '';
        sub.hidden = !o.sub;
        btn.textContent = o.button || '';
        if (o.button) box.insertBefore(btn, keys); else btn.remove();
        keys.innerHTML = o.keys || '';
        keys.hidden = !o.keys;
        handler = o.onButton || null;
        box.classList.toggle('is-soft', !!o.soft);
        box.classList.add('show');
      },
      hide: function () { box.classList.remove('show'); handler = null; },
      get visible() { return box.classList.contains('show'); },
      focusButton: function () { if (btn.isConnected) btn.focus({ preventScroll: true }); }
    };
  }

  /* ── Canvas game runtime ──────────────────────────────────────────── */
  function canvasGame(opts) {
    var canvas = opts.canvas;
    var wrap = canvas.closest('.game-wrap');
    var W = opts.width, H = opts.height;
    var ctx = canvas.getContext('2d');
    var realtime = opts.realtime !== false;
    var actions = opts.actions || {};
    var codeToAction = {};
    Object.keys(actions).forEach(function (name) {
      actions[name].forEach(function (code) { codeToAction[code] = name; });
    });

    var held = {};
    var state = realtime ? 'ready' : 'playing';
    var scale = 1;
    var visible = true;
    var xrayOn = false;
    var ov = overlay(wrap);
    var touchBox = null;
    var lastPointer = 'mouse';   // keyboard focus only matters for mouse/keyboard players
    document.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType; }, true);

    canvas.style.aspectRatio = W + ' / ' + H;
    canvas.style.maxWidth = (opts.maxWidth || 640) + 'px';
    if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;

    function resize() {
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var cssW = canvas.clientWidth || W;
      scale = (cssW / W) * dpr;
      var bw = Math.round(W * scale), bh = Math.round(H * scale);
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    }
    if (global.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    else global.addEventListener('resize', resize);
    resize();

    var game = {
      W: W, H: H, ctx: ctx, canvas: canvas,
      ticks: 0,
      reducedMotion: reducedMotion,
      get xray() { return xrayOn; },
      get state() { return state; },
      held: function (name) { return !!held[name]; },
      start: start,
      restart: restart,
      pause: pause,
      resume: resume,
      end: end,
      focus: function () { canvas.focus({ preventScroll: true }); }
    };

    var hudEl = wrap && wrap.querySelector('.game-hud');
    if (hudEl) {
      if (opts.sound !== false && (opts.xray || opts.sound)) {
        mountSoundToggle(hudEl);
      }
      if (opts.xray) {
        mountXRay(hudEl, function (active) {
          xrayOn = active;
          ctx.setTransform(scale, 0, 0, scale, 0, 0);
          opts.render(ctx, game);
        });
      }
    }

    function releaseAll() {
      Object.keys(held).forEach(function (k) { held[k] = false; });
      if (touchBox) Array.prototype.forEach.call(touchBox.children, function (b) { b.classList.remove('is-pressed'); });
    }

    function setState(next) {
      state = next;
      wrap.classList.toggle('is-playing', next === 'playing');
    }

    function showReady() {
      ov.show({
        title: opts.readyTitle || 'Ready?',
        sub: opts.readySub || '',
        button: 'Start ▶',
        keys: opts.keysHint || '',
        onButton: start
      });
    }

    function start() {
      if (state === 'playing') return;
      ov.hide();
      setState('playing');
      markPlayed(opts.slug);
      game.focus();
      if (opts.onStart) opts.onStart(game);
    }

    function restart() {
      releaseAll();
      game.ticks = 0;
      opts.reset(game);
      ov.hide();
      if (realtime && state === 'ready') { showReady(); return; }
      setState('playing');
      game.focus();
    }

    function pause(reason) {
      if (!realtime || state !== 'playing') return;
      releaseAll();
      setState('paused');
      ov.show({
        title: 'Paused',
        sub: reason || '',
        button: 'Resume ▶',
        keys: 'or press <kbd>Space</kbd> / <kbd>P</kbd>',
        soft: true,
        onButton: resume
      });
    }

    function resume() {
      if (state !== 'paused') return;
      ov.hide();
      setState('playing');
      game.focus();
    }

    /* end({ title, sub, won }) — shows the result card with Play Again. */
    function end(o) {
      o = o || {};
      releaseAll();
      setState('over');
      ov.show({
        title: o.title || 'Game Over',
        sub: o.sub || '',
        button: 'Play Again ↺',
        keys: realtime ? 'or press <kbd>Enter</kbd>' : '',
        onButton: restart
      });
      if (o.onShown) o.onShown();
    }

    function press(name) {
      if (state === 'ready') { start(); return; }
      if (state === 'paused') { resume(); return; }
      if (state !== 'playing') return;
      if (!realtime) markPlayed(opts.slug);
      if (opts.onPress) opts.onPress(name, game);
    }

    /* Keyboard — scoped to the canvas. Nothing is intercepted page-wide. */
    canvas.addEventListener('keydown', function (e) {
      var name = codeToAction[e.code];
      var isToggle = e.code === 'KeyP' || e.code === 'Escape';
      var isGo = e.code === 'Space' || e.code === 'Enter';
      if (!name && !isToggle && !isGo) return;
      e.preventDefault();

      if (state === 'over') { if (e.code === 'Enter' || e.code === 'Space') restart(); return; }
      if (isToggle && realtime) { if (state === 'playing') pause(); else if (state === 'paused') resume(); return; }
      if (state === 'ready' || state === 'paused') { if (isGo || name) press(name); return; }
      if (!name) return;
      if (!e.repeat) press(name);
      held[name] = true;
    });
    canvas.addEventListener('keyup', function (e) {
      var name = codeToAction[e.code];
      if (name) held[name] = false;
    });
    canvas.addEventListener('blur', function (e) {
      var to = e.relatedTarget;
      if (to && (wrap.contains(to) || (touchBox && touchBox.contains(to)))) return;
      releaseAll();
      if (realtime && state === 'playing' && lastPointer !== 'touch') pause('The game lost keyboard focus. Click it to keep playing.');
    });

    /* Pointer on the canvas: focus it, start/resume it, and optionally act. */
    canvas.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      game.focus();
      if (state === 'ready') { start(); return; }
      if (state === 'paused') { resume(); return; }
      if (state === 'playing' && opts.tapAction) press(opts.tapAction);
      if (state === 'playing' && opts.onPointer) {
        var r = canvas.getBoundingClientRect();
        opts.onPointer((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H, game);
      }
    });

    /* Optional pointer steering (mouse hover or touch drag), in game coordinates. */
    if (opts.onPointerMove) {
      canvas.addEventListener('pointermove', function (e) {
        if (state !== 'playing') return;
        var r = canvas.getBoundingClientRect();
        opts.onPointerMove((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H, game);
      });
    }

    /* Touch controls — same actions as the keyboard. */
    if (opts.touch && opts.touch.buttons) {
      touchBox = el('div', 'gt-touch' + (opts.touch.dpad ? ' gt-touch--dpad' : ''));
      touchBox.setAttribute('role', 'group');
      touchBox.setAttribute('aria-label', 'Touch controls');
      opts.touch.buttons.forEach(function (b) {
        var btn = el('button', null, b.label);
        btn.type = 'button';
        btn.tabIndex = -1;
        btn.setAttribute('aria-label', b.aria || b.label);
        function down(e) {
          e.preventDefault();
          btn.classList.add('is-pressed');
          if (b.hold) held[b.action] = true;
          press(b.action);
        }
        function up(e) {
          if (!btn.classList.contains('is-pressed')) return;
          e.preventDefault();
          btn.classList.remove('is-pressed');
          if (b.hold) held[b.action] = false;
        }
        btn.addEventListener('pointerdown', down);
        btn.addEventListener('pointerup', up);
        btn.addEventListener('pointercancel', up);
        btn.addEventListener('pointerleave', up);
        btn.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep canvas focus
        btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        touchBox.appendChild(btn);
      });
      wrap.insertAdjacentElement('afterend', touchBox);
    }

    /* Auto-pause when the game scrolls mostly out of view. */
    if (global.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (entries[0].intersectionRatio < 0.35 && state === 'playing') pause('Scrolled away — the game waits for you.');
      }, { threshold: [0, 0.35] }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause();
    });

    /* Fixed-timestep loop: update() always runs at 60 Hz, render() once per frame. */
    var acc = 0;
    function frame(dt) {
      if (state === 'playing') {
        acc += Math.min(dt, 0.25);
        var steps = 0;
        while (acc >= STEP && steps < 5) {
          game.ticks++;
          opts.update(game);
          acc -= STEP;
          steps++;
          if (state !== 'playing') { acc = 0; break; }
        }
      } else {
        acc = 0;
      }
      if (!visible) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      opts.render(ctx, game);
    }

    opts.reset(game);
    if (realtime) showReady(); else setState('playing');
    if (global.SimKit) global.SimKit.loop(frame, { el: global.SimKit.stage ? global.SimKit.stage(canvas) : null });
    else {
      var last = null;
      (function tick(t) {
        frame(last == null ? 0 : (t - last) / 1000);
        last = t;
        global.requestAnimationFrame(tick);
      })(performance.now());
    }
    return game;
  }

  /* ── "Tune the Game" panel ────────────────────────────────────────────
     Fields are declared in the HTML:
       <select data-cfg="ball" data-peek="cfg-ball">          content (live)
       <input type="range" data-cfg="ballSpeed" data-rule>    rule (restarts)
     onChange(config, { key, rule }) fires on every change. */
  function bindConfig(opts) {
    var panel = opts.panel;
    var fields = Array.prototype.slice.call(panel.querySelectorAll('[data-cfg]'));
    var defaults = {};
    var config = {};

    function read(f) { return f.type === 'range' ? Number(f.value) : f.value; }
    function output(f) { return panel.querySelector('output[for="' + f.id + '"]') || document.getElementById(f.id + '-out'); }

    function syncPeek(f, flash) {
      var peek = f.dataset.peek && document.getElementById(f.dataset.peek);
      if (!peek) return;
      peek.textContent = config[f.dataset.cfg];
      if (flash && !reducedMotion) {
        peek.classList.remove('gt-flash');
        void peek.offsetWidth;
        peek.classList.add('gt-flash');
      }
    }

    function setValue(f, raw) {
      if (f.type === 'range') {
        var n = Number(raw);
        if (!isFinite(n)) return false;
        var min = Number(f.min), max = Number(f.max), step = Number(f.step) || 1;
        n = Math.min(max, Math.max(min, Math.round((n - min) / step) * step + min));
        f.value = n;
      } else {
        var ok = Array.prototype.some.call(f.options, function (o) { return o.value === raw; });
        if (!ok) return false;
        f.value = raw;
      }
      return true;
    }

    fields.forEach(function (f) {
      defaults[f.dataset.cfg] = read(f);
      var label = panel.querySelector('label[for="' + f.id + '"]');
      if (label && !label.querySelector('.cfg-kind')) {
        var rule = f.hasAttribute('data-rule');
        var badge = el('span', 'cfg-kind ' + (rule ? 'rule' : 'content'), rule ? 'rule' : 'content');
        badge.title = rule
          ? 'Changes how the game plays — the round restarts.'
          : 'Changes how the game looks — applies instantly, no restart.';
        var out = output(f);
        if (out && out.parentNode === label) label.insertBefore(badge, out);
        else label.appendChild(badge);
      }
    });

    /* Shared links: #ballSpeed=5&ball=💎 */
    var params = new URLSearchParams(global.location.hash.replace(/^#/, ''));
    fields.forEach(function (f) {
      var key = f.dataset.cfg;
      if (params.has(key)) setValue(f, params.get(key));
      config[key] = read(f);
      var out = output(f);
      if (out) out.textContent = f.value;
      syncPeek(f, false);
    });

    fields.forEach(function (f) {
      var key = f.dataset.cfg;
      var rule = f.hasAttribute('data-rule');
      f.addEventListener('input', function () {
        var out = output(f);
        if (out) out.textContent = f.value;
      });
      f.addEventListener('change', function () {
        config[key] = read(f);
        syncPeek(f, true);
        status(rule ? 'Rule changed → round restarted.' : 'Content changed → applied live.');
        opts.onChange(config, { key: key, rule: rule });
      });
    });

    /* Live remixes: <button data-remix="speedRamp"> inside a .gt-remix card switches
       config.remix.speedRamp on/off in the real game, which restarts the round. The
       engine reads the flag right where the card's code snippet says it goes. */
    config.remix = {};
    var remixBtns = Array.prototype.slice.call(document.querySelectorAll('.gt-remix [data-remix]'));
    var playSection = panel.closest('section');
    if (playSection && !playSection.id && remixBtns.length) playSection.id = 'play';
    var startRemix = (params.get('remix') || '').split(',');

    function remixLabel(name) {
      var card = remixBtns.filter(function (b) { return b.dataset.remix === name; })[0];
      var strong = card && card.closest('details') && card.closest('details').querySelector('summary strong');
      return strong ? strong.textContent : name;
    }
    function syncRemix() {
      remixActive = Object.keys(config.remix).some(function (k) { return config.remix[k]; });
      remixBtns.forEach(function (btn) {
        var on = !!config.remix[btn.dataset.remix];
        btn.setAttribute('aria-pressed', String(on));
        btn.textContent = on ? '✓ On in the game · turn off' : '▶ Try it in the game';
        var card = btn.closest('details');
        if (card) card.classList.toggle('is-live', on);
      });
      if (remixBar) {
        var names = Object.keys(config.remix).filter(function (k) { return config.remix[k]; });
        remixBar.hidden = !names.length;
        remixList.textContent = names.map(remixLabel).join(' · ');
      }
    }
    function setRemix(name, on, silent) {
      config.remix[name] = !!on;
      syncRemix();
      if (silent) return;
      var note = playSection ? ' Scroll up to play it.' : '';
      status((on ? 'Remix on: ' : 'Remix off: ') + remixLabel(name) + ' → round restarted.');
      var live = remixBtns.filter(function (b) { return b.dataset.remix === name; })[0];
      var msg = live && live.parentNode.querySelector('.gt-remix-status');
      if (msg) msg.textContent = on ? 'On. The round restarted with this change.' + note : 'Off. Back to the original engine.';
      opts.onChange(config, { key: 'remix', rule: true, remix: name });
    }

    var remixBar = null, remixList = null;
    if (remixBtns.length) {
      remixBar = el('p', 'gt-remix-bar');
      remixBar.appendChild(el('strong', null, '🧪 Remixes on: '));
      remixList = el('span');
      remixBar.appendChild(remixList);
      remixBar.appendChild(el('small', 'gt-remix-bar-note', 'Personal bests pause while a remix is on.'));
      var offBtn = el('button', null, 'Turn all off');
      offBtn.type = 'button';
      offBtn.addEventListener('click', function () {
        Object.keys(config.remix).forEach(function (k) { config.remix[k] = false; });
        syncRemix();
        status('All remixes off → round restarted.');
        opts.onChange(config, { key: 'remix', rule: true, remix: null });
      });
      remixBar.appendChild(offBtn);
      var anchor = panel.querySelector('.config-actions');
      panel.insertBefore(remixBar, anchor ? anchor.nextSibling : null);

      remixBtns.forEach(function (btn) {
        btn.type = 'button';
        btn.classList.add('gt-remix-try');
        var name = btn.dataset.remix;
        config.remix[name] = startRemix.indexOf(name) !== -1;
        var row = el('div', 'gt-remix-live');
        btn.parentNode.insertBefore(row, btn);
        row.appendChild(btn);
        var msg = el('span', 'gt-remix-status');
        msg.setAttribute('role', 'status');
        row.appendChild(msg);
        btn.addEventListener('click', function () { setRemix(name, !config.remix[name]); });
        var summary = btn.closest('details') && btn.closest('details').querySelector('summary');
        if (summary && !summary.querySelector('.gt-remix-playable')) {
          var chip = el('span', 'gt-remix-playable', '▶ playable');
          chip.title = 'This remix can be switched on in the game above.';
          summary.lastElementChild.appendChild(chip);
        }
      });
      syncRemix();
    }

    var statusEl = null;
    var statusTimer = null;
    function status(msg) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      clearTimeout(statusTimer);
      statusTimer = setTimeout(function () { statusEl.textContent = ''; }, 3500);
    }

    var actionsBox = panel.querySelector('.config-actions');
    if (actionsBox) {
      if (opts.onRestart) {
        var restartBtn = el('button', null, '↺ Restart round');
        restartBtn.type = 'button';
        restartBtn.addEventListener('click', function () { opts.onRestart(config); });
        actionsBox.appendChild(restartBtn);
      }
      var resetBtn = el('button', null, 'Reset to defaults');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        fields.forEach(function (f) {
          setValue(f, String(defaults[f.dataset.cfg]));
          config[f.dataset.cfg] = read(f);
          var out = output(f);
          if (out) out.textContent = f.value;
          syncPeek(f, true);
        });
        Object.keys(config.remix).forEach(function (k) { config.remix[k] = false; });
        syncRemix();
        status('Back to the original tuning.');
        opts.onChange(config, { key: null, rule: true });
      });
      actionsBox.appendChild(resetBtn);

      var shareBtn = el('button', null, '🔗 Copy share link');
      shareBtn.type = 'button';
      shareBtn.addEventListener('click', function () {
        var p = new URLSearchParams();
        fields.forEach(function (f) {
          var key = f.dataset.cfg;
          if (config[key] !== defaults[key]) p.set(key, String(config[key]));
        });
        var onRemix = Object.keys(config.remix).filter(function (k) { return config.remix[k]; });
        if (onRemix.length) p.set('remix', onRemix.join(','));
        var url = global.location.href.split('#')[0] + (p.toString() ? '#' + p.toString() : '');
        var done = function () { status('Link copied — anyone who opens it gets your tuning.'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done, function () { status(url); });
        } else {
          status(url);
        }
      });
      actionsBox.appendChild(shareBtn);

      statusEl = el('span', 'gt-status');
      statusEl.setAttribute('role', 'status');
      actionsBox.appendChild(statusEl);
    }

    return config;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mountQuizzes(); });
  } else {
    mountQuizzes();
  }

  global.GameTutorial = {
    SERIES: SERIES,
    canvasGame: canvasGame,
    overlay: overlay,
    bindConfig: bindConfig,
    mountSeries: mountSeries,
    markPlayed: markPlayed,
    best: best,
    mountXRay: mountXRay,
    mountQuizzes: mountQuizzes,
    sound: {
      enabled: function () { return soundOn; },
      toggle: function () {
        soundOn = !soundOn;
        save('gt-sound', soundOn ? '1' : '0');
        syncSoundButtons();
        if (soundOn) tone(523.25, 0.12, 0.11, 'triangle');
        return soundOn;
      },
      tone: tone,
      play: playSound,
      mountToggle: mountSoundToggle
    }
  };
}(window));
