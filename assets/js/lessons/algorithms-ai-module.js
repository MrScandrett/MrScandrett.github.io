(() => {
  'use strict';

  const phases = [
    {
      title: '1 · Foundations, Logic & Representation',
      lessons: [
        ['foundations/binary-bits-and-logic', 'Binary, Bits & Logic Gates', 'Trace how switches (0 and 1) encode numbers, pixels, and Boolean logic gates.', 'How can simple ON/OFF switches represent numbers, pictures, and addition?'],
        ['algorithms-and-ai/ai-concepts-foundations', 'Ideas before computers', 'Trace how people imagined artificial minds before they could build them.', 'Which old idea still appears in modern AI?'],
        ['algorithms-and-ai/blocks-world-parser', 'Blocks World parser', 'Explain how a parser turns a sentence into an action, object, and destination.', 'Where can an exact grammar help—and where will it break?'],
        ['algorithms-and-ai/ngram-predictor', 'N-gram predictor', 'Use counts from a small corpus to predict a likely next word.', 'Does a likely continuation prove that a system understands?'],
        ['foundations/python-foundations', 'Python foundations', 'Read, trace, and predict variables, conditionals, loops, lists, and functions in Python.', 'How do you predict what a program will print before running it?'],
        ['foundations/build-your-student-page', 'Build your student page', 'Structure, style, and publish a personal web page with semantic HTML and CSS.', 'What makes a web page clear for both human readers and browsers?'],
        ['foundations/github-collaboration', 'GitHub collaboration', 'Use commits, branches, and pull requests to track changes and collaborate safely.', 'Why is version control safer than overwriting shared files?']
      ]
    },
    {
      title: '2 · Algorithms, Structures & Search',
      lessons: [
        ['algorithms-and-ai/sorting-algorithms', 'Sorting algorithms', 'Compare how sorting strategies trade time, memory, and predictability.', 'When does the shape of the input change the best algorithm?'],
        ['algorithms-and-ai/state-machines', 'State machines', 'Model behavior as states, inputs, and transitions.', 'What must a model remember, and what can it safely forget?'],
        ['algorithms-and-ai/pathfinding', 'A* pathfinding', 'Trace how cost-so-far and a heuristic guide a search toward a goal.', 'When can a helpful shortcut become a misleading guess?'],
        ['algorithms-and-ai/minimum-spanning-tree', 'Minimum spanning tree', 'Build a lowest-cost network without cycles.', 'Why is connecting everything different from finding one shortest route?']
      ]
    },
    {
      title: '3 · Simulation, Graphics & Shaders',
      lessons: [
        ['algorithms-and-ai/life-lab', 'Cellular automata (Life Lab)', 'Show how complex patterns can emerge from local rules and repeated updates.', 'Does surprising behavior require a complicated designer?'],
        ['graphics-and-games/ascii-art-and-games', 'ASCII art & roguelikes', 'Decode characters into binary, shade 3D shapes with text, and map a dungeon grid.', 'Why separate how a world is stored in memory from how it is drawn on screen?'],
        ['graphics-and-games/perlin-noise', 'Perlin noise', 'Combine smooth gradients and octaves to generate natural procedural terrain and textures.', 'Why does plain randomness look unnatural compared to gradient noise?'],
        ['graphics-and-games/demoscene', 'The Demoscene', 'Explore how mathematical formulas generate real-time plasma, tunnels, and 3D worlds in tiny files.', 'How can math replace megabytes of stored art and video?'],
        ['graphics-and-games/cgi-water', 'CGI Water physics', 'Simulate fluid surfaces using heightfields, Gerstner waves, and reflection/refraction optics.', 'Which physical approximations make simulated water look convincing at 60 FPS?'],
        ['graphics-and-games/liquid-engine-showcase', 'Liquid Engine benchmark', 'Compare 3D vertex shader displacement against 2D column wave models across different fluids.', 'How do viscosity and damping change wave propagation across materials?'],
        ['graphics-and-games/webxr-gallery', 'WebXR 3D gallery', 'Build an accessible 3D exhibit room in the browser that scales from desktop to VR headsets.', 'Why must every 3D interaction have a flat, keyboard-accessible equivalent?']
      ]
    },
    {
      title: '4 · Artificial Intelligence & Game Trees',
      lessons: [
        ['algorithms-and-ai/turing-test', 'Turing Test', 'Separate human-like conversation from evidence of understanding or capability.', 'What evidence would change your judgment about a machine?'],
        ['algorithms-and-ai/ai-eliza', 'ELIZA chatbot', 'Identify the pattern rules that can make a conversation feel responsive.', 'Why do people supply meaning that the program never represented?'],
        ['algorithms-and-ai/expert-system', 'Expert systems', 'Follow explainable if–then rules from evidence to a recommendation.', 'When are transparent rules better than learned patterns?'],
        ['algorithms-and-ai/perceptron-lab', 'Perceptron lab', 'Train a linear classifier and explain both its decision boundary and its limits.', 'What kind of pattern can one straight boundary never learn?'],
        ['algorithms-and-ai/chess-origins-how-to-play', 'Chess foundations', 'Use legal moves, position, and consequences to reason about a game state.', 'What information must an AI representation preserve?'],
        ['algorithms-and-ai/minimax-1v1', 'Minimax & Alpha-Beta', 'Trace alternating choices through a game tree and justify a best move.', 'How does an opponent’s best reply change your own choice?'],
        ['algorithms-and-ai/chess-ai-core', 'Chess AI history', 'Compare evaluation and search styles across generations of chess programs.', 'What makes a position score useful when the game is not finished?'],
        ['algorithms-and-ai/go-ai', 'Go & Monte Carlo search', 'Use repeated simulations to estimate which move is most promising.', 'Why can sampling beat exhaustive search in a huge possibility space?']
      ]
    },
    {
      title: '5 · Pioneers, Security & Digital Society',
      lessons: [
        ['pioneers/ada-lovelace', 'Ada Lovelace', 'Trace the steps of Lovelace’s 1843 Bernoulli algorithm and her vision of symbolic computing.', 'Why did Lovelace see beyond numerical calculation to music and symbols?'],
        ['pioneers/grace-hopper', 'Grace Hopper', 'Explain how compilers translate human-readable source code into machine binary.', 'Why should computers absorb the burden of translating human language?'],
        ['pioneers/margaret-hamilton', 'Margaret Hamilton', 'Compare priority-scheduled software architecture against FIFO queues under overload.', 'How did priority scheduling save the Apollo 11 lunar landing?'],
        ['pioneers/steve-jobs', 'Steve Jobs', 'Trace the graphical user interface from Xerox PARC to the Macintosh and multi-touch devices.', 'How does interface design shape who can use a computer?'],
        ['security/cryptography-enigma', 'Cryptography & The Enigma', 'Encrypt and decrypt messages across Caesar shifts, Enigma rotors, and RSA modular arithmetic.', 'Why does modern security rely on mathematical asymmetry rather than secret machines?'],
        ['security/ethical-hacking-cyber-safety', 'Ethical hacking & cyber safety', 'Evaluate permission boundaries, cipher weaknesses, phishing clues, and password entropy.', 'What separates an ethical security researcher from an attacker?'],
        ['security/ai-hacking', 'AI hacking & prompt injection', 'Test layered technical controls against prompt injection and unauthorized agent actions.', 'Why can behavioral prompt rules never replace enforced permission boundaries?']
      ]
    },
    {
      title: '6 · Game Design, Engines & Lab Guides',
      lessons: [
        ['graphics-and-games/inside-classic-snake', 'Inside Classic Snake', 'Step through the grid coordinates, array head/tail updates, and collision checks of Snake.', 'How do four repeatable rules create a complete arcade game?'],
        ['graphics-and-games/game-design-thinking', 'What Makes a Game? (MDA)', 'Analyze games through Mechanics, Dynamics, and Aesthetics across game history.', 'How do small rule changes transform how a game feels to play?'],
        ['foundations/vscode-game-dev-setup', 'VS Code for Game Dev', 'Configure a local editor, Live Server, and browser DevTools console for debugging.', 'How do you find and fix a bug using the browser console?'],
        ['graphics-and-games/from-scratch-browser-game', 'From Scratch: Browser Game', 'Build a real-time HTML5 Canvas game loop with keyboard input and AABB collisions.', 'Why must every frame clear, update state, and redraw in order?'],
        ['graphics-and-games/pygame-game-loop', 'Python & Pygame Game Loop', 'Inspect input, delta-time physics, and rectangle collisions frame-by-frame in Pygame.', 'Why does multiplying speed by delta time keep movement fair across frame rates?'],
        ['graphics-and-games/2d-game-engines', '2D Engines: Kaplay & Phaser', 'Compare how 2D engines organize scenes, sprites, physics bodies, and events.', 'When should you build from scratch versus reaching for a game engine?'],
        ['graphics-and-games/rosetta-2d', 'Rosetta 2D Engine', 'Explore a readable 2D engine built on scene trees, fixed timesteps, and JSON tilemaps.', 'How do scene trees and tilemaps transfer across every major engine?'],
        ['graphics-and-games/tool-rosetta', 'Tool Rosetta Reference', 'Translate core game and 3D concepts across Godot, Unity, Unreal, Blender, and CAD tools.', 'Which underlying concepts stay identical even when software menus change?'],
        ['graphics-and-games/trail-game-builder', 'Trail Game Builder: Make Your Own Oregon Trail', 'Build a resource-management survival game with state, a weighted event table, and landmark choices, then design a spin-off.', 'How can one data object let you turn a wagon trip into a Mars mission without rewriting the rules?'],
        ['graphics-and-games/lemonade-tycoon-builder', 'Lemonade Tycoon Builder: Make Your Own Business Game', 'Build a supply-and-demand economy game with a demand formula, an unreliable forecast, random events and compounding upgrades, then design a spin-off.', 'Why does the best price sit exactly halfway between cost and the price where nobody buys?'],
        ['graphics-and-games/text-adventure-builder', 'Text Adventure Builder: Make Your Own Zork', 'Build a type-your-commands adventure with rooms as a graph, a verb-and-noun parser, an inventory and flags, then check the map with breadth-first search.', 'How can a computer prove your puzzle can be solved before anyone plays it?'],
        ['graphics-and-games/roguelike-builder', 'Roguelike Builder: Make Your Own Rogue', 'Build a seeded dungeon crawler with Rogue’s rooms, a turn-based loop and chasing monsters, check the generator with flood fill, and walk your dungeon in 3D in Crawlspace.', 'How can one word build exactly the same dungeon on every computer in the room?'],
        ['graphics-and-games/game-jam-week', 'Game Jam Week Playbook', 'Scope a playable minimum viable game, plan daily sprints, and run a playtest.', 'How do you cut scope so your core game loop ships on time?'],
        ['graphics-and-games/steam-games-vr-access', 'Steam & VR Launch Protocol', 'Follow the lab’s Offline Mode and Meta Quest Steam Link setup cleanly and courteously.', 'How do shared lab protocols keep equipment ready for the next student?']
      ]
    }
  ];

  const flat = phases.flatMap((phase, phaseIndex) => phase.lessons.map((lesson, index) => ({
    relPath: lesson[0],
    slug: lesson[0].split('/').pop(),
    title: lesson[1],
    goal: lesson[2],
    question: lesson[3],
    phase: phase.title,
    phaseIndex,
    index
  })));

  const pathParts = location.pathname.split('/');
  const csIdx = pathParts.lastIndexOf('computer-science');
  const currentRel = csIdx >= 0
    ? pathParts.slice(csIdx + 1).join('/').replace(/\.html$/, '')
    : pathParts.slice(-2).join('/').replace(/\.html$/, '');
  const slug = location.pathname.split('/').pop().replace(/\.html$/, '');

  const currentIndex = flat.findIndex(lesson => lesson.relPath === currentRel || lesson.slug === slug);
  if (currentIndex < 0 || document.querySelector('[data-aai-spine]')) return;

  const current = flat[currentIndex];
  const storageKey = 'classroomos-algorithms-ai-v2';
  let complete = {};
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) complete = saved;
  } catch { storageAvailable = false; }

  const csRootPrefix = csIdx >= 0 ? '../'.repeat(Math.max(0, pathParts.length - csIdx - 2)) : '../';
  const hrefFor = relPath => `${csRootPrefix}${relPath}.html`;
  const pathwayHref = `${csRootPrefix}computer-science-pathway.html`;

  if (!document.querySelector('link[href*="algorithms-ai-module.css"]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${csRootPrefix}../../assets/css/lessons/algorithms-ai-module.css`;
    document.head.appendChild(css);
  }

  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

  const spine = document.createElement('details');
  spine.className = 'aai-spine';
  spine.dataset.aaiSpine = '';
  spine.innerHTML = `
    <summary>
      <span class="aai-spine__mark" aria-hidden="true">CS↯AI</span>
      <span class="aai-spine__copy"><strong>Computer Science &amp; AI Pathway</strong><span>${escape(current.phase)} · Lesson ${currentIndex + 1} of ${flat.length} · ${escape(current.title)}</span></span>
    </summary>
    <div class="aai-spine__map">
      ${phases.map(phase => `<section class="aai-spine__phase"><h2>${escape(phase.title)}</h2><ol>${phase.lessons.map(lesson => {
        const lSlug = lesson[0].split('/').pop();
        return `<li><a href="${hrefFor(lesson[0])}" data-aai-link="${escape(lSlug)}"${lSlug === current.slug ? ' aria-current="page"' : ''}>${escape(lesson[1])}</a></li>`;
      }).join('')}</ol></section>`).join('')}
    </div>`;

  const mission = document.createElement('details');
  mission.className = 'aai-mission';
  mission.open = true;
  mission.innerHTML = `
    <summary><span class="aai-mission__kicker">Lesson mission · <a href="${pathwayHref}" style="color:inherit;text-decoration:underline;">View full CS Pathway</a></span><strong>${escape(current.question)}</strong></summary>
    <div class="aai-mission__body">
      <p class="aai-mission__goal"><strong>You will be able to:</strong> ${escape(current.goal)}</p>
      <ol class="aai-trace" aria-label="Model tracing routine">
        <li><b>Predict</b>Say what you expect before changing the model.</li>
        <li><b>Run</b>Change one input or rule and observe the result.</li>
        <li><b>Inspect</b>Name the evidence that explains what happened.</li>
        <li><b>Explain</b>State a limit, trade-off, or next test.</li>
      </ol>
    </div>`;

  const main = document.querySelector('main, #main-content');
  if (!main) return;
  const hero = main.querySelector(':scope > .hero, :scope > .ll-hero, :scope > .ch-hero, :scope > .tt-hero, :scope > .perceptron-hero, :scope > .cl-hero, :scope > .pf-hero, :scope > .al-hero, :scope > .fl-hero, :scope > .as-hero, :scope > .pn-hero, :scope > .cgi-hero, :scope > .r2-hero, :scope > .tr-hero, :scope > .snake-hero, :scope > .sp-hero, :scope > .web-hero, :scope > header')
    || main.querySelector('.hero, .ll-hero, .ch-hero, .tt-hero, .perceptron-hero, .cl-hero, .pf-hero, .al-hero, .fl-hero, .as-hero, .pn-hero, .cgi-hero, .r2-hero, .tr-hero, .snake-hero, .sp-hero, .web-hero, header');
  const host = hero?.parentElement || main;
  if (hero) {
    host.insertBefore(spine, hero);
    hero.insertAdjacentElement('afterend', mission);
  } else {
    main.prepend(mission);
    main.prepend(spine);
  }

  const footer = document.createElement('nav');
  footer.className = 'aai-footer-nav';
  footer.setAttribute('aria-label', 'Computer Science pathway lesson navigation');
  const previous = flat[currentIndex - 1];
  const next = flat[currentIndex + 1];
  footer.innerHTML = `
    ${previous ? `<a href="${hrefFor(previous.relPath)}">← ${escape(previous.title)}</a>` : `<a href="${pathwayHref}">← CS &amp; AI Pathway Hub</a>`}
    <button class="aai-complete" type="button" aria-pressed="${complete[current.slug] ? 'true' : 'false'}">${complete[current.slug] ? 'Lesson complete ✓' : 'Mark lesson complete'}</button>
    ${next ? `<a href="${hrefFor(next.relPath)}">${escape(next.title)} →</a>` : `<a href="${pathwayHref}">Complete · Return to CS Pathway →</a>`}`;
  const localFooter = host.querySelector(':scope > footer');
  if (localFooter) host.insertBefore(footer, localFooter); else host.append(footer);

  const button = footer.querySelector('.aai-complete');
  button.addEventListener('click', () => {
    const isComplete = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(isComplete));
    button.textContent = isComplete ? 'Lesson complete ✓' : 'Mark lesson complete';
    complete[current.slug] = isComplete;
    try { localStorage.setItem(storageKey, JSON.stringify(complete)); } catch { storageAvailable = false; }
    spine.querySelectorAll('[data-aai-link]').forEach(link => link.classList.toggle('is-complete', Boolean(complete[link.dataset.aaiLink])));
    if (!storageAvailable) button.title = 'Progress cannot be saved in this browser.';
  });
  spine.querySelectorAll('[data-aai-link]').forEach(link => link.classList.toggle('is-complete', Boolean(complete[link.dataset.aaiLink])));
})();
