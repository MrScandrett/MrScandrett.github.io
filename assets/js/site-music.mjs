// Shared entry point. The listening shell owns the audio; pages inside it borrow its controls.
const base = new URL('../../', import.meta.url);
const storageKey = 'classroomos-music-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
let tracks = [];
let selected = saved.track || 'satie-1';
let volume = Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 0.5;
let host;
try { if (parent !== window && parent.SiteMusic?.isHost) host = parent.SiteMusic; } catch {}

function open({ play = false, track, time = 0 } = {}) {
  if (host) {
    if (track) host.select(track, play, time);
    host.expand(true);
    return;
  }
  const url = new URL('listen.html', base);
  url.searchParams.set('browse', location.pathname + location.search + location.hash);
  url.searchParams.set('track', track || selected);
  if (play) url.searchParams.set('play', '1');
  if (time) url.searchParams.set('time', String(time));
  try { localStorage.setItem(storageKey, JSON.stringify({ ...saved, track: track || selected, volume })); } catch {}
  location.assign(url);
}
function snapshot() {
  return host ? host.snapshot() : { track: tracks.find(t => t.id === selected), playing: false, volume };
}
function notify() { window.dispatchEvent(new CustomEvent('site-music-change', { detail: snapshot() })); }
export const SiteMusic = host || {
  open, snapshot,
  toggle: () => open({ play: true }),
  previous: () => move(-1), next: () => move(1),
  setVolume(value) { volume = Math.min(1, Math.max(0, Number(value))); notify(); },
};
window.SiteMusic = SiteMusic;
const css = document.createElement('link');
css.rel = 'stylesheet'; css.href = new URL('assets/css/site-music.css', base);
document.head.append(css);
function move(direction) {
  if (!tracks.length) return;
  const index = tracks.findIndex(t => t.id === selected);
  selected = tracks[(index + direction + tracks.length) % tracks.length].id;
  notify();
}

if (host) {
  const forward = () => notify();
  parent.addEventListener('site-music-change', forward);
  window.addEventListener('pagehide', () => parent.removeEventListener('site-music-change', forward), { once: true });
  // Lesson recordings take the foreground when the visitor explicitly starts one.
  document.addEventListener('play', event => { if (event.target.matches('audio, video')) host.pause(); }, true);
  const sync = () => host.syncNavigation();
  addEventListener('hashchange', sync);
  addEventListener('popstate', sync);
  sync();
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href);
    if (/^https?:$/.test(url.protocol) && url.origin !== location.origin && !anchor.target) {
      anchor.target = '_blank'; anchor.rel = 'noopener';
    }
    if (url.origin === location.origin && ['_top', '_parent'].includes(anchor.target)) anchor.target = '_self';
  }, true);
} else {
  const launcher = document.createElement('a');
  launcher.className = 'site-music-launcher';
  launcher.href = new URL('listen.html', base);
  launcher.textContent = '♫ Music';
  launcher.setAttribute('aria-label', 'Open website music player');
  launcher.addEventListener('click', event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); open(); } });
  if (!document.getElementById('mPlayBtn')) document.body.append(launcher);
}

// Make the same library reachable from each existing lesson player without duplicating metadata.
async function boot() {
  try {
    const response = await fetch(new URL('data/recording-library.json', base));
    if (!response.ok) throw new Error('Recording library unavailable');
    tracks = (await response.json()).tracks;
    if (!tracks.some(t => t.id === selected)) selected = tracks[0]?.id;
    document.querySelectorAll('.fl-player').forEach(player => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'music-continue';
      button.textContent = 'Keep listening while exploring';
      button.addEventListener('click', () => {
        const audio = player.querySelector('audio');
        const track = tracks.find(t => t.src === audio?.src || t.fallback === audio?.src);
        if (!track) return;
        const time = audio.currentTime;
        audio.pause();
        open({ track: track.id, play: true, time });
      });
      player.append(button);
    });
    notify();
  } catch {
    // The launcher still opens the player, which offers a visible retry message.
  }
}
boot();
