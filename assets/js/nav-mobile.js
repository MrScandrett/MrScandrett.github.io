/* nav-mobile.js — shared nav controls + appearance settings */
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

  var LEGACY_THEME_OPTIONS = [
    { id: "day", label: "Day" },
    { id: "night", label: "Night" },
    { id: "sakura", label: "Sakura" },
    { id: "cherry", label: "Cherry" },
    { id: "obsidian", label: "Obsidian" },
    { id: "mahogany", label: "Mahogany" },
    { id: "kiwi", label: "Kiwi" },
    { id: "mango", label: "Mango" },
    { id: "diamond", label: "Diamond" }
  ];

  var LIGHTING_OPTIONS = [
    { id: "morning", label: "Morning", detail: "Bright glass and cool forest haze." },
    { id: "day", label: "Day", detail: "Balanced contrast for class launch." },
    { id: "dusk", label: "Dusk", detail: "Warm copper glow through the glass." },
    { id: "night", label: "Night", detail: "Quiet, darker panels with ember highlights." }
  ];

  var STORAGE_MODE = "classroomos-theme-mode";
  var STORAGE_THEME = "classroomos-theme-name";

  var header = document.querySelector(".site-header") || document.querySelector(".topbar");
  if (!header) return;

  var nav = header.querySelector(".site-nav") || header.querySelector("nav");
  if (!nav) return;

  if (!nav.id) nav.id = "primary-nav";

  var isLiquidWoodland = !!(document.body && document.body.classList.contains("theme-liquid-woodland"));
  var optionSet = isLiquidWoodland ? LIGHTING_OPTIONS : LEGACY_THEME_OPTIONS;

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

  function getStoredMode() {
    return readStorage(STORAGE_MODE) === "manual" ? "manual" : "auto";
  }

  function getStoredTheme() {
    var stored = readStorage(STORAGE_THEME) || "diamond";
    for (var i = 0; i < LEGACY_THEME_OPTIONS.length; i++) {
      if (LEGACY_THEME_OPTIONS[i].id === stored) return stored;
    }
    return "diamond";
  }

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
  }

  function getOptionLabel(optionId) {
    for (var i = 0; i < optionSet.length; i++) {
      if (optionSet[i].id === optionId) return optionSet[i].label;
    }
    return isLiquidWoodland ? "Day" : "Diamond";
  }

  function clearLegacyThemeAttrs() {
    document.documentElement.removeAttribute("data-site-theme");
    document.documentElement.removeAttribute("data-site-theme-mode");
    document.documentElement.style.colorScheme = "";
  }

  function getLightingApi() {
    return window.ClassroomOSThemeLighting || null;
  }

  function applyLegacyAppearance() {
    var mode = getStoredMode();
    var theme = mode === "manual" ? getStoredTheme() : getSystemTheme();

    document.documentElement.setAttribute("data-site-theme", theme);
    document.documentElement.setAttribute("data-site-theme-mode", mode);
    document.documentElement.style.colorScheme = (theme === "night" || theme === "obsidian") ? "dark" : "light";
    updateSettingsUi(mode, theme);
  }

  function applyLiquidAppearance() {
    var lighting = getLightingApi();
    var mode = "auto";
    var phase = "day";

    clearLegacyThemeAttrs();

    if (lighting) {
      phase = lighting.sync();
      mode = typeof lighting.getMode === "function" ? lighting.getMode() : "auto";
      phase = typeof lighting.getCurrentPhase === "function" ? lighting.getCurrentPhase() : phase;
    } else if (document.body) {
      phase = document.body.dataset.lighting || "day";
    }

    updateSettingsUi(mode, phase);
  }

  function applyAppearance() {
    if (isLiquidWoodland) applyLiquidAppearance();
    else applyLegacyAppearance();
  }

  var settingsContainer = document.createElement(nav.querySelector("ul") ? "li" : "div");
  settingsContainer.className = "nav-settings" + (isLiquidWoodland ? " nav-settings--lighting" : "");

  var panelId = nav.id + "-settings-panel";
  settingsContainer.innerHTML = isLiquidWoodland
    ? '<button type="button" class="nav-settings-toggle" aria-expanded="false" aria-haspopup="dialog" aria-controls="' + panelId + '">' +
        ICON_SETTINGS +
        '<span>Settings</span>' +
        '<span class="nav-settings-status" aria-hidden="true"></span>' +
      "</button>" +
      '<div class="nav-settings-panel" id="' + panelId + '" hidden>' +
        '<div class="nav-settings-head">' +
          '<p class="nav-settings-eyebrow">Woodland Lighting</p>' +
          '<p class="nav-settings-current" aria-live="polite"></p>' +
        "</div>" +
        '<p class="nav-settings-note">Shift the glass from bright morning clarity to a warmer evening glow.</p>' +
        '<label class="nav-settings-auto">' +
          '<input type="checkbox" class="nav-settings-auto-input" />' +
          "<span>Follow local time</span>" +
        "</label>" +
        '<div class="nav-theme-grid" role="list"></div>' +
      "</div>"
    : '<button type="button" class="nav-settings-toggle" aria-expanded="false" aria-haspopup="dialog" aria-controls="' + panelId + '">' +
        ICON_SETTINGS +
        "<span>Settings</span>" +
      "</button>" +
      '<div class="nav-settings-panel" id="' + panelId + '" hidden>' +
        '<div class="nav-settings-head">' +
          '<p class="nav-settings-eyebrow">Appearance</p>' +
          '<p class="nav-settings-current" aria-live="polite"></p>' +
        "</div>" +
        '<label class="nav-settings-auto">' +
          '<input type="checkbox" class="nav-settings-auto-input" />' +
          "<span>Auto Day/Night</span>" +
        "</label>" +
        '<div class="nav-theme-grid" role="list"></div>' +
      "</div>";

  var navList = nav.querySelector("ul");
  if (navList) navList.appendChild(settingsContainer);
  else nav.appendChild(settingsContainer);

  var settingsToggle = settingsContainer.querySelector(".nav-settings-toggle");
  var settingsPanel = settingsContainer.querySelector(".nav-settings-panel");
  var settingsCurrent = settingsContainer.querySelector(".nav-settings-current");
  var settingsStatus = settingsContainer.querySelector(".nav-settings-status");
  var autoInput = settingsContainer.querySelector(".nav-settings-auto-input");
  var themeGrid = settingsContainer.querySelector(".nav-theme-grid");

  optionSet.forEach(function (option) {
    var optionBtn = document.createElement("button");
    optionBtn.type = "button";
    optionBtn.className = "nav-theme-chip";
    optionBtn.setAttribute("data-theme", option.id);
    optionBtn.setAttribute("role", "listitem");
    optionBtn.innerHTML = isLiquidWoodland
      ? '<span class="nav-theme-swatch" aria-hidden="true"></span>' +
        '<span class="nav-theme-label">' +
          "<strong>" + option.label + "</strong>" +
          "<small>" + option.detail + "</small>" +
        "</span>"
      : '<span class="nav-theme-swatch" aria-hidden="true"></span>' +
        "<span>" + option.label + "</span>";
    optionBtn.addEventListener("click", function () {
      if (isLiquidWoodland) {
        var lighting = getLightingApi();
        if (lighting && typeof lighting.setPhase === "function") {
          lighting.setPhase(option.id);
          updateSettingsUi(lighting.getMode(), lighting.getCurrentPhase());
        }
      } else {
        writeStorage(STORAGE_THEME, option.id);
        writeStorage(STORAGE_MODE, "manual");
        applyLegacyAppearance();
      }
    });
    themeGrid.appendChild(optionBtn);
  });

  function openSettings() {
    settingsContainer.classList.add("is-open");
    settingsToggle.setAttribute("aria-expanded", "true");
    settingsPanel.hidden = false;
  }

  function closeSettings() {
    settingsContainer.classList.remove("is-open");
    settingsToggle.setAttribute("aria-expanded", "false");
    settingsPanel.hidden = true;
  }

  function updateSettingsUi(mode, activeId) {
    var themeButtons = themeGrid.querySelectorAll(".nav-theme-chip");

    if (settingsCurrent) {
      settingsCurrent.textContent = isLiquidWoodland
        ? (mode === "auto" ? "Auto lighting, currently " + getOptionLabel(activeId) : "Pinned to " + getOptionLabel(activeId))
        : (mode === "auto" ? "Following system: " + getOptionLabel(activeId) : "Current theme: " + getOptionLabel(activeId));
    }

    if (settingsStatus) {
      settingsStatus.textContent = mode === "auto" ? getOptionLabel(activeId) : "Pinned";
    }

    if (autoInput) autoInput.checked = mode === "auto";

    themeButtons.forEach(function (button) {
      var isActive = button.getAttribute("data-theme") === activeId;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-muted", mode === "auto" && !isActive);
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

  settingsToggle.addEventListener("click", function () {
    settingsContainer.classList.contains("is-open") ? closeSettings() : openSettings();
  });

  autoInput.addEventListener("change", function () {
    if (isLiquidWoodland) {
      var lighting = getLightingApi();
      if (lighting && typeof lighting.setMode === "function") {
        if (autoInput.checked) lighting.setMode("auto");
        else if (typeof lighting.setPhase === "function") lighting.setPhase(lighting.getCurrentPhase());
        updateSettingsUi(lighting.getMode(), lighting.getCurrentPhase());
      }
    } else {
      writeStorage(STORAGE_MODE, autoInput.checked ? "auto" : "manual");
      applyLegacyAppearance();
    }
  });

  document.addEventListener("click", function (e) {
    if (!header.contains(e.target)) {
      closeNav();
      return;
    }

    if (!settingsContainer.contains(e.target)) closeSettings();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeSettings();
      closeNav();
    }
  });

  if (!isLiquidWoodland) {
    var mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSchemeChange() {
      if (getStoredMode() === "auto") applyLegacyAppearance();
    }

    if (typeof mediaQuery.addEventListener === "function") mediaQuery.addEventListener("change", handleSchemeChange);
    else if (typeof mediaQuery.addListener === "function") mediaQuery.addListener(handleSchemeChange);
  }

  applyAppearance();
}());
