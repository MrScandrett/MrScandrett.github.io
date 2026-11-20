// The pin-on-a-world-map piece of Daily Artifact Guesser (and the loader Daily GeoGuess shares).
// Natural Earth land + d3-geo equirectangular map, tap or arrow-key to drop a pin, zoom to 8x.
// Styling is the `.dp-geo-*` rules in daily-puzzles.css, so wrap it in `.dp-geo`.

export const WIDTH = 720;
export const HEIGHT = 360;
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
const NUMBER = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function validPoint(point) {
  return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
    && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
}

export function formatPoint([lon, lat]) {
  const degree = (value, positive, negative) => `${NUMBER.format(Math.abs(value))}°${value === 0 ? '' : value > 0 ? positive : negative}`;
  return `${degree(lat, 'N', 'S')}, ${degree(lon, 'E', 'W')}`;
}

export function svg(tag, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function loadScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(path, import.meta.url);
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(new Error('The world map could not load.'));
    };
    document.head.append(script);
  });
}

let geography;
export function loadGeography() {
  if (!geography) {
    geography = (async () => {
      if (!globalThis.d3?.geoPath) await loadScript('../vendor/d3-geo-runtime.min.js');
      if (!globalThis.EarthEngine) await loadScript('./earth-engine.js');
      return globalThis.EarthEngine.load();
    })().catch((error) => {
      geography = null;
      throw error;
    });
  }
  return geography;
}

/**
 * createGuessMap({ el, label, helpId, guess, onGuess, onReady })
 *   board  - the element to mount (map + loading text + retry button)
 *   tools  - zoom buttons, to mount beside the heading
 *   show(focus) - starts loading the map the first time; safe to call again
 *   getGuess() / setGuess(point)
 *   reveal(point) - lock the map, draw the true location and a dashed line from the guess
 *   focus(), isReady()
 * `onGuess(point)` fires on every new pin; `onReady()` once the map has drawn.
 */
export function createGuessMap({ el, label, helpId, guess = null, onGuess = () => {}, onReady = () => {} }) {
  let current = validPoint(guess) ? guess : null;
  let target = null;
  let zoom = 1;
  let viewX = 0;
  let viewY = 0;
  let projection = null;
  let loadingMap = false;

  const map = svg('svg', {
    class: 'dp-geo-map', viewBox: `0 0 ${WIDTH} ${HEIGHT}`, tabindex: '0', role: 'group',
    'aria-label': label, 'aria-describedby': helpId, hidden: ''
  });
  const graticule = svg('path', { class: 'dp-geo-grid' });
  const land = svg('path', { class: 'dp-geo-land' });
  const route = svg('path', { class: 'dp-geo-route' });
  const actual = svg('g', { class: 'dp-geo-actual', hidden: '' });
  actual.append(svg('circle', { r: 8 }), svg('circle', { r: 2.5, class: 'dp-geo-center' }));
  const pin = svg('g', { class: 'dp-geo-pin', hidden: '' });
  pin.append(svg('path', { d: 'M0 0C-3-4-9-9-9-14a9 9 0 0 1 18 0C9-9 3-4 0 0Z' }), svg('circle', { cy: -14, r: 2.75 }));
  map.append(graticule, land, route, actual, pin);

  const loading = el('div', { class: 'dp-geo-loading', role: 'status', text: 'Loading world map…' });
  const retry = el('button', { class: 'dp-btn', type: 'button', text: 'Retry map', hidden: true });
  const zoomOut = el('button', { class: 'dp-btn', type: 'button', 'aria-label': 'Zoom out of world map', text: '−', disabled: true });
  const zoomIn = el('button', { class: 'dp-btn', type: 'button', 'aria-label': 'Zoom into world map', text: '+', disabled: true });
  const reset = el('button', { class: 'dp-btn', type: 'button', text: 'Whole world', disabled: true });
  const board = el('div', { class: 'dp-geo-board' }, map, loading, retry);
  const tools = el('div', { class: 'dp-geo-tools', role: 'group', 'aria-label': 'Map zoom' }, zoomOut, zoomIn, reset);

  const center = () => [viewX + WIDTH / (2 * zoom), viewY + HEIGHT / (2 * zoom)];

  function placeMarker(marker, point) {
    const [x, y] = projection(point);
    marker.setAttribute('transform', `translate(${x} ${y}) scale(${1 / zoom})`);
    marker.removeAttribute('hidden');
  }

  function refresh() {
    zoomOut.disabled = !projection || zoom === 1;
    zoomIn.disabled = !projection || zoom === 8;
    reset.disabled = !projection || zoom === 1;
    if (!projection) return;
    if (current) placeMarker(pin, current);
    if (target) placeMarker(actual, target);
  }

  function drawRoute() {
    const earth = globalThis.EarthEngine;
    route.setAttribute('d', earth.path(projection, { type: 'LineString', coordinates: [current, target] }));
  }

  function setView(level, point) {
    zoom = level;
    const width = WIDTH / zoom;
    const height = HEIGHT / zoom;
    viewX = clamp(point[0] - width / 2, 0, WIDTH - width);
    viewY = clamp(point[1] - height / 2, 0, HEIGHT - height);
    map.setAttribute('viewBox', `${viewX} ${viewY} ${width} ${height}`);
    refresh();
  }

  function place(point) {
    if (target || !validPoint(point)) return;
    current = point;
    refresh();
    onGuess(point);
  }

  async function show(focus) {
    if (projection || loadingMap) return;
    loadingMap = true;
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
      loading.hidden = true;
      map.removeAttribute('hidden');
      if (target && current) drawRoute();
      refresh();
      onReady();
      if (focus) map.focus({ preventScroll: true });
    } catch {
      loading.textContent = 'The world map could not load.';
      retry.hidden = false;
    } finally {
      loadingMap = false;
    }
  }

  retry.addEventListener('click', () => show(true));
  const zoomAroundPin = (level) => setView(level, current ? projection(current) : center());
  zoomIn.addEventListener('click', () => zoomAroundPin(zoom * 2));
  zoomOut.addEventListener('click', () => zoomAroundPin(zoom / 2));
  reset.addEventListener('click', () => setView(1, [WIDTH / 2, HEIGHT / 2]));

  map.addEventListener('click', (event) => {
    if (target || !projection) return;
    const matrix = map.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const [lon, lat] = projection.invert([point.x, point.y]);
    place([clamp(lon, -180, 180), clamp(lat, -90, 90)]);
  });
  map.addEventListener('keydown', (event) => {
    const direction = ARROWS[event.key];
    if (!direction || target || !projection) return;
    event.preventDefault();
    const [lon, lat] = current || projection.invert(center());
    const step = (event.shiftKey ? 1 : 10) / zoom;
    place([clamp(lon + direction[0] * step, -180, 180), clamp(lat + direction[1] * step, -90, 90)]);
    if (zoom > 1) setView(zoom, projection(current));
  });

  return {
    board, tools,
    show,
    getGuess: () => current,
    setGuess(point) { if (validPoint(point)) { current = point; if (projection) refresh(); } },
    isReady: () => Boolean(projection),
    focus: () => (projection ? map : retry.hidden ? board : retry).focus?.({ preventScroll: true }),
    reveal(point) {
      target = point;
      if (projection) {
        if (current) drawRoute();
        setView(1, [WIDTH / 2, HEIGHT / 2]);
      }
    }
  };
}
