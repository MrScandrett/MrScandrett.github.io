const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreVal');
const clockEl = document.getElementById('shotClock');
const msgEl = document.getElementById('msg');
const timeoutEl = document.getElementById('timeoutCount');
const aiTimeoutEl = document.getElementById('aiTimeoutCount');

// Game State
let gameActive = false;
let isPaused = false;
let score = 0;
let aiScore = 0;
let keys = {};
let clock = 10.0;
let timer;

// Mechanics State
let timeoutsLeft = 3;
let aiTimeoutsLeft = 3;
let isTimeOut = false; // Can be false, "player", or "ai"

// Heat Check State
let playerMakesInARow = 0;
let heatCheckActive = false;

const roster = {
    'Curry': { color: '#f1c40f', speed: 7, power: 14, name: "CURRY" },
    'LeBron': { color: '#3498db', speed: 9, power: 11, name: "LEBRON" }
};

let player = { x: 200, y: 0, w: 30, h: 55, dy: 0, jumping: false, ball: true, stamina: 100 };
let ai = { x: 0, y: 0, w: 30, h: 60, dy: 0, jumping: false, speed: 5.5, ball: false, stamina: 100 };
let ball = { x: 0, y: 0, vx: 0, vy: 0, active: false, r: 10, startX: 0 };
let hoops = [{ x: 0, y: 0, w: 50, side: 'right' }, { x: 0, y: 0, w: 50, side: 'left' }]; 
const gravity = 0.5;
let activeStats = roster['Curry'];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    hoops[0].x = canvas.width - 80; hoops[0].y = canvas.height * 0.45;
    hoops[1].x = 30; hoops[1].y = canvas.height * 0.45;
    player.y = canvas.height - 110;
    ai.y = canvas.height - 110;
    ai.x = canvas.width - 200;
}

window.addEventListener('resize', resize);
resize();

function selectPlayer(p) {
    activeStats = roster[p];
    document.getElementById('overlay').style.display = 'none';
    gameActive = true;
    startClock();
    requestAnimationFrame(update);
}

function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;
    document.getElementById('pauseMenu').style.display = isPaused ? 'flex' : 'none';
    if (!isPaused) requestAnimationFrame(update);
}

function startClock() {
    if(timer) clearInterval(timer);
    clock = 10.0;
    timer = setInterval(() => {
        if (gameActive && !isPaused && (player.ball || ai.ball) && !isTimeOut) {
            clock -= 0.1;
            clockEl.innerText = Math.max(0, clock).toFixed(1);
            if (clock <= 0) {
                // Turnover logic
                const wasPlayer = player.ball;
                player.ball = false; ai.ball = false; ball.active = false;
                ball.x = canvas.width / 2; ball.y = canvas.height - 70;
                clock = 10.0;
                msgEl.innerText = wasPlayer ? "SHOT CLOCK VIOLATION! AI BALL" : "AI VIOLATION! YOUR BALL";
                if (wasPlayer) ai.ball = true; else player.ball = true;
            }
        }
    }, 100);
}

function triggerHeatCheck() {
    if (heatCheckActive) return;
    heatCheckActive = true;
    msgEl.innerText = "HE'S ON FIRE!!";
    activeStats.speed += 2;
    setTimeout(() => {
        heatCheckActive = false;
        playerMakesInARow = 0;
        activeStats.speed -= 2;
        msgEl.innerText = "COOLED DOWN";
    }, 15000);
}

function checkWin() {
    if (score >= 21 || aiScore >= 21) {
        gameActive = false;
        clearInterval(timer);
        document.getElementById('winScreen').style.display = 'flex';
        document.getElementById('finalScore').innerText = `${score} - ${aiScore}`;
        document.getElementById('winMsg').innerText = score >= 21 ? "CHAMPION!" : "DEFEAT!";
    }
}

