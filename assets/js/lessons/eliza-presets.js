import { DOCTOR_1966 } from "./eliza-doctor-1966.js";

export const CACM_1966_TRANSCRIPT = [
  {
    step: 1,
    prompt: "Men are all alike.",
    expectedReply: "IN WHAT WAY",
    mechanismTag: "ALIKE(10) → (=DIT)",
    note: "ALIKE has rank 10 (beating ARE rank 0) and chains directly to (=DIT), rotating to reply #1."
  },
  {
    step: 2,
    prompt: "They're always bugging us about something or other.",
    expectedReply: "CAN YOU THINK OF A SPECIFIC EXAMPLE",
    mechanismTag: "ALWAYS(1)",
    note: "Only ALWAYS matches (rank 1). Decomposition (0) accepts the entire clause and picks template #1."
  },
  {
    step: 3,
    prompt: "Well, my boyfriend made me come here.",
    expectedReply: "YOUR BOYFRIEND MADE YOU COME HERE",
    mechanismTag: "Comma Skip + MY(2) + 36-bit BCD Memory",
    note: "'WELL' before the comma has no keyword and is dropped. MY(2) reflects MY→YOUR and ME→YOU, and hashes 'HERE' (BCD 302551256060 → slot 3) into MEMORY."
  },
  {
    step: 4,
    prompt: "He says I'm depressed much of the time.",
    expectedReply: "I AM SORRY TO HEAR YOU ARE DEPRESSED",
    mechanismTag: "(PRE (YOU ARE 3) (=I))",
    note: "I'M translates to YOU'RE, then triggers a PRE rewrite to (YOU ARE DEPRESSED MUCH OF THE TIME) and pushes (=I) onto KEYSTACK."
  },
  {
    step: 5,
    prompt: "It's true. I am unhappy.",
    expectedReply: "DO YOU THINK COMING HERE WILL HELP YOU NOT TO BE UNHAPPY",
    mechanismTag: "Period Skip + (*SAD UNHAPPY ...)",
    note: "'IT'S TRUE.' has no keywords so ELIZA advances past the period to 'I AM UNHAPPY', matching the sadness word-group."
  },
  {
    step: 6,
    prompt: "I need some help, that much seems certain.",
    expectedReply: "WHAT WOULD IT MEAN TO YOU IF YOU GOT SOME HELP",
    mechanismTag: "Comma Guillotine + (* WANT NEED)",
    note: "Once I(0) lands on KEYSTACK, the comma cuts off 'that much seems certain' completely."
  },
  {
    step: 7,
    prompt: "Perhaps I could learn to get along with my mother.",
    expectedReply: "TELL ME MORE ABOUT YOUR FAMILY",
    mechanismTag: "MY(2) + DLIST(/FAMILY)",
    note: "MY(2) outranks PERHAPS(0) and I(0). MOTHER carries DLIST(/NOUN FAMILY), matching (0 YOUR 0 (/FAMILY) 0)."
  },
  {
    step: 8,
    prompt: "My mother takes care of me.",
    expectedReply: "WHO ELSE IN YOUR FAMILY TAKES CARE OF YOU",
    mechanismTag: "Reassembly Rotation #2",
    note: "The same (/FAMILY) decomposition matches again, so the rule's cursor advances to its 2nd template instead of repeating itself."
  },
  {
    step: 9,
    prompt: "My father.",
    expectedReply: "YOUR FATHER",
    mechanismTag: "Reassembly Rotation #3",
    note: "FATHER also carries /FAMILY; the cursor advances to template #3: (YOUR 4)."
  },
  {
    step: 10,
    prompt: "You are like my father in some ways.",
    expectedReply: "WHAT RESEMBLANCE DO YOU SEE",
    mechanismTag: "LIKE(10) → (=DIT) Rotation #2",
    note: "LIKE(10) outranks MY(2), YOU(0), ARE(0). It jumps to DIT, whose rotation cursor is now at reply #2."
  },
  {
    step: 11,
    prompt: "You are not very aggressive but I think you don't want me to notice that.",
    expectedReply: "WHAT MAKES YOU THINK I AM NOT VERY AGGRESSIVE",
    mechanismTag: "BUT Guillotine",
    note: "'BUT' acts as a clause delimiter after YOU(0) and ARE(0) are stacked, discarding the entire second half of the sentence."
  },
  {
    step: 12,
    prompt: "You don't argue with me.",
    expectedReply: "WHY DO YOU THINK I DON'T ARGUE WITH YOU",
    mechanismTag: "YOU(0) → (0 I 0 YOU) #2",
    note: "YOU translates to I and ME translates to YOU; the cursor advances to the 2nd (0 I 0 YOU) template."
  },
  {
    step: 13,
    prompt: "You are afraid of me.",
    expectedReply: "DOES IT PLEASE YOU TO BELIEVE I AM AFRAID OF YOU",
    mechanismTag: "YOU(0) → (0 I ARE 0) #2",
    note: "YOU=I and ARE match (0 I ARE 0), advancing that pattern's cursor to reply #2."
  },
  {
    step: 14,
    prompt: "My father is afraid of everybody.",
    expectedReply: "WHAT ELSE COMES TO MIND WHEN YOU THINK OF YOUR FATHER",
    mechanismTag: "MY(2) vs EVERYBODY(2) Tie",
    note: "MY(2) enters first. EVERYBODY(2) is NOT > topRank(2), so it is pushed to the bottom. MY wins and advances (/FAMILY) to #4."
  },
  {
    step: 15,
    prompt: "Bullies.",
    expectedReply: "DOES THAT HAVE ANYTHING TO DO WITH THE FACT THAT YOUR BOYFRIEND MADE YOU COME HERE",
    mechanismTag: "LIMIT = 4 + MEMORY Recall",
    note: "Zero keywords match 'BULLIES', and the 4-turn LIMIT clock hits 4—so ELIZA pops the Turn-3 MEMORY saved from 'MY BOYFRIEND MADE ME COME HERE'!"
  }
];

