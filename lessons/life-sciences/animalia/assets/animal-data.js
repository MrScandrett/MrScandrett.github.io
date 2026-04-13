/**
 * Animal Kingdom Taxonomy Database
 * Source of Truth for all Animalia Domain content
 * Used by: sorter.html, explorer.html, quiz.html
 */

const ANIMAL_KINGDOM_DATA = {
  phyla: {
    "Porifera": {
      name: "Porifera",
      commonName: "Sponges",
      description: "The most primitive animals, lacking true tissues and organized nervous systems. They are filter feeders that pull nutrients from water.",
      traits: ["No true tissues", "Asymmetrical", "Sessile (Fixed in place)", "Filter feeders"],
      examples: ["Barrel Sponge", "Glass Sponge", "Red Sponge"],
      keyFact: "They are the only animals that can be put through a blender and will reform into a sponge!",
      symmetry: "Asymmetrical",
      skeleton: "None (Spicules)",
      movement: "Sessile"
    },
    "Cnidaria": {
      name: "Cnidaria",
      commonName: "Stinging Animals",
      description: "Named for their stinging cells (Cnidocytes), these radially symmetric animals use tentacles to capture prey. Ancient lineage with simple nervous systems.",
      traits: ["Radial Symmetry", "Cnidocytes (Stinging cells)", "Two tissue layers", "Gastrovascular cavity"],
      examples: ["Moon Jellyfish", "Sea Anemone", "Brain Coral", "Portuguese Man o' War"],
      keyFact: "Some jellyfish are effectively immortal, able to revert their cells to a younger state through a process called transdifferentiation.",
      symmetry: "Radial",
      skeleton: "Gelatinous (No solid support)",
      movement: "Drift or limited movement"
    },
    "Mollusca": {
      name: "Mollusca",
      commonName: "Mollusks",
      description: "Highly successful phylum with incredible diversity. Many possess a muscular foot and a mantle that often secretes a protective shell.",
      traits: ["Bilateral Symmetry", "Muscular Foot", "Mantle (secretes shells)", "Soft body"],
      examples: ["Giant Squid", "Garden Snail", "Blue-ringed Octopus", "Mussel"],
      keyFact: "Mollusks range from tiny snails to the colossal squid, which has eyes the size of basketballs—the largest eyes in the animal kingdom.",
      symmetry: "Bilateral",
      skeleton: "Variable (Shell or None)",
      movement: "Foot-based or jet propulsion"
    },
    "Arthropoda": {
      name: "Arthropoda",
      commonName: "Jointed-Legs",
      description: "By far the largest phylum. Characterized by segmented bodies, jointed appendages, and a rigid exoskeleton made of chitin. Includes insects, spiders, crustaceans.",
      traits: ["Exoskeleton (Chitin)", "Segmented bodies", "Jointed appendages", "Open circulatory system"],
      examples: ["Honeybee", "Lobster", "Black Widow Spider", "Monarch Butterfly"],
      keyFact: "Arthropods account for over 80% of all known living animal species—roughly 1.4 million described species.",
      symmetry: "Bilateral",
      skeleton: "External (Chitin Exoskeleton)",
      movement: "Jointed legs, wings, or swimming"
    },
    "Echinodermata": {
      name: "Echinodermata",
      commonName: "Spiny-Skinned",
      description: "Unique radially symmetric animals with remarkable regenerative abilities. They use a water vascular system for movement and feeding.",
      traits: ["Five-part Radial Symmetry", "Water Vascular System", "Regeneration", "Tube feet"],
      examples: ["Sea Star (Starfish)", "Purple Sea Urchin", "Sea Cucumber", "Brittle Star"],
      keyFact: "Sea stars don't have blood; they use filtered seawater to pump nutrients through their water vascular system.",
      symmetry: "Radial (Five-part)",
      skeleton: "Internal (Calcite ossicles)",
      movement: "Water vascular system, tube feet"
    },
    "Chordata": {
      name: "Chordata",
      commonName: "Vertebrates & Kin",
      description: "The phylum containing all vertebrates (animals with backbones) plus some primitive relatives. Characterized by a notochord, dorsal nerve cord, and pharyngeal slits.",
      traits: ["Notochord (becomes spine)", "Hollow Nerve Cord (becomes brain/spinal cord)", "Pharyngeal Slits", "Post-anal Tail"],
      examples: ["Great White Shark", "Bald Eagle", "African Elephant", "Human", "Blue Whale"],
      keyFact: "While most Chordates are vertebrates, some primitive members like the 'Sea Squirt' lose their backbone-equivalent as adults.",
      symmetry: "Bilateral",
      skeleton: "Internal (Bone or Cartilage)",
      movement: "Muscle and skeletal system"
    }
  },

  // Classes within Chordata for deeper dives
  classes: {
    "Actinopterygii": {
      commonName: "Ray-finned Fish",
      examples: ["Tuna", "Salmon", "Goldfish"],
      traits: ["Scales", "Gills", "Fins with rays"]
    },
    "Amphibia": {
      commonName: "Amphibians",
      examples: ["Frog", "Salamander", "Newt"],
      traits: ["Moist skin", "Double life (water & land)", "Cold-blooded"]
    },
    "Reptilia": {
      commonName: "Reptiles",
      examples: ["Snake", "Turtle", "Komodo Dragon"],
      traits: ["Dry, scaly skin", "Cold-blooded", "Lay eggs on land"]
    },
    "Aves": {
      commonName: "Birds",
      examples: ["Bald Eagle", "Penguin", "Hummingbird"],
      traits: ["Feathers", "Warm-blooded", "Hollow bones", "Lay eggs"]
    },
    "Mammalia": {
      commonName: "Mammals",
      examples: ["Lion", "Whale", "Human"],
      traits: ["Hair/fur", "Warm-blooded", "Produce milk for young", "Internal fertilization"]
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ANIMAL_KINGDOM_DATA;
}
