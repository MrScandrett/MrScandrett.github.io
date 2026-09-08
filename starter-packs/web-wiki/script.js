"use strict";

// ==========================================================================
// SIGNAL NOTES — A STATIC WIKI
// Read README-FIRST.md before changing this file.
//
// The idea: the articles are DATA. The page is built from that data every
// time you navigate. Adding an article means adding one object to the array
// below — you never write the same article twice in two places.
// ==========================================================================

// --------------------------------------------------------------------------
// 1. THE ARTICLES
// --------------------------------------------------------------------------
// Each article has:
//   slug     - the short name used in the web address. Lower case, hyphens,
//              no spaces. Changing a slug breaks every link that used it.
//   title    - a descriptive heading. "Binary" is a label; "How Computers
//              Count: Binary" tells a reader what they will learn.
//   summary  - one sentence, shown on the index and at the top of the article.
//   keywords - extra words the search should find, that are not in the text.
//   body     - the explanation, one string per paragraph.
//   example  - a worked example. An explanation without one is a definition.
//   related  - links to other articles, each with a reason for the link.
//   sources  - where this came from and how a reader could check it.
//
// TRY THIS: add a fourth article. Give it a slug nobody else uses, and add it
// to at least one other article's `related` list so it is not an orphan.
const ARTICLES = [
  {
    slug: "how-computers-count",
    title: "How Computers Count: Binary",
    summary: "A computer has only two symbols to work with, so it counts in twos instead of tens.",
    keywords: ["base 2", "bits", "byte", "place value", "ones and zeros"],
    body: [
      "You count in base ten because you have ten fingers. The number 407 does not mean four, zero, seven — it means four hundreds, no tens, and seven ones. Each position is worth ten times the position to its right, and there are ten symbols, 0 to 9, to fill those positions with.",
      "A computer stores everything as electricity, and the reliable question to ask a wire is not 'how much?' but 'is there any?'. That gives two symbols, 0 and 1, so a computer counts in base two. Each position is worth twice the position to its right: 1, 2, 4, 8, 16, 32, and so on. One of those positions is called a bit.",
      "Eight bits together are called a byte. The largest number eight bits can hold is 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1, which is 255, so a byte can store any whole number from 0 to 255 — 256 different values counting zero. That 0 to 255 range turns up everywhere in computing, and once you have seen where it comes from you will start recognising it.",
      "This is why sizes in computing are the numbers they are. 256, 1024 and 65536 look arbitrary until you notice they are 2 multiplied by itself eight, ten and sixteen times."
    ],
    example: {
      intro: "Read the binary number 1101 by writing the place values above it and adding up the columns that hold a 1.",
      sample: "  8  4  2  1\n  1  1  0  1   ->   8 + 4 + 0 + 1  =  13",
      explain: "So 1101 in binary is 13 in decimal. Try 10000 the same way: the place values are 16, 8, 4, 2, 1, and only the 16 column holds a 1, so the answer is 16."
    },
    related: [
      { slug: "what-a-pixel-is", why: "Screen colours are stored as three numbers from 0 to 255 — which is exactly one byte each." },
      { slug: "why-loops-repeat", why: "Counting up in twos, or in anything else, is a job for a loop." }
    ],
    sources: "Written for ClassroomOS from a classroom place-value demonstration. Every claim here is checkable by hand: add 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 yourself and confirm you get 255. For a second opinion, look up 'positional notation' or 'binary number' in any encyclopedia or introductory computer science textbook."
  },

  {
    slug: "what-a-pixel-is",
    title: "What a Pixel Actually Is",
    summary: "Every picture on a screen is a grid of tiny squares, and every square's colour is three numbers.",
    keywords: ["rgb", "resolution", "screen", "colour", "color", "image", "hex"],
    body: [
      "A pixel is the smallest square of a screen that can be given its own colour. The word is a squashed version of 'picture element'. Screens do not draw curves or letters; they set the colour of a very large number of squares, and your eye assembles the result.",
      "Resolution is just how many of those squares there are, written as width by height. A 1920 by 1080 screen is 1920 squares across and 1080 down, which is 2,073,600 pixels in total. That multiplication is why a bigger image takes longer to process: there is literally more of it.",
      "Each pixel's colour is stored as three numbers — how much red, how much green, and how much blue light to mix. Each of those runs from 0 to 255, because each is stored in one byte. Three bytes per pixel means 256 x 256 x 256 possible colours, which is 16,777,216. That is where the phrase 'millions of colours' comes from; it is not marketing, it is a multiplication.",
      "The same colour is often written in hexadecimal, a counting system with sixteen symbols, so that each of the three numbers fits in exactly two characters. That is what a colour like #ff8800 is: three pairs, red then green then blue."
    ],
    example: {
      intro: "Pure red uses all the red light and none of the others. Here is the same colour written the two common ways.",
      sample: "rgb(255, 0, 0)      is the same colour as      #ff0000\nrgb(255, 136, 0)    is the same colour as      #ff8800",
      explain: "255 in hexadecimal is ff, and 136 is 88. Set all three channels to the same number and you get a grey: rgb(128, 128, 128) is the grey exactly halfway between black and white."
    },
    related: [
      { slug: "how-computers-count", why: "The 0 to 255 range of each colour channel is one byte — eight bits." },
      { slug: "why-loops-repeat", why: "Changing every pixel in an image means visiting two million of them, which is what loops are for." }
    ],
    sources: "Written for ClassroomOS after zooming into a photograph until the individual squares were visible — a demonstration you can repeat with any image viewer. The arithmetic is checkable: multiply 1920 by 1080, and multiply 256 by itself three times. For background reading, look up 'pixel', 'RGB colour model' and 'display resolution'."
  },

  {
    slug: "why-loops-repeat",
    title: "Why Loops Exist",
    summary: "A loop is how you ask for a job to be done many times without writing it out many times.",
    keywords: ["for", "while", "iteration", "repeat", "off by one", "infinite loop"],
    body: [
      "Suppose you want to print the numbers 1 to 5. You could write five lines. Now print 1 to a million. You cannot write a million lines, and even if you could, changing the job would mean changing a million lines. A loop separates the thing you want done from the number of times you want it done, so one becomes cheap to change without touching the other.",
      "A counting loop has three parts, and it is worth naming them: where the counter starts, the test that decides whether to keep going, and the step that changes the counter each time round. If the step never moves the counter towards failing the test, the loop never ends. That is an infinite loop, and it is the most common way to freeze a page.",
      "Programmers usually start counting at 0 rather than 1, which feels wrong for about a week and then feels obvious. It matters because it decides where the loop stops. Counting from 0, the test 'keep going while the counter is less than 5' runs exactly five times: 0, 1, 2, 3, 4. Using 'less than or equal to 5' would run six times.",
      "That single mistake — running one time too many or one too few — is so common it has a name: an off-by-one error. When a loop misbehaves, check its stopping test first, before you suspect anything else."
    ],
    example: {
      intro: "This loop runs three times. Read the three parts aloud: start at 0, keep going while under 3, add 1 each time.",
      sample: "for (let i = 0; i < 3; i++) {\n  console.log(i);\n}\n\n// prints:  0  1  2",
      explain: "It prints 0, 1 and 2 — three numbers, but never 3, because when the counter reaches 3 the test 'i < 3' is false and the loop stops. Change < to <= and it prints four numbers. That is an off-by-one error you made on purpose, so you will recognise the accidental version."
    },
    related: [
      { slug: "what-a-pixel-is", why: "A loop is the only sane way to touch all 2,073,600 pixels of a screen." },
      { slug: "how-computers-count", why: "Loops that count in twos are how you convert a number to binary." }
    ],
    sources: "Written for ClassroomOS from the loop lesson used in class. Everything here can be tested in your browser's console in under a minute: type the example in and watch it, then change the test and watch it again. For further reading, look up 'for loop', 'iteration' and 'off-by-one error'."
  }
];