const CLASSROOM_RULES_BLOCK = `
(HOMEWORK 20
    ((0 HOMEWORK 0)
        (DOES YOUR HOMEWORK FEEL OVERWHELMING OR UNCLEAR)
        (WHAT PART OF THAT HOMEWORK ARE YOU STUCK ON)
        (HOW DOES THAT ASSIGNMENT CONNECT TO YOUR PROBLEM)))

(CODING 15
    ((0 (* CODING CODE PROGRAMMING BUG DEBUGGING) 0)
        (WHAT HAPPENS WHEN YOU TRACE THAT 2 LINE BY LINE)
        (DOES THAT BUG REMIND YOU OF AN ASSUMPTION YOU MADE)
        (TELL ME WHAT YOU EXPECTED THE CODE TO DO)))

(TEST 12
    ((0 (* TEST QUIZ EXAM) 0)
        (WHAT ABOUT THAT 2 MAKES YOU FEEL THAT WAY)
        (HAVE YOU PRACTICED EXPLAINING THE IDEA OUT LOUD)
        (HOW DO YOU USUALLY PREPARE FOR A 2)))
`;

export const CUSTOM_SCRIPT_PRESETS = [
  {
    id: "doctor-1966",
    label: "1966 DOCTOR (Weizenbaum Original)",
    description: "Unmodified 1966 Communications of the ACM script (page 44).",
    script: DOCTOR_1966
  },
  {
    id: "doctor-classroom",
    label: "DOCTOR + Classroom Rules (Editable)",
    description: "Original 1966 DOCTOR script extended with HOMEWORK(20), CODING(15), and TEST(12) rules.",
    script: DOCTOR_1966.replace(/\(\)\s*$/, `${CLASSROOM_RULES_BLOCK}\n()\n`)
  },
  {
    id: "pirate-counselor",
    label: "Pirate Counselor (Same Engine, New Script)",
    description: "Demonstrates that ELIZA's algorithm knows nothing about therapy—swap the script text and the persona changes completely.",
    script: `(AHOY. TELL THE CAPTAIN WHAT TROUBLES YER VOYAGE.)

START

(DONT = DON'T)
(CANT = CAN'T)
(WONT = WON'T)
(AM = ARE)
(ME = YOU)
(MYSELF = YOURSELF)
(YOURSELF = MYSELF)
(I'M = YOU'RE
    ((0 YOU'RE 0)
        (PRE (YOU ARE 3) (=I))))
(YOU'RE = I'M
    ((0 I'M 0)
        (PRE (I ARE 3) (=YOU))))

(MEMORY MY
    (0 YOUR 0 = BY THE COMPASS, EARLIER YE MENTIONED YER 3)
    (0 YOUR 0 = DOES THE TIDE STILL TURN AROUND YER 3)
    (0 YOUR 0 = LET US CHART A COURSE PAST YER 3)
    (0 YOUR 0 = THAT REMINDS THE CREW OF YER 3))

(COMPUTER 50
    ((0)
        (WHAT SORCERY BE THIS COMPUTING ENGINE)
        (A BRASS ASTROLABE NEVER CRASHED ON ME)
        (DOES THAT CLOCKWORK MACHINE STEER YER SHIP)))

(MACHINE 50 (=COMPUTER))
(COMPUTERS 50 (=COMPUTER))

(SHIP 20
    ((0)
        (ALL HANDS ON DECK WHEN YER SHIP TAKES WATER)
        (WHO STANDS WATCH UPON THAT VESSEL)))

(SEA 15
    ((0)
        (THE SEA KEEPS NO SECRETS FROM A SHARP NAVIGATOR)
        (WHAT STORMS BE GATHERING ON THAT HORIZON)))

(SORRY
    ((0)
        (NO APOLOGIES ON THIS DECK, SAILOR)
        (SAVE YER SORRIES FOR THE KRACKEN)))

(I = YOU
    ((0 YOU FEEL 0)
        (AYE, WHY DO YE FEEL 4 UPON THESE WATERS)
        (DO THE SEAS MAKE YE FEEL 4 OFTEN))
    ((0 YOU (* WANT NEED) 0)
        (WHAT TREASURE WOULD 4 BRING YE)
        (SUPPOSE YE CAPTURED 4 BEFORE SUNDOWN))
    ((0 YOU ARE 0)
        (HOW MANY LEAGUES HAVE YE BEEN 4)
        (DOES BEING 4 HELP YE SAIL STRAIGHTER))
    ((0)
        (SPEAK PLAINLY TO THE CAPTAIN ABOUT THAT)
        (WHAT ELSE BE IN YER LOGBOOK)))

(MY = YOUR 2
    ((0 YOUR 0)
        (YER 3 BE IMPORTANT TO THIS VOYAGE)
        (WHY BRING UP YER 3 AT THIS HOUR)))

(YOU = I
    ((0 I 0)
        (KEEP YER EYES ON YER OWN COMPASS, NOT ON ME)
        (AYE, YE RECKON I 3)))

(YES
    ((0)
        (HAR. STEADY AS SHE GOES)))

(NO
    ((0)
        (MUTINOUS NEGATIVITY, EH)))

(NONE
    ((0)
        (THE WIND DROPPED. SPIN ANOTHER YARN)
        (KEEP TALKING BEFORE THE TIDE GOES OUT)
        (HOW DOES THAT STEER YER CREW)))

()
`
  },
  {
    id: "honest-parrot",
    label: "Honest Rule Mirror (Zero Illusion)",
    description: "A transparent script that refuses to pretend it understands—it literally reports the pattern match in its reply.",
    script: `(HELLO. I AM AN EXPLICIT PATTERN SCRIPT. TYPE A SENTENCE TO SEE WHICH KEYWORD RULE FIRES.)

START

(AM = ARE)
(ME = YOU)
(I'M = YOU'RE
    ((0 YOU'RE 0)
        (PRE (YOU ARE 3) (=I))))

(MEMORY MY
    (0 YOUR 0 = MEMORY QUEUE REPLAY AT LIMIT 4: EARLIER YOUR 3)
    (0 YOUR 0 = MEMORY QUEUE REPLAY AT LIMIT 4: STORED YOUR 3)
    (0 YOUR 0 = MEMORY QUEUE REPLAY AT LIMIT 4: RECALLED YOUR 3)
    (0 YOUR 0 = MEMORY QUEUE REPLAY AT LIMIT 4: FROM EARLIER YOUR 3))

(COMPUTER 50
    ((0)
        (KEYSTACK TOP HIT: COMPUTER RANK 50 OVERRODE LOWER WORDS)
        (RULE COMPUTER RANK 50 IGNORED THE REST OF YOUR SENTENCE)))

(I = YOU
    ((0 YOU FEEL 0)
        (RULE I->YOU MATCHED FEEL. REFLECTED SUFFIX: 4)
        (TEMPLATE INSERTED SLOT 4 AFTER FEEL: 4))
    ((0 YOU ARE 0)
        (RULE I->YOU MATCHED ARE. REFLECTED STATE: 4)
        (PRONOUN SWAP PRODUCED: YOU ARE 4))
    ((0)
        (CATCH-ALL RULE FOR KEYWORD I MATCHED NO SPECIFIC VERB)))

(MY = YOUR 2
    ((0 YOUR 0)
        (RULE MY->YOUR RANK 2 CAPTURED: 3)
        (MEMORY ALSO HASHED LAST WORD TO STORE: YOUR 3)))

(YOU = I
    ((0 I 0)
        (RULE YOU->I MATCHED. ZERO SEMANTIC MODEL PRESENT)))

(NONE
    ((0)
        (ZERO KEYWORDS MATCHED. FALLBACK RULE NONE FIRED)
        (NONE RULE ROTATION #2: STILL NO KEYWORDS DETECTED)))

()
`
  }
];

