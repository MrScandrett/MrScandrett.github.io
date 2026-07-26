// script.js — Upward endless jumper (improved double-jump, lower spikes, birds, level cap)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
// Logical drawing size stays 420x720; the backing store is scaled for crisp hi-dpi rendering.
const W = 420, H = 720;
let dpr = 1;
function sizeCanvas(){
  dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}
sizeCanvas();
addEventListener('resize', sizeCanvas);

const hud = document.getElementById('hud');
const msg = document.getElementById('message');
const scoreboardEl = document.getElementById('scoreboard');

let running = false;

const player = {x: W/2 - 18, y: H-100, w:36, h:36, vx:0, vy:0, onGround:false, color:'#2ecc71', jumpsLeft:2, maxJumps:2, lastPlatformId:null, sqx:1, sqy:1, blink:0, blinkTimer:120};
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
const cloudCount = 9;

// spikes (separate moving hazards attached to platforms)
let spikes = [];

// confetti
let confetti = [];
// stars for space mode
let stars = [];
// shooting stars for space mode
let shootingStars = [];
// jump stripe particles
let jumpStripes = [];
// dust puffs (landings, boosts, deaths)
let puffs = [];
// floating "+1" score pops
let pops = [];
// screen shake
let shake = {life:0, mag:0};
// frame counter used for gentle idle animation
let tick = 0;

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

// a tap or keypress only starts a run when the shop isn't covering the canvas
function canStart(){ return !running && (!shopEl || shopEl.classList.contains('hidden')); }

const keys = {};
addEventListener('keydown', e=>{
  keys[e.key.toLowerCase()]=true;
  if(e.code==='Space') e.preventDefault();
  // the start message promises Space — honour it (and Enter) here
  if((e.code==='Space' || e.code==='Enter') && canStart()) start();
});
addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

// touch controls: hold-to-move buttons for phones and tablets
function bindHoldButton(id, key){
  const el = document.getElementById(id);
  if(!el) return;
  const press = e=>{ e.preventDefault(); keys[key]=true; if(key===' ' && canStart()) start(); };
  const release = e=>{ e.preventDefault(); keys[key]=false; };
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointerleave', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('contextmenu', e=>e.preventDefault());
}
bindHoldButton('left','arrowleft');
bindHoldButton('right','arrowright');
bindHoldButton('jump',' ');

function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function lerp(a,b,t){ return a + (b-a)*t; }
function clamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }
function mixColor(a,b,t){
  return [Math.round(lerp(a[0],b[0],t)), Math.round(lerp(a[1],b[1],t)), Math.round(lerp(a[2],b[2],t))];
}
function rgb(c){ return `rgb(${c[0]},${c[1]},${c[2]})`; }

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
  p.glow = 0; // brief highlight after a touch
  p.bob = Math.random()*Math.PI*2; // per-pad phase so cloud pads drift out of sync
  return p;
}

function makeCloud(y){
  const depth = Math.random()*0.7 + 0.3; // 0.3 far … 1.0 near
  return {
    x: rand(-60, W+60),
    y: y,
    w: Math.round(lerp(70, 190, depth)),
    h: Math.round(lerp(24, 52, depth)),
    vx: (Math.random()*0.4+0.2),
    depth: depth,
    alpha: lerp(0.28, 0.8, depth),
    lobes: rand(3,5),
    seed: Math.random()*10
  };
}

function start(){
  running = true; msg.style.display='none'; score=0; maxHeight=0; padTouchCount = 0; player.x = W/2-18; player.y = H-120; player.vx=0; player.vy=0; player.jumpsLeft = player.maxJumps; player.lastPlatformId = null;
  player.sqx = 1; player.sqy = 1; player.blink = 0; player.blinkTimer = 120; player.dead = false;
  platforms = [];
  birds = [];
  clouds = [];
  spikes = [];
  confetti = [];
  puffs = [];
  pops = [];
  shootingStars = [];
  shake.life = 0; shake.mag = 0;
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
  for(let i=0;i<cloudCount;i++){ clouds.push(makeCloud(rand(10, H-120))); }
  updateScoreboard();
}

