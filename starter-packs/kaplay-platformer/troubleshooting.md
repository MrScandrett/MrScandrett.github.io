# Troubleshooting

## The page shows but the game area is empty or black

- Open the console (`F12` → *Console*) and read the first red error.
- `kaplay is not defined`: `lib/kaplay.js` is missing or the `<script>` path is wrong.
  The engine must load **before** `game.js`.
- Did you unzip? A game opened from inside a ZIP cannot load `lib/kaplay.js`.

## The keys do nothing

- Click the game once. The canvas only receives keys when it has focus.
- Check the key names: KAPLAY uses `"left"`, `"right"`, `"up"`, `"space"`, and
  letters like `"a"`.

## The player falls through the floor or floats

- Falling through: the platform needs both `area()` and `body({ isStatic: true })`.
- Floating: the player needs `body()`, and `setGravity(...)` must run before play.

## The player cannot jump

- Jumping only works when `player.isGrounded()` is true. If the player is standing
  on something without `body({ isStatic: true })`, it does not count as ground.

## A coin cannot be collected

- It needs `area()` and the exact tag `"coin"`. Tags are case-sensitive.
- Check that the player can physically reach it: the jump rises about 120 pixels.

## Images or sounds will not load

- Browsers block `loadSprite`/`loadSound` from a double-clicked file. Use the VS
  Code Live Preview or Live Server extension and open the page through it.
