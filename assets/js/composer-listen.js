/* composer-listen.js — the "Listen" recordings player on composer pages.
 * Markup: .fl-player with a <select> whose <option>s carry data-src, data-detail,
 * data-credit and data-source; the first option is already shown in the HTML.
 * Starting a recording pauses any other recording on the page.
 */
(function () {
  'use strict';

  function wikimediaFallback(src) {
    if (!src || src.indexOf('/commons/transcoded/') === -1) return '';
    return src.replace('/commons/transcoded/', '/commons/').replace(/\/(?:[^/]+)\.(?:mp3|ogg|flac)(?:\?.*)?$/i, '');
  }

  function setup(player) {
    var picker = player.querySelector('select');
    var audio = player.querySelector('audio');
    if (!picker || !audio) return;
    var title = player.querySelector('[data-track-title]');
    var detail = player.querySelector('[data-track-detail]');
    var credit = player.querySelector('[data-track-credit]');
    var source = player.querySelector('[data-track-source]');
    var status = player.querySelector('[data-track-status]');
    if (!status) {
      status = document.createElement('p');
      status.className = 'fl-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      player.appendChild(status);
    }

    var triedFallback = false;
    var selfInitiating = false;
    var wantsPlay = false;
    var currentOption = function () { return picker.options[picker.selectedIndex] || null; };

    if (window.AudioKit && window.AudioKit.onStop) {
      window.AudioKit.onStop(function () {
        if (!selfInitiating && !audio.paused) audio.pause();
      });
    }

    picker.addEventListener('change', function () {
      var o = currentOption();
      if (!o) return;
      var wasPlaying = !audio.paused;
      wantsPlay = wasPlaying;
      triedFallback = false;
      status.textContent = '';
      if (title) title.textContent = o.textContent;
      if (detail) detail.textContent = o.getAttribute('data-detail') || '';
      if (credit) credit.textContent = o.getAttribute('data-credit') || '';
      if (source) source.href = o.getAttribute('data-source') || '#';
      audio.src = o.getAttribute('data-src') || '';
      audio.load();
      if (wasPlaying) {
        status.textContent = 'Loading recording…';
        audio.play().catch(function () {
          wantsPlay = false;
          status.textContent = 'Press Play to listen to this recording.';
        });
      }
    });

    audio.addEventListener('play', function () {
      wantsPlay = true;
      player.classList.add('playing');
      status.textContent = '';
      document.querySelectorAll('audio, video').forEach(function (other) {
        if (other !== audio && !other.paused) {
          try { other.pause(); } catch (_e) {}
        }
      });
      if (window.AudioKit && window.AudioKit.stopAll) {
        selfInitiating = true;
        try { window.AudioKit.stopAll(); } finally { selfInitiating = false; }
      }
    });
    audio.addEventListener('playing', function () { status.textContent = ''; });
    audio.addEventListener('waiting', function () { if (!audio.paused) status.textContent = 'Buffering recording…'; });
    audio.addEventListener('pause', function () { wantsPlay = false; player.classList.remove('playing'); });
    audio.addEventListener('ended', function () { wantsPlay = false; player.classList.remove('playing'); });
    audio.addEventListener('error', function () {
      player.classList.remove('playing');
      var o = currentOption();
      var rawSrc = o ? o.getAttribute('data-src') : audio.src;
      var fb = wikimediaFallback(rawSrc);
      if (!triedFallback && fb && fb !== audio.src) {
        triedFallback = true;
        audio.src = fb;
        audio.load();
        if (wantsPlay) {
          status.textContent = 'Trying original archive file…';
          audio.play().catch(function () {
            wantsPlay = false;
            status.textContent = 'Press Play to retry this recording.';
          });
        }
        return;
      }
      wantsPlay = false;
      status.textContent = 'This recording could not load. Use the Wikimedia link above or try another track.';
    });
  }

  function boot() { document.querySelectorAll('.fl-player').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
