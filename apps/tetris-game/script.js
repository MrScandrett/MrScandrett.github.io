const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const fxCanvas = document.getElementById('fx');
const fxCtx = fxCanvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');
const holdBtn = document.getElementById('holdBtn');

const flashOverlay = document.createElement('div');
flashOverlay.className = 'flash-overlay';
document.body.appendChild(flashOverlay);
function flashScreen(){
	flashOverlay.classList.remove('hit');
	void flashOverlay.offsetWidth; // restart animation
	flashOverlay.classList.add('hit');
}
function shakeBoard(){
	canvas.classList.remove('board-shake');
	void canvas.offsetWidth;
	canvas.classList.add('board-shake');
}
function popScore(){
	scoreEl.classList.remove('pop');
	void scoreEl.offsetWidth;
	scoreEl.classList.add('pop');
}

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// Game Over overlay (created via JS so no HTML edits required)
const gameOverEl = document.createElement('div');
gameOverEl.style.position = 'fixed';
gameOverEl.style.left = '0';
gameOverEl.style.top = '0';
gameOverEl.style.width = '100vw';
gameOverEl.style.height = '100vh';
gameOverEl.style.display = 'none';
gameOverEl.style.alignItems = 'center';
gameOverEl.style.justifyContent = 'center';
gameOverEl.style.background = 'rgba(0,0,0,0.5)';
gameOverEl.style.color = '#fff';
gameOverEl.style.zIndex = '1000';
gameOverEl.style.fontFamily = 'sans-serif';
gameOverEl.style.fontSize = '36px';
gameOverEl.style.pointerEvents = 'none';
gameOverEl.textContent = 'Game Over — press Start to play again';
document.body.appendChild(gameOverEl);

function showGameOver(){ gameOverEl.style.display = 'flex'; }
function hideGameOver(){ gameOverEl.style.display = 'none'; }

const COLS = 10;
const ROWS = 20;
const BLOCK = 24; // display size

canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

ctx.scale(1,1);

const colors = [null,'#00f0f0','#0000f0','#f0a000','#f0f000','#00f000','#a000f0','#f00000'];

function createMatrix(w,h){
	const m = [];
	while(h--) m.push(new Array(w).fill(0));
	return m;
}

