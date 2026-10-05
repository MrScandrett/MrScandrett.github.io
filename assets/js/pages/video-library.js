// Video Library — cards from data/video-library.json, played in the ClassroomOS
// player (assets/js/video-player.mjs) inside the cinema modal.
import { loadCatalog, normalizeEntry, mountPlayer, formatTime } from '../video-player.mjs';

const { videos: CATALOG = {} } = await loadCatalog();
const VIDEOS = Object.entries(CATALOG).map(([slug, raw]) => ({ ...raw, slug, entry: normalizeEntry(raw, slug) }));

const GROUPS = {
  science: ['vl-group-science', 'vl-grid-science', 'vl-count-science'],
  tech: ['vl-group-tech', 'vl-grid-tech', 'vl-count-tech'],
  purpose: ['vl-group-purpose', 'vl-grid-purpose', 'vl-count-purpose'],
  film: ['vl-group-film', 'vl-grid-film', 'vl-count-film']
};
const WATCH_KEY = 'vl-watched-v2';
const $ = (id) => document.getElementById(id);
const filterRow = $('vl-filter-row');
const search = $('vl-search');
const noResults = $('vl-no-results');
const backdrop = $('vl-modal-backdrop');
const modal = backdrop.querySelector('.vl-modal');
const embedShell = $('vl-embed-shell');
const modalHud = $('vl-modal-hud');
const source = $('vl-modal-source');
const theaterLink = $('vl-provider-link');
const chapters = $('vl-modal-chapters');
const watchedControls = $('vl-watched-controls');
const watchedCount = $('vl-watched-count');
const cards = [];
let activeFilter = 'all';
let activeIndex = -1;
let lastFocused = null;
let player = null;

function watched() {
  try { return JSON.parse(localStorage.getItem(WATCH_KEY) || '{}'); } catch { return {}; }
}
function syncWatched() {
  const state = watched();
  const count = Object.keys(state).length;
  cards.forEach(({ card, video }) => card.classList.toggle('vl-card--watched', !!state[video.slug]));
  watchedControls.style.display = count ? 'flex' : 'none';
  watchedCount.textContent = `${count} watched`;
}
function markWatched(slug) {
  const state = watched();
  state[slug] = true;
  try { localStorage.setItem(WATCH_KEY, JSON.stringify(state)); } catch { /* private mode */ }
  syncWatched();
}

