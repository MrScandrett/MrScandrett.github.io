/* Paradise Lost lesson: story tabs, Satan quiz, rhetoric lab, universe map,
 * shrinking shapes and the blank-verse meter lab. */
(function () {
  'use strict';
  document.querySelectorAll('[data-x-tabs]').forEach(function (wrap) {
    var tabs = Array.prototype.slice.call(wrap.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    function select(n, focus) {
      tabs.forEach(function (t, i) {
        var on = i === n;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (focus) tabs[n].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
    select(0, false);
  });

  document.querySelectorAll('[data-x-quiz]').forEach(function (root) {
    var rounds = JSON.parse(root.querySelector('script[type="application/json"]').textContent);
    var promptEl = root.querySelector('.x-qprompt');
    var optsEl = root.querySelector('.x-qopts');
    var fbEl = root.querySelector('.x-feedback');
    var scEl = root.querySelector('.x-score');
    var nextBtn = root.querySelector('.x-next');
    var ri = 0, score = 0, locked = false, done = false;
    function render() {
      locked = false; done = false;
      var r = rounds[ri];
      promptEl.textContent = r.prompt;
      optsEl.textContent = '';
      r.opts.forEach(function (text, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'x-btn';
        b.textContent = text;
        b.addEventListener('click', function () { pick(i, b); });
        optsEl.appendChild(b);
      });
      fbEl.textContent = 'Choose an answer.';
      nextBtn.hidden = true;
      scEl.textContent = 'Question ' + (ri + 1) + ' of ' + rounds.length + ' \u00b7 Correct so far: ' + score;
    }
    function pick(i, btn) {
      if (locked) return;
      locked = true;
      var r = rounds[ri];
      var ok = i === r.answer;
      if (ok) score++;
      Array.prototype.forEach.call(optsEl.children, function (b, j) {
        b.disabled = true;
        if (j === r.answer) b.classList.add('right');
      });
      if (!ok) btn.classList.add('wrong');
      fbEl.textContent = (ok ? 'Correct. ' : 'Not quite. ') + r.why;
      scEl.textContent = 'Question ' + (ri + 1) + ' of ' + rounds.length + ' \u00b7 Correct so far: ' + score;
      nextBtn.hidden = false;
      nextBtn.textContent = ri === rounds.length - 1 ? 'See results' : 'Next';
      nextBtn.focus();
    }
    nextBtn.addEventListener('click', function () {
      if (done) { ri = 0; score = 0; render(); return; }
      if (ri === rounds.length - 1) {
        done = true;
        promptEl.textContent = 'You got ' + score + ' of ' + rounds.length + '.';
        optsEl.textContent = '';
        fbEl.textContent = root.getAttribute('data-x-outro') || 'Discuss any you missed.';
        nextBtn.textContent = 'Play again';
        return;
      }
      ri++;
      render();
    });
    render();
  });

  // Rhetoric Lab Logic
  var speechData = [
    {
      quote: "“Better to reign in Hell, then serve in Heav’n.” (Book I)",
      hook: "It sounds like the ultimate battle cry of personal sovereignty and liberty: choosing hardship and independence over humble servitude to a supreme ruler.",
      check: "Look at what he rules over: a barren lake of fire and millions of suffering followers whom he led to disaster. His 'freedom' is an eternal prison of pride."
    },
    {
      quote: "“The mind is its own place, and in it self / Can make a Heav’n of Hell, a Hell of Heav’n.” (Book I)",
      hook: "It sounds like profound psychological empowerment: internal mental resilience that overcomes external trauma and oppression.",
      check: "Later, upon reaching Eden, Satan disproves his own slogan when he admits: 'Which way I flie is Hell; my self am Hell.' His corrupted mind carries Hell inside him everywhere."
    },
    {
      quote: "“What though the field be lost? / All is not lost; th’ unconquerable Will” (Book I)",
      hook: "Defiant, underdog resilience after catastrophic military defeat. It echoes the speeches of beloved historical generals and rebels who refuse to surrender.",
      check: "Satan redirects his 'will' not toward rebuilding, but toward poisoning the innocent lives of Adam and Eve out of spite."
    },
    {
      quote: "“Which way I flie is Hell; my self am Hell... / Farwel Remorse: all Good to me is lost; Evil be thou my Good” (Book IV)",
      hook: "The tragic antihero's raw honesty: a villain who is fully aware of their damnation and admits their loneliness.",
      check: "Instead of choosing remorse or reconciliation, he willfully flips ethical reality, consciously resolving that destroying others is his sole remaining purpose."
    }
  ];

  var sbtns = [0, 1, 2, 3].map(function(n) { return document.getElementById('sbtn-' + n); });
  var squote = document.getElementById('speech-quote');
  var shook = document.getElementById('speech-hook');
  var scheck = document.getElementById('speech-check');

  if (squote && shook && scheck) {
    sbtns.forEach(function(btn, idx) {
      if (!btn) return;
      btn.addEventListener('click', function() {
        sbtns.forEach(function(b, j) {
          if (b) b.setAttribute('aria-pressed', j === idx ? 'true' : 'false');
        });
        var d = speechData[idx];
        squote.textContent = d.quote;
        shook.textContent = d.hook;
        scheck.textContent = d.check;
      });
    });
  }

  // Milton's universe: map hotspots and name buttons show one place's notes
  document.querySelectorAll('[data-pl-universe]').forEach(function (root) {
    var spots = root.querySelectorAll('.pl-spot');
    var picks = root.querySelectorAll('button[data-spot]');
    var hots = root.querySelectorAll('.pl-hot');
    function show(id) {
      spots.forEach(function (el) { el.hidden = el.getAttribute('data-spot') !== id; });
      picks.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-spot') === id ? 'true' : 'false'); });
      hots.forEach(function (g) { g.classList.toggle('is-on', g.getAttribute('data-spot') === id); });
    }
    picks.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-spot')); }); });
    hots.forEach(function (g) {
      g.addEventListener('click', function (e) { e.stopPropagation(); show(g.getAttribute('data-spot')); });
    });
    show('flight');
  });

  // Satan's shrinking shapes: one form at a time, earlier / later
  document.querySelectorAll('[data-pl-shapes]').forEach(function (root) {
    var forms = root.querySelectorAll('.pl-shape');
    var btns = root.querySelectorAll('.pl-shape-btn');
    var steps = root.querySelectorAll('[data-shape-step]');
    var at = 0;
    function show(n) {
      at = Math.max(0, Math.min(forms.length - 1, n));
      forms.forEach(function (el, i) { el.hidden = i !== at; });
      btns.forEach(function (b, i) { b.setAttribute('aria-pressed', i === at ? 'true' : 'false'); });
      steps[0].disabled = at === 0;
      steps[1].disabled = at === forms.length - 1;
    }
    btns.forEach(function (b, i) { b.addEventListener('click', function () { show(i); }); });
    steps.forEach(function (b) { b.addEventListener('click', function () { show(at + Number(b.getAttribute('data-shape-step'))); }); });
    show(0);
  });

  // Meter lab: mark stresses, compare with the iambic beat and a reading
  document.querySelectorAll('[data-pl-meter]').forEach(function (root) {
    var lines = JSON.parse(root.querySelector('script[type="application/json"]').textContent);
    var pickEl = root.querySelector('.pl-meter-lines');
    var lineEl = root.querySelector('.pl-meter-line');
    var sylEl = root.querySelector('.pl-syls');
    var fb = root.querySelector('.pl-meter-fb');
    var beatBtn = root.querySelector('[data-act="beat"]');
    var readBtn = root.querySelector('[data-act="reading"]');
    var clearBtn = root.querySelector('[data-act="clear"]');
    var cur = 0, marks = [], showBeat = false, showRead = false;
    var pickBtns = lines.map(function (ln, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'x-speech-btn';
      b.textContent = ln.label;
      b.addEventListener('click', function () { load(i); });
      pickEl.appendChild(b);
      return b;
    });
    function summary() {
      var ln = lines[cur];
      var n = marks.filter(Boolean).length;
      if (!showRead) {
        fb.textContent = n
          ? 'You marked ' + n + ' stress' + (n === 1 ? '' : 'es') + ' on ' + ln.syl.length + ' syllables. Press “Compare with a reading” when you’re ready.'
          : 'Say the line aloud, then press the syllables that get the weight.';
        return;
      }
      var same = 0;
      ln.syl.forEach(function (_, i) { if (!!marks[i] === (ln.read.indexOf(i) !== -1)) same++; });
      var off = [];
      for (var i = 0; i < ln.syl.length; i++) {
        var beat = i % 2 === 1, read = ln.read.indexOf(i) !== -1;
        if (beat !== read) off.push('“' + ln.syl[i] + '”');
      }
      fb.textContent = (n ? 'You agree with this reading on ' + same + ' of ' + ln.syl.length + ' syllables. ' : '') +
        (off.length ? 'Where the reading bends the beat: ' + off.join(', ') + '. ' : 'This reading follows the beat exactly. ') +
        ln.note + ' Readers can disagree; what matters is hearing where Milton pushes against the beat.';
    }
    function draw() {
      var ln = lines[cur];
      sylEl.textContent = '';
      ln.syl.forEach(function (syl, i) {
        var col = document.createElement('div');
        col.className = 'pl-syl';
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pl-syl-btn';
        b.textContent = syl;
        b.setAttribute('aria-pressed', marks[i] ? 'true' : 'false');
        b.setAttribute('aria-label', syl + ', syllable ' + (i + 1) + (marks[i] ? ', stressed' : ''));
        b.addEventListener('click', function () { marks[i] = !marks[i]; draw(); sylEl.children[i].firstChild.focus(); });
        col.appendChild(b);
        var beat = document.createElement('span');
        beat.className = 'pl-mark pl-mark-beat';
        beat.textContent = showBeat ? (i % 2 ? 'DUM' : 'da') : '';
        beat.classList.toggle('is-strong', showBeat && i % 2 === 1);
        col.appendChild(beat);
        var read = document.createElement('span');
        var stressed = ln.read.indexOf(i) !== -1;
        read.className = 'pl-mark pl-mark-read';
        read.textContent = showRead ? (stressed ? '/' : '˘') : '';
        read.classList.toggle('is-strong', showRead && stressed);
        read.classList.toggle('is-bent', showRead && stressed !== (i % 2 === 1));
        col.appendChild(read);
        sylEl.appendChild(col);
      });
      beatBtn.setAttribute('aria-pressed', showBeat ? 'true' : 'false');
      readBtn.setAttribute('aria-pressed', showRead ? 'true' : 'false');
      summary();
    }
    function load(i) {
      cur = i; marks = []; showBeat = false; showRead = false;
      pickBtns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      lineEl.textContent = '';
      lineEl.appendChild(document.createTextNode(lines[i].text + ' '));
      var src = document.createElement('small');
      src.textContent = lines[i].src;
      lineEl.appendChild(src);
      draw();
    }
    beatBtn.addEventListener('click', function () { showBeat = !showBeat; draw(); });
    readBtn.addEventListener('click', function () { showRead = !showRead; draw(); });
    clearBtn.addEventListener('click', function () { marks = []; draw(); });
    load(0);
  });
})();
