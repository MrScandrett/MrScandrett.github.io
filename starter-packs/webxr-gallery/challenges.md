# WebXR Gallery challenges

Eight extensions, easy to hard. Do one, run it, check it, then start the next.
You are given the goal and the test, never the finished code.

## 1. Make the room yours

**Goal:** Replace the title, lede, footer and all four exhibits with your own
work, and delete any entry you cannot fill honestly.

**How you know it worked:** No sample text remains anywhere. Read your summaries
to somebody who has not seen the projects; if they cannot tell what an exhibit
*is* from the summary alone, it is not finished.

## 2. Put the door where you want it

**Goal:** The door is currently drawn on the south wall as a hard-coded gap in
`drawPlan()`. Move it into the data — a `DOOR` setting with a wall and a
position — and draw it from there.

**How you know it worked:** Change the door's wall and both the gap and its
label move together. The walk sentence still starts from the door. If you had to
edit two places to move it once, it is not in the data yet.

## 3. Show which exhibits a visitor can see from the door

**Goal:** Mark the exhibits on the wall opposite the door as "visible on entry"
in the list.

**How you know it worked:** Move the door and the marks move with it, with no
other edit. This is a small taste of what a 3D scene has to do constantly:
answer questions about where things are, from where somebody is standing.

## 4. Walk the gallery with the keyboard

**Goal:** "Previous exhibit" and "Next exhibit" buttons that step through the
exhibits in walk order.

**How you know it worked:** With the mouse unplugged you can visit every exhibit
in order, and each arrival is announced in the status line. Decide what the last
exhibit's Next does — stop or wrap — and be able to say why.

## 5. Report honestly whether this device could enter VR

**Goal:** A panel that asks three questions and reports each answer: does
`navigator.xr` exist, is the page a secure context, and does
`navigator.xr.isSessionSupported("immersive-vr")` say yes? Offer an **Enter VR**
button only when all three pass.

**How you know it worked:** Open it from a file and it says the page is not a
secure context, with the button disabled. Publish it over HTTPS on a machine
with no headset and the first two pass while the third does not — and the
sentence explains which. Never show an enabled button you cannot honour.

A finished version is in `reference/index.html`. Try it before you look.

## 6. Give each exhibit its own address

**Goal:** Selecting an exhibit puts `?exhibit=orbit-study` in the address bar,
and opening that address selects it on load and moves focus to it.

**How you know it worked:** Copy the address, paste it into a new tab, and land
on the right exhibit with it already highlighted. Look up `URLSearchParams` and
`history.replaceState`. Now you can send somebody a link to one exhibit instead
of a link to the room and instructions.

## 7. Add a second room

**Goal:** Two rooms, each with its own exhibits and its own plan, and a way to
move between them.

**How you know it worked:** The walk sentence describes both rooms in a sensible
order, and no exhibit appears in two rooms. Notice what this does to your data
shape — a flat list of exhibits stops being enough, and a room that holds
exhibits starts making sense. That change is the actual lesson here.

## 8. Add the 3D room

**Goal:** A WebGL view of the same `EXHIBITS` array, sitting alongside the plan
and the list rather than replacing either.

**How you know it worked, and this list is the whole assignment:**

- The exhibit list is unchanged and still complete with the 3D view removed.
- Adding an exhibit to the data puts it in the list, the plan **and** the room,
  with no separate edit for the 3D scene. If the scene has its own copy of the
  content, you have built the exact failure this pack exists to prevent.
- The page does something sensible when WebGL is unavailable: it says so in
  words and the gallery still works.
- The 3D view is reachable and dismissible with a keyboard.
- `prefers-reduced-motion` is honoured by anything that moves.
- The library you use is credited in `credits.txt` with its licence, and you can
  say what happens to the page when it fails to load.

Read the WebXR section of `README-FIRST.md` before starting this one.

## Evidence checklist

- No placeholder text of any kind remains.
- Deleting the canvas from the HTML leaves a complete, usable gallery.
- Every number or label drawn in the plan also exists as real text on the page.
- Every selection is announced in words, not only shown by a colour or a ring.
- The page has exactly one `<h1>`, and every image has descriptive alt text.
- Tab reaches every button, with a visible outline, in a sensible order.
- The page is readable at 200% zoom and does not scroll sideways at 375px wide.
- No red errors in the Console.
- I can explain why the exhibit list exists even after the 3D room is built.
