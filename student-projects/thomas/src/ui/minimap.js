export function createMinimap(worldRadius) {
    const minimapCanvas = document.createElement('canvas');
    minimapCanvas.width = 200;
    minimapCanvas.height = 200;
    minimapCanvas.style.position = 'absolute';
    minimapCanvas.style.top = '20px';
    minimapCanvas.style.right = '20px';
    minimapCanvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    minimapCanvas.style.border = '2px solid white';
    document.body.appendChild(minimapCanvas);

    const minimapCtx = minimapCanvas.getContext('2d');
    const mapX = (x) => ((x + worldRadius) / (worldRadius * 2)) * minimapCanvas.width;
    const mapZ = (z) => ((z + worldRadius) / (worldRadius * 2)) * minimapCanvas.height;

    function render(towers, bots, playerPos) {
        if (!minimapCtx) return;
        minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

        minimapCtx.fillStyle = '#888';
        for (const tower of towers) {
            minimapCtx.fillRect(mapX(tower.position.x) - 3, mapZ(tower.position.z) - 3, 6, 6);
        }

        minimapCtx.fillStyle = '#ff0000';
        for (const bot of bots) {
            minimapCtx.beginPath();
            minimapCtx.arc(mapX(bot.position.x), mapZ(bot.position.z), 3, 0, Math.PI * 2);
            minimapCtx.fill();
        }

        minimapCtx.fillStyle = '#00ff00';
        minimapCtx.beginPath();
        minimapCtx.arc(mapX(playerPos.x), mapZ(playerPos.z), 3.5, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    return { canvas: minimapCanvas, ctx: minimapCtx, render };
}
