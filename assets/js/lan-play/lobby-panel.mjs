// The "Play with classmates" panel for turn-based games: your name, Host a game, games on this
// WiFi, join with a code, then the seat list until the host presses Start. It only handles the
// lobby; the game listens on the room it hands over (onRoom) and draws the board itself.
//
//   const panel = mountLobbyPanel(cardElement, {
//     app: 'chinese-checkers', game: 'Chinese Checkers',
//     seatCounts: [2, 3, 4, 6], seatCount: 2,
//     seatLabel: (i, count) => ({ name: 'Red', color: '#e5484d' }),
//     onRoom: (room, role) => { ... },        // a TurnHost or TurnGuest, once hosting / accepted
//     onHostStart: (host) => host.begin(firstState),
//     onClose: () => { ... },                 // Back pressed with no room
//   });
//   panel.open(); panel.showLobby(); panel.leave();
//
// Styles are injected once and use only inherited colours plus white/black mixes, so the panel
// sits inside a game's own card. Buttons get the game's classes (opts.classes).

import { connect, identity, TurnHost, TurnGuest, END_MESSAGES } from './turn-room.mjs';
import { watchLobbies, cleanCode, cleanName } from './net.mjs';

const CSS = `
.lp { display: grid; gap: .8rem; text-align: left; }
.lp h2 { margin: 0; text-align: center; }
.lp p { margin: 0; }
.lp-muted { opacity: .72; font-size: .9em; }
.lp label { display: grid; gap: .3rem; font-size: .9em; }
.lp input { font: inherit; color: inherit; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.25); border-radius: 10px; padding: .55rem .7rem; }
.lp input:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.lp-row { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
.lp-row > * { flex: 1 1 auto; }
.lp-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; max-height: 12rem; overflow: auto; }
.lp-list button { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: .6rem; text-align: left; font: inherit; color: inherit; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.18); border-radius: 10px; padding: .55rem .7rem; cursor: pointer; }
.lp-list button:hover:not(:disabled) { background: rgba(255,255,255,.12); }
.lp-list button:disabled { opacity: .5; cursor: default; }
.lp-list small { display: block; opacity: .72; }
.lp-code { font-family: ui-monospace, monospace; font-size: 1.05em; letter-spacing: .12em; font-weight: 700; }
.lp-bigcode { text-align: center; font-family: ui-monospace, monospace; font-size: 2.2rem; letter-spacing: .3em; font-weight: 800; margin: 0; }
.lp-seats { list-style: none; margin: 0; padding: 0; display: grid; gap: .35rem; }
.lp-seats li { display: flex; align-items: center; gap: .55rem; padding: .45rem .6rem; border-radius: 10px; background: rgba(255,255,255,.06); }
.lp-seats .lp-dot { width: .9rem; height: .9rem; border-radius: 50%; flex: none; box-shadow: 0 0 8px currentColor; }
.lp-seats .lp-who { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lp-seats .lp-tag { font-size: .78em; opacity: .75; }
.lp-seats button { font: inherit; color: inherit; background: none; border: 1px solid rgba(255,255,255,.25); border-radius: 8px; padding: .1rem .5rem; cursor: pointer; }
.lp-counts { display: flex; gap: .4rem; }
.lp-counts button { flex: 1; font: inherit; color: inherit; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.2); border-radius: 10px; padding: .4rem; cursor: pointer; }
.lp-counts button[aria-pressed="true"] { background: rgba(255,255,255,.2); border-color: currentColor; }
.lp-counts button:disabled { opacity: .4; cursor: default; }
.lp-status { font-size: .85em; opacity: .75; min-height: 1.2em; }
.lp-error { font-size: .9em; padding: .5rem .7rem; border-radius: 10px; background: rgba(255,80,80,.16); }
`;

function injectCss(doc) {
  if (doc.getElementById('lan-play-css')) return;
  const s = doc.createElement('style');
  s.id = 'lan-play-css';
  s.textContent = CSS;
  doc.head.appendChild(s);
}

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function joinCodeFromHash(hash = globalThis.location?.hash || '') {
  return cleanCode((/join=([A-Za-z]{4})/.exec(hash) || [])[1]);
}

