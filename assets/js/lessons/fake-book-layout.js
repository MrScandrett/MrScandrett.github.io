/* Page presentation controls; musical settings remain in fake-book.js. */
(function () {
  'use strict';
  var button = document.querySelector('[data-fb-stand]');
  var root = document.getElementById('fakebook');
  var scroller = document.querySelector('.ll-sim');
  if (!button || !root) return;
  document.addEventListener('DOMContentLoaded', function () {
    var family = document.querySelector('.music-family .mf-fold');
    if (family) family.open = false;
    function revealTopic() {
      if (/^#(read|grow|practice|free|teachers)$/.test(location.hash)) {
        document.querySelector('.fb-learning').open = true;
        document.querySelector(location.hash).scrollIntoView();
      }
    }
    window.addEventListener('hashchange', revealTopic);
    revealTopic();
  });
  var previousScroll = 0;
  function setStand(on) {
    var wasOn = document.body.classList.contains('fb-standing');
    if (on && !wasOn) previousScroll = scroller.scrollTop;
    if (on && dock && !dock.hidden) closeTools();
    document.body.classList.toggle('fb-standing', on);
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? 'Exit stand' : 'Stand';
    if (on) {
      scroller.scrollTop = 0;
      button.focus({ preventScroll: true });
      if (!document.fullscreenElement && scroller.requestFullscreen) {
        // Keep the viewport-filling stand layout on browsers without fullscreen support.
        scroller.requestFullscreen().catch(function () {});
      }
    } else {
      if (document.fullscreenElement === scroller && document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
      }
      scroller.scrollTop = previousScroll;
    }
    placeDock();
  }
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && document.body.classList.contains('fb-standing')) {
      setStand(false);
      button.focus({ preventScroll: true });
    }
  });
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
  var lastTab = 'key';
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || '{}');
    if (tabs.some(function (tab) { return tab.dataset.fbDockTab === saved.tab; })) lastTab = saved.tab;
  } catch (e) { /* storage unavailable */ }
  var toolsButton = root.querySelector('[data-fb-tools]');
  function closeTools() {
    setTab(null);
    dock.hidden = true;
    toolsButton.setAttribute('aria-expanded', 'false');
    toolsButton.focus({ preventScroll: true });
  }
  toolsButton.addEventListener('click', function () {
    if (!dock.hidden) { closeTools(); return; }
    dock.hidden = false;
    placeDock();
    toolsButton.setAttribute('aria-expanded', 'true');
    setTab(lastTab);
    tabs.find(function (tab) { return tab.dataset.fbDockTab === lastTab; }).focus();
  });
  root.querySelector('[data-fb-tools-close]').addEventListener('click', closeTools);
  root.querySelector('[data-fb-tools-size]').addEventListener('click', function (event) {
    var expanded = dock.classList.toggle('is-expanded');
    event.currentTarget.setAttribute('aria-expanded', String(expanded));
    event.currentTarget.textContent = expanded ? 'Compact' : 'Expand';
  });
  document.querySelector('[data-fb-guide]').addEventListener('click', function () {
    if (window.LessonLayout) window.LessonLayout.openPanel(true);
    else document.querySelector('.ll-open-btn').click();
  });
  root.querySelector('.fb-library').addEventListener('click', function (event) {
    if (event.target.closest('[data-tune]')) root.querySelector('.fb-library-wrap').open = false;
  });


  function remember() {
    try { localStorage.setItem(STORE, JSON.stringify({ tab: lastTab })); } catch (e) { /* storage blocked */ }
  }
  function setTab(id, focusPane) {
    openTab = id || null;
    if (openTab) lastTab = openTab;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-fb-dock-tab') === openTab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on || (!openTab && t === tabs[0]) ? 0 : -1;
      if (on) {
        var rail = t.parentElement;
        rail.scrollLeft = t.offsetLeft - rail.offsetLeft - (rail.clientWidth - t.clientWidth) / 2;
      }
    });
    dock.querySelectorAll('[data-fb-pane]').forEach(function (p) {
      p.hidden = p.getAttribute('data-fb-pane') !== openTab;
    });
    drawer.hidden = !openTab;
    document.body.classList.toggle('fb-dock-open', !!openTab);
    if (openTab && focusPane) {
      var first = drawer.querySelector('[data-fb-pane="' + openTab + '"] input, [data-fb-pane="' + openTab + '"] select, [data-fb-pane="' + openTab + '"] button');
      if (first) first.focus({ preventScroll: true });
    }
    remember();
    placeDock();
  }
  // Pin the dock to the scrolling music area: below the nav bars, and above the
  // lesson guide handle that docks under the music on phones.
  function placeDock() {
    var r = (scroller || stage).getBoundingClientRect();
    var player = root.querySelector('.fb-transport').getBoundingClientRect();
    dock.style.setProperty('--fb-workspace-top', Math.max(8, r.top + 8) + 'px');
    dock.style.setProperty('--fb-dock-top', (window.matchMedia('(min-width: 1100px) and (min-height: 601px)').matches ? Math.max(0, r.top + 8) : Math.max(0, r.top, player.bottom + 8)) + 'px');
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
    var notesFor = root.querySelector('[data-fb-liner-empty]');
    setVal('notes', notesFor && !notesFor.hidden ? 'none' : (text('[data-fb-title]').split(/[,(]/)[0].trim() || 'story'));
    var key = chosen('[data-fb-key]').replace(/\s*\(.*\)$/, '');
    var instr = root.querySelector('[data-fb-instr]');
    setVal('key', key + (instr && instr.value !== 'concert' ? ' · ' + chosen('[data-fb-instr]').split(/[,(]/)[0].trim() : ''));
    setVal('melody', checkedLabel('[data-fb-melody]') || 'Original');
    setVal('rhythm', checkedLabel('[data-fb-rhythm]') || 'As written');
    var inst = root.querySelector('.fb-panel [data-engine-inst].is-active');
    setVal('chords', (inst ? inst.textContent.trim().replace(/^[^A-Za-z]+/, '') : 'Piano') + ' · ' + (checkedLabel('[data-fb-voicing]') || ''));
    setVal('band', chosen('[data-fb-style]') + ' · ' + (root.querySelector('[data-fb-feel]') && root.querySelector('[data-fb-feel]').value === 'swing' ? 'swing' : 'straight'));
    var loop = root.querySelector('[data-fb-loop]');
    var from = root.querySelector('[data-fb-from]'), to = root.querySelector('[data-fb-to]');
    var whole = Number(from.value) <= 1 && Number(to.value) >= Number(to.max || to.value);
    setVal('mix', (loop && loop.checked ? '⟳ ' : '') + (whole ? 'Whole tune' : 'Bars ' + from.value + '–' + to.value));
    var status = key + ' · Melody: ' + checkedLabel('[data-fb-melody]') + ' · Rhythm: ' + checkedLabel('[data-fb-rhythm]') + ' · ' + (loop.checked ? 'Loop ' + from.value + '–' + to.value : 'Loop off');
    var statusNode = root.querySelector('[data-fb-tools-status]');
    if (statusNode.textContent !== status) statusNode.textContent = status;
  }
  var pending = 0;
  function soon() { clearTimeout(pending); pending = setTimeout(summarize, 0); }

  if (dock && drawer) {
    dock.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-fb-dock-tab]');
      if (t) {
        var id = t.getAttribute('data-fb-dock-tab');
        setTab(id, false);
        return;
      }
      if (ev.target.closest('[data-fb-drawer-close]')) {
        var was = openTab;
        setTab(null);
        var back = dock.querySelector('[data-fb-dock-tab="' + was + '"]');
        if (back) back.focus();
      }
    });
    dock.querySelector('[role="tablist"]').addEventListener('keydown', function (ev) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[ev.key];
      if (next === undefined) return;
      ev.preventDefault();
      var target = tabs[(next + tabs.length) % tabs.length];
      setTab(target.dataset.fbDockTab);
      target.focus();
    });
    ['change', 'input', 'click'].forEach(function (type) { root.addEventListener(type, soon); });
    var watch = new MutationObserver(soon);
    ['[data-fb-live-chordname]', '[data-fb-keyline]', '[data-fb-key]', '[data-fb-title]'].forEach(function (sel) {
      var n = root.querySelector(sel);
      if (n) watch.observe(n, { childList: true, characterData: true, subtree: true });
    });
    setTab(null);
    placeDock();
    window.addEventListener('resize', placeDock);
    window.addEventListener('orientationchange', function () { setTimeout(placeDock, 250); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', placeDock);
    window.addEventListener('scroll', placeDock, true);
    // The music-family nav is injected after load and the guide drawer resizes
    // the music area on phones; follow both.
    if (window.ResizeObserver) {
      var dockSize = new ResizeObserver(placeDock);
      if (scroller) dockSize.observe(scroller);
      dockSize.observe(root.querySelector('.fb-transport'));
    }
    summarize();
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (!dock.hidden) {
      event.preventDefault();
      closeTools();
      return;
    }
    if (button.getAttribute('aria-pressed') === 'true') {
      setStand(false);
      button.focus();
    }
  });
})();
