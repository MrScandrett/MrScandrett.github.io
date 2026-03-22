const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const bgCanvas = document.createElement('canvas');
const bgCtx = bgCanvas.getContext('2d');

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

const settings = {
    shadows: true,
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
let selectedCreature = null;

const environment = {
    time: 0,
    stars: [],
    speckles: [],
    rocks: [],
    ridges: [],
    foregroundRocks: [],
    currentEvent: null,
    cosmicPressure: 0,
    lastEventAt: -9999,
    lastExtinctionAt: -9999
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
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
            this.hasSpikes = Math.random() > 0.22;
            this.hasBiolume = Math.random() > 0.6;
        } else {
            this.speed = randomBetween(1.2, 2.3);
            this.range = randomBetween(78, 145);
            this.aggression = randomBetween(0.04, 0.18);
            this.fertility = randomBetween(0.78, 1.18);
            this.hasSpikes = Math.random() > 0.72;
            this.hasBiolume = Math.random() > 0.44;
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
        child.hasSpikes = Math.random() < 0.08 ? !this.hasSpikes : this.hasSpikes;
        child.hasBiolume = Math.random() < 0.11 ? !this.hasBiolume : this.hasBiolume;

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
    }

    get isPredator() {
        return this.genome.species === 1;
    }

    get radius() {
        return this.isPredator ? 11 : 8;
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
        return shelter.dist < shelter.mushroom.r * 1.15 && distanceBetween(this.x, this.y, hunter.x, hunter.y) > 46;
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
        }
    }

    markDead(reason) {
        if (this.dead) {
            return;
        }
        this.dead = true;
        this.deathReason = reason;
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

        let metabolism = this.genome.metabolism * dtSec * modifiers.energyTax;
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
        const food = findNearestPlant(this.x, this.y, this.genome.range * (1 + modifiers.lightBoost * 0.25));
        if (food) {
            this.state = 'forage';
            this.angle = lerpAngle(this.angle, angleTowards(this.x, this.y, food.plant.x, food.plant.y), 0.14);
            this.moveForward(this.genome.speed * 0.95, dtSec);
            if (food.dist < this.radius + 5) {
                this.eatPlant(food);
            }
            return;
        }

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

        this.wander(dtSec, modifiers, 0.34);
    }

    draw() {
        const pulse = Math.sin(this.frame) * 1.2;
        const bodyColor = this.isPredator ? '#4a1730' : '#122f4d';
        const accent = this.isPredator ? PALETTE.coral : PALETTE.neonBlue;
        const belly = this.isPredator ? '#7d2b48' : '#1b4f7a';
        const fin = this.isPredator ? '#ff6e63' : '#68d8ff';

        ctx.save();
        ctx.translate(this.x, this.y + pulse);
        ctx.rotate(this.angle);

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

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        safeEllipse(ctx, 0, 0, this.radius * 1.15, this.radius * 0.7);
        ctx.fill();

        ctx.fillStyle = belly;
        ctx.beginPath();
        safeEllipse(ctx, 2, 1, this.radius * 0.68, this.radius * 0.36);
        ctx.fill();

        ctx.fillStyle = fin;
        ctx.beginPath();
        ctx.moveTo(-this.radius * 1.15, 0);
        ctx.lineTo(-this.radius * 1.7, -this.radius * 0.5);
        ctx.lineTo(-this.radius * 1.6, this.radius * 0.45);
        ctx.closePath();
        ctx.fill();

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
        ctx.arc(this.radius * 0.65, -1.5, 1.8, 0, Math.PI * 2);
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

        ctx.restore();
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

    if (Math.random() < (fromPredator ? 0.45 : 0.28) && mushrooms.length < settings.maxMushrooms + 12) {
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
            color
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

    environment.speckles.forEach((speckle) => {
        bgCtx.fillStyle = hexToRgba('#ffffff', speckle.alpha);
        bgCtx.fillRect(speckle.x, speckle.y, speckle.s, speckle.s);
    });

    const planetX = width * 0.82;
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
            break;
        }
        case 'spore_bloom':
            ctx.fillStyle = hexToRgba('#8fff6f', 0.08);
            ctx.fillRect(0, height * 0.42, width, height * 0.58);
            break;
        case 'void_eclipse':
            ctx.fillStyle = hexToRgba('#131733', 0.2);
            ctx.fillRect(0, 0, width, height);
            break;
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
    }
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
        ctx.globalAlpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, 2, 2);
        ctx.globalAlpha = 1;
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

function drawWorld() {
    const { width, height } = viewport();
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bgCanvas, 0, 0, width, height);
    drawStars();
    drawEventSky(width, height);
    drawPlants();
    drawMushrooms();

    const sortedCreatures = [...creatures].sort((a, b) => a.y - b.y);
    for (let i = 0; i < sortedCreatures.length; i += 1) {
        sortedCreatures[i].draw();
    }

    drawSelection();
    drawForeground(width, height);
    drawParticles();
}

