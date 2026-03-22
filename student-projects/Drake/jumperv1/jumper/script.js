// script.js — Upward endless jumper (improved double-jump, lower spikes, birds, level cap)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const hud = document.getElementById('hud');
const msg = document.getElementById('message');
const scoreboardEl = document.getElementById('scoreboard');

let running = false;

const player = {x: W/2 - 18, y: H-100, w:36, h:36, vx:0, vy:0, onGround:false, color:'#2ecc71', jumpsLeft:2, maxJumps:2, lastPlatformId:null};
let score = 0, maxHeight = 0;
let spaceMode = false; // becomes true once score >= 5000 in a run
let coins = 0; // currency collected on death (adds padTouchCount to coins)
let highPads = 0; // persistent best pad-touch count

const gravity = 0.6;
const moveSpeed = 3.2;

let platforms = [];
const platformGap = {min:70, max:120};
let nextPlatformId = 1;
const padScoreboard = {}; // map platformId -> touch count
let padTouchCount = 0; // numeric counter displayed top-right

// clouds
let clouds = [];
const cloudCount = 6;

// spikes (separate moving hazards attached to platforms)
let spikes = [];

// confetti
let confetti = [];
// stars for space mode
let stars = [];
// jump stripe particles
let jumpStripes = []; 

// birds
let birds = []; 
let birdTimer = 0;
let birdSpawnInterval = 160; // frames (will be set by difficulty)

// difficulty
let difficulty = 'medium';
const diffSettings = {
  peaceful: {spikeAttachChance:0, spikeSpeed:0, birdInterval:Infinity, boostChance:0.22},
  easy: {spikeAttachChance:0.08, spikeSpeed:0.6, birdInterval:240, boostChance:0.16},
  medium: {spikeAttachChance:0.18, spikeSpeed:0.9, birdInterval:160, boostChance:0.10},
  hard: {spikeAttachChance:0.30, spikeSpeed:1.6, birdInterval:100, boostChance:0.06}
};

const keys = {};
addEventListener('keydown', e=>{ keys[e.key.toLowerCase()]=true; if(e.code==='Space') e.preventDefault(); });
addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

// touch controls already wired to keys in index.html

function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function makePlatform(y){
  const typeRoll = Math.random();
  const w = rand(80,150);
  const x = rand(8, W - w - 8);
  const id = nextPlatformId++;
  // Types: boost, moving, normal (probabilities set by difficulty)
  const cfg = diffSettings[difficulty] || diffSettings.medium;
  let type = 'normal';
  if(typeRoll < cfg.boostChance) type = 'boost';
  else if(typeRoll < cfg.boostChance + 0.26) type = 'moving';
  const p = (type === 'moving') ? {id,x,y,w,h:12,type:'moving',vx:randChoice([-1.2,1.2]),range:rand(40,110),origin:x} : {id,x,y,w,h:12,type:type};
  return p;
}

function start(){
  running = true; msg.style.display='none'; score=0; maxHeight=0; padTouchCount = 0; player.x = W/2-18; player.y = H-120; player.vx=0; player.vy=0; player.jumpsLeft = player.maxJumps; player.lastPlatformId = null;
  platforms = [];
  birds = [];
  clouds = [];
  nextPlatformId = 1;
  for(const k in padScoreboard) delete padScoreboard[k];
  updateScoreboard();
  // reset space mode
  spaceMode = false;
  document.body.classList.remove('space');
  // clear any leftover stars, clouds, and jump stripes
  stars = [];
  clouds = [];
  jumpStripes = [];
  // initial platforms
  let y = H-40;
  platforms.push({id:0,x:0,y:y,w:W,h:40,type:'ground'});
  const cfg = diffSettings[difficulty] || diffSettings.medium;
  for(let i=0;i<10;i++){ y -= rand(platformGap.min, platformGap.max); const p = makePlatform(y); platforms.push(p); if(p.type !== 'boost' && Math.random() < cfg.spikeAttachChance) createSpikeForPlatform(p); }
  // initial clouds
  for(let i=0;i<cloudCount;i++){ clouds.push({x:rand(0,W), y:rand(20,H/2), w:rand(80,160), h:rand(28,46), vx:(Math.random()*0.4+0.2)}); }
  updateScoreboard();
}

