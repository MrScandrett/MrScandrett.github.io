/* Floating quick-switch menu between Blender's workspace tabs, shared across
   every Blender lesson page so students can jump Layout <-> Sculpting <->
   UV Editing (etc.) without walking back through the pathway hub. */
(function () {
  // Paths are relative to lessons/; resolved against this script's own URL so the
  // menu works from lessons/blender/ and lessons/game-asset-studio/ alike.
  var SCRIPT_URL = (document.currentScript && document.currentScript.src) || location.href;
  var LESSONS_ROOT = new URL("../../../lessons/", SCRIPT_URL);
  var TABS = [
    { label: "Layout", color: "#e8792a", href: "blender/blender-interface-basics.html" },
    { label: "Modeling", color: "#b5793f", href: "blender/blender-furniture-design.html" },
    { label: "Sculpting", color: "#8a5fb0", href: "blender/blender-sculpting.html" },
    { label: "UV Editing", color: "#3f8f8f", href: "game-asset-studio/game-asset-uv-export.html" },
    { label: "Texture Paint", color: "#b0567a", href: "blender/blender-materials-render.html#paint" },
    { label: "Shading", color: "#c98a2c", href: "blender/blender-materials-render.html" },
    { label: "Animation", color: "#a8586f", href: "game-asset-studio/game-asset-character-animation.html" },
    { label: "Rendering", color: "#c98a2c", href: "blender/blender-materials-render.html#render" },
    { label: "Compositing", color: "#4f8fc0", href: "blender/blender-compositing.html" },
    { label: "Geometry Nodes", color: "#5c8f6b", href: "blender/blender-geometry-nodes.html" },
    { label: "Scripting", color: "#8a8a8a", href: null }
  ];

  function resolve(href) {
    return new URL(href, LESSONS_ROOT);
  }

  function buildItem(tab, here) {
    var target = tab.href ? resolve(tab.href) : null;
    var isCurrent = !!target && target.pathname.toLowerCase() === here;
    var tag = tab.href ? "a" : "span";
    var el = document.createElement(tag);
    el.className = "blwsq-item" + (isCurrent ? " is-current" : "") + (tab.href ? "" : " is-soon");
    el.style.setProperty("--blwsq-color", tab.color);
    if (target) el.setAttribute("href", target.href);
    var dot = document.createElement("span");
    dot.className = "blwsq-dot";
    el.appendChild(dot);
    var text = document.createElement("span");
    text.textContent = tab.label;
    el.appendChild(text);
    if (isCurrent) {
      var tag2 = document.createElement("small");
      tag2.textContent = "here";
      el.appendChild(tag2);
    } else if (!tab.href) {
      var tag3 = document.createElement("small");
      tag3.textContent = "soon";
      el.appendChild(tag3);
    }
    return el;
  }

  function ensureStyles() {
    if (document.querySelector('link[data-blwsq-style], link[href*="blender-workspace-switcher.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("../../css/lessons/blender-workspace-switcher.css", SCRIPT_URL).href;
    link.setAttribute("data-blwsq-style", "");
    document.head.appendChild(link);
  }

  function init() {
    // Game Asset Studio pages are tool-neutral: show Blender's workspace menu only to
    // students who haven't deselected Blender in the Tool Rosetta app picker.
    if (/\/game-asset-studio\//.test(location.pathname)) {
      try {
        var picks = (JSON.parse(localStorage.getItem("classroomos:rosetta:v1")) || {}).model;
        if (picks && picks.length && picks.indexOf("blender") === -1) return;
      } catch (e) { /* storage blocked: keep the default */ }
    }
    if (document.querySelector(".blwsq-fab")) return;
    ensureStyles();
    var here = location.pathname.toLowerCase();

    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "blwsq-fab";
    // This component supplies tested colors for both button states. The global
    // guard cannot see through the pill's nested spans and otherwise forces
    // them to black against the dark closed state.
    fab.setAttribute("data-contrast-guard-skip", "");
    fab.setAttribute("aria-haspopup", "true");
    fab.setAttribute("aria-expanded", "false");
    fab.innerHTML = '<span class="blwsq-fab-icon">&#8646;</span><span>Workspaces</span>';

    var panel = document.createElement("div");
    panel.className = "blwsq-panel";
    panel.hidden = true;
    panel.setAttribute("role", "menu");
    panel.setAttribute("aria-label", "Blender workspace quick switch");

    var heading = document.createElement("p");
    heading.className = "blwsq-heading";
    heading.textContent = "Jump to a workspace";
    panel.appendChild(heading);

    var list = document.createElement("div");
    list.className = "blwsq-list";
    TABS.forEach(function (tab) {
      list.appendChild(buildItem(tab, here));
    });
    panel.appendChild(list);

    var wrap = document.createElement("div");
    wrap.className = "blwsq-wrap";
    wrap.appendChild(panel);
    wrap.appendChild(fab);
    document.body.appendChild(wrap);

    function open() {
      panel.hidden = false;
      fab.setAttribute("aria-expanded", "true");
      wrap.classList.add("is-open");
    }
    function close() {
      panel.hidden = true;
      fab.setAttribute("aria-expanded", "false");
      wrap.classList.remove("is-open");
    }
    fab.addEventListener("click", function () {
      if (panel.hidden) open(); else close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) { close(); fab.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
