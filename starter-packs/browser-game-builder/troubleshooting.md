# Browser game troubleshooting

## The page is blank

Open the browser developer tools, choose Console, and read the first red error.
Check that `index.html`, `style.css`, and `game.js` are in the same folder.

## The page appears, but the game does not move

Click the game once, then try WASD. Check that `game.js` is loaded and that the
game loop still calls both `update(dt)` and `render()`.

## Movement speed changes between computers

Confirm that movement uses `speed * dt`, where `dt` is measured in seconds.

## The player passes through an object

Check the `x`, `y`, `w`, and `h` values of both rectangles. Draw their bounds
temporarily with `ctx.strokeRect(...)` so invisible collision boxes become visible.

## Changes do not appear

Save the file and hard-refresh the browser. Confirm that you edited the copy
that the open `index.html` actually references.
