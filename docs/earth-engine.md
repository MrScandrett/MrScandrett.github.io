# Shared Earth engine

Use `assets/js/earth-engine.js` for Earth geography, map projections, spherical
coordinates, surface textures, and dated continental reconstruction snapshots.
Do not invent continent polygons or land masks in individual lessons.

## Map or globe setup

Load these local scripts in order (adjust relative paths for the page):

```html
<script src="../../assets/vendor/d3-geo-runtime.min.js"></script>
<script src="../../assets/vendor/d3-geo-projection.min.js"></script>
<script src="../../assets/geodata/world/world-data.js"></script>
<script src="../../assets/js/earth-engine.js"></script>
```

The projection extension is required for Robinson and Gall–Peters. If a page does
not preload `world-data.js`, call and await `EarthEngine.load()` before requesting
land or textures. Pangaea only needs the runtime and engine; its data loads by age.

```js
const E = EarthEngine;
const projection = E.projection('globe', {
  rotate: [20, -15], // center longitude -20°, latitude +15°
  extent: [[20, 20], [880, 460]]
});
const landPath = E.path(projection, E.data().land);
const countryPath = E.path(projection, E.data().countries);
const disputedPath = E.path(projection, E.data().disputed);
```

`projection` supports `globe` (orthographic), `equirectangular`, `mercator`,
`peters` (Gall–Peters, 45° standard parallels), `robinson`, `natural-earth`,
`conic` (Lambert conformal conic, 30°/60° parallels, a rectangular regional view), and
`azimuthal` (north-polar equidistant). D3 handles spherical clipping, seams,
adaptive resampling, and holes. `visible(projection, [lon, lat])` prevents labels
from appearing on a globe's far side. For regional maps, supply `geometry` to fit
the extent to geographic reference points instead of the whole sphere.

`path(projection, geometry, context)` draws into a canvas context; omit `context`
for an SVG path. Use the same projection for landmarks, labels, and geography.
Never use hand-entered pixel coordinates for geographic locations.

`data()` supplies Natural Earth v5.1.2 land, countries, and disputed/claim lines at
1:50 million. These are generalized reference boundaries, **not current live
control lines, survey data, or an endorsement of sovereignty claims**. Cite
`EarthEngine.metadata`; show disputed/claim lines differently from ordinary
borders. The continents lesson demonstrates a mask that prevents a solid border
from showing through the gaps in disputed dashes. Continental names are
conventions; country polygons must not define the Europe–Asia continental divide.

## Three.js and pixel-shaded globes

```js
const texture = EarthEngine.createThreeTexture(THREE);
const position = EarthEngine.lonLatToVector(longitude, latitude, radius);
```

Default Three.js SphereGeometry UVs and engine coordinates agree: north +Y,
longitude 0° +X, east toward -Z. Apply the globe's world matrix to geographic
markers before projecting them to the screen. `vectorToLonLat` reverses this
conversion. These are spherical coordinates, not an ellipsoidal survey/ECEF model.

Textures immediately show real Natural Earth land, then load the shared NASA
surface composite. Set `satellite: false` for a geographic land mask. Optional
`width`, `colors: {land, ocean}`, and `onError` configure the texture. Color space
is sRGB. `landCanvas(width, height, colors)` provides the same land to 2D renderers;
it requires a 2:1 image. `lonLatToUV` uses image coordinates with north at the top.

`textures.day` and `textures.night` refer to historical NASA composites, not live
weather, current snow cover, or political boundaries. Do not invent night lights
when that image is unavailable. Procedural climate overlays must remain labeled
as model output. Dispose of Three textures when disposing of a scene.

`assets/models/earth.glb` follows this coordinate convention and uses the same
NASA texture. Rebuild it with `node scripts/build-earth-model.mjs`. The Earth
explorer and Pale Blue Dot share this model. `LessonFigures` uses generated
orthographic Earth and Britain assets from the same Natural Earth source.

## Pangaea

```js
const age = EarthEngine.reconstruction.nearestAge(requestedAge);
const geography = await EarthEngine.reconstruction.load(age);
// Display age beside this geometry, not the unrounded requested age.
```

25 local MULLER2019 frames cover 0–240 Ma in 10 Ma steps, anchor plate 0. Every
frame records its model, actual age, and simplification tolerance. These are
**reconstructed modern outlines**, useful for recognizing continents, not
independent reconstructions of paleo-shorelines. Erosion, sea-level change,
deformation, and model uncertainty preclude exact ancient coastlines. Credit
EarthByte / University of Sydney, CC BY 4.0, and link the GPlates service and
underlying model. Do not cross-fade shapes and label the blend as an exact age.

## Rebuild and verify

```sh
python3 scripts/fetch-geography.py /tmp/classroom-geography
node scripts/build-geography.mjs /tmp/classroom-geography
node scripts/build-bible-world-map.mjs
node scripts/build-earth-model.mjs
node --test tests/earth-engine.test.mjs
```

