import { getProjectById, loadProjects } from "./data.js";
import {
  createEmptyState,
  createMetaPill,
  createProjectRow,
  setActiveNav,
  sortProjects,
} from "./ui.js";

function queryId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderLinks(project, mount) {
  const links = [
    { key: "repo", label: "GitHub Repository" },
    { key: "play", label: "Playable Demo" },
    { key: "video", label: "Video" },
  ];

  const list = document.createElement("div");
  list.className = "link-list";

  let count = 0;
  links.forEach((entry) => {
    const href = project.links?.[entry.key];
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.className = "button secondary";
    a.textContent = entry.label;
    list.appendChild(a);
    count += 1;
  });

  if (count > 0) mount.appendChild(list);
}

function renderMetadata(project, mount) {
  const dl = document.createElement("dl");
  dl.className = "meta-list";

  const entries = [
    ["Student", project.student],
    ["Category", project.category],
    ["Difficulty", project.difficulty],
    ["Program", project.program],
    ["Type", project.type],
    ["Jam", project.jam ? "Yes" : "No"],
    ["Term", `${project.year} ${project.term}`],
    ["Added", formatDate(project.date_added)],
  ];

  entries.forEach(([label, value]) => {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    row.append(dt, dd);
    dl.appendChild(row);
  });

  mount.appendChild(dl);
}

function renderGallery(project, mount) {
  if (!Array.isArray(project.gallery) || project.gallery.length === 0) return;

  const section = document.createElement("section");
  section.className = "detail-main";

  const title = document.createElement("h2");
  title.textContent = "Gallery";

  const grid = document.createElement("div");
  grid.className = "gallery-grid";

  project.gallery.forEach((src, index) => {
    const img = document.createElement("img");
    img.src = src;
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = `${project.title} gallery image ${index + 1}`;
    grid.appendChild(img);
  });

  section.append(title, grid);
  mount.appendChild(section);
}

function relatedProjects(projects, current) {
  return sortProjects(
    projects
      .filter((project) => project.id !== current.id)
      .map((project) => {
        let score = 0;
        if (project.category === current.category) score += 3;
        const sharedTech = (project.tech || []).filter((tech) => (current.tech || []).includes(tech)).length;
        score += sharedTech;
        if (project.difficulty === current.difficulty) score += 1;
        return { project, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.project),
    "newest"
  );
}

async function init() {
  setActiveNav();

  const id = queryId();
  const slot = document.getElementById("project-slot");
  const rowsSlot = document.getElementById("detail-rows");

  if (!slot) return;
  if (!id) {
    slot.appendChild(createEmptyState("Missing project id. Open from Browse or Home."));
    return;
  }

  try {
    const [project, projects] = await Promise.all([getProjectById(id), loadProjects()]);

    if (!project) {
      slot.appendChild(createEmptyState(`Project not found for id: ${id}`));
      return;
    }

    document.title = `${project.title} · Mr. Scandrett's ClassroomOS`;

    const hero = document.createElement("section");
    hero.className = "detail-hero";

    const heroImage = document.createElement("img");
    heroImage.src = project.hero || project.thumbnail;
    heroImage.alt = `${project.title} hero`;
    heroImage.decoding = "async";
    hero.appendChild(heroImage);

    const title = document.createElement("h1");
    title.textContent = project.title;

    const subtitle = document.createElement("p");
    subtitle.className = "result-count";
    subtitle.textContent = `${project.student} • ${project.year} ${project.term}`;

    const heroMeta = document.createElement("div");
    heroMeta.className = "hero-meta";
    heroMeta.appendChild(createMetaPill(project.category));
    heroMeta.appendChild(createMetaPill(project.difficulty));
    heroMeta.appendChild(createMetaPill(project.program));
    heroMeta.appendChild(createMetaPill(project.type));
    if (project.jam) heroMeta.appendChild(createMetaPill("Game Jam"));

    const layout = document.createElement("section");
    layout.className = "detail-layout";

    const main = document.createElement("article");
    main.className = "detail-main";
    const h2Main = document.createElement("h2");
    h2Main.textContent = "Overview";
    const short = document.createElement("p");
    short.textContent = project.short_description;
    const long = document.createElement("p");
    long.textContent = project.long_description;

    const tagsTitle = document.createElement("h2");
    tagsTitle.textContent = "Tech + Tags";
    const tagWrap = document.createElement("div");
    tagWrap.className = "hero-meta";
    (project.tech || []).forEach((tech) => tagWrap.appendChild(createMetaPill(tech)));
    (project.tags || []).forEach((tag) => tagWrap.appendChild(createMetaPill(`#${tag}`)));

    main.append(h2Main, short, long, tagsTitle, tagWrap);

    const side = document.createElement("aside");
    side.className = "detail-side";
    const h2Side = document.createElement("h2");
    h2Side.textContent = "Project Details";
    side.appendChild(h2Side);
    renderMetadata(project, side);
    renderLinks(project, side);

    layout.append(main, side);

    slot.append(hero, title, subtitle, heroMeta, layout);
    renderGallery(project, slot);

    const similar = relatedProjects(projects, project).slice(0, 12);
    const sameStudent = projects.filter((item) => item.student === project.student && item.id !== project.id);

    if (similar.length > 0) {
      rowsSlot.appendChild(
        createProjectRow({
          title: "More like this",
          subtitle: "Same category, tools, or complexity.",
          projects: similar,
          rowId: "row-more-like-this",
        })
      );
    }

    if (sameStudent.length > 0) {
      rowsSlot.appendChild(
        createProjectRow({
          title: `From ${project.student}`,
          subtitle: "More projects from this student.",
          projects: sameStudent,
          rowId: "row-same-student",
        })
      );
    }
  } catch (error) {
    slot.appendChild(createEmptyState(error.message));
  }
}

init();