const ABSURD_TEST_TOKENS = new Set([
  "PURPLE", "REFRIGERATOR", "FRIDGE", "TOASTER", "BANANA", "WAFFLE", "GIBBERISH",
  "BLORGL", "OCTOPUS", "PENGUIN", "CHEESE", "SPAGHETTI", "UNICORN", "ZEBRA",
  "BROCCOLI", "PICKLE", "LAMP", "POTATO", "MARSHMALLOW", "KANGAROO", "SOCKS"
]);

export const BREAK_CHALLENGES = [
  {
    id: "precedence-hijack",
    title: "1. Trigger a Rank-50 Hijack",
    goal: "Force COMPUTER or MACHINE (precedence 50) to discard a more emotional lower-rank keyword like I(0) or MY(2).",
    hint: "Include 'computer' or 'machine' anywhere alongside 'I feel' or 'my'.",
    samplePrompt: "I feel sad because my computer broke.",
    check(trace) {
      return (trace.source === "COMPUTER" || trace.source === "MACHINE" || trace.source === "COMPUTERS" || trace.source === "MACHINES") &&
        trace.keystackDetail.length >= 2;
    }
  },
  {
    id: "but-guillotine",
    title: "2. Spring the BUT Guillotine",
    goal: "Write a 2-clause sentence split by 'but' or a comma where the first clause holds a keyword and the second gets thrown away.",
    hint: "Put a keyword like 'I am' or 'you are' BEFORE the word 'but', and put the real point AFTER 'but'.",
    samplePrompt: "You are helpful but my rocket exploded in orbit.",
    check(trace) {
      return trace.clauses.some((c) => c.reason === "discarded-after-delimiter");
    }
  },
  {
    id: "memory-recall",
    title: "3. Catch a Turn-4 MEMORY Replay",
    goal: "Store a 'My ...' phrase into MEMORY, then send keyword-free prompts until LIMIT reaches 4 and ELIZA recalls it.",
    hint: "Send 'My dog ate my homework.' (stores MY), then send short keyword-free words like 'Okay.' or 'Bullies.' up to 3 times until LIMIT = 4.",
    samplePrompt: "My skateboard disappeared yesterday.",
    check(trace) {
      return trace.source === "MEMORY";
    }
  },
  {
    id: "rotation-loop",
    title: "4. Catch the Script Repeating Itself",
    goal: "Trigger the exact same decomposition rule enough times that its reassembly dial wraps all the way back to template #1.",
    hint: "Send 'Sorry.' 5 times in a row (SORRY has 4 replies, so the 5th wraps back to #1).",
    samplePrompt: "Sorry.",
    check(trace, ctx) {
      const win = trace.winningAttempt;
      if (!win || win.reassemblyTotal < 2) return false;
      const key = `${win.keyword}::${win.decompositionText}`;
      const seen = ctx.ruleHistory.get(key) || new Set();
      const wrapped = seen.size >= win.reassemblyTotal && win.reassemblyIndex === 0;
      seen.add(win.reassemblyIndex);
      ctx.ruleHistory.set(key, seen);
      return wrapped;
    }
  },
  {
    id: "zero-meaning",
    title: "5. Expose Syntax Without Meaning",
    goal: "Feed ELIZA an absurd sentence using 'I feel' or 'My' so it gives a solemn, sympathetic reply to total nonsense.",
    hint: "Try 'My purple refrigerator feels unhappy.' or any sentence pairing 'My'/'I am' with an absurd object.",
    samplePrompt: "My purple refrigerator feels unhappy.",
    check(trace) {
      const hasAbsurd = trace.normalizedTokens.some((tok) => ABSURD_TEST_TOKENS.has(tok));
      return hasAbsurd && trace.source !== "NONE" && trace.source !== "NOMATCH";
    }
  }
];

