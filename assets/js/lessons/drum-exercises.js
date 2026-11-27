/* drum-exercises.js: the Practice exercises activity on the drum lesson.
 * The exercises live in drum-exercises-model.js (DOM-free, tested); notation, count-in, click
 * and sound come from the lesson's own player (DrumLab.createPlayer in drums.js). This file
 * draws the controls and remembers the student's level, lead hand and mastered exercises in
 * one localStorage key. It shares its look (.px-*) with the piano lesson's exercises. */
(function () {
  'use strict';
  const STORE = 'classroomos:drum-exercises:v1';

  function init() {
    const host = document.querySelector('[data-drum-exercises]');
    const X = window.DrumExercises, Lab = window.DrumLab;
    if (!host || !X || !Lab || !Lab.createPlayer || host.dataset.ready) return;
    host.dataset.ready = '1';

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { saved = {}; }
    const state = {
      tier: [1, 2, 3, 4].includes(saved.tier) ? saved.tier : 1,
      lead: saved.lead === 'L' ? 'L' : 'R',
      ex: X.exerciseById(saved.ex) ? saved.ex : 'singles',
      mastered: saved.mastered && typeof saved.mastered === 'object' ? saved.mastered : {},
      variant: {}, seed: Math.floor(Math.random() * 1e9), routine: null, current: null,
    };
    const save = () => {
      try { localStorage.setItem(STORE, JSON.stringify({ tier: state.tier, lead: state.lead, ex: state.ex, mastered: state.mastered })); } catch (e) { /* private mode */ }
    };

    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const btn = (cls, text, attrs) => { const b = el('button', cls, text); b.type = 'button'; Object.entries(attrs || {}).forEach(([k, v]) => b.setAttribute(k, v)); return b; };
    const tierLabel = n => X.TIERS[n - 1].label;

    /* ---------- Layout ---------- */
    host.innerHTML = '';
    const bar = el('div', 'px-bar');
    const levelGroup = el('div', 'px-seg');
    levelGroup.setAttribute('role', 'group');
    levelGroup.setAttribute('aria-label', 'Level');
    const levelBtns = X.TIERS.map(t => { const b = btn('px-seg-btn', t.label, { 'data-tier': t.n }); levelGroup.append(b); return b; });
    const leadWrap = el('div', 'px-field');
    leadWrap.append(el('span', '', 'Lead hand'));
    const leadGroup = el('div', 'px-seg px-seg-sm');
    leadGroup.setAttribute('role', 'group');
    leadGroup.setAttribute('aria-label', 'Lead hand');
    leadGroup.title = 'Left lead swaps every R and L: a weak-hand day, or open-handed playing on the kit.';
    const leadBtns = X.LEADS.map(([id, label]) => { const b = btn('px-seg-btn', label, { 'data-lead': id }); leadGroup.append(b); return b; });
    leadWrap.append(leadGroup);
    const progress = el('p', 'px-progress');
    progress.setAttribute('aria-live', 'polite');
    bar.append(levelGroup, leadWrap, progress);

    const presetWrap = el('div', 'px-presets');
    presetWrap.setAttribute('role', 'group');
    presetWrap.setAttribute('aria-label', 'Quick-start routines');
    const presetRow = el('div', 'px-preset-row');
    presetWrap.append(el('p', 'px-kicker', 'Quick start'), presetRow);

    const routineBar = el('div', 'px-routine');
    routineBar.hidden = true;
    routineBar.setAttribute('role', 'region');
    routineBar.setAttribute('aria-label', 'Routine');
    const routineText = el('p', 'px-routine-text');
    routineText.setAttribute('aria-live', 'polite');
    const routineSteps = el('ol', 'px-routine-steps');
    const routinePrev = btn('dr-mini', '◀ Back'), routineNext = btn('dr-mini dr-mini-primary', 'Next ▶'), routineEnd = btn('dr-mini', 'End');
    const routineTimer = el('span', 'px-timer');
    const routineCtl = el('div', 'px-routine-ctl');
    routineCtl.append(routineTimer, routinePrev, routineNext, routineEnd);
    routineBar.append(routineText, routineSteps, routineCtl);

    const main = el('div', 'px-main');
    const nav = el('nav', 'px-nav');
    nav.setAttribute('aria-label', 'Exercises');
    const card = el('article', 'px-card dx-card');
    main.append(nav, card);
    host.append(bar, presetWrap, routineBar, main);

    /* ---------- Card ---------- */
    const catChip = el('span', 'px-chip');
    const tools = el('div', 'px-transport dx-tools');
    const ladder = el('div', 'px-ladder');
    ladder.setAttribute('role', 'group');
    ladder.setAttribute('aria-label', 'Tempo ladder');
    const ladderBtns = [[0.7, 'Slow'], [0.85, 'Steady'], [1, 'Target']].map(([f, label]) => { const b = btn('px-ladder-btn', label, { 'data-f': f }); ladder.append(b); return b; });
    const ladderWrap = el('div', 'px-tempo');
    ladderWrap.append(el('span', 'px-kicker', 'Tempo'), ladder);
    const variantLabel = el('label', 'px-field px-field-inline');
    variantLabel.append(el('span', '', 'Version'));
    const variantSel = el('select');
    variantLabel.append(variantSel);
    const rerollBtn = btn('dr-mini', '🎲 New rhythm');
    const hideLabel = el('label', 'px-check');
    const hideIn = el('input'); hideIn.type = 'checkbox';
    hideLabel.append(hideIn, el('span', '', 'Hear it first (hide the notation)'));
    tools.append(ladderWrap, variantLabel, rerollBtn, hideLabel);

    const playerHost = el('div', 'dr-player dx-player');
    const details = el('div', 'px-details');
    const howBox = el('section', 'px-box');
    howBox.append(el('h4', '', 'How to practise'));
    const howList = el('ol', 'px-how');
    howBox.append(howList);
    const checkBox = el('section', 'px-box px-box-check');
    checkBox.append(el('h4', '', 'Move on when'));
    const checkText = el('p');
    const masterBtn = btn('px-master', '');
    checkBox.append(checkText, masterBtn);
    details.append(howBox, checkBox);
    const tip = el('p', 'px-tip');
    const link = el('a', 'px-link');
    card.append(catChip, playerHost, tools, details, tip);
    const player = Lab.createPlayer(playerHost, { patterns: [X.build('singles', 1).pattern] });

    /* ---------- Rendering ---------- */
    const unlocked = e => e.min <= state.tier;
    const masteredKey = (id, tier) => id + '@' + tier;

    function renderBar() {
      levelBtns.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.tier) === state.tier)));
      leadBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lead === state.lead)));
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
        if (!steps.length) return;
        const minutes = steps.reduce((s, x) => s + x.minutes, 0);
        const b = btn('px-preset', '', { 'data-preset': p.id });
        b.append(el('span', 'px-icon', p.icon));
        const copy = el('span', 'px-preset-copy');
        copy.append(el('strong', '', p.label), el('span', '', p.blurb), el('span', 'px-preset-meta', steps.length + (steps.length === 1 ? ' step · ' : ' steps · ') + Math.round(minutes) + ' min'));
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

    function renderCard() {
      const meta = X.exerciseById(state.ex);
      const ex = X.build(state.ex, state.tier, { variant: state.variant[state.ex], lead: state.lead, seed: state.seed });
      state.current = ex;
      const cat = X.CATEGORIES.find(c => c.id === meta.cat);
      catChip.textContent = cat.icon + ' ' + cat.label + ' · ' + tierLabel(ex.tier) + (ex.hasSticking && state.lead === 'L' ? ' · left lead' : '');
      player.load(ex.pattern);
      howList.innerHTML = '';
      ex.how.forEach(h => howList.append(el('li', '', h)));
      checkText.textContent = ex.check;
      tip.textContent = ex.tip;
      tip.hidden = !ex.tip;
      // The link exists only when an exercise has one: an empty hidden <a> is an a11y error.
      if (ex.link) { link.href = ex.link.href; link.textContent = ex.link.label + ' →'; card.append(link); } else link.remove();
      const isMastered = !!state.mastered[masteredKey(ex.id, state.tier)];
      masterBtn.setAttribute('aria-pressed', String(isMastered));
      masterBtn.textContent = isMastered ? '✓ Mastered at ' + tierLabel(state.tier) : 'I can do this';
      variantSel.innerHTML = '';
      (ex.variants || []).forEach(([id, label]) => variantSel.add(new Option(label, id)));
      variantLabel.hidden = !ex.variants;
      if (ex.variants) variantSel.value = ex.variant;
      rerollBtn.hidden = !ex.reroll;
      hideLabel.hidden = !ex.reroll;
      if (!ex.reroll) hideIn.checked = false;
      playerHost.classList.toggle('dx-hide-notation', hideIn.checked);
      updateLadder();
    }

    function updateLadder() {
      const ex = state.current, v = player.tempo();
      ladderBtns.forEach(b => b.setAttribute('aria-pressed', String(!!ex && Math.abs(Math.round(ex.tempo * Number(b.dataset.f)) - v) <= 1)));
    }

    function renderAll() { renderBar(); renderPresets(); renderNav(); renderRoutine(); renderCard(); }

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
      if (r.i === r.steps.length - 1) {
        routineText.textContent = 'Routine finished. Nice work!';
        endRoutine();
        routineBar.hidden = false; routineSteps.innerHTML = ''; routineCtl.hidden = true;
        setTimeout(() => { routineBar.hidden = true; routineCtl.hidden = false; }, 4000);
      } else goStep(r.i + 1);
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
      if (opts.focus) { const h = playerHost.querySelector('.dr-title'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
    }
    levelBtns.forEach(b => b.addEventListener('click', () => {
      state.tier = Number(b.dataset.tier);
      if (!unlocked(X.exerciseById(state.ex))) state.ex = 'singles';
      if (state.routine) endRoutine();
      save();
      renderAll();
    }));
    leadBtns.forEach(b => b.addEventListener('click', () => { state.lead = b.dataset.lead; save(); renderBar(); renderCard(); }));
    ladderBtns.forEach(b => b.addEventListener('click', () => {
      player.setTempo(Math.round(state.current.tempo * Number(b.dataset.f)));
      updateLadder();
    }));
    playerHost.addEventListener('input', e => { if (e.target.type === 'range') updateLadder(); });
    variantSel.addEventListener('change', () => { state.variant[state.ex] = variantSel.value; renderCard(); });
    rerollBtn.addEventListener('click', () => { state.seed = Math.floor(Math.random() * 1e9); renderCard(); });
    hideIn.addEventListener('change', () => playerHost.classList.toggle('dx-hide-notation', hideIn.checked));
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
    // The rest of the page can open an exercise: <a href="#exercise-lab" data-drum-exercise="paradiddle">.
    document.addEventListener('click', ev => {
      const a = ev.target.closest('[data-drum-exercise]');
      if (a && X.exerciseById(a.dataset.drumExercise)) select(a.dataset.drumExercise);
    });

    renderAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
