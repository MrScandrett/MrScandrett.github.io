# Shared themes

`assets/js/theme-registry.js` defines the 12 theme identities, picker samples,
quiet/expressive groups, and classroom presentation preference. Every shared
page loads it before `theme-lighting.js` or `nav-mobile.js`. The registry loads
`assets/css/components/theme-surfaces.css` relative to its own URL, including
on nested lesson pages.

The finish layer uses semantic text, surface, action, border, and focus tokens.
Textures stay in the page margins; shared reading frames use almost opaque
surfaces. Selection has an outline and the picker also has a checkmark. Keep
scientific diagrams, canvas rendering, and music notation colors local to their
own components. Clay and score-paper lessons retain their local palettes.

Use `data-lighting="night"` for shared dark styling rather than listing individual
dark theme IDs. The registry determines the tone, so Night, Bark, Vaporwave,
Mandelbrot, and Lava Lamp all receive the dark treatment. Theme-specific artwork
may still use `data-theme` selectors.

## Classroom presentation

Settings → Access → **Present to the class** increases the root text size by
12.5%, makes shared navigation and reading surfaces solid, and hides/pauses the
decorative page background. Educational simulations and audio controls remain
available. It persists under `classroomos-presentation` and syncs across tabs.
Turning it off restores the visitor's existing theme, background, reduced-motion,
and transparency preferences; those preferences are never overwritten.

Programmatic callers can use
`ClassroomOSThemeRegistry.setPresentation(true | false)` and
`ClassroomOSThemeRegistry.isPresentation()`. Changes emit
`classroomos:presentationchange` with `detail.enabled`.

Pages marked `data-theme-scope="independent"` do not receive this shared layer.
Printing restores the normal root font size.

## Verification

- `npm run check:themes`: token and glass contrast plus picker/CSS palette agreement.
- `npm run check:theme-experience`: with the local server running on port 8080,
  exercises all themes on the homepage, Cuneiform, Newton's Laws, and Fake Book
  at desktop and phone widths. Checks filters, focus, settings accessibility,
  presentation persistence/restoration, page errors, and horizontal overflow.
  Screenshots go to `/tmp/classroomos-theme-qa` by default.
- Override `THEME_QA_URL` or `THEME_QA_OUTPUT` for another server or artifact folder.

## Skin compatibility

Skins provide shape and material independently of theme and background. Terminal
uses square CRT frames, Blocky uses beveled inventory slots, Notebook uses
hand-drawn borders, and Underwater uses rounded reflective panes. Keep previews,
notation, media, and custom components out of surface styling with
`data-skin-keep` on the component container. This also excludes the container
itself, even if it was tagged before the opt-out was added.

Surface discovery batches overlapping subtrees and suspends observation in
Liquid Glass and independent pages. It resumes when a custom skin is selected;
resize and theme changes retry previously rejected elements. Reduced transparency
and classroom presentation suppress material blur; reduced motion stops the
Terminal cursor and Underwater control movement.

Run `npm run check:skin-experience` with the local server on port 8080 to exercise
all 12 themes × 5 skins × 9 backgrounds at desktop and phone widths. It also
checks settings accessibility, component opt-outs, discovery suspension/resumption,
reduced transparency, and real Cuneiform, Newton, and Fake Book controls.
Screenshots are saved to `/tmp/classroomos-skin-qa`; `THEME_QA_URL` and
`THEME_QA_OUTPUT` override the defaults.

Skin changes keep the previous stylesheet active until both replacement sheets
have loaded, then switch the skin attribute and styles together. Loaded sheets
are reused. A request version prevents late loads from overriding a newer pick.
`npm run check:skin-switching` verifies this frame by frame with deliberately
slow, out-of-order stylesheet responses and checks reload persistence.

## Runtime work

Unchanged theme synchronizations skip DOM writes and lighting-change events.
Skin surface discovery caches computed styles for each scan, including shared
ancestors, then drops the cache before applying surface tags. Background resize
work is coalesced into one animation frame; stopping animation also clears its
idle timer. Decorative canvases mount only when animation is allowed, while
motion-preference listeners remain available when the page starts with reduced
motion enabled.
