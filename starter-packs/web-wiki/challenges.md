# Signal Notes challenges

Seven extensions, easy to hard. Do one, reload the page, and check the result
before starting the next. None of these hand you the code.

Keep the rule from the README in mind throughout: **the articles are data.**
If you find yourself typing article text into `index.html`, stop — that text
belongs in the `ARTICLES` array.

## 1. Restyle the wiki (easy)

**Goal:** Make it look like yours. Change the colour variables at the top of
`style.css`, the wiki name in `index.html`, and the font stack on `body`.

**How to know it worked:** Nothing looks like the version you downloaded, and
every link and the search box still show a clear outline when you press Tab to
them. If the outline is gone, you broke something more important than the
colours — put it back.

## 2. Show how many articles the wiki holds (easy)

**Goal:** Display the article count in the header, taken from the data — not
typed in as the word "three".

**How to know it worked:** Add a fourth article and the header says four with no
further edits. That is the test: a number you typed in is a number that will be
wrong later.

## 3. Add a "last checked" date to every article (easy)

**Goal:** Give each article a `checked` field with a date, show it near the
sources line, and show it on the index card too.

**How to know it worked:** Every article displays its date, and an article
missing the field does not crash the page — decide what it should show instead
and make that happen on purpose.

## 4. Highlight the search term in the results (medium)

**Goal:** When someone searches `pixel`, make the matching word stand out in the
summary shown on the index card.

**How to know it worked:** Searching `pix` highlights `pix` inside `pixel`.
Searching in capitals highlights the original lower-case text — you are matching
case-insensitively but displaying the text as written.

**The trap you must avoid:** it is tempting to build the card with
`innerHTML = "..." + searchTerm + "..."`. Do not. Whatever the reader typed would
then be treated as HTML by the browser. Try typing `<b>hi</b>` into a search box
that does this and watch it turn bold — now imagine it was a `<script>` tag. This
is called cross-site scripting, and it is one of the most common security holes
on the web. Build the highlight from separate elements with `textContent`
instead, so typed text can only ever be text.

## 5. Add tag pages (medium)

**Goal:** Make the keywords clickable, so clicking `rgb` shows every article
carrying that keyword. Give it its own address, like `#/tag/rgb`, so the list can
be linked to and Back works.

**How to know it worked:** Clicking a tag changes the address bar; pasting that
address into a new tab shows the same filtered list; Back returns you to where
you were. A tag with no articles shows a real message, not an empty page.

## 6. Add a table of contents inside long articles (medium-hard)

**Goal:** Give articles named sections instead of a flat list of paragraphs —
change `body` from an array of strings into an array of `{ heading, paragraphs }`
objects — then build a list of links to those sections at the top of the article.

**How to know it worked:** Clicking a contents link jumps to that section, and
the section headings are real `<h3>` elements, so a screen reader can list them.
Your older articles either still work or you have updated all three.

**Think about:** every heading link needs an `id` to jump to, and ids must be
unique on the page. What happens if two sections have the same title?

## 7. Make it honest about being editable (hard)

**Goal:** Add an "Edit this article" panel that lets a reader change the article
text on screen — and label it, unmistakably and without needing to be clicked,
as a local preview that is not saved and that nobody else can see. Add a button
that copies the edited article out as a block of JavaScript the author could
paste into `ARTICLES`.

**How to know it worked:** Someone who has never met you can use the edit panel,
reload the page, see their change gone, and not feel tricked — because the page
told them in advance. If a reader could reasonably believe they had published
something, you are not finished.

**Why this is the hard one:** the code is not difficult. Saying clearly what your
software does and does not do, in a way that a stranger cannot misread, is the
part that takes real effort — and it is the part that separates a tool from a
trick.

## Evidence checklist

- Every article has a descriptive heading, an explanation, a worked example, and a sources line.
- Search works for capitals, lower case, a partial word, and a word that matches nothing.
- A direct link to one article opens that article.
- Back and Forward both behave.
- Every article can be reached from at least one other article.
- Nothing on the page implies a reader can publish an edit.
