/* piano-exercises.js: the Practice exercises activity on the piano lesson.
 * The exercises, engraving and timing live in piano-exercises-model.js (DOM-free, tested);
 * this file draws the controls, plays through PianoAudio and remembers the student's level,
 * key and mastered exercises in one localStorage key. */
(function () {
  'use strict';
  const STORE = 'classroomos:piano-exercises:v1';

  function init() {
    const host = document.querySelector('[data-piano-exercises]');
    const X = window.PianoExercises, MN = window.MusicNotation;
    if (!host || !X || !MN || host.dataset.ready) return;
    host.dataset.ready = '1';

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { saved = {}; }
    const state = {
      tier: [1, 2, 3, 4].includes(saved.tier) ? saved.tier : 1,
      key: X.KEYS.some(k => k.id === saved.key) ? saved.key : 'C',
      ex: X.exerciseById(saved.ex) ? saved.ex : 'scale',
      hands: ['both', 'rh', 'lh'].includes(saved.hands) ? saved.hands : 'both',
      mastered: saved.mastered && typeof saved.mastered === 'object' ? saved.mastered : {},
      variant: {}, tempo: null, loop: false, routine: null, ear: null, current: null,
    };
    const save = () => {
      try { localStorage.setItem(STORE, JSON.stringify({ tier: state.tier, key: state.key, ex: state.ex, hands: state.hands, mastered: state.mastered })); } catch (e) { /* private mode */ }
    };

    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const btn = (cls, text, attrs) => { const b = el('button', cls, text); b.type = 'button'; Object.entries(attrs || {}).forEach(([k, v]) => b.setAttribute(k, v)); return b; };
    const pretty = name => MN.pitchName(name);
    const tierLabel = n => X.TIERS[n - 1].label;

    /* ---------- Layout ---------- */
    host.innerHTML = '';
    const bar = el('div', 'px-bar');
    const levelGroup = el('div', 'px-seg');
    levelGroup.setAttribute('role', 'group');
    levelGroup.setAttribute('aria-label', 'Level');
    const levelBtns = X.TIERS.map(t => { const b = btn('px-seg-btn', t.label, { 'data-tier': t.n }); levelGroup.append(b); return b; });
    const keyLabel = el('label', 'px-field');
    keyLabel.append(el('span', '', 'Key'));
    const keySel = el('select');
    [['Major keys', 'major'], ['Minor keys', 'minor']].forEach(([label, mode]) => {
      const og = el('optgroup'); og.label = label;
      X.KEYS.filter(k => k.mode === mode).forEach(k => og.append(new Option(k.label, k.id)));
      keySel.append(og);
    });
    keyLabel.append(keySel);
    const progress = el('p', 'px-progress');
    progress.setAttribute('aria-live', 'polite');
    bar.append(levelGroup, keyLabel, progress);

    const presetWrap = el('div', 'px-presets');
    presetWrap.setAttribute('role', 'group');
    presetWrap.setAttribute('aria-label', 'Quick-start routines');
    const presetHead = el('p', 'px-kicker', 'Quick start');
    const presetRow = el('div', 'px-preset-row');
    presetWrap.append(presetHead, presetRow);

    const routineBar = el('div', 'px-routine');
    routineBar.hidden = true;
    routineBar.setAttribute('role', 'region');
    routineBar.setAttribute('aria-label', 'Routine');
    const routineText = el('p', 'px-routine-text');
    routineText.setAttribute('aria-live', 'polite');
    const routineSteps = el('ol', 'px-routine-steps');
    const routinePrev = btn('pc-btn', '◀ Back'), routineNext = btn('pc-btn pc-btn-primary', 'Next ▶'), routineEnd = btn('pc-btn', 'End');
    const routineTimer = el('span', 'px-timer');
    const routineCtl = el('div', 'px-routine-ctl');
    routineCtl.append(routineTimer, routinePrev, routineNext, routineEnd);
    routineBar.append(routineText, routineSteps, routineCtl);

    const main = el('div', 'px-main');
    const nav = el('nav', 'px-nav');
    nav.setAttribute('aria-label', 'Exercises');
    const card = el('article', 'px-card');
    main.append(nav, card);
    host.append(bar, presetWrap, routineBar, main);

    /* ---------- Card parts (built once, filled per exercise) ---------- */
    const cardHead = el('header', 'px-card-head');
    const catChip = el('span', 'px-chip');
    const title = el('h3', 'px-title');
    title.tabIndex = -1;
    const goal = el('p', 'px-goal');
    cardHead.append(catChip, title, goal);

    const transport = el('div', 'px-transport');
    const playBtn = btn('pc-btn pc-btn-primary px-play', '▶ Play');
    const handGroup = el('div', 'px-seg px-seg-sm');
    handGroup.setAttribute('role', 'group');
    handGroup.setAttribute('aria-label', 'Hands');
    const handBtns = [['both', 'Both hands'], ['rh', 'Right'], ['lh', 'Left']].map(([id, label]) => { const b = btn('px-seg-btn', label, { 'data-hands': id }); handGroup.append(b); return b; });
    const tempoWrap = el('div', 'px-tempo');
    const tempoLabel = el('label', 'px-field px-field-inline');
    tempoLabel.append(el('span', '', '♩ ='));
    const tempoIn = el('input'); tempoIn.type = 'range'; tempoIn.min = '30'; tempoIn.max = '200'; tempoIn.step = '2';
    tempoIn.setAttribute('aria-label', 'Tempo, quarter notes per minute');
    const tempoOut = el('output', 'px-tempo-out');
    tempoLabel.append(tempoIn, tempoOut);
    const ladder = el('div', 'px-ladder');
    ladder.setAttribute('role', 'group');
    ladder.setAttribute('aria-label', 'Tempo ladder');
    const ladderBtns = [[0.6, 'Slow'], [0.8, 'Steady'], [1, 'Target']].map(([f, label]) => { const b = btn('px-ladder-btn', label, { 'data-f': f }); ladder.append(b); return b; });
    tempoWrap.append(tempoLabel, ladder);
    const loopLabel = el('label', 'px-check');
    const loopIn = el('input'); loopIn.type = 'checkbox';
    loopLabel.append(loopIn, el('span', '', 'Repeat'));
    const variantLabel = el('label', 'px-field px-field-inline');
    variantLabel.append(el('span', '', 'Version'));
    const variantSel = el('select');
    variantLabel.append(variantSel);
    transport.append(playBtn, handGroup, tempoWrap, loopLabel, variantLabel);

    const score = el('div', 'px-score');
    score.setAttribute('data-night-keep', '');
    score.setAttribute('data-skin-keep', '');
    score.setAttribute('data-present', '');
    score.tabIndex = 0;

    const ear = el('div', 'px-ear');
    const earCtl = el('div', 'px-ear-ctl');
    const earPlay = btn('pc-btn pc-btn-primary', '🔊 Hear the tune'), earHome = btn('pc-btn', '🏠 Home note'), earNew = btn('pc-btn', 'New tune'), earShow = btn('pc-btn', 'Show answer');
    earCtl.append(earPlay, earHome, earNew, earShow);
    const earKeys = el('div', 'px-ear-keys');
    earKeys.setAttribute('role', 'group');
    earKeys.setAttribute('aria-label', 'Notes to choose from');
    const earSlots = el('ol', 'px-ear-slots');
    earSlots.setAttribute('aria-label', 'Notes found so far');
    const earStatus = el('p', 'px-ear-status');
    earStatus.setAttribute('role', 'status');
    const earAnswer = el('div', 'px-score px-ear-answer');
    earAnswer.setAttribute('data-night-keep', '');
    ear.append(earCtl, earSlots, earKeys, earStatus, earAnswer);

    const details = el('div', 'px-details');
    const howBox = el('section', 'px-box');
    howBox.append(el('h4', '', 'How to practise'));
    const howList = el('ol', 'px-how');
    howBox.append(howList);
    const checkBox = el('section', 'px-box px-box-check');
    checkBox.append(el('h4', '', 'Move on when'));
    const checkText = el('p');
    const masterBtn = btn('px-master', '');
    const tip = el('p', 'px-tip');
    const link = el('a', 'px-link');
    checkBox.append(checkText, masterBtn);
    details.append(howBox, checkBox);
    card.append(cardHead, transport, score, ear, details, tip);

    /* ---------- Rendering ---------- */
    const handsList = () => state.hands === 'both' ? ['rh', 'lh'] : [state.hands];
    const unlocked = e => e.min <= state.tier;
    const masteredKey = (id, tier) => id + '@' + tier;

    function renderBar() {
      levelBtns.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.tier) === state.tier)));
      keySel.value = state.key;
      const open = X.EXERCISES.filter(unlocked);
      const done = open.filter(e => state.mastered[masteredKey(e.id, state.tier)]).length;
      progress.innerHTML = '';
      const meter = el('span', 'px-meter');
      const fill = el('span', 'px-meter-fill');
      fill.style.width = (open.length ? Math.round(100 * done / open.length) : 0) + '%';
      meter.append(fill);
      progress.append(meter, el('span', '', done + ' of ' + open.length + ' mastered at ' + tierLabel(state.tier)));
    }

    function renderPresets() {
      presetRow.innerHTML = '';
      X.PRESETS.forEach(p => {
        const steps = X.routine(p.id, state.tier);
        const minutes = steps.reduce((s, x) => s + x.minutes, 0);
        const b = btn('px-preset', '', { 'data-preset': p.id });
        b.append(el('span', 'px-icon', p.icon));
        const copy = el('span', 'px-preset-copy');
        copy.append(el('strong', '', p.label), el('span', '', p.blurb), el('span', 'px-preset-meta', steps.length + ' steps · ' + Math.round(minutes) + ' min'));
        b.append(copy);
        if (state.routine && state.routine.id === p.id) b.setAttribute('aria-pressed', 'true');
        b.addEventListener('click', () => startRoutine(p.id));
        presetRow.append(b);
      });
    }

    function renderNav() {
      nav.innerHTML = '';
      X.CATEGORIES.forEach(cat => {
        const group = el('div', 'px-nav-group');
        const head = el('p', 'px-nav-head');
        head.append(el('span', 'px-icon', cat.icon), el('span', '', cat.label));
        const list = el('ul', 'px-nav-list');
        X.EXERCISES.filter(e => e.cat === cat.id).forEach(e => {
          const li = el('li');
          const b = btn('px-item', '', { 'data-ex': e.id });
          b.append(el('span', 'px-icon', e.icon), el('span', 'px-item-title', e.title));
          if (!unlocked(e)) {
            b.disabled = true;
            b.classList.add('is-locked');
            const lock = el('span', 'px-item-tag is-locked', '🔒 ' + X.TIERS[e.min - 1].icon);
            lock.title = 'Unlocks at ' + tierLabel(e.min);
            b.append(lock);
            b.setAttribute('aria-label', e.title + ', unlocks at ' + tierLabel(e.min));
            b.title = 'Unlocks at ' + tierLabel(e.min);
          } else if (state.mastered[masteredKey(e.id, state.tier)]) {
            b.append(el('span', 'px-item-tag is-done', '✓'));
            b.setAttribute('aria-label', e.title + ', mastered');
          }
          if (e.id === state.ex) b.setAttribute('aria-current', 'true');
          b.addEventListener('click', () => select(e.id, { focus: true }));
          li.append(b);
          list.append(li);
        });
        group.append(head, list);
        nav.append(group);
      });
    }

    function renderRoutine() {
      const r = state.routine;
      routineBar.hidden = !r;
      if (!r) return;
      const preset = X.PRESETS.find(p => p.id === r.id);
      routineText.textContent = preset.icon + ' ' + preset.label + ' · step ' + (r.i + 1) + ' of ' + r.steps.length;
      routineSteps.innerHTML = '';
      r.steps.forEach((s, i) => {
        const li = el('li', i < r.i ? 'is-done' : i === r.i ? 'is-now' : '');
        const b = btn('px-step', X.exerciseById(s.id).title);
        if (i === r.i) b.setAttribute('aria-current', 'step');
        b.addEventListener('click', () => goStep(i));
        li.append(b);
        routineSteps.append(li);
      });
      routinePrev.disabled = r.i === 0;
      routineNext.textContent = r.i === r.steps.length - 1 ? 'Finish ✓' : 'Next ▶';
      tickTimer();
    }

    function currentVariant() {
      const list = X.variantsFor(state.ex, X.keyById(state.key));
      if (!list) return null;
      const v = state.variant[state.ex];
      return list.some(x => x[0] === v) ? v : X.defaultVariant(state.ex, X.keyById(state.key), state.tier);
    }

    function renderCard() {
      stopAll();
      const meta = X.exerciseById(state.ex);
      const ex = X.build(state.ex, state.key, state.tier, currentVariant());
      state.current = ex;
      const cat = X.CATEGORIES.find(c => c.id === meta.cat);
      catChip.textContent = cat.icon + ' ' + cat.label + ' · ' + tierLabel(ex.tier);
      title.textContent = ex.title;
      goal.textContent = meta.goal;
      howList.innerHTML = '';
      ex.how.forEach(h => howList.append(el('li', '', h)));
      checkText.textContent = ex.check;
      tip.textContent = ex.tip || '';
      tip.hidden = !ex.tip;
      // The link exists only when an exercise has one: an empty hidden <a> is an a11y error.
      if (ex.link) { link.href = ex.link.href; link.textContent = ex.link.label + ' →'; card.append(link); } else link.remove();
      const isMastered = !!state.mastered[masteredKey(ex.id, state.tier)];
      masterBtn.setAttribute('aria-pressed', String(isMastered));
      masterBtn.textContent = isMastered ? '✓ Mastered at ' + tierLabel(state.tier) : 'I can do this';
      // Variants
      variantSel.innerHTML = '';
      (ex.variants || []).forEach(([id, label]) => variantSel.add(new Option(label, id)));
      variantLabel.hidden = !ex.variants;
      if (ex.variants) variantSel.value = ex.variant;
      // Tempo
      state.tempo = ex.tempo;
      tempoIn.value = String(ex.tempo);
      updateTempo();
      handBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hands === state.hands)));
      const isEar = ex.interactive === 'ear';
      score.hidden = isEar;
      ear.hidden = !isEar;
      handGroup.hidden = isEar;
      loopLabel.hidden = isEar;
      playBtn.hidden = isEar;
      tempoWrap.hidden = false;
      if (isEar) newTune(); else drawScore();
    }

    function drawScore() {
      const ex = state.current;
      const r = X.engrave(ex, MN, { label: ex.title + ', notation for both hands' });
      score.innerHTML = r.svg;
      score.dataset.hands = state.hands;
      score.scrollLeft = 0;
    }

    function updateTempo() {
      const ex = state.current;
      const v = Number(tempoIn.value);
      tempoOut.textContent = String(v);
      ladderBtns.forEach(b => b.setAttribute('aria-pressed', String(ex && Math.abs(Math.round(ex.tempo * Number(b.dataset.f)) - v) <= 1)));
    }

    function renderAll() { renderBar(); renderPresets(); renderNav(); renderRoutine(); renderCard(); }

    /* ---------- Sound ---------- */
    let timers = [];
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; playBtn.textContent = '▶ Play'; playBtn.setAttribute('aria-pressed', 'false'); score.querySelectorAll('.is-on').forEach(n => n.classList.remove('is-on')); };
    function stopAll() { clearTimers(); if (window.PianoAudio) window.PianoAudio.stop(); }
    if (window.AudioKit && window.AudioKit.onStop) window.AudioKit.onStop(clearTimers);

    function play() {
      const ex = state.current;
      if (!ex || !window.PianoAudio) return;
      stopAll();
      if (!window.PianoAudio.getContext()) return;
      const pedal = ex.pedal && ex.pedal.length ? ex.pedalOn !== false : undefined;
      const plan = X.schedule(ex, { tempo: Number(tempoIn.value), hands: handsList(), pedal });
      const lead = 0.12;
      plan.notes.forEach(n => window.PianoAudio.tone(n.hz, { delay: lead + n.time, duration: n.dur, gain: n.vel * 0.35 }));
      playBtn.textContent = '■ Stop';
      playBtn.setAttribute('aria-pressed', 'true');
      plan.onsets.forEach(t => timers.push(setTimeout(() => light(t), (lead + t * plan.beat) * 1000)));
      timers.push(setTimeout(() => {
        if (loopIn.checked) play(); else clearTimers();
      }, (lead + plan.total) * 1000 + 250));
    }
    function light(t) {
      score.querySelectorAll('.is-on').forEach(n => n.classList.remove('is-on'));
      const key = String(Math.round(t * 1e4) / 1e4);
      const hits = [...score.querySelectorAll('.pxs-ev')].filter(n => n.dataset.t === key);
      hits.forEach(n => n.classList.add('is-on'));
      const first = hits[0];
      if (first) {
        const box = first.getBBox ? first.getBBox() : null;
        if (box && (box.x < score.scrollLeft + 40 || box.x > score.scrollLeft + score.clientWidth - 80)) score.scrollLeft = Math.max(0, box.x - 80);
      }
    }

    /* ---------- Play by ear ---------- */
    function newTune() {
      stopAll();
      const seed = Math.floor(Math.random() * 1e9);
      const mel = X.earMelody(state.key, state.tier, seed);
      state.ear = { mel, pos: 0, wrong: 0, shown: false };
      earKeys.innerHTML = '';
      mel.choices.forEach(c => {
        const b = btn('px-ear-key' + (/[#b]/.test(c.name.replace(/\d+$/, '').slice(1)) ? ' is-black' : ''), pretty(c.name), { 'data-midi': c.midi });
        b.append(el('small', '', String(c.name.match(/-?\d+$/)[0])));
        b.setAttribute('aria-label', pretty(c.name) + ' ' + c.name.match(/-?\d+$/)[0]);
        b.addEventListener('click', () => guess(c));
        earKeys.append(b);
      });
      earAnswer.innerHTML = '';
      earAnswer.hidden = true;
      renderSlots();
      earStatus.textContent = 'A new ' + mel.degs.length + '-note tune in ' + X.keyById(state.key).label + '. Press Hear the tune.';
    }
    function renderSlots() {
      const s = state.ear;
      earSlots.innerHTML = '';
      s.mel.notes.forEach((n, i) => {
        const li = el('li', i < s.pos ? 'is-found' : i === s.pos ? 'is-next' : '', i < s.pos || s.shown ? pretty(n.name) : '?');
        earSlots.append(li);
      });
    }
    function playTune() {
      const s = state.ear;
      if (!s || !window.PianoAudio) return;
      stopAll();
      const beat = 60 / Number(tempoIn.value);
      s.mel.notes.forEach((n, i) => window.PianoAudio.tone(X.freq(n.midi), { delay: 0.1 + i * beat, duration: beat * 0.95, gain: 0.22 }));
    }
    function guess(c) {
      const s = state.ear;
      if (!s || s.pos >= s.mel.notes.length) return;
      if (window.PianoAudio) window.PianoAudio.tone(X.freq(c.midi), { duration: 0.6, gain: 0.22 });
      const want = s.mel.notes[s.pos];
      if (c.midi === want.midi) {
        s.pos++;
        renderSlots();
        if (s.pos === s.mel.notes.length) {
          earStatus.textContent = (s.wrong <= 1 ? '🎉 Found it' : '✓ Found it') + (s.wrong ? ' with ' + s.wrong + ' wrong guess' + (s.wrong > 1 ? 'es' : '') : ' with no wrong guesses') + '. Play it on your piano, then try a new tune.';
          showAnswer();
        } else earStatus.textContent = 'Yes, ' + pretty(want.name) + '. Note ' + (s.pos + 1) + ' of ' + s.mel.notes.length + ' next.';
      } else {
        s.wrong++;
        earStatus.textContent = 'Not ' + pretty(c.name) + '. The note you want is ' + (want.midi > c.midi ? 'higher' : 'lower') + '. Listen again if you need to.';
      }
    }
    function showAnswer() {
      const s = state.ear;
      s.shown = true;
      renderSlots();
      const ex = { title: 'The tune', sig: X.keyById(state.key).sig, meter: 4, rh: s.mel.notes.map((n, i) => ({ t: i, d: 1, ps: [n.name], midi: [n.midi] })), lh: [] };
      earAnswer.innerHTML = X.engrave(ex, MN, { hands: ['rh'], label: 'The tune: ' + s.mel.notes.map(n => pretty(n.name)).join(', ') }).svg;
      earAnswer.hidden = false;
    }
    earPlay.addEventListener('click', playTune);
    earHome.addEventListener('click', () => { const s = state.ear; if (s && window.PianoAudio) { stopAll(); window.PianoAudio.tone(X.freq(s.mel.choices.find(c => c.deg === 0).midi), { duration: 1.2, gain: 0.22 }); } });
    earNew.addEventListener('click', newTune);
    earShow.addEventListener('click', () => { showAnswer(); earStatus.textContent = 'Here it is. Play it back from the notation, then try a new tune.'; });

    /* ---------- Routines ---------- */
    let tick = null;
    function startRoutine(id) {
      const steps = X.routine(id, state.tier);
      if (!steps.length) return;
      state.routine = { id, steps, i: 0, started: Date.now() };
      renderPresets();
      goStep(0);
      routineBar.scrollIntoView({ block: 'nearest' });
    }
    function goStep(i) {
      const r = state.routine;
      if (!r) return;
      r.i = Math.max(0, Math.min(r.steps.length - 1, i));
      r.started = Date.now();
      select(r.steps[r.i].id, { focus: true, keepRoutine: true });
      renderRoutine();
      clearInterval(tick);
      tick = setInterval(tickTimer, 1000);
    }
    function tickTimer() {
      const r = state.routine;
      if (!r) { clearInterval(tick); return; }
      const left = Math.round(r.steps[r.i].minutes * 60 - (Date.now() - r.started) / 1000);
      const t = Math.abs(left);
      routineTimer.textContent = (left < 0 ? 'Time! +' : '⏱ ') + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
      routineTimer.classList.toggle('is-over', left < 0);
    }
    function endRoutine() { state.routine = null; clearInterval(tick); renderRoutine(); renderPresets(); }
    routinePrev.addEventListener('click', () => goStep(state.routine.i - 1));
    routineNext.addEventListener('click', () => {
      const r = state.routine;
      if (r.i === r.steps.length - 1) { routineText.textContent = 'Routine finished. Nice work!'; endRoutine(); routineBar.hidden = false; routineSteps.innerHTML = ''; routineCtl.hidden = true; setTimeout(() => { routineBar.hidden = true; routineCtl.hidden = false; }, 4000); }
      else goStep(r.i + 1);
    });
    routineEnd.addEventListener('click', endRoutine);

    /* ---------- Events ---------- */
    function select(id, opts) {
      opts = opts || {};
      const e = X.exerciseById(id);
      if (!e || !unlocked(e)) return;
      state.ex = id;
      if (!opts.keepRoutine && state.routine && state.routine.steps[state.routine.i].id !== id) endRoutine();
      save();
      renderNav();
      renderCard();
      if (opts.focus) title.focus({ preventScroll: true });
    }
    levelBtns.forEach(b => b.addEventListener('click', () => {
      state.tier = Number(b.dataset.tier);
      if (!unlocked(X.exerciseById(state.ex))) state.ex = 'scale';
      if (state.routine) endRoutine();
      save();
      renderAll();
    }));
    keySel.addEventListener('change', () => { state.key = keySel.value; save(); renderCard(); });
    handBtns.forEach(b => b.addEventListener('click', () => {
      state.hands = b.dataset.hands;
      save();
      handBtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      score.dataset.hands = state.hands;
      if (timers.length) play();
    }));
    tempoIn.addEventListener('input', updateTempo);
    ladderBtns.forEach(b => b.addEventListener('click', () => {
      tempoIn.value = String(Math.round(state.current.tempo * Number(b.dataset.f)));
      updateTempo();
    }));
    variantSel.addEventListener('change', () => { state.variant[state.ex] = variantSel.value; renderCard(); });
    playBtn.addEventListener('click', () => { if (timers.length) stopAll(); else play(); });
    masterBtn.addEventListener('click', () => {
      const k = masteredKey(state.ex, state.tier);
      if (state.mastered[k]) delete state.mastered[k]; else state.mastered[k] = new Date().toISOString().slice(0, 10);
      save();
      renderBar();
      renderNav();
      const on = !!state.mastered[k];
      masterBtn.setAttribute('aria-pressed', String(on));
      masterBtn.textContent = on ? '✓ Mastered at ' + tierLabel(state.tier) : 'I can do this';
    });
    link.addEventListener('click', () => {
      const hs = document.querySelector('[data-hs-key]');
      if (hs && [...hs.options].some(o => o.value === state.key)) { hs.value = state.key; hs.dispatchEvent(new Event('change')); }
    });
    // The rest of the page can open an exercise: <a href="#exercise-lab" data-exercise="arpeggio">.
    document.addEventListener('click', ev => {
      const a = ev.target.closest('[data-exercise]');
      if (a && X.exerciseById(a.dataset.exercise)) select(a.dataset.exercise);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });

    renderAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
