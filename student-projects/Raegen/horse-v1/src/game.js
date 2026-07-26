import { flatDistance } from './creatures.js';
import { buildHouse, buildStable, markCache, removeProp } from './world.js';

export const COSTS = {
  house: { wood: 20 },
  stable: { wood: 10, quartz: 5 },
};

/** How much trust one handful of feed buys, before temperament is applied. */
const FEED_TRUST = 14;

/**
 * Arm's reach. This is deliberately a fixed radius rather than a function of
 * trust: flight distance shrinks as a horse settles, and if feeding used the
 * same number then every point of trust would also shrink the window you can
 * feed through — a horse at 98/100 would demand you stand inside it.
 */
export const FEED_RANGE = 30;

export function createGame(world) {
  return {
    world,
    wood: 0,
    quartz: 0,
    feed: 0,
    snails: 0,
    saddle: false,
    bridle: false,
    horse: null,
    horseName: null,
    stabled: false,
    day: 1,
    won: false,
  };
}

function canAfford(game, cost) {
  return Object.entries(cost).every(([resource, amount]) => game[resource] >= amount);
}

function pay(game, cost) {
  for (const [resource, amount] of Object.entries(cost)) game[resource] -= amount;
}

// --- Interactions ---------------------------------------------------------

/**
 * Resolve a click on a world prop. Returns a log line, or null if the object
 * is not something the player can act on.
 */
export function interactWithProp(game, object) {
  const prop = object.userData.type ? object : object.parent;
  const type = prop?.userData?.type;

  switch (type) {
    case 'tree':
      game.wood += prop.userData.yields;
      removeProp(game.world, prop);
      return `Chopped a tree. +${prop.userData.yields} wood.`;

    case 'quartz':
      game.quartz += prop.userData.yields;
      removeProp(game.world, prop);
      return `Mined a quartz seam. +${prop.userData.yields} quartz.`;

    case 'hay':
      game.feed += prop.userData.yields;
      removeProp(game.world, prop);
      return `Gathered hay. +${prop.userData.yields} feed.`;

    case 'bed':
      return null; // Handled by the caller, which owns the day/night clock.

    case 'trough':
      if (!game.horse) return 'The trough is ready, but you have no horse yet.';
      if (game.stabled) return `${game.horseName} is already settled in for the night.`;
      game.stabled = true;
      return `You settled ${game.horseName} into the stable. Safe from the komodo.`;

    default:
      return null;
  }
}

/**
 * Resolve a click on a creature. Every species does something — the point of
 * the rework is that no animal in the pack is set dressing.
 */
export function interactWithCreature(game, creature, player) {
  const distance = flatDistance(creature.mesh.position, player.position);
  if (distance > 45) return 'Too far away.';

  switch (creature.kind) {
    case 'horse':
      return offerFeed(game, creature, player);

    case 'cow':
      if (creature.milkedOnDay === game.day) return 'This cow has already been milked today.';
      creature.milkedOnDay = game.day;
      game.feed += 3;
      return 'You milked the cow and mixed a mash. +3 feed.';

    case 'komodo':
      if (distance > 30) return 'The komodo eyes you from a distance. Get closer to drive it off.';
      creature.scaredFor = 35;
      return 'You shouted and waved. The komodo bolts — the herd can settle now.';

    case 'salamander':
      if (creature.revealed) return 'This salamander has already shown you its seam.';
      creature.revealed = true;
      game.quartz += 2;
      return 'The salamander darts off its rock, exposing a quartz seam. +2 quartz.';

    case 'toucan':
      return 'The toucan circles overhead. Whatever it is guarding is on the ground below it.';

    case 'snail':
      if (creature.collected) return 'You already found this one.';
      creature.collected = true;
      creature.mesh.visible = false;
      game.snails += 1;
      if (game.snails === 6) {
        game.feed += 10;
        return 'Snail 6 of 6! The full set. A grateful farmer leaves you 10 feed.';
      }
      return `You pocketed a snail. (${game.snails}/6)`;

    case 'crocodile':
      return 'Absolutely not. Back away from the water.';

    case 'dolphin':
      return 'The dolphin arcs out of the pond and slaps back down.';

    case 'shark':
      return 'A fin cuts a slow circle. The pond is not for swimming.';

    default:
      return null;
  }
}

