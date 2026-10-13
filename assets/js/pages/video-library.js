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
  const heroBg = $('vl-cinema-bg');
  if (heroBg && featured.entry.poster) {
    const heroImg = document.createElement('img');
    heroImg.src = featured.entry.poster;
    heroImg.alt = '';
    heroImg.loading = 'eager';
    heroImg.decoding = 'async';
    heroBg.replaceChildren(heroImg);
  }
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
  thumb.append(art);

  if (video.entry.poster) {
    const img = document.createElement('img');
    img.className = 'vl-thumb-img';
    img.src = video.entry.poster;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 640;
    img.height = 360;
    img.onerror = () => { img.style.display = 'none'; };
    thumb.append(img);
  }

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
  thumb.append(play, duration, provider, badge);
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

/* ── OSchannels Early-2000s VHS Classroom TV Mode ────────────────── */

let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playStaticNoise(durationMs = 380) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * (durationMs / 1000));
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.09;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, ctx.currentTime);
    filter.Q.setValueAtTime(0.85, ctx.currentTime);

    const hum = ctx.createOscillator();
    hum.frequency.setValueAtTime(60, ctx.currentTime);
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.02, ctx.currentTime);
    hum.connect(humGain);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gainNode.gain.setValueAtTime(0.25, ctx.currentTime + (durationMs / 1000) * 0.7);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (durationMs / 1000));

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    humGain.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteNoise.start();
    hum.start();
    whiteNoise.stop(ctx.currentTime + durationMs / 1000);
    hum.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Audio optional / blocked
  }
}

