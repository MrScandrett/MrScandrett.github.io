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

  var THEME_OPTIONS = [
    { id: 'day', label: 'Day' },
    { id: 'night', label: 'Night' },
    { id: 'sakura', label: 'Sakura' },
    { id: 'cherry', label: 'Cherry' },
    { id: 'obsidian', label: 'Obsidian' },
    { id: 'mahogany', label: 'Mahogany' },
    { id: 'kiwi', label: 'Kiwi' },
    { id: 'mango', label: 'Mango' },
    { id: 'diamond', label: 'Diamond' }
  ];

  var STORAGE_MODE = 'classroomos-theme-mode';
  var STORAGE_THEME = 'classroomos-theme-name';

  var header = document.querySelector('.site-header') || document.querySelector('.topbar');
  if (!header) return;

  var nav = header.querySelector('.site-nav') || header.querySelector('nav');
  if (!nav) return;

  if (!nav.id) nav.id = 'primary-nav';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', nav.id);
  btn.setAttribute('aria-label', 'Open navigation');
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
    return readStorage(STORAGE_MODE) === 'manual' ? 'manual' : 'auto';
  }

  function getStoredTheme() {
    var stored = readStorage(STORAGE_THEME) || 'diamond';
    for (var i = 0; i < THEME_OPTIONS.length; i++) {
      if (THEME_OPTIONS[i].id === stored) return stored;
    }
    return 'diamond';
  }

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
  }

  function getThemeLabel(themeId) {
    for (var i = 0; i < THEME_OPTIONS.length; i++) {
      if (THEME_OPTIONS[i].id === themeId) return THEME_OPTIONS[i].label;
    }
    return 'Day';
  }

  function applyTheme() {
    var mode = getStoredMode();
    var theme = mode === 'manual' ? getStoredTheme() : getSystemTheme();
    document.documentElement.setAttribute('data-site-theme', theme);
    document.documentElement.setAttribute('data-site-theme-mode', mode);
    document.documentElement.style.colorScheme = (theme === 'night' || theme === 'obsidian') ? 'dark' : 'light';
    updateSettingsUi(mode, theme);
  }

  function setMode(mode) {
    writeStorage(STORAGE_MODE, mode === 'manual' ? 'manual' : 'auto');
    applyTheme();
  }

  function setTheme(themeId) {
    writeStorage(STORAGE_THEME, themeId);
    writeStorage(STORAGE_MODE, 'manual');
    applyTheme();
  }

  var settingsContainer = document.createElement(nav.querySelector('ul') ? 'li' : 'div');
  settingsContainer.className = 'nav-settings';

  settingsContainer.innerHTML =
    '<button type="button" class="nav-settings-toggle" aria-expanded="false" aria-haspopup="true">' +
      ICON_SETTINGS +
      '<span>Settings</span>' +
    '</button>' +
    '<div class="nav-settings-panel" hidden>' +
      '<div class="nav-settings-head">' +
        '<p class="nav-settings-eyebrow">Appearance</p>' +
        '<p class="nav-settings-current" aria-live="polite"></p>' +
      '</div>' +
      '<label class="nav-settings-auto">' +
        '<input type="checkbox" class="nav-settings-auto-input" />' +
        '<span>Auto Day/Night</span>' +
      '</label>' +
      '<div class="nav-theme-grid" role="list"></div>' +
    '</div>';

  var navList = nav.querySelector('ul');
  if (navList) navList.appendChild(settingsContainer);
  else nav.appendChild(settingsContainer);

  var settingsToggle = settingsContainer.querySelector('.nav-settings-toggle');
  var settingsPanel = settingsContainer.querySelector('.nav-settings-panel');
  var settingsCurrent = settingsContainer.querySelector('.nav-settings-current');
  var autoInput = settingsContainer.querySelector('.nav-settings-auto-input');
  var themeGrid = settingsContainer.querySelector('.nav-theme-grid');

  THEME_OPTIONS.forEach(function (theme) {
    var themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'nav-theme-chip';
    themeBtn.setAttribute('data-theme', theme.id);
    themeBtn.setAttribute('role', 'listitem');
    themeBtn.innerHTML =
      '<span class="nav-theme-swatch" aria-hidden="true"></span>' +
      '<span>' + theme.label + '</span>';
    themeBtn.addEventListener('click', function () {
      setTheme(theme.id);
    });
    themeGrid.appendChild(themeBtn);
  });

  function openSettings() {
    settingsContainer.classList.add('is-open');
    settingsToggle.setAttribute('aria-expanded', 'true');
    settingsPanel.hidden = false;
  }

  function closeSettings() {
    settingsContainer.classList.remove('is-open');
    settingsToggle.setAttribute('aria-expanded', 'false');
    settingsPanel.hidden = true;
  }

  function updateSettingsUi(mode, activeTheme) {
    if (settingsCurrent) {
      settingsCurrent.textContent = mode === 'auto'
        ? 'Following system: ' + getThemeLabel(activeTheme)
        : 'Current theme: ' + getThemeLabel(activeTheme);
    }
    if (autoInput) autoInput.checked = mode === 'auto';

    var themeButtons = themeGrid.querySelectorAll('.nav-theme-chip');
    themeButtons.forEach(function (button) {
      var isActive = button.getAttribute('data-theme') === activeTheme;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.classList.toggle('is-active', isActive);
      button.classList.toggle('is-muted', mode === 'auto' && !isActive);
    });
  }

  function openNav() {
    nav.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close navigation');
    btn.innerHTML = ICON_CLOSE;
  }

  function closeNav() {
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open navigation');
    btn.innerHTML = ICON_MENU;
    closeSettings();
  }

  btn.addEventListener('click', function () {
    nav.classList.contains('is-open') ? closeNav() : openNav();
  });

  settingsToggle.addEventListener('click', function () {
    settingsContainer.classList.contains('is-open') ? closeSettings() : openSettings();
  });

  autoInput.addEventListener('change', function () {
    setMode(autoInput.checked ? 'auto' : 'manual');
  });

  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) {
      closeNav();
      return;
    }

    if (!settingsContainer.contains(e.target)) closeSettings();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeSettings();
      closeNav();
    }
  });

  var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  function handleSchemeChange() {
    if (getStoredMode() === 'auto') applyTheme();
  }

  if (typeof mediaQuery.addEventListener === 'function') mediaQuery.addEventListener('change', handleSchemeChange);
  else if (typeof mediaQuery.addListener === 'function') mediaQuery.addListener(handleSchemeChange);

  applyTheme();
}());
