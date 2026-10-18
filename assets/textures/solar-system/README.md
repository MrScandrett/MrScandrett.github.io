# Solar-system textures

Surface maps for the live viewer on the Solar Voyage stops
(`assets/js/lessons/solar-voyage-view.js`). All maps are equirectangular, 0° longitude in
the centre, north up. `-1k` (1024×512) loads first; `-2k` (2048×1024) replaces it once the
globe fills a large part of the screen. Sizes are powers of two so WebGL 1 can mipmap them.

| File | Source | License |
| --- | --- | --- |
| `mercury-*`, `venus-1k` (cloud tops), `mars-*`, `jupiter-*`, `saturn-*`, `uranus-1k`, `neptune-1k`, `moon-512`, `earth-clouds-*`, `saturn-rings.png` | [Solar System Scope](https://www.solarsystemscope.com/textures/), based on NASA mission data | CC BY 4.0 |
| `earth-day-*` | NASA Blue Marble (via `assets/textures/earth/blue-marble.jpg`) | Public domain |
| `earth-night-*` | NASA Black Marble (via `assets/textures/earth/black-marble.jpg`) | Public domain |
| `milky-way-1k.webp` | ESO / S. Brunier, GigaGalaxy Zoom all-sky panorama (galactic coordinates) | CC BY 4.0 |

`saturn-rings.png` is one radial row of Solar System Scope's ring map (alpha = opacity),
spanning 1.171–2.331 Saturn radii (C ring to A ring, Cassini Division at ≈1.95).

The viewer prints these credits under the view on every stop. To rebuild a map, resize the
source with Lanczos to the sizes above and save as WebP (quality ≈ 78–82).
