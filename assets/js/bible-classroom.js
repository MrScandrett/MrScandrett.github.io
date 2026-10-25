// A lightweight presentation guide for the Bible lesson collection.
// It navigates existing headings and leaves every lesson interaction in place.
(function () {
  'use strict';
  if (document.querySelector('.bcp-guide')) return;
  var main = document.querySelector('main, .cl-page');
  if (!main) return;

  var headings = Array.prototype.filter.call(main.querySelectorAll('h2'), function (heading) {
    return !heading.closest('nav, [hidden], details:not([open])') && heading.getClientRects().length;
  });
  if (headings.length < 2) return;
  headings.forEach(function (heading, index) {
    if (!heading.id) heading.id = 'bcp-section-' + (index + 1);
  });

  var style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('../css/components/bible-classroom.css', document.currentScript.src).href;
  document.head.appendChild(style);

  var guide = document.createElement('nav');
  guide.className = 'bcp-guide';
  guide.setAttribute('aria-label', 'Classroom lesson guide');
  guide.setAttribute('data-no-print', '');
  guide.innerHTML = '<div class="bcp-intro"><span class="bcp-icon" aria-hidden="true">▣</span><div><strong>Classroom guide</strong><small>Move through the lesson together.</small></div></div>' +
    '<div class="bcp-controls"><label class="bcp-picker">Section <select aria-label="Choose lesson section"></select></label>' +
    '<button type="button" class="bcp-prev" aria-label="Previous lesson section">← <span>Previous</span></button>' +
    '<button type="button" class="bcp-next" aria-label="Next lesson section"><span>Next</span> →</button>' +
    '<button type="button" class="bcp-size" aria-pressed="false">Larger text</button>' +
    '<button type="button" class="bcp-present" aria-pressed="false">Present</button>' +
    '<span class="bcp-progress" role="status" aria-live="polite"></span></div>';
  var first = main.querySelector(':scope > .bpl-hero, :scope > .dan-hero, :scope > .prophet-hero, :scope > .bfp-hero, :scope > .gen10-hero') || main.firstElementChild;
  if (first && first.matches('header, section, .bpl-hero, .gen10-hero')) first.after(guide);
  else main.prepend(guide);

  var select = guide.querySelector('select');
  headings.forEach(function (heading, index) {
    var option = document.createElement('option');
    option.value = String(index);
    option.textContent = heading.textContent.trim().replace(/\s+/g, ' ');
    select.appendChild(option);
  });

  var index = 0;
  var presenting = false;
  var focusFrom = null;
  var marked = null;
  var home = document.createComment('Classroom guide position');
  var prev = guide.querySelector('.bcp-prev');
  var next = guide.querySelector('.bcp-next');
  var present = guide.querySelector('.bcp-present');
  var size = guide.querySelector('.bcp-size');
  var progress = guide.querySelector('.bcp-progress');
  function update() {
    select.value = String(index);
    prev.disabled = index === 0;
    next.disabled = index === headings.length - 1;
    progress.textContent = (index + 1) + ' of ' + headings.length;
  }
  function go(to) {
    index = Math.max(0, Math.min(headings.length - 1, to));
    if (marked) marked.classList.remove('bcp-current');
    marked = headings[index];
    marked.classList.add('bcp-current');
    update();
    marked.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  function setPresent(on) {
    presenting = on;
    document.documentElement.classList.toggle('bcp-presenting', on);
    present.setAttribute('aria-pressed', String(on));
    present.textContent = on ? 'Exit presentation' : 'Present';
    if (on) {
      focusFrom = document.activeElement;
      guide.parentNode.insertBefore(home, guide);
      document.body.appendChild(guide);
      go(index);
      next.focus();
    } else {
      if (home.parentNode) home.parentNode.replaceChild(guide, home);
      if (marked) marked.classList.remove('bcp-current');
      marked = null;
      if (focusFrom && focusFrom.isConnected) focusFrom.focus();
    }
  }
  select.addEventListener('change', function () { go(Number(select.value)); });
  prev.addEventListener('click', function () { go(index - 1); });
  next.addEventListener('click', function () { go(index + 1); });
  present.addEventListener('click', function () { setPresent(!presenting); });
  size.addEventListener('click', function () {
    var enlarged = document.documentElement.classList.toggle('bcp-large');
    size.setAttribute('aria-pressed', String(enlarged));
    size.textContent = enlarged ? 'Normal text' : 'Larger text';
  });
  guide.addEventListener('keydown', function (event) {
    if (event.target === select) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); go(index + 1); }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); go(index - 1); }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && presenting) setPresent(false);
  });
  update();
}());
