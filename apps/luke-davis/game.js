import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { addEnvironment } from './environment.js';

/* =========================
   BASIC SETUP
========================= */
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

/* =========================
   LIGHTING
========================= */
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 30, 10);
dirLight.castShadow = true;
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0x404040));

/* =========================
   MAP
========================= */
const MAP_SIZE = 100;

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2),
    new THREE.MeshStandardMaterial({ color: 0x228b22 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

addEnvironment(scene, MAP_SIZE);

/* =========================
   OBSTACLE CACHE
========================= */
const obstacles = [];
scene.traverse(obj => {
    if (obj.userData.isObstacle) obstacles.push(obj);
});

/* =========================
   UI REFERENCES
========================= */
const minimap = document.getElementById('minimap');
const playerDot = document.createElement('div');
playerDot.className = 'dot';
minimap.appendChild(playerDot);

const stormCircle = document.createElement('div');
stormCircle.className = 'storm-circle';
minimap.appendChild(stormCircle);

const healthFill = document.querySelector('#player-health .health-fill');
const healthText = document.getElementById('healthText');
const ammoFill = document.querySelector('.ammo-bar .fill');
const ammoText = document.getElementById('ammoText');
const timerEl = document.getElementById('timer');
const stormOverlay = document.getElementById('stormOverlay');
const damageFlash = document.getElementById('damage-flash');

// Purple storm overlay
stormOverlay.style.background = 'rgba(128,0,255,0.3)';
stormOverlay.style.pointerEvents = 'none';
stormOverlay.style.position = 'absolute';
stormOverlay.style.top = 0;
stormOverlay.style.left = 0;
stormOverlay.style.width = '100%';
stormOverlay.style.height = '100%';
stormOverlay.style.opacity = 0;
stormOverlay.style.transition = 'opacity 0.3s';

/* =========================
   PLAYER
========================= */
const player = new THREE.Group();
scene.add(player);

const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
const shirtMat = new THREE.MeshStandardMaterial({ color: 0x3498db });
const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });

function box(w,h,d,mat){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); }

const head = new THREE.Mesh(new THREE.SphereGeometry(0.35,16,16), skinMat);
head.position.y = 2.6;
const torso = box(0.9,1.2,0.5,shirtMat); torso.position.y=1.8;
const armGeo = new THREE.BoxGeometry(0.25,1,0.25);
const leftArm = new THREE.Mesh(armGeo,skinMat); leftArm.position.set(-0.7,1.8,0);
const rightArm = new THREE.Mesh(armGeo,skinMat); rightArm.position.set(0.7,1.8,0);
const legGeo = new THREE.BoxGeometry(0.35,1.1,0.35);
const leftLeg = new THREE.Mesh(legGeo,pantsMat); leftLeg.position.set(-0.25,0.55,0);
const rightLeg = new THREE.Mesh(legGeo,pantsMat); rightLeg.position.set(0.25,0.55,0);

player.add(head,torso,leftArm,rightArm,leftLeg,rightLeg);

/* =========================
   CONTROLS
========================= */
const keys = {};
window.addEventListener('keydown', e=>keys[e.key.toLowerCase()]=true);
window.addEventListener('keyup', e=>keys[e.key.toLowerCase()]=false);

let yaw=0, velocityY=0, grounded=true;
let knockbackVelocity=new THREE.Vector3();
let cameraShake=0;
let isBeingHit=false; // track if player is taking damage

const MOVE_SPEED=0.4;
const TURN_SPEED=0.1;
const GRAVITY=-0.03;

/* =========================
   HEALTH & AMMO
========================= */
let health=100;
let ammo=10;
const maxAmmo=10;

let isReloading=false;
let reloadStart=0;
const reloadTime=2;

let lastShotTime=0;
const SHOOT_COOLDOWN=250;

function updateHealth(){
    health=Math.max(0,health);
    healthFill.style.width=health+'%';
    healthText.textContent=Math.floor(health);
    document.getElementById('player-health')
        .classList.toggle('low',health<30);
    if(health<=0) gameOver();
}

function updateAmmo(){
    ammoFill.style.width=(ammo/maxAmmo*100)+'%';
    ammoText.textContent=ammo;
}

/* =========================
   BULLETS
========================= */
const bullets=[];

function shootBullet(){
    const now=Date.now();
    if(ammo<=0||isReloading||now-lastShotTime<SHOOT_COOLDOWN) return;

    lastShotTime=now;
    ammo--; updateAmmo();

    const bullet=new THREE.Mesh(
        new THREE.SphereGeometry(0.1,8,8),
        new THREE.MeshBasicMaterial({color:0xffff00})
    );

    bullet.position.copy(player.position)
        .add(new THREE.Vector3(0,1.8,0));
    bullet.userData.forward=new THREE.Vector3(
        Math.sin(yaw),0,Math.cos(yaw)
    );
    bullets.push(bullet);
    scene.add(bullet);
}

