/** Materials Sort: a prediction, test, evidence, and design lesson. */
(function () {
  'use strict';
  var score = { texture: { correct: 0, total: 6 }, bend: { correct: 0, total: 6 } };
  function updateScorePanel() {
    var total = score.texture.correct + score.bend.correct;
    var el = document.getElementById('ms-score-total'); if (el) el.textContent = total + ' / 12';
    var s1 = document.getElementById('ms-score-texture'); if (s1) s1.textContent = score.texture.correct + ' / 6';
    var s2 = document.getElementById('ms-score-bend'); if (s2) s2.textContent = score.bend.correct + ' / 6';
  }

  var TEST_ITEMS = [
    { id: 'sponge', label: 'Sponge', emoji: '🧽', answer: 'soft', observation: 'It gives way and changes shape when pressed gently.' },
    { id: 'rock', label: 'Rock', emoji: '🪨', answer: 'hard', observation: 'It keeps its shape when pressed gently.' },
    { id: 'sock', label: 'Sock', emoji: '🧦', answer: 'soft', observation: 'The cloth compresses and gives under a gentle press.' },
    { id: 'spoon', label: 'Metal spoon', emoji: '🥄', answer: 'hard', observation: 'The metal keeps its shape under a gentle press.' },
    { id: 'cotton', label: 'Cotton ball', emoji: '☁️', answer: 'soft', observation: 'The fibers squish together when pressed.' },
    { id: 'brick', label: 'Brick', emoji: '🧱', answer: 'hard', observation: 'It stays the same shape when pressed.' }
  ];

  function GuidedTest(root) { this.root = root; this.items = TEST_ITEMS; this.done = 0; this.current = null; this.render(); }
  GuidedTest.prototype.render = function () {
    var self = this, pool = this.root.querySelector('.ms-pool'); pool.innerHTML = '';
    this.root.querySelector('.ms-test-progress').textContent = this.done + ' of ' + this.items.length + ' objects tested';
    this.items.forEach(function (item) { var card = document.createElement('button'); card.type = 'button'; card.className = 'ms-item'; card.dataset.id = item.id; card.innerHTML = '<span class="ms-item-emoji" aria-hidden="true">' + item.emoji + '</span><span>' + item.label + '</span>'; if (item.done) { card.classList.add('placed'); card.disabled = true; } else card.addEventListener('click', function () { self.choose(item, card); }); pool.appendChild(card); });
    if (!this.current) this.root.querySelector('.ms-test-card').hidden = true;
  };
  GuidedTest.prototype.choose = function (item, card) {
    var self = this; this.current = item; this.root.querySelectorAll('.ms-item').forEach(function (el) { el.classList.remove('selected'); }); card.classList.add('selected');
    var panel = this.root.querySelector('.ms-test-card'); panel.hidden = false; panel.innerHTML = '<h3>' + item.emoji + ' ' + item.label + '</h3><p><strong>Make a prediction:</strong> if you press it gently, will it keep its shape?</p><div class="ms-choice-row"><button class="ms-choice" data-answer="hard">Hard — keeps its shape</button><button class="ms-choice" data-answer="soft">Soft — gives or squishes</button></div>';
    panel.querySelectorAll('.ms-choice').forEach(function (button) { button.addEventListener('click', function () { self.predict(item, button.dataset.answer); }); });
  };
  GuidedTest.prototype.predict = function (item, prediction) {
    var self = this, panel = this.root.querySelector('.ms-test-card'); panel.innerHTML = '<h3>' + item.emoji + ' ' + item.label + '</h3><p><strong>Your prediction:</strong> ' + (prediction === 'hard' ? 'It will keep its shape.' : 'It will give or squish.') + '</p><button class="ms-btn ms-btn-primary" type="button">▶ Run the gentle press test</button>'; panel.querySelector('button').addEventListener('click', function () { self.reveal(item, prediction); });
  };
  GuidedTest.prototype.reveal = function (item, prediction) {
    var self = this, panel = this.root.querySelector('.ms-test-card'), matched = prediction === item.answer; panel.innerHTML = '<h3>' + item.emoji + ' Test result</h3><div class="ms-test-observation"><strong>Evidence:</strong> ' + item.observation + '</div><p><strong>Now explain:</strong> which word matches the evidence?</p><div class="ms-choice-row"><button class="ms-choice" data-answer="hard">Hard</button><button class="ms-choice" data-answer="soft">Soft</button></div>';
    this.feedback(matched ? 'Your prediction matched the test. Nice observing!' : 'The test gave you new evidence. Scientists change their ideas when evidence changes.', matched ? 'correct' : 'incorrect');
    panel.querySelectorAll('.ms-choice').forEach(function (button) { button.addEventListener('click', function () { if (button.dataset.answer !== item.answer) { self.feedback('Look again at the evidence card, then try the explanation.', 'incorrect'); return; } item.done = true; self.done++; score.texture.correct++; updateScorePanel(); self.current = null; self.render(); self.feedback(self.done === self.items.length ? '🎉 You tested every object and used evidence for each conclusion.' : 'Recorded. Choose the next object to test.', self.done === self.items.length ? 'celebration' : 'correct'); }); });
  };
  GuidedTest.prototype.feedback = function (msg, kind) { var el = this.root.querySelector('.ms-feedback'); el.textContent = msg; el.className = 'ms-feedback ' + kind; };
  GuidedTest.prototype.reset = function () { this.items.forEach(function (item) { delete item.done; }); this.done = 0; this.current = null; score.texture.correct = 0; updateScorePanel(); this.feedback('', ''); this.render(); };

  function SortGame(root, opts) { this.root = root; this.items = opts.items; this.bins = opts.bins; this.scoreKey = opts.scoreKey; this.selected = null; this.placedCount = 0; this.render(); }
  SortGame.prototype.render = function () {
    var self = this, pool = this.root.querySelector('.ms-pool'), bins = this.root.querySelector('.ms-bins'); pool.innerHTML = ''; bins.innerHTML = '';
    this.items.forEach(function (item) { var card = document.createElement('button'); card.type = 'button'; card.className = 'ms-item'; card.dataset.id = item.id; card.innerHTML = '<span class="ms-item-emoji" aria-hidden="true">' + item.emoji + '</span><span>' + item.label + '</span>'; card.addEventListener('click', function () { self.select(card, item); }); pool.appendChild(card); });
    this.bins.forEach(function (bin) { var el = document.createElement('div'); el.className = 'ms-bin'; el.dataset.bin = bin.id; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.innerHTML = '<div class="ms-bin-label">' + bin.emoji + ' ' + bin.label + '</div><div class="ms-bin-sub">' + bin.sub + '</div><div class="ms-bin-contents"></div>'; el.addEventListener('click', function () { self.place(bin); }); el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.place(bin); } }); bins.appendChild(el); });
  };
  SortGame.prototype.select = function (card, item) { if (card.classList.contains('placed')) return; this.root.querySelectorAll('.ms-item').forEach(function (el) { el.classList.remove('selected'); }); card.classList.add('selected'); this.selected = item; this.root.querySelectorAll('.ms-bin').forEach(function (el) { el.classList.add('ready'); }); };
  SortGame.prototype.place = function (bin) {
    if (!this.selected) { this.feedback('Choose a material first. What property does the job need?', 'incorrect'); return; }
    var item = this.selected, card = this.root.querySelector('[data-id="' + item.id + '"]'), binEl = this.root.querySelector('[data-bin="' + bin.id + '"]'); this.root.querySelectorAll('.ms-bin').forEach(function (el) { el.classList.remove('ready'); });
    if (item.bin === bin.id) { card.classList.add('placed'); card.disabled = true; var chip = document.createElement('span'); chip.className = 'ms-bin-chip'; chip.textContent = item.emoji + ' ' + item.label; binEl.querySelector('.ms-bin-contents').appendChild(chip); this.placedCount++; score[this.scoreKey].correct++; updateScorePanel(); this.selected = null; this.feedback(this.placedCount === this.items.length ? '🎉 Every material has a job it fits.' : 'Good choice. What evidence supports it?', this.placedCount === this.items.length ? 'celebration' : 'correct'); } else { card.classList.add('shake'); this.feedback('Check the job again. Would this material bend easily or resist bending?', 'incorrect'); setTimeout(function () { card.classList.remove('shake'); }, 450); }
  };
  SortGame.prototype.feedback = function (msg, kind) { var el = this.root.querySelector('.ms-feedback'); el.textContent = msg; el.className = 'ms-feedback ' + kind; };
  SortGame.prototype.reset = function () { this.selected = null; this.placedCount = 0; score[this.scoreKey].correct = 0; updateScorePanel(); this.render(); this.feedback('', ''); };

  var DESIGN_ITEMS = [
    { id: 'ruler', label: 'Plastic ruler', emoji: '📏', bin: 'stiff' }, { id: 'rubber', label: 'Rubber band', emoji: '🔘', bin: 'bendy' }, { id: 'cardboard', label: 'Cardboard strip', emoji: '📦', bin: 'stiff' }, { id: 'lace', label: 'Shoelace', emoji: '👟', bin: 'bendy' }, { id: 'wire', label: 'Craft wire', emoji: '〰️', bin: 'bendy' }, { id: 'wood', label: 'Wooden stick', emoji: '🪵', bin: 'stiff' }
  ];
  var DESIGN_BINS = [{ id: 'bendy', label: 'Bendy job', emoji: '➰', sub: 'A knot, curve, or loop is needed.' }, { id: 'stiff', label: 'Stiff job', emoji: '📏', sub: 'The part must hold its shape.' }];

  function initQuiz() {
    var check = document.getElementById('ms-quiz-check'), clear = document.getElementById('ms-quiz-clear'), result = document.getElementById('ms-quiz-result'); if (!check) return;
    check.addEventListener('click', function () { var qs = document.querySelectorAll('.ms-quiz-question'), correct = 0; qs.forEach(function (q) { var choice = q.querySelector(':checked'); if (choice && choice.value === 'correct') correct++; }); result.style.display = 'block'; result.className = 'ms-quiz-result ' + (correct === qs.length ? 'good' : 'okay'); result.textContent = correct === qs.length ? '🌟 You used the evidence like an engineer.' : 'You got ' + correct + ' out of ' + qs.length + '. Revisit the test evidence and try again.'; });
    clear.addEventListener('click', function () { document.querySelectorAll('.ms-quiz-question :checked').forEach(function (input) { input.checked = false; }); result.style.display = 'none'; });
  }
  document.addEventListener('DOMContentLoaded', function () {
    var testRoot = document.getElementById('ms-texture-game'), bendRoot = document.getElementById('ms-bend-game');
    var test = testRoot ? new GuidedTest(testRoot) : null, bend = bendRoot ? new SortGame(bendRoot, { items: DESIGN_ITEMS, bins: DESIGN_BINS, scoreKey: 'bend' }) : null; updateScorePanel();
    var resetTest = document.getElementById('ms-texture-reset'), resetBend = document.getElementById('ms-bend-reset');
    if (resetTest) resetTest.addEventListener('click', function () { test.reset(); }); if (resetBend) resetBend.addEventListener('click', function () { bend.reset(); }); initQuiz();
  });
})();
