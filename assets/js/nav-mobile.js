/* nav-mobile.js — shared nav controls + universal lighting settings */
(function () {
  function ensureClassroomRangeSkin() {
    if (window.ClassroomOSRangeSkin) {
      window.ClassroomOSRangeSkin();
      return;
    }

    var STYLE_ID = "classroomos-range-style";
    var LEGACY_STYLE_ID = "classroomos-kawaii-range-style";
    var RANGE_SELECTOR = 'input[type="range"]';
    var RANGE_CLASS = "cos-range";
    var LEGACY_RANGE_CLASS = "cos-kawaii-range";

    function injectStyle() {
      var legacy = document.getElementById(LEGACY_STYLE_ID);
      if (legacy) legacy.remove();
      if (window.__classroomosKawaiiRangeObserver) {
        window.__classroomosKawaiiRangeObserver.disconnect();
        window.__classroomosKawaiiRangeObserver = null;
      }
      if (document.getElementById(STYLE_ID)) return;

      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent =
        'input[type="range"].' + RANGE_CLASS + '{' +
          '--cos-range-accent:#0071e3;' +
          '--cos-range-progress:0%;' +
          '--cos-range-track:rgba(125,136,154,0.24);' +
          '--cos-range-track-border:rgba(125,136,154,0.28);' +
          '--cos-range-thumb-surface:var(--surface-elevated,var(--white,#fff));' +
          'appearance:none;-webkit-appearance:none;accent-color:var(--cos-range-accent);' +
          'display:block;width:100%;max-width:100%;min-width:0;height:28px;padding:0;border:0;background:transparent;' +
          'border-radius:999px;cursor:pointer;color:var(--cos-range-accent);touch-action:pan-y;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':focus{outline:none;}' +
        'input[type="range"].' + RANGE_CLASS + ':focus-visible{' +
          'outline:2px solid var(--focus-ring,rgba(0,113,227,0.34));outline-offset:3px;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-webkit-slider-runnable-track{' +
          'height:8px;border:1px solid var(--cos-range-track-border);border-radius:999px;' +
          'background:linear-gradient(90deg,var(--cos-range-accent) 0 var(--cos-range-progress),var(--cos-range-track) var(--cos-range-progress) 100%);' +
          'box-shadow:inset 0 1px 1px rgba(15,23,42,0.08);' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-webkit-slider-thumb{' +
          '-webkit-appearance:none;appearance:none;width:20px;height:20px;margin-top:-7px;border-radius:50%;' +
          'border:3px solid var(--cos-range-thumb-surface);' +
          'background:linear-gradient(180deg,color-mix(in srgb,var(--cos-range-accent) 72%,#fff),var(--cos-range-accent));' +
          'box-shadow:0 2px 7px rgba(15,23,42,0.22),0 0 0 1px color-mix(in srgb,var(--cos-range-accent) 40%,#1d1d1f);' +
          'transition:transform 120ms ease,box-shadow 120ms ease;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':hover::-webkit-slider-thumb,' +
        'input[type="range"].' + RANGE_CLASS + ':focus-visible::-webkit-slider-thumb{' +
          'transform:scale(1.08);box-shadow:0 3px 10px rgba(15,23,42,0.26),0 0 0 4px color-mix(in srgb,var(--cos-range-accent) 16%,transparent);' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':active::-webkit-slider-thumb{transform:scale(0.96);}' +
        'input[type="range"].' + RANGE_CLASS + '::-moz-range-track{' +
          'height:8px;border:1px solid var(--cos-range-track-border);border-radius:999px;' +
          'background:var(--cos-range-track);box-shadow:inset 0 1px 1px rgba(15,23,42,0.08);' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-moz-range-progress{' +
          'height:8px;border-radius:999px;background:var(--cos-range-accent);' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-moz-range-thumb{' +
          'appearance:none;width:20px;height:20px;border-radius:50%;border:3px solid var(--cos-range-thumb-surface);' +
          'background:linear-gradient(180deg,color-mix(in srgb,var(--cos-range-accent) 72%,#fff),var(--cos-range-accent));' +
          'box-shadow:0 2px 7px rgba(15,23,42,0.22),0 0 0 1px color-mix(in srgb,var(--cos-range-accent) 40%,#1d1d1f);' +
          'transition:transform 120ms ease,box-shadow 120ms ease;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':hover::-moz-range-thumb,' +
        'input[type="range"].' + RANGE_CLASS + ':focus-visible::-moz-range-thumb{' +
          'transform:scale(1.08);box-shadow:0 3px 10px rgba(15,23,42,0.26),0 0 0 4px color-mix(in srgb,var(--cos-range-accent) 16%,transparent);' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':disabled{' +
          'cursor:not-allowed;opacity:0.52;filter:saturate(0.6);' +
        '}' +
        '[data-lighting="night"] input[type="range"].' + RANGE_CLASS + ',' +
        '[data-theme="night"] input[type="range"].' + RANGE_CLASS + '{' +
          '--cos-range-track:rgba(155,168,190,0.22);' +
          '--cos-range-track-border:rgba(155,168,190,0.25);' +
        '}' +
        '@media (prefers-reduced-motion:reduce){' +
          'input[type="range"].' + RANGE_CLASS + '::-webkit-slider-thumb,' +
          'input[type="range"].' + RANGE_CLASS + '::-moz-range-thumb{transition:none;}' +
        '}';
      document.head.appendChild(style);
    }

    function getInlineAccent(slider) {
      var explicit = slider.getAttribute("data-range-accent");
      var inlineAccent = slider.style.getPropertyValue("accent-color") || slider.style.accentColor;
      var inlineColor = slider.style.getPropertyValue("color") || slider.style.color;

      if (explicit) return explicit;
      if (inlineAccent && inlineAccent !== "auto") {
        return inlineAccent.toLowerCase() === "currentcolor" && inlineColor ? inlineColor : inlineAccent;
      }
      return inlineColor || "";
    }

    function isVerticalRange(slider) {
      var writingMode = "";
      if (window.getComputedStyle) {
        writingMode = window.getComputedStyle(slider).writingMode || "";
      }
      return slider.getAttribute("orient") === "vertical" || writingMode.indexOf("vertical") === 0;
    }

    function syncSlider(slider) {
      if (!slider || slider.dataset.rangeSkin === "native") return;

      slider.classList.remove(LEGACY_RANGE_CLASS);
      if (isVerticalRange(slider)) {
        slider.classList.remove(RANGE_CLASS);
        slider.style.removeProperty("--base");
        slider.style.removeProperty("--light");
        slider.style.removeProperty("--lighter");
        slider.style.removeProperty("--dark");
        slider.style.removeProperty("--transparent");
        slider.style.removeProperty("--cos-range-progress");
        return;
      }

      slider.classList.add(RANGE_CLASS);

      slider.style.removeProperty("--base");
      slider.style.removeProperty("--light");
      slider.style.removeProperty("--lighter");
      slider.style.removeProperty("--dark");
      slider.style.removeProperty("--transparent");

      var accent = getInlineAccent(slider);
      if (accent) slider.style.setProperty("--cos-range-accent", accent);

      var min = parseFloat(slider.min);
      var max = parseFloat(slider.max);
      var value = parseFloat(slider.value);
      if (!isFinite(min)) min = 0;
      if (!isFinite(max)) max = 100;
      if (!isFinite(value)) value = min;

      var percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
      percent = Math.max(0, Math.min(100, percent));
      slider.style.setProperty("--cos-range-progress", percent.toFixed(3) + "%");

      if (!slider.dataset.cosRangeBound) {
        slider.dataset.cosRangeBound = "true";
        slider.addEventListener("input", function () { syncSlider(slider); });
        slider.addEventListener("change", function () { syncSlider(slider); });
      }
    }

    function applyToRoot(root) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll(RANGE_SELECTOR).forEach(syncSlider);
      if (root.matches && root.matches(RANGE_SELECTOR)) {
        syncSlider(root);
      }
    }

    window.ClassroomOSRangeSkin = function () {
      injectStyle();
      applyToRoot(document);
    };
    window.ClassroomOSKawaiiRangeSkin = window.ClassroomOSRangeSkin;

    window.ClassroomOSRangeSkin();

    if (!window.__classroomosRangeObserver) {
      window.__classroomosRangeObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node && node.nodeType === 1) applyToRoot(node);
          });
          if (mutation.type === "attributes" && mutation.target && mutation.target.matches && mutation.target.matches(RANGE_SELECTOR)) {
            syncSlider(mutation.target);
          }
        });
      });

      window.__classroomosRangeObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["value", "min", "max", "data-range-accent"]
      });
    }

    window.addEventListener("classroomos:lightingchange", function () {
      applyToRoot(document);
    });
  }

  ensureClassroomRangeSkin();

  function injectNavA11yStyles() {
    if (document.getElementById("classroomos-nav-a11y")) return;
    var style = document.createElement("style");
    style.id = "classroomos-nav-a11y";
    style.textContent =
      '.nav-settings-toggle:focus-visible, .site-nav a:focus-visible, .nav-mode-pill:focus-visible, .nav-tone-pill:focus-visible, .nav-theme-chip:focus-visible {' +
        'outline: 2px solid var(--theme-accent, #007aff); outline-offset: 2px;' +
      '}' +
      /* Responsive grid for theme/canvas chips */
      '.nav-theme-grid, .nav-canvas-grid {' +
        'display: grid;' +
        'grid-template-columns: 1fr; /* Single column on narrow screens */' +
        'gap: 0.4rem;' +
      '}' +
      '@media (min-width: 420px) {' +
        '.nav-theme-grid, .nav-canvas-grid { grid-template-columns: 1fr 1fr; } /* Two columns on wider screens */' +
      '}' +
      '.nav-theme-chip.is-active .nav-theme-swatch::after {' +
        'content: "\\2713"; color: #fff; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 0.85em;' +
        'animation: cosThemePop 0.25s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;' +
      '}' +
      '@keyframes cosThemePop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }' +
      '.nav-auto-note {' +
        'display: none; margin: 0.45rem 0 0.1rem; padding: 0.42rem 0.72rem;' +
        'background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.28);' +
        'border-radius: 8px; font-size: 0.77rem; line-height: 1.5;' +
        'color: var(--theme-accent, #92400e);' +
      '}' +
      '[data-theme="night"] .nav-auto-note, [data-lighting="night"] .nav-auto-note { color: #fcd34d; }' +
      '.nav-auto-note.is-visible { display: block; }' +
      '.nav-theme-chip[aria-disabled="true"], .nav-tone-pill[aria-disabled="true"] { cursor: not-allowed; }' +
      '@media (max-width: 1120px) {' +
        '.site-nav {' +
          'transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease, visibility 0s 0.3s;' +
        '}' +
        '.site-nav.is-open {' +
          'transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease, visibility 0s 0s;' +
        '}' +
      '}';
    document.head.appendChild(style);
  }
  injectNavA11yStyles();

  var ICON_MENU = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    '<rect x="2" y="4"  width="16" height="2" rx="1" fill="currentColor"/>' +
    '<rect x="2" y="9"  width="16" height="2" rx="1" fill="currentColor"/>' +
    '<rect x="2" y="14" width="16" height="2" rx="1" fill="currentColor"/>' +
    '</svg>';

  var ICON_CLOSE = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
    '<line x1="4" y1="4"  x2="16" y2="16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    '<line x1="16" y1="4" x2="4"  y2="16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    '</svg>';

  var ICON_SETTINGS = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M8 2.2a.9.9 0 0 1 .9.9v.45a4.7 4.7 0 0 1 1.37.57l.32-.32a.9.9 0 1 1 1.28 1.28l-.32.32c.25.42.44.88.57 1.37h.45a.9.9 0 1 1 0 1.8h-.45a4.7 4.7 0 0 1-.57 1.37l.32.32a.9.9 0 0 1-1.28 1.28l-.32-.32a4.7 4.7 0 0 1-1.37.57v.45a.9.9 0 1 1-1.8 0v-.45a4.7 4.7 0 0 1-1.37-.57l-.32.32a.9.9 0 1 1-1.28-1.28l.32-.32a4.7 4.7 0 0 1-.57-1.37H3.1a.9.9 0 1 1 0-1.8h.45c.13-.49.32-.95.57-1.37l-.32-.32A.9.9 0 0 1 5.08 3.8l.32.32a4.7 4.7 0 0 1 1.37-.57V3.1a.9.9 0 0 1 .9-.9Z" stroke="currentColor" stroke-width="1.15"/>' +
    '<circle cx="8" cy="8" r="2.05" stroke="currentColor" stroke-width="1.15"/>' +
    '</svg>';

  var THEME_OPTIONS = [
    { id: "day",       label: "Day",       detail: "Clean and bright — the default ClassroomOS look.",      tone: "light" },
    { id: "sakura",    label: "Sakura",    detail: "Cherry blossom pink with a soft spring glow.",           tone: "light" },
    { id: "diamond",   label: "Diamond",   detail: "Icy teal blue — crisp, cool, and focused.",             tone: "light" },
    { id: "emerald",   label: "Emerald",   detail: "Fresh leaf green — calm and easy on the eyes.",         tone: "light" },
    { id: "topaz",     label: "Honey",     detail: "Warm amber — like afternoon sunlight through a window.", tone: "light" },
    { id: "goldfish",  label: "Goldfish",  detail: "Saturated goldfish orange with a scale-textured glow.",  tone: "light" },
    { id: "cobblestone", label: "Cobblestone", detail: "Light grey stone tones — quiet and understated.",    tone: "light" },
    { id: "bark",      label: "Bark",      detail: "Warm dark wood tones with a rough bark texture.",       tone: "dark"  },
    { id: "night",     label: "Night",     detail: "Easy on the eyes after dark — full dark mode.",          tone: "dark"  },
    { id: "vaporwave", label: "Vaporwave", detail: "Neon magenta and cyan — retro synthwave vibes.",        tone: "dark"  }
  ];

  var CANVAS_OPTIONS = [
    { id: "none",      label: "None",      detail: "Static background.",          icon: "◻" },
    { id: "mesh",      label: "Mesh",      detail: "Drifting gradient blobs.",    icon: "◉" },
    { id: "particles", label: "Particles", detail: "Connected floating dots.",    icon: "⁕" },
    { id: "aurora",    label: "Aurora",    detail: "Flowing light bands.",        icon: "≋" },
    { id: "petals",    label: "Petals",    detail: "Falling blossoms drifting on the wind.", icon: "❀" },
    { id: "hive",      label: "Bee Hive",  detail: "Bees crawling the hive walls.", icon: "🐝" }
  ];

  var CANVAS_THEME_DEFAULT = { sakura: "petals", topaz: "hive" };

  var STORAGE_CANVAS = "classroomos-canvas-bg";
  var CANVAS_EVENT   = "classroomos:canvasbgchange";

  /* Per-theme picks, e.g. { topaz: "mesh" } — a choice made under one
   * theme shouldn't stick around after switching to another. */
  function readCanvasPrefs() {
    try {
      var parsed = JSON.parse(readStorage(STORAGE_CANVAS));
      return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (e) { return {}; }
  }

  function writeCanvasPref(theme, bg) {
    var prefs = readCanvasPrefs();
    prefs[theme] = bg;
    writeStorage(STORAGE_CANVAS, JSON.stringify(prefs));
  }

  function canvasBgForTheme(theme) {
    return readCanvasPrefs()[theme] || CANVAS_THEME_DEFAULT[theme] || "particles";
  }

  var STORAGE_MODE = "classroomos-lighting-mode";
  var STORAGE_PHASE = "classroomos-lighting-phase";
  var LIGHTING_EVENT = "classroomos:lightingchange";
  var themeScope = (document.documentElement && document.documentElement.dataset.themeScope) ||
    (document.body && document.body.dataset.themeScope) || "";
  var isThemeIndependent = themeScope === "independent";

  var header = document.querySelector(".site-header") || document.querySelector(".topbar");
  if (!header) return;

  var nav = header.querySelector(".site-nav") || header.querySelector("nav");
  if (!nav) return;

  if (!nav.id) nav.id = "primary-nav";

  function normalizePath(path) {
    path = String(path || "").split("#")[0].split("?")[0].replace(/\\/g, "/");
    if (!path) return "index.html";
    if (path.endsWith("/")) path += "index.html";
    if (path.charAt(0) === "/") path = path.slice(1);
    return path || "index.html";
  }

  function syncCurrentNavLink() {
    var currentPath = normalizePath(window.location.pathname);
    var links = nav.querySelectorAll('a[href]');

    links.forEach(function (link) {
      var href = link.getAttribute("href");
      if (!href || href.indexOf("://") !== -1 || href.charAt(0) === "#") return;

      link.removeAttribute("aria-current");

      var resolvedPath = normalizePath(new URL(href, window.location.href).pathname);
      if (resolvedPath === currentPath) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  syncCurrentNavLink();

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-toggle";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", nav.id);
  btn.setAttribute("aria-label", "Open navigation");
  btn.innerHTML = ICON_MENU;
  nav.parentNode.insertBefore(btn, nav);

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

  function isValidTheme(theme) {
    for (var i = 0; i < THEME_OPTIONS.length; i++) {
      if (THEME_OPTIONS[i].id === theme) return true;
    }
    return false;
  }

  function normalizeTheme(theme) {
    if (theme === "morning" || theme === "dusk") return "day";
    if (theme === "kiwi") return "emerald";
    if (theme === "mango") return "topaz";
    return isValidTheme(theme) ? theme : "day";
  }

  function getThemeFromDate(date) {
    if (window.matchMedia) {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches)  return "night";
      if (window.matchMedia("(prefers-color-scheme: light)").matches) return "day";
    }
    var hours = date.getHours();
    return (hours >= 6 && hours < 19) ? "day" : "night";
  }

  function getAutoReason() {
    if (window.matchMedia) {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches)  return "system (dark)";
      if (window.matchMedia("(prefers-color-scheme: light)").matches) return "system (light)";
    }
    return "local time";
  }

  function cosTransition() {
    if (!document.documentElement) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var html = document.documentElement;
    clearTimeout(html._cosThemeTimer);
    html.classList.add("theme-transitioning");
    html._cosThemeTimer = setTimeout(function () {
      html.classList.remove("theme-transitioning");
    }, 260);
  }

  function getLightingForTheme(theme) {
    var normalized = normalizeTheme(theme);
    return (normalized === "night" || normalized === "vaporwave" || normalized === "bark") ? "night" : "day";
  }

  function ensureLightingApi() {
    if (window.ClassroomOSThemeLighting) return window.ClassroomOSThemeLighting;

    var currentTheme = null;

    function getMode() {
      return readStorage(STORAGE_MODE) === "manual" ? "manual" : "auto";
    }

    function getStoredTheme() {
      return normalizeTheme(readStorage(STORAGE_PHASE));
    }

    function resolveTheme() {
      return getMode() === "manual" ? getStoredTheme() : getThemeFromDate(new Date());
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
        event = new CustomEvent(LIGHTING_EVENT, { detail: detail });
      } else {
        event = document.createEvent("CustomEvent");
        event.initCustomEvent(LIGHTING_EVENT, false, false, detail);
      }

      window.dispatchEvent(event);
    }

    function applyTheme(theme) {
      if (isThemeIndependent) {
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

      var lightingMode = getMode();
      var lighting = getLightingForTheme(theme);

      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.themeMode = lightingMode;
      document.documentElement.dataset.lighting = lighting;
      document.documentElement.dataset.lightingMode = lightingMode;
      document.documentElement.setAttribute("data-site-theme", theme);
      document.documentElement.setAttribute("data-site-theme-mode", lightingMode);
      document.documentElement.style.colorScheme = lighting === "night" ? "dark" : "light";

      if (document.body) {
        document.body.dataset.theme = theme;
        document.body.dataset.themeMode = lightingMode;
        document.body.dataset.lighting = lighting;
        document.body.dataset.lightingMode = lightingMode;
      }

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
      writeStorage(STORAGE_PHASE, theme);
      writeStorage(STORAGE_MODE, "manual");
      return sync();
    }

    window.addEventListener("storage", function (event) {
      if (!event || event.key === STORAGE_MODE || event.key === STORAGE_PHASE || event.key === null) {
        sync();
      }
    });

    window.ClassroomOSThemeLighting = {
      getPhase: getThemeFromDate,
      getTheme: getThemeFromDate,
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
      sync: sync
    };

    return window.ClassroomOSThemeLighting;
  }

  function getOptionLabel(optionId) {
    for (var i = 0; i < THEME_OPTIONS.length; i++) {
      if (THEME_OPTIONS[i].id === optionId) return THEME_OPTIONS[i].label;
    }
    return "Day";
  }

  var lighting = isThemeIndependent ? null : ensureLightingApi();

  var settingsContainer = null;
  var settingsToggle = null;
  var settingsPanel = null;
  var settingsCurrent = null;
  var settingsStatus = null;
  var modeControls = null;
  var toneControls = null;
  var themeGrid = null;
  var canvasGrid = null;
  var autoNote = null;
  var trapFocusHandler = null;

  if (!isThemeIndependent) {
    settingsContainer = document.createElement("div");
    settingsContainer.className = "nav-settings nav-settings--lighting";

    var panelId = nav.id + "-settings-panel";
    settingsContainer.innerHTML =
      '<button type="button" class="nav-settings-toggle" aria-expanded="false" aria-haspopup="dialog" aria-controls="' + panelId + '">' +
        ICON_SETTINGS +
        '<span>Settings</span>' +
        '<span class="nav-settings-status" aria-hidden="true"></span>' +
      "</button>" +
      '<div class="nav-settings-panel" id="' + panelId + '" role="dialog" aria-modal="true" aria-label="Theme Settings" hidden>' +
        '<div class="nav-settings-head">' +
          '<p class="nav-settings-eyebrow">Theme Controller</p>' +
          '<p class="nav-settings-current" aria-live="polite"></p>' +
        "</div>" +
        '<p class="nav-settings-note">Move between automatic lighting, quick day or night tones, and the full palette without leaving the page.</p>' +
        '<div class="nav-settings-mode" role="group" aria-label="Theme mode">' +
          '<button type="button" class="nav-mode-pill" data-mode="auto" aria-pressed="false">Auto</button>' +
          '<button type="button" class="nav-mode-pill" data-mode="manual" aria-pressed="false">Manual</button>' +
        '</div>' +
        '<p class="nav-auto-note" role="status" aria-live="polite">Following local time — select <strong>Manual</strong> above to choose a theme.</p>' +
        '<div class="nav-tone-rail" role="group" aria-label="Quick tone">' +
          '<button type="button" class="nav-tone-pill" data-tone="day" aria-label="Use day theme">' +
            '<span class="nav-tone-icon" aria-hidden="true">&#9728;</span>' +
            '<span class="nav-tone-copy">Day</span>' +
          '</button>' +
          '<button type="button" class="nav-tone-pill" data-tone="night" aria-label="Use night theme">' +
            '<span class="nav-tone-icon" aria-hidden="true">&#9789;</span>' +
            '<span class="nav-tone-copy">Night</span>' +
          '</button>' +
        '</div>' +
        '<div class="nav-settings-section">' +
          '<p class="nav-settings-eyebrow">Palette</p>' +
          '<div class="nav-theme-grid" role="list"></div>' +
        '</div>' +
        '<div class="nav-settings-divider"></div>' +
        '<div class="nav-settings-section">' +
          '<p class="nav-settings-eyebrow">Page Background</p>' +
          '<p class="nav-settings-note">Animated canvas behind the site. The choice follows you across shared pages.</p>' +
          '<div class="nav-canvas-grid" role="list"></div>' +
        '</div>' +
      "</div>";

    /* Settings always lives in the nav-wrap row, never inside the hamburger */
    nav.parentNode.appendChild(settingsContainer);

    settingsToggle = settingsContainer.querySelector(".nav-settings-toggle");
    settingsPanel = settingsContainer.querySelector(".nav-settings-panel");
    settingsCurrent = settingsContainer.querySelector(".nav-settings-current");
    settingsStatus = settingsContainer.querySelector(".nav-settings-status");
    modeControls = settingsContainer.querySelector(".nav-settings-mode");
    toneControls = settingsContainer.querySelector(".nav-tone-rail");
    themeGrid = settingsContainer.querySelector(".nav-theme-grid");
    canvasGrid = settingsContainer.querySelector(".nav-canvas-grid");
    autoNote = settingsContainer.querySelector(".nav-auto-note");

    THEME_OPTIONS.forEach(function (option) {
      var optionBtn = document.createElement("button");
      optionBtn.type = "button";
      optionBtn.className = "nav-theme-chip";
      optionBtn.setAttribute("data-theme", option.id);
      optionBtn.setAttribute("data-tone", option.tone || "light");
      optionBtn.setAttribute("role", "listitem");
      optionBtn.setAttribute("aria-label", option.label + " theme \u2014 " + option.detail);
      optionBtn.setAttribute("aria-pressed", "false");
      var toneSymbol = option.tone === "dark" ? "\u25d0" : "\u25cb"; // \u25d0 dark, \u25cb light
      optionBtn.innerHTML =
        '<span class="nav-theme-swatch" aria-hidden="true"></span>' +
        '<span class="nav-theme-label">' +
          "<strong>" + option.label + "</strong>" +
          "<small>" + option.detail + "</small>" +
        "</span>" +
        '<span class="nav-theme-tone" aria-hidden="true" title="' + (option.tone === "dark" ? "Dark" : "Light") + ' theme">' + toneSymbol + "</span>";
      optionBtn.addEventListener("click", function () {
        cosTransition();
        if (typeof lighting.setTheme === "function") lighting.setTheme(option.id);
        else lighting.setPhase(option.id);
        syncLightingUi();
      });
      themeGrid.appendChild(optionBtn);
    });

    // Arrow key navigation across theme chips (WCAG roving focus pattern for radio-group-like grids).
    if (themeGrid) {
      themeGrid.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        var chips = Array.prototype.slice.call(themeGrid.querySelectorAll(".nav-theme-chip:not([disabled])"));
        var idx = chips.indexOf(document.activeElement);
        if (idx === -1) return;
        e.preventDefault();
        var next = (e.key === "ArrowRight" || e.key === "ArrowDown")
          ? chips[(idx + 1) % chips.length]
          : chips[(idx - 1 + chips.length) % chips.length];
        if (next) next.focus();
      });
    }

    if (modeControls) {
      modeControls.querySelectorAll(".nav-mode-pill").forEach(function (button) {
        button.addEventListener("click", function () {
          var nextMode = button.getAttribute("data-mode");
          if (nextMode === "auto") {
            lighting.setMode("auto");
          } else if (typeof lighting.setTheme === "function") {
            lighting.setTheme(lighting.getCurrentTheme());
          } else {
            lighting.setPhase(lighting.getCurrentPhase());
          }
          syncLightingUi();
        });
      });
    }

    if (toneControls) {
      toneControls.querySelectorAll(".nav-tone-pill").forEach(function (button) {
        button.addEventListener("click", function () {
          var tone = button.getAttribute("data-tone");
          if (!tone) return;
          cosTransition();
          if (typeof lighting.setTheme === "function") lighting.setTheme(tone);
          else lighting.setPhase(tone);
          syncLightingUi();
        });
      });
    }

    // Canvas background options
    CANVAS_OPTIONS.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-theme-chip nav-canvas-chip";
      btn.setAttribute("data-canvas-bg", opt.id);
      btn.setAttribute("role", "listitem");
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", opt.label + " canvas background \u2014 " + opt.detail);
      btn.innerHTML =
        '<span class="nav-canvas-icon" aria-hidden="true">' + opt.icon + '</span>' +
        '<span class="nav-theme-label">' +
          "<strong>" + opt.label + "</strong>" +
          "<small>" + opt.detail + "</small>" +
        "</span>";
      btn.addEventListener("click", function () {
        var theme = lighting && typeof lighting.getCurrentTheme === "function"
          ? lighting.getCurrentTheme()
          : (document.documentElement.dataset.theme || "day");
        writeCanvasPref(theme, opt.id);
        // Notify canvas-bg.js if loaded on this page
        if (window.ClassroomOSCanvasBg) window.ClassroomOSCanvasBg.set(opt.id);
        var ev;
        if (typeof window.CustomEvent === "function") {
          ev = new CustomEvent(CANVAS_EVENT, { detail: { bg: opt.id } });
        } else {
          ev = document.createEvent("CustomEvent");
          ev.initCustomEvent(CANVAS_EVENT, false, false, { bg: opt.id });
        }
        window.dispatchEvent(ev);
        syncCanvasUi();
      });
      canvasGrid.appendChild(btn);
    });

    syncCanvasUi();
  }

  function openSettings() {
    if (!settingsContainer) return;
    settingsContainer.classList.add("is-open");
    settingsToggle.setAttribute("aria-expanded", "true");
    settingsPanel.hidden = false;
    var firstInteractive = settingsPanel.querySelector("button");
    if (firstInteractive) firstInteractive.focus();

    // Install focus trap
    trapFocusHandler = function (e) {
      if (e.key !== "Tab" || !settingsPanel || settingsPanel.hidden) return;
      var focusable = Array.prototype.slice.call(
        settingsPanel.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", trapFocusHandler);
  }

  function closeSettings() {
    if (!settingsContainer) return;
    var wasOpen = settingsContainer.classList.contains("is-open");
    settingsContainer.classList.remove("is-open");
    settingsToggle.setAttribute("aria-expanded", "false");
    settingsPanel.hidden = true;
    if (trapFocusHandler) {
      document.removeEventListener("keydown", trapFocusHandler);
      trapFocusHandler = null;
    }
    if (wasOpen && settingsToggle) settingsToggle.focus();
  }

  function updateSettingsUi(mode, activeId) {
    if (!themeGrid) return;
    var themeButtons = themeGrid.querySelectorAll(".nav-theme-chip");
    var modeButtons = modeControls ? modeControls.querySelectorAll(".nav-mode-pill") : [];
    var toneButtons = toneControls ? toneControls.querySelectorAll(".nav-tone-pill") : [];

    if (settingsCurrent) {
      settingsCurrent.textContent = mode === "auto"
        ? "Following " + getAutoReason() + ", currently " + getOptionLabel(activeId)
        : getOptionLabel(activeId);
    }

    if (autoNote) {
      var reason = getAutoReason();
      var isSystemBased = reason.indexOf("system") === 0;
      autoNote.innerHTML = isSystemBased
        ? "Following your <strong>system appearance</strong> — select <strong>Manual</strong> above to choose a theme."
        : "Following <strong>local time</strong> — select <strong>Manual</strong> above to choose a theme.";
    }

    if (settingsStatus) {
      settingsStatus.textContent = getOptionLabel(activeId);
    }

    modeButtons.forEach(function (button) {
      var isActive = button.getAttribute("data-mode") === mode;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("is-active", isActive);
    });

    var isAuto = mode === "auto";

    if (autoNote) {
      autoNote.classList.toggle("is-visible", isAuto);
    }

    toneButtons.forEach(function (button) {
      var tone = button.getAttribute("data-tone");
      var isActive = tone === activeId;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-muted", isAuto && !isActive);
      if (isAuto) {
        button.setAttribute("aria-disabled", "true");
        button.setAttribute("title", "Switch to Manual mode to change the theme");
      } else {
        button.removeAttribute("aria-disabled");
        button.removeAttribute("title");
      }
    });

    themeButtons.forEach(function (button) {
      var isActive = button.getAttribute("data-theme") === activeId;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-muted", isAuto && !isActive);
      if (isAuto) {
        button.setAttribute("aria-disabled", "true");
        button.setAttribute("title", "Switch to Manual mode to change the theme");
      } else {
        button.removeAttribute("aria-disabled");
        button.removeAttribute("title");
      }
    });
  }

  function syncLightingUi() {
    if (!lighting) return;
    var activeId = typeof lighting.sync === "function" ? lighting.sync() : document.documentElement.dataset.theme || "day";
    var mode = typeof lighting.getMode === "function" ? lighting.getMode() : "auto";
    var current = typeof lighting.getCurrentTheme === "function"
      ? lighting.getCurrentTheme()
      : (typeof lighting.getCurrentPhase === "function" ? lighting.getCurrentPhase() : activeId);
    updateSettingsUi(mode, current || activeId);
  }

  function syncCanvasUi() {
    if (!canvasGrid) return;
    var theme = (lighting && typeof lighting.getCurrentTheme === "function")
      ? lighting.getCurrentTheme()
      : (document.documentElement.dataset.theme || "day");
    var stored = canvasBgForTheme(theme);
    var chips = canvasGrid.querySelectorAll(".nav-canvas-chip");
    chips.forEach(function (chip) {
      var isActive = chip.getAttribute("data-canvas-bg") === stored;
      chip.setAttribute("aria-pressed", isActive ? "true" : "false");
      chip.classList.toggle("is-active", isActive);
    });
  }

  function ensureCanvasBackgroundEngine() {
    if (isThemeIndependent || window.ClassroomOSCanvasBg || document.querySelector('script[data-classroomos-canvas-bg="true"]')) return;

    var src = "assets/js/canvas-bg.js";
    var navScript = Array.prototype.slice.call(document.scripts).find(function (script) {
      return /(^|\/)nav-mobile\.js(?:[?#].*)?$/.test(script.getAttribute("src") || script.src || "");
    });

    if (navScript) {
      src = (navScript.getAttribute("src") || navScript.src).replace(/nav-mobile\.js(?:[?#].*)?$/, "canvas-bg.js");
    }

    var script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset.classroomosCanvasBg = "true";
    document.head.appendChild(script);
  }

  function openNav() {
    nav.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-label", "Close navigation");
    btn.innerHTML = ICON_CLOSE;
  }

  function closeNav() {
    nav.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Open navigation");
    btn.innerHTML = ICON_MENU;
    closeSettings();
  }

  btn.addEventListener("click", function () {
    nav.classList.contains("is-open") ? closeNav() : openNav();
  });

  if (settingsToggle) {
    settingsToggle.addEventListener("click", function () {
      settingsContainer.classList.contains("is-open") ? closeSettings() : openSettings();
    });
  }

  document.addEventListener("click", function (e) {
    if (!header.contains(e.target)) {
      closeNav();
      return;
    }

    if (settingsContainer && !settingsContainer.contains(e.target)) closeSettings();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (settingsContainer && settingsContainer.classList.contains("is-open")) {
        closeSettings();
        e.preventDefault();
        e.stopPropagation();
      } else if (nav.classList.contains("is-open")) {
        closeNav();
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });

  if (!isThemeIndependent) {
    window.addEventListener(LIGHTING_EVENT, function (event) {
      if (!event || !event.detail) {
        syncLightingUi();
        syncCanvasUi();
        return;
      }

      updateSettingsUi(event.detail.mode || "auto", event.detail.theme || event.detail.phase || "day");
      syncCanvasUi();
    });

    syncLightingUi();
  }

  ensureCanvasBackgroundEngine();
}());

// ── Nav dropdowns ───────────────────────────────────────────────────
(function () {
  var TINKERCAD_CLASSES = [
    { label: "Microschool",       url: "https://www.tinkercad.com/joinclass/DEATHJGMC" },
    { label: "K-2",               url: "https://www.tinkercad.com/joinclass/KTAE7QDDZ" },
    { label: "2nd Period",        url: "https://www.tinkercad.com/joinclass/TDASB5WIG" },
    { label: "3rd Period",        url: "https://www.tinkercad.com/joinclass/JJHQDD8YD" },
    { label: "Friday Study Hall", url: "https://www.tinkercad.com/joinclass/CWR9GNTKT" },
    { label: "Summer Camp",       url: "https://www.tinkercad.com/joinclass/CHNHTUPI5" }
  ];

  /* Which nav link labels get a dropdown, and what goes inside */
  var DROPDOWN_CONFIG = {
    "Showcase": {
      items: [
        { label: "🎨 Browse All",    href: "showcase.html" },
        { label: "🏫 Class Groups",  action: "cohort-picker" },
        { label: "📐 Tinkercad",     action: "tinkercad-picker" }
      ]
    },
    "Apps": {
      items: [
        { label: "🧩 Scratch",       href: "https://scratch.mit.edu/", external: true },
        { label: "📝 VS Code",       href: "https://vscode.dev/",     external: true },
        { label: "🏫 Code.org",      href: "https://studio.code.org/", external: true },
        { label: "🎵 Music Lab",     href: "https://musiclab.chromeexperiments.com/", external: true },
        { label: "🚶 Pivot",         href: "https://pivotanimator.net/", external: true },
        { divider: true },
        { label: "📐 Tinkercad class…", action: "tinkercad-picker" },
        { divider: true },
        { label: "⬇️ Downloads",      href: "class-downloads.html" },
        { label: "View all apps →",  href: "applications.html" }
      ]
    },
    "Library": {
      items: [
        { label: "📖 Recipe Book",   href: "recipe-book.html" },
        { label: "📚 Classics",      href: "recipe-book.html#section-classics" },
        { divider: true },
        { label: "🎬 Video Library", href: "video-library.html" }
      ]
    }
  };

  /* Open a modal that's already on the current page, or build one on the fly */
  function triggerAction(action) {
    var el = document.getElementById(action);
    if (el) {
      el.hidden = false;
      el.classList.remove("hidden");
      var first = el.querySelector("button, [href], input");
      if (first) first.focus();
      return;
    }

    if (action === "tinkercad-picker") {
      openTinkercadOverlay();
      return;
    }

    /* Fallback: navigate to showcase.html and let it open the modal via hash */
    window.location.href = "showcase.html#" + action;
  }

  function openTinkercadOverlay() {
    /* Remove any stale overlay from a previous open */
    var old = document.getElementById("nav-tinkercad-overlay");
    if (old) old.remove();

    var overlay = document.createElement("section");
    overlay.id = "nav-tinkercad-overlay";
    overlay.className = "class-picker";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "nav-tc-title");

    var backdrop = document.createElement("div");
    backdrop.className = "class-picker-backdrop";

    var panel = document.createElement("div");
    panel.className = "class-picker-panel";
    panel.setAttribute("tabindex", "-1");

    var h2 = document.createElement("h2");
    h2.id = "nav-tc-title";
    h2.textContent = "What class are you in?";

    var p = document.createElement("p");
    p.textContent = "Pick your class to open the correct Tinkercad join code. Then type your name on the next screen.";

    var grid = document.createElement("div");
    grid.className = "class-picker-grid";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "Tinkercad class links");

    TINKERCAD_CLASSES.forEach(function (cls) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = cls.label;
      btn.addEventListener("click", function () {
        window.open(cls.url, "_blank", "noreferrer noopener");
        close();
      });
      grid.appendChild(btn);
    });

    var actions = document.createElement("div");
    actions.className = "class-picker-actions";
    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", close);
    actions.appendChild(cancelBtn);

    panel.appendChild(h2);
    panel.appendChild(p);
    panel.appendChild(grid);
    panel.appendChild(actions);
    overlay.appendChild(backdrop);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    panel.focus();

    backdrop.addEventListener("click", close);

    var onKey = function (e) {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    }
  }

  function buildPanel(items) {
    var panel = document.createElement("div");
    panel.className = "nav-dd-panel";
    panel.setAttribute("role", "menu");

    items.forEach(function (item) {
      if (item.divider) {
        var hr = document.createElement("div");
        hr.className = "nav-dd-divider";
        panel.appendChild(hr);
        return;
      }

      if (item.sub) {
        /* Expandable sub-list (e.g. Tinkercad class picker) */
        var subWrap = document.createElement("div");

        var subBtn = document.createElement("button");
        subBtn.type = "button";
        subBtn.className = "nav-dd-item";
        subBtn.setAttribute("aria-expanded", "false");
        subBtn.textContent = item.label;

        var subList = document.createElement("div");
        subList.className = "nav-dd-sub";
        subList.hidden = true;

        item.sub.forEach(function (s) {
          var a = document.createElement("a");
          a.href = s.url;
          a.target = "_blank";
          a.rel = "noreferrer noopener";
          a.setAttribute("role", "menuitem");
          a.textContent = s.label;
          subList.appendChild(a);
        });

        subBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          var open = !subList.hidden;
          subList.hidden = open;
          subBtn.setAttribute("aria-expanded", String(!open));
        });

        subWrap.appendChild(subBtn);
        subWrap.appendChild(subList);
        panel.appendChild(subWrap);
        return;
      }

      if (item.action) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "nav-dd-item";
        btn.setAttribute("role", "menuitem");
        btn.textContent = item.label;
        btn.addEventListener("click", function () { triggerAction(item.action); });
        panel.appendChild(btn);
        return;
      }

      var a = document.createElement("a");
      a.href = item.href || "#";
      a.setAttribute("role", "menuitem");
      if (item.external) { a.target = "_blank"; a.rel = "noreferrer noopener"; }
      a.textContent = item.label;
      panel.appendChild(a);
    });

    return panel;
  }

  function initDropdowns() {
    var siteNav = document.querySelector(".site-nav");
    if (!siteNav) return;

    var links = siteNav.querySelectorAll("a[href]");
    var openDd = null;

    links.forEach(function (link) {
      var label = link.textContent.trim();
      var config = DROPDOWN_CONFIG[label];
      if (!config) return;

      var li = link.parentNode;
      li.classList.add("nav-dd-wrap");

      /* Replace bare link with trigger button + keep page link on label */
      var trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "nav-dd-trigger";
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      trigger.innerHTML =
        '<a href="' + link.getAttribute("href") + '" class="nav-dd-label"' +
        (link.getAttribute("aria-current") ? ' aria-current="' + link.getAttribute("aria-current") + '"' : '') +
        '>' + label + '</a>' +
        '<span class="nav-dd-caret" aria-hidden="true">▾</span>';

      var panel = buildPanel(config.items);
      li.replaceChild(trigger, link);
      li.appendChild(panel);

      /* Intercept clicks on the label link (navigate) vs caret (open dropdown) */
      trigger.addEventListener("click", function (e) {
        if (e.target.closest(".nav-dd-label")) return; /* let link navigate */
        e.preventDefault();
        var isOpen = li.classList.contains("is-open");
        if (openDd && openDd !== li) {
          openDd.classList.remove("is-open");
          openDd.querySelector(".nav-dd-trigger").setAttribute("aria-expanded", "false");
        }
        li.classList.toggle("is-open", !isOpen);
        trigger.setAttribute("aria-expanded", String(!isOpen));
        openDd = isOpen ? null : li;
      });
    });

    document.addEventListener("click", function (e) {
      if (openDd && !openDd.contains(e.target)) {
        openDd.classList.remove("is-open");
        var t = openDd.querySelector(".nav-dd-trigger");
        if (t) t.setAttribute("aria-expanded", "false");
        openDd = null;
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openDd) {
        openDd.classList.remove("is-open");
        var t = openDd.querySelector(".nav-dd-trigger");
        if (t) { t.setAttribute("aria-expanded", "false"); t.focus(); }
        openDd = null;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDropdowns);
  } else {
    initDropdowns();
  }
}());

// ── Command Palette (Cmd+K / Ctrl+K global search) ──────────────────
(function () {
  var s = document.createElement('script');
  var baseScript = document.currentScript && document.currentScript.src;
  s.src = baseScript ? new URL('command-palette.js', baseScript).href : '/assets/js/command-palette.js';
  s.defer = true;
  document.head.appendChild(s);
}());
