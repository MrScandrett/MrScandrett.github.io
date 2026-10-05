/* Video embeds for lessons: every video plays inside ClassroomOS's own player.
 *
 * Usage: <script src="../../assets/js/video-embed.js"></script> (path relative to the lesson),
 * then put a figure where the video goes:
 *
 *   <figure data-video="pale-blue-dot"></figure>                    a slug from data/video-library.json
 *   <figure data-video="https://youtu.be/fn3KWM1kuAw"               or any allow-listed link
 *           data-title="Boston Dynamics — Do You Love Me? (2020)"
 *           data-start="0:20" data-end="1:45">                      optional clip
 *     <p data-chapter="0:52">Spot joins in</p>                      optional chapter jumps
 *     <p data-pause="1:10">Which moves need balance feedback?</p>   optional: stops the video and asks
 *     <figcaption>Caption under the player.</figcaption>
 *   </figure>
 *
 * Nothing loads from YouTube/Vimeo until someone presses play. Allowed sources and the
 * safety rules live in assets/js/video-sources.mjs; watch.html builds this markup for you.
 * Figures added later (rendered by JS) are picked up automatically.
 */
(function () {
  'use strict';
  if (window.ClassroomVideo) return;
  var me = document.currentScript;
  var root = new URL('../../', me ? me.src : location.href);

  if (!document.querySelector('link[data-vp-css]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('assets/css/video-player.css', root).href;
    link.setAttribute('data-vp-css', '');
    document.head.appendChild(link);
  }

  var engine = import(new URL('assets/js/video-player.mjs', root).href);

  function mountAll(scope) {
    var nodes = (scope || document).querySelectorAll('[data-video]:not([data-vp-mounted])');
    if (!nodes.length) return;
    engine.then(function (m) {
      nodes.forEach(function (node) { m.mountFromElement(node); });
    }).catch(function (err) {
      console.error('[video-embed] player failed to load', err);
    });
  }

  window.ClassroomVideo = { mount: mountAll, engine: engine };

  function start() {
    mountAll(document);
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].addedNodes.length) { mountAll(document); return; }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
