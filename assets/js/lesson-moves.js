/* Lessons that moved folders or were renamed. GitHub Pages has no server redirects, so
   404.html forwards old links with this map, and visitor-memory.js moves a returning
   student's history, favorites and saved answers to the new paths. Add an entry (old
   site path → new, no ".html") whenever a lesson moves, and bump `version`. */
(function (root) {
  'use strict';
  var dirs = {
    "lessons/blender/": "lessons/3d-design/blender/",
    "lessons/game-asset-studio/": "lessons/3d-design/game-asset-studio/",
    "lessons/2d-game-dev/": "lessons/2d-design/2d-game-dev/"
  };
  var pages = {
    "lessons/pi": "lessons/mathematics/geometry-and-trigonometry/pi",
    "lessons/cambrian-explosion": "lessons/life-sciences/cambrian-explosion",
    "lessons/3d-design": "lessons/3d-design/3d-design",
    "lessons/applied-physics-materials/3d-printing": "lessons/3d-design/cad-and-printing/3d-printing",
    "lessons/applied-physics-materials/cad-camera-controls": "lessons/3d-design/cad-and-printing/cad-camera-controls",
    "lessons/applied-physics-materials/print-fidgets": "lessons/3d-design/cad-and-printing/print-fidgets",
    "lessons/technical-elements/audio-compression": "lessons/technical-elements/audio-engineering/audio-compression",
    "lessons/technical-elements/audio-mixer-signal-flow": "lessons/technical-elements/audio-engineering/audio-mixer-signal-flow",
    "lessons/technical-elements/eq-problem-frequency": "lessons/technical-elements/audio-engineering/eq-problem-frequency",
    "lessons/technical-elements/live-audio-signal-chain": "lessons/technical-elements/audio-engineering/live-audio-signal-chain",
    "lessons/technical-elements/microphone-polar-patterns": "lessons/technical-elements/audio-engineering/microphone-polar-patterns",
    "lessons/technical-elements/room-acoustics": "lessons/technical-elements/audio-engineering/room-acoustics",
    "lessons/technical-elements/cymatics": "lessons/technical-elements/audio-engineering/cymatics",
    "lessons/technical-elements/stage-lighting-design-lab": "lessons/technical-elements/stagecraft/stage-lighting-design-lab",
    "lessons/technical-elements/stage-plotting": "lessons/technical-elements/stagecraft/stage-plotting",
    "lessons/technical-elements/theatre-cue-sheets": "lessons/technical-elements/stagecraft/theatre-cue-sheets",
    "lessons/technical-elements/projection-throw-ratio-lab": "lessons/technical-elements/stagecraft/projection-throw-ratio-lab",
    "lessons/technical-elements/camera-exposure-triangle": "lessons/technical-elements/camera/camera-exposure-triangle",
    "lessons/technical-elements/white-balance-color-temperature": "lessons/technical-elements/camera/white-balance-color-temperature",
    "lessons/technical-elements/jim-henson": "lessons/technical-elements/pioneers/jim-henson",
    "lessons/technical-elements/walt-disney": "lessons/technical-elements/pioneers/walt-disney",
    "lessons/music/bach": "lessons/music/pioneers/bach",
    "lessons/music/beethoven": "lessons/music/pioneers/beethoven",
    "lessons/music/chopin": "lessons/music/pioneers/chopin",
    "lessons/music/mozart": "lessons/music/pioneers/mozart",
    "lessons/music/tchaikovsky": "lessons/music/pioneers/tchaikovsky",
    "lessons/music/vivaldi": "lessons/music/pioneers/vivaldi",
    "lessons/music/gershwin": "lessons/music/pioneers/gershwin",
    "lessons/music/joplin": "lessons/music/pioneers/joplin",
    "lessons/music/morton": "lessons/music/pioneers/morton",
    "lessons/music/louis-armstrong": "lessons/music/pioneers/louis-armstrong",
    "lessons/music/charlie-parker": "lessons/music/pioneers/charlie-parker",
    "lessons/music/duke-ellington": "lessons/music/pioneers/duke-ellington",
    "lessons/music/drums": "lessons/music/instruments/drums",
    "lessons/music/guitar": "lessons/music/instruments/guitar",
    "lessons/music/piano": "lessons/music/instruments/piano",
    "lessons/music/saxophone": "lessons/music/instruments/saxophone",
    "lessons/music/violin-fingerboard": "lessons/music/instruments/violin-fingerboard",
    "lessons/music/fake-book": "lessons/music/theory/fake-book",
    "lessons/music/music-modes-evolution": "lessons/music/theory/music-modes-evolution",
    "lessons/music/sheet-music-trainer": "lessons/music/theory/sheet-music-trainer",
    "lessons/design/charles-ray-eames": "lessons/design/pioneers/charles-ray-eames",
    "lessons/design/katsushika-hokusai": "lessons/design/pioneers/katsushika-hokusai",
    "lessons/design/nam-june-paik": "lessons/design/pioneers/nam-june-paik",
    "lessons/design/pablo-picasso": "lessons/design/pioneers/pablo-picasso",
    "lessons/design/vincent-van-gogh": "lessons/design/pioneers/vincent-van-gogh",
    "lessons/design/pioneers/katsushika-hokusai": "lessons/2d-design/pioneers/katsushika-hokusai",
    "lessons/design/pioneers/pablo-picasso": "lessons/2d-design/pioneers/pablo-picasso",
    "lessons/design/pioneers/vincent-van-gogh": "lessons/2d-design/pioneers/vincent-van-gogh",
    "lessons/technical-elements/pioneers/walt-disney": "lessons/2d-design/pioneers/walt-disney",
    "lessons/humanities/leonardo-da-vinci": "lessons/humanities/pioneers/leonardo-da-vinci",
    "lessons/humanities/magellan": "lessons/humanities/pioneers/magellan",
    "lessons/humanities/lewis-and-clark": "lessons/humanities/pioneers/lewis-and-clark",
    "lessons/chemistry/dalton-atomic-theory": "lessons/chemistry/pioneers/dalton-atomic-theory",
    "lessons/chemistry/lavoisier-conservation": "lessons/chemistry/pioneers/lavoisier-conservation",
    "lessons/chemistry/mendeleev-periodic-law": "lessons/chemistry/pioneers/mendeleev-periodic-law",
    "lessons/cosmology/tycho-brahe": "lessons/cosmology/pioneers/tycho-brahe",
    "lessons/cosmology/mercury": "lessons/cosmology/solar-system/mercury",
    "lessons/cosmology/venus": "lessons/cosmology/solar-system/venus",
    "lessons/cosmology/earth": "lessons/cosmology/solar-system/earth",
    "lessons/cosmology/mars": "lessons/cosmology/solar-system/mars",
    "lessons/cosmology/jupiter": "lessons/cosmology/solar-system/jupiter",
    "lessons/cosmology/saturn": "lessons/cosmology/solar-system/saturn",
    "lessons/cosmology/uranus": "lessons/cosmology/solar-system/uranus",
    "lessons/cosmology/neptune": "lessons/cosmology/solar-system/neptune",
    "lessons/cosmology/asteroid-belt": "lessons/cosmology/solar-system/asteroid-belt",
    "lessons/cosmology/kuiper-belt": "lessons/cosmology/solar-system/kuiper-belt",
    "lessons/language-literature/language-foundations-lab": "lessons/language-literature/languages/language-foundations-lab",
    "lessons/language-literature/chinese-foundations": "lessons/language-literature/languages/chinese-foundations",
    "lessons/language-literature/french-foundations": "lessons/language-literature/languages/french-foundations",
    "lessons/language-literature/german-foundations": "lessons/language-literature/languages/german-foundations",
    "lessons/language-literature/italian-foundations": "lessons/language-literature/languages/italian-foundations",
    "lessons/language-literature/japanese-foundations": "lessons/language-literature/languages/japanese-foundations",
    "lessons/language-literature/latin-foundations": "lessons/language-literature/languages/latin-foundations",
    "lessons/language-literature/portuguese-foundations": "lessons/language-literature/languages/portuguese-foundations",
    "lessons/language-literature/russian-foundations": "lessons/language-literature/languages/russian-foundations",
    "lessons/language-literature/spanish-foundations": "lessons/language-literature/languages/spanish-foundations",
    "lessons/technical-elements/beethoven": "lessons/music/beethoven",
    "lessons/technical-elements/drums": "lessons/music/drums",
    "lessons/technical-elements/guitar-chords": "lessons/music/guitar",
    "lessons/technical-elements/music-modes-evolution": "lessons/music/music-modes-evolution",
    "lessons/technical-elements/piano-chords": "lessons/music/piano",
    "lessons/technical-elements/sheet-music-trainer": "lessons/music/sheet-music-trainer",
    "lessons/technical-elements/violin-fingerboard": "lessons/music/violin-fingerboard",
    "lessons/music/piano-chords": "lessons/music/piano",
    "lessons/music/guitar-chords": "lessons/music/guitar"
  };
  // Site path ("lessons/music/bach.html") → where it lives now, or null if it never moved.
  function resolve(path) {
    var p = String(path || '').replace(/^\//, ''), seen = 0, moved = false;
    while (seen++ < 8) {
      var page = p.replace(/\.html$/, ''), next = null;
      if (Object.prototype.hasOwnProperty.call(pages, page)) next = pages[page] + '.html';
      else for (var d in dirs) if (p.indexOf(d) === 0) { next = dirs[d] + p.slice(d.length); break; }
      if (!next || next === p) break;
      p = next; moved = true;
    }
    return moved ? p : null;
  }
  root.ClassroomOSLessonMoves = { version: 3, resolve: resolve };
}(typeof window !== 'undefined' ? window : globalThis));
