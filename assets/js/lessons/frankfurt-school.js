(function () {
  'use strict';

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  // Accessible tabs. Panel bodies are static strings written in this file, so
  // innerHTML lets them carry emphasis and glossary marks.
  function makeTabs(tabsEl, panelsEl, items, prefix, render) {
    var tabs = [];
    var panels = [];
    items.forEach(function (item, i) {
      var tab = el('button', 'fs-tab', item.label);
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.id = prefix + '-tab-' + i;
      tab.setAttribute('aria-controls', prefix + '-panel-' + i);
      tabsEl.appendChild(tab);
      var panel = el('div', 'fs-panel');
      panel.setAttribute('role', 'tabpanel');
      panel.id = prefix + '-panel-' + i;
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
      panel.innerHTML = render(item);
      panelsEl.appendChild(panel);
      tabs.push(tab);
      panels.push(panel);
    });
    function select(index, focus) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i, false); });
      tab.addEventListener('keydown', function (e) {
        var n = tabs.length;
        if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % n, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + n) % n, true); }
        if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        if (e.key === 'End') { e.preventDefault(); select(n - 1, true); }
      });
    });
    select(0, false);
  }

  /* ── Traditional vs critical ─────────────────────────────── */
  makeTabs(document.getElementById('fs-tq-tabs'), document.getElementById('fs-tq-panels'), [
    {
      label: 'Why do people listen to so much radio?',
      trad: 'Survey 5,000 households. Record hours listened, favorite stations, and which programs get the most "like" presses. Report the numbers to the networks so they can schedule better.',
      crit: 'Ask where those favorites came from. Who chose what was on the air, and why? Does hearing the same songs everywhere create the very taste the survey then "discovers"? Could radio be used for something better?'
    },
    {
      label: 'Why are most hit movies sequels?',
      trad: 'Compare box-office returns for sequels and original films over 20 years. Sequels earn more on average with less risk, so studios rationally make more of them.',
      crit: 'If audiences only ever get offered sequels, is it surprising they buy sequels? Who gains from a market with less risk? What films are never made because of it, and what does that do to an audience\'s imagination?'
    },
    {
      label: 'Why do teenagers spend hours on their phones?',
      trad: 'Track screen time by age and app. Find which features (streaks, autoplay, notifications) correlate with the longest sessions.',
      crit: 'Those features were designed by companies paid by attention. Is "spending hours" a free choice or an engineered outcome? What would a phone built for the user\'s good, rather than the advertiser\'s, look like?'
    }
  ], 'fs-tq', function (item) {
    return '<div class="fs-two">' +
      '<div class="fs-box trad"><span class="fs-label">Traditional approach</span><p>' + item.trad + '</p></div>' +
      '<div class="fs-box crit"><span class="fs-label">Critical approach</span><p>' + item.crit + '</p></div>' +
      '</div>';
  });

  /* ── Exile journey ───────────────────────────────────────── */
  var stops = [
    { coords: [8.6821, 50.1109], labelDx: 10, labelDy: -11, city: 'Frankfurt', year: '1923–1933', title: 'Café Marx', text: 'Students nicknamed the Institute "Café Marx." Its scholars mixed Karl Marx\'s economics with Sigmund Freud\'s psychology to ask a puzzling question: why didn\'t working people in Germany rise up for their own interests, and why were so many drawn instead toward nationalism and strongmen?' },
    { coords: [6.1432, 46.2044], labelDx: 9, labelDy: 18, city: 'Geneva', year: '1933', title: 'Shut down', text: 'Weeks after Hitler took power, police searched and closed the Institute and seized its library. Horkheimer had already moved the Institute\'s money and set up a small office in Geneva, Switzerland, which let the work continue.' },
    { coords: [-73.9626, 40.8075], labelDx: 10, labelDy: -11, city: 'New York', year: '1934', title: 'A home at Columbia', text: 'Columbia University lent the refugees a building on 117th Street. They kept writing in German, published their journal, and studied American society from the inside. Adorno joined them in 1938 after four years at Oxford.' },
    { coords: [-118.2437, 34.0522], labelDx: 9, labelDy: 18, city: 'Los Angeles', year: '1941–1949', title: 'Next door to Hollywood', text: 'Horkheimer and Adorno moved to Southern California, where many German exiles lived, including the novelist Thomas Mann. Surrounded by movie studios, radio jingles, and billboards, they wrote Dialectic of Enlightenment, including the culture industry chapter.' },
    { coords: [8.6821, 50.1109], labelDx: 10, labelDy: -11, city: 'Frankfurt', year: '1949–1951', title: 'The return', text: 'After the war Horkheimer and Adorno chose to go back and teach a new generation of Germans to think critically about the past. The Institute reopened in a new building in 1951. Marcuse and others stayed in America.' }
  ];
  var stopIndex = 0;
  var routeProjection = EarthEngine.projection('natural-earth', { extent: [[12, 12], [628, 288]] });
  document.getElementById('fs-route-land').setAttribute('d', EarthEngine.path(routeProjection, EarthEngine.data().land));
  document.getElementById('fs-route-borders').setAttribute('d', EarthEngine.path(routeProjection, EarthEngine.data().countries));
  var routePath = document.getElementById('fs-route-path');
  var routePathHalo = document.getElementById('fs-route-path-halo');
  var dotsG = document.getElementById('fs-route-dots');
  var SVGNS = 'http://www.w3.org/2000/svg';
  var dotEls = stops.map(function (s, i) {
    var point = routeProjection(s.coords);
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'fs-route-dot');
    var c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', point[0]); c.setAttribute('cy', point[1]); c.setAttribute('r', 7);
    var t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', point[0] + s.labelDx); t.setAttribute('y', point[1] + s.labelDy);
    t.setAttribute('text-anchor', 'start');
    t.setAttribute('font-family', '"DM Sans", "Inter", sans-serif');
    t.setAttribute('font-size', '12'); t.setAttribute('font-weight', '700');
    t.textContent = i === 4 ? 'Frankfurt (return)' : s.city;
    g.appendChild(c); g.appendChild(t);
    dotsG.appendChild(g);
    return { c: c, t: t };
  });
  function showStop() {
    var s = stops[stopIndex];
    var d = EarthEngine.path(routeProjection, {
      type: 'LineString',
      coordinates: stops.slice(0, stopIndex + 1).map(function (stop) { return stop.coords; })
    }) || '';
    routePath.setAttribute('d', d);
    routePathHalo.setAttribute('d', d);
    dotEls.forEach(function (dot, i) {
      var visited = i <= stopIndex;
      dot.c.setAttribute('fill', i === stopIndex ? '#b3261e' : (visited ? '#1b1b1f' : '#fff'));
      dot.c.setAttribute('stroke', '#1b1b1f');
      dot.c.setAttribute('stroke-width', '2');
      dot.t.setAttribute('fill', visited ? '#1b1b1f' : '#6b6b73');
      // The return stop sits on top of Frankfurt; only show it once reached.
      dot.c.style.display = dot.t.style.display = (i === 4 && stopIndex < 4) ? 'none' : '';
    });
    var card = document.getElementById('fs-stop-card');
    card.innerHTML = '';
    card.appendChild(el('span', 'fs-year', s.year + ' · ' + s.city));
    card.appendChild(el('h3', null, s.title));
    card.appendChild(el('p', null, s.text));
    document.getElementById('fs-stop-count').textContent = 'Stop ' + (stopIndex + 1) + ' of ' + stops.length;
    document.getElementById('fs-stop-prev').disabled = stopIndex === 0;
    document.getElementById('fs-stop-next').disabled = stopIndex === stops.length - 1;
  }
  document.getElementById('fs-stop-prev').addEventListener('click', function () { if (stopIndex > 0) { stopIndex--; showStop(); } });
  document.getElementById('fs-stop-next').addEventListener('click', function () { if (stopIndex < stops.length - 1) { stopIndex++; showStop(); } });
  showStop();

  /* ── Seven ideas ─────────────────────────────────────────── */
  makeTabs(document.getElementById('fs-ci-tabs'), document.getElementById('fs-ci-panels'), [
    {
      label: '1 · An industry',
      title: 'Culture is made like cars',
      body: '<p>Adorno and Horkheimer chose the word <span data-glossary="culture industry">culture industry</span> on purpose. They did not say "popular culture," which sounds like something the people create for themselves. Films, songs, and radio shows in the 1940s were produced by a few giant companies, on assembly lines, by specialists, for profit.</p><p>Industrial products are designed to sell reliably. Reliable selling rewards whatever sold last time.</p>',
      spot: 'Look up how many of last year\'s top ten films were sequels, remakes, or based on existing brands.'
    },
    {
      label: '2 · Standardization',
      title: 'Everything is the same, so nothing surprises',
      body: '<p>Every product follows a formula: the same song structure, the same three acts, the same kind of happy ending. You can guess how a film ends a few minutes in. Different studios and genres are not real alternatives; they are price levels and labels so that every customer has a slot.</p><blockquote class="fs-quote">"Something is provided for all so that none may escape."<cite>Horkheimer &amp; Adorno, Dialectic of Enlightenment (trans. Cumming)</cite></blockquote><p>The authors call this <span data-glossary="cultural standardization">standardization</span>.</p>',
      spot: 'Watch three movie trailers in a row. Count the shared moves: the slow cover song, the deep "BRAAAM," the joke right before the title.'
    },
    {
      label: '3 · Pseudo-individuality',
      title: 'Tiny differences sold as personality',
      body: '<p>Because everything is standardized, the industry adds small marks of uniqueness: a star\'s signature hairstyle, a quirky catchphrase, a "rebel" image. These <em>feel</em> individual but are interchangeable parts. Adorno called this <span data-glossary="pseudo-individuality">pseudo-individuality</span>.</p><p>The audience is invited to express itself by choosing among them, the way you "express yourself" by choosing a phone color.</p>',
      spot: 'Pick two artists marketed as total opposites. Look up who wrote and produced their biggest songs.'
    },
    {
      label: '4 · Fun as work',
      title: 'Amusement is the shift after the shift',
      body: '<blockquote class="fs-quote">"Amusement under late capitalism is the prolongation of work."<cite>Horkheimer &amp; Adorno, Dialectic of Enlightenment (trans. Cumming)</cite></blockquote><p>People want entertainment to escape work. But mass entertainment is built with the same rhythms as the factory or office: short, predictable segments that demand no effort. It rests you just enough to go back on Monday, and it trains you to accept the routine.</p>',
      spot: 'Notice when you reach for your phone. Is it to escape effort, and does it leave you rested or just ready to keep going?'
    },
    {
      label: '5 · Plugging',
      title: 'Repetition makes a hit',
      body: '<p>In an earlier essay, "On the Fetish-Character in Music" (1938), Adorno argued that listeners like a song mainly because they recognize it. Record companies "plugged" songs by paying to have them played over and over until they felt familiar, and familiar felt good.</p><p>He also noticed people valuing a concert because of the expensive ticket, not the music. He called this a kind of <span data-glossary="commodity fetishism">commodity fetishism</span>: treating the price tag as the value.</p>',
      spot: 'Think of a song you disliked at first and now love. How many times did you hear it before you changed your mind, and where?'
    },
    {
      label: '6 · The broken promise',
      title: 'The menu instead of the meal',
      body: '<p>The culture industry constantly promises pleasure: the perfect romance, the perfect body, the perfect life. Then it withholds it, so you keep coming back. Adorno and Horkheimer compared it to a diner who is handed a menu and told to be satisfied with reading it.</p><p>Advertising and entertainment blend until it is hard to tell where the show ends and the ad begins.</p>',
      spot: 'Find a show or video where a product appears inside the story. Was it an ad? How could you tell?'
    },
    {
      label: '7 · Not king, but object',
      title: 'The customer is what is being produced',
      body: '<p>In "Culture Industry Reconsidered" (1963), Adorno answered people who said the industry just gives the public what it wants. The customer, he said, is not the king the industry claims. The customer is its object: something to be measured, predicted, and shaped.</p><p>His deepest worry was political. People trained to accept whatever is handed to them, and to feel free while doing it, are easier to rule. He had seen what mass propaganda did in Germany.</p>',
      spot: 'Read the privacy settings of an app you use. What does it collect about you, and who buys it?'
    }
  ], 'fs-ci', function (item) {
    return '<div class="fs-concept"><div><h3>' + item.title + '</h3>' + item.body + '</div>' +
      '<div class="fs-spot"><strong>Spot it today</strong><p>' + item.spot + '</p></div></div>';
  });

  /* ── Blockbuster machine ─────────────────────────────────── */
  var slots = {
    hero: [
      { v: 'a farm kid who dreams of more', name: 'Kael' },
      { v: 'a burned-out detective with one last case', name: 'Rourke' },
      { v: 'a teen who doesn\'t fit in at school', name: 'Mia' },
      { v: 'a talking toaster', name: 'Toastworth' }
    ],
    world: [
      { v: 'a desert planet', title: 'Dune Rising' },
      { v: 'a rain-soaked city', title: 'Neon Rain' },
      { v: 'a hidden school for magic', title: 'The Hidden Academy' },
      { v: 'an appliance store after closing', title: 'After Hours' }
    ],
    mentor: [
      { v: 'a wise old hermit' },
      { v: 'a gruff former champion' },
      { v: 'a quirky librarian' },
      { v: 'a retired blender' }
    ],
    villain: [
      { v: 'an empire in black armor' },
      { v: 'a corrupt mayor' },
      { v: 'a jealous rival heir' },
      { v: 'a smart fridge that wants to rule' }
    ],
    sidekick: [
      { v: 'a nervous robot' },
      { v: 'a wisecracking partner' },
      { v: 'a loyal best friend' },
      { v: 'a sarcastic spatula' }
    ]
  };
  var taglines = ['This summer, destiny has a name.', 'One hero. One chance. One world.', 'Everything changes now.', 'The legend begins.'];
  var pick = { hero: 0, world: 0, mentor: 0, villain: 0, sidekick: 0 };
  var changes = 0;
  var selects = document.querySelectorAll('#fs-controls select');
  selects.forEach(function (sel) {
    var slot = sel.dataset.slot;
    slots[slot].forEach(function (opt, i) {
      var o = el('option', null, opt.v);
      o.value = i;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      pick[slot] = Number(sel.value);
      changes++;
      renderFilm();
      setNotes('Love it. Very fresh. Same release date as planned.');
    });
  });

  function s(text, slot) { return '<span class="fs-surface" data-x="' + slot + '">' + text + '</span>'; }

  function renderFilm() {
    var h = slots.hero[pick.hero], w = slots.world[pick.world];
    var m = slots.mentor[pick.mentor].v, v = slots.villain[pick.villain].v, k = slots.sidekick[pick.sidekick].v;
    document.getElementById('fs-film-title').textContent = w.title + ': ' + h.name + '’s Destiny';
    document.getElementById('fs-film-tag').textContent = taglines[(pick.hero + pick.villain) % taglines.length];
    var beats = [
      ['Ordinary world', 'Meet ' + s(h.name, 'HERO NAME') + ', ' + s(h.v, 'HERO') + ', stuck in ' + s(w.v, 'WORLD') + ' and longing for something bigger.'],
      ['Call to adventure', 'A mysterious message reveals that ' + s(v, 'VILLAIN') + ' is about to seize power.'],
      ['Meet the mentor', s(h.name, 'HERO NAME') + ' refuses at first, until ' + s(m, 'MENTOR') + ' reveals a hidden gift.'],
      ['New friends', 'Training montage. ' + s(k, 'SIDEKICK') + ' joins and supplies the jokes.'],
      ['All is lost', s(m, 'MENTOR') + ' is captured. ' + s(h.name, 'HERO NAME') + ' doubts everything.'],
      ['Final battle', 'With one speech, the team rallies. ' + s(h.name, 'HERO NAME') + ' defeats ' + s(v, 'VILLAIN') + ' in the last ten minutes.'],
      ['Happy ending + sequel tease', 'Cheers, a hug, a joke from ' + s(k, 'SIDEKICK') + '. After the credits: a shadow stirs…']
    ];
    var ol = document.getElementById('fs-beats');
    ol.innerHTML = beats.map(function (b) {
      return '<li><div><span class="fs-beat-label">' + b[0] + '</span>' + b[1] + '</div></li>';
    }).join('');
    document.getElementById('fs-m-changes').textContent = changes;
  }
  function setNotes(text) {
    var n = document.getElementById('fs-notes');
    n.innerHTML = '<strong>Studio notes:</strong> ';
    n.appendChild(document.createTextNode(text));
  }
  document.getElementById('fs-shuffle').addEventListener('click', function () {
    Object.keys(pick).forEach(function (slot) {
      pick[slot] = Math.floor(Math.random() * slots[slot].length);
      document.querySelector('#fs-controls select[data-slot="' + slot + '"]').value = pick[slot];
    });
    changes += 5;
    renderFilm();
    setNotes('Bold choices! Test audiences will feel right at home.');
  });
  var xray = document.getElementById('fs-xray');
  xray.addEventListener('click', function () {
    var on = xray.getAttribute('aria-pressed') !== 'true';
    xray.setAttribute('aria-pressed', on ? 'true' : 'false');
    document.getElementById('fs-poster').classList.toggle('fs-xray', on);
    setNotes(on
      ? 'X-ray on. Every film you can make has these same seven beats in this same order. Only the blue slots ever change.'
      : 'X-ray off. Back to the poster.');
  });
  var pitches = {
    lose: 'Test screening: 41%. Audiences "felt cheated." Reshoot the ending so the hero wins. Pitch rejected.',
    quiet: 'Where is the conflict? Marketing can\'t cut a trailer without an explosion. Add a villain. Pitch rejected.',
    open: 'No ending means no sequel and no toy line. Legal says the investors will walk. Pitch rejected.'
  };
  document.querySelectorAll('[data-pitch]').forEach(function (btn) {
    btn.addEventListener('click', function () { setNotes(pitches[btn.dataset.pitch]); });
  });
  renderFilm();

  /* ── Name that concept ───────────────────────────────────── */
  var concepts = ['Standardization', 'Pseudo-individuality', 'Amusement as work', 'Plugging', 'The broken promise', 'Consumer as object'];
  var cases = [
    { text: 'Trailers for completely different action films all use the same deep "BRAAAM" sound and the same slowed-down cover song.', ans: 0, why: 'Different products, one template. The formula is so standard you can hear it.' },
    { text: 'A singer is marketed as "the rebel" because of dyed hair and one edgy lyric, yet the songs come from the same writers as everyone else\'s.', ans: 1, why: 'A small, marketable difference is laid over an identical product.' },
    { text: 'You binge a show all Sunday night "to recharge" before Monday. It comes in neat 22-minute units, like periods in a school day.', ans: 2, why: 'Leisure built in work-shaped units that rest you just enough to return to work.' },
    { text: 'A song you couldn\'t stand in June is your favorite by August, after hearing it in every store, ad, and short video.', ans: 3, why: 'Repetition manufactures familiarity, and familiarity feels like liking.' },
    { text: 'A commercial shows a towering, sizzling burger. The one you get is flat. You still want the one in the ad.', ans: 4, why: 'The promise keeps you wanting, which is the point. The menu instead of the meal.' },
    { text: 'An app labels a playlist "Made for You," but it was assembled from your data to keep you listening and to sell ad slots.', ans: 5, why: 'You are being measured and shaped. The "you" in "made for you" is the product being sold to advertisers.' },
    { text: 'The sixth movie in a franchise follows the same three-act beats as the first five, down to the joke before the final battle.', ans: 0, why: 'Standardization over time. Sequels reduce risk by repeating what sold.' },
    { text: 'A phone comes in "Midnight," "Starlight," and "Sierra Blue." The ad says: pick the one that shows who you are.', ans: 1, why: 'Choosing a color is offered as self-expression, though the product inside is identical.' }
  ];
  var qi = 0, qScore = 0, qDone = false;
  var qBtns = document.getElementById('fs-quiz-btns');
  var qButtons = concepts.map(function (name, i) {
    var b = el('button', 'fs-btn', name);
    b.type = 'button';
    b.addEventListener('click', function () { answer(i); });
    qBtns.appendChild(b);
    return b;
  });
  var qNext = document.getElementById('fs-quiz-next');
  function showCase() {
    qDone = false;
    document.getElementById('fs-quiz-case').textContent = cases[qi].text;
    document.getElementById('fs-quiz-feedback').textContent = 'Choose a concept.';
    qButtons.forEach(function (b) { b.classList.remove('right', 'wrong'); b.disabled = false; });
    qNext.hidden = true;
    document.getElementById('fs-quiz-score').textContent = 'Case ' + (qi + 1) + ' of ' + cases.length + ' · Score ' + qScore;
  }
  function answer(i) {
    if (qDone) return;
    qDone = true;
    var c = cases[qi];
    var ok = i === c.ans;
    if (ok) qScore++;
    qButtons[c.ans].classList.add('right');
    if (!ok) qButtons[i].classList.add('wrong');
    qButtons.forEach(function (b) { b.disabled = true; });
    document.getElementById('fs-quiz-feedback').textContent = (ok ? 'Yes. ' : 'Not quite: this is ' + concepts[c.ans] + '. ') + c.why;
    document.getElementById('fs-quiz-score').textContent = 'Case ' + (qi + 1) + ' of ' + cases.length + ' · Score ' + qScore;
    if (qi < cases.length - 1) { qNext.textContent = 'Next case'; }
    else { qNext.textContent = 'Start over'; document.getElementById('fs-quiz-feedback').textContent += ' Final score: ' + qScore + ' of ' + cases.length + '. Now argue with one answer: could a case show two concepts at once?'; }
    qNext.hidden = false;
    qNext.focus();
  }
  qNext.addEventListener('click', function () {
    if (qi < cases.length - 1) qi++;
    else { qi = 0; qScore = 0; }
    showCase();
  });
  showCase();

  /* ── Culture audit ───────────────────────────────────────── */
  var signs = [
    { key: 'formula', short: 'Formula', label: 'Predictable formula', hint: 'I could guess how it goes before it ends.' },
    { key: 'pseudo', short: 'Surface style', label: 'Surface-only uniqueness', hint: 'What makes it "different" is mostly a look, a voice, or a catchphrase.' },
    { key: 'sell', short: 'Built to sell', label: 'Built to sell', hint: 'It exists mainly to sell something: itself, merch, ads, or my data.' },
    { key: 'work', short: 'Rest for work', label: 'Rest-for-work', hint: 'I use it to switch off so I can get back to school or work.' },
    { key: 'repeat', short: 'Repetition', label: 'Liked through repetition', hint: 'I like it partly because I\'ve heard or seen it so often.' },
    { key: 'passive', short: 'Passive', label: 'Asks nothing of me', hint: 'It doesn\'t make me think, question, or respond.' }
  ];
  var values = signs.map(function () { return 5; });
  var pinned = null;
  var nameInput = document.getElementById('fs-audit-name');
  var slidersEl = document.getElementById('fs-sliders');
  signs.forEach(function (sg, i) {
    var wrap = el('div', 'fs-slider');
    var label = el('label');
    label.setAttribute('for', 'fs-s-' + sg.key);
    label.appendChild(el('span', null, sg.label));
    var out = el('output', null, '5');
    out.id = 'fs-o-' + sg.key;
    out.setAttribute('for', 'fs-s-' + sg.key);
    label.appendChild(out);
    var input = el('input', 'fs-range');
    input.type = 'range'; input.min = 0; input.max = 10; input.step = 1; input.value = 5;
    input.id = 'fs-s-' + sg.key;
    input.setAttribute('aria-describedby', 'fs-h-' + sg.key);
    var hint = el('small', null, sg.hint);
    hint.id = 'fs-h-' + sg.key;
    input.addEventListener('input', function () {
      values[i] = Number(input.value);
      out.textContent = input.value;
      drawRadar();
    });
    wrap.appendChild(label); wrap.appendChild(input); wrap.appendChild(hint);
    slidersEl.appendChild(wrap);
  });
  nameInput.addEventListener('input', drawRadar);

  var radar = document.getElementById('fs-radar');
  var CX = 180, CY = 165, R = 115;
  function pt(i, v) {
    var a = -Math.PI / 2 + i * 2 * Math.PI / signs.length;
    return [CX + Math.cos(a) * R * v / 10, CY + Math.sin(a) * R * v / 10];
  }
  function svg(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function poly(vals) { return vals.map(function (v, i) { return pt(i, v).join(','); }).join(' '); }
  function drawRadar() {
    Array.prototype.slice.call(radar.childNodes).forEach(function (n) {
      if (n.nodeName !== 'title' && n.nodeName !== 'desc') radar.removeChild(n);
    });
    [2, 4, 6, 8, 10].forEach(function (ring) {
      radar.appendChild(svg('polygon', { points: poly(signs.map(function () { return ring; })), fill: 'none', stroke: '#c9c4b8', 'stroke-width': ring === 10 ? 1.5 : 1 }));
    });
    signs.forEach(function (sg, i) {
      var e = pt(i, 10), l = pt(i, 12.4);
      radar.appendChild(svg('line', { x1: CX, y1: CY, x2: e[0], y2: e[1], stroke: '#c9c4b8' }));
      radar.appendChild(svg('text', { x: l[0], y: l[1] + 4, 'text-anchor': Math.abs(l[0] - CX) < 5 ? 'middle' : (l[0] > CX ? 'start' : 'end'), 'font-family': '"DM Sans", "Inter", sans-serif', 'font-size': 12, 'font-weight': 700, fill: '#1b1b1f' }, sg.short));
    });
    if (pinned) {
      radar.appendChild(svg('polygon', { points: poly(pinned.values), fill: 'rgba(179,38,30,0.18)', stroke: '#b3261e', 'stroke-width': 2.5 }));
    }
    var color = pinned ? '#1f4e8c' : '#b3261e';
    radar.appendChild(svg('polygon', { points: poly(values), fill: pinned ? 'rgba(31,78,140,0.2)' : 'rgba(179,38,30,0.2)', stroke: color, 'stroke-width': 2.5 }));
    values.forEach(function (v, i) {
      var p = pt(i, v);
      radar.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 4, fill: color }));
    });

    var current = nameInput.value.trim() || 'Your item';
    var legend = document.getElementById('fs-legend');
    legend.innerHTML = '';
    if (pinned) legend.appendChild(el('span', 'a', 'A: ' + pinned.name + ' (' + total(pinned.values) + '/60)'));
    legend.appendChild(el('span', pinned ? 'b' : 'a', (pinned ? 'B: ' : '') + current + ' (' + total(values) + '/60)'));
    renderVerdict(current);
  }
  function total(vals) { return vals.reduce(function (a, b) { return a + b; }, 0); }
  function renderVerdict(name) {
    var t = total(values);
    var top = signs[values.indexOf(Math.max.apply(null, values))];
    var verdict;
    if (t >= 42) verdict = 'Adorno would call "' + name + '" a textbook culture industry product.';
    else if (t >= 24) verdict = 'Adorno would see the factory\'s fingerprints on "' + name + '," but not everywhere.';
    else verdict = 'By Adorno\'s measures, "' + name + '" resists the culture industry. He might even approve.';
    var box = document.getElementById('fs-verdict');
    box.innerHTML = '';
    box.appendChild(el('strong', null, 'Score: ' + t + ' of 60'));
    box.appendChild(el('p', null, verdict + ' Its strongest warning sign: ' + top.label.toLowerCase() + '.'));
    if (pinned) {
      var diff = t - total(pinned.values);
      box.appendChild(el('p', null, diff === 0 ? 'A and B scored the same. Do you value them the same?' :
        '"' + (diff > 0 ? name : pinned.name) + '" scored ' + Math.abs(diff) + ' points higher. Does that match which one you think is better? If not, what is Adorno\'s checklist missing?'));
    }
    box.appendChild(el('p', null, 'Now talk back:'));
    var ul = el('ul');
    ['Hall: did you read it your own way, or even against its intended message?',
     'Benjamin: did it bring something good to people who would never otherwise get it?',
     'Maker test: did it ever make you want to create something yourself?'].forEach(function (q) { ul.appendChild(el('li', null, q)); });
    box.appendChild(ul);
  }
  var pinBtn = document.getElementById('fs-pin');
  var clearBtn = document.getElementById('fs-clear-pin');
  pinBtn.addEventListener('click', function () {
    pinned = { name: nameInput.value.trim() || 'Item A', values: values.slice() };
    nameInput.value = '';
    nameInput.placeholder = 'Now audit something very different';
    clearBtn.hidden = false;
    pinBtn.textContent = 'Replace pin with this one';
    drawRadar();
    nameInput.focus();
  });
  clearBtn.addEventListener('click', function () {
    pinned = null;
    clearBtn.hidden = true;
    pinBtn.textContent = 'Pin as A and audit another';
    drawRadar();
  });
  drawRadar();
})();
