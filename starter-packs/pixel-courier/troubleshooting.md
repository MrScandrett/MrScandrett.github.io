# Troubleshooting

**Blank canvas.** Open the browser console (F12). An error in `art.js` usually means the
file was cut off: download it again. `art.js` must load before `game.js` in `index.html`.

**Keys do nothing.** Click the game first so it has keyboard focus.

**Blurry pixels.** Check `ctx.imageSmoothingEnabled = false` in `game.js` and
`image-rendering: pixelated` in `style.css`.

**I fall through the floor.** Make sure the floor letters exist in `ART.tiles` and have
`solid: true`. Very high speeds need the sub-step loop in `update()`.

**The courier looks like the starter character.** You are still using the starter
`art.js`. Replace it with the one you downloaded and refresh (Ctrl+Shift+R).

**The level won't finish.** The mailbox only opens once every `P` parcel is collected.
Check that every parcel is reachable with your jump height.
