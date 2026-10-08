/*
 * vr-mode.js — makes the flat site comfortable to use from a VR headset browser
 * (Meta Quest Browser, Pico, Wolvic, Safari on Apple Vision Pro).
 *
 * In a headset the "mouse" is a laser from a controller or a pinch, there is no
 * physical keyboard, and small targets are hard to hit. VR mode:
 *   - enlarges buttons, form fields, tabs and nav links to ~48px targets;
 *   - draws a strong ring on whatever the laser is hovering, so students can see
 *     what they're about to click;
 *   - stops the animated page background (full-field motion is uncomfortable in
 *     a headset) without touching the student's saved "Reduce motion" setting;
 *   - adds a small VR menu: Full view (the sim/app/video on screen fills the
 *     headset window), text size, on-screen keys for keyboard-driven sims and
 *     games, and a link to the VR Lab (vr.html) of immersive WebXR experiences.
 *
 * Preference: localStorage "classroomos-vr-mode" = auto (default) | on | off.
 * "auto" turns VR mode on only in a headset browser. A link with ?vr=on / ?vr=off
 * / ?vr=auto sets the preference, so a teacher can hand out one link that works.
 * The toggle lives in Settings → Access (nav-mobile.js).
 *
 * Loaded site-wide the same way as visitor-memory.js: nav-mobile.js,
 * lesson-print-button.js and ui.js inject it; pages without those load it with
 * a plain <script src=".../assets/js/vr-mode.js" defer>.
 *
 * API: window.ClassroomOSVR = { enabled(), headset, preference(), set(pref) }
 * Event: "classroomos:vrmodechange" on window, detail { enabled, preference }.
 * Pages can mark the element that Full view should enlarge with data-vr-stage,
 * and choose on-screen keys with <body data-vr-keys="ArrowLeft ArrowRight Space">.
 */
