import { DIRECTIONS, frameAt, keyFor } from './model.mjs';
// A deliberately small, editable game used both in the lesson and exported packs.
export const DEFAULT_RULES = { fromKeys: false, restartEachTick: false, lockActions: true, attackFrame: 2, potionFrame: 2 };
export const WORLD = { width: 640, height: 300, floor: 246, wall: { x: 466, y: 122, w: 26, h: 124 }, target: { x: 340, y: 246 } };
export function createEngine(project, options = {}) {
  const rules = { ...DEFAULT_RULES, ...options };
  let actor, transitions, events, jumpPhase, phaseTime, actionTime, elapsed, once, actionFacing;
  const getClip = (name, dir = actor.facing) => project.clips[keyFor(name, dir)];
  const duration = name => getClip(name).frames.reduce((sum, f) => sum + f.ms, 0);
  const mapped = (name, number) => Math.min(getClip(name).frames.length - 1, Math.max(0, number));
  function reset() {
    actor = { x: 100, y: project.view === 'top' ? 205 : WORLD.floor, z: 0, vz: 0, vx: 0, vy: 0, facing: DIRECTIONS[project.view][0], state: 'idle', reason: 'Ready to test your character.', stateMs: 0, health: 50, hits: 0, potions: 0, action: null, benefits: 0, attackActive: false, message: 'Move toward the practice target.' };
    transitions = []; events = []; jumpPhase = null; phaseTime = actionTime = elapsed = 0; once = new Set(); actionFacing = actor.facing;
  }
  function log(message) { events.unshift({ timeMs: Math.round(elapsed), message }); events.length = Math.min(events.length, 16); actor.message = message; }
  function state(next, reason) {
    if (actor.state !== next) {
      transitions.unshift({ timeMs: Math.round(elapsed), from: actor.state, to: next, reason }); transitions.length = Math.min(transitions.length, 16);
      actor.state = next; actor.stateMs = 0; actor.reason = reason;
    } else if (rules.restartEachTick) actor.stateMs = 0;
  }
  function request(name) {
    if (name === 'retry') { reset(); return true; }
    if (actor.health <= 0 || actor.action === 'victory') return false;
    if (name === 'hurt') {
      if (jumpPhase === 'prepare') { jumpPhase = null; phaseTime = 0; }
      actor.health = Math.max(0, actor.health - 25); actor.action = actor.health ? 'hurt' : 'gameover'; actionTime = 0; once.clear(); actionFacing = actor.facing;
      state(actor.action, actor.health ? 'Damage interrupts the current action.' : 'Health reached zero. Play defeat once, then offer retry.');
      log(actor.health ? 'Took 25 damage.' : 'Attempt over. Retry when ready.'); return true;
    }
    if (name === 'gameover') { if (jumpPhase === 'prepare') { jumpPhase = null; phaseTime = 0; } actor.health = 0; actor.action = 'gameover'; actionTime = 0; actionFacing = actor.facing; once.clear(); state('gameover', 'The defeat test sets health to zero.'); log('Attempt over. Retry when ready.'); return true; }
    if (actor.action || jumpPhase === 'prepare' || jumpPhase === 'land') return false;
    if (name === 'jump') {
      if (actor.z > 0) return false;
      jumpPhase = 'prepare'; phaseTime = 0; state('jump', 'Ground contact allows a jump. Start with anticipation.'); return true;
    }
    if (name === 'fall') { jumpPhase = null; actor.z = 100; actor.vz = -25; state('fall', 'Stepped off a ledge: height remains, upward speed does not.'); return true; }
    if (!['sword', 'potion', 'victory'].includes(name) || actor.z > 0) return false;
    actor.action = name; actionTime = 0; actionFacing = actor.facing; once.clear();
    if (name === 'potion') actor.potions++;
    state(name, `${name === 'sword' ? 'Attack' : name === 'potion' ? 'Drink' : 'Goal'} event starts a one-shot action.`);
    log(name === 'victory' ? 'Goal reached. Victory holds until Retry.' : `${name === 'sword' ? 'Sword' : 'Potion'} action started.`); return true;
  }
  function pose() {
    let source = actor.state === 'land' ? 'jump' : actor.state, i;
    if (actor.state === 'jump') {
      if (jumpPhase === 'prepare') i = mapped('jump', 0);
      else i = mapped('jump', actor.vz > 100 ? 1 : 2);
    } else if (actor.state === 'fall' && jumpPhase === 'air') { source = 'jump'; i = mapped('jump', 3); }
    else if (actor.state === 'land') i = mapped('jump', phaseTime < getClip('jump').frames[mapped('jump', 4)].ms ? 4 : 5);
    else i = frameAt(actor.action ? { ...getClip(source), loop: false } : getClip(source), actor.action ? actionTime : actor.stateMs);
    const animation = getClip(source), f = animation.frames[i];
    return { source, direction: actor.facing, index: i, pixels: f.pixels, label: f.label, ms: f.ms, clip: keyFor(source, actor.facing) };
  }
  function actionEvents(before, after) {
    if (!actor.action || !['sword', 'potion'].includes(actor.action)) return;
    const name = actor.action, f = mapped(name, name === 'sword' ? rules.attackFrame : rules.potionFrame);
    const start = getClip(name).frames.slice(0, f).reduce((sum, frame) => sum + frame.ms, 0), end = start + getClip(name).frames[f].ms;
    actor.attackActive = name === 'sword' && after >= start && after < end;
    if (name === 'potion' && before <= start && after >= start && !once.has(name)) {
      once.add(name); actor.health = Math.min(100, actor.health + 20); actor.benefits++; log('Potion benefit: health +20 (up to 100), applied once.');
    }
    if (name === 'sword' && before < end && after >= start && !once.has('sword')) {
      const dx = WORLD.target.x - actor.x, dy = (project.view === 'top' ? 205 : WORLD.floor) - actor.y;
      const facingTarget = actor.facing === 'right' ? dx > 0 && Math.abs(dy) < 30 : actor.facing === 'left' ? dx < 0 && Math.abs(dy) < 30 : actor.facing === 'up' ? dy < 0 && Math.abs(dx) < 30 : dy > 0 && Math.abs(dx) < 30;
      if (Math.hypot(dx, dy) <= 65 && facingTarget) { once.add('sword'); actor.hits++; log('Practice target hit once during the active strike.'); }
      else if (!once.has('sword-start')) { once.add('sword-start'); log('Strike active. Move within 65 pixels and face the practice target to hit it.'); }
    }
  }

  function update(dt, input = {}) {
    const ms = Math.max(0, Math.min(dt, .05)) * 1000, seconds = ms / 1000; elapsed += ms;
    if (rules.restartEachTick) { actor.stateMs = 0; if (actor.action) actionTime = 0; }
    else actor.stateMs += ms;
    const locked = actor.action && rules.lockActions || jumpPhase === 'prepare' || jumpPhase === 'land';
    const dx = locked || actor.health <= 0 || actor.action === 'victory' ? 0 : Number(input.right || 0) - Number(input.left || 0);
    const dy = project.view === 'top' && !locked && actor.health > 0 && actor.action !== 'victory' ? Number(input.down || 0) - Number(input.up || 0) : 0;
    const speed = input.run ? 150 : 75, norm = Math.hypot(dx, dy) > 1 ? Math.SQRT1_2 : 1;
    const oldX = actor.x, oldY = actor.y;
    let nextX = Math.max(20, Math.min(620, actor.x + dx * norm * speed * seconds));
    let nextY = project.view === 'top' ? Math.max(72, Math.min(268, actor.y + dy * norm * speed * seconds)) : WORLD.floor;
    const wall = WORLD.wall;
    const atWallHeight = project.view === 'side' ? actor.z < WORLD.floor - wall.y : nextY > wall.y - 5 && nextY < wall.y + wall.h + 5;
    if (atWallHeight && nextX + 10 > wall.x && nextX - 10 < wall.x + wall.w) nextX = oldX <= wall.x ? wall.x - 10 : wall.x + wall.w + 10;
    actor.x = nextX; actor.y = nextY; actor.vx = seconds ? (nextX - oldX) / seconds : 0; actor.vy = seconds ? (nextY - oldY) / seconds : 0;
    if (!actor.action) {
      if (dx) actor.facing = dx > 0 ? 'right' : 'left';
      else if (dy) actor.facing = dy > 0 ? 'down' : 'up';
    } else actor.facing = actionFacing;
    if (jumpPhase === 'prepare') {
      phaseTime += ms;
      if (phaseTime >= getClip('jump').frames[0].ms) { jumpPhase = 'air'; actor.vz = 265; actor.z = .01; phaseTime = 0; }
    }
    if (actor.z > 0 || actor.vz !== 0) {
      actor.vz -= 650 * seconds; actor.z += actor.vz * seconds;
      if (actor.z <= 0) { actor.z = actor.vz = 0; jumpPhase = 'land'; phaseTime = 0; }
    } else if (jumpPhase === 'land') {
      phaseTime += ms;
      const recovery = getClip('jump').frames[mapped('jump', 4)].ms + getClip('jump').frames[mapped('jump', 5)].ms;
      if (phaseTime >= recovery) { jumpPhase = null; phaseTime = 0; }
    }
    if (actor.action) {
      const before = actionTime;
      if (!rules.restartEachTick) actionTime += ms;
      actionEvents(before, actionTime);
      if (actionTime >= duration(actor.action) && !['victory', 'gameover'].includes(actor.action)) { actor.action = null; actionTime = 0; actor.attackActive = false; }
    } else actor.attackActive = false;
    if (actor.action) state(actor.action, 'An action owns the animation until it completes or is interrupted.');
    else if (rules.fromKeys && (dx || dy)) state(input.run ? 'run' : 'walk', 'Deliberate bug: a held movement key chooses the animation.');
    else if (jumpPhase === 'prepare' || actor.z > 0 && actor.vz > 0) state('jump', jumpPhase === 'prepare' ? 'Prepare before takeoff.' : 'Height is above the floor and velocity is upward.');
    else if (actor.z > 0) state('fall', 'Height is above the floor and vertical velocity is downward.');
    else if (jumpPhase === 'land') state('land', 'Ground contact starts the landing and recovery poses.');
    else if (Math.hypot(actor.vx, actor.vy) > 1) state(input.run ? 'run' : 'walk', 'Actual movement speed selects locomotion.');
    else state('idle', 'No movement after collision resolution.');
    return snapshot();
  }
  function snapshot() { return { ...actor, benefitActive: actor.action === 'potion' && once.has('potion'), jumpPhase, phaseMs: phaseTime, actionMs: actionTime, timeMs: elapsed, pose: pose(), transitions: transitions.map(t => ({ ...t })), events: events.map(e => ({ ...e })) }; }
  reset();
  return { update, request, reset, snapshot, rules, project };
}
