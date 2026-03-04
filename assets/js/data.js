let cache = null;
let loadingPromise = null;
const PLACEHOLDER_THUMB = "./assets/thumbs/student-showcase-thumb.png";

function resolveThumbPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return PLACEHOLDER_THUMB;

  if (raw.startsWith("/thumbs/")) return `./assets${raw}`;
  if (raw.startsWith("thumbs/")) return `./assets/${raw}`;
  if (raw.startsWith("./thumbs/")) return `./assets/${raw.slice(2)}`;
  if (raw.startsWith("/assets/thumbs/")) return `.${raw}`;

  return raw;
}

function titleFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeProjects(projects) {
  return projects
    .slice()
    .map((p) => ({
      id: p.id,
      title: p.title || "Untitled Project",
      student: p.student || "Student",
      year: p.year || new Date().getFullYear(),
      term: p.term || "Q1",
      program: p.program || "Independent",
      category: p.category || "Web",
      type: p.type || "Solo",
      jam: Boolean(p.jam),
      difficulty: p.difficulty || "Beginner",
      tech: Array.isArray(p.tech) ? p.tech : [],
      tags: Array.isArray(p.tags) ? p.tags : [],
      thumbnail: resolveThumbPath(p.thumbnail),
      hero: resolveThumbPath(p.hero || p.thumbnail),
      short_description: p.short_description || "Student project submission.",
      long_description: p.long_description || "Built and published as part of the classroom showcase.",
      links: p.links || {},
      gallery: Array.isArray(p.gallery) ? p.gallery : [],
      featured: Boolean(p.featured),
      date_added: p.date_added || "1970-01-01",
      appUrl: p.appUrl || null,
    }))
    .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());
}

function buildLoadError(error) {
  const message = error && error.message ? error.message : String(error || "Unknown error");
  return new Error(
    `Could not load project data. ${message}. If running from file://, start a local server (examples: \`python3 -m http.server 8080\` or \`node serve-local.js\`).`
  );
}

async function fetchJsonOrNull(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`${url} HTTP ${res.status}`);
  }
  return res.json();
}

function normalizeManifestApps(payload) {
  if (!Array.isArray(payload)) return [];
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();

  return payload
    .filter((item) => item && item.slug && item.url)
    .map((item) => {
      const slug = String(item.slug).trim();
      const rawStudent = item.student && String(item.student).trim() ? String(item.student).trim() : titleFromSlug(slug) || "Student";
      const prettyStudent = /[A-Z]/.test(rawStudent) ? rawStudent : titleFromSlug(rawStudent.replace(/\s+/g, "-")) || rawStudent;
      const title = item.name && String(item.name).trim() ? String(item.name).trim() : `${prettyStudent} Project`;
      const tech = Array.isArray(item.tech) && item.tech.length > 0 ? item.tech : ["HTML", "CSS", "JavaScript"];
      const tags = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : ["student-upload"];
      const category = item.category && String(item.category).trim() ? String(item.category).trim() : "Web";
      const term = item.term && String(item.term).trim() ? String(item.term).trim() : "Live";
      const program = item.program && String(item.program).trim() ? String(item.program).trim() : "Student Upload";
      const difficulty = item.difficulty && String(item.difficulty).trim() ? String(item.difficulty).trim() : "Beginner";

      return {
        id: `app-${slug}`,
        title,
        student: prettyStudent,
        year,
        term,
        program,
        category,
        type: "Solo",
        jam: false,
        difficulty,
        tech,
        tags,
        thumbnail: resolveThumbPath(item.thumbnail),
        hero: resolveThumbPath(item.thumbnail),
        short_description: "Student project uploaded to the classroom showcase.",
        long_description: "Open the app to play or explore the student build.",
        links: { play: item.url },
        gallery: [],
        featured: false,
        date_added: item.date_added || today,
        appUrl: item.url,
      };
    });
}

export async function loadProjects() {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = Promise.all([fetchJsonOrNull("./data/projects.json"), fetchJsonOrNull("./apps/manifest.json")])
    .then(([dataPayload, appsPayload]) => {
      const dataProjects = dataPayload && Array.isArray(dataPayload.projects) ? dataPayload.projects : [];
      const appProjects = normalizeManifestApps(appsPayload);
      const merged = normalizeProjects(dataProjects.concat(appProjects));
      cache = merged;
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
