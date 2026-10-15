/* Music lessons: document navigation without rebuilding instrument state. */
(function () {
  'use strict';
  var main = document.querySelector('main');
  var picker = document.getElementById('musicSection');
  if (!main || !picker) return;
  var sections = Array.from(main.querySelectorAll('[data-route-label]'));
  var location = document.getElementById('musicLocation');
  var returnButton = document.getElementById('musicReturn');
  var lastActivity = null;
  var returning = false;
  function reference(target) { return !!target.closest('.music-reference, .music-resources'); }
  function openParents(target) {
    var parent = target.parentElement;
    while (parent) {
      if (parent.tagName === 'DETAILS') parent.open = true;
      parent = parent.parentElement;
    }
  }
  function go(target, focus) {
    openParents(target);
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (focus) {
      var heading = target.querySelector('h2, h3') || target;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    update();
  }
  function update() {
    var edge = Math.max(document.querySelector('.music-route').getBoundingClientRect().bottom, parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || 0) + 24;
    var available = Array.from(main.querySelectorAll('[data-route-label], [data-reference-label]')).filter(function (s) { return s.checkVisibility(); });
    var active = available.find(function (s) { var r = s.getBoundingClientRect(); return r.top <= edge && r.bottom > edge; });
    if (!active) active = available.find(function (s) { return s.getBoundingClientRect().top > edge; });
    if (!active) return;
    picker.value = active.id;
    location.textContent = active.dataset.routeLabel || active.dataset.referenceLabel;
    if (!reference(active) && !returning) lastActivity = { target: active, offset: window.scrollY };
  }
  function navigate(target) {
    if (reference(target) && lastActivity) returnButton.hidden = false;
    go(target, true);
  }
  picker.addEventListener('change', function () {
    var target = document.getElementById(picker.value);
    if (target) { history.pushState(null, '', '#' + target.id); navigate(target); }
  });
  document.addEventListener('click', function (event) {
    var a = event.target.closest('a[href^="#"]');
    if (!a) return;
    var target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target || !main.contains(target)) return;
    event.preventDefault();
    history.pushState(null, '', '#' + target.id);
    navigate(target);
  });
  returnButton.addEventListener('click', function () {
    if (!lastActivity) return;
    var saved = lastActivity;
    returning = true;
    openParents(saved.target);
    window.scrollTo({ top: saved.offset, behavior: 'instant' });
    var heading = saved.target.querySelector('h2, h3') || saved.target;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    history.pushState(null, '', '#' + saved.target.id);
    returnButton.hidden = true;
    update();
    requestAnimationFrame(function () { returning = false; });
  });
  sections.forEach(function (section, index) {
    var nav = document.createElement('nav');
    nav.className = 'music-section-navigation';
    nav.setAttribute('aria-label', section.dataset.routeLabel + ' navigation');
    [index - 1, index + 1].forEach(function (n) {
      if (!sections[n]) return;
      var a = document.createElement('a');
      a.href = '#' + sections[n].id;
      a.textContent = (n < index ? 'Previous: ' : 'Next: ') + sections[n].dataset.routeLabel;
      nav.appendChild(a);
    });
    var referenceId = main.dataset.musicReference || 'encyclopedia';
    if (referenceId !== section.id) {
      var library = document.createElement('a');
      library.href = '#' + referenceId;
      library.textContent = main.dataset.musicReferenceLabel || 'Chord reference';
      nav.appendChild(library);
    }
    section.appendChild(nav);
  });
  function hash() {
    var target = document.getElementById(window.location.hash.slice(1));
    if (target && main.contains(target)) go(target, false);
  }
  window.addEventListener('hashchange', hash);
  window.addEventListener('popstate', hash);
  var scheduled = false;
  window.addEventListener('scroll', function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { update(); scheduled = false; });
  }, { passive: true });
  main.querySelectorAll('details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.classList.contains('music-reference') && d.open && lastActivity) returnButton.hidden = false;
      if (!d.open && d.classList.contains('music-unit') && d.querySelector('.lesson-section, .fl-card')) {
        var stop = document.getElementById('pcStop') || document.getElementById('studioStop');
        if (stop) stop.click();
        d.querySelectorAll('.se-stop').forEach(function (button) { button.click(); });
        d.querySelectorAll('audio').forEach(function (audio) { audio.pause(); });
      }
      update();
      if (d.open) window.dispatchEvent(new Event('resize'));
    });
  });
  hash();
  update();
})();
