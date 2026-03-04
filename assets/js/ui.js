const SCROLL_AMOUNT = 320;

export function setActiveNav() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  const links = document.querySelectorAll(".site-nav a[data-page]");
  links.forEach((link) => {
    if (link.getAttribute("data-page") === current) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

export function createBadge(text, extraClass = "") {
  const badge = document.createElement("span");
  badge.className = `badge ${extraClass}`.trim();
  badge.textContent = text;
  return badge;
}

function difficultyClass(difficulty) {
  const key = String(difficulty || "").toLowerCase();
  if (key === "beginner") return "diff-beginner";
  if (key === "intermediate") return "diff-intermediate";
  if (key === "advanced") return "diff-advanced";
  return "";
}

export function projectUrl(projectId) {
  return `project.html?id=${encodeURIComponent(projectId)}`;
}

export function createProjectCard(project, options = {}) {
  const article = document.createElement("article");
  article.className = "project-card";
  article.dataset.id = project.id;
  article.dataset.category = project.category;
  article.dataset.difficulty = project.difficulty;
  article.dataset.type = project.type;
  article.dataset.program = project.program;
  article.dataset.term = project.term;
  article.dataset.year = String(project.year);
  article.dataset.tech = (project.tech || []).join("|").toLowerCase();
  article.dataset.tags = (project.tags || []).join("|").toLowerCase();
  article.dataset.search = [project.title, project.student, ...(project.tech || []), ...(project.tags || [])]
    .join(" ")
    .toLowerCase();

  const link = document.createElement("a");
  link.className = "card-link";
  link.href = project.appUrl || projectUrl(project.id);
  link.setAttribute("aria-label", `Open project: ${project.title} by ${project.student}`);
  link.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      link.click();
    }
  });

  const thumb = document.createElement("div");
  thumb.className = "card-thumb";
  const image = document.createElement("img");
  image.loading = "lazy";
  image.decoding = "async";
  image.src = project.thumbnail;
  image.alt = `${project.title} thumbnail`;
  thumb.appendChild(image);

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = project.title;

  const sub = document.createElement("p");
  sub.className = "card-sub";
  sub.textContent = `${project.student} • ${project.year} ${project.term}`;

  const badges = document.createElement("div");
  badges.className = "badge-row";
  badges.appendChild(createBadge(project.category));
  if (Array.isArray(project.tech) && project.tech.length > 0) {
    badges.appendChild(createBadge(project.tech[0]));
  }
  badges.appendChild(createBadge(project.difficulty, difficultyClass(project.difficulty)));

  if (options.showFeatured && project.featured) {
    badges.appendChild(createBadge("Featured"));
  }

  body.append(title, sub, badges);
  link.append(thumb, body);
  article.appendChild(link);
  return article;
}

export function createEmptyState(text) {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.textContent = text;
  return div;
}

function enhanceHorizontalTrack(track, label) {
  track.setAttribute("role", "region");
  track.setAttribute("aria-label", `${label} horizontal project row`);
  track.tabIndex = 0;

  track.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        track.scrollBy({ left: event.deltaY, behavior: "auto" });
      }
    },
    { passive: false }
  );

  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      track.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      track.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
    }
    if (event.key === "Home") {
      event.preventDefault();
      track.scrollTo({ left: 0, behavior: "smooth" });
    }
    if (event.key === "End") {
      event.preventDefault();
      track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
    }
  });

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startLeft = 0;

  track.addEventListener("pointerdown", (event) => {
    dragging = true;
    moved = false;
    startX = event.clientX;
    startLeft = track.scrollLeft;
    track.classList.add("is-dragging");
    track.setPointerCapture(event.pointerId);
  });

  track.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 4) moved = true;
    track.scrollLeft = startLeft - delta;
  });

  function stopDrag(event) {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("is-dragging");
    if (event && track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }
  }

  track.addEventListener("pointerup", stopDrag);
  track.addEventListener("pointercancel", stopDrag);
  track.addEventListener("pointerleave", stopDrag);

  track.addEventListener("click", (event) => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

export function createProjectRow({ title, projects, subtitle = "", rowId = "" }) {
  const section = document.createElement("section");
  section.className = "media-row";

  const header = document.createElement("div");
  header.className = "row-header";

  const titleWrap = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.textContent = title;
  if (rowId) h2.id = rowId;
  titleWrap.appendChild(h2);
  if (subtitle) {
    const hint = document.createElement("p");
    hint.className = "row-sub";
    hint.textContent = subtitle;
    titleWrap.appendChild(hint);
  }

  const controls = document.createElement("div");
  controls.className = "row-controls";
  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "secondary";
  prev.setAttribute("aria-label", `Scroll ${title} left`);
  prev.textContent = "‹";

  const next = document.createElement("button");
  next.type = "button";
  next.className = "secondary";
  next.setAttribute("aria-label", `Scroll ${title} right`);
  next.textContent = "›";

  controls.append(prev, next);
  header.append(titleWrap, controls);

  const wrap = document.createElement("div");
  wrap.className = "row-track-wrap";

  const track = document.createElement("div");
  track.className = "row-track";
  if (rowId) track.setAttribute("aria-labelledby", rowId);

  projects.forEach((project) => track.appendChild(createProjectCard(project, { showFeatured: true })));

  prev.addEventListener("click", () => {
    track.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
  });

  next.addEventListener("click", () => {
    track.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
  });

  enhanceHorizontalTrack(track, title);
  wrap.appendChild(track);

  section.append(header, wrap);
  return section;
}

export function sortProjects(projects, sortKey) {
  const copy = projects.slice();
  switch (sortKey) {
    case "oldest":
      return copy.sort((a, b) => new Date(a.date_added).getTime() - new Date(b.date_added).getTime());
    case "az":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "featured":
      return copy.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.title.localeCompare(b.title));
    case "most-tags":
      return copy.sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0) || a.title.localeCompare(b.title));
    case "newest":
    default:
      return copy.sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());
  }
}

export function uniqueValues(projects, key) {
  const set = new Set();
  projects.forEach((project) => {
    const value = project[key];
    if (Array.isArray(value)) {
      value.forEach((item) => set.add(item));
    } else if (value !== undefined && value !== null && value !== "") {
      set.add(value);
    }
  });
  return Array.from(set);
}

export function mapById(projects) {
  const map = new Map();
  projects.forEach((project) => map.set(project.id, project));
  return map;
}

export function projectMatches(project, state) {
  if (state.q) {
    const needle = state.q.toLowerCase();
    const haystack = [project.title, project.student, ...(project.tags || []), ...(project.tech || [])]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (state.category.size > 0 && !state.category.has(project.category)) return false;
  if (state.tech.size > 0 && !(project.tech || []).some((item) => state.tech.has(item))) return false;
  if (state.difficulty.size > 0 && !state.difficulty.has(project.difficulty)) return false;
  if (state.year.size > 0 && !state.year.has(String(project.year))) return false;
  if (state.term.size > 0 && !state.term.has(project.term)) return false;
  if (state.type.size > 0 && !state.type.has(project.type)) return false;
  if (state.program.size > 0 && !state.program.has(project.program)) return false;

  return true;
}

export function createMetaPill(text) {
  const span = document.createElement("span");
  span.className = "pill";
  span.textContent = text;
  return span;
}
