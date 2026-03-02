// 3D Connect 4 Game using Three.js
(function(){
  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(3.5, 3, 8);
  camera.lookAt(3.5, 3, 0);
  
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowShadowMap;
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 8, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.left = -10;
  directionalLight.shadow.camera.right = 10;
  directionalLight.shadow.camera.top = 10;
  directionalLight.shadow.camera.bottom = -1;
  scene.add(directionalLight);

  // Board and game state
  const COLS = 7, ROWS = 6;
  let board = Array(COLS).fill(null).map(() => []);
  let gameOver = false, playerTurn = true;
  const pieces = [];
  const highlightBox = new THREE.Box3Helper(new THREE.Box3(), 0xFFFF00);
  let selectedCol = -1;
  let lastAICol = -1;

  // Create board visual (7x6 grid)
  const boardGroup = new THREE.Group();
  const slotMaterial = new THREE.MeshStandardMaterial({ color: 0x003366 });
  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x66CCFF, linewidth: 2 });
  
  for(let row = 0; row < ROWS; row++){
    for(let col = 0; col < COLS; col++){
      const slotGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16);
      const slot = new THREE.Mesh(slotGeo, slotMaterial);
      slot.position.set(col, row, 0);
      slot.receiveShadow = true;
      boardGroup.add(slot);
      
      // Add light blue outline
      const edges = new THREE.EdgesGeometry(slotGeo);
      const outline = new THREE.LineSegments(edges, outlineMaterial);
      outline.position.set(col, row, 0);
      boardGroup.add(outline);
    }
  }
  scene.add(boardGroup);

  // Piece creation
  function createPiece(color, row, col){
    const pieceGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 16);
    const pieceMat = new THREE.MeshStandardMaterial({ color });
    const piece = new THREE.Mesh(pieceGeo, pieceMat);
    piece.castShadow = true;
    piece.receiveShadow = true;
    piece.userData = { row, col, color, falling: false, targetY: row };
    return piece;
  }

  function dropPiece(col, color){
    if(board[col].length >= ROWS) return false;
    const row = board[col].length;
    board[col].push(color);
    const piece = createPiece(color === 'player' ? 0x0099FF : 0xFF3333, ROWS + 1, col);
    piece.position.set(col, ROWS + 1, 0.05);
    piece.userData.targetY = row;
    piece.userData.falling = true;
    pieces.push(piece);
    scene.add(piece);
    return true;
  }

  // Win detection
  function checkWin(col, row, color){
    const colorVal = color === 'player' ? 'player' : 'ai';
    const check = (dc, dr) => {
      let count = 1;
      for(let i = 1; i < 4; i++){
        const nc = col + dc * i, nr = row + dr * i;
        if(nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
        if(board[nc][nr] !== colorVal) break;
        count++;
      }
      for(let i = 1; i < 4; i++){
        const nc = col - dc * i, nr = row - dr * i;
        if(nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
        if(board[nc][nr] !== colorVal) break;
        count++;
      }
      return count >= 4;
    };
    return check(1, 0) || check(0, 1) || check(1, 1) || check(1, -1);
  }

  // AI logic
  function aiMove(){
    // First, check if AI can win immediately
    for(let col = 0; col < COLS; col++){
      if(board[col].length >= ROWS) continue;
      const row = board[col].length;
      board[col].push('ai');
      if(checkWin(col, row, 'ai')){
        board[col].pop();
        lastAICol = col;
        return col;
      }
      board[col].pop();
    }
    
    // Second, check if we need to block player from winning
    for(let col = 0; col < COLS; col++){
      if(board[col].length >= ROWS) continue;
      const row = board[col].length;
      board[col].push('player');
      if(checkWin(col, row, 'player')){
        board[col].pop();
        lastAICol = col;
        return col;
      }
      board[col].pop();
    }
    
    // Otherwise use minimax
    let bestCol = -1, bestScore = -Infinity;
    for(let col = 0; col < COLS; col++){
      if(board[col].length >= ROWS || col === lastAICol) continue;
      const row = board[col].length;
      board[col].push('ai');
      const score = minimax(4, -Infinity, Infinity, false);
      board[col].pop();
      if(score > bestScore){
        bestScore = score;
        bestCol = col;
      }
    }
    if(bestCol < 0){
      for(let col = 0; col < COLS; col++){
        if(board[col].length < ROWS){
          bestCol = col;
          break;
        }
      }
    }
    lastAICol = bestCol;
    return bestCol;
  }

  function evaluateBoard(){
    let aiScore = 0, playerScore = 0;
    const checkPattern = (col, row, color, dc, dr) => {
      let count = 1, gaps = 0, blocked = 0;
      for(let i = 1; i < 4; i++){
        const nc = col + dc * i, nr = row + dr * i;
        if(nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS){
          blocked++;
          break;
        }
        if(board[nc][nr] === color) count++;
        else if(board[nc][nr] === null) gaps++;
        else { blocked++; break; }
      }
      if(count === 4) return 1000;
      if(count === 3 && gaps === 1) return 200;
      if(count === 2 && gaps === 2 && !blocked) return 50;
      if(count === 2 && gaps === 1) return 10;
      return 0;
    };
    
    for(let col = 0; col < COLS; col++){
      for(let row = 0; row < board[col].length; row++){
        const c = board[col][row];
        if(!c) continue;
        const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for(const [dc, dr] of dirs){
          const score = checkPattern(col, row, c, dc, dr);
          if(c === 'ai') aiScore += score * 2;
          else playerScore += score * 2;
        }
      }
    }
    return aiScore - playerScore;
  }

  function minimax(depth, alpha, beta, isAI){
    let terminal = false;
    for(let col = 0; col < COLS; col++){
      if(board[col].length >= ROWS) continue;
      const row = board[col].length;
      if(checkWin(col, row, isAI ? 'ai' : 'player')) terminal = true;
    }
    if(depth === 0 || terminal) return evaluateBoard();

    if(isAI){
      let maxScore = -Infinity;
      for(let col = 0; col < COLS; col++){
        if(board[col].length >= ROWS) continue;
        board[col].push('ai');
        maxScore = Math.max(maxScore, minimax(depth - 1, alpha, beta, false));
        board[col].pop();
        alpha = Math.max(alpha, maxScore);
        if(beta <= alpha) break;
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for(let col = 0; col < COLS; col++){
        if(board[col].length >= ROWS) continue;
        board[col].push('player');
        minScore = Math.min(minScore, minimax(depth - 1, alpha, beta, true));
        board[col].pop();
        beta = Math.min(beta, minScore);
        if(beta <= alpha) break;
      }
      return minScore;
    }
  }

  // Input handling
  function onMouseClick(event){
    if(gameOver || !playerTurn) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycaster.intersectObjects(boardGroup.children);
    if(intersects.length > 0){
      const col = Math.round(intersects[0].object.position.x);
      if(col >= 0 && col < COLS) makePlayerMove(col);
    }
  }

  document.addEventListener('keydown', (e) => {
    if(e.key === 'r' || e.key === 'R') resetGame();
    const col = parseInt(e.key) - 1;
    if(col >= 0 && col < COLS && playerTurn && !gameOver) makePlayerMove(col);
  });
  renderer.domElement.addEventListener('click', onMouseClick);

  function makePlayerMove(col){
    if(!dropPiece(col, 'player')) return;
    const row = board[col].length - 1;
    playerTurn = false;
    if(checkWin(col, row, 'player')){
      gameOver = true;
      document.getElementById('status').innerHTML = '<span class="yellow">You Win!</span>';
      document.getElementById('turn').textContent = 'Game Over';
      return;
    }
    setTimeout(() => {
      const aiCol = aiMove();
      dropPiece(aiCol, 'ai');
      const aiRow = board[aiCol].length - 1;
      if(checkWin(aiCol, aiRow, 'ai')){
        gameOver = true;
        document.getElementById('status').innerHTML = '<span class="red">AI Wins!</span>';
        document.getElementById('turn').textContent = 'Game Over';
      } else {
        playerTurn = true;
        document.getElementById('turn').textContent = 'Your turn';
      }
    }, 600);
  }

  function resetGame(){
    board = Array(COLS).fill(null).map(() => []);
    gameOver = false;
    playerTurn = true;
    lastAICol = -1;
    pieces.forEach(p => scene.remove(p));
    pieces.length = 0;
    document.getElementById('status').innerHTML = 'Player (Blue) vs AI (Red)';
    document.getElementById('turn').textContent = 'Your turn';
    createColumnButtons();
  }

  function createColumnButtons(){
    const container = document.getElementById('columnButtons');
    container.innerHTML = '';
    for(let col = 0; col < COLS; col++){
      const btn = document.createElement('button');
      btn.className = 'colBtn';
      btn.textContent = col + 1;
      btn.dataset.col = col;
      btn.addEventListener('click', () => {
        if(playerTurn && !gameOver) makePlayerMove(col);
      });
      container.appendChild(btn);
    }
  }

  // Animation loop
  function animate(){
    requestAnimationFrame(animate);

    // Update falling pieces
    pieces.forEach(piece => {
      if(piece.userData.falling){
        piece.position.y -= 0.15;
        if(piece.position.y <= piece.userData.targetY){
          piece.position.y = piece.userData.targetY;
          piece.userData.falling = false;
        }
      }
    });

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  resetGame();
  animate();
})();
