// --- Configuration ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startMsgElement = document.getElementById('start-msg');

// Game settings
const TILE_SIZE = 20;
const TILE_COUNT = canvas.width / TILE_SIZE;
const GAME_SPEED = 100; // Milliseconds per frame (lower is faster)

// --- Self-contained sound effects ---
let audioContext;
function playTone(frequency, duration, wave = 'square') {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

// --- Game State ---
const HIGH_SCORE_KEY = 'snakeHighScore';
let score = 0;
let highScore = 0;
let gameInterval;
let currentSpeed = GAME_SPEED;
let isGameRunning = false;
let isPaused = false;

// Velocity (x, y)
let dx = 0;
let dy = 0;
// The direction the snake actually moved last step. Turning is checked
// against this, so two quick key presses can't reverse the snake into itself.
let lastDx = 0;
let lastDy = 0;

// Snake body (array of coordinates)
let snake = [];

// Food position
let food = { x: 10, y: 10 };

// --- Initialization ---
function resetGame() {
    // Start in the middle
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    score = 0;
    dx = 1; // Start moving right
    dy = 0;
    lastDx = dx;
    lastDy = dy;
    scoreElement.innerText = score;
    currentSpeed = GAME_SPEED;
    placeFood();
}

function startGame() {
    if (isGameRunning) return;
    isGameRunning = true;
    isPaused = false;
    resetGame();
    gameInterval = setInterval(gameLoop, currentSpeed);
    startMsgElement.style.visibility = 'hidden';
}

function gameOver() {
    clearInterval(gameInterval);
    isGameRunning = false;
    playTone(110, 0.45, 'sawtooth');

    if (score > highScore) {
        highScore = score;
        localStorage.setItem(HIGH_SCORE_KEY, highScore);
        highScoreElement.innerText = highScore;
    }

    alert(`Game Over! Your Score: ${score}`);
    startMsgElement.style.visibility = 'visible';
    // Reset visuals for next game
    resetGame();
    draw();
}

// --- Core Logic ---
function gameLoop() {
    update();
    draw();
}

function update() {
    // Calculate new head position
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // 1. Check Wall Collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
        return;
    }

    // 2. Check Self Collision
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    // Add new head to the snake array
    snake.unshift(head);
    lastDx = dx;
    lastDy = dy;

    // 3. Check Food Collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.innerText = score;
        playTone(520, 0.09);

        // Increase speed (decrease interval duration)
        currentSpeed = Math.max(50, currentSpeed - 2);
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, currentSpeed);

        placeFood();
        // Don't pop the tail, so the snake grows
    } else {
        // Remove the tail to maintain size
        snake.pop();
    }
}

function placeFood() {
    // Random position between 0 and TILE_COUNT - 1
    food.x = Math.floor(Math.random() * TILE_COUNT);
    food.y = Math.floor(Math.random() * TILE_COUNT);

    // Ensure food doesn't spawn on the snake body
    snake.forEach(part => {
        if (part.x === food.x && part.y === food.y) {
            placeFood(); // Recursively try again
        }
    });
}

// --- Rendering ---
function draw() {
    // Clear screen
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Food
    ctx.fillStyle = '#ff3333'; // Red
    ctx.fillRect(food.x * TILE_SIZE, food.y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);

    // Draw Snake
    ctx.fillStyle = '#33ff33'; // Neon Green
    snake.forEach((part, index) => {
        // Make the head a slightly different color
        if (index === 0) ctx.fillStyle = '#ccffcc';
        else ctx.fillStyle = '#33ff33';

        ctx.fillRect(part.x * TILE_SIZE, part.y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
    });
}

// --- Input Handling ---
document.addEventListener('keydown', changeDirection);

function togglePause() {
    if (isPaused) {
        isPaused = false;
        gameInterval = setInterval(gameLoop, currentSpeed);
    } else {
        isPaused = true;
        clearInterval(gameInterval);
        
        // Draw Pause Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '30px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

// WASD works as well as the arrow keys
const KEY_ALIASES = { KeyW: 'ArrowUp', KeyA: 'ArrowLeft', KeyS: 'ArrowDown', KeyD: 'ArrowRight' };

function changeDirection(event) {
    const code = KEY_ALIASES[event.code] || event.code;

    // Prevent scrolling with arrow keys
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight", "Space"].indexOf(code) > -1) {
        event.preventDefault();
    }

    if (!isGameRunning) {
        startGame();
        return;
    }

    if (code === 'Space') {
        togglePause();
        return;
    }

    if (isPaused) return;

    const LEFT_KEY = 'ArrowLeft';
    const RIGHT_KEY = 'ArrowRight';
    const UP_KEY = 'ArrowUp';
    const DOWN_KEY = 'ArrowDown';

    const keyPressed = code;
    
    // Prevent reversing directly (e.g., going Left while moving Right)
    const goingUp = lastDy === -1;
    const goingDown = lastDy === 1;
    const goingRight = lastDx === 1;
    const goingLeft = lastDx === -1;

    if (keyPressed === LEFT_KEY && !goingRight) {
        dx = -1; dy = 0;
    }
    if (keyPressed === UP_KEY && !goingDown) {
        dx = 0; dy = -1;
    }
    if (keyPressed === RIGHT_KEY && !goingLeft) {
        dx = 1; dy = 0;
    }
    if (keyPressed === DOWN_KEY && !goingUp) {
        dx = 0; dy = 1;
    }
}

function loadInitialState() {
    // Load high score from storage, defaulting to 0 if not found
    const storedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
    highScore = storedHighScore ? parseInt(storedHighScore, 10) : 0;
    highScoreElement.innerText = highScore;

    resetGame();
    draw();
}

// --- Touch: swipe on the board to steer, tap to start ---
let swipeStart = null;
canvas.addEventListener('pointerdown', (event) => {
    swipeStart = { x: event.clientX, y: event.clientY };
    if (!isGameRunning) startGame();
});
canvas.addEventListener('pointermove', (event) => {
    if (!swipeStart) return;
    const moveX = event.clientX - swipeStart.x;
    const moveY = event.clientY - swipeStart.y;
    if (Math.max(Math.abs(moveX), Math.abs(moveY)) < 24) return;
    const code = Math.abs(moveX) > Math.abs(moveY)
        ? (moveX > 0 ? 'ArrowRight' : 'ArrowLeft')
        : (moveY > 0 ? 'ArrowDown' : 'ArrowUp');
    changeDirection({ code, preventDefault() {} });
    swipeStart = { x: event.clientX, y: event.clientY }; // keep swiping to turn again
});
canvas.addEventListener('pointerup', () => { swipeStart = null; });
canvas.addEventListener('pointercancel', () => { swipeStart = null; });

// Initial draw to show the snake before starting
loadInitialState();
