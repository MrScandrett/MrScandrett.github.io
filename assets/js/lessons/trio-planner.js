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
    { id: 'moves', label: 'Moves', test: 'It turns, hinges, rolls or slides, and nothing comes apart after 20 tries. Printed as one piece or with captured parts: no glue.' },
    { id: 'useful', label: 'Useful', test: 'A real person does a real job with it: hold, measure, open, sort, protect. Name the user and the job.' },
    { id: 'likeness', label: 'Likeness', test: 'A classmate names what it looks like from its silhouette in three seconds.' }
  ];
  var IDEAS = [
    'Turtle tape dispenser with a hinged shell (all three)',
    'Articulated dragon bookmark (moves + likeness)',
    'Owl pencil cup with a turning lid (all three)',
    'Print-in-place chain, cable clip, carved bust (one each)'
  ];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private window */ } }

  function mount(host) {
    var state = load() || { objects: [{ name: '', traits: [] }] };
    host.classList.add('tp');
    host.innerHTML = '';
    var list = document.createElement('ol');
    list.className = 'tp-objects';
    var status = document.createElement('div');
    status.className = 'tp-status';
    status.setAttribute('aria-live', 'polite');
    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'tp-add';
    add.textContent = '+ Add another object';
    var ideas = document.createElement('p');
    ideas.className = 'tp-ideas';
    ideas.textContent = 'Ideas: ' + IDEAS.join(' · ');

    function render() {
      list.innerHTML = '';
      state.objects.forEach(function (obj, k) {
        var li = document.createElement('li');
        li.className = 'tp-object';
        var name = document.createElement('input');
        name.type = 'text';
        name.value = obj.name;
        name.placeholder = k === 0 ? 'e.g. Owl pencil cup with a turning lid' : 'Another print';
        name.setAttribute('aria-label', 'Object ' + (k + 1) + ' name');
        name.addEventListener('input', function () { obj.name = name.value; update(); });
        var row = document.createElement('div');
        row.className = 'tp-traits';
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
        li.append(name, row);
        if (state.objects.length > 1) {
          var rm = document.createElement('button');
          rm.type = 'button';
          rm.className = 'tp-remove';
          rm.setAttribute('aria-label', 'Remove object ' + (k + 1));
          rm.textContent = '×';
          rm.addEventListener('click', function () { state.objects.splice(k, 1); render(); });
          li.append(rm);
        }
        list.append(li);
      });
      add.hidden = state.objects.length >= 3;
      update();
    }

    function update() {
      var covered = {};
      state.objects.forEach(function (o, k) { o.traits.forEach(function (t) { (covered[t] = covered[t] || []).push(o.name.trim() || 'object ' + (k + 1)); }); });
      var missing = TRAITS.filter(function (t) { return !covered[t.id]; });
      status.innerHTML = '';
      var head = document.createElement('p');
      head.className = 'tp-verdict ' + (missing.length ? 'is-open' : 'is-done');
      head.textContent = missing.length
        ? 'Still to plan: ' + missing.map(function (t) { return t.label; }).join(', ') + '. Add it to an object you have, or plan another print.'
        : 'All three traits are covered' + (state.objects.length === 1 ? ' in one object. Ambitious!' : ' across ' + state.objects.length + ' objects.');
      var ul = document.createElement('ul');
      ul.className = 'tp-tests';
      TRAITS.forEach(function (t) {
        var li = document.createElement('li');
        li.className = covered[t.id] ? 'is-on' : '';
        var b = document.createElement('strong');
        b.textContent = (covered[t.id] ? '✓ ' : '○ ') + t.label + (covered[t.id] ? ' · ' + covered[t.id].join(', ') : '');
        var span = document.createElement('span');
        span.textContent = 'Proof: ' + t.test;
        li.append(b, span);
        ul.append(li);
      });
      status.append(head, ul);
      save(state);
    }

    add.addEventListener('click', function () { if (state.objects.length < 3) { state.objects.push({ name: '', traits: [] }); render(); } });
    host.append(list, add, status, ideas);
    render();
  }

  function init() { document.querySelectorAll('[data-trio-planner]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
