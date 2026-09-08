# WebXR Gallery Starter: The Long Room

## What you are getting

A gallery of your projects, laid out as a room. It runs from your own computer
with no internet, no account, no headset, and nothing to install.

What is in the box:

- An **exhibit list** — real headings and real text, one entry per project. This
  is the gallery.
- A **room plan** — a top-down drawing showing where each exhibit hangs, built
  from the same list, so the two can never disagree.
- A **walk** — the order a visitor meets the exhibits, written as a sentence the
  page generates for itself.

What is deliberately **not** in the box: any 3D, any WebXR code, and any "Enter
VR" button. This pack is the part that has to be right before that becomes worth
adding. The reason is in "What this pack cannot do", and it is worth reading
before you go looking for a 3D library.

Files:

- `index.html` — the structure: header, plan, exhibit list, the walk.
- `style.css` — how it looks, including the exhibit colours the script reads back out.
- `script.js` — the `EXHIBITS` data, the list, the plan drawing, and the selection.
- `reference/index.html` — a finished version of challenge 5, to compare against **after** you try it.
- `challenges.md` — eight extensions, easy to hard.
- `troubleshooting.md` — what to check when something breaks.
- `credits.txt` — who made this and what you must add if you add media.

## Before you start

1. Install [VS Code](https://code.visualstudio.com/) if it is not already on the machine.
2. In VS Code choose **File → Open Folder**, and pick the `webxr-gallery` folder
   itself — the folder, not one file inside it. If you open only `index.html`,
   VS Code cannot see `style.css` and `script.js`.
3. Optional: install the **Live Preview** extension from Microsoft. It refreshes
   the page every time you save. You do not need it; this pack works by
   double-clicking `index.html`.

## Open and run it

1. Double-click `index.html`. Your browser opens.
2. You should see a room plan with four coloured panels on its walls, numbered
   1 to 4, and a gap marked **door** in the bottom wall.
3. Below it, four exhibits with the matching numbers, colours and summaries.
4. Click **Show on the plan** on exhibit 3. A white ring appears round panel 3,
   and the line under the plan reads
   `Exhibit 3 of 4, Light Experiment, is on the east wall.`
5. Click a panel in the plan itself. The same exhibit is selected — the plan is
   a second way in, never the only way.
6. Press <kbd>Tab</kbd> repeatedly. Every button shows a bright outline. Reach
   exhibit 4's button and press <kbd>Enter</kbd>; it selects exactly as a click
   does.
7. Now the real test: open the page and read only the exhibit list, ignoring the
   plan entirely. Nothing is missing. That is the property the whole pack is
   built to have.

If step 2 shows plain unstyled text, the browser did not find `style.css`. If the
plan is blank but the headings are there, `script.js` stopped on an error. Either
way, go to `troubleshooting.md`.

## Read before you change

**One list, shown two ways.** `EXHIBITS` in `script.js` is the only place an
exhibit is described. The list, the plan, the legend and the walk sentence are
all built from it. Change one `along` value and all four update together,
because there is nothing else to update.

That arrangement is not tidiness. It is the thing that makes an accessible 3D
page possible at all. The usual way these projects fail is that the 3D scene is
built from one list and the text description is typed by hand from another;
somebody adds a fourth exhibit to the scene, forgets the text, and now the page
lies to anybody who cannot see the scene. If neither view holds any content of
its own, that failure cannot happen.

**The plan is a picture; the list is the gallery.** Everything drawn on a canvas
is one image as far as the browser is concerned. It cannot be read by a screen
reader, selected, translated, searched with Ctrl+F, or resized when somebody
zooms text. That is not a flaw to work around — it is what a canvas is. Anything
that matters has to exist as real text too, which is why every selection is also
written into `#plan-status`.

**The walls are described, not drawn by hand.** An exhibit says
`wall: "north", along: 0.25`, and `positionOf()` turns that into a point.
One function does that arithmetic, so the plan, the click test and any 3D
version you build later all place exhibits in the same place by construction.

## Your guided changes

Do these in order. Each is small, and each has something you can check.

### 1. Hang your own work

**Do:** In `script.js`, replace all four entries in `EXHIBITS` with your own
projects — a real `title`, a real `medium`, a real `made`, and a `summary` you
would actually say standing next to the thing. If you only have three, delete
the fourth entry rather than leaving it.

**Check:** Reload. No sample text remains, the plan has one panel per project,
and the walk sentence counts them correctly. Read your summaries out loud; if a
sentence sounds like it was written to fill a box, rewrite it.

**If it breaks:** A blank plan and an empty list usually means a missing comma
between two objects, or a stray `}`. Open the console (F12 → Console) and read
the first red line — it names the line number.

### 2. Rearrange the room

**Do:** Move an exhibit to a different `wall`, and change another one's `along`
from `0.25` to `0.8`.

**Check:** The panel moves in the plan, the numbering changes, the list reorders
itself, and the walk sentence rewrites. You edited one number and four things
followed. That is the payoff for keeping one source of truth.

**If it breaks:** If an exhibit vanishes from the plan, check the spelling of
the wall — `"North"` is not `"north"`, and an unknown wall falls through to the
west by default in `positionOf()`.

### 3. Say something the plan cannot

**Do:** Add a `size` field to each exhibit ("A2 print", "on a screen", "projected
on the wall") and show it in the facts list beside Medium and Made.

**Check:** Every entry has it, and the page still makes sense to somebody who
never looks at the plan. Then ask whether it should be drawn in the plan too —
and notice that it does not have to be. The text view is allowed to carry more
than the picture. It is the picture that must never carry more than the text.

**If it breaks:** `undefined` appearing on the page means one exhibit is missing
the new field. Every entry needs it, or the code needs a sensible default.

### 4. Give the plan a keyboard route

**Do:** Add "Previous exhibit" and "Next exhibit" buttons above the plan that
step through the exhibits in walk order and select each one.

**Check:** With the mouse unplugged, you can walk the whole gallery in order.
The status line announces each exhibit as you arrive. Pressing Next on the last
exhibit does something defensible — stop, or wrap to the first — and you can say
which you chose and why.

**If it breaks:** If the buttons work but skip an exhibit, you are probably
indexing into `EXHIBITS` while displaying `exhibitsInWalkOrder()`. Those are two
different orders. Use the same one for both.

## What this pack cannot do

**It has no 3D and no VR, on purpose.** Adding either is a real project, and this
is the ground it stands on. When you do add it, here is what is actually
required — none of it optional:

- **HTTPS or `localhost`.** Browsers only expose `navigator.xr` in a secure
  context. Opening a file directly does not qualify, and neither does typing
  your laptop's `http://192.168.…` address into a headset's browser — an HTTP
  address on the local network is not a secure context. Publishing to GitHub
  Pages, which is HTTPS, is the easy way to satisfy this.
- **A real user gesture.** A page cannot drop somebody into a headset session on
  load. Entering VR has to come from a click. This is a safety rule.
- **Runtime feature detection.** Ask `navigator.xr.isSessionSupported`, never
  assume, and never guess from the browser's name. Support differs by device and
  can change with an update. `reference/index.html` is a working example of
  asking honestly and reporting the answer.
- **A renderer.** WebXR hands your code a pair of eye views and the position of
  the headset. It does not draw anything. Drawing is WebGL, usually through a
  library, and that library is a real download that has to come from somewhere —
  which is the first thing that makes this pack stop working offline.
- **A plan for motion sickness.** Moving somebody's viewpoint for them is the
  fastest way to make them ill. Honour `prefers-reduced-motion`, prefer
  teleporting to gliding, and never move the horizon.

**It cannot be entered by anybody else.** This runs from a file on your machine.
A `file:///…` address pasted into a chat opens nothing on somebody else's
computer. Publishing means putting the folder somewhere with a public address —
which the **Publish** lesson covers, and which is also the step that satisfies
the HTTPS requirement above.

**It has no images.** Every exhibit is a coloured block, because a pack with no
bundled media has nothing to credit wrongly and nothing to break offline. When
you add real screenshots, add real alt text and a real line in `credits.txt`.

**It cannot tell you whether the room is good.** A plan says where things hang.
Whether the walk makes sense, whether the summaries mean anything to a stranger,
and whether anybody wants to look — those need a person who has not seen it
before, given no instructions, and watched rather than helped.

## Where to go next

- Work through `challenges.md` in order. They get harder deliberately.
- Open `reference/index.html` **after** attempting challenge 5. Open it from a
  file and it will tell you the page is not a secure context — that is the
  correct answer, and seeing it is the point.
- Publish the gallery, then open the published HTTPS address on a phone. The
  plan and the list both work, and you have satisfied the first WebXR
  requirement without writing a line of XR code.
- Only then add the 3D room, as one more view of the same `EXHIBITS` array.