// =========================================================================
// EVOLUTION LAB DATASET: 1966 -> MODERN LLMS
// =========================================================================

export const EVOLUTION_PROMPTS = [
  {
    id: "mother-computer",
    label: "Family vs Computer",
    text: "My mother says I spend too much time on my computer.",
    altText: null,
    altLabel: null,
    lessonHint: "Watch ELIZA ignore 'mother' completely because COMPUTER has rank 50."
  },
  {
    id: "river-bank",
    label: "Word Sense: Bank",
    text: "The bank by the river was flooded after the storm.",
    altText: "The bank approved my loan after the review.",
    altLabel: "Switch to Finance Bank",
    lessonHint: "Compare Word2Vec's single static vector for 'bank' against Transformer contextual attention."
  },
  {
    id: "winograd-trophy",
    label: "Pronoun: Trophy / Suitcase",
    text: "The trophy didn't fit in the suitcase because it was too big.",
    altText: "The trophy didn't fit in the suitcase because it was too small.",
    altLabel: "Flip big ↔ small",
    lessonHint: "Flip one adjective ('big' ↔ 'small') and watch Transformer attention on 'it' swap nouns."
  },
  {
    id: "math-test",
    label: "Classroom Feeling",
    text: "I feel nervous about my math test tomorrow.",
    altText: null,
    altLabel: null,
    lessonHint: "Trace how keyword templates give way to counts, vectors, hidden states, and attention."
  }
];

