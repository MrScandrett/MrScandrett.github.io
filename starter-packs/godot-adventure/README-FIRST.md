# Godot Adventure Starter: Signal Run

Signal Run is a complete, asset-free Godot 4 project. It opens into a playable
third-person collection game so you can study a working scene before extending it.

## Your first 10-minute success

1. Open Godot 4 and choose **Import**.
2. Select this folder's `project.godot`.
3. Press F6 or F5. Move with WASD, look with the mouse, jump with Space, and
   collect all six energy cells.
4. Press Escape to release or recapture the mouse.
5. Open `scripts/player.gd`, change `move_speed`, save, and run again.

No external models, textures, or addons are required. Every placeholder shape is
created by code so missing assets cannot prevent the first run.

## Project map

- `project.godot`: engine settings and named input actions.
- `scenes/main.tscn`: tiny entry scene with a script attached.
- `scripts/main.gd`: builds the level, HUD, goal, and collectible instances.
- `scripts/player.gd`: movement, gravity, jump, camera, and input.
- `scripts/collectible.gd`: a reusable signal-emitting game object.
- `challenges.md`: three levels of extensions.
- `troubleshooting.md`: common editor, scene, input, and collision problems.
- `extensions/`: commented examples to consult after attempting a challenge.

## Tutorial 1: Read the scene as responsibilities

At runtime, use the Remote scene tree. The responsibilities are deliberately
separate:

```text
Main                 owns level rules and score
├── WorldEnvironment owns lighting/background
├── Floor            owns visible ground and collision
├── Player           owns movement and camera
├── Collectible...   detects the player and announces collection
└── HUD               displays state but does not own it
```

## Tutorial 2: Follow one event

When the player touches a collectible:

1. `Area3D.body_entered` detects the player.
2. The collectible emits its own `collected` signal.
3. `main.gd` receives the signal and changes `score`.
4. `update_hud()` displays the new state.

This separation lets you change the HUD without rewriting collision behavior.

## Tutorial 3: Change one layer at a time

Make one edit, press Play, and observe. Keep restore-point copies of the entire
project before major features. Do not add inventory, enemies, dialogue, and saving
at the same time: prove the smallest useful version of one system first.

## Comment key

- `WHAT`: the job of the code;
- `WHY`: the architectural or gameplay reason;
- `TRY THIS`: a safe experiment;
- `TEST`: visible evidence that the code works.
