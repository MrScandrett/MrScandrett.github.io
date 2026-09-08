# Web Business challenges

Eight extensions, easy to hard. Do one, run it, check it, then start the next.
You get the goal and the test, never the finished code.

**One rule that overrides every challenge below:** nothing you add may claim a
message was sent, a booking was made, or a payment was taken. This page cannot do
any of those. Wording that pretends otherwise is not a clever workaround, it is a
lie told to a customer.

## 1. Invent a different business

**Goal:** Replace the identity, the three services, the hours, and the invented
contact details with your own made-up business.

**How you know it worked:** No trace of "Kestrel Lane" is left, the footer still
says the business is fictional, and the contact details are still obviously
invented (a `(555)` number and an address ending `.example`).

## 2. Add a fourth service, and keep the form in step

**Goal:** A fourth entry in the `services` array, and a matching `<option>` in the
form's service dropdown.

**How you know it worked:** Four cards on the page, and the new service can be
chosen in the form and appears by name in the preview. Notice the trap: the cards
come from data and the options are written in the HTML, so they can drift apart.

## 3. Say how many characters are left

**Goal:** A live count under the message box — "12 of at least 10 characters" —
that updates while typing.

**How you know it worked:** The number changes as you type, and it is announced
politely rather than interrupting a screen reader on every single keystroke. Look
at the `aria-live` attribute already used on the status line, and think about why
"polite" matters more here than anywhere else on the page.

## 4. Check each field as the person leaves it

**Goal:** Leaving a field checks that one field, instead of waiting for the
button. Fixing a shown error clears it while typing.

**How you know it worked:** Tab out of an empty Name box and the message appears.
Type one letter and it stays; type a proper name and it clears. Crucially, a
field you have not reached yet is never marked wrong. Look up the `blur` event.

A finished version is in `reference/index.html`. Try it before you look.

## 5. Add a phone field with an honest rule

**Goal:** An optional phone number field that is checked only when something has
been typed in it.

**How you know it worked:** Submitting with it empty is fine. Typing `abc` is
refused. Now the harder half: write the rule so it accepts the ways people really
write phone numbers — spaces, brackets, dashes, a country code. Then write one
sentence in your README explaining why you cannot prove a number is real.

## 6. Add a "Copy my message" button to the preview

**Goal:** A button in the preview that puts the whole message on the clipboard so
the visitor can paste it into their own email.

**How you know it worked:** Press it, paste into a text editor, and the whole
message arrives. Then check the wording: the button must make clear the visitor
is sending it themselves. Also try it after opening the page from a file rather
than a server — the clipboard API is restricted in some situations, so your
button needs to handle the case where it is not allowed, and say so.

## 7. Show what "sending" and "failed" would look like

**Goal:** Fake the two states honestly. A checkbox or a test button labelled
something like "Pretend the network failed", so you can see the sending state and
then either a success or a failure message.

**How you know it worked:** Both states are reachable and both are clearly
labelled as a simulation on the page itself. This is the one challenge where you
build the pretend version on purpose — the point is to design the failure message
before you ever need it, because that is the state nobody remembers to design.

## 8. Make it work well on a phone, and print well on paper

**Goal:** Test at 375px wide and fix everything that squashes, spills, or
scrolls sideways. Then add a `@media print` block so printing gives a clean
sheet: services, hours, and address, with no form and no navigation.

**How you know it worked:** At 375px nothing scrolls sideways and every label sits
above its field. In Print Preview, the result looks like a leaflet somebody could
pin up, not a screenshot of a website.

## Evidence checklist

- Nothing on the page claims a message was sent, ever.
- The business is clearly invented, and says so.
- Every field has a real `<label for>`, and clicking the label focuses the field.
- Submitting an incomplete form gives a written message per field and moves the
  cursor to the first one.
- The whole form can be completed with the keyboard alone, with a visible focus
  outline throughout.
- The page is readable and does not scroll sideways at 375px wide.
- No red errors in the Console.
- I can explain the five things a real contact form would need.
