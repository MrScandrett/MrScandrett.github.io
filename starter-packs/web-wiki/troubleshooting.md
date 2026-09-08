# Signal Notes troubleshooting

Work down this list. Nearly every problem in this pack is one of these.

First move, always: press <kbd>F12</kbd>, click **Console**, and read the *first*
red error. Later errors are usually just wreckage from the first one.

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Page is unstyled text on white | `style.css` was not found | Is it in the same folder as `index.html`? Is it spelled exactly `style.css`? Windows hides known extensions, so a file that looks right may really be `style.css.txt`. In VS Code the filename in the tab is the truth. |
| No article cards at all, page otherwise fine | `script.js` did not load or crashed immediately | The console says either `Failed to load resource` (wrong name or folder) or names a syntax error with a line number. Check the `<script src="script.js" defer>` tag at the bottom of `index.html`. |
| Blank page right after editing `ARTICLES` | Missing comma between two article objects, or an unclosed `{`, `[`, or quote | The console names a line — look at that line *and the one above it*, because a missing comma is reported on the line after the mistake. Click a bracket in VS Code and its partner lights up. |
| Blank page after editing article text | An apostrophe or quotation mark ended a string early | A `"` inside a double-quoted string closes it. Either use a different quote character around the string, or escape it as `\"`. The console will point at that line. |
| `Cannot read properties of null` in the console | `querySelector` found nothing, so a variable is `null` | An id in `script.js` does not match the id in `index.html`. `#article-view` and `id="articleView"` are different strings, and capitals count. Compare them character by character. |
| Everything broke after moving `<script>` into `<head>` | The script ran before the elements existed | Put the tag back at the end of `<body>`, or keep the `defer` attribute. `defer` means "run after the HTML is parsed"; without it every `querySelector` at the top of `script.js` returns `null`. |
| Clicking an article does nothing | The link's `href` is wrong, or `hashchange` is not being listened for | Article links must be `href="#/article/<slug>"`. If you replaced a link with a `<button>`, the address no longer changes, so `route()` is never told to run — and Back will now leave the site. |
| Article opens as "No article called…" | The slug in the address does not match any `slug` in `ARTICLES` | Slugs are case-sensitive and must not contain spaces. `#/article/How-Computers-Count` will not find `how-computers-count`. Check for a trailing space in the slug string. |
| A Related link leads nowhere / the entry is missing | The `slug` in a `related` entry has a typo | `renderArticle()` deliberately skips relations it cannot find instead of crashing, so a typo is silent. The only way to catch it is to click every related link once. |
| Back button leaves the site instead of returning to the index | Navigation was changed to something that does not update the address | Only real `<a href="#/…">` links (or assignments to `window.location.hash`) create history entries. Swapping content with a click handler does not. |
| A direct link to an article shows the index | `route()` is not being called on load | The last line of `init()` must call `route()`. Without it the page only reacts to *changes* in the address, never to the address it started with. |
| Search finds nothing however you spell it | Case handling, or searching the wrong text | Both sides must be lower-cased: the article text *and* the search term. If only one side is, `Binary` will never match `binary`. Also check that your new article's text is actually inside `body`, `title`, `summary` or `keywords` — nothing else is searched. |
| Search finds everything, always | An empty search term is being matched | `"".includes` is true for every string, which is why the code returns all articles early when the term is empty. If you removed that early return, every search now matches everything. |
| "No results" message shows while results are visible | The `hidden` logic is inverted or `renderIndex()` was not called | The line is `noResults.hidden = matches.length > 0;` — hidden when there ARE matches. Every path that changes the search must end by calling `renderIndex()`. |
| Edits do not appear no matter what | Browser cache, or two copies of the folder | Hard-refresh with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> on a Mac), then compare the path in the browser's address bar with the folder open in VS Code. Downloads folders love keeping a second copy. |
| The focus outline disappeared after restyling | A CSS rule sets `outline: none` | Find it and delete it. The `:focus-visible` rule in `style.css` is what lets a keyboard user see where they are; without it the wiki is unusable for some readers. |