// --------------------------------------------------------------------------
// 2. THE PARTS OF THE PAGE WE CHANGE
// --------------------------------------------------------------------------
const indexView = document.querySelector("#index-view");
const articleView = document.querySelector("#article-view");
const articleIndex = document.querySelector("#article-index");
const noResults = document.querySelector("#no-results");
const searchInput = document.querySelector("#search-input");
const searchForm = document.querySelector("#search-form");
const searchClear = document.querySelector("#search-clear");
const searchStatus = document.querySelector("#search-status");
const indexHeading = document.querySelector("#index-heading");
const articleTitle = document.querySelector("#article-title");
const articleSummary = document.querySelector("#article-summary");
const articleBody = document.querySelector("#article-body");
const articleExample = document.querySelector("#article-example");
const articleRelated = document.querySelector("#article-related");
const articleSources = document.querySelector("#article-sources");

// WHAT: whatever is currently typed in the search box.
// WHY: the route can change while a search is active, so the search term has to
//      live somewhere other than inside one function.
let searchTerm = "";

// WHAT: false until the first navigation happens.
// WHY: we move focus to the heading when the reader navigates, which helps
//      screen reader and keyboard users. But stealing focus the instant a page
//      loads is rude, so we skip it the first time.
let hasNavigated = false;

// --------------------------------------------------------------------------
// 3. FINDING AND SEARCHING
// --------------------------------------------------------------------------

