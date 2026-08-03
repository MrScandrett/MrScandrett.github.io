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

  function parseColor(value) {
    if (!value || value === "transparent") return [0, 0, 0, 0];
    var match = value.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
    if (!match) return null;
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
      var matches = layers[layerIndex].match(/rgba?\([^)]*\)/gi);
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

  function inspect(element) {
    if (element.matches("#step-1 svg text, #curved svg text, #double svg text, .bb-anatomy-svg > text, #eg-gauge-value, .ml-waveform-btn:first-child")) return;
    var style = getComputedStyle(element);
    if (!isVisible(element, style)) return;

    var isSvgText = element.namespaceURI === "http://www.w3.org/2000/svg" && element.tagName.toLowerCase() === "text";
    var foreground = parseColor(isSvgText && style.fill !== "none" ? style.fill : style.color);
    if (!foreground || foreground[3] === 0) return;

    if (isSvgText) {
      originals.set(element, {
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
      if (!originals.has(element)) originals.set(element, {
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

    if (!originals.has(element)) originals.set(element, {
      colorValue: element.style.getPropertyValue("color"),
      colorPriority: element.style.getPropertyPriority("color"),
      fillValue: element.style.getPropertyValue("fill"),
      fillPriority: element.style.getPropertyPriority("fill")
    });
    element.style.setProperty("color", replacement, "important");
    if (isSvgText) element.style.setProperty("fill", replacement, "important");
    element.setAttribute("data-contrast-guard", replacement === "#000000" ? "dark" : "light");
  }

  function run() {
    scheduled = false;
    restore();
    Array.prototype.forEach.call(document.body ? document.body.querySelectorAll("*") : [], function (element) {
      if (containsReadableText(element)) inspect(element);
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(run);
  }

  window.ClassroomOSContrastGuard = { run: schedule };
  ensureContrastOverrides();
  window.addEventListener("classroomos:lightingchange", schedule);
  window.addEventListener("load", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  if (typeof MutationObserver === "function") {
    new MutationObserver(schedule).observe(document.documentElement, {
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
