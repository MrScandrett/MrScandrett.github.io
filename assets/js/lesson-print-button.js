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

  function loadRelatedLinks() {
    if (document.querySelector('script[data-lesson-related="true"]')) return;
    var related = document.createElement('script');
    related.src = script && script.src ? new URL('lesson-related.js', script.src).href : '/assets/js/lesson-related.js';
    related.defer = true;
    related.dataset.lessonRelated = 'true';
    document.head.appendChild(related);
  }

  function loadExhibitLinks() {
    if (document.querySelector('script[data-lesson-exhibits="true"]')) return;
    var exhibits = document.createElement('script');
    exhibits.src = script && script.src ? new URL('lesson-exhibits.js', script.src).href : '/assets/js/lesson-exhibits.js';
    exhibits.defer = true;
    exhibits.dataset.lessonExhibits = 'true';
    document.head.appendChild(exhibits);
  }

  function loadSiteGlossary() {
    if (window.ClassroomOSGlossary
      || document.querySelector('script[data-classroomos-glossary="true"]')
      || document.querySelector('script[src*="site-glossary.js"]')) return;
    var glossary = document.createElement('script');
    glossary.src = script && script.src ? new URL('site-glossary.js', script.src).href : '/assets/js/site-glossary.js';
    glossary.defer = true;
    glossary.dataset.classroomosGlossary = 'true';
    document.head.appendChild(glossary);
  }

  // Heart, Save answers and lesson history (see visitor-memory.js). Many lessons have
  // no site nav, so nav-mobile.js can't be relied on to load it here.
  function loadVisitorMemory() {
    if (window.ClassroomOSMemory || document.querySelector('script[data-visitor-memory="true"]')) return;
    var memory = document.createElement('script');
    memory.src = script && script.src ? new URL('visitor-memory.js', script.src).href : '/assets/js/visitor-memory.js';
    memory.defer = true;
    memory.dataset.visitorMemory = 'true';
    document.head.appendChild(memory);
  }

  // VR headset mode (vr-mode.js): lessons are where students use the sims from a headset.
  function loadVrMode() {
    if (window.ClassroomOSVR || document.querySelector('script[data-vr-mode-script="true"]')) return;
    var vr = document.createElement('script');
    vr.src = script && script.src ? new URL('vr-mode.js', script.src).href : '/assets/js/vr-mode.js';
    vr.defer = true;
    vr.dataset.vrModeScript = 'true';
    document.head.appendChild(vr);
  }

  // Shared timeline engine (timeline.js): any lesson list marked data-timeline.
  function loadTimeline() {
    if (window.ClassroomOSTimeline || document.querySelector('script[src$="/timeline.js"]') ||
      !document.querySelector('[data-timeline], ol[class*="timeline"], ul[class*="timeline"], div[class*="timeline"]')) return;
    var timeline = document.createElement('script');
    timeline.src = script && script.src ? new URL('timeline.js', script.src).href : '/assets/js/timeline.js';
    timeline.defer = true;
    document.head.appendChild(timeline);
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
  loadRelatedLinks();
  loadExhibitLinks();
  loadVisitorMemory();
  loadVrMode();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadTimeline);
  else loadTimeline();
  // Wait for parsing to finish so a lesson's own site-glossary.js tag (often
  // placed after this script, with its own data-glossary-src) wins over the
  // shared default glossary.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteGlossary, { once: true });
  } else {
    loadSiteGlossary();
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
      '<span class="lesson-print-button__short-label" aria-hidden="true">Print / PDF</span>' +
      '<span class="lesson-print-button__compact-label" aria-hidden="true">Print</span>';

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

  /* Page-break planning for paper. CSS alone can't tell a small card from a
     page-sized one, so just before printing we estimate each box's printed
     height and mark it:
       data-print-keep      small box (< 1/3 page) — never split it, so a card
                            doesn't leave one stray line on the next page
       data-print-split     large box (> 1/2 page) — let it flow across pages
                            instead of being pushed whole and leaving a
                            half-empty page behind
       data-print-with-next short label above a heading (eyebrow, step tag) —
                            keep it on the same page as the heading
     Rules live in lesson-print-button.css; everything is removed after printing. */
  var PRINT_PAGE_H = 937;  // letter page minus lesson-print.css margins, in CSS px
  var PRINT_PAGE_W = 694;
  var PRINT_MEDIA = 'img, canvas, svg, video, iframe, model-viewer, picture';
  var PRINT_SKIP = 'script, style, template, noscript, [data-no-print], .lesson-print-actions, ' +
    '.skip-link, .site-header, .site-footer, .ll-topbar, .ll-panel-head, .ll-lesson-steps, .ll-toast-region, .te-topbar';
  var PRINT_ATOMIC = 'figure, img, tr, [data-zoomable]';
  var printMarks = [];

  function printMark(element, name) {
    if (element.hasAttribute(name)) return;
    element.setAttribute(name, '');
    printMarks.push([element, name]);
  }

  function shownInPrint(element, style) {
    if (style.display !== 'none') return true;
    // Application-shell panes are hidden on screen but printed as study notes.
    return Boolean(element.closest('.ll-panel, .ll-pane'));
  }

  function verticalChrome(style) {
    return (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0) +
      (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0) +
      Math.min(24, (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0));
  }

  function mediaHeight(element, width) {
    var rect = element.getBoundingClientRect();
    var w = rect.width || parseFloat(element.getAttribute('width')) || element.naturalWidth || 600;
    var h = rect.height || parseFloat(element.getAttribute('height')) || element.naturalHeight || 300;
    if (w < 64 && h < 64) return h; // inline icon
    return Math.min(566, Math.min(width, w) * (h / w)) + 8; // lesson-print.css caps media at 5.9in
  }

  function textLines(text, width, style) {
    var length = text.replace(/\s+/g, ' ').trim().length;
    if (!length) return 0;
    var size = Math.min(32, Math.max(10, parseFloat(style.fontSize) || 16)) * 0.875; // print body is 10.5pt
    return Math.ceil((length * size * 0.5) / Math.max(120, width)) * size * 1.45;
  }

  function columnCount(element, style, width) {
    if (style.display.indexOf('grid') !== -1) {
      var tracks = style.gridTemplateColumns.split(' ').map(parseFloat).filter(function (n) { return n > 0; });
      if (tracks.length > 1) return Math.max(1, Math.min(tracks.length, Math.floor(width / Math.max(140, tracks[0]))));
    }
    if (style.display.indexOf('flex') !== -1 && style.flexDirection.indexOf('row') === 0) {
      var kids = Array.prototype.filter.call(element.children, function (child) { return child.getClientRects().length; });
      if (kids.length > 1) {
        var top = kids[0].getBoundingClientRect().top;
        var perRow = kids.filter(function (child) { return Math.abs(child.getBoundingClientRect().top - top) < 4; }).length;
        return Math.max(1, Math.min(perRow, style.flexWrap === 'nowrap' ? perRow : Math.floor(width / 140)));
      }
    }
    return 1;
  }

  // Estimated printed height of an element at a given printed width, recording
  // each element's estimate so the marking pass can reuse it.
  function estimatePrint(element, width, sizes) {
    if (element.matches(PRINT_SKIP)) return 0;
    var style = getComputedStyle(element);
    if (!shownInPrint(element, style) || style.position === 'fixed') return 0;
    if (element.matches(PRINT_MEDIA)) return mediaHeight(element, width);

    var children = Array.prototype.filter.call(element.children, function (child) {
      return !/^inline/.test(getComputedStyle(child).display) || child.matches(PRINT_MEDIA);
    });
    var height = verticalChrome(style);
    if (!children.length) {
      height += textLines(element.textContent, width, style);
    } else {
      var looseText = Array.prototype.filter.call(element.childNodes, function (node) {
        return node.nodeType === 3 || (node.nodeType === 1 && children.indexOf(node) === -1);
      }).map(function (node) { return node.textContent; }).join(' ');
      height += textLines(looseText, width, style);
      var cols = columnCount(element, style, width);
      var colWidth = width / cols;
      for (var i = 0; i < children.length; i += cols) {
        var row = 0;
        for (var j = i; j < Math.min(children.length, i + cols); j += 1) {
          row = Math.max(row, estimatePrint(children[j], colWidth, sizes));
        }
        height += row;
      }
    }
    sizes.set(element, height);
    return height;
  }

  function isBox(element, style) {
    if (element.matches('figure, table, pre, blockquote, details, fieldset, aside, [class*="card"], [class*="callout"], [class*="box"]')) return true;
    var hasFill = style.backgroundImage !== 'none' ||
      (style.backgroundColor !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(style.backgroundColor));
    var hasBorder = ['Top', 'Right', 'Bottom', 'Left'].filter(function (side) {
      return parseFloat(style['border' + side + 'Width']) > 0 && style['border' + side + 'Style'] !== 'none';
    }).length >= 2;
    return hasFill || hasBorder;
  }

  function planPrintBreaks() {
    var root = document.querySelector('main') || document.body;
    var sizes = new Map();
    estimatePrint(root, PRINT_PAGE_W, sizes);

    sizes.forEach(function (height, element) {
      if (element === root || element === document.body) return;
      var style = getComputedStyle(element);
      if (height > PRINT_PAGE_H * 0.5) {
        // A big figure stays whole unless it can break somewhere sensible: between
        // a stack of images (a photo strip), or between the image and a long
        // write-up under it (a score with notes) — the image keeps its first line.
        var media = Array.prototype.filter.call(element.querySelectorAll(PRINT_MEDIA), function (item) {
          return !item.parentElement.closest(PRINT_MEDIA) && mediaHeight(item, PRINT_PAGE_W) > 60; // not icons
        });
        var divisible = !element.matches('[data-video]') && (media.length > 2 ||
          (media.length && element.textContent.trim().length > 250));
        if (!element.matches(PRINT_ATOMIC) || height > PRINT_PAGE_H * 0.9 || divisible) {
          printMark(element, 'data-print-split');
          if (element.matches(PRINT_ATOMIC)) {
            media.forEach(function (item) { printMark(item, 'data-print-with-next'); });
          }
        }
      } else if (isBox(element, style) && element.textContent.trim()) {
        // Cards side by side in a row move as a row, so only short ones are held together.
        var parent = element.parentElement;
        var inRow = parent && columnCount(parent, getComputedStyle(parent), PRINT_PAGE_W) > 1;
        if (height < PRINT_PAGE_H * (inRow ? 0.2 : 0.33)) printMark(element, 'data-print-keep');
      }
    });

    // A grid/flex row holding a page-sized panel: Chrome can push the whole row
    // past a blank page. Stack the panels instead; on paper they read better
    // one under the other anyway.
    sizes.forEach(function (height, element) {
      if (height <= PRINT_PAGE_H * 0.8 || !element.parentElement || element.matches(PRINT_ATOMIC)) return;
      var parent = element.parentElement;
      var display = getComputedStyle(parent).display;
      // Only side-by-side panels; a card grid stays a grid.
      if (parent !== root && /grid|flex/.test(display) && parent.children.length <= 3 &&
        columnCount(parent, getComputedStyle(parent), PRINT_PAGE_W) > 1) printMark(parent, 'data-print-stack');
    });

    // The closing padding of the last boxes can spill onto a sheet of its own.
    for (var tail = root; tail; tail = lastPrinted(tail)) printMark(tail, 'data-print-tail');

    // Keep eyebrows, step tags and section numbers on the page with their heading.
    root.querySelectorAll('h1, h2, h3, h4').forEach(function (heading) {
      var node = heading;
      for (var depth = 0; node && node !== root && depth < 3; depth += 1) {
        var previous = node.previousElementSibling;
        for (var labels = 0; previous && labels < 2 && previous.textContent.trim().length <= 80 &&
          !previous.querySelector(PRINT_MEDIA) && !previous.matches('h1, h2, h3, h4, ' + PRINT_MEDIA); labels += 1) {
          printMark(previous, 'data-print-with-next');
          previous = previous.previousElementSibling;
        }
        if (previous) break; // reached real content; otherwise climb past the wrapper
        node = node.parentElement;
      }
      // A heading (with its intro line) that ends its wrapper, e.g. a section-head
      // div followed by a figure: the break to avoid is after the wrapper.
      var inner = heading;
      for (var level = 0; inner.parentElement && inner.parentElement !== root && level < 3; level += 1) {
        var wrapper = inner.parentElement;
        if (isBox(wrapper, getComputedStyle(wrapper))) break; // a card: keep-together handles it
        var after = Array.prototype.slice.call(wrapper.children, Array.prototype.indexOf.call(wrapper.children, inner) + 1);
        if (after.some(function (sibling) {
          return sibling.textContent.trim().length > 200 || sibling.matches(PRINT_MEDIA) || sibling.querySelector(PRINT_MEDIA);
        })) break;
        printMark(wrapper, 'data-print-with-next');
        inner = wrapper;
      }
    });
  }

  function lastPrinted(element) {
    for (var child = element.lastElementChild; child; child = child.previousElementSibling) {
      if (child.matches(PRINT_SKIP)) continue;
      var style = getComputedStyle(child);
      if (shownInPrint(child, style) && style.position !== 'fixed' && style.position !== 'absolute') return child;
    }
    return null;
  }

  function clearPrintBreaks() {
    printMarks.forEach(function (mark) { mark[0].removeAttribute(mark[1]); });
    printMarks = [];
  }

  /* Ink saver. Paper is white, so: print in the Day theme even when a dark
     theme is on; repaint dark-filled boxes that hold text (terminals, dark
     callouts, dark heroes) as light boxes with a hairline border; and darken any
     light text that would land on white paper, keeping its hue so syntax colours
     and accents still read. Photos, canvases and textless swatches keep their
     colours — they are the content. Undone after printing. */
  var printThemeRestore = null;
  var printColorRestore = [];

  function parseColor(value) {
    var m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var parts = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }

  function luminance(c) {
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  }

  // Is the box filled with a colour darker than `limit` (0 black … 1 white)?
  function darkFill(style, limit) {
    limit = limit || 0.4;
    var bg = parseColor(style.backgroundColor);
    if (bg && bg.a >= 0.5 && luminance(bg) < limit) return true;
    if (style.backgroundImage.indexOf('gradient') === -1) return false;
    var stops = style.backgroundImage.match(/rgba?\([^)]+\)/g) || [];
    var opaque = stops.map(parseColor).filter(function (c) { return c && c.a >= 0.5; });
    if (!opaque.length) return false;
    return opaque.reduce(function (sum, c) { return sum + luminance(c); }, 0) / opaque.length < limit;
  }

  function printColor(c) {
    // Same hue, lightness pulled down to ~30% so it reads on white.
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return 'hsl(' + Math.round(h * 360) + ', ' + Math.round(Math.min(s, 0.85) * 100) + '%, 30%)';
  }

  function printInDayTheme() {
    var html = document.documentElement;
    var registry = window.ClassroomOSThemeRegistry;
    var theme = html.dataset.theme;
    if (!theme || !registry || !registry.isDark(theme)) return;
    var keys = ['theme', 'lighting'];
    var saved = { html: {}, body: {}, site: html.getAttribute('data-site-theme'), scheme: html.style.colorScheme };
    keys.forEach(function (key) {
      saved.html[key] = html.dataset[key];
      saved.body[key] = document.body.dataset[key];
      html.dataset[key] = 'day';
      document.body.dataset[key] = 'day';
    });
    html.setAttribute('data-site-theme', 'day');
    html.style.colorScheme = 'light';
    printThemeRestore = function () {
      keys.forEach(function (key) {
        if (saved.html[key] != null) html.dataset[key] = saved.html[key];
        if (saved.body[key] != null) document.body.dataset[key] = saved.body[key];
      });
      if (saved.site != null) html.setAttribute('data-site-theme', saved.site);
      html.style.colorScheme = saved.scheme;
    };
  }

  function saveInk() {
    printInDayTheme();
    var all = document.body.querySelectorAll('*');

    // 1. Dark boxes that carry text become light boxes.
    Array.prototype.forEach.call(all, function (element) {
      if (element.matches(PRINT_MEDIA + ', ' + PRINT_SKIP) || element.closest('svg, .vp')) return;
      var style = getComputedStyle(element);
      if (!darkFill(style) || !element.textContent.trim()) return;
      var rect = element.getBoundingClientRect();
      if (rect.width * rect.height < 2500 && element.textContent.trim().length < 40) return; // badges, pills
      printMark(element, 'data-print-ink-saver');
    });

    // 2. Light text that will sit on white paper is darkened (hue kept).
    Array.prototype.forEach.call(all, function (element) {
      if (element.matches(PRINT_MEDIA) || element.closest('svg')) return;
      var hasText = Array.prototype.some.call(element.childNodes, function (node) {
        return node.nodeType === 3 && node.textContent.trim();
      });
      if (!hasText && !element.matches('input, select, textarea, button')) return;
      var color = parseColor(getComputedStyle(element).color);
      if (!color || luminance(color) < 0.6) return;
      // Leave it if it still sits on a colour on paper (a button, a swatch, an image tile).
      for (var node = element; node && node !== document.body; node = node.parentElement) {
        if (node.hasAttribute('data-print-ink-saver')) break;
        var style = getComputedStyle(node);
        if (darkFill(style, 0.75) || /url\(/.test(style.backgroundImage)) return;
      }
      printColorRestore.push([element, element.style.getPropertyValue('color'), element.style.getPropertyPriority('color')]);
      element.style.setProperty('color', printColor(color), 'important');
    });
  }

  function restoreInk() {
    printColorRestore.forEach(function (entry) {
      if (entry[1]) entry[0].style.setProperty('color', entry[1], entry[2]);
      else entry[0].style.removeProperty('color');
    });
    printColorRestore = [];
    if (printThemeRestore) printThemeRestore();
    printThemeRestore = null;
  }

  // Scroll-triggered fade-ins (.reveal and friends) that were never scrolled to
  // would print as blank pages. Tooltips and popovers are positioned out of flow,
  // so only in-flow blocks with text are revealed.
  function revealFadedContent() {
    var root = document.querySelector('main') || document.body;
    Array.prototype.forEach.call(root.querySelectorAll('*'), function (element) {
      if (element.closest('[data-print-reveal], svg') || !element.textContent.trim()) return;
      var style = getComputedStyle(element);
      if (parseFloat(style.opacity) > 0.05 || style.display === 'none' || style.visibility === 'hidden') return;
      if (style.position === 'absolute' || style.position === 'fixed' || element.closest('[aria-hidden="true"], [hidden]')) return;
      printMark(element, 'data-print-reveal');
    });
  }

  // Sideways scrollers (chord ladders, card carousels, timelines) hide whatever
  // is off to the right on paper, and Chrome shrinks the whole printout to fit
  // their scroll width. Let flex rows wrap into a grid of cards instead.
  var PRINT_FIT_W = 640; // paper width less room for the padding of enclosing cards
  var printZoomRestore = [];

  function unrollScrollers() {
    Array.prototype.forEach.call(document.body.querySelectorAll('*'), function (element) {
      // Wider than the paper, even if it fits the screen.
      if (element.scrollWidth <= Math.min(element.clientWidth, PRINT_FIT_W) + 4) return;
      var style = getComputedStyle(element);
      if (!/auto|scroll/.test(style.overflowX) || style.display.indexOf('flex') === -1 ||
        style.flexDirection.indexOf('row') !== 0) return;
      printMark(element, 'data-print-wrap');
    });
  }

  // Fixed-width pieces (a timeline with min-width: 848px, an 860px staff, a
  // channel strip) can't reflow; scale them to the paper instead of letting
  // Chrome scale every page of the lesson.
  function fitWideContent() {
    Array.prototype.forEach.call(document.body.querySelectorAll('*'), function (element) {
      if (element.matches(PRINT_SKIP) || element.closest('[data-print-wrap] > *') ||
        (element.parentElement && element.parentElement.closest('svg'))) return;
      var style = getComputedStyle(element);
      if (style.display === 'none' || style.position === 'fixed') return;
      var parent = element.parentElement ? getComputedStyle(element.parentElement) : null;
      var inScroller = parent && /auto|scroll/.test(parent.overflowX);
      var width = Math.max(parseFloat(style.minWidth) || 0, inScroller ? element.scrollWidth : 0);
      if (width <= PRINT_FIT_W) return;
      if (element.parentElement && element.parentElement.closest('[data-print-zoom]')) return; // already scaled
      element.style.setProperty('--print-zoom', String(Math.max(0.4, PRINT_FIT_W / width).toFixed(3)));
      printZoomRestore.push(element);
      printMark(element, 'data-print-zoom');
    });
  }

  function restoreZoom() {
    printZoomRestore.forEach(function (element) { element.style.removeProperty('--print-zoom'); });
    printZoomRestore = [];
  }

  function prepareForPrint() {
    restoreAfterPrint();
    revealFadedContent();
    unrollScrollers();
    fitWideContent();
    saveInk();
    planPrintBreaks();
  }

  function restoreAfterPrint() {
    restoreZoom();
    restoreInk();
    clearPrintBreaks();
  }

  window.addEventListener('beforeprint', prepareForPrint);
  window.addEventListener('afterprint', restoreAfterPrint);
  window.ClassroomOSPrint = { prepare: prepareForPrint, restore: restoreAfterPrint };

  var accessibilityObserver = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) enhanceLessonAccessibility(node);
      });
    });
  });
  accessibilityObserver.observe(document.documentElement, { childList: true, subtree: true });
}());
