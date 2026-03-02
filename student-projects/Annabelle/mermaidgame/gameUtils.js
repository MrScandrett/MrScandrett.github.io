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
