(function () {
  var REFRESH_MS = 15 * 60 * 1000;
  var STORAGE_MODE = "classroomos-lighting-mode";
  var STORAGE_THEME = "classroomos-lighting-phase";
  var VALID_THEMES = ["day", "night", "sakura", "diamond", "emerald", "topaz"];
  var currentTheme = null;
  var CHANGE_EVENT = "classroomos:lightingchange";

  function isThemeIndependent() {
    var htmlScope = document.documentElement && document.documentElement.dataset.themeScope;
    var bodyScope = document.body && document.body.dataset.themeScope;
    return htmlScope === "independent" || bodyScope === "independent";
  }

  function getAutoTheme(date) {
    var hours = date.getHours();
    return (hours >= 6 && hours < 19) ? "day" : "night";
  }

  function isValidTheme(theme) {
    return VALID_THEMES.indexOf(theme) !== -1;
  }

  function normalizeTheme(theme) {
    if (theme === "morning" || theme === "dusk") return "day";
    if (theme === "kiwi") return "emerald";
    if (theme === "mango") return "topaz";
    return isValidTheme(theme) ? theme : "day";
  }

  function getLightingForTheme(theme) {
    return theme === "night" ? "night" : "day";
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

  function applyTheme(theme) {
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
      return theme;
    }

    if (!document.body) return theme;

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
    return theme;
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { sync(); highlightBrandOS(); }, { once: true });
  } else {
    sync();
    highlightBrandOS();
  }

  window.addEventListener("storage", function (event) {
    if (!event || event.key === STORAGE_MODE || event.key === STORAGE_THEME || event.key === null) {
      sync();
    }
  });

  window.setInterval(sync, REFRESH_MS);
}());
