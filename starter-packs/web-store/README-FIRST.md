# Web Store Starter: Nebula Supply Co.

## What you are getting

A working practice storefront that runs in a browser with no internet, no
account, and no installing anything. It has a product list, a cart you can add
to, quantity up and down buttons, a remove button, a running total, and a real
empty state.

Everything in it is fictional. Nebula Supply Co. is not a company, the products
do not exist, and **the page cannot take money from anybody**. There is no
checkout button, on purpose. A button that pretends to buy something is a lie,
and this pack does not tell it.

Files:

- `index.html` — the structure of the page: header, nav, product section, cart section, footer.
- `style.css` — how it looks: colours, spacing, the grid of product cards, the focus outline.
- `script.js` — how it works: the product data, the cart data, and the code that draws both.
- `reference/index.html` — a finished version of guided change 4, to compare against **after** you try it.
- `challenges.md` — six extensions, easy to hard.
- `troubleshooting.md` — what to check when something breaks.
- `credits.txt` — who made this and what you must add if you add media.

## Before you start

1. Install [VS Code](https://code.visualstudio.com/) if it is not already on the machine.
2. In VS Code choose **File → Open Folder**, and pick the `web-store` folder
   itself — the folder, not one file inside it. If you open only `index.html`,
   VS Code cannot see `style.css` and `script.js`, and you will spend twenty
   minutes confused.
3. Optional: install the **Live Preview** extension from Microsoft. It refreshes
   the page for you every time you save. You do not need it; this pack works by
   double-clicking `index.html`.

## Open and run it

1. Find `index.html` in your file manager and double-click it. Your browser opens.
2. You should see five products with prices, and a cart that says **Your cart is empty**.
3. Click **Add to cart** on the Lab Sticker Sheet. The cart now shows one row and
   the running total reads `$3.50`.
4. Click **+** twice. The quantity reads `3` and the total reads `$10.50`.
5. Click **−** once. The quantity reads `2` and the total reads `$7.00`.
6. Click **Remove**. The empty state comes back.
7. Press <kbd>Tab</kbd> repeatedly. Every button you land on should show a bright
   outline. If a button is invisible when focused, that is a bug worth fixing.

If step 2 shows plain unstyled text, the browser did not find `style.css`. Go to
`troubleshooting.md`.

## Read before you change

**`index.html` holds the shape, not the shop.** Look at the product list:
`<ul id="product-list" class="product-grid"></ul>` is empty. That is deliberate.
Nothing about the products is written into the HTML, because the products live
in `script.js`. If they were in both places, one copy would eventually be wrong,
and you would not know which one to trust.

**`script.js` is arranged to be read from top to bottom.** Data first (the
`PRODUCTS` array and the `cart` array), then money functions, then lookups, then
the functions that change the cart, then the functions that draw the page, then
one click handler, then `init()` at the very bottom. Everything above `init()`
is a definition; `init()` is the only line that actually starts the shop.

**The rule the whole pack teaches: the data is the truth, the page is a picture
of it.** When you click **+**, the code does not read the `2` printed on screen
and add one to it. It finds the cart line in the `cart` array, changes the number
there, and then redraws. Numbers on a screen are text; a person can edit text
with their browser's developer tools in about four seconds. Numbers in your data
are the only ones worth trusting, and even those are only trusted in a real shop
after a server checks them again.

### Why money is stored in whole cents

Open your browser console and type `0.1 + 0.2`. It answers
`0.30000000000000004`.

That is not a bug in the browser. Computers store decimal numbers in binary, and
just as you cannot write one third exactly as `0.333…` in decimal, a computer
cannot write `0.1` exactly in binary. Every price you add drags in a tiny error.
On one item nobody notices. On a cart of forty items, the total ends up a cent
off, and a cent off is the difference between a shop that balances and a shop
that does not.

So this pack never stores `12.99`. It stores `1299` — the price in whole cents,
an integer. Integers add up exactly. The only place a number becomes dollars is
`formatMoney()`, at the last possible moment, when the number is about to be
shown to a human. Look at it: it divides by 100, takes the remainder, and pads
the cents to two digits so `$8.05` never prints as `$8.5`.

## Your guided changes

Do these in order. Each one is small, and each one has something you can look at
to know it worked.

### 1. Add a sixth product

**Do:** In `script.js`, find the `PRODUCTS` array. Copy one whole product object
(from `{` to `}`), paste it after the last one, add a comma between them, then
change the `id` to something no other product uses, and change the `name`,
`priceCents`, `tag`, `color` and `blurb`. Remember `priceCents` is cents:
`1495` means $14.95.

**Check:** Refresh. A sixth card appears with your name and price. Add it to the
cart and confirm the total goes up by exactly your price.

**If it breaks:** A blank page almost always means a missing comma between two
objects, or a missing `}`. Open the browser console (F12 → Console) and read the
first red line — it names the line number.

### 2. Change the empty-state message

**Do:** In `index.html`, find the `<div id="cart-empty">`. Change the heading and
the paragraph so they tell a first-time visitor exactly what to do next in your
own words.

**Check:** Load the page without adding anything. Your new words appear. Add one
item and the block disappears. Remove that item and it comes back.

**If it breaks:** If the block never disappears, check that you did not delete
`id="cart-empty"`. `renderCart()` finds that block by its id, and a renamed id is
an invisible break.

### 3. Show the number of items in the cart

**Do:** Write a new function in `script.js` called `cartItemCount()` that walks
the `cart` array and adds up every `quantity`. Then, at the end of `renderCart()`,
put that count somewhere the visitor can see — the simplest way is to add a span
next to the total in `index.html`, give it an id, and set its `textContent`.

**Check:** Add three of one product and two of another. Your count reads `5`,
not `2`. If it reads `2`, you counted rows instead of adding quantities.

**If it breaks:** `Cannot set properties of null` means the id in your
`querySelector` does not match the id in the HTML. Compare them character by
character — capital letters count.

### 4. Add a quantity limit of 10 per product

**Do:** In `changeQuantity()`, stop the quantity from going above 10. When
someone tries, do not silently ignore them — call `announce()` with a sentence
that says what happened and why.

**Check:** Click **+** eleven times. The quantity stops at 10 and your message
appears in the status line above the cart. Confirm the total stops rising too.

**If it breaks:** If the total keeps climbing past 10 items' worth, you limited
the display but not the data. The limit belongs where the number is stored, not
where it is drawn. This is guided change 4, and `reference/index.html` shows a
finished version of it.

## What this pack cannot do

This is a classroom prototype. It is not a shop, and it must never be presented
as one.

**It cannot take payment.** A page made of HTML, CSS and JavaScript has no way to
move money. A real store hands that job to a **payment provider** — Stripe,
Square, PayPal, Shopify and so on — because handling card numbers yourself means
meeting a security standard called PCI DSS, and getting that wrong hurts real
people. In practice the customer never types a card number into your page at
all: the provider supplies a hosted field or a redirect, so the card details go
straight to them and never touch your code.

**It cannot be trusted about prices.** This is the part students find surprising,
so read it twice. Everything in `script.js` runs on the *customer's* computer.
Any visitor can open developer tools, change `priceCents: 2199` to
`priceCents: 1`, and the page will happily show a total of one cent. That is not
a hole in this pack — every browser store in the world works that way. Real
stores survive it by treating the browser as a suggestion box: the page sends
the *product ids and quantities* to a **server**, and the server looks the prices
up again in its own database, recalculates the total from scratch, and charges
that. The rule is **never trust anything the browser tells you about money.** The
same goes for stock levels, discount codes and shipping costs.

**It cannot remember anything.** Refresh the page and the cart is gone. There is
no database and no account. A real store keeps **order records** — what was
bought, at what price, when, by whom, where it shipped, and whether it was
refunded — because customers ask, and because you cannot run a business from
memory. Storing those records means storing personal data, which brings its own
duties: keep only what you need, protect it, and be able to delete it when asked.

**It has no accounts.** No login, no order history, no "my addresses". Those need
a server, password hashing (never store a password as plain text), sessions, and
a way to reset a forgotten password safely.

**It has no legal or tax machinery.** A real shop needs a business registration,
sales tax or VAT calculated for the buyer's location and remitted to the right
authority, a returns and refunds policy, terms of sale, a privacy policy, and
rules about what you may sell and to whom. In many places a minor cannot enter
into these contracts alone. None of that is programming, and all of it is
required.

**It cannot send email.** No order confirmation, no receipt, no "your parcel has
shipped". Email needs a server or a configured mail service.

Summary: this pack teaches the *interface* of a store — data, state, rendering,
money arithmetic, empty states. Everything that makes a store real lives on a
server you have not built yet.

## Where to go next

- Do the six extensions in `challenges.md`, in order. They get harder deliberately.
- Compare your guided change 4 against `reference/index.html`, but only after you
  have made your own attempt. Reading the answer first feels like learning and is not.
- Learn `localStorage` so a cart survives a refresh — that is real browser storage,
  still on one device only, and still not a server. It is the honest next step.
- Then learn how a server works at all: what a request is, what JSON is, and why
  the price check has to happen somewhere the customer cannot edit.
