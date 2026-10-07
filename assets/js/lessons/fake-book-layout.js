/* Page presentation controls; musical settings remain in fake-book.js. */
(function () {
  'use strict';
  var button = document.querySelector('[data-fb-stand]');
  var root = document.getElementById('fakebook');
  var scroller = document.querySelector('.ll-sim');
  if (!button || !root) return;
  var previousScroll = 0;
  function setStand(on) {
    if (on) previousScroll = scroller.scrollTop;
    document.body.classList.toggle('fb-standing', on);
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? 'Exit music stand' : 'Music stand view';
    if (on) scroller.scrollTop = 0;
    else scroller.scrollTop = previousScroll;
  }
  button.addEventListener('click', function () {
    setStand(button.getAttribute('aria-pressed') !== 'true');
  });

  /* ---- settings dock: a tab rail that stays on screen and a drawer that
     slides out beside the music, so nothing moves when the sheet follows. */
  var dock = root.querySelector('[data-fb-dock]');
  var drawer = dock && dock.querySelector('[data-fb-drawer]');
  var tabs = dock ? Array.prototype.slice.call(dock.querySelectorAll('[data-fb-dock-tab]')) : [];
  var stage = document.querySelector('.ll-stage');
  var STORE = 'fakebook:dock:v1';
  var openTab = null;

  function remember() {
    try { localStorage.setItem(STORE, JSON.stringify({ tab: openTab })); } catch (e) { /* storage blocked */ }
  }
  function setTab(id, focusPane) {
    openTab = id || null;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-fb-dock-tab') === openTab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on || (!openTab && t === tabs[0]) ? 0 : -1;
    });
    dock.querySelectorAll('[data-fb-pane]').forEach(function (p) {
      p.hidden = p.getAttribute('data-fb-pane') !== openTab;
    });
    drawer.hidden = !openTab;
    root.querySelectorAll('[data-fb-dock-open]').forEach(function (b) {
      b.setAttribute('aria-expanded', String(b.getAttribute('data-fb-dock-open') === openTab));
    });
    document.body.classList.toggle('fb-dock-open', !!openTab);
    if (openTab && focusPane) {
      var first = drawer.querySelector('[data-fb-pane="' + openTab + '"] input, [data-fb-pane="' + openTab + '"] select, [data-fb-pane="' + openTab + '"] button');
      if (first) first.focus({ preventScroll: true });
    }
    remember();
  }
  // Pin the dock to the scrolling music area: below the nav bars, and above the
  // lesson guide handle that docks under the music on phones.
  function placeDock() {
    var r = (scroller || stage).getBoundingClientRect();
    dock.style.setProperty('--fb-dock-top', Math.max(0, r.top) + 'px');
    dock.style.setProperty('--fb-dock-bottom', Math.max(0, window.innerHeight - r.bottom) + 'px');
  }

  function text(sel) {
    var n = root.querySelector(sel);
    return n ? n.textContent.trim() : '';
  }
  function chosen(sel) {
    var s = root.querySelector(sel);
    return s && s.selectedIndex >= 0 && s.options[s.selectedIndex] ? s.options[s.selectedIndex].textContent.trim() : '';
  }
  function checkedLabel(sel) {
    var r = root.querySelector(sel + ' input:checked');
    return r && r.nextElementSibling ? r.nextElementSibling.textContent.trim() : '';
  }
  function setVal(id, v) {
    root.querySelectorAll('[data-fb-dock-val="' + id + '"]').forEach(function (n) {
      if (n.textContent !== v) { n.textContent = v; n.title = v; }
    });
  }
  function summarize() {
    var now = text('[data-fb-live-chordname]');
    setVal('changes', now && now !== '--' ? now : 'chart');
    var key = chosen('[data-fb-key]').replace(/\s*\(.*\)$/, '');
    var instr = root.querySelector('[data-fb-instr]');
    setVal('key', key + (instr && instr.value !== 'concert' ? ' · ' + chosen('[data-fb-instr]').split(/[,(]/)[0].trim() : ''));
    setVal('melody', checkedLabel('[data-fb-melody]') || 'Original');
    setVal('rhythm', checkedLabel('[data-fb-rhythm]') || 'As written');
    var inst = root.querySelector('.fb-panel [data-engine-inst].is-active');
    setVal('chords', (inst && inst.getAttribute('data-engine-inst') === 'guitar' ? 'Guitar' : 'Piano') + ' · ' + (checkedLabel('[data-fb-voicing]') || ''));
    setVal('band', chosen('[data-fb-style]') + ' · ' + (root.querySelector('[data-fb-feel]') && root.querySelector('[data-fb-feel]').value === 'swing' ? 'swing' : 'straight'));
    var loop = root.querySelector('[data-fb-loop]');
    var from = root.querySelector('[data-fb-from]'), to = root.querySelector('[data-fb-to]');
    var whole = Number(from.value) <= 1 && Number(to.value) >= Number(to.max || to.value);
    setVal('mix', (loop && loop.checked ? '⟳ ' : '') + (whole ? 'Whole tune' : 'Bars ' + from.value + '–' + to.value));
  }
  var pending = 0;
  function soon() { clearTimeout(pending); pending = setTimeout(summarize, 0); }

  if (dock && drawer) {
    dock.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-fb-dock-tab]');
      if (t) {
        var id = t.getAttribute('data-fb-dock-tab');
        setTab(openTab === id ? null : id, false);
        return;
      }
      if (ev.target.closest('[data-fb-drawer-close]')) {
        var was = openTab;
        setTab(null);
        var back = dock.querySelector('[data-fb-dock-tab="' + was + '"]');
        if (back) back.focus();
      }
    });
    // The settings strip in the transport opens the same drawer pages.
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-fb-dock-open]');
      if (!b) return;
      var id = b.getAttribute('data-fb-dock-open');
      setTab(openTab === id ? null : id, false);
    });
    dock.querySelector('[role="tablist"]').addEventListener('keydown', function (ev) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[ev.key];
      if (next === undefined) return;
      ev.preventDefault();
      tabs[(next + tabs.length) % tabs.length].focus();
    });
    ['change', 'input', 'click'].forEach(function (type) { root.addEventListener(type, soon); });
    var watch = new MutationObserver(soon);
    ['[data-fb-live-chordname]', '[data-fb-keyline]', '[data-fb-key]'].forEach(function (sel) {
      var n = root.querySelector(sel);
      if (n) watch.observe(n, { childList: true, characterData: true, subtree: true });
    });
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
    setTab(saved && saved.tab && dock.querySelector('[data-fb-dock-tab="' + saved.tab + '"]') ? saved.tab : null);
    placeDock();
    window.addEventListener('resize', placeDock);
    // The music-family nav is injected after load and the guide drawer resizes
    // the music area on phones; follow both.
    if (window.ResizeObserver && scroller) new ResizeObserver(placeDock).observe(scroller);
    summarize();
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (openTab && drawer && (drawer.contains(document.activeElement) || button.getAttribute('aria-pressed') !== 'true')) {
      var was = openTab;
      setTab(null);
      var back = dock.querySelector('[data-fb-dock-tab="' + was + '"]');
      if (back) back.focus();
      return;
    }
    if (button.getAttribute('aria-pressed') === 'true') {
      setStand(false);
      button.focus();
    }
  });
})();