const TETROMINOS = {
	I: [
		[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
		[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]
	],
	J: [
		[[2,0,0],[2,2,2],[0,0,0]],
		[[0,2,2],[0,2,0],[0,2,0]],
		[[0,0,0],[2,2,2],[0,0,2]],
		[[0,2,0],[0,2,0],[2,2,0]]
	],
	L: [
		[[0,0,3],[3,3,3],[0,0,0]],
		[[0,3,0],[0,3,0],[0,3,3]],
		[[0,0,0],[3,3,3],[3,0,0]],
		[[3,3,0],[0,3,0],[0,3,0]]
	],
	O: [
		[[4,4],[4,4]]
	],
	S: [
		[[0,5,5],[5,5,0],[0,0,0]],
		[[0,5,0],[0,5,5],[0,0,5]]
	],
	Z: [
		[[6,6,0],[0,6,6],[0,0,0]],
		[[0,0,6],[0,6,6],[0,6,0]]
	],
	T: [
		[[0,7,0],[7,7,7],[0,0,0]],
		[[0,7,0],[0,7,7],[0,7,0]],
		[[0,0,0],[7,7,7],[0,7,0]],
		[[0,7,0],[7,7,0],[0,7,0]]
	]
};

function randomPiece(){
	const keys = Object.keys(TETROMINOS);
	const k = keys[Math.floor(Math.random()*keys.length)];
	const rom = TETROMINOS[k];
	const rotation = 0;
	return { shape: rom, type:k, rot:rotation };
}

function pieceFromType(type){
	return { shape: TETROMINOS[type], type, rot:0 };
}

function rotate(matrix, dir){
	for(let y=0;y<matrix.length;y++){
		for(let x=0;x<y;x++){
			[matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
		}
	}
	if(dir>0) matrix.forEach(row=>row.reverse()); else matrix.reverse();
}

function shade(hex, amt){
	const n = parseInt(hex.slice(1),16);
	let r = Math.min(255, Math.max(0, (n>>16) + amt));
	let g = Math.min(255, Math.max(0, ((n>>8)&0xff) + amt));
	let b = Math.min(255, Math.max(0, (n&0xff) + amt));
	return `rgb(${r},${g},${b})`;
}

function drawCell(x,y, val, alpha=1){
	if(!val) return;
	const px = x*BLOCK, py = y*BLOCK, s = BLOCK-1;
	const base = colors[val];
	ctx.save();
	ctx.globalAlpha = alpha;

	// glow
	ctx.shadowColor = base;
	ctx.shadowBlur = 8;

	// beveled body via gradient
	const grad = ctx.createLinearGradient(px, py, px+s, py+s);
	grad.addColorStop(0, shade(base, 70));
	grad.addColorStop(0.5, base);
	grad.addColorStop(1, shade(base, -60));
	ctx.fillStyle = grad;
	ctx.fillRect(px, py, s, s);
	ctx.shadowBlur = 0;

	// top-left highlight bevel
	ctx.fillStyle = 'rgba(255,255,255,0.55)';
	ctx.beginPath();
	ctx.moveTo(px, py+s);
	ctx.lineTo(px, py);
	ctx.lineTo(px+s, py);
	ctx.lineTo(px+s-4, py+4);
	ctx.lineTo(px+4, py+4);
	ctx.lineTo(px+4, py+s-4);
	ctx.closePath();
	ctx.fill();

	// bottom-right shadow bevel
	ctx.fillStyle = 'rgba(0,0,0,0.45)';
	ctx.beginPath();
	ctx.moveTo(px+s, py);
	ctx.lineTo(px+s, py+s);
	ctx.lineTo(px, py+s);
	ctx.lineTo(px+4, py+s-4);
	ctx.lineTo(px+s-4, py+s-4);
	ctx.lineTo(px+s-4, py+4);
	ctx.closePath();
	ctx.fill();

	// inner core
	ctx.fillStyle = base;
	ctx.fillRect(px+4, py+4, s-8, s-8);

	ctx.restore();
}

// ---------- Particle effects ----------
let particles = [];
function spawnLineParticles(rowY, colorList){
	for(let x=0;x<COLS;x++){
		const c = colorList[x] || '#ff6ec4';
		for(let i=0;i<6;i++){
			particles.push({
				x: x*BLOCK + BLOCK/2,
				y: rowY*BLOCK + BLOCK/2,
				vx: (Math.random()-0.5)*6,
				vy: -Math.random()*5 - 1,
				life: 1,
				color: c,
				size: Math.random()*3+2
			});
		}
	}
}
function updateParticles(dt){
	fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);
	particles.forEach(p=>{
		p.x += p.vx;
		p.y += p.vy;
		p.vy += 0.25; // gravity
		p.life -= dt/600;
	});
	particles = particles.filter(p=>p.life>0);
	particles.forEach(p=>{
		fxCtx.globalAlpha = Math.max(p.life,0);
		fxCtx.fillStyle = p.color;
		fxCtx.shadowColor = p.color;
		fxCtx.shadowBlur = 10;
		fxCtx.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size);
	});
	fxCtx.globalAlpha = 1;
	fxCtx.shadowBlur = 0;
}

function draw(){
	ctx.clearRect(0,0,canvas.width,canvas.height);
	// draw board
	for(let y=0;y<ROWS;y++){
		for(let x=0;x<COLS;x++){
			const v = arena[y][x];
			if(v) drawCell(x,y,v);
		}
	}
	// ghost piece
	const ghostY = getGhostY();
	const m = currentMatrix();
	for(let y=0;y<m.length;y++){
		for(let x=0;x<m[y].length;x++){
			if(m[y][x]) drawCell(x+pos.x, y+ghostY, m[y][x], 0.25);
		}
	}
	// current piece
	for(let y=0;y<m.length;y++){
		for(let x=0;x<m[y].length;x++){
			if(m[y][x]) drawCell(x+pos.x, y+pos.y, m[y][x]);
		}
	}
}

function currentMatrix(){
	const rom = current.shape[current.rot % current.shape.length];
	// clone
	return rom.map(r=>r.slice());
}

