import { loadProjects } from "./data.js";
import { createEmptyState, createProjectCard, setActiveNav } from "./ui.js";

function groupProjectsByStudent(projects) {
  const map = new Map();
  projects.forEach((project) => {
    if (!map.has(project.student)) {
      map.set(project.student, []);
    }
    map.get(project.student).push(project);
  });
  return Array.from(map.entries())
    .map(([student, items]) => ({ student, items }))
    .sort((a, b) => a.student.localeCompare(b.student));
}

function renderStudents(groups, mount) {
  mount.innerHTML = "";
  groups.forEach((group) => {
    const panel = document.createElement("section");
    panel.className = "student-panel";
    panel.dataset.student = group.student.toLowerCase();

    const title = document.createElement("h2");
    title.textContent = group.student;

    const meta = document.createElement("p");
    meta.className = "student-meta";
    meta.textContent = `${group.items.length} project${group.items.length === 1 ? "" : "s"}`;

    const grid = document.createElement("div");
    grid.className = "student-grid";

    group.items.forEach((project) => {
      const card = createProjectCard(project, { showFeatured: true });
      grid.appendChild(card);
    });

    panel.append(title, meta, grid);
    mount.appendChild(panel);
  });
}

async function init() {
  setActiveNav();
  const mount = document.getElementById("students-list");
  const search = document.getElementById("students-search");
  const count = document.getElementById("students-count");
  if (!mount) return;

  try {
    const projects = await loadProjects();
    const groups = groupProjectsByStudent(projects);
    renderStudents(groups, mount);
    count.textContent = `${groups.length} students`;

    if (search) {
      search.addEventListener("input", () => {
        const term = search.value.trim().toLowerCase();
        let visible = 0;
        mount.querySelectorAll(".student-panel").forEach((panel) => {
          const student = panel.dataset.student || "";
          const text = panel.textContent.toLowerCase();
          const match = !term || student.includes(term) || text.includes(term);
          panel.hidden = !match;
          if (match) visible += 1;
        });
        count.textContent = `${visible} student${visible === 1 ? "" : "s"}`;
      });
    }
  } catch (error) {
    mount.appendChild(createEmptyState(error.message));
    count.textContent = "0 students";
  }
}

init();
