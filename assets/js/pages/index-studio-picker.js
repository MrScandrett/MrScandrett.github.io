// Explore tab: the creation tool picker.
// index.html holds every tool as plain sections, which is what shows without this script. This adds
// the search box and the group list on top, and shows one group at a time. Groups and counts are read
// from the page, so they stay right when the dist build removes a local-only link.
// "Recent" reuses visitor memory's plays, so My Stuff can pause and clear it.
(function () {
  "use strict";

  var browser = document.getElementById("explore-browser");
  var form = document.getElementById("explore-search");
  var input = document.getElementById("explore-search-input");
  var status = document.getElementById("explore-status");
  var rail = document.getElementById("explore-rail");
  var picked = document.getElementById("explore-picked");
  var go = document.getElementById("explore-search-go");
  if (!browser || !form || !input || !status || !rail || !picked) return;

  var pickedIcon = document.getElementById("explore-picked-icon");
  var pickedTitle = document.getElementById("explore-picked-title");
  var pickedDesc = document.getElementById("explore-picked-desc");
  var pickedList = document.getElementById("explore-picked-list");
  var empty = document.getElementById("explore-empty");
  var emptyText = document.getElementById("explore-empty-text");
  var emptyClear = document.getElementById("explore-empty-clear");

  var GROUP_KEY = "classroomos:studio-group";
  var PLAY_PREFIX = "tool:";
  var RECENT_MAX = 9;

  var folders = Array.prototype.slice.call(browser.querySelectorAll(".explore-folder[data-category]"));
  var tools = [];
  var groups = [];
  var current = "main";
  var topResult = null;

  function text(root, selector) {
    var node = root.querySelector(selector);
    return node ? node.textContent.trim() : "";
  }

  function plural(count) {
    return count + (count === 1 ? " tool" : " tools");
  }

  function words(value) {
    return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  }

  folders.forEach(function (folder) {
    var items = Array.prototype.slice.call(folder.querySelectorAll(".explore-tools-grid > li"));
    items.forEach(function (item) {
      var link = item.querySelector(".explore-tool-link");
      var name = text(link, ".explore-tool-name");
      var description = text(link, ".explore-tool-desc");
      var tool = {
        item: item,
        link: link,
        href: link.getAttribute("href"),
        category: folder.dataset.category,
        name: name.toLowerCase(),
        nameWords: words(name),
        keywords: words(link.dataset.keywords || ""),
        otherWords: words(description + " " + text(link, ".explore-tool-needs") + " " + text(folder, ".explore-folder-title")),
        main: link.hasAttribute("data-tool-main"),
      };
      link.setAttribute("data-memory-play", "");
      link.setAttribute("data-memory-id", PLAY_PREFIX + tool.href);
      link.setAttribute("data-memory-title", name);
      tools.push(tool);
    });
    var count = folder.querySelector(".explore-folder-count");
    if (count) count.textContent = plural(items.length);
    groups.push({
      id: folder.dataset.category,
      icon: text(folder, ".explore-folder-icon"),
      label: text(folder, ".explore-folder-title"),
      goal: ({"2d-art": "Draw & animate", "3d-modeling": "Model & 3D print", "3d-studios": "Create characters & worlds", "coding": "Code websites & games", "music": "Make music", "engineering": "Build & invent"})[folder.dataset.category],
      count: items.length,
      folder: folder,
    });
  });

  /* ── Search ──────────────────────────────────────────────────────── */

  function hasPrefix(list, term) {
    return list.some(function (word) { return word.indexOf(term) === 0; });
  }

  function scoreTerm(tool, term) {
    if (tool.name.indexOf(term) === 0) return 100;
    if (hasPrefix(tool.nameWords, term)) return 60;
    if (hasPrefix(tool.keywords, term)) return 40;
    if (hasPrefix(tool.otherWords, term)) return 20;
    return 0;
  }

  // Every word typed must match, so "3d print" narrows instead of widening.
  function search(query) {
    var terms = words(query);
    if (!terms.length) return [];
    var hits = [];
    tools.forEach(function (tool, index) {
      var total = 0;
      for (var i = 0; i < terms.length; i += 1) {
        var score = scoreTerm(tool, terms[i]);
        if (!score) return;
        total += score;
      }
      hits.push({ tool: tool, score: total + (tool.main ? 5 : 0), index: index });
    });
    hits.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    return hits.map(function (hit) { return hit.tool; });
  }

  /* ── Recent tools ────────────────────────────────────────────────── */

  function recentTools() {
    var memory = window.ClassroomOSMemory;
    if (!memory || typeof memory.snapshot !== "function") return [];
    var found = [];
    memory.snapshot().plays.forEach(function (play) {
      if (play.id.indexOf(PLAY_PREFIX) !== 0 || found.length >= RECENT_MAX) return;
      var href = play.id.slice(PLAY_PREFIX.length);
      var tool = tools.filter(function (entry) { return entry.href === href; })[0];
      if (tool) found.push(tool);
    });
    return found;
  }

  /* ── Rendering ───────────────────────────────────────────────────── */

  function mainTools() {
    return tools.filter(function (tool) { return tool.main; });
  }

  function fillPicked(list) {
    pickedList.textContent = "";
    list.forEach(function (tool) {
      var copy = tool.item.cloneNode(true);
      copy.dataset.category = tool.category;
      pickedList.appendChild(copy);
    });
  }

  function showPicked(icon, title, description, list) {
    pickedIcon.textContent = icon;
    pickedTitle.textContent = title;
    pickedDesc.textContent = description;
    fillPicked(list);
    picked.hidden = false;
    folders.forEach(function (folder) { folder.hidden = true; });
  }

  function markRail(id) {
    Array.prototype.forEach.call(rail.querySelectorAll(".explore-rail-btn"), function (button) {
      button.setAttribute("aria-pressed", button.dataset.group === id ? "true" : "false");
    });
  }

  function showGroup(id) {
    var recent = id === "recent" ? recentTools() : [];
    var group = groups.filter(function (entry) { return entry.id === id; })[0];
    if (id === "recent" && !recent.length) id = "main";
    if (id !== "main" && id !== "recent" && !group) id = "main";

    current = id;
    topResult = null;
    status.textContent = "";
    empty.hidden = true;
    if (id === "main") {
      showPicked("⭐", "Start here", "A few versatile studios to get your next project going.", mainTools());
    } else if (id === "recent") {
      showPicked("🕘", "Recent", "The tools you opened last on this device.", recent);
    } else {
      picked.hidden = true;
      folders.forEach(function (folder) { folder.hidden = folder !== group.folder; });
    }
    markRail(id);
  }

  function showSearch(query) {
    var hits = search(query);
    topResult = hits[0] || null;
    showPicked("🔍", "Search results", "", hits);
    pickedDesc.hidden = true;
    markRail("");
    empty.hidden = hits.length > 0;
    if (hits.length) {
      status.textContent = plural(hits.length) + " found. Press Enter to open " + text(hits[0].item, ".explore-tool-name") + ".";
    } else {
      status.textContent = "No tools found.";
      emptyText.textContent = "Nothing matches “" + query.trim() + "”. Try one word for what you want to make, like paint, game or circuit.";
    }
  }

  function refresh() {
    pickedDesc.hidden = false;
    if (input.value.trim()) showSearch(input.value);
    else showGroup(current);
    // Open does what Enter does, so it's live only while there is a top result to open.
    if (go) go.disabled = !topResult;
  }

  function railButton(id, icon, label, count) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "explore-rail-btn";
    button.dataset.group = id;
    if (id !== "main" && id !== "recent") button.dataset.category = id;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-controls", "explore-folders");

    var iconNode = document.createElement("span");
    iconNode.className = "explore-rail-icon";
    iconNode.setAttribute("aria-hidden", "true");
    iconNode.textContent = icon;
    var labelNode = document.createElement("span");
    labelNode.className = "explore-rail-label";
    labelNode.textContent = label;
    var countNode = document.createElement("span");
    countNode.className = "explore-rail-count";
    countNode.textContent = count;
    countNode.setAttribute("aria-label", plural(count));

    button.appendChild(iconNode);
    button.appendChild(labelNode);
    button.appendChild(countNode);
    return button;
  }

  function buildRail() {
    var focused = document.activeElement && document.activeElement.closest
      ? document.activeElement.closest(".explore-rail-btn")
      : null;
    var focusedGroup = focused ? focused.dataset.group : "";
    rail.textContent = "";
    rail.appendChild(railButton("main", "⭐", "Start here", mainTools().length));
    var recentCount = recentTools().length;
    if (recentCount) rail.appendChild(railButton("recent", "🕘", "Recent", recentCount));
    groups.forEach(function (group) {
      rail.appendChild(railButton(group.id, group.icon, group.goal || group.label, group.count));
    });
    if (focusedGroup) {
      var again = rail.querySelector('[data-group="' + focusedGroup + '"]');
      if (again) again.focus();
    }
  }

  function remember(id) {
    try { localStorage.setItem(GROUP_KEY, id); } catch (error) { /* private window: skip it */ }
  }

  function remembered() {
    try { return localStorage.getItem(GROUP_KEY) || "main"; } catch (error) { return "main"; }
  }

  /* ── Events ──────────────────────────────────────────────────────── */

  rail.addEventListener("click", function (event) {
    var button = event.target.closest(".explore-rail-btn");
    if (!button) return;
    input.value = "";
    current = button.dataset.group;
    remember(current);
    refresh();
  });

  input.addEventListener("input", refresh);

  input.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && input.value) {
      event.preventDefault();
      input.value = "";
      refresh();
    } else if (event.key === "ArrowDown") {
      var first = pickedList.querySelector("a");
      if (first && !picked.hidden) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Enter goes through the real link so visitor memory sees the click, same as a pointer.
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var first = topResult && pickedList.querySelector("a");
    if (first) first.click();
  });

  emptyClear.addEventListener("click", function () {
    input.value = "";
    refresh();
    input.focus();
  });

  // Opening a tool writes to memory mid-click, so only the rail is rebuilt here; re-rendering the
  // cards would drop focus after a ctrl-click.
  function syncRecent() {
    buildRail();
    if (current === "recent" && !recentTools().length) refresh();
    else markRail(input.value.trim() ? "" : current);
  }

  window.addEventListener("classroomos:memorychange", syncRecent);
  // Coming back with the Back button restores the page without rerunning this script.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) syncRecent();
  });

  form.hidden = false;
  rail.hidden = false;
  browser.classList.add("is-picking");
  current = remembered();
  buildRail();
  refresh();
}());
