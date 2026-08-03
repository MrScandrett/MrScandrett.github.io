import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const checkOnly = process.argv.includes("--check");
const planPath = path.join(ROOT, "data", "compendium-plan.json");
const lessons = fs.existsSync(planPath)
  ? JSON.parse(fs.readFileSync(planPath, "utf8")).volumes.flatMap((volume) =>
      volume.modules.flatMap((module) => module.units.flatMap((unit) => unit.lessons.map((url) => ({ url })))))
  : JSON.parse(fs.readFileSync(path.join(ROOT, "data", "lessons.json"), "utf8"))
      .lessons
      .filter((lesson) => lesson.status === "live");

const missing = [];
for (const lesson of lessons) {
  const filename = path.join(ROOT, lesson.url);
  const html = fs.readFileSync(filename, "utf8");
  if (html.includes("lesson-print-button.js")) continue;

  missing.push(lesson.url);
  if (checkOnly) continue;

  const depth = lesson.url.split("/").length - 1;
  const assetRoot = "../".repeat(depth);
  const script = `<script src="${assetRoot}assets/js/lesson-print-button.js"></script>`;
  const closingBodies = [...html.matchAll(/<\/body>/gi)];
  const closingBody = closingBodies.at(-1);
  if (!closingBody) throw new Error(`${lesson.url} has no closing body tag`);
  const updated = `${html.slice(0, closingBody.index)}\n${script}\n${html.slice(closingBody.index)}`;
  fs.writeFileSync(filename, updated);
}

if (checkOnly && missing.length) {
  console.error(`Missing print button loader in ${missing.length} live lesson(s):`);
  missing.forEach((url) => console.error(`- ${url}`));
  process.exit(1);
}

console.log(checkOnly
  ? `Print button loader present in all ${lessons.length} public lessons.`
  : `Added print button loader to ${missing.length} of ${lessons.length} public lessons.`);
