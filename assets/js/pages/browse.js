import { loadProjects } from "../data.js";
import {
  createEmptyState,
  createLikeButton,
  projectAction,
  projectMatches,
  projectUrl,
  setActiveNav,
  sortProjects,
  uniqueValues,
} from "../ui.js";

// One scrolling page laid out like an app store: a side-scrolling feature carousel of the
// newest work, then a side-scrolling list shelf per collection (three app rows per column).
// Any search, filter, or collection pick swaps the shelves for a single results list.

const FILTER_KEYS = ["category", "tech", "difficulty", "year", "term", "type", "program", "cohort"];
const CREATOR_GROUPS = {
  student: { title: "Students", plural: "student projects" },
  teacher: { title: "Teacher Studio", plural: "teacher projects" },
};

// Collections map display names onto manifest `category` values.
const COLLECTIONS = [
  { title: "Games", symbol: "🎮", categories: ["Game"], description: "Adventures, puzzles, racers, and arcade experiments." },
  { title: "3D Worlds", symbol: "🧊", categories: ["3D"], description: "Interactive models, environments, and 3D creations." },
  { title: "Simulations", symbol: "⚙️", categories: ["Simulation"], description: "Systems, experiments, and interactive ideas." },
  { title: "Animation", symbol: "▶", categories: ["Animation"], description: "Stories, motion studies, and animated scenes." },
  { title: "Music", symbol: "♫", categories: ["Music"], description: "Playable instruments, rhythm tools, and sound experiments." },
  { title: "Web & Art", symbol: "✦", categories: ["Web", "Art"], description: "Websites, visual designs, and creative digital work." },
];
const FEATURE_SIZE = 6;
const SHELF_SIZE = 15;
const PAGE_SIZE = 24;
// The store's one-word action pill, from ui.js's longer launch labels.
const SHORT_ACTION = { "Play game": "Play", "Explore 3D": "Explore", Watch: "Watch", "Open project": "Open" };
const EYEBROW = { Game: "Game", "3D": "3D world", Simulation: "Simulation", Animation: "Animation", Music: "Music", Web: "Website", Art: "Art" };

// Fixed display order for the cohort picker (School Year before Camp), not alphabetical.
const COHORT_ORDER = ["25-26 School Year", "2026 Summer Camp"];
const FILTER_LABELS = {
  category: "Collection",
  tech: "Tech",
  difficulty: "Level",
  year: "Year",
  term: "Term",
  type: "Team",
  program: "Program",
  cohort: "Class",
};

function readCreatorFromQuery() {
  return new URLSearchParams(window.location.search).get("creator") === "teacher" ? "teacher" : "student";
}

function blankState() {
  const state = { q: "", sort: "newest" };
  FILTER_KEYS.forEach((key) => { state[key] = new Set(); });
  return state;
}

function readStateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const state = blankState();
  state.q = params.get("q") || "";
  state.sort = params.get("sort") || "newest";
  FILTER_KEYS.forEach((key) => {
    (params.get(key) || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => state[key].add(item));
  });
  return state;
}

function writeStateToQuery(state, creatorGroup) {
  const params = new URLSearchParams();
  if (creatorGroup === "teacher") params.set("creator", "teacher");
  if (state.q) params.set("q", state.q);
  if (state.sort && state.sort !== "newest") params.set("sort", state.sort);
  FILTER_KEYS.forEach((key) => {
    if (state[key].size > 0) params.set(key, Array.from(state[key]).join(","));
  });
  const query = params.toString();
  const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState({}, "", next + window.location.hash);
}

