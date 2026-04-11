/* nav-mobile.js — shared nav controls + universal lighting settings */
(function () {
  function ensureKawaiiRangeSkin() {
    if (window.ClassroomOSKawaiiRangeSkin) {
      window.ClassroomOSKawaiiRangeSkin();
      return;
    }

    var STYLE_ID = "classroomos-kawaii-range-style";
    var RANGE_SELECTOR = 'input[type="range"]';
    var RANGE_CLASS = "cos-kawaii-range";

    function injectStyle() {
      if (document.getElementById(STYLE_ID)) return;

      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent =
        '.rangeWrapper{display:flex;flex-direction:column;justify-content:space-evenly;align-items:center;height:100%;}' +
        'input[type="range"].' + RANGE_CLASS + '{' +
          '--base:#fe8ce4;' +
          '--light:color-mix(in sRGB,var(--base) 60%,#fff);' +
          '--lighter:color-mix(in sRGB,var(--base) 30%,#fff);' +
          '--dark:color-mix(in sRGB,var(--base) 95%,#000);' +
          '--transparent:color-mix(in sRGB,var(--base) 0%,#0000);' +
          'appearance:none;-webkit-appearance:none;font-size:clamp(12px,1rem,16px);' +
          'width:100%;max-width:100%;height:2em;padding:0;border:0.38em solid #fff;border-radius:2em;' +
          'background:transparent;box-shadow:0 0 1em #0001,0 0.25em 0.5em #0001;overflow:hidden;cursor:pointer;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':focus-visible{outline:2px solid color-mix(in sRGB,var(--base) 65%,#fff);outline-offset:4px;}' +
        'input[type="range"].' + RANGE_CLASS + '::-webkit-slider-runnable-track{' +
          'background:' +
            'radial-gradient(circle at 0.75em 0.6em,var(--light) calc(0.2em - 1px),#0000 0.2em),' +
            'radial-gradient(circle at 1.25em 0.6em,var(--light) calc(0.2em - 1px),#0000 0.2em),' +
            'radial-gradient(circle at 5em 0.6em,var(--light) calc(0.2em - 1px),#0000 0.2em),' +
            'linear-gradient(var(--light) 0 0) 1.25em 0.4em / 3.75em calc(0.4em - 0.5px) no-repeat,' +
            'linear-gradient(90deg,var(--base),var(--transparent) 1em),' +
            'linear-gradient(#0000 70%,var(--dark) 80%),' +
            'var(--base);' +
          'border-radius:2em;height:100%;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-webkit-slider-thumb{' +
          'appearance:none;-webkit-appearance:none;height:2em;width:2em;margin-top:0;color:var(--lighter);' +
          'background:' +
            'radial-gradient(circle at 0.75em 0.6em,var(--light) calc(0.2em - 1px),#0000 0.2em),' +
            'linear-gradient(90deg,#0000 0.75em,var(--base) 0) 0 0 / 100% 50% no-repeat;' +
          'border:none;border-radius:50%;' +
          'box-shadow:' +
            'inset -0.5em 0 0.5em -0.25em var(--base),' +
            '1em 0 0 0.25em,2em 0 0 0.25em,3em 0 0 0.25em,4em 0 0 0.25em,5em 0 0 0.25em,' +
            '6em 0 0 0.25em,7em 0 0 0.25em,8em 0 0 0.25em,9em 0 0 0.25em,10em 0 0 0.25em,' +
            '11em 0 0 0.25em,12em 0 0 0.25em,13em 0 0 0.25em,14em 0 0 0.25em,15em 0 0 0.25em,' +
            '16em 0 0 0.25em,17em 0 0 0.25em,18em 0 0 0.25em,19em 0 0 0.25em;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-moz-range-track{' +
          'background:' +
            'radial-gradient(circle at 0.75em 30%,var(--light) calc(0.2em - 1px),#0000 0.2em),' +
            'radial-gradient(circle at 1.5em 30%,var(--light) calc(0.2em - 1px),#0000 0.2em),' +
            'radial-gradient(circle at 5.5em 30%,var(--light) calc(0.2em - 1px),#0000 0.2em),' +
            'linear-gradient(var(--light) 0 0) 1.5em calc(15% + 0.18em) / 4em calc(0.4em - 0.5px) no-repeat,' +
            'linear-gradient(90deg,var(--base),var(--transparent) 1em),' +
            'linear-gradient(var(--transparent) 70%,var(--dark) 80%),' +
            'var(--base);' +
          'border:none;border-radius:2em;height:100%;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-moz-range-thumb{' +
          'appearance:none;height:2em;width:2em;border:0;color:var(--lighter);' +
          'background:' +
            'radial-gradient(circle at 0.75em 0.6em,var(--light) calc(0.2em - 1px),#0000 0.2em),' +
            'linear-gradient(90deg,var(--transparent) 0.75em,var(--base) 0) 0 0 / 100% 50% no-repeat;' +
          'border-radius:50% 0 50% 50% 0;' +
          'box-shadow:' +
            'inset -0.5em 0 0.5em -0.25em var(--base),' +
            '1em 0 0 0.25em,2em 0 0 0.25em,3em 0 0 0.25em,4em 0 0 0.25em,5em 0 0 0.25em,' +
            '6em 0 0 0.25em,7em 0 0 0.25em,8em 0 0 0.25em,9em 0 0 0.25em,10em 0 0 0.25em,' +
            '11em 0 0 0.25em,12em 0 0 0.25em,13em 0 0 0.25em,14em 0 0 0.25em,15em 0 0 0.25em,' +
            '16em 0 0 0.25em,17em 0 0 0.25em,18em 0 0 0.25em,19em 0 0 0.25em;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-moz-range-progress{' +
          'background:transparent;height:100%;border-radius:2em;' +
        '}';
      document.head.appendChild(style);
    }

    function syncSliderAccent(slider) {
      if (!slider || slider.dataset.rangeSkin === "native") return;

      slider.classList.add(RANGE_CLASS);

      if (!slider.style.getPropertyValue("--base")) {
        var accent = window.getComputedStyle(slider).accentColor;
        if (accent && accent !== "auto") {
          slider.style.setProperty("--base", accent);
        }
      }
    }

    function applyToRoot(root) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll(RANGE_SELECTOR).forEach(syncSliderAccent);
      if (root.matches && root.matches(RANGE_SELECTOR)) {
        syncSliderAccent(root);
      }
    }

    window.ClassroomOSKawaiiRangeSkin = function () {
      injectStyle();
      applyToRoot(document);
    };

    window.ClassroomOSKawaiiRangeSkin();

    if (!window.__classroomosKawaiiRangeObserver) {
      window.__classroomosKawaiiRangeObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node && node.nodeType === 1) applyToRoot(node);
          });
        });
      });

      window.__classroomosKawaiiRangeObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  ensureKawaiiRangeSkin();

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
      '@media (max-width: 768px) {' +
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
    { id: "day", label: "Day", detail: "Default bright ClassroomOS look." },
    { id: "night", label: "Night", detail: "A darker version for evening use." },
    { id: "sakura", label: "Sakura", detail: "Soft pink and white with cherry blossom drift." },
    { id: "diamond", label: "Diamond", detail: "An icy light blue gemstone glow." },
    { id: "emerald", label: "Emerald", detail: "A pale green gemstone shine." },
    { id: "topaz", label: "Honey", detail: "Sunlit amber with a bright hive glow." },
    { id: "vaporwave", label: "Vaporwave", detail: "Broken VHS neon with a corrupted rainbow horizon." }
  ];

  var CANVAS_OPTIONS = [
    { id: "none",      label: "None",      detail: "Static background.",          icon: "◻" },
    { id: "mesh",      label: "Mesh",      detail: "Drifting gradient blobs.",    icon: "◉" },
    { id: "particles", label: "Particles", detail: "Connected floating dots.",    icon: "⁕" },
    { id: "aurora",    label: "Aurora",    detail: "Flowing light bands.",        icon: "≋" }
  ];

  var STORAGE_CANVAS = "classroomos-canvas-bg";
  var CANVAS_EVENT   = "classroomos:canvasbgchange";

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
    var hours = date.getHours();
    return (hours >= 6 && hours < 19) ? "day" : "night";
  }

  function getLightingForTheme(theme) {
    var normalized = normalizeTheme(theme);
    return (normalized === "night" || normalized === "diamond" || normalized === "vaporwave") ? "night" : "day";
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
    settingsContainer = document.createElement(nav.querySelector("ul") ? "li" : "div");
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
          '<p class="nav-settings-eyebrow">Home Background</p>' +
          '<p class="nav-settings-note">Animated canvas on the home page hero. Has no effect on other pages.</p>' +
          '<div class="nav-canvas-grid" role="list"></div>' +
        '</div>' +
      "</div>";

    var navList = nav.querySelector("ul");
    if (navList) navList.appendChild(settingsContainer);
    else nav.appendChild(settingsContainer);

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
      optionBtn.setAttribute("role", "listitem");
      optionBtn.setAttribute("aria-label", option.label + " theme \u2014 " + option.detail);
      optionBtn.setAttribute("aria-pressed", "false");
      optionBtn.innerHTML =
        '<span class="nav-theme-swatch" aria-hidden="true"></span>' +
        '<span class="nav-theme-label">' +
          "<strong>" + option.label + "</strong>" +
          "<small>" + option.detail + "</small>" +
        "</span>";
      optionBtn.addEventListener("click", function () {
        if (typeof lighting.setTheme === "function") lighting.setTheme(option.id);
        else lighting.setPhase(option.id);
        syncLightingUi();
      });
      themeGrid.appendChild(optionBtn);
    });

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
        try { localStorage.setItem(STORAGE_CANVAS, opt.id); } catch (e) {}
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
        ? "Following local time, currently " + getOptionLabel(activeId)
        : getOptionLabel(activeId);
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
    var stored;
    try { stored = localStorage.getItem(STORAGE_CANVAS) || "particles"; } catch (e) { stored = "particles"; }
    var chips = canvasGrid.querySelectorAll(".nav-canvas-chip");
    chips.forEach(function (chip) {
      var isActive = chip.getAttribute("data-canvas-bg") === stored;
      chip.setAttribute("aria-pressed", isActive ? "true" : "false");
      chip.classList.toggle("is-active", isActive);
    });
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
        return;
      }

      updateSettingsUi(event.detail.mode || "auto", event.detail.theme || event.detail.phase || "day");
    });

    syncLightingUi();
  }
}());

// ── Command Palette (Cmd+K / Ctrl+K global search) ──────────────────
(function () {
  var s = document.createElement('script');
  var isSubdir = location.pathname.includes('/lessons/') || location.pathname.includes('/projects/');
  s.src = (isSubdir ? '../' : '') + 'assets/js/command-palette.js';
  s.defer = true;
  document.head.appendChild(s);
}());