function spawnBird(){
  const fromLeft = Math.random() < 0.5;
  const y = rand(40, H/2);
  const speed = rand(2,4) + Math.random();
  const bird = fromLeft ? {x:-60,y:y,vx:speed,w:48,h:24} : {x:W+60,y:y,vx:-speed,w:48,h:24};
  bird.flap = Math.random()*Math.PI*2;
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
  tick++;
  if(!running){
    // title/death screen still breathes: clouds drift and the last burst plays out
    for(const c of clouds){ c.x += c.vx * 0.35 * c.depth; if(c.x > W + 220) c.x = -220; }
    updateConfetti();
    updateJumpStripes();
    updatePuffs();
    updatePops();
    if(shake.life > 0){ shake.life--; shake.mag *= 0.88; }
    return;
  }
  // input
  if(keys['arrowleft']||keys['a']) player.vx = -moveSpeed;
  else if(keys['arrowright']||keys['d']) player.vx = moveSpeed;
  else player.vx = 0;
  // confetti
  updateConfetti();
  // jump stripes
  updateJumpStripes();
  // dust puffs, score pops, screen shake
  updatePuffs();
  updatePops();
  if(shake.life > 0){ shake.life--; shake.mag *= 0.88; }
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
      // ring puff to sell the mid-air kick
      spawnRing(player.x + player.w/2, player.y + player.h);
    }
    player.jumpsLeft -= 1;
    player.onGround = false;
    player._canJump = false; // require release to jump again
    player.lastPlatformId = null;
    // stretch the cube upward as it leaves
    player.sqx = 0.82; player.sqy = 1.22;
    // spawn small white stripe(s) under the player to indicate jump
    spawnJumpStripe();
  }
  if(!jumpHeld) player._canJump = true;

  // variable jump height: if releasing early, gravity stronger
  const holdInfluence = jumpHeld && player.vy < 0;

  // physics
  player.vy += gravity * (holdInfluence ? 0.55 : 1);
  player.x += player.vx; player.y += player.vy;

  // squash/stretch eases back to neutral every frame
  player.sqx = lerp(player.sqx, 1, 0.18);
  player.sqy = lerp(player.sqy, 1, 0.18);
  // occasional blink
  if(player.blink > 0) player.blink--;
  else if(--player.blinkTimer <= 0){ player.blink = 6; player.blinkTimer = rand(150,320); }

  // wrap horizontally
  if(player.x + player.w < 0) player.x = W;
  if(player.x > W) player.x = -player.w;

  // collisions with platforms (only when falling)
  const wasOnGround = player.onGround;
  player.onGround = false;
  for(const p of platforms){
    if(p.type === 'spike') continue;
    if(player.vy > 0 && player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h > p.y && player.y + player.h < p.y + p.h + 20){
      const impact = player.vy;
      player.y = p.y - player.h; player.vy = 0; player.onGround = true;
      // reset jumps when landing
      player.jumpsLeft = player.maxJumps;
      // squash on touchdown, scaled by how hard the landing was
      if(!wasOnGround){
        const hit = Math.min(1, impact/16);
        player.sqx = 1 + 0.3*hit; player.sqy = 1 - 0.28*hit;
        spawnLandingPuff(player.x + player.w/2, p.y, hit);
        p.glow = 1;
      }
      // carry the player along with moving pads
      if(p.type === 'moving') player.x += p.vx;
      // scoreboard: count touch for any pad (not ground)
      if(p.id && p.type !== 'ground' && player.lastPlatformId !== p.id){
        padScoreboard[p.id] = (padScoreboard[p.id] || 0) + 1;
        padTouchCount += 1;
        spawnPop(player.x + player.w/2, p.y - player.h - 12, '+1');
        player.lastPlatformId = p.id; updateScoreboard();
      }
      // boost pad effect
      if(p.type === 'boost'){
        player.vy = -16; // strong bounce
        player.sqx = 0.74; player.sqy = 1.34;
        spawnBoostBurst(player.x + player.w/2, p.y);
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
    if(p.glow > 0) p.glow = Math.max(0, p.glow - 0.04);
  }

  // camera: if player goes above quarter height, move world down
  if(player.y < H/3){
    const shift = Math.max(2, Math.round((H/3 - player.y) * 0.45));
    player.y += shift;
    for(const p of platforms) p.y += shift;
    for(const b of birds) b.y += shift; // birds move with camera
    for(const s of jumpStripes) s.y += shift;
    for(const p of puffs) p.y += shift;
    for(const p of pops) p.y += shift;
    // parallax: nearer clouds slide down faster than distant ones
    for(const c of clouds){
      c.y += shift * c.depth * 0.55;
      if(c.y > H + 70) Object.assign(c, makeCloud(-c.h - rand(10,90)));
    }
    for(const s of stars){
      s.y += shift * s.depth * 0.25;
      if(s.y > H + 4){ s.y -= H + 8; s.x = rand(0,W); }
    }
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
        stars.push({x:rand(0,W), y:rand(0,H), r:Math.random()*1.6+0.6, baseAlpha: Math.random()*0.6+0.25, phase: Math.random()*Math.PI*2, twinkle: Math.random()*0.06+0.01, depth: Math.random()*0.8+0.2});
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
    b.flap += 0.22;
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
    c.x += c.vx * 0.35 * c.depth; // nearer clouds drift a little faster
    if(c.x > W + 220) c.x = -220; // wrap
  }

  // shooting stars (space mode flourish)
  if(spaceMode){
    if(Math.random() < 0.006) shootingStars.push({x:rand(-40, W), y:rand(-20, Math.round(H*0.6)), vx:rand(4,7), vy:rand(2,4), life:rand(28,44), maxLife:44});
    for(let i=shootingStars.length-1;i>=0;i--){
      const s = shootingStars[i]; s.x += s.vx; s.y += s.vy; s.life--;
      if(s.life <= 0 || s.x > W + 80 || s.y > H + 40) shootingStars.splice(i,1);
    }
  }

  // fall off bottom
  if(player.y > H + 80) die();

  // level cap
  if(score >= 10000){
    // banked pads pay out on the win screen too
    coins += padTouchCount;
    localStorage.setItem('lb_coins', coins);
    updateCoinDisplay();
    // update high pad-touch count as well
    let newRecord = false;
    if(padTouchCount > highPads){ highPads = padTouchCount; localStorage.setItem('lb_highpads', highPads); const hsEl = document.getElementById('highscore'); if(hsEl) hsEl.textContent = `High: ${highPads}`; newRecord = true; }
    running = false; msg.style.display='block'; msg.textContent = 'You Win! Score 10000 — Tap to play again';
    spawnConfetti(60);
    padTouchCount = 0; updateScoreboard();
    if(newRecord) showNewHigh(highPads);
  }

  if(score > maxHeight) maxHeight = score;
}

function die(){
  // one last spray of cube-coloured debris where the player was
  spawnDeathBurst(player.x + player.w/2, player.y + player.h/2);
  player.dead = true;
  shake.life = 26; shake.mag = 9;
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

// sky colours, lowest to highest — the climb deepens the blue before space takes over
const SKY_LOW = [[135,206,235],[93,176,230]];
const SKY_HIGH = [[43,94,168],[16,42,92]];

function drawSky(){
  const t = clamp01(score / 5000);
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, rgb(mixColor(SKY_LOW[0], SKY_HIGH[0], t)));
  g.addColorStop(1, rgb(mixColor(SKY_LOW[1], SKY_HIGH[1], t)));
  ctx.fillStyle = g; ctx.fillRect(-40,-40,W+80,H+80);
  // sun glow near the horizon, fading out as the air thins
  const glow = ctx.createRadialGradient(W*0.78, H*0.86, 0, W*0.78, H*0.86, H*0.7);
  glow.addColorStop(0, `rgba(255,244,214,${0.30*(1-t)})`);
  glow.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = glow; ctx.fillRect(-40,-40,W+80,H+80);
}

function drawCloudShape(x, y, w, h, lobes, seed, alpha){
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  for(let i=0;i<lobes;i++){
    const f = lobes === 1 ? 0.5 : i/(lobes-1);
    const cx = x + w*(0.16 + f*0.68);
    const wobble = Math.sin(seed + i*1.7) * 0.16;
    const cy = y + h*(0.5 + wobble*0.5);
    const rx = w*(0.20 + Math.abs(Math.cos(seed + i)) * 0.12);
    const ry = h*(0.42 + Math.abs(Math.sin(seed*1.3 + i)) * 0.3);
    ctx.moveTo(cx + rx, cy);
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
  }
  ctx.fill();
}

function drawNebula(){
  const blobs = [[W*0.2, H*0.25, 'rgba(90,60,170,0.16)'], [W*0.8, H*0.62, 'rgba(30,90,170,0.14)'], [W*0.45, H*0.9, 'rgba(140,50,130,0.10)']];
  for(const [x,y,color] of blobs){
    const drift = Math.sin(tick*0.002 + x) * 12;
    const g = ctx.createRadialGradient(x + drift, y, 0, x + drift, y, W*0.55);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(-40,-40,W+80,H+80);
  }
}

// pulsing chevrons on a boost pad so it reads as "launch here"
function drawBoostMark(p, bob){
  const offset = bob || 0;
  const pulse = (Math.sin(tick*0.12 + p.id) + 1)/2;
  ctx.save();
  ctx.globalAlpha = 0.45 + pulse*0.5;
  ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  const bx = p.x + p.w/2;
  for(let i=0;i<2;i++){
    const by = p.y - 10 - i*7 - pulse*3 + offset;
    ctx.beginPath(); ctx.moveTo(bx - 8, by + 5); ctx.lineTo(bx, by); ctx.lineTo(bx + 8, by + 5); ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = 1;
}

function draw(){
  // reset the transform each frame, then offset by the current screen shake
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if(shake.life > 0){
    ctx.translate((Math.random()*2-1)*shake.mag, (Math.random()*2-1)*shake.mag);
  }
  ctx.clearRect(-40,-40,W+80,H+80);
  // sky or space
  if(spaceMode){
    // deep black background
    ctx.fillStyle = '#000'; ctx.fillRect(-40,-40,W+80,H+80);
    drawNebula();
    // stars (twinkling)
    for(const s of stars){
      const a = Math.max(0, Math.min(1, s.baseAlpha + Math.sin(s.phase) * 0.3));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
      s.phase += s.twinkle * 0.7;
    }
    // shooting stars streak across now and then
    for(const s of shootingStars){
      const a = s.life / s.maxLife;
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx*6, s.y - s.vy*6);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx*6, s.y - s.vy*6); ctx.stroke();
    }
    ctx.lineWidth = 1;
  } else {
    drawSky();

    // clouds (behind everything, layered far to near)
    const layered = clouds.slice().sort((a,b)=>a.depth-b.depth);
    for(const c of layered) drawCloudShape(c.x, c.y, c.w, c.h, c.lobes, c.seed, c.alpha);
  }

  // platforms (draw as clouds; turn into rocks in space mode)
  for(const p of platforms){
    if(p.type === 'ground'){
      // draw ground as before, with a little grass detail on top
      ctx.fillStyle = '#6b8e23'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#4a6'; ctx.fillRect(p.x, p.y - 6, p.w, 6);
      ctx.strokeStyle = 'rgba(74,102,60,0.9)'; ctx.lineWidth = 2;
      for(let gx = p.x + 6; gx < p.x + p.w; gx += 14){
        const lean = Math.sin(gx*0.7) * 3;
        ctx.beginPath(); ctx.moveTo(gx, p.y - 6); ctx.lineTo(gx + lean, p.y - 14); ctx.stroke();
      }
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      for(let dx = p.x + 10; dx < p.x + p.w; dx += 23){ ctx.fillRect(dx, p.y + 12 + ((dx*7)%16), 3, 3); }
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
      // lit rim and craters so the rock reads as solid
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(p.x, p.y, p.w, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for(let crx = p.x + 9; crx < p.x + p.w - 6; crx += 21){
        ctx.beginPath(); ctx.arc(crx, p.y + 5 + ((crx*3)%3), 2.4, 0, Math.PI*2); ctx.fill();
      }
      if(p.glow > 0){
        ctx.fillStyle = `rgba(180,220,255,${0.30*p.glow})`;
        ctx.fillRect(p.x - 2, p.y - 3, p.w + 4, p.h + 4);
      }
      if(p.type === 'boost') drawBoostMark(p);
    } else {
      // cloud-style pads, gently bobbing
      const bob = Math.sin(tick*0.04 + p.bob) * 1.2;
      const cx = p.x + p.w/2;
      const cy = p.y + p.h/2 + bob;
      // soft drop shadow beneath the pad
      ctx.fillStyle = 'rgba(40,80,120,0.14)';
      ctx.beginPath(); ctx.ellipse(cx, p.y + p.h + 5, p.w*0.34, 4, 0, 0, Math.PI*2); ctx.fill();
      if(p.glow > 0){
        ctx.fillStyle = `rgba(255,255,255,${0.5*p.glow})`;
        ctx.beginPath(); ctx.ellipse(cx, cy, p.w*0.46, p.h*1.6, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.98)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, p.w*0.36, p.h*1.1, 0, 0, Math.PI*2);
      ctx.ellipse(p.x + p.w*0.22, cy + 2, p.w*0.22, p.h*0.9, 0, 0, Math.PI*2);
      ctx.ellipse(p.x + p.w*0.78, cy + 1, p.w*0.22, p.h*0.85, 0, 0, Math.PI*2);
      ctx.fill();
      // top highlight keeps the landing surface readable
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(p.x + 8, p.y - 1 + bob, p.w - 16, 2);
      // subtle shadow under cloud
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(p.x + 6, p.y + p.h - 4 + bob, p.w - 12, 4);
      // boost highlight (gold bar) if boost pad
      if(p.type === 'boost'){
        ctx.fillStyle = 'rgba(255,200,60,0.95)'; ctx.fillRect(p.x + p.w/2 - 12, p.y - 6 + bob, 24, 6);
        drawBoostMark(p, bob);
      }
    }
  }

  // draw spikes (moving hazards attached to platforms)
  for(const s of spikes){
    const sy = s.platform.y - s.h;
    const g = ctx.createLinearGradient(s.x, sy, s.x + s.w, sy + s.h);
    g.addColorStop(0, '#e04b4b'); g.addColorStop(0.5, '#b22222'); g.addColorStop(1, '#7d1414');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s.x, sy + s.h); ctx.lineTo(s.x + s.w/2, sy); ctx.lineTo(s.x + s.w, sy + s.h); ctx.closePath(); ctx.fill();
    // glint on the leading edge
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(s.x + s.w/2, sy + 1); ctx.lineTo(s.x + 2, sy + s.h - 1); ctx.stroke();
    ctx.lineWidth = 1;
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
      // thruster flame opposite direction of velocity, flickering
      const flick = 0.8 + Math.sin(b.flap*2)*0.2;
      ctx.fillStyle = '#ff8c42'; ctx.beginPath();
      if(b.vx > 0){ ctx.moveTo(-b.w/2, -b.h*0.12); ctx.lineTo(-b.w/2 - Math.abs(b.vx)*8*flick, 0); ctx.lineTo(-b.w/2, b.h*0.12); }
      else { ctx.moveTo(b.w/2, -b.h*0.12); ctx.lineTo(b.w/2 + Math.abs(b.vx)*8*flick, 0); ctx.lineTo(b.w/2, b.h*0.12); }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      const bcx = b.x + b.w/2, bcy = b.y + b.h/2;
      const flap = Math.sin(b.flap) * 9;
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(bcx, bcy, b.w/2, b.h/2, 0, 0, Math.PI*2); ctx.fill();
      // flapping wings either side of the body
      ctx.strokeStyle = '#222'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bcx - b.w*0.1, bcy - 2);
      ctx.quadraticCurveTo(bcx - b.w*0.35, bcy - 6 - flap, bcx - b.w*0.62, bcy - flap*0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bcx + b.w*0.1, bcy - 2);
      ctx.quadraticCurveTo(bcx + b.w*0.35, bcy - 6 - flap, bcx + b.w*0.62, bcy - flap*0.7);
      ctx.stroke();
      ctx.lineWidth = 1;
      // beak points where the bird is heading
      const dir = b.vx > 0 ? 1 : -1;
      ctx.fillStyle = '#f0a030'; ctx.beginPath();
      ctx.moveTo(bcx + dir*b.w*0.5, bcy - 1); ctx.lineTo(bcx + dir*(b.w*0.5 + 7), bcy + 1); ctx.lineTo(bcx + dir*b.w*0.5, bcy + 4);
      ctx.closePath(); ctx.fill();
      // eye
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bcx + dir*b.w*0.24, bcy - 3, 2.6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(bcx + dir*b.w*0.24, bcy - 3, 1.2, 0, Math.PI*2); ctx.fill();
    }
  }

  // dust puffs sit behind the cube
  drawPuffs();
  // jump stripes
  drawJumpStripes();

  // player (tilted cube with a full-coverage camo stripe) — hidden once it has burst
  if(!player.dead) drawPlayer();
  // floating "+1" pops, then the confetti overlay
  drawPops();
  drawConfetti();
  hud.textContent = `Score: ${score}`;
  // pad touch counter display: numeric at top-right
  scoreboardEl.textContent = padTouchCount;
  // coins display
  document.getElementById('coins').textContent = `Coins: ${coins}`;
  // high pad-touch display
  const hsEl = document.getElementById('highscore'); if(hsEl) hsEl.textContent = `High: ${highPads}`;
}

