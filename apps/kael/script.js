const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const bgCanvas = document.createElement('canvas');
const bgCtx = bgCanvas.getContext('2d');
const fx = new window.XenoGraphics.NeonRenderer();

const statsEl = document.getElementById('stats');
const logEl = document.getElementById('log');
const lab = document.getElementById('lab');
const genomeView = document.getElementById('genomeView');
const labId = document.getElementById('labId');
const forceSpikesEl = document.getElementById('forceSpikes');
const forceBiolumeEl = document.getElementById('forceBiolume');
const applyForceBtn = document.getElementById('applyForce');
const closeLabBtn = document.getElementById('closeLab');
const keplerCanvas = document.getElementById('keplerCanvas');
const keplerCtx = keplerCanvas.getContext('2d');
const lineageView = document.getElementById('lineageView');
const goalEl = document.getElementById('goal');
const pauseBtn = document.getElementById('pauseBtn');
const speedSelect = document.getElementById('speedSelect');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const newWorldBtn = document.getElementById('newWorldBtn');
const toolHint = document.getElementById('toolHint');
const toastEl = document.getElementById('toast');
const historyCanvas = document.getElementById('historyCanvas');
const historyCtx = historyCanvas.getContext('2d');
const herdOverlayEl = document.getElementById('herdOverlay');
const chronicleEntriesEl = document.getElementById('chronicleEntries');
const lifeView = document.getElementById('lifeView');
const qualitySelect = document.getElementById('qualitySelect');

const settings = {
    shadows: true,
    graphicsQuality: 'high',
    maxCreatures: 260,
    maxPlants: 360,
    maxMushrooms: 60
};

const PALETTE = {
    void: '#040610',
    midnight: '#081427',
    deepBlue: '#123251',
    neonBlue: '#34f6ff',
    algae: '#7bf6a6',
    amber: '#ffcf6d',
    coral: '#ff8c69',
    magenta: '#ff5ebc'
};

const SEASON_LENGTH = 24;
const SAVE_KEY = 'xeno-ecosystem-upgrade-run-1';
const BIOMES = [
    { name: 'Fungal Verge', color: '#8f5eff', plantGrowth: 0.82, shelter: 1.35, metabolism: 0.96 },
    { name: 'Crystal Plains', color: '#34f6ff', plantGrowth: 1.24, shelter: 0.9, metabolism: 1 },
    { name: 'Ember Reach', color: '#ff765f', plantGrowth: 0.72, shelter: 0.78, metabolism: 1.12 }
];
const SEASONS = [
    { name: 'Glitter Spring', plantGrowth: 1.45, mushroomGrowth: 1.1, reproduction: 1.18, lightBoost: 0.24 },
    { name: 'Ion Summer', plantGrowth: 1.05, mushroomGrowth: 0.88, reproduction: 1.0, lightBoost: 0.12 },
    { name: 'Rust Fall', plantGrowth: 0.8, mushroomGrowth: 1.25, reproduction: 0.86, lightBoost: 0.04 },
    { name: 'Ash Winter', plantGrowth: 0.55, mushroomGrowth: 0.72, reproduction: 0.68, lightBoost: -0.1 }
];

const EVENT_BLUEPRINTS = [
    {
        type: 'solar_flare',
        name: 'Solar Flare',
        color: '#ffb347',
        pressure: 0.18,
        duration: [10, 15],
        message: 'Radiation spikes across the basin.'
    },
    {
        type: 'spore_bloom',
        name: 'Spore Bloom',
        color: '#9bff8a',
        pressure: 0.08,
        duration: [14, 20],
        message: 'Mycelial towers rupture through the ground.'
    },
    {
        type: 'void_eclipse',
        name: 'Void Eclipse',
        color: '#6f7cff',
        pressure: 0.2,
        duration: [12, 18],
        message: 'The sky dims and hunters gain the edge.'
    },
    {
        type: 'gravity_shear',
        name: 'Gravity Shear',
        color: '#56d8ff',
        pressure: 0.24,
        duration: [9, 13],
        message: 'Tidal forces bend every migration path.'
    },
    {
        type: 'meteor_dust',
        name: 'Meteor Dust',
        color: '#ff6e63',
        pressure: 0.28,
        duration: [10, 14],
        message: 'Charged dust abrasively sweeps the biome.'
    }
];

let creatures = [];
let plants = [];
let mushrooms = [];
let particles = [];
let nests = [];
let herds = [];
let speciesCatalog = [];
let selectedCreature = null;
let nextCreatureId = 1;
let nextHerdId = 1;
let nextNestId = 1;
let nextSpeciesId = 1;
let simulationPaused = false;
let simulationSpeed = 1;
let activeTool = 'inspect';
let rngState = 0x6d2b79f5;
let toastTimer = null;

const environment = {
    time: 0,
    stars: [],
    speckles: [],
    rocks: [],
    ridges: [],
    foregroundRocks: [],
    nebulae: [],
    terrainVeins: [],
    currentEvent: null,
    cosmicPressure: 0,
    lastEventAt: -9999,
    lastExtinctionAt: -9999,
    births: 0,
    deaths: 0,
    interventions: 0,
    eventFeed: [],
    history: [],
    lastHistoryAt: -9999,
    missionCompleted: false,
    lastHerdUpdateAt: -9999,
    firstNestRecorded: false,
    firstHuntRecorded: false
};

function simRandom() {
    rngState = (rngState + 0x6d2b79f5) | 0;
    let value = rngState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
    return min + simRandom() * (max - min);
}

function getBiomeAt(x) {
    const { width } = viewport();
    return BIOMES[Math.min(BIOMES.length - 1, Math.floor((x / Math.max(1, width)) * BIOMES.length))];
}

function notify(message) {
    toastEl.innerText = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function recordEvent(message) {
    environment.eventFeed.unshift({ time: Math.floor(environment.time), message });
    environment.eventFeed.length = Math.min(environment.eventFeed.length, 12);
}

function makeLineageName(species) {
    const starts = ['Ae', 'Cyr', 'Ixo', 'Kel', 'Nym', 'Ora', 'Vex', 'Zel'];
    const ends = ['ari', 'oid', 'une', 'yx', 'ora', 'eth', 'ali', 'ion'];
    return `${starts[Math.floor(simRandom() * starts.length)]}${ends[Math.floor(simRandom() * ends.length)]} ${species === 1 ? 'Stalker' : 'Grazer'}`;
}

function makeHerdName() {
    const qualities = ['Glimmer', 'Quiet', 'Far', 'Silver', 'Ember', 'Dawn', 'Hollow', 'Star'];
    const forms = ['Drift', 'Caravan', 'Choir', 'Trail', 'Gathering', 'Wayfarers'];
    return `${qualities[Math.floor(simRandom() * qualities.length)]} ${forms[Math.floor(simRandom() * forms.length)]}`;
}

function makeSpeciesName(biomeName) {
    const roots = ['Velari', 'Nyxen', 'Corune', 'Asteri', 'Lumari', 'Thalyn', 'Orivex'];
    const epithet = biomeName === 'Fungal Verge' ? 'Mycora' : biomeName === 'Ember Reach' ? 'Cindervane' : 'Crystalis';
    return `${roots[Math.floor(simRandom() * roots.length)]} ${epithet}`;
}

function hexToRgba(hex, alpha = 1) {
    const raw = hex.replace('#', '');
    const parts = raw.length === 3
        ? raw.split('').map((part) => parseInt(part + part, 16))
        : [raw.slice(0, 2), raw.slice(2, 4), raw.slice(4, 6)].map((part) => parseInt(part, 16));
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}

function viewport() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    return {
        dpr,
        width: canvas.width / dpr,
        height: canvas.height / dpr
    };
}

function groundBand(height) {
    return {
        minY: height * 0.42,
        maxY: height - 16
    };
}

function angleTowards(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
}

function angleAway(ax, ay, bx, by) {
    return Math.atan2(ay - by, ax - bx);
}

function lerpAngle(current, target, amount) {
    const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + delta * amount;
}

function safeEllipse(context, x, y, rx, ry, rotation = 0, start = 0, end = Math.PI * 2) {
    if (typeof context.ellipse === 'function') {
        context.ellipse(x, y, rx, ry, rotation, start, end);
        return;
    }
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.scale(rx, ry);
    context.arc(0, 0, 1, start, end);
    context.restore();
}

function getCurrentSeason() {
    const index = Math.floor(environment.time / SEASON_LENGTH) % SEASONS.length;
    return SEASONS[index];
}

function getWorldModifiers() {
    const season = getCurrentSeason();
    const modifiers = {
        season,
        plantGrowth: season.plantGrowth,
        mushroomGrowth: season.mushroomGrowth,
        reproduction: season.reproduction,
        predatorRange: 1,
        preySpeed: 1,
        energyTax: 1,
        turbulence: 0,
        lightBoost: season.lightBoost,
        shelterBoost: 1
    };

    if (!environment.currentEvent) {
        return modifiers;
    }

    switch (environment.currentEvent.type) {
        case 'solar_flare':
            modifiers.plantGrowth += 1.1;
            modifiers.energyTax += 0.12;
            modifiers.lightBoost += 0.24;
            break;
        case 'spore_bloom':
            modifiers.plantGrowth += 0.55;
            modifiers.mushroomGrowth += 1.5;
            modifiers.reproduction += 0.08;
            modifiers.shelterBoost += 0.25;
            break;
        case 'void_eclipse':
            modifiers.plantGrowth -= 0.35;
            modifiers.predatorRange += 0.32;
            modifiers.preySpeed -= 0.08;
            modifiers.lightBoost -= 0.22;
            break;
        case 'gravity_shear':
            modifiers.turbulence += 0.5;
            modifiers.reproduction -= 0.25;
            modifiers.energyTax += 0.08;
            break;
        case 'meteor_dust':
            modifiers.plantGrowth -= 0.6;
            modifiers.turbulence += 0.16;
            modifiers.energyTax += 0.1;
            break;
        case 'extinction_shock':
            modifiers.plantGrowth += 0.3;
            modifiers.reproduction -= 0.2;
            modifiers.turbulence += 0.18;
            modifiers.lightBoost -= 0.16;
            break;
        default:
            break;
    }

    modifiers.plantGrowth = Math.max(0.2, modifiers.plantGrowth);
    modifiers.mushroomGrowth = Math.max(0.2, modifiers.mushroomGrowth);
    modifiers.reproduction = Math.max(0.2, modifiers.reproduction);
    modifiers.preySpeed = Math.max(0.75, modifiers.preySpeed);
    return modifiers;
}

function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    bgCanvas.width = Math.floor(window.innerWidth * dpr);
    bgCanvas.height = Math.floor(window.innerHeight * dpr);
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.resize(window.innerWidth, window.innerHeight, dpr);

    if (environment.speckles.length > 0) {
        generateBackdrop();
        buildBackground();
    }
}

window.addEventListener('resize', resizeCanvas);

function createPlant(x, y) {
    const { width, height } = viewport();
    const ground = groundBand(height);
    return {
        x: x ?? randomBetween(16, width - 16),
        y: y ?? randomBetween(ground.minY, ground.maxY),
        h: randomBetween(10, 28),
        sway: randomBetween(0, Math.PI * 2),
        pulse: randomBetween(0, Math.PI * 2),
        nutrition: randomBetween(22, 42),
        age: 0,
        lifespan: randomBetween(24, 52)
    };
}

