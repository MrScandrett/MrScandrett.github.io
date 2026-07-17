// tictactoe.js - human vs AI (minimax)
(function(){
  const humanDefault = 'X';
  let human = humanDefault;
  let ai = human === 'X' ? 'O' : 'X';

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const restartBtn = document.getElementById('restart');
  const swapBtn = document.getElementById('swap');

  let board = Array(9).fill(null);
  let turn = 'X'; // X always goes first
  let gameOver = false;

  function render(){
    for(const cell of boardEl.children){
      const i = +cell.dataset.i;
      cell.textContent = board[i] || '';
    }
    if(gameOver) return;
    if(turn === human) statusEl.textContent = 'Your turn — you are ' + human;
    else statusEl.textContent = "AI's turn — thinking...";
  }

  function checkWinner(b){
    const wins = [ [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6] ];
    for(const [a,b1,c] of wins){
      if(b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    }
    if(b.every(Boolean)) return 'tie';
    return null;
  }

  function availableMoves(b){ return b.map((v,i)=>v?null:i).filter(x=>x!==null); }

  function makeMove(i, p){ if(!board[i] && !gameOver){ board[i] = p; turn = p==='X' ? 'O' : 'X'; }}

  function aiMove(){
    const best = minimax(board, ai);
    if(best.index !== undefined){ makeMove(best.index, ai); }
  }

  function minimax(newBoard, player){
    const winner = checkWinner(newBoard);
    if(winner === human) return {score: -10};
    if(winner === ai) return {score: 10};
    if(winner === 'tie') return {score: 0};

    const moves = [];
    for(const i of availableMoves(newBoard)){
      const move = {};
      move.index = i;
      newBoard[i] = player;
      if(player === ai){
        const result = minimax(newBoard, human);
        move.score = result.score;
      } else {
        const result = minimax(newBoard, ai);
        move.score = result.score;
      }
      newBoard[i] = null;
      moves.push(move);
    }

    let bestMove;
    if(player === ai){
      let bestScore = -Infinity; for(const m of moves) if(m.score > bestScore){ bestScore = m.score; bestMove = m; }
    } else {
      let bestScore = Infinity; for(const m of moves) if(m.score < bestScore){ bestScore = m.score; bestMove = m; }
    }
    return bestMove;
  }

  function step(){
    if(gameOver) return;
    const winner = checkWinner(board);
    if(winner){
      gameOver = true;
      if(winner === 'tie') statusEl.textContent = "It's a tie.";
      else statusEl.textContent = (winner === human ? 'You win!' : 'AI wins');
      return;
    }
    if(turn === ai){
      // small delay for UX
      setTimeout(()=>{ aiMove(); render(); step(); }, 250);
    }
  }

  boardEl.addEventListener('click', (e)=>{
    if(gameOver) return;
    const cell = e.target.closest('.cell');
    if(!cell) return;
    const i = +cell.dataset.i;
    if(board[i]) return;
    if(turn !== human) return;
    makeMove(i, human);
    render();
    step();
  });

  restartBtn.addEventListener('click', ()=>{
    board = Array(9).fill(null); turn = 'X'; gameOver = false; render(); step();
  });

  swapBtn.addEventListener('click', ()=>{
    // swap which symbol the human uses
    human = human === 'X' ? 'O' : 'X';
    ai = human === 'X' ? 'O' : 'X';
    swapBtn.textContent = "Swap: You = " + human;
    // restart
    board = Array(9).fill(null); turn = 'X'; gameOver = false; render(); step();
  });

  // init
  render();
  // if AI goes first
  if(turn !== human) step();

})();
