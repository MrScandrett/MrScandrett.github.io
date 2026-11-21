/**
 * 20Q Mind Reader & Information Theory Engine
 * Pure ES module with zero DOM dependencies:
 * - Curated 118-entity STEAM & pop-culture knowledge base across 8 categories
 * - Zero-allocation Shannon Information Gain scorer + fault-tolerant Bayesian updater
 * - Reverse 20Q ("Be the AI") deterministic split-search session
 * - Information Theory & LLM Cross-Entropy / Perplexity / Temperature math helpers
 */

export const CATEGORIES = [
  { id: 'Animals', label: 'Animals', icon: '🐾' },
  { id: 'Thinkers & Figures', label: 'Thinkers & Figures', icon: '💡' },
  { id: 'Fictional Characters', label: 'Fictional Characters', icon: '🎭' },
  { id: 'Tech & Inventions', label: 'Tech & Inventions', icon: '⚙️' },
  { id: 'Cosmos & Earth', label: 'Cosmos & Earth', icon: '🪐' },
  { id: 'Monuments & Places', label: 'Monuments & Places', icon: '🏛️' },
  { id: 'Everyday Objects', label: 'Everyday Objects', icon: '📦' },
  { id: 'Plants & Food', label: 'Plants & Food', icon: '🌿' }
];

const CATEGORY_ICON_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c.icon]));

export function getCategoryIcon(category) {
  return CATEGORY_ICON_MAP[category] || '🔹';
}

const CHANNEL_EPSILON = 0.025;
const SMOOTHING_EPSILON = 0.005;

export const QUESTIONS = [
  // Top-level real-world taxonomy
  { id: 'q_alive', text: 'Is it a real living (or once-living) biological organism (animal, human, plant, or fungus)?', category: 'taxonomy' },
  { id: 'q_animal', text: 'Is it a real animal?', category: 'taxonomy' },
  { id: 'q_human', text: 'Is it a real human person (historical or living)?', category: 'taxonomy' },
  { id: 'q_fictional', text: 'Is it a fictional character from stories, films, or games?', category: 'taxonomy' },
  { id: 'q_invention', text: 'Is it a human-made invention, object, food, or built monument?', category: 'taxonomy' },
  { id: 'q_plant_flora', text: 'Is it a real plant, tree, fruit, flower, or fungus?', category: 'taxonomy' },

  // People / Thinkers
  { id: 'q_historical', text: 'Did this person make their mark in history rather than living today?', category: 'people' },
  { id: 'q_science_thinker', text: 'Is this person famous for science, mathematics, computing, astronomy, or invention?', category: 'people' },
  { id: 'q_arts_literature', text: 'Is this person famous for literature, painting, or musical composition?', category: 'people' },
  { id: 'q_leader', text: 'Is this person known for political leadership, presidency, or civil rights courage?', category: 'people' },
  { id: 'q_female', text: 'Is this historical figure female?', category: 'people' },

  // Animals
  { id: 'q_mammal', text: 'Is it a mammal?', category: 'nature' },
  { id: 'q_bird', text: 'Is it a bird?', category: 'nature' },
  { id: 'q_reptile_amphibian', text: 'Is it a reptile or an amphibian?', category: 'nature' },
  { id: 'q_insect_bug', text: 'Is it an insect or bug?', category: 'nature' },
  { id: 'q_extinct', text: 'Is it an extinct prehistoric creature (like a dinosaur)?', category: 'nature' },
  { id: 'q_carnivore', text: 'Is it primarily a meat-eater, predator, or hunter?', category: 'nature' },
  { id: 'q_fur', text: 'Does it have noticeable fur or thick hair on its body?', category: 'nature' },
  { id: 'q_stripes_spots', text: 'Does it have distinct stripes or spots on its body?', category: 'nature' },
  { id: 'q_domestic_pet', text: 'Is it a common domesticated pet kept inside human homes?', category: 'nature' },
  { id: 'q_venomous', text: 'Can it inject venom, sting, or deliver a toxic spur/bite?', category: 'nature' },
  { id: 'q_four_legs', text: 'Does it walk or run on four legs?', category: 'nature' },

  // Shared physical & environment
  { id: 'q_flight', text: 'Can it fly or glide through the air?', category: 'physical' },
  { id: 'q_wings', text: 'Does it have wings?', category: 'physical' },
  { id: 'q_water', text: 'Does it live mostly in water, swim deep underwater, or deal directly with rain/ice?', category: 'physical' },
  { id: 'q_ocean_depths', text: 'Is it primarily found in the ocean or sea?', category: 'nature' },
  { id: 'q_larger_than_car', text: 'Is it noticeably larger or heavier than a standard passenger car?', category: 'physical' },
  { id: 'q_fits_hand', text: 'Can a person easily hold or carry it in one or two hands?', category: 'physical' },
  { id: 'q_black_white', text: 'Is it famously colored in black and white?', category: 'physical' },
  { id: 'q_metal', text: 'Is it built primarily out of metal?', category: 'physical' },
  { id: 'q_paper_wood', text: 'Is it made primarily of wood, paper, or plant fibers?', category: 'physical' },
  { id: 'q_extreme_heat_fire', text: 'Does it involve extreme heat, fire, lava, lightning, or baking?', category: 'physical' },
  { id: 'q_ice_cold', text: 'Is it naturally associated with extreme cold, snow, or ice?', category: 'physical' },
  { id: 'q_sound_music', text: 'Is it famous for music, singing, howling, thunder, or voice/audio?', category: 'physical' },

  // Technology & Everyday
  { id: 'q_edible', text: 'Is it a food or fruit that humans commonly eat?', category: 'everyday' },
  { id: 'q_electric', text: 'Does its primary job rely on electricity, batteries, or electronic chips?', category: 'tech' },
  { id: 'q_screen_digital', text: 'Does it feature an interactive digital screen?', category: 'tech' },
  { id: 'q_vehicle', text: 'Is it a vehicle built to carry people or cargo?', category: 'tech' },
  { id: 'q_spacecraft', text: 'Is it built to launch into outer space or orbit Earth?', category: 'tech' },
  { id: 'q_optical_instrument', text: 'Is it an optical lens instrument for viewing tiny or distant things?', category: 'tech' },
  { id: 'q_school_lab', text: 'Is it commonly found inside a classroom, library, or science lab?', category: 'everyday' },
  { id: 'q_music_instrument', text: 'Is it a musical instrument?', category: 'everyday' },
  { id: 'q_string_instrument', text: 'Does it produce sound from vibrating strings?', category: 'everyday' },
  { id: 'q_wheels', text: 'Does it roll on wheels?', category: 'tech' },
  { id: 'q_sports_play', text: 'Is it used in physical sports or outdoor athletic play?', category: 'everyday' },
  { id: 'q_writing_reading', text: 'Is it used specifically for writing, printing, or reading words?', category: 'everyday' },
  { id: 'q_sharp_edge', text: 'Does it have pivoted metal blades for cutting?', category: 'everyday' },

  // Space, Geology & Monuments
  { id: 'q_space_object', text: 'Is it an astronomical body or phenomenon naturally located in outer space?', category: 'space' },
  { id: 'q_planet_moon', text: 'Is it a planet or natural moon in our solar system?', category: 'space' },
  { id: 'q_star_light', text: 'Is it a star shining by nuclear fusion?', category: 'space' },
  { id: 'q_landmark_monument', text: 'Is it a world-famous architectural monument or historic structure?', category: 'places' },
  { id: 'q_geological_wonder', text: 'Is it a natural Earth landform, storm, or sky phenomenon?', category: 'places' },
  { id: 'q_ancient_times', text: 'Was it built over 1,000 years ago in the ancient world?', category: 'history' }
];

