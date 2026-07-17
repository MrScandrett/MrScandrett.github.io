// dino-jump.js - 2D canvas dinosaur runner
(function(){
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = window.devicePixelRatio || 1;

  function resize(){
    dpr = window.devicePixelRatio || 1;
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Colors
  const bg = 'transparent';
  const darkGray = '#2f2f2f';
  const groundGray = '#3a3a3a';

  // Game objects
  function getGroundY(){ return h - 100; }
  const dino = {
    x: 80,
    width: 48,
    height: 48,
    y: 0, // set below
    vy: 0,
    isJumping: false
  };

  function resetDinoY(){ dino.y = getGroundY() - dino.height; }
  resetDinoY();

  const gravity = 0.9; // tuned for pixel units
  const jumpForce = 18;

  const obstacles = [];
  let spawnTimer = 0;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('dinoJumpHigh') || '0', 10);
  let gameOver = false;

  function spawnObstacle(){
    const wOb = 20 + Math.random() * 40; // varied widths
    const hOb = 30 + Math.random() * 100; // varied heights
    const ox = w + 20;
    const speed = 5 + Math.random() * 3;
    const numArms = Math.random() < 0.7 ? (Math.random() < 0.5 ? 1 : 2) : 0;
    obstacles.push({ x: ox, y: getGroundY() - hOb, width: wOb, height: hOb, passed: false, speed: speed, arms: numArms });
  }

  function rectsIntersect(a,b){
    return !(a.x + a.width < b.x || a.x > b.x + b.width || a.y + a.height < b.y || a.y > b.y + b.height);
  }

  // Input
  let spaceDown = false;
  window.addEventListener('keydown', (e) => {
    if(e.code === 'Space') spaceDown = true;
  });
  window.addEventListener('keyup', (e) => {
    if(e.code === 'Space') spaceDown = false;
  });
  canvas.addEventListener('mousedown', () => spaceDown = true);
  canvas.addEventListener('mouseup', () => spaceDown = false);

  function jump(){
    if(!dino.isJumping && !gameOver){
      dino.vy = -jumpForce;
      dino.isJumping = true;
    }
  }

  // Hook UI controls
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalScoreEl = document.getElementById('finalScore');
  const restartBtn = document.getElementById('restartBtn');
  restartBtn.addEventListener('click', restart);

  canvas.addEventListener('click', () => {
    if(gameOver) restart(); else jump();
  });

  function restart(){
    obstacles.length = 0;
    score = 0;
    spawnTimer = 0;
    gameOver = false;
    gameOverScreen.style.display = 'none';
    resetDinoY();
    dino.vy = 0;
    dino.isJumping = false;
  }

  function update(){
    if(!gameOver){
      // Input jump
      if(spaceDown) jump();

      // Physics
      dino.vy += gravity;
      dino.y += dino.vy;
      if(dino.y >= getGroundY() - dino.height){
        resetDinoY();
        dino.vy = 0;
        dino.isJumping = false;
      }

      // Obstacles
      spawnTimer--;
      if(spawnTimer <= 0){
        spawnObstacle();
        spawnTimer = 80 + Math.floor(Math.random() * 80);
      }

      for(let i = obstacles.length -1; i >= 0; i--){
        const ob = obstacles[i];
        ob.x -= ob.speed;
        if(!ob.passed && ob.x + ob.width < dino.x){ ob.passed = true; score += 10; }
        if(ob.x + ob.width < -50){ obstacles.splice(i,1); }
        // Collision
        if(rectsIntersect({x:dino.x,y:dino.y,width:dino.width,height:dino.height}, ob)){
          gameOver = true;
          finalScoreEl.textContent = `Score: ${score}`;
          gameOverScreen.style.display = 'block';
          if(score > highScore){ highScore = score; localStorage.setItem('dinoJumpHigh', highScore); }
        }
      }

      scoreEl.textContent = `Score: ${score}`;
      highScoreEl.textContent = `High Score: ${highScore}`;
    }
  }

  function draw(){
    // Clear
    ctx.clearRect(0,0,w,h);

    // Ground
    ctx.fillStyle = groundGray;
    const groundY = getGroundY();
    ctx.fillRect(0, groundY, w, h - groundY);

    // Draw dino (as rounded rectangle)
    ctx.fillStyle = darkGray;
    const r = 6;
    roundRect(ctx, dino.x, dino.y, dino.width, dino.height, r);
    ctx.fill();

    // Draw obstacles (cactus) with arms and spikes
    for(const ob of obstacles){
      drawCactus(ctx, ob);
    }

    // Draw dino (in front)
    drawDino(ctx, dino, (performance.now()||0) / 100);


  function drawDino(ctx, dino, t){
    ctx.save();
    // body
    ctx.fillStyle = darkGray;
    roundRect(ctx, dino.x, dino.y, dino.width, dino.height, 6);
    ctx.fill();

    // head
    const headW = dino.width * 0.6;
    const headH = dino.height * 0.55;
    const headX = dino.x + dino.width - headW*0.6;
    const headY = dino.y - headH*0.35;
    roundRect(ctx, headX, headY, headW, headH, 6);
    ctx.fill();

    // eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(headX + headW*0.65, headY + headH*0.35, Math.max(2, headH*0.12), 0, Math.PI*2);
    ctx.fill();

    // tail
    ctx.fillStyle = darkGray;
    ctx.beginPath();
    ctx.moveTo(dino.x + 4, dino.y + dino.height*0.6);
    ctx.lineTo(dino.x - dino.width*0.5, dino.y + dino.height*0.4);
    ctx.lineTo(dino.x + 4, dino.y + dino.height*0.3);
    ctx.closePath();
    ctx.fill();

    // legs (simple, slight animation when jumping/running)
    const legOffset = dino.isJumping ? 4 : Math.sin(t)*4;
    ctx.fillStyle = '#222';
    ctx.fillRect(dino.x + 8, dino.y + dino.height - 6, 8, 12 + (legOffset>0?legOffset:0));
    ctx.fillRect(dino.x + dino.width - 18, dino.y + dino.height - 6, 8, 12 + (legOffset<0?-legOffset:0));

    ctx.restore();
  }

  function drawCactus(ctx, ob){
    ctx.save();
    ctx.fillStyle = darkGray;
    // main column
    const bw = ob.width;
    const bh = ob.height;
    roundRect(ctx, ob.x, ob.y, bw, bh, Math.min(8, bw*0.15));
    ctx.fill();

    // arms
    if(ob.arms >= 1){
      const armW = Math.max(6, bw*0.25);
      const armH = Math.max(8, bh*0.25);
      const ay = ob.y + bh*0.25;
      ctx.beginPath();
      roundRect(ctx, ob.x - armW*0.6, ay, armW, armH, 6);
      ctx.fill();
    }
    if(ob.arms >= 2){
      const armW = Math.max(6, bw*0.25);
      const armH = Math.max(8, bh*0.25);
      const ay = ob.y + bh*0.45;
      roundRect(ctx, ob.x + bw - armW*0.4, ay, armW, armH, 6);
      ctx.fill();
    }

    // spikes (small triangles) around the top
    ctx.fillStyle = '#222';
    const spikes = Math.max(3, Math.floor(bw/8));
    for(let i=0;i<spikes;i++){
      const sx = ob.x + 4 + (i/(spikes-1))*(bw-8);
      const sy = ob.y + 6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx+4, sy-8);
      ctx.lineTo(sx+8, sy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
  }

  function roundRect(ctx, x, y, width, height, radius){
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  let last = 0;
  function loop(ts){
    if(!last) last = ts;
    const dt = ts - last;
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Start
  resize();
  loop(0);

})();
