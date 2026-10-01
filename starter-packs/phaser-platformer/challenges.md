# Star Hop challenges

Change one thing, run it, and check it works before starting the next.

## Level 1: Tuner

- Change the colours in `makeTextures()` and the `backgroundColor`.
- Make the level harder: narrower platforms, bigger gaps, or more spikes.
- Add a seventh star somewhere tricky but possible.
- Change the HUD font size and the win message.

## Level 2: Systems builder

- Add three lives. Lose one on spikes and add a `LoseScene`.
- Add a timer to the HUD and show the final time on the win screen
  (hint: `this.time.now` is the scene clock in milliseconds).
- Add a double jump by counting jumps and resetting the count on landing.
- Add a `TitleScene` with instructions that waits for Space.

## Level 3: Game designer

- Add a bouncing hazard with `setBounce(1)` that collides with platforms.
- Replace the drawn player with your own image using `this.load.image` (you will need
  a local server and an image you are allowed to use; log it in `credits.txt`).
- Make the world wider than the screen and have the camera follow the player
  (`this.cameras.main.startFollow(...)` and `setBounds`).
- Add a second level as a new scene, reached when the first is cleared.

## Done means

- The game can be won and, if you added lives, lost.
- A new player understands the controls without asking you.
- There are no red errors in the browser console.
- You can explain the difference between `collider` and `overlap`, and between static
  and dynamic bodies.
