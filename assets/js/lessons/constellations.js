/* Constellations lesson (lessons/cosmology/constellations.html).
 * Moved out of the page's inline <script>, unchanged. */
  (function () {
    'use strict';
    const { angularDistance, affineFromAnchors, formatRa, formatDec } = ConstellationsCore;

    // ── Spectral type colors ──────────────────────────────────────────────
    var TYPE_COLOR = {
      O: '#b0c4ff', B: '#ccd9ff', A: '#eaf0ff',
      F: '#fff6ee', G: '#ffe8c4', K: '#ffcc88', M: '#ff9966'
    };

    // ── Constellation database ─────────────────────────────────────────────
    var CONSTS = {
      orion: {
        name: 'Orion', myth: 'The Hunter',
        season: 'Best seen: December–February',
        story: "Orion's Belt — three stars in a row — points southeast toward Sirius and northwest toward Aldebaran. Betelgeuse is a red supergiant roughly 700 ly away; Rigel burns blue-white at ~860 ly.",
        hud: { ra: '05h 35m', dec: "+05° 26'", alt: '52°', az: '183°' },
        stars: [
          { name: 'Betelgeuse', ra:88.79294, dec:7.40706,   mag:.42,  type:'M', dist:'~700 ly',  note:'Red supergiant, may go supernova' },
          { name: 'Bellatrix',  ra:81.28276, dec:6.34970,   mag:1.64, type:'B', dist:'250 ly',   note:'Blue-white giant, "Amazon Star"' },
          { name: 'Alnitak',    ra:85.18969, dec:-1.94257,  mag:1.74, type:'O', dist:'800 ly',   note:'Easternmost star of the Belt' },
          { name: 'Alnilam',    ra:84.05339, dec:-1.20192,  mag:1.69, type:'B', dist:'1,340 ly', note:'Middle star of the Belt' },
          { name: 'Mintaka',    ra:83.00167, dec:-0.29910,  mag:2.23, type:'O', dist:'900 ly',   note:'Belt star closest to celestial equator' },
          { name: 'Saiph',      ra:86.93912, dec:-9.66960,  mag:2.06, type:'B', dist:'720 ly',   note:'SW knee of Orion' },
          { name: 'Rigel',      ra:78.63447, dec:-8.20164,  mag:.13,  type:'B', dist:'860 ly',   note:'Blue supergiant, brightest in Orion' }
        ],
        lines: [[0,2],[1,4],[2,3],[3,4],[2,5],[4,6],[5,6]]
      },
      ursa: {
        name: 'Ursa Major', myth: 'The Great Bear',
        season: 'Circumpolar for northern observers',
        story: "The Big Dipper is an asterism inside Ursa Major. Dubhe and Merak — the pointer stars — aim toward Polaris about 5× their separation away. Great target for finding north.",
        hud: { ra: '11h 03m', dec: "+61° 45'", alt: '68°', az: '005°' },
        stars: [
          { name: 'Dubhe',  ra:165.93196, dec:61.75103, mag:1.79, type:'K', dist:'124 ly', note:'Northern pointer to Polaris' },
          { name: 'Merak',  ra:165.46033, dec:56.38243, mag:2.37, type:'A', dist:'79 ly',  note:'Southern pointer to Polaris' },
          { name: 'Phecda', ra:178.45770, dec:53.69476, mag:2.44, type:'A', dist:'84 ly',  note:'Bottom of the Dipper bowl' },
          { name: 'Megrez', ra:183.85650, dec:57.03262, mag:3.31, type:'A', dist:'81 ly',  note:'Handle-bowl junction, faintest' },
          { name: 'Alioth', ra:193.50729, dec:55.95982, mag:1.77, type:'A', dist:'81 ly',  note:'Brightest star in the Dipper' },
          { name: 'Mizar',  ra:200.98142, dec:54.92535, mag:2.23, type:'A', dist:'78 ly',  note:'Famous naked-eye double star' },
          { name: 'Alkaid', ra:206.88516, dec:49.31327, mag:1.86, type:'B', dist:'101 ly', note:'Tip of the Dipper handle' }
        ],
        lines: [[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]]
      },
      cassiopeia: {
        name: 'Cassiopeia', myth: 'The Queen',
        season: 'Often visible all night in northern skies',
        story: "Cassiopeia's bright W or M shape sits opposite the Big Dipper across Polaris, in a dense stretch of the Milky Way. Rich hunting ground for binoculars and small telescopes.",
        hud: { ra: '01h 09m', dec: "+59° 09'", alt: '75°', az: '347°' },
        stars: [
          { name: 'Schedar',   ra:10.12685, dec:56.53733, mag:2.24, type:'K', dist:'228 ly', note:'Alpha Cas, orange giant' },
          { name: 'Caph',      ra:2.29452,  dec:59.14978, mag:2.28, type:'F', dist:'54 ly',  note:'Beta Cas, pulsating delta Scuti star' },
          { name: 'Gamma Cas', ra:14.17721, dec:60.71674, mag:2.15, type:'B', dist:'610 ly', note:'Center of W, variable Be star' },
          { name: 'Ruchbah',   ra:21.45396, dec:60.23528, mag:2.68, type:'A', dist:'100 ly', note:'Delta Cas, eclipsing binary' },
          { name: 'Segin',     ra:28.59889, dec:63.67010, mag:3.35, type:'B', dist:'440 ly', note:'Epsilon Cas, end of W' }
        ],
        lines: [[1,0],[0,2],[2,3],[3,4]]
      },
      cygnus: {
        name: 'Cygnus', myth: 'The Swan',
        season: 'High in summer and fall evenings',
        story: "Cygnus soars along the Milky Way. Deneb forms the Summer Triangle with Vega and Altair. Albireo at the head is one of the most beautiful double stars — gold and sapphire blue.",
        hud: { ra: '20h 41m', dec: "+45° 16'", alt: '70°', az: '062°' },
        stars: [
          { name: 'Deneb',       ra:310.35798, dec:45.28034, mag:1.25, type:'A', dist:'~2,600 ly', note:'One of the most luminous stars known' },
          { name: 'Sadr',        ra:305.55709, dec:40.25668, mag:2.23, type:'F', dist:'1,800 ly',  note:'Gamma Cyg, heart of the cross' },
          { name: 'Gienah',      ra:311.55280, dec:33.97033, mag:2.48, type:'K', dist:'72 ly',     note:'West wing of the Swan' },
          { name: 'Delta Cygni', ra:296.24365, dec:45.13081, mag:2.86, type:'B', dist:'165 ly',    note:'East wing of the Swan' },
          { name: 'Albireo',     ra:292.68032, dec:27.95967, mag:3.05, type:'K', dist:'430 ly',    note:'Stunning gold-and-blue double star' }
        ],
        lines: [[0,1],[1,2],[1,3],[1,4]]
      },
      aries: {
        name: 'Aries', myth: 'The Ram',
        season: 'Best seen: October–December',
        story: "Aries is a compact, gently curving line of stars. Hamal marks the ram's head, while Sheratan and Mesarthim form the horns. The Sun passes through this official sky region in late April and May.",
        hud: { ra: '02h 15m', dec: "+21° 00'", alt: '—', az: '—' },
        stars: [
          { name:'Hamal',     ra:31.79336, dec:23.46242, mag:2.01, type:'K', dist:'66 ly',  note:'Alpha Arietis, an orange giant' },
          { name:'Sheratan',  ra:28.66005, dec:20.80803, mag:2.65, type:'A', dist:'59 ly',  note:'Beta Arietis, a close binary system' },
          { name:'Mesarthim', ra:28.38256, dec:19.29386, mag:3.86, type:'A', dist:'164 ly', note:'Gamma Arietis, a telescopic double star' },
          { name:'Botein',    ra:47.90736, dec:19.72667, mag:4.37, type:'G', dist:'165 ly', note:'Delta Arietis, an evolved giant star' }
        ],
        lines: [[2,1],[1,0],[0,3]]
      },
      taurus: {
        name: 'Taurus', myth: 'The Bull',
        season: 'Best seen: November–January',
        story: "Aldebaran marks the Bull's fiery eye near the V-shaped Hyades. Two long lines reach toward the horn tips Elnath and Tianguan. The Pleiades cluster lies on Taurus's shoulder.",
        hud: { ra: '04h 50m', dec: "+20° 00'", alt: '—', az: '—' },
        stars: [
          { name:'Aldebaran', ra:68.98016, dec:16.50930, mag:0.86, type:'K', dist:'67 ly',  note:'Alpha Tauri, the orange eye of the Bull' },
          { name:'Elnath',    ra:81.57297, dec:28.60745, mag:1.65, type:'B', dist:'134 ly', note:'Beta Tauri, northern horn tip' },
          { name:'Tianguan',  ra:84.41119, dec:21.14254, mag:3.03, type:'B', dist:'445 ly', note:'Zeta Tauri, southern horn tip' },
          { name:'Ain',       ra:67.15417, dec:19.18043, mag:3.53, type:'G', dist:'146 ly', note:'Epsilon Tauri, a Hyades giant' },
          { name:'Hyadum I',  ra:64.94835, dec:15.62764, mag:3.65, type:'G', dist:'151 ly', note:'Gamma Tauri, tip of the Hyades V' },
          { name:'Hyadum II', ra:65.73373, dec:17.54251, mag:3.76, type:'G', dist:'161 ly', note:'Delta Tauri, part of the Hyades' }
        ],
        lines: [[0,1],[0,2],[0,3],[3,5],[5,4]]
      },
      gemini: {
        name: 'Gemini', myth: 'The Twins',
        season: 'Best seen: December–February',
        story: "Castor and Pollux are the bright heads of the celestial twins. Two roughly parallel chains of stars extend toward their feet, making Gemini easy to recognize above Orion in northern winter skies.",
        hud: { ra: '07h 05m', dec: "+24° 00'", alt: '—', az: '—' },
        stars: [
          { name:'Castor',  ra:113.64947, dec:31.88828, mag:1.58, type:'A', dist:'51 ly',    note:'Alpha Geminorum, a six-star system' },
          { name:'Pollux',  ra:116.32896, dec:28.02620, mag:1.14, type:'K', dist:'34 ly',    note:'Beta Geminorum, the brighter twin' },
          { name:'Alhena',  ra:99.42796,  dec:16.39928, mag:1.92, type:'A', dist:'109 ly',   note:'Gamma Geminorum, Pollux’s foot' },
          { name:'Wasat',   ra:110.03073, dec:21.98230, mag:3.53, type:'F', dist:'61 ly',    note:'Delta Geminorum, near the ecliptic' },
          { name:'Mebsuta', ra:100.98303, dec:25.13113, mag:2.98, type:'G', dist:'870 ly',   note:'Epsilon Geminorum, Castor’s leg' },
          { name:'Mekbuda', ra:106.02721, dec:20.57030, mag:3.79, type:'G', dist:'~1,060 ly',note:'Zeta Geminorum, a Cepheid variable' },
          { name:'Tejat',   ra:95.74011,  dec:22.51358, mag:2.87, type:'M', dist:'232 ly',   note:'Mu Geminorum, a red giant' },
          { name:'Propus',  ra:93.71936,  dec:22.50679, mag:3.28, type:'M', dist:'689 ly',   note:'Eta Geminorum, near the foot of Castor' }
        ],
        lines: [[0,1],[0,4],[4,6],[6,7],[1,3],[3,2],[3,5],[5,4]]
      },
      cancer: {
        name: 'Cancer', myth: 'The Crab',
        season: 'Best seen: January–March',
        story: "Cancer is the faintest zodiac constellation. Its small Y-shaped pattern surrounds the Beehive Cluster, M44, which appears as a misty patch to unaided eyes under dark skies.",
        hud: { ra: '08h 43m', dec: "+18° 00'", alt: '—', az: '—' },
        stars: [
          { name:'Tarf',              ra:124.12884, dec:9.18554,  mag:3.52, type:'K', dist:'323 ly', note:'Beta Cancri, the Crab’s brightest star' },
          { name:'Acubens',           ra:134.62168, dec:11.85768, mag:4.25, type:'A', dist:'178 ly', note:'Alpha Cancri, the southern claw' },
          { name:'Asellus Borealis',  ra:130.82145, dec:21.46850, mag:4.65, type:'A', dist:'175 ly', note:'Gamma Cancri, northern donkey star' },
          { name:'Asellus Australis', ra:131.17125, dec:18.15431, mag:3.94, type:'K', dist:'137 ly', note:'Delta Cancri, beside the Beehive Cluster' },
          { name:'Iota Cancri',       ra:131.67425, dec:28.75989, mag:4.02, type:'G', dist:'347 ly', note:'A colorful visual double star' }
        ],
        lines: [[0,3],[3,1],[3,2],[2,4]]
      },
      virgo: {
        name: 'Virgo', myth: 'The Maiden',
        season: 'Best seen: March–May',
        story: "Blue-white Spica anchors Virgo near the ecliptic. The constellation stretches across a large spring sky region that also contains the nearby Virgo Cluster of galaxies.",
        hud: { ra: '12h 45m', dec: "+00° 00'", alt: '—', az: '—' },
        stars: [
          { name:'Spica',       ra:201.29825, dec:-11.16132, mag:0.97, type:'B', dist:'250 ly', note:'Alpha Virginis, a close binary pair' },
          { name:'Porrima',     ra:190.41512, dec:-1.44940,  mag:2.74, type:'F', dist:'39 ly',  note:'Gamma Virginis, a famous binary' },
          { name:'Vindemiatrix',ra:195.54415, dec:10.95915,  mag:2.79, type:'G', dist:'108 ly', note:'Epsilon Virginis, the grape gatherer' },
          { name:'Heze',        ra:203.67330, dec:-0.59582,  mag:3.38, type:'A', dist:'75 ly',  note:'Zeta Virginis, a fast-spinning star' },
          { name:'Zaniah',      ra:184.97643, dec:-0.66680,  mag:3.90, type:'A', dist:'248 ly', note:'Eta Virginis, a multiple-star system' },
          { name:'Zavijava',    ra:177.67383, dec:1.76472,   mag:3.60, type:'F', dist:'36 ly',  note:'Beta Virginis, a nearby Sun-like star' }
        ],
        lines: [[0,1],[1,2],[1,3],[1,4],[4,5]]
      },
      libra: {
        name: 'Libra', myth: 'The Scales',
        season: 'Best seen: April–June',
        story: "Libra is the zodiac's only traditional inanimate figure. Its four principal stars form a tilted quadrilateral between Virgo and Scorpius; their names preserve an older association with the Scorpion's claws.",
        hud: { ra: '15h 13m', dec: "-16° 00'", alt: '—', az: '—' },
        stars: [
          { name:'Zubenelgenubi',  ra:222.71964, dec:-16.04178, mag:2.75, type:'A', dist:'76 ly',  note:'Alpha Librae, the southern claw' },
          { name:'Zubeneschamali', ra:229.25172, dec:-9.38291,  mag:2.62, type:'B', dist:'185 ly', note:'Beta Librae, the northern claw' },
          { name:'Zubenelhakrabi', ra:233.88158, dec:-14.78954, mag:3.91, type:'G', dist:'161 ly', note:'Gamma Librae, an orange giant' },
          { name:'Brachium',       ra:226.01756, dec:-25.28197, mag:3.21, type:'M', dist:'260 ly', note:'Sigma Librae, a red giant' }
        ],
        lines: [[0,1],[1,2],[2,3],[3,0]]
      },
      scorpius: {
        name: 'Scorpius', myth: 'The Scorpion',
        season: 'Best seen: June–July, low in south',
        story: "One of the few constellations that genuinely resembles its namesake. Antares — 'rival of Mars' — blazes red at the heart. The tail curves toward the Milky Way core, rich with clusters.",
        hud: { ra: '16h 29m', dec: "-26° 26'", alt: '22°', az: '195°' },
        stars: [
          { name: 'Antares',  ra:247.35192, dec:-26.43200, mag:1.06, type:'M', dist:'550 ly',  note:'Red supergiant, heart of Scorpius' },
          { name: 'Acrab',    ra:241.35929, dec:-19.80539, mag:2.50, type:'B', dist:'530 ly',  note:'Beta Scorpii, a multiple-star system' },
          { name: 'Dschubba', ra:240.08336, dec:-22.62171, mag:2.32, type:'B', dist:'400 ly',  note:'Delta Scorpii, variable Be star' },
          { name: 'Fang',     ra:239.71297, dec:-26.11411, mag:2.89, type:'B', dist:'~590 ly', note:'Pi Scorpii, one of the scorpion’s claws' },
          { name: 'Sargas',   ra:264.32971, dec:-42.99783, mag:1.86, type:'F', dist:'270 ly',  note:'Theta Sco, bright tail star' },
          { name: 'Lesath',   ra:262.69099, dec:-37.29581, mag:2.69, type:'B', dist:'530 ly',  note:'Upsilon Sco, stinger companion' },
          { name: 'Shaula',   ra:263.40217, dec:-37.10382, mag:1.62, type:'B', dist:'570 ly',  note:'Lambda Sco, tip of the stinger' }
        ],
        lines: [[1,2],[2,3],[2,0],[0,4],[4,5],[5,6]]
      },
      sagittarius: {
        name: 'Sagittarius', myth: 'The Archer',
        season: 'Best seen: June–August',
        story: "Sagittarius's brightest stars form the Teapot asterism. Its spout points toward the dense center of the Milky Way, making this region exceptionally rich in nebulae and star clusters.",
        hud: { ra: '18h 31m', dec: "-29° 00'", alt: '—', az: '—' },
        stars: [
          { name:'Kaus Australis', ra:276.04299, dec:-34.38462, mag:1.81, type:'B', dist:'143 ly', note:'Epsilon Sagittarii, base of the bow' },
          { name:'Kaus Media',     ra:275.24851, dec:-29.82810, mag:2.67, type:'K', dist:'416 ly', note:'Delta Sagittarii, middle of the bow' },
          { name:'Kaus Borealis',  ra:276.99267, dec:-25.42170, mag:2.81, type:'K', dist:'76 ly',  note:'Lambda Sagittarii, top of the Teapot' },
          { name:'Nunki',          ra:283.81636, dec:-26.29672, mag:2.07, type:'B', dist:'228 ly', note:'Sigma Sagittarii, Teapot handle' },
          { name:'Ascella',        ra:285.65304, dec:-29.88006, mag:2.59, type:'A', dist:'88 ly',  note:'Zeta Sagittarii, lower handle star' },
          { name:'Alnasl',         ra:271.45203, dec:-30.42409, mag:2.99, type:'K', dist:'101 ly', note:'Gamma Sagittarii, tip of the arrow' }
        ],
        lines: [[0,1],[1,2],[2,3],[3,4],[4,0],[1,5]]
      },
      capricornus: {
        name: 'Capricornus', myth: 'The Sea-Goat',
        season: 'Best seen: August–September',
        story: "Capricornus is a broad, faint triangular figure in the southern sky. Despite being one of the dimmer zodiac constellations, its shape has represented a hybrid sea-goat since antiquity.",
        hud: { ra: '21h 15m', dec: "-17° 00'", alt: '—', az: '—' },
        stars: [
          { name:'Deneb Algedi', ra:326.76018, dec:-16.12729, mag:2.83, type:'F', dist:'39 ly',  note:'Delta Capricorni, the Sea-Goat’s tail' },
          { name:'Nashira',      ra:325.02269, dec:-16.66237, mag:3.67, type:'F', dist:'171 ly', note:'Gamma Capricorni, a chemically peculiar star' },
          { name:'Dabih',        ra:305.25278, dec:-14.78141, mag:3.08, type:'G', dist:'388 ly', note:'Beta Capricorni, a complex star system' },
          { name:'Algedi',       ra:304.51356, dec:-12.54485, mag:3.58, type:'G', dist:'109 ly', note:'Alpha Capricorni, a naked-eye double' },
          { name:'Omega Cap',    ra:312.95538, dec:-26.91913, mag:4.12, type:'M', dist:'553 ly', note:'A red giant at the southern point' }
        ],
        lines: [[3,2],[2,4],[4,0],[0,1],[1,2]]
      },
      aquarius: {
        name: 'Aquarius', myth: 'The Water-Bearer',
        season: 'Best seen: August–October',
        story: "Aquarius is a large, mostly faint constellation. Sadalmelik and Sadalsuud lead toward the Water Jar, while a chain of stars pours southward toward the bright star Fomalhaut in Piscis Austrinus.",
        hud: { ra: '22h 02m', dec: "-10° 00'", alt: '—', az: '—' },
        stars: [
          { name:'Sadalmelik', ra:331.44598, dec:-0.31985,  mag:2.94, type:'G', dist:'~520–660 ly', note:'Alpha Aquarii, a yellow supergiant' },
          { name:'Sadalsuud',  ra:322.88972, dec:-5.57117,  mag:2.89, type:'G', dist:'546 ly', note:'Beta Aquarii, Aquarius’s brightest star' },
          { name:'Skat',       ra:343.66253, dec:-15.82082, mag:3.28, type:'A', dist:'~160 ly', note:'Delta Aquarii, in the stream of water' },
          { name:'Albali',     ra:311.91896, dec:-9.49578,  mag:3.77, type:'A', dist:'244 ly', note:'Epsilon Aquarii, western water-bearer star' },
          { name:'Sadachbia',  ra:335.41405, dec:-1.38735, mag:3.84, type:'A', dist:'~160 ly', note:'Gamma Aquarii, in the Water Jar' },
          { name:'Ancha',      ra:334.20849, dec:-7.78329,  mag:4.16, type:'G', dist:'~180 ly', note:'Theta Aquarii, the hip of the figure' },
          { name:'Situla',     ra:339.43909, dec:-4.22805,  mag:5.03, type:'K', dist:'222 ly', note:'Kappa Aquarii, named for the water bucket' }
        ],
        lines: [[3,1],[1,0],[0,5],[5,4],[4,2]]
      },
      pisces: {
        name: 'Pisces', myth: 'The Fishes',
        season: 'Best seen: September–November',
        story: "Pisces traces two fish joined by long cords at Alrescha, the knot. The western fish forms the eight-star Circlet, while a long northern cord reaches toward Alpherg and Sigma Piscium.",
        hud: { ra: '01h 05m', dec: "+08° 00'", alt: '—', az: '—' },
        stars: [
          { name:'Sigma Psc',  ra:15.70457,  dec:31.80426, mag:5.50, type:'B', dist:'386 ly', label:false, note:'Northernmost star in this chart figure' },
          { name:'Phi Psc',    ra:18.43728,  dec:24.58370, mag:4.66, type:'K', dist:'399 ly', label:false, note:'An orange giant on the northern fish' },
          { name:'Upsilon Psc',ra:19.86664,  dec:27.26406, mag:4.75, type:'A', dist:'321 ly', label:false, note:'A white main-sequence star' },
          { name:'Alpherg',    ra:22.87087,  dec:15.34583, mag:3.62, type:'G', dist:'373 ly', note:'Eta Piscium, Pisces’s brightest star' },
          { name:'Torcular',   ra:26.34844,  dec:9.15775,  mag:4.26, type:'G', dist:'260 ly', note:'Omicron Piscium, on the northern cord' },
          { name:'Alrescha',   ra:30.51175,  dec:2.76376,  mag:3.82, type:'A', dist:'151 ly', note:'Alpha Piscium, the knot joining the cords' },
          { name:'Xi Psc',     ra:28.38890,  dec:3.18753,  mag:4.60, type:'G', dist:'196 ly', label:false, note:'An orange giant beside Alrescha' },
          { name:'Nu Psc',     ra:25.35789,  dec:5.48761,  mag:4.44, type:'K', dist:'365 ly', label:false, note:'A K-type giant on the cord' },
          { name:'Mu Psc',     ra:22.54631,  dec:6.14382,  mag:4.84, type:'K', dist:'350 ly', label:false, note:'An orange giant on the cord' },
          { name:'Epsilon Psc',ra:15.73587,  dec:7.89013,  mag:4.28, type:'G', dist:'183 ly', label:false, note:'A giant star on the western cord' },
          { name:'62 Psc',     ra:12.07254,  dec:7.29993,  mag:5.91, type:'G', dist:'594 ly', label:false, note:'A faint link in the western cord' },
          { name:'d Piscium',  ra:5.14943,   dec:8.19027,  mag:5.37, type:'K', dist:'462 ly', label:false, note:'A faint orange star on the cord' },
          { name:'Omega Psc',  ra:359.82788, dec:6.86332,  mag:4.03, type:'F', dist:'108 ly', note:'A nearby star approaching the Circlet' },
          { name:'Iota Psc',   ra:354.98767, dec:5.62629,  mag:4.12, type:'F', dist:'45 ly',  note:'The eastern join of the Circlet' },
          { name:'TX Piscium', ra:356.59799, dec:3.48681,  mag:5.02, type:'M', dist:'~800 ly',label:false, note:'A red carbon star in the Circlet' },
          { name:'Lambda Psc', ra:355.51169, dec:1.78004,  mag:4.51, type:'A', dist:'105 ly', label:false, note:'A white star in the Circlet' },
          { name:'Kappa Psc',  ra:351.73315, dec:1.25560,  mag:4.94, type:'A', dist:'161 ly', label:false, note:'A chemically peculiar Circlet star' },
          { name:'Gamma Psc',  ra:349.29140, dec:3.28229,  mag:3.70, type:'G', dist:'135 ly', note:'The brightest star in the Circlet' },
          { name:'7 Piscium',  ra:350.08576, dec:5.38131,  mag:5.07, type:'K', dist:'359 ly', label:false, note:'A Circlet star' },
          { name:'Theta Psc',  ra:351.99206, dec:6.37899,  mag:4.30, type:'K', dist:'170 ly', label:false, note:'An orange giant closing the Circlet' }
        ],
        lines: [
          [0,1],
          [0,2],[2,1],[1,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],
          [9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],
          [16,17],[17,18],[18,19],[19,13]
        ]
      },
      leo: {
        name: 'Leo', myth: 'The Lion',
        season: 'Best seen: February–May',
        story: "Leo's Sickle asterism traces the lion's mane and head; Regulus anchors the base. In spring the Dipper is high northeast — trace a line south to find Leo's head.",
        hud: { ra: '10h 08m', dec: "+11° 58'", alt: '55°', az: '190°' },
        stars: [
          { name: 'Regulus',    ra:152.09296, dec:11.96721, mag:1.35, type:'B', dist:'79 ly',  note:'Heart of the Lion, on the ecliptic' },
          { name: 'Algieba',    ra:154.99313, dec:19.84149, mag:2.01, type:'K', dist:'130 ly', note:'Mane: gorgeous orange double star' },
          { name: 'Adhafera',   ra:154.17256, dec:23.41732, mag:3.43, type:'F', dist:'260 ly', note:'Zeta Leo, top of the Sickle' },
          { name: 'Ras Elased', ra:146.46281, dec:23.77425, mag:2.98, type:'K', dist:'247 ly', note:'Epsilon Leo, head of the Lion' },
          { name: 'Denebola',   ra:177.26491, dec:14.57206, mag:2.14, type:'A', dist:'36 ly',  note:'Beta Leo, tail, relatively close' },
          { name: 'Zosma',      ra:168.52709, dec:20.52372, mag:2.56, type:'A', dist:'58 ly',  note:'Delta Leo, back of the Lion' },
          { name: 'Chertan',    ra:168.56002, dec:15.42957, mag:3.34, type:'A', dist:'165 ly', note:'Theta Leo, rear haunch' }
        ],
        lines: [[3,2],[2,1],[1,0],[0,6],[6,5],[5,4],[1,5]]
      }
    };


    Object.keys(window.CONSTELLATION_PATTERNS || {}).forEach(function(key) {
      var c = CONSTS[key];
      var pattern = window.CONSTELLATION_PATTERNS[key];
      if (!c || !pattern) return;

      c.renderStars = pattern.stars.map(function(row) {
        var catalogStar = {
          hip: row[0],
          ra: row[1],
          dec: row[2],
          mag: row[3],
          type: row[4],
          name: row[5],
          dist: '—',
          note: 'Additional star in the modern line figure.',
          label: false
        };
        var nearest = null;
        var nearestDistance = Infinity;
        c.stars.forEach(function(candidate) {
          var distance = angularDistance(catalogStar, candidate);
          if (distance < nearestDistance) {
            nearest = candidate;
            nearestDistance = distance;
          }
        });
        if (nearest && nearestDistance < 0.06) {
          return Object.assign({}, catalogStar, nearest, {
            hip: catalogStar.hip,
            ra: catalogStar.ra,
            dec: catalogStar.dec,
            label: nearest.label !== false
          });
        }
        return catalogStar;
      });

      c.renderLines = [];
      pattern.lines.forEach(function(polyline) {
        for (var i = 1; i < polyline.length; i++) {
          c.renderLines.push([polyline[i - 1], polyline[i]]);
        }
      });
    });

    // ── State ──────────────────────────────────────────────────────────────
    var activeKey = 'orion';
    var brightness = 1.0;
    var bgDensity = 0.7;
    var showLines = true;
    var showNames = true;
    var showArtwork = true;
    var showMilkyWay = true;
    var lineProgress = 1.0;
    var lineAnimStart = null;
    var LINE_MS = 1100;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var panX = 0, panY = 0;
    var isDragging = false, dragSX, dragSY, panSX, panSY;
    var selectedStarIndex = -1;
    var tooltipPinned = false;

    var hitStars = [];
    var allsky = null;

    var figureImages = {};
    Object.keys(CONSTS).forEach(function(key) {
      var image = new Image();
      image.decoding = 'async';
      image.src = '../../assets/images/lessons/constellations/' + key + '.webp';
      figureImages[key] = image;
    });

    // ── Canvas ─────────────────────────────────────────────────────────────
    var canvas = document.getElementById('obs-canvas');
    var ctx = canvas.getContext('2d');
    var W = 1, H = 1;

    // ── Background star field ──────────────────────────────────────────────
    var BG_TYPES = ['O','B','B','A','A','A','A','F','F','G','G','K','K','M','M'];
    var bgStars = [];

    function genBgStars() {
      bgStars = [];
      for (var i = 0; i < 900; i++) {
        var t = BG_TYPES[Math.floor(Math.random() * BG_TYPES.length)];
        bgStars.push({
          fx: Math.random(), fy: Math.random(),
          r: Math.random() * 1.5 + 0.15,
          baseAlpha: Math.random() * 0.55 + 0.2,
          tOff: Math.random() * Math.PI * 2,
          tSpd: 0.35 + Math.random() * 2.1,
          col: TYPE_COLOR[t]
        });
      }
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ── Draw helpers ───────────────────────────────────────────────────────
    function drawSky() {
      var g = ctx.createRadialGradient(W*.5, H*.42, 0, W*.5, H*.5, Math.max(W,H)*.8);
      g.addColorStop(0, '#0c1d3b');
      g.addColorStop(0.5, '#060e20');
      g.addColorStop(1, '#020507');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function drawMilkyWay() {
      if (!showMilkyWay) return;
      ctx.save();
      ctx.translate(W * .5, H * .5);
      ctx.rotate(-0.52);
      // Outer glow
      var g1 = ctx.createLinearGradient(0, -H*.4, 0, H*.4);
      g1.addColorStop(0, 'transparent');
      g1.addColorStop(.28, 'rgba(100,115,195,0.025)');
      g1.addColorStop(.5, 'rgba(130,148,215,0.065)');
      g1.addColorStop(.72, 'rgba(100,115,195,0.025)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(-W, -H*.4, W*2, H*.8);
      // Bright core
      var g2 = ctx.createLinearGradient(0, -H*.1, 0, H*.1);
      g2.addColorStop(0, 'transparent');
      g2.addColorStop(.5, 'rgba(155,170,235,0.055)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(-W, -H*.1, W*2, H*.2);
      ctx.restore();
    }

    function drawBgStars(t) {
      var cut = Math.floor(bgStars.length * bgDensity);
      for (var i = 0; i < cut; i++) {
        var s = bgStars[i];
        var x = ((s.fx * W + panX) % W + W) % W;
        var y = ((s.fy * H + panY) % H + H) % H;
        var twinkle = .6 + .4 * Math.sin(t * s.tSpd + s.tOff);
        ctx.globalAlpha = s.baseAlpha * twinkle * brightness;
        ctx.fillStyle = s.col;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function starR(mag) {
      return Math.max(2.5, (7 - mag) * 1.35 * brightness);
    }

    function projectConstellation(c) {
      var stars = c.renderStars || c.stars;
      var compact = W <= 768;
      var bounds = {
        left: compact ? 42 : 260,
        right: compact ? W - 42 : W - 190,
        top: compact ? 110 : 105,
        bottom: compact ? H - 180 : H - 120
      };
      if (bounds.right - bounds.left < 180) {
        bounds.left = 24;
        bounds.right = W - 24;
      }
      if (bounds.bottom - bounds.top < 220) {
        bounds.top = 80;
        bounds.bottom = H - 105;
      }

      var meanSin = stars.reduce(function(sum, s) {
        return sum + Math.sin(s.ra * Math.PI / 180);
      }, 0);
      var meanCos = stars.reduce(function(sum, s) {
        return sum + Math.cos(s.ra * Math.PI / 180);
      }, 0);
      var centerRa = Math.atan2(meanSin, meanCos) * 180 / Math.PI;
      if (centerRa < 0) centerRa += 360;
      var centerDec = stars.reduce(function(sum, s) { return sum + s.dec; }, 0) / stars.length;
      var raScale = Math.cos(centerDec * Math.PI / 180);
      var raw = stars.map(function(s) {
        var raDelta = ((s.ra - centerRa + 540) % 360) - 180;
        // Astronomical charts conventionally place east (increasing R.A.) to the left.
        return { x: -raDelta * raScale, y: centerDec - s.dec };
      });
      var minX = Math.min.apply(null, raw.map(function(p) { return p.x; }));
      var maxX = Math.max.apply(null, raw.map(function(p) { return p.x; }));
      var minY = Math.min.apply(null, raw.map(function(p) { return p.y; }));
      var maxY = Math.max.apply(null, raw.map(function(p) { return p.y; }));
      var spanX = Math.max(maxX - minX, 1);
      var spanY = Math.max(maxY - minY, 1);
      var scale = Math.min(
        (bounds.right - bounds.left) / spanX,
        (bounds.bottom - bounds.top) / spanY
      );
      var usedW = spanX * scale;
      var usedH = spanY * scale;
      var originX = bounds.left + ((bounds.right - bounds.left) - usedW) / 2;
      var originY = bounds.top + ((bounds.bottom - bounds.top) - usedH) / 2;

      var projection = {
        centerRa: centerRa,
        centerDec: centerDec,
        raScale: raScale,
        minX: minX,
        minY: minY,
        scale: scale,
        originX: originX,
        originY: originY
      };
      var points = raw.map(function(p) {
        return {
          px: originX + (p.x - minX) * scale + panX,
          py: originY + (p.y - minY) * scale + panY
        };
      });
      points.projection = projection;
      return points;
    }

    function projectSkyPoint(ra, dec, projection) {
      var raDelta = ((ra - projection.centerRa + 540) % 360) - 180;
      var rawX = -raDelta * projection.raScale;
      var rawY = projection.centerDec - dec;
      return {
        x: projection.originX + (rawX - projection.minX) * projection.scale + panX,
        y: projection.originY + (rawY - projection.minY) * projection.scale + panY
      };
    }


    function drawFigureArtwork(pts) {
      if (!showArtwork) return;
      var image = figureImages[activeKey];
      var pattern = window.CONSTELLATION_PATTERNS &&
        window.CONSTELLATION_PATTERNS[activeKey];
      if (!image || !image.complete || !image.naturalWidth ||
          !pattern || !pattern.image || !pts.projection) return;

      var anchors = pattern.image.anchors;
      var source = anchors.map(function(anchor) {
        return [anchor[0], anchor[1]];
      });
      var destination = anchors.map(function(anchor) {
        return projectSkyPoint(anchor[2], anchor[3], pts.projection);
      });
      var transform = affineFromAnchors(source, destination);
      if (!transform) return;

      ctx.save();
      ctx.transform(
        transform.a, transform.b, transform.c,
        transform.d, transform.e, transform.f
      );
      ctx.globalAlpha = W <= 520 ? 0.12 : 0.1;
      ctx.globalCompositeOperation = 'screen';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        image, 0, 0,
        pattern.image.size[0], pattern.image.size[1]
      );
      ctx.restore();
    }

    function drawConstellation(progress) {
      var c = CONSTS[activeKey];
      var stars = c.renderStars || c.stars;
      var lines = c.renderLines || c.lines;
      // Project real J2000 right ascension/declination into the available viewport.
      var pts = projectConstellation(c);
      drawFigureArtwork(pts);

      // Lines with animation
      if (showLines && progress > 0) {
        ctx.save();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(45,212,191,0.46)';
        ctx.shadowColor = 'rgba(45,212,191,0.25)';
        ctx.shadowBlur = 8;
        for (var i = 0; i < lines.length; i++) {
          var frac = Math.min(1, progress * lines.length - i);
          if (frac <= 0) break;
          var a = pts[lines[i][0]], b = pts[lines[i][1]];
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(a.px + (b.px - a.px) * frac, a.py + (b.py - a.py) * frac);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Named stars
      hitStars = [];
      var labelBoxes = [];
      stars.forEach(function(s, idx) {
        var px = pts[idx].px, py = pts[idx].py;
        var r = starR(s.mag);
        var col = TYPE_COLOR[s.type] || '#ffffff';

        // Outer glow
        ctx.save();
        var grd = ctx.createRadialGradient(px, py, 0, px, py, r * 2.8);
        grd.addColorStop(0, col);
        grd.addColorStop(.35, col + '66');
        grd.addColorStop(1, 'transparent');
        ctx.globalAlpha = .7;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, r * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.globalAlpha = 1;
        ctx.shadowColor = col;
        ctx.shadowBlur = r * 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, r * .5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Keyboard/click selection ring
        if (idx === selectedStarIndex) {
          ctx.save();
          ctx.strokeStyle = 'rgba(246,183,60,0.92)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.arc(px, py, r + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Diffraction spikes on bright stars
        if (s.mag < 1.5) {
          ctx.save();
          ctx.globalAlpha = .22 * brightness;
          ctx.strokeStyle = col;
          ctx.lineWidth = .8;
          var spikeLen = r * 4.5;
          [[-spikeLen,0],[spikeLen,0],[0,-spikeLen],[0,spikeLen]].forEach(function(d) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + d[0], py + d[1]);
            ctx.stroke();
          });
          ctx.restore();
        }

        // Label
        if (showNames && s.label !== false) {
          ctx.save();
          ctx.font = '500 11px Inter, sans-serif';
          ctx.fillStyle = 'rgba(192,216,245,0.88)';
          var labelW = ctx.measureText(s.name).width;
          var candidates = [
            { x: px + r + 7,          y: py - r + 2 },
            { x: px - r - 7 - labelW, y: py - r + 2 },
            { x: px + r + 7,          y: py + r + 13 },
            { x: px - r - 7 - labelW, y: py + r + 13 }
          ];
          var chosen = candidates[0];
          for (var ci = 0; ci < candidates.length; ci++) {
            var candidate = candidates[ci];
            var box = {
              left: candidate.x - 2,
              right: candidate.x + labelW + 2,
              top: candidate.y - 12,
              bottom: candidate.y + 4
            };
            var inside = box.left >= 6 && box.right <= W - 6 &&
              box.top >= 48 && box.bottom <= H - 82;
            var overlaps = labelBoxes.some(function(other) {
              return !(box.right < other.left || box.left > other.right ||
                box.bottom < other.top || box.top > other.bottom);
            });
            if (inside && !overlaps) {
              chosen = candidate;
              labelBoxes.push(box);
              break;
            }
          }
          ctx.fillText(s.name, chosen.x, chosen.y);
          ctx.restore();
        }

        hitStars.push({ s: s, px: px, py: py, hr: r + 11 });
      });
    }

    // ── Animation loop ─────────────────────────────────────────────────────
    function loop(ts) {
      var t = ts / 1000;
      if (lineAnimStart !== null) {
        lineProgress = Math.min(1, (ts - lineAnimStart) / LINE_MS);
        if (lineProgress >= 1) lineAnimStart = null;
      }
      if (allsky && allsky.active) {
        allsky.draw(ctx, W, H, ts, allskyFrame());
        SimKit.frame('#obs-canvas', loop);
        return;
      }
      drawSky();
      drawMilkyWay();
      drawBgStars(t);
      drawConstellation(lineProgress);
      SimKit.frame('#obs-canvas', loop);
    }

    // ── Lore: tooltip details and per-constellation dossier ───────────────
    var LORE = window.CONSTELLATION_LORE || { types: {}, general: {} };

    function starLore(star) {
      var entry = LORE[activeKey] && LORE[activeKey].stars && LORE[activeKey].stars[star.name];
      var t = LORE.types[star.type] || { temp: '', look: '' };
      if (entry) {
        return { known: true, spec: entry.spec, history: entry.history, physics: entry.physics, bayer: entry.bayer };
      }
      return { known: false, spec: star.type + '-type · ' + t.temp, history: '', physics: t.look, bayer: '' };
    }

    function el(tag, cls, text) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text;
      return node;
    }

    var MEDIA = window.CONSTELLATION_MEDIA || {};

    function figureFor(key, kind, label, m) {
      var fig = el('figure', 'dossier-fig');
      fig.dataset.zoomable = '';
      fig.dataset.kind = kind;
      fig.dataset.lightboxGroup = 'const-' + key;
      var img = el('img');
      img.src = '../../' + m.src;
      img.alt = m.alt;
      img.loading = 'lazy';
      img.decoding = 'async';
      fig.appendChild(img);
      var cap = el('figcaption');
      cap.appendChild(el('span', 'fig-kind', label));
      cap.appendChild(document.createTextNode(m.caption));
      var credit = el('span', 'fig-credit');
      credit.appendChild(document.createTextNode('Credit: ' + m.artist + ' · '));
      var a = el('a', '', m.license);
      a.href = m.page; a.target = '_blank'; a.rel = 'noopener noreferrer';
      credit.appendChild(a);
      cap.appendChild(credit);
      fig.appendChild(cap);
      return fig;
    }

    function renderDossier(key) {
      var host = document.getElementById('dossier');
      var c = CONSTS[key];
      var lore = LORE[key];
      host.textContent = '';
      if (!lore) return;

      host.appendChild(el('h2', 'dossier-title', 'Dossier: ' + c.name));
      host.appendChild(el('div', 'dossier-sub', c.myth.toUpperCase() + ' · ' + c.season.replace(/^Best seen: /, '')));
      var media = MEDIA[key];
      if (media) {
        host.appendChild(el('p', 'fig-zoom', 'Click a picture to enlarge it for the class.'));
        var gallery = el('div', 'dossier-gallery');
        gallery.appendChild(figureFor(key, 'sky', 'In the real sky', media.sky));
        gallery.appendChild(figureFor(key, 'myth', 'The myth behind it', media.myth));
        host.appendChild(gallery);
      }
      host.appendChild(el('h3', 'notes-h3', 'Origins'));
      host.appendChild(el('p', 'notes-p', lore.origin));
      host.appendChild(el('p', 'notes-p', lore.modern));

      if (media && media.culture) {
        var box = el('div', 'culture-box');
        box.appendChild(el('h3', '', 'Why it mattered to history and culture'));
        var tags = el('ul', 'culture-tags');
        media.culture.tags.forEach(function(t) { tags.appendChild(el('li', '', t)); });
        box.appendChild(tags);
        box.appendChild(el('p', '', media.culture.text));
        host.appendChild(box);
      }

      host.appendChild(el('h3', 'notes-h3', 'Discoveries and deep-sky objects'));
      lore.objects.forEach(function(o) {
        var d = el('div', 'dossier-obj');
        d.appendChild(el('strong', '', o[0]));
        d.appendChild(document.createTextNode(o[1]));
        host.appendChild(d);
      });

      host.appendChild(el('h3', 'notes-h3', 'Stars: history and spectra'));
      c.stars.forEach(function(star) {
        var info = starLore(star);
        if (!info.known) return;
        var d = el('details', 'dossier-star');
        d.dataset.star = star.name;
        var sum = el('summary', '', star.name + (info.bayer ? ' · ' + info.bayer : ''));
        sum.appendChild(el('small', '', info.spec));
        d.appendChild(sum);
        var body = el('div', 'dossier-body');
        var hp = el('p'); hp.appendChild(el('b', '', 'When it entered the record')); hp.appendChild(document.createTextNode(info.history));
        var pp = el('p'); pp.appendChild(el('b', '', 'Spectrum and composition')); pp.appendChild(document.createTextNode(info.physics));
        body.appendChild(hp); body.appendChild(pp);
        d.appendChild(body);
        host.appendChild(d);
      });

      host.appendChild(el('h3', 'notes-h3', 'Did you know?'));
      var ul = el('ul', 'dossier-tips');
      lore.tidbits.forEach(function(t) { ul.appendChild(el('li', '', t)); });
      host.appendChild(ul);
    }

    function highlightDossierStar(name) {
      document.querySelectorAll('#dossier .dossier-star').forEach(function(d) {
        d.classList.toggle('picked', d.dataset.star === name);
        if (d.dataset.star === name && tooltipPinned) d.open = true;
      });
    }

    function renderSpectralTable() {
      var host = document.getElementById('spectral-table');
      var table = el('table', 'spec-table');
      table.appendChild(el('caption', 'sr-only', 'Spectral classes with temperature and typical spectral features'));
      var head = el('tr');
      ['Class', 'Temp.', 'What the spectrum shows'].forEach(function(h) {
        var th = el('th', '', h); th.scope = 'col'; head.appendChild(th);
      });
      table.appendChild(head);
      ['O', 'B', 'A', 'F', 'G', 'K', 'M'].forEach(function(k) {
        var t = LORE.types[k];
        if (!t) return;
        var row = el('tr');
        var cell = el('th');
        cell.scope = 'row';
        var dot = el('span', 'spec-dot');
        dot.style.background = TYPE_COLOR[k];
        cell.appendChild(dot);
        cell.appendChild(document.createTextNode(k));
        row.appendChild(cell);
        row.appendChild(el('td', '', t.temp));
        row.appendChild(el('td', '', t.look));
        table.appendChild(row);
      });
      host.appendChild(table);
    }

    // ── Constellation switch ───────────────────────────────────────────────
    function setConst(key) {
      activeKey = key;
      selectedStarIndex = -1;
      tooltipPinned = false;
      hideTooltip();
      panX = 0;
      panY = 0;
      lineProgress = reduceMotion ? 1 : 0;
      if (!reduceMotion) requestAnimationFrame(function(ts) { lineAnimStart = ts; });
      var c = CONSTS[key];
      document.getElementById('info-name').textContent = c.name;
      document.getElementById('info-season').textContent = c.season;
      document.getElementById('info-story').textContent = c.story;
      document.getElementById('info-count').textContent =
        (c.renderStars || c.stars).length + ' mapped stars';
      document.getElementById('info-myth').textContent = c.myth;
      document.getElementById('hud-ra').textContent = c.hud.ra;
      document.getElementById('hud-dec').textContent = c.hud.dec;
      document.getElementById('hud-alt').textContent = c.hud.alt;
      document.getElementById('hud-az').textContent = c.hud.az;
      renderDossier(key);
      document.querySelectorAll('.obs-const-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.const === key);
        btn.setAttribute('aria-pressed', btn.dataset.const === key ? 'true' : 'false');
      });
    }

    // ── Mouse interactions ─────────────────────────────────────────────────
    var tooltip = document.getElementById('obs-tooltip');
    var announcer = document.getElementById('obs-announcer');
    var guide = document.getElementById('obs-guide');

    function dismissGuide() {
      guide.classList.add('dismissed');
    }

    function findHit(mx, my) {
      for (var i = 0; i < hitStars.length; i++) {
        if (Math.hypot(hitStars[i].px - mx, hitStars[i].py - my) <= hitStars[i].hr) {
          return { index: i, star: hitStars[i].s, px: hitStars[i].px, py: hitStars[i].py };
        }
      }
      return null;
    }

    function hideTooltip() {
      tooltip.style.display = 'none';
      tooltip.setAttribute('aria-hidden', 'true');
    }



    function showStarDetails(hit, anchorX, anchorY, announce) {
      var star = hit.star;
      document.getElementById('tt-name').textContent = star.name;
      document.getElementById('tt-dot').style.background = TYPE_COLOR[star.type] || '#fff';
      document.getElementById('tt-ra').textContent = formatRa(star.ra);
      document.getElementById('tt-dec').textContent = formatDec(star.dec);
      document.getElementById('tt-mag').textContent = star.mag;
      document.getElementById('tt-type').textContent = star.type + '-type';
      document.getElementById('tt-dist').textContent = star.dist;
      document.getElementById('tt-note').textContent = star.note;
      var lore = starLore(star);
      document.getElementById('tt-spec').textContent = lore.spec;
      document.getElementById('tt-more').style.display = lore.known ? 'block' : 'none';
      highlightDossierStar(star.name);
      tooltip.style.display = 'block';
      tooltip.setAttribute('aria-hidden', 'false');

      var tooltipWidth = Math.min(210, W - 16);
      var tx = anchorX + 20;
      var ty = anchorY - 12;
      if (tx + tooltipWidth > W - 8) tx = anchorX - tooltipWidth - 12;
      if (tx < 8) tx = 8;
      if (ty + 212 > H - 8) ty = H - 220;
      if (ty < 52) ty = 52;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';

      if (announce) {
        announcer.textContent = star.name + '. Magnitude ' + star.mag +
          '. Spectral type ' + star.type + '. Distance ' + star.dist + '. ' + star.note + '. ' +
          (lore.known ? lore.history + ' ' + lore.physics : '');
      }
    }

    canvas.addEventListener('mousemove', function(e) {
      if (allsky && allsky.active) return;
      var mx = e.clientX, my = e.clientY;
      var hit = findHit(mx, my);
      if (hit) {
        canvas.style.cursor = 'pointer';
        if (!tooltipPinned) showStarDetails(hit, mx, my, false);
      } else {
        canvas.style.cursor = isDragging ? 'grabbing' : 'crosshair';
        if (!tooltipPinned) hideTooltip();
      }
    });

    canvas.addEventListener('mouseleave', function() {
      if (allsky && allsky.active) return;
      if (!tooltipPinned) hideTooltip();
    });

    canvas.addEventListener('mousedown', function(e) {
      if (allsky && allsky.active) return;
      isDragging = true; dragSX = e.clientX; dragSY = e.clientY;
      panSX = panX; panSY = panY; canvas.style.cursor = 'grabbing';
      dismissGuide();
    });
    window.addEventListener('mouseup', function() {
      if (allsky && allsky.active) return;
      isDragging = false; canvas.style.cursor = 'crosshair';
    });
    window.addEventListener('mousemove', function(e) {
      if (!isDragging || (allsky && allsky.active)) return;
      panX = panSX + e.clientX - dragSX;
      panY = panSY + e.clientY - dragSY;
    });

    canvas.addEventListener('click', function(e) {
      if (allsky && allsky.active) return;
      var moved = Math.hypot(e.clientX - dragSX, e.clientY - dragSY) > 5;
      if (moved) return;
      var hit = findHit(e.clientX, e.clientY);
      if (hit) {
        selectedStarIndex = hit.index;
        tooltipPinned = true;
        showStarDetails(hit, e.clientX, e.clientY, true);
        dismissGuide();
      } else {
        selectedStarIndex = -1;
        tooltipPinned = false;
        hideTooltip();
      }
    });

    canvas.addEventListener('keydown', function(e) {
      if (allsky && allsky.active) return;
      var stars = CONSTS[activeKey].renderStars || CONSTS[activeKey].stars;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        selectedStarIndex = (selectedStarIndex + 1 + stars.length) % stars.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        selectedStarIndex = (selectedStarIndex - 1 + stars.length) % stars.length;
      } else if (e.key === 'Escape') {
        selectedStarIndex = -1;
        tooltipPinned = false;
        hideTooltip();
        return;
      } else if (e.key !== 'Enter' && e.key !== ' ') {
        return;
      }
      e.preventDefault();
      if (selectedStarIndex < 0) selectedStarIndex = 0;
      var hit = hitStars[selectedStarIndex];
      tooltipPinned = true;
      showStarDetails(
        { star: stars[selectedStarIndex] },
        hit ? hit.px : W / 2,
        hit ? hit.py : H / 2,
        true
      );
      dismissGuide();
    });

    // Touch pan
    var touchId = null, touchSX, touchSY;
    canvas.addEventListener('touchstart', function(e) {
      if (allsky && allsky.active) return;
      if (e.touches.length === 1) {
        touchId = e.touches[0].identifier;
        touchSX = e.touches[0].clientX; touchSY = e.touches[0].clientY;
        panSX = panX; panSY = panY;
        dismissGuide();
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', function(e) {
      if (allsky && allsky.active) return;
      for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchId) {
          panX = panSX + e.touches[i].clientX - touchSX;
          panY = panSY + e.touches[i].clientY - touchSY;
          e.preventDefault();
        }
      }
    }, { passive: false });
    canvas.addEventListener('touchend', function(e) {
      if (allsky && allsky.active) return;
      var touch = e.changedTouches[0];
      if (!touch || Math.hypot(touch.clientX - touchSX, touch.clientY - touchSY) > 8) return;
      var hit = findHit(touch.clientX, touch.clientY);
      if (hit) {
        selectedStarIndex = hit.index;
        tooltipPinned = true;
        showStarDetails(hit, touch.clientX, touch.clientY, true);
      }
    }, { passive: true });

    // ── Controls ───────────────────────────────────────────────────────────
    document.querySelectorAll('.obs-const-btn').forEach(function(btn) {
      btn.setAttribute('aria-pressed', btn.dataset.const === 'orion' ? 'true' : 'false');
      btn.addEventListener('click', function() {
        setConst(btn.dataset.const);
        if (allsky && allsky.active) { allsky.focusFeatured(btn.dataset.const); setAllSkyInfo(); }
        if (window.innerWidth <= 768) setPanelOpen(false);
      });
    });

    document.getElementById('ctrl-brightness').addEventListener('input', function(e) {
      brightness = e.target.value / 100;
      document.getElementById('val-brightness').textContent = e.target.value + '%';
    });
    document.getElementById('ctrl-bgstars').addEventListener('input', function(e) {
      bgDensity = e.target.value / 100;
      document.getElementById('val-bgstars').textContent = e.target.value + '%';
    });
    document.getElementById('ctrl-lines').addEventListener('change', function(e) { showLines = e.target.checked; });
    document.getElementById('ctrl-names').addEventListener('change', function(e) { showNames = e.target.checked; });
    document.getElementById('ctrl-artwork').addEventListener('change', function(e) { showArtwork = e.target.checked; });
    document.getElementById('ctrl-milkyway').addEventListener('change', function(e) { showMilkyWay = e.target.checked; });

    document.getElementById('btn-center').addEventListener('click', function() {
      if (allsky && allsky.active) { allsky.reset(); return; }
      panX = 0;
      panY = 0;
      selectedStarIndex = -1;
      tooltipPinned = false;
      hideTooltip();
      announcer.textContent = 'Star map centered.';
    });

    document.getElementById('btn-defaults').addEventListener('click', function() {
      brightness = 1;
      bgDensity = 0.7;
      showLines = true;
      showNames = true;
      showArtwork = true;
      showMilkyWay = true;
      panX = 0;
      panY = 0;
      document.getElementById('ctrl-brightness').value = 100;
      document.getElementById('val-brightness').textContent = '100%';
      document.getElementById('ctrl-bgstars').value = 70;
      document.getElementById('val-bgstars').textContent = '70%';
      document.getElementById('ctrl-lines').checked = true;
      document.getElementById('ctrl-names').checked = true;
      document.getElementById('ctrl-artwork').checked = true;
      document.getElementById('ctrl-milkyway').checked = true;
      setConst('orion');
      announcer.textContent = 'Observatory settings reset.';
    });

    // ── All-sky mode ─────────────────────────────────────────────────────
    var allskyHover = document.getElementById('as-hover');
    allsky = window.AllSkyMap.create({
      canvas: canvas,
      card: document.getElementById('allsky-card'),
      dataUrl: '../../assets/data/sky/allsky.json',
      announce: function(text) { announcer.textContent = text; },
      onCursor: function(ra, dec) {
        document.getElementById('hud-ra').textContent = formatRa(ra);
        document.getElementById('hud-dec').textContent = formatDec(dec);
      },
      onHover: function(text, p) {
        if (!text) { allskyHover.style.display = 'none'; return; }
        allskyHover.textContent = text;
        allskyHover.style.display = 'block';
        allskyHover.style.left = Math.min(W - 180, p.x + 14) + 'px';
        allskyHover.style.top = (p.y + 14) + 'px';
      },
      onOpenDetail: function(key) { setMode(false); setConst(key); }
    });

    function allskyFrame() {
      var mobile = window.innerWidth <= 768;
      return {
        left: (panelOpen && !mobile) ? panel.offsetWidth : 0,
        right: (notesOpen && !mobile) ? notes.offsetWidth : 0,
        top: 46,
        bottom: infobar.offsetHeight || 72
      };
    }

    function setAllSkyInfo() {
      var now = new Date();
      document.getElementById('info-name').textContent = 'All-sky map';
      document.getElementById('info-season').textContent = now.toUTCString().slice(5, 22) + ' UTC';
      document.getElementById('info-story').textContent =
        'All 88 official constellations with their IAU boundaries. Drag to pan, scroll to zoom, click a region, galaxy, planet or anomaly. ' + allsky.todaySummary();
      document.getElementById('info-count').textContent = '88 constellations · 89 regions';
      document.getElementById('info-myth').textContent = 'Right ascension runs east ← west';
    }

    function setMode(on, focusKey) {
      document.body.classList.toggle('allsky-mode', on);
      document.getElementById('mode-allsky').setAttribute('aria-pressed', on ? 'true' : 'false');
      document.getElementById('mode-detail').setAttribute('aria-pressed', on ? 'false' : 'true');
      document.getElementById('allsky-panel').hidden = !on;
      allskyHover.style.display = 'none';
      hideTooltip();
      tooltipPinned = false;
      allsky.setActive(on, focusKey);
      if (on) {
        canvas.setAttribute('aria-label', 'Interactive all-sky map of every constellation. Drag to pan, scroll or plus and minus to zoom.');
        document.getElementById('map-instructions').textContent = 'All-sky map. Drag to pan the sky, scroll or use plus and minus keys to zoom, arrow keys to move, click a constellation, deep-sky object, planet or anomaly for details, Escape to close the card.';
        allsky.load().then(setAllSkyInfo);
        document.getElementById('hud-alt').textContent = '—';
        document.getElementById('hud-az').textContent = '—';
        setAllSkyInfo();
        canvas.style.cursor = 'grab';
      } else {
        canvas.setAttribute('aria-label', 'Interactive star map of the night sky');
        document.getElementById('map-instructions').textContent = 'Drag to pan the sky. Use the left and right arrow keys to move between named stars. Press Enter to hear details for the selected star.';
        setConst(activeKey);
        canvas.style.cursor = 'crosshair';
      }
      announcer.textContent = on ? 'All-sky map of every constellation.' : 'Detailed sky view.';
    }

    document.getElementById('mode-allsky').addEventListener('click', function() { setMode(true, activeKey); });
    document.getElementById('mode-detail').addEventListener('click', function() { setMode(false); });
    document.querySelectorAll('[data-as-layer]').forEach(function(box) {
      box.addEventListener('change', function() { allsky.layers[box.dataset.asLayer] = box.checked; });
    });

    // Panel toggle
    var panel = document.getElementById('obs-panel');
    var infobar = document.getElementById('obs-infobar');
    var ptBtn = document.getElementById('obs-panel-toggle');
    var panelOpen = !window.matchMedia('(max-width: 768px)').matches;

    function setPanelOpen(open) {
      panelOpen = open;
      panel.classList.toggle('hidden', !panelOpen);
      infobar.classList.toggle('panel-hidden', !panelOpen);
      document.body.classList.toggle('panel-collapsed', !panelOpen);
      ptBtn.classList.toggle('panel-closed', !panelOpen);
      ptBtn.setAttribute('aria-expanded', panelOpen ? 'true' : 'false');
    }

    setPanelOpen(panelOpen);
    ptBtn.addEventListener('click', function() {
      setPanelOpen(!panelOpen);
    });

    // Notes panel
    var notes = document.getElementById('obs-notes');
    var notesBtn = document.getElementById('obs-notes-toggle');
    var notesOpen = false;
    notesBtn.addEventListener('click', function() {
      notesOpen = !notesOpen;
      if (notesOpen && panelOpen && window.innerWidth <= 768) setPanelOpen(false);
      notes.classList.toggle('open', notesOpen);
      notesBtn.textContent = notesOpen ? 'FIELD NOTES ◂' : 'FIELD NOTES ▸';
      notesBtn.setAttribute('aria-expanded', notesOpen ? 'true' : 'false');
    });

    document.getElementById('btn-dossier').addEventListener('click', function() {
      if (!notesOpen) notesBtn.click();
      notes.scrollTop = 0;
    });

    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      if (notesOpen) {
        notesOpen = false;
        notes.classList.remove('open');
        notesBtn.textContent = 'FIELD NOTES ▸';
        notesBtn.setAttribute('aria-expanded', 'false');
        notesBtn.focus();
      }
    });

    // Quiz
    document.getElementById('btn-check').addEventListener('click', function() {
      var score = 0;
      if (document.getElementById('q1').value === 'far') score++;
      if (document.getElementById('q2').value === 'polaris') score++;
      if (document.getElementById('q3').value === 'fingerprint') score++;
      var fb = document.getElementById('quiz-feedback');
      fb.className = 'quiz-feedback ' + (score === 3 ? 'quiz-ok' : 'quiz-try');
      fb.textContent = score === 3
        ? '✓ Correct — you understand the sky-map idea and how starlight is read.'
        : score + '/3 correct. Revisit perspective, Polaris and spectroscopy, then try again.';
    });

    // Live UTC clock in HUD
    function tickClock() {
      var n = new Date();
      document.getElementById('hud-time').textContent =
        String(n.getUTCHours()).padStart(2,'0') + ':' +
        String(n.getUTCMinutes()).padStart(2,'0') + ':' +
        String(n.getUTCSeconds()).padStart(2,'0');
    }
    setInterval(tickClock, 1000);
    tickClock();

    // ── Init ───────────────────────────────────────────────────────────────
    window.addEventListener('resize', resize);
    genBgStars();
    resize();
    renderSpectralTable();
    setConst('orion');
    SimKit.frame('#obs-canvas', loop);
  }());
