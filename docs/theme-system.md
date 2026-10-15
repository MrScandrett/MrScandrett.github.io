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