function update() {
    if (!gameActive || isPaused) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- TIME OUT LOGIC ---
    if (player.ball && player.stamina < 15 && !isTimeOut && timeoutsLeft > 0) {
        isTimeOut = "player";
        timeoutsLeft--;
        timeoutEl.innerText = timeoutsLeft;
    } else if (ai.ball && ai.stamina < 15 && !isTimeOut && aiTimeoutsLeft > 0) {
        isTimeOut = "ai";
        aiTimeoutsLeft--;
        aiTimeoutEl.innerText = aiTimeoutsLeft;
    }

    if (isTimeOut) {
        msgEl.innerText = isTimeOut === "player" ? "PLAYER TIME OUT!" : "AI TIME OUT!";
        if (isTimeOut === "player") {
            player.stamina += 0.8;
            if (ai.x < canvas.width - 200) ai.x += ai.speed;
        } else {
            ai.stamina += 0.8;
            if (player.x > 200) player.x -= activeStats.speed;
        }
        if ((isTimeOut === "player" && player.stamina >= 95) || (isTimeOut === "ai" && ai.stamina >= 95)) {
            isTimeOut = false;
            msgEl.innerText = "PLAY RESUMED!";
            clock = 10.0;
        }
        draw();
        requestAnimationFrame(update);
        return;
    }

    // Stamina Regen
    [player, ai].forEach(p => { if (p.stamina < 100) p.stamina += 0.2; });

    // AI Logic
    if (ai.ball) {
        if (ai.x - hoops[1].x > 250) ai.x -= ai.speed;
        else if (!ai.jumping) shoot(ai, hoops[1]);
    } else if (player.ball) {
        let guardPos = player.x + 80;
        if (ai.x < guardPos) ai.x += ai.speed;
        if (ai.x > guardPos + 20) ai.x -= ai.speed;
        if (player.jumping && Math.abs(ai.x - player.x) < 150 && !ai.jumping) {
            ai.jumping = true; ai.dy = -14;
        }
    } else if (!ball.active) {
        if (ai.x < ball.x) ai.x += ai.speed; else ai.x -= ai.speed;
        if (Math.abs(ai.x - ball.x) < 30 && Math.abs(ai.y - ball.y) < 50) { ai.ball = true; clock = 10; }
    }

    // Player Movement
    let currentSpeed = player.stamina > 10 ? activeStats.speed : activeStats.speed * 0.5;
    if (player.ball) {
        if (keys['KeyA'] && player.x > 80) { player.x -= currentSpeed; player.stamina -= 0.3; }
        if (keys['KeyD'] && player.x < canvas.width - 80) { player.x += currentSpeed; player.stamina -= 0.3; }
    } else if (!ai.ball && !ball.active) {
        if (player.x < ball.x) player.x += currentSpeed; else player.x -= currentSpeed;
        if (Math.abs(player.x - ball.x) < 30) { player.ball = true; clock = 10; }
    }

    // Physics
    [player, ai].forEach(p => {
        if (p.jumping) {
            p.y += p.dy; p.dy += gravity;
            if (p.y >= canvas.height - 110) { p.y = canvas.height - 110; p.jumping = false; p.dy = 0; }
        }
    });

    // Ball Physics
    if (ball.active) {
        ball.x += ball.vx; ball.y += ball.vy; ball.vy += gravity;
        if (ai.jumping && !ai.ball && Math.hypot(ball.x - ai.x, ball.y - ai.y) < 40) {
            ball.vx *= -0.5; ball.vy = -2;
            msgEl.innerText = "BLOCKED BY AI!";
        }
        if (ball.y > canvas.height - 70) { ball.active = false; ball.y = canvas.height - 70; }
        
        hoops.forEach((h, index) => {
            if (ball.vy > 0 && Math.abs(ball.x - (h.x + 25)) < 30 && Math.abs(ball.y - h.y) < 20) {
                let isThree = Math.abs(ball.startX - (h.x + 25)) > canvas.width * 0.35;
                let points = isThree ? 3 : 2;
                if (index === 0) { 
                    score += points; scoreEl.innerText = score; 
                    if (isThree) { playerMakesInARow++; if(playerMakesInARow >= 2) triggerHeatCheck(); }
                    else playerMakesInARow = 0;
                } else { 
                    aiScore += points; document.getElementById('aiScoreVal').innerText = aiScore;
                }
                ball.active = false; ball.y = canvas.height - 70;
                checkWin();
            }
        });
    }

    // Update UI Stamina
    document.getElementById('playerStamina').style.width = player.stamina + "%";
    document.getElementById('aiStamina').style.width = ai.stamina + "%";

    draw();
    requestAnimationFrame(update);
}

function shoot(p, target) {
    if (p.stamina < 10) return;
    p.jumping = true; p.dy = -13;
    p.stamina -= 10;
    setTimeout(() => {
        if (!p.ball) return;
        p.ball = false; ball.active = true;
        ball.x = p.x; ball.y = p.y; ball.startX = p.x;
        let dx = (target.x + 25) - p.x;
        let dy = target.y - p.y;
        ball.vx = dx / 40;
        ball.vy = (dy / 40) - (0.5 * gravity * 40); 
        clock = 10.0;
    }, 300);
}

function draw() {
    // Background/Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, canvas.height - 60, canvas.width * 0.35, 0, -Math.PI/2, true); ctx.stroke();
    ctx.beginPath(); ctx.arc(canvas.width, canvas.height - 60, canvas.width * 0.35, Math.PI, Math.PI * 1.5); ctx.stroke();

    // Court
    ctx.fillStyle = '#d35400'; ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    hoops.forEach(h => {
        ctx.fillStyle = '#666'; ctx.fillRect(h.side === 'right' ? canvas.width-10 : 0, h.y-80, 10, 150);
        ctx.fillStyle = 'red'; ctx.fillRect(h.x, h.y, h.w, 10);
    });

    // Players
    ctx.fillStyle = heatCheckActive ? ((Date.now() % 200 < 100) ? "#ff4500" : "#fff") : activeStats.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(ai.x, ai.y, ai.w, ai.h);

    // Ball
    ctx.fillStyle = '#ff8c00';
    if (ball.active || (!player.ball && !ai.ball)) {
        ctx.beginPath(); ctx.arc(ball.x, ball.y, 10, 0, Math.PI*2); ctx.fill();
    } else {
        let c = player.ball ? player : ai;
        ctx.beginPath(); ctx.arc(c.x + (player.ball ? 25 : -5), c.y - 15, 10, 0, Math.PI*2); ctx.fill();
    }
}

window.addEventListener('keydown', e => {
    if (e.code === 'KeyP') togglePause();
    keys[e.code] = true;
    if (e.code === 'Space' && !player.jumping && player.stamina > 20) { player.jumping = true; player.dy = -15; player.stamina -= 15; }
});
window.addEventListener('keyup', e => {
    if (e.code === 'Space' && player.ball) shoot(player, hoops[0]);
    keys[e.code] = false;
});