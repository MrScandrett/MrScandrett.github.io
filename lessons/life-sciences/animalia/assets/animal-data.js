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
      description: "Sponges are living animals without true tissues or a nervous system. Water flowing through pores brings food particles to specialized cells.",
      traits: ["No true tissues", "Asymmetrical", "Sessile (Fixed in place)", "Filter feeders"],
      examples: ["Barrel Sponge", "Glass Sponge", "Red Sponge"],
      keyFact: "In some sponge species, separated cells can reaggregate under suitable laboratory conditions. This is not a property of every sponge.",
      symmetry: "Asymmetrical",
      skeleton: "Spicules and/or spongin fibers",
      movement: "Sessile",
      photo: {
        src: "porifera.webp",
        name: "Tube sponge (<i>Callyspongia</i> sp.)",
        caption: "No true tissues and no symmetry. Water pulled in through the pores carries food to the sponge’s cells.",
        credit: "Nick Hobgood",
        license: "CC BY-SA 3.0",
        source: "https://commons.wikimedia.org/wiki/File:Callyspongia_sp._(Tube_sponge).jpg"
      }
    },
    "Cnidaria": {
      name: "Cnidaria",
      commonName: "Stinging Animals",
      description: "Named for their stinging cells (Cnidocytes), these radially symmetric animals use tentacles to capture prey. Ancient lineage with simple nervous systems.",
      traits: ["Radial Symmetry", "Cnidocytes (Stinging cells)", "Two tissue layers", "Gastrovascular cavity"],
      examples: ["Moon Jellyfish", "Sea Anemone", "Brain Coral", "Portuguese Man o' War"],
      keyFact: "Some jellyfish can return to an earlier life stage under certain conditions; they can still die from disease or predation.",
      symmetry: "Radial",
      skeleton: "Hydrostatic support; corals may build calcium carbonate skeletons",
      movement: "Swimming medusae; mostly attached polyps",
      photo: {
        src: "cnidaria.webp",
        name: "Moon jelly (<i>Aurelia aurita</i>)",
        caption: "Radial symmetry: the body repeats around a center, like slices of a pie. Stinging cells line the tentacles.",
        credit: "Hans Hillewaert",
        license: "CC BY-SA 4.0",
        source: "https://commons.wikimedia.org/wiki/File:Aurelia_aurita_2.jpg"
      }
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
      movement: "Foot-based or jet propulsion",
      photo: {
        src: "mollusca.webp",
        name: "Common octopus (<i>Octopus vulgaris</i>)",
        caption: "A mollusk with no outer shell. Its arms are part of the muscular foot, and it jets water to swim.",
        credit: "H. Zell",
        license: "CC BY-SA 3.0",
        source: "https://commons.wikimedia.org/wiki/File:Octopus_vulgaris_02.JPG"
      }
    },
    "Arthropoda": {
      name: "Arthropoda",
      commonName: "Jointed-Legs",
      description: "By far the largest phylum. Characterized by segmented bodies, jointed appendages, and a rigid exoskeleton made of chitin. Includes insects, spiders, crustaceans.",
      traits: ["Exoskeleton (Chitin)", "Segmented bodies", "Jointed appendages", "Open circulatory system"],
      examples: ["Honeybee", "Lobster", "Black Widow Spider", "Monarch Butterfly"],
      keyFact: "Arthropoda contains more described animal species than any other phylum. Species counts change as scientists discover and revise species.",
      symmetry: "Bilateral",
      skeleton: "External (Chitin Exoskeleton)",
      movement: "Jointed legs, wings, or swimming",
      photo: {
        src: "arthropoda.webp",
        name: "Ladybird beetle (<i>Coccinella magnifica</i>)",
        caption: "Jointed legs, a segmented body, and a hard exoskeleton on the outside instead of a skeleton inside.",
        credit: "Gilles San Martin",
        license: "CC BY-SA 2.0",
        source: "https://commons.wikimedia.org/wiki/File:Coccinella_magnifica01.jpg"
      }
    },
    "Echinodermata": {
      name: "Echinodermata",
      commonName: "Spiny-Skinned",
      description: "Unique radially symmetric animals with remarkable regenerative abilities. They use a water vascular system for movement and feeding.",
      traits: ["Five-part Radial Symmetry", "Water Vascular System", "Regeneration", "Tube feet"],
      examples: ["Sea Star (Starfish)", "Purple Sea Urchin", "Sea Cucumber", "Brittle Star"],
      keyFact: "The water vascular system operates tube feet for movement, feeding, and gas exchange. It is not simply a replacement blood circulation system.",
      symmetry: "Usually five-part radial as adults; bilateral larvae",
      skeleton: "Internal (Calcite ossicles)",
      movement: "Water vascular system, tube feet",
      photo: {
        src: "echinodermata.webp",
        name: "Common starfish (<i>Asterias rubens</i>)",
        caption: "A five-part adult body. Underneath, hundreds of tube feet worked by water pressure move it along.",
        credit: "Hans Hillewaert",
        license: "CC BY-SA 4.0",
        source: "https://commons.wikimedia.org/wiki/File:Asterias_rubens.jpg"
      }
    },
    "Chordata": {
      name: "Chordata",
      commonName: "Vertebrates & Kin",
      description: "The phylum containing all vertebrates (animals with backbones) plus invertebrate relatives such as tunicates and lancelets. Characterized by a notochord, dorsal nerve cord, and pharyngeal slits.",
      traits: ["Notochord (supporting rod at some life stage)", "Hollow Nerve Cord (becomes brain/spinal cord)", "Pharyngeal Slits", "Post-anal Tail"],
      examples: ["Great White Shark", "Bald Eagle", "African Elephant", "Human", "Blue Whale"],
      keyFact: "Tunicate larvae have a notochord but no vertebral column. Chordata and Vertebrata are not interchangeable groups.",
      symmetry: "Bilateral",
      skeleton: "Bone/cartilage in vertebrates; notochord in other chordates",
      movement: "Muscle and skeletal system",
      photo: {
        src: "chordata.webp",
        name: "White shark (<i>Carcharodon carcharias</i>)",
        caption: "A vertebrate whose skeleton is cartilage, not bone. A backbone does not have to be made of bone.",
        credit: "Terry Goss",
        license: "CC BY 2.5",
        source: "https://commons.wikimedia.org/wiki/File:White_shark.jpg"
      }
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
      traits: ["Moist skin", "Double life (water & land)", "Ectothermic (depends on external heat)"]
    },
    "Reptilia": {
      commonName: "Reptiles",
      examples: ["Snake", "Turtle", "Komodo Dragon"],
      traits: ["Dry, scaly skin", "Ectothermic (depends on external heat)", "Many lay shelled eggs; some give live birth"]
    },
    "Aves": {
      commonName: "Birds",
      examples: ["Bald Eagle", "Penguin", "Hummingbird"],
      traits: ["Feathers", "Warm-blooded", "Many bones have air spaces", "Lay eggs"]
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
