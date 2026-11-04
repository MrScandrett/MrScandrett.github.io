/* Shared fullscreen controls for creation tools, including browser-only fallback. */
(() => {
  'use strict';
  let expanded = null;
  const controls = new Map();
  function resize() {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new CustomEvent('creation-app-resize'));
    });
  }
  function sync() {
    controls.forEach((button, app) => {
      const active = document.fullscreenElement === app || expanded === app;
      button.textContent = active ? 'Exit full screen' : 'Full screen';
      button.setAttribute('aria-pressed', String(active));
    });
    resize();
  }
  function exitExpanded() {
    if (!expanded) return;
    const app = expanded;
    if (app.hidePopover && app.matches(':popover-open')) app.hidePopover();
    app.removeAttribute('popover');
    app.classList.remove('creation-app-expanded');
    expanded = null;
    document.documentElement.classList.remove('creation-app-locked');
    sync();
    controls.get(app).focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-creation-app]').forEach((app, i) => {
    if (!app.id) app.id = `creation-workspace-${i + 1}`;
    const bar = document.createElement('div');
    bar.className = 'creation-app-toolbar';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'creation-app-fullscreen';
    button.textContent = 'Full screen';
    button.setAttribute('aria-controls', app.id);
    button.setAttribute('aria-pressed', 'false');
    controls.set(app, button);
    button.addEventListener('click', async () => {
      if (expanded === app) { exitExpanded(); return; }
      if (document.fullscreenElement === app) {
        await document.exitFullscreen();
        button.focus({ preventScroll: true });
        return;
      }
      if (app.requestFullscreen && document.fullscreenEnabled) {
        try { await app.requestFullscreen(); sync(); return; }
        catch { /* Embedded/mobile browsers can reject fullscreen; expand in-page. */ }
      }
      exitExpanded();
      expanded = app;
      app.classList.add('creation-app-expanded');
      // The top layer keeps sticky site navigation from covering the exit control.
      if (app.showPopover) {
        app.setAttribute('popover', 'manual');
        try { app.showPopover(); }
        catch { app.removeAttribute('popover'); }
      }
      document.documentElement.classList.add('creation-app-locked');
      sync();
    });
    bar.append(button);
    app.prepend(bar);
  });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) { event.preventDefault(); exitExpanded(); }
  });
})();
