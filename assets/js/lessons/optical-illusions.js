/* Optical Illusions Lab: core.
 *
 * Illusions register themselves with OI.add({...}); this file renders them into
 * <div data-oi-gallery="section"> containers as cards.
 *
 * Static illusions (kind 'svg' or 'canvas') are rendered to an <img> inside
 * <figure data-zoomable>, so the shared photo lightbox can enlarge them for the class.
 *   draw(state, val)            svg: returns inner SVG markup
 *   draw(ctx, w, h, state, val) canvas
 *   states: n                   a button cycles through n states (0 = what you first see)
 *   stateLabels: [...]          button text shown while in each state
 *   slider: {label,min,max,value,step,unit}
 *   probe: true|false           Measure button: click two spots to read their exact screen colors
 * Live illusions (kind 'live') build their own DOM in mount(stage, controls, OI).
 */
(function () {
  'use strict';
  if (window.OI) return;

  var NS = 'http://www.w3.org/2000/svg';
  var SECTIONS = ['negative', 'brightness', 'color', 'size', 'lines', 'motion', 'contours', 'ambiguous', 'mind', 'make'];
  /* Cards in these sections get a Measure button (an eyedropper) unless they set probe: false. */
  var PROBE_SECTIONS = ['brightness', 'color'];
  var GUIDE = '#e11d48';
  var OI = window.OI = { list: [], GUIDE: GUIDE, SECTIONS: SECTIONS };

  var references = {
    'mach-bands': 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0026062',
    'whites': 'https://michaelbach.de/ot/lum-white/',
    'cornsweet': 'https://michaelbach.de/ot/lum-cobc/',
    'kanizsa': 'https://michaelbach.de/ot/cog-Kanizsa/',
    'ponzo': 'https://commons.wikimedia.org/wiki/File:Ponzo_illusion.svg',
    'checker-shadow': 'https://persci.mit.edu/gallery/checkershadow',
    'rotating-snakes': 'https://www.ritsumei.ac.jp/~akitaoka/index-e.html'
  };
  OI.add = function (def) { def._order = OI.list.length; def.reference = references[def.id]; OI.list.push(def); };

  /* ---------- SVG string helpers ---------- */
  function attr(extra) { return extra ? ' ' + extra : ''; }
  OI.s = {
    line: function (x1, y1, x2, y2, c, w, x) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="' + (w || 2) + '"' + attr(x) + '/>'; },
    circle: function (cx, cy, r, fill, stroke, w, x) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (fill || 'none') + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (w || 2) + '"' : '') + attr(x) + '/>'; },
    rect: function (x, y, w, h, fill, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (fill || 'none') + '"' + attr(extra) + '/>'; },
    path: function (d, fill, stroke, w, x) { return '<path d="' + d + '" fill="' + (fill || 'none') + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (w || 2) + '" stroke-linejoin="round"' : '') + attr(x) + '/>'; },
    poly: function (pts, fill, stroke, w, x) { return '<polygon points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="' + (fill || 'none') + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (w || 2) + '" stroke-linejoin="round"' : '') + attr(x) + '/>'; },
    text: function (x, y, t, size, fill, anchor, x2) { return '<text x="' + x + '" y="' + y + '" font-family="system-ui,Segoe UI,Arial,sans-serif" font-size="' + (size || 16) + '" font-weight="700" fill="' + (fill || '#111') + '" text-anchor="' + (anchor || 'middle') + '"' + attr(x2) + '>' + t + '</text>'; },
    guide: function (x1, y1, x2, y2) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + GUIDE + '" stroke-width="2.5" stroke-dasharray="7 5"/>'; }
  };
  /* The SVG's natural size is 2x its drawing size so the photo lightbox shows it large and crisp. */
  OI.svgDoc = function (w, h, inner, bg) {
    return '<svg xmlns="' + NS + '" viewBox="0 0 ' + w + ' ' + h + '" width="' + (w * 2) + '" height="' + (h * 2) + '"><rect width="' + w + '" height="' + h + '" fill="' + (bg || '#fff') + '"/>' + inner + '</svg>';
  };
  OI.uri = function (svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); };

  OI.canvas = function (w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  };
  OI.hex = function (r, g, b) {
    function h(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + h(r) + h(g) + h(b);
  };

  /* ---------- fullscreen helper for live demos ---------- */
  OI.fullscreenButton = function (target) {
    if (!target.requestFullscreen) return null;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'oi-btn oi-btn-ghost'; b.textContent = '⛶ Full screen';
    b.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else target.requestFullscreen().catch(function () {});
    });
    return b;
  };

  OI.button = function (label, onClick, cls) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'oi-btn' + (cls ? ' ' + cls : ''); b.textContent = label;
    if (onClick) b.addEventListener('click', onClick);
    return b;
  };

  OI.slider = function (cfg, onInput) {
    var wrap = document.createElement('label');
    wrap.className = 'oi-slider';
    var id = 'oi-sl-' + Math.random().toString(36).slice(2, 8);
    var span = document.createElement('span');
    var input = document.createElement('input');
    input.type = 'range'; input.id = id;
    input.min = cfg.min; input.max = cfg.max; input.step = cfg.step || 1; input.value = cfg.value;
    var out = document.createElement('output');
    function show() { span.textContent = cfg.label + ' '; out.textContent = input.value + (cfg.unit || ''); }
    input.addEventListener('input', function () { show(); onInput(parseFloat(input.value)); });
    show();
    wrap.appendChild(span); wrap.appendChild(input); wrap.appendChild(out);
    wrap.input = input;
    return wrap;
  };

  /* ---------- card building ---------- */
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function plain(html) { return String(html).replace(/<[^>]+>/g, ''); }

  function card(def, n) {
    var el = document.createElement('article');
    el.className = 'oi-card' + (def.wide ? ' oi-wide' : '');
    el.id = 'oi-' + def.id;
    el.innerHTML = '<header class="oi-card-head"><span class="oi-num" aria-hidden="true">' + n + '</span><h3>' + def.title + '</h3></header>'
      + '<p class="oi-provenance">' + (def.teachingModel ? 'Explanatory model · perceptual effect not validated' : 'ClassroomOS reconstruction · perceptual effect not validated')
      + (def.reference ? ' · <a href="' + def.reference + '">Compare with a documented example</a>' : '') + '</p>'
      + '<div class="oi-stage"></div><div class="oi-controls"></div>'
      + (def.why ? '<details class="oi-why"><summary>Why does this work?</summary><div>' + def.why + '</div></details>' : '');
    return el;
  }

  function mountStatic(def, el) {
    var stage = el.querySelector('.oi-stage');
    var controls = el.querySelector('.oi-controls');
    var fig = document.createElement('figure');
    fig.className = 'oi-fig';
    fig.setAttribute('data-zoomable', '');
    fig.setAttribute('data-lightbox-group', 'oi-' + def.sec);
    var img = new Image();
    img.width = def.w; img.height = def.h; img.decoding = 'async';
    img.alt = plain(def.title) + '. ' + plain(def.q);
    var cap = document.createElement('figcaption');
    var box = document.createElement('div');
    box.className = 'oi-imgbox';
    box.appendChild(img); fig.appendChild(box); fig.appendChild(cap); stage.appendChild(fig);

    var state = 0, val = def.slider ? def.slider.value : 0, pending = false;

    function render() {
      pending = false;
      if (def.kind === 'canvas') {
        // Canvas illusions render at 2x for the lightbox. Pixel-exact ones (def.pixel) are drawn at 1x
        // and enlarged without smoothing so every pixel value stays exactly what the lesson says it is.
        var c = OI.canvas(def.w * 2, def.h * 2), cx = c.getContext('2d');
        if (def.pixel) {
          var small = OI.canvas(def.w, def.h);
          def.draw(small.getContext('2d'), def.w, def.h, state, val);
          cx.imageSmoothingEnabled = false; cx.drawImage(small, 0, 0, def.w * 2, def.h * 2);
        } else {
          cx.scale(2, 2); def.draw(cx, def.w, def.h, state, val);
        }
        img.src = c.toDataURL('image/png');
      } else {
        img.src = OI.uri(OI.svgDoc(def.w, def.h, def.draw(state, val), def.bg));
      }
      var truth = (state > 0 && def.a) ? ' <span class="oi-truth">Drawing check: ' + def.a + '</span>' : '';
      var credit = def.credit ? '<span class="oi-credit">' + def.credit + '</span>' : '';
      cap.setAttribute('aria-live', 'polite');
      cap.innerHTML = '<strong>' + def.title + '</strong> ' + def.q + truth + credit;
    }
    function schedule() { if (!pending) { pending = true; requestAnimationFrame(render); } }

    if (def.states) {
      var labels = def.stateLabels || ['Show the evidence', 'Hide the guides'];
      var btn = OI.button(labels[0], function () {
        state = (state + 1) % def.states;
        btn.textContent = labels[Math.min(state, labels.length - 1)] || labels[0];
        btn.setAttribute('aria-pressed', state > 0 ? 'true' : 'false');
        render();
      }, 'oi-btn-main');
      btn.setAttribute('aria-pressed', 'false');
      controls.appendChild(btn);
    }
    if (def.slider) {
      controls.appendChild(OI.slider(def.slider, function (v) { val = v; schedule(); }));
    }
    if (def.probe !== false && (def.probe || PROBE_SECTIONS.indexOf(def.sec) !== -1)) addProbe(el, box, img, controls);
    render();
  }

  /* ---------- Measure: an eyedropper that reads the exact color of the picture ----------
   * Click two spots and their true screen colors appear side by side on a neutral strip,
   * out of context, so the class can see that "different" patches are the same numbers. */
  function luma(c) { return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function addProbe(el, box, img, controls) {
    var on = false, probes = [], sampler = null, samplerSrc = '';
    var cursor = { fx: 0.5, fy: 0.5 };
    var cursorPin = document.createElement('span');
    cursorPin.className = 'oi-probe-pin oi-probe-cursor';
    cursorPin.textContent = '+'; cursorPin.hidden = true;
    box.appendChild(cursorPin);
    function moveCursor() { cursorPin.style.left = (cursor.fx * 100) + '%'; cursorPin.style.top = (cursor.fy * 100) + '%'; }
    moveCursor();
    var out = document.createElement('div');
    out.className = 'oi-probe-out'; out.setAttribute('aria-live', 'polite'); out.hidden = true;
    el.querySelector('.oi-stage').appendChild(out);

    function pixel(fx, fy) {
      try {
        if (samplerSrc !== img.src) {
          sampler = OI.canvas(img.naturalWidth, img.naturalHeight);
          sampler.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
          samplerSrc = img.src;
        }
        var x = Math.min(sampler.width - 1, Math.floor(fx * sampler.width)), y = Math.min(sampler.height - 1, Math.floor(fy * sampler.height));
        var d = sampler.getContext('2d').getImageData(x, y, 1, 1).data;
        return [d[0], d[1], d[2]];
      } catch (err) { return null; }
    }
    function show() {
      box.querySelectorAll('.oi-probe-pin:not(.oi-probe-cursor)').forEach(function (p) { p.remove(); });
      probes.forEach(function (p, i) {
        p.rgb = pixel(p.fx, p.fy);
        var pin = document.createElement('span');
        pin.className = 'oi-probe-pin'; pin.textContent = i ? 'B' : 'A';
        pin.style.left = (p.fx * 100) + '%'; pin.style.top = (p.fy * 100) + '%';
        box.appendChild(pin);
      });
      if (!on && !probes.length) { out.hidden = true; return; }
      out.hidden = false;
      if (!probes.length) { out.innerHTML = '<p class="oi-probe-tip">Click two spots to compare. Keyboard: focus the picture, use arrow keys to move the crosshair (Shift for fine steps), then Enter or Space to sample.</p>'; return; }
      if (probes.some(function (p) { return !p.rgb; })) { out.innerHTML = '<p class="oi-probe-tip">This browser would not let the page read the picture\'s colors. Use the Reveal button instead.</p>'; return; }
      var html = '<div class="oi-probe-strip">' + probes.map(function (p, i) {
        var hex = OI.hex(p.rgb[0], p.rgb[1], p.rgb[2]);
        return '<span class="oi-probe-chip"><span class="oi-probe-sw" style="background:' + hex + '"></span><strong>' + (i ? 'B' : 'A') + '</strong> ' + hex + '<small>rgb(' + p.rgb.join(', ') + ')</small></span>';
      }).join('') + '</div>';
      if (probes.length === 2) {
        var a = probes[0].rgb, b = probes[1].rgb;
        var diff = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
        var la = luma(a), lb = luma(b);
        var verdict = diff === 0 ? 'A and B are <em>exactly</em> the same color on the screen. Any difference you see is made by your brain.'
          : diff <= 3 ? 'A and B differ by only ' + diff + ' out of 255, a small digital difference. Whether it is visible depends on your display and the surrounding context.'
          : (Math.abs(la - lb) < 2 ? 'A and B have similar weighted RGB values but differ in their channels by up to ' + diff + ' out of 255.'
            : (la > lb ? 'A' : 'B') + ' has a higher weighted RGB value, by about ' + Math.round(Math.abs(la - lb)) + ' out of 255. Was that the difference you expected?');
        html += '<p class="oi-probe-verdict">' + verdict + '</p>';
      } else html += '<p class="oi-probe-tip">Now click a second spot (B) to compare.</p>';
      out.innerHTML = html;
    }
    // Capture phase so a measuring click never reaches the photo lightbox.
    box.addEventListener('click', function (e) {
      if (!on || !e.target.closest('img')) return;
      e.preventDefault(); e.stopPropagation();
      var r = img.getBoundingClientRect();
      var p = { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height };
      if (probes.length >= 2) probes = [];
      probes.push(p); show();
    }, true);
    box.addEventListener('keydown', function (e) {
      if (!on || e.target !== img) return;
      var step = e.shiftKey ? 0.002 : 0.02;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].indexOf(e.key) === -1) return;
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Enter' || e.key === ' ') {
        if (probes.length >= 2) probes = [];
        probes.push({ fx: cursor.fx, fy: cursor.fy }); show();
      } else {
        cursor.fx = Math.max(0, Math.min(0.999, cursor.fx + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0)));
        cursor.fy = Math.max(0, Math.min(0.999, cursor.fy + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0)));
        moveCursor();
      }
    });
    img.addEventListener('load', function () { if (probes.length) show(); });
    var btn = OI.button('🎯 Measure', function () {
      on = !on;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? '🎯 Measuring: click the picture' : '🎯 Measure';
      box.classList.toggle('oi-measuring', on);
      cursorPin.hidden = !on;
      if (on) img.focus();
      if (!on) probes = [];
      show();
    }, 'oi-btn-probe');
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'Read the exact color of any spot in the picture';
    controls.appendChild(btn);
  }

  function mountLive(def, el) {
    var stage = el.querySelector('.oi-stage');
    var controls = el.querySelector('.oi-controls');
    stage.classList.add('oi-live');
    def.mount(stage, controls, OI);
    if (!def.noFullscreen) {
      var fs = OI.fullscreenButton(stage);
      if (fs) controls.appendChild(fs);
    }
  }

  function init() {
    var counts = {};
    var order = OI.list.slice().sort(function (a, b) {
      var d = SECTIONS.indexOf(a.sec) - SECTIONS.indexOf(b.sec);
      if (d) return d;
      if (!!a.first !== !!b.first) return a.first ? -1 : 1;
      return a._order - b._order;
    });
    var n = 0;
    order.forEach(function (def) {
      if (def.bare) {
        var bareHost = document.querySelector(def.host);
        n += def.count || 1; counts[def.sec] = (counts[def.sec] || 0) + (def.count || 1);
        try { if (bareHost) def.mount(bareHost, OI); } catch (err) { if (window.console) console.error('OI: failed to build', def.id, err); }
        return;
      }
      var host = document.querySelector('[data-oi-gallery="' + def.sec + '"]');
      if (!host) { if (window.console) console.warn('OI: no gallery for', def.sec); return; }
      n += def.count || 1;
      var el = card(def, n);
      host.appendChild(el);
      try {
        if (def.kind === 'live') mountLive(def, el); else mountStatic(def, el);
      } catch (err) {
        if (window.console) console.error('OI: failed to build', def.id, err);
        el.querySelector('.oi-stage').textContent = 'This demo could not load.';
      }
      counts[def.sec] = (counts[def.sec] || 0) + (def.count || 1);
    });
    document.querySelectorAll('.oi-total').forEach(function (e) { e.textContent = n; });
    OI.total = n;
    document.documentElement.setAttribute('data-oi-ready', String(n));
  }

  /* All sibling scripts execute before DOMContentLoaded, so every illusion has registered by now. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 0);
})();
