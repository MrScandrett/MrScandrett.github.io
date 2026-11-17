(function () {
  'use strict';

  /* ══════════════════════════════════════════
     STARTER + EXAMPLE CODE
  ══════════════════════════════════════════ */
  const STARTER = {
    html: [
      '<!-- Week 1: build your learning path.',
      '     Use Tutorial 2 for landmarks and',
      '     Tutorial 3 for lesson-like sections. -->',
      '',
      '<h1>My Page</h1>',
      '<p>Hi! I\'m ... and this is my page.</p>',
      '',
      '<!-- try adding:',
      '  <header>...</header>',
      '  <main>',
      '    <section><h2>About Me</h2>...</section>',
      '    <section><h2>My Lab</h2>...</section>',
      '    <section><h2>My Games</h2>...</section>',
      '  </main>',
      '-->',
      '',
    ].join('\n'),
    css: [
      '/* Week 2: build a tiny design system.',
      '   Follow Tutorials 4 and 5. Pick one',
      '   background, text color, and accent. */',
      '',
      'body {',
      '  font-family: sans-serif;',
      '}',
      '',
    ].join('\n'),
    js: [
      '// Week 3: make it respond.',
      '// 1) find an element',
      '// 2) listen for a click',
      '// 3) change something',
      '',
    ].join('\n'),
  };

  const EXAMPLE = {
    html: [
      '<!-- START HERE: Replace Alex\'s words with your own. -->',
      '<header class="hero">',
      '  <p class="eyebrow">Student field notes · Grade 7</p>',
      '  <h1>Alex\'s Launch Pad</h1>',
      '  <p>Builder of rockets, models, and pixel worlds.</p>',
      '  <nav><a href="#about">About</a> <a href="#lab">Lab</a> <a href="#games">Games</a></nav>',
      '</header>',
      '',
      '<main class="project-grid">',
      '  <section class="lesson-card" id="about">',
      '    <p class="eyebrow">01 · Orient</p>',
      '    <h2>About Me</h2>',
      '    <p>I like 3D printing, astronomy, and my dog Mo.</p>',
      `    <figure data-zoomable>
  <img data-lightbox-group="build-your-student-page" src="https://mrscandrett.github.io/assets/thumbs/dna.png" alt="Colorful DNA artwork">
  <figcaption>Colorful DNA artwork</figcaption>
</figure>`,
      '  </section>',
      '',
      '  <section class="lesson-card" id="lab">',
      '    <p class="eyebrow">02 · Investigate</p>',
      '    <h2>My Rocket Lab</h2>',
      '    <p>I predicted 12-degree fins would fly farthest. My rocket reached 41 feet.</p>',
      '    <button id="reveal-btn" type="button">Reveal my conclusion</button>',
      '    <p id="result" aria-live="polite"></p>',
      '  </section>',
      '',
      '  <section class="lesson-card" id="games">',
      '    <p class="eyebrow">03 · Create</p>',
      '    <h2>My Games</h2>',
      '    <p><a href="https://scratch.mit.edu">Play my Scratch game →</a></p>',
      '  </section>',
      '</main>',
      '<footer>Built, tested, and revised by Alex.</footer>',
    ].join('\n'),
    css: [
      '/* START HERE: Change --accent to your favorite bright color. */',
      ':root {',
      '  --page: #0c0f14;',
      '  --card: #151b24;',
      '  --text: #e8ecf2;',
      '  --muted: #aab6c3;',
      '  --accent: #50c8aa;',
      '  --space: 1rem;',
      '  --radius: 14px;',
      '}',
      '',
      '* { box-sizing: border-box; }',
      '',
      'body {',
      '  margin: 0;',
      '  font-family: system-ui, sans-serif;',
      '  background: var(--page);',
      '  color: var(--text);',
      '  line-height: 1.6;',
      '}',
      '',
      '.hero {',
      '  padding: 40px max(20px, 7vw);',
      '  border-bottom: 1px solid #33404d;',
      '}',
      '',
      'h1 { margin: 0; color: var(--accent); }',
      '.eyebrow { color: var(--accent); text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: 1px; }',
      'a { color: var(--accent); }',
      'nav a { margin-right: 12px; }',
      '',
      '.project-grid {',
      '  display: grid;',
      '  grid-template-columns: 1fr;',
      '  gap: var(--space);',
      '  padding: var(--space);',
      '}',
      '',
      '.lesson-card {',
      '  background: var(--card);',
      '  border: 1px solid #33404d;',
      '  border-radius: var(--radius);',
      '  padding: var(--space);',
      '}',
      '',
      'img { max-width: 100%; border-radius: 10px; }',
      '',
      'button {',
      '  background: var(--accent);',
      '  color: #07120f;',
      '  border: none;',
      '  padding: 10px 18px;',
      '  border-radius: 999px;',
      '  font-weight: bold;',
      '  cursor: pointer;',
      '}',
      'button:focus-visible, a:focus-visible { outline: 3px solid #ffb454; outline-offset: 3px; }',
      'footer { padding: 24px; color: var(--muted); text-align: center; }',
      '',
      '@media (min-width: 720px) {',
      '  .project-grid { grid-template-columns: repeat(2, 1fr); }',
      '  #games { grid-column: 1 / -1; }',
      '}',
    ].join('\n'),
    js: [
      '// START HERE: Change the conclusion inside the quote marks.',
      'var button = document.getElementById("reveal-btn");',
      'var result = document.getElementById("result");',
      'button.addEventListener("click", function () {',
      '  result.textContent = "The 12-degree fins balanced stability and low drag.";',
      '});',
    ].join('\n'),
  };

  function makeBundleCSS(accent, page, card) {
    return [
      '/* START HERE: Try changing the three colors below. */',
      ':root {',
      '  --page: ' + page + ';',
      '  --card: ' + card + ';',
      '  --text: #f3f7f5;',
      '  --muted: #b7c4cc;',
      '  --accent: ' + accent + ';',
      '}',
      '',
      '* { box-sizing: border-box; }',
      'body { margin: 0; font-family: system-ui, sans-serif; background: var(--page); color: var(--text); line-height: 1.6; }',
      '.hero { padding: 40px max(20px, 7vw); border-bottom: 1px solid #40505c; }',
      '.eyebrow { color: var(--accent); text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: 1px; }',
      'h1, h2 { line-height: 1.15; }',
      'h1 { margin: 0; color: var(--accent); }',
      '.grid { display: grid; grid-template-columns: 1fr; gap: 16px; padding: 16px; }',
      '.card { background: var(--card); border: 1px solid #40505c; border-radius: 14px; padding: 18px; }',
      'img { display: block; width: 100%; max-width: 360px; border-radius: 10px; }',
      'a { color: var(--accent); }',
      'button { border: none; border-radius: 999px; padding: 10px 16px; background: var(--accent); color: #07110e; font-weight: bold; cursor: pointer; }',
      'button:focus-visible, a:focus-visible { outline: 3px solid #ffffff; outline-offset: 3px; }',
      'footer { padding: 24px; color: var(--muted); text-align: center; }',
      '@media (min-width: 720px) { .grid { grid-template-columns: repeat(2, 1fr); } }',
    ].join('\n');
  }

  const BUNDLES = [
    {
      name: 'Learning Portfolio',
      note: 'A home page for your interests, lab work, and games.',
      html: EXAMPLE.html,
      css: EXAMPLE.css,
      js: EXAMPLE.js,
    },
    {
      name: 'Science Lab Report',
      note: 'Question, evidence, conclusion, and one reveal button.',
      html: [
        '<!-- START HERE: Replace the sample rocket results with your own. -->',
        '<header class="hero">',
        '  <p class="eyebrow">Science field notes</p>',
        '  <h1>Which fin angle flies farthest?</h1>',
        '  <p>My bottle-rocket test of 6°, 12°, and 18° fins.</p>',
        '</header>',
        '<main class="grid">',
        '  <section class="card">',
        '    <h2>Question and prediction</h2>',
        '    <p>I predicted the 12° fins would balance stability and drag.</p>',
        `    <figure data-zoomable>
  <img data-lightbox-group="build-your-student-page" src="https://mrscandrett.github.io/assets/thumbs/dna.png" alt="Colorful science artwork used as a project placeholder">
  <figcaption>Colorful science artwork used as a project placeholder</figcaption>
</figure>`,
        '  </section>',
        '  <section class="card">',
        '    <h2>Evidence</h2>',
        '    <p>6° flew 31 feet. 12° flew 41 feet. 18° flew 35 feet.</p>',
        '    <a href="https://www.grc.nasa.gov/www/k-12/rocket/">Read about rocket forces →</a>',
        '  </section>',
        '  <section class="card">',
        '    <h2>Conclusion</h2>',
        '    <button id="reveal-btn" type="button">Reveal my conclusion</button>',
        '    <p id="result" aria-live="polite">Make a prediction before you click.</p>',
        '  </section>',
        '</main>',
        '<footer>Tested and explained by Your Name.</footer>',
      ].join('\n'),
      css: makeBundleCSS('#65d6ff', '#0c1420', '#152536'),
      js: [
        '// START HERE: Change the result sentence to match your evidence.',
        'var button = document.getElementById("reveal-btn");',
        'var result = document.getElementById("result");',
        'button.addEventListener("click", function () {',
        '  result.textContent = "The 12-degree fins flew farthest in my test.";',
        '});',
      ].join('\n'),
    },
    {
      name: 'Game Showcase',
      note: 'Feature two games and generate a play-test challenge.',
      html: [
        '<!-- START HERE: Rename the games and replace the descriptions. -->',
        '<header class="hero">',
        '  <p class="eyebrow">My game studio</p>',
        '  <h1>Games by Your Name</h1>',
        '  <p>I build small worlds, test them, and improve one rule at a time.</p>',
        '</header>',
        '<main class="grid">',
        '  <section class="card">',
        '    <h2>Maze Runner</h2>',
        `    <figure data-zoomable>
  <img data-lightbox-group="build-your-student-page" src="https://mrscandrett.github.io/assets/thumbs/code-org-thumb.jpg" alt="A colorful computer-coding project thumbnail">
  <figcaption>A colorful computer-coding project thumbnail</figcaption>
</figure>`,
        '    <p>Reach the exit while learning how each switch changes the maze.</p>',
        '    <a href="https://scratch.mit.edu">Play my game →</a>',
        '  </section>',
        '  <section class="card">',
        '    <h2>Sky Collector</h2>',
        '    <p>Collect stars, avoid storms, and beat your best time.</p>',
        '    <a href="https://scratch.mit.edu">Play my game →</a>',
        '  </section>',
        '  <section class="card">',
        '    <h2>Play-test challenge</h2>',
        '    <button id="challenge-btn" type="button">Give me a challenge</button>',
        '    <p id="challenge" aria-live="polite">Click when you are ready to test.</p>',
        '  </section>',
        '</main>',
        '<footer>Designed and tested by Your Name.</footer>',
      ].join('\n'),
      css: makeBundleCSS('#ffcf5a', '#14101f', '#241b35'),
      js: [
        '// START HERE: Add your own play-test ideas to this list.',
        'var challenges = ["Play without sound.", "Teach a new player.", "Find one confusing rule."];',
        'var button = document.getElementById("challenge-btn");',
        'var message = document.getElementById("challenge");',
        'button.addEventListener("click", function () {',
        '  var pick = Math.floor(Math.random() * challenges.length);',
        '  message.textContent = challenges[pick];',
        '});',
      ].join('\n'),
    },
  ];

  const CODE_BLOCKS = [
    {
      file: 'html', name: 'Content card', note: 'Heading + explanation',
      fixed: 'section, heading, and paragraph tags', change: 'the project title and explanation',
      snippet: ['<section class="card">', '  <h2>My New Project</h2>', '  <p>Explain what you made, tested, and learned.</p>', '</section>'].join('\n'),
    },
    {
      file: 'html', name: 'Picture + caption', note: 'Includes helpful alt text',
      fixed: 'figure, image, alt text, and caption pattern', change: 'the image address and descriptions',
      snippet: ['<figure data-zoomable data-lightbox-group="build-your-student-page">', '  <img src="https://mrscandrett.github.io/assets/thumbs/dna.png" alt="Describe what matters in your picture">', '  <figcaption>Explain what the viewer should notice.</figcaption>', '</figure>'].join('\n'),
    },
    {
      file: 'html', name: 'Reveal controls', note: 'Pair with Reveal action',
      fixed: 'matching ids and the screen-reader message area', change: 'the button label',
      snippet: ['<button id="reveal-btn" type="button">Reveal my answer</button>', '<p id="result" aria-live="polite"></p>'].join('\n'),
    },
    {
      file: 'css', name: 'Card look', note: 'Background, space, border',
      fixed: 'selector and property names', change: 'colors, spacing, and corner size',
      snippet: ['.card {', '  background: #151b24;', '  border: 1px solid #40505c;', '  border-radius: 14px;', '  padding: 18px;', '}'].join('\n'),
    },
    {
      file: 'css', name: 'Two-column grid', note: 'Stacks on small screens',
      fixed: 'mobile-first grid and media-query pattern', change: 'gap, breakpoint, or number of columns',
      snippet: ['.grid {', '  display: grid;', '  grid-template-columns: 1fr;', '  gap: 16px;', '}', '', '@media (min-width: 720px) {', '  .grid { grid-template-columns: repeat(2, 1fr); }', '}'].join('\n'),
    },
    {
      file: 'js', name: 'Reveal action', note: 'Works with Reveal controls',
      fixed: 'find → listen → change pattern', change: 'the message inside the quote marks',
      snippet: ['var button = document.getElementById("reveal-btn");', 'var result = document.getElementById("result");', '', 'button.addEventListener("click", function () {', '  result.textContent = "Write your answer here.";', '});'].join('\n'),
    },
  ];

  /* ══════════════════════════════════════════
     STATE + PERSISTENCE
  ══════════════════════════════════════════ */
  const LS_KEY = 'student-page-code-v1';
  let code = { html: STARTER.html, css: STARTER.css, js: STARTER.js };
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && typeof saved.html === 'string') code = saved;
  } catch (e) { /* fresh start */ }

  let current = 'html';
  const input = document.getElementById('code-input');
  const tabs = { html: document.getElementById('tab-html'), css: document.getElementById('tab-css'), js: document.getElementById('tab-js') };

  function selectTab(which) {
    code[current] = input.value;
    current = which;
    input.value = code[which];
    Object.keys(tabs).forEach(function (k) {
      tabs[k].className = 'ed-tab' + (k === which ? ' active-' + which : '');
      tabs[k].setAttribute('aria-selected', k === which ? 'true' : 'false');
    });
  }
  tabs.html.addEventListener('click', function () { selectTab('html'); });
  tabs.css.addEventListener('click', function () { selectTab('css'); });
  tabs.js.addEventListener('click', function () { selectTab('js'); });

  document.querySelectorAll('[data-open-file]').forEach(function (button) {
    button.addEventListener('click', function () {
      selectTab(button.getAttribute('data-open-file'));
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('studio').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(function () { input.focus(); }, 450);
    });
  });

  /* ══════════════════════════════════════════
     OPTIONAL BLOCK BUILDER + STARTER BUNDLES
  ══════════════════════════════════════════ */
  const blockColumns = document.getElementById('block-columns');
  const bundleList = document.getElementById('bundle-list');
  const builderStatus = document.getElementById('builder-status');
  let draggedBlock = null;

  function fileLabel(file) {
    return file === 'html' ? 'index.html' : file === 'css' ? 'style.css' : 'script.js';
  }

  function plantSnippet(block) {
    code[current] = input.value;
    if (current === block.file) {
      const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
      const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : start;
      const before = input.value.slice(0, start);
      const after = input.value.slice(end);
      const lead = before && !/\n\s*$/.test(before) ? '\n\n' : '';
      const tail = after && !/^\s*\n/.test(after) ? '\n\n' : '';
      input.value = before + lead + block.snippet + tail + after;
      const cursor = (before + lead + block.snippet).length;
      input.setSelectionRange(cursor, cursor);
      code[current] = input.value;
    } else {
      const existing = code[block.file].replace(/\s+$/, '');
      code[block.file] = (existing ? existing + '\n\n' : '') + block.snippet + '\n';
      selectTab(block.file);
      input.setSelectionRange(input.value.length, input.value.length);
    }
    persist();
    scheduleRender();
    input.focus();
    builderStatus.textContent = 'Added “' + block.name + '” to ' + fileLabel(block.file) + '. Change the sample words to make it yours.';
  }

  ['html', 'css', 'js'].forEach(function (file) {
    const column = document.createElement('section');
    column.className = 'block-column';
    column.setAttribute('data-file', file);
    const heading = document.createElement('h4');
    heading.textContent = fileLabel(file);
    const list = document.createElement('div');
    list.className = 'code-block-list';

    CODE_BLOCKS.filter(function (block) { return block.file === file; }).forEach(function (block) {
      const card = document.createElement('div');
      card.className = 'code-block';
      card.draggable = true;
      card.setAttribute('aria-grabbed', 'false');
      card.setAttribute('title', 'Drag into the editor or press Add');

      const grip = document.createElement('span');
      grip.className = 'block-grip';
      grip.setAttribute('aria-hidden', 'true');
      grip.textContent = '⠿';

      const copy = document.createElement('span');
      copy.className = 'block-name';
      copy.textContent = block.name;
      const note = document.createElement('span');
      note.className = 'block-note';
      note.textContent = block.note;
      copy.appendChild(note);

      const addButton = document.createElement('button');
      addButton.className = 'plant-btn';
      addButton.type = 'button';
      addButton.textContent = 'Add';
      addButton.setAttribute('aria-label', 'Add ' + block.name + ' to ' + fileLabel(file));
      addButton.addEventListener('click', function () { plantSnippet(block); });

      const peek = document.createElement('details');
      peek.className = 'block-peek';
      const peekSummary = document.createElement('summary');
      peekSummary.textContent = 'Show the typed code';
      const learning = document.createElement('p');
      const fixedLabel = document.createElement('strong');
      fixedLabel.textContent = 'Fixed: ';
      const choiceLabel = document.createElement('strong');
      choiceLabel.textContent = ' Your choice: ';
      learning.appendChild(fixedLabel);
      learning.appendChild(document.createTextNode(block.fixed + '.'));
      learning.appendChild(choiceLabel);
      learning.appendChild(document.createTextNode(block.change + '.'));
      const preview = document.createElement('pre');
      preview.textContent = block.snippet;
      peek.appendChild(peekSummary);
      peek.appendChild(learning);
      peek.appendChild(preview);

      card.addEventListener('dragstart', function (event) {
        draggedBlock = block;
        card.setAttribute('aria-grabbed', 'true');
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('text/plain', block.name);
        builderStatus.textContent = 'Drop “' + block.name + '” anywhere inside the code editor.';
      });
      card.addEventListener('dragend', function () {
        draggedBlock = null;
        card.setAttribute('aria-grabbed', 'false');
        input.classList.remove('is-drop-target');
      });

      card.appendChild(grip);
      card.appendChild(copy);
      card.appendChild(addButton);
      card.appendChild(peek);
      list.appendChild(card);
    });

    column.appendChild(heading);
    column.appendChild(list);
    blockColumns.appendChild(column);
  });

  input.addEventListener('dragover', function (event) {
    if (!draggedBlock) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    input.classList.add('is-drop-target');
  });
  input.addEventListener('dragleave', function () { input.classList.remove('is-drop-target'); });
  input.addEventListener('drop', function (event) {
    if (!draggedBlock) return;
    event.preventDefault();
    const block = draggedBlock;
    draggedBlock = null;
    input.classList.remove('is-drop-target');
    document.querySelectorAll('.code-block[aria-grabbed="true"]').forEach(function (card) { card.setAttribute('aria-grabbed', 'false'); });
    plantSnippet(block);
  });

  BUNDLES.forEach(function (bundle) {
    const card = document.createElement('article');
    card.className = 'bundle-card';
    const heading = document.createElement('h4');
    heading.textContent = bundle.name;
    const note = document.createElement('p');
    note.textContent = bundle.note;
    const files = document.createElement('div');
    files.className = 'bundle-files';
    ['index.html', 'style.css', 'script.js'].forEach(function (name) {
      const chip = document.createElement('span');
      chip.textContent = name;
      files.appendChild(chip);
    });
    const button = document.createElement('button');
    button.className = 'bundle-btn';
    button.type = 'button';
    button.textContent = 'Load this bundle';
    button.addEventListener('click', function () {
      if (!window.confirm('Load “' + bundle.name + '”? This replaces all three code files.')) return;
      code = { html: bundle.html, css: bundle.css, js: bundle.js };
      current = 'html';
      input.value = code.html;
      selectTab('html');
      persist();
      scheduleRender();
      builderStatus.textContent = 'Loaded “' + bundle.name + '.” Start with the START HERE comments in each file.';
      input.focus();
    });
    card.appendChild(heading);
    card.appendChild(note);
    card.appendChild(files);
    card.appendChild(button);
    bundleList.appendChild(card);
  });

  /* Tab key inserts two spaces instead of leaving the editor?
     No — keep Tab for keyboard navigation (accessibility). Students indent with spaces. */

  function persist() {
    code[current] = input.value;
    try { localStorage.setItem(LS_KEY, JSON.stringify(code)); } catch (e) { /* storage full/blocked */ }
  }

  /* ══════════════════════════════════════════
     LIVE PREVIEW
  ══════════════════════════════════════════ */
  const frame = document.getElementById('preview-frame');
  let runtimeIssues = [];
  let designMode = false;

  /* ══════════════════════════════════════════
     DESIGN MODE — click, type, drag, and resize
     directly in the live preview, Wix-style.
     Runs INSIDE the sandboxed iframe: talks to the
     parent only through postMessage, and only ever
     touches its own document.
  ══════════════════════════════════════════ */
  function designModeRuntime() {
    var UI = '__dz_ui';
    var HOVER = '__dz_hover';
    var SELECTED = '__dz_selected';

    var style = document.createElement('style');
    style.textContent = [
      '.' + HOVER + '{outline:2px dashed #50c8aa !important;outline-offset:2px;cursor:pointer;}',
      '.' + SELECTED + '{outline:3px solid #50c8aa !important;outline-offset:2px;}',
      '[contenteditable="true"]{outline:3px dashed #f3de64 !important;outline-offset:2px;cursor:text;}',
      '.' + UI + '{position:fixed;z-index:2147483647;font:700 11px/1.2 system-ui,sans-serif;}',
      '.__dz_toolbar{display:flex;gap:4px;background:#0c0f14;border:1px solid #50c8aa;border-radius:8px;padding:4px;box-shadow:0 4px 12px rgba(0,0,0,.35);}',
      '.__dz_toolbar button{border:none;background:#151b24;color:#e8ecf2;border-radius:5px;padding:4px 7px;cursor:pointer;font:800 11px system-ui,sans-serif;}',
      '.__dz_toolbar button:hover{background:#50c8aa;color:#07110e;}',
      '.__dz_grip{width:22px;height:22px;display:grid;place-items:center;background:#0c0f14;color:#50c8aa;border:1px solid #50c8aa;border-radius:6px;cursor:grab;}',
      '.__dz_handle{width:16px;height:16px;background:#50c8aa;border:2px solid #07110e;border-radius:50%;cursor:nwse-resize;}',
    ].join('');
    document.head.appendChild(style);

    var selected = null;
    var toolbar = null, grip = null, handle = null;

    function isUI(el) { return !!(el && el.closest && el.closest('.' + UI)); }

    function syncToParent() {
      var clone = document.body.cloneNode(true);
      var kill = clone.querySelectorAll('script, .' + UI);
      for (var i = 0; i < kill.length; i++) { if (kill[i].parentNode) kill[i].parentNode.removeChild(kill[i]); }
      var editable = clone.querySelectorAll('[contenteditable]');
      for (var j = 0; j < editable.length; j++) editable[j].removeAttribute('contenteditable');
      var marked = clone.querySelectorAll('.' + HOVER + ', .' + SELECTED);
      for (var k = 0; k < marked.length; k++) {
        marked[k].classList.remove(HOVER, SELECTED);
        if (!marked[k].getAttribute('class')) marked[k].removeAttribute('class');
      }
      window.parent.postMessage({ source: 'student-page-designer', html: clone.innerHTML }, '*');
    }

    var REPLACED = { IMG: 1, VIDEO: 1, CANVAS: 1, SVG: 1, IFRAME: 1 };
    function nearestBlock(el) {
      while (el && el !== document.body && el.nodeType === 1) {
        if (REPLACED[el.tagName]) return el;
        var d = getComputedStyle(el).display;
        if (d === 'block' || d === 'grid' || d === 'flex' || d === 'inline-block' || d === 'list-item') return el;
        el = el.parentElement;
      }
      return null;
    }

    function isTextLeaf(el) {
      if (!el) return false;
      var bad = { SCRIPT: 1, STYLE: 1, IMG: 1, IFRAME: 1, SVG: 1, HR: 1, BR: 1 };
      if (bad[el.tagName]) return false;
      for (var i = 0; i < el.children.length; i++) {
        var d = getComputedStyle(el.children[i]).display;
        if (d === 'block' || d === 'grid' || d === 'flex' || d === 'list-item') return false;
      }
      return true;
    }

    function removeUI() {
      [toolbar, grip, handle].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
      toolbar = grip = handle = null;
    }

    function positionUI() {
      if (!selected) return;
      var r = selected.getBoundingClientRect();
      if (toolbar) { toolbar.style.left = Math.max(4, r.left) + 'px'; toolbar.style.top = Math.max(4, r.top - 34) + 'px'; }
      if (grip) { grip.style.left = (r.left - 11) + 'px'; grip.style.top = (r.top + r.height / 2 - 11) + 'px'; }
      if (handle) { handle.style.left = (r.right - 9) + 'px'; handle.style.top = (r.bottom - 9) + 'px'; }
    }

    function clearSelection() {
      if (selected) selected.classList.remove(SELECTED);
      selected = null;
      removeUI();
    }

    function startEdit(el) {
      el.setAttribute('contenteditable', 'true');
      el.focus();
      function commit() {
        el.removeEventListener('blur', commit);
        el.removeEventListener('keydown', onKey);
        el.removeAttribute('contenteditable');
        syncToParent();
        positionUI();
      }
      function onKey(e) {
        if (e.key === 'Escape') { el.blur(); }
        else if (e.key === 'Enter' && el.tagName !== 'P' && el.tagName !== 'LI') { e.preventDefault(); el.blur(); }
      }
      el.addEventListener('blur', commit);
      el.addEventListener('keydown', onKey);
    }

    function startResize(e, el) {
      e.preventDefault(); e.stopPropagation();
      var startX = e.clientX, startY = e.clientY;
      var startRect = el.getBoundingClientRect();
      function onMove(ev) {
        var w = Math.max(24, Math.round(startRect.width + (ev.clientX - startX)));
        var h = Math.max(16, Math.round(startRect.height + (ev.clientY - startY)));
        el.style.width = w + 'px';
        el.style.maxWidth = 'none';
        if (el.tagName === 'IMG') { el.style.height = 'auto'; } else { el.style.height = h + 'px'; }
        positionUI();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        syncToParent();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    function startReorder(e, el) {
      e.preventDefault(); e.stopPropagation();
      var parent = el.parentNode;
      var placeholder = document.createElement('div');
      placeholder.className = UI;
      placeholder.style.cssText = 'height:4px;background:#50c8aa;border-radius:3px;margin:2px 0;';
      function onMove(ev) {
        var target = document.elementFromPoint(ev.clientX, ev.clientY);
        var sib = target;
        while (sib && sib.parentNode !== parent) sib = sib.parentNode;
        if (sib && sib !== el && sib.parentNode === parent && !sib.classList.contains(UI)) {
          var r = sib.getBoundingClientRect();
          var before = ev.clientY < r.top + r.height / 2;
          parent.insertBefore(placeholder, before ? sib : sib.nextSibling);
        }
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (placeholder.parentNode) {
          placeholder.parentNode.insertBefore(el, placeholder);
          placeholder.parentNode.removeChild(placeholder);
        }
        positionUI();
        syncToParent();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    function buildUI(el) {
      removeUI();
      toolbar = document.createElement('div');
      toolbar.className = UI + ' __dz_toolbar';
      if (isTextLeaf(el)) {
        var editBtn = document.createElement('button');
        editBtn.type = 'button'; editBtn.textContent = '✏️ Type';
        editBtn.addEventListener('click', function () { startEdit(el); });
        toolbar.appendChild(editBtn);
      }
      var dupBtn = document.createElement('button');
      dupBtn.type = 'button'; dupBtn.textContent = '⧉ Copy';
      dupBtn.addEventListener('click', function () {
        var copy = el.cloneNode(true);
        el.parentNode.insertBefore(copy, el.nextSibling);
        select(copy);
        syncToParent();
      });
      toolbar.appendChild(dupBtn);
      var delBtn = document.createElement('button');
      delBtn.type = 'button'; delBtn.textContent = '🗑️ Delete';
      delBtn.addEventListener('click', function () {
        el.parentNode.removeChild(el);
        clearSelection();
        syncToParent();
      });
      toolbar.appendChild(delBtn);
      document.documentElement.appendChild(toolbar);

      if (el.parentElement && el.parentElement.children.length > 1) {
        grip = document.createElement('div');
        grip.className = UI + ' __dz_grip';
        grip.title = 'Drag to move';
        grip.textContent = '⠿';
        document.documentElement.appendChild(grip);
        grip.addEventListener('mousedown', function (e) { startReorder(e, el); });
      }

      handle = document.createElement('div');
      handle.className = UI + ' __dz_handle';
      handle.title = 'Drag to resize';
      document.documentElement.appendChild(handle);
      handle.addEventListener('mousedown', function (e) { startResize(e, el); });
    }

    function select(el) {
      if (selected) selected.classList.remove(SELECTED);
      selected = el;
      el.classList.add(SELECTED);
      el.classList.remove(HOVER);
      buildUI(el);
      positionUI();
    }

    document.addEventListener('mouseover', function (e) {
      if (isUI(e.target)) return;
      var block = nearestBlock(e.target);
      if (block && block !== selected) block.classList.add(HOVER);
    });
    document.addEventListener('mouseout', function (e) {
      if (isUI(e.target)) return;
      var block = nearestBlock(e.target);
      if (block) block.classList.remove(HOVER);
    });
    document.addEventListener('click', function (e) {
      if (isUI(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      var block = nearestBlock(e.target);
      if (!block) { clearSelection(); return; }
      if (selected === block) { positionUI(); return; }
      select(block);
    }, true);

    window.addEventListener('scroll', positionUI, true);
    window.addEventListener('resize', positionUI);
  }

  function buildDoc() {
    const safeCSS = code.css.replace(/<\/style/gi, '<\\/style');
    const safeJS = code.js.replace(/<\/script/gi, '<\\/script');
    const errorBridge = [
      'window.addEventListener("error", function (event) {',
      '  parent.postMessage({ source: "student-page-debugger", message: event.message || "Unknown JavaScript error" }, "*");',
      '});',
      'try {',
      safeJS,
      '} catch (error) {',
      '  parent.postMessage({ source: "student-page-debugger", message: (error.name || "Error") + ": " + error.message }, "*");',
      '}',
    ].join('\n');
    const designScript = designMode ? '<script>(' + designModeRuntime.toString() + ')();<\/script>' : '';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<style>' + safeCSS + '<\/style></head><body>' + code.html +
      designScript +
      '<script>' + errorBridge + '<\/script></body></html>';
  }

  window.addEventListener('message', function (event) {
    if (event.source !== frame.contentWindow || !event.data) return;
    if (event.data.source === 'student-page-debugger') {
      const message = String(event.data.message || 'Unknown JavaScript error');
      if (!runtimeIssues.some(function (issue) { return issue.message === message; })) {
        runtimeIssues.push({ message: message });
        runDebugger();
      }
      return;
    }
    if (event.data.source === 'student-page-designer' && typeof event.data.html === 'string') {
      code.html = event.data.html;
      if (current === 'html') input.value = code.html;
      persist();
      runChecks();
      runDebugger();
    }
  });

  const designToggle = document.getElementById('btn-design-mode');
  const designHint = document.getElementById('design-hint');
  designToggle.addEventListener('click', function () {
    designMode = !designMode;
    designToggle.setAttribute('aria-pressed', designMode ? 'true' : 'false');
    designToggle.textContent = designMode ? '🖱️ Design mode: On' : '🖱️ Design mode';
    designHint.hidden = !designMode;
    frame.srcdoc = buildDoc();
  });

  let renderTimer = null;
  function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(function () {
      runtimeIssues = [];
      frame.srcdoc = buildDoc();
      runChecks();
      runDebugger();
    }, 350);
  }

  input.addEventListener('input', function () {
    persist();
    scheduleRender();
  });

  /* ══════════════════════════════════════════
     CHECKLISTS — auto-graded missions
  ══════════════════════════════════════════ */
  function parseHTML() {
    return new DOMParser().parseFromString('<body>' + code.html + '</body>', 'text/html');
  }

  /* ══════════════════════════════════════════
     CODE COACH — explain likely blunders
  ══════════════════════════════════════════ */
  const debugOutput = document.getElementById('debug-output');
  const debugSummary = document.getElementById('debug-summary');

  function sourceLine(source, index) {
    return source.slice(0, index).split('\n').length;
  }

  function issue(level, file, title, why, fix) {
    return { level: level, file: file, title: title, why: why, fix: fix };
  }

  function addUnique(issues, next) {
    const key = next.file + '|' + next.title + '|' + next.fix;
    if (!issues.some(function (item) { return item.key === key; })) {
      next.key = key;
      issues.push(next);
    }
  }

  function checkHTML(issues, doc) {
    const uncommented = code.html.replace(/<!--[\s\S]*?-->/g, '');
    const pairedTags = ['header', 'nav', 'main', 'section', 'article', 'div', 'button', 'footer'];

    pairedTags.forEach(function (tag) {
      const opens = (uncommented.match(new RegExp('<' + tag + '(?:\\s|>)', 'gi')) || []).length;
      const closes = (uncommented.match(new RegExp('<\\/' + tag + '\\s*>', 'gi')) || []).length;
      if (opens !== closes) {
        addUnique(issues, issue('error', 'html', 'The <' + tag + '> tags do not pair up',
          'There are ' + opens + ' opening and ' + closes + ' closing ' + tag + ' tags. The browser may swallow or rearrange everything after the mismatch.',
          opens > closes ? 'Add ' + (opens - closes) + ' missing </' + tag + '> tag' + (opens - closes === 1 ? '' : 's') + '.' : 'Remove the extra </' + tag + '> or add its opening <' + tag + '> tag.'));
      }
    });

    const seenIds = Object.create(null);
    Array.from(doc.querySelectorAll('[id]')).forEach(function (element) {
      const id = element.id.trim();
      if (!id) return;
      if (seenIds[id]) {
        addUnique(issues, issue('error', 'html', 'The id "' + id + '" is used more than once',
          'An id must name exactly one element. JavaScript may find the wrong one.',
          'Rename one id, then update the matching CSS selector or JavaScript lookup.'));
      }
      seenIds[id] = true;
    });

    Array.from(doc.querySelectorAll('img')).forEach(function (image) {
      if (!image.hasAttribute('alt')) {
        addUnique(issues, issue('warning', 'html', 'An image is missing alt text',
          'A screen reader cannot explain this image, and no description appears if it fails to load.',
          'Add alt="a short description of what matters in the image". Use alt="" only for decoration.'));
      }
    });

    Array.from(doc.querySelectorAll('a')).forEach(function (link) {
      const href = (link.getAttribute('href') || '').trim();
      if (!href || href === '#') {
        addUnique(issues, issue('warning', 'html', 'A link has nowhere useful to go',
          'A missing or placeholder href makes the link look ready even though it will not open a destination.',
          'Replace href="#" with a real page address or section id, such as href="#lab".'));
      }
    });

    Array.from(doc.querySelectorAll('button:not([type])')).forEach(function () {
      addUnique(issues, issue('tip', 'html', 'A button does not say what type it is',
        'Buttons inside forms submit by default, which can suddenly reload a page later.',
        'Add type="button" unless this button is intentionally submitting a form.'));
    });

    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    headings.forEach(function (heading, index) {
      if (!index) return;
      const previous = Number(headings[index - 1].tagName.slice(1));
      const currentLevel = Number(heading.tagName.slice(1));
      if (currentLevel > previous + 1) {
        addUnique(issues, issue('warning', 'html', 'A heading jumps from h' + previous + ' to h' + currentLevel,
          'Skipped levels make the page outline harder to follow with assistive technology.',
          'Use h' + (previous + 1) + ' here, or add the missing heading level before it.'));
      }
    });

    if (/<script\b/i.test(uncommented)) {
      addUnique(issues, issue('tip', 'html', 'JavaScript is mixed into index.html',
        'This studio already joins the three files for you. A script tag in the HTML pane can run at an unexpected time.',
        'Move the code between <script> and <\/script> into script.js, then remove the script tags.'));
    }
  }

  function cssBraceReport(source) {
    let depth = 0;
    let line = 1;
    let quote = '';
    let escaped = false;
    let comment = false;
    let extraCloseLine = 0;
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      const next = source[i + 1];
      if (char === '\n') line++;
      if (comment) {
        if (char === '*' && next === '/') { comment = false; i++; }
        continue;
      }
      if (!quote && char === '/' && next === '*') { comment = true; i++; continue; }
      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth < 0 && !extraCloseLine) extraCloseLine = line;
      }
    }
    return { depth: depth, extraCloseLine: extraCloseLine };
  }

  function checkCSS(issues, doc) {
    const braceReport = cssBraceReport(code.css);
    if (braceReport.extraCloseLine) {
      addUnique(issues, issue('error', 'css', 'Extra } near line ' + braceReport.extraCloseLine,
        'This closes a style rule that was not open, so the browser may ignore the rules that follow.',
        'Remove that } or add the missing selector and opening { before it.'));
    } else if (braceReport.depth > 0) {
      addUnique(issues, issue('error', 'css', braceReport.depth + ' closing } missing',
        'An unfinished rule can cause the browser to ignore later styles.',
        'Add a } after the final property in the unfinished rule.'));
    }

    const cleanCSS = code.css.replace(/\/\*[\s\S]*?\*\//g, '');
    const missingColon = /(?:^|[;{]\s*)([a-zA-Z-]+)\s+([^:{};]+);/gm;
    let colonMatch;
    while ((colonMatch = missingColon.exec(cleanCSS)) && issues.length < 12) {
      const property = colonMatch[1];
      addUnique(issues, issue('error', 'css', 'Possible missing : after "' + property + '"',
        'CSS declarations need a colon between the property and its value.',
        'On about line ' + sourceLine(cleanCSS, colonMatch.index) + ', write ' + property + ': ' + colonMatch[2].trim() + ';'));
    }

    const declaration = /([a-zA-Z-]+)\s*:\s*([^;{}]+);/g;
    let declarationMatch;
    let unsupportedCount = 0;
    while ((declarationMatch = declaration.exec(cleanCSS)) && unsupportedCount < 3) {
      const property = declarationMatch[1];
      const value = declarationMatch[2].trim();
      if (property.indexOf('--') === 0 || typeof CSS === 'undefined' || CSS.supports(property, value)) continue;
      unsupportedCount++;
      addUnique(issues, issue('warning', 'css', 'The browser does not recognize "' + property + ': ' + value + '"',
        'The property may be misspelled, or the value may not belong to that property.',
        'Check the spelling near line ' + sourceLine(cleanCSS, declarationMatch.index) + '. Compare it with a working rule in Tutorial 4 or 5.'));
    }

    const classNames = new Set();
    const selectorRule = /([^{}]+)\{/g;
    let selectorMatch;
    while ((selectorMatch = selectorRule.exec(cleanCSS))) {
      const selector = selectorMatch[1];
      if (selector.trim().indexOf('@') === 0) continue;
      let classMatch;
      const classPattern = /\.([a-zA-Z][\w-]*)/g;
      while ((classMatch = classPattern.exec(selector))) classNames.add(classMatch[1]);
    }
    let unusedCount = 0;
    classNames.forEach(function (name) {
      if (unusedCount >= 2) return;
      let usedInHTML = false;
      try { usedInHTML = !!doc.querySelector('.' + CSS.escape(name)); } catch (e) { /* invalid selector */ }
      const usedInJS = code.js.indexOf(name) !== -1;
      if (!usedInHTML && !usedInJS) {
        unusedCount++;
        addUnique(issues, issue('tip', 'css', 'The .' + name + ' style does not match anything yet',
          'The class appears in style.css but not in your HTML or JavaScript, so the rule cannot change the preview.',
          'Add class="' + name + '" to the intended HTML element, or correct the spelling on one side.'));
      }
    });
  }

  function checkJavaScript(issues, doc) {
    try {
      new Function(code.js);
    } catch (error) {
      addUnique(issues, issue('error', 'js', error.name + ': ' + error.message,
        'The browser cannot start script.js until its grammar is complete.',
        'Look just before the reported spot for a missing quote, parenthesis, brace, comma, or closing bracket.'));
    }

    const typoChecks = [
      { pattern: /getElementByID/, wrong: 'getElementByID', right: 'getElementById' },
      { pattern: /addEventlistener/, wrong: 'addEventlistener', right: 'addEventListener' },
      { pattern: /queryselector/, wrong: 'queryselector', right: 'querySelector' },
      { pattern: /textcontent/, wrong: 'textcontent', right: 'textContent' },
    ];
    typoChecks.forEach(function (check) {
      if (check.pattern.test(code.js)) {
        addUnique(issues, issue('error', 'js', 'JavaScript is case-sensitive: "' + check.wrong + '"',
          'That spelling names a different, nonexistent command.',
          'Change it to ' + check.right + ' exactly, including capital letters.'));
      }
    });

    const idLookup = /getElementById\s*\(\s*(['"])(.*?)\1\s*\)/g;
    let idMatch;
    while ((idMatch = idLookup.exec(code.js))) {
      const target = idMatch[2];
      if (target.charAt(0) === '#') {
        addUnique(issues, issue('error', 'js', 'getElementById should not include #',
          'The # belongs to CSS selectors, but getElementById expects only the id name.',
          'Change getElementById("' + target + '") to getElementById("' + target.slice(1) + '").'));
      } else if (!doc.getElementById(target)) {
        addUnique(issues, issue('warning', 'js', 'JavaScript cannot find id="' + target + '"',
          'The lookup returns null, so a later click listener or text change may crash.',
          'Add id="' + target + '" to the intended HTML element, or make both spellings match exactly.'));
      }
    }

    const selectorLookup = /querySelector\s*\(\s*(['"])(.*?)\1\s*\)/g;
    let queryMatch;
    while ((queryMatch = selectorLookup.exec(code.js))) {
      const selector = queryMatch[2];
      try {
        if (!doc.querySelector(selector)) {
          addUnique(issues, issue('warning', 'js', 'querySelector("' + selector + '") finds nothing',
            'JavaScript cannot listen to or change an element that is missing from the HTML.',
            'Check whether ' + selector + ' needs a # for an id, a . for a class, or a corrected spelling.'));
        }
      } catch (error) {
        addUnique(issues, issue('error', 'js', '"' + selector + '" is not a valid selector',
          'querySelector uses CSS selector grammar.',
          'Use #name for an id, .name for a class, or a tag name such as button.'));
      }
    }

    runtimeIssues.forEach(function (runtime) {
      let why = 'The JavaScript started, but it stopped while the preview was running.';
      let fix = 'Read the message, find the named variable or method, and test one correction at a time.';
      if (/null|undefined/i.test(runtime.message) && /propert|reading|set/i.test(runtime.message)) {
        why = 'JavaScript probably tried to use an HTML element it could not find.';
        fix = 'Check the id or selector spelling in HTML and JavaScript. Make sure that element actually exists.';
      } else if (/is not defined/i.test(runtime.message)) {
        why = 'The code used a variable name that has not been created, or whose spelling/capitalization differs.';
        fix = 'Find that name in script.js and match it to the earlier var, let, or const declaration.';
      } else if (/is not a function/i.test(runtime.message)) {
        why = 'The object exists, but the method name is wrong or belongs to a different kind of value.';
        fix = 'Check the method spelling and the value stored in the variable immediately before this line.';
      }
      addUnique(issues, issue('error', 'js', 'Live preview: ' + runtime.message, why, fix));
    });
  }

  function renderDebugger(issues) {
    const order = { error: 0, warning: 1, tip: 2 };
    issues.sort(function (a, b) { return order[a.level] - order[b.level]; });
    debugOutput.textContent = '';

    const errors = issues.filter(function (item) { return item.level === 'error'; }).length;
    const warnings = issues.filter(function (item) { return item.level === 'warning'; }).length;
    const tips = issues.filter(function (item) { return item.level === 'tip'; }).length;
    debugSummary.className = 'debug-summary' + (errors ? ' has-errors' : warnings ? ' has-warnings' : '');
    const summaryText = debugSummary.querySelector('span:last-child');

    if (!issues.length) {
      summaryText.textContent = 'No likely coding blunders found in this pass.';
      const empty = document.createElement('div');
      empty.className = 'debug-empty';
      empty.textContent = 'Your code is structurally clear. Next, test every link and button with both a mouse and the Tab key—good code can still need a usability revision.';
      debugOutput.appendChild(empty);
      return;
    }

    const parts = [];
    if (errors) parts.push(errors + ' error' + (errors === 1 ? '' : 's'));
    if (warnings) parts.push(warnings + ' warning' + (warnings === 1 ? '' : 's'));
    if (tips) parts.push(tips + ' tip' + (tips === 1 ? '' : 's'));
    summaryText.textContent = 'Found ' + parts.join(', ') + '. Fix errors first, then rerun the check.';

    issues.slice(0, 10).forEach(function (item) {
      const row = document.createElement('article');
      row.className = 'debug-issue ' + item.level;

      const badge = document.createElement('span');
      badge.className = 'debug-level';
      badge.textContent = item.level.toUpperCase();

      const copy = document.createElement('div');
      copy.className = 'debug-copy';
      const title = document.createElement('h4');
      title.textContent = item.title;
      const why = document.createElement('p');
      why.textContent = 'Why it matters: ' + item.why;
      const fix = document.createElement('p');
      fix.textContent = 'Try this: ' + item.fix;
      copy.appendChild(title);
      copy.appendChild(why);
      copy.appendChild(fix);

      const fileButton = document.createElement('button');
      fileButton.className = 'debug-file';
      fileButton.type = 'button';
      fileButton.textContent = item.file === 'html' ? 'index.html' : item.file === 'css' ? 'style.css' : 'script.js';
      fileButton.addEventListener('click', function () {
        selectTab(item.file);
        input.focus();
      });

      row.appendChild(badge);
      row.appendChild(copy);
      row.appendChild(fileButton);
      debugOutput.appendChild(row);
    });
  }

  function runDebugger() {
    code[current] = input.value;
    const doc = parseHTML();
    const issues = [];
    checkHTML(issues, doc);
    checkCSS(issues, doc);
    checkJavaScript(issues, doc);
    renderDebugger(issues);
  }

  document.getElementById('btn-debug').addEventListener('click', function () {
    persist();
    runDebugger();
    scheduleRender();
  });

  const WEEKS = [
    { id: 1, checks: [
      { label: 'One big <code>&lt;h1&gt;</code> title', test: function (d) { return d.querySelectorAll('h1').length >= 1; } },
      { label: 'A paragraph <code>&lt;p&gt;</code> about you', test: function (d) { return Array.from(d.querySelectorAll('p')).some(function (p) { return p.textContent.trim().length > 10; }); } },
      { label: 'One <code>&lt;main&gt;</code> tag that holds your content', test: function (d) { return d.querySelectorAll('main').length === 1; } },
      { label: '3+ <code>&lt;section&gt;</code>s, each with a heading', test: function (d) { return Array.from(d.querySelectorAll('section')).filter(function (s) { return s.querySelector('h2'); }).length >= 3; } },
      { label: 'A <code>&lt;header&gt;</code> or <code>&lt;nav&gt;</code> to welcome visitors', test: function (d) { return !!d.querySelector('header, nav'); } },
      { label: 'An image with <code>alt</code> text', test: function (d) { return Array.from(d.querySelectorAll('img')).some(function (i) { return (i.getAttribute('alt') || '').trim().length > 2; }); } },
      { label: 'A link <code>&lt;a href&gt;</code> to one of your projects', test: function (d) { return Array.from(d.querySelectorAll('a')).some(function (a) { return (a.getAttribute('href') || '').length > 3; }); } },
    ]},
    { id: 2, checks: [
      { label: 'Style the <code>body</code> (font, background…)', test: function () { return /body\s*\{[^}]*[a-z-]+\s*:/i.test(code.css); } },
      { label: 'Set a <code>background</code> somewhere', test: function () { return /background(-color)?\s*:/i.test(code.css); } },
      { label: 'Set a text <code>color</code>', test: function () { return /(^|[^-])color\s*:/im.test(code.css); } },
      { label: 'Make your own class, like <code>.name { }</code>', test: function () { return /\.[a-zA-Z][\w-]*\s*\{/.test(code.css); } },
      { label: 'At least 3 style rules', test: function () { return (code.css.match(/\{/g) || []).length >= 3; } },
      { label: 'Reuse a color with a <code>--variable</code>', test: function () { return /--[a-zA-Z][\w-]*\s*:/.test(code.css) && /var\(\s*--/.test(code.css); } },
      { label: 'Arrange things with <code>grid</code> or <code>flex</code>', test: function () { return /display\s*:\s*(grid|flex)/i.test(code.css); } },
    ]},
    { id: 3, checks: [
      { label: 'A <code>&lt;button&gt;</code> on your page', test: function (d) { return d.querySelectorAll('button').length >= 1; } },
      { label: 'Find an element (<code>getElementById</code> / <code>querySelector</code>)', test: function () { return /(getElementById|querySelector)/.test(code.js); } },
      { label: 'Listen with <code>addEventListener</code>', test: function () { return /addEventListener/.test(code.js); } },
      { label: 'Change the page (<code>textContent</code>, <code>style</code>, <code>classList</code>…)', test: function () { return /(textContent|innerHTML|classList|\.style\b|setAttribute)/.test(code.js); } },
    ]},
  ];

  /* build checklist DOM */
  WEEKS.forEach(function (week) {
    const list = document.getElementById('wk-' + week.id + '-list');
    week.els = week.checks.map(function (chk) {
      const item = document.createElement('div');
      item.className = 'check-item';
      item.innerHTML = '<span class="tick" aria-hidden="true"></span><span>' + chk.label + '</span>';
      list.appendChild(item);
      return item;
    });
  });

  function runChecks() {
    const doc = parseHTML();
    WEEKS.forEach(function (week) {
      let passed = 0;
      week.checks.forEach(function (chk, i) {
        let ok = false;
        try { ok = !!chk.test(doc); } catch (e) { ok = false; }
        week.els[i].classList.toggle('ok', ok);
        if (ok) passed++;
      });
      const card = document.getElementById('wk-' + week.id);
      const badge = document.getElementById('wk-' + week.id + '-badge');
      const done = passed === week.checks.length;
      card.classList.toggle('done', done);
      badge.textContent = done ? '✓ COMPLETE' : passed + '/' + week.checks.length;
    });
  }

  /* ══════════════════════════════════════════
     EXAMPLE / RESET / DOWNLOAD
  ══════════════════════════════════════════ */
  document.getElementById('btn-example').addEventListener('click', function () {
    if (!window.confirm('Load the finished example? This replaces everything in all three files.')) return;
    code = { html: EXAMPLE.html, css: EXAMPLE.css, js: EXAMPLE.js };
    input.value = code[current];
    persist();
    scheduleRender();
  });

  document.getElementById('btn-reset').addEventListener('click', function () {
    if (!window.confirm('Reset all three files back to the starter code? Your current work will be erased.')) return;
    code = { html: STARTER.html, css: STARTER.css, js: STARTER.js };
    input.value = code[current];
    persist();
    scheduleRender();
  });

  document.getElementById('btn-download').addEventListener('click', function () {
    code[current] = input.value;
    const doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>My Student Page</title>\n<style>\n' + code.css + '\n</style>\n</head>\n<body>\n' +
      code.html + '\n<script>\n' + code.js + '\n<\/script>\n</body>\n</html>\n';
    const blob = new Blob([doc], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'my-student-page.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  input.value = code[current];
  frame.srcdoc = buildDoc();
  runChecks();
  runDebugger();
})();
