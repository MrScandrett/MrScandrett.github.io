# Creation Hub Starter: The Workshop

## What you are getting

A catalog page that gives your games, simulations and artworks a home, plus two
finished creations to put in it. Everything runs from your own computer with no
internet, no account, and nothing to install.

The two creations are real, not screenshots:

- **Star Catcher** — a keyboard game on a canvas. Sixty seconds, a basket you
  steer, stars to catch and stars to miss.
- **Bounce Lab** — a physics simulation with three sliders you can move while it
  is running, and measurements that tell you what changed.

Both were written for this pack and are yours to take apart.

Files:

- `index.html` — the hub: header, filter row, an empty catalog list, and the empty state.
- `style.css` — the hub's look, and the colour variables the two creations reuse.
- `script.js` — the `CREATIONS` data and the code that builds the cards and the filters.
- `creations/star-catcher/` — the game: `index.html`, `style.css`, `game.js`.
- `creations/bounce-lab/` — the simulation: `index.html`, `style.css`, `sim.js`.
- `reference/index.html` — a finished version of challenge 4, to compare against **after** you try it.
- `challenges.md` — eight extensions, easy to hard.
- `troubleshooting.md` — what to check when something breaks.
- `credits.txt` — who made this and what you must add if you add media.

## Before you start

1. Install [VS Code](https://code.visualstudio.com/) if it is not already on the machine.
2. In VS Code choose **File → Open Folder**, and pick the `web-creation-hub`
   folder itself — the folder, not one file inside it. If you open only
   `index.html`, VS Code cannot see `style.css`, `script.js` or the creations,
   and you will spend twenty minutes confused.
3. Optional: install the **Live Preview** extension from Microsoft. It refreshes
   the page every time you save. You do not need it; this pack works by
   double-clicking `index.html`.

## Open and run it

1. Double-click `index.html`. Your browser opens the hub.
2. You should see three cards — Star Catcher, Bounce Lab, and an empty art slot
   with no Open button — above a row of filter buttons reading **All**,
   **Art**, **Game**, **Simulation**.
3. Click **Game**. One card remains and the line above the catalog reads
   `Showing 1 game.`
4. Click **Art**. One card remains, and it has no Open button — because that
   creation does not exist yet, and a button that opens nothing is worse than no
   button.
5. Click **All**, then **Open** on Star Catcher. Press an arrow key. Play a
   round. Use the browser's Back button to return to the hub.
6. Open Bounce Lab. Drag the **Gravity** slider to `0` while the balls are
   moving. They stop falling immediately and drift in straight lines.
7. Press <kbd>Tab</kbd> repeatedly on each page. Every button, slider and link
   you land on should show a bright outline. If something is invisible when
   focused, that is a bug worth fixing.

If step 2 shows plain unstyled text, the browser did not find `style.css`. If it
shows the headings but no cards at all, `script.js` stopped on an error. Either
way, go to `troubleshooting.md`.

## Read before you change

**The hub's HTML contains no creations.** Look at it: `<ul id="creation-list">`
is empty, and so is `<div id="filter-buttons">`. Every card and every button is
built by `script.js` from the `CREATIONS` array. That is deliberate. A creation
described in two places gets updated in one of them eventually, and then your
own catalog is lying about your own work.

**The filter buttons are built from the data, not typed out.** Add a creation
with `category: "music"` and a **Music** button appears by itself. Nothing else
has to be told. This is worth noticing, because the obvious version — buttons in
the HTML, categories in the JavaScript — has two lists that can disagree, and
when they do, the symptom is a creation that silently never appears.

**Each creation is a complete website in its own folder.** `star-catcher/`
has its own HTML, its own CSS and its own JavaScript, and it works when you
double-click it directly. That rule matters: a creation that only runs from the
hub is not finished, and you will find out at the worst possible moment.

**Both creations separate deciding from drawing.** In `game.js` and `sim.js`,
`update()`/`step()` change what is true, and `draw()` paints what is true and
changes nothing. Almost every confusing bug in an animated program comes from
mixing those two jobs together. Read either file top to bottom once before
editing anything — they are written in the order things happen.

## Your guided changes

Do these in order. Each is small, and each has something you can look at to know
it worked.

### 1. Put yourself on the hub

**Do:** In `index.html`, change the `<h1>`, the lede paragraph and the footer so
they describe your workshop in your own words. In `script.js`, replace the third
entry (`your-art-piece`) with something you have actually built, or delete the
whole object if you have nothing yet.

**Check:** Reload. No sample text is left anywhere on the page. If you deleted
the third entry, the **Art** button is gone too — because the buttons come from
the data, and there is no longer any art in it.

**If it breaks:** A blank catalog with no error usually means a missing comma
between two objects in the array, or a stray `}`. Open the console (F12 →
Console) and read the first red line; it names the line number.

### 2. Change the game's feel with one number

**Do:** Open `creations/star-catcher/game.js` and find the `CONFIG` block at the
top. Change `spawnEvery` from `0.7` to `0.35`, reload, and play a round. Then put
it back and change `basketSpeed` instead.

**Check:** Twice as many stars fall, and the game is noticeably harder. You did
not have to read the logic to do it — that is the whole reason `CONFIG` exists.

**If it breaks:** If nothing changes, you are probably editing a file the browser
has cached. Hard-refresh with Ctrl+Shift+R (Cmd+Shift+R on a Mac).

### 3. Add a "controls" line that is actually useful

**Do:** In `script.js`, add a fourth entry to Bounce Lab's `controls` array
describing what the **Bounce** slider does — in a sentence a visitor who has
never seen the simulation could follow.

**Check:** Reload the hub. Your line appears on the card. Then give the page to
somebody who has not seen it, say nothing, and watch whether they can work out
what to do. That is the only real test of a controls list.

**If it breaks:** `Cannot read properties of undefined` here almost always means
you wrote `{ label: "…" }` without a `detail`, or the other way round. Both keys
are required, because `createControlsBlock()` reads both.

### 4. Add a search box

**Do:** Add a labelled `<input type="search">` to `index.html` above the catalog.
In `script.js`, keep the typed text somewhere and make the catalog show only
creations whose title or blurb contains it — **while still respecting the
category button that is pressed**. Both controls have to agree.

**Check:** Type `star`, then click **Simulation**. You should get an honest empty
state, not a leftover card. Clear the search box and Star Catcher comes back.

**If it breaks:** If the search works but the buttons stop working (or the other
way round), your two controls are each hiding and showing cards on their own.
The fix is to store both parts of the request in one place and rebuild the whole
catalog from the data whenever either changes. `reference/index.html` is a
finished version of exactly this — try yours first.

## What this pack cannot do

**It is not published.** Everything here runs from a file on your own machine.
Nobody else can see it, and a `file:///…` address you paste into a chat will not
open on anybody else's computer. Publishing it means putting the folder somewhere
with a public address — that is what the **Publish** lesson covers.

**It cannot save anything.** Reload Star Catcher and your score is gone. There is
no high-score table, because a high-score table shared between people needs a
server to keep it in. Saving in the browser only (`localStorage`) is possible and
is challenge 7 — but understand what it is: one score, on one machine, in one
browser, that vanishes when the browser data is cleared.

**It has no accounts, no comments and no likes.** All three need a server, a
database, and a plan for what happens when somebody posts something cruel. That
plan is not a programming problem, and it is the hard part.

**The two creations are deliberately simple.** Star Catcher has one shape of
enemy and no sound. Bounce Lab has no friction, no spin, and every ball has the
same mass. Both pages say so themselves. A model that does not tell you where it
stops being true is a model you cannot use safely.

## Where to go next

- Work through `challenges.md` in order. They get harder deliberately.
- Duplicate `creations/star-catcher/`, rename the folder, and change it into
  something else. Copying a working thing and changing it one piece at a time is
  how most real programs get started.
- Compare your challenge 4 against `reference/index.html` — but only after you
  have made your own attempt. Reading the answer first feels like learning and
  is not.
- Then read the **Publish** lesson and put the hub on the actual internet, so
  the controls you wrote can finally be read by somebody who is not you.
