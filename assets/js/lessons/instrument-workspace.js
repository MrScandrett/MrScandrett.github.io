/* Keep each activity and its settings in one place; preserve live instrument state. */
(() => {
  function init() {
  'use strict';
  const app = document.querySelector('main > [data-creation-app]');
  if (!app || app.classList.contains('instrument-workspace')) return;
  app.classList.add('instrument-workspace');
  const isPiano = document.body.classList.contains('piano-lesson');
  const bar = app.querySelector(':scope > .creation-app-toolbar');
  const nav = document.createElement('div');
  nav.className = 'iw-navigation';
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', 'Instrument activities');
  const label = document.createElement('label');
  label.className = 'iw-jump';
  label.textContent = 'Jump to ';
  const picker = document.createElement('select');
  label.append(picker);
  nav.append(label);
  picker.addEventListener('change', () => show(pages[Number(picker.value)].panel));
  if (!bar) return;
  bar.prepend(nav);
  const stop = document.createElement('button');
  stop.type = 'button';
  stop.textContent = 'Stop sound';
  stop.setAttribute('aria-label', 'Stop sound');
  stop.addEventListener('click', () => window.AudioKit?.stopAll());
  nav.append(stop);
  // Home button, current-activity title and a settings shortcut replace the old menu and button row.
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'iw-back';
  back.textContent = '‹ Home';
  back.hidden = true;
  nav.prepend(back);
  const title = document.createElement('strong');
  title.className = 'iw-title';
  nav.append(title);
  const lessonLink = document.createElement('a');
  lessonLink.href = '#instrument-pathway';
  lessonLink.textContent = 'Lesson steps';
  lessonLink.className = 'iw-lesson-link';
  lessonLink.addEventListener('click', async event => {
    event.preventDefault();
    if (document.fullscreenElement === app) await document.exitFullscreen();
    else if (app.classList.contains('creation-app-expanded')) bar.querySelector('.creation-app-fullscreen').click();
    // Let the fullscreen controller restore its focus before moving into the lesson.
    await new Promise(resolve => requestAnimationFrame(resolve));
    const target = document.getElementById('instrument-pathway');
    if (target) { target.tabIndex = -1; target.focus(); target.scrollIntoView({ block: 'start' }); }
  });
  if (document.getElementById('instrument-pathway')) nav.append(lessonLink);
  const practiceLinks = app.querySelector(':scope > .pr-entry');
  if (practiceLinks) nav.after(practiceLinks);
  const status = document.createElement('span');
  status.className = 'iw-status';
  status.setAttribute('role', 'status');
  nav.append(status);
  const pages = [];
  // Piano keeps its scale tool and chord library in lesson chapters; bring them into the workspace
  // so they are one tap from Home like the guitar's (ids and listeners travel with the nodes).
  function adopt(id, label) {
    const section = document.getElementById(id);
    if (!section || app.contains(section)) return;
    const holder = section.closest('details');
    section.dataset.routeLabel = label;
    app.append(section);
    if (holder && !holder.querySelector('section')) holder.remove();
  }
  function adoptPianoTools() {
    adopt('scales', 'Scales and modes');
    adopt('encyclopedia', 'Chord library');
  }
  function page(label, nodes) {
    nodes = nodes.filter(Boolean);
    if (!nodes.length) return;
    const panel = document.createElement('div');
    panel.className = 'iw-panel';
    panel.id = `instrument-view-${pages.length}`;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', label);
    app.append(panel);
    nodes.forEach(node => panel.append(node));
    picker.add(new Option(label, String(pages.length)));
    pages.push({ panel, label });
  }

  // ---- Home: Quick start tools, activity modules and lesson chapters -------------------------
  const KINDS = [
    [/sound & display/i, { kind: 'settings' }],
    [/help|guide/i, { kind: 'help' }],
    [/chord builder/i, { kind: 'quick', icon: '🧱', short: 'Chord builder', blurb: 'Pick notes, get a name.' }],
    [/chord (library|encyclopedia)/i, { kind: 'quick', icon: '📚', short: 'Chord library', blurb: 'Any chord, any key.' }],
    [/^scales/i, { kind: 'quick', icon: '🪜', short: 'Scales', blurb: 'Any scale or mode.' }],
    [/^fingerings$/i, { kind: 'quick', icon: '🎷', short: 'Fingerings', blurb: 'Pick a note, see the keys.' }],
    [/^fingerboard$/i, { kind: 'quick', icon: '🎻', short: 'Fingerboard', blurb: 'Notes on the strings.' }],
    [/build a beat/i, { kind: 'quick', icon: '🥁', short: 'Build a beat', blurb: 'Draw a groove, hear it.' }],
    [/scale learning/i, { icon: '🎯', blurb: 'Learn a scale, then recall it.' }],
    [/hanon/i, { icon: '🖐️', blurb: 'Short patterns for even fingers.' }],
    [/repertoire/i, { icon: '🎶', blurb: 'A path of pieces, easier to harder.' }],
    [/progression/i, { icon: '🔁', blurb: 'Change chords on the beat.' }],
    [/homework/i, { icon: '📝', blurb: 'Your groove sheets to practise.' }],
    [/compose/i, { icon: '🎼', blurb: 'Write a short tune.' }],
  ];
  function kindOf(label) {
    const hit = KINDS.find(([re]) => re.test(label));
    return hit ? hit[1] : { icon: '🎵', blurb: '' };
  }
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function tile(item, info, cls, number) {
    const b = el('button', cls);
    b.type = 'button';
    b.setAttribute('aria-controls', item.panel.id);
    b.append(el('span', 'iw-icon', info.icon || '🎵'));
    const copy = el('span', 'iw-copy');
    copy.append(el('strong', '', (number ? number + '. ' : '') + (info.short || item.label)));
    if (info.blurb) copy.append(el('span', '', info.blurb));
    b.append(copy);
    b.addEventListener('click', () => show(item.panel));
    return b;
  }
  function buildHome() {
    const items = pages.map(item => ({ ...item, info: kindOf(item.label) }));
    const start = items[0];
    const quick = items.filter(i => i.info.kind === 'quick');
    const modules = items.filter(i => i !== start && !i.info.kind);
    const helps = items.filter(i => i.info.kind === 'help');
    const settings = items.find(i => i.info.kind === 'settings');
    const panel = el('div', 'iw-panel iw-home');
    panel.id = `instrument-view-${pages.length}`;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Instrument home');
    app.append(panel);
    // Compact on purpose: one row of tool tiles, then one line each for practice and chapters.
    panel.append(el('h2', 'iw-sr', 'Instrument home'));
    const row = el('div', 'iw-tiles');
    row.setAttribute('aria-label', 'Quick start');
    row.setAttribute('role', 'group');
    if (start) row.append(tile(start, { icon: '🌱', short: start.label, blurb: 'New here? Start here.' }, 'iw-tile iw-start'));
    quick.forEach(i => row.append(tile(i, i.info, 'iw-tile')));
    panel.append(row);
    function line(name, entries) {
      if (!entries.length) return;
      const wrap = el('div', 'iw-row');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', name);
      wrap.append(el('span', 'iw-row-label', name));
      entries.forEach(([icon, text, hint, go]) => {
        const chip = el('button', 'iw-chip');
        chip.type = 'button';
        chip.append(el('span', 'iw-icon', icon), el('span', '', text));
        if (hint) chip.title = hint;
        chip.addEventListener('click', go);
        wrap.append(chip);
      });
      panel.append(wrap);
    }
    line('Practice', [
      ...modules.map(i => [i.info.icon, i.label, i.info.blurb, () => show(i.panel)]),
      ...helps.map(i => ['❓', i.label, '', () => show(i.panel)]),
    ]);
    line('Chapters', [...document.querySelectorAll('main details.instrument-chapter[id^="unit-"]')].map(ch => {
      const sum = ch.querySelector(':scope > summary');
      const name = sum.querySelector('.instrument-chapter-title')?.textContent || sum.textContent.trim();
      return [sum.querySelector('.instrument-chapter-emoji')?.textContent || '📖', name,
        sum.querySelector('.instrument-chapter-description')?.textContent || '',
        () => { ch.open = true; ch.scrollIntoView({ block: 'start' }); sum.focus({ preventScroll: true }); }];
    }));
    picker.add(new Option('Home', String(pages.length)));
    pages.push({ panel, label: 'Home' });
    back.addEventListener('click', () => show(panel));
    if (settings) {
      const gear = el('button', 'iw-settings', '⚙ Sound & display');
      gear.type = 'button';
      gear.addEventListener('click', () => show(settings.panel));
      stop.after(gear);
    }
  }
  function show(panel, opts = {}) {
    app.dataset.scoreView = String(!!panel.querySelector('#guitarTechnique'));
    app.dataset.libraryView = String(!!panel.querySelector('.guitar-library'));
    const previous = pages.find(item => !item.panel.hidden);
    if (previous && previous.panel !== panel) window.AudioKit?.stopAll();
    const focusWasHidden = previous && previous.panel !== panel && previous.panel.contains(document.activeElement);
    picker.setAttribute('aria-controls', panel.id);
    picker.value = String(pages.findIndex(item => item.panel === panel));
    pages.forEach(item => {
      item.panel.hidden = item.panel !== panel;
    });
    const atHome = panel.classList.contains('iw-home');
    app.dataset.iwView = atHome ? 'home' : 'activity';
    back.hidden = atHome;
    const current = pages.find(item => item.panel === panel);
    title.textContent = atHome ? '' : current.label;
    title.hidden = atHome;
    if (!atHome && opts.scroll !== false && app.getBoundingClientRect().top < 0) app.scrollIntoView({ block: 'start' });
    const firstSound = panel.querySelector('details.fs');
    if (firstSound) firstSound.open = true;
    status.textContent = (picker.selectedOptions[0]?.textContent || '') + ' activity';
    if (focusWasHidden) picker.focus({ preventScroll: true });
    if (app.id === 'guitarWorkspace') {
      panel.querySelectorAll('#builder, #scales').forEach(section => {
        document.dispatchEvent(new CustomEvent('guitar-reveal', { detail: section.id }));
        section.hidden = false;
      });
    }
    window.dispatchEvent(new Event('resize'));
  }
  // The toolbar sticks under the site header when the page itself scrolls (piano, guitar). In the
  // app shell, where .ll-sim scrolls, nothing sits above it.
  const siteHeader = document.querySelector('.site-header');
  function setStickyTop() {
    let inner = false;
    for (let node = app.parentElement; node && node !== document.body; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) { inner = true; break; }
    }
    const pos = siteHeader ? getComputedStyle(siteHeader).position : '';
    app.style.setProperty('--iw-sticky-top', !inner && (pos === 'sticky' || pos === 'fixed') ? siteHeader.offsetHeight + 'px' : '0px');
  }
  setStickyTop();
  window.addEventListener('resize', setStickyTop);
  if (siteHeader && window.ResizeObserver) new ResizeObserver(setStickyTop).observe(siteHeader);
  if (isPiano) adoptPianoTools();
  else if (app.id === 'guitarWorkspace') adopt('progressions', 'Progressions');
  page('First sound', [app.querySelector(':scope > .fs, :scope > [data-first-sound]')]);
  const settings = app.querySelector('#pcDisplayBar, #gcDisplayBar, #drDisplayBar');
  if (isPiano && settings) {
    const essentials = settings.querySelector('.pc-builder-controls');
    if (essentials) {
      essentials.classList.add('iw-essential-controls');
      nav.after(essentials);
      // Keyboard size is a display setting: it stays on the Sound & display page so the toolbar fits one row.
      const size = essentials.querySelector('#pcSize');
      if (size) {
        const row = el('div', 'pc-builder-controls');
        row.append(essentials.querySelector('label[for="pcSize"]') || '', size);
        settings.prepend(row);
      }
    }
  }
  page('Sound & display', [settings]);
  const homework = app.querySelector('.dr-sheet-wrap');
  if (homework) app.append(homework);
  page('Chord library', [app.querySelector('.guitar-library')]);
  const sections = [...app.querySelectorAll(':scope > section, .guitar-workspace-panels > section')];
  sections.forEach(section => {
    const label = section.dataset.routeLabel || section.dataset.stageLabel || (section.classList.contains('vln-main') ? 'Fingerboard' : 'Play instrument');
    const copy = section.id === 'guitarTechnique' ? [] : [...section.querySelectorAll(':scope > p:not([role]), :scope > .section-content > p')];
    if (!isPiano && copy.length && !section.querySelector('.dr-player[data-set="builder"]')) {
      const help = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = label + ' · quick guide';
      help.append(heading, ...copy);
      app.append(help);
      page(label + ' help', [help]);
    }
    if (section.classList.contains('dr-chapter')) {
      section.classList.remove('is-collapsed');
      const content = section.querySelector('.section-content');
      if (content) { content.hidden = false; content.inert = false; }
    }
    page(label, [section]);
  });
  page('Homework sheet', [homework]);
  const guitarGuides = [...app.querySelectorAll('.guitar-tool-guide')];
  page('Guitar help', guitarGuides);
  const guitarHeader = app.querySelector('.guitar-workspace-header');
  if (guitarHeader) guitarHeader.hidden = true;
  // Tools stay beside the controls they work with: the chord builder keeps its Clear button,
  // quick grips and challenges; the saxophone studio keeps its diagram and note finder
  // (saxophone.js reaches into #sxFingeringStudio for them); the beat builder keeps its sounds.
  const drum = app.querySelector('.dr-player[data-set="builder"]');
  if (drum) {
    const studio = drum.querySelector('.drum-studio');
    if (studio && !studio.closest('details.iw-drum-sounds')) {
      const fold = document.createElement('details');
      fold.className = 'iw-drum-sounds';
      const summary = document.createElement('summary');
      summary.textContent = 'Drum sound settings';
      studio.before(fold);
      fold.append(summary, studio);
    }
    // Keep composing, listening and reading in the same activity.
    const builderPanel = pages.find(item => item.panel.contains(drum)).panel;
    const sheetPanel = pages.find(item => item.panel.contains(homework)).panel;
    window.addEventListener('groove-sheet-load', () => {
      show(builderPanel);
      drum.querySelector('.dr-play').focus({ preventScroll: true });
      drum.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    window.addEventListener('groove-sheet-added', () => {
      show(sheetPanel);
      const heading = homework.querySelector('h3');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      homework.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }
  if (isPiano) {
    const first = app.querySelector('#first-sound');
    if (first) first.open = true;
    const hint = app.querySelector('.fs-note-below');
    if (hint) hint.textContent = 'New to piano? Follow the glowing keys. Already play? Go ‹ Home and pick Chord builder, Chord library or Scales.';
  }

  // ---- Long lesson sections fold to one line each ------------------------------------------
  // Sax and violin sections run 1,000–2,400px each and piano's technique lab 1,400px. Each now
  // shows one header line until opened. The section element (its id, and the pathway signs
  // beside it) stays where it was; only its contents move into the fold body.
  function setFold(section, open) {
    const body = section.querySelector(':scope > .iw-fold-body');
    const head = section.querySelector(':scope > .iw-fold-head');
    if (!body || !head) return;
    if (open) body.removeAttribute('hidden'); else body.setAttribute('hidden', 'until-found');
    section.dataset.iwFold = open ? 'open' : 'closed';
    head.setAttribute('aria-expanded', String(open));
    head.querySelector('.iw-fold-icon').textContent = open ? 'Close ▴' : 'Open ▾';
    if (open) window.dispatchEvent(new Event('resize'));
  }
  function fold(section) {
    if (!section || section.dataset.iwFold || app.contains(section)) return;
    const h2 = section.querySelector('h2');
    const kicker = section.querySelector('.sax-kicker, .eyebrow, .vln-kicker, .section-kicker');
    const label = section.dataset.stageLabel || section.dataset.routeLabel || '';
    const body = el('div', 'iw-fold-body');
    body.id = (section.id || 'section') + '-fold';
    body.append(...section.childNodes);
    const head = el('button', 'iw-fold-head');
    head.type = 'button';
    head.setAttribute('aria-controls', body.id);
    head.append(el('span', 'iw-fold-label', label || (kicker ? kicker.textContent.trim() : '')),
      el('span', 'iw-fold-title', h2 ? h2.textContent.trim() : label), el('span', 'iw-fold-icon'));
    section.append(head, body);
    head.addEventListener('click', () => setFold(section, section.dataset.iwFold !== 'open'));
    body.addEventListener('beforematch', () => setFold(section, true));
    setFold(section, false);
  }
  function openAround(target) {
    for (let node = target; node && node !== document.body; node = node.parentElement) {
      if (node.dataset?.iwFold === 'closed') setFold(node, true);
      if (node.tagName === 'DETAILS' && !node.open) node.open = true;
    }
  }
  document.querySelectorAll('main .sax-section, main .vln-sec, main #technique-lab').forEach(fold);
  // Chapters start closed too: the Home chips and pathway open the one you want.
  document.querySelectorAll('main details.instrument-chapter[id^="unit-"][open]').forEach(ch => { ch.open = false; });
  // Printing is a handout of the whole lesson: open everything before the print planner measures.
  let printed = [];
  window.addEventListener('classroomos:print-prepare', () => {
    printed = [...document.querySelectorAll('[data-iw-fold="closed"]')];
    printed.forEach(section => setFold(section, true));
  });
  window.addEventListener('afterprint', () => { printed.forEach(section => setFold(section, false)); printed = []; });
  buildHome();
  const home = pages[pages.length - 1].panel;
  show(home, { scroll: false });
  // A homework QR link (drums.html#g1=…) opens straight into Build a beat with that groove.
  const linked = app.querySelector('.dr-player[data-from-link]');
  if (linked) { const item = pages.find(entry => entry.panel.contains(linked)); if (item) show(item.panel); }
  function reveal(hash) {
    let target;
    try { target = document.getElementById(decodeURIComponent(hash.replace(/^#/, ''))); } catch { return; }
    if (target) openAround(target);
    const item = pages.find(item => item.panel.contains(target));
    if (item) {
      show(item.panel);
      target.tabIndex = target.hasAttribute('tabindex') ? target.tabIndex : -1;
      target.focus({ preventScroll: true });
    }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) reveal(link.hash);
  }, true);
  document.getElementById('musicSection')?.addEventListener('change', event => reveal(event.target.value), true);
  window.addEventListener('hashchange', () => reveal(location.hash));
  // Any lesson script can ask for the activity that holds an element: instrument-reveal with its id.
  ['guitar-reveal', 'instrument-reveal'].forEach(type => document.addEventListener(type, event => {
    const target = document.getElementById(event.detail);
    const item = pages.find(item => item.panel.contains(target));
    if (item?.panel.hidden) show(item.panel);
  }));
  reveal(location.hash);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.target.closest('dialog, [role="dialog"]')) window.AudioKit?.stopAll();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) window.AudioKit?.stopAll();
  });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
