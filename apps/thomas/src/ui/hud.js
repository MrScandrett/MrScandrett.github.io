export function createHealthDisplay() {
    const healthDisplay = document.createElement('div');
    healthDisplay.style.position = 'absolute';
    healthDisplay.style.bottom = '20px';
    healthDisplay.style.left = '20px';
    healthDisplay.style.color = '#ff3333';
    healthDisplay.style.fontSize = '32px';
    healthDisplay.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(healthDisplay);

    function update(health, level, score) {
        healthDisplay.innerHTML = `Health: ${Math.floor(health)} Level: ${level} Score: ${score}`;
    }

    return { element: healthDisplay, update };
}
