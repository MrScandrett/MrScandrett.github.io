# WebXR Gallery troubleshooting

Open the browser developer tools before guessing: **F12**, or Ctrl+Shift+I
(Cmd+Option+I on a Mac), then the **Console** tab. Read the FIRST red line. It
names the file and the line number, which is usually the whole answer.

## The page

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Headings appear but the plan is blank and the list is empty | JavaScript stopped on an error before it drew anything | Console tab, first red line. A missing comma between two objects in `EXHIBITS` is the most common cause by a wide margin. |
| The whole page is unstyled text | The browser did not find `style.css` | `index.html` needs `href="style.css"` and the file must sit beside it. |
| `Uncaught TypeError: Cannot read properties of null` | An id in the HTML does not match the selector in the JavaScript | The HTML has `id="plan"`, `id="exhibit-list"`, `id="legend"`, `id="plan-status"` and `id="walk-order"`. Compare them character by character, hyphens included. |
| An exhibit is in the list but not on the plan | Its `wall` is spelled differently from the four expected values | `"North"` is not `"north"`. An unrecognised wall falls through to the west wall in `positionOf()`, so look there before assuming it vanished. |
| Two exhibits sit on top of each other in the plan | They are on the same wall with nearly the same `along` | Change one. The plan draws exactly what the data says; overlapping panels mean overlapping data. |
| The numbers in the list do not match the numbers in the plan | Two different orders are in use | Both must come from `exhibitsInWalkOrder()`. Indexing into `EXHIBITS` directly gives the order the entries were typed in, which is not the order a visitor walks. |
| Clicking the plan selects the wrong exhibit | The click was not converted into canvas coordinates | The canvas draws at 720 wide but is displayed at whatever width fits. `handlePlanClick()` scales by `W / box.width`. Without it, every click is wrong by the ratio between the two, and the error grows with distance from the top-left corner. |
| Clicking the empty middle of the room selects something | The distance limit was removed | The hit test only counts as a hit within 48 pixels of a panel. Without a limit, "closest" always finds something. |
| Selecting an exhibit highlights it but announces nothing | `#plan-status` was renamed, emptied, or lost its `aria-live` | Nothing drawn on a canvas exists for a screen reader. If the status line stops working, the highlight is invisible to anyone not looking at the screen. |
| Two exhibits look selected at once | `aria-pressed` or `aria-current` is set but never unset | `select()` must loop over **every** button and set true or false on each, not only set true on the chosen one. |
| The numbers beside the exhibits are wrong after reordering | Numbers were typed into the HTML | They come from a CSS counter on `.exhibit`, which cannot be wrong. If you replaced it with typed numbers, they will go stale the first time anything moves. |
| The colours in the plan do not match the list | The colours were typed into `script.js` as well as the CSS | `exhibitColors()` reads them out of the stylesheet, so there is only one list. Two lists is two lists that can disagree. |
| A fifth exhibit is drawn without a colour | More exhibits than colour variables | `colorFor()` wraps round with `%`, so this should not happen. If you replaced it with `COLORS[index]`, a fifth exhibit gets `undefined` and an invisible panel. |
| The plan is blurry on a good screen | The canvas is being stretched by CSS | It draws at 720×440 and is displayed at up to 720 wide. Look up `devicePixelRatio` if you want it sharp on a high-density screen — that is a real improvement, not a bug fix. |
| The page scrolls sideways on a phone | Something is wider than the screen | Narrow the window to 375px and look for the offender. The canvas has `max-width: 100%`; a long unbroken word in a summary is the usual culprit. |

## When you add WebXR

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| `navigator.xr` is `undefined` | This browser has no WebXR | Feature-detect with `"xr" in navigator` before touching it. Most desktop browsers do not have it, and that is a normal state your page must handle, not an error. |
| `navigator.xr` is undefined even in a headset browser | The page is not a secure context | WebXR needs HTTPS or `localhost`. A `file://` page does not qualify, and neither does `http://192.168.…` — a LAN address over plain HTTP is not secure. Publish over HTTPS and try again. |
| "Enter VR" does nothing and logs a security error | The session was requested without a user gesture | `requestSession` must run inside a click handler. A page cannot enter a session on load, by design. |
| `isSessionSupported` says yes, but the session opens to blackness | There is a session but nothing is drawing | WebXR gives you eye views and a headset pose; it draws nothing itself. That is the renderer's job. |
| The 3D room shows an exhibit the text list does not | The scene has its own copy of the content | This is the failure the whole pack is arranged to prevent. Both views must be built from `EXHIBITS`, and neither may hold content of its own. |
| A visitor says the room makes them feel ill | The viewpoint is being moved for them | Honour `prefers-reduced-motion`, prefer teleporting to gliding, and never tilt or move the horizon. This is the most common complaint in VR, and it is a design decision, not a bug. |

## When you are truly stuck

1. Undo (Ctrl+Z) back to the last version that worked, then change one thing at
   a time.
2. Hard-refresh — Ctrl+Shift+R, or Cmd+Shift+R on a Mac. A cached old file looks
   exactly like a change that did nothing.
3. Delete the `<canvas>` from the HTML temporarily. If the page is still a
   complete gallery, the problem is only in the plan and you have halved the
   search. If it is not, you have found a bigger problem than the one you were
   chasing.
4. Say the problem out loud in one sentence, including what you already ruled
   out. That step alone solves it more often than it has any right to.
