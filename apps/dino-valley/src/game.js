import { flatDistance } from './creatures.js';
import { buildCamp, buildCorral, markCache, removeProp } from './world.js';

export const COSTS = {
  camp: { wood: 20 },
  corral: { wood: 10, amber: 5 },
};

/** How much trust one bundle of ferns buys, before temperament is applied. */
const TRUST_PER_FEED = 14;

/**
 * Arm's reach. This is deliberately a fixed radius rather than a function of
 * trust: flight distance shrinks as a triceratops settles, and if feeding
 * used the same number then every point of trust would also shrink the
 * window you can feed through — one at 98/100 would demand you stand inside it.
 */
export const FEED_RANGE = 30;

export function createGame(world) {
  return {
    world,
    wood: 0,
    amber: 0,
    ferns: 0,
    eggs: 0,
    yoke: false,
    reins: false,
    trike: null,
    trikeName: null,
    corralled: false,
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
    case 'log':
      game.wood += prop.userData.yields;
      removeProp(game.world, prop);
      return `Broke up a fallen log. +${prop.userData.yields} wood.`;

    case 'amber':
      game.amber += prop.userData.yields;
      removeProp(game.world, prop);
      return `Pried loose a chunk of amber. +${prop.userData.yields} amber.`;

    case 'fern':
      game.ferns += prop.userData.yields;
      removeProp(game.world, prop);
      return `Gathered ferns. +${prop.userData.yields} ferns.`;

    case 'egg':
      if (prop.userData.collected) return 'You already checked this clutch.';
      prop.userData.collected = true;
      removeProp(game.world, prop);
      game.eggs += 1;
      if (game.eggs === 6) {
        game.ferns += 10;
        return 'Clutch 6 of 6! The full set. Whatever laid them left a stash of ferns behind. +10 ferns.';
      }
      return `You found a fossil clutch. (${game.eggs}/6)`;

    case 'firepit':
      return null; // Handled by the caller, which owns the day/night clock.

    case 'hide':
      if (!game.trike) return 'The corral is ready, but you have no triceratops yet.';
      if (game.corralled) return `${game.trikeName} is already settled in for the night.`;
      game.corralled = true;
      return `You settled ${game.trikeName} into the corral. Safe from the raptors.`;

    default:
      return null;
  }
}

/**
 * Resolve a click on a creature. Every species does something — no animal
 * in the valley is set dressing.
 */
export function interactWithCreature(game, creature, player) {
  const distance = flatDistance(creature.mesh.position, player.position);
  if (distance > 45) return 'Too far away.';

  switch (creature.kind) {
    case 'triceratops':
      return offerFeed(game, creature, player);

    case 'apatosaurus':
      if (creature.browsedOnDay === game.day) return 'This one has already been browsed today.';
      creature.browsedOnDay = game.day;
      game.ferns += 3;
      return 'You gather the ferns it knocked loose while browsing. +3 ferns.';

    case 'parasaurolophus':
      if (creature.calling > 0) return 'It is calling — something dangerous is close by.';
      return 'It eyes you warily and keeps its distance.';

    case 'stegosaurus':
      if (distance < 16) return 'Its plates flare — back off before it swings that tail.';
      return 'It keeps grazing, unbothered as long as you stay clear.';

    case 'velociraptor':
      if (distance > 30) return 'The raptor tracks you from a distance. Get closer to drive it off.';
      creature.scaredFor = 30;
      return 'You shout and stand tall. This one peels off — but the rest of the pack is still out there.';

    case 'trex':
      return 'This one does not listen to shouting. Run.';

    default:
      return null;
  }
}

