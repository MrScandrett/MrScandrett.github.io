/**
 * skin-surfaces.js — lets skins reach every page without knowing its classes.
 *
 * Lessons each have their own CSS (.nl-card, .ph-panel, …), so a skin can't
 * list them. This pass looks at what an element *is* on screen and tags it:
 *
 *   data-skin-surface="panel"    a filled or outlined box with rounded corners or a shadow
 *   data-skin-surface="control"  a button, tab or button-like link
 *   data-skin-surface="field"    a text input, select or textarea
 *   data-skin-shape="tile"       on a control: a button holding a layout of its own
 *                                (a calendar day, a card that is a button), not a label
 *
 * Skin CSS styles those tags. Tags describe the page's own structure, not the
 * skin, so they are made once per element and survive skin switches; nothing
 * is written inline. Loaded by skin-registry.js only while a skin with its own
 * CSS is active, so the default Liquid Glass pays nothing.
 *
 * Opt out with data-skin-keep on any container (photos boards, swatches, a
 * hand-tuned widget). Notation, the Timeline / Family Tree engines, sims'
 * stages and media are always left alone.
 */
(function () {
  if (window.ClassroomOSSkinSurfaces) return;

  var ATTR = "data-skin-surface";
  var KEEP = "[data-skin-keep], [data-score], .fb-shell, .tl, .ft, model-viewer, [data-theme-scope='independent'], .nav-theme-preview, .nav-skin-sample";
  // Layout shells: never a surface themselves, but their contents are.
  var SHELL = ".ll-viewport, .ll-stage, .ll-sim, .ll-topbar";
  var SKIP_TAGS = /^(IMG|SVG|CANVAS|VIDEO|PICTURE|IFRAME|MODEL-VIEWER|SCRIPT|STYLE|LINK|META|NOSCRIPT|TEMPLATE|HTML|BODY|MAIN|BR|HR|PATH|G|OPTION|SOURCE|TRACK|FIGURE|TABLE|THEAD|TBODY|TR|TD|TH)$/;
  var FIELD_TYPES = /^(text|search|email|number|url|tel|password|date|time|datetime-local|month|week)$/;

  function alpha(color) {
    if (!color || color === "transparent") return 0;
    var m = color.match(/(?:rgba?|color)\(([^)]+)\)/);
    if (!m) return 1;
    var parts = m[1].replace(/^srgb\s+/, "").split(/[\s,\/]+/).filter(Boolean);
    return parts.length > 3 ? parseFloat(parts[3]) : 1;
  }

  function rgb(color) {
    var m = color && color.match(/[\d.]+/g);
    return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null;
  }
  /* color(srgb r g b) and rgb() both parse; values may be 0–1 or 0–255. */
  function norm(c) { return c && Math.max(c[0], c[1], c[2]) <= 1 ? [c[0] * 255, c[1] * 255, c[2] * 255] : c; }
  var styleCache = null;
  function styleFor(el) {
    if (!styleCache) return getComputedStyle(el);
    if (!styleCache.has(el)) styleCache.set(el, getComputedStyle(el));
    return styleCache.get(el);
  }
  function standsOut(el, cs) {
    if (cs.backgroundImage !== "none") return true;
    var own = norm(rgb(cs.backgroundColor));
    for (var p = el.parentElement; p; p = p.parentElement) {
      var pcs = styleFor(p);
      if (pcs.backgroundImage !== "none" && p !== document.body && p !== document.documentElement) return true;
      if (alpha(pcs.backgroundColor) > 0.5) {
        var back = norm(rgb(pcs.backgroundColor));
        if (!own || !back) return true;
        return Math.abs(own[0] - back[0]) + Math.abs(own[1] - back[1]) + Math.abs(own[2] - back[2]) > 9 || alpha(cs.backgroundColor) < 0.95;
      }
    }
    return true;
  }

  // Visible elements that aren't a surface; hidden ones are looked at again later.
  var rejected = typeof WeakSet === "function" ? new WeakSet() : null;

  function classify(el) {
    if (el.nodeType !== 1 || el.hasAttribute(ATTR) || (rejected && rejected.has(el))) return null;
    var kind = judge(el);
    if (!kind && rejected && el.isConnected && el.getClientRects().length) rejected.add(el);
    return kind;
  }

  function judge(el) {
    var tag = el.tagName;
    if (SKIP_TAGS.test(tag) || el.namespaceURI !== "http://www.w3.org/1999/xhtml") return null;
    if (el.closest(KEEP) || el.closest(".brand")) return null;

    if (tag === "INPUT") return FIELD_TYPES.test(el.type || "text") ? "field" : null;
    if (tag === "SELECT" || tag === "TEXTAREA") return "field";

    var cs = styleFor(el);
    if (cs.display === "none" || cs.display === "contents" || cs.visibility === "hidden") return null;
    // Words inside a sentence (glossary terms, inline links) stay text, never become boxes.
    if (cs.display === "inline") return null;
    var rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    var filled = alpha(cs.backgroundColor) > 0.04 || (cs.backgroundImage !== "none" && !/url\(/.test(cs.backgroundImage));
    var outlined = parseFloat(cs.borderTopWidth) >= 1 && alpha(cs.borderTopColor) > 0.08;
    var role = el.getAttribute("role");

    if (tag === "BUTTON" || role === "button" || role === "tab") {
      return rect.height <= 96 && rect.width <= 520 ? "control" : null;
    }
    if (tag === "A" && (filled || outlined) && rect.height >= 24 && rect.height <= 64 && rect.width <= 420) return "control";

    // Anything inside a button or link is part of that control (a shimmer layer, an icon well),
    // never a panel of its own: styling it as one draws a box inside the button.
    if (el.parentElement && el.parentElement.closest("button, a[href], [role='button'], [role='tab']")) return null;

    // Corners and shadows are what skins change, so they can't be the test.
    // A panel is an outlined box, or a filled one that stands out from what's behind it.
    if (!(outlined || (filled && standsOut(el, cs)))) return null;
    if (el.matches(SHELL)) return null;
    if (rect.width < 140 || rect.height < 44) return null;
    if (rect.width > document.documentElement.clientWidth * 0.97) return null;
    if (cs.position === "fixed" && rect.width > window.innerWidth * 0.95) return null;
    return "panel";
  }

  // A button whose contents are laid out (two or more boxed parts, a grid cell, a tall card)
  // is a tile, not a label: skins that draw labelled buttons can draw these as slots instead.
  function isTile(el) {
    if (el.closest("[role='gridcell'], td")) return true;
    if (el.getBoundingClientRect().height > 72) return true;
    var boxed = 0;
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
      if (/^(SVG|IMG|I)$/i.test(c.tagName)) continue;
      var d = styleFor(c).display;
      if (d !== "inline" && d !== "contents" && d !== "none" && ++boxed >= 2) return true;
    }
    return false;
  }

  var shaped = typeof WeakSet === "function" ? new WeakSet() : null;
  function presetControl(el) {
    if (el.getAttribute(ATTR) !== "control" || el.hasAttribute("data-skin-shape") || !shaped || shaped.has(el)) return false;
    if (!el.getClientRects().length) return false;
    shaped.add(el);
    return true;
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    var list = [root];
    var all = root.getElementsByTagName("*");
    for (var i = 0; i < all.length; i++) list.push(all[i]);
    // Read everything first, then write, so styles are computed once.
    var marks = [];
    styleCache = new WeakMap();
    for (var j = 0; j < list.length; j++) {
      var kind = classify(list[j]);
      if (kind) marks.push([list[j], kind, kind === "control" && isTile(list[j])]);
      // Controls tagged in the page's own markup still need their shape read once.
      else if (presetControl(list[j]) && isTile(list[j])) list[j].setAttribute("data-skin-shape", "tile");
    }
    styleCache = null;
    for (var k = 0; k < marks.length; k++) {
      marks[k][0].setAttribute(ATTR, marks[k][1]);
      if (marks[k][2]) marks[k][0].setAttribute("data-skin-shape", "tile");
    }
  }

  function active() {
    var html = document.documentElement;
    return html.dataset.skin && html.dataset.skin !== "glass" &&
      !html.matches("[data-theme-scope='independent']") &&
      !document.body.matches("[data-theme-scope='independent']");
  }

  var pending = [];
  var queued = false;
  function flush() {
    queued = false;
    var batch = pending;
    pending = [];
    if (!active()) return;
    for (var i = 0; i < batch.length; i++) if (batch[i].isConnected) scan(batch[i]);
  }
  function queue(el) {
    if (!active() || !el || el.nodeType !== 1) return;
    // A queued ancestor already covers this subtree. Drop queued descendants.
    for (var i = 0; i < pending.length; i++) if (pending[i].contains(el)) return;
    pending = pending.filter(function (item) { return !el.contains(item); });
    pending.push(el);
    if (queued) return;
    queued = true;
    (window.requestIdleCallback || window.requestAnimationFrame)(flush, { timeout: 400 });
  }

  var observer = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var added = records[i].addedNodes;
      for (var j = 0; j < added.length; j++) if (added[j].nodeType === 1) queue(added[j]);
    }
  });

  function sync() {
    observer.disconnect();
    pending = [];
    if (!active()) return;
    // Theme/viewport changes may make previously rejected boxes into surfaces.
    rejected = typeof WeakSet === "function" ? new WeakSet() : null;
    queue(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    sync();
    new MutationObserver(sync).observe(document.documentElement, {
      attributes: true, attributeFilter: ["data-skin", "data-theme", "data-theme-scope"]
    });
    new MutationObserver(sync).observe(document.body, {
      attributes: true, attributeFilter: ["data-theme-scope"]
    });
    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sync, 180);
    });
    // Late layout (fonts, lazy panels, tabs revealed) can turn a 0-size box into a panel.
    window.addEventListener("load", function () { queue(document.body); }, { once: true });
    // Tabs, <details> and "show more" reveal boxes that were display:none at first.
    var clickTimer = 0;
    document.addEventListener("click", function () {
      clearTimeout(clickTimer);
      clickTimer = setTimeout(function () { queue(document.body); }, 180);
    }, true);
  }

  window.ClassroomOSSkinSurfaces = { scan: scan, classify: classify };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
