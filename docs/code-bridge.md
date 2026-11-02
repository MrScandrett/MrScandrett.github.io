# Code Bridge

Code Bridge is a static, browser-local project companion for students who compose
complete files in their existing teacher-approved Google AI chat and run projects
in VS Code. It never calls an AI service or uploads selected project contents.
The copy/paste boundary is deliberate: the student's existing AI access remains
separate from the website.

## Student entry points

- Tool: `/code-bridge.html`; practice: `/code-bridge.html?practice=jump`.
- Workshop: `/lessons/computer-science/foundations/ai-coding-workflow.html`.
- The workshop is registered under Computer Science and cross-listed in Game
  Development. Both Computer Science pathway URLs, the public lesson shelf,
  VS Code setup, the browser-game lesson, search, and the app launcher link to it.
- Three sessions cover a complete-file bug fix, dependency/context selection and
  module boundaries, and a fresh-chat handoff with test evidence. The lesson
  includes timing, partner roles, teacher setup, recovery guidance, and a rubric.

## Interface

The start screen explains the handoff between Code Bridge, the student's approved
AI chat, and VS Code before showing the coding desk. Loading a project opens the
three-step workspace: prepare, review, and test. Required goal/test fields and the
selected-file count guide request preparation; request-size settings and response
format examples are available in disclosures. The request preview appears only
when ready. Task or file-selection edits retire it and block response review until
a new request is prepared. Next-step buttons connect the panels without implying
that exported changes were applied or tests passed.

Review shows per-file approvals and a count of files waiting to apply. The test
panel repeats the actual success test and explains checkpoints in plain language.
On narrow screens the file browser collapses when moving to review or preparing a
request; practice starts with the preselected files collapsed. Its summary allows
reopening the files. The desk uses bundled IBM Plex Sans for readable form text
and the shared monospace font for source.

## Engine and storage

- `assets/js/code-bridge/core.mjs`: source/path validation, bounded request
  construction, response parsing, snapshot comparison, bounded line diff, and
  session validation. No DOM or network dependencies; shared by Node tests.
- `assets/js/code-bridge/folder.mjs`: permission-independent file operations,
  batch conflict preflight, backups before any replacement, per-file rechecks,
  and partial-save reporting. The UI requests permission from a Save click.
- `assets/js/code-bridge/app.mjs`: local file pickers, selection, packet preview,
  per-file approvals, source previews, ZIPs, explicit session downloads, and
  student-reported checkpoints. All source and AI responses render as text.
- `assets/js/code-bridge/demo.mjs`: a runnable three-file practice project and
  a complete-file practice answer, usable without an AI login.
- Uses the existing vendored `assets/vendor/jszip.min.js`. No new packages.

Requests include the project brief, one task, observable test, latest checkpoint,
eligible source file map, and complete selected files. The character budget
includes all of these; an oversized request fails rather than truncating code.
The token count is only an estimate (characters divided by four).

The response contract is `### FILE: relative/path.js` followed by a fenced block
with complete contents. Longer backtick or tilde fences are supported. Missing
fences, duplicate/case-conflicting paths, known omission placeholders, unsafe
paths, and edits to unsent existing files reject the response. The parser cannot
prove semantic completeness or correctness. New files, empty replacements, and
large reductions are called out for student review. Nothing is executed here.

Source limits are 512 KB per file, 400 files, and 8 MB total. Hidden files,
credential-named files, dependencies/build output, lockfiles, minified files,
binary files, and invalid UTF-8 are excluded. These are selection aids, not a
secret scanner: students still inspect code before copying it into an AI chat.

Source is held in memory. Explicit session JSON downloads contain the loaded
text source, brief, task, and up to 100 checkpoints. They do not contain browser
folder permission, a pending response, or a prepared request. Opening a session
restores a snapshot; **Refresh source** reconnects a project folder while keeping
the task and notes. **Open project folder** starts a different project.

## Applying and recovering changes

Students approve each file individually. Folder-backed sessions can request
write permission in browsers supporting File System Access. Before saving, the
engine compares every target with its request snapshot. A stale or newly existing
file aborts preflight without replacing source. Originals are backed up in
`.code-bridge-backups/<unique-id>/` before any project replacements; a manifest
also identifies newly created files. This hidden backup tree is excluded from
future imports.

Multi-file browser writes are not transactional. On a mid-batch failure the UI
marks completed writes and reports the count and backup path. Reopen the current
folder and use backups to recover as needed. New files have no original backup.

The download fallback includes `changes/<path>`, `backup/<path>`, instructions,
and notes. It does not mark files as applied or tests as passed. It cannot check
for edits on disk: students compare/apply changes in VS Code and refresh source.
Loaded-source ZIPs and sessions contain eligible text files, not skipped assets.

## Verification

Run `node serve-local.js`, then:

```sh
npm run test:code-bridge
npm run check:code-bridge:browser
npm run a11y:page -- code-bridge.html
npm run a11y:page -- ai-coding-workflow.html
npm run check:lessons
npm run check:applications
npm run check:integrity
```

The browser check uses the repository's `findChromium()`. It verifies packet
generation, response rejection and text-only rendering, unchecked approvals,
ZIP backups, failed checkpoints, session restore, source filtering, and a
simulated folder permission/conflict/save flow. It reconnects current source to
a restored session without dropping notes. It also runs the actual downloadable
game before and after the fix, checks narrow-screen layout, and renders the
lesson for print. It never touches a student's real project folder.

Artifacts go to `/tmp/code-bridge-qa` by default. Override `CODE_BRIDGE_URL` and
`CODE_BRIDGE_QA_DIR` for another server/output location. Browser folder permissions
are simulated in automated checks; test actual device policy in class.

When editing curriculum registration, run the existing lesson/search/shelf
syncs and regenerate `data/module-glossaries.json`. The compendium outline
generator requires every lesson HTML file to be classified, so a classification
error elsewhere can block its output.
