/*
 * "Try the exhibit" links from lessons to Mr. Scandrett's puzzle games in the
 * showcase (apps/<slug>/). Loaded by lesson-print-button.js, which every lesson
 * already includes, so a new link only needs an entry in LINKS below.
 * Keyed by path under /lessons/; each entry is [app slug, why it fits this lesson].
 */
(function () {
  'use strict';

  var EXHIBITS = {
    'eight-queens': 'Eight Queens',
    'tower-of-hanoi': 'Tower of Hanoi',
    'knights-tour': 'Knight’s Tour',
    'sliding-puzzle': 'Sliding Puzzle',
    'nim': 'Nim',
    'lights-out': 'Lights Out',
    'life-puzzles': 'Life Puzzles',
    'magic-squares': 'Magic Squares',
    'mini-sudoku': 'Mini Sudoku',
    'river-crossing': 'River Crossing',
    'peg-solitaire': 'Peg Solitaire'
  };

  var LINKS = {
    'computer-science/algorithms-and-ai/pathfinding.html': [
      ['sliding-puzzle', 'The same A* search from this lesson, solving the 8- and 15-puzzles. It reports how many positions it examined to find the shortest solution.'],
      ['river-crossing', 'Breadth-first search on a tiny puzzle: only 10 safe arrangements, and the first time the search reaches the far bank is the shortest answer.'],
      ['peg-solitaire', 'Depth-first search with a memory of dead ends found this 31-jump solution. Watch it play back.'],
      ['eight-queens', 'Backtracking, animated square by square: place, hit a dead end, undo, try the next column.']
    ],
    'computer-science/algorithms-and-ai/minimax-1v1.html': [
      ['nim', 'A game with a perfect strategy you can learn: the computer uses binary to know which positions are lost, the result minimax would reach by searching every move.'],
      ['tower-of-hanoi', 'Minimax calls itself on smaller boards; Hanoi is the classic first example of that kind of recursion.']
    ],
    'computer-science/algorithms-and-ai/life-lab.html': [
      ['life-puzzles', 'Goal-based Game of Life challenges: build a still life, an oscillator, a spaceship, and a pattern that dies out.']
    ],
    'computer-science/algorithms-and-ai/chess-origins-how-to-play.html': [
      ['knights-tour', 'Make the knight visit every square exactly once, a puzzle Euler studied in 1759.'],
      ['eight-queens', 'Place eight queens so none can capture another. There are 92 ways.']
    ],
    'computer-science/algorithms-and-ai/chess-ai-core.html': [
      ['knights-tour', 'Warnsdorff’s rule (1823) finishes a knight’s tour without any lookahead: a heuristic, like a chess engine’s evaluation, doing the work of search.'],
      ['eight-queens', 'The backtracking search at the heart of game-tree programs, on a simpler chess puzzle.']
    ],
    'computer-science/algorithms-and-ai/go-ai.html': [
      ['nim', 'The 1951 Nimrod computer played Nim at the Festival of Britain, one of the first game-playing machines, long before computers could play Go.']
    ],
    'computer-science/algorithms-and-ai/ai-concepts-foundations.html': [
      ['river-crossing', 'Problem solving as search through states: the oldest idea in AI, on a puzzle from about 800 AD.'],
      ['sliding-puzzle', 'Informed search: A* uses an estimate of the distance to the goal to decide where to look first.'],
      ['nim', 'A game an AI can play perfectly, because every position can be scored exactly.']
    ],
    'computer-science/algorithms-and-ai/state-machines.html': [
      ['river-crossing', 'Every arrangement of the farmer, wolf, goat, and cabbage is a state, and each crossing is a transition. Some states are traps.']
    ],
    'computer-science/algorithms-and-ai/sorting-algorithms.html': [
      ['tower-of-hanoi', 'Merge sort and quicksort solve a problem by solving smaller copies of it. Hanoi is the purest example of that recursion.']
    ],
    'engineering/robotics/motion-planning.html': [
      ['sliding-puzzle', 'A* on a puzzle instead of a map: the same algorithm plans the shortest sequence of tile moves.']
    ],
    'mathematics/foundations/numbers.html': [
      ['nim', 'Binary as a secret weapon: write each row in binary and add without carrying to find the winning move.'],
      ['magic-squares', 'The Lo Shu square from ancient China, one of the oldest number puzzles we know.']
    ],
    'mathematics/foundations/math-foundations-lab.html': [
      ['magic-squares', 'Addition practice with a goal: make every row, column, and diagonal reach the same total.'],
      ['mini-sudoku', 'Logic with numbers: every row, column, and box gets each number exactly once.']
    ],
    'mathematics/advanced-and-calculus/rubiks-cube-math.html': [
      ['sliding-puzzle', 'The same parity argument: Sam Loyd’s 14-15 puzzle can never be solved, just like a cube with two edges swapped.'],
      ['lights-out', 'Another puzzle where the order of moves doesn’t matter and each move undoes itself, so algebra solves it instantly.']
    ],
    'mathematics/advanced-and-calculus/fibonacci-sequence.html': [
      ['tower-of-hanoi', 'Another sequence defined by recursion: n disks take 2 × (n − 1 disks) + 1 moves, which is 2ⁿ − 1.']
    ],
    'mathematics/algebra/exponent-explorer.html': [
      ['tower-of-hanoi', 'Exponential growth you can play: each extra disk doubles the work, and 64 disks would take 585 billion years.']
    ],
    'mathematics/algebra/where-lines-meet.html': [
      ['lights-out', 'A puzzle solved as a system of equations, one equation per light, using elimination in on/off arithmetic where 1 + 1 = 0.']
    ],
    'humanities/quadrivium.html': [
      ['river-crossing', 'A math puzzle from the medieval liberal-arts schools: it appears in a collection attributed to Alcuin of York, teacher at Charlemagne’s court.'],
      ['magic-squares', 'Magic squares fascinated medieval and Renaissance scholars; Dürer engraved one in 1514.']
    ]
  };

  var script = document.currentScript;
  var path = location.pathname.replace(/^.*\/lessons\//, '');
  var entries = LINKS[path];
  if (!entries || !script || !script.src) return;

  var appsBase = new URL('../../apps/', script.src).href;

  function build() {
    if (document.querySelector('.lesson-exhibits')) return;

    var style = document.createElement('style');
    style.textContent =
      '.lesson-exhibits{max-width:960px;margin:2rem auto;padding:1rem 1.25rem;border:1px solid rgba(128,128,128,.4);' +
      'border-radius:12px;background:rgba(128,128,128,.1);color:inherit;font:inherit;line-height:1.5}' +
      '.lesson-exhibits h2{font-size:1rem;margin:0 0 .25rem;color:inherit}' +
      '.lesson-exhibits .lesson-exhibits-note{margin:0 0 .6rem;opacity:.8;font-size:.9em}' +
      '.lesson-exhibits a{color:inherit;font-weight:700;text-decoration:underline}' +
      '.lesson-exhibits p{margin:.15rem 0 .6rem;color:inherit}' +
      '@media print{.lesson-exhibits{display:none}}';
    document.head.appendChild(style);

    var box = document.createElement('aside');
    box.className = 'lesson-exhibits';
    box.setAttribute('aria-labelledby', 'lesson-exhibits-title');
    var h = document.createElement('h2');
    h.id = 'lesson-exhibits-title';
    h.textContent = 'Try the exhibit';
    box.appendChild(h);
    var note = document.createElement('p');
    note.className = 'lesson-exhibits-note';
    note.textContent = 'Puzzle games by Mr. Scandrett in the showcase that put this lesson’s ideas into play.';
    box.appendChild(note);

    entries.forEach(function (e) {
      var p = document.createElement('p');
      var a = document.createElement('a');
      a.href = appsBase + e[0] + '/';
      a.textContent = (EXHIBITS[e[0]] || e[0]) + ' →';
      p.appendChild(a);
      p.appendChild(document.createElement('br'));
      p.appendChild(document.createTextNode(e[1]));
      box.appendChild(p);
    });

    var host = document.querySelector('main') || document.body;
    host.appendChild(box);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build, { once: true });
  } else {
    build();
  }
}());
