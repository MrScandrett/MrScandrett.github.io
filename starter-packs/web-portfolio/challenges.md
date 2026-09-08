# Web Portfolio challenges

Eight extensions, easy to hard. Do one, run it, check it, then start the next.
You are given the goal and the test, never the finished code.

## 1. Make the hero yours

**Goal:** Replace the hero heading, paragraph, wordmark, and footer with your own
words, and swap `images/monogram.svg` for a mark you drew.

**How you know it worked:** Show the page to somebody for thirty seconds, then
take it away and ask what you make. If they cannot answer, the words are still
too vague. Sample text appears nowhere on the page.

## 2. Add a fourth and fifth project

**Goal:** Two more objects in the `projects` array, each with a real two-sentence
summary, real tools, and one specific thing learned.

**How you know it worked:** Five cards on "All", and every filter count in the
status line matches the number of cards visible. The layout still works at 375px
wide with no sideways scrolling.

## 3. Give every project its own case study

**Goal:** A separate page in `pages/` per project, each linked from its own card.

**How you know it worked:** Every card's link opens the right page, every page
loads its styling (check that `../`), and every page has a working way back. Use
the `href` stored in the project data rather than the same hard-coded path for
all of them — that is the actual change.

## 4. Show a project count on each filter button

**Goal:** Buttons that read "Game (2)", "Art (1)" and so on, staying correct when
you add projects.

**How you know it worked:** Add a project and the number changes with no other
edit. Keep the button's accessible name sensible — a screen reader should hear
"Game, 2 projects", not "Game open bracket two".

## 5. Build the filter buttons from the data

**Goal:** Delete the hand-written buttons from `index.html` and generate one per
category found in the `projects` array, plus "All".

**How you know it worked:** Add a project with a brand-new category and its
button appears by itself. Categories can no longer disagree with buttons, because
there is only one list now. Look up `Set` for removing duplicates.

A finished version is in `reference/index.html`. Try it before you look.

## 6. Let a project belong to more than one category

**Goal:** Change `category: "game"` to `categories: ["game", "art"]` and make
filtering work with the list.

**How you know it worked:** A project tagged both appears under both filters and
once under "All" — not twice. Everything that displays the category needs
updating too, so expect this to touch more of the file than you first think.

## 7. Remember the chosen filter in the address bar

**Goal:** Clicking "Art" makes the address end `?category=art`, and opening that
address shows the art filter already applied.

**How you know it worked:** Copy the address after filtering, paste it into a new
tab, and the right filter is already pressed. Look up `URLSearchParams` and
`history.replaceState`. Now you can send somebody a link to one part of your work.

## 8. Add a printable version

**Goal:** A `@media print` block so that printing the page (or saving it as PDF)
gives a clean one-page summary: no filter buttons, no placeholder blocks, links
readable on paper.

**How you know it worked:** Use the browser's Print Preview. The result looks
deliberate rather than like a screenshot of a website. Consider printing each
link's address after its text — a link nobody can click is useless on paper.

## Evidence checklist

- No placeholder text of any kind remains.
- Every page has exactly one `<h1>`, and every image has descriptive alt text.
- Every filter, including one with no matches, produces a clear result.
- The page is readable and does not scroll sideways at 375px wide.
- Tab reaches every button and link, with a visible outline, in a sensible order.
- No red errors in the Console.
- I can explain what happens between clicking a filter and the grid changing.
