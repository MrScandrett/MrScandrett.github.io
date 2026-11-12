/* Local broadcast screens. Uses the same OSM / RainViewer Web Mercator tiles as
   Weather Watch. Forecast markers are real point samples, not an invented raster. */
(function () {
  'use strict';
  const root = document.getElementById('home-live-sky');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const map = $('ls-local-map'), slider = $('ls-map-slider');
  const zoom = 7, world = 256 * 2 ** zoom;
  let location = null, view = 'overview', radar = null, forecast = null, timer = null, generation = 0, controller, ready = false;
  const time = seconds => new Date(seconds * 1000).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  const xy = (lat, lon) => ({ x: (lon + 180) / 360 * world, y: (1 - Math.asinh(Math.tan(Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180)) / Math.PI) / 2 * world });
  const point = (x, y) => ({ longitude: ((x / world * 360 + 180) % 360 + 360) % 360 - 180, latitude: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / world))) * 180 / Math.PI });
  function stop() { clearInterval(timer); timer = null; $('ls-map-play').textContent = 'Play'; $('ls-map-play').setAttribute('aria-pressed', 'false'); }
  async function json(url, signal) { const response = await fetch(url, { signal }); if (!response.ok) throw new Error('Weather feed unavailable'); return response.json(); }
  function clearMap() { map.querySelector('.ls-map-tiles').replaceChildren(); map.querySelector('.ls-map-values').replaceChildren(); $('ls-map-time').textContent = ''; }
  function draw() {
    if (!ready || !location || view === 'overview' || !map.clientWidth) return;
    const center = xy(location.latitude, location.longitude), w = map.clientWidth, h = map.clientHeight;
    const frame = view === 'radar' && radar ? radar.frames[Number(slider.value)] : null;
    const tiles = document.createDocumentFragment(); let failed = false;
    for (let x = Math.floor((center.x - w / 2) / 256); x <= Math.floor((center.x + w / 2) / 256); x++) {
      for (let y = Math.floor((center.y - h / 2) / 256); y <= Math.floor((center.y + h / 2) / 256); y++) {
        if (y < 0 || y >= 2 ** zoom) continue;
        const wrapX = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
        const sources = [`https://tile.openstreetmap.org/${zoom}/${wrapX}/${y}.png`];
        if (frame) sources.push(`${radar.host}${frame.path}/256/${zoom}/${wrapX}/${y}/2/1_1.png`);
        sources.forEach((src, layer) => {
          const img = document.createElement('img'); img.alt = ''; img.draggable = false; img.src = src;
          img.style.cssText = `left:${x * 256 - center.x + w / 2}px;top:${y * 256 - center.y + h / 2}px;z-index:${layer}`;
          img.onerror = () => { if (img.isConnected && !failed) { failed = true; $('ls-map-status').textContent = 'Some map tiles could not load. Missing radar tiles do not mean dry weather.'; } };
          tiles.append(img);
        });
      }
    }
    map.querySelector('.ls-map-tiles').replaceChildren(tiles);
    const values = map.querySelector('.ls-map-values'); values.replaceChildren();
    if (frame) $('ls-map-time').textContent = time(frame.time);
    if (view !== 'radar' && forecast) {
      const index = Number(slider.value), field = view === 'dew' ? 'dew_point_2m' : 'temperature_2m';
      $('ls-map-time').textContent = time(forecast[4].hourly.time[index]);
      forecast.forEach((row, i) => {
        const value = row.hourly[field][index], label = document.createElement('span');
        label.className = 'ls-map-reading'; label.style.left = `calc(50% + ${(i % 3 - 1) * 90}px)`; label.style.top = `calc(50% + ${(Math.floor(i / 3) - 1) * 80}px)`;
        const name = ['NW', 'N', 'NE', 'W', 'Selected spot', 'E', 'SW', 'S', 'SE'][i];
        label.textContent = value == null ? '—' : `${Math.round(value)}°`;
        const caption = document.createElement('small'); caption.textContent = name; label.append(caption);
        label.style.setProperty('--sample-color', value == null ? '#364152' : view === 'dew' ? value >= 70 ? '#126651' : value >= 60 ? '#637123' : '#245681' : value >= 85 ? '#9e3426' : value >= 65 ? '#7a5c13' : '#245681');
        values.append(label);
      });
    }
    slider.setAttribute('aria-valuetext', $('ls-map-time').textContent);
    const readings = Array.from(values.children, label => label.textContent).join('; ');
    map.setAttribute('aria-label', `${$('ls-map-title').textContent} near ${location.label || 'selected location'}, ${$('ls-map-time').textContent}. ${readings || 'Observed precipitation overlay; see intensity legend below.'}`);
  }
  async function load(force = false) {
    stop();
    if (view === 'overview') return;
    ready = false; clearMap(); slider.disabled = true; $('ls-map-play').disabled = true;
    if (!location) { $('ls-map-status').textContent = 'Choose a location with “Use my location” above to load local maps.'; return; }
    controller?.abort(); controller = new AbortController(); const signal = controller.signal, request = ++generation, requestedView = view;
    $('ls-map-status').textContent = 'Loading local weather…';
    try {
      if (view === 'radar') {
        if (force || !radar) {
          const data = await json('https://api.rainviewer.com/public/weather-maps.json', signal);
          const frames = data.radar?.past;
          if (!frames?.length || !/^https:\/\//.test(data.host)) throw new Error('No radar frames');
          radar = { host: data.host, frames };
        }
      } else if (force || !forecast) {
        const center = xy(location.latitude, location.longitude);
        const points = Array.from({ length: 9 }, (_, i) => point(center.x + (i % 3 - 1) * 90, center.y + (Math.floor(i / 3) - 1) * 80));
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.search = new URLSearchParams({ latitude: points.map(p => p.latitude.toFixed(4)).join(','), longitude: points.map(p => p.longitude.toFixed(4)).join(','), hourly: 'temperature_2m,dew_point_2m', temperature_unit: 'fahrenheit', timeformat: 'unixtime', forecast_hours: '25' });
        const data = await json(url, signal);
        if (!Array.isArray(data) || data.length !== 9 || data.some(row => !row.hourly?.time?.length || !Array.isArray(row.hourly.temperature_2m) || !Array.isArray(row.hourly.dew_point_2m))) throw new Error('No local forecast');
        forecast = data;
      }
      if (request !== generation || view !== requestedView) return;
      slider.max = String(view === 'radar' ? radar.frames.length - 1 : forecast[4].hourly.time.length - 1);
      slider.value = view === 'radar' ? slider.max : '0'; slider.disabled = false; $('ls-map-play').disabled = false;
      $('ls-map-status').textContent = view === 'radar' ? 'Observed radar · past 2 hours. Coverage varies; radar is not a warning.' : 'Hourly forecast · next 24 hours · °F at nine local sample points. Colors describe each point, not the whole region.';
      ready = true; draw();
    } catch (error) {
      if (signal.aborted || request !== generation) return;
      clearMap(); $('ls-map-status').textContent = 'Weather map unavailable. Try Refresh, or return to Overview.';
    }
  }
  root.querySelectorAll('[data-sky-view]').forEach(button => button.addEventListener('click', () => {
    stop(); ready = false; controller?.abort(); ++generation;
    view = button.dataset.skyView;
    root.querySelectorAll('[data-sky-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('ls-overview').hidden = view !== 'overview'; $('ls-map-screen').hidden = view === 'overview';
    $('ls-map-title').textContent = { radar: 'Local radar', dew: 'Future dew points', temperature: 'Future temperatures', overview: '' }[view];
    $('ls-map-legend').textContent = view === 'radar' ? 'Rain intensity: green → yellow → red / pink. Radar may lag.' : view === 'dew' ? 'Dew point: blue <60° · olive 60–69° · green 70°+ (muggy)' : 'Temperature: blue <65° · gold 65–84° · red 85°+';
    load();
  }));
  slider.addEventListener('input', () => { stop(); draw(); });
  $('ls-map-refresh').addEventListener('click', () => load(true));
  $('ls-map-play').addEventListener('click', () => {
    if (timer) { stop(); return; }
    $('ls-map-play').textContent = 'Pause'; $('ls-map-play').setAttribute('aria-pressed', 'true');
    timer = setInterval(() => { if (document.hidden || !map.getClientRects().length) { stop(); return; } slider.value = String((Number(slider.value) + 1) % (Number(slider.max) + 1)); draw(); }, 900);
  });
  document.addEventListener('home-weather:location', event => {
    const loc = event.detail;
    if (!loc || loc.latitude == null || loc.longitude == null || !Number.isFinite(Number(loc.latitude)) || !Number.isFinite(Number(loc.longitude)) || Math.abs(Number(loc.latitude)) > 90 || Math.abs(Number(loc.longitude)) > 180) return;
    stop(); ready = false; controller?.abort(); ++generation;
    location = { latitude: Number(loc.latitude), longitude: Number(loc.longitude), label: loc.label }; forecast = null; radar = null; clearMap();
    if (view !== 'overview') load();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  new ResizeObserver(() => { if (map.clientWidth) draw(); else stop(); }).observe(map);
  if (window.__homeWeatherLocation) document.dispatchEvent(new CustomEvent('home-weather:location', { detail: window.__homeWeatherLocation }));
})();