function spawnBird(){
  const fromLeft = Math.random() < 0.5;
  const y = rand(40, H/2);
  const speed = rand(2,4) + Math.random();
  const bird = fromLeft ? {x:-60,y:y,vx:speed,w:48,h:24} : {x:W+60,y:y,vx:-speed,w:48,h:24};
  birds.push(bird);
}

// create a moving spike attached to a platform (moves across the platform width)
function createSpikeForPlatform(p){
  const spikeW = 18; const spikeH = 12;
  const x = p.x + rand(0, Math.max(0, p.w - spikeW));
  const cfg = diffSettings[difficulty] || diffSettings.medium;
  const vx = (Math.random()<0.5? -1:1) * cfg.spikeSpeed;
  spikes.push({platform:p,x:x,w:spikeW,h:spikeH,vx:vx});
} 

function update(){
  if(!running) return;
  // input
  if(keys['arrowleft']||keys['a']) player.vx = -moveSpeed;
  else if(keys['arrowright']||keys['d']) player.vx = moveSpeed;
  else player.vx = 0;
  // confetti
  updateConfetti();
  // jump stripes
  updateJumpStripes();
  // jump handling (improved): buffer + single-press
  const jumpHeld = (keys[' ']||keys['space']||keys['spacebar']||keys['arrowup']||keys['w']);
  if(jumpHeld && player._canJump === undefined) player._canJump = true; // initialize
  if(jumpHeld && player._canJump && player.jumpsLeft>0){
    // perform jump
    if(player.onGround){
      player.vy = -12;
    } else {
      // mid-air double jump has slightly less power
      player.vy = -10;
    }
    player.jumpsLeft -= 1;
    player.onGround = false;
    player._canJump = false; // require release to jump again
    player.lastPlatformId = null;
    // spawn small white stripe(s) under the player to indicate jump
    spawnJumpStripe();
  }
  if(!jumpHeld) player._canJump = true;

  // variable jump height: if releasing early, gravity stronger
  const holdInfluence = jumpHeld && player.vy < 0;

  // physics
  player.vy += gravity * (holdInfluence ? 0.55 : 1);
  player.x += player.vx; player.y += player.vy;

  // wrap horizontally
  if(player.x + player.w < 0) player.x = W;
  if(player.x > W) player.x = -player.w;

  // collisions with platforms (only when falling)
  player.onGround = false;
  for(const p of platforms){
    if(p.type === 'spike') continue;
    if(player.vy > 0 && player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h > p.y && player.y + player.h < p.y + p.h + 20){
      player.y = p.y - player.h; player.vy = 0; player.onGround = true; 
      // reset jumps when landing
      player.jumpsLeft = player.maxJumps;
      // scoreboard: count touch for any pad (not ground)
      if(p.id && p.type !== 'ground' && player.lastPlatformId !== p.id){
        padScoreboard[p.id] = (padScoreboard[p.id] || 0) + 1;
        padTouchCount += 1;
        player.lastPlatformId = p.id; updateScoreboard();
      }
      // boost pad effect
      if(p.type === 'boost'){
        player.vy = -16; // strong bounce
      }
      break;
    }
  }

  // We removed separate spike platforms - spikes are now an overlay on top of pads (checked on landing), so no separate spike loop is needed.

  // moving platforms update
  for(const p of platforms){
    if(p.type === 'moving'){
      p.x += p.vx;
      if(p.x < p.origin - p.range || p.x > p.origin + p.range) p.vx *= -1;
    }
  }

  // camera: if player goes above quarter height, move world down
  if(player.y < H/3){
    const shift = Math.max(2, Math.round((H/3 - player.y) * 0.45));
    player.y += shift;
    for(const p of platforms) p.y += shift;
    for(const b of birds) b.y += shift; // birds move with camera
    score += Math.floor(shift/2);
    if(!spaceMode && score >= 5000){
      spaceMode = true;
      document.body.classList.add('space');
      // small flourish for milestone
      spawnConfetti(24);
      // remove clouds and generate stars for the space background
      clouds.length = 0;
      stars = [];
      for(let i=0;i<140;i++){
        stars.push({x:rand(0,W), y:rand(0,H), r:Math.random()*1.6+0.6, baseAlpha: Math.random()*0.6+0.25, phase: Math.random()*Math.PI*2, twinkle: Math.random()*0.06+0.01});
      }
    }
  }

  // remove platforms below screen and spawn above
  platforms = platforms.filter(p=>p.y < H + 200);
  // remove spikes whose parent platform disappeared
  spikes = spikes.filter(s=> platforms.includes(s.platform));
  while(platforms.length < 12){
    const topY = platforms.reduce((min,p)=>Math.min(min,p.y), H);
    const newY = topY - rand(platformGap.min, platformGap.max);
    const p = makePlatform(newY);
    platforms.push(p);
    const cfg = diffSettings[difficulty] || diffSettings.medium;
    if(p.type !== 'boost' && Math.random() < cfg.spikeAttachChance) createSpikeForPlatform(p);
  }

  // birds
  birdTimer++;
  // allow difficulty to control bird interval
  const cfg = diffSettings[difficulty] || diffSettings.medium;
  birdSpawnInterval = cfg.birdInterval;
  if(birdTimer > birdSpawnInterval){ birdTimer = 0; spawnBird(); }
  for(let i=birds.length-1;i>=0;i--){
    const b = birds[i]; b.x += b.vx; // birds don't have vertical motion except camera shift
    // remove offscreen
    if(b.x < -200 || b.x > W + 200) birds.splice(i,1);
    // collision with player
    if(player.x < b.x + b.w && player.x + player.w > b.x && player.y < b.y + b.h && player.y + player.h > b.y){ die(); return; }
  }

  // spikes update & collision
  for(let i=spikes.length-1;i>=0;i--){
    const s = spikes[i];
    // if parent platform was removed, drop this spike
    if(!platforms.includes(s.platform)){ spikes.splice(i,1); continue; }
    // keep spike within platform bounds
    const left = s.platform.x;
    const right = s.platform.x + s.platform.w - s.w;
    s.x += s.vx;
    if(s.x < left){ s.x = left; s.vx *= -1; }
    if(s.x > right){ s.x = right; s.vx *= -1; }
    const sy = s.platform.y - s.h;
    // collision with player: only if player's feet intersect the top area of the spike
    const marginX = 4; // reduce horizontal sensitivity so grazing sides won't kill
    const horizOverlap = (player.x + player.w > s.x + marginX) && (player.x < s.x + s.w - marginX);
    const feet = player.y + player.h;
    const topThreshold = sy + Math.floor(s.h * 0.45);
    const bottomThreshold = sy + s.h + 6;
    if(horizOverlap && feet > topThreshold && feet < bottomThreshold){ die(); return; }
  }

  // clouds update (slow parallax)
  for(const c of clouds){
    c.x += c.vx * 0.35; // slow movement
    if(c.x > W + 200) c.x = -200; // wrap
  }

  // fall off bottom
  if(player.y > H + 80) die();

  // level cap
  if(score >= 10000){
    // update high pad-touch count as well
    let newRecord = false;
    if(padTouchCount > highPads){ highPads = padTouchCount; localStorage.setItem('lb_highpads', highPads); const hsEl = document.getElementById('highscore'); if(hsEl) hsEl.textContent = `High: ${highPads}`; newRecord = true; }
    running = false; msg.style.display='block'; msg.textContent = 'You Win! Score 10000 — Tap to play again';
    if(newRecord) showNewHigh(highPads);
  }

  if(score > maxHeight) maxHeight = score;
}

