"use strict";

// ============================================================
// THE WORKSHOP — CREATION HUB CATALOG
// Read README-FIRST.md before changing this file.
//
// Order of the file, top to bottom:
//   1. DATA      — your creations
//   2. ELEMENTS  — the parts of the page this script touches
//   3. FUNCTIONS — one small job each
//   4. init()    — the only thing that runs by itself, at the bottom
//
// Nothing above init() runs on its own. Everything above it is a definition
// waiting to be used, which is why you can read this file from the top without
// having to hold anything in your head.
// ============================================================


// ---------- 1. DATA ----------

// WHAT: every card on this page is built from this array. The HTML holds no
// titles, no blurbs and no controls — only the empty <ul> they get poured into.
// WHY: a creation described in two places eventually gets changed in one of
// them, and then the catalog lies about your own work.
//
// Each entry:
//   id        a short unique name. Used to tell cards apart. No spaces.
//   title     what the creation is called, in your words.
//   category  "game", "simulation" or "art" — see the note below.
//   blurb     one or two sentences. What is it, and why is it worth opening?
//   controls  an array of { label, detail } pairs, written for somebody who
//             has never seen it. This is the part everybody skips and the part
//             that decides whether a stranger can actually play your creation.
//   path      the creation's own index.html, relative to this file. Leave it
//             out (or set it to null) for something you have not built yet —
//             the card then shows a "not built yet" slot instead of a button.
//   credits   who made it and what is borrowed. "Original work by …" is a
//             complete answer when nothing is borrowed.
//
// The category decides the badge colour, and the badge classes in style.css are
// badge-game, badge-simulation and badge-art. A category with no matching class
// still works — the badge just comes out unstyled, which is a hint, not a crash.
const CREATIONS = [
  {
    id: "star-catcher",
    title: "Star Catcher",
    category: "game",
    blurb:
      "Catch falling stars in a basket you steer with the keyboard. Sixty seconds, " +
      "one life, and a score you can actually beat.",
    controls: [
      { label: "Move", detail: "Left and Right arrow keys, or A and D" },
      { label: "Pause and resume", detail: "P, or the Pause button" },
      { label: "Play again", detail: "R, or the Play again button" }
    ],
    path: "creations/star-catcher/index.html",
    credits: "Original work by ClassroomOS. No images, no audio, no libraries."
  },
  {
    id: "bounce-lab",
    title: "Bounce Lab",
    category: "simulation",
    blurb:
      "Drop a handful of balls and change the physics while they are still moving. " +
      "Turn gravity down, turn bounce up, and watch what the numbers actually do.",
    controls: [
      { label: "Gravity, bounce, ball count", detail: "The three sliders. They take effect immediately." },
      { label: "Run and pause", detail: "The Run button, or the Space bar" },
      { label: "Reset", detail: "The Reset button — drops a fresh set of balls" }
    ],
    path: "creations/bounce-lab/index.html",
    credits: "Original work by ClassroomOS. The physics is deliberately simplified — see its page."
  },
  {
    // WHAT: a card with no path. This is your slot — replace it with something
    // you built. Deleting it is also a fine answer; an honest empty catalog
    // beats a catalog full of things that do not exist.
    id: "your-art-piece",
    title: "Your generative artwork",
    category: "art",
    blurb:
      "Nothing here yet. Copy one of the folders in creations/, make it draw " +
      "something of yours, then replace this entry with the real thing.",
    controls: [
      { label: "Controls", detail: "Write them here once the piece exists." }
    ],
    path: null,
    credits: "Add your name, and a line for every borrowed file."
  }
];

// WHAT: the label shown on the "everything" button.
// WHY: it is used in three places below, and one constant beats three strings
// that can drift apart.
const ALL = "all";


// ---------- 2. ELEMENTS ----------

// If any of these come back null, an id in index.html does not match the
// selector here. That is the single most common way this page breaks.
const filterRow = document.querySelector("#filter-buttons");
const list = document.querySelector("#creation-list");
const statusLine = document.querySelector("#catalog-status");
const noMatches = document.querySelector("#no-matches");


// ---------- 3. FUNCTIONS ----------

// Collect the categories that actually exist in the data, with no duplicates.
// A Set refuses to hold the same value twice, so this is the whole job.
// WHY it matters: the buttons are built from this, so a new category in the
// data grows its own button. The buttons and the data cannot disagree, because
// there is only one list now.
function categoriesInUse() {
  const found = new Set();
  CREATIONS.forEach(function (creation) {
    found.add(creation.category);
  });
  return Array.from(found).sort();
}