export const EVOLUTION_ERAS = [
  {
    id: "1966",
    year: "1966",
    shortTitle: "ELIZA Rules",
    title: "1966 · Hand-Written Pattern Rules (MAD-SLIP)",
    weights: "0 learned parameters",
    contextReach: "1 clause (cut at , . BUT)",
    knowledge: "Hand-coded keyword ranks & templates",
    breakthrough: "Pronoun swaps + ranked templates create a conversational illusion on a 1960s mainframe.",
    limit: "Understands zero meaning. Rank 50 (COMPUTER) blindly ignores the rest of the sentence."
  },
  {
    id: "1972",
    year: "1972",
    shortTitle: "Grammar Trees",
    title: "1972 · Symbolic Grammar & Micro-Worlds (SHRDLU)",
    weights: "0 learned parameters (grammar rules)",
    contextReach: "1 grammatical sentence",
    knowledge: "Explicit syntax trees + world ontology",
    breakthrough: "Parses Subject / Verb / Object roles inside narrow domains like toy blocks.",
    limit: "Brittle outside its rulebook—idioms, slang, or messy phrasing cause parse failure."
  },
  {
    id: "1990s",
    year: "1990s",
    shortTitle: "N-Grams",
    title: "1990s · Statistical N-Gram Counting",
    weights: "Corpus frequency tables (millions of n-grams)",
    contextReach: "Last 1–4 words only (n−1 window)",
    knowledge: "Empirical probability P(next | recent words)",
    breakthrough: "Replaces hand-written grammar with probabilities counted automatically from real text.",
    limit: "Blind to everything before the tiny sliding window; suffers combinatorial data sparsity."
  },
  {
    id: "2013",
    year: "2013",
    shortTitle: "Word2Vec",
    title: "2013 · Static Word Embeddings (Word2Vec)",
    weights: "~300 floats per vocabulary word",
    contextReach: "Bag of nearby co-occurring words",
    knowledge: "Geometry: cosine similarity & direction vectors",
    breakthrough: "Words with similar meanings cluster together; vector arithmetic encodes analogies.",
    limit: "Every word gets ONE frozen point—'river bank' and 'loan bank' share the exact same vector."
  },
  {
    id: "2014",
    year: "2014",
    shortTitle: "RNN / LSTM",
    title: "2014 · Recurrent Neural Networks (RNN / LSTM)",
    weights: "Millions of recurrent weights",
    contextReach: "Sequential bottleneck (decays with distance)",
    knowledge: "Fixed-size hidden state h_t updated step by step",
    breakthrough: "Reads variable-length sequences in order and passes a rolling summary vector forward.",
    limit: "Early words fade exponentially as the fixed hidden-state vector gets overwritten at each step."
  },
  {
    id: "2017",
    year: "2017–Now",
    shortTitle: "Transformers",
    title: "2017–Present · Transformer Self-Attention & LLMs",
    weights: "Billions to trillions of parameters",
    contextReach: "Full context window (direct token-to-token links)",
    knowledge: "Contextual Q·K·V attention + temperature sampling",
    breakthrough: "Every token looks directly at all earlier tokens in parallel, resolving 'it' and 'bank' dynamically.",
    limit: "High fluency increases the ELIZA Effect: probabilistic confidence can still hallucinate convincingly."
  }
];

