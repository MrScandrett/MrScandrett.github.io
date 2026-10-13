#!/usr/bin/env node
/**
 * audit-lesson-pedagogy.mjs
 *
 * Pseudolearning audit for every catalogued lesson (data/lessons.json).
 *
 * "Pseudolearning" here means a page that *looks* like a lesson (slick sim,
 * vocabulary, big headings) but would not let a teacher actually learn the
 * idea: it asserts instead of explaining, shows a demo with no mechanism,
 * never works an example, never checks understanding, or repeats a popular
 * myth as fact. If a teacher can't learn it from the page, a student can't.
 *
 * Two layers:
 *   1. Myth scan   — sentences that state a well-known scientific,
 *                    mathematical or historical misconception as fact.
 *                    Sentences that are clearly *debunking* the myth are
 *                    reported as "addressed" and don't count against a lesson.
 *   2. Structure   — heuristics for explanation depth: prose volume vs. demo
 *                    code, causal reasoning density, worked examples, checks
 *                    for understanding, sources/credits, hype words.
 *
 * Heuristics prioritise human review; they do not replace it. A flagged
 * lesson is a lesson to read, not a lesson that is proven wrong.
 *
 * Usage:
 *   node scripts/audit-lesson-pedagogy.mjs                 # summary to stdout
 *   node scripts/audit-lesson-pedagogy.mjs --report        # write reports/lesson-pedagogy-audit.{md,json}
 *   node scripts/audit-lesson-pedagogy.mjs --render        # read each page's live DOM text in Chromium (slower, most accurate)
 *   node scripts/audit-lesson-pedagogy.mjs --extract DIR   # dump each lesson's readable text to DIR (for review)
 *   node scripts/audit-lesson-pedagogy.mjs --only physics  # limit to URLs containing "physics"
 *   node scripts/audit-lesson-pedagogy.mjs --strict        # exit 1 if any unaddressed high-severity myth
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};

const WRITE_REPORT = flag("--report");
const RENDER = flag("--render");
const STRICT = flag("--strict");
const EXTRACT_DIR = opt("--extract");
const ONLY = opt("--only");

// ── Myth rules ────────────────────────────────────────────────────────────────
// Each rule matches a sentence that *states* the myth. Keep patterns narrow:
// a false positive costs a reviewer a minute, but a noisy rule gets ignored.
// `fix` is the accurate statement a lesson should make instead.

const MYTHS = [
  // Learning science (ironic in a lesson, and very common)
  { id: "learning-styles", sev: "high", re: /\b(visual|auditory|kinesthetic|kinaesthetic) learners?\b|\blearning styles?\b|\bVAK\b/i,
    fix: "Matching instruction to a student's preferred 'learning style' has no supporting evidence (Pashler et al., 2008). Match the medium to the content instead." },
  { id: "left-right-brain", sev: "high", re: /\b(left|right)[- ]brain(ed)?\b(?! hemisphere)/i,
    fix: "Some functions are lateralised, but people are not 'left-brained' or 'right-brained' (Nielsen et al., 2013)." },
  { id: "ten-percent-brain", sev: "high", re: /\b(only )?(use )?10 ?(%|percent) of (your|our|the|their|his|her) brains?\b/i,
    fix: "Imaging shows virtually all of the brain is active over a day; there is no dormant 90%." },
  { id: "mozart-effect", sev: "medium", re: /\bmozart effect\b|(classical music|mozart)[^.]{0,60}\b(makes? (you |kids |babies )?smarter|raises? (your )?iq|increases? (your )?iq)/i,
    fix: "The 1993 'Mozart effect' was a small, short-lived arousal effect on one spatial task; it does not raise IQ." },
  { id: "five-senses", sev: "low", re: /\b(humans|we|people) have (only |just )?five senses\b/i,
    fix: "Humans have many more senses than five (balance, proprioception, temperature, pain, interoception...)." },

  // Biology
  { id: "tongue-map", sev: "high", re: /\btongue map\b|\b(sweet|bitter|sour|salty)\b[^.]{0,50}\b(tip|back|sides?|front) of the tongue\b/i,
    fix: "All taste qualities are detected across the whole tongue; the 'tongue map' came from a mistranslation of Hänig (1901)." },
  { id: "blue-blood", sev: "high", re: /\bblood is (actually )?blue\b|\bdeoxygenated blood\b[^.]{0,30}\bblue\b|\bblue blood\b[^.]{0,30}\bveins\b/i,
    fix: "Human blood is always red (darker when deoxygenated). Veins look blue because of how skin scatters and absorbs light." },
  { id: "evolved-from-chimps", sev: "high", re: /\b(humans?|we|people|man) (evolved|descended|came) from (chimps|chimpanzees|monkeys|modern apes)\b/i,
    fix: "Humans and chimpanzees share a common ancestor (~6–7 Mya); neither descended from the other." },
  { id: "survival-of-strongest", sev: "medium", re: /\bsurvival of the strongest\b/i,
    fix: "'Fitness' means reproductive success in an environment, not strength." },
  { id: "just-a-theory", sev: "medium", re: /\b(just|only|merely) a theory\b/i,
    fix: "A scientific theory is a well-tested explanatory framework, not a guess." },
  { id: "goldfish-memory", sev: "low", re: /\bgoldfish\b[^.]{0,40}\b(3|three)[- ]second\b/i,
    fix: "Goldfish retain trained associations for months." },
  { id: "bats-blind", sev: "low", re: /\bbats are blind\b|\bblind as a bat\b/i,
    fix: "All bats can see; many also echolocate." },
  { id: "hair-after-death", sev: "low", re: /\b(hair|nails) (continue to |keep(s)? )?grow(ing)? after death\b/i,
    fix: "Skin dehydrates and retracts after death; hair and nails do not grow." },
  { id: "sugar-hyperactivity", sev: "low", re: /\bsugar\b[^.]{0,40}\bhyperactiv/i,
    fix: "Controlled trials find no effect of sugar on children's behaviour (Wolraich et al., 1995)." },
  { id: "bulls-red", sev: "low", re: /\bbulls?\b[^.]{0,40}\b(angered|enraged|provoked) by (the colou?r )?red\b|\bbulls? hates? (the colou?r )?red\b/i,
    fix: "Cattle are red–green colour-blind; bulls react to the cape's motion." },

  // Physics
  { id: "seasons-distance", sev: "high", re: /\bseasons?\b[^.]{0,90}\b(closer to|nearer to|farther from|further from|distance from) the sun\b/i,
    fix: "Seasons are caused by axial tilt (23.4°). Earth is actually closest to the Sun in early January." },
  { id: "equal-transit", sev: "high", re: /\bequal[- ]transit\b|\b(meet|arrive|reach)[^.]{0,40}\bsame time\b[^.]{0,60}\b(wing|trailing edge)\b|\btravel(s|ing)? (a )?(farther|further|longer)[^.]{0,40}\b(over|across|top of) the wing\b/i,
    fix: "Air over the top of a wing arrives at the trailing edge *before* the air underneath; lift comes from the wing turning the flow (pressure difference ↔ downwash), not equal transit times." },
  { id: "heavier-falls-faster", sev: "high", re: /\bheavier (objects?|things|bodies) (always )?fall(s)? faster\b/i,
    fix: "Without air resistance all objects fall with the same acceleration (g ≈ 9.8 m/s²)." },
  { id: "glass-liquid", sev: "high", re: /\bglass is (actually |really )?a (very )?(slow[- ]moving |super[- ]?cooled |viscous )?liquid\b|\b(old|medieval|church) (church )?windows?\b[^.]{0,60}\bthicker at the bottom\b/i,
    fix: "Glass is an amorphous solid; medieval panes are uneven because of how they were made, not because they flowed." },
  { id: "electrons-speed-of-light", sev: "high", re: /\belectrons?\b[^.]{0,30}\b(travel|move|flow|zip)s?\b[^.]{0,30}\b(at|near|close to) the speed of light\b[^.]{0,30}\b(wires?|circuits?)\b/i,
    fix: "Electron drift velocity in a wire is ~mm/s; the *signal* (the electromagnetic field) propagates near light speed." },
  { id: "current-used-up", sev: "high", re: /\b(current|electrons)\b (is|are|gets?) used up\b|\b(bulb|resistor|lamp) uses? up (the )?(current|electrons)\b/i,
    fix: "Current is the same in and out of a series component; energy (not charge) is transferred." },
  { id: "friction-creates-charge", sev: "medium", re: /\b(rubbing|friction) (creates|makes|produces|generates) (electric(al)? )?charges?\b/i,
    fix: "Rubbing transfers electrons between materials; charge is conserved, not created." },
  { id: "least-resistance", sev: "medium", re: /\b(electricity|current) (always )?(takes|follows|chooses) (only )?the path of least resistance\b/i,
    fix: "Current divides among *all* parallel paths, inversely to their resistance; most, not all, takes the lowest-resistance path." },
  { id: "heat-rises", sev: "low", re: /\bheat rises\b/i,
    fix: "Heat is energy transfer; *warm fluid* rises because it is less dense (convection). Heat also conducts and radiates downward." },
  { id: "centrifugal-pushes", sev: "low", re: /\bcentrifugal force (pushes|pulls|throws|flings)\b/i,
    fix: "In an inertial frame there is no outward force: objects tend to continue straight and the inward (centripetal) force is missing. 'Centrifugal' is a rotating-frame fictitious force; say which frame you mean." },
  { id: "no-gravity-in-space", sev: "high", re: /\bno gravity in (space|orbit)\b|\bastronauts?\b[^.]{0,60}\b(no|zero) gravity\b/i,
    fix: "Gravity on the ISS is ~90% of surface gravity; astronauts float because they are in continuous free fall." },
  { id: "sound-in-space", sev: "high", re: /\bsound (can |does )?travels? (through|in) (space|a vacuum)\b/i,
    fix: "Sound is a mechanical wave and needs a medium; it cannot travel through a vacuum." },
  { id: "sun-is-burning", sev: "medium", re: /\bthe sun is (a (giant |big )?ball of )?(fire|burning)\b/i,
    fix: "The Sun shines by nuclear fusion of hydrogen into helium, not combustion (there is no oxygen burning)." },
  { id: "moon-phases-shadow", sev: "high", re: /\bphases? of the moon\b[^.]{0,60}\b(caused by|because of|due to) (the )?earth'?s shadow\b|\bearth'?s shadow\b[^.]{0,40}\bcauses?\b[^.]{0,20}\bphases?\b/i,
    fix: "Phases are the changing view of the Moon's sunlit half as it orbits; Earth's shadow causes *eclipses*." },
  { id: "dark-side-moon", sev: "medium", re: /\bdark side of the moon\b[^.]{0,60}\b(never|no) (gets )?(sun|light)/i,
    fix: "The far side gets as much sunlight as the near side; it's only 'dark' in the sense of unseen from Earth." },
  { id: "north-star-brightest", sev: "medium", re: /\b(north star|polaris)\b[^.]{0,30}\bis the brightest star\b/i,
    fix: "Polaris is ~48th brightest; Sirius is the brightest star in the night sky." },
  { id: "light-year-time", sev: "high", re: /\blight[- ]years? (is|are) a (unit|measure|measurement) of time\b/i,
    fix: "A light-year is a distance (~9.46 × 10¹² km)." },
  { id: "mercury-hottest", sev: "medium", re: /\bmercury is the hottest planet\b/i,
    fix: "Venus is the hottest planet (~465 °C) because of its CO₂ greenhouse atmosphere." },
  { id: "black-holes-suck", sev: "low", re: /\bblack holes? (suck|sucks|vacuums?)\b/i,
    fix: "Far from a black hole its gravity is the same as any object of equal mass; it doesn't 'suck'." },
  { id: "teardrop-raindrop", sev: "low", re: /\braindrops? (are|is) (shaped like )?tear[- ]?drops?\b|\btear[- ]?drop[- ]shaped raindrops?\b/i,
    fix: "Small raindrops are spherical; larger ones flatten into a hamburger-bun shape." },
  { id: "sky-reflects-ocean", sev: "high", re: /\bsky is blue because\b[^.]{0,60}\b(reflect|ocean|sea)/i,
    fix: "The sky is blue because air molecules scatter short wavelengths more (Rayleigh scattering ∝ 1/λ⁴)." },
  { id: "coriolis-drain", sev: "medium", re: /\b(toilets?|sinks?|drains?|bathtubs?)\b[^.]{0,80}\b(coriolis|opposite direction\b[^.]{0,40}\bhemisphere)/i,
    fix: "Coriolis effects are far too weak to set the swirl direction of a sink or toilet; basin shape and residual motion dominate." },
  { id: "lightning-twice", sev: "medium", re: /\blightning never strikes (the same place )?twice\b/i,
    fix: "Lightning often strikes the same tall object repeatedly (the Empire State Building is hit ~20–25 times a year)." },
  { id: "penny-skyscraper", sev: "low", re: /\bpenny\b[^.]{0,80}\b(empire state|skyscraper)\b[^.]{0,80}\b(kill|deadly|lethal)/i,
    fix: "A penny's terminal velocity (~25–50 mph) is far too low to kill." },
  { id: "mpemba-fact", sev: "low", re: /\bhot water (always )?freezes faster\b/i,
    fix: "The Mpemba effect is real in some setups but disputed and not reproducible in general; present it as an open question." },

  // Chemistry / Earth
  { id: "diamonds-from-coal", sev: "medium", re: /\bdiamonds?\b[^.]{0,40}\b(form|formed|made|come|comes) from coal\b/i,
    fix: "Most natural diamonds form ~150 km down in the mantle, from carbon that was never coal." },
  { id: "pure-water-conducts", sev: "medium", re: /\bpure water (is a good conductor|conducts electricity( well)?)\b/i,
    fix: "Pure water is a poor conductor; dissolved ions make ordinary water conductive." },
  { id: "ozone-causes-warming", sev: "high", re: /\bozone hole\b[^.]{0,80}\b(causes?|cause of|is causing) (global warming|climate change)\b/i,
    fix: "The ozone hole and greenhouse warming are distinct problems with different causes (CFCs vs. CO₂ and other GHGs)." },
  { id: "humans-and-dinosaurs", sev: "high", re: /\b(humans?|people|cavemen|early man)\b[^.]{0,40}\b(lived|coexisted|lived alongside) (alongside |with )?(the )?(non-avian )?dinosaurs\b/i,
    fix: "Non-avian dinosaurs went extinct ~66 Mya; the genus Homo appears ~2.8 Mya." },
  { id: "bohr-planetary-current", sev: "low", re: /\belectrons? (orbit|circle|revolve)s? (around )?the nucleus like planets\b/i,
    fix: "The planetary picture is the 1913 Bohr model. Present it as historical; electrons occupy orbitals described by quantum mechanics." },

  // Mathematics
  { id: "pi-22-7", sev: "high", re: /\b(pi|π)\s*(is|equals|=)\s*(exactly\s*)?22\s*\/\s*7\b(?!\s*(is )?(an? )?approx)/i,
    fix: "π is irrational; 22/7 ≈ 3.142857 is an approximation (π ≈ 3.141593)." },
  { id: "divide-by-zero-infinity", sev: "high", re: /\b(divid(e|ing)|division) by zero\b[^.]{0,30}\b(equals|is|=|gives|makes) (you )?infinity\b|\b\d+\s*[\/÷]\s*0\s*=\s*(∞|infinity)/i,
    fix: "Division by zero is undefined in the real numbers; limits like 1/x as x→0⁺ grow without bound, which is a different statement." },
  { id: "golden-ratio-overclaim", sev: "medium", re: /\b(parthenon|mona lisa|great pyramid|human (body|face)|nautilus( shell)?|da vinci)\b[^.]{0,80}\bgolden (ratio|mean|section|spiral)\b|\bgolden (ratio|mean|spiral)\b[^.]{0,80}\b(parthenon|mona lisa|great pyramid|nautilus)\b/i,
    fix: "Golden-ratio claims about the Parthenon, Mona Lisa, pyramids and nautilus shells are largely unsupported (Markowsky, 1992); nautilus spirals are logarithmic but not golden." },
  { id: "pythagoras-discovered", sev: "medium", re: /\bpythagoras (first )?(discovered|invented|came up with)\b/i,
    fix: "The relationship a²+b²=c² was used in Babylon (Plimpton 322, c. 1800 BCE) and elsewhere long before Pythagoras; the first surviving *proof* is in Euclid." },
  { id: "fibonacci-discovered", sev: "medium", re: /\bfibonacci (first )?(discovered|invented|came up with)\b/i,
    fix: "The sequence appears in Indian prosody (Pingala, Virahāṅka, Hemacandra) centuries before Leonardo of Pisa popularised it in Europe (1202)." },
  { id: "arabic-numerals", sev: "medium", re: /\barabic numerals (were )?(invented|created|developed) by (the )?arabs?\b/i,
    fix: "The place-value digits were developed in India and transmitted to Europe through Arabic scholars (al-Khwārizmī); call them Hindu–Arabic numerals." },

  // History / history of science
  { id: "columbus-flat-earth", sev: "high", re: /\b(columbus|medieval (people|europeans|scholars)|people in the middle ages|people (back then|long ago|in columbus'?s? time))\b[^.]{0,100}\b(thought|believed)\b[^.]{0,40}\b(earth|world) was flat\b/i,
    fix: "Educated Europeans had known Earth was a sphere since antiquity (Eratosthenes measured it c. 240 BCE). Columbus's dispute was about Earth's *size* — and he was wrong." },
  { id: "einstein-failed-math", sev: "high", re: /\beinstein\b[^.]{0,40}\bfail(ed|s)?\b[^.]{0,20}\bmath/i,
    fix: "Einstein excelled at mathematics and had mastered calculus by about 15." },
  { id: "newton-apple-head", sev: "medium", re: /\bapple\b[^.]{0,40}\b(hit|fell on|landed on|struck|bonked)\b[^.]{0,20}\b(his |newton'?s )?head\b/i,
    fix: "Newton's own account (via Stukeley) is of seeing an apple fall in the orchard; it didn't hit his head." },
  { id: "galileo-pisa", sev: "medium", re: /\bgalileo\b[^.]{0,80}\b(dropped|drop|dropping)\b[^.]{0,60}\b(leaning )?tower of pisa\b/i,
    fix: "The Pisa drop is attested only by Galileo's late biographer Viviani and may never have happened; Galileo's documented evidence came from inclined-plane experiments." },
  { id: "edison-bulb", sev: "medium", re: /\bedison (single-handedly )?invented the (electric )?(light ?bulb|incandescent (lamp|bulb))\b/i,
    fix: "Incandescent lamps predate Edison (Davy, de la Rue, Swan). Edison's team produced a practical long-life carbon-filament bulb and, crucially, a distribution system (1879–82)." },
  { id: "watt-steam-engine", sev: "medium", re: /\b(james )?watt invented the steam engine\b/i,
    fix: "Newcomen's atmospheric engine (1712) came first; Watt's separate condenser (1765, patented 1769) made it far more efficient." },
  { id: "gutenberg-printing", sev: "medium", re: /\bgutenberg (invented|created) (the )?(printing|print|movable type)(?! press)\b/i,
    fix: "Movable type existed in China (Bi Sheng, c. 1040) and Korea (Jikji, 1377). Gutenberg (c. 1450) combined metal type, oil-based ink and a screw press into a scalable system." },
  { id: "franklin-kite-struck", sev: "medium", re: /\bfranklin\b[^.]{0,80}\bkite\b[^.]{0,80}\b(struck by lightning|lightning (bolt )?(struck|hit))\b/i,
    fix: "Franklin's kite was not struck directly (that would likely have killed him, as it did Georg Richmann in 1753); it collected charge from the storm cloud's field." },
  { id: "first-computer", sev: "medium", re: /\b(eniac|turing|colossus|babbage)\b[^.]{0,30}\b(was|built|invented|made) the first (electronic |digital |modern )?computer\b/i,
    fix: "'First computer' depends on definition (programmable? electronic? stored-program?). Name the criterion: e.g., Z3 1941, Colossus 1943–44, ENIAC 1945, Manchester Baby 1948." },
  { id: "slaves-built-pyramids", sev: "medium", re: /\bslaves built the (great )?pyramids?\b/i,
    fix: "Excavations at Giza (Lehner, Hawass) indicate paid, fed, rotating crews of Egyptian labourers, not chattel slaves." },
  { id: "viking-horns", sev: "medium", re: /\bvikings?\b[^.]{0,60}\bhorned helmets?\b|\bhorned helmets?\b[^.]{0,60}\bvikings?\b/i,
    fix: "No Viking-age horned helmet has been found; the image comes from 19th-century Romanticism (Wagner costumes, 1876)." },
  { id: "napoleon-short", sev: "low", re: /\bnapoleon\b[^.]{0,40}\b(was )?(very )?(short|tiny)\b/i,
    fix: "Napoleon was about 1.69 m (5′7″), average for his time; the myth mixes French and English inches." },
  { id: "salem-burned", sev: "medium", re: /\bsalem\b[^.]{0,60}\bburn(ed|t)? at the stake\b/i,
    fix: "No one was burned in the Salem trials (1692); 19 were hanged and Giles Corey was pressed to death." },
  { id: "vomitorium", sev: "low", re: /\bvomitori(um|a)\b[^.]{0,60}\bvomit(ed|ing)?\b/i,
    fix: "A vomitorium is an amphitheatre exit passage that 'spews out' crowds; it was not a room for vomiting." },
  { id: "let-them-eat-cake", sev: "medium", re: /\blet them eat cake\b/i,
    fix: "There is no evidence Marie Antoinette said it; Rousseau attributes a similar line to 'a great princess' in a text written when she was a child." },
  { id: "dark-ages", sev: "low", re: /\bthe dark ages\b/i,
    fix: "Most historians avoid 'Dark Ages' for the early Middle Ages; use 'early medieval period' and acknowledge its scholarship (e.g., Islamic Golden Age, Carolingian renaissance)." },
  { id: "nine-planets", sev: "low", re: /\b(there are|our solar system has) nine planets\b/i,
    fix: "Since the IAU's 2006 definition, the Solar System has eight planets; Pluto is a dwarf planet." },

  // Misattributed quotations
  { id: "insanity-quote", sev: "medium", re: /\bdefinition of insanity\b/i,
    fix: "The 'insanity is doing the same thing…' line is not found in Einstein's writings; its earliest known appearance is 1980s recovery literature." },
  { id: "faster-horses", sev: "medium", re: /\bfaster horses?\b/i,
    fix: "There is no evidence Henry Ford said 'if I had asked people what they wanted, they would have said faster horses.'" },
];

// A sentence containing one of these is (probably) debunking or framing the
// myth rather than asserting it.
const DEBUNK_RE = /\b(myths?|misconceptions?|misconceived|not true|isn'?t true|untrue|false(ly)?|wrong(ly)?|mistaken(ly)?|actually|in fact|contrary|debunk\w*|common (belief|mistake|error)|popular (belief|story|myth|legend)|legend|legendary|apocryphal|never happened|no evidence|incorrect(ly)?|doesn'?t|does not|don'?t|do not|isn'?t|is not|aren'?t|are not|wasn'?t|was not|weren'?t|didn'?t|did not|never|despite|often (said|claimed|told|quoted|attributed)|misattributed|attributed to|people (think|thought|believe|believed)|you may have heard|it'?s tempting|supposedly|so-called|urban legend|disputed|contested|probably never|unlikely|no record|myth-?bust\w*|hoax|nor|not|no longer|rather than|instead of|nothing to do with)\b/i;

// ── Structure heuristics ─────────────────────────────────────────────────────

const CAUSAL_RE = /\b(because|therefore|thus|hence|so that|which means|this means|that means|this is why|that is why|that'?s why|as a result|consequently|due to|in order to|it follows|leads? to|causes?|caused by|explains?|the reason)\b/gi;
const WORKED_RE = /\b(worked example|example problem|sample problem|walk-?through|step\s*1\b|step one|solution\b|let'?s (solve|try|calculate|compute|work)|for example|e\.g\.|try it|we get|substitut(e|ing)|plug(ging)? in|show(n)? your work|derivation|derive|proof)\b/gi;
const CHECK_RE = /\b(exit ticket|check (your|for) understanding|quick check|self[- ]check|quiz|predict(ion)?|explain (why|how|in your own words)|your turn|challenge|practice|review questions?|discussion questions?|think about it|what do you notice|what would happen|answer key|reflect(ion)?)\b/gi;
const SOURCE_RE = /\b(sources?|references?|bibliography|further reading|works cited|citations?|credits?|courtesy of|public domain|cc[- ]by|wikimedia|nasa|noaa|usgs|primary source|archive\.org|doi)\b/gi;
const HYPE_RE = /\b(amazing|magic(al)?|mind[- ]?blowing|incredible|insane(ly)?|epic|super ?cool|awesome|secret(s)?|revolutionary|genius|obviously|simply put|basically|everyone knows|crazy)\b/gi;
const LEGEND_RE = /\b(legend (has it|says)|it is said|they say|according to legend|some say)\b/gi;
const YEAR_RE = /\b(1[0-9]{3}|20[0-2][0-9])\b|\b\d{1,4}\s?(BCE|BC|CE|AD)\b/g;

const QUANT_MODULES = new Set([
  "Mathematics", "Physics", "Chemistry", "Engineering",
  "Applied Physics & Materials Science", "Cosmology", "Technical Elements",
]);
const HISTORY_MODULES = new Set([
  "Complex Systems & Humanities", "Bible Studies", "Language & Literature", "Music",
]);

// ── HTML → readable text ─────────────────────────────────────────────────────

const ENTITY = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", times: "×", deg: "°", pi: "π", middot: "·", minus: "−" };
function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITY[n.toLowerCase()] ?? m);
}

const BLOCK_TAGS = /<\/?(p|div|section|article|aside|header|footer|main|li|ul|ol|h[1-6]|tr|td|th|table|figure|figcaption|blockquote|details|summary|dt|dd|br|hr|nav|label|button|option)\b[^>]*>/gi;

function extract(html) {
  const scripts = [];
  let body = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, attrs, code) => {
    if (!/\bsrc=/.test(attrs) && !/type=["'](application\/(ld\+)?json|importmap)["']/i.test(attrs)) scripts.push(code);
    return " ";
  });
  const codeBlocks = [];
  body = body
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<head\b[\s\S]*?<\/head>/i, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<template\b[\s\S]*?<\/template>/gi, " ")
    .replace(/<(pre|code|textarea)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _t, c) => { codeBlocks.push(decode(c.replace(/<[^>]+>/g, ""))); return " "; })
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ");
  const text = decode(body.replace(BLOCK_TAGS, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return { text, scripts, codeBlocks };
}

// Prose that lessons render from JS (timelines, quiz banks, step text).
// Only long string literals that read like sentences count.
function scriptProse(code) {
  const out = [];
  const re = /(["'`])((?:\\.|(?!\1)[^\\\n]){60,}?)\1/g;
  let m;
  while ((m = re.exec(code))) {
    const s = m[2].replace(/\$\{[^}]*\}/g, " ").replace(/<[^>]+>/g, " ").replace(/\\n/g, " ").replace(/\\(["'`])/g, "$1");
    const words = s.trim().split(/\s+/);
    if (words.length >= 8 && /[a-z]{3,} [a-z]{2,} [a-z]{2,}/i.test(s) && !/[{};]\s*$|=>|function\s*\(|rgba?\(|\.(png|jpe?g|svg|js|css)\b/.test(s)) {
      out.push(decode(s.trim()));
    }
  }
  return out;
}

function localScriptSources(html, file) {
  const owned = [];
  const shared = [];
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const src = m[1];
    if (/^(https?:)?\/\//.test(src)) continue;
    const abs = path.resolve(path.dirname(file), src.split(/[?#]/)[0]);
    if (!fs.existsSync(abs)) continue;
    const rel = path.relative(ROOT, abs);
    // Lesson-owned scripts count in full; shared engines only for the blocks keyed to this lesson.
    if (rel.startsWith(path.join("assets", "js", "lessons") + path.sep) || path.dirname(abs) === path.dirname(file)) owned.push(abs);
    else if (rel.startsWith(path.join("assets", "js") + path.sep)) shared.push(abs);
  }
  return { owned, shared };
}

// Data-driven pages (e.g. <main data-bible-lesson="the-tabernacle">) keep their
// content in a shared engine keyed by lesson id. Pull the indented blocks that
// belong to that id: `'the-tabernacle': {…}` / `id: 'the-tabernacle', …`.
function keyedBlocks(code, id) {
  if (!code.includes(id)) return "";
  const lines = code.split("\n");
  const keyRe = new RegExp(`(['"])${id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\1\\s*[:,\\]]|\\bid:\\s*(['"])${id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\2`);
  const indent = (s) => s.match(/^\s*/)[0].length;
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!keyRe.test(lines[i])) continue;
    const base = indent(lines[i]);
    out.push(lines[i]);
    for (let j = i + 1; j < lines.length && j < i + 400; j++) {
      if (lines[j].trim() && indent(lines[j]) <= base) break;
      out.push(lines[j]);
    }
  }
  return out.join("\n");
}

