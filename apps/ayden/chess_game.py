#!/usr/bin/env python3
"""
Python Chess Game vs AI
- Play as White (human)
- AI is Black (minimax with alpha-beta pruning)
"""

import chess
import random
from typing import Tuple

class ChessAI:
    def __init__(self, depth: int = 2):
        self.depth = depth
        self.piece_values = {
            chess.PAWN: 100,
            chess.KNIGHT: 320,
            chess.BISHOP: 330,
            chess.ROOK: 500,
            chess.QUEEN: 900,
            chess.KING: 20000
        }

    def evaluate_board(self, board: chess.Board) -> int:
        """Simple material evaluation."""
        score = 0
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece:
                value = self.piece_values.get(piece.piece_type, 0)
                score += value if piece.color == chess.WHITE else -value
        
        # bonus for being ahead in material
        if board.is_check():
            score += 50 if board.turn == chess.BLACK else -50
        
        return score

    def minimax(self, board: chess.Board, depth: int, is_white: bool, 
                alpha: int, beta: int) -> int:
        """Minimax with alpha-beta pruning."""
        if depth == 0 or board.is_game_over():
            return self.evaluate_board(board)

        moves = list(board.legal_moves)
        if not moves:
            return self.evaluate_board(board)

        if is_white:
            max_eval = float('-inf')
            for move in moves:
                board.push(move)
                eval_score = self.minimax(board, depth - 1, False, alpha, beta)
                board.pop()
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in moves:
                board.push(move)
                eval_score = self.minimax(board, depth - 1, True, alpha, beta)
                board.pop()
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval

    def get_best_move(self, board: chess.Board) -> chess.Move:
        """Find best move using minimax."""
        best_move = None
        best_score = float('inf')
        
        for move in board.legal_moves:
            board.push(move)
            score = self.minimax(board, self.depth - 1, True, float('-inf'), float('inf'))
            board.pop()
            
            if score < best_score:
                best_score = score
                best_move = move
        
        return best_move or random.choice(list(board.legal_moves))


def play_chess():
    """Main game loop."""
    print("=" * 60)
    print("Welcome to Python Chess!")
    print("=" * 60)
    print("You are White (uppercase pieces)")
    print("AI is Black (lowercase pieces)")
    print("Enter moves in UCI format (e.g., e2e4)")
    print("Type 'quit' to exit.\n")
    
    board = chess.Board()
    ai = ChessAI(depth=2)
    move_count = 0
    
    print(board)
    print()
    
    while not board.is_game_over():
        move_count += 1
        
        if board.turn == chess.WHITE:
            # Human turn
            while True:
                try:
                    move_str = input("Your move: ").strip()
                    if move_str.lower() == 'quit':
                        print("Thanks for playing!")
                        return
                    move = chess.Move.from_uci(move_str)
                    if move in board.legal_moves:
                        board.push(move)
                        break
                    else:
                        print("❌ Illegal move. Try again.")
                except ValueError:
                    print("❌ Invalid format. Use UCI (e.g., e2e4)")
        else:
            # AI turn
            print("AI is thinking...", end=" ", flush=True)
            ai_move = ai.get_best_move(board)
            board.push(ai_move)
            print(f"AI played: {ai_move}")
        
        print(board)
        print()
        
        if board.is_check():
            print("⚠️  Check!")
        if board.is_checkmate():
            print("♟️  Checkmate!")
        if board.is_stalemate():
            print("♟️  Stalemate!")
    
    # Game over
    print("=" * 60)
    print("Game Over!")
    print(f"Result: {board.result()}")
    outcome = board.outcome()
    if outcome:
        if outcome.winner == chess.WHITE:
            print("🎉 You won!")
        elif outcome.winner == chess.BLACK:
            print("🤖 AI won!")
        else:
            print("🤝 Draw!")
    print("=" * 60)


if __name__ == "__main__":
    play_chess()
