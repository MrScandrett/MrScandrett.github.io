# Creation Hub challenges

Eight extensions, easy to hard. Do one, run it, check it, then start the next.
You are given the goal and the test, never the finished code.

## 1. Make the hub yours

**Goal:** Replace the heading, lede, notice and footer in `index.html` with your
own words, and replace or delete the `your-art-piece` entry in `script.js`.

**How you know it worked:** No sample text remains anywhere on the page. Show the
hub to somebody for thirty seconds, take it away, and ask what you make. If they
cannot answer, the words are still too vague.

## 2. Add a third real creation

**Goal:** Copy `creations/star-catcher/` to a new folder, change it into
something of your own, and add its entry to `CREATIONS`.

**How you know it worked:** Your creation opens from the hub **and** works when
you double-click its own `index.html` directly. If it only works one of those
two ways, its file paths are wrong — and the published version will break the
same way. Its controls are written down before you show anyone.

## 3. Show how many creations are in each category

**Goal:** Buttons that read "Game (2)", "Art (1)" and so on, staying correct when
you add creations.

**How you know it worked:** Add a creation and the number changes with no other
edit. Keep the accessible name sensible — a screen reader should hear "Game, 2
creations", not "Game open bracket two". Look up `aria-label` for that.

## 4. Add a search box

**Goal:** A labelled search field that filters by title and blurb, working
together with the category buttons rather than fighting them.

**How you know it worked:** Type `star`, then click **Simulation**. You get an
empty state, not a leftover card. Clear the box and the card returns. Search in
capitals and get the same result as lower case.

A finished version is in `reference/index.html`. Try it before you look.

## 5. Give Bounce Lab balls different masses

**Goal:** In `sim.js`, give each ball a `mass` (its area is a reasonable choice —
a bigger ball is heavier) and use the general equal-collision formula instead of
the equal-mass shortcut in `exchangeVelocities()`.

**How you know it worked:** A big ball hitting a small one barely changes course,
while the small one is thrown clear. Turn gravity to `0` and bounce to `1.00`,
then watch the **average speed** readout: with masses done correctly it stays
steady rather than creeping up. A number that climbs on its own means the model
is inventing energy.

## 6. Give Star Catcher something to avoid

**Goal:** A second kind of falling object that costs you points, or ends the run,
when you catch it.

**How you know it worked:** It is obviously different from a star at a glance —
different shape as well as different colour, because roughly one player in twelve
cannot rely on the colour. The scoring text still reads correctly, and the change
is announced in the status line as well as drawn on the canvas.

## 7. Remember the best score in that browser

**Goal:** Save Star Catcher's highest score with `localStorage`, and show it
beside the current score.

**How you know it worked:** Play, reload the page, and the best score is still
there. Then write one sentence on the page saying exactly what that storage is:
one browser, on one computer, cleared whenever the browser's site data is
cleared, and invisible to everybody else. A "high score table" that is really one
person's own browser should not pretend otherwise.

## 8. Remember the chosen filter in the address bar

**Goal:** Clicking **Simulation** makes the address end `?category=simulation`,
and opening that address shows the simulation filter already applied.

**How you know it worked:** Copy the address after filtering, paste it into a new
tab, and the right button is already pressed. Look up `URLSearchParams` and
`history.replaceState`. Now you can send somebody a link to one part of your
catalog instead of telling them what to click.

## Evidence checklist

- No placeholder text of any kind remains.
- Every creation opens from the hub **and** on its own.
- Every creation's controls are written down and are enough for a stranger.
- Every filter, including one that matches nothing, produces a clear sentence.
- Each page has exactly one `<h1>`, and every image has descriptive alt text.
- Every number drawn on a canvas also exists as real text on the page.
- The pages are readable and do not scroll sideways at 375px wide.
- Tab reaches every button, slider and link, with a visible outline, in a
  sensible order.
- No red errors in the Console on any of the three pages.
- I can explain what happens between clicking a filter and the catalog changing.
