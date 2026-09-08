"use strict";

// ==========================================================================
// NEBULA SUPPLY CO. — PRACTICE STOREFRONT
// Read README-FIRST.md before changing this file.
//
// The one big idea in this pack:
//   THE DATA IS THE TRUTH. THE PAGE IS ONLY A PICTURE OF THE DATA.
// Every price, every quantity and the total are calculated from the arrays
// below. Nothing in this file ever reads a number back off the screen.
// ==========================================================================

// --------------------------------------------------------------------------
// 1. THE DATA
// --------------------------------------------------------------------------

// WHAT: Every product in the shop. These are invented items for a made-up shop.
// WHY: Prices are stored in WHOLE CENTS as integers, never as 12.99.
//      Computers store 0.1 + 0.2 as 0.30000000000000004, so adding decimal
//      prices slowly drifts wrong. Cents are whole numbers, and whole numbers
//      add up exactly. We only turn cents into "$12.99" at the last moment,
//      when we are about to show it to a person.
// TRY THIS: add a fourth product. Give it a new id nobody else is using.
const PRODUCTS = [
  {
    id: "orbit-notebook",
    name: "Orbit Field Notebook",
    priceCents: 899,          // $8.99
    tag: "paper",
    color: "#2f4a6d",
    blurb: "Dot-grid pages that lie flat, for sketching mechanisms and bad first ideas."
  },
  {
    id: "solder-practice",
    name: "Solder Practice Board",
    priceCents: 1250,         // $12.50
    tag: "electronics",
    color: "#3c3260",
    blurb: "Thirty throwaway joints so your first real circuit is not your first attempt."
  },
  {
    id: "filament-sample",
    name: "Filament Sample Spool",
    priceCents: 675,          // $6.75
    tag: "3d printing",
    color: "#1f4a44",
    blurb: "A short spool for test prints, so a failed benchy costs pennies."
  },
  {
    id: "caliper-basic",
    name: "Beginner Digital Caliper",
    priceCents: 2199,         // $21.99
    tag: "tools",
    color: "#5a3a2c",
    blurb: "Measures to a tenth of a millimetre. The tool that ends guessing."
  },
  {
    id: "sticker-pack",
    name: "Lab Sticker Sheet",
    priceCents: 350,          // $3.50
    tag: "extras",
    color: "#4b2f4e",
    blurb: "Twelve vinyl stickers of imaginary instruments. Fictional, like this shop."
  }
];

// WHAT: The cart. It holds ONLY an id and a quantity.
// WHY: If the cart also stored a copy of the price, the two copies could drift
//      apart. Instead we store the id and look the price up in PRODUCTS every
//      single time we need it. One source of truth.
// Example shape: [ { id: "sticker-pack", quantity: 2 } ]
let cart = [];

// WHAT: Handles to the parts of the page we change. Found once, reused forever.
const productList = document.querySelector("#product-list");
const cartList = document.querySelector("#cart-list");
const cartEmpty = document.querySelector("#cart-empty");
const cartTotalLabel = document.querySelector("#cart-total");
const cartStatus = document.querySelector("#cart-status");
const clearButton = document.querySelector("#clear-cart");

// --------------------------------------------------------------------------
// 2. MONEY
// --------------------------------------------------------------------------

// WHAT: Turns whole cents into a string a person can read.
// WHY: This is the ONLY place in the file that money becomes text. Doing the
//      conversion in one function means the shop can never disagree with itself.
function formatMoney(cents) {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  // padStart makes 5 into "05", so we never print "$8.5" instead of "$8.05".
  return "$" + dollars + "." + String(remainder).padStart(2, "0");
}

// WHAT: Adds up the whole cart, in cents.
// WHY: Notice that it walks the cart DATA. It does not read the numbers that
//      are already printed on the screen. Reading text off the page is how
//      carts end up charging the wrong amount.
function cartTotalCents() {
  let total = 0;
  for (const line of cart) {
    const product = findProduct(line.id);
    if (!product) continue;             // an id with no product is skipped, not guessed at
    total += product.priceCents * line.quantity;
  }
  return total;
}

// --------------------------------------------------------------------------
// 3. LOOKING THINGS UP
// --------------------------------------------------------------------------

// WHAT: Finds one product by its id, or returns undefined.
function findProduct(id) {
  return PRODUCTS.find((product) => product.id === id);
}

// WHAT: Finds the cart line for a product id, or returns undefined.
function findCartLine(id) {
  return cart.find((line) => line.id === id);
}

// --------------------------------------------------------------------------
// 4. CHANGING THE CART (these change data only, then ask for a redraw)
// --------------------------------------------------------------------------

// WHAT: Adds one of a product, or bumps the quantity if it is already there.
function addToCart(id) {
  const product = findProduct(id);
  if (!product) return;                 // ignore ids we do not sell

  const existing = findCartLine(id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: id, quantity: 1 });
  }
  announce(product.name + " added. Cart total is now " + formatMoney(cartTotalCents()) + ".");
  renderCart();
}

// WHAT: Adds `step` to a quantity. Pass -1 to go down, +1 to go up.
// WHY: Quantity may never go below 1. At 1, going down means "remove", which is
//      a different action with a different message, so we hand it off.
function changeQuantity(id, step) {
  const line = findCartLine(id);
  if (!line) return;

  const wanted = line.quantity + step;
  if (wanted < 1) {
    removeFromCart(id);
    return;
  }
  line.quantity = wanted;

  const product = findProduct(id);
  announce(product.name + " quantity is now " + line.quantity + ".");
  renderCart();
}

