/**
 * index-live-sky.js — the "Live Sky" strip in the home weather card.
 * Rain nowcast, official alerts and warned storms, storm outlook, tropics, and tomorrow's
 * briefing, all for whatever location the weather card is showing. Analysis lives in
 * storm-engine.js (shared with the Weather Watch lesson); this file only fetches and renders.
 *
 * Notifications are opt-in and honest: a static site has no server to push from, so they fire
 * only while this page is open.
 */
(function () {
  'use strict';
  const S = window.StormEngine;
  const root = document.getElementById('home-live-sky');
  if (!S || !root) return;
  const $ = id => document.getElementById(id);
  const MIN = 60000;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  const fmtMi = mi => (mi < 10 ? mi.toFixed(1) : Math.round(mi).toLocaleString('en-US'));
  const fmtClock = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const inConus = p => p.lat > 23 && p.lat < 50.5 && p.lon > -126 && p.lon < -65;
  const SEV_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 };

  const st = {
    loc: null,
    atm: null,
    meta: null,
    alerts: null,
    warnings: null,
    spc: null,
    storms: null,
    today: null,
    tomorrow: null,
    currentWeatherData: null,
    token: 0,
    loadedAt: 0,
    horizon: store.get('ww:briefing:horizon', 'today'),
    voice: store.get('ww:briefing:voice', 'anchor')
  };

  function setText(id, text) { const el = $(id); if (el && el.textContent !== text) el.textContent = text; }

  // ── render ─────────────────────────────────────────────────────────────────
  function ingredientsNext(h0, h1) {
    const rows = st.atm ? st.atm.ingredients : [], t = Date.now();
    return rows.filter(r => r.ms >= t + h0 * 3600e3 && r.ms <= t + h1 * 3600e3);
  }
  function renderNowcast() {
    const n = st.atm ? S.analyzeNowcast(st.atm.slots, Date.now()) : null;
    setText('ls-nowcast', n ? n.headline : st.loc ? 'Unavailable here' : 'Checking…');
    const bars = $('ls-bars');
    if (bars) {
      const peak = Math.max(5, n ? n.peakMmHr : 5);
      bars.innerHTML = n ? n.bars.map(b => `<i class="${b.cls}" style="height:${b.cls === 'dry' ? 2 : Math.max(18, Math.min(100, Math.sqrt(b.mmHr / peak) * 100)).toFixed(0)}%"></i>`).join('') : '';
    }
    return n;
  }
  function stormCards() {
    const p = st.loc, card = $('ls-storm-card');
    if (!p) return { cells: [] };
    const cells = st.warnings ? S.cellsFromAlerts(st.warnings, p, Date.now()).filter(c => c.inside || c.distanceMi <= 150) : [];
    const alerts = (st.alerts || []).slice().sort((a, b) => (SEV_RANK[b.properties.severity] || 0) - (SEV_RANK[a.properties.severity] || 0));
    let value, sub, hot = false;
    const inside = cells.find(c => c.inside);
    const onTrack = cells.find(c => c.approach && c.approach.etaMin != null && c.approach.etaMin < 120 && (c.approach.trackStatus === 'on-track' || c.approach.trackStatus === 'passes-near'));
    if (!st.meta && st.alerts == null && st.warnings == null) { value = st.loc ? 'US alerts only' : 'Checking…'; sub = 'Open the Storm Desk for the map'; }
    else if (inside) { value = `⚠ ${inside.event}: take shelter`; sub = 'You are inside the warned area'; hot = true; }
    else if (alerts.length) {
      const top = alerts[0].properties;
      value = `${top.event}${alerts.length > 1 ? ` +${alerts.length - 1} more` : ''}`;
      sub = onTrack ? `Warned storm ~${Math.round(onTrack.approach.etaMin)} min away` : 'Official NWS alerts for this point';
      hot = (SEV_RANK[top.severity] || 0) >= 3 || /Warning/.test(top.event);
    } else if (onTrack) { value = `Storm ${fmtMi(onTrack.approach.distanceMi)} mi ${S.compass16(onTrack.approach.fromUserDeg)}, ~${Math.round(onTrack.approach.etaMin)} min`; sub = `${onTrack.event} heading this way`; hot = true; }
    else { value = 'All quiet'; sub = cells.length ? `${cells.length} warned storm${cells.length > 1 ? 's' : ''} nearby, not heading here` : 'No active warnings at this point'; }
    setText('ls-storm', value); setText('ls-storm-sub', sub);
    if (card) card.classList.toggle('is-alert', hot);
    return { cells, alerts };
  }
  function renderOutlook() {
    const p = st.loc; if (!p) return;
    const spc = st.spc && inConus(p) ? S.outlookAtPoint(st.spc, p.lat, p.lon) : null;
    const next = ingredientsNext(-1, 24), top = next.length ? next.reduce((a, b) => (b.tier > a.tier ? b : a)) : null;
    setText('ls-outlook', spc ? (spc.rank ? `${spc.label} · ${spc.name}` : 'No storm risk area today') : top ? `Model: ${top.label}` : st.atm === null && st.loc ? 'Checking…' : 'Unavailable here');
    setText('ls-outlook-sub', top ? `Model ingredients peak at "${top.label}" around ${fmtClock(top.ms)}${spc ? ' · SPC official' : ''}` : '');
  }
  function renderTropics() {
    const p = st.loc; if (!p) return;
    if (st.storms === null && st.loc && st.tropicsTried) { setText('ls-tropics', 'Feed unavailable'); setText('ls-tropics-sub', 'National Hurricane Center'); return; }
    if (!st.storms) { setText('ls-tropics', 'Checking…'); return; }
    if (!st.storms.length) { setText('ls-tropics', 'Quiet'); setText('ls-tropics-sub', 'No active storms in the Atlantic or Pacific'); return; }
    const near = st.storms.map(s => ({ s, d: S.haversineMiles(s.lat, s.lon, p.lat, p.lon) })).sort((a, b) => a.d - b.d)[0];
    setText('ls-tropics', `${S.saffirSimpson(near.s.maxwindKt).short} ${near.s.name} · ${fmtMi(near.d)} mi`);
    setText('ls-tropics-sub', `${st.storms.length} active · ${near.s.maxwindKt} kt · ${S.compass16(S.bearingDeg(p.lat, p.lon, near.s.lat, near.s.lon))} of you`);
  }
  function briefing() {
    if (st.horizon === 'today') {
      const src = st.today || st.currentWeatherData || window.__homeWeatherData;
      if (!src && !st.atm) return null;
      const curData = src ? {
        location: st.loc,
        temperature: src.temperature != null ? src.temperature : (src.currentTemp != null ? src.currentTemp : (st.atm && st.atm.tempF ? st.atm.tempF[0] : 72)),
        feelsLike: src.feelsLike,
        condition: src.condition,
        code: src.currentCode != null ? src.currentCode : (src.weatherCode != null ? src.weatherCode : 0),
        max: src.max != null ? src.max : (src.hi != null ? src.hi : (src.temperature || 75)),
        min: src.min != null ? src.min : (src.lo != null ? src.lo : (src.temperature ? src.temperature - 10 : 60)),
        wind: src.wind != null ? src.wind : (src.windSpeed != null ? src.windSpeed : 0),
        windDirection: src.windDirection,
        humidity: src.humidity,
        uv: src.uv != null ? src.uv : (src.uvIndex != null ? src.uvIndex : 0),
        rainChance: src.rainChance || 0
      } : {
        location: st.loc,
        temperature: st.atm.tempF ? st.atm.tempF[0] : 72,
        feelsLike: st.atm.tempF ? st.atm.tempF[0] : 72,
        condition: 'Current conditions',
        code: 0,
        max: 75,
        min: 60,
        wind: 8,
        rainChance: 10,
        uv: 5
      };
      return S.composeCurrentSummary(curData, { voice: st.voice, prefs: store.get('ww:briefing:prefs', {}) });
    }
    if (!st.tomorrow) return null;
    const rows = ingredientsNext(12, 36), tier = rows.length ? Math.max(...rows.map(r => r.tier)) : 0;
    return S.composeDailySummary({ ...st.tomorrow, stormTier: tier }, { voice: st.voice, prefs: store.get('ww:briefing:prefs', {}) });
  }
  function renderBrief() {
    const out = briefing(), safety = $('ls-safety');
    const horizonWord = st.horizon === 'today' ? "today's" : "tomorrow's";
    setText('ls-brief', out ? out.text : st.loc ? `Loading ${horizonWord} briefing…` : 'Waiting for location…');
    if (safety) { safety.hidden = !(out && out.safety); setText('ls-safety', out && out.safety ? out.safety : ''); }

    const btnToday = $('ls-btn-today'), btnTomorrow = $('ls-btn-tomorrow');
    if (btnToday) {
      btnToday.classList.toggle('is-active', st.horizon === 'today');
      btnToday.setAttribute('aria-pressed', String(st.horizon === 'today'));
    }
    if (btnTomorrow) {
      btnTomorrow.classList.toggle('is-active', st.horizon === 'tomorrow');
      btnTomorrow.setAttribute('aria-pressed', String(st.horizon === 'tomorrow'));
    }
  }
  function renderAll() {
    renderNowcast(); const sc = stormCards(); renderOutlook(); renderTropics(); renderBrief();
    if (st.loc) setText('ls-where', st.loc.label ? String(st.loc.label) : '');
    if (st.loadedAt) setText('ls-updated', `Updated ${fmtClock(st.loadedAt)}`);
    return sc;
  }

  // ── load ───────────────────────────────────────────────────────────────────
  async function load() {
    const p = st.loc; if (!p) return;
    const token = ++st.token;
    const [atm, meta, tomorrow, today] = await Promise.all([
      S.fetchAtmosphere(p.lat, p.lon),
      S.fetchPointMeta(p.lat, p.lon),
      S.fetchTomorrow(p.lat, p.lon),
      S.fetchToday ? S.fetchToday(p.lat, p.lon) : null
    ]);
    if (token !== st.token) return;
    st.atm = atm; st.meta = meta; st.tomorrow = tomorrow; st.today = today; st.loadedAt = Date.now();
    renderAll();
    const [alerts, warnings, spc, storms] = await Promise.all([
      meta ? S.fetchAlertsAt(p.lat, p.lon) : null,
      meta ? S.fetchWarnings(meta.state) : null,
      inConus(p) ? S.fetchSpcOutlook(1) : null,
      S.fetchActiveStorms({ full: false })
    ]);
    if (token !== st.token) return;
    st.alerts = alerts; st.warnings = warnings; st.spc = spc; st.storms = storms; st.tropicsTried = true; st.loadedAt = Date.now();
    const sc = renderAll();
    checkNotifications(sc);
  }

  function onLocation(l) {
    if (!l || !Number.isFinite(Number(l.latitude))) return;
    const loc = { lat: Number(l.latitude), lon: Number(l.longitude), label: l.label };
    const same = st.loc && Math.abs(st.loc.lat - loc.lat) < 0.01 && Math.abs(st.loc.lon - loc.lon) < 0.01;
    st.loc = loc;
    if (same && Date.now() - st.loadedAt < 4 * MIN) return;
    if (!same) { st.atm = st.meta = st.alerts = st.warnings = st.tomorrow = st.today = null; }
    ensureVisible(load);
  }
  let visibleOnce = false;
  function ensureVisible(fn) {
    if (visibleOnce || !('IntersectionObserver' in window)) { visibleOnce = true; fn(); return; }
    const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); visibleOnce = true; fn(); } }, { rootMargin: '300px' });
    io.observe(root);
  }
  document.addEventListener('home-weather:location', e => onLocation(e.detail));
  document.addEventListener('home-weather:data', e => {
    if (e.detail) {
      st.currentWeatherData = e.detail;
      renderBrief();
    }
  });
  if (window.__homeWeatherLocation) onLocation(window.__homeWeatherLocation);
  if (window.__homeWeatherData) st.currentWeatherData = window.__homeWeatherData;
  setInterval(() => { if (st.loc && !document.hidden && Date.now() - st.loadedAt > 5 * MIN) load(); else if (st.loc) renderNowcast(); }, MIN);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && st.loc && Date.now() - st.loadedAt > 10 * MIN) load(); });

  // ── voice & speech ─────────────────────────────────────────────────────────
  const voice = $('ls-voice');
  if (voice) {
    voice.innerHTML = Object.entries(S.VOICES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    voice.value = S.VOICES[st.voice] ? st.voice : 'anchor';
    voice.addEventListener('change', () => {
      st.voice = voice.value;
      store.set('ww:briefing:voice', st.voice);
      if (S.isSpeaking()) S.stopSpeaking();
      renderBrief();
    });
    voice.addEventListener('click', e => e.stopPropagation());
  }

  ['ls-btn-today', 'ls-btn-tomorrow'].forEach(id => {
    const btn = $(id);
    if (btn) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        st.horizon = btn.dataset.horizon;
        store.set('ww:briefing:horizon', st.horizon);
        if (S.isSpeaking()) S.stopSpeaking();
        renderBrief();
      });
    }
  });

  const listenBtn = $('ls-listen');
  const speakBtn = $('home-weather-speak');

  function updateListenUi(speaking, activeBtn) {
    if (listenBtn) {
      const isThis = activeBtn === listenBtn;
      listenBtn.classList.toggle('is-speaking', isThis && speaking);
      listenBtn.innerHTML = (isThis && speaking)
        ? '<span aria-hidden="true">◼</span> Stop'
        : '<span aria-hidden="true">▶</span> Listen';
      listenBtn.setAttribute('aria-label', (isThis && speaking) ? 'Stop reading forecast' : 'Listen to weather briefing');
    }
    if (speakBtn) {
      const isThis = activeBtn === speakBtn;
      speakBtn.classList.toggle('is-speaking', isThis && speaking);
      speakBtn.innerHTML = (isThis && speaking)
        ? '<span class="speak-icon" aria-hidden="true">◼</span> <span class="speak-text">Stop</span>'
        : '<span class="speak-icon" aria-hidden="true">🔊</span> <span class="speak-text">Listen</span>';
      speakBtn.setAttribute('aria-label', (isThis && speaking) ? 'Stop reading weather' : 'Listen to current weather report out loud');
    }
  }

  function handleSpeakClick(btn, targetHorizon) {
    if (S.isSpeaking()) {
      S.stopSpeaking();
      updateListenUi(false, null);
      return;
    }
    if (targetHorizon && st.horizon !== targetHorizon) {
      st.horizon = targetHorizon;
      renderBrief();
    }
    const out = briefing();
    if (!out || !out.text) return;
    const textToSpeak = out.text + (out.safety ? ` ${out.safety}` : '');
    const started = S.speakWeather(textToSpeak, {
      voice: st.voice,
      onStart: () => updateListenUi(true, btn),
      onEnd: () => updateListenUi(false, null),
      onError: () => updateListenUi(false, null)
    });
    if (!started) updateListenUi(false, null);
  }

  if (listenBtn) {
    listenBtn.addEventListener('click', e => {
      e.stopPropagation();
      handleSpeakClick(listenBtn, null);
    });
  }
  if (speakBtn) {
    speakBtn.addEventListener('click', e => {
      e.stopPropagation();
      handleSpeakClick(speakBtn, 'today');
    });
  }

  // ── opt-in notifications (only while the page is open) ─────────────────────
  const NOTE = 'New NWS alerts, rain starting soon, and a 6 PM briefing. Works only while this page is open; a static site has no server to wake your device.';
  const prefs = store.get('ls:notify:v1', { on: false });
  const seen = store.get('ls:notify:seen', {});
  const btn = $('ls-notify');
  function saveSeen() { const cut = Date.now() - 2 * 86400e3; Object.keys(seen).forEach(k => { if (seen[k] < cut) delete seen[k]; }); store.set('ls:notify:seen', seen); }
  function renderNotifyBtn() {
    if (!btn) return;
    const supported = 'Notification' in window;
    const on = supported && prefs.on && Notification.permission === 'granted';
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? '🔔 Notifications on' : '🔔 Notify me';
    setText('ls-notify-note', !supported ? 'This browser does not support notifications.' : Notification.permission === 'denied' ? 'Notifications are blocked for this site in your browser settings.' : on ? 'On while this page is open: new NWS alerts, rain within 20 minutes, and a 6 PM briefing.' : NOTE);
  }
  function notify(title, body, tag) {
    if (!(prefs.on && 'Notification' in window && Notification.permission === 'granted')) return;
    try { new Notification(title, { body, tag }); } catch (e) { /* some mobile browsers require a service worker */ }
  }
  function checkNotifications(sc) {
    if (!sc || !(prefs.on && 'Notification' in window && Notification.permission === 'granted')) return;
    (sc.alerts || []).forEach(f => {
      const p = f.properties, id = f.id || p.id;
      if (!id || seen[id]) return;
      seen[id] = Date.now();
      if ((SEV_RANK[p.severity] || 0) >= 3 || /Warning/.test(p.event)) notify(p.event, p.headline || 'Active for your area', id);
    });
    (sc.cells || []).filter(c => c.inside).forEach(c => { const id = 'in:' + c.id; if (!seen[id]) { seen[id] = Date.now(); notify(`${c.event}: you are inside`, 'Take shelter indoors, away from windows.', id); } });
    const n = st.atm ? S.analyzeNowcast(st.atm.slots, Date.now()) : null;
    if (n && n.state === 'incoming' && n.startsInMin <= 20) { const id = `rain:${Math.floor(Date.now() / (3 * 3600e3))}`; if (!seen[id]) { seen[id] = Date.now(); notify('Rain is close', n.headline, id); } }
    const now = new Date(), day = `daily:${now.toDateString()}`, out = briefing();
    if (now.getHours() >= 18 && out && !seen[day]) { seen[day] = Date.now(); notify(`Tomorrow: ${st.tomorrow.dayName}`, out.text, day); }
    saveSeen();
  }
  if (btn) {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!('Notification' in window)) { renderNotifyBtn(); return; }
      if (prefs.on) { prefs.on = false; store.set('ls:notify:v1', prefs); renderNotifyBtn(); return; }
      const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      prefs.on = perm === 'granted'; store.set('ls:notify:v1', prefs);
      if (prefs.on) {
        // Don't announce alerts that were already active when the student opted in.
        (st.alerts || []).forEach(f => { seen[f.id || f.properties.id] = Date.now(); }); saveSeen();
        notify('Live Sky notifications are on', 'You will hear about new alerts and rain starting soon while this page stays open.', 'ls-on');
      }
      renderNotifyBtn();
    });
  }
  renderNotifyBtn();
  renderAll();
})();
