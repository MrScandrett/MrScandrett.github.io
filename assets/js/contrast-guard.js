(function () {
  "use strict";

  if (window.ClassroomOSContrastGuard || document.documentElement.dataset.themeScope === "independent") return;

  var MIN_NORMAL = 4.5;
  var DARK_INK = [0, 0, 0, 1];
  var LIGHT_INK = [255, 255, 255, 1];
  var originals = new Map();
  var scheduled = false;

  function ensureContrastOverrides() {
    if (document.querySelector('link[data-classroomos-contrast-overrides="true"]')) return;
    var link = document.createElement("link");
    var script = document.currentScript;
    link.rel = "stylesheet";
    link.href = script && script.src ? new URL("../css/contrast-overrides.css", script.src).href : "/assets/css/contrast-overrides.css";
    link.dataset.classroomosContrastOverrides = "true";
    link.addEventListener("load", schedule, { once: true });
    document.head.appendChild(link);
  }

  // color-mix(), oklch(), lab() and friends compute to `color(srgb …)` or non-rgb syntax. Treating those
  // as unknown made themed surfaces look transparent, so the guard assumed a black canvas and painted
  // black text onto dark cards. A 1x1 canvas converts any CSS color to sRGB.
  var colorProbe = null;
  var modernColorCache = {};
  function parseModernColor(value) {
    if (Object.prototype.hasOwnProperty.call(modernColorCache, value)) return modernColorCache[value];
    var parsed = null;
    var srgb = value.match(/^color\(\s*srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i);
    if (srgb) {
      var a = srgb[4] === undefined ? 1 : (srgb[4].endsWith("%") ? parseFloat(srgb[4]) / 100 : parseFloat(srgb[4]));
      parsed = [parseFloat(srgb[1]) * 255, parseFloat(srgb[2]) * 255, parseFloat(srgb[3]) * 255, a];
    } else {
      try {
        if (!colorProbe) {
          var canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          colorProbe = canvas.getContext("2d", { willReadFrequently: true });
        }
        colorProbe.clearRect(0, 0, 1, 1);
        colorProbe.fillStyle = "#000";
        colorProbe.fillStyle = value;
        colorProbe.fillRect(0, 0, 1, 1);
        var px = colorProbe.getImageData(0, 0, 1, 1).data;
        if (px[3]) parsed = [px[0] * 255 / px[3], px[1] * 255 / px[3], px[2] * 255 / px[3], px[3] / 255];
      } catch (error) {}
    }
    modernColorCache[value] = parsed;
    return parsed;
  }

  function parseColor(value) {
    if (!value || value === "transparent") return [0, 0, 0, 0];
    var match = value.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
    if (!match) return parseModernColor(value);
    var alpha = match[4] === undefined ? 1 : (match[4].endsWith("%") ? parseFloat(match[4]) / 100 : parseFloat(match[4]));
    return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]), alpha];
  }

  function composite(foreground, background) {
    var alpha = foreground[3] + background[3] * (1 - foreground[3]);
    if (!alpha) return [0, 0, 0, 0];
    return [
      (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
      (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
      (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
      alpha
    ];
  }

  function splitBackgroundLayers(image) {
    var layers = [];
    var start = 0;
    var depth = 0;

    for (var index = 0; index < image.length; index += 1) {
      if (image[index] === "(") depth += 1;
      else if (image[index] === ")") depth -= 1;
      else if (image[index] === "," && depth === 0) {
        layers.push(image.slice(start, index));
        start = index + 1;
      }
    }
    layers.push(image.slice(start));
    return layers;
  }

  function averageGradient(image, background) {
    if (!image || image === "none") return null;

    var result = background;
    var foundGradient = false;
    var layers = splitBackgroundLayers(image);

    // CSS paints the final listed background first, then stacks earlier layers over it. A layer only covers
    // as much as its weakest stop does: a glow that fades to transparent barely changes the background, while
    // a fully opaque gradient replaces it with its (trimmed) average. A trimmed mean keeps one bright stop
    // from making a mostly dark gradient read as bright and flipping the page's own white text to black.
    for (var layerIndex = layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
      var matches = layers[layerIndex].match(/(?:rgba?|color)\([^)]*\)/gi);
      if (!matches || !matches.length) continue;

      var colors = matches.map(function (value) { return parseColor(value); }).filter(Boolean);
      if (!colors.length) continue;

      foundGradient = true;
      var coverage = Math.min.apply(null, colors.map(function (color) { return color[3]; }));
      if (!coverage) continue;
      var ranked = colors.slice().sort(function (a, b) { return luminance(a) - luminance(b); });
      var trim = Math.floor(ranked.length * 0.25);
      var core = ranked.slice(trim, ranked.length - trim);
      var mean = [0, 1, 2].map(function (k) { return core.reduce(function (sum, color) { return sum + color[k]; }, 0) / core.length; });
      result = [
        result[0] + (mean[0] - result[0]) * coverage,
        result[1] + (mean[1] - result[1]) * coverage,
        result[2] + (mean[2] - result[2]) * coverage,
        1
      ];
    }

    return foundGradient ? result : null;
  }

  function luminance(color) {
    var channels = color.slice(0, 3).map(function (channel) {
      var value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function contrast(first, second) {
    var lighter = Math.max(luminance(first), luminance(second));
    var darker = Math.min(luminance(first), luminance(second));
    return (lighter + 0.05) / (darker + 0.05);
  }

  function effectiveBackground(element) {
    var layers = [];
    var current = element;
    while (current && current.nodeType === 1) {
      layers.push(current);
      current = current.parentElement;
    }

    // Transparent page and gradient layers reveal the browser's color-scheme
    // canvas. Starting every walk from white made dark themes look light and
    // could turn already-readable text black on a dark panel.
    var isDarkCanvas = document.documentElement.dataset.lighting === "night" ||
      document.documentElement.style.colorScheme === "dark";
    var result = isDarkCanvas ? [0, 0, 0, 1] : [255, 255, 255, 1];
    for (var index = layers.length - 1; index >= 0; index -= 1) {
      var layerStyle = getComputedStyle(layers[index]);
      var color = parseColor(layerStyle.backgroundColor);
      if (color && color[3]) result = composite(color, result);
      var gradient = averageGradient(layerStyle.backgroundImage, result);
      if (gradient) result = gradient;
    }

    if (element.namespaceURI === "http://www.w3.org/2000/svg" && element.ownerSVGElement) {
      try {
        var textBox = element.getBBox();
        var centerX = textBox.x + textBox.width / 2;
        var centerY = textBox.y + textBox.height / 2;
        Array.prototype.forEach.call(element.ownerSVGElement.querySelectorAll("rect"), function (rect) {
          if (!(rect.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
          var box = rect.getBBox();
          if (centerX < box.x || centerX > box.x + box.width || centerY < box.y || centerY > box.y + box.height) return;
          var fill = parseColor(getComputedStyle(rect).fill);
          if (fill && fill[3]) result = composite(fill, result);
        });
      } catch (error) {}
    }
    return result;
  }

  function isVisible(element, style) {
    // Opacity is deliberately not checked: fade-in reveals start at 0 and finish by CSS animation, which fires no
    // DOM change, so an element skipped while transparent would keep its unfixed color once it appears.
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (element.closest("[hidden], [aria-hidden=\"true\"]")) return false;
    var rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function containsReadableText(element) {
    if (/^(BUTTON|INPUT|OPTION|SELECT|TEXTAREA|SUMMARY|TEXT)$/i.test(element.tagName)) return true;
    for (var index = 0; index < element.childNodes.length; index += 1) {
      var node = element.childNodes[index];
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) return true;
    }
    return false;
  }

  // ---- Night surfaces -------------------------------------------------------------------------
  // Plenty of lessons hard-code light panels (#fff cards, pastel callouts, a cream page) that no theme can
  // reach. In a dark theme the guard re-tones those panels, keeping hue, so the page matches the theme and
  // the text pass below then fixes any text that no longer fits. Photos, SVG, canvas, video and anything
  // marked data-night-keep are left alone, and media sitting on a panel we darkened keeps the light backing
  // it was drawn for (a transparent diagram with dark linework must not end up on a dark panel).
  var SURFACE_MIN_LUMINANCE = 0.45;
  var SURFACE_KEEP = "[data-night-keep], [data-score], .fb-shell, .as-page";
  var SURFACE_SKIP_TAGS = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|VIDEO|IFRAME|OBJECT|EMBED|MODEL-VIEWER|HEAD|OPTION|OPTGROUP)$/i;
  var SURFACE_MEDIA = /^(IMG|SVG|CANVAS)$/i;
  var SURFACE_CONTROLS = /^(BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/i;
  var surfaceOriginals = new Map();

  function rgbToHsl(rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    function channel(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    if (!s) return [l * 255, l * 255, l * 255];
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return [channel(p, q, h + 1 / 3) * 255, channel(p, q, h) * 255, channel(p, q, h - 1 / 3) * 255];
  }

  function mixRgb(a, b, amount) {
    return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount];
  }

  function themeColor(property, fallback) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
    var parsed = raw ? parseColor(raw) : null;
    if (!parsed || !parsed[3]) return fallback;
    return composite(parsed, [fallback[0], fallback[1], fallback[2], 1]).slice(0, 3);
  }

  // A light color's dark counterpart. Neutrals become the theme's own surface (so Lava Lamp stays red-black,
  // Night stays charcoal); tinted pastels keep their hue at a deep lightness.
  function softenRgb(rgb, palette, asPage, sameAsBackdrop) {
    var hsl = rgbToHsl(rgb);
    if (asPage) return palette.page;
    if (hsl[1] < 0.14) {
      var t = Math.min(0.5, Math.max(0, (1 - hsl[2]) * 1.6));
      var base = mixRgb(palette.surface, [0, 0, 0], t);
      return sameAsBackdrop ? mixRgb(base, [0, 0, 0], 0.16) : base;
    }
    var tinted = hslToRgb(hsl[0], Math.min(hsl[1], 0.7) * 0.55, 0.17 + (1 - hsl[2]) * 0.35);
    return mixRgb(tinted, palette.surface, 0.25);
  }

  function rgbaString(rgb, alpha) {
    return "rgba(" + rgb.map(function (v) { return Math.round(Math.max(0, Math.min(255, v))); }).join(", ") + ", " + alpha + ")";
  }

  function gradientColors(image) {
    return (image.match(/(?:rgba?|color)\([^)]*\)/gi) || []).map(function (value) { return parseColor(value); }).filter(Boolean);
  }

  function wordCount(element) {
    return ((element.textContent || "").match(/[A-Za-zÀ-ɏ]{2,}/g) || []).length;
  }

  function rememberSurface(element) {
    if (surfaceOriginals.has(element)) return surfaceOriginals.get(element);
    var original = {};
    ["background-color", "background-image", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color"].forEach(function (property) {
      original[property] = [element.style.getPropertyValue(property), element.style.getPropertyPriority(property)];
    });
    surfaceOriginals.set(element, original);
    if (!element.hasAttribute(TOUCHED_ATTR)) element.setAttribute(TOUCHED_ATTR, "");
    element.setAttribute("data-night-surface", "");
    return original;
  }

  function setSurface(element, property, value) {
    rememberSurface(element);
    element.style.setProperty(property, value, "important");
  }

  function restoreSurfaces() {
    surfaceOriginals.forEach(function (original, element) {
      if (!element.isConnected) return;
      Object.keys(original).forEach(function (property) {
        if (original[property][0]) element.style.setProperty(property, original[property][0], original[property][1]);
        else element.style.removeProperty(property);
      });
      element.removeAttribute("data-night-surface");
    });
    surfaceOriginals.clear();
  }

  // The panel colour an element paints, or null if it paints nothing we should touch.
  function surfaceCandidate(style, isPage) {
    var image = style.backgroundImage;
    var hasImage = !!image && image !== "none";
    var hasUrl = hasImage && image.indexOf("url(") !== -1;
    // A photo or texture on a card hides the color behind it, and a transparent logo may rely on it, so cards
    // with url() backgrounds are left alone. The page itself is the exception: themed texture patterns sit on
    // top of its color, and that color is what glares.
    if (hasUrl && !isPage) return null;
    var solid = parseColor(style.backgroundColor);
    var gradient = hasImage && !hasUrl ? gradientColors(image).filter(function (c) { return c[3] >= 0.5; }) : [];
    if (gradient.length) {
      var avg = [0, 1, 2].map(function (k) { return gradient.reduce(function (sum, c) { return sum + c[k]; }, 0) / gradient.length; });
      return { rgb: avg, alpha: 1, gradient: true, solid: solid };
    }
    if (solid && solid[3] >= 0.5) return { rgb: solid.slice(0, 3), alpha: solid[3], gradient: false, solid: solid };
    return null;
  }

  // Panels are text containers; controls are buttons, fields and links dressed as buttons. Tiles, keys and swatches
  // (square-ish or tall, no words) are meaning in themselves, so they never qualify.
  function qualifiesAsPanel(element, rect, style) {
    var area = rect.width * rect.height;
    var tag = element.tagName;
    var isField = /^(INPUT|TEXTAREA|SELECT)$/.test(tag);
    var isControl = SURFACE_CONTROLS.test(tag) || element.getAttribute("role") === "button" ||
      (/^(A|LABEL)$/.test(tag) && style.display !== "inline");
    if (isControl) {
      var ratio = rect.width / Math.max(rect.height, 1);
      if (area >= 1200 && ratio >= 1.4 && ratio <= 14 && (isField || wordCount(element) >= 1)) return true;
    }
    return area >= 8000 && wordCount(element) >= 5;
  }

  function softenSurfaces() {
    if (document.documentElement.dataset.lighting !== "night" || !document.body) return;
    var palette = {
      surface: themeColor("--surface-elevated", [42, 43, 48]),
      page: themeColor("--bg", [28, 28, 30])
    };

    function visit(element, backdrop) {
      if (element.nodeType !== 1 || SURFACE_SKIP_TAGS.test(element.tagName)) return;
      if (element.hasAttribute(SKIP_ATTR) || element.matches(SURFACE_KEEP)) return;
      var style = getComputedStyle(element);
      if (style.display === "none") return;

      if (SURFACE_MEDIA.test(element.tagName)) {
        // Give back the backing a transparent image/diagram was drawn on. Opaque photos never show it. Small
        // icons and stacked overlays (absolute/fixed) are skipped: a backing there would hide what is beneath.
        if (backdrop && backdrop.changed && !(parseColor(style.backgroundColor) || [0, 0, 0, 0])[3] &&
            (style.position === "static" || style.position === "relative")) {
          var mediaRect = element.getBoundingClientRect();
          if (mediaRect.width * mediaRect.height >= 6000) setSurface(element, "background-color", rgbaString(backdrop.original, 1));
        }
        return;
      }

      var next = backdrop;
      var isPage = element === document.body || element === document.documentElement;
      var candidate = surfaceCandidate(style, isPage);
      if (candidate) {
        var light = luminance(candidate.rgb) >= SURFACE_MIN_LUMINANCE;
        if (light && (isPage || qualifiesAsPanel(element, element.getBoundingClientRect(), style))) {
          var sameAsBackdrop = !!(backdrop && backdrop.changed && !isPage &&
            Math.abs(backdrop.original[0] - candidate.rgb[0]) + Math.abs(backdrop.original[1] - candidate.rgb[1]) + Math.abs(backdrop.original[2] - candidate.rgb[2]) < 24);
          var dark = softenRgb(candidate.rgb, palette, isPage, sameAsBackdrop);
          if (candidate.gradient) {
            setSurface(element, "background-image", style.backgroundImage.replace(/(?:rgba?|color)\([^)]*\)/gi, function (token) {
              var color = parseColor(token);
              if (!color || !color[3] || luminance(color) < 0.3) return token;
              return rgbaString(softenRgb(color.slice(0, 3), palette, false, sameAsBackdrop), color[3]);
            }));
            if (candidate.solid && candidate.solid[3]) setSurface(element, "background-color", rgbaString(dark, candidate.solid[3]));
          } else {
            setSurface(element, "background-color", rgbaString(dark, candidate.alpha));
          }
          ["Top", "Right", "Bottom", "Left"].forEach(function (side) {
            if (!parseFloat(style["border" + side + "Width"])) return;
            var border = parseColor(style["border" + side + "Color"]);
            if (border && border[3] >= 0.3 && luminance(border) >= SURFACE_MIN_LUMINANCE) {
              setSurface(element, "border-" + side.toLowerCase() + "-color", rgbaString(mixRgb(dark, [255, 255, 255], 0.18), border[3]));
            }
          });
          next = { original: candidate.rgb, changed: true };
        } else if (candidate.alpha >= 0.9) {
          next = { original: candidate.rgb, changed: false };
        }
      }

      for (var child = element.firstElementChild; child; child = child.nextElementSibling) visit(child, next);
    }

    visit(document.documentElement, null);
  }

  function restore() {
    restoreSurfaces();
    originals.forEach(function (original, element) {
      if (!element.isConnected) return;
      if (original.colorValue) element.style.setProperty("color", original.colorValue, original.colorPriority);
      else element.style.removeProperty("color");
      if (original.fillValue) element.style.setProperty("fill", original.fillValue, original.fillPriority);
      else element.style.removeProperty("fill");
      element.removeAttribute("data-contrast-guard");
    });
    originals.clear();
  }

  // Elements the guard has ever recolored. Only these need transitions paused during a pass,
  // so the pause rule doesn't restyle the whole page (a long score is thousands of SVG nodes).
  var TOUCHED_ATTR = "data-contrast-touched";
  function remember(element, original) {
    originals.set(element, original);
    if (!element.hasAttribute(TOUCHED_ATTR)) element.setAttribute(TOUCHED_ATTR, "");
  }

  function inspect(element) {
    if (element.closest("[data-contrast-guard-skip]")) return;
    if (element.matches("#step-1 svg text, #curved svg text, #double svg text, .bb-anatomy-svg > text, #eg-gauge-value, .ml-waveform-btn:first-child")) return;
    var style = getComputedStyle(element);
    if (!isVisible(element, style)) return;

    var isSvgText = element.namespaceURI === "http://www.w3.org/2000/svg" && element.tagName.toLowerCase() === "text";
    var foreground = parseColor(isSvgText && style.fill !== "none" ? style.fill : style.color);
    if (!foreground || foreground[3] === 0) return;

    if (isSvgText) {
      remember(element, {
        colorValue: element.style.getPropertyValue("color"),
        colorPriority: element.style.getPropertyPriority("color"),
        fillValue: element.style.getPropertyValue("fill"),
        fillPriority: element.style.getPropertyPriority("fill")
      });
      element.style.setProperty("color", style.fill, "important");
      element.setAttribute("data-contrast-guard", "svg");
    }

    var background = effectiveBackground(element);
    foreground = composite(foreground, background);
    var currentContrast = contrast(foreground, background);
    if (currentContrast >= MIN_NORMAL) {
      // HTML_CodeSniffer evaluates SVG text through `color`, while browsers paint
      // it through `fill`. Keep both channels synchronized for diagrams.
      if (!isSvgText || contrast(parseColor(style.color) || foreground, background) >= MIN_NORMAL) return;
      var paintedColor = "rgb(" + foreground.slice(0, 3).map(Math.round).join(", ") + ")";
      if (!originals.has(element)) remember(element, {
        colorValue: element.style.getPropertyValue("color"), colorPriority: element.style.getPropertyPriority("color"),
        fillValue: element.style.getPropertyValue("fill"), fillPriority: element.style.getPropertyPriority("fill")
      });
      element.style.setProperty("color", paintedColor, "important");
      element.style.setProperty("fill", paintedColor, "important");
      element.setAttribute("data-contrast-guard", "svg");
      return;
    }

    var darkContrast = contrast(DARK_INK, background);
    var lightContrast = contrast(LIGHT_INK, background);
    var replacement = darkContrast >= lightContrast ? "#000000" : "#ffffff";
    if (Math.max(darkContrast, lightContrast) < MIN_NORMAL) return;

    if (!originals.has(element)) remember(element, {
      colorValue: element.style.getPropertyValue("color"),
      colorPriority: element.style.getPropertyPriority("color"),
      fillValue: element.style.getPropertyValue("fill"),
      fillPriority: element.style.getPropertyPriority("fill")
    });
    element.style.setProperty("color", replacement, "important");
    if (isSvgText) element.style.setProperty("fill", replacement, "important");
    element.setAttribute("data-contrast-guard", replacement === "#000000" ? "dark" : "light");
  }

  // Each pass strips its inline colors and re-applies them. On an element with
  // `transition: color` (the hamburger, nav links, buttons) that animated
  // brown -> black -> brown on every pass, i.e. a visible flicker. Transitions
  // are switched off on those elements while the pass runs and the final style is flushed before
  // they come back, so the element never sees the intermediate color.
  var PASS_ATTR = "data-contrast-pass";
  var SKIP_ATTR = "data-contrast-guard-skip";

  function ensurePassStyle() {
    if (document.getElementById("classroomos-contrast-pass-style")) return;
    var style = document.createElement("style");
    style.id = "classroomos-contrast-pass-style";
    var sel = "html[" + PASS_ATTR + "] [" + TOUCHED_ATTR + "]";
    style.textContent = sel + ", " + sel + "::before, " + sel + "::after { transition: none !important; }";
    document.head.appendChild(style);
  }

  var lastCost = 0, lastRun = 0;
  function run() {
    scheduled = false;
    var started = window.performance ? performance.now() : 0;
    var root = document.documentElement;
    ensurePassStyle();
    root.setAttribute(PASS_ATTR, "");
    try {
      restore();
      softenSurfaces();
      // Skipped regions are never entered, so a big drawing (a long score) costs nothing per pass.
      if (document.body) {
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
          acceptNode: function (node) { return node.hasAttribute(SKIP_ATTR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
        });
        for (var element = walker.nextNode(); element; element = walker.nextNode()) {
          if (containsReadableText(element)) inspect(element);
        }
      }
      void root.offsetWidth; // flush the final colors while transitions are still off
    } finally {
      root.removeAttribute(PASS_ATTR);
      if (window.performance) { lastRun = performance.now(); lastCost = lastRun - started; }
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    // On a heavy page a pass is expensive: space passes out (up to 1s) so they can't take every frame.
    var wait = lastCost > 24 ? Math.min(1000, lastCost * 4) - (performance.now() - lastRun) : 0;
    if (wait > 0) setTimeout(function () { window.requestAnimationFrame(run); }, wait);
    else window.requestAnimationFrame(run);
  }

  // runNow applies the pass synchronously; the a11y audit calls it so its
  // result doesn't depend on when a background tab gets its next frame.
  window.ClassroomOSContrastGuard = { run: schedule, runNow: run };
  ensureContrastOverrides();
  window.addEventListener("classroomos:lightingchange", schedule);
  window.addEventListener("load", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  if (typeof MutationObserver === "function") {
    // Changes inside a skipped region (a playback cursor stepping through a score) don't need a pass.
    new MutationObserver(function (records) {
      for (var index = 0; index < records.length; index += 1) {
        var target = records[index].target;
        var element = target.nodeType === 1 ? target : target.parentElement;
        if (!element || !element.closest("[" + SKIP_ATTR + "]")) { schedule(); return; }
      }
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "hidden", "aria-hidden", "disabled", "value"],
      characterData: true,
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();
}());
