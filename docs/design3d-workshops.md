# 3D Design workshops

The curriculum home is `lessons/3d-design/3d-design.html`. Every 3D lesson lives under `lessons/3d-design/`: `cad-and-printing/` (CAD → Forge → print), `blender/` and `game-asset-studio/`. Links from before the move are forwarded by `404.html` (see `assets/js/lesson-moves.js`). Lessons lead with a software-neutral workshop; the older app walkthrough and production workflow sit in an expandable reference section.

## Shared components

- `assets/js/design3d/workshops.mjs`: technique briefs, parameter bounds, page-to-workshop mapping, project validation and practice criteria.
- `assets/js/design3d/geometry.mjs`: editable starter geometry, mesh sculpt strokes, skinning, UV coordinates and static OBJ export.
- `assets/js/design3d/workspace.mjs`: Three.js workspace, camera controls, undo/redo, project persistence, file transfer, support levels and student explanations.
- `assets/js/design3d-route.js`: curriculum context and track links.
- `assets/css/components/design3d-workspace.css`: responsive workspace and reference layout.

A page mounts a workshop with:

```html
<section data-design3d-workshop="sculpt"></section>
<script src="../../assets/js/sim-kit.js"></script>
<script src="../../assets/js/tool-rosetta.js"></script>
<script type="module" src="../../assets/js/design3d/workspace.mjs"></script>
```

Load the workspace stylesheet at the page's correct depth. Use the vendored Three.js bundle and `createScene`; do not introduce a CDN dependency. New modes need a challenge, one technique, guided steps, independent and extension tasks, numeric controls, a geometry implementation, honest test criteria, and a software-transfer path.

## Student work and scope

The furniture and modular-room reference pages share the same workshop state as their Game Asset Studio counterparts. Students should reuse the asset instead of rebuilding it.

- Work is kept in this browser per technique, and can be downloaded as `.design3d.json`.
- **Chapter 1 Foundation continuity**: The model transfers seamlessly across Foundation lessons (`navigate` → `transform` → `boolean`). Dimensions, proportion adjustments, and colors persist via cross-lesson project import and automatic local session carryover.
- **Control Scheme presets**: The `navigate` workspace supports Tinkercad (LMB orbit, RMB pan), Blender (MMB orbit, Shift+MMB pan), and Fusion 360 (Shift+MMB orbit, MMB pan) mouse and modifier bindings, training students in transferable spatial navigation muscle memory.
- **Asymmetrical starter geometry**: `navigate` uses a stepped bracket with an asymmetrical back-wall, front flange, and fiducial center pin so standard views (front, right, top, isometric) have unambiguous silhouettes during 360° orbit.
- A saved workshop recipe can reopen in the same technique. Materials, compositing and UV workshops can reuse geometry from another workshop project.
- OBJ contains a static triangle mesh and UVs where available. It does not package materials, CAD history, bones or animation. Surface color and editable settings remain in the workshop project.
- Print and clearance workshops also export binary STL in millimeter coordinates, converting the Y-up scene to a Z-up print bed. Verify dimensions in the slicer.
- PNG capture records the current scene view. Texture PNG export records the base checker tile; repeat density is a destination-material setting.
- The rig exercise uses an actual two-bone skinned mesh. The animation exercise interpolates student-authored joint poses; workshop JSON preserves those keys, while OBJ is only a posed snapshot.
- The sculpt exercise displaces and smooths a mesh surface. It is not a replacement for a full sculpting application.
- The compositing exercise teaches exposure and presentation, not node compositing or render passes.
- Print orientation and clearance checks are geometry practice, not physical-print verification or slicer predictions. Millimeter coordinates are labeled; students verify units on import and test their printer.
- A workshop checkpoint records observable practice criteria. It does not certify a finished game asset, structural design or print. Production files are tested in the chosen app, a slicer, an engine, or Asset Bench as appropriate.

Tool Rosetta supplies equivalents for its supported applications. The free-text app field and transfer checklist accommodate other software without claiming that every tool supports every operation.

## Verification

```bash
node --test --test-isolation=none tests/design3d-workshops.test.mjs
node --check assets/js/design3d/workspace.mjs
npm run check:integrity
npm run check:lessons
npm run check:compendium-plan
npm run check:steam-lessons-compendium
```

Browser checks must cover actual geometry edits, camera views, undo/redo, authored keyframes and playback, sculpt strokes, save/open, OBJ/PNG downloads, model reuse, keyboard controls, mobile overflow and the WebGL fallback. Test expanded reference sections as well as the default workshop view. Avoid concurrent browsers on low-memory systems; run bounded page batches with the cached full Chromium build via `findChromium()`.
