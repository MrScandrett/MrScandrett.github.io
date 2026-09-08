# Applications resource maintenance

The launcher defaults to free browser activities with explicit no-account access metadata. The full catalog remains available through All resources. Do not infer usable access from a `free` boolean or the words “no login” in legacy copy.

- `assets/js/app-registry.js` exports the complete normalized catalog.
- `assets/js/app-learning-resources.js` contains additions, reviewed workflow corrections, save instructions, source links, review dates, and short project paths.
- `downloads/launchpad/` contains original, reusable planning sheets, a blank experiment CSV, and a pixel drawing grid. These are starters, not finished example projects.

Access values: `no-account`, `classroom`, `installed`, `account`, `check`. Price is a separate `cost` label. `no-account` requires a free browser activity, source, review date, and a usable saving/returning explanation (or note-taking instructions for explorations). Unknown access stays `check`; it is not silently labeled account-required. Teacher-managed access does not mean students may independently register for accounts.

Review date records a source review, not a guarantee of availability on a school network. Before promoting another tool, open a fresh signed-out session, try its core activity, save or export work, and reopen it. Record restrictions such as ads, account-only downloads, paid exports, installation, and limited persistence. Keep source links alongside these notes. Match the actual activity's grade band.

September 8, 2026 update: removed Glitch and its related-tool references after its hosting shutdown (https://blog.glitch.com/post/changes-are-coming-to-glitch). Corrected Steam/lab labels, Freesound download access, Scratch's local saving, and ScratchJr's installation requirement. Added 17 entries, including three existing ClassroomOS resources. The catalog has 230 resources, 34 curated no-account workflows, and five paths. Remaining legacy access is explicitly provisional where not reviewed.

Checkmarks measure student-reported start/create/save/return steps locally. There is no server-side progress collection, student identifier, or cross-device syncing. They never substitute for saving a project. The clear control supports shared devices.

Validation:

```
npm run check:applications
node serve-local.js
npm run check:applications:browser
npm run a11y:page -- applications.html
npm run check:themes
npm run check:integrity
```

For a browser outside Playwright's default cache, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for the browser check and `PUPPETEER_EXECUTABLE_PATH` for accessibility. Browser checks use a temporary profile, test local interactions and starter downloads, and write screenshots under `/tmp`. They do not certify third-party websites. Fresh signed-out BeepBox and Twine entry points were also spot-checked during this update; the fraction app's text-only browser output did not provide sufficient interaction evidence.

The configured Pa11y audit ignores color-contrast findings; the theme token check is separate. The NASA portrait is served from a `.webp` URL but is actually JPEG data, so it is stored as `assets/images/lessons/roman-space-telescope/nancy-roman.jpg` to match its real format and keep the integrity check green.
