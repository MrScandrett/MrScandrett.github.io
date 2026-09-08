# Web Business troubleshooting

Open the browser developer tools before guessing: **F12**, or Ctrl+Shift+I
(Cmd+Option+I on a Mac), then the **Console** tab. Read the FIRST red line — it
names the file and the line number.

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Pressing the button reloads the page and empties every field | The default form submit was not stopped | `handleSubmit` must start with `event.preventDefault();`. Without it the browser tries to submit the form the old way and everything typed is lost. |
| The services area is empty | JavaScript stopped on an error before drawing | Console tab, first red line. Usually a missing comma between two objects in the `services` array, or an apostrophe that ended a single-quoted string early. |
| No error message ever appears under a field | The error paragraph's id does not match the pattern the code builds | The code looks for `"#" + rule.id + "-error"`. So `id="email"` needs a `<p class="error" id="email-error">`. One typo and the message has nowhere to appear. |
| `Uncaught TypeError: Cannot read properties of null` | A selector found nothing | Every `id` in `validationRules` must exist in the HTML, and `#contact-form`, `#form-status`, `#preview`, `#preview-body`, `#service-list` must all still be there with those exact ids. |
| The red border appears but no words do | Only the CSS state is being set | Colour alone is not a message, and people who cannot see it get nothing. `showFieldError` must set the error paragraph's `textContent` as well as `aria-invalid`. |
| The preview never appears, even with a valid form | Something is still failing validation quietly | Look for a field whose error line is hidden by `.error:empty` but is being filled with a space rather than an empty string. `check` must return exactly `""` when the value is fine. |
| The preview appears but stays empty | The old rows were not cleared, or the values were never added | `showPreview` starts with `previewBody.replaceChildren();` and then adds a row per field. Check the ids it reads from. |
| The preview shows rows from the previous attempt as well | The clear line was removed | Same fix: `previewBody.replaceChildren();` before adding anything. |
| Clicking a label does not focus its field | `for` and `id` do not match | `<label for="email">` needs `<input id="email">`. This is the fastest test that a label is real rather than just text sitting nearby. |
| Clicking "Ask about a repair" does nothing | The `href="#contact"` has no matching id | The section must still be `<section id="contact">`. The `#` goes in the link only, and capitals must match. |
| The logo shows a broken-image icon | Wrong path or wrong capitals | The file is `images/logo.svg`, all lower case. `Images/Logo.SVG` can work on your computer and fail once published. |
| Nothing changes after saving | The browser is showing a cached copy, or you edited a different copy | Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on a Mac). Then check the address bar path really is the folder you are editing. |
| The status line says the wrong thing after fixing an error | `formStatus.className` is being set but never reset | Every branch of `handleSubmit` must set both the text and the class, so a leftover `status-error` never sits under a success message. |
| Typing a `<` or a tag into the message shows it as plain text | Working as intended | The preview uses `textContent`, so anything typed is shown as words, never run as code. Never swap it for `innerHTML` — that is how a form becomes a way to attack your own page. |

## The one that is not a bug

**"It says preview, not sent. How do I make it actually send?"**

You cannot, from this page, and no change to `script.js` will fix that. A page
opened from a file has nothing to send with. See "What a real contact form needs"
in `README-FIRST.md` for the five things a working version requires. Do not
change the wording to say "Message sent" — a form that lies to a customer is a
worse bug than any in the table above.

## When you are truly stuck

1. Undo (Ctrl+Z) to the last version that worked and change one thing at a time.
2. Compare against `reference/index.html`, which is known to work.
3. Say the problem in one sentence, including what you have already ruled out.
