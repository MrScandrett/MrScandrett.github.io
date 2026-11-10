# 3D tools: what's next (hand-off note)

Read this before touching import/export in the 3D design tools. The shared pieces are documented in
CLAUDE.md under **Mesh import + Print Prep**; this file is the plan for what is left.

## Done (Nov 2026)

1. **Shared importer** `assets/js/mesh-import.mjs`: STL / OBJ / 3MF → Z-up soup + a units reading.
   Writers in `assets/js/fab-io.mjs` (STL, OBJ, GLB, and now `write3mf`).
2. **Print Prep** (`print-prep.html`): replaced the canned "Plan a printable orientation" slider with real
   software. Open any model, rank orientations (`assets/js/print-orient.mjs`), click a face to lay it flat,
   fix units, export STL / 3MF.
3. **Workbench imports models** (STL / OBJ / 3MF) as assets: closed meshes are real solids, open ones are
   display-only. Source + licence fields. Assets live in IndexedDB and inside Save a copy.
4. **Hand-off** `assets/js/handoff.mjs`: Forge / Workbench / Marble → Print Prep, Print Prep → Workbench.
5. **Workbench imports SVG** (`assets/js/svg-outline.mjs`): filled outlines, holes kept, extruded by the
   `svg` shape; Hole engraves.
6. **Blueprint Drafting: DXF out, DXF in, "Build it in Workbench"** (`assets/js/dxf.mjs`, pure;
   `tests/dxf.test.mjs`). Export is ASCII R12 in mm (`$INSUNITS` 4), layers OUTLINE / HIDDEN (DASHED) / CENTER /
   DIMENSIONS, rects as closed POLYLINE, dimensions as LINE + TEXT, views third-angle at fixed panel offsets
   (`LAYOUT`), so our own files come back shape for shape. Import reads LINE, LWPOLYLINE (bulges), POLYLINE/VERTEX,
   CIRCLE/ARC (segments), mirrored OCS, one level of INSERT; skipped types are reported by name and count; units
   from `$INSUNITS` (missing → mm, said). A foreign file is split into views when its clusters form third-angle
   L-shapes *and* share sizes (top width = front width, right height = front height); otherwise it is centred in
   the current view, refused if bigger than the board at 1:1. "Build it in Workbench" needs the page's "views"
   check plus `viewsAgree()` (width / height / depth within 1 mm), sends the top view's closed outlines (object
   rects + closed loops of object lines, each its own path, unioned in Workbench, so pockets don't punch through)
   as `<name>-top.svg` with `data-workbench-height` = front height; `receiveHandoff()` routes `.svg` to
   `importSvg`. Pockets and slots are left for Holes in Workbench (the message says so).

## Next, in order

### 1. Lesson workshops: "Open in Workbench"

Files: `assets/js/design3d/workspace.mjs` (the shared workshop runner), `assets/js/design3d/workshops.mjs`
(`WORKSHOPS`, `PAGE_MODES`). Pages: Arrange a display (`lessons/3d-design/blender/blender-interface-basics.html`),
Cut an opening (`…/blender-windows-doors.html`), Sculpt a surface (`…/blender-sculpting.html`), and the other
`data-design3d-workshop` lessons.

- The workshop already builds a mesh (`designSnapshot()`, `toPrintSpace()` + `writeBinaryStl` for its STL
  export). Add an **Open in Workbench** button next to Export that sends that STL through
  `sendAndOpen('…/workbench.html', { bytes, filename, from: '<workshop title>' })` (path relative to the
  lesson's depth). For Sculpt also offer **Print Prep**.
- Don't build importers into the workshops: they are lessons; Workbench is the tool.
- Check in a browser that the new tab opens and the model arrives (see how the earlier hand-offs were tested:
  wait for `page.waitForURL(/workbench/)` before reading the page, the tab starts on about:blank).

### Later (not started)

- **Mesh simplifier** for imports over Workbench's 100k-triangle limit (quadric edge collapse), so students
  don't need Blender's Decimate first. Put it in its own pure module with a test.
- **SVG text**: today text must be converted to paths in Inkscape. Workbench already has a typeface font
  (`assets/vendor/fonts/droid-sans-bold.typeface.json`) used by the Text shape; `<text>` could map to it.
- **Print Prep strength hint**: the ranking ignores layer direction on purpose; a "layers run this way" overlay
  would teach it without pretending to compute strength.

## Checks that matter for this work

`npm test` (includes `tests/mesh-import`, `print-orient`, `workbench-import`, `svg-outline`), `npm run quality`,
`npm run a11y:page -- <page>` for every page you touch (Print Prep is in `.pa11yci.json`), and `npm run build:dist`.
Drive the real pages with Playwright against `node serve-local.js`; canvas tools can't be checked statically.
