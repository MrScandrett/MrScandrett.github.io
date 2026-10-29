/* Revelation lesson: act map, hear/see cards, the sevens switch, echo finder,
   reading lenses, text-or-interpretation practice, and the check quiz. */
(function () {
  'use strict';
  var page = document.querySelector('.rv-page');
  if (!page) return;

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }
  function shuffle(list, seed) {
    var a = list.slice(), s = seed || 7;
    for (var i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; var j = Math.floor(s / 233280 * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* Act map: width by chapter count, highlight the act on screen. */
  var mapLinks = Array.prototype.slice.call(page.querySelectorAll('.rv-acts-map a'));
  mapLinks.forEach(function (a) { a.parentNode.style.setProperty('--span', a.getAttribute('data-span') || '2'); });
  if ('IntersectionObserver' in window && mapLinks.length) {
    var acts = mapLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    // A thin band a third of the way down the screen: the act crossing it is the one being read.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        mapLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + e.target.id;
          a.classList.toggle('is-current', on);
          if (on) { a.classList.add('is-read'); a.setAttribute('aria-current', 'step'); } else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-33% 0px -62% 0px' });
    acts.forEach(function (act) { io.observe(act); });
  }

  /* Hear / see cards */
  page.querySelectorAll('.rv-flip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });

  /* Sequence or spiral */
  var structure = page.querySelector('.rv-structure');
  var switchBtns = page.querySelectorAll('.rv-switch-btn');
  function setMode(mode) {
    switchBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
    page.querySelectorAll('.rv-switch-panel').forEach(function (p) { p.hidden = p.getAttribute('data-mode') !== mode; });
    if (structure) structure.setAttribute('data-mode', mode);
  }
  switchBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
  if (switchBtns.length) setMode('sequence');

  /* Echo finder */
  var ECHOES = [
    { image: 'Seven lampstands', rev: 'Revelation 1:12, 20; 11:4', answer: 'Zechariah 4', options: ['Zechariah 4', 'Genesis 15', 'Psalm 23'],
      source: '“I see, and behold, a lampstand all of gold… And there are two olive trees by it” (Zechariah 4:2–3).',
      why: 'Zechariah’s lampstand and olive trees stand for God’s Spirit at work through his people (“not by might, nor by power, but by my Spirit”, 4:6). Revelation makes the churches and the two witnesses lampstands: small, but burning with the Spirit.' },
    { image: 'Four living creatures', rev: 'Revelation 4:6–8', answer: 'Ezekiel 1 and Isaiah 6', options: ['Ezekiel 1 and Isaiah 6', 'Daniel 2', 'Jonah 1'],
      source: '“Each had four faces… the face of a human being… a lion… an ox… an eagle” (Ezekiel 1:10). “Each had six wings… And one called to another: Holy, holy, holy” (Isaiah 6:2–3).',
      why: 'John merges the two greatest throne visions of the prophets. The creatures stand for all living creation, worshipping without end.' },
    { image: 'A beast from the sea', rev: 'Revelation 13:1–2', answer: 'Daniel 7', options: ['Daniel 7', 'Job 41 only', 'Genesis 1'],
      source: '“Four great beasts came up out of the sea… like a lion… like a bear… like a leopard… and it had ten horns” (Daniel 7:3–7).',
      why: 'Daniel saw four empires as four beasts. Revelation’s beast combines all of them: Rome as the sum of every empire that made itself a god.' },
    { image: 'Eating the scroll', rev: 'Revelation 10:9–10', answer: 'Ezekiel 3', options: ['Ezekiel 3', 'Exodus 16', 'Proverbs 9'],
      source: '“Son of man, eat this scroll, and go, speak to the house of Israel.” … “It was in my mouth as sweet as honey” (Ezekiel 3:1–3).',
      why: 'Like Ezekiel, John is being commissioned as a prophet. The word is sweet to receive and bitter to deliver.' },
    { image: 'Hail, blood, darkness, locusts', rev: 'Revelation 8–9; 16', answer: 'Exodus 7–10', options: ['Exodus 7–10', 'Joshua 6', '1 Samuel 5'],
      source: 'The plagues on Egypt: water to blood, frogs, boils, hail and fire, locusts, darkness (Exodus 7–10).',
      why: 'Revelation retells the church’s story as a new Exodus: an empire judged, a people freed, a song sung beside the sea (15:3).' },
    { image: 'Babylon thrown down', rev: 'Revelation 18:21', answer: 'Jeremiah 51', options: ['Jeremiah 51', 'Genesis 11 only', 'Nahum 1'],
      source: '“Bind a stone to it and cast it into the midst of the Euphrates, and say, ‘Thus shall Babylon sink, to rise no more’” (Jeremiah 51:63–64).',
      why: 'Jeremiah’s oracle against the empire that destroyed Jerusalem becomes the template for Rome’s fall, and for every empire that rules by violence and luxury.' },
    { image: 'A river and healing leaves', rev: 'Revelation 22:1–2', answer: 'Ezekiel 47', options: ['Ezekiel 47', 'Psalm 137', 'Amos 5'],
      source: '“Water was issuing from below the threshold of the temple… on both banks… all kinds of trees… their leaves for healing” (Ezekiel 47:1, 12).',
      why: 'Ezekiel saw a river flowing from a rebuilt temple. In Revelation it flows from the throne of God and the Lamb, and its leaves heal not Israel only but “the nations”.' },
    { image: 'The tree of life', rev: 'Revelation 2:7; 22:2, 14', answer: 'Genesis 2–3', options: ['Genesis 2–3', 'Judges 9', 'Matthew 13'],
      source: '“The tree of life in the midst of the garden” (Genesis 2:9); “he placed the cherubim… to guard the way to the tree of life” (3:24).',
      why: 'The way that was barred at the beginning of the Bible stands open at the end.' }
  ];
  var pick = page.querySelector('.rv-echo-pick');
  var stage = page.querySelector('.rv-echo-stage');
  var scoreEl = page.querySelector('.rv-echo-score');
  var solved = {};
  function updateScore() {
    var n = Object.keys(solved).length;
    scoreEl.textContent = n ? n + ' of ' + ECHOES.length + ' echoes traced' + (n === ECHOES.length ? '. You heard every melody.' : '.') : '';
  }
  function showEcho(i) {
    var item = ECHOES[i];
    pick.querySelectorAll('button').forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); });
    stage.textContent = '';
    stage.appendChild(el('p', { class: 'rv-kind' }, item.rev));
    stage.appendChild(el('h3', null, item.image));
    stage.appendChild(el('p', null, 'Where did John’s first hearers meet this image before?'));
    var opts = el('div', { class: 'rv-echo-options' });
    shuffle(item.options, i + 3).forEach(function (opt) {
      var b = el('button', { type: 'button' }, opt);
      b.addEventListener('click', function () {
        if (opt === item.answer) {
          b.classList.add('is-right');
          opts.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
          var r = el('div', { class: 'rv-echo-reveal' });
          r.appendChild(el('blockquote', null, item.source));
          r.appendChild(el('p', null, item.why));
          stage.appendChild(r);
          solved[i] = true;
          pick.children[i].classList.add('is-solved');
          updateScore();
        } else {
          b.classList.add('is-wrong'); b.disabled = true;
        }
      });
      opts.appendChild(b);
    });
    stage.appendChild(opts);
  }
  if (pick && stage) {
    ECHOES.forEach(function (item, i) {
      var b = el('button', { type: 'button', 'aria-pressed': 'false' }, item.image);
      b.addEventListener('click', function () { showEcho(i); });
      pick.appendChild(b);
    });
  }

  /* Reading lenses (tabs) */
  var tabs = Array.prototype.slice.call(page.querySelectorAll('.rv-lenses [role=tab]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') selectTab(tabs[0], true);
      else if (e.key === 'End') selectTab(tabs[tabs.length - 1], true);
      else if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* Text or interpretation? */
  var SORT = [
    ['John was on Patmos “on account of the word of God and the testimony of Jesus.”', 'text', 'Revelation 1:9 says this directly.'],
    ['The number 666 refers to Nero.', 'interp', 'A strong and widely held proposal, but the text does not name anyone.'],
    ['The seven heads of the beast are seven hills.', 'text', 'The angel says so in 17:9.'],
    ['The thousand years is the present age of the church.', 'interp', 'This is the amillennial reading (Augustine). Others read it differently.'],
    ['Laodicea’s lukewarm water supply lies behind 3:15–16.', 'interp', 'A well-supported historical suggestion; the letter itself does not mention the aqueduct.'],
    ['The seven lampstands are the seven churches.', 'text', 'Revelation 1:20 explains the image.'],
    ['Each series of seven retells the same period of history.', 'interp', 'The recapitulation reading, argued from clues like the repeated storm at the end of each series.'],
    ['In the new Jerusalem, John saw no temple.', 'text', 'Revelation 21:22.']
  ];
  var sortList = page.querySelector('.rv-sort-list');
  if (sortList) SORT.forEach(function (row) {
    var li = el('li'); li.appendChild(el('span', null, row[0]));
    var btns = el('span', { class: 'rv-sort-btns', role: 'group', 'aria-label': 'Classify this statement' });
    var why = el('span', { class: 'rv-sort-why', 'aria-live': 'polite' });
    [['text', 'What the text says'], ['interp', 'An interpretation']].forEach(function (c) {
      var b = el('button', { type: 'button', 'aria-pressed': 'false' }, c[1]);
      b.addEventListener('click', function () {
        btns.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); x.classList.remove('is-right', 'is-wrong'); });
        b.setAttribute('aria-pressed', 'true');
        var ok = c[0] === row[1];
        b.classList.add(ok ? 'is-right' : 'is-wrong');
        why.textContent = (ok ? 'Yes. ' : 'Look again. ') + row[2];
      });
      btns.appendChild(b);
    });
    li.appendChild(btns); li.appendChild(why); sortList.appendChild(li);
  });

  /* Check quiz */
  var QUIZ = [
    ['Who were Revelation’s first readers?', ['Seven churches in the Roman province of Asia', 'Christians living two thousand years later', 'The Roman emperor’s court'], 0,
      'The book is addressed “to the seven churches that are in Asia” (1:4). Whatever else it means, it first meant something to them.'],
    ['John hears “the Lion of the tribe of Judah has conquered” and turns to see…', ['A lion with seven heads', 'A Lamb standing, as though it had been slain', 'An army on white horses'], 1,
      'Revelation 5:5–6 is the hinge of the book: Christ conquers by self-giving death, not by force.'],
    ['Why do the trumpet and bowl judgments resemble hail, blood, darkness and locusts?', ['They predict modern weapons', 'They replay the plagues of the Exodus', 'They are random disasters'], 1,
      'Revelation frames the church’s story as a new Exodus from a new Pharaoh, Rome.'],
    ['What finally leads people to “give glory to the God of heaven” in chapter 11?', ['The sixth trumpet’s army', 'The faithful witness, death and rising of the two witnesses', 'A great hailstorm'], 1,
      'After the plagues, “they did not repent” (9:20). After the witnesses, the survivors give God glory (11:13).'],
    ['What is missing from the New Jerusalem?', ['A river', 'A temple building', 'Gates'], 1,
      '“I saw no temple in the city, for its temple is the Lord God the Almighty and the Lamb” (21:22). The whole city is God’s dwelling.'],
    ['Which is the most careful way to read the number 666?', ['Match it to a current headline', 'Ignore it', 'Use the book’s own clues and history, and label any identification as an interpretation'], 2,
      'John invites calculation (13:18). Nero Caesar is a strong proposal, but it remains an argued reading, not the text itself.']
  ];
  var quiz = page.querySelector('.rv-quiz');
  if (quiz) {
    var answered = 0, right = 0;
    var score = el('p', { class: 'rv-quiz-score' });
    QUIZ.forEach(function (q, qi) {
      var box = el('div', { class: 'rv-q' });
      box.appendChild(el('h3', null, (qi + 1) + '. ' + q[0]));
      var opts = el('div', { class: 'rv-q-opts' });
      var why = el('p', { class: 'rv-q-why', hidden: '' });
      q[1].forEach(function (text, oi) {
        var b = el('button', { type: 'button' }, text);
        b.addEventListener('click', function () {
          opts.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
          b.classList.add(oi === q[2] ? 'is-right' : 'is-wrong');
          if (oi !== q[2]) opts.children[q[2]].classList.add('is-right');
          why.textContent = (oi === q[2] ? 'Correct. ' : 'Not quite. ') + q[3];
          why.hidden = false;
          answered++; if (oi === q[2]) right++;
          score.textContent = answered === QUIZ.length ? 'You answered ' + right + ' of ' + QUIZ.length + ' correctly.' : '';
        });
        opts.appendChild(b);
      });
      box.appendChild(opts); box.appendChild(why); quiz.appendChild(box);
    });
    quiz.appendChild(score);
  }
})();