// WHAT: finds one article by slug, or returns undefined.
function findArticle(slug) {
  return ARTICLES.find((article) => article.slug === slug);
}

// WHAT: squashes an article into one long lower-case string to search inside.
// WHY: searching one string is simpler than searching a title, then a summary,
//      then five paragraphs. Lower case on BOTH sides is what makes the search
//      case-insensitive: "BINARY", "Binary" and "binary" all become "binary".
function searchableText(article) {
  return [
    article.title,
    article.summary,
    article.keywords.join(" "),
    article.body.join(" ")
  ].join(" ").toLowerCase();
}

// WHAT: returns the articles matching a search term.
// WHY: includes() looks for the term ANYWHERE in the text, so a partial word
//      works: "loop" finds "Loops", and "pix" finds "pixel". An empty search
//      returns everything, which is what an empty search should mean.
function searchArticles(term) {
  const needle = term.trim().toLowerCase();
  if (needle === "") return ARTICLES;
  return ARTICLES.filter((article) => searchableText(article).includes(needle));
}

// --------------------------------------------------------------------------
// 4. DRAWING THE INDEX
// --------------------------------------------------------------------------

// WHAT: builds one card for the article index.
function buildIndexCard(article) {
  const item = document.createElement("li");
  item.className = "card";

  const heading = document.createElement("h3");
  const link = document.createElement("a");
  // WHY: a real <a href> and not a button. The address bar updates, the reader
  //      can copy the link, open it in a new tab, and the Back button works.
  link.href = "#/article/" + article.slug;
  link.textContent = article.title;
  heading.append(link);

  const summary = document.createElement("p");
  summary.textContent = article.summary;

  const tags = document.createElement("p");
  tags.className = "tags";
  tags.textContent = article.keywords.slice(0, 3).join(" · ");

  item.append(heading, summary, tags);
  return item;
}

// WHAT: redraws the article index, filtered by whatever is in the search box.
function renderIndex() {
  const matches = searchArticles(searchTerm);

  articleIndex.textContent = "";
  for (const article of matches) {
    articleIndex.append(buildIndexCard(article));
  }

  // The empty state is driven by the data, not by anything on screen.
  noResults.hidden = matches.length > 0;

  // WHAT: a sentence for the live region so the result count is announced.
  if (searchTerm.trim() === "") {
    searchStatus.textContent = "Showing all " + ARTICLES.length + " articles.";
  } else if (matches.length === 0) {
    searchStatus.textContent = "No articles match " + JSON.stringify(searchTerm) + ".";
  } else {
    searchStatus.textContent =
      matches.length + (matches.length === 1 ? " article matches " : " articles match ") +
      JSON.stringify(searchTerm) + ".";
  }
}

// --------------------------------------------------------------------------
// 5. DRAWING ONE ARTICLE
// --------------------------------------------------------------------------

