"use strict";

// ============================================================
// THE LONG ROOM — GALLERY LIST AND ROOM PLAN
// Read README-FIRST.md before changing this file.
//
// Order of the file, top to bottom:
//   1. DATA      — the exhibits
//   2. ELEMENTS  — the parts of the page this script touches
//   3. COLORS    — read out of the stylesheet, not typed again here
//   4. LIST      — building the exhibit list (the version that always works)
//   5. PLAN      — drawing the room (a second view of the same data)
//   6. SELECTION — keeping the two in step
//   7. init()    — the only thing that runs by itself, at the bottom
//
// The idea the whole pack is built on: ONE list of exhibits, shown two ways.
// The text list is the gallery. The plan is another view of it. A 3D room, if
// you add one later, is a third. None of them is allowed to know something the
// others do not — which is only possible because none of them stores anything.
// ============================================================


// ---------- 1. DATA ----------

// Each exhibit:
//   id       short, unique, no spaces. Used to tell exhibits apart in code.
//   title    what it is called.
//   medium   what it is made of, in a visitor's words, not a file extension.
//   made     when, or for what. One short phrase.
//   summary  two or three sentences. What would you say standing next to it?
//   wall     "north", "east", "south" or "west" — which wall it hangs on.
//   along    0 to 1: how far along that wall, measured clockwise from the
//            room's top-left corner. 0.5 is the middle of the wall.
//
// TRY THIS FIRST: change one `along` value and reload. The plan moves, the list
// order changes, and the walk sentence rewrites itself — from one edit.
const EXHIBITS = [
  {
    id: "orbit-study",
    title: "Orbit Study",
    medium: "Simulation, JavaScript and canvas",
    made: "Built during the simulation unit",
    summary:
      "A small world that keeps moving once you start it. Visitors change one " +
      "number — the strength of gravity — and watch the paths bend. Replace this " +
      "with something of yours that runs on its own once started.",
    wall: "north",
    along: 0.25
  },
  {
    id: "geometry-game",
    title: "Geometry Game",
    medium: "Game, keyboard controlled",
    made: "Built during the game unit",
    summary:
      "A game with rules a visitor can learn in about ten seconds: one goal, one " +
      "way to lose, and a score. Replace this with a project somebody plays " +
      "rather than watches.",
    wall: "north",
    along: 0.72
  },
  {
    id: "light-experiment",
    title: "Light Experiment",
    medium: "Visual experiment, CSS and SVG",
    made: "Built during the design unit",
    summary:
      "A study of how a surface changes as the light on it moves. There is " +
      "nothing to win here; it is worth hanging because of how it looks and what " +
      "it taught you about colour.",
    wall: "east",
    along: 0.45
  },
  {
    id: "your-fourth-piece",
    title: "Your fourth exhibit",
    medium: "Say what it is made of",
    made: "Say when you made it",
    summary:
      "This wall is empty on purpose. A gallery with a gap is honest; a gallery " +
      "full of things that do not exist is not. Replace this entry with real " +
      "work, or delete it and hang three.",
    // On the west wall, not the south one: the south wall is where the door is,
    // and an exhibit hung across a doorway is the kind of thing a plan is for
    // catching. Try setting this to "south" with `along: 0.5` and look at what
    // the plan does — then decide whether your own room has the same problem.
    wall: "west",
    along: 0.5
  }
];

// WHAT: the order the walls are visited on the walk.
// WHY it is data and not a comment: the walk sentence and the list order are
// both generated from it, so changing the route is one edit here.
const WALL_ORDER = ["north", "east", "south", "west"];


// ---------- 2. ELEMENTS ----------

const canvas = document.querySelector("#plan");
const ctx = canvas.getContext("2d");
const listEl = document.querySelector("#exhibit-list");
const legendEl = document.querySelector("#legend");
const statusEl = document.querySelector("#plan-status");
const walkEl = document.querySelector("#walk-order");

// The canvas's own coordinate system, from its width and height attributes.
const W = canvas.width;
const H = canvas.height;

// The room, drawn inside the canvas with a margin so labels have somewhere to
// live. Every plan measurement below is worked out from these four numbers.
const ROOM = { x: 70, y: 60, w: W - 140, h: H - 120 };
const WALL_THICKNESS = 14;


// ---------- 3. COLORS ----------

// WHAT: pull the exhibit colours out of the stylesheet instead of writing them
// here as well. WHY: the list, the legend and the plan then agree by
// construction. Two lists of colours in two files is two lists that can drift.
function exhibitColors() {
  const styles = getComputedStyle(document.documentElement);
  return ["--ex-1", "--ex-2", "--ex-3", "--ex-4"].map(function (name) {
    return styles.getPropertyValue(name).trim() || "#ffb86b";
  });
}

let COLORS = [];

// Modulo (%) wraps round, so a fifth exhibit gets the first colour again rather
// than an undefined value and an invisible shape.
function colorFor(index) {
  return COLORS[index % COLORS.length];
}


// ---------- 3b. ORDER ----------

