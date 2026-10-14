/* Original MusicXML engraving. OSMD 1.9.7 is loaded only when needed. */
(function () {
  'use strict';
  var library;
  var states = new WeakMap();
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
  window.FakeBookArrangement = {
    cancel: function (host) { states.delete(host); host.classList.remove('fb-arrangement'); },
    render: function (host, xml, zoom) {
      var state = {}; states.set(host, state);
      host.classList.add('fb-arrangement');
      host.innerHTML = '<p role="status">Engraving the original arrangement…</p>';
      ensureLibrary().then(function () {
        if (states.get(host) !== state) return;
        host.innerHTML = '<p class="fb-arrangement-note">Original arrangement · source pitch and written repeats. Playback uses the practice controls; select bars in Lead sheet.</p><div class="fb-arrangement-pages"></div>';
        var pages = host.lastElementChild;
        pages.setAttribute('role', 'img'); pages.setAttribute('aria-label', 'Original arrangement with all instrument staves');
        state.renderer = new window.opensheetmusicdisplay.OpenSheetMusicDisplay(pages, { autoResize: false, backend: 'svg', drawTitle: true });
        return state.renderer.load(new DOMParser().parseFromString(xml, 'application/xml')).then(function () {
          if (states.get(host) !== state) return;
          state.renderer.Zoom = Math.max(0.35, Math.min(2, zoom * (host.clientWidth < 600 ? 0.65 : 1)));
          state.renderer.render();
        });
      }).catch(function (error) {
        if (states.get(host) !== state) return;
        host.textContent = 'Could not display the original arrangement. Choose Lead sheet to continue. ' + error.message;
      });
    }
  };
})();
