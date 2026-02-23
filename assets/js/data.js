let cache = null;
let loadingPromise = null;

function normalizeProjects(projects) {
  return projects
    .slice()
    .map((p) => ({ ...p }))
    .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());
}

function buildLoadError(error) {
  const message = error && error.message ? error.message : String(error || "Unknown error");
  return new Error(
    `Could not load /data/projects.json. ${message}. If running from file://, start a local server (examples: \`python3 -m http.server 8080\` or \`node serve-local.js\`).`
  );
}

export async function loadProjects() {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch("./data/projects.json", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    })
    .then((payload) => {
      if (!payload || !Array.isArray(payload.projects)) {
        throw new Error("Invalid schema: expected { projects: [] }");
      }
      cache = normalizeProjects(payload.projects);
      return cache;
    })
    .catch((error) => {
      loadingPromise = null;
      throw buildLoadError(error);
    });

  return loadingPromise;
}

export async function getProjectById(id) {
  const projects = await loadProjects();
  return projects.find((project) => project.id === id) || null;
}

export function clearProjectCache() {
  cache = null;
  loadingPromise = null;
}