Fetching needs network access; rebuilding does not. Natural Earth sources are
pinned to v5.1.2. The source receipt at `assets/geodata/world/sources.json` records
source hashes, dates, credits, model, ages, and limits. D3 7.9.0 and
d3-geo-projection 4.0.0 are locally vendored; their licenses are alongside them.
Pangaea simplification preserves every feature and closed ring and normalizes
spherical winding rather than silently dropping inverted polygons.

Static output includes EHT, world time, element-history geography, Pale Blue Dot
reference examples, geographic voyage waypoints, and shared Earth/Britain figures.
Bible-lands coastlines share the land dataset; its shaded regions remain undated
interpretive associations rather than measured historical territorial borders.
Waypoint connections are explicitly approximate and do not claim exact routes.

When changing the engine, test all consuming lessons at desktop and mobile
sizes. Check rendering as well as equations: hemisphere visibility, dateline
seams, Antarctica, country/disputed overlays, changing ages, marker alignment,
keyboard controls, and offline fallback. Preserve historical map reproductions
as primary-source artifacts; their original geography is part of the evidence.

## Consumer inventory and audit, October 12, 2026

| View | Shared geography and corrections |
| --- | --- |
| Continents and projections | Natural Earth land, islands, and optional country/disputed lines; actual named projections, hemisphere clipping, and globe turning. |
| Pangaea and continental drift | 25 age-stamped GPlates snapshots; actual displayed ages, no blended double geography, no internal feature edges presented as borders. |
| Climate simulator | NASA surface imagery, real-land fallback, and geographic markers aligned with the globe's texture and world matrix. |
| Seasons and the heavens | Shared surface sampled around the changing polar axis; no invented full-width polar ice caps. |
| Earth explorer | Rebuilt canonical NASA-textured globe; loading message hides after the model loads. |
| Pale Blue Dot | Canonical Earth model; real North America, United States, and New York reference examples replace invented borders. Alaska and Hawaii use labeled inset conventions in the country view. |
| VR Solar System Walk | Real NASA surface and Natural Earth fallback replace random oval landmasses. |
| Measuring length | Shared Earth, Earth–Moon, Earth–Sun, and Britain/Ireland reference figures replace invented coastlines. |
| Event Horizon Telescope | Rebuilt 50m land map; observatory coordinates and coastline transform agree. |
| Clocks and time | Rebuilt 50m geographic reference; longitude bands remain reference intervals, not civil time-zone boundaries. |
| Periodic table | Element-history location backdrop rebuilt from shared 50m land. |
| Roads to Rome | Shared regional Mercator geography and geographic city coordinates; transport curves remain illustrative. |
| World of the Bible | Shared modern land and lake holes; shaded areas explicitly identify interpretive associations, not exact historical borders. |
| Magellan and Elcano | Real coastline geometry and geographic waypoints; links are approximate, not exact sailing tracks. |
| Lewis and Clark | Real coastlines and geographically located stops; links are not river paths or surveyed expedition tracks. |

Historical map reproductions, NASA Earth photographs, and scientific seasonal
images remain source artifacts. Simple Earth circles used to teach angles,
illumination, or relative diameter contain no asserted coastline or territorial
geometry. The music-mode regions strip is explicitly conceptual, not a map.
Weather Watch already uses attributed OpenStreetMap Web Mercator tiles; it
retains its provider's rendered geography rather than replacing tiles with
classroom land polygons. Fictional student-game terrain is not Earth geography.

Validation: Earth-engine regression checks, changed JavaScript and inline-script
syntax, site integrity, theme contrast, and focused Pa11y checks passed. All 15
listed views were checked in desktop and mobile Chromium. Screenshots were
inspected for named projections, reconstruction ages, the actual globe canvases,
model orientation, static references, and waypoint maps. Browser interaction
checks included changing ages, play/pause/reset, globe turning, border display,
keyboard focus, model tabs, map selection, and route lightboxes. Both mobile
page-overflow findings were fixed. VR checks used flat-browser rendering, not a
native headset. Satellite imagery was deliberately blocked to verify the
geographic fallback. These checks do not certify survey precision, exact ancient
shorelines, or present-day control along every disputed border.

Reconstruction evidence: [GPlates service documentation](https://gwsdoc.gplates.org/reconstruction/reconstruct-coastlines/),
[EarthByte model and paleogeography datasets](https://www.earthbyte.org/gplates-2-3-software-and-data-sets/),
and the [GPlates research paper](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2018GC007584).
Waypoint context: [National Park Service maps](https://www.nps.gov/lecl/planyourvisit/maps.htm)
and [Spain's archival collection for the first circumnavigation](https://www.cultura.gob.es/cultura/archivos/difusion/registro-memoria-unesco/2023/vuelta-mundo-magallanes-elcano.html).
