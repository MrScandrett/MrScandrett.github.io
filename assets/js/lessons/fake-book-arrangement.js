/* Original MusicXML engraving. OSMD 1.9.7 is loaded only when needed. */
(function () {
  'use strict';
  var library;
  var states = new WeakMap();
  var engravingId = 0;
  // Capture the asset URL while this script is executing, before asynchronous imports.
  var assetURL = new URL('../../vendor/opensheetmusicdisplay.min.js', document.currentScript.src).href;
  function ensureLibrary() {
    if (window.opensheetmusicdisplay) return Promise.resolve();
    if (!library) library = new Promise(function (resolve, reject) {
      var script = document.createElement('script'); script.src = assetURL;
      script.onload = resolve;
      script.onerror = function () { library = null; reject(new Error('The notation renderer could not load.')); };
      document.head.appendChild(script);
    });
    return library;
  }
  function cancel(host) {
    var state = states.get(host);
    if (state) {
      clearTimeout(state.timer);
      if (state.observer) state.observer.disconnect();
      if (state.resize) window.removeEventListener('resize', state.resize);
    }
    states.delete(host); host.classList.remove('fb-arrangement');
  }
  function engrave(host, state) {
    if (states.get(host) !== state || !state.ready || !host.clientWidth) return;
    var width = Math.floor(host.clientWidth);
    // Re-engrave at the available width; never scale a desktop page down to a phone.
    // An unusually dense measure may extend beyond this width: keep it scrollable.
    state.pages.style.width = width + 'px';
    state.renderer.Zoom = state.zoom;
    state.renderer.render();
    // OSMD creates a hidden decorative playback-cursor image even in SVG mode.
    state.pages.querySelectorAll('img[id^="cursorImg"]').forEach(function (image) {
      image.alt = ''; image.setAttribute('aria-hidden', 'true');
    });
    // The engraver repeats staff/measure IDs across systems. Namespace each
    // SVG node, preserving any fragment references used by the renderer.
    var prefix = 'fb-original-' + (++engravingId) + '-';
    state.pages.querySelectorAll('svg').forEach(function (svg, pageIndex) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Original score notation, system page ' + (pageIndex + 1) + '. Source pitch, all instrument staves and written repeats.');
      var ids = {}, index = 0;
      svg.querySelectorAll('[id]').forEach(function (node) {
        var old = node.id, id = prefix + pageIndex + '-' + (++index);
        if (!ids[old]) ids[old] = id;
        node.id = id;
      });
      svg.querySelectorAll('*').forEach(function (node) {
        Array.from(node.attributes).forEach(function (attr) {
          var value = attr.value.replace(/url\(#([^)]*)\)/g, function (all, id) { return ids[id] ? 'url(#' + ids[id] + ')' : all; });
          if ((attr.name === 'href' || attr.name === 'xlink:href') && value[0] === '#' && ids[value.slice(1)]) value = '#' + ids[value.slice(1)];
          if (value !== attr.value) node.setAttribute(attr.name, value);
        });
      });
    });
    state.width = width;
    var label = host.querySelector('[data-arrangement-scale]');
    if (label) label.textContent = Math.round(state.zoom * 100) + '%';
  }
  window.FakeBookArrangement = {
    cancel: cancel,
    render: function (host, xml, zoom) {
      zoom = Math.max(0.35, Math.min(2, Number(zoom) || 1));
      var existing = states.get(host);
      if (existing && existing.xml === xml) {
        existing.zoom = zoom;
        engrave(host, existing);
        return;
      }
      cancel(host);
      var state = { xml: xml, zoom: zoom }; states.set(host, state);
      host.classList.add('fb-arrangement');
      host.innerHTML = '<p role="status">Engraving the original arrangement…</p>';
      ensureLibrary().then(function () {
        if (states.get(host) !== state) return;
        host.innerHTML = '<div class="fb-arrangement-toolbar" role="group" aria-label="Original score size"><button type="button" class="fb-btn fb-btn-small" data-arrangement-zoom="out" aria-label="Smaller original score">−</button><output data-arrangement-scale aria-live="polite">100%</output><button type="button" class="fb-btn fb-btn-small" data-arrangement-zoom="in" aria-label="Larger original score">+</button><button type="button" class="fb-btn fb-btn-small" data-arrangement-zoom="reset">Fit width</button></div><details class="fb-arrangement-info"><summary>About this original score</summary><p>Source pitch and written repeats. Playback uses the practice controls; choose Lead sheet to select bars and follow playback. Fit width restores readable notation and wraps systems to the screen.</p></details><div class="fb-arrangement-pages" role="region" tabindex="0" aria-label="Original score with all instrument staves. Use arrow keys to scroll wide passages."></div>';
        state.pages = host.lastElementChild;
        host.querySelector('.fb-arrangement-toolbar').addEventListener('click', function (event) {
          var button = event.target.closest('[data-arrangement-zoom]');
          if (!button || !state.ready) return;
          var action = button.getAttribute('data-arrangement-zoom');
          state.zoom = action === 'reset' ? 1 : Math.max(0.35, Math.min(2, state.zoom + (action === 'in' ? 0.15 : -0.15)));
          engrave(host, state);
          if (action === 'reset') state.pages.scrollLeft = 0;
        });
        state.renderer = new window.opensheetmusicdisplay.OpenSheetMusicDisplay(state.pages, {
          autoResize: false, backend: 'svg', pageFormat: 'Endless',
          drawingParameters: 'compacttight', drawTitle: false,
          // Source page/system breaks describe paper, not the current screen.
          newPageFromXML: false, newSystemFromXML: false
        });
        return state.renderer.load(new DOMParser().parseFromString(xml, 'application/xml')).then(function () {
          if (states.get(host) !== state) return;
          state.ready = true;
          engrave(host, state);
          state.resize = function () {
            if (Math.floor(host.clientWidth) === state.width) return;
            clearTimeout(state.timer);
            state.timer = setTimeout(function () { engrave(host, state); }, 100);
          };
          if (window.ResizeObserver) {
            state.observer = new ResizeObserver(state.resize);
            state.observer.observe(host);
          } else window.addEventListener('resize', state.resize);
        });
      }).catch(function (error) {
        if (states.get(host) !== state) return;
        cancel(host);
        host.textContent = 'Could not display the original arrangement. Choose Lead sheet to continue. ' + error.message;
      });
    }
  };
})();