function drawPlayer(){
  const tilt = Math.max(-0.5, Math.min(0.5, (player.vx / (moveSpeed||1)) * 0.4));
  const cx = player.x + player.w/2, cy = player.y + player.h/2;
  // contact shadow so the cube feels grounded
  if(player.onGround){
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath(); ctx.ellipse(cx, player.y + player.h + 3, player.w*0.42, 4, 0, 0, Math.PI*2); ctx.fill();
  }
  ctx.save();
  // squash pivots on the feet, not the middle, so the cube never sinks into a pad
  ctx.translate(cx, cy + (player.h*(player.sqy-1))/2);
  ctx.rotate(tilt);
  ctx.scale(player.sqx, player.sqy);
  // base cube
  ctx.fillStyle = player.color;
  ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
  // soft inner shading gives the flat square some volume
  const shade = ctx.createLinearGradient(-player.w/2, -player.h/2, player.w/2, player.h/2);
  shade.addColorStop(0, 'rgba(255,255,255,0.22)');
  shade.addColorStop(0.55, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.20)');
  ctx.fillStyle = shade;
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
  // eye (tilts with cube, blinks now and then)
  if(player.blink > 0){
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.stroke();
    ctx.lineWidth = 1;
  } else {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI*2); ctx.fill();
    // pupil leans toward the direction of travel
    const look = Math.max(-2, Math.min(2, player.vx));
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(look, -2 + Math.max(-1.5, Math.min(1.5, player.vy*0.12)), 3, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
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

// reuse the record popup for short shop messages instead of blocking alerts
function showToast(text){
  const el = document.getElementById('new-high'); if(!el) return;
  el.textContent = text;
  el.classList.remove('hidden'); el.classList.add('show');
  setTimeout(()=>{ el.classList.remove('show'); el.classList.add('hidden'); }, 1400);
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

// dust puffs — landings, boosts, mid-air kicks and deaths all borrow this system
function pushPuff(o){ puffs.push(Object.assign({x:0,y:0,vx:0,vy:0,r:4,grow:0.3,life:20,maxLife:20,color:'255,255,255',alpha:0.75,square:false,rot:0,vr:0}, o)); }

function spawnLandingPuff(x, y, strength){
  const n = 3 + Math.round(strength*4);
  for(let i=0;i<n;i++){
    const dir = i % 2 === 0 ? 1 : -1;
    pushPuff({x:x + rand(-6,6), y:y, vx:dir*(Math.random()*1.6+0.4)*(0.6+strength), vy:-Math.random()*0.6, r:rand(3,6), grow:0.34, life:rand(16,26), maxLife:26, alpha:0.55+strength*0.3});
  }
}

function spawnRing(x, y){
  pushPuff({x:x, y:y, r:6, grow:1.5, life:16, maxLife:16, alpha:0.55, ring:true});
}

function spawnBoostBurst(x, y){
  for(let i=0;i<12;i++){
    pushPuff({x:x + rand(-14,14), y:y, vx:(Math.random()*3-1.5), vy:Math.random()*2+0.6, r:rand(2,5), grow:0.1, life:rand(16,30), maxLife:30, color:'255,205,80', alpha:0.9, square:true, rot:Math.random()*Math.PI, vr:(Math.random()*0.3-0.15)});
  }
  spawnRing(x, y);
}

function spawnDeathBurst(x, y){
  const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(player.color);
  const body = hex ? `${parseInt(hex[1],16)},${parseInt(hex[2],16)},${parseInt(hex[3],16)}` : '46,204,113';
  for(let i=0;i<22;i++){
    const a = Math.random()*Math.PI*2, sp = Math.random()*4+1.4;
    pushPuff({x:x, y:y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - 1, r:rand(3,7), grow:-0.02, life:rand(24,44), maxLife:44, color:body, alpha:1, square:true, rot:Math.random()*Math.PI, vr:(Math.random()*0.4-0.2), gravity:0.16});
  }
  for(let i=0;i<8;i++){
    pushPuff({x:x, y:y, vx:(Math.random()*4-2), vy:(Math.random()*-2-0.5), r:rand(5,10), grow:0.4, life:rand(18,30), maxLife:30, alpha:0.5});
  }
}

function updatePuffs(){
  for(let i=puffs.length-1;i>=0;i--){
    const p = puffs[i];
    if(p.gravity) p.vy += p.gravity;
    p.x += p.vx; p.y += p.vy; p.r += p.grow; p.rot += p.vr;
    p.vx *= 0.94;
    p.life--;
    if(p.life <= 0 || p.r <= 0) puffs.splice(i,1);
  }
}

function drawPuffs(){
  for(const p of puffs){
    const a = Math.max(0, (p.life / p.maxLife) * p.alpha);
    if(p.ring){
      ctx.strokeStyle = `rgba(${p.color},${a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r*1.5, p.r*0.6, 0, 0, Math.PI*2); ctx.stroke();
      ctx.lineWidth = 1;
      continue;
    }
    ctx.fillStyle = `rgba(${p.color},${a})`;
    if(p.square){
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r);
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    }
  }
}

// floating "+1" text when a new pad is touched
function spawnPop(x, y, text){ pops.push({x:x, y:y, text:text, life:34, maxLife:34}); }

function updatePops(){
  for(let i=pops.length-1;i>=0;i--){
    const p = pops[i]; p.y -= 0.9; p.life--; if(p.life <= 0) pops.splice(i,1);
  }
}

function drawPops(){
  for(const p of pops){
    const t = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, t);
    ctx.font = `700 ${Math.round(15 + (1-t)*3)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = '#fff';
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
    ctx.lineWidth = 1;
  }
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
canvas.addEventListener('mousedown', ()=>{ if(canStart()) start(); });
canvas.addEventListener('touchstart', e=>{ e.preventDefault(); if(canStart()) start(); }, {passive:false});

// difficulty controls binding
Array.from(document.querySelectorAll('.diff')).forEach(btn=>{ btn.addEventListener('click', e=>{ const el = e.currentTarget; const d = el.id.replace('diff-',''); setDifficulty(d); Array.from(document.querySelectorAll('.diff')).forEach(b=>b.classList.remove('active')); el.classList.add('active'); el.blur(); }); });

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
function openShop(){ tabShop.classList.add('active'); tabPlay.classList.remove('active'); shopEl.classList.remove('hidden'); running = false;
  // the run is paused, so say so rather than leaving a silent frozen canvas
  msg.style.display = 'block'; msg.textContent = 'Paused — Play to jump back in';
}
function closeShop(){ tabPlay.classList.add('active'); tabShop.classList.remove('active'); shopEl.classList.add('hidden'); }

tabShop.addEventListener('click', e=>{ openShop(); e.currentTarget.blur(); });
tabPlay.addEventListener('click', e=>{ closeShop(); e.currentTarget.blur(); if(!running) start(); });

// buy buttons
Array.from(document.querySelectorAll('.skin .buy')).forEach(btn=>{
  btn.addEventListener('click', ()=>{ buySkin(btn.dataset.skin); btn.blur(); });
});

function updateCoinDisplay(){ const el = document.getElementById('coins'); if(el) el.textContent = `Coins: ${coins}`; const cb = document.getElementById('coin-balance'); if(cb) cb.textContent = `Coins: ${coins}`; }

function buySkin(skin){ const prices = {gold:100, white:50, black:25, camo:75}; const price = prices[skin]||20; const owned = JSON.parse(localStorage.getItem('lb_owned')||'{}');
  if(owned[skin]){ equipSkin(skin); showToast(`Equipped ${skin}`); return; }
  if(coins >= price){ coins -= price; owned[skin] = true; localStorage.setItem('lb_coins', coins); localStorage.setItem('lb_owned', JSON.stringify(owned)); applySkin(skin); updateOwnedUI(); updateCoinDisplay(); showToast(`Purchased ${skin}!`); } else { showToast(`Need ${price - coins} more coins`); }
}

function updateOwnedUI(){ const owned = JSON.parse(localStorage.getItem('lb_owned')||'{}'); Array.from(document.querySelectorAll('.skin')).forEach(el=>{ const s = el.dataset.skin; const btn = el.querySelector('.buy'); const isEquipped = localStorage.getItem('lb_equipped')===s; el.classList.toggle('owned', Boolean(owned[s])); el.classList.toggle('equipped', isEquipped); if(owned[s]){ btn.textContent = isEquipped?'Equipped':'Equip'; } else { const price = {gold:100, white:50, black:25, camo:75}[s] || 20; btn.textContent = `Buy ${price}`; } }); }

function equipSkin(skin){ localStorage.setItem('lb_equipped', skin); applySkin(skin); updateOwnedUI(); }

function applySkin(skin){ const mapping = {gold:'#ffd700', white:'#ffffff', black:'#000000', green:'#2ecc71', camo:'#6b8e23'}; player.color = mapping[skin] || '#2ecc71'; player.skin = (skin === 'camo') ? 'camo' : 'solid'; localStorage.setItem('lb_equipped', skin); }

// idle title scene: the cube waits on the grass under drifting clouds until the first tap
platforms.push({id:0,x:0,y:H-40,w:W,h:40,type:'ground'});
player.y = H - 40 - player.h;
for(let i=0;i<cloudCount;i++) clouds.push(makeCloud(rand(10, H-160)));

// kick off the render loop — without this the canvas never paints a single frame
loop();