function openVideo(index) {
  const video = VIDEOS[index];
  if (!video) return;
  activeIndex = index;
  lastFocused = document.activeElement;
  document.querySelectorAll('.vl-card--playing').forEach((el) => el.classList.remove('vl-card--playing'));
  cards[index].card.classList.add('vl-card--playing');
  $('vl-modal-category').textContent = video.category;
  $('vl-modal-title').textContent = video.title;
  $('vl-modal-desc').textContent = video.desc;
  $('vl-modal-insight').textContent = video.insight;
  source.textContent = [`From ${video.entry.source?.label || 'the web'}`, video.channel, video.duration, video.rights, 'plays inside ClassroomOS'].filter(Boolean).join(' · ');
  theaterLink.href = `watch.html?${new URLSearchParams({ v: video.slug })}`;
  theaterLink.setAttribute('aria-label', `Open ${video.title} in the theater`);

  player?.destroy();
  player = mountPlayer(embedShell, video.entry, { chapters: false });
  modalHud.textContent = 'Ready';
  player.addEventListener('open', () => { modalHud.textContent = 'Playing'; markWatched(video.slug); });
  player.addEventListener('ended', () => { modalHud.textContent = 'Finished'; });
  player.addEventListener('error', () => { modalHud.textContent = 'Unavailable'; });

  chapters.replaceChildren();
  chapters.parentElement.hidden = !video.entry.chapters?.length;
  for (const c of video.entry.chapters || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${formatTime(c.t)} · ${c.label}`;
    b.addEventListener('click', () => player.jump(c.t));
    chapters.append(b);
  }

  backdrop.classList.add('open');
  $('vl-theater-glow').classList.add('open');
  setTimeout(() => embedShell.querySelector('.vp-poster')?.focus(), 0);
}
function closeModal() {
  backdrop.classList.remove('open');
  $('vl-theater-glow').classList.remove('open');
  player?.destroy();
  player = null;
  if (activeIndex >= 0) cards[activeIndex]?.card.classList.remove('vl-card--playing');
  activeIndex = -1;
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
}
function applyFilters() {
  const query = search.value.trim().toLowerCase();
  const counts = Object.fromEntries(Object.keys(GROUPS).map((key) => [key, 0]));
  cards.forEach(({ card, video }) => {
    const match = (activeFilter === 'all' || video.category === activeFilter) &&
      (!query || [video.title, video.category, video.channel, video.desc].join(' ').toLowerCase().includes(query));
    card.hidden = !match;
    if (match && video.group in counts) counts[video.group]++;
  });
  let any = false;
  Object.entries(GROUPS).forEach(([key, [sectionId, , countId]]) => {
    const visible = counts[key] > 0;
    $(sectionId).hidden = !visible;
    $(countId).textContent = `${counts[key]} film${counts[key] === 1 ? '' : 's'}`;
    any ||= visible;
  });
  noResults.classList.toggle('visible', !any);
}

const featured = VIDEOS[0];
if (featured) {
  $('vl-hero-title').textContent = featured.title;
  $('vl-hero-desc').textContent = featured.desc;
}
$('vl-stat-row').textContent = `${VIDEOS.length} curated films · played inside ClassroomOS`;
$('vl-hero-play').addEventListener('click', () => openVideo(0));
['all', ...new Set(VIDEOS.map((video) => video.category))].forEach((category) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `vl-filter-btn${category === 'all' ? ' active' : ''}`;
  button.textContent = category === 'all' ? 'All' : category;
  button.addEventListener('click', () => {
    filterRow.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    activeFilter = category;
    applyFilters();
  });
  filterRow.appendChild(button);
});
VIDEOS.forEach((video, index) => {
  const grid = GROUPS[video.group] && $(GROUPS[video.group][1]);
  if (!grid) return;
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'vl-card reveal';
  card.setAttribute('aria-label', `Watch ${video.title}`);
  const thumb = document.createElement('div');
  thumb.className = 'vl-thumb-wrap';
  const art = document.createElement('span');
  art.className = 'vl-thumb-art';
  art.dataset.symbol = video.symbol;
  art.style.setProperty('--vl-card-accent', video.accent);
  const play = document.createElement('span');
  play.className = 'vl-play-icon';
  play.innerHTML = '<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="28" fill="white" fill-opacity=".93"/><polygon points="22,16 44,28 22,40" fill="#0a0f1c"/></svg>';
  const duration = document.createElement('span');
  duration.className = 'vl-duration';
  duration.textContent = video.duration;
  const provider = document.createElement('span');
  provider.className = 'vl-provider-badge';
  provider.textContent = video.entry.source?.label || 'Video';
  const badge = document.createElement('span');
  badge.className = 'vl-watched-badge';
  badge.textContent = '✓ Watched';
  thumb.append(art, play, duration, provider, badge);
  const body = document.createElement('div');
  body.className = 'vl-card-body';
  for (const [cls, text] of [['vl-kicker', video.category], ['vl-title', video.title], ['vl-sub', video.channel]]) {
    const p = document.createElement('p');
    p.className = cls;
    p.textContent = text;
    body.append(p);
  }
  card.append(thumb, body);
  grid.appendChild(card);
  card.addEventListener('click', () => openVideo(index));
  cards.push({ card, video });
});
search.addEventListener('input', applyFilters);
$('vl-modal-close').addEventListener('click', closeModal);
backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(); });
document.addEventListener('keydown', (event) => {
  if (!backdrop.classList.contains('open')) return;
  if (event.key === 'Escape' && !document.fullscreenElement) { event.preventDefault(); closeModal(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button,a[href],[tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$('vl-clear-watched').addEventListener('click', () => {
  try { localStorage.removeItem(WATCH_KEY); } catch { /* private mode */ }
  syncWatched();
});
applyFilters();
syncWatched();
