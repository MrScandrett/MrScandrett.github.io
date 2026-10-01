/**
 * class-downloads.js — catalog + filters for class-downloads.html.
 *
 * To add a download: append an entry to classData. `type` decides the section
 * (starter / software / template / guide), `priority: true` puts it under
 * "Start here", and `platforms` drives the device filter ("Web" matches every device).
 * Local files live in downloads/ and get their size from a HEAD request.
 */
(function () {
  "use strict";

  const classData = [
    {
      id: "project-starter-pack",
      title: "Project Development Starter Pack",
      description: "Ready-to-code HTML, CSS, and JavaScript files already linked together. Unzip, open in VS Code, and start building.",
      type: "starter",
      category: "Coding",
      priority: true,
      tags: ["starter", "html", "css", "javascript", "web", "publishing"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "PK",
      actionLabel: "Download Starter Pack",
      url: "downloads/project-starter-pack.zip"
    },
    {
      id: "browser-game-builder-starter-pack",
      title: "Browser Game Builder — Guided Starter Pack",
      description: "A complete canvas game with a README-FIRST tutorial, deeply commented code, checkpoints, graduated challenges, troubleshooting, and a finished core reference.",
      type: "starter",
      category: "Coding",
      priority: true,
      tags: ["guided", "canvas", "game development", "html", "css", "javascript"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "BG",
      actionLabel: "Download Browser Game Pack",
      url: "downloads/browser-game-builder-starter-pack.zip"
    },
    {
      id: "pygame-arcade-starter-pack",
      title: "Pygame Arcade — Guided Starter Pack",
      description: "A runnable catch game with commented Python, setup help, checkpoints, challenges, troubleshooting, and a finished lives-and-difficulty reference.",
      type: "starter",
      category: "Coding",
      priority: true,
      tags: ["guided", "python", "pygame", "game loop", "collision"],
      platforms: ["Windows", "Mac"],
      icon: "PY",
      actionLabel: "Download Pygame Pack",
      url: "downloads/pygame-arcade-starter-pack.zip"
    },
    {
      id: "creative-coding-demoscene-starter-pack",
      title: "Creative Coding + Demoscene — Guided Starter Pack",
      description: "Three interactive generative scenes connecting color theory, sine waves, smooth noise, time, composition, and PNG export.",
      type: "starter",
      category: "Creative Coding",
      priority: true,
      tags: ["guided", "generative art", "demoscene", "noise", "fourier", "canvas"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "CC",
      actionLabel: "Download Creative Coding Pack",
      url: "downloads/creative-coding-demoscene-starter-pack.zip"
    },
    {
      id: "godot-adventure-starter-pack",
      title: "Godot Adventure — Guided Starter Pack",
      description: "A dependency-free Godot 4 collection game with player, camera, signals, HUD, win state, guided architecture tutorial, and extension path.",
      type: "starter",
      category: "Game Development",
      priority: true,
      tags: ["guided", "godot", "gdscript", "3d", "signals", "game development"],
      platforms: ["Windows", "Mac"],
      icon: "G4",
      actionLabel: "Download Godot Adventure Pack",
      url: "downloads/godot-adventure-starter-pack.zip"
    },
    {
      id: "kaplay-starter-pack",
      title: "Kaplay 2D Game Starter Pack",
      description: "Minimal 2D game project pre-configured with KAPLAY (formerly Kaboom.js). Includes player movement, custom shapes, and platform physics template.",
      type: "starter",
      category: "Coding",
      priority: true,
      tags: ["starter", "kaplay", "game development", "2d", "javascript", "html"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "KP",
      actionLabel: "Download Kaplay Starter",
      url: "downloads/kaplay-starter-pack.zip"
    },
    {
      id: "phaser-starter-pack",
      title: "Phaser 3 Game Starter Pack",
      description: "Minimal 2D game project pre-configured with Phaser 3. Includes basic platforms setup, keyboard controls, and arcade physics.",
      type: "starter",
      category: "Coding",
      priority: false,
      tags: ["starter", "phaser", "game development", "2d", "javascript", "html"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "PH",
      actionLabel: "Download Phaser Starter",
      url: "downloads/phaser-starter-pack.zip"
    },
    {
      id: "web-foundations-starter-pack",
      title: "Web Foundations — Guided Starter Pack",
      description: "A two-page personal website matching the first five Build Your Own Web lessons: commented HTML, CSS and a working project search, with a README-FIRST tutorial, challenges, troubleshooting and a finished reference.",
      type: "starter",
      category: "Coding",
      priority: true,
      tags: ["guided", "html", "css", "javascript", "web design", "beginner"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "WF",
      actionLabel: "Download Web Foundations Pack",
      url: "downloads/web-foundations-starter-pack.zip"
    },
    {
      id: "web-portfolio-starter-pack",
      title: "Web Portfolio Starter Pack",
      description: "A filterable portfolio site for showing your own games, simulations and art, with a case-study page and a tutorial that walks you through replacing every placeholder.",
      type: "starter",
      category: "Coding",
      priority: true,
      tags: ["guided", "portfolio", "html", "css", "javascript", "web design"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "WP",
      actionLabel: "Download Portfolio Pack",
      url: "downloads/web-portfolio-starter-pack.zip"
    },
    {
      id: "web-business-starter-pack",
      title: "Business Website Starter Pack",
      description: "A fictional local-service website with services, opening information and a validating contact form that previews the message locally and explains what a real deployed form would require.",
      type: "starter",
      category: "Coding",
      priority: false,
      tags: ["guided", "business", "forms", "html", "css", "javascript"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "WB",
      actionLabel: "Download Business Site Pack",
      url: "downloads/web-business-starter-pack.zip"
    },
    {
      id: "web-store-starter-pack",
      title: "Practice Storefront Starter Pack",
      description: "A classroom storefront prototype: product data, a working cart with quantities and a total calculated in integer cents. No payments — the README explains exactly what a real store would need.",
      type: "starter",
      category: "Coding",
      priority: false,
      tags: ["guided", "storefront", "cart", "data", "javascript", "web design"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "WS",
      actionLabel: "Download Store Pack",
      url: "downloads/web-store-starter-pack.zip"
    },
    {
      id: "web-wiki-starter-pack",
      title: "Small Wiki Starter Pack",
      description: "A static wiki with an article index, searchable articles and related links, plus an honest explanation of what shared editing, accounts and revision history would require.",
      type: "starter",
      category: "Coding",
      priority: false,
      tags: ["guided", "wiki", "search", "articles", "html", "javascript"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "WK",
      actionLabel: "Download Wiki Pack",
      url: "downloads/web-wiki-starter-pack.zip"
    },
    {
      id: "web-creation-hub-starter-pack",
      title: "Creation Hub Starter Pack",
      description: "A catalog that gives your games and simulations a home, shipping with a playable keyboard canvas game and a controllable physics simulation you can duplicate and make your own.",
      type: "starter",
      category: "Coding",
      priority: true,
      tags: ["guided", "canvas", "game development", "simulation", "javascript", "portfolio"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "CH",
      actionLabel: "Download Creation Hub Pack",
      url: "downloads/web-creation-hub-starter-pack.zip"
    },
    {
      id: "webxr-gallery-starter-pack",
      title: "WebXR Gallery Starter Pack",
      description: "An offline-friendly gallery pack: a fully accessible exhibit list plus a 2D room-plan preview you can edit, with an honest guide to what real WebXR requires.",
      type: "starter",
      category: "Coding",
      priority: false,
      tags: ["guided", "webxr", "vr", "3d", "gallery", "accessibility"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "XR",
      actionLabel: "Download WebXR Gallery Pack",
      url: "downloads/webxr-gallery-starter-pack.zip"
    },
    {
      id: "arduino-starter-sketches",
      title: "Arduino Starter Sketches Pack",
      description: "Essential boilerplate code templates for electronics, robot sensors, and motor controls (non-blocking Blink, analog reading, servo sweeps).",
      type: "starter",
      category: "Electronics",
      priority: false,
      tags: ["starter", "arduino", "robotics", "sensors", "circuits", "c++"],
      platforms: ["Windows", "Mac", "Chromebook", "Web"],
      icon: "AD",
      actionLabel: "Download Arduino Pack",
      url: "downloads/arduino-starter-sketches.zip"
    },
    {
      id: "vr-demo-master",
      title: "VR Demo - Godot 4 Starter Project",
      description: "Ready-to-run Godot 4 VR project with scene, scripts, materials, and OpenXR setup included.",
      type: "starter",
      category: "VR Setup",
      priority: true,
      tags: ["starter", "godot", "vr", "openxr", "gdscript", "quest"],
      platforms: ["Windows", "Mac"],
      icon: "VR",
      actionLabel: "Download VR Template",
      url: "https://github.com/MrScandrett/MrScandrett.github.io/releases/download/downloads-v1/vr-demo-master.zip"
    },
    {
      id: "publish-tutorial",
      title: "GitHub Pages Publishing Guide",
      description: "Step-by-step classroom guide for editing a project folder and publishing it on GitHub Pages.",
      type: "guide",
      category: "Coding",
      priority: true,
      tags: ["guide", "github", "pages", "publishing", "html", "css"],
      platforms: ["Chromebook", "Web", "Windows", "Mac"],
      icon: "GH",
      actionLabel: "Open Guide",
      url: "tutorial/index.html"
    },
    {
      id: "godot-461-windows",
      title: "Godot 4.6.1 for Windows",
      description: "Official Godot editor download for opening the VR starter project on Windows classroom machines.",
      type: "software",
      category: "VR Setup",
      priority: false,
      tags: ["godot", "engine", "vr", "openxr", "game development"],
      platforms: ["Windows"],
      icon: "G4",
      actionLabel: "Download Windows Build",
      url: "https://github.com/godotengine/godot/releases/download/4.6.1-stable/Godot_v4.6.1-stable_win64.exe.zip"
    },
    {
      id: "godot-461-mac",
      title: "Godot 4.6.1 for Mac",
      description: "Official Godot editor download for opening the VR starter project on macOS.",
      type: "software",
      category: "VR Setup",
      priority: false,
      tags: ["godot", "engine", "vr", "openxr", "game development"],
      platforms: ["Mac"],
      icon: "G4",
      actionLabel: "Download Mac Build",
      url: "https://github.com/godotengine/godot/releases/download/4.6.1-stable/Godot_v4.6.1-stable_macos.universal.zip"
    },
    {
      id: "godot-export-templates",
      title: "Godot Export Templates",
      description: "Install these when you are ready to package a playable Godot build instead of only editing the project.",
      type: "template",
      category: "VR Setup",
      priority: false,
      tags: ["godot", "export", "template", "build", "game development"],
      platforms: ["Windows", "Mac"],
      icon: "EX",
      actionLabel: "Download Templates",
      url: "https://github.com/godotengine/godot/releases/download/4.6.1-stable/Godot_v4.6.1-stable_export_templates.tpz"
    },
    {
      id: "vscode",
      title: "Visual Studio Code",
      description: "Flexible code editor for HTML, CSS, JavaScript, Python, and project folders used across class.",
      type: "software",
      category: "Coding",
      priority: false,
      tags: ["vscode", "editor", "html", "css", "javascript", "python"],
      platforms: ["Windows", "Mac", "Web"],
      icon: "VS",
      actionLabel: "Open Download Page",
      url: "https://code.visualstudio.com/download"
    },
    {
      id: "arduino-ide",
      title: "Arduino IDE",
      description: "Programming environment for microcontrollers, robotics, sensors, and electronics builds.",
      type: "software",
      category: "Electronics",
      priority: false,
      tags: ["arduino", "robotics", "microcontroller", "sensors", "circuits"],
      platforms: ["Windows", "Mac", "Web"],
      icon: "AR",
      actionLabel: "Open Download Page",
      url: "https://www.arduino.cc/en/software"
    },
    {
      id: "obs-studio",
      title: "OBS Studio",
      description: "Screen recording and capture software for demos, tutorials, walkthroughs, and portfolio videos.",
      type: "software",
      category: "Media",
      priority: false,
      tags: ["obs", "recording", "video", "presentation", "showcase"],
      platforms: ["Windows", "Mac"],
      icon: "OB",
      actionLabel: "Open Download Page",
      url: "https://obsproject.com/download"
    },
    {
      id: "blender",
      title: "Blender",
      description: "Free 3D modeling and animation software for scenes, rendering, and game assets.",
      type: "software",
      category: "3D CAD",
      priority: false,
      tags: ["blender", "3d", "modeling", "animation", "assets"],
      platforms: ["Windows", "Mac"],
      icon: "BL",
      actionLabel: "Open Download Page",
      url: "https://www.blender.org/download/"
    },
    {
      id: "tinkercad",
      title: "Tinkercad Classroom CAD",
      description: "Browser-based CAD workspace for quick parts, prototypes, classroom 3D design, and circuits practice.",
      type: "software",
      category: "3D CAD",
      priority: false,
      tags: ["tinkercad", "cad", "3d", "circuits", "browser"],
      platforms: ["Chromebook", "Web", "Windows", "Mac"],
      icon: "TC",
      actionLabel: "Open Tinkercad",
      url: "https://www.tinkercad.com/"
    },
    {
      id: "scratch-desktop",
      title: "Scratch Desktop",
      description: "Offline block coding tool for beginner programmers, quick prototypes, and entry-level STEAM projects.",
      type: "software",
      category: "Coding",
      priority: false,
      tags: ["scratch", "blocks", "games", "starter", "coding basics"],
      platforms: ["Windows", "Mac", "Web"],
      icon: "SC",
      actionLabel: "Open Download Page",
      url: "https://scratch.mit.edu/download"
    }
  ];

  var SECTIONS = [
    { id: "starter", title: "Starter packs", blurb: "Unzip, open the folder, and start building. Guided packs include a README-FIRST tutorial, checkpoints, and challenges.", types: ["starter"] },
    { id: "software", title: "Software & tools", blurb: "Free programs we use in class. Links open the official download page.", types: ["software", "template"] },
    { id: "guide", title: "Guides", blurb: "Step-by-step walkthroughs you can follow at your own pace.", types: ["guide"] }
  ];

  var DEVICES = ["Any", "Chromebook", "Windows", "Mac"];
  var PRIORITY = "Start here";
  var DEVICE_KEY = "classDownloads.device";

  var state = { query: "", category: "All", device: "Any" };

  var searchInput = document.getElementById("dl-search");
  var deviceWrap = document.getElementById("dl-device-options");
  var chipWrap = document.getElementById("dl-categories");
  var statusEl = document.getElementById("dl-status");
  var clearBtn = document.getElementById("dl-clear");
  var results = document.getElementById("dl-results");
  var toast = document.getElementById("dl-toast");
  var sizeCache = {};

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function isExternal(url) {
    return /^https?:\/\//i.test(url);
  }

  function isFile(item) {
    return !isExternal(item.url) && item.url.indexOf("downloads/") === 0;
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }

  function categoryKey(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  function matches(item) {
    if (state.category === PRIORITY && !item.priority) return false;
    if (state.category !== "All" && state.category !== PRIORITY && item.category !== state.category) return false;
    if (state.device !== "Any" && item.platforms.indexOf(state.device) === -1 && item.platforms.indexOf("Web") === -1) return false;
    if (!state.query) return true;
    var haystack = [item.title, item.description, item.type, item.category, item.platforms.join(" "), item.tags.join(" ")].join(" ").toLowerCase();
    return state.query.split(/\s+/).every(function (word) { return haystack.indexOf(word) !== -1; });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function fillSize(item, slot) {
    if (sizeCache[item.url]) { slot.textContent = sizeCache[item.url]; return; }
    if (!window.fetch || location.protocol === "file:") return;
    fetch(item.url, { method: "HEAD" }).then(function (res) {
      var length = Number(res.headers.get("content-length"));
      if (!res.ok || !length) return;
      sizeCache[item.url] = "ZIP · " + formatSize(length);
      slot.textContent = sizeCache[item.url];
    }).catch(function () {});
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.classList.remove("is-visible"); }, 1800);
  }

  function copyLink(item) {
    var url = new URL(item.url, location.href).href;
    var done = function () { showToast("Link copied — paste it anywhere."); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt("Copy this link:", url); });
    } else {
      window.prompt("Copy this link:", url);
    }
  }

  function renderCard(item) {
    var card = el("article", "dl-card");
    card.id = "dl-item-" + item.id;
    card.dataset.cat = categoryKey(item.category);
    if (item.priority) card.dataset.priority = "true";

    var head = el("div", "dl-card-head");
    var icon = el("span", "dl-card-icon", item.icon);
    icon.setAttribute("aria-hidden", "true");
    var heading = el("div", "dl-card-heading");
    var meta = el("p", "dl-card-meta", item.category);
    if (item.priority) meta.appendChild(el("span", "dl-flag", PRIORITY));
    heading.appendChild(meta);
    heading.appendChild(el("h3", "dl-card-title", item.title));
    head.appendChild(icon);
    head.appendChild(heading);

    var desc = el("p", "dl-card-desc", item.description);

    var platforms = el("ul", "dl-platforms");
    platforms.setAttribute("aria-label", "Works on");
    item.platforms.forEach(function (p) {
      var li = el("li", "dl-platform", p);
      if (state.device !== "Any" && (p === state.device || (p === "Web" && item.platforms.indexOf(state.device) === -1))) li.classList.add("is-match");
      platforms.appendChild(li);
    });

    var foot = el("div", "dl-card-foot");
    var action = el("a", "dl-action");
    action.href = item.url;
    action.appendChild(el("span", "", item.actionLabel));
    if (isFile(item)) {
      action.setAttribute("download", "");
    } else if (isExternal(item.url)) {
      action.target = "_blank";
      action.rel = "noreferrer noopener";
      action.appendChild(el("span", "dl-sr", " (opens in a new tab)"));
    }
    var arrow = el("span", "dl-action-arrow", isFile(item) ? "↓" : "↗");
    arrow.setAttribute("aria-hidden", "true");
    action.appendChild(arrow);

    var info = el("span", "dl-card-info");
    if (isFile(item)) {
      info.textContent = "ZIP";
      fillSize(item, info);
    } else if (isExternal(item.url)) {
      info.textContent = hostOf(item.url);
    } else {
      info.textContent = "On this site";
    }

    var copy = el("button", "dl-copy");
    copy.type = "button";
    copy.setAttribute("aria-label", "Copy link to " + item.title);
    copy.title = "Copy link";
    copy.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    copy.addEventListener("click", function () { copyLink(item); });

    foot.appendChild(action);
    foot.appendChild(copy);

    card.appendChild(head);
    card.appendChild(desc);
    card.appendChild(platforms);
    card.appendChild(info);
    card.appendChild(foot);
    return card;
  }

  function sortItems(a, b) {
    return Number(!!b.priority) - Number(!!a.priority) || a.title.localeCompare(b.title);
  }

  function renderResults() {
    var visible = classData.filter(matches);
    results.innerHTML = "";

    if (!visible.length) {
      var empty = el("div", "dl-empty");
      empty.appendChild(el("strong", "", "Nothing matches that yet."));
      empty.appendChild(el("p", "", "Try a shorter word, switch your device to “Any”, or clear the filters."));
      var reset = el("button", "dl-clear", "Clear filters");
      reset.type = "button";
      reset.addEventListener("click", clearFilters);
      empty.appendChild(reset);
      results.appendChild(empty);
    }

    SECTIONS.forEach(function (section) {
      var items = visible.filter(function (item) { return section.types.indexOf(item.type) !== -1; }).sort(sortItems);
      if (!items.length) return;
      var wrap = el("section", "dl-section");
      wrap.setAttribute("aria-labelledby", "dl-sec-" + section.id);
      var head = el("div", "dl-section-head");
      var h2 = el("h2", "dl-section-title", section.title);
      h2.id = "dl-sec-" + section.id;
      h2.appendChild(el("span", "dl-section-count", String(items.length)));
      head.appendChild(h2);
      head.appendChild(el("p", "dl-section-blurb", section.blurb));
      var grid = el("div", "dl-grid");
      items.forEach(function (item) { grid.appendChild(renderCard(item)); });
      wrap.appendChild(head);
      wrap.appendChild(grid);
      results.appendChild(wrap);
    });

    var filtered = state.query || state.category !== "All" || state.device !== "Any";
    clearBtn.hidden = !filtered;
    statusEl.textContent = filtered
      ? "Showing " + visible.length + " of " + classData.length + " downloads"
      : classData.length + " downloads";
  }

  function renderChips() {
    var counts = {};
    classData.forEach(function (item) { counts[item.category] = (counts[item.category] || 0) + 1; });
    var cats = ["All", PRIORITY].concat(Object.keys(counts).sort());
    chipWrap.innerHTML = "";
    cats.forEach(function (cat) {
      var btn = el("button", "dl-chip");
      btn.type = "button";
      if (cat === PRIORITY) btn.classList.add("dl-chip--priority");
      btn.setAttribute("aria-pressed", String(state.category === cat));
      btn.appendChild(el("span", "", cat));
      var n = cat === "All" ? classData.length : cat === PRIORITY ? classData.filter(function (i) { return i.priority; }).length : counts[cat];
      btn.appendChild(el("small", "", String(n)));
      btn.addEventListener("click", function () {
        state.category = state.category === cat && cat !== "All" ? "All" : cat;
        update();
      });
      chipWrap.appendChild(btn);
    });
  }

  function renderDevices() {
    deviceWrap.innerHTML = "";
    DEVICES.forEach(function (device) {
      var label = el("label", "dl-device-option");
      var input = el("input");
      input.type = "radio";
      input.name = "dl-device";
      input.value = device;
      input.checked = state.device === device;
      input.addEventListener("change", function () {
        state.device = device;
        try { localStorage.setItem(DEVICE_KEY, device); } catch (e) {}
        update();
      });
      label.appendChild(input);
      label.appendChild(el("span", "", device === "Any" ? "Any device" : device));
      deviceWrap.appendChild(label);
    });
  }

  function syncUrl() {
    var params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    if (state.category !== "All") params.set("cat", state.category);
    if (state.device !== "Any") params.set("device", state.device);
    var qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  function readUrl() {
    var params = new URLSearchParams(location.search);
    var stored = null;
    try { stored = localStorage.getItem(DEVICE_KEY); } catch (e) {}
    var device = params.get("device") || stored;
    if (DEVICES.indexOf(device) !== -1) state.device = device;
    var cat = params.get("cat");
    if (cat && (cat === PRIORITY || classData.some(function (i) { return i.category === cat; }))) state.category = cat;
    state.query = (params.get("q") || "").trim().toLowerCase();
    searchInput.value = state.query;
  }

  function update() {
    renderChips();
    renderResults();
    syncUrl();
  }

  function clearFilters() {
    state.query = "";
    state.category = "All";
    state.device = "Any";
    searchInput.value = "";
    try { localStorage.removeItem(DEVICE_KEY); } catch (e) {}
    renderDevices();
    update();
    searchInput.focus();
  }

  searchInput.addEventListener("input", function () {
    state.query = searchInput.value.trim().toLowerCase();
    renderResults();
    syncUrl();
  });

  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && searchInput.value) {
      searchInput.value = "";
      state.query = "";
      renderResults();
      syncUrl();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
    var t = event.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    event.preventDefault();
    searchInput.focus();
  });

  clearBtn.addEventListener("click", clearFilters);

  readUrl();
  renderDevices();
  update();

  if (location.hash) {
    var target = document.querySelector(location.hash);
    if (target) {
      target.classList.add("is-highlighted");
      target.scrollIntoView({ block: "center" });
    }
  }
  window.addEventListener("hashchange", function () {
    var prev = document.querySelector(".dl-card.is-highlighted");
    if (prev) prev.classList.remove("is-highlighted");
    var target = location.hash && document.querySelector(location.hash);
    if (target && target.classList.contains("dl-card")) target.classList.add("is-highlighted");
  });
})();
