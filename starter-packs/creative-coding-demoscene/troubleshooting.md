# Creative coding troubleshooting

## Blank canvas

Open developer tools and read the first Console error. Confirm `sketch.js` is
beside `index.html` and that the canvas id is still `art`.

## Animation is too fast or hardware-dependent

Use elapsed seconds (`dt` and `elapsed`) instead of adding a fixed distance each frame.

## Flow Field turns into static

Noise coordinates are probably changing too quickly. Reduce the `scale` used
when sampling `valueNoise`.

## Exported image is empty

Export after the scene has drawn at least one frame. Avoid loading images from
other websites without correct cross-origin permission because they can make a
canvas unreadable for export.

## The control panel covers the art

Fullscreen presentation mode can hide `.controls` with CSS. Keep controls visible
while developing so viewers can understand what is adjustable.
