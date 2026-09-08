# Web Business Starter Pack

A one-page site for a small local business: what they do, three services, when
they are open, and a contact form. It is the shape of site most people are
actually asked to build first.

**Everything about the business is invented.** Kestrel Lane Cycle Works does not
exist. The address (12 Kestrel Lane, Riverbend), the phone number
((555) 010-0142) and the email address (hello@kestrel-lane.example) are all made
up for teaching. The email uses the `.example` domain, which is reserved by the
internet's standards bodies so that nobody can ever own it. Never put a real
business's details on a practice site without asking that business first, and
never publish a page that looks like a real shop's real page.

No internet connection, account, install, or build step. Plain HTML, CSS, and
JavaScript, opened by double-clicking a file.

## What you are getting

```
web-business/
  index.html          the whole site: hero, services, hours, contact form
  style.css           every visual rule, including the error and preview styles
  script.js           the services list, the form checking, and the preview
  images/logo.svg     one small original mark, drawn for this pack
  reference/          a finished version of one challenge, to compare against
  challenges.md       eight extensions, easy to hard
  troubleshooting.md  what to check when something breaks
  credits.txt         who made this and what you may do with it
```

The contact form is the real lesson here. It checks what you typed, tells you
plainly what is wrong, and then shows you a **preview** of your message. It never
claims to have sent anything, because it cannot. Read
"What a real contact form needs" below — that section is the point of this pack.

## Before you start

1. Install **VS Code** if it is not on the computer already. It is free.
2. Open the **folder**, not one file: `File > Open Folder`, then choose
   `web-business`.
3. Optional: the **Live Preview** extension (by Microsoft) reloads the page when
   you save. Nothing here needs it.

## Open and run it

1. Double-click `index.html`. It opens in your browser.
2. Check that you see the logo, the heading, three service cards, the opening
   hours, and the contact form.
3. Click **Ask about a repair** at the top. The page should jump down to the
   contact form.
4. Press the **Check and preview my message** button with every field empty. You
   should get a red message under each field, a summary line saying four fields
   need fixing, and the cursor should jump into the Name box by itself.
5. Fill the form in properly and press the button again. The red messages
   disappear and a dashed box appears showing your message back to you, with the
   heading "Preview — not sent to anyone".
6. Refresh the page. Everything is gone. That is honest: nothing was stored
   anywhere.
7. Press **Tab** from the top of the page and fill the whole form in without
   touching the mouse. Every field must show an outline as you reach it, and the
   labels must make sense in the order you meet them.

## Read before you change

**`index.html` is the page's content and structure**, in the order a customer
needs it: what the business does, then what it costs, then when to come, then how
to get in touch. Each `<section>` has an id (`services`, `visit`, `contact`) so
links inside the page can point at it. The form uses real `<label for="...">`
elements tied to each input's id — click the words "Your name" and the cursor
lands in the box, which is the quickest test that a label is real.

**`script.js` holds the services and the form rules.** At the top is a `services`
array, then a `validationRules` array with one entry per field: the field's id,
its name in plain words, and a `check` function that returns an error message or
an empty string. Below that are small functions — `renderServices` draws the
cards, `findProblems` checks every field, `showFieldError` sets the message and
`aria-invalid`, `showPreview` builds the preview, `handleSubmit` decides between
the two. `init()` at the bottom is the only line that runs by itself.

**`style.css` styles the page, including two states worth studying.** The
`[aria-invalid="true"]` rule draws the red border, which means the border can
never disagree with the attribute a screen reader is reading. The `.preview` rule
gives the preview a dashed border on purpose: it must look like a draft on a
desk, never like a receipt or a confirmation.

## Your guided changes

### 1. Make it your own invented business

**Do:** Invent a different small business — a repair café, a dog-walking round, a
print shop. In `index.html`, change the `<title>`, the wordmark, the `<h1>`, and
the hero paragraph. Change the address block and hours to your invented ones,
keeping an obviously fake phone number and an email ending in `.example`. Then
in `script.js`, rewrite the three `services` entries with real names, prices, and
one-sentence descriptions. Save and refresh.

**Check:** Nothing anywhere still says "Kestrel Lane". Your three service cards
show your names and prices. The footer still says the business is fictional —
keep that line true, and update it to name your invented business.

**If it breaks:** An empty services area means a syntax mistake in the array:
usually a missing comma between two objects, or an apostrophe inside a
double-quoted string that ended it early (`"Sam's bikes"` is fine;
`'Sam's bikes'` is not). Open the Console (F12) and read the first red line.

### 2. Write one clear primary action

**Do:** Decide the single thing you most want a visitor to do. Rewrite the hero
button's text to say it in two to four words — "Book a safety check", "Get a
quote" — and make its `href` point at the id of the section that actually does
that job. Save and refresh.

**Check:** Click it. You must land on the section that matches the words. If the
button says "Book" but lands on the opening hours, either the words or the target
is wrong. Say the button text out loud with the word "I want to" in front of it;
if that sentence sounds odd, rewrite it.