// Sort the exhibits into the order a visitor meets them: wall by wall, and
// along each wall. The data can be written in any order; the route is decided
// here, once, and everything else uses the result.
function exhibitsInWalkOrder() {
  return EXHIBITS.slice().sort(function (a, b) {
    const wallDifference = WALL_ORDER.indexOf(a.wall) - WALL_ORDER.indexOf(b.wall);
    if (wallDifference !== 0) return wallDifference;
    return a.along - b.along;
  });
}

// Which exhibit is currently highlighted, by id. null means none.
let selectedId = null;


// ---------- 4. LIST ----------

// Build one exhibit entry. This is the accessible gallery: real headings, real
// text, real buttons. It would still be a complete gallery with the canvas
// deleted, which is the test that matters.
function createExhibitItem(exhibit, index) {
  const item = document.createElement("li");
  item.className = "exhibit";
  item.id = "exhibit-" + exhibit.id;
  // WHAT: a CSS custom property set from JavaScript. The stylesheet uses
  // var(--exhibit-color) for the number badge and the left border, so the entry
  // is coloured without a single style rule being written here.
  item.style.setProperty("--exhibit-color", colorFor(index));

  const heading = document.createElement("h3");
  heading.textContent = exhibit.title;

  const summary = document.createElement("p");
  summary.className = "summary";
  summary.textContent = exhibit.summary;

  const facts = document.createElement("dl");
  facts.className = "facts";
  facts.append(
    createFact("Medium", exhibit.medium),
    createFact("Made", exhibit.made),
    createFact("Hangs on", exhibit.wall + " wall")
  );

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.exhibitId = exhibit.id;
  button.setAttribute("aria-pressed", "false");
  button.textContent = "Show on the plan";
  // WHY the aria-label: five buttons all reading "Show on the plan" are five
  // identical entries in a screen reader's list of buttons. The visible words
  // stay short; the announced name says which one this is.
  button.setAttribute("aria-label", "Show " + exhibit.title + " on the plan");

  item.append(heading, summary, facts, button);
  return item;
}

// One <dt>/<dd> pair, wrapped so the CSS can keep the pair together.
function createFact(label, value) {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = label;
  const detail = document.createElement("dd");
  detail.textContent = value;
  wrapper.append(term, detail);
  return wrapper;
}

function renderList() {
  listEl.replaceChildren();
  exhibitsInWalkOrder().forEach(function (exhibit, index) {
    listEl.append(createExhibitItem(exhibit, index));
  });
}

function renderLegend() {
  legendEl.replaceChildren();
  exhibitsInWalkOrder().forEach(function (exhibit, index) {
    const entry = document.createElement("span");
    const swatch = document.createElement("i");
    swatch.style.background = colorFor(index);
    const label = document.createElement("span");
    label.textContent = (index + 1) + ". " + exhibit.title;
    entry.append(swatch, label);
    legendEl.append(entry);
  });
}

// The walk, as a sentence. Generated rather than written, so it cannot go stale
// when the exhibits move.
function renderWalk() {
  const ordered = exhibitsInWalkOrder();
  const names = ordered.map(function (exhibit, index) {
    return (index + 1) + ". " + exhibit.title + " (" + exhibit.wall + " wall)";
  });
  walkEl.textContent =
    "Starting at the door and turning left, a visitor meets " + ordered.length +
    " exhibits in this order: " + names.join(", ") + ".";
}


// ---------- 5. PLAN ----------

// WHAT: turn "north wall, 0.4 along" into a point on the canvas.
// WHY a function: the plan, the hit test and any future 3D view all need the
// same answer, and three copies of this arithmetic would eventually disagree.
// Walls are walked clockwise from the top-left corner, which is why the south
// and west values count backwards.
function positionOf(exhibit) {
  const t = Math.min(1, Math.max(0, exhibit.along));
  if (exhibit.wall === "north") {
    return { x: ROOM.x + ROOM.w * t, y: ROOM.y, facing: "down" };
  }
  if (exhibit.wall === "east") {
    return { x: ROOM.x + ROOM.w, y: ROOM.y + ROOM.h * t, facing: "left" };
  }
  if (exhibit.wall === "south") {
    return { x: ROOM.x + ROOM.w * (1 - t), y: ROOM.y + ROOM.h, facing: "up" };
  }
  return { x: ROOM.x, y: ROOM.y + ROOM.h * (1 - t), facing: "right" };
}

function drawPlan() {
  ctx.clearRect(0, 0, W, H);

  // Floor
  ctx.fillStyle = "#191527";
  ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);

  // Walls, drawn as a thick outline. lineWidth strokes half inside and half
  // outside the path, which is exactly what a wall looks like on a plan.
  ctx.strokeStyle = "#3b3159";
  ctx.lineWidth = WALL_THICKNESS;
  ctx.strokeRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);

  // The door: a gap in the south wall, so the plan says where a visitor starts.
  ctx.strokeStyle = "#191527";
  ctx.lineWidth = WALL_THICKNESS + 2;
  ctx.beginPath();
  ctx.moveTo(ROOM.x + ROOM.w * 0.44, ROOM.y + ROOM.h);
  ctx.lineTo(ROOM.x + ROOM.w * 0.56, ROOM.y + ROOM.h);
  ctx.stroke();

  ctx.fillStyle = "#a99fc2";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("door", ROOM.x + ROOM.w * 0.5, ROOM.y + ROOM.h + 30);

  exhibitsInWalkOrder().forEach(drawExhibitOnPlan);
}

