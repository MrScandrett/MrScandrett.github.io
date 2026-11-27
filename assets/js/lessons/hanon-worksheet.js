/* Hanon worksheet: engraves Hanon Nos. 1–20 as a compact sheet (hanon-sheet.js) in any key,
 * for a chosen set of exercises, with Print and a link that assigns the exact sheet.
 * Links: ?hanon-key=G&hanon-ex=1-5,9#hanon-coach */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const section = document.querySelector('[data-hanon-worksheet]');
  const H = window.HanonSheet, MN = window.MusicNotation;
  if (!section || !H || !MN) return;
  const $ = sel => section.querySelector(sel);
  const sheet = $('.hs-sheet'), grid = $('.hs-grid'), keySel = $('[data-hs-key]'), chips = $('[data-hs-chips]');
  const fingerBox = $('[data-hs-fingers]'), tempoIn = $('[data-hs-tempo]'), studentIn = $('[data-hs-student]');
  const ALL = H.DATA.map(e => e.n);
  const params = new URLSearchParams(location.search);
  const state = {
    key: H.KEYS.some(k => k.id === params.get('hanon-key')) ? params.get('hanon-key') : 'C',
    ex: params.has('hanon-ex') ? H.unpackList(params.get('hanon-ex'), ALL.length) : ALL.slice()
  };
  if (!state.ex.length) state.ex = ALL.slice();

  const groups = [['Major (Hanon in every key)', false], ['Harmonic minor', true]];
  keySel.innerHTML = groups.map(([label, minor]) => `<optgroup label="${label}">${H.KEYS.filter(k => k.minor === minor).map(k => `<option value="${k.id}">${k.label}</option>`).join('')}</optgroup>`).join('');
  keySel.value = state.key;

  ALL.forEach(n => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'hs-chip'; b.textContent = n; b.dataset.n = n;
    b.setAttribute('aria-label', `Exercise ${n}`);
    b.addEventListener('click', () => {
      state.ex = state.ex.includes(n) ? state.ex.filter(x => x !== n) : state.ex.concat(n).sort((a, z) => a - z);
      if (!state.ex.length) state.ex = [n];
      draw();
    });
    chips.append(b);
  });
  $('[data-hs-all]').addEventListener('click', () => { state.ex = state.ex.length === ALL.length ? [1] : ALL.slice(); draw(); });

  /* Playback: both hands, the whole exercise (two octaves up and back), 16th notes. */
  let playing = null;
  const hz = m => 440 * 2 ** ((m - 69) / 12);
  function stop() {
    window.PianoAudio?.stop();
    if (playing) { playing.btn.classList.remove('is-playing'); playing.btn.setAttribute('aria-pressed', 'false'); clearTimeout(playing.timer); }
    playing = null;
  }
  function play(n, btn) {
    const again = playing && playing.n === n; stop();
    if (again || !window.PianoAudio) return;
    const bpm = Math.max(30, Math.min(160, Number(tempoIn.value) || 60)), step = 60 / bpm / 4;
    const p = H.performance(n, state.key), last = p.rh.length - p.end;
    const tone = (m, i, dur) => window.PianoAudio.tone(hz(m), { delay: i * step, duration: dur, gain: 0.22 });
    p.rh.forEach((m, i) => {
      const at = Math.min(i, last), dur = i >= last ? step * 8 : step * 1.6;
      tone(m, at, dur); tone(p.lh[i], at, dur);
    });
    btn.classList.add('is-playing'); btn.setAttribute('aria-pressed', 'true');
    playing = { n, btn, timer: setTimeout(stop, (last + 8) * step * 1000) };
  }

  function draw() {
    stop();
    const key = H.keyById(state.key);
    const lays = state.ex.map(n => H.layout(n, state.key));
    const width = Math.max(...lays.map(H.natural));
    /* Two passes: measure every staff, then engrave all to one width and one height. */
    const first = lays.map(l => H.engrave(l, MN, { width, fingers: fingerBox.checked }));
    /* Exercises side by side share a frame (so their staves line up); rows stay as tight as their music. */
    const frame = i => { const pair = first.slice(i - (i % 2), i - (i % 2) + 2); return { top: Math.min(...pair.map(r => r.top)), low: Math.max(...pair.map(r => r.low)) }; };
    grid.innerHTML = '';
    lays.forEach((l, i) => {
      const r = H.engrave(l, MN, { width, ...frame(i), fingers: fingerBox.checked });
      const fig = document.createElement('figure');
      fig.className = 'hs-ex'; fig.dataset.printKeep = '';
      fig.innerHTML = `<button type="button" class="hs-num" aria-pressed="false" title="Hear No. ${l.n} (both hands, up and back)" aria-label="Play exercise ${l.n}">${l.n}.</button><svg viewBox="${r.viewBox}" role="img" aria-label="${H.describe(l).replace(/"/g, '&quot;')}">${r.svg}</svg>`;
      fig.querySelector('button').addEventListener('click', e => play(l.n, e.currentTarget));
      grid.append(fig);
    });
    const range = H.packList(state.ex).replace(/-/g, '–').replace(/,/g, ', ');
    $('[data-hs-title]').textContent = `Hanon Exercises ${range}`;
    $('[data-hs-keyname]').textContent = key.label + (key.minor ? ' (harmonic)' : '');
    sheet.classList.toggle('hs-single', state.ex.length === 1);
    chips.querySelectorAll('.hs-chip').forEach(b => b.setAttribute('aria-pressed', String(state.ex.includes(+b.dataset.n))));
    $('[data-hs-all]').textContent = state.ex.length === ALL.length ? 'Clear' : 'All 20';
    $('[data-hs-note]').textContent = key.id === 'C' ? '' : 'Fingering is Hanon’s for C: keep the pattern, and move the thumb off black keys where it lands awkwardly.';
  }

  keySel.addEventListener('change', () => { state.key = keySel.value; draw(); });
  fingerBox.addEventListener('change', draw);
  const syncStudent = () => { $('[data-hs-for]').textContent = studentIn.value.trim() ? `for ${studentIn.value.trim()}` : ''; };
  studentIn.addEventListener('input', syncStudent);

  $('[data-hs-print]').addEventListener('click', () => {
    /* Print the sheet alone: everything off its path to <body> leaves the layout (no blank pages). */
    const html = document.documentElement, path = [];
    for (let el = sheet.parentElement; el && el !== document.body; el = el.parentElement) { el.setAttribute('data-hanon-path', ''); path.push(el); }
    html.setAttribute('data-hanon-print', '');
    const done = () => { html.removeAttribute('data-hanon-print'); path.forEach(el => el.removeAttribute('data-hanon-path')); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  });
  const copy = $('[data-hs-link]');
  copy.addEventListener('click', async () => {
    const url = new URL(location.href);
    ['hanon', 'ex'].forEach(p => url.searchParams.delete(p));   // older links (levels) are retired
    url.searchParams.set('hanon-key', state.key);
    if (state.ex.length === ALL.length) url.searchParams.delete('hanon-ex'); else url.searchParams.set('hanon-ex', H.packList(state.ex));
    url.hash = section.id;
    try { await navigator.clipboard.writeText(url.href); copy.textContent = 'Link copied ✓'; } catch { copy.textContent = url.href; }
    setTimeout(() => { copy.textContent = 'Copy assignment link'; }, 2500);
  });
  draw(); syncStudent();
});
