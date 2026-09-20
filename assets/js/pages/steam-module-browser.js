(function () {
  "use strict";

  var directory = document.getElementById("catalog-module-directory");
  var browser = document.getElementById("catalog-browser");
  var backButton = document.getElementById("catalog-directory-button");
  var actions = document.getElementById("catalog-browser-actions");
  var previousButton = document.getElementById("catalog-previous-button");
  var nextButton = document.getElementById("catalog-next-button");
  var status = document.getElementById("catalog-browser-status");
  if (!directory || !browser || !backButton || !actions || !previousButton || !nextButton || !status) return;

  var sections = Array.prototype.slice.call(document.querySelectorAll(".module-section"));
  var volumeNames = {
    "1": ["Volume I · Foundations", "Mathematical thinking and the sky", "#3157a4"],
    "2": ["Volume II · Physical science", "Matter, forces, waves, and energy", "#1f4e79"],
    "3": ["Volume III · Life and Earth", "Living systems and a changing planet", "#287a58"],
    "4": ["Volume IV · Engineering and design", "Build, test, fabricate, and produce", "#c75a1b"],
    "5": ["Volume V · Computing and AI", "Code, games, algorithms, and machines", "#7046b3"],
    "6": ["Volume VI · Arts and society", "Design, language, history, and belief", "#8a3f55"]
  };
  var moduleColors = {
    math: "#818cf8", science: "#2588b5", engineering: "#c56d0a",
    technical: "#8750b5", technology: "#5269d4", art: "#c84782", bridge: "#2b827b"
  };
  var activeId = "";
  var selectedVolume = "all";

  function text(node, selector) {
    var match = node.querySelector(selector);
    return match ? match.textContent.trim() : "";
  }

  Object.keys(volumeNames).forEach(function (volume) {
    var members = sections.filter(function (section) { return section.dataset.compendiumVolume === volume; });
    if (!members.length) return;

    var row = document.createElement("section");
    row.className = "catalog-volume-row";
    row.dataset.catalogVolume = volume;
    row.style.setProperty("--catalog-volume-color", volumeNames[volume][2]);

    var label = document.createElement("div");
    label.className = "catalog-volume-label";
    label.innerHTML = "<strong>" + volumeNames[volume][0] + "</strong><small>" + volumeNames[volume][1] + "</small>";

    var modules = document.createElement("div");
    modules.className = "catalog-volume-modules";
    modules.style.setProperty("--catalog-columns", String(Math.min(3, members.length)));

    members.forEach(function (section) {
      var button = document.createElement("button");
      var title = text(section, ".module-banner-title");
      var count = text(section, ".module-banner-count");
      var icon = text(section, ".module-banner-icon");
      var theme = section.dataset.themeArea || "science";
      button.type = "button";
      button.className = "catalog-module-button";
      button.dataset.moduleTarget = section.id;
      button.dataset.themeArea = theme;
      button.style.setProperty("--module-color", moduleColors[theme] || "var(--accent)");
      button.innerHTML = '<span class="catalog-module-icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="catalog-module-copy"><strong>' + title + '</strong><small>' + count + '</small></span>' +
        '<span class="catalog-module-arrow" aria-hidden="true">›</span>';
      button.addEventListener("click", function () { showModule(section.id, true); });
      modules.appendChild(button);
    });

    row.appendChild(label);
    row.appendChild(modules);
    directory.appendChild(row);
  });

  function setDrawer(section, open) {
    var banner = section.querySelector(".module-banner");
    var drawer = banner ? banner.nextElementSibling : null;
    if (!banner || !drawer) return;
    banner.setAttribute("aria-expanded", open ? "true" : "false");
    banner.classList.toggle("open", open);
    drawer.style.maxHeight = open ? "none" : "0";
  }

  function showDirectory(shouldFocus) {
    activeId = "";
    document.body.classList.add("catalog-directory-view");
    document.body.classList.remove("catalog-module-view");
    actions.hidden = true;
    directory.hidden = false;
    sections.forEach(function (section) {
      section.classList.remove("catalog-active-module");
      setDrawer(section, false);
    });
    directory.querySelectorAll(".catalog-module-button").forEach(function (button) {
      button.removeAttribute("aria-current");
    });
    status.textContent = "Choose a subject below. Only that lesson shelf will open.";
    if (history.replaceState && location.hash.indexOf("#module-") === 0) history.replaceState(null, "", location.pathname + location.search);
    if (shouldFocus) {
      browser.scrollIntoView({ behavior: "smooth", block: "start" });
      var first = directory.querySelector(".catalog-module-button:not([hidden])");
      if (first) first.focus({ preventScroll: true });
    }
  }

  function showModule(id, shouldScroll) {
    var section = document.getElementById(id);
    if (!section || !section.classList.contains("module-section")) return;
    // A subject is a complete shelf. Clear the older volume filter before
    // opening it so previous/next navigation can never land on a hidden shelf.
    var selectedVolumeTab = document.querySelector(".compendium-volume-tab.is-active[data-volume-filter]");
    if (typeof window.setCompendiumVolume === "function" &&
        selectedVolumeTab && selectedVolumeTab.dataset.volumeFilter !== "all") {
      window.setCompendiumVolume("all", { source: "module-browser" });
    }
    section.hidden = false;
    section.classList.remove("volume-collapsed");
    activeId = id;
    document.body.classList.remove("catalog-directory-view");
    document.body.classList.add("catalog-module-view");
    actions.hidden = false;
    directory.hidden = true;
    sections.forEach(function (candidate) {
      var active = candidate === section;
      candidate.classList.toggle("catalog-active-module", active);
      setDrawer(candidate, active);
    });
    directory.querySelectorAll(".catalog-module-button").forEach(function (button) {
      if (button.dataset.moduleTarget === id) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    var volume = section.dataset.compendiumVolume;
    var volumeTitle = volumeNames[volume] ? volumeNames[volume][0] : "Lesson library";
    status.textContent = volumeTitle + " → " + text(section, ".module-banner-title") + " · " + text(section, ".module-banner-count") + ".";
    var activeIndex = sections.indexOf(section);
    var previous = sections[(activeIndex - 1 + sections.length) % sections.length];
    var next = sections[(activeIndex + 1) % sections.length];
    previousButton.dataset.moduleTarget = previous.id;
    nextButton.dataset.moduleTarget = next.id;
    previousButton.setAttribute("aria-label", "Previous subject: " + text(previous, ".module-banner-title"));
    nextButton.setAttribute("aria-label", "Next subject: " + text(next, ".module-banner-title"));
    if (history.replaceState) history.replaceState(null, "", "#" + id);
    if (shouldScroll) {
      browser.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(function () {
        var banner = section.querySelector(".module-banner");
        if (banner) banner.focus({ preventScroll: true });
      }, 260);
    }
  }

  function refreshView() {
    var subject = document.getElementById("lesson-subject-filter");
    var selectedTheme = subject ? subject.value : "all";
    var visibleButtons = 0;
    directory.querySelectorAll(".catalog-module-button").forEach(function (button) {
      var row = button.closest(".catalog-volume-row");
      var volumeMatches = selectedVolume === "all" || (row && row.dataset.catalogVolume === selectedVolume);
      var visible = volumeMatches && (selectedTheme === "all" || button.dataset.themeArea === selectedTheme);
      button.hidden = !visible;
      if (visible) visibleButtons += 1;
    });
    directory.querySelectorAll(".catalog-volume-row").forEach(function (row) {
      var volumeMatches = selectedVolume === "all" || row.dataset.catalogVolume === selectedVolume;
      row.hidden = !volumeMatches || !row.querySelector(".catalog-module-button:not([hidden])");
    });
    if (activeId) {
      var activeButton = directory.querySelector('[data-module-target="' + activeId + '"]');
      if (activeButton && activeButton.hidden) showDirectory(false);
      else {
        showModule(activeId, false);
        var activeSection = document.getElementById(activeId);
        var visibleLessons = activeSection ? Array.prototype.filter.call(activeSection.querySelectorAll(".tile"), function (tile) {
          return !tile.classList.contains("grade-hidden") && !tile.classList.contains("lesson-hidden");
        }).length : 0;
        var filterStatus = document.getElementById("lesson-filter-status");
        var grade = document.getElementById("lesson-grade-filter");
        if (filterStatus && grade) {
          var gradeText = grade.value === "all" ? "all learning levels" : "grades " + grade.options[grade.selectedIndex].text;
          filterStatus.textContent = "Showing " + visibleLessons + " lessons in this shelf for " + gradeText + ".";
        }
      }
    } else {
      var selectedVolumeTitle = volumeNames[selectedVolume] ? volumeNames[selectedVolume][0] : "All six volumes";
      status.textContent = selectedVolumeTitle + " · " + visibleButtons + " subject " +
        (visibleButtons === 1 ? "shelf" : "shelves") + ". Choose one to open its lessons.";
    }
  }

  backButton.addEventListener("click", function () { showDirectory(true); });
  previousButton.addEventListener("click", function () { showModule(previousButton.dataset.moduleTarget, true); });
  nextButton.addEventListener("click", function () { showModule(nextButton.dataset.moduleTarget, true); });
  window.addEventListener("hashchange", function () {
    var hashId = location.hash.indexOf("#module-") === 0 ? location.hash.slice(1) : "";
    if (hashId && document.getElementById(hashId)) showModule(hashId, false);
    else if (!location.hash) showDirectory(false);
  });
  window.addEventListener("compendiumvolumechange", function (event) {
    selectedVolume = event.detail && event.detail.volume ? String(event.detail.volume) : "all";
    if (event.detail && event.detail.userInitiated && activeId) {
      showDirectory(false);
      browser.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    refreshView();
  });
  window.refreshCatalogModuleView = refreshView;

  var initialId = location.hash.indexOf("#module-") === 0 ? location.hash.slice(1) : "";
  if (initialId && document.getElementById(initialId)) showModule(initialId, false);
  else showDirectory(false);
  refreshView();
})();