function offerFeed(game, trike, player) {
  if (trike.tamed) {
    return trike === game.trike
      ? `${game.trikeName} lowers its frill against your shoulder.`
      : 'This one already belongs to someone.';
  }

  if (game.trike) return 'You already have a triceratops. One is plenty.';

  if (game.ferns <= 0) return 'You have no ferns. Gather some, or wait for an apatosaurus to browse.';

  if (trike.spooked > 0) return 'It is too jumpy to eat. Back off and approach at a walk.';

  const distance = flatDistance(trike.mesh.position, player.position);
  if (distance > FEED_RANGE) {
    return 'Still too far for it to take ferns from your hand. Ease closer.';
  }

  game.ferns -= 1;
  // Bolder individuals take longer to bond — the trade-off for letting you near.
  trike.trust = Math.min(100, trike.trust + TRUST_PER_FEED / trike.boldness / 2);

  if (trike.trust >= 100) {
    trike.tamed = true;
    game.trike = trike;
    return `The ${trike.frill}-frilled triceratops lets you rest a hand on its beak. It's yours — give it a name.`;
  }

  return `The ${trike.frill}-frilled triceratops eats from your hand. Trust ${Math.round(trike.trust)}/100.`;
}

/** Dig at the player's feet; a fossil cairn within range pays out. */
export function dig(game, player) {
  const site = game.cairnSites?.find(
    (cairn) => !cairn.looted && flatDistance(cairn.position, player.position) < 18
  );

  if (!site) return 'You scuff at the dirt and find nothing. Look for a cairn of stacked stones.';

  site.looted = true;
  markCache(game.world, site.position);

  switch (site.contents) {
    case 'yoke':
      game.yoke = true;
      return 'Buried under the cairn: a fitted wooden yoke.';
    case 'reins':
      game.reins = true;
      return 'Buried under the cairn: a set of woven reins.';
    case 'amber':
      game.amber += 6;
      return 'A cache of amber. +6 amber.';
    default:
      game.wood += 8;
      return 'A stack of split logs. +8 wood.';
  }
}

// --- Building -------------------------------------------------------------

export function tryBuildCamp(game, position) {
  if (game.world.buildings.camp) return 'You already have a camp.';
  if (!canAfford(game, COSTS.camp)) return 'Not enough wood (20 needed).';
  pay(game, COSTS.camp);
  buildCamp(game.world, position);
  return 'You built a camp. Sit by the firepit to pass the night.';
}

export function tryBuildCorral(game, position) {
  if (game.world.buildings.corral) return 'You already have a corral.';
  if (!canAfford(game, COSTS.corral)) return 'Not enough materials (10 wood, 5 amber).';
  pay(game, COSTS.corral);
  buildCorral(game.world, position);
  return 'You built a corral. A triceratops left in the hide overnight stays safe.';
}

export function nameTrike(game, name) {
  const trimmed = name.trim();
  if (!trimmed) return 'Give it a real name.';
  game.trikeName = trimmed;
  return `You named your triceratops ${trimmed}.`;
}

// --- Day rollover -----------------------------------------------------------

/**
 * Advance to the next day. An uncorralled triceratops loses trust overnight,
 * which is what gives the corral a purpose beyond being a build-cost checkbox.
 */
export function advanceDay(game) {
  game.day += 1;
  const messages = [`Day ${game.day} breaks over the valley.`];

  if (game.trike && !game.corralled) {
    game.trike.trust = Math.max(60, game.trike.trust - 15);
    messages.push(`${game.trikeName ?? 'Your triceratops'} spent the night in the open and is skittish.`);
  }
  game.corralled = false;

  return messages;
}

export function canRide(game) {
  return Boolean(
    game.trike && game.trikeName && game.yoke && game.reins && game.world.buildings.corral
  );
}

export function ride(game) {
  if (!canRide(game)) return null;
  game.won = true;
  return `You yoke up ${game.trikeName} and ride out across the valley. That's the whole game — well done.`;
}

/** The next thing the player should be doing, shown in the HUD. */
export function nextObjective(game) {
  if (game.won) return 'You did it.';
  if (!game.trike) {
    if (game.ferns < 1) return 'Gather ferns (or wait on an apatosaurus) to get ferns';
    return 'Walk — do not run — up to a wild triceratops and offer ferns';
  }
  if (!game.trikeName) return 'Name your triceratops';
  if (!game.yoke) return 'Find the yoke — dig at a cairn of stacked stones';
  if (!game.reins) return 'Find the reins — dig at a cairn of stacked stones';
  if (!game.world.buildings.corral) return 'Build a corral (10 wood, 5 amber)';
  return 'Ride!';
}
