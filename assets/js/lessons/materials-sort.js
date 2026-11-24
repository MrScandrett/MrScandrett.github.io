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

  var MS_ICONS = {
    sponge: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="13" width="34" height="22" rx="6" fill="#fde047" stroke="#ca8a04" stroke-width="2.4"/><circle cx="16" cy="21" r="2.2" fill="#b45309" opacity=".55"/><circle cx="25" cy="19" r="1.8" fill="#b45309" opacity=".55"/><circle cx="32" cy="27" r="2.4" fill="#b45309" opacity=".55"/><circle cx="20" cy="29" r="1.9" fill="#b45309" opacity=".55"/></svg>',
    rock: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9,34 L12,17 L23,11 L36,16 L40,32 L28,37 Z" fill="#94a3b8" stroke="#334155" stroke-width="2.4" stroke-linejoin="round"/><path d="M16,22 L24,18 L31,24" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round"/></svg>',
    sock: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18,9 L30,9 L30,27 L36,33 C39,36 37,40 31,40 L18,35 L18,9 Z" fill="#f97316" fill-opacity=".22" stroke="#ea580c" stroke-width="2.4" stroke-linejoin="round"/><line x1="18" y1="15" x2="30" y2="15" stroke="#ea580c" stroke-width="2.2"/></svg>',
    spoon: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="15" rx="7.5" ry="9.5" fill="#cbd5e1" stroke="#334155" stroke-width="2.3"/><line x1="24" y1="24.5" x2="24" y2="41" stroke="#475569" stroke-width="4" stroke-linecap="round"/></svg>',
    cotton: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="26" r="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/><circle cx="30" cy="26" r="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/><circle cx="24" cy="19" r="9" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/></svg>',
    brick: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="14" width="34" height="20" rx="3" fill="#dc2626" fill-opacity=".85" stroke="#7f1d1d" stroke-width="2.3"/><line x1="7" y1="24" x2="41" y2="24" stroke="#fca5a5" stroke-width="2"/><line x1="24" y1="14" x2="24" y2="24" stroke="#fca5a5" stroke-width="2"/><line x1="16" y1="24" x2="16" y2="34" stroke="#fca5a5" stroke-width="2"/><line x1="32" y1="24" x2="32" y2="34" stroke="#fca5a5" stroke-width="2"/></svg>',
    ruler: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="17" width="36" height="14" rx="2.5" fill="#facc15" stroke="#854d0e" stroke-width="2.2"/><line x1="12" y1="17" x2="12" y2="23" stroke="#854d0e" stroke-width="1.8"/><line x1="18" y1="17" x2="18" y2="21" stroke="#854d0e" stroke-width="1.8"/><line x1="24" y1="17" x2="24" y2="24" stroke="#854d0e" stroke-width="1.8"/><line x1="30" y1="17" x2="30" y2="21" stroke="#854d0e" stroke-width="1.8"/><line x1="36" y1="17" x2="36" y2="23" stroke="#854d0e" stroke-width="1.8"/></svg>',
    rubber: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="24" rx="15" ry="9" fill="none" stroke="#d97706" stroke-width="4.5"/></svg>',
    cardboard: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="15" width="32" height="18" rx="3" fill="#d6b48c" stroke="#78350f" stroke-width="2.3"/><path d="M11,24 Q15,20 19,24 T27,24 T35,24" fill="none" stroke="#92400e" stroke-width="2"/></svg>',
    lace: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10,33 C10,19 20,19 24,25 C28,31 38,31 38,16" fill="none" stroke="#0284c7" stroke-width="3.6" stroke-linecap="round"/><circle cx="10" cy="33" r="3" fill="#0f172a"/><circle cx="38" cy="16" r="3" fill="#0f172a"/></svg>',
    wire: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8,28 Q16,12 24,28 T40,22" fill="none" stroke="#ea580c" stroke-width="3.6" stroke-linecap="round"/><circle cx="8" cy="28" r="2.6" fill="#7c2d12"/><circle cx="40" cy="22" r="2.6" fill="#7c2d12"/></svg>',
    wood: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="16" width="34" height="16" rx="3" fill="#b45309" fill-opacity=".75" stroke="#451a03" stroke-width="2.2"/><path d="M11,21 Q24,19 36,22 M12,27 Q25,29 37,26" fill="none" stroke="#fde68a" stroke-width="1.6"/></svg>',
    bendy: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9,34 Q18,12 26,28 T40,14" fill="none" stroke="#14b8a6" stroke-width="4.5" stroke-linecap="round"/></svg>',
    stiff: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="19" width="32" height="10" rx="2.5" fill="#2563eb" stroke="#1e3a8a" stroke-width="2.2"/></svg>'
  };
  function msIcon(id) { return MS_ICONS[id] || ''; }
  function msPressVisual(item) {
    var isSoft = item.answer === 'soft';
    var color = isSoft ? '#f59e0b' : '#64748b';
    var stroke = isSoft ? '#92400e' : '#334155';
    return '<div class="ms-press-stage ' + (isSoft ? 'is-soft' : 'is-hard') + '" aria-hidden="true">' +
      '<svg class="ms-press-svg" viewBox="0 0 260 110">' +
        '<rect x="20" y="92" width="220" height="8" rx="4" fill="#cbd5e1"/>' +
        '<g class="ms-press-probe">' +
          '<rect x="108" y="8" width="44" height="14" rx="4" fill="#334155"/>' +
          '<line x1="130" y1="22" x2="130" y2="44" stroke="#f97316" stroke-width="4"/>' +
          '<polygon points="130,51 122,40 138,40" fill="#f97316"/>' +
        '</g>' +
        '<rect class="ms-press-sample" x="85" y="64" width="90" height="28" rx="6" fill="' + color + '" fill-opacity="0.35" stroke="' + stroke + '" stroke-width="2.5"/>' +
        '<text x="130" y="83" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#0f172a">' + item.label + '</text>' +
      '</svg>' +
    '</div>';
  }

  var TEST_ITEMS = [
    { id: 'sponge', label: 'Sponge', emoji: msIcon('sponge'), answer: 'soft', observation: 'It gives way and changes shape when pressed gently.' },
    { id: 'rock', label: 'Rock', emoji: msIcon('rock'), answer: 'hard', observation: 'It keeps its shape when pressed gently.' },
    { id: 'sock', label: 'Sock', emoji: msIcon('sock'), answer: 'soft', observation: 'The cloth compresses and gives under a gentle press.' },
    { id: 'spoon', label: 'Metal spoon', emoji: msIcon('spoon'), answer: 'hard', observation: 'The metal keeps its shape under a gentle press.' },
    { id: 'cotton', label: 'Cotton ball', emoji: msIcon('cotton'), answer: 'soft', observation: 'The fibers squish together when pressed.' },
    { id: 'brick', label: 'Brick', emoji: msIcon('brick'), answer: 'hard', observation: 'It stays the same shape when pressed.' }
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
    var self = this, panel = this.root.querySelector('.ms-test-card'), matched = prediction === item.answer; panel.innerHTML = '<h3>' + item.emoji + ' Test result</h3>' + msPressVisual(item) + '<div class="ms-test-observation"><strong>Evidence:</strong> ' + item.observation + '</div><p><strong>Now explain:</strong> which word matches the evidence?</p><div class="ms-choice-row"><button class="ms-choice" data-answer="hard">Hard</button><button class="ms-choice" data-answer="soft">Soft</button></div>';
    var stage = panel.querySelector('.ms-press-stage');
    if (stage) requestAnimationFrame(function () { stage.classList.add('is-pressed'); });
    this.feedback(matched ? 'Your prediction matched the test. Nice observing!' : 'The test gave you new evidence. Scientists change their ideas when evidence changes.', matched ? 'correct' : 'incorrect');
    panel.querySelectorAll('.ms-choice').forEach(function (button) { button.addEventListener('click', function () { if (button.dataset.answer !== item.answer) { self.feedback('Look again at the evidence card, then try the explanation.', 'incorrect'); return; } item.done = true; self.done++; score.texture.correct++; updateScorePanel(); self.current = null; self.render(); self.feedback(self.done === self.items.length ? 'All objects tested — you used evidence for every conclusion!' : 'Recorded. Choose the next object to test.', self.done === self.items.length ? 'celebration' : 'correct'); }); });
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
    if (item.bin === bin.id) { card.classList.add('placed'); card.disabled = true; var chip = document.createElement('span'); chip.className = 'ms-bin-chip'; chip.innerHTML = item.emoji + '<span>' + item.label + '</span>'; binEl.querySelector('.ms-bin-contents').appendChild(chip); this.placedCount++; score[this.scoreKey].correct++; updateScorePanel(); this.selected = null; this.feedback(this.placedCount === this.items.length ? 'Great sorting — every material has a job it fits!' : 'Good choice. What evidence supports it?', this.placedCount === this.items.length ? 'celebration' : 'correct'); } else { card.classList.add('shake'); this.feedback('Check the job again. Would this material bend easily or resist bending?', 'incorrect'); setTimeout(function () { card.classList.remove('shake'); }, 450); }
  };
  SortGame.prototype.feedback = function (msg, kind) { var el = this.root.querySelector('.ms-feedback'); el.textContent = msg; el.className = 'ms-feedback ' + kind; };
  SortGame.prototype.reset = function () { this.selected = null; this.placedCount = 0; score[this.scoreKey].correct = 0; updateScorePanel(); this.render(); this.feedback('', ''); };

  var DESIGN_ITEMS = [
    { id: 'ruler', label: 'Plastic ruler', emoji: msIcon('ruler'), bin: 'stiff' }, { id: 'rubber', label: 'Rubber band', emoji: msIcon('rubber'), bin: 'bendy' }, { id: 'cardboard', label: 'Cardboard strip', emoji: msIcon('cardboard'), bin: 'stiff' }, { id: 'lace', label: 'Shoelace', emoji: msIcon('lace'), bin: 'bendy' }, { id: 'wire', label: 'Craft wire', emoji: msIcon('wire'), bin: 'bendy' }, { id: 'wood', label: 'Wooden stick', emoji: msIcon('wood'), bin: 'stiff' }
  ];
  var DESIGN_BINS = [{ id: 'bendy', label: 'Bendy job', emoji: msIcon('bendy'), sub: 'A knot, curve, or loop is needed.' }, { id: 'stiff', label: 'Stiff job', emoji: msIcon('stiff'), sub: 'The part must hold its shape.' }];

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
