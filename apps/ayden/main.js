// main.js - simple chess UI + minimax AI using chess.js and chessboard.js
(function(){
  const boardEl = document.getElementById('board');
  if(!boardEl || typeof Chess === 'undefined' || typeof Chessboard === 'undefined') return;

  const game = new Chess();
  let board = null;
  let aiThinking = false;
  let aiColor = 'b';

  const config = {
    draggable: true,
    position: 'start',
    onDrop: onDrop,
    pieceTheme: 'https://unpkg.com/chessboardjs@1.0.0/www/img/chesspieces/wikipedia/{piece}.png'
  };

  board = Chessboard('board', config);

  const newBtn = document.getElementById('newBtn');
  const undoBtn = document.getElementById('undoBtn');
  const statusEl = document.getElementById('status');
  const depthRange = document.getElementById('depth');
  const balls = document.getElementById('depthVal');

  depthRange.addEventListener('input', ()=>{depthVal.textContent = depthRange.value});

  newBtn.addEventListener('click', newGame);
  undoBtn.addEventListener('click', undoMove);

  function newGame(){
    game.reset();
    board.start();
    updateStatus();
  }

  function undoMove(){
    if(aiThinking) return;
    game.undo(); // undo player's move
    game.undo(); // undo AI move
    board.position(game.fen());
    updateStatus();
  }balls

  function onDrop(source, target, piece, newPos, oldPos, orientation){
    if(aiThinking) return 'snapback';
    const move = game.move({from: source, to: target, promotion: 'q'});
    if(move === null) return 'snapback';
    board.position(game.fen());
    updateStatus();
    // ai move after short delay
    window.setTimeout(() => {
      makeAIMove();
    }, 200);
  }

  function makeAIMove(){
    if(game.game_over()) return;
    aiThinking = true;
    const depth = parseInt(depthRange.value, 10);
    // run minimax (synchronous but short depths)
    const best = minimaxRoot(depth, aiColor === 'w' ? true : false);
    if(best && best.move){
      game.move(best.move);
      board.position(game.fen());
    }
    aiThinking = false;
    updateStatus();
  }

  function updateStatus(){
    let status = '';
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    if(game.in_checkmate()){
      status = turn + ' is checkmated. Game over.';
    } else if(game.in_draw()){
      status = 'Drawn position.';
    } else {
      status = `${turn} to move` + (game.in_check() ? ' — check' : '');
    }
    statusEl.textContent = status;
  }

  // evaluation: simple material count
  const pieceValue = {p:100, n:320, b:330, r:500, q:900, k:20000};
  function evaluateBoard(gameInstance){
    const board = gameInstance.board();
    let total = 0;
    for(let i=0;i<8;i++){
      for(let j=0;j<8;j++){
        const piece = board[i][j];
        if(piece){
          const val = pieceValue[piece.type] || 0;
          total += (piece.color === 'w') ? val : -val;
        }
      }
    }
    return total;
  }

  // minimax root: returns best move for current side
  function minimaxRoot(depth, isWhite){
    const moves = game.moves({verbose:true});
    let bestMove = null;
    let bestScore = isWhite ? -Infinity : Infinity;
    for(const m of moves){
      game.move(m);
      const score = minimax(depth-1, !isWhite, -Infinity, Infinity);
      game.undo();
      if(isWhite){
        if(score > bestScore){ bestScore = score; bestMove = m; }
      } else {
        if(score < bestScore){ bestScore = score; bestMove = m; }
      }
    }
    return {move: bestMove, score: bestScore};
  }

  function minimax(depth, isWhite, alpha, beta){
    if(depth === 0) return evaluateBoard(game);
    const moves = game.moves({verbose:true});
    if(isWhite){
      let maxEval = -Infinity;
      for(const m of moves){
        game.move(m);
        const evalScore = minimax(depth-1, false, alpha, beta);
        game.undo();
        if(evalScore > maxEval) maxEval = evalScore;
        if(evalScore > alpha) alpha = evalScore;
        if(beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for(const m of moves){
        game.move(m);
        const evalScore = minimax(depth-1, true, alpha, beta);
        game.undo();
        if(evalScore < minEval) minEval = evalScore;
        if(evalScore < beta) beta = evalScore;
        if(beta <= alpha) break;
      }
      return minEval;
    }
  }

  // start
  newGame();

})();
