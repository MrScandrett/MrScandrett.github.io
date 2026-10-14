# Legacy Guitar Pro reader license review

Reviewed 2026-10-13. TuxGuitar's GP1/GP2 readers are covered by the
GNU Lesser General Public License version 2.1. Its README credits:

Copyright (C) 2005–2022 Julián Casadesús; 2023–2025 guiv42, helge17.

Pinned upstream revision: `54e948bbbaae4c1e49a9d6c5a25314d5bea96752`.
Repository: https://github.com/helge17/tuxguitar
License: https://github.com/helge17/tuxguitar/blob/54e948bbbaae4c1e49a9d6c5a25314d5bea96752/docs/LICENSE

The original Java readers/helpers and upstream README are included here.
The modified, preferred JavaScript source is `assets/js/lessons/fake-book-gtp.js`.
It remains under LGPL 2.1 and is shipped separately, without minification,
so users can replace it. Modifications dated 2026-10-13 replace Java song models
with a bounded byte reader and MusicXML converter for the existing Fake Book
engine. No TuxGuitar fonts, soundfonts, synthesizers or third-party binaries are used.

LGPL sections 1–2 permit redistribution and modification with notices and source;
section 6 permits combining the library with an application subject to its terms.
Users may modify this application for their own use and reverse engineer it to
debug modifications to this library. No restriction on those rights is imposed.
The browser receives the complete application JavaScript and library source.
Preserve the separate replaceable library, notices, and source in future builds.

This review covers software licensing, not copyright permissions for imported
music. This library supports GP1 v1/1.01/1.02/1.03/1.04 and GP2 v2.20/2.21;
newer Guitar Pro versions must be exported as MusicXML.
