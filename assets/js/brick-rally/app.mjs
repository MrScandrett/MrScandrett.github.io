// Brick Rally: build or scan a brick car, then race it solo or with anyone on your WiFi.
// UI + game loop. The maths lives in car-model / scan / track / physics (pure, tested),
// the networking in net.mjs, the drawing in render.mjs.

import * as Car from './car-model.mjs';
import { carveCar, segment } from './scan.mjs';
import { TRACKS, buildTrack, gridSlot, pointAt } from './track.mjs';
import { DT, newCar, stepCar, botInput, collideCars } from './physics.mjs';
import { Bus, HostSession, GuestSession, findNeighborhood, watchLobbies, relayFromUrl, makeCode, cleanCode, cleanName, randomId } from './net.mjs';
import { Scene3D } from './render.mjs';

const STORE = 'classroomos:brick-rally:v1';
const MAX_PLAYERS = 8;
const BOT_NAMES = ['Brickbot', 'Stud Muffin', 'Axle', 'Gearbox', 'Sprocket', 'Turbo Tile', 'Hinge', 'Baseplate Bob'];
const SEND_HZ = 20;

const $ = (root, sel) => root.querySelector(sel);
const $$ = (root, sel) => [...root.querySelectorAll(sel)];
const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const fmtTime = (ms) => { if (ms == null) return '—'; const s = ms / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`; };
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function save(data) { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch { /* private mode */ } }

export function mount(root) {
  if (!root) return;
  const canvas = $(root, '.br-canvas');
  let scene;
  try { scene = new Scene3D(canvas); } catch (e) {
    root.classList.add('br-no-webgl');
    $(root, '[data-br-toast]').textContent = 'This browser could not start 3D graphics (WebGL).';
    return;
  }

  // ------------------------------------------------------------------ state
  const saved = load();
  const me = {
    id: randomId(8),
    name: cleanName(saved.name || ''),
    cells: (saved.car && Car.decodeCar(saved.car)) || Car.preset('roadster'),
  };
  let tool = 'add', color = 1, mirror = true;
  const undo = [], redo = [];
  const shots = { side: null, front: null, top: null };

  let net = null;          // { bus, neighborhoods, watcher }
  let session = null;      // HostSession | GuestSession | null
  let role = null;         // 'solo' | 'host' | 'guest'
  let lobby = { players: [], track: TRACKS[0].id, laps: 3, bots: 3, phase: 'lobby' };
  let race = null;

  const screens = Object.fromEntries($$(root, '[data-br-screen]').map(el => [el.dataset.brScreen, el]));
  function show(name) {
    if (root.dataset.brView === name) return;
    for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
    root.dataset.brView = name;
    scene.setBuilding(name === 'garage' && root.dataset.brTab === 'build');
    screens[name]?.querySelector('h2')?.focus?.({ preventScroll: true });
  }

  const toastEl = $(root, '[data-br-toast]');
  let toastTimer;
  function toast(text, ms = 3500) {
    toastEl.textContent = text;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), ms);
  }

  function persist() { save({ name: me.name, car: Car.encodeCar(me.cells) }); }

  // ------------------------------------------------------------------ garage
  const nameInput = $(root, '[data-br-name]');
  nameInput.value = saved.name || '';
  nameInput.addEventListener('input', () => { me.name = cleanName(nameInput.value); persist(); });

  const presetBox = $(root, '[data-br-presets]');
  presetBox.innerHTML = Car.PRESETS.map(p => `<button type="button" data-preset="${p.id}">${esc(p.name)}</button>`).join('');
  presetBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    setCells(Car.preset(b.dataset.preset), true);
  });

  const swatches = $(root, '[data-br-swatches]');
  swatches.innerHTML = Car.PALETTE.slice(1).map((p, i) => `<button type="button" class="br-swatch" style="--c:${p.hex}" data-color="${i + 1}" aria-label="${p.name}" title="${p.name}" aria-pressed="${i + 1 === color}"></button>`).join('');
  swatches.addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (!b) return;
    color = +b.dataset.color;
    $$(swatches, '[data-color]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    if (tool === 'remove') setTool('add');
  });

  function setTool(t) {
    tool = t;
    $$(root, '[data-br-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.brTool === t)));
  }
  $$(root, '[data-br-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.brTool)));
  const mirrorBox = $(root, '[data-br-mirror]');
  mirrorBox.checked = mirror;
  mirrorBox.addEventListener('change', () => { mirror = mirrorBox.checked; });
  $(root, '[data-br-undo]').addEventListener('click', () => { if (undo.length) { redo.push(Car.encodeCar(me.cells)); setCells(Car.decodeCar(undo.pop()), false); } });
  $(root, '[data-br-redo]').addEventListener('click', () => { if (redo.length) { undo.push(Car.encodeCar(me.cells)); setCells(Car.decodeCar(redo.pop()), false); } });
  $(root, '[data-br-clear]').addEventListener('click', () => {
    const c = Car.emptyCar();
    Car.fillBox(c, 1, 0, 1, 8, 0, 14, 5); // keep a chassis so there's something to build on
    setCells(c, true);
  });

  const statsEl = $(root, '[data-br-stats]');
  function renderStats() {
    const st = Car.carStats(me.cells);
    const bar = (label, v) => `<div class="br-stat"><span>${label}</span><meter min="0" max="10" value="${v}" aria-label="${label} ${v} of 10"></meter></div>`;
    statsEl.innerHTML = `${bar('Top speed', st.bars.speed)}${bar('Acceleration', st.bars.accel)}${bar('Grip', st.bars.grip)}${bar('Weight', st.bars.weight)}<p class="br-muted">${st.bricks} bricks</p>`;
  }

  function setCells(cells, record) {
    if (record) { undo.push(Car.encodeCar(me.cells)); if (undo.length > 60) undo.shift(); redo.length = 0; }
    me.cells = cells;
    if (scene.mode === 'garage') scene.setGarageCar(cells);
    renderStats();
    persist();
    $(root, '[data-br-undo]').disabled = !undo.length;
    $(root, '[data-br-redo]').disabled = !redo.length;
  }

  // garage tabs
  const tabs = $$(root, '[data-br-tab]');
  function setTab(name) {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.brTab === name)));
    $$(root, '[data-br-pane]').forEach(p => { p.hidden = p.dataset.brPane !== name; });
    root.dataset.brTab = name;
    scene.setBuilding(name === 'build' && root.dataset.brView === 'garage');
  }
  tabs.forEach(t => t.addEventListener('click', () => setTab(t.dataset.brTab)));

  // editing on the 3D view: click = apply tool, drag = orbit
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', (e) => {
    if (scene.mode !== 'garage' || !scene.building || e.pointerType === 'touch') return;
    const p = scene.pick(e.clientX, e.clientY);
    const cell = tool === 'add' ? p?.add : p?.hit;
    scene.showGhost(cell, tool === 'remove' ? '#ff4d4d' : Car.PALETTE[color].hex);
  });
  canvas.addEventListener('pointerleave', () => scene.showGhost(null));
  canvas.addEventListener('pointerup', (e) => {
    if (!down || scene.mode !== 'garage' || !scene.building) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const p = scene.pick(e.clientX, e.clientY);
    if (!p) return;
    const cell = tool === 'add' ? p.add : p.hit;
    if (!cell) return;
    const next = me.cells.slice();
    const v = tool === 'remove' ? 0 : color;
    Car.set(next, cell.x, cell.y, cell.z, v);
    if (mirror) Car.set(next, Car.W - 1 - cell.x, cell.y, cell.z, v);
    setCells(next, true);
    scene.showGhost(null);
  });

  // ------------------------------------------------------------------ scanner
  const shotBoxes = $$(root, '[data-br-shot]');
  async function imageDataFrom(source) {
    const max = 220;
    const w0 = source.videoWidth || source.width, h0 = source.videoHeight || source.height;
    const k = Math.min(1, max / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.max(8, Math.round(w0 * k)); c.height = Math.max(8, Math.round(h0 * k));
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(source, 0, 0, c.width, c.height);
    return g.getImageData(0, 0, c.width, c.height);
  }
  function previewShot(view, img) {
    const box = shotBoxes.find(b => b.dataset.brShot === view);
    const c = $(box, 'canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.putImageData(img, 0, 0);
    const seg = segment(img);
    if (seg) {
      // dim what the scanner thinks is background, outline what it kept
      const over = g.getImageData(0, 0, img.width, img.height);
      for (let p = 0; p < seg.mask.length; p++) if (!seg.mask[p]) { over.data[p * 4 + 3] = 70; }
      g.clearRect(0, 0, c.width, c.height);
      g.putImageData(over, 0, 0);
      g.strokeStyle = '#ffd400'; g.lineWidth = 2;
      g.strokeRect(seg.bbox.x0, seg.bbox.y0, seg.bbox.x1 - seg.bbox.x0, seg.bbox.y1 - seg.bbox.y0);
    }
    box.classList.add('has-shot');
    box.classList.toggle('bad-shot', !seg);
    $(box, '.br-shot-note').textContent = seg ? 'Got it' : 'Car not found: try a plainer background';
    $(root, '[data-br-carve]').disabled = !shots.side;
  }
  for (const box of shotBoxes) {
    const input = $(box, 'input[type=file]');
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const bmp = await createImageBitmap(file);
        const img = await imageDataFrom(bmp);
        shots[box.dataset.brShot] = img;
        previewShot(box.dataset.brShot, img);
      } catch { toast('That file could not be read as a photo.'); }
      input.value = '';
    });
  }

  // webcam: snap into whichever slot is selected
  const cam = $(root, '[data-br-cam]');
  const video = $(cam, 'video');
  let stream = null, camView = 'side';
  async function openCam(view) {
    camView = view;
    $(cam, '[data-br-cam-label]').textContent = { side: 'Side: nose pointing right', front: 'Front: look at the nose', top: 'Top: nose pointing up' }[view];
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
      video.srcObject = stream;
      cam.hidden = false;
      await video.play();
    } catch { toast('No camera available. Use "Choose photo" instead.'); closeCam(); }
  }
  function closeCam() {
    stream?.getTracks().forEach(t => t.stop());
    stream = null; cam.hidden = true;
  }
  $$(root, '[data-br-webcam]').forEach(b => b.addEventListener('click', () => openCam(b.closest('[data-br-shot]').dataset.brShot)));
  $(cam, '[data-br-snap]').addEventListener('click', async () => {
    const img = await imageDataFrom(video);
    shots[camView] = img;
    previewShot(camView, img);
    const order = ['side', 'front', 'top'];
    const next = order[order.indexOf(camView) + 1];
    if (next && !shots[next]) openCam(next); else closeCam();
  });
  $(cam, '[data-br-cam-close]').addEventListener('click', closeCam);
  if (!navigator.mediaDevices?.getUserMedia) $$(root, '[data-br-webcam]').forEach(b => { b.hidden = true; });

  $(root, '[data-br-carve]').addEventListener('click', () => {
    const status = $(root, '[data-br-scan-status]');
    status.textContent = 'Carving bricks from your photos…';
    requestAnimationFrame(() => {
      try {
        const { cells, report } = carveCar(shots);
        setCells(cells, true);
        status.textContent = `Built ${report.bricks} bricks from the ${report.views.join(', ')} photo${report.views.length > 1 ? 's' : ''}. Fix anything it got wrong in Build.`;
        toast('Scanned! Tidy it up in Build, then race.');
      } catch (e) {
        status.textContent = e.message;
      }
    });
  });

  // ------------------------------------------------------------------ play menu
  const trackSelects = $$(root, '[data-br-track]');
  trackSelects.forEach(sel => { sel.innerHTML = TRACKS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join(''); });

  $(root, '[data-br-go-play]').addEventListener('click', () => { show('play'); startNet(); });
  $$(root, '[data-br-back-garage]').forEach(b => b.addEventListener('click', () => { leaveSession(); showGarage(); }));

  const nearbyEl = $(root, '[data-br-nearby]');
  const netStatus = $(root, '[data-br-net-status]');
  let lobbies = [];
  function renderNearby() {
    if (!net?.bus) { nearbyEl.innerHTML = ''; return; }
    if (!lobbies.length) {
      nearbyEl.innerHTML = `<li class="br-muted">${net.neighborhoods.length ? 'No races on this WiFi yet. Host one, or wait a moment.' : 'Couldn\'t detect your WiFi. Join with a code instead.'}</li>`;
      return;
    }
    nearbyEl.innerHTML = lobbies.map(l => `<li><button type="button" data-join="${l.code}" ${l.players >= l.max ? 'disabled' : ''}>
      <strong>${esc(l.host)}'s race</strong><span>${esc(l.track)} · ${l.players}/${l.max} players${l.phase === 'race' ? ' · racing now' : ''}</span><b>${l.code}</b></button></li>`).join('');
  }
  nearbyEl.addEventListener('click', (e) => { const b = e.target.closest('[data-join]'); if (b) join(b.dataset.join); });

  async function startNet() {
    if (net) { net.watcher?.refresh(); return net; }
    net = { bus: null, neighborhoods: [], watcher: null, ready: null };
    netStatus.textContent = 'Connecting to the game relays…';
    renderNearby();
    net.ready = (async () => {
      const relay = relayFromUrl(location.href);
      const [nbs, bus] = await Promise.all([
        // a local relay *is* the WiFi, so everyone on it shares one neighbourhood
        relay ? Promise.resolve(['local']) : findNeighborhood().catch(() => []),
        new Bus(relay ? { brokers: [relay] } : {}).start(),
      ]);
      net.bus = bus; net.neighborhoods = nbs;
      const st = () => { const s = bus.status(); netStatus.textContent = `Online · ${s.connected}/${s.total} relays${nbs.length ? ' · looking on this WiFi' : ''}`; };
      bus.on('status', st); st();
      net.watcher = watchLobbies(bus, nbs, (l) => { lobbies = l; renderNearby(); });
      renderNearby();
      return net;
    })();
    try { await net.ready; } catch (e) {
      netStatus.textContent = e.message;
      net = null;
      nearbyEl.innerHTML = '';
    }
    return net;
  }

  $(root, '[data-br-solo]').addEventListener('click', () => {
    role = 'solo';
    lobby = { players: [playerEntry()], track: $(root, '[data-br-solo-track]').value, laps: +$(root, '[data-br-solo-laps]').value, bots: +$(root, '[data-br-solo-bots]').value, phase: 'lobby' };
    startRace(makeGo());
  });

  $(root, '[data-br-host]').addEventListener('click', async () => {
    const n = await startNet();
    if (!n) { toast('Hosting needs the game relays. Try a phone hotspot, or race solo.'); return; }
    role = 'host';
    lobby = { players: [playerEntry()], track: TRACKS[0].id, laps: 3, bots: 0, phase: 'lobby' };
    session = new HostSession(n.bus, {
      neighborhoods: n.neighborhoods,
      info: () => ({ host: me.name, players: lobby.players.length, max: MAX_PLAYERS, track: trackDef(lobby.track).name, phase: lobby.phase === 'lobby' ? 'lobby' : 'race' }),
    }).start();
    session.on('message', onHostMessage);
    session.on('leave', (id) => {
      const p = lobby.players.find(x => x.id === id);
      lobby.players = lobby.players.filter(x => x.id !== id);
      if (p) toast(`${p.name} left`);
      if (race) { race.cars.get(id) && scene.removeCar(id); race.cars.delete(id); }
      pushLobby();
    });
    session.on('links', renderLobby);
    showLobby();
    pushLobby();
  });

  const codeInput = $(root, '[data-br-code]');
  $(root, '[data-br-join-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = cleanCode(codeInput.value);
    if (!code) { toast('Codes are 4 letters, like BRKZ.'); return; }
    join(code);
  });

  async function join(code) {
    const n = await startNet();
    if (!n) { toast('Joining needs the game relays. Try a phone hotspot.'); return; }
    leaveSession();
    role = 'guest';
    lobby = { players: [], track: TRACKS[0].id, laps: 3, bots: 0, phase: 'lobby', code };
    const g = session = new GuestSession(n.bus, { code, id: me.id }).start();
    let accepted = false, tries = 0;
    const knock = () => g.send({ t: 'join', name: me.name, car: Car.encodeCar(me.cells) });
    knock();
    const knocker = setInterval(() => {
      if (accepted || session !== g) { clearInterval(knocker); return; }
      if (++tries > 8) { clearInterval(knocker); toast(`No answer from race ${code}. Check the code?`); leaveSession(); show('play'); return; }
      knock();
    }, 1500);
    g.on('message', (m) => {
      if (session !== g) return;
      if (m.t === 'lobby') {
        lobby = { ...lobby, ...sanitizeLobby(m) };
        if (!accepted && lobby.players.some(p => p.id === me.id)) { accepted = true; g.connectDirect(); toast('Joined!'); }
        if (accepted && !race) showLobby(); // after a race, guests stay on the results until they press Back
        renderLobby();
      } else if (m.t === 'full') { toast('That race is full.'); leaveSession(); show('play'); }
      else if (m.t === 'go') startRace(m);
      else if (m.t === 'snap') applySnap(m);
      else if (m.t === 'res') showResults(m.order);
    });
    g.on('link', renderLobby);
    g.on('closed', () => { toast('The host closed the race.'); leaveSession(); endRaceView(); show('play'); });
    g.on('kicked', () => { toast('The host removed you from the race.'); leaveSession(); endRaceView(); show('play'); });
    g.on('lost', () => { if (session === g) { toast('Lost contact with the host.'); leaveSession(); endRaceView(); show('play'); } });
    showLobby();
  }

  function leaveSession() {
    session?.close?.();
    session = null;
    if (role !== 'solo') role = null;
  }

  function playerEntry() { return { id: me.id, name: me.name, car: Car.encodeCar(me.cells) }; }
  const trackDef = (id) => TRACKS.find(t => t.id === id) || TRACKS[0];

  function sanitizeLobby(m) {
    const players = (Array.isArray(m.players) ? m.players : []).slice(0, MAX_PLAYERS)
      .filter(p => p && typeof p.id === 'string' && Car.decodeCar(p.car))
      .map(p => ({ id: p.id.slice(0, 20), name: cleanName(p.name), car: p.car, via: p.via === 'p2p' ? 'p2p' : p.via === 'host' ? 'host' : 'relay' }));
    return { players, track: trackDef(m.track).id, laps: Math.max(1, Math.min(9, +m.laps || 3)), bots: Math.max(0, Math.min(7, +m.bots || 0)), phase: ['lobby', 'race'].includes(m.phase) ? m.phase : 'lobby' };
  }

  // ------------------------------------------------------------------ host
  function onHostMessage(m, from) {
    if (m.t === 'join') {
      const car = Car.decodeCar(m.car);
      if (!car) return;
      const existing = lobby.players.find(p => p.id === from);
      if (!existing && lobby.players.length >= MAX_PLAYERS) { session.sendTo(from, { t: 'full' }); return; }
      if (existing) { existing.name = cleanName(m.name); existing.car = m.car; }
      else { lobby.players.push({ id: from, name: cleanName(m.name), car: m.car }); toast(`${cleanName(m.name)} joined`); }
      pushLobby();
    } else if (m.t === 'st' && race) {
      const e = race.cars.get(from);
      if (e && Array.isArray(m.s)) receiveState(e, m.s);
    } else if (m.t === 'fin' && race) {
      const e = race.cars.get(from);
      if (e && e.finishTime == null && typeof m.time === 'number') { e.finishTime = Math.max(1000, m.time); checkRaceOver(); }
    }
  }

  function pushLobby() {
    if (role !== 'host' || !session) return;
    const links = new Map([...session.peers.values()].map(p => [p.id, p.via]));
    const msg = { t: 'lobby', players: lobby.players.map(p => ({ ...p, via: p.id === me.id ? 'host' : links.get(p.id) || 'relay' })), track: lobby.track, laps: lobby.laps, bots: lobby.bots, phase: race && race.phase !== 'done' ? 'race' : 'lobby' };
    session.broadcast(msg);
    session.beacon();
    renderLobby();
  }
  setInterval(() => { if (role === 'host' && session && (!race || race.phase === 'done')) pushLobby(); }, 3000);

  // ------------------------------------------------------------------ lobby screen
  const lobbyList = $(root, '[data-br-players]');
  const hostControls = $(root, '[data-br-host-controls]');
  function showLobby() { show('lobby'); showGarageScene(); renderLobby(); }
  function renderLobby() {
    const code = role === 'host' ? session?.code : lobby.code;
    $(root, '[data-br-room-code]').textContent = code || '····';
    const link = new URL(location.href); link.hash = code ? `join=${code}` : '';
    $(root, '[data-br-room-link]').value = link.href;
    lobbyList.innerHTML = lobby.players.map(p => {
      const cells = Car.decodeCar(p.car);
      const via = role === 'host' ? (p.id === me.id ? 'host' : session?.peers?.get(p.id)?.via || 'relay') : p.via;
      const tag = via === 'host' ? 'host' : via === 'p2p' ? 'direct' : 'via relay';
      const kick = role === 'host' && p.id !== me.id ? `<button type="button" class="br-kick" data-kick="${p.id}" aria-label="Remove ${esc(p.name)}">✕</button>` : '';
      return `<li><span class="br-dot" style="--c:${cells ? Car.mainColor(cells) : '#888'}"></span><strong>${esc(p.name)}${p.id === me.id ? ' (you)' : ''}</strong><small>${tag} · ${cells ? Car.countBricks(cells) : 0} bricks</small>${kick}</li>`;
    }).join('') + (lobby.bots ? `<li class="br-muted"><span class="br-dot" style="--c:#888"></span>+ ${lobby.bots} bot${lobby.bots > 1 ? 's' : ''}</li>` : '');
    hostControls.hidden = role !== 'host';
    $(root, '[data-br-guest-wait]').hidden = role !== 'guest';
    $(root, '[data-br-lobby-track]').value = lobby.track;
    $(root, '[data-br-lobby-laps]').value = String(lobby.laps);
    $(root, '[data-br-lobby-bots]').value = String(lobby.bots);
    const waitText = $(root, '[data-br-guest-wait]');
    if (role === 'guest') {
      const joined = lobby.players.some(p => p.id === me.id);
      waitText.textContent = !joined ? 'Knocking…' : lobby.phase === 'race' ? 'A race is on. You\'re in the next one.' : `Waiting for the host to start · ${trackDef(lobby.track).name}, ${lobby.laps} laps`;
    }
    if (role === 'host') {
      const s = session?.linkSummary?.() || { p2p: 0, relay: 0 };
      $(root, '[data-br-link-note]').textContent = s.p2p + s.relay ? `${s.p2p} direct · ${s.relay} through the relay` : 'Share the code, or friends on this WiFi will see your race in their list.';
    }
  }
  lobbyList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-kick]');
    if (b && role === 'host') { session.kick(b.dataset.kick); lobby.players = lobby.players.filter(p => p.id !== b.dataset.kick); pushLobby(); }
  });
  $(root, '[data-br-lobby-track]').addEventListener('change', (e) => { lobby.track = e.target.value; pushLobby(); });
  $(root, '[data-br-lobby-laps]').addEventListener('change', (e) => { lobby.laps = +e.target.value; pushLobby(); });
  $(root, '[data-br-lobby-bots]').addEventListener('change', (e) => { lobby.bots = Math.min(+e.target.value, MAX_PLAYERS - lobby.players.length); pushLobby(); });
  $(root, '[data-br-copy-link]').addEventListener('click', async () => {
    const v = $(root, '[data-br-room-link]').value;
    try { await navigator.clipboard.writeText(v); toast('Link copied'); } catch { $(root, '[data-br-room-link]').select(); }
  });
  $(root, '[data-br-start]').addEventListener('click', () => {
    if (role !== 'host') return;
    const go = makeGo();
    lobby.phase = 'race';
    session.broadcast(go);
    session.beacon();
    startRace(go);
  });
  $(root, '[data-br-leave]').addEventListener('click', () => { leaveSession(); endRaceView(); show('play'); startNet(); });

  // ------------------------------------------------------------------ race
  function makeGo() {
    const grid = lobby.players.map(p => ({ id: p.id, name: p.name, car: p.car }));
    const nBots = Math.max(0, Math.min(lobby.bots, MAX_PLAYERS - grid.length));
    for (let i = 0; i < nBots; i++) {
      const preset = Car.PRESETS[i % Car.PRESETS.length];
      grid.push({ id: 'bot' + i, name: BOT_NAMES[i], car: Car.encodeCar(preset.build()), bot: true, skill: 0.82 + (i % 4) * 0.05, lane: ((i % 3) - 1) * 2.2 });
    }
    // shuffle the grid so the host doesn't always start on pole
    for (let i = grid.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [grid[i], grid[j]] = [grid[j], grid[i]]; }
    return { t: 'go', track: lobby.track, laps: lobby.laps, grid, in: 4000, id: randomId(6) };
  }

  const hud = $(root, '[data-br-hud]');
  const countEl = $(root, '[data-br-count]');
  const minimap = $(root, '.br-minimap');

  function startRace(go) {
    if (race?.goId === go.id && race.phase !== 'done') return;
    const def = trackDef(go.track);
    scene.loadTrack(def);
    const T = scene.track;
    race = { goId: go.id, def, T, laps: Math.max(1, Math.min(9, +go.laps || 3)), cars: new Map(), phase: 'countdown', startAt: performance.now() + Math.min(6000, +go.in || 4000), sendAcc: 0, simAcc: 0, results: null, firstFinish: null };
    (go.grid || []).slice(0, MAX_PLAYERS).forEach((g, slot) => {
      const cells = Car.decodeCar(g.car);
      if (!cells) return;
      const stats = Car.carStats(cells);
      const local = g.id === me.id;
      const simulated = local || (g.bot && role !== 'guest');
      const entry = { id: g.id, name: cleanName(g.name), cells, color: Car.mainColor(cells), car: newCar(gridSlot(T, slot), stats), local, bot: !!g.bot, simulated, skill: +g.skill || 0.9, lane: +g.lane || 0, finishTime: null, net: null };
      race.cars.set(g.id, entry);
      scene.addCar(g.id, cells, local ? null : entry.name, entry.color);
      scene.poseCar(g.id, entry.car);
    });
    if (!race.cars.has(me.id)) { race.spectator = true; }
    root.classList.add('br-racing');
    overlay(true);
    hud.hidden = false;
    $(root, '[data-br-results]').hidden = true;
    show('race');
    const mine = race.cars.get(me.id);
    if (mine) scene.follow(mine.car, 0, true);
    drawMinimapBase();
    canvas.focus({ preventScroll: true });
  }

  function receiveState(e, s) {
    const [x, z, h, vx, vz, steer, prog, lap, spin] = s.map(Number);
    if (![x, z, h].every(Number.isFinite)) return;
    e.net = { x, z, h, vx: vx || 0, vz: vz || 0, steer: steer || 0, prog: prog || 0, lap: lap || 0, spin: spin || 0, at: performance.now() };
  }

  function applySnap(m) {
    if (!race || !m.c) return;
    for (const [id, s] of Object.entries(m.c)) {
      const e = race.cars.get(id);
      if (!e || e.local) continue;
      if (Array.isArray(s)) receiveState(e, s);
    }
    if (m.f) for (const [id, t] of Object.entries(m.f)) { const e = race.cars.get(id); if (e && e.finishTime == null && typeof t === 'number') e.finishTime = t; }
  }

  function packState(c) { return [c.x, c.z, c.h, c.vx, c.vz, c.steer, c.prog, c.lap, c.wheelSpin].map(v => Math.round(v * 100) / 100); }

  // input
  const keys = new Set();
  const touch = { left: false, right: false, gas: false, brake: false };
  window.addEventListener('keydown', (e) => {
    if (!race || e.target.closest?.('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(k)) e.preventDefault();
    keys.add(k);
    if (k === 'r') respawn();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  $$(root, '[data-br-pad]').forEach(b => {
    const k = b.dataset.brPad;
    const on = (e) => { e.preventDefault(); touch[k] = true; b.classList.add('is-down'); try { b.setPointerCapture(e.pointerId); } catch {} };
    const off = () => { touch[k] = false; b.classList.remove('is-down'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  $(root, '[data-br-respawn]').addEventListener('click', respawn);

  function readInput() {
    let throttle = 0, steer = 0;
    if (keys.has('arrowup') || keys.has('w') || touch.gas) throttle += 1;
    if (keys.has('arrowdown') || keys.has('s') || keys.has(' ') || touch.brake) throttle -= 1;
    if (keys.has('arrowleft') || keys.has('a') || touch.left) steer -= 1;
    if (keys.has('arrowright') || keys.has('d') || touch.right) steer += 1;
    const pad = navigator.getGamepads?.().find(Boolean);
    if (pad) {
      const ax = pad.axes[0] || 0;
      if (Math.abs(ax) > 0.15) steer = ax;
      const gas = Math.max(pad.buttons[7]?.value || 0, pad.buttons[0]?.pressed ? 1 : 0);
      const brk = Math.max(pad.buttons[6]?.value || 0, pad.buttons[1]?.pressed ? 1 : 0);
      if (gas || brk) throttle = gas - brk;
      if (pad.buttons[3]?.pressed) respawn();
    }
    return { throttle: Math.max(-1, Math.min(1, throttle)), steer: Math.max(-1, Math.min(1, steer)) };
  }

  function respawn() {
    const e = race?.cars.get(me.id);
    if (!e || race.phase !== 'race' || e.finishTime != null) return;
    const p = pointAt(race.T, e.car.s);
    Object.assign(e.car, { x: p.x, z: p.z, h: Math.atan2(p.tx, p.tz), vx: 0, vz: 0, steer: 0 });
    scene.follow(e.car, 0, true);
  }

  function now() { return performance.now(); }

  function tickRace(dt) {
    const R = race;
    const t = now();
    if (R.phase === 'countdown') {
      const left = Math.ceil((R.startAt - t) / 1000);
      countEl.textContent = left > 3 ? 'Get ready' : left > 0 ? String(left) : 'GO!';
      countEl.hidden = false;
      if (left !== R.lastBeep && left <= 3) { R.lastBeep = left; beep(left > 0 ? 440 : 880, left > 0 ? 0.12 : 0.3); }
      if (t >= R.startAt) { R.phase = 'race'; setTimeout(() => { if (race === R) countEl.hidden = true; }, 700); }
    }
    const racing = R.phase === 'race';
    const input = racing ? readInput() : { throttle: 0, steer: 0 };
    R.simAcc += Math.min(dt, 0.1);
    while (R.simAcc >= DT) {
      R.simAcc -= DT;
      for (const e of R.cars.values()) {
        if (!e.simulated) continue;
        const done = e.finishTime != null;
        const inp = !racing ? { throttle: 0, steer: 0 }
          : e.bot ? (done ? { throttle: 0.2, steer: botInput(e.car, R.T, e.skill, e.lane).steer } : botInput(e.car, R.T, e.skill, e.lane))
          : done ? { throttle: 0, steer: 0 } : input;
        stepCar(e.car, inp, R.T, DT);
        if (racing && !done && e.car.lap >= R.laps) finish(e);
      }
      // collisions: simulated cars push each other; remote cars push us but we can't move them
      const list = [...R.cars.values()];
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (!a.simulated && !b.simulated) continue;
        const A = a.simulated ? a.car : b.car, B = a.simulated ? b : a;
        collideCars(A, B.simulated ? B.car : remotePose(B), B.simulated);
      }
    }
    // remote cars: extrapolate from the last state, then ease toward it
    for (const e of R.cars.values()) {
      if (e.simulated || !e.net) continue;
      const p = remotePose(e);
      const c = e.car, k = 1 - Math.exp(-dt * 14);
      if (Math.hypot(p.x - c.x, p.z - c.z) > 12) Object.assign(c, { x: p.x, z: p.z, h: p.h });
      c.x += (p.x - c.x) * k; c.z += (p.z - c.z) * k;
      c.h += Math.atan2(Math.sin(p.h - c.h), Math.cos(p.h - c.h)) * k;
      c.vx = p.vx; c.vz = p.vz; c.steer = p.steer; c.prog = e.net.prog; c.lap = e.net.lap; c.wheelSpin = e.net.spin;
    }
    for (const e of R.cars.values()) scene.poseCar(e.id, e.car);
    // network
    R.sendAcc += dt;
    if (R.sendAcc >= 1 / SEND_HZ) {
      R.sendAcc = 0;
      const mine = R.cars.get(me.id);
      if (role === 'guest' && mine && session) session.send({ t: 'st', s: packState(mine.car) }, true);
      if (role === 'host' && session) {
        const c = {}, f = {};
        for (const e of R.cars.values()) { if (e.simulated || e.net) c[e.id] = packState(e.car); if (e.finishTime != null) f[e.id] = e.finishTime; }
        session.broadcast({ t: 'snap', c, f }, true);
      }
    }
    // results timeout (host/solo): everyone gets 25 s after the first finisher
    if (role !== 'guest' && R.firstFinish && R.phase === 'race' && t - R.firstFinish > 25000) closeRace();
    // camera + HUD
    const mine = R.cars.get(me.id) || R.cars.values().next().value;
    if (mine) {
      if (R.phase === 'done' && !mine.local) scene.orbit(t / 1000); else scene.follow(mine.car, dt);
    }
    updateHud(mine, t);
  }

  function remotePose(e) {
    if (!e.net) return e.car;
    const age = Math.min(0.25, (now() - e.net.at) / 1000);
    return { x: e.net.x + e.net.vx * age, z: e.net.z + e.net.vz * age, h: e.net.h, vx: e.net.vx, vz: e.net.vz, steer: e.net.steer };
  }

  function finish(e) {
    e.finishTime = Math.round(now() - race.startAt);
    if (!race.firstFinish) race.firstFinish = now();
    if (e.local) {
      toast(`Finished! ${fmtTime(e.finishTime)}`);
      beep(660, 0.15); setTimeout(() => beep(990, 0.3), 160);
      if (role === 'guest') { session?.send({ t: 'fin', time: e.finishTime }); setTimeout(() => session?.send({ t: 'fin', time: e.finishTime }), 600); }
    }
    checkRaceOver();
  }

  function checkRaceOver() {
    if (!race || role === 'guest') return;
    const humans = [...race.cars.values()].filter(e => !e.bot);
    if (humans.every(e => e.finishTime != null)) setTimeout(closeRace, 2500);
  }

  function order() {
    return [...race.cars.values()].sort((a, b) => {
      if (a.finishTime != null || b.finishTime != null) {
        if (a.finishTime == null) return 1;
        if (b.finishTime == null) return -1;
        return a.finishTime - b.finishTime;
      }
      return (b.car.prog || 0) - (a.car.prog || 0);
    });
  }

  function closeRace() {
    if (!race || race.phase === 'done') return;
    const list = order().map(e => ({ id: e.id, name: e.name, time: e.finishTime }));
    if (role === 'host') session?.broadcast({ t: 'res', order: list });
    showResults(list);
  }

  function showResults(list) {
    if (!race) return;
    race.phase = 'done';
    const rows = (Array.isArray(list) ? list : []).slice(0, MAX_PLAYERS).map((r, i) => `<tr${r.id === me.id ? ' class="is-me"' : ''}><td>${ordinal(i + 1)}</td><td>${esc(cleanName(r.name))}</td><td>${typeof r.time === 'number' ? fmtTime(r.time) : 'DNF'}</td></tr>`).join('');
    const box = $(root, '[data-br-results]');
    $(box, 'tbody').innerHTML = rows;
    $(box, '[data-br-again]').hidden = role === 'guest';
    $(box, '[data-br-results-note]').textContent = role === 'guest' ? 'Waiting for the host to start the next race…' : '';
    box.hidden = false;
    if (role === 'host') { lobby.phase = 'lobby'; pushLobby(); }
  }

  $(root, '[data-br-again]').addEventListener('click', () => {
    if (role === 'solo') { startRace(makeGo()); return; }
    endRaceView(); showLobby(); pushLobby();
  });
  $(root, '[data-br-quit]').addEventListener('click', () => {
    const wasSolo = role === 'solo';
    if (role === 'host') { endRaceView(); showLobby(); pushLobby(); return; }
    if (role === 'guest') { endRaceView(); showLobby(); return; }
    endRaceView(); role = null; if (wasSolo) showGarage();
  });
  $(root, '[data-br-exit-race]').addEventListener('click', () => {
    if (role === 'host') { lobby.phase = 'lobby'; closeRace(); endRaceView(); showLobby(); pushLobby(); return; }
    if (role === 'guest') { leaveSession(); endRaceView(); show('play'); return; }
    endRaceView(); role = null; showGarage();
  });

  // Small screens race edge to edge. The popover top layer escapes the lesson layout (and
  // the site header) without a fullscreen request, which a guest's browser would refuse
  // because the race starts from the host's tap, not theirs.
  const small = matchMedia('(max-width: 860px), (pointer: coarse)');
  function overlay(on) {
    if (on && small.matches && root.showPopover && !root.matches('.creation-app-expanded *, :fullscreen *')) {
      root.setAttribute('popover', 'manual');
      try { root.showPopover(); root.classList.add('br-overlay'); } catch { root.removeAttribute('popover'); }
    } else if (!on && root.classList.contains('br-overlay')) {
      try { root.hidePopover(); } catch {}
      root.removeAttribute('popover');
      root.classList.remove('br-overlay');
    }
    if (on && !root.classList.contains('br-overlay')) root.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function endRaceView() {
    race = null;
    overlay(false);
    root.classList.remove('br-racing');
    hud.hidden = true;
    countEl.hidden = true;
    $(root, '[data-br-results]').hidden = true;
    keys.clear();
  }

  // HUD
  function updateHud(mine, t) {
    if (!mine) return;
    const R = race;
    const pos = order().indexOf(mine) + 1;
    const lapNow = Math.min(R.laps, mine.car.lap + 1);
    $(root, '[data-br-hud-pos]').textContent = `${ordinal(pos)} / ${R.cars.size}`;
    $(root, '[data-br-hud-lap]').textContent = mine.finishTime != null ? 'Finished' : `Lap ${lapNow} / ${R.laps}`;
    const time = mine.finishTime ?? (R.phase === 'race' ? t - R.startAt : 0);
    $(root, '[data-br-hud-time]').textContent = fmtTime(Math.max(0, time));
    $(root, '[data-br-hud-speed]').textContent = Math.round(Math.hypot(mine.car.vx, mine.car.vz) * 3.6 * 1.4);
    drawMinimap(mine);
  }

  let mapBase = null, mapXf = null;
  function drawMinimapBase() {
    const T = race.T;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < T.N; i++) { x0 = Math.min(x0, T.xs[i]); x1 = Math.max(x1, T.xs[i]); z0 = Math.min(z0, T.zs[i]); z1 = Math.max(z1, T.zs[i]); }
    const size = 150, pad = 12, k = (size - pad * 2) / Math.max(x1 - x0, z1 - z0);
    // seen from above with the camera's default orientation: +x left, +z up
    mapXf = (x, z) => [size / 2 - (x - (x0 + x1) / 2) * k, size / 2 - (z - (z0 + z1) / 2) * k];
    mapBase = document.createElement('canvas');
    mapBase.width = mapBase.height = size;
    const g = mapBase.getContext('2d');
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 7;
    g.beginPath();
    for (let i = 0; i <= T.N; i += 2) { const [px, py] = mapXf(T.xs[i % T.N], T.zs[i % T.N]); i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.closePath(); g.stroke();
    g.strokeStyle = 'rgba(20,24,32,.9)'; g.lineWidth = 4; g.stroke();
    const [sx, sy] = mapXf(T.xs[0], T.zs[0]);
    g.fillStyle = '#ffd400'; g.fillRect(sx - 3, sy - 3, 6, 6);
    minimap.width = minimap.height = size;
  }
  function drawMinimap(mine) {
    if (!mapBase) return;
    const g = minimap.getContext('2d');
    g.clearRect(0, 0, minimap.width, minimap.height);
    g.drawImage(mapBase, 0, 0);
    for (const e of race.cars.values()) {
      const [px, py] = mapXf(e.car.x, e.car.z);
      g.beginPath(); g.arc(px, py, e === mine ? 5.5 : 4, 0, Math.PI * 2);
      g.fillStyle = e.color; g.fill();
      g.lineWidth = e === mine ? 2.5 : 1.2; g.strokeStyle = e === mine ? '#fff' : 'rgba(0,0,0,.7)'; g.stroke();
    }
  }

  // sound: just countdown and finish beeps
  let actx = null;
  function beep(freq, dur) {
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g).connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch { /* no audio */ }
  }

  // ------------------------------------------------------------------ garage scene + loop
  function showGarageScene() {
    if (scene.mode === 'garage') return;
    scene.showGarage();
    scene.setGarageCar(me.cells);
    scene.setBuilding(root.dataset.brView === 'garage' && root.dataset.brTab === 'build');
  }
  function showGarage() { show('garage'); showGarageScene(); }

  let last = now();
  function loop() {
    const t = now();
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (race) tickRace(dt);
    scene.render();
    schedule();
  }
  const schedule = () => (window.SimKit?.frame ? window.SimKit.frame(canvas, loop) : requestAnimationFrame(loop));

  // ------------------------------------------------------------------ boot
  setTab('presets');
  showGarage();
  setCells(me.cells, false);
  schedule();
  const joinCode = cleanCode((location.hash.match(/join=([A-Za-z]{4})/) || [])[1]);
  if (joinCode) { show('play'); join(joinCode); }
  window.addEventListener('pagehide', () => { session?.close?.(); net?.bus?.close(); });
  root.brickRally = { get race() { return race; }, get lobby() { return lobby; }, get role() { return role; }, me, scene };
}

export { makeCode };
