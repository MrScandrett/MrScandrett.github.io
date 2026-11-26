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

  /* ── 2. Global Historical Field Atlas + EarthEngine Map + Dossiers ─ */
  // All 30 entries use verified Public Domain / CC0 historical natural-history depictions.
  const rawEntries = [
    ['Okapi', 'africa', 'documented', 'Ituri Rainforest, DR Congo', 'Long known to the Indigenous Mbuti people, this shy giraffe relative was dismissed by outsiders as a myth until skins and skulls reached London in 1901.', 'okapi', [28.5, 1.5], 'Level 5 · Confirmed species', 'Sir Harry Johnston’s 1901 illustration accompanied physical hides and two skulls, confirming Okapia johnstoni as a living forest mammal.', 'Compare museum specimen records with modern camera-trap conservation surveys.', 'Sir Harry Johnston', '1901', 'Proceedings of the Zoological Society of London', 'Public domain', null],
    ['Mountain & Western Gorilla', 'africa', 'documented', 'Equatorial Central Africa', 'For centuries, travelers’ tales of giant forest apes sounded like tall tales until explorers and museums examined complete skeletons in the 1840s–1860s.', 'gorilla', [10.5, 0.2], 'Level 5 · Confirmed species', 'Anatomical specimens studied by Richard Owen and Paul du Chaillu proved gorillas were real primates, not forest legends.', 'Examine how skeletal evidence settles doubts about unfamiliar wildlife.', 'Paul du Chaillu', '1861', 'Explorations and Adventures in Equatorial Africa', 'Public domain', null],
    ['Coelacanth', 'africa', 'documented', 'East London, South Africa', 'Known only from ancient fossil plates like Gideon Mantell’s 1848 Macropoma drawing until a living coelacanth was caught off South Africa in 1938.', 'coelacanth', [27.91, -33.02], 'Level 5 · Confirmed species', 'Preservation of the 1938 catch allowed specialists to compare its lobed fins directly with fossil specimens—then DNA and submersibles confirmed two living species.', 'Benchmark case showing how one preserved specimen plus replication resolves a claim.', 'Gideon Algernon Mantell', '1848', 'Fossil coelacanth lithograph (Macropoma)', 'Public domain', 'CZ-01'],
    ['Elephant Bird', 'africa', 'documented', 'Madagascar', 'Enormous eggshells and traveler stories about giant birds inspired legends, while fossil bones proved Aepyornis maximus once lived on Madagascar.', 'elephant-bird', [46.5, -20.5], 'Level 5 · Documented (Extinct)', 'Subfossil bones and intact giant eggs confirm elephant birds lived until roughly 1,000 years ago; no verified modern living population exists.', 'Study radiocarbon dates on subfossil bones and eggshells.', 'Monnier', '1913', 'Natural history plate of Aepyornis maximus', 'Public domain', null],
    ['Mokele-mbembe', 'africa', 'reported', 'Congo Basin', 'Early 20th-century expedition stories described a large swamp animal that writers sketched like a living sauropod such as Charles R. Knight’s Diplodocus.', 'mokele-mbembe', [17.2, 1.3], 'Level 1–2 · Unverified testimony', 'Multiple surveys returned without photographs, tracks, carcasses, or non-avian dinosaur fossils younger than 66 million years.', 'Use autonomous camera traps and river eDNA to inventory real Congo Basin biodiversity.', 'Charles R. Knight', '1907', 'Century Magazine sauropod restoration', 'Public domain', null],
    ['Dodo', 'africa', 'documented', 'Mauritius, Indian Ocean', 'So strange to 17th-century visitors that some later doubted it existed—preserved paintings by Roelant Savery and skeletal bones proved the dodo was real.', 'dodo', [57.55, -20.28], 'Level 5 · Documented (Extinct)', 'Museum skeletal remains and contemporary Dutch and Flemish paintings establish Raphus cucullatus as an extinct flightless pigeon.', 'Learn how habitat loss and introduced predators caused extinction, teaching faithful stewardship.', 'Roelant Savery', 'c. 1626', 'Natural History Museum London historical painting', 'Public domain', null],

    ['Platypus', 'oceania', 'documented', 'Eastern Australia', 'When George Shaw and Frederick Nodder published this 1799 illustration, some European naturalists suspected the duck-billed specimen was stitched together as a hoax.', 'platypus', [149.8, -34.2], 'Level 5 · Confirmed species', 'Careful dissection of preserved specimens proved the platypus was a real egg-laying mammal (monotreme) designed for freshwater foraging.', 'Observe how direct anatomical study overcomes disbelief when a real animal looks surprising.', 'Frederick Polydore Nodder', '1799', 'The Naturalist’s Miscellany', 'CC0 1.0', null],
    ['Thylacine', 'oceania', 'documented', 'Tasmania, Australia', 'A documented marsupial predator photographed at Hobart Zoo in 1928 and declared extinct in the 20th century; occasional modern sightings remain unconfirmed.', 'thylacine', [146.8, -42.1], 'Level 5 (Past) · Survival unresolved', 'Specimens, film, and sequenced DNA prove thylacines lived until 1936; modern search grids have not yet found a verified living individual.', 'Compare historical zoo records with modern remote camera-trap grids in Tasmania.', 'Harry Burrell', '1928', 'Archival Hobart Zoo photograph', 'Public domain', 'CZ-03'],
    ['Giant Moa', 'oceania', 'documented', 'New Zealand', 'Māori oral traditions and giant bones sent to Richard Owen in London confirmed towering flightless birds once walked New Zealand’s forests.', 'giant-moa', [170.5, -43.8], 'Level 5 · Documented (Extinct)', 'Abundant subfossil skeletons confirm moa lived until ~1440 CE; modern survival claims lack feathers, footprints, or fresh eDNA.', 'Compare fossil skeletons with modern New Zealand forest bird surveys.', 'John van Voorst / Richard Owen', '1879', 'Memoirs on the Extinct Wingless Birds of New Zealand', 'Public domain', null],
    ['Bunyip', 'oceania', 'folklore', 'Southeastern Australia', 'An umbrella name applied by 19th-century newspapers—like this 1890 engraving—to varied Aboriginal water-being traditions across Australia.', 'bunyip', [144.9, -36.0], 'Historical folklore', 'Originates in Wemba-Wemba and other Aboriginal traditions; colonial artists blended diverse regional stories into dramatic newspaper sketches.', 'Read Nation-specific Aboriginal histories alongside freshwater seal or bittern ecology.', 'J. Macfarlane', '1890', 'Illustrated Australian News', 'Public domain', null],

    ['Giant Squid', 'asia', 'documented', 'North Pacific & North Atlantic', 'Sailors’ sea-monster stories were confirmed when stranded squid reached scientists like Addison Verrill in 1882; living deep-sea photos arrived in 2004.', 'giant-squid', [142.2, 27.1], 'Level 5 · Confirmed species', 'Stranded carcasses and beaks proved Architeuthis dux was real long before deep-water baited cameras photographed one alive.', 'Notice the difference between confirming a species from remains and filming it in habitat.', 'Addison Emery Verrill / J. H. Emerton', '1882', 'Report on the Cephalopods of the Northeastern Coast of America', 'Public domain', null],
    ['Giant Panda', 'asia', 'documented', 'Sichuan Mountains, China', 'Known to local communities in western China for centuries, the giant panda first reached Western museums in 1869 and became a global symbol of conservation.', 'giant-panda', [103.5, 31.1], 'Level 5 · Confirmed species', 'Ailuropoda melanoleuca is a well-documented bamboo-eating bear protected through dedicated mountain reserves.', 'See how protected habitats help rare animals recover from low numbers.', 'Jeff Kubina', '2004', 'Smithsonian National Zoological Park record', 'Public domain', null],
    ['Himalayan Bear (Yeti reports)', 'asia', 'reported', 'Himalayas & Tibetan Plateau', 'High-altitude footprint claims in the Himalayas led explorers to search for a mystery creature, while DNA tests on hair samples matched local bears like Joseph Smit’s 1897 plate.', 'yeti-tracks', [86.9, 27.9], 'Level 4 · DNA matched known bears', 'Peer-reviewed DNA testing of alleged Yeti hair, bone, and skin samples matched Himalayan brown bears, Tibetan blue bears, and black bears.', 'Compare melting snow tracks (which stretch as snow warms) with known bear paw shapes.', 'Joseph Smit', '1897', 'Proceedings of the Zoological Society of London', 'Public domain', null],
    ['Kappa', 'asia', 'folklore', 'Japan', 'A well-known river creature from Japanese folklore—illustrated in this 1836 Edo-period scroll—created to teach children water safety and kindness.', 'kappa', [135.7, 35.0], 'Historical folklore (yōkai)', 'Kappa belong to Japanese folklore (yōkai) rather than proposed wildlife, though real Japanese giant salamanders also share mountain streams.', 'Appreciate traditional cultural artwork while distinguishing folklore from zoology.', 'Reikai (after Edo-period scroll)', '1836', 'Suiko Jūnishu (Twelve Types of Water Creatures)', 'Public domain', null],

    ['Loch Ness Monster', 'europe', 'reported', 'Loch Ness, Scotland', 'Postcards like this c. 1903 view of Urquhart Castle show how long people have visited Loch Ness, where later sighting waves and photos sparked monster legends.', 'loch-ness', [-4.45, 57.3], 'Level 2 · Disputed / eDNA negative', 'A 2019 international eDNA study of 250+ water samples found abundant eel, salmon, and trout DNA—with zero unknown reptile or giant mammal DNA.', 'Compare food-web energy limits in a cold freshwater loch against famous optical illusions.', 'Historical Scottish Postcard', 'c. 1903', 'Newberry Library Postcard Archive', 'Public domain', 'CZ-04'],
    ['Plesiosaur (Duria Antiquior)', 'europe', 'explained', 'Lyme Regis, England', 'Henry De la Beche’s 1830 fossil reconstruction—inspired by Mary Anning’s discoveries—shows extinct marine reptiles that later inspired modern lake-monster art.', 'plesiosaur', [-2.93, 50.72], 'Explained · Extinct fossil lineage', 'Plesiosaurs are real fossil marine reptiles from the Mesozoic Era, known from rich skeletal beds—not living freshwater lake populations.', 'Notice how 19th-century fossil paintings shaped the silhouette people still sketch for Nessie.', 'Henry De la Beche', '1830', 'Duria Antiquior (Lyme Regis fossil reconstruction)', 'Public domain', null],
    ['Kraken', 'europe', 'folklore', 'Norwegian & North Atlantic Seas', 'Early naturalists like Pierre Denys de Montfort (1810) drew giant tentacled octopuses from sailors’ stories—an exaggerated echo of real giant squid.', 'kraken', [5.0, 62.5], 'Folklore / real-animal inspiration', 'Medieval accounts magnified real cephalopod encounters to ship-wrapping size, yet Architeuthis carcasses proved giant deep-water squid truly exist.', 'Compare Denys de Montfort’s 1810 engraving with Verrill’s 1882 scientific drawing.', 'Pierre Denys de Montfort', '1810', 'Histoire Naturelle Générale et Particulière des Mollusques', 'Public domain', null],
    ['HMS Daedalus Sea Serpent', 'ocean', 'reported', 'South Atlantic Ocean', 'In 1848, the crew of HMS Daedalus reported a long swimming shape in open water, engraved here in the Illustrated London News; historians still debate whales, kelp, or ribbons.', 'sea-serpent', [-15.0, -24.5], 'Level 1–2 · Unconfirmed sighting', 'Without a specimen or photograph, a brief shipboard sighting at sea remains open to ordinary explanations such as swimming elephant seals, whales, or oarfish.', 'Test how distance over open ocean waves makes estimating animal length difficult.', 'Edwin Weedon / Illustrated London News', '1848', 'Illustrated London News archival engraving', 'Public domain', null],
    ['Unicorn (Early Natural History)', 'europe', 'folklore', 'Zurich, Switzerland', 'Renaissance scholar Conrad Gessner included the unicorn in his 1551 animal encyclopedia alongside real horses and deer because travelers’ tales still mixed fact and legend.', 'unicorn', [8.54, 47.37], 'Historical folklore / art', 'European unicorn imagery grew from misread descriptions of rhinoceroses and traded Arctic narwhal tusks.', 'Trace how museum collections separated mythical drawings from real horned mammals.', 'Conrad Gessner', '1551', 'Historiae Animalium (Wellcome Collection)', 'Public domain', null],
    ['Narwhal ("Sea Unicorn")', 'ocean', 'documented', 'Arctic Ocean', 'Engravings like this 1800 plate of the "Horned Narval" revealed the real source of medieval "unicorn horns": the spiral tusk of an Arctic whale.', 'narwhal', [-55.0, 72.0], 'Level 5 · Confirmed species', 'Monodon monoceros males grow a spiral sensory tooth up to 3 meters long—explaining centuries of Arctic trade stories.', 'Compare Conrad Gessner’s 1551 unicorn woodcut with this 1800 narwhal engraving.', 'Harrison, Ause & Co.', '1800', 'Natural history engraving of Monodon monoceros', 'Public domain', null],
    ['Tatzelwurm', 'europe', 'folklore', 'European Alps', 'An Alpine mountain legend pictured in this 1835 Weimar woodcut as a short lizard-like creature with cat features and two front legs.', 'tatzelwurm', [10.5, 46.8], 'Historical folklore', 'Centuries of Alpine traveler stories vary widely in size and shape, with zero preserved specimens in European museums.', 'Compare historical woodcuts with real Alpine salamanders and lizards.', 'G. Schultes', '1835', 'Weimar Alpine natural-history woodcut', 'Public domain', null],
    ['Griffin (Aldrovandi Plate)', 'europe', 'folklore', 'Bologna, Italy', 'Italian naturalist Ulisse Aldrovandi published this 1642 woodcut of a griffin—half eagle, half lion—showing how Renaissance scholars catalogued ancient stories alongside real birds.', 'griffin', [11.34, 44.49], 'Historical folklore', 'Griffins are symbolic composite creatures from ancient Mediterranean and Central Asian art, not biological animals.', 'Notice how Renaissance encyclopedias gradually shifted from folklore woodcuts to anatomical drawings.', 'Ulisse Aldrovandi / Jean-Baptiste Coriolan', '1642', 'Monstrorum Historia', 'Public domain', null],

    ['Bigfoot (Bear Misidentification)', 'north-america', 'reported', 'Pacific Northwest, North America', 'Reports of large forest silhouettes and footprints in North America overlap closely with the range of real upright-standing bears, shown in John Woodhouse Audubon’s 1845 plate.', 'bigfoot-tracks', [-122.6, 45.6], 'Level 1–2 · Testimony & casts', 'Published DNA tests on alleged hair samples have matched bears, dogs, or humans, and millions of trail-camera nights have captured bears—not an unknown ape.', 'Compare bear hind footprints with overlapping step patterns that look oversized in mud.', 'John Woodhouse Audubon', '1845', 'The Viviparous Quadrupeds of North America', 'Public domain', 'CZ-05'],
    ['Thunderbird & Golden Eagle', 'north-america', 'folklore', 'North American Plains & Coast', 'Traditional Thunderbird stories hold deep cultural meaning in Indigenous communities, while modern giant-bird sightings often reflect real raptors like Audubon’s Golden Eagle.', 'thunderbird', [-104.5, 44.2], 'Cultural tradition / known raptors', 'Distinct Indigenous Thunderbird traditions are cultural heritage rather than zoological claims; modern large-bird photos are best checked with known eagle and condor wingspans.', 'Respect community histories and measure wingspan against background objects in photos.', 'John James Audubon', '1833', 'The Birds of America', 'Public domain', null],
    ['Giant Oarfish', 'ocean', 'documented', 'Bermuda & Temperate Oceans', 'When this 16-foot ribbon-like fish washed ashore in Bermuda in 1860, Harper’s Weekly called it a "sea serpent"—proving a real deep-sea animal lay behind many sailor tales.', 'oarfish', [-64.75, 32.3], 'Level 5 · Confirmed species', 'Regalecus glesne is the longest living bony fish (up to ~11 meters), whose shimmering red dorsal fin explains many historic sea-serpent reports.', 'See how a single stranded specimen turns a sea-serpent report into real oceanography.', 'Harper’s Weekly', '1860', 'Harper’s Weekly natural history engraving', 'Public domain', null],
    ['Manatee (Sailors’ "Mermaids")', 'ocean', 'documented', 'Caribbean & Atlantic Coasts', 'Early sailors wrote of mermaids in tropical waters, while naturalists like Albin Mesnel (1870) illustrated the gentle, plant-eating manatees behind those distant glimpses.', 'manatee-mermaid', [-77.3, 21.5], 'Level 5 · Confirmed species', 'Trichechus manatus and dugongs surface quietly to breathe in coastal lagoons, showing how brief, hazy sightings can spark centuries of folklore.', 'Compare misty horizon viewing conditions with clear underwater photography.', 'Albin Mesnel', '1870', 'Mammalia: Their Various Orders and Habits', 'Public domain', null],

    ['Mapinguari (Giant Sloth Hypothesis)', 'latin-america', 'folklore', 'Amazon Basin', 'Some outsiders suggested Amazonian Mapinguari stories echoed surviving giant ground sloths—whose real fossil skeletons, like this 1906 Cuvier Megatherium mount, amazed early scientists.', 'mapinguari-sloth', [-63.0, -4.5], 'Historical folklore / fossil link', 'Fossil Megatherium skeletons confirm giant ground sloths lived until the end of the Ice Age (~10,000 years ago), with no modern bones or eDNA found since.', 'Distinguish living Amazonian storytelling from paleontological fossil records.', 'Agence Rol / Muséum national d’histoire naturelle', '1906', 'Bibliothèque nationale de France archival plate', 'Public domain', null],
    ['Yacumama & Green Anaconda', 'latin-america', 'folklore', 'Western Amazon Waterways', 'River stories of an immense water serpent in the Amazon connect to real green anacondas—illustrated in this 18th-century Amsterdam print—which reach up to 5–6 meters.', 'yacumama-anaconda', [-73.25, -3.75], 'Folklore / real-animal inspiration', 'Eunectes murinus is Earth’s heaviest snake, though river stories often multiply its true measured length.', 'Compare folklore scales with verified museum field measurements of green anacondas.', 'Iconographia Zoologica', '1734–1765', 'University of Amsterdam Special Collections', 'Public domain', null],

    ['The Bloop (1997 Hydrophone)', 'ocean', 'explained', 'South Pacific Ocean', 'In 1997, NOAA hydrophones recorded this ultra-low-frequency underwater sound; later acoustic studies matched it to massive Antarctic icebergs cracking—not a sea creature.', 'the-bloop', [-95.0, -50.0], 'Explained · Icequake acoustics', 'Comparing the 1997 spectrogram against Antarctic acoustic arrays proved fracturing icequakes produce the exact rising frequency sweep.', 'Study how scientists use spectrograms to separate physical ocean sounds from whale calls.', 'NOAA Acoustic Monitoring', '1997', 'NOAA Vents Program Pacific hydrophone spectrogram', 'Public domain', 'CZ-06'],
    ['Carta Marina Sea Monsters', 'ocean', 'folklore', 'North Atlantic Ocean', 'Olaus Magnus’s 1539 Carta Marina filled uncharted northern waters with dramatic sea creatures, reminding us how early mapmakers mixed real whales and squid with imagination.', 'carta-marina', [2.0, 64.0], 'Historical cartography', 'Sixteenth-century maps blended sailors’ glimpses of whales, walruses, and giant squid with decorative sea-monster art in unexplored waters.', 'Notice how ocean mapping replaced guesswork with calibrated sonar and marine biology.', 'Olaus Magnus', '1539', 'Carta Marina (North Atlantic sea chart)', 'Public domain', null]
  ];

  const entries = rawEntries.map((e, index) => ({
    number: String(index + 1).padStart(3, '0'),
    name: e[0],
    region: e[1],
    type: e[2],
    place: e[3],
    description: e[4],
    slug: e[5],
    img: `../../assets/images/cryptozoology/plates/${e[5]}.webp`,
    coords: e[6],
    evidenceLevel: e[7],
    scientificStatus: e[8],
    testableNext: e[9],
    artist: e[10],
    year: e[11],
    sourceWork: e[12],
    license: e[13],
    caseId: e[14]
  }));

  const typeLabels = {
    reported: 'Reported',
    folklore: 'Folklore',
    documented: 'Documented',
    explained: 'Explained'
  };

  const pinColors = {
    reported: '#ffcb45',
    folklore: '#76e6cf',
    documented: '#6ee7b7',
    explained: '#a8b7ff'
  };

  const regionInfo = {
    all: ['Whole world', 'All 30 verified public-domain plates, from Renaissance woodcuts to modern field evidence.'],
    'north-america': ['North America', 'Audubon wildlife plates and North American field questions.'],
    'latin-america': ['Latin America', 'Amazonian natural-history prints, giant sloth fossils, and regional stories.'],
    europe: ['Europe', 'Renaissance animal encyclopedias, fossil reconstructions, and Loch Ness history.'],
    africa: ['Africa', 'Confirmed discoveries like the okapi, gorilla, coelacanth, and dodo alongside swamp reports.'],
    asia: ['Asia + Japan', 'Deep-sea squid science, Himalayan bear genetics, panda conservation, and Edo-period artwork.'],
    oceania: ['Oceania', 'Australia and New Zealand’s surprising discoveries—from the platypus to the thylacine.'],
    ocean: ['Ocean & historic maps', 'Sixteenth-century sea charts, narwhals, giant oarfish, and explained hydrophone acoustics.']
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
  const dossierFigure = document.getElementById('dossierFigure');
  const dossierImg = document.getElementById('dossierImg');
  const dossierCapTitle = document.getElementById('dossierCapTitle');
  const dossierCapText = document.getElementById('dossierCapText');
  const dossierCapCredit = document.getElementById('dossierCapCredit');
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

    mapSvg.appendChild(svgEl('path', {
      d: E.path(proj, { type: 'Sphere' }),
      class: 'map-ocean'
    }));

    if (window.d3.geoGraticule10) {
      mapSvg.appendChild(svgEl('path', {
        d: E.path(proj, window.d3.geoGraticule10()),
        class: 'map-graticule'
      }));
    }

    mapSvg.appendChild(svgEl('path', {
      d: E.path(proj, world.land),
      class: 'map-land'
    }));

    mapSvg.appendChild(svgEl('path', {
      d: E.path(proj, world.countries),
      class: 'map-countries'
    }));

    if (world.disputed) {
      mapSvg.appendChild(svgEl('path', {
        d: E.path(proj, world.disputed),
        class: 'map-disputed'
      }));
    }

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
        'aria-label': `Open historical dossier: ${entry.name} (${entry.place})`,
        'data-entry': entry.number
      });

      const title = svgEl('title');
      title.textContent = `${entry.name} — ${entry.artist} (${entry.year})`;

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
      (!query || `${e.name} ${e.place} ${e.description} ${e.artist} ${e.year} ${e.evidenceLevel}`.toLowerCase().includes(query))
    );

    const visibleSet = new Set(visibleEntries.map((e) => e.number));
    pinElements.forEach((pin, num) => {
      const active = visibleSet.has(num);
      pin.classList.toggle('dim', !active);
      pin.classList.toggle('highlight', active && (activeRegion !== 'all' || activeType !== 'all' || query.length > 0));
    });

    const autoExpand = visibleEntries.length <= 15 || query.length > 0;
    const shown = (showAllEntries || autoExpand) ? visibleEntries : visibleEntries.slice(0, 12);

    grid.innerHTML = shown.map((e) => `
      <article class="dex-entry">
        <button type="button" class="entry-trigger" data-open-entry="${e.number}" aria-label="Open dossier for ${e.name}">
          <div class="entry-plate">
            <img src="${e.img}" alt="Historical depiction of ${e.name} by ${e.artist} (${e.year})" loading="lazy" decoding="async" />
            <span class="entry-num">PLATE ${e.number}</span>
            <span class="entry-year-pill">${e.year}</span>
            ${e.caseId ? `<span class="entry-case-pill">${e.caseId}</span>` : ''}
          </div>
          <div class="entry-body">
            <div class="entry-top">
              <h3>${e.name}</h3>
              <span class="entry-type ${e.type}">${typeLabels[e.type]}</span>
            </div>
            <p class="entry-region">${e.place}</p>
            <p class="entry-desc">${e.description}</p>
            <p class="entry-credit">${e.artist} · ${e.license}</p>
            <span class="entry-cta">Inspect plate &amp; dossier →</span>
          </div>
        </button>
      </article>`).join('');

    grid.querySelectorAll('[data-open-entry]').forEach((btn) => {
      btn.addEventListener('click', () => openDossierByNumber(btn.dataset.openEntry, btn));
    });

    count.textContent = `${visibleEntries.length} of ${entries.length} plates`;
    empty.classList.toggle('show', visibleEntries.length === 0);

    if (showMoreWrap && showMoreBtn) {
      const needsToggle = visibleEntries.length > 15 && !query;
      showMoreWrap.hidden = !needsToggle;
      if (needsToggle) {
        showMoreBtn.textContent = showAllEntries
          ? 'Show first 12 plates'
          : `Show all ${visibleEntries.length} historical plates`;
        showMoreBtn.setAttribute('aria-expanded', showAllEntries ? 'true' : 'false');
      }
    }

    if (regionStats) {
      regionStats.textContent = `${visibleEntries.length} mapped historical plates`;
    }
  }

  function populateDossier(entry) {
    if (dossierImg && dossierFigure) {
      const altText = `Historical natural-history depiction of ${entry.name} by ${entry.artist} (${entry.year})`;
      dossierImg.src = entry.img;
      dossierImg.alt = altText;
      dossierImg.setAttribute('aria-label', `Enlarge historical plate: ${entry.name} (${entry.year})`);
      dossierFigure.dataset.full = entry.img;
      dossierCapTitle.textContent = `${entry.name} (${entry.year})`;
      dossierCapText.textContent = entry.description;
      dossierCapCredit.textContent = `Historical plate: ${entry.artist}, ${entry.year} — ${entry.sourceWork} (${entry.license}).`;
    }
    dossierNum.textContent = `HISTORICAL PLATE ${entry.number}`;
    dossierTitle.textContent = entry.name;
    dossierPlace.textContent = `${entry.place} · ${Math.abs(entry.coords[1]).toFixed(1)}°${entry.coords[1] >= 0 ? 'N' : 'S'}, ${Math.abs(entry.coords[0]).toFixed(1)}°${entry.coords[0] >= 0 ? 'E' : 'W'}`;
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
    // Close top-layer modal before opening PhotoLightbox so the lightbox is always on top
    if (dossierFigure) {
      const openZoom = (ev) => {
        if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        ev.stopPropagation();
        closeDossier();
        if (window.PhotoLightbox && typeof window.PhotoLightbox.open === 'function') {
          window.PhotoLightbox.open(dossierFigure, dossierImg);
        }
      };
      dossierFigure.addEventListener('click', openZoom, true);
      dossierFigure.addEventListener('keydown', openZoom, true);
    }
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
        why: 'Unsupported by current evidence. Stories and uncontrolled casts cannot outweigh missing bones, DNA, or repeatable camera-trap detections across millions of monitored forest nights.',
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
        claim: 'Claim: the 1997 ultra-low-frequency ocean sound came from a colossal unknown sea animal.',
        answer: 'unsupported',
        why: 'Unsupported claim (explained physical phenomenon). NOAA acousticians matched the Bloop’s frequency sweep and timing to massive Antarctic icequakes—icebergs fracturing and grinding.',
        evidence: [
          ['1997 NOAA recording', 'Autonomous hydrophones detected a loud ~1-minute ultra-low-frequency sound across 5,000 km.', 'Calibrated', 3, 'ambiguous'],
          ['Public speculation', 'Early commentary joked about giant marine life before full acoustic analysis finished.', 'Anecdotal', 1, 'ambiguous'],
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
        knownSpecies: 'black bears, elk, deer, and barred owls',
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
        falseSource: 'mud-distorted tracks or overlapping amphibian calls'
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

      ctx.strokeStyle = 'rgba(255,255,255,0.045)';
      ctx.lineWidth = 1;
      for (let x = 40; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 40; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      ctx.strokeStyle = hab.contour;
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.ellipse(w * 0.52, h * 0.52, w * (0.14 * i), h * (0.16 * i), 0.18, 0, Math.PI * 2);
        ctx.stroke();
      }

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
