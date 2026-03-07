/* nav-mobile.js — injects a hamburger toggle into .site-header or .topbar */
(function () {
  var ICON_MENU = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    '<rect x="2" y="4"  width="16" height="2" rx="1" fill="currentColor"/>' +
    '<rect x="2" y="9"  width="16" height="2" rx="1" fill="currentColor"/>' +
    '<rect x="2" y="14" width="16" height="2" rx="1" fill="currentColor"/>' +
    '</svg>';

  var ICON_CLOSE = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    '<line x1="4" y1="4"  x2="16" y2="16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    '<line x1="16" y1="4" x2="4"  y2="16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    '</svg>';

  var header = document.querySelector('.site-header') || document.querySelector('.topbar');
  if (!header) return;

  var nav = header.querySelector('.site-nav') || header.querySelector('nav');
  if (!nav) return;

  // Give the nav an id so aria-controls can reference it
  if (!nav.id) nav.id = 'primary-nav';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', nav.id);
  btn.setAttribute('aria-label', 'Open navigation');
  btn.innerHTML = ICON_MENU;

  // Insert just before the nav element inside the flex container
  nav.parentNode.insertBefore(btn, nav);

  function openNav() {
    nav.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close navigation');
    btn.innerHTML = ICON_CLOSE;
  }

  function closeNav() {
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open navigation');
    btn.innerHTML = ICON_MENU;
  }

  btn.addEventListener('click', function () {
    nav.classList.contains('is-open') ? closeNav() : openNav();
  });

  // Close when clicking outside the header
  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) closeNav();
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });
}());