(function () {
  'use strict';
  if (window.ClassroomOSVR) return;

  var STORAGE_KEY = 'classroomos-vr-mode';
  var ZOOM_KEY = 'classroomos-vr-zoom';
  var MOTION_KEY = 'classroomos-reduced-motion';
  var EVENT = 'classroomos:vrmodechange';
  var MOTION_EVENT = 'classroomos:reducedmotionchange';
  var ZOOMS = [100, 115, 130];
  var DEFAULT_KEYS = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'Enter'];

  var script = document.currentScript;
  var siteRoot = script && script.src ? new URL('../../', script.src).href : '/';

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* private mode */ } }

  /* ── Is this a headset browser? ─────────────────────────────────
     Quest: "... Quest 3) ... OculusBrowser/35 ... VR Safari". Pico: PicoBrowser.
     Vision Pro's Safari reports a Mac user agent, but unlike Mac Safari it exposes
     navigator.xr, and unlike a Mac it has a touch screen (pinch). iPads say
     "Macintosh" too but have no navigator.xr. */
  var ua = navigator.userAgent || '';
  var headset = /OculusBrowser|\bQuest\b|PicoBrowser|\bPico\b|Wolvic|Firefox Reality|MagicLeap|\bVR Safari\b/i.test(ua) ||
    (/Macintosh/.test(ua) && 'xr' in navigator && navigator.maxTouchPoints > 0);

  function normalise(value) {
    return value === 'on' || value === 'off' ? value : 'auto';
  }

  // ?vr=on|off|auto persists, then is stripped so a copied URL doesn't re-apply it.
  (function readUrl() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { return; }
    if (!params.has('vr')) return;
    write(STORAGE_KEY, normalise(String(params.get('vr')).toLowerCase()));
    params.delete('vr');
    try {
      var rest = params.toString();
      history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
    } catch (e) { /* sandboxed frames */ }
  }());

  function preference() { return normalise(read(STORAGE_KEY)); }
  function enabled() {
    var pref = preference();
    return pref === 'on' || (pref === 'auto' && headset);
  }

  /* ── Styles (assets/css/vr-mode.css; a stylesheet rather than an injected
        <style> so strict-CSP pages like watch.html accept it) ──────── */
  function ensureStyle() {
    if (document.getElementById('classroomos-vr-style')) return;
    var link = document.createElement('link');
    link.id = 'classroomos-vr-style';
    link.rel = 'stylesheet';
    link.href = siteRoot + 'assets/css/vr-mode.css';
    (document.head || document.documentElement).appendChild(link);
  }

  /* ── Text size (CSS zoom on the root; Chromium-based headset browsers
        keep hit-testing correct under zoom) ─────────────────────── */
  function zoomLevel() {
    var z = parseInt(read(ZOOM_KEY), 10);
    return ZOOMS.indexOf(z) >= 0 ? z : 100;
  }
  function applyZoom(on) {
    var z = on ? zoomLevel() : 100;
    document.documentElement.style.zoom = z === 100 ? '' : String(z / 100);
  }

  /* ── Full view ──────────────────────────────────────────────────── */
  function visibleArea(el) {
    var r = el.getBoundingClientRect();
    var w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
    var h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    return w > 0 && h > 0 ? w * h : 0;
  }
  // The biggest sim/app/video currently on screen, lifted to the container that
  // also holds its controls (so sliders and buttons come along into full view).
  function fullViewTarget() {
    var best = null;
    var bestArea = 0;
    var nodes = document.querySelectorAll('[data-vr-stage], canvas, iframe, video');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest('.vr-ui') || el.id === 'site-canvas-bg' || el.id === 'hero-canvas') continue;
      var area = visibleArea(el);
      if (area < 200 * 140 || area <= bestArea) continue;
      best = el;
      bestArea = area;
    }
    if (!best) return null;
    if (best.matches('iframe, video, [data-vr-stage]')) return best;
    return best.closest('[data-vr-stage], .ll-sim, .ll-stage, figure') || best.parentElement || best;
  }
  function toggleFullView() {
    if (document.fullscreenElement) { document.exitFullscreen().catch(function () {}); return; }
    var target = fullViewTarget();
    if (!target || !target.requestFullscreen) {
      say('Nothing to enlarge here. Scroll a simulation, app or video into view first.');
      return;
    }
    target.classList.add('vr-full-view');
    target.requestFullscreen().catch(function () {
      target.classList.remove('vr-full-view');
      say('This browser would not open full view.');
    });
  }
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement) {
      var prev = document.querySelectorAll('.vr-full-view');
      for (var i = 0; i < prev.length; i++) prev[i].classList.remove('vr-full-view');
    }
    syncMenu();
    // Fullscreen hides everything outside the fullscreen element; keep the pad usable.
    // (An iframe or video can't hold our buttons; a student game brings its own pad.)
    var host = document.fullscreenElement;
    if (!host || host.matches('iframe, video, canvas')) host = document.body;
    if (keys && keys.parentNode !== host) host.appendChild(keys);
    if (menu && menu.parentNode !== host) host.appendChild(menu);
  });

  /* ── On-screen keys: synthesise the keydown/keyup a game already reads
        (same approach as lib/touch-controls.js for the student games) ─ */
  var NAMED = {
    ArrowUp: ['ArrowUp', 38, '↑'], ArrowDown: ['ArrowDown', 40, '↓'],
    ArrowLeft: ['ArrowLeft', 37, '←'], ArrowRight: ['ArrowRight', 39, '→'],
    Space: [' ', 32, 'Space'], Enter: ['Enter', 13, 'Enter'], Escape: ['Escape', 27, 'Esc'],
    ShiftLeft: ['Shift', 16, 'Shift']
  };
  function describe(code) {
    if (NAMED[code]) return { code: code, key: NAMED[code][0], keyCode: NAMED[code][1], label: NAMED[code][2] };
    if (/^Key[A-Z]$/.test(code)) return { code: code, key: code.slice(3).toLowerCase(), keyCode: code.charCodeAt(3), label: code.slice(3) };
    if (/^Digit[0-9]$/.test(code)) return { code: code, key: code.slice(5), keyCode: code.charCodeAt(5), label: code.slice(5) };
    return null;
  }
  var lastTarget = null; // the sim/game the student last clicked, which the keys go to
  document.addEventListener('pointerdown', function (e) {
    if (e.target && e.target.closest && !e.target.closest('.vr-ui')) lastTarget = e.target;
  }, true);
  function sendKey(type, d) {
    var target = lastTarget && lastTarget.isConnected ? lastTarget : (document.body || document.documentElement);
    var event = new KeyboardEvent(type, { key: d.key, code: d.code, bubbles: true, cancelable: true });
    try {
      Object.defineProperty(event, 'keyCode', { get: function () { return d.keyCode; } });
      Object.defineProperty(event, 'which', { get: function () { return d.keyCode; } });
    } catch (e) { /* key/code still work */ }
    target.dispatchEvent(event);
  }
  var held = {};
  function release(code) {
    if (!held[code]) return;
    held[code].button.classList.remove('is-down');
    sendKey('keyup', held[code].d);
    delete held[code];
  }
  function releaseAll() { Object.keys(held).forEach(release); }

  function keyCodes() {
    var custom = document.body && document.body.getAttribute('data-vr-keys');
    var list = custom ? custom.trim().split(/\s+/) : DEFAULT_KEYS;
    return list.filter(describe);
  }

  var keys = null;
  function buildKeys() {
    keys = document.createElement('div');
    keys.className = 'vr-ui vr-keys';
    keys.setAttribute('role', 'group');
    keys.setAttribute('aria-label', 'On-screen keys');
    keys.hidden = true;
    var pad = document.createElement('div');
    pad.className = 'vr-pad';
    var actions = document.createElement('div');
    actions.className = 'vr-actions';
    keyCodes().forEach(function (code) {
      var d = describe(code);
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.key = code;
      b.textContent = d.label;
      b.setAttribute('aria-label', code.replace(/^Arrow/, 'Arrow ').replace(/^Key/, ''));
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); // keep focus on the game
        if (held[code]) return;
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
        held[code] = { d: d, button: b };
        b.classList.add('is-down');
        sendKey('keydown', d);
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
        b.addEventListener(t, function () { release(code); });
      });
      // Keyboard/switch users reaching the pad itself get a tap.
      b.addEventListener('click', function (e) {
        if (e.detail !== 0) return;
        sendKey('keydown', d); sendKey('keyup', d);
      });
      (/^Arrow/.test(code) ? pad : actions).appendChild(b);
    });
    if (pad.children.length) keys.appendChild(pad);
    if (actions.children.length) keys.appendChild(actions);
    document.body.appendChild(keys);
  }
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', function () { if (document.hidden) releaseAll(); });

  /* ── VR menu ────────────────────────────────────────────────────── */
  var menu = null;
  var panel, toggle, fullBtn, keysBtn, note;
  function say(text) {
    if (!note) return;
    note.textContent = text;
    note.hidden = !text;
    if (text) { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); }
  }

  function button(label, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    b.addEventListener('click', onClick);
    return b;
  }

  function buildMenu() {
    menu = document.createElement('div');
    menu.className = 'vr-ui vr-menu';
    menu.setAttribute('role', 'region');
    menu.setAttribute('aria-label', 'VR headset controls');

    toggle = button('🥽 VR', function () {
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) say('');
    });
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'vr-menu-panel');

    panel = document.createElement('div');
    panel.className = 'vr-menu-panel';
    panel.id = 'vr-menu-panel';
    panel.hidden = true;

    // Picking an action closes the menu so it isn't left covering the lesson.
    fullBtn = button('⛶ Full view', function () { closePanel(); toggleFullView(); });
    keysBtn = button('⌨ On-screen keys', function () {
      closePanel();
      if (!keys) buildKeys();
      keys.hidden = !keys.hidden;
      if (keys.hidden) releaseAll();
      syncMenu();
    });
    var row = document.createElement('div');
    row.className = 'vr-menu-row';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Text size');
    var smaller = button('A−', function () { stepZoom(-1); });
    var bigger = button('A+', function () { stepZoom(1); });
    smaller.setAttribute('aria-label', 'Smaller text');
    bigger.setAttribute('aria-label', 'Bigger text');
    row.appendChild(smaller);
    row.appendChild(bigger);

    var lab = document.createElement('a');
    lab.href = siteRoot + 'vr.html';
    lab.textContent = '✦ VR Lab — immersive experiences';
    var off = button('Turn off VR mode', function () { set('off'); });

    note = document.createElement('p');
    note.className = 'vr-menu-note';
    note.setAttribute('role', 'status');
    note.hidden = true;

    [fullBtn, keysBtn, row, lab, off, note].forEach(function (n) { panel.appendChild(n); });
    menu.appendChild(toggle);
    menu.appendChild(panel);
    document.body.appendChild(menu);
    syncMenu();
  }

  function closePanel() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  function stepZoom(dir) {
    var i = ZOOMS.indexOf(zoomLevel()) + dir;
    i = Math.max(0, Math.min(ZOOMS.length - 1, i));
    write(ZOOM_KEY, String(ZOOMS[i]));
    applyZoom(true);
    say('Text size ' + ZOOMS[i] + '%');
  }

  function syncMenu() {
    if (!menu) return;
    fullBtn.textContent = document.fullscreenElement ? '⛶ Exit full view' : '⛶ Full view';
    keysBtn.setAttribute('aria-pressed', String(!!(keys && !keys.hidden)));
  }

  /* ── Apply ──────────────────────────────────────────────────────── */
  var lastApplied = null;
  function motionEvent(reduced) {
    try { window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: { reducedMotion: reduced } })); } catch (e) { /* old engines */ }
  }

  function apply() {
    var on = enabled();
    var html = document.documentElement;
    html.setAttribute('data-vr-mode', on ? 'on' : 'off');
    applyZoom(on);
    if (on) ensureStyle();
    if (document.body) {
      if (on && !menu) buildMenu();
      if (menu) menu.hidden = !on;
      if (!on && keys) { keys.hidden = true; releaseAll(); }
      syncMenu();
    }
    if (lastApplied !== on) {
      // Pause the animated background in VR; restore the student's own choice after.
      if (on) motionEvent(true);
      else if (lastApplied === true) motionEvent(read(MOTION_KEY) === 'on');
      lastApplied = on;
      try { window.dispatchEvent(new CustomEvent(EVENT, { detail: { enabled: on, preference: preference() } })); } catch (e) { /* old engines */ }
    }
  }

  function set(pref) {
    write(STORAGE_KEY, normalise(pref));
    apply();
  }

  window.ClassroomOSVR = {
    enabled: enabled,
    headset: headset,
    preference: preference,
    set: set
  };

  // Attribute first (before paint) so the larger targets don't pop in later.
  document.documentElement.setAttribute('data-vr-mode', enabled() ? 'on' : 'off');
  if (enabled()) ensureStyle();

  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) apply();
    if (e.key === ZOOM_KEY) applyZoom(enabled());
  });
  // The animated background may start after us; stop it again once it has.
  window.addEventListener('load', function () { if (enabled()) motionEvent(true); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
}());
