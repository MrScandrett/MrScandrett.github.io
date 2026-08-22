# Catch Circuit challenges

## Level 1: Modify

- Change the palette and window title.
- Add J/L as alternate movement keys.
- Make the target wider after three missed sparks.
- Display misses beneath the score.

## Level 2: Build a system

- Add three lives and a game-over state.
- Increase fall speed every five catches.
- Spawn two sparks without duplicating the update and drawing code.
- Add a start screen and pause key.

## Level 3: Design a game

- Add dangerous red objects that must be avoided.
- Replace rectangles with original sprites and document their licenses.
- Add sound effects plus visible mute control.
- Store a high score in a small JSON file.

## Testing evidence

Test at 30 and 120 FPS by changing `clock.tick(...)`. Movement should cover
approximately the same distance per second because it uses delta time.