function createMushroom(x, y) {
    const { width, height } = viewport();
    const ground = groundBand(height);
    return {
        x: x ?? randomBetween(24, width - 24),
        y: y ?? randomBetween(ground.minY + 12, ground.maxY),
        r: randomBetween(8, 24),
        growth: randomBetween(0.4, 1),
        vitality: randomBetween(0.55, 1.2),
        pulse: randomBetween(0, Math.PI * 2),
        age: 0,
        lifespan: randomBetween(28, 72)
    };
}

class Genome {
    constructor(species = 0) {
        this.species = species;
        if (species === 1) {
            this.speed = randomBetween(2.0, 3.1);
            this.range = randomBetween(110, 185);
            this.aggression = randomBetween(0.78, 0.98);
            this.fertility = randomBetween(0.4, 0.72);
            this.hasSpikes = simRandom() > 0.22;
            this.hasBiolume = simRandom() > 0.6;
        } else {
            this.speed = randomBetween(1.2, 2.3);
            this.range = randomBetween(78, 145);
            this.aggression = randomBetween(0.04, 0.18);
            this.fertility = randomBetween(0.78, 1.18);
            this.hasSpikes = simRandom() > 0.72;
            this.hasBiolume = simRandom() > 0.44;
        }
        this.forcedMutations = null;
        this.recalculateMetabolism();
    }

    recalculateMetabolism() {
        this.metabolism =
            this.speed * 0.36 +
            this.range * 0.004 +
            this.aggression * 0.6 +
            (this.species === 1 ? 0.52 : 0.18) +
            (this.hasBiolume ? 0.08 : 0) +
            (this.hasSpikes ? 0.05 : 0);
    }

    mutate() {
        const child = new Genome(this.species);
        const speedBounds = this.species === 1 ? [1.7, 3.6] : [0.9, 2.8];
        const rangeBounds = this.species === 1 ? [90, 205] : [60, 165];

        child.speed = clamp(this.speed + randomBetween(-0.25, 0.28), speedBounds[0], speedBounds[1]);
        child.range = clamp(this.range + randomBetween(-16, 20), rangeBounds[0], rangeBounds[1]);
        child.aggression = clamp(this.aggression + randomBetween(-0.06, 0.06), 0.02, 0.99);
        child.fertility = clamp(this.fertility + randomBetween(-0.1, 0.1), 0.25, 1.3);
        child.hasSpikes = simRandom() < 0.08 ? !this.hasSpikes : this.hasSpikes;
        child.hasBiolume = simRandom() < 0.11 ? !this.hasBiolume : this.hasBiolume;

        if (this.forcedMutations) {
            if (
                Object.prototype.hasOwnProperty.call(this.forcedMutations, 'hasSpikes') &&
                this.forcedMutations.hasSpikes !== 'inherit'
            ) {
                child.hasSpikes = this.forcedMutations.hasSpikes === true;
            }
            if (
                Object.prototype.hasOwnProperty.call(this.forcedMutations, 'hasBiolume') &&
                this.forcedMutations.hasBiolume !== 'inherit'
            ) {
                child.hasBiolume = this.forcedMutations.hasBiolume === true;
            }
        }

        child.forcedMutations = null;
        child.recalculateMetabolism();
        return child;
    }
}

class Creature {
    constructor(x, y, genome, options = {}) {
        const seeded = options.seeded === true;
        this.id = options.id ?? nextCreatureId++;
        nextCreatureId = Math.max(nextCreatureId, this.id + 1);
        this.parentId = options.parentId ?? null;
        this.generation = options.generation ?? 0;
        this.lineage = options.lineage ?? makeLineageName(genome.species);
        this.speciesName = options.speciesName ?? (genome.species === 1 ? 'Rift Stalker' : 'Aural Grazer');
        this.herdId = options.herdId ?? null;
        this.nestId = options.nestId ?? null;
        this.offspringIds = options.offspringIds ?? [];
        this.x = x;
        this.y = y;
        this.genome = genome;
        this.angle = randomBetween(0, Math.PI * 2);
        this.energy = options.energy ?? (seeded
            ? (genome.species === 1 ? randomBetween(120, 155) : randomBetween(82, 120))
            : (genome.species === 1 ? 112 : 88));
        this.age = options.age ?? (seeded ? randomBetween(0, genome.species === 1 ? 8 : 5) : 0);
        this.maxAge = genome.species === 1 ? randomBetween(55, 82) : randomBetween(42, 68);
        this.frame = randomBetween(0, Math.PI * 2);
        this.state = 'drift';
        this.panic = 0;
        this.hideTimer = 0;
        this.dead = false;
        this.deathReason = null;
        this.reproductionCooldown = randomBetween(3, 8);
        this.attackCooldown = randomBetween(0.1, 0.6);
        this.lastMealAt = -9999;
        this.socialNeed = options.socialNeed ?? randomBetween(0.2, 0.75);
        this.thought = 'explore';
        this.memory = options.memory ?? { food: null, danger: null, birthplace: { x, y, biome: getBiomeAt(x).name } };
        this.life = options.life ?? { meals: 0, escapes: 0, migrations: 0, offspring: 0 };
    }

    get isPredator() {
        return this.genome.species === 1;
    }

    get radius() {
        const base = this.isPredator ? 11 : 8;
        return base + (this.genome.aggression - 0.4) * 1.4;
    }

    shelterInfo() {
        return findNearestMushroom(this.x, this.y, 34);
    }

    isShelteredFrom(hunter) {
        if (this.isPredator || this.hideTimer <= 0) {
            return false;
        }
        const shelter = this.shelterInfo();
        if (!shelter || shelter.mushroom.growth < 0.55) {
            return false;
        }
        const biome = getBiomeAt(this.x);
        return shelter.dist < shelter.mushroom.r * 1.15 * biome.shelter &&
            distanceBetween(this.x, this.y, hunter.x, hunter.y) > 46 / biome.shelter;
    }

    moveForward(speed, dtSec) {
        this.x += Math.cos(this.angle) * speed * dtSec * 60 * 0.22;
        this.y += Math.sin(this.angle) * speed * dtSec * 60 * 0.22;
    }

    wander(dtSec, modifiers, pace) {
        const jitter = randomBetween(-0.12, 0.12) + Math.sin(environment.time * 0.8 + this.frame) * 0.04;
        this.angle += jitter * (1 + modifiers.turbulence);
        this.moveForward(this.genome.speed * pace, dtSec);
        this.state = 'drift';
    }

    eatPlant(target) {
        plants.splice(target.index, 1);
        this.energy = clamp(this.energy + target.plant.nutrition, 0, 225);
        this.lastMealAt = environment.time;
        this.memory.food = { x: target.plant.x, y: target.plant.y, time: environment.time, biome: getBiomeAt(target.plant.x).name };
        this.life.meals += 1;
        this.state = 'feed';
        spawnParticles(this.x, this.y, 10, PALETTE.amber);
    }

    attack(target) {
        if (this.attackCooldown > 0 || target.creature.dead) {
            return;
        }
        this.attackCooldown = clamp(0.95 - this.genome.aggression * 0.45, 0.28, 1.05);
        const damage = 65 + this.genome.aggression * 35 + (this.genome.hasSpikes ? 22 : 0);
        target.creature.energy -= damage;
        target.creature.panic = 1;
        this.energy = clamp(this.energy + 28 + damage * 0.34, 0, 250);
        this.lastMealAt = environment.time;
        this.state = 'hunt';
        spawnParticles(target.creature.x, target.creature.y, 16, PALETTE.coral);
        if (target.creature.energy <= 0) {
            target.creature.markDead('predation');
            if (!environment.firstHuntRecorded) {
                environment.firstHuntRecorded = true;
                recordEvent(`#${this.id} completed the world's first hunt`);
            }
        }
    }

    markDead(reason) {
        if (this.dead) {
            return;
        }
        this.dead = true;
        this.deathReason = reason;
        environment.deaths += 1;
        seedCorpseBloom(this.x, this.y, this.isPredator);
    }

    step(dtSec, modifiers) {
        if (this.dead) {
            return;
        }

        this.age += dtSec;
        this.frame += dtSec * (this.genome.speed * 3.2 + 2);
        this.reproductionCooldown = Math.max(0, this.reproductionCooldown - dtSec);
        this.attackCooldown = Math.max(0, this.attackCooldown - dtSec);
        this.hideTimer = Math.max(0, this.hideTimer - dtSec);

        const biome = getBiomeAt(this.x);
        const nearbyKin = findNearestCreature(
            this,
            (candidate) => candidate.genome.species === this.genome.species && !candidate.dead,
            54
        );
        this.socialNeed = clamp(this.socialNeed + dtSec * (nearbyKin ? -0.24 : 0.1), 0, 1);
        let metabolism = this.genome.metabolism * dtSec * modifiers.energyTax * biome.metabolism;
        if (nearbyKin && this.isPredator) {
            metabolism *= 0.96;
        }
        if (environment.currentEvent?.type === 'solar_flare' && this.genome.hasBiolume) {
            metabolism *= 0.88;
        }
        if (environment.currentEvent?.type === 'void_eclipse' && this.isPredator) {
            metabolism *= 0.93;
        }
        this.energy -= metabolism;

        if (this.isPredator) {
            this.stepPredator(dtSec, modifiers);
        } else {
            this.stepPrey(dtSec, modifiers);
        }

        const { width, height } = viewport();
        const ground = groundBand(height);
        this.x = (this.x + width) % width;
        this.y = clamp(this.y, ground.minY - 12, ground.maxY);

        if (this.age >= this.maxAge) {
            this.markDead('age');
        } else if (this.energy <= 0) {
            this.markDead('starvation');
        }
    }