function drawExhibitOnPlan(exhibit, index) {
  const spot = positionOf(exhibit);
  const isSelected = exhibit.id === selectedId;
  const length = 62;
  const depth = 16;

  // A panel on a north or south wall is wide; on an east or west wall it is
  // tall. Working the box out from the wall means one drawing routine covers
  // all four walls.
  const horizontal = exhibit.wall === "north" || exhibit.wall === "south";
  const w = horizontal ? length : depth;
  const h = horizontal ? depth : length;

  ctx.save();
  ctx.translate(spot.x, spot.y);

  ctx.fillStyle = colorFor(index);
  ctx.fillRect(-w / 2, -h / 2, w, h);

  if (isSelected) {
    // WHAT: a ring around the chosen exhibit.
    // WHY it is not the only signal: the status line says the same thing in
    // words, and the list entry is marked too. A highlight nobody can see is
    // not a way of telling anybody anything.
    ctx.strokeStyle = "#f0ecf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
  }

  // The number, placed just inside the room from the panel.
  const inset = 26;
  const labelX = spot.facing === "left" ? -inset : spot.facing === "right" ? inset : 0;
  const labelY = spot.facing === "down" ? inset : spot.facing === "up" ? -inset : 0;

  ctx.fillStyle = isSelected ? "#f0ecf8" : "#a99fc2";
  ctx.font = (isSelected ? "800 " : "600 ") + "16px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(index + 1), labelX, labelY);

  ctx.restore();
}


// ---------- 6. SELECTION ----------

// One function decides what "exhibit 2 is selected" looks like, everywhere.
// The plan, the list and the announcement are all consequences of the same
// variable. Nothing on screen is ever read back to work out the state.
function select(id) {
  selectedId = id;

  listEl.querySelectorAll("button").forEach(function (button) {
    const isSelected = button.dataset.exhibitId === id;
    button.setAttribute("aria-pressed", String(isSelected));
    // aria-current marks the one item in a set the visitor is on. The stylesheet
    // uses it too, so the highlight and the announcement cannot disagree.
    button.closest(".exhibit").setAttribute("aria-current", String(isSelected));
  });

  drawPlan();
  announce(id);
}

function announce(id) {
  const ordered = exhibitsInWalkOrder();
  const index = ordered.findIndex(function (exhibit) {
    return exhibit.id === id;
  });

  if (index === -1) {
    statusEl.textContent = "No exhibit chosen.";
    return;
  }

  const exhibit = ordered[index];
  // WHY the wall and the number are both said: the plan shows them, and a
  // person who cannot see the plan should be told the same thing the plan is
  // saying. That is the entire job of this line.
  statusEl.textContent =
    "Exhibit " + (index + 1) + " of " + ordered.length + ", " + exhibit.title +
    ", is on the " + exhibit.wall + " wall.";
}

// WHAT: clicking a panel in the plan selects it too.
// WHY it is an EXTRA and never the only way: a click is a mouse, at a precise
// point, on a picture. The buttons in the list do the same job with a keyboard,
// a screen reader or a voice command. Add pointer shortcuts freely — just never
// let one be the only route to something.
function handlePlanClick(event) {
  const box = canvas.getBoundingClientRect();
  // The canvas is displayed at whatever width the layout gives it, but it
  // draws in its own 720-wide coordinate system. This scales the click from one
  // to the other. Forgetting it is why hit tests are "off by a bit" on phones.
  const x = (event.clientX - box.left) * (W / box.width);
  const y = (event.clientY - box.top) * (H / box.height);

  let closest = null;
  let closestDistance = Infinity;
  exhibitsInWalkOrder().forEach(function (exhibit) {
    const spot = positionOf(exhibit);
    const distance = Math.hypot(spot.x - x, spot.y - y);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = exhibit;
    }
  });

  // Only count it as a hit if the click was actually near a panel, so clicking
  // the empty middle of the room does not select the least-far-away exhibit.
  if (closest && closestDistance < 48) select(closest.id);
}


// ---------- 7. START ----------

function init() {
  COLORS = exhibitColors();

  renderList();
  renderLegend();
  renderWalk();
  drawPlan();
  announce(null);

  // One listener on the list rather than one per button: the buttons are
  // created by JavaScript, and a listener on the parent keeps working however
  // many of them come and go.
  listEl.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;
    select(button.dataset.exhibitId);
  });

  canvas.addEventListener("click", handlePlanClick);

  // WHAT: redraw if the visitor switches between a light and dark system theme.
  // WHY: the colours came out of the stylesheet, so they can change underneath
  // a canvas that has already been painted. HTML and CSS restyle themselves;
  // anything drawn on a canvas has to be told.
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      COLORS = exhibitColors();
      renderLegend();
      drawPlan();
    });
  }
}

init();
