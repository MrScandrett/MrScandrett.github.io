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
      biodiversity:[
        { name:'Phytoplankton', latin:'Diatoms & Dinoflagellates', role:'Primary producer', depth:'0–100 m', dive:30, fact:'Microscopic single-celled algae that perform over 40% of all solar photosynthesis on Earth, producing much of our oxygen.' },
        { name:'Antarctic Krill', latin:'Euphausia superba', role:'Keystone herbivore', depth:'0–200 m', dive:60, fact:'Small bioluminescent crustaceans forming swarms of trillions, transferring solar energy from micro-algae to whales and penguins.' },
        { name:'Copepods', latin:'Calanoida', role:'Primary consumer', depth:'0–200 m', dive:50, fact:'The most numerous multicellular animals on Earth by individual count, grazing on phytoplankton and feeding thousands of fish species.' },
        { name:'Moon Jelly', latin:'Aurelia aurita', role:'Drifting predator', depth:'0–150 m', dive:40, fact:'Translucent bell pulses to create gentle water vortices that draw plankton and copepods into mucus-covered oral arms.' },
        { name:'Flying Fish', latin:'Cheilopogon heterurus', role:'Epipelagic forager', depth:'0–20 m', dive:10, fact:'Accelerates underwater with 70 tail beats per second, bursts through the surface, and glides over 100 metres on enlarged pectoral fins.' },
        { name:'Pacific Bluefin Tuna', latin:'Thunnus orientalis', role:'Apex pelagic predator', depth:'0–200 m', dive:70, fact:'Streamlined torpedo body with counter-current vascular heat exchangers keeping swimming muscles significantly warmer than surrounding seawater.' },
        { name:'Leatherback Turtle', latin:'Dermochelys coriacea', role:'Pelagic gelatinivore', depth:'0–1,000+ m', dive:100, fact:'Feeds on large jellyfish and dives deeper than any other reptile, protected by thick insulating oily skin and collapsible lungs.' },
        { name:'Great White Shark', latin:'Carcharodon carcharias', role:'Apex predator', depth:'0–1,200 m', dive:80, fact:'Navigates thousands of kilometres across open ocean, detecting minute microvolt electrical fields from prey heartbeats using ampullae of Lorenzini.' },
        { name:'Bottlenose Dolphin', latin:'Tursiops truncatus', role:'Social odontocete', depth:'0–200 m', dive:20, fact:'Uses high-frequency echolocation clicks to construct detailed acoustic maps of fish schools in three-dimensional open water.' },
        { name:'Manta Ray', latin:'Mobula birostris', role:'Pelagic filter feeder', depth:'0–120 m', dive:45, fact:'With a wingspan up to 7 metres, it funnels plankton-rich surface currents into its gill-raker filters using paddle-like cephalic lobes.' },
        { name:'Ocean Sunfish', latin:'Mola mola', role:'Basking gelatinivore', depth:'0–200 m', dive:90, fact:'The heaviest bony fish on Earth (up to 2 tonnes); basks flat on the surface to warm its body after deep jellyfish-hunting dives.' },
        { name:'Portuguese Man o’ War', latin:'Physalia physalis', role:'Colonial siphonophore', depth:'Surface 0 m', dive:5, fact:'Not a single jellyfish, but a colony of four specialized zooid types propelled by an asymmetric gas sail and trailing venomous fishing tentacles.' },
        { name:'Sargassum Community', latin:'Sargassum fluitans', role:'Floating habitat provider', depth:'Surface 0 m', dive:5, fact:'Floating rafts of golden macroalgae kept buoyant by gas vesicles, sheltering hundreds of specialized endemic crabs, shrimp, and juvenile fishes.' },
        { name:'Humpback Whale', latin:'Megaptera novaeangliae', role:'Migratory baleen whale', depth:'0–200 m', dive:35, fact:'Engulfs entire schools of krill and capelin by lunging with expandable pleated throat grooves, often after blowing spiraling bubble nets.' }
      ],
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
      biodiversity:[
        { name:'Lanternfish', latin:'Myctophidae', role:'Diel vertical migrator', depth:'200–1,000 m', dive:500, fact:'Dominates the world’s vertebrate biomass; rises into the sunlit surface every night by the billions to feast on copepods, returning before dawn.' },
        { name:'Bristlemouth', latin:'Cyclothone signata', role:'Mesopelagic predator', depth:'300–1,000 m', dive:650, fact:'Widely believed to be the most abundant vertebrate on Earth, with hundreds of trillions patrolling twilight depths worldwide.' },
        { name:'Marine Hatchetfish', latin:'Argyropelecus', role:'Counterillumination master', depth:'200–800 m', dive:450, fact:'Ultra-narrow silver body with belly photophores matching the exact intensity and color of filtered blue downwelling sunlight.' },
        { name:'Pacific Viperfish', latin:'Chauliodus macouni', role:'Fanged ambush hunter', depth:'250–1,000 m', dive:700, fact:'Carries needle fangs so long they do not fit inside its mouth; hinges its skull backward to spear passing squid and lanternfish.' },
        { name:'Vampire Squid', latin:'Vampyroteuthis infernalis', role:'Detritivore', depth:'600–900 m', dive:800, fact:'Unrolls long sticky sensory filaments to harvest sinking marine snow in oxygen-depleted layers without wasting energy hunting.' },
        { name:'Stoplight Loosejaw', latin:'Malacosteus niger', role:'Red-light hunter', depth:'500–1,000 m', dive:750, fact:'Produces invisible far-red bioluminescence and possesses special retinal pigments to detect crimson shrimp in total darkness.' },
        { name:'Barreleye Fish', latin:'Macropinna microstoma', role:'Tubular-eyed hunter', depth:'400–800 m', dive:600, fact:'A transparent fluid-filled dome over its head encases glowing green tubular eyes that rotate upward to spot the silhouettes of siphonophores.' },
        { name:'Giant Siphonophore', latin:'Praya dubia', role:'Colonial predator', depth:'300–1,000 m', dive:550, fact:'Reaches over 40 metres in length, trailing thousands of stinging tentacles that form a deadly curtain in the twilight drift.' },
        { name:'Comb Jelly (Ctenophore)', latin:'Beroe / Mertensia', role:'Iridescent predator', depth:'200–1,000 m', dive:400, fact:'Eight longitudinal rows of microscopic cilia beat in sequence, diffracting light into shimmering rainbow bands and flashing bioluminescent blue.' },
        { name:'Glass Octopus', latin:'Vitreledonella alberti', role:'Transparent cephalopod', depth:'300–1,000 m', dive:650, fact:'Almost entirely transparent; only its narrow digestive gland and rectangular optic eyes cast shadows in the dim blue downwelling light.' },
        { name:'Snipe Eel', latin:'Nemichthys scolopaceus', role:'Slender forager', depth:'400–1,000 m', dive:750, fact:'Bird-like curving jaws covered in tiny backward recurved teeth that snare the long, delicate antennae of passing deep-sea shrimp.' },
        { name:'Pelagic Salp Chain', latin:'Salpa fusiformis', role:'Rapid filter feeder', depth:'200–800 m', dive:350, fact:'Barrel-shaped gelatinous tunicates linked into colonies metres long, pumping water through internal mucous nets to vacuum down marine snow.' }
      ],
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
      biodiversity:[
        { name:'Deep-sea Anglerfish', latin:'Ceratiidae', role:'Bioluminescent lure hunter', depth:'1,000–3,500 m', dive:2000, fact:'Females carry an illicium fishing rod with an esca lure packed with glowing symbiotic bacteria to entice prey in the pitch dark.' },
        { name:'Giant Squid', latin:'Architeuthis dux', role:'Apex bathypelagic predator', depth:'1,000–2,500 m', dive:1800, fact:'Features 27-centimetre dinner-plate eyes and toothed tentacle suckers; hunts deep-sea fishes and battles diving sperm whales.' },
        { name:'Colossal Squid', latin:'Mesonychoteuthis hamiltoni', role:'Heavyweight cephalopod', depth:'1,200–3,000 m', dive:2200, fact:'Heavier than the giant squid, armed with sharp swiveling hooks along its tentacle clubs for impaling Antarctic toothfish.' },
        { name:'Pelican Eel', latin:'Eurypharynx pelecanoides', role:'Expandable gulper', depth:'1,000–3,000 m', dive:2400, fact:'Enormous loose-hinged pouch jaw allows it to engulf whole swarms of crustaceans; tail tip glows with a pink bioluminescent beacon.' },
        { name:'Black Swallower', latin:'Chiasmodon niger', role:'Opportunistic carnivore', depth:'1,000–2,700 m', dive:1900, fact:'A highly distensible stomach expands like a rubber balloon to swallow bony fishes more than double its length and ten times its mass.' },
        { name:'Dumbo Octopus', latin:'Grimpoteuthis', role:'Benthic/pelagic cirrate', depth:'1,000–4,000 m', dive:2800, fact:'Ear-like fins flap gracefully like elephant ears, hovering effortlessly over the sediment without wasting precious metabolic energy.' },
        { name:'Fangtooth', latin:'Anoplogaster cornuta', role:'Armored predator', depth:'1,000–3,000 m', dive:1600, fact:'Possesses the largest teeth proportional to body size of any marine fish, with pockets in its braincase to house bottom fangs when jaws close.' },
        { name:'Deep-sea Dragonfish', latin:'Stomiidae', role:'Bioluminescent predator', depth:'1,000–2,000 m', dive:1500, fact:'Equipped with chin barbels tipped with glowing lures, large fangs, and photophore light organs running along its lateral flanks.' },
        { name:'Marrus Siphonophore', latin:'Marrus claudanielis', role:'Coordinated colony', depth:'1,000–2,500 m', dive:2100, fact:'A colonial super-organism with specialized nectophores for propulsion and stomach zooids sharing nutrients via a central stem canal.' },
        { name:'Coffinfish', latin:'Chaunax', role:'Inflatable ambush hunter', depth:'1,000–2,500 m', dive:2300, fact:'Walks along deep slopes on modified pectoral fins and can inflate its body with water like a pufferfish to store oxygen.' },
        { name:'Crimson Opossum Shrimp', latin:'Gnathophausia ingens', role:'Deep crustacean', depth:'1,000–3,000 m', dive:1700, fact:'Vibrant ruby-red carapace absorbs deep blue wavelengths, rendering it completely invisible to most midnight predators.' },
        { name:'Bigred Jelly', latin:'Tiburonia granrojo', role:'Armless giant medusa', depth:'1,500–3,500 m', dive:2600, fact:'Reaches 1 metre across; lacks stinging tentacles and instead uses fleshy, velvety dark red feeding arms to capture prey.' }
      ],
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
      biodiversity:[
        { name:'Sea Pig', latin:'Scotoplanes globosa', role:'Abyssal deposit feeder', depth:'4,000–6,000 m', dive:5000, fact:'Translucent pink sea cucumbers marching in herds on hydraulic tube feet across soft sediment, extracting organic detritus.' },
        { name:'Tripod Fish', latin:'Bathypterois grallator', role:'Stilt ambush predator', depth:'4,000–5,800 m', dive:4700, fact:'Three stiffened fin rays extend over 1 metre to elevate the fish above benthic boundary friction, facing upstream to snare copepods.' },
        { name:'Abyssal Grenadier (Rattail)', latin:'Coryphaenoides armatus', role:'Apex abyssal scavenger', depth:'4,000–5,500 m', dive:4500, fact:'Large sensory head detects chemical plumes from distant carcasses; cruises vast distances over barren abyssal plains.' },
        { name:'Giant Isopod', latin:'Bathynomus giganteus', role:'Deep-sea scavenger', depth:'4,000–5,500 m', dive:4200, fact:'Deep-sea gigantism enables this 40-centimetre crustacean to withstand crushing pressure and fast for over 5 years between meal falls.' },
        { name:'Glass Sponge', latin:'Hexactinellida / Euplectella', role:'Structural filter feeder', depth:'4,000–6,000 m', dive:5200, fact:'Weaves an intricate hexagonal skeleton of pure biogenic silica (fiber-optic glass) that anchors into soft ooze and shelters shrimp.' },
        { name:'Deep-sea Brittle Star', latin:'Ophiuroidea', role:'Benthic scavenger', depth:'4,000–6,000 m', dive:4800, fact:'Flexible jointed arms crawl across muddy plains, trapping fallen marine snow particles or scavenging carcass remnants.' },
        { name:'Faceless Cusk Eel', latin:'Typhlonus nasus', role:'Blind benthic forager', depth:'4,000–5,100 m', dive:4600, fact:'Features no visible external eyes and a mouth positioned underneath its gelatinous bulbous snout, vacuuming mud for worms.' },
        { name:'Deep-sea Anemone', latin:'Actiniaria', role:'Sessile ambush predator', depth:'4,000–6,000 m', dive:5100, fact:'Anchored to dropstones and manganese nodules, waving nematocyst-laden tentacles to sting passing amphipods and small crustaceans.' },
        { name:'Benthic Foraminiferan', latin:'Bathyallogromia', role:'Single-celled giant', depth:'4,000–6,000 m', dive:5400, fact:'Gigantic single-celled protozoans extending branching pseudopodia networks to trap marine snow particles settling on seafloor ooze.' },
        { name:'Sea Spider', latin:'Pycnogonida / Colossendeis', role:'Slow-motion predator', depth:'4,000–6,000 m', dive:4900, fact:'Leg span exceeding 60 centimetres; internal organs extend directly into its legs, feeding on cnidarians with a tubular proboscis.' },
        { name:'Crown Jelly', latin:'Periphylla periphylla', role:'Helmet medusa', depth:'4,000–5,500 m', dive:4400, fact:'Deep mahogany bell with a coronal groove; flashes intense blue bioluminescent waves along its margin when touched.' },
        { name:'Bone-eating Worm', latin:'Osedax mucofloris', role:'Whale-fall specialist', depth:'4,000–5,500 m', dive:4300, fact:'Females lack mouths and guts; drill green root-like vascular structures into sunken whale bones, using bacterial symbionts to digest collagen.' }
      ],
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
      biodiversity:[
        { name:'Mariana Snailfish', latin:'Pseudoliparis swirei', role:'Hadal apex predator', depth:'6,000–8,336 m', dive:8000, fact:'The deepest living fish on Earth; soft translucent scaleless body packed with TMAO osmolytes that prevent protein denaturation under 800 atm.' },
        { name:'Supergiant Hadal Amphipod', latin:'Hirondellea gigas', role:'Dominant hadal scavenger', depth:'6,000–10,935 m', dive:10000, fact:'Thrives in thousands at Challenger Deep; possesses unique cellulase enzymes to digest woody plant debris funneled down trench walls.' },
        { name:'Hadal Sea Cucumber', latin:'Elasipodida', role:'Trench deposit feeder', depth:'6,000–10,935 m', dive:9500, fact:'Feeds on organic matter funneled into trench troughs, with gelatinous pressure-tolerant tissues containing over 95% water.' },
        { name:'Hadal Polychaete Worm', latin:'Macellicephala', role:'Burrower & scavenger', depth:'6,000–10,935 m', dive:10500, fact:'Segmented scale worms and bristle worms burrowing through hadal mud, grazing on chemosynthetic biofilms and carcass residue.' },
        { name:'Xenophyophore', latin:'Syringammina fragilissima', role:'Single-celled architect', depth:'6,000–10,600 m', dive:9000, fact:'One of the largest single cells known (up to 20 cm); cements sediment grains into delicate sponge-like tests that create habitat for smaller organisms.' },
        { name:'Piezophile Microbes', latin:'Colwellia marinimembrana', role:'Hadal decomposer', depth:'6,000–10,935 m', dive:10900, fact:'Obligate pressure-loving bacteria and archaea with polyunsaturated fatty acid membranes that remain fluid under 1,100 atm of pressure.' },
        { name:'Hadal Acorn Worm', latin:'Enteropneusta', role:'Deposit consumer', depth:'6,000–9,000 m', dive:8500, fact:'Fragile hemichordates leaving spiral grazing trails on hadal sediment slopes as they ingest organic-rich trench sediments.' },
        { name:'Hadal Bivalves', latin:'Vesicomyidae / Thyasiridae', role:'Chemosynthetic mollusk', depth:'6,000–8,500 m', dive:7500, fact:'Small thick-shelled clams hosting symbiotic sulfide-oxidizing bacteria in their gills at active trench fault seeps.' },
        { name:'Hadal Sea Anemone', latin:'Galatheanthemum', role:'Abyssal/hadal cnidarian', depth:'6,000–10,500 m', dive:10200, fact:'Anchored in rigid chitinous tubes deep in trench sediment, extending stinging tentacles to catch falling amphipods.' },
        { name:'Trench Mysid Shrimp', latin:'Mysida', role:'Free-swimming crustacean', depth:'6,000–8,800 m', dive:8200, fact:'Hovers gracefully in hadal bottom water, sweeping detrital particles funneled downward by underwater landslides.' }
      ],
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
  const liquidSurface = window.LiquidEngine?.createSurface({
    material: 'water', width: 1, restY: 1, columns: 84, maxColumns: 128
  });
  let nextSurfaceImpulse = 0;

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

  /* ══════════════════════════════════════════
     AMBIENT OCEAN FAUNA
  ══════════════════════════════════════════ */
  class AmbientFaunaManager {
    constructor() {
      this.fauna = [
        // SUNLIGHT TIER (0 - 200 m)
        { id:'school_sun', type:'school', isLantern:false, x: 260, y: 140, vx: -38, depthMin: 0, depthMax: 190, count: 14,
          members: Array.from({length: 14}, (_, i) => ({ ox: (i % 5) * 16 - 32 + (i * 3) % 7, oy: Math.floor(i / 5) * 11 - 11, phase: i * 0.7, size: 7 + (i % 3) * 2 })) },
        { id:'tuna_sun', type:'tuna', x: 120, y: 210, vx: 58, vy: -1.5, depthMin: 15, depthMax: 200, size: 38, phase: 0 },
        { id:'turtle_sun', type:'turtle', x: 520, y: 110, vx: -22, vy: 1, depthMin: 0, depthMax: 160, size: 38, phase: 1.2 },
        { id:'manta_sun', type:'manta', x: 70, y: 130, vx: 26, vy: 1.2, depthMin: 0, depthMax: 140, size: 48, phase: 2.1 },
        { id:'jelly_sun1', type:'jelly', isCrown:false, x: 300, y: 160, vx: 7, vy: -7, depthMin: 0, depthMax: 220, size: 19, phase: 0.4 },
        { id:'jelly_sun2', type:'jelly', isCrown:false, x: 440, y: 250, vx: -6, vy: -6, depthMin: 20, depthMax: 210, size: 15, phase: 1.8 },

        // TWILIGHT TIER (200 - 1000 m)
        { id:'lantern_school', type:'school', isLantern:true, x: 480, y: 180, vx: -32, depthMin: 200, depthMax: 1000, count: 10,
          members: Array.from({length: 10}, (_, i) => ({ ox: (i % 4) * 18 - 27, oy: Math.floor(i / 4) * 13 - 13, phase: i * 0.6, size: 9 + (i % 3) * 2 })) },
        { id:'hatchet_tw1', type:'hatchet', x: 260, y: 210, vx: 18, vy: -1, depthMin: 220, depthMax: 880, size: 18, phase: 0.9 },
        { id:'hatchet_tw2', type:'hatchet', x: 400, y: 140, vx: -16, vy: 1, depthMin: 260, depthMax: 920, size: 16, phase: 2.4 },
        { id:'comb_jelly', type:'combjelly', x: 340, y: 200, vx: 11, vy: -5, depthMin: 200, depthMax: 1200, size: 22, phase: 3.1 },
        { id:'siphonophore_col', type:'siphonophore', x: 180, y: 160, vx: 13, vy: 3, depthMin: 250, depthMax: 1600, size: 75, phase: 1.5 },
        { id:'viper_tw', type:'viperfish', x: 520, y: 260, vx: -25, vy: 0, depthMin: 320, depthMax: 1100, size: 30, phase: 4.2 },

        // MIDNIGHT TIER (1000 - 4000 m)
        { id:'squid_mid', type:'squid', x: 560, y: 180, vx: -28, vy: -2, depthMin: 1000, depthMax: 3500, size: 66, phase: 0.8 },
        { id:'angler_mid', type:'angler', x: 300, y: 240, vx: 15, vy: 1, depthMin: 1100, depthMax: 3800, size: 32, phase: 2.7 },
        { id:'gulper_mid', type:'gulpereel', x: 150, y: 210, vx: 20, vy: -2, depthMin: 1200, depthMax: 3600, size: 75, phase: 1.1 },
        { id:'prawn_mid', type:'prawn', x: 410, y: 280, vx: -13, vy: -3, depthMin: 1000, depthMax: 3300, size: 19, phase: 3.8 },
        { id:'dumbo_mid', type:'dumbo', x: 470, y: 220, vx: 14, vy: 2, depthMin: 1400, depthMax: 4100, size: 25, phase: 5.0 },

        // ABYSS TIER (4000 - 6000 m)
        { id:'tripod_aby', type:'tripod', x: 380, y: 310, vx: 0, vy: 0, depthMin: 3900, depthMax: 6000, size: 40, phase: 0 },
        { id:'seapig_aby1', type:'seapig', x: 240, y: 322, vx: 7, vy: 0, depthMin: 4000, depthMax: 6000, size: 26, phase: 1.4 },
        { id:'seapig_aby2', type:'seapig', x: 530, y: 325, vx: -6, vy: 0, depthMin: 4100, depthMax: 6000, size: 23, phase: 3.2 },
        { id:'grenadier_aby', type:'grenadier', x: 180, y: 260, vx: 22, vy: -1.5, depthMin: 3800, depthMax: 5900, size: 44, phase: 2.1 },
        { id:'crown_jelly_aby', type:'jelly', isCrown:true, x: 450, y: 190, vx: -10, vy: -4, depthMin: 3600, depthMax: 5800, size: 25, phase: 4.5 },

        // TRENCH TIER (6000 - 11000 m)
        { id:'snailfish_tr1', type:'snailfish', x: 320, y: 230, vx: 18, vy: 1.5, depthMin: 6000, depthMax: 8400, size: 32, phase: 0.5 },
        { id:'snailfish_tr2', type:'snailfish', x: 510, y: 190, vx: -17, vy: -1.5, depthMin: 6300, depthMax: 8400, size: 27, phase: 2.8 },
        { id:'amphipod_swarm_tr', type:'amphipods', x: 420, y: 270, vx: -12, vy: 2, depthMin: 6000, depthMax: 11000, size: 9,
          members: Array.from({length: 12}, (_, i) => ({ ox: (i % 4) * 9 - 13, oy: Math.floor(i / 4) * 7 - 7, phase: i * 0.9 })) },
        { id:'hadal_worm_tr', type:'polychaete', x: 230, y: 290, vx: 15, vy: -1, depthMin: 6400, depthMax: 11000, size: 36, phase: 1.9 },
        { id:'hadal_cuc_tr', type:'hadalcucumber', x: 490, y: 326, vx: 5, vy: 0, depthMin: 6800, depthMax: 11000, size: 28, phase: 3.5 }
      ];
    }

    update(dt, now, depth) {
      if (!W || !H) return;
      this.fauna.forEach(c => {
        c.x += c.vx * dt;
        c.y += (c.vy || 0) * dt;

        // Keep seafloor-dwellers anchored on the seafloor boundary
        if (c.type === 'tripod') {
          c.y = H * 0.81;
        } else if (c.type === 'seapig' || c.type === 'hadalcucumber') {
          c.y = H * 0.835;
        }

        // Horizontal screen wrap
        if (c.vx > 0 && c.x > W + 90) c.x = -80;
        if (c.vx < 0 && c.x < -90) c.x = W + 80;
      });
    }

    draw(ctx, depth, light, now) {
      if (!W || !H) return;
      const subX = W * 0.17, subY = H * 0.66;
      const lightRatio = lightPct(depth) / 100;

      this.fauna.forEach(c => {
        // Depth-tier visibility window with smooth fade
        if (depth < c.depthMin - 150 || depth > c.depthMax + 150) return;
        const depthAlpha = clamp(Math.min((depth - (c.depthMin - 150)) / 150, ((c.depthMax + 150) - depth) / 150), 0, 1);
        if (depthAlpha <= 0.01) return;

        // Headlight beam illumination calculation
        const dx = c.x - subX, dy = c.y - subY;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const inBeam = lightRatio < 0.55 && dx > -20 && dist < W * 0.44 && Math.abs(angle) < 0.62;
        const beamIntensity = inBeam ? clamp(1 - dist / (W * 0.44), 0, 1) * clamp((0.55 - lightRatio) * 2.2, 0, 1) : 0;

        ctx.save();
        const waveY = (c.type === 'tripod' || c.type === 'seapig' || c.type === 'hadalcucumber') ? 0 : Math.sin(now * 0.0018 + c.phase) * 5;
        ctx.translate(c.x, c.y + waveY);
        if (c.vx < 0) ctx.scale(-1, 1);

        this.renderCreature(ctx, c, depthAlpha, lightRatio, beamIntensity, now);
        ctx.restore();
      });
    }

    renderCreature(ctx, c, alpha, light, beam, now) {
      const lit = beam > 0.08 || light > 0.35;
      const beamGleam = clamp(beam * 1.4, 0, 1);

      switch (c.type) {
        case 'school': {
          c.members.forEach(m => {
            const mx = m.ox, my = m.oy + Math.sin(now * 0.0032 + m.phase) * 4;
            const mTail = Math.sin(now * 0.012 + m.phase) * 3;
            ctx.save();
            ctx.translate(mx, my);

            if (c.isLantern) {
              // Lanternfish silhouette + bioluminescent belly photophores
              const bodyCol = lit ? 'rgba(160,205,230,' + (0.85 * alpha) + ')' : 'rgba(12,24,42,' + (0.75 * alpha) + ')';
              ctx.fillStyle = bodyCol;
              ctx.beginPath(); ctx.ellipse(0, 0, m.size, m.size * 0.36, 0, 0, Math.PI * 2); ctx.fill();
              // Tail fin
              ctx.beginPath(); ctx.moveTo(-m.size * 0.8, 0); ctx.lineTo(-m.size * 1.35, -m.size * 0.4 + mTail); ctx.lineTo(-m.size * 1.1, mTail); ctx.lineTo(-m.size * 1.35, m.size * 0.4 + mTail); ctx.closePath(); ctx.fill();

              // Ventral photophore line
              ctx.fillStyle = 'rgba(95,242,255,' + (0.95 * alpha) + ')';
              ctx.shadowColor = '#5ff2ff'; ctx.shadowBlur = 4;
              for (let p = 0; p < 4; p++) {
                ctx.beginPath(); ctx.arc(-m.size * 0.4 + p * (m.size * 0.3), m.size * 0.28, 1, 0, Math.PI * 2); ctx.fill();
              }
            } else {
              // Surface schooling fish (silvery mackerel/sardines)
              const bodyAlpha = (0.35 + light * 0.45 + beamGleam * 0.3) * alpha;
              ctx.fillStyle = 'rgba(215,245,255,' + bodyAlpha + ')';
              ctx.beginPath(); ctx.ellipse(0, 0, m.size, m.size * 0.32, 0, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.moveTo(-m.size * 0.8, 0); ctx.lineTo(-m.size * 1.3, -m.size * 0.35 + mTail); ctx.lineTo(-m.size * 1.1, mTail); ctx.lineTo(-m.size * 1.3, m.size * 0.35 + mTail); ctx.closePath(); ctx.fill();
              // Specular glint along spine
              ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * alpha) + ')';
              ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-m.size * 0.5, -m.size * 0.12); ctx.lineTo(m.size * 0.5, -m.size * 0.08); ctx.stroke();
            }
            ctx.restore();
          });
          break;
        }

        case 'tuna': {
          const tailWag = Math.sin(now * 0.009 + c.phase) * 6;
          // Body
          ctx.fillStyle = lit ? 'rgba(70,140,195,' + (0.85 * alpha) + ')' : 'rgba(10,35,65,' + (0.75 * alpha) + ')';
          ctx.beginPath(); ctx.ellipse(0, 0, c.size, c.size * 0.34, 0, 0, Math.PI * 2); ctx.fill();
          // Silvery belly countershading
          ctx.fillStyle = lit ? 'rgba(220,245,255,' + (0.9 * alpha) + ')' : 'rgba(80,125,160,' + (0.6 * alpha) + ')';
          ctx.beginPath(); ctx.ellipse(0, c.size * 0.08, c.size * 0.9, c.size * 0.22, 0, 0, Math.PI); ctx.fill();
          // Crescent tail fin
          ctx.fillStyle = lit ? 'rgba(50,110,165,' + (0.85 * alpha) + ')' : 'rgba(8,28,52,' + (0.75 * alpha) + ')';
          ctx.beginPath(); ctx.moveTo(-c.size * 0.85, 0);
          ctx.lineTo(-c.size * 1.45, -c.size * 0.65 + tailWag);
          ctx.lineTo(-c.size * 1.15, tailWag);
          ctx.lineTo(-c.size * 1.45, c.size * 0.65 + tailWag);
          ctx.closePath(); ctx.fill();
          // Yellow finlet hints
          if (lit) {
            ctx.fillStyle = 'rgba(255,215,80,' + (0.8 * alpha) + ')';
            for (let f = 0; f < 3; f++) {
              ctx.beginPath(); ctx.arc(-c.size * 0.5 - f * 6, -c.size * 0.28, 1.5, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(-c.size * 0.5 - f * 6, c.size * 0.28, 1.5, 0, Math.PI * 2); ctx.fill();
            }
          }
          break;
        }

        case 'turtle': {
          const flap = Math.sin(now * 0.0028 + c.phase) * 11;
          // Carapace shell
          ctx.fillStyle = lit ? 'rgba(65,115,95,' + (0.85 * alpha) + ')' : 'rgba(15,40,32,' + (0.7 * alpha) + ')';
          ctx.beginPath(); ctx.ellipse(0, 0, c.size * 0.55, c.size * 0.38, 0, 0, Math.PI * 2); ctx.fill();
          // Head
          ctx.fillStyle = lit ? 'rgba(80,135,110,' + (0.85 * alpha) + ')' : 'rgba(18,48,38,' + (0.7 * alpha) + ')';
          ctx.beginPath(); ctx.ellipse(c.size * 0.65, 0, c.size * 0.16, c.size * 0.12, 0, 0, Math.PI * 2); ctx.fill();
          // Large front flippers
          ctx.beginPath(); ctx.moveTo(c.size * 0.2, -c.size * 0.25);
          ctx.quadraticCurveTo(c.size * 0.1, -c.size * 0.85 + flap, -c.size * 0.2, -c.size * 0.75 + flap);
          ctx.lineTo(-c.size * 0.05, -c.size * 0.2);
          ctx.fill();
          ctx.beginPath(); ctx.moveTo(c.size * 0.2, c.size * 0.25);
          ctx.quadraticCurveTo(c.size * 0.1, c.size * 0.85 - flap, -c.size * 0.2, c.size * 0.75 - flap);
          ctx.lineTo(-c.size * 0.05, c.size * 0.2);
          ctx.fill();
          break;
        }

        case 'manta': {
          const wingFlap = Math.sin(now * 0.0022 + c.phase) * 14;
          ctx.fillStyle = lit ? 'rgba(40,75,100,' + (0.8 * alpha) + ')' : 'rgba(8,24,38,' + (0.65 * alpha) + ')';
          // Diamond body & wings
          ctx.beginPath();
          ctx.moveTo(c.size * 0.45, 0);
          ctx.quadraticCurveTo(c.size * 0.15, -c.size * 0.75 + wingFlap, -c.size * 0.25, -c.size * 0.65 + wingFlap);
          ctx.lineTo(-c.size * 0.35, 0);
          ctx.lineTo(-c.size * 0.25, c.size * 0.65 - wingFlap);
          ctx.quadraticCurveTo(c.size * 0.15, c.size * 0.75 - wingFlap, c.size * 0.45, 0);
          ctx.fill();
          // Cephalic lobes (horns)
          ctx.beginPath(); ctx.moveTo(c.size * 0.45, -c.size * 0.12); ctx.lineTo(c.size * 0.62, -c.size * 0.08); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(c.size * 0.45, c.size * 0.12); ctx.lineTo(c.size * 0.62, c.size * 0.08); ctx.stroke();
          // Long whip tail
          ctx.strokeStyle = lit ? 'rgba(30,60,85,' + (0.75 * alpha) + ')' : 'rgba(6,18,30,' + (0.6 * alpha) + ')';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(-c.size * 0.35, 0);
          ctx.quadraticCurveTo(-c.size * 0.8, Math.sin(now * 0.002 + c.phase) * 5, -c.size * 1.5, Math.sin(now * 0.003 + c.phase) * 8);
          ctx.stroke();
          break;
        }

        case 'jelly': {
          const pulse = Math.sin(now * 0.0024 + c.phase);
          const bellW = c.size * (1 + pulse * 0.14), bellH = c.size * (0.8 - pulse * 0.1);
          ctx.save();
          if (c.isCrown) {
            // Deep-sea Crown Jelly (Periphylla): ruby-crimson in headlight beam, pitch black in dark water!
            const crownCol = lit
              ? 'rgba(215,35,52,' + (0.9 * alpha) + ')'
              : 'rgba(18,12,18,' + (0.55 * alpha) + ')';
            ctx.fillStyle = crownCol;
            ctx.beginPath(); ctx.ellipse(0, 0, bellW, bellH, 0, Math.PI, 0); ctx.fill();
            // Coronal ring groove
            ctx.strokeStyle = lit ? 'rgba(140,15,28,' + (0.85 * alpha) + ')' : 'rgba(8,4,8,' + (0.45 * alpha) + ')';
            ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, bellW * 0.65, Math.PI, 0); ctx.stroke();
          } else {
            // Moon jelly: translucent white-cyan
            const jellyGrad = ctx.createRadialGradient(0, -bellH * 0.2, 0, 0, 0, bellW);
            jellyGrad.addColorStop(0, 'rgba(235,250,255,' + (0.55 * alpha) + ')');
            jellyGrad.addColorStop(0.7, 'rgba(140,225,255,' + (0.28 * alpha) + ')');
            jellyGrad.addColorStop(1, 'rgba(100,200,245,' + (0.05 * alpha) + ')');
            ctx.fillStyle = jellyGrad;
            ctx.beginPath(); ctx.ellipse(0, 0, bellW, bellH, 0, Math.PI, 0); ctx.fill();
          }

          // Trailing tentacles
          ctx.strokeStyle = c.isCrown
            ? (lit ? 'rgba(220,50,65,' + (0.75 * alpha) + ')' : 'rgba(22,14,20,' + (0.45 * alpha) + ')')
            : 'rgba(180,235,255,' + (0.35 * alpha) + ')';
          ctx.lineWidth = 0.9;
          for (let t = -3; t <= 3; t++) {
            const tx = t * (bellW * 0.22);
            ctx.beginPath(); ctx.moveTo(tx, 0);
            const w1 = Math.sin(now * 0.003 + t * 0.8) * 8;
            const w2 = Math.sin(now * 0.002 + t * 0.9) * 12;
            ctx.bezierCurveTo(tx + w1, bellH * 0.8, tx + w2, bellH * 1.6, tx + w1 * 1.5, bellH * 2.4);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }

        case 'hatchet': {
          ctx.save();
          // Hatchet body: high deep chest, abrupt slender tail
          ctx.fillStyle = lit ? 'rgba(195,225,245,' + (0.85 * alpha) + ')' : 'rgba(18,34,52,' + (0.75 * alpha) + ')';
          ctx.beginPath();
          ctx.moveTo(c.size * 0.5, -c.size * 0.1);
          ctx.lineTo(c.size * 0.3, c.size * 0.75);
          ctx.lineTo(-c.size * 0.1, c.size * 0.7);
          ctx.lineTo(-c.size * 0.25, c.size * 0.15);
          ctx.lineTo(-c.size * 0.7, c.size * 0.1);
          ctx.lineTo(-c.size * 0.85, 0);
          ctx.lineTo(-c.size * 0.7, -c.size * 0.1);
          ctx.lineTo(c.size * 0.1, -c.size * 0.25);
          ctx.closePath();
          ctx.fill();

          // Upward-pointing tubular eye
          ctx.fillStyle = lit ? '#061824' : '#030c14';
          ctx.beginPath(); ctx.arc(c.size * 0.32, -c.size * 0.18, 2.2, 0, Math.PI * 2); ctx.fill();

          // Downward counterillumination photophores
          ctx.fillStyle = 'rgba(95,235,255,' + (0.95 * alpha) + ')';
          ctx.shadowColor = '#62e8ff'; ctx.shadowBlur = 5;
          for (let p = 0; p < 5; p++) {
            ctx.fillRect(c.size * 0.22 - p * (c.size * 0.1), c.size * 0.65, 1.8, 3.5);
          }
          ctx.restore();
          break;
        }

        case 'combjelly': {
          ctx.save();
          // Glowing translucent oval
          const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, c.size);
          cg.addColorStop(0, 'rgba(215,245,255,' + (0.65 * alpha) + ')');
          cg.addColorStop(0.8, 'rgba(120,220,255,' + (0.35 * alpha) + ')');
          cg.addColorStop(1, 'rgba(80,180,240,0)');
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.ellipse(0, 0, c.size * 1.35, c.size * 0.85, 0, 0, Math.PI * 2); ctx.fill();

          // Eight animated rainbow cilia comb rows (diffraction iridescence)
          ctx.lineWidth = 1.3;
          for (let r = 0; r < 4; r++) {
            const hue = (now * 0.14 + r * 65) % 360;
            ctx.strokeStyle = 'hsla(' + hue + ', 85%, 68%, ' + (0.85 * alpha) + ')';
            ctx.beginPath();
            const yOffset = (r - 1.5) * (c.size * 0.32);
            ctx.ellipse(0, yOffset, c.size * 1.1, c.size * 0.25, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }

        case 'siphonophore': {
          ctx.save();
          // Chain of colonial nectophores
          ctx.lineWidth = 1;
          for (let b = 0; b < 14; b++) {
            const bx = -c.size * 0.5 + b * (c.size / 13);
            const by = Math.sin(now * 0.0022 + b * 0.5) * 8 + b * 1.8;
            ctx.fillStyle = 'rgba(165,240,255,' + (0.75 * alpha) + ')';
            ctx.shadowColor = '#7ef5ff'; ctx.shadowBlur = 3;
            ctx.beginPath(); ctx.arc(bx, by, 2.4, 0, Math.PI * 2); ctx.fill();

            // Dangling stinging filament
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(140,225,255,' + (0.3 * alpha) + ')';
            ctx.beginPath(); ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.sin(now * 0.003 + b) * 5, by + 16 + (b % 3) * 6);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }

        case 'viperfish': {
          ctx.save();
          const vTail = Math.sin(now * 0.008 + c.phase) * 4;
          ctx.fillStyle = lit ? 'rgba(75,95,115,' + (0.8 * alpha) + ')' : 'rgba(12,22,34,' + (0.75 * alpha) + ')';
          ctx.beginPath(); ctx.ellipse(0, 0, c.size * 0.6, c.size * 0.2, 0, 0, Math.PI * 2); ctx.fill();
          // Gaping fanged head
          ctx.fillStyle = lit ? 'rgba(95,115,135,' + (0.85 * alpha) + ')' : 'rgba(16,28,42,' + (0.8 * alpha) + ')';
          ctx.beginPath(); ctx.arc(c.size * 0.55, 0, c.size * 0.22, -0.6, 0.6); ctx.lineTo(c.size * 0.35, 0); ctx.closePath(); ctx.fill();
          // Huge needle fangs
          ctx.strokeStyle = 'rgba(235,250,255,' + (0.9 * alpha) + ')'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(c.size * 0.65, -c.size * 0.12); ctx.lineTo(c.size * 0.72, c.size * 0.14); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(c.size * 0.62, c.size * 0.15); ctx.lineTo(c.size * 0.7, -c.size * 0.12); ctx.stroke();
          // Tail
          ctx.fillStyle = lit ? 'rgba(75,95,115,' + (0.8 * alpha) + ')' : 'rgba(12,22,34,' + (0.75 * alpha) + ')';
          ctx.beginPath(); ctx.moveTo(-c.size * 0.5, 0); ctx.lineTo(-c.size * 0.85, -c.size * 0.25 + vTail); ctx.lineTo(-c.size * 0.85, c.size * 0.25 + vTail); ctx.closePath(); ctx.fill();
          ctx.restore();
          break;
        }

        case 'squid': {
          ctx.save();
          const finWag = Math.sin(now * 0.0035 + c.phase) * 5;
          // Mantle
          ctx.fillStyle = lit ? 'rgba(175,90,95,' + (0.85 * alpha) + ')' : 'rgba(22,16,25,' + (0.75 * alpha) + ')';
          ctx.beginPath();
          ctx.moveTo(c.size * 0.25, -c.size * 0.18);
          ctx.lineTo(c.size * 0.25, c.size * 0.18);
          ctx.lineTo(-c.size * 0.7, 0);
          ctx.closePath(); ctx.fill();
          // Mantle fins
          ctx.beginPath(); ctx.moveTo(-c.size * 0.45, 0); ctx.lineTo(-c.size * 0.75, -c.size * 0.35 + finWag); ctx.lineTo(-c.size * 0.65, 0); ctx.lineTo(-c.size * 0.75, c.size * 0.35 + finWag); ctx.closePath(); ctx.fill();
          // Giant Eye
          ctx.fillStyle = '#060c14'; ctx.beginPath(); ctx.arc(c.size * 0.32, -c.size * 0.04, 3.8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,245,200,' + (0.9 * alpha) + ')'; ctx.beginPath(); ctx.arc(c.size * 0.32, -c.size * 0.04, 1.4, 0, Math.PI * 2); ctx.fill();
          // Arms & Tentacles trailing forward
          ctx.strokeStyle = lit ? 'rgba(165,80,85,' + (0.85 * alpha) + ')' : 'rgba(25,18,30,' + (0.75 * alpha) + ')';
          ctx.lineWidth = 1.6;
          for (let a = -2; a <= 2; a++) {
            ctx.beginPath(); ctx.moveTo(c.size * 0.35, a * 3);
            const sWag = Math.sin(now * 0.003 + a * 0.6) * 6;
            ctx.lineTo(c.size * 0.85 + Math.abs(a) * 4, a * 5 + sWag);
            ctx.stroke();
          }
          // Two extra-long feeding tentacles
          ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(c.size * 0.35, -2);
          ctx.quadraticCurveTo(c.size * 0.9, Math.sin(now * 0.0028) * 8, c.size * 1.5, Math.sin(now * 0.0035) * 12);
          ctx.stroke();
          ctx.restore();
          break;
        }

        case 'angler': {
          ctx.save();
          // Heavy rounded body
          ctx.fillStyle = lit ? 'rgba(45,35,40,' + (0.9 * alpha) + ')' : 'rgba(10,8,12,' + (0.85 * alpha) + ')';
          ctx.beginPath(); ctx.ellipse(0, 0, c.size * 0.55, c.size * 0.45, 0, 0, Math.PI * 2); ctx.fill();
          // Gaping jaw with fangs
          ctx.beginPath(); ctx.moveTo(c.size * 0.45, -c.size * 0.2); ctx.lineTo(c.size * 0.15, 0); ctx.lineTo(c.size * 0.5, c.size * 0.35); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * alpha) + ')'; ctx.lineWidth = 1;
          for (let f = 0; f < 3; f++) {
            ctx.beginPath(); ctx.moveTo(c.size * 0.45 - f * 5, c.size * 0.3); ctx.lineTo(c.size * 0.42 - f * 5, c.size * 0.12); ctx.stroke();
          }
          // Illicium stalk arching forward over head
          ctx.strokeStyle = 'rgba(120,180,180,' + (0.75 * alpha) + ')'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(c.size * 0.15, -c.size * 0.4); ctx.quadraticCurveTo(c.size * 0.45, -c.size * 0.9, c.size * 0.8, -c.size * 0.5); ctx.stroke();
          // Glowing Esca lure
          const lureX = c.size * 0.8, lureY = -c.size * 0.5;
          const lureGrad = ctx.createRadialGradient(lureX, lureY, 0, lureX, lureY, 14);
          lureGrad.addColorStop(0, 'rgba(130,255,225,' + (0.95 * alpha) + ')');
          lureGrad.addColorStop(0.3, 'rgba(80,240,200,' + (0.6 * alpha) + ')');
          lureGrad.addColorStop(1, 'rgba(50,210,180,0)');
          ctx.fillStyle = lureGrad;
          ctx.beginPath(); ctx.arc(lureX, lureY, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(lureX, lureY, 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }

        case 'gulpereel': {
          ctx.save();
          // Enormous pouch mouth
          ctx.fillStyle = lit ? 'rgba(38,32,45,' + (0.85 * alpha) + ')' : 'rgba(8,6,12,' + (0.8 * alpha) + ')';
          ctx.beginPath(); ctx.ellipse(c.size * 0.35, 0, c.size * 0.28, c.size * 0.22, 0, 0, Math.PI * 2); ctx.fill();
          // Long undulating ribbon tail
          ctx.strokeStyle = lit ? 'rgba(38,32,45,' + (0.85 * alpha) + ')' : 'rgba(8,6,12,' + (0.8 * alpha) + ')';
          ctx.lineWidth = 3.2;
          ctx.beginPath(); ctx.moveTo(c.size * 0.15, 0);
          for (let seg = 1; seg <= 6; seg++) {
            const sx = c.size * 0.15 - seg * (c.size * 0.18);
            const sy = Math.sin(now * 0.003 + seg * 0.75 + c.phase) * (4 + seg * 1.6);
            ctx.lineTo(sx, sy);
          }
          ctx.stroke();
          // Bioluminescent tail organ
          const lastX = c.size * 0.15 - 6 * (c.size * 0.18);
          const lastY = Math.sin(now * 0.003 + 6 * 0.75 + c.phase) * 13.6;
          ctx.fillStyle = 'rgba(255,115,160,' + (0.95 * alpha) + ')';
          ctx.shadowColor = '#ff6590'; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }

        case 'prawn': {
          ctx.save();
          // Deep crimson in beam, pitch black in dark!
          const prawnCol = lit ? 'rgba(225,32,48,' + (0.92 * alpha) + ')' : 'rgba(16,10,18,' + (0.45 * alpha) + ')';
          ctx.fillStyle = prawnCol;
          ctx.beginPath(); ctx.ellipse(0, 0, c.size * 0.6, c.size * 0.3, -0.2, 0, Math.PI * 2); ctx.fill();
          // Long waving antennae
          ctx.strokeStyle = lit ? 'rgba(240,65,80,' + (0.8 * alpha) + ')' : 'rgba(25,12,22,' + (0.35 * alpha) + ')';
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(c.size * 0.5, -c.size * 0.1);
          ctx.quadraticCurveTo(c.size * 1.2, -c.size * 0.8 + Math.sin(now * 0.003) * 6, c.size * 1.8, -c.size * 0.4);
          ctx.stroke();
          ctx.restore();
          break;
        }

        case 'dumbo': {
          ctx.save();
          const earFlap = Math.sin(now * 0.0035 + c.phase) * 7;
          ctx.fillStyle = lit ? 'rgba(220,185,210,' + (0.85 * alpha) + ')' : 'rgba(45,35,48,' + (0.7 * alpha) + ')';
          // Mantle bell
          ctx.beginPath(); ctx.ellipse(0, -c.size * 0.1, c.size * 0.45, c.size * 0.4, 0, 0, Math.PI * 2); ctx.fill();
          // Ear fins
          ctx.beginPath(); ctx.ellipse(-c.size * 0.42, -c.size * 0.25 + earFlap * 0.3, c.size * 0.3, c.size * 0.16, -0.4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(c.size * 0.42, -c.size * 0.25 - earFlap * 0.3, c.size * 0.3, c.size * 0.16, 0.4, 0, Math.PI * 2); ctx.fill();
          // Short webbed arms
          ctx.beginPath();
          for (let a = -3; a <= 3; a++) {
            ctx.lineTo(a * 4, c.size * 0.32 + Math.abs(a) * 2);
          }
          ctx.fill();
          ctx.restore();
          break;
        }

        case 'tripod': {
          ctx.save();
          // Tripod fish resting above bottom
          ctx.fillStyle = lit ? 'rgba(165,185,200,' + (0.85 * alpha) + ')' : 'rgba(28,38,50,' + (0.75 * alpha) + ')';
          // Slender body
          ctx.beginPath(); ctx.ellipse(0, 0, c.size * 0.6, c.size * 0.2, 0, 0, Math.PI * 2); ctx.fill();
          // Elongated Stilt Fin Rays (two pelvic, one caudal)
          ctx.strokeStyle = lit ? 'rgba(210,230,245,' + (0.9 * alpha) + ')' : 'rgba(60,80,105,' + (0.75 * alpha) + ')';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(c.size * 0.15, c.size * 0.12); ctx.lineTo(c.size * 0.22, c.size * 1.0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-c.size * 0.05, c.size * 0.12); ctx.lineTo(-c.size * 0.12, c.size * 1.0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-c.size * 0.55, c.size * 0.05); ctx.lineTo(-c.size * 0.75, c.size * 0.95); ctx.stroke();
          // Pectoral sensory fins spread forward
          ctx.beginPath(); ctx.moveTo(c.size * 0.25, -c.size * 0.15); ctx.lineTo(c.size * 0.65, -c.size * 0.55); ctx.stroke();
          ctx.restore();
          break;
        }

        case 'seapig': {
          ctx.save();
          // Translucent pink walking sea cucumber
          const pigCol = lit ? 'rgba(250,195,215,' + (0.88 * alpha) + ')' : 'rgba(65,45,55,' + (0.65 * alpha) + ')';
          ctx.fillStyle = pigCol;
          ctx.beginPath(); ctx.ellipse(0, 0, c.size * 0.6, c.size * 0.35, 0, 0, Math.PI * 2); ctx.fill();
          // Dorsal sensory papillae
          ctx.lineWidth = 1.2; ctx.strokeStyle = pigCol;
          ctx.beginPath(); ctx.moveTo(-c.size * 0.15, -c.size * 0.3); ctx.lineTo(-c.size * 0.2, -c.size * 0.65); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(c.size * 0.15, -c.size * 0.3); ctx.lineTo(c.size * 0.2, -c.size * 0.65); ctx.stroke();
          // Hydraulic tube feet walking along sediment
          for (let f = -2; f <= 2; f++) {
            const stepY = Math.sin(now * 0.005 + f * 1.2) * 2;
            ctx.beginPath(); ctx.moveTo(f * 7, c.size * 0.28); ctx.lineTo(f * 7, c.size * 0.55 + stepY); ctx.stroke();
          }
          ctx.restore();
          break;
        }

        case 'grenadier': {
          ctx.save();
          const gTail = Math.sin(now * 0.004 + c.phase) * 5;
          ctx.fillStyle = lit ? 'rgba(145,135,125,' + (0.85 * alpha) + ')' : 'rgba(25,22,20,' + (0.75 * alpha) + ')';
          // Blunt big head
          ctx.beginPath(); ctx.ellipse(c.size * 0.35, 0, c.size * 0.28, c.size * 0.25, 0, 0, Math.PI * 2); ctx.fill();
          // Long tapering tail
          ctx.beginPath();
          ctx.moveTo(c.size * 0.25, -c.size * 0.2);
          ctx.quadraticCurveTo(-c.size * 0.3, -c.size * 0.05, -c.size * 0.85, gTail);
          ctx.quadraticCurveTo(-c.size * 0.3, c.size * 0.05, c.size * 0.25, c.size * 0.2);
          ctx.closePath(); ctx.fill();
          // Big dark eye
          ctx.fillStyle = '#060a10'; ctx.beginPath(); ctx.arc(c.size * 0.42, -c.size * 0.06, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }

        case 'snailfish': {
          ctx.save();
          const sTail = Math.sin(now * 0.005 + c.phase) * 5;
          // Translucent hadal snailfish
          const sfGrad = ctx.createRadialGradient(c.size * 0.2, 0, 0, 0, 0, c.size * 0.7);
          sfGrad.addColorStop(0, lit ? 'rgba(255,235,242,' + (0.85 * alpha) + ')' : 'rgba(65,55,65,' + (0.7 * alpha) + ')');
          sfGrad.addColorStop(1, lit ? 'rgba(235,190,210,' + (0.45 * alpha) + ')' : 'rgba(40,32,45,' + (0.35 * alpha) + ')');
          ctx.fillStyle = sfGrad;
          // Tadpole body with undulating ribbon
          ctx.beginPath();
          ctx.moveTo(c.size * 0.5, 0);
          ctx.quadraticCurveTo(c.size * 0.35, -c.size * 0.32, 0, -c.size * 0.2);
          ctx.quadraticCurveTo(-c.size * 0.4, -c.size * 0.12, -c.size * 0.8, sTail);
          ctx.quadraticCurveTo(-c.size * 0.4, c.size * 0.12, 0, c.size * 0.2);
          ctx.quadraticCurveTo(c.size * 0.35, c.size * 0.32, c.size * 0.5, 0);
          ctx.fill();
          // Small black eye
          ctx.fillStyle = '#0a0d14'; ctx.beginPath(); ctx.arc(c.size * 0.36, -c.size * 0.08, 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }

        case 'amphipods': {
          ctx.save();
          c.members.forEach(m => {
            const ax = m.ox + Math.sin(now * 0.004 + m.phase) * 12;
            const ay = m.oy + Math.cos(now * 0.0035 + m.phase) * 8;
            ctx.fillStyle = lit ? 'rgba(255,245,235,' + (0.9 * alpha) + ')' : 'rgba(75,85,95,' + (0.7 * alpha) + ')';
            ctx.beginPath();
            ctx.ellipse(ax, ay, 3.5, 2, 0.4, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
          break;
        }

        case 'polychaete': {
          ctx.save();
          ctx.strokeStyle = lit ? 'rgba(220,185,160,' + (0.85 * alpha) + ')' : 'rgba(45,35,32,' + (0.7 * alpha) + ')';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(c.size * 0.5, 0);
          for (let seg = 1; seg <= 7; seg++) {
            const px = c.size * 0.5 - seg * (c.size * 0.14);
            const py = Math.sin(now * 0.004 + seg * 0.8 + c.phase) * 5;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.restore();
          break;
        }

        case 'hadalcucumber': {
          ctx.save();
          ctx.fillStyle = lit ? 'rgba(230,205,225,' + (0.8 * alpha) + ')' : 'rgba(50,42,55,' + (0.65 * alpha) + ')';
          ctx.beginPath(); ctx.ellipse(0, 0, c.size * 0.55, c.size * 0.28, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
      }
    }
  }

  const ambientFauna = new AmbientFaunaManager();

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

  // Optical cues are deliberately additive. The photographic/depth plates are
  // the scene; this layer must never paint a second opaque horizon over them.
  // The shared surface model supplies phase and crest motion for soft light
  // modulation, while the water column gets restrained scattering bands.
  function drawLiquidOptics(depth, now, dt) {
    if (!liquidSurface) return;
    const light = lightPct(depth) / 100;
    liquidSurface.configure(W, H * 0.13, 84);
    liquidSurface.update(dt);
    if (depth < 260) {
      if (now > nextSurfaceImpulse) {
        liquidSurface.impulse(W * (0.18 + ((now * 0.00003) % 0.64)), -(2 + light * 5), W * 0.08);
        nextSurfaceImpulse = now + 1050 + ((now * 0.0017) % 900);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.025 + light * 0.035;
      for (let i = 0; i < 5; i += 1) {
        const x = W * (0.08 + i * 0.21) + Math.sin(now * 0.0003 + i) * W * 0.035;
        const y = H * (0.2 + i * 0.1) + liquidSurface.sample(i * 16) * 0.18;
        ctx.save(); ctx.translate(x, y); ctx.scale(2.8, 0.38);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.08);
        glow.addColorStop(0, 'rgba(215,249,255,.9)'); glow.addColorStop(1, 'rgba(215,249,255,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, W * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      ctx.restore();
      return;
    }

    // Once the viewer is inside the water column, sunlight scatters along
    // density gradients. The moving bands are low-contrast and disappear as
    // Beer–Lambert attenuation removes useful light.
    const scatter = clamp(light * 0.055, 0.004, 0.025);
    ctx.save();
    ctx.globalAlpha = scatter;
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = 'rgba(126,220,242,.8)';
    ctx.lineWidth = 1;
    const bandSpacing = Math.max(34, H / 9);
    for (let y = bandSpacing * 0.7; y < H; y += bandSpacing) {
      ctx.beginPath();
      for (let x = -30; x <= W + 30; x += 24) {
        const yy = y + Math.sin(x * 0.012 + now * 0.00055 + y * 0.02) * (2 + light * 8);
        x === -30 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
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

    drawLiquidOptics(depth, now, dt);

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

    // Ambient Ocean Fauna
    ambientFauna.update(dt, now, depth);
    ambientFauna.draw(ctx, depth, light, now);

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
  let selectedBioIndex = -1;

  function renderBioDetail(zone) {
    const detailEl = document.getElementById('bio-detail');
    if (!detailEl) return;
    const details = ZONE_DETAILS[zone.id];
    if (selectedBioIndex < 0 || !details.biodiversity[selectedBioIndex]) {
      detailEl.innerHTML = '<p class="bio-detail-hint">💡 Tap any organism chip above to inspect its ecological niche and depth adaptation.</p>';
      return;
    }
    const sp = details.biodiversity[selectedBioIndex];
    detailEl.innerHTML = '<div class="bio-detail-card">' +
      '<div class="bio-detail-head"><strong>' + sp.name + '</strong><span class="bio-detail-latin">' + sp.latin + '</span></div>' +
      '<div class="bio-detail-tags"><span class="bio-tag role">' + sp.role + '</span><span class="bio-tag depth">' + sp.depth + '</span></div>' +
      '<p class="bio-detail-fact">' + sp.fact + '</p>' +
      '<button type="button" class="bio-detail-dive" data-dive="' + sp.dive + '">Dive to ' + sp.name + ' (' + sp.dive.toLocaleString() + ' m) ↑</button>' +
      '</div>';
    const diveBtn = detailEl.querySelector('.bio-detail-dive');
    if (diveBtn) {
      diveBtn.addEventListener('click', () => { stopDive(); setDepth(sp.dive); });
    }
  }

  function renderZoneNote(zone) {
    const details=ZONE_DETAILS[zone.id], index=noteIndexes[zone.id]%details.facts.length;
    document.getElementById('zone-note-count').textContent='Field note '+(index+1)+' of '+details.facts.length;
    document.getElementById('zone-note-text').textContent=details.facts[index];
  }

  function renderEcology(zone) {
    const details=ZONE_DETAILS[zone.id];
    document.getElementById('eco-energy').textContent=details.energy;
    document.getElementById('eco-challenge').textContent=details.challenge;
    const chipsEl = document.getElementById('bio-chips');
    chipsEl.innerHTML = details.biodiversity.map((sp, idx) =>
      '<button type="button" class="bio-chip' + (selectedBioIndex === idx ? ' active' : '') + '" data-bio-idx="' + idx + '" aria-pressed="' + (selectedBioIndex === idx ? 'true' : 'false') + '">' + sp.name + '</button>'
    ).join('');
    renderBioDetail(zone);
    renderZoneNote(zone);
  }

  const bioChipsContainer = document.getElementById('bio-chips');
  if (bioChipsContainer) {
    bioChipsContainer.addEventListener('click', ev => {
      const btn = ev.target.closest('[data-bio-idx]');
      if (!btn) return;
      const idx = Number(btn.getAttribute('data-bio-idx'));
      selectedBioIndex = (selectedBioIndex === idx) ? -1 : idx;
      const zone = zoneAt(state.depth);
      renderEcology(zone);
    });
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
      selectedBioIndex = -1;
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
    zoneDetails: ZONE_DETAILS,
    creatures: CREATURES,
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
