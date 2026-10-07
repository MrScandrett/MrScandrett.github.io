/* tool-rosetta.js — one idea, shown in every tool.
 *
 * Lessons teach the idea in neutral words, then this table shows what each
 * engine or 3D app calls it. Students pick which tools to show; the choice is
 * remembered across the whole site, so a student who uses Unity sees Unity
 * everywhere. Data lives in data/tool-rosetta.json.
 *
 * Usage:
 *   <div data-rosetta="loop.fixed loop.frame loop.order"></div>    specific rows
 *   <div data-rosetta-family="game" data-rosetta-topic="Cameras"></div>   one topic
 *   <div data-rosetta-family="model" data-rosetta-full></div>      every row, grouped, with search
 *   <div data-rosetta-tools="game"></div>                          the tool list: language, cost, site
 *   <script src="…/assets/js/tool-rosetta.js"></script>
 * Optional: data-rosetta-title="…" replaces the heading; data-rosetta-nolink hides
 * the link to the full reference page.
 */
(function (global) {
  'use strict';
  if (global.ToolRosetta) return;

  var script = document.currentScript;
  var ROOT = new URL('../../', script && script.src ? script.src : global.location.href);
  var STORE_KEY = 'classroomos:rosetta:v1';
  var REFERENCE = 'lessons/computer-science/graphics-and-games/tool-rosetta.html';
  var dataPromise = null;
  var hosts = [];

  function url(path) { return new URL(path, ROOT).href; }

  function load() {
    if (!dataPromise) {
      dataPromise = fetch(url('data/tool-rosetta.json')).then(function (r) {
        if (!r.ok) throw new Error('tool-rosetta.json ' + r.status);
        return r.json();
      });
    }
    return dataPromise;
  }

  function readStore() {
    try { return JSON.parse(global.localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { global.localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) { /* private mode: selection lasts for this page only */ }
  }
  var memory = readStore();

  function selected(data, family) {
    var fam = data.families[family];
    var saved = (memory[family] || []).filter(function (id) { return fam.tools.indexOf(id) !== -1; });
    return saved.length ? saved : fam.defaults.slice();
  }
  function setSelected(data, family, ids) {
    var order = data.families[family].tools;
    memory[family] = order.filter(function (id) { return ids.indexOf(id) !== -1; });
    writeStore(memory);
    rerenderAll(data);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  // `code` spans become <code>; everything else stays text.
  function richText(node, str) {
    String(str).split('`').forEach(function (part, i) {
      if (!part) return;
      node.appendChild(i % 2 ? el('code', null, part) : document.createTextNode(part));
    });
    return node;
  }

  function addStyles() {
    if (document.querySelector('link[data-rosetta-style]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url('assets/css/components/tool-rosetta.css');
    link.dataset.rosettaStyle = 'true';
    document.head.appendChild(link);
  }

  function conceptsFor(host, data) {
    var byId = {};
    data.concepts.forEach(function (c) { byId[c.id] = c; });
    var ids = (host.getAttribute('data-rosetta') || '').split(/[\s,]+/).filter(Boolean);
    if (ids.length) {
      return ids.map(function (id) {
        if (!byId[id]) console.warn('[tool-rosetta] unknown concept "' + id + '"');
        return byId[id];
      }).filter(Boolean);
    }
    var family = host.getAttribute('data-rosetta-family') || 'game';
    var topic = host.getAttribute('data-rosetta-topic');
    return data.concepts.filter(function (c) {
      return c.family === family && (!topic || c.topic === topic);
    });
  }

  function chips(data, family) {
    var fam = data.families[family];
    var on = selected(data, family);
    var wrap = el('div', 'rosetta-chips');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Choose which ' + fam.noun + 's to compare');
    fam.tools.forEach(function (id) {
      var b = el('button', 'rosetta-chip', data.tools[id].name);
      b.type = 'button';
      b.dataset.tool = id;
      b.setAttribute('aria-pressed', on.indexOf(id) !== -1 ? 'true' : 'false');
      b.addEventListener('click', function () {
        var now = selected(data, family);
        var i = now.indexOf(id);
        if (i === -1) now.push(id);
        else if (now.length > 1) now.splice(i, 1);
        var host = wrap.closest('.rosetta');
        setSelected(data, family, now);
        focusChip(host, '.rosetta-chip[data-tool="' + id + '"]');
      });
      wrap.appendChild(b);
    });
    var all = el('button', 'rosetta-chip rosetta-chip-all', on.length === fam.tools.length ? 'Fewer' : 'Show all');
    all.type = 'button';
    all.addEventListener('click', function () {
      var host = wrap.closest('.rosetta');
      setSelected(data, family, on.length === fam.tools.length ? fam.defaults.slice() : fam.tools.slice());
      focusChip(host, '.rosetta-chip-all');
    });
    wrap.appendChild(all);
    return wrap;
  }

  // Re-rendering replaces the buttons, so put focus back on the one that was pressed.
  function focusChip(host, selector) {
    var b = host && host.querySelector(selector);
    if (b) b.focus();
  }

  function table(data, family, list, anchors) {
    var tools = selected(data, family);
    var wrap = el('div', 'rosetta-table-wrap');
    var t = el('table', 'rosetta-table');
    var thead = el('thead');
    var hr = el('tr');
    var corner = el('th', null, 'Idea');
    corner.scope = 'col';
    hr.appendChild(corner);
    tools.forEach(function (id) {
      var th = el('th', null, data.tools[id].name);
      th.scope = 'col';
      if (id === 'course' || id === 'gltf') th.className = 'rosetta-home';
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    t.appendChild(thead);
    var tb = el('tbody');
    list.forEach(function (c) {
      var tr = el('tr');
      if (anchors) tr.id = 'rosetta-' + c.id;
      var th = el('th');
      th.scope = 'row';
      th.appendChild(el('span', 'rosetta-idea', c.idea));
      if (c.what) th.appendChild(el('span', 'rosetta-what', c.what));
      tr.appendChild(th);
      tools.forEach(function (id) {
        var td = el('td');
        td.setAttribute('data-label', data.tools[id].name);
        if (id === 'course' || id === 'gltf') td.className = 'rosetta-home';
        var v = c.cells[id];
        if (v == null) { td.appendChild(el('span', 'rosetta-none', '—')); td.title = 'No entry yet'; }
        else richText(td, v);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
  }

  function gotchas(list) {
    var notes = list.filter(function (c) { return c.gotcha; });
    if (!notes.length) return null;
    var ul = el('ul', 'rosetta-gotchas');
    notes.forEach(function (c) {
      var li = el('li');
      li.appendChild(el('b', null, c.idea + ': '));
      richText(li, c.gotcha);
      ul.appendChild(li);
    });
    return ul;
  }

  function render(host, data) {
    var list = conceptsFor(host, data);
    if (!list.length) { host.hidden = true; return; }
    var family = list[0].family;
    var full = host.hasAttribute('data-rosetta-full');
    var fam = data.families[family];
    host.classList.add('rosetta');
    host.dataset.rosettaRendered = family;
    host.textContent = '';

    var head = el('div', 'rosetta-head');
    var titleText = host.getAttribute('data-rosetta-title') || (full ? fam.label : 'Same idea, any ' + fam.noun);
    head.appendChild(el(full ? 'h3' : 'p', 'rosetta-title', titleText));
    head.appendChild(chips(data, family));
    host.appendChild(head);

    if (full) {
      var search = el('input', 'rosetta-search');
      search.type = 'search';
      search.placeholder = 'Find an idea or a tool word (e.g. prefab, extrude, delta)';
      search.setAttribute('aria-label', 'Search ' + fam.label);
      search.value = host._rosettaQuery || '';
      head.appendChild(search);
      var body = el('div', 'rosetta-body');
      host.appendChild(body);
      var paint = function () {
        var q = search.value.trim().toLowerCase();
        host._rosettaQuery = search.value;
        body.textContent = '';
        var hits = list.filter(function (c) {
          if (!q) return true;
          var hay = [c.idea, c.what, c.topic, c.gotcha].concat(Object.keys(c.cells).map(function (k) { return c.cells[k]; }));
          return hay.join(' ').toLowerCase().indexOf(q) !== -1;
        });
        var topics = [];
        hits.forEach(function (c) { if (topics.indexOf(c.topic) === -1) topics.push(c.topic); });
        topics.forEach(function (topic) {
          var group = hits.filter(function (c) { return c.topic === topic; });
          body.appendChild(el('h4', 'rosetta-topic', topic));
          body.appendChild(table(data, family, group, true));
          var g = gotchas(group);
          if (g) body.appendChild(g);
        });
        if (!hits.length) body.appendChild(el('p', 'rosetta-empty', 'Nothing matches “' + search.value + '”.'));
      };
      search.addEventListener('input', paint);
      paint();
    } else {
      host.appendChild(table(data, family, list, false));
      var g = gotchas(list);
      if (g) host.appendChild(g);
      if (!host.hasAttribute('data-rosetta-nolink')) {
        var a = el('a', 'rosetta-more', 'Every idea in every ' + fam.noun + ' →');
        a.href = url(REFERENCE) + '#' + (family === 'model' ? 'modeling' : 'engines');
        host.appendChild(a);
      }
    }
  }

  function renderTools(host, data) {
    var fam = data.families[host.getAttribute('data-rosetta-tools')];
    if (!fam) { host.hidden = true; return; }
    host.classList.add('rosetta-tools');
    host.textContent = '';
    fam.tools.forEach(function (id) {
      var t = data.tools[id];
      var card = el('article', 'rosetta-tool');
      card.appendChild(el('h4', null, t.name));
      card.appendChild(el('p', 'rosetta-tool-kind', t.kind));
      var dl = el('dl');
      [['Language', t.lang], ['Cost', t.cost]].forEach(function (pair) {
        dl.appendChild(el('dt', null, pair[0]));
        dl.appendChild(el('dd', null, pair[1]));
      });
      card.appendChild(dl);
      if (t.site) {
        var a = el('a', null, 'Official site ↗');
        a.href = t.site; a.target = '_blank'; a.rel = 'noopener';
        a.setAttribute('aria-label', t.name + ' official site (opens in a new tab)');
        card.appendChild(a);
      }
      host.appendChild(card);
    });
  }

  function rerenderAll(data) {
    hosts.forEach(function (h) { render(h, data); });
  }

  function init() {
    var found = document.querySelectorAll('[data-rosetta], [data-rosetta-family]');
    var toolLists = document.querySelectorAll('[data-rosetta-tools]');
    if (!found.length && !toolLists.length) return;
    addStyles();
    hosts = Array.prototype.slice.call(found);
    load().then(function (data) {
      rerenderAll(data);
      Array.prototype.forEach.call(toolLists, function (h) { renderTools(h, data); });
      // Rows only exist after render, so the browser's own jump to #rosetta-… missed them.
      // Jump instantly: a smooth scroll gets cancelled while the page is still settling on load.
      var target = global.location.hash && document.getElementById(decodeURIComponent(global.location.hash.slice(1)));
      if (target && target.closest('.rosetta')) {
        global.setTimeout(function () { target.scrollIntoView({ block: 'center', behavior: 'instant' }); }, 250);
      }
      global.addEventListener('storage', function (e) {
        if (e.key !== STORE_KEY) return;
        memory = readStore();
        rerenderAll(data);
      });
    }).catch(function (err) {
      console.warn('[tool-rosetta]', err);
      hosts.forEach(function (h) {
        h.textContent = 'The tool comparison table could not load.';
      });
    });
  }

  global.ToolRosetta = { load: load, init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