function plural(count, word = "project") {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function setsMatch(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function makeChip(value, selected, onToggle) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = value;
  button.setAttribute("aria-pressed", selected ? "true" : "false");
  button.dataset.value = value;
  button.addEventListener("click", () => onToggle(button.getAttribute("aria-pressed") !== "true"));
  return button;
}

function renderChipGroup({ mount, title, filterKey, values, selectedSet, onToggle }) {
  const group = document.createElement("section");
  group.className = "filter-group";
  const heading = document.createElement("h3");
  heading.textContent = title;
  group.appendChild(heading);
  const chips = document.createElement("div");
  chips.className = "chips";
  values.forEach((value) => {
    const chip = makeChip(value, selectedSet.has(String(value)), (enabled) => onToggle(String(value), enabled));
    chip.dataset.filter = filterKey;
    chips.appendChild(chip);
  });
  group.appendChild(chips);
  mount.appendChild(group);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function launchHref(project) {
  return project.appUrl || projectUrl(project.id);
}

function appIcon(project, className = "aps-icon") {
  const image = el("img", className);
  image.loading = "lazy";
  image.decoding = "async";
  image.src = project.thumbnail;
  image.alt = "";
  return image;
}

// The pill on the right of every row: launches the project (Play / Explore / Watch / Open).
function getButton(project) {
  const launches = Boolean(project.appUrl);
  const action = projectAction(project);
  const link = el("a", "aps-get", launches ? SHORT_ACTION[action.label] || "Open" : "View");
  link.href = launchHref(project);
  link.setAttribute("aria-label", `${launches ? action.label : "View project"}: ${project.title} by ${project.student}`);
  if (launches) {
    link.dataset.memoryPlay = "";
    link.dataset.memoryId = project.id;
    link.dataset.memoryTitle = project.title || "";
    link.dataset.memoryBy = project.student || "";
    if (project.thumbnail) link.dataset.memoryThumb = new URL(project.thumbnail, document.baseURI).href;
  }
  return link;
}

// One app-store row: icon, name, "by <student>", heart, and the action pill.
// The name opens the project page; the pill launches the project.
function createAppRow(project) {
  const row = el("article", "aps-row");
  row.dataset.id = project.id;
  row.dataset.category = project.category;

  const main = el("a", "aps-row-main");
  main.href = projectUrl(project.id);
  main.setAttribute("aria-label", `About ${project.title} by ${project.student}`);
  const text = el("span", "aps-row-text");
  text.append(el("span", "aps-row-title", project.title), el("span", "aps-row-sub", `by ${project.student}`));
  main.append(appIcon(project), text);

  const action = el("div", "aps-row-action");
  action.appendChild(getButton(project));
  if (project.lessonUrl) {
    const lesson = el("a", "aps-get-note aps-get-lesson", "How it works");
    lesson.href = project.lessonUrl;
    lesson.setAttribute("aria-label", `Learn how games like ${project.title} work`);
    action.appendChild(lesson);
  } else if (project.tech?.[0]) {
    action.appendChild(el("span", "aps-get-note", project.tech[0]));
  }

  const like = createLikeButton(project);
  like.classList.add("aps-like");
  row.append(main, like, action);
  return row;
}

// A feature card: eyebrow, name and maker above a wide screenshot that launches the project.
function createFeatureCard(project) {
  const card = el("article", "aps-feature");
  card.dataset.category = project.category;
  const head = el("a", "aps-feature-head");
  head.href = projectUrl(project.id);
  head.append(
    el("span", "aps-feature-eyebrow", `New ${EYEBROW[project.category] || "project"}`),
    el("span", "aps-feature-title", project.title),
    el("span", "aps-feature-sub", `by ${project.student}`),
  );
  const media = el("a", "aps-feature-media");
  media.href = launchHref(project);
  media.tabIndex = -1;
  media.setAttribute("aria-hidden", "true");
  media.appendChild(appIcon(project, "aps-feature-shot"));
  const bar = el("div", "aps-feature-bar");
  // The guard can't see the screenshot under this glass; the CSS keeps white text ≥4.5:1 over any image.
  bar.setAttribute("data-contrast-guard-skip", "");
  const name = el("span", "aps-feature-bar-text");
  name.append(el("strong", "", project.title), el("span", "", project.tech?.[0] || project.category));
  bar.append(appIcon(project, "aps-icon aps-icon-sm"), name, getButton(project));
  const like = createLikeButton(project);
  like.classList.add("aps-like", "aps-like-float");
  card.append(head, media, bar, like);
  return card;
}

function createRowSkeleton() {
  const row = el("div", "aps-row aps-row-skeleton");
  row.setAttribute("aria-hidden", "true");
  row.innerHTML = '<span class="aps-icon"></span><span class="aps-row-text"><span></span><span></span></span><span class="aps-get"></span>';
  return row;
}

// Prev/next buttons for pointer devices; touch users just swipe.
function attachScroller(row, head) {
  const nav = el("div", "aps-scroll-nav");
  const prev = el("button", "aps-scroll-btn");
  const next = el("button", "aps-scroll-btn");
  prev.type = next.type = "button";
  prev.innerHTML = '<span aria-hidden="true">‹</span>';
  next.innerHTML = '<span aria-hidden="true">›</span>';
  prev.setAttribute("aria-label", "Scroll back");
  next.setAttribute("aria-label", "Scroll forward");
  const page = (dir) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollBy({ left: dir * row.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };
  prev.addEventListener("click", () => page(-1));
  next.addEventListener("click", () => page(1));
  const sync = () => {
    prev.disabled = row.scrollLeft <= 2;
    next.disabled = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2;
    nav.hidden = prev.disabled && next.disabled;
  };
  row.addEventListener("scroll", sync, { passive: true });
  new ResizeObserver(sync).observe(row);
  nav.append(prev, next);
  head.appendChild(nav);
}

function init() {
  setActiveNav();

  const dom = {
    search: document.getElementById("search-input"),
    sort: document.getElementById("sort-select"),
    clear: document.getElementById("clear-filters"),
    filterToggle: document.getElementById("filter-toggle"),
    filterPanel: document.getElementById("filter-panel"),
    groups: document.getElementById("filter-groups"),
    activeSummary: document.getElementById("active-filter-summary"),
    creatorPresets: [...document.querySelectorAll("[data-creator-preset]")],
    creatorCounts: [...document.querySelectorAll("[data-creator-count]")],
    collectionPills: document.getElementById("collection-pills"),
    shelves: document.getElementById("showcase-shelves"),
    results: document.getElementById("showcase-results"),
    resultsTitle: document.getElementById("showcase-results-title"),
    resultsContext: document.getElementById("showcase-results-context"),
    grid: document.getElementById("browse-grid"),
    count: document.getElementById("result-count"),
    empty: document.getElementById("browse-empty"),
    moreWrap: document.getElementById("showcase-more-wrap"),
    more: document.getElementById("showcase-more"),
    launcher: document.querySelector(".showcase-launcher"),
    tabs: [...document.querySelectorAll("[data-aps-tab]")],
  };

  if (!dom.grid || !dom.shelves) return;

  for (let index = 0; index < 9; index += 1) {
    dom.shelves.appendChild(createRowSkeleton());
  }

  const state = readStateFromQuery();
  let activeCreator = readCreatorFromQuery();
  let visibleLimit = PAGE_SIZE;

  dom.filterToggle?.addEventListener("click", () => {
    const isOpen = !dom.filterPanel.hidden;
    dom.filterPanel.hidden = isOpen;
    dom.filterToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
    updateFilterToggle();
  });

  function advancedFilterCount() {
    return FILTER_KEYS.filter((key) => key !== "category").reduce((sum, key) => sum + state[key].size, 0);
  }

  function hasCustomState() {
    return Boolean(state.q) || state.sort !== "newest" || FILTER_KEYS.some((key) => state[key].size > 0);
  }

  function updateFilterToggle() {
    if (!dom.filterToggle || !dom.filterPanel) return;
    const count = advancedFilterCount();
    dom.filterToggle.textContent = `More filters${count ? ` (${count})` : ""} ${dom.filterPanel.hidden ? "▾" : "▴"}`;
  }

  function resetState() {
    const reset = blankState();
    state.q = reset.q;
    state.sort = reset.sort;
    FILTER_KEYS.forEach((key) => state[key].clear());
  }

  loadProjects()
    .then((projects) => {
      dom.shelves.setAttribute("aria-busy", "false");
      // Results rows are built once and reordered; shelves build their own set.
      const gridCards = new Map(projects.map((project) => [project.id, createAppRow(project)]));
      dom.grid.append(...gridCards.values());

      const byCreator = (creator) => projects.filter((project) => project.creatorGroup === creator);
      const inCollection = (list, collection) => list.filter((project) => collection.categories.includes(project.category));
      const activeCollection = () => COLLECTIONS.find((c) => setsMatch(state.category, new Set(c.categories)));

      dom.creatorCounts.forEach((el) => {
        el.textContent = byCreator(el.dataset.creatorCount).length;
      });

      function renderCollectionPills() {
        const source = byCreator(activeCreator);
        dom.collectionPills.replaceChildren();
        const options = [{ title: "All", categories: [] }, ...COLLECTIONS];
        options.forEach((collection) => {
          const count = collection.categories.length ? inCollection(source, collection).length : source.length;
          if (count === 0) return;
          const pill = document.createElement("button");
          pill.type = "button";
          pill.className = "sc-pill";
          pill.dataset.categories = collection.categories.join(",");
          pill.innerHTML = `${collection.title} <span class="sc-pill-count">${count}</span>`;
          pill.addEventListener("click", () => selectCollection(collection));
          dom.collectionPills.appendChild(pill);
        });
      }

      function updatePills() {
        dom.creatorPresets.forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.creatorPreset === activeCreator ? "true" : "false");
        });
        dom.collectionPills.querySelectorAll(".sc-pill").forEach((pill) => {
          const values = new Set((pill.dataset.categories || "").split(",").filter(Boolean));
          pill.setAttribute("aria-pressed", setsMatch(state.category, values) ? "true" : "false");
        });
      }

      function renderAdvancedFilters() {
        const source = byCreator(activeCreator);
        const difficultyOrder = { Beginner: 0, Intermediate: 1, Advanced: 2 };
        const filterConfig = [
          { title: "Class / Camp", key: "cohort", values: uniqueValues(source, "cohort").sort((a, b) => (COHORT_ORDER.indexOf(a) - COHORT_ORDER.indexOf(b)) || a.localeCompare(b)) },
          { title: "Tech", key: "tech", values: uniqueValues(source, "tech").sort() },
          { title: "Difficulty", key: "difficulty", values: uniqueValues(source, "difficulty").sort((a, b) => (difficultyOrder[a] ?? 99) - (difficultyOrder[b] ?? 99)) },
          { title: "Year", key: "year", values: uniqueValues(source, "year").map(String).sort((a, b) => Number(b) - Number(a)) },
          { title: "Term", key: "term", values: uniqueValues(source, "term").sort() },
          { title: "Solo / Team", key: "type", values: uniqueValues(source, "type").sort() },
          { title: "Program", key: "program", values: uniqueValues(source, "program").sort() },
        ];
        dom.groups.replaceChildren();
        filterConfig.filter((cfg) => cfg.values.length > 0).forEach((cfg) => {
          renderChipGroup({
            mount: dom.groups,
            title: cfg.title,
            filterKey: cfg.key,
            values: cfg.values,
            selectedSet: state[cfg.key],
            onToggle: (value, enabled) => {
              if (enabled) state[cfg.key].add(value);
              else state[cfg.key].delete(value);
              apply(true);
            },
          });
        });
      }

      function buildShelf({ id, title, description, list, total, onSeeAll, variant = "list" }) {
        const shelf = el("section", `showcase-shelf aps-shelf aps-shelf-${variant}`);
        shelf.setAttribute("aria-labelledby", id);
        const head = el("header", "shelf-head");
        const heading = el("h2");
        heading.id = id;
        if (onSeeAll) {
          // Like the store, the shelf title itself is the "see all" link.
          const more = el("button", "aps-shelf-title");
          more.type = "button";
          more.innerHTML = `<span></span><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7"/></svg>`;
          more.firstChild.textContent = title;
          more.setAttribute("aria-label", `${title}: see all ${total}`);
          more.addEventListener("click", onSeeAll);
          heading.appendChild(more);
        } else {
          heading.textContent = title;
        }
        const titles = el("div", "shelf-titles");
        titles.append(heading, el("p", "", description));
        head.appendChild(titles);
        const row = el("div", `aps-scroll aps-scroll-${variant}`);
        row.setAttribute("role", "list");
        list.forEach((project) => {
          const item = variant === "feature" ? createFeatureCard(project) : createAppRow(project);
          item.setAttribute("role", "listitem");
          row.appendChild(item);
        });
        attachScroller(row, head);
        shelf.append(head, row);
        return shelf;
      }

      function renderShelves() {
        const source = sortProjects(byCreator(activeCreator), "newest");
        const frag = document.createDocumentFragment();
        const creatorLabel = activeCreator === "teacher" ? "teacher" : "student";

        frag.appendChild(buildShelf({
          id: "shelf-newest",
          title: "Just added",
          description: `The newest ${creatorLabel} projects, fresh from class.`,
          list: source.slice(0, FEATURE_SIZE),
          total: source.length,
          onSeeAll: () => selectCollection({ categories: [] }, { forceGrid: true }),
          variant: "feature",
        }));

        COLLECTIONS.forEach((collection, index) => {
          const list = inCollection(source, collection);
          if (!list.length) return;
          frag.appendChild(buildShelf({
            id: `shelf-${index}`,
            title: collection.title,
            description: collection.description,
            list: list.slice(0, SHELF_SIZE),
            total: list.length,
            onSeeAll: () => selectCollection(collection),
          }));
        });

        if (activeCreator === "student") {
          const teacher = sortProjects(byCreator("teacher"), "newest");
          if (teacher.length) {
            frag.appendChild(buildShelf({
              id: "shelf-teacher",
              title: "Teacher Studio",
              description: "Classroom examples and original projects made by Mr. Scandrett.",
              list: teacher.slice(0, SHELF_SIZE),
              total: teacher.length,
              onSeeAll: () => switchCreator("teacher"),
              variant: "teacher",
            }));
          }
        }
        dom.shelves.replaceChildren(frag);
      }

      // "Browse all" with nothing else set would otherwise fall straight back to shelves.
      let forceGrid = false;

      function selectCollection(collection, { forceGrid: force = false } = {}) {
        state.category.clear();
        collection.categories.forEach((value) => state.category.add(value));
        forceGrid = force;
        apply(true);
        dom.launcher.querySelector(".sc-controls")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      function switchCreator(creator) {
        if (!CREATOR_GROUPS[creator] || creator === activeCreator) return;
        activeCreator = creator;
        resetState();
        forceGrid = false;
        renderCollectionPills();
        renderAdvancedFilters();
        renderShelves();
        apply(true);
        dom.launcher.querySelector(".sc-controls")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      function renderActiveSummary() {
        dom.activeSummary.replaceChildren();
        const addTag = (text, ariaLabel, onRemove) => {
          const tag = document.createElement("button");
          tag.type = "button";
          tag.className = "active-filter-tag";
          tag.textContent = `${text} ×`;
          tag.setAttribute("aria-label", ariaLabel);
          tag.addEventListener("click", () => { onRemove(); apply(true); });
          dom.activeSummary.appendChild(tag);
        };
        if (state.q) addTag(`Search: “${state.q}”`, `Remove search for ${state.q}`, () => { state.q = ""; });
        FILTER_KEYS.filter((key) => key !== "category").forEach((key) => {
          state[key].forEach((value) => {
            addTag(`${FILTER_LABELS[key]}: ${value}`, `Remove ${FILTER_LABELS[key]} filter ${value}`, () => state[key].delete(value));
          });
        });
        if (dom.activeSummary.children.length) {
          const label = document.createElement("span");
          label.className = "active-filter-label";
          label.textContent = "Active:";
          dom.activeSummary.prepend(label);
        }
        dom.activeSummary.hidden = !dom.activeSummary.children.length;
      }

      const surprise = document.getElementById("surprise-project");
      const discoveryCount = document.getElementById("discovery-count");
      surprise?.addEventListener("click", () => {
        const choices = byCreator(activeCreator).filter((project) => projectMatches(project, state));
        if (!choices.length) return;
        const project = choices[Math.floor(Math.random() * choices.length)];
        window.location.assign(launchHref(project));
      });
      document.getElementById("empty-reset")?.addEventListener("click", () => {
        dom.clear.click();
        dom.search.focus();
      });

      function apply(resetLimit = false) {
        const discoveryPool = byCreator(activeCreator).filter((project) => projectMatches(project, state));
        if (surprise) surprise.disabled = discoveryPool.length === 0;
        if (discoveryCount) discoveryCount.textContent = `${plural(discoveryPool.length)} to discover`;
        if (resetLimit) visibleLimit = PAGE_SIZE;
        dom.search.value = state.q;
        dom.sort.value = [...dom.sort.options].some((opt) => opt.value === state.sort) ? state.sort : "newest";

        const showGrid = forceGrid || hasCustomState();
        dom.shelves.hidden = showGrid;
        dom.results.hidden = !showGrid;
        if (dom.launcher) dom.launcher.dataset.gallery = activeCreator;

        if (showGrid) {
          const matches = sortProjects(byCreator(activeCreator).filter((project) => projectMatches(project, state)), state.sort);
          const shown = matches.slice(0, visibleLimit);
          const shownIds = new Set(shown.map((project) => project.id));
          const frag = document.createDocumentFragment();
          shown.forEach((project) => {
            const card = gridCards.get(project.id);
            card.hidden = false;
            card.removeAttribute("aria-hidden");
            frag.appendChild(card);
          });
          gridCards.forEach((card, id) => {
            if (shownIds.has(id)) return;
            card.hidden = true;
            card.setAttribute("aria-hidden", "true");
            frag.appendChild(card);
          });
          dom.grid.appendChild(frag);

          const collection = activeCollection();
          dom.resultsContext.textContent = CREATOR_GROUPS[activeCreator].title;
          dom.resultsTitle.textContent = state.q ? `Results for “${state.q}”` : collection ? collection.title : "All projects";
          dom.grid.setAttribute("aria-label", `${CREATOR_GROUPS[activeCreator].title}: ${dom.resultsTitle.textContent}`);
          dom.count.textContent = matches.length > shown.length
            ? `Showing ${shown.length} of ${matches.length}`
            : plural(matches.length);
          const remaining = matches.length - shown.length;
          dom.moreWrap.hidden = remaining <= 0;
          dom.more.textContent = `Show more projects (${remaining} left)`;
          dom.empty.hidden = matches.length > 0;
        }

        writeStateToQuery(state, activeCreator);
        dom.groups.querySelectorAll(".chip").forEach((chip) => {
          chip.setAttribute("aria-pressed", state[chip.dataset.filter].has(chip.dataset.value) ? "true" : "false");
        });
        updatePills();
        updateTabs(showGrid);
        renderActiveSummary();
        updateFilterToggle();
        dom.clear.disabled = !(hasCustomState() || forceGrid);
      }

      dom.creatorPresets.forEach((button) => {
        button.addEventListener("click", () => switchCreator(button.dataset.creatorPreset));
      });

      // Phone tab bar: Discover / Games / 3D / Studio / Search.
      function updateTabs(showGrid) {
        const only = state.category.size === 1 && FILTER_KEYS.every((key) => key === "category" || state[key].size === 0) && !state.q ? [...state.category][0] : null;
        let current = "search";
        if (activeCreator === "teacher" && !showGrid) current = "teacher";
        else if (!showGrid) current = "discover";
        else if (activeCreator === "student" && (only === "Game" || only === "3D")) current = only;
        dom.tabs.forEach((tab) => {
          if (tab.dataset.apsTab === current) tab.setAttribute("aria-current", "page");
          else tab.removeAttribute("aria-current");
        });
      }
      dom.tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const name = tab.dataset.apsTab;
          if (name === "search") {
            dom.search.scrollIntoView({ behavior: "smooth", block: "center" });
            dom.search.focus({ preventScroll: true });
            return;
          }
          if (name === "teacher") {
            switchCreator("teacher");
            return;
          }
          if (activeCreator !== "student") switchCreator("student");
          if (name === "discover") {
            resetState();
            forceGrid = false;
            apply(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
          const collection = COLLECTIONS.find((c) => c.categories.length === 1 && c.categories[0] === name);
          if (collection) selectCollection(collection);
        });
      });

      dom.search.addEventListener("input", () => {
        state.q = dom.search.value.trim();
        apply(true);
      });

      dom.sort.addEventListener("change", () => {
        state.sort = dom.sort.value;
        apply(true);
      });

      dom.clear.addEventListener("click", () => {
        resetState();
        forceGrid = false;
        apply(true);
      });

      dom.more.addEventListener("click", () => {
        visibleLimit += PAGE_SIZE;
        apply(false);
        dom.grid.querySelector(`.aps-row:nth-child(${visibleLimit - PAGE_SIZE + 1})`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      renderCollectionPills();
      renderAdvancedFilters();
      renderShelves();

      if (advancedFilterCount() > 0) {
        dom.filterPanel.hidden = false;
        dom.filterToggle.setAttribute("aria-expanded", "true");
      }
      apply(true);
    })
    .catch((error) => {
      dom.shelves.setAttribute("aria-busy", "false");
      dom.shelves.replaceChildren(createEmptyState(error.message));
    });
}

init();
