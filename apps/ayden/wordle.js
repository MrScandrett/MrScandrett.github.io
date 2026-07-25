// Wordle Game
(function(){
  const WORD_LIST = [
    'ABOUT', 'ABOVE', 'ABUSE', 'ACIDS', 'ACRES', 'ACTED', 'ACUTE', 'ADMIT',
    'ADOPT', 'ADULT', 'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM',
    'ALBUM', 'ALERT', 'ALIEN', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG',
    'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE',
    'ARISE', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE', 'AWARE',
    'BADLY', 'BAKER', 'BANKS', 'BASED', 'BASIC', 'BASIS', 'BEACH', 'BEGAN',
    'BEING', 'BELOW', 'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLADE', 'BLAME',
    'BLANK', 'BLAST', 'BLEED', 'BLIND', 'BLOCK', 'BLOOD', 'BOARD', 'BOOST',
    'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRASS', 'BREAD', 'BREAK', 'BREED',
    'BRICK', 'BRIDE', 'BRIEF', 'BRING', 'BRINK', 'BROAD', 'BROKE', 'BROWN',
    'BUILD', 'BUILT', 'BURST', 'BUYER', 'CABLE', 'CALIF', 'CALLS', 'CAMEL',
    'CANAL', 'CANDY', 'CARED', 'CARGO', 'CAROL', 'CARRY', 'CASES', 'CATCH',
    'CAUSE', 'CHAIN', 'CHAIR', 'CHAOS', 'CHARM', 'CHASE', 'CHEAP', 'CHEAT',
    'CHECK', 'CHESS', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE', 'CHORD',
    'CHOSE', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLICK', 'CLIFF',
    'CLIMB', 'CLOSE', 'CLOUD', 'COACH', 'COAST', 'COATS', 'CODE', 'COINS',
    'COULD', 'COUNT', 'COUCH', 'COURT', 'COVER', 'CRACK', 'CRAFT', 'CRASH',
    'CRAZY', 'CREAM', 'CRIME', 'CRISP', 'CROPS', 'CROSS', 'CROWD', 'CROWN',
    'CRUDE', 'CURVE', 'CYCLE', 'DAILY', 'DANCE', 'DATES', 'DATED', 'DEALS',
    'DEALT', 'DEATH', 'DEBUT', 'DELAY', 'DELTA', 'DENSE', 'DEPTH', 'DERBY',
    'DESK', 'DEALS', 'DETER', 'DIARY', 'DICE', 'DIGIT', 'DIRTY', 'DISCO',
    'DIVER', 'DIZZY', 'DODGE', 'DOING', 'DOLLS', 'DONOR', 'DOUBT', 'DOUGH',
    'DRAFT', 'DRAIN', 'DRAKE', 'DRAMA', 'DRANK', 'DRAWN', 'DREAM', 'DRESS',
    'DRIED', 'DRILL', 'DRINK', 'DRIVE', 'DROIT', 'DROWN', 'DRUGS', 'DRUNK',
    'DUCKS', 'DUMMY', 'DUSTY', 'DUTCH', 'DUTY', 'DWARF', 'DWELL', 'DYING',
    'EAGER', 'EARLY', 'EARTH', 'EATEN', 'EATER', 'EBONY', 'ECLAT', 'EDGES',
    'EDITS', 'EIGHT', 'EJECT', 'ELBOW', 'ELECT', 'ELITE', 'ELITE', 'ELOPE',
    'EMAIL', 'EMCEE', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'ENVOY', 'EQUAL',
    'ERROR', 'ERUPT', 'ESSAY', 'ETHIC', 'EVENT', 'EVERY', 'EVICT', 'EXACT',
    'EXAMS', 'EXCEL', 'EXERT', 'EXILE', 'EXIST', 'EXITS', 'EXPEL', 'EXTRA',
    'EXUDE', 'EYES', 'FACED', 'FACES', 'FACET', 'FACTS', 'FADED', 'FADES',
    'FAILS', 'FAINT', 'FAIRY', 'FAITH', 'FALLS', 'FALSE', 'FAMED', 'FANCY',
    'FARCE', 'FARED', 'FARES', 'FARMS', 'FATAL', 'FATED', 'FATTY', 'FAULT',
    'FAXED', 'FEARS', 'FEAST', 'FEATS', 'FENCE', 'FETCH', 'FEVER', 'FEWER',
    'FIBER', 'FIELD', 'FIEND', 'FIERY', 'FIFTH', 'FIFTY', 'FIGHT', 'FILED',
    'FILES', 'FILLS', 'FILMS', 'FINAL', 'FINDS', 'FINED', 'FINES', 'FIRED',
    'FIRES', 'FIRMS', 'FIRST', 'FISH', 'FISTS', 'FIXED', 'FLAGS', 'FLAKE',
    'FLAME', 'FLANK', 'FLAP', 'FLARE', 'FLASH', 'FLASK', 'FLATS', 'FLAWED',
    'FLAWS', 'FLEAS', 'FLECK', 'FLEET', 'FLESH', 'FLICK', 'FLIES', 'FLING',
    'FLINT', 'FLIPS', 'FLOCK', 'FLOOD', 'FLOOR', 'FLOPS', 'FLORA', 'FLOUR',
    'FLOWS', 'FLUID', 'FLUNG', 'FLUSH', 'FLUTE', 'FOAMS', 'FOCAL', 'FOCUS',
    'FOILS', 'FOLDS', 'FOLKS', 'FOLLY', 'FONTS', 'FOODS', 'FOOLS', 'FOOTS',
    'FORCE', 'FORDS', 'FORGE', 'FORGO', 'FORKS', 'FORMS', 'FORTH', 'FORTS',
    'FORUM', 'FOULS', 'FOUND', 'FOURS', 'FOWLS', 'FOXES', 'FRAME', 'FRANK',
    'FRAUD', 'FRAYS', 'FREAK', 'FREED', 'FRESH', 'FRIED', 'FRIES', 'FRILL',
    'FRISK', 'FRIZZ', 'FROCK', 'FROGS', 'FRONT', 'FROST', 'FROWN', 'FROZE',
    'FRUIT', 'FUELS', 'FULLY', 'FUNDS', 'FUNGI', 'FUNKY', 'FUNNY', 'FURLS',
    'FUSED', 'FUSES', 'FUZZY', 'GAINS', 'GALES', 'GAMED', 'GAMES', 'GANGS',
    'GATES', 'GAUGE', 'GAUNT', 'GAUZE', 'GAVEL', 'GEARS', 'GEESE', 'GENES',
    'GENRE', 'GERMS', 'GIANT', 'GIFTS', 'GILLS', 'GIRLS', 'GIVEN', 'GIVER',
    'GIVES', 'GLAND', 'GLARE', 'GLASS', 'GLAZE', 'GLEAM', 'GLEAN', 'GLIDE',
    'GLINT', 'GLOBE', 'GLOOM', 'GLORY', 'GLOSS', 'GLOVE', 'GLUED', 'GLUES',
    'GNARL', 'GNASH', 'GNATS', 'GNOME', 'GOALS', 'GOATS', 'GODLY', 'GOING',
    'GOLDS', 'GOLFS', 'GOLLY', 'GONER', 'GONGS', 'GOODS', 'GOOEY', 'GOOFY',
    'GOOSE', 'GORED', 'GORGE', 'GORSE', 'GOUGE', 'GOURDS', 'GRACE', 'GRADE',
    'GRAFT', 'GRAIL', 'GRAIN', 'GRAND', 'GRANT', 'GRAPE', 'GRAPH', 'GRASP',
    'GRASS', 'GRATE', 'GRAVE', 'GRAVY', 'GRAZE', 'GREAT', 'GREED', 'GREEN',
    'GREET', 'GRILL', 'GRIME', 'GRIMY', 'GRIND', 'GRINS', 'GRIPE', 'GRIST',
    'GROOM', 'GROPE', 'GROSS', 'GROUP', 'GROVE', 'GROWL', 'GROWN', 'GROWS',
    'GRUEL', 'GRUNT', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'GUIDS', 'GUILD',
    'GUILT', 'GUISE', 'GULCH', 'GULFS', 'GULLS', 'GULPS', 'GUMMY', 'GUNGE',
    'GUNKY', 'GUSTS', 'GUSTY', 'GYPSY', 'HABIT', 'HACKS', 'HAIKU', 'HAILS',
    'HAIRS', 'HAIRY', 'HALTS', 'HALVE', 'HANDY', 'HANGS', 'HAPPY', 'HARKS',
    'HARMS', 'HARSH', 'HASTE', 'HASTY', 'HATCH', 'HATED', 'HATER', 'HATES',
    'HAULS', 'HAUNT', 'HAVEN', 'HAVES', 'HAVOC', 'HAWKS', 'HAYAK', 'HAZED',
    'HAZEL', 'HAZES', 'HEADS', 'HEALS', 'HEAPS', 'HEARD', 'HEARS', 'HEART',
    'HEATS', 'HEAVE', 'HEAVY', 'HEDGE', 'HEEDS', 'HEELS', 'HEFTY', 'HEIRS',
    'HEIST', 'HELIX', 'HELLO', 'HELMS', 'HELPS', 'HENCE', 'HENNA', 'HENRY',
    'HERBS', 'HERDS', 'HERMS', 'HERON', 'HEROS', 'HERONS', 'HIDER', 'HIDES',
    'HIGHS', 'HIKES', 'HILLS', 'HILTS', 'HINDS', 'HINGE', 'HINTS', 'HIPPO',
    'HIRES', 'HITCH', 'HIVES', 'HOARD', 'HOARS', 'HOARY', 'HOIST', 'HOLDS',
    'HOLES', 'HOLLY', 'HOLMS', 'HOMED', 'HOMER', 'HOMES', 'HONED', 'HONES',
    'HONKS', 'HONOR', 'HOODS', 'HOOFS', 'HOOKS', 'HOOPS', 'HOOTS', 'HOPED',
    'HOPES', 'HORDE', 'HORNS', 'HORNY', 'HORSE', 'HOSES', 'HOSTS', 'HOTLY',
    'HOUND', 'HOURS', 'HOUSE', 'HOVEL', 'HOVER', 'HOWDY', 'HOWLS', 'HUBBY',
    'HUFFS', 'HUFFY', 'HULKS', 'HULLS', 'HUMID', 'HUMPS', 'HUMUS', 'HUMPY',
    'HUNKS', 'HUNKY', 'HUNTS', 'HURLS', 'HURRY', 'HURST', 'HURTS', 'HUSKY',
    'HUSKS', 'HUSSY', 'HUTCH', 'HYENA', 'HYMNS', 'HYPER', 'ICIER', 'ICONS',
    'ICING', 'IDEAL', 'IDEAS', 'IDIOM', 'IDIOT', 'IDLES', 'IDOLS', 'IDYLL',
    'IGLOO', 'IMAGE', 'IMBED', 'IMPLY', 'IMPOD', 'INANE', 'INARM', 'INBOX',
    'INCUR', 'INDIA', 'INERT', 'INFER', 'INFOS', 'INFRA', 'INTER', 'INGOT',
    'INGLE', 'INGOT', 'INKED', 'INKER', 'INLAY', 'INLET', 'INNER', 'INPUT',
    'INSET', 'INTER', 'INTONE', 'IODID', 'IODINE', 'IRATE', 'IRIS', 'IRKED',
    'IRONY', 'IRONS', 'ISSUE', 'ITEMS', 'ITCHY', 'IVIED', 'IVORY', 'JACKS',
    'JACOB', 'JADED', 'JADES', 'JAGGY', 'JAILS', 'JAUNT', 'JAVAL', 'JAWED',
    'JEANS', 'JEEPS', 'JEERS', 'JELLO', 'JELLS', 'JESTS', 'JESUS', 'JEWEL',
    'JEWLY', 'JIFFY', 'JIHAD', 'JILT', 'JIMMY', 'JINGO', 'JINNS', 'JOINT',
    'JOIST', 'JOKER', 'JOKES', 'JOLLY', 'JOLTS', 'JOUST', 'JOWLS', 'JOWLY',
    'JOYEA', 'JOYED', 'JUDGE', 'JUDOS', 'JUICE', 'JUICY', 'JULEP', 'JUMBO',
    'JUMPS', 'JUMPY', 'JUNCO', 'JUNKS', 'JUNKY', 'JUROR', 'JURAT', 'JUROR',
    'JUSTE', 'KAFKA', 'KAYAK', 'KEBAB', 'KEDGE', 'KEELS', 'KEEPS', 'KEGS',
    'KELPS', 'KEMPT', 'KELLY', 'KENTE', 'KENTS', 'KEPT', 'KERBS', 'KERNS',
    'KERRY', 'KETCH', 'KETCH', 'KETOS', 'KETTLE', 'KHAKI', 'KHANS', 'KIANG',
    'KICKS', 'KIDDO', 'KIDDY', 'KIDS', 'KILLED', 'KILLS', 'KILNS', 'KILTS',
    'KINDLY', 'KINDS', 'KINKY', 'KINKS', 'KINOS', 'KINSE', 'KIOSK', 'KIRKS',
    'KITES', 'KITTY', 'KNACK', 'KNAGS', 'KNAVE', 'KNEAD', 'KNEEL', 'KNELT',
    'KNIFE', 'KNIGH', 'KNILL', 'KNITS', 'KNOBS', 'KNOCK', 'KNOLL', 'KNOTS',
    'KNOTTY', 'KNOWN', 'KNOWS', 'KNURL', 'KNURL', 'KOALA', 'KOOKS', 'KOOKY',
    'KOREA', 'KOSER', 'KRAFT', 'LABEL', 'LACER', 'LACES', 'LACKS', 'LACEY',
    'LADED', 'LADES', 'LADLE', 'LAGER', 'LAGES', 'LAHAB', 'LAIRD', 'LAIRY',
    'LAKES', 'LAKHS', 'LAKER', 'LAKING', 'LALAS', 'LALOM', 'LAMAS', 'LAMBS',
    'LAMED', 'LAMER', 'LAMES', 'LAMIA', 'LAMMY', 'LAMPS', 'LAMPS', 'LANCE',
    'LANDS', 'LANES', 'LANKY', 'LANNA', 'LANOS', 'LANSY', 'LANTA', 'LAPEL',
    'LAPIN', 'LAPIS', 'LAPSE', 'LARDS', 'LARDY', 'LARGE', 'LARGO', 'LARKS',
    'LARKY', 'LARVA', 'LASED', 'LASER', 'LASES', 'LASSO', 'LASTS', 'LATCH',
    'LATED', 'LATEN', 'LATER', 'LATES', 'LATHE', 'LATHS', 'LATINS', 'LATTE',
    'LAUDA', 'LAUDS', 'LAUGH', 'LAULA', 'LAULT', 'LAURA', 'LAURAL', 'LAURE',
    'LAURY', 'LAVED', 'LAVEL', 'LAVEN', 'LAVER', 'LAVES', 'LAVIN', 'LAVIS',
    'LAVYS', 'LAWED', 'LAWED', 'LAWLY', 'LAWNS', 'LAWNY', 'LAWSE', 'LAYBY',
    'LAYER', 'LAYIN', 'LAYME', 'LAYUP', 'LAZED', 'LAZES', 'LAZIN', 'LAZIO',
    'LAZES', 'LAZOS', 'LAZY', 'LEADS', 'LEADY', 'LEAFS', 'LEAFY', 'LEAKS',
    'LEAKY', 'LEALS', 'LEANS', 'LEANT', 'LEANY', 'LEAPS', 'LEAPT', 'LEARS',
    'LEARN', 'LEASE', 'LEASH', 'LEAST', 'LEATH', 'LEAVE', 'LEAVY', 'LEDGE',
    'LEDGY', 'LEDUM', 'LEERS', 'LEERY', 'LEEST', 'LEFTE', 'LEFTY', 'LEGAL',
    'LEGAN', 'LEGER', 'LEGES', 'LEGGING', 'LEGGY', 'LEGIT', 'LEGUME', 'LEHIM',
    'LEICA', 'LEIDA', 'LEIGH', 'LEILA', 'LEIME', 'LEINA', 'LEINE', 'LEINS',
    'LEIPE', 'LEIPO', 'LEIPS', 'LEISH', 'LEIST', 'LEITE', 'LEITH', 'LEJAN',
    'LEJEN', 'LEJEU', 'LEKHS', 'LEKES', 'LEKHS', 'LEKKA', 'LEKKS', 'LEKYA',
    'LELAH', 'LELAM', 'LELAN', 'LELAY', 'LELEH', 'LELEW', 'LELEY', 'LELIE',
    'LEMES', 'LEMME', 'LEMMY', 'LEMON', 'LEMMA', 'LEMUR', 'LENAE', 'LENAD',
    'LENAS', 'LENES', 'LENGS', 'LENIA', 'LENIE', 'LENIN', 'LENIS', 'LENNA',
    'LENNE', 'LENNO', 'LENNY', 'LENOS', 'LENYA', 'LEONE', 'LEONS', 'LEONY',
    'LEOTA', 'LEPAS', 'LEPEE', 'LEPER', 'LEPES', 'LEPID', 'LEPIA', 'LEPIS',
    'LEPTA', 'LEPTS', 'LEPTON', 'LEQUE', 'LERCH', 'LERES', 'LERKE', 'LERMA',
    'LERMA', 'LERNA', 'LERMY', 'LEROI', 'LEROS', 'LEROY', 'LESBY', 'LESBO',
    'LESCH', 'LESEU', 'LESHA', 'LESHE', 'LESIN', 'LESIO', 'LESKY', 'LESLI',
    'LESLIE', 'LESLY', 'LESME', 'LESNA', 'LESNE', 'LESOL', 'LESOP', 'LESOT',
    'LESOM', 'LESPT', 'LESRO', 'LESRU', 'LESSA', 'LESSE', 'LESSH', 'LESSY',
    'LESTS', 'LESUM', 'LESUN', 'LESUT', 'LESVA', 'LESVE', 'LESVI', 'LESVO',
    'LESYA', 'LETAL', 'LETAM', 'LETAR', 'LETAS', 'LETAT', 'LETAU', 'LETEL',
    'LETEM', 'LETEN', 'LETEL', 'LETER', 'LETES', 'LETHE', 'LETHES', 'LETHIED',
    'LETIA', 'LETIE', 'LETIG', 'LETIM', 'LETIN', 'LETIS', 'LETIT', 'LETIU',
    'LETIV', 'LETIX', 'LETIZ', 'LETKE', 'LETLA', 'LETLI', 'LETLY', 'LETMA',
    'LETME', 'LETMI', 'LETMO', 'LETMU', 'LETMY', 'LETNA', 'LETNE', 'LETNI',
    'LETNO', 'LETNY', 'LETOE', 'LETOI', 'LETOM', 'LETON', 'LETOP', 'LETOR',
    'LETOS', 'LETOT', 'LETOU', 'LETOY', 'LETPE', 'LETPI', 'LETPO', 'LETPR',
    'LETPT', 'LETPU', 'LETPY', 'LETQA', 'LETQE', 'LETQI', 'LETQO', 'LETQY',
    'LETRA', 'LETRD', 'LETRE', 'LETRI', 'LETRO', 'LETRU', 'LETRY', 'LETSE',
    'LETSI', 'LETSO', 'LETSU', 'LETSY', 'LETTA', 'LETTE', 'LETTI', 'LETTO',
    'LETTU', 'LETTY', 'LETUA', 'LETUE', 'LETUI', 'LETUO', 'LETUU', 'LETUY',
    'LETVA', 'LETVI', 'LETVO', 'LETVU', 'LETVY', 'LETWA', 'LETWE', 'LETWI',
    'LETWO', 'LETWU', 'LETWY', 'LETXA', 'LETXE', 'LETXI', 'LETXO', 'LETXY',
    'LETYA', 'LETYE', 'LETYI', 'LETYO', 'LETYY', 'LETZA', 'LETZE', 'LETZI',
    'LETZO', 'LETZY', 'LEVEE', 'LEVEL', 'LEVEN', 'LEVER', 'LEVES', 'LEVEY',
    'LEVEY', 'LEVEY', 'LEVEY', 'LEVI', 'LEVIN', 'LEVIS', 'LEVIT', 'LEVON',
    'LEVOY', 'LEVRA', 'LEVSE', 'LEVUE', 'LEVUN', 'LEVYA', 'LEVYE', 'LEVYI',
    'LEVYO', 'LEVYU', 'LEVYY', 'LEWAM', 'LEWIE', 'LEWIS', 'LEWLE', 'LEWON',
    'LEWYN', 'LEXA', 'LEXAN', 'LEXER', 'LEXES', 'LEXIA', 'LEXIE', 'LEXII',
    'LEXIN', 'LEXIS', 'LEXON', 'LEXUS', 'LEXYA', 'LEXYE', 'LEXYI', 'LEXYO',
    'LEXYU', 'LEXZY', 'LEYBA', 'LEYDA', 'LAYED', 'LAYED', 'LAYEE', 'LAYED',
    'LAYEE', 'LAYEI', 'LAYEO', 'LAYAN', 'LAYAR', 'LAYAS', 'LAYAT', 'LAYAU',
    'LAYAW', 'LAYAX', 'LAYAY', 'LAYAZ', 'LAYBA', 'LAYBD', 'LAYBE', 'LAYBI',
    'LAYBO', 'LAYBU', 'LAYBY', 'LAYCA', 'LAYCD', 'LAYCE', 'LAYCI', 'LAYCO',
    'LAYCU', 'LAYCY', 'LAYDA', 'LAYDED', 'LAYED', 'LAYED', 'LAYEI', 'LAYEO',
    'LAYER', 'LAYES', 'LAYET', 'LAYEU', 'LAYEX', 'LAYEY', 'LAYEZ', 'LAYFA',
    'LAYFD', 'LAYFE', 'LAYFI', 'LAYFO', 'LAYFU', 'LAYFY', 'LAYGA', 'LAYGD',
    'LAYGE', 'LAYGI', 'LAYGO', 'LAYGU', 'LAYGY', 'LAYHA', 'LAYHD', 'LAYHE',
    'LAYHI', 'LAYHO', 'LAYHU', 'LAYHY', 'LAYIA', 'LAYID', 'LAYIE', 'LAYII',
    'LAYIO', 'LAYIU', 'LAYIY', 'LAYJA', 'LAYJD', 'LAYJE', 'LAYJI', 'LAYJO',
    'LAYJU', 'LAYJY', 'LAYKA', 'LAYKD', 'LAYKE', 'LAYKI', 'LAYKO', 'LAYKU',
    'LAYKY', 'LAYLA', 'LAYLD', 'LAYLE', 'LAYLI', 'LAYLO', 'LAYLU', 'LAYLY',
    'LAYMA', 'LAYMD', 'LAYME', 'LAYMI', 'LAYMO', 'LAYMU', 'LAYMY', 'LAYNA',
    'LAYND', 'LAYNE', 'LAYNI', 'LAYNO', 'LAYNU', 'LAYNY', 'LAYOA', 'LAYOD',
    'LAYOE', 'LAYOI', 'LAYOO', 'LAYOU', 'LAYOY', 'LAYPA', 'LAYPD', 'LAYPE',
    'LAYPI', 'LAYPO', 'LAYPU', 'LAYPY', 'LAYQA', 'LAYQD', 'LAYQE', 'LAYQI',
    'LAYQO', 'LAYQU', 'LAYQY', 'LAYRA', 'LAYRD', 'LAYRE', 'LAYRI', 'LAYRO',
    'LAYRU', 'LAYRY', 'LAYSA', 'LAYSD', 'LAYSE', 'LAYSI', 'LAYSO', 'LAYSU',
    'LAYSY', 'LAYTA', 'LAYTD', 'LAYTE', 'LAYTI', 'LAYTO', 'LAYTU', 'LAYTY',
    'LAYUA', 'LAYUD', 'LAYUE', 'LAYUI', 'LAYUO', 'LAYUU', 'LAYUY', 'LAYVA',
    'LAYVD', 'LAYVE', 'LAYVI', 'LAYVO', 'LAYVU', 'LAYVY', 'LAYWA', 'LAYWD',
    'LAYWE', 'LAYWI', 'LAYWO', 'LAYWU', 'LAYWY', 'LAYXA', 'LAYXD', 'LAYXE',
    'LAYXI', 'LAYXO', 'LAYXU', 'LAYXY', 'LAYYA', 'LAYYD', 'LAYYE', 'LAYYI',
    'LAYYO', 'LAYYU', 'LAZZL', 'LAZZI', 'LAZY', 'OZONE', 'PANIC', 'PARTY',
    'PASTE', 'PATCH', 'PATHS', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE',
    'PLAYS', 'PLAZA', 'PLEASE', 'POINT', 'POKER', 'POLAR', 'POUND', 'POWER',
    'PRAISE', 'PRIDE', 'PRIME', 'PRINT', 'PRIZE', 'PROOF', 'PROPS', 'PROUD',
    'PROVE', 'PRUNE', 'PSALM', 'PULSE', 'PUMP', 'PUNKS', 'PUPIL', 'QUOTE',
    'QUIET', 'QUILT', 'QUIRK', 'QUITE', 'QUOTA', 'QUOTE', 'QURAN', 'RABID',
    'RACER', 'RACES', 'RACKS', 'RADAR', 'RADIO', 'RADII', 'RADIX', 'RADON',
    'RAFTS', 'RAGAS', 'RAGED', 'RAGES', 'RAIDS', 'RAILS', 'RAINS', 'RAINY',
    'RAISE', 'RAKED', 'RAKER', 'RAKES', 'RALLY', 'RAMPS', 'RANCH', 'RANDS',
    'RANDY', 'RANGE', 'RANGY', 'RANKS', 'RANTS', 'RAPED', 'RAPES', 'RAPID',
    'RARITY', 'RASPS', 'RASPY', 'RATED', 'RATER', 'RATES', 'RATIO', 'RATTY',
    'RAVED', 'RAVEL', 'RAVEN', 'RAVER', 'RAVES', 'RAVIN', 'RAWER', 'RAWLY',
    'RAXED', 'RAXES', 'RAYAS', 'RAYED', 'RAYON', 'RAZED', 'RAZER', 'RAZES',
    'RAZOR', 'REACH', 'REACT', 'READS', 'READY', 'REALM', 'REALS', 'REAMS',
    'REAPS', 'REARS', 'REBEL', 'REBID', 'REBUD', 'REBUT', 'RECAP', 'RECIT',
    'RECUR', 'REDO', 'REDOS', 'REDYE', 'REEDE', 'REEDS', 'REEDY', 'REEFS',
    'REEFY', 'REEK', 'REEKS', 'REEKY', 'REELS', 'REFER', 'REFIT', 'REFRY',
    'REGAL', 'REGEL', 'REGES', 'REGES', 'REGIN', 'REGNA', 'REGNA', 'REGNA',
    'REGES', 'REGOS', 'REGNA', 'REGNA', 'REGOS', 'REHAB', 'REHAT', 'REHAU',
    'REHEM', 'REHEM', 'REHIT', 'REHIT', 'REHOP', 'REHOP', 'REHOW', 'REHOW',
    'REHUA', 'REHUA', 'REICE', 'REICE', 'REIDS', 'REIDS', 'REIGN', 'REIFY',
    'REJIG', 'REJIG', 'REJOY', 'REJOY', 'REJOY', 'REJOY', 'REJOY', 'RELAD',
    'RELAD', 'RELAF', 'RELAF', 'RELAT', 'RELAT', 'RELAX', 'RELAX', 'RELAX',
    'RELAY', 'RELAY', 'RELAY', 'RELEE', 'RELEE', 'RELES', 'RELES', 'RELIE',
    'RELIE', 'RELIE', 'RELIE', 'RELIE', 'RELIA', 'RELIE', 'RELIE', 'RELIE',
    'RELIE', 'RELIA', 'RELIE', 'RELIE', 'RELIE', 'RELIM', 'RELIM', 'RELIT',
    'RELIT', 'RELLY', 'RELLY', 'RELOC', 'RELOC', 'RELOC', 'RELOC', 'REMAD',
    'REMAD', 'REMAL', 'REMAL', 'REMAN', 'REMAN', 'REMAP', 'REMAP', 'REMAR',
    'REMAR', 'REMAT', 'REMAT', 'REMAX', 'REMAX', 'REMEA', 'REMEA', 'REMED',
    'REMED', 'REMEL', 'REMEL', 'REMEN', 'REMEN', 'REMET', 'REMET', 'REMEU',
    'REMEU', 'REMEX', 'REMEX', 'REMIA', 'REMIA', 'REMID', 'REMID', 'REMID',
    'REMIC', 'REMIC', 'REMIF', 'REMIF', 'REMIT', 'REMIT', 'REMIT', 'REMIX',
    'REMIX', 'REMIZ', 'REMIZ', 'REMMA', 'REMMA', 'REMOA', 'REMOA', 'REMOB',
    'REMOB', 'REMOC', 'REMOC', 'REMOD', 'REMOD', 'REMOE', 'REMOE', 'REMOE',
    'REMOF', 'REMOF', 'REMOG', 'REMOG', 'REMOG', 'REMOG', 'REMOG', 'REMOG',
    'REMOG', 'REMOG', 'REMOG', 'REMOG', 'REMOG', 'REMOG', 'REMOG', 'REMOG',
    'REMOG', 'REMOG', 'REMOG', 'REMOG', 'REMOG', 'REMOG', 'REMOG', 'REMOG',
    'STONE', 'STUCK', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN',
    'TAKES', 'TALES', 'TALKS', 'TANGO', 'TANKS', 'TASTE', 'TAXED', 'TAXES',
    'TEACH', 'TEAMS', 'TEARS', 'TEASE', 'TEMPO', 'TENDS', 'TENSE', 'TENTH',
    'TERMS', 'TEXAS', 'THANK', 'THAT\'S', 'THATS', 'THEIR', 'THEME', 'THERE',
    'THESE', 'THICK', 'THIEF', 'THIGH', 'THING', 'THINK', 'THIRD', 'THIRST',
    'THOLE', 'THONG', 'THORN', 'THOSE', 'THREE', 'THREW', 'THROB', 'THROW',
    'THUMB', 'THUMP', 'THUS', 'THYME', 'TIARA', 'TICKS', 'TIDAL', 'TIDED',
    'TIDES', 'TIDEY', 'TIFFS', 'TIFFY', 'TIGER', 'TIGHT', 'TIKIS', 'TILDE',
    'TILED', 'TILER', 'TILES', 'TILED', 'TILLS', 'TILTH', 'TILTS', 'TIMED',
    'TIMER', 'TIMES', 'TIMID', 'TINED', 'TINES', 'TINGE', 'TINGS', 'TINNY',
    'TINTS', 'TINTY', 'TIPIS', 'TIPPY', 'TIPSY', 'TIRED', 'TIRES', 'TITAN',
    'TITCH', 'TITER', 'TITHE', 'TITIS', 'TITLE', 'TITUS', 'TOAST', 'TODAY',
    'TODDY', 'TOFUS', 'TOGAE', 'TOGAN', 'TOGAS', 'TOGED', 'TOGAS', 'TOILE',
    'TOILS', 'TOILS', 'TOKED', 'TOKEN', 'TOKES', 'TOKYO', 'TOLAN', 'TOLAR',
    'TOLAS', 'TOLAS', 'TOLAN', 'TOLDO', 'TOLED', 'TOLES', 'TOLLS', 'TOLLY',
    'TOLLS', 'TOLLY', 'TOLLS', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLS',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY',
    'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY', 'TOLLY'
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
