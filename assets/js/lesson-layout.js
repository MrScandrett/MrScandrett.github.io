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

  function ensureClassroomRangeSkin() {
    if (window.ClassroomOSRangeSkin) {
      window.ClassroomOSRangeSkin();
      return;
    }

    var STYLE_ID = 'classroomos-range-style';
    var LEGACY_STYLE_ID = 'classroomos-kawaii-range-style';
    var RANGE_SELECTOR = 'input[type="range"]';
    var RANGE_CLASS = 'cos-range';
    var LEGACY_RANGE_CLASS = 'cos-kawaii-range';

    function injectStyle() {
      var legacy = document.getElementById(LEGACY_STYLE_ID);
      if (legacy) legacy.remove();
      if (window.__classroomosKawaiiRangeObserver) {
        window.__classroomosKawaiiRangeObserver.disconnect();
        window.__classroomosKawaiiRangeObserver = null;
      }
      if (document.getElementById(STYLE_ID)) return;

      var style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent =
        'input[type="range"].' + RANGE_CLASS + '{' +
          '--cos-range-accent:#0071e3;' +
          '--cos-range-progress:0%;' +
          '--cos-range-track:rgba(125,136,154,0.24);' +
          '--cos-range-track-border:rgba(125,136,154,0.28);' +
          '--cos-range-thumb-surface:var(--surface-elevated,var(--white,#fff));' +
          'appearance:none;-webkit-appearance:none;accent-color:var(--cos-range-accent);' +
          'display:block;width:100%;max-width:100%;min-width:0;height:28px;padding:0;border:0;background:transparent;' +
          'border-radius:999px;cursor:pointer;color:var(--cos-range-accent);touch-action:pan-y;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':focus{outline:none;}' +
        'input[type="range"].' + RANGE_CLASS + ':focus-visible{' +
          'outline:2px solid var(--focus-ring,rgba(0,113,227,0.34));outline-offset:3px;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-webkit-slider-runnable-track{' +
          'height:8px;border:1px solid var(--cos-range-track-border);border-radius:999px;' +
          'background:linear-gradient(90deg,var(--cos-range-accent) 0 var(--cos-range-progress),var(--cos-range-track) var(--cos-range-progress) 100%);' +
          'box-shadow:inset 0 1px 1px rgba(15,23,42,0.08);' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-webkit-slider-thumb{' +
          '-webkit-appearance:none;appearance:none;width:20px;height:20px;margin-top:-7px;border-radius:50%;' +
          'border:3px solid var(--cos-range-thumb-surface);' +
          'background:linear-gradient(180deg,color-mix(in srgb,var(--cos-range-accent) 72%,#fff),var(--cos-range-accent));' +
          'box-shadow:0 2px 7px rgba(15,23,42,0.22),0 0 0 1px color-mix(in srgb,var(--cos-range-accent) 40%,#1d1d1f);' +
          'transition:transform 120ms ease,box-shadow 120ms ease;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':hover::-webkit-slider-thumb,' +
        'input[type="range"].' + RANGE_CLASS + ':focus-visible::-webkit-slider-thumb{' +
          'transform:scale(1.08);box-shadow:0 3px 10px rgba(15,23,42,0.26),0 0 0 4px color-mix(in srgb,var(--cos-range-accent) 16%,transparent);' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':active::-webkit-slider-thumb{transform:scale(0.96);}' +
        'input[type="range"].' + RANGE_CLASS + '::-moz-range-track{' +
          'height:8px;border:1px solid var(--cos-range-track-border);border-radius:999px;' +
          'background:var(--cos-range-track);box-shadow:inset 0 1px 1px rgba(15,23,42,0.08);' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-moz-range-progress{' +
          'height:8px;border-radius:999px;background:var(--cos-range-accent);' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + '::-moz-range-thumb{' +
          'appearance:none;width:20px;height:20px;border-radius:50%;border:3px solid var(--cos-range-thumb-surface);' +
          'background:linear-gradient(180deg,color-mix(in srgb,var(--cos-range-accent) 72%,#fff),var(--cos-range-accent));' +
          'box-shadow:0 2px 7px rgba(15,23,42,0.22),0 0 0 1px color-mix(in srgb,var(--cos-range-accent) 40%,#1d1d1f);' +
          'transition:transform 120ms ease,box-shadow 120ms ease;' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':hover::-moz-range-thumb,' +
        'input[type="range"].' + RANGE_CLASS + ':focus-visible::-moz-range-thumb{' +
          'transform:scale(1.08);box-shadow:0 3px 10px rgba(15,23,42,0.26),0 0 0 4px color-mix(in srgb,var(--cos-range-accent) 16%,transparent);' +
        '}' +
        'input[type="range"].' + RANGE_CLASS + ':disabled{' +
          'cursor:not-allowed;opacity:0.52;filter:saturate(0.6);' +
        '}' +
        '[data-lighting="night"] input[type="range"].' + RANGE_CLASS + ',' +
        '[data-theme="night"] input[type="range"].' + RANGE_CLASS + '{' +
          '--cos-range-track:rgba(155,168,190,0.22);' +
          '--cos-range-track-border:rgba(155,168,190,0.25);' +
        '}' +
        '@media (prefers-reduced-motion:reduce){' +
          'input[type="range"].' + RANGE_CLASS + '::-webkit-slider-thumb,' +
          'input[type="range"].' + RANGE_CLASS + '::-moz-range-thumb{transition:none;}' +
        '}';
      document.head.appendChild(style);
    }

    function getInlineAccent(slider) {
      var explicit = slider.getAttribute('data-range-accent');
      var inlineAccent = slider.style.getPropertyValue('accent-color') || slider.style.accentColor;
      var inlineColor = slider.style.getPropertyValue('color') || slider.style.color;

      if (explicit) return explicit;
      if (inlineAccent && inlineAccent !== 'auto') {
        return inlineAccent.toLowerCase() === 'currentcolor' && inlineColor ? inlineColor : inlineAccent;
      }
      return inlineColor || '';
    }

    function isVerticalRange(slider) {
      var writingMode = '';
      if (window.getComputedStyle) {
        writingMode = window.getComputedStyle(slider).writingMode || '';
      }
      return slider.getAttribute('orient') === 'vertical' || writingMode.indexOf('vertical') === 0;
    }

    function syncSlider(slider) {
      if (!slider || slider.dataset.rangeSkin === 'native') return;

      slider.classList.remove(LEGACY_RANGE_CLASS);
      if (isVerticalRange(slider)) {
        slider.classList.remove(RANGE_CLASS);
        slider.style.removeProperty('--base');
        slider.style.removeProperty('--light');
        slider.style.removeProperty('--lighter');
        slider.style.removeProperty('--dark');
        slider.style.removeProperty('--transparent');
        slider.style.removeProperty('--cos-range-progress');
        return;
      }

      slider.classList.add(RANGE_CLASS);

      slider.style.removeProperty('--base');
      slider.style.removeProperty('--light');
      slider.style.removeProperty('--lighter');
      slider.style.removeProperty('--dark');
      slider.style.removeProperty('--transparent');

      var accent = getInlineAccent(slider);
      if (accent) slider.style.setProperty('--cos-range-accent', accent);

      var min = parseFloat(slider.min);
      var max = parseFloat(slider.max);
      var value = parseFloat(slider.value);
      if (!isFinite(min)) min = 0;
      if (!isFinite(max)) max = 100;
      if (!isFinite(value)) value = min;

      var percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
      percent = Math.max(0, Math.min(100, percent));
      slider.style.setProperty('--cos-range-progress', percent.toFixed(3) + '%');

      if (!slider.dataset.cosRangeBound) {
        slider.dataset.cosRangeBound = 'true';
        slider.addEventListener('input', function () { syncSlider(slider); });
        slider.addEventListener('change', function () { syncSlider(slider); });
      }
    }

    function applyToRoot(root) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll(RANGE_SELECTOR).forEach(syncSlider);
      if (root.matches && root.matches(RANGE_SELECTOR)) {
        syncSlider(root);
      }
    }

    window.ClassroomOSRangeSkin = function () {
      injectStyle();
      applyToRoot(document);
    };
    window.ClassroomOSKawaiiRangeSkin = window.ClassroomOSRangeSkin;

    window.ClassroomOSRangeSkin();

    if (!window.__classroomosRangeObserver) {
      window.__classroomosRangeObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node && node.nodeType === 1) applyToRoot(node);
          });
          if (mutation.type === 'attributes' && mutation.target && mutation.target.matches && mutation.target.matches(RANGE_SELECTOR)) {
            syncSlider(mutation.target);
          }
        });
      });

      window.__classroomosRangeObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['value', 'min', 'max', 'data-range-accent']
      });
    }

    window.addEventListener('classroomos:lightingchange', function () {
      applyToRoot(document);
    });
  }

  ensureClassroomRangeSkin();

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
    panel.setAttribute('aria-hidden', 'true');

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
            // Crossfade in if ClassroomAnimations available
            if (window.ClassroomAnimations) {
              target.style.opacity = '0';
              window.ClassroomAnimations.animate(
                'll-tab-fade',
                function (eased) { target.style.opacity = eased; },
                180,
                'easeOutQuad',
                function () { target.style.opacity = ''; }
              );
            }
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

    // Animate panel slide if ClassroomAnimations is available
    if (window.ClassroomAnimations) {
      var isMobile = window.innerWidth <= 680;
      if (isMobile) {
        // Mobile: slide up from bottom
        panel.style.transition = 'none';
        window.ClassroomAnimations.animate(
          'll-panel-toggle',
          function (eased) {
            var from = open ? 100 : 0;
            var to   = open ? 0   : 100;
            panel.style.transform = 'translateY(' + (from + (to - from) * eased) + '%)';
          },
          260,
          'easeOutQuad',
          function () { if (!open) panel.style.transform = ''; }
        );
      } else {
        // Desktop: slide in from right
        panel.style.transition = 'none';
        window.ClassroomAnimations.animate(
          'll-panel-toggle',
          function (eased) {
            var from = open ? 100 : 0;
            var to   = open ? 0   : 100;
            panel.style.transform = 'translateX(' + (from + (to - from) * eased) + '%)';
            panel.style.opacity   = open ? eased : 1 - eased;
          },
          240,
          'easeOutQuad',
          function () {
            panel.style.transform = '';
            panel.style.opacity   = '';
          }
        );
      }
    }

    panel.dispatchEvent(new CustomEvent('ll:panel', {
      detail: { open: open },
      bubbles: true
    }));
  }

  function initPanel() {
    /* Always start collapsed — panel opens on user demand */
    document.querySelectorAll('.ll-panel').forEach(function (panel) {
      panel.setAttribute('aria-hidden', 'true');
    });

    document.querySelectorAll('.ll-panel').forEach(function (panel) {
      setPanelInteractivity(panel, false);
    });

    /* Ensure every panel has a close button (static HTML panels may not) */
    document.querySelectorAll('.ll-panel').forEach(function (panel) {
      if (panel.querySelector('.ll-panel-close')) return;
      var inner = panel.querySelector('.ll-panel-inner') || panel;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'll-panel-close';
      btn.setAttribute('aria-label', 'Collapse panel');
      btn.innerHTML = '&times;';
      inner.insertBefore(btn, inner.firstChild);
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
      if (!el) return;

      // Animate numeric transitions if ClassroomAnimations is available
      if (window.ClassroomAnimations && typeof value === 'number') {
        var fromStr = el.dataset.readoutLast != null ? el.dataset.readoutLast : el.textContent;
        var from = parseFloat(fromStr) || 0;
        var to = value;
        var decimals = String(value).includes('.') ? String(value).split('.')[1].length : 0;
        el.dataset.readoutLast = value;
        window.ClassroomAnimations.animate(
          'll-readout-' + id,
          function (eased) {
            var current = from + (to - from) * eased;
            el.textContent = unit != null ? current.toFixed(decimals) + unit : current.toFixed(decimals);
          },
          250,
          'easeOutQuad',
          function () {
            el.textContent = unit != null ? value + unit : String(value);
          }
        );
      } else {
        el.textContent = unit != null ? value + unit : String(value);
      }
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
    ensureCanvasBackgroundEngine();
  }

  function ensureCanvasBackgroundEngine() {
    if (window.ClassroomOSCanvasBg || document.querySelector('script[data-classroomos-canvas-bg="true"]')) return;

    var src = '../assets/js/canvas-bg.js';
    var layoutScript = Array.prototype.slice.call(document.scripts).find(function (script) {
      return /(^|\/)lesson-layout\.js(?:[?#].*)?$/.test(script.getAttribute('src') || script.src || '');
    });

    if (layoutScript) {
      src = (layoutScript.getAttribute('src') || layoutScript.src).replace(/lesson-layout\.js(?:[?#].*)?$/, 'canvas-bg.js');
    }

    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.classroomosCanvasBg = 'true';
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}(window));