export function mountLobbyPanel(card, opts) {
  const {
    app, game = '', seatCounts = [2], seatLabel = (i) => ({ name: `Seat ${i + 1}`, color: '#888' }),
    onRoom = () => {}, onHostStart = () => {}, onClose = () => {}, onLeave = () => {},
    classes = { primary: 'primary', secondary: 'secondary' },
  } = opts;
  let seatCount = opts.seatCount || seatCounts[0];
  const doc = card.ownerDocument;
  injectCss(doc);

  const { me, save } = identity(app);
  let net = null;          // { bus, neighborhoods } once connected
  let connecting = null;
  let watcher = null;
  let lobbies = [];
  let room = null, role = null;
  let view = 'menu';
  let error = '';

  const root = doc.createElement('div');
  root.className = 'lp';
  card.replaceChildren(root);

  function setError(msg) { error = msg || ''; render(); }

  async function ensureNet() {
    if (net) { watcher?.refresh(); return net; }
    if (!connecting) {
      connecting = connect(app).then((n) => {
        net = n;
        watcher = watchLobbies(n.bus, n.neighborhoods, (l) => { lobbies = l; if (view === 'menu') render(); });
        n.bus.on('status', () => { if (view === 'menu') render(); });
        return n;
      }).catch((e) => { connecting = null; setError(e.message); return null; });
    }
    render();
    return connecting;
  }

  function status() {
    if (!net) return connecting ? 'Connecting to the game relays…' : '';
    const s = net.bus.status();
    return `Online · ${s.connected}/${s.total} relays${net.neighborhoods.length ? ' · looking on this WiFi' : ''}`;
  }

  function nameOk() {
    me.name = cleanName(me.name, '');
    if (!me.name) { setError('Type your name first, so classmates know who you are.'); root.querySelector('[data-lp-name]')?.focus(); return false; }
    save();
    return true;
  }

  async function host() {
    if (!nameOk()) return;
    const n = await ensureNet();
    if (!n) return;
    leave();
    const h = new TurnHost(n.bus, { neighborhoods: n.neighborhoods, me, seats: seatCount, game }).start();
    room = h; role = 'host'; error = '';
    h.on('lobby', () => { if (view === 'lobby') render(); });
    view = 'lobby';
    onRoom(h, 'host');
    render();
  }

  async function join(code) {
    if (!nameOk()) return;
    const n = await ensureNet();
    if (!n) return;
    leave();
    const g = new TurnGuest(n.bus, { code, me });
    room = g; role = 'guest'; error = '';
    view = 'joining';
    g.on('joined', () => { view = 'lobby'; render(); });
    g.on('lobby', () => { if (view === 'lobby') render(); });
    g.on('link', () => { if (view === 'lobby') render(); });
    g.on('end', (why) => {
      if (room !== g) return;
      room = null; role = null;
      view = 'menu';
      error = END_MESSAGES[why] || 'The game ended.';
      render();
    });
    onRoom(g, 'guest');
    g.start();
    render();
  }

  /** Leave whatever room we're in (closes it for everyone if we're the host). */
  function leave() {
    const r = room;
    room = null; role = null;
    r?.close();
    view = 'menu';
    if (r) onLeave(r);
  }

  function seatRows(lobby) {
    const mine = role === 'host' ? 0 : lobby.mySeat;
    return lobby.seats.map((s, i) => {
      const { name, color } = seatLabel(i, lobby.seats.length);
      const who = s.kind === 'cpu' ? 'Computer' : s.name;
      const tags = [];
      if (i === mine) tags.push('you');
      if (s.kind === 'host') tags.push('host');
      if (s.away) tags.push('dropped out · computer playing');
      else if (s.kind === 'guest' && s.via) tags.push(s.via === 'p2p' ? 'direct' : 'via relay');
      const kick = role === 'host' && s.kind === 'guest' ? `<button type="button" data-lp-kick="${esc(s.id)}" aria-label="Remove ${esc(who)}">✕</button>` : '';
      return `<li><span class="lp-dot" style="color:${esc(color)};background:${esc(color)}"></span><span class="lp-who"><b>${esc(name)}</b> · ${esc(who)}${tags.length ? ` <span class="lp-tag">(${esc(tags.join(', '))})</span>` : ''}</span>${kick}</li>`;
    }).join('');
  }

  // Only what changed is redrawn: a whole redraw would steal focus from the name box while
  // someone types, and swap a button out from under a click.
  let lastView = null, lastHtml = '', lastParts = {};
  function paint(html, parts) {
    if (lastView !== view || !parts) {
      if (html !== lastHtml || lastView !== view) { root.innerHTML = html; lastParts = { ...(parts || {}) }; }
    } else {
      // compared with what we last wrote, not el.innerHTML: the browser re-serialises entities
      // (&#39; comes back as '), which would make every part look changed every time
      for (const [sel, inner] of Object.entries(parts)) {
        const el = root.querySelector(sel);
        if (el && lastParts[sel] !== inner) { el.innerHTML = inner; lastParts[sel] = inner; }
      }
      const errEl = root.querySelector('[data-lp-err]');
      if (errEl) { errEl.hidden = !error; errEl.textContent = error; }
    }
    lastView = view; lastHtml = html;
  }

  function render() {
    const err = `<p class="lp-error" role="alert" data-lp-err ${error ? '' : 'hidden'}>${esc(error)}</p>`;
    if (view === 'menu') {
      // a running game stays joinable: a player who dropped out gets their seat back, anyone else watches
      const nearby = !net ? '' : lobbies.length
        ? lobbies.map(l => `<li><button type="button" data-lp-join="${l.code}" ${l.players >= l.max && l.phase !== 'play' ? 'disabled' : ''}><span><b>${esc(l.host)}'s game</b><small>${l.players}/${l.max} players${l.phase === 'play' ? ' · playing now' : ''}</small></span><span class="lp-code">${l.code}</span></button></li>`).join('')
        : `<li class="lp-muted">${net.neighborhoods.length ? 'No games on this WiFi yet. Host one, or wait a moment.' : 'Couldn’t detect your WiFi. Join with a code instead.'}</li>`;
      const nearbyHtml = nearby || '<li class="lp-muted">Looking…</li>';
      const countsHtml = seatCounts.map(c => `<button type="button" data-lp-count="${c}" aria-pressed="${c === seatCount}">${c}</button>`).join('');
      paint(`
        <h2>Play with classmates</h2>
        <p class="lp-muted">Everyone on the same WiFi can play on one board. Empty seats are played by the computer.</p>
        ${err}
        <label>Your name <input data-lp-name maxlength="16" autocomplete="nickname" value="${esc(me.name)}" placeholder="First name"></label>
        <div><p class="lp-muted" style="margin-bottom:.35rem">Players</p><div class="lp-counts" data-lp-counts>${countsHtml}</div></div>
        <button type="button" class="${classes.primary}" data-lp-host>Host a game</button>
        <div><p class="lp-muted" style="margin-bottom:.35rem">Games on this WiFi</p><ul class="lp-list" data-lp-nearby>${nearbyHtml}</ul></div>
        <form class="lp-row" data-lp-code-form><input data-lp-code maxlength="4" placeholder="Code" aria-label="Game code" autocapitalize="characters" style="text-transform:uppercase;max-width:8rem"><button type="submit" class="${classes.secondary}">Join</button></form>
        <p class="lp-status" data-lp-status>${esc(status())}</p>
        <div class="lp-row"><button type="button" class="${classes.secondary}" data-lp-back>Back</button></div>`,
        { '[data-lp-nearby]': nearbyHtml, '[data-lp-status]': esc(status()), '[data-lp-counts]': countsHtml });
    } else if (view === 'joining') {
      paint(`<h2>Joining ${esc(room?.code || '')}…</h2><p class="lp-muted">Knocking on the host’s door.</p><div class="lp-row"><button type="button" class="${classes.secondary}" data-lp-leave>Cancel</button></div>`);
    } else if (view === 'lobby' && room) {
      const lobby = room.lobby();
      const isHost = role === 'host';
      const humans = lobby.seats.filter(s => s.kind !== 'cpu').length;
      const link = (() => { try { const u = new URL(location.href); u.hash = 'join=' + lobby.code; return u.href; } catch { return ''; } })();
      paint(`
        <h2>${isHost ? 'Your game' : 'In the lobby'}</h2>
        <p class="lp-muted" style="text-align:center">${isHost ? 'Classmates on this WiFi will see it. Anyone else can join with this code:' : 'Game code'}</p>
        <p class="lp-bigcode">${esc(lobby.code)}</p>
        ${err}
        ${isHost ? `<div class="lp-counts" aria-label="Players">${seatCounts.map(c => `<button type="button" data-lp-count="${c}" aria-pressed="${c === lobby.seats.length}" ${c < humans ? 'disabled' : ''}>${c}</button>`).join('')}</div>` : ''}
        <ul class="lp-seats">${seatRows(lobby)}</ul>
        ${isHost ? (lobby.phase === 'play'
          ? `<p class="lp-muted">A game is running.</p><div class="lp-row"><button type="button" class="${classes.primary}" data-lp-resume>Back to the board</button></div>`
          : `<div class="lp-row"><button type="button" class="${classes.primary}" data-lp-start>Start game</button></div>`)
          : `<p class="lp-muted" style="text-align:center">${lobby.mySeat >= 0 ? 'Waiting for the host to start…' : 'No free seat: you’ll watch this game.'}</p>`}
        <div class="lp-row">${link ? `<button type="button" class="${classes.secondary}" data-lp-copy>Copy join link</button>` : ''}<button type="button" class="${classes.secondary}" data-lp-leave>${isHost ? 'Close game' : 'Leave'}</button></div>`);
    }
  }

  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-lp-name]')) { me.name = cleanName(e.target.value, ''); save(); if (error) setError(''); }
  });
  root.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-lp-code-form]')) return;
    e.preventDefault();
    const code = cleanCode(root.querySelector('[data-lp-code]').value);
    if (!code) { setError('Codes are 4 letters, like BKZT.'); return; }
    join(code);
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.matches('[data-lp-count]')) {
      const c = +b.dataset.lpCount;
      if (role === 'host') { if (room.setSeatCount(c)) seatCount = c; }
      else seatCount = c;
      render();
    } else if (b.matches('[data-lp-host]')) host();
    else if (b.matches('[data-lp-join]')) join(b.dataset.lpJoin);
    else if (b.matches('[data-lp-kick]')) room?.kick?.(b.dataset.lpKick);
    else if (b.matches('[data-lp-start]')) { error = ''; onHostStart(room); }
    else if (b.matches('[data-lp-resume]')) onHostStart(room, { resume: true });
    else if (b.matches('[data-lp-leave]')) { leave(); render(); }
    else if (b.matches('[data-lp-back]')) onClose();
    else if (b.matches('[data-lp-copy]')) {
      const u = new URL(location.href); u.hash = 'join=' + room.code;
      navigator.clipboard?.writeText(u.href).then(() => { b.textContent = 'Copied!'; }, () => { b.textContent = u.href; });
    }
  });

  return {
    open() { if (!room) view = 'menu'; error = ''; render(); ensureNet(); },
    /** Join from a link: needs a name first, so without one the code waits in the box. */
    join(code) {
      if (cleanName(me.name, '')) { join(code); return; }
      view = 'menu'; render();
      const box = root.querySelector('[data-lp-code]');
      if (box) box.value = code;
      setError('Type your name, then press Join.');
      root.querySelector('[data-lp-name]')?.focus();
    },
    showLobby() { if (room) { view = 'lobby'; render(); } },
    showError(msg) { setError(msg); },
    leave() { leave(); render(); },
    get room() { return room; },
    get role() { return role; },
    me,
  };
}