    stepPrey(dtSec, modifiers) {
        const panicRange = this.genome.range * (1.2 + modifiers.predatorRange * 0.1);
        const predator = findNearestCreature(
            this,
            (candidate) => candidate.isPredator && !candidate.dead,
            panicRange
        );

        if (predator) {
            this.thought = 'danger';
            this.memory.danger = {
                x: predator.creature.x,
                y: predator.creature.y,
                time: environment.time,
                predatorId: predator.creature.id
            };
            if (this.panic < 0.15) this.life.escapes += 1;
            this.panic = clamp(this.panic + dtSec * 1.7, 0, 1);
            const shelter = findNearestMushroom(this.x, this.y, 120 * modifiers.shelterBoost);
            if (shelter && shelter.mushroom.growth > 0.35) {
                this.state = 'hide';
                this.angle = lerpAngle(this.angle, angleTowards(this.x, this.y, shelter.mushroom.x, shelter.mushroom.y), 0.22);
                this.moveForward(this.genome.speed * (1.15 + this.panic) * modifiers.preySpeed, dtSec);
                if (shelter.dist < shelter.mushroom.r * 1.15) {
                    this.hideTimer = Math.max(this.hideTimer, 2.5);
                }
            } else {
                this.state = 'flee';
                this.angle = lerpAngle(this.angle, angleAway(this.x, this.y, predator.creature.x, predator.creature.y), 0.2);
                this.moveForward(this.genome.speed * (1.4 + this.panic) * modifiers.preySpeed, dtSec);
            }
            return;
        }

        this.panic = clamp(this.panic - dtSec * 0.8, 0, 1);
        const herd = getHerdById(this.herdId);
        if (herd?.migrationTarget && this.energy > 58) {
            this.state = 'migrate';
            this.thought = 'kin';
            const offset = ((this.id % 5) - 2) * 9;
            this.angle = lerpAngle(
                this.angle,
                angleTowards(this.x, this.y, herd.migrationTarget.x, herd.migrationTarget.y + offset),
                0.1
            );
            this.moveForward(this.genome.speed * 0.72, dtSec);
            return;
        }

        const guardedNest = getNestById(this.nestId);
        if (guardedNest && this.energy > 76 && distanceBetween(this.x, this.y, guardedNest.x, guardedNest.y) > 25) {
            this.state = 'guard';
            this.thought = 'nest';
            this.angle = lerpAngle(this.angle, angleTowards(this.x, this.y, guardedNest.x, guardedNest.y), 0.1);
            this.moveForward(this.genome.speed * 0.5, dtSec);
            return;
        }

        const food = findNearestPlant(this.x, this.y, this.genome.range * (1 + modifiers.lightBoost * 0.25));
        if (food) {
            this.thought = 'food';
            this.state = 'forage';
            this.angle = lerpAngle(this.angle, angleTowards(this.x, this.y, food.plant.x, food.plant.y), 0.14);
            this.moveForward(this.genome.speed * 0.95, dtSec);
            if (food.dist < this.radius + 5) {
                this.eatPlant(food);
            }
            return;
        }

        const rememberedFood = this.memory.food;
        if (rememberedFood && environment.time - rememberedFood.time < 22 && distanceBetween(this.x, this.y, rememberedFood.x, rememberedFood.y) > 18) {
            this.state = 'remember';
            this.thought = 'memory';
            this.angle = lerpAngle(this.angle, angleTowards(this.x, this.y, rememberedFood.x, rememberedFood.y), 0.08);
            this.moveForward(this.genome.speed * 0.6, dtSec);
            return;
        }

        if (this.socialNeed > 0.68) {
            const companion = findNearestCreature(
                this,
                (candidate) => !candidate.isPredator && !candidate.dead,
                this.genome.range * 1.3
            );
            if (companion) {
                this.state = 'socialize';
                this.thought = 'kin';
                this.angle = lerpAngle(this.angle, angleTowards(this.x, this.y, companion.creature.x, companion.creature.y), 0.08);
                this.moveForward(this.genome.speed * 0.38, dtSec);
                return;
            }
        }

        this.thought = this.energy < 45 ? 'food' : 'explore';
        this.wander(dtSec, modifiers, 0.45);
    }

    stepPredator(dtSec, modifiers) {
        const hunger = clamp(1 - this.energy / 175, 0, 1);
        const huntRange = this.genome.range * (1.05 + hunger * 0.45) * modifiers.predatorRange;
        const prey = findNearestCreature(
            this,
            (candidate) => !candidate.isPredator && !candidate.dead && !candidate.isShelteredFrom(this),
            huntRange
        );

        if (prey) {
            this.thought = 'hunt';
            this.state = 'hunt';
            const turbulence = randomBetween(-0.12, 0.12) * modifiers.turbulence;
            this.angle = lerpAngle(
                this.angle,
                angleTowards(this.x, this.y, prey.creature.x, prey.creature.y) + turbulence,
                0.18
            );
            this.moveForward(this.genome.speed * (1.05 + hunger * 0.55), dtSec);
            if (prey.dist < this.radius + prey.creature.radius + 4) {
                this.attack(prey);
            }
            return;
        }

        this.thought = this.energy < 75 ? 'food' : (this.socialNeed > 0.7 ? 'pack' : 'explore');
        this.wander(dtSec, modifiers, 0.34);
    }

    draw() {
        const pulse = Math.sin(this.frame) * 1.2;
        const lineageHue = (this.lineage.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) * 17) % 360;
        const bodyColor = this.isPredator ? `hsl(${lineageHue}, 50%, 20%)` : `hsl(${lineageHue}, 46%, 22%)`;
        const accent = this.isPredator ? PALETTE.coral : PALETTE.neonBlue;
        const belly = this.isPredator ? '#7d2b48' : '#1b4f7a';
        const fin = this.isPredator ? '#ff6e63' : '#68d8ff';

        ctx.save();
        ctx.translate(this.x, this.y + pulse);
        ctx.rotate(this.angle);
        const growthScale = clamp(0.68 + (this.age / Math.max(1, this.maxAge * 0.18)) * 0.32, 0.68, 1);
        ctx.scale(growthScale, growthScale);

        if (settings.shadows) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
            ctx.beginPath();
            safeEllipse(ctx, 0, this.radius * 0.95, this.radius * 1.25, this.radius * 0.5);
            ctx.fill();
        }

        if (this.genome.hasBiolume) {
            ctx.shadowBlur = this.isPredator ? 12 : 16;
            ctx.shadowColor = accent;
        }

        const bodyLength = this.radius * (1.02 + this.genome.speed * 0.09);
        const bodyHeight = this.radius * (0.58 + this.genome.fertility * 0.1);
        const bodyGradient = ctx.createLinearGradient(-bodyLength, -bodyHeight, bodyLength, bodyHeight);
        bodyGradient.addColorStop(0, this.isPredator ? '#240915' : '#071827');
        bodyGradient.addColorStop(0.5, bodyColor);
        bodyGradient.addColorStop(1, this.isPredator ? '#8b304d' : '#276987');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        safeEllipse(ctx, 0, 0, bodyLength, bodyHeight);
        ctx.fill();

        ctx.strokeStyle = hexToRgba(accent, this.genome.hasBiolume ? 0.48 : 0.17);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        safeEllipse(ctx, 0, 0, bodyLength, bodyHeight);
        ctx.stroke();

        ctx.fillStyle = belly;
        ctx.beginPath();
        safeEllipse(ctx, 2, 1, this.radius * 0.68, this.radius * 0.36);
        ctx.fill();

        const limbSweep = Math.sin(this.frame * 0.72) * this.radius * 0.22;
        ctx.fillStyle = hexToRgba(fin, 0.76);
        [-1, 1].forEach((side) => {
            ctx.beginPath();
            ctx.moveTo(-this.radius * 0.08, side * bodyHeight * 0.72);
            ctx.quadraticCurveTo(
                -this.radius * 0.28 + limbSweep,
                side * this.radius * 1.28,
                this.radius * 0.35,
                side * bodyHeight * 0.82
            );
            ctx.quadraticCurveTo(0, side * bodyHeight, -this.radius * 0.08, side * bodyHeight * 0.72);
            ctx.fill();
        });

        ctx.save();
        ctx.globalAlpha = 0.2 + (this.genome.hasBiolume ? 0.18 : 0);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        const patternCount = 2 + (this.id % 3);
        for (let i = 0; i < patternCount; i += 1) {
            const patternX = -bodyLength * 0.42 + i * (bodyLength * 0.85 / Math.max(1, patternCount - 1));
            ctx.beginPath();
            ctx.moveTo(patternX, -bodyHeight * 0.72);
            ctx.quadraticCurveTo(patternX + 2, 0, patternX, bodyHeight * 0.72);
            ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = fin;
        ctx.beginPath();
        ctx.moveTo(-this.radius * 1.15, 0);
        const finLength = this.radius * (1.3 + this.genome.speed * 0.16);
        ctx.lineTo(-finLength, -this.radius * 0.5);
        ctx.lineTo(-finLength * 0.95, this.radius * 0.45);
        ctx.closePath();
        ctx.fill();

        if (this.genome.range > 118) {
            const antennaLength = clamp(this.genome.range * 0.055, 6, 11);
            const antennaWave = Math.sin(this.frame * 0.45) * 2;
            ctx.strokeStyle = hexToRgba(accent, 0.62);
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(this.radius * 0.6, -bodyHeight * 0.55);
            ctx.quadraticCurveTo(this.radius, -bodyHeight - 3, this.radius + antennaLength, -bodyHeight + antennaWave);
            ctx.stroke();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(this.radius + antennaLength, -bodyHeight + antennaWave, 1.3, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.genome.hasSpikes) {
            ctx.fillStyle = this.isPredator ? '#ffbe98' : '#89d3ff';
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(-3 + i * 5, -this.radius * 0.95);
                ctx.lineTo(-1 + i * 5, -this.radius * 1.55);
                ctx.lineTo(1 + i * 5, -this.radius * 0.95);
                ctx.closePath();
                ctx.fill();
            }
        }

        if (this.genome.hasBiolume) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = hexToRgba(accent, 0.28 + Math.sin(environment.time * 2 + this.frame) * 0.08);
            ctx.beginPath();
            ctx.arc(this.radius * 0.35, -1, this.isPredator ? 8 : 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(this.radius * 0.5, -1.5, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#f6fbff';
        ctx.beginPath();
        const eyeSize = clamp(this.genome.range / 75, 1.4, 2.7);
        ctx.arc(this.radius * 0.65, -1.5, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.isPredator ? '#12040a' : '#04111b';
        ctx.beginPath();
        ctx.arc(this.radius * 0.7, -1.6, 0.8, 0, Math.PI * 2);
        ctx.fill();

        if (this.state === 'hunt' || this.state === 'flee') {
            ctx.strokeStyle = hexToRgba(accent, 0.75);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            safeEllipse(ctx, 0, 0, this.radius * 1.45, this.radius * 0.95);
            ctx.stroke();
        }

        if (this.state === 'hide') {
            ctx.strokeStyle = hexToRgba('#d4ffd2', 0.5);
            ctx.lineWidth = 1;
            ctx.beginPath();
            safeEllipse(ctx, 0, 0, this.radius * 1.65, this.radius * 1.12);
            ctx.stroke();
        }

        if (this.state === 'socialize') {
            ctx.strokeStyle = hexToRgba('#a4ffc0', 0.5);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.45, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        if (this.genome.hasBiolume) {
            fx.addLight(this.x, this.y, this.isPredator ? 38 : 45, accent, this.isPredator ? 0.2 : 0.24);
        } else if (selectedCreature === this) {
            fx.addLight(this.x, this.y, 32, '#ffffff', 0.09);
        }

        if (selectedCreature === this || this.panic > 0.55) {
            const icons = { danger: '!', food: '◆', hunt: '!', kin: '♥', pack: '⌁', nest: '◇', memory: '?', explore: '·' };
            ctx.save();
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.thought === 'danger' ? PALETTE.coral : '#eaffff';
            ctx.fillText(icons[this.thought] || '·', this.x, this.y - this.radius * 2.1);
            ctx.restore();
        }
    }
}

function distanceBetween(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
}

function findNearestPlant(x, y, maxDistance) {
    let bestIndex = -1;
    let bestDistance = maxDistance;
    for (let i = 0; i < plants.length; i += 1) {
        const plant = plants[i];
        const distance = distanceBetween(x, y, plant.x, plant.y);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
        }
    }
    if (bestIndex === -1) {
        return null;
    }
    return { plant: plants[bestIndex], index: bestIndex, dist: bestDistance };
}

function findNearestMushroom(x, y, maxDistance) {
    let bestIndex = -1;
    let bestDistance = maxDistance;
    for (let i = 0; i < mushrooms.length; i += 1) {
        const mushroom = mushrooms[i];
        const distance = distanceBetween(x, y, mushroom.x, mushroom.y);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
        }
    }
    if (bestIndex === -1) {
        return null;
    }
    return { mushroom: mushrooms[bestIndex], index: bestIndex, dist: bestDistance };
}

function findNearestCreature(origin, predicate, maxDistance) {
    let best = null;
    let bestDistance = maxDistance;
    for (let i = 0; i < creatures.length; i += 1) {
        const candidate = creatures[i];
        if (candidate === origin || !predicate(candidate)) {
            continue;
        }
        const distance = distanceBetween(origin.x, origin.y, candidate.x, candidate.y);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = candidate;
        }
    }
    if (!best) {
        return null;
    }
    return { creature: best, dist: bestDistance };
}