function collide(arena, piecePos){
	const m = piecePos.matrix;
	for(let y=0;y<m.length;y++){
		for(let x=0;x<m[y].length;x++){
			if(m[y][x] && (arena[y+piecePos.y] && arena[y+piecePos.y][x+piecePos.x]) !== 0) return true;
		}
	}
	return false;
}

function merge(arena, piecePos){
	const m = piecePos.matrix;
	for(let y=0;y<m.length;y++){
		for(let x=0;x<m[y].length;x++){
			if(m[y][x]) arena[y+piecePos.y][x+piecePos.x] = m[y][x];
		}
	}
}

function sweep(){
	let rowCount = 0;
	outer: for(let y=ROWS-1;y>=0;y--){
		for(let x=0;x<COLS;x++){
			if(arena[y][x] === 0) continue outer;
		}
		const rowColors = arena[y].map(v=>colors[v]);
		spawnLineParticles(y, rowColors);
		const row = arena.splice(y,1)[0].fill(0);
		arena.unshift(row);
		y++;
		rowCount++;
	}
	if(rowCount>0){
		lines += rowCount;
		score += (rowCount === 1 ? 40 : rowCount === 2 ? 100 : rowCount === 3 ? 300 : 1200) * level;
		level = Math.floor(lines/10) +1;
		updateStats();
		popScore();
		shakeBoard();
		flashScreen();
	}
}

function updateStats(){
	scoreEl.textContent = score;
	levelEl.textContent = level;
	linesEl.textContent = lines;
}

function drop(){
	// try to move piece down one row; if collision occurs, lock piece and spawn next
	if(!collisionAt(pos.x, pos.y+1, currentMatrix())){
		pos.y++;
	} else {
		merge(arena, {matrix: currentMatrix(), x: pos.x, y: pos.y});
		sweep();
		spawnPiece();
	}
	dropCounter = 0;
}

function collisionAt(x,y,m){
	for(let row=0;row<m.length;row++){
		for(let col=0;col<m[row].length;col++){
			if(m[row][col]){
				const ay = y+row;
				const ax = x+col;
				if(ay<0 || ay>=ROWS || ax<0 || ax>=COLS) return true;
				if(arena[ay][ax]) return true;
			}
		}
	}
	return false;
}

function move(dir){
	pos.x += dir;
	if(collisionAt(pos.x,pos.y,currentMatrix())) pos.x -= dir;
}

function rotatePiece(dir){
	const before = current.rot;
	current.rot = (current.rot + dir + current.shape.length) % current.shape.length;
	if(collisionAt(pos.x,pos.y,currentMatrix())){
		// wall kicks simple
		const kicks = [1,-1,2,-2];
		let kicked=false;
		for(const k of kicks){
			if(!collisionAt(pos.x+k,pos.y,currentMatrix())){ pos.x+=k; kicked=true; break; }
		}
		if(!kicked) current.rot = before;
	}
}

function hardDrop(){
	while(!collisionAt(pos.x,pos.y+1,currentMatrix())) pos.y++;
	merge(arena, {matrix: currentMatrix(), x: pos.x, y: pos.y});
	sweep();
	spawnPiece();
}

function getGhostY(){
	let gy = pos.y;
	while(!collisionAt(pos.x,gy+1,currentMatrix())) gy++;
	return gy;
}

function spawnPiece(){
	current = next;
	next = randomPiece();
	holdLocked = false;
	// center based on current rotation matrix
	const m = currentMatrix();
	pos.x = Math.floor((COLS - m[0].length) / 2);
	pos.y = 0;
	// if immediately colliding, it's game over — reset arena and stop running
	if(collisionAt(pos.x,pos.y,m)){
		arena.forEach(r=>r.fill(0));
		score = 0; lines = 0; level = 1; updateStats();
		running = false;
		showGameOver();
	}
	drawNext();
}

