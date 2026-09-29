import { loadProjects } from "../data.js";
import {
  createEmptyState,
  createProjectCard,
  createProjectCardSkeleton,
  projectMatches,
  setActiveNav,
  sortProjects,
  uniqueValues,
} from "../ui.js";

// One scrolling page: with no search/filters the page shows a shelf per collection;
// any search, filter, or collection pick swaps the shelves for a single results grid.

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
const SHELF_SIZE = 4;
const PAGE_SIZE = 12;

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
  };

  if (!dom.grid || !dom.shelves) return;

  for (let index = 0; index < SHELF_SIZE * 2; index += 1) {
    dom.shelves.appendChild(createProjectCardSkeleton());
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
      const cardFor = (project) => {
        const card = createProjectCard(project, { showFeatured: true, directLaunch: true, showDetailsLink: true, modelPreview: false });
        card.classList.add("is-visible");
        return card;
      };
      // Results-grid cards are built once and reordered; shelves build their own small set.
      const gridCards = new Map(projects.map((project) => [project.id, cardFor(project)]));
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
          pill.innerHTML = `${collection.symbol ? `<span aria-hidden="true">${collection.symbol}</span> ` : ""}${collection.title} <span class="sc-pill-count">${count}</span>`;
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

      function buildShelf({ id, title, symbol, description, list, total, seeAllLabel, onSeeAll, variant }) {
        const shelf = document.createElement("section");
        shelf.className = `showcase-shelf${variant ? ` shelf-${variant}` : ""}`;
        shelf.setAttribute("aria-labelledby", id);
        const head = document.createElement("header");
        head.className = "shelf-head";
        head.innerHTML = `<div><h2 id="${id}"><span class="shelf-symbol" aria-hidden="true">${symbol}</span>${title}</h2><p>${description}</p></div>`;
        if (onSeeAll && total > list.length) {
          const more = document.createElement("button");
          more.type = "button";
          more.className = "shelf-see-all";
          more.textContent = `${seeAllLabel || "See all"} ${total} →`;
          more.setAttribute("aria-label", `See all ${total} ${title} projects`);
          more.addEventListener("click", onSeeAll);
          head.appendChild(more);
        }
        const row = document.createElement("div");
        row.className = "project-grid shelf-row";
        row.append(...list.map(cardFor));
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
          symbol: "★",
          description: `The newest ${creatorLabel} projects.`,
          list: source.slice(0, SHELF_SIZE),
          total: source.length,
          seeAllLabel: "Browse all",
          onSeeAll: () => selectCollection({ categories: [] }, { forceGrid: true }),
          variant: "newest",
        }));

        COLLECTIONS.forEach((collection, index) => {
          const list = inCollection(source, collection);
          if (!list.length) return;
          frag.appendChild(buildShelf({
            id: `shelf-${index}`,
            title: collection.title,
            symbol: collection.symbol,
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
              symbol: "⌁",
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

      function apply(resetLimit = false) {
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
        renderActiveSummary();
        updateFilterToggle();
        dom.clear.disabled = !(hasCustomState() || forceGrid);
      }

      dom.creatorPresets.forEach((button) => {
        button.addEventListener("click", () => switchCreator(button.dataset.creatorPreset));
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
        dom.grid.querySelector(`.project-card:nth-child(${visibleLimit - PAGE_SIZE + 1})`)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