function offerFeed(game, horse, player) {
  if (horse.tamed) {
    return horse === game.horse
      ? `${game.horseName} nuzzles your shoulder.`
      : 'This one already belongs to someone.';
  }

  if (game.horse) return 'You already have a horse. One is plenty.';

  if (game.feed <= 0) return 'You have no feed. Gather hay, or milk a cow for mash.';

  if (horse.spooked > 0) return 'It is too jumpy to eat. Back off and approach at a walk.';

  const distance = flatDistance(horse.mesh.position, player.position);
  if (distance > FEED_RANGE) {
    return 'Still too far for it to take food from your hand. Ease closer.';
  }

  game.feed -= 1;
  // Bolder horses take longer to bond — the trade-off for letting you near.
  horse.trust = Math.min(100, horse.trust + FEED_TRUST / horse.boldness / 2);

  if (horse.trust >= 100) {
    horse.tamed = true;
    game.horse = horse;
    return `The ${horse.coat} horse lets you take its head. It's yours — give it a name.`;
  }

  return `The ${horse.coat} horse eats from your hand. Trust ${Math.round(horse.trust)}/100.`;
}

/** Dig at the player's feet; a toucan cache within range pays out. */
export function dig(game, player) {
  const cache = game.cacheBirds?.find(
    (bird) => !bird.looted && flatDistance(bird.cache, player.position) < 18
  );

  if (!cache) return 'You scuff at the dirt and find nothing. Look for a circling toucan.';

  cache.looted = true;
  markCache(game.world, cache.cache);

  switch (cache.contents) {
    case 'saddle':
      game.saddle = true;
      return "Buried under the toucan's circle: a saddle, oiled and wrapped.";
    case 'bridle':
      game.bridle = true;
      return "Buried under the toucan's circle: a leather bridle.";
    case 'quartz':
      game.quartz += 6;
      return 'A cache of quartz. +6 quartz.';
    default:
      game.wood += 8;
      return 'A stack of cut timber. +8 wood.';
  }
}

// --- Building -------------------------------------------------------------

export function tryBuildHouse(game, position) {
  if (game.world.buildings.house) return 'You already have a house.';
  if (!canAfford(game, COSTS.house)) return 'Not enough wood (20 needed).';
  pay(game, COSTS.house);
  buildHouse(game.world, position);
  return 'You built a house. Sleep in the bed to pass the night.';
}

export function tryBuildStable(game, position) {
  if (game.world.buildings.stable) return 'You already have a stable.';
  if (!canAfford(game, COSTS.stable)) return 'Not enough materials (10 wood, 5 quartz).';
  pay(game, COSTS.stable);
  buildStable(game.world, position);
  return 'You built a stable. A horse left in the trough overnight stays safe.';
}

export function nameHorse(game, name) {
  const trimmed = name.trim();
  if (!trimmed) return 'Give it a real name.';
  game.horseName = trimmed;
  return `You named your horse ${trimmed}.`;
}

// --- Day rollover ---------------------------------------------------------

/**
 * Advance to the next day. An unstabled horse loses trust overnight, which is
 * what gives the stable a purpose beyond being a build-cost checkbox.
 */
export function advanceDay(game) {
  game.day += 1;
  const messages = [`Day ${game.day} breaks over the field.`];

  if (game.horse && !game.stabled) {
    game.horse.trust = Math.max(60, game.horse.trust - 15);
    messages.push(`${game.horseName ?? 'Your horse'} spent the night out in the open and is skittish.`);
  }
  game.stabled = false;

  return messages;
}

export function canRide(game) {
  return Boolean(
    game.horse && game.horseName && game.saddle && game.bridle && game.world.buildings.stable
  );
}

export function ride(game) {
  if (!canRide(game)) return null;
  game.won = true;
  return `You tack up ${game.horseName} and ride out across the field. That's the whole game — well done.`;
}

/** The next thing the player should be doing, shown in the HUD. */
export function nextObjective(game) {
  if (game.won) return 'You did it.';
  if (!game.horse) {
    if (game.feed < 1) return 'Gather hay (or milk a cow) to get feed';
    return 'Walk — do not run — up to a wild horse and offer feed';
  }
  if (!game.horseName) return 'Name your horse';
  if (!game.saddle) return 'Find the saddle — follow a circling toucan and dig';
  if (!game.bridle) return 'Find the bridle — follow a circling toucan and dig';
  if (!game.world.buildings.stable) return 'Build a stable (10 wood, 5 quartz)';
  return 'Ride!';
}
