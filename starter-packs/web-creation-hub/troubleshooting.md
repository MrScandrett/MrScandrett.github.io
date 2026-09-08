# Creation Hub troubleshooting

Open the browser developer tools before guessing: **F12**, or Ctrl+Shift+I
(Cmd+Option+I on a Mac), then the **Console** tab. Read the FIRST red line. It
names the file and the line number, which is usually the whole answer.

## The hub page

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Headings appear but no cards and no filter buttons | JavaScript stopped on an error before it drew anything | Console tab, first red line. A missing comma between two objects in `CREATIONS` is the most common cause by a wide margin. |
| The whole page is unstyled text | The browser did not find `style.css` | `index.html` needs `href="style.css"` and the file must sit beside it. Opening only `index.html` in VS Code does not break this, but moving files does. |
| A creation's card never appears under any filter except All | Its `category` is spelled differently from what you expect | `"Game"` is not `"game"`, and `"art "` with a trailing space is invisible but real. Filters are built from the data, so a typo makes its own button — look for a button you did not expect. |
| A filter shows an empty area with no explanation | The `#no-matches` block was removed or renamed | `renderCards()` sets `noMatches.hidden`. If the element or its id is gone, the empty state can never appear. An empty screen reads as a bug; a sentence reads as an answer. |
| Two filter buttons look pressed at once | `aria-pressed` is set but never unset | `setPressed()` must loop over **every** button and set true or false on each, not only set true on the clicked one. |
| `Uncaught TypeError: Cannot read properties of null` | An id in the HTML does not match the selector in the JavaScript | The HTML has `id="creation-list"`, `id="filter-buttons"`, `id="catalog-status"` and `id="no-matches"`. Compare them character by character, hyphens included. |
| Cards pile up instead of being replaced when filtering | The list is never cleared | `renderCards()` must begin with `list.replaceChildren();`. |
| Clicking Open gives "file not found" | The `path` in the data does not match the folder on disk | Read the address bar — it shows exactly where the browser looked. Paths are relative to `index.html`, so `creations/star-catcher/index.html`, with no leading slash. |
| A card shows no Open button | That entry has no `path`, or `path: null` | That is the deliberate "not built yet" state. Add the path once the folder exists. |
| Text you typed appears as raw HTML tags in a card | You put markup in a string that is set with `textContent` | That is on purpose: `textContent` treats text as words, never as code. To add real markup, create a real element with `createElement`. |
| A badge is grey instead of coloured | The category has no matching `badge-…` class in `style.css` | The classes are `badge-game`, `badge-simulation` and `badge-art`. A new category needs a new rule; nothing crashes without one. |

## Star Catcher

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| The canvas is blank and nothing responds | The script stopped before the loop started | Console, first red line. Check that `game.js` is loaded with `defer` and that every id it looks for exists. |
| The page scrolls when you press an arrow key | `preventDefault()` was removed from the keydown handler | Arrow keys scroll a page by default. The game must say it is handling them. |
| The basket moves in jerks, one step per press | Movement was moved into the keydown handler | keydown only records the key in `keysDown`; `update()` does the moving. Held-key repeat rate is a setting on somebody else's computer, not a speed you control. |
| The game runs at a different speed on another machine | Something is moving by a fixed amount per frame | Every movement must be multiplied by `dt`. Search the file for a `+=` with no `dt` on the same line. |
| Coming back to the tab, every star has vanished | The delta cap was removed | `loop()` must clamp `dt` to `CONFIG.maxDelta`. Without it, a minute in a hidden tab is one enormous step and everything falls off the bottom at once. |
| The basket slides off the edge of the play area | The clamp in `moveBasket()` is wrong or gone | It must be held between `0` and `W - CONFIG.basketWidth` — the basket's position is its left edge, so the right-hand limit has to subtract its width. |
| Stars fall through the basket at high speed | A star crossed the whole basket in one frame | Real cause, real fix: this is "tunnelling". Either slow the stars, make the basket taller, or check the star's path between frames instead of only its position. |
| The score climbs by two per star | The star is caught but never removed | `splice()` must run in the same branch that adds the point, and the loop must count **down** so removing an item does not skip the next one. |
| Nothing is announced when the round ends | The status paragraph was changed or emptied | `#status` has `aria-live="polite"`. Text painted on a canvas does not exist for a screen reader, which is exactly why every message is also sent there. |

## Bounce Lab

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Balls sink into the floor and vibrate | A wall bounce reverses the speed without putting the ball back inside | `bounceOffWalls()` must set the position first, then reverse. Otherwise the ball is still outside next frame and gets flipped again forever. |
| Balls stick together in a clump | Overlapping balls are never pushed apart | `separate()` must run before the velocity exchange, and `exchangeVelocities()` must ignore pairs already moving apart (`if (relative > 0) return;`). |
| The average speed climbs on its own | The model is inventing energy | With bounce at `1.00` and gravity at `0` it should wander around one value, not trend upwards. Some wobble is honest — swapping speeds between two balls changes their average even when the energy is unchanged — but a number that keeps climbing means energy is being created. Look at the order of operations in `step()` and at any change you made to the collision maths. |
| A slider does nothing | The value is being read as text | A range input's `value` is a **string**. `"900" + 1` is `"9001"`. Every read goes through `Number()`. |
| Dragging the ball slider re-drops every ball | The array is being rebuilt instead of adjusted | `matchBallCount()` adds or removes only the difference, so balls already in flight are left alone. |
| Space scrolls the page instead of pausing | The keydown handler is missing its `preventDefault()` | It must also ignore Space while a button or slider has focus — otherwise the keyboard behaviour those controls get for free is broken. |
| Balls escape through the walls when gravity is high | One step moved a ball further than its own radius | Same tunnelling problem as above. Lower the gravity, lower `maxDelta`, or take several smaller steps per frame. |
| The balls never settle, and the bounce counter runs forever | `settleOnFloor()` was removed | Below `restThreshold` a ball on the floor is stopped on purpose, because the arithmetic gives ever-smaller hops that never reach zero. |

## When you are truly stuck

1. Undo (Ctrl+Z) back to the last version that worked, then change one thing at
   a time.
2. Hard-refresh — Ctrl+Shift+R, or Cmd+Shift+R on a Mac. A cached old file looks
   exactly like a change that did nothing.
3. Compare against `reference/index.html`, which is known to work.
4. Say the problem out loud in one sentence, including what you already ruled
   out. That step alone solves it more often than it has any right to.
