/**
 * Living Things Explorer — interactive games
 * Click-to-select, click-to-place sorting (no native drag/drop, so it
 * works the same on touchscreens and desktops for young students).
 */
(function () {
  'use strict';

  var score = { sort: { correct: 0, total: 0 }, habitat: { correct: 0, total: 0 }, cycle: { correct: 0, total: 0 } };

  function updateScorePanel() {
    var total = score.sort.correct + score.habitat.correct + score.cycle.correct;
    var totalPossible = score.sort.total + score.habitat.total + score.cycle.total;
    var el = document.getElementById('lte-score-total');
    if (el) el.textContent = total + ' / ' + totalPossible;
    var s1 = document.getElementById('lte-score-sort');
    if (s1) s1.textContent = score.sort.correct + ' / ' + score.sort.total;
    var s2 = document.getElementById('lte-score-habitat');
    if (s2) s2.textContent = score.habitat.correct + ' / ' + score.habitat.total;
    var s3 = document.getElementById('lte-score-cycle');
    if (s3) s3.textContent = score.cycle.correct + ' / ' + score.cycle.total;
  }

  /* ── Click-to-sort game (used for Living/Nonliving and Habitat) ── */
  function SortGame(root, opts) {
    this.root = root;
    this.items = opts.items;
    this.bins = opts.bins;
    this.scoreKey = opts.scoreKey;
    this.selected = null;
    this.placedCount = 0;
    score[this.scoreKey].total = this.items.length;
    this.render();
  }

  SortGame.prototype.render = function () {
    var self = this;
    var pool = this.root.querySelector('.lte-pool');
    var binsWrap = this.root.querySelector('.lte-bins');
    pool.innerHTML = '';
    binsWrap.innerHTML = '';

    this.items.forEach(function (item) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'lte-item';
      card.dataset.id = item.id;
      card.innerHTML = '<span class="lte-item-emoji" aria-hidden="true">' + item.emoji + '</span><span>' + item.label + '</span>';
      card.setAttribute('aria-pressed', 'false');
      card.addEventListener('click', function () { self.selectItem(card, item); });
      pool.appendChild(card);
    });

    this.bins.forEach(function (bin) {
      var binEl = document.createElement('div');
      binEl.className = 'lte-bin';
      binEl.dataset.bin = bin.id;
      binEl.setAttribute('role', 'button');
      binEl.setAttribute('tabindex', '0');
      binEl.innerHTML =
        '<div class="lte-bin-label">' + bin.emoji + ' ' + bin.label + '</div>' +
        '<div class="lte-bin-sub" style="font-size:.78rem;color:var(--lte-text-light);margin-bottom:.4rem;">' + (bin.sub || '') + '</div>' +
        '<div class="lte-bin-contents"></div>';
      binEl.addEventListener('click', function () { self.placeInBin(bin); });
      binEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.placeInBin(bin); }
      });
      binsWrap.appendChild(binEl);
    });
  };

  SortGame.prototype.selectItem = function (card, item) {
    if (card.classList.contains('placed')) return;
    var pool = this.root.querySelectorAll('.lte-item');
    pool.forEach(function (c) { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
    card.classList.add('selected');
    card.setAttribute('aria-pressed', 'true');
    this.selected = item;
    this.root.querySelectorAll('.lte-bin').forEach(function (b) { b.classList.add('ready'); });
  };

  SortGame.prototype.placeInBin = function (bin) {
    if (!this.selected) {
      this.feedback('Tap a card first, then tap the bin where it belongs.', 'incorrect');
      return;
    }
    var item = this.selected;
    var binEl = this.root.querySelector('.lte-bin[data-bin="' + bin.id + '"]');
    var cardEl = this.root.querySelector('.lte-item[data-id="' + item.id + '"]');
    this.root.querySelectorAll('.lte-bin').forEach(function (b) { b.classList.remove('ready'); });

    if (item.bin === bin.id) {
      cardEl.classList.remove('selected');
      cardEl.classList.add('placed');
      cardEl.setAttribute('aria-pressed', 'false');
      cardEl.disabled = true;
      var chip = document.createElement('span');
      chip.className = 'lte-bin-chip';
      chip.innerHTML = item.emoji + ' ' + item.label;
      binEl.querySelector('.lte-bin-contents').appendChild(chip);
      binEl.classList.add('correct-flash');
      setTimeout(function () { binEl.classList.remove('correct-flash'); }, 500);
      this.feedback(item.emoji + ' ' + item.label + ' is correct! ' + bin.label + ' it is.', 'correct');
      this.placedCount++;
      score[this.scoreKey].correct++;
      updateScorePanel();
      this.selected = null;
      if (this.placedCount === this.items.length) this.celebrate();
    } else {
      binEl.classList.add('wrong-flash');
      cardEl.classList.add('shake');
      setTimeout(function () {
        binEl.classList.remove('wrong-flash');
        cardEl.classList.remove('shake');
      }, 450);
      this.feedback('Not quite — try a different spot for ' + item.label + '.', 'incorrect');
    }
  };

  SortGame.prototype.feedback = function (msg, kind) {
    var el = this.root.querySelector('.lte-feedback');
    el.textContent = msg;
    el.className = 'lte-feedback ' + kind;
  };

  SortGame.prototype.celebrate = function () {
    var el = this.root.querySelector('.lte-feedback');
    el.textContent = '🎉 Great job! Every card found its home.';
    el.className = 'lte-feedback celebration';
  };

  SortGame.prototype.reset = function () {
    this.selected = null;
    this.placedCount = 0;
    score[this.scoreKey].correct = 0;
    updateScorePanel();
    this.render();
    this.feedback('', '');
  };

  /* ── Life-cycle sequencing game ── */
  function CycleGame(root, cycles) {
    this.root = root;
    this.cycles = cycles;
    this.activeKey = Object.keys(cycles)[0];
    this.placed = [];
    var total = 0;
    Object.keys(cycles).forEach(function (k) { total += cycles[k].stages.length; });
    score.cycle.total = cycles[this.activeKey].stages.length;
    this.renderTabs();
    this.renderRound();
  }

  CycleGame.prototype.renderTabs = function () {
    var self = this;
    var tabWrap = this.root.querySelector('.lte-cycle-tabs');
    tabWrap.innerHTML = '';
    Object.keys(this.cycles).forEach(function (key) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lte-cycle-tab';
      btn.textContent = self.cycles[key].label;
      btn.setAttribute('aria-selected', key === self.activeKey ? 'true' : 'false');
      btn.setAttribute('role', 'tab');
      btn.addEventListener('click', function () {
        self.activeKey = key;
        Array.prototype.forEach.call(tabWrap.children, function (c) { c.setAttribute('aria-selected', 'false'); });
        btn.setAttribute('aria-selected', 'true');
        self.renderRound();
      });
      tabWrap.appendChild(btn);
    });
  };

  CycleGame.prototype.renderRound = function () {
    var self = this;
    var cycle = this.cycles[this.activeKey];
    this.placed = [];
    var seqRow = this.root.querySelector('.lte-sequence-row');
    var pool = this.root.querySelector('.lte-pool');
    seqRow.innerHTML = '';
    pool.innerHTML = '';

    var shuffled = cycle.stages.slice().sort(function () { return Math.random() - 0.5; });
    shuffled.forEach(function (stage) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'lte-item';
      card.dataset.order = stage.order;
      card.innerHTML = '<span class="lte-item-emoji" aria-hidden="true">' + stage.emoji + '</span><span>' + stage.label + '</span>';
      card.addEventListener('click', function () { self.pick(stage, card); });
      pool.appendChild(card);
    });

    this.feedback('', '');
  };

  CycleGame.prototype.pick = function (stage, cardEl) {
    var cycle = this.cycles[this.activeKey];
    var nextOrder = this.placed.length + 1;

    if (stage.order === nextOrder) {
      cardEl.classList.add('placed');
      cardEl.disabled = true;
      var slot = document.createElement('span');
      slot.className = 'lte-sequence-slot';
      slot.innerHTML = '<span class="lte-seq-num">' + stage.order + '</span>' + stage.emoji + ' ' + stage.label;
      this.root.querySelector('.lte-sequence-row').appendChild(slot);
      this.placed.push(stage.order);
      score.cycle.correct++;
      updateScorePanel();
      this.feedback(stage.label + ' is next — nicely done!', 'correct');

      if (this.placed.length === cycle.stages.length) {
        this.feedback('🎉 You put the whole ' + cycle.label.toLowerCase() + ' life cycle in order!', 'celebration');
      }
    } else {
      cardEl.classList.add('shake');
      var self = this;
      setTimeout(function () { cardEl.classList.remove('shake'); }, 450);
      this.feedback('Look for what happens first. Try again!', 'incorrect');
    }
  };

  CycleGame.prototype.feedback = function (msg, kind) {
    var el = this.root.querySelector('.lte-feedback');
    el.textContent = msg;
    el.className = 'lte-feedback ' + kind;
  };

  CycleGame.prototype.reset = function () {
    score.cycle.correct = 0;
    score.cycle.total = this.cycles[this.activeKey].stages.length;
    updateScorePanel();
    this.renderRound();
  };

  /* ── Quiz ── */
  function initQuiz() {
    var checkBtn = document.getElementById('lte-quiz-check');
    var clearBtn = document.getElementById('lte-quiz-clear');
    var result = document.getElementById('lte-quiz-result');
    if (!checkBtn) return;

    checkBtn.addEventListener('click', function () {
      var questions = document.querySelectorAll('.lte-quiz-question');
      var correct = 0;
      questions.forEach(function (q) {
        var chosen = q.querySelector('input[type="radio"]:checked');
        if (chosen && chosen.value === 'correct') correct++;
      });
      result.style.display = 'block';
      if (correct === questions.length) {
        result.className = 'lte-quiz-result good';
        result.textContent = '🌟 Perfect! ' + correct + ' out of ' + questions.length + ' correct.';
      } else {
        result.className = 'lte-quiz-result okay';
        result.textContent = 'You got ' + correct + ' out of ' + questions.length + ' correct. Review the highlighted lesson and try again!';
      }
    });

    clearBtn.addEventListener('click', function () {
      document.querySelectorAll('.lte-quiz-question input[type="radio"]').forEach(function (i) { i.checked = false; });
      result.style.display = 'none';
    });
  }

  /* ── Data ── */
  var LIVING_NONLIVING_ITEMS = [
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
  var LIVING_NONLIVING_BINS = [
    { id: 'living', label: 'Living', emoji: '🌱', sub: 'Breathes, eats, grows, and can make more of its kind.' },
    { id: 'nonliving', label: 'Nonliving', emoji: '🧱', sub: 'Does not breathe, eat, grow on its own, or reproduce.' }
  ];

  var HABITAT_ITEMS = [
    { id: 'clownfish', label: 'Clownfish', emoji: '🐠', bin: 'ocean' },
    { id: 'octopus', label: 'Octopus', emoji: '🐙', bin: 'ocean' },
    { id: 'owl', label: 'Owl', emoji: '🦉', bin: 'forest' },
    { id: 'deer', label: 'Deer', emoji: '🦌', bin: 'forest' },
    { id: 'camel', label: 'Camel', emoji: '🐫', bin: 'desert' },
    { id: 'lizard', label: 'Lizard', emoji: '🦎', bin: 'desert' },
    { id: 'polarbear', label: 'Polar Bear', emoji: '🐻‍❄️', bin: 'arctic' },
    { id: 'penguin', label: 'Penguin', emoji: '🐧', bin: 'arctic' }
  ];
  var HABITAT_BINS = [
    { id: 'ocean', label: 'Ocean', emoji: '🌊', sub: 'Salty water, deep and wide.' },
    { id: 'forest', label: 'Forest', emoji: '🌲', sub: 'Trees, shade, and shelter.' },
    { id: 'desert', label: 'Desert', emoji: '🏜️', sub: 'Hot and dry with little water.' },
    { id: 'arctic', label: 'Arctic', emoji: '🧊', sub: 'Icy cold, snow and wind.' }
  ];

  var LIFE_CYCLES = {
    butterfly: {
      label: 'Butterfly',
      stages: [
        { order: 1, label: 'Egg', emoji: '🥚' },
        { order: 2, label: 'Caterpillar', emoji: '🐛' },
        { order: 3, label: 'Chrysalis', emoji: '🍃' },
        { order: 4, label: 'Butterfly', emoji: '🦋' }
      ]
    },
    frog: {
      label: 'Frog',
      stages: [
        { order: 1, label: 'Egg', emoji: '🥚' },
        { order: 2, label: 'Tadpole', emoji: '🐟' },
        { order: 3, label: 'Froglet', emoji: '🐸' },
        { order: 4, label: 'Frog', emoji: '🐸' }
      ]
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var sortRoot = document.getElementById('lte-sort-game');
    var habitatRoot = document.getElementById('lte-habitat-game');
    var cycleRoot = document.getElementById('lte-cycle-game');

    var sortGame = sortRoot ? new SortGame(sortRoot, { items: LIVING_NONLIVING_ITEMS, bins: LIVING_NONLIVING_BINS, scoreKey: 'sort' }) : null;
    var habitatGame = habitatRoot ? new SortGame(habitatRoot, { items: HABITAT_ITEMS, bins: HABITAT_BINS, scoreKey: 'habitat' }) : null;
    var cycleGame = cycleRoot ? new CycleGame(cycleRoot, LIFE_CYCLES) : null;

    updateScorePanel();

    var r1 = document.getElementById('lte-sort-reset');
    if (r1) r1.addEventListener('click', function () { sortGame.reset(); });
    var r2 = document.getElementById('lte-habitat-reset');
    if (r2) r2.addEventListener('click', function () { habitatGame.reset(); });
    var r3 = document.getElementById('lte-cycle-reset');
    if (r3) r3.addEventListener('click', function () { cycleGame.reset(); });

    initQuiz();
  });
})();