**If it breaks:** If clicking does nothing, the `href="#something"` does not match
any `id="something"` on the page. The `#` belongs in the link only, never in the
id. Capitals must match exactly.

### 3. Break the form on purpose, then fix it

**Do:** Fill in every field except the email address, and press the button. Then
type `notanemail` into the email field and press it again. Then fix it properly
and press it once more. Read the preview.

**Check:** First attempt — a red message appears under the email field, the
summary line names Email address, and the cursor jumps there. Second attempt — a
different message about a missing `@` or dot. Third attempt — the red messages
clear and the dashed preview appears, showing exactly what you typed, under the
heading "Preview — not sent to anyone". Read the small print inside the preview
and make sure you believe it.

Now think about what just happened: the page checked your message and showed it
to you. That is all. Nobody at the business knows you exist.

**If it breaks:** If the page reloads and empties itself when you press the
button, `event.preventDefault()` has been removed from `handleSubmit` — without
it the browser tries to submit the form the old way and throws your typing away.
If an error message never appears, check that the `<p class="error">` id matches
what the JavaScript looks for: field `id="email"` needs `id="email-error"`.

### 4. Write your own deployment note

**Do:** Read "What a real contact form needs" below, then add a section at the
bottom of this README titled "What my form would need to really work". In your
own words, answer all five in one or two sentences each: where would the message
go, how would you keep spam out, where would it be stored, what would the visitor
see when it worked and when it failed, and what would you do with somebody's
personal data.

**Check:** Give it to somebody who has not read this pack. They should be able to
say what you would need to buy, sign up for, or build. If your answer is "put it
online", it is not finished yet.

**If it breaks:** If you cannot answer one of the five, that is not a writing
problem, it is a gap in what you know — go back and read that part again. Writing
the note is how you find the gap.

## What this pack cannot do

- **It cannot send your message anywhere.** Not to an inbox, not to a phone, not
  to a spreadsheet. The preview is the whole of it.
- **It cannot store anything.** Refresh and every word is gone. There is no
  database.
- **It cannot take a payment or a booking.** Money needs a payment provider and
  server-side checks, always. Never write a page that looks like it took a
  payment.
- **It cannot tell you whether an email address is real.** No pattern can. Only
  sending a message to it and getting a reply proves that.
- **Nobody else can see it until you publish it.** Opening a file shows it to you
  alone. GitHub Pages is the usual free way to put it online.
- **It is not a real business.** Do not publish it in a way that could make
  somebody believe it is, and never copy a real shop's name, logo, or details.

## What a real contact form needs

This is the part worth understanding properly, because "add a contact form" is
one of the most common things anybody is ever asked to build, and almost every
part of it is invisible.

**1. Somewhere for the message to go.** Your page can collect text; it cannot
deliver it. Something has to receive it — a form service you sign up for, or a
small server endpoint you write and run. The browser sends the message to that
address; that thing decides what to do with it. Sending email directly from the
page is impossible, and any code that claims to do it is really talking to a
server somewhere. (A `mailto:` link is the one honest exception, and it is not
the same thing: it opens the visitor's own mail app and asks *them* to press
send. Many people have no mail app set up, so it often just fails silently.)

**2. Something to stop spam.** A form that anybody on the internet can post to
will be found by automated bots, usually within days, and filled with junk and
scam links. Real protection lives on the receiving side, not in the page: rate
limits, a challenge, a hidden field that only a bot would fill in, checks on what
was submitted. Anything you do in JavaScript alone can be skipped entirely,
because a bot does not have to use your page at all.

**3. Somewhere the message is kept.** An email that everyone deletes is not a
record. Real businesses need to know what was asked, when, whether anybody
replied, and whether the matter is finished. That means a database, a shared
inbox with an agreed process, or a ticketing tool — plus a decision about how
long it is all kept.

**4. A confirmation state and a failure state, both tested.** The happy path is
the easy half. What does the visitor see while it is sending? What do they see
when it worked — and is that message true, or does it appear before the server
has confirmed anything? What do they see when the network drops, or the service
is down, or the message is rejected? A form that silently fails is worse than no
form: the customer believes they have been in touch and waits for a reply that is
never coming. Test the failure path deliberately, by turning the network off
before pressing the button.

**5. Care with somebody else's personal data.** A name, an email address, a phone
number and a description of where somebody keeps their bicycle are personal
information, and you are responsible for it the moment you collect it. Ask for
the least you need — every extra field is another thing to protect. Say plainly
what you will use it for. Do not email it around or paste it into chats. Use
`https`, so it is not readable in transit. Know how you would delete it if the
person asked, because in many places they have the right to ask. If you would not
want your own details handled the way you are handling theirs, change it.

Notice that four of those five live somewhere other than the page you just
edited. That is the honest shape of web work: the visible part is real and it
matters, and it is a smaller share of the job than it looks.

## Where to go next

- Work through `challenges.md` in order.
- Try challenge 4, then compare with `reference/index.html`.
- Ask somebody to use the form without any explanation from you. Watch where they
  hesitate. Do not defend the design; write down what they did.
- When you are ready for a form that really receives messages, that is a server
  project, not an HTML one — and now you know the five things it has to handle.
