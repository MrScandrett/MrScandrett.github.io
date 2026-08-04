const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');

// Shark speed controller (connected to the UI slider)
const speedSlider = document.getElementById('speedSlider');
let sharkSpeed = Number(speedSlider.value);
speedSlider.addEventListener('input', () => {
    sharkSpeed = Number(speedSlider.value);
});

canvas.width = 800;
canvas.height = 600;

let score = 0;
let gameActive = true;
const sharks = [];
const player = { x: 400, y: 300, radius: 15, color: '#2ecc71' };

// --- NEW: Survival Timer ---
// This increases the score by 1 every second (1000ms)
const survivalTimer = setInterval(() => {
    if (gameActive) {
        score++;
        scoreElement.innerText = `Score: ${score}`;
    } else {
        clearInterval(survivalTimer); // Stop counting when dead
    }
}, 1000);

// Handle mouse movement
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left;
    player.y = e.clientY - rect.top;
});

class Shark {
    constructor() {
        this.radius = 25;
        this.reset();
    }

    reset() {
        // Start sharks off-screen to the right
        this.x = canvas.width + 100;
        this.y = Math.random() * canvas.height;
        // Each shark has a random movement factor so they don't all move identically
        this.randomFactor = 0.5 + Math.random() * 1.5;
    }

    update() {
        // Movement uses the UI-controlled `sharkSpeed`. When slider is 0, sharks stop.
        this.x -= sharkSpeed * this.randomFactor;
        // If shark goes off left side, wrap it back to the right
        if (this.x + this.radius < -50) {
            this.reset();
        }
    }

    draw() {
        ctx.fillStyle = '#e74c3c'; // Red shark
        // Body
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius, this.radius/2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shark Fin
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 5);
        ctx.lineTo(this.x - 10, this.y - 25);
        ctx.lineTo(this.x + 10, this.y - 5);
        ctx.fill();
    }
}

// Spawn 8 sharks
for(let i = 0; i < 8; i++) {
    // Stagger spawn times so they don't all come at once
    setTimeout(() => sharks.push(new Shark()), i * 800);
}

function checkCollision(p, s) {
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Simple circular collision detection
    return distance < p.radius + (s.radius * 0.7);
}

function gameLoop() {
    if (!gameActive) return;

    // Clear background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Player (Green Fish)
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y, player.radius, player.radius/1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Player Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x + 8, player.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Update and Draw Sharks
    sharks.forEach(shark => {
        shark.update();
        shark.draw();

        if (checkCollision(player, shark)) {
            gameActive = false;
            gameOverScreen.classList.remove('hidden');
        }
    });

    requestAnimationFrame(gameLoop);
}

gameLoop();
