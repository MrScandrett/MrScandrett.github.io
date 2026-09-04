# Blender pathway setting audit

Verified for **Blender 5.2 LTS** on 2026-08-27. A lesson passes this audit when every setting or interface-dependent action has either:

1. an authentic Blender screenshot close to the instruction, or
2. a visible breadcrumb naming the editor, mode or tab, and menu sequence.

Keyboard-first modeling actions such as `G`, `E`, `U`, and `Ctrl+R` are already implicit directions and do not require a settings screenshot.

## Coverage

| Lesson | Setting or interface action | Student-facing direction | Evidence |
|---|---|---|---|
| 01 Interface | Emulate Numpad | Edit → Preferences → Input → Keyboard → Emulate Numpad | breadcrumb |
| 01 Interface | view orientation | View → Frame Selected, numpad shortcuts, and authentic axis-gizmo image | both |
| 01 Interface | light Power | Properties Editor → Object Data Properties → Light → Power | breadcrumb |
| 01 Interface | viewport shading | Z → Material Preview | breadcrumb |
| 02 Windows | metric units | Properties Editor → Scene Properties → Units → Unit System → Metric; Length → Meters | breadcrumb |
| 02 Windows | exact dimensions | 3D Viewport → Sidebar (N) → Item → Transform → Dimensions | breadcrumb |
| 02 Windows | Boolean | Properties Editor → Modifiers → Add Modifier → Generate → Boolean | breadcrumb and authentic panel image |
| 02 Windows | Bevel and Array | Properties Editor → Modifiers → Add Modifier → Generate → Bevel or Array | breadcrumb |
| 02 Windows | Face Orientation | 3D Viewport header → Viewport Overlays → Geometry → Face Orientation | breadcrumb |
| 03 Furniture | scale reference | Shift+A → Mesh → Cube; Sidebar (N) → Item → Transform → Dimensions | breadcrumb |
| 03 Furniture | object origin | 3D Viewport header → Object → Set Origin → Origin to 3D Cursor | breadcrumb |
| 03 Furniture | Mirror | Properties Editor → Modifiers → Add Modifier → Generate → Mirror | breadcrumb and authentic symmetry images |
| 03 Furniture | Bevel | Properties Editor → Modifiers → Add Modifier → Generate → Bevel | breadcrumb |
| 03 Furniture | smooth by angle | 3D Viewport → Object Mode → Object → Shade Auto Smooth | breadcrumb with Blender 5.2 behavior note |
| 03 Furniture | apply modifier | modifier panel down-arrow menu → Apply | breadcrumb |
| 04 Environments | snapping | 3D Viewport header → Snapping → Snap To → Increment | breadcrumb |
| 04 Environments | grid overlay | 3D Viewport header → Viewport Overlays → Guides → Grid | breadcrumb |
| 04 Environments | single-user data | Object → Relations → Make Single User → Object & Data | breadcrumb |
| 04 Environments | Collections | Outliner → right-click empty space → New Collection | breadcrumb |
| 04 Environments | Sun light | Shift+A → Light → Sun; Object Data Properties → Light → Strength | breadcrumb and authentic light images |
| 05 Character | reference image | 3D Viewport → Shift+A → Image → Reference | breadcrumb |
| 05 Character | topology statistics | 3D Viewport header → Viewport Overlays → Text Info → Statistics | breadcrumb |
| 05 Character | faces by sides | Edit Mode → Select → Select All by Trait → Faces by Sides | breadcrumb and authentic topology images |
| 05 Character | Mirror and Subdivision | Properties Editor → Modifiers → Add Modifier → Generate | breadcrumb |
| 05 Character | edge crease | Sidebar (N) → Item → Transform → Edge Data → Crease | breadcrumb |
| 05 Character | smooth shading | Object Mode → Object → Shade Smooth by Angle | breadcrumb |
| 06 Props | Boolean, Bevel, Weighted Normal | Properties Editor → Modifiers → Add Modifier → category → modifier | breadcrumb and authentic modifier images |
| 06 Props | modifier order and apply | modifier stack drag; panel down-arrow menu → Apply | breadcrumb |
| 07 Materials | UV Grid | UV Editor → Image → New → Generated Type → UV Grid | breadcrumb and authentic UV image |
| 07 Materials | new material | Properties Editor → Material Properties → New | breadcrumb |
| 07 Materials | Image Texture | Shading workspace → Shader Editor → Shift+A → Texture → Image Texture | breadcrumb |
| 07 Materials | World strength | Properties Editor → World Properties → Surface → Background → Strength | breadcrumb |
| 07 Materials | light Power | Shift+A → Light → Area; Object Data Properties → Light → Power | breadcrumb; older concept image explicitly labeled |
| 07 Materials | render engine | Properties Editor → Render Properties → Render Engine → EEVEE or Cycles | breadcrumb |
| 07 Materials | active camera view | Numpad 0 | implicit shortcut |
| 07 Materials | align camera to view | Ctrl+Alt+Numpad 0; View → Align View → Align Active Camera to View | shortcut and breadcrumb |
| 07 Materials | render and save | Render → Render Image; Image → Save As | breadcrumb |
| Workspaces: Sculpting | enter Sculpt Mode | Workspace tab bar → Sculpting, or Object Mode dropdown → Sculpt Mode | breadcrumb and authentic workspace image |
| Workspaces: Sculpting | Dyntopo toggle | Sculpt Mode toolbar header → Dyntopo, or Ctrl+D | breadcrumb and shortcut |
| Workspaces: Sculpting | Voxel Remesh | Sculpt Mode → Remesh panel → Voxel Size → Remesh, or Ctrl+R | breadcrumb and shortcut |
| Workspaces: Sculpting | Mask / Face Sets | Sculpt Mode → M (Mask brush), Ctrl+I invert; Face Set tool → Ctrl+drag | breadcrumb and shortcut |
| Workspaces: Geometry Nodes | add modifier | Properties Editor → Modifier Properties → Add Modifier → Geometry Nodes, or Geometry Nodes workspace → New | breadcrumb and authentic modifier-panel image |
| Workspaces: Geometry Nodes | expose an input | Node editor Sidebar (N) → Group tab → + to add a socket | breadcrumb |
| Workspaces: Geometry Nodes | preview a node | Ctrl+Shift+click a node in the node editor | shortcut |
| Workspaces: Compositing | enable node graph | Compositing workspace → header → Use Nodes | breadcrumb and authentic workspace image |
| Workspaces: Compositing | Viewer node | Shift+A → Output → Viewer, or Ctrl+Shift+click a node | breadcrumb and shortcut |
| Workspaces: Compositing | Glare / Color Balance | Shift+A → Filter → Glare; Shift+A → Color → Color Balance | breadcrumb |

