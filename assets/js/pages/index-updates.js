(() => {
  const key = 'classroomos-updates-filter';
  const allowed = ['all', 'lesson', 'updated', 'game'];
  document.querySelectorAll('[data-updates-panel]').forEach(panel => {
    const entries = [...panel.querySelectorAll('[data-update-type]')];
    const buttons = [...panel.querySelectorAll('[data-updates-filter]')];
    const desktopLimit = Number(panel.dataset.updatesLimit) || Infinity;
    const compact = panel.dataset.updatesLimit ? matchMedia('(max-width: 560px)') : null;
    const today = new Date();
    const dayNumber = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
    entries.forEach(entry => {
      const time = entry.querySelector('time');
      const date = new Date(`${time.dateTime}T12:00:00`);
      if (!Number.isFinite(date.getTime())) return;
      const days = dayNumber(today) - dayNumber(date);
      time.title = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      time.textContent = days === 0 ? 'today' : days === 1 ? 'yesterday' : days > 1 && days < 7 ? `${days} days ago` : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) });
    });
    function apply(filter) {
      let count = 0;
      const limit = compact?.matches ? 3 : desktopLimit;
      entries.forEach(entry => {
        const matches = filter === 'all' || entry.dataset.updateType === filter;
        entry.hidden = !matches || ++count > limit;
      });
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.updatesFilter === filter)));
      panel.querySelector('.updates-status').textContent = count ? '' : 'No updates in this category yet.';
    }
    let saved = 'all';
    try { saved = localStorage.getItem(key) || 'all'; } catch {}
    panel.dataset.updatesReady = '';
    apply(allowed.includes(saved) ? saved : 'all');
    compact?.addEventListener('change', () => {
      const active = buttons.find(button => button.getAttribute('aria-pressed') === 'true');
      apply(active?.dataset.updatesFilter || 'all');
    });
    panel.querySelector('.updates-filters').hidden = false;
    buttons.forEach(button => button.addEventListener('click', () => {
      apply(button.dataset.updatesFilter);
      try { localStorage.setItem(key, button.dataset.updatesFilter); } catch {}
    }));
  });
})();
