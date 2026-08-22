# Browser Game Builder: Signal Sweep

You are building a complete canvas game using plain HTML, CSS, and JavaScript.
No library, account, or internet connection is required.

## Your first 10-minute success

1. Open this folder in VS Code.
2. Open `index.html` in a browser. A local server extension is helpful but not required.
3. Move with WASD or the arrow keys.
4. Collect all five signal orbs while avoiding the red glitch.
5. Open `game.js`, find `PLAYER_SPEED`, change `220` to `320`, save, and refresh.

You just completed the edit-run-observe loop used by professional developers.

## File map

- `index.html` supplies the canvas, interface, and accessible instructions.
- `style.css` controls the presentation and responsive layout.
- `game.js` contains input, update, collision, drawing, and game state.
- `challenges.md` contains three levels of extensions.
- `troubleshooting.md` helps diagnose the most common problems.
- `finished-example/` contains a compact reference build with an extra dash ability.

## Guided checkpoints

### Checkpoint 1: Input

Find the `keys` object and keyboard event listeners in `game.js`. Add `KeyJ` as
another left-movement key. Confirm that both A and J move the player left.

### Checkpoint 2: Update

Find `updatePlayer(dt)`. Temporarily remove `* dt` from one movement line. The
game will now move at different speeds on different computers. Restore it when
you have observed the problem.

### Checkpoint 3: Collision

Find `overlaps(a, b)`. Draw two rectangles on paper and label their left, right,
top, and bottom edges. Explain why all four comparisons must be true.

### Checkpoint 4: Game state

Find the `state` object. Add a `bestScore` property, then display it in the HUD.

## How to learn from the comments

- `WHAT` identifies the job a section performs.
- `WHY` explains the design reason.
- `TRY THIS` suggests a safe experiment.
- `CHECKPOINT` tells you what should happen before continuing.

Do not delete all comments immediately. Remove them only after you can explain
the system in your own words.
