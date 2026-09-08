# Nebula Supply challenges

Six extensions, easy to hard. Do one, run the page, and write down what changed
before you start the next. None of these give you the code — they give you the
idea and a way to know you got there.

Keep the rule from the README in front of you the whole time: **change the data,
then redraw from the data.** If you find yourself reading a number off the
screen, stop and find where that number is stored instead.

## 1. Restyle the shop (easy)

**Goal:** Make the shop look like yours. Change the colour variables at the top
of `style.css`, the shop name in `index.html`, and the product swatch colours in
the `PRODUCTS` array.

**How to know it worked:** Nothing about the page still looks like the version
you downloaded, and every button still shows a clear outline when you Tab to it.
If the focus outline disappeared, you broke accessibility while decorating —
put it back.

## 2. Sort the products by price (easy)

**Goal:** Show the cheapest product first. Do it in `renderProducts()` without
reordering the `PRODUCTS` array itself.

**How to know it worked:** The Lab Sticker Sheet ($3.50) is the first card and
the caliper ($21.99) is the last. Add a new product priced in the middle and it
lands in the right place with no further edits.

**Hint, not a solution:** `[...PRODUCTS].sort(...)` makes a copy to sort, so the
original order is left alone. Think about why sorting the original might bite you
later.

## 3. Add a category filter (medium)

**Goal:** Add buttons that show only products with a chosen `tag`, plus an "All"
button. Every product already carries a tag.

**How to know it worked:** Clicking "tools" leaves one card on screen. Clicking
"All" brings them all back. Items already in the cart stay in the cart while you
filter — filtering changes what is *displayed*, never what is *stored*.

**Watch out:** Build the filter buttons from the tags found in the data, not by
typing the tag names into the HTML by hand. Then adding a product with a new tag
adds its button for free.

## 4. Show the saving from a bulk discount (medium)

**Goal:** When someone buys 3 or more of the same product, take 10% off that
line. Show the normal line total struck through and the discounted one beside it.

**How to know it worked:** Three sticker sheets cost $10.50 normally and show as
$9.45. The cart total matches the sum of the discounted lines.

**The hard part is the money.** 10% of 1050 cents is 105 cents exactly, but 10%
of 899 cents is 89.9 cents, and there is no such coin. Decide whether to round
up or down, do the rounding with `Math.round()` on *cents*, and write a comment
saying which way you chose and why. Every real shop has had to answer this.

## 5. Make the cart survive a refresh (medium-hard)

**Goal:** Use `localStorage` to save the cart when it changes and load it when
the page opens.

**How to know it worked:** Add three items, refresh the page, and they are still
there with the right total. Empty the cart, refresh, and it is still empty.

**Two traps.** First, `localStorage` only stores text, so you will need
`JSON.stringify` on the way out and `JSON.parse` on the way in. Second, the saved
data may be from an older version of your shop — if it contains an id you no
longer sell, your code must skip it instead of crashing. Test that on purpose:
save a cart, delete that product from `PRODUCTS`, and reload.

**Be honest about what you built.** This saves the cart on *one browser on one
computer*. It is not an account, and nobody else can see it.

## 6. Write the honest checkout page (hard)

**Goal:** Add a second page, `order-summary.html`, that shows the cart contents
and total as a printable order request — clearly labelled as a practice
exercise, with no payment fields of any kind. Then write, on that page, the list
of everything that would have to exist for it to be a real order.

**How to know it worked:** A reader who has never met you can look at the page
and say correctly whether money changed hands. If there is any doubt, the page
is not honest enough yet. Your list should name at least: a payment provider, a
server that recalculates the price, stored order records, an email confirmation,
and the tax and returns duties of a real business.

**Never add a field that asks for a card number, not even a fake one.** Practice
forms teach people to type card numbers into pages that ask for them, and that
is exactly the habit that gets people robbed.

## Evidence checklist

Before you call this finished:

- The cart total is always correct, including after add, increase, decrease, and remove.
- Every total is calculated in cents and formatted once, at the end.
- The empty state appears whenever the cart is empty and never when it is not.
- I can Tab to every control and see where I am.
- Nothing on the page implies a purchase happened.
- I can explain, out loud, why the price must be checked again on a server.
