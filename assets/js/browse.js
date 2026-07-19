import { loadProjects } from "./data.js";
import {
  createEmptyState,
  createProjectCard,
  createProjectCardSkeleton,
  projectMatches,
  setActiveNav,
  sortProjects,
  uniqueValues,
} from "./ui.js";

const FILTER_KEYS = ["category", "tech", "difficulty", "year", "term", "type", "program", "cohort"];

// Fixed display order for the cohort picker (School Year before Camp), not alphabetical.
const COHORT_ORDER = ["25-26 School Year", "2026 Summer Camp"];

function blankState() {
  return {
    q: "",
    sort: "newest",
    category: new Set(),
    tech: new Set(),
    difficulty: new Set(),
    year: new Set(),
    term: new Set(),
    type: new Set(),
    program: new Set(),
    cohort: new Set(),
  };
}

function readStateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const state = blankState();
  state.q = params.get("q") || "";
  state.sort = params.get("sort") || "newest";
  FILTER_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) {
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => state[key].add(item));
    }
  });
  return state;
}

function writeStateToQuery(state) {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.sort && state.sort !== "newest") params.set("sort", state.sort);
  FILTER_KEYS.forEach((key) => {
    if (state[key].size > 0) {
      params.set(key, Array.from(state[key]).join(","));
    }
  });
  const query = params.toString();
  const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState({}, "", next);
}

function applySelectValue(select, value) {
  if ([...select.options].some((opt) => opt.value === value)) {
    select.value = value;
  } else {
    select.value = "newest";
  }
}

function makeChip(value, selected, onToggle) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = value;
  button.setAttribute("aria-pressed", selected ? "true" : "false");
  button.dataset.value = value;
  button.addEventListener("click", () => {
    const wasActive = button.getAttribute("aria-pressed") === "true";
    onToggle(!wasActive);
  });
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
    const chip = makeChip(value, selectedSet.has(String(value)), (enabled) => {
      onToggle(String(value), enabled);
    });
    chip.dataset.filter = filterKey;
    chips.appendChild(chip);
  });
  group.appendChild(chips);
  mount.appendChild(group);
}

function updateControlsFromState(state, dom) {
  dom.search.value = state.q;
  applySelectValue(dom.sort, state.sort);
}

function filterAndSort(projects, state) {
  const filtered = projects.filter((project) => projectMatches(project, state));
  return sortProjects(filtered, state.sort);
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
    grid: document.getElementById("browse-grid"),
    count: document.getElementById("result-count"),
    empty: document.getElementById("browse-empty"),
  };

  if (!dom.grid) return;

  function renderLoadingSkeletons(count = 6) {
    dom.grid.innerHTML = "";
    dom.grid.setAttribute("aria-busy", "true");
    for (let index = 0; index < count; index += 1) {
      dom.grid.appendChild(createProjectCardSkeleton());
    }
  }

  // Filter panel toggle
  if (dom.filterToggle && dom.filterPanel) {
    dom.filterToggle.addEventListener("click", () => {
      const isOpen = !dom.filterPanel.hidden;
      dom.filterPanel.hidden = isOpen;
      dom.filterToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
      dom.filterToggle.textContent = isOpen ? "Filters \u25be" : "Filters \u25b4";
    });
  }

  const state = readStateFromQuery();
  renderLoadingSkeletons();
  dom.count.textContent = "Loading projects…";

  loadProjects()
    .then((projects) => {
      dom.grid.innerHTML = "";
      dom.grid.setAttribute("aria-busy", "false");
      const cardsById = new Map();
      projects.forEach((project) => {
        const card = createProjectCard(project, { showFeatured: true });
        cardsById.set(project.id, card);
        dom.grid.appendChild(card);
      });

      const categoryValues = uniqueValues(projects, "category").sort();
      const techValues = uniqueValues(projects, "tech").sort();
      const difficultyValues = uniqueValues(projects, "difficulty").sort((a, b) => {
        const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
        return (order[a] ?? 99) - (order[b] ?? 99);
      });
      const yearValues = uniqueValues(projects, "year")
        .map((value) => String(value))
        .sort((a, b) => Number(b) - Number(a));
      const termValues = uniqueValues(projects, "term").sort();
      const typeValues = uniqueValues(projects, "type").sort();
      const programValues = uniqueValues(projects, "program").sort();
      const cohortValues = uniqueValues(projects, "cohort").sort((a, b) => {
        const order = COHORT_ORDER.indexOf(a) - COHORT_ORDER.indexOf(b);
        return order !== 0 ? order : a.localeCompare(b);
      });

      // Render filter panels once on load
      dom.groups.innerHTML = "";
      const filterConfig = [
        { title: "Class / Camp", key: "cohort", values: cohortValues },
        { title: "Category", key: "category", values: categoryValues },
        { title: "Tech", key: "tech", values: techValues },
        { title: "Difficulty", key: "difficulty", values: difficultyValues },
        { title: "Year", key: "year", values: yearValues },
        { title: "Term", key: "term", values: termValues },
        { title: "Solo / Team", key: "type", values: typeValues },
        { title: "Program", key: "program", values: programValues }
      ];

      filterConfig.forEach(cfg => {
        renderChipGroup({
          mount: dom.groups,
          title: cfg.title,
          filterKey: cfg.key,
          values: cfg.values,
          selectedSet: state[cfg.key],
          onToggle: (value, enabled) => {
            if (enabled) state[cfg.key].add(value);
            else state[cfg.key].delete(value);
            apply();
          }
        });
      });

      function updateChipsFromState() {
        const chips = dom.groups.querySelectorAll(".chip");
        chips.forEach((chip) => {
          const key = chip.dataset.filter;
          const val = chip.dataset.value;
          const selected = state[key].has(val);
          chip.setAttribute("aria-pressed", selected ? "true" : "false");
        });
      }

      function apply() {
        updateControlsFromState(state, dom);
        const filteredSorted = filterAndSort(projects, state);
        const visibleIds = new Set(filteredSorted.map((project) => project.id));

        const frag = document.createDocumentFragment();

        filteredSorted.forEach((project) => {
          const card = cardsById.get(project.id);
          if (!card) return;
          card.hidden = false;
          card.removeAttribute("aria-hidden");
          frag.appendChild(card);
        });

        projects.forEach((project) => {
          if (visibleIds.has(project.id)) return;
          const card = cardsById.get(project.id);
          if (!card) return;
          card.hidden = true;
          card.setAttribute("aria-hidden", "true");
          frag.appendChild(card);
        });

        dom.grid.appendChild(frag);

        dom.count.textContent = `${filteredSorted.length} project${filteredSorted.length === 1 ? "" : "s"}`;

        if (filteredSorted.length === 0) {
          dom.empty.hidden = false;
        } else {
          dom.empty.hidden = true;
        }

        writeStateToQuery(state);
        updateChipsFromState();
      }

      dom.search.addEventListener("input", () => {
        state.q = dom.search.value.trim();
        apply();
      });

      dom.sort.addEventListener("change", () => {
        state.sort = dom.sort.value;
        apply();
      });

      dom.clear.addEventListener("click", () => {
        const reset = blankState();
        state.q = reset.q;
        state.sort = reset.sort;
        FILTER_KEYS.forEach((key) => {
          state[key].clear();
        });
        apply();
      });

      apply();
    })
    .catch((error) => {
      dom.grid.innerHTML = "";
      dom.grid.setAttribute("aria-busy", "false");
      dom.grid.appendChild(createEmptyState(error.message));
      dom.empty.hidden = true;
      dom.count.textContent = "0 projects";
    });
}

init();
