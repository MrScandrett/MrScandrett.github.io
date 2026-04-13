/**
 * AnimalSorter
 * Interactive drag-and-drop classification game for sorting animals by characteristics
 *
 * Usage:
 *   const sorter = new AnimalSorter('#container-id', { options });
 */

class AnimalSorter {
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error(`Container not found: ${containerSelector}`);
      return;
    }

    // Configuration
    this.options = {
      showHabitatMode: options.showHabitatMode !== false,
      animateSnapDuration: options.animateSnapDuration || 300,
      celebrationDuration: options.celebrationDuration || 1500,
      feedbackDuration: 500
    };

    // Game state
    this.animals = this.initializeAnimals();
    this.zones = {
      vertebrate: [],
      invertebrate: [],
      ocean: [],
      forest: [],
      desert: []
    };
    this.correctMappings = this.initializeCorrectMappings();
    this.currentDraggedCard = null;
    this.placedAnimals = new Set();

    // Initialize the game
    this.init();
  }

  /**
   * Initialize all 23 animal data with IDs, names, descriptions, and classifications
   */
  initializeAnimals() {
    return [
      // VERTEBRATES - FISH (3)
      { id: 'salmon', name: 'Salmon', desc: 'Fish that lives in rivers and oceans', type: 'vertebrate', subtype: 'fish', habitat: 'ocean' },
      { id: 'clownfish', name: 'Clownfish', desc: 'Small colorful fish that lives near coral reefs', type: 'vertebrate', subtype: 'fish', habitat: 'ocean' },
      { id: 'seahorse', name: 'Seahorse', desc: 'Tiny fish with a curved tail and horse-like head', type: 'vertebrate', subtype: 'fish', habitat: 'ocean' },

      // VERTEBRATES - AMPHIBIANS (2)
      { id: 'frog', name: 'Frog', desc: 'Hopping amphibian with smooth, moist skin', type: 'vertebrate', subtype: 'amphibian', habitat: 'forest' },
      { id: 'salamander', name: 'Salamander', desc: 'Small amphibian that looks like a lizard with moist skin', type: 'vertebrate', subtype: 'amphibian', habitat: 'forest' },

      // VERTEBRATES - REPTILES (3)
      { id: 'snake', name: 'Snake', desc: 'Long reptile with no legs and dry, scaly skin', type: 'vertebrate', subtype: 'reptile', habitat: 'desert' },
      { id: 'turtle', name: 'Turtle', desc: 'Reptile with a hard shell and four short legs', type: 'vertebrate', subtype: 'reptile', habitat: 'desert' },
      { id: 'crocodile', name: 'Crocodile', desc: 'Large reptile with sharp teeth and scaly skin', type: 'vertebrate', subtype: 'reptile', habitat: 'ocean' },

      // VERTEBRATES - BIRDS (3)
      { id: 'eagle', name: 'Eagle', desc: 'Large bird of prey with strong wings and sharp talons', type: 'vertebrate', subtype: 'bird', habitat: 'forest' },
      { id: 'penguin', name: 'Penguin', desc: 'Black and white bird that swims instead of flies', type: 'vertebrate', subtype: 'bird', habitat: 'ocean' },
      { id: 'parrot', name: 'Parrot', desc: 'Colorful bird that can mimic sounds and words', type: 'vertebrate', subtype: 'bird', habitat: 'forest' },

      // VERTEBRATES - MAMMALS (3)
      { id: 'whale', name: 'Whale', desc: 'Largest animal on Earth that lives in the ocean', type: 'vertebrate', subtype: 'mammal', habitat: 'ocean' },
      { id: 'lion', name: 'Lion', desc: 'Large furry mammal with a golden mane that hunts in groups', type: 'vertebrate', subtype: 'mammal', habitat: 'forest' },
      { id: 'bat', name: 'Bat', desc: 'Furry mammal with wings that flies at night', type: 'vertebrate', subtype: 'mammal', habitat: 'forest' },

      // INVERTEBRATES (6)
      { id: 'octopus', name: 'Octopus', desc: 'Ocean animal with eight long arms and no backbone', type: 'invertebrate', subtype: 'cephalopod', habitat: 'ocean' },
      { id: 'starfish', name: 'Starfish', desc: 'Star-shaped ocean animal with no backbone', type: 'invertebrate', subtype: 'echinoderm', habitat: 'ocean' },
      { id: 'beetle', name: 'Beetle', desc: 'Insect with a hard shell and six legs', type: 'invertebrate', subtype: 'insect', habitat: 'forest' },
      { id: 'ant', name: 'Ant', desc: 'Tiny insect that works in large colonies', type: 'invertebrate', subtype: 'insect', habitat: 'forest' },
      { id: 'jellyfish', name: 'Jellyfish', desc: 'Soft ocean animal with no backbone or brain', type: 'invertebrate', subtype: 'cnidarian', habitat: 'ocean' },
      { id: 'snail', name: 'Snail', desc: 'Slow-moving animal with a spiral shell', type: 'invertebrate', subtype: 'mollusk', habitat: 'forest' }
    ];
  }

  /**
   * Define correct mappings for validation
   */
  initializeCorrectMappings() {
    return {
      vertebrate: new Set(['salmon', 'clownfish', 'seahorse', 'frog', 'salamander', 'snake', 'turtle', 'crocodile', 'eagle', 'penguin', 'parrot', 'whale', 'lion', 'bat']),
      invertebrate: new Set(['octopus', 'starfish', 'beetle', 'ant', 'jellyfish', 'snail']),
      ocean: new Set(['salmon', 'clownfish', 'seahorse', 'crocodile', 'penguin', 'whale', 'octopus', 'starfish', 'jellyfish']),
      forest: new Set(['frog', 'salamander', 'eagle', 'parrot', 'lion', 'bat', 'beetle', 'ant', 'snail']),
      desert: new Set(['snake', 'turtle'])
    };
  }

  /**
   * Initialize the game UI and attach event listeners
   */
  init() {
    this.renderAnimalPool();
    this.renderDropZones();
    this.attachEventListeners();
  }

  /**
   * Render the draggable animal cards in the pool
   */
  renderAnimalPool() {
    const pool = this.container.querySelector('#animal-pool');
    pool.innerHTML = '';

    this.animals.forEach(animal => {
      const card = document.createElement('div');
      card.className = 'animal-card';
      card.draggable = true;
      card.dataset.animalId = animal.id;
      card.dataset.animalType = animal.type;

      card.innerHTML = `
        <div class="animal-card-name">${animal.name}</div>
        <div class="animal-card-desc">${animal.desc}</div>
      `;

      card.addEventListener('dragstart', (e) => this.onDragStart(e));
      card.addEventListener('dragend', (e) => this.onDragEnd(e));

      pool.appendChild(card);
    });
  }

  /**
   * Render the drop zones for sorting
   */
  renderDropZones() {
    const container = this.container.querySelector('#drop-zones-container');
    container.innerHTML = '';

    // Vertebrate/Invertebrate zones
    const classificationRow = document.createElement('div');
    classificationRow.className = 'drop-zones-row';

    const vertZone = this.createDropZone('vertebrate', 'Vertebrates', 'Animals with a backbone');
    const invertZone = this.createDropZone('invertebrate', 'Invertebrates', 'Animals without a backbone');

    classificationRow.appendChild(vertZone);
    classificationRow.appendChild(invertZone);
    container.appendChild(classificationRow);

    // Habitat zones (if enabled)
    if (this.options.showHabitatMode) {
      const habitatLabel = document.createElement('div');
      habitatLabel.className = 'habitat-section-label';
      habitatLabel.textContent = 'Challenge: Can you also sort by habitat?';
      container.appendChild(habitatLabel);

      const habitatRow = document.createElement('div');
      habitatRow.className = 'drop-zones-row habitat-row';

      const oceanZone = this.createDropZone('ocean', '🌊 Ocean', 'Saltwater homes');
      const forestZone = this.createDropZone('forest', '🌳 Forest', 'Land with trees');
      const desertZone = this.createDropZone('desert', '🏜️ Desert', 'Hot, dry land');

      habitatRow.appendChild(oceanZone);
      habitatRow.appendChild(forestZone);
      habitatRow.appendChild(desertZone);
      container.appendChild(habitatRow);
    }
  }

  /**
   * Create a single drop zone element
   */
  createDropZone(zoneId, label, sublabel) {
    const zone = document.createElement('div');
    zone.className = 'drop-zone';
    zone.dataset.zone = zoneId;
    zone.setAttribute('aria-label', `Drop zone for ${label}`);

    zone.innerHTML = `
      <div class="drop-zone-label">${label}</div>
      <div class="drop-zone-sublabel">${sublabel}</div>
      <div class="drop-zone-content" data-zone="${zoneId}"></div>
    `;

    zone.addEventListener('dragover', (e) => this.onDragOver(e));
    zone.addEventListener('drop', (e) => this.onDrop(e));
    zone.addEventListener('dragleave', (e) => this.onDragLeave(e));

    return zone;
  }

  /**
   * Handle drag start event
   */
  onDragStart(event) {
    this.currentDraggedCard = event.target.closest('.animal-card');
    this.currentDraggedCard.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.target.innerHTML);
  }

  /**
   * Handle drag end event
   */
  onDragEnd(event) {
    const card = event.target.closest('.animal-card');
    if (card) {
      card.classList.remove('dragging');
    }
    this.currentDraggedCard = null;

    // Remove drag-over styling from all zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.classList.remove('drag-over');
    });
  }

  /**
   * Handle drag over event
   */
  onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const zone = event.target.closest('.drop-zone');
    if (zone) {
      zone.classList.add('drag-over');
    }
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event) {
    const zone = event.target.closest('.drop-zone');
    if (zone && !zone.contains(event.relatedTarget)) {
      zone.classList.remove('drag-over');
    }
  }

  /**
   * Handle drop event
   */
  onDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const zone = event.target.closest('.drop-zone');
    if (!zone || !this.currentDraggedCard) return;

    const zoneId = zone.dataset.zone;
    const animalId = this.currentDraggedCard.dataset.animalId;
    const animal = this.animals.find(a => a.id === animalId);

    zone.classList.remove('drag-over');

    // Validate placement
    const isCorrect = this.validatePlacement(animalId, zoneId);

    if (isCorrect) {
      // Remove from other zones if it exists
      this.removeAnimalFromAllZones(animalId);

      // Add to this zone
      this.zones[zoneId].push(animalId);
      this.placedAnimals.add(animalId);

      // Animate the card to the zone
      this.animateCardToZone(this.currentDraggedCard, zone, animal.name);

      // Show success feedback
      this.showFeedback('correct', `✓ ${animal.name} is correct!`);

      // Check if all animals are sorted
      setTimeout(() => this.checkCompletion(), this.options.animateSnapDuration);
    } else {
      // Show error feedback and bounce card back
      this.showFeedback('incorrect', `✗ ${animal.name} doesn't belong here. Try again!`);
      this.animateCardBounceBack(this.currentDraggedCard);
    }
  }

  /**
   * Validate if an animal placement in a zone is correct
   */
  validatePlacement(animalId, zoneId) {
    return this.correctMappings[zoneId] && this.correctMappings[zoneId].has(animalId);
  }

  /**
   * Remove an animal from all zones
   */
  removeAnimalFromAllZones(animalId) {
    Object.keys(this.zones).forEach(zone => {
      const index = this.zones[zone].indexOf(animalId);
      if (index > -1) {
        this.zones[zone].splice(index, 1);
        const element = document.querySelector(`[data-zone="${zone}"] .drop-zone-content [data-animal-id="${animalId}"]`);
        if (element) {
          element.remove();
        }
      }
    });
  }

  /**
   * Animate a card from the pool to a drop zone
   */
  animateCardToZone(cardElement, zoneElement, animalName) {
    const zoneId = zoneElement.dataset.zone;
    const zoneContent = zoneElement.querySelector('.drop-zone-content');

    // Create a visual copy in the zone
    const zonedCard = document.createElement('div');
    zonedCard.className = 'zoned-animal-card';
    zonedCard.dataset.animalId = cardElement.dataset.animalId;
    zonedCard.textContent = animalName;

    zonedCard.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeAnimalFromZone(cardElement.dataset.animalId, zoneId);
    });

    zoneContent.appendChild(zonedCard);

    // Fade out original card
    cardElement.style.opacity = '0.3';
    cardElement.style.pointerEvents = 'none';
    cardElement.classList.add('placed');

    // Highlight zone briefly
    zoneElement.classList.add('correct-placement');
    setTimeout(() => {
      zoneElement.classList.remove('correct-placement');
    }, this.options.feedbackDuration);
  }

  /**
   * Animate card bouncing back to pool
   */
  animateCardBounceBack(cardElement) {
    cardElement.classList.add('bounce-back');
    setTimeout(() => {
      cardElement.classList.remove('bounce-back');
    }, this.options.feedbackDuration);
  }

  /**
   * Remove an animal from a zone (e.g., when clicked on the zoned card)
   */
  removeAnimalFromZone(animalId, zoneId) {
    const index = this.zones[zoneId].indexOf(animalId);
    if (index > -1) {
      this.zones[zoneId].splice(index, 1);
      this.placedAnimals.delete(animalId);

      const zoneElement = document.querySelector(`[data-zone="${zoneId}"]`);
      const zonedCard = zoneElement.querySelector(`[data-animal-id="${animalId}"]`);
      if (zonedCard) {
        zonedCard.remove();
      }

      const poolCard = document.querySelector(`[data-animal-id="${animalId}"]`);
      if (poolCard) {
        poolCard.style.opacity = '1';
        poolCard.style.pointerEvents = 'auto';
        poolCard.classList.remove('placed');
      }

      this.showFeedback('info', 'Card returned to the pool.');
    }
  }

  /**
   * Show feedback message to the user
   */
  showFeedback(type, message) {
    const feedbackElement = this.container.querySelector('#sorter-feedback');
    feedbackElement.textContent = message;
    feedbackElement.className = `sorter-feedback sorter-feedback-${type}`;

    setTimeout(() => {
      feedbackElement.textContent = '';
      feedbackElement.className = 'sorter-feedback';
    }, this.options.feedbackDuration);
  }

  /**
   * Check if all animals are correctly sorted
   */
  checkCompletion() {
    const allCorrectlyPlaced = this.animals.every(animal => {
      const correctZone = this.findCorrectZoneForAnimal(animal.id);
      return this.zones[correctZone] && this.zones[correctZone].includes(animal.id);
    });

    if (allCorrectlyPlaced) {
      this.showCompletion();
    }
  }

  /**
   * Find the "most correct" zone for an animal (prioritize vertebrate/invertebrate)
   */
  findCorrectZoneForAnimal(animalId) {
    if (this.correctMappings.vertebrate.has(animalId)) return 'vertebrate';
    if (this.correctMappings.invertebrate.has(animalId)) return 'invertebrate';
    return null;
  }

  /**
   * Show completion message and celebration
   */
  showCompletion() {
    const feedbackElement = this.container.querySelector('#sorter-feedback');
    feedbackElement.innerHTML = '🎉 <strong>Excellent!</strong> All animals are correctly sorted!';
    feedbackElement.className = 'sorter-feedback sorter-feedback-celebration';

    // Add celebration effect to the game container
    this.container.classList.add('completion-celebration');
    setTimeout(() => {
      this.container.classList.remove('completion-celebration');
    }, this.options.celebrationDuration);

    // Disable dragging after completion
    document.querySelectorAll('.animal-card').forEach(card => {
      if (card.classList.contains('placed')) {
        card.draggable = false;
      }
    });
  }

  /**
   * Reset the game to initial state
   */
  reset() {
    // Clear zones
    Object.keys(this.zones).forEach(zone => {
      this.zones[zone] = [];
    });
    this.placedAnimals.clear();

    // Reset animal cards
    document.querySelectorAll('.animal-card').forEach(card => {
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto';
      card.classList.remove('placed');
      card.draggable = true;
    });

    // Clear zone contents
    document.querySelectorAll('.drop-zone-content').forEach(content => {
      content.innerHTML = '';
    });

    // Clear feedback
    const feedbackElement = this.container.querySelector('#sorter-feedback');
    feedbackElement.textContent = '';
    feedbackElement.className = 'sorter-feedback';

    this.showFeedback('info', 'Game reset. Start sorting again!');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const resetBtn = this.container.querySelector('#sorter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.reset());
    }
  }
}
