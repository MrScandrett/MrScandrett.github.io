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
  var workspace = root.closest('[data-creation-app]');
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
      if (!document.fullscreenElement && !workspace.classList.contains('creation-app-expanded') && scroller.requestFullscreen) {
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
  var lastTab = 'sheet';
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || '{}');
    if (tabs.some(function (tab) { return tab.dataset.fbDockTab === saved.tab; })) lastTab = saved.tab;
  } catch (e) { /* storage unavailable */ }
  var toolsButton = root.querySelector('[data-fb-tools]');
  var sheetButton = root.querySelector('[data-fb-settings-sum]');
  var chordButton = root.querySelector('[data-fb-edit-open]');
  var openedBy = toolsButton;
  function closeTools() {
    setTab(null);
    dock.hidden = true;
    openedBy.focus();
  }
  function openTools(tab, opener) {
    openedBy = opener;
    dock.hidden = false;
    setTab(tab);
    if (opener === chordButton) root.querySelector('[data-fb-edit-symbols]').focus();
    else tabs.find(function (t) { return t.dataset.fbDockTab === tab; }).focus();
  }
  function toggleTools(tab, opener) {
    if (!dock.hidden && openedBy === opener && openTab === tab) closeTools();
    else openTools(tab, opener);
  }
  toolsButton.addEventListener('click', function () {
    if (!dock.hidden) closeTools();
    else openTools(lastTab, toolsButton);
  });
  sheetButton.addEventListener('click', function () { toggleTools('sheet', sheetButton); });
  root.addEventListener('fakebook:tools', function (ev) {
    var tab = ev.detail && ev.detail.tab;
    if (ev.detail && ev.detail.opener === chordButton) {
      toggleTools(tab, chordButton);
    } else if (tabs.some(function (t) { return t.dataset.fbDockTab === tab; })) {
      openTools(tab, document.activeElement);
    }
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
  function setTab(id) {
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
    drawer.querySelector('.fb-drawer-body').scrollTop = 0;
    toolsButton.setAttribute('aria-expanded', String(!!openTab));
    sheetButton.setAttribute('aria-expanded', String(openTab === 'sheet'));
    chordButton.setAttribute('aria-expanded', String(openTab === 'chords'));
    remember();
    placeDock();
  }
  // Pin the dock to the scrolling music area: below the nav bars, and above the
  // lesson guide handle that docks under the music on phones.
  function placeDock() {
    var expanded = document.fullscreenElement === workspace || workspace.classList.contains('creation-app-expanded');
    var r = (expanded ? workspace : (scroller || stage)).getBoundingClientRect();
    var player = root.querySelector('.fb-transport').getBoundingClientRect();
    dock.style.setProperty('--fb-workspace-top', Math.max(8, r.top + 8) + 'px');
    dock.style.setProperty('--fb-dock-top', (window.matchMedia('(min-width: 1100px) and (min-height: 601px)').matches ? Math.max(0, r.top + 8) : Math.max(0, r.top, player.bottom + 8)) + 'px');
    dock.style.setProperty('--fb-dock-bottom', Math.max(0, window.innerHeight - r.bottom) + 'px');
  }

  if (dock && drawer) {
    dock.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-fb-dock-tab]');
      if (t) {
        var id = t.getAttribute('data-fb-dock-tab');
        setTab(id);
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
  }

  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented || event.key !== 'Escape') return;
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
