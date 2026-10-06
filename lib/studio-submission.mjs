// Imports a Web Studio submission (.webstudio.json) into student-projects/.
//
// A student builds a site in lessons/web-design/web-studio.html and downloads a
// submission file. The teacher imports it here (from OSeditor's "Import submission"
// button, or `node scripts/import-studio-submission.mjs <file>`), reviews it, then
// builds it into apps/<slug>/ with build-showcase.js. The submission is validated with
// the same validateProject() the studio uses, then again here for paths and sizes:
// only index.html, style.css, script.js and images/<name>.<png|jpg|gif|webp> are written,
// always inside student-projects/<Name>/<slug>/.

import fs from "node:fs/promises";
import path from "node:path";
import { validateProject, cleanStudentName, submissionSlug, FILE_NAMES, ASSET_PATH } from "../assets/js/web-studio/project.mjs";

const CATEGORY = { Website: "Web", Game: "Game", Simulation: "Simulation", Art: "Art", Tool: "Web", Story: "Web" };
export const PROGRAMS = ["STEAM Lab", "Microschool", "Summer Camp"];

export function readSubmission(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("This is not a Web Studio file (it is not valid JSON)."); }
  const project = validateProject(value);
  if (!project.submission) throw new Error("This is a Web Studio project file, not a submission. Ask the student to use Share & publish → Download my submission file.");
  if (!project.submission.noPersonalInfo || !project.submission.imagesCredited) throw new Error("The student did not confirm the personal-information and image-credit promises.");
  const student = cleanStudentName(project.author);
  if (!student) throw new Error("The submission has no student name.");
  return { project, student };
}

export function planImport({ project, student }, root, { program = "STEAM Lab" } = {}) {
  const slug = submissionSlug(student, project.title);
  const relDir = path.posix.join("student-projects", student, slug);
  const dir = path.resolve(root, relDir);
  const base = path.resolve(root, "student-projects");
  if (!dir.startsWith(base + path.sep)) throw new Error("Refusing to write outside student-projects/.");
  const files = FILE_NAMES.map((name) => [name, Buffer.from(project.files[name], "utf8")]);
  for (const [assetPath, asset] of Object.entries(project.assets)) {
    if (!ASSET_PATH.test(assetPath)) throw new Error(`Unexpected image path ${assetPath}.`);
    files.push([assetPath, Buffer.from(asset.data.slice(asset.data.indexOf(",") + 1), "base64")]);
  }
  const firstImage = Object.keys(project.assets).sort()[0];
  const override = {
    student,
    name: project.title,
    category: CATEGORY[project.submission.category] || "Web",
    tech: ["HTML", "CSS", "JavaScript"],
    tags: ["web-studio", (project.submission.category || "website").toLowerCase()],
    date_added: new Date().toISOString().slice(0, 10),
    ...(firstImage ? { thumbnail: `./apps/${slug}/${firstImage}` } : {}),
    program: PROGRAMS.includes(program) ? program : "STEAM Lab",
  };
  return { slug, student, relDir, dir, files, override, entry: `/${relDir}/index.html`, title: project.title, description: project.description };
}

export async function writeImport(plan, root, { replace = false } = {}) {
  let exists = false;
  try { await fs.access(plan.dir); exists = true; } catch { /* new project */ }
  if (exists && !replace) throw Object.assign(new Error(`${plan.relDir}/ already exists. Import again with “replace” to overwrite it with this submission.`), { code: "EEXIST" });
  if (exists) {
    // Only ever remove the files a submission can contain, never the whole folder.
    for (const name of FILE_NAMES) await fs.rm(path.join(plan.dir, name), { force: true });
    await fs.rm(path.join(plan.dir, "images"), { recursive: true, force: true });
  }
  for (const [rel, data] of plan.files) {
    const target = path.join(plan.dir, rel);
    if (!target.startsWith(plan.dir + path.sep)) throw new Error(`Refusing to write ${rel}.`);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
  }
  const overridesPath = path.join(root, "data", "manifest-overrides.json");
  const overrides = JSON.parse(await fs.readFile(overridesPath, "utf8"));
  overrides[plan.slug] = { ...(overrides[plan.slug] || {}), ...plan.override };
  await fs.writeFile(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
  return { slug: plan.slug, dir: plan.relDir, entry: plan.entry, replaced: exists, files: plan.files.map(([rel]) => rel) };
}
