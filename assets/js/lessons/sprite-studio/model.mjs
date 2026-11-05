// Browser-local sprite projects. Palette index zero is always transparent.
export const ACTIONS = {
  idle: { title: 'Idle', loop: true, poses: ['Rest', 'Breathe in', 'Rest', 'Blink'], times: [500, 220, 500, 120], tip: 'Keep the feet planted. Move the shoulders one pixel; hold the blink briefly.' },
  walk: { title: 'Walk', loop: true, poses: ['Left contact', 'Passing', 'Right contact', 'Passing'], times: [160, 140, 160, 140], tip: 'Alternate contact and passing poses. Keep the ground line steady so the feet do not skate.' },
  run: { title: 'Run', loop: true, poses: ['Push off', 'Flight', 'Other foot', 'Flight'], times: [100, 80, 100, 80], tip: 'Lean into travel, widen the stride and include a flight pose. Running is more than a faster walk.' },
  jump: { title: 'Jump', loop: false, poses: ['Crouch / prepare', 'Push / rise', 'Apex / tuck', 'Fall / reach', 'Land / squash', 'Recover'], times: [140, 90, 180, 120, 100, 180], tip: 'Crouch before takeoff, tuck at the apex and squash on landing. The game moves the character through the jump arc.' },
  fall: { title: 'Fall', loop: true, poses: ['Look down', 'Reach out', 'Legs dangle', 'Reach out'], times: [200, 180, 180, 180], tip: 'Open the arms and let the legs hang. Falling should read differently from the upward push of a jump.' },
  sword: { title: 'Sword swing', loop: false, poses: ['Ready', 'Wind up', 'Fast slash', 'Follow through', 'Recover'], times: [180, 180, 70, 110, 220], tip: 'Show the wind-up, make the slash quick, then recover. The arc and torso turn sell the swing; only the active slash should deal damage in a game.' },
  potion: { title: 'Magic potion', loop: false, poses: ['Lift bottle', 'Drink', 'Energy rises', 'Open / recover', 'Feeling stronger'], times: [200, 300, 180, 180, 350], tip: 'Lift the bottle, tip it toward the mouth, then open the posture and raise sparkles. Shape and motion communicate recovery even without green.' },
  hurt: { title: 'Hurt', loop: false, poses: ['Impact / recoil', 'Winced eyes', 'Off balance', 'Recover'], times: [100, 180, 140, 260], tip: 'Recoil away from impact and close the eyes. Use a pose change instead of repeated bright flashing.' },
  victory: { title: 'Victory', loop: false, poses: ['Gather energy', 'Arms up', 'Celebrate', 'Proud hold'], times: [150, 180, 180, 600], tip: 'Raise the arms, lift the chest and hold the final pose long enough for the player to read it.' },
  gameover: { title: 'Worried / game over', loop: false, poses: ['Realize / worry', 'Arms spread', 'Small upward pop', 'Drop', 'Fall out'], times: [350, 160, 180, 150, 250], tip: 'Hold the worried face first; spread the arms, pop up, then fall. This sheet contains the poses; a game must move it off-screen and show a retry message.' }
};
export const DIRECTIONS = { side: ['right', 'left'], top: ['down', 'up', 'right', 'left'] };
export const EXPRESSIONS = ['neutral', 'happy', 'worried', 'angry', 'hurt'];
export const PALETTE = ['transparent', '#1a1c2c', '#f4f4f4', '#ffcd75', '#c28569', '#e4572e', '#a53030', '#ffc93c', '#b86f50', '#5d3a29', '#38b764', '#257179', '#73eff7', '#3b5dc9', '#94b0c2', '#566c86'];
export const clone = value => JSON.parse(JSON.stringify(value));
export const keyFor = (action, direction) => `${action}-${direction}`;
export function transform(pixels, size, kind) {
  const out = Array(size * size).fill('0');
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let nx = x, ny = y;
    if (kind === 'flip') nx = size - 1 - x;
    if (kind === 'up') ny--;
    if (kind === 'down') ny++;
    if (kind === 'left') nx--;
    if (kind === 'right') nx++;
    if (nx >= 0 && ny >= 0 && nx < size && ny < size) out[ny * size + nx] = pixels[y * size + x];
  }
  return out.join('');
}
export function flood(pixels, size, x, y, color) {
  const out = pixels.split(''), target = out[y * size + x];
  if (target === color) return pixels;
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= size || cy >= size || out[cy * size + cx] !== target) continue;
    out[cy * size + cx] = color;
    stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
  }
  return out.join('');
}
export function face(pixels, size, expression, direction = 'down') {
  if (direction === 'up') return pixels;
  const out = pixels.split(''), scale = size / 16;
  function dot(x, y, c) {
    if (direction === 'left') x = 15 - x;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) out[(y * scale + dy) * size + x * scale + dx] = c;
  }
  // Face stamp for the supplied demo head. Custom heads may need manual placement.
  for (let y = 4; y <= 7; y++) for (let x = 5; x <= 9; x++) dot(x, y, '3');
  const eyes = direction === 'down' ? [6, 9] : [8, 10];
  eyes.forEach(x => dot(x, 5, expression === 'hurt' ? '3' : '1'));
  if (expression === 'hurt') eyes.forEach(x => { dot(x, 5, '1'); dot(x - 1, 5, '1'); });
  if (expression === 'happy') { dot(7, 7, '1'); dot(8, 7, '1'); dot(6, 6, '1'); dot(9, 6, '1'); }
  if (expression === 'worried') { dot(6, 4, '1'); dot(9, 4, '1'); dot(7, 6, '1'); dot(8, 7, '1'); }
  if (expression === 'angry') { dot(6, 4, '1'); dot(7, 5, '1'); dot(9, 4, '1'); dot(8, 5, '1'); }
  return out.join('');
}
export function demoFrame(action, direction, index, size = 16) {
  const out = Array(256).fill('0');
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < 16 && y < 16) out[y * 16 + x] = c; };
  const rect = (x, y, w, h, c) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, c); };
  const line = (x, y, xx, yy, c) => { const steps = Math.max(Math.abs(xx - x), Math.abs(yy - y)); for (let i = 0; i <= steps; i++) put(Math.round(x + (xx - x) * i / (steps || 1)), Math.round(y + (yy - y) * i / (steps || 1)), c); };
  const back = direction === 'up', front = direction === 'down';
  rect(4, 2, 7, 6, '1'); rect(5, 3, 5, 4, back ? '9' : '3');
  rect(4, 1, 7, 2, 'b'); rect(4, 3, 8, 1, 'b');
  rect(4, 8, 7, 5, '1'); rect(5, 8, 5, 4, 'd'); rect(6, 8, 2, 4, 'c');
  rect(3, 9, 2, 3, '3'); rect(10, 9, 2, 3, '3');
  rect(5, 12, 2, 3, '1'); rect(8, 12, 2, 3, '1'); rect(4, 14, 3, 1, '9'); rect(8, 14, 3, 1, '9');
  if (!back) { put(front ? 6 : 8, 5, '1'); put(front ? 9 : 10, 5, '1'); }
  if (action === 'idle' && index === 3 && !back) { put(front ? 6 : 8, 5, '4'); put(front ? 9 : 10, 5, '4'); }
  if (action === 'idle' && index === 1) rect(5, 8, 5, 1, 'c');
  if (action === 'walk' || action === 'run') {
    rect(3, 12, 9, 4, '0');
    if (index % 2 === 0) {
      line(6, 12, 3, 14, '1'); line(8, 12, 11, 14, '1'); rect(2, 14, 3, 1, '9'); rect(10, 14, 3, 1, '9');
      line(4, 9, 2, 10, '3'); line(10, 9, 12, 8, '3');
    } else { rect(6, 12, 2, action === 'run' ? 1 : 3, '1'); rect(7, 12, 2, 2, '9'); }
    // Alternate leg shading and arm swing, with depth changes in front/back views.
    if (index % 2 === 0) {
      line(6, 12, 3, 14, index === 0 ? 'd' : 'b'); line(8, 12, 11, 14, index === 0 ? 'b' : 'd');
      if (index === 2) { line(4, 9, 2, 8, '3'); line(10, 9, 12, 10, '3'); }
    }
    if (front || back) {
      rect(2, 12, 12, 4, '0');
      const leftY = index === 0 ? 15 : index === 2 ? 13 : 14, rightY = index === 2 ? 15 : index === 0 ? 13 : 14;
      line(5, 12, 5, leftY, 'd'); line(9, 12, 9, rightY, 'b'); put(5, leftY, '9'); put(9, rightY, '9');
    }
  }
  if (action === 'jump') {
    if (index === 0 || index === 4) { rect(4, 12, 7, 3, '0'); rect(3, 12, 9, 1, 'd'); rect(3, 13, 3, 1, '9'); rect(9, 13, 3, 1, '9'); }
    if (index === 1 || index === 2) { rect(4, 12, 7, 4, '0'); rect(4, 12, 3, 2, '9'); rect(9, 12, 3, 2, '9'); line(3, 9, 2, 6, '3'); line(11, 9, 12, 6, '3'); }
    if (index === 3) { line(3, 9, 1, 7, '3'); line(11, 9, 13, 7, '3'); }
  }
  if (action === 'fall' || action === 'gameover') {
    line(4, 9, 1, 7 + index % 2, '3'); line(10, 9, 13, 7 + index % 2, '3');
    if (index > 1) { rect(4, 12, 7, 4, '0'); line(5, 12, 4, 15, '1'); line(9, 12, 10, 15, '1'); }
  }
  if (action === 'sword') {
    if (front || back) {
      const up = back, hiltY = up ? 5 : 11;
      if (index < 2) { line(10, 9, 11, hiltY, '3'); line(11, hiltY, index ? 13 : 11, up ? 0 : 15, 'e'); put(11, hiltY, '7'); }
      if (index === 2) { line(8, hiltY, 8, up ? 0 : 15, '2'); line(4, up ? 3 : 13, 7, up ? 0 : 15, 'c'); line(7, up ? 0 : 15, 12, up ? 3 : 13, 'c'); put(8, hiltY, '7'); }
      if (index === 3) line(6, hiltY, 3, up ? 1 : 15, 'e');
      if (index === 4) line(11, 11, 12, 14, 'e');
    } else {
    if (index < 2) { line(11, 10, 12, 9, '3'); line(12, 9, index ? 10 : 13, index ? 3 : 5, 'e'); put(12, 9, '7'); }
    if (index === 2) { line(10, 9, 15, 8, '2'); line(11, 5, 14, 6, 'c'); line(14, 6, 15, 9, 'c'); put(11, 9, '7'); }
    if (index === 3) { line(11, 10, 14, 13, 'e'); put(11, 10, '7'); }
    if (index === 4) line(11, 11, 12, 14, 'e');
    }
  }
  if (action === 'potion') {
    if (index < 2) { const y = index ? 5 : 8; rect(11, y, 3, 3, 'c'); rect(12, y - 1, 1, 1, '9'); rect(12, y + 1, 1, 1, 'a'); line(10, 10, 11, y + 1, '3'); }
    else { line(3, 9, 2, 6, '3'); line(11, 9, 12, 6, '3'); [[2, 4], [13, 3], [1, 11]].forEach(([x, y]) => { put(x, y - index % 2, '7'); put(x + 1, y - index % 2, '2'); }); }
  }
  if (action === 'hurt' && index < 3) { if (index === 0) { rect(2, 8, 2, 1, '7'); rect(1, 7, 1, 1, '7'); } line(3, 9, 5, 10, '3'); if (index === 2) line(10, 10, 12, 12, '3'); }
  if (action === 'victory' && index > 0) { rect(3, 10, 2, 2, '0'); rect(10, 10, 2, 2, '0'); line(4, 9, 2, 5, '3'); line(10, 9, 12, 5, '3'); put(1, 3 + index % 2, '7'); put(13, 2 + index % 2, '7'); }
  let pixels = out.join('');
  if (action === 'gameover' && !back) pixels = face(pixels, 16, 'worried', front ? 'down' : 'right');
  if (action === 'potion' && index < 2 && !back) pixels = face(pixels, 16, 'worried', front ? 'down' : 'right');
  if (action === 'hurt' && index < 3 && !back) pixels = face(pixels, 16, 'hurt', front ? 'down' : 'right');
  if ((action === 'victory' || (action === 'potion' && index > 1)) && !back) pixels = face(pixels, 16, 'happy', front ? 'down' : 'right');
  if (action === 'potion' && index < 2) pixels = transform(pixels, 16, 'down');
  if ((action === 'walk' || action === 'run') && index % 2 === 1) {
    const bobbed = transform(pixels, 16, 'up');
    pixels = bobbed.slice(0, 11 * 16) + pixels.slice(11 * 16);
  }
  if (action === 'hurt' && index === 0) pixels = transform(pixels, 16, 'left');
  if (action === 'jump' && (index === 0 || index === 4)) pixels = transform(pixels, 16, 'down');
  if (action === 'run') {
    const lean = transform(pixels, 16, 'right');
    pixels = lean.slice(0, 9 * 16) + pixels.slice(9 * 16);
  }
  if (direction === 'left') pixels = transform(pixels, 16, 'flip');
  if (size === 16) return pixels;
  return Array.from({ length: size * size }, (_, i) => pixels[Math.floor(i / size / 2) * 16 + Math.floor(i % size / 2)]).join('');
}
export function demoClip(action, direction, size) {
  const spec = ACTIONS[action];
  return { loop: spec.loop, frames: spec.poses.map((label, i) => ({ pixels: demoFrame(action, direction, i, size), ms: spec.times[i], label })) };
}
export function createProject(view = 'side', size = 16, blank = false) {
  const clips = {};
  for (const action of Object.keys(ACTIONS)) for (const direction of DIRECTIONS[view]) clips[keyFor(action, direction)] = blank ? { loop: ACTIONS[action].loop, frames: [{ pixels: '0'.repeat(size * size), ms: 150, label: 'My first pose' }] } : demoClip(action, direction, size);
  return { format: 'classroomos-sprite-studio', version: 1, name: 'My pixel adventurer', description: blank ? '' : 'A small explorer with a teal cap and blue coat.', size, view, palette: [...PALETTE], clips };
}
export function validateProject(raw) {
  const fail = () => { throw new Error('Choose a Sprite Studio project JSON with valid clips, colours and frame timing.'); };
  if (!raw || raw.format !== 'classroomos-sprite-studio' || raw.version !== 1 || ![16, 32].includes(raw.size) || !Object.hasOwn(DIRECTIONS, raw.view)) fail();
  if (typeof raw.name !== 'string' || raw.name.length > 100 || typeof raw.description !== 'string' || raw.description.length > 600) fail();
  if (!Array.isArray(raw.palette) || raw.palette.length !== 16 || raw.palette[0] !== 'transparent' || raw.palette.slice(1).some(c => typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c))) fail();
  const clips = {};
  for (const action of Object.keys(ACTIONS)) for (const dir of DIRECTIONS[raw.view]) {
    const key = keyFor(action, dir), clip = raw.clips?.[key];
    if (!clip || typeof clip.loop !== 'boolean' || !Array.isArray(clip.frames) || clip.frames.length < 1 || clip.frames.length > 24) fail();
    clips[key] = { loop: clip.loop, frames: clip.frames.map(f => {
      if (!f || typeof f.pixels !== 'string' || f.pixels.length !== raw.size ** 2 || !/^[0-9a-f]+$/.test(f.pixels) || !Number.isInteger(f.ms) || f.ms < 50 || f.ms > 2000 || typeof f.label !== 'string' || f.label.length > 100) fail();
      return { pixels: f.pixels, ms: f.ms, label: f.label };
    }) };
  }
  return { format: raw.format, version: 1, name: raw.name, description: raw.description, size: raw.size, view: raw.view, palette: [...raw.palette], clips };
}
export function frameAt(clip, elapsed) {
  const total = clip.frames.reduce((sum, f) => sum + f.ms, 0);
  let time = clip.loop ? elapsed % total : Math.min(elapsed, total - 1);
  for (let i = 0; i < clip.frames.length; i++) { if (time < clip.frames[i].ms) return i; time -= clip.frames[i].ms; }
  return 0;
}
export function clipMetadata(project, action, direction) {
  const clip = project.clips[keyFor(action, direction)];
  return { name: project.name, description: project.description, action, direction, view: project.view, image: `${keyFor(action, direction)}.png`, frameWidth: project.size, frameHeight: project.size, loop: clip.loop, frames: clip.frames.map((f, i) => ({ x: i * project.size, y: 0, width: project.size, height: project.size, durationMs: f.ms, description: f.label })) };
}