function die(){
  // award coins equal to pads touched at death
  coins += padTouchCount;
  // save coins to localStorage
  localStorage.setItem('lb_coins', coins);
  updateCoinDisplay();
  // update high pad-touch count if needed
  let newRecord = false;
  if(padTouchCount > highPads){ highPads = padTouchCount; localStorage.setItem('lb_highpads', highPads); const hsEl = document.getElementById('highscore'); if(hsEl) hsEl.textContent = `High: ${highPads}`; newRecord = true; }
  running = false; msg.style.display='block'; msg.textContent = `You died — +${padTouchCount} coins (total ${coins}) — Tap to restart`;
  // reset pad touch count after awarding
  padTouchCount = 0; updateScoreboard();
  if(newRecord) showNewHigh(highPads);
}

function draw(){
  ctx.clearRect(0,0,W,H);
  // sky or space
  if(spaceMode){
    // deep black background
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
    // stars (twinkling)
    for(const s of stars){
      const a = Math.max(0, Math.min(1, s.baseAlpha + Math.sin(s.phase) * 0.3));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
      s.phase += s.twinkle * 0.7;
    }
  } else {
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#87CEEB'); g.addColorStop(1,'#5DB0E6');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // clouds (behind everything)
    for(const c of clouds){
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(c.x + c.w/2, c.y + c.h/2, c.w/2, c.h/2, 0, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // platforms (draw as clouds; turn into rocks in space mode)
  for(const p of platforms){
    if(p.type === 'ground'){
      // draw ground as before
      ctx.fillStyle = '#6b8e23'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#4a6'; ctx.fillRect(p.x, p.y - 6, p.w, 6);
      continue;
    }

    if(spaceMode){
      // rock-style pads for space mode
      ctx.fillStyle = '#7a7a7a'; ctx.fillRect(p.x, p.y, p.w, p.h);
      // jagged top
      ctx.fillStyle = '#5e5e5e';
      ctx.beginPath();
      const step = 12;
      ctx.moveTo(p.x, p.y + p.h);
      for(let x = p.x; x <= p.x + p.w; x += step){
        const peak = ( ( (x - p.x) / step ) % 2 === 0 ) ? p.y + p.h - 14 : p.y + p.h - 6;
        ctx.lineTo(x, peak);
      }
      ctx.lineTo(p.x + p.w, p.y + p.h);
      ctx.closePath();
      ctx.fill();
    } else {
      // cloud-style pads
      const cx = p.x + p.w/2;
      const cy = p.y + p.h/2;
      ctx.fillStyle = 'rgba(255,255,255,0.98)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, p.w*0.36, p.h*1.1, 0, 0, Math.PI*2);
      ctx.ellipse(p.x + p.w*0.22, cy + 2, p.w*0.22, p.h*0.9, 0, 0, Math.PI*2);
      ctx.ellipse(p.x + p.w*0.78, cy + 1, p.w*0.22, p.h*0.85, 0, 0, Math.PI*2);
      ctx.fill();
      // subtle shadow under cloud
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(p.x + 6, p.y + p.h - 4, p.w - 12, 4);
      // boost highlight (gold bar) if boost pad
      if(p.type === 'boost'){
        ctx.fillStyle = 'rgba(255,200,60,0.95)'; ctx.fillRect(p.x + p.w/2 - 12, p.y - 6, 24, 6);
      }
    }
  }

  // draw spikes (moving hazards attached to platforms)
  for(const s of spikes){
    const sy = s.platform.y - s.h;
    ctx.fillStyle = '#b22222'; ctx.beginPath(); ctx.moveTo(s.x, sy + s.h); ctx.lineTo(s.x + s.w/2, sy); ctx.lineTo(s.x + s.w, sy + s.h); ctx.closePath(); ctx.fill();
  }

  // birds (draw as birds normally; draw as spaceships in space mode)
  for(const b of birds){
    if(spaceMode){
      // spaceship: fuselage, cockpit, wings, and thruster
      ctx.save();
      ctx.translate(b.x + b.w/2, b.y + b.h/2);
      // body
      ctx.fillStyle = '#cfcfcf'; ctx.beginPath(); ctx.ellipse(0,0,b.w/2,b.h/2,0,0,Math.PI*2); ctx.fill();
      // cockpit window
      ctx.fillStyle = '#66ccff'; ctx.beginPath(); ctx.ellipse(b.w*0.12, -b.h*0.08, b.w*0.18, b.h*0.18, 0,0,Math.PI*2); ctx.fill();
      // wings/fins
      ctx.fillStyle = '#b0b0b0'; ctx.beginPath(); ctx.moveTo(-b.w/2+2,0); ctx.lineTo(-b.w/2 -6, b.h/2); ctx.lineTo(-b.w/2 +6,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(b.w/2 -2,0); ctx.lineTo(b.w/2 +6, b.h/2); ctx.lineTo(b.w/2 -6,0); ctx.closePath(); ctx.fill();
      // thruster flame opposite direction of velocity
      ctx.fillStyle = '#ff8c42'; ctx.beginPath();
      if(b.vx > 0){ ctx.moveTo(-b.w/2, -b.h*0.12); ctx.lineTo(-b.w/2 - Math.abs(b.vx)*8, 0); ctx.lineTo(-b.w/2, b.h*0.12); }
      else { ctx.moveTo(b.w/2, -b.h*0.12); ctx.lineTo(b.w/2 + Math.abs(b.vx)*8, 0); ctx.lineTo(b.w/2, b.h*0.12); }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(b.x + b.w/2, b.y + b.h/2, b.w/2, b.h/2, 0, 0, Math.PI*2); ctx.fill();
      // wing
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.moveTo(b.x + b.w/2, b.y + b.h/2); ctx.lineTo(b.x + (b.vx>0? -6:6), b.y + b.h/2 - 8); ctx.lineTo(b.x + (b.vx>0? 10:-10), b.y + b.h/2); ctx.closePath(); ctx.fill();
    }
  }

  // jump stripes
  drawJumpStripes();

  // player (tilted cube with a full-coverage camo stripe)
  const tilt = Math.max(-0.5, Math.min(0.5, (player.vx / (moveSpeed||1)) * 0.4));
  const cx = player.x + player.w/2, cy = player.y + player.h/2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  // base cube
  ctx.fillStyle = player.color;
  ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
  // camo stripe spanning corner-to-corner (narrow band)
  if(player.skin === 'camo'){
    ctx.save();
    // length equals diagonal of cube; rotate to align with corner-to-corner
    const diag = Math.sqrt(player.w*player.w + player.h*player.h) * 1.05;
    ctx.rotate(-Math.PI/4);
    const stripeW = Math.max(4, Math.floor(player.w * 0.12));
    ctx.fillStyle = '#3b6b2a';
    // draw narrow rectangle centered so it crosses from corner to corner
    ctx.fillRect(-diag/2, -stripeW/2, diag, stripeW);
    ctx.restore();
  }
  // eye (tilts with cube)
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, -2, 3, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // draw confetti overlay
  drawConfetti();
  hud.textContent = `Score: ${score}`;
  // pad touch counter display: numeric at top-right
  scoreboardEl.textContent = padTouchCount;
  // coins display
  document.getElementById('coins').textContent = `Coins: ${coins}`;
  // high pad-touch display
  const hsEl = document.getElementById('highscore'); if(hsEl) hsEl.textContent = `High: ${highPads}`;
}

function loop(){ update(); draw(); requestAnimationFrame(loop); }

function updateScoreboard(){
  // Display numeric total pads touched in top-right
  const sb = scoreboardEl;
  sb.textContent = padTouchCount;
  // coin balance in shop
  const cb = document.getElementById('coin-balance'); if(cb) cb.textContent = `Coins: ${coins}`;
  const coinHud = document.getElementById('coins'); if(coinHud) coinHud.textContent = `Coins: ${coins}`;
}

// show a short popup when player sets a new pad-touch record
function showNewHigh(n){
  const el = document.getElementById('new-high'); if(!el) return;
  el.textContent = `New Record: ${n} pads!`;
  el.classList.remove('hidden'); el.classList.add('show');
  spawnConfetti(40);
  setTimeout(()=>{ el.classList.remove('show'); el.classList.add('hidden'); }, 1600);
}

// confetti particle system
function spawnConfetti(count){
  const colors = ['#ffd54f','#ffb74d','#ff6f61','#4dd0e1','#81c784','#f06292'];
  for(let i=0;i<count;i++){
    confetti.push({x: W/2 + rand(-60,60), y: H/2 + rand(-20,20), vx: (Math.random()*6-3), vy: (Math.random()*-6-2), size: rand(6,12), color: colors[rand(0,colors.length-1)], life: rand(60,110), rot: Math.random()*Math.PI*2, vr: (Math.random()*0.25-0.125)});
  }
}

function updateConfetti(){
  for(let i=confetti.length-1;i>=0;i--){
    const p = confetti[i]; p.vy += 0.18; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--; if(p.life<=0 || p.y > H+100) confetti.splice(i,1);
  }
}

function drawConfetti(){
  for(const p of confetti){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size); ctx.restore(); }
}

// jump stripe particles
function spawnJumpStripe(){
  const tilt = Math.max(-0.5, Math.min(0.5, (player.vx / (moveSpeed||1)) * 0.4));
  const baseX = player.x + player.w/2;
  const baseY = player.y + player.h + 6;
  // main stripe
  jumpStripes.push({x:baseX, y:baseY, w:player.w*0.7, h:4, alpha:1, life:26, vx: player.vx*0.15, tilt: tilt});
  // small secondary stripe
  jumpStripes.push({x:baseX - Math.sign(player.vx||1)*6, y:baseY + 6, w:player.w*0.45, h:3, alpha:0.9, life:20, vx: player.vx*0.12, tilt: tilt});
}

function updateJumpStripes(){
  for(let i=jumpStripes.length-1;i>=0;i--){
    const s = jumpStripes[i];
    s.y += 0.6 + Math.abs(s.vx)*0.2;
    s.x += s.vx;
    s.life -= 1;
    s.alpha = Math.max(0, s.life / 26);
    if(s.life <= 0) jumpStripes.splice(i,1);
  }
}

function drawJumpStripes(){
  for(const s of jumpStripes){
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.tilt);
    ctx.globalAlpha = Math.max(0, s.alpha);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-s.w/2, 0, s.w, s.h);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// start on click/tap
canvas.addEventListener('mousedown', ()=>{ if(!running) start(); });
canvas.addEventListener('touchstart', ()=>{ if(!running) start(); });

// difficulty controls binding
Array.from(document.querySelectorAll('.diff')).forEach(btn=>{ btn.addEventListener('click', e=>{ const id = e.target.id; const d = id.replace('diff-',''); setDifficulty(d); Array.from(document.querySelectorAll('.diff')).forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); }); });

function setDifficulty(d){ difficulty = d; const cfg = diffSettings[d] || diffSettings.medium; birdSpawnInterval = cfg.birdInterval; // apply immediately
  // if peaceful selected, clear existing hazards immediately
  if(d === 'peaceful'){
    birds.length = 0;
    spikes.length = 0;
  }
}
// load coins, owned skins, and high pad record
coins = parseInt(localStorage.getItem('lb_coins')||0,10);
highPads = parseInt(localStorage.getItem('lb_highpads')||0,10) || 0;
const owned = JSON.parse(localStorage.getItem('lb_owned')||'{}');
const equipped = localStorage.getItem('lb_equipped') || 'green';
applySkin(equipped);
updateOwnedUI();
updateScoreboard();
updateCoinDisplay();
// initialize high pad count display
const hsEl = document.getElementById('highscore'); if(hsEl) hsEl.textContent = `High: ${highPads}`;

// shop tab handlers
const tabPlay = document.getElementById('tab-play');
const tabShop = document.getElementById('tab-shop');
const shopEl = document.getElementById('shop');
function openShop(){ tabShop.classList.add('active'); tabPlay.classList.remove('active'); shopEl.classList.remove('hidden'); running = false; }
function closeShop(){ tabPlay.classList.add('active'); tabShop.classList.remove('active'); shopEl.classList.add('hidden'); }

tabShop.addEventListener('click', ()=>{ openShop(); });
tabPlay.addEventListener('click', ()=>{ closeShop(); if(!running) start(); });

// buy buttons
Array.from(document.querySelectorAll('.skin .buy')).forEach(btn=>{
  btn.addEventListener('click', e=>{ const skin = btn.dataset.skin; buySkin(skin); });
});

function updateCoinDisplay(){ const el = document.getElementById('coins'); if(el) el.textContent = `Coins: ${coins}`; const cb = document.getElementById('coin-balance'); if(cb) cb.textContent = `Coins: ${coins}`; }

function buySkin(skin){ const prices = {gold:100, white:50, black:25, camo:75}; const price = prices[skin]||20; const owned = JSON.parse(localStorage.getItem('lb_owned')||'{}');
  if(owned[skin]){ equipSkin(skin); return; }
  if(coins >= price){ coins -= price; owned[skin] = true; localStorage.setItem('lb_coins', coins); localStorage.setItem('lb_owned', JSON.stringify(owned)); applySkin(skin); updateOwnedUI(); updateCoinDisplay(); alert(`Purchased ${skin}!`); } else { alert('Not enough coins'); }
}

function updateOwnedUI(){ const owned = JSON.parse(localStorage.getItem('lb_owned')||'{}'); Array.from(document.querySelectorAll('.skin')).forEach(el=>{ const s = el.dataset.skin; const btn = el.querySelector('.buy'); if(owned[s]){ btn.textContent = (localStorage.getItem('lb_equipped')===s)?'Equipped':'Equip'; } else { const price = {gold:100, white:50, black:25, camo:75}[s] || 20; btn.textContent = `Buy ${price}`; } }); }

function equipSkin(skin){ localStorage.setItem('lb_equipped', skin); applySkin(skin); updateOwnedUI(); }

function applySkin(skin){ const mapping = {gold:'#ffd700', white:'#ffffff', black:'#000000', green:'#2ecc71', camo:'#6b8e23'}; player.color = mapping[skin] || '#2ecc71'; player.skin = (skin === 'camo') ? 'camo' : 'solid'; localStorage.setItem('lb_equipped', skin); }

requestAnimationFrame(loop);
const levelSelect = document.getElementById("level"); const gameContainer = document.getElementById("game-container"); // Change background when level is selected levelSelect.addEventListener("change", () => { const level = levelSelect.value; // Remove old level classes gameContainer.classList.remove("plains", "forest", "mountain"); // Add new level class gameContainer.classList.add(level); }); // --- Your existing jumper game code goes below --- // Example placeholder: const canvas = document.getElementById("gameCanvas"); const ctx = canvas.getContext("2d"); // Example game loop function gameLoop() { ctx.clearRect(0, 0, canvas.width, canvas.height); // Your jumper game logic here... requestAnimationFrame(gameLoop); } gameLoop();
const levelSelect = document.getElementById("level");
const gameContainer = document.getElementById("game-container");

levelSelect.addEventListener("change", () => {
    const level = levelSelect.value;

    console.log("Level changed to:", level); // Debug

    // Remove all level classes
    gameContainer.className = "";
    gameContainer.classList.add(level);
});

// --- Your existing game code ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Your jumper game logic...

    requestAnimationFrame(gameLoop);
}

gameLoop();
const canvas = document.getElementById("game"); // ✅ This matches your HTML
const ctx = canvas.getContext("2d");

const levelSelect = document.getElementById("level");
const gameContainer = document.getElementById("game-container");

levelSelect.addEventListener("change", () => {
  const level = levelSelect.value;
  gameContainer.className = ""; // remove all classes
  gameContainer.classList.add(level); // add selected level
});