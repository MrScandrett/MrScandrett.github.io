/* instrument-pathway.js — the six-stage pathway every instrument lesson shares.
 * A student who learned the route on one instrument finds the same stages, in the same order,
 * with the same names and icons, on every other one.
 *
 * In a lesson:
 *   <div data-instrument-pathway="piano"></div>          where the pathway map goes
 *   <section data-stage="read" data-stage-summary="…">   every section belongs to one stage;
 *                                                        the first one is the stage's entry and
 *                                                        carries the summary for this instrument
 *   data-stage-label="Short name"                        optional; else data-route-label, else h2
 * Stages must appear in order. A stage element inside a tab panel is fine: links open the tab.
 * Each stage's signpost is #stage-<id>, so `drums.html#stage-read` lands on the same stage anywhere.
 * Progress is one localStorage key, { piano: { meet: true }, … }; lesson JS may call
 * InstrumentPathway.complete('check') when a student finishes a stage's capstone activity.
 */
(function () {
  'use strict';

  var STAGES = [
    { id: 'meet', icon: '🔍', name: 'Meet', goal: 'Name the parts and how it makes a sound.' },
    { id: 'setup', icon: '🤲', name: 'Set up', goal: 'Hold it without tension and make one good sound.' },
    { id: 'read', icon: '🎼', name: 'Read', goal: 'Find notes and read them on the page.' },
    { id: 'build', icon: '🧱', name: 'Build', goal: 'Practice the patterns music is made from.' },
    { id: 'play', icon: '🎶', name: 'Play', goal: 'Put the patterns together into music.' },
    { id: 'check', icon: '✅', name: 'Check', goal: 'Explain and show what you learned.' }
  ];
  var INSTRUMENTS = [
    { id: 'piano', file: 'piano.html', name: 'Piano', icon: '🎹' },
    { id: 'guitar', file: 'guitar.html', name: 'Guitar', icon: '🎸' },
    { id: 'violin', file: 'violin-fingerboard.html', name: 'Violin', icon: '🎻' },
    { id: 'saxophone', file: 'saxophone.html', name: 'Saxophone', icon: '🎷' },
    { id: 'drums', file: 'drums.html', name: 'Drums', icon: '🥁' }
  ];
  var KEY = 'classroomos:instrument-pathway:v1';

  var host = document.querySelector('[data-instrument-pathway]');
  if (!host) return;
  var me = INSTRUMENTS.filter(function (i) { return i.id === host.getAttribute('data-instrument-pathway'); })[0];
  if (!me) return;
  var script = document.currentScript;
  var dir = script ? script.src.replace(/assets\/js\/lessons\/instrument-pathway\.js.*$/, '') + 'lessons/music/instruments/' : '';

  function load() {
    var all = {};
    try { all = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { all = {}; }
    // Drum Lab kept its own seven-stage list before the shared pathway; carry finished stages over once.
    if (!all.drums) {
      try {
        var old = JSON.parse(localStorage.getItem('drumLabPath.v1') || 'null');
        if (old) {
          var map = { explore: 'meet', decode: 'read', technique: 'build', create: 'play', reflect: 'check' };
          all.drums = {};
          Object.keys(map).forEach(function (k) { if (old[k]) all.drums[map[k]] = true; });
        }
      } catch (e) { /* ignore */ }
    }
    return all;
  }
  var store = load();
  function done(inst, stage) { return !!(store[inst] && store[inst][stage]); }
  function count(inst) { return STAGES.filter(function (s) { return done(inst, s.id); }).length; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } }
  function set(stage, value) {
    store[me.id] = store[me.id] || {};
    if (value) store[me.id][stage] = true; else delete store[me.id][stage];
    save();
    render();
  }

  function el(tag, cls, text, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function membersOf(stage) { return Array.prototype.slice.call(document.querySelectorAll('[data-stage="' + stage + '"]')); }
  function entryOf(stage) { return membersOf(stage)[0] || null; }
  function labelOf(node) {
    var h = node.querySelector('h2');
    return node.getAttribute('data-stage-label') || node.getAttribute('data-route-label') || (h ? h.textContent.trim() : node.id);
  }
  function stageTitle(s) { return 'Stage ' + (STAGES.indexOf(s) + 1) + ' · ' + s.name; }
  function stageNumber(s, parent) {
    var n = el('span', 'ip-num', String(STAGES.indexOf(s) + 1), parent);
    n.setAttribute('aria-hidden', 'true');
    return n;
  }
  function stageIcon(s, parent) { el('span', 'ip-icon', s.icon, parent).setAttribute('aria-hidden', 'true'); }
  var stages = STAGES.filter(function (s) { return entryOf(s.id); });

  // Every "mark done" control on the page, re-labelled by render().
  var toggles = [];
  function doneButton(s, parent, long) {
    var b = el('button', 'ip-done', null, parent);
    b.type = 'button';
    b.addEventListener('click', function () { set(s.id, !done(me.id, s.id)); });
    toggles.push({ button: b, stage: s, long: long });
    return b;
  }

  /* -------------------------------------------------------------- the map */
  // Kept to a strip: a title row, one step per stage, and the per-stage detail folded away.
  var map = el('section', 'ip-map');
  map.id = 'instrument-pathway';
  map.setAttribute('aria-labelledby', 'ipTitle');
  var head = el('div', 'ip-head', null, map);
  el('h2', null, me.name + ' pathway', head).id = 'ipTitle';
  var status = el('p', 'ip-status', null, head);
  status.setAttribute('role', 'status');
  var cont = el('a', 'ip-continue', null, head);
  var reset = el('button', 'ip-reset', 'Start over', head);
  reset.type = 'button';
  reset.addEventListener('click', function () { store[me.id] = {}; save(); render(); });

  var sw = el('nav', 'ip-switch', null, head);
  sw.setAttribute('aria-label', 'The same pathway on other instruments');
  var chips = INSTRUMENTS.map(function (inst) {
    var a = el('a', 'ip-chip', null, sw);
    a.href = inst.id === me.id ? '#instrument-pathway' : dir + inst.file + '#instrument-pathway';
    if (inst.id === me.id) a.setAttribute('aria-current', 'page');
    el('span', null, inst.icon, a).setAttribute('aria-hidden', 'true');
    return { inst: inst, a: a, small: el('small', null, null, a) };
  });

  var list = el('ol', 'ip-stages', null, map);
  var steps = stages.map(function (s) {
    var li = el('li', 'ip-step', null, list);
    var a = el('a', null, null, li);
    a.href = '#stage-' + s.id;
    a.title = s.goal;
    stageNumber(s, a);
    stageIcon(s, a);
    el('span', 'ip-step-name', s.name, a);
    return { stage: s, li: li, a: a };
  });

  var more = el('details', 'ip-more', null, map);
  el('summary', null, 'What each stage means on ' + me.name.toLowerCase(), more);
  el('p', 'ip-lede', 'Each stage means the same thing on piano, guitar, violin, saxophone and drums, so this route is the map for your next instrument too.', more);
  var rows = el('ol', 'ip-rows', null, more);
  stages.forEach(function (s) {
    var entry = entryOf(s.id);
    var li = el('li', 'ip-row', null, rows);
    var copy = el('div', null, null, li);
    var t = el('p', 'ip-row-title', null, copy);
    el('b', null, (STAGES.indexOf(s) + 1) + '. ' + s.name, t);
    t.appendChild(document.createTextNode(' — ' + s.goal));
    var here = entry.getAttribute('data-stage-summary');
    if (here) el('p', 'ip-here', 'On ' + me.name.toLowerCase() + ': ' + here, copy);
    var links = el('p', 'ip-sections', null, copy);
    membersOf(s.id).forEach(function (m, i) {
      if (!m.id) return;
      if (i) links.appendChild(document.createTextNode(' · '));
      var a = el('a', null, labelOf(m), links);
      a.href = '#' + m.id;
    });
    doneButton(s, li, false);
  });

  host.parentNode.replaceChild(map, host);

  /* ------------------------------------------- a signpost at every stage */
  // Inside a tab panel the signpost goes in the panel, so it shows with that tab.
  function place(node, target, after) {
    if (target.getAttribute('role') === 'tabpanel') {
      if (after) target.appendChild(node); else target.insertBefore(node, target.firstChild);
    } else {
      target.parentNode.insertBefore(node, after ? target.nextSibling : target);
    }
  }
  // Icon links to the other instruments; the name is in the label and tooltip.
  function otherLinks(s, parent, lead) {
    var p = el('p', 'ip-other', null, parent);
    el('span', null, lead, p);
    INSTRUMENTS.forEach(function (inst) {
      if (inst.id === me.id) return;
      var a = el('a', null, inst.icon, p);
      a.href = dir + inst.file + '#stage-' + s.id;
      a.title = lead + ' ' + inst.name;
      a.setAttribute('aria-label', inst.name);
    });
  }
  // One line per stage: number, name and goal, the same stage elsewhere, and a tick for the
  // stage just finished.
  stages.forEach(function (s, i) {
    var sign = el('div', 'ip-sign');
    sign.id = 'stage-' + s.id;
    var main = el('div', 'ip-sign-main', null, sign);
    stageNumber(s, main);
    stageIcon(s, main);
    var title = el('p', 'ip-sign-title', null, main);
    el('span', 'ip-sr', 'Stage ' + (i + 1) + ' of ' + stages.length + ' of the ' + me.name.toLowerCase() + ' pathway: ', title);
    title.appendChild(document.createTextNode(s.name));
    el('span', 'ip-goal', s.goal, main);
    otherLinks(s, sign, 'Also on');
    if (i) doneButton(stages[i - 1], sign, true);
    place(sign, entryOf(s.id), false);
    sign.style.scrollMarginTop = getComputedStyle(entryOf(s.id)).scrollMarginTop;
  });
  var last = stages[stages.length - 1];
  if (last) {
    var members = membersOf(last.id);
    var finish = el('div', 'ip-sign ip-finish');
    var fp = el('p', 'ip-finish-copy', null, finish);
    fp.appendChild(document.createTextNode('End of the ' + me.name.toLowerCase() + ' pathway · '));
    var back = el('a', null, 'See your progress', fp);
    back.href = '#instrument-pathway';
    otherLinks(STAGES[0], finish, 'Start on');
    doneButton(last, finish, true);
    place(finish, members[members.length - 1], true);
  }

  function render() {
    var n = count(me.id), next = null;
    stages.forEach(function (s) { if (!next && !done(me.id, s.id)) next = s; });
    status.textContent = n + '/' + stages.length + ' done';
    status.setAttribute('aria-label', n + ' of ' + stages.length + ' stages complete');
    if (next) {
      cont.href = '#stage-' + next.id;
      cont.textContent = (n ? 'Continue: ' : 'Start: ') + next.name + ' →';
    } else {
      cont.href = '#stage-' + (entryOf('play') ? 'play' : stages[0].id);
      cont.textContent = 'Keep playing →';
    }
    reset.hidden = !n;
    steps.forEach(function (c) {
      var d = done(me.id, c.stage.id);
      c.li.classList.toggle('is-done', d);
      c.li.classList.toggle('is-next', c.stage === next);
      if (c.stage === next) c.a.setAttribute('aria-current', 'step'); else c.a.removeAttribute('aria-current');
      c.a.setAttribute('aria-label', stageTitle(c.stage) + (d ? ', done' : ''));
    });
    toggles.forEach(function (t) {
      var d = done(me.id, t.stage.id);
      t.button.setAttribute('aria-pressed', d ? 'true' : 'false');
      t.button.textContent = t.long
        ? (d ? '✓ ' + t.stage.name + ' done' : 'Mark ' + t.stage.name + ' done')
        : (d ? '✓ Done' : 'Mark done');
      if (t.long) t.button.title = stageTitle(t.stage);
    });
    chips.forEach(function (c) {
      var k = count(c.inst.id);
      c.small.textContent = k ? k + '/' + STAGES.length : '';
      c.a.setAttribute('aria-label', c.inst.name + ', ' + k + ' of ' + STAGES.length + ' stages');
      c.a.title = c.inst.name;
    });
  }
  render();

  /* ------------------------------------------------ getting to a stage */
  function reveal(target) {
    var pane = target.closest('[role="tabpanel"]');
    if (pane && pane.hidden) {
      var tab = document.getElementById(pane.getAttribute('aria-labelledby'));
      if (tab) tab.click();
    }
    for (var p = target.parentElement; p; p = p.parentElement) { if (p.tagName === 'DETAILS') p.open = true; }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    var target = a && document.getElementById(a.getAttribute('href').slice(1));
    if (target) reveal(target);
  }, true);
  // Sims, scores and videos above a signpost finish laying out after the page loads and push it
  // down, so keep it in place for a moment unless the student has started scrolling.
  function settle(target) {
    var stop = false, until = Date.now() + 2500;
    function quit() { stop = true; }
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { window.addEventListener(t, quit, { once: true, passive: true }); });
    (function snap() {
      if (stop) return;
      target.scrollIntoView({ block: 'start' });
      if (Date.now() < until) setTimeout(snap, 250);
    })();
  }
  function fromHash() {
    var target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    reveal(target);
    // A signpost may have been inside a closed tab or chapter when the browser tried to scroll.
    if (target.classList.contains('ip-sign')) settle(target);
  }
  window.addEventListener('hashchange', fromHash);
  // Lesson scripts wire their tabs and chapters on DOMContentLoaded; follow the hash after them.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromHash); else fromHash();

  window.InstrumentPathway = { complete: function (stage) { if (!done(me.id, stage)) set(stage, true); } };
})();
