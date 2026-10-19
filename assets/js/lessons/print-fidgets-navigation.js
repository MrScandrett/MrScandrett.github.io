(() => {
  const nav = document.querySelector('.pf-wayfinder');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const targets = links.map(link => document.getElementById(link.hash.slice(1)));

  function reveal(hash) {
    const target = document.getElementById(hash.slice(1));
    if (!target) return null;
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    return target;
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const target = reveal(link.hash);
      if (!target) return;
      event.preventDefault();
      history.pushState(null, '', link.hash);
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    });
  });

  function updateCurrent() {
    let current = 0;
    targets.forEach((target, index) => {
      if (target?.getClientRects().length && target.getBoundingClientRect().top <= nav.offsetHeight + 120) current = index;
    });
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  let pending = false;
  window.addEventListener('scroll', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; updateCurrent(); });
  }, { passive: true });
  window.addEventListener('hashchange', () => {
    const target = reveal(location.hash);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  });
  if (location.hash) {
    const target = reveal(location.hash);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  updateCurrent();
})();
