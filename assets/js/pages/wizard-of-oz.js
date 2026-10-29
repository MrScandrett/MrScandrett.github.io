(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  /* ═══════════════════════════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════════════════════════ */
  const state = {
    view: 'spectacles-view',
    // Green Spectacles
    spectaclesLocked: true,
    lensOpacity: 0.85,
    filterColor: 'green',
    activeHotspot: 'all',
    // The Screen & Humbug
    screenFallen: false,
    illusion: 'head',
    screenAnim: 0, // 0 = standing, 1 = fallen
    // Denslow Color Geography
    activeRegion: 'emerald',
    // Quiz
    quizIndex: 0,
    quizScore: 0,
    quizLocked: false,
    // Track / Grade Discussion
    track: '68'
  };

  /* ═══════════════════════════════════════════════════════════════
     COLOR PALETTES & FILTER TOKENS
     ═══════════════════════════════════════════════════════════════ */
  const FILTERS = {
    green: { name: 'Emerald City Green', hex: '#10b981', r: 16, g: 185, b: 129, desc: 'The locked glasses given by the Guardian of the Gate. Makes plain stone appear as dazzling emerald.' },
    yellow: { name: 'Winkie Country Yellow', hex: '#f59e0b', r: 245, g: 158, b: 11, desc: 'The golden yellow of the West, where the Winkies live and where the Yellow Brick Road travels.' },
    blue: { name: 'Munchkin Country Blue', hex: '#38bdf8', r: 56, g: 189, b: 248, desc: 'The rich cornflower blue of the East, where Dorothy first arrived and where all houses are blue.' },
    red: { name: 'Quadling Country Red', hex: '#f43f5e', r: 244, g: 63, b: 94, desc: 'The deep ruby red of the South, ruled by Glinda the Good.' },
    clear: { name: 'Bare Eyes (Plain Reality)', hex: '#94a3b8', r: 148, g: 163, b: 184, desc: 'The unvarnished world without colored lenses: Kansas gray, plain limestone, and normal daylight.' }
  };

  const HOTSPOTS = {
    all: {
      title: 'Emerald City Overview',
      coords: null,
      spectacles: 'A breathtaking metropolis built of solid emerald crystal, where even the sky and cobblestones radiate vibrant green.',
      reality: 'An ordinary stone city of gray granite, pale limestone, and standard window glass. The only green is the tint on your own eyes.',
      quote: '“No more green than in any other city; but when you wear green spectacles, why of course everything you see looks green to you.” (Chapter XVI)'
    },
    towers: {
      title: 'The Great Palace & Spire',
      coords: { x: 0.5, y: 0.32 },
      spectacles: 'Towers of pure luminous emerald rising into the clouds, glowing with magical sovereignty.',
      reality: 'Sturdy masonry blocks of gray sandstone and white plaster, built by the people of Oz under the Wizard’s architectural orders.',
      quote: '“I ordered them to build this City, and my Palace; and they did it all willingly and well.” (Chapter XVI)'
    },
    gems: {
      title: 'Pavement Gems & Jewels',
      coords: { x: 0.65, y: 0.78 },
      spectacles: 'Thousands of priceless uncut emeralds set between the polished green marble slabs of the avenue.',
      reality: 'Common bottle glass beads and river pebbles pressed into white lime mortar. Under daylight, they are simply ordinary glass.',
      quote: '“Where the blocks were joined together were rows of emeralds, set closely, and glittering in the brightness of the sun.” (Chapter XI)'
    },
    lemonade: {
      title: 'Green Lemonade & Sweets Cart',
      coords: { x: 0.22, y: 0.75 },
      spectacles: 'Enchanted emerald nectar and candied emerald popcorn, purchased by children with green pennies.',
      reality: 'Standard sweet lemon water and buttered corn sold from an ordinary wooden pushcart. The pennies are common copper coins viewed through green glass.',
      quote: '“In one place a man was selling green lemonade, and when the children bought it Dorothy could see that they paid for it with green pennies.” (Chapter XI)'
    },
    citizens: {
      title: 'Citizens & Green Clothing',
      coords: { x: 0.78, y: 0.72 },
      spectacles: 'An otherworldly populace with green-tinted skin, emerald frock coats, and ribbons of lustrous jade.',
      reality: 'Ordinary men, women, and children wearing standard wool and linen clothes. Generations of wearing locked glasses have convinced them they are green.',
      quote: '“My people have worn green glasses on their eyes so long that most of them think it really is an Emerald City.” (Chapter XVI)'
    },
    lock: {
      title: 'The Guardian’s Lock & Key',
      coords: { x: 0.12, y: 0.22 },
      spectacles: 'A necessary safety precaution to prevent the terrifying brilliance of the city from blinding innocent eyes.',
      reality: 'An instrument of state deception. The spectacles are padlocked around visitors’ heads so they cannot inspect the city with bare eyes.',
      quote: '“They are all locked on, for Oz so ordered it when the City was first built, and I have the only key that will unlock them.” (Chapter X)'
    }
  };

  const ILLUSIONS = {
    head: {
      name: 'The Giant Head (Dorothy)',
      desc: 'A colossal bald head with no body, resting on the green throne with moving eyes and mouth.',
      trick: 'Constructed of papier-mâché and painted skillfully. Suspended from the ceiling on a copper wire, with strings to move its jaw while Oz spoke through a tube behind the screen.',
      quote: '“I thought Oz was a great Head,” said Dorothy. “That was one of my tricks,” said the little man.'
    },
    lady: {
      name: 'The Lovely Lady (Scarecrow)',
      desc: 'The most beautiful woman in the world, dressed in green silk gauze with a jewel crown.',
      trick: 'A wooden dressmaker’s dummy draped with fine fabric, fitted with a painted plaster mask and a wig.',
      quote: '“And I thought Oz was a lovely Lady,” said the Scarecrow. “So I was, to you,” replied Oz, “and I was dressed up for the occasion.”'
    },
    beast: {
      name: 'The Terrible Beast (Tin Woodman)',
      desc: 'A frightening monster as big as an elephant, with five eyes, five arms, and five legs, roaring like thunder.',
      trick: 'A costume made of animal skins sewn together and stuffed with straw, propped up with wooden sticks and operated from a hidden tether.',
      quote: '“And I thought Oz was a terrible Beast,” said the Tin Woodman. “That was another trick,” answered the Wizard.'
    },
    fire: {
      name: 'The Ball of Fire (Cowardly Lion)',
      desc: 'A blinding orb of glowing flame floating above the throne, so hot the Lion dared not approach.',
      trick: 'A cotton ball soaked in oil, ignited and suspended from the vaulted ceiling on an iron wire, shielded behind a metal reflector.',
      quote: '“And I thought Oz was a Ball of Fire,” exclaimed the Lion. “You were not wrong,” said Oz, “for it was indeed a ball of fire; but I put it there to frighten you.”'
    }
  };

  const REGIONS = {
    emerald: {
      name: 'Emerald City (Center)',
      color: '#10b981',
      ink: 'Green Ink (Denslow 1900)',
      chapters: 'Chapters X–XVI',
      symbol: 'The seat of federal illusion and power. The green spectacles keep the entire realm unified under the belief of wealth and majesty.',
      desc: 'Located at the exact center of Oz, where the four roads converge. Every visitor is locked into green spectacles by the Guardian of the Gate.'
    },
    munchkin: {
      name: 'Munchkin Country (East)',
      color: '#38bdf8',
      ink: 'Blue Ink (Denslow 1900)',
      chapters: 'Chapters II–VIII',
      symbol: 'The rural East, fertile and gentle, enslaved by the Wicked Witch of the East until Dorothy’s house drops upon her.',
      desc: 'Blue houses, blue fences, blue round hats with little bells. Home to Boq and where Dorothy meets the Scarecrow on the Yellow Brick Road.'
    },
    winkie: {
      name: 'Winkie Country (West)',
      color: '#f59e0b',
      ink: 'Yellow Ink (Denslow 1900)',
      chapters: 'Chapters XII–XIV',
      symbol: 'The industrial/frontier West, enslaved by the Wicked Witch of the West with the Winged Monkeys and the Golden Cap.',
      desc: 'A rugged yellow land. After the Witch melts from Dorothy’s bucket of water, the grateful Winkies make the Tin Woodman their beloved ruler.'
    },
    quadling: {
      name: 'Quadling Country (South)',
      color: '#f43f5e',
      ink: 'Red Ink (Denslow 1900)',
      chapters: 'Chapters XVIII–XXIII',
      symbol: 'The realm of truth, emotional maturity, and Glinda the Good. The southern journey tests the travellers’ inner growth.',
      desc: 'Lush red marble, red cottages, and ruby garments. Here Glinda reveals that Dorothy had the power to return home from the very first day.'
    },
    gillikin: {
      name: 'Gillikin Country (North)',
      color: '#a855f7',
      ink: 'Purple Ink (Later Oz Books)',
      chapters: 'Mentioned in Chapter II',
      symbol: 'The mountainous north, protected by the elderly Good Witch of the North who kissed Dorothy’s forehead.',
      desc: 'A wild, mountainous country. Baum noted its purple color scheme, though Dorothy’s journey in the first book does not travel through it.'
    },
    kansas: {
      name: 'Kansas & The Deadly Desert (Outside)',
      color: '#94a3b8',
      ink: 'Gray Ink / Black & White',
      chapters: 'Chapters I & XXIV',
      symbol: 'The realistic turn-of-the-century American prairie, plagued by 1890s drought, hardship, and isolation.',
      desc: '“Not a tree nor a house broke the broad sweep of flat country… the sun had baked the plowed land into a gray mass.” Surrounded by the impenetrable Deadly Desert.'
    }
  };

  const QUIZ = [
    {
      q: 'In Baum’s 1900 book, what hides the Wizard when the travellers enter the throne room?',
      o: ['A velvet green curtain pulled on a brass rail', 'A folding screen standing in a corner', 'A trapdoor under the emerald throne', 'A cloud of smoke from a magic cauldron'],
      a: 1,
      w: 'In the book it is a Japanese folding screen in a corner; Toto jumps away from the Lion’s roar and knocks it over. The curtain belongs to the 1939 film.'
    },
    {
      q: 'Why does the Emerald City look green to everyone in Baum’s story?',
      o: ['All the buildings are carved from solid emerald crystals', 'A magical spell casts a green aura over the city walls', 'Every visitor and citizen wears locked green spectacles', 'The reflection of the green Kansas prairie lights the sky'],
      a: 2,
      w: 'The Wizard admits: “when you wear green spectacles, why of course everything you see looks green to you.” The Guardian locks them on with a key.'
    },
    {
      q: 'What color are Dorothy’s magic shoes in the original 1900 book?',
      o: ['Ruby red', 'Silver', 'Golden yellow', 'Emerald green'],
      a: 1,
      w: 'Silver shoes. The 1939 movie changed them to ruby slippers to showcase the newly developed three-strip Technicolor.'
    },
    {
      q: 'Is Dorothy’s journey to Oz a dream in Baum’s book?',
      o: ['Yes, she wakes up in Kansas with Aunt Em by her bed', 'No, Oz is a real geographic place and Dorothy is physically carried there', 'It is left ambiguous with no clear answer', 'Only the Wicked Witch of the West was a dream'],
      a: 1,
      w: 'Oz is completely real in Baum’s book; Dorothy physically visits it and returns when the silver shoes drop off in the desert. The dream framing was invented for the film.'
    },
    {
      q: 'What does the Wizard say the Cowardly Lion really lacks?',
      o: ['A magic potion of tiger blood', 'A gold medal for bravery', 'Confidence in himself', 'A larger roar to frighten witches'],
      a: 2,
      w: 'The Wizard tells the Lion: “All you need is confidence in yourself. There is no living thing that is not afraid when it faces danger. True courage is in facing danger when you are afraid.”'
    },
    {
      q: 'What does Henry Littlefield’s 1964 “parable on Populism” interpretation claim?',
      o: ['That Baum hid an occult cipher in the chapter numbers', 'That Oz allegorizes 1890s American monetary politics and the farmers’ alliance', 'That Dorothy was modeled after Queen Victoria', 'That W. W. Denslow secretly wrote the entire manuscript'],
      a: 1,
      w: 'Littlefield argued that the Yellow Brick Road (gold standard), Silver Shoes (free silver), Scarecrow (farmer), Tin Woodman (factory worker), and Wizard (presidential illusion) reflect 1890s politics.'
    }
  ];

  /* ═══════════════════════════════════════════════════════════════
     CANVAS SETUP WITH SIMKIT
     ═══════════════════════════════════════════════════════════════ */
  let spectaclesCanvas = null;
  let screenCanvas = null;
  let mapCanvas = null;

  function initCanvases() {
    const specEl = $('spectacles-canvas');
    if (specEl) {
      spectaclesCanvas = SimKit.canvas2d(specEl, {
        onResize: (ctx, w, h) => drawSpectacles(ctx, w, h)
      });
    }

    const scrEl = $('screen-canvas');
    if (scrEl) {
      screenCanvas = SimKit.canvas2d(scrEl, {
        onResize: (ctx, w, h) => drawScreen(ctx, w, h)
      });
    }

    const mapEl = $('map-canvas');
    if (mapEl) {
      mapCanvas = SimKit.canvas2d(mapEl, {
        onResize: (ctx, w, h) => drawMap(ctx, w, h)
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     VIEW 1: GREEN SPECTACLES RENDERER
     ═══════════════════════════════════════════════════════════════ */
  function drawSpectacles(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    const filter = FILTERS[state.filterColor] || FILTERS.green;
    const op = state.spectaclesLocked ? state.lensOpacity : 0;
    const time = Date.now() * 0.002;

    // 1. Sky
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    if (op > 0.05) {
      const r = Math.round(18 * (1 - op) + filter.r * 0.12 * op);
      const g = Math.round(38 * (1 - op) + filter.g * 0.28 * op);
      const b = Math.round(48 * (1 - op) + filter.b * 0.22 * op);
      const r2 = Math.round(65 * (1 - op) + filter.r * 0.45 * op);
      const g2 = Math.round(105 * (1 - op) + filter.g * 0.75 * op);
      const b2 = Math.round(120 * (1 - op) + filter.b * 0.65 * op);
      sky.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
      sky.addColorStop(1, `rgb(${r2}, ${g2}, ${b2})`);
    } else {
      sky.addColorStop(0, '#1a3346');
      sky.addColorStop(1, '#5c8ca6');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Sun rays
    if (op > 0.1) {
      ctx.save();
      ctx.fillStyle = `rgba(${filter.r}, ${filter.g}, ${filter.b}, ${0.12 * op})`;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5, 0);
        const rx = w * 0.15 + (i * w * 0.12);
        ctx.lineTo(rx - 25, h * 0.7);
        ctx.lineTo(rx + 25, h * 0.7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Distant Emerald City Skyline
    const baseColor = op > 0.05
      ? `rgb(${Math.round(40 * (1 - op) + filter.r * 0.2 * op)}, ${Math.round(60 * (1 - op) + filter.g * 0.45 * op)}, ${Math.round(70 * (1 - op) + filter.b * 0.35 * op)})`
      : '#334155';

    ctx.fillStyle = baseColor;
    // Spires & silhouettes
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.lineTo(w * 0.08, h * 0.48);
    ctx.lineTo(w * 0.14, h * 0.7);
    ctx.lineTo(w * 0.22, h * 0.42);
    ctx.lineTo(w * 0.28, h * 0.7);
    // Left palace dome
    ctx.lineTo(w * 0.35, h * 0.35);
    ctx.lineTo(w * 0.42, h * 0.7);
    // Grand Central Spire (The Palace of Oz)
    ctx.lineTo(w * 0.48, h * 0.15);
    ctx.lineTo(w * 0.50, h * 0.12);
    ctx.lineTo(w * 0.52, h * 0.15);
    ctx.lineTo(w * 0.58, h * 0.7);
    // Right towers
    ctx.lineTo(w * 0.65, h * 0.38);
    ctx.lineTo(w * 0.72, h * 0.7);
    ctx.lineTo(w * 0.80, h * 0.45);
    ctx.lineTo(w * 0.86, h * 0.7);
    ctx.lineTo(w * 0.94, h * 0.52);
    ctx.lineTo(w, h * 0.7);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // 3. Middleground: City Wall with Arches and Emerald Gate
    const wallCol = op > 0.05
      ? `rgb(${Math.round(55 * (1 - op) + filter.r * 0.35 * op)}, ${Math.round(75 * (1 - op) + filter.g * 0.65 * op)}, ${Math.round(85 * (1 - op) + filter.b * 0.5 * op)})`
      : '#475569';
    ctx.fillStyle = wallCol;
    ctx.fillRect(0, h * 0.58, w, h * 0.18);

    // Stone blocks texture on wall
    ctx.strokeStyle = op > 0.05 ? `rgba(${filter.r}, ${filter.g}, ${filter.b}, 0.25)` : '#334155';
    ctx.lineWidth = 1;
    const blockW = Math.max(28, w * 0.07);
    const blockH = 14;
    for (let by = h * 0.58; by < h * 0.76; by += blockH) {
      ctx.beginPath();
      ctx.moveTo(0, by);
      ctx.lineTo(w, by);
      ctx.stroke();
      const shift = (by / blockH % 2) * (blockW * 0.5);
      for (let bx = -shift; bx < w; bx += blockW) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by + blockH);
        ctx.stroke();
      }
    }

    // Grand Central Gate
    const gateW = Math.min(130, w * 0.26);
    const gateX = (w - gateW) * 0.5;
    const gateY = h * 0.52;
    const gateH = h * 0.24;

    ctx.fillStyle = op > 0.05
      ? `rgb(${Math.round(30 * (1 - op) + filter.r * 0.15 * op)}, ${Math.round(45 * (1 - op) + filter.g * 0.35 * op)}, ${Math.round(50 * (1 - op) + filter.b * 0.25 * op)})`
      : '#1e293b';
    ctx.beginPath();
    ctx.arc(w * 0.5, gateY + gateW * 0.5, gateW * 0.5, Math.PI, 0);
    ctx.lineTo(gateX + gateW, gateY + gateH);
    ctx.lineTo(gateX, gateY + gateH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = op > 0.05 ? '#34d399' : '#64748b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 4. Foreground: Marble Pavement / Avenue
    const streetCol = op > 0.05
      ? `rgb(${Math.round(70 * (1 - op) + filter.r * 0.45 * op)}, ${Math.round(95 * (1 - op) + filter.g * 0.8 * op)}, ${Math.round(100 * (1 - op) + filter.b * 0.6 * op)})`
      : '#64748b';
    ctx.fillStyle = streetCol;
    ctx.fillRect(0, h * 0.74, w, h * 0.26);

    // Yellow Brick Road approaching the gate
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - gateW * 0.25, h * 0.74);
    ctx.lineTo(w * 0.5 + gateW * 0.25, h * 0.74);
    ctx.lineTo(w * 0.65, h);
    ctx.lineTo(w * 0.35, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 5. Gems & Jewels embedded in pavement and walls
    const gemCoords = [
      { x: 0.28, y: 0.78 }, { x: 0.33, y: 0.84 }, { x: 0.42, y: 0.88 },
      { x: 0.58, y: 0.85 }, { x: 0.67, y: 0.80 }, { x: 0.74, y: 0.86 },
      { x: 0.82, y: 0.79 }, { x: 0.45, y: 0.62 }, { x: 0.55, y: 0.62 },
      { x: 0.50, y: 0.52 }, { x: 0.38, y: 0.68 }, { x: 0.62, y: 0.68 }
    ];

    gemCoords.forEach((pt, i) => {
      const gx = pt.x * w;
      const gy = pt.y * h;
      const r = Math.min(6, w * 0.012);

      if (op > 0.2) {
        // Emerald sparkles
        const twinkle = Math.sin(time + i * 1.5) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(110, 231, 183, ${0.7 + twinkle * 0.3})`;
        ctx.beginPath();
        ctx.arc(gx, gy, r + twinkle * 2, 0, Math.PI * 2);
        ctx.fill();

        // Starburst glint
        if (twinkle > 0.65) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(gx - 7, gy);
          ctx.lineTo(gx + 7, gy);
          ctx.moveTo(gx, gy - 7);
          ctx.lineTo(gx, gy + 7);
          ctx.stroke();
        }
      } else {
        // Plain river glass / dull bottle shards
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(gx, gy, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // 6. Left side: Lemonade & Popcorn Stand
    const cartX = w * 0.16;
    const cartY = h * 0.72;
    const cartW = Math.min(90, w * 0.18);
    const cartH = Math.min(50, h * 0.12);

    // Cart body
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cartX, cartY, cartW, cartH);
    ctx.strokeStyle = '#451a03';
    ctx.strokeRect(cartX, cartY, cartW, cartH);

    // Awning stripes
    const awningCol1 = op > 0.1 ? '#10b981' : '#dc2626';
    const awningCol2 = '#f8fafc';
    const numStripes = 5;
    const stripeW = cartW / numStripes;
    for (let s = 0; s < numStripes; s++) {
      ctx.fillStyle = s % 2 === 0 ? awningCol1 : awningCol2;
      ctx.fillRect(cartX + s * stripeW, cartY - 18, stripeW, 18);
    }

    // Lemonade Pitcher
    const pitX = cartX + cartW * 0.3;
    const pitY = cartY - 14;
    ctx.fillStyle = op > 0.1 ? '#34d399' : '#fef08a';
    ctx.beginPath();
    ctx.rect(pitX, pitY, 12, 14);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(pitX, pitY, 12, 14);

    // Sign on cart
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9, Math.floor(w * 0.016))}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText(op > 0.1 ? 'GREEN LEMONADE' : 'COLD DRINKS', cartX + cartW * 0.5, cartY + cartH * 0.6);

    // 7. Right side: Walking Citizens
    const c1X = w * 0.78;
    const c1Y = h * 0.72;
    drawCitizen(ctx, c1X, c1Y, w, op, filter, 1.0);
    drawCitizen(ctx, c1X + Math.min(42, w * 0.07), c1Y + 8, w, op, filter, 0.85);

    // 8. GREEN SPECTACLES FRAME HUD
    drawSpectaclesFrame(ctx, w, h, op, filter);

    // 9. Hotspot Highlights
    if (state.activeHotspot && state.activeHotspot !== 'all') {
      const spot = HOTSPOTS[state.activeHotspot];
      if (spot && spot.coords) {
        const hx = spot.coords.x * w;
        const hy = spot.coords.y * h;
        const pulse = Math.sin(time * 3) * 4;

        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hx, hy, 16 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawCitizen(ctx, x, y, w, op, filter, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const skinCol = op > 0.1 ? '#a7f3d0' : '#fbcfe8';
    const coatCol = op > 0.1 ? `rgb(${filter.r}, ${filter.g}, ${filter.b})` : '#4b5563';

    // Head
    ctx.fillStyle = skinCol;
    ctx.beginPath();
    ctx.arc(0, -22, 6, 0, Math.PI * 2);
    ctx.fill();

    // Top Hat
    ctx.fillStyle = coatCol;
    ctx.fillRect(-7, -35, 14, 12);
    ctx.fillRect(-10, -23, 20, 3);

    // Coat / Body
    ctx.fillStyle = coatCol;
    ctx.beginPath();
    ctx.moveTo(-6, -16);
    ctx.lineTo(6, -16);
    ctx.lineTo(9, 6);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    ctx.fill();

    // Legs
    ctx.strokeStyle = op > 0.1 ? '#064e3b' : '#1e293b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-3, 6);
    ctx.lineTo(-4, 20);
    ctx.moveTo(3, 6);
    ctx.lineTo(4, 20);
    ctx.stroke();

    ctx.restore();
  }

  function drawSpectaclesFrame(ctx, w, h, op, filter) {
    ctx.save();

    const frameY = Math.min(48, h * 0.12);
    const lensR = Math.min(36, w * 0.08);
    const bridgeW = Math.min(26, w * 0.05);
    const leftCX = w * 0.5 - lensR - bridgeW * 0.5;
    const rightCX = w * 0.5 + lensR + bridgeW * 0.5;

    // Golden wire rims
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';

    // Left lens glass tint
    ctx.fillStyle = op > 0.01 ? `rgba(${filter.r}, ${filter.g}, ${filter.b}, ${0.35 * op})` : 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.arc(leftCX, frameY, lensR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right lens glass tint
    ctx.beginPath();
    ctx.arc(rightCX, frameY, lensR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Golden nose bridge
    ctx.beginPath();
    ctx.arc(w * 0.5, frameY - 2, bridgeW * 0.6, Math.PI, 0);
    ctx.stroke();

    // Temple arms going back
    ctx.beginPath();
    ctx.moveTo(leftCX - lensR, frameY);
    ctx.lineTo(leftCX - lensR - 20, frameY - 8);
    ctx.moveTo(rightCX + lensR, frameY);
    ctx.lineTo(rightCX + lensR + 20, frameY - 8);
    ctx.stroke();

    // Golden Padlock Indicator at left corner
    const lockX = leftCX - lensR - 16;
    const lockY = frameY + 8;
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;

    // Shackle
    ctx.beginPath();
    if (state.spectaclesLocked) {
      ctx.arc(lockX, lockY - 5, 5, Math.PI, 0); // closed
    } else {
      ctx.arc(lockX - 3, lockY - 8, 5, Math.PI * 0.8, 0); // open!
    }
    ctx.stroke();

    // Lock body
    ctx.fillRect(lockX - 6, lockY - 4, 12, 10);
    ctx.strokeRect(lockX - 6, lockY - 4, 12, 10);

    // Keyhole
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(lockX, lockY, 1.5, 0, Math.PI * 2);
    ctx.lineTo(lockX, lockY + 4);
    ctx.stroke();

    ctx.restore();
  }

  /* ═══════════════════════════════════════════════════════════════
     VIEW 2: THE SCREEN & HUMBUG RENDERER
     ═══════════════════════════════════════════════════════════════ */
  function drawScreen(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    const time = Date.now() * 0.002;

    // 1. Throne Room Walls
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#041d13');
    bg.addColorStop(1, '#0e2b1f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Stone Pillars & Drapes
    ctx.fillStyle = '#06291a';
    ctx.fillRect(0, 0, Math.max(30, w * 0.09), h);
    ctx.fillRect(w - Math.max(30, w * 0.09), 0, Math.max(30, w * 0.09), h);

    // Ceiling vaulted arch lines
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, 0);
    ctx.quadraticCurveTo(w * 0.5, h * 0.25, w * 0.9, 0);
    ctx.stroke();

    // 2. Central Green Throne
    const throneW = Math.min(150, w * 0.32);
    const throneX = (w - throneW) * 0.5;
    const throneY = h * 0.36;
    const throneH = h * 0.48;

    // Throne base
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(throneX, throneY + throneH * 0.5, throneW, throneH * 0.5);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(throneX, throneY + throneH * 0.5, throneW, throneH * 0.5);

    // Throne backrest
    ctx.fillStyle = '#047857';
    ctx.beginPath();
    ctx.moveTo(throneX + throneW * 0.15, throneY + throneH * 0.5);
    ctx.lineTo(throneX + throneW * 0.15, throneY);
    ctx.lineTo(throneX + throneW * 0.5, throneY - 18);
    ctx.lineTo(throneX + throneW * 0.85, throneY);
    ctx.lineTo(throneX + throneW * 0.85, throneY + throneH * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. The Active Illusion on the Throne
    drawIllusion(ctx, w * 0.5, throneY + throneH * 0.25, w, time);

    // 4. The Screen in the Right Corner (or Fallen on Floor)
    const screenX = w * 0.72;
    const screenY = h * 0.42;
    const panelW = Math.min(36, w * 0.075);
    const panelH = h * 0.44;

    ctx.save();
    if (state.screenFallen) {
      // Screen fallen on floor!
      ctx.translate(screenX + 30, h * 0.86);
      ctx.rotate(Math.PI * 0.48); // flat
      drawFoldingScreen(ctx, 0, 0, panelW, panelH, true);
      ctx.restore();

      // THE LITTLE BALD MAN FROM OMAHA REVEALED BEHIND IT!
      drawLittleMan(ctx, screenX - 10, h * 0.58, w, time);
    } else {
      // Screen standing upright, concealing the corner
      drawFoldingScreen(ctx, screenX, screenY, panelW, panelH, false);
      ctx.restore();

      // Suspended wire visible leading to behind the screen
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, throneY - 10);
      ctx.lineTo(w * 0.5, h * 0.1);
      ctx.lineTo(screenX + panelW, h * 0.1);
      ctx.lineTo(screenX + panelW, screenY + 20);
      ctx.stroke();
    }

    // 5. Toto in the Foreground
    drawToto(ctx, w * 0.38, h * 0.82, state.screenFallen);
  }

  function drawIllusion(ctx, cx, cy, w, time) {
    ctx.save();
    const ill = state.illusion;

    if (ill === 'head') {
      // Giant Head (Dorothy)
      const headR = Math.min(38, w * 0.08);
      // Copper wire
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - headR);
      ctx.lineTo(cx, 0);
      ctx.stroke();

      // Papier-mâché head
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.ellipse(cx, cy, headR * 0.85, headR, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Animated mouth (moving with wire)
      const mouthY = cy + headR * 0.45;
      const jawDrop = Math.sin(time * 4) * 3 + 3;
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(cx - 10, mouthY, 20, 3 + jawDrop);

      // Glowing Eyes
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(cx - 12, cy - 6, 4, 0, Math.PI * 2);
      ctx.arc(cx + 12, cy - 6, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (ill === 'lady') {
      // Lovely Lady (Scarecrow)
      ctx.fillStyle = '#ec4899';
      // Silk dress
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 10);
      ctx.lineTo(cx + 6, cy - 10);
      ctx.lineTo(cx + 26, cy + 50);
      ctx.lineTo(cx - 26, cy + 50);
      ctx.closePath();
      ctx.fill();

      // Face
      ctx.fillStyle = '#fce7f3';
      ctx.beginPath();
      ctx.arc(cx, cy - 20, 11, 0, Math.PI * 2);
      ctx.fill();

      // Crown
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cx - 8, cy - 32, 16, 6);
    } else if (ill === 'beast') {
      // Terrible Beast (Tin Woodman)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 10, 35, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      // Claws & Limbs
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 4;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 14, cy + 25);
        ctx.lineTo(cx + i * 16, cy + 48);
        ctx.stroke();
      }

      // Five Eyes!
      ctx.fillStyle = '#ef4444';
      for (let j = -2; j <= 2; j++) {
        ctx.beginPath();
        ctx.arc(cx + j * 9, cy - 6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (ill === 'fire') {
      // Ball of Fire (Cowardly Lion)
      const r = Math.min(32, w * 0.07);
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.5, '#f97316');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Wire
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.8);
      ctx.lineTo(cx, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFoldingScreen(ctx, x, y, pw, ph, fallen) {
    ctx.save();
    const colors = ['#065f46', '#047857', '#059669'];

    for (let p = 0; p < 3; p++) {
      const px = x + p * (pw * 0.85);
      const py = y + (p % 2 === 0 ? 0 : 6);

      ctx.fillStyle = colors[p];
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(px, py, pw, ph);

      // Gold oriental filigree / floral pattern on panels
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px + pw * 0.5, py + ph * 0.35, pw * 0.3, 0, Math.PI * 2);
      ctx.arc(px + pw * 0.5, py + ph * 0.65, pw * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLittleMan(ctx, x, y, w, time) {
    ctx.save();
    ctx.translate(x, y);

    // Speaking horn / trumpet
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-24, -12);
    ctx.lineTo(-24, 12);
    ctx.closePath();
    ctx.fill();

    // Bald Head
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(12, -18, 10, 0, Math.PI * 2);
    ctx.fill();

    // Wrinkled brow
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(7, -22);
    ctx.lineTo(17, -22);
    ctx.stroke();

    // Frock Coat
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, -8, 16, 26);

    // Hands holding strings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(w * 0.5 - x, -30);
    ctx.stroke();

    // Text bubble: "I'm a humbug!"
    ctx.fillStyle = 'rgba(15, 39, 29, 0.9)';
    ctx.fillRect(-45, -55, 110, 24);
    ctx.strokeStyle = '#34d399';
    ctx.strokeRect(-45, -55, 110, 24);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('“I am a humbug!”', 10, -39);

    ctx.restore();
  }

  function drawToto(ctx, x, y, alarmed) {
    ctx.save();
    ctx.translate(x, y);

    // Small black dog (Toto)
    ctx.fillStyle = '#0f172a';
    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(8, -6, 5, 0, Math.PI * 2);
    ctx.fill();

    // Perky ears
    ctx.beginPath();
    ctx.moveTo(6, -10);
    ctx.lineTo(8, -15);
    ctx.lineTo(11, -9);
    ctx.fill();

    // Tail (wagging or alarmed straight up)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-14, alarmed ? -12 : -6);
    ctx.stroke();

    ctx.restore();
  }

  /* ═══════════════════════════════════════════════════════════════
     VIEW 3: DENSLOW COLOR GEOGRAPHY MAP RENDERER
     ═══════════════════════════════════════════════════════════════ */
  function drawMap(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    const pad = Math.min(30, w * 0.06);
    const mapW = w - pad * 2;
    const mapH = h - pad * 2;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // 1. Surrounding Deadly Desert (Gray sand)
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, w, h);

    // Decorative map border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.strokeRect(pad * 0.5, pad * 0.5, w - pad, h - pad);

    // 2. The Four Countries
    const halfW = mapW * 0.5;
    const halfH = mapH * 0.5;

    // North: Gillikin (Purple)
    drawMapQuadrant(ctx, cx, cy - halfH * 0.5, halfW, halfH * 0.7, REGIONS.gillikin, state.activeRegion === 'gillikin');
    // East: Munchkin (Blue)
    drawMapQuadrant(ctx, cx + halfW * 0.5, cy, halfW * 0.7, halfH, REGIONS.munchkin, state.activeRegion === 'munchkin');
    // West: Winkie (Yellow)
    drawMapQuadrant(ctx, cx - halfW * 0.5, cy, halfW * 0.7, halfH, REGIONS.winkie, state.activeRegion === 'winkie');
    // South: Quadling (Red)
    drawMapQuadrant(ctx, cx, cy + halfH * 0.5, halfW, halfH * 0.7, REGIONS.quadling, state.activeRegion === 'quadling');

    // 3. Center: Emerald City (Green)
    const emR = Math.min(42, w * 0.1);
    ctx.save();
    ctx.fillStyle = REGIONS.emerald.color;
    ctx.beginPath();
    ctx.arc(cx, cy, emR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = state.activeRegion === 'emerald' ? '#ffffff' : '#f59e0b';
    ctx.lineWidth = state.activeRegion === 'emerald' ? 4 : 2;
    ctx.stroke();

    // Spire icon in center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - emR * 0.6);
    ctx.lineTo(cx - 8, cy + emR * 0.4);
    ctx.lineTo(cx + 8, cy + emR * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. Yellow Brick Road winding from Munchkin country to Emerald City
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx + halfW * 0.7, cy + 20);
    ctx.bezierCurveTo(cx + halfW * 0.4, cy + 50, cx + halfW * 0.2, cy - 30, cx + emR * 0.9, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Map labels
    drawMapLabel(ctx, 'NORTH: GILLIKIN (PURPLE)', cx, pad + 18, state.activeRegion === 'gillikin');
    drawMapLabel(ctx, 'EAST: MUNCHKINS (BLUE)', cx + halfW * 0.5, cy - 10, state.activeRegion === 'munchkin');
    drawMapLabel(ctx, 'WEST: WINKIES (YELLOW)', cx - halfW * 0.5, cy - 10, state.activeRegion === 'winkie');
    drawMapLabel(ctx, 'SOUTH: QUADLINGS (RED)', cx, h - pad - 12, state.activeRegion === 'quadling');
    drawMapLabel(ctx, 'EMERALD CITY', cx, cy + emR + 15, state.activeRegion === 'emerald');
  }

  function drawMapQuadrant(ctx, qx, qy, qw, qh, reg, active) {
    ctx.save();
    ctx.fillStyle = reg.color;
    ctx.globalAlpha = active ? 0.9 : 0.45;
    ctx.beginPath();
    ctx.ellipse(qx, qy, qw * 0.45, qh * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    if (active) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMapLabel(ctx, text, x, y, active) {
    ctx.save();
    ctx.fillStyle = active ? '#ffffff' : '#cbd5e1';
    ctx.font = `bold ${active ? '12px' : '11px'} sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /* ═══════════════════════════════════════════════════════════════
     SYNC CONTROLS & UI
     ═══════════════════════════════════════════════════════════════ */
  function syncUI() {
    // 1. Spectacles HUD
    const lockBadge = $('hud-lock-badge');
    if (lockBadge) {
      if (state.spectaclesLocked) {
        lockBadge.className = 'hud-badge locked';
        lockBadge.innerHTML = '🔒 Locked by Guardian’s Key';
      } else {
        lockBadge.className = 'hud-badge unlocked';
        lockBadge.innerHTML = '🔓 Unlocked (Reality Revealed)';
      }
    }

    const toggleBtn = $('btn-toggle-spectacles');
    if (toggleBtn) {
      toggleBtn.textContent = state.spectaclesLocked ? 'Unlock Spectacles' : 'Lock Green Spectacles';
      toggleBtn.setAttribute('aria-pressed', String(state.spectaclesLocked));
    }

    const hudToggle = $('hud-toggle-btn');
    if (hudToggle) {
      hudToggle.textContent = state.spectaclesLocked ? 'Take Off' : 'Put On';
    }

    const slider = $('spectacles-opacity');
    if (slider) {
      slider.value = Math.round(state.lensOpacity * 100);
      $('opacity-readout').textContent = (state.spectaclesLocked ? Math.round(state.lensOpacity * 100) : 0) + '%';
    }

    // Filter Buttons
    document.querySelectorAll('[data-filter]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.filter === state.filterColor));
    });

    // Hotspot Info
    const spot = HOTSPOTS[state.activeHotspot] || HOTSPOTS.all;
    $('comp-title').textContent = spot.title;
    $('comp-spectacles-text').textContent = spot.spectacles;
    $('comp-reality-text').textContent = spot.reality;
    $('comp-quote').textContent = spot.quote;

    const select = $('hotspot-select');
    if (select) select.value = state.activeHotspot;

    // 2. Screen & Humbug UI
    const screenBtn = $('btn-knock-screen');
    if (screenBtn) {
      screenBtn.textContent = state.screenFallen ? 'Stand Screen Back Up' : 'Knock Down the Screen!';
      screenBtn.setAttribute('aria-pressed', String(state.screenFallen));
    }

    document.querySelectorAll('[data-illusion]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.illusion === state.illusion));
    });

    const ill = ILLUSIONS[state.illusion];
    if (ill) {
      $('illusion-name').textContent = ill.name;
      $('illusion-desc').textContent = ill.desc;
      $('illusion-trick').textContent = ill.trick;
      $('illusion-quote').textContent = ill.quote;
    }

    // 3. Map Geography UI
    document.querySelectorAll('[data-region]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.region === state.activeRegion));
    });

    const reg = REGIONS[state.activeRegion] || REGIONS.emerald;
    $('region-name').textContent = reg.name;
    $('region-chapters').textContent = reg.chapters;
    $('region-ink').textContent = reg.ink;
    $('region-symbol').textContent = reg.symbol;
    $('region-desc').textContent = reg.desc;

    // Redraw canvases
    if (spectaclesCanvas) drawSpectacles(spectaclesCanvas.ctx, spectaclesCanvas.width, spectaclesCanvas.height);
    if (screenCanvas) drawScreen(screenCanvas.ctx, screenCanvas.width, screenCanvas.height);
    if (mapCanvas) drawMap(mapCanvas.ctx, mapCanvas.width, mapCanvas.height);
  }

  /* ═══════════════════════════════════════════════════════════════
     VIEW SWITCHER
     ═══════════════════════════════════════════════════════════════ */
  function showView(viewId) {
    state.view = viewId;

    document.querySelectorAll('.sim-view').forEach(v => {
      v.hidden = v.id !== viewId;
    });

    document.querySelectorAll('[data-view]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.view === viewId));
    });

    // Update Stage Caption
    const captionEl = $('view-caption');
    if (captionEl) {
      if (viewId === 'spectacles-view') {
        captionEl.innerHTML = '<strong>The Green Spectacles:</strong> Slide the lens tint or unlock the glasses to test Baum’s famous reveal: is the Emerald City green, or only the lenses?';
      } else if (viewId === 'screen-view') {
        captionEl.innerHTML = '<strong>The Screen & Humbug:</strong> In the book, Toto knocks over a corner screen to reveal an ordinary balloonist from Omaha pulling puppet wires.';
      } else if (viewId === 'color-geography') {
        captionEl.innerHTML = '<strong>Denslow’s Color Geography:</strong> Denslow printed each section of the 1900 book in matching colored ink (Blue for Munchkins, Green for Oz, Red for Quadlings).';
      } else if (viewId === 'denslow-gallery') {
        captionEl.innerHTML = '<strong>1900 First Edition Art:</strong> Click any Denslow figure to enlarge for class discussion. Note how the book’s illustrations differ from the 1939 movie.';
      }
    }

    // Switch Panel Controls Card
    $('ctrl-spectacles').hidden = viewId !== 'spectacles-view';
    $('ctrl-screen').hidden = viewId !== 'screen-view';
    $('ctrl-map').hidden = viewId !== 'color-geography';
    $('ctrl-gallery-hint').hidden = viewId !== 'denslow-gallery';

    // Auto switch to Controls tab if on a simulation view
    if (viewId !== 'denslow-gallery' && window.LessonLayout) {
      LessonLayout.switchTab('oz-controls');
      if (window.innerWidth > 680) {
        LessonLayout.openPanel(true);
      }
    }

    syncUI();
  }

  /* ═══════════════════════════════════════════════════════════════
     EVENT LISTENERS & BINDINGS
     ═══════════════════════════════════════════════════════════════ */
  function initEvents() {
    // View Switch buttons
    document.querySelectorAll('[data-view]').forEach(b => {
      b.addEventListener('click', () => showView(b.dataset.view));
    });

    // Spectacles Toggle
    const toggle = () => {
      state.spectaclesLocked = !state.spectaclesLocked;
      syncUI();
    };
    $('btn-toggle-spectacles')?.addEventListener('click', toggle);
    $('hud-toggle-btn')?.addEventListener('click', toggle);

    // Spectacles Slider
    $('spectacles-opacity')?.addEventListener('input', e => {
      state.lensOpacity = parseFloat(e.target.value) / 100;
      if (!state.spectaclesLocked && state.lensOpacity > 0) {
        state.spectaclesLocked = true;
      }
      syncUI();
    });

    // Filter Buttons
    document.querySelectorAll('[data-filter]').forEach(b => {
      b.addEventListener('click', () => {
        state.filterColor = b.dataset.filter;
        syncUI();
      });
    });

    // Hotspot dropdown
    $('hotspot-select')?.addEventListener('change', e => {
      state.activeHotspot = e.target.value;
      syncUI();
    });

    // Canvas click on Spectacles canvas to select hotspot
    $('spectacles-canvas')?.addEventListener('click', e => {
      const rect = e.target.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / rect.width;
      const clickY = (e.clientY - rect.top) / rect.height;

      // Find closest hotspot
      let closest = 'all';
      let minDist = 0.12;

      for (const [key, spot] of Object.entries(HOTSPOTS)) {
        if (spot.coords) {
          const dx = clickX - spot.coords.x;
          const dy = clickY - spot.coords.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            closest = key;
          }
        }
      }
      state.activeHotspot = closest;
      syncUI();
    });

    // Screen View Toggle
    $('btn-knock-screen')?.addEventListener('click', () => {
      state.screenFallen = !state.screenFallen;
      syncUI();
    });

    // Illusion Buttons
    document.querySelectorAll('[data-illusion]').forEach(b => {
      b.addEventListener('click', () => {
        state.illusion = b.dataset.illusion;
        syncUI();
      });
    });

    // Map Region Buttons
    document.querySelectorAll('[data-region]').forEach(b => {
      b.addEventListener('click', () => {
        state.activeRegion = b.dataset.region;
        syncUI();
      });
    });

    // Topbar shortcut links (`data-open-pane`)
    document.querySelectorAll('[data-open-pane]').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        const paneId = b.dataset.openPane;
        if (window.LessonLayout) {
          LessonLayout.switchTab(paneId);
          LessonLayout.openPanel(true);
        }
      });
    });

    // Discussion Grade Track selector
    $('grade-track')?.addEventListener('change', e => {
      state.track = e.target.value;
      updateDiscussionPrompts();
    });

    // Quiz Buttons
    $('quiz-next')?.addEventListener('click', () => {
      state.quizIndex++;
      showQuizQuestion();
    });

    $('quiz-restart')?.addEventListener('click', () => {
      state.quizIndex = 0;
      state.quizScore = 0;
      showQuizQuestion();
    });

    // Reflection Journal Autosave
    const reflectBox = $('oz-reflect-box');
    const storageKey = 'oz-reflection-draft';

    if (reflectBox) {
      try {
        reflectBox.value = localStorage.getItem(storageKey) || '';
      } catch (err) {}

      const updateWordCount = () => {
        const words = reflectBox.value.trim().split(/\s+/).filter(Boolean).length;
        $('oz-reflect-count').textContent = `${words} ${words === 1 ? 'word' : 'words'} · Saved locally`;
        try {
          localStorage.setItem(storageKey, reflectBox.value);
        } catch (err) {}
      };

      reflectBox.addEventListener('input', updateWordCount);
      updateWordCount();

      $('oz-reflect-clear')?.addEventListener('click', () => {
        reflectBox.value = '';
        updateWordCount();
        reflectBox.focus();
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     DISCUSSION PROMPTS BY TRACK
     ═══════════════════════════════════════════════════════════════ */
  const TRACK_PROMPTS = {
    '68': [
      'Compare Baum’s “screen in a corner” with the movie’s “curtain.” Why did the filmmakers change this detail?',
      'The Guardian tells Dorothy the glasses prevent blindness. The Wizard says they make plain stone look green. When an authority provides a reason for a rule, how can we test whether it is true or an excuse?',
      'Each companion asks for something they already show on the road. Cite one moment for the Scarecrow, Tin Woodman, or Lion where his actions disprove what he says he lacks.'
    ],
    '910': [
      'Evaluate Hugh Rockoff and Henry Littlefield’s claim that Oz is a monetary allegory. Which pieces of evidence fit neatly, and where does the historical parallel break down?',
      'Baum lived through the Panic of 1893 and the failure of his Aberdeen store. How does his portrayal of gray Kansas contrast with the Emerald City’s commercial theater?',
      'Examine Baum’s controversial South Dakota editorials alongside his children’s literature. How should modern readers weigh an author’s historical views when interpreting their stories?'
    ]
  };

  function updateDiscussionPrompts() {
    const list = $('discussion-prompts');
    if (!list) return;
    const prompts = TRACK_PROMPTS[state.track] || TRACK_PROMPTS['68'];
    list.innerHTML = prompts.map(p => `<li>${p}</li>`).join('');
  }

  /* ═══════════════════════════════════════════════════════════════
     QUIZ ENGINE
     ═══════════════════════════════════════════════════════════════ */
  function showQuizQuestion() {
    state.quizLocked = false;
    const q = QUIZ[state.quizIndex];
    const total = QUIZ.length;

    $('quiz-counter').textContent = `Question ${state.quizIndex + 1} of ${total} · Score ${state.quizScore}`;
    $('quiz-prompt-text').textContent = q.q;
    $('quiz-feedback').textContent = 'Select the best answer.';
    $('quiz-next').hidden = true;
    $('quiz-restart').hidden = true;

    const optsContainer = $('quiz-options');
    optsContainer.innerHTML = '';

    q.o.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-opt-btn';
      btn.textContent = optText;
      btn.addEventListener('click', () => handleQuizAnswer(idx));
      optsContainer.appendChild(btn);
    });
  }

  function handleQuizAnswer(choiceIdx) {
    if (state.quizLocked) return;
    state.quizLocked = true;

    const q = QUIZ[state.quizIndex];
    const opts = $('quiz-options').children;

    Array.from(opts).forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.a) btn.classList.add('correct');
      else if (idx === choiceIdx) btn.classList.add('incorrect');
    });

    const isCorrect = choiceIdx === q.a;
    if (isCorrect) state.quizScore++;

    const fb = $('quiz-feedback');
    fb.innerHTML = `<strong>${isCorrect ? 'Correct! ' : 'Not quite. '}</strong>${q.w}`;

    $('quiz-counter').textContent = `Question ${state.quizIndex + 1} of ${QUIZ.length} · Score ${state.quizScore}`;

    if (state.quizIndex < QUIZ.length - 1) {
      $('quiz-next').hidden = false;
      $('quiz-next').focus();
    } else {
      fb.innerHTML += `<br><strong>Finished! Final Score: ${state.quizScore} of ${QUIZ.length}.</strong>`;
      $('quiz-restart').hidden = false;
      $('quiz-restart').focus();
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     INIT ON DOM READY
     ═══════════════════════════════════════════════════════════════ */
  function init() {
    initCanvases();
    initEvents();
    updateDiscussionPrompts();
    showQuizQuestion();
    showView('spectacles-view');

    // Continuous subtle animation loop for twinkles / fire
    let lastT = 0;
    function animLoop(t) {
      if (t - lastT > 50) { // ~20fps throttled for lightweight performance
        lastT = t;
        if (state.view === 'spectacles-view' && spectaclesCanvas) {
          drawSpectacles(spectaclesCanvas.ctx, spectaclesCanvas.width, spectaclesCanvas.height);
        } else if (state.view === 'screen-view' && screenCanvas) {
          drawScreen(screenCanvas.ctx, screenCanvas.width, screenCanvas.height);
        }
      }
      requestAnimationFrame(animLoop);
    }
    requestAnimationFrame(animLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
