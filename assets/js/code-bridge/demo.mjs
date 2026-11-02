// This import belongs to the exported student project, not this site's modules.
const playerModulePath = './player.js';
export const playerSource = `export const player = { y: 0, velocity: 0, grounded: true };

export function jump() {
  player.velocity = 12;
  player.grounded = false;
}

export function update() {
  player.velocity -= 0.6;
  player.y += player.velocity;
  if (player.y <= 0) {
    player.y = 0;
    player.velocity = 0;
    player.grounded = true;
  }
}
`;

export const fixedPlayerSource = playerSource.replace('  player.velocity = 12;', '  if (!player.grounded) return;\n  player.velocity = 12;');
export const demoFiles = [
  { path: 'player.js', text: playerSource },
  { path: 'main.js', text: `import { player, jump, update } from '${playerModulePath}';
const sprite = document.querySelector('#player');
document.querySelector('#jump').addEventListener('click', jump);
window.addEventListener('keydown', event => {
  if (event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat) jump();
  }
});
let previous = 0, accumulator = 0;
function frame(time) {
  accumulator += Math.min((time - previous) / 1000, 0.1);
  previous = time;
  while (accumulator >= 1 / 60) { update(); accumulator -= 1 / 60; }
  sprite.style.bottom = (player.y + 16) + 'px';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
` },
  { path: 'index.html', text: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Jump bug practice</title>
<style>body{font:18px system-ui;max-width:700px;margin:3rem auto;padding:1rem}#stage{height:360px;position:relative;background:#e8eff8;border-bottom:8px solid #235bb0;overflow:hidden}#player{position:absolute;bottom:16px;left:45%;font-size:40px}button{font:inherit;padding:.7rem;margin:1rem 0}</style></head>
<body><h1>Can you jump in midair?</h1><p>Tap Space or the Jump button. Try jumping again before you land.</p><button id="jump">Jump</button><div id="stage"><span id="player" role="img" aria-label="Robot player">🤖</span></div><p>Open this folder with VS Code Live Server so JavaScript modules load.</p><script type="module" src="main.js"></script></body></html>
` },
];
export const demoTask = {
  brief: 'A tiny browser jumping game. player.js owns movement and grounded state; main.js connects input and drawing. Keep the button, keyboard input, landing, and repeated jumps after landing working.',
  goal: 'Stop the player from jumping again while in midair.',
  behavior: 'Tapping Space or Jump repeatedly lets the player fly upward before landing.',
  test: 'Jump once. Try jumping again before landing: it must not add height. Land and jump again: that must still work. Try both Space and the Jump button.',
};
export const demoAnswer = `The jump function must check whether the player is grounded before changing velocity.

### FILE: player.js
\`\`\`javascript
${fixedPlayerSource}\`\`\`

The new guard returns early when the player is airborne. Run the original and changed versions with Live Server. Try Space and the button in midair, then check that jumping works again after landing. This is a practice answer; you still need to run the tests.
`;
