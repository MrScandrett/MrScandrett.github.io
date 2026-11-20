// Daily Artifact Guesser: the "Artifact" tab of the home-page daily puzzles.
// Inspect a mystery artifact (a Sketchfab 3D model or a photograph you can zoom), pin where it was
// made on the world map, then say what year. Scored out of 10,000: 5,000 for place, 5,000 for date.
import {
  artifactForDay, distanceKm, roundScore, tierFor, formatYear, formatYearDiff, parseYear, yearFromRuler, rulerFromYear,
  yearStep, niceYear, RULER_TICKS, MAX_POINTS, CLUE_PENALTY
} from './daily-artifact-core.mjs';
import { createGuessMap, validPoint, formatPoint, clamp } from './daily-guess-map.mjs';

const KM = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const POINTS = new Intl.NumberFormat('en-US');
const RULER_STEPS = 1000;

let bank;
export function loadArtifactBank() {
  if (!bank) {
    bank = fetch(new URL('../../data/daily-artifact-bank.json', import.meta.url))
      .then((r) => { if (!r.ok) throw new Error('bank'); return r.json(); })
      .then((json) => json.artifacts)
      .catch((error) => { bank = null; throw error; });
  }
  return bank;
}

// ── the photograph inspector ─────────────────────────────────────────────
// Drag to pan, buttons / + − 0 keys / double-click / pinch to zoom. Plain wheel still scrolls the page.
function imageViewer(el, src) {
  const img = el('img', { class: 'dp-art-img', alt: 'A photograph of the mystery artifact', draggable: 'false', decoding: 'async' });
  const failed = el('p', { class: 'dp-art-imgfail', role: 'status', hidden: true, text: 'This photograph could not load. Check your connection and switch views, or try again later.' });
  img.addEventListener('error', () => { failed.hidden = false; });
  img.src = new URL(`../../${src}`, import.meta.url).href;
  const stage = el('div', {
    class: 'dp-art-stage', tabindex: '0', role: 'group', 'data-night-keep': '', 'data-skin-keep': '',
    'aria-label': 'Photograph of the artifact. Drag to move, use the buttons or the plus and minus keys to zoom, zero to reset.'
  }, img, failed);
  const zoomOut = el('button', { class: 'dp-btn', type: 'button', 'aria-label': 'Zoom out of photograph', text: '−', disabled: true });
  const zoomIn = el('button', { class: 'dp-btn', type: 'button', 'aria-label': 'Zoom into photograph', text: '+' });
  const reset = el('button', { class: 'dp-btn', type: 'button', text: 'Reset', disabled: true });
  const tools = el('div', { class: 'dp-geo-tools', role: 'group', 'aria-label': 'Photograph zoom' }, zoomOut, zoomIn, reset);
  const MAX = 6;
  let scale = 1;
  let x = 0;
  let y = 0;

  function apply() {
    const mx = ((scale - 1) * stage.clientWidth) / 2;
    const my = ((scale - 1) * stage.clientHeight) / 2;
    x = clamp(x, -mx, mx);
    y = clamp(y, -my, my);
    img.style.transform = scale === 1 ? '' : `translate(${x}px, ${y}px) scale(${scale})`;
    stage.classList.toggle('is-zoomed', scale > 1);
    zoomOut.disabled = scale === 1;
    reset.disabled = scale === 1;
    zoomIn.disabled = scale === MAX;
  }
  // (qx, qy) is the point to hold still, in pixels from the stage's centre.
  function zoomAt(next, qx = 0, qy = 0) {
    next = clamp(next, 1, MAX);
    const ratio = next / scale;
    x = qx - (qx - x) * ratio;
    y = qy - (qy - y) * ratio;
    scale = next;
    apply();
  }
  const fromCenter = (event) => {
    const box = stage.getBoundingClientRect();
    return [event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2)];
  };

  zoomIn.addEventListener('click', () => zoomAt(scale * 1.6));
  zoomOut.addEventListener('click', () => zoomAt(scale / 1.6));
  reset.addEventListener('click', () => { x = 0; y = 0; zoomAt(1); });
  stage.addEventListener('dblclick', (event) => (scale > 1 ? zoomAt(1) : zoomAt(2.5, ...fromCenter(event))));
  stage.addEventListener('wheel', (event) => {
    if (!event.ctrlKey && !event.metaKey) return; // a plain wheel keeps scrolling the page
    event.preventDefault();
    zoomAt(scale * Math.exp(-event.deltaY * 0.01), ...fromCenter(event));
  }, { passive: false });

  const pointers = new Map();
  let pinch = null;
  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture?.(event.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale };
    }
  });
  stage.addEventListener('pointermove', (event) => {
    const last = pointers.get(event.pointerId);
    if (!last) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1 && scale > 1) {
      x += event.clientX - last.x;
      y += event.clientY - last.y;
      apply();
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const box = stage.getBoundingClientRect();
      zoomAt(pinch.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.dist),
        (a.x + b.x) / 2 - (box.left + box.width / 2), (a.y + b.y) / 2 - (box.top + box.height / 2));
    }
  });
  const lift = (event) => { pointers.delete(event.pointerId); if (pointers.size < 2) pinch = null; };
  stage.addEventListener('pointerup', lift);
  stage.addEventListener('pointercancel', lift);
  stage.addEventListener('keydown', (event) => {
    const pan = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[event.key];
    if (event.key === '+' || event.key === '=') zoomAt(scale * 1.4);
    else if (event.key === '-' || event.key === '_') zoomAt(scale / 1.4);
    else if (event.key === '0') { x = 0; y = 0; zoomAt(1); }
    else if (pan && scale > 1) { x += pan[0]; y += pan[1]; apply(); }
    else return;
    event.preventDefault();
  });
  return { stage, tools };
}