function seedCorpseBloom(x, y, fromPredator) {
    const { width, height } = viewport();
    const ground = groundBand(height);
    const clampedX = clamp(x, 16, width - 16);
    const clampedY = clamp(y, ground.minY, ground.maxY);
    const sproutCount = fromPredator ? 3 : 2;

    for (let i = 0; i < sproutCount && plants.length < settings.maxPlants + 20; i += 1) {
        plants.push(createPlant(
            clamp(clampedX + randomBetween(-22, 22), 16, width - 16),
            clamp(clampedY + randomBetween(-12, 12), ground.minY, ground.maxY)
        ));
    }

    if (simRandom() < (fromPredator ? 0.45 : 0.28) && mushrooms.length < settings.maxMushrooms + 12) {
        mushrooms.push(createMushroom(
            clamp(clampedX + randomBetween(-16, 16), 24, width - 24),
            clamp(clampedY + randomBetween(-10, 10), ground.minY, ground.maxY)
        ));
    }

    spawnParticles(clampedX, clampedY, fromPredator ? 14 : 10, fromPredator ? PALETTE.coral : PALETTE.algae);
}

function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
        particles.push({
            x: x + randomBetween(-6, 6),
            y: y + randomBetween(-6, 6),
            vx: randomBetween(-1.2, 1.2),
            vy: randomBetween(-1.6, -0.1),
            life: randomBetween(18, 40),
            maxLife: 40,
            color,
            size: randomBetween(1.1, 2.7)
        });
    }
}

