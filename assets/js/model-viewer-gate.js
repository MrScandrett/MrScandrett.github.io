/* model-viewer-gate.js — stop <model-viewer> drawing while nobody can see it.
 *
 * model-viewer keeps one requestAnimationFrame loop running for as long as any
 * <model-viewer> is in the document, even one that is far below the fold or
 * has not loaded its model yet (~115 frames/s measured on breadboard-basics).
 * Its loop only stops when every element is disconnected, so this script swaps
 * each viewer for a same-size placeholder while it is more than 200 px off
 * screen (or the tab is hidden) and puts it back when it returns. The element
 * keeps its loaded model, listeners, hotspots and camera, so nothing reloads.
 *
 * Include once per page (it waits for the load event itself):
 *   <script src="../../assets/js/model-viewer-gate.js" defer></script>
 * Opt a viewer out with data-gate="off".
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

  var MARGIN = '200px';
  var slots = [];

  function makeSlot(viewer) {
    var placeholder = document.createElement('div');
    placeholder.className = viewer.className;
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.dataset.modelViewerGate = '';
    var slot = { viewer: viewer, placeholder: placeholder, near: true, attached: true };
    slots.push(slot);
    return slot;
  }

  function busy(viewer) {
    // Never pull a viewer out from under fullscreen or an AR session.
    return document.fullscreenElement === viewer || viewer.hasAttribute('ar-status') && viewer.getAttribute('ar-status') === 'session-started';
  }

  function apply(slot) {
    var want = slot.near && !document.hidden;
    if (want === slot.attached) return;
    if (!want && busy(slot.viewer)) return;
    var from = want ? slot.placeholder : slot.viewer;
    var to = want ? slot.viewer : slot.placeholder;
    if (!from.isConnected) return;
    if (!want) {
      // Hold the viewer's box so the page does not shift while it is away.
      var box = slot.viewer.getBoundingClientRect();
      slot.placeholder.style.width = box.width ? box.width + 'px' : '';
      slot.placeholder.style.height = box.height ? box.height + 'px' : '';
    }
    observer.unobserve(from);
    from.replaceWith(to);
    observer.observe(to);
    slot.attached = want;
  }

  var observer = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var el = entries[i].target;
      for (var j = 0; j < slots.length; j++) {
        if (slots[j].viewer === el || slots[j].placeholder === el) {
          slots[j].near = entries[i].isIntersecting;
          apply(slots[j]);
        }
      }
    }
  }, { rootMargin: MARGIN });

  function init() {
    var viewers = document.querySelectorAll('model-viewer:not([data-gate="off"])');
    for (var i = 0; i < viewers.length; i++) observer.observe(makeSlot(viewers[i]).viewer);
  }

  document.addEventListener('visibilitychange', function () { slots.forEach(apply); });
  document.addEventListener('fullscreenchange', function () { slots.forEach(apply); });
  // Start after load: lesson scripts look their viewers up by id once at startup, and a
  // viewer that is already swapped out would not be found.
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
