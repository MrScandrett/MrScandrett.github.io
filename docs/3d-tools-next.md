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

## Next, in order

### 1. Blueprint Drafting: DXF out, DXF in, "Build it in Workbench"

Files: `lessons/3d-design/cad-and-printing/blueprint-drafting.html`, `assets/js/lessons/blueprint-drafting.js`.

What the drafting data looks like today: `project = { version: 1, title, guide, views: { front, top, right } }`;
each view is a list of `{ kind: 'line'|'rect'|'dimension', type: 'object'|'hidden'|'center', x1, y1, x2, y2 }`
in SVG units, **2 units = 1 mm** (the dimension label is `Math.round(length / 2)` mm), y down. Export today is
only SVG (one view or a three-view sheet) plus a `.blueprint.json` project.

- Put the format code in a new pure module (e.g. `assets/js/dxf.mjs`) with tests; keep the page script thin
  (CLAUDE.md: lesson code in `assets/js/lessons/`, maths in a DOM-free file with a test).
- **DXF export**: ASCII R12 (AC1009) is what laser cutters, LibreCAD, FreeCAD, Fusion and Onshape all take.
  `$INSUNITS = 4` (mm). Lines as `LINE`, rectangles as closed `POLYLINE`/`VERTEX`/`SEQEND` (R12 has no
  LWPOLYLINE). Layers `OUTLINE`, `HIDDEN` (linetype `DASHED`, define it in the LTYPE table), `CENTER`
  (`CENTER` linetype), `DIMENSIONS`. Dimensions as a `LINE` + `TEXT` ("40 mm"), not real DIMENSION entities
  (their block structure isn't worth it here). Flip y (DXF y is up). Lay the three views out third-angle
  (top above front, right to the right of front) with a gap, so the file opens as a proper sheet.
- **DXF import**: read `LINE`, `LWPOLYLINE`, `POLYLINE`/`VERTEX`, `CIRCLE`/`ARC` (as line segments; the
  drafting tool has no circle), and unpack `INSERT` blocks one level. Report what was skipped by name and count
  ("3 SPLINE, 1 HATCH skipped") rather than dropping it silently. Units from `$INSUNITS` (missing → mm, say so).
  Place into the current view, or split by position if the file is a three-view sheet. Respect the existing
  validator (`readProject` / `shapeKinds`) and its size limits.
- **"Build it in Workbench"**: take the closed outline of the **top** view (union of its object-type rects /
  closed line loops), extrude by the **front** view's height, and send it with the hand-off:
  build an SVG string of the outline and send it as a `.svg` file (Workbench already imports SVG through
  `importFiles` → `importSvg`), or extend `receiveHandoff()` in `assets/js/workbench/workbench.mjs` to accept
  an `.svg` filename (today it calls `importModel`, which only reads meshes; route `.svg` to `importSvg`).
  Gate it on the lesson's own "views agree" check (`setCheck('views', …)` in blueprint-drafting.js) and say
  why when it is refused.
- Tests: round trip (export → import gives the same shapes), a hand-written LibreCAD-style DXF imports,
  units conversion, refused-when-views-disagree.

### 2. Lesson workshops: "Open in Workbench"

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
