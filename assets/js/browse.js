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

const COLLECTION_DESCRIPTIONS = {
  Games: "Play student-built adventures, puzzles, racers, and arcade experiments.",
  "3D Worlds": "Explore interactive models, environments, and three-dimensional creations.",
  Simulations: "Try systems, experiments, and interactive ideas built by students.",
  Animation: "Watch student stories, motion studies, and animated scenes.",
  Music: "Open playable music projects, rhythm tools, and sound experiments.",
  "Web & Art": "Browse websites, visual designs, and creative digital work.",
  Everything: "Browse every published student project in one place.",
  "Find a project": "Search every collection by project name, student, tool, or tag.",
  "Project results": "Your saved search and filter choices are ready."
};

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
    activeSummary: document.getElementById("active-filter-summary"),
    categoryPresets: [...document.querySelectorAll("[data-category-preset]")],
    grid: document.getElementById("browse-grid"),
    count: document.getElementById("result-count"),
    empty: document.getElementById("browse-empty"),
    moreWrap: document.getElementById("showcase-more-wrap"),
    more: document.getElementById("showcase-more"),
    toolbar: document.querySelector(".sc-toolbar-wrap"),
    home: document.getElementById("showcase-home"),
    results: document.getElementById("showcase-results"),
    back: document.getElementById("showcase-back"),
    find: document.getElementById("showcase-find"),
    pageTitle: document.getElementById("showcase-title"),
    instruction: document.getElementById("showcase-instruction"),
    resultsTitle: document.getElementById("showcase-results-title"),
    resultsDescription: document.getElementById("showcase-results-description"),
    resultsSymbol: document.getElementById("showcase-results-symbol"),
    location: document.getElementById("showcase-location"),
    makerTools: document.getElementById("showcase-maker-tools"),
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
      dom.filterToggle.textContent = isOpen ? "More filters \u25be" : "More filters \u25b4";
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
      const PAGE_SIZE = 12;
      let visibleLimit = PAGE_SIZE;
      projects.forEach((project) => {
        const card = createProjectCard(project, { showFeatured: true, directLaunch: true, showDetailsLink: true });
        card.classList.add("is-visible");
        cardsById.set(project.id, card);
        dom.grid.appendChild(card);
      });

      dom.categoryPresets.forEach((button) => {
        const values = (button.dataset.categoryPreset || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        const matches = values.length === 0
          ? projects
          : projects.filter((project) => values.includes(project.category));
        const representativeMatches = matches
          .slice()
          .sort((left, right) => {
            const thumbnailScore = (project) => {
              const path = String(project.thumbnail || "");
              const slug = String(project.id || "").replace(/^app-/, "");
              if (path.includes("/assets/thumbs/showcase/avatar-")) return 0;
              if (project.category === "3D" && path.includes("/assets/thumbs/showcase/") && slug && !path.includes(slug)) return 0;
              if (/\/apps\/[^/]+\/assets\/thumb\.svg$/i.test(path)) return 1;
              if (path.includes("/assets/thumbs/showcase/")) return 3;
              return 2;
            };
            return thumbnailScore(right) - thumbnailScore(left);
          });
        const preview = button.querySelector(".showcase-folder-preview");
        if (preview) {
          preview.replaceChildren();
          representativeMatches.slice(0, 4).forEach((project) => {
            const image = document.createElement("img");
            image.src = project.thumbnail;
            image.alt = "";
            image.loading = "eager";
            image.decoding = "async";
            preview.appendChild(image);
          });
          preview.dataset.items = String(preview.children.length);
        }
        const count = button.querySelector("small");
        if (count) count.textContent = `${matches.length} project${matches.length === 1 ? "" : "s"}`;
        const title = button.dataset.folderTitle || button.querySelector("strong")?.textContent || "Projects";
        button.setAttribute("aria-label", `${title} collection, ${matches.length} projects`);
      });
      if (dom.location) dom.location.textContent = `${projects.length} projects in 7 collections`;

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
            apply(true);
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

      function categoryPresetValues(button) {
        return new Set(
          (button.dataset.categoryPreset || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        );
      }

      function setsMatch(left, right) {
        return left.size === right.size && [...left].every((value) => right.has(value));
      }

      function updateCategoryPresets() {
        dom.categoryPresets.forEach((button) => {
          const selected = setsMatch(state.category, categoryPresetValues(button));
          button.setAttribute("aria-pressed", selected ? "true" : "false");
        });
      }

      function advancedFilterCount() {
        return FILTER_KEYS.filter((key) => key !== "category").reduce((sum, key) => sum + state[key].size, 0);
      }

      function hasCustomState() {
        return Boolean(state.q) || state.sort !== "newest" || FILTER_KEYS.some((key) => state[key].size > 0);
      }

      function openResultsShell(title, symbol, description) {
        if (dom.home) dom.home.hidden = true;
        if (dom.results) dom.results.hidden = false;
        if (dom.back) dom.back.hidden = false;
        if (dom.makerTools) dom.makerTools.hidden = true;
        if (dom.pageTitle) dom.pageTitle.textContent = title;
        if (dom.instruction) dom.instruction.textContent = "Tap a project to open it.";
        if (dom.resultsTitle) dom.resultsTitle.textContent = title;
        if (dom.resultsSymbol) dom.resultsSymbol.textContent = symbol;
        if (dom.resultsDescription) dom.resultsDescription.textContent = description || COLLECTION_DESCRIPTIONS[title] || "Tap a picture to open the project.";
      }

      function resetState() {
        const reset = blankState();
        state.q = reset.q;
        state.sort = reset.sort;
        FILTER_KEYS.forEach((key) => state[key].clear());
      }

      function showHome({ focus = true } = {}) {
        resetState();
        if (dom.home) dom.home.hidden = false;
        if (dom.results) dom.results.hidden = true;
        if (dom.back) dom.back.hidden = true;
        if (dom.makerTools) dom.makerTools.hidden = false;
        if (dom.pageTitle) dom.pageTitle.textContent = "Choose a collection.";
        if (dom.instruction) dom.instruction.textContent = "Then tap a project to play, explore, or watch it.";
        if (dom.toolbar) dom.toolbar.open = false;
        apply(true);
        if (focus) dom.categoryPresets[0]?.focus();
      }

      function openCollection(button) {
        resetState();
        categoryPresetValues(button).forEach((value) => state.category.add(value));
        const title = button.dataset.folderTitle || button.querySelector("strong")?.textContent || "Projects";
        const symbol = button.dataset.folderSymbol || "★";
        openResultsShell(title, symbol, COLLECTION_DESCRIPTIONS[title]);
        apply(true);
        dom.back?.focus();
        dom.results?.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      function updateFilterToggle() {
        if (!dom.filterToggle || !dom.filterPanel) return;
        const count = advancedFilterCount();
        const direction = dom.filterPanel.hidden ? "\u25be" : "\u25b4";
        dom.filterToggle.textContent = `More filters${count ? ` (${count})` : ""} ${direction}`;
      }

      function renderActiveSummary() {
        if (!dom.activeSummary) return;
        dom.activeSummary.innerHTML = "";

        const label = document.createElement("span");
        label.className = "active-filter-label";
        label.textContent = "Active:";
        dom.activeSummary.appendChild(label);

        if (state.q) {
          const searchTag = document.createElement("button");
          searchTag.type = "button";
          searchTag.className = "active-filter-tag";
          searchTag.textContent = `Search: “${state.q}” ×`;
          searchTag.setAttribute("aria-label", `Remove search for ${state.q}`);
          searchTag.addEventListener("click", () => {
            state.q = "";
            apply(true);
            dom.search.focus();
          });
          dom.activeSummary.appendChild(searchTag);
        }

        if (state.category.size > 0) {
          const matchingPreset = dom.categoryPresets.find((button) => setsMatch(state.category, categoryPresetValues(button)));
          const categoryTag = document.createElement("button");
          categoryTag.type = "button";
          categoryTag.className = "active-filter-tag";
          const categoryLabel = matchingPreset?.querySelector("strong")?.textContent || [...state.category].join(", ");
          categoryTag.textContent = `Collection: ${categoryLabel} ×`;
          categoryTag.setAttribute("aria-label", `Remove collection filter ${categoryLabel}`);
          categoryTag.addEventListener("click", () => {
            state.category.clear();
            apply(true);
          });
          dom.activeSummary.appendChild(categoryTag);
        }

        FILTER_KEYS.filter((key) => key !== "category").forEach((key) => {
          state[key].forEach((value) => {
            const tag = document.createElement("button");
            tag.type = "button";
            tag.className = "active-filter-tag";
            tag.textContent = `${FILTER_LABELS[key]}: ${value} ×`;
            tag.setAttribute("aria-label", `Remove ${FILTER_LABELS[key]} filter ${value}`);
            tag.addEventListener("click", () => {
              state[key].delete(value);
              apply(true);
            });
            dom.activeSummary.appendChild(tag);
          });
        });

        const hasTags = dom.activeSummary.querySelector(".active-filter-tag");
        dom.activeSummary.hidden = !hasTags;
      }

      function apply(resetLimit = false) {
        if (resetLimit) visibleLimit = PAGE_SIZE;
        updateControlsFromState(state, dom);
        const filteredSorted = filterAndSort(projects, state);
        const displayedProjects = filteredSorted.slice(0, visibleLimit);
        const visibleIds = new Set(displayedProjects.map((project) => project.id));

        const frag = document.createDocumentFragment();

        displayedProjects.forEach((project) => {
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

        dom.count.textContent = filteredSorted.length > visibleLimit
          ? `Showing ${displayedProjects.length} of ${filteredSorted.length} projects`
          : `${filteredSorted.length} project${filteredSorted.length === 1 ? "" : "s"}`;

        if (dom.moreWrap && dom.more) {
          const remaining = Math.max(0, filteredSorted.length - displayedProjects.length);
          dom.moreWrap.hidden = remaining === 0;
          dom.more.textContent = `Show more projects (${remaining} left)`;
        }

        if (filteredSorted.length === 0) {
          dom.empty.hidden = false;
        } else {
          dom.empty.hidden = true;
        }

        writeStateToQuery(state);
        updateChipsFromState();
        updateCategoryPresets();
        renderActiveSummary();
        updateFilterToggle();
        dom.clear.disabled = !hasCustomState();
      }

      dom.categoryPresets.forEach((button) => {
        button.addEventListener("click", () => {
          openCollection(button);
        });
      });

      dom.back?.addEventListener("click", () => showHome());
      dom.find?.addEventListener("click", () => {
        resetState();
        openResultsShell("Find a project", "⌕", COLLECTION_DESCRIPTIONS["Find a project"]);
        if (dom.toolbar) dom.toolbar.open = true;
        apply(true);
        requestAnimationFrame(() => dom.search.focus());
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
        const reset = blankState();
        state.q = reset.q;
        state.sort = reset.sort;
        FILTER_KEYS.forEach((key) => {
          state[key].clear();
        });
        apply(true);
      });

      if (dom.more) {
        dom.more.addEventListener("click", () => {
          visibleLimit += PAGE_SIZE;
          apply(false);
          const firstNewCard = dom.grid.querySelector(`.project-card:nth-child(${Math.max(1, visibleLimit - PAGE_SIZE + 1)})`);
          if (firstNewCard) firstNewCard.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }

      if (advancedFilterCount() > 0 && dom.filterPanel && dom.filterToggle) {
        dom.filterPanel.hidden = false;
        dom.filterToggle.setAttribute("aria-expanded", "true");
      }

      const restoredState = hasCustomState();
      if (dom.toolbar && restoredState) {
        dom.toolbar.open = true;
      }

      if (restoredState) {
        openResultsShell("Project results", "⌕", COLLECTION_DESCRIPTIONS["Project results"]);
      }

      apply(true);
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
