/* Ocean Zones dive sim — lessons/earth-science/ocean-zones.html */
(function () {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ══════════════════════════════════════════
     ZONES
  ══════════════════════════════════════════ */
  const ZONES = [
    { id: 'sunlight', name: 'Sunlight Zone',  latin: 'Epipelagic',    icon: '☀️', min: 0,     max: 200,   jump: 40,   color: [30, 130, 200],
      desc: 'Enough light for photosynthesis supports phytoplankton, the base of most marine food webs. Wind, waves, and sunlight make this the warmest and most variable layer.' },
    { id: 'twilight', name: 'Twilight Zone',  latin: 'Mesopelagic',   icon: '🌘', min: 200,   max: 1000,  jump: 500,  color: [8, 40, 90],
      desc: 'Sunlight fades to a faint glow, then nothing. Animals here migrate upward every night to feed — the largest migration on Earth, by biomass.' },
    { id: 'midnight', name: 'Midnight Zone',  latin: 'Bathypelagic',  icon: '🌑', min: 1000,  max: 4000,  jump: 2000, color: [2, 8, 22],
      desc: 'No sunlight reaches this cold, high-pressure layer. Most food arrives from above, while animals find prey using smell, vibration, sensitive eyes, or bioluminescence.' },
    { id: 'abyss',    name: 'The Abyss',      latin: 'Abyssopelagic', icon: '⚫', min: 4000,  max: 6000,  jump: 5000, color: [1, 4, 12],
      desc: 'Abyssal plains cover much of the deep seafloor. Food is scarce; communities depend on marine snow, occasional carcasses, and—in a few places—chemosynthesis.' },
    { id: 'trench',   name: 'The Trenches',   latin: 'Hadalpelagic',  icon: '🔻', min: 6000,  max: 11000, jump: 10935,color: [0, 2, 7],
      desc: "The hadal zone occurs inside trenches below 6,000 m. Challenger Deep is about 10,935 m deep; exact survey estimates vary by several metres." },
  ];

  const ZONE_IMPACT = {
    sunlight:{ headline:"The ocean’s solar-powered engine", lead:'A remarkably thin skin of illuminated water captures solar energy, produces much of Earth’s oxygen, and supports the food webs familiar to people.', reference:100, accent:'#74ddff', takeaway:'This is the only ocean layer with enough light for sustained photosynthesis. Nearly everything living deeper ultimately depends on energy first captured here.' },
    twilight:{ headline:'The last blue light—and a planetary migration', lead:'Sunlight dwindles below the level needed by plants. Every night, vast numbers of animals rise toward surface waters to feed and descend again before daylight.', reference:500, accent:'#6aa8ff', takeaway:'This daily vertical migration moves carbon into deeper water as animals feed near the surface, then respire, excrete, and become prey below.' },
    midnight:{ headline:'Permanent night, illuminated by life', lead:'No sunlight penetrates this immense cold habitat. Animals navigate darkness through extreme sensitivity, chemical signals, vibration, and living light.', reference:2500, accent:'#a88cff', takeaway:'Bioluminescence becomes the dominant natural light source—used to hunt, hide, communicate, startle predators, and find mates.' },
    abyss:{ headline:'A vast seafloor living on falling snow', lead:'Near-freezing abyssal plains stretch across enormous areas. With no plants and little food, survival is measured in patience, efficiency, and opportunity.', reference:5000, accent:'#73dfc0', takeaway:'A slow rain of organic particles called marine snow links surface productivity to communities kilometres below.' },
    trench:{ headline:'Life at the edge of pressure tolerance', lead:'Hadal habitats are isolated inside steep trenches. Their slopes funnel food downward while pressure approaches one thousand times that at the surface.', reference:10935, accent:'#ffcf67', takeaway:'Fish disappear below roughly 8.2–8.4 km, yet amphipods, worms, single-celled organisms, and microbes continue toward the deepest seafloor.' }
  };

  const ZONE_DETAILS = {
    sunlight: {
      energy:'Photosynthesis and surface food webs', challenge:'Rapidly changing light, waves, and temperature',
      biodiversity:['Phytoplankton','Copepods','Jellyfish','Tuna','Flying fish','Sea turtles','Sharks','Dolphins','Seabirds','Sargassum'],
      facts:[
        'The lower edge of the euphotic layer is not fixed. Clear tropical water may support photosynthesis near 200 m, while turbid coastal water can become too dim much sooner.',
        'Microscopic phytoplankton are primary producers: they turn light and dissolved carbon dioxide into food used throughout marine food webs.',
        'Wind and waves mix oxygen from the atmosphere into surface water, while photosynthesis also releases oxygen during daylight.',
        'Many large animals seen here—including dolphins, whales, turtles, and seabirds—must return to the surface to breathe air.',
        'Surface currents gather drifting organisms and debris into fronts, creating concentrated feeding areas for predators.',
        'Below the warm mixed layer, the thermocline can make temperature fall rapidly over a relatively short vertical distance.'
      ]
    },
    twilight: {
      energy:'Food descending from above and nightly feeding', challenge:'Dim light and often low dissolved oxygen',
      biodiversity:['Lanternfish','Bristlemouths','Hatchetfish','Viperfish','Krill','Siphonophores','Vampire squid','Jellies','Shrimp','Salps'],
      facts:[
        'Every evening, immense numbers of fishes, crustaceans, and gelatinous animals rise toward surface food; before sunrise they descend again.',
        'This diel vertical migration moves carbon into deeper water when migrants feed near the surface and respire or release waste below.',
        'Some twilight depths overlap oxygen-minimum zones, where respiration uses oxygen faster than circulation and photosynthesis can replace it.',
        'Tubular or upward-pointing eyes help some animals detect silhouettes against the faint blue light still arriving from above.',
        'Hatchetfish and several squid use counterillumination: downward-facing photophores help erase their silhouette from predators below.',
        'Marine snow includes fecal pellets, mucus, molts, dead plankton, and other organic particles sinking from productive surface water.'
      ]
    },
    midnight: {
      energy:'Marine snow, migrating prey, and rare food falls', challenge:'Permanent darkness, cold, and high pressure',
      biodiversity:['Anglerfish','Dragonfish','Viperfish','Pelican eels','Giant squid','Glass squid','Deep jellies','Siphonophores','Shrimp','Bristlemouths'],
      facts:[
        'At 2,000 m, absolute pressure is roughly 200 atmospheres—about 20 megapascals in this representative seawater model.',
        'Sunlight is absent, but living light is common. Animals use bioluminescence to lure prey, signal, camouflage, startle, or illuminate targets.',
        'Red wavelengths do not travel through deep seawater, so many red or black animals appear nearly invisible unless lit by a submersible.',
        'Food arrives unpredictably. Large mouths, expandable stomachs, sensitive smell, and low metabolic rates help animals survive long gaps between meals.',
        'Many deep fishes lack gas-filled swim bladders; lipids, watery tissues, or active swimming provide buoyancy without a compressible gas space.',
        'The bathypelagic zone contains water, not seafloor. Its animals live suspended in a three-dimensional habitat thousands of metres thick.'
      ]
    },
    abyss: {
      energy:'Settling detritus, carcasses, and local chemosynthesis', challenge:'Extreme food scarcity across a vast seafloor',
      biodiversity:['Sea cucumbers','Brittle stars','Polychaete worms','Amphipods','Isopods','Grenadiers','Sponges','Sea spiders','Xenophyophores','Microbes'],
      facts:[
        'Abyssal plains are among Earth’s largest habitats. Their soft sediment is built from mineral dust, clay, shells, and organic particles settling over long periods.',
        'Sea cucumbers and other deposit feeders ingest sediment, digest its organic material, and leave trails that continually rework the seafloor.',
        'A whale fall can deliver years of food at once and support scavengers, enrichment opportunists, and later sulfide-based communities.',
        'Polymetallic nodules grow extremely slowly as metals accumulate around a small nucleus on the sediment surface.',
        'Hydrothermal vents and cold seeps support chemosynthesis, but they are localized exceptions rather than the energy source for the entire abyss.',
        'Abyssal animals may be widely spaced, yet the habitat contains high species diversity—especially among small sediment-dwelling invertebrates.'
      ]
    },
    trench: {
      energy:'Organic matter funneled down trench slopes', challenge:'Enormous pressure and geographic isolation',
      biodiversity:['Hadal snailfish','Amphipods','Sea cucumbers','Polychaete worms','Bivalves','Isopods','Foraminiferans','Anemones','Crustaceans','Pressure-loving microbes'],
      facts:[
        'The hadal zone is discontinuous: it exists inside separate trenches created mainly where one tectonic plate bends beneath another.',
        'Steep trench slopes can funnel organic matter downward, so some hadal basins contain more food than the open abyss immediately above them.',
        'Mariana snailfish occupy the upper hadal zone, but biochemical limits on proteins appear to prevent fishes from living much below about 8.2–8.4 km.',
        'Amphipods, sea cucumbers, worms, single-celled foraminiferans, and microbes continue deeper than the known limit for fishes.',
        'Isolation between trenches promotes endemism: populations in one trench may evolve separately from relatives in another.',
        'Near 10,935 m, absolute pressure approaches 1,100 atmospheres, but animals without large gas spaces are not simply “crushed”; their chemistry must remain pressure-stable.'
      ]
    }
  };

  function zoneAt(depth) {
    for (const z of ZONES) if (depth >= z.min && depth < z.max) return z;
    return ZONES[ZONES.length - 1];
  }

  /* ══════════════════════════════════════════
     CREATURES
  ══════════════════════════════════════════ */
  const CREATURES = {
    sunlight: [
      { kind:'dolphin', group:'fish', name: 'Bottlenose Dolphin', latin:'Tursiops truncatus', length:'2–4 m', image:'dolphin.png', model:'2ec20f15b08c4c2fb16e4df5d837b893', author:'DigitalLife3D', license:'CC BY-NC 4.0', fact: 'Bottlenose dolphins use clicks and returning echoes to map prey. They breathe air, so every dive must end at the surface.' },
      { kind:'turtle', group:'fish', name: 'Leatherback Turtle', latin:'Dermochelys coriacea', length:'1.2–1.8 m', model:'820022879ce84a8fab0b95994fd2e6c7', author:'DigitalLife3D', license:'CC BY-NC 4.0', fact: 'Leatherbacks can dive beyond 1,000 m, slowing their heart rate and conserving oxygen while pursuing jellyfish.' },
      { kind:'shark', group:'fish', name: 'White Shark', latin:'Carcharodon carcharias', length:'3.5–6 m', model:'702e7b53637f4ded9ca479a8124e810d', author:'DigitalLife3D', license:'CC BY-NC 4.0', fact: 'White sharks spend much time near the surface but make repeated deep dives, sometimes beyond 1,000 m.' },
      { kind:'flyingfish', group:'fish', name: 'Flying Fish', latin:'Cheilopogon heterurus', length:'18–45 cm', model:'c1bfd57232874989a63b8b7a611f917e', author:'ffish.asia / floraZia.com', license:'CC0', fact: 'Flying fish accelerate underwater, launch, and glide on enlarged pectoral fins to evade predators.' },
      { kind:'tuna', group:'fish', name:'Pacific Bluefin Tuna', latin:'Thunnus orientalis', length:'1.5–3 m', model:'88d6e843abfb44d086341323e99b83ac', author:'ffish.asia / floraZia.com', license:'CC0', fact:'Streamlined bodies, finlets, and heat-retaining circulation make bluefin tuna powerful, wide-ranging predators of schooling fishes and squid.' },
      { kind:'moonjelly', group:'benthic', name:'Moon Jelly', latin:'Aurelia aurita', length:'25–40 cm bell', model:'3d911c511f2744ec9bfb99d46d2d6e14', author:'n-', license:'CC BY 4.0', fact:'Moon jellies pulse gently but mostly drift with currents, capturing plankton on mucus-coated surfaces and oral arms.' },
    ],
    twilight: [
      { kind:'vampire', group:'squid', name: 'Vampire Squid', latin:'Vampyroteuthis infernalis', length:'~30 cm', model:'4a19c53d3f8b43af884299caab48fe9d', author:'Razan Negm', license:'CC BY 4.0', fact: 'Vampire squid collect drifting organic particles with long filaments. Their low metabolism suits the twilight zone’s oxygen-minimum waters.' },
      { kind:'lantern', group:'fish', name: 'Lanternfish', latin:'Myctophidae', length:'2–30 cm', model:'2f4cebdd22a049cdb41e76028b2e6d5c', author:'jasonstrougo', license:'CC BY 4.0', fact: 'Many lanternfish migrate hundreds of metres upward at night to feed, then descend by day—the diel vertical migration.' },
      { kind:'hatchet', group:'fish', name: 'Marine Hatchetfish', latin:'Sternoptychidae', length:'3–12 cm', model:'7ad197043d184884b6140988ac44a4fa', author:'Joe3Doe', license:'CC BY-NC 4.0', fact: 'Rows of photophores on the belly can match downwelling light, hiding the fish from predators below.' },
      { kind:'krill', group:'benthic', name:'Antarctic Krill', latin:'Euphausia superba', length:'4–6 cm', model:'f214d51c4f5840ce9f5ef806bc7115aa', author:'MachadoJP', license:'CC BY 4.0', fact:'Krill graze on phytoplankton and ice algae, form enormous swarms, and migrate vertically; they connect microscopic producers to fishes, penguins, seals, and whales.' },
      { kind:'viperfish', group:'fish', name:'Pacific Viperfish', latin:'Chauliodus macouni', length:'20–30 cm', model:'21368fef466343b4b9d0ca11f2cff468', author:'redsonder1000', license:'CC BY 4.0', fact:'Long fangs, a hinged skull, photophores, and a luminous lure help Pacific viperfish capture prey in dim mesopelagic water.' },
      { kind:'siphonophore', group:'benthic', name:'Common Siphonophore', latin:'Nanomia bijuga', length:'colony to ~1 m', model:'bf0b8d2378914a66a2e1f94f63d63543', author:'MBARI', license:'CC BY 4.0', fact:'A siphonophore is a colony of specialized cloned bodies: some swim, some feed, some defend, and others reproduce.' },
    ],
    midnight: [
      { kind:'angler', group:'fish', name: 'Deep-sea Anglerfish', latin:'Ceratioidei', length:'3 cm–1.2 m', model:'802018f776bf4313a3b620b1d6d34ff7', author:'Poshel', license:'CC BY 4.0', fact: 'In many species, the female’s lure contains luminous bacteria. Extreme sexual dimorphism includes tiny males that attach to females in some lineages.' },
      { kind:'giantsquid', group:'squid', name: 'Giant Squid', latin:'Architeuthis dux', length:'to ~12 m', model:'51b3061645964e51af6ba724fa5fcdc1', author:'3XH6R', license:'CC BY 4.0', fact: 'Giant squid have eyes up to about 27 cm across, useful for detecting large moving animals in very dim water.' },
      { kind:'gulper', group:'fish', name: 'Pelican Eel', latin:'Eurypharynx pelecanoides', length:'~1 m', model:'fbae0106acab48f4869141df9d8c37da', author:'SpaceGolby', license:'CC BY 4.0', fact: 'Its huge expandable mouth helps capture scarce prey, but its stomach is not built to swallow animals larger than its whole body.' },
      { kind:'dragonfish', group:'fish', name:'Deep-sea Dragonfish', latin:'Stomiidae', length:'15–40 cm', model:'38b68a2b10d341568bf669e546fba72c', author:'INHi3D Virtual Museum', license:'CC BY 4.0', fact:'Some dragonfishes produce red bioluminescence and can see it, creating a private searchlight invisible to many prey species.' },
      { kind:'dumbo', group:'squid', name:'Dumbo Octopus', latin:'Opisthoteuthidae', length:'20–30 cm', model:'b798bba56507441fb9abf959128f5f26', author:'APO', license:'CC BY 4.0', fact:'Dumbo octopuses steer with ear-like fins and webbed arms, hovering just above the seafloor or swimming through deep water to capture small invertebrates.' },
      { kind:'marrus', group:'benthic', name:'Marrus Siphonophore', latin:'Marrus', length:'colony to several metres', model:'4a9d9b8553b14ccda32033cbb6c2c9b7', author:'n-', license:'CC BY 4.0', fact:'Marrus is not one jellyfish but a coordinated colony. Repeating units handle propulsion while trailing tentacles capture crustaceans and other prey.' },
    ],
    abyss: [
      { kind:'cucumber', group:'benthic', name: 'Sea Pig', latin:'Scotoplanes', length:'10–15 cm', model:'ab025ddddef94444988b01ece97ee941', author:'stephenandrewmalcolm', license:'CC BY 4.0', fact: 'These transparent sea cucumbers walk across soft abyssal sediment and ingest organic-rich mud.' },
      { kind:'brittlestar', group:'benthic', name:'Brittle Star', latin:'Ophiuroidea', length:'arms to ~30 cm', model:'62fa903f21d84754a1cf8cd95f235488', author:'ffish.asia / floraZia.com', license:'CC0', fact:'Brittle stars use flexible jointed arms to crawl, suspension-feed, or collect detritus; many species are abundant on deep soft sediments.' },
      { kind:'glasssponge', group:'benthic', name:'Glass Sponge', latin:'Hexactinellida', length:'10 cm–1 m', model:'910236f09fae4a0590475f27ade961fa', author:'Digital Atlas of Ancient Life', license:'CC0', fact:'Glass sponges build silica skeletons and filter tiny particles and microbes from deep water; their structures shelter other animals.' },
      { kind:'seaspider', group:'benthic', name:'Sea Spider', latin:'Pycnogonida', length:'leg span to ~70 cm', model:'8c8e258bfbaf45f68f9520a0bb8f436c', author:'VIRKM', license:'CC BY 4.0', fact:'Deep-sea pycnogonids have very small bodies and long legs that contain branches of the digestive and reproductive systems.' },
      { kind:'foram', group:'benthic', name:'Benthic Foraminiferan', latin:'Foraminifera', length:'microscopic to centimetres', model:'c5e16b7fd6e14672bfac3c424f1183c1', author:'MWintersberger', license:'CC BY 4.0', fact:'Foraminiferans are single-celled organisms that build intricate tests. Giant deep-sea forms can create habitat and trap organic particles.' },
      { kind:'anemone', group:'benthic', name:'Deep-sea Anemone', latin:'Actiniaria', length:'a few cm to >1 m', model:'a0d2cd71cab745aa90a860507d352622', author:'jtressle', license:'CC BY 4.0', fact:'Deep-sea anemones anchor to rock, sediment, or other animals and use stinging tentacles to capture passing plankton and small prey.' },
    ],
    trench: [
      { kind:'snailfish', group:'fish', name: 'Mariana Snailfish', latin:'Pseudoliparis swirei', length:'to ~23 cm', model:'8a16edacaa274169af8a951cfbbf813f', author:'fishguy', license:'CC BY 4.0', fact: 'Mariana snailfish have been collected near 8,000 m. Fish appear physiologically limited to roughly 8,200–8,400 m, so none are expected at Challenger Deep.' },
      { kind:'hadalamphipod', group:'benthic', name:'Hadal Amphipod', latin:'Hirondellea gigas', length:'to ~5 cm', role:'Scavenger', fact:'Hirondellea gigas is abundant in the Mariana Trench. It scavenges falling material and carries enzymes capable of breaking down plant-derived cellulose.' },
      { kind:'hadalcucumber', group:'benthic', name:'Hadal Sea Cucumber', latin:'Elasipodida', length:'typically 5–30 cm', role:'Deposit feeder', fact:'Hadal sea cucumbers cross trench sediment and ingest organic particles concentrated on or just beneath the surface.' },
      { kind:'polychaete', group:'benthic', name:'Hadal Polychaete', latin:'Polychaeta', length:'millimetres to centimetres', role:'Burrower and scavenger', fact:'Segmented polychaete worms burrow through trench sediment, graze microbes, collect detritus, or prey on smaller animals.' },
      { kind:'xenophyophore', group:'benthic', name:'Xenophyophore', latin:'Xenophyophorea', length:'up to ~20 cm', role:'Giant single cell', fact:'Xenophyophores are enormous single-celled foraminiferans that assemble sediment into elaborate tests and increase habitat complexity.' },
      { kind:'piezophile', group:'benthic', name:'Piezophile Microbes', latin:'Bacteria and Archaea', length:'microscopic', role:'Decomposer', fact:'Pressure-loving microbes recycle organic matter and use pressure-adapted membranes, enzymes, and protein-folding systems.' },
    ],
  };

  /* ══════════════════════════════════════════
     PHYSICS MODELS
  ══════════════════════════════════════════ */
  // Representative open-ocean model: 1,025 kg/m³ seawater, standard gravity.
  function pressureAtm(depth) { return 1 + (1025 * 9.80665 * depth) / 101325; }

  function tempC(depth) {
    if (depth <= 100) return lerp(20, 16, depth / 100);
    if (depth <= 1000) return lerp(16, 4, (depth - 100) / 900);
    if (depth <= 4000) return lerp(4, 2.2, (depth - 1000) / 3000);
    return lerp(2.2, 1.0, clamp((depth - 4000) / 7000, 0, 1));
  }

  function lightPct(depth) {
    // Beer–Lambert approximation for clear blue open-ocean water (k≈0.023 m⁻¹).
    if (depth >= 1000) return 0;
    return 100 * Math.exp(-0.023 * depth);
  }

  /* ══════════════════════════════════════════
     COLOR-LOSS MODEL (real light-absorption order)
  ══════════════════════════════════════════ */
  function colorAtDepth(depth) {
    // Surface tropical blue-green, fading band by band toward black.
    const surface = [46, 150, 190];
    const midBlue = [10, 70, 130];
    const deepBlue = [2, 20, 55];
    const dark = [1, 4, 11];
    const black = [0, 1, 4];
    let c;
    if (depth < 30) c = lerpRGB(surface, midBlue, depth / 30);
    else if (depth < 200) c = lerpRGB(midBlue, deepBlue, (depth - 30) / 170);
    else if (depth < 1000) c = lerpRGB(deepBlue, dark, (depth - 200) / 800);
    else c = lerpRGB(dark, black, clamp((depth - 1000) / 5000, 0, 1));
    return c;
  }
  function lerpRGB(a, b, t) {
    t = clamp(t, 0, 1);
    return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
  }
  function rgbStr(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')'; }

  /* ══════════════════════════════════════════
     CANVAS SETUP
  ══════════════════════════════════════════ */
  const canvas = document.getElementById('oz-canvas');
  const outer = document.getElementById('oz-outer');
outer.tabIndex = 0;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = outer.clientWidth; H = outer.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(outer);
  requestAnimationFrame(resize);

  /* ══════════════════════════════════════════
     STATE + PARTICLES
  ══════════════════════════════════════════ */
  const state = { depth: 0, diving: false };
  let spotlightCreature = null;

  class Snow { constructor() { this.reset(true); } reset(initY) {
    this.x = Math.random() * W; this.y = initY ? Math.random() * H : -4;
    this.vy = 6 + Math.random() * 10; this.vx = (Math.random() - 0.5) * 4;
    this.r = 0.6 + Math.random() * 1.4; this.a = 0.15 + Math.random() * 0.3;
  } step(dt) { this.y += this.vy * dt; this.x += this.vx * dt;
    if (this.y > H + 4) this.reset(false); } }

  class Glow { constructor() { this.reset(); } reset() {
    this.x = Math.random() * W; this.y = Math.random() * H;
    this.r = 1 + Math.random() * 2; this.phase = Math.random() * Math.PI * 2;
    this.speed = 1.4 + Math.random() * 2;
    this.hue = Math.random() < 0.7 ? [90, 230, 200] : [140, 210, 255];
  } step(dt, t) { this.x += Math.sin(t * 0.3 + this.phase) * 0.15;
    this.y += Math.cos(t * 0.22 + this.phase) * 0.1;
    this.blink = 0.35 + 0.65 * Math.max(0, Math.sin(t * this.speed + this.phase)); } }

  const snowflakes = Array.from({ length: 90 }, () => new Snow());
  const glows = Array.from({ length: 140 }, () => new Glow());

  const PLATE_SOURCES = {
    sunlight: '../../assets/images/ocean-zones/sunlight.webp',
    twilight: '../../assets/images/ocean-zones/twilight.webp',
    midnight: '../../assets/images/ocean-zones/midnight.webp',
    abyss: '../../assets/images/ocean-zones/abyss.webp',
    trench: '../../assets/images/ocean-zones/hadal.webp',
  };
  const zonePlates = {};
  Object.keys(PLATE_SOURCES).forEach(id => {
    const image = new Image(); image.decoding = 'async'; image.src = PLATE_SOURCES[id]; zonePlates[id] = image;
  });
  const subImage = new Image();
  subImage.decoding = 'async';
  subImage.src = '../../assets/images/ocean-zones/research-sub.webp';

  function drawCover(image, alpha) {
    if (!image.complete || !image.naturalWidth) return;
    const imageRatio=image.naturalWidth/image.naturalHeight, canvasRatio=W/H;
    let sx=0,sy=0,sw=image.naturalWidth,sh=image.naturalHeight;
    if(imageRatio>canvasRatio){sw=image.naturalHeight*canvasRatio;sx=(image.naturalWidth-sw)/2;}
    else {sh=image.naturalWidth/canvasRatio;sy=(image.naturalHeight-sh)/2;}
    ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(image,sx,sy,sw,sh,0,0,W,H);ctx.restore();
  }

  function drawDepthPlate(depth) {
    const boundaries=[200,1000,4000,6000], widths=[70,180,450,650];
    for(let i=0;i<boundaries.length;i++) {
      const start=boundaries[i]-widths[i], end=boundaries[i]+widths[i];
      if(depth>=start && depth<=end) {
        const t=clamp((depth-start)/(end-start),0,1);
        drawCover(zonePlates[ZONES[i].id],.92*(1-t));
        drawCover(zonePlates[ZONES[i+1].id],.92*t);
        return;
      }
    }
    drawCover(zonePlates[zoneAt(depth).id],.92);
  }

  function drawSeafloor(depth, now) {
    if (depth < 3800) return;
    const y=H*.84, trench=clamp((depth-6000)/4500,0,1);ctx.fillStyle=depth>6000?'#080b12':'#10151b';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,y);
    for(let x=0;x<=W;x+=W/8){const dip=trench*Math.exp(-Math.pow((x-W*.55)/(W*.24),2))*H*.12;ctx.lineTo(x,y+dip+Math.sin(x*.035+now*.00005)*5);}ctx.lineTo(W,H);ctx.fill();
    ctx.strokeStyle='rgba(130,155,160,.12)';ctx.lineWidth=1;ctx.stroke();
  }

  /* ══════════════════════════════════════════
     DRAW
  ══════════════════════════════════════════ */
  let t0 = performance.now();

  let simVisible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { simVisible = entries[0].isIntersecting; }).observe(outer);
  }

  function draw(now) {
    requestAnimationFrame(draw);
    const dt = Math.min((now - t0) / 1000, 0.05); t0 = now;
    if (!W || !H || !simVisible || document.hidden) return;

    const depth = state.depth;
    const zone = zoneAt(depth);
    const light = lightPct(depth) / 100;

    // Background gradient — local window around current depth
    const topC = colorAtDepth(Math.max(0, depth - 260));
    const botC = colorAtDepth(depth + 260);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgbStr(topC));
    g.addColorStop(1, rgbStr(botC));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    drawDepthPlate(depth);

    // Depth tint keeps transitions faithful to the physical light model.
    ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.12+.2*clamp(depth/6000,0,1);
    ctx.fillStyle=rgbStr(colorAtDepth(depth));ctx.fillRect(0,0,W,H);ctx.restore();

    // Sunbeams near the surface
    if (depth < 250) {
      const beamAlpha = 0.07 * (1 - depth / 250);
      for (let i = 0; i < 3; i++) {
        const bx = (W / 6) * (i + 1) + Math.sin(now * 0.0004 + i) * 30;
        ctx.save();
        ctx.translate(bx, 0);
        ctx.rotate(0.12 * Math.sin(now * 0.0003 + i));
        const bg = ctx.createLinearGradient(0, 0, 0, H * 0.8);
        bg.addColorStop(0, 'rgba(255,255,255,' + beamAlpha + ')');
        bg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = bg;
        ctx.fillRect(-18, 0, 36, H * 0.8);
        ctx.restore();
      }
    }

    // Marine snow
    ctx.fillStyle = '#dfeffa';
    snowflakes.forEach(s => {
      s.step(dt);
      ctx.globalAlpha = s.a * clamp(1 - depth / 9000, 0.25, 1);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Bioluminescence glow (fades in from twilight zone onward)
    const bioAmt = clamp((depth - 150) / 700, 0, 1);
    if (bioAmt > 0.02) {
      glows.forEach(gl => {
        gl.step(dt, now * 0.001);
        const a = gl.blink * bioAmt * 0.9;
        ctx.beginPath();
        const rg = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r * 5);
        rg.addColorStop(0, 'rgba(' + gl.hue[0] + ',' + gl.hue[1] + ',' + gl.hue[2] + ',' + a + ')');
        rg.addColorStop(1, 'rgba(' + gl.hue[0] + ',' + gl.hue[1] + ',' + gl.hue[2] + ',0)');
        ctx.fillStyle = rg;
        ctx.arc(gl.x, gl.y, gl.r * 5, 0, Math.PI * 2); ctx.fill();
      });
    }

    drawSeafloor(depth, now);

    // Submersible + headlight cone (fixed at vertical center)
    const subX = W * 0.17, subY = H * 0.66;
    if (light < 0.5) {
      const coneA = (0.5 - light) * 0.9;
      const cone = ctx.createRadialGradient(subX, subY, 4, subX, subY, W * 0.42);
      cone.addColorStop(0, 'rgba(255,244,210,' + coneA + ')');
      cone.addColorStop(1, 'rgba(255,244,210,0)');
      ctx.fillStyle = cone;
      ctx.beginPath(); ctx.arc(subX, subY, W * 0.42, 0, Math.PI * 2); ctx.fill();
    }
    const subR=Math.min(W,H)*.085;
    if(subImage.complete && subImage.naturalWidth) drawResearchSub(subX,subY,subR,now);
    else drawSub(subX, subY, subR, now);

    // Vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  function drawResearchSub(x,y,r,now) {
    const bob=Math.sin(now*.0012)*r*.1, width=r*4.35, height=width*(subImage.naturalHeight/subImage.naturalWidth);
    ctx.save();ctx.translate(x,y+bob);ctx.rotate(Math.sin(now*.00055)*.018);
    ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=r*.35;ctx.shadowOffsetY=r*.12;
    ctx.drawImage(subImage,-width/2,-height/2,width,height);ctx.restore();
    const lampX=x+width*.42,lampY=y+bob-height*.12;
    ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle='rgba(255,246,205,.9)';ctx.shadowColor='#fff1b5';ctx.shadowBlur=r*.35;
    ctx.beginPath();ctx.arc(lampX,lampY,Math.max(2,r*.055),0,Math.PI*2);ctx.fill();ctx.restore();
  }

  function drawSub(x, y, r, now) {
    const bob = Math.sin(now * 0.0012) * r * 0.12;
    y += bob;
    ctx.save();
    ctx.translate(x, y);
    // pressure hull and syntactic-foam shell, based on a modern crewed research submersible
    const hull=ctx.createLinearGradient(0,-r,0,r);hull.addColorStop(0,'#fff1a8');hull.addColorStop(.46,'#d9a629');hull.addColorStop(1,'#8d5c0d');ctx.fillStyle=hull;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.5, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    // acrylic viewport with glass reflections
    ctx.fillStyle = '#071620';ctx.beginPath(); ctx.arc(r * 0.55, 0, r * 0.36, 0, Math.PI * 2); ctx.fill();
    const glass=ctx.createRadialGradient(r*.46,-r*.1,0,r*.55,0,r*.3);glass.addColorStop(0,'#b8efff');glass.addColorStop(.35,'#347f9c');glass.addColorStop(1,'#06141e');ctx.fillStyle=glass;
    ctx.beginPath(); ctx.arc(r * 0.55, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // frame, thrusters and manipulator
    ctx.strokeStyle='#7b8b8d';ctx.lineWidth=r*.1;ctx.beginPath();ctx.moveTo(-r*1.15,r*.52);ctx.lineTo(r*.85,r*.62);ctx.stroke();
    ctx.fillStyle='#17262c';ctx.beginPath();ctx.ellipse(-r*1.05,-r*.48,r*.34,r*.24,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(-r*1.05,r*.48,r*.34,r*.24,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#a6b4b2';ctx.lineWidth=r*.07;ctx.beginPath();ctx.moveTo(r*.95,r*.42);ctx.lineTo(r*1.45,r*.72);ctx.lineTo(r*1.72,r*.55);ctx.stroke();
    // headlight
    ctx.fillStyle = '#fff4d2';
    ctx.beginPath(); ctx.arc(r * 1.4, 0, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle='#e9c84d';ctx.fillRect(-r*.35,-r*.96,r*.5,r*.28);ctx.fillStyle='#1c262a';ctx.fillRect(-r*.22,-r*1.18,r*.12,r*.25);
    ctx.restore();
  }

  requestAnimationFrame(draw);

  /* ══════════════════════════════════════════
     RULER
  ══════════════════════════════════════════ */
  const rulerEl = document.getElementById('oz-ruler');
  ZONES.forEach(z => {
    const seg = document.createElement('div');
    seg.className = 'oz-ruler-seg';
    seg.style.flexGrow = (z.max - z.min);
    seg.style.background = rgbStr(z.color);
    rulerEl.appendChild(seg);
  });
  const marker = document.createElement('div');
  marker.className = 'oz-ruler-marker';
  rulerEl.appendChild(marker);

  function updateRulerMarker() {
    const frac = clamp(state.depth / 11000, 0, 1);
    marker.style.top = (frac * 100) + '%';
  }

  /* ══════════════════════════════════════════
     UI: zone cards
  ══════════════════════════════════════════ */
  const zoneScroll = document.getElementById('zone-scroll');
  ZONES.forEach(z => {
    const card = document.createElement('div');
    card.className = 'zn-card';
    card.dataset.id = z.id;
    card.tabIndex = 0; card.setAttribute('role','button'); card.setAttribute('aria-label','Dive to '+z.name);
    card.innerHTML = '<div class="zn-icon">' + z.icon + '</div><div class="zn-name">' + z.name + '</div><div class="zn-range">' +
      (z.max >= 11000 ? z.min.toLocaleString() + '+ m' : z.min.toLocaleString() + '–' + z.max.toLocaleString() + ' m') + '</div>';
    card.addEventListener('click', () => { stopDive(); setDepth(z.jump); });
    card.addEventListener('keydown', ev => { if (ev.key==='Enter' || ev.key===' ') { ev.preventDefault(); stopDive(); setDepth(z.jump); } });
    zoneScroll.appendChild(card);
  });

  const modelStage=document.getElementById('oz-model-stage');
  const modelCredit=document.getElementById('oz-model-credit');
  const oceanOuter=document.getElementById('oz-outer');
  const layerDossier=document.getElementById('oz-layer-dossier');
  let briefingTimer=null, briefingAuto=false;
  function layerLightLabel(depth) {
    const light=lightPct(depth);
    if(depth>=1000)return '0%';
    if(light<.01)return '<0.01%';
    return light.toFixed(light<1?2:0)+'%';
  }
  function hideLayerBriefing() {
    clearTimeout(briefingTimer);briefingTimer=null;
    layerDossier.classList.remove('open');
    oceanOuter.classList.remove('layer-briefing-open');
  }
  function showLayerBriefing(zone,autoClose) {
    if(modelStage.firstChild)dismissModel();
    const impact=ZONE_IMPACT[zone.id], details=ZONE_DETAILS[zone.id], reference=impact.reference;
    const range=zone.max>=11000?zone.min.toLocaleString()+'–11,000 m':zone.min.toLocaleString()+'–'+zone.max.toLocaleString()+' m';
    layerDossier.style.setProperty('--zone-accent',impact.accent);
    layerDossier.innerHTML='<button class="oz-dossier-close" type="button" aria-label="Close layer briefing">×</button><div class="oz-dossier-eyebrow">'+zone.icon+' '+zone.latin+' · '+range+'</div><h2 class="oz-dossier-title">'+zone.name+'</h2><div class="oz-dossier-headline">'+impact.headline+'</div><p class="oz-dossier-lead">'+impact.lead+'</p><div class="oz-dossier-stats"><div class="oz-dossier-stat"><small>Pressure</small><strong>'+Math.round(pressureAtm(reference)).toLocaleString()+' atm</strong><span>at '+reference.toLocaleString()+' m</span></div><div class="oz-dossier-stat"><small>Temperature</small><strong>'+tempC(reference).toFixed(1)+' °C</strong><span>representative model</span></div><div class="oz-dossier-stat"><small>Sunlight</small><strong>'+layerLightLabel(reference)+'</strong><span>surface irradiance</span></div></div><div class="oz-dossier-forces"><div class="oz-dossier-force"><strong>Energy source</strong>'+details.energy+'</div><div class="oz-dossier-force"><strong>Survival pressure</strong>'+details.challenge+'</div></div><p class="oz-dossier-impact">'+impact.takeaway+'</p>';
    layerDossier.querySelector('.oz-dossier-close').addEventListener('click',hideLayerBriefing);
    briefingAuto=!!autoClose;
    clearTimeout(briefingTimer);
    requestAnimationFrame(()=>{layerDossier.classList.add('open');oceanOuter.classList.add('layer-briefing-open');});
    if(briefingAuto)briefingTimer=setTimeout(hideLayerBriefing,6000);
  }
  layerDossier.addEventListener('mouseenter',()=>clearTimeout(briefingTimer));
  layerDossier.addEventListener('mouseleave',()=>{if(briefingAuto){clearTimeout(briefingTimer);briefingTimer=setTimeout(hideLayerBriefing,1800);}});
  document.getElementById('oz-brief-button').addEventListener('click',()=>showLayerBriefing(zoneAt(state.depth),false));
  const TOTAL_LIFEFORMS=Object.values(CREATURES).reduce((sum,list)=>sum+list.length,0);
  let discoveredLifeforms=new Set();
  try { discoveredLifeforms=new Set(JSON.parse(sessionStorage.getItem('ocean-zone-discoveries')||'[]')); } catch(e) { discoveredLifeforms=new Set(); }
  let discoveryToastTimer=null;
  function discoveryKey(zone,c) { return zone.id+':'+c.kind; }
  function updateDiscoveryHud(zone) {
    const creatures=CREATURES[zone.id]||[];
    const zoneCount=creatures.filter(c=>discoveredLifeforms.has(discoveryKey(zone,c))).length;
    document.getElementById('zone-discovery-count').textContent=zoneCount+'/'+creatures.length;
    document.getElementById('total-discovery-count').textContent=discoveredLifeforms.size+'/'+TOTAL_LIFEFORMS;
    document.getElementById('oz-discovery-fill').style.width=(100*discoveredLifeforms.size/TOTAL_LIFEFORMS).toFixed(1)+'%';
  }
  function recordDiscovery(zone,c,bubble) {
    const key=discoveryKey(zone,c);
    if(discoveredLifeforms.has(key))return;
    discoveredLifeforms.add(key);
    try { sessionStorage.setItem('ocean-zone-discoveries',JSON.stringify([...discoveredLifeforms])); } catch(e) {}
    bubble.classList.add('discovered','just-discovered');
    setTimeout(()=>bubble.classList.remove('just-discovered'),800);
    updateDiscoveryHud(zone);
    const zoneDone=(CREATURES[zone.id]||[]).every(item=>discoveredLifeforms.has(discoveryKey(zone,item)));
    const toast=document.getElementById('oz-discovery-toast');
    toast.textContent=zoneDone?'Zone catalogued · all six lifeforms logged':'New discovery logged · '+discoveredLifeforms.size+' of '+TOTAL_LIFEFORMS;
    toast.classList.add('show');
    clearTimeout(discoveryToastTimer);discoveryToastTimer=setTimeout(()=>toast.classList.remove('show'),2400);
  }
  function licenseUrl(label) {
    if(label==='CC0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
    if(label.indexOf('BY-SA')>=0) return 'https://creativecommons.org/licenses/by-sa/4.0/';
    if(label.indexOf('BY-NC')>=0) return 'https://creativecommons.org/licenses/by-nc/4.0/';
    return 'https://creativecommons.org/licenses/by/4.0/';
  }
  function imageCredit(c) {
    if(!c.model) return 'Field-guide illustration for this lesson · no verified open 3D model exists, so no substitute is shown';
    return 'Render of the 3D model by '+c.author+' on Sketchfab · '+c.license;
  }
  function lifeformImageFile(c) {
    return c.image||(c.kind+(c.model?'.jpg':'.png'));
  }
  function showModel(c) {
    hideLayerBriefing();
    spotlightCreature=c.name;
    oceanOuter.classList.add('specimen-open');
    modelCredit.hidden=false;
    const profile=!c.model;
    const zone=zoneAt(state.depth), details=ZONE_DETAILS[zone.id];
    const currentLight=lightPct(state.depth);
    const lightLabel=state.depth>=1000?'no sunlight':(currentLight<.01?'<0.01% light':currentLight.toFixed(currentLight<1?2:0)+'% light');
    const liveConditions=Math.round(state.depth).toLocaleString()+' m · '+Math.round(pressureAtm(state.depth)).toLocaleString()+' atm · '+tempC(state.depth).toFixed(1)+' °C · '+lightLabel;
    const status=profile?(c.role||'Hadal lifeform'):'Verified open-license model';
    const renderButton=profile?'':'<button class="oz-load-model" type="button">Render 3D model <span>· loads on request</span></button>';
    modelStage.innerHTML='<div class="oz-model-preview"><article class="oz-specimen-card'+(profile?' field-profile':'')+'"><button class="oz-close-model" type="button" aria-label="Close specimen">×</button><div class="oz-specimen-visual"><span class="oz-specimen-image-label">'+(profile?'Field-guide illustration':'Model render')+'</span><figure data-zoomable><img src="../../assets/images/ocean-lifeforms/'+lifeformImageFile(c)+'" alt="'+c.name+' ('+c.latin+')" width="256" height="144"><figcaption><span class="oz-cap-kind">'+zone.name+' · '+c.length+'</span><strong>'+c.name+'</strong> '+c.fact+'<span class="oz-cap-credit">'+imageCredit(c)+'</span></figcaption></figure></div><div class="oz-specimen-copy"><span class="oz-model-kicker">'+(profile?'Hadal field profile':'Lifeform fact')+'</span><strong class="oz-model-name">'+c.name+'</strong><span class="oz-model-latin">'+c.latin+'</span><p class="oz-specimen-fact">'+c.fact+'</p><p class="oz-specimen-context"><strong>'+zone.name+':</strong> Energy comes from '+details.energy.toLowerCase()+'. The central challenge is '+details.challenge.toLowerCase()+'.</p><div class="oz-specimen-meta"><span>Size: '+c.length+'</span><span>'+status+'</span><span>Live conditions: '+liveConditions+'</span></div>'+renderButton+'</div></article></div>';
    modelStage.querySelector('.oz-close-model').addEventListener('click',dismissModel);
    if(profile) {
      modelCredit.textContent='Hadal field profile · no verified exact open 3D model, so no substitute is shown';
      return;
    }
    modelStage.querySelector('.oz-load-model').addEventListener('click',()=>loadInteractiveModel(c));
    const modelUrl='https://sketchfab.com/3d-models/'+c.model;
    modelCredit.innerHTML='<a href="'+modelUrl+'" target="_blank" rel="noopener">'+c.name+' model</a> by '+c.author+' · <a href="'+licenseUrl(c.license)+'" target="_blank" rel="noopener">'+c.license+'</a> · loads only when requested';
  }
  function loadInteractiveModel(c) {
    modelStage.innerHTML='<div class="oz-model-live"><button class="oz-textbook-back" type="button">← Textbook image</button><button class="oz-close-model" type="button" aria-label="Close interactive model">×</button><span class="oz-model-loading">Initializing interactive model…</span></div>';
    const live=modelStage.querySelector('.oz-model-live');
    live.querySelector('.oz-textbook-back').addEventListener('click',()=>showModel(c));
    live.querySelector('.oz-close-model').addEventListener('click',dismissModel);
    const iframe=document.createElement('iframe');
    iframe.title='Interactive 3D model of '+c.name;
    iframe.src='https://sketchfab.com/models/'+c.model+'/embed?autostart=1&transparent=1&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_hint=0&dnt=1';
    iframe.allow='autoplay; fullscreen; xr-spatial-tracking';iframe.allowFullscreen=true;iframe.loading='lazy';iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.addEventListener('load',()=>{const loading=live.querySelector('.oz-model-loading');if(loading)loading.remove();});
    live.appendChild(iframe);
    const modelUrl='https://sketchfab.com/3d-models/'+c.model;
    modelCredit.innerHTML='<a href="'+modelUrl+'" target="_blank" rel="noopener">'+c.name+' 3D model</a> by '+c.author+' · <a href="'+licenseUrl(c.license)+'" target="_blank" rel="noopener">'+c.license+'</a> · drag to rotate, scroll to zoom';
  }

  function dismissModel() {
    modelStage.innerHTML='';
    modelCredit.hidden=true;
    oceanOuter.classList.remove('specimen-open');
    spotlightCreature = null;
    document.querySelectorAll('.lifeform-bubble.active').forEach(b=>b.classList.remove('active'));
  }

  const lifeformPositions=[
    {x:29,y:34},{x:45,y:58},{x:61,y:35},{x:76,y:62},{x:49,y:78},{x:83,y:43}
  ];
  function lifeformFieldFor(zone) {
    const field=document.getElementById('lifeform-field');
    field.innerHTML='';
    dismissModel();
    const creatures=CREATURES[zone.id] || [];
    creatures.forEach((c,index) => {
      const bubble=document.createElement('button');
      const specimenType=c.model ? 'interactive 3D specimen' : 'field guide profile';
      const pos=lifeformPositions[index%lifeformPositions.length];
      bubble.type='button';
      bubble.className='lifeform-bubble'+(c.model?'':' profile');
      bubble.dataset.kind=c.kind;
      bubble.dataset.group=c.group;
      bubble.style.setProperty('--x',pos.x+'%');
      bubble.style.setProperty('--y',pos.y+'%');
      bubble.style.setProperty('--delay',(index*.13)+'s');
      bubble.style.setProperty('--float',(3.4+(index%3)*.65)+'s');
      bubble.setAttribute('aria-label','Inspect '+c.name+', '+c.length+', '+specimenType);
      bubble.innerHTML='<span class="lifeform-drift"><span class="lifeform-orb"><img src="../../assets/images/ocean-lifeforms/'+lifeformImageFile(c)+'" alt="" width="256" height="144" decoding="async"></span><span class="lifeform-label">'+c.name+'</span></span>';
      if(discoveredLifeforms.has(discoveryKey(zone,c)))bubble.classList.add('discovered');
      bubble.addEventListener('click', () => {
        field.querySelectorAll('.lifeform-bubble').forEach(x=>x.classList.remove('active'));
        bubble.classList.add('active');
        recordDiscovery(zone,c,bubble);
        showModel(c);
        document.getElementById('fact-card').innerHTML = '<strong><em>' + c.latin + '</em> · ' + c.length + '</strong>' + c.fact;
      });
      field.appendChild(bubble);
    });
    updateDiscoveryHud(zone);
  }

  const noteIndexes={sunlight:0,twilight:0,midnight:0,abyss:0,trench:0};
  function renderZoneNote(zone) {
    const details=ZONE_DETAILS[zone.id], index=noteIndexes[zone.id]%details.facts.length;
    document.getElementById('zone-note-count').textContent='Field note '+(index+1)+' of '+details.facts.length;
    document.getElementById('zone-note-text').textContent=details.facts[index];
  }
  function renderEcology(zone) {
    const details=ZONE_DETAILS[zone.id];
    document.getElementById('eco-energy').textContent=details.energy;
    document.getElementById('eco-challenge').textContent=details.challenge;
    document.getElementById('bio-chips').innerHTML=details.biodiversity.map(name=>'<span class="bio-chip">'+name+'</span>').join('');
    renderZoneNote(zone);
  }
  document.getElementById('next-zone-note').addEventListener('click',()=>{
    const zone=zoneAt(state.depth);noteIndexes[zone.id]=(noteIndexes[zone.id]+1)%ZONE_DETAILS[zone.id].facts.length;renderZoneNote(zone);
  });

  let enteredZoneAt=0;
  function updateJourney(depth,zone) {
    const index=ZONES.indexOf(zone), span=zone.max-zone.min, progress=clamp((depth-zone.min)/span,0,1);
    const next=ZONES[index+1], remaining=zone.max-depth, threshold=Math.min(700,Math.max(45,span*.16));
    let mode=state.diving?'Descending through':'Exploring', title=zone.icon+' '+zone.name, approach=false;
    if(next && remaining<=threshold) { mode='Approaching';title=next.icon+' '+next.name;approach=true; }
    else if(performance.now()-enteredZoneAt<2400 && depth>0) { mode='Now entering'; approach=true; }
    let meta=zone.min.toLocaleString()+'–'+zone.max.toLocaleString()+' m';
    if(next) meta+=' · '+next.name+' begins in '+Math.max(0,Math.round(remaining)).toLocaleString()+' m';
    else meta+=' · Challenger Deep is approximately 10,935 m';
    document.getElementById('journey-mode').textContent=mode;
    document.getElementById('journey-title').textContent=title;
    document.getElementById('journey-meta').textContent=meta;
    document.getElementById('journey-progress').style.width=(progress*100).toFixed(1)+'%';
    document.getElementById('oz-journey').classList.toggle('approach',approach);
  }

  let currentZoneId = null;
  function updateUI() {
    const depth = state.depth;
    const zone = zoneAt(depth);

    document.getElementById('v-depth').textContent = Math.round(depth).toLocaleString() + ' m';
    document.getElementById('s-depth').value = depth;
    document.getElementById('depth-badge').textContent = Math.round(depth).toLocaleString() + ' m';
    document.getElementById('zone-name-badge').textContent = zone.icon + ' ' + zone.name;

    document.getElementById('out-depth').textContent = Math.round(depth).toLocaleString() + ' m';
    const pAtm=pressureAtm(depth);
    document.getElementById('out-pressure').textContent = Math.round(pAtm).toLocaleString() + ' atm';
    document.getElementById('out-temp').textContent = tempC(depth).toFixed(1) + ' °C';
    const light=lightPct(depth);
    document.getElementById('out-light').textContent = depth >= 1000 ? '0%' : light < .001 ? '<0.001%' : light.toFixed(depth > 100 ? 2 : 0) + '%';

    const condition = depth < 200
      ? '<strong>Photic water</strong> · Enough sunlight remains for photosynthesis; visibility varies greatly with plankton and sediment.'
      : depth < 1000
        ? '<strong>Disphotic water</strong> · Too dim for photosynthesis. Many animals migrate upward after sunset.'
        : depth < 4000
          ? '<strong>Aphotic water</strong> · No sunlight; ' + (pAtm*.101325).toFixed(0) + ' MPa absolute pressure. Bioluminescence is the dominant natural light.'
          : depth < 6000
            ? '<strong>Abyssal seafloor</strong> · Near-freezing, food-limited habitat supplied mostly from the upper ocean.'
            : '<strong>Hadal trench</strong> · Isolated steep-sided habitat. Fish disappear below roughly 8.2–8.4 km, but invertebrates and microbes continue deeper.';
    document.getElementById('oz-condition').innerHTML=condition;

    document.querySelectorAll('.zn-card').forEach(c => c.classList.toggle('active', c.dataset.id === zone.id));

    if (zone.id !== currentZoneId) {
      currentZoneId = zone.id;
      enteredZoneAt=performance.now();
      lifeformFieldFor(zone);
      renderEcology(zone);
      document.getElementById('fact-card').innerHTML = '<strong>' + zone.name + ' (' + zone.latin + ') · ' +
        (zone.max >= 11000 ? zone.min.toLocaleString() + '+ m' : zone.min.toLocaleString() + '–' + zone.max.toLocaleString() + ' m') +
        '</strong>' + zone.desc;
      showLayerBriefing(zone,true);
    }

    updateJourney(depth,zone);
    updateRulerMarker();
    depthListeners.forEach(fn => fn(depth, zone));
  }

  const depthListeners = [];
  // Lesson sections below the sim ("Dive here" buttons, synced readouts) talk to it through this.
  window.OceanDive = {
    zones: ZONES,
    pressureAtm, tempC, lightPct,
    get depth() { return state.depth; },
    setDepth(d) { stopDive(); setDepth(d); },
    onDepth(fn) { depthListeners.push(fn); fn(state.depth, zoneAt(state.depth)); },
  };

  function setDepth(d) {
    state.depth = clamp(d, 0, 11000);
    updateUI();
  }

  document.getElementById('s-depth').addEventListener('input', function () {
    stopDive();
    setDepth(parseFloat(this.value));
  });

  window.addEventListener('keydown', function(ev){
    if(ev.key==='Escape'){
      if(layerDossier.classList.contains('open'))hideLayerBriefing();
      else if(modelStage.firstChild)dismissModel();
      return;
    }
    // The page scrolls now, so arrow/space steering only applies while the ocean view has focus.
    if(ev.target!==outer)return;
    if(ev.key==='ArrowDown'){ev.preventDefault();stopDive();setDepth(state.depth+(ev.shiftKey?500:50));}
    if(ev.key==='ArrowUp'){ev.preventDefault();stopDive();setDepth(state.depth-(ev.shiftKey?500:50));}
    if(ev.key===' '){ev.preventDefault();document.getElementById('dive-btn').click();}
  });

  /* ══════════════════════════════════════════
     DIVE ANIMATION
  ══════════════════════════════════════════ */
  let diveRAF=null, diveLegs=[], diveLegIndex=0, legStart=0, legFromDepth=0, holdUntil=0;
  const DIVE_PLAN=[
    {end:200,duration:8000},
    {end:1000,duration:9000},
    {end:4000,duration:11000},
    {end:6000,duration:9000},
    {end:11000,duration:13000},
  ];

  function buildDiveLegs(from) {
    return DIVE_PLAN.filter(leg=>leg.end>from).map((leg,index)=>{
      if(index>0)return {...leg};
      const start=leg.end===200?0:DIVE_PLAN[DIVE_PLAN.indexOf(leg)-1].end;
      const fraction=clamp((leg.end-from)/(leg.end-start),0,1);
      return {end:leg.end,duration:Math.max(2800,leg.duration*fraction)};
    });
  }

  function stopDive() {
    state.diving = false;
    document.getElementById('dive-btn').textContent = '🤿 Start the Dive';
    document.getElementById('dive-btn').classList.remove('active');
    if (diveRAF) cancelAnimationFrame(diveRAF);
    diveRAF=null;legStart=0;holdUntil=0;
    updateJourney(state.depth,zoneAt(state.depth));
  }

  function diveTick(ts) {
    if (!state.diving) return;
    if(holdUntil) {
      if(ts<holdUntil){diveRAF=requestAnimationFrame(diveTick);return;}
      holdUntil=0;legStart=0;legFromDepth=state.depth;
    }
    const leg=diveLegs[diveLegIndex];
    if(!leg){stopDive();return;}
    if (!legStart) { legStart=ts;legFromDepth=state.depth; }
    const t=clamp((ts-legStart)/leg.duration,0,1);
    const eased=t*t*(3-2*t);
    setDepth(lerp(legFromDepth,leg.end,eased));
    if(t>=1){
      diveLegIndex++;
      if(diveLegIndex>=diveLegs.length){stopDive();return;}
      holdUntil=ts+900;
    }
    diveRAF = requestAnimationFrame(diveTick);
  }

  document.getElementById('dive-btn').addEventListener('click', function () {
    if (state.diving) { stopDive(); return; }
    if (state.depth >= 10900) setDepth(0);
    state.diving=true;diveLegs=buildDiveLegs(state.depth);diveLegIndex=0;legStart=0;holdUntil=0;
    this.textContent = '⏸ Pause Dive';
    this.classList.add('active');
    diveRAF = requestAnimationFrame(diveTick);
  });

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  setDepth(0);
})();
