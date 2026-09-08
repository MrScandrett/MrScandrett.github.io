"use strict";

// ============================================================
// WEB PORTFOLIO — FILTERABLE WORK GRID
// Read README-FIRST.md before changing this file.
//
// Order of the file, top to bottom:
//   1. DATA      — your projects
//   2. ELEMENTS  — the parts of the page this script touches
//   3. FUNCTIONS — one small job each
//   4. init()    — the only thing that runs by itself, at the bottom
// ============================================================


// ---------- 1. DATA ----------

// WHAT: every card on the page is built from this array.
// WHY: the HTML holds no project text at all, so adding work means adding data.
//
// The "category" of every project MUST be one of the data-category values on the
// filter buttons in index.html: "game", "simulation", or "art". A typo here does
// not throw an error — the project simply never appears under its filter, which
// is a far more confusing kind of broken. If you change these words, change the
// buttons to match.
const projects = [
  {
    title: "Replace this with your own project",
    category: "game",
    summary:
      "Two sentences, no more. Say what it is, then say what makes it interesting to play or use.",
    tools: "HTML canvas, JavaScript",
    learned: "Say one specific thing you did not know before. Not \"I learned a lot\"."
  },
  {
    title: "Replace this with your own project",
    category: "simulation",
    summary:
      "Two sentences. What does it model, and what can somebody change while it runs? A simulation is worth showing when it answers a question.",
    tools: "JavaScript, requestAnimationFrame",
    learned: "One sentence. What surprised you, or what did you have to rebuild?"
  },
  {
    title: "Replace this with your own project",
    category: "art",
    summary:
      "Two sentences. Describe what a visitor sees, and say what you were trying to achieve. Save your feelings about it for the case study.",
    tools: "SVG, CSS",
    learned: "One sentence. Name the technique, not the emotion."
  }
];


// ---------- 2. ELEMENTS ----------

// If any of these come back null, an id or class in index.html does not match.
const grid = document.querySelector("#project-grid");
const status = document.querySelector("#filter-status");
const filterButtons = document.querySelectorAll(".filter");


// ---------- 3. FUNCTIONS ----------

// Build one card. Returns an <li> ready to be added to the grid.
// Everything is created with createElement and textContent, so text is always
// treated as words and never as code.
function createProjectCard(project) {
  const card = document.createElement("li");
  card.className = "project-card";

  // WHAT: a CSS placeholder standing in for a picture, not a fake photo.
  // WHY: aria-hidden="true" hides it from screen readers because it carries no
  // information. When you swap it for a real <img>, delete the aria-hidden and
  // write real alt text instead.
  const thumb = document.createElement("div");
  thumb.className = "thumb";
  thumb.setAttribute("aria-hidden", "true");
  thumb.textContent = "Your screenshot here";

  const heading = document.createElement("h3");
  heading.textContent = project.title;

  const badge = document.createElement("p");
  badge.className = "badge";
  badge.textContent = project.category;

  const summary = document.createElement("p");
  summary.textContent = project.summary;

  // WHAT: a description list is the honest markup for label-and-value pairs.
  const details = document.createElement("dl");
  details.className = "card-details";
  details.append(
    createDetail("Tools", project.tools),
    createDetail("One thing I learned", project.learned)
  );

  const link = document.createElement("a");
  link.className = "card-link";
  link.href = "pages/case-study.html";
  // WHY: "Read more" tells a screen-reader user nothing when links are listed
  // out of context. Naming the project makes every link distinct.
  link.textContent = "Read the case study";
  link.setAttribute("aria-label", "Read the case study for " + project.title);

  card.append(thumb, heading, badge, summary, details, link);
  return card;
}

// Build one <dt>/<dd> pair for the card's details list.
function createDetail(label, value) {
  const fragment = document.createDocumentFragment();
  const term = document.createElement("dt");
  term.textContent = label;
  const definition = document.createElement("dd");
  definition.textContent = value;
  fragment.append(term, definition);
  return fragment;
}

// Empty the grid, then draw the projects given to it.
// The empty state matters: a filter that matches nothing must SAY so, not just
// leave a blank space that looks like a bug.
function renderProjects(list) {
  grid.replaceChildren();

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No work in this category yet. Try another filter.";
    grid.append(empty);
    return;
  }

  list.forEach(function (project) {
    grid.append(createProjectCard(project));
  });
}

// Update the line above the grid. It has aria-live="polite" in the HTML, so
// changing its text is also what a screen reader hears.
function announce(category, shownCount) {
  if (shownCount === 0) {
    status.textContent = "No work tagged " + category + " yet.";
  } else if (category === "all") {
    status.textContent = "Showing all " + shownCount + " projects.";
  } else {
    status.textContent = "Showing " + shownCount + " " + category + " project" +
      (shownCount === 1 ? "" : "s") + ".";
  }
}

// Mark exactly one filter button as pressed.
// WHY: aria-pressed is the state a screen reader reads out. The CSS also styles
// [aria-pressed="true"], so the attribute and the highlight can never disagree.
function setPressedButton(category) {
  filterButtons.forEach(function (button) {
    const isActive = button.dataset.category === category;
    button.setAttribute("aria-pressed", String(isActive));
  });
}

// Show one category. "all" means show everything.
function applyFilter(category) {
  const matching = projects.filter(function (project) {
    return category === "all" || project.category === category;
  });

  setPressedButton(category);
  renderProjects(matching);
  announce(category, matching.length);
}

// One listener for the whole button group instead of one per button.
function handleFilterClick(event) {
  const button = event.target.closest(".filter");
  if (!button) return;
  applyFilter(button.dataset.category);
}


// ---------- 4. START ----------

function init() {
  applyFilter("all");
  document.querySelector(".filters").addEventListener("click", handleFilterClick);
}

init();
