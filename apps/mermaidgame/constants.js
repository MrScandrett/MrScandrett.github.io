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
const GRAVITY = 0.32;
const WATER_ACCEL = 0.4;
const AIR_ACCEL = 0.25;
const MAX_WATER_SPEED = 3.5;
const MAX_AIR_SPEED_X = 5.5;
const MAX_AIR_SPEED_Y = 9;
const WATER_DRAG = 0.90;

// Surface-breach tuning: a fast upward swim becomes a committed aerial arc.
const BREACH_MIN_SPEED = 2.4;
const BREACH_LAUNCH_SPEED = 6.8;
const BREACH_MAX_SPEED = 8.8;
const BREACH_DASH_BONUS = 1.25;

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
    colors: {
      bgTop: '#22d3ee', bgBot: '#0ea5e9',
      rock: '#465348', rockDark: '#17241d', rockMid: '#687361',
      rockLight: '#a4aa8d', rockEdge: '#879779'
    }
  },
  [BiomeType.BAYOU]: {
    name: "Bayou Realm",
    difficulty: 2,
    desc: "Toxic roots and murky illusions.",
    colors: {
      bgTop: '#14532d', bgBot: '#052e16',
      rock: '#34442b', rockDark: '#111b12', rockMid: '#56643d',
      rockLight: '#879064', rockEdge: '#6d7f50'
    }
  },
  [BiomeType.ARCTIC]: {
    name: "Arctic Realm",
    difficulty: 3,
    desc: "Freezing currents and jagged ice.",
    colors: {
      bgTop: '#7dd3fc', bgBot: '#0c4a6e',
      rock: '#66899c', rockDark: '#294756', rockMid: '#8bb3c2',
      rockLight: '#d7eef0', rockEdge: '#b6dce2'
    }
  },
  [BiomeType.TRENCH]: {
    name: "Marianas Trench",
    difficulty: 4,
    desc: "The Void. Dan's Fortress lies below.",
    colors: {
      bgTop: '#1e1b4b', bgBot: '#020617',
      rock: '#252139', rockDark: '#080913', rockMid: '#413958',
      rockLight: '#716582', rockEdge: '#554a69'
    }
  }
};

// Non-hostile fish communities. Shapes and markings are rendered procedurally,
// while these palettes keep each depth band ecologically distinct.
const FISH_SPECIES = {
  [BiomeType.CORAL]: [
    { id: 'CLOWNFISH', body: '#f97316', accent: '#fff7ed', dark: '#431407', pattern: 'BANDS', shape: 'ROUND', size: 0.85, speed: 0.34 },
    { id: 'BUTTERFLYFISH', body: '#facc15', accent: '#f8fafc', dark: '#172554', pattern: 'MASK', shape: 'TALL', size: 1.0, speed: 0.28 },
    { id: 'BLUE_TANG', body: '#2563eb', accent: '#facc15', dark: '#172554', pattern: 'SWOOP', shape: 'TALL', size: 1.05, speed: 0.32 },
    { id: 'ANTHIAS', body: '#f472b6', accent: '#fbcfe8', dark: '#831843', pattern: 'SPOTS', shape: 'SLENDER', size: 0.72, speed: 0.42 }
  ],
  [BiomeType.BAYOU]: [
    { id: 'MANGROVE_SNAPPER', body: '#b45309', accent: '#fbbf24', dark: '#422006', pattern: 'LINE', shape: 'ROUND', size: 1.0, speed: 0.28 },
    { id: 'NEEDLEFISH', body: '#84a98c', accent: '#d8f3dc', dark: '#1b4332', pattern: 'LINE', shape: 'SLENDER', size: 1.15, speed: 0.38 },
    { id: 'MUD_MINNOW', body: '#78716c', accent: '#a3e635', dark: '#292524', pattern: 'SPOTS', shape: 'ROUND', size: 0.72, speed: 0.25 },
    { id: 'CATFISH', body: '#64748b', accent: '#cbd5e1', dark: '#1e293b', pattern: 'WHISKERS', shape: 'LONG', size: 1.15, speed: 0.22 }
  ],
  [BiomeType.ARCTIC]: [
    { id: 'ARCTIC_COD', body: '#94a3b8', accent: '#e0f2fe', dark: '#334155', pattern: 'MOTTLED', shape: 'LONG', size: 1.05, speed: 0.3 },
    { id: 'CAPELIN', body: '#67e8f9', accent: '#f8fafc', dark: '#155e75', pattern: 'LINE', shape: 'SLENDER', size: 0.72, speed: 0.45 },
    { id: 'ICEFISH', body: '#bae6fd', accent: '#ffffff', dark: '#3b82a0', pattern: 'GLASS', shape: 'SLENDER', size: 0.9, speed: 0.25 },
    { id: 'ARCTIC_CHAR', body: '#64748b', accent: '#fb7185', dark: '#1e293b', pattern: 'SPOTS', shape: 'LONG', size: 1.1, speed: 0.32 }
  ],
  [BiomeType.TRENCH]: [
    { id: 'LANTERNFISH', body: '#172554', accent: '#67e8f9', dark: '#020617', pattern: 'GLOW', shape: 'LONG', size: 0.78, speed: 0.22 },
    { id: 'HATCHETFISH', body: '#4c1d95', accent: '#c4b5fd', dark: '#09090b', pattern: 'GLOW', shape: 'TALL', size: 0.85, speed: 0.18 },
    { id: 'SNAILFISH', body: '#a855f7', accent: '#f0abfc', dark: '#3b0764', pattern: 'MOTTLED', shape: 'ROUND', size: 0.95, speed: 0.16 },
    { id: 'VIPERFISH', body: '#334155', accent: '#a5f3fc', dark: '#020617', pattern: 'FANGS', shape: 'SLENDER', size: 1.05, speed: 0.2 }
  ]
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

const HAIR_COLORS = [
  '#39245f', '#512b81', '#24345f', '#542b3f', '#182f38'
];

const APPEARANCE_OPTIONS = {
  HAIR: ['LONG', 'WAVY', 'BUN'],
  EYES: ['FOCUSED', 'LINED', 'LASHES'],
  MOUTHS: ['STERN', 'NEUTRAL', 'OPEN']
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

const ITEM_ICONS = {
  [EntityType.ITEM_SHELL]: { color: '#fca5a5', glow: 'rgba(252,165,165,0.55)' },
  [EntityType.ITEM_FORK]: { color: '#e2e8f0', glow: 'rgba(226,232,240,0.5)' },
  [EntityType.ITEM_BOTTLE]: { color: '#5eead4', glow: 'rgba(94,234,212,0.5)' },
  [EntityType.ITEM_BOOT]: { color: '#c084fc', glow: 'rgba(192,132,252,0.5)' },
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
