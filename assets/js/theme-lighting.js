(function () {
  var REFRESH_MS = 15 * 60 * 1000;
  var STORAGE_MODE = "classroomos-lighting-mode";
  var STORAGE_THEME = "classroomos-lighting-phase";
  var STORAGE_REDUCED_MOTION = "classroomos-reduced-motion";
  var registry = window.ClassroomOSThemeRegistry;
  var currentTheme = null;
  var CHANGE_EVENT = "classroomos:lightingchange";
  var isApplyingTheme = false;
  var textureScrollQueued = false;

  function isThemeIndependent() {
    var htmlScope = document.documentElement && document.documentElement.dataset.themeScope;
    var bodyScope = document.body && document.body.dataset.themeScope;
    return htmlScope === "independent" || bodyScope === "independent";
  }

  function getAutoTheme(date) {
    if (window.matchMedia) {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches)  return "night";
      if (window.matchMedia("(prefers-color-scheme: light)").matches) return "day";
    }
    var hours = date.getHours();
    return (hours >= 6 && hours < 19) ? "day" : "night";
  }

  function normalizeTheme(theme) {
    return registry.normalize(theme);
  }

  function getLightingForTheme(theme) {
    return registry.isDark(theme) ? "night" : "day";
  }

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      /* ignore */
    }
  }

  function getMode() {
    return readStorage(STORAGE_MODE) === "manual" ? "manual" : "auto";
  }

  function getStoredTheme() {
    return normalizeTheme(readStorage(STORAGE_THEME));
  }

  function resolveTheme() {
    return getMode() === "manual" ? getStoredTheme() : getAutoTheme(new Date());
  }

  function emitChange(theme) {
    var detail = {
      theme: theme,
      phase: theme,
      lighting: getLightingForTheme(theme),
      mode: getMode()
    };
    var event;

    if (typeof window.CustomEvent === "function") {
      event = new CustomEvent(CHANGE_EVENT, { detail: detail });
    } else {
      event = document.createEvent("CustomEvent");
      event.initCustomEvent(CHANGE_EVENT, false, false, detail);
    }

    window.dispatchEvent(event);
  }

  function reducedMotionOverride() {
    return readStorage(STORAGE_REDUCED_MOTION) === "on";
  }

  function cosTransition() {
    if (!document.documentElement) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (reducedMotionOverride()) return;
    var html = document.documentElement;
    clearTimeout(html._cosThemeTimer);
    html.classList.add("theme-transitioning");
    html._cosThemeTimer = setTimeout(function () {
      html.classList.remove("theme-transitioning");
    }, 260);
  }

  function applyTheme(theme) {
    cosTransition();
    isApplyingTheme = true;
    if (isThemeIndependent()) {
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.removeAttribute("data-theme-mode");
      document.documentElement.removeAttribute("data-lighting");
      document.documentElement.removeAttribute("data-lighting-mode");
      document.documentElement.removeAttribute("data-site-theme");
      document.documentElement.removeAttribute("data-site-theme-mode");
      document.documentElement.style.colorScheme = "";
      if (document.body) {
        document.body.removeAttribute("data-theme");
        document.body.removeAttribute("data-theme-mode");
        document.body.removeAttribute("data-lighting");
        document.body.removeAttribute("data-lighting-mode");
      }
      currentTheme = null;
      isApplyingTheme = false;
      return theme;
    }

    if (!document.body) {
      isApplyingTheme = false;
      return theme;
    }

    var lighting = getLightingForTheme(theme);
    var mode = getMode();

    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.lighting = lighting;
    document.documentElement.dataset.lightingMode = mode;
    document.documentElement.setAttribute("data-site-theme", theme);
    document.documentElement.setAttribute("data-site-theme-mode", mode);
    document.documentElement.style.colorScheme = lighting === "night" ? "dark" : "light";

    document.body.dataset.theme = theme;
    document.body.dataset.themeMode = mode;
    document.body.dataset.lighting = lighting;
    document.body.dataset.lightingMode = mode;

    currentTheme = theme;
    emitChange(theme);
    isApplyingTheme = false;
    return theme;
  }

  function mirrorHtmlThemeAttributes() {
    if (isApplyingTheme || !document.body || isThemeIndependent()) return;

    var html = document.documentElement;
    var theme = html.dataset.theme;
    var lighting = html.dataset.lighting;

    if (!theme && lighting) {
      theme = lighting === "night" ? "night" : "day";
    }

    if (!theme) return;

    theme = normalizeTheme(theme);
    lighting = getLightingForTheme(theme);

    var mode = html.dataset.themeMode || getMode();

    if (html.dataset.theme !== theme) html.dataset.theme = theme;
    if (html.dataset.lighting !== lighting) html.dataset.lighting = lighting;
    if (html.getAttribute("data-site-theme") !== theme) html.setAttribute("data-site-theme", theme);
    if (html.getAttribute("data-site-theme-mode") !== mode) html.setAttribute("data-site-theme-mode", mode);
    if (html.style.colorScheme !== (lighting === "night" ? "dark" : "light")) {
      html.style.colorScheme = lighting === "night" ? "dark" : "light";
    }

    if (document.body.dataset.theme !== theme) document.body.dataset.theme = theme;
    if (document.body.dataset.lighting !== lighting) document.body.dataset.lighting = lighting;
    if (document.body.dataset.themeMode !== mode) document.body.dataset.themeMode = mode;
    if (document.body.dataset.lightingMode !== mode) document.body.dataset.lightingMode = mode;

    currentTheme = theme;
  }

  function sync() {
    return applyTheme(resolveTheme());
  }

  function setMode(mode) {
    writeStorage(STORAGE_MODE, mode === "manual" ? "manual" : "auto");
    return sync();
  }

  function setTheme(theme) {
    theme = normalizeTheme(theme);
    writeStorage(STORAGE_THEME, theme);
    writeStorage(STORAGE_MODE, "manual");
    return sync();
  }

  window.ClassroomOSThemeLighting = {
    getPhase: getAutoTheme,
    getTheme: getAutoTheme,
    getMode: getMode,
    getStoredPhase: getStoredTheme,
    getStoredTheme: getStoredTheme,
    getCurrentPhase: function () {
      return currentTheme || document.documentElement.dataset.theme || resolveTheme();
    },
    getCurrentTheme: function () {
      return currentTheme || document.documentElement.dataset.theme || resolveTheme();
    },
    getLightingForTheme: getLightingForTheme,
    setMode: setMode,
    setPhase: setTheme,
    setTheme: setTheme,
    sync: sync,
    isThemeIndependent: isThemeIndependent,
  };

  function highlightBrandOS() {
    document.querySelectorAll("a.brand, .brand[href]").forEach(function (el) {
      if (!el.querySelector(".brand-os")) {
        var highlighted = el.innerHTML.replace(/OS\b/g, '<span class="brand-os">OS</span>');
        el.innerHTML = '<span class="brand-text">' + highlighted + '</span>';
      }
    });
  }

  function ensureCanvasBackgroundEngine() {
    if (window.ClassroomOSCanvasBg || document.querySelector('script[data-classroomos-canvas-bg="true"]')) return;

    var src = "assets/js/canvas-bg.js";
    var lightingScript = Array.prototype.slice.call(document.scripts).find(function (script) {
      return /(^|\/)theme-lighting\.js(?:[?#].*)?$/.test(script.getAttribute("src") || script.src || "");
    });

    if (lightingScript) {
      src = (lightingScript.getAttribute("src") || lightingScript.src).replace(/theme-lighting\.js(?:[?#].*)?$/, "canvas-bg.js");
    }

    var script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset.classroomosCanvasBg = "true";
    document.head.appendChild(script);
  }

  function ensureContrastGuard() {
    if (window.ClassroomOSContrastGuard || document.querySelector('script[data-classroomos-contrast-guard="true"]')) return;

    var src = "assets/js/contrast-guard.js";
    var lightingScript = Array.prototype.slice.call(document.scripts).find(function (script) {
      return /(^|\/)theme-lighting\.js(?:[?#].*)?$/.test(script.getAttribute("src") || script.src || "");
    });

    if (lightingScript) {
      src = (lightingScript.getAttribute("src") || lightingScript.src).replace(/theme-lighting\.js(?:[?#].*)?$/, "contrast-guard.js");
    }

    var script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset.classroomosContrastGuard = "true";
    document.head.appendChild(script);
  }

  function syncTextureScroll() {
    textureScrollQueued = false;
    var offset = -(window.scrollY || document.documentElement.scrollTop || 0) + "px";
    document.documentElement.style.setProperty("--theme-texture-scroll-y", offset);
    if (document.body) {
      document.body.style.setProperty("--theme-texture-scroll-y", offset);
    }
  }

  function requestTextureScrollSync() {
    if (textureScrollQueued) return;
    textureScrollQueued = true;
    window.requestAnimationFrame(syncTextureScroll);
  }

  function bindTextureScrollSync() {
    if (window.__classroomosTextureScrollBound) return;
    window.__classroomosTextureScrollBound = true;
    syncTextureScroll();
    window.addEventListener("scroll", requestTextureScrollSync, { passive: true });
    window.addEventListener("resize", requestTextureScrollSync, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { sync(); highlightBrandOS(); ensureCanvasBackgroundEngine(); ensureContrastGuard(); bindTextureScrollSync(); }, { once: true });
  } else {
    sync();
    highlightBrandOS();
    ensureCanvasBackgroundEngine();
    ensureContrastGuard();
    bindTextureScrollSync();
  }

  // Re-sync when the OS dark/light preference changes (e.g. user switches system appearance).
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var mqHandler = function () { if (getMode() === "auto") sync(); };
    try {
      mq.addEventListener("change", mqHandler);
    } catch (e) {
      try { mq.addListener(mqHandler); } catch (e2) {}
    }
  }

  if (typeof MutationObserver === "function") {
    new MutationObserver(mirrorHtmlThemeAttributes).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-lighting"]
    });
  }

  window.addEventListener("storage", function (event) {
    if (!event || event.key === STORAGE_MODE || event.key === STORAGE_THEME || event.key === null) {
      sync();
    }
  });

  window.setInterval(function () {
    if (getMode() === "auto") {
      sync();
    }
  }, REFRESH_MS);
}());
