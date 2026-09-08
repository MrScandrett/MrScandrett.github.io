# Web Foundations troubleshooting

Work down the table. Nearly every problem in this pack is one of these ten.

Open the browser developer tools first: **F12**, or Ctrl+Shift+I (Cmd+Option+I on
a Mac), then the **Console** tab. Read the FIRST red line, not the last one. It
usually names the file and the line number.

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| The page has no colours at all — plain black text on white | The stylesheet is not being found | In `index.html` the link must be `href="style.css"`; in `pages/about.html` it must be `href="../style.css"`. In the Console, a red `style.css net::ERR_FILE_NOT_FOUND` confirms it. |
| The About page is unstyled but the home page is fine | Missing `../` on the deeper page | `pages/about.html` sits one folder down. Everything it points at outside that folder needs `../` first. |
| The project list is completely empty | JavaScript stopped on an error before it drew anything | Console tab, first red line. A comma missing between two objects in the `projects` array is the usual cause. |
| `Uncaught TypeError: Cannot read properties of null` | An id in the HTML does not match the id in the JavaScript | The HTML says `id="project-list"`; `script.js` says `querySelector("#project-list")`. Both must match exactly, including the hyphen. `#projectList` will not find `id="project-list"`. |
| Everything works when the page loads, but typing does nothing | The listener was never attached, or `init()` was deleted | Check that `init();` is still the last line of `script.js`, and that `init()` contains `searchBox.addEventListener("input", handleSearch);`. |
| The list gets longer and longer as you type instead of filtering | The old cards are never cleared | `renderProjects` must start with `projectList.replaceChildren();` before adding anything. |
| The page went blank, or the rest of the page turned into visible text | An unclosed tag or an unclosed quote in the HTML | Look at where the visible text starts going wrong — the mistake is just above it. Every `<h1>` needs `</h1>`; every `href="` needs a closing `"`. VS Code colours a broken tag differently. |
| The logo shows a broken-image icon or the alt text | Wrong path or wrong capitals in the filename | The file is `images/logo.svg`, all lower case. `Images/Logo.svg` works on some computers and fails on others — including on the web. Always match the case exactly. |
| Clicking Home from the About page gives "file not found" | The link is missing `../` | From `pages/about.html`, home is `../index.html`. Look at the address bar: if it ends `pages/index.html`, that is the mistake. |
| You saved, but the browser still shows the old version | The browser is showing a cached copy, or you edited a different copy of the file | Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on a Mac). Still old? Check the address bar path matches the folder you are editing — it is easy to have two copies, for example one in Downloads and one on the Desktop. |
| The search finds nothing no matter what you type | The words you are searching for are not in the searchable text | `matchesSearch` looks in the title, summary, and tags only. The year is a number and is not included. |
| Everything looks fine, but Tab does not show an outline | The focus style was removed | `style.css` must still contain the `:focus-visible` rule near the bottom. Do not delete it; people who cannot use a mouse need it. |

## When you are truly stuck

1. Undo (Ctrl+Z) back to the last version that worked, and change one thing at a
   time from there.
2. Compare against `reference/index.html`, which is known to work.
3. Write down what you expected, what happened, and what you have already ruled
   out. Doing that in writing solves the problem surprisingly often.
