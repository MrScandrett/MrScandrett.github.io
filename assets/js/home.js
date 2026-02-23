import { loadProjects } from "./data.js";
import { createEmptyState, createProjectRow, setActiveNav, sortProjects } from "./ui.js";

function byCategory(projects, category) {
  return projects.filter((project) => project.category === category);
}

function topN(projects, limit = 14) {
  return projects.slice(0, limit);
}

function buildRows(projects) {
  const newest = sortProjects(projects, "newest");
  return [
    {
      title: "Featured",
      subtitle: "Curated spotlight picks.",
      projects: topN(projects.filter((project) => project.featured), 14),
      id: "row-featured",
    },
    {
      title: "Recently Added",
      subtitle: "Fresh projects from the latest updates.",
      projects: topN(newest, 14),
      id: "row-recent",
    },
    {
      title: "Games",
      projects: topN(byCategory(projects, "Games"), 14),
      id: "row-games",
    },
    {
      title: "Robotics",
      projects: topN(byCategory(projects, "Robotics"), 14),
      id: "row-robotics",
    },
    {
      title: "3D Modeling / Printing",
      projects: topN(byCategory(projects, "3D"), 14),
      id: "row-3d",
    },
    {
      title: "Music + Audio",
      projects: topN(byCategory(projects, "Music"), 14),
      id: "row-music",
    },
    {
      title: "Web Projects",
      projects: topN(byCategory(projects, "Web"), 14),
      id: "row-web",
    },
    {
      title: "VR",
      projects: topN(byCategory(projects, "VR"), 14),
      id: "row-vr",
    },
    {
      title: "Game Jam",
      subtitle: "Jam builds and rapid prototypes.",
      projects: topN(projects.filter((project) => project.jam), 14),
      id: "row-jam",
    },
    {
      title: "Advanced Builds",
      subtitle: "High-complexity projects.",
      projects: topN(projects.filter((project) => project.difficulty === "Advanced"), 14),
      id: "row-advanced",
    },
  ];
}

async function init() {
  setActiveNav();
  const rowsContainer = document.getElementById("home-rows");
  if (!rowsContainer) return;

  try {
    const projects = await loadProjects();
    const rows = buildRows(projects);

    rows.forEach((row) => {
      if (!row.projects || row.projects.length === 0) return;
      rowsContainer.appendChild(
        createProjectRow({
          title: row.title,
          subtitle: row.subtitle || "",
          projects: row.projects,
          rowId: row.id,
        })
      );
    });

    if (!rowsContainer.children.length) {
      rowsContainer.appendChild(createEmptyState("No projects available yet."));
    }
  } catch (error) {
    rowsContainer.appendChild(createEmptyState(error.message));
  }
}

init();
