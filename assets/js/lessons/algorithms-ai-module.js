(() => {
  'use strict';

  const phases = [
    {
      title: 'Origins & language',
      lessons: [
        ['ai-concepts-foundations', 'Ideas before computers', 'Trace how people imagined artificial minds before they could build them.', 'Which old idea still appears in modern AI?'],
        ['blocks-world-parser', 'Blocks World parser', 'Explain how a parser turns a sentence into an action, object, and destination.', 'Where can an exact grammar help—and where will it break?'],
        ['ngram-predictor', 'N-gram predictor', 'Use counts from a small corpus to predict a likely next word.', 'Does a likely continuation prove that a system understands?'],
        ['state-machines', 'State machines', 'Model behavior as states, inputs, and transitions.', 'What must a model remember, and what can it safely forget?']
      ]
    },
    {
      title: 'Algorithms & search',
      lessons: [
        ['sorting-algorithms', 'Sorting', 'Compare how sorting strategies trade time, memory, and predictability.', 'When does the shape of the input change the best algorithm?'],
        ['a-star-pathfinding', 'A* pathfinding', 'Trace how cost-so-far and a heuristic guide a search toward a goal.', 'When can a helpful shortcut become a misleading guess?'],
        ['minimum-spanning-tree', 'Minimum spanning tree', 'Build a lowest-cost network without cycles.', 'Why is connecting everything different from finding one shortest route?'],
        ['life-lab', 'Cellular automata', 'Show how complex patterns can emerge from local rules and repeated updates.', 'Does surprising behavior require a complicated designer?']
      ]
    },
    {
      title: 'Models & judgment',
      lessons: [
        ['turing-test', 'Turing Test', 'Separate human-like conversation from evidence of understanding or capability.', 'What evidence would change your judgment about a machine?'],
        ['ai-eliza', 'ELIZA', 'Identify the pattern rules that can make a conversation feel responsive.', 'Why do people supply meaning that the program never represented?'],
        ['expert-system', 'Expert systems', 'Follow explainable if–then rules from evidence to a recommendation.', 'When are transparent rules better than learned patterns?'],
        ['perceptron-lab', 'Perceptron', 'Train a linear classifier and explain both its decision boundary and its limits.', 'What kind of pattern can one straight boundary never learn?']
      ]
    },
    {
      title: 'Game intelligence',
      lessons: [
        ['chess-origins-how-to-play', 'Chess foundations', 'Use legal moves, position, and consequences to reason about a game state.', 'What information must an AI representation preserve?'],
        ['minimax-1v1', 'Minimax', 'Trace alternating choices through a game tree and justify a best move.', 'How does an opponent’s best reply change your own choice?'],
        ['chess-ai-core', 'Chess AI', 'Compare evaluation and search styles across generations of chess programs.', 'What makes a position score useful when the game is not finished?'],
        ['go-ai', 'Go & Monte Carlo search', 'Use repeated simulations to estimate which move is most promising.', 'Why can sampling beat exhaustive search in a huge possibility space?']
      ]
    }
  ];

  const flat = phases.flatMap((phase, phaseIndex) => phase.lessons.map((lesson, index) => ({
    slug: lesson[0], title: lesson[1], goal: lesson[2], question: lesson[3], phase: phase.title, phaseIndex, index
  })));
  const slug = location.pathname.split('/').pop().replace(/\.html$/, '');
  const currentIndex = flat.findIndex(lesson => lesson.slug === slug);
  if (currentIndex < 0 || document.querySelector('[data-aai-spine]')) return;

  const current = flat[currentIndex];
  const storageKey = 'classroomos-algorithms-ai-v2';
  let complete = {};
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) complete = saved;
  } catch { storageAvailable = false; }

  const hrefFor = lessonSlug => `${lessonSlug}.html`;
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

  const spine = document.createElement('details');
  spine.className = 'aai-spine';
  spine.dataset.aaiSpine = '';
  spine.innerHTML = `
    <summary>
      <span class="aai-spine__mark" aria-hidden="true">A↯I</span>
      <span class="aai-spine__copy"><strong>Algorithms &amp; AI learning path</strong><span>${escape(current.phase)} · ${currentIndex + 1} of ${flat.length} · ${escape(current.title)}</span></span>
    </summary>
    <div class="aai-spine__map">
      ${phases.map(phase => `<section class="aai-spine__phase"><h2>${escape(phase.title)}</h2><ol>${phase.lessons.map(lesson => `<li><a href="${hrefFor(lesson[0])}" data-aai-link="${escape(lesson[0])}"${lesson[0] === slug ? ' aria-current="page"' : ''}>${escape(lesson[1])}</a></li>`).join('')}</ol></section>`).join('')}
    </div>`;

  const mission = document.createElement('details');
  mission.className = 'aai-mission';
  mission.open = true;
  mission.innerHTML = `
    <summary><span class="aai-mission__kicker">Lesson mission</span><strong>${escape(current.question)}</strong></summary>
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
  const hero = main.querySelector(':scope > .hero, :scope > .ll-hero, :scope > .ch-hero, :scope > .tt-hero, :scope > .perceptron-hero, :scope > header')
    || main.querySelector('.hero, .ll-hero, .ch-hero, .tt-hero, .perceptron-hero, header');
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
  footer.setAttribute('aria-label', 'Algorithms and AI lesson navigation');
  const previous = flat[currentIndex - 1];
  const next = flat[currentIndex + 1];
  footer.innerHTML = `
    ${previous ? `<a href="${hrefFor(previous.slug)}">← ${escape(previous.title)}</a>` : '<span></span>'}
    <button class="aai-complete" type="button" aria-pressed="${complete[slug] ? 'true' : 'false'}">${complete[slug] ? 'Lesson complete ✓' : 'Mark lesson complete'}</button>
    ${next ? `<a href="${hrefFor(next.slug)}">${escape(next.title)} →</a>` : '<a href="../../../steam-lessons.html#module-cs">Return to the module →</a>'}`;
  const localFooter = host.querySelector(':scope > footer');
  if (localFooter) host.insertBefore(footer, localFooter); else host.append(footer);

  const button = footer.querySelector('.aai-complete');
  button.addEventListener('click', () => {
    const isComplete = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(isComplete));
    button.textContent = isComplete ? 'Lesson complete ✓' : 'Mark lesson complete';
    complete[slug] = isComplete;
    try { localStorage.setItem(storageKey, JSON.stringify(complete)); } catch { storageAvailable = false; }
    spine.querySelectorAll('[data-aai-link]').forEach(link => link.classList.toggle('is-complete', Boolean(complete[link.dataset.aaiLink])));
    if (!storageAvailable) button.title = 'Progress cannot be saved in this browser.';
  });
  spine.querySelectorAll('[data-aai-link]').forEach(link => link.classList.toggle('is-complete', Boolean(complete[link.dataset.aaiLink])));
})();
