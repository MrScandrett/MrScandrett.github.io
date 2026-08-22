# Godot Adventure troubleshooting

## Godot asks which project to open

Choose Import and select `project.godot`, not `main.tscn`.

## The project reports parser errors

Open the first red message in the Output panel. Fix the earliest reported script
and line before chasing later errors, which may be consequences of the first.

## The player falls through the floor

Confirm the player has a `CollisionShape3D`, the floor is a `StaticBody3D` with a
shape, and their layer/mask settings overlap. Visible meshes do not create physics.

## A collectible is visible but cannot be collected

Inspect the Remote scene tree while running. Check that its `Area3D` is monitoring,
has a shape, and scans the player's collision layer.

## The camera captures the mouse

Press Escape to release it. Click inside the game and press Escape again to recapture.

## An imported asset appears pink or missing

Keep the source media inside the project folder, wait for import to finish, and
move files through Godot's FileSystem dock so references can update.
