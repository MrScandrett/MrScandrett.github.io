// Enums
const BiomeType = {
    CORAL: 'CORAL',
    BAYOU: 'BAYOU',
    ARCTIC: 'ARCTIC',
    TRENCH: 'TRENCH'
};
// Alias for existing code compatibility
const BIOME_TYPES = BiomeType;

const EntityType = {
    PLAYER: 'PLAYER',
    ITEM_SHELL: 'ITEM_SHELL',
    ITEM_FORK: 'ITEM_FORK',
    ITEM_BOTTLE: 'ITEM_BOTTLE',
    ITEM_BOOT: 'ITEM_BOOT',
    PIRATE_SCUBA: 'PIRATE_SCUBA',
    PIRATE_DAN: 'PIRATE_DAN',
    SHARK: 'SHARK',
    JELLYFISH: 'JELLYFISH',
    SHIP: 'SHIP',
    PROJECTILE: 'PROJECTILE',
    BUBBLE: 'BUBBLE',
    CANNONBALL: 'CANNONBALL',
    CAPTIVE_MERMAID: 'CAPTIVE_MERMAID',
    PET: 'PET',
    PASSIVE_FISH: 'PASSIVE_FISH',
    PASSIVE_JELLY: 'PASSIVE_JELLY',
    DECORATION: 'DECORATION',
    PORTAL: 'PORTAL',
    OXYGEN_SOURCE: 'OXYGEN_SOURCE'
};

const WeaponType = {
    NONE: 'NONE',
    FORK_DAGGER: 'FORK_DAGGER',
    BOOT_MACE: 'BOOT_MACE',
    TRIDENT_SPEAR: 'TRIDENT_SPEAR'
};

const PetType = {
    YELLOW_STRIPE: 'YELLOW_STRIPE',
    ANGLER: 'ANGLER',
    RED_CRAB: 'RED_CRAB'
};

// Virtual Resolution (Pixel Art Look)
const V_WIDTH = 480;
const V_HEIGHT = 270;
const TILE_SIZE = 24;

const MAP_WIDTH = 80;
const MAP_HEIGHT = 240; // Increased for Trench Depth

// Physics - REFINED ECCO FEEL
const SURFACE_Y = 60; // Lower surface to give more sky room
const GRAVITY = 0.4;
const WATER_ACCEL = 0.4;
const AIR_ACCEL = 0.25;
const MAX_WATER_SPEED = 3.5;
const MAX_AIR_SPEED_X = 2.5;
const MAX_AIR_SPEED_Y = 6;
const WATER_DRAG = 0.90;

const CONFIG = {
    PLAYER_SPEED: MAX_WATER_SPEED * 2, // Adjusted for game feel
    ENEMY_SPEED: 4,
    ITEM_SPEED: 0 // Items are static in the world
};

const BIOME_CONFIG = {
  [BiomeType.CORAL]: {
    name: "Coral Reef Realm",
    difficulty: 1,
    desc: "The Shallows. Colorful but corrupted.",
    colors: { bgTop: '#22d3ee', bgBot: '#0ea5e9', rock: '#0f172a' }
  },
  [BiomeType.BAYOU]: {
    name: "Bayou Realm",
    difficulty: 2,
    desc: "Toxic roots and murky illusions.",
    colors: { bgTop: '#14532d', bgBot: '#052e16', rock: '#1a2e05' }
  },
  [BiomeType.ARCTIC]: {
    name: "Arctic Realm",
    difficulty: 3,
    desc: "Freezing currents and jagged ice.",
    colors: { bgTop: '#cbd5e1', bgBot: '#475569', rock: '#f1f5f9' }
  },
  [BiomeType.TRENCH]: {
    name: "Marianas Trench",
    difficulty: 4,
    desc: "The Void. Dan's Fortress lies below.",
    colors: { bgTop: '#1e1b4b', bgBot: '#020617', rock: '#000000' }
  }
};

const COLORS = {
  WHITE: '#ffffff',
  BLACK: '#000000',
  UI_BG: '#1e293b',
  UI_BORDER: '#22d3ee',
  TEXT_HIGHLIGHT: '#facc15',
  WATER_DEEP: '#001e36',
  
  MERMAID_SKIN: '#38bdf8',
  MERMAID_TAIL: '#ec4899',
  
  ITEM_GLOW: '#facc15',
  BUBBLE: 'rgba(255, 255, 255, 0.4)',
  OXYGEN_BUBBLE: '#a5f3fc',
  SPARK: '#fef08a',
  BLOOD: '#ef4444',
  SMOKE: 'rgba(100, 116, 139, 0.5)',
  
  CAPTIVE_CAGE: '#94a3b8',
  CAPTIVE_GLOW: '#e879f9',
  
  PASSIVE_FISH: '#fcd34d',
  PASSIVE_JELLY: '#e879f9',
  SHIP_HULL: '#1e293b',
  SHIP_SAIL: '#e5e7eb',
  
  SHARK_BODY: '#64748b',
  SHARK_BELLY: '#94a3b8',
  
  JELLY_BODY: 'rgba(192, 132, 252, 0.6)',
  JELLY_TENTACLE: '#e879f9',
};