let staticRaf = null;
let staticActive = false;
function triggerStatic(durationMs = 380, onComplete = null) {
  const canvas = $('os-tv-static-canvas');
  if (!canvas) {
    if (onComplete) onComplete();
    return;
  }
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  playStaticNoise(durationMs);
  canvas.style.opacity = '1';
  staticActive = true;
  cancelAnimationFrame(staticRaf);

  const startTime = performance.now();
  let syncBar = 0;

  function renderStatic(now) {
    if (!staticActive) return;
    const elapsed = now - startTime;
    syncBar = (syncBar + 14) % h;

    for (let i = 0; i < data.length; i += 4) {
      const y = Math.floor((i / 4) / w);
      const inSyncBar = Math.abs(y - syncBar) < 22;
      const noise = (Math.random() * 255) | 0;
      const val = inSyncBar ? Math.min(255, noise + 75) : noise;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    if (elapsed < durationMs) {
      staticRaf = requestAnimationFrame(renderStatic);
    } else {
      staticActive = false;
      canvas.style.opacity = '0';
      if (onComplete) onComplete();
    }
  }
  staticRaf = requestAnimationFrame(renderStatic);
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const CHANNELS = [
  {
    num: "01",
    name: "ALL-ACCESS SHUFFLE",
    label: "CH 01 · All-Access Mega-Shuffle",
    tag: "All Catalog",
    sub: "Continuous random shuffle across all curated films",
    filter: () => true,
    playlist: [],
    index: 0
  },
  {
    num: "02",
    name: "SCIENCE & COSMOS",
    label: "CH 02 · Science & Wonder",
    tag: "Cosmos & Scale",
    sub: "Cosmos, scale, natural patterns, and planetary science",
    filter: (v) => v.group === 'science' || /science|space|cosmos|math/i.test(v.category),
    playlist: [],
    index: 0
  },
  {
    num: "03",
    name: "TECH & SYSTEMS",
    label: "CH 03 · Technology & Engineering",
    tag: "Code & Systems",
    sub: "How computers work, mythbusters, and technological frontiers",
    filter: (v) => v.group === 'tech' || /tech|computer|code|system/i.test(v.category),
    playlist: [],
    index: 0
  },
  {
    num: "04",
    name: "PURPOSE & VOICE",
    label: "CH 04 · Purpose & Mindset",
    tag: "Voice & Craft",
    sub: "Resilience, craft, philosophy, and independent thinking",
    filter: (v) => v.group === 'purpose' || /purpose|philosophy|mindset|art/i.test(v.category),
    playlist: [],
    index: 0
  },
  {
    num: "05",
    name: "FILM & MOTION",
    label: "CH 05 · Film & Animation History",
    tag: "Moving Pictures",
    sub: "Silent classics, Muybridge motion studies, and animation craft",
    filter: (v) => v.group === 'film' || /film|animation|motion|cinema/i.test(v.category),
    playlist: [],
    index: 0
  },
  {
    num: "06",
    name: "PUBLIC ARCHIVE",
    label: "CH 06 · Public Archive & Historical",
    tag: "Vintage Vault",
    sub: "NASA film scans, historical events, and public domain archives",
    filter: (v) => /public domain|nasa|archive/i.test(v.rights || '') || /nasa|archive/i.test(v.channel || ''),
    playlist: [],
    index: 0
  }
];

let activeChannelIndex = 0;
let tvPlayer = null;
let tvLastFocused = null;
let osdTimeout = null;
let timecodeInterval = null;
let crtFilterMode = 0;

function initChannels() {
  CHANNELS.forEach((ch) => {
    const list = VIDEOS.filter(ch.filter);
    ch.playlist = shuffleArray(list.length ? list : VIDEOS);
    ch.index = 0;
  });
}

function renderChannelGrid() {
  const grid = $('os-tv-channel-grid');
  if (!grid) return;
  grid.replaceChildren();
  CHANNELS.forEach((ch, idx) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `os-tv-ch-card${idx === activeChannelIndex ? ' active' : ''}`;
    card.setAttribute('aria-label', `Switch to ${ch.label}`);

    const badge = document.createElement('span');
    badge.className = 'os-tv-ch-badge';
    badge.textContent = ch.num;

    const info = document.createElement('div');
    info.className = 'os-tv-ch-info';
    const strong = document.createElement('strong');
    strong.textContent = ch.label;
    const small = document.createElement('small');
    small.textContent = ch.sub;
    info.append(strong, small);

    const tag = document.createElement('span');
    tag.className = 'os-tv-ch-tag';
    tag.textContent = ch.tag;

    card.append(badge, info, tag);
    card.addEventListener('click', () => setChannel(idx));
    grid.append(card);
  });
}

function updateActiveChannelCard() {
  const cards = document.querySelectorAll('.os-tv-ch-card');
  cards.forEach((card, idx) => {
    card.classList.toggle('active', idx === activeChannelIndex);
  });
}

function showOsd(ch, video) {
  const osd = $('os-tv-osd');
  if (!osd) return;
  $('os-tv-osd-ch').textContent = `CH ${ch.num}`;
  $('os-tv-osd-name').textContent = ch.name;
  $('os-tv-osd-status').textContent = 'PLAY ▶';
  $('os-tv-osd-title').textContent = video.title;

  osd.classList.remove('dimmed', 'hidden');
  clearTimeout(osdTimeout);
  osdTimeout = setTimeout(() => {
    osd.classList.add('dimmed');
  }, 4500);
}

function playCurrentChannelVideo(withStatic = true) {
  const ch = CHANNELS[activeChannelIndex];
  if (!ch.playlist.length) {
    const list = VIDEOS.filter(ch.filter);
    ch.playlist = shuffleArray(list.length ? list : VIDEOS);
  }
  if (ch.index >= ch.playlist.length) {
    ch.playlist = shuffleArray(ch.playlist);
    ch.index = 0;
  }
  const video = ch.playlist[ch.index];
  if (!video) return;

  const doMount = () => {
    tvPlayer?.destroy();
    const host = $('os-tv-player-wrap');
    if (!host) return;
    host.replaceChildren();

    markWatched(video.slug);
    showOsd(ch, video);

    tvPlayer = mountPlayer(host, video.entry, { captions: true, chapters: false, resume: false });
    tvPlayer.start({ resumeAt: null });

    tvPlayer.addEventListener('ended', () => {
      ch.index = (ch.index + 1) % ch.playlist.length;
      playCurrentChannelVideo(true);
    });

    tvPlayer.addEventListener('error', () => {
      const osd = $('os-tv-osd');
      if (osd) {
        $('os-tv-osd-name').textContent = 'TRACKING ERROR';
        $('os-tv-osd-title').textContent = 'SEARCHING FOR SIGNAL...';
        osd.classList.remove('dimmed', 'hidden');
      }
      setTimeout(() => {
        ch.index = (ch.index + 1) % ch.playlist.length;
        playCurrentChannelVideo(true);
      }, 2500);
    });

    updateActiveChannelCard();
  };

  if (withStatic) {
    triggerStatic(380, doMount);
  } else {
    doMount();
  }
}

function nextChannel() {
  activeChannelIndex = (activeChannelIndex + 1) % CHANNELS.length;
  playCurrentChannelVideo(true);
}
function prevChannel() {
  activeChannelIndex = (activeChannelIndex - 1 + CHANNELS.length) % CHANNELS.length;
  playCurrentChannelVideo(true);
}
function nextVideoInChannel() {
  const ch = CHANNELS[activeChannelIndex];
  ch.index = (ch.index + 1) % ch.playlist.length;
  playCurrentChannelVideo(true);
}
function setChannel(index) {
  if (activeChannelIndex === index) {
    nextVideoInChannel();
    return;
  }
  activeChannelIndex = index;
  playCurrentChannelVideo(true);
}
function randomChannelAndFilm() {
  activeChannelIndex = Math.floor(Math.random() * CHANNELS.length);
  const ch = CHANNELS[activeChannelIndex];
  ch.index = Math.floor(Math.random() * ch.playlist.length);
  playCurrentChannelVideo(true);
}

let isGuideOpen = true;

function setGuideOpen(open) {
  isGuideOpen = open;
  const cart = document.querySelector('.os-tv-cart');
  if (cart) {
    cart.classList.toggle('guide-collapsed', !open);
  }
  const toggleBtn = $('os-tv-guide-toggle');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(open));
  }
  const guideBtn = $('os-tv-btn-guide');
  if (guideBtn) {
    guideBtn.classList.toggle('active', open);
  }
}