export const GRAMMAR_PARSES = {
  "mother-computer": {
    slots: [
      { role: "NP (Subject)", text: "My mother", status: "parsed" },
      { role: "VERB", text: "says", status: "parsed" },
      { role: "COMP CLAUSE", text: "I spend too much time", status: "parsed" },
      { role: "PREP PHRASE", text: "on my computer", status: "parsed" }
    ],
    idiomTest: "Try 'My mom says I'm glued to the screen.' → Grammar parser fails: GLUED_TO is missing from physical-glue lexicon!"
  },
  "river-bank": {
    slots: [
      { role: "NP (Subject)", text: "The bank", status: "ambiguous" },
      { role: "PREP PHRASE", text: "by the river", status: "parsed" },
      { role: "PASSIVE VERB", text: "was flooded", status: "parsed" },
      { role: "TIME PHRASE", text: "after the storm", status: "parsed" }
    ],
    idiomTest: "Manual ontology rule needed: IF NEAR(river) THEN BANK_1 (geology) ELSE IF NEAR(loan) THEN BANK_2 (finance)."
  },
  "winograd-trophy": {
    slots: [
      { role: "NP1", text: "The trophy", status: "parsed" },
      { role: "VERB", text: "didn't fit in", status: "parsed" },
      { role: "NP2", text: "the suitcase", status: "parsed" },
      { role: "PRONOUN ?", text: "because [it] was too big", status: "ambiguous" }
    ],
    idiomTest: "Syntax leaves 'it' unresolved! Resolving 'it' requires physical-volume common sense rules that hand-coded trees lack."
  },
  "math-test": {
    slots: [
      { role: "SUBJ", text: "I", status: "parsed" },
      { role: "VERB", text: "feel", status: "parsed" },
      { role: "ADJ", text: "nervous", status: "parsed" },
      { role: "PREP PHRASE", text: "about my math test tomorrow", status: "parsed" }
    ],
    idiomTest: "Try 'I'm totally bombing calc tomorrow.' → Fails literal lexicon: BOMBING marked as military explosive action!"
  }
};

