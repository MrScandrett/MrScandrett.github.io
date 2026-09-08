# Web Portfolio Starter Pack

A portfolio site you can put your real work into today: a hero that introduces the
maker, a filterable grid of projects, and a case-study page that shows how one
project changed after feedback.

Everything in it is placeholder text that says so. Your job is to replace all of
it. A portfolio with sample text still in it is worse than no portfolio.

No internet connection, account, install, or build step is required. Plain HTML,
CSS, and JavaScript, opened by double-clicking a file.

## What you are getting

```
web-portfolio/
  index.html             hero, filter buttons, and the work grid
  pages/case-study.html  problem, first attempt, feedback, revision, result
  style.css              every visual rule, for both pages
  script.js              the project data and the category filter
  images/monogram.svg    one small original mark, drawn for this pack
  reference/             a finished version of one challenge, to compare against
  challenges.md          eight extensions, easy to hard
  troubleshooting.md     what to check when something breaks
  credits.txt            who made this and what you may do with it
```

Two things are deliberately missing, and both are your work to add: real
screenshots (the cards show a labelled CSS placeholder, never a fake photo) and a
real name (the header says "Replace with your name" on purpose). This pack does
not invent a person for you to pretend to be.

## Before you start

1. Install **VS Code** if it is not on the computer already. It is free.
2. Open the **folder**, not one file: `File > Open Folder`, then choose
   `web-portfolio`. Opening only `index.html` hides the other files from you and
   makes every path harder to reason about.
3. Optional: the **Live Preview** extension (by Microsoft) reloads the page when
   you save. Nothing here needs it.

## Open and run it

1. Double-click `index.html`. It opens in your browser.
2. Check that you see the mark, the hero heading, four filter buttons, and three
   project cards.
3. Click **Game**. One card remains, the button turns dark, and the grey line
   above reads "Showing 1 game project."
4. Click **All**. All three come back.
5. Press **Tab** repeatedly from the top of the page. Every filter button and
   every link must show a clear outline as you reach it. Press **Enter** on a
   filter button — it must work exactly like a click. That is why they are real
   `<button>` elements and not styled `<div>`s.
6. Click **See the work** in the hero. The page should jump down to the work
   section.
7. Click **Read the case study** on any card, then **Back to the work**. You
   should end up where you started.

## Read before you change

**`index.html` is the frame, not the content.** It holds the hero, the four
filter buttons, and an empty `<ul id="project-grid">`. There is no project text
in it at all. Each filter button carries a `data-category` value — `all`, `game`,
`simulation`, `art` — and an `aria-pressed` attribute that says whether it is the
one currently chosen.

**`script.js` holds the work itself.** At the top is a `projects` array: one
object per project with a title, a category, a two-sentence summary, the tools
used, and one thing learned. Below it are small functions —
`createProjectCard` builds one card, `renderProjects` fills or empties the grid,
`announce` updates the live status line, `setPressedButton` keeps `aria-pressed`
truthful, `applyFilter` calls the others in order. `init()` at the bottom is the
only line that runs by itself. **The `category` on each project must exactly
match a `data-category` on a button**, or that project quietly disappears when
filtered.

**`style.css` styles both pages.** The `:root` block at the top names the colours.
Two rules are worth finding before you change anything: `.filter[aria-pressed="true"]`,
which means the highlight can never disagree with what a screen reader announces,
and the `:focus-visible` rule at the bottom, which draws the outline that keyboard
users navigate by. Keep both.

## Your guided changes

### 1. Replace the three projects with your own

**Do:** Open `script.js` and edit the `projects` array. For each project write a
real title, a summary of exactly two sentences, the tools you actually used, and
one specific thing you learned. Delete any project you do not have work for
rather than leaving the placeholder. Save and refresh.

**Check:** No card anywhere says "Replace this". Read your summaries out loud —
if a sentence needs the picture to make sense, rewrite it.

**If it breaks:** An empty grid nearly always means a missing comma between two
objects, or a quotation mark inside your text that ended the string early. If
your text contains a `"`, either use a different quote or escape it as `\"`. Open
the browser Console (F12) and read the first red line.

