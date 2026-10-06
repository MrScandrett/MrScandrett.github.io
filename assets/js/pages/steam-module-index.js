(function () {
  "use strict";

  // One standard way to read every subject shelf. "Index" (the default) lays
  // each chapter out as a compact numbered list and packs the chapters into
  // columns, so a whole module fits on roughly one screen. "Cards" keeps the
  // photo tiles, wrapped into rows instead of a sideways-scrolling lane.
  // Runs after the inline script that groups tiles into .lesson-pathway.

  var STORAGE_KEY = "steam-lessons-view";
  var actions = document.getElementById("catalog-browser-actions");
  if (!actions || !document.querySelector(".lesson-pathway")) return;

  function readView() {
    try { return localStorage.getItem(STORAGE_KEY) === "cards" ? "cards" : "index"; }
    catch (error) { return "index"; }
  }

  function saveView(view) {
    try { localStorage.setItem(STORAGE_KEY, view); } catch (error) { /* private window */ }
  }

  // In the index the description is visually hidden, so surface it on hover
  // too. Screen readers already get it from the link text.
  document.querySelectorAll(".lesson-pathway-track .tile").forEach(function (tile) {
    var description = tile.querySelector("small");
    if (description && !tile.title) tile.title = description.textContent.trim();
  });

  var group = document.createElement("div");
  group.className = "lesson-view-toggle";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Lesson layout");
  group.innerHTML =
    '<button type="button" data-lesson-view="index">Index</button>' +
    '<button type="button" data-lesson-view="cards">Cards</button>';
  actions.appendChild(group);

  function applyView(view) {
    document.body.classList.toggle("lessons-view-index", view === "index");
    document.body.classList.toggle("lessons-view-cards", view === "cards");
    group.querySelectorAll("button").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.lessonView === view));
    });
  }

  group.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-lesson-view]");
    if (!button) return;
    applyView(button.dataset.lessonView);
    saveView(button.dataset.lessonView);
  });

  applyView(readView());
})();