export const NGRAM_NEXT_WORDS = {
  "mother-computer": {
    bigram: [
      { word: "screen", p: 0.34 },
      { word: "games", p: 0.28 },
      { word: "every", p: 0.21 },
      { word: "keyboard", p: 0.17 }
    ],
    trigram: [
      { word: "all", p: 0.41 },
      { word: "tonight", p: 0.29 },
      { word: "screen", p: 0.19 },
      { word: "desk", p: 0.11 }
    ]
  },
  "river-bank": {
    bigram: [
      { word: "yesterday", p: 0.33 },
      { word: "last", p: 0.27 },
      { word: "warnings", p: 0.22 },
      { word: "clouds", p: 0.18 }
    ],
    trigram: [
      { word: "last", p: 0.44 },
      { word: "rolled", p: 0.24 },
      { word: "broke", p: 0.19 },
      { word: "yesterday", p: 0.13 }
    ]
  },
  "winograd-trophy": {
    bigram: [
      { word: "to", p: 0.42 },
      { word: "for", p: 0.27 },
      { word: "and", p: 0.19 },
      { word: "today", p: 0.12 }
    ],
    trigram: [
      { word: "to", p: 0.48 },
      { word: "for", p: 0.29 },
      { word: "inside", p: 0.14 },
      { word: "so", p: 0.09 }
    ]
  },
  "math-test": {
    bigram: [
      { word: "morning", p: 0.45 },
      { word: "afternoon", p: 0.24 },
      { word: "because", p: 0.19 },
      { word: "at", p: 0.12 }
    ],
    trigram: [
      { word: "morning", p: 0.52 },
      { word: "in", p: 0.22 },
      { word: "during", p: 0.16 },
      { word: "so", p: 0.10 }
    ]
  }
};

