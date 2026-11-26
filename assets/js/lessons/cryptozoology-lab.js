/* Interactive engines for lessons/life-sciences/cryptozoology.html */
(() => {
  'use strict';

  /* ── 1. Hero Field Signal Cycler ─────────────────────────────────── */
  (() => {
    const traceEl = document.getElementById('heroTrace');
    const labelEl = document.getElementById('heroSignalLabel');
    const blipOne = document.getElementById('heroBlipOne');
    const blipTwo = document.getElementById('heroBlipTwo');
    const btn = document.getElementById('nextSignalBtn');
    if (!traceEl || !labelEl || !btn) return;

    const signals = [
      {
        label: 'Signal 01 · Footprint cast · Level 2 (Ambiguous — needs scale & origin)',
        b1: ['24%', '30%'],
        b2: ['22%', '32%'],
        svg: '<svg viewBox="0 0 520 330" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M91 236c19-49 53-79 104-87 27-5 55-1 77 8 34-36 66-55 99-55 20 0 38 7 55 19l-21 21c26 13 41 33 45 59-35-8-65-2-91 17-17 13-38 23-65 30-54 13-109 15-165 5z"/><path d="M178 250l-18 48m181-66 20 54M214 150c-4-26 4-48 24-67m36 72c4-31 17-58 39-81M111 231c-24 4-43 18-56 41"/><path d="M403 143l35-13-15 34m-67-38c-1-18 5-34 17-48"/></svg>'
      },
      {
        label: 'Signal 02 · 1997 Hydrophone spike · Level 2 (Later matched to icequakes)',
        b1: ['35%', '48%'],
        b2: ['30%', '46%'],
        svg: '<svg viewBox="0 0 520 330" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M44 172h68l22-34 24 72 28-116 28 150 26-102 22 44 20-26 24 38 20-16h150"/><path d="M88 238c48 16 108 24 172 24s124-8 172-24" opacity=".45" stroke-dasharray="10 10"/><circle cx="186" cy="94" r="14"/><circle cx="186" cy="94" r="34" opacity=".4"/></svg>'
      },
      {
        label: 'Signal 03 · IR camera-trap frame · Level 3 (Calibrated sensor + timestamp)',
        b1: ['56%', '34%'],
        b2: ['28%', '58%'],
        svg: '<svg viewBox="0 0 520 330" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><rect x="78" y="64" width="364" height="202" rx="14" opacity=".45"/><path d="M104 94h34m-34 0v34m312-34h-34m34 0v34M104 236h34m-34 0v-34m312 34h-34m34 0v-34"/><path d="M168 220c14-36 42-56 76-58 26-2 49 8 68 25l24-44 10 42 36 16-30 16-24-8-14 14h-82l-18-16-46 13z"/><path d="M214 222l-8 30m86-30 10 30"/></svg>'
      },
      {
        label: 'Signal 04 · Preserved specimen + DNA · Level 5 (Replicated convergence)',
        b1: ['26%', '46%'],
        b2: ['26%', '44%'],
        svg: '<svg viewBox="0 0 520 330" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M98 166c56-68 152-78 220-26l46-36-10 62 10 60-48-34c-68 50-160 38-218-26z"/><circle cx="276" cy="146" r="6" fill="currentColor"/><path d="M166 130l20-38 34 40m-66 64 32 38 22-40M112 166h142"/><path d="M402 92c28 24 28 54 0 78s-28 54 0 78m38-156c-28 24-28 54 0 78s28 54 0 78" opacity=".6"/></svg>'
      }
    ];

    let idx = 0;
    function applySignal(i) {
      const s = signals[i];
      traceEl.innerHTML = s.svg;
      labelEl.textContent = s.label;
      if (blipOne) {
        blipOne.style.left = s.b1[0];
        blipOne.style.top = s.b1[1];
      }
      if (blipTwo) {
        blipTwo.style.right = s.b2[0];
        blipTwo.style.bottom = s.b2[1];
      }
    }

    btn.addEventListener('click', () => {
      idx = (idx + 1) % signals.length;
      applySignal(idx);
    });
    applySignal(0);
  })();

  /* ── 2. Global Cryptidex + EarthEngine Map + Field Dossiers ──────── */
  const rawEntries = [
    ['Bigfoot','north-america','reported','Pacific Northwest, U.S. & Canada','A large hair-covered humanoid reported in forests; no diagnostic body or DNA has established a species.','1-0',[-122.6,45.6],'Level 1–2 · Testimony & casts','Unsupported as a biological species. Hair and tissue tests have matched known mammals (such as bears), and a breeding population should leave bones, eDNA, and repeatable camera-trap detections.','Paired camera traps with scale bars and blind lab DNA barcoding of controlled hair/scat samples.','CZ-05'],
    ['Mothman','north-america','folklore','Point Pleasant, West Virginia','A winged red-eyed figure rooted in 1966–67 reports and later books, festivals, films, and local identity.','1-1',[-82.13,38.84],'Cultural folklore','Roots lie in 1966 eyewitness anxiety, misidentified large birds (such as sandhill cranes or owls), and decades of regional storytelling.','Study how local media, town festivals, and pop culture transform brief twilight sightings into an enduring modern legend.',null],
    ['Jersey Devil','north-america','folklore','New Jersey Pine Barrens','A long-running regional legend often depicted with hooves, wings, and a horse-like head.','2-0',[-74.6,39.75],'Cultural folklore','A 300-year regional folktale shaped by colonial-era politics, pamphlet hoaxes, and 1909 newspaper panic.','Trace primary 18th–20th-century newspaper archives to see how print hoaxes spread before photography.',null],
    ['Fresno Nightcrawler','north-america','internet','California internet video','A pair of pale walking shapes popularized by low-resolution footage and paranormal television.','2-1',[-119.78,36.74],'Viral video / unverified','Only low-resolution home security video exists, with no independent corroboration, physical trace, or biological anatomy capable of locomotion as shown.','Analyze frame compression, perspective distortion, and simple puppetry/hoax mechanics rather than inventing new anatomy.',null],
    ['Flatwoods Monster','north-america','folklore','Flatwoods, West Virginia','A 1952 sighting became an iconic spade-headed monster image; proposed explanations include an owl and meteor.','3-6',[-80.65,38.72],'Cultural folklore / misidentification','Investigators documented a bright meteor passing over the region that evening and suggested a startled barn owl perched in tree branches explained the glowing eyes and silhouette.','Compare eyewitness sketches made days later against astronomical meteor records and local nocturnal bird behavior.',null],
    ['Loveland Frog','north-america','folklore','Loveland, Ohio','Ohio stories describe upright frog-like beings; a later police encounter was identified as a tailless iguana.','3-10',[-84.26,39.27],'Cultural folklore','A 1972 officer later clarified that the animal he shot on a roadway was a large escaped pet iguana missing its tail, not a humanoid amphibian.','Cross-check police reports, reptile escape records, and how later retellings omit original corrections.',null],
    ['Champ','north-america','reported','Lake Champlain (NY / VT / QC)','A lake-monster tradition spanning New York, Vermont, and Québec, supported mainly by sightings and ambiguous images.','3-4',[-73.33,44.5],'Level 1–2 · Sightings & sonar','No physical specimen or diagnostic DNA supports an unknown large aquatic reptile; boat wakes, logs, sturgeon, and optical mirages account for many reports.','Compare thermal surface surveys and lake-wide eDNA metabarcoding against known fish populations.',null],
    ['Thunderbird reports','north-america','folklore','North American regional traditions','Giant-bird reports overlap with diverse Indigenous traditions that should not be collapsed into one zoological claim.','4-7',[-104.5,44.2],'Cultural tradition','Sacred Thunderbird narratives belong to distinct Indigenous cultural traditions; conflating them with modern "giant bird" sightings erases cultural meaning.','Approach Indigenous stories through community-authored histories and treat modern large-bird photos with scale checks.',null],

    ['Chupacabra','latin-america','reported','Puerto Rico & the Americas','The goat-sucker story surged in Puerto Rico in the 1990s; many photographed “chupacabras” are canids with mange.','1-3',[-66.5,18.22],'Level 2–4 · Misidentified canids','Genetic and veterinary examinations of hairless carcasses from the U.S. and Latin America repeatedly identified coyotes, dogs, and foxes with severe sarcoptic mange.','Veterinary necropsy and mitochondrial DNA sequencing of any recovered carcass.',null],
    ['Mapinguari','latin-america','folklore','Amazon Basin','A powerful forest being in Amazonian traditions, later reframed by some outsiders as a surviving giant ground sloth.','2-6',[-63.0,-4.5],'Cultural folklore','Amazonian narratives describe a spiritual guardian being; attempts to map it onto Pleistocene giant ground sloths lack fossil, track, or tissue evidence after ~10,000 years ago.','Distinguish oral cultural traditions from paleontological hypotheses; test paleontological claims with dated fossils or eDNA.',null],
    ['Yacumama','latin-america','folklore','Amazonian waterways','A “mother of the water” represented as an immense serpent in stories from the western Amazon.','2-7',[-73.25,-3.75],'Cultural folklore','A riverine guardian figure in western Amazonian cosmology, occasionally inspired by real green anacondas (Eunectes murinus), which grow up to ~5–6 meters.','Study river ecology and green anaconda size limits alongside respectful folklore scholarship.',null],
    ['Nahuelito','latin-america','reported','Nahuel Huapi Lake, Argentina','Patagonian lake-monster reports often use a long-necked silhouette similar to modern Nessie imagery.','3-5',[-71.3,-41.08],'Level 1–2 · Unverified sightings','No specimen, verified bone, or diagnostic sonar/eDNA record supports an unknown large lake vertebrate in Patagonia.','Systematic sonar transects and eDNA water sampling paired with wind-wave and log-drift observations.',null],
    ['El Cuero','latin-america','folklore','Chile & Patagonia','A hide-like aquatic being from Chilean and Mapuche-linked storytelling; cultural context varies by source.','4-0',[-72.9,-39.5],'Cultural folklore','An aquatic spirit/being in regional Mapuche and Chilean folklore, not a documented zoological taxon.','Read primary ethnographic sources from Mapuche storytellers rather than English cryptid compendia.',null],
    ['Mono Grande','latin-america','reported','South American forests','Reports and sensational photographs of a giant ape-like primate have not produced a verified specimen.','3-0',[-72.5,8.5],'Level 1–2 · Disputed photo','The famous 1920 de Loys photograph is widely scrutinized as a staged spider monkey carcass propped on a crate without verified scale or skeletal remains.','Examine archival museum correspondence and anatomical proportions (tail/limb ratios) against known Ateles spider monkeys.',null],

    ['Loch Ness Monster','europe','reported','Scotland, United Kingdom','Nessie became a global icon through eyewitness reports, sonar claims, tourism, and famous—but disputed—photographs.','1-2',[-4.45,57.3],'Level 2 · Disputed / eDNA negative','A 2019 international eDNA survey of 250+ water samples found no unknown reptile or giant vertebrate DNA, while recording abundant European eel DNA alongside salmon and trout.','Evaluate food-web biomass limits of a deep cold oligotrophic loch rather than isolated ambiguous sonar pings.','CZ-04'],
    ['Kraken','europe','folklore','North Atlantic & Norse tradition','A legendary immense sea creature, probably shaped partly by encounters with real large cephalopods.','3-11',[-3.0,63.5],'Folklore / real-animal inspiration','Medieval sea-monster accounts exaggerated scale to island size, yet stranded giant squid carcasses later proved large deep-sea cephalopods are real.','Compare historical sailors’ sketches with Architeuthis anatomy and deep-sea submersible footage.',null],
    ['Beast of Gévaudan','europe','folklore','Lozère, France (1764–1767)','A series of real animal attacks in the 1760s produced a lasting legend; wolves or wolf-like canids remain leading explanations.','4-6',[3.45,44.6],'Historical wildlife record','Parish burial registers confirm real fatal attacks occurred, while historical hunters killed large wolves and wolf-dog hybrids, ending the incidents.','Analyze 18th-century parish records and wolf ecology rather than later supernatural embellishments.',null],
    ['Tatzelwurm','europe','folklore','European Alps','An Alpine creature usually drawn as a short serpent with cat-like features and two forelegs.','2-3',[10.5,46.8],'Cultural folklore','Alpine folk stories spanning centuries vary wildly in body shape, with no preserved specimens in European natural history collections.','Survey historical Alpine woodcuts and compare descriptions with known lizards or otters seen briefly in rock crevices.',null],
    ['Black Shuck','europe','folklore','East Anglia, England','A spectral black dog tradition that belongs to folklore rather than zoological field reporting.','2-2',[1.15,52.63],'Cultural folklore','Explicitly described in British folklore as an omen or phantom hound rather than a breeding biological mammal.','Classify as regional cultural heritage and folklore.',null],
    ['Owlman','europe','folklore','Cornwall, England','A modern winged humanoid legend associated with 1970s reports near Mawnan church.','3-3',[-5.1,50.11],'Cultural folklore','1976 sketches originated with children’s accounts near Mawnan Old Church; eagle owls and practical jokes have been proposed as catalysts.','Compare early witness drawings with Eurasian eagle-owl silhouettes in twilight.',null],
    ['Dobhar-chú','europe','folklore','Ireland','An Irish water-hound tradition sometimes described as an enormous, dangerous otter.','4-1',[-8.1,54.2],'Cultural folklore','Part of Irish folklore and medieval gravestones; real Eurasian otters (Lutra lutra) inhabit Irish lakes and rivers.','Compare folklore motifs with historical otter ranges.',null],

    ['Mokele-mbembe','africa','reported','Congo Basin','Expedition stories describe a large long-necked swamp animal, but no diagnostic evidence confirms one.','2-4',[17.2,1.3],'Level 1–2 · Unverified testimony','Multiple expeditions have returned without clear photographs, tracks, carcasses, or non-avian dinosaur fossils younger than 66 million years.','Survey swamp biodiversity using autonomous camera traps and eDNA without relying on leading interview illustrations.',null],
    ['Coelacanth','africa','documented','East London, South Africa (1938)','A real deep-water fish lineage documented from a preserved 1938 specimen and many later observations.','1-9',[27.91,-33.02],'Level 5 · Confirmed species','Marjorie Courtenay-Latimer preserved the 1938 trawler specimen and J.L.B. Smith verified its anatomy, followed by dozens more specimens, submersibles, and DNA sequences.','Benchmark example of how one preserved specimen + independent replication settles a scientific claim.','CZ-01'],
    ['Kongamato','africa','reported','Central & Southern Africa','A flying-creature report often illustrated like a pterosaur; stories were heavily filtered through colonial retellings.','2-5',[26.5,-11.5],'Level 1 · Filtered colonial accounts','Early 20th-century writers reframed local accounts using Western dinosaur-book illustrations; large storks, bats, and hornbills inhabit the wetlands.','Audit colonial expedition writings for leading questions and compare with native wetland bird/bat wingspans.',null],
    ['Nandi Bear','africa','reported','East Africa','Colonial-era accounts describe a large carnivore; suggested identities include hyenas or other known mammals.','1-7',[35.2,0.2],'Level 1 · Historical reports','No skull, pelt, or specimen was ever catalogued despite decades of colonial hunting; spotted hyenas, honey badgers, and baboons match many details.','Examine museum mammal collections and historical East African carnivore ranges.',null],
    ['Grootslang','africa','folklore','Richtersveld, South Africa','A legendary cave-dwelling serpent-elephant hybrid associated with deep pools, gems, and hidden places.','grootslang-0',[17.1,-28.3],'Cultural folklore','A South African mythic guardian creature symbolizing danger around deep river caves and diamond-mining stories.','Approach as regional mythology and cautionary folklore.',null],
    ['Dingonek','africa','reported','East African waterways','An early twentieth-century traveler’s account of an armored aquatic animal never produced a specimen.','3-7',[34.8,-0.6],'Level 1 · Single traveler tale','Derived mainly from one 1907 hunter’s narrative with no corroborating specimens, tracks, or modern river sightings.','Treat single uncorroborated traveler anecdotes as Level 1 unless physical evidence appears.',null],

    ['Kappa','asia','folklore','Japan','A famous water yōkai with a dish-like head. It is a folkloric being, not a proposed undiscovered amphibian.','1-4',[135.7,35.0],'Cultural folklore (yōkai)','A classic Japanese yōkai teaching river safety and social etiquette; Japanese giant salamanders (Andrias japonicus) are real, separate animals.','Explore yōkai art history alongside real Japanese river amphibian conservation.',null],
    ['Tsuchinoko','asia','folklore','Japan','A thick-bodied snake-like yōkai and modern local legend that also inspires “wanted” hunts and pop culture.','1-5',[137.0,36.2],'Cultural folklore / local legend','Appears in Edo-period texts and modern town tourism promotions; snakes with recently swallowed prey can appear unusually thick-bodied.','Inspect real snake digestion anatomy and municipal mascot tourism.',null],
    ['Tengu','asia','folklore','Japan','Mountain yōkai with complex religious and folkloric histories, commonly depicted with red faces, long noses, or bird traits.','2-8',[139.2,35.6],'Cultural folklore (yōkai)','Sacred mountain spirits/yōkai in Japanese folklore and Shinto-Buddhist tradition, never proposed as a zoological species.','Study through Japanese folklore and art history.',null],
    ['Akkorokamui','asia','folklore','Ainu tradition, Hokkaidō','A giant octopus-like being associated with the sea. It should be approached through Ainu cultural context.','2-9',[140.9,42.3],'Cultural tradition','A sacred sea kamuy in Ainu tradition around Funka Bay; large North Pacific giant octopuses (Enteroctopus dofleini) also live in Hokkaidō waters.','Learn Ainu oral traditions directly from cultural centers rather than monster rankings.',null],
    ['Giant squid','asia','documented','Ogasawara Islands, Japan (2004)','Physical remains established the animal long before researchers photographed a living giant squid in its habitat.','1-6',[142.2,27.1],'Level 5 · Confirmed species','Carcasses and beaks proved Architeuthis dux existed in the 1800s; Tsunemi Kubodera captured the first live deep-water photographs in 2004 and live video in 2012.','Contrast historical carcass evidence with deep-sea baited camera engineering.',null],
    ['Nue','asia','folklore','Japan','A composite yōkai from classical literature, assembled from multiple animal traits and linked with ominous events.','3-8',[135.76,35.01],'Classical literature (yōkai)','Described in the medieval Tale of the Heike with a monkey head, tanuki body, tiger limbs, and snake tail—an emblem of literary symbolism.','Notice how its nocturnal call has been linked by historians to the real scaly thrush (Zoothera dauma).',null],
    ['Hibagon','asia','reported','Hiroshima Prefecture, Japan','A shaggy humanoid from 1970s reports that became a regional mascot and media figure.','3-1',[133.0,35.0],'Level 1–2 · Historical sightings','Sightings clustered around Mt. Hiba in 1970–74 ended without biological evidence; Japanese macaques and Asiatic black bears inhabit the mountains.','Compare the short media sighting wave with local wildlife ranges.',null],
    ['Yeren','asia','reported','Shennongjia, Central China','A “wild man” tradition and modern reports investigated without producing a confirmed unknown primate.','3-2',[110.5,31.7],'Level 1–2 · Hair tests negative','DNA and microscopic analyses of collected hairs have matched known animals such as bears, macaques, or humans; no fossil or living hominid specimen exists.','Use calibrated camera-trap grids in Shennongjia nature reserves to inventory real mammals.',null],
    ['Orang Pendek','asia','reported','Sumatra, Indonesia','A small upright forest hominid reported in local accounts and expeditions, but not zoologically established.','4-8',[101.5,-1.7],'Level 1–2 · Unconfirmed tracks','Extensive camera-trap surveys for Sumatran tigers and rhinos have documented rare known species without capturing an unknown bipedal primate.','Review existing conservation camera-trap datasets from Kerinci Seblat.',null],

    ['Bunyip','oceania','folklore','Australian Aboriginal traditions','An English umbrella name applied to varied Aboriginal water-being traditions; local nation and story matter.','4-2',[144.9,-36.0],'Cultural tradition','Originates in Wemba-Wemba and other Aboriginal traditions; colonial settlers merged diverse cultural narratives into a single sensationalized monster label.','Respect Nation-specific Aboriginal storytelling rather than treating it as a single cryptid file.',null],
    ['Yowie','oceania','reported','Eastern Australia','An Australian hairy-hominid legend combining recent reports, media, and older stories that require careful sourcing.','2-10',[150.3,-33.7],'Level 1 · Unverified reports','No fossil record of native non-human primates exists in Australia, and no physical remains or confirmed DNA support a large hominid.','Evaluate evolutionary biogeography (Wallace’s Line) alongside sighting claims.',null],
    ['Thylacine','oceania','documented','Tasmania, Australia','A scientifically documented marsupial predator now classified as extinct; modern survival reports remain unconfirmed.','1-8',[146.8,-42.1],'Level 5 (Past) · Survival unresolved','Confirmed alive until 1936 with full museum specimens, film, and sequenced genomes; thousands of post-1936 sightings have not yielded verified modern DNA or photos.','Deploy dense long-term camera grids and eDNA sampling in remote Tasmanian catchments.','CZ-03'],
    ['Waitoreke','oceania','reported','South Island, New Zealand','Reports of an otter-like animal are intriguing because New Zealand has no known native land mammals of that kind.','4-3',[168.5,-44.8],'Level 1 · Unconfirmed reports','Aotearoa New Zealand has no native terrestrial non-bat mammals; introduced stoats, ferrets, or swimming birds may explain brief river sightings.','Check wetland tracks and eDNA for introduced mustelids vs. any unexpected mammal DNA.',null],
    ['Moa survival claims','oceania','reported','New Zealand','Moa are documented extinct birds; recent survival stories have not produced verified feathers, DNA, or bodies.','4-4',[170.5,-43.8],'Level 5 (Past) · Survival unsupported','Abundant subfossil bones confirm moa lived until ~1440 CE; modern survival claims lack feathers, droppings, footprints, or fresh eDNA in heavily surveyed parks.','Compare ancient DNA records with modern avian biodiversity surveys.',null],

    ['El Gran Majá','internet','internet','Borisao Blois animation','A fictional six-eyed leviathan created for internet animation and often paired with a monster version of the Bloop.','1-10',null,'Internet fiction','Created intentionally as digital animation/storytelling; has zero connection to biological or oceanographic observations.','Check creator credits and publication dates before treating viral clips as field footage.',null],
    ['The Bloop','internet','explained','South Pacific hydrophone signal, 1997','A real recorded ultra-low-frequency sound later matched to icequakes—not evidence of a giant organism.','2-11',[-95.0,-50.0],'Explained · Cryoseism (icequake)','NOAA Acoustic Monitoring researchers traced the 1997 signal’s spectral signature and timing to large Antarctic icebergs fracturing and grinding (icequakes).','Compare acoustic spectrograms of calving icebergs against biological marine mammal vocalizations.','CZ-06'],
    ['Tung Tung Tung Sahur','internet','internet','Indonesia-origin viral meme, 2025','An AI-generated wooden character credited to @noxaasht, drawing its name from the Indonesian sahur wake-up tradition.','1-11',null,'Internet fiction (AI meme)','A purposefully absurd 2025 generative-AI social media character, not a biological report or traditional folklore.','Practice digital media literacy: trace the original social handle and AI visual artifacts.',null],
    ['Tralalero Tralala','internet','internet','Italian brainrot meme, 2025','A surreal three-legged shark in sneakers from the AI “Italian brainrot” wave; included as internet culture, not zoology.','4-5',null,'Internet fiction (AI meme)','Generated for surreal humor online; clearly fictional and anatomically impossible.',null],
    ['Bombardiro Crocodilo','internet','internet','Italian brainrot meme, 2025','A fictional crocodile-aircraft hybrid from the same surreal viral AI meme genre.','3-9',null,'Internet fiction (AI meme)','AI-generated internet absurdity combining a reptile and a bomber airplane.',null],
    ['Bloop monster','internet','internet','Internet leviathan fiction','A giant-creature interpretation of the Bloop invented after the sound became famous; distinct from the explained real signal.','4-9',null,'Internet fiction','Artists and YouTubers invented giant-monster visuals years after NOAA recorded and later explained the 1997 icequake sound.','Separate the real 1997 acoustic recording from later fan art and CGI animations.',null]
  ];

  const entries = rawEntries.map((e, index) => ({
    number: String(index + 1).padStart(3, '0'),
    name: e[0],
    region: e[1],
    type: e[2],
    place: e[3],
    description: e[4],
    art: e[5],
    coords: e[6],
    evidenceLevel: e[7],
    scientificStatus: e[8],
    testableNext: e[9],
    caseId: e[10]
  }));

  const typeLabels = {
    reported: 'Reported',
    folklore: 'Folklore',
    documented: 'Documented',
    internet: 'Fiction',
    explained: 'Explained'
  };

  const pinColors = {
    reported: '#ffcb45',
    folklore: '#76e6cf',
    documented: '#6ee7b7',
    explained: '#a8b7ff',
    internet: '#f39ac4'
  };

  const regionInfo = {
    all: ['Whole world', 'Every archive layer, from field reports to playful born-online fiction.'],
    'north-america': ['North America', 'Forest giants, lake monsters, winged omens, and modern regional legends.'],
    'latin-america': ['Latin America', 'Amazonian traditions, lake reports, and the modern chupacabra phenomenon.'],
    europe: ['Europe', 'Sea monsters, spectral animals, Alpine creatures, and historical wildlife accounts.'],
    africa: ['Africa', 'Reports and traditions often distorted by colonial-era retellings—read claims critically.'],
    asia: ['Asia + Japan', 'Reported wild people alongside yōkai, Ainu tradition, and regional popular culture.'],
    oceania: ['Oceania', 'Australian and Aotearoa New Zealand reports, with living traditions kept in context.'],
    internet: ['Internet culture', 'Playful fiction, explainable phenomena, animation, and surreal viral memes.']
  };

  const grid = document.getElementById('archiveGrid');
  const count = document.getElementById('archiveCount');
  const empty = document.getElementById('archiveEmpty');
  const search = document.getElementById('archiveSearch');
  const showMoreWrap = document.getElementById('archiveMoreWrap');
  const showMoreBtn = document.getElementById('archiveMoreBtn');
  const mapSvg = document.getElementById('cryptidexMap');
  const regionTitle = document.getElementById('regionTitle');
  const regionDesc = document.getElementById('regionDescription');
  const regionStats = document.getElementById('regionStats');
  const regionButtons = [...document.querySelectorAll('[data-region]')];
  const typeButtons = [...document.querySelectorAll('.type-btn')];

  const dialog = document.getElementById('dossierDialog');
  const dossierArt = document.getElementById('dossierArt');
  const dossierNum = document.getElementById('dossierNum');
  const dossierTitle = document.getElementById('dossierTitle');
  const dossierPlace = document.getElementById('dossierPlace');
  const dossierType = document.getElementById('dossierType');
  const dossierLevel = document.getElementById('dossierLevel');
  const dossierDesc = document.getElementById('dossierDesc');
  const dossierStatus = document.getElementById('dossierStatus');
  const dossierNext = document.getElementById('dossierNext');
  const dossierLabBtn = document.getElementById('dossierLabBtn');
  const dossierPrevBtn = document.getElementById('dossierPrevBtn');
  const dossierNextBtn = document.getElementById('dossierNextBtn');
  const dossierCloseBtn = document.getElementById('dossierCloseBtn');

  let activeRegion = 'all';
  let activeType = 'all';
  let showAllEntries = false;
  let visibleEntries = entries;
  let activeDossierIndex = 0;
  let lastTriggerEl = null;
  const pinElements = new Map();

  function spriteClass(art) {
    const [atlas, pos] = art.split('-');
    return `atlas-${atlas} p-${pos}`;
  }

  function initWorldMap() {
    if (!mapSvg || !window.EarthEngine || !window.d3) return;
    const E = window.EarthEngine;
    const world = E.data();
    const proj = E.projection('natural-earth', { extent: [[16, 18], [884, 442]] });

    const NS = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs) => {
      const el = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
      return el;
    };

    mapSvg.innerHTML = '';

    // Ocean sphere backdrop
    mapSvg.appendChild(svgEl('path', {
      d: E.path(proj, { type: 'Sphere' }),
      class: 'map-ocean'
    }));

    // Subtle latitude/longitude graticule
    if (window.d3.geoGraticule10) {
      mapSvg.appendChild(svgEl('path', {
        d: E.path(proj, window.d3.geoGraticule10()),
        class: 'map-graticule'
      }));
    }

    // Natural Earth v5.1.2 land
    mapSvg.appendChild(svgEl('path', {
      d: E.path(proj, world.land),
      class: 'map-land'
    }));

    // Generalized reference country lines (never shaded by continent)
    mapSvg.appendChild(svgEl('path', {
      d: E.path(proj, world.countries),
      class: 'map-countries'
    }));

    // Disputed/claim lines drawn distinctly with dashed stroke
    if (world.disputed) {
      mapSvg.appendChild(svgEl('path', {
        d: E.path(proj, world.disputed),
        class: 'map-disputed'
      }));
    }

    // Interactive Geographic Entry Pins projected via EarthEngine
    const pinsGroup = svgEl('g', { class: 'map-pins' });
    entries.forEach((entry) => {
      if (!entry.coords) return;
      const xy = proj(entry.coords);
      if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) return;

      const g = svgEl('g', {
        class: 'map-pin',
        transform: `translate(${xy[0].toFixed(1)}, ${xy[1].toFixed(1)})`,
        role: 'button',
        tabindex: '0',
        'aria-label': `Open field dossier: ${entry.name} (${entry.place})`,
        'data-entry': entry.number
      });

      const title = svgEl('title');
      title.textContent = `${entry.name} — ${entry.place} (${typeLabels[entry.type]})`;

      const halo = svgEl('circle', { r: '9.5', class: 'pin-halo', fill: pinColors[entry.type] || '#ffcb45' });
      const dot = svgEl('circle', { r: '5', class: 'pin-dot', fill: pinColors[entry.type] || '#ffcb45' });

      g.append(title, halo, dot);
      const openPin = () => openDossierByNumber(entry.number, g);
      g.addEventListener('click', openPin);
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openPin();
        }
      });

      pinsGroup.appendChild(g);
      pinElements.set(entry.number, g);
    });
    mapSvg.appendChild(pinsGroup);
  }

  function renderArchive() {
    if (!grid) return;
    const query = search.value.trim().toLowerCase();
    visibleEntries = entries.filter((e) =>
      (activeRegion === 'all' || e.region === activeRegion) &&
      (activeType === 'all' || e.type === activeType) &&
      (!query || `${e.name} ${e.place} ${e.description} ${e.evidenceLevel}`.toLowerCase().includes(query))
    );

    const visibleSet = new Set(visibleEntries.map((e) => e.number));
    pinElements.forEach((pin, num) => {
      const active = visibleSet.has(num);
      pin.classList.toggle('dim', !active);
      pin.classList.toggle('highlight', active && (activeRegion !== 'all' || activeType !== 'all' || query.length > 0));
    });

    const autoExpand = visibleEntries.length <= 24 || query.length > 0;
    const shown = (showAllEntries || autoExpand) ? visibleEntries : visibleEntries.slice(0, 12);

    grid.innerHTML = shown.map((e) => {
      return `
        <article class="dex-entry">
          <button type="button" class="entry-trigger" data-open-entry="${e.number}" aria-label="Open dossier for ${e.name}">
            <div class="entry-art ${spriteClass(e.art)}" role="img" aria-label="Field-guide depiction of ${e.name}">
              <span class="entry-num">ENTRY ${e.number}</span>
              ${e.caseId ? `<span class="entry-case-pill">${e.caseId}</span>` : ''}
            </div>
            <div class="entry-body">
              <div class="entry-top">
                <h3>${e.name}</h3>
                <span class="entry-type ${e.type}">${typeLabels[e.type]}</span>
              </div>
              <p class="entry-region">${e.place}</p>
              <p class="entry-desc">${e.description}</p>
              <span class="entry-cta">Inspect dossier →</span>
            </div>
          </button>
        </article>`;
    }).join('');

    grid.querySelectorAll('[data-open-entry]').forEach((btn) => {
      btn.addEventListener('click', () => openDossierByNumber(btn.dataset.openEntry, btn));
    });

    count.textContent = `${visibleEntries.length} of ${entries.length} entries`;
    empty.classList.toggle('show', visibleEntries.length === 0);

    if (showMoreWrap && showMoreBtn) {
      const needsToggle = visibleEntries.length > 24 && !query;
      showMoreWrap.hidden = !needsToggle;
      if (needsToggle) {
        showMoreBtn.textContent = showAllEntries
          ? `Show first 12 entries`
          : `Show all ${visibleEntries.length} matching entries`;
        showMoreBtn.setAttribute('aria-expanded', showAllEntries ? 'true' : 'false');
      }
    }

    if (regionStats) {
      const geoCount = visibleEntries.filter((e) => e.coords !== null).length;
      const onlineCount = visibleEntries.length - geoCount;
      regionStats.textContent = onlineCount > 0
        ? `${geoCount} mapped locations · ${onlineCount} born-online entries`
        : `${geoCount} mapped locations shown`;
    }
  }

  function populateDossier(entry) {
    dossierArt.className = `dossier-art ${spriteClass(entry.art)}`;
    dossierArt.setAttribute('aria-label', `Enlarged field-guide art of ${entry.name}`);
    dossierNum.textContent = `CRYPTIDEX ENTRY ${entry.number}`;
    dossierTitle.textContent = entry.name;
    dossierPlace.textContent = entry.coords
      ? `${entry.place} · ${Math.abs(entry.coords[1]).toFixed(1)}°${entry.coords[1] >= 0 ? 'N' : 'S'}, ${Math.abs(entry.coords[0]).toFixed(1)}°${entry.coords[0] >= 0 ? 'E' : 'W'}`
      : `${entry.place} · Non-geographic internet origin`;
    dossierType.className = `entry-type ${entry.type}`;
    dossierType.textContent = typeLabels[entry.type];
    dossierLevel.textContent = entry.evidenceLevel;
    dossierDesc.textContent = entry.description;
    dossierStatus.textContent = entry.scientificStatus;
    dossierNext.textContent = entry.testableNext;

    if (entry.caseId) {
      dossierLabBtn.hidden = false;
      dossierLabBtn.dataset.caseId = entry.caseId;
      dossierLabBtn.textContent = `Investigate ${entry.caseId} in Case Lab →`;
    } else {
      dossierLabBtn.hidden = true;
    }
  }

  function openDossierByNumber(num, triggerEl) {
    if (!dialog) return;
    lastTriggerEl = triggerEl || document.activeElement;
    const idxInVisible = visibleEntries.findIndex((e) => e.number === num);
    const list = idxInVisible >= 0 ? visibleEntries : entries;
    activeDossierIndex = idxInVisible >= 0 ? idxInVisible : entries.findIndex((e) => e.number === num);
    if (activeDossierIndex < 0) activeDossierIndex = 0;

    populateDossier(list[activeDossierIndex]);
    const canStep = list.length > 1;
    dossierPrevBtn.disabled = !canStep;
    dossierNextBtn.disabled = !canStep;

    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    dossierCloseBtn.focus();
  }

  function closeDossier() {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    if (lastTriggerEl && lastTriggerEl.isConnected && lastTriggerEl.focus) {
      lastTriggerEl.focus({ preventScroll: true });
    }
  }

  function stepDossier(delta) {
    const list = visibleEntries.length > 0 ? visibleEntries : entries;
    activeDossierIndex = (activeDossierIndex + delta + list.length) % list.length;
    populateDossier(list[activeDossierIndex]);
  }

  if (dialog) {
    dossierCloseBtn.addEventListener('click', closeDossier);
    dossierPrevBtn.addEventListener('click', () => stepDossier(-1));
    dossierNextBtn.addEventListener('click', () => stepDossier(1));
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDossier();
    });
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeDossier();
    });
    dossierLabBtn.addEventListener('click', () => {
      const cid = dossierLabBtn.dataset.caseId;
      closeDossier();
      if (cid && typeof window.openCryptoCase === 'function') {
        window.openCryptoCase(cid);
      }
      document.getElementById('lab')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function setRegion(region) {
    activeRegion = region;
    showAllEntries = false;
    regionButtons.forEach((b) => b.classList.toggle('active', b.dataset.region === region));
    regionTitle.textContent = regionInfo[region][0];
    regionDesc.textContent = regionInfo[region][1];
    renderArchive();
  }

  regionButtons.forEach((b) => b.addEventListener('click', () => setRegion(b.dataset.region)));
  typeButtons.forEach((b) => b.addEventListener('click', () => {
    activeType = b.dataset.type;
    showAllEntries = false;
    typeButtons.forEach((x) => x.classList.toggle('active', x === b));
    renderArchive();
  }));
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
      showAllEntries = !showAllEntries;
      renderArchive();
    });
  }
  search?.addEventListener('input', () => {
    showAllEntries = false;
    renderArchive();
  });

  initWorldMap();
  renderArchive();

  /* ── 3. Evidence Ladder Quick-Check ──────────────────────────────── */
  (() => {
    const host = document.getElementById('evidenceQuiz');
    if (!host) return;
    const prompts = [
      {
        clue: 'A blurry 2-second trail-camera video of a dark mammal shape in fog, with no scale marker.',
        answer: 2,
        why: 'Level 2: A single ambiguous image is testable in principle, but without clear anatomy or scale it often fits known local wildlife.'
      },
      {
        clue: 'Three sterile pond water samples matching a rare salamander’s DNA, paired with clean field blanks and lab blanks.',
        answer: 4,
        why: 'Level 4: Genetic traces with documented chain of custody and negative contamination controls provide strong specific evidence.'
      },
      {
        clue: 'A family campfire story from 1984 describing a giant bird seen flying over a ridge at dusk.',
        answer: 1,
        why: 'Level 1: Eyewitness memory can suggest where to look, but distance, lighting, and time degrade accuracy.'
      }
    ];

    host.innerHTML = prompts.map((p, idx) => `
      <div class="quiz-item" data-quiz-idx="${idx}">
        <p class="quiz-clue"><strong>Clue ${idx + 1}:</strong> ${p.clue}</p>
        <div class="quiz-btns" role="group" aria-label="Select evidence level for clue ${idx + 1}">
          ${[1, 2, 3, 4, 5].map((lvl) => `<button type="button" class="quiz-btn" data-level="${lvl}">L${lvl}</button>`).join('')}
        </div>
        <p class="quiz-msg" aria-live="polite">Choose Level 1–5 to check your calibration.</p>
      </div>
    `).join('');

    host.querySelectorAll('.quiz-item').forEach((item) => {
      const p = prompts[Number(item.dataset.quizIdx)];
      const msg = item.querySelector('.quiz-msg');
      const btns = [...item.querySelectorAll('.quiz-btn')];
      btns.forEach((b) => b.addEventListener('click', () => {
        const picked = Number(b.dataset.level);
        btns.forEach((x) => {
          x.classList.remove('selected', 'right', 'wrong');
        });
        b.classList.add('selected', picked === p.answer ? 'right' : 'wrong');
        msg.className = `quiz-msg ${picked === p.answer ? 'ok' : 'retry'}`;
        msg.textContent = picked === p.answer
          ? `Exact match — ${p.why}`
          : `Not quite Level ${picked}. ${p.why}`;
      }));
    });
  })();

  /* ── 4. Six-Case Weighted Investigation Lab ──────────────────────── */
  (() => {
    const icons = {
      fish: '<svg viewBox="0 0 240 150" fill="none" stroke="currentColor" stroke-width="7"><path d="M28 76c42-52 108-60 155-20l33-26-8 46 8 44-34-24c-49 37-112 27-154-20z"/><circle cx="154" cy="62" r="4" fill="currentColor"/><path d="M76 49 91 20l25 30m-48 48 23 28 16-29M36 75h102"/></svg>',
      saola: '<svg viewBox="0 0 240 150" fill="none" stroke="currentColor" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"><path d="M58 128c8-34 26-52 54-56 18-3 36 2 50 12l24-18-8 26 24 10-22 14-26-4-12 22m-60-8l-10 22"/><path d="M162 72c18-24 38-46 62-60M150 68c16-24 34-46 56-62"/><circle cx="176" cy="84" r="3.5" fill="currentColor"/></svg>',
      wolf: '<svg viewBox="0 0 240 150" fill="none" stroke="currentColor" stroke-width="7"><path d="M30 102c18-24 44-37 79-38 21 0 39 5 55 15l21-28 5 32 23 13-27 13-17-7-16 14H83l-18-12-35 8z"/><path d="m85 105-9 34m69-35 12 34m-122-38L13 74m148 3 13-34 14 10"/></svg>',
      plesiosaur: '<svg viewBox="0 0 240 150" fill="none" stroke="currentColor" stroke-width="7"><path d="M29 103c42-28 80-35 112-21 17-8 27-26 30-55 2-17 11-23 26-17 14 6 16 16 7 29-8 12-15 26-18 43 15 2 28 10 39 24-45 17-85 17-119 1-23 15-49 17-77 7z"/><circle cx="193" cy="23" r="3" fill="currentColor"/></svg>',
      ape: '<svg viewBox="0 0 240 170" fill="none" stroke="currentColor" stroke-width="7"><circle cx="122" cy="39" r="24"/><path d="M93 68c-25 23-33 53-24 91m82-91c27 24 35 54 25 91M98 62c-8 35-5 66 9 93m37-93c8 35 5 66-9 93M79 89l-39 46m122-45 39 45"/></svg>',
      hydrophone: '<svg viewBox="0 0 240 150" fill="none" stroke="currentColor" stroke-width="6.5" stroke-linecap="round"><path d="M22 76h34l14-26 16 54 18-78 18 96 18-68 16 32 14-18 14 22 14-14h38"/><circle cx="104" cy="76" r="46" opacity=".35" stroke-dasharray="6 6"/></svg>'
    };

    const cases = [
      {
        id: 'CZ-01',
        name: 'Coelacanth',
        region: 'Western Indian Ocean · 1938',
        icon: 'fish',
        claim: 'Claim: a lobe-finned fish lineage known only from ancient fossils was still alive.',
        answer: 'confirmed',
        why: 'Confirmed species. A preserved whole body enabled anatomical study; later captures, submersible sightings, and genetics independently converged.',
        evidence: [
          ['Museum specimen', 'A whole fish caught off South Africa was preserved and examined by specialists.', 'Direct', 5, 'supports'],
          ['Diagnostic anatomy', 'Lobed fins, bone structure, and scales matched the fossil coelacanth lineage.', 'Specific', 4, 'supports'],
          ['Independent records', 'Later captures in the Comoros and Indonesia repeated the discovery.', 'Replicated', 5, 'supports'],
          ['Genetic evidence', 'Tissue samples sequenced two living species of Latimeria.', 'Testable', 4, 'supports']
        ]
      },
      {
        id: 'CZ-02',
        name: 'Saola Horns',
        region: 'Vu Quang Reserve, Vietnam · May 1992',
        icon: 'saola',
        claim: 'Claim (May 1992): an uncatalogued forest mammal lives in the Annamite Mountains.',
        answer: 'credible',
        why: 'Credible lead! In May 1992, biologists held unfamiliar physical skulls/horns and distinct DNA—not yet a live photographed population. That strong lead justified targeted surveys, confirming the saola (Pseudoryx nghetinhensis) shortly after.',
        evidence: [
          ['Physical horn sets', 'Three sets of unusually long, straight, smooth horns hung in village homes.', 'Physical', 4, 'supports'],
          ['Skull & tissue DNA', 'Initial skull measurements and tissue DNA matched no known catalogued bovid.', 'Diagnostic', 4, 'supports'],
          ['Live sightings', 'As of May 1992, no scientist had photographed or observed a living animal in the wild.', 'Pending', 2, 'ambiguous'],
          ['Intact forest habitat', 'Dense, remote Truong Son rainforest offered plausible cover for a rare browser.', 'Ecological', 3, 'supports']
        ]
      },
      {
        id: 'CZ-03',
        name: 'Thylacine survival',
        region: 'Tasmania · Post-1936 reports',
        icon: 'wolf',
        claim: 'Claim: a small breeding thylacine population survived after 1936.',
        answer: 'unresolved',
        why: 'Unresolved report. Past existence is certain and remote habitat exists, making survival biologically plausible in principle—yet modern camera and eDNA surveys have returned no diagnostic confirmation.',
        evidence: [
          ['Past existence', 'Museum specimens, photos, and historical film prove thylacines lived until 1936.', 'Certain', 5, 'supports'],
          ['Remote habitat', 'Rugged Tasmanian wilderness could conceal a low-density nocturnal mammal.', 'Plausible', 2, 'ambiguous'],
          ['Later sightings', 'Hundreds of eyewitness reports exist, mostly brief glimpses at dusk or road crossings.', 'Anecdotal', 1, 'ambiguous'],
          ['Modern surveys', 'Decades of camera traps and searches have not produced a body, verified DNA, or clear photo.', 'Negative test', 4, 'weakens']
        ]
      },
      {
        id: 'CZ-04',
        name: 'Loch Ness monster',
        region: 'Scotland · Modern reports',
        icon: 'plesiosaur',
        claim: 'Claim: a breeding population of large unknown vertebrates lives in Loch Ness.',
        answer: 'unsupported',
        why: 'Unsupported by current evidence. Photographs and sonar contacts are non-diagnostic, and a 2019 eDNA survey of 250+ samples found abundant eel DNA with zero unknown reptile DNA.',
        evidence: [
          ['Eyewitness reports', 'Descriptions vary widely across decades and often involve wind waves, wakes, or logs.', 'Anecdotal', 1, 'ambiguous'],
          ['Famous photographs', 'Key photos turned out to be blurry, staged models, or ordinary otters and birds.', 'Disputed', 2, 'weakens'],
          ['Sonar contacts', 'Brief sonar blips lack anatomical detail and can reflect fish schools or thermoclines.', 'Ambiguous', 2, 'ambiguous'],
          ['2019 eDNA & biomass', '250+ water samples detected known fish/eel DNA and no unknown vertebrate; food webs limit giant predators.', 'Disconfirming', 4, 'weakens']
        ]
      },
      {
        id: 'CZ-05',
        name: 'Bigfoot',
        region: 'North America · Modern reports',
        icon: 'ape',
        claim: 'Claim: an undiscovered breeding population of giant upright apes lives across North America.',
        answer: 'unsupported',
        why: 'Unsupported by current evidence. Stories and uncontrolled casts cannot outweigh missing bones, DNA, roadkill, or repeatable camera-trap detections across millions of monitored forest nights.',
        evidence: [
          ['Eyewitness reports', 'Many stories exist, but human perception in low light frequently misjudges bears or scale.', 'Anecdotal', 1, 'ambiguous'],
          ['Footprint casts', 'Some casts lack secure chain of custody; documented hoaxes show wooden carvings were used.', 'Uncontrolled', 2, 'weakens'],
          ['Hair & tissue tests', 'Published DNA tests on alleged samples have matched bears, dogs, horses, or humans.', 'Non-diagnostic', 4, 'weakens'],
          ['Missing population traces', 'A continental breeding mammal should leave bones, teeth, scat DNA, and trail-cam frames.', 'Missing', 4, 'weakens']
        ]
      },
      {
        id: 'CZ-06',
        name: 'The Bloop',
        region: 'South Pacific · 1997 hydrophone',
        icon: 'hydrophone',
        claim: 'Claim: the 1997 ultra-low-frequency ocean sound came from a colossal unknown sea monster.',
        answer: 'unsupported',
        why: 'Unsupported claim (explained physical phenomenon). NOAA acousticians matched the Bloop’s frequency sweep and timing to massive Antarctic icequakes—icebergs fracturing and grinding.',
        evidence: [
          ['1997 NOAA recording', 'Autonomous hydrophones detected a loud ~1-minute ultra-low-frequency sound across 5,000 km.', 'Calibrated', 3, 'ambiguous'],
          ['Monster speculation', 'Early commentary joked about giant marine life; later internet art invented a leviathan.', 'Anecdotal', 1, 'ambiguous'],
          ['Icequake signature', 'Follow-up arrays near Antarctica recorded identical broadband acoustic patterns from fracturing icebergs.', 'Explained', 4, 'weakens'],
          ['Zero biological follow-up', 'No carcass, sonar target, or biological vocalization ever linked the sound to an animal.', 'Negative test', 4, 'weakens']
        ]
      }
    ];

    const verdicts = [
      ['confirmed', 'Confirmed species'],
      ['credible', 'Credible lead'],
      ['unresolved', 'Unresolved report'],
      ['unsupported', 'Unsupported claim']
    ];

    const tabs = document.getElementById('caseTabs');
    const evidenceList = document.getElementById('evidenceList');
    const verdictOptions = document.getElementById('verdictOptions');
    const labProgress = document.getElementById('labProgress');
    const meterTally = document.getElementById('meterTally');
    const meterFill = document.getElementById('meterFill');
    const feedback = document.getElementById('feedback');
    if (!tabs || !evidenceList || !verdictOptions) return;

    let current = 0;
    let selected = '';
    let revealed = new Set();
    const solvedCases = new Set();

    const dirLabel = { supports: '+ Supports', ambiguous: '? Ambiguous', weakens: '− Weakens' };

    function updateProgress() {
      if (labProgress) {
        labProgress.textContent = `${solvedCases.size} / ${cases.length} cases calibrated`;
        labProgress.classList.toggle('done', solvedCases.size === cases.length);
      }
      [...tabs.children].forEach((b, i) => {
        const isSolved = solvedCases.has(cases[i].id);
        b.textContent = `${isSolved ? '✓ ' : ''}${cases[i].id} · ${cases[i].name}`;
      });
    }

    function updateMeter() {
      const c = cases[current];
      if (revealed.size === 0) {
        meterFill.style.width = '0%';
        if (meterTally) meterTally.textContent = 'Inspect all 4 packets to weigh evidence direction.';
        return;
      }
      let score = 50;
      let sup = 0, amb = 0, weak = 0;
      revealed.forEach((idx) => {
        const [, , , lvl, dir] = c.evidence[idx];
        const weight = lvl * 3.4;
        if (dir === 'supports') { score += weight; sup++; }
        else if (dir === 'weakens') { score -= weight; weak++; }
        else { score -= 1.5; amb++; }
      });
      const pct = Math.max(8, Math.min(100, Math.round(score)));
      meterFill.style.width = `${pct}%`;
      if (meterTally) {
        meterTally.textContent = `Supports: ${sup} · Ambiguous: ${amb} · Weakens: ${weak} (Net index: ${pct}%)`;
      }
    }

    cases.forEach((c, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'case-tab';
      button.setAttribute('role', 'tab');
      button.textContent = `${c.id} · ${c.name}`;
      button.addEventListener('click', () => show(i));
      tabs.appendChild(button);
    });

    verdicts.forEach(([value, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'verdict-btn';
      button.dataset.value = value;
      button.textContent = label;
      button.addEventListener('click', () => {
        selected = value;
        [...verdictOptions.children].forEach((b) => b.classList.toggle('selected', b === button));
      });
      verdictOptions.appendChild(button);
    });

    function show(index) {
      current = index;
      selected = '';
      revealed = new Set();
      const c = cases[index];
      [...tabs.children].forEach((b, i) => {
        b.classList.toggle('active', i === index);
        b.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
      document.getElementById('caseNumber').textContent = `Case file ${c.id}`;
      document.getElementById('caseName').textContent = c.name;
      document.getElementById('caseRegion').textContent = c.region;
      document.getElementById('caseClaim').textContent = c.claim;
      document.getElementById('caseSilhouette').innerHTML = icons[c.icon];
      feedback.className = 'feedback';
      feedback.textContent = 'Reveal all 4 packets before choosing a verdict.';
      [...verdictOptions.children].forEach((b) => b.classList.remove('selected'));

      evidenceList.innerHTML = '';
      c.evidence.forEach((e, i) => {
        const [title, detail, tag, lvl, dir] = e;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'evidence-card';
        b.innerHTML = `
          <span class="evidence-icon">${i + 1}</span>
          <span>
            <b>${title}</b>
            <small class="prompt">Tap to declassify packet</small>
            <small class="hidden-detail">${detail}</small>
          </span>
          <span class="packet-meta hidden-detail">
            <span class="quality">${tag} · L${lvl}</span>
            <span class="dir-pill dir-${dir}">${dirLabel[dir]}</span>
          </span>`;
        b.addEventListener('click', () => {
          b.classList.add('revealed');
          revealed.add(i);
          updateMeter();
        });
        evidenceList.appendChild(b);
      });
      updateMeter();
    }

    document.getElementById('checkVerdict')?.addEventListener('click', () => {
      const c = cases[current];
      if (revealed.size < c.evidence.length) {
        feedback.className = 'feedback try';
        feedback.textContent = `Open all ${c.evidence.length} packets before deciding.`;
        return;
      }
      if (!selected) {
        feedback.className = 'feedback try';
        feedback.textContent = 'Choose the status best supported by the evidence.';
        return;
      }
      if (selected === c.answer) {
        solvedCases.add(c.id);
        updateProgress();
        feedback.className = 'feedback correct';
        const bonus = solvedCases.size === cases.length
          ? ' All 6 cases calibrated — your scientific confidence matches the evidence ladder!'
          : '';
        feedback.textContent = `Well calibrated. ${c.why}${bonus}`;
      } else {
        feedback.className = 'feedback try';
        feedback.textContent = `Reconsider the difference between possibility, credible lead, and confirmation. ${c.why}`;
      }
    });

    window.openCryptoCase = (caseId) => {
      const idx = cases.findIndex((c) => c.id === caseId);
      if (idx >= 0) show(idx);
    };

    updateProgress();
    show(0);
  })();

  /* ── 5. SimKit 30-Day Field Survey Simulator & Draft Protocol ─────── */
  (() => {
    const habitatEl = document.getElementById('habitat');
    const toolEl = document.getElementById('tool');
    const densityEl = document.getElementById('gridDensity');
    const controlsEl = document.getElementById('controlsToggle');
    const runBtn = document.getElementById('runSurveyBtn');
    const resetBtn = document.getElementById('resetSurveyBtn');
    const output = document.getElementById('planOutput');
    const canvas = document.getElementById('surveyCanvas');
    const simDayEl = document.getElementById('simDay');
    const simKnownEl = document.getElementById('simKnown');
    const simCaughtEl = document.getElementById('simCaught');
    const simMysteryEl = document.getElementById('simMystery');
    const simSummaryEl = document.getElementById('simSummary');
    if (!habitatEl || !toolEl || !output || !canvas || !window.SimKit) return;

    const habitats = {
      forest: {
        layout: 'a 10 × 10 km sampling grid',
        features: 'animal trails, water crossings, and ridge lines',
        bg: '#081b15',
        contour: 'rgba(118, 230, 207, 0.14)',
        knownSpecies: 'black bears, elk, cougars, and barred owls',
        falseSource: 'lens condensation, wind-blown branches, or common deer at dusk'
      },
      lake: {
        layout: 'shore, open water, and depth zones',
        features: 'seasonal turnover, boat traffic, and known fish',
        bg: '#071722',
        contour: 'rgba(115, 219, 239, 0.15)',
        knownSpecies: 'European eels, lake trout, otters, and diving cormorants',
        falseSource: 'boat wakes, submerged timber, or cross-contaminated bucket water'
      },
      ocean: {
        layout: 'transects across the continental slope',
        features: 'depth, pressure, current, and bycatch records',
        bg: '#061221',
        contour: 'rgba(115, 219, 239, 0.14)',
        knownSpecies: 'sperm whales, deep-sea squid, lanternfish, and benthic skates',
        falseSource: 'calving icequake echoes or thermocline scattering layers'
      },
      wetland: {
        layout: 'repeatable stations above the flood line',
        features: 'water level, temperature, and seasonal access',
        bg: '#0d1a14',
        contour: 'rgba(156, 231, 169, 0.15)',
        knownSpecies: 'herons, muskrats, snapping turtles, and swamp rabbits',
        falseSource: 'mud-distorted tracks or overlapping overlapping amphibian calls'
      }
    };

    const tools = {
      camera: {
        method: 'paired cameras with scale markers',
        controls: 'empty frames, known-animal images, timestamps, and device uptime'
      },
      edna: {
        method: 'sterile replicate samples',
        controls: 'field blanks, lab blanks, reference sequences, and repeat sampling'
      },
      audio: {
        method: 'synchronized recorders',
        controls: 'known calls, weather noise, equipment noise, and independent listeners'
      },
      sonar: {
        method: 'calibrated transects at fixed speed',
        controls: 'known targets, bottom structure, repeat passes, and blind review'
      }
    };

    const surface = window.SimKit.canvas2d(canvas, { height: 290 });
    const raf = window.SimKit.raf(canvas);
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let stations = [];
    let detections = [];
    let running = false;
    let day = 0;
    let rafId = null;
    let lastTime = 0;

    function seeded(i) {
      const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    }

    function buildSurvey() {
      const count = Number(densityEl?.value || 9);
      const cols = Math.round(Math.sqrt(count));
      const controlsOn = controlsEl ? controlsEl.value === 'on' : true;
      stations = [];
      detections = [];

      for (let r = 0; r < cols; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          stations.push({
            nx: (c + 0.5) / cols + (seeded(idx + 1) - 0.5) * 0.08,
            ny: (r + 0.5) / cols + (seeded(idx + 20) - 0.5) * 0.08,
            label: `S${idx + 1}`
          });
        }
      }

      // Generate deterministic 30-day detection events scaled to station density
      const totalEvents = count * 2 + 4;
      for (let i = 0; i < totalEvents; i++) {
        const st = stations[i % stations.length];
        const triggerDay = 1 + Math.floor((i / totalEvents) * 28.5);
        const roll = seeded(i * 7 + count + (habitatEl.selectedIndex + 1) * 3);
        let kind = 'known';
        if (roll > 0.72) {
          kind = controlsOn ? 'caught' : 'mystery';
        }
        detections.push({
          station: st,
          day: triggerDay,
          kind,
          offsetAngle: seeded(i + 50) * Math.PI * 2
        });
      }
    }

    function updateReadout() {
      const controlsOn = controlsEl ? controlsEl.value === 'on' : true;
      const hab = habitats[habitatEl.value];
      const shown = detections.filter((d) => d.day <= day);
      const knownCount = shown.filter((d) => d.kind === 'known').length;
      const caughtCount = shown.filter((d) => d.kind === 'caught').length;
      const mysteryCount = shown.filter((d) => d.kind === 'mystery').length;

      if (simDayEl) simDayEl.textContent = `Day ${Math.floor(day)} / 30`;
      if (simKnownEl) simKnownEl.textContent = String(knownCount);
      if (simCaughtEl) simCaughtEl.textContent = String(caughtCount);
      if (simMysteryEl) simMysteryEl.textContent = String(mysteryCount);

      if (simSummaryEl) {
        if (day === 0) {
          simSummaryEl.textContent = 'Press Run 30-day survey to deploy sensors and compare detections with controls ON vs. OFF.';
        } else if (controlsOn) {
          simSummaryEl.textContent = `With controls ON, ${caughtCount} false alarm(s) from ${hab.falseSource} were filtered out instead of misclassified—while logging ${knownCount} confirmed records of ${hab.knownSpecies}.`;
        } else {
          simSummaryEl.textContent = `With controls OFF, ${mysteryCount} unverified hit(s) look like a mystery creature—even though ${hab.falseSource} could explain them without any new species.`;
        }
      }
    }

    function drawFrame() {
      const { ctx, width: w, height: h } = surface;
      if (!w || !h) return;
      const hab = habitats[habitatEl.value];
      const controlsOn = controlsEl ? controlsEl.value === 'on' : true;

      ctx.fillStyle = hab.bg;
      ctx.fillRect(0, 0, w, h);

      // Subtle coordinate grid
      ctx.strokeStyle = 'rgba(255,255,255,0.045)';
      ctx.lineWidth = 1;
      for (let x = 40; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 40; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Habitat contour rings
      ctx.strokeStyle = hab.contour;
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.ellipse(w * 0.52, h * 0.52, w * (0.14 * i), h * (0.16 * i), 0.18, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Active scan sweep line when running
      if (running || day > 0) {
        const sweepX = (day / 30) * w;
        const grad = ctx.createLinearGradient(sweepX - 55, 0, sweepX, 0);
        grad.addColorStop(0, 'rgba(118, 230, 207, 0)');
        grad.addColorStop(1, 'rgba(118, 230, 207, 0.16)');
        ctx.fillStyle = grad;
        ctx.fillRect(Math.max(0, sweepX - 55), 0, Math.min(55, sweepX), h);

        ctx.strokeStyle = 'rgba(118, 230, 207, 0.45)';
        ctx.beginPath();
        ctx.moveTo(sweepX, 0);
        ctx.lineTo(sweepX, h);
        ctx.stroke();
      }

      // Draw detection rings
      detections.forEach((d) => {
        if (d.day > day) return;
        const age = Math.min(1, (day - d.day) / 3.5);
        const sx = d.station.nx * w;
        const sy = d.station.ny * h;
        const px = sx + Math.cos(d.offsetAngle) * 14;
        const py = sy + Math.sin(d.offsetAngle) * 14;
        const color = d.kind === 'known'
          ? '118, 230, 207'
          : (d.kind === 'caught' ? '255, 203, 69' : '238, 81, 73');

        ctx.strokeStyle = `rgba(${color}, ${Math.max(0.18, 1 - age * 0.7)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 6 + age * 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgb(${color})`;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw sensor stations
      stations.forEach((s) => {
        const sx = s.nx * w;
        const sy = s.ny * h;
        ctx.fillStyle = '#0b1b1c';
        ctx.strokeStyle = controlsOn ? '#76e6cf' : '#ffcb45';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#edf4ef';
        ctx.font = '600 10px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(s.label, sx, sy - 13);
      });

      // Legend badge inside canvas
      ctx.fillStyle = 'rgba(8, 19, 21, 0.84)';
      ctx.fillRect(10, 10, 236, 26);
      ctx.strokeStyle = 'rgba(167, 205, 192, 0.25)';
      ctx.strokeRect(10, 10, 236, 26);
      ctx.fillStyle = '#d8fff1';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${stations.length} STATIONS · CONTROLS ${controlsOn ? 'ON' : 'OFF'}`, 20, 27);
    }

    function tick(ts) {
      if (!running) return;
      if (!lastTime) lastTime = ts;
      const dt = Math.min(0.1, (ts - lastTime) / 1000);
      lastTime = ts;
      day = Math.min(30, day + dt * 6.5);
      drawFrame();
      updateReadout();
      if (day < 30) {
        rafId = raf(tick);
      } else {
        running = false;
        if (runBtn) runBtn.textContent = 'Run 30-day survey again';
      }
    }

    function renderProtocol() {
      const h = habitats[habitatEl.value];
      const t = tools[toolEl.value];
      const count = Number(densityEl?.value || 9);
      const controlsOn = controlsEl ? controlsEl.value === 'on' : true;
      output.innerHTML = `
        <p class="panel-label">Draft protocol</p>
        <h3>${toolEl.options[toolEl.selectedIndex].text} in a ${habitatEl.options[habitatEl.selectedIndex].text.toLowerCase()}</h3>
        <p><strong>Layout:</strong> Deploy <strong>${count} stations</strong> across ${h.layout} covering ${h.features}.</p>
        <p><strong>Method:</strong> Collect ${t.method} on a fixed 30-day schedule.</p>
        <p><strong>Controls (${controlsOn ? 'Enabled' : 'Disabled — caution'}):</strong> ${controlsOn
          ? `Record ${t.controls} to isolate ${h.falseSource}.`
          : `Without ${t.controls}, ${h.falseSource} will look identical to a mystery signal.`}</p>
        <p><strong>Success rule:</strong> Decide in advance what combination of independent evidence would justify a follow-up—and publish non-detections alongside biodiversity records.</p>`;
    }

    function resetSurvey(runImmediately = false) {
      if (rafId) raf.cancel(rafId);
      running = false;
      day = 0;
      lastTime = 0;
      buildSurvey();
      if (runImmediately) {
        if (reducedMotion) {
          day = 30;
          if (runBtn) runBtn.textContent = 'Run 30-day survey again';
        } else {
          running = true;
          if (runBtn) runBtn.textContent = 'Surveying…';
          rafId = raf(tick);
        }
      } else if (runBtn) {
        runBtn.textContent = 'Run 30-day survey';
      }
      drawFrame();
      updateReadout();
      renderProtocol();
    }

    runBtn?.addEventListener('click', () => resetSurvey(true));
    resetBtn?.addEventListener('click', () => resetSurvey(false));
    [habitatEl, toolEl, densityEl, controlsEl].forEach((el) => {
      el?.addEventListener('change', () => resetSurvey(false));
    });

    const ro = window.ResizeObserver ? new ResizeObserver(() => drawFrame()) : null;
    if (ro) ro.observe(canvas.parentElement);

    resetSurvey(false);
  })();
})();