## Corrections made during the 5.2 audit

- Corrected **Align Active Camera to View** from `Ctrl+Numpad 0` to `Ctrl+Alt+Numpad 0`. The former sets the selected camera as active; it does not align the camera to the current view.
- Replaced the removed Weighted Normal **Auto Smooth** checkbox instruction. Blender 5.2 uses **Shade Auto Smooth**, which adds a pinned **Smooth by Angle** modifier.
- Replaced the vague “checker overlay” instruction with the actual UV Editor generated-image path.
- Replaced the inaccurate custom grid-subdivision instruction with Blender's real grid overlay behavior plus exact typed movement and Sidebar dimensions.
- Labeled the archived Blender 2.79 three-point-light screenshot as a concept diagram and placed current 5.2 paths in its caption.

## Primary references

- [Blender 5.2 LTS manual](https://docs.blender.org/manual/en/5.2/)
- [Blender 5.2 shading operations](https://docs.blender.org/manual/en/5.2/scene_layout/object/editing/shading.html)
- [Blender 5.2 preferences](https://docs.blender.org/manual/en/5.2/getting_started/configuration/introduction.html)
- [Blender 5.2 modifiers](https://docs.blender.org/manual/en/5.2/modeling/modifiers/introduction.html)
- [Blender 5.2 Weighted Normal modifier](https://docs.blender.org/manual/en/5.2/modeling/modifiers/normals/weighted_normal.html)
- [Blender 5.2 camera alignment](https://docs.blender.org/manual/en/5.2/editors/3dview/navigate/align.html)
- [Blender 5.2 viewport overlays](https://docs.blender.org/manual/en/5.2/editors/3dview/display/overlays.html)
- [Blender 5.2 release and support status](https://www.blender.org/releases/5-2/)