function modelViewer(el, id) {
  const src = `https://sketchfab.com/models/${id}/embed?autospin=0.3&autostart=1&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_annotations=0&ui_hint=0`;
  const frame = el('iframe', {
    class: 'dp-art-frame', src, title: 'The mystery artifact as a 3D model. Drag to turn it, scroll or pinch to zoom.',
    allow: 'autoplay; fullscreen; xr-spatial-tracking', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin'
  });
  return { stage: el('div', { class: 'dp-art-stage dp-art-stage--3d', 'data-night-keep': '', 'data-skin-keep': '' }, frame), tools: null };
}

// ── the tab ──────────────────────────────────────────────────────────────
export function buildDailyArtifact(panel, key, artifacts, saved, persist, onChange, el) {
  const artifact = artifactForDay(key, artifacts);
  const progress = saved.artifact?.id === artifact.id ? saved.artifact : null;
  const state = {
    guess: validPoint(progress?.guess) ? progress.guess : null,
    year: Number.isInteger(progress?.year) ? progress.year : null,
    clue: Boolean(progress?.clue),
    done: Boolean(progress?.done && validPoint(progress.guess) && Number.isInteger(progress.year)),
    view: artifact.sketchfab ? '3d' : '2d'
  };
  const save = () => {
    saved.artifact = { id: artifact.id, guess: state.guess, year: state.year, clue: state.clue, done: state.done };
    persist();
  };

  // — step 1: inspect —
  const viewer = el('div', { class: 'dp-art-viewer' });
  const toolbar = el('div', { class: 'dp-art-toolbar' });
  const next = el('button', { class: 'dp-btn dp-btn--primary dp-geo-next', type: 'button', text: state.done ? 'See your result' : 'Make your guess' });
  const clue = el('details', { class: 'dp-geo-clue' },
    el('summary', { text: `Read a clue (−${CLUE_PENALTY * 100}% of your score)` }),
    el('p', { text: artifact.clue }));
  clue.open = state.clue;
  clue.addEventListener('toggle', () => {
    if (clue.open && !state.clue) { state.clue = true; save(); }
  });
  const viewTabs = artifact.sketchfab && artifact.image
    ? ['3d', '2d'].map((view) => {
      const button = el('button', { class: 'dp-btn', type: 'button', 'data-view': view, text: view === '3d' ? 'Spin it in 3D' : 'Study the photo' });
      button.addEventListener('click', () => { state.view = view; showViewer(); });
      return button;
    })
    : [];
  const explore = el('section', { class: 'dp-geo-step', 'aria-labelledby': 'dp-art-explore' },
    el('div', { class: 'dp-geo-heading' },
      el('div', {}, el('h4', { id: 'dp-art-explore', text: 'What is it, and where is it from?' }),
        el('p', { text: 'Turn it, zoom in and look for clues. Then guess the place and the year.' })),
      next),
    viewTabs.length ? el('div', { class: 'dp-art-views', role: 'group', 'aria-label': 'How to look at it' }, ...viewTabs) : null,
    viewer, toolbar, clue);

  // — step 2: guess —
  const status = el('p', { class: 'dp-geo-status', role: 'status' });
  const map = createGuessMap({
    el, label: 'World map. Pin where the artifact was made.', helpId: 'dp-art-help', guess: state.guess,
    onGuess(point) { state.guess = point; save(); refresh(); },
    onReady() { if (state.done) map.reveal(artifact.point); refresh(); }
  });
  const yearOut = el('output', { class: 'dp-art-yearout', for: 'dp-art-ruler' });
  const ruler = el('input', {
    id: 'dp-art-ruler', class: 'dp-art-ruler', type: 'range', min: 0, max: RULER_STEPS, step: 1, value: Math.round(rulerFromYear(1000) * RULER_STEPS),
    'aria-label': 'Year, from three million years ago to today', 'aria-describedby': 'dp-art-yearhelp'
  });
  const ticks = el('div', { class: 'dp-art-ticks', 'aria-hidden': 'true' }, ...RULER_TICKS.map(([year, label]) => {
    const p = rulerFromYear(year);
    // the minor ticks drop out on phones, where six labels would collide
    const tick = el('span', { class: [p > 0.93 ? 'is-end' : p < 0.1 ? 'is-start' : '', year === -10000 || year === 1000 ? 'is-minor' : ''].join(' ').trim(), text: label });
    tick.style.setProperty('--x', `${p * 100}%`);
    return tick;
  }));
  const yearText = el('input', { class: 'dp-art-yearinput', type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'Type a year', placeholder: 'or type it', size: 10 });
  const era = el('select', { class: 'dp-art-era', 'aria-label': 'BCE or CE' },
    el('option', { value: 'BCE', text: 'BCE' }), el('option', { value: 'CE', text: 'CE' }));
  era.value = 'CE';
  const submit = el('button', { class: 'dp-btn dp-btn--primary dp-geo-submit', type: 'button', text: 'Submit guess', disabled: true });
  const back = el('button', { class: 'dp-btn', type: 'button', text: 'Back to the artifact' });
  const result = el('div', { class: 'dp-art-result', hidden: true });

  const yearCard = el('div', { class: 'dp-art-year' },
    el('div', { class: 'dp-art-yearhead' },
      el('label', { for: 'dp-art-ruler', text: 'When was it made?' }), yearOut),
    ruler, ticks,
    el('div', { class: 'dp-art-yearfield' }, yearText, era),
    el('p', { id: 'dp-art-yearhelp', class: 'dp-art-yearhelp', text: 'Drag the ruler, press ← → to nudge it (Shift for bigger steps), or type a year. The ruler stretches: the Ice Age on the left, recent centuries on the right.' }));

  const guessStep = el('section', { class: 'dp-geo-step', 'aria-labelledby': 'dp-art-guess', hidden: true },
    el('div', { class: 'dp-geo-heading' },
      el('div', {}, el('h4', { id: 'dp-art-guess', text: state.done ? 'Your result' : 'Pin it and date it' }),
        el('p', { id: 'dp-art-help', text: 'Tap the map or use the arrow keys to place your pin. Hold Shift for smaller steps.' })),
      map.tools),
    map.board,
    el('div', { class: 'dp-geo-caption' }, status, el('small', { text: 'Natural Earth 5.1.2 · 1:50 million' })),
    yearCard, result,
    el('div', { class: 'dp-geo-actions' }, back, submit));

  panel.replaceChildren(el('div', { class: 'dp-geo dp-art' }, explore, guessStep));

  // — viewer —
  function showViewer() {
    const made = state.view === '3d' ? modelViewer(el, artifact.sketchfab) : imageViewer(el, artifact.image);
    viewer.replaceChildren(made.stage);
    toolbar.replaceChildren(...(made.tools ? [made.tools] : []));
    toolbar.hidden = !made.tools;
    for (const button of viewTabs) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
  }

  // — year controls —
  function showYear() {
    yearOut.textContent = state.year == null ? 'Choose a year' : formatYear(state.year);
    ruler.setAttribute('aria-valuetext', state.year == null ? 'No year chosen yet' : formatYear(state.year));
    ruler.classList.toggle('is-unset', state.year == null);
  }
  function setYear(year, from) {
    state.year = year;
    if (from !== 'ruler') ruler.value = Math.round(rulerFromYear(year) * RULER_STEPS);
    if (from !== 'text') {
      yearText.value = String(Math.abs(year));
      era.value = year < 0 ? 'BCE' : 'CE';
    }
    yearText.removeAttribute('aria-invalid');
    save();
    showYear();
    refresh();
  }
  ruler.addEventListener('input', () => setYear(yearFromRuler(Number(ruler.value) / RULER_STEPS), 'ruler'));
  ruler.addEventListener('keydown', (event) => {
    const direction = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];
    if (!direction || state.done) return;
    event.preventDefault();
    const from = state.year ?? yearFromRuler(Number(ruler.value) / RULER_STEPS);
    setYear(niceYear(from + direction * yearStep(from) * (event.shiftKey ? 10 : 1)));
  });
  function readText() {
    if (!yearText.value.trim()) { yearText.removeAttribute('aria-invalid'); return; }
    const year = parseYear(yearText.value, era.value);
    if (year == null) { yearText.setAttribute('aria-invalid', 'true'); return; }
    setYear(year, 'text');
  }
  yearText.addEventListener('input', readText);
  era.addEventListener('change', readText);
  if (state.year != null) {
    yearText.value = String(Math.abs(state.year));
    era.value = state.year < 0 ? 'BCE' : 'CE';
    ruler.value = Math.round(rulerFromYear(state.year) * RULER_STEPS);
  }

  // — status, result —
  function refresh() {
    for (const control of [ruler, yearText, era]) control.disabled = state.done;
    submit.hidden = state.done;
    submit.disabled = state.done || !state.guess || state.year == null || !map.isReady();
    clue.classList.toggle('is-used', state.clue);
    if (state.done) return;
    if (!state.guess) status.textContent = 'Choose a spot on the map.';
    else if (state.year == null) status.textContent = `Your pin is at ${formatPoint(state.guess)}. Now pick a year.`;
    else status.textContent = `${formatPoint(state.guess)} · ${formatYear(state.year)}. Ready to submit.`;
  }

  function creditLink(credit) {
    const link = el('a', { href: credit.url, target: '_blank', rel: 'noopener', text: credit.text });
    return link;
  }

  function showResult(focus) {
    const km = distanceKm(state.guess, artifact.point);
    const score = roundScore({ km, guessYear: state.year, actualYear: artifact.year, clue: state.clue });
    const bar = (label, detail, points) => {
      const fill = el('i');
      fill.style.setProperty('--w', `${(points / MAX_POINTS) * 100}%`);
      return el('div', { class: 'dp-art-score' },
        el('div', { class: 'dp-art-scorehead' }, el('strong', { text: label }), el('span', { text: `${POINTS.format(points)} / ${POINTS.format(MAX_POINTS)}` })),
        el('div', { class: 'dp-art-bar', 'aria-hidden': 'true' }, fill),
        el('small', { text: detail }));
    };
    const credits = [artifact.sketchfab ? artifact.credit3d : null, artifact.image ? artifact.credit2d : null].filter(Boolean);
    const title = el('h4', { class: 'dp-art-reveal', tabindex: '-1', text: artifact.name });
    result.replaceChildren(
      title,
      el('p', { class: 'dp-art-where' }, `Made in ${artifact.place} · ${artifact.dateLabel}`),
      bar('Place', `${KM.format(km)} km from where it was made`, score.location),
      bar('Date', `You said ${formatYear(state.year)}; ${formatYearDiff(state.year - artifact.year)}`, score.year),
      score.penalty ? el('p', { class: 'dp-art-penalty', text: `Clue used: −${POINTS.format(score.penalty)}` }) : null,
      el('p', { class: 'dp-art-total' },
        el('strong', { text: POINTS.format(score.total) }), el('span', { text: ` / ${POINTS.format(MAX_POINTS * 2)} · ${tierFor(score.total)}` })),
      el('p', { class: 'dp-art-blurb', text: artifact.blurb }),
      el('a', { class: 'dp-art-lesson', href: artifact.lesson.href, text: `Learn more in ${artifact.lesson.label} →` }),
      el('small', { class: 'dp-art-credit', 'data-no-glossary': '' }, 'Credit: ', ...credits.flatMap((c, i) => (i ? [' · ', creditLink(c)] : [creditLink(c)]))));
    result.hidden = false;
    status.textContent = `${artifact.name} · ${KM.format(km)} km away · ${formatYearDiff(state.year - artifact.year)}. Pin: your guess. Circle: where it was made.`;
    if (focus) title.focus({ preventScroll: false });
  }

  // — steps —
  function showExplore(focus) {
    guessStep.hidden = true;
    explore.hidden = false;
    showViewer();
    if (focus) next.focus({ preventScroll: true });
  }
  function showGuess(focus) {
    explore.hidden = true;
    viewer.replaceChildren(); // stop the 3D model rendering while you are on the map
    guessStep.hidden = false;
    map.show(focus);
    showYear();
    refresh();
    if (state.done) showResult(false);
    if (focus && map.isReady()) map.focus();
  }

  next.addEventListener('click', () => showGuess(true));
  back.addEventListener('click', () => showExplore(true));
  submit.addEventListener('click', () => {
    if (!state.guess || state.year == null || state.done || !map.isReady()) return;
    state.done = true;
    save();
    next.textContent = 'See your result';
    map.reveal(artifact.point);
    refresh();
    showResult(true);
    onChange();
  });

  if (state.done) showGuess(false);
  else showExplore(false);
}
