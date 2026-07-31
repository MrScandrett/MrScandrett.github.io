function getBiomeAtDepth(yTile) {
    if (yTile < 70) return BIOME_TYPES.CORAL;
    if (yTile < 130) return BIOME_TYPES.BAYOU;
    if (yTile < 190) return BIOME_TYPES.ARCTIC;
    return BIOME_TYPES.TRENCH;
}

function generateMap() {
    const map = [];
    const noise = (x, y, freq) => Math.sin(x * freq) * Math.sin(y * freq) + Math.random() * 0.2;

    for (let y = 0; y < MAP_HEIGHT; y++) {
        const row = [];
        const currentBiome = getBiomeAtDepth(y);

        for (let x = 0; x < MAP_WIDTH; x++) {
            let tile = 0;
            // Border walls
            if (x === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1) {
                tile = 1;
            } else if (y > 3) { // Leave surface clear
                const n = noise(x, y, 0.15);
                
                if (currentBiome === BIOME_TYPES.CORAL) {
                    // Swiss cheese caves
                    if (n > 0.4 && Math.random() < 0.8) tile = 1;
                } else if (currentBiome === BIOME_TYPES.BAYOU) {
                    if (Math.sin(x * 0.5) > 0.7 || n > 0.6) tile = 1;
                } else if (currentBiome === BIOME_TYPES.ARCTIC) {
                    // Jagged ice
                    if (Math.abs(Math.sin(x * 0.8 + y * 0.1)) > 0.8 || n > 0.5) tile = 1;
                } else if (currentBiome === BIOME_TYPES.TRENCH) {
                    // Open but tight squeezes
                    if (x < 20 || x > MAP_WIDTH - 20) {
                         if (n > 0.3) tile = 1;
                    } else {
                         if (n > 0.7) tile = 1;
                    }
                }
            }
            row.push(tile);
        }
        map.push(row);
    }

    // Clear Spawn Area
    const cx = Math.floor(MAP_WIDTH / 2);
    for(let y = 0; y < 15; y++) { 
        for(let x = cx - 3; x <= cx + 3; x++) {
            if(y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) map[y][x] = 0;
        }
    }

    // Carve a clear path down to the cave entrance area.
    const caveTileX = MAP_WIDTH - 10;
    for (let y = 4; y < MAP_HEIGHT - 2; y++) {
        for (let x = caveTileX - 2; x <= caveTileX + 2; x++) {
            if (x > 0 && x < MAP_WIDTH - 1) map[y][x] = 0;
        }
    }
    for (let y = MAP_HEIGHT - 24; y < MAP_HEIGHT - 2; y++) {
        for (let x = caveTileX - 6; x <= caveTileX + 6; x++) {
            if (y > 0 && y < MAP_HEIGHT - 1 && x > 0 && x < MAP_WIDTH - 1) {
                map[y][x] = 0;
            }
        }
    }
    return map;
}

function generateFlora(map, biome) {
    const flora = [];
    for (let y = 5; y < MAP_HEIGHT; y++) { 
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (map[y][x] === 1 && map[y - 1][x] === 0) { // On top of a block
                if (Math.random() < 0.4) {
                    flora.push({ 
                        x: x * TILE_SIZE + (TILE_SIZE/2), 
                        y: (y - 1) * TILE_SIZE + (TILE_SIZE/2), 
                        radius: 12,
                        type: getRandomItemType()
                    });
                }
            }
        }
    }
    return flora;
}

