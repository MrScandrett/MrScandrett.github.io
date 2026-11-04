# alphaTab Guitar Pro reader

alphaTab 1.8.4, Copyright 2026 Daniel Kuschny and Contributors.
Distributed under the Mozilla Public License 2.0; see LICENSE.txt.

The unmodified upstream source, including its license and integrated-library
notices, is available at https://github.com/CoderLine/alphaTab/tree/v1.8.4
(TypeScript source in `packages/alphatab/src/`).

This bundle is built from the pinned npm package @coderline/alphatab 1.8.4.
Rebuild with `npm ci` followed by `npm run build:guitar-pro-reader`.
The local entry point is `scripts/guitar-pro-reader-entry.mjs`; the separate
Fake Book adapter is `assets/js/lessons/fake-book-guitar-pro.js`.
No upstream source files have been modified.

The bundle retains upstream copyright and integrated-library notices.
The decoder is used for the simplified lead sheet. Original-score playback also
uses the unmodified full renderer, core, worker and worklet modules, Bravura font
(SIL Open Font License; see font/Bravura-OFL.txt), and Sonivox soundfont
(Apache 2.0; see soundfont/LICENSE). The renderer/synthesizer integration is
assets/js/lessons/fake-book-gp-player.js. All resources are served locally.
