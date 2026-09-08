# Web Foundations Starter Pack

The companion pack for the first five lessons of the **Build Your Own Web** pathway.
If you would rather not type a whole site from scratch before you can see it work,
start here instead: this is a small personal site that already runs, and you change
it into yours.

No internet connection, account, install, or build step is required. It is plain
HTML, CSS, and JavaScript, and it runs by opening a file.

## What you are getting

```
web-foundations/
  index.html          the home page: a project list and a working search box
  pages/about.html    a second page, so folder paths are real
  style.css           every colour, size, and layout rule for BOTH pages
  script.js           the search and filter from Lesson 4, commented line by line
  images/logo.svg     one small original logo, drawn for this pack
  reference/          a finished version of one challenge, to compare against
  challenges.md       eight extensions, easy to hard
  troubleshooting.md  what to check when something breaks
  credits.txt         who made this and what you may do with it
```

The search box is the piece worth studying. Nothing about it reloads the page: it
reads a list held in JavaScript, decides which items match what you typed, and
rebuilds the list on screen.

## Before you start

1. Install **VS Code** if it is not already on the computer. It is free.
2. Open the **folder**, not one file: `File > Open Folder`, then choose
   `web-foundations`. If you open only `index.html`, VS Code cannot see
   `style.css` or `script.js`, and none of the file paths will make sense.
3. Optional but pleasant: install the **Live Preview** extension (by Microsoft).
   It refreshes the page for you every time you save. Everything in this pack
   works without it.

## Open and run it

1. In VS Code's file list on the left, click `index.html`.
2. Find `index.html` in your file manager (Finder, File Explorer) and
   double-click it. It opens in your browser.
3. Check that you see the logo, the heading, and three project cards.
4. Click in the **Search projects** box and type `game`. You should be left with
   one card, and the grey line above the list should change to
   "Showing 1 of 3 projects."
5. Delete what you typed. All three cards come back.
6. Press the **Tab** key several times. A thick outline should move from link to
   link. That outline is how someone using only a keyboard knows where they are.
   Never remove it.
7. Click **About** in the top corner. You are now on the second page.
8. Press the browser's Back button to return. (Getting back without the Back
   button is guided change 4.)

You have run the site. Now you own it.

## Read before you change

**`index.html` is the content and the structure.** It says what exists: a header
with a logo and a navigation list, one `<main>` holding the intro and the projects
section, a footer. Notice that the projects list `<ul id="project-list">` is
*empty* in the HTML. The projects are not written there. The id is the handle
JavaScript uses to find that list and fill it.

**`style.css` is every visual decision, for both pages.** At the very top is a
block called `:root` holding custom properties: `--accent`, `--bg`, `--text`, and
a few more. Those are named colours. Further down, rules like
`border-top: 4px solid var(--accent)` ask for the named colour rather than
repeating the code for it. That is why changing one line near the top restyles the
whole site. Near the bottom is a `:focus-visible` rule; leave it there.

**`script.js` is the behaviour, and it reads top to bottom on purpose.** First the
data: an array called `projects`, three objects, each with a title, year, summary,
and tags. Then the three page elements the script needs. Then small functions with
one job each — `matchesSearch` decides yes or no for one project,
`createProjectCard` builds one card, `renderProjects` empties the list and refills
it, `announceCount` updates the sentence above it, `handleSearch` calls the others
in order. At the very bottom, `init()` draws the first list and starts listening
for typing. `init()` is the only line that runs by itself.

## Your guided changes

Do these in order. Each one is small, and each one has something you can see.

### 1. Make it your site: the title and the heading

**Do:** Open `index.html`. Near the top, inside `<title>`, replace
`My Project Site — Web Foundations Starter` with your own site name. Then further
down find `<h1>My Project Site</h1>` and put the same name between those tags.
Save. Refresh the browser.

