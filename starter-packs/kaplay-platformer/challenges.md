# Coin Climb challenges

Change one thing, run it, and check it works before starting the next.

## Level 1: Tuner

- Change the colours of the player, coins, platforms, and background.
- Make the level harder: narrower platforms, a wider gap, or more spikes.
- Add a seventh coin somewhere tricky but possible.
- Change the HUD text and the win message.

## Level 2: Systems builder

- Add three lives. Lose one on spikes or falling, and add a `"lose"` scene.
- Add a timer to the HUD and show the final time on the win screen.
- Add a double jump (look up the `doubleJump()` component, or count jumps yourself).
- Add a `"title"` scene with instructions that waits for Space.

## Level 3: Game designer

- Add an enemy that patrols back and forth on one platform.
- Build a second level and go to it after the first is cleared (hint: pass the
  level number into `go("play", 2)` and read it in the scene).
- Add sound effects with `loadSound` and `play` (you will need a local server and a
  sound you are allowed to use; log it in `credits.txt`).
- Make a moving platform. Then figure out how to keep the player riding on it.

## Done means

- The game can be won and, if you added lives, lost.
- A new player understands the controls without asking you.
- There are no red errors in the browser console.
- You can explain what `area()`, `body()`, and tags do.
