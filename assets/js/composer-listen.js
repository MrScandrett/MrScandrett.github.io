/* composer-listen.js — the "Listen" recordings player on composer pages.
 * Markup: .fl-player with a <select> whose <option>s carry data-src, data-detail,
 * data-credit and data-source; the first option is already shown in the HTML.
 * Starting a recording pauses any other recording on the page.
 */
(function () {
  'use strict';

  function setup(player) {
    var picker = player.querySelector('select');
    var audio = player.querySelector('audio');
    if (!picker || !audio) return;
    var title = player.querySelector('[data-track-title]');
    var detail = player.querySelector('[data-track-detail]');
    var credit = player.querySelector('[data-track-credit]');
    var source = player.querySelector('[data-track-source]');

    picker.addEventListener('change', function () {
      var o = picker.options[picker.selectedIndex];
      if (!o) return;
      if (title) title.textContent = o.textContent;
      if (detail) detail.textContent = o.getAttribute('data-detail') || '';
      if (credit) credit.textContent = o.getAttribute('data-credit') || '';
      if (source) source.href = o.getAttribute('data-source') || '#';
      audio.src = o.getAttribute('data-src');
      audio.play().catch(function () {});
    });
    audio.addEventListener('play', function () {
      player.classList.add('playing');
      document.querySelectorAll('.fl-player audio').forEach(function (other) { if (other !== audio) other.pause(); });
    });
    audio.addEventListener('pause', function () { player.classList.remove('playing'); });
    audio.addEventListener('ended', function () { player.classList.remove('playing'); });
  }

  function boot() { document.querySelectorAll('.fl-player').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
