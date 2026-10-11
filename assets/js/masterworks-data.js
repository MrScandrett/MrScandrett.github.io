/* Masterworks reading library — graded passages from works originally written in each language.
 *
 * Every passage is public domain (traditional or author dead 70+ years). Translations and
 * comprehension questions are ClassroomOS's own, kept literal so students can map word to word.
 *
 * Passage shape:
 *   id, tier ('k2'|'g35'|'g68'|'g912'), title, author, work, year, form,
 *   lines: [[original, pronunciation-or-'', English-or-plain-words], …]
 *   gloss: [[word, meaning], …]      before: warm-up prompt      deeper: writing/discussion prompt
 *   why: one-sentence reason this work matters
 *   qs: [{ q, o:[options], a:correctIndex, w:explanation }, …]
 *
 * Editing: keep every `lines` text exact to the source. `npm test` does not check these;
 * run `node --test tests/masterworks.test.mjs` after changes.
 */
(function (root) {
  const TIERS = [
    { id: 'k2',   label: 'K–2',   full: 'Grades K–2 · first readings' },
    { id: 'g35',  label: '3–5',   full: 'Grades 3–5 · growing readers' },
    { id: 'g68',  label: '6–8',   full: 'Grades 6–8 · close readers' },
    { id: 'g912', label: '9–12',  full: 'Grades 9–12 · the canon' }
  ];

  const LANGS = {
    en: { name: 'English',    native: 'English',   speech: 'en-US', accent: '#b45309', page: '' },
    es: { name: 'Spanish',    native: 'Español',   speech: 'es-ES', accent: '#ea580c', page: 'spanish-foundations.html' },
    fr: { name: 'French',     native: 'Français',  speech: 'fr-FR', accent: '#2563eb', page: 'french-foundations.html' },
    de: { name: 'German',     native: 'Deutsch',   speech: 'de-DE', accent: '#475569', page: 'german-foundations.html' },
    it: { name: 'Italian',    native: 'Italiano',  speech: 'it-IT', accent: '#15803d', page: 'italian-foundations.html' },
    pt: { name: 'Portuguese', native: 'Português', speech: 'pt-BR', accent: '#0f766e', page: 'portuguese-foundations.html' },
    ru: { name: 'Russian',    native: 'Русский',   speech: 'ru-RU', accent: '#b91c1c', page: 'russian-foundations.html', script: 'Cyrillic' },
    ja: { name: 'Japanese',   native: '日本語',     speech: 'ja-JP', accent: '#be185d', page: 'japanese-foundations.html', script: 'Japanese' },
    zh: { name: 'Chinese',    native: '中文',       speech: 'zh-CN', accent: '#c2410c', page: 'chinese-foundations.html', script: 'Chinese' },
    la: { name: 'Latin',      native: 'Latina',    speech: 'la',    speechFallback: 'it-IT', accent: '#7c3aed', page: 'latin-foundations.html' }
  };

  const P = {};

  /* ─────────────────────────── ENGLISH ─────────────────────────── */
  P.en = [
    {
      id: 'en-star', tier: 'k2', title: 'The Star', author: 'Jane Taylor', work: 'Rhymes for the Nursery', year: '1806', form: 'Rhyming poem',
      why: 'Taylor’s verse became one of the most-sung poems in English, and it teaches rhyme by ear.',
      lines: [
        ['Twinkle, twinkle, little star,', '', 'Sparkle, sparkle, little star,'],
        ['How I wonder what you are!', '', 'I keep wondering what you are!'],
        ['Up above the world so high,', '', 'High, high above the world,'],
        ['Like a diamond in the sky.', '', 'shining like a diamond in the sky.']
      ],
      gloss: [['twinkle', 'to shine with tiny flickering flashes'], ['wonder', 'to be curious about something'], ['diamond', 'a very hard, sparkling gem']],
      before: 'Look out a window at night, or picture the sky. What do the stars look like to you?',
      deeper: 'Taylor compares a star to a diamond. Write your own comparison: “Like a ____ in the ____.”',
      qs: [
        { q: 'What does the speaker wonder about?', o: ['What the star is', 'Where the diamond is', 'Why it is night'], a: 0, w: 'Line 2: “How I wonder what you are!”' },
        { q: 'Which two words rhyme in the first two lines?', o: ['star / are', 'twinkle / wonder', 'little / what'], a: 0, w: '“Star” and “are” end with the same sound. Rhymes help the ear remember a poem.' },
        { q: 'Why does the poet say “like a diamond”?', o: ['Stars are made of diamond', 'A diamond also sparkles', 'Diamonds are in the sky'], a: 1, w: 'A simile compares two different things that share a quality, here sparkle.' }
      ]
    },
    {
      id: 'en-owl', tier: 'g35', title: 'The Owl and the Pussy-Cat', author: 'Edward Lear', work: 'Nonsense Songs', year: '1871', form: 'Nonsense poem',
      why: 'Lear invented words and happy absurdity that let children play with how English sounds.',
      lines: [
        ['The Owl and the Pussy-Cat went to sea', '', 'The Owl and the Cat sailed out on the sea'],
        ['In a beautiful pea-green boat,', '', 'in a lovely green boat the colour of peas;'],
        ['They took some honey, and plenty of money,', '', 'they took some honey and lots of money,'],
        ['Wrapped up in a five-pound note.', '', 'tucked inside a five-pound banknote.']
      ],
      gloss: [['pea-green', 'a bright green, like garden peas'], ['plenty', 'a large amount'], ['note', 'paper money']],
      before: 'An owl and a cat are friends. Where might two unlikely friends go together?',
      deeper: 'Lear mixes real things (honey, money) with impossible ones (a cat and owl sailing). Invent two more things they pack.',
      qs: [
        { q: 'What do the owl and cat take with them?', o: ['Fish and a net', 'Honey and money', 'A map and a lamp'], a: 1, w: 'Line 3 names honey and plenty of money.' },
        { q: 'What colour is the boat?', o: ['Blue', 'Pea-green', 'Yellow'], a: 1, w: 'The hyphenated word “pea-green” is the boat’s colour.' },
        { q: 'Why is this called a nonsense poem?', o: ['It has no rhymes', 'An owl and a cat could not really sail off like this', 'It is about money'], a: 1, w: 'Nonsense verse is playful: it is logical in sound and rhythm but impossible in life.' }
      ]
    },
    {
      id: 'en-hope', tier: 'g68', title: '“Hope” is the thing with feathers', author: 'Emily Dickinson', work: 'Poems (c. 1861, published 1891)', year: 'c. 1861', form: 'Lyric poem · extended metaphor',
      why: 'Dickinson turns an abstract feeling into a bird, so one image carries the whole poem.',
      lines: [
        ['Hope is the thing with feathers', '', 'Hope is like a small bird'],
        ['That perches in the soul,', '', 'that sits inside a person’s spirit,'],
        ['And sings the tune without the words', '', 'and sings a song that has no words'],
        ['And never stops at all,', '', 'and never, ever stops.']
      ],
      gloss: [['perches', 'sits on a branch or ledge'], ['soul', 'the inner self, the spirit'], ['tune', 'a melody']],
      before: 'If a feeling could be an animal, what animal would hope be, and why?',
      deeper: 'Pick another feeling (fear, joy, patience). Write four lines that turn it into a living thing.',
      qs: [
        { q: 'What is hope compared to?', o: ['A bird', 'A storm', 'A tune written down'], a: 0, w: 'Feathers and perching make hope a bird. This is a metaphor: it says hope IS a bird.' },
        { q: 'Where does the bird sit?', o: ['In a tree', 'In the soul', 'On a window'], a: 1, w: 'The line says it “perches in the soul.”' },
        { q: 'What does “sings the tune without the words” suggest about hope?', o: ['Hope is loud and angry', 'Hope is felt, not always explained in words', 'Hope is a song everyone knows'], a: 1, w: 'A wordless song is something you feel without being able to say exactly what it means.' }
      ]
    },
    {
      id: 'en-hamlet', tier: 'g912', title: 'To be, or not to be', author: 'William Shakespeare', work: 'Hamlet, Act 3 Scene 1', year: 'c. 1600', form: 'Dramatic soliloquy · blank verse',
      why: 'The most quoted speech in English drama: a person reasons aloud about suffering, courage and choice.',
      lines: [
        ['To be, or not to be, that is the question:', '', 'Should I go on living or not? That is the question:'],
        ['Whether ’tis nobler in the mind to suffer', '', 'is it more noble to endure in silence'],
        ['The slings and arrows of outrageous fortune,', '', 'the cruel blows that bad luck throws at us,'],
        ['Or to take arms against a sea of troubles', '', 'or to fight back against a whole ocean of troubles'],
        ['And by opposing end them.', '', 'and end them by standing up to them?']
      ],
      gloss: [['’tis', 'it is'], ['suffer', 'to endure pain'], ['slings and arrows', 'weapons; here, attacks on a person'], ['outrageous', 'shocking, extreme'], ['fortune', 'luck, fate']],
      before: 'When life gets very hard, people sometimes ask whether to fight or give in. What helps someone choose?',
      deeper: 'Hamlet turns one choice into two images: arrows hitting you, or you going to war against the sea. Which image is stronger, and why?',
      qs: [
        { q: 'What two choices does Hamlet weigh?', o: ['Endure troubles, or fight against them', 'Travel, or stay home', 'Speak, or write'], a: 0, w: 'Lines 2–5 contrast quietly suffering with taking arms against troubles.' },
        { q: '“A sea of troubles” is an example of…', o: ['A rhyme', 'A metaphor', 'A stage direction'], a: 1, w: 'Troubles are not literally a sea. The image makes them endless and overwhelming.' },
        { q: 'Why can you not actually “take arms against” a sea?', o: ['Seas are too far away', 'A sea cannot be defeated by fighting, so the image shows how hopeless the fight feels', 'Arms are a kind of boat'], a: 1, w: 'The impossible image is the point: Hamlet is asking whether fighting can ever succeed.' }
      ]
    }
  ];

  /* ─────────────────────────── SPANISH ─────────────────────────── */
  P.es = [
    {
      id: 'es-margarita', tier: 'k2', title: 'A Margarita Debayle', author: 'Rubén Darío', work: 'A Margarita Debayle (poem for a child)', year: 'c. 1907', form: 'Poem · Nicaragua',
      why: 'Darío, the founder of Spanish-language modernismo, wrote this to a little girl, and children across Latin America still learn it.',
      lines: [
        ['Margarita, está linda la mar,', '', 'Margarita, the sea is beautiful,'],
        ['y el viento', '', 'and the wind'],
        ['lleva esencia sutil de azahar;', '', 'carries a delicate scent of orange blossom;'],
        ['yo siento', '', 'I feel'],
        ['en el alma una alondra cantar;', '', 'a lark singing in my soul;'],
        ['tu acento:', '', 'your voice:'],
        ['Margarita, te voy a contar', '', 'Margarita, I am going to tell you'],
        ['un cuento:', '', 'a story:']
      ],
      gloss: [['linda', 'pretty, beautiful'], ['mar', 'sea'], ['viento', 'wind'], ['azahar', 'orange blossom'], ['alma', 'soul'], ['alondra', 'lark (a songbird)'], ['cuento', 'story']],
      before: 'Say the poem’s last words in each line out loud: mar, viento, azahar, siento, cantar, acento, contar, cuento. Do you hear the echo?',
      deeper: 'Darío tells the girl a story right after describing the sea and a singing lark. Write two lines of your own that set a scene before a story begins.',
      qs: [
        { q: 'Who is the poem speaking to?', o: ['Margarita', 'The wind', 'A lark'], a: 0, w: 'The poet addresses Margarita by name in lines 1 and 7.' },
        { q: 'What is carried by the wind?', o: ['Rain', 'A delicate scent of orange blossom', 'Margarita’s voice'], a: 1, w: '“Lleva esencia sutil de azahar”: the wind carries the scent.' },
        { q: 'Where does the poet feel the lark singing?', o: ['In the sea', 'In the soul (alma)', 'In the orange tree'], a: 1, w: 'The lark is a picture for joy inside the poet. It is not a real bird.' }
      ]
    },
    {
      id: 'es-marti', tier: 'g35', title: 'Yo soy un hombre sincero', author: 'José Martí', work: 'Versos sencillos, I', year: '1891', form: 'Poem · Cuba · octosyllabic quatrain',
      why: 'These lines became the famous song “Guantanamera.” Martí wrote them in plain words on purpose.',
      lines: [
        ['Yo soy un hombre sincero', '', 'I am a sincere man'],
        ['de donde crece la palma,', '', 'from where the palm tree grows,'],
        ['y antes de morirme quiero', '', 'and before I die I want'],
        ['echar mis versos del alma.', '', 'to cast out the verses of my soul.']
      ],
      gloss: [['sincero', 'honest, saying what you truly mean'], ['palma', 'palm tree'], ['morirme', 'to die'], ['echar', 'to throw out, let go'], ['versos', 'lines of poetry']],
      before: 'A poem about being honest. What is one honest thing you could say in four short lines?',
      deeper: 'Martí says where he is from by naming a plant. Name your place using one thing that grows or lives there.',
      qs: [
        { q: 'How does the speaker describe himself?', o: ['A sincere man', 'A tired traveler', 'A famous king'], a: 0, w: '“Un hombre sincero”: honest and straightforward.' },
        { q: 'What does he want to do before he dies?', o: ['Plant palm trees', 'Share his heartfelt poetry', 'Return to the sea'], a: 1, w: '“Echar mis versos del alma”: let the poems out of his soul.' },
        { q: 'What does “de donde crece la palma” tell us?', o: ['He lives in a desert', 'He comes from a land of palm trees', 'He grows palms for a living'], a: 1, w: 'Naming the palm tree pictures his home, in the tropics, without naming the country.' }
      ]
    },
    {
      id: 'es-quijote', tier: 'g68', title: 'En un lugar de la Mancha', author: 'Miguel de Cervantes', work: 'Don Quijote de la Mancha, Part I, chapter 1', year: '1605', form: 'Novel · opening sentence',
      why: 'Often called the first modern novel; this sentence is one of the best-known openings in world literature.',
      lines: [
        ['En un lugar de la Mancha, de cuyo nombre no quiero acordarme,', '', 'In a village of La Mancha, whose name I do not wish to recall,'],
        ['no ha mucho tiempo que vivía un hidalgo', '', 'there lived, not long ago, a gentleman'],
        ['de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.', '', 'of the kind who keeps a lance on a rack, an old leather shield, a skinny horse and a racing greyhound.']
      ],
      gloss: [['lugar', 'place, village'], ['acordarme', 'to remember'], ['hidalgo', 'a minor nobleman'], ['lanza', 'lance, spear'], ['adarga', 'old leather shield'], ['rocín', 'a worn-out workhorse'], ['galgo', 'greyhound']],
      before: 'A story starts by hiding the name of the town on purpose. Why might an author do that?',
      deeper: 'Cervantes describes a man only by his old, thin belongings. Describe a character in three belongings, without saying what they are like.',
      qs: [
        { q: 'What does the narrator say about the village’s name?', o: ['He loves the name', 'He does not want to remember it', 'It is Madrid'], a: 1, w: '“De cuyo nombre no quiero acordarme”: a playful pretend-forgetting.' },
        { q: 'What kind of man is the hidalgo?', o: ['A rich city lord', 'An older, not-wealthy gentleman with old-fashioned equipment', 'A traveling merchant'], a: 1, w: 'An old shield, a thin horse and a rack for a lance describe a poor, old-fashioned knight-type.' },
        { q: 'What does the list of objects (lance, shield, nag, greyhound) show about him?', o: ['His days of glory are past or imagined', 'He is a champion jouster', 'He has just won a war'], a: 0, w: 'The items are worn and outdated. This hints at the comic story: a man living in dreams of knighthood.' }
      ]
    },
    {
      id: 'es-calderon', tier: 'g912', title: '¿Qué es la vida?', author: 'Pedro Calderón de la Barca', work: 'La vida es sueño, Act II', year: 'c. 1635', form: 'Drama · Spanish Golden Age monologue',
      why: 'A prince raised in a tower wakes up in a palace and cannot tell dream from life. The speech asks the oldest question in philosophy.',
      lines: [
        ['¿Qué es la vida? Un frenesí.', '', 'What is life? A frenzy.'],
        ['¿Qué es la vida? Una ilusión,', '', 'What is life? An illusion,'],
        ['una sombra, una ficción,', '', 'a shadow, a fiction,'],
        ['y el mayor bien es pequeño;', '', 'and the greatest good is small;'],
        ['que toda la vida es sueño,', '', 'for all of life is a dream,'],
        ['y los sueños, sueños son.', '', 'and dreams are only dreams.']
      ],
      gloss: [['frenesí', 'frenzy, wild excitement'], ['ilusión', 'illusion, something that seems real but is not'], ['sombra', 'shadow'], ['ficción', 'fiction'], ['sueño', 'dream (also “sleep”)']],
      before: 'Have you ever woken from a dream so real you needed a moment to know it was a dream? What did that feel like?',
      deeper: 'Calderón piles up four images of life: frenzy, illusion, shadow, fiction. Which fits best, and what would you add?',
      qs: [
        { q: 'What question is repeated at the start?', o: ['¿Qué es la vida?', '¿Quién soy yo?', '¿Dónde estoy?'], a: 0, w: 'Repeating the question twice makes the speech sound like someone thinking out loud.' },
        { q: 'Which words does the speaker use to describe life?', o: ['Frenesí, ilusión, sombra, ficción', 'Alegría, riqueza, amor, paz', 'Camino, río, monte, mar'], a: 0, w: 'All four words suggest something unreal or fleeting.' },
        { q: 'What is the last line saying: “y los sueños, sueños son”?', o: ['Dreams are very real', 'Even dreams are just dreams, so nothing we gain in them lasts', 'Everyone has the same dream'], a: 1, w: 'The repetition “sueños, sueños” closes the circle: if life is a dream and dreams are only dreams, then even the greatest good is small.' }
      ]
    }
  ];

  /* ─────────────────────────── FRENCH ─────────────────────────── */
  P.fr = [
    {
      id: 'fr-jacques', tier: 'k2', title: 'Frère Jacques', author: 'Traditional', work: 'French children’s round', year: '18th century', form: 'Round (canon) · folk song',
      why: 'One of the most widely sung rounds in the world; the melody and words travel in a circle.',
      lines: [
        ['Frère Jacques, Frère Jacques,', '', 'Brother Jacques, Brother Jacques,'],
        ['Dormez-vous? Dormez-vous?', '', 'Are you sleeping? Are you sleeping?'],
        ['Sonnez les matines! Sonnez les matines!', '', 'Ring the morning bells! Ring the morning bells!'],
        ['Ding, dang, dong. Ding, dang, dong.', '', 'Ding, dang, dong. Ding, dang, dong.']
      ],
      gloss: [['frère', 'brother (also a monk)'], ['dormez-vous', 'are you sleeping?'], ['sonnez', 'ring (a bell)'], ['matines', 'morning prayer bells']],
      before: 'Who would you wake up with a song? Say it quietly, then louder, like a bell.',
      deeper: 'Sing it as a round with a friend: the second singer starts when the first reaches line 2. What do you notice?',
      qs: [
        { q: 'What does “Dormez-vous?” ask?', o: ['Are you sleeping?', 'Are you eating?', 'Are you coming?'], a: 0, w: '“Dormir” = to sleep. “Dormez-vous?” = “Are you sleeping?”' },
        { q: 'Who is being asked to ring the bells?', o: ['Brother Jacques', 'The singer', 'A baker'], a: 0, w: 'The song speaks to Brother Jacques: “Sonnez les matines!”' },
        { q: 'Why are lines repeated twice?', o: ['It is a mistake', 'Repetition makes a song easy to learn and sing in a round', 'It makes the song longer for no reason'], a: 1, w: 'In a round each singer repeats the tune, so repetition built into the words fits the form.' }
      ]
    },
    {
      id: 'fr-chaperon', tier: 'g35', title: 'Le Petit Chaperon rouge', author: 'Charles Perrault', work: 'Histoires ou contes du temps passé', year: '1697', form: 'Fairy tale · opening',
      why: 'Perrault wrote down the French fairy tales that the Grimm and Disney versions grew from.',
      lines: [
        ['Il était une fois une petite fille de village,', '', 'Once upon a time there was a little village girl,'],
        ['la plus jolie qu’on eût su voir;', '', 'the prettiest anyone could ever have seen;'],
        ['sa mère en était folle, et sa mère-grand plus folle encore.', '', 'her mother doted on her, and her grandmother even more.'],
        ['Cette bonne femme lui fit faire un petit chaperon rouge,', '', 'This good woman had a little red hood made for her,'],
        ['qui lui seyait si bien que partout on l’appelait le Petit Chaperon rouge.', '', 'which suited her so well that everywhere she was called Little Red Hood.']
      ],
      gloss: [['il était une fois', 'once upon a time'], ['la plus jolie', 'the prettiest'], ['folle', 'crazy (here: crazy about, doting)'], ['mère-grand', 'grandmother (old word)'], ['chaperon', 'hood'], ['seyait', 'suited, looked good on']],
      before: 'Many stories start “once upon a time.” Why is that a good signal for the reader?',
      deeper: 'Perrault gives the girl a name from her clothing. What would people call you if they named you by something you wear?',
      qs: [
        { q: 'Who loved the girl most?', o: ['Her mother', 'Her grandmother', 'A neighbor'], a: 1, w: 'The grandmother is “plus folle encore”: even more devoted than the mother.' },
        { q: 'How does she get her name?', o: ['From a red hood her grandmother had made for her', 'From her red hair', 'From the village'], a: 0, w: 'The hood suited her so well that people used it as her name.' },
        { q: 'What does “il était une fois” tell the reader?', o: ['A true news story follows', 'A fairy tale is beginning', 'A recipe follows'], a: 1, w: 'Fixed opening phrases like this tell readers what kind of story they are in.' }
      ]
    },
    {
      id: 'fr-corbeau', tier: 'g68', title: 'Le Corbeau et le Renard', author: 'Jean de La Fontaine', work: 'Fables, Book I, fable 2', year: '1668', form: 'Fable in verse · moral',
      why: 'La Fontaine retold Aesop in witty French verse; French schoolchildren have memorized this one for centuries.',
      lines: [
        ['Maître Corbeau, sur un arbre perché,', '', 'Master Crow, perched on a tree,'],
        ['Tenait en son bec un fromage.', '', 'held a cheese in his beak.'],
        ['Maître Renard, par l’odeur alléché,', '', 'Master Fox, lured by the smell,'],
        ['Lui tint à peu près ce langage :', '', 'spoke to him more or less in this language:'],
        ['« Hé ! bonjour, Monsieur du Corbeau.', '', '“Hey! Good day, Mr. Crow.'],
        ['Que vous êtes joli ! que vous me semblez beau ! »', '', 'How handsome you are! How fine you seem to me!”'],
        ['…', '', '…'],
        ['« Apprenez que tout flatteur', '', '“Learn that every flatterer'],
        ['Vit aux dépens de celui qui l’écoute. »', '', 'lives at the expense of the one who listens.”']
      ],
      gloss: [['corbeau', 'crow'], ['renard', 'fox'], ['fromage', 'cheese'], ['bec', 'beak'], ['alléché', 'tempted, drawn by a lure'], ['flatteur', 'flatterer, someone who praises to get something']],
      before: 'Has anyone ever praised you just to get something from you? How could you tell?',
      deeper: 'The fox never says “give me your cheese.” Write the next line the fox says, using only compliments.',
      qs: [
        { q: 'What is the crow holding?', o: ['A fish', 'A cheese', 'A branch'], a: 1, w: '“Tenait en son bec un fromage.”' },
        { q: 'Why does the fox compliment the crow?', o: ['Because he truly admires him', 'Because he wants the cheese', 'Because it is a custom'], a: 1, w: 'He was “par l’odeur alléché” (lured by the smell). The praise is a trick.' },
        { q: 'What is the moral in the last two lines?', o: ['Never share food', 'People who flatter you are often profiting at your expense', 'Foxes are always clever'], a: 1, w: '“Tout flatteur vit aux dépens de celui qui l’écoute”: flatterers live at the expense of the listener.' }
      ]
    },
    {
      id: 'fr-hugo', tier: 'g912', title: 'Demain, dès l’aube…', author: 'Victor Hugo', work: 'Les Contemplations, IV, 14', year: '1847 (publ. 1856)', form: 'Lyric poem · alexandrines',
      why: 'Hugo wrote it years after his daughter Léopoldine drowned. The reader only learns the destination at the very end.',
      lines: [
        ['Demain, dès l’aube, à l’heure où blanchit la campagne,', '', 'Tomorrow, at dawn, at the hour when the countryside turns white,'],
        ['Je partirai. Vois-tu, je sais que tu m’attends.', '', 'I will set out. You see, I know that you are waiting for me.'],
        ['J’irai par la forêt, j’irai par la montagne.', '', 'I will go through the forest, I will go over the mountain.'],
        ['Je ne puis demeurer loin de toi plus longtemps.', '', 'I cannot stay far from you any longer.']
      ],
      gloss: [['dès l’aube', 'from dawn on, at first light'], ['blanchit', 'turns white'], ['campagne', 'countryside'], ['m’attends', 'are waiting for me'], ['demeurer', 'to remain, stay']],
      before: 'A journey told in the future tense feels like a promise. Who would you walk a long way to see?',
      deeper: 'Read the full poem (find the last stanza). Why does Hugo keep the destination secret until the end? How does knowing it change your first four lines?',
      qs: [
        { q: 'When does the speaker set out?', o: ['At noon tomorrow', 'At dawn tomorrow', 'Tonight'], a: 1, w: '“Demain, dès l’aube”: tomorrow, from first light.' },
        { q: 'Why does he go?', o: ['To hunt', 'Because someone is waiting for him and he cannot be apart longer', 'To see the mountains'], a: 1, w: 'Lines 2 and 4 give the reason: “tu m’attends”; “je ne puis demeurer loin de toi”.' },
        { q: 'What does the future tense (“je partirai”, “j’irai”) do to the mood?', o: ['It sounds determined, like a vow', 'It shows he is unsure', 'It makes it a history lesson'], a: 0, w: 'Repeating “j’irai” sounds like a promise he will keep whatever stands in the way.' }
      ]
    }
  ];

  /* ─────────────────────────── GERMAN ─────────────────────────── */
  P.de = [
    {
      id: 'de-haenschen', tier: 'k2', title: 'Hänschen klein', author: 'Traditional', work: 'German children’s song', year: '19th century', form: 'Folk song',
      why: 'A song every German child knows: tiny Hans goes out into the wide world.',
      lines: [
        ['Hänschen klein', '', 'Little Hans'],
        ['ging allein', '', 'went alone'],
        ['in die weite Welt hinein.', '', 'out into the wide world.'],
        ['Stock und Hut', '', 'Walking stick and hat'],
        ['steht ihm gut,', '', 'suit him well,'],
        ['ist gar wohlgemut.', '', 'he is in fine spirits.']
      ],
      gloss: [['klein', 'small'], ['allein', 'alone'], ['Welt', 'world'], ['Stock', 'stick, walking stick'], ['Hut', 'hat'], ['wohlgemut', 'in good spirits']],
      before: 'What would you pack if you walked out to see the world? Clap the rhythm of line 1.',
      deeper: 'Find the rhymes: klein / allein, Hut / gut. Write two more rhyming pairs about a journey.',
      qs: [
        { q: 'Who is going out?', o: ['A little boy named Hans', 'A hat', 'A dog'], a: 0, w: '“Hänschen klein” = little Hans.' },
        { q: 'What two things does Hans carry?', o: ['Stock und Hut', 'Brot und Wein', 'Buch und Stift'], a: 0, w: 'Stock = stick, Hut = hat.' },
        { q: 'How is Hans feeling?', o: ['Frightened', 'Cheerful', 'Sleepy'], a: 1, w: '“Wohlgemut” means in good spirits.' }
      ]
    },
    {
      id: 'de-froschkoenig', tier: 'g35', title: 'Der Froschkönig', author: 'Brüder Grimm', work: 'Kinder- und Hausmärchen', year: '1812', form: 'Fairy tale · opening',
      why: 'The Grimms collected German folk tales; this opening makes the sun itself a character.',
      lines: [
        ['In den alten Zeiten, wo das Wünschen noch geholfen hat,', '', 'In the old days, when wishing still helped,'],
        ['lebte ein König, dessen Töchter waren alle schön;', '', 'there lived a king whose daughters were all beautiful;'],
        ['aber die jüngste war so schön, dass die Sonne selber, die doch so vieles gesehen hat,', '', 'but the youngest was so beautiful that the sun itself, which has seen so much,'],
        ['sich verwunderte, sooft sie ihr ins Gesicht schien.', '', 'was amazed whenever it shone on her face.']
      ],
      gloss: [['Zeiten', 'times'], ['Wünschen', 'wishing'], ['König', 'king'], ['Töchter', 'daughters'], ['jüngste', 'youngest'], ['Sonne', 'sun'], ['verwunderte', 'was amazed']],
      before: 'The tale starts with “when wishing still helped.” What does that suggest about the world of the story?',
      deeper: 'Describe someone so remarkable that even the sun is amazed. Whose face would it be?',
      qs: [
        { q: 'How many beautiful daughters does the king have, and who is the most beautiful?', o: ['All are beautiful; the youngest is most', 'Only the eldest', 'There are none'], a: 0, w: '“Töchter waren alle schön; aber die jüngste…”: the youngest outshines them all.' },
        { q: 'What amazed the sun?', o: ['The king’s crown', 'The youngest daughter’s face', 'A frog'], a: 1, w: 'The sun “verwunderte sich, sooft sie ihr ins Gesicht schien.”' },
        { q: 'What does “wo das Wünschen noch geholfen hat” tell us?', o: ['It is set in a time when wishes came true', 'Wishes are bad luck', 'It happened last week'], a: 0, w: 'It marks the fairy-tale world, where wishing works.' }
      ]
    },
    {
      id: 'de-erlkoenig', tier: 'g68', title: 'Erlkönig', author: 'Johann Wolfgang von Goethe', work: 'Ballade', year: '1782', form: 'Ballad · set to music by Schubert',
      why: 'A father rides through the night with his sick son, who sees what the father cannot. The gallop is built into the rhythm.',
      lines: [
        ['Wer reitet so spät durch Nacht und Wind?', '', 'Who rides so late through night and wind?'],
        ['Es ist der Vater mit seinem Kind;', '', 'It is the father with his child;'],
        ['Er hat den Knaben wohl in dem Arm,', '', 'he holds the boy safe in his arm,'],
        ['Er faßt ihn sicher, er hält ihn warm.', '', 'he grips him firmly, he keeps him warm.'],
        ['Mein Sohn, was birgst du so bang dein Gesicht? –', '', 'My son, why do you hide your face in fear? –'],
        ['Siehst, Vater, du den Erlkönig nicht?', '', 'Father, do you not see the Erlking?'],
        ['Den Erlenkönig mit Kron’ und Schweif? –', '', 'The Erlking with crown and train? –'],
        ['Mein Sohn, es ist ein Nebelstreif.', '', 'My son, it is a streak of mist.']
      ],
      gloss: [['reitet', 'rides (on horseback)'], ['Knabe', 'boy'], ['birgst', 'hide'], ['bang', 'anxious, afraid'], ['Erlkönig', 'Erlking, a spirit king of the alder trees'], ['Nebelstreif', 'streak of mist']],
      before: 'A child sees something frightening that a grown-up says is not there. Who do you believe?',
      deeper: 'Goethe never says whether the Erlking is real. Find a line that supports each view, then argue which is stronger.',
      qs: [
        { q: 'Who is riding through the night?', o: ['A father and son', 'A king and soldiers', 'Two brothers'], a: 0, w: '“Es ist der Vater mit seinem Kind.”' },
        { q: 'What does the boy say he sees?', o: ['A mist', 'The Erlking with crown and train', 'His mother'], a: 1, w: 'The boy asks the father if he too sees the Erlking.' },
        { q: 'What does the father say it is?', o: ['A streak of mist', 'The wind', 'A shadow of a tree'], a: 0, w: '“Es ist ein Nebelstreif.” He gives a calm, ordinary explanation.' }
      ]
    },
    {
      id: 'de-faust', tier: 'g912', title: 'Habe nun, ach! Philosophie…', author: 'Johann Wolfgang von Goethe', work: 'Faust, Part I, “Nacht”', year: '1808', form: 'Drama · Knittelvers monologue',
      why: 'Faust has mastered every subject and feels empty. It is the German Romantic image of a thirst for meaning.',
      lines: [
        ['Habe nun, ach! Philosophie,', '', 'I have now, alas, studied philosophy,'],
        ['Juristerei und Medizin,', '', 'law and medicine,'],
        ['Und leider auch Theologie!', '', 'and sadly also theology,'],
        ['Durchaus studiert, mit heißem Bemühn.', '', 'thoroughly, with burning effort.'],
        ['Da steh ich nun, ich armer Tor!', '', 'Here I stand now, poor fool,'],
        ['Und bin so klug als wie zuvor;', '', 'and am no wiser than before;']
      ],
      gloss: [['Juristerei', 'law (legal studies)'], ['leider', 'unfortunately'], ['durchaus', 'thoroughly'], ['Bemühn', 'effort'], ['Tor', 'fool'], ['zuvor', 'before']],
      before: 'Can a person know a lot and still feel lost? What might be missing?',
      deeper: 'Faust lists four fields of study. Choose four things you have learned and write a modern version: “I have studied ___, ___, ___… and still ___.”',
      qs: [
        { q: 'Which fields has Faust studied?', o: ['Philosophy, law, medicine, theology', 'Music, art, math, history', 'Only philosophy'], a: 0, w: 'Lines 1–3 list the four classic university faculties.' },
        { q: 'How does he feel about all that study?', o: ['Proud and satisfied', 'He is no wiser than before', 'He wants to start over in law'], a: 1, w: '“Bin so klug als wie zuvor”: no cleverer than before.' },
        { q: 'What does “mit heißem Bemühn” add to the picture?', o: ['He worked half-heartedly', 'He tried very hard, which makes his failure feel sadder', 'He found it fun'], a: 1, w: 'Heated effort raises the stakes: it was not laziness; the knowledge itself did not satisfy.' }
      ]
    }
  ];

  /* ─────────────────────────── ITALIAN ─────────────────────────── */
  P.it = [
    {
      id: 'it-ninnananna', tier: 'k2', title: 'Ninna nanna, ninna oh', author: 'Traditional', work: 'Italian lullaby', year: 'traditional', form: 'Lullaby · folk rhyme',
      why: 'A lullaby with playful rhymes (Befana / settimana), sung by grandmothers across Italy.',
      lines: [
        ['Ninna nanna, ninna oh,', '', 'Lullaby, lullaby, oh,'],
        ['questo bimbo a chi lo do?', '', 'this baby, to whom shall I give him?'],
        ['Lo darò alla Befana', '', 'I’ll give him to the Befana'],
        ['che lo tiene una settimana;', '', 'who will keep him for a week;']
      ],
      gloss: [['bimbo', 'baby, little child'], ['lo do', 'I give him'], ['Befana', 'the kindly witch of the Epiphany'], ['settimana', 'week']],
      before: 'Whisper this like you are singing to a baby. Which sounds repeat (nin-na nan-na)?',
      deeper: 'The singer jokes about “giving” the baby away. Why might a lullaby tease like this?',
      qs: [
        { q: 'What kind of song is this?', o: ['A lullaby', 'A marching song', 'A love song'], a: 0, w: '“Ninna nanna” is the Italian word for lullaby.' },
        { q: 'Who might keep the baby for a week?', o: ['La Befana', 'A king', 'A teacher'], a: 0, w: '“Lo darò alla Befana che lo tiene una settimana.”' },
        { q: 'Which words rhyme?', o: ['oh / do', 'Befana / settimana', 'both of these'], a: 2, w: 'Oh/do and Befana/settimana both rhyme. A lullaby uses repeated sounds to soothe.' }
      ]
    },
    {
      id: 'it-pinocchio', tier: 'g35', title: 'C’era una volta…', author: 'Carlo Collodi', work: 'Le avventure di Pinocchio', year: '1883', form: 'Novel · chapter 1 opening',
      why: 'Collodi plays with the fairy-tale opening to surprise his readers right away.',
      lines: [
        ['C’era una volta…', '', 'Once upon a time there was…'],
        ['— Un re! — diranno subito i miei piccoli lettori.', '', '— A king! — my little readers will say at once.'],
        ['No, ragazzi, avete sbagliato.', '', 'No, children, you are wrong.'],
        ['C’era una volta un pezzo di legno.', '', 'Once upon a time there was a piece of wood.']
      ],
      gloss: [['c’era una volta', 'once upon a time'], ['re', 'king'], ['ragazzi', 'kids, children'], ['sbagliato', 'wrong, mistaken'], ['pezzo', 'piece'], ['legno', 'wood']],
      before: 'What does a reader usually expect after “once upon a time”? Say your guess before reading on.',
      deeper: 'Collodi talks directly to the reader. Write a two-line opening that surprises your reader the same way.',
      qs: [
        { q: 'What do the readers guess?', o: ['A king', 'A wolf', 'A boy'], a: 0, w: '“Un re!”: a king, since fairy tales often start with royalty.' },
        { q: 'What is the real answer?', o: ['A piece of wood', 'A little boy', 'A prince'], a: 0, w: '“C’era una volta un pezzo di legno.”' },
        { q: 'Why does the narrator speak to the readers?', o: ['To bore them', 'To make them part of the story, and to surprise them', 'To teach grammar'], a: 1, w: 'Talking to the reader makes it feel like a conversation, and the correction creates humor.' }
      ]
    },
    {
      id: 'it-leopardi', tier: 'g68', title: 'L’infinito', author: 'Giacomo Leopardi', work: 'Canti', year: '1819', form: 'Lyric poem · endecasillabi (opening)',
      why: 'The hedge that blocks the view is what makes the poet imagine infinity. Italian students memorize it.',
      lines: [
        ['Sempre caro mi fu quest’ermo colle,', '', 'This lonely hill has always been dear to me,'],
        ['e questa siepe, che da tanta parte', '', 'and this hedge, which from so large a part'],
        ['dell’ultimo orizzonte il guardo esclude.', '', 'of the farthest horizon shuts out my gaze.'],
        ['Ma sedendo e mirando, interminati', '', 'But sitting and gazing, endless'],
        ['spazi di là da quella, e sovrumani', '', 'spaces beyond it, and superhuman'],
        ['silenzi, e profondissima quiete', '', 'silences, and deepest quiet']
      ],
      gloss: [['ermo', 'lonely, solitary'], ['colle', 'hill'], ['siepe', 'hedge'], ['guardo', 'gaze, view'], ['interminati', 'unending'], ['quiete', 'calm, stillness']],
      before: 'Sometimes a wall makes you imagine what is behind it. When has not seeing something made you think more about it?',
      deeper: 'The hedge blocks the view, yet the poem opens up to infinity. Explain this paradox in two sentences.',
      qs: [
        { q: 'What blocks the speaker’s view?', o: ['A hedge', 'A wall of stone', 'A cloud'], a: 0, w: '“Questa siepe… il guardo esclude.”' },
        { q: 'What does the speaker imagine beyond it?', o: ['A village', 'Endless spaces, superhuman silences, deepest quiet', 'The sea'], a: 1, w: 'Lines 4–6 name what the mind pictures when the eyes cannot see.' },
        { q: 'What is the paradox?', o: ['A limit makes the poet imagine something limitless', 'The hill is small but beautiful', 'The hedge is not real'], a: 0, w: 'Because he cannot see, he imagines infinity. The barrier frees the mind.' }
      ]
    },
    {
      id: 'it-dante', tier: 'g912', title: 'Nel mezzo del cammin di nostra vita', author: 'Dante Alighieri', work: 'Divina Commedia · Inferno, Canto I', year: 'c. 1308', form: 'Epic poem · terza rima',
      why: 'The first lines of the Divine Comedy set up a journey. Dante’s Tuscan helped make Italian a literary language.',
      lines: [
        ['Nel mezzo del cammin di nostra vita', '', 'Midway on the journey of our life'],
        ['mi ritrovai per una selva oscura,', '', 'I found myself in a dark wood,'],
        ['ché la diritta via era smarrita.', '', 'for the straight path was lost.'],
        ['Ahi quanto a dir qual era è cosa dura', '', 'Ah, how hard it is to say what it was,'],
        ['esta selva selvaggia e aspra e forte', '', 'this wood, wild and rough and harsh,'],
        ['che nel pensier rinova la paura!', '', 'which in thought renews the fear!']
      ],
      gloss: [['cammin', 'journey, path (short for cammino)'], ['selva oscura', 'dark wood'], ['diritta via', 'the straight (right) path'], ['smarrita', 'lost'], ['aspra', 'harsh'], ['paura', 'fear']],
      before: 'What is a “dark wood” in a person’s life? Name a time you felt lost.',
      deeper: 'Dante says “our life,” not “my life.” Why might the poem be about everyone? Compare with the lesson on Dante’s Inferno.',
      qs: [
        { q: 'Where does Dante find himself?', o: ['In a dark wood', 'In a city', 'On a ship'], a: 0, w: '“Mi ritrovai per una selva oscura.”' },
        { q: 'Why did he find himself there?', o: ['The straight path was lost', 'He ran away', 'He chose it'], a: 0, w: '“Ché la diritta via era smarrita”: the right path had been lost.' },
        { q: 'What does “nostra” (our) suggest?', o: ['He speaks for everyone, as a universal human', 'He is traveling in a group', 'He is a king'], a: 0, w: 'Using “our life” invites every reader into the poem.' }
      ]
    }
  ];

  /* ─────────────────────────── PORTUGUESE ─────────────────────────── */
  P.pt = [
    {
      id: 'pt-sapo', tier: 'k2', title: 'Sapo cururu', author: 'Traditional (Brazil)', work: 'Cantiga de roda', year: 'traditional', form: 'Circle-game rhyme',
      why: 'A children’s circle song from Brazil; the sapo (toad) cries because he is cold.',
      lines: [
        ['Sapo cururu', '', 'Cururu toad'],
        ['na beira do rio,', '', 'on the river bank,'],
        ['quando o sapo grita, ó maninha,', '', 'when the toad cries out, oh little sister,'],
        ['é que está com frio.', '', 'it’s because he is cold.']
      ],
      gloss: [['sapo', 'toad'], ['beira', 'edge, bank'], ['rio', 'river'], ['grita', 'cries out'], ['frio', 'cold']],
      before: 'Make a toad croak. Why might a toad cry out by a river?',
      deeper: 'Rio / frio rhyme. Write two lines about another animal by the river and why it calls out.',
      qs: [
        { q: 'Where is the toad?', o: ['By the river', 'In a house', 'In a tree'], a: 0, w: '“Na beira do rio”: on the river bank.' },
        { q: 'Why does the toad cry out?', o: ['He is hungry', 'He is cold', 'He is happy'], a: 1, w: '“É que está com frio.”' },
        { q: 'Which word rhymes with “rio”?', o: ['frio', 'sapo', 'grita'], a: 0, w: 'Rio and frio share the ending sound.' }
      ]
    },
    {
      id: 'pt-exilio', tier: 'g35', title: 'Canção do exílio', author: 'Gonçalves Dias', work: 'Primeiros cantos', year: '1843', form: 'Romantic poem · Brazil',
      why: 'A homesick poem every Brazilian student knows. Poets have been answering and parodying it for 180 years.',
      lines: [
        ['Minha terra tem palmeiras,', '', 'My land has palm trees,'],
        ['Onde canta o Sabiá;', '', 'where the sabiá sings;'],
        ['As aves, que aqui gorjeiam,', '', 'the birds that warble here'],
        ['Não gorjeiam como lá.', '', 'do not warble like those there.'],
        ['Nosso céu tem mais estrelas,', '', 'Our sky has more stars,'],
        ['Nossas várzeas têm mais flores,', '', 'our meadows have more flowers,'],
        ['Nossos bosques têm mais vida,', '', 'our woods have more life,'],
        ['Nossa vida mais amores.', '', 'our life more loves.']
      ],
      gloss: [['terra', 'land, homeland'], ['palmeiras', 'palm trees'], ['sabiá', 'a Brazilian thrush, the national songbird'], ['gorjeiam', 'warble, sing'], ['aqui / lá', 'here / there'], ['várzeas', 'river meadows']],
      before: 'Think of a place you miss. What three things there are better than anywhere else?',
      deeper: 'Gonçalves Dias wrote this far from Brazil. Which word shows where he is? Write a four-line poem about a place you miss.',
      qs: [
        { q: 'What bird sings in the poet’s homeland?', o: ['The sabiá', 'The parrot', 'The eagle'], a: 0, w: '“Onde canta o Sabiá.”' },
        { q: 'Where is the poet?', o: ['Home in Brazil', 'Far away from his homeland', 'On the sea'], a: 1, w: '“Aqui” (here) birds do not sing like “lá” (there): he is away from home.' },
        { q: 'What does the pattern “mais estrelas… mais flores… mais vida… mais amores” do?', o: ['It builds love for home by repeating “more”', 'It counts real stars', 'It lists chores'], a: 0, w: 'Repeating “mais” (more) stacks up reasons why home is best.' }
      ]
    },
    {
      id: 'pt-machado', tier: 'g68', title: 'Memórias Póstumas de Brás Cubas', author: 'Machado de Assis', work: 'Memórias Póstumas de Brás Cubas, chapter 1', year: '1881', form: 'Novel · opening',
      why: 'A narrator who is already dead writes his memoirs. Machado is considered Brazil’s greatest author.',
      lines: [
        ['Algum tempo hesitei se devia abrir estas memórias', '', 'For some time I hesitated whether I should open these memoirs'],
        ['pelo princípio ou pelo fim,', '', 'at the beginning or at the end,'],
        ['isto é, se poria em primeiro lugar o meu nascimento ou a minha morte.', '', 'that is, whether I should put my birth first or my death.']
      ],
      gloss: [['hesitei', 'I hesitated'], ['memórias', 'memoirs'], ['princípio', 'beginning'], ['fim', 'end'], ['nascimento', 'birth'], ['póstumas', 'posthumous, written after death']],
      before: 'Most life stories start with birth. What would be different if a story started with death?',
      deeper: 'The title says “póstumas.” What does that tell you about the narrator? Rewrite the first sentence as if you were that narrator.',
      qs: [
        { q: 'What is the narrator hesitating about?', o: ['Whether to start with birth or death', 'Which book to write', 'Where to live'], a: 0, w: '“Se poria em primeiro lugar o meu nascimento ou a minha morte.”' },
        { q: 'What does “póstumas” in the title tell us?', o: ['The memoirs are very old', 'The memoirs are written after the author’s death', 'The memoirs are secret'], a: 1, w: '“Póstumas” = posthumous. The narrator is dead.' },
        { q: 'What is the tone?', o: ['Playful and ironic', 'Angry', 'Bored'], a: 0, w: 'A dead man calmly worrying about the order of his memoir is darkly funny.' }
      ]
    },
    {
      id: 'pt-camoes', tier: 'g912', title: 'As armas e os barões assinalados', author: 'Luís de Camões', work: 'Os Lusíadas, Canto I', year: '1572', form: 'Epic poem · ottava rima',
      why: 'Portugal’s national epic celebrates Vasco da Gama’s voyage to India, written in the shadow of Virgil.',
      lines: [
        ['As armas e os barões assinalados,', '', 'The arms and the distinguished barons,'],
        ['Que da ocidental praia Lusitana,', '', 'who from the western Lusitanian shore,'],
        ['Por mares nunca de antes navegados', '', 'over seas never sailed before,'],
        ['Passaram ainda além da Taprobana,', '', 'passed on even beyond Taprobana,']
      ],
      gloss: [['armas', 'weapons, deeds of war'], ['barões', 'noblemen'], ['assinalados', 'distinguished, marked out'], ['ocidental', 'western'], ['Lusitana', 'Portuguese (from Lusitania)'], ['Taprobana', 'ancient name for Sri Lanka'], ['navegados', 'sailed']],
      before: 'Epics begin by naming their heroes. Who in history sailed where no one had gone before?',
      deeper: 'Compare with Virgil’s “Arma virumque cano” in the Latin page. What did Camões borrow, and what is new?',
      qs: [
        { q: 'Who are the heroes?', o: ['Distinguished Portuguese sailors', 'Greek gods', 'Roman soldiers'], a: 0, w: '“Barões assinalados… da ocidental praia Lusitana.”' },
        { q: 'What is special about the seas?', o: ['They were never sailed before', 'They are in the north', 'They are frozen'], a: 0, w: '“Mares nunca de antes navegados.”' },
        { q: 'Why does the opening echo Virgil’s “Arma virumque cano”?', o: ['Camões copied the Roman epic form to give Portugal a classical epic', 'It is a coincidence', 'Virgil was Portuguese'], a: 0, w: 'Starting with “armas” and heroes marks the poem as an epic on the model of the Aeneid.' }
      ]
    }
  ];

  /* ─────────────────────────── RUSSIAN ─────────────────────────── */
  P.ru = [
    {
      id: 'ru-ryaba', tier: 'k2', title: 'Курочка Ряба', author: 'Russian folk tale', work: 'Fairy tale (Kurochka Ryaba)', year: 'traditional', form: 'Folk tale · repetition',
      why: 'The most familiar Russian first story: a golden egg, a clumsy mouse, and a comforting hen.',
      lines: [
        ['Жили-были дед да баба.', 'Zhili-byli ded da baba.', 'Once upon a time there lived an old man and an old woman.'],
        ['И была у них курочка Ряба.', 'I byla u nikh kurochka Ryaba.', 'And they had a little hen, Ryaba (Speckled).'],
        ['Снесла курочка яичко: яичко не простое — золотое.', 'Snesla kurochka yaichko: yaichko ne prostoye — zolotoye.', 'The little hen laid an egg: the egg was not ordinary — it was golden.'],
        ['Дед бил, бил — не разбил. Баба била, била — не разбила.', 'Ded bil, bil — ne razbil. Baba bila, bila — ne razbila.', 'The old man hit it and hit it — he did not break it. The old woman hit it and hit it — she did not break it.'],
        ['Мышка бежала, хвостиком махнула, яичко упало и разбилось.', 'Myshka bezhala, khvostikom makhnula, yaichko upalo i razbilos’.', 'A little mouse ran by, flicked her tail, and the egg fell and broke.'],
        ['Дед плачет, баба плачет, а курочка кудахчет: «Не плачь, дед, не плачь, баба! Снесу я вам яичко другое, не золотое — простое.»', 'Ded plachet, baba plachet, a kurochka kudakhchet: «Ne plach’, ded, ne plach’, baba! Snesu ya vam yaichko drugoye, ne zolotoye — prostoye.»', 'The old man cries, the old woman cries, and the hen clucks: “Don’t cry, old man, don’t cry, old woman! I will lay you another egg, not a golden one — an ordinary one.”']
      ],
      gloss: [['дед', 'grandfather, old man'], ['баба', 'old woman, grandmother'], ['курочка', 'little hen'], ['яичко', 'little egg'], ['золотое', 'golden'], ['мышка', 'little mouse']],
      before: 'What do you expect if a hen lays a golden egg? Predict what will happen.',
      deeper: 'The hen promises an ordinary egg. Why might an ordinary egg be better than a golden one? Retell the tale with a different animal breaking the egg.',
      qs: [
        { q: 'What kind of egg does the hen lay?', o: ['A golden egg', 'A silver egg', 'A speckled egg'], a: 0, w: '“Яичко не простое — золотое”: not ordinary but golden.' },
        { q: 'Who breaks it?', o: ['The old man', 'The old woman', 'The mouse'], a: 2, w: 'The mouse flicks her tail and the egg falls and breaks.' },
        { q: 'How does the hen comfort them?', o: ['She promises another egg, an ordinary one', 'She flies away', 'She sings a song'], a: 0, w: '“Снесу я вам яичко другое, не золотое — простое.”' }
      ]
    },
    {
      id: 'ru-pushkin', tier: 'g35', title: 'У лукоморья дуб зелёный', author: 'Alexander Pushkin', work: 'Руслан и Людмила — prologue', year: '1828', form: 'Poem · fairy-tale prologue',
      why: 'Pushkin, the founder of modern Russian literature, wrote the opening every Russian child learns by heart.',
      lines: [
        ['У лукоморья дуб зелёный;', 'U lukomor’ya dub zelyonyy;', 'By a curved sea-shore stands a green oak;'],
        ['Златая цепь на дубе том:', 'Zlataya tsep’ na dube tom:', 'a golden chain is on that oak:'],
        ['И днём и ночью кот учёный', 'I dnyom i nochyu kot uchyonyy', 'and day and night a learned cat'],
        ['Всё ходит по цепи кругом;', 'Vsyo khodit po tsepi krugom;', 'keeps walking round the chain;']
      ],
      gloss: [['лукоморье', 'a curved sea-shore'], ['дуб', 'oak'], ['зелёный', 'green'], ['цепь', 'chain'], ['кот', 'tomcat'], ['учёный', 'learned, scholarly'], ['кругом', 'around, in a circle']],
      before: 'Picture an oak with a golden chain and a cat walking in circles. What kind of world is that?',
      deeper: 'Pushkin calls the cat “learned.” What do you think this cat knows? Continue the scene with two lines of your own.',
      qs: [
        { q: 'What kind of tree is it?', o: ['An oak', 'A birch', 'A pine'], a: 0, w: '«Дуб зелёный»: a green oak.' },
        { q: 'What does the cat do?', o: ['Walks around the chain', 'Sleeps', 'Climbs the tree'], a: 0, w: '«Всё ходит по цепи кругом»: keeps walking round the chain.' },
        { q: 'What does the word “учёный” (learned) do for the picture?', o: ['It makes the cat magical, a scholar-cat in a fairy-tale place', 'It shows the cat is old', 'It shows the cat is lost'], a: 0, w: 'An ordinary cat would not be “learned”: the adjective signals fairy tale.' }
      ]
    },
    {
      id: 'ru-lermontov', tier: 'g68', title: 'Парус', author: 'Mikhail Lermontov', work: 'Парус', year: '1832', form: 'Lyric poem',
      why: 'A single sail on the sea stands for restless searching. Lermontov wrote it at 17.',
      lines: [
        ['Белеет парус одинокой', 'Beleyet parus odinokoy', 'A lone sail gleams white'],
        ['В тумане моря голубом!..', 'V tumane morya golubom!..', 'in the blue mist of the sea!..'],
        ['Что ищет он в стране далёкой?', 'Chto ishchet on v strane dalyokoy?', 'What does it seek in a distant land?'],
        ['Что кинул он в краю родном?..', 'Chto kinul on v krayu rodnom?..', 'What did it leave behind in its native land?..']
      ],
      gloss: [['белеет', 'gleams white'], ['парус', 'sail'], ['одинокой', 'lonely (old form of одинокий)'], ['туман', 'mist, fog'], ['ищет', 'seeks'], ['кинул', 'threw down, left behind'], ['край родной', 'native land']],
      before: 'A lone sail on a vast sea: what does it feel like? Brave, lonely, or both?',
      deeper: 'The poem asks two questions and gives no answer. Answer them for the sail in your own words. What is the sail really?',
      qs: [
        { q: 'What does the poet see?', o: ['A lone sail', 'A fleet of ships', 'A lighthouse'], a: 0, w: '«Белеет парус одинокой».' },
        { q: 'What two questions does he ask?', o: ['What it seeks far away, and what it left at home', 'Where it is going and when', 'Who owns it'], a: 0, w: 'Lines 3 and 4 ask what the sail seeks and what it left.' },
        { q: 'What might the sail stand for?', o: ['A restless person searching for something', 'Just a boat', 'A weather sign'], a: 0, w: 'The sail mirrors the poet: a loner who leaves home and seeks something he cannot name.' }
      ]
    },
    {
      id: 'ru-tolstoy', tier: 'g912', title: 'Анна Каренина — first lines', author: 'Leo Tolstoy', work: 'Анна Каренина, Part 1, chapter 1', year: '1878', form: 'Novel · opening',
      why: 'One of the most quoted first sentences in literature: a theory of families in one line.',
      lines: [
        ['Все счастливые семьи похожи друг на друга, каждая несчастливая семья несчастлива по-своему.', 'Vse schastlivyye sem’i pokhozhi drug na druga, kazhdaya neschastlivaya sem’ya neschastliva po-svoyemu.', 'All happy families are alike; every unhappy family is unhappy in its own way.'],
        ['Всё смешалось в доме Облонских.', 'Vsyo smeshalos’ v dome Oblonskikh.', 'Everything was in confusion in the Oblonskys’ house.']
      ],
      gloss: [['счастливые', 'happy'], ['семьи', 'families'], ['похожи', 'similar, alike'], ['несчастливая', 'unhappy'], ['по-своему', 'in its own way'], ['смешалось', 'got mixed up, was thrown into confusion']],
      before: 'Do you think happy families really are alike? Jot a guess before reading the next question.',
      deeper: 'Tolstoy claims unhappiness is varied and happiness is uniform. Do you agree? Support your view with an example from a story you know.',
      qs: [
        { q: 'What does the first sentence claim about happy families?', o: ['They are all alike', 'They are all different', 'They are rare'], a: 0, w: '«Все счастливые семьи похожи друг на друга».' },
        { q: 'And unhappy ones?', o: ['Each is unhappy in its own way', 'They are all alike', 'They do not exist'], a: 0, w: '«Каждая несчастливая семья несчастлива по-своему».' },
        { q: 'How does the second sentence fit?', o: ['It starts a specific family story: the Oblonskys’ home is in chaos', 'It ends the story', 'It is unrelated'], a: 0, w: 'The general claim becomes a specific case: the sentence gives the first example of an unhappy household.' }
      ]
    }
  ];

  /* ─────────────────────────── JAPANESE ─────────────────────────── */
  P.ja = [
    {
      id: 'ja-momotaro', tier: 'k2', title: '桃太郎', author: 'Japanese folk tale', work: 'Momotarō (Peach Boy)', year: 'traditional', form: 'Folk tale · opening',
      why: 'Japan’s best-known fairy tale. Every child learns “mukashi mukashi”, the opening phrase for all folk tales.',
      lines: [
        ['むかしむかし、あるところに、おじいさんとおばあさんが住んでいました。', 'Mukashi mukashi, aru tokoro ni, ojiisan to obaasan ga sunde imashita.', 'Long, long ago, in a certain place, there lived an old man and an old woman.'],
        ['おじいさんは山へしばかりに、おばあさんは川へせんたくに行きました。', 'Ojiisan wa yama e shibakari ni, obaasan wa kawa e sentaku ni ikimashita.', 'The old man went to the mountain to cut brushwood; the old woman went to the river to do laundry.'],
        ['すると川かみから、大きな桃がどんぶらこ、どんぶらこと流れてきました。', 'Suruto kawakami kara, ōkina momo ga donburako, donburako to nagarete kimashita.', 'Then from upstream, a big peach came floating down, bobbing, bobbing.']
      ],
      gloss: [['むかしむかし', 'long, long ago'], ['山', 'やま · mountain'], ['川', 'かわ · river'], ['大きな', 'おおきな · big'], ['桃', 'もも · peach'], ['どんぶらこ', 'the sound of something bobbing in water']],
      before: 'What would you do if a giant peach floated down a river toward you?',
      deeper: 'The sound word “donburako” imitates the peach bobbing. Invent a sound word for something else floating by.',
      qs: [
        { q: 'Who lives in the story’s place?', o: ['An old man and an old woman', 'A boy and a dog', 'A king'], a: 0, w: 'おじいさん and おばあさん are the old man and the old woman.' },
        { q: 'Where does the old woman go?', o: ['To the mountain', 'To the river', 'To the sea'], a: 1, w: '川へせんたくに: to the river to do laundry.' },
        { q: 'What floats down the river?', o: ['A big peach', 'A boat', 'A fish'], a: 0, w: '大きな桃: a big peach, which will hold the hero.' }
      ]
    },
    {
      id: 'ja-basho', tier: 'g35', title: '古池や', author: 'Matsuo Bashō', work: 'Haiku', year: '1686', form: 'Haiku · 5–7–5',
      why: 'Perhaps the most famous haiku: a tiny sound reveals deep silence.',
      lines: [
        ['古池や', 'Furu ike ya', 'An old pond —'],
        ['蛙飛び込む', 'kawazu tobikomu', 'a frog jumps in:'],
        ['水の音', 'mizu no oto', 'the sound of water.']
      ],
      gloss: [['古池', 'ふるいけ · old pond'], ['や', 'cutting word (kireji), a pause with feeling'], ['蛙', 'かわず · frog'], ['飛び込む', 'とびこむ · to jump in'], ['水', 'みず · water'], ['音', 'おと · sound']],
      before: 'Close your eyes and picture a still pond. What is the quietest sound you can imagine?',
      deeper: 'Count the sounds (on) in each line: 5–7–5. Write your own haiku about a tiny sound.',
      qs: [
        { q: 'What is the setting?', o: ['An old pond', 'A mountain', 'A temple'], a: 0, w: '古池: an old pond.' },
        { q: 'What happens?', o: ['A frog jumps into the water', 'A fish leaps', 'Rain falls'], a: 0, w: '蛙飛び込む: a frog jumps in.' },
        { q: 'Why is the sound important?', o: ['The splash makes the quiet around it feel deeper', 'It frightens the poet', 'It is the poem’s title'], a: 0, w: 'A tiny sound in great stillness shows how silent the scene was.' }
      ]
    },
    {
      id: 'ja-soseki', tier: 'g68', title: '吾輩は猫である', author: 'Natsume Sōseki', work: '吾輩は猫である (I Am a Cat)', year: '1905', form: 'Novel · opening',
      why: 'A cat narrates the humans around him with a pompous, dry wit. It launched Sōseki’s career.',
      lines: [
        ['吾輩は猫である。', 'Wagahai wa neko de aru.', 'I am a cat.'],
        ['名前はまだ無い。', 'Namae wa mada nai.', 'As yet I have no name.'],
        ['どこで生れたかとんと見当がつかぬ。', 'Doko de umareta ka tonto kentō ga tsukanu.', 'I have no idea at all where I was born.']
      ],
      gloss: [['吾輩', 'わがはい · a pompous “I” (like “this humble one” in a grand style)'], ['猫', 'ねこ · cat'], ['名前', 'なまえ · name'], ['まだ', 'still, yet'], ['見当', 'けんとう · guess'], ['つかぬ', 'old form of つかない: cannot get a fix on']],
      before: 'If your pet could write a diary about you, what would it say?',
      deeper: 'The cat uses a grand word for “I” but has no name. What does the contrast tell you about him? Write two sentences in the voice of a pet.',
      qs: [
        { q: 'Who is the narrator?', o: ['A cat', 'A teacher', 'A student'], a: 0, w: '吾輩は猫である: “I am a cat.”' },
        { q: 'What is odd about “吾輩”?', o: ['It is a grand, old-fashioned word for “I”', 'It means “you”', 'It is a name'], a: 0, w: 'The pompous pronoun clashes with a nameless cat. That is the joke.' },
        { q: 'What does the cat not know?', o: ['His name and where he was born', 'How to speak', 'What a cat is'], a: 0, w: 'He says he has no name and cannot guess where he was born.' }
      ]
    },
    {
      id: 'ja-heike', tier: 'g912', title: '平家物語 — 祇園精舎', author: 'Anonymous', work: 'The Tale of the Heike, Book 1', year: '13th century', form: 'War tale · classical prose',
      why: 'The Heike’s opening states a Buddhist view of impermanence that still shapes how Japanese people talk about time and loss.',
      lines: [
        ['祇園精舎の鐘の声、諸行無常の響きあり。', 'Gion shōja no kane no koe, shogyō mujō no hibiki ari.', 'The sound of the bell at Gion Shōja echoes the impermanence of all things.'],
        ['沙羅双樹の花の色、盛者必衰の理をあらはす。', 'Sara sōju no hana no iro, jōsha hissui no kotowari o arawasu.', 'The colour of the sala flowers shows that those who flourish must decline.'],
        ['おごれる人も久しからず、ただ春の夜の夢のごとし。', 'Ogoreru hito mo hisashikarazu, tada haru no yo no yume no gotoshi.', 'The proud do not last long; they are just like a dream on a spring night.']
      ],
      gloss: [['鐘', 'かね · bell'], ['諸行無常', 'しょぎょうむじょう · all things are impermanent'], ['盛者必衰', 'じょうしゃひっすい · the prosperous must fall'], ['理', 'ことわり · principle, truth'], ['おごれる人', 'proud people'], ['夢', 'ゆめ · dream']],
      before: 'Think of something that was once powerful or grand and is now gone. What happened?',
      deeper: 'The author uses a bell and flowers to state a big idea. Pick two everyday sights and write what truth each could show.',
      qs: [
        { q: 'What do the bell’s sound and the sala flowers show?', o: ['Nothing lasts; the powerful must fall', 'Spring is coming', 'Joy lasts forever'], a: 0, w: 'Both images illustrate impermanence: 諸行無常 and 盛者必衰.' },
        { q: 'How are the proud described?', o: ['They do not last long', 'They rule forever', 'They are kind'], a: 0, w: '久しからず: not for long.' },
        { q: 'Why compare them to “a dream on a spring night”?', o: ['A spring night is short and a dream is gone on waking', 'Spring nights are long', 'Dreams are real'], a: 0, w: 'A short night and a fading dream together stress how brief power is.' }
      ]
    }
  ];

  /* ─────────────────────────── CHINESE ─────────────────────────── */
  P.zh = [
    {
      id: 'zh-egoose', tier: 'k2', title: '咏鹅', author: 'Luo Binwang (骆宾王)', work: 'Tang dynasty poem', year: 'c. 7th century', form: 'Five-character poem',
      why: 'Chinese children often learn this first poem. Legend says Luo wrote it at about seven years old.',
      lines: [
        ['鹅,鹅,鹅,曲项向天歌。', 'É, é, é, qū xiàng xiàng tiān gē.', 'Goose, goose, goose, curving its neck to sing to the sky.'],
        ['白毛浮绿水,红掌拨清波。', 'Bái máo fú lǜ shuǐ, hóng zhǎng bō qīng bō.', 'White feathers float on green water; red feet paddle the clear waves.']
      ],
      gloss: [['鹅', 'é · goose'], ['白', 'bái · white'], ['绿', 'lǜ · green'], ['水', 'shuǐ · water'], ['红', 'hóng · red'], ['歌', 'gē · sing, song']],
      before: 'Say “é, é, é” like a goose. What colours do you picture on a goose on a pond?',
      deeper: 'The poem is full of colours: white, green, red. Write a two-line poem about another animal using three colours.',
      qs: [
        { q: 'What animal is in the poem?', o: ['A goose', 'A duck', 'A crane'], a: 0, w: '鹅 (é) is a goose.' },
        { q: 'What colours are the feathers and feet?', o: ['White feathers and red feet', 'Red feathers and white feet', 'Green and blue'], a: 0, w: '白毛 white feathers; 红掌 red feet.' },
        { q: 'Why does the poem start with “鹅,鹅,鹅”?', o: ['It imitates the goose’s call', 'It is a counting game', 'It names three geese'], a: 0, w: 'The repeated syllable copies the sound geese make.' }
      ]
    },
    {
      id: 'zh-jingyesi', tier: 'g35', title: '静夜思', author: 'Li Bai (李白)', work: 'Quiet Night Thoughts', year: 'c. 726', form: 'Five-character quatrain · Tang poem',
      why: 'Every Chinese schoolchild learns it. Four lines of moonlight carry the feeling of homesickness.',
      lines: [
        ['床前明月光,疑是地上霜。', 'Chuáng qián míng yuè guāng, yí shì dì shàng shuāng.', 'Before my bed, bright moonlight — I suspect it is frost on the ground.'],
        ['举头望明月,低头思故乡。', 'Jǔ tóu wàng míng yuè, dī tóu sī gùxiāng.', 'I raise my head and gaze at the bright moon; I lower my head and think of home.']
      ],
      gloss: [['床', 'chuáng · bed'], ['明月', 'míng yuè · bright moon'], ['光', 'guāng · light'], ['霜', 'shuāng · frost'], ['举头', 'jǔ tóu · raise one’s head'], ['低头', 'dī tóu · lower one’s head'], ['故乡', 'gùxiāng · hometown']],
      before: 'Moonlight on a floor can look like frost. When has light or shadow tricked your eyes?',
      deeper: 'Li Bai looks up, then down. Find the verbs “raise” and “lower.” Why do they make the homesick feeling stronger?',
      qs: [
        { q: 'What does the poet mistake for frost?', o: ['Moonlight on the ground', 'Snow', 'Salt'], a: 0, w: '疑是地上霜: he suspects it is frost on the ground.' },
        { q: 'What does he think of when he looks down?', o: ['His hometown', 'Dinner', 'The moon'], a: 0, w: '低头思故乡: lowers his head and thinks of home.' },
        { q: 'What does the moon seem to do for the poet?', o: ['It reminds him of the same moon his family sees', 'It frightens him', 'It brings frost'], a: 0, w: 'The moon is a shared sight that connects him to home.' }
      ]
    },
    {
      id: 'zh-wangzhihuan', tier: 'g68', title: '登鹳雀楼', author: 'Wang Zhihuan (王之涣)', work: 'Climbing Stork Tower', year: 'c. 8th century', form: 'Five-character quatrain · Tang poem',
      why: 'The last line is a proverb: if you want a farther view, climb higher.',
      lines: [
        ['白日依山尽,黄河入海流。', 'Bái rì yī shān jìn, Huáng Hé rù hǎi liú.', 'The white sun leans on the mountains and is gone; the Yellow River flows into the sea.'],
        ['欲穷千里目,更上一层楼。', 'Yù qióng qiān lǐ mù, gèng shàng yī céng lóu.', 'To see a thousand li farther, climb one more storey of the tower.']
      ],
      gloss: [['白日', 'bái rì · the sun'], ['依', 'yī · lean on'], ['尽', 'jìn · to end, be used up'], ['黄河', 'Huáng Hé · Yellow River'], ['欲穷', 'yù qióng · to wish to exhaust (see to the end)'], ['千里', 'qiān lǐ · a thousand li (far)'], ['更', 'gèng · even more'], ['楼', 'lóu · tower, building']],
      before: 'What do you see when you climb higher? Name something you can see from a tall place and not from the ground.',
      deeper: 'The last line has become advice. Write a sentence applying “climb one more level” to learning, not to a tower.',
      qs: [
        { q: 'Where is the sun at the start?', o: ['Setting behind the mountains', 'High at noon', 'Rising'], a: 0, w: '白日依山尽: the sun leans on the mountains and ends.' },
        { q: 'Where does the Yellow River go?', o: ['Into the sea', 'Into a lake', 'Underground'], a: 0, w: '黄河入海流: flows into the sea.' },
        { q: 'What is the message of the last line?', o: ['To see farther, go higher', 'Stay on the ground', 'Never climb'], a: 0, w: 'It is both a literal view and a life lesson: keep striving for a wider view.' }
      ]
    },
    {
      id: 'zh-lunyu', tier: 'g912', title: '论语 · 学而 1.1', author: 'Confucius (孔子), compiled by his followers', work: 'The Analects, chapter 1', year: 'c. 5th–3rd century BC', form: 'Classical prose · philosophy',
      why: 'The first lines of the Analects, studied for 2,500 years, define learning as a lifelong joy shared with friends.',
      lines: [
        ['子曰:“学而时习之,不亦说乎?', 'Zǐ yuē: “Xué ér shí xí zhī, bú yì yuè hū?', 'The Master said: “To learn and at the right times practise it — is that not a pleasure?'],
        ['有朋自远方来,不亦乐乎?', 'Yǒu péng zì yuǎnfāng lái, bú yì lè hū?', 'To have friends come from far away — is that not a joy?'],
        ['人不知而不愠,不亦君子乎?”', 'Rén bù zhī ér bú yùn, bú yì jūnzǐ hū?”', 'To be unknown to others and not resentful — is that not a gentleman?”']
      ],
      gloss: [['子', 'zǐ · master (here Confucius)'], ['学', 'xué · to learn'], ['习', 'xí · to practise, review'], ['说', 'yuè · delight (same as 悦)'], ['朋', 'péng · friend'], ['愠', 'yùn · to feel resentment'], ['君子', 'jūnzǐ · a person of noble character']],
      before: 'What is the difference between learning something and practising it? Which is harder?',
      deeper: 'Each line ends with “不亦…乎?” (is it not…?). Why might Confucius use a question instead of a statement three times in a row?',
      qs: [
        { q: 'According to the first line, what brings pleasure?', o: ['Learning and practising at the right times', 'Winning an argument', 'Being praised'], a: 0, w: '学而时习之: learn and practise it at the right times.' },
        { q: 'What is the second joy?', o: ['Friends coming from far away', 'Living alone', 'Travelling far'], a: 0, w: '有朋自远方来: a friend arrives from afar.' },
        { q: 'What does the third line say makes someone a 君子?', o: ['Not resenting being unrecognized', 'Being famous', 'Winning honors'], a: 0, w: 'A person of character does not feel bitter if others do not notice them.' }
      ]
    }
  ];

  /* ─────────────────────────── LATIN ─────────────────────────── */
  P.la = [
    {
      id: 'la-vulpes', tier: 'k2', title: 'Vulpes et Uva', author: 'Phaedrus', work: 'Fabulae IV.3', year: 'c. AD 30', form: 'Fable in verse',
      why: 'The origin of the phrase “sour grapes”: the fox decides the grapes he cannot reach are not worth wanting.',
      lines: [
        ['Fame coacta vulpes alta in vinea', '', 'Driven by hunger, a fox, in a high vineyard,'],
        ['uvam adpetebat, summis saliens viribus.', '', 'was reaching for a grape, leaping with all his strength.'],
        ['Quam tangere ut non potuit, discedens ait:', '', 'When he could not touch it, as he left he said:'],
        ['“Nondum matura es; nolo acerbam sumere.”', '', '“You are not yet ripe; I don’t want to take a sour one.”']
      ],
      gloss: [['fames', 'hunger'], ['vulpes', 'fox'], ['uva', 'grape'], ['vinea', 'vineyard'], ['matura', 'ripe'], ['acerba', 'sour, harsh'], ['ait', 'he said']],
      before: 'Has someone ever said something they wanted was “not good anyway” because they could not get it?',
      deeper: 'What is the fox really feeling? Write a short version of the fable in English with a different animal and a different thing out of reach.',
      qs: [
        { q: 'Why is the fox in the vineyard?', o: ['He is hungry', 'He is lost', 'He is playing'], a: 0, w: '“Fame coacta”: driven by hunger.' },
        { q: 'What does the fox say when he cannot reach the grape?', o: ['It is not yet ripe', 'It is too high', 'It belongs to a farmer'], a: 0, w: '“Nondum matura es.”' },
        { q: 'What is the fable’s lesson?', o: ['Some people pretend they did not want what they could not get', 'Foxes love grapes', 'Always climb higher'], a: 0, w: 'The fox excuses his failure by blaming the grape.' }
      ]
    },
    {
      id: 'la-lupus', tier: 'g35', title: 'Lupus et Agnus', author: 'Phaedrus', work: 'Fabulae I.1', year: 'c. AD 30', form: 'Fable in verse',
      why: 'A bully invents a reason to attack: Phaedrus opens his collection with it.',
      lines: [
        ['Ad rivum eundem lupus et agnus venerant,', '', 'To the same stream a wolf and a lamb had come,'],
        ['siti compulsi. Superior stabat lupus,', '', 'driven by thirst. The wolf stood upstream,'],
        ['longeque inferior agnus. Tunc fauce improba', '', 'and far below stood the lamb. Then with a greedy throat'],
        ['latro incitatus iurgii causam intulit;', '', 'the robber, stirred up, brought forward a reason for a quarrel;']
      ],
      gloss: [['rivus', 'stream'], ['lupus', 'wolf'], ['agnus', 'lamb'], ['sitis', 'thirst'], ['superior', 'higher (upstream)'], ['inferior', 'lower (downstream)'], ['latro', 'robber, bandit']],
      before: 'Who has more power: someone upstream or downstream? Think about water flowing.',
      deeper: 'The wolf in the next lines accuses the lamb of muddying the water, although the lamb is downstream. Why is that unfair? Find a modern example of a false accusation.',
      qs: [
        { q: 'Where does the wolf stand?', o: ['Upstream, higher', 'Downstream', 'In the water'], a: 0, w: '“Superior stabat lupus”: the wolf stood higher up the stream.' },
        { q: 'What word does Phaedrus use for the wolf?', o: ['Latro', 'Rex', 'Pastor'], a: 0, w: '“Latro” means robber. It already judges the wolf.' },
        { q: 'What is the wolf about to do?', o: ['Invent a reason to attack the lamb', 'Share the water', 'Run away'], a: 0, w: '“Iurgii causam intulit”: brought forward a reason for a quarrel.' }
      ]
    },
    {
      id: 'la-caesar', tier: 'g68', title: 'Gallia est omnis divisa', author: 'Gaius Julius Caesar', work: 'De Bello Gallico I.1', year: 'c. 50 BC', form: 'Historical prose',
      why: 'The most famous opening sentence in Latin class, and the model of clear, plain prose.',
      lines: [
        ['Gallia est omnis divisa in partes tres,', '', 'Gaul, taken as a whole, is divided into three parts,'],
        ['quarum unam incolunt Belgae, aliam Aquitani,', '', 'of which one is inhabited by the Belgae, another by the Aquitani,'],
        ['tertiam qui ipsorum lingua Celtae, nostra Galli appellantur.', '', 'and the third by those who in their own language are called Celts, and in ours Gauls.']
      ],
      gloss: [['Gallia', 'Gaul (roughly modern France)'], ['omnis', 'all, as a whole'], ['divisa', 'divided'], ['partes tres', 'three parts'], ['incolunt', 'they inhabit'], ['appellantur', 'are called']],
      before: 'Why would a general open a war report by describing the land and its peoples?',
      deeper: 'Caesar says what the people call themselves and what the Romans call them. Why does that distinction matter in an account of conquest?',
      qs: [
        { q: 'How many parts is Gaul divided into?', o: ['Three', 'Two', 'Four'], a: 0, w: '“Partes tres”: three parts.' },
        { q: 'Which peoples live in the first two parts?', o: ['Belgae and Aquitani', 'Romans and Greeks', 'Celts and Gauls'], a: 0, w: 'One part holds the Belgae, another the Aquitani.' },
        { q: 'What does “ipsorum lingua… nostra” show?', o: ['The Celts and the Romans name the same people differently', 'Two different peoples', 'A mistake'], a: 0, w: 'Celtae in their language and Galli in Latin are the same people.' }
      ]
    },
    {
      id: 'la-virgil', tier: 'g912', title: 'Arma virumque cano', author: 'Publius Vergilius Maro (Virgil)', work: 'Aeneid I.1–4', year: '19 BC', form: 'Epic poem · dactylic hexameter',
      why: 'Virgil’s epic gave Rome its founding story. Camões, Dante and Milton all echo these opening words.',
      lines: [
        ['Arma virumque cano, Troiae qui primus ab oris', '', 'I sing of arms and the man, who first from the shores of Troy'],
        ['Italiam, fato profugus, Laviniaque venit', '', 'came to Italy, exiled by fate, and to the Lavinian'],
        ['litora, multum ille et terris iactatus et alto', '', 'shores; much was he tossed on land and on the deep'],
        ['vi superum, saevae memorem Iunonis ob iram;', '', 'by the force of the gods above, because of fierce Juno’s unforgetting anger;']
      ],
      gloss: [['arma', 'arms, weapons, war'], ['vir', 'man'], ['cano', 'I sing'], ['fatum', 'fate'], ['profugus', 'exile'], ['litus', 'shore'], ['iactatus', 'tossed about'], ['Iuno', 'queen of the gods, enemy of Aeneas']],
      before: 'Epics begin by calling on a muse to sing. Why might a poet need help to tell a story this big?',
      deeper: 'Find how many words tell you about the hero (virum, fato profugus…) and how many about the goddess (saevae Iunonis). Whose story is it really?',
      qs: [
        { q: 'What are the first two subjects the poet sings about?', o: ['Arms and the man', 'Gods and kings', 'Land and sea'], a: 0, w: '“Arma virumque cano”: arms (war) and the man (Aeneas).' },
        { q: 'Where does the hero come from and go to?', o: ['From Troy to Italy', 'From Rome to Greece', 'From Carthage to Troy'], a: 0, w: '“Troiae… ab oris Italiam… venit.”' },
        { q: 'Why is he tossed on land and sea?', o: ['Because of the gods and Juno’s anger', 'Because of a storm only', 'Because he is lost'], a: 0, w: '“Vi superum, saevae memorem Iunonis ob iram”.' }
      ]
    },
    {
      id: 'la-catullus', tier: 'g912', title: 'Odi et amo', author: 'Gaius Valerius Catullus', work: 'Carmen 85', year: 'c. 55 BC', form: 'Elegiac couplet',
      why: 'Two lines, 14 words, and the most compact description of contradictory feelings in Latin.',
      lines: [
        ['Odi et amo. Quare id faciam, fortasse requiris.', '', 'I hate and I love. Why I do this, perhaps you ask.'],
        ['Nescio, sed fieri sentio et excrucior.', '', 'I do not know, but I feel it happening, and I am tortured.']
      ],
      gloss: [['odi', 'I hate'], ['amo', 'I love'], ['quare', 'why'], ['fortasse', 'perhaps'], ['requiris', 'you ask'], ['nescio', 'I do not know'], ['excrucior', 'I am tortured']],
      before: 'Can you love and be angry with the same person at once? How would you describe it?',
      deeper: 'Catullus does not explain the contradiction. Why is “nescio” (I do not know) more powerful than an explanation would be?',
      qs: [
        { q: 'What two feelings does Catullus name?', o: ['Hate and love', 'Fear and joy', 'Pride and shame'], a: 0, w: '“Odi et amo.”' },
        { q: 'Does he know why he feels both?', o: ['No, “nescio”', 'Yes, he explains', 'He refuses to say'], a: 0, w: '“Nescio” means I do not know.' },
        { q: 'What does “excrucior” add?', o: ['He is in torment', 'He is at peace', 'He is bored'], a: 0, w: 'It literally means “I am being put on the cross,” so very painful.' }
      ]
    }
  ];

  const ORDER = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'la'];
  root.MASTERWORKS = { tiers: TIERS, langs: LANGS, passages: P, order: ORDER };
})(typeof window !== 'undefined' ? window : globalThis);
