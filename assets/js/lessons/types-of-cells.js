(function () {
  const CELL_DATA = {
    bacteria: {
      title: "Bacterial Cell",
      description: "Bacteria are prokaryotes. They do not have a nucleus, and their DNA is loosely coiled in a nucleoid region. Even though they are small, they can carry out all the functions of life.",
      type: "Prokaryotic",
      structures: "Cell wall, cell membrane, cytoplasm, ribosomes, a nucleoid region of DNA, often a plasmid, sometimes a flagellum.",
      organism: "Bacteria. Archaea are also prokaryotes, but their cell envelopes differ.",
      idea: "Simple does not mean weak. These cells are efficient survival machines.",
      diagram: "bacteria",
      defaultOrganelle: "ribosomes"
    },
    animal: {
      title: "Animal Cell",
      description: "Animal cells are eukaryotic. They have a nucleus and many organelles, but no rigid cell wall. That flexibility allows animal cells to specialize into many forms such as neurons, muscle cells, and blood cells.",
      type: "Eukaryotic",
      structures: "Nucleus, mitochondria, rough ER with ribosomes, Golgi apparatus, lysosomes, cell membrane, cytoplasm.",
      organism: "Animals, including humans.",
      idea: "These cells are versatile. Their flexible membranes support many specialized jobs.",
      diagram: "animal",
      defaultOrganelle: "nucleus"
    },
    plant: {
      title: "Plant Cell",
      description: "Plant cells are eukaryotic, but they also include a rigid cell wall, chloroplasts, and a large central vacuole. These structures help plants stay upright, store water, and make food from sunlight.",
      type: "Eukaryotic",
      structures: "Nucleus, chloroplasts, cell wall, cell membrane, large central vacuole, mitochondria.",
      organism: "Plants and many algae.",
      idea: "Plant cells are built for support, storage, and photosynthesis.",
      diagram: "plant",
      defaultOrganelle: "vacuole"
    }
  };

  const compareButtons = Array.from(document.querySelectorAll(".compare-btn[data-cell]"));
  const cellDiagrams = Array.from(document.querySelectorAll(".focus-panel .cell-diagram"));
  const inspector = document.getElementById("cell-inspector");
  const inspectorTitle = document.getElementById("cell-inspector-title");
  const inspectorCopy = document.getElementById("cell-inspector-copy");
  const organelleCards = Array.from(document.querySelectorAll(".organelle-card"));
  const organelleNodes = Array.from(document.querySelectorAll(".focus-panel .organelle-shape[data-organelle]"));
  const morphButtons = Array.from(document.querySelectorAll(".morph-btn"));
  const morphDiagrams = Array.from(document.querySelectorAll(".morph-stage .cell-diagram"));
  const morphTitle = document.getElementById("morph-title");
  const morphCopy = document.getElementById("morph-copy");
  const sampleButtons = Array.from(document.querySelectorAll(".sample-btn"));
  const specimenDiagrams = Array.from(document.querySelectorAll(".specimen-diagram"));
  const sampleReadoutTitle = document.getElementById("sample-readout-title");
  const sampleReadoutCopy = document.getElementById("sample-readout-copy");
  const clueList = document.getElementById("clue-list");
  const verdictTitle = document.getElementById("verdict-title");
  const verdictCopy = document.getElementById("verdict-copy");

  const ORGANELLE_INFO = {
    nucleus: {
      title: "Nucleus",
      copy: "Stores DNA and helps direct what proteins the cell builds. It is one of the clearest signs that a cell is eukaryotic."
    },
    mitochondria: {
      title: "Mitochondria",
      copy: "Release usable energy from food molecules so the cell can keep working."
    },
    chloroplasts: {
      title: "Chloroplasts",
      copy: "Capture sunlight and convert it into stored chemical energy during photosynthesis."
    },
    vacuole: {
      title: "Vacuole",
      copy: "Stores water and dissolved materials. In plant cells it also helps maintain pressure and shape."
    },
    ribosomes: {
      title: "Ribosomes",
      copy: "Assemble proteins. Ribosomes are found in all cells, including bacteria."
    },
    "cell-wall": {
      title: "Cell Wall",
      copy: "A rigid layer outside the cell membrane that protects the cell and helps it keep its shape. Found in plants and in many bacteria (but never in animal cells)."
    },
    nucleoid: {
      title: "Nucleoid",
      copy: "The region where a bacterium's circular DNA is loosely coiled. It has no surrounding membrane, which is exactly why bacteria are called prokaryotes."
    },
    flagellum: {
      title: "Flagellum",
      copy: "A whip-like tail that rotates like a propeller, letting the bacterium swim toward food or away from danger."
    }
  };

  const MORPH_DATA = {
    animal: {
      title: "Generic Animal Cell",
      copy: "This general model shows shared animal-cell structures. During development, different cell lineages produce specialized cells."
    },
    neuron: {
      title: "Neuron",
      copy: "Long branches help neurons receive and send signals. The stretched shape supports communication across long distances."
    },
    "red-blood-cell": {
      title: "Red Blood Cell",
      copy: "During mammalian red blood cell development, precursors lose their nucleus and mitochondria. The mature biconcave disc contains oxygen-binding hemoglobin."
    }
  };

  const SAMPLE_DATA = {
    "pond-leaf": {
      title: "Pond Leaf Scrape",
      copy: "Boxy cells with walls and green chloroplasts point toward a plant cell.",
      specimen: "pond-leaf",
      verdict: "Verdict: Plant Cell",
      verdictCopy: "The cell wall, chloroplast evidence, and boxy shape all support a plant-cell classification.",
      clues: ["Box-like outline", "Rigid cell wall visible", "Green chloroplast structures", "Nucleus not resolved in this illustration"]
    },
    "cheek-swab": {
      title: "Cheek Swab",
      copy: "Flattened, irregular cheek cells with stained nuclei and no cell wall fit the animal-cell pattern.",
      specimen: "cheek-swab",
      verdict: "Verdict: Animal Cell",
      verdictCopy: "A nucleus is present, but there is no rigid wall or chloroplast evidence, so animal cell is the strongest match.",
      clues: ["Nucleus present", "Flexible membrane", "No cell wall", "No chloroplasts"]
    },
    "yogurt-culture": {
      title: "Yogurt Culture",
      copy: "Rod-shaped cells and short chains of round cells, shown without visible internal structures, point toward bacteria.",
      specimen: "yogurt-culture",
      verdict: "Verdict: Bacterial Cell",
      verdictCopy: "Rods and chains of cocci are consistent with bacteria commonly used in yogurt cultures. Shape alone does not identify a species, and the absence of a nucleus cannot be established from this illustration alone.",
      clues: ["Internal structures not resolved", "Yogurt culture source", "Rod-shaped and round bodies", "DNA cannot be resolved in this view"]
    },
    "root-hair": {
      title: "Root Hair Cell",
      copy: "A plant cell with a long extension is specialized for absorbing water and minerals. Underground root cells have no chloroplasts since they get no sunlight.",
      specimen: "root-hair",
      verdict: "Verdict: Specialized Plant Cell",
      verdictCopy: "The cell wall says plant, the long extension shows specialization for absorption, and the missing chloroplasts fit a cell that lives underground.",
      clues: ["Cell wall visible", "Large surface-area extension", "One continuous cell with a nucleus", "No chloroplasts (no sunlight underground)"]
    }
  };

  function setInspector(organelleKey) {
    const data = ORGANELLE_INFO[organelleKey];
    if (!inspector || !inspectorTitle || !inspectorCopy || !data) return;
    inspectorTitle.textContent = data.title;
    inspectorCopy.textContent = data.copy;
    inspector.classList.add("is-visible");
  }

  function setLinkedOrganelle(organelleKey) {
    organelleCards.forEach((card) => {
      card.classList.toggle("is-linked", card.dataset.organelle === organelleKey);
    });
    organelleNodes.forEach((node) => {
      node.classList.toggle("is-linked", node.dataset.organelle === organelleKey);
    });
  }

  function resetLinkedOrganelle() {
    organelleCards.forEach((card) => card.classList.remove("is-linked"));
    organelleNodes.forEach((node) => node.classList.remove("is-linked"));
  }

  function renderSample(sampleKey) {
    const data = SAMPLE_DATA[sampleKey];
    if (!data || !clueList) return;

    specimenDiagrams.forEach((svg) => {
      svg.classList.toggle("is-active", svg.dataset.specimen === data.specimen);
    });
    sampleReadoutTitle.textContent = data.title;
    sampleReadoutCopy.textContent = data.copy;
    verdictTitle.textContent = data.verdict;
    verdictCopy.textContent = data.verdictCopy;

    clueList.replaceChildren();
    data.clues.forEach((clue) => {
      const chip = document.createElement("div");
      chip.className = "clue-chip";
      chip.textContent = clue;
      clueList.append(chip);
    });

    sampleButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.sample === sampleKey ? "true" : "false");
    });
  }

  function renderMorph(type) {
    if (!morphTitle || !morphCopy) return;
    morphDiagrams.forEach((svg) => {
      svg.classList.toggle("is-active", svg.dataset.morphDiagram === type);
    });
    morphTitle.textContent = MORPH_DATA[type].title;
    morphCopy.textContent = MORPH_DATA[type].copy;
    morphButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.morph === type ? "true" : "false");
    });
  }

  function renderCell(cellKey) {
    const data = CELL_DATA[cellKey];
    document.getElementById("focus-title").textContent = data.title;
    document.getElementById("focus-description").textContent = data.description;
    document.getElementById("focus-type").textContent = data.type;
    document.getElementById("focus-structures").textContent = data.structures;
    document.getElementById("focus-organism").textContent = data.organism;
    document.getElementById("focus-idea").textContent = data.idea;

    cellDiagrams.forEach((svg) => {
      svg.classList.toggle("is-active", svg.dataset.cellDiagram === data.diagram);
    });

    compareButtons.forEach((button) => {
      const active = button.dataset.cell === cellKey;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const structureKeys = {
      bacteria: ["cell-wall", "nucleoid", "ribosomes", "flagellum"],
      animal: ["nucleus", "mitochondria", "ribosomes"],
      plant: ["cell-wall", "nucleus", "chloroplasts", "mitochondria", "vacuole"]
    };
    const controls = document.getElementById("structure-controls");
    controls.replaceChildren();
    structureKeys[cellKey].forEach((key) => {
      const button = document.createElement("button");
      button.className = "compare-btn";
      button.type = "button";
      button.textContent = ORGANELLE_INFO[key].title;
      button.addEventListener("click", () => { setInspector(key); setLinkedOrganelle(key); });
      controls.append(button);
    });
    resetLinkedOrganelle();
    setInspector(data.defaultOrganelle);
  }

  compareButtons.forEach((button) => {
    button.addEventListener("click", () => renderCell(button.dataset.cell));
  });

  organelleNodes.forEach((node) => {
    node.addEventListener("click", () => {
      const organelleKey = node.dataset.organelle;
      if (!organelleKey) return;
      setInspector(organelleKey);
      setLinkedOrganelle(organelleKey);
    });
  });

  organelleCards.forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
    card.addEventListener("mouseenter", () => {
      const organelleKey = card.dataset.organelle;
      if (!organelleKey) return;
      setLinkedOrganelle(organelleKey);
    });
    card.addEventListener("mouseleave", resetLinkedOrganelle);
    card.addEventListener("focusin", () => {
      const organelleKey = card.dataset.organelle;
      if (!organelleKey) return;
      setLinkedOrganelle(organelleKey);
    });
    card.addEventListener("focusout", resetLinkedOrganelle);
    card.addEventListener("click", () => {
      const organelleKey = card.dataset.organelle;
      if (!organelleKey) return;
      setInspector(organelleKey);
      setLinkedOrganelle(organelleKey);
    });
  });

  morphButtons.forEach((button) => {
    button.addEventListener("click", () => renderMorph(button.dataset.morph));
  });

  sampleButtons.forEach((button) => {
    button.addEventListener("click", () => renderSample(button.dataset.sample));
  });

  renderCell("bacteria");
  renderMorph("animal");
  renderSample("pond-leaf");

  document.querySelectorAll(".quiz-card").forEach((card) => {
    const answer = card.dataset.answer;
    const feedback = card.querySelector(".quiz-feedback");
    card.querySelectorAll(".quiz-option").forEach((button) => {
      button.addEventListener("click", () => {
        const choice = button.dataset.choice;
        const correct = choice === answer;
        card.classList.toggle("is-correct", correct);
        card.classList.toggle("is-wrong", !correct);
        feedback.textContent = correct
          ? "Correct. That clue set matches " + button.textContent + "."
          : "Not quite. Re-check the clues for nucleus, wall, chloroplasts, or function.";
      });
    });
  });
})();