// Turn "simulation" into "Simulation" for the button face. The data stays lower
// case; only the display changes. Never store text the way it happens to look.
function titleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Build one filter button.
// WHY aria-pressed: it is how a screen reader announces "this toggle is on".
// style.css styles button[aria-pressed="true"], so the highlight and the
// announced state are driven by the same attribute and can never disagree.
function createFilterButton(category, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.category = category;
  button.setAttribute("aria-pressed", "false");
  button.textContent = label;
  return button;
}

// Fill the filter row: "All", then one button per category found in the data.
function buildFilters() {
  filterRow.replaceChildren();
  filterRow.append(createFilterButton(ALL, "All"));
  categoriesInUse().forEach(function (category) {
    filterRow.append(createFilterButton(category, titleCase(category)));
  });
}

// Build the <dl> of written controls for one card.
// WHAT: a description list is the honest markup for label-and-value pairs. A
// pile of <p> tags would look the same and mean nothing.
function createControlsBlock(controls) {
  const block = document.createElement("dl");
  block.className = "controls-block";
  controls.forEach(function (control) {
    const term = document.createElement("dt");
    term.textContent = control.label;
    const detail = document.createElement("dd");
    detail.textContent = control.detail;
    block.append(term, detail);
  });
  return block;
}

// Build one card. Returns an <li> ready to go into the catalog.
// Every piece of text is set with textContent, so text is always treated as
// words and never as code — even if somebody types a < into a blurb.
function createCard(creation) {
  const card = document.createElement("li");
  card.className = "card";

  const badge = document.createElement("p");
  badge.className = "badge badge-" + creation.category;
  badge.textContent = creation.category;

  const heading = document.createElement("h3");
  heading.textContent = creation.title;

  const blurb = document.createElement("p");
  blurb.className = "blurb";
  blurb.textContent = creation.blurb;

  card.append(badge, heading, blurb, createControlsBlock(creation.controls));

  if (creation.path) {
    const link = document.createElement("a");
    link.className = "launch";
    link.href = creation.path;
    // WHY the aria-label: "Open" repeated down a page tells a screen-reader
    // user nothing when links are listed out of context. Naming the creation
    // makes every link distinct on its own.
    link.textContent = "Open";
    link.setAttribute("aria-label", "Open " + creation.title);
    card.append(link);
  } else {
    const slot = document.createElement("p");
    slot.className = "empty-slot";
    slot.textContent = "Not built yet — there is no folder for this one.";
    card.append(slot);
  }

  return card;
}

// Empty the catalog, then draw the creations given to it.
// The empty state is not decoration: a filter that matches nothing must SAY so.
// A blank space looks like a bug, and a student will spend ten minutes hunting
// for a bug that is not there.
function renderCards(creations) {
  list.replaceChildren();
  noMatches.hidden = creations.length > 0;
  creations.forEach(function (creation) {
    list.append(createCard(creation));
  });
}

// Update the line above the catalog. It has aria-live="polite" in the HTML, so
// setting its text is also what a screen reader hears. Changing the page
// without saying what changed leaves anyone not watching the screen behind.
function announce(category, count) {
  if (count === 0) {
    statusLine.textContent = "Nothing tagged " + category + " yet.";
  } else if (category === ALL) {
    statusLine.textContent = "Showing all " + count + " creations.";
  } else {
    statusLine.textContent =
      "Showing " + count + " " + category + (count === 1 ? "" : "s") + ".";
  }
}

// Mark exactly one button as pressed and every other one as not.
// Setting true on the clicked button without setting false on the rest is how
// pages end up with three highlighted filters at once.
function setPressed(category) {
  filterRow.querySelectorAll("button").forEach(function (button) {
    button.setAttribute("aria-pressed", String(button.dataset.category === category));
  });
}

// Show one category. ALL means show everything.
function applyFilter(category) {
  const matching = CREATIONS.filter(function (creation) {
    return category === ALL || creation.category === category;
  });

  setPressed(category);
  renderCards(matching);
  announce(category, matching.length);
}

// One listener on the row instead of one per button.
// WHY: the buttons are created by JavaScript, so a listener attached to each
// button would have to be re-attached every time they are rebuilt. A listener
// on the parent keeps working no matter how many buttons come and go. The
// click "bubbles" up from the button to the row, and closest() finds which
// button it started on.
function handleFilterClick(event) {
  const button = event.target.closest("button");
  if (!button) return;
  applyFilter(button.dataset.category);
}


// ---------- 4. START ----------

function init() {
  buildFilters();
  applyFilter(ALL);
  filterRow.addEventListener("click", handleFilterClick);
}

init();
