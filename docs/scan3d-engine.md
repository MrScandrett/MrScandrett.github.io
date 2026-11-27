# Shared 3D Scanning Engine (`assets/js/scan3d/`)

ClassroomOS includes a reusable, browser-native image-based 3D scanning and model-calibration engine shared across lessons and classroom apps (including **Brick Rally** and the **Class Fish Tank**).

## Modules

1. **`assets/js/scan3d/core.mjs`** — Pure ES module (no DOM, no Three.js; runs in browsers and `node --test`).
   - `transformImageData(img, { rotate, flipX, crop })`: normalizes photo orientation.
   - `segmentImage(img, { bgColor, thresholdOffset, floodFill, fillHoles, minBlobRatio })`: border-ring median or user-eyedropper background detection, Otsu auto-thresholding, border flood-fill (keeps bright details inside the object intact), enclosed hole filling, and connected-component filtering.
   - `carveVolume(input, opts)`: visual-hull space carving supporting both **3-View orthographic** (`{ side, front?, top?, back?, otherSide? }`) and **360° Turntable** (`[{ angleDeg, img }, ...]`) photo sets, plus single-view 2D-distance-transform rounded 3D inflation (`profile: 'rounded'`). Projects outward surface normals onto the best-aligned photo for RGB colors.
   - `volumeToMesh(volume, { style, targetSize, centerY, forwardAxis, smoothPasses, blurPasses })`: converts a carved volume into an indexed, watertight, vertex-colored 3D mesh using padded **Naive Surface Nets** + **Taubin smoothing** (or flat-shaded culled voxels).
   - `volumeToBrickGrid(volume, { W, L, H, paletteRgb, skipPaletteIndices })`: quantizes any 3-View or Turntable scan onto a discrete LEGO-style palette voxel grid.
   - `computeOrientationMatrix(dots, { forwardAxis })`, `applyOrientationToMesh(mesh, dots, opts)`, `defaultDotsForMesh(mesh, opts)`: shared 3-dot (`head/tail/back` or `front/rear/top`) orientation calibration math.
   - `encodeColoredGlb(mesh, opts)` / `encodeStl(mesh, opts)` / `bytesToDataUrl(bytes, mime)`: exports compact vertex-colored binary glTF 2.0 (`.glb`) and print-ready Z-up binary `.stl` via `assets/js/fab-io.mjs`.

2. **`assets/js/scan3d/calibrator.mjs`** — Interactive Three.js 3D preview & dot-placement calibrator running on `assets/vendor/three-bundle.min.js`.
   - `createCalibrator(canvas, { landmarks, previewTarget, onChange, onGuide })`: renders scanned meshes, `.stl`, or `.glb` files with OrbitControls and raycasted landmark spheres (`FISH_LANDMARKS`, `CAR_LANDMARKS`, or custom landmarks).

3. **`assets/js/scan3d/widget.mjs`** + **`assets/css/components/scan3d.css`** — Embeddable UI widget (`mountScan3D(container, opts)`).
   - Provides 3-View & Turntable modes, webcam capture with directional guides, per-shot rotate/flip/clear, click-to-sample background eyedropper, live mask sensitivity slider, and `.GLB` / `.STL` / **Print Prep** (`handoff.mjs`) export actions.

## Canonical Coordinate System

- Scanned volumes use Y-up coordinates: `+X` right, `+Y` up, `+Z` front/nose.
- Pass `forwardAxis: '+x'` to `volumeToMesh()` when targeting worlds where `+X` is forward (e.g. `student-fishtank.mjs`), or `forwardAxis: '+z'` for vehicle/printing scenes (e.g. Brick Rally).
- `computeOrientationMatrix(dots, { forwardAxis })` matches `student-fishtank.mjs`'s original 3-point (`head`, `tail`, `back`) and 2-point fallback math so existing Firebase fish records render identically.
