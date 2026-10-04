# Pixel Courier challenges

Pick one. Make it work. Playtest it. Then pick another.

## Easy
- **New feel.** Change three tuning constants to make an "ice level". Write down the jump height (`JUMP_VEL² ÷ (2 × GRAVITY)`).
- **More parcels.** Add `P` tiles to `level` in `art.js`. The HUD and mailbox count them automatically.
- **Faster run cycle.** Change `fps` of the `run` animation in `art.js` and compare.

## Medium
- **Double jump.** Allow one extra jump in the air; reset it when `onFloor` becomes true. Add a new state and animation for it.
- **Moving platform.** Add an object that moves left and right. If the player is standing on it, move the player by the same amount.
- **Second level.** Add `level2` to `art.js`. When the player wins, load it instead of the title.

## Hard
- **Patrolling enemy.** Give it two states (patrol, chase), an AABB, and make touching it call `die()`.
- **Autotiling.** Draw 16 ground variants and pick one with the 4-bit bitmask from lesson 03.
- **Save checkpoints.** Store the last checkpoint in `localStorage` so a refresh continues where you left off.