// WHAT: fills the article view with one article's content.
function renderArticle(article) {
  articleTitle.textContent = article.title;
  articleSummary.textContent = article.summary;

  articleBody.textContent = "";
  for (const paragraph of article.body) {
    const p = document.createElement("p");
    p.textContent = paragraph;
    articleBody.append(p);
  }

  articleExample.textContent = "";
  const intro = document.createElement("p");
  intro.textContent = article.example.intro;
  const sample = document.createElement("pre");
  sample.className = "sample";
  // WHY: <pre> keeps the spaces and line breaks exactly as written, which is
  //      what makes the lined-up place values in the binary example readable.
  sample.textContent = article.example.sample;
  const explain = document.createElement("p");
  explain.textContent = article.example.explain;
  articleExample.append(intro, sample, explain);

  articleRelated.textContent = "";
  for (const relation of article.related) {
    const target = findArticle(relation.slug);
    if (!target) continue;              // a link to a deleted article is skipped, not broken
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#/article/" + target.slug;
    link.textContent = target.title;
    const why = document.createElement("span");
    why.className = "why";
    why.textContent = " — " + relation.why;
    item.append(link, why);
    articleRelated.append(item);
  }

  articleSources.textContent = "Sources: " + article.sources;
}

// --------------------------------------------------------------------------
// 6. ROUTING: TURNING THE ADDRESS INTO A VIEW
// --------------------------------------------------------------------------

// WHAT: reads the part of the address after the # and decides what to show.
// WHY: putting the current page in the address is what makes a link to one
//      article work when it is pasted somewhere else, and what makes the
//      browser's Back button do the obvious thing. The alternative — a button
//      that swaps the content without changing the address — leaves the reader
//      with an address bar that lies and a Back button that leaves the site.
function route() {
  const hash = window.location.hash;         // e.g. "#/article/why-loops-repeat"

  if (hash.startsWith("#/article/")) {
    const slug = hash.slice("#/article/".length);
    const article = findArticle(slug);

    if (article) {
      renderArticle(article);
      showView(articleView, articleTitle);
      document.title = article.title + " — Signal Notes";
      return;
    }
    // WHAT: an address for an article that does not exist.
    // WHY: silently showing the index would confuse someone following an old
    //      link, so we say what happened.
    showIndexView("No article called " + JSON.stringify(slug) + ". Showing all articles instead.");
    return;
  }

  showIndexView();
}

// WHAT: draws the index and shows it.
// The optional message replaces the usual result count, which is how the
// "that article does not exist" case gets to say something useful.
function showIndexView(message) {
  renderIndex();
  if (message) searchStatus.textContent = message;
  showView(indexView, indexHeading);
  document.title = "Signal Notes — A Static Wiki Starter";
}

// WHAT: shows one view, hides the other, and moves focus to the new heading.
function showView(viewToShow, headingToFocus) {
  indexView.hidden = viewToShow !== indexView;
  articleView.hidden = viewToShow !== articleView;

  window.scrollTo(0, 0);

  // Only take focus once the reader has actually navigated somewhere.
  if (hasNavigated) headingToFocus.focus();
  hasNavigated = true;
}

// --------------------------------------------------------------------------
// 7. EVENTS
// --------------------------------------------------------------------------

// WHAT: runs every time the search box changes.
function handleSearchInput() {
  searchTerm = searchInput.value;

  // If the reader is inside an article, searching should take them back to the
  // list. Changing the hash triggers route(), which redraws the filtered index.
  if (window.location.hash.startsWith("#/article/")) {
    window.location.hash = "#/";
    return;
  }
  renderIndex();
}

// WHAT: empties the search box and puts every article back.
function handleSearchClear() {
  searchInput.value = "";
  searchTerm = "";
  if (window.location.hash.startsWith("#/article/")) {
    window.location.hash = "#/";
    return;
  }
  renderIndex();
  searchInput.focus();
}

// --------------------------------------------------------------------------
// 8. START
// --------------------------------------------------------------------------
function init() {
  searchInput.addEventListener("input", handleSearchInput);
  searchClear.addEventListener("click", handleSearchClear);

  // WHY: there is no server to send a search to, so pressing Enter must not
  //      try to reload the page. The results are already up to date.
  searchForm.addEventListener("submit", (event) => event.preventDefault());

  // WHY: hashchange fires when a link is clicked AND when Back or Forward is
  //      pressed. One listener therefore handles all three.
  window.addEventListener("hashchange", route);

  // Draw whatever the address asks for, including on a direct link.
  route();
}

init();
