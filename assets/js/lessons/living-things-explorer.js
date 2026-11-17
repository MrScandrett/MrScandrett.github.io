(() => {
  'use strict';

  const score = { sort: [0, 0], habitat: [0, 0], cycle: [0, 0] };

  function updateScore(key, correct, total) {
    score[key] = [correct, total];
    document.getElementById('lte-score-' + key).textContent = correct + ' / ' + total;
    const counts = Object.values(score);
    document.getElementById('lte-score-total').textContent =
      counts.reduce((sum, count) => sum + count[0], 0) + ' / ' +
      counts.reduce((sum, count) => sum + count[1], 0);
  }

  function shuffle(items) {
    const deck = items.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function feedback(root, message, kind = '') {
    const status = root.querySelector('.lte-feedback');
    status.className = ('lte-feedback ' + kind).trim();
    status.textContent = message;
  }

  function emoji(symbol) {
    return '<span class="lte-item-emoji" aria-hidden="true">' + symbol + '</span>';
  }

  function initSort(key, items, bins) {
    const root = document.getElementById('lte-' + key + '-game');
    const card = root.querySelector('.lte-sort-card');
    const choices = root.querySelector('.lte-bins');
    const restart = document.getElementById('lte-' + key + '-reset');
    let deck;
    let current;

    const buttons = bins.map((bin) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lte-bin';
      button.dataset.bin = bin.id;
      button.innerHTML = emoji(bin.emoji) + '<strong>' + bin.label +
        '</strong><span class="lte-bin-sub">' + bin.sub + '</span>';
      button.addEventListener('click', () => choose(bin, button));
      choices.append(button);
      return button;
    });

    function showCard() {
      const item = deck[current];
      const progress = '<span class="lte-round-count">' + current + ' / ' + deck.length + ' matched</span>';
      card.innerHTML = progress + (item
        ? emoji(item.emoji) + '<strong>' + item.label + '</strong>'
        : emoji('🎉') + '<strong>All cards matched!</strong>');
      updateScore(key, current, deck.length);
    }

    function choose(bin, button) {
      const item = deck[current];
      if (!item) return;
      buttons.forEach((choice) => choice.classList.remove('wrong'));
      const answer = bins.find((candidate) => candidate.id === item.bin);
      if (bin !== answer) {
        button.classList.add('wrong');
        const clue = key === 'sort'
          ? 'Can this grow on its own and use energy to stay alive?'
          : 'Look for this clue: ' + answer.sub;
        feedback(root, 'Try again. ' + clue, 'incorrect');
        return;
      }
      current++;
      showCard();
      const next = deck[current];
      feedback(root, item.label + ' → ' + answer.label + '. ' +
        (next ? 'Next card: ' + next.label + '.' : 'You matched every card!'),
        next ? 'correct' : 'celebration');
      if (!next) {
        restart.focus();
        buttons.forEach((choice) => { choice.disabled = true; });
      }
    }

    function reset() {
      deck = shuffle(items);
      current = 0;
      buttons.forEach((button) => {
        button.disabled = false;
        button.classList.remove('wrong');
      });
      showCard();
      feedback(root, 'First card: ' + deck[0].label + '.');
    }

    restart.addEventListener('click', () => {
      reset();
      buttons[0].focus();
    });
    reset();
  }

  function initCycles(cycles) {
    const root = document.getElementById('lte-cycle-game');
    const picker = root.querySelector('.lte-cycle-tabs');
    const sequence = root.querySelector('.lte-sequence-row');
    const pool = root.querySelector('.lte-pool');
    const restart = document.getElementById('lte-cycle-reset');
    const rounds = Object.values(cycles).map((cycle) => ({
      cycle, deck: shuffle(cycle.stages), count: 0
    }));
    const total = rounds.reduce((sum, round) => sum + round.deck.length, 0);
    let active = rounds[0];

    rounds.forEach((round) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lte-cycle-tab';
      button.addEventListener('click', () => {
        active = round;
        render();
      });
      round.button = button;
      picker.append(button);
    });

    function render(moveFocus = false) {
      const { cycle, deck, count } = active;
      rounds.forEach((round) => {
        round.button.setAttribute('aria-pressed', String(round === active));
        round.button.textContent = round.cycle.label + ' · ' + round.count + '/' + round.deck.length;
      });
      sequence.replaceChildren();
      cycle.stages.forEach((stage) => {
        const slot = document.createElement('li');
        slot.className = 'lte-sequence-slot';
        if (stage.order <= count) slot.classList.add('filled');
        slot.innerHTML = '<span class="lte-seq-num">' + stage.order + '</span>' +
          (stage.order <= count ? emoji(stage.emoji) + '<strong>' + stage.label + '</strong>' : '—');
        sequence.append(slot);
      });

      pool.replaceChildren();
      deck.filter((stage) => stage.order > count).forEach((stage) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lte-item';
        button.innerHTML = emoji(stage.emoji) + '<span>' + stage.label + '</span>';
        button.addEventListener('click', () => {
          const expected = cycle.stages[active.count];
          if (stage !== expected) {
            pool.querySelectorAll('.wrong').forEach((card) => card.classList.remove('wrong'));
            button.classList.add('wrong');
            feedback(root, 'Try again. ' + expected.hint, 'incorrect');
            return;
          }
          active.count++;
          render(true);
          if (active.count < deck.length) {
            feedback(root, stage.label + ' goes in spot ' + stage.order +
              '. What goes in spot ' + (stage.order + 1) + '?', 'correct');
          }
        });
        pool.append(button);
      });

      updateScore('cycle', rounds.reduce((sum, round) => sum + round.count, 0), total);
      if (count === deck.length) {
        feedback(root, 'You completed the ' + cycle.label.toLowerCase() + ' life cycle!', 'celebration');
      } else {
        feedback(root, 'Choose the stage for spot ' + (count + 1) + '.');
      }
      if (moveFocus) (pool.querySelector('button') || restart).focus();
    }

    restart.addEventListener('click', () => {
      active.count = 0;
      active.deck = shuffle(active.cycle.stages);
      render(true);
    });
    render();
  }

  function initQuiz() {
    const questions = [...document.querySelectorAll('.lte-quiz-question')];
    const result = document.getElementById('lte-quiz-result');
    const hints = [
      'Which one grows from a young animal into an adult?',
      'Think about the needs that plants and animals share.',
      'Look for the word that means a living thing’s natural home.',
      'Think about the stage before the caterpillar hatches.',
      'Moving or changing shape can happen to nonliving things too.'
    ];

    function clearFeedback(question) {
      delete question.dataset.result;
      question.querySelector('.lte-quiz-note').textContent = '';
      result.hidden = true;
      result.textContent = '';
    }

    questions.forEach((question) => {
      question.addEventListener('change', () => clearFeedback(question));
    });

    document.getElementById('lte-quiz-check').addEventListener('click', () => {
      let correct = 0;
      questions.forEach((question, index) => {
        const selected = question.querySelector('input:checked');
        const right = selected?.value === 'correct';
        if (right) correct++;
        question.dataset.result = right ? 'correct' : 'retry';
        question.querySelector('.lte-quiz-note').textContent = right ? '✓ Correct!' :
          selected ? 'Try again. ' + hints[index] : 'Choose an answer.';
      });
      result.className = 'lte-quiz-result ' + (correct === questions.length ? 'good' : 'okay');
      result.hidden = false;
      result.textContent = correct + ' out of ' + questions.length + ' correct.' +
        (correct === questions.length ? ' Great work!' : ' See the clues beside each question.');
    });

    document.getElementById('lte-quiz-clear').addEventListener('click', () => {
      questions.forEach((question) => {
        question.querySelectorAll('input').forEach((input) => { input.checked = false; });
        clearFeedback(question);
      });
      questions[0].querySelector('input').focus();
    });
  }

  /* ── Data ── */
  const LIVING_NONLIVING_ITEMS = [
    { id: 'dog', label: 'Dog', emoji: '🐶', bin: 'living' },
    { id: 'tree', label: 'Oak Tree', emoji: '🌳', bin: 'living' },
    { id: 'fish', label: 'Goldfish', emoji: '🐠', bin: 'living' },
    { id: 'butterfly', label: 'Butterfly', emoji: '🦋', bin: 'living' },
    { id: 'sunflower', label: 'Sunflower', emoji: '🌻', bin: 'living' },
    { id: 'child', label: 'You!', emoji: '🧒', bin: 'living' },
    { id: 'rock', label: 'Rock', emoji: '🪨', bin: 'nonliving' },
    { id: 'bike', label: 'Bicycle', emoji: '🚲', bin: 'nonliving' },
    { id: 'cloud', label: 'Cloud', emoji: '☁️', bin: 'nonliving' },
    { id: 'chair', label: 'Chair', emoji: '🪑', bin: 'nonliving' },
    { id: 'toycar', label: 'Toy Car', emoji: '🚗', bin: 'nonliving' },
    { id: 'water', label: 'River Water', emoji: '💧', bin: 'nonliving' }
  ];
  const LIVING_NONLIVING_BINS = [
    { id: 'living', label: 'Living', emoji: '🌱', sub: 'Grows, uses energy, and responds to its surroundings.' },
    { id: 'nonliving', label: 'Nonliving', emoji: '🧱', sub: 'May move or change shape without being alive.' }
  ];

  const HABITAT_ITEMS = [
    { id: 'clownfish', label: 'Clownfish', emoji: '🐠', bin: 'ocean' },
    { id: 'octopus', label: 'Octopus', emoji: '🐙', bin: 'ocean' },
    { id: 'owl', label: 'Owl', emoji: '🦉', bin: 'forest' },
    { id: 'deer', label: 'Deer', emoji: '🦌', bin: 'forest' },
    { id: 'camel', label: 'Camel', emoji: '🐫', bin: 'desert' },
    { id: 'lizard', label: 'Desert Lizard', emoji: '🦎', bin: 'desert' },
    { id: 'polarbear', label: 'Polar Bear', emoji: '🐻‍❄️', bin: 'arctic' },
    { id: 'arcticfox', label: 'Arctic Fox', emoji: '🦊', bin: 'arctic' }
  ];
  const HABITAT_BINS = [
    { id: 'ocean', label: 'Ocean', emoji: '🌊', sub: 'Salty water, deep and wide.' },
    { id: 'forest', label: 'Forest', emoji: '🌲', sub: 'Trees, shade, and shelter.' },
    { id: 'desert', label: 'Desert', emoji: '🏜️', sub: 'Hot and dry with little water.' },
    { id: 'arctic', label: 'Arctic', emoji: '🧊', sub: 'Icy cold, snow and wind.' }
  ];

  const LIFE_CYCLES = {
    butterfly: {
      label: 'Butterfly',
      stages: [
        { order: 1, label: 'Egg', emoji: '🥚', hint: 'Look for the stage before the animal hatches.' },
        { order: 2, label: 'Caterpillar', emoji: '🐛', hint: 'Look for what hatches from a butterfly egg.' },
        { order: 3, label: 'Chrysalis', emoji: '🍃', hint: 'After feeding and growing, the caterpillar forms a protective case.' },
        { order: 4, label: 'Butterfly', emoji: '🦋', hint: 'Look for the adult that comes out of the chrysalis.' }
      ]
    },
    frog: {
      label: 'Frog',
      stages: [
        { order: 1, label: 'Egg', emoji: '🥚', hint: 'Look for the stage before the animal hatches.' },
        { order: 2, label: 'Tadpole', emoji: '🐟', hint: 'After the egg hatches, look for the stage that swims with a tail.' },
        { order: 3, label: 'Froglet', emoji: '🐸', hint: 'The tadpole grows legs while it still has a short tail.' },
        { order: 4, label: 'Frog', emoji: '🐸', hint: 'Look for the adult after the tail disappears.' }
      ]
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    initSort('sort', LIVING_NONLIVING_ITEMS, LIVING_NONLIVING_BINS);
    initSort('habitat', HABITAT_ITEMS, HABITAT_BINS);
    initCycles(LIFE_CYCLES);
    initQuiz();
  });
})();
