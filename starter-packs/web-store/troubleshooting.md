# Web store troubleshooting

Work down this list. Almost every problem in this pack is one of these eight.

Before anything else: press <kbd>F12</kbd> and click **Console**. Read the *first*
red error, not the last. Later errors are usually just fallout from the first.

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Page is plain black-and-white text, no cards | The browser did not find `style.css` | Is `style.css` in the same folder as `index.html`? Is it spelled exactly `style.css` — lower case, no `Style.css`, no `style.css.txt`? Windows hides known extensions, so a file that looks like `style.css` may really be `style.css.txt`. |
| Products section is empty, cart never appears | `script.js` did not run, or crashed on its first line | Console will say `Failed to load resource` (wrong filename or folder) or name a syntax error and a line number. Check the `<script src="script.js" defer>` line at the bottom of `index.html`. |
| `Cannot read properties of null (reading 'append')` | `querySelector` found nothing, so a variable is `null` | The id in `script.js` and the id in `index.html` disagree. `#product-list` and `id="productList"` are different strings. Compare them character by character; capitals count. |
| Everything worked, then you moved `<script>` into `<head>` and it broke | The script ran before the elements existed | Either put the `<script>` tag back at the end of `<body>`, or keep the `defer` attribute. `defer` means "run after the HTML is parsed". Without it, `document.querySelector("#cart-list")` finds nothing. |
| A blank white page after editing `PRODUCTS` | A missing comma between two objects, or an unclosed `{`, `[` or quote | The console names a line. Look at that line *and the one above it* — a missing comma is reported on the line after the mistake. In VS Code, click a bracket and its partner highlights. |
| Cart total is wrong by a cent or two | Prices were changed to decimals like `12.99` | `priceCents` must be a whole number of cents: `1299`. Decimal prices add up inexactly (`0.1 + 0.2` is `0.30000000000000004`). Search your file for a `.` inside a `priceCents` value. |
| Total shows `$8.5` or `$NaN` | `formatMoney` got something that is not a whole number of cents | `$8.5` means the padding was removed — cents must be padded to two digits. `$NaN` means a price is a string like `"899"` instead of the number `899`, or a product id in the cart has no matching product. |
| Clicking **Add to cart** does nothing | The click listener is not attached, or the button has no `data-action` | Only buttons matching `button[data-action]` are handled. If you built a card by hand in HTML, it will have no `data-action` and no `data-product-id`, so the handler ignores it. Add cards through `PRODUCTS`, not by typing HTML. |
| Buttons work, but the wrong product is added | Two products share an `id` | Ids must be unique. `findProduct()` returns the first match, so a duplicated id makes the second product unreachable. Search the file for the id you copied. |
| Empty state shows even though items are in the cart | `renderCart()` is not being called, or the `hidden` logic is inverted | The line is `cartEmpty.hidden = cart.length > 0;` — hidden when there IS something. Also confirm every function that changes `cart` ends by calling `renderCart()`. |
| Edits do not appear no matter what you do | Browser cache, or you edited a different copy of the file | Hard-refresh: <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> on a Mac). Then check the browser's address bar and make sure that path is the folder you have open in VS Code. Downloads folders often hold two copies. |
| Focus outline vanished after restyling | A CSS rule set `outline: none` | Find it and delete it. The `:focus-visible` rule near the middle of `style.css` is what lets a keyboard user see where they are. Removing it makes the shop unusable for some people. |
| Screen reader says nothing when the cart changes | The live region was renamed or removed | `<p id="cart-status" aria-live="polite">` must stay, and `announce()` must keep writing into it. An empty `aria-live` region that never changes announces nothing. |
