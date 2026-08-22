# Pygame troubleshooting

## `No module named pygame`

Run `python -m pip install -r requirements.txt` from this folder. Use the same
`python` command for installation and running so the package goes to the correct interpreter.

## The window says "not responding"

The event queue must be drained every frame. Confirm that the
`for event in pygame.event.get()` loop remains inside the main loop.

## Objects move at different speeds on different computers

Keep speeds in pixels per second and multiply by `dt`. Do not move a fixed number
of pixels per frame.

## The game closes immediately

Run it from a terminal instead of double-clicking so the error remains visible.
Read the final traceback line, then inspect the filename and line number above it.

## Changes do not appear

Save `main.py`, close the old game window, and run the file from this exact folder.
