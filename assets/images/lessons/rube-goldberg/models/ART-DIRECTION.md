# Chain Reaction Workshop art direction

The simulator uses a **friendly low-poly classroom construction kit** style.
The supplied Poly Pizza models remain the recognizable visual anchors; original
parts are built to share their soft bevels, simple materials, modest polygon
count, three-quarter camera, and toy-like proportions.

## Palette

- Workshop navy: `#071c30`
- Painted steel: `#668fa6`
- Warm ivory: `#d9cfb4`
- Safety yellow: `#e8950d`
- Signal red: `#c72f24`
- Workshop mint: `#3d9c79`
- Wood brown: `#8a562b`

## Rendering rules

- Orthographic three-quarter camera at the shared sprite-render angle.
- Soft upper-left key light with broad fill and medium-high contrast.
- Rounded or beveled edges; no razor-sharp interface rectangles.
- One dominant material plus two or three functional accents per object.
- Transparent 256px square masters with consistent framing and visual scale.
- Exposure is baked during rendering; runtime canvas filters are avoided so the
  physics loop remains smooth on classroom hardware.
- The same master sprite appears in the cabinet and on the workbench.
- Board-level contact shadows remain fixed to the scene and do not rotate with
  baked sprite lighting.
- Visible sprite size should remain close to the corresponding physics body.
