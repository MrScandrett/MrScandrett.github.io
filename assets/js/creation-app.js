/* Shared fullscreen controls for creation tools, including browser-only fallback. */
(() => {
  'use strict';
  let expanded = null;
  const controls = new Map();
  let pending = false;
  let returnFocus = null;
  let scrollPosition = null;
  const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  function restoreFocus() {
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    if (scrollPosition) window.scrollTo(...scrollPosition);
    returnFocus = scrollPosition = null;
  }
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
      button.title = active ? 'Exit full screen (Esc)' : 'Full screen (F)';
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
    restoreFocus();
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
    button.title = 'Full screen (F)';
    button.setAttribute('aria-keyshortcuts', 'F');
    button.addEventListener('click', async () => {
      if (pending) return;
      if (expanded === app) { exitExpanded(); return; }
      if (document.fullscreenElement === app) {
        try { await document.exitFullscreen(); } catch { /* Keep the exit control available for retry. */ }
        return;
      }
      exitExpanded();
      returnFocus = document.activeElement;
      scrollPosition = [window.scrollX, window.scrollY];
      if (app.requestFullscreen && document.fullscreenEnabled) {
        pending = true;
        try { await app.requestFullscreen(); button.focus({ preventScroll: true }); sync(); return; }
        catch { /* Embedded/mobile browsers can reject fullscreen; expand in-page. */ }
        finally { pending = false; }
      }
      expanded = app;
      app.classList.add('creation-app-expanded');
      // The top layer keeps sticky site navigation from covering the exit control.
      if (app.showPopover) {
        app.setAttribute('popover', 'manual');
        try { app.showPopover(); }
        catch { app.removeAttribute('popover'); }
      }
      document.documentElement.classList.add('creation-app-locked');
      app.scrollTop = 0;
      button.focus({ preventScroll: true });
      sync();
    });
    bar.append(button);
    app.prepend(bar);
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && !expanded) restoreFocus();
    sync();
  });
  window.visualViewport?.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && expanded) { event.preventDefault(); exitExpanded(); return; }
    // Let individual editors keep their own shortcuts; F only applies to the shared
    // control or workspace itself, never text fields or a nested editor.
    const app = event.target.closest?.('[data-creation-app]');
    if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey && !event.altKey &&
        app && (event.target === app || event.target === controls.get(app))) {
      event.preventDefault(); controls.get(app).click();
    }
    if (event.key === 'Tab' && expanded && !document.querySelector('dialog[open]')) {
      const items = [...expanded.querySelectorAll(focusable)].filter(node => !node.disabled && !node.closest('[inert]') && node.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (event.target === first || !expanded.contains(event.target))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (event.target === last || !expanded.contains(event.target))) {
        event.preventDefault(); first?.focus();
      }
    }
  });
})();
