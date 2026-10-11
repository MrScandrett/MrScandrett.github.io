/* Weather Watch — phone "app mode".
 * On narrow screens the lesson becomes a tabbed weather app: one screen at a time
 * (Now / Drive / Wear / Labs / Quiz) instead of eight stacked sections. Labs is a menu
 * that opens one lab at a time. Purely a view layer: it reads what weather-watch.js
 * already renders and never changes data. Desktop is untouched (no `ww-app` class). */
(function () {
  'use strict';

  const page = document.querySelector('.ww-page');
  if (!page) return;

  const mq = window.matchMedia('(max-width: 700px)');
  const scroller = document.querySelector('.ll-sim');
  const $ = (id) => document.getElementById(id);

  const TABS = [
    { id: 'now',   icon: '🌤️', label: 'Now',   sections: ['cockpit'] },
    { id: 'drive', icon: '🚗', label: 'Drive', sections: ['driving'] },
    { id: 'wear',  icon: '🧥', label: 'Wear',  sections: ['clothing'] },
    { id: 'labs',  icon: '🔬', label: 'Labs',  sections: ['fronts', 'clouds', 'precipitation-lab', 'severe'] },
    { id: 'quiz',  icon: '🎯', label: 'Quiz',  sections: ['quiz'] }
  ];
  const LAB_ICONS = { fronts: '🌀', clouds: '☁️', 'precipitation-lab': '❄️', severe: '🛰️' };
  const tabOfSection = {};
  TABS.forEach((t) => t.sections.forEach((s) => { tabOfSection[s] = t.id; }));

  let tab = 'now';
  let lab = null;

  // ── chrome: mini header, lab menu, tab bar ──────────────────────────────────
  const mini = document.createElement('div');
  mini.className = 'ww-appmini';
  mini.innerHTML = '<span class="ww-appmini-city" id="ww-appmini-city"></span>' +
    '<span class="ww-appmini-now"><span id="ww-appmini-icon" aria-hidden="true"></span> <strong id="ww-appmini-temp"></strong> <span id="ww-appmini-cond"></span></span>';

  const labMenu = document.createElement('div');
  labMenu.className = 'ww-labmenu';
  labMenu.setAttribute('role', 'list');
  TABS.find((t) => t.id === 'labs').sections.forEach((id) => {
    const sec = $(id);
    if (!sec) return;
    const title = (sec.querySelector('h2') || {}).textContent || id;
    const blurb = (sec.querySelector('.ww-card-header p') || {}).textContent || '';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ww-labmenu-item';
    b.setAttribute('role', 'listitem');
    b.dataset.lab = id;
    b.innerHTML = '<span class="ww-labmenu-icon" aria-hidden="true">' + LAB_ICONS[id] + '</span>' +
      '<span class="ww-labmenu-text"><strong></strong><small></small></span><span class="ww-labmenu-chev" aria-hidden="true">›</span>';
    b.querySelector('strong').textContent = title.replace(/^\d+\s*·\s*/, '');
    b.querySelector('small').textContent = blurb;
    labMenu.appendChild(b);
  });

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'ww-labback';
  back.textContent = '‹ All labs';

  const bar = document.createElement('nav');
  bar.className = 'ww-appbar';
  bar.setAttribute('aria-label', 'Weather Watch sections');
  TABS.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.tab = t.id;
    b.innerHTML = '<span class="ww-appbar-icon" aria-hidden="true">' + t.icon + '</span><span>' + t.label + '</span>';
    bar.appendChild(b);
  });

  const hero = page.querySelector('.ww-hero');
  const firstCard = page.querySelector('.ww-card');
  page.insertBefore(mini, hero);
  page.insertBefore(labMenu, firstCard);
  page.insertBefore(back, firstCard);
  page.appendChild(bar);

  // ── view logic ──────────────────────────────────────────────────────────────
  function apply() {
    const on = mq.matches;
    page.classList.toggle('ww-app', on);
    const q = $('ww-search-input');
    if (q) {
      if (!q.dataset.wide) q.dataset.wide = q.placeholder;
      q.placeholder = on ? 'Search city or zip' : q.dataset.wide;
    }
    const sections = [].slice.call(page.querySelectorAll('.ww-card'));
    if (!on) {
      sections.forEach((s) => { s.hidden = false; });
      if (hero) hero.hidden = false;
      return;
    }
    page.dataset.tab = tab;
    page.dataset.lab = lab || '';
    if (hero) hero.hidden = tab !== 'now';
    sections.forEach((s) => {
      const owner = tabOfSection[s.id];
      s.hidden = owner !== tab || (tab === 'labs' && s.id !== lab);
    });
    bar.querySelectorAll('button').forEach((b) => {
      const active = b.dataset.tab === tab;
      b.classList.toggle('is-active', active);
      if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    // Canvases measure themselves on resize; they were 0px wide while hidden.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  function go(nextTab, nextLab) {
    tab = nextTab;
    lab = nextTab === 'labs' ? (nextLab || null) : null;
    apply();
    if (scroller) scroller.scrollTo({ top: 0 });
    else window.scrollTo(0, 0);
  }

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (b) go(b.dataset.tab, null);
  });
  labMenu.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lab]');
    if (b) go('labs', b.dataset.lab);
  });
  back.addEventListener('click', () => go('labs', null));

  // In-page links (#driving etc.) switch tabs instead of scrolling a hidden section.
  function routeHash() {
    const id = decodeURIComponent((location.hash || '').slice(1));
    if (mq.matches && tabOfSection[id]) go(tabOfSection[id], tabOfSection[id] === 'labs' ? id : null);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !mq.matches) return;
    const id = a.getAttribute('href').slice(1);
    if (tabOfSection[id]) { e.preventDefault(); go(tabOfSection[id], tabOfSection[id] === 'labs' ? id : null); }
  });
  window.addEventListener('hashchange', routeHash);
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(apply);

  // ── sky + mini header follow the live readings ──────────────────────────────
  const dial = document.querySelector('.ww-main-dial');
  function skyFor(cond, pct) {
    const c = (cond || '').toLowerCase();
    const night = pct === 0 || pct === 100;
    if (/thunder|storm/.test(c)) return 'storm';
    if (/snow|sleet|ice|freezing/.test(c)) return 'snow';
    if (/rain|drizzle|shower/.test(c)) return 'rain';
    if (/fog|mist|haze/.test(c)) return 'fog';
    if (/cloud|overcast/.test(c)) return night ? 'night-cloud' : 'cloud';
    return night ? 'night' : 'clear';
  }
  function sync() {
    const get = (id) => ($(id) || {}).textContent || '';
    $('ww-appmini-city').textContent = get('ww-dial-city').replace(/\s*\(.*\)\s*$/, '');
    $('ww-appmini-temp').textContent = get('ww-dial-temp');
    $('ww-appmini-icon').textContent = get('ww-dial-icon');
    $('ww-appmini-cond').textContent = get('ww-dial-condition');
    const fill = $('ww-solar-fill');
    const w = fill && fill.style.width ? parseFloat(fill.style.width) : 50;
    if (dial) dial.dataset.sky = skyFor(get('ww-dial-condition'), w);
  }
  const mo = new MutationObserver(sync);
  ['ww-dial-city', 'ww-dial-temp', 'ww-dial-icon', 'ww-dial-condition'].forEach((id) => {
    const el = $(id);
    if (el) mo.observe(el, { childList: true, characterData: true, subtree: true });
  });
  const fill = $('ww-solar-fill');
  if (fill) mo.observe(fill, { attributes: true, attributeFilter: ['style'] });

  sync();
  apply();
  routeHash();
})();