function buildBackground() {
    const { width, height } = viewport();
    bgCtx.save();
    bgCtx.setTransform(1, 0, 0, 1, 0, 0);
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.restore();

    const sky = bgCtx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#01030b');
    sky.addColorStop(0.55, '#071226');
    sky.addColorStop(1, '#020711');
    bgCtx.fillStyle = sky;
    bgCtx.fillRect(0, 0, width, height);

    if (settings.graphicsQuality !== 'low') {
        environment.nebulae.forEach((cloud) => fx.drawNebula(bgCtx, cloud));
    }

    environment.speckles.forEach((speckle) => {
        bgCtx.fillStyle = hexToRgba('#ffffff', speckle.alpha);
        bgCtx.fillRect(speckle.x, speckle.y, speckle.s, speckle.s);
    });

    const planetX = width * 0.72;
    const planetY = height * 0.22;
    const planetR = Math.min(width, height) * 0.16;
    const planetGlow = bgCtx.createRadialGradient(
        planetX - planetR * 0.35,
        planetY - planetR * 0.35,
        planetR * 0.08,
        planetX,
        planetY,
        planetR * 1.2
    );
    planetGlow.addColorStop(0, hexToRgba(PALETTE.neonBlue, 0.95));
    planetGlow.addColorStop(0.4, hexToRgba('#35c5ff', 0.32));
    planetGlow.addColorStop(1, hexToRgba('#02030c', 0));
    bgCtx.fillStyle = planetGlow;
    bgCtx.beginPath();
    bgCtx.arc(planetX, planetY, planetR * 1.2, 0, Math.PI * 2);
    bgCtx.fill();

    bgCtx.save();
    bgCtx.strokeStyle = hexToRgba('#8cecff', 0.18);
    bgCtx.lineWidth = Math.max(1, planetR * 0.018);
    bgCtx.beginPath();
    safeEllipse(bgCtx, planetX, planetY, planetR * 1.05, planetR * 0.25, -0.18);
    bgCtx.stroke();

    const planetSurface = bgCtx.createRadialGradient(
        planetX - planetR * 0.28,
        planetY - planetR * 0.32,
        planetR * 0.08,
        planetX,
        planetY,
        planetR * 0.72
    );
    planetSurface.addColorStop(0, '#9dfcff');
    planetSurface.addColorStop(0.28, '#247895');
    planetSurface.addColorStop(0.72, '#0b263e');
    planetSurface.addColorStop(1, '#030912');
    bgCtx.fillStyle = planetSurface;
    bgCtx.beginPath();
    bgCtx.arc(planetX, planetY, planetR * 0.62, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.clip();
    bgCtx.strokeStyle = hexToRgba('#b6fff1', 0.11);
    bgCtx.lineWidth = Math.max(2, planetR * 0.045);
    for (let i = -2; i <= 2; i += 1) {
        bgCtx.beginPath();
        safeEllipse(bgCtx, planetX + i * 3, planetY + i * planetR * 0.16, planetR * 0.58, planetR * 0.11, 0.08);
        bgCtx.stroke();
    }
    bgCtx.restore();

    bgCtx.fillStyle = '#071525';
    environment.rocks.forEach((rock) => {
        bgCtx.beginPath();
        rock.poly.forEach((point, index) => {
            const x = rock.x + Math.cos(point.a) * rock.s * point.r;
            const y = rock.y + Math.sin(point.a) * rock.s * point.r;
            if (index === 0) {
                bgCtx.moveTo(x, y);
            } else {
                bgCtx.lineTo(x, y);
            }
        });
        bgCtx.closePath();
        bgCtx.fill();
        bgCtx.strokeStyle = '#0d2a40';
        bgCtx.stroke();
    });

    bgCtx.fillStyle = '#051626';
    environment.ridges.forEach((ridge) => {
        bgCtx.beginPath();
        bgCtx.moveTo(0, ridge.baseY);
        ridge.points.forEach((point) => {
            bgCtx.lineTo(point.x, point.y);
        });
        bgCtx.lineTo(width, height);
        bgCtx.lineTo(0, height);
        bgCtx.closePath();
        bgCtx.fill();
    });
}

function drawStars() {
    const t = environment.time;
    for (let i = 0; i < environment.stars.length; i += 1) {
        const star = environment.stars[i];
        const alpha = 0.25 + (0.5 + 0.5 * Math.sin(t * star.speed + star.phase)) * 0.7;
        const drift = Math.sin(t * star.speed * 0.35 + star.phase) * 6 * star.depth;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x + drift, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawEventSky(width, height) {
    if (!environment.currentEvent) {
        return;
    }

    ctx.save();
    switch (environment.currentEvent.type) {
        case 'solar_flare': {
            const flare = ctx.createLinearGradient(0, 0, width, height * 0.55);
            flare.addColorStop(0, hexToRgba('#ff9f43', 0.18));
            flare.addColorStop(1, hexToRgba('#ffcf6d', 0));
            ctx.fillStyle = flare;
            ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = hexToRgba('#ffe1a1', 0.08);
            for (let i = 0; i < 7; i += 1) {
                ctx.lineWidth = 2 + i * 1.4;
                ctx.beginPath();
                ctx.moveTo(-20, height * (0.02 + i * 0.045));
                ctx.lineTo(width * (0.42 + i * 0.08), height * 0.55);
                ctx.stroke();
            }
            fx.addLight(width * 0.03, height * 0.03, Math.min(width, height) * 0.62, '#ffb347', 0.15);
            break;
        }
        case 'spore_bloom':
            ctx.fillStyle = hexToRgba('#8fff6f', 0.08);
            ctx.fillRect(0, height * 0.42, width, height * 0.58);
            ctx.fillStyle = hexToRgba('#caffab', 0.42);
            for (let i = 0; i < 28; i += 1) {
                const x = ((i * 83 + environment.time * (7 + i % 4)) % (width + 40)) - 20;
                const y = height * 0.45 + ((i * 47) % Math.max(1, height * 0.5)) + Math.sin(environment.time + i) * 8;
                ctx.beginPath();
                ctx.arc(x, y, 0.8 + (i % 3) * 0.45, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'void_eclipse': {
            ctx.fillStyle = hexToRgba('#131733', 0.2);
            ctx.fillRect(0, 0, width, height);
            const eclipseX = width * 0.68;
            const eclipseY = height * 0.18;
            const eclipseR = Math.min(width, height) * 0.085;
            fx.glowOrb(ctx, eclipseX, eclipseY, eclipseR * 1.15, '#6f7cff', 0.17);
            ctx.fillStyle = '#010108';
            ctx.beginPath();
            ctx.arc(eclipseX, eclipseY, eclipseR, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'gravity_shear':
            ctx.strokeStyle = hexToRgba('#7de7ff', 0.08);
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i += 1) {
                const y = height * (0.12 + i * 0.12);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.quadraticCurveTo(width * 0.5, y + Math.sin(environment.time * 2 + i) * 24, width, y - 12);
                ctx.stroke();
            }
            break;
        case 'meteor_dust':
            ctx.fillStyle = hexToRgba('#ff7661', 0.06);
            ctx.fillRect(0, 0, width, height);
            break;
        case 'extinction_shock':
            ctx.fillStyle = hexToRgba('#ff466a', 0.1);
            ctx.fillRect(0, 0, width, height);
            break;
        default:
            break;
    }
    ctx.restore();
}

function drawBiomeBands(width, height) {
    ctx.save();
    const bandWidth = width / BIOMES.length;
    BIOMES.forEach((biome, index) => {
        const x = bandWidth * index;
        const gradient = ctx.createLinearGradient(0, height * 0.42, 0, height);
        gradient.addColorStop(0, hexToRgba(biome.color, 0));
        gradient.addColorStop(1, hexToRgba(biome.color, 0.1));
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height * 0.4, bandWidth, height * 0.6);
        ctx.fillStyle = hexToRgba(biome.color, 0.52);
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(biome.name.toUpperCase(), x + bandWidth / 2, height * 0.455);
    });

    if (settings.graphicsQuality !== 'low') {
        environment.terrainVeins.forEach((vein) => {
            const biome = BIOMES[vein.biome];
            const shimmer = 0.11 + Math.sin(environment.time * 0.8 + vein.phase) * 0.045;
            ctx.strokeStyle = hexToRgba(biome.color, shimmer);
            ctx.lineWidth = vein.width;
            ctx.beginPath();
            ctx.moveTo(vein.x, vein.y);
            ctx.bezierCurveTo(
                vein.x + vein.length * 0.28,
                vein.y - 11,
                vein.x + vein.length * 0.66,
                vein.y + 13,
                vein.x + vein.length,
                vein.y + Math.sin(vein.phase) * 16
            );
            ctx.stroke();
        });
    }
    ctx.restore();
}

function drawPlants() {
    for (let i = 0; i < plants.length; i += 1) {
        const plant = plants[i];
        const sway = Math.sin(environment.time * 2 + plant.sway) * 3;
        const glow = 0.38 + Math.sin(environment.time * 2.6 + plant.pulse) * 0.18;

        ctx.strokeStyle = hexToRgba(PALETTE.neonBlue, 0.18);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plant.x, plant.y + plant.h);
        ctx.quadraticCurveTo(plant.x + sway, plant.y + plant.h * 0.45, plant.x, plant.y);
        ctx.stroke();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexToRgba(PALETTE.algae, 0.72 + glow * 0.2);
        ctx.beginPath();
        ctx.arc(plant.x + sway, plant.y - 1, 3.5 + glow * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (i % (settings.graphicsQuality === 'high' ? 3 : 7) === 0) {
            fx.addLight(plant.x + sway, plant.y, 18 + glow * 8, PALETTE.algae, 0.09);
        }
    }
}

function drawMushrooms() {
    for (let i = 0; i < mushrooms.length; i += 1) {
        const mushroom = mushrooms[i];
        const r = mushroom.r * mushroom.growth;
        if (r < 1) {
            continue;
        }

        const pulse = 0.5 + 0.5 * Math.sin(environment.time * 1.8 + mushroom.pulse);
        ctx.fillStyle = hexToRgba('#904f7d', 0.7);
        ctx.beginPath();
        safeEllipse(ctx, mushroom.x, mushroom.y, r, r * 0.72);
        ctx.fill();

        ctx.strokeStyle = hexToRgba('#f7d5c5', 0.48);
        ctx.lineWidth = Math.max(1, r * 0.2);
        ctx.beginPath();
        ctx.moveTo(mushroom.x, mushroom.y + r * 0.65);
        ctx.lineTo(mushroom.x, mushroom.y + r * 0.15);
        ctx.stroke();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexToRgba(PALETTE.magenta, 0.08 + pulse * 0.14);
        ctx.beginPath();
        ctx.arc(mushroom.x, mushroom.y, r * 1.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (i % (settings.graphicsQuality === 'high' ? 2 : 5) === 0) {
            fx.addLight(mushroom.x, mushroom.y, r * 2.4, PALETTE.magenta, 0.12 + pulse * 0.05);
        }
    }
}

function drawNests() {
    nests.forEach((nest) => {
        const pulse = 0.5 + Math.sin(environment.time * 3 + nest.id) * 0.12;
        ctx.save();
        ctx.translate(nest.x, nest.y);
        ctx.strokeStyle = nest.guarded ? hexToRgba(PALETTE.amber, 0.85) : hexToRgba(PALETTE.coral, 0.72);
        ctx.fillStyle = hexToRgba(nest.guarded ? PALETTE.amber : PALETTE.coral, 0.14);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(0, 0, 8 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        for (let i = 0; i < 5; i += 1) {
            const angle = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 4);
            ctx.lineTo(Math.cos(angle) * 11, Math.sin(angle) * 7);
            ctx.stroke();
        }
        ctx.fillStyle = '#fff4c7';
        ctx.beginPath();
        ctx.arc(0, -1, 2.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        fx.addLight(nest.x, nest.y, 30, nest.guarded ? PALETTE.amber : PALETTE.coral, 0.16);
    });
}

function drawHerdOverlay() {
    if (!herdOverlayEl.checked) return;
    ctx.save();
    ctx.setLineDash([5, 5]);
    herds.forEach((herd) => {
        const members = herd.memberIds.map(getCreatureById).filter(Boolean);
        if (members.length < 2) return;
        const center = {
            x: members.reduce((sum, member) => sum + member.x, 0) / members.length,
            y: members.reduce((sum, member) => sum + member.y, 0) / members.length
        };
        const radius = clamp(Math.max(...members.map((member) => distanceBetween(center.x, center.y, member.x, member.y))) + 18, 28, 125);
        const leader = getCreatureById(herd.leaderId);
        const color = leader?.genome.hasBiolume ? PALETTE.neonBlue : PALETTE.algae;
        ctx.strokeStyle = hexToRgba(color, 0.24);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = hexToRgba('#dffcff', 0.72);
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${herd.name} · ${members.length}`, center.x, center.y - radius - 4);
        if (herd.migrationTarget) {
            ctx.setLineDash([4, 6]);
            ctx.strokeStyle = hexToRgba(PALETTE.amber, 0.55);
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(herd.migrationTarget.x, herd.migrationTarget.y);
            ctx.stroke();
        }
        ctx.setLineDash([5, 5]);
    });
    ctx.restore();
}

function drawForeground(width, height) {
    ctx.save();
    const horizonY = height * 0.74;
    const groundFill = ctx.createLinearGradient(0, horizonY - 32, 0, height);
    groundFill.addColorStop(0, hexToRgba('#0a1f34', 0.82));
    groundFill.addColorStop(1, hexToRgba('#050b14', 0.98));
    ctx.fillStyle = groundFill;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.quadraticCurveTo(width * 0.22, horizonY - 36, width * 0.5, horizonY - 4);
    ctx.quadraticCurveTo(width * 0.8, horizonY + 18, width, horizonY - 6);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    environment.foregroundRocks.forEach((rock) => {
        ctx.fillStyle = hexToRgba('#16344d', 0.9);
        ctx.beginPath();
        safeEllipse(ctx, rock.x, rock.y, rock.rx, rock.ry, rock.rot);
        ctx.fill();

        ctx.fillStyle = hexToRgba(PALETTE.neonBlue, 0.06);
        ctx.beginPath();
        safeEllipse(ctx, rock.x, rock.y - 3, rock.rx * 1.12, rock.ry * 1.05, rock.rot);
        ctx.fill();
    });
    ctx.restore();
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.04;
        particle.life -= 1;
        if (particle.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        fx.drawSpark(ctx, particle, particle.life / particle.maxLife);
    }
}

function drawSelection() {
    if (!selectedCreature || selectedCreature.dead || !creatures.includes(selectedCreature)) {
        return;
    }
    ctx.save();
    ctx.strokeStyle = hexToRgba('#ffffff', 0.65);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    safeEllipse(ctx, selectedCreature.x, selectedCreature.y, selectedCreature.radius * 1.8, selectedCreature.radius * 1.2);
    ctx.stroke();
    ctx.restore();
}

function drawWorld(dtSec = 1 / 60) {
    const { width, height } = viewport();
    fx.beginFrame(dtSec);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bgCanvas, 0, 0, width, height);
    drawStars();
    drawEventSky(width, height);
    drawBiomeBands(width, height);
    drawPlants();
    drawMushrooms();
    drawNests();
    drawHerdOverlay();

    const sortedCreatures = [...creatures].sort((a, b) => a.y - b.y);
    sortedCreatures.forEach((creature) => {
        if (creature.state !== 'drift' || creature.genome.hasBiolume) {
            fx.addTrail(
                creature.x - Math.cos(creature.angle) * creature.radius,
                creature.y - Math.sin(creature.angle) * creature.radius,
                creature.angle,
                creature.radius,
                creature.isPredator ? PALETTE.coral : PALETTE.neonBlue,
                creature.state === 'flee' || creature.state === 'hunt' ? 0.3 : 0.14
            );
        }
    });
    fx.compositeTrails(ctx);
    for (let i = 0; i < sortedCreatures.length; i += 1) {
        sortedCreatures[i].draw();
    }

    drawSelection();
    drawForeground(width, height);
    drawParticles();
    fx.compositeLighting(ctx);
}

function updateFlora(dtSec, modifiers) {
    if (plants.length < settings.maxPlants && simRandom() < dtSec * 2.7 * modifiers.plantGrowth) {
        const candidate = createPlant();
        if (simRandom() < getBiomeAt(candidate.x).plantGrowth) plants.push(candidate);
    }
    if (mushrooms.length < settings.maxMushrooms && simRandom() < dtSec * 0.34 * modifiers.mushroomGrowth) {
        mushrooms.push(createMushroom());
    }

    for (let i = plants.length - 1; i >= 0; i -= 1) {
        plants[i].age += dtSec;
        if (plants[i].age > plants[i].lifespan && simRandom() < dtSec * 1.2) {
            plants.splice(i, 1);
        }
    }

    for (let i = mushrooms.length - 1; i >= 0; i -= 1) {
        const mushroom = mushrooms[i];
        mushroom.age += dtSec;
        const seasonalSwing = (modifiers.mushroomGrowth - 0.8) * 0.08;
        mushroom.growth = clamp(mushroom.growth + seasonalSwing * dtSec, 0.12, 1.1);

        if (environment.currentEvent?.type === 'spore_bloom') {
            mushroom.growth = clamp(mushroom.growth + dtSec * 0.12 * mushroom.vitality, 0.12, 1.2);
        }

        if (mushroom.age > mushroom.lifespan && simRandom() < dtSec * 0.7) {
            mushrooms.splice(i, 1);
        }
    }
}

function countSpecies() {
    let prey = 0;
    let predators = 0;
    for (let i = 0; i < creatures.length; i += 1) {
        if (creatures[i].isPredator) {
            predators += 1;
        } else {
            prey += 1;
        }
    }
    return { prey, predators };
}

function getHerdById(id) {
    return id == null ? null : herds.find((herd) => herd.id === id) || null;
}

function getNestById(id) {
    return id == null ? null : nests.find((nest) => nest.id === id) || null;
}

function getCreatureById(id) {
    return creatures.find((creature) => creature.id === id) || null;
}

function createHerd(members) {
    const leader = [...members].sort((a, b) => b.age - a.age)[0];
    const herd = {
        id: nextHerdId++,
        name: makeHerdName(),
        leaderId: leader.id,
        memberIds: members.map((member) => member.id),
        createdAt: environment.time,
        originBiome: getBiomeAt(leader.x).name,
        currentBiome: getBiomeAt(leader.x).name,
        settledAt: environment.time,
        migrationTarget: null,
        speciesId: null
    };
    members.forEach((member) => { member.herdId = herd.id; });
    herds.push(herd);
    recordEvent(`The ${herd.name} formed under #${leader.id}`);
    return herd;
}

function updateHerds() {
    if (environment.time - environment.lastHerdUpdateAt < 1.5) return;
    environment.lastHerdUpdateAt = environment.time;
    const grazers = creatures.filter((creature) => !creature.isPredator && !creature.dead);

    herds.forEach((herd) => {
        herd.memberIds = herd.memberIds.filter((id) => {
            const member = getCreatureById(id);
            return member && !member.isPredator;
        });
        if (!getCreatureById(herd.leaderId) && herd.memberIds.length) herd.leaderId = herd.memberIds[0];
    });

    herds = herds.filter((herd) => {
        if (herd.memberIds.length >= 2) return true;
        herd.memberIds.forEach((id) => {
            const member = getCreatureById(id);
            if (member) member.herdId = null;
        });
        return false;
    });

    for (const herd of herds) {
        const leader = getCreatureById(herd.leaderId);
        if (!leader || herd.memberIds.length >= 12) continue;
        const recruits = grazers.filter((grazer) =>
            grazer.herdId == null &&
            grazer.speciesName === leader.speciesName &&
            distanceBetween(grazer.x, grazer.y, leader.x, leader.y) < 105
        ).slice(0, 12 - herd.memberIds.length);
        recruits.forEach((recruit) => {
            recruit.herdId = herd.id;
            herd.memberIds.push(recruit.id);
        });
    }

    const ungrouped = grazers.filter((grazer) => grazer.herdId == null);
    for (const founder of ungrouped) {
        if (founder.herdId != null) continue;
        const cluster = ungrouped.filter((candidate) =>
            candidate.herdId == null &&
            candidate.speciesName === founder.speciesName &&
            distanceBetween(founder.x, founder.y, candidate.x, candidate.y) < 115
        ).slice(0, 8);
        if (cluster.length >= 3) createHerd(cluster);
    }

    for (const herd of herds) {
        const members = herd.memberIds.map(getCreatureById).filter(Boolean);
        if (!members.length) continue;
        const center = {
            x: members.reduce((sum, member) => sum + member.x, 0) / members.length,
            y: members.reduce((sum, member) => sum + member.y, 0) / members.length
        };
        herd.currentBiome = getBiomeAt(center.x).name;
        const localFood = plants.reduce((count, plant) => count + (distanceBetween(center.x, center.y, plant.x, plant.y) < 170 ? 1 : 0), 0);

        if (!herd.migrationTarget && environment.time - herd.createdAt > 6 && localFood < members.length * 1.25) {
            const currentIndex = BIOMES.findIndex((biome) => biome.name === herd.currentBiome);
            const foodByBiome = BIOMES.map((biome) => plants.filter((plant) => getBiomeAt(plant.x).name === biome.name).length * biome.plantGrowth);
            let targetIndex = foodByBiome.indexOf(Math.max(...foodByBiome));
            if (targetIndex === currentIndex) targetIndex = (currentIndex + 1 + Math.floor(simRandom() * 2)) % BIOMES.length;
            const { width, height } = viewport();
            const bandWidth = width / BIOMES.length;
            herd.migrationTarget = {
                x: bandWidth * (targetIndex + 0.5),
                y: clamp(center.y + randomBetween(-70, 70), groundBand(height).minY, groundBand(height).maxY),
                biome: BIOMES[targetIndex].name
            };
            recordEvent(`The ${herd.name} began migrating toward ${herd.migrationTarget.biome}`);
        }

        if (herd.migrationTarget && distanceBetween(center.x, center.y, herd.migrationTarget.x, herd.migrationTarget.y) < 72) {
            const destination = herd.migrationTarget.biome;
            herd.migrationTarget = null;
            herd.currentBiome = destination;
            herd.settledAt = environment.time;
            members.forEach((member) => { member.life.migrations += 1; });
            recordEvent(`The ${herd.name} reached ${destination}`);
        }

        const maxGeneration = members.reduce((max, member) => Math.max(max, member.generation), 0);
        if (
            !herd.speciesId &&
            !herd.migrationTarget &&
            herd.currentBiome !== herd.originBiome &&
            environment.time - herd.settledAt > 18 &&
            maxGeneration >= 2
        ) {
            const species = {
                id: nextSpeciesId++,
                name: makeSpeciesName(herd.currentBiome),
                ancestor: members[0].speciesName,
                emergedAt: environment.time,
                biome: herd.currentBiome,
                founderHerdId: herd.id
            };
            speciesCatalog.push(species);
            herd.speciesId = species.id;
            members.forEach((member) => { member.speciesName = species.name; });
            nests.filter((nest) => nest.herdId === herd.id).forEach((nest) => { nest.speciesName = species.name; });
            recordEvent(`NEW SPECIES: ${species.name} emerged in ${species.biome}`);
            notify(`New species discovered: ${species.name}`);
        }
    }
}

function createNest(parent) {
    const nest = {
        id: nextNestId++,
        x: parent.x,
        y: parent.y,
        parentId: parent.id,
        genome: parent.genome.mutate(),
        lineage: parent.lineage,
        speciesName: parent.speciesName,
        herdId: parent.herdId,
        generation: parent.generation + 1,
        age: 0,
        hatchAt: randomBetween(4.5, 6.5),
        health: 100,
        guarded: true
    };
    nests.push(nest);
    parent.nestId = nest.id;
    if (!environment.firstNestRecorded) {
        environment.firstNestRecorded = true;
        recordEvent(`#${parent.id} built the world's first nest`);
    }
    return nest;
}

function updateNests(dtSec) {
    for (let index = nests.length - 1; index >= 0; index -= 1) {
        const nest = nests[index];
        nest.age += dtSec;
        const guardian = creatures.find((creature) =>
            !creature.isPredator && !creature.dead &&
            (creature.id === nest.parentId || creature.herdId === nest.herdId) &&
            distanceBetween(creature.x, creature.y, nest.x, nest.y) < 58
        );
        nest.guarded = Boolean(guardian);
        if (!nest.guarded && environment.currentEvent) nest.health -= dtSec * (environment.currentEvent.type === 'extinction_shock' ? 16 : 3.5);

        if (nest.health <= 0) {
            const parent = getCreatureById(nest.parentId);
            if (parent) parent.nestId = null;
            recordEvent(`Nest #${nest.id} was lost during ${environment.currentEvent?.name || 'exposure'}`);
            nests.splice(index, 1);
            continue;
        }
        if (nest.age < nest.hatchAt || creatures.length >= settings.maxCreatures) continue;

        const child = new Creature(nest.x + randomBetween(-9, 9), nest.y + randomBetween(-7, 7), nest.genome, {
            parentId: nest.parentId,
            generation: nest.generation,
            lineage: nest.lineage,
            speciesName: nest.speciesName,
            herdId: nest.herdId,
            energy: 76
        });
        creatures.push(child);
        environment.births += 1;
        const parent = getCreatureById(nest.parentId);
        if (parent) {
            parent.nestId = null;
            parent.offspringIds.push(child.id);
            parent.life.offspring += 1;
        }
        const herd = getHerdById(nest.herdId);
        if (herd && !herd.memberIds.includes(child.id)) herd.memberIds.push(child.id);
        if (child.generation >= 2) recordEvent(`Generation ${child.generation} hatched in the ${herd?.name || child.lineage}`);
        spawnParticles(nest.x, nest.y, 18, PALETTE.amber);
        nests.splice(index, 1);
    }
}

function updateCosmicPressure() {
    const counts = countSpecies();
    const crowding = clamp((creatures.length - settings.maxCreatures * 0.62) / (settings.maxCreatures * 0.4), 0, 1);
    const famine = clamp((creatures.length * 2.5 - plants.length) / (settings.maxCreatures * 1.7), 0, 1);
    const predatorStress = clamp(counts.predators / Math.max(1, counts.prey), 0, 1.2);
    environment.cosmicPressure = clamp(
        crowding * 0.42 + famine * 0.35 + predatorStress * 0.22 + (environment.currentEvent ? environment.currentEvent.pressure : 0),
        0,
        1.6
    );
}

function maybeTriggerCosmicEvent(dtSec) {
    if (environment.currentEvent || environment.time - environment.lastEventAt < 14) {
        return;
    }
    if (simRandom() >= dtSec * 0.07) {
        return;
    }

    const blueprint = EVENT_BLUEPRINTS[Math.floor(simRandom() * EVENT_BLUEPRINTS.length)];
    environment.currentEvent = {
        type: blueprint.type,
        name: blueprint.name,
        color: blueprint.color,
        pressure: blueprint.pressure,
        message: blueprint.message,
        remaining: randomBetween(blueprint.duration[0], blueprint.duration[1])
    };
    environment.lastEventAt = environment.time;
    recordEvent(`${blueprint.name} began`);
    spawnParticles(randomBetween(80, viewport().width - 80), viewport().height * 0.24, 36, blueprint.color);

    if (blueprint.type === 'spore_bloom') {
        for (let i = 0; i < 6 && mushrooms.length < settings.maxMushrooms + 6; i += 1) {
            mushrooms.push(createMushroom());
        }
    }
}

function updateCosmicEvent(dtSec) {
    if (!environment.currentEvent) {
        return;
    }

    if (environment.currentEvent.type === 'meteor_dust' && simRandom() < dtSec * 5) {
        spawnParticles(randomBetween(0, viewport().width), randomBetween(0, viewport().height * 0.45), 2, '#ff9a7d');
    }

    environment.currentEvent.remaining -= dtSec;
    if (environment.currentEvent.remaining <= 0) {
        environment.currentEvent = null;
    }
}

function maybeTriggerExtinction(dtSec) {
    if (environment.time - environment.lastExtinctionAt < 50 || creatures.length < 20) {
        return;
    }

    const chancePerSecond = 0.012 * environment.cosmicPressure * (creatures.length / settings.maxCreatures);
    if (simRandom() >= dtSec * chancePerSecond) {
        return;
    }

    environment.lastExtinctionAt = environment.time;
    const severity = clamp(0.28 + environment.cosmicPressure * 0.22, 0.28, 0.68);
    for (let i = 0; i < creatures.length; i += 1) {
        if (simRandom() < severity) {
            creatures[i].markDead('extinction');
        }
    }
    cleanupCreatures();

    environment.currentEvent = {
        type: 'extinction_shock',
        name: 'Extinction Shock',
        color: '#ff4d6d',
        pressure: 0.34,
        message: 'A macrocosmic die-off resets the food web.',
        remaining: 6
    };
    recordEvent('Extinction Shock reshaped the food web');

    for (let i = 0; i < 80; i += 1) {
        spawnParticles(randomBetween(0, viewport().width), randomBetween(0, viewport().height), 2, '#ff5b70');
    }
}

function maybeReproduce(creature, dtSec, modifiers) {
    if (
        creature.dead ||
        creature.reproductionCooldown > 0 ||
        creatures.length + nests.length >= settings.maxCreatures ||
        (!creature.isPredator && creature.nestId != null)
    ) {
        return;
    }

    const maturity = creature.age / creature.maxAge;
    const energyGate = creature.isPredator ? 155 : 110;
    const recentMealGate = creature.isPredator ? environment.time - creature.lastMealAt < 18 : true;
    if (maturity < (creature.isPredator ? 0.34 : 0.22) || creature.energy < energyGate || !recentMealGate) {
        return;
    }

    const chancePerSecond =
        (creature.isPredator ? 0.026 : 0.11) *
        creature.genome.fertility *
        modifiers.reproduction *
        (creature.isPredator && countSpecies().prey < 8 ? 0.4 : 1);

    if (simRandom() >= dtSec * chancePerSecond) {
        return;
    }

    if (!creature.isPredator) {
        createNest(creature);
        creature.energy *= 0.68;
        creature.reproductionCooldown = randomBetween(9, 14);
        spawnParticles(creature.x, creature.y, 12, PALETTE.amber);
        return;
    }

    const { width, height } = viewport();
    const ground = groundBand(height);
    creatures.push(new Creature(
        clamp(creature.x + randomBetween(-18, 18), 12, width - 12),
        clamp(creature.y + randomBetween(-12, 12), ground.minY, ground.maxY),
        creature.genome.mutate(),
        {
            parentId: creature.id,
            generation: creature.generation + 1,
            lineage: creature.lineage,
            speciesName: creature.speciesName
        }
    ));
    environment.births += 1;

    creature.energy *= creature.isPredator ? 0.7 : 0.62;
    creature.reproductionCooldown = creature.isPredator ? randomBetween(9, 15) : randomBetween(4.5, 9);
    spawnParticles(creature.x, creature.y, creature.isPredator ? 12 : 8, creature.isPredator ? PALETTE.coral : PALETTE.neonBlue);
}

function cleanupCreatures() {
    for (let i = creatures.length - 1; i >= 0; i -= 1) {
        if (creatures[i].dead) {
            creatures.splice(i, 1);
        }
    }
}

function refreshLabDetails() {
    if (!selectedCreature || selectedCreature.dead || !creatures.includes(selectedCreature)) {
        selectedCreature = null;
        lab.hidden = true;
        return;
    }

    labId.innerText =
        `#${selectedCreature.id} · ${selectedCreature.lineage} · ${selectedCreature.isPredator ? 'Predator' : 'Prey'}`;
    lineageView.innerText =
        `Generation ${selectedCreature.generation} · Parent ${selectedCreature.parentId ? `#${selectedCreature.parentId}` : 'founder'} · ` +
        `${getBiomeAt(selectedCreature.x).name}`;
    const herd = getHerdById(selectedCreature.herdId);
    const rememberedFood = selectedCreature.memory?.food;
    const rememberedDanger = selectedCreature.memory?.danger;
    lifeView.innerText = [
        `Species: ${selectedCreature.speciesName}`,
        `Group: ${herd ? `${herd.name}${herd.leaderId === selectedCreature.id ? ' (leader)' : ''}` : 'solitary'}`,
        `Family: ${selectedCreature.offspringIds.length} offspring`,
        `Memory: ${rememberedFood ? `food in ${rememberedFood.biome}` : 'no food landmark'}${rememberedDanger ? ` · danger from #${rememberedDanger.predatorId}` : ''}`,
        `Life: ${selectedCreature.life.meals} meals · ${selectedCreature.life.escapes} escapes · ${selectedCreature.life.migrations} migrations`
    ].join('\n');
    genomeView.innerText = JSON.stringify({
        energy: Number(selectedCreature.energy.toFixed(1)),
        age: Number(selectedCreature.age.toFixed(1)),
        maxAge: Number(selectedCreature.maxAge.toFixed(1)),
        speed: Number(selectedCreature.genome.speed.toFixed(2)),
        range: Math.round(selectedCreature.genome.range),
        aggression: Number(selectedCreature.genome.aggression.toFixed(2)),
        fertility: Number(selectedCreature.genome.fertility.toFixed(2)),
        hasSpikes: selectedCreature.genome.hasSpikes,
        hasBiolume: selectedCreature.genome.hasBiolume,
        metabolism: Number(selectedCreature.genome.metabolism.toFixed(2)),
        socialNeed: Number(selectedCreature.socialNeed.toFixed(2)),
        currentIntent: selectedCreature.thought,
        forcedMutations: selectedCreature.genome.forcedMutations || 'none'
    }, null, 2);
}

function syncLabMutationControls(creature) {
    const forced = creature.genome.forcedMutations || {};
    forceSpikesEl.value =
        forced.hasSpikes === undefined || forced.hasSpikes === 'inherit'
            ? 'inherit'
            : (forced.hasSpikes ? 'true' : 'false');
    forceBiolumeEl.value =
        forced.hasBiolume === undefined || forced.hasBiolume === 'inherit'
            ? 'inherit'
            : (forced.hasBiolume ? 'true' : 'false');
}

function showLabFor(creature) {
    selectedCreature = creature;
    lab.hidden = false;
    syncLabMutationControls(creature);
    refreshLabDetails();
}

function getNearestCreature(x, y, maxDistance = 24) {
    let best = null;
    let bestDistance = maxDistance;
    for (let i = 0; i < creatures.length; i += 1) {
        const creature = creatures[i];
        const distance = distanceBetween(x, y, creature.x, creature.y);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = creature;
        }
    }
    return best;
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (activeTool !== 'inspect') {
        applyWorldTool(activeTool, x, y);
        return;
    }
    const creature = getNearestCreature(x, y);
    if (creature) showLabFor(creature);
    else {
        selectedCreature = null;
        lab.hidden = true;
    }
});

function applyWorldTool(tool, x, y) {
    const { width, height } = viewport();
    const ground = groundBand(height);
    const safeX = clamp(x, 24, width - 24);
    const safeY = clamp(y, ground.minY, ground.maxY);
    if (tool === 'food') {
        for (let i = 0; i < 16 && plants.length < settings.maxPlants + 30; i += 1) {
            plants.push(createPlant(
                clamp(safeX + randomBetween(-48, 48), 16, width - 16),
                clamp(safeY + randomBetween(-30, 30), ground.minY, ground.maxY)
            ));
        }
        spawnParticles(safeX, safeY, 28, PALETTE.algae);
        notify('A nutrient bloom takes root. Watch for overpopulation.');
        recordEvent(`Seeded food in ${getBiomeAt(safeX).name}`);
    } else if (tool === 'shelter') {
        for (let i = 0; i < 5 && mushrooms.length < settings.maxMushrooms + 12; i += 1) {
            mushrooms.push(createMushroom(
                clamp(safeX + randomBetween(-38, 38), 24, width - 24),
                clamp(safeY + randomBetween(-24, 24), ground.minY, ground.maxY)
            ));
        }
        spawnParticles(safeX, safeY, 28, PALETTE.magenta);
        notify('A fungal sanctuary grows. Prey can hide here.');
        recordEvent(`Grew shelter in ${getBiomeAt(safeX).name}`);
    } else if (tool === 'mutate') {
        const creature = getNearestCreature(safeX, safeY, 44);
        if (!creature) {
            notify('Mutation pulse missed—click closer to a creature.');
            return;
        }
        creature.genome.hasBiolume = !creature.genome.hasBiolume;
        creature.genome.speed = clamp(creature.genome.speed + randomBetween(-0.3, 0.4), creature.isPredator ? 1.7 : 0.9, creature.isPredator ? 3.6 : 2.8);
        creature.genome.recalculateMetabolism();
        creature.lineage = `${creature.lineage.split(' ')[0]} Radiant`;
        spawnParticles(creature.x, creature.y, 38, PALETTE.neonBlue);
        showLabFor(creature);
        notify(`Mutation expressed in #${creature.id} and its future lineage.`);
        recordEvent(`Mutation pulse altered #${creature.id}`);
    }
    environment.interventions += 1;
}

applyForceBtn.addEventListener('click', () => {
    if (!selectedCreature || selectedCreature.dead) {
        return;
    }
    selectedCreature.genome.forcedMutations = {
        hasSpikes: forceSpikesEl.value === 'inherit' ? 'inherit' : forceSpikesEl.value === 'true',
        hasBiolume: forceBiolumeEl.value === 'inherit' ? 'inherit' : forceBiolumeEl.value === 'true'
    };
    refreshLabDetails();
});

closeLabBtn.addEventListener('click', () => {
    selectedCreature = null;
    lab.hidden = true;
});

document.querySelectorAll('.tool').forEach((button) => {
    button.addEventListener('click', () => {
        activeTool = button.dataset.tool;
        document.querySelectorAll('.tool').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
        const hints = {
            inspect: 'Click a creature to inspect its needs, traits, and lineage.',
            food: 'Click the ground to seed food. Abundance can cause a population boom.',
            shelter: 'Click the ground to grow a fungal refuge for prey.',
            mutate: 'Click near a creature to alter it and its future lineage.'
        };
        toolHint.innerText = hints[activeTool];
        canvas.style.cursor = activeTool === 'inspect' ? 'crosshair' : 'cell';
    });
});

pauseBtn.addEventListener('click', () => {
    simulationPaused = !simulationPaused;
    pauseBtn.innerText = simulationPaused ? 'Resume' : 'Pause';
    pauseBtn.classList.toggle('active', simulationPaused);
});

speedSelect.addEventListener('change', () => {
    simulationSpeed = Number(speedSelect.value) || 1;
    notify(`Simulation speed set to ${simulationSpeed}×.`);
});

qualitySelect.addEventListener('change', () => {
    settings.graphicsQuality = qualitySelect.value;
    fx.setQuality(settings.graphicsQuality);
    localStorage.setItem('xeno-graphics-quality', settings.graphicsQuality);
    buildBackground();
    notify(`Graphics quality set to ${settings.graphicsQuality}.`);
});

function serializeWorld() {
    return {
        version: 2,
        rngState,
        nextCreatureId,
        nextHerdId,
        nextNestId,
        nextSpeciesId,
        environment: {
            time: environment.time,
            currentEvent: environment.currentEvent,
            cosmicPressure: environment.cosmicPressure,
            lastEventAt: environment.lastEventAt,
            lastExtinctionAt: environment.lastExtinctionAt,
            births: environment.births,
            deaths: environment.deaths,
            interventions: environment.interventions,
            eventFeed: environment.eventFeed,
            history: environment.history,
            lastHistoryAt: environment.lastHistoryAt,
            missionCompleted: environment.missionCompleted,
            lastHerdUpdateAt: environment.lastHerdUpdateAt,
            firstNestRecorded: environment.firstNestRecorded,
            firstHuntRecorded: environment.firstHuntRecorded
        },
        plants,
        mushrooms,
        herds,
        speciesCatalog,
        nests: nests.map((nest) => ({ ...nest, genome: { ...nest.genome } })),
        creatures: creatures.map((creature) => ({ ...creature, genome: { ...creature.genome } }))
    };
}

function saveWorld() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeWorld()));
    notify('World saved in this browser.');
}

function loadWorld() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
        notify('No saved world found yet.');
        return;
    }
    try {
        const snapshot = JSON.parse(raw);
        if (![1, 2].includes(snapshot.version)) throw new Error('Unsupported save version');
        plants = snapshot.plants || [];
        mushrooms = snapshot.mushrooms || [];
        herds = snapshot.herds || [];
        speciesCatalog = snapshot.speciesCatalog || [];
        nests = (snapshot.nests || []).map((data) => ({
            ...data,
            genome: Object.assign(new Genome(data.genome.species), data.genome)
        }));
        creatures = (snapshot.creatures || []).map((data) => {
            const genome = Object.assign(new Genome(data.genome.species), data.genome);
            const creature = new Creature(data.x, data.y, genome, {
                id: data.id,
                parentId: data.parentId,
                generation: data.generation,
                lineage: data.lineage,
                speciesName: data.speciesName,
                herdId: data.herdId,
                nestId: data.nestId,
                offspringIds: data.offspringIds,
                socialNeed: data.socialNeed,
                memory: data.memory,
                life: data.life
            });
            Object.assign(creature, data, { genome, dead: false });
            return creature;
        });
        Object.assign(environment, {
            lastHerdUpdateAt: -9999,
            firstNestRecorded: false,
            firstHuntRecorded: false
        }, snapshot.environment);
        rngState = snapshot.rngState;
        nextCreatureId = snapshot.nextCreatureId;
        nextHerdId = snapshot.nextHerdId || 1;
        nextNestId = snapshot.nextNestId || 1;
        nextSpeciesId = snapshot.nextSpeciesId || 1;
        selectedCreature = null;
        lab.hidden = true;
        notify('Saved ecosystem restored.');
        recordEvent('World restored from archive');
    } catch (error) {
        console.error(error);
        notify('The saved world could not be restored.');
    }
}

saveBtn.addEventListener('click', saveWorld);
loadBtn.addEventListener('click', loadWorld);
newWorldBtn.addEventListener('click', () => {
    if (!window.confirm('Start a new ecosystem? Your current world remains available only if you saved it.')) return;
    rngState = Date.now() | 0;
    resetWorldProgress();
    seedWorld();
    notify('A new ecosystem has awakened.');
});

window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault();
        pauseBtn.click();
    }
});

