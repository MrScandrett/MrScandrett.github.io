/**
 * storm-desk.js — live storm layers and labs for the Weather Watch lesson.
 * Mr. Scandrett's ClassroomOS
 *
 * weather-watch.js owns the map (tiles, radar, alerts, lightning socket) and announces
 * what happens through `ww:*` events and `window.WWMap`. This file listens, runs the
 * analysis in storm-engine.js, fills Sections 8-12 and draws the extra map layers.
 *
 * Two data sources feed the SAME code path:
 *   live      real feeds (Open-Meteo, NWS, SPC, NHC, lightning network)
 *   practice  a simulated storm shaped exactly like the live feeds, so the lab works on clear days
 */
(function () {
  'use strict';
  const S = window.StormEngine;
  const SCRIPT_URL = document.currentScript && document.currentScript.src;   // data paths resolve from here, not from the page
  const $ = id => document.getElementById(id);
  const MIN = 60000;
  if (!S || !$('ww-radar-map')) return;

  // ── helpers ────────────────────────────────────────────────────────────────
  const esc = v => String(v == null ? '' : v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  const fmtMi = mi => (mi < 10 ? mi.toFixed(1) : Math.round(mi).toLocaleString('en-US'));
  const fmtClock = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const cache = new WeakMap();
  function setHtml(el, html) { if (el && cache.get(el) !== html) { cache.set(el, html); el.innerHTML = html; } }
  function setText(el, text) { if (el && el.textContent !== text) el.textContent = text; }
  const arrow = deg => ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  const SS_COLORS = ['#5ebaff', '#00faf4', '#ffffcc', '#ffe775', '#ffc140', '#ff8f20', '#ff6060'];
  const catColor = kt => { const c = S.saffirSimpson(kt); return c.short === 'TD' ? SS_COLORS[0] : c.short === 'TS' ? SS_COLORS[1] : SS_COLORS[1 + c.cat]; };
  const WW_COLORS = { HWR: '#ef4444', HWA: '#ec4899', TWR: '#3b82f6', TWA: '#facc15', SSR: '#a855f7', SSA: '#c084fc' };

  // ── state ──────────────────────────────────────────────────────────────────
  const state = {
    scenario: 'live', speed: 30, sim: null, simReal0: 0, simVirt0: 0,
    loc: null, probe: null, weather: null, meta: null, radarStation: null,
    atm: null, warnings: null, lightning: { status: 'idle', strikes: [], listenStart: 0 },
    spc: { 1: null, 2: null, 3: null }, storms: null, gtwo: null, selected: null,
    replays: null, replay: { slug: '', idx: 0, timer: null },
    ncGuessed: false, hour: 0, voice: store.get('ww:briefing:voice', 'anchor'), prefs: { ...S.DEFAULT_PREFS, ...store.get('ww:briefing:prefs', {}) },
    token: 0
  };
  const point = () => state.probe || state.loc;
  // Practice clock: virtual time = storm start + virtual ms already elapsed + real ms since the last speed change × speed.
  const now = () => (state.scenario === 'practice' && state.sim ? state.sim.startMs + state.simVirt0 + (Date.now() - state.simReal0) * state.speed : Date.now());
  const isPractice = () => state.scenario === 'practice';

  // ── point & loading ────────────────────────────────────────────────────────
  function pointLabel() {
    const p = point();
    if (!p) return '…';
    if (state.probe) {
      const near = state.meta && state.meta.city ? ` · near ${state.meta.city}, ${state.meta.state}` : '';
      return `Pin ${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°${near}`;
    }
    return p.label || `${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°`;
  }
  function renderPointLabels() {
    document.querySelectorAll('[data-sd-point]').forEach(el => setText(el, pointLabel()));
    document.querySelectorAll('[data-sd-badge]').forEach(el => { setText(el, isPractice() ? 'PRACTICE' : 'LIVE'); el.classList.toggle('is-practice', isPractice()); });
    const reset = $('sd-pin-reset');
    if (reset) reset.hidden = !state.probe;
    const pin = $('sd-pin');
    if (pin) setHtml(pin, state.probe
      ? `Analysis point: <strong>${esc(pointLabel())}</strong>. Nowcast, storms, outlook and distances below all use the pin. <button type="button" class="sd-linkbtn" id="sd-pin-reset">Reset to location</button>`
      : 'Analysis point: the selected location. <em>Click the map to analyze anywhere else.</em> <button type="button" class="sd-linkbtn" id="sd-pin-reset" hidden>Reset to location</button>');
  }

  let pointTimer = null;
  function pointChanged() {
    clearTimeout(pointTimer);
    pointTimer = setTimeout(loadPoint, 350);
    state.ncGuessed = false;
    renderPointLabels();
    if (isPractice()) startPractice();
    renderAll();
  }

  async function loadPoint() {
    const p = point();
    if (!p) return;
    const token = ++state.token;
    state.atm = null; state.meta = null; state.radarStation = null; state.warnings = null;
    renderAll();
    const [atm, meta] = await Promise.all([S.fetchAtmosphere(p.lat, p.lon), S.fetchPointMeta(p.lat, p.lon)]);
    if (token !== state.token) return;
    state.atm = atm; state.meta = meta;
    renderPointLabels();
    renderAll();
    if (meta) {
      S.fetchWarnings(meta.state).then(w => { if (token === state.token) { state.warnings = w || []; renderAll(); } });
      if (meta.radarStation) S.fetchRadarStation(meta.radarStation).then(r => { if (token === state.token) { state.radarStation = r; renderBeam(); } });
    } else {
      state.warnings = [];
      renderAll();
    }
  }

  // ── NOWCAST ────────────────────────────────────────────────────────────────
  const CLASS_WORD = { dry: 'dry', light: 'light', moderate: 'moderate', heavy: 'heavy', violent: 'violent' };
  function activeSlots() { return isPractice() && state.sim ? S.practiceNowcast(state.sim, now()) : state.atm ? state.atm.slots : null; }
  function nowcastBucket(n) {
    if (n.state === 'raining') return 'now';
    if (n.startsInMin == null) return 'dry';
    return n.startsInMin <= 30 ? '30' : n.startsInMin <= 60 ? '60' : '120';
  }
  function renderNowcast() {
    const head = $('nc-headline'), bars = $('nc-bars'), meta = $('nc-meta');
    if (!head) return;
    const slots = activeSlots();
    const n = slots ? S.analyzeNowcast(slots, now()) : null;
    if (!n) { setText(head, state.atm === null && !isPractice() ? 'Loading the next two hours…' : 'Nowcast unavailable for this point'); setHtml(bars, ''); setText(meta, ''); return; }
    const masked = $('nc-challenge') && $('nc-challenge').checked && !state.ncGuessed;
    if (masked) { setText(head, 'Make your call below, then press Check.'); setHtml(bars, ''); setText(meta, ''); return; }
    setText(head, n.headline);
    const max = Math.max(5, n.peakMmHr);
    setHtml(bars, n.bars.map(b => {
      const h = b.cls === 'dry' ? 3 : Math.max(8, Math.min(100, Math.sqrt(b.mmHr / max) * 100));
      return `<span class="sd-bar is-${b.cls}" style="height:${h.toFixed(0)}%" title="+${Math.round(b.endMin)} min: ${CLASS_WORD[b.cls]}, ${b.mmHr.toFixed(1)} mm/h (${b.inHr.toFixed(2)} in/h)"></span>`;
    }).join(''));
    if (bars) bars.setAttribute('aria-label', n.headline + '. Rain intensity for the next two hours in 15-minute steps.');
    setText(meta, n.peakMmHr >= 0.1
      ? `Peak ${n.peakInHr.toFixed(2)} in/h (${n.peakMmHr.toFixed(1)} mm/h) in ~${n.peakInMin} min · about ${n.totalIn.toFixed(2)} in over two hours · updated ${fmtClock(now())}`
      : `No measurable rain in the next two hours · updated ${fmtClock(now())}`);
  }
  function checkGuess() {
    const slots = activeSlots(), n = slots ? S.analyzeNowcast(slots, now()) : null, out = $('nc-result');
    if (!n) { setText(out, 'The nowcast is not loaded yet.'); return; }
    const actual = nowcastBucket(n), guess = $('nc-guess').value;
    const words = { dry: 'no rain for 2 hours', now: 'raining now', 30: 'rain within 30 minutes', 60: 'rain in 30 to 60 minutes', 120: 'rain in 60 to 120 minutes' };
    const score = store.get('ww:nowcast:score', { right: 0, total: 0 });
    score.total += 1;
    const right = guess === actual;
    if (right) score.right += 1;
    store.set('ww:nowcast:score', score);
    state.ncGuessed = true;
    setText(out, `${right ? '✓ Nice call.' : '✗ Not this time.'} The nowcast says: ${words[actual]}. ${n.headline}.`);
    out.className = 'sd-result ' + (right ? 'is-right' : 'is-wrong');
    renderNowcast(); renderScore();
  }
  function renderScore() {
    const s = store.get('ww:nowcast:score', null);
    setText($('nc-score'), s && s.total ? `Your nowcast record on this device: ${s.right} of ${s.total} (${Math.round((100 * s.right) / s.total)}%). Remember: the model is a benchmark, not the truth. Beating it is the goal.` : '');
  }

  function renderDbz() {
    const r = $('dbz-range'); if (!r) return;
    const v = Number(r.value), rate = S.dbzToRainRate(v), cls = S.rainClass(rate);
    setText($('dbz-val'), `${v} dBZ`);
    setText($('dbz-out'), `${rate < 0.1 ? '< 0.1' : rate.toFixed(rate < 100 ? 1 : 0)} mm/h (${(rate / 25.4).toFixed(2)} in/h): ${cls === 'dry' ? 'barely rain' : cls + ' rain'}${v >= 55 ? ' · likely hail contamination' : ''}`);
  }

  function renderBeam() {
    const svg = $('beam-svg'); if (!svg) return;
    const elev = Number($('beam-elev').value) || 0.5, p = point();
    const st = state.radarStation;
    const range = st && p ? S.haversineMiles(st.lat, st.lon, p.lat, p.lon) : 100;
    setText($('beam-intro'), st ? `Closest NEXRAD radar: ${st.id}${st.name ? ' (' + st.name + ')' : ''}, ${fmtMi(range)} miles from this point.` : state.meta === null && !state.loc ? 'Finding the nearest radar…' : 'NEXRAD lookup works inside the US. Showing a 100-mile example.');
    const maxR = Math.max(60, Math.ceil((range * 1.3) / 10) * 10), halfBeam = r => r * Math.tan(0.475 * Math.PI / 180) * 5280;
    const hTop = r => S.radarBeamHeightFt(r, elev) + halfBeam(r), hBot = r => Math.max(0, S.radarBeamHeightFt(r, elev) - halfBeam(r));
    const yMax = Math.max(8000, hTop(maxR) * 1.08);
    const X = r => 24 + (r / maxR) * 288, Y = h => 128 - (h / yMax) * 112;
    const steps = Array.from({ length: 41 }, (_, i) => (i / 40) * maxR);
    const line = fn => steps.map(r => `${X(r).toFixed(1)},${Y(fn(r)).toFixed(1)}`).join(' ');
    const beamPoly = `${line(hTop)} ${steps.slice().reverse().map(r => `${X(r).toFixed(1)},${Y(hBot(r)).toFixed(1)}`).join(' ')}`;
    const c = S.radarBeamHeightFt(range, elev), bot = hBot(range), top = hTop(range);
    svg.innerHTML = `
      <rect x="24" y="${Y(0)}" width="288" height="${150 - Y(0)}" class="sd-earth"/>
      <polygon points="${beamPoly}" class="sd-beamband"/>
      <polyline points="${line(r => S.radarBeamHeightFt(r, elev))}" class="sd-beamline"/>
      <line x1="${X(range)}" y1="${Y(0)}" x2="${X(range)}" y2="${Y(top)}" class="sd-you"/>
      <rect x="${X(range) - 3}" y="${Y(bot)}" width="6" height="${Math.max(1, Y(0) - Y(bot))}" class="sd-blind"/>
      <text x="24" y="146" class="sd-svgtext">radar</text>
      <text x="${Math.min(X(range), 270)}" y="146" class="sd-svgtext">you · ${Math.round(range)} mi</text>
      <text x="26" y="${Y(yMax) + 8}" class="sd-svgtext">${Math.round(yMax / 1000)}k ft</text>`;
    setText($('beam-out'), `At ${Math.round(range)} miles the ${elev}° beam is centered about ${Math.round(c / 100) * 100} ft above ground and spans roughly ${Math.round(bot / 100) * 100} to ${Math.round(top / 100) * 100} ft. The lowest ${Math.round(bot / 100) * 100} ft (red) is not sampled, so shallow or low rain can slip underneath.`);
  }

  // ── STORM CELLS ────────────────────────────────────────────────────────────
  function activeCells() {
    const p = point(); if (!p) return [];
    const t = now(), feats = [];
    if (isPractice() && state.sim) feats.push(S.practiceAlert(state.sim, t));
    else (state.warnings || []).forEach(f => feats.push(f));
    return S.cellsFromAlerts(feats, { lat: p.lat, lon: p.lon }, t).filter(c => c.inside || c.distanceMi <= 300);
  }
  const EVENT_ICON = { 'Tornado Warning': '🌪️', 'Severe Thunderstorm Warning': '⛈️', 'Special Marine Warning': '🌊' };
  function cellCard(c) {
    const a = c.approach, m = c.motion;
    const tags = [c.tornado && `Tornado: ${c.tornado.toLowerCase()}`, c.hail && `Hail up to ${c.hail} in`, c.wind && `Gusts to ${c.wind.toLowerCase()}`].filter(Boolean);
    let verdict, tone;
    if (c.inside) { verdict = '<strong>You are inside this warning area right now.</strong> Take shelter indoors, away from windows.'; tone = 'danger'; }
    else if (a && a.trackStatus === 'on-track') { verdict = `On track for you: ${fmtMi(a.alongMi)} mi ÷ ${Math.round(m.speedMph)} mph ≈ <strong>${Math.round(a.etaMin)} min</strong> (about ${fmtClock(now() + a.etaMin * MIN)}).`; tone = 'warn'; }
    else if (a && a.trackStatus === 'passes-near') { verdict = `Passes near: closest about ${fmtMi(a.crossMi)} mi to the side in ~${Math.round(a.etaMin)} min. Small turns can change that.`; tone = 'warn'; }
    else if (a && a.trackStatus === 'passes-away') { verdict = `Moving past to the side: closest about ${fmtMi(a.crossMi)} mi.`; tone = 'ok'; }
    else if (a && a.trackStatus === 'moving-away') { verdict = 'Already past your location and moving away.'; tone = 'ok'; }
    else { verdict = m ? 'Nearly stationary.' : 'No motion given for this warning.'; tone = 'ok'; }
    const where = a ? `${fmtMi(a.distanceMi)} mi ${S.compass16(a.fromUserDeg)} of you` : `${fmtMi(c.distanceMi)} mi away`;
    const motion = m ? `from ${m.fromDeg}° (${S.compass16(m.fromDeg)}) at ${Math.round(m.speedMph)} mph` : '';
    return `<article class="sd-cell is-${tone}"><header><span aria-hidden="true">${EVENT_ICON[c.event] || '⚠️'}</span><strong>${esc(c.event)}</strong><small>${where}${motion ? ' · ' + motion : ''}</small></header>${tags.length ? `<p class="sd-tags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</p>` : ''}<p>${verdict}</p>${c.expiresMs ? `<small>Expires ${fmtClock(c.expiresMs)}</small>` : ''}</article>`;
  }
  let lastCellSig = '';
  function renderCells() {
    const list = $('sc-list'); if (!list) return;
    list.setAttribute('aria-live', isPractice() ? 'off' : 'polite');
    const cells = activeCells();
    const practiceSlot = $('ww-practice-alert');
    const isNonUs = !state.meta && state.warnings && state.warnings.length === 0 && !isPractice();
    if (!cells.length) {
      setHtml(list, state.warnings == null && !isPractice() ? '<p class="sd-empty">Checking for tornado and severe thunderstorm warnings…</p>'
        : isNonUs ? '<p class="sd-empty">NWS storm warnings cover the United States. Use the practice storm to rehearse the math anywhere.</p>'
        : `<p class="sd-empty">No tornado or severe thunderstorm warnings${state.meta ? ' in ' + esc(state.meta.state) : ''} right now. That is the normal state. Switch to <em>Practice storm</em> in Section 7 to rehearse one.</p>`);
    } else setHtml(list, cells.map(cellCard).join(''));
    if (practiceSlot) setHtml(practiceSlot, isPractice() && cells[0] ? `<article class="ww-alert-item severe sd-practice-alert"><strong>PRACTICE · ${esc(cells[0].event)}</strong><span>${esc(cells[0].approach && cells[0].approach.etaMin != null ? `ETA ≈ ${Math.round(cells[0].approach.etaMin)} min · ` : '')}simulated, not a real warning</span></article>` : '');
    lastCellSig = cells.map(c => c.id).join();
    renderSteer(cells[0]);
  }
  function currentIngredientRow() {
    if (!state.atm || !state.atm.ingredients.length) return null;
    const t = now(), rows = state.atm.ingredients;
    let best = rows[0];
    rows.forEach(r => { if (Math.abs(r.ms - t) < Math.abs(best.ms - t)) best = r; });
    return best;
  }
  function renderSteer(cell) {
    const el = $('sc-steer'); if (!el) return;
    const row = currentIngredientRow();
    if (!row || !row.steering) { setText(el, state.atm === null ? 'Loading upper-air winds…' : 'Upper-air winds unavailable for this point'); return; }
    const st = row.steering;
    let text = `700 hPa wind: from ${Math.round(st.fromDeg)}° (${S.compass16(st.fromDeg)}) at ${Math.round(st.mph)} mph, so storms drift toward ${Math.round(st.headingDeg)}° (${S.compass16(st.headingDeg)}).`;
    if (cell && cell.motion) {
      const diff = Math.abs(((cell.motion.fromDeg - st.fromDeg + 540) % 360) - 180);
      text += ` The warned storm moves from ${cell.motion.fromDeg}° at ${Math.round(cell.motion.speedMph)} mph: ${Math.round(diff)}° from the steering wind, ${Math.round(cell.motion.speedMph - st.mph)} mph ${cell.motion.speedMph >= st.mph ? 'faster' : 'slower'}.`;
    }
    setText(el, text);
  }
  function renderEta() {
    const d = Number($('eta-dist').value), v = Number($('eta-speed').value);
    setText($('eta-out'), d > 0 && v > 0 ? `${d} mi ÷ ${v} mph = ${(d / v).toFixed(2)} h ≈ ${Math.round((d / v) * 60)} min` : 'Enter a distance and a speed.');
    const sec = Number($('f2b-sec').value);
    const temp = state.weather && Number.isFinite(state.weather.temperature) ? state.weather.temperature : 68;
    const r = S.flashToBang(sec, temp);
    setText($('f2b-out'), `${sec} s × ${Math.round(S.soundSpeedFps(temp))} ft/s (sound at ${Math.round(temp)}°F) ≈ ${r.miles.toFixed(1)} mi. ${r.shelter ? 'Inside strike range: go indoors.' : 'Still lightning range if you can hear thunder. Go indoors.'}`);
  }

  // ── LIGHTNING ──────────────────────────────────────────────────────────────
  function lightningInput() {
    if (isPractice() && state.sim) return { strikes: S.practiceStrikes(state.sim, now()), status: 'live', listenStart: state.sim.startMs - 60 * MIN };
    return state.lightning;
  }
  function renderLightning() {
    const p = point(); if (!p) return;
    const inp = lightningInput();
    const homeFar = !isPractice() && state.loc && state.probe && S.haversineMiles(state.loc.lat, state.loc.lon, state.probe.lat, state.probe.lon) > 150;
    const r = S.analyzeLightning(inp.strikes || [], { lat: p.lat, lon: p.lon }, now(), inp.listenStart);
    const setBoth = (id, v) => setText($(id), v);
    const down = inp.status === 'unavailable', connecting = inp.status === 'connecting' || inp.status === 'idle';
    let dist, detail;
    if (down) { dist = 'Live feed unavailable'; detail = 'The community lightning network could not be reached. Use thunder: if you hear it, go in.'; }
    else if (homeFar) { dist = 'Outside feed area'; detail = 'The strike feed only covers about 4° around the selected location.'; }
    else if (connecting) { dist = 'Connecting…'; detail = 'Opening the live strike feed'; }
    else if (!r.closest) { dist = 'No nearby strikes'; detail = isPractice() ? 'Simulated feed · past 10 minutes' : 'Live feed connected · past 10 minutes'; }
    else { dist = `${fmtMi(r.closest.mi)} mi`; detail = `Closest strike in 10 min · ${Math.max(0, Math.round((now() - r.closest.time) / 1000))} s ago`; }
    setBoth('ww-lightning-distance', dist); setBoth('ww-lightning-detail', detail); setBoth('lt-closest', r.closest ? `${fmtMi(r.closest.mi)} mi ${S.compass16(S.bearingDeg(p.lat, p.lon, r.closest.lat, r.closest.lon))}` : '—');
    setBoth('lt-counts', `${r.r10} / ${r.r25} / ${r.r50}`);
    const tr = r.trend;
    setBoth('lt-trend', tr.direction === 'unknown' ? 'Need more strikes' : tr.confidence === 'low' ? 'Too early to tell' : tr.direction === 'steady' ? 'Holding steady' : `${tr.direction === 'approaching' ? '▼ Approaching' : '▲ Receding'} ~${Math.round(Math.abs(tr.approachMph))} mph`);
    setBoth('lt-eta', tr.etaTo6Min != null ? `~${Math.round(tr.etaTo6Min)} min` : tr.confidence === 'low' ? 'Need a longer record' : tr.direction === 'approaching' && tr.fitDistMi <= 6 ? 'Already inside 6 mi' : '—');
    const danger = r.closest && r.closest.mi <= 6;
    setBoth('ww-lightning-safety-text', danger ? 'Shelter now: lightning within 6 miles' : r.clock.status === 'hold' ? `Wait ${r.clock.remainingMin} more min` : r.closest ? 'Keep monitoring; thunder means shelter' : 'No strike detected nearby');
    const safety = $('ww-lightning-safety'); if (safety) safety.classList.toggle('is-danger', !!danger || r.clock.status === 'hold');
    const clock = $('lt-clock'), ct = $('lt-clock-text');
    if (clock && ct) {
      clock.className = `sd-clock is-${down ? 'unknown' : r.clock.status}`;
      setText(ct, down ? 'Feed unavailable. Use thunder: if you can hear it, wait 30 minutes after the last rumble.'
        : r.clock.status === 'hold' ? `HOLD: ${r.clock.remainingMin} min left. A strike landed within 10 mi ${Math.round(r.clock.minSince)} min ago.`
        : r.clock.status === 'unknown' ? `Listening… ${Math.floor(r.clock.listenedMin)} of 30 min. Not enough history to call it safe.`
        : 'Clear for 30 minutes: no strikes within 10 mi. Thunder still overrides.');
    }
    setBoth('lt-status', `${isPractice() ? 'Simulated feed' : down ? 'Feed offline' : 'Feed: Blitzortung community network via LightningMaps'} · ${r.strikes.length} strikes in the last 30 min within range of the feed.`);
  }

  // ── OUTLOOK ────────────────────────────────────────────────────────────────
  const SPC_COLOR = { TSTM: '#c1e9c1', MRGL: '#7dc580', SLGT: '#f6f67b', ENH: '#e6c27e', MDT: '#e67e7e', HIGH: '#ff7eff', NONE: '#475569' };
  const TIER_COLOR = ['#334155', '#4b9a6a', '#a3c653', '#f6e05e', '#f59e0b', '#ef4444'];
  const inConus = p => p && p.lat > 23 && p.lat < 50.5 && p.lon > -126 && p.lon < -65;
  function renderOutlook() {
    const days = $('ol-days'); if (!days) return;
    const p = point();
    if (!p) return;
    const labels = ['Today', 'Tomorrow', 'Day 3'];
    if (!inConus(p)) setHtml(days, '<p class="sd-empty">The Storm Prediction Center covers the contiguous United States. The model ingredients on the right work anywhere.</p>');
    else if (!state.spc[1] && !state.spc[2] && !state.spc[3]) setHtml(days, '<p class="sd-empty">Loading the SPC convective outlooks…</p>');
    else setHtml(days, [1, 2, 3].map(d => {
      const o = state.spc[d] ? S.outlookAtPoint(state.spc[d], p.lat, p.lon) : null;
      if (!o) return `<div class="sd-day"><b>${labels[d - 1]}</b><span>unavailable</span></div>`;
      return `<div class="sd-day" style="--c:${SPC_COLOR[o.label]}"><b>${labels[d - 1]}</b><span class="sd-chip">${o.label}</span><span>${esc(o.name)}</span></div>`;
    }).join(''));
    renderIngredients();
    const d1 = state.spc[1] && inConus(p) ? S.outlookAtPoint(state.spc[1], p.lat, p.lon) : null;
    const rows = state.atm ? state.atm.ingredients : [];
    const t = now(), next24 = rows.filter(r => r.ms >= t - 30 * MIN && r.ms <= t + 24 * 3600e3);
    if (d1 && next24.length) {
      const top = next24.reduce((a, b) => (b.tier > a.tier ? b : a));
      setText($('ol-compare'), `Compare: over the next 24 hours this teaching model peaks at "${top.label}" (around ${fmtClock(top.ms)}). The SPC's official Day 1 outlook for this point is ${d1.label} (${d1.name.toLowerCase()}). Which is more cautious, and what might a human forecaster know that a grid model does not?`);
    } else setText($('ol-compare'), '');
  }
  function ingredientWindow() {
    const rows = state.atm ? state.atm.ingredients : [], t = now();
    const start = Math.max(0, rows.findIndex(r => r.ms > t - 30 * MIN));
    return rows.slice(start, start + 48);
  }
  function renderIngredients() {
    const meters = $('ol-meters'), strip = $('ol-strip'), slider = $('ol-hour'); if (!meters) return;
    const rows = ingredientWindow();
    if (!rows.length) { setHtml(meters, `<p class="sd-empty">${state.atm === null ? 'Loading model fields…' : 'Model ingredients unavailable for this point.'}</p>`); setHtml(strip, ''); setText($('ol-notes'), ''); return; }
    slider.max = String(rows.length - 1);
    const i = Math.min(state.hour, rows.length - 1), r = rows[i];
    slider.value = String(i);
    setText($('ol-hour-label'), i === 0 ? 'now' : new Date(r.ms).toLocaleString([], { weekday: 'short', hour: 'numeric' }));
    const m = (label, value, lvl, hint) => `<div class="sd-meter"><span>${label}<small>${hint}</small></span><b>${value}</b><i aria-hidden="true">${[1, 2, 3].map(k => `<u class="${lvl >= k ? 'on' : ''}"></u>`).join('')}</i></div>`;
    setHtml(meters, `<div class="sd-tier" style="--c:${TIER_COLOR[r.tier]}"><small>Teaching-model score</small><strong>${r.label}</strong></div>` +
      m('💧 Moisture', `${Math.round(r.raw.dewF)}°F dew pt`, r.moist, 'fuel') +
      m('🎈 Instability', `${Math.round(r.raw.capeJkg)} J/kg CAPE`, r.inst, 'buoyancy') +
      m('🌀 Shear', `${Math.round(r.raw.shearKt)} kt`, r.shear, 'organization') +
      `<div class="sd-meter"><span>🔒 Cap<small>lid</small></span><b>${Math.round(r.raw.cinJkg)} J/kg CIN</b><i class="sd-cap ${r.capped ? 'is-capped' : ''}">${r.capped ? 'capped' : 'open'}</i></div>`);
    setHtml(strip, rows.map((x, k) => `<button type="button" class="sd-cellbtn${k === i ? ' is-sel' : ''}" style="background:${TIER_COLOR[x.tier]}" data-h="${k}" aria-label="${new Date(x.ms).toLocaleString([], { weekday: 'short', hour: 'numeric' })}: ${x.label}" tabindex="-1"></button>`).join(''));
    setText($('ol-notes'), r.notes.length ? r.notes.join(' ') : 'Nothing notable: ingredients are modest here.');
  }

  // ── TROPICS ────────────────────────────────────────────────────────────────
  const BASIN = { AT: 'Atlantic', EP: 'East Pacific', CP: 'Central Pacific' };
  const mphOf = kt => Math.round(kt * S.KT_TO_MPH);
  function stormCard(s) {
    const p = point(), c = S.saffirSimpson(s.maxwindKt), d = p ? S.haversineMiles(s.lat, s.lon, p.lat, p.lon) : null;
    return `<button type="button" class="sd-storm${state.selected === s.slot ? ' is-sel' : ''}" data-slot="${esc(s.slot)}" aria-pressed="${state.selected === s.slot}"><span class="sd-sschip" style="background:${catColor(s.maxwindKt)}">${c.short}</span><span><strong>${esc(s.fullName || s.name)}</strong><small>${BASIN[s.basin && s.basin.toUpperCase()] || esc(s.basin)} · ${s.maxwindKt} kt (${mphOf(s.maxwindKt)} mph) · ${s.mslp} mb${s.speedKt != null ? ` · moving ${S.compass16(s.headingDeg)} at ${mphOf(s.speedKt)} mph` : ''}${d != null ? ` · ${fmtMi(d)} mi ${S.compass16(S.bearingDeg(p.lat, p.lon, s.lat, s.lon))} of you` : ''}</small></span></button>`;
  }
  function renderTropics() {
    const list = $('tr-list'), detail = $('tr-detail'), gtwo = $('tr-gtwo'); if (!list) return;
    const storms = state.storms;
    if (storms === null) setHtml(list, '<p class="sd-empty">The National Hurricane Center feed could not be reached from this browser. The replays below still work.</p>');
    else if (!storms) setHtml(list, '<p class="sd-empty">Checking the Atlantic, East Pacific and Central Pacific…</p>');
    else if (!storms.length) setHtml(list, '<p class="sd-empty">No active tropical cyclones in the Atlantic, East Pacific or Central Pacific right now.</p>');
    else setHtml(list, storms.slice().sort((a, b) => b.maxwindKt - a.maxwindKt).map(stormCard).join(''));
    if (gtwo) {
      const g = state.gtwo;
      setHtml(gtwo, g && g.length ? 'NHC 7-day outlook areas: ' + g.map(a => `${esc(a.basin)}: ${esc(a.prob2day)} in 48 h, ${esc(a.prob7day)} in 7 days (${esc((a.risk7day || '').toLowerCase())} chance of forming)`).join('; ') + '.' : g ? 'NHC sees no areas likely to develop in the next 7 days.' : '');
    }
    const s = storms && storms.find(x => x.slot === state.selected);
    if (!s) { setHtml(detail, '<p class="sd-empty">Select a storm to compare its forecast with your location.</p>'); return; }
    const p = point(), t = S.analyzeStormThreat(s, { lat: p.lat, lon: p.lon });
    const rows = s.track.map(x => `<tr><td>${x.tau === 0 ? 'now' : '+' + x.tau + ' h'}</td><td><span class="sd-sschip" style="background:${catColor(x.kt)}">${x.cat}</span></td><td>${x.kt} kt</td><td>${esc(x.label || '')}</td></tr>`).join('');
    setHtml(detail, `<p class="sd-headline sd-headline--sm">${esc(t.headline)}</p>
      <ul class="sd-facts-list">
        <li><b>${t.cat.label}</b>: ${s.maxwindKt} kt = ${mphOf(s.maxwindKt)} mph sustained, gusts ${s.gustKt} kt, pressure ${s.mslp} mb.</li>
        ${t.closestForecastMi != null ? `<li>Closest approach of the forecast <em>center</em>: about ${fmtMi(t.closestForecastMi)} mi${t.closestAtHr != null ? ` around +${Math.round(t.closestAtHr)} h` : ''}.</li>` : ''}
        ${t.nearestWatchWarning ? `<li>Nearest ${esc(t.nearestWatchWarning.label.toLowerCase())}: ${fmtMi(t.nearestWatchWarning.mi)} mi away.</li>` : '<li>No tropical watches or warnings are posted.</li>'}
        <li>${t.inCone ? 'You are inside the cone, but the cone only bounds the center. Impacts can reach hundreds of miles beyond it.' : 'You are outside the cone. That does not rule out rain, wind or surge from a large storm.'}</li>
      </ul>
      <table class="sd-table"><caption>NHC forecast track (advisory ${esc(s.advisory)}, ${esc(s.advisoryDate)})</caption><thead><tr><th>When</th><th>Cat</th><th>Wind</th><th>Valid</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  function replayData() { return state.replays && state.replays.storms.find(s => s.slug === state.replay.slug); }
  function renderReplay() {
    const out = $('tr-replay-out'), blurb = $('tr-replay-blurb'), slider = $('tr-replay-slider'); if (!out) return;
    const st = replayData();
    if (!st) { setText(out, ''); setText(blurb, ''); slider.disabled = true; return; }
    const p = point(), f = S.replayFrame(st, state.replay.idx, { lat: p.lat, lon: p.lon });
    slider.disabled = false; slider.max = String(st.points.length - 1); slider.value = String(state.replay.idx);
    const when = new Date(f.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
    let wind = '';
    if (f.r34Mi != null) wind = f.insideTsWinds ? ` Tropical-storm-force winds reach ${Math.round(f.r34Mi)} mi from the center: <strong>you are inside them</strong>.` : ` Tropical-storm-force winds reach ${Math.round(f.r34Mi)} mi from the center; you are ${Math.round(f.distanceMi - f.r34Mi)} mi outside that.`;
    else wind = ' (Wind-radius data is only recorded for newer storms.)';
    setHtml(out, `${esc(st.name)} ${st.year} · ${when}${f.landfall ? ' · <strong>landfall</strong>' : ''}: ${f.cat.label}, ${f.kt} kt (${mphOf(f.kt)} mph)${f.mb ? `, ${f.mb} mb` : ''}. Center is ${fmtMi(f.distanceMi)} mi ${S.compass16(f.bearingFromUser)} of the analysis point.${wind}`);
    setText(blurb, st.blurb);
  }
  function fitTropics() {
    const p = point(), pts = [{ lat: p.lat, lon: p.lon }], st = replayData();
    if (st) st.points.forEach(x => pts.push(x));
    else { const s = state.storms && state.storms.find(x => x.slot === state.selected); if (s) { pts.push({ lat: s.lat, lon: s.lon }); s.track.forEach(x => pts.push(x)); } }
    if (pts.length > 1) window.WWMap.fitPoints(pts); else window.WWMap.setCenter(p.lat, p.lon, 6);
  }

  // ── BRIEFING ───────────────────────────────────────────────────────────────
  function renderVoices() {
    const box = $('bf-voices'); if (!box) return;
    setHtml(box, Object.entries(S.VOICES).map(([k, v]) => `<button type="button" class="sd-voice${k === state.voice ? ' is-active' : ''}" data-voice="${k}" aria-pressed="${k === state.voice}">${esc(v.label)}</button>`).join(''));
  }
  function renderBriefing() {
    const w = state.weather, text = $('bf-text'); if (!text) return;
    if (!w || !w.daily || !w.daily[1]) { setText(text, 'Loading tomorrow\'s forecast…'); return; }
    const d = w.daily[1];
    const rows = state.atm ? state.atm.ingredients : [], t0 = now();
    const tomorrow = rows.filter(r => r.ms >= t0 + 12 * 3600e3 && r.ms <= t0 + 36 * 3600e3);
    const stormTier = tomorrow.length ? Math.max(...tomorrow.map(r => r.tier)) : 0;
    const dayName = new Date(`${d.dateStr}T12:00:00`).toLocaleDateString([], { weekday: 'long' });
    const out = S.composeDailySummary({ dayName, dateStr: d.dateStr, hi: d.max, lo: d.min, rainChance: d.rainChance, precipIn: d.precipSum, gust: d.gustMax != null ? d.gustMax : 0, uv: d.uvMax, code: d.code, stormTier }, { voice: state.voice, prefs: state.prefs });
    setText(text, out.text);
    const safety = $('bf-safety'); safety.hidden = !out.safety; setText(safety, out.safety || '');
    setText($('bf-facts'), JSON.stringify({ source: 'Open-Meteo daily forecast + model ingredients', voice: out.voice, thresholds: state.prefs, facts: out.facts, modelStormTier: stormTier }, null, 2));
    ['hot', 'cold'].forEach(k => setText($(`bf-${k}-out`), `${state.prefs[k]}°`)); setText($('bf-rain-out'), `${state.prefs.rain}%`);
  }

  // ── MAP LAYERS ─────────────────────────────────────────────────────────────
  const layerOn = { radar: true, alerts: true, cells: true, lightning: true, outlook: false, tropics: true };
  function svgPts(ring, P) { return ring.map(([lon, lat]) => { const q = P(lon, lat); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(' '); }
  const ringsOf = g => (!g ? [] : g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : []);
  function mapScale(P) {
    const el = $('ww-map-scale'), W = window.WWMap; if (!el) return;
    const rect = W.rect, c = W.unproject(rect.width / 2, rect.height / 2), e = S.destination(c.lat, c.lon, 90, 10), a = P(c.lon, c.lat), b = P(e.lon, e.lat);
    const pxPerMi = Math.abs(b.x - a.x) / 10; if (!pxPerMi) return;
    const mi = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(v => v * pxPerMi >= 60) || 2000;
    el.style.width = `${Math.round(mi * pxPerMi)}px`; el.textContent = `${mi} mi`;
  }
  function drawLayers() {
    const W = window.WWMap, host = W && W.layersHost; if (!host || !point()) return;
    const rect = W.rect; if (!rect.width) return;
    const P = (lon, lat) => W.project(lon, lat), p = point(), parts = [];
    host.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    mapScale(P);

    if (layerOn.outlook && state.spc[1]) {
      const feats = state.spc[1].features.slice().sort((a, b) => ((S.SPC_CATS[a.properties.DN] || {}).rank || 0) - ((S.SPC_CATS[b.properties.DN] || {}).rank || 0));
      parts.push('<g data-layer="outlook">' + feats.map(f => {
        const pr = f.properties, fill = pr.fill || SPC_COLOR[(S.SPC_CATS[pr.DN] || {}).label] || '#888';
        return ringsOf(f.geometry).map(r => `<polygon class="sd-outlook" points="${svgPts(r, P)}" style="fill:${fill};stroke:${pr.stroke || fill}"/>`).join('');
      }).join('') + '</g>');
    }

    if (layerOn.lightning) {
      const q = P(p.lon, p.lat), e = P(S.destination(p.lat, p.lon, 90, 10).lon, S.destination(p.lat, p.lon, 90, 10).lat), pxMi = Math.abs(e.x - q.x) / 10;
      const rings = [[6, 'ring6'], [10, 'ring10'], [25, 'ring25'], [50, 'ring50']].filter(([mi]) => mi * pxMi > 7 && mi * pxMi < 3000);
      parts.push('<g data-layer="rings">' + rings.map(([mi, c]) => `<circle class="sd-ring ${c}" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${(mi * pxMi).toFixed(1)}"/>${mi * pxMi > 24 ? `<text class="sd-ringlabel" x="${q.x.toFixed(1)}" y="${(q.y - mi * pxMi - 3).toFixed(1)}" text-anchor="middle">${mi} mi</text>` : ''}`).join('') + '</g>');
    }

    if (layerOn.tropics) parts.push(tropicsLayer(P));

    if (layerOn.cells) {
      parts.push('<g data-layer="cells">' + activeCells().map(c => {
        const polys = ringsOf(c.geometry).map(r => `<polygon class="sd-warn ${c.event === 'Tornado Warning' ? 'is-tor' : ''}" points="${svgPts(r, P)}"/>`).join('');
        if (!c.motion) return polys;
        const a = c.approach, pos = a ? a.position : c.position, s0 = P(pos.lon, pos.lat);
        const tip = S.destination(pos.lat, pos.lon, c.motion.headingDeg, c.motion.speedMph * 0.5), s1 = P(tip.lon, tip.lat);
        const mid = S.destination(pos.lat, pos.lon, c.motion.headingDeg, c.motion.speedMph * 0.25), sm = P(mid.lon, mid.lat);
        const ang = Math.atan2(s1.y - s0.y, s1.x - s0.x), hx = 9;
        const head = `${s1.x},${s1.y} ${s1.x - hx * Math.cos(ang - 0.45)},${s1.y - hx * Math.sin(ang - 0.45)} ${s1.x - hx * Math.cos(ang + 0.45)},${s1.y - hx * Math.sin(ang + 0.45)}`;
        const label = a && a.etaMin != null && a.trackStatus !== 'passes-away' ? `ETA ${Math.round(a.etaMin)} min` : `${Math.round(c.motion.speedMph)} mph`;
        return `${polys}<line class="sd-motion" x1="${s0.x.toFixed(1)}" y1="${s0.y.toFixed(1)}" x2="${s1.x.toFixed(1)}" y2="${s1.y.toFixed(1)}"/><polygon class="sd-motionhead" points="${head}"/><circle class="sd-tick" cx="${sm.x.toFixed(1)}" cy="${sm.y.toFixed(1)}" r="3"/><circle class="sd-celldot" cx="${s0.x.toFixed(1)}" cy="${s0.y.toFixed(1)}" r="5"/><text class="sd-celllabel" x="${(s1.x + 6).toFixed(1)}" y="${(s1.y - 6).toFixed(1)}">${label}</text>`;
      }).join('') + '</g>');
    }

    if (layerOn.lightning) {
      const inp = lightningInput(), r = S.analyzeLightning(inp.strikes || [], { lat: p.lat, lon: p.lon }, now(), inp.listenStart);
      parts.push('<g data-layer="lightning">' + r.strikes.slice(-700).map(s => {
        const q = P(s.lon, s.lat), col = s.ageMin < 2 ? '#ffffff' : s.ageMin < 10 ? '#fde047' : s.ageMin < 20 ? '#fb923c' : '#94a3b8';
        return `<circle class="sd-strike" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${s.ageMin < 2 ? 4 : 3}" fill="${col}"/>`;
      }).join('') + '</g>');
    }

    if (state.probe) {
      const q = P(state.probe.lon, state.probe.lat);
      parts.push(`<g data-layer="probe"><path class="sd-pin-mark" d="M${q.x},${q.y} l-7,-18 a8,8 0 1 1 14,0 z"/><circle cx="${q.x}" cy="${q.y - 20}" r="3" fill="#0b1220"/></g>`);
    }
    host.innerHTML = parts.join('');
  }
  function tropicsLayer(P) {
    const out = [], p = point(), rp = replayData();
    if (rp) {
      const upto = rp.points.slice(0, state.replay.idx + 1);
      out.push(`<polyline class="sd-track" points="${upto.map(x => { const q = P(x.lon, x.lat); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(' ')}"/>`);
      upto.forEach(x => { const q = P(x.lon, x.lat); out.push(`<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="3.5" fill="${catColor(x.kt || 0)}" stroke="#0b1220" stroke-width=".8"/>`); });
      const f = S.replayFrame(rp, state.replay.idx, null), q = P(f.lon, f.lat);
      if (f.r34Mi) {
        const e = S.destination(f.lat, f.lon, 90, 10), pxMi = Math.abs(P(e.lon, e.lat).x - q.x) / 10;
        out.push(`<circle class="sd-r34" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${(f.r34Mi * pxMi).toFixed(1)}"/>`);
      }
      out.push(`<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="8" fill="${catColor(f.kt)}" stroke="#fff" stroke-width="2"/><text class="sd-eye" x="${q.x.toFixed(1)}" y="${(q.y + 4).toFixed(1)}" text-anchor="middle">${f.cat.short}</text>`);
      return '<g data-layer="tropics">' + out.join('') + '</g>';
    }
    (state.storms || []).forEach(s => {
      const sel = s.slot === state.selected, op = sel ? 1 : 0.55;
      if (sel && s.cone) out.push(ringsOf(s.cone).map(r => `<polygon class="sd-cone" points="${svgPts(r, P)}"/>`).join(''));
      if (sel) (s.warnings || []).forEach(w => out.push(`<polyline class="sd-ww" style="stroke:${WW_COLORS[w.code] || '#fff'}" points="${svgPts(w.coords, P)}"/>`));
      if (sel && s.past && s.past.length > 1) out.push(`<polyline class="sd-past" points="${s.past.map(x => { const q = P(x.lon, x.lat); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(' ')}"/>`);
      if (sel) {
        out.push(`<polyline class="sd-track is-forecast" points="${s.track.map(x => { const q = P(x.lon, x.lat); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(' ')}"/>`);
        s.track.slice(1).forEach(x => { const q = P(x.lon, x.lat); out.push(`<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="4" fill="${catColor(x.kt)}" stroke="#0b1220" stroke-width=".8"/><text class="sd-celllabel" x="${(q.x + 6).toFixed(1)}" y="${(q.y - 5).toFixed(1)}">+${x.tau}h</text>`); });
      }
      const q = P(s.lon, s.lat);
      out.push(`<g opacity="${op}"><circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="9" fill="${catColor(s.maxwindKt)}" stroke="#fff" stroke-width="2"/><text class="sd-eye" x="${q.x.toFixed(1)}" y="${(q.y + 4).toFixed(1)}" text-anchor="middle">${S.saffirSimpson(s.maxwindKt).short}</text><text class="sd-celllabel" x="${(q.x + 12).toFixed(1)}" y="${(q.y + 4).toFixed(1)}">${esc(s.name)}</text></g>`);
    });
    return '<g data-layer="tropics">' + out.join('') + '</g>';
  }
  let drawQueued = false;
  function queueDraw() { if (drawQueued) return; drawQueued = true; requestAnimationFrame(() => { drawQueued = false; drawLayers(); }); }

  // ── scenarios ──────────────────────────────────────────────────────────────
  function startPractice() {
    const p = point(); if (!p) return;
    state.simReal0 = Date.now(); state.simVirt0 = 0;
    state.sim = S.createPracticeStorm({ lat: p.lat, lon: p.lon }, Date.now(), { fromDeg: 260, speedKt: 28, startDistMi: 45 });
    window.WWMap.fitPoints([{ lat: p.lat, lon: p.lon }, state.sim.origin]);
  }
  function setScenario(name) {
    state.scenario = name;
    document.querySelectorAll('#sd-scenario [data-scenario]').forEach(b => { const on = b.dataset.scenario === name; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
    ['sd-speed-wrap', 'sd-restart', 'sd-practice-note'].forEach(id => { const el = $(id); if (el) el.hidden = name !== 'practice'; });
    if (name === 'practice') startPractice(); else { state.sim = null; window.WWMap.redraw(); }
    renderPointLabels(); renderAll();
  }

  // ── orchestration ──────────────────────────────────────────────────────────
  function renderAll() {
    renderNowcast(); renderCells(); renderLightning(); renderOutlook(); renderEta(); renderBriefing(); renderTropics(); renderReplay(); renderBeam();
    queueDraw();
  }

  window.addEventListener('ww:location', e => {
    const l = e.detail.location;
    state.loc = { lat: Number(l.latitude), lon: Number(l.longitude), label: l.label };
    state.probe = null; state.weather = null;
    pointChanged();
  });
  window.addEventListener('ww:weather', e => { state.weather = e.detail.weather; renderBriefing(); renderEta(); });
  window.addEventListener('ww:lightning', e => { state.lightning = { status: e.detail.status, strikes: e.detail.strikes, listenStart: e.detail.listenStart }; renderLightning(); queueDraw(); });
  window.addEventListener('ww:maprender', () => queueDraw());
  window.addEventListener('ww:probe', e => {
    state.probe = { lat: e.detail.lat, lon: e.detail.lon };
    pointChanged();
  });

  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#sd-pin-reset')) { state.probe = null; pointChanged(); return; }
    const sc = t.closest('#sd-scenario [data-scenario]'); if (sc) { setScenario(sc.dataset.scenario); return; }
    if (t.closest('#sd-restart')) { startPractice(); renderAll(); return; }
    const storm = t.closest('.sd-storm'); if (storm) { state.selected = state.selected === storm.dataset.slot ? null : storm.dataset.slot; state.replay.slug = ''; $('tr-replay').value = ''; stopReplay(); renderAll(); if (state.selected) fitTropics(); return; }
    const v = t.closest('.sd-voice'); if (v) { state.voice = v.dataset.voice; store.set('ww:briefing:voice', state.voice); renderVoices(); renderBriefing(); return; }
    const cell = t.closest('.sd-cellbtn'); if (cell) { state.hour = Number(cell.dataset.h); renderIngredients(); return; }
    if (t.closest('#ww-map-fit')) { fitTropics(); return; }
    if (t.closest('#nc-check')) { checkGuess(); return; }
    if (t.closest('#tr-replay-play')) { toggleReplay(); return; }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('#ww-layer-toggles [data-layer]')) {
      layerOn[t.dataset.layer] = t.checked;
      const hide = [...document.querySelectorAll('#ww-layer-toggles [data-layer]')].filter(c => !c.checked).map(c => c.dataset.layer).join(' ');
      $('ww-radar-map').dataset.hide = hide; queueDraw();
    } else if (t.id === 'sd-speed') { const t0 = Date.now(); state.simVirt0 += (t0 - state.simReal0) * state.speed; state.simReal0 = t0; state.speed = Number(t.value); }
    else if (t.id === 'nc-challenge') { state.ncGuessed = false; renderNowcast(); }
    else if (t.id === 'beam-elev') renderBeam();
    else if (t.id === 'tr-replay') { state.replay.slug = t.value; state.replay.idx = 0; state.selected = null; stopReplay(); renderAll(); if (t.value) fitTropics(); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'dbz-range') renderDbz();
    else if (t.id === 'eta-dist' || t.id === 'eta-speed' || t.id === 'f2b-sec') renderEta();
    else if (t.id === 'ol-hour') { state.hour = Number(t.value); renderIngredients(); }
    else if (t.id === 'tr-replay-slider') { stopReplay(); state.replay.idx = Number(t.value); renderReplay(); queueDraw(); }
    else if (/^bf-(hot|cold|rain)$/.test(t.id)) { state.prefs[t.id.slice(3)] = Number(t.value); store.set('ww:briefing:prefs', state.prefs); renderBriefing(); }
  });

  function stopReplay() { clearInterval(state.replay.timer); state.replay.timer = null; const b = $('tr-replay-play'); if (b) { b.textContent = '▶ Play'; b.setAttribute('aria-pressed', 'false'); } }
  function toggleReplay() {
    const st = replayData(); if (!st) return;
    if (state.replay.timer) { stopReplay(); return; }
    if (state.replay.idx >= st.points.length - 1) state.replay.idx = 0;
    const b = $('tr-replay-play'); b.textContent = '❚❚ Pause'; b.setAttribute('aria-pressed', 'true');
    state.replay.timer = setInterval(() => {
      if (state.replay.idx >= st.points.length - 1) { stopReplay(); return; }
      state.replay.idx += 1; renderReplay(); queueDraw();
    }, 650);
  }

  // one-second heartbeat: practice storm advances; live countdowns and ETAs stay fresh
  let tick = 0;
  setInterval(() => {
    tick += 1;
    if (isPractice()) { renderNowcast(); renderCells(); renderLightning(); queueDraw(); }
    else if (tick % 5 === 0) { renderLightning(); renderCells(); if (tick % 15 === 0) queueDraw(); }
  }, 1000);
  // live feeds refresh on their own schedule
  setInterval(() => { if (!isPractice() && point()) { const p = point(); S.fetchAtmosphere(p.lat, p.lon).then(a => { if (a) { state.atm = a; renderNowcast(); renderOutlook(); renderBriefing(); } }); if (state.meta) S.fetchWarnings(state.meta.state).then(w => { if (w) { state.warnings = w; renderCells(); queueDraw(); } }); } }, 5 * MIN);

  function init() {
    renderVoices(); renderDbz(); renderEta(); renderScore();
    ['hot', 'cold', 'rain'].forEach(k => { const el = $(`bf-${k}`); if (el) el.value = state.prefs[k]; });
    if (window.WWMap && window.WWMap.location) { const l = window.WWMap.location; state.loc = { lat: Number(l.latitude), lon: Number(l.longitude), label: l.label }; }
    [1, 2, 3].forEach(d => S.fetchSpcOutlook(d).then(g => { state.spc[d] = g; renderOutlook(); queueDraw(); }));
    S.fetchActiveStorms({ full: true }).then(s => {
      state.storms = s; if (s && s.length && !state.selected && !state.replay.slug) {
        const p = point(); if (p) state.selected = s.slice().sort((a, b) => S.haversineMiles(a.lat, a.lon, p.lat, p.lon) - S.haversineMiles(b.lat, b.lon, p.lat, p.lon))[0].slot;
      }
      renderTropics(); queueDraw();
    });
    S.fetchTropicalOutlook().then(g => { state.gtwo = g; renderTropics(); });
    fetch(new URL('../../../data/storm-replays.json', SCRIPT_URL || location.href).href).then(r => (r.ok ? r.json() : null)).then(d => {
      if (!d) return;
      state.replays = d;
      const sel = $('tr-replay'); sel.innerHTML += d.storms.map(s => `<option value="${esc(s.slug)}">${esc(s.name)} (${s.year})</option>`).join('');
    }).catch(() => { /* replays are optional */ });
    renderPointLabels(); renderAll();
  }
  init();
})();
