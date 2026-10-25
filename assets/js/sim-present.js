/* Present a sim: a ⛶ button on every lesson sim (canvas, diagram SVG, <model-viewer>)
   that fills the screen with it for the projector.

   lesson-print-button.js loads this on any lesson with a canvas, svg or model-viewer.

   What fills the screen:
   - In the lesson layout (.ll-stage) the whole stage goes full screen, so the side
     panel's sliders come along, and everything in the lesson column except the chosen
     sim is hidden (data-sp-hide). Hidden sims pause on their own through SimKit.
   - Elsewhere the sim's block goes full screen by itself.
   The block is the sim's <figure> / [data-present] / [data-vr-stage], or else the
   biggest wrapper around it that still fits on one screen (so its buttons come too).
   After entering, the block is narrowed until it fits the screen's height; lessons size
   their canvases from the width, so this keeps every lesson's own aspect ratio.

   Opt out with data-present="off" on the sim, a wrapper or <body>. Blocks that already
   have their own full-screen button are skipped. iPhone has no element fullscreen, so
   there the frame becomes a fixed overlay instead (Esc or ⛶ again to leave). */
(function () {
  'use strict';
  if (window.ClassroomOSPresent) return;

  var MEDIA = 'canvas, svg, model-viewer, [data-present]:not([data-present="off"])';
  var SKIP = '[data-present="off"], .tl, [data-timeline], [data-score], [data-video], .fb-shell, header, nav, footer, ' +
    '.site-header, .ll-topbar, .ll-panel, button, a, .vr-ui, .lesson-print-actions, [data-zoomable], [aria-hidden="true"] svg, ' +
    '.math-scratchpad';
  // Never widen past these: they hold the whole lesson and never leave the screen.
  var BOUNDARY = '.ll-sim, .ll-stage, .ll-viewport, main, article, body, [role="main"]';
  var OWN_FULL = /full\s*-?screen|full view|⛶|present/i;

  var blocks = [];   // { block, btn }
  var active = null; // { frame, block, pseudo, hidden: [], style }

  function css() {
    if (document.getElementById('sim-present-styles')) return;
    var s = document.createElement('style');
    s.id = 'sim-present-styles';
    s.textContent = [
      '.sp-anchor{position:relative}',
      // Lessons style every button; the ⛶ pill must look the same on all of them.
      '.sp-btn.sp-btn{position:absolute!important;top:.4rem;right:.4rem;left:auto;z-index:20;display:inline-flex!important;',
      'align-items:center;gap:.3rem;width:auto!important;min-width:0;min-height:2rem;margin:0!important;padding:.25rem .6rem!important;',
      'border-radius:999px!important;border:1px solid rgba(255,255,255,.35)!important;box-shadow:none!important;',
      'background:rgba(15,23,36,.72)!important;color:#f4f7fb!important;font:600 .82rem/1 system-ui,-apple-system,"Segoe UI",sans-serif!important;',
      'letter-spacing:0;text-transform:none;cursor:pointer;opacity:.55;transition:opacity .15s;transform:none}',
      '.sp-host:hover>.sp-btn,.sp-btn:focus-visible,.sp-on>.sp-btn{opacity:1}',
      '.sp-btn:focus-visible{outline:3px solid var(--accent,#5aa9ff)!important;outline-offset:2px}',
      '@media (hover:none){.sp-btn.sp-btn{opacity:.9}}',
      '[data-sp-hide]{display:none!important}',
      // The frame lays out only the path to the block, whatever grid the lesson gave it.
      '.sp-frame.sp-frame{overflow:auto!important;box-sizing:border-box!important}',
      '.sp-frame.sp-frame:not(.ll-stage),.sp-frame.ll-stage .ll-sim{display:flex!important;flex-direction:column!important;',
      'justify-content:center!important;justify-content:safe center!important;align-items:stretch!important;padding:1rem!important;',
      'box-sizing:border-box!important;max-width:none!important;gap:0!important}',
      '.sp-frame.ll-stage{height:100vh;height:100dvh}',
      '.sp-frame [data-sp-path]{display:block!important;flex:none!important;max-width:none!important;width:auto!important;margin:0!important;padding-top:0!important;padding-bottom:0!important}',
      '.sp-on.sp-on{flex:none!important;margin:0 auto!important;width:100%!important;box-sizing:border-box!important}',
      '.sp-pseudo{position:fixed!important;inset:0;z-index:2147481000;width:100vw!important;height:100vh!important;height:100dvh!important}',
      'html.sp-scroll-lock,html.sp-scroll-lock body{overflow:hidden!important}',
      '@media print{.sp-btn{display:none!important}}'
    ].join('');
    document.head.appendChild(s);
  }

  function big(el) {
    // Inside a closed <details> a canvas keeps its size but isn't shown.
    if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true })) return false;
    var r = el.getBoundingClientRect();
    if (el.tagName.toLowerCase() === 'svg') return r.width >= 240 && r.height >= 160;
    return r.width >= 200 && r.height >= 140;
  }

  function skip(el) {
    if (el.id === 'site-canvas-bg' || el.id === 'hero-canvas') return true;
    if (el.closest(SKIP)) return true;
    // Theme backgrounds: a fixed layer behind the whole page.
    if (el.tagName.toLowerCase() === 'canvas' && getComputedStyle(el).position === 'fixed') return true;
    if (el.tagName.toLowerCase() === 'svg' && el.parentElement && el.parentElement.closest('svg')) return true;
    return false;
  }

  // The block to present: a declared one, else the biggest wrapper that fits on one screen.
  function blockFor(el) {
    var declared = el.closest('[data-present]:not([data-present="off"]), [data-vr-stage], figure');
    if (declared && !declared.matches(BOUNDARY)) return declared;
    // Judge against at least a laptop-height screen: on a phone held sideways (~340px tall)
    // nearly every sim's wrapper was "far taller than the screen", so no ⛶ appeared at all,
    // exactly where filling the screen helps most.
    var screenH = Math.max(innerHeight, 700);
    var limit = screenH * 0.9;
    // Start at the parent: a canvas, svg or <model-viewer> can't hold the button.
    var block = el.parentElement;
    if (!block) return null;
    // A wrapper already far taller than the screen is a page section, not a sim.
    if (block.matches(BOUNDARY) || block.getBoundingClientRect().height > screenH * 1.5) return null;
    for (var p = block.parentElement; p && !p.matches(BOUNDARY); p = p.parentElement) {
      if (p.getBoundingClientRect().height > limit) break;
      block = p;
    }
    return block;
  }

  function hasOwnFullscreen(block) {
    var btns = block.querySelectorAll('button, [role="button"]');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].classList.contains('sp-btn')) continue;
      var label = (btns[i].getAttribute('aria-label') || '') + ' ' + (btns[i].title || '') + ' ' + btns[i].textContent;
      if (OWN_FULL.test(label)) return true;
    }
    return false;
  }

  function known(block) {
    for (var i = 0; i < blocks.length; i++) if (blocks[i].block === block) return true;
    return false;
  }

  function scan() {
    if (document.body.matches('[data-present="off"]')) return;
    var media = document.querySelectorAll(MEDIA);
    for (var i = 0; i < media.length; i++) {
      var el = media[i];
      if (skip(el) || !big(el)) continue;
      var block = blockFor(el);
      if (!block || known(block) || block.querySelector('.sp-btn') || block.closest('.sp-host') || hasOwnFullscreen(block)) continue;
      // Don't nest: a wrapper that already holds a presented block keeps the inner one.
      if (block.querySelector('.sp-host')) continue;
      addButton(block);
    }
  }

  function addButton(block) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sp-btn';
    btn.setAttribute('data-no-print', '');
    btn.setAttribute('data-memory-ignore', '');
    label(btn, false);
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (active && active.block === block) exit(); else enter(block);
    });
    block.classList.add('sp-host');
    if (getComputedStyle(block).position === 'static') block.classList.add('sp-anchor');
    block.insertBefore(btn, block.firstChild);
    blocks.push({ block: block, btn: btn });
  }

  function label(btn, on) {
    btn.textContent = on ? '✕ Exit full screen' : '⛶';
    btn.setAttribute('aria-label', on ? 'Exit full screen' : 'Fill the screen with this simulation');
    btn.title = on ? 'Exit full screen (Esc)' : 'Fill the screen (for the projector)';
  }

  function btnOf(block) {
    for (var i = 0; i < blocks.length; i++) if (blocks[i].block === block) return blocks[i].btn;
    return null;
  }

  // The first opaque background at or above el (layers of see-through ones are rare in lessons).
  function paperBehind(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var c = getComputedStyle(n).backgroundColor;
      var m = /rgba?\(([^)]+)\)/.exec(c);
      if (!m) continue;
      var parts = m[1].split(/[\s,\/]+/).filter(Boolean);
      if (parts.length < 4 || parseFloat(parts[3]) >= 0.95) return 'rgb(' + parts.slice(0, 3).join(',') + ')';
    }
    return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
  }

  /* ── Entering and leaving ─────────────────────────────────────── */
  function fullscreenElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }

  function enter(block) {
    if (active) exit();
    // The frame is what goes full screen; the block sits inside it so it can be measured,
    // narrowed and zoomed (a full-screen element itself is always exactly the screen).
    var stage = block.closest('.ll-stage');
    var frame = stage || block.parentElement;
    var col = stage ? (block.closest('.ll-sim') || stage) : frame;
    var hidden = [];
    var path = [];
    // Hide everything in the frame but the path down to this block.
    for (var n = block; n && n !== col; n = n.parentElement) {
      if (n !== block) { n.setAttribute('data-sp-path', ''); path.push(n); }
      var sibs = n.parentElement ? n.parentElement.children : [];
      for (var i = 0; i < sibs.length; i++) {
        var s = sibs[i];
        if (s === n || s.hasAttribute('data-sp-hide') || /^(SCRIPT|STYLE|TEMPLATE)$/.test(s.tagName)) continue;
        s.setAttribute('data-sp-hide', '');
        hidden.push(s);
      }
    }
    active = { frame: frame, block: block, stage: stage, col: col, hidden: hidden, path: path, pseudo: false, zoom: 1,
      scroll: stage ? col.scrollTop : scrollY };
    // Full screen paints black behind a see-through frame, so give it the solid colour it sat on.
    active.frameStyle = frame.getAttribute('style');
    frame.style.backgroundColor = paperBehind(frame);
    frame.classList.add('sp-frame');
    patchOffsets(true);
    block.classList.add('sp-on');
    label(btnOf(block), true);

    var req = frame.requestFullscreen || frame.webkitRequestFullscreen;
    var out = null;
    try { out = req ? req.call(frame) : null; } catch (e) { out = null; req = null; }
    if (!req) pseudo(true);
    else if (out && out.catch) out.catch(function () { if (active && active.frame === frame) pseudo(true); });
    settle();
  }

  function pseudo(on) {
    if (!active) return;
    active.pseudo = on;
    active.frame.classList.toggle('sp-pseudo', on);
    document.documentElement.classList.toggle('sp-scroll-lock', on);
    settle();
  }

  function exit() {
    if (!active) return;
    var a = active;
    active = null;
    if (fullscreenElement() === a.frame) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
    a.hidden.forEach(function (s) { s.removeAttribute('data-sp-hide'); });
    a.path.forEach(function (p) { p.removeAttribute('data-sp-path'); });
    a.frame.classList.remove('sp-frame', 'sp-pseudo');
    if (a.frameStyle == null) a.frame.removeAttribute('style'); else a.frame.setAttribute('style', a.frameStyle);
    a.block.classList.remove('sp-on');
    if ('spMaxWidth' in a.block.dataset) {
      a.block.style.maxWidth = a.block.dataset.spMaxWidth;
      delete a.block.dataset.spMaxWidth;
    }
    a.block.style.zoom = '';
    patchOffsets(false);
    document.documentElement.classList.remove('sp-scroll-lock');
    var btn = btnOf(a.block);
    if (btn) label(btn, false);
    // Let the lesson's canvases resize back, then put the reader where they were.
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(function () {
      if (a.stage) a.col.scrollTop = a.scroll;
      a.block.scrollIntoView({ block: 'nearest' });
    });
  }

  function onFullscreenChange() {
    if (!active || active.pseudo) return;
    if (fullscreenElement() !== active.frame) exit();
    else settle();
  }

  /* ── Fit: narrow the block until it fits the screen's height ──── */
  var settling = false;
  function settle() {
    if (settling) return;
    settling = true;
    // Lessons resize their canvases on window resize, sometimes a frame or a debounce later.
    [0, 120, 350, 800].forEach(function (ms, i, all) {
      setTimeout(function () { fit(); if (i === all.length - 1) settling = false; }, ms);
    });
  }

  // Each pass measures the block at zoom 1, then (a) narrows it toward the screen's shape and
  // (b) zooms it up to fill the screen. Narrowing alone can't enlarge a fixed-height canvas,
  // and zoom alone can't fit a wide one; together they fit both kinds, and zoom also makes
  // the labels readable from the back of the room.
  var MAX_ZOOM = 2.25;
  function fit() {
    if (!active) return;
    var block = active.block;
    var box = active.col;
    if (!('spMaxWidth' in block.dataset)) block.dataset.spMaxWidth = block.style.maxWidth || '';
    var cs = getComputedStyle(box);
    var avail = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var room = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (!(avail > 0) || !(room > 0)) return;
    block.style.zoom = '';
    var r = block.getBoundingClientRect();
    var w = r.width;
    var h = r.height;
    if (!w || !h) return;
    var next = h > avail ? w * avail / h : h * room / avail;
    // Don't narrow a projector sim below 480px; a phone held sideways needs to go narrower.
    next = Math.max(Math.min(avail < 500 ? 280 : 480, room), Math.min(room, Math.floor(next)));
    if (Math.abs(next - w) >= 4) {
      var before = block.style.maxWidth;
      block.style.maxWidth = next + 'px';
      window.dispatchEvent(new Event('resize'));
      r = block.getBoundingClientRect();
      // Narrowing only helps when the canvas shrinks with the width. A fixed-height canvas
      // stays as tall while its controls wrap and grow, so keep whichever shape fits bigger.
      if (Math.min(room / r.width, avail / r.height) >= Math.min(room / w, avail / h)) {
        w = r.width;
        h = r.height;
      } else {
        block.style.maxWidth = before;
        window.dispatchEvent(new Event('resize'));
      }
    }
    // A little slack: canvases can settle a few px taller after the zoom. A block still too
    // tall after narrowing (fixed-height canvases on a short phone screen) zooms down to fit.
    var z = Math.min(room / w, avail / h, MAX_ZOOM) * 0.98;
    active.zoom = z > 1.04 || z < 0.96 ? Math.max(0.5, Math.floor(z * 100) / 100) : 1;
    if (active.zoom !== 1) block.style.zoom = String(active.zoom);
  }

  // Under CSS zoom (up or down), getBoundingClientRect() and clientX stay consistent, but Chrome reports
  // offsetX/offsetY in zoomed pixels while clientWidth stays unzoomed. A few lessons read
  // offsetX as canvas coordinates, so while a block is zoomed, events inside it report them
  // unzoomed. Only patched during a presentation; the original getters go back on exit.
  var offsetPatch = null;
  function patchOffsets(on) {
    var proto = window.MouseEvent && MouseEvent.prototype;
    if (!proto) return;
    if (on && !offsetPatch) {
      offsetPatch = {};
      ['offsetX', 'offsetY'].forEach(function (k) {
        var d = Object.getOwnPropertyDescriptor(proto, k);
        if (!d || !d.get || !d.configurable) return;
        offsetPatch[k] = d;
        Object.defineProperty(proto, k, {
          configurable: true,
          enumerable: d.enumerable,
          get: function () {
            var v = d.get.call(this);
            var t = this.target;
            if (active && active.zoom !== 1 && t && t.closest && t.closest('.sp-on')) return v / active.zoom;
            return v;
          }
        });
      });
    } else if (!on && offsetPatch) {
      Object.keys(offsetPatch).forEach(function (k) { Object.defineProperty(proto, k, offsetPatch[k]); });
      offsetPatch = null;
    }
  }

  /* ── Wiring ───────────────────────────────────────────────────── */
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && active && active.pseudo) exit();
  });
  window.addEventListener('resize', function () { if (active) settle(); });
  window.addEventListener('beforeprint', function () { if (active) exit(); });

  // Sims appear late (tabs, steps, lazily built canvases): look again after DOM changes.
  var rescan = 0;
  function later() {
    if (rescan) return;
    rescan = setTimeout(function () { rescan = 0; if (!active) scan(); }, 900);
  }

  function start() {
    css();
    scan();
    if (window.MutationObserver) {
      // Only added elements can bring a new sim; a readout's text changing every frame can't.
      new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var added = records[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (n.nodeType === 1 && !n.classList.contains('sp-btn') && (n.matches(MEDIA) || n.querySelector(MEDIA))) { later(); return; }
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
    document.addEventListener('click', later, true);
    window.addEventListener('resize', later);
  }

  window.ClassroomOSPresent = { scan: scan, enter: enter, exit: exit };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
