import { NOISE_COLORS, noiseTrack } from './noise-colors.mjs';

const base = new URL('../../', import.meta.url);
const shellURL = new URL('listen.html', base);
const params = new URL(location.href).searchParams;
const $ = id => document.getElementById(id);
const audio = $('site-music-audio');
const frame = $('music-browser');
const defaultTrack = 'satie-1';
const storageKey = 'classroomos-music-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
let tracks = [], composers = [], index = 0, shuffle = saved.shuffle === true;
let loadingLibrary = false;
let repeat = ['one', 'all'].includes(saved.repeatMode) ? saved.repeatMode : saved.repeat === true ? 'all' : 'off';
let dockSize = saved.dockSize === 'tiny' ? 'tiny' : 'compact';
let sources = [], sourceIndex = 0, wantsPlayback = false;
let pendingTime = 0, playRequest = 0, lastSave = 0;
// A noise colour id while a generator, not a recording, is the source. index keeps the last recording.
let noise = null, noiseEngine = null;
const canMakeNoise = 'AudioWorkletNode' in window && 'MediaStreamAudioDestinationNode' in window && isSecureContext;
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
function monogram(composer) { const words = composer.split(/\s+/); return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase(); }
function setButton(button, label, path) {
  button.setAttribute('aria-label', label); button.title = label;
  button.querySelector('path').setAttribute('d', path);
}
function save() {
  if (!current()) return;
  const time = noise ? saved.time : audio.currentTime || pendingTime;
  try { localStorage.setItem(storageKey, JSON.stringify({ track: current().id, time, noise, volume: audio.volume, muted: audio.muted, shuffle, repeat: repeat !== 'off', repeatMode: repeat, dockSize })); } catch {}
  saved.time = time;
}
function snapshot() { return { track: noise ? noiseTrack(noise) : current(), playing: !audio.paused, volume: audio.volume }; }
function update() {
  const playing = !audio.paused;
  for (const id of ['music-play', 'music-next', 'music-previous']) $(id).disabled = !current() && !noise;
  $('site-player').dataset.playing = String(playing);
  $('music-play').querySelector('path').setAttribute('d', playing ? 'M8 5v14M16 5v14' : 'm8 5 11 7-11 7Z');
  $('music-play').setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  $('music-play').title = playing ? 'Pause music' : 'Play music';
  $('music-shuffle').setAttribute('aria-pressed', String(shuffle));
  $('music-repeat').setAttribute('aria-pressed', String(repeat !== 'off'));
  $('music-shuffle').disabled = $('music-repeat').disabled = !current() || !!noise;
  audio.loop = !noise && repeat === 'one';
  const loopLabel = noise ? 'Noise plays continuously' : `Loop: ${repeat === 'one' ? 'this recording' : repeat === 'all' ? 'all recordings' : 'off'}`;
  $('music-repeat').title = loopLabel;
  const loopBadge = $('music-repeat').querySelector('.music-loop-mode');
  loopBadge.hidden = !!noise || repeat === 'off';
  loopBadge.textContent = repeat === 'one' ? '1' : 'all';
  $('music-feature-state').textContent = playing ? 'Now playing' : audio.currentTime > 0 ? 'Paused' : 'Ready to play';
  document.querySelectorAll('.music-noise-color').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.noise === noise)));
  $('music-mute').setAttribute('aria-pressed', String(audio.muted));
  $('music-mute').title = audio.muted ? 'Unmute' : 'Mute';
  $('player-volume').setAttribute('aria-valuetext', `${Math.round(audio.volume * 100)} percent`);
  $('player-volume').style.setProperty('--music-progress', `${audio.volume * 100}%`);
  $('music-repeat-description').textContent = loopLabel;
  document.querySelectorAll('.music-track').forEach(button => button.setAttribute('aria-current', String(!noise && button.dataset.track === current()?.id)));
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  window.dispatchEvent(new CustomEvent('site-music-change', { detail: snapshot() }));
  save();
}
function classroomRecording() {
  const alternatives = tracks.filter(track => track.classroomCopy && track !== current());
  return alternatives.find(track => track.id === defaultTrack) || alternatives[0];
}
function status(message, offerClassroom = false) {
  if ($('music-announcement').textContent !== message) $('music-announcement').textContent = message;
  $('music-status').textContent = message;
  const copy = offerClassroom && classroomRecording();
  $('music-classroom-copy').hidden = !copy;
}
function expand(value, focus = false) {
  const focusInLibrary = $('music-library').contains(document.activeElement);
  $('music-library').hidden = !value;
  $('site-player').classList.toggle('has-library', value);
  $('music-library-toggle').setAttribute('aria-expanded', String(value));
  const tiny = !value && dockSize === 'tiny';
  $('site-player').classList.toggle('is-tiny', tiny);
  setButton($('music-expand'), tiny ? 'Restore compact player' : 'Collapse to single row', tiny ? icons.grow : icons.shrink);
  $('music-library-toggle').setAttribute('aria-label', value ? 'Minimize music library' : 'Expand music library');
  $('music-library-toggle').title = value ? 'Minimize music library' : 'Expand music library';
  if (!value) maximize(false);
  if (value && focus) $('music-library-title').focus();
  if (!value && (focus || focusInLibrary)) $('music-library-toggle').focus();
}
async function play() {
  if (!current() && !noise) return;
  const request = ++playRequest;
  wantsPlayback = true;
  status(noise ? 'Starting noise generator…' : 'Loading recording…');
  try {
    let noiseReady;
    if (noise) {
      noiseReady = prepareNoise();
    } else if (audio.error) {
      // A fresh Play tap retries the preferred source after a network or decode failure.
      pendingTime = audio.currentTime || pendingTime;
      sourceIndex = 0;
      audio.src = sources[sourceIndex];
    }
    // paused flips as soon as play() is called; show it now rather than when the play event arrives.
    const starting = audio.play();
    update();
    await Promise.all([starting, noiseReady]);
    if (request === playRequest) status('');
  } catch (error) {
    if (request !== playRequest) return;
    if (error.name === 'NotAllowedError') {
      wantsPlayback = false;
      status('Tap Play to start listening on this device.');
      expand(true);
    } else if (noise) {
      pause();
      const engine = noiseEngine;
      noiseEngine = null;
      audio.srcObject = null;
      engine?.ctx.close().catch(() => {});
      status('The noise generator could not start. Tap Play to retry or choose a recording.');
      expand(true);
    } else if (!audio.error) {
      wantsPlayback = false;
      status('This recording could not start. Tap Play to retry or choose another recording.', true);
      expand(true);
    }
    update();
  }
}
function pause() { ++playRequest; wantsPlayback = false; audio.pause(); status(''); update(); }
// Noise is computed by an AudioWorklet and handed to the same <audio> element as a live stream,
// so play/pause, volume, mute and the lock-screen controls work exactly as they do for recordings.
function prepareNoise() {
  if (!noiseEngine) {
    const ctx = new AudioContext();
    noiseEngine = { ctx, dest: ctx.createMediaStreamDestination(), node: null, color: null,
      ready: ctx.audioWorklet.addModule(new URL('noise-generator.worklet.js', import.meta.url)) };
  }
  const engine = noiseEngine;
  const color = noise;
  const ready = Promise.all([engine.ready, engine.ctx.resume()]).then(() => {
    if (noiseEngine !== engine || noise !== color || !wantsPlayback || engine.color === color) return;
    engine.node?.disconnect();
    engine.node = new AudioWorkletNode(engine.ctx, 'noise-generator', { numberOfInputs: 0, outputChannelCount: [2], processorOptions: { color } });
    engine.node.connect(engine.dest);
    engine.color = color;
  });
  if (audio.srcObject !== engine.dest.stream) audio.srcObject = engine.dest.stream;
  return ready;
}
function stopNoise() {
  noise = null;
  if (!noiseEngine) return;
  noiseEngine.node?.disconnect();
  noiseEngine.node = noiseEngine.color = null;
  noiseEngine.ctx.suspend().catch(() => {});
}
function show({ title, composer, art, hue, detail, credit, source, lesson, album }) {
  $('playing-title').textContent = $('feature-title').textContent = title;
  $('playing-composer').textContent = $('feature-composer').textContent = composer;
  $('music-art').textContent = $('music-art-large').textContent = art;
  $('site-player').style.setProperty('--music-hue', hue);
  document.querySelector('.music-now').title = `${title} — ${composer}`;
  $('playing-detail').textContent = detail;
  $('playing-credit').textContent = credit;
  $('recording-source').hidden = !source;
  $('recording-lesson').hidden = !lesson;
  if (source) $('recording-source').href = source;
  if (lesson) $('recording-lesson').href = new URL(lesson, base);
  $('music-seek').disabled = true;
  $('music-seek').value = '0';
  $('music-seek').setAttribute('aria-valuetext', '0:00 of 0:00');
  $('music-seek').style.setProperty('--music-progress', '0%');
  $('music-seek').style.setProperty('--music-buffered', '0%');
  $('music-elapsed').textContent = '0:00';
  $('music-duration').textContent = '0:00';
  if ('mediaSession' in navigator && 'MediaMetadata' in window) navigator.mediaSession.metadata = new MediaMetadata({ title, artist: composer, album });
}
function select(id, start = true, time = 0) {
  const next = tracks.findIndex(track => track.id === id);
  if (next < 0) return;
  ++playRequest;
  audio.pause();
  if (noise) { stopNoise(); audio.srcObject = null; }
  index = next; wantsPlayback = false;
  const position = Number(time);
  pendingTime = Number.isFinite(position) ? Math.max(0, position) : 0;
  const track = current();
  sources = [track.classroomCopy && new URL(track.classroomCopy, base).href, track.src, track.fallback].filter(Boolean);
  sourceIndex = 0;
  audio.src = sources[sourceIndex];
  show({ ...track, art: monogram(track.composer), hue: hueFor(track.composer), album: 'ClassroomOS recordings' });
  status(''); update();
  if (start) play();
}
function selectNoise(id, start = true) {
  const color = NOISE_COLORS.find(c => c.id === id);
  if (!color || !canMakeNoise) return;
  ++playRequest;
  wantsPlayback = false;
  audio.pause();
  noise = color.id; pendingTime = 0;
  if (!audio.srcObject) { audio.removeAttribute('src'); audio.load(); }
  show({ title: color.name, composer: 'Noise generator', art: '≋', hue: color.hue, detail: `${color.slope} · ${color.about}`,
    credit: 'Generated live in your browser: nothing to download, and it never loops.', album: 'ClassroomOS noise generators' });
  $('music-duration').textContent = '∞';
  status(''); update();
  if (start) play();
}
function step(direction, start = !audio.paused) {
  if (noise) {
    const at = NOISE_COLORS.findIndex(c => c.id === noise);
    selectNoise(NOISE_COLORS[(at + direction + NOISE_COLORS.length) % NOISE_COLORS.length].id, start);
    return;
  }
  if (!tracks.length) return;
  let next = (index + direction + tracks.length) % tracks.length;
  if (shuffle && tracks.length > 1) next = (index + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length;
  select(tracks[next].id, start);
}
function toggle() { if (audio.paused) play(); else pause(); }
function setVolume(value) {
  audio.muted = false;
  audio.volume = Math.min(1, Math.max(0, Number(value) || 0));
  $('player-volume').value = String(audio.volume);
  update();
}
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
window.SiteMusic = { isHost: true, snapshot, toggle, pause, select, setVolume, expand, syncNavigation, open: () => expand(true, true), previous: () => step(-1), next: () => step(1) };
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
$('music-exit').addEventListener('click', event => {
  if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) pause();
});
$('recording-lesson').addEventListener('click', event => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  frame.src = event.currentTarget.href;
  expand(false);
  frame.focus();
});
$('music-play').addEventListener('click', toggle);
$('music-classroom-copy').addEventListener('click', () => {
  const track = classroomRecording();
  if (!track) return;
  $('music-play').focus();
  select(track.id);
});
$('music-next').addEventListener('click', () => step(1));
$('music-previous').addEventListener('click', () => { if (!noise && audio.currentTime > 3) audio.currentTime = 0; else step(-1); });
$('music-library-toggle').addEventListener('click', () => expand($('music-library').hidden, true));
$('music-expand').addEventListener('click', () => {
  dockSize = $('site-player').classList.contains('is-tiny') ? 'compact' : 'tiny';
  expand(false);
  save();
});
$('music-minimize').addEventListener('click', () => expand(false, true));
function maximize(active) {
  $('site-player').classList.toggle('is-maximized', active);
  frame.inert = active;
  $('music-maximize').setAttribute('aria-pressed', String(active));
  $('music-maximize').title = active ? 'Restore library size' : 'Maximize library';
  $('music-maximize').querySelector('path').setAttribute('d', active ? icons.restore : icons.maximize);
}
$('music-maximize').addEventListener('click', () => maximize(!$('site-player').classList.contains('is-maximized')));
$('site-player').addEventListener('keydown', event => {
  if (event.defaultPrevented || event.key !== 'Escape' || $('music-library').hidden) return;
  if (event.target === $('music-search') && event.target.value) {
    event.preventDefault();
    event.target.value = '';
    renderTracks();
    return;
  }
  expand(false, true);
});
$('music-shuffle').addEventListener('click', () => { shuffle = !shuffle; update(); });
$('music-repeat').addEventListener('click', () => { repeat = repeat === 'off' ? 'one' : repeat === 'one' ? 'all' : 'off'; update(); });
$('player-volume').addEventListener('input', event => setVolume(event.target.value));
$('music-mute').addEventListener('click', () => { audio.muted = !audio.muted; update(); });
$('music-seek').addEventListener('input', event => {
  if (event.target.disabled) return;
  audio.currentTime = Number(event.target.value) / 100 * audio.duration;
  updateTimeline();
});
function format(seconds) { return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00'; }
function updateTimeline() {
  const seek = $('music-seek');
  const seekable = !noise && Number.isFinite(audio.duration) && audio.duration > 0;
  seek.disabled = !seekable;
  $('music-duration').textContent = noise ? '∞' : format(audio.duration);
  $('music-elapsed').textContent = format(audio.currentTime);
  seek.value = seekable ? String(audio.currentTime / audio.duration * 100) : '0';
  seek.style.setProperty('--music-progress', `${seek.value}%`);
  seek.setAttribute('aria-valuetext', `${format(audio.currentTime)} of ${format(audio.duration)}`);
}
audio.addEventListener('loadedmetadata', () => {
  if (!noise && pendingTime && Number.isFinite(audio.duration)) {
    audio.currentTime = Math.min(pendingTime, Math.max(0, audio.duration - 0.1));
    pendingTime = 0;
  }
  updateTimeline();
});
audio.addEventListener('durationchange', updateTimeline);
audio.addEventListener('emptied', () => $('music-seek').style.setProperty('--music-buffered', '0%'));
audio.addEventListener('timeupdate', () => {
  updateTimeline();
  if (Date.now() - lastSave > 5000) { save(); lastSave = Date.now(); }
});
for (const name of ['play', 'pause']) audio.addEventListener(name, update);
// A paused generator would otherwise keep computing samples nobody hears.
audio.addEventListener('pause', () => { if (noise && audio.paused) noiseEngine?.ctx.suspend().catch(() => {}); });
audio.addEventListener('progress', () => {
  const { buffered, duration } = audio;
  if (buffered.length && duration) $('music-seek').style.setProperty('--music-buffered', `${buffered.end(buffered.length - 1) / duration * 100}%`);
});
audio.addEventListener('playing', () => { if (!noise && wantsPlayback) status(''); });
audio.addEventListener('waiting', () => { if (!noise && wantsPlayback) status('Buffering recording…'); });
audio.addEventListener('ended', () => {
  if (index === tracks.length - 1 && repeat !== 'all' && !shuffle) { status('End of the library. Choose a recording or turn on Loop all.'); update(); }
  else step(1, true);
});
audio.addEventListener('error', () => {
  if (!audio.error) return;
  if (!noise && wantsPlayback && sourceIndex + 1 < sources.length) {
    pendingTime = audio.currentTime || pendingTime;
    audio.src = sources[++sourceIndex];
    play();
    return;
  }
  wantsPlayback = false;
  audio.pause();
  status('This recording is unavailable. Tap Play to retry or choose another recording.', !noise);
  expand(true); update();
});
addEventListener('pagehide', save);
function renderTracks() {
  const terms = searchable($('music-search').value).trim().split(/\s+/);
  const composer = $('music-composer').value;
  const visible = tracks.filter(track => {
    if (composer && track.composer !== composer) return false;
    const text = searchable(`${track.title} ${track.composer} ${track.detail} ${track.credit}`);
    return terms.every(term => text.includes(term));
  });
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
      button.setAttribute('aria-current', String(!noise && track.id === current()?.id));
      const mark = document.createElement('span'); mark.className = 'track-mark'; mark.setAttribute('aria-hidden', 'true');
      const number = document.createElement('span'); number.className = 'track-number'; number.textContent = String(tracks.filter(t => t.composer === name).indexOf(track) + 1);
      const bars = document.createElement('span'); bars.className = 'track-bars'; bars.append(...[0, 1, 2].map(() => document.createElement('i')));
      mark.append(number, bars);
      const text = document.createElement('span'); const title = document.createElement('strong'); const detail = document.createElement('small');
      title.textContent = track.title;
      detail.textContent = (track.detail || track.composer) + (track.classroomCopy ? ' · Classroom copy' : '');
      text.append(title, detail); button.append(mark, text);
      button.addEventListener('click', () => { if (!noise && track.id === current()?.id) toggle(); else select(track.id); });
      li.append(button); return li;
    }));
    group.append(heading, items); return group;
  }));
}
function searchable(text) { return text.normalize('NFD').replace(/\p{Mark}/gu, '').toLocaleLowerCase(); }
function renderNoise() {
  $('music-noise-list').replaceChildren(...NOISE_COLORS.map(color => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'music-noise-color'; button.dataset.noise = color.id;
    button.style.setProperty('--noise-swatch', color.swatch);
    button.setAttribute('aria-pressed', String(color.id === noise));
    button.title = color.about;
    const swatch = document.createElement('span'); swatch.className = 'noise-swatch'; swatch.setAttribute('aria-hidden', 'true');
    const name = document.createElement('strong'); name.textContent = color.name.replace(' noise', '');
    const slope = document.createElement('small'); slope.textContent = color.slope;
    button.setAttribute('aria-label', `${color.name}, ${color.slope}`);
    button.append(swatch, name, slope);
    button.addEventListener('click', () => { if (color.id === noise && audio.srcObject) toggle(); else selectNoise(color.id); });
    return button;
  }));
}
$('music-search').addEventListener('input', renderTracks);
$('music-composer').addEventListener('change', renderTracks);
if ('mediaSession' in navigator) {
  const actions = { play, pause, previoustrack: () => step(-1), nexttrack: () => step(1), seekto: details => { if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, details.seekTime); } };
  for (const [action, handler] of Object.entries(actions)) { try { navigator.mediaSession.setActionHandler(action, handler); } catch {} }
}
expand(params.get('play') !== '1');
audio.volume = Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 0.5;
audio.muted = saved.muted === true;
$('player-volume').value = String(audio.volume);
if (canMakeNoise) renderNoise(); else document.querySelector('.music-noise').hidden = true;
async function loadLibrary() {
  if (loadingLibrary) return;
  loadingLibrary = true;
  status('Loading recording library…');
  try {
    const response = await fetch(new URL('data/recording-library.json', base));
    if (!response.ok) throw new Error('Library request failed');
    const library = (await response.json()).tracks;
    if (!Array.isArray(library) || !library.length) throw new Error('Empty recording library');
    const activeNoise = noise;
    tracks = library;
    composers = [...new Set(tracks.map(t => t.composer))];
    for (const composer of composers) {
      const option = document.createElement('option'); option.value = option.textContent = composer; $('music-composer').append(option);
    }
    $('library-description').textContent = `${tracks.length} recordings by ${composers.length} composers. Keep exploring the site while you listen.`;
    const requested = params.get('track') || saved.track || defaultTrack;
    const initial = tracks.find(t => t.id === requested) || tracks[0];
    const time = params.has('time') ? Number(params.get('time')) : initial.id === saved.track ? saved.time : 0;
    const start = params.get('play') === '1';
    const restoreNoise = canMakeNoise && !params.has('track') && noiseTrack(saved.noise);
    if (activeNoise || restoreNoise) {
      index = tracks.indexOf(initial);
      saved.time = time;
      if (activeNoise) { status(''); update(); }
      else selectNoise(saved.noise, start);
    } else {
      select(initial.id, start, time);
    }
    renderTracks();
    if (document.activeElement === $('music-retry-library')) $('music-library-title').focus();
    $('music-retry-library').hidden = true;
  } catch {
    status('The recording library could not load.');
    $('music-retry-library').hidden = false;
    expand(true);
  } finally {
    loadingLibrary = false;
  }
}
$('music-retry-library').addEventListener('click', loadLibrary);
update();
loadLibrary();
