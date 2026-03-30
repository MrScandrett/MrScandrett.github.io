/**
 * lesson-layout.js — Single-Viewport Master Layout System
 * ClassroomOS · Mr. Scandrett's STEAM Lessons
 *
 * Handles: tab switching, panel open/close, mobile drawer,
 * preset chips, real-time readout API.
 *
 * Include at the END of <body>:
 *   <script src="../assets/js/lesson-layout.js"></script>
 */
(function (global) {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     Auto panel builder
     If a lesson marks sections with data-ll-panel="guide|controls",
     build a panel around them so they live in a single-view UI.
  ────────────────────────────────────────────────────────── */
  function initAutoPanel() {
    if (document.querySelector('.ll-panel')) return;
    var viewport = document.querySelector('.ll-viewport');
    if (!viewport) return;
    var stage = viewport.querySelector('.ll-stage');
    var sim = viewport.querySelector('.ll-sim');
    if (!stage || !sim) return;

    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-ll-panel]'));
    if (!nodes.length) return;

    var groups = [];
    nodes.forEach(function (node) {
      var key = node.getAttribute('data-ll-panel') || 'guide';
      var group = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].key === key) { group = groups[i]; break; }
      }
      if (!group) {
        group = { key: key, nodes: [], index: groups.length };
        groups.push(group);
      }
      group.nodes.push(node);
    });

    var labels = {
      guide: 'Guide',
      tutorial: 'Guide',
      controls: 'Controls',
      params: 'Parameters',
      parameters: 'Parameters',
      settings: 'Settings',
      data: 'Data'
    };

    var order = {
      controls: 0,
      params: 1,
      parameters: 1,
      settings: 2,
      guide: 3,
      tutorial: 3,
      data: 4
    };

    function orderFor(key, index) {
      return order.hasOwnProperty(key) ? order[key] : 50 + index;
    }

    groups.sort(function (a, b) {
      var aOrder = orderFor(a.key, a.index);
      var bOrder = orderFor(b.key, b.index);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.index - b.index;
    });

    function safeId(value) {
      var cleaned = String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      return cleaned || 'pane';
    }

    var panel = document.createElement('aside');
    panel.className = 'll-panel';
    panel.setAttribute('aria-hidden', 'false');

    var head = document.createElement('div');
    head.className = 'll-panel-head';

    var tabs = document.createElement('div');
    tabs.className = 'll-tabs';

    groups.forEach(function (group, index) {
      var paneId = 'll-auto-pane-' + safeId(group.key) + '-' + index;
      group.paneId = paneId;

      var tab = document.createElement('button');
      tab.className = 'll-tab';
      tab.type = 'button';
      tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      tab.setAttribute('data-pane', paneId);
      tab.textContent = labels[group.key] || (group.key.charAt(0).toUpperCase() + group.key.slice(1));
      tabs.appendChild(tab);
    });

    var closeBtn = document.createElement('button');
    closeBtn.className = 'll-panel-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close panel');
    closeBtn.innerHTML = '&#x2715;';

    head.appendChild(tabs);
    head.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'll-panel-body';

    groups.forEach(function (group, index) {
      var pane = document.createElement('div');
      pane.className = 'll-pane' + (index === 0 ? ' ll-active' : '');
      pane.id = group.paneId;
      pane.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
      group.nodes.forEach(function (node) {
        pane.appendChild(node);
      });
      body.appendChild(pane);
    });

    panel.appendChild(head);
    panel.appendChild(body);
    stage.appendChild(panel);

    if (!stage.querySelector('.ll-open-btn')) {
      var openBtn = document.createElement('button');
      openBtn.className = 'll-open-btn';
      openBtn.type = 'button';
      openBtn.setAttribute('aria-label', 'Open panel');
      openBtn.innerHTML = '<span class="ll-open-dot"></span><span class="ll-open-dot"></span><span class="ll-open-dot"></span>';
      stage.appendChild(openBtn);
    }
  }

  /* ──────────────────────────────────────────────────────────
     Tab switching
     Each .ll-panel manages its own set of .ll-tab → .ll-pane
  ────────────────────────────────────────────────────────── */
  function initTabs() {
    document.querySelectorAll('.ll-panel').forEach(function (panel) {
      var tabs  = Array.prototype.slice.call(panel.querySelectorAll('.ll-tab'));
      var panes = Array.prototype.slice.call(panel.querySelectorAll('.ll-pane'));

      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () {
          /* deactivate all tabs in this panel */
          tabs.forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
          tab.setAttribute('aria-selected', 'true');

          /* find target pane by id or index */
          var paneId = tab.getAttribute('data-pane');
          var target = paneId ? document.getElementById(paneId) : null;
          if (!target) target = panes[i] || null;

          /* deactivate all panes, activate target */
          panes.forEach(function (p) {
            p.setAttribute('aria-hidden', 'true');
            p.classList.remove('ll-active');
          });
          if (target) {
            target.setAttribute('aria-hidden', 'false');
            target.classList.add('ll-active');
          }

          /* fire custom event so lessons can react */
          panel.dispatchEvent(new CustomEvent('ll:tab', {
            detail: { tab: tab, paneId: paneId, index: i },
            bubbles: true
          }));
        });
      });
    });
  }

  /* ──────────────────────────────────────────────────────────
     Panel open / close
  ────────────────────────────────────────────────────────── */
  function getPanelOpenButton(panel) {
    var stage = panel && panel.closest('.ll-stage');
    return stage ? stage.querySelector('.ll-open-btn') : null;
  }

  function setPanelInteractivity(panel, open) {
    if (open) {
      panel.removeAttribute('inert');
      if ('inert' in panel) panel.inert = false;
    } else {
      panel.setAttribute('inert', '');
      if ('inert' in panel) panel.inert = true;
    }
  }

  function setPanel(panel, open) {
    if (!panel) return;

    if (!open) {
      var active = document.activeElement;
      if (active && panel.contains(active)) {
        var openBtn = getPanelOpenButton(panel);
        if (openBtn) {
          openBtn.focus();
        } else if (typeof active.blur === 'function') {
          active.blur();
        }
      }
    }

    setPanelInteractivity(panel, open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    panel.dispatchEvent(new CustomEvent('ll:panel', {
      detail: { open: open },
      bubbles: true
    }));
  }

  function initPanel() {
    document.querySelectorAll('.ll-panel').forEach(function (panel) {
      setPanelInteractivity(panel, panel.getAttribute('aria-hidden') !== 'true');
    });

    /* Close / collapse button */
    document.querySelectorAll('.ll-panel-close').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var panel = btn.closest('.ll-panel');
        if (!panel) return;
        var isMobile  = window.innerWidth <= 680;
        var isHidden  = panel.getAttribute('aria-hidden') === 'true';
        /* on mobile the button is a toggle; on desktop it only closes */
        if (isMobile) {
          setPanel(panel, isHidden);
        } else {
          setPanel(panel, false);
        }
      });
    });

    /* Open button (floating pill on desktop, shows when panel hidden) */
    document.querySelectorAll('.ll-open-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var stage = btn.closest('.ll-stage');
        if (!stage) return;
        var panel = stage.querySelector('.ll-panel');
        if (panel) setPanel(panel, true);
      });
    });

    /* Mobile: tapping the panel head (but not a tab/button) toggles drawer */
    document.querySelectorAll('.ll-panel-head').forEach(function (head) {
      head.addEventListener('click', function (e) {
        /* only handle on mobile */
        if (window.innerWidth > 680) return;
        /* ignore if a tab or button inside head was clicked */
        if (e.target.closest('.ll-tab') || e.target.closest('.ll-panel-close')) return;
        var panel = head.closest('.ll-panel');
        if (!panel) return;
        var isHidden = panel.getAttribute('aria-hidden') === 'true';
        setPanel(panel, isHidden);
      });
    });
  }

  /* ──────────────────────────────────────────────────────────
     Keyboard shortcuts
  ────────────────────────────────────────────────────────── */
  function initKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && window.innerWidth > 680) {
        document.querySelectorAll('.ll-panel').forEach(function (p) {
          setPanel(p, false);
        });
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     Preset chips
     Dispatch 'll:preset' with { name, values } so lessons
     can update their simulation state.
  ────────────────────────────────────────────────────────── */
  function initPresets() {
    document.querySelectorAll('.ll-preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        /* deactivate siblings */
        var container = btn.closest('.ll-presets');
        if (container) {
          container.querySelectorAll('.ll-preset').forEach(function (b) {
            b.classList.remove('ll-active');
          });
        }
        btn.classList.add('ll-active');

        /* parse optional inline JSON values */
        var presetValues = null;
        var raw = btn.getAttribute('data-values');
        if (raw) {
          try { presetValues = JSON.parse(raw); } catch (_) {}
        }

        document.dispatchEvent(new CustomEvent('ll:preset', {
          detail: {
            name:   btn.getAttribute('data-preset'),
            values: presetValues,
            btn:    btn
          },
          bubbles: true
        }));
      });
    });
  }

  /* ──────────────────────────────────────────────────────────
     Drag-to-expand for mobile drawer
     A small enhancement: drag up on the drawer handle to open,
     drag down to collapse.
  ────────────────────────────────────────────────────────── */
  function initDrawerDrag() {
    document.querySelectorAll('.ll-panel-head').forEach(function (head) {
      var panel     = head.closest('.ll-panel');
      var startY    = 0;
      var dragging  = false;

      head.addEventListener('touchstart', function (e) {
        if (window.innerWidth > 680) return;
        startY   = e.touches[0].clientY;
        dragging = true;
      }, { passive: true });

      head.addEventListener('touchend', function (e) {
        if (!dragging || window.innerWidth > 680) return;
        dragging = false;
        var delta = e.changedTouches[0].clientY - startY;
        /* swipe up (negative delta) → open; swipe down → close */
        if (Math.abs(delta) > 24) {
          setPanel(panel, delta < 0);
        }
      }, { passive: true });
    });
  }

  /* ──────────────────────────────────────────────────────────
     Public API — LessonLayout
  ────────────────────────────────────────────────────────── */
  global.LessonLayout = {
    /**
     * Update a [data-readout="id"] element's text.
     * @param {string} id
     * @param {string|number} value
     * @param {string} [unit]  optional unit appended with no space (pass " °C" with leading space if needed)
     */
    setReadout: function (id, value, unit) {
      var el = document.querySelector('[data-readout="' + id + '"]');
      if (el) el.textContent = unit != null ? value + unit : String(value);
    },

    /**
     * Update a [data-val="id"] span (used inside param labels).
     */
    setVal: function (id, value) {
      var el = document.querySelector('[data-val="' + id + '"]');
      if (el) el.textContent = String(value);
    },

    /**
     * Open or close the first .ll-panel on the page.
     * @param {boolean} [open=true]
     */
    openPanel: function (open) {
      var panel = document.querySelector('.ll-panel');
      if (panel) setPanel(panel, open !== false);
    },

    /**
     * Programmatically click a preset button by name.
     * @param {string} name  matches data-preset="…"
     */
    activatePreset: function (name) {
      var btn = document.querySelector('.ll-preset[data-preset="' + CSS.escape(name) + '"]');
      if (btn) btn.click();
    },

    /**
     * Switch to a tab by its data-pane id.
     * @param {string} paneId
     */
    switchTab: function (paneId) {
      var tab = document.querySelector('.ll-tab[data-pane="' + CSS.escape(paneId) + '"]');
      if (tab) tab.click();
    }
  };

  /* ──────────────────────────────────────────────────────────
     Bootstrap
  ────────────────────────────────────────────────────────── */
  function init() {
    initAutoPanel();
    initTabs();
    initPanel();
    initKeyboard();
    initPresets();
    initDrawerDrag();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}(window));
