# Website music player

`listen.html` owns one audio element and displays the website in a same-origin
iframe. Normal links navigate that frame, so the audio element survives page
changes. The browser's Back/Forward history stays native; the shell mirrors the
current page in its `browse` query parameter for reloads and bookmarks.

`theme-registry.js` loads `site-music.mjs`, which provides the Music launcher on
shared pages, forwards aquarium controls to the shell, and adds a “Keep listening
while exploring” button to composer players. Opening the player starts listening
mode; “Leave listening mode” returns to the current page and stops playback.
Starting a lesson's own recording pauses the background player.

The dock's collapse button switches between the compact player and a single-row
strip. The library arrow opens the full library from either size. The dock size
is remembered locally. The loop button cycles off → current recording → whole
library → off; a badge distinguishes the active mode. Looping one recording uses
the audio element's native loop, while looping the library wraps after its last track.

Dock and library share one dark palette. Each composer gets a monogram cover whose
hue (`--music-hue`, spread by the golden angle in library order) also tints the
accent: the play button, progress, and the current track. The library opens on a
Now Playing card (credit, source, loop state, mute + volume) above the recordings,
grouped by composer; pressing the current recording pauses or resumes it. Maximized
on a wide screen, the card and the shelf sit side by side and the shelf scrolls to
the current recording. Keep `backdrop-filter` on `.music-dock`, not `.site-player`:
on the wrapper it becomes the containing block for the maximized library's
`position: fixed` and collapses it into the dock.

The recording library is generated from the composer lessons' `option[data-src]`
metadata. Edit those lesson sources, then run `npm run build:recordings`.
`npm run build:dist` refreshes it automatically. Performer credits, recording
licenses, source links, and lesson links remain attached to each track. MP3
streams fall back to the original Commons file when a rendition fails.

Run `npm run check:recordings` to check catalog coverage. Run
`SITE_URL=http://127.0.0.1:8080 npm run check:site-music` against `node serve-local.js`
for browser coverage. The browser check uses WAV responses with byte ranges to
test playback, seeking, and navigation without depending on Wikimedia's uptime.
Check real streams separately. Preferences and position are saved locally;
a full reload can require another Play gesture under browser autoplay rules.