function resetWorldProgress() {
    Object.assign(environment, {
        time: 0,
        currentEvent: null,
        cosmicPressure: 0,
        lastEventAt: -9999,
        lastExtinctionAt: -9999,
        births: 0,
        deaths: 0,
        interventions: 0,
        eventFeed: [],
        history: [],
        lastHistoryAt: -9999,
        missionCompleted: false,
        lastHerdUpdateAt: -9999,
        firstNestRecorded: false,
        firstHuntRecorded: false
    });
    nextCreatureId = 1;
    nextHerdId = 1;
    nextNestId = 1;
    nextSpeciesId = 1;
    nests = [];
    herds = [];
    speciesCatalog = [];
}

function sampleHistory() {
    if (environment.time - environment.lastHistoryAt < 2) return;
    const counts = countSpecies();
    environment.history.push({ time: environment.time, prey: counts.prey, predators: counts.predators, flora: plants.length });
    environment.history = environment.history.slice(-90);
    environment.lastHistoryAt = environment.time;
}

function drawHistory() {
    const width = historyCanvas.width;
    const height = historyCanvas.height;
    historyCtx.clearRect(0, 0, width, height);
    historyCtx.strokeStyle = 'rgba(52,246,255,.12)';
    historyCtx.beginPath();
    historyCtx.moveTo(0, height - 1);
    historyCtx.lineTo(width, height - 1);
    historyCtx.stroke();
    if (environment.history.length < 2) return;
    const maxValue = Math.max(10, ...environment.history.flatMap((point) => [point.prey, point.predators, point.flora]));
    const series = [
        ['prey', '#34f6ff'],
        ['predators', '#ff8c69'],
        ['flora', '#7bf6a6']
    ];
    series.forEach(([key, color]) => {
        historyCtx.strokeStyle = color;
        historyCtx.lineWidth = 1.5;
        historyCtx.beginPath();
        environment.history.forEach((point, index) => {
            const x = (index / (environment.history.length - 1)) * width;
            const y = height - 3 - (point[key] / maxValue) * (height - 7);
            if (index === 0) historyCtx.moveTo(x, y);
            else historyCtx.lineTo(x, y);
        });
        historyCtx.stroke();
    });
}

