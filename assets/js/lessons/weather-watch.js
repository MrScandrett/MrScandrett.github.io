/**
 * weather-watch.js — Interactive Controller for Central Weather Watch Lesson
 * Mr. Scandrett's ClassroomOS
 */
(function () {
  'use strict';

  let currentWeather = null;
  let currentAirQuality = null;
  let activeCharacteristic = 'temperature';
  let unitSystem = 'imperial';
  let activeLocation = window.WeatherEngine.DEFAULT_LOCATION;
  let weatherRequestId = 0;
  let drivingSpeed = 55;
  const RADAR_MAX_ZOOM = 7; // RainViewer public tiles currently support zoom 7 maximum.
  const RADAR_MIN_ZOOM = 3;
  let radarZoom = 6;
  let mapCenter = null;           // {latitude, longitude}; null = follow the selected location
  let lastAlertFeatures = [];
  let lightningListenStart = 0;
  let lightningStatus = 'idle';   // idle | connecting | live | unavailable
  let radarRequestId = 0;
  let radarFrames = [];
  let radarFrameIndex = 0;
  let radarAnimationTimer = null;
  let lightningSocket = null;
  let lightningLocation = null;
  let lightningStrikes = [];
  let cloudSim = null;

  // ── DOM ELEMENTS ────────────────────────────────────────────────────────────
  const els = {
    // Search & Location
    searchInput: document.getElementById('ww-search-input'),
    searchResults: document.getElementById('ww-search-results'),
    geoBtn: document.getElementById('ww-geo-btn'),
    presetChips: document.querySelectorAll('.ww-preset-chip'),

    // Station Observatory
    stationCoords: document.getElementById('ww-station-coords'),
    stationFeed: document.getElementById('ww-station-feed'),
    unitBtns: document.querySelectorAll('.ww-unit-btn'),
    dialCity: document.getElementById('ww-dial-city'),
    heroCity: document.getElementById('ww-hero-city'),
    heroTemp: document.getElementById('ww-hero-temp'),
    heroCondition: document.getElementById('ww-hero-condition'),
    dialStation: document.getElementById('ww-dial-station'),
    dialTemp: document.getElementById('ww-dial-temp'),
    dialIcon: document.getElementById('ww-dial-icon'),
    dialCondition: document.getElementById('ww-dial-condition'),
    dialFeels: document.getElementById('ww-dial-feels'),
    dialSpread: document.getElementById('ww-dial-spread'),
    dialRain: document.getElementById('ww-dial-rain'),
    dialLo: document.getElementById('ww-dial-lo'),
    dialHi: document.getElementById('ww-dial-hi'),

    // Telemetry
    statDew: document.getElementById('ww-stat-dew'),
    statDewSub: document.getElementById('ww-stat-dew-sub'),
    statCloudBase: document.getElementById('ww-stat-cloudbase'),
    statCloudBaseSub: document.getElementById('ww-stat-cloudbase-sub'),
    statWind: document.getElementById('ww-stat-wind'),
    statWindSub: document.getElementById('ww-stat-wind-sub'),
    statPressure: document.getElementById('ww-stat-pressure'),
    statPressureSub: document.getElementById('ww-stat-pressure-sub'),
    statUV: document.getElementById('ww-stat-uv'),
    statUVSub: document.getElementById('ww-stat-uv-sub'),
    statHumidity: document.getElementById('ww-stat-humidity'),
    statHumiditySub: document.getElementById('ww-stat-humidity-sub'),
    statVisibility: document.getElementById('ww-stat-visibility'),
    statVisibilitySub: document.getElementById('ww-stat-visibility-sub'),
    statPollen: document.getElementById('ww-stat-pollen'),
    statPollenSub: document.getElementById('ww-stat-pollen-sub'),
    statAqi: document.getElementById('ww-stat-aqi'),
    statAqiSub: document.getElementById('ww-stat-aqi-sub'),

    // Hourly & Daily
    hourlyStrip: document.getElementById('ww-hourly-strip'),
    dailyGrid: document.getElementById('ww-daily-grid'),
    dailyTitle: document.querySelector('#forecast .ww-hourly-title'),

    // Solar & Lunar
    sunriseTime: document.getElementById('ww-sunrise-time'),
    sunsetTime: document.getElementById('ww-sunset-time'),
    daylightDuration: document.getElementById('ww-daylight-duration'),
    solarFill: document.getElementById('ww-solar-fill'),
    solarSun: document.getElementById('ww-solar-sun'),
    moonEmoji: document.getElementById('ww-moon-emoji'),
    moonName: document.getElementById('ww-moon-name'),
    moonIllum: document.getElementById('ww-moon-illum'),

    // Driving Section
    driveBanner: document.getElementById('ww-drive-banner'),
    driveBadge: document.getElementById('ww-drive-badge'),
    driveTitle: document.getElementById('ww-drive-title'),
    driveFriction: document.getElementById('ww-drive-friction'),
    hazardsGrid: document.getElementById('ww-hazards-grid'),
    speedSlider: document.getElementById('ww-speed-slider'),
    speedVal: document.getElementById('ww-speed-val'),
    chartDry: document.getElementById('ww-chart-dry'),
    chartDryVal: document.getElementById('ww-chart-dry-val'),
    chartWet: document.getElementById('ww-chart-wet'),
    chartWetVal: document.getElementById('ww-chart-wet-val'),
    chartSnow: document.getElementById('ww-chart-snow'),
    chartSnowVal: document.getElementById('ww-chart-snow-val'),
    chartIce: document.getElementById('ww-chart-ice'),
    chartIceVal: document.getElementById('ww-chart-ice-val'),

    // Wardrobe Section
    wardrobeEmoji: document.getElementById('ww-wardrobe-emoji'),
    wardrobeTitle: document.getElementById('ww-wardrobe-title'),
    wardrobeDesc: document.getElementById('ww-wardrobe-desc'),
    recessPill: document.getElementById('ww-recess-pill'),
    layerBase: document.getElementById('ww-layer-base'),
    layerMid: document.getElementById('ww-layer-mid'),
    layerOuter: document.getElementById('ww-layer-outer'),
    layerLower: document.getElementById('ww-layer-lower'),
    layerFoot: document.getElementById('ww-layer-foot'),
    layerAcc: document.getElementById('ww-layer-acc'),

    // Wardrobe Sandbox
    sandTemp: document.getElementById('ww-sand-temp'),
    sandTempVal: document.getElementById('ww-sand-temp-val'),
    sandRain: document.getElementById('ww-sand-rain'),
    sandWind: document.getElementById('ww-sand-wind'),
    sandResult: document.getElementById('ww-sand-result'),

    // LCL Cloud Base Lab
    lclTemp: document.getElementById('ww-lcl-temp'),
    lclTempVal: document.getElementById('ww-lcl-temp-val'),
    lclDew: document.getElementById('ww-lcl-dew'),
    lclDewVal: document.getElementById('ww-lcl-dew-val'),
    lclHeightFt: document.getElementById('ww-lcl-height-ft'),
    lclHeightM: document.getElementById('ww-lcl-height-m'),

    // Live Storm Watch
    radarMap: document.getElementById('ww-radar-map'),
    mapPane: document.getElementById('ww-map-pane'),
    mapCrosshair: document.getElementById('ww-map-crosshair'),
    recenter: document.getElementById('ww-map-recenter'),
    mapLoading: document.getElementById('ww-map-loading'),
    mapLocation: document.getElementById('ww-map-location'),
    radarUpdated: document.getElementById('ww-radar-updated'),
    alertList: document.getElementById('ww-alert-list'),
    alertCount: document.getElementById('ww-alert-count'),
    stormRefresh: document.getElementById('ww-storm-refresh'),
    zoomIn: document.getElementById('ww-map-zoom-in'),
    zoomOut: document.getElementById('ww-map-zoom-out'),
    alertPolygons: document.getElementById('ww-alert-polygons'),
    radarPlay: document.getElementById('ww-radar-play'),
    radarSlider: document.getElementById('ww-radar-slider'),
    radarFrameLabel: document.getElementById('ww-radar-frame-label'),
    lightningDistance: document.getElementById('ww-lightning-distance'),
    lightningDetail: document.getElementById('ww-lightning-detail'),
    lightningSafety: document.getElementById('ww-lightning-safety'),
    lightningSafetyText: document.getElementById('ww-lightning-safety-text'),

    // Sidebar
    sideLoc: document.getElementById('ww-side-loc'),
    sideTemp: document.getElementById('ww-side-temp'),
    sideCond: document.getElementById('ww-side-cond'),
    sideDrive: document.getElementById('ww-side-drive')
  };

  // ── CORE DATA LOADER ────────────────────────────────────────────────────────
  async function loadWeather(location) {
    const requestId = ++weatherRequestId;
    activeLocation = location;
    mapCenter = null;
    window.dispatchEvent(new CustomEvent('ww:location', { detail: { location } }));
    try {
      if (els.dialCondition) els.dialCondition.textContent = 'Updating atmospheric readings...';
      if (els.heroCity) els.heroCity.textContent = location.label;
      if (els.heroTemp) els.heroTemp.textContent = '--°';
      if (els.heroCondition) els.heroCondition.textContent = 'Updating local conditions…';
      const data = await window.WeatherEngine.fetchWeather(location);
      if (requestId !== weatherRequestId) return;
      currentWeather = data;
      window.dispatchEvent(new CustomEvent('ww:weather', { detail: { weather: data, location } }));
      renderCockpit(data);
      renderDriving(data);
      renderWardrobe(data);
      renderSidebar(data);
      loadStormWatch(location);
      loadAirQuality(location);
    } catch (err) {
      if (requestId !== weatherRequestId) return;
      console.error('Weather load error:', err);
      if (els.dialCondition) els.dialCondition.textContent = 'Weather feed temporarily unavailable';
      if (els.heroCondition) els.heroCondition.textContent = 'Weather feed temporarily unavailable';
    }
  }

  // ── LIVE STORM WATCH ───────────────────────────────────────────────────────
  // RainViewer supplies recent precipitation-radar tiles without an API key.
  // NWS alerts are intentionally a separate layer: radar return is not a warning.
  function lonToTileX(lon, zoom) { return ((lon + 180) / 360) * (2 ** zoom); }
  function latToTileY(lat, zoom) {
    const safeLat = Math.max(-85.0511, Math.min(85.0511, lat));
    const rad = safeLat * Math.PI / 180;
    return ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * (2 ** zoom);
  }

  function formatRadarTime(unixSeconds) {
    return new Date(unixSeconds * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function stopRadarAnimation() {
    if (radarAnimationTimer) window.clearInterval(radarAnimationTimer);
    radarAnimationTimer = null;
    if (els.radarPlay) { els.radarPlay.textContent = '▶ Play'; els.radarPlay.setAttribute('aria-pressed', 'false'); }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  // One projection shared by tiles, overlays and the Storm Desk layers (Web Mercator, 256px tiles).
  function mapView() { const c = mapCenter || activeLocation; return { latitude: Number(c.latitude), longitude: Number(c.longitude) }; }
  function project(lon, lat) {
    const rect = els.radarMap.getBoundingClientRect(), c = mapView();
    return {
      x: (lonToTileX(lon, radarZoom) - lonToTileX(c.longitude, radarZoom)) * 256 + rect.width / 2,
      y: (latToTileY(lat, radarZoom) - latToTileY(c.latitude, radarZoom)) * 256 + rect.height / 2
    };
  }
  function unproject(x, y) {
    const rect = els.radarMap.getBoundingClientRect(), c = mapView(), n = 2 ** radarZoom;
    const tx = (x - rect.width / 2) / 256 + lonToTileX(c.longitude, radarZoom);
    const ty = (y - rect.height / 2) / 256 + latToTileY(c.latitude, radarZoom);
    return { lon: (tx / n) * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180 / Math.PI };
  }

  function renderRadarTiles(frame) {
    if (!els.radarMap || !els.mapPane) return;
    els.mapPane.querySelectorAll('.ww-radar-tile, .ww-base-tile').forEach(tile => tile.remove());
    const mapRect = els.radarMap.getBoundingClientRect();
    const c = mapView();
    const centerX = lonToTileX(c.longitude, radarZoom) * 256;
    const centerY = latToTileY(c.latitude, radarZoom) * 256;
    const tileX = Math.floor(centerX / 256);
    const tileY = Math.floor(centerY / 256);
    const tileCount = 2 ** radarZoom;
    const halfX = Math.ceil(mapRect.width / 512) + 1;
    const halfY = Math.ceil(mapRect.height / 512) + 1;
    const fragment = document.createDocumentFragment();

    for (let dx = -halfX; dx <= halfX; dx += 1) {
      for (let dy = -halfY; dy <= halfY; dy += 1) {
        const x = ((tileX + dx) % tileCount + tileCount) % tileCount;
        const y = tileY + dy;
        if (y < 0 || y >= tileCount) continue;
        const left = `${(tileX + dx) * 256 - centerX + mapRect.width / 2}px`;
        const top = `${y * 256 - centerY + mapRect.height / 2}px`;
        const base = document.createElement('img');
        base.className = 'ww-base-tile';
        base.alt = '';
        base.draggable = false;
        base.src = `https://tile.openstreetmap.org/${radarZoom}/${x}/${y}.png`;
        base.style.left = left;
        base.style.top = top;
        fragment.appendChild(base);
        if (frame) {
          const radar = document.createElement('img');
          radar.className = 'ww-radar-tile';
          radar.alt = '';
          radar.draggable = false;
          radar.src = `${frame.host}${frame.path}/256/${radarZoom}/${x}/${y}/2/1_1.png`;
          radar.style.left = left;
          radar.style.top = top;
          fragment.appendChild(radar);
        }
      }
    }
    els.mapPane.insertBefore(fragment, els.mapPane.firstChild);
  }

  function placeHomeMarker() {
    if (!activeLocation || !els.mapLocation) return;
    const p = project(activeLocation.longitude, activeLocation.latitude);
    [els.mapLocation, els.mapCrosshair].forEach(el => { if (el) { el.style.left = `${p.x}px`; el.style.top = `${p.y}px`; } });
    els.mapLocation.title = `${activeLocation.label || 'Selected location'} · home marker`;
  }

  /** Everything that depends on where the map is looking. Layers listen for `ww:maprender`. */
  function redrawMap() {
    if (!els.radarMap || !activeLocation) return;
    if (els.mapPane) els.mapPane.style.transform = '';
    renderRadarTiles(radarFrames[radarFrameIndex] || null);
    renderAlertPolygons(lastAlertFeatures);
    placeHomeMarker();
    window.dispatchEvent(new CustomEvent('ww:maprender', { detail: { zoom: radarZoom } }));
  }

  function renderAlertPolygons(features) {
    if (!els.alertPolygons || !els.radarMap) return;
    const rect = els.radarMap.getBoundingClientRect();
    const toPoint = ([lon, lat]) => { const p = project(lon, lat); return `${p.x},${p.y}`; };
    els.alertPolygons.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    els.alertPolygons.innerHTML = '';
    features.forEach(feature => {
      const geometry = feature.geometry;
      const properties = feature.properties || {};
      if (!geometry || !geometry.coordinates) return;
      const rings = geometry.type === 'Polygon' ? geometry.coordinates : geometry.type === 'MultiPolygon' ? geometry.coordinates.flat() : [];
      rings.forEach(ring => {
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', ring.map(toPoint).join(' '));
        polygon.setAttribute('class', `ww-alert-polygon ${(properties.severity || 'unknown').toLowerCase()}`);
        els.alertPolygons.appendChild(polygon);
      });
    });
  }

  async function loadRadar(location) {
    const requestId = ++radarRequestId;
    if (!els.radarMap) return;
    if (els.mapLoading) { els.mapLoading.textContent = 'Loading radar…'; els.mapLoading.hidden = false; }
    try {
      const response = await fetch('https://api.rainviewer.com/public/weather-maps.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Radar manifest ${response.status}`);
      const manifest = await response.json();
      const frames = manifest.radar && manifest.radar.past;
      if (!Array.isArray(frames) || !frames.length || requestId !== radarRequestId) throw new Error('No current radar frame');
      stopRadarAnimation();
      radarFrames = frames.map(frame => ({ ...frame, host: manifest.host }));
      radarFrameIndex = radarFrames.length - 1;
      if (els.radarSlider) { els.radarSlider.max = String(Math.max(0, radarFrames.length - 1)); els.radarSlider.value = String(radarFrameIndex); }
      redrawMap();
      updateRadarFrameLabel();
      if (els.mapLoading) els.mapLoading.hidden = true;
    } catch (err) {
      console.warn('Radar load error:', err);
      redrawMap();
      if (els.mapLoading) { els.mapLoading.hidden = false; els.mapLoading.textContent = 'Radar temporarily unavailable (map and storm layers still work)'; }
      if (els.radarUpdated) els.radarUpdated.textContent = 'Radar unavailable';
    }
  }

  function updateRadarFrameLabel() {
    const frame = radarFrames[radarFrameIndex];
    if (!frame) return;
    const latest = radarFrames[radarFrames.length - 1];
    if (els.radarFrameLabel) els.radarFrameLabel.textContent = `${radarFrameIndex === radarFrames.length - 1 ? 'Latest' : formatRadarTime(frame.time)} · ${radarFrames.length} frames`;
    if (els.radarUpdated) els.radarUpdated.textContent = `Radar frame: ${formatRadarTime(frame.time)} · latest ${formatRadarTime(latest.time)}`;
  }

  function setRadarFrame(index) {
    if (!radarFrames.length || !activeLocation) return;
    radarFrameIndex = Math.max(0, Math.min(radarFrames.length - 1, Number(index)));
    renderRadarTiles(radarFrames[radarFrameIndex]);
    updateRadarFrameLabel();
  }

  function toggleRadarAnimation() {
    if (radarAnimationTimer) { stopRadarAnimation(); return; }
    if (radarFrames.length < 2) return;
    if (radarFrameIndex >= radarFrames.length - 1) setRadarFrame(0);
    if (els.radarPlay) { els.radarPlay.textContent = '❚❚ Pause'; els.radarPlay.setAttribute('aria-pressed', 'true'); }
    radarAnimationTimer = window.setInterval(() => {
      const next = radarFrameIndex + 1 >= radarFrames.length ? 0 : radarFrameIndex + 1;
      if (els.radarSlider) els.radarSlider.value = String(next);
      setRadarFrame(next);
    }, 850);
  }

  async function loadAlerts(location) {
    if (!els.alertList || !els.alertCount) return;
    const lat = Number(location.latitude);
    const lon = Number(location.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 17.5 || lat > 72 || lon < -180 || lon > -60) {
      els.alertCount.textContent = 'NWS / US';
      els.alertList.innerHTML = '<p class="ww-alert-empty">Official NWS alerts are available for locations in the United States. Radar remains available worldwide where RainViewer has coverage.</p>';
      lastAlertFeatures = [];
      renderAlertPolygons([]);
      return;
    }
    try {
      const response = await fetch(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`, {
        headers: { Accept: 'application/geo+json, application/json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`NWS alerts ${response.status}`);
      const data = await response.json();
      const features = Array.isArray(data.features) ? data.features : [];
      els.alertCount.textContent = `${features.length} active`;
      lastAlertFeatures = features;
      renderAlertPolygons(features);
      window.dispatchEvent(new CustomEvent('ww:alerts', { detail: { features, location } }));
      els.alertList.innerHTML = features.length ? features.slice(0, 5).map(feature => {
        const p = feature.properties || {};
        const severity = (p.severity || 'Unknown').toLowerCase();
        return `<article class="ww-alert-item ${escapeHtml(severity)}"><strong>${escapeHtml(p.event || 'Weather alert')}</strong><span>${escapeHtml(p.headline || p.areaDesc || 'Active for this point')}</span></article>`;
      }).join('') : '<p class="ww-alert-empty">No active NWS alerts at this point.</p>';
    } catch (err) {
      console.warn('Alert load error:', err);
      els.alertCount.textContent = 'Unavailable';
      els.alertList.innerHTML = '<p class="ww-alert-empty">The official alert feed could not be reached. Try refresh.</p>';
      lastAlertFeatures = [];
      renderAlertPolygons([]);
    }
  }

  function haversineMiles(aLat, aLon, bLat, bLon) {
    const r = 3958.8;
    const rad = Math.PI / 180;
    const dLat = (bLat - aLat) * rad;
    const dLon = (bLon - aLon) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
    return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  // This module owns the websocket; Storm Desk (storm-desk.js) turns the strikes into readouts,
  // trends and the 30/30 clock so live and practice data share one code path.
  function emitLightning() {
    window.dispatchEvent(new CustomEvent('ww:lightning', { detail: { strikes: lightningStrikes.slice(), location: lightningLocation, status: lightningStatus, listenStart: lightningListenStart } }));
  }

  function connectLightning(location) {
    lightningLocation = location;
    lightningStrikes = [];
    lightningListenStart = 0;
    if (lightningSocket) { lightningSocket.close(); lightningSocket = null; }
    lightningStatus = 'connecting';
    emitLightning();
    if (!location) return;
    try {
      const socket = new WebSocket('wss://live2.lightningmaps.org/');
      lightningSocket = socket;
      const lat = Number(location.latitude);
      const lon = Number(location.longitude);
      const span = 4;
      socket.addEventListener('open', () => {
        lightningStatus = 'live';
        lightningListenStart = Date.now();
        socket.send(JSON.stringify({ v: 24, p: [lat + span, lon + span, lat - span, lon - span], z: radarZoom, a: 4, t: 1, l: 1, r: 'A' }));
        emitLightning();
      });
      socket.addEventListener('message', event => {
        try {
          const payload = JSON.parse(event.data);
          const now = Date.now();
          (payload.strokes || []).forEach(stroke => {
            if (Number.isFinite(stroke.lat) && Number.isFinite(stroke.lon)) lightningStrikes.push({ lat: stroke.lat, lon: stroke.lon, time: Number(stroke.time) || now });
          });
          lightningStrikes = lightningStrikes.filter(strike => now - strike.time < 35 * 60 * 1000);
          emitLightning();
        } catch (err) { /* Ignore non-JSON keepalive frames. */ }
      });
      socket.addEventListener('close', () => {
        if (lightningSocket === socket) { lightningStatus = 'unavailable'; emitLightning(); }
      });
      socket.addEventListener('error', () => socket.close());
    } catch (err) {
      lightningStatus = 'unavailable';
      emitLightning();
    }
  }

  function renderAirQualityCards() {
    if (!els.statAqi || !els.statPollen) return;
    if (!currentAirQuality) {
      els.statAqi.textContent = 'Unavailable';
      els.statAqiSub.textContent = 'Air-quality feed unavailable';
      els.statPollen.textContent = 'Unavailable';
      els.statPollenSub.textContent = 'No regional pollen forecast';
      return;
    }
    const aq = currentAirQuality;
    els.statAqi.innerHTML = aq.aqi != null
      ? formatStatValue(String(aq.aqi), 'US AQI', aqiLabel(aq.aqi))
      : 'Unavailable';
    els.statAqiSub.textContent = aq.pm25 != null
      ? `PM2.5 ${aq.pm25} μg/m³ · O₃ ${aq.ozone || 0} μg/m³`
      : 'No current pollutant reading';
    const pollen = aq.pollen;
    if (pollen && Number.isFinite(pollen.peak)) {
      els.statPollen.innerHTML = formatStatValue(String(Math.round(pollen.peak)), 'grains/m³', pollen.category);
      els.statPollenSub.textContent = 'Peak regional aeroallergen forecast';
    } else {
      els.statPollen.textContent = pollen ? pollen.value : 'Unavailable';
      els.statPollenSub.textContent = pollen ? pollen.sub : 'No regional pollen forecast';
    }
  }

  async function loadAirQuality(location) {
    if (!els.statAqi || !els.statPollen || !location) return;
    const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    url.searchParams.set('latitude', location.latitude);
    url.searchParams.set('longitude', location.longitude);
    url.searchParams.set('current', 'us_aqi,pm2_5,pm10,ozone');
    url.searchParams.set('hourly', 'alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen');
    url.searchParams.set('forecast_days', '2');
    url.searchParams.set('timezone', 'auto');
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Air quality ${response.status}`);
      const data = await response.json();
      const current = data.current || {};
      const aqi = Number(current.us_aqi);
      const pollen = pollenSummary(data.hourly);
      currentAirQuality = {
        aqi: Number.isFinite(aqi) ? Math.round(aqi) : null,
        aqiText: Number.isFinite(aqi) ? `${Math.round(aqi)} (${aqiLabel(aqi)})` : 'Unavailable',
        pm25: Number.isFinite(Number(current.pm2_5)) ? Number(current.pm2_5).toFixed(1) : null,
        ozone: Number.isFinite(Number(current.ozone)) ? Math.round(Number(current.ozone)) : null,
        pollen
      };
      renderAirQualityCards();
      if (window.WWCockpitViz) window.WWCockpitViz.renderAir({ aqi }, pollen);
      renderCharInspector(activeCharacteristic);
    } catch (err) {
      console.warn('Air quality load error:', err);
      currentAirQuality = null;
      renderAirQualityCards();
      if (window.WWCockpitViz) window.WWCockpitViz.renderAir(null, null);
      renderCharInspector(activeCharacteristic);
    }
  }

  function aqiLabel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Sensitive groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very unhealthy';
    return 'Hazardous';
  }

  function pollenSummary(hourly) {
    if (!hourly || !hourly.time) return { value: 'Unavailable', sub: 'No regional pollen forecast' };
    const keys = ['alder_pollen', 'birch_pollen', 'grass_pollen', 'mugwort_pollen', 'olive_pollen', 'ragweed_pollen'];
    const peaks = keys.flatMap(key => (hourly[key] || []).filter(value => Number.isFinite(value)));
    if (!peaks.length || Math.max(...peaks) === 0) return { value: 'Unavailable', sub: 'Pollen model has no local coverage' };
    const peak = Math.max(...peaks);
    const category = peak < 10 ? 'Low' : peak < 100 ? 'Moderate' : peak < 1000 ? 'High' : 'Very high';
    return { value: category, category, peak, sub: `Peak forecast ${Math.round(peak)} grains/m³` };
  }

  function loadStormWatch(location) {
    if (!location || !els.radarMap) return;
    stopRadarAnimation();
    els.radarMap.setAttribute('aria-label', `Live precipitation radar map centered on ${location.label || 'the selected location'}`);
    lastAlertFeatures = [];
    redrawMap();
    loadRadar(location);
    loadAlerts(location);
    connectLightning(location);
  }

  // ── UNIT HELPERS & STATION RENDERING ────────────────────────────────────────
  function fToC(f) {
    return Math.round(((f - 32) * 5) / 9);
  }

  function mphToKmh(mph) {
    return Math.round(mph * 1.60934);
  }

  function miToKm(mi) {
    return (Number(mi) * 1.60934).toFixed(1);
  }

  function formatStatValue(numText, unitText, badgeText) {
    const badge = badgeText ? `<span class="ww-stat-badge">${escapeHtml(badgeText)}</span>` : '';
    return `<span class="ww-stat-reading"><span class="ww-stat-num">${escapeHtml(numText)}</span><span class="ww-stat-unit">${escapeHtml(unitText)}</span>${badge}</span>`;
  }

  function renderCockpit(data) {
    if (!els.dialCity) return;

    const isMetric = unitSystem === 'metric';
    const tempUnit = isMetric ? '°C' : '°F';
    const speedUnit = isMetric ? 'km/h' : 'mph';
    const tempVal = (f) => (isMetric ? fToC(f) : Math.round(f));
    const dewSpreadF = Math.max(0, data.temperature - data.dewPoint);
    const dewSpreadDisplay = isMetric ? ((dewSpreadF * 5) / 9).toFixed(1) : Math.round(dewSpreadF);
    const windVal = isMetric ? mphToKmh(data.wind) : data.wind;
    const gustVal = isMetric ? mphToKmh(data.windGusts) : data.windGusts;
    const visMiles = data.visibilityMiles != null ? data.visibilityMiles : 10;
    const rhBand = data.humidity >= 80 ? 'Very Humid' : data.humidity >= 60 ? 'Humid' : data.humidity >= 30 ? 'Comfortable' : 'Dry';
    const visSub = visMiles >= 6 ? 'Clear visual range (≥ 6 mi)' : visMiles >= 3 ? 'Light haze or mist' : visMiles >= 1 ? 'Reduced visibility' : 'Dense fog / low ceiling';

    if (els.stationCoords && data.location) {
      const lat = Number(data.location.latitude);
      const lon = Number(data.location.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
        const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
        els.stationCoords.textContent = `${latStr}, ${lonStr} · ${data.location.climate || 'Surface Station'}`;
      }
    }
    if (els.stationFeed) {
      els.stationFeed.textContent = data.isSimulated ? 'Simulated Climate Model' : 'Live Open-Meteo Telemetry';
    }

    els.dialCity.textContent = data.location.label;
    els.dialStation.textContent = data.location.stationId;
    els.dialTemp.textContent = `${tempVal(data.temperature)}${tempUnit}`;
    els.dialIcon.textContent = data.icon;
    els.dialCondition.textContent = data.condition;
    if (els.heroCity) els.heroCity.textContent = data.location.label;
    if (els.heroTemp) els.heroTemp.textContent = `${tempVal(data.temperature)}${tempUnit}`;
    if (els.heroCondition) els.heroCondition.textContent = data.condition;
    els.dialFeels.textContent = `Feels like ${tempVal(data.feelsLike)}${tempUnit}`;
    if (els.dialSpread) els.dialSpread.textContent = `Dew spread ${dewSpreadDisplay}${tempUnit} · ${data.dewComfort.category}`;
    if (els.dialRain) els.dialRain.textContent = `Rain chance ${data.rainChance}%`;
    els.dialLo.textContent = `${tempVal(data.min)}${tempUnit}`;
    els.dialHi.textContent = `${tempVal(data.max)}${tempUnit}`;

    // Grouped Topic Telemetry Cards
    els.statDew.innerHTML = isMetric
      ? formatStatValue(`${((data.dewPoint - 32) * 5 / 9).toFixed(1)}`, '°C', data.dewComfort.category)
      : formatStatValue(`${Math.round(data.dewPoint)}`, '°F', data.dewComfort.category);
    els.statDewSub.textContent = `Spread ${dewSpreadDisplay}${tempUnit} below air temp`;

    els.statHumidity.innerHTML = formatStatValue(`${data.humidity}`, '%', rhBand);
    if (els.statHumiditySub) els.statHumiditySub.textContent = 'Water vapor saturation ratio';

    els.statCloudBase.innerHTML = isMetric
      ? formatStatValue(`${data.cloudBase.meters.toLocaleString()}`, 'm', `~${data.cloudBase.feet.toLocaleString()} ft`)
      : formatStatValue(`${data.cloudBase.feet.toLocaleString()}`, 'ft', `~${data.cloudBase.meters.toLocaleString()} m`);
    els.statCloudBaseSub.textContent = 'Lifting Condensation Level';

    els.statWind.innerHTML = formatStatValue(`${windVal}`, speedUnit, data.windCompass.short);
    els.statWindSub.textContent = `Gusts ${gustVal} ${speedUnit} · Bft ${data.beaufort.number} (${data.beaufort.name})`;

    els.statPressure.innerHTML = isMetric
      ? formatStatValue(`${data.pressure.hPa}`, 'hPa', `${data.pressure.inHg} inHg`)
      : formatStatValue(`${data.pressure.inHg}`, 'inHg', `${data.pressure.hPa} hPa`);
    els.statPressureSub.textContent = data.pressure.system;

    els.statUV.innerHTML = formatStatValue(`${data.uvIndex}`, 'UV', data.uvInfo.category);
    els.statUVSub.textContent = `Unprotected burn: ${data.uvInfo.burnTime}`;

    els.statVisibility.innerHTML = isMetric
      ? formatStatValue(`${miToKm(visMiles)}`, 'km', `${visMiles} mi`)
      : formatStatValue(`${visMiles}`, 'mi', `${miToKm(visMiles)} km`);
    if (els.statVisibilitySub) els.statVisibilitySub.textContent = visSub;

    if (window.WWCockpitViz) window.WWCockpitViz.render(data);

    // Hourly 24-hr strip
    if (els.hourlyStrip && data.hourly) {
      els.hourlyStrip.innerHTML = data.hourly.map((h, i) => `
        <div class="ww-hourly-slot${i === 0 ? ' is-now' : ''}">
          <span class="ww-hourly-time">${i === 0 ? 'Now' : h.timeLabel}</span>
          <span class="ww-hourly-icon" aria-hidden="true">${h.icon}</span>
          <span class="ww-hourly-temp">${tempVal(h.temp)}${tempUnit}</span>
          <span class="ww-hourly-pop">${h.precipProb > 0 ? `${h.precipProb}%` : ''}</span>
        </div>
      `).join('');
    }

    // 7-day daily forecast
    if (els.dailyTitle) {
      els.dailyTitle.textContent = `7-Day Synoptic Outlook & Temperature Range (${tempUnit})`;
    }
    if (els.dailyGrid && data.daily) {
      // One compact row per day; each bar spans that day's low-high on a shared week scale.
      const weekLo = Math.min(...data.daily.map((d) => d.min));
      const weekHi = Math.max(...data.daily.map((d) => d.max));
      const span = Math.max(1, weekHi - weekLo);
      els.dailyGrid.innerHTML = data.daily.map((d) => {
        const left = ((d.min - weekLo) / span) * 100;
        const width = Math.max(6, ((d.max - d.min) / span) * 100);
        const pos = width >= 100 ? 0 : (left / (100 - width)) * 100;
        const rain = d.rainChance > 0 ? `${d.rainChance}%` : '';
        return `
        <div class="ww-daily-card" role="listitem">
          <span class="ww-daily-day">${d.dayName}</span>
          <span class="ww-daily-icon" aria-hidden="true">${d.icon}</span>
          <span class="ww-daily-rain">${rain}</span>
          <span class="ww-daily-lo">${tempVal(d.min)}°</span>
          <span class="ww-daily-bar" aria-hidden="true"><span class="ww-daily-fill" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background-size:${(10000 / width).toFixed(0)}% 100%;background-position:${pos.toFixed(1)}% 0"></span></span>
          <span class="ww-daily-hi">${tempVal(d.max)}°</span>
        </div>`;
      }).join('');
    }

    // Ephemeris (Sun & Moon)
    if (data.sunriseEpoch && data.sunsetEpoch) {
      const rise = new Date(data.sunriseEpoch).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const set = new Date(data.sunsetEpoch).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      els.sunriseTime.textContent = rise;
      els.sunsetTime.textContent = set;

      if (els.daylightDuration) {
        const totalMin = Math.max(0, Math.round((data.sunsetEpoch - data.sunriseEpoch) / 60000));
        const hrs = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        els.daylightDuration.textContent = `Daylight: ${hrs}h ${mins}m`;
      }

      const now = Date.now();
      let pct = 0;
      if (now >= data.sunriseEpoch && now <= data.sunsetEpoch) {
        pct = Math.round(((now - data.sunriseEpoch) / (data.sunsetEpoch - data.sunriseEpoch)) * 100);
      } else if (now > data.sunsetEpoch) {
        pct = 100;
      }
      els.solarFill.style.width = `${pct}%`;
      els.solarSun.style.left = `${pct}%`;
    }

    if (data.moon) {
      els.moonEmoji.textContent = data.moon.emoji;
      els.moonName.textContent = data.moon.name;
      els.moonIllum.textContent = `${data.moon.illumination}% lit`;
    }

    renderCharInspector(activeCharacteristic);
  }

  // ── RENDER DRIVING ENGINE ───────────────────────────────────────────────────
  function renderDriving(data) {
    if (!els.driveBanner) return;
    const driving = window.WeatherEngine.evaluateDrivingConditions(data, drivingSpeed);

    els.driveBanner.className = `ww-drive-banner ${driving.statusClass}`;
    els.driveBadge.textContent = driving.status;
    els.driveTitle.textContent = driving.statusTitle;
    els.driveFriction.innerHTML = `Surface: <strong>${driving.roadState}</strong> (Friction coefficient μ = ${driving.frictionMu})`;

    // Hazards
    if (els.hazardsGrid) {
      if (!driving.hazards.length) {
        els.hazardsGrid.innerHTML = `
          <div class="ww-hazard-card">
            <h4 class="ww-hazard-title">✅ No Major Atmospheric Road Hazards</h4>
            <p class="ww-hazard-desc">Road conditions are currently nominal. Standard safe driving precautions and posted speed limits apply.</p>
          </div>
        `;
      } else {
        els.hazardsGrid.innerHTML = driving.hazards.map((h) => `
          <div class="ww-hazard-card ${h.severity}">
            <h4 class="ww-hazard-title">⚠️ ${h.title}</h4>
            <p class="ww-hazard-desc">${h.desc}</p>
          </div>
        `).join('');
      }
    }

    updateBrakingChart(drivingSpeed);
  }

  function updateBrakingChart(speedMph) {
    const g = 32.174;
    const v_fps = speedMph * 1.46667;
    const reactionDist = Math.round(v_fps * 1.5);

    // Friction values
    const dryDist = Math.round((v_fps * v_fps) / (2 * 0.75 * g));
    const wetDist = Math.round((v_fps * v_fps) / (2 * 0.45 * g));
    const snowDist = Math.round((v_fps * v_fps) / (2 * 0.20 * g));
    const iceDist = Math.round((v_fps * v_fps) / (2 * 0.07 * g));

    // Scaling max to ice at 75mph (~800ft)
    const maxScale = Math.max(iceDist + reactionDist, 600);

    const dryPct = Math.min(100, Math.round(((dryDist + reactionDist) / maxScale) * 100));
    const wetPct = Math.min(100, Math.round(((wetDist + reactionDist) / maxScale) * 100));
    const snowPct = Math.min(100, Math.round(((snowDist + reactionDist) / maxScale) * 100));
    const icePct = Math.min(100, Math.round(((iceDist + reactionDist) / maxScale) * 100));

    if (els.chartDry) {
      els.chartDry.style.width = `${dryPct}%`;
      els.chartDryVal.textContent = `${dryDist + reactionDist} ft`;
      els.chartWet.style.width = `${wetPct}%`;
      els.chartWetVal.textContent = `${wetDist + reactionDist} ft`;
      els.chartSnow.style.width = `${snowPct}%`;
      els.chartSnowVal.textContent = `${snowDist + reactionDist} ft`;
      els.chartIce.style.width = `${icePct}%`;
      els.chartIceVal.textContent = `${iceDist + reactionDist} ft`;
    }
  }

  // ── RENDER WARDROBE ENGINE ──────────────────────────────────────────────────
  function renderWardrobe(data) {
    if (!els.wardrobeEmoji) return;
    const c = data.clothing;

    els.wardrobeEmoji.textContent = c.emoji;
    els.wardrobeTitle.textContent = `${c.thermalCategory} (${c.feelsF}°F feels-like)`;
    els.wardrobeDesc.textContent = c.summaryText;
    els.recessPill.textContent = c.recessRating;

    els.layerBase.textContent = c.layers.base;
    els.layerMid.textContent = c.layers.mid;
    els.layerOuter.textContent = c.layers.outer;
    els.layerLower.textContent = c.layers.lower;
    els.layerFoot.textContent = c.layers.footwear;
    els.layerAcc.textContent = c.layers.accessories.join(' · ') || 'No special gear needed';
  }

  function updateWardrobeSandbox() {
    if (!els.sandTemp) return;
    const temp = parseInt(els.sandTemp.value, 10);
    const isRain = els.sandRain.checked;
    const isWind = els.sandWind.checked;

    els.sandTempVal.textContent = `${temp}°F`;

    const mockWeather = {
      temperature: temp,
      feelsLike: isWind ? temp - 8 : temp,
      weatherCode: isRain ? 63 : 1,
      rainChance: isRain ? 90 : 10,
      wind: isWind ? 25 : 5,
      uvIndex: temp > 80 ? 8 : 3
    };

    const c = window.WeatherEngine.evaluateClothing(mockWeather);
    els.sandResult.innerHTML = `
      <div style="margin-top:0.8rem; padding:1rem; background:rgba(0,217,245,0.08); border:1px solid var(--ww-cyan-border); border-radius:8px;">
        <h4 style="margin:0 0 0.4rem; color:var(--ww-cyan); font-size:1.1rem;">${c.emoji} ${c.thermalCategory}</h4>
        <p style="margin:0 0 0.6rem; font-size:0.92rem; color:#f1f5f9;">${c.summaryText}</p>
        <div style="font-size:0.85rem; line-height:1.5; color:#cbd5e1;">
          <div><strong>Base Layer:</strong> ${c.layers.base}</div>
          <div><strong>Mid Layer:</strong> ${c.layers.mid}</div>
          <div><strong>Outer Layer:</strong> ${c.layers.outer}</div>
          <div><strong>Footwear:</strong> ${c.layers.footwear}</div>
          <div><strong>Accessories:</strong> ${c.layers.accessories.join(' · ') || 'None'}</div>
        </div>
      </div>
    `;
  }

  // ── LCL CLOUD BASE CALCULATOR ───────────────────────────────────────────────
  function updateLclCalc() {
    if (!els.lclTemp || !els.lclDew) return;
    const t = parseInt(els.lclTemp.value, 10);
    const d = parseInt(els.lclDew.value, 10);

    // Keep dew point <= temp
    if (d > t) {
      els.lclDew.value = t;
    }

    const currentT = parseInt(els.lclTemp.value, 10);
    const currentD = parseInt(els.lclDew.value, 10);

    els.lclTempVal.textContent = `${currentT}°F`;
    els.lclDewVal.textContent = `${currentD}°F`;

    const lcl = window.WeatherEngine.calculateCloudBase(currentT, currentD);
    els.lclHeightFt.textContent = `${lcl.feet.toLocaleString()} FT`;
    els.lclHeightM.textContent = `~${lcl.meters.toLocaleString()} M`;

    if (cloudSim) {
      cloudSim.setThermodynamics({ tempF: currentT, dewPointF: currentD });
    }
  }

  // ── RENDER SIDEBAR ──────────────────────────────────────────────────────────
  function renderSidebar(data) {
    if (!els.sideLoc) return;
    els.sideLoc.textContent = data.location.label;
    els.sideTemp.textContent = `${data.temperature}°F (${data.condition})`;
    els.sideCond.textContent = `${data.dewComfort.category} · RH ${data.humidity}%`;
    els.sideDrive.textContent = `Road Status: ${data.driving.status} (${data.driving.statusTitle})`;
  }

  // ── INTERACTIVE FRONT CANVAS SIMULATOR ──────────────────────────────────────
  function initFrontSimulator() {
    const canvas = document.getElementById('ww-front-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frontType = 'cold'; // 'cold' or 'warm'
    let animFrame = null;
    let t = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    resize();
    window.addEventListener('resize', resize);

    const coldBtn = document.getElementById('ww-front-cold');
    const warmBtn = document.getElementById('ww-front-warm');
    const noteEl = document.getElementById('ww-front-note');
    const frontPhoto = document.getElementById('ww-front-reference-img');
    const frontTitle = document.getElementById('ww-front-reference-title');
    const frontDescription = document.getElementById('ww-front-reference-description');
    const frontImages = {
      cold: { src: '../../assets/images/lessons/weather-watch/cumulonimbus-noaa.webp', alt: 'Towering cumulonimbus clouds rising above the horizon', title: 'Cold front sky', description: 'Deep uplift can build a cumulonimbus tower like this one; the model shows the air motion underneath.' },
      warm: { src: '../../assets/images/lessons/weather-watch/cirrus-noaa.webp', alt: 'Thin cirrus clouds stretched across a blue sky', title: 'Ahead of a warm front', description: 'High cirrus may appear before the thicker, lower clouds and widespread rain of a warm front.' }
    };
    const skyTextures = {};
    Object.entries(frontImages).forEach(([key, photo]) => {
      const image = new Image();
      image.src = photo.src;
      skyTextures[key] = image;
    });
    function updateFrontReference() {
      const photo = frontImages[frontType];
      if (frontPhoto) { frontPhoto.src = photo.src; frontPhoto.alt = photo.alt; }
      if (frontTitle) frontTitle.textContent = photo.title;
      if (frontDescription) frontDescription.textContent = photo.description;
    }

    if (coldBtn && warmBtn) {
      coldBtn.addEventListener('click', () => {
        frontType = 'cold';
        updateFrontReference();
        coldBtn.classList.add('is-active');
        warmBtn.classList.remove('is-active');
        if (noteEl) {
          noteEl.innerHTML = `
            <strong>Cold Front Dynamics:</strong> Cold, dense polar air advances like a snowplow wedge under light, warm moist air.
            The steep upward push forces vigorous vertical convection, generating towering <em>cumulonimbus clouds</em>, sharp squall lines,
            intense downpours, lightning, and a sudden drop in temperature and dew point behind the front.
          `;
        }
      });

      warmBtn.addEventListener('click', () => {
        frontType = 'warm';
        updateFrontReference();
        warmBtn.classList.add('is-active');
        coldBtn.classList.remove('is-active');
        if (noteEl) {
          noteEl.innerHTML = `
            <strong>Warm Front Dynamics:</strong> Warm, buoyant tropical air glides gently up and over a retreating wedge of cold air.
            Because the slope is very gradual (1:200), the air expands and cools over hundreds of miles, creating a wide sequence of
            layered clouds: first high wispy <em>cirrus</em>, then mid-level <em>altostratus</em>, and finally thick <em>nimbostratus</em> with
            hours of steady, widespread rain.
          `;
        }
      });
    }

    function draw() {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      const compact = w < 400;
      const modelScale = Math.max(0.52, Math.min(1, w / 600));
      t += 0.02;

      ctx.clearRect(0, 0, w, h);

      // Sky background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0a192f');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);
      // A faint NOAA sky photograph textures the schematic; the colored air
      // masses and cloud sprites remain the simulated teaching model.
      const texture = skyTextures[frontType];
      if (texture && texture.complete && texture.naturalWidth) {
        const scale = Math.max(w / texture.naturalWidth, h / texture.naturalHeight);
        const tw = texture.naturalWidth * scale;
        const th = texture.naturalHeight * scale;
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.drawImage(texture, (w - tw) / 2, (h - th) / 2, tw, th);
        ctx.restore();
      }

      // Ground
      ctx.fillStyle = '#1e3a1e';
      ctx.fillRect(0, h - 25, w, 25);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, h - 22, w, 4);

      if (frontType === 'cold') {
        // Cold Wedge advancing from left to right
        ctx.beginPath();
        ctx.moveTo(0, h - 25);
        ctx.lineTo(0, h - 180);
        ctx.quadraticCurveTo(w * 0.35, h - 140, w * 0.55, h - 25);
        ctx.lineTo(0, h - 25);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
        ctx.fill();

        // Front boundary line (Blue Triangles)
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Warm air on right rising up
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.beginPath();
        ctx.moveTo(w * 0.55, h - 25);
        ctx.quadraticCurveTo(w * 0.35, h - 140, 0, h - 180);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, h - 25);
        ctx.fill();

        // Towering Volumetric 3D Cumulonimbus
        if (window.CloudEngine && window.CloudEngine.renderCloudCluster) {
          // Convective storm body
          window.CloudEngine.renderCloudCluster(ctx, w * 0.47, h - 160 * modelScale, 160 * modelScale, 140 * modelScale, { storm: true, darkBase: true, time: t });
          // Glaciated anvil top blown downwind
          window.CloudEngine.renderCloudCluster(ctx, w * 0.53, h - 225 * modelScale, 220 * modelScale, 70 * modelScale, { storm: false, darkBase: false, time: t * 0.7 });
        } else {
          ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
          ctx.beginPath();
          ctx.arc(w * 0.45, h - 160 + Math.sin(t) * 3, 45, 0, Math.PI * 2);
          ctx.arc(w * 0.48, h - 210 + Math.cos(t) * 4, 55, 0, Math.PI * 2);
          ctx.arc(w * 0.53, h - 170, 48, 0, Math.PI * 2);
          ctx.fill();
        }

        // Rain shafts
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 20; i++) {
          const rx = w * 0.40 + (i * 7 * modelScale);
          const ry = (h - 110) + ((t * 200 + i * 15) % 85);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + 12);
          ctx.stroke();
        }

        // Labels
        ctx.font = `bold ${compact ? 10 : 12}px ui-monospace, monospace`;
        ctx.fillStyle = '#60a5fa';
        ctx.fillText(compact ? 'COLD / DENSE' : 'COLD AIR MASS (Dense)', compact ? 10 : 20, h - 60);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(compact ? 'WARM / MOIST' : 'WARM AIR MASS (Moist)', compact ? w - 98 : w - 180, compact ? h - 42 : h - 60);
        ctx.fillStyle = '#fff';
        ctx.fillText(compact ? '↑ RAPID UPLIFT' : '↑ Rapid Convection (Squall)', w * 0.36, h - 90, w * 0.6);

      } else {
        // Warm Front (gentle slope)
        ctx.beginPath();
        ctx.moveTo(w, h - 25);
        ctx.lineTo(w, h - 100);
        ctx.lineTo(0, h - 25);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.fill();

        // Warm air riding up
        ctx.beginPath();
        ctx.moveTo(0, h - 25);
        ctx.lineTo(w, h - 100);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, 0);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.fill();

        // Realistic Volumetric Cloud Progression: Cirrus -> Altostratus -> Nimbostratus
        if (window.CloudEngine && window.CloudEngine.renderCloudCluster) {
          // Cirrus (high ice crystals)
          window.CloudEngine.renderCloudCluster(ctx, w * 0.80, 52, 130 * modelScale, 34 * modelScale, { storm: false, darkBase: false, time: t * 0.5 });
          // Altostratus (middle layer)
          window.CloudEngine.renderCloudCluster(ctx, w * 0.48, h - 175 * modelScale, 175 * modelScale, 48 * modelScale, { storm: false, darkBase: true, time: t * 0.4 });
          // Nimbostratus (low steady rain layer)
          window.CloudEngine.renderCloudCluster(ctx, w * 0.18, h - 125 * modelScale, 190 * modelScale, 65 * modelScale, { storm: true, darkBase: true, time: t * 0.3 });
        } else {
          // Altostratus fallback
          ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
          ctx.fillRect(w * 0.4, h - 190, 160, 20);
          // Nimbostratus fallback
          ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
          ctx.fillRect(w * 0.1, h - 130, 180, 40);
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = 'italic 11px sans-serif';
        ctx.fillText('Cirrus (Ice crystals)', w - 145, 36);

        ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 35; i++) {
          const rx = w * 0.10 + (i * 5);
          const ry = (h - 90) + ((t * 120 + i * 10) % 65);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 2, ry + 10);
          ctx.stroke();
        }

        ctx.font = `bold ${compact ? 10 : 12}px ui-monospace, monospace`;
        ctx.fillStyle = '#60a5fa';
        ctx.fillText(compact ? 'COLD AIR' : 'RETREATING COLD AIR', compact ? w - 75 : w - 180, h - 40);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(compact ? 'WARM AIR RISES' : 'WARM AIR OVERRIDING', compact ? 10 : 20, 60);
      }

      animFrame = window.SimKit ? SimKit.frame('#ww-front-canvas', draw) : requestAnimationFrame(draw);
    }

    draw();
  }

  // ── ATMOSPHERIC CLOUD, SMOKE & GAS LABORATORY ──────────────────────────────
  function initCloudLab() {
    const canvas = document.getElementById('ww-cloud-canvas');
    if (!canvas || !window.CloudEngine) return;

    const initialTemp = els.lclTemp ? parseInt(els.lclTemp.value, 10) : 75;
    const initialDew = els.lclDew ? parseInt(els.lclDew.value, 10) : 55;

    cloudSim = window.CloudEngine.attach(canvas, {
      preset: 'cumulus',
      tempF: initialTemp,
      dewPointF: initialDew,
      interactive: true,
      maxParticles: 180,
      particleRenderScale: Math.max(0.45, Math.min(0.8, canvas.clientWidth / 800)),
      showLCL: true,
      showAltitudeGuide: true,
      onLCLChange: (feet) => {
        const noteLcl = document.getElementById('ww-cloud-note-lcl');
        if (noteLcl) noteLcl.textContent = `${feet.toLocaleString()} FT`;
      }
    });
    window.addEventListener('resize', () => {
      if (cloudSim) cloudSim.options.particleRenderScale = Math.max(0.45, Math.min(0.8, canvas.clientWidth / 800));
    });

    const chips = document.querySelectorAll('.ww-cloud-chip');
    const noteEl = document.getElementById('ww-cloud-lab-note');
    const cloudReference = document.getElementById('ww-cloud-reference');
    const cloudReferenceGrid = cloudReference?.closest('.ww-sim-broadcast-grid');
    const cloudReferenceImg = document.getElementById('ww-cloud-reference-img');
    const cloudReferenceTitle = document.getElementById('ww-cloud-reference-title');
    const cloudReferenceDescription = document.getElementById('ww-cloud-reference-description');
    const cloudPhotos = {
      cumulus: { file: 'cumulus', alt: 'Puffy cumulus clouds with flat bases in a blue sky', title: 'Cumulus in the sky', description: 'Compare the photo\'s flat bases and sunlit tops with the rising, condensing parcels in the model.' },
      cumulonimbus: { file: 'cumulonimbus', alt: 'A tall cumulonimbus thunderstorm cloud with a spreading upper edge', title: 'Storm cloud in the sky', description: 'The real tower and spreading top show what strong updrafts can build above the model\'s rising air.' },
      stratus_fog: { file: 'stratus', alt: 'A low gray stratus sheet covering the landscape', title: 'Stratus in the sky', description: 'A nearly continuous low layer contrasts with the isolated towers made by strong convection.' },
      cirrus: { file: 'cirrus', alt: 'Thin, feathery cirrus clouds high in a blue sky', title: 'Cirrus in the sky', description: 'These high ice-crystal wisps are stretched by upper-level winds.' }
    };
    function updateCloudReference(presetId) {
      const photo = cloudPhotos[presetId];
      if (cloudReference) cloudReference.hidden = !photo;
      if (cloudReferenceGrid) cloudReferenceGrid.classList.toggle('is-reference-hidden', !photo);
      if (!photo) return;
      if (cloudReferenceImg) { cloudReferenceImg.src = `../../assets/images/lessons/weather-watch/${photo.file}-noaa.webp`; cloudReferenceImg.alt = photo.alt; }
      if (cloudReferenceTitle) cloudReferenceTitle.textContent = photo.title;
      if (cloudReferenceDescription) cloudReferenceDescription.textContent = photo.description;
    }
    const descriptions = {
      cumulus: '<strong>Cumulus Convection Dynamics:</strong> Sun-warmed ground heats parcels of surface air. Because warm air is buoyant, parcels accelerate upward. As they ascend into lower atmospheric pressure, they expand adiabatically and cool at 5.4°F per 1,000 ft until reaching the <em>Lifting Condensation Level</em> (<span id="ww-cloud-note-lcl">' + (cloudSim ? cloudSim.lclFeet.toLocaleString() : '4,545') + ' FT</span>). There, water vapor condenses into visible droplets, releasing latent heat and building towering cauliflower billows!',
      cumulonimbus: '<strong>Cumulonimbus Violent Updrafts &amp; Rain:</strong> Intense solar heating or steep frontal uplift forces air up at 40–100 mph. The cloud pushes straight through the troposphere to the tropopause (40,000+ ft), where jet winds shear the top into a giant anvil. Massive precipitation shafts plunge to ground.',
      stratus_fog: '<strong>Stratus &amp; Fog Layering:</strong> Formed when a widespread, moist air mass is cooled gently from below (radiation cooling on clear calm nights, or warm air blowing over a cold body of water). Very weak vertical motion keeps the cloud blanketed horizontally near ground.',
      cirrus: '<strong>Cirrus Ice Physics:</strong> Pure hexagonal ice crystals cruising above 20,000 ft in temperatures colder than -30°F. Strong upper-troposphere jet winds stretch the falling ice plumes into long, curved fibrous streamers known as "mare\'s tails".',
      chimney_smoke: '<strong>Chimney &amp; Industrial Plume Mechanics:</strong> High-temperature exhaust gases are significantly less dense than ambient air, shooting upward in a buoyant jet. As the plume climbs, viscous friction entrains surrounding cold air, creating swirling vortex billows that bend with atmospheric wind shear.',
      volcano_ash: '<strong>Volcanic Pyroclastic Eruption:</strong> Sub-surface gas expansion blasts pulverised rock, glass shards, and sulfur dioxide miles into the sky. Hot thermal convection carries ash clouds into an umbrella plume while dense glowing embers arc back to earth under gravity.',
      steam_vent: '<strong>Geothermal &amp; Pressure Steam Jet:</strong> Superheated water vapor escapes under pressure. It expands explosively, cooling rapidly in surrounding ambient air to condense into a brief brilliant white cloud of micro-droplets before evaporating into dry air.',
      heavy_gas: '<strong>Dense Creeping Gas Dynamics:</strong> Heavy gases (such as cold carbon dioxide, sulfur hexafluoride, or chlorine vapor) are denser than atmospheric air (ρ > 1.2 kg/m³). They exhibit negative buoyancy, hugging the ground and cascading down hillsides into depressions.'
    };

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        const presetId = chip.dataset.preset;
        if (cloudSim) cloudSim.setPreset(presetId);
        updateCloudReference(presetId);
        if (noteEl && descriptions[presetId]) {
          noteEl.innerHTML = descriptions[presetId];
        }
      });
    });

    const windSlider = document.getElementById('ww-cloud-wind');
    const windVal = document.getElementById('ww-cloud-wind-val');
    if (windSlider) {
      windSlider.addEventListener('input', () => {
        const val = parseFloat(windSlider.value);
        if (windVal) windVal.textContent = `${val.toFixed(1)} MPH`;
        if (cloudSim) cloudSim.setWind(val);
      });
    }

    const turbSlider = document.getElementById('ww-cloud-turb');
    const turbVal = document.getElementById('ww-cloud-turb-val');
    if (turbSlider) {
      turbSlider.addEventListener('input', () => {
        const val = parseFloat(turbSlider.value);
        if (turbVal) turbVal.textContent = `${val.toFixed(1)}x`;
        if (cloudSim) cloudSim.setTurbulence(val);
      });
    }

    const syncBtn = document.getElementById('ww-cloud-sync-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        if (currentWeather && cloudSim) {
          cloudSim.syncWithWeatherEngine(currentWeather);
          updateCloudReference(cloudSim.preset.id);
          if (els.lclTemp) els.lclTemp.value = currentWeather.temperature;
          if (els.lclDew) els.lclDew.value = currentWeather.dewPoint;
          updateLclCalc();
          if (windSlider) {
            windSlider.value = currentWeather.wind;
            if (windVal) windVal.textContent = `${currentWeather.wind} MPH`;
          }
          chips.forEach(c => {
            c.classList.toggle('is-active', c.dataset.preset === cloudSim.preset.id);
          });
          if (noteEl && descriptions[cloudSim.preset.id]) {
            noteEl.innerHTML = descriptions[cloudSim.preset.id];
          }
        }
      });
    }

    const lightningBtn = document.getElementById('ww-cloud-lightning-btn');
    if (lightningBtn) {
      lightningBtn.addEventListener('click', () => {
        if (cloudSim) cloudSim.triggerLightning();
      });
    }
  }

  // ── CHARACTERISTICS FIELD GUIDE (EXHIBIT 01) ──────────────────────────────
  function getCharacteristicSpec(key) {
    const d = currentWeather;
    const aq = currentAirQuality;
    const isMetric = unitSystem === 'metric';
    const specs = {
      temperature: {
        icon: '🌡️',
        title: 'Air Temperature & Apparent Thermal Load',
        reading: d
          ? (isMetric
            ? `${fToC(d.temperature)}°C (Feels like ${fToC(d.feelsLike)}°C · ${d.temperature}°F)`
            : `${d.temperature}°F (Feels like ${d.feelsLike}°F · ${fToC(d.temperature)}°C)`)
          : 'Loading station telemetry…',
        wing: 'Wing I · Observatory → Wing V · Layering',
        instrument: 'Shielded Aspiration Thermometer / Thermistor',
        units: '°F / °C (measured 1.5–2 m above grass in shade)',
        mechanism: 'Measures the average translational kinetic energy of nitrogen and oxygen molecules, combined with wind and humidity for apparent temperature.',
        significance: d
          ? `Today's range is ${d.min}°F to ${d.max}°F / ${fToC(d.min)}°C to ${fToC(d.max)}°C (${d.condition}). Large diurnal swings occur under clear, dry skies; humid air damps cooling.`
          : 'Thermal energy sets air density, saturation capacity, and human metabolic heat loss.',
        href: '#clothing',
        cta: 'Open Exhibit 10 · Thermal Layering →'
      },
      dew: {
        icon: '💧',
        title: 'Dew Point Temperature (Absolute Moisture)',
        reading: d
          ? (isMetric
            ? `${((d.dewPoint - 32) * 5 / 9).toFixed(1)}°C (${d.dewPoint}°F · ${d.dewComfort.category})`
            : `${d.dewPoint}°F (${((d.dewPoint - 32) * 5 / 9).toFixed(1)}°C · ${d.dewComfort.category})`)
          : 'Loading station telemetry…',
        wing: 'Wing I · Observatory → Wing II · Cloud Lab',
        instrument: 'Chilled-Mirror Hygrometer / Capacitive Psychrometer',
        units: '°F / °C (vapor pressure saturation temperature)',
        mechanism: 'The exact temperature to which an air parcel must be cooled at constant pressure to reach 100% saturation and condense liquid droplets.',
        significance: d
          ? `${d.dewComfort.feel}. Unlike relative humidity, dew point directly measures water vapor mass in the air.`
          : 'Dew points above 60°F fuel thunderstorms; above 70°F slow human sweat evaporation.',
        href: '#clouds',
        cta: 'Explore Exhibit 02 · Moisture & Cloud Lab →'
      },
      humidity: {
        icon: '💦',
        title: 'Relative Humidity (Saturation Ratio)',
        reading: d ? `${d.humidity}% RH` : 'Loading station telemetry…',
        wing: 'Wing II · Hall of Water & Sky',
        instrument: 'Thin-Film Polymer Capacitive Hygrometer',
        units: 'Percent (%) of equilibrium vapor pressure at current T',
        mechanism: 'Ratio of actual water vapor pressure to the maximum saturation vapor pressure possible at that temperature — which doubles roughly every 20°F.',
        significance: d
          ? `At ${d.temperature}°F (${fToC(d.temperature)}°C) with ${d.dewPoint}°F dew point, the air holds ${d.humidity}% of its maximum vapor capacity.`
          : 'Relative humidity routinely rises at night simply because temperature falls, even when no moisture is added.',
        href: '#clouds',
        cta: 'Compare RH vs Dew Point in Exhibit 02 →'
      },
      cloudbase: {
        icon: '☁️',
        title: 'Cloud Base Altitude (LCL Ceiling)',
        reading: d
          ? (isMetric
            ? `${d.cloudBase.meters.toLocaleString()} m (~${d.cloudBase.feet.toLocaleString()} ft)`
            : `${d.cloudBase.feet.toLocaleString()} ft (~${d.cloudBase.meters.toLocaleString()} m)`)
          : 'Loading station telemetry…',
        wing: 'Wing II · Hall of Water & Sky',
        instrument: 'Laser Ceilometer & LCL Thermodynamic Calculation',
        units: 'Feet or meters above ground level (AGL)',
        mechanism: 'Rising convective parcels cool faster than their dew point by ~4.4°F per 1,000 ft. Condensation begins at H = ((T − Td) / 4.4) × 1,000 ft.',
        significance: d
          ? `A current T − Td spread of ${Math.max(0, d.temperature - d.dewPoint)}°F places convective cloud bases near ${d.cloudBase.feet.toLocaleString()} ft (${d.cloudBase.meters.toLocaleString()} m).`
          : 'Lower cloud bases mean damp air near saturation; high bases indicate dry boundary layers.',
        href: '#clouds',
        cta: 'Calculate LCL in Exhibit 02 →'
      },
      pressure: {
        icon: '🧭',
        title: 'Barometric Pressure (Atmospheric Column Weight)',
        reading: d
          ? (isMetric
            ? `${d.pressure.hPa} hPa (${d.pressure.inHg} inHg · ${d.pressure.system})`
            : `${d.pressure.inHg} inHg (${d.pressure.hPa} hPa · ${d.pressure.system})`)
          : 'Loading station telemetry…',
        wing: 'Wing III · Hall of Air in Motion',
        instrument: 'Aneroid / Silicon Piezoresistive Barometer',
        units: 'Hectopascals (hPa / mb) or inches of mercury (inHg)',
        mechanism: 'Measures the downward gravitational weight of the entire column of atmosphere above the station, corrected to mean sea level (standard = 1013.25 hPa).',
        significance: d
          ? `Current column reads ${d.pressure.hPa} hPa / ${d.pressure.inHg} inHg (${d.pressure.system}). Rapid drops > 4 hPa in 3 hours signal an intensifying cyclone or front.`
          : 'Horizontal pressure differences (gradients) initiate wind from High toward Low pressure.',
        href: '#fronts',
        cta: 'Explore Wing III · Air Masses & Fronts →'
      },
      wind: {
        icon: '🌬️',
        title: 'Surface Wind Speed, Direction & Gusts',
        reading: d
          ? (isMetric
            ? `${mphToKmh(d.wind)} km/h ${d.windCompass.short} (${d.wind} mph · Gusts ${mphToKmh(d.windGusts)} km/h · Bft ${d.beaufort.number})`
            : `${d.wind} mph ${d.windCompass.short} (${mphToKmh(d.wind)} km/h · Gusts ${d.windGusts} mph · Beaufort ${d.beaufort.number})`)
          : 'Loading station telemetry…',
        wing: 'Wing III · Air Motion → Wing IV · Storm Steering',
        instrument: 'Ultrasonic Anemometer & Wind Vane (10 m tower)',
        units: 'mph, km/h, knots, or m/s; named for direction air blows FROM',
        mechanism: 'Driven by the Pressure Gradient Force and deflected right (Northern Hemisphere) by Earth\'s rotation (Coriolis effect), slowed by ground friction.',
        significance: d
          ? `Flow is ${d.windCompass.full} (${d.beaufort.name}). Upper winds near 700 hPa steer storms, while low-level shear tilts updrafts.`
          : 'Wind speed squared controls dynamic pressure on structures and chill factor on exposed skin.',
        href: '#outlook',
        cta: 'Check Shear & Steering in Wing IV →'
      },
      uv: {
        icon: '☀️',
        title: 'Ultraviolet (UV) Solar Irradiance',
        reading: d ? `UV ${d.uvIndex} · ${d.uvInfo.category} (${d.uvInfo.burnTime})` : 'Loading station telemetry…',
        wing: 'Wing I · Observatory → Wing V · Outdoor Readiness',
        instrument: 'Broadband UV Pyranometer (290–400 nm)',
        units: 'World Health Organization UV Index (0 to 11+)',
        mechanism: 'Quantifies erythema-weighted shortwave solar UV-A and UV-B photons penetrating stratospheric ozone, clouds, and atmospheric path length.',
        significance: d
          ? `Sun exposure risk is ${d.uvInfo.category}; ${d.uvInfo.burnTime.toLowerCase()}. Peak UV happens within ±2 hours of solar noon regardless of air temperature.`
          : 'Clouds can scatter UV without blocking it completely; snow and sand reflect additional UV upward.',
        href: '#clothing',
        cta: 'Plan Sun Protection in Exhibit 10 →'
      },
      visibility: {
        icon: '🌫️',
        title: 'Horizontal Atmospheric Visibility',
        reading: d
          ? (isMetric
            ? `${miToKm(d.visibilityMiles)} km (${d.visibilityMiles} mi)`
            : `${d.visibilityMiles} mi (${miToKm(d.visibilityMiles)} km)`)
          : 'Loading station telemetry…',
        wing: 'Wing II · Moisture → Wing V · Road Friction Physics',
        instrument: 'Optical Forward-Scatter Transmissometer / ASOS',
        units: 'Statute miles (mi) or kilometers (km)',
        mechanism: 'Measures light extinction (scattering + absorption) across the lowest boundary layer caused by fog droplets, mist, blowing dust, snow, or smoke.',
        significance: d
          ? `Current runway visual range is ${d.visibilityMiles} mi (${miToKm(d.visibilityMiles)} km). Under 1/4 mile activates dense fog advisories requiring low-beam headlights.`
          : 'Fog forms when surface temperature cools all the way to the dew point (spread ≤ 2°F).',
        href: '#driving',
        cta: 'Inspect Fog & Braking in Exhibit 11 →'
      },
      aerosols: {
        icon: '🌿',
        title: 'Particulates, Ozone & Airborne Pollen',
        reading: aq ? `US AQI: ${aq.aqiText} · Pollen: ${aq.pollen ? aq.pollen.value : 'Unavailable'}` : 'Loading regional air quality…',
        wing: 'Wing I · Observatory → Wing II · Condensation Nuclei',
        instrument: 'Laser Nephelometer (PM2.5), UV Photometer (O₃) & Rotorod Trap',
        units: 'US EPA AQI (0–500), μg/m³, and pollen grains/m³',
        mechanism: 'Tracks microscopic solids and droplets (dust, wildfire smoke, sea salt, pollen, sulfate aerosols) suspended in the boundary layer.',
        significance: aq && aq.pm25
          ? `PM2.5 is ${aq.pm25} μg/m³ and surface ozone is ${aq.ozone} μg/m³. These tiny aerosols also act as Cloud Condensation Nuclei (CCN) inside Exhibit 02.`
          : 'Clean air without aerosols makes condensation harder; urban smoke/dust particles seed clouds and scatter sunlight.',
        href: '#clouds',
        cta: 'Test Smoke Nuclei in Exhibit 02 →'
      },
      ephemeris: {
        icon: '🌗',
        title: 'Solar Arc, Day Length & Lunar Cycle',
        reading: d && d.moon ? `${d.moon.name} (${d.moon.illumination}% lit)` : 'Loading astronomical cycle…',
        wing: 'Wing I · Observatory Rotunda',
        instrument: 'Solar Ephemeris Clock & Astronomical Almanac',
        units: 'Local solar clock time & lunar illumination fraction (%)',
        mechanism: 'Earth\'s 23.4° axial tilt governs solar elevation angle and daylight duration — the primary energy engine driving all uneven planetary heating.',
        significance: d && d.sunriseEpoch
          ? `Sunrise ${new Date(d.sunriseEpoch).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · Sunset ${new Date(d.sunsetEpoch).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Higher sun angles concentrate watts per square meter.`
          : 'Seasonal shifts in solar heating create the global pressure belts that spawn storms.',
        href: '#briefing',
        cta: 'Hear Today\'s Forecast in Exhibit 12 →'
      }
    };
    return specs[key] || specs.temperature;
  }

  function renderCharInspector(key) {
    const body = document.getElementById('ww-char-inspector-body');
    if (!body) return;
    activeCharacteristic = key || 'temperature';
    const spec = getCharacteristicSpec(activeCharacteristic);

    document.querySelectorAll('.ww-char-pill').forEach((btn) => {
      const match = btn.dataset.char === activeCharacteristic;
      btn.classList.toggle('is-active', match);
      btn.setAttribute('aria-pressed', String(match));
    });

    document.querySelectorAll('[data-char-card]').forEach((card) => {
      card.classList.toggle('is-inspected', card.dataset.charCard === activeCharacteristic);
    });

    document.querySelectorAll('.ww-stat-inspect-btn[data-char-target]').forEach((btn) => {
      const match = btn.dataset.charTarget === activeCharacteristic;
      btn.classList.toggle('is-active', match);
      btn.setAttribute('aria-pressed', String(match));
      btn.textContent = match ? '● Active' : 'Inspect';
    });

    body.innerHTML = `
      <div class="ww-char-summary">
        <div class="ww-char-title-row">
          <span class="ww-char-icon" aria-hidden="true">${spec.icon}</span>
          <div>
            <span class="ww-char-wing">${spec.wing}</span>
            <h4>${spec.title}</h4>
          </div>
        </div>
        <div class="ww-char-live-badge">
          <small>LIVE READING</small>
          <strong>${spec.reading}</strong>
        </div>
      </div>
      <div class="ww-char-meta-grid">
        <div class="ww-char-meta-item">
          <span class="ww-char-meta-k">Instrument</span>
          <p>${spec.instrument}</p>
        </div>
        <div class="ww-char-meta-item">
          <span class="ww-char-meta-k">Scale &amp; Units</span>
          <p>${spec.units}</p>
        </div>
        <div class="ww-char-meta-item">
          <span class="ww-char-meta-k">Atmospheric Physics</span>
          <p>${spec.mechanism}</p>
        </div>
        <div class="ww-char-meta-item">
          <span class="ww-char-meta-k">Field Diagnosis</span>
          <p>${spec.significance}</p>
          <a class="ww-char-jump" href="${spec.href}">${spec.cta}</a>
        </div>
      </div>
    `;
  }

  function initCharacteristicsInspector() {
    const pills = document.querySelectorAll('.ww-char-pill');
    const inspectBtns = document.querySelectorAll('.ww-stat-inspect-btn');
    if (!pills.length) return;

    pills.forEach((btn) => {
      btn.addEventListener('click', () => {
        renderCharInspector(btn.dataset.char);
      });
    });

    inspectBtns.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const target = btn.dataset.charTarget;
        renderCharInspector(target);
        const guide = document.getElementById('ww-char-inspector');
        if (guide) guide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    document.querySelectorAll('[data-char-card]').forEach((card) => {
      card.addEventListener('click', (event) => {
        if (event.target.closest('button, a, input, select')) return;
        renderCharInspector(card.dataset.charCard);
      });
    });

    els.unitBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextUnit = btn.dataset.unitSystem;
        if (!nextUnit || nextUnit === unitSystem) return;
        unitSystem = nextUnit;
        els.unitBtns.forEach((b) => {
          const active = b.dataset.unitSystem === unitSystem;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        if (currentWeather) renderCockpit(currentWeather);
        renderAirQualityCards();
      });
    });

    renderCharInspector(activeCharacteristic);
  }

  // ── VERTICAL TROPOSPHERE SOUNDING SIMULATOR (EXHIBIT 03) ────────────────────
  function initSoundingLab() {
    const svg = document.getElementById('ww-sounding-svg');
    const aloftEl = document.getElementById('ww-sound-aloft');
    const surfaceEl = document.getElementById('ww-sound-surface');
    const depthEl = document.getElementById('ww-sound-depth');
    const aloftVal = document.getElementById('ww-sound-aloft-val');
    const surfaceVal = document.getElementById('ww-sound-surface-val');
    const depthVal = document.getElementById('ww-sound-depth-val');
    const verdictEl = document.getElementById('ww-sounding-verdict');
    const syncBtn = document.getElementById('ww-sounding-sync');
    const presetBtns = document.querySelectorAll('[data-sounding-preset]');
    if (!svg || !aloftEl || !surfaceEl || !depthEl || !verdictEl) return;

    const PRESETS = {
      rain: { aloft: 44, surface: 48, depth: 1200 },
      freezing_rain: { aloft: 39, surface: 27, depth: 1000 },
      sleet: { aloft: 39, surface: 22, depth: 2800 },
      snow: { aloft: 22, surface: 24, depth: 1800 }
    };

    function classifySounding(aloft, surface, depth) {
      if (aloft <= 32 && surface <= 32) {
        return {
          type: 'snow',
          icon: '❄️',
          label: 'Snow',
          color: '#38bdf8',
          phaseAloft: '❄️',
          phaseMid: '❄️',
          phaseGround: '❄️',
          summary: `Sub-freezing column aloft (${aloft}°F) and at ground (${surface}°F): cloud ice crystals grow into six-sided snowflakes and reach the surface unmelted.`
        };
      }
      if (aloft > 32 && surface <= 32) {
        if (depth < 2000) {
          return {
            type: 'freezing_rain',
            icon: '🧊',
            label: 'Freezing Rain (Glaze)',
            color: '#f472b6',
            phaseAloft: '❄️',
            phaseMid: '💧',
            phaseGround: '🧊',
            summary: `Warm nose (${aloft}°F) melts snow into liquid drops, then a shallow ${depth.toLocaleString()}-ft freezing wedge (${surface}°F at ground) supercools drops so they glaze onto trees, lines, and pavement on impact.`
          };
        }
        return {
          type: 'sleet',
          icon: '⚪',
          label: 'Sleet (Ice Pellets)',
          color: '#c084fc',
          phaseAloft: '❄️',
          phaseMid: '💧',
          phaseGround: '⚪',
          summary: `Warm nose (${aloft}°F) melts falling snow completely, and the deep ${depth.toLocaleString()}-ft freezing wedge (${surface}°F) gives raindrops time to refreeze into bouncing ice pellets before landing.`
        };
      }
      if (aloft <= 32 && surface > 32 && surface <= 35) {
        return {
          type: 'snow',
          icon: '🌨️',
          label: 'Wet Snow / Rain-Snow Mix',
          color: '#7dd3fc',
          phaseAloft: '❄️',
          phaseMid: '❄️',
          phaseGround: '🌨️',
          summary: `Sub-freezing above ground (${aloft}°F at 5,000 ft) with a thin ${surface}°F surface film. Heavy flakes survive down to rooftop height before turning wet.`
        };
      }
      return {
        type: 'rain',
        icon: '🌧️',
        label: 'Liquid Rain',
        color: '#60a5fa',
        phaseAloft: '❄️',
        phaseMid: aloft > 32 ? '💧' : '❄️',
        phaseGround: '💧',
        summary: aloft > 32
          ? `Warm mid-level layer (${aloft}°F) and above-freezing surface (${surface}°F) melt ice crystals completely into falling raindrops.`
          : `Sub-freezing upper column (${aloft}°F), but surface air (${surface}°F) warms snowflakes above 32°F in the boundary layer so they land as rain.`
      };
    }

    function updateSounding() {
      const aloft = parseInt(aloftEl.value, 10);
      const surface = parseInt(surfaceEl.value, 10);
      const depth = parseInt(depthEl.value, 10);

      if (aloftVal) aloftVal.textContent = `${aloft}°F`;
      if (surfaceVal) surfaceVal.textContent = `${surface}°F`;
      if (depthVal) depthVal.textContent = `${depth.toLocaleString()} FT`;

      presetBtns.forEach((btn) => {
        const p = PRESETS[btn.dataset.soundingPreset];
        const exact = p && p.aloft === aloft && p.surface === surface && p.depth === depth;
        btn.classList.toggle('is-active', Boolean(exact));
        btn.setAttribute('aria-pressed', String(Boolean(exact)));
      });

      const res = classifySounding(aloft, surface, depth);
      verdictEl.style.borderColor = res.color;
      verdictEl.innerHTML = `
        <div class="ww-verdict-top">
          <span class="ww-verdict-icon" aria-hidden="true">${res.icon}</span>
          <div>
            <small>PREDICTED SURFACE PRECIPITATION</small>
            <strong style="color:${res.color}">${res.label}</strong>
          </div>
        </div>
        <p>${res.summary}</p>
      `;

      document.querySelectorAll('#precipitation [data-precip-type]').forEach((item) => {
        item.classList.toggle('is-active-precip', item.dataset.precipType === res.type);
      });

      // Plot vertical profile SVG (x: temp 5..60°F -> 52..312, y: alt 0..12000 ft -> 215..28)
      const xForTemp = t => 52 + ((Math.max(5, Math.min(60, t)) - 5) / 55) * 260;
      const yForAlt = ft => 215 - (Math.max(0, Math.min(12000, ft)) / 12000) * 187;
      const x32 = xForTemp(32);

      const cloudTemp = 8;
      const wedgeTopTemp = (aloft > 32 && surface <= 32)
        ? Math.min(31, surface + 3)
        : Math.round(surface + (aloft - surface) * (depth / 5000));

      const pts = [
        { alt: 11500, temp: cloudTemp, label: `${cloudTemp}°F` },
        { alt: 8200, temp: Math.round((cloudTemp + aloft) / 2), label: null },
        { alt: 5000, temp: aloft, label: `${aloft}°F` },
        { alt: depth, temp: wedgeTopTemp, label: `${wedgeTopTemp}°F` },
        { alt: 0, temp: surface, label: `${surface}°F` }
      ];

      const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForTemp(p.temp).toFixed(1)} ${yForAlt(p.alt).toFixed(1)}`).join(' ');
      const yWedge = yForAlt(depth);

      svg.innerHTML = `
        <rect x="52" y="28" width="${(x32 - 52).toFixed(1)}" height="187" fill="rgba(56,189,248,0.08)" />
        <rect x="${x32.toFixed(1)}" y="28" width="${(312 - x32).toFixed(1)}" height="187" fill="rgba(251,146,60,0.08)" />
        ${surface <= 32 && aloft > 32 ? `<rect x="52" y="${yWedge.toFixed(1)}" width="260" height="${(215 - yWedge).toFixed(1)}" fill="rgba(192,132,252,0.12)" />` : ''}
        <line x1="52" y1="${yWedge.toFixed(1)}" x2="312" y2="${yWedge.toFixed(1)}" stroke="rgba(148,163,184,0.35)" stroke-dasharray="3 3" />
        <text x="56" y="${(yWedge - 4).toFixed(1)}" fill="#94a3b8" font-size="9" font-family="monospace">Cold wedge top (${depth.toLocaleString()} ft)</text>
        <line x1="${x32.toFixed(1)}" y1="22" x2="${x32.toFixed(1)}" y2="220" stroke="#7dd3fc" stroke-width="1.5" stroke-dasharray="4 3" />
        <text x="${(x32 + 4).toFixed(1)}" y="21" fill="#7dd3fc" font-size="10" font-weight="700">32°F FREEZE LINE</text>
        <text x="48" y="34" fill="#94a3b8" font-size="9" text-anchor="end">12k ft</text>
        <text x="48" y="${yForAlt(5000).toFixed(1)}" fill="#94a3b8" font-size="9" text-anchor="end">5k ft</text>
        <text x="48" y="216" fill="#94a3b8" font-size="9" text-anchor="end">0 ft</text>
        <text x="58" y="236" fill="#7dd3fc" font-size="9">COLD (&lt;32°F)</text>
        <text x="308" y="236" fill="#fb923c" font-size="9" text-anchor="end">WARM (&gt;32°F)</text>
        <line x1="52" y1="215" x2="312" y2="215" stroke="rgba(255,255,255,0.28)" />
        <line x1="52" y1="28" x2="52" y2="215" stroke="rgba(255,255,255,0.28)" />
        <path d="${pathD}" fill="none" stroke="${res.color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
        ${pts.map(p => {
          const cx = xForTemp(p.temp).toFixed(1);
          const cy = yForAlt(p.alt).toFixed(1);
          return `<circle cx="${cx}" cy="${cy}" r="4.2" fill="${res.color}" stroke="#071529" stroke-width="1.5" />` +
            (p.label ? `<text x="${(Number(cx) + 7).toFixed(1)}" y="${(Number(cy) + 3).toFixed(1)}" fill="#f8fafc" font-size="10" font-weight="700">${p.label}</text>` : '');
        }).join('')}
        <text x="335" y="46" font-size="16" text-anchor="middle">${res.phaseAloft}</text>
        <text x="335" y="${yForAlt(5000).toFixed(1)}" font-size="16" text-anchor="middle">${res.phaseMid}</text>
        <text x="335" y="212" font-size="16" text-anchor="middle">${res.phaseGround}</text>
      `;
    }

    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = PRESETS[btn.dataset.soundingPreset];
        if (!p) return;
        aloftEl.value = p.aloft;
        surfaceEl.value = p.surface;
        depthEl.value = p.depth;
        updateSounding();
      });
    });

    [aloftEl, surfaceEl, depthEl].forEach((el) => el.addEventListener('input', updateSounding));

    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        if (!currentWeather) return;
        const clampedSurface = Math.max(10, Math.min(55, Math.round(currentWeather.temperature)));
        surfaceEl.value = clampedSurface;
        if (currentWeather.temperature <= 32) {
          aloftEl.value = Math.min(55, Math.max(15, Math.round(currentWeather.temperature + 4)));
        } else {
          aloftEl.value = Math.min(55, Math.max(15, Math.round(currentWeather.temperature - 5)));
        }
        updateSounding();
        if (currentWeather.temperature > 55) {
          verdictEl.insertAdjacentHTML('beforeend', `<p class="ww-sounding-sync-note">Station is currently ${currentWeather.temperature}°F (clamped to simulator's 55°F ceiling — surface precipitation is liquid rain).</p>`);
        }
      });
    }

    updateSounding();
  }

  // ── AIR MASS & PRESSURE EXPLORER (EXHIBIT 04) ─────────────────────────────
  function initAirMassExplorer() {
    const detail = document.getElementById('ww-airmass-detail');
    const btns = document.querySelectorAll('[data-airmass]');
    if (!detail || !btns.length) return;

    const MASSES = {
      cP: {
        badge: 'cP · CONTINENTAL POLAR',
        color: '#60a5fa',
        title: 'Continental Polar Air Mass (Cold & Dry)',
        source: 'Central Canada & interior subarctic plains',
        signature: 'Low specific humidity, low dew point (often 10°F–35°F), high barometric density.',
        weather: 'Crisp blue skies, deep nighttime radiational cooling, and sharp gusty cold fronts when surging south; spawns lake-effect snow over unfrozen Great Lakes.',
        frontRole: 'Advances south as the dense cold wedge in the cold-front simulator below, underrunning warm mT air.'
      },
      cA: {
        badge: 'cA · CONTINENTAL ARCTIC',
        color: '#a5f3fc',
        title: 'Continental Arctic Air Mass (Extreme Cold & Bone-Dry)',
        source: 'Snow- and ice-covered Arctic Basin & northern Siberia',
        signature: 'Sub-zero °F temperatures, single-digit/negative dew points, very dense shallow surface dome.',
        weather: 'Dangerous wind chills, frozen pipes, ice fog over open water, and high surface pressure readings exceeding 1030–1045 hPa.',
        frontRole: 'Its shallow, extra-dense wedge routinely forms the surface cold pocket responsible for Exhibit 03 freezing rain & sleet.'
      },
      mP: {
        badge: 'mP · MARITIME POLAR',
        color: '#7ee7c8',
        title: 'Maritime Polar Air Mass (Cool & Damp)',
        source: 'North Pacific & North Atlantic Oceans',
        signature: 'Cool temperatures (35°F–55°F) with high relative humidity and raw overcast decks.',
        weather: 'Persistent coastal stratus, drizzle, mountain snowstorms along the Pacific Northwest, and chilly Nor\'easter onshore winds in New England.',
        frontRole: 'Supplies cool marine moisture behind coastal low-pressure centers and feeds cool wedges east of the Appalachians.'
      },
      mT: {
        badge: 'mT · MARITIME TROPICAL',
        color: '#fbbf24',
        title: 'Maritime Tropical Air Mass (Warm, Buoyant & Moisture-Loaded)',
        source: 'Gulf of Mexico, Caribbean Sea & subtropical Atlantic/Pacific',
        signature: 'Warm air (75°F–95°F+) paired with oppressive dew points (65°F–78°F+) and massive latent heat energy.',
        weather: 'Primary fuel for afternoon sea-breeze thunderstorms, tornado-producing supercells, torrential flooding rain, and tropical cyclones.',
        frontRole: 'Light and buoyant — forced upward rapidly by advancing cP cold fronts or lifted gently over mP wedges along warm fronts.'
      },
      cT: {
        badge: 'cT · CONTINENTAL TROPICAL',
        color: '#f97316',
        title: 'Continental Tropical Air Mass (Hot & Arid)',
        source: 'Mexican Plateau & arid U.S. Southwest desert basins',
        signature: 'Extreme heat (95°F–115°F+), very low relative humidity (< 20%), very high LCL cloud bases (> 10,000 ft).',
        weather: 'Blistering clear skies, extreme UV, rapid evaporation, wildfire danger, and drylines where desert air collides with humid Gulf mT air.',
        frontRole: 'Creates the sharp dryline boundary across the Southern Plains and forms an elevated warm layer (CIN "cap") over adjacent plains.'
      },
      pressure_coriolis: {
        badge: '⚖️ PRESSURE GRADIENTS & CORIOLIS SPIN',
        color: '#c084fc',
        title: 'High vs. Low Pressure & Earth\'s Rotation',
        source: 'Planetary thermal contrasts & conservation of angular momentum',
        signature: 'High (Anticyclone): sinking air compresses, warms, clears skies, and diverges clockwise (N. Hemisphere). Low (Cyclone): converging air rises, cools to its dew point, and spins counterclockwise.',
        weather: 'Steeper spacing between isobars produces a stronger Pressure Gradient Force and higher sustained winds.',
        frontRole: 'Low-pressure cyclones knit cold and warm fronts together into comma-shaped mid-latitude storm systems.'
      }
    };

    function renderMass(id) {
      const m = MASSES[id] || MASSES.cP;
      btns.forEach((b) => {
        const active = b.dataset.airmass === id;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      const localComp = currentWeather
        ? `Compared to ${currentWeather.location.label} right now (${currentWeather.temperature}°F, dew point ${currentWeather.dewPoint}°F, ${currentWeather.pressure.hPa} hPa).`
        : 'Select any global station in the top search bar to compare live conditions.';

      detail.innerHTML = `
        <div class="ww-airmass-card" style="border-top-color:${m.color}">
          <div class="ww-airmass-card-head">
            <span class="ww-airmass-badge" style="color:${m.color}; border-color:${m.color}">${m.badge}</span>
            <h4>${m.title}</h4>
          </div>
          <div class="ww-char-meta-grid">
            <div class="ww-char-meta-item"><span class="ww-char-meta-k">Source Region</span><p>${m.source}</p></div>
            <div class="ww-char-meta-item"><span class="ww-char-meta-k">Physical Signature</span><p>${m.signature}</p></div>
            <div class="ww-char-meta-item"><span class="ww-char-meta-k">Signature Weather</span><p>${m.weather}</p></div>
            <div class="ww-char-meta-item"><span class="ww-char-meta-k">Front &amp; Station Context</span><p>${m.frontRole} <em>${localComp}</em></p></div>
          </div>
        </div>
      `;
    }

    btns.forEach((btn) => {
      btn.addEventListener('click', () => renderMass(btn.dataset.airmass));
    });
    renderMass('cP');
  }

  // ── MUSEUM FLOOR PLAN & WING SCROLL-SPY NAVIGATION ──────────────────────────
  function initMuseumNavigation() {
    const exhibits = Array.from(document.querySelectorAll('section.ww-card[data-wing]'));
    const wingLabelEl = document.getElementById('ww-museum-active-wing');
    const floorLinks = Array.from(document.querySelectorAll('.ww-museum-nav a[data-wing]'));
    const sideLinks = Array.from(document.querySelectorAll('.ww-sidebar-nav a.ww-sidebar-link'));
    const scrollBox = document.querySelector('.ll-sim');
    if (!exhibits.length) return;

    const WING_NAMES = {
      '1': 'Wing I · Observatory Rotunda',
      '2': 'Wing II · Hall of Water & Sky',
      '3': 'Wing III · Hall of Air in Motion',
      '4': 'Wing IV · Radar & Severe Weather Command',
      '5': 'Wing V · Human Impact & Broadcast Studio'
    };

    let currentActiveId = '';
    let rafPending = false;
    let lockedTargetId = '';
    let lockExpiresAt = 0;

    function setActiveExhibit(id, wing) {
      if (!id || id === currentActiveId) return;
      currentActiveId = id;
      if (wingLabelEl && WING_NAMES[wing]) {
        wingLabelEl.textContent = WING_NAMES[wing];
      }
      floorLinks.forEach((a) => {
        a.classList.toggle('ll-step-active', a.getAttribute('href') === `#${id}`);
      });
      sideLinks.forEach((a) => {
        a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`);
      });
    }

    function detectActiveExhibit() {
      rafPending = false;
      const boxTop = scrollBox ? scrollBox.getBoundingClientRect().top : 0;
      const triggerY = boxTop + 140;
      let chosen = exhibits[0];
      for (const sec of exhibits) {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= triggerY) {
          chosen = sec;
        } else {
          break;
        }
      }
      if (chosen) {
        if (lockedTargetId && Date.now() < lockExpiresAt) {
          if (chosen.id === lockedTargetId) {
            lockedTargetId = '';
            lockExpiresAt = 0;
          } else {
            return;
          }
        }
        setActiveExhibit(chosen.id, chosen.dataset.wing || '1');
      }
    }

    function requestUpdate() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(detectActiveExhibit);
    }

    if (scrollBox) scrollBox.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('scroll', requestUpdate, { passive: true });

    document.addEventListener('click', (event) => {
      const link = event.target.closest('.ww-museum-nav a[data-wing], .ww-sidebar-nav a.ww-sidebar-link, .ww-trail-btn, .ww-char-jump, .ww-hero-shortcuts a');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#')) {
        const target = document.getElementById(href.slice(1));
        const exhibit = target ? target.closest('section.ww-card[data-wing]') : null;
        if (exhibit && exhibit.dataset && exhibit.dataset.wing) {
          lockedTargetId = exhibit.id;
          lockExpiresAt = Date.now() + 800;
          setActiveExhibit(exhibit.id, exhibit.dataset.wing);
        }
        setTimeout(() => {
          lockedTargetId = '';
          requestUpdate();
        }, 820);
      }
    });

    detectActiveExhibit();

    const initialHash = window.location.hash.slice(1);
    if (initialHash === 'cockpit' || initialHash === 'cockpit-title') {
      setActiveExhibit('observatory', '1');
    }
  }

  // ── INTERACTIVE QUIZ CONTROLLER (EXHIBIT 13 CERTIFICATION) ────────────────
  function initQuiz() {
    const quizContainers = document.querySelectorAll('.ww-quiz-card');
    const scoreEl = document.getElementById('ww-quiz-score');
    const rankEl = document.getElementById('ww-quiz-rank');
    const resetBtn = document.getElementById('ww-quiz-reset');
    const total = quizContainers.length;
    const answers = new Map();

    function updateScoreboard() {
      const answered = answers.size;
      let correctCount = 0;
      answers.forEach(ok => { if (ok) correctCount += 1; });

      if (scoreEl) {
        scoreEl.textContent = answered === 0
          ? `0 / ${total} Answered`
          : `${answered} / ${total} Answered · ${correctCount} Correct`;
      }
      if (rankEl) {
        if (answered < total) {
          rankEl.textContent = answered === 0 ? 'Rank: Field Visitor' : `In Progress · ${correctCount}/${answered} accurate`;
        } else if (correctCount >= 9) {
          rankEl.textContent = '🏅 Rank: Chief Meteorologist';
        } else if (correctCount >= 7) {
          rankEl.textContent = '🎖️ Rank: Senior Forecaster';
        } else if (correctCount >= 5) {
          rankEl.textContent = '🧭 Rank: Field Observer';
        } else {
          rankEl.textContent = '📘 Rank: Weather Apprentice';
        }
      }
    }

    quizContainers.forEach((card, qIdx) => {
      const opts = card.querySelectorAll('.ww-quiz-opt');
      const feedback = card.querySelector('.ww-quiz-feedback');
      const correctIdx = parseInt(card.dataset.correct, 10);

      opts.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          opts.forEach(b => b.disabled = true);
          const isRight = idx === correctIdx;
          answers.set(qIdx, isRight);
          if (isRight) {
            btn.classList.add('is-correct');
            if (feedback) {
              feedback.className = 'ww-quiz-feedback correct is-visible';
              feedback.innerHTML = `<strong>Correct!</strong> ${card.dataset.explanation || 'Great scientific deduction.'}`;
            }
          } else {
            btn.classList.add('is-incorrect');
            if (opts[correctIdx]) opts[correctIdx].classList.add('is-correct');
            if (feedback) {
              feedback.className = 'ww-quiz-feedback incorrect is-visible';
              feedback.innerHTML = `<strong>Not quite.</strong> ${card.dataset.explanation || 'Review the atmospheric physics section above.'}`;
            }
          }
          updateScoreboard();
        });
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        answers.clear();
        quizContainers.forEach((card) => {
          const opts = card.querySelectorAll('.ww-quiz-opt');
          const feedback = card.querySelector('.ww-quiz-feedback');
          opts.forEach((b) => {
            b.disabled = false;
            b.classList.remove('is-correct', 'is-incorrect');
          });
          if (feedback) {
            feedback.className = 'ww-quiz-feedback';
            feedback.textContent = '';
          }
        });
        updateScoreboard();
      });
    }

    updateScoreboard();
  }

  // ── MAP GESTURES + PUBLIC BRIDGE ────────────────────────────────────────────
  function setZoom(z) {
    radarZoom = Math.max(RADAR_MIN_ZOOM, Math.min(RADAR_MAX_ZOOM, Math.round(z)));
    redrawMap();
  }

  function setMapCenter(lat, lon, zoom) {
    mapCenter = { latitude: lat, longitude: lon };
    if (zoom != null) radarZoom = Math.max(RADAR_MIN_ZOOM, Math.min(RADAR_MAX_ZOOM, Math.round(zoom)));
    redrawMap();
  }

  /** Centre on the middle of a set of points and use the largest zoom at which they all fit. */
  function fitPoints(points) {
    const pts = points.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (!pts.length || !els.radarMap) return;
    const lats = pts.map(p => p.lat), lons = pts.map(p => p.lon);
    const mid = { latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lons) + Math.max(...lons)) / 2 };
    const rect = els.radarMap.getBoundingClientRect();
    let zoom = RADAR_MIN_ZOOM;
    for (let z = RADAR_MAX_ZOOM; z >= RADAR_MIN_ZOOM; z -= 1) {
      const xs = pts.map(p => lonToTileX(p.lon, z) * 256), ys = pts.map(p => latToTileY(p.lat, z) * 256);
      if (Math.max(...xs) - Math.min(...xs) <= rect.width * 0.8 && Math.max(...ys) - Math.min(...ys) <= rect.height * 0.8) { zoom = z; break; }
    }
    setMapCenter(mid.latitude, mid.longitude, zoom);
  }

  function setupMapGestures() {
    const map = els.radarMap;
    if (!map || !els.mapPane) return;
    let drag = null;
    map.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('.ww-map-zoom, .ww-map-credit')) return;
      drag = { x: event.clientX, y: event.clientY, moved: false, id: event.pointerId };
      map.setPointerCapture(event.pointerId);
    });
    map.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      map.classList.add('is-dragging');
      els.mapPane.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const finish = event => {
      if (!drag || event.pointerId !== drag.id) return;
      const rect = map.getBoundingClientRect();
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      const wasDrag = drag.moved;
      drag = null;
      map.classList.remove('is-dragging');
      if (wasDrag && event.type === 'pointerup') {
        const c = unproject(rect.width / 2 - dx, rect.height / 2 - dy);
        mapCenter = { latitude: c.lat, longitude: c.lon };
        redrawMap();
      } else if (!wasDrag && event.type === 'pointerup') {
        const p = unproject(event.clientX - rect.left, event.clientY - rect.top);
        window.dispatchEvent(new CustomEvent('ww:probe', { detail: { lat: p.lat, lon: p.lon } }));
      } else {
        els.mapPane.style.transform = '';
      }
    };
    map.addEventListener('pointerup', finish);
    map.addEventListener('pointercancel', finish);
    map.addEventListener('keydown', event => {
      const step = 80, rect = map.getBoundingClientRect();
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[event.key]) {
        event.preventDefault();
        const c = unproject(rect.width / 2 + moves[event.key][0], rect.height / 2 + moves[event.key][1]);
        mapCenter = { latitude: c.lat, longitude: c.lon };
        redrawMap();
      } else if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom(radarZoom + 1); }
      else if (event.key === '-') { event.preventDefault(); setZoom(radarZoom - 1); }
      else if (event.key === '0' || event.key === 'Home') { event.preventDefault(); mapCenter = null; redrawMap(); }
    });
    window.addEventListener('resize', () => redrawMap());
  }

  window.WWMap = {
    project, unproject, setZoom, setCenter: setMapCenter, fitPoints, redraw: redrawMap,
    get zoom() { return radarZoom; },
    get rect() { return els.radarMap.getBoundingClientRect(); },
    get location() { return activeLocation; },
    get weather() { return currentWeather; },
    get layersHost() { return document.getElementById('ww-layers'); },
    refreshLightning: emitLightning
  };

  // ── EVENT LISTENERS ─────────────────────────────────────────────────────────
  function setupEventListeners() {
    // Preset buttons
    els.presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        els.presetChips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        const locId = chip.dataset.loc;
        const loc = window.WeatherEngine.PRESET_LOCATIONS.find(l => l.id === locId);
        if (loc) loadWeather(loc);
      });
    });

    // Geolocation button
    if (els.geoBtn) {
      els.geoBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          alert('Geolocation not supported in this browser.');
          return;
        }
        els.geoBtn.textContent = 'Locating...';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            els.geoBtn.textContent = '📍 My Area';
            loadWeather({
              label: 'My Local Area',
              stationId: `GPS_${Math.round(pos.coords.latitude * 10)}_${Math.round(pos.coords.longitude * 10)}`,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            });
          },
          () => {
            els.geoBtn.textContent = '📍 My Location';
            alert('Location access was denied or timed out.');
          }
        );
      });
    }

    // City Search
    let searchTimer = null;
    if (els.searchInput && els.searchResults) {
      els.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const query = els.searchInput.value.trim();
        if (query.length < 2) {
          els.searchResults.classList.remove('is-open');
          return;
        }
        searchTimer = setTimeout(async () => {
          const results = await window.WeatherEngine.searchLocations(query);
          if (results.length) {
            els.searchResults.innerHTML = results.map((r, i) => `
              <button class="ww-search-item" type="button" data-idx="${i}">
                ${r.label}
              </button>
            `).join('');
            els.searchResults.classList.add('is-open');

            els.searchResults.querySelectorAll('.ww-search-item').forEach((item, idx) => {
              item.addEventListener('click', () => {
                loadWeather(results[idx]);
                els.searchResults.classList.remove('is-open');
                els.searchInput.value = results[idx].label;
              });
            });
          } else {
            els.searchResults.classList.remove('is-open');
          }
        }, 350);
      });

      document.addEventListener('click', (e) => {
        if (!els.searchResults.contains(e.target) && e.target !== els.searchInput) {
          els.searchResults.classList.remove('is-open');
        }
      });
    }

    // Driving speed slider
    if (els.speedSlider) {
      els.speedSlider.addEventListener('input', () => {
        drivingSpeed = parseInt(els.speedSlider.value, 10);
        if (els.speedVal) els.speedVal.textContent = `${drivingSpeed} MPH`;
        if (currentWeather) renderDriving(currentWeather);
      });
    }

    // Wardrobe Sandbox sliders
    if (els.sandTemp) els.sandTemp.addEventListener('input', updateWardrobeSandbox);
    if (els.sandRain) els.sandRain.addEventListener('change', updateWardrobeSandbox);
    if (els.sandWind) els.sandWind.addEventListener('change', updateWardrobeSandbox);

    // LCL Cloud Base sliders
    if (els.lclTemp) els.lclTemp.addEventListener('input', updateLclCalc);
    if (els.lclDew) els.lclDew.addEventListener('input', updateLclCalc);

    if (els.stormRefresh) els.stormRefresh.addEventListener('click', () => loadStormWatch(activeLocation));
    if (els.zoomIn) els.zoomIn.addEventListener('click', () => setZoom(radarZoom + 1));
    if (els.zoomOut) els.zoomOut.addEventListener('click', () => setZoom(radarZoom - 1));
    if (els.recenter) els.recenter.addEventListener('click', () => { mapCenter = null; redrawMap(); });
    setupMapGestures();
    if (els.radarPlay) els.radarPlay.addEventListener('click', toggleRadarAnimation);
    if (els.radarSlider) els.radarSlider.addEventListener('input', event => { stopRadarAnimation(); setRadarFrame(event.target.value); });
  }

  // ── INIT ────────────────────────────────────────────────────────────────────
  function init() {
    setupEventListeners();
    initCharacteristicsInspector();
    initSoundingLab();
    initAirMassExplorer();
    initFrontSimulator();
    initCloudLab();
    initQuiz();
    initMuseumNavigation();
    updateWardrobeSandbox();
    updateLclCalc();
    loadWeather(activeLocation);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
