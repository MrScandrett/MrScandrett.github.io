/* Trio Challenge planner: the quarter's three traits (moves in one piece, useful,
   likeness) spread over one, two or three objects. Mounts on [data-trio-planner]; used by
   lessons/3d-design/3d-design.html#grand-challenge and the sculpture lesson. The plan is
   ordinary form fields, so visitor-memory's "Save answers" keeps it with the lesson, and
   it also remembers itself in this browser. */
(function () {
  'use strict';
  var KEY = 'classroomos:trio-plan:v1';
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('../../css/components/trio-planner.css', document.currentScript.src).href;
  document.head.append(css);

  var TRAITS = [
    { id: 'moves', label: 'Moves', test: 'It turns, hinges, rolls or slides 20 times without coming apart. The parts stay together without glue or added fasteners.' },
    { id: 'useful', label: 'Useful', test: 'A real person does a real job with it: hold, measure, open, sort, protect. Name the user and the job.' },
    { id: 'likeness', label: 'Likeness', test: 'Show the outline without saying its name. Record what a classmate recognizes; aim for three seconds. Agree on an accessible alternative with your teacher if needed.' }
  ];
  var IDEAS = [
    'Turtle tape dispenser with a hinged shell (all three)',
    'Articulated dragon bookmark (moves + likeness)',
    'Owl pencil cup with a turning lid (all three)',
    'Print-in-place chain, cable clip, carved bust (one each)'
  ];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }
  var instance = 0;

  function mount(host) {
    var stored = load();
    var objects = stored && Array.isArray(stored.objects) ? stored.objects : [];
    var state = { objects: objects.filter(function (o) { return o && typeof o.name === 'string' && Array.isArray(o.traits); }).slice(0, 3).map(function (o) {
      return { name: o.name, traits: o.traits.filter(function (id) { return TRAITS.some(function (t) { return t.id === id; }); }) };
    }) };
    if (!state.objects.length) state.objects.push({ name: '', traits: [] });
    var prefix = 'trio-' + (++instance) + '-';
    host.classList.add('tp');
    host.innerHTML = '';
    var list = document.createElement('ol');
    list.className = 'tp-objects';
    var status = document.createElement('div');
    status.className = 'tp-status';
    var verdict = document.createElement('p');
    verdict.setAttribute('role', 'status');
    var tests = document.createElement('ul');
    tests.className = 'tp-tests';
    status.append(verdict, tests);
    var storageNote = document.createElement('p');
    storageNote.className = 'tp-storage';
    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'tp-add';
    add.textContent = '+ Add another object';
    var ideas = document.createElement('p');
    ideas.className = 'tp-ideas';
    ideas.textContent = 'Ideas: ' + IDEAS.join(' · ');

    function render(focusIndex) {
      list.innerHTML = '';
      state.objects.forEach(function (obj, k) {
        var li = document.createElement('li');
        li.className = 'tp-object';
        var name = document.createElement('input');
        name.type = 'text';
        name.id = prefix + 'name-' + k;
        name.value = obj.name;
        name.placeholder = k === 0 ? 'e.g. Owl pencil cup with a turning lid' : 'Another print';
        var nameLabel = document.createElement('label');
        nameLabel.htmlFor = name.id;
        nameLabel.textContent = 'Object ' + (k + 1) + ' name';
        name.addEventListener('input', function () { obj.name = name.value; update(); });
        var row = document.createElement('fieldset');
        row.className = 'tp-traits';
        var legend = document.createElement('legend');
        legend.textContent = 'Traits planned for object ' + (k + 1);
        row.append(legend);
        TRAITS.forEach(function (t) {
          var lab = document.createElement('label');
          lab.className = 'tp-chip tp-' + t.id;
          var box = document.createElement('input');
          box.type = 'checkbox';
          box.checked = obj.traits.indexOf(t.id) >= 0;
          box.addEventListener('change', function () {
            obj.traits = TRAITS.map(function (x) { return x.id; }).filter(function (id) { return id === t.id ? box.checked : obj.traits.indexOf(id) >= 0; });
            update();
          });
          lab.append(box, document.createTextNode(' ' + t.label));
          row.append(lab);
        });
        li.append(nameLabel, name, row);
        if (state.objects.length > 1) {
          var rm = document.createElement('button');
          rm.type = 'button';
          rm.className = 'tp-remove';
          rm.setAttribute('aria-label', 'Remove object ' + (k + 1));
          rm.textContent = 'Remove';
          rm.addEventListener('click', function () { state.objects.splice(k, 1); render(Math.min(k, state.objects.length - 1)); });
          li.append(rm);
        }
        list.append(li);
      });
      add.hidden = state.objects.length >= 3;
      update();
      if (typeof focusIndex === 'number') list.querySelectorAll('input[type="text"]')[focusIndex].focus();
    }

    function update() {
      var covered = {};
      state.objects.forEach(function (o) { if (o.name.trim()) o.traits.forEach(function (t) { (covered[t] = covered[t] || []).push(o.name.trim()); }); });
      var missing = TRAITS.filter(function (t) { return !covered[t.id]; });
      verdict.className = 'tp-verdict ' + (missing.length ? 'is-open' : 'is-done');
      var message = missing.length
        ? 'Still to plan: ' + missing.map(function (t) { return t.label; }).join(', ') + '. Name each object and check the traits it will show.'
        : 'Your plan includes all three traits. Next: build and collect the test evidence below.';
      if (verdict.textContent !== message) verdict.textContent = message;
      tests.replaceChildren();
      TRAITS.forEach(function (t) {
        var li = document.createElement('li');
        li.className = covered[t.id] ? 'is-on' : '';
        var b = document.createElement('strong');
        b.textContent = (covered[t.id] ? '✓ ' : '○ ') + t.label + (covered[t.id] ? ' · ' + covered[t.id].join(', ') : '');
        var span = document.createElement('span');
        span.textContent = 'Proof: ' + t.test;
        li.append(b, span);
        tests.append(li);
      });
      storageNote.textContent = save(state) ? 'Plan saved in this browser. Keep a copy with your project; this does not submit it to your teacher.' : 'Browser storage is unavailable. Copy or photograph your plan before leaving this page.';
    }

    add.addEventListener('click', function () { if (state.objects.length < 3) { state.objects.push({ name: '', traits: [] }); render(state.objects.length - 1); } });
    host.append(list, add, status, storageNote, ideas);
    render();
  }

  function init() { document.querySelectorAll('[data-trio-planner]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
