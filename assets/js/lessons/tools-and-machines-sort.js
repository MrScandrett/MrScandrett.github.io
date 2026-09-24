/**
 * Tools & Machines Sort — interactive games
 * Click-to-select, click-to-place sorting (no native drag/drop, so it
 * works the same on touchscreens and desktops for young students).
 */
(function () {
  'use strict';

  var score = { tool: { correct: 0, total: 0 }, machine: { correct: 0, total: 0 } };

  function updateScorePanel() {
    var total = score.tool.correct + score.machine.correct;
    var totalPossible = score.tool.total + score.machine.total;
    var el = document.getElementById('tms-score-total');
    if (el) el.textContent = total + ' / ' + totalPossible;
    var s1 = document.getElementById('tms-score-tool');
    if (s1) s1.textContent = score.tool.correct + ' / ' + score.tool.total;
    var s2 = document.getElementById('tms-score-machine');
    if (s2) s2.textContent = score.machine.correct + ' / ' + score.machine.total;
  }

  /* ── Click-to-sort game (reused for both games) ── */
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
    var pool = this.root.querySelector('.tms-pool');
    var binsWrap = this.root.querySelector('.tms-bins');
    pool.innerHTML = '';
    binsWrap.innerHTML = '';

    this.items.forEach(function (item) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'tms-item';
      card.dataset.id = item.id;
      card.innerHTML = '<span class="tms-item-emoji" aria-hidden="true">' + item.emoji + '</span><span>' + item.label + '</span>';
      card.setAttribute('aria-pressed', 'false');
      card.addEventListener('click', function () { self.selectItem(card, item); });
      pool.appendChild(card);
    });

    this.bins.forEach(function (bin) {
      var binEl = document.createElement('div');
      binEl.className = 'tms-bin';
      binEl.dataset.bin = bin.id;
      binEl.setAttribute('role', 'button');
      binEl.setAttribute('tabindex', '0');
      binEl.innerHTML =
        '<div class="tms-bin-label">' + bin.emoji + ' ' + bin.label + '</div>' +
        '<div class="tms-bin-sub" style="font-size:.78rem;color:var(--tms-text-light);margin-bottom:.4rem;">' + (bin.sub || '') + '</div>' +
        '<div class="tms-bin-contents"></div>';
      binEl.addEventListener('click', function () { self.placeInBin(bin); });
      binEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.placeInBin(bin); }
      });
      binsWrap.appendChild(binEl);
    });
  };

  SortGame.prototype.selectItem = function (card, item) {
    if (card.classList.contains('placed')) return;
    var pool = this.root.querySelectorAll('.tms-item');
    pool.forEach(function (c) { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
    card.classList.add('selected');
    card.setAttribute('aria-pressed', 'true');
    this.selected = item;
    this.root.querySelectorAll('.tms-bin').forEach(function (b) { b.classList.add('ready'); });
  };

  SortGame.prototype.placeInBin = function (bin) {
    if (!this.selected) {
      this.feedback('Tap an object first, then tap the bin where it belongs.', 'incorrect');
      return;
    }
    var item = this.selected;
    var binEl = this.root.querySelector('.tms-bin[data-bin="' + bin.id + '"]');
    var cardEl = this.root.querySelector('.tms-item[data-id="' + item.id + '"]');
    this.root.querySelectorAll('.tms-bin').forEach(function (b) { b.classList.remove('ready'); });

    if (item.bin === bin.id) {
      cardEl.classList.remove('selected');
      cardEl.classList.add('placed');
      cardEl.setAttribute('aria-pressed', 'false');
      cardEl.disabled = true;
      var chip = document.createElement('span');
      chip.className = 'tms-bin-chip';
      chip.innerHTML = item.emoji + ' ' + item.label;
      binEl.querySelector('.tms-bin-contents').appendChild(chip);
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
    var el = this.root.querySelector('.tms-feedback');
    el.textContent = msg;
    el.className = 'tms-feedback ' + kind;
  };

  SortGame.prototype.celebrate = function () {
    var el = this.root.querySelector('.tms-feedback');
    el.textContent = '🎉 Great job! Every object found its bin.';
    el.className = 'tms-feedback celebration';
  };

  SortGame.prototype.reset = function () {
    this.selected = null;
    this.placedCount = 0;
    score[this.scoreKey].correct = 0;
    updateScorePanel();
    this.render();
    this.feedback('', '');
  };

  /* ── Quiz ── */
  function initQuiz() {
    var checkBtn = document.getElementById('tms-quiz-check');
    var clearBtn = document.getElementById('tms-quiz-clear');
    var result = document.getElementById('tms-quiz-result');
    if (!checkBtn) return;

    checkBtn.addEventListener('click', function () {
      var questions = document.querySelectorAll('.tms-quiz-question');
      var correct = 0;
      questions.forEach(function (q) {
        var chosen = q.querySelector('input[type="radio"]:checked');
        if (chosen && chosen.value === 'correct') correct++;
      });
      result.style.display = 'block';
      if (correct === questions.length) {
        result.className = 'tms-quiz-result good';
        result.textContent = '🌟 Perfect! ' + correct + ' out of ' + questions.length + ' correct.';
      } else {
        result.className = 'tms-quiz-result okay';
        result.textContent = 'You got ' + correct + ' out of ' + questions.length + ' correct. Review the highlighted lesson and try again!';
      }
    });

    clearBtn.addEventListener('click', function () {
      document.querySelectorAll('.tms-quiz-question input[type="radio"]').forEach(function (i) { i.checked = false; });
      result.style.display = 'none';
    });
  }

  /* ── Data ── */
  var TOOL_ITEMS = [
    { id: 'hammer', label: 'Hammer', emoji: '🔨', bin: 'nail' },
    { id: 'mallet', label: 'Mallet', emoji: '🔨', bin: 'nail' },
    { id: 'screwdriver', label: 'Screwdriver', emoji: '🪛', bin: 'screw' },
    { id: 'drill', label: 'Drill', emoji: '🛠️', bin: 'screw' },
    { id: 'wrench', label: 'Wrench', emoji: '🔧', bin: 'bolt' },
    { id: 'pliers', label: 'Pliers', emoji: '🗜️', bin: 'bolt' },
    { id: 'saw', label: 'Saw', emoji: '🪚', bin: 'wood' },
    { id: 'sandpaper', label: 'Sandpaper', emoji: '🟫', bin: 'wood' },
    { id: 'tapemeasure', label: 'Tape Measure', emoji: '📏', bin: 'measure' },
    { id: 'ruler', label: 'Ruler', emoji: '📐', bin: 'measure' }
  ];
  var TOOL_BINS = [
    { id: 'nail', label: 'Pounds a Nail', emoji: '📌', sub: 'Strikes something in with force.' },
    { id: 'screw', label: 'Turns a Screw', emoji: '🔩', sub: 'Twists something round and round.' },
    { id: 'bolt', label: 'Grips &amp; Twists', emoji: '⚙️', sub: 'Grabs on tight, then turns.' },
    { id: 'wood', label: 'Shapes Wood', emoji: '🪵', sub: 'Cuts or smooths a piece of wood.' },
    { id: 'measure', label: 'Measures Length', emoji: '📊', sub: 'Tells you exactly how long something is.' }
  ];

  var MACHINE_ITEMS = [
    { id: 'doorknob', label: 'Doorknob', emoji: '🚪', bin: 'wheel' },
    { id: 'steeringwheel', label: 'Steering Wheel', emoji: '🚗', bin: 'wheel' },
    { id: 'jarlid', label: 'Jar Lid', emoji: '🫙', bin: 'wheel' },
    { id: 'slide', label: 'Playground Slide', emoji: '🛝', bin: 'ramp' },
    { id: 'wheelchairramp', label: 'Wheelchair Ramp', emoji: '♿', bin: 'ramp' },
    { id: 'seesaw', label: 'Seesaw', emoji: '🎡', bin: 'lever' },
    { id: 'bottleopener', label: 'Bottle Opener', emoji: '🍾', bin: 'lever' },
    { id: 'nutcracker', label: 'Nutcracker', emoji: '🌰', bin: 'lever' },
    { id: 'flagpole', label: 'Flagpole Pulley', emoji: '🚩', bin: 'pulley' },
    { id: 'crane', label: 'Toy Crane', emoji: '🏗️', bin: 'pulley' }
  ];
  var MACHINE_BINS = [
    { id: 'wheel', label: 'Wheel &amp; Axle', emoji: '⭕', sub: 'A round part that spins around a center.' },
    { id: 'ramp', label: 'Ramp', emoji: '📐', sub: 'A slanted surface that makes going up easier.' },
    { id: 'lever', label: 'Lever', emoji: '⚖️', sub: 'A bar that tips or pivots to lift or pry.' },
    { id: 'pulley', label: 'Pulley', emoji: '🪢', sub: 'A wheel with a rope that changes lifting direction.' }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    var toolRoot = document.getElementById('tms-tool-game');
    var machineRoot = document.getElementById('tms-machine-game');

    var toolGame = toolRoot ? new SortGame(toolRoot, { items: TOOL_ITEMS, bins: TOOL_BINS, scoreKey: 'tool' }) : null;
    var machineGame = machineRoot ? new SortGame(machineRoot, { items: MACHINE_ITEMS, bins: MACHINE_BINS, scoreKey: 'machine' }) : null;

    updateScorePanel();

    var r1 = document.getElementById('tms-tool-reset');
    if (r1) r1.addEventListener('click', function () { toolGame.reset(); });
    var r2 = document.getElementById('tms-machine-reset');
    if (r2) r2.addEventListener('click', function () { machineGame.reset(); });

    initQuiz();
  });
})();
