/* Keep each activity and its settings in one place; preserve live instrument state. */
(() => {
  function init() {
  'use strict';
  const app = document.querySelector('main > [data-creation-app]');
  if (!app) return;
  app.classList.add('instrument-workspace');
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
  bar.prepend(nav);
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
    picker.value = String(pages.findIndex(item => item.panel === panel));
    pages.forEach(item => {
      item.panel.hidden = item.panel !== panel;
      item.button.setAttribute('aria-pressed', String(item.panel === panel));
    });
    if (app.id === 'guitarWorkspace') {
      panel.querySelectorAll('#builder, #scales').forEach(section => {
        document.dispatchEvent(new CustomEvent('guitar-reveal', { detail: section.id }));
        section.hidden = false;
      });
    }
    window.dispatchEvent(new Event('resize'));
  }
  page(app.id === 'guitarWorkspace' ? "Let's Tune!" : 'First sound', [app.querySelector(':scope > .fs, :scope > [data-first-sound]')]);
  const settings = app.querySelector('#pcDisplayBar, #gcDisplayBar, #drDisplayBar');
  page('Sound & display', [settings]);
  const homework = app.querySelector('.dr-sheet-wrap');
  if (homework) app.append(homework);
  const sections = [...app.querySelectorAll(':scope > section, .guitar-workspace-panels > section')];
  sections.forEach(section => {
    const label = section.dataset.routeLabel || section.dataset.stageLabel || (section.classList.contains('vln-main') ? 'Fingerboard' : 'Play instrument');
    const copy = [...section.querySelectorAll(':scope > p:not([role]), :scope > .section-content > p')];
    if (copy.length) {
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
    page('Chord challenges', controls);
  }
  const saxExtras = app.querySelector('.sx-studio-extras');
  page('Fingering options', [saxExtras]);
  page('Saxophone diagram', [app.querySelector('#sxFingerDiagram')]);
  page('Find a note', [app.querySelector('.sx-note-finder')]);
  const drum = app.querySelector('.dr-player[data-set="builder"]');
  if (drum) {
    page('Drum sound settings', [drum.querySelector('.drum-studio')]);
    page('Beat options', [drum.querySelector('.dr-grid-tools')]);
    page('Beat notation', [drum.querySelector('.dr-staff-wrap')]);
    page('Beat guide', [drum.querySelector('.dr-head')]);
  }
  const initial = pages.find(item => !['First sound', "Let's Tune!", 'Sound & display', 'Homework sheet'].includes(item.button.textContent) && !item.button.textContent.endsWith(' help'));
  if (initial) show(initial.panel);
  function reveal(hash) {
    let target;
    try { target = document.getElementById(decodeURIComponent(hash.replace(/^#/, ''))); } catch { return; }
    const item = pages.find(item => item.panel.contains(target));
    if (item) show(item.panel);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) reveal(link.hash);
  }, true);
  document.getElementById('musicSection')?.addEventListener('change', event => reveal(event.target.value), true);
  window.addEventListener('hashchange', () => reveal(location.hash));
  reveal(location.hash);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
