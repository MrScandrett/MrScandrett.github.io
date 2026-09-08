"use strict";

// ============================================================
// WEB FOUNDATIONS — PROJECT SEARCH
// Read README-FIRST.md before changing this file.
//
// The file is written in one order, top to bottom:
//   1. DATA        — the list the page is made from
//   2. ELEMENTS    — the parts of the page this script touches
//   3. FUNCTIONS   — one small job each
//   4. init()      — the only thing that runs on its own, at the very bottom
// ============================================================


// ---------- 1. DATA ----------

// WHAT: every project on the page comes from this one array.
// WHY: the HTML does not list the projects. Keeping the list in one place means
// you add a project by adding data, not by copying and pasting markup.
// GUIDED CHANGE 2: add a fourth object to this array.
const projects = [
  {
    title: "Orbit Dodge",
    year: 2026,
    summary: "A canvas game where you steer a satellite through a debris field.",
    tags: ["game", "canvas", "javascript"]
  },
  {
    title: "Greenhouse Sensor Log",
    year: 2026,
    summary: "Temperature readings from a micro:bit, charted as a simple bar graph.",
    tags: ["sensor", "data", "microbit"]
  },
  {
    title: "Generative Paint",
    year: 2025,
    summary: "Click and drag to grow branching shapes that never repeat.",
    tags: ["art", "canvas", "paint"]
  }
];


// ---------- 2. ELEMENTS ----------

// WHAT: find the parts of the page once and remember them.
// WHY: querySelector searches the whole document. Doing it once here is faster
// and, more importantly, it puts every id this script depends on in one visible list.
// If one of these is null, the id in index.html does not match the text here.
const searchBox = document.querySelector("#search");
const projectList = document.querySelector("#project-list");
const searchStatus = document.querySelector("#search-status");


// ---------- 3. FUNCTIONS ----------

// Decide whether one project should be shown for what the person typed.
// Returns true or false. An empty search box matches everything.
function matchesSearch(project, query) {
  // WHY: lowercase both sides so "GAME", "Game" and "game" behave the same.
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;

  // WHAT: join the searchable words into one string, then look inside it.
  const haystack = (project.title + " " + project.summary + " " + project.tags.join(" ")).toLowerCase();
  return haystack.includes(needle);
}

// Build one <li> card for one project and hand it back.
// This function creates elements instead of pasting HTML text, so anything a
// person types is treated as words, never as code.
function createProjectCard(project) {
  const item = document.createElement("li");
  item.className = "project-card";

  const heading = document.createElement("h3");
  heading.textContent = project.title + " (" + project.year + ")";

  const summary = document.createElement("p");
  summary.textContent = project.summary;

  const tagRow = document.createElement("div");
  tagRow.className = "tag-row";

  // WHAT: one <span> per tag. forEach runs the same steps for each item.
  project.tags.forEach(function (tag) {
    const chip = document.createElement("span");
    chip.className = "tag";
    chip.textContent = tag;
    tagRow.append(chip);
  });

  item.append(heading, summary, tagRow);
  return item;
}

// Empty the list, then put the given projects into it.
function renderProjects(list) {
  // WHY: clear first. Without this line, every keystroke would add more cards
  // underneath the old ones instead of replacing them.
  projectList.replaceChildren();

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.className = "project-card";
    empty.textContent = "No projects match that search yet.";
    projectList.append(empty);
    return;
  }

  list.forEach(function (project) {
    projectList.append(createProjectCard(project));
  });
}

// Update the sentence above the list. The <p> has aria-live="polite" in the
// HTML, so changing its text is also how a screen reader hears the result.
function announceCount(shownCount) {
  if (shownCount === projects.length) {
    searchStatus.textContent = "Showing all " + projects.length + " projects.";
  } else if (shownCount === 0) {
    searchStatus.textContent = "No matches. Try a shorter word.";
  } else {
    searchStatus.textContent = "Showing " + shownCount + " of " + projects.length + " projects.";
  }
}

// Run the search: read the box, filter the data, draw the result, say what happened.
// This is the one function that ties the other three together.
function handleSearch() {
  const query = searchBox.value;

  // WHAT: filter keeps every project that makes matchesSearch return true.
  const matching = projects.filter(function (project) {
    return matchesSearch(project, query);
  });

  renderProjects(matching);
  announceCount(matching.length);
}


// ---------- 4. START ----------

// The only code that runs by itself. Everything above only waits to be called.
function init() {
  renderProjects(projects);
  announceCount(projects.length);

  // WHY: "input" fires on every keystroke, and also when the little x in a
  // search box clears it. "change" would only fire after leaving the box.
  searchBox.addEventListener("input", handleSearch);
}

init();
