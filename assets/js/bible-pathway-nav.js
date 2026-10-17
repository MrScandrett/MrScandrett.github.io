(function () {
  'use strict';
  var data = window.BiblePathway;
  if (!data || document.documentElement.dataset.biblePathwayNav === 'ready') return;
  document.documentElement.dataset.biblePathwayNav = 'ready';

  var here = location.pathname.split('/').pop() || '';
  var current = data.lessons.find(function (lesson) { return lesson.href === here; });

  function lesson(id) { return data.lessons.find(function (item) { return item.id === id; }); }
  function label(kind) {
    return { core: 'Core route', extension: 'Optional extension', 'book-study': 'Book study', capstone: 'Whole-Bible capstone' }[kind] || kind;
  }
  function link(item, className, prefix) {
    if (!item) return null;
    var a = document.createElement('a');
    a.href = item.href;
    a.className = className || '';
    if (prefix) {
      var small = document.createElement('small'); small.textContent = prefix; a.appendChild(small);
    }
    var strong = document.createElement('strong'); strong.textContent = item.title; a.appendChild(strong);
    return a;
  }

  function routeEdge(route, direction) {
    var routeId = direction === 'previous' ? route.previousRoute : route.nextRoute;
    var adjacent = data.routes[routeId];
    if (!adjacent) return null;
    var id = direction === 'previous' ? adjacent.items[adjacent.items.length - 1] : adjacent.items[0];
    return lesson(id);
  }

  function buildLessonNav() {
    if (!current) return;
    var main = document.querySelector('main') || document.querySelector('.cl-page');
    if (!main) return;
    var old = main.querySelector('.bpl-nav');
    if (old) old.remove();

    var route = data.routes[current.route];
    var index = route.items.indexOf(current.id);
    var previous = index > 0 ? lesson(route.items[index - 1]) : routeEdge(route, 'previous');
    var next = index < route.items.length - 1 ? lesson(route.items[index + 1]) : routeEdge(route, 'next');
    var stage = data.stages[current.stage];

    var section = document.createElement('section');
    section.className = 'bpn';
    section.setAttribute('aria-labelledby', 'bpn-title');
    var header = document.createElement('header');
    header.innerHTML = '<div><p class="bpn-kicker">' + label(current.kind) + ' · Stage ' + stage.number + '</p><h2 id="bpn-title">Where this lesson leads</h2></div>' +
      '<p class="bpn-position">' + route.label + (route.items.length > 1 ? ' · Step ' + (index + 1) + ' of ' + route.items.length : '') + '</p>';
    section.appendChild(header);

    var rail = document.createElement('nav');
    rail.className = 'bpn-rail'; rail.setAttribute('aria-label', 'Bible curriculum route');
    rail.appendChild(link(previous, 'bpn-direction bpn-previous', previous ? 'Previous' : '') || document.createElement('span'));
    var hub = document.createElement('a'); hub.href = 'bible-foundations-pathway.html'; hub.className = 'bpn-hub'; hub.innerHTML = '<small>All six stages</small><strong>Pathway hub</strong>'; rail.appendChild(hub);
    rail.appendChild(link(next, 'bpn-direction bpn-next', next ? 'Next' : '') || document.createElement('span'));
    section.appendChild(rail);

    if (route.returnTo || (data.related[current.id] && data.related[current.id].length)) {
      var aside = document.createElement('aside'); aside.className = 'bpn-related';
      var heading = document.createElement('h3'); heading.textContent = route.returnTo ? 'Return to the core route' : 'Deepen and connect'; aside.appendChild(heading);
      var list = document.createElement('div');
      var ids = route.returnTo ? [route.returnTo].concat(data.related[current.id] || []) : data.related[current.id];
      ids.filter(function (id, i) {
        return ids.indexOf(id) === i && id !== current.id && (!previous || id !== previous.id) && (!next || id !== next.id);
      }).forEach(function (id) {
        var item = lesson(id); if (!item) return;
        var a = document.createElement('a'); a.href = item.href; a.textContent = item.title; list.appendChild(a);
      });
      aside.appendChild(list); section.appendChild(aside);
    }
    main.appendChild(section);
  }

  function enhanceHub() {
    if (here !== 'bible-foundations-pathway.html') return;
    document.querySelectorAll('#foundation-grid .bfp-foundation').forEach(function (card) {
      var anchor = card.querySelector('.bfp-open-lesson');
      var item = anchor && data.lessons.find(function (candidate) { return candidate.href === anchor.getAttribute('href'); });
      if (!item) return;
      card.dataset.pathwayKind = item.kind;
      var top = card.querySelector('.bfp-foundation-top');
      if (top && !top.querySelector('.bpn-kind')) {
        var badge = document.createElement('em'); badge.className = 'bpn-kind'; badge.textContent = label(item.kind); top.appendChild(badge);
      }
    });

    var host = document.querySelector('.bfp-stage-detail');
    if (!host) return;
    var box = document.createElement('div'); box.className = 'bpn-stage-routes'; box.setAttribute('aria-live', 'polite');
    host.insertBefore(box, document.getElementById('stage-show'));
    function render(stageKey) {
      var stageLessons = data.lessons.filter(function (item) { return item.stage === stageKey; });
      var core = stageLessons.filter(function (item) { return item.kind === 'core'; });
      var deeper = stageLessons.filter(function (item) { return item.kind !== 'core'; });
      box.replaceChildren();
      [['Take the core route', core], ['Explore more deeply', deeper]].forEach(function (group) {
        if (!group[1].length) return;
        var row = document.createElement('div'); var strong = document.createElement('strong'); strong.textContent = group[0]; row.appendChild(strong);
        var span = document.createElement('span');
        group[1].forEach(function (item, i) { if (i) span.appendChild(document.createTextNode(' → ')); var a = document.createElement('a'); a.href = item.href; a.textContent = item.title; span.appendChild(a); });
        row.appendChild(span); box.appendChild(row);
      });
    }
    document.querySelectorAll('.bfp-stage-button').forEach(function (button) { button.addEventListener('click', function () { render(button.dataset.stage); }); });
    render('world');
  }

  var style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = new URL('../css/components/bible-pathway-nav.css', document.currentScript.src).href;
  document.head.appendChild(style);
  enhanceHub();
  buildLessonNav();
}());
