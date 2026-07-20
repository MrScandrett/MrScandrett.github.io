// Wordle Game
(function(){
  const WORD_LIST = [
    'ABBEY','ABBOT','ABHOR','ABIDE','ABLER','ABODE','ABORT','ABOUT','ABOVE','ABUSE',
    'ABYSS','ACIDS','ACRES','ACTED','ACUTE','ADMIT','ADOBE','ADOPT','ADORE','ADULT',
    'AFTER','AGAIN','AGATE','AGENT','AGILE','AGLOW','AGONY','AGREE','AHEAD','AIDED',
    'AIMED','AIRED','AISLE','ALARM','ALBUM','ALERT','ALGAE','ALIEN','ALIGHT','ALIKE',
    'ALIVE','ALLAY','ALLEY','ALLOW','ALLOY','ALONE','ALONG','ALOOF','ALOUD','ALTAR',
    'ALTER','AMBER','AMBLE','AMEND','AMPLE','AMUSE','ANGEL','ANGER','ANGLE','ANGRY',
    'ANGST','ANIME','ANNEX','ANTIC','ANVIL','APART','APPLE','APPLY','APRON','APTLY',
    'ARENA','ARGUE','ARISE','ARMOR','AROMA','AROSE','ARRAY','ARSON','ASCOT','ASIDE',
    'ASSET','ATLAS','ATONE','ATTIC','AUDIO','AUDIT','AUGUR','AVAIL','AVID','AVOID',
    'AWAKE','AWARD','AWARE','AWFUL','AWOKE',
    'BACON','BADGE','BADLY','BAKER','BANAL','BANJO','BANKS','BARELY','BARON','BASED',
    'BASIC','BASIS','BATCH','BAYOU','BEACH','BEARD','BEAST','BEGAN','BEING','BELOW',
    'BENCH','BERRY','BIGHT','BISON','BLACK','BLADE','BLAME','BLAND','BLANK','BLAST',
    'BLAZE','BLEAK','BLEED','BLEND','BLESS','BLIND','BLOCK','BLOOD','BLOWN','BLUES',
    'BLUNT','BLUSH','BOARD','BONUS','BOOST','BOOTH','BOUND','BOXER','BRAIN','BRAND',
    'BRAVE','BREAD','BREAK','BREED','BRICK','BRIDE','BRIEF','BRING','BROKE','BROWN',
    'BRUNT','BUDGE','BUILD','BUILT','BULGE','BUNCH','BURLY','BURNT','BURST','BUYER',
    'CABLE','CAMEL','CANDY','CARGO','CARRY','CATCH','CAUSE','CEASE','CHAIN','CHAIR',
    'CHALK','CHAOS','CHARM','CHASE','CHEAP','CHECK','CHEEK','CHESS','CHEST','CHIEF',
    'CHILD','CHILI','CHUNK','CIVIL','CLAIM','CLASP','CLASS','CLEAN','CLEAR','CLERK',
    'CLICK','CLIFF','CLIMB','CLING','CLOAK','CLOSE','CLOUD','CLOUT','CLOWN','CLUMP',
    'COACH','COAST','COMET','COMIC','CORAL','COULD','COUNT','COUCH','COURT','COVER',
    'CRACK','CRAFT','CRANE','CRASH','CRISP','CROSS','CROWD','CROWN','CRUDE','CRUMB',
    'CRUSH','CRUST','CUBIC','CURLY','CURVE','CYCLE',
    'DAILY','DAISY','DANCE','DEBUT','DELAY','DELTA','DENSE','DEPOT','DEPTH','DERBY',
    'DIGIT','DINER','DITTY','DIZZY','DODGE','DONOR','DOUBT','DOUGH','DRAFT','DRAIN',
    'DRAMA','DRAWN','DREAM','DRESS','DRIED','DRIFT','DRILL','DRINK','DRIVE','DROLL',
    'DROWN','DRUID','DRUMS','DRYER','DUMPY','DUSTY','DWELL','DWELT','DYING',
    'EAGER','EARLY','EARTH','EATEN','EIGHT','EJECT','ELBOW','ELECT','ELITE','EMAIL',
    'EMBER','EMPTY','ENEMY','ENJOY','ENTER','ENTRY','ENVOY','EQUAL','ERROR','ERUPT',
    'ESSAY','ETHIC','EVENT','EVERY','EXACT','EXERT','EXILE','EXTRA',
    'FABLE','FACET','FADED','FAIRY','FAITH','FALSE','FANCY','FARCE','FATAL','FAULT',
    'FEAST','FENCE','FETCH','FEVER','FIEND','FIERY','FIFTY','FIGHT','FILMS','FINAL',
    'FINCH','FIRST','FIXED','FLAME','FLANK','FLARE','FLASH','FLASK','FLATS','FLAWS',
    'FLEET','FLESH','FLICK','FLING','FLINT','FLOCK','FLOOD','FLOOR','FLORA','FLOUR',
    'FLUID','FLUTE','FOCAL','FOCUS','FOLLY','FORCE','FORGE','FORTH','FORUM','FOUND',
    'FRAME','FRANK','FRAUD','FREAK','FRESH','FRIED','FRILL','FRISK','FROST','FRUIT',
    'FULLY','FUNDS','FUNGI','FUNKY','FUNNY',
    'GAUGE','GIANT','GIVEN','GLAND','GLARE','GLASS','GLEAM','GLIDE','GLINT','GLOBE',
    'GLOOM','GLORY','GLOSS','GLOVE','GNOME','GOING','GOOSE','GRACE','GRADE','GRAFT',
    'GRAIN','GRAND','GRANT','GRAPE','GRASP','GRASS','GRAVE','GREAT','GREED','GREEN',
    'GREET','GRILL','GRIME','GRIND','GRIPE','GROAN','GROOM','GROSS','GROUP','GROVE',
    'GROWL','GROWN','GRUNT','GUARD','GUESS','GUIDE','GUILD','GUILT','GUISE','GUSTO',
    'HABIT','HANDY','HAPPY','HARSH','HASTE','HASTY','HATCH','HAUNT','HAVEN','HEAVY',
    'HEDGE','HEIST','HELLO','HENCE','HERBS','HERON','HINGE','HIPPO','HITCH','HOARD',
    'HONOR','HORSE','HOTEL','HOUND','HOUSE','HOVER','HUMID','HUMOR','HUNKY','HURRY',
    'HYENA',
    'IDEAL','IDIOM','IDIOT','IMAGE','IMPLY','INDEX','INERT','INFER','INGOT','INLET',
    'INNER','INPUT','ISSUE','IVORY',
    'JAUNT','JEANS','JELLO','JEWEL','JOKER','JOLLY','JOUST','JUDGE','JUICE','JUICY',
    'JUMBO','JUMPY','JUROR',
    'KEBAB','KHAKI','KICKS','KITTY','KNACK','KNAVE','KNEEL','KNIFE','KNOCK','KNOLL',
    'KNOTS','KNOWN','KOALA',
    'LABEL','LANCE','LANKY','LASER','LATCH','LATER','LATHE','LAUGH','LAYER','LEAFY',
    'LEAKY','LEAPT','LEARN','LEASE','LEASH','LEAST','LEAVE','LEDGE','LEGAL','LEMON',
    'LEVEL','LIGHT','LILAC','LINER','LINGO','LIVER','LOCAL','LODGE','LOFTY','LOGIC',
    'LOOSE','LOVER','LUCID','LUCKY','LUSTY',
    'MAGIC','MAJOR','MAKER','MANGA','MANOR','MAPLE','MARCH','MARSH','MELON','MERCY',
    'MERIT','MESSY','METAL','MIGHT','MIRTH','MISER','MIXED','MOCHA','MODAL','MODEL',
    'MOIST','MONEY','MONTH','MORAL','MOTTO','MOUNT','MOUSE','MOUTH','MOVER','MOVIE',
    'MUDDY','MULCH','MUNCH','MUSIC','MUTED','MYRRH','MYSTIC',
    'NAIVE','NERVE','NIGHT','NINJA','NOBLE','NOISE','NORTH','NOTED','NOVEL','NURSE',
    'NYMPH',
    'OCCUR','OCEAN','OFFER','OLIVE','OPERA','ORDER','OTHER','OUNCE','OUTER','OVERT',
    'OZONE',
    'PAINT','PANIC','PANEL','PAPER','PARTY','PASTE','PATCH','PATHS','PAUSE','PEACH',
    'PEARL','PENAL','PERCH','PHASE','PIANO','PILOT','PIXEL','PIZZA','PLACE','PLAIN',
    'PLANE','PLANT','PLATE','PLAZA','POINT','POKER','POLAR','POPPY','POUND','POWER',
    'PRESS','PRICE','PRIDE','PRIME','PRINT','PRIZE','PROBE','PRONE','PROOF','PROSE',
    'PROUD','PROVE','PROWL','PRUDE','PRUNE','PULSE','PUPIL',
    'QUEEN','QUERY','QUEUE','QUIET','QUILT','QUIRK','QUOTA','QUOTE',
    'RADAR','RADIO','RAINY','RAISE','RALLY','RANCH','RANGE','RAPID','RAVEN','REACH',
    'READY','REALM','REBEL','RECAP','REFIT','REGAL','REIGN','RELAX','RELAY','RENEW',
    'REPAY','REPEL','RERUN','RESIN','REVEL','RIDER','RIDGE','RIFLE','RIGHT','RISKY',
    'RIVET','ROAST','ROBIN','ROCKY','ROGUE','ROMAN','ROUGH','ROUND','ROYAL','RULER',
    'RURAL','RUSTY',
    'SAINT','SALAD','SAUCE','SAVVY','SCALD','SCALY','SCAMP','SCENE','SCENT','SCORE',
    'SCOUT','SCREW','SEIZE','SENSE','SERVE','SEVEN','SHADE','SHAKE','SHALL','SHAME',
    'SHAPE','SHARE','SHARK','SHARP','SHEEP','SHEER','SHELF','SHELL','SHIFT','SHINE',
    'SHIRT','SHOCK','SHORE','SHORT','SHOUT','SHOVE','SHOWN','SIEGE','SILLY','SINCE',
    'SIXTH','SIXTY','SKILL','SKIMP','SKULL','SLATE','SLAVE','SLEEK','SLEEP','SLEET',
    'SLICK','SLIDE','SLIME','SLOTH','SMART','SMEAR','SMELL','SMITE','SMOKE','SNAIL',
    'SNAKE','SNARE','SNEAK','SOLAR','SOLID','SOLVE','SORRY','SOUTH','SPACE','SPARE',
    'SPARK','SPEAK','SPEAR','SPECK','SPEED','SPICE','SPIKE','SPILL','SPINE','SPITE',
    'SPLIT','SPOKE','SPOON','SPORT','SPOUT','SPRAY','SQUAD','STACK','STAFF','STAGE',
    'STAIN','STALE','STALK','STAMP','STAND','STARK','START','STEAL','STEAM','STEEL',
    'STEEP','STEER','STERN','STICK','STILL','STING','STOCK','STONE','STORE','STORM',
    'STORY','STRAP','STRAW','STRAY','STRIP','STRUT','STUCK','STUDY','STUMP','STYLE',
    'SUGAR','SUITE','SUNNY','SUPER','SURGE','SWAMP','SWEAR','SWEAT','SWEEP','SWEET',
    'SWEPT','SWIFT','SWIPE','SWIRL',
    'TACIT','TABLE','TAKEN','TALES','TALKS','TANGO','TASTE','TAUNT','TEACH','TEETH',
    'TEMPO','TENSE','TENTH','TERMS','THORN','THOSE','THREE','THREW','THUMB','THUMP',
    'TIDAL','TIGER','TIGHT','TIMID','TITAN','TITLE','TOAST','TODAY','TOTAL','TOUCH',
    'TOUGH','TOWEL','TOXIC','TRACE','TRACK','TRADE','TRAIL','TRAIN','TRAIT','TRAMP',
    'TRAPS','TRASH','TRAWL','TREND','TRIAL','TRIBE','TRICK','TRIED','TROOP','TROUT',
    'TROVE','TRUCE','TRULY','TRUMP','TRUNK','TRUST','TRUTH','TULIP','TUTOR','TWICE',
    'TWIRL','TWIST','TYING',
    'ULCER','ULTRA','UMBRA','UNIFY','UNION','UNITE','UNTIL','UNZIP','UPPER','UPSET',
    'USHER','USUAL','UTTER',
    'VAGUE','VALOR','VALUE','VALVE','VAPOR','VAULT','VERSE','VIGOR','VIOLA','VIPER',
    'VIRAL','VIVID','VOCAL','VOUCH','VOWEL',
    'WADED','WAFER','WALTZ','WASTE','WATCH','WATER','WEARY','WEAVE','WEDGE','WEIGH',
    'WEIRD','WHALE','WHEAT','WHEEL','WHERE','WHILE','WHIFF','WHIRL','WHOLE','WHOSE',
    'WIELD','WINDY','WITCH','WITTY','WOMAN','WOMEN','WORLD','WORRY','WORSE','WORTH',
    'WOULD','WOUND','WRATH','WRIST','WROTE',
    'YACHT','YEARN','YIELD','YOUNG','YOUTH',
    'ZEBRA','ZESTY','ZILCH','ZONAL',
  ];
  let word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  let guess = '';
  let guesses = [];
  let gameOver = false;
  const MAX_GUESSES = 6;

  function createGrid(){
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    for(let i = 0; i < MAX_GUESSES * 5; i++){
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.id = `tile-${i}`;
      grid.appendChild(tile);
    }
  }

  function createKeyboard(){
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';
    const letters = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');
    letters.forEach(letter => {
      const btn = document.createElement('button');
      btn.className = 'key';
      btn.textContent = letter;
      btn.id = `key-${letter}`;
      btn.addEventListener('click', () => handleKey(letter));
      keyboard.appendChild(btn);
    });
    const enterBtn = document.createElement('button');
    enterBtn.className = 'key key-wide';
    enterBtn.textContent = 'Enter';
    enterBtn.addEventListener('click', () => handleKey('ENTER'));
    keyboard.appendChild(enterBtn);
    const backBtn = document.createElement('button');
    backBtn.className = 'key key-wide';
    backBtn.textContent = '⌫';
    backBtn.addEventListener('click', () => handleKey('BACKSPACE'));
    keyboard.appendChild(backBtn);
  }

  function handleKey(letter){
    if(gameOver) return;
    if(letter === 'ENTER'){
      if(guess.length === 5) submitGuess();
    } else if(letter === 'BACKSPACE'){
      guess = guess.slice(0, -1);
    } else if(guess.length < 5){
      guess += letter;
    }
    updateTiles();
  }

  function updateTiles(){
    for(let i = 0; i < 5; i++){
      const tileId = guesses.length * 5 + i;
      const tile = document.getElementById(`tile-${tileId}`);
      if(i < guess.length){
        tile.textContent = guess[i];
        tile.classList.add('filled');
      } else {
        tile.textContent = '';
        tile.classList.remove('filled');
      }
    }
  }

  function submitGuess(){
    if(guess.length !== 5) return;
    guesses.push(guess);
    const result = checkGuess(guess);
    colorTiles(result);
    if(guess === word){
      gameOver = true;
      document.getElementById('message').textContent = '🎉 You Won!';
      document.getElementById('message').style.color = '#6aaa64';
    } else if(guesses.length === MAX_GUESSES){
      gameOver = true;
      document.getElementById('message').textContent = `Game Over! Word: ${word}`;
      document.getElementById('message').style.color = '#c9b458';
    }
    guess = '';
  }

  function checkGuess(g){
    const result = ['absent', 'absent', 'absent', 'absent', 'absent'];
    const wordLetters = word.split('');
    for(let i = 0; i < 5; i++){
      if(g[i] === word[i]){
        result[i] = 'correct';
        wordLetters[i] = null;
      }
    }
    for(let i = 0; i < 5; i++){
      if(result[i] === 'absent' && wordLetters.includes(g[i])){
        result[i] = 'present';
        wordLetters[wordLetters.indexOf(g[i])] = null;
      }
    }
    return result;
  }

  function colorTiles(result){
    const tileStart = (guesses.length - 1) * 5;
    result.forEach((status, i) => {
      const tile = document.getElementById(`tile-${tileStart + i}`);
      tile.classList.add(status);
      const keyBtn = document.getElementById(`key-${guess[i]}`);
      if(!keyBtn.classList.contains('correct')){
        keyBtn.classList.add(status);
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    const letter = e.key.toUpperCase();
    if(/^[A-Z]$/.test(letter)) handleKey(letter);
    else if(e.key === 'Enter') handleKey('ENTER');
    else if(e.key === 'Backspace') handleKey('BACKSPACE');
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    guess = '';
    guesses = [];
    gameOver = false;
    document.getElementById('message').textContent = '';
    createGrid();
    createKeyboard();
  });

  createGrid();
  createKeyboard();
})();
