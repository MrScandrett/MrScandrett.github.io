/* nav-mobile.js — shared nav controls + universal lighting settings */
(function () {
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
    { id: "topaz", label: "Topaz", detail: "A warm orange gemstone wash." }
  ];

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
    return normalizeTheme(theme) === "night" ? "night" : "day";
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
  var autoInput = null;
  var themeGrid = null;

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
      '<div class="nav-settings-panel" id="' + panelId + '" hidden>' +
        '<div class="nav-settings-head">' +
          '<p class="nav-settings-eyebrow">Theme</p>' +
          '<p class="nav-settings-current" aria-live="polite"></p>' +
        "</div>" +
        '<p class="nav-settings-note">Choose a theme, or follow local time to switch between Day and Night automatically.</p>' +
        '<label class="nav-settings-auto">' +
          '<input type="checkbox" class="nav-settings-auto-input" />' +
          "<span>Follow local time</span>" +
        "</label>" +
        '<div class="nav-theme-grid" role="list"></div>' +
      "</div>";

    var navList = nav.querySelector("ul");
    if (navList) navList.appendChild(settingsContainer);
    else nav.appendChild(settingsContainer);

    settingsToggle = settingsContainer.querySelector(".nav-settings-toggle");
    settingsPanel = settingsContainer.querySelector(".nav-settings-panel");
    settingsCurrent = settingsContainer.querySelector(".nav-settings-current");
    settingsStatus = settingsContainer.querySelector(".nav-settings-status");
    autoInput = settingsContainer.querySelector(".nav-settings-auto-input");
    themeGrid = settingsContainer.querySelector(".nav-theme-grid");

    THEME_OPTIONS.forEach(function (option) {
      var optionBtn = document.createElement("button");
      optionBtn.type = "button";
      optionBtn.className = "nav-theme-chip";
      optionBtn.setAttribute("data-theme", option.id);
      optionBtn.setAttribute("role", "listitem");
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
  }

  function openSettings() {
    if (!settingsContainer) return;
    settingsContainer.classList.add("is-open");
    settingsToggle.setAttribute("aria-expanded", "true");
    settingsPanel.hidden = false;
  }

  function closeSettings() {
    if (!settingsContainer) return;
    settingsContainer.classList.remove("is-open");
    settingsToggle.setAttribute("aria-expanded", "false");
    settingsPanel.hidden = true;
  }

  function updateSettingsUi(mode, activeId) {
    if (!themeGrid) return;
    var themeButtons = themeGrid.querySelectorAll(".nav-theme-chip");

    if (settingsCurrent) {
      settingsCurrent.textContent = mode === "auto"
        ? "Following local time, currently " + getOptionLabel(activeId)
        : getOptionLabel(activeId);
    }

    if (settingsStatus) {
      settingsStatus.textContent = getOptionLabel(activeId);
    }

    if (autoInput) autoInput.checked = mode === "auto";

    themeButtons.forEach(function (button) {
      var isActive = button.getAttribute("data-theme") === activeId;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-muted", mode === "auto" && !isActive);
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

  if (autoInput) {
    autoInput.addEventListener("change", function () {
      if (autoInput.checked) lighting.setMode("auto");
      else if (typeof lighting.setTheme === "function") lighting.setTheme(lighting.getCurrentTheme());
      else lighting.setPhase(lighting.getCurrentPhase());
      syncLightingUi();
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
      closeSettings();
      closeNav();
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
