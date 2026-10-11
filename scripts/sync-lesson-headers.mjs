import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const checkOnly = process.argv.includes("--check");

function walkHtml(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkHtml(full));
    } else if (entry.name.endsWith(".html")) {
      results.push(full);
    }
  }
  return results;
}

const lessonsDir = path.join(ROOT, "lessons");
const lessonFiles = walkHtml(lessonsDir);

let missingHeader = [];
let missingMobile = [];
let missingTheme = [];
let missingCss = [];
let updatedCount = 0;

for (const filePath of lessonFiles) {
  let html = fs.readFileSync(filePath, "utf8");
  const relPath = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const depth = relPath.split("/").length - 1;
  const rel = "../".repeat(depth);

  const hasHeader = /class=["'][^"']*site-header/.test(html);
  const hasMobile = html.includes("nav-mobile.js");
  const hasTheme = html.includes("theme-registry.js");
  const hasCss = html.includes("classroom-home.css");

  if (!hasHeader) missingHeader.push(relPath);
  if (!hasMobile) missingMobile.push(relPath);
  if (!hasTheme) missingTheme.push(relPath);
  if (!hasCss) missingCss.push(relPath);

  if (checkOnly) continue;

  let changed = false;

  // 1. Ensure classroom-home.css is in <head>
  if (!hasCss) {
    const cssLink = `  <link rel="stylesheet" href="${rel}assets/css/classroom-home.css" />\n`;
    const closingHeads = [...html.matchAll(/<\/head>/gi)];
    const closingHead = closingHeads.at(-1);
    if (closingHead) {
      html = `${html.slice(0, closingHead.index)}${cssLink}${html.slice(closingHead.index)}`;
      changed = true;
    }
  }

  // 2. Ensure site-header is present
  if (!hasHeader) {
    const headerHtml = `  <header class="site-header">
    <div class="nav-wrap">
      <a class="brand" href="${rel}index.html">Mr. Scandrett's ClassroomOS</a>
      <nav class="site-nav" aria-label="Primary">
        <ul>
          <li><a href="${rel}index.html">Home</a></li>
          <li><a href="${rel}steam-lessons.html" aria-current="page">Lessons</a></li>
          <li><a href="${rel}paths.html">Paths</a></li>
          <li><a href="${rel}showcase.html">Showcase</a></li>
          <li><a href="${rel}applications.html">Apps</a></li>
          <li><a href="${rel}library.html">Library</a></li>
          <li><a href="${rel}about.html">About</a></li>
        </ul>
      </nav>
    </div>
  </header>\n`;

    // Insertion strategy:
    // A) If .ll-viewport exists, insert inside .ll-viewport as its first child
    const vpMatch = html.match(/(<div[^>]*\bclass=["'][^"']*ll-viewport[^"']*["'][^>]*>)/i);
    if (vpMatch) {
      const idx = vpMatch.index + vpMatch[0].length;
      html = `${html.slice(0, idx)}\n${headerHtml}${html.slice(idx)}`;
      changed = true;
    } else {
      // B) Else after skip link
      const skipMatch = html.match(/(<a[^>]*\bclass=["'][^"']*skip(?:-link)?["'][^>]*>[\s\S]*?<\/a>)/i);
      if (skipMatch) {
        const idx = skipMatch.index + skipMatch[0].length;
        html = `${html.slice(0, idx)}\n${headerHtml}${html.slice(idx)}`;
        changed = true;
      } else {
        // C) Else after <body>
        const bodyMatch = html.match(/(<body[^>]*>)/i);
        if (bodyMatch) {
          const idx = bodyMatch.index + bodyMatch[0].length;
          html = `${html.slice(0, idx)}\n${headerHtml}${html.slice(idx)}`;
          changed = true;
        }
      }
    }
  }

  // 3. Ensure theme-registry.js and nav-mobile.js are before </body>
  const scriptsToAdd = [];
  if (!hasTheme) {
    scriptsToAdd.push(`<script src="${rel}assets/js/theme-registry.js"></script>`);
  }
  if (!hasMobile) {
    scriptsToAdd.push(`<script src="${rel}assets/js/nav-mobile.js"></script>`);
  }

  if (scriptsToAdd.length > 0) {
    const closingBodies = [...html.matchAll(/<\/body>/gi)];
    const closingBody = closingBodies.at(-1);
    if (closingBody) {
      const scriptsHtml = scriptsToAdd.join("\n") + "\n";
      html = `${html.slice(0, closingBody.index)}${scriptsHtml}${html.slice(closingBody.index)}`;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, html, "utf8");
    updatedCount++;
  }
}

if (checkOnly) {
  if (missingHeader.length || missingMobile.length || missingTheme.length || missingCss.length) {
    console.error(`Missing navigation components in lessons:`);
    if (missingHeader.length) console.error(`- ${missingHeader.length} lesson(s) missing site-header`);
    if (missingMobile.length) console.error(`- ${missingMobile.length} lesson(s) missing nav-mobile.js`);
    if (missingTheme.length) console.error(`- ${missingTheme.length} lesson(s) missing theme-registry.js`);
    if (missingCss.length) console.error(`- ${missingCss.length} lesson(s) missing classroom-home.css`);
    process.exit(1);
  } else {
    console.log(`All ${lessonFiles.length} lessons have site-header, nav-mobile.js, theme-registry.js, and classroom-home.css.`);
  }
} else {
  console.log(`Updated navigation components in ${updatedCount} of ${lessonFiles.length} lessons.`);
}

