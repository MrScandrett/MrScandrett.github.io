const base = new URL('../../', import.meta.url);
const shellURL = new URL('listen.html', base);
const params = new URL(location.href).searchParams;
const $ = id => document.getElementById(id);
const audio = $('site-music-audio');
const frame = $('music-browser');
const storageKey = 'classroomos-music-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
let tracks = [], composers = [], index = 0, shuffle = saved.shuffle === true;
let repeat = ['one', 'all'].includes(saved.repeatMode) ? saved.repeatMode : saved.repeat === true ? 'all' : 'off';
let dockSize = saved.dockSize === 'tiny' ? 'tiny' : 'compact';
let fallback = false, pendingTime = 0, playRequest = 0, lastSave = 0;
let browseURL = safeBrowse(params.get('browse'));

function safeBrowse(value) {
  try {
    const url = new URL(value || 'index.html', base);
    if (url.origin === base.origin && url.pathname.startsWith(base.pathname) && url.pathname !== shellURL.pathname && /(?:\/|\.html)$/.test(url.pathname)) return url;
  } catch {}
  return new URL('index.html', base);
}
const icons = {
  shrink: 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7', grow: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  maximize: 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
  restore: 'M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3',
};
function current() { return tracks[index]; }
// Each composer gets a stable cover: monogram plus a hue spread by the golden angle.
function hueFor(composer) { const i = composers.indexOf(composer); return i < 0 ? 210 : Math.round(200 + i * 137.508) % 360; }
function monogram(composer) { const words = composer.split(/\s+/); return (words[0][0] + (words.length > 1 ? words.at(-1)[0] : '')).toUpperCase(); }
function setButton(button, label, path) {
  button.setAttribute('aria-label', label); button.title = label;
  button.querySelector('path').setAttribute('d', path);
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({ track: current()?.id, time: audio.currentTime || pendingTime, volume: audio.volume, shuffle, repeat: repeat !== 'off', repeatMode: repeat, dockSize })); } catch {}
}
function snapshot() { return { track: current(), playing: !audio.paused, volume: audio.volume }; }
function update() {
  const playing = !audio.paused;
  $('site-player').dataset.playing = String(playing);
  $('music-play').querySelector('path').setAttribute('d', playing ? 'M8 5v14M16 5v14' : 'm8 5 11 7-11 7Z');
  $('music-play').setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  $('music-play').title = playing ? 'Pause music' : 'Play music';
  $('music-shuffle').setAttribute('aria-pressed', String(shuffle));
  $('music-repeat').setAttribute('aria-pressed', String(repeat !== 'off'));
  audio.loop = repeat === 'one';
  const loopLabel = repeat === 'off' ? 'Loop off. Click to loop this recording.' : repeat === 'one' ? 'Loop this recording. Click to loop all recordings.' : 'Loop all recordings. Click to turn looping off.';
  $('music-repeat').setAttribute('aria-label', loopLabel);
  $('music-repeat').title = loopLabel;
  const loopBadge = $('music-repeat').querySelector('.music-loop-mode');
  loopBadge.hidden = repeat === 'off';
  loopBadge.textContent = repeat === 'one' ? '1' : 'all';
  $('music-feature-state').textContent = !current() ? 'Ready to play' : playing ? 'Now playing' : audio.currentTime > 0 ? 'Paused' : 'Up next';
  $('music-mute').setAttribute('aria-pressed', String(audio.muted));
  $('music-mute').setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
  $('music-mute').title = audio.muted ? 'Unmute' : 'Mute';
  $('player-volume').style.setProperty('--music-progress', `${audio.muted ? 0 : audio.volume * 100}%`);
  $('music-repeat-description').textContent = `Loop: ${repeat === 'one' ? 'this recording' : repeat === 'all' ? 'all recordings' : 'off'}`;
  document.querySelectorAll('.music-track').forEach(button => button.setAttribute('aria-current', String(button.dataset.track === current()?.id)));
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  window.dispatchEvent(new CustomEvent('site-music-change', { detail: snapshot() }));
  save();
}
function status(message) { $('music-status').textContent = message; }
function expand(value, focus = false) {
  $('music-library').hidden = !value;
  $('music-library-toggle').setAttribute('aria-expanded', String(value));
  const tiny = !value && dockSize === 'tiny';
  $('site-player').classList.toggle('is-tiny', tiny);
  $('music-expand').setAttribute('aria-expanded', String(!tiny));
  setButton($('music-expand'), tiny ? 'Restore compact player' : 'Collapse to single row', tiny ? icons.grow : icons.shrink);
  $('music-library-toggle').setAttribute('aria-label', value ? 'Minimize music library' : 'Expand music library');
  $('music-library-toggle').title = value ? 'Minimize music library' : 'Expand music library';
  if (!value) maximize(false);
  if (focus) (value ? $('music-search') : $('music-library-toggle')).focus();
}
async function play() {
  if (!current()) return;
  const request = ++playRequest;
  status('Loading recording…');
  try {
    // paused flips as soon as play() is called; show it now rather than when the play event arrives.
    const starting = audio.play();
    update();
    await starting;
    if (request === playRequest) status('');
  } catch (error) {
    if (request !== playRequest || error.name === 'AbortError') return;
    if (error.name === 'NotAllowedError') {
      status('Press Play to start listening.');
      expand(true);
    } else if (!audio.error) {
      status('This recording could not start. Try Play again or choose another recording.');
      expand(true);
    }
    update();
  }
}
function pause() { ++playRequest; audio.pause(); status(''); update(); }
function select(id, start = true, time = 0) {
  const next = tracks.findIndex(track => track.id === id);
  if (next < 0) return;
  ++playRequest;
  audio.pause();
  index = next; fallback = false; pendingTime = Math.max(0, Number(time) || 0);
  const track = current();
  audio.src = track.src;
  $('playing-title').textContent = track.title;
  $('playing-composer').textContent = track.composer;
  $('feature-title').textContent = track.title;
  $('feature-composer').textContent = track.composer;
  $('music-art').textContent = $('music-art-large').textContent = monogram(track.composer);
  $('site-player').style.setProperty('--music-hue', hueFor(track.composer));
  document.querySelector('.music-now').title = `${track.title} — ${track.composer}`;
  measureMarquee();
  $('playing-detail').textContent = track.detail;
  $('playing-credit').textContent = track.credit;
  $('recording-source').href = track.source;
  $('recording-lesson').href = new URL(track.lesson, base);
  $('music-seek').disabled = true;
  $('music-seek').value = '0';
  $('music-seek').setAttribute('aria-valuetext', '0:00 of 0:00');
  $('music-seek').style.setProperty('--music-progress', '0%');
  $('music-seek').style.setProperty('--music-buffered', '0%');
  $('music-elapsed').textContent = '0:00';
  $('music-duration').textContent = '0:00';
  if ('mediaSession' in navigator && 'MediaMetadata' in window) navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.composer, album: 'ClassroomOS recordings' });
  status(''); update();
  if (start) play();
}
function step(direction, start = !audio.paused) {
  if (!tracks.length) return;
  let next = (index + direction + tracks.length) % tracks.length;
  if (shuffle && tracks.length > 1) next = (index + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length;
  select(tracks[next].id, start);
}
function toggle() { if (audio.paused) play(); else pause(); }
function setVolume(value) {
  audio.volume = Math.min(1, Math.max(0, Number(value) || 0));
  $('player-volume').value = String(audio.volume);
  update();
}
function measureMarquee() {
  const viewport = document.querySelector('.music-marquee');
  const text = document.querySelector('.music-marquee-text');
  const distance = Math.max(0, text.scrollWidth - viewport.clientWidth);
  viewport.classList.toggle('is-overflowing', distance > 1);
  viewport.style.setProperty('--marquee-distance', `${distance}px`);
  viewport.style.setProperty('--marquee-duration', `${Math.max(12, distance / 24)}s`);
}
new ResizeObserver(measureMarquee).observe(document.querySelector('.music-marquee'));
function syncVRControls() {
  try { $('site-player').classList.toggle('has-vr-controls', !!frame.contentWindow.ClassroomOSVR?.enabled()); } catch {}
}
function syncNavigation() {
  let url;
  try { url = safeBrowse(frame.contentWindow.location.href); } catch { return; }
  browseURL = url;
  const shell = new URL(shellURL);
  shell.searchParams.set('browse', url.pathname + url.search + url.hash);
  // Frame navigations already create entries in the browser's joint session history.
  // Adding a parent pushState here would make Back visit every page twice.
  history.replaceState({ browse: url.href }, '', shell);
  try { document.title = `${frame.contentDocument.title} · Music`; } catch {}
  $('music-exit').href = url;
}
window.SiteMusic = { isHost: true, snapshot, toggle, pause, select, setVolume, expand, syncNavigation, open: () => expand(true), previous: () => step(-1), next: () => step(1) };
frame.addEventListener('load', () => {
  syncNavigation();
  syncVRControls();
  // Also bridge pages and generated student apps that don't load the shared registry.
  try {
    const doc = frame.contentDocument;
    frame.contentWindow.addEventListener('hashchange', syncNavigation);
    frame.contentWindow.addEventListener('popstate', syncNavigation);
    frame.contentWindow.addEventListener('classroomos:vrmodechange', syncVRControls);
    doc.addEventListener('play', event => { if (event.target.matches('audio, video')) pause(); }, true);
    doc.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link || link.hasAttribute('download') || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      if (url.origin === base.origin && url.pathname === shellURL.pathname) { event.preventDefault(); expand(true, true); }
      else if (['_top', '_parent'].includes(link.target) && url.origin === base.origin) link.target = '_self';
      else if (/^https?:$/.test(url.protocol) && url.origin !== base.origin && !link.target) { link.target = '_blank'; link.rel = 'noopener'; }
    });
  } catch {}
});
frame.src = browseURL.href;
$('music-exit').href = browseURL;
$('music-exit').addEventListener('click', () => { pause(); save(); });
$('recording-lesson').addEventListener('click', event => { event.preventDefault(); frame.src = $('recording-lesson').href; expand(false); });
$('music-play').addEventListener('click', toggle);
$('music-next').addEventListener('click', () => step(1));
$('music-previous').addEventListener('click', () => { if (audio.currentTime > 3) audio.currentTime = 0; else step(-1); });
$('music-library-toggle').addEventListener('click', () => expand($('music-library').hidden, true));
$('music-expand').addEventListener('click', () => {
  dockSize = $('site-player').classList.contains('is-tiny') ? 'compact' : 'tiny';
  expand(false);
  save();
});
$('music-minimize').addEventListener('click', () => expand(false, true));
function maximize(active) {
  $('site-player').classList.toggle('is-maximized', active);
  $('music-maximize').setAttribute('aria-pressed', String(active));
  setButton($('music-maximize'), active ? 'Restore size' : 'Maximize', active ? icons.restore : icons.maximize);
  // The maximized shelf scrolls on its own, so bring the current recording into view there.
  if (active) document.querySelector('.music-track[aria-current="true"]')?.scrollIntoView({ block: 'center' });
}
$('music-maximize').addEventListener('click', () => maximize(!$('site-player').classList.contains('is-maximized')));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('music-library').hidden) expand(false, true); });
$('music-shuffle').addEventListener('click', () => { shuffle = !shuffle; update(); });
$('music-repeat').addEventListener('click', () => { repeat = repeat === 'off' ? 'one' : repeat === 'one' ? 'all' : 'off'; update(); });
$('player-volume').addEventListener('input', event => { audio.muted = false; setVolume(event.target.value); });
$('music-mute').addEventListener('click', () => { audio.muted = !audio.muted; update(); });
$('music-seek').addEventListener('input', event => {
  if (Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value) / 100 * audio.duration;
});
function format(seconds) { return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00'; }
audio.addEventListener('loadedmetadata', () => {
  if (pendingTime && Number.isFinite(audio.duration)) { audio.currentTime = Math.min(pendingTime, Math.max(0, audio.duration - 0.1)); pendingTime = 0; }
  $('music-seek').disabled = !Number.isFinite(audio.duration);
  $('music-duration').textContent = format(audio.duration);
});
audio.addEventListener('timeupdate', () => {
  $('music-elapsed').textContent = format(audio.currentTime);
  if (audio.duration) $('music-seek').value = String(audio.currentTime / audio.duration * 100);
  $('music-seek').style.setProperty('--music-progress', `${$('music-seek').value}%`);
  $('music-seek').setAttribute('aria-valuetext', `${format(audio.currentTime)} of ${format(audio.duration)}`);
  if (Date.now() - lastSave > 5000) { save(); lastSave = Date.now(); }
});
for (const name of ['play', 'pause']) audio.addEventListener(name, update);
audio.addEventListener('progress', () => {
  const { buffered, duration } = audio;
  if (buffered.length && duration) $('music-seek').style.setProperty('--music-buffered', `${buffered.end(buffered.length - 1) / duration * 100}%`);
});
audio.addEventListener('playing', () => status(''));
audio.addEventListener('waiting', () => status('Buffering recording…'));
audio.addEventListener('ended', () => {
  if (index === tracks.length - 1 && repeat !== 'all' && !shuffle) { status('End of the library. Choose a recording or turn on Loop all.'); update(); }
  else step(1, true);
});
audio.addEventListener('error', () => {
  if (!fallback && current()?.fallback) {
    fallback = true; pendingTime = audio.currentTime || pendingTime;
    audio.src = current().fallback; play(); return;
  }
  status('This recording is unavailable. Choose another recording, or check its source link.');
  expand(true); update();
});
addEventListener('pagehide', save);
function renderTracks() {
  const query = $('music-search').value.trim().toLocaleLowerCase();
  const composer = $('music-composer').value;
  const visible = tracks.filter(track => (!composer || track.composer === composer) && `${track.title} ${track.composer} ${track.detail} ${track.credit}`.toLocaleLowerCase().includes(query));
  $('music-count').textContent = `${visible.length} of ${tracks.length} recordings${!visible.length ? '. Try another search.' : ''}`;
  const groups = new Map();
  for (const track of visible) groups.set(track.composer, [...groups.get(track.composer) || [], track]);
  $('music-tracks').replaceChildren(...[...groups].map(([name, list]) => {
    const group = document.createElement('li'); group.className = 'music-group';
    group.style.setProperty('--music-hue', hueFor(name));
    const heading = document.createElement('h3');
    const art = document.createElement('span'); art.className = 'music-art music-art-small'; art.setAttribute('aria-hidden', 'true');
    const initials = document.createElement('span'); initials.textContent = monogram(name); art.append(initials);
    const count = document.createElement('small'); count.textContent = list.length === 1 ? '1 recording' : `${list.length} recordings`;
    heading.append(art, document.createTextNode(name), count);
    const items = document.createElement('ol');
    items.append(...list.map(track => {
      const li = document.createElement('li'); const button = document.createElement('button');
      button.type = 'button'; button.className = 'music-track'; button.dataset.track = track.id;
      button.setAttribute('aria-current', String(track.id === current()?.id));
      const mark = document.createElement('span'); mark.className = 'track-mark'; mark.setAttribute('aria-hidden', 'true');
      const number = document.createElement('span'); number.className = 'track-number'; number.textContent = String(tracks.filter(t => t.composer === name).indexOf(track) + 1);
      const bars = document.createElement('span'); bars.className = 'track-bars'; bars.append(...[0, 1, 2].map(() => document.createElement('i')));
      mark.append(number, bars);
      const text = document.createElement('span'); const title = document.createElement('strong'); const detail = document.createElement('small');
      title.textContent = track.title; detail.textContent = track.detail || track.composer;
      text.append(title, detail); button.append(mark, text);
      button.addEventListener('click', () => { if (track.id === current()?.id && audio.src) toggle(); else select(track.id); });
      li.append(button); return li;
    }));
    group.append(heading, items); return group;
  }));
}
$('music-search').addEventListener('input', renderTracks);
$('music-composer').addEventListener('change', renderTracks);
if ('mediaSession' in navigator) {
  const actions = { play, pause, previoustrack: () => step(-1), nexttrack: () => step(1), seekto: details => { if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, details.seekTime); } };
  for (const [action, handler] of Object.entries(actions)) { try { navigator.mediaSession.setActionHandler(action, handler); } catch {} }
}
expand(params.get('play') !== '1');
for (const id of ['music-play', 'music-next', 'music-previous']) $(id).disabled = true;
try {
  const response = await fetch(new URL('data/recording-library.json', base));
  if (!response.ok) throw new Error('Library request failed');
  tracks = (await response.json()).tracks;
  if (!tracks?.length) throw new Error('Empty recording library');
  composers = [...new Set(tracks.map(t => t.composer))];
  for (const composer of composers) {
    const option = document.createElement('option'); option.value = option.textContent = composer; $('music-composer').append(option);
  }
  $('library-description').textContent = `${tracks.length} recordings by ${composers.length} composers. Keep exploring the site while you listen.`;
  audio.volume = Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 0.5;
  $('player-volume').value = String(audio.volume);
  const requested = params.get('track') || saved.track || 'satie-1';
  const initial = tracks.find(t => t.id === requested) || tracks[0];
  const time = params.has('time') ? Number(params.get('time')) : initial.id === saved.track ? saved.time : 0;
  select(initial.id, params.get('play') === '1', time);
  renderTracks();
  for (const id of ['music-play', 'music-next', 'music-previous']) $(id).disabled = false;
} catch {
  status('The recording library could not load. Reload this page to try again.'); expand(true);
}