function generateWildlife(map) {
    const fish = [];
    const ranges = {
        [BIOME_TYPES.CORAL]: { min: 5, max: 69, schools: 32, schoolMin: 3, schoolMax: 6 },
        [BIOME_TYPES.BAYOU]: { min: 70, max: 129, schools: 12, schoolMin: 2, schoolMax: 5 },
        [BIOME_TYPES.ARCTIC]: { min: 130, max: 189, schools: 11, schoolMin: 2, schoolMax: 5 },
        [BIOME_TYPES.TRENCH]: { min: 190, max: MAP_HEIGHT - 3, schools: 9, schoolMin: 1, schoolMax: 4 }
    };

    Object.entries(ranges).forEach(([biome, range]) => {
        const speciesList = FISH_SPECIES[biome];
        for (let school = 0; school < range.schools; school++) {
            let anchor = null;
            for (let attempt = 0; attempt < 50 && !anchor; attempt++) {
                const tx = 2 + Math.floor(Math.random() * (MAP_WIDTH - 4));
                const ty = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
                if (map[ty] && map[ty][tx] === 0) {
                    anchor = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
                }
            }
            if (!anchor) continue;

            const speciesIndex = school % speciesList.length;
            const count = range.schoolMin + Math.floor(Math.random() * (range.schoolMax - range.schoolMin + 1));
            const facing = Math.random() < 0.5 ? -1 : 1;
            for (let member = 0; member < count; member++) {
                const x = anchor.x - facing * member * (10 + Math.random() * 7);
                const y = anchor.y + (member % 2 ? 1 : -1) * Math.ceil(member / 2) * 6;
                if (x < TILE_SIZE * 1.5 || x > MAP_WIDTH * TILE_SIZE - TILE_SIZE * 1.5) continue;
                if (checkWallCollision({ x, y }, 4, map)) continue;
                fish.push({
                    x, y,
                    homeY: y,
                    minY: range.min * TILE_SIZE + 6,
                    maxY: (range.max + 1) * TILE_SIZE - 6,
                    biome,
                    speciesIndex,
                    school,
                    facing,
                    speedScale: 0.82 + Math.random() * 0.36,
                    phase: Math.random() * Math.PI * 2,
                    turnCooldown: 0
                });
            }
        }
    });

    // The map generator deliberately clears this central surface corridor.
    // Seed one compact school of every reef species here so a new game always
    // opens with visible biodiversity rather than relying entirely on chance.
    const starterSchools = [
        { x: MAP_WIDTH * TILE_SIZE * 0.49, y: 132, speciesIndex: 0, facing: 1 },
        { x: MAP_WIDTH * TILE_SIZE * 0.51, y: 168, speciesIndex: 1, facing: -1 },
        { x: MAP_WIDTH * TILE_SIZE * 0.49, y: 228, speciesIndex: 2, facing: 1 },
        { x: MAP_WIDTH * TILE_SIZE * 0.51, y: 282, speciesIndex: 3, facing: -1 }
    ];
    starterSchools.forEach((starter, schoolIndex) => {
        for (let member = 0; member < 5; member++) {
            const x = starter.x - starter.facing * member * 12;
            const y = starter.y + (member % 2 ? 1 : -1) * Math.ceil(member / 2) * 6;
            if (checkWallCollision({ x, y }, 4, map)) continue;
            fish.push({
                x, y,
                homeY: y,
                minY: 5 * TILE_SIZE + 6,
                maxY: 69 * TILE_SIZE,
                biome: BIOME_TYPES.CORAL,
                speciesIndex: starter.speciesIndex,
                school: 100 + schoolIndex,
                facing: starter.facing,
                speedScale: 0.9 + member * 0.04,
                phase: member * 0.7,
                turnCooldown: 0
            });
        }
    });

    return fish;
}

function generateOxygen(map) {
    const bubbles = [];
    for (let y = 10; y < MAP_HEIGHT; y += 5) {
       for (let x = 1; x < MAP_WIDTH - 1; x++) {
          const depthFactor = y / MAP_HEIGHT;
          const chance = 0.02 * (1 - depthFactor * 0.5); 
          
          if (map[y][x] === 0 && Math.random() < chance) {
               bubbles.push({
                   x: x * TILE_SIZE + TILE_SIZE/2, 
                   y: y * TILE_SIZE + TILE_SIZE/2,
                   radius: 10,
                   type: 'OXYGEN'
               });
          }
       }
    }
    return bubbles;
}

function getRandomItemType() {
    const rand = Math.random();
    if (rand < 0.4) return 'ITEM_SHELL';
    if (rand < 0.7) return 'ITEM_FORK';
    if (rand < 0.9) return 'ITEM_BOTTLE';
    return 'ITEM_BOOT';
}

function checkWallCollision(pos, radius, map) {
    const tileX = Math.floor(pos.x / TILE_SIZE);
    const tileY = Math.floor(pos.y / TILE_SIZE);

    for (let y = tileY - 1; y <= tileY + 1; y++) {
        for (let x = tileX - 1; x <= tileX + 1; x++) {
            if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
                if (map[y][x] === 1) {
                    const closestX = Math.max(x * TILE_SIZE, Math.min(pos.x, (x + 1) * TILE_SIZE));
                    const closestY = Math.max(y * TILE_SIZE, Math.min(pos.y, (y + 1) * TILE_SIZE));
                    
                    const dx = pos.x - closestX;
                    const dy = pos.y - closestY;
                    
                    if ((dx * dx + dy * dy) < (radius * radius)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

// Helper: Rectangle Collision
function checkCollisionRect(r1, r2) {
    return (r1.x < r2.x + r2.w &&
            r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.height > r2.y);
}

// Helper: Circle Collision
function checkCollisionCircle(rect, circle) {
    return (rect.x < circle.x + circle.radius &&
            rect.x + rect.width > circle.x - circle.radius &&
            rect.y < circle.y + circle.radius &&
            rect.y + rect.height > circle.y - circle.radius);
}

// Lighten/darken a hex color by a percentage (-100 to 100)
function shadeColor(hexColor, percent) {
    const num = parseInt(hexColor.slice(1), 16);
    const target = percent < 0 ? 0 : 255;
    const p = Math.abs(percent) / 100;
    const r = num >> 16, g = (num >> 8) & 0xff, b = num & 0xff;
    const newR = Math.round((target - r) * p) + r;
    const newG = Math.round((target - g) * p) + g;
    const newB = Math.round((target - b) * p) + b;
    return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB).toString(16).slice(1)}`;
}

// Deterministic pseudo-random 0..1 from world-space coordinates (stable across frames)
function hashCoord(x, y) {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return s - Math.floor(s);
}
