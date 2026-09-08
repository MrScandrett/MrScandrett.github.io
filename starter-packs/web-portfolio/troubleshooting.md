# Web Portfolio troubleshooting

Open the browser developer tools before guessing: **F12**, or Ctrl+Shift+I
(Cmd+Option+I on a Mac), then the **Console** tab. Read the FIRST red line. It
names the file and the line number, which is usually the whole answer.

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| The grid is empty and the filter buttons do nothing | JavaScript stopped on an error before it drew anything | Console tab, first red line. A missing comma between two objects in the `projects` array is the most common cause by a wide margin. |
| One project never appears under any filter except All | Its `category` does not match any button's `data-category` | Compare them letter by letter. `"Game"` is not `"game"`, and a trailing space in `"art "` is invisible but real. |
| A filter button shows an empty area with no explanation | The empty state was removed from `renderProjects` | `renderProjects` must check `if (list.length === 0)` and add the `.empty-state` message before returning. An empty screen reads as a bug; a sentence reads as an answer. |
| Two filter buttons look highlighted at once | `aria-pressed` is being set but not unset | `setPressedButton` must loop over **every** button and set true or false on each one, not only set true on the clicked one. |
| `Uncaught TypeError: Cannot read properties of null` | An id in the HTML does not match the selector in the JavaScript | The HTML has `id="project-grid"` and `id="filter-status"`; `script.js` looks for `#project-grid` and `#filter-status`. They must match exactly, hyphens included. |
| Cards pile up instead of being replaced when filtering | The grid is never cleared | `renderProjects` must begin with `grid.replaceChildren();`. |
| The case-study page has no styling | The `../` is missing or wrong | `pages/case-study.html` needs `href="../style.css"`. Any file inside `pages/` must climb one folder up to reach anything outside it. |
| A card image shows the broken-image icon | Wrong path, or the filename's capitals do not match | Paths from `index.html` start `images/`. `Images/Shot.PNG` may work on your computer and fail once published — always use lower case and match exactly. |
| Clicking a card link gives "file not found" | The link points at a page that does not exist | Read the address bar. From `index.html` it is `pages/case-study.html`; from inside `pages/` it is `../index.html`. |
| The page scrolls sideways on a phone | Something is wider than the screen | Narrow the window to 375px and look for the offender: a long unbroken title, a fixed pixel width, or an image with no `max-width`. The grid itself uses `minmax(260px, 1fr)`, which reflows on its own. |
| The hero heading is enormous on a phone | The `clamp()` on `h1` was replaced with a fixed size | `clamp()` gives a minimum, a size that scales with the window, and a maximum. A plain `font-size: 2.6rem` cannot shrink. |
| Tab does not show an outline anywhere | The focus style was deleted | The `:focus-visible` rule at the bottom of `style.css` must still be there. Never replace it with `outline: none`. |
| The "See the work" link does nothing | The `href="#work"` has no matching id | The section must still be `<section id="work">`. An in-page link matches the id exactly, with no `#` in the id itself. |
| Text you typed appears as raw HTML tags in a card | You put markup in a string that is set with `textContent` | That is on purpose: `textContent` treats text as words, never as code. To add real markup, create a real element with `createElement`. |

## When you are truly stuck

1. Undo (Ctrl+Z) back to the last version that worked, then change one thing at
   a time.
2. Compare against `reference/index.html`, which is known to work.
3. Say the problem out loud in one sentence, including what you already ruled
   out. That step alone solves it more often than it has any right to.
