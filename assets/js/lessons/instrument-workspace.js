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
  label.textContent = 'Activity ';
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
  const guide = document.createElement('p');
  guide.className = 'iw-guide';
  guide.id = 'instrument-workspace-guide';
  guide.textContent = 'Start with First sound. Choose an Activity to explore more. Use Tab to move between controls, then Enter or Space to press a button. Start with your volume low. Stop sound ends playback.';
  picker.setAttribute('aria-describedby', guide.id);
  bar.after(guide);
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
  const status = document.createElement('span');
  status.className = 'iw-status';
  status.setAttribute('role', 'status');
  nav.append(status);
  const pages = [];
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
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-controls', panel.id);
    button.addEventListener('click', () => show(panel));
    button.hidden = true;
    nav.append(button);
    picker.add(new Option(label, String(pages.length)));
    pages.push({ panel, button });
  }
  function show(panel) {
    app.dataset.scoreView = String(!!panel.querySelector('#guitarTechnique'));
    const previous = pages.find(item => !item.panel.hidden);
    if (previous && previous.panel !== panel) window.AudioKit?.stopAll();
    const focusWasHidden = previous && previous.panel !== panel && previous.panel.contains(document.activeElement);
    picker.setAttribute('aria-controls', panel.id);
    picker.value = String(pages.findIndex(item => item.panel === panel));
    pages.forEach(item => {
      item.panel.hidden = item.panel !== panel;
      item.button.setAttribute('aria-pressed', String(item.panel === panel));
    });
    const firstSound = panel.querySelector('details.fs');
    if (firstSound) firstSound.open = true;
    status.textContent = picker.selectedOptions[0]?.textContent + ' activity';
    if (focusWasHidden) picker.focus({ preventScroll: true });
    if (app.id === 'guitarWorkspace') {
      panel.querySelectorAll('#builder, #scales').forEach(section => {
        document.dispatchEvent(new CustomEvent('guitar-reveal', { detail: section.id }));
        section.hidden = false;
      });
    }
    window.dispatchEvent(new Event('resize'));
  }
  page('First sound', [app.querySelector(':scope > .fs, :scope > [data-first-sound]')]);
  const settings = app.querySelector('#pcDisplayBar, #gcDisplayBar, #drDisplayBar');
  if (isPiano && settings) {
    const essentials = settings.querySelector('.pc-builder-controls');
    if (essentials) { essentials.classList.add('iw-essential-controls'); bar.after(essentials); }
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
  // Less frequent tasks have their own view, leaving playback beside the instrument.
  const options = app.querySelector('#builder .gc-builder-wrap, #builder .pc-builder-wrap');
  if (options) {
    const controls = [...options.children].filter(node => node.matches('.gc-quick-grips, #gcChallengeReadout') || node.querySelector('#gcChallengeBuilder, #pcChallengeBuilder'));
    if (isPiano) {
      const clear = app.querySelector('#pcClearBuilder');
      if (clear && controls[0]) options.prepend(clear);
    }
    page('Chord challenges', controls);
  }
  const saxExtras = app.querySelector('.sx-studio-extras');
  page('Fingering options', [saxExtras]);
  page('Saxophone diagram', [app.querySelector('#sxFingerDiagram')]);
  page('Find a note', [app.querySelector('.sx-note-finder')]);
  const drum = app.querySelector('.dr-player[data-set="builder"]');
  if (drum) {
    page('Drum sound settings', [drum.querySelector('.drum-studio')]);
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
    if (hint) hint.textContent = 'New to piano? Follow the glowing keys. Already play? Choose Chord builder or Progressions from the Activity menu above.';
  }
  if (pages[0]) show(pages[0].panel);
  function reveal(hash) {
    let target;
    try { target = document.getElementById(decodeURIComponent(hash.replace(/^#/, ''))); } catch { return; }
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
  document.addEventListener('guitar-reveal', event => {
    const target = document.getElementById(event.detail);
    const item = pages.find(item => item.panel.contains(target));
    if (item?.panel.hidden) show(item.panel);
  });
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
