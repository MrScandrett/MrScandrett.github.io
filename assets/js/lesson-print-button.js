(function () {
  'use strict';

  var script = document.currentScript;
  var styleId = 'lesson-print-button-styles';

  function ensureContrastGuard() {
    if (window.ClassroomOSContrastGuard || document.querySelector('script[data-classroomos-contrast-guard="true"]')) return;
    var guard = document.createElement('script');
    guard.src = script && script.src ? new URL('contrast-guard.js', script.src).href : '/assets/js/contrast-guard.js';
    guard.defer = true;
    guard.dataset.classroomosContrastGuard = 'true';
    document.head.appendChild(guard);
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 220);
  }

  function hasAccessibleName(control) {
    return Boolean(
      cleanText(control.getAttribute('aria-label')) ||
      cleanText(control.getAttribute('aria-labelledby')) ||
      cleanText(control.getAttribute('title')) ||
      (control.labels && control.labels.length)
    );
  }

  function textWithoutControls(element) {
    if (!element) return '';
    var copy = element.cloneNode(true);
    copy.querySelectorAll('input, select, textarea, button, output, script, style').forEach(function (node) {
      node.remove();
    });
    return cleanText(copy.textContent);
  }

  function tableControlName(control) {
    var cell = control.closest('td, th');
    var row = control.closest('tr');
    var table = control.closest('table');
    if (!cell || !row || !table) return '';

    var cells = Array.prototype.slice.call(row.children);
    var column = cells.indexOf(cell);
    var headerRow = table.querySelector('thead tr, tr');
    var header = headerRow && headerRow.children[column];
    var rowContext = cells.slice(0, Math.max(1, column)).map(textWithoutControls).filter(Boolean).join(', ');
    return cleanText([rowContext, textWithoutControls(header)].filter(Boolean).join(' — '));
  }

  function nearbyControlName(control) {
    var tableName = tableControlName(control);
    if (tableName) return tableName;

    var parent = control.parentElement;
    for (var depth = 0; parent && depth < 4; depth += 1, parent = parent.parentElement) {
      var label = parent.querySelector(':scope > label, :scope > [class*="label"], :scope > dt');
      var labelText = textWithoutControls(label);
      if (labelText) return labelText;
    }

    var question = control.closest('[class*="question"], [class*="problem"], [class*="practice"], [class*="challenge"], li');
    if (question) {
      var prompt = question.querySelector('p, h3, h4, legend');
      var promptText = textWithoutControls(prompt);
      if (promptText) return promptText;
    }

    var placeholder = cleanText(control.getAttribute('placeholder'));
    var rawId = cleanText(control.name || control.id);
    var readableId = rawId
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .replace(/\b(ans|answer)\b/gi, 'answer')
      .replace(/\s+/g, ' ')
      .trim();
    return cleanText([readableId, placeholder].filter(Boolean).join(' — ')) || 'Interactive lesson control';
  }

  function enhanceLessonAccessibility(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(function (control) {
      if (!hasAccessibleName(control)) control.setAttribute('aria-label', nearbyControlName(control));
    });

    scope.querySelectorAll('canvas').forEach(function (canvas) {
      if (canvas.hasAttribute('aria-label') || canvas.hasAttribute('aria-labelledby') || canvas.getAttribute('aria-hidden') === 'true') return;
      var region = canvas.closest('section, article, [class*="card"], [class*="panel"], main');
      var heading = region && region.querySelector('h1, h2, h3, h4');
      var subject = textWithoutControls(heading) || cleanText(document.querySelector('h1')?.textContent) || 'lesson';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Interactive visualization for ' + subject + '. Use the nearby controls and text explanation to explore the same concept.');
    });
  }

  if (script && !document.getElementById(styleId)) {
    var stylesheet = document.createElement('link');
    stylesheet.id = styleId;
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('../css/components/lesson-print-button.css', script.src).href;
    document.head.appendChild(stylesheet);
  }
  ensureContrastGuard();

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
    enhanceLessonAccessibility(document);
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

  var accessibilityObserver = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) enhanceLessonAccessibility(node);
      });
    });
  });
  accessibilityObserver.observe(document.documentElement, { childList: true, subtree: true });
}());
