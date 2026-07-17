# Chess Games

## Web-Based Chess (JavaScript)

Play chess in your browser with a simple minimax AI.

Files:
- `chess.html` — main page (uses CDN: chess.js + chessboard.js)
- `chess.css` — styles
- `main.js` — UI glue and AI (minimax + alpha-beta)

Run:
```bash
python3 -m http.server 8000
# open http://localhost:8000/chess.html
```

## Python Chess Game

Play chess in the terminal against a minimax AI with alpha-beta pruning.

Files:
- `chess_game.py` — full game script (human vs AI)
- `chess_requirements.txt` — dependencies

Setup & run:
```bash
pip install -r chess_requirements.txt
python3 chess_game.py
```

Move format: UCI (e.g., `e2e4` moves pawn from e2 to e4)

Notes:
- Both versions use material-based evaluation + minimax
- Python version has adjustable AI depth (default: 2)
- Web version has a slider to control depth