function updateMission(counts) {
    const generations = creatures.reduce((max, creature) => Math.max(max, creature.generation), 0);
    const stable = counts.prey >= 20 && counts.predators >= 3 && plants.length >= 60;
    const survived = Math.min(100, Math.floor(environment.time));
    goalEl.innerText = `MISSION: resilient biosphere · ${survived}/100s · generation ${generations}/3 · herds ${herds.length} · new species ${speciesCatalog.length} · ${stable ? 'stable' : 'at risk'}`;
    if (!environment.missionCompleted && environment.time >= 100 && generations >= 3 && stable) {
        environment.missionCompleted = true;
        recordEvent('Mission complete: a resilient biosphere emerged');
        notify('Mission complete: this biosphere can sustain itself.');
    }
}

function renderChronicle() {
    if (!environment.eventFeed.length) {
        chronicleEntriesEl.innerText = 'The first organisms awaken.';
        return;
    }
    chronicleEntriesEl.replaceChildren(...environment.eventFeed.slice(0, 5).map((entry) => {
        const row = document.createElement('div');
        row.className = 'chronicle-entry';
        const time = document.createElement('span');
        time.className = 'chronicle-time';
        time.innerText = `${entry.time}s`;
        row.append(time, document.createTextNode(entry.message));
        return row;
    }));
}