function updateFlora(dtSec, modifiers) {
    if (plants.length < settings.maxPlants && Math.random() < dtSec * 2.7 * modifiers.plantGrowth) {
        plants.push(createPlant());
    }
    if (mushrooms.length < settings.maxMushrooms && Math.random() < dtSec * 0.34 * modifiers.mushroomGrowth) {
        mushrooms.push(createMushroom());
    }

    for (let i = plants.length - 1; i >= 0; i -= 1) {
        plants[i].age += dtSec;
        if (plants[i].age > plants[i].lifespan && Math.random() < dtSec * 1.2) {
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

        if (mushroom.age > mushroom.lifespan && Math.random() < dtSec * 0.7) {
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
    if (Math.random() >= dtSec * 0.07) {
        return;
    }

    const blueprint = EVENT_BLUEPRINTS[Math.floor(Math.random() * EVENT_BLUEPRINTS.length)];
    environment.currentEvent = {
        type: blueprint.type,
        name: blueprint.name,
        color: blueprint.color,
        pressure: blueprint.pressure,
        message: blueprint.message,
        remaining: randomBetween(blueprint.duration[0], blueprint.duration[1])
    };
    environment.lastEventAt = environment.time;
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

    if (environment.currentEvent.type === 'meteor_dust' && Math.random() < dtSec * 5) {
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
    if (Math.random() >= dtSec * chancePerSecond) {
        return;
    }

    environment.lastExtinctionAt = environment.time;
    const severity = clamp(0.28 + environment.cosmicPressure * 0.22, 0.28, 0.68);
    for (let i = 0; i < creatures.length; i += 1) {
        if (Math.random() < severity) {
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

    for (let i = 0; i < 80; i += 1) {
        spawnParticles(randomBetween(0, viewport().width), randomBetween(0, viewport().height), 2, '#ff5b70');
    }
}

function maybeReproduce(creature, dtSec, modifiers) {
    if (creature.dead || creature.reproductionCooldown > 0 || creatures.length >= settings.maxCreatures) {
        return;
    }

    const maturity = creature.age / creature.maxAge;
    const energyGate = creature.isPredator ? 155 : 118;
    const recentMealGate = creature.isPredator ? environment.time - creature.lastMealAt < 18 : true;
    if (maturity < (creature.isPredator ? 0.34 : 0.22) || creature.energy < energyGate || !recentMealGate) {
        return;
    }

    const chancePerSecond =
        (creature.isPredator ? 0.026 : 0.095) *
        creature.genome.fertility *
        modifiers.reproduction *
        (creature.isPredator && countSpecies().prey < 8 ? 0.4 : 1);

    if (Math.random() >= dtSec * chancePerSecond) {
        return;
    }

    const { width, height } = viewport();
    const ground = groundBand(height);
    creatures.push(new Creature(
        clamp(creature.x + randomBetween(-18, 18), 12, width - 12),
        clamp(creature.y + randomBetween(-12, 12), ground.minY, ground.maxY),
        creature.genome.mutate()
    ));

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
        lab.style.display = 'none';
        return;
    }

    labId.innerText =
        `${selectedCreature.isPredator ? 'Predator' : 'Prey'} @ ${Math.round(selectedCreature.x)}, ${Math.round(selectedCreature.y)}`;
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
    lab.style.display = 'block';
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
    const creature = getNearestCreature(x, y);
    if (creature) {
        showLabFor(creature);
    } else {
        selectedCreature = null;
        lab.style.display = 'none';
    }
});

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
    lab.style.display = 'none';
});

function updateHud() {
    const counts = countSpecies();
    const season = getCurrentSeason();
    const eventName = environment.currentEvent ? environment.currentEvent.name : 'Stable Orbit';
    const pressure = environment.cosmicPressure.toFixed(2);

    statsEl.innerHTML =
        `Pop: ${creatures.length} | Prey: ${counts.prey} | Predators: ${counts.predators}<br>` +
        `Plants: ${plants.length} | Mushrooms: ${mushrooms.length} | Pressure: ${pressure}<br>` +
        `Season: ${season.name} | Time: ${Math.floor(environment.time)}s`;

    if (environment.currentEvent) {
        logEl.innerHTML = `Status: <span class="event-log">${eventName}</span> | ${environment.currentEvent.message}`;
    } else {
        logEl.innerText = `Status: ${eventName} | ${season.name} is shaping the biome.`;
    }

    updateKeplerPanel(counts, season, eventName, pressure);
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
    selectedCreature = null;
    lab.style.display = 'none';

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
    const dtSec = Math.min(0.05, (timestamp - lastTimestamp) / 1000 || 0.016);
    lastTimestamp = timestamp;
    environment.time += dtSec;

    maybeTriggerCosmicEvent(dtSec);
    updateCosmicEvent(dtSec);

    const modifiers = getWorldModifiers();
    updateFlora(dtSec, modifiers);

    const currentPopulation = creatures.length;
    for (let i = 0; i < currentPopulation; i += 1) {
        creatures[i].step(dtSec, modifiers);
        maybeReproduce(creatures[i], dtSec, modifiers);
    }

    cleanupCreatures();
    updateCosmicPressure();
    maybeTriggerExtinction(dtSec);
    updateCosmicPressure();
    drawWorld();
    updateHud();

    requestAnimationFrame(update);
}

resizeCanvas();
seedWorld();
requestAnimationFrame(update);