window.addEventListener('click',shootBullet);
window.addEventListener('contextmenu',e=>e.preventDefault());

window.addEventListener('keydown',e=>{
    if(e.key.toLowerCase()==='r'&&!isReloading&&ammo<maxAmmo){
        isReloading=true;
        reloadStart=Date.now();
    }
});

/* =========================
   ENEMIES
========================= */
const enemies=[];

function createHealthBar(){
    const geo=new THREE.PlaneGeometry(1,0.1);
    const mat=new THREE.MeshBasicMaterial({color:0x00ff00});
    const bar=new THREE.Mesh(geo,mat);
    bar.position.y=3.8;
    return bar;
}

function spawnEnemy(){
    const enemy=new THREE.Group();
    enemy.userData.health=50;

    const eHead=new THREE.Mesh(
        new THREE.SphereGeometry(0.45,16,16),
        new THREE.MeshStandardMaterial({color:0xff5555})
    );
    eHead.position.y=3;

    const eTorso=box(1,1.5,0.5,
        new THREE.MeshStandardMaterial({color:0x990000}));
    eTorso.position.y=2;

    const healthBar=createHealthBar();
    enemy.userData.healthBar=healthBar;

    enemy.add(eHead,eTorso,healthBar);

    let x,z;
    do{
        x=(Math.random()-0.5)*MAP_SIZE*2;
        z=(Math.random()-0.5)*MAP_SIZE*2;
    }while(checkCollision(new THREE.Vector3(x,0,z)));

    enemy.position.set(x,0,z);

    const dot=document.createElement('div');
    dot.className='dot red';
    minimap.appendChild(dot);
    enemy.userData.minimapDot=dot;

    scene.add(enemy);
    enemies.push(enemy);
}

for(let i=0;i<5;i++) spawnEnemy();
setInterval(spawnEnemy,5000);

/* =========================
   STORM (MOVING CENTER)
========================= */
let stormCenter=new THREE.Vector3(0,0,0);
let stormRadius=MAP_SIZE;
let stormShrinkSpeed=0.01;
const stormDamagePerSecond=10;

const storm=new THREE.Mesh(
    new THREE.RingGeometry(1,1.02,64),
    new THREE.MeshBasicMaterial({
        color:0x8000ff,
        transparent:true,
        opacity:0.35,
        side:THREE.DoubleSide
    })
);
storm.rotation.x=Math.PI/2;
scene.add(storm);

/* =========================
   TIMER
========================= */
const MATCH_TIME=60;
let startTime=0;

/* =========================
   START / END
========================= */
const startScreen=document.getElementById('startScreen');
const startButton=document.getElementById('startButton');

let gameStarted=false;
let ended=false;

startButton.addEventListener('click',()=>{
    startScreen.style.display='none';
    resetGame();
    gameStarted=true;
    animate();
});

function gameOver(){
    if(ended) return;
    ended=true;
    showMessage('GAME OVER','red');
    showRestartButton();
}

function victory(){
    if(ended) return;
    ended=true;
    showMessage('VICTORY ROYALE!','gold');
    showRestartButton();
}

function showMessage(text,color){
    const msg=document.createElement('div');
    msg.className='message';
    msg.style.color=color;
    msg.textContent=text;
    document.body.appendChild(msg);
}

function showRestartButton(){
    const btn=document.createElement('button');
    btn.id='restartButton';
    btn.textContent='RESTART';
    document.body.appendChild(btn);

    btn.addEventListener('click',()=>{
        document.querySelectorAll('.message')
            .forEach(m=>m.remove());
        btn.remove();
        startScreen.style.display='flex';
        gameStarted=false;
        ended=false;
    });
}

function resetGame(){
    health=100;
    ammo=maxAmmo;
    updateHealth();
    updateAmmo();

    player.position.set(0,0,0);
    yaw=0;
    knockbackVelocity.set(0,0,0);
    cameraShake=0;

    bullets.forEach(b=>scene.remove(b));
    bullets.length=0;

    enemies.forEach(e=>{
        e.userData.minimapDot.remove();
        scene.remove(e);
    });
    enemies.length=0;

    for(let i=0;i<5;i++) spawnEnemy();

    stormRadius=MAP_SIZE;
    stormCenter.set(0,0,0);
    storm.scale.set(stormRadius,stormRadius,1);

    startTime=Date.now();
}

/* =========================
   COLLISION
========================= */
function checkCollision(pos){
    for(let obj of obstacles){
        if(pos.distanceTo(obj.position)<obj.userData.radius+0.5)
            return true;
    }
    return false;
}

/* =========================
   MAIN LOOP
========================= */
let lastStormDamageTime=Date.now();

