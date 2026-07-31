# 3D model project rules

Isaiah's generated viewer at `apps/isaiah-tinker/` is the reference for all
3D-model projects. Do not copy or edit that generated folder. The build applies
the same viewer automatically to every current and future model.

## Submit a model

1. Put the source in `student-projects/<Student>/<optional grade or project>/`.
2. Use one `.obj` or `.stl` file for each project.
3. For a colored OBJ, export its `.mtl` file and textures into the same folder.
4. Keep the filename in the OBJ's `mtllib` line identical to the `.mtl` filename,
   including capitalization.
5. Use relative texture filenames in the MTL. Do not use paths from the computer
   that exported the model.
6. Run `npm run build`. Never edit `apps/<slug>/` directly; it is replaced during
   every build.

Example source layout:

```text
student-projects/
└── Isaiah/
    ├── tinker.obj
    ├── obj.mtl
    └── texture.png       # only when the material uses one
```

## What every generated viewer provides

- A centered, automatically framed model at any source scale.
- Automatic conversion from the Z-up convention used by CAD tools such as
  Tinkercad to the viewer's Y-up coordinate system.
- Perspective and orthographic projection.
- Front, side, top, and 3D camera presets.
- Orbit, zoom, pan, reset, auto-rotate, grid, and fullscreen controls.
- Mouse, trackpad, touch, and keyboard support.
- Imported OBJ materials and textures when supplied; a readable neutral material
  when they are missing or fail to load.
- A responsive layout and screen-reader status messages.

Keyboard shortcuts are `1` for front, `2` for side, `3` for top, `0` for 3D, and
`R` to reset.

## Acceptance checks

After `npm run build`:

- Open `apps/<slug>/` through `node serve-local.js`; do not test with a `file://`
  URL because browser asset-loading rules differ.
- Confirm the model is visible, centered, upright, and resting near the grid.
- Try all four camera presets, zoom, pan, projection, grid, and fullscreen.
- Check a phone-sized viewport and verify the toolbar scrolls without covering the
  model.
- Run `npm run check:integrity` before publishing.

The shared implementation lives in `processModelProject()` and
`buildModelViewerScript()` in `build-showcase.js`. Update those functions when the
viewer itself changes so every model stays consistent.
