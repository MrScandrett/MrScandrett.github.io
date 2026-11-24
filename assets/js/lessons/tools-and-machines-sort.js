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
      chip.innerHTML = item.emoji + '<span>' + item.label + '</span>';
      binEl.querySelector('.tms-bin-contents').appendChild(chip);
      binEl.classList.add('correct-flash');
      setTimeout(function () { binEl.classList.remove('correct-flash'); }, 500);
      this.feedback(item.label + ' is correct — ' + bin.label + '.', 'correct');
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
  var TMS_ICONS = {
    hammer: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="22" y="20" width="6" height="21" rx="2.5" fill="#b45309"/><path d="M12,11 L33,11 L36,19 L12,19 Z" fill="#475569" stroke="#1e293b" stroke-width="2" stroke-linejoin="round"/></svg>',
    mallet: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="21.5" y="21" width="5.5" height="20" rx="2.5" fill="#b45309"/><rect x="12" y="10" width="24" height="12" rx="3" fill="#d97706" stroke="#78350f" stroke-width="2"/></svg>',
    screwdriver: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="20" y="23" width="8" height="17" rx="4" fill="#ef4444" stroke="#991b1b" stroke-width="2"/><rect x="22.5" y="9" width="3" height="14" fill="#64748b"/><polygon points="21.5,9 26.5,9 25.5,5 22.5,5" fill="#334155"/></svg>',
    drill: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11,13 L28,13 L30,22 L19,22 L17,37 L10,37 L13,22 Z" fill="#2563eb" stroke="#1e3a8a" stroke-width="2" stroke-linejoin="round"/><line x1="30" y1="17.5" x2="42" y2="17.5" stroke="#475569" stroke-width="3" stroke-linecap="round"/></svg>',
    wrench: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15,35 L30,20 A8,8 0 1,1 36,14 L31,15 L33,19 L38,17 A8,8 0 0,1 26,24 L18,38 C16,40 13,37 15,35 Z" fill="#94a3b8" stroke="#334155" stroke-width="2" stroke-linejoin="round"/></svg>',
    pliers: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18,10 L23,22 L15,39 M30,10 L25,22 L33,39" fill="none" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="22" r="3.5" fill="#475569"/></svg>',
    saw: '<svg viewBox="0 0 48 48" aria-hidden="true"><polygon points="8,16 34,20 34,26 8,22" fill="#cbd5e1" stroke="#475569" stroke-width="1.8"/><rect x="33" y="16" width="8" height="14" rx="3" fill="#d97706" stroke="#78350f" stroke-width="2"/></svg>',
    sandpaper: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="13" width="30" height="22" rx="4" fill="#b45309" fill-opacity=".85" stroke="#78350f" stroke-width="2"/><circle cx="17" cy="20" r="1.5" fill="#fef3c7"/><circle cx="25" cy="24" r="1.5" fill="#fef3c7"/><circle cx="31" cy="19" r="1.5" fill="#fef3c7"/><circle cx="21" cy="29" r="1.5" fill="#fef3c7"/><circle cx="32" cy="28" r="1.5" fill="#fef3c7"/></svg>',
    tapemeasure: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="13" width="22" height="22" rx="6" fill="#eab308" stroke="#854d0e" stroke-width="2.2"/><circle cx="21" cy="24" r="5" fill="#1e293b"/><line x1="28" y1="35" x2="41" y2="35" stroke="#fde047" stroke-width="4" stroke-linecap="round"/></svg>',
    ruler: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="18" width="34" height="12" rx="2" fill="#facc15" stroke="#854d0e" stroke-width="2"/><line x1="14" y1="18" x2="14" y2="23" stroke="#854d0e" stroke-width="1.8"/><line x1="24" y1="18" x2="24" y2="24" stroke="#854d0e" stroke-width="1.8"/><line x1="34" y1="18" x2="34" y2="23" stroke="#854d0e" stroke-width="1.8"/></svg>',
    nail: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="16" y="10" width="16" height="4" rx="2" fill="#334155"/><polygon points="22,14 26,14 24,39" fill="#64748b"/></svg>',
    screw: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="15" y="10" width="18" height="5" rx="2" fill="#475569"/><path d="M21,15 L27,15 L25,38 L23,38 Z" fill="#64748b"/><line x1="19" y1="20" x2="29" y2="22" stroke="#e2e8f0" stroke-width="2"/><line x1="20" y1="26" x2="28" y2="28" stroke="#e2e8f0" stroke-width="2"/></svg>',
    bolt: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="11" fill="none" stroke="#2563eb" stroke-width="5"/><circle cx="24" cy="24" r="4" fill="#1e3a8a"/></svg>',
    wood: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="16" width="32" height="16" rx="3" fill="#d97706" fill-opacity=".65" stroke="#78350f" stroke-width="2"/></svg>',
    measure: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9,33 L39,33 L39,13 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="2.2"/></svg>',
    doorknob: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="12" fill="#f59e0b" stroke="#78350f" stroke-width="2.2"/><circle cx="24" cy="24" r="4" fill="#78350f"/></svg>',
    steeringwheel: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="14" fill="none" stroke="#334155" stroke-width="4.5"/><circle cx="24" cy="24" r="4" fill="#475569"/><line x1="11" y1="24" x2="37" y2="24" stroke="#334155" stroke-width="3"/><line x1="24" y1="24" x2="24" y2="37" stroke="#334155" stroke-width="3"/></svg>',
    jarlid: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="18" rx="14" ry="6" fill="#38bdf8" stroke="#0369a1" stroke-width="2.2"/><path d="M10,18 L10,27 C10,30 38,30 38,27 L38,18" fill="#0ea5e9" stroke="#0369a1" stroke-width="2.2"/></svg>',
    slide: '<svg viewBox="0 0 48 48" aria-hidden="true"><line x1="12" y1="14" x2="12" y2="37" stroke="#475569" stroke-width="3"/><path d="M12,14 Q23,28 38,34" fill="none" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/></svg>',
    wheelchairramp: '<svg viewBox="0 0 48 48" aria-hidden="true"><polygon points="9,36 39,36 39,18" fill="#dbeafe" stroke="#2563eb" stroke-width="2.4"/></svg>',
    seesaw: '<svg viewBox="0 0 48 48" aria-hidden="true"><polygon points="18,38 24,25 30,38" fill="#475569"/><line x1="8" y1="29" x2="40" y2="19" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round"/></svg>',
    bottleopener: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13,35 L25,21 A7,7 0 1,1 34,14 A7,7 0 0,1 27,23 L17,37 Z" fill="#94a3b8" stroke="#334155" stroke-width="2"/></svg>',
    nutcracker: '<svg viewBox="0 0 48 48" aria-hidden="true"><line x1="12" y1="14" x2="36" y2="23" stroke="#b45309" stroke-width="4" stroke-linecap="round"/><line x1="12" y1="34" x2="36" y2="25" stroke="#b45309" stroke-width="4" stroke-linecap="round"/><circle cx="37" cy="24" r="3" fill="#475569"/><circle cx="21" cy="24" r="4" fill="#d97706"/></svg>',
    flagpole: '<svg viewBox="0 0 48 48" aria-hidden="true"><line x1="16" y1="9" x2="16" y2="39" stroke="#475569" stroke-width="3.5"/><circle cx="16" cy="11" r="3.5" fill="#94a3b8"/><polygon points="18,12 36,17 18,23" fill="#ef4444"/></svg>',
    crane: '<svg viewBox="0 0 48 48" aria-hidden="true"><line x1="15" y1="38" x2="15" y2="12" stroke="#eab308" stroke-width="4"/><line x1="13" y1="13" x2="38" y2="13" stroke="#eab308" stroke-width="3.5"/><line x1="33" y1="13" x2="33" y2="26" stroke="#475569" stroke-width="2"/><rect x="28" y="26" width="10" height="8" rx="1.5" fill="#2563eb"/></svg>',
    wheel: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="14" fill="none" stroke="#2563eb" stroke-width="4.5"/><circle cx="24" cy="24" r="4.5" fill="#1e3a8a"/></svg>',
    ramp: '<svg viewBox="0 0 48 48" aria-hidden="true"><polygon points="8,36 40,36 40,14" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/></svg>',
    lever: '<svg viewBox="0 0 48 48" aria-hidden="true"><polygon points="19,37 24,25 29,37" fill="#475569"/><line x1="8" y1="28" x2="40" y2="20" stroke="#f59e0b" stroke-width="4.5" stroke-linecap="round"/></svg>',
    pulley: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="9" fill="#cbd5e1" stroke="#334155" stroke-width="2.5"/><line x1="15" y1="17" x2="15" y2="37" stroke="#d97706" stroke-width="3"/><line x1="33" y1="17" x2="33" y2="34" stroke="#d97706" stroke-width="3"/></svg>'
  };
  function tmsIcon(id) { return TMS_ICONS[id] || ''; }

  var TOOL_ITEMS = [
    { id: 'hammer', label: 'Hammer', emoji: tmsIcon('hammer'), bin: 'nail' },
    { id: 'mallet', label: 'Mallet', emoji: tmsIcon('mallet'), bin: 'nail' },
    { id: 'screwdriver', label: 'Screwdriver', emoji: tmsIcon('screwdriver'), bin: 'screw' },
    { id: 'drill', label: 'Drill', emoji: tmsIcon('drill'), bin: 'screw' },
    { id: 'wrench', label: 'Wrench', emoji: tmsIcon('wrench'), bin: 'bolt' },
    { id: 'pliers', label: 'Pliers', emoji: tmsIcon('pliers'), bin: 'bolt' },
    { id: 'saw', label: 'Saw', emoji: tmsIcon('saw'), bin: 'wood' },
    { id: 'sandpaper', label: 'Sandpaper', emoji: tmsIcon('sandpaper'), bin: 'wood' },
    { id: 'tapemeasure', label: 'Tape Measure', emoji: tmsIcon('tapemeasure'), bin: 'measure' },
    { id: 'ruler', label: 'Ruler', emoji: tmsIcon('ruler'), bin: 'measure' }
  ];
  var TOOL_BINS = [
    { id: 'nail', label: 'Pounds a Nail', emoji: tmsIcon('nail'), sub: 'Strikes something in with force.' },
    { id: 'screw', label: 'Turns a Screw', emoji: tmsIcon('screw'), sub: 'Twists something round and round.' },
    { id: 'bolt', label: 'Grips &amp; Twists', emoji: tmsIcon('bolt'), sub: 'Grabs on tight, then turns.' },
    { id: 'wood', label: 'Shapes Wood', emoji: tmsIcon('wood'), sub: 'Cuts or smooths a piece of wood.' },
    { id: 'measure', label: 'Measures Length', emoji: tmsIcon('measure'), sub: 'Tells you exactly how long something is.' }
  ];

  var MACHINE_ITEMS = [
    { id: 'doorknob', label: 'Doorknob', emoji: tmsIcon('doorknob'), bin: 'wheel' },
    { id: 'steeringwheel', label: 'Steering Wheel', emoji: tmsIcon('steeringwheel'), bin: 'wheel' },
    { id: 'jarlid', label: 'Jar Lid', emoji: tmsIcon('jarlid'), bin: 'wheel' },
    { id: 'slide', label: 'Playground Slide', emoji: tmsIcon('slide'), bin: 'ramp' },
    { id: 'wheelchairramp', label: 'Wheelchair Ramp', emoji: tmsIcon('wheelchairramp'), bin: 'ramp' },
    { id: 'seesaw', label: 'Seesaw', emoji: tmsIcon('seesaw'), bin: 'lever' },
    { id: 'bottleopener', label: 'Bottle Opener', emoji: tmsIcon('bottleopener'), bin: 'lever' },
    { id: 'nutcracker', label: 'Nutcracker', emoji: tmsIcon('nutcracker'), bin: 'lever' },
    { id: 'flagpole', label: 'Flagpole Pulley', emoji: tmsIcon('flagpole'), bin: 'pulley' },
    { id: 'crane', label: 'Toy Crane', emoji: tmsIcon('crane'), bin: 'pulley' }
  ];
  var MACHINE_BINS = [
    { id: 'wheel', label: 'Wheel &amp; Axle', emoji: tmsIcon('wheel'), sub: 'A round part that spins around a center.' },
    { id: 'ramp', label: 'Ramp', emoji: tmsIcon('ramp'), sub: 'A slanted surface that makes going up easier.' },
    { id: 'lever', label: 'Lever', emoji: tmsIcon('lever'), sub: 'A bar that tips or pivots to lift or pry.' },
    { id: 'pulley', label: 'Pulley', emoji: tmsIcon('pulley'), sub: 'A wheel with a rope that changes lifting direction.' }
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
