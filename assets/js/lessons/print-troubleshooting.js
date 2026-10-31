/* Read a failed print (lessons/3d-design/cad-and-printing/print-troubleshooting.html)
   - gallery filters
   - Print Doctor: triage flowchart + Rounds quiz (symptom → cause → fix → who)
   - blank diagnosis cards for printing
   All failure facts are read from the gallery cards (figure[data-pt-id]); the page is the
   single source of truth, this script only adds the case stories and the decision tree. */
(function () {
  'use strict';

  var cards = Array.prototype.slice.call(document.querySelectorAll('figure[data-pt-id]'));
  if (!cards.length) return;

  function field(card, name) {
    var el = card.querySelector('[data-pt-field="' + name + '"]');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  var FAIL = {};
  cards.forEach(function (card) {
    var id = card.getAttribute('data-pt-id');
    FAIL[id] = {
      id: id,
      card: card,
      name: field(card, 'name'),
      see: field(card, 'see'),
      cause: field(card, 'cause'),
      fix: field(card, 'fix'),
      whoText: field(card, 'who'),
      who: card.getAttribute('data-pt-who'),
      where: card.getAttribute('data-pt-where'),
      img: card.querySelector('img').getAttribute('src')
    };
  });
  var IDS = Object.keys(FAIL);
  var imgBase = FAIL[IDS[0]].img.replace(/[^/]+$/, '');

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    if (text != null) node.textContent = text;
    return node;
  }
  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function flash(card) {
    card.classList.remove('pt-flash');
    void card.offsetWidth;
    card.classList.add('pt-flash');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { card.classList.remove('pt-flash'); }, 2400);
  }

  /* ---------- Gallery filters ---------- */
  var filterButtons = document.querySelectorAll('[data-pt-filter]');
  var filterStatus = document.querySelector('[data-pt-filter-status]');
  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-pt-filter');
      var shown = 0;
      filterButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      cards.forEach(function (card) {
        var ok = f === 'all';
        if (!ok) {
          var parts = f.split(':');
          ok = card.getAttribute('data-pt-' + parts[0]) === parts[1];
        }
        card.hidden = !ok;
        if (ok) shown++;
      });
      if (filterStatus) filterStatus.textContent = f === 'all' ? '' : 'Showing ' + shown + ' of ' + cards.length + ' failures.';
    });
  });
  // Printing always shows the whole gallery.
  window.addEventListener('beforeprint', function () { cards.forEach(function (c) { c.hidden = false; }); });
  window.addEventListener('afterprint', function () {
    var active = document.querySelector('[data-pt-filter][aria-pressed="true"]');
    if (active) active.click();
  });

  /* ---------- Tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-pt-tab]'));
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next); next.focus(); e.preventDefault();
    });
  });

  /* ---------- Triage flowchart ---------- */
  var TREE = {
    start: { q: 'Where do you first see the problem?', a: [
      ['On the plate, in the first few layers', 'first'],
      ['Partway up: it was fine, then went wrong', 'mid'],
      ['Only on certain features (ledges, gaps, supports)', 'feature'],
      ['All over the surface', 'surface'],
      ['It looks fine, but a moving part won’t move', '=welded-supports']
    ] },
    first: { q: 'What does the bottom look like?', a: [
      ['Lines are loose, round or dragged around', '=first-layer'],
      ['Corners curled up off the plate', '=warping'],
      ['The bottom edge bulges out in a lip', '=elephants-foot']
    ] },
    mid: { q: 'What happened at that height?', a: [
      ['A loose nest of plastic; the part is missing or knocked over', '=spaghetti'],
      ['Everything above one layer slid sideways', '=layer-shift'],
      ['A crack runs along one layer', '=layer-separation'],
      ['The lines got thin or stopped', 'flow']
    ] },
    flow: { q: 'Is plastic coming out of the nozzle now?', a: [
      ['No, or the extruder is clicking', '=clog'],
      ['Yes, but thin and gappy', '=under-extrusion']
    ] },
    feature: { q: 'Which feature?', a: [
      ['Under a ledge, arch or bridge: droopy or curly', '=overhang-sag'],
      ['Hairs between separate parts', '=stringing'],
      ['Rough or pitted where supports touched', '=support-scars']
    ] },
    surface: { q: 'Which describes the surface?', a: [
      ['Lumpy and blobby; holes came out too small', '=over-extrusion'],
      ['Thin, gappy, see-through walls', '=under-extrusion']
    ] }
  };
  var triage = document.querySelector('[data-pt-triage]');
  var staticTree = document.querySelector('[data-pt-tree-static]');
  if (triage) {
    if (staticTree) staticTree.classList.add('pt-print-only');
    var path = [];
    var renderTriage = function (nodeKey) {
      triage.textContent = '';
      var crumbs = el('p', { class: 'pt-crumbs' });
      crumbs.textContent = path.length ? path.map(function (p) { return p; }).join(' → ') : 'Hold the failed print in your hand. Start here.';
      triage.appendChild(crumbs);
      if (nodeKey.charAt(0) === '=') {
        var f = FAIL[nodeKey.slice(1)];
        var box = el('div', { class: 'pt-result' });
        box.appendChild(el('p', { class: 'pt-result-label' }, 'Most likely diagnosis'));
        box.appendChild(el('h3', null, f.name));
        [['Most likely cause', f.cause], ['Try first', f.fix], ['Who', f.whoText]].forEach(function (row) {
          var p = el('p');
          p.appendChild(el('b', null, row[0] + ': '));
          p.appendChild(document.createTextNode(row[1]));
          box.appendChild(p);
        });
        if (f.id === 'welded-supports') box.appendChild(el('p', { class: 'pt-muted' }, 'No supports in the gap? Then the clearance may be too small for your printer: print a clearance test (Design a moving fit).'));
        var row = el('div', { class: 'pt-btn-row' });
        var show = el('button', { type: 'button' }, 'Show the gallery card');
        show.addEventListener('click', function () { f.card.hidden = false; flash(f.card); });
        var again = el('button', { type: 'button' }, 'Start again');
        again.addEventListener('click', function () { path = []; renderTriage('start'); again.blur(); triage.querySelector('button').focus(); });
        row.appendChild(show); row.appendChild(again);
        box.appendChild(row);
        triage.appendChild(box);
        return;
      }
      var node = TREE[nodeKey];
      triage.appendChild(el('h3', { class: 'pt-q' }, node.q));
      var list = el('div', { class: 'pt-answers' });
      node.a.forEach(function (ans) {
        var b = el('button', { type: 'button' }, ans[0]);
        b.addEventListener('click', function () {
          path.push(ans[0]);
          renderTriage(ans[1]);
          var first = triage.querySelector('.pt-answers button, .pt-result button');
          if (first) first.focus();
        });
        list.appendChild(b);
      });
      triage.appendChild(list);
      if (path.length) {
        var back = el('button', { type: 'button', class: 'pt-back' }, '← Start again');
        back.addEventListener('click', function () { path = []; renderTriage('start'); });
        triage.appendChild(back);
      }
    };
    renderTriage('start');
  }

  /* ---------- Rounds quiz ---------- */
  var CASES = [
    { id: 'first-layer', story: 'Maya starts a keychain. Two minutes in, the nozzle is pushing round, loose strands around the plate. None of them lie flat.' },
    { id: 'warping', story: 'A 140 mm long name sign printed all the way, but when Leo takes it off, it rocks on the table: both ends lifted during printing.' },
    { id: 'spaghetti', story: 'A tall, thin robot figure on a small base. The class comes back from lunch to a bird’s nest of filament; the figure is lying on its side.',
      photo: { src: 'photo-spaghetti-nest.webp', alt: 'A tangle of loose grey filament loops on a build plate.', credit: 'Photo: A7N8X, CC0, Wikimedia Commons' } },
    { id: 'stringing', story: 'A dragon with tall spikes. Every gap between the spikes is crossed by fine cobwebs of plastic.',
      photo: { src: 'photo-stringing-dragon.webp', alt: 'A blue printed dragon with fine strands of plastic stretched between its spikes.', credit: 'Photo: SuperBlobMonster, CC BY-SA 3.0, Wikimedia Commons' } },
    { id: 'elephants-foot', story: 'Ava’s peg should slide into a 10 mm hole. The top slides in, but the bottom millimetre has a lip and jams.' },
    { id: 'layer-shift', story: 'A pencil cup looks perfect up to 18 mm high. Above that, the rest of the cup is printed 4 mm to the right. Someone leaned on the table.',
      photo: { src: 'photo-layer-shift.webp', alt: 'Black printed domes whose layers are stepped sideways.', credit: 'Photo: A7N8X, CC BY-SA 4.0, Wikimedia Commons' } },
    { id: 'under-extrusion', story: 'The walls of a phone stand are thin and lacy, the top has holes, and it crushes when you squeeze it. The spool was tangled.' },
    { id: 'over-extrusion', story: 'A bracket comes out lumpy, with blobs all over, and its screw holes are too small for the screws. The slicer was set to a different material from the spool.' },
    { id: 'overhang-sag', story: 'A model house’s doorway has a flat ceiling 30 mm wide. The ceiling printed droopy and curly, hanging down into the door.' },
    { id: 'support-scars', story: 'A dog’s head likeness was printed face-down on supports. After the supports come off, the face is rough and pitted.' },
    { id: 'welded-supports', story: 'A print-in-place hinge was sliced with supports set to “everywhere.” After printing, the hinge won’t move at all.' },
    { id: 'layer-separation', story: 'A tall, thin marble-run tower cracks straight across one layer when someone presses on its side. The printer door was open beside an air vent.' },
    { id: 'clog', story: 'Halfway through a print, the lines get thinner, then the nozzle keeps moving but nothing comes out. The extruder is clicking.' }
  ].filter(function (c) { return FAIL[c.id]; });

  var WHO = {
    design: 'You: a design, orientation or slicer change',
    machine: 'Teacher: a machine fix',
    both: 'Both: you change the design first; the teacher checks the machine'
  };
  var STEPS = [
    { key: 'name', q: 'Step 1 · Symptom. What is this failure called?', n: 4 },
    { key: 'cause', q: 'Step 2 · Cause. What most likely caused it?', n: 3 },
    { key: 'fix', q: 'Step 3 · Fix. Which fix should you try first?', n: 3 },
    { key: 'who', q: 'Step 4 · Who makes that fix?', n: 3 }
  ];

  var rounds = document.querySelector('[data-pt-rounds]');
  var svgCache = {};
  // The quiz shows each drawing without its labels, so the student reads the picture.
  function unlabeledDrawing(src, holder, alt) {
    var url = imgBase + src;
    function put(markup) {
      holder.textContent = '';
      if (!markup) {
        var img = el('img', { src: url, alt: alt, width: 480, height: 300 });
        holder.appendChild(img);
        return;
      }
      holder.innerHTML = markup;
      var svg = holder.querySelector('svg');
      if (svg) {
        svg.removeAttribute('width'); svg.removeAttribute('height');
        svg.setAttribute('aria-label', alt);
      }
    }
    if (svgCache[src] !== undefined) { put(svgCache[src]); return; }
    if (!window.fetch || !window.DOMParser) { put(null); return; }
    fetch(url).then(function (r) { return r.ok ? r.text() : null; }).then(function (text) {
      if (!text) { svgCache[src] = null; return put(null); }
      var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      var svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== 'svg') { svgCache[src] = null; return put(null); }
      var texts = svg.querySelectorAll('text');
      for (var i = 0; i < texts.length; i++) {
        if (!/teaching diagram/.test(texts[i].textContent)) texts[i].parentNode.removeChild(texts[i]);
      }
      // ids are unique per page as long as only one inline drawing is shown at a time
      var out = new XMLSerializer().serializeToString(svg);
      svgCache[src] = out;
      put(out);
    }).catch(function () { svgCache[src] = null; put(null); });
  }

  if (rounds && CASES.length) {
    var order = shuffle(CASES), idx = 0, firstTry = 0, totalSteps = 0, step = 0, missed = false;
    var stage, score;

    var options = function (c, key, n) {
      var f = FAIL[c.id];
      if (key === 'who') return ['design', 'machine', 'both'].map(function (w) { return { value: w, label: WHO[w], ok: w === f.who }; });
      var others = shuffle(IDS.filter(function (id) {
        return id !== c.id && FAIL[id][key] !== f[key];
      })).slice(0, n - 1);
      return shuffle([c.id].concat(others)).map(function (id) {
        return { value: id, label: FAIL[id][key], ok: id === c.id };
      });
    };

    var feedbackFor = function (c, key, chosen) {
      var f = FAIL[c.id];
      if (key === 'who') {
        return 'Not quite. Look at the fix you chose: ' + (f.who === 'design' ? 'it changes the model or the slicer, which is your job.' : f.who === 'machine' ? 'it is inside or on the machine, which is the teacher’s job.' : 'part of it is your design and part is the machine.') + ' Try again.';
      }
      var o = FAIL[chosen];
      if (key === 'name') return 'Not quite. ' + o.name + ' looks like this: ' + o.see + ' Does that match? Look again.';
      if (key === 'cause') return 'That is what causes ' + o.name.toLowerCase() + ', which looks different: ' + o.see + ' Try again.';
      return 'That is the fix for ' + o.name.toLowerCase() + '. Does it fix this cause? Try again.';
    };

    var renderStep = function (c) {
      var s = STEPS[step];
      var box = stage.querySelector('.pt-quiz-step');
      box.textContent = '';
      box.appendChild(el('h3', { class: 'pt-q' }, s.q));
      var list = el('div', { class: 'pt-answers', role: 'group', 'aria-label': s.q });
      var fb = el('p', { class: 'pt-feedback', role: 'status', 'aria-live': 'polite' });
      missed = false;
      options(c, s.key, s.n).forEach(function (opt) {
        var b = el('button', { type: 'button' }, opt.label);
        b.addEventListener('click', function () {
          if (opt.ok) {
            totalSteps++;
            if (!missed) firstTry++;
            b.classList.add('is-right');
            list.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
            var f = FAIL[c.id];
            var note = s.key === 'name' ? 'Yes: ' + f.name + '. ' + f.see
              : s.key === 'cause' ? 'Right. ' + f.cause
              : s.key === 'fix' ? 'Good first fix. Change only that, then reprint a small test.'
              : 'Right. ' + f.whoText;
            fb.textContent = note;
            fb.className = 'pt-feedback ok';
            updateScore();
            var next = el('button', { type: 'button', class: 'pt-next' }, step < STEPS.length - 1 ? 'Next step →' : (idx < order.length - 1 ? 'Next patient →' : 'See the results'));
            next.addEventListener('click', function () {
              if (step < STEPS.length - 1) { step++; renderStep(c); stage.querySelector('.pt-answers button').focus(); }
              else { idx++; idx < order.length ? renderCase() : renderDone(); }
            });
            box.appendChild(next);
            next.focus();
          } else {
            missed = true;
            b.classList.add('is-wrong');
            b.disabled = true;
            fb.textContent = feedbackFor(c, s.key, opt.value);
            fb.className = 'pt-feedback err';
          }
        });
        list.appendChild(b);
      });
      box.appendChild(list);
      box.appendChild(fb);
    };

    var updateScore = function () {
      score.textContent = 'Patient ' + (idx + 1) + ' of ' + order.length + ' · ' + firstTry + ' of ' + totalSteps + ' steps right first try';
    };

    var renderCase = function () {
      var c = order[idx];
      step = 0;
      stage.textContent = '';
      var grid = el('div', { class: 'pt-quiz-grid' });
      var pic = el('div', { class: 'pt-quiz-pic' });
      var holder = el('div', { class: 'pt-quiz-img' });
      pic.appendChild(holder);
      if (c.photo) {
        var img = el('img', { src: imgBase + c.photo.src, alt: c.photo.alt });
        holder.appendChild(img);
        pic.appendChild(el('p', { class: 'pt-quiz-credit', 'data-no-glossary': '' }, c.photo.credit));
      } else {
        unlabeledDrawing(FAIL[c.id].img.split('/').pop(), holder, 'Drawing of the failed print, without labels. ' + FAIL[c.id].card.querySelector('img').alt);
        pic.appendChild(el('p', { class: 'pt-quiz-credit' }, 'Original ClassroomOS teaching diagram, labels hidden'));
      }
      var right = el('div');
      right.appendChild(el('p', { class: 'pt-story-label' }, 'The patient'));
      right.appendChild(el('p', { class: 'pt-story' }, c.story));
      right.appendChild(el('div', { class: 'pt-quiz-step' }));
      grid.appendChild(pic); grid.appendChild(right);
      stage.appendChild(grid);
      updateScore();
      renderStep(c);
    };

    var renderDone = function () {
      stage.textContent = '';
      var box = el('div', { class: 'pt-result' });
      box.appendChild(el('p', { class: 'pt-result-label' }, 'Rounds complete'));
      box.appendChild(el('h3', null, firstTry + ' of ' + totalSteps + ' steps right on the first try'));
      box.appendChild(el('p', null, firstTry >= totalSteps * 0.8
        ? 'Ready for the real shelf. Pick a print from the Print Hospital and fill in a diagnosis card.'
        : 'Go back through the gallery, then do another round. Watch for the step you missed most: symptom, cause, fix or who.'));
      var again = el('button', { type: 'button' }, 'New round');
      again.addEventListener('click', function () { order = shuffle(CASES); idx = 0; firstTry = 0; totalSteps = 0; renderCase(); });
      box.appendChild(again);
      stage.appendChild(box);
      score.textContent = '';
      again.focus();
    };

    rounds.textContent = '';
    score = el('p', { class: 'pt-score', 'aria-live': 'polite' });
    stage = el('div', { class: 'pt-stage' });
    rounds.appendChild(score);
    rounds.appendChild(stage);
    renderCase();
  }

  /* ---------- Blank diagnosis cards ---------- */
  var printBtn = document.querySelector('[data-pt-print-cards]');
  var sheet = document.querySelector('[data-pt-print-sheet]');
  var card = document.getElementById('pt-dx-card');
  if (printBtn && sheet && card) {
    printBtn.addEventListener('click', function () {
      sheet.textContent = '';
      for (var i = 0; i < 2; i++) {
        var copy = card.cloneNode(true);
        copy.removeAttribute('id');
        copy.querySelectorAll('input, textarea').forEach(function (inp) {
          if (inp.type === 'checkbox') inp.checked = false; else inp.value = '';
          inp.removeAttribute('name');
          inp.tabIndex = -1;
        });
        sheet.appendChild(copy);
      }
      document.documentElement.classList.add('pt-printing-cards');
      var done = function () {
        document.documentElement.classList.remove('pt-printing-cards');
        sheet.textContent = '';
        window.removeEventListener('afterprint', done);
      };
      window.addEventListener('afterprint', done);
      window.print();
    });
  }
})();
