import { loadProjects } from "./data.js";
import {
  createEmptyState,
  createProjectCard,
  projectMatches,
  setActiveNav,
  sortProjects,
  uniqueValues,
} from "./ui.js";

const FILTER_KEYS = ["category", "tech", "difficulty", "year", "term", "type", "program"];

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
  button.addEventListener("click", () => {
    const wasActive = button.getAttribute("aria-pressed") === "true";
    onToggle(!wasActive);
  });
  return button;
}

function renderChipGroup({ mount, title, values, selectedSet, onToggle }) {
  const group = document.createElement("section");
  group.className = "filter-group";
  const heading = document.createElement("h3");
  heading.textContent = title;
  group.appendChild(heading);

  const chips = document.createElement("div");
  chips.className = "chips";
  values.forEach((value) => {
    chips.appendChild(
      makeChip(value, selectedSet.has(String(value)), (enabled) => {
        onToggle(String(value), enabled);
      })
    );
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

  loadProjects()
    .then((projects) => {
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

      function rerenderFilterPanels() {
        dom.groups.innerHTML = "";

        renderChipGroup({
          mount: dom.groups,
          title: "Category",
          values: categoryValues,
          selectedSet: state.category,
          onToggle: (value, enabled) => {
            if (enabled) state.category.add(value);
            else state.category.delete(value);
            apply();
          },
        });

        renderChipGroup({
          mount: dom.groups,
          title: "Tech",
          values: techValues,
          selectedSet: state.tech,
          onToggle: (value, enabled) => {
            if (enabled) state.tech.add(value);
            else state.tech.delete(value);
            apply();
          },
        });

        renderChipGroup({
          mount: dom.groups,
          title: "Difficulty",
          values: difficultyValues,
          selectedSet: state.difficulty,
          onToggle: (value, enabled) => {
            if (enabled) state.difficulty.add(value);
            else state.difficulty.delete(value);
            apply();
          },
        });

        renderChipGroup({
          mount: dom.groups,
          title: "Year",
          values: yearValues,
          selectedSet: state.year,
          onToggle: (value, enabled) => {
            if (enabled) state.year.add(value);
            else state.year.delete(value);
            apply();
          },
        });

        renderChipGroup({
          mount: dom.groups,
          title: "Term",
          values: termValues,
          selectedSet: state.term,
          onToggle: (value, enabled) => {
            if (enabled) state.term.add(value);
            else state.term.delete(value);
            apply();
          },
        });

        renderChipGroup({
          mount: dom.groups,
          title: "Solo / Team",
          values: typeValues,
          selectedSet: state.type,
          onToggle: (value, enabled) => {
            if (enabled) state.type.add(value);
            else state.type.delete(value);
            apply();
          },
        });

        renderChipGroup({
          mount: dom.groups,
          title: "Program",
          values: programValues,
          selectedSet: state.program,
          onToggle: (value, enabled) => {
            if (enabled) state.program.add(value);
            else state.program.delete(value);
            apply();
          },
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
        rerenderFilterPanels();
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
      dom.grid.appendChild(createEmptyState(error.message));
      dom.empty.hidden = true;
      dom.count.textContent = "0 projects";
    });
}

init();