function openTvMode(channelIndex = 0) {
  closeModal();
  tvLastFocused = document.activeElement;
  initChannels();
  activeChannelIndex = channelIndex;

  const tvBackdrop = $('os-tv-backdrop');
  if (!tvBackdrop) return;
  tvBackdrop.hidden = false;
  tvBackdrop.classList.add('open');
  renderChannelGrid();
  setGuideOpen(true);

  clearInterval(timecodeInterval);
  timecodeInterval = setInterval(() => {
    if (!tvPlayer?.adapter) return;
    const sec = Math.floor(tvPlayer.adapter.now() || 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const h = Math.floor(m / 60);
    const tc = `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const clock = $('os-tv-vcr-time');
    if (clock) clock.textContent = tc;
  }, 500);

  playCurrentChannelVideo(true);
  setTimeout(() => $('os-tv-close')?.focus(), 50);
}

function closeTvMode() {
  const tvBackdrop = $('os-tv-backdrop');
  if (!tvBackdrop) return;
  tvBackdrop.classList.remove('open');
  setTimeout(() => { tvBackdrop.hidden = true; }, 300);

  clearInterval(timecodeInterval);
  clearTimeout(osdTimeout);
  cancelAnimationFrame(staticRaf);
  staticActive = false;

  tvPlayer?.destroy();
  tvPlayer = null;

  if (tvLastFocused && document.contains(tvLastFocused)) {
    tvLastFocused.focus();
  }
}

// Bind OSchannels Launchers & Controls
$('vl-tv-open')?.addEventListener('click', () => openTvMode(0));
$('vl-tv-pill-open')?.addEventListener('click', () => openTvMode(0));
$('os-tv-close')?.addEventListener('click', closeTvMode);
$('os-tv-backdrop')?.addEventListener('click', (e) => {
  if (e.target === $('os-tv-backdrop')) closeTvMode();
});
$('os-tv-guide-toggle')?.addEventListener('click', () => setGuideOpen(!isGuideOpen));
$('os-tv-btn-guide')?.addEventListener('click', () => setGuideOpen(!isGuideOpen));
$('os-tv-remote-close')?.addEventListener('click', () => setGuideOpen(false));
$('os-tv-btn-chup')?.addEventListener('click', nextChannel);
$('os-tv-btn-chdown')?.addEventListener('click', prevChannel);
$('os-tv-btn-next')?.addEventListener('click', nextVideoInChannel);
$('os-tv-btn-static')?.addEventListener('click', () => triggerStatic(450));
$('os-tv-remote-shuffle')?.addEventListener('click', randomChannelAndFilm);
$('os-tv-btn-filter')?.addEventListener('click', () => {
  crtFilterMode = (crtFilterMode + 1) % 3;
  const scan = $('os-tv-scanlines');
  if (scan) {
    scan.classList.toggle('fx-clean', crtFilterMode === 1);
    scan.style.opacity = crtFilterMode === 2 ? '1' : crtFilterMode === 1 ? '0.2' : '0.85';
  }
});

document.addEventListener('keydown', (event) => {
  const tvBackdrop = $('os-tv-backdrop');
  if (!tvBackdrop || !tvBackdrop.classList.contains('open')) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeTvMode();
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    nextChannel();
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    prevChannel();
    return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    nextVideoInChannel();
    return;
  }
  if (event.key === ' ' || event.key === 'k') {
    if (document.activeElement?.tagName === 'BUTTON') return;
    event.preventDefault();
    tvPlayer?.toggle();
    return;
  }
  if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    randomChannelAndFilm();
    return;
  }
  if (event.key.toLowerCase() === 'g') {
    event.preventDefault();
    setGuideOpen(!isGuideOpen);
    return;
  }
  if (event.key.toLowerCase() === 'm') {
    event.preventDefault();
    tvPlayer?.setMuted(!tvPlayer.info.muted);
    return;
  }
});
