(() => {
  'use strict';

  const VIDEOS = [
    {
      id: 'GO5FwsblpT8', title: 'Carl Sagan — Pale Blue Dot', category: 'Science', group: 'science',
      channel: 'carlsagandotcom', duration: '3:27', symbol: '•', accent: '#4d8ecf',
      desc: 'Carl Sagan reflects on Earth seen from 3.7 billion miles away and what that perspective asks of us.',
      insight: 'Use scale to deepen humility. Ask how scientific imagery can change ethical choices.'
    },
    {
      id: '0fKBhvDjuy0', title: 'Powers of Ten (1977)', category: 'Scale & Space', group: 'science',
      channel: 'Eames Office', duration: '9:01', symbol: '10', accent: '#7859b8',
      desc: 'The Eames Office film travels from a Chicago picnic to cosmic scale, then inward toward the atom.',
      insight: 'Build intuition for exponents and scientific notation. Pause to predict what the next power of ten will reveal.'
    },
    {
      id: 'W-AHBiU7Ac4', title: 'Nature by Numbers — 4K Remastered', category: 'Math & Pattern', group: 'science',
      channel: 'Cristóbal Vila / Etérea Estudios', duration: '3:44', symbol: 'φ', accent: '#3c9879',
      desc: 'An artist-made exploration of Fibonacci numbers, the golden ratio, and geometric patterns in living forms.',
      insight: 'Treat the film as a mathematical claim, not proof. Ask students where the model fits nature and where it simplifies it.'
    },
    {
      id: 'Dxcc6ycZ73M', title: 'What Is the Internet?', category: 'Technology', group: 'tech',
      channel: 'CodeAI', duration: '3:45', symbol: '</>', accent: '#277aa6',
      desc: 'A short introduction to the connected systems and shared protocols behind the internet.',
      insight: 'Help students distinguish the internet from the web and identify the physical systems beneath a browser page.'
    },
    {
      id: 'zkTf0LmDqKI', title: 'Steve Jobs on Failure', category: 'Interview', group: 'purpose',
      channel: 'Silicon Valley Historical Association', duration: '1:43', symbol: '↺', accent: '#a96d38',
      desc: 'An archival interview excerpt about failure, iteration, and continuing to build.',
      insight: 'Connect setbacks to revision. Ask what evidence would distinguish perseverance from repeating the same mistake.'
    },
    {
      id: 'kYfNvmF0Bqw', title: 'Steve Jobs — Secrets of Life', category: 'Interview', group: 'purpose',
      channel: 'Silicon Valley Historical Association', duration: '1:40', symbol: '✦', accent: '#9a5676',
      desc: 'An archival interview excerpt about questioning assumptions and making useful things.',
      insight: 'Listen critically: which ideas are actionable, and which depend on privilege, context, or hindsight?'
    }
  ];

  const GROUPS = {
    science: ['vl-group-science', 'vl-grid-science', 'vl-count-science'],
    tech: ['vl-group-tech', 'vl-grid-tech', 'vl-count-tech'],
    purpose: ['vl-group-purpose', 'vl-grid-purpose', 'vl-count-purpose']
  };
  const WATCH_KEY = 'vl-watched-youtube-v1';
  const filterRow = document.getElementById('vl-filter-row');
  const search = document.getElementById('vl-search');
  const noResults = document.getElementById('vl-no-results');
  const backdrop = document.getElementById('vl-modal-backdrop');
  const modal = backdrop.querySelector('.vl-modal');
  const embedShell = document.getElementById('vl-embed-shell');
  const modalHud = document.getElementById('vl-modal-hud');
  const source = document.getElementById('vl-modal-source');
  const providerLink = document.getElementById('vl-provider-link');
  const watchedControls = document.getElementById('vl-watched-controls');
  const watchedCount = document.getElementById('vl-watched-count');
  const cards = [];
  let activeFilter = 'all';
  let activeIndex = -1;
  let lastFocused = null;

  function watched() {
    try { return JSON.parse(localStorage.getItem(WATCH_KEY) || '{}'); } catch { return {}; }
  }
  function syncWatched() {
    const state = watched();
    const count = Object.keys(state).length;
    cards.forEach(({ card, video }) => card.classList.toggle('vl-card--watched', !!state[video.id]));
    watchedControls.style.display = count ? 'flex' : 'none';
    watchedCount.textContent = `${count} opened`;
  }
  function markOpened(id) {
    const state = watched(); state[id] = true;
    localStorage.setItem(WATCH_KEY, JSON.stringify(state));
    syncWatched();
  }
  function youtubeUrl(video, embed = false) {
    if (!embed) return `https://www.youtube.com/watch?v=${video.id}`;
    return `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&cc_load_policy=1&playsinline=1`;
  }
  function loadEmbed(video) {
    const frame = document.createElement('iframe');
    frame.className = 'vl-embed-frame';
    frame.title = `${video.title} on YouTube`;
    frame.src = youtubeUrl(video, true);
    frame.loading = 'eager';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'fullscreen; encrypted-media; picture-in-picture';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    frame.setAttribute('allowfullscreen', '');
    embedShell.replaceChildren(frame);
    modalHud.textContent = 'YouTube loaded';
    markOpened(video.id);
  }
  function showConsent(video) {
    const panel = document.createElement('div');
    panel.className = 'vl-embed-consent';
    panel.innerHTML = '<strong>Load this video from YouTube?</strong><p>The privacy-enhanced player avoids personalized viewing history, but YouTube may still set data, show branding, recommendations, or non-personalized ads.</p>';
    const button = document.createElement('button');
    button.className = 'vl-load-embed'; button.type = 'button'; button.textContent = 'Load YouTube video';
    button.addEventListener('click', () => loadEmbed(video));
    panel.appendChild(button); embedShell.replaceChildren(panel);
    modalHud.textContent = 'Not loaded';
  }
  function openVideo(index) {
    const video = VIDEOS[index]; if (!video) return;
    activeIndex = index; lastFocused = document.activeElement;
    document.querySelectorAll('.vl-card--playing').forEach(el => el.classList.remove('vl-card--playing'));
    cards[index].card.classList.add('vl-card--playing');
    document.getElementById('vl-modal-category').textContent = video.category;
    document.getElementById('vl-modal-title').textContent = video.title;
    document.getElementById('vl-modal-desc').textContent = video.desc;
    document.getElementById('vl-modal-insight').textContent = video.insight;
    document.getElementById('vl-modal-chapters').innerHTML = '<button type="button" disabled>Provider-controlled playback</button>';
    source.textContent = `Hosted by YouTube · Published by ${video.channel} · ${video.duration}`;
    providerLink.href = youtubeUrl(video); providerLink.setAttribute('aria-label', `Open ${video.title} on YouTube`);
    showConsent(video);
    backdrop.classList.add('open'); document.getElementById('vl-theater-glow').classList.add('open');
    setTimeout(() => embedShell.querySelector('button')?.focus(), 0);
  }
  function closeModal() {
    backdrop.classList.remove('open'); document.getElementById('vl-theater-glow').classList.remove('open');
    embedShell.replaceChildren();
    if (activeIndex >= 0) cards[activeIndex]?.card.classList.remove('vl-card--playing');
    activeIndex = -1;
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  }
  function applyFilters() {
    const query = search.value.trim().toLowerCase();
    const counts = { science: 0, tech: 0, purpose: 0 };
    cards.forEach(({ card, video }) => {
      const match = (activeFilter === 'all' || video.category === activeFilter) &&
        (!query || [video.title, video.category, video.channel, video.desc].join(' ').toLowerCase().includes(query));
      card.hidden = !match; if (match) counts[video.group]++;
    });
    let any = false;
    Object.entries(GROUPS).forEach(([key, [sectionId,, countId]]) => {
      const visible = counts[key] > 0; document.getElementById(sectionId).hidden = !visible;
      document.getElementById(countId).textContent = `${counts[key]} film${counts[key] === 1 ? '' : 's'}`;
      any ||= visible;
    });
    noResults.classList.toggle('visible', !any);
  }

  const featured = VIDEOS[0];
  document.getElementById('vl-hero-title').textContent = featured.title;
  document.getElementById('vl-hero-desc').textContent = featured.desc;
  document.getElementById('vl-stat-row').textContent = `${VIDEOS.length} curated films · click-to-load privacy`;
  document.getElementById('vl-hero-play').addEventListener('click', () => openVideo(0));
  [...new Set(VIDEOS.map(video => video.category))].reduce((list, category) => list.concat(category), ['all']).forEach(category => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `vl-filter-btn${category === 'all' ? ' active' : ''}`;
    button.textContent = category === 'all' ? 'All' : category;
    button.addEventListener('click', () => {
      filterRow.querySelectorAll('button').forEach(item => item.classList.remove('active')); button.classList.add('active');
      activeFilter = category; applyFilters();
    });
    filterRow.appendChild(button);
  });
  VIDEOS.forEach((video, index) => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'vl-card reveal';
    card.setAttribute('aria-label', `Preview ${video.title}; hosted by YouTube`);
    const thumb = document.createElement('div'); thumb.className = 'vl-thumb-wrap';
    const art = document.createElement('span'); art.className = 'vl-thumb-art'; art.dataset.symbol = video.symbol; art.style.setProperty('--vl-card-accent', video.accent);
    const play = document.createElement('span'); play.className = 'vl-play-icon'; play.innerHTML = '<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="28" fill="white" fill-opacity=".93"/><polygon points="22,16 44,28 22,40" fill="#0a0f1c"/></svg>';
    const duration = document.createElement('span'); duration.className = 'vl-duration'; duration.textContent = video.duration;
    const provider = document.createElement('span'); provider.className = 'vl-provider-badge'; provider.textContent = 'YouTube';
    const badge = document.createElement('span'); badge.className = 'vl-watched-badge'; badge.textContent = '✓ Opened';
    thumb.append(art, play, duration, provider, badge);
    const body = document.createElement('div'); body.className = 'vl-card-body';
    body.innerHTML = `<p class="vl-kicker">${video.category}</p><p class="vl-title">${video.title}</p><p class="vl-sub">${video.channel}</p>`;
    card.append(thumb, body); document.getElementById(GROUPS[video.group][1]).appendChild(card);
    card.addEventListener('click', () => openVideo(index)); cards.push({ card, video });
  });
  search.addEventListener('input', applyFilters);
  document.getElementById('vl-modal-close').addEventListener('click', closeModal);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(); });
  document.addEventListener('keydown', event => {
    if (!backdrop.classList.contains('open')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button,a[href],[tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.getElementById('vl-clear-watched').addEventListener('click', () => { localStorage.removeItem(WATCH_KEY); syncWatched(); });
  applyFilters(); syncWatched();
})();