function drawNext(){
	nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
	const m = next.shape[0];
	const size = 16; // pixel per cell
	nextCtx.fillStyle = '#000';
	nextCtx.fillRect(0,0,nextCanvas.width,nextCanvas.height);
	nextCtx.save();
	nextCtx.translate(8,8);
	for(let y=0;y<m.length;y++){
		for(let x=0;x<m[y].length;x++){
			if(m[y][x]){
				nextCtx.fillStyle = colors[m[y][x]];
				nextCtx.fillRect(x*size, y*size, size-2, size-2);
			}
		}
	}
	nextCtx.restore();
}

function drawHold(){
	holdCtx.clearRect(0,0,holdCanvas.width,holdCanvas.height);
	holdCtx.fillStyle = '#000';
	holdCtx.fillRect(0,0,holdCanvas.width,holdCanvas.height);
	if(!held) return;
	const m = TETROMINOS[held][0];
	const size = 16;
	holdCtx.save();
	holdCtx.translate(8,8);
	for(let y=0;y<m.length;y++){
		for(let x=0;x<m[y].length;x++){
			if(m[y][x]){
				holdCtx.fillStyle = colors[m[y][x]];
				holdCtx.fillRect(x*size, y*size, size-2, size-2);
			}
		}
	}
	holdCtx.restore();
	holdCanvas.classList.toggle('held-locked', holdLocked);
}

function setHoldTint(type){
	const col = type ? colors[TETROMINOS[type][0].flat().find(v=>v)] : null;
	document.documentElement.style.setProperty('--hold-color', col || 'transparent');
}

function holdPiece(){
	if(!running || paused || holdLocked) return;
	if(!held){
		held = current.type;
		current = next;
		next = randomPiece();
	} else {
		const swap = held;
		held = current.type;
		current = pieceFromType(swap);
	}
	const m = currentMatrix();
	pos.x = Math.floor((COLS - m[0].length) / 2);
	pos.y = 0;
	holdLocked = true;
	setHoldTint(held);
	drawHold();
	drawNext();
}

let arena = createMatrix(COLS, ROWS);
let current = null;
let next = randomPiece();
let held = null;
let holdLocked = false;
let pos = {x:0,y:0};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0, level = 1, lines = 0;
let running = false, paused = false;

function update(time=0){
	const dt = time - lastTime;
	lastTime = time;
	updateParticles(Math.min(dt,100));
	if(!running || paused){ requestAnimationFrame(update); return; }
	dropCounter += dt;
	dropInterval = Math.max(100, 1000 - (level-1)*100);
	if(dropCounter > dropInterval){ drop(); }
	draw();
	requestAnimationFrame(update);
}

document.addEventListener('keydown', e=>{
	if(!running) return;
	if(e.key === 'ArrowLeft') move(-1);
	else if(e.key === 'ArrowRight') move(1);
	else if(e.key === 'ArrowDown') { drop(); }
	else if(e.key === 'ArrowUp' || e.key.toLowerCase()==='x') rotatePiece(1);
	else if(e.code === 'Space'){ e.preventDefault(); hardDrop(); }
	else if(e.key.toLowerCase()==='p'){ paused = !paused; pauseBtn.textContent = paused? 'Resume' : 'Pause'; }
	else if(e.key.toLowerCase()==='c'){ holdPiece(); }
});

holdBtn.addEventListener('click', ()=>{ holdPiece(); });

startBtn.addEventListener('click', ()=>{
	if(!running){
		resetGame();
		running = true;
		lastTime = 0;
		requestAnimationFrame(update);
	}
});
pauseBtn.addEventListener('click', ()=>{ paused = !paused; pauseBtn.textContent = paused? 'Resume' : 'Pause'; });
resetBtn.addEventListener('click', ()=>{ resetGame(); draw(); });

function resetGame(){
	arena = createMatrix(COLS, ROWS);
	next = randomPiece();
	current = next;
	next = randomPiece();
	held = null;
	holdLocked = false;
	setHoldTint(null);
	const m = currentMatrix();
	pos.x = Math.floor((COLS - m[0].length) / 2);
	pos.y = 0;
	score = 0; level = 1; lines = 0;
	// Do not auto-start the game when resetting; let the Start button control running state
	running = false;
	paused = false;
	pauseBtn.textContent = 'Pause';
	updateStats();
	drawNext();
	drawHold();
	hideGameOver();
}

// Initialize
resetGame();
draw();
