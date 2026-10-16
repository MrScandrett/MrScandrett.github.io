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

    // CSS paints the final listed background first, then stacks earlier
    // layers over it. Estimate each gradient separately so transparent stops
    // reveal the layer beneath instead of being averaged with unrelated ones.
    for (var layerIndex = layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
      var matches = layers[layerIndex].match(/(?:rgba?|color)\([^)]*\)/gi);
      if (!matches || !matches.length) continue;

      var samples = matches.map(function (value) {
        var color = parseColor(value);
        return color ? composite(color, result) : null;
      }).filter(Boolean);
      if (!samples.length) continue;

      foundGradient = true;
      result = [
        samples.reduce(function (sum, color) { return sum + color[0]; }, 0) / samples.length,
        samples.reduce(function (sum, color) { return sum + color[1]; }, 0) / samples.length,
        samples.reduce(function (sum, color) { return sum + color[2]; }, 0) / samples.length,
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
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) return false;
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

  function restore() {
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
