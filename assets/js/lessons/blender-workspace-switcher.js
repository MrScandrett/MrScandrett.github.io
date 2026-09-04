/* Floating quick-switch menu between Blender's workspace tabs, shared across
   every Blender lesson page so students can jump Layout <-> Sculpting <->
   UV Editing (etc.) without walking back through the pathway hub. */
(function () {
  var TABS = [
    { label: "Layout", color: "#e8792a", href: "blender-interface-basics.html" },
    { label: "Modeling", color: "#b5793f", href: "blender-furniture-design.html" },
    { label: "Sculpting", color: "#8a5fb0", href: "blender-sculpting.html" },
    { label: "UV Editing", color: "#3f8f8f", href: "game-asset-uv-export.html" },
    { label: "Texture Paint", color: "#b0567a", href: "blender-materials-render.html#paint" },
    { label: "Shading", color: "#c98a2c", href: "blender-materials-render.html" },
    { label: "Animation", color: "#a8586f", href: "game-asset-character-animation.html" },
    { label: "Rendering", color: "#c98a2c", href: "blender-materials-render.html#render" },
    { label: "Compositing", color: "#4f8fc0", href: "blender-compositing.html" },
    { label: "Geometry Nodes", color: "#5c8f6b", href: "blender-geometry-nodes.html" },
    { label: "Scripting", color: "#8a8a8a", href: null }
  ];

  function currentFile() {
    return (location.pathname.split("/").pop() || "").toLowerCase();
  }

  function buildItem(tab, here) {
    var isCurrent = tab.href && tab.href.split("#")[0].toLowerCase() === here;
    var tag = tab.href ? "a" : "span";
    var el = document.createElement(tag);
    el.className = "blwsq-item" + (isCurrent ? " is-current" : "") + (tab.href ? "" : " is-soon");
    el.style.setProperty("--blwsq-color", tab.color);
    if (tab.href) el.setAttribute("href", tab.href);
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
    if (document.querySelector('link[data-blwsq-style]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../assets/css/lessons/blender-workspace-switcher.css";
    link.setAttribute("data-blwsq-style", "");
    document.head.appendChild(link);
  }

  function init() {
    if (document.querySelector(".blwsq-fab")) return;
    ensureStyles();
    var here = currentFile();

    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "blwsq-fab";
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