function animate(){
    if(!gameStarted||ended) return;
    requestAnimationFrame(animate);

    const now=Date.now();

    /* TIMER */
    const elapsed=Math.floor((now-startTime)/1000);
    const remaining=Math.max(MATCH_TIME-elapsed,0);
    timerEl.textContent=`0:${remaining.toString().padStart(2,'0')}`;
    if(remaining===0) victory();

    /* PLAYER MOVEMENT */
    if(keys['a']) yaw+=TURN_SPEED;
    if(keys['d']) yaw-=TURN_SPEED;

    const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
    let nextPos=player.position.clone();
    if(keys['w']) nextPos.addScaledVector(forward,MOVE_SPEED);
    if(keys['s']) nextPos.addScaledVector(forward,-MOVE_SPEED);
    if(!checkCollision(nextPos)) player.position.copy(nextPos);

    if(keys['c']&&grounded){ velocityY=0.5; grounded=false; }
    velocityY+=GRAVITY;
    player.position.y+=velocityY;
    if(player.position.y<=0){
        player.position.y=0;
        velocityY=0;
        grounded=true;
    }

    player.rotation.y=yaw;
    player.position.add(knockbackVelocity);
    knockbackVelocity.multiplyScalar(0.8);

    /* CAMERA SHAKE reset if not hit */
    if(!isBeingHit) cameraShake=0;

    const shakeOffset=(Math.random()-0.5)*cameraShake;

    /* BULLETS */
    for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i];
        b.position.addScaledVector(b.userData.forward,1);

        for(let j=enemies.length-1;j>=0;j--){
            const e=enemies[j];
            if(b.position.distanceTo(e.position)<2){
                e.userData.health-=25;
                e.userData.healthBar.scale.x=
                    e.userData.health/50;

                damageFlash.classList.add('active');
                setTimeout(()=>damageFlash.classList.remove('active'),100);

                if(e.userData.health<=0){
                    e.userData.minimapDot.remove();
                    scene.remove(e);
                    enemies.splice(j,1);
                }

                scene.remove(b);
                bullets.splice(i,1);
                break;
            }
        }

        if(b.position.length()>MAP_SIZE*2){
            scene.remove(b);
            bullets.splice(i,1);
        }
    }

    /* ENEMIES */
    isBeingHit=false;
    enemies.forEach(e=>{
        const dir=new THREE.Vector3()
            .subVectors(player.position,e.position);
        dir.y=0;
        const dist=dir.length();

        if(dist>1.5){
            dir.normalize();
            const next=e.position.clone()
                .addScaledVector(dir,MOVE_SPEED*0.9);
            if(!checkCollision(next))
                e.position.copy(next);
        }

        if(dist<1.5){
            health-=2*(now-lastStormDamageTime)/1000; // 2 damage per second
            updateHealth();
            cameraShake=0.5;
            isBeingHit=true;
        }

        const scale=minimap.clientWidth/(MAP_SIZE*2);
        const dot=e.userData.minimapDot;
        dot.style.left=e.position.x*scale+
            minimap.clientWidth/2+'px';
        dot.style.top=e.position.z*scale+
            minimap.clientHeight/2+'px';
    });

    /* STORM */
    stormRadius-=stormShrinkSpeed;
    stormCenter.x+=Math.sin(now*0.0001)*0.02;
    stormCenter.z+=Math.cos(now*0.0001)*0.02;
    storm.position.set(stormCenter.x,0,stormCenter.z);
    storm.scale.set(stormRadius,stormRadius,1);

    const delta=(now-lastStormDamageTime)/1000;
    const distToStorm = player.position.distanceTo(stormCenter);
    if(distToStorm>stormRadius){
        health -= stormDamagePerSecond*delta;
        updateHealth();
        stormOverlay.style.opacity=1; // show purple overlay
    } else {
        stormOverlay.style.opacity=0; // hide overlay
    }

    lastStormDamageTime=now;

    /* MINIMAP */
    const scale=minimap.clientWidth/(MAP_SIZE*2);
    playerDot.style.left=player.position.x*scale+
        minimap.clientWidth/2+'px';
    playerDot.style.top=player.position.z*scale+
        minimap.clientHeight/2+'px';

    /* CAMERA */
    camera.position.set(
        player.position.x-Math.sin(yaw)*10+shakeOffset,
        8+shakeOffset,
        player.position.z-Math.cos(yaw)*10+shakeOffset
    );
    camera.lookAt(player.position);

    /* RELOAD */
    if(isReloading){
        const t=(now-reloadStart)/1000;
        ammoFill.style.width=(t/reloadTime*100)+'%';
        ammoText.textContent=Math.ceil(reloadTime-t);
        if(t>=reloadTime){
            ammo=maxAmmo;
            isReloading=false;
            updateAmmo();
        }
    }

    renderer.render(scene,camera);
}

/* =========================
   RESIZE
========================= */
window.addEventListener('resize',()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
});