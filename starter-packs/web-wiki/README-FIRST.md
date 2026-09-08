# Web Wiki Starter: Signal Notes

## What you are getting

A small working wiki that runs in a browser with no internet and no server. It
has an article index, three real articles written for this pack, a search box
that searches the article text, and "related article" links that connect the
articles to each other.

It is a **static** wiki. That word matters, and the whole pack is built around
being honest about it: the articles are published, not editable. Nobody reading
the page can change it. Adding an article means opening `script.js`, adding an
object to an array, saving, and publishing the file again.

Files:

- `index.html` — the shape of the page: header, nav with the search box, an index view, an article view, footer.
- `style.css` — how it looks, including the focus outline that keyboard users depend on.
- `script.js` — the three articles as data, the search, and the routing that makes links to a single article work.
- `reference/index.html` — a finished version of guided change 4, to compare against **after** your own attempt.
- `challenges.md` — seven extensions, easy to hard.
- `troubleshooting.md` — what to check when something breaks.
- `credits.txt` — licence and what to add when you add media.

## Before you start

1. Install [VS Code](https://code.visualstudio.com/) if it is not already on the machine.
2. In VS Code choose **File → Open Folder** and pick the `web-wiki` folder
   itself — the folder, not one file inside it. Opening a single file hides the
   other two from you, and every "why can't it find my stylesheet" problem
   starts there.
3. Optional: install the **Live Preview** extension. It reloads the page each
   time you save. You do not need it — this pack works by double-clicking
   `index.html`.

## Open and run it

1. Double-click `index.html`. Your browser opens on the article index, showing
   three cards.
2. Click **How Computers Count: Binary**. The article opens, and look at the
   address bar: it now ends with `#/article/how-computers-count`.
3. Press the browser's **Back** button. You return to the index. Press
   **Forward**. You return to the article. This is not free — it works because
   navigation happens through real links that change the address.
4. Copy the whole address from the address bar, open a new tab, and paste it in.
   The article opens directly, without going through the index first.
5. Scroll to **Related articles** at the bottom and click one. You land on the
   other article. Press Back twice to get to where you started.
6. Test the search box with all four of these, in order:
   - Type `BINARY` in capitals. One article matches. Search is deliberately case-insensitive.
   - Clear it and type `binary` in lower case. The same one article matches.
   - Clear it and type `loop` — a **partial** word, and only part of the title
     "Why Loops Exist". It still matches, because the search looks for your text
     anywhere inside the article.
   - Clear it and type `zebra`. Nothing matches, and you get a real message
     explaining what to try — not a blank page.
7. Press <kbd>Tab</kbd> from the top of the page. Every link, the search box and
   the buttons should each show a clear outline when focused.

## Read before you change

**`index.html` contains no article text.** It contains two empty containers:
`#index-view` for the list and `#article-view` for a single article. Exactly one
of them is visible at any moment. All three articles live in the `ARTICLES`
array in `script.js`, and every card, heading, paragraph and link you see is
built from that array. Write an article twice and the two copies will disagree
within a week.

**The address bar is the state.** When you click an article link, the browser
puts `#/article/<slug>` in the address and fires a `hashchange` event. The
`route()` function reads that address and decides which view to show. This is
why three things work that are easy to get wrong: a pasted link to one article
opens that article; the Back button returns you to the list; and the Forward
button still works afterwards. A version built with buttons that just swap the
content would break all three, and readers would leave the site every time they
pressed Back.

**Search is a filter over data, not over the page.** `searchArticles()` glues
each article's title, summary, keywords and body into one lower-case string and
asks whether your lower-cased search text appears anywhere in it. Lower-casing
both sides is what makes `BINARY` and `binary` behave the same, and using
"appears anywhere" rather than "starts with" is what makes `pix` find `pixel`.
The search never looks at what is drawn on screen — it always goes back to the
`ARTICLES` array.

## Your guided changes

Do these in order. Each has something observable to check.

### 1. Fix a fact and add your name to the sources line

**Do:** Open `script.js` and read the article on pixels. Change its `sources`
string so it also says who checked it and when — for example, adding your first
name and the date you verified the 1920 × 1080 multiplication yourself.

**Check:** Refresh, open that article, scroll to the bottom, and read your own
sentence in the Sources line.

**If it breaks:** A blank page means you probably broke a quote. If your sentence
contains an apostrophe or a quotation mark, it must not end the string early.
The console (F12 → Console) names the line.

### 2. Add a keyword so search finds an article by a word that is not in it

**Do:** Nobody searching for a picture format would type "pixel". Add `"jpeg"`
and `"png"` to the `keywords` array of the pixel article.

**Check:** Search `png`. The pixel article appears, even though the letters
p-n-g never appear in the article text. Search `PNG` in capitals — same result.

**If it breaks:** If nothing matches, check that you added your words *inside*
the square brackets of `keywords`, each in quotes, separated by commas.

### 3. Write a fourth article and link it into the wiki

**Do:** Copy one whole article object in `ARTICLES` and paste it after the last
one, with a comma between. Give it a new `slug` (lower case, hyphens, no
spaces), a descriptive title, a one-sentence summary, at least three body
paragraphs, a worked example, keywords, and a real sources line. Then — this is
the part people skip — add your new article to the `related` list of at least
one existing article, with a sentence saying *why* the two are connected.

**Check:** The index shows four cards. Your article opens from the index, is
found by the search, and can be reached from another article's Related list. Copy
its address into a new tab and confirm the direct link works.

**If it breaks:** A related link that shows nothing means the `slug` in the
`related` entry does not exactly match the `slug` of the article. `renderArticle`
skips relations it cannot find rather than crashing, so a typo here is silent —
which is exactly why you check by clicking.

### 4. Make the related links point both ways

**Do:** Right now you have to remember to add the link on both articles by hand,
and eventually you will forget. Write a function that, given an article, returns
every *other* article that lists it in its `related` array, and show those under
a heading like "Also links here" on the article page.

**Check:** Add your fourth article's `related` link to one existing article only.
Open that existing article and confirm your new article now appears in the
"Also links here" section without you having edited it. Delete a related entry
and confirm the back-link disappears too.

**If it breaks:** If every article lists itself, your filter is not excluding the
article you are currently viewing. This is guided change 4, and
`reference/index.html` shows a finished version.

## What this pack cannot do

**Nobody can edit it from the page.** There is no Edit button, and adding one
that only changed the text on screen would be a lie — a refresh would wipe it,
and no other reader would ever see it. This is a published snapshot. It shows
what the author decided, at the moment they published, and nothing else.

A wiki that many people can actually edit is a much bigger machine. Here is what
it genuinely needs, none of which can exist in a file you double-click:

- **Accounts and authentication.** The site has to know who is asking before it
  can let anyone change anything. That means sign-up, sign-in, passwords stored
  as one-way hashes and never as readable text, password resets that cannot be
  used to steal an account, and sessions so a reader stays signed in between
  pages. Every one of those is somewhere a mistake hurts a real person.
- **A database on a server.** Articles have to live somewhere every visitor
  shares. A file on your own computer is not shared with anyone; a browser's
  `localStorage` is not either — it is one browser on one machine. The moment
  you want two people to see the same edit, you need a server holding the
  articles and an interface for reading and writing them.
- **Permissions.** "Signed in" is not the same as "allowed". Real wikis
  distinguish readers, editors, and administrators; they protect certain pages
  from editing; and they decide what a brand-new account is allowed to do,
  because brand-new accounts are where most abuse comes from.
- **Revision history.** Every save has to be kept, with who saved it and when,
  and every change has to be reversible. This is not a nice extra — it is the
  only thing that makes open editing survivable. If a bad edit cannot be undone
  in one click, the first bad edit ends the wiki.
- **Moderation, and the people to do it.** Someone must watch recent changes,
  revert vandalism, settle disagreements about what is true, and handle abuse
  and reports. Wikipedia's software is the small part of Wikipedia; the volunteer
  moderators are the large part. A shared wiki with no moderator becomes a
  vandalised wiki, usually within days of anyone finding it.

**It cannot search the internet.** The search box searches these three articles
and nothing else. If it finds nothing, that means "not in this wiki", not "not
true".

**It has no server at all**, so it cannot send email, cannot count visitors,
cannot know who is reading, and cannot keep anything between visits.

**And it is only as accurate as its author.** A published page looks equally
confident whether it is right or wrong. That is why every article here carries a
sources line saying where it came from and how you could check it — and why you
should write one for every article you add.

## Where to go next

- Work through `challenges.md` in order; they get harder deliberately.
- Compare your guided change 4 with `reference/index.html`, but only after you
  have made your own attempt.
- Learn about the History API (`pushState`) — the grown-up version of the hash
  routing used here, which gives you addresses without the `#`. It needs a
  server that knows to serve your page for those addresses, which is a good
  first reason to learn what a server does.
- Read the "View history" tab on any Wikipedia article. Every line in it is a
  feature this pack does not have, and you will understand what each one costs.