const SKIN_COLORS = [
  '#ffdbac', '#f1c27d', '#e0ac69', '#8d5524', '#c68642', // Human tones
  '#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#fb7185'  // Fantasy tones
];

const FIN_COLORS = [
  '#ec4899', '#db2777', '#be185d', // Pinks
  '#22d3ee', '#0ea5e9', '#2563eb', // Blues
  '#a78bfa', '#8b5cf6', '#7c3aed', // Purples
  '#34d399', '#10b981', '#059669', // Greens
  '#fbbf24', '#f59e0b', '#d97706'  // Golds
];

const APPEARANCE_OPTIONS = {
  HAIR: ['LONG', 'WAVY', 'BUN'],
  EYES: ['DOT', 'ANIME' , 'LASHES'],
  MOUTHS: ['SMILE', 'SMIRK', 'OPEN']
};

const PET_STATS = {
  [PetType.YELLOW_STRIPE]: { name: 'Scraps', desc: 'Fetches Items', color: '#facc15', speed: 3.5 },
  [PetType.ANGLER]: { name: 'Lumi', desc: 'Lights Dark', color: '#60a5fa', speed: 2.5 },
  [PetType.RED_CRAB]: { name: 'Sebastian', desc: 'Heals You', color: '#ef4444', speed: 2 }
};

const ITEM_VALUES = {
  [EntityType.ITEM_SHELL]: 10,
  [EntityType.ITEM_FORK]: 25,
  [EntityType.ITEM_BOTTLE]: 40,
  [EntityType.ITEM_BOOT]: 75,
  [EntityType.PLAYER]: 0,
  [EntityType.PIRATE_SCUBA]: 0,
  [EntityType.PIRATE_DAN]: 0,
  [EntityType.SHARK]: 0,
  [EntityType.JELLYFISH]: 0,
  [EntityType.SHIP]: 0,
  [EntityType.PROJECTILE]: 0,
  [EntityType.BUBBLE]: 0,
  [EntityType.CANNONBALL]: 0,
  [EntityType.CAPTIVE_MERMAID]: 0,
  [EntityType.PET]: 0,
  [EntityType.PASSIVE_FISH]: 0,
  [EntityType.PASSIVE_JELLY]: 0,
  [EntityType.DECORATION]: 0,
  [EntityType.PORTAL]: 0,
  [EntityType.OXYGEN_SOURCE]: 0,
};

const NARRATIVE = {
  INTRO_LINES: [
    "You are Melissa.",
    "Stripped of your voice by Pirate Dan.",
    "The Magic Conch is lost...",
    "The sea has fractured.",
    "Rise, Grotto Guardian.",
    "Reclaim your voice."
  ],
  LEVEL_START: "Pirate ships patrol above. Breach carefully.",
  LEVEL_DEEP: "Entering Dark Depths. Pressure rising.",
  LEVEL_BOSS: "WARNING: High Energy Readings.",
  RESCUE: "Mermaid Freed! Magic Restored!",
  PET_FIND: "I found something shiny!",
  PET_WARN: "Bad vibes ahead, Melissa!",
  PET_IDLE: "Which way next?"
};

const WEAPON_STATS = {
  [WeaponType.NONE]: { damage: 1, range: 20, cooldown: 30, color: 'transparent' },
  [WeaponType.FORK_DAGGER]: { damage: 4, range: 40, cooldown: 15, color: '#94a3b8' },
  [WeaponType.BOOT_MACE]: { damage: 8, range: 35, cooldown: 40, color: '#78350f' },
  [WeaponType.TRIDENT_SPEAR]: { damage: 6, range: 70, cooldown: 20, color: '#bef264' },
};

const STORE_CATALOG = [
  {
    id: 'wpn_fork', name: 'Fork Dagger', cost: 150, type: 'WEAPON', weaponType: WeaponType.FORK_DAGGER,
    description: "Pointy eating utensil. Good for stabbing."
  },
  {
    id: 'wpn_boot', name: 'Boot Mace', cost: 400, type: 'WEAPON', weaponType: WeaponType.BOOT_MACE,
    description: "Heavy rubber boot on a rope. Crushing damage."
  },
  {
    id: 'wpn_trident', name: 'Glass Trident', cost: 1000, type: 'WEAPON', weaponType: WeaponType.TRIDENT_SPEAR,
    description: "Sharpened glass shards. The weapon of a queen."
  },
  {
    id: 'heal_kelp', name: 'Kelp Smoothie', cost: 50, type: 'HEAL',
    description: "Restores 1 Health Heart."
  }
];