// WHAT: Takes a product out of the cart completely.
function removeFromCart(id) {
  const product = findProduct(id);
  cart = cart.filter((line) => line.id !== id);
  announce((product ? product.name : "Item") + " removed from the cart.");
  renderCart();
}

// WHAT: Empties the cart in one go.
function emptyCart() {
  if (cart.length === 0) {
    announce("The cart is already empty.");
    return;
  }
  cart = [];
  announce("Cart emptied.");
  renderCart();
}

// WHAT: Writes a short sentence into the live region.
// WHY: aria-live="polite" on that paragraph means a screen reader reads this
//      out without interrupting. Sighted users get the same message.
function announce(message) {
  cartStatus.textContent = message;
}

// --------------------------------------------------------------------------
// 5. DRAWING THE PAGE FROM THE DATA
// --------------------------------------------------------------------------

// WHAT: Builds one product card element.
function buildProductCard(product) {
  const item = document.createElement("li");
  item.className = "product-card";

  const swatch = document.createElement("div");
  swatch.className = "product-swatch";
  swatch.style.background = product.color;
  // aria-hidden because the block is decoration. It says nothing a reader needs.
  swatch.setAttribute("aria-hidden", "true");

  const tag = document.createElement("span");
  tag.className = "product-tag";
  tag.textContent = product.tag;

  const name = document.createElement("h3");
  name.textContent = product.name;

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatMoney(product.priceCents);

  const blurb = document.createElement("p");
  blurb.className = "product-blurb";
  blurb.textContent = product.blurb;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Add to cart";
  // WHAT: the id travels on the button in a data attribute.
  // WHY: when the click happens we need to know WHICH product. We read the id,
  //      then look the product up in PRODUCTS. We never read the price text.
  button.dataset.productId = product.id;
  button.dataset.action = "add";
  // The visible label just says "Add to cart". A screen reader user hearing ten
  // identical buttons needs more, so we give this button a fuller name.
  button.setAttribute("aria-label", "Add " + product.name + " to cart");

  item.append(swatch, tag, name, price, blurb, button);
  return item;
}

// WHAT: Draws every product card once, when the page loads.
function renderProducts() {
  productList.textContent = "";          // start from empty so we never double up
  for (const product of PRODUCTS) {
    productList.append(buildProductCard(product));
  }
}

// WHAT: Builds one row of the cart.
function buildCartRow(line) {
  const product = findProduct(line.id);
  const row = document.createElement("li");
  row.className = "cart-row";

  const name = document.createElement("span");
  name.className = "cart-name";
  name.textContent = product.name;

  const each = document.createElement("span");
  each.className = "cart-each";
  each.textContent = formatMoney(product.priceCents) + " each";

  const controls = document.createElement("div");
  controls.className = "qty-controls";

  const down = document.createElement("button");
  down.type = "button";
  down.textContent = "−";           // a real minus sign, not a hyphen
  down.dataset.productId = product.id;
  down.dataset.action = "decrease";
  down.setAttribute("aria-label", "Decrease quantity of " + product.name);

  const quantity = document.createElement("span");
  quantity.className = "qty-value";
  quantity.textContent = String(line.quantity);

  const up = document.createElement("button");
  up.type = "button";
  up.textContent = "+";
  up.dataset.productId = product.id;
  up.dataset.action = "increase";
  up.setAttribute("aria-label", "Increase quantity of " + product.name);

  controls.append(down, quantity, up);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-button";
  remove.textContent = "Remove";
  remove.dataset.productId = product.id;
  remove.dataset.action = "remove";
  remove.setAttribute("aria-label", "Remove " + product.name + " from cart");

  const lineTotal = document.createElement("span");
  lineTotal.className = "cart-line-total";
  // The line total is multiplied in cents, so it is exact.
  lineTotal.textContent = formatMoney(product.priceCents * line.quantity);

  row.append(name, each, controls, remove, lineTotal);
  return row;
}

// WHAT: Redraws the whole cart from the cart array.
// WHY: Rebuilding everything is simple and always correct. Trying to patch just
//      the row that changed is where beginner carts start showing stale numbers.
function renderCart() {
  cartList.textContent = "";

  for (const line of cart) {
    if (!findProduct(line.id)) continue;
    cartList.append(buildCartRow(line));
  }

  // The empty state is shown or hidden by the DATA, not by anything on screen.
  cartEmpty.hidden = cart.length > 0;

  cartTotalLabel.textContent = formatMoney(cartTotalCents());
}

// --------------------------------------------------------------------------
// 6. LISTENING FOR CLICKS
// --------------------------------------------------------------------------

// WHAT: One listener on the whole page instead of one per button.
// WHY: Cart buttons are created and destroyed constantly. A listener attached
//      to a button dies with that button. A listener on a container that never
//      goes away keeps working forever. This is called event delegation.
function handleClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;                   // the click was not on one of our buttons

  const id = button.dataset.productId;

  if (button.dataset.action === "add") addToCart(id);
  if (button.dataset.action === "increase") changeQuantity(id, 1);
  if (button.dataset.action === "decrease") changeQuantity(id, -1);
  if (button.dataset.action === "remove") removeFromCart(id);
}

// --------------------------------------------------------------------------
// 7. START
// --------------------------------------------------------------------------

// WHAT: Everything above is a definition. This is the only part that runs.
function init() {
  renderProducts();
  renderCart();
  announce("Practice shop ready. Nothing here can be purchased.");

  productList.addEventListener("click", handleClick);
  cartList.addEventListener("click", handleClick);
  clearButton.addEventListener("click", emptyCart);
}

init();
