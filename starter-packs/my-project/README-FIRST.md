# Project Development Starter Pack

Three files, already connected, so you can start building instead of debugging
file paths. Use this pack for **any** web project: a personal page, a project
log, a quiz, a tool, a game page.

No internet connection, account, or install is required to run it.

## What you are getting

```
my-project/
  index.html          the page: headings, a list, and a test button
  style.css           colours, spacing, and layout (linked from index.html)
  script.js           behaviour: makes the test button work
  finished-example/   the same starter turned into a real project log
  challenges.md       things to try, easy to hard
  troubleshooting.md  what to check when something breaks
  credits.txt         who made this and what you may do with it
```

## Your first 5-minute success

1. **Unzip first.** Right-click the ZIP → *Extract All* (Windows) or double-click
   it (Mac). Files inside an un-extracted ZIP cannot see each other.
2. Open VS Code → `File > Open Folder` → choose `my-project`.
   Open the **folder**, not one file.
3. Double-click `index.html` in your file explorer to open it in a browser.
4. Click **Test my JavaScript**. The message should turn green.
   - Green message → `script.js` is connected.
   - Blue button with rounded corners → `style.css` is connected.
5. In `index.html`, change the `<h1>` text, save (`Ctrl+S` / `Cmd+S`), and refresh
   the browser. You just completed the edit → save → refresh loop.

## How the three files connect

| File | Connected by | If the connection breaks you will see |
|---|---|---|
| `style.css` | `<link rel="stylesheet" href="style.css">` in the head | plain black text, a grey square button |
| `script.js` | `<script src="script.js" defer></script>` before `</body>` | the button does nothing |

Both paths are **relative**: they start from the folder `index.html` is in. If you
move a file into a subfolder, update the path (for example `css/style.css`).

## Checkpoints

1. **HTML:** Add a third `<li>` to the list. Save and refresh.
2. **CSS:** Change `--accent` in `style.css`. The site name and button both change,
   because they both use the variable.
3. **JavaScript:** Change the message inside `script.js`. Then open the console
   (`F12` → *Console*) and find the `script.js loaded` line.
4. **Your project:** Replace every placeholder sentence with your own words and put
   your name in the footer.

Compare with `finished-example/index.html` only after you have tried the checkpoints.

## Publish it

When it is ready to share, follow the **GitHub Pages Publishing Guide** on the class
downloads page. `index.html` is already named the way GitHub Pages expects.

## Make it a real project

A project becomes real when other people can visit it and you keep it working. The publishing lesson takes this folder onto the internet with GitHub Pages, gives you a pre-flight checklist, and shows you how to keep a changelog, fix broken links, and look after the site once it is live.

**Lesson:** [Publish and maintain a live site](https://mrscandrett.github.io/lessons/web-design/web-publish.html)
