/* ClassroomOS Web Studio — the project format shared by Draw, Blocks and Code.
 *
 * One project holds everything a student's website needs:
 *   files   the three source files a real site is made of (index.html, style.css, script.js)
 *   assets  uploaded images, stored as data URLs and exported as images/<name>
 *   draw    the Draw-mode layout (see draw-model.mjs), which generates index.html + style.css
 *   blocks  the Blockly workspace from the website-blocks workbench
 * The same JSON is the backup file a student downloads and the submission a teacher
 * imports into student-projects/ (lib/studio-submission.mjs validates it again in Node).
 * Imported projects are data only: nothing in them runs in the studio page itself. */
import { validateDrawing, emptyDrawing } from './draw-model.mjs';

export const FORMAT = 'classroomos-web-studio';
export const VERSION = 1;
export const FILE_NAMES = ['index.html', 'style.css', 'script.js'];
export const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
export const LIMITS = { file: 300_000, image: 2_000_000, assets: 6_000_000, title: 80, author: 30, description: 240 };
export const ASSET_PATH = /^images\/[a-z0-9][a-z0-9-]{0,60}\.(png|jpg|gif|webp)$/;

export function slugify(value, fallback = 'my-website') {
  const slug = String(value || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  return slug || fallback;
}

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// The page every new project starts from: the same three-file skeleton as lesson 1.
export function pageDocument(title, body = '') {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(title || 'My website')}</title>
  <link rel="stylesheet" href="style.css">
  <script src="script.js" defer></script>
</head>
<body>
${body.replace(/\s+$/, '')}
</body>
</html>
`;
}

export function newProject(title = 'My website') {
  const project = {
    format: FORMAT,
    version: VERSION,
    id: (globalThis.crypto?.randomUUID?.() || `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
    title,
    author: '',
    description: '',
    updated: new Date().toISOString(),
    files: {
      'index.html': pageDocument(title, '  <main>\n    <h1>My website</h1>\n    <p>Draw a layout, snap blocks together, or type code. All three build this page.</p>\n  </main>'),
      'style.css': 'body {\n  font-family: system-ui, sans-serif;\n  margin: 2rem;\n}\n',
      'script.js': '// Behavior goes here. Blocks can write it for you.\n',
    },
    assets: {},
    draw: emptyDrawing(),
    blocks: null,
    sent: {},
  };
  project.sent = { code: codeFingerprint(project.files), from: 'new' };
  return project;
}

export function codeFingerprint(files) {
  return fingerprint(`${files['index.html']}\u0000${files['style.css']}\u0000${files['script.js']}`);
}

// Splits a full index.html into the parts the block workbench edits.
export function bodyOf(html) {
  const match = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  return (match ? match[1] : html).replace(/^\n+|\s+$/g, '');
}

export function titleOf(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match ? match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim() : '';
}

// Approximate decoded size of a data URL, for the storage limits.
export function dataUrlBytes(dataUrl) {
  const comma = dataUrl.indexOf(',');
  return Math.floor((dataUrl.length - comma - 1) * 3 / 4);
}

export function assetsBytes(assets) {
  return Object.values(assets || {}).reduce((sum, asset) => sum + dataUrlBytes(asset.data), 0);
}

function text(value, max, name) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) throw new Error(`${name} is not valid text (${max} characters at most).`);
  return value;
}

// Accepts a project or submission file and returns a clean copy, or throws a readable error.
export function validateProject(value) {
  if (!value || typeof value !== 'object' || value.format !== FORMAT || value.version !== VERSION) {
    throw new Error('Choose a ClassroomOS Web Studio project file (.webstudio.json).');
  }
  const project = newProject();
  if (typeof value.id === 'string' && /^[\w-]{1,64}$/.test(value.id)) project.id = value.id;
  project.title = text(value.title, LIMITS.title, 'The title') || 'My website';
  project.author = text(value.author, LIMITS.author, 'The name');
  project.description = text(value.description, LIMITS.description, 'The description');
  if (typeof value.updated === 'string' && !Number.isNaN(Date.parse(value.updated))) project.updated = value.updated;
  if (!value.files || typeof value.files !== 'object') throw new Error('The project has no files.');
  for (const name of Object.keys(value.files)) {
    if (!FILE_NAMES.includes(name)) throw new Error(`“${name}” is not one of the files a Web Studio project can hold.`);
  }
  for (const name of FILE_NAMES) project.files[name] = text(value.files[name], LIMITS.file, name);
  project.assets = {};
  for (const [path, asset] of Object.entries(value.assets || {})) {
    if (!ASSET_PATH.test(path)) throw new Error(`“${path}” is not a valid image name.`);
    if (!asset || typeof asset.data !== 'string' || !IMAGE_TYPES[asset.type]) throw new Error(`${path} is not a PNG, JPEG, GIF or WebP image.`);
    if (!asset.data.startsWith(`data:${asset.type};base64,`) || !/^[A-Za-z0-9+/=]*$/.test(asset.data.slice(asset.data.indexOf(',') + 1))) throw new Error(`${path} is not stored correctly.`);
    if (dataUrlBytes(asset.data) > LIMITS.image) throw new Error(`${path} is larger than 2 MB.`);
    project.assets[path] = { type: asset.type, data: asset.data };
  }
  if (assetsBytes(project.assets) > LIMITS.assets) throw new Error('The images add up to more than 6 MB.');
  project.draw = value.draw ? validateDrawing(value.draw) : emptyDrawing();
  project.blocks = value.blocks && typeof value.blocks === 'object' ? value.blocks : null;
  project.sent = {};
  // sent.code: fingerprint of the files the last Draw/Blocks hand-off wrote; sent.from: which mode.
  if (typeof value.sent?.code === 'string' && value.sent.code.length < 100) project.sent.code = value.sent.code;
  if (['draw', 'blocks', 'new'].includes(value.sent?.from)) project.sent.from = value.sent.from;
  if (value.submission && typeof value.submission === 'object') {
    project.submission = {
      slug: slugify(text(value.submission.slug, 80, 'The address')),
      category: ['Website', 'Game', 'Simulation', 'Art', 'Tool', 'Story'].includes(value.submission.category) ? value.submission.category : 'Website',
      submittedAt: typeof value.submission.submittedAt === 'string' ? value.submission.submittedAt.slice(0, 40) : '',
      noPersonalInfo: value.submission.noPersonalInfo === true,
      imagesCredited: value.submission.imagesCredited === true,
    };
  }
  return project;
}

// A short fingerprint so the studio can tell whether code changed since a mode last wrote it.
export function fingerprint(textValue) {
  let hash = 2166136261;
  for (let i = 0; i < textValue.length; i++) { hash ^= textValue.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36) + ':' + textValue.length;
}

// Students submit with a first name or nickname only; folder names follow student-projects/<Name>/.
export function cleanStudentName(value) {
  const name = String(value || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z -]/g, '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.author);
  return name.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function submissionSlug(author, title) {
  return slugify(`${cleanStudentName(author)} ${title}`, 'student-website');
}