export const WORD2VEC_POINTS = [
  { word: "man", x: 0.22, y: 0.36, group: "people", note: "Gendered person vector" },
  { word: "woman", x: -0.22, y: 0.36, group: "people", note: "Gendered person vector" },
  { word: "king", x: 0.56, y: 0.72, group: "people", note: "king − man + woman ≈ queen" },
  { word: "queen", x: 0.14, y: 0.73, group: "people", note: "Parallel gender shift from king" },
  { word: "father", x: 0.25, y: 0.56, group: "family", note: "mother − woman + man ≈ father" },
  { word: "mother", x: -0.19, y: 0.56, group: "family", note: "Family caregiver cluster" },
  { word: "river", x: -0.74, y: 0.52, group: "nature", note: "Water / geography cluster" },
  { word: "flood", x: -0.66, y: 0.40, group: "nature", note: "Water / weather cluster" },
  { word: "bank", x: 0.02, y: 0.30, group: "polysemy", note: "STATIC COLLISION: averages 'river' & 'loan'!" },
  { word: "loan", x: 0.78, y: 0.14, group: "finance", note: "Banking / credit cluster" },
  { word: "money", x: 0.82, y: 0.26, group: "finance", note: "Finance cluster" },
  { word: "computer", x: 0.74, y: -0.34, group: "tech", note: "Hardware / computing cluster" },
  { word: "machine", x: 0.70, y: -0.46, group: "tech", note: "Close neighbor of computer" },
  { word: "nervous", x: -0.72, y: -0.44, group: "emotion", note: "Affect / feeling cluster" },
  { word: "anxious", x: -0.76, y: -0.35, group: "emotion", note: "Near-synonym of nervous" },
  { word: "trophy", x: 0.42, y: -0.12, group: "object", note: "Physical object cluster" },
  { word: "suitcase", x: 0.33, y: -0.22, group: "object", note: "Container object cluster" }
];

export const TRANSFORMER_PROFILES = {
  "mother-computer": {
    focusIndex: 10,
    links: {
      10: { 1: 0.18, 3: 0.08, 4: 0.24, 7: 0.22, 9: 0.16, 10: 0.12 },
      1: { 0: 0.28, 1: 0.16, 2: 0.24, 4: 0.14, 10: 0.18 }
    },
    logits: [
      { token: "every", z: 2.35 },
      { token: "instead", z: 1.92 },
      { token: "lately", z: 1.70 },
      { token: "playing", z: 1.48 },
      { token: "banana", z: -1.40 }
    ]
  },
  "river-bank": {
    focusIndex: 1,
    links: {
      1: { 1: 0.12, 4: 0.46, 6: 0.28, 9: 0.14 },
      6: { 1: 0.38, 4: 0.34, 6: 0.16, 9: 0.12 }
    },
    altLinks: {
      1: { 1: 0.10, 2: 0.34, 4: 0.42, 7: 0.14 },
      4: { 1: 0.42, 2: 0.30, 4: 0.16, 7: 0.12 }
    },
    logits: [
      { token: "overnight", z: 2.25 },
      { token: "water", z: 1.85 },
      { token: "causing", z: 1.55 },
      { token: "today", z: 1.25 },
      { token: "interest", z: -0.95 }
    ],
    altLogits: [
      { token: "last", z: 2.15 },
      { token: "within", z: 1.82 },
      { token: "rate", z: 1.60 },
      { token: "promptly", z: 1.32 },
      { token: "kayak", z: -1.10 }
    ]
  },
  "winograd-trophy": {
    focusIndex: 8,
    links: {
      8: { 1: 0.54, 3: 0.12, 6: 0.16, 11: 0.18 }
    },
    altLinks: {
      8: { 1: 0.14, 3: 0.12, 6: 0.56, 11: 0.18 }
    },
    logits: [
      { token: "to", z: 2.45 },
      { token: "for", z: 1.98 },
      { token: "inside", z: 1.40 },
      { token: "altogether", z: 0.92 },
      { token: "purple", z: -1.60 }
    ],
    altLogits: [
      { token: "to", z: 2.40 },
      { token: "for", z: 2.02 },
      { token: "around", z: 1.35 },
      { token: "inside", z: 0.88 },
      { token: "purple", z: -1.60 }
    ]
  },
  "math-test": {
    focusIndex: 6,
    links: {
      6: { 1: 0.16, 2: 0.24, 5: 0.34, 6: 0.14, 7: 0.12 },
      2: { 0: 0.16, 1: 0.22, 2: 0.18, 5: 0.20, 6: 0.24 }
    },
    logits: [
      { token: "morning", z: 2.38 },
      { token: "because", z: 1.95 },
      { token: "and", z: 1.65 },
      { token: "after", z: 1.20 },
      { token: "toaster", z: -1.50 }
    ]
  }
};
