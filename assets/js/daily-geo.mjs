import { parseDayKey } from './daily-puzzles-core.mjs';
import { locations } from './daily-geo-locations.mjs';
import { svg, loadGeography, formatPoint, validPoint, clamp } from './daily-guess-map.mjs';

const WIDTH = 720;
const HEIGHT = 360;
const DAY_MS = 86400000;
const FIRST_DAY = Date.UTC(2026, 10, 17);
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
const DISTANCE = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, style: 'unit', unit: 'kilometer' });

export function locationForDay(key) {
  const date = parseDayKey(key);
  const days = (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - FIRST_DAY) / DAY_MS;
  return locations[((days % locations.length) + locations.length) % locations.length];
}

export function buildDailyGeo(panel, key, saved, persist, onChange, el) {
  const location = locationForDay(key);
  const progress = saved.geo;
  let guess = progress?.location === location.name && validPoint(progress.guess) ? progress.guess : null;
  let done = Boolean(guess && progress.done);
  let zoom = 1;
  let viewX = 0;
  let viewY = 0;
  let projection;
  let routeDraw;
  let mapLoading = false;

  const panorama = el('div', { class: 'dp-geo-panorama' });
  const status = el('p', { class: 'dp-geo-status', role: 'status' });
  const loading = el('div', { class: 'dp-geo-loading', role: 'status', text: 'Loading world map…' });
  const submit = el('button', { class: 'dp-btn dp-btn--primary dp-geo-submit', type: 'button', text: 'Submit guess', disabled: true });
  const back = el('button', { class: 'dp-btn', type: 'button', text: 'Back to Street View' });
  const next = el('button', { class: 'dp-btn dp-btn--primary dp-geo-next', type: 'button', text: 'Place your pin' });
  const zoomOut = el('button', { class: 'dp-btn', type: 'button', 'aria-label': 'Zoom out of world map', text: '−', disabled: true });
  const zoomIn = el('button', { class: 'dp-btn', type: 'button', 'aria-label': 'Zoom into world map', text: '+', disabled: true });
  const reset = el('button', { class: 'dp-btn', type: 'button', text: 'Whole world', disabled: true });
  const retry = el('button', { class: 'dp-btn', type: 'button', text: 'Retry map', hidden: true });

  const map = svg('svg', {
    class: 'dp-geo-map', viewBox: `0 0 ${WIDTH} ${HEIGHT}`, tabindex: '0', role: 'group',
    'aria-label': 'World map', 'aria-describedby': 'dp-geo-help', hidden: ''
  });
  const graticule = svg('path', { class: 'dp-geo-grid' });
  const land = svg('path', { class: 'dp-geo-land' });
  const route = svg('path', { class: 'dp-geo-route' });
  const actual = svg('g', { class: 'dp-geo-actual', hidden: '' });
  actual.append(svg('circle', { r: 8 }), svg('circle', { r: 2.5, class: 'dp-geo-center' }));
  const pin = svg('g', { class: 'dp-geo-pin', hidden: '' });
  pin.append(svg('path', { d: 'M0 0C-3-4-9-9-9-14a9 9 0 0 1 18 0C9-9 3-4 0 0Z' }),
    svg('circle', { cy: -14, r: 2.75 }));
  map.append(graticule, land, route, actual, pin);

  const explore = el('section', { class: 'dp-geo-step', 'aria-labelledby': 'dp-geo-explore' },
    el('div', { class: 'dp-geo-heading' },
      el('div', {}, el('h4', { id: 'dp-geo-explore', text: 'Where in the world?' }),
        el('p', { text: 'Look around for clues in Google Street View.' })),
      next),
    panorama,
    el('details', { class: 'dp-geo-clue' },
      el('summary', { text: 'Read a clue' }),
      el('p', { text: location.clue })));
  const guessStep = el('section', { class: 'dp-geo-step', 'aria-labelledby': 'dp-geo-guess' },
    el('div', { class: 'dp-geo-heading' },
      el('div', {}, el('h4', { id: 'dp-geo-guess', text: 'Pin your guess' }),
        el('p', { id: 'dp-geo-help', text: 'Tap the map or use the arrow keys. Hold Shift for smaller steps.' })),
      el('div', { class: 'dp-geo-tools', role: 'group', 'aria-label': 'Map zoom' }, zoomOut, zoomIn, reset)),
    el('div', { class: 'dp-geo-board' }, map, loading, retry),
    el('div', { class: 'dp-geo-caption' }, status, el('small', { text: 'Natural Earth 5.1.2 · 1:50 million' })),
    el('div', { class: 'dp-geo-actions' }, back, submit));
  panel.replaceChildren(el('div', { class: 'dp-geo' }, explore, guessStep));

  function placeMarker(marker, point) {
    const [x, y] = projection(point);
    marker.setAttribute('transform', `translate(${x} ${y}) scale(${1 / zoom})`);
    marker.removeAttribute('hidden');
  }

  function refresh() {
    submit.disabled = !guess || !projection || done;
    submit.hidden = done;
    zoomOut.disabled = !projection || zoom === 1;
    zoomIn.disabled = !projection || zoom === 8;
    reset.disabled = !projection || zoom === 1;
    if (projection) {
      if (guess) placeMarker(pin, guess);
      if (done) placeMarker(actual, location.point);
    }
    if (done) {
      const distance = globalThis.d3.geoDistance(guess, location.point) * 6371.0088;
      status.textContent = `${location.name} · ${DISTANCE.format(distance)} away. Pin: your guess. Circle: the location.`;
    } else {
      status.textContent = guess ? `Your pin is at ${formatPoint(guess)}.` : 'Choose a spot on the map.';
    }
  }

  function setView(level, center) {
    zoom = level;
    const width = WIDTH / zoom;
    const height = HEIGHT / zoom;
    viewX = clamp(center[0] - width / 2, 0, WIDTH - width);
    viewY = clamp(center[1] - height / 2, 0, HEIGHT - height);
    map.setAttribute('viewBox', `${viewX} ${viewY} ${width} ${height}`);
    refresh();
  }

  function updateGuess(point) {
    if (!validPoint(point)) return;
    guess = point;
    saved.geo = { location: location.name, guess, done };
    persist();
    refresh();
  }

  function showPanorama(focus) {
    guessStep.hidden = true;
    explore.hidden = false;
    panorama.replaceChildren(el('iframe', {
      src: location.src, title: 'Google Street View mystery location',
      allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin'
    }));
    if (focus) next.focus({ preventScroll: true });
  }

  async function showMap(focus) {
    // Keep Google's panorama and the Natural Earth map on separate screens.
    explore.hidden = true;
    panorama.replaceChildren();
    guessStep.hidden = false;
    if (focus) (projection ? map : back).focus({ preventScroll: true });
    if (projection || mapLoading) return;
    mapLoading = true;
    loading.hidden = false;
    loading.textContent = 'Loading world map…';
    retry.hidden = true;
    try {
      const { land: geometry } = await loadGeography();
      if (!map.isConnected) return;
      const earth = globalThis.EarthEngine;
      projection = earth.projection('equirectangular', { extent: [[0, 0], [WIDTH, HEIGHT]] });
      land.setAttribute('d', earth.path(projection, geometry));
      graticule.setAttribute('d', earth.path(projection, globalThis.d3.geoGraticule().step([30, 30])()));
      routeDraw = () => {
        route.setAttribute('d', earth.path(projection, { type: 'LineString', coordinates: [guess, location.point] }));
      };
      if (done) routeDraw();
      loading.hidden = true;
      map.removeAttribute('hidden');
      refresh();
      if (focus && !guessStep.hidden && document.activeElement === back) map.focus({ preventScroll: true });
    } catch {
      loading.textContent = 'The world map could not load.';
      retry.hidden = false;
    } finally {
      mapLoading = false;
    }
  }

  next.addEventListener('click', () => showMap(true));
  back.addEventListener('click', () => showPanorama(true));
  retry.addEventListener('click', async () => {
    back.focus({ preventScroll: true });
    await showMap(true);
  });
  function zoomAroundPin(level) {
    const center = guess ? projection(guess) : [viewX + WIDTH / (2 * zoom), viewY + HEIGHT / (2 * zoom)];
    setView(level, center);
  }
  zoomIn.addEventListener('click', () => zoomAroundPin(zoom * 2));
  zoomOut.addEventListener('click', () => zoomAroundPin(zoom / 2));
  reset.addEventListener('click', () => setView(1, [WIDTH / 2, HEIGHT / 2]));

  map.addEventListener('click', (event) => {
    if (done || !projection) return;
    const matrix = map.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const [lon, lat] = projection.invert([point.x, point.y]);
    updateGuess([clamp(lon, -180, 180), clamp(lat, -90, 90)]);
  });
  map.addEventListener('keydown', (event) => {
    const direction = ARROWS[event.key];
    if (!direction || done || !projection) return;
    event.preventDefault();
    const [lon, lat] = guess || projection.invert([viewX + WIDTH / (2 * zoom), viewY + HEIGHT / (2 * zoom)]);
    const step = (event.shiftKey ? 1 : 10) / zoom;
    updateGuess([clamp(lon + direction[0] * step, -180, 180), clamp(lat + direction[1] * step, -90, 90)]);
    if (zoom > 1) setView(zoom, projection(guess));
  });
  submit.addEventListener('click', () => {
    if (!guess || done || !projection) return;
    done = true;
    updateGuess(guess);
    next.textContent = 'See your result';
    routeDraw();
    setView(1, [WIDTH / 2, HEIGHT / 2]);
    map.focus({ preventScroll: true });
    onChange();
  });

  if (done) {
    next.textContent = 'See your result';
    explore.hidden = true;
    showMap(false);
  } else {
    showPanorama(false);
  }
}
