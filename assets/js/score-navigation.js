/* Shared measure selection, fit and navigation for engraved score libraries. */
(function (root) {
  'use strict';
  root.ScoreNavigation = function (options) {
    var surface = options.surface, selected = 0, fit = 'width', following = true, active = -1;
    var nav = document.createElement('div'); nav.className = 'score-navigation';
    nav.setAttribute('role', 'group'); nav.setAttribute('aria-label', 'Sheet music navigation');
    nav.innerHTML = '<button type="button" data-step="-1" aria-label="Previous measure">←</button><label>Start at <select aria-label="Playback start measure"></select></label><button type="button" data-step="1" aria-label="Next measure">→</button><label>View <select data-fit aria-label="Score fit"><option value="width">Fit width</option><option value="page">Fit screen</option></select></label><label><input type="checkbox" checked> Follow playback</label><p role="status">Click any measure, then press Play. Use the arrows to practice a phrase.</p>';
    surface.parentNode.insertBefore(nav, surface);
    var select = nav.querySelector('select'), message = nav.querySelector('p');
    function measures() { return Array.from(surface.querySelectorAll(options.selector)); }
    function label(i) { return options.label ? options.label(i) : 'Measure ' + (i + 1); }
    function paint() {
      measures().forEach(function (m, i) { m.classList.toggle('score-primed', i === selected); });
      select.value = String(selected);
      nav.querySelector('[data-step="-1"]').disabled = selected === 0;
      nav.querySelector('[data-step="1"]').disabled = selected >= measures().length - 1;
    }
    function choose(i) {
      var bars = measures(); if (!bars.length) return;
      selected = Math.max(0, Math.min(bars.length - 1, i));
      options.prime(selected, bars[selected]); paint();
      message.textContent = label(selected) + ' ready — press Play to start here.';
      bars[selected].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function setFollow(on) { following = on; active = -1; nav.querySelector('input').checked = on; }
    function resize() {
      var svg = surface.querySelector('svg'); if (!svg) return;
      var box = svg.viewBox.baseVal;
      if (fit === 'page' && box.height) {
        var available = Math.max(180, root.innerHeight - nav.getBoundingClientRect().height - 180);
        svg.style.width = Math.min(surface.clientWidth, available * box.width / box.height) + 'px';
      } else svg.style.removeProperty('width');
      svg.style.height = 'auto'; svg.style.marginInline = 'auto';
    }
    function refresh() {
      var bars = measures(); select.replaceChildren();
      bars.forEach(function (_, i) { var o = document.createElement('option'); o.value = i; o.textContent = label(i); select.appendChild(o); });
      if (options.selectedIndex) selected = options.selectedIndex(bars);
      selected = Math.min(Math.max(0, selected), Math.max(0, bars.length - 1)); paint(); resize();
    }
    surface.addEventListener('click', function (e) {
      if (e.shiftKey || e.altKey) return;
      var i = measures().findIndex(function (m) { var r = m.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
      if (i < 0) return;
      e.preventDefault(); e.stopImmediatePropagation(); choose(i);
    }, true);
    nav.addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (b) choose(selected + Number(b.dataset.step)); });
    select.addEventListener('change', function () { choose(Number(select.value)); });
    nav.querySelector('[data-fit]').addEventListener('change', function (e) { fit = e.target.value; resize(); });
    nav.querySelector('input').addEventListener('change', function (e) { setFollow(e.target.checked); if (options.onFollow) options.onFollow(e.target.checked); });
    (surface.closest('.ll-sim') || surface).addEventListener('wheel', function () { setFollow(false); }, { passive: true });
    (surface.closest('.ll-sim') || surface).addEventListener('touchmove', function () { setFollow(false); }, { passive: true });
    root.addEventListener('resize', resize);
    return { refresh: refresh, setFollow: setFollow, reset: function () { selected = 0; paint(); message.textContent = 'Click any measure, then press Play.'; }, follow: function (i) {
      if (active === i) return; active = i;
      var bars = measures(); bars.forEach(function (m, j) { m.classList.toggle('score-current', i === j); });
      if (following && bars[i]) bars[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } };
  };
})(window);
