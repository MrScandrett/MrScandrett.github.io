/**
 * Materials Sort — interactive games
 * Click-to-select, click-to-place sorting (no native drag/drop, so it
 * works the same on touchscreens and desktops for young students).
 */
(function () {
  'use strict';

  var score = { texture: { correct: 0, total: 0 }, bend: { correct: 0, total: 0 } };

  function updateScorePanel() {
    var total = score.texture.correct + score.bend.correct;
    var totalPossible = score.texture.total + score.bend.total;
    var el = document.getElementById('ms-score-total');
    if (el) el.textContent = total + ' / ' + totalPossible;
    var s1 = document.getElementById('ms-score-texture');
    if (s1) s1.textContent = score.texture.correct + ' / ' + score.texture.total;
    var s2 = document.getElementById('ms-score-bend');
    if (s2) s2.textContent = score.bend.correct + ' / ' + score.bend.total;
  }

  /* ── Click-to-sort game (reused for both property pairs) ── */
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
    var pool = this.root.querySelector('.ms-pool');
    var binsWrap = this.root.querySelector('.ms-bins');
    pool.innerHTML = '';
    binsWrap.innerHTML = '';

    this.items.forEach(function (item) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'ms-item';
      card.dataset.id = item.id;
      card.innerHTML = '<span class="ms-item-emoji" aria-hidden="true">' + item.emoji + '</span><span>' + item.label + '</span>';
      card.setAttribute('aria-pressed', 'false');
      card.addEventListener('click', function () { self.selectItem(card, item); });
      pool.appendChild(card);
    });

    this.bins.forEach(function (bin) {
      var binEl = document.createElement('div');
      binEl.className = 'ms-bin';
      binEl.dataset.bin = bin.id;
      binEl.setAttribute('role', 'button');
      binEl.setAttribute('tabindex', '0');
      binEl.innerHTML =
        '<div class="ms-bin-label">' + bin.emoji + ' ' + bin.label + '</div>' +
        '<div class="ms-bin-sub" style="font-size:.78rem;color:var(--ms-text-light);margin-bottom:.4rem;">' + (bin.sub || '') + '</div>' +
        '<div class="ms-bin-contents"></div>';
      binEl.addEventListener('click', function () { self.placeInBin(bin); });
      binEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.placeInBin(bin); }
      });
      binsWrap.appendChild(binEl);
    });
  };

  SortGame.prototype.selectItem = function (card, item) {
    if (card.classList.contains('placed')) return;
    var pool = this.root.querySelectorAll('.ms-item');
    pool.forEach(function (c) { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
    card.classList.add('selected');
    card.setAttribute('aria-pressed', 'true');
    this.selected = item;
    this.root.querySelectorAll('.ms-bin').forEach(function (b) { b.classList.add('ready'); });
  };

  SortGame.prototype.placeInBin = function (bin) {
    if (!this.selected) {
      this.feedback('Tap an object first, then tap the bin where it belongs.', 'incorrect');
      return;
    }
    var item = this.selected;
    var binEl = this.root.querySelector('.ms-bin[data-bin="' + bin.id + '"]');
    var cardEl = this.root.querySelector('.ms-item[data-id="' + item.id + '"]');
    this.root.querySelectorAll('.ms-bin').forEach(function (b) { b.classList.remove('ready'); });

    if (item.bin === bin.id) {
      cardEl.classList.remove('selected');
      cardEl.classList.add('placed');
      cardEl.setAttribute('aria-pressed', 'false');
      cardEl.disabled = true;
      var chip = document.createElement('span');
      chip.className = 'ms-bin-chip';
      chip.innerHTML = item.emoji + ' ' + item.label;
      binEl.querySelector('.ms-bin-contents').appendChild(chip);
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
    var el = this.root.querySelector('.ms-feedback');
    el.textContent = msg;
    el.className = 'ms-feedback ' + kind;
  };

  SortGame.prototype.celebrate = function () {
    var el = this.root.querySelector('.ms-feedback');
    el.textContent = '🎉 Great job! Every object found its bin.';
    el.className = 'ms-feedback celebration';
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
    var checkBtn = document.getElementById('ms-quiz-check');
    var clearBtn = document.getElementById('ms-quiz-clear');
    var result = document.getElementById('ms-quiz-result');
    if (!checkBtn) return;

    checkBtn.addEventListener('click', function () {
      var questions = document.querySelectorAll('.ms-quiz-question');
      var correct = 0;
      questions.forEach(function (q) {
        var chosen = q.querySelector('input[type="radio"]:checked');
        if (chosen && chosen.value === 'correct') correct++;
      });
      result.style.display = 'block';
      if (correct === questions.length) {
        result.className = 'ms-quiz-result good';
        result.textContent = '🌟 Perfect! ' + correct + ' out of ' + questions.length + ' correct.';
      } else {
        result.className = 'ms-quiz-result okay';
        result.textContent = 'You got ' + correct + ' out of ' + questions.length + ' correct. Review the highlighted lesson and try again!';
      }
    });

    clearBtn.addEventListener('click', function () {
      document.querySelectorAll('.ms-quiz-question input[type="radio"]').forEach(function (i) { i.checked = false; });
      result.style.display = 'none';
    });
  }

  /* ── Data ── */
  var TEXTURE_ITEMS = [
    { id: 'rock', label: 'Rock', emoji: '🪨', bin: 'hard' },
    { id: 'brick', label: 'Brick', emoji: '🧱', bin: 'hard' },
    { id: 'spoon', label: 'Metal Spoon', emoji: '🥄', bin: 'hard' },
    { id: 'glass', label: 'Drinking Glass', emoji: '🥛', bin: 'hard' },
    { id: 'pillow', label: 'Pillow', emoji: '🛏️', bin: 'soft' },
    { id: 'teddy', label: 'Teddy Bear', emoji: '🧸', bin: 'soft' },
    { id: 'sponge', label: 'Sponge', emoji: '🧽', bin: 'soft' },
    { id: 'cotton', label: 'Cotton Ball', emoji: '☁️', bin: 'soft' },
    { id: 'sock', label: 'Sock', emoji: '🧦', bin: 'soft' },
    { id: 'coin', label: 'Coin', emoji: '🪙', bin: 'hard' }
  ];
  var TEXTURE_BINS = [
    { id: 'hard', label: 'Hard', emoji: '🪨', sub: 'Keeps its shape when you squeeze it.' },
    { id: 'soft', label: 'Soft', emoji: '🧸', sub: 'Squishes or gives when you press it.' }
  ];

  var BEND_ITEMS = [
    { id: 'rubberband', label: 'Rubber Band', emoji: '🔘', bin: 'bendy' },
    { id: 'noodle', label: 'Pool Noodle', emoji: '🏊', bin: 'bendy' },
    { id: 'string', label: 'Shoelace', emoji: '👟', bin: 'bendy' },
    { id: 'leaf', label: 'Leaf', emoji: '🍃', bin: 'bendy' },
    { id: 'ruler', label: 'Wooden Ruler', emoji: '📏', bin: 'stiff' },
    { id: 'pencil', label: 'Pencil', emoji: '✏️', bin: 'stiff' },
    { id: 'plate', label: 'Ceramic Plate', emoji: '🍽️', bin: 'stiff' },
    { id: 'fork', label: 'Metal Fork', emoji: '🍴', bin: 'stiff' },
    { id: 'straw', label: 'Bendy Straw', emoji: '🥤', bin: 'bendy' },
    { id: 'book', label: 'Hardcover Book', emoji: '📕', bin: 'stiff' }
  ];
  var BEND_BINS = [
    { id: 'bendy', label: 'Bendy', emoji: '➰', sub: 'Curves or folds without breaking.' },
    { id: 'stiff', label: 'Stiff', emoji: '📏', sub: 'Stays straight — it resists bending.' }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    var textureRoot = document.getElementById('ms-texture-game');
    var bendRoot = document.getElementById('ms-bend-game');

    var textureGame = textureRoot ? new SortGame(textureRoot, { items: TEXTURE_ITEMS, bins: TEXTURE_BINS, scoreKey: 'texture' }) : null;
    var bendGame = bendRoot ? new SortGame(bendRoot, { items: BEND_ITEMS, bins: BEND_BINS, scoreKey: 'bend' }) : null;

    updateScorePanel();

    var r1 = document.getElementById('ms-texture-reset');
    if (r1) r1.addEventListener('click', function () { textureGame.reset(); });
    var r2 = document.getElementById('ms-bend-reset');
    if (r2) r2.addEventListener('click', function () { bendGame.reset(); });

    initQuiz();
  });
})();
