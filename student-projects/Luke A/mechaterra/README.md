# Mechaterra

A real-time team deathmatch prototype where mecha units fight across destructible, depth-extruded 3D-style terrain using Matter.js physics. Physics substeps and a permanent world catch-floor keep mechs from tunnelling through the bottom of the map.

## Run

Open `index.html` in a browser, or run a local static server:

```powershell
npm install
npm run dev
```

Then visit `http://localhost:5173`.

## Controls

- `A` / `D` or arrow keys: move
- `W` or space: jump
- `Shift`: fire jetpack and glide
- Mouse: aim
- Hold left mouse: fire selected power
- `1`: Grav Well projectile
- `2`: Excavator terrain blast
- `3`: Bulwark terrain raise
- Mouse wheel: cycle powers
- Click the power cards or use `1` / `2` / `3`: select a power
- `P` or the pause button: pause / resume

## Match Rules

- Two teams, four mechs per side.
- You begin as Team Alpha's lead mech; control transfers to the next surviving ally when your mech is destroyed.
- Team colors and AI difficulty are selected before each match.
- Maps generate as solid destructible terrain without tunnels or chambers.
- Each round ends when a team reaches the score target, eliminates the other side, or time expires.
- The match is best of three rounds.

## Polish Pass

- Cached terrain collision data keeps destructible-terrain physics responsive.
- Real-time round timing remains accurate when rendering slows down.
- Combat feedback includes a custom reticle, camera shake, damage vignette, announcements, and a selectable power dock.
- The setup screen and HUD adapt to desktop and mobile viewports and honor reduced-motion preferences.

## Art Assets

- `assets/mecha-spritesheet.png`: 4 by 2 mecha robot spritesheet used for player and NPC rendering.
- `assets/mecha-animation-atlas.png`: 7 by 5 action atlas for idle, running, firing, jetpacking, and running while firing.
