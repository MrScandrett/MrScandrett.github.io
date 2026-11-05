/**
 * 20Q Mind Reader & Information Theory Game Engine
 * A classroom-friendly Akinator / 20Q clone powered by Claude Shannon's Information Gain & Bayesian inference.
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CURATED KNOWLEDGE BASE AND DIAGNOSTIC QUESTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const QUESTIONS = [
    { id: 'q_alive', text: 'Is it a living biological organism (or once alive)?', category: 'nature' },
    { id: 'q_animal', text: 'Is it an animal?', category: 'nature' },
    { id: 'q_human', text: 'Is it a human person?', category: 'people' },
    { id: 'q_historical', text: 'Is this person a famous historical figure rather than living today?', category: 'people' },
    { id: 'q_science_thinker', text: 'Is this person famous for science, mathematics, astronomy, or invention?', category: 'people' },
    { id: 'q_arts_literature', text: 'Is this person famous for literature, poetry, painting, or musical composition?', category: 'people' },
    { id: 'q_leader', text: 'Is this person known for political leadership, presidency, or civil rights courage?', category: 'people' },
    { id: 'q_female', text: 'Is this historical figure female?', category: 'people' },
    { id: 'q_mammal', text: 'Is it a mammal?', category: 'nature' },
    { id: 'q_flight', text: 'Can it fly or glide naturally through the air?', category: 'nature' },
    { id: 'q_water', text: 'Does it live in or spend most of its time in water or the ocean?', category: 'nature' },
    { id: 'q_bird', text: 'Is it a bird?', category: 'nature' },
    { id: 'q_reptile_amphibian', text: 'Is it a reptile or an amphibian?', category: 'nature' },
    { id: 'q_insect_bug', text: 'Is it an insect, arachnid, or bug?', category: 'nature' },
    { id: 'q_carnivore', text: 'Is it primarily a meat-eater, predator, or hunter?', category: 'nature' },
    { id: 'q_extinct', text: 'Is it an extinct or prehistoric creature (like a dinosaur)?', category: 'nature' },
    { id: 'q_larger_than_car', text: 'Is it noticeably larger or heavier than a standard passenger car?', category: 'physical' },
    { id: 'q_fits_hand', text: 'Can you easily hold or carry it in your two hands?', category: 'physical' },
    { id: 'q_fur', text: 'Does it have thick fur or hair on its body?', category: 'nature' },
    { id: 'q_stripes_spots', text: 'Does it have distinct stripes or spots on its coat?', category: 'nature' },
    { id: 'q_plant_flora', text: 'Is it a plant, tree, flower, or fungus?', category: 'nature' },
    { id: 'q_edible', text: 'Is it a food or fruit that humans commonly eat?', category: 'everyday' },
    { id: 'q_invention', text: 'Is it an artificial human invention, tool, or manufactured object?', category: 'tech' },
    { id: 'q_electric', text: 'Does it run on electricity, batteries, or digital computing power?', category: 'tech' },
    { id: 'q_screen_digital', text: 'Does it feature an interactive electronic display, screen, or computer chip?', category: 'tech' },
    { id: 'q_vehicle', text: 'Is it a vehicle or craft built to transport people or cargo?', category: 'tech' },
    { id: 'q_spacecraft', text: 'Is it designed to travel into outer space or orbit the Earth?', category: 'tech' },
    { id: 'q_optical_instrument', text: 'Is it a scientific optical instrument used to view tiny or distant things?', category: 'tech' },
    { id: 'q_school_lab', text: 'Is it commonly found inside a school, classroom, or science laboratory?', category: 'everyday' },
    { id: 'q_music_instrument', text: 'Is it a musical instrument that produces musical tones?', category: 'everyday' },
    { id: 'q_string_instrument', text: 'Does it have strings that you pluck, strum, or bow?', category: 'everyday' },
    { id: 'q_space_object', text: 'Is it an astronomical object located in outer space (star, planet, moon, or cosmos)?', category: 'space' },
    { id: 'q_planet_moon', text: 'Is it a planet, moon, or celestial body in our solar system?', category: 'space' },
    { id: 'q_star_light', text: 'Does it shine with its own nuclear fire or luminous light?', category: 'space' },
    { id: 'q_landmark_monument', text: 'Is it a world-famous landmark, monument, or ancient architectural wonder?', category: 'places' },
    { id: 'q_geological_wonder', text: 'Is it a natural geographical wonder, landform, or weather phenomenon?', category: 'places' },
    { id: 'q_extreme_heat_fire', text: 'Does it involve extreme heat, fire, incandescent lava, or lightning?', category: 'physical' },
    { id: 'q_ice_cold', text: 'Is it naturally associated with extreme cold, ice, or sub-zero temperatures?', category: 'physical' },
    { id: 'q_metal', text: 'Is it made primarily out of metal?', category: 'physical' },
    { id: 'q_paper_wood', text: 'Is it made primarily of wood, cellulose paper, or plant fibers?', category: 'physical' },
    { id: 'q_wheels', text: 'Does it have wheels for rolling on land or roads?', category: 'tech' },
    { id: 'q_wings', text: 'Does it have wings?', category: 'physical' },
    { id: 'q_ocean_depths', text: 'Is it found in the deep oceans or coral reefs?', category: 'nature' },
    { id: 'q_domestic_pet', text: 'Is it a common domesticated pet kept inside human homes?', category: 'nature' },
    { id: 'q_sports_play', text: 'Is it used in physical sports, outdoor games, or athletic recreation?', category: 'everyday' },
    { id: 'q_writing_reading', text: 'Is it used specifically for reading stories or writing words?', category: 'everyday' },
    { id: 'q_ancient_times', text: 'Does its story originate in the ancient world (over 1,000 years ago)?', category: 'history' },
    { id: 'q_black_white', text: 'Is it famously colored in black and white?', category: 'physical' },
    { id: 'q_has_legs', text: 'Does it have legs for walking or running on land?', category: 'physical' },
    { id: 'q_venomous', text: 'Can it inject venom, sting, or deliver a toxic bite?', category: 'nature' },
    { id: 'q_sound_music', text: 'Is it capable of making sounds, music, or speech?', category: 'physical' },
    { id: 'q_sharp_edge', text: 'Does it have sharp metal blades for cutting or slicing?', category: 'everyday' }
  ];

  // Curated STEAM entities with diagnostic feature signatures
  const CORE_ENTITIES = [
    // ── ANIMALS ──
    {
      id: 'lion', name: 'Lion', category: 'Animals',
      desc: 'The majestic king of beasts with a golden mane, roaming the African savanna.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_carnivore: 1, q_has_legs: 1, q_fur: 1, q_sound_music: 1 }
    },
    {
      id: 'elephant', name: 'African Elephant', category: 'Animals',
      desc: 'The largest living land mammal with grand tusks and an expressive trunk.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_larger_than_car: 1, q_has_legs: 1, q_carnivore: 0 }
    },
    {
      id: 'blue_whale', name: 'Blue Whale', category: 'Animals',
      desc: 'The largest animal to ever exist on Earth, swimming through ocean depths.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_water: 1, q_larger_than_car: 1, q_ocean_depths: 1, q_has_legs: 0, q_fur: 0 }
    },
    {
      id: 'bald_eagle', name: 'Bald Eagle', category: 'Animals',
      desc: 'A magnificent bird of prey with a white-feathered head and sharp talons.',
      traits: { q_alive: 1, q_animal: 1, q_flight: 1, q_bird: 1, q_wings: 1, q_carnivore: 1, q_fits_hand: 0, q_mammal: 0 }
    },
    {
      id: 'emperor_penguin', name: 'Emperor Penguin', category: 'Animals',
      desc: 'A flightless seabird built like a tuxedo, thriving in Antarctic blizzards.',
      traits: { q_alive: 1, q_animal: 1, q_bird: 1, q_wings: 1, q_flight: 0, q_water: 1, q_ice_cold: 1, q_black_white: 1, q_mammal: 0 }
    },
    {
      id: 'great_white_shark', name: 'Great White Shark', category: 'Animals',
      desc: 'An apex ocean predator with rows of serrated teeth and acute sensory perception.',
      traits: { q_alive: 1, q_animal: 1, q_water: 1, q_ocean_depths: 1, q_carnivore: 1, q_larger_than_car: 1, q_has_legs: 0, q_mammal: 0 }
    },
    {
      id: 'chameleon', name: 'Chameleon', category: 'Animals',
      desc: 'A color-shifting reptile with independent 360-degree eyes and a projectile tongue.',
      traits: { q_alive: 1, q_animal: 1, q_reptile_amphibian: 1, q_fits_hand: 1, q_has_legs: 1, q_carnivore: 1, q_mammal: 0 }
    },
    {
      id: 'honeybee', name: 'Honeybee', category: 'Animals',
      desc: 'A crucial pollinator that dances to communicate, lives in hives, and makes honey.',
      traits: { q_alive: 1, q_animal: 1, q_insect_bug: 1, q_flight: 1, q_wings: 1, q_fits_hand: 1, q_venomous: 1, q_stripes_spots: 1 }
    },
    {
      id: 'tyrannosaurus_rex', name: 'Tyrannosaurus Rex', category: 'Animals',
      desc: 'The legendary apex carnivore dinosaur of the late Cretaceous period.',
      traits: { q_alive: 1, q_animal: 1, q_extinct: 1, q_reptile_amphibian: 1, q_carnivore: 1, q_larger_than_car: 1, q_has_legs: 1, q_mammal: 0 }
    },
    {
      id: 'platypus', name: 'Platypus', category: 'Animals',
      desc: 'A unique Australian semi-aquatic egg-laying mammal with a duck-bill and beaver tail.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_water: 1, q_fits_hand: 1, q_venomous: 1, q_fur: 1, q_has_legs: 1 }
    },
    {
      id: 'giant_panda', name: 'Giant Panda', category: 'Animals',
      desc: 'A beloved black-and-white bear native to bamboo forests in China.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_black_white: 1, q_fur: 1, q_has_legs: 1, q_carnivore: 0 }
    },
    {
      id: 'cheetah', name: 'Cheetah', category: 'Animals',
      desc: 'The fastest land mammal on Earth, accelerating up to 70 mph with spotted grace.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_stripes_spots: 1, q_carnivore: 1, q_fur: 1, q_has_legs: 1 }
    },
    {
      id: 'wolf', name: 'Gray Wolf', category: 'Animals',
      desc: 'A pack-hunting canine known for haunting howls across northern wilderness.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_carnivore: 1, q_fur: 1, q_sound_music: 1, q_has_legs: 1 }
    },
    {
      id: 'kangaroo', name: 'Kangaroo', category: 'Animals',
      desc: 'A powerful Australian marsupial with a front pouch and spring-loaded leaps.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_has_legs: 1, q_fur: 1, q_carnivore: 0 }
    },
    {
      id: 'bat', name: 'Bat', category: 'Animals',
      desc: 'The only true flying mammal, navigating dark night skies with ultrasonic echolocation.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_flight: 1, q_wings: 1, q_fits_hand: 1, q_sound_music: 1 }
    },
    {
      id: 'dolphin', name: 'Dolphin', category: 'Animals',
      desc: 'An exceptionally intelligent marine mammal famous for clicks, whistles, and acrobatics.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_water: 1, q_ocean_depths: 1, q_sound_music: 1, q_has_legs: 0, q_fur: 0 }
    },
    {
      id: 'giant_squid', name: 'Giant Squid', category: 'Animals',
      desc: 'A mysterious deep-ocean cephalopod with dinner-plate eyes and ten tentacles.',
      traits: { q_alive: 1, q_animal: 1, q_water: 1, q_ocean_depths: 1, q_carnivore: 1, q_larger_than_car: 1, q_mammal: 0, q_has_legs: 0 }
    },
    {
      id: 'owl', name: 'Barn Owl', category: 'Animals',
      desc: 'A silent-flying nocturnal bird with acute hearing and a heart-shaped face.',
      traits: { q_alive: 1, q_animal: 1, q_bird: 1, q_flight: 1, q_wings: 1, q_carnivore: 1, q_sound_music: 1, q_mammal: 0 }
    },
    {
      id: 'tree_frog', name: 'Red-Eyed Tree Frog', category: 'Animals',
      desc: 'A vibrant rainforest amphibian with sticky toe pads and ruby-red eyes.',
      traits: { q_alive: 1, q_animal: 1, q_reptile_amphibian: 1, q_fits_hand: 1, q_has_legs: 1, q_carnivore: 1, q_mammal: 0 }
    },
    {
      id: 'dog', name: 'Domestic Dog', category: 'Animals',
      desc: 'Humanity’s loyal four-legged companion with an exceptional sense of smell.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_domestic_pet: 1, q_fur: 1, q_has_legs: 1, q_sound_music: 1 }
    },
    {
      id: 'cat', name: 'Domestic Cat', category: 'Animals',
      desc: 'An agile, purring feline companion with razor-sharp reflexes and night vision.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_domestic_pet: 1, q_fits_hand: 1, q_fur: 1, q_has_legs: 1, q_carnivore: 1 }
    },
    {
      id: 'giraffe', name: 'Giraffe', category: 'Animals',
      desc: 'The tallest mammal on Earth with a spotted neck browsing acacia treetops.',
      traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_larger_than_car: 1, q_stripes_spots: 1, q_has_legs: 1, q_carnivore: 0 }
    },
    {
      id: 'hummingbird', name: 'Hummingbird', category: 'Animals',
      desc: 'A tiny iridescent bird that can hover in place and fly backwards while sipping nectar.',
      traits: { q_alive: 1, q_animal: 1, q_bird: 1, q_flight: 1, q_wings: 1, q_fits_hand: 1, q_carnivore: 0, q_mammal: 0 }
    },

    // ── HISTORICAL FIGURES & THINKERS ──
    {
      id: 'albert_einstein', name: 'Albert Einstein', category: 'Thinkers',
      desc: 'Theoretical physicist who transformed our understanding of space, time, gravity, and E=mc².',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_female: 0 }
    },
    {
      id: 'marie_curie', name: 'Marie Curie', category: 'Thinkers',
      desc: 'Pioneering physicist and chemist who discovered radioactivity and won two Nobel Prizes.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_female: 1 }
    },
    {
      id: 'ada_lovelace', name: 'Ada Lovelace', category: 'Thinkers',
      desc: 'The world’s first computer programmer who foresaw algorithms for Charles Babbage’s engine.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_female: 1 }
    },
    {
      id: 'leonardo_da_vinci', name: 'Leonardo da Vinci', category: 'Thinkers',
      desc: 'Renaissance polymath who painted the Mona Lisa and designed flying machines and anatomy studies.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_arts_literature: 1, q_science_thinker: 1, q_female: 0 }
    },
    {
      id: 'isaac_newton', name: 'Sir Isaac Newton', category: 'Thinkers',
      desc: 'Mathematician and physicist who formulated the laws of motion, universal gravitation, and calculus.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_female: 0 }
    },
    {
      id: 'abraham_lincoln', name: 'Abraham Lincoln', category: 'Thinkers',
      desc: '16th U.S. President who preserved the Union during the Civil War and emancipated enslaved people.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_leader: 1, q_female: 0 }
    },
    {
      id: 'william_shakespeare', name: 'William Shakespeare', category: 'Thinkers',
      desc: 'Legendary English playwright and poet whose dramas and sonnets shaped world literature.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_arts_literature: 1, q_writing_reading: 1, q_female: 0 }
    },
    {
      id: 'amelia_earhart', name: 'Amelia Earhart', category: 'Thinkers',
      desc: 'Record-setting aviation pioneer who was the first woman to fly solo across the Atlantic.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_flight: 1, q_female: 1 }
    },
    {
      id: 'george_washington', name: 'George Washington', category: 'Thinkers',
      desc: 'General of the Continental Army and the foundational first President of the United States.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_leader: 1, q_female: 0 }
    },
    {
      id: 'thomas_edison', name: 'Thomas Edison', category: 'Thinkers',
      desc: 'Prolific inventor of the practical incandescent electric bulb, phonograph, and motion picture camera.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_electric: 1, q_female: 0 }
    },
    {
      id: 'claude_shannon', name: 'Claude Shannon', category: 'Thinkers',
      desc: 'The father of Information Theory at Bell Labs who defined the bit and proved communication limits in 1948.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_electric: 1, q_female: 0 }
    },
    {
      id: 'rosa_parks', name: 'Rosa Parks', category: 'Thinkers',
      desc: 'Civil rights icon whose brave refusal to surrender her bus seat sparked the Montgomery Bus Boycott.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_leader: 1, q_female: 1 }
    },
    {
      id: 'galileo_galilei', name: 'Galileo Galilei', category: 'Thinkers',
      desc: 'Father of observational astronomy who turned the telescope to Jupiter’s moons and the Moon’s craters.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_optical_instrument: 1, q_female: 0 }
    },
    {
      id: 'mozart', name: 'Wolfgang Amadeus Mozart', category: 'Thinkers',
      desc: 'Classical musical genius who composed over 600 masterpieces of symphonic and chamber music.',
      traits: { q_alive: 1, q_human: 1, q_historical: 1, q_arts_literature: 1, q_sound_music: 1, q_female: 0 }
    },

    // ── SCIENCE & TECHNOLOGY INVENTIONS ──
    {
      id: 'microscope', name: 'Microscope', category: 'Science Tools',
      desc: 'An optical or electron instrument magnifying cellular structures invisible to the naked eye.',
      traits: { q_alive: 0, q_invention: 1, q_optical_instrument: 1, q_school_lab: 1, q_metal: 1, q_fits_hand: 1 }
    },
    {
      id: 'telescope', name: 'Astronomical Telescope', category: 'Science Tools',
      desc: 'An optical tube gathering distant photons from nebulae, planets, and ancient galaxies.',
      traits: { q_alive: 0, q_invention: 1, q_optical_instrument: 1, q_school_lab: 1, q_space_object: 0, q_metal: 1 }
    },
    {
      id: 'smartphone', name: 'Smartphone', category: 'Technology',
      desc: 'A pocket-sized supercomputer connected to global networks with touchscreen and cameras.',
      traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_screen_digital: 1, q_fits_hand: 1, q_sound_music: 1, q_metal: 1 }
    },
    {
      id: 'laptop_computer', name: 'Laptop Computer', category: 'Technology',
      desc: 'A clamshell digital workstation with keyboard, CPU, and screen for writing code and exploring ideas.',
      traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_screen_digital: 1, q_school_lab: 1, q_fits_hand: 1 }
    },
    {
      id: 'space_rocket', name: 'Space Rocket', category: 'Technology',
      desc: 'A massive multistage vessel burning chemical propellants to escape Earth’s gravity into orbit.',
      traits: { q_alive: 0, q_invention: 1, q_vehicle: 1, q_spacecraft: 1, q_larger_than_car: 1, q_extreme_heat_fire: 1, q_metal: 1 }
    },
    {
      id: 'submarine', name: 'Submarine', category: 'Technology',
      desc: 'A watertight submersible vessel that navigates deep oceanic trenches under immense pressure.',
      traits: { q_alive: 0, q_invention: 1, q_vehicle: 1, q_water: 1, q_ocean_depths: 1, q_larger_than_car: 1, q_metal: 1 }
    },
    {
      id: 'airplane', name: 'Jet Airplane', category: 'Technology',
      desc: 'A fixed-wing aircraft using aerodynamic lift and jet engines to fly passengers worldwide.',
      traits: { q_alive: 0, q_invention: 1, q_vehicle: 1, q_flight: 1, q_wings: 1, q_larger_than_car: 1, q_metal: 1 }
    },
    {
      id: 'bicycle', name: 'Bicycle', category: 'Technology',
      desc: 'A human-powered two-wheeled machine with handlebars, pedals, gears, and chain drive.',
      traits: { q_alive: 0, q_invention: 1, q_vehicle: 1, q_wheels: 1, q_sports_play: 1, q_metal: 1, q_electric: 0 }
    },
    {
      id: 'three_d_printer', name: '3D Printer', category: 'Technology',
      desc: 'A computer-controlled fabrication tool extruding melted thermoplastic layer by layer.',
      traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_school_lab: 1, q_extreme_heat_fire: 1, q_fits_hand: 0 }
    },
    {
      id: 'magnetic_compass', name: 'Magnetic Compass', category: 'Science Tools',
      desc: 'A navigational tool with a magnetized needle aligning with Earth’s magnetic field lines.',
      traits: { q_alive: 0, q_invention: 1, q_fits_hand: 1, q_school_lab: 1, q_metal: 1, q_electric: 0 }
    },
    {
      id: 'lightbulb', name: 'Electric Lightbulb', category: 'Technology',
      desc: 'An artificial light emitter that illuminates dark rooms using glowing filament or LED chips.',
      traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_fits_hand: 1, q_extreme_heat_fire: 1 }
    },
    {
      id: 'robot_car', name: 'Autonomous Rover / Robot', category: 'Technology',
      desc: 'A programmable machine using sensors, microcontrollers, and actuators to navigate environments.',
      traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_wheels: 1, q_school_lab: 1, q_metal: 1 }
    },
    {
      id: 'solar_panel', name: 'Solar Panel', category: 'Technology',
      desc: 'A photovoltaic array converting solar photons directly into clean electric current.',
      traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_metal: 1 }
    },
    {
      id: 'battery', name: 'Lithium Battery', category: 'Technology',
      desc: 'An electrochemical storage cell releasing electrical current to power mobile electronics.',
      traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_fits_hand: 1, q_metal: 1 }
    },

    // ── SPACE, COSMOS & EARTH SCIENCE ──
    {
      id: 'the_sun', name: 'The Sun', category: 'Cosmos',
      desc: 'The yellow dwarf star at the center of our solar system fusing hydrogen into blazing light.',
      traits: { q_alive: 0, q_space_object: 1, q_star_light: 1, q_extreme_heat_fire: 1, q_larger_than_car: 1 }
    },
    {
      id: 'the_moon', name: 'The Moon', category: 'Cosmos',
      desc: 'Earth’s cratered natural satellite creating ocean tides and cycling through glowing phases.',
      traits: { q_alive: 0, q_space_object: 1, q_planet_moon: 1, q_larger_than_car: 1, q_star_light: 0 }
    },
    {
      id: 'planet_saturn', name: 'Planet Saturn', category: 'Cosmos',
      desc: 'The iconic ringed gas giant planet orbiting between Jupiter and Uranus.',
      traits: { q_alive: 0, q_space_object: 1, q_planet_moon: 1, q_larger_than_car: 1, q_ice_cold: 1, q_star_light: 0 }
    },
    {
      id: 'black_hole', name: 'Supermassive Black Hole', category: 'Cosmos',
      desc: 'A gravitational singularity so intense that not even photons of light can escape its event horizon.',
      traits: { q_alive: 0, q_space_object: 1, q_larger_than_car: 1, q_star_light: 0 }
    },
    {
      id: 'volcano', name: 'Active Volcano', category: 'Geology',
      desc: 'A rupture in the planetary crust venting subterranean magma, ash plumes, and pyroclastic flows.',
      traits: { q_alive: 0, q_geological_wonder: 1, q_extreme_heat_fire: 1, q_larger_than_car: 1 }
    },
    {
      id: 'mount_everest', name: 'Mount Everest', category: 'Geology',
      desc: 'The highest mountain peak above sea level on Earth, towering in the frozen Himalayas.',
      traits: { q_alive: 0, q_geological_wonder: 1, q_ice_cold: 1, q_larger_than_car: 1 }
    },
    {
      id: 'aurora_borealis', name: 'Aurora Borealis (Northern Lights)', category: 'Geology',
      desc: 'Curtains of luminescent green and violet light sparked by solar wind colliding with magnetosphere gases.',
      traits: { q_alive: 0, q_geological_wonder: 1, q_ice_cold: 1, q_larger_than_car: 1 }
    },
    {
      id: 'grand_canyon', name: 'Grand Canyon', category: 'Geology',
      desc: 'A mile-deep chasm carved across millions of years by the Colorado River through Arizona strata.',
      traits: { q_alive: 0, q_geological_wonder: 1, q_larger_than_car: 1 }
    },
    {
      id: 'thunderstorm', name: 'Thunderstorm with Lightning', category: 'Geology',
      desc: 'A violent atmospheric electrical storm discharging millions of volts between clouds and ground.',
      traits: { q_alive: 0, q_geological_wonder: 1, q_extreme_heat_fire: 1, q_sound_music: 1, q_water: 1, q_larger_than_car: 1 }
    },
    {
      id: 'glacier', name: 'Glacier', category: 'Geology',
      desc: 'A colossal river of dense blue ice grinding slowly across mountain valleys.',
      traits: { q_alive: 0, q_geological_wonder: 1, q_ice_cold: 1, q_water: 1, q_larger_than_car: 1 }
    },

    // ── MONUMENTS & WORLD WONDERS ──
    {
      id: 'great_pyramids', name: 'Great Pyramids of Giza', category: 'Monuments',
      desc: 'Colossal stone tombs built over 4,500 years ago aligning precisely with the cardinal directions.',
      traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_ancient_times: 1, q_larger_than_car: 1 }
    },
    {
      id: 'eiffel_tower', name: 'Eiffel Tower', category: 'Monuments',
      desc: 'Gustave Eiffel’s 1,000-foot wrought-iron lattice monument rising above the Paris skyline.',
      traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_metal: 1, q_larger_than_car: 1 }
    },
    {
      id: 'statue_of_liberty', name: 'Statue of Liberty', category: 'Monuments',
      desc: 'Colossal copper sculpture welcoming ships in New York Harbor with a torch of freedom.',
      traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_metal: 1, q_larger_than_car: 1 }
    },
    {
      id: 'colosseum', name: 'Roman Colosseum', category: 'Monuments',
      desc: 'Ancient Roman amphitheater of stone and concrete that seated 50,000 spectators.',
      traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_ancient_times: 1, q_larger_than_car: 1 }
    },
    {
      id: 'great_wall_of_china', name: 'Great Wall of China', category: 'Monuments',
      desc: 'Thousands of miles of fortifications winding across mountain ridges of northern China.',
      traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_ancient_times: 1, q_larger_than_car: 1 }
    },
    {
      id: 'international_space_station', name: 'International Space Station', category: 'Technology',
      desc: 'A habitable orbital laboratory flying at 17,500 mph where international astronauts do science.',
      traits: { q_alive: 0, q_invention: 1, q_spacecraft: 1, q_space_object: 1, q_electric: 1, q_larger_than_car: 1, q_metal: 1 }
    },

    // ── EVERYDAY TOOLS, INSTRUMENTS & OBJECTS ──
    {
      id: 'acoustic_guitar', name: 'Acoustic Guitar', category: 'Objects',
      desc: 'A hollow wooden string instrument resonated by acoustic sound chambers.',
      traits: { q_alive: 0, q_invention: 1, q_music_instrument: 1, q_string_instrument: 1, q_sound_music: 1, q_paper_wood: 1, q_fits_hand: 1 }
    },
    {
      id: 'grand_piano', name: 'Grand Piano', category: 'Objects',
      desc: 'A keyboard instrument where 88 keys trigger felt hammers against high-tension steel strings.',
      traits: { q_alive: 0, q_invention: 1, q_music_instrument: 1, q_string_instrument: 1, q_sound_music: 1, q_black_white: 1, q_paper_wood: 1, q_fits_hand: 0 }
    },
    {
      id: 'book', name: 'Paper Book', category: 'Objects',
      desc: 'Bound pages of printed ink preserving stories, poetry, mathematics, and human wisdom.',
      traits: { q_alive: 0, q_invention: 1, q_writing_reading: 1, q_paper_wood: 1, q_fits_hand: 1, q_school_lab: 1, q_electric: 0 }
    },
    {
      id: 'pencil', name: 'Wooden Pencil', category: 'Objects',
      desc: 'A graphite rod encased in cedar wood used by students and artists to draw and write.',
      traits: { q_alive: 0, q_invention: 1, q_writing_reading: 1, q_paper_wood: 1, q_fits_hand: 1, q_school_lab: 1, q_electric: 0 }
    },
    {
      id: 'scissors', name: 'Scissors', category: 'Objects',
      desc: 'A hand-operated shearing tool with two pivoted steel blades for cutting paper and cloth.',
      traits: { q_alive: 0, q_invention: 1, q_sharp_edge: 1, q_metal: 1, q_fits_hand: 1, q_school_lab: 1, q_electric: 0 }
    },
    {
      id: 'umbrella', name: 'Umbrella', category: 'Objects',
      desc: 'A collapsible canopy on a metal frame sheltering people from raindrops and sun rays.',
      traits: { q_alive: 0, q_invention: 1, q_water: 1, q_fits_hand: 1, q_metal: 1, q_electric: 0 }
    },
    {
      id: 'skateboard', name: 'Skateboard', category: 'Objects',
      desc: 'A maple deck mounted on polyurethane wheels used for street cruising and skatepark tricks.',
      traits: { q_alive: 0, q_invention: 1, q_wheels: 1, q_sports_play: 1, q_paper_wood: 1, q_fits_hand: 1, q_electric: 0 }
    },
    {
      id: 'soccer_ball', name: 'Soccer Ball', category: 'Objects',
      desc: 'An inflated geometric sphere kicked by teams across the most popular sport on Earth.',
      traits: { q_alive: 0, q_invention: 1, q_sports_play: 1, q_black_white: 1, q_fits_hand: 1, q_electric: 0 }
    },
    {
      id: 'wristwatch', name: 'Wristwatch', category: 'Objects',
      desc: 'A wearable timekeeping instrument powered by a quartz crystal or mechanical gears.',
      traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_fits_hand: 1, q_metal: 1 }
    },
    {
      id: 'backpack', name: 'School Backpack', category: 'Objects',
      desc: 'A zippered fabric bag with shoulder straps used by students to carry books and homework.',
      traits: { q_alive: 0, q_invention: 1, q_school_lab: 1, q_fits_hand: 1, q_electric: 0 }
    },

    // ── PLANTS, TREES & FOOD ──
    {
      id: 'apple', name: 'Red Apple', category: 'Food & Plants',
      desc: 'A crisp, sweet pome fruit growing on orchard trees, celebrated in health and science lore.',
      traits: { q_alive: 1, q_plant_flora: 1, q_edible: 1, q_fits_hand: 1, q_animal: 0 }
    },
    {
      id: 'pizza', name: 'Pizza', category: 'Food & Plants',
      desc: 'A baked flatbread crust topped with tomato sauce, melted cheese, and savoury toppings.',
      traits: { q_alive: 0, q_invention: 1, q_edible: 1, q_fits_hand: 1, q_extreme_heat_fire: 1 }
    },
    {
      id: 'giant_sequoia', name: 'Giant Redwood / Sequoia Tree', category: 'Food & Plants',
      desc: 'Ancient coniferous giants that are the most massive living trees on planet Earth.',
      traits: { q_alive: 1, q_plant_flora: 1, q_larger_than_car: 1, q_paper_wood: 1, q_edible: 0, q_animal: 0 }
    },
    {
      id: 'saguaro_cactus', name: 'Saguaro Cactus', category: 'Food & Plants',
      desc: 'A desert icon with spine-armored branches that stores tons of water through scorching heat.',
      traits: { q_alive: 1, q_plant_flora: 1, q_extreme_heat_fire: 1, q_edible: 0, q_animal: 0 }
    },
    {
      id: 'sunflower', name: 'Sunflower', category: 'Food & Plants',
      desc: 'A tall flowering plant with bright golden petals that tracks the sun across the summer sky.',
      traits: { q_alive: 1, q_plant_flora: 1, q_edible: 1, q_fits_hand: 1, q_animal: 0 }
    },
    {
      id: 'chocolate', name: 'Chocolate Bar', category: 'Food & Plants',
      desc: 'A sweet confection created from roasted and ground cacao seeds sweetened with sugar.',
      traits: { q_alive: 0, q_invention: 1, q_edible: 1, q_fits_hand: 1 }
    }
  ];

  // Familiar fictional characters add a character-guessing route to the classroom game.
  const CHARACTERS = [
    ['harry_potter', 'Harry Potter', 'A young wizard with a lightning-shaped scar.', 'magic glasses school'],
    ['hermione', 'Hermione Granger', 'A resourceful witch and friend of Harry Potter.', 'magic school female'],
    ['gandalf', 'Gandalf', 'The wizard who helps guide the Fellowship of the Ring.', 'magic beard'],
    ['frodo', 'Frodo Baggins', 'A hobbit entrusted with carrying the One Ring.', 'ring'],
    ['sherlock', 'Sherlock Holmes', 'A fictional detective known for observation and deduction.', 'detective'],
    ['superman', 'Superman', 'A superhero from Krypton who can fly.', 'hero flight cape alien'],
    ['batman', 'Batman', 'Gotham City’s detective and superhero.', 'hero cape detective'],
    ['spider_man', 'Spider-Man', 'A superhero who climbs walls and swings on webs.', 'hero webs'],
    ['wonder_woman', 'Wonder Woman', 'An Amazon superhero with a lasso of truth.', 'hero female'],
    ['darth_vader', 'Darth Vader', 'A masked Star Wars character with a red lightsaber.', 'space mask sword'],
    ['yoda', 'Yoda', 'A small green Jedi teacher from Star Wars.', 'space alien sword green'],
    ['luke_skywalker', 'Luke Skywalker', 'A Jedi hero from Star Wars.', 'space sword hero'],
    ['mario', 'Mario', 'A video-game plumber who adventures through the Mushroom Kingdom.', 'game mustache'],
    ['luigi', 'Luigi', 'Mario’s green-clad brother, known for haunted-house adventures.', 'game mustache green'],
    ['sonic', 'Sonic the Hedgehog', 'A blue video-game hedgehog with super speed.', 'game animal speed'],
    ['pikachu', 'Pikachu', 'A yellow Pokémon known for electric attacks.', 'game animal electric'],
    ['elsa', 'Elsa', 'The queen in Frozen with powers over ice and snow.', 'magic female ice'],
    ['woody', 'Woody', 'The cowboy toy in Toy Story.', 'toy cowboy'],
    ['buzz', 'Buzz Lightyear', 'The space-ranger toy in Toy Story.', 'toy space'],
    ['sponge_bob', 'SpongeBob SquarePants', 'A yellow cartoon sponge who lives in Bikini Bottom.', 'water animal']
  ];
  QUESTIONS.push({ id: 'q_fictional', text: 'Is it a fictional character?', category: 'characters' });
  const CHARACTER_FEATURES = {
    magic: 'Does this character use magic?', glasses: 'Does this character famously wear glasses?',
    school: 'Does this character attend Hogwarts?', female: 'Is this character female?',
    beard: 'Does this character have a long beard?', ring: 'Is this character on a quest involving a powerful ring?',
    detective: 'Is this character known for solving mysteries?', hero: 'Is this character known as a hero or superhero?',
    flight: 'Can this character fly using their own powers?', cape: 'Does this character usually wear a cape?',
    alien: 'Is this character from another planet?', webs: 'Does this character use spider webs?',
    space: 'Is this character associated with outer-space adventures?', mask: 'Does this character famously wear a full-face mask?',
    sword: 'Does this character use a lightsaber?', green: 'Is this character green or usually dressed in green?',
    game: 'Is this character especially known from video games?', mustache: 'Does this character have a mustache?',
    animal: 'Is this character an animal or animal-like creature?', speed: 'Is this character famous for super speed?',
    electric: 'Does this character use electric attacks?', ice: 'Does this character control ice and snow?',
    toy: 'Is this character a toy that comes to life?', cowboy: 'Does this character dress as a cowboy?',
    water: 'Does this character live underwater?'
  };
  Object.entries(CHARACTER_FEATURES).forEach(([id, text]) => {
    QUESTIONS.push({ id: 'q_character_' + id, text, category: 'characters' });
    CORE_ENTITIES.forEach(e => { e.traits['q_character_' + id] = 0; });
  });
  CORE_ENTITIES.forEach(e => { e.traits.q_fictional = 0; });
  CHARACTERS.forEach(([id, name, desc, features]) => {
    const tags = new Set(features.split(' '));
    const traits = Object.fromEntries(QUESTIONS.map(q => [q.id, 0.5]));
    traits.q_fictional = 1;
    Object.keys(CHARACTER_FEATURES).forEach(f => { traits['q_character_' + f] = tags.has(f) ? 1 : 0; });
    CORE_ENTITIES.push({ id, name, desc, category: 'Characters', traits });
  });

  // Curated follow-ups separate lookalikes after broad category questions.
  const FOLLOW_UPS = [
    ['underwater_vehicle', 'Is it a vehicle designed to travel underwater?', 'submarine'],
    ['jet_passengers', 'Is it a winged aircraft used for passenger flights?', 'airplane'],
    ['storage_power', 'Is its main purpose storing electrical energy?', 'battery'],
    ['sky_glow', 'Is it a colorful glow in the polar night sky?', 'aurora_borealis'],
    ['river_canyon', 'Is it a deep canyon carved by a river?', 'grand_canyon'],
    ['torch_statue', 'Is it a statue holding a torch?', 'statue_of_liberty'],
    ['arena', 'Was it built as an ancient Roman arena?', 'colosseum'],
    ['long_wall', 'Is it a long defensive wall in China?', 'great_wall_of_china'],
    ['graphite', 'Does it write using a graphite core?', 'pencil'],
    ['carry_bag', 'Is it a bag worn on your back?', 'backpack'],
    ['mane', 'Is it famous for having a mane?', 'lion'],
    ['canine', 'Is it a canine, such as a dog or wolf?', 'dog wolf'],
    ['pouch', 'Does it carry its young in a pouch?', 'kangaroo'],
    ['trunk', 'Does it have a long trunk?', 'elephant'],
    ['tentacles', 'Does it have tentacles?', 'giant_squid'],
    ['color_change', 'Is it famous for changing the color of its skin?', 'chameleon'],
    ['nocturnal', 'Is it usually active at night?', 'bat owl'],
    ['bamboo', 'Is bamboo its main food?', 'giant_panda'],
    ['long_neck', 'Is it famous for its unusually long neck?', 'giraffe'],
    ['relativity', 'Is this person famous for the theory of relativity?', 'albert_einstein'],
    ['gravity', 'Is this person associated with gravity and laws of motion?', 'isaac_newton albert_einstein'],
    ['radioactivity', 'Is this person famous for research into radioactivity?', 'marie_curie'],
    ['computing', 'Is this person associated with computing, programming, or information theory?', 'ada_lovelace alan_turing claude_shannon'],
    ['bits', 'Did this person develop the mathematical theory of information and bits?', 'claude_shannon'],
    ['codebreaking', 'Is this person famous for wartime codebreaking?', 'alan_turing'],
    ['electricity', 'Is this person famous for electrical inventions?', 'nikola_tesla thomas_edison'],
    ['ac', 'Is this person particularly associated with alternating-current power?', 'nikola_tesla'],
    ['evolution', 'Did this person develop the theory of evolution by natural selection?', 'charles_darwin'],
    ['plays', 'Is this person famous for writing plays such as Hamlet?', 'william_shakespeare'],
    ['composer', 'Is this person famous for composing classical music?', 'mozart'],
    ['president', 'Was this person a president of the United States?', 'abraham_lincoln george_washington'],
    ['first_president', 'Was this person the first president of the United States?', 'george_washington'],
    ['bus', 'Is this person remembered for refusing to give up a bus seat?', 'rosa_parks'],
    ['pilot', 'Is this person famous for pioneering airplane flights?', 'amelia_earhart'],
    ['jupiter', 'Is this person famous for telescopic observations of Jupiter’s moons?', 'galileo_galilei'],
    ['tiny', 'Is it used to magnify things too small to see with the naked eye?', 'microscope'],
    ['keyboard', 'Does it usually have a keyboard?', 'laptop_computer grand_piano'],
    ['solar', 'Does it convert sunlight into electricity?', 'solar_panel'],
    ['time', 'Is its main purpose telling the time?', 'wristwatch'],
    ['rain', 'Is it used to shelter you from rain?', 'umbrella'],
    ['rings', 'Is it a planet famous for its rings?', 'planet_saturn'],
    ['earth_orbit', 'Does it orbit Earth?', 'the_moon international_space_station'],
    ['cocoa', 'Is it made from cacao beans?', 'chocolate'],
    ['petals', 'Does it have large yellow flower petals?', 'sunflower'],
    ['spines', 'Is it a desert plant with spines?', 'saguaro_cactus']
  ];
  FOLLOW_UPS.forEach(([id, text, members]) => {
    const qId = `q_detail_${id}`;
    QUESTIONS.push({ id: qId, text, category: 'detail' });
    const yes = new Set(members.split(' '));
    CORE_ENTITIES.forEach(e => { e.traits[qId] = yes.has(e.id) ? 1 : 0; });
  });
  // Complete broad taxonomy; leave genuinely unspecified physical traits uncertain.
  const TAXONOMY = ['q_animal', 'q_human', 'q_plant_flora', 'q_invention',
    'q_space_object', 'q_geological_wonder', 'q_landmark_monument', 'q_edible',
    'q_vehicle', 'q_music_instrument', 'q_string_instrument', 'q_optical_instrument', 'q_spacecraft'];
  CORE_ENTITIES.forEach(e => {
    TAXONOMY.forEach(q => { if (!(q in e.traits)) e.traits[q] = 0; });
    if (e.traits.q_animal) {
      ['q_mammal', 'q_bird', 'q_reptile_amphibian', 'q_insect_bug', 'q_extinct',
        'q_domestic_pet', 'q_venomous'].forEach(q => { if (!(q in e.traits)) e.traits[q] = 0; });
    }
  });
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. INFORMATION THEORY & BAYESIAN INFERENCE ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  class InformationTheoryEngine {
    constructor() {
      this.customEntitiesKey = 'twenty_questions_custom_knowledge_v1';
      this.reset();
    }

    loadEntities() {
      const entities = CORE_ENTITIES.map(e => ({ ...e, traits: { ...e.traits } }));
      try {
        const stored = localStorage.getItem(this.customEntitiesKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach(p => {
              if (p && typeof p.name === 'string' && p.traits && typeof p.traits === 'object' && !entities.some(e => e.id === p.id)) {
                entities.push(p);
              }
            });
          }
        }
      } catch (err) {
        console.warn('Could not load custom 20Q knowledge:', err);
      }
      return entities;
    }

    reset() {
      this.entities = this.loadEntities();
      this.questions = [...QUESTIONS];
      this.rejectedIds = new Set();
      this.lastRejectedGuess = null;
      try {
        const learned = JSON.parse(localStorage.getItem(this.customEntitiesKey + '_questions') || '[]');
        if (Array.isArray(learned)) learned.forEach(q => {
          if (q && typeof q.id === 'string' && typeof q.text === 'string' && !this.questions.some(x => x.id === q.id)) this.questions.push(q);
        });
        const corrections = JSON.parse(localStorage.getItem(this.customEntitiesKey + '_corrections') || '{}');
        this.entities.forEach(e => Object.assign(e.traits, corrections[e.id] || {}));
      } catch (_) { /* Storage may be unavailable. */ }
      this.questionCount = 0;
      this.maxQuestions = 20;
      this.askedQuestions = []; // Array of { qId, answer, entropyBefore, entropyAfter, ig }
      this.undoStack = [];

      // Initial uniform prior P(e_i) = 1 / N
      const n = this.entities.length;
      this.beliefs = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        this.beliefs[i] = 1.0 / n;
      }

      this.currentEntropy = this.computeEntropy(this.beliefs);
      this.initialEntropy = this.currentEntropy;
      this.isGameOver = false;
      this.isGuessing = false;
      this.currentGuess = null;
    }

    computeEntropy(probs) {
      let h = 0.0;
      for (let i = 0; i < probs.length; i++) {
        const p = probs[i];
        if (p > 1e-9) {
          h -= p * Math.log2(p);
        }
      }
      return Math.max(0, h);
    }

    getEntityTraitProb(entity, questionId) {
      if (entity.traits && entity.traits[questionId] !== undefined) {
        const value = entity.traits[questionId];
        return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
      }
      return 0.5; // Unknown trait defaults to balanced prior
    }

    /**
     * Compute expected Information Gain for a given candidate question
     * IG(q) = H(X) - [ P(Yes)*H(X|Yes) + P(No)*H(X|No) ]
     */
    evaluateQuestionInformationGain(qId) {
      let pYes = 0.0;
      const n = this.entities.length;

      for (let i = 0; i < n; i++) {
        const pE = this.beliefs[i];
        const pTrait = 0.055 + 0.89 * this.getEntityTraitProb(this.entities[i], qId);
        pYes += pE * pTrait;
      }

      // Bound probability away from 0 and 1
      pYes = Math.max(1e-4, Math.min(1.0 - 1e-4, pYes));
      const pNo = 1.0 - pYes;

      // Simulated posterior if answer is YES
      const probsYes = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const pE = this.beliefs[i];
        const pTrait = 0.055 + 0.89 * this.getEntityTraitProb(this.entities[i], qId);
        probsYes[i] = (pE * pTrait) / pYes;
      }
      const hYes = this.computeEntropy(probsYes);

      // Simulated posterior if answer is NO
      const probsNo = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const pE = this.beliefs[i];
        const pTrait = 0.055 + 0.89 * this.getEntityTraitProb(this.entities[i], qId);
        probsNo[i] = (pE * (1.0 - pTrait)) / pNo;
      }
      const hNo = this.computeEntropy(probsNo);

      const expectedPosteriorH = (pYes * hYes) + (pNo * hNo);
      const ig = Math.max(0, this.currentEntropy - expectedPosteriorH);

      return {
        qId,
        pYes,
        pNo,
        expectedPosteriorH,
        informationGain: ig
      };
    }

    /**
     * Get candidate questions ranked by Shannon Information Gain
     */
    rankQuestions(limit = 5) {
      if (this.questionCache?.beliefs === this.beliefs && this.questionCache.count === this.questionCount) return this.questionCache.ranked.slice(0, limit);
      const askedSet = new Set(this.askedQuestions.map(a => a.qId));
      const scored = [];

      for (const q of this.questions) {
        if (!askedSet.has(q.id)) {
          const evalResult = this.evaluateQuestionInformationGain(q.id);
          if (evalResult.informationGain > 0.0001) scored.push({
            question: q,
            ...evalResult
          });
        }
      }

      // Sort descending by Information Gain
      scored.sort((a, b) => b.informationGain - a.informationGain);
      this.questionCache = { beliefs: this.beliefs, count: this.questionCount, ranked: scored };
      return scored.slice(0, limit);
    }

    /**
     * Perform Bayesian probability update given user response
     * @param {string} qId - Question ID
     * @param {'yes'|'no'|'probably'|'rarely'|'unsure'} answer
     */
    recordAnswer(qId, answer) {
      if (this.isGameOver || this.isGuessing || !this.questions.some(q => q.id === qId) ||
          this.askedQuestions.some(q => q.qId === qId) || !['yes', 'no', 'probably', 'rarely', 'unsure'].includes(answer)) return;
      // Save state for Undo
      this.undoStack.push({
        beliefs: new Float64Array(this.beliefs),
        rejectedIds: new Set(this.rejectedIds),
        questionCount: this.questionCount,
        askedQuestions: [...this.askedQuestions],
        currentEntropy: this.currentEntropy,
        isGuessing: this.isGuessing,
        currentGuess: this.currentGuess
      });

      const n = this.entities.length;
      const newBeliefs = new Float64Array(n);
      let totalWeight = 0.0;

      // Soft Bayesian likelihood weights
      // Handles human uncertainty gracefully (fault-tolerant)
      let yesWeight = 0.5;
      let noWeight = 0.5;
      if (answer === 'yes') {
        yesWeight = 0.95; noWeight = 0.05;
      } else if (answer === 'no') {
        yesWeight = 0.05; noWeight = 0.95;
      } else if (answer === 'probably') {
        yesWeight = 0.78; noWeight = 0.22;
      } else if (answer === 'rarely') {
        yesWeight = 0.22; noWeight = 0.78;
      } else if (answer === 'unsure') {
        yesWeight = 0.50; noWeight = 0.50;
      }

      const smoothingEpsilon = 0.005; // Laplace-style smoothing prevents hard zeros

      for (let i = 0; i < n; i++) {
        const prior = this.beliefs[i];
        const traitProb = this.getEntityTraitProb(this.entities[i], qId);

        // Likelihood of user answer given this entity
        const likelihood = (traitProb * yesWeight) + ((1.0 - traitProb) * noWeight);
        const posterior = prior * (likelihood + smoothingEpsilon);

        newBeliefs[i] = posterior;
        totalWeight += posterior;
      }

      // Normalize distribution to sum to 1.0
      if (totalWeight > 0) {
        for (let i = 0; i < n; i++) {
          newBeliefs[i] /= totalWeight;
        }
      }

      const prevEntropy = this.currentEntropy;
      this.beliefs = newBeliefs;
      this.currentEntropy = this.computeEntropy(this.beliefs);
      this.questionCount++;

      this.askedQuestions.push({
        qId,
        answer,
        entropyBefore: prevEntropy,
        entropyAfter: this.currentEntropy,
        bitsEliminated: Math.max(0, prevEntropy - this.currentEntropy)
      });

      this.checkGuessConditions();
    }

    undo() {
      if (this.undoStack.length === 0) return false;
      const prev = this.undoStack.pop();
      this.beliefs = prev.beliefs;
      this.rejectedIds = prev.rejectedIds;
      this.questionCount = prev.questionCount;
      this.askedQuestions = prev.askedQuestions;
      this.currentEntropy = prev.currentEntropy;
      this.isGuessing = prev.isGuessing;
      this.currentGuess = prev.currentGuess;
      this.isGameOver = false;
      return true;
    }

    getTopCandidates(limit = 5) {
      const candidates = [];
      for (let i = 0; i < this.entities.length; i++) {
        if (this.rejectedIds.has(this.entities[i].id)) continue;
        candidates.push({
          entity: this.entities[i],
          probability: this.beliefs[i]
        });
      }
      candidates.sort((a, b) => b.probability - a.probability);
      return candidates.slice(0, limit);
    }

    checkGuessConditions() {
      const top = this.getTopCandidates(2);
      const topP = top[0]?.probability || 0;
      const runnerUpP = top[1]?.probability || 0;

      // Guess condition criteria:
      // 1. High probability >= 78%
      // 2. Clear lead: top >= 62% and runner up <= 14%
      // 3. Very low entropy <= 0.4 bits
      // 4. Reached Question 20
      if (
        topP >= 0.78 ||
        (topP >= 0.62 && runnerUpP <= 0.14) ||
        this.currentEntropy <= 0.40 ||
        this.questionCount >= this.maxQuestions || this.rankQuestions(1).length === 0
      ) {
        this.isGuessing = true;
        this.currentGuess = top[0].entity;
      }
    }

    rejectCurrentGuess() {
      if (!this.currentGuess) return;
      this.questionCache = null;
      this.lastRejectedGuess = this.currentGuess;
      this.rejectedIds.add(this.currentGuess.id);
      // Drastically lower the rejected guess's probability
      const guessIndex = this.entities.findIndex(e => e.id === this.currentGuess.id);
      if (guessIndex >= 0) {
        this.beliefs[guessIndex] = 0;

        // Renormalize
        let sum = 0;
        for (let i = 0; i < this.beliefs.length; i++) sum += this.beliefs[i];
        if (sum > 0) {
          for (let i = 0; i < this.beliefs.length; i++) this.beliefs[i] /= sum;
        }
      }

      this.isGuessing = false;
      this.currentGuess = null;
      this.currentEntropy = this.computeEntropy(this.beliefs);

      if (this.questionCount >= this.maxQuestions || this.getTopCandidates(1).length === 0) {
        this.isGameOver = true;
      }
    }

    teachEntity(name, category, distinguishingQ, userAnsIsYes) {
      const newId = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const newQId = 'q_custom_' + Date.now();

      // Register new question
      const newQuestion = {
        id: newQId,
        text: distinguishingQ,
        category: 'custom'
      };
      this.questions.push(newQuestion);

      // Create new entity with inherited traits from current guess or neutral
      const newEntity = {
        id: newId,
        name: name.trim(),
        category: category || 'Custom',
        desc: `Added by student in lab. Distinguishing clue: "${distinguishingQ}"`,
        traits: Object.fromEntries(this.askedQuestions.filter(r => r.answer !== 'unsure').map(r =>
          [r.qId, ({ yes: 1, no: 0, probably: 0.78, rarely: 0.22 })[r.answer]]))
      };

      // Set trait for the new question
      newEntity.traits[newQId] = userAnsIsYes ? 1.0 : 0.0;

      // If we had a guess that was wrong, set opposite on that guess
      if (this.lastRejectedGuess?.traits) {
        this.lastRejectedGuess.traits[newQId] = userAnsIsYes ? 0.0 : 1.0;
      }

      this.entities.push(newEntity);

      // Persist to localStorage
      try {
        const stored = JSON.parse(localStorage.getItem(this.customEntitiesKey) || '[]');
        stored.push(newEntity);
        localStorage.setItem(this.customEntitiesKey, JSON.stringify(stored));
        localStorage.setItem(this.customEntitiesKey + '_questions', JSON.stringify(this.questions.filter(q => q.category === 'custom')));
        const corrections = Object.fromEntries(this.entities.filter(e => !e.id.startsWith('custom_')).map(e =>
          [e.id, Object.fromEntries(Object.entries(e.traits).filter(([q]) => q.startsWith('q_custom_')))]));
        localStorage.setItem(this.customEntitiesKey + '_corrections', JSON.stringify(corrections));
      } catch (e) {
        console.warn('Could not persist new entity:', e);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. RETRO 8-BIT AUDIO SYNTHESIZER (Web Audio API)
  // ═══════════════════════════════════════════════════════════════════════════

  class RetroSynth {
    constructor() {
      this.audioCtx = null;
      this.muted = false;
    }

    init() {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    playTone(freq, duration, type = 'square', gain = 0.08) {
      if (this.muted) return;
      this.init();
      if (!this.audioCtx) return;

      try {
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gainNode.gain.setValueAtTime(gain, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (e) {
        // Audio policy or unsupported
      }
    }

    beepClick() {
      this.playTone(880, 0.06, 'triangle', 0.05);
    }

    beepCompute() {
      this.playTone(440, 0.08, 'sawtooth', 0.04);
      setTimeout(() => this.playTone(660, 0.08, 'sawtooth', 0.04), 60);
    }

    fanfareVictory() {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((f, idx) => {
        setTimeout(() => this.playTone(f, 0.16, 'square', 0.08), idx * 110);
      });
    }

    soundStumped() {
      this.playTone(330, 0.15, 'sawtooth', 0.08);
      setTimeout(() => this.playTone(261.63, 0.25, 'sawtooth', 0.08), 120);
    }

    revealChime() {
      this.playTone(587.33, 0.1, 'sine', 0.08);
      setTimeout(() => this.playTone(880, 0.18, 'triangle', 0.08), 90);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. UI CONTROLLER & ACCESSIBLE INTERACTION
  // ═══════════════════════════════════════════════════════════════════════════

  class TwentyQuestionsUI {
    constructor() {
      this.engine = new InformationTheoryEngine();
      this.synth = new RetroSynth();
      this.currentMode = 'inspector'; // 'toy' or 'inspector'
      this.currentBacklight = 'green'; // 'green', 'amber', 'cyan'
      this.lcdFaceState = '( • _ • )';

      this.cacheDOM();
      this.bindEvents();
      this.render();
      this.initEntropyCurveWidget();
    }

    cacheDOM() {
      // Main stage
      this.stageGrid = document.getElementById('tq-stage-grid');
      this.modeToggleBtn = document.getElementById('tq-toggle-mode');
      this.backlightBtn = document.getElementById('tq-toggle-backlight');
      this.soundBtn = document.getElementById('tq-toggle-sound');
      this.statusLive = document.getElementById('tq-status-live');

      // LCD Screen elements
      this.lcdScreen = document.getElementById('tq-lcd-screen');
      this.lcdQNum = document.getElementById('tq-lcd-qnum');
      this.lcdEntropyBits = document.getElementById('tq-lcd-entropy-val');
      this.lcdFace = document.getElementById('tq-lcd-face');
      this.lcdStatusMsg = document.getElementById('tq-lcd-status-msg');
      this.lcdText = document.getElementById('tq-lcd-text');
      this.lcdSubtext = document.getElementById('tq-lcd-subtext');
      this.lcdMeterFill = document.getElementById('tq-lcd-meter-fill');

      // Primary Controls
      this.controlsCluster = document.getElementById('tq-controls-cluster');
      this.btnYes = document.getElementById('tq-btn-yes');
      this.btnNo = document.getElementById('tq-btn-no');
      this.btnProb = document.getElementById('tq-btn-prob');
      this.btnRarely = document.getElementById('tq-btn-rarely');
      this.btnUnsure = document.getElementById('tq-btn-unsure');
      this.btnUndo = document.getElementById('tq-btn-undo');
      this.btnReset = document.getElementById('tq-btn-reset');
      this.btnGuessNow = document.getElementById('tq-btn-guess-now');

      // Telemetry Dashboard
      this.statEntropy = document.getElementById('tq-stat-entropy');
      this.statCandidates = document.getElementById('tq-stat-candidates');
      this.statBitsRemoved = document.getElementById('tq-stat-bits-removed');
      this.statEfficiency = document.getElementById('tq-stat-efficiency');
      this.igList = document.getElementById('tq-ig-list');
      this.candidateBars = document.getElementById('tq-candidate-bars');
      this.historyList = document.getElementById('tq-history-list');

      // Reveal / Guess Container
      this.revealBanner = document.getElementById('tq-reveal-banner');
      this.revealTarget = document.getElementById('tq-reveal-target');
      this.revealDesc = document.getElementById('tq-reveal-desc');
      this.btnGuessCorrect = document.getElementById('tq-btn-guess-correct');
      this.btnGuessWrong = document.getElementById('tq-btn-guess-wrong');

      // Teach Drawer
      this.teachBox = document.getElementById('tq-teach-box');
      this.teachForm = document.getElementById('tq-teach-form');
      this.inputTeachName = document.getElementById('tq-teach-name');
      this.inputTeachCat = document.getElementById('tq-teach-category');
      this.inputTeachQ = document.getElementById('tq-teach-question');
      this.selectTeachAns = document.getElementById('tq-teach-answer');
    }

    bindEvents() {
      // Primary Answer Buttons
      this.btnYes?.addEventListener('click', () => this.handleAnswer('yes'));
      this.btnNo?.addEventListener('click', () => this.handleAnswer('no'));
      this.btnProb?.addEventListener('click', () => this.handleAnswer('probably'));
      this.btnRarely?.addEventListener('click', () => this.handleAnswer('rarely'));
      this.btnUnsure?.addEventListener('click', () => this.handleAnswer('unsure'));

      // Utilities
      this.btnUndo?.addEventListener('click', () => this.handleUndo());
      this.btnReset?.addEventListener('click', () => this.handleReset());
      document.getElementById('tq-btn-new-game')?.addEventListener('click', () => this.handleReset());
      document.getElementById('tq-btn-stumped')?.addEventListener('click', () => {
        clearTimeout(this.pendingAnswer);
        this.pendingAnswer = null;
        this.engine.lastRejectedGuess = this.engine.currentGuess || this.engine.getTopCandidates(1)[0]?.entity;
        this.engine.isGameOver = true;
        this.engine.isGuessing = false;
        this.controlsCluster.hidden = true;
        this.renderStumpedState();
        this.inputTeachName?.focus();
      });
      this.btnGuessNow?.addEventListener('click', () => this.handleForceGuess());

      // Guess feedback buttons
      this.btnGuessCorrect?.addEventListener('click', () => this.handleVictory());
      this.btnGuessWrong?.addEventListener('click', () => this.handleGuessWrong());

      // Teach Form
      this.teachForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTeachSubmit();
      });

      // Top bar toggles
      this.modeToggleBtn?.addEventListener('click', () => this.toggleViewMode());
      this.backlightBtn?.addEventListener('click', () => this.cycleBacklight());
      this.soundBtn?.addEventListener('click', () => this.toggleSound());

      // Global Keyboard Shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.defaultPrevented || (e.key === 'Escape' && (document.fullscreenElement || document.querySelector('.creation-app-expanded'))) || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;

        const flashBtn = (btn) => {
          if (!btn) return;
          btn.classList.add('is-pressed');
          setTimeout(() => btn.classList.remove('is-pressed'), 140);
        };

        const k = e.key.toLowerCase();
        if (k === '1' || k === 'y') { flashBtn(this.btnYes); this.handleAnswer('yes'); }
        else if (k === '2' || k === 'n') { flashBtn(this.btnNo); this.handleAnswer('no'); }
        else if (k === '3' || k === 'p') { flashBtn(this.btnProb); this.handleAnswer('probably'); }
        else if (k === '4' || k === 'r') { flashBtn(this.btnRarely); this.handleAnswer('rarely'); }
        else if (k === '5' || k === 'u') { flashBtn(this.btnUnsure); this.handleAnswer('unsure'); }
        else if (k === 'z' || k === 'backspace') { flashBtn(this.btnUndo); this.handleUndo(); }
        else if (k === 'escape') { flashBtn(this.btnReset); this.handleReset(); }
      });
    }

    handleAnswer(answer) {
      if (this.pendingAnswer || this.engine.isGameOver || this.engine.isGuessing) return;

      const ranked = this.engine.rankQuestions(1);
      if (ranked.length === 0) {
        this.engine.isGuessing = true;
        this.engine.currentGuess = this.engine.getTopCandidates(1)[0]?.entity;
        this.render();
        return;
      }

      const qId = ranked[0].question.id;
      this.synth.beepClick();
      this.lcdFace.textContent = '( > _ < )'; // brief thinking squint
      this.lcdStatusMsg.textContent = 'WEIGHING YOUR CLUE...';

      this.pendingAnswer = setTimeout(() => {
        this.pendingAnswer = null;
        this.engine.recordAnswer(qId, answer);
        this.synth.beepCompute();
        this.render();
      }, 140);
    }

    handleUndo() {
      clearTimeout(this.pendingAnswer);
      this.pendingAnswer = null;
      if (this.engine.undo()) {
        this.synth.beepClick();
        this.render();
      }
    }

    handleReset() {
      this.restartButton?.remove();
      clearTimeout(this.pendingAnswer);
      this.pendingAnswer = null;
      this.synth.beepClick();
      this.engine.reset();
      this.render();
    }

    handleForceGuess() {
      if (this.pendingAnswer || this.engine.isGuessing || this.engine.isGameOver) return;
      const top = this.engine.getTopCandidates(1);
      if (top.length > 0) {
        this.engine.isGuessing = true;
        this.engine.currentGuess = top[0].entity;
        this.synth.revealChime();
        this.render();
      }
    }

    handleVictory() {
      this.synth.fanfareVictory();
      this.engine.isGameOver = true;
      this.engine.isGuessing = false;
      this.renderVictoryState();
    }

    handleGuessWrong() {
      this.synth.soundStumped();
      this.engine.rejectCurrentGuess();

      if (!this.engine.isGameOver && this.engine.questionCount < this.engine.maxQuestions) {
        // Can keep asking!
        this.render();
      } else {
        // Stumped! Show teach drawer
        this.engine.isGameOver = true;
        this.renderStumpedState();
      }
    }

    handleTeachSubmit() {
      const name = this.inputTeachName?.value?.trim();
      const cat = this.inputTeachCat?.value?.trim();
      const q = this.inputTeachQ?.value?.trim();
      const ansIsYes = this.selectTeachAns?.value === 'yes';

      if (!name || !q) return;

      this.engine.teachEntity(name, cat, q, ansIsYes);
      this.synth.fanfareVictory();

      this.teachForm?.reset();
      this.teachBox.hidden = true;
      this.handleReset();
      this.statusLive.textContent = `Learned ${name}. Your new item and clue are saved in this browser when storage is available. A new game is ready.`;
    }

    toggleViewMode() {
      this.currentMode = this.currentMode === 'inspector' ? 'toy' : 'inspector';
      const sidePanel = document.getElementById('tq-dashboard-side');
      if (sidePanel) {
        sidePanel.hidden = this.currentMode === 'toy';
      }
      if (this.stageGrid) {
        this.stageGrid.classList.toggle('is-toy-mode', this.currentMode === 'toy');
      }
      if (this.modeToggleBtn) {
        this.modeToggleBtn.textContent = this.currentMode === 'inspector' ? '🔬 AI Inspector Mode' : '🎮 Retro 20Q Mode';
        this.modeToggleBtn.classList.toggle('is-active', this.currentMode === 'inspector');
        this.modeToggleBtn.setAttribute('aria-pressed', String(this.currentMode === 'inspector'));
      }
    }

    cycleBacklight() {
      const lights = ['green', 'amber', 'cyan'];
      const nextIdx = (lights.indexOf(this.currentBacklight) + 1) % lights.length;
      this.currentBacklight = lights[nextIdx];

      if (this.backlightBtn) {
        const nameMap = { green: 'Emerald', amber: 'Amber', cyan: 'Cyan' };
        this.backlightBtn.textContent = `💡 Light: ${nameMap[this.currentBacklight] || 'On'}`;
      }

      if (this.lcdScreen) {
        if (this.currentBacklight === 'amber') {
          this.lcdScreen.style.setProperty('--tq-lcd-bg', '#2d1e08');
          this.lcdScreen.style.setProperty('--tq-lcd-text', '#ffb020');
          this.lcdScreen.style.setProperty('--tq-lcd-text-dim', '#8a5b0b');
          this.lcdScreen.style.setProperty('--tq-lcd-glow', '0 0 12px rgba(255, 176, 32, 0.45)');
        } else if (this.currentBacklight === 'cyan') {
          this.lcdScreen.style.setProperty('--tq-lcd-bg', '#07242e');
          this.lcdScreen.style.setProperty('--tq-lcd-text', '#22d3ee');
          this.lcdScreen.style.setProperty('--tq-lcd-text-dim', '#0e7490');
          this.lcdScreen.style.setProperty('--tq-lcd-glow', '0 0 12px rgba(34, 211, 238, 0.45)');
        } else {
          // Green
          this.lcdScreen.style.removeProperty('--tq-lcd-bg');
          this.lcdScreen.style.removeProperty('--tq-lcd-text');
          this.lcdScreen.style.removeProperty('--tq-lcd-text-dim');
          this.lcdScreen.style.removeProperty('--tq-lcd-glow');
        }
      }
    }

    toggleSound() {
      this.synth.muted = !this.synth.muted;
      if (this.soundBtn) {
        this.soundBtn.textContent = this.synth.muted ? '🔇 Sound: Off' : '🔊 Sound: On';
        this.soundBtn.setAttribute('aria-pressed', String(!this.synth.muted));
      }
    }

    render() {
      // Hide reveal/teach states during active questioning
      if (this.revealBanner) this.revealBanner.hidden = !this.engine.isGuessing;
      if (this.teachBox) this.teachBox.hidden = true;
      if (this.controlsCluster) this.controlsCluster.hidden = this.engine.isGuessing || this.engine.isGameOver;

      // Update Undo button state
      if (this.btnUndo) {
        this.btnUndo.disabled = this.engine.questionCount === 0 || this.engine.isGameOver;
      }

      const qNum = this.engine.questionCount + 1;
      const currentH = this.engine.currentEntropy;
      const initialH = this.engine.initialEntropy;

      // Update Top Status bar on LCD
      if (this.lcdQNum) {
        this.lcdQNum.textContent = `Q: ${String(Math.min(20, qNum)).padStart(2, '0')}/20`;
      }
      if (this.lcdEntropyBits) {
        this.lcdEntropyBits.textContent = `H: ${currentH.toFixed(2)} BITS`;
      }

      // Entropy Gauge fill percentage
      if (this.lcdMeterFill) {
        const pct = Math.max(0, Math.min(100, (currentH / (initialH || 7.0)) * 100));
        this.lcdMeterFill.style.width = `${pct.toFixed(1)}%`;
      }

      // LCD Mascot Expression
      if (this.engine.isGuessing) {
        this.lcdFaceState = '( ★ _ ★ )';
        this.lcdStatusMsg.textContent = 'SYNAPSE LOCKED: GUESSING';
      } else if (currentH < 1.2) {
        this.lcdFaceState = '( ^ _ ^ )';
        this.lcdStatusMsg.textContent = 'HIGH CONFIDENCE';
      } else if (currentH < 3.0) {
        this.lcdFaceState = '( • _ • )';
        this.lcdStatusMsg.textContent = 'DIVIDING SEARCH SPACE';
      } else {
        this.lcdFaceState = '( ? _ ? )';
        this.lcdStatusMsg.textContent = 'PROBING CLUES';
      }
      if (this.lcdFace) this.lcdFace.textContent = this.lcdFaceState;

      // Render Question or Guess on LCD Screen
      if (this.engine.isGuessing) {
        const guess = this.engine.currentGuess;
        if (this.lcdText) this.lcdText.textContent = `ARE YOU THINKING OF: ${guess ? guess.name.toUpperCase() : 'UNKNOWN'}?`;
        if (this.lcdSubtext) this.lcdSubtext.textContent = 'Confirm on the console below!';
        if (this.revealTarget) this.revealTarget.textContent = guess?.name || '';
        if (this.revealDesc) this.revealDesc.textContent = guess?.desc || '';
      } else {
        const ranked = this.engine.rankQuestions(1);
        if (ranked.length > 0) {
          const topQ = ranked[0];
          if (this.lcdText) this.lcdText.textContent = topQ.question.text;
          if (this.lcdSubtext) {
            this.lcdSubtext.textContent = `Shannon Split: +${topQ.informationGain.toFixed(2)} bits expected Information Gain`;
          }
        } else {
          if (this.lcdText) this.lcdText.textContent = 'I am ready to guess what you are thinking of!';
          if (this.lcdSubtext) this.lcdSubtext.textContent = 'Click "Guess Now" on the console!';
        }
      }

      // Telemetry Stats
      if (this.statEntropy) this.statEntropy.textContent = `${currentH.toFixed(2)}`;
      const activeCandidates = this.engine.beliefs.filter(p => p >= 0.1 / this.engine.entities.length).length;
      if (this.statCandidates) this.statCandidates.textContent = `${activeCandidates}`;
      const bitsRemoved = Math.max(0, initialH - currentH);
      if (this.statBitsRemoved) this.statBitsRemoved.textContent = `${bitsRemoved.toFixed(2)}`;
      const efficiency = qNum > 1 ? (bitsRemoved / (qNum - 1)).toFixed(2) : '1.00';
      if (this.statEfficiency) this.statEfficiency.textContent = `${efficiency} b/q`;

      // Live Information Gain Split Leaderboard
      this.renderInformationGainLeaderboard();

      // Live Bayesian Belief Leaderboard
      this.renderCandidateLeaderboard();

      // History Trail
      this.renderHistoryTrail();

      // Screen Reader Announcement
      if (this.statusLive) {
        const announcement = this.engine.isGuessing
          ? `The AI guesses: ${this.engine.currentGuess?.name}`
          : `Question ${qNum}: ${this.lcdText?.textContent || ''}`;
        this.statusLive.textContent = announcement;
      }
    }

    renderInformationGainLeaderboard() {
      if (!this.igList) return;
      const ranked = this.engine.rankQuestions(4);
      this.igList.innerHTML = '';

      ranked.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = `tq-ig-item ${idx === 0 ? 'is-chosen' : ''}`;
        row.innerHTML = `
          <div class="tq-ig-q-text">${idx === 0 ? '★ ' : ''}${escapeHTML(item.question.text)}</div>
          <div class="tq-ig-meta">
            ${idx === 0 ? '<span class="tq-ig-chosen-badge">Best Split</span>' : ''}
            <span class="tq-ig-pill" title="Information Gain = Shannon entropy reduction">+${item.informationGain.toFixed(2)} bits</span>
          </div>
        `;
        this.igList.appendChild(row);
      });
    }

    renderCandidateLeaderboard() {
      if (!this.candidateBars) return;
      const candidates = this.engine.getTopCandidates(5);
      this.candidateBars.innerHTML = '';

      const categoryIcons = {
        'Characters': '🎭',
        'Animals': '🐾',
        'Thinkers': '💡',
        'Technology': '⚙️',
        'Cosmos': '✨',
        'Places': '🏛️',
        'Everyday': '📦',
        'Nature': '🌿'
      };

      candidates.forEach(cand => {
        const pct = (cand.probability * 100).toFixed(1);
        const icon = categoryIcons[cand.entity.category] || '🔹';
        const row = document.createElement('div');
        row.className = 'tq-cand-row';
        row.innerHTML = `
          <div class="tq-cand-name" title="${escapeHTML(cand.entity.name)} (${escapeHTML(cand.entity.category)})">${icon} ${escapeHTML(cand.entity.name)}</div>
          <div class="tq-cand-track">
            <div class="tq-cand-fill" style="width: ${pct}%"></div>
          </div>
          <div class="tq-cand-pct">${pct}%</div>
        `;
        this.candidateBars.appendChild(row);
      });
    }

    renderHistoryTrail() {
      if (!this.historyList) return;
      this.historyList.innerHTML = '';

      if (this.engine.askedQuestions.length === 0) {
        this.historyList.innerHTML = '<p style="font-size:0.75rem;color:var(--text-muted);">No questions asked yet. Think of an entity and press a button!</p>';
        return;
      }

      const qMap = new Map(this.engine.questions.map(q => [q.id, q.text]));

      this.engine.askedQuestions.forEach((record, idx) => {
        const item = document.createElement('div');
        item.className = 'tq-history-item';
        const qText = qMap.get(record.qId) || 'Question';
        item.innerHTML = `
          <div><strong>Q${idx + 1}:</strong> ${escapeHTML(qText)}</div>
          <span class="tq-ans-pill tq-ans-${record.answer}">${record.answer.toUpperCase()}</span>
        `;
        this.historyList.appendChild(item);
      });
    }

    renderVictoryState() {
      if (this.lcdText) this.lcdText.textContent = `I GUESSED IT! YOU WERE THINKING OF ${this.engine.currentGuess?.name.toUpperCase()}!`;
      if (this.lcdSubtext) {
        this.lcdSubtext.textContent = `Solved in ${this.engine.questionCount} questions. Shannon Entropy eliminated: ${(this.engine.initialEntropy - this.engine.currentEntropy).toFixed(2)} bits!`;
      }
      if (this.lcdFace) this.lcdFace.textContent = '( ^ ▽ ^ )';
      if (this.revealBanner) this.revealBanner.hidden = true;
      if (this.controlsCluster) this.controlsCluster.hidden = true;
      this.showRestart();
    }

    showRestart() {
      if (this.restartButton) this.restartButton.remove();
      const button = document.createElement('button');
      this.restartButton = button;
      button.type = 'button';
      button.className = 'tq-btn-correct';
      button.textContent = 'Play again';
      button.addEventListener('click', () => { button.remove(); this.handleReset(); });
      this.lcdScreen.appendChild(button);
      button.focus();
    }

    renderStumpedState() {
      if (this.lcdText) this.lcdText.textContent = 'YOU WIN! YOU OUTSMARTED THE ORACLE!';
      if (this.lcdSubtext) this.lcdSubtext.textContent = 'Teach me what you were thinking of so I learn for next time!';
      if (this.lcdFace) this.lcdFace.textContent = '( × _ × )';
      if (this.revealBanner) this.revealBanner.hidden = true;
      if (this.teachBox) this.teachBox.hidden = false;
      this.showRestart();
    }

    // ── Interactive Shannon Entropy Curve Math Widget for the Lesson ──
    initEntropyCurveWidget() {
      const slider = document.getElementById('tq-shannon-slider');
      const pValSpan = document.getElementById('tq-shannon-pval');
      const hValSpan = document.getElementById('tq-shannon-hval');
      const canvas = document.getElementById('tq-entropy-canvas');

      if (!slider || !canvas) return;

      const ctx = canvas.getContext('2d');

      const drawCurve = (selectedP) => {
        const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
        const h = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, w, h);

        const padX = 35 * (window.devicePixelRatio || 1);
        const padY = 25 * (window.devicePixelRatio || 1);
        const graphW = w - padX * 2;
        const graphH = h - padY * 2;

        // Draw Axes & Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padX, padY);
        ctx.lineTo(padX, h - padY);
        ctx.lineTo(w - padX, h - padY);
        ctx.stroke();

        // 50/50 center dashed line
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padX + graphW * 0.5, padY);
        ctx.lineTo(padX + graphW * 0.5, h - padY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Graph Shannon Curve: H(p) = -p*log2(p) - (1-p)*log2(1-p)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3 * (window.devicePixelRatio || 1);
        ctx.beginPath();

        const steps = 100;
        for (let i = 0; i <= steps; i++) {
          const p = Math.max(1e-5, Math.min(1 - 1e-5, i / steps));
          const ent = - (p * Math.log2(p)) - ((1 - p) * Math.log2(1 - p));

          const x = padX + (i / steps) * graphW;
          const y = (h - padY) - (ent * graphH);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Selected Point
        const currentP = Math.max(1e-5, Math.min(1 - 1e-5, selectedP));
        const currentH = - (currentP * Math.log2(currentP)) - ((1 - currentP) * Math.log2(1 - currentP));
        const dotX = padX + selectedP * graphW;
        const dotY = (h - padY) - (currentH * graphH);

        // Highlight marker
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `${11 * (window.devicePixelRatio || 1)}px monospace`;
        ctx.fillText(`H = ${currentH.toFixed(3)} bit`, dotX - 25, Math.max(padY + 12, dotY - 12));
      };

      const updateValues = () => {
        const p = parseFloat(slider.value);
        const currentH = (p <= 0 || p >= 1)
          ? 0.0
          : - (p * Math.log2(p)) - ((1 - p) * Math.log2(1 - p));

        if (pValSpan) pValSpan.textContent = p.toFixed(2);
        if (hValSpan) hValSpan.textContent = currentH.toFixed(3);
        drawCurve(p);
      };

      slider.addEventListener('input', updateValues);
      window.addEventListener('resize', updateValues);
      updateValues();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EXPONENTIAL BITS UNIVERSE EXPLORER WIDGET
  // ═══════════════════════════════════════════════════════════════════════════

  function initBitsUniverseExplorer() {
    const slider = document.getElementById('tq-bits-slider');
    const bitsVal = document.getElementById('tq-bits-val');
    const totalVal = document.getElementById('tq-total-states');
    const metaphor = document.getElementById('tq-metaphor-text');

    if (!slider || !bitsVal || !totalVal) return;

    const metaphors = {
      1: 'Coin flip: Heads or Tails (2 possibilities)',
      2: '4 Card Suits: Spades, Hearts, Diamonds, Clubs',
      4: '16 Compass Headings (N, NNE, NE...)',
      6: '64 Squares on a standard Chessboard',
      8: '256 ASCII characters or single RGB color byte',
      10: '1,024 words in a concise student dictionary',
      12: '4,096 items in a large department store',
      15: '32,768 seats in a packed major-league stadium',
      16: '65,536 lines of code in a full indie computer game',
      18: '262,144 pixels on an old retro arcade screen',
      20: '1,048,576 possibilities — over a million people, books, or entities!'
    };

    const update = () => {
      const b = parseInt(slider.value, 10);
      const total = Math.pow(2, b);
      bitsVal.textContent = b;
      totalVal.textContent = total.toLocaleString();

      // Find closest metaphor
      let text = 'Over a million distinct items!';
      const keys = Object.keys(metaphors).map(Number).sort((x, y) => x - y);
      for (const k of keys) {
        if (b <= k) {
          text = metaphors[k];
          break;
        }
      }
      if (metaphor) metaphor.textContent = text;
    };

    slider.addEventListener('input', update);
    update();
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.TwentyQuestionsInstance = new TwentyQuestionsUI();
      initBitsUniverseExplorer();
    });
  } else {
    window.TwentyQuestionsInstance = new TwentyQuestionsUI();
    initBitsUniverseExplorer();
  }
})();
