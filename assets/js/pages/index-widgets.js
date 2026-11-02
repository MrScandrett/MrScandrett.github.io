/* Load optional homepage tools as they approach the screen. Keep each group's
   scripts in order (Live Sky must subscribe before weather starts fetching). */
(function () {
  'use strict';
  const groups = new Map();
  const scripts = new Map();
  document.querySelectorAll('script[data-home-src]').forEach(template => {
    const root = document.querySelector(template.dataset.homeWidget);
    if (!root) return;
    if (!groups.has(root)) groups.set(root, { templates: [], pending: null, loaded: false });
    groups.get(root).templates.push(template);
  });

  function available(root) {
    return !document.hidden && !root.closest('[hidden], details:not([open])') && root.getClientRects().length > 0;
  }

  function loadScript(template) {
    const src = template.dataset.homeSrc;
    if (!scripts.has(src)) {
      scripts.set(src, new Promise((resolve, reject) => {
        const script = document.createElement('script');
        if (template.type === 'module') script.type = 'module';
        script.src = src;
        script.onload = resolve;
        script.onerror = () => { scripts.delete(src); script.remove(); reject(new Error(src)); };
        document.head.append(script);
      }));
    }
    return scripts.get(src);
  }

  async function load(root) {
    const group = groups.get(root);
    if (group.loaded || group.pending || !available(root)) return;
    group.pending = (async () => {
      try {
        for (const template of group.templates) await loadScript(template);
        group.loaded = true;
        if (observer) observer.unobserve(root);
        document.dispatchEvent(new CustomEvent('home-widgetready', { detail: { root } }));
      } catch {
        // Retry only on request; keep the widget's existing fallback available.
        if (!group.retry) {
          group.retry = document.createElement('button');
          group.retry.type = 'button';
          group.retry.textContent = 'Couldn’t load this widget. Try again';
          group.retry.addEventListener('click', () => load(root));
          root.append(group.retry);
        }
      } finally {
        group.pending = null;
        if (group.loaded && group.retry) group.retry.remove();
      }
    })();
    await group.pending;
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) load(entry.target); });
  }, { rootMargin: '200px' }) : null;

  function scan() {
    groups.forEach((group, root) => {
      if (group.loaded || group.retry || !available(root)) return;
      const rect = root.getBoundingClientRect();
      if (!observer || (rect.bottom >= -200 && rect.top <= innerHeight + 200)) load(root);
    });
  }
  groups.forEach((group, root) => { if (observer) observer.observe(root); });
  document.addEventListener('home-tabchange', scan);
  document.addEventListener('toggle', scan, true);
  document.addEventListener('visibilitychange', scan);
  window.addEventListener('pageshow', scan);
  scan();
})();
