// dino-game.js - 3D dinosaur runner game using Three.js
(function(){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb0b0b0);
  scene.fog = new THREE.Fog(0xb0b0b0, 100, 150);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 2, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 10, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(500, 10);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x404040 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Create dinosaur
  function createDinosaur(){
    const dino = new THREE.Group();
    const grayMat = new THREE.MeshStandardMaterial({ color: 0x1b4d2a });
    
    // Back legs (thick and powerful)
    const backLegGeo = new THREE.BoxGeometry(0.25, 1, 0.3);
    const backLeg1 = new THREE.Mesh(backLegGeo, grayMat);
    backLeg1.position.set(-0.35, 0.3, 0.25);
    backLeg1.castShadow = true;
    dino.add(backLeg1);
    const backLeg2 = new THREE.Mesh(backLegGeo, grayMat);
    backLeg2.position.set(-0.35, 0.3, -0.25);
    backLeg2.castShadow = true;
    dino.add(backLeg2);

    // Front legs (smaller)
    const frontLegGeo = new THREE.BoxGeometry(0.15, 0.7, 0.2);
    const frontLeg1 = new THREE.Mesh(frontLegGeo, grayMat);
    frontLeg1.position.set(0.3, 0.25, 0.15);
    frontLeg1.castShadow = true;
    dino.add(frontLeg1);
    const frontLeg2 = new THREE.Mesh(frontLegGeo, grayMat);
    frontLeg2.position.set(0.3, 0.25, -0.15);
    frontLeg2.castShadow = true;
    dino.add(frontLeg2);

    // Body (elongated, tilted upward)
    const bodyGeo = new THREE.BoxGeometry(1.5, 0.9, 0.6);
    const body = new THREE.Mesh(bodyGeo, grayMat);
    body.position.set(-0.2, 0.8, 0);
    body.rotation.z = 0.1;
    body.castShadow = true;
    dino.add(body);

    // Neck (angled upward)
    const neckGeo = new THREE.BoxGeometry(0.3, 0.8, 0.4);
    const neck = new THREE.Mesh(neckGeo, grayMat);
    neck.position.set(0.6, 1.3, 0);
    neck.rotation.z = 0.3;
    neck.castShadow = true;
    dino.add(neck);

    // Head (triangular/pointed like T-Rex)
    const headGeo = new THREE.BoxGeometry(0.5, 0.6, 0.35);
    const head = new THREE.Mesh(headGeo, grayMat);
    head.position.set(1.0, 1.8, 0);
    head.castShadow = true;
    dino.add(head);

    // Snout (pointed forward)
    const snoutGeo = new THREE.ConeGeometry(0.2, 0.4, 8);
    const snout = new THREE.Mesh(snoutGeo, grayMat);
    snout.position.set(1.35, 1.75, 0);
    snout.rotation.z = Math.PI / 2;
    snout.castShadow = true;
    dino.add(snout);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(0.95, 1.95, 0.15);
    dino.add(eye1);
    const eye2 = eye1.clone();
    eye2.position.z = -0.15;
    dino.add(eye2);

    // Tail (long and tapered)
    const tailGeo = new THREE.ConeGeometry(0.25, 2.5, 8);
    const tail = new THREE.Mesh(tailGeo, grayMat);
    tail.position.set(-1.5, 0.7, 0);
    tail.rotation.z = Math.PI / 3;
    tail.castShadow = true;
    dino.add(tail);

    dino.position.set(-8, 1, 0);
    return dino;
  }

  const dinosaur = createDinosaur();
  scene.add(dinosaur);

  // Game state
  let score = 0;
  let highScore = localStorage.getItem('dinoHighScore') || 0;
  let gameOver = false;
  let isJumping = false;
  let velocity = 0;
  const gravity = 0.15;
  const jumpForce = 1.3;

  const obstacles = [];
  let spawnRate = 100;
  let spawnCounter = spawnRate;

  // Obstacle class (Cactus)
  class Obstacle {
    constructor(){
      const cactus = new THREE.Group();
      const cactusColor = new THREE.MeshStandardMaterial({ color: 0x228b22 });
      
      // Main body
      const bodyGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8);
      const body = new THREE.Mesh(bodyGeo, cactusColor);
      body.castShadow = true;
      cactus.add(body);
      this.body = body; // Store for collision detection
      
      // Left arm
      const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
      const leftArm = new THREE.Mesh(armGeo, cactusColor);
      leftArm.position.set(-0.35, 0.2, 0);
      leftArm.rotation.z = Math.PI / 2.5;
      leftArm.castShadow = true;
      cactus.add(leftArm);
      
      // Right arm
      const rightArm = new THREE.Mesh(armGeo, cactusColor);
      rightArm.position.set(0.35, 0.2, 0);
      rightArm.rotation.z = -Math.PI / 2.5;
      rightArm.castShadow = true;
      cactus.add(rightArm);
      
      // Spines (small boxes)
      for(let i = 0; i < 4; i++){
        const spineGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
        const spine = new THREE.Mesh(spineGeo, cactusColor);
        spine.position.set(
          Math.cos(i * Math.PI / 2) * 0.28,
          0.1,
          Math.sin(i * Math.PI / 2) * 0.28
        );
        spine.castShadow = true;
        cactus.add(spine);
      }
      
      this.mesh = cactus;
      this.mesh.position.set(15, 0.5, 0);
      scene.add(this.mesh);
      this.speed = 0.3;
    }

    update(){
      this.mesh.position.x -= this.speed;
    }

    isOffScreen(){
      return this.mesh.position.x < -20;
    }
  }

  // Collision detection
  function checkCollision(){
    const dinoBox = new THREE.Box3().setFromObject(dinosaur);
    for(let obs of obstacles){
      // Only check collision with the body, not the spines
      const bodyBox = new THREE.Box3().setFromObject(obs.body);
      if(dinoBox.intersectsBox(bodyBox)){
        return true;
      }
    }
    return false;
  }

  // Input
  let spacePressed = false;
  document.addEventListener('keydown', (e) => {
    if(e.code === 'Space'){
      spacePressed = true;
      if(gameOver) restart();
    }
  });
  document.addEventListener('keyup', (e) => {
    if(e.code === 'Space') spacePressed = false;
  });
  renderer.domElement.addEventListener('click', () => {
    spacePressed = true;
    if(gameOver) restart();
  });

  function jump(){
    if(!isJumping && !gameOver){
      velocity = jumpForce;
      isJumping = true;
    }
  }

  function restart(){
    score = 0;
    gameOver = false;
    isJumping = false;
    velocity = 0;
    spawnCounter = spawnRate;
    dinosaur.position.y = 1;
    for(let obs of obstacles){
      scene.remove(obs.mesh);
    }
    obstacles.length = 0;
    document.getElementById('gameOverScreen').style.display = 'none';
    updateUI();
  }

  function updateUI(){
    document.getElementById('score').textContent = `Score: ${Math.floor(score)}`;
    document.getElementById('highScore').textContent = `High Score: ${highScore}`;
  }

  function showGameOver(){
    document.getElementById('finalScore').textContent = `Score: ${Math.floor(score)}`;
    document.getElementById('gameOverScreen').style.display = 'block';
    if(score > highScore){
      highScore = score;
      localStorage.setItem('dinoHighScore', highScore);
    }
  }

  // Game loop
  function animate(){
    requestAnimationFrame(animate);

    if(!gameOver){
      // Jump
      if(spacePressed && !isJumping){
        jump();
      }

      // Gravity
      velocity -= gravity;
      dinosaur.position.y += velocity;

      if(dinosaur.position.y <= 1){
        dinosaur.position.y = 1;
        isJumping = false;
        velocity = 0;
      }

      // Spawn obstacles
      spawnCounter--;
      if(spawnCounter <= 0){
        obstacles.push(new Obstacle());
        spawnCounter = spawnRate;
        spawnRate = Math.max(50, spawnRate - 1);
      }

      // Update obstacles
      for(let i = obstacles.length - 1; i >= 0; i--){
        obstacles[i].update();
        if(obstacles[i].isOffScreen()){
          scene.remove(obstacles[i].mesh);
          obstacles.splice(i, 1);
          score += 10;
        }
      }

      // Collision
      if(checkCollision()){
        gameOver = true;
        showGameOver();
      }

      updateUI();
    }

    // Camera follow
    camera.position.x = dinosaur.position.x + 2;
    camera.lookAt(dinosaur.position.x + 5, 2, 0);

    renderer.render(scene, camera);
  }

  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Restart button
  document.getElementById('restartBtn').addEventListener('click', restart);

  // Start
  updateUI();
  animate();

})();
