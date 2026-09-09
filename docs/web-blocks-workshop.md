# Website blocks workshop

The 11 pages in the Build Your Own Web pathway, `build-your-student-page.html`,
and `from-scratch-browser-game.html` include an optional website workshop.
Existing lessons, code editors, simulations and checkpoints remain in place.

## Student workflow

Open **Website blocks** near the start of a lesson. Each page has a relevant
starting project; the selector also offers a portfolio, community business,
practice store, wiki, creation hub and blank page. Change block parameters and
the isolated preview updates. HTML elements nest; CSS properties connect inside
selectors; event actions connect inside events. Loose properties/actions show a
repair message rather than executing.

The native **Block fields and keyboard builder** edits the same Blockly workspace
without dragging. It supports nesting, insertion, moving within a stack, deletion
and undo. The phone layout stacks the editor and preview, with jump controls.

**Save blocks file** downloads a versioned JSON project. **Open blocks file**
restores it on any integrated lesson. Browser autosave is per lesson; **Continue
last website** copies the latest project from another lesson. Replacements have
an inline confirmation and **Restore previous project**. Invalid imports leave
the current work intact. Unreadable browser saves are protected from overwrite.

**Download index.html** exports HTML with inline CSS and JavaScript. It opens
without Blockly, ClassroomOS, a build step or an account. Keep the JSON project
for future block editing; arbitrary edits to the exported HTML do not round-trip
into blocks. Images and other linked files still need to accompany that file.

## Examples and limits

**Try with blocks** appears beside recognizable HTML/CSS/JavaScript examples.
HTML converts to nested element/text/attribute blocks. CSS converts to selector,
property and media-query blocks. These conversions use the browser's parsers and
normalize formatting; the original lesson example remains unchanged. Specialized
markup (SVG, preformatted text, inline scripts) and unsupported CSS rules remain
source blocks. JavaScript snippets remain editable source blocks; the built-in
starters use structured events, actions, filtering and animation blocks where
available. A fragment with missing prerequisites still needs the lesson's other
steps. Runtime errors and console output appear in Preview messages.

The preview is a sandboxed iframe with `allow-scripts` only, a restrictive CSP,
and no same-origin permission. Its messages are checked against its window and
a fresh render token. Preview scripts cannot access the lesson's storage, submit
forms, load external scripts, open new windows or navigate the parent. It can
load HTTPS/data images. Downloads are ordinary websites; browser preview
restrictions are not baked into them. Preview counters reset after a block edit;
Live updates can be paused while a student edits several fields.

The WebXR starter builds the accessible HTML exhibit list. The lesson's existing
3D/WebXR lab remains the place to render the immersive scene. The practice store
has a local demonstration total, not payment or order processing.

## Files and maintenance

- `assets/js/lessons/web-blocks.js`: lazy entry point and example buttons.
- `web-blocks-model.mjs`: typed block definitions, generators and import validation.
- `web-blocks-starters.mjs`: starter content and page-to-project mapping.
- `web-blocks-workbench.mjs`: Blockly integration, inspector, persistence and preview.
- `assets/css/lessons/web-blocks.css`: scoped workbench layout and controls.
- `scripts/blockly-browser-entry.js`: the shared existing Blockly build. It now
  includes English messages required by Blockly 13's accessibility labels.
- `scripts/copy-blockly-media.mjs`: vendors the needed UI media from the pinned
  npm dependency. `npm run build:blockly` rebuilds both the bundle and media.

The animation block generates standalone, time-based canvas code with reduced
motion and visibility handling so exported pages do not need site helper scripts.

## Verification

Start `PORT=8094 node serve-local.js`, then run:

```sh
node tests/web-blocks-model.test.mjs
WEB_BLOCKS_URL=http://localhost:8094 node tests/web-blocks-browser.cjs
WEB_BLOCKS_URL=http://localhost:8094 node tests/web-blocks-edges.cjs
WEB_BLOCKS_URL=http://localhost:8094 node tests/web-blocks-a11y.cjs
npm run check:integrity
npm run check:themes
node scripts/sync-lessons.mjs
```

The browser suite covers editing and structural changes, events, persistence,
invalid imports, portable files, runnable HTML exports, all 15 starter projects,
search and cart behavior, canvas drawing, example conversion, continuing between
lessons, preview pause/restart, phone overflow and startup across all 13 pages.
Chromium may need to run outside an OS-restricted sandbox in some environments.