**Check:** The browser tab now shows your name, and so does the big heading on the
page. They are two different places on purpose: the tab title is what a bookmark
and a search result show, the `<h1>` is what a reader sees.

**If it breaks:** If the whole page suddenly looks like plain text, you probably
deleted an angle bracket. The heading must still be `<h1>` at the start and `</h1>`
at the end. If the tab title did not change, you edited the `<h1>` twice — the
`<title>` is up in the `<head>`, above the `<body>`.

### 2. Add a fourth project

**Do:** Open `script.js`. Find the `projects` array at the top. After the closing
`}` of the last project — and after adding a comma to that closing brace — add:

```js
  {
    title: "Your Project Name",
    year: 2026,
    summary: "One sentence about what it does.",
    tags: ["art", "your-tag"]
  }
```

Save and refresh.

**Check:** Four cards. The grey line reads "Showing all 4 projects." Type one of
your new tags into the search box and confirm only your project stays.

**If it breaks:** A blank project list nearly always means a missing comma between
two objects, or a missing comma after the closing `}` of the one before yours.
Open the browser's developer tools (F12 or Ctrl+Shift+I, then the **Console** tab)
and read the first red message; it names the line. Also check every quote is
straight (`"`) not curly (`"`), which happens if you paste from a word processor.

### 3. Change the accent colour in one place

**Do:** Open `style.css`. In the `:root` block at the very top, change
`--accent: #0f6f8c;` to another colour — try `#7a3fa0`, or any hex code you like.
Save and refresh.

**Check:** The eyebrow text, the links, the top edge of every card, the tag pills,
and the focus outline all changed together, because they all ask for
`var(--accent)`. You edited one line and restyled six things.

**If it breaks:** If nothing changed, check that the line still ends with a
semicolon and that the `#` is still there. If text became hard to read against the
background, pick a darker colour — dark text on a light background needs real
contrast, and "it looks fine to me" is not the test. Anything you would struggle
to read in sunlight is too light.

### 4. Give `about.html` a way home

**Do:** Open `pages/about.html`. In the `<nav>`, find the comment that says
GUIDED CHANGE 4. Above the existing `<li>`, add:

```html
        <li><a href="../index.html">Home</a></li>
```

Save. Open `pages/about.html` in the browser and click **Home**.

**Check:** You land back on the home page with the project list. Then click
**About** and come back again. Both directions work, from either page.

**If it breaks:** If clicking Home gives you a "file not found" page, look at the
address bar. `href="index.html"` would look for `pages/index.html`, which does not
exist — you must climb out of the folder first with `../`. If the About page
itself lost all its colours, the `../` in the stylesheet link at the top was
changed or removed.

## What this pack cannot do

This site is only files on your computer opened by a browser. That is genuinely
how the front of every website works, but there are real limits, and it is worth
knowing them now rather than being surprised later.

- **It cannot save anything.** Type in the search box, refresh, and it is gone.
  There is no database, and nothing you do here is stored anywhere.
- **It cannot send email or a message to anyone.** A page on its own has no way to
  send mail. That takes a server or a paid service. (The Web Business pack in this
  series is about exactly that problem.)
- **Nobody else can see it yet.** Opening a file shows it to you only. Putting it
  on the internet is a separate step called deploying — GitHub Pages is the usual
  free route.
- **The search is deliberately simple.** It matches letters inside words. It does
  not understand spelling mistakes, plurals, or meaning.
- **It is one person's list.** Two people cannot both add projects to it. Shared
  data needs a server.

## Where to go next

- Work through `challenges.md` from the top. Do one, run it, then do the next.
- When you have tried challenge 4, compare with `reference/index.html`. Different
  is fine; broken is not.
- Read every comment marked WHAT and WHY in `script.js`, then try to explain
  `handleSearch` out loud to somebody without looking at the screen.
- When the site is genuinely yours, publish it with GitHub Pages, then move on to
  the **Web Portfolio** pack, which is about presenting finished work.