### 2. Make your categories agree with the filter buttons

**Do:** Decide your own categories. Change every `category:` in `script.js` to
match, then change the buttons in `index.html` so each `data-category` uses the
same word and the button's visible text matches. Save and refresh.

**Check:** Click every button in turn. Every project appears under exactly one
category, and the count in the grey status line always matches the number of
cards on screen. Now the important test: **click a filter that has no matching
work.** You should see "No work in this category yet. Try another filter." — a
clear empty state, not a blank space. If you have no empty category, temporarily
change one project's category to something nonsense and click that filter to see
the empty state fire, then change it back.

**If it breaks:** A project that vanishes from every filter but appears under
"All" has a category no button uses. Capitals matter: `"Game"` and `"game"` are
different words to a computer. The safest habit is lower case everywhere.

### 3. Add a real image with real alt text

**Do:** Take a screenshot of one of your projects. Save it into the `images`
folder with a simple lower-case name like `orbit-dodge.png`. In `script.js`, find
`createProjectCard` and the `thumb` placeholder it builds. Replace that
placeholder with a real image for that project:

```js
  const thumb = document.createElement("img");
  thumb.className = "thumb";
  thumb.src = "images/orbit-dodge.png";
  thumb.alt = "Describe what the screenshot shows";
```

Delete the `aria-hidden` line while you are there.

**Check:** The screenshot appears in the card. Now the part that matters: write
alt text that describes what is *in* the picture — "A satellite dodging grey
debris on a black background" — not "screenshot" and not the file name. Test it
by renaming the file for a moment: the alt text should still tell somebody what
they are missing. Rename it back.

**If it breaks:** A broken-image icon means the path or the capitals are wrong.
The path is written from `index.html`, so it is `images/your-file.png`, all lower
case exactly as the file is named. If the image is enormous, that is CSS, not
JavaScript: the `.thumb` rule sets the size, and images need
`object-fit: cover` to fill a shape without stretching.

### 4. Make every link work, and test getting home

**Do:** Every card currently links to the same `pages/case-study.html`. Write the
case study for one real project — replace all five sections with your own words —
then make only that project's card link to it. For projects with no case study
yet, remove the link rather than pointing it at an empty page.

**Check:** Click through every single link on both pages, including the mark and
the nav. From the case study, you can get back to the work grid. From the work
grid, you can reach the case study. No link goes to a page that does not exist,
and no page is a dead end. **Also check widths:** make the browser window as
narrow as a phone (about 375 pixels — in developer tools, the small
phone/tablet icon lets you set that exactly). Every project title must still be
readable and unbroken, nothing may spill off the side, and the page must not
scroll sideways.

**If it breaks:** "File not found" is a path problem. From `index.html` the case
study is `pages/case-study.html`; from inside `pages/`, home is `../index.html`.
Look at the address bar — it tells you exactly where the browser tried to go. If
a long title spills off the screen at 375px, shorten the title; that is usually
the honest fix.

## What this pack cannot do

- **It cannot store anything.** No visitor counter, no likes, no contact list.
  Refresh and everything resets, because there is no database and no server.
- **It cannot send a message or an email.** A page by itself has no way to do
  that. The Web Business pack in this series covers exactly what a working
  contact form would need.
- **Nobody can see it until you publish it.** Opening a file shows it to you
  alone. Putting it online is a separate step — GitHub Pages is the usual free
  route, and it is worth doing once the placeholder text is gone.
- **The filter is not a search.** It matches one exact category word per project.
  A project cannot be in two categories without code you have not written yet.
- **The placeholders are placeholders on purpose.** They are pattern blocks and
  text, not stock photos and not a made-up designer's biography. Do not replace
  them with someone else's screenshots, and never publish work as yours that you
  did not make.

## Where to go next

- Work through `challenges.md` in order.
- Try challenge 5, then compare with `reference/index.html`.
- Ask two people to look at the site for thirty seconds each and then tell you
  what you make. If they cannot say, the hero is not doing its job — fix the
  words before you touch the colours.
- Publish it, then keep it alive: a portfolio is only as good as its most recent
  project.
