# Web Foundations challenges

Eight extensions, ordered easy to hard. Do one at a time. After each one, run the
page and check the result before starting the next.

None of these give you the finished code on purpose. You are given the idea and a
way to know it worked; the code in between is the part that teaches you.

## 1. Write your own three projects

**Goal:** Replace all the sample projects with real work of yours, including the
tags. Update the About page to say who you are.

**How you know it worked:** No sample text is left anywhere in the pack. Every
tag you can see is one you would actually search for.

## 2. Add a Clear button next to the search box

**Goal:** A `<button type="button">` beside the input that empties the box and
brings back every project.

**How you know it worked:** Type something, click Clear, and all your projects
return with the status line reading "Showing all N projects." Then do the same
using only the Tab and Enter keys — a real `<button>` responds to Enter and Space
with no extra code, which is exactly why you must never use a clickable `<div>`.

## 3. Show the newest project first

**Goal:** Order the cards by year, newest at the top, without hand-sorting the
array.

**How you know it worked:** Add a project with an older year at the *bottom* of
the array and confirm it appears at the bottom of the page. Look up
`Array.prototype.sort` and be careful: sort changes the array in place, so sort a
copy unless you want the original order gone for good.

## 4. Make each tag clickable

**Goal:** Clicking a tag searches for that tag.

**How you know it worked:** Click "canvas" on any card and only the canvas
projects remain, with the search box now containing the word "canvas". It must
also work with the keyboard alone. Two hints: a thing you click should be a
`<button>`, and because the cards are rebuilt on every keystroke, a listener on
the `<ul>` survives where a listener on each button would not.

A finished version of this challenge is in `reference/index.html`. Try it before
you look.

## 5. Count the matches inside the heading

**Goal:** Make the "Projects" heading read "Projects (3)" and keep the number
correct while filtering.

**How you know it worked:** Type until only one card is left; the heading shows
(1). Clear the box; it shows the full number again. Careful: the heading and the
status line must never disagree with the number of cards on screen.

## 6. Add a third page and link it from both others

**Goal:** A `pages/contact.html` or `pages/now.html`, matching the site's look,
appearing in the nav of every page.

**How you know it worked:** From any page you can reach any other page, and back
again, with no dead ends. The stylesheet loads on the new page too — which means
you got the `../` right. Give the new page its own `aria-current="page"` marker.

## 7. Remember the last search

**Goal:** When you refresh, the search box still holds what you typed, and the
list is still filtered to match.

**How you know it worked:** Type "art", refresh the page, and the filtered result
is still there. Look up `localStorage.setItem` and `localStorage.getItem`. Note
what this proves: this is per-browser storage on one computer, not a database.
Open the same file in a different browser and it will be empty.

## 8. Group the projects by year

**Goal:** A subheading for each year, with that year's projects underneath.

**How you know it worked:** Adding a project from a new year creates a new group
by itself, with no year hard-coded anywhere. Searching still works and empty year
groups do not appear. This is the hardest one here: you are now deciding what
structure the page has, not just what it contains.

## Evidence checklist

- Every page has exactly one `<h1>`, and every image has real alt text.
- Every control has a visible label, and Tab shows a clear focus outline
  everywhere.
- Nothing on the site is sample text from this pack.
- The Console shows no red errors.
- I can explain, out loud and without the screen, what happens between typing a
  letter and the list changing.