const RAW_NON_CHARACTERS = [
  // ── ANIMALS (28) ──
  {
    id: 'lion', name: 'Lion', category: 'Animals',
    desc: 'The apex savanna big cat famous for its golden mane and thunderous roar.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_carnivore: 1, q_four_legs: 1, q_fur: 1, q_sound_music: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'elephant', name: 'African Elephant', category: 'Animals',
    desc: 'The largest living land mammal, with ivory tusks and a muscular prehensile trunk.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_four_legs: 1, q_larger_than_car: 1, q_fits_hand: 0, q_carnivore: 0 }
  },
  {
    id: 'blue_whale', name: 'Blue Whale', category: 'Animals',
    desc: 'The largest animal ever known to live on Earth, filtering krill through baleen plates.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_water: 1, q_ocean_depths: 1, q_larger_than_car: 1, q_fits_hand: 0, q_carnivore: 1, q_sound_music: 1 }
  },
  {
    id: 'bald_eagle', name: 'Bald Eagle', category: 'Animals',
    desc: 'A powerful bird of prey with a white-feathered head and sharp talons.',
    traits: { q_alive: 1, q_animal: 1, q_bird: 1, q_flight: 1, q_wings: 1, q_carnivore: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'emperor_penguin', name: 'Emperor Penguin', category: 'Animals',
    desc: 'A flightless Antarctic seabird with tuxedo-like plumage built for icy diving.',
    traits: { q_alive: 1, q_animal: 1, q_bird: 1, q_wings: 1, q_flight: 0, q_water: 1, q_ocean_depths: 1, q_ice_cold: 1, q_black_white: 1, q_carnivore: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'great_white_shark', name: 'Great White Shark', category: 'Animals',
    desc: 'An apex ocean predator with rows of serrated teeth and electroreceptors.',
    traits: { q_alive: 1, q_animal: 1, q_water: 1, q_ocean_depths: 1, q_carnivore: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'chameleon', name: 'Chameleon', category: 'Animals',
    desc: 'A color-shifting lizard with independently rotating eyes and a ballistic tongue.',
    traits: { q_alive: 1, q_animal: 1, q_reptile_amphibian: 1, q_four_legs: 1, q_fits_hand: 1, q_carnivore: 1, q_larger_than_car: 0 }
  },
  {
    id: 'honeybee', name: 'Honeybee', category: 'Animals',
    desc: 'A vital flying pollinator that performs waggle dances and makes honey in hives.',
    traits: { q_alive: 1, q_animal: 1, q_insect_bug: 1, q_flight: 1, q_wings: 1, q_fits_hand: 1, q_venomous: 1, q_stripes_spots: 1, q_larger_than_car: 0 }
  },
  {
    id: 'tyrannosaurus_rex', name: 'Tyrannosaurus Rex', category: 'Animals',
    desc: 'The iconic bipedal apex carnivore dinosaur of the Late Cretaceous period.',
    traits: { q_alive: 1, q_animal: 1, q_extinct: 1, q_reptile_amphibian: 1, q_carnivore: 1, q_larger_than_car: 1, q_fits_hand: 0, q_ancient_times: 1 }
  },
  {
    id: 'platypus', name: 'Platypus', category: 'Animals',
    desc: 'An egg-laying Australian mammal with a duck-like bill, beaver tail, and venomous spurs.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_water: 1, q_four_legs: 1, q_fits_hand: 1, q_venomous: 1, q_fur: 1, q_carnivore: 1, q_larger_than_car: 0 }
  },
  {
    id: 'giant_panda', name: 'Giant Panda', category: 'Animals',
    desc: 'A black-and-white bear native to mountain bamboo forests in central China.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_black_white: 1, q_fur: 1, q_four_legs: 1, q_carnivore: 0, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'cheetah', name: 'Cheetah', category: 'Animals',
    desc: 'The fastest land animal on Earth, sprinting up to 70 mph in a spotted coat.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_stripes_spots: 1, q_carnivore: 1, q_fur: 1, q_four_legs: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'wolf', name: 'Gray Wolf', category: 'Animals',
    desc: 'A pack-hunting wild canine famous for howling across northern forests and tundra.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_carnivore: 1, q_fur: 1, q_sound_music: 1, q_four_legs: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'kangaroo', name: 'Kangaroo', category: 'Animals',
    desc: 'An Australian marsupial that bounds on powerful hind legs and carries young in a pouch.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_fur: 1, q_carnivore: 0, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'bat', name: 'Bat', category: 'Animals',
    desc: 'The only mammal capable of sustained flight, navigating night skies with echolocation.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_flight: 1, q_wings: 1, q_fur: 1, q_fits_hand: 1, q_sound_music: 1, q_larger_than_car: 0 }
  },
  {
    id: 'dolphin', name: 'Dolphin', category: 'Animals',
    desc: 'An agile toothed marine mammal known for whistles, clicks, and social pods.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_water: 1, q_ocean_depths: 1, q_carnivore: 1, q_sound_music: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'giant_squid', name: 'Giant Squid', category: 'Animals',
    desc: 'A deep-ocean cephalopod with dinner-plate eyes, eight arms, and two long feeding tentacles.',
    traits: { q_alive: 1, q_animal: 1, q_water: 1, q_ocean_depths: 1, q_carnivore: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'owl', name: 'Barn Owl', category: 'Animals',
    desc: 'A silent-winged nocturnal raptor with directional hearing and a heart-shaped facial disc.',
    traits: { q_alive: 1, q_animal: 1, q_bird: 1, q_flight: 1, q_wings: 1, q_carnivore: 1, q_sound_music: 1, q_fits_hand: 1, q_larger_than_car: 0 }
  },
  {
    id: 'tree_frog', name: 'Red-Eyed Tree Frog', category: 'Animals',
    desc: 'A bright green rainforest amphibian with ruby eyes and suction-cup toe pads.',
    traits: { q_alive: 1, q_animal: 1, q_reptile_amphibian: 1, q_four_legs: 1, q_fits_hand: 1, q_carnivore: 1, q_larger_than_car: 0 }
  },
  {
    id: 'dog', name: 'Domestic Dog', category: 'Animals',
    desc: 'Humanity’s loyal four-legged companion with an extraordinary sense of smell.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_domestic_pet: 1, q_fur: 1, q_four_legs: 1, q_sound_music: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'cat', name: 'Domestic Cat', category: 'Animals',
    desc: 'An agile, purring house feline with retractable claws and low-light vision.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_domestic_pet: 1, q_fits_hand: 1, q_fur: 1, q_four_legs: 1, q_carnivore: 1, q_larger_than_car: 0 }
  },
  {
    id: 'giraffe', name: 'Giraffe', category: 'Animals',
    desc: 'The tallest living land animal, browsing treetops with a spotted coat and long neck.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_larger_than_car: 1, q_stripes_spots: 1, q_four_legs: 1, q_carnivore: 0, q_fits_hand: 0 }
  },
  {
    id: 'hummingbird', name: 'Hummingbird', category: 'Animals',
    desc: 'A tiny iridescent bird that hovers and flies backwards while sipping flower nectar.',
    traits: { q_alive: 1, q_animal: 1, q_bird: 1, q_flight: 1, q_wings: 1, q_fits_hand: 1, q_carnivore: 0, q_larger_than_car: 0 }
  },
  {
    id: 'octopus', name: 'Octopus', category: 'Animals',
    desc: 'An eight-armed marine mollusk with three hearts and instant skin camouflage.',
    traits: { q_alive: 1, q_animal: 1, q_water: 1, q_ocean_depths: 1, q_carnivore: 1, q_fits_hand: 1, q_larger_than_car: 0 }
  },
  {
    id: 'tiger', name: 'Tiger', category: 'Animals',
    desc: 'The largest wild cat species, stalking Asian forests in bold orange fur and black stripes.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_stripes_spots: 1, q_carnivore: 1, q_fur: 1, q_four_legs: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'sea_otter', name: 'Sea Otter', category: 'Animals',
    desc: 'A marine mammal that floats on its back in kelp beds and uses stones to crack shellfish.',
    traits: { q_alive: 1, q_animal: 1, q_mammal: 1, q_water: 1, q_ocean_depths: 1, q_fur: 1, q_carnivore: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'sea_turtle', name: 'Green Sea Turtle', category: 'Animals',
    desc: 'An ocean-gliding marine reptile with a streamlined shell and paddle-like flippers.',
    traits: { q_alive: 1, q_animal: 1, q_reptile_amphibian: 1, q_water: 1, q_ocean_depths: 1, q_carnivore: 0, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'monarch_butterfly', name: 'Monarch Butterfly', category: 'Animals',
    desc: 'An orange-and-black winged insect famous for multi-generation continental migrations.',
    traits: { q_alive: 1, q_animal: 1, q_insect_bug: 1, q_flight: 1, q_wings: 1, q_fits_hand: 1, q_stripes_spots: 1, q_venomous: 0, q_larger_than_car: 0 }
  },

  // ── HISTORICAL FIGURES & THINKERS (19) ──
  {
    id: 'albert_einstein', name: 'Albert Einstein', category: 'Thinkers & Figures',
    desc: 'Theoretical physicist who transformed physics with relativity, spacetime curvature, and E=mc².',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_female: 0 }
  },
  {
    id: 'marie_curie', name: 'Marie Curie', category: 'Thinkers & Figures',
    desc: 'Physicist and chemist who discovered polonium and radium, named radioactivity, and won two Nobel Prizes.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_female: 1 }
  },
  {
    id: 'ada_lovelace', name: 'Ada Lovelace', category: 'Thinkers & Figures',
    desc: 'Mathematician who wrote the first published algorithm intended for Charles Babbage’s Analytical Engine.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_female: 1 }
  },
  {
    id: 'leonardo_da_vinci', name: 'Leonardo da Vinci', category: 'Thinkers & Figures',
    desc: 'Renaissance polymath who painted the Mona Lisa while filling notebooks with engineering and anatomy.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_arts_literature: 1, q_science_thinker: 1, q_female: 0 }
  },
  {
    id: 'isaac_newton', name: 'Sir Isaac Newton', category: 'Thinkers & Figures',
    desc: 'Mathematician and physicist who formulated universal gravitation, the laws of motion, and calculus.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_female: 0 }
  },
  {
    id: 'abraham_lincoln', name: 'Abraham Lincoln', category: 'Thinkers & Figures',
    desc: '16th U.S. President who preserved the Union and issued the Emancipation Proclamation.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_leader: 1, q_female: 0 }
  },
  {
    id: 'william_shakespeare', name: 'William Shakespeare', category: 'Thinkers & Figures',
    desc: 'English playwright and poet whose tragedies, comedies, and sonnets reshaped world literature.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_arts_literature: 1, q_writing_reading: 1, q_female: 0 }
  },
  {
    id: 'amelia_earhart', name: 'Amelia Earhart', category: 'Thinkers & Figures',
    desc: 'Aviation pioneer who became the first woman to fly solo nonstop across the Atlantic Ocean.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_flight: 1, q_female: 1 }
  },
  {
    id: 'george_washington', name: 'George Washington', category: 'Thinkers & Figures',
    desc: 'Commander of the Continental Army and the first President of the United States.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_leader: 1, q_female: 0 }
  },
  {
    id: 'thomas_edison', name: 'Thomas Edison', category: 'Thinkers & Figures',
    desc: 'Inventor and Menlo Park pioneer behind practical incandescent lighting and the phonograph.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_electric: 1, q_female: 0 }
  },
  {
    id: 'claude_shannon', name: 'Claude Shannon', category: 'Thinkers & Figures',
    desc: 'Father of Information Theory at Bell Labs who unified digital switching and defined the bit in 1948.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_electric: 1, q_female: 0 }
  },
  {
    id: 'rosa_parks', name: 'Rosa Parks', category: 'Thinkers & Figures',
    desc: 'Civil rights pioneer whose refusal to give up a bus seat catalyzed the Montgomery Bus Boycott.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_leader: 1, q_female: 1 }
  },
  {
    id: 'galileo_galilei', name: 'Galileo Galilei', category: 'Thinkers & Figures',
    desc: 'Observational astronomy pioneer who spotted Jupiter’s four largest moons through his telescope.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_optical_instrument: 1, q_female: 0 }
  },
  {
    id: 'mozart', name: 'Wolfgang Amadeus Mozart', category: 'Thinkers & Figures',
    desc: 'Classical composer who wrote over 600 symphonies, concertos, and operas.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_arts_literature: 1, q_sound_music: 1, q_female: 0 }
  },
  {
    id: 'alan_turing', name: 'Alan Turing', category: 'Thinkers & Figures',
    desc: 'Mathematician and computing pioneer who formalized the Turing machine and broke Enigma ciphers.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_electric: 1, q_female: 0 }
  },
  {
    id: 'nikola_tesla', name: 'Nikola Tesla', category: 'Thinkers & Figures',
    desc: 'Electrical engineer who championed alternating-current power distribution and induction motors.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_electric: 1, q_female: 0 }
  },
  {
    id: 'charles_darwin', name: 'Charles Darwin', category: 'Thinkers & Figures',
    desc: 'Naturalist who voyaged on HMS Beagle and explained evolution by natural selection.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_female: 0 }
  },
  {
    id: 'katherine_johnson', name: 'Katherine Johnson', category: 'Thinkers & Figures',
    desc: 'NASA mathematician whose orbital calculations guided Mercury, Apollo 11, and Space Shuttle flights.',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_science_thinker: 1, q_spacecraft: 1, q_female: 1 }
  },
  {
    id: 'martin_luther_king', name: 'Dr. Martin Luther King Jr.', category: 'Thinkers & Figures',
    desc: 'Civil rights leader and Nobel Peace Prize laureate famous for nonviolent marches and "I Have a Dream."',
    traits: { q_alive: 1, q_human: 1, q_historical: 1, q_leader: 1, q_female: 0 }
  },

  // ── TECH & INVENTIONS (16) ──
  {
    id: 'microscope', name: 'Microscope', category: 'Tech & Inventions',
    desc: 'An optical lab instrument magnifying cells and microbes invisible to the naked eye.',
    traits: { q_alive: 0, q_invention: 1, q_optical_instrument: 1, q_school_lab: 1, q_metal: 1, q_fits_hand: 1, q_larger_than_car: 0 }
  },
  {
    id: 'telescope', name: 'Astronomical Telescope', category: 'Tech & Inventions',
    desc: 'An optical tube gathering distant starlight from moons, nebulae, and galaxies.',
    traits: { q_alive: 0, q_invention: 1, q_optical_instrument: 1, q_school_lab: 1, q_metal: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'smartphone', name: 'Smartphone', category: 'Tech & Inventions',
    desc: 'A pocket touchscreen computer combining cellular calls, cameras, sensors, and apps.',
    traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_screen_digital: 1, q_fits_hand: 1, q_sound_music: 1, q_metal: 1, q_larger_than_car: 0 }
  },
  {
    id: 'laptop_computer', name: 'Laptop Computer', category: 'Tech & Inventions',
    desc: 'A portable clamshell computer with a physical keyboard, processor, and display.',
    traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_screen_digital: 1, q_school_lab: 1, q_fits_hand: 1, q_metal: 1, q_larger_than_car: 0 }
  },
  {
    id: 'space_rocket', name: 'Space Rocket', category: 'Tech & Inventions',
    desc: 'A multistage launch vehicle burning propellants to carry satellites or crews past Earth’s gravity.',
    traits: { q_alive: 0, q_invention: 1, q_vehicle: 1, q_spacecraft: 1, q_larger_than_car: 1, q_extreme_heat_fire: 1, q_metal: 1, q_fits_hand: 0 }
  },
  {
    id: 'submarine', name: 'Submarine', category: 'Tech & Inventions',
    desc: 'A watertight submersible vessel engineered to travel beneath deep ocean waves.',
    traits: { q_alive: 0, q_invention: 1, q_vehicle: 1, q_water: 1, q_ocean_depths: 1, q_larger_than_car: 1, q_metal: 1, q_fits_hand: 0 }
  },
  {
    id: 'airplane', name: 'Jet Airplane', category: 'Tech & Inventions',
    desc: 'A fixed-wing aircraft using aerodynamic lift and jet engines for global flight.',
    traits: { q_alive: 0, q_invention: 1, q_vehicle: 1, q_flight: 1, q_wings: 1, q_wheels: 1, q_larger_than_car: 1, q_metal: 1, q_fits_hand: 0 }
  },
  {
    id: 'bicycle', name: 'Bicycle', category: 'Tech & Inventions',
    desc: 'A human-powered two-wheeled machine driven by pedals, gears, and chain.',
    traits: { q_alive: 0, q_invention: 1, q_vehicle: 1, q_wheels: 1, q_sports_play: 1, q_metal: 1, q_electric: 0, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'three_d_printer', name: '3D Printer', category: 'Tech & Inventions',
    desc: 'A digital fabrication machine that melts filament to extrude solid parts layer by layer.',
    traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_school_lab: 1, q_extreme_heat_fire: 1, q_metal: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'magnetic_compass', name: 'Magnetic Compass', category: 'Tech & Inventions',
    desc: 'A pocket navigation instrument whose magnetized needle aligns with Earth’s magnetic poles.',
    traits: { q_alive: 0, q_invention: 1, q_fits_hand: 1, q_school_lab: 1, q_metal: 1, q_electric: 0, q_larger_than_car: 0 }
  },
  {
    id: 'lightbulb', name: 'Electric Lightbulb', category: 'Tech & Inventions',
    desc: 'An electric emitter turning current into visible light via a glowing filament or LED.',
    traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_fits_hand: 1, q_extreme_heat_fire: 1, q_larger_than_car: 0 }
  },
  {
    id: 'robot_car', name: 'Autonomous Rover / Robot', category: 'Tech & Inventions',
    desc: 'A sensor-guided wheeled machine that navigates and reacts through microcontroller code.',
    traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_wheels: 1, q_school_lab: 1, q_metal: 1, q_fits_hand: 1, q_larger_than_car: 0 }
  },
  {
    id: 'solar_panel', name: 'Solar Panel', category: 'Tech & Inventions',
    desc: 'A photovoltaic array that converts sunlight directly into electrical energy.',
    traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_metal: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'battery', name: 'Lithium Battery', category: 'Tech & Inventions',
    desc: 'A rechargeable electrochemical cell storing electrical energy for portable electronics.',
    traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_fits_hand: 1, q_metal: 1, q_larger_than_car: 0 }
  },
  {
    id: 'international_space_station', name: 'International Space Station', category: 'Tech & Inventions',
    desc: 'A modular orbital laboratory flying around Earth where international crews live and conduct experiments.',
    traits: { q_alive: 0, q_invention: 1, q_spacecraft: 1, q_electric: 1, q_larger_than_car: 1, q_metal: 1, q_fits_hand: 0 }
  },
  {
    id: 'printing_press', name: 'Printing Press', category: 'Tech & Inventions',
    desc: 'Movable-type mechanical press that transformed literacy by mass-producing printed pages.',
    traits: { q_alive: 0, q_invention: 1, q_writing_reading: 1, q_metal: 1, q_electric: 0, q_fits_hand: 0, q_larger_than_car: 0 }
  },

  // ── COSMOS & EARTH (10) ──
  {
    id: 'the_sun', name: 'The Sun', category: 'Cosmos & Earth',
    desc: 'The yellow dwarf star at the center of our solar system fusing hydrogen into blinding light.',
    traits: { q_alive: 0, q_space_object: 1, q_star_light: 1, q_extreme_heat_fire: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'the_moon', name: 'The Moon', category: 'Cosmos & Earth',
    desc: 'Earth’s cratered natural satellite driving ocean tides and waxing through monthly phases.',
    traits: { q_alive: 0, q_space_object: 1, q_planet_moon: 1, q_larger_than_car: 1, q_star_light: 0, q_fits_hand: 0 }
  },
  {
    id: 'planet_saturn', name: 'Planet Saturn', category: 'Cosmos & Earth',
    desc: 'The gas giant planet encircled by shimmering rings of ice and rock.',
    traits: { q_alive: 0, q_space_object: 1, q_planet_moon: 1, q_larger_than_car: 1, q_ice_cold: 1, q_star_light: 0, q_fits_hand: 0 }
  },
  {
    id: 'black_hole', name: 'Supermassive Black Hole', category: 'Cosmos & Earth',
    desc: 'A collapsed gravitational singularity whose event horizon traps even photons of light.',
    traits: { q_alive: 0, q_space_object: 1, q_larger_than_car: 1, q_star_light: 0, q_planet_moon: 0, q_fits_hand: 0 }
  },
  {
    id: 'volcano', name: 'Active Volcano', category: 'Cosmos & Earth',
    desc: 'A crustal vent erupting molten magma, incandescent lava, and billowing ash clouds.',
    traits: { q_alive: 0, q_geological_wonder: 1, q_extreme_heat_fire: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'mount_everest', name: 'Mount Everest', category: 'Cosmos & Earth',
    desc: 'Earth’s tallest mountain peak above sea level, rising frozen above the Himalayas.',
    traits: { q_alive: 0, q_geological_wonder: 1, q_ice_cold: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'aurora_borealis', name: 'Aurora Borealis (Northern Lights)', category: 'Cosmos & Earth',
    desc: 'Ribbons of green and violet light across polar night skies sparked by solar wind.',
    traits: { q_alive: 0, q_geological_wonder: 1, q_ice_cold: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'grand_canyon', name: 'Grand Canyon', category: 'Cosmos & Earth',
    desc: 'A mile-deep stratified gorge carved across millions of years by the Colorado River.',
    traits: { q_alive: 0, q_geological_wonder: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'thunderstorm', name: 'Thunderstorm with Lightning', category: 'Cosmos & Earth',
    desc: 'A towering atmospheric storm unleashing rain, thunderclaps, and high-voltage lightning.',
    traits: { q_alive: 0, q_geological_wonder: 1, q_extreme_heat_fire: 1, q_sound_music: 1, q_water: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'glacier', name: 'Glacier', category: 'Cosmos & Earth',
    desc: 'A colossal slow-moving river of compacted blue ice carving mountain valleys.',
    traits: { q_alive: 0, q_geological_wonder: 1, q_ice_cold: 1, q_water: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },

  // ── MONUMENTS & PLACES (7) ──
  {
    id: 'great_pyramids', name: 'Great Pyramids of Giza', category: 'Monuments & Places',
    desc: 'Ancient Egyptian limestone tombs aligned with true north over 4,500 years ago.',
    traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_ancient_times: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'eiffel_tower', name: 'Eiffel Tower', category: 'Monuments & Places',
    desc: 'Gustave Eiffel’s 1,000-foot wrought-iron lattice landmark overlooking Paris.',
    traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_metal: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'statue_of_liberty', name: 'Statue of Liberty', category: 'Monuments & Places',
    desc: 'Colossal copper-clad statue raising a gilded torch above New York Harbor.',
    traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_metal: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'colosseum', name: 'Roman Colosseum', category: 'Monuments & Places',
    desc: 'Ancient stone-and-concrete amphitheater in Rome built for 50,000 spectators.',
    traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_ancient_times: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'great_wall_of_china', name: 'Great Wall of China', category: 'Monuments & Places',
    desc: 'Thousands of miles of stone and brick fortifications winding across northern mountain ridges.',
    traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_ancient_times: 1, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'taj_mahal', name: 'Taj Mahal', category: 'Monuments & Places',
    desc: 'An ivory-white marble mausoleum and reflecting pool built along the Yamuna River in India.',
    traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_ancient_times: 0, q_metal: 0, q_larger_than_car: 1, q_fits_hand: 0 }
  },
  {
    id: 'machu_picchu', name: 'Machu Picchu', category: 'Monuments & Places',
    desc: 'A 15th-century dry-stone Inca citadel perched high on an Andean ridge in Peru.',
    traits: { q_alive: 0, q_invention: 1, q_landmark_monument: 1, q_ancient_times: 0, q_metal: 0, q_larger_than_car: 1, q_fits_hand: 0 }
  },

  // ── EVERYDAY OBJECTS (10) ──
  {
    id: 'acoustic_guitar', name: 'Acoustic Guitar', category: 'Everyday Objects',
    desc: 'A hollow wooden six-string instrument that projects music from its soundbox.',
    traits: { q_alive: 0, q_invention: 1, q_music_instrument: 1, q_string_instrument: 1, q_sound_music: 1, q_paper_wood: 1, q_fits_hand: 1, q_larger_than_car: 0 }
  },
  {
    id: 'grand_piano', name: 'Grand Piano', category: 'Everyday Objects',
    desc: 'An 88-key percussion-string instrument where felt hammers strike tuned steel wires.',
    traits: { q_alive: 0, q_invention: 1, q_music_instrument: 1, q_string_instrument: 1, q_sound_music: 1, q_black_white: 1, q_paper_wood: 1, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'book', name: 'Paper Book', category: 'Everyday Objects',
    desc: 'Bound printed pages preserving stories, science, and poetry.',
    traits: { q_alive: 0, q_invention: 1, q_writing_reading: 1, q_paper_wood: 1, q_fits_hand: 1, q_school_lab: 1, q_electric: 0, q_larger_than_car: 0 }
  },
  {
    id: 'pencil', name: 'Wooden Pencil', category: 'Everyday Objects',
    desc: 'A graphite core encased in cedar wood used to write, sketch, and erase.',
    traits: { q_alive: 0, q_invention: 1, q_writing_reading: 1, q_paper_wood: 1, q_fits_hand: 1, q_school_lab: 1, q_electric: 0, q_larger_than_car: 0 }
  },
  {
    id: 'scissors', name: 'Scissors', category: 'Everyday Objects',
    desc: 'A hand-held shearing tool with two pivoted steel blades for cutting paper or cloth.',
    traits: { q_alive: 0, q_invention: 1, q_sharp_edge: 1, q_metal: 1, q_fits_hand: 1, q_school_lab: 1, q_electric: 0, q_larger_than_car: 0 }
  },
  {
    id: 'umbrella', name: 'Umbrella', category: 'Everyday Objects',
    desc: 'A folding fabric canopy supported by metal ribs to shield people from rain.',
    traits: { q_alive: 0, q_invention: 1, q_water: 1, q_fits_hand: 1, q_metal: 1, q_electric: 0, q_larger_than_car: 0 }
  },
  {
    id: 'skateboard', name: 'Skateboard', category: 'Everyday Objects',
    desc: 'A curved maple deck mounted on four urethane wheels for cruising and tricks.',
    traits: { q_alive: 0, q_invention: 1, q_wheels: 1, q_sports_play: 1, q_paper_wood: 1, q_fits_hand: 1, q_electric: 0, q_larger_than_car: 0 }
  },
  {
    id: 'soccer_ball', name: 'Soccer Ball', category: 'Everyday Objects',
    desc: 'An inflated paneled sphere kicked across pitches in the world’s most popular sport.',
    traits: { q_alive: 0, q_invention: 1, q_sports_play: 1, q_black_white: 1, q_fits_hand: 1, q_electric: 0, q_larger_than_car: 0 }
  },
  {
    id: 'wristwatch', name: 'Wristwatch', category: 'Everyday Objects',
    desc: 'A strap-on timekeeper worn on the wrist, powered by quartz crystal or fine gears.',
    traits: { q_alive: 0, q_invention: 1, q_electric: 1, q_fits_hand: 1, q_metal: 1, q_larger_than_car: 0 }
  },
  {
    id: 'backpack', name: 'School Backpack', category: 'Everyday Objects',
    desc: 'A zippered two-strap bag students use to carry notebooks, pencils, and laptops.',
    traits: { q_alive: 0, q_invention: 1, q_school_lab: 1, q_fits_hand: 1, q_electric: 0, q_larger_than_car: 0 }
  },

  // ── PLANTS & FOOD (8) ──
  {
    id: 'apple', name: 'Red Apple', category: 'Plants & Food',
    desc: 'A crisp, sweet orchard fruit famously linked to Isaac Newton’s story of gravity.',
    traits: { q_alive: 1, q_plant_flora: 1, q_edible: 1, q_fits_hand: 1, q_larger_than_car: 0 }
  },
  {
    id: 'pizza', name: 'Pizza', category: 'Plants & Food',
    desc: 'An oven-baked flatbread topped with tomato sauce and melted mozzarella.',
    traits: { q_alive: 0, q_invention: 1, q_edible: 1, q_fits_hand: 1, q_extreme_heat_fire: 1, q_larger_than_car: 0 }
  },
  {
    id: 'giant_sequoia', name: 'Giant Redwood / Sequoia Tree', category: 'Plants & Food',
    desc: 'Ancient California conifers ranking among the most massive living organisms on Earth.',
    traits: { q_alive: 1, q_plant_flora: 1, q_larger_than_car: 1, q_paper_wood: 1, q_edible: 0, q_fits_hand: 0 }
  },
  {
    id: 'saguaro_cactus', name: 'Saguaro Cactus', category: 'Plants & Food',
    desc: 'A tall branching desert cactus storing rainwater behind protective spines.',
    traits: { q_alive: 1, q_plant_flora: 1, q_extreme_heat_fire: 1, q_edible: 0, q_fits_hand: 0, q_larger_than_car: 0 }
  },
  {
    id: 'sunflower', name: 'Sunflower', category: 'Plants & Food',
    desc: 'A tall garden bloom with golden petals surrounding a spiral seed head.',
    traits: { q_alive: 1, q_plant_flora: 1, q_edible: 0, q_fits_hand: 1, q_larger_than_car: 0 }
  },
  {
    id: 'chocolate', name: 'Chocolate Bar', category: 'Plants & Food',
    desc: 'A sweet confection crafted from roasted cacao beans and sugar.',
    traits: { q_alive: 0, q_invention: 1, q_edible: 1, q_fits_hand: 1, q_extreme_heat_fire: 0, q_larger_than_car: 0 }
  },
  {
    id: 'banana', name: 'Banana', category: 'Plants & Food',
    desc: 'A curved tropical fruit encased in a peelable bright-yellow skin.',
    traits: { q_alive: 1, q_plant_flora: 1, q_edible: 1, q_fits_hand: 1, q_larger_than_car: 0 }
  },
  {
    id: 'mushroom', name: 'Edible Mushroom', category: 'Plants & Food',
    desc: 'A spore-bearing umbrella-capped fungus found in damp forests and kitchens.',
    traits: { q_alive: 1, q_plant_flora: 1, q_edible: 1, q_fits_hand: 1, q_larger_than_car: 0 }
  }
];

// Fictional Characters (20) — kept disjoint from real organisms/inventions so top-level splits are unambiguous
const CHARACTER_ROWS = [
  ['harry_potter', 'Harry Potter', 'A young wizard with round glasses and a lightning-bolt scar.', 'magic glasses school'],
  ['hermione', 'Hermione Granger', 'A resourceful Hogwarts witch and top spell researcher.', 'magic school female'],
  ['gandalf', 'Gandalf', 'The gray-robed wizard who guides the Fellowship of the Ring.', 'magic beard'],
  ['frodo', 'Frodo Baggins', 'A Shire hobbit entrusted with carrying the One Ring to Mount Doom.', 'ring'],
  ['sherlock', 'Sherlock Holmes', 'A Baker Street consulting detective famous for deductive logic.', 'detective'],
  ['superman', 'Superman', 'A flying superhero from Krypton who wears a red cape.', 'hero flight cape alien'],
  ['batman', 'Batman', 'Gotham City’s masked detective and caped vigilante.', 'hero cape detective'],
  ['spider_man', 'Spider-Man', 'A wall-crawling superhero who swings across cities on webs.', 'hero webs'],
  ['wonder_woman', 'Wonder Woman', 'An Amazon warrior superhero wielding the Lasso of Truth.', 'hero female'],
  ['darth_vader', 'Darth Vader', 'A black-masked Star Wars villain wielding a red lightsaber.', 'space mask sword'],
  ['yoda', 'Yoda', 'A small green Jedi Master from Star Wars who teaches with inverted syntax.', 'space alien sword green'],
  ['luke_skywalker', 'Luke Skywalker', 'A farmboy turned Jedi hero in the Star Wars galaxy.', 'space sword hero'],
  ['mario', 'Mario', 'A red-capped video-game plumber exploring the Mushroom Kingdom.', 'game mustache hero'],
  ['luigi', 'Luigi', 'Mario’s green-clad brother known for leaping higher and exploring haunted mansions.', 'game mustache green'],
  ['sonic', 'Sonic the Hedgehog', 'A cobalt-blue video-game hedgehog blessed with supersonic speed.', 'game animal speed hero'],
  ['pikachu', 'Pikachu', 'A yellow Pokémon mascot famous for crackling electric attacks.', 'game animal electric'],
  ['elsa', 'Elsa', 'The snow queen of Arendelle with magical powers over ice and frost.', 'magic female ice'],
  ['woody', 'Woody', 'A loyal pull-string cowboy doll from Toy Story.', 'toy cowboy'],
  ['buzz', 'Buzz Lightyear', 'A spring-winged space-ranger action figure from Toy Story.', 'toy space'],
  ['sponge_bob', 'SpongeBob SquarePants', 'A cheerful yellow sea sponge who flips Krabby Patties underwater.', 'water animal']
];

const CHARACTER_FEATURES = {
  magic: 'Does this character cast magic spells or powers?',
  glasses: 'Does this character famously wear glasses?',
  school: 'Does this character attend Hogwarts?',
  female: 'Is this character female?',
  beard: 'Does this character have a long wizard beard?',
  ring: 'Is this character on a quest to destroy a powerful ring?',
  detective: 'Is this character famous for detective work and solving mysteries?',
  hero: 'Is this character a superhero or main savior hero?',
  flight: 'Can this character fly without an airplane or broomstick?',
  cape: 'Does this character famously wear a cape?',
  alien: 'Is this character originally from another planet?',
  webs: 'Does this character shoot spider webs?',
  space: 'Is this character famous for outer-space stories?',
  mask: 'Does this character wear a full-face helmet or mask?',
  sword: 'Does this character fight with a lightsaber?',
  green: 'Is this character green-skinned or famously dressed in green?',
  game: 'Did this character originate as a video-game star?',
  mustache: 'Does this character have a prominent mustache?',
  animal: 'Is this character an animal or cartoon creature rather than a human?',
  speed: 'Is this character famous for supersonic running speed?',
  electric: 'Does this character generate electric lightning attacks?',
  ice: 'Does this character command ice and snow?',
  toy: 'Is this character a toy that comes to life when humans leave?',
  cowboy: 'Does this character dress as a Wild West cowboy?',
  water: 'Does this character live underwater?'
};

// Specific follow-up questions separating similar items cleanly
const FOLLOW_UPS = [
  ['underwater_vehicle', 'Is it a vessel built to travel deep underwater?', 'submarine'],
  ['jet_passengers', 'Is it a winged passenger aircraft powered by jet engines?', 'airplane'],
  ['storage_power', 'Is its main purpose storing electrical energy inside a portable cell?', 'battery'],
  ['sky_glow', 'Is it a glowing curtain of colored light in the polar night sky?', 'aurora_borealis'],
  ['river_canyon', 'Is it a mile-deep rocky canyon carved by a river?', 'grand_canyon'],
  ['lava_mountain', 'Is it a mountain vent that erupts molten lava and ash?', 'volcano'],
  ['tallest_peak', 'Is it the tallest mountain peak above sea level on Earth?', 'mount_everest'],
  ['lightning_cloud', 'Is it a storm system producing rain, thunder, and lightning?', 'thunderstorm'],
  ['ice_river', 'Is it a massive slow-moving river of compacted ice?', 'glacier'],
  ['torch_statue', 'Is it a copper harbor statue holding a torch?', 'statue_of_liberty'],
  ['paris_tower', 'Is it a famous wrought-iron lattice tower in Paris?', 'eiffel_tower'],
  ['pyramid_tomb', 'Is it an ancient triangular stone pyramid tomb in Egypt?', 'great_pyramids'],
  ['arena', 'Was it built as an ancient Roman arena?', 'colosseum'],
  ['long_wall', 'Is it an ancient defensive wall stretching across China?', 'great_wall_of_china'],
  ['marble_mausoleum', 'Is it a white marble mausoleum in India?', 'taj_mahal'],
  ['inca_citadel', 'Is it an Inca stone citadel high in the Andes Mountains?', 'machu_picchu'],
  ['bound_pages', 'Does it have bound paper pages that you turn to read?', 'book'],
  ['graphite', 'Does it write with a graphite core encased in wood?', 'pencil'],
  ['carry_bag', 'Is it a two-strap bag worn on your back?', 'backpack'],
  ['kick_ball', 'Is it an inflated ball kicked with your feet on a field?', 'soccer_ball'],
  ['mane', 'Is it famous for a golden mane around its head?', 'lion'],
  ['stripes_tiger', 'Does it have dark vertical stripes on orange fur?', 'tiger'],
  ['fastest_land', 'Is it the fastest land mammal on Earth?', 'cheetah'],
  ['canine', 'Is it a canine (dog or wolf)?', 'dog wolf'],
  ['pouch', 'Does it carry its joey inside a front pouch?', 'kangaroo'],
  ['trunk', 'Does it have a long prehensile trunk and tusks?', 'elephant'],
  ['baleen_largest', 'Is it a filter-feeding baleen whale and the largest animal ever?', 'blue_whale'],
  ['camo_octopus', 'Does it have eight arms (no extra tentacles) and squeeze into reef crevices?', 'octopus'],
  ['tentacles', 'Is it a bus-sized deep-sea squid with two extra long tentacles?', 'giant_squid'],
  ['duck_bill', 'Does it lay eggs and have a duck-like bill despite being a mammal?', 'platypus'],
  ['kelp_belly', 'Does it float on its back in kelp forests and crack shells on its belly?', 'sea_otter'],
  ['turtle_shell', 'Does it swim with flippers and carry a hard protective shell?', 'sea_turtle'],
  ['color_change', 'Is it famous for changing skin color to match or signal?', 'chameleon'],
  ['nocturnal_owl', 'Is it a nocturnal bird of prey known for silent flight?', 'owl'],
  ['white_head_eagle', 'Does this national bird have a bright white head and yellow beak?', 'bald_eagle'],
  ['bamboo', 'Is bamboo almost its entire diet?', 'giant_panda'],
  ['long_neck', 'Is it famous for an extraordinarily long neck?', 'giraffe'],
  ['hive_honey', 'Does it live in hives and make sweet honey?', 'honeybee'],
  ['relativity', 'Did this physicist publish the theory of relativity and E=mc²?', 'albert_einstein'],
  ['calculus_laws', 'Did this scientist formulate universal gravitation and the three laws of motion?', 'isaac_newton'],
  ['radioactivity', 'Did this scientist pioneer research into radioactivity and win two Nobel Prizes?', 'marie_curie'],
  ['computing', 'Is this person famous for computing, algorithms, codebreaking, or orbital math?', 'ada_lovelace alan_turing claude_shannon katherine_johnson'],
  ['first_programmer', 'Did this 19th-century mathematician write the first algorithm for Babbage’s Engine?', 'ada_lovelace'],
  ['bits', 'Did this Bell Labs scientist define the bit and Information Theory in 1948?', 'claude_shannon'],
  ['codebreaking', 'Did this mathematician lead Enigma codebreaking and formalize the Turing machine?', 'alan_turing'],
  ['nasa_orbits', 'Did this NASA mathematician calculate orbital trajectories for Mercury and Apollo?', 'katherine_johnson'],
  ['electricity', 'Is this inventor famous for pioneering electrical power systems or lighting?', 'nikola_tesla thomas_edison'],
  ['ac', 'Did this engineer champion alternating-current (AC) power?', 'nikola_tesla'],
  ['evolution', 'Did this naturalist formulate the theory of evolution by natural selection?', 'charles_darwin'],
  ['renaissance_art', 'Did this Renaissance polymath paint the Mona Lisa and sketch flying machines?', 'leonardo_da_vinci'],
  ['plays', 'Is this writer famous for plays like Hamlet and Romeo and Juliet?', 'william_shakespeare'],
  ['composer', 'Is this Austrian composer famous for over 600 classical works?', 'mozart'],
  ['president', 'Was this leader a President of the United States?', 'abraham_lincoln george_washington'],
  ['first_president', 'Was this leader the very first President of the United States?', 'george_washington'],
  ['bus', 'Is this civil rights hero remembered for refusing to surrender a Montgomery bus seat?', 'rosa_parks'],
  ['dream_speech', 'Did this leader deliver the "I Have a Dream" speech in 1963?', 'martin_luther_king'],
  ['pilot', 'Did this aviator fly solo across the Atlantic Ocean?', 'amelia_earhart'],
  ['jupiter', 'Did this astronomer first spot Jupiter’s moons through a telescope?', 'galileo_galilei'],
  ['tiny', 'Does it magnify tiny cells and microbes too small for the eye?', 'microscope'],
  ['distant_sky', 'Is it aimed at the night sky to observe distant stars and planets?', 'telescope'],
  ['pocket_phone', 'Does it fit in a pocket to make cellular calls and run touchscreen apps?', 'smartphone'],
  ['keyboard', 'Does it feature a full physical keyboard for typing?', 'laptop_computer grand_piano'],
  ['three_d_print', 'Does it build 3D plastic models layer by layer from a digital file?', 'three_d_printer'],
  ['compass_north', 'Does its magnetized needle always point toward magnetic North?', 'magnetic_compass'],
  ['light_room', 'Is its sole job to light up a dark room when switched on?', 'lightbulb'],
  ['auto_rover', 'Is it a programmable wheeled robot guided by sensors?', 'robot_car'],
  ['solar', 'Does it convert sunlight directly into electrical power?', 'solar_panel'],
  ['space_station', 'Do astronauts live aboard it while orbiting Earth?', 'international_space_station'],
  ['printing_press', 'Did this movable-type invention revolutionize printing books?', 'printing_press'],
  ['time', 'Do you wear it on your wrist to tell the time?', 'wristwatch'],
  ['rain', 'Do you hold it overhead to stay dry in the rain?', 'umbrella'],
  ['rings', 'Is it a gas giant planet famous for bright icy rings?', 'planet_saturn'],
  ['gravity_hole', 'Is it a dense cosmic region where gravity traps even light?', 'black_hole'],
  ['cocoa', 'Is it a sweet bar made from roasted cacao beans?', 'chocolate'],
  ['baked_cheese', 'Is it a baked savory dish with crust, tomato sauce, and melted cheese?', 'pizza'],
  ['red_apple', 'Is it a crisp orchard fruit often associated with Isaac Newton?', 'apple'],
  ['yellow_banana', 'Is it a curved yellow fruit that you peel?', 'banana'],
  ['fungus_cap', 'Is it an umbrella-capped fungus rather than a green plant?', 'mushroom'],
  ['petals', 'Does it bloom with large golden petals around a spiral seed head?', 'sunflower'],
  ['spines', 'Is it a tall branching desert cactus covered in spines?', 'saguaro_cactus']
];

const ALL_REAL_QUESTION_IDS = QUESTIONS.map(q => q.id);

// Assemble clean, complete CORE_ENTITIES with zero unintended 0.5 defaults
const assembledEntities = RAW_NON_CHARACTERS.map(raw => {
  const traits = Object.fromEntries(ALL_REAL_QUESTION_IDS.map(id => [id, 0]));
  Object.assign(traits, raw.traits);
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category,
    desc: raw.desc,
    traits
  };
});

// Add q_character_* questions cleanly
Object.entries(CHARACTER_FEATURES).forEach(([feat, text]) => {
  const qId = `q_character_${feat}`;
  QUESTIONS.push({ id: qId, text, category: 'characters' });
  assembledEntities.forEach(e => { e.traits[qId] = 0; });
});

// Add Fictional Characters with complete crisp 0/1 traits across ALL questions
CHARACTER_ROWS.forEach(([id, name, desc, features]) => {
  const tags = new Set(features.split(' '));
  const traits = Object.fromEntries(ALL_REAL_QUESTION_IDS.map(qId => [qId, 0]));
  traits.q_fictional = 1;
  Object.keys(CHARACTER_FEATURES).forEach(feat => {
    traits[`q_character_${feat}`] = tags.has(feat) ? 1 : 0;
  });
  assembledEntities.push({
    id,
    name,
    desc,
    category: 'Fictional Characters',
    traits
  });
});

// Add FOLLOW_UPS cleanly across ALL entities (real + fictional)
FOLLOW_UPS.forEach(([id, text, members]) => {
  const qId = `q_detail_${id}`;
  QUESTIONS.push({ id: qId, text, category: 'detail' });
  const yesSet = new Set(members.split(' '));
  assembledEntities.forEach(e => {
    e.traits[qId] = yesSet.has(e.id) ? 1 : 0;
  });
});

export const CORE_ENTITIES = assembledEntities;

const CATEGORY_MIGRATION = {
  Thinkers: 'Thinkers & Figures',
  Characters: 'Fictional Characters',
  Technology: 'Tech & Inventions',
  'Science Tools': 'Tech & Inventions',
  Cosmos: 'Cosmos & Earth',
  Geology: 'Cosmos & Earth',
  Monuments: 'Monuments & Places',
  Objects: 'Everyday Objects',
  'Food & Plants': 'Plants & Food',
  Places: 'Monuments & Places',
  Everyday: 'Everyday Objects',
  Nature: 'Animals'
};

export function normalizeCategory(category) {
  if (CATEGORY_ICON_MAP[category]) return category;
  return CATEGORY_MIGRATION[category] || 'Everyday Objects';
}

// ═══════════════════════════════════════════════════════════════════════════
// PURE INFORMATION THEORY & LLM MATH HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function binaryEntropy(p) {
  const clamped = Number(p);
  if (!Number.isFinite(clamped) || clamped <= 0 || clamped >= 1) return 0;
  return -(clamped * Math.log2(clamped) + (1 - clamped) * Math.log2(1 - clamped));
}

export function distributionEntropy(probs) {
  let h = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (p > 1e-12) h -= p * Math.log2(p);
  }
  return Math.max(0, h);
}

export function softmaxWithTemperature(logits, temperature = 1.0) {
  if (!logits || logits.length === 0) return [];
  const temp = Math.max(0.05, Number(temperature) || 1.0);
  let maxScaled = -Infinity;
  const scaled = new Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    const val = logits[i] / temp;
    scaled[i] = val;
    if (val > maxScaled) maxScaled = val;
  }
  const exps = new Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    const v = Math.exp(scaled[i] - maxScaled);
    exps[i] = v;
    sum += v;
  }
  if (sum <= 0) return logits.map(() => 1 / logits.length);
  return exps.map(v => v / sum);
}

export function crossEntropy(targetIndex, probs) {
  const p = Math.max(1e-12, Math.min(1, probs?.[targetIndex] ?? 1e-12));
  return -Math.log2(p);
}

export function perplexity(entropyBits) {
  return Math.pow(2, Math.max(0, Number(entropyBits) || 0));
}

export const LLM_PROMPTS = [
  {
    id: 'shannon',
    prompt: 'Claude Shannon published his 1948 paper on information …',
    tokens: ['theory', 'systems', 'bits', 'entropy', 'music'],
    targetIndex: 0,
    models: {
      trained: { label: 'Well-trained LLM', logits: [4.2, 1.6, 1.2, 0.9, -0.5] },
      uncertain: { label: 'Early untrained model', logits: [1.3, 1.15, 1.05, 0.95, 0.7] },
      overconfident_wrong: { label: 'Overconfident wrong guess', logits: [0.4, 4.3, 0.8, 0.6, 0.1] }
    }
  },
  {
    id: 'million',
    prompt: 'Twenty balanced yes/no clues can pinpoint one item in a …',
    tokens: ['million', 'thousand', 'hundred', 'billion', 'century'],
    targetIndex: 0,
    models: {
      trained: { label: 'Well-trained LLM', logits: [4.1, 2.0, 0.9, 0.7, -0.8] },
      uncertain: { label: 'Early untrained model', logits: [1.4, 1.3, 1.1, 1.0, 0.4] },
      overconfident_wrong: { label: 'Overconfident wrong guess', logits: [0.2, 4.4, 1.0, 0.5, -0.2] }
    }
  },
  {
    id: 'bit',
    prompt: 'Splitting equally likely outcomes in half reveals one …',
    tokens: ['bit', 'step', 'byte', 'answer', 'branch'],
    targetIndex: 0,
    models: {
      trained: { label: 'Well-trained LLM', logits: [4.3, 1.5, 1.4, 1.0, 0.2] },
      uncertain: { label: 'Early untrained model', logits: [1.25, 1.1, 1.0, 0.95, 0.85] },
      overconfident_wrong: { label: 'Overconfident wrong guess', logits: [0.3, 1.0, 4.2, 0.6, 0.1] }
    }
  }
];

function createDefaultStorage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch { /* Private browsing / unavailable */ }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// INFORMATION THEORY & BAYESIAN ENGINE (TAB 1)
// ═══════════════════════════════════════════════════════════════════════════

export class InformationTheoryEngine {
  constructor(options = {}) {
    this.customEntitiesKey = 'twenty_questions_custom_knowledge_v1';
    this.storage = options.storage !== undefined ? options.storage : createDefaultStorage();
    this.reset();
  }

  loadEntities() {
    const entities = CORE_ENTITIES.map(e => ({ ...e, traits: { ...e.traits } }));
    try {
      const stored = this.storage?.getItem(this.customEntitiesKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            if (p && typeof p.name === 'string' && p.traits && typeof p.traits === 'object' && !entities.some(e => e.id === p.id)) {
              entities.push({
                ...p,
                category: normalizeCategory(p.category),
                isCustom: true,
                traits: { ...p.traits }
              });
            }
          });
        }
      }
    } catch { /* Storage read blocked or invalid JSON */ }
    return entities;
  }

  getCustomEntities() {
    return this.entities.filter(e => Boolean(e.isCustom) || String(e.id).startsWith('custom_'));
  }

  reset() {
    this.entities = this.loadEntities();
    this.questions = QUESTIONS.map(q => ({ ...q }));
    this.rejectedIds = new Set();
    this.lastRejectedGuess = null;
    this.questionCache = null;

    try {
      const learned = JSON.parse(this.storage?.getItem(`${this.customEntitiesKey}_questions`) || '[]');
      if (Array.isArray(learned)) {
        learned.forEach(q => {
          if (q && typeof q.id === 'string' && typeof q.text === 'string' && !this.questions.some(x => x.id === q.id)) {
            this.questions.push({ ...q });
          }
        });
      }
      const corrections = JSON.parse(this.storage?.getItem(`${this.customEntitiesKey}_corrections`) || '{}');
      if (corrections && typeof corrections === 'object') {
        this.entities.forEach(e => {
          if (corrections[e.id] && typeof corrections[e.id] === 'object') {
            Object.assign(e.traits, corrections[e.id]);
          }
        });
      }
    } catch { /* Storage unavailable */ }

    this.questionCount = 0;
    this.maxQuestions = 20;
    this.askedQuestions = [];
    this.undoStack = [];

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
    return distributionEntropy(probs);
  }

  getEntityTraitProb(entity, questionId) {
    if (entity.traits && entity.traits[questionId] !== undefined) {
      const value = entity.traits[questionId];
      return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.min(1, value))
        : 0.5;
    }
    return 0.5;
  }

  /**
   * Single-pass zero-allocation Information Gain evaluator:
   * H(X | A) = log2(S_A) - (1 / S_A) * sum(w_i * log2(w_i))
   */
  evaluateQuestionInformationGain(qId) {
    const n = this.entities.length;
    let sumYes = 0.0;
    let sumNo = 0.0;
    let wLogWYes = 0.0;
    let wLogWNo = 0.0;
    const scale = 1.0 - 2.0 * CHANNEL_EPSILON;

    for (let i = 0; i < n; i++) {
      const pE = this.beliefs[i];
      if (pE <= 1e-12) continue;
      const t = this.getEntityTraitProb(this.entities[i], qId);
      const pTrait = CHANNEL_EPSILON + scale * t;
      const wYes = pE * pTrait;
      const wNo = pE - wYes;

      sumYes += wYes;
      sumNo += wNo;
      if (wYes > 1e-12) wLogWYes += wYes * Math.log2(wYes);
      if (wNo > 1e-12) wLogWNo += wNo * Math.log2(wNo);
    }

    const pYes = Math.max(1e-4, Math.min(1.0 - 1e-4, sumYes));
    const pNo = 1.0 - pYes;

    if (sumYes <= 1e-12 || sumNo <= 1e-12) {
      return {
        qId,
        pYes,
        pNo,
        expectedPosteriorH: this.currentEntropy,
        informationGain: 0
      };
    }

    const hYes = Math.max(0, Math.log2(sumYes) - wLogWYes / sumYes);
    const hNo = Math.max(0, Math.log2(sumNo) - wLogWNo / sumNo);
    const expectedPosteriorH = sumYes * hYes + sumNo * hNo;
    const ig = Math.max(0, this.currentEntropy - expectedPosteriorH);

    return {
      qId,
      pYes,
      pNo,
      expectedPosteriorH,
      informationGain: ig
    };
  }

  rankQuestions(limit = 5) {
    if (
      this.questionCache &&
      this.questionCache.beliefs === this.beliefs &&
      this.questionCache.count === this.questionCount &&
      this.questionCache.rejectedSize === this.rejectedIds.size
    ) {
      return this.questionCache.ranked.slice(0, limit);
    }

    const askedSet = new Set(this.askedQuestions.map(a => a.qId));
    const scored = [];

    for (const q of this.questions) {
      if (!askedSet.has(q.id)) {
        const evalResult = this.evaluateQuestionInformationGain(q.id);
        if (evalResult.informationGain > 0.0001) {
          scored.push({
            question: q,
            ...evalResult
          });
        }
      }
    }

    scored.sort((a, b) => b.informationGain - a.informationGain);
    this.questionCache = {
      beliefs: this.beliefs,
      count: this.questionCount,
      rejectedSize: this.rejectedIds.size,
      ranked: scored
    };
    return scored.slice(0, limit);
  }

  _pushUndoSnapshot() {
    this.undoStack.push({
      beliefs: new Float64Array(this.beliefs),
      rejectedIds: new Set(this.rejectedIds),
      questionCount: this.questionCount,
      askedQuestions: this.askedQuestions.map(item => ({ ...item })),
      currentEntropy: this.currentEntropy,
      isGuessing: this.isGuessing,
      currentGuess: this.currentGuess,
      lastRejectedGuess: this.lastRejectedGuess,
      isGameOver: this.isGameOver
    });
  }

  recordAnswer(qId, answer) {
    if (
      this.isGameOver ||
      this.isGuessing ||
      !this.questions.some(q => q.id === qId) ||
      this.askedQuestions.some(q => q.qId === qId) ||
      !['yes', 'no', 'probably', 'rarely', 'unsure'].includes(answer)
    ) {
      return;
    }

    this._pushUndoSnapshot();
    const expectedEval = this.evaluateQuestionInformationGain(qId);

    const n = this.entities.length;
    const newBeliefs = new Float64Array(n);
    let totalWeight = 0.0;

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
    }

    for (let i = 0; i < n; i++) {
      const prior = this.beliefs[i];
      const traitProb = this.getEntityTraitProb(this.entities[i], qId);
      const likelihood = traitProb * yesWeight + (1.0 - traitProb) * noWeight;
      const posterior = prior * (likelihood + SMOOTHING_EPSILON);
      newBeliefs[i] = posterior;
      totalWeight += posterior;
    }

    if (totalWeight > 0) {
      for (let i = 0; i < n; i++) {
        newBeliefs[i] /= totalWeight;
      }
    }

    const prevEntropy = this.currentEntropy;
    this.beliefs = newBeliefs;
    this.currentEntropy = this.computeEntropy(this.beliefs);
    this.questionCount++;
    this.questionCache = null;

    const entropyDelta = prevEntropy - this.currentEntropy;
    this.askedQuestions.push({
      qId,
      answer,
      expectedIG: expectedEval.informationGain,
      entropyBefore: prevEntropy,
      entropyAfter: this.currentEntropy,
      entropyDelta,
      bitsEliminated: Math.max(0, entropyDelta)
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
    this.lastRejectedGuess = prev.lastRejectedGuess;
    this.isGameOver = prev.isGameOver;
    this.questionCache = null;
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

  getActiveCandidateCount() {
    const threshold = 0.1 / Math.max(1, this.entities.length);
    let count = 0;
    for (let i = 0; i < this.beliefs.length; i++) {
      if (!this.rejectedIds.has(this.entities[i].id) && this.beliefs[i] >= threshold) {
        count++;
      }
    }
    return count;
  }

  getEntropySeries() {
    const series = [this.initialEntropy];
    for (const step of this.askedQuestions) {
      series.push(step.entropyAfter);
    }
    return series;
  }

  checkGuessConditions() {
    const top = this.getTopCandidates(2);
    const topP = top[0]?.probability || 0;
    const runnerUpP = top[1]?.probability || 0;

    if (
      topP >= 0.78 ||
      (topP >= 0.62 && runnerUpP <= 0.14) ||
      this.currentEntropy <= 0.40 ||
      this.questionCount >= this.maxQuestions ||
      this.rankQuestions(1).length === 0
    ) {
      if (top[0]) {
        this.isGuessing = true;
        this.currentGuess = top[0].entity;
      }
    }
  }

  rejectCurrentGuess() {
    if (!this.currentGuess) return;
    this._pushUndoSnapshot();
    this.questionCache = null;
    this.lastRejectedGuess = this.currentGuess;
    this.rejectedIds.add(this.currentGuess.id);

    const guessIndex = this.entities.findIndex(e => e.id === this.currentGuess.id);
    if (guessIndex >= 0) {
      this.beliefs[guessIndex] = 0;
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
    const trimmedName = String(name || '').trim();
    const trimmedQ = String(distinguishingQ || '').trim();
    if (!trimmedName || !trimmedQ) return null;

    const stamp = Date.now();
    const newId = `custom_${stamp}_${Math.random().toString(36).slice(2, 8)}`;
    const newQId = `q_custom_${stamp}_${Math.random().toString(36).slice(2, 6)}`;

    const newQuestion = {
      id: newQId,
      text: trimmedQ,
      category: 'custom'
    };
    this.questions.push(newQuestion);

    const answerTraitMap = { yes: 1, no: 0, probably: 0.78, rarely: 0.22 };
    const newEntity = {
      id: newId,
      name: trimmedName,
      category: normalizeCategory(category),
      isCustom: true,
      desc: `Taught in lab. Distinguishing clue: "${trimmedQ}"`,
      traits: Object.fromEntries(
        this.askedQuestions
          .filter(r => r.answer !== 'unsure')
          .map(r => [r.qId, answerTraitMap[r.answer]])
      )
    };
    newEntity.traits[newQId] = userAnsIsYes ? 1.0 : 0.0;

    // Only write opposite trait onto a guess the player actually saw and rejected
    if (this.lastRejectedGuess?.traits) {
      this.lastRejectedGuess.traits[newQId] = userAnsIsYes ? 0.0 : 1.0;
    }

    this.entities.push(newEntity);
    this._persistCustomData();
    return newEntity;
  }

  deleteCustomEntity(entityId) {
    try {
      const stored = JSON.parse(this.storage?.getItem(this.customEntitiesKey) || '[]');
      if (Array.isArray(stored)) {
        const filtered = stored.filter(e => e.id !== entityId);
        this.storage?.setItem(this.customEntitiesKey, JSON.stringify(filtered));
      }
      this.reset();
      return true;
    } catch {
      return false;
    }
  }

  clearCustomKnowledge() {
    try {
      this.storage?.removeItem(this.customEntitiesKey);
      this.storage?.removeItem(`${this.customEntitiesKey}_questions`);
      this.storage?.removeItem(`${this.customEntitiesKey}_corrections`);
      this.reset();
      return true;
    } catch {
      return false;
    }
  }

  _persistCustomData() {
    try {
      const customEntities = this.getCustomEntities().map(({ isCustom, ...rest }) => rest);
      this.storage?.setItem(this.customEntitiesKey, JSON.stringify(customEntities));
      const customQuestions = this.questions.filter(q => q.category === 'custom');
      this.storage?.setItem(`${this.customEntitiesKey}_questions`, JSON.stringify(customQuestions));
      const corrections = Object.fromEntries(
        this.entities
          .filter(e => !String(e.id).startsWith('custom_'))
          .map(e => [
            e.id,
            Object.fromEntries(Object.entries(e.traits).filter(([q]) => q.startsWith('q_custom_')))
          ])
          .filter(([, map]) => Object.keys(map).length > 0)
      );
      this.storage?.setItem(`${this.customEntitiesKey}_corrections`, JSON.stringify(corrections));
    } catch { /* Storage unavailable */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REVERSE 20Q ("BE THE AI") DETERMINISTIC SEARCH SESSION (TAB 2)
// ═══════════════════════════════════════════════════════════════════════════

export const REVERSE_TIERS = {
  starter: {
    id: 'starter',
    label: '8 items · 3 bits',
    optimalBits: 3,
    entityIds: [
      'bald_eagle', 'elephant', 'apple', 'giant_sequoia',
      'smartphone', 'book', 'planet_saturn', 'volcano'
    ]
  },
  classroom: {
    id: 'classroom',
    label: '16 items · 4 bits',
    optimalBits: 4,
    entityIds: [
      'bald_eagle', 'elephant', 'blue_whale', 'honeybee',
      'apple', 'giant_sequoia', 'albert_einstein', 'marie_curie',
      'smartphone', 'laptop_computer', 'submarine', 'bicycle',
      'planet_saturn', 'the_sun', 'volcano', 'eiffel_tower'
    ]
  },
  expert: {
    id: 'expert',
    label: '32 items · 5 bits',
    optimalBits: 5,
    entityIds: [
      'lion', 'elephant', 'blue_whale', 'bald_eagle',
      'emperor_penguin', 'great_white_shark', 'honeybee', 'platypus',
      'albert_einstein', 'marie_curie', 'ada_lovelace', 'rosa_parks',
      'abraham_lincoln', 'amelia_earhart', 'alan_turing', 'mozart',
      'microscope', 'telescope', 'smartphone', 'laptop_computer',
      'space_rocket', 'submarine', 'airplane', 'bicycle',
      'the_sun', 'the_moon', 'planet_saturn', 'volcano',
      'eiffel_tower', 'great_pyramids', 'apple', 'giant_sequoia'
    ]
  }
};

export class Reverse20QSession {
  constructor(options = {}) {
    const tierKey = REVERSE_TIERS[options.tier] ? options.tier : 'starter';
    this.tierConfig = REVERSE_TIERS[tierKey];
    const entityMap = new Map(CORE_ENTITIES.map(e => [e.id, e]));
    this.pool = this.tierConfig.entityIds.map(id => entityMap.get(id)).filter(Boolean);
    this.rng = typeof options.rng === 'function' ? options.rng : Math.random;

    if (options.secretId && this.pool.some(e => e.id === options.secretId)) {
      this.secretEntity = entityMap.get(options.secretId);
    } else {
      const idx = Math.floor(this.rng() * this.pool.length);
      this.secretEntity = this.pool[Math.min(this.pool.length - 1, Math.max(0, idx))];
    }

    this.remainingIds = new Set(this.pool.map(e => e.id));
    this.askedHistory = [];
    this.askedSet = new Set();
    this.wrongGuesses = new Set();
    this.turns = 0;
    this.isFinished = false;
    this.won = false;
    this.initialEntropy = Math.log2(Math.max(1, this.pool.length));
  }

  getRemainingEntities() {
    return this.pool.filter(e => this.remainingIds.has(e.id));
  }

  getAllEntities() {
    return this.pool;
  }

  getAvailableQuestions() {
    const remaining = this.getRemainingEntities();
    const total = remaining.length;
    if (total <= 1) return [];

    const currentH = Math.log2(total);
    const items = [];
    let bestIG = 0;

    for (const q of QUESTIONS) {
      if (this.askedSet.has(q.id)) continue;
      let yesCount = 0;
      let noCount = 0;
      let hasAmbiguous = false;
      for (const e of remaining) {
        const val = e.traits[q.id];
        if (val === 1) yesCount++;
        else if (val === 0) noCount++;
        else {
          hasAmbiguous = true;
          break;
        }
      }
      if (hasAmbiguous || yesCount === 0 || noCount === 0) continue;

      const pYes = yesCount / total;
      const pNo = noCount / total;
      const hAfter = pYes * Math.log2(yesCount) + pNo * Math.log2(noCount);
      const ig = Math.max(0, currentH - hAfter);
      if (ig > bestIG) bestIG = ig;

      items.push({
        question: q,
        yesCount,
        noCount,
        remainingCount: total,
        pYes,
        informationGain: ig,
        isOptimal: false
      });
    }

    for (const item of items) {
      item.isOptimal = bestIG > 0 && item.informationGain >= bestIG - 1e-6;
    }

    items.sort((a, b) => b.informationGain - a.informationGain || a.question.text.localeCompare(b.question.text));
    return items;
  }

  askQuestion(qId) {
    if (this.isFinished || this.askedSet.has(qId)) return null;
    const available = this.getAvailableQuestions();
    const picked = available.find(item => item.question.id === qId);
    if (!picked) return null;

    const best = available[0];
    const remainingBefore = this.remainingIds.size;
    const entropyBefore = Math.log2(Math.max(1, remainingBefore));
    const answerIsYes = this.secretEntity.traits[qId] === 1;
    const answer = answerIsYes ? 'yes' : 'no';

    this.askedSet.add(qId);
    this.turns++;

    for (const e of this.pool) {
      if (!this.remainingIds.has(e.id)) continue;
      const matches = (e.traits[qId] === 1) === answerIsYes;
      if (!matches) this.remainingIds.delete(e.id);
    }

    const remainingAfter = this.remainingIds.size;
    const entropyAfter = Math.log2(Math.max(1, remainingAfter));
    const record = {
      turn: this.turns,
      qId,
      text: picked.question.text,
      answer,
      yesCount: picked.yesCount,
      noCount: picked.noCount,
      remainingBefore,
      remainingAfter,
      chosenIG: picked.informationGain,
      bestIG: best.informationGain,
      bestQuestionText: best.question.text,
      isOptimal: picked.isOptimal,
      bitsRemoved: Math.max(0, entropyBefore - entropyAfter)
    };
    this.askedHistory.push(record);
    return record;
  }

  guessEntity(entityId) {
    if (this.isFinished) return null;
    const guessed = this.pool.find(e => e.id === entityId);
    if (!guessed) return null;

    this.turns++;
    if (guessed.id === this.secretEntity.id) {
      this.isFinished = true;
      this.won = true;
      return {
        correct: true,
        guessed,
        turns: this.turns,
        optimalBits: this.tierConfig.optimalBits
      };
    }

    this.wrongGuesses.add(guessed.id);
    this.remainingIds.delete(guessed.id);
    return {
      correct: false,
      guessed,
      turns: this.turns,
      remainingAfter: this.remainingIds.size
    };
  }

  getStats() {
    const remainingCount = this.remainingIds.size;
    const entropyRemaining = Math.log2(Math.max(1, remainingCount));
    const questionTurns = this.askedHistory.length;
    const optimalHits = this.askedHistory.filter(h => h.isOptimal).length;
    const avgChosenIG = questionTurns > 0
      ? this.askedHistory.reduce((acc, h) => acc + h.chosenIG, 0) / questionTurns
      : null;

    return {
      tier: this.tierConfig.id,
      tierLabel: this.tierConfig.label,
      tierSize: this.pool.length,
      optimalBits: this.tierConfig.optimalBits,
      remainingCount,
      turns: this.turns,
      questionTurns,
      wrongGuesses: this.wrongGuesses.size,
      initialEntropy: this.initialEntropy,
      entropyRemaining,
      bitsRemoved: Math.max(0, this.initialEntropy - entropyRemaining),
      avgChosenIG,
      optimalHits,
      isFinished: this.isFinished,
      won: this.won,
      secretEntity: this.secretEntity
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDIO CHALLENGES (CROSS-TAB MASTERY)
// ═══════════════════════════════════════════════════════════════════════════

export const STUDIO_CHALLENGES = [
  {
    id: 'solve_under_12',
    title: '1. Sub-12 Bit Speedrun',
    desc: 'Have the 20Q Mind Reader guess your secret item in 12 questions or fewer.'
  },
  {
    id: 'fault_tolerant',
    title: '2. Survive Fuzzy Evidence',
    desc: 'Use Probably, Probably Not, or Not Sure during a round and still finish with a confirmed guess.'
  },
  {
    id: 'teach_item',
    title: '3. Expand the Knowledge Base',
    desc: 'Outsmart the AI or use Teach my item to store a new entity and distinguishing clue.'
  },
  {
    id: 'reverse_optimal',
    title: '4. Beat Shannon in Reverse 20Q',
    desc: 'In Tab 2, find the secret item in at most optimal bits + 1 total turns.'
  },
  {
    id: 'llm_temperature',
    title: '5. Probe Temperature & Perplexity',
    desc: 'In Tab 3, explore both low and high Temperature settings in the LLM Cross-Entropy Lab.'
  }
];

export function evaluateChallenges(progress = {}) {
  const completed = {
    solve_under_12: Boolean(progress.minWinQuestions > 0 && progress.minWinQuestions <= 12),
    fault_tolerant: Boolean(progress.usedFuzzyAndWon),
    teach_item: Boolean((progress.taughtCount || 0) >= 1),
    reverse_optimal: Boolean(progress.reverseWonNearOptimal),
    llm_temperature: Boolean(progress.testedLlmLowTemp && progress.testedLlmHighTemp)
  };
  const count = Object.values(completed).filter(Boolean).length;
  return {
    total: STUDIO_CHALLENGES.length,
    count,
    completed
  };
}
