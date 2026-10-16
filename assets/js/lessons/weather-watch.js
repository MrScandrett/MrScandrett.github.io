/**
 * weather-watch.js — Interactive Controller for Central Weather Watch Lesson
 * Mr. Scandrett's ClassroomOS
 */
(function () {
  'use strict';

  let currentWeather = null;
  let activeLocation = window.WeatherEngine.DEFAULT_LOCATION;
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

    // Cockpit
    dialCity: document.getElementById('ww-dial-city'),
    dialStation: document.getElementById('ww-dial-station'),
    dialTemp: document.getElementById('ww-dial-temp'),
    dialIcon: document.getElementById('ww-dial-icon'),
    dialCondition: document.getElementById('ww-dial-condition'),
    dialFeels: document.getElementById('ww-dial-feels'),
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
    statVisibility: document.getElementById('ww-stat-visibility'),
    statPollen: document.getElementById('ww-stat-pollen'),
    statPollenSub: document.getElementById('ww-stat-pollen-sub'),
    statAqi: document.getElementById('ww-stat-aqi'),
    statAqiSub: document.getElementById('ww-stat-aqi-sub'),

    // Hourly & Daily
    hourlyStrip: document.getElementById('ww-hourly-strip'),
    dailyGrid: document.getElementById('ww-daily-grid'),

    // Solar & Lunar
    sunriseTime: document.getElementById('ww-sunrise-time'),
    sunsetTime: document.getElementById('ww-sunset-time'),
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
    activeLocation = location;
    mapCenter = null;
    window.dispatchEvent(new CustomEvent('ww:location', { detail: { location } }));
    try {
      if (els.dialCondition) els.dialCondition.textContent = 'Updating atmospheric readings...';
      const data = await window.WeatherEngine.fetchWeather(location);
      currentWeather = data;
      window.dispatchEvent(new CustomEvent('ww:weather', { detail: { weather: data, location } }));
      renderCockpit(data);
      renderDriving(data);
      renderWardrobe(data);
      renderSidebar(data);
      loadStormWatch(location);
      loadAirQuality(location);
    } catch (err) {
      console.error('Weather load error:', err);
      if (els.dialCondition) els.dialCondition.textContent = 'Weather feed temporarily unavailable';
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
      els.statAqi.textContent = Number.isFinite(aqi) ? `${Math.round(aqi)} · ${aqiLabel(aqi)}` : 'Unavailable';
      els.statAqiSub.textContent = Number.isFinite(Number(current.pm2_5)) ? `PM2.5 ${Number(current.pm2_5).toFixed(1)} μg/m³ · O₃ ${Math.round(Number(current.ozone) || 0)} μg/m³` : 'No current pollutant reading';
      const pollen = pollenSummary(data.hourly);
      els.statPollen.textContent = pollen.value;
      els.statPollenSub.textContent = pollen.sub;
    } catch (err) {
      console.warn('Air quality load error:', err);
      els.statAqi.textContent = 'Unavailable';
      els.statAqiSub.textContent = 'Air-quality feed unavailable';
      els.statPollen.textContent = 'Unavailable';
      els.statPollenSub.textContent = 'No regional pollen forecast';
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
    return { value: category, sub: `Peak forecast ${Math.round(peak)} grains/m³` };
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

  // ── RENDER COCKPIT ──────────────────────────────────────────────────────────
  function renderCockpit(data) {
    if (!els.dialCity) return;

    els.dialCity.textContent = data.location.label;
    els.dialStation.textContent = data.location.stationId;
    els.dialTemp.textContent = `${data.temperature}°`;
    els.dialIcon.textContent = data.icon;
    els.dialCondition.textContent = data.condition;
    els.dialFeels.textContent = `FEELS LIKE ${data.feelsLike}° · ${data.dewComfort.category.toUpperCase()}`;
    els.dialLo.textContent = `${data.min}°`;
    els.dialHi.textContent = `${data.max}°`;

    // Telemetry
    els.statDew.textContent = `${data.dewPoint}°F`;
    els.statDewSub.textContent = data.dewComfort.category;

    els.statCloudBase.textContent = `${data.cloudBase.feet.toLocaleString()} FT`;
    els.statCloudBaseSub.textContent = `~${data.cloudBase.meters.toLocaleString()} m altitude`;

    els.statWind.textContent = `${data.wind} MPH ${data.windCompass.short}`;
    els.statWindSub.textContent = `Gusts: ${data.windGusts} MPH · Beaufort: ${data.beaufort.name}`;

    els.statPressure.textContent = `${data.pressure.inHg} inHg`;
    els.statPressureSub.textContent = `${data.pressure.hPa} hPa · ${data.pressure.system}`;

    els.statUV.textContent = `${data.uvIndex} ${data.uvInfo.category}`;
    els.statUVSub.textContent = `Burn: ${data.uvInfo.burnTime}`;

    els.statHumidity.textContent = `${data.humidity}%`;
    els.statVisibility.textContent = `${data.visibilityMiles} MI`;

    // Hourly 24-hr strip
    if (els.hourlyStrip && data.hourly) {
      els.hourlyStrip.innerHTML = data.hourly.map((h, i) => `
        <div class="ww-hourly-slot${i === 0 ? ' is-now' : ''}">
          <span class="ww-hourly-time">${i === 0 ? 'Now' : h.timeLabel}</span>
          <span class="ww-hourly-icon" aria-hidden="true">${h.icon}</span>
          <span class="ww-hourly-temp">${h.temp}°</span>
          <span class="ww-hourly-pop">${h.precipProb > 0 ? `${h.precipProb}%` : ''}</span>
        </div>
      `).join('');
    }

    // 7-day daily forecast
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
          <span class="ww-daily-lo">${d.min}°</span>
          <span class="ww-daily-bar" aria-hidden="true"><span class="ww-daily-fill" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background-size:${(10000 / width).toFixed(0)}% 100%;background-position:${pos.toFixed(1)}% 0"></span></span>
          <span class="ww-daily-hi">${d.max}°</span>
        </div>`;
      }).join('');
    }

    // Ephemeris (Sun & Moon)
    if (data.sunriseEpoch && data.sunsetEpoch) {
      const rise = new Date(data.sunriseEpoch).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const set = new Date(data.sunsetEpoch).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      els.sunriseTime.textContent = rise;
      els.sunsetTime.textContent = set;

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

    if (coldBtn && warmBtn) {
      coldBtn.addEventListener('click', () => {
        frontType = 'cold';
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
      t += 0.02;

      ctx.clearRect(0, 0, w, h);

      // Sky background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0a192f');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

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
          window.CloudEngine.renderCloudCluster(ctx, w * 0.47, h - 160, 160, 140, { storm: true, darkBase: true, time: t });
          // Glaciated anvil top blown downwind
          window.CloudEngine.renderCloudCluster(ctx, w * 0.53, h - 225, 220, 70, { storm: false, darkBase: false, time: t * 0.7 });
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
          const rx = w * 0.40 + (i * 7);
          const ry = (h - 110) + ((t * 200 + i * 15) % 85);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + 12);
          ctx.stroke();
        }

        // Labels
        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.fillStyle = '#60a5fa';
        ctx.fillText('COLD AIR MASS (Dense)', 20, h - 60);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('WARM AIR MASS (Moist)', w - 180, h - 60);
        ctx.fillStyle = '#fff';
        ctx.fillText('↑ Rapid Convection (Squall)', w * 0.36, h - 90);

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
          window.CloudEngine.renderCloudCluster(ctx, w * 0.80, 52, 130, 34, { storm: false, darkBase: false, time: t * 0.5 });
          // Altostratus (middle layer)
          window.CloudEngine.renderCloudCluster(ctx, w * 0.48, h - 175, 175, 48, { storm: false, darkBase: true, time: t * 0.4 });
          // Nimbostratus (low steady rain layer)
          window.CloudEngine.renderCloudCluster(ctx, w * 0.18, h - 125, 190, 65, { storm: true, darkBase: true, time: t * 0.3 });
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

        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.fillStyle = '#60a5fa';
        ctx.fillText('RETREATING COLD AIR', w - 180, h - 40);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('WARM AIR OVERRIDING', 20, 60);
      }

      animFrame = requestAnimationFrame(draw);
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
      showLCL: true,
      showAltitudeGuide: true,
      onLCLChange: (feet) => {
        const noteLcl = document.getElementById('ww-cloud-note-lcl');
        if (noteLcl) noteLcl.textContent = `${feet.toLocaleString()} FT`;
      }
    });

    const chips = document.querySelectorAll('.ww-cloud-chip');
    const noteEl = document.getElementById('ww-cloud-lab-note');
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

  // ── INTERACTIVE QUIZ CONTROLLER ─────────────────────────────────────────────
  function initQuiz() {
    const quizContainers = document.querySelectorAll('.ww-quiz-card');
    quizContainers.forEach((card) => {
      const opts = card.querySelectorAll('.ww-quiz-opt');
      const feedback = card.querySelector('.ww-quiz-feedback');
      const correctIdx = parseInt(card.dataset.correct, 10);

      opts.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          opts.forEach(b => b.disabled = true);
          if (idx === correctIdx) {
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
        });
      });
    });
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
    initFrontSimulator();
    initCloudLab();
    initQuiz();
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
