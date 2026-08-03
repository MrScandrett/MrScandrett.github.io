(function () {
  'use strict';

  var script = document.currentScript;
  var styleId = 'lesson-print-button-styles';

  if (script && !document.getElementById(styleId)) {
    var stylesheet = document.createElement('link');
    stylesheet.id = styleId;
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('../css/components/lesson-print-button.css', script.src).href;
    document.head.appendChild(stylesheet);
  }

  function createActions() {
    var wrapper = document.createElement('div');
    wrapper.className = 'lesson-print-actions';
    wrapper.setAttribute('data-no-print', '');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'lesson-print-button';
    button.setAttribute('aria-label', 'Print this lesson or save it as a PDF');
    button.setAttribute('title', 'Print this lesson or save it as a PDF');
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M6 9V3h12v6"></path>' +
        '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>' +
        '<path d="M6 14h12v7H6z"></path>' +
      '</svg>' +
      '<span class="lesson-print-button__full-label">Print / Save PDF</span>' +
      '<span class="lesson-print-button__short-label" aria-hidden="true">Print / PDF</span>';

    var menu = document.createElement('div');
    menu.className = 'lesson-print-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    menu.innerHTML =
      '<button type="button" role="menuitem" data-print-action="print">' +
        '<strong>Print lesson</strong><small>Send this handout to a printer</small>' +
      '</button>' +
      '<button type="button" role="menuitem" data-print-action="pdf">' +
        '<strong>Save as PDF</strong><small>Choose “Save to PDF” in the print window</small>' +
      '</button>';

    function closeMenu() {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }

    button.addEventListener('click', function () {
      menu.hidden = !menu.hidden;
      button.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden) menu.querySelector('button').focus();
    });
    menu.addEventListener('click', function (event) {
      var action = event.target.closest('[data-print-action]');
      if (!action) return;
      closeMenu();
      window.print();
    });
    document.addEventListener('click', function (event) {
      if (!wrapper.contains(event.target)) closeMenu();
    });
    wrapper.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
        button.focus();
      }
    });

    wrapper.appendChild(button);
    wrapper.appendChild(menu);
    return wrapper;
  }

  function placeButton() {
    if (document.querySelector('.lesson-print-actions')) return;

    var navHost =
      document.querySelector('.site-header .nav-wrap') ||
      document.querySelector('.topbar .topbar-inner') ||
      document.querySelector('[class$="-topbar"] [class$="-topbar-inner"]') ||
      document.querySelector('nav[class$="-topbar"], header[class$="-topbar"], div[class$="-topbar"]');
    var actions = createActions();

    if (navHost) {
      navHost.appendChild(actions);
      return;
    }

    var heading = document.querySelector('main h1, body > header h1, h1');
    var heroHost = heading && heading.closest('header, [class~="hero"], [class$="-hero"], [class*="-hero "]');
    if (!heroHost) heroHost = heading && heading.parentElement;

    if (heroHost) {
      heroHost.classList.add('lesson-print-button-host--hero');
      heroHost.appendChild(actions);
      return;
    }

    document.body.insertBefore(actions, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', placeButton, { once: true });
  } else {
    placeButton();
  }
}());
