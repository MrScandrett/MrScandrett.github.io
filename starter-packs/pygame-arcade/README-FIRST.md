# Pygame Arcade Starter: Catch Circuit

This pack turns the game loop lesson into a complete local Python project. The
starter is intentionally playable before you edit it, because the best first
debugging question is: "What changed after my edit?"

## Setup

1. Install Python 3.10 or newer.
2. Open this folder in a terminal.
3. Create an optional virtual environment:
   - Windows: `python -m venv .venv` then `.venv\Scripts\activate`
   - macOS/Linux: `python3 -m venv .venv` then `source .venv/bin/activate`
4. Install the dependency: `python -m pip install -r requirements.txt`
5. Run the game: `python main.py`

## First 10-minute success

Move with A/D or the arrow keys and catch ten falling sparks. Then find
`PLAYER_SPEED` in `main.py`, change it, save, and restart the game.

## Tutorial route

1. Read the `SETUP` section and identify the screen, clock, and font.
2. Read `INPUT`, then add J/L as alternate controls.
3. Read `UPDATE` and explain why every speed is multiplied by `dt`.
4. Read `COLLISION` and sketch the two rectangles.
5. Read `RENDER` and temporarily remove the background fill to observe trails.
6. Complete one challenge from each level in `challenges.md`.

## File map

- `main.py`: runnable, heavily commented starter game.
- `requirements.txt`: exact external package requirement.
- `challenges.md`: progressively more independent extensions.
- `troubleshooting.md`: common setup and code problems.
- `finished-example/finished_game.py`: reference with lives and increasing difficulty.
- `credits.txt`: attribution and a place to log added assets.