function updateHud() {
    const counts = countSpecies();
    const season = getCurrentSeason();
    const eventName = environment.currentEvent ? environment.currentEvent.name : 'Stable Orbit';
    const pressure = environment.cosmicPressure.toFixed(2);

    statsEl.innerHTML =
        `Pop: ${creatures.length} | Prey: ${counts.prey} | Predators: ${counts.predators}<br>` +
        `Plants: ${plants.length} | Nests: ${nests.length} | Herds: ${herds.length} | Pressure: ${pressure}<br>` +
        `Season: ${season.name} | Time: ${Math.floor(environment.time)}s`;

    if (environment.currentEvent) {
        logEl.innerHTML = `Status: <span class="event-log">${eventName}</span> | ${environment.currentEvent.message}`;
    } else {
        logEl.innerText = `Status: ${eventName} | ${season.name} is shaping the biome.`;
    }

    updateKeplerPanel(counts, season, eventName, pressure);
    updateMission(counts);
    drawHistory();
    renderChronicle();
    refreshLabDetails();
}

function updateKeplerPanel(counts, season, eventName, pressure) {
    const width = keplerCanvas.width;
    const height = keplerCanvas.height;
    const cx = width * 0.5;
    const cy = height * 0.46;
    const radius = Math.min(width, height) * 0.24;
    const t = environment.time;

    keplerCtx.clearRect(0, 0, width, height);

    const glow = keplerCtx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.35,
        radius * 0.1,
        cx,
        cy,
        radius * 1.3
    );
    glow.addColorStop(0, hexToRgba('#a6fff4', 0.95));
    glow.addColorStop(0.5, hexToRgba('#0c6980', 0.84));
    glow.addColorStop(1, hexToRgba('#031018', 0.1));
    keplerCtx.fillStyle = glow;
    keplerCtx.beginPath();
    keplerCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    keplerCtx.fill();

    keplerCtx.strokeStyle = hexToRgba('#54f0ff', 0.2);
    keplerCtx.lineWidth = 1.2;
    keplerCtx.beginPath();
    safeEllipse(keplerCtx, cx, cy, radius * 1.22, radius * 0.32, t * 0.08);
    keplerCtx.stroke();

    keplerCtx.fillStyle = hexToRgba('#e7fff8', 0.09);
    for (let i = 0; i < 4; i += 1) {
        keplerCtx.beginPath();
        safeEllipse(
            keplerCtx,
            cx + Math.sin(t * 0.6 + i) * radius * 0.08,
            cy - radius * 0.1 + i * 5,
            radius * 0.86,
            4.5,
            0
        );
        keplerCtx.fill();
    }

    const moons = environment.currentEvent ? 3 : 2;
    for (let i = 0; i < moons; i += 1) {
        const angle = t * (0.3 + i * 0.1) + i * (Math.PI * 0.8);
        keplerCtx.fillStyle = i === 0 ? '#ffd480' : '#8ff6ff';
        keplerCtx.beginPath();
        keplerCtx.arc(
            cx + Math.cos(angle) * radius * (1.35 + i * 0.2),
            cy + Math.sin(angle) * radius * 0.48,
            2 + i,
            0,
            Math.PI * 2
        );
        keplerCtx.fill();
    }

    const keplerName = document.getElementById('keplerName');
    const keplerStats = document.getElementById('keplerStats');
    if (keplerName) {
        keplerName.innerText = `SYSTEM: KEPLER-186f | ${season.name}`;
    }
    if (keplerStats) {
        keplerStats.innerText =
            `Pop: ${creatures.length} | Flora: ${plants.length} | Event: ${eventName} | Pressure: ${pressure}`;
    }
}

function generateBackdrop() {
    const { width, height } = viewport();
    environment.stars = [];
    environment.speckles = [];
    environment.rocks = [];
    environment.ridges = [];
    environment.foregroundRocks = [];
    environment.nebulae = [];
    environment.terrainVeins = [];

    const nebulaColors = ['#224b88', '#552a73', '#0e6772', '#71384c'];
    for (let i = 0; i < 7; i += 1) {
        environment.nebulae.push({
            x: randomBetween(-width * 0.05, width * 1.05),
            y: randomBetween(height * 0.04, height * 0.5),
            radius: randomBetween(width * 0.12, width * 0.3),
            color: nebulaColors[i % nebulaColors.length],
            alpha: randomBetween(0.045, 0.11),
            stretch: randomBetween(0.35, 0.7)
        });
    }

    const bandWidth = width / BIOMES.length;
    for (let biome = 0; biome < BIOMES.length; biome += 1) {
        for (let i = 0; i < 15; i += 1) {
            environment.terrainVeins.push({
                biome,
                x: bandWidth * biome + randomBetween(0, bandWidth),
                y: randomBetween(height * 0.54, height * 0.96),
                length: randomBetween(20, 78),
                width: randomBetween(0.5, 1.5),
                phase: randomBetween(0, Math.PI * 2)
            });
        }
    }

    for (let i = 0; i < 160; i += 1) {
        environment.stars.push({
            x: randomBetween(0, width),
            y: randomBetween(0, height * 0.6),
            r: randomBetween(0.4, 1.8),
            speed: randomBetween(0.4, 2.5),
            phase: randomBetween(0, Math.PI * 2),
            depth: randomBetween(0.35, 1.1)
        });
    }

    for (let i = 0; i < 420; i += 1) {
        environment.speckles.push({
            x: randomBetween(0, width),
            y: randomBetween(0, height),
            s: randomBetween(0.8, 1.9),
            alpha: randomBetween(0.04, 0.18)
        });
    }

    for (let i = 0; i < 22; i += 1) {
        const points = [];
        const vertexCount = 6;
        for (let j = 0; j < vertexCount; j += 1) {
            points.push({
                a: (j / vertexCount) * Math.PI * 2,
                r: randomBetween(0.75, 1.2)
            });
        }
        environment.rocks.push({
            x: randomBetween(0, width),
            y: randomBetween(height * 0.58, height * 0.95),
            s: randomBetween(18, 56),
            poly: points
        });
    }

    for (let i = 0; i < 4; i += 1) {
        const points = [];
        const baseY = height * (0.58 + i * 0.07);
        for (let j = 0; j <= 8; j += 1) {
            points.push({
                x: (width / 8) * j,
                y: baseY + Math.sin(j * 0.8 + i) * randomBetween(12, 28)
            });
        }
        environment.ridges.push({ baseY, points });
    }

    for (let i = 0; i < 7; i += 1) {
        environment.foregroundRocks.push({
            x: width * (0.08 + i * 0.13),
            y: height * (0.78 + Math.sin(i * 0.9) * 0.015),
            rx: randomBetween(28, 52),
            ry: randomBetween(12, 22),
            rot: randomBetween(-0.25, 0.25)
        });
    }
}

function seedWorld() {
    const { width, height } = viewport();
    const ground = groundBand(height);

    creatures = [];
    plants = [];
    mushrooms = [];
    particles = [];
    nests = [];
    herds = [];
    speciesCatalog = [];
    selectedCreature = null;
    lab.hidden = true;

    for (let i = 0; i < 90; i += 1) {
        plants.push(createPlant());
    }
    for (let i = 0; i < 14; i += 1) {
        mushrooms.push(createMushroom());
    }
    for (let i = 0; i < 28; i += 1) {
        creatures.push(new Creature(
            randomBetween(18, width - 18),
            randomBetween(ground.minY, ground.maxY),
            new Genome(0),
            { seeded: true }
        ));
    }
    for (let i = 0; i < 4; i += 1) {
        creatures.push(new Creature(
            randomBetween(18, width - 18),
            randomBetween(ground.minY, ground.maxY),
            new Genome(1),
            { seeded: true }
        ));
    }

    generateBackdrop();
    buildBackground();
}

let lastTimestamp = performance.now();
function update(timestamp) {
    const rawDt = (timestamp - lastTimestamp) / 1000;
    const baseDt = Math.min(0.05, Math.max(0, Number.isFinite(rawDt) ? rawDt : 0.016));
    const dtSec = baseDt * simulationSpeed;
    lastTimestamp = timestamp;
    if (simulationPaused) {
        drawWorld(baseDt);
        updateHud();
        requestAnimationFrame(update);
        return;
    }
    environment.time += dtSec;

    maybeTriggerCosmicEvent(dtSec);
    updateCosmicEvent(dtSec);

    const modifiers = getWorldModifiers();
    updateFlora(dtSec, modifiers);
    updateHerds();

    const currentPopulation = creatures.length;
    for (let i = 0; i < currentPopulation; i += 1) {
        creatures[i].step(dtSec, modifiers);
        maybeReproduce(creatures[i], dtSec, modifiers);
    }

    updateNests(dtSec);
    cleanupCreatures();
    updateCosmicPressure();
    maybeTriggerExtinction(dtSec);
    updateCosmicPressure();
    sampleHistory();
    drawWorld(dtSec);
    updateHud();

    requestAnimationFrame(update);
}

const savedGraphicsQuality = localStorage.getItem('xeno-graphics-quality');
if (['low', 'medium', 'high'].includes(savedGraphicsQuality)) {
    settings.graphicsQuality = savedGraphicsQuality;
    qualitySelect.value = savedGraphicsQuality;
}
fx.setQuality(settings.graphicsQuality);
resizeCanvas();
seedWorld();
requestAnimationFrame(update);