function lessonIdsFor(html, lesson) {
  const ids = new Set([lesson.id, path.basename(lesson.url, ".html")]);
  for (const m of html.matchAll(/data-[a-z-]*lesson=["']([^"']+)["']/gi)) ids.add(m[1]);
  return [...ids].filter((x) => x && x.length > 3);
}

function sentences(text) {
  return text
    .replace(/\n+/g, " \n ")
    .split(/(?<=[.!?])\s+(?=[A-Z“"(])|\s\n\s/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

const countRe = (re, s) => (s.match(re) || []).length;
const wordCount = (s) => (s.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length;

// ── Audit one lesson ─────────────────────────────────────────────────────────

function auditLesson(lesson) {
  const file = path.join(ROOT, lesson.url);
  if (!fs.existsSync(file)) return { ...pick(lesson), missing: true };
  const html = fs.readFileSync(file, "utf8");
  const { text, scripts, codeBlocks } = extract(html);

  let scriptBytes = scripts.reduce((n, s) => n + s.length, 0);
  const jsProse = scripts.flatMap(scriptProse);
  const { owned, shared } = localScriptSources(html, file);
  for (const ext of owned) {
    const code = fs.readFileSync(ext, "utf8");
    scriptBytes += code.length;
    jsProse.push(...scriptProse(code));
  }
  const ids = lessonIdsFor(html, lesson);
  for (const ext of shared) {
    const code = fs.readFileSync(ext, "utf8");
    const block = ids.map((id) => keyedBlocks(code, id)).join("\n");
    if (block.trim()) jsProse.push(...scriptProse(block));
  }

  const rendered = RENDERED.get(lesson.url);
  const base = rendered && wordCount(rendered) > wordCount(text) ? rendered : text;
  const extra = rendered ? jsProse.filter((s) => !rendered.includes(s.slice(0, 60))) : jsProse;
  const prose = [base, ...extra].join("\n");
  const proseWords = wordCount(prose);
  const htmlWords = wordCount(base);
  const per1k = (n) => (proseWords ? (n * 1000) / proseWords : 0);

  const causal = countRe(CAUSAL_RE, prose);
  const worked = countRe(WORKED_RE, prose);
  const checks = countRe(CHECK_RE, prose) + countRe(/<details\b|data-quiz|class=["'][^"']*\b(quiz|exit-ticket|check)\b/gi, html);
  const questions = countRe(/\?(\s|$)/g, prose);
  const sourceHits = countRe(SOURCE_RE, prose) + countRe(/href=["']https?:\/\/[^"']*(\.edu|\.gov|doi\.org|wikipedia\.org|archive\.org|nasa\.gov|britannica\.com|jstor\.org|loc\.gov|nature\.com|science\.org)/gi, html);
  const hype = countRe(HYPE_RE, prose);
  const legends = countRe(LEGEND_RE, prose);
  const years = countRe(YEAR_RE, prose);
  const equations = countRe(/[A-Za-zα-ωΔπ]\s?=\s?[-\dA-Za-zα-ωΔπ(√]/g, prose) + countRe(/<math\b|class=["'][^"']*\b(katex|equation|formula)\b/gi, html);

  // Myth scan
  const myths = [];
  const seen = new Set();
  for (const s of sentences(prose)) {
    for (const rule of MYTHS) {
      if (!rule.re.test(s)) continue;
      const addressed = DEBUNK_RE.test(s);
      const key = rule.id + "|" + s.slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      myths.push({ id: rule.id, sev: rule.sev, addressed, sentence: s.length > 320 ? s.slice(0, 317) + "…" : s, fix: rule.fix });
    }
  }

  // Signals
  const signals = [];
  const add = (id, weight, detail) => signals.push({ id, weight, detail });
  const mod = lesson.primaryModule;
  const kbPerWord = proseWords ? scriptBytes / proseWords : Infinity;

  if (proseWords < 250) add("thin-explanation", 3, `${proseWords} words of readable prose`);
  else if (proseWords < 600) add("short-explanation", 1, `${proseWords} words of readable prose`);
  if (scriptBytes > 20000 && kbPerWord > 60) add("demo-without-explanation", 2, `${Math.round(scriptBytes / 1024)} KB of lesson JS for ${proseWords} words (${Math.round(kbPerWord)} B/word)`);
  if (proseWords >= 250 && per1k(causal) < 2.5) add("assertion-without-mechanism", 2, `${per1k(causal).toFixed(1)} causal connectives per 1000 words (because/therefore/which means…)`);
  if (QUANT_MODULES.has(mod) && worked === 0) add("no-worked-example", 2, "no worked example, walkthrough, or derivation markers");
  if (QUANT_MODULES.has(mod) && equations === 0 && proseWords > 400) add("no-quantitative-model", 1, "quantitative subject with no equations or formulas on the page");
  if (checks === 0 && questions < 3) add("no-check-for-understanding", 2, "no quiz, prediction, exit ticket, or questions");
  const historyHeavy = HISTORY_MODULES.has(mod) || /pioneers|history|origins|ages|timeline/i.test(lesson.url) || years >= 8;
  if (historyHeavy && sourceHits === 0) add("no-sources", 2, `${years} dates/years cited but no sources, references, or credits`);
  if (legends > 0) add("unqualified-legend", 1, `${legends} "legend says / it is said" phrasing`);
  if (per1k(hype) > 4) add("hype-over-substance", 1, `${per1k(hype).toFixed(1)} hype words per 1000 words`);

  const liveMyths = myths.filter((m) => !m.addressed);
  const mythScore = liveMyths.reduce((n, m) => n + (m.sev === "high" ? 5 : m.sev === "medium" ? 3 : 1), 0);
  const score = mythScore + signals.reduce((n, s) => n + s.weight, 0);
  const tier = liveMyths.some((m) => m.sev === "high") || score >= 8 ? "high" : score >= 4 ? "medium" : "low";

  const result = {
    ...pick(lesson),
    tier, score,
    metrics: {
      proseWords, htmlWords, jsProseWords: proseWords - htmlWords, scriptKB: Math.round(scriptBytes / 1024),
      causalPer1k: +per1k(causal).toFixed(1), workedExampleMarkers: worked, checkMarkers: checks, questions,
      sourceMarkers: sourceHits, years, equations, hypePer1k: +per1k(hype).toFixed(1), codeBlocks: codeBlocks.length,
    },
    signals, myths,
  };
  if (EXTRACT_DIR) result._prose = prose;
  return result;
}

function pick(l) {
  return { id: l.id, title: l.title, url: l.url, module: l.primaryModule, gradeBand: l.gradeBand, lessonType: l.lessonType };
}

// ── --render: read what the browser actually shows ──────────────────────────

async function renderAll(lessons) {
  const http = await import("node:http");
  const { chromium } = await import("playwright");
  const { findChromium } = await import("../lib/find-chromium.mjs");
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".wasm": "application/wasm" };
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: findChromium(), args: ["--use-gl=swiftshader", "--mute-audio"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // Third-party assets (fonts, CDNs, video embeds) don't carry lesson prose.
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  const queue = [...lessons];
  let done = 0;
  const worker = async () => {
    const page = await ctx.newPage();
    page.on("dialog", (d) => d.dismiss().catch(() => {}));
    while (queue.length) {
      const l = queue.shift();
      try {
        await page.goto(base + l.url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1500);
        const txt = await page.evaluate(() => {
          const root = document.querySelector("main") || document.body;
          const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS", "TEMPLATE", "NAV", "CODE", "PRE", "TEXTAREA", "SELECT"]);
          const BLOCK = /^(P|DIV|SECTION|ARTICLE|ASIDE|HEADER|FOOTER|LI|H[1-6]|TR|TD|TH|FIGCAPTION|BLOCKQUOTE|DETAILS|SUMMARY|DT|DD|BR|LABEL|BUTTON)$/;
          const out = [];
          (function walk(n) {
            for (const c of n.childNodes) {
              if (c.nodeType === 3) out.push(c.nodeValue);
              else if (c.nodeType === 1 && !SKIP.has(c.tagName.toUpperCase())) {
                if (BLOCK.test(c.tagName)) out.push("\n");
                walk(c);
                if (BLOCK.test(c.tagName)) out.push("\n");
              }
            }
          })(root);
          return out.join("").replace(/[ \t\r\f\v]+/g, " ").replace(/\n\s*/g, "\n").replace(/\n{2,}/g, "\n").trim();
        });
        RENDERED.set(l.url, txt);
      } catch (e) {
        console.warn(`[pedagogy] render failed for ${l.url}: ${e.message.split("\n")[0]}`);
      }
      if (++done % 50 === 0) console.log(`[pedagogy] rendered ${done}/${lessons.length}`);
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  await browser.close();
  server.close();
}

// ── Run ──────────────────────────────────────────────────────────────────────

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "lessons.json"), "utf8")).lessons
  .filter((l) => l.url && l.url.startsWith("lessons/") && l.url.endsWith(".html"))
  .filter((l) => !ONLY || l.url.includes(ONLY) || (l.primaryModule || "").toLowerCase().includes(ONLY.toLowerCase()));

const RENDERED = new Map();
if (RENDER) await renderAll(catalog);

const results = catalog.map(auditLesson);
const missing = results.filter((r) => r.missing);
const audited = results.filter((r) => !r.missing).sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));

if (EXTRACT_DIR) {
  const dir = path.resolve(EXTRACT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  for (const r of audited) {
    const out = path.join(dir, r.url.replace(/^lessons\//, "").replace(/\.html$/, ".txt"));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const head = `# ${r.title}\n# ${r.url} | ${r.module} | grades ${r.gradeBand} | tier ${r.tier} (score ${r.score})\n# signals: ${r.signals.map((s) => s.id).join(", ") || "none"}\n\n`;
    fs.writeFileSync(out, head + r._prose + "\n");
    delete r._prose;
  }
  console.log(`[pedagogy] extracted readable text for ${audited.length} lessons → ${path.relative(ROOT, dir)}`);
}

const byTier = (t) => audited.filter((r) => r.tier === t);
const allMyths = audited.flatMap((r) => r.myths.map((m) => ({ ...m, url: r.url, title: r.title })));
const liveMyths = allMyths.filter((m) => !m.addressed);

console.log(`[pedagogy] audited ${audited.length} lessons (${missing.length} catalogue URLs missing on disk)`);
console.log(`[pedagogy] risk tiers: high ${byTier("high").length} · medium ${byTier("medium").length} · low ${byTier("low").length}`);
console.log(`[pedagogy] myth sentences: ${liveMyths.length} stated as fact · ${allMyths.length - liveMyths.length} already addressed/debunked`);
for (const m of liveMyths.filter((m) => m.sev !== "low")) {
  console.log(`  [${m.sev}] ${m.id} — ${m.url}\n      “${m.sentence.slice(0, 160)}”`);
}

if (WRITE_REPORT) {
  const outDir = path.join(ROOT, "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const json = { extraction: { mode: RENDER ? "rendered-plus-source" : "source", catalogCount: catalog.length, renderedCount: RENDERED.size, renderFailures: RENDER ? catalog.filter((l) => !RENDERED.has(l.url)).map((l) => l.url) : [] }, generated: new Date().toISOString().slice(0, 10), rules: MYTHS.map(({ id, sev, fix }) => ({ id, sev, fix })), missing: missing.map((m) => m.url), lessons: audited };
  fs.writeFileSync(path.join(outDir, "lesson-pedagogy-audit.json"), JSON.stringify(json, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "lesson-pedagogy-audit.md"), renderMarkdown(audited, liveMyths, allMyths, missing));
  console.log(`[pedagogy] wrote reports/lesson-pedagogy-audit.md and .json`);
}

function renderMarkdown(rows, live, all, missingRows) {
  const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = [];
  lines.push("# Lesson Pedagogy Audit (automated)", "");
  lines.push(`Generated ${new Date().toISOString().slice(0, 10)} by \`npm run audit:pedagogy\`. Heuristics only — they decide *what to read first*, not what is wrong. These flags require human review; they are not a completed expert review.`, "");
  lines.push(`Extraction: ${RENDER ? "rendered DOM plus source strings" : "source only"}. Rendered ${RENDERED.size}/${catalog.length} catalog pages.`, "");
  lines.push("Limits: keyword counts do not establish teaching quality or factual accuracy. DOM extraction includes hidden content; source strings may include inactive activities. Third-party requests are blocked, and interactions are not exercised.", "");
  lines.push("## Summary", "");
  lines.push(`| Tier | Lessons |`, `|---|---|`);
  for (const t of ["high", "medium", "low"]) lines.push(`| ${t} | ${rows.filter((r) => r.tier === t).length} |`);
  lines.push("", `Myth sentences stated as fact: **${live.length}** (${all.length - live.length} more are already framed as myths/debunked).`, "");
  const sigCount = {};
  for (const r of rows) for (const s of r.signals) sigCount[s.id] = (sigCount[s.id] || 0) + 1;
  lines.push("| Signal | Lessons | Meaning |", "|---|---|---|");
  const meaning = {
    "thin-explanation": "Under 250 words of readable explanation",
    "short-explanation": "250–600 words of readable explanation",
    "demo-without-explanation": "Large interactive sim, little text explaining what it shows or why",
    "assertion-without-mechanism": "States facts but rarely says *why* (few because/therefore/which means)",
    "no-worked-example": "Quantitative subject with no worked example, walkthrough or derivation",
    "no-quantitative-model": "Quantitative subject with no equation on the page",
    "no-check-for-understanding": "No prediction, quiz, exit ticket or questions",
    "no-sources": "History-heavy content with no sources, references or credits",
    "unqualified-legend": "Uses 'legend says / it is said' without evidence",
    "hype-over-substance": "High density of hype words (amazing, magic, secret…)",
  };
  for (const [id, n] of Object.entries(sigCount).sort((a, b) => b[1] - a[1])) lines.push(`| \`${id}\` | ${n} | ${meaning[id] || ""} |`);
  lines.push("");

  lines.push("## Myths stated as fact", "");
  if (!live.length) lines.push("None detected.", "");
  else {
    lines.push("| Severity | Rule | Lesson | Sentence | Accurate version |", "|---|---|---|---|---|");
    for (const m of live.sort((a, b) => "hml".indexOf(a.sev[0]) - "hml".indexOf(b.sev[0]))) {
      lines.push(`| ${m.sev} | \`${m.id}\` | [${esc(m.title)}](../${m.url}) | ${esc(m.sentence)} | ${esc(m.fix)} |`);
    }
    lines.push("");
  }

  lines.push("## Lessons by risk", "");
  lines.push("| Tier | Score | Lesson | Module | Words | JS KB | Signals |", "|---|---|---|---|---|---|---|");
  for (const r of rows.filter((r) => r.tier !== "low")) {
    lines.push(`| ${r.tier} | ${r.score} | [${esc(r.title)}](../${r.url}) | ${esc(r.module)} | ${r.metrics.proseWords} | ${r.metrics.scriptKB} | ${r.signals.map((s) => `\`${s.id}\``).join(" ")} |`);
  }
  lines.push("", `${rows.filter((r) => r.tier === "low").length} low-risk lessons omitted; see the JSON for every metric.`, "");
  if (missingRows.length) {
    lines.push("## Catalogue entries missing on disk", "", ...missingRows.map((m) => `- \`${m.url}\``), "");
  }
  return lines.join("\n");
}

if (STRICT && liveMyths.some((m) => m.sev === "high")) {
  console.error("[pedagogy] FAIL: high-severity myth stated as fact (see above)");
  process.exit(1);
}
