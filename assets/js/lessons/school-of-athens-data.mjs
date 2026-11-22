/**
 * Pure data models and projection helpers for The School of Athens lesson.
 * Zero DOM dependencies so node:test can verify coordinates, filters, and math directly.
 */

export const VISUAL_EXHIBITS = {
  athens: {
    id: 'athens',
    title: 'The School of Athens',
    artist: 'Raphael (Raffaello Sanzio)',
    year: '1509–1511',
    image: '../../assets/thumbs/SchoolofAthens.jpg',
    width: 900,
    height: 698,
    initialId: 'plato',
    tip: 'Start with Plato and Aristotle beneath the central arch, then trace the geometry, astronomy, and debating groups left and right.',
    hasGuide: true,
    figures: [
      {
        id: 'plato',
        name: 'Plato',
        short: 'Plato',
        role: 'Philosopher · ideals, forms, justice',
        summary: 'Plato was a student of Socrates and founder of the Athenian Academy. He asked what is permanently real beneath changing appearances, how justice works in a city, and how education shapes the soul.',
        impact: 'His dialogues shaped political thought, ethics, metaphysics, and education for over two millennia—turning structured inquiry into a lasting institution.',
        lookfor: 'Raphael places Plato at the vanishing point in crimson robes, pointing skyward toward timeless Forms and carrying his dialogue Timaeus. Renaissance viewers noticed his face resembles an aging Leonardo da Vinci.',
        systemLens: 'Represents top-down theoretical modeling: beginning with abstract principles and ideals to interpret the messy world below.',
        tag: 'Central figure · Forms',
        x: 49,
        y: 47
      },
      {
        id: 'aristotle',
        name: 'Aristotle',
        short: 'Aristotle',
        role: 'Philosopher · observation, logic, ethics',
        summary: 'Aristotle studied for twenty years in Plato’s Academy before building a system anchored in observing nature. He wrote foundational treatises on logic, biology, physics, ethics, and politics.',
        impact: 'Aristotle’s rules of classification and formal reasoning influenced scholarship across the Mediterranean, the Islamic Golden Age, and medieval Europe.',
        lookfor: 'Standing beside Plato in blue and brown, Aristotle holds his Ethics and spreads his hand downward over the earth—a visual counterpoint to Plato’s upward finger.',
        systemLens: 'Represents bottom-up empirical evidence: building reliable knowledge by sorting, measuring, and comparing observable cases.',
        tag: 'Central figure · Empiricism',
        x: 53.5,
        y: 47
      },
      {
        id: 'socrates',
        name: 'Socrates',
        short: 'Socrates',
        role: 'Philosopher · questioning, dialogue, ethics',
        summary: 'Socrates taught not by writing books or charging fees, but by asking probing questions in public spaces until people saw the contradictions in their own assumptions.',
        impact: 'The Socratic method remains one of humanity’s core tools in law, science, and classrooms: testing claims through disciplined conversation.',
        lookfor: 'Left of Plato in an olive-green tunic, Socrates counts arguments on his fingers while eager listeners—including a helmeted young commander often linked to Alexander or Alcibiades—lean in.',
        systemLens: 'Knowledge as an active social feedback loop: ideas sharpen only when challenged in dialogue.',
        tag: 'Active dialogue',
        x: 36.5,
        y: 46
      },
      {
        id: 'epicurus',
        name: 'Epicurus',
        short: 'Epicurus',
        role: 'Philosopher · atomism, friendship, calm inquiry',
        summary: 'Epicurus argued that the universe is built from atoms moving in a void and that the good life comes from steady friendship, moderation, and freedom from unnecessary fear.',
        impact: 'Rediscovered during the Renaissance, Epicurean atomism helped inspire early modern matter theory and debates about natural law.',
        lookfor: 'At the far left pedestal, crowned with vine leaves and surrounded by admirers and children, he reads intently from a large propped volume.',
        systemLens: 'Shows how an alternative philosophical community—focused on quiet study and atomic nature—coexists inside the same civic temple.',
        tag: 'Atomism & calm',
        x: 17,
        y: 56
      },
      {
        id: 'pythagoras',
        name: 'Pythagoras',
        short: 'Pythagoras',
        role: 'Mathematician · number, musical ratios, harmony',
        summary: 'Pythagoras is associated with the discovery that musical consonance follows simple whole-number ratios—linking sound, geometry, and cosmic order.',
        impact: 'Linking mathematics to physical harmony became one of the engines of physics, astronomy, and music theory.',
        lookfor: 'Seated in the lower-left foreground writing in a heavy book while a youth holds up a slate displaying the musical tetractys and harmonic ratios (diatessaron, diapente, diapason).',
        systemLens: 'Encodes the Quadrivium idea: arithmetic, geometry, music, and astronomy form one connected mathematical language.',
        tag: 'Math & music',
        x: 26,
        y: 65
      },
      {
        id: 'averroes',
        name: 'Averroes (Ibn Rushd)',
        short: 'Averroes',
        role: 'Andalusian philosopher & jurist · commentary, transmission',
        summary: 'Born in 12th-century Córdoba, Ibn Rushd (Averroes) wrote sweeping Arabic commentaries on Aristotle that reconciled rational investigation with civic and religious life.',
        impact: 'Translations of Averroes carried Greek science and philosophy into Latin universities, fueling the European Renaissance itself.',
        lookfor: 'Wearing a white turban just behind Pythagoras and leaning in to inspect his writing—a deliberate bridge across centuries, languages, and cultures.',
        systemLens: 'Illustrates knowledge transmission: civilizations build libraries across translation networks rather than in isolation.',
        tag: 'Cross-cultural bridge',
        x: 22.5,
        y: 60
      },
      {
        id: 'hypatia',
        name: 'Hypatia (traditional, debated)',
        short: 'Hypatia',
        role: 'Alexandrian mathematician & astronomer · teaching, scholarship',
        summary: 'Many viewers traditionally identify the robed figure standing above Pythagoras as Hypatia of Alexandria, renowned teacher of mathematics, astronomy, and philosophy; some scholars instead suggest Raphael’s patron Francesco Maria della Rovere.',
        impact: 'Even the debate over this identification opens a vital inquiry into who gets remembered, named, and visually centered in intellectual history.',
        lookfor: 'Standing on the left side in pale white-and-gold robes above Pythagoras and Averroes, turning straight out of the fresco to lock eyes with the viewer.',
        systemLens: 'A case study in historical evidence and canon-making: art historians weigh visual clues against incomplete records.',
        tag: 'Debated identification',
        x: 31.5,
        y: 55
      },
      {
        id: 'parmenides',
        name: 'Parmenides',
        short: 'Parmenides',
        role: 'Pre-Socratic philosopher · being, logic, permanence',
        summary: 'Parmenides argued that true reality must be unchanging and unified, challenging thinkers to test sensory impressions against strict deductive logic.',
        impact: 'His paradoxes pushed Plato, Aristotle, and later mathematicians to formalize proof, contradiction, and definitions of space and motion.',
        lookfor: 'Just right of Hypatia in a warm yellow cloak, resting one foot on a stone step while holding open a dark-bound book.',
        systemLens: 'Creates a philosophical pairing across the lower canvas with Heraclitus: permanence versus constant flux.',
        tag: 'Logic & permanence',
        x: 35,
        y: 57
      },
      {
        id: 'heraclitus',
        name: 'Heraclitus',
        short: 'Heraclitus',
        role: 'Philosopher · change, flux, tension of opposites',
        summary: 'Heraclitus famously taught that all things are in constant motion—"you cannot step into the same river twice"—and that order emerges from balanced tension.',
        impact: 'His focus on dynamic change anticipates systems thinking, thermodynamics, and evolutionary views of the world.',
        lookfor: 'Seated alone in the lower-center foreground leaning on a rough marble block. Raphael added him late in the painting process, giving him the brooding likeness and boots of Michelangelo.',
        systemLens: 'Shows artistic rivalry inside iconography: Raphael quietly honors Michelangelo’s Sistine Chapel ceiling right down the hall.',
        tag: 'Change & flux',
        x: 45,
        y: 64
      },
      {
        id: 'diogenes',
        name: 'Diogenes',
        short: 'Diogenes',
        role: 'Cynic philosopher · simplicity, critique of status',
        summary: 'Diogenes rejected wealth, grand buildings, and social rank, reportedly living in a clay jar and mocking powerful rulers with sharp wit.',
        impact: 'He stands for the outsider critic who tests whether a society’s institutions actually match its stated virtues.',
        lookfor: 'Sprawled diagonally across the center marble steps in a pale blue tunic with his wooden bowl beside him—physically interrupting the symmetry between left and right.',
        systemLens: 'Every healthy knowledge system needs space for independent dissent outside formal academies.',
        tag: 'Countercultural critic',
        x: 58.5,
        y: 61
      },
      {
        id: 'euclid',
        name: 'Euclid (or Archimedes)',
        short: 'Euclid',
        role: 'Geometer · axioms, constructions, proof',
        summary: 'Euclid organized geometry in his Elements as a step-by-step deductive chain built from simple definitions and postulates.',
        impact: 'For more than two thousand years, Euclidean geometry trained architects, astronomers, cartographers, and engineers in rigorous proof.',
        lookfor: 'On the lower right, a bald scholar in scarlet—modeled on Vatican architect Donato Bramante—bends forward with brass dividers over a dark slate as four students track the steps of his proof.',
        systemLens: 'Notice the four stages of learning on the faces around the slate: puzzlement, recognition, anticipation, and mastery.',
        tag: 'Geometry & proof',
        x: 80.5,
        y: 65
      },
      {
        id: 'zoroaster',
        name: 'Zoroaster (or Strabo)',
        short: 'Zoroaster',
        role: 'Cosmologist · starry heavens, global wisdom',
        summary: 'Traditionally identified as the ancient Persian sage Zoroaster, this figure holds a starry celestial sphere representing human efforts to map the cosmos.',
        impact: 'Placing a Persian thinker among Greek scholars reflects the Renaissance belief that wisdom traditions across cultures search the same sky.',
        lookfor: 'Standing near the right foreground facing Ptolemy, cradling a translucent star-studded globe.',
        systemLens: 'Pairs celestial observation with Ptolemy’s earthly globe so heaven and earth balance inside Aristotle’s empirical half.',
        tag: 'Celestial order',
        x: 86,
        y: 55
      },
      {
        id: 'ptolemy',
        name: 'Ptolemy',
        short: 'Ptolemy',
        role: 'Geographer & astronomer · mapping Earth and planetary models',
        summary: 'Claudius Ptolemy compiled ancient Mediterranean astronomy (the Almagest) and cartography (Geography), creating mathematical models that endured for 1,400 years.',
        impact: 'Even after Copernicus replaced his Earth-centered astronomy, Ptolemy’s coordinate grids and map projections revolutionized navigation.',
        lookfor: 'Seen from behind in a rich golden-ochre robe wearing a crown, holding a terrestrial globe across from Zoroaster’s celestial sphere.',
        systemLens: 'Demonstrates that scientific models can be extraordinarily useful and long-lived even before later evidence revises them.',
        tag: 'Earthly mapping',
        x: 89,
        y: 59
      },
      {
        id: 'raphael',
        name: 'Raphael (Self-Portrait)',
        short: 'Raphael',
        role: 'Painter & architect · perspective, synthesis, humanism',
        summary: 'At just 26 years old, Raphael designed this Vatican fresco to unite philosophy, mathematics, astronomy, and visual art in one coherent architectural illusion.',
        impact: 'By placing himself alongside Euclid and Ptolemy, Raphael claimed that painting is a liberal art of intellect—not merely manual craft.',
        lookfor: 'Tucked beside Ptolemy near the far-right edge in a dark beret, looking quietly and directly out at us.',
        systemLens: 'Self-inclusion transforms the artist into a named thinker inside the conversation.',
        tag: 'Artist in the frame',
        x: 91.5,
        y: 55.5
      },
      {
        id: 'apollo',
        name: 'Statue of Apollo',
        short: 'Apollo',
        role: 'Classical emblem · music, poetry, ideal harmony',
        summary: 'In the left architectural niche stands the marble god Apollo holding his lyre—patron of poetry, music, prophecy, and ordered proportion.',
        impact: 'Renaissance frescoes used classical sculpture motifs as structural signposts telling viewers how to read each side of the room.',
        lookfor: 'High in the sunlit left wall niche above Socrates and Pythagoras, framing Plato’s realm of abstract Forms and poetic inspiration.',
        systemLens: 'Architectural framing acts as metadata: the building itself labels the left wing as Theoretical & Ideal Inquiry.',
        tag: 'Left-wing signpost',
        x: 23.5,
        y: 24
      },
      {
        id: 'athena',
        name: 'Statue of Athena (Minerva)',
        short: 'Athena',
        role: 'Classical emblem · practical wisdom, science, civic craft',
        summary: 'Opposite Apollo stands Athena with spear, helmet, and Gorgon-headed shield—patron of practical wisdom, strategy, geometry, and skilled craft.',
        impact: 'Pairing Apollo and Athena turns the architecture into a visual thesis linking arts and sciences under one vault.',
        lookfor: 'High in the right wall niche above Euclid, Ptolemy, and Raphael, overlooking Aristotle’s empirical wing.',
        systemLens: 'Architecture labels the right wing as Empirical Observation, Measurement, and Applied Craft.',
        tag: 'Right-wing signpost',
        x: 79,
        y: 24
      }
    ]
  },

  'last-supper': {
    id: 'last-supper',
    title: 'The Last Supper',
    artist: 'Leonardo da Vinci',
    year: 'c. 1495–1498',
    image: '../../assets/thumbs/the-last-supper-web.jpg',
    fullImage: '../../assets/thumbs/the-last-supper.jpg',
    width: 900,
    height: 489,
    initialId: 'ls-jesus',
    tip: 'Click Jesus at the geometric vanishing point, then compare how the four groups of three apostles ripple outward in emotion.',
    hasGuide: true,
    figures: [
      {
        id: 'ls-jesus',
        name: 'Jesus',
        short: 'Jesus',
        role: 'Central figure · revelation, calm axis, sacrifice',
        summary: 'Leonardo captures the exact second after Jesus declares, "One of you will betray me." Surrounded by agitation, his still triangular posture steadies the room.',
        impact: 'Broke centuries of stiff, symmetrical supper paintings by fusing Renaissance linear perspective with human psychological drama.',
        lookfor: 'Every receding ceiling coffer and wall tapestry converges at Jesus’s right temple, while the bright central window frames his head like a natural halo.',
        systemLens: 'A single geometric focal point organizes twelve agitated personalities into a single legible moment.',
        tag: 'Perspective axis',
        x: 50.5,
        y: 53
      },
      {
        id: 'ls-left-group',
        name: 'Bartholomew, James the Less & Andrew',
        short: 'Left Triad',
        role: 'First triad · disbelief, rising energy, protest',
        summary: 'At the far left end of the table, these three disciples lean in sharply toward the center, raising hands in shock and demanding who could be meant.',
        impact: 'Demonstrates Leonardo’s notebooks on "the motions of the mind": posture and hand angles communicate spoken words without a caption.',
        lookfor: 'Bartholomew stands abruptly with both palms pressed on the tablecloth while Andrew raises open palms in protest.',
        systemLens: 'Triad 1 opens the left wave of reaction and directs viewer eyes straight back toward Christ.',
        tag: 'Triad 1 · Shock',
        x: 18,
        y: 55
      },
      {
        id: 'ls-judas',
        name: 'Judas Iscariot',
        short: 'Judas',
        role: 'Betrayer · shadow, withdrawal, ruptured trust',
        summary: 'Earlier artists often isolated Judas on the front side of the table to mark him as a villain. Leonardo seats him beside the others—separated instead by shadow and recoil.',
        impact: 'Transformed betrayal from a cardboard label into an unsettling, human study of guilt inside an intimate community.',
        lookfor: 'Leaning back into shadow just left of John, gripping a small money bag while his elbow accidentally tips over the salt cellar.',
        systemLens: 'Iconography shifts from literal seating separation to subtle lighting, posture, and symbol.',
        tag: 'Shadow & recoil',
        x: 31,
        y: 57
      },
      {
        id: 'ls-peter',
        name: 'Peter',
        short: 'Peter',
        role: 'Disciple · fierce loyalty, impulse, future leadership',
        summary: 'Peter surges forward behind Judas, pressing one hand onto John’s shoulder as if demanding to know the traitor’s name right away.',
        impact: 'Captures both Peter’s protective devotion and the impulsiveness that makes him one of the narrative’s sharpest characters.',
        lookfor: 'Notice his white beard leaning right between Judas and John—and his right hand awkwardly tucked behind his hip holding a table knife.',
        systemLens: 'Visual foreshadowing: the knife quietly anticipates the confrontation in the garden later that night.',
        tag: 'Urgent loyalty',
        x: 33.5,
        y: 54
      },
      {
        id: 'ls-john',
        name: 'John',
        short: 'John',
        role: 'Beloved disciple · grief, stillness, inwardness',
        summary: 'Youthful and serene, John tilts his head away from the turbulence around him with clasped hands, forming a V-shaped void beside Jesus.',
        impact: 'That open gap between John and Jesus visually amplifies Jesus’s solitude even in a crowded room.',
        lookfor: 'Dressed in soft rose and blue, bowing gently toward Peter’s urgent whisper.',
        systemLens: 'Negative space is an active compositional tool—silence beside urgency.',
        tag: 'Quiet contrast',
        x: 37,
        y: 55
      },
      {
        id: 'ls-thomas',
        name: 'Thomas',
        short: 'Thomas',
        role: 'Disciple · questioning, forensic doubt',
        summary: 'Leaning around James the Greater, Thomas lifts a single vertical index finger—a gesture of interrogation and verification.',
        impact: 'Links this meal directly to Thomas’s later insistence on visible, touchable proof.',
        lookfor: 'Look immediately to the viewer’s right of Jesus’s haloed window silhouette for the raised finger pointing upward.',
        systemLens: 'Gesture acts as character shorthand that viewers trained in biblical literacy read instantly.',
        tag: 'Inquiry & doubt',
        x: 58,
        y: 52
      },
      {
        id: 'ls-james-major',
        name: 'James the Greater',
        short: 'James',
        role: 'Disciple · astonishment, theatrical openness',
        summary: 'James flings both arms wide across his chest in dismay, visually anchoring the start of the third triad.',
        impact: 'His horizontal spread balances the quieter triangular stillness of Jesus directly beside him.',
        lookfor: 'Wearing olive-gold robes immediately right of Jesus, arms flung wide as Thomas peers over his shoulder.',
        systemLens: 'Emotional volume peaks right next to the calm center, maximizing dramatic contrast.',
        tag: 'Open shock',
        x: 60.5,
        y: 55
      },
      {
        id: 'ls-philip',
        name: 'Philip',
        short: 'Philip',
        role: 'Disciple · earnest self-examination',
        summary: 'Philip rises slightly from his bench and presses both hands to his heart, asking the silent question: "Lord, is it I?"',
        impact: 'Shows Leonardo’s careful study of how grief and self-doubt look different from anger or suspicion.',
        lookfor: 'Standing cleanly in rose-orange robes on the right side of Triad 3, leaning earnestly back toward Jesus.',
        systemLens: 'Every member of the triad turns inward toward the center despite physical distance.',
        tag: 'Self-inquiry',
        x: 64.5,
        y: 51
      },
      {
        id: 'ls-right-group',
        name: 'Matthew, Jude Thaddeus & Simon',
        short: 'Right Triad',
        role: 'Fourth triad · debate, conference, ripple outward',
        summary: 'At the right end of the table, Matthew turns sharply away from Jesus to confer with Thaddeus and the elder Simon, bringing the wave of rumor to the wall.',
        impact: 'Turns a painted wall inside a Milanese monks’ dining hall into an extension of the room itself—the monks ate below it every day.',
        lookfor: 'Matthew’s arms reach back toward Christ while his head turns toward Simon, tying the outer edge back to the center.',
        systemLens: 'Notice the doorway cut later at the bottom center (1652): physical architecture alters even iconic works over time.',
        tag: 'Triad 4 · Debate',
        x: 83,
        y: 54
      }
    ]
  },

  bosch: {
    id: 'bosch',
    title: 'Adoration of the Magi (Bosch Tradition)',
    artist: 'Follower of Hieronymus Bosch',
    year: 'c. 1515',
    image: '../../assets/thumbs/adoration-of-the-magi-bosch.jpg',
    width: 706,
    height: 900,
    initialId: 'mary',
    tip: 'Compare the kneeling Magi and the Virgin with the strange figure in the hut doorway and the onlookers perched on the roof.',
    hasGuide: false,
    figures: [
      {
        id: 'mary',
        name: 'Mary',
        short: 'Mary',
        role: 'Mother of Jesus · devotion, humility, sacred seat',
        summary: 'Framed in a deep emerald-green mantle beneath a crumbling thatched stable, Mary presents the newborn Christ Child with calm composure.',
        impact: 'By setting royal splendor inside a decaying wooden shelter, the Bosch tradition contrasts earthly permanence with spiritual renewal.',
        lookfor: 'A delicate golden halo radiates around her head while she sits slightly right of center, stabilizing the vertical axis.',
        systemLens: 'Notice how status works visually: the simplest shelter holds the highest spiritual focus.',
        tag: 'Sacred anchor',
        x: 70.5,
        y: 58
      },
      {
        id: 'christ-child',
        name: 'Christ Child',
        short: 'Christ Child',
        role: 'Infant Jesus · focal destination of tribute',
        summary: 'Tiny and vulnerable on his mother’s lap, the child nevertheless draws every gaze, gift, and bending knee in the foreground.',
        impact: 'Visualizes a radical inversion of power: kings lay down crowns and gifts before an infant.',
        lookfor: 'Look at the ground near Mary’s robe for the ornate crowns and metallic vessels already set down in deference.',
        systemLens: 'Authority flows from recognition rather than display—the smallest figure governs the scene.',
        tag: 'Center of tribute',
        x: 66,
        y: 66
      },
      {
        id: 'old-king',
        name: 'Eldest Magus (Melchior)',
        short: 'Eldest Magus',
        role: 'Senior king · humility, reverence, gold',
        summary: 'Dressed in heavy crimson folds, the eldest Magus kneels closest to the child in deep prayer, having removed his regal headpiece.',
        impact: 'Models how earthly seniority bows before sacred truth in Northern Renaissance devotional art.',
        lookfor: 'Positioned front and center in red velvet, with an ornate gold vessel and helmet-crown resting on the dirt beside him.',
        systemLens: 'Clothing color (crimson) and kneeling posture quickly signal both royal rank and voluntary submission.',
        tag: 'Reverence',
        x: 48.5,
        y: 73
      },
      {
        id: 'middle-king',
        name: 'Middle Magus (Caspar)',
        short: 'Second King',
        role: 'Royal visitor · diplomacy, tribute, witness',
        summary: 'Just behind the kneeling elder, the second king holds a shallow golden plate of tribute while gazing earnestly toward the infant.',
        impact: 'Balances the composition between the standing Moorish king at left and the kneeling elder below.',
        lookfor: 'Look for his patterned jeweled collar gleaming softly against the dim stable interior.',
        systemLens: 'Three generations of rulers form an ascending staircase of attention toward Mary and the child.',
        tag: 'Courtly tribute',
        x: 43,
        y: 63
      },
      {
        id: 'young-king',
        name: 'Young Magus (Balthazar)',
        short: 'Balthazar',
        role: 'African king · global reach, dignified presence',
        summary: 'Standing tall at left in luminous ivory-white robes, Balthazar represents the extension of the Epiphany narrative across the wider world beyond Europe.',
        impact: 'In late medieval and Renaissance Europe, including a richly robed African king gave communities a visual map of a universal, multi-continental faith.',
        lookfor: 'Cradling a spherical silver-white orb topped with a bird or finial, dressed in crisp pleated white silk that catches the brightest light.',
        systemLens: 'Iconography encodes geography: the three Magi symbolize the three continents then mapped by European scholars.',
        tag: 'Global reach',
        x: 16.5,
        y: 59
      },
      {
        id: 'page-left',
        name: 'Attendant Page',
        short: 'Attendant',
        role: 'Retinue figure · procession, youth, social rank',
        summary: 'A young attendant in red tunic stands behind Balthazar, holding the trailing hem and reminding viewers that rulers travel with households and retainers.',
        impact: 'Even small background attendants reveal how Renaissance painters imagined royal logistics and hierarchy.',
        lookfor: 'Tucked quietly along the far-left margin behind Balthazar’s white cloak.',
        systemLens: 'Secondary figures expand a devotional scene into a believable social procession.',
        tag: 'Retinue & scale',
        x: 9,
        y: 73
      },
      {
        id: 'doorway-figure',
        name: 'Enigmatic Doorway Figure (Debated)',
        short: 'Doorway Figure',
        role: 'Mysterious onlooker · Bosch’s signature tension',
        summary: 'Framed inside the narrow hut doorway stands an exotic, brightly dressed figure crowned with a high turban and peeking alongside shadowy onlookers—a hallmark motif from Bosch’s Prado Adoration.',
        impact: 'Art historians actively debate this figure: some read him as a rival messiah or Antichrist watching from the shadows, others as Herod’s scout or an unredeemed bystander.',
        lookfor: 'Peer into the wooden door frame just left of the middle king: notice the tall striped robe, high jeweled turban, and curious faces pressed behind him.',
        systemLens: 'Shows why Bosch’s world is never simple: even a sacred celebration contains tension, doubt, and hidden scrutiny.',
        tag: 'Scholarly mystery',
        x: 33,
        y: 59
      },
      {
        id: 'shepherds-roof',
        name: 'Shepherds on the Roof & Beams',
        short: 'Shepherds',
        role: 'Rustic onlookers · curiosity, class contrast',
        summary: 'Two shepherds sprawl across the sagging thatch roof while others climb a gnarled tree trunk on the right to catch a glimpse of the royal visitors below.',
        impact: 'Bridges high courtly ceremony and ordinary rural labor in a single frame—often with Bosch’s gentle humor.',
        lookfor: 'Look high on the sloped thatch above Mary’s halo and along the ladder-like timber post at the right border.',
        systemLens: 'Every gathering has insiders and outsiders: look at who gets a seat in front and who has to climb the roof.',
        tag: 'Rustic onlookers',
        x: 64,
        y: 39
      },
      {
        id: 'star-city',
        name: 'Star & Distant Jerusalem Skyline',
        short: 'Star & City',
        role: 'Cosmic sign & civic backdrop · prophecy and power',
        summary: 'At the top of the panel, golden rays drop from a faint star toward the stable beneath a sweeping horizon of fantastical domed towers and winding roads.',
        impact: 'Connects cosmic astronomy (the guiding star) with political geography (the distant city of kings and priests).',
        lookfor: 'Trace the diagonal rays descending from the faint star above the central spire down toward the broken peak of the stable roof.',
        systemLens: 'Background landscape in Northern painting is never mere scenery—it maps the moral distance between worldly cities and humble devotion.',
        tag: 'Skyline & sign',
        x: 46,
        y: 12
      }
    ]
  },

  ambassadors: {
    id: 'ambassadors',
    title: 'The Ambassadors',
    artist: 'Hans Holbein the Younger',
    year: '1533',
    image: '../../assets/thumbs/the-ambassadors-holbein-web.jpg',
    width: 900,
    height: 887,
    initialId: 'dinteville',
    tip: 'Compare the two French diplomats, inspect the shelf instruments, then test the Anamorphic Skull Lab below.',
    hasGuide: true,
    figures: [
      {
        id: 'dinteville',
        name: 'Jean de Dinteville',
        short: 'Dinteville',
        role: 'French ambassador · secular power, courtly wealth',
        summary: 'Age 29 and French envoy to King Henry VIII’s court in London, Dinteville commissioned this life-size double portrait at a moment of acute political and religious crisis.',
        impact: 'Turns personal portraiture into political intelligence: Dinteville’s jewelry, fur, and dagger advertise French aristocratic prestige.',
        lookfor: 'Dressed in black velvet, pink satin, and white lynx fur, holding a golden dagger engraved with his age ("AET. SVAE 29") and wearing the French Order of St. Michael.',
        systemLens: 'Clothing and posture operate as state messaging in Tudor-era diplomacy.',
        tag: 'Secular diplomacy',
        x: 24.5,
        y: 17
      },
      {
        id: 'deselve',
        name: 'Georges de Selve',
        short: 'de Selve',
        role: 'Bishop of Lavaur · learning, restraint, mediation',
        summary: 'Age 25 and newly consecrated bishop, de Selve visited London secretly while serving as a diplomat trying to mediate between Catholics and Protestants.',
        impact: 'Together, soldier-courtier and scholar-bishop symbolize Europe’s effort to hold spiritual and political authority in balance.',
        lookfor: 'Resting his elbow calmly on a closed book inscribed with his age ("25") in dark brown damask fur—deliberately quieter than Dinteville’s bright satin.',
        systemLens: 'Left and right figures create a deliberate contrast between active court power and reflective counsel.',
        tag: 'Scholar-bishop',
        x: 84.5,
        y: 18
      },
      {
        id: 'crucifix',
        name: 'Hidden Silver Crucifix',
        short: 'Crucifix',
        role: 'Half-veiled faith · counterpoint to earthly pride',
        summary: 'Tucked in the top-left corner behind the parted green damask curtain hangs a tiny silver crucifix—easy to miss until you scan the borders.',
        impact: 'Anchors an invisible diagonal straight across the painting to the distorted skull below, hinting that grace awaits beyond mortal time.',
        lookfor: 'Look at the extreme upper-left margin where the green curtain folds slightly back to reveal half of a carved cross.',
        systemLens: 'A painting’s margin can rewrite its center: hidden details ask who the true intended viewer is.',
        tag: 'Hidden counterweight',
        x: 2.5,
        y: 6
      },
      {
        id: 'celestial-globe',
        name: 'Celestial Globe',
        short: 'Sky Globe',
        role: 'Astronomy tool · mapping constellations and heavens',
        summary: 'Set to the sky as seen around northern Europe, this miniature celestial sphere shows constellations etched with Latin labels and crisp brass meridian rings.',
        impact: 'Signals that early modern statecraft depended on new astronomical instruments for navigation, calendars, and global authority.',
        lookfor: 'Resting at the left end of the upper shelf draped with an Anatolian silk carpet, right beside Dinteville’s crimson sleeve.',
        systemLens: 'Upper shelf = Quadrivium study of the heavens (fixed, mathematical order).',
        tag: 'Heavenly measure',
        x: 43,
        y: 23
      },
      {
        id: 'sundials',
        name: 'Sundials, Quadrant & Torquetum',
        short: 'Dials',
        role: 'Timekeeping & sighting gear · precision measurement',
        summary: 'Across the middle of the upper shelf sit a cylindrical shepherd’s dial, a polyhedral sundial, a brass quadrant, and a complex torquetum for reading celestial angles.',
        impact: 'Holbein’s uncanny precision proves artists and instrument makers shared the same optical, geometric culture.',
        lookfor: 'Notice how the polyhedral dial displays the exact date and time—reportedly April 11, 1533, Good Friday—though several dials slightly disagree.',
        systemLens: 'Even the best scientific tools do not automatically yield harmony when human institutions fracture.',
        tag: 'Measured time',
        x: 59,
        y: 29
      },
      {
        id: 'terrestrial-globe',
        name: 'Terrestrial Globe',
        short: 'Earth Globe',
        role: 'Geography & empire · France, Rome, and the Americas',
        summary: 'On the lower shelf sits a terrestrial globe turned toward Europe, clearly marking Polisy (Dinteville’s family estate in France) alongside Rome and the Atlantic.',
        impact: 'Maps the intersection of local estate pride, European diplomacy, and overseas exploration.',
        lookfor: 'Compare this lower earth globe directly underneath the upper celestial globe—mirroring Raphael’s pairing of Ptolemy and Zoroaster.',
        systemLens: 'Lower shelf = earthly affairs, travel, commerce, and human conflict.',
        tag: 'Earthly geography',
        x: 45,
        y: 59
      },
      {
        id: 'arithmetic-book',
        name: 'Merchant’s Arithmetic Book',
        short: 'Arithmetic',
        role: 'Commerce & division · Peter Apian’s textbook',
        summary: 'Peter Apian’s 1527 arithmetic book for merchants lies propped open by a carpenter’s T-square—specifically on the page beginning with the German word "Dividirt" ("Let division be made").',
        impact: 'Links rising commercial math to a double pun on political and religious division across Europe in 1533.',
        lookfor: 'Seated directly in front of the terrestrial globe on the lower shelf with a wooden T-square tucked cleanly inside its pages.',
        systemLens: 'Ordinary everyday objects (a business math book!) double as coded political commentary.',
        tag: 'Commercial math & schism',
        x: 45,
        y: 67.5
      },
      {
        id: 'lute',
        name: 'Lute with a Broken String',
        short: 'Broken Lute',
        role: 'Musical emblem · fragile harmony, snapped discord',
        summary: 'A sculpted wooden lute rests prominently across the lower shelf, meticulously foreshortened—but one string has snapped and curls loose across the belly.',
        impact: 'In Renaissance diplomacy, a lute represented concord among rulers; a snapped string signaled Europe breaking apart.',
        lookfor: 'Zoom in or use the loupe on the soundboard and bridge to spot the thin curled string hanging loose.',
        systemLens: 'Tiny deliberate flaws break perfection to encode crisis.',
        tag: 'Discord emblem',
        x: 66,
        y: 59
      },
      {
        id: 'lutheran-hymnal',
        name: 'Lutheran Hymnal',
        short: 'Hymnal',
        role: 'Reformation text · vernacular print and split worship',
        summary: 'Resting open under the lute’s neck is Johann Walter’s 1524 Lutheran hymnal, displaying legible German words and four-part musical notation—a remarkable inclusion in a painting for Catholic French envoys.',
        impact: 'Demonstrates how movable-type printing turned music and theology into forces reshaping European diplomacy.',
        lookfor: 'Open wide on the lower shelf right beside the lute’s fretted neck and the wooden flute case.',
        systemLens: 'Print culture enters the oil portrait as tangible historical evidence.',
        tag: 'Reformation print',
        x: 61,
        y: 66.5
      },
      {
        id: 'flutes',
        name: 'Case of Flutes (One Missing)',
        short: 'Flutes',
        role: 'Ensemble music · incomplete harmony',
        summary: 'A leather case holds four wooden recorders—with a fifth empty slot visibly gaping open.',
        impact: 'Reinforces the broken lute string right above it: an ensemble missing a voice cannot finish its chord.',
        lookfor: 'Lying tucked into the lower-right corner of the shelf beside the open Lutheran hymnal.',
        systemLens: 'Repetition strengthens visual argument: broken string + missing flute + "Dividirt" page all say the same thing.',
        tag: 'Missing voice',
        x: 70,
        y: 69
      },
      {
        id: 'skull',
        name: 'Anamorphic Skull (Memento Mori)',
        short: 'Skull',
        role: 'Optical puzzle · perspective, illusion, mortality',
        summary: 'Slashing diagonally across the inlaid Westminster Abbey marble floor is an elongated blur—until you step far to the painting’s right edge and look back across the canvas.',
        impact: 'Turns perspective math itself into a philosophical lesson: what looks like an unintelligible smear straight on becomes the clearest truth (mortality) from a different angle.',
        lookfor: 'Try the interactive Anamorphic Viewing-Angle Lab right below this painting to rotate and foreshorten the skull from 0° to 82°.',
        systemLens: 'Perception depends on vantage point; changing geometry reveals hidden meaning.',
        tag: 'Anamorphic puzzle',
        x: 49,
        y: 86
      }
    ]
  },

  cana: {
    id: 'cana',
    title: 'The Wedding Feast at Cana',
    artist: 'Paolo Veronese',
    year: '1562–1563',
    image: '../../assets/thumbs/wedding-feast-cana-web.jpg',
    fullImage: '../../assets/thumbs/wedding-feast-cana.jpg',
    width: 900,
    height: 611,
    initialId: 'cana-jesus',
    tip: 'Find calm Jesus and Mary in the crowd, look directly above Jesus to the balcony carver, then inspect the musicians and pouring servants.',
    hasGuide: true,
    figures: [
      {
        id: 'cana-jesus',
        name: 'Jesus',
        short: 'Jesus',
        role: 'Central sacred figure · quiet miracle amid spectacle',
        summary: 'Painted for a Benedictine monastery dining hall in Venice, this colossal canvas (nearly 10 meters wide!) seats more than 130 guests—yet Jesus sits quietly dead center, looking straight out.',
        impact: 'Demonstrates how scale and color contrast can isolate a calm center inside maximum visual chaos.',
        lookfor: 'Framed directly between the two open staircases of the balustrade with a subtle halo behind his head.',
        systemLens: 'Even when surrounded by 130 bustling figures, central symmetry and calm posture keep Jesus unmistakably anchored.',
        tag: 'Quiet axis',
        x: 50.5,
        y: 62.5
      },
      {
        id: 'cana-mary',
        name: 'Mary',
        short: 'Mary',
        role: 'Mother of Jesus · attention, intercession, witness',
        summary: 'Seated immediately to Jesus’s right (viewer’s left), Mary quietly alerts him that the hosts have run out of wine—prompting the miracle described in the Gospel of John.',
        impact: 'Shows how hospitality failures carried real social shame in ancient Mediterranean life, giving the miracle both human and sacred stakes.',
        lookfor: 'Dressed in deep slate blue with a veil, leaning softly beside Jesus while holding a tiny invisible glass between her fingers.',
        systemLens: 'Notice the small gesture: an empty hand signals the shortage driving the story.',
        tag: 'Intercessor',
        x: 44.5,
        y: 62.5
      },
      {
        id: 'cana-groom',
        name: 'Bridegroom',
        short: 'Groom',
        role: 'Ceremonial host · Venetian attire, civic display',
        summary: 'Rather than painting ancient Galilee costumes, Veronese dresses the wedding couple and aristocratic guests in shimmering 16th-century Venetian silks, furs, and jewels.',
        impact: 'Makes clear that Renaissance sacred art often held a mirror directly up to its own city’s wealth, fashion, and diplomacy.',
        lookfor: 'Seated at the extreme far-left head of the U-shaped table in red velvet trimmed with gold.',
        systemLens: 'Putting contemporary Venetian elites at a biblical table places the viewer’s own society inside sacred history.',
        tag: 'Civic host',
        x: 4,
        y: 71
      },
      {
        id: 'cana-bride',
        name: 'Bride',
        short: 'Bride',
        role: 'Ceremonial host · social alliance, celebration',
        summary: 'Seated beside the groom in pearled white brocade, the bride marks the public social contract uniting two prominent families.',
        impact: 'Contrast her prominent left-edge placement with Christ’s quiet center: the wedding is the occasion, but not the painting’s true axis.',
        lookfor: 'Next to the groom on the left wing, framed by attentive servants and richly dressed nobility.',
        systemLens: 'Dual centers: social rank sits at the head table, while spiritual power occupies the architectural center.',
        tag: 'Social alliance',
        x: 7.5,
        y: 70
      },
      {
        id: 'cana-musicians',
        name: 'Venetian Painter-Musicians',
        short: 'Musicians',
        role: 'Veronese, Titian, Tintoretto & Bassano · self-portrait & time',
        summary: 'Right in front of Jesus plays an ensemble of viols and lute—traditionally identified as four giant Venetian painters including Veronese himself in white silk and Titian in red at the cello-like violone.',
        impact: 'Like Raphael in The School of Athens, Venetian painters claim intellectual and cultural kinship inside a grand historical spectacle.',
        lookfor: 'Look at the small table between the two front musicians: beside sheet music sits an hourglass—a quiet reminder of passing time amidst luxury.',
        systemLens: 'An hourglass at a feast plays the same role as Holbein’s skull: time ticks beneath celebration.',
        tag: 'Artists & hourglass',
        x: 43,
        y: 74
      },
      {
        id: 'cana-steward',
        name: 'Steward (Master of the Feast)',
        short: 'Steward',
        role: 'Quality judge · hierarchy, civic oversight',
        summary: 'Standing tall at right-center in patterned gold-and-green brocade, the steward lifts a crystal glass of wine toward the light in surprise at its richness.',
        impact: 'Shows how large social rituals depend on managers and evaluators who authenticate what happens.',
        lookfor: 'Look for his dramatic standing figure near the right foreground examining the newly poured red wine.',
        systemLens: 'Acts as the viewer’s on-scene witness verifying that the transformation actually happened.',
        tag: 'Evaluator',
        x: 69,
        y: 69
      },
      {
        id: 'cana-servants',
        name: 'Servants & Stone Amphorae',
        short: 'Servants',
        role: 'Invisible labor · logistics enabling the miracle',
        summary: 'While seated dignitaries converse, servants hustle across balconies, balance platters on stairs, and tip heavy stone water jars to pour red wine.',
        impact: 'In Gospel accounts, only the servants truly know where the wine came from—making working people the earliest witnesses of the miracle.',
        lookfor: 'In the lower-right corner, a servant in pale yellow leans over a huge stoneware jar, pouring newly transformed wine into a brass pitcher.',
        systemLens: 'A society’s spectacles look effortless only because labor keeps water, food, and vessels moving.',
        tag: 'Labor & witness',
        x: 77,
        y: 83
      },
      {
        id: 'cana-carver',
        name: 'Butcher Carving Above Christ',
        short: 'Balcony Carver',
        role: 'Hidden foreshadowing · sacrificial lamb motif',
        summary: 'High on the marble balustrade directly over Jesus’s head, a servant raises a cleaver over a slab of meat—an unsettling detail placed on the canvas’s exact vertical centerline.',
        impact: 'Reveals how Renaissance artists wove theological foreshadowing into everyday kitchen labor: the banquet points ahead to the Lamb of sacrifice.',
        lookfor: 'Follow a straight vertical line from the musicians’ hourglass up through Jesus to the stone balcony above him.',
        systemLens: 'Vertical alignment creates a hidden visual essay running right through the horizontal party.',
        tag: 'Vertical foreshadowing',
        x: 50.5,
        y: 46
      },
      {
        id: 'cana-architecture',
        name: 'Palladian Stage & Spectators',
        short: 'Stage',
        role: 'Architectural theater · Venice as a civic stage',
        summary: 'Gleaming Corinthian columns, marble terraces, and a bell tower straight out of Andrea Palladio’s Venetian architecture turn a private feast into a monumental public plaza.',
        impact: 'Demonstrates how architecture sets the emotional scale of an event before a single character speaks.',
        lookfor: 'Scan the upper balconies and cornices—figures even lean down from ledges and columns to watch the feast unfold below.',
        systemLens: 'Architecture elevates hospitality into civic monumentality.',
        tag: 'Civic theater',
        x: 60,
        y: 24
      }
    ]
  },

  solvay: {
    id: 'solvay',
    title: 'Fifth Solvay International Conference on Physics',
    artist: 'Benjamin Couprie (photographer)',
    year: 'October 1927',
    image: '../../assets/thumbs/solvay-conference-1927.jpg',
    width: 900,
    height: 651,
    initialId: 'einstein',
    tip: 'Use the Row and Nobel filters below to trace how 29 scientists—17 of them Nobel laureates—shaped quantum physics in one frame.',
    hasGuide: false,
    filters: [
      { id: 'all', label: 'All 29 Scientists' },
      { id: 'front', label: 'Front Row (9)' },
      { id: 'middle', label: 'Middle Row (9)' },
      { id: 'back', label: 'Back Row (11)' },
      { id: 'nobel', label: 'Nobel Laureates (17)' }
    ],
    figures: [
      {
        id: 'langmuir',
        name: 'Irving Langmuir',
        short: 'Langmuir',
        row: 'front',
        nobel: 'Chemistry 1932',
        role: 'Chemist & physicist · surface chemistry, plasma science',
        summary: 'Langmuir studied monomolecular films on surfaces, incandescent lamps, and ionized gases—coining the word "plasma" in physics.',
        impact: 'Bridge between industrial laboratory chemistry (General Electric) and fundamental atomic physics.',
        lookfor: 'Front row, far left, seated beside Max Planck with a walking cane.',
        systemLens: 'Shows how corporate research labs sat alongside university theorists at the frontier of 1920s physics.',
        tag: 'Front row · Surface science',
        x: 9,
        y: 54
      },
      {
        id: 'planck',
        name: 'Max Planck',
        short: 'Planck',
        row: 'front',
        nobel: 'Physics 1918',
        role: 'Theoretical physicist · founder of quantum theory',
        summary: 'In 1900 Planck proposed that glowing matter emits energy only in discrete packets (quanta), solving the blackbody radiation puzzle and launching quantum physics.',
        impact: 'Planck’s constant h remains one of the bedrock measurements defining the scale of the universe.',
        lookfor: 'Front row, second from left, holding a felt hat in his lap.',
        systemLens: 'Sits among the elder statesmen whose reluctant 1900 breakthrough the young theorists in the back row turned into a revolution.',
        tag: 'Front row · Quantum origin',
        x: 19.5,
        y: 55
      },
      {
        id: 'curie',
        name: 'Marie Curie',
        short: 'Curie',
        row: 'front',
        nobel: 'Physics 1903 · Chemistry 1911',
        role: 'Physicist & chemist · radioactivity pioneer',
        summary: 'Curie discovered polonium and radium, coined "radioactivity," and became the first person—and only scientist in this photo—to win Nobel Prizes in two different sciences.',
        impact: 'Established nuclear physics and radiation medicine while breaking institutional barriers in European academies.',
        lookfor: 'Front row near center-left, seated between Planck and Lorentz—the sole woman among 29 delegates.',
        systemLens: 'Makes inclusion and exclusion instantly visible: a towering pioneer seated inside an otherwise all-male gathering.',
        tag: 'Front row · Double laureate',
        x: 30,
        y: 55
      },
      {
        id: 'lorentz',
        name: 'Hendrik Lorentz',
        short: 'Lorentz',
        row: 'front',
        nobel: 'Physics 1902',
        role: 'Theoretical physicist · electromagnetism, conference chair',
        summary: 'Lorentz formulated electron theory and the Lorentz transformations later woven into Einstein’s special relativity. He chaired the 1927 Solvay Conference with famed tact.',
        impact: 'Created the diplomatic and mathematical bridge connecting 19th-century classical physics to 20th-century relativity and quantum mechanics.',
        lookfor: 'Front row immediately left of Einstein, white-bearded and holding his hat—the senior conference president.',
        systemLens: 'Scientific conferences require skilled moderators who keep bitter theoretical rivals talking.',
        tag: 'Front row · Conference chair',
        x: 41,
        y: 56
      },
      {
        id: 'einstein',
        name: 'Albert Einstein',
        short: 'Einstein',
        row: 'front',
        nobel: 'Physics 1921',
        role: 'Theoretical physicist · relativity, light quanta, debate',
        summary: 'Einstein revolutionized gravity and light quanta—yet at Solvay 1927 he mounted daily thought-experiment challenges against Bohr’s probabilistic quantum mechanics.',
        impact: 'His persistent objections forced quantum theorists to sharpen ideas like entanglement and measurement that underpin today’s quantum technologies.',
        lookfor: 'Seated dead center in the front row looking straight into the lens, framed like Plato or Jesus in a Renaissance composition.',
        systemLens: 'Central placement reflects both unmatched fame and his role as the philosophical counterweight of the 1927 meeting.',
        tag: 'Front row · Center axis',
        x: 54.5,
        y: 54.5
      },
      {
        id: 'langevin',
        name: 'Paul Langevin',
        short: 'Langevin',
        row: 'front',
        role: 'Physicist · magnetism, sonar, French science mentor',
        summary: 'Langevin advanced paramagnetism, ultrasonic echo-location (early sonar), and popularized relativity across France while championing Louis de Broglie’s thesis.',
        impact: 'Mentored and defended young French theorists and led later Solvay councils.',
        lookfor: 'Front row immediately to Einstein’s right (viewer’s right), wearing a neat bow tie and mustache.',
        systemLens: 'Mentorship network: without advocates like Langevin, bold PhD theses like de Broglie’s might stall.',
        tag: 'Front row · Mentor & acoustics',
        x: 63.5,
        y: 55
      },
      {
        id: 'guye',
        name: 'Charles-Eugène Guye',
        short: 'Guye',
        row: 'front',
        role: 'Experimental physicist · electron mass and precision tests',
        summary: 'A Swiss experimentalist from Geneva, Guye spent years measuring high-speed electrons to confirm Einstein’s relativistic mass-velocity predictions.',
        impact: 'Proved that bold equations survive only when delicate lab instruments confirm them.',
        lookfor: 'Front row right of Langevin, white mustache and formal wing collar.',
        systemLens: 'Represents precision experimentation anchoring abstract theory.',
        tag: 'Front row · Precision tests',
        x: 72,
        y: 54.5
      },
      {
        id: 'wilson',
        name: 'C. T. R. Wilson',
        short: 'Wilson',
        row: 'front',
        nobel: 'Physics 1927',
        role: 'Experimental physicist · cloud chamber inventor',
        summary: 'Inspired by watching mountain mist in Scotland, Wilson built the cloud chamber—making invisible paths of cosmic rays and subatomic particles appear as delicate vapor trails.',
        impact: 'Just weeks after this photograph, Wilson shared the 1927 Nobel Prize in Physics with Arthur Compton.',
        lookfor: 'Front row second from right, seated with arms folded calmly across his vest.',
        systemLens: 'New instruments create new evidence: seeing particle tracks ended doubts about whether particles were real.',
        tag: 'Front row · Cloud chamber',
        x: 83,
        y: 55.5
      },
      {
        id: 'richardson',
        name: 'Owen Richardson',
        short: 'Richardson',
        row: 'front',
        nobel: 'Physics 1928',
        role: 'Physicist · thermionic emission, vacuum electronics',
        summary: 'Richardson explained how electrons boil off heated metals—the physical foundation behind radio vacuum tubes, early amplifiers, and cathode-ray screens.',
        impact: 'Linked atomic physics straight into 20th-century broadcasting and computing hardware.',
        lookfor: 'Front row far right, seated with legs crossed and hat resting on his knee.',
        systemLens: 'Connects fundamental physics conferences to everyday electronics.',
        tag: 'Front row · Electronics',
        x: 91,
        y: 57
      },
      {
        id: 'debye',
        name: 'Peter Debye',
        short: 'Debye',
        row: 'middle',
        nobel: 'Chemistry 1936',
        role: 'Physical chemist · molecular dipoles, X-ray powder diffraction',
        summary: 'Debye revealed how electric charges distribute inside molecules and developed methods to read crystal structure from powdered X-ray patterns.',
        impact: 'Gave chemistry and materials engineering quantitative tools to map invisible molecular bonds.',
        lookfor: 'Middle row, extreme far left, standing slightly forward at the edge of the group.',
        systemLens: 'Chemistry and physics merge when studying atoms and crystals.',
        tag: 'Middle row · Molecular structure',
        x: 6,
        y: 50
      },
      {
        id: 'knudsen',
        name: 'Martin Knudsen',
        short: 'Knudsen',
        row: 'middle',
        role: 'Danish physicist · low-pressure gases, oceanography',
        summary: 'Knudsen studied how individual gas molecules bounce inside ultra-high vacuums, defining the Knudsen number still used in aerospace and microchip manufacturing.',
        impact: 'His vacuum physics enabled precision particle beams and modern semiconductor fabrication.',
        lookfor: 'Middle row, second from left, standing directly behind Langmuir and Planck.',
        systemLens: 'Shows the long-term legacy of quiet foundational fluid and vacuum measurement.',
        tag: 'Middle row · Gas kinetics',
        x: 15,
        y: 51.5
      },
      {
        id: 'bragg',
        name: 'William Lawrence Bragg',
        short: 'W. L. Bragg',
        row: 'middle',
        nobel: 'Physics 1915',
        role: 'Physicist · X-ray crystallography',
        summary: 'At age 25—still the youngest physics Nobel laureate ever—Bragg derived Bragg’s Law with his father, letting scientists deduce 3D atomic lattices from X-rays.',
        impact: 'Later directed the Cavendish Laboratory where X-ray crystallography uncovered the double-helix structure of DNA.',
        lookfor: 'Middle row, third from left, standing cleanly between Planck and Marie Curie.',
        systemLens: 'A mathematical wave rule from 1912 later unlocked the blueprint of life in 1953.',
        tag: 'Middle row · Crystallography',
        x: 25,
        y: 50
      },
      {
        id: 'kramers',
        name: 'Hendrik Kramers',
        short: 'Kramers',
        row: 'middle',
        role: 'Theoretical physicist · optical dispersion, Bohr’s deputy',
        summary: 'Working closely with Niels Bohr in Copenhagen, Kramers helped bridge classical correspondence laws to full matrix mechanics and quantum electrodynamics.',
        impact: 'Built key mathematical approximations (WKB, Kramers-Kronig relations) used across optics and engineering.',
        lookfor: 'Middle row, fourth from left, wearing round glasses between Marie Curie and Hendrik Lorentz.',
        systemLens: 'Illustrates the collaborative hub of Bohr’s Copenhagen institute.',
        tag: 'Middle row · Copenhagen school',
        x: 36.5,
        y: 50
      },
      {
        id: 'dirac',
        name: 'Paul Dirac',
        short: 'Dirac',
        row: 'middle',
        nobel: 'Physics 1933',
        role: 'Theoretical physicist · relativistic quantum theory, antimatter',
        summary: 'Dirac unified quantum mechanics with special relativity in 1928—an equation so tight it boldly predicted the existence of antimatter before anyone observed a positron.',
        impact: 'Co-wrote the formal mathematical grammar of quantum physics and inspired PET medical imaging via positrons.',
        lookfor: 'Middle row near center, standing between Lorentz and Einstein with a composed, reserved gaze.',
        systemLens: 'Mathematics here runs ahead of observation—predicting an entire mirror half of matter.',
        tag: 'Middle row · Antimatter',
        x: 48,
        y: 49.5
      },
      {
        id: 'compton',
        name: 'Arthur Compton',
        short: 'Compton',
        row: 'middle',
        nobel: 'Physics 1927',
        role: 'Experimental physicist · X-ray Compton scattering',
        summary: 'Compton bounced X-rays off electrons and showed they recoil like billiard balls—providing decisive experimental proof that light carries particle-like momentum.',
        impact: 'His 1923 experiment helped clinch acceptance of photons after years of skepticism.',
        lookfor: 'Middle row just behind Einstein’s left shoulder (viewer’s right).',
        systemLens: 'Direct experimental counter-argument to pure wave skepticism.',
        tag: 'Middle row · Photons',
        x: 57,
        y: 50
      },
      {
        id: 'debroglie',
        name: 'Louis de Broglie',
        short: 'de Broglie',
        row: 'middle',
        nobel: 'Physics 1929',
        role: 'Theoretical physicist · wave-particle duality of matter',
        summary: 'If light waves can act like particles, de Broglie asked in his 1924 PhD thesis, shouldn’t electrons and matter also travel with a wavelength?',
        impact: 'Confirmed by electron diffraction within three years, matter waves directly inspired Schrödinger’s wave equation and electron microscopes.',
        lookfor: 'Middle row, right of Compton, high-forehead profile above Langevin and Guye.',
        systemLens: 'Symmetry thinking—turning light’s paradox back onto matter—unlocked atomic orbits.',
        tag: 'Middle row · Matter waves',
        x: 66.5,
        y: 50.5
      },
      {
        id: 'born',
        name: 'Max Born',
        short: 'Born',
        row: 'middle',
        nobel: 'Physics 1954',
        role: 'Theoretical physicist · probability interpretation of quantum waves',
        summary: 'Leading the Göttingen physics powerhouse, Born showed that Schrödinger’s wave function measures the probability of finding a particle—not a smeared physical charge.',
        impact: 'Placed statistics and probability at the core of fundamental physics, though his Nobel waited until 1954.',
        lookfor: 'Middle row, second from right, white-haired and standing behind Guye and Wilson.',
        systemLens: 'Debated Einstein by letter for decades over whether nature fundamentally "plays dice."',
        tag: 'Middle row · Probability',
        x: 77,
        y: 50.5
      },
      {
        id: 'bohr',
        name: 'Niels Bohr',
        short: 'Bohr',
        row: 'middle',
        nobel: 'Physics 1922',
        role: 'Theoretical physicist · quantum atom, complementarity',
        summary: 'Architect of the quantum atom and leader of the Copenhagen interpretation, Bohr countered every one of Einstein’s 1927 thought-experiment challenges over breakfast and dinner.',
        impact: 'Framed how physics thinks about measurement, complementarity, and the boundary between observer and observed.',
        lookfor: 'Middle row, far right, standing behind Wilson and Richardson.',
        systemLens: 'Notice the dramatic tension: Einstein sits center front while his chief debating partner stands quietly at the far right.',
        tag: 'Middle row · Complementarity',
        x: 87.5,
        y: 51
      },
      {
        id: 'piccard',
        name: 'Auguste Piccard',
        short: 'Piccard',
        row: 'back',
        role: 'Physicist & explorer · stratosphere balloons, cosmic rays',
        summary: 'Twin brother of Jean Piccard, Auguste designed pressurized aluminum spheres to carry physicists into the stratosphere to measure cosmic rays—and later built deep-sea bathyscaphes.',
        impact: 'Extended laboratory physics into extreme altitudes and ocean trenches.',
        lookfor: 'Back row, far left—easily the tallest figure in the photograph, towering over the left cluster.',
        systemLens: 'Reminds students that physics expands when instruments travel into new environments.',
        tag: 'Back row · Stratosphere',
        x: 16.5,
        y: 37
      },
      {
        id: 'henriot',
        name: 'Émile Henriot',
        short: 'Henriot',
        row: 'back',
        role: 'French-Belgian physicist · radioactivity, ultracentrifuges',
        summary: 'Trained under Marie Curie and based in Brussels, Henriot studied radiation of potassium and invented compressed-air ultracentrifuges spinning at extreme speeds.',
        impact: 'His high-speed centrifuge methods became essential in biochemistry and isotope separation.',
        lookfor: 'Back row, second from left, wearing round glasses beside Piccard.',
        systemLens: 'Local host expertise in Brussels anchors an international conference.',
        tag: 'Back row · Brussels host',
        x: 24,
        y: 40
      },
      {
        id: 'ehrenfest',
        name: 'Paul Ehrenfest',
        short: 'Ehrenfest',
        row: 'back',
        role: 'Theoretical physicist · statistical mechanics, great clarifier',
        summary: 'Close friend of both Einstein and Bohr, Ehrenfest pushed both giants to state their paradoxes with crystal clarity and ran legendary physics seminars in Leiden.',
        impact: 'Proved that asking sharp, honest clarifying questions moves science forward just as much as writing new equations.',
        lookfor: 'Back row, third from left, leaning slightly forward with dark mustache and glasses.',
        systemLens: 'Acts as intellectual translator between opposing schools in the Einstein-Bohr debate.',
        tag: 'Back row · Master clarifier',
        x: 29.5,
        y: 42.5
      },
      {
        id: 'herzen',
        name: 'Édouard Herzen',
        short: 'Herzen',
        row: 'back',
        role: 'Chemist & Solvay scientific secretary · industrial research',
        summary: 'Closely associated with Ernest Solvay’s institute, Herzen worked on surface tension and helped organize the Solvay scientific councils.',
        impact: 'Represents the institutional machinery—funding, logistics, and proceedings—that makes global science summits possible.',
        lookfor: 'Back row, fourth from left, bald with a dark beard and mustache.',
        systemLens: 'Ideas do not gather on their own: patronage and logistics build the room.',
        tag: 'Back row · Organizer',
        x: 37.5,
        y: 42
      },
      {
        id: 'dedonder',
        name: 'Théophile de Donder',
        short: 'De Donder',
        row: 'back',
        role: 'Mathematical physicist · chemical thermodynamics, relativity',
        summary: 'A Brussels mathematical physicist who founded the modern theory of irreversible chemical thermodynamics and mentored Ilya Prigogine.',
        impact: 'Connected thermodynamics to chemical affinity and complex open systems.',
        lookfor: 'Back row, left-center behind Lorentz and Dirac.',
        systemLens: 'Builds the Belgian theoretical tradition linking physics to complex-systems thermodynamics.',
        tag: 'Back row · Thermodynamics',
        x: 46.5,
        y: 43
      },
      {
        id: 'schrodinger',
        name: 'Erwin Schrödinger',
        short: 'Schrödinger',
        row: 'back',
        nobel: 'Physics 1933',
        role: 'Theoretical physicist · wave mechanics',
        summary: 'In 1926 Schrödinger turned de Broglie’s matter waves into a differential wave equation—one of the cornerstones of chemistry, solid-state electronics, and quantum physics.',
        impact: 'Later authored "What Is Life?", sparking the molecular biology revolution around DNA.',
        lookfor: 'Back row dead center directly above Einstein’s head, wearing round glasses and a bow tie.',
        systemLens: 'Look at that visual alignment: Einstein sits in front while Schrödinger rises directly behind him.',
        tag: 'Back row · Wave equation',
        x: 54.5,
        y: 40.5
      },
      {
        id: 'verschaffelt',
        name: 'Jules-Émile Verschaffelt',
        short: 'Verschaffelt',
        row: 'back',
        role: 'Belgian physicist · low-temperature & critical phenomena',
        summary: 'Student of Kamerlingh Onnes in Leiden and professor in Ghent, Verschaffelt investigated viscosity and behavior of liquids near critical points and ultra-cold temperatures.',
        impact: 'Helped document and archive the Solvay meetings while advancing European low-temperature physics.',
        lookfor: 'Back row, right of Schrödinger, standing squarely behind Langevin.',
        systemLens: 'Shows the dense web linking Dutch and Belgian laboratories.',
        tag: 'Back row · Low temperatures',
        x: 63,
        y: 41.5
      },
      {
        id: 'pauli',
        name: 'Wolfgang Pauli',
        short: 'Pauli',
        row: 'back',
        nobel: 'Physics 1945',
        role: 'Theoretical physicist · exclusion principle, neutrino prediction',
        summary: 'Famous for ferocious rigor ("not even wrong"), Pauli discovered the exclusion principle—explaining why electrons stack into chemical shells rather than collapsing into one lump.',
        impact: 'Underlies the entire Periodic Table, chemical bonding, and why solid matter takes up space.',
        lookfor: 'Back row, third from right in the standing line behind Born and Guye.',
        systemLens: 'One symmetry rule in quantum math explains the architecture of chemistry.',
        tag: 'Back row · Exclusion principle',
        x: 71,
        y: 41
      },
      {
        id: 'heisenberg',
        name: 'Werner Heisenberg',
        short: 'Heisenberg',
        row: 'back',
        nobel: 'Physics 1932',
        role: 'Theoretical physicist · matrix mechanics, uncertainty principle',
        summary: 'In 1925–1927, while still in his mid-twenties, Heisenberg pioneered matrix mechanics and formulated the uncertainty principle limiting simultaneous knowledge of position and momentum.',
        impact: 'Declared at this 1927 conference that quantum mechanics was already a complete, closed theory—a bold claim Einstein refused to accept.',
        lookfor: 'Back row between Pauli and Fowler, youthful and clean-shaven behind Max Born.',
        systemLens: 'Youthful audacity in the back row reshapes the textbook taught by the front row.',
        tag: 'Back row · Uncertainty',
        x: 77.5,
        y: 40.5
      },
      {
        id: 'fowler',
        name: 'Ralph Fowler',
        short: 'Fowler',
        row: 'back',
        role: 'Mathematical physicist · statistical mechanics, astrophysics',
        summary: 'Cambridge theorist who supervised Paul Dirac, Subrahmanyan Chandrasekhar, and dozens of leading physicists—applying quantum statistics to white dwarf stars.',
        impact: 'Demonstrated that mentorship multiplies impact across an entire academic generation.',
        lookfor: 'Back row, second from right, standing tall slightly higher on the rear step beside Brillouin.',
        systemLens: 'One great advisor connects quantum atoms to collapsing stars.',
        tag: 'Back row · Cambridge mentor',
        x: 83,
        y: 36.5
      },
      {
        id: 'brillouin',
        name: 'Léon Brillouin',
        short: 'Brillouin',
        row: 'back',
        role: 'Physicist · crystal waves, quantum approximations, information theory',
        summary: 'Brillouin helped define Brillouin zones in solid-state crystals (the bedrock of semiconductor chip bands) and later pioneered links between physics entropy and information.',
        impact: 'Connects 1927 quantum debates directly to modern silicon electronics and computing theory.',
        lookfor: 'Back row, far right, standing directly behind Niels Bohr.',
        systemLens: 'Traces a direct line from 1927 Brussels crystals to the physics inside modern computers.',
        tag: 'Back row · Solid state & info',
        x: 88,
        y: 40.5
      }
    ]
  }
};

export const HARLEM_ARCHIVE_URL = 'https://www.artkane.com/';

/**
 * 57 musicians from Art Kane's August 12, 1958 Harlem gathering.
 * Rights-safe directory: intentionally contains NO x/y spatial coordinates
 * and NO photo-position descriptions.
 */
export const HARLEM_MUSICIANS = [
  { id: 'hilton-jefferson', name: 'Hilton Jefferson', role: 'Alto saxophonist · swing and big band', instrumentFamily: 'Reeds', era: 'Swing', summary: 'Jefferson worked across major New York big bands including Fletcher Henderson and Cab Calloway, bringing a polished, singing alto tone.', impact: 'Exemplifies the disciplined ensemble reed sections that gave swing orchestras their lush harmonic texture.', listenFor: 'Clean alto phrasing and velvety section blend in 1930s–40s big-band recordings.', tag: 'Swing section voice' },
  { id: 'benny-golson', name: 'Benny Golson', role: 'Tenor saxophonist & composer · hard bop', instrumentFamily: 'Reeds', era: 'Bebop & Hard Bop', summary: 'Golson became celebrated equally as a warm-toned tenor soloist and as the composer of enduring jazz standards like "I Remember Clifford" and "Whisper Not."', impact: 'Proved that unforgettable harmonic composition and narrative melody sit at the center of hard bop.', listenFor: 'Long, story-like melodies and singing horn harmonies in the Jazztet and Jazz Messengers.', tag: 'Composer-player' },
  { id: 'art-farmer', name: 'Art Farmer', role: 'Trumpeter & flugelhornist · lyrical modern jazz', instrumentFamily: 'Brass', era: 'Cool & Modern', summary: 'Farmer crafted a warm, unhurried brass sound that favored clarity and emotional weight over sheer speed.', impact: 'Helped establish the flugelhorn as a deeply expressive modern jazz voice alongside Benny Golson in the Jazztet.', listenFor: 'Rounded, vocal brass phrasing with zero wasted notes.', tag: 'Lyrical brass' },
  { id: 'wilbur-ware', name: 'Wilbur Ware', role: 'Double bassist · modern rhythm architecture', instrumentFamily: 'Piano & Rhythm', era: 'Bebop & Hard Bop', summary: 'Chicago-born bassist Wilbur Ware anchored landmark dates with Thelonious Monk and Sonny Rollins using woody, percussive lines.', impact: 'Showed that an acoustic bass line can carry independent melody and counterpoint, not merely walk time.', listenFor: 'Earthy, syncopated bass motifs that converse directly with the soloist.', tag: 'Modern rhythm' },
  { id: 'art-blakey', name: 'Art Blakey', role: 'Drummer & bandleader · Jazz Messengers', instrumentFamily: 'Piano & Rhythm', era: 'Bebop & Hard Bop', summary: 'One of jazz’s most explosive drummers, Blakey turned the Jazz Messengers into a decades-long finishing school for brilliant young horn players and pianists.', impact: 'Operated as a living conservatory—passing swing groove, blues church feeling, and discipline from one generation to the next.', listenFor: 'Thunderous press rolls, crisp backbeat hi-hat snaps, and propulsive drive.', tag: 'Hard-bop mentor' },
  { id: 'chubby-jackson', name: 'Chubby Jackson', role: 'Bassist & bandleader · swing & bebop big band', instrumentFamily: 'Piano & Rhythm', era: 'Swing', summary: 'Jackson powered Woody Herman’s famed "First Herd" with a five-string acoustic bass and irrepressible stage energy.', impact: 'Helped bridge swing rhythm sections into fast, adventurous modern big-band writing.', listenFor: 'Driving four-to-the-bar pulse pushing whole brass sections forward.', tag: 'Swing powerhouse' },
  { id: 'johnny-griffin', name: 'Johnny Griffin', role: 'Tenor saxophonist · rapid bebop & hard bop', instrumentFamily: 'Reeds', era: 'Bebop & Hard Bop', summary: 'Nicknamed the "Little Giant," Griffin amazed fellow musicians with razor-sharp articulation at blistering tempos.', impact: 'Pushed modern saxophone technique forward while staying deeply rooted in Chicago blues.', listenFor: 'Crystal-clear double-time runs even at breakneck speed.', tag: 'Virtuoso tenor' },
  { id: 'dicky-wells', name: 'Dicky Wells', role: 'Trombonist · vocal swing phrasing', instrumentFamily: 'Brass', era: 'Swing', summary: 'A star of Count Basie’s classic 1930s band, Wells bent notes, swooped pitches, and cracked musical jokes straight out of his trombone bell.', impact: 'Turned the trombone from clunky brass support into an agile, conversational solo voice.', listenFor: 'Playful slides, sudden leaps, and human-voice inflections.', tag: 'Swing trombone' },
  { id: 'buck-clayton', name: 'Buck Clayton', role: 'Trumpeter & arranger · Basie orbit', instrumentFamily: 'Brass', era: 'Swing', summary: 'Clayton brought poised, singing trumpet solos and crisp small-group arrangements to Count Basie and Billie Holiday classics.', impact: 'Defined how spare, tasteful brass accompaniment can frame a vocalist.', listenFor: 'Warm muted trumpet counter-melodies on Billie Holiday’s late-1930s sessions.', tag: 'Basie trumpeter' },
  { id: 'taft-jordan', name: 'Taft Jordan', role: 'Trumpeter & vocalist · Chick Webb & Ellington', instrumentFamily: 'Brass', era: 'Swing', summary: 'Jordan commanded sparkling high-register brass chops alongside heartfelt vocals inspired by Louis Armstrong.', impact: 'Demonstrated the versatility expected of top big-band section leaders across Harlem’s ballrooms.', listenFor: 'Bright, buoyant swing solos and effortless section leadership.', tag: 'Ballroom brass' },
  { id: 'zutty-singleton', name: 'Zutty Singleton', role: 'Drummer · early New Orleans pioneer', instrumentFamily: 'Piano & Rhythm', era: 'Early Jazz & Stride', summary: 'Born in Louisiana in 1898, Singleton helped pioneer wire brushes on snare drums and fluid New Orleans polyrhythms alongside Louis Armstrong.', impact: 'Anchored this gathering’s living memory all the way back to jazz’s earliest recorded decade.', listenFor: 'Crisp brush sweeps and buoyant, rolling New Orleans snare patterns.', tag: 'New Orleans elder' },
  { id: 'red-allen', name: 'Henry "Red" Allen', role: 'Trumpeter & singer · hot jazz to swing', instrumentFamily: 'Brass', era: 'Early Jazz & Stride', summary: 'Allen bridged early New Orleans brass fire with startlingly modern rhythmic freedom and odd-length phrases.', impact: 'Anticipated modern trumpet phrasing decades before bebop arrived.', listenFor: 'Bold, asymmetrical phrases bursting across barlines.', tag: 'Bridge between eras' },
  { id: 'tyree-glenn', name: 'Tyree Glenn', role: 'Trombonist & vibraphonist · Ellington & Cab Calloway', instrumentFamily: 'Brass', era: 'Swing', summary: 'Equally prized for earthy plunger-muted trombone and shimmering vibraphone solos, Glenn thrived across big bands and small combos.', impact: 'Showed how multi-instrumental fluency kept mid-century players working across shifting styles.', listenFor: 'Expressive plunger growls alternating with bell-like vibes.', tag: 'Versatile sideman' },
  { id: 'sonny-greer', name: 'Sonny Greer', role: 'Drummer · Duke Ellington Orchestra', instrumentFamily: 'Piano & Rhythm', era: 'Swing', summary: 'For over thirty years with Duke Ellington, Greer surrounded himself with chimes, gongs, timpani, and cymbals as an orchestral colorist.', impact: 'Proved jazz percussion builds mood, theater, and atmosphere—not just tempo.', listenFor: 'Gongs, temple blocks, and shimmering cymbal textures painting Ellington’s tone poems.', tag: 'Ellington colorist' },
  { id: 'jimmy-jones', name: 'Jimmy Jones', role: 'Pianist & arranger · vocal accompaniment', instrumentFamily: 'Piano & Rhythm', era: 'Cool & Modern', summary: 'Prized by Sarah Vaughan and Ella Fitzgerald, Jimmy Jones combined delicate harmonic voicings with deep orchestral arranging craft.', impact: 'Set a gold standard for how a pianist listens, breathes, and supports a singer.', listenFor: 'Spacious, pastel chords that cushion rather than crowd the melody.', tag: 'Master accompanist' },
  { id: 'miff-mole', name: 'Miff Mole', role: 'Trombonist · 1920s hot jazz innovator', instrumentFamily: 'Brass', era: 'Early Jazz & Stride', summary: 'Rising in 1920s New York alongside Red Nichols, Mole freed the trombone from comic tailgate slides into fleet, melodic solos.', impact: 'Opened modern horn technique on trombone during jazz’s first recording boom.', listenFor: 'Nimble staccato leaps and clean upper-register runs from 1920s studio records.', tag: 'Early jazz innovator' },
  { id: 'jc-higginbotham', name: 'J. C. Higginbotham', role: 'Trombonist · Luis Russell & Red Allen bands', instrumentFamily: 'Brass', era: 'Swing', summary: 'Known for thunderous tone and driving swing power, Higginbotham could roar above an entire brass section.', impact: 'Established the muscular, assertive solo voice of swing trombone.', listenFor: 'Big-hearted, commanding phrases full of blues grit.', tag: 'Forceful brass' },
  { id: 'charles-mingus', name: 'Charles Mingus', role: 'Bassist & composer · post-bop pioneer', instrumentFamily: 'Piano & Rhythm', era: 'Bebop & Hard Bop', summary: 'Mingus fused gospel shouting, Duke Ellington orchestration, bebop velocity, and fearless collective improvisation into monumental compositions.', impact: 'Expanded what jazz ensembles could express politically, emotionally, and structurally.', listenFor: 'Explosive tempo shifts, roaring bass cries, and simultaneous contrapuntal horns.', tag: 'Compositional giant' },
  { id: 'jo-jones', name: 'Jo Jones', role: 'Drummer · Count Basie rhythm revolution', instrumentFamily: 'Piano & Rhythm', era: 'Swing', summary: 'Known as "Papa" Jo Jones, he moved the pulse off the heavy bass drum onto a shimmering, breathing hi-hat cymbal.', impact: 'Transformed jazz feel forever—giving drummers the light, floating swing almost every modern player builds on.', listenFor: 'The crisp, buoyant "shhh-chick" hi-hat ride driving Basie’s classic rhythm section.', tag: 'Rhythm pioneer' },
  { id: 'gene-krupa', name: 'Gene Krupa', role: 'Drummer & bandleader · swing showman', instrumentFamily: 'Piano & Rhythm', era: 'Swing', summary: 'Exploding to fame with Benny Goodman on "Sing, Sing, Sing," Krupa brought the drum kit front and center as a solo instrument.', impact: 'Made percussionists visible stars across jazz and later rock culture.', listenFor: 'Tom-tom thunder and crisp, theatrical rudiments.', tag: 'Drum soloist' },
  { id: 'osie-johnson', name: 'Osie Johnson', role: 'Drummer · studio, television & jazz sessions', instrumentFamily: 'Piano & Rhythm', era: 'Cool & Modern', summary: 'One of New York’s most trusted 1950s session drummers, Johnson recorded hundreds of dates across jazz, vocals, and broadcast studios.', impact: 'Highlights the invisible backbone of studio craft behind classic American albums.', listenFor: 'Tailor-made grooves that adapt seamlessly from intimate ballads to roaring big bands.', tag: 'Studio craft' },
  { id: 'max-kaminsky', name: 'Max Kaminsky', role: 'Trumpeter · Chicago & New York hot jazz', instrumentFamily: 'Brass', era: 'Early Jazz & Stride', summary: 'Kaminsky carried a clear, stinging brass lead through 1930s–50s small groups dedicated to classic collective improvisation.', impact: 'Preserved hot-jazz ensemble dialogue across decades of changing commercial fashion.', listenFor: 'Punchy, declarative trumpet leads anchoring multi-horn polyphony.', tag: 'Traditional voice' },
  { id: 'george-wettling', name: 'George Wettling', role: 'Drummer · Chicago style & abstract painter', instrumentFamily: 'Piano & Rhythm', era: 'Early Jazz & Stride', summary: 'Inspired early by Baby Dodds in Chicago, Wettling played tightly wound jazz drums by night and painted bold cubist canvases by day.', impact: 'Embodied the creative crossover between mid-century American jazz and modern visual art.', listenFor: 'Snappy rimshots and brisk, driving two-beat lift.', tag: 'Music & visual art' },
  { id: 'bud-freeman', name: 'Bud Freeman', role: 'Tenor saxophonist · Chicago school pioneer', instrumentFamily: 'Reeds', era: 'Early Jazz & Stride', summary: 'Alongside Coleman Hawkins, Freeman helped invent an idiomatic jazz vocabulary for the tenor saxophone in the late 1920s.', impact: 'Gave tenor sax a dry, witty, syncopated rhythmic agility distinct from orchestral reed tone.', listenFor: 'Crisp, rolling triplets and buoyant angular phrasing.', tag: 'Chicago school' },
  { id: 'pee-wee-russell', name: 'Pee Wee Russell', role: 'Clarinetist · idiosyncratic poetry', instrumentFamily: 'Reeds', era: 'Swing', summary: 'Russell broke textbook woodwind rules—turning raspy, hesitant, astonishingly original clarinet lines into deeply moving miniature stories.', impact: 'Proved that personal voice and vulnerability can matter more in improvisation than polished sheen.', listenFor: 'Delicate breathy whispers breaking into crooked, singing leaps.', tag: 'Unmistakable voice' },
  { id: 'ernie-wilkins', name: 'Ernie Wilkins', role: 'Saxophonist & arranger · modern big band', instrumentFamily: 'Reeds', era: 'Bebop & Hard Bop', summary: 'Wilkins wrote crisp, hard-swinging charts that helped revitalize Count Basie’s "New Testament" band in the 1950s.', impact: 'Shows how behind-the-scenes arrangers shape the recognizable sound of entire orchestras.', listenFor: 'Tightly voiced brass shouts answering punchy saxophone lines.', tag: 'Orchestral architect' },
  { id: 'buster-bailey', name: 'Buster Bailey', role: 'Clarinetist · conservatory technique meets swing', instrumentFamily: 'Reeds', era: 'Early Jazz & Stride', summary: 'Trained formally in Chicago before joining Fletcher Henderson in 1924, Bailey blended dazzling classical facility with hot-jazz momentum.', impact: 'Demonstrated how rigorous instrument study fed straight into Harlem’s swing laboratories.', listenFor: 'Effortless liquid arpeggios soaring up the clarinet’s top register.', tag: 'Technical clarity' },
  { id: 'hank-jones', name: 'Hank Jones', role: 'Pianist · elegance across seven decades', instrumentFamily: 'Piano & Rhythm', era: 'Cool & Modern', summary: 'Eldest of Detroit’s extraordinary Jones brothers (with Thad and Elvin), Hank Jones brought luminous touch and harmonic subtlety to every era from swing to modern.', impact: 'Set an unmatched standard of poise, taste, and longevity at the jazz piano.', listenFor: 'Pearl-like right-hand melodies balanced over crystalline chord voicings.', tag: 'Harmonic grace' },
  { id: 'gigi-gryce', name: 'Gigi Gryce', role: 'Alto saxophonist & composer · modern jazz craft', instrumentFamily: 'Reeds', era: 'Bebop & Hard Bop', summary: 'Boston-trained composer and altoist Gigi Gryce co-led the Jazz Lab Quintet and championed musicians’ publishing rights.', impact: 'Combined intricate modern jazz composition ("Minority") with early advocacy for Black artists owning their copyrights.', listenFor: 'Contrapuntal horn lines woven cleanly through tight small-group charts.', tag: 'Composer & advocate' },
  { id: 'eddie-locke', name: 'Eddie Locke', role: 'Drummer · mainstream & swing continuity', instrumentFamily: 'Piano & Rhythm', era: 'Swing', summary: 'Detroit drummer Eddie Locke anchored late-swing and mainstream ensembles alongside Coleman Hawkins and Roy Eldridge for years.', impact: 'Kept living swing traditions alive well into the late 20th century through performance and mentorship.', listenFor: 'Crisp, swinging brushwork and unshakeable pocket.', tag: 'Steady timekeeper' },
  { id: 'horace-silver', name: 'Horace Silver', role: 'Pianist & composer · hard bop architect', instrumentFamily: 'Piano & Rhythm', era: 'Bebop & Hard Bop', summary: 'Drawing on Cape Verdean folk rhythms, blues, and church gospel, Silver wrote catchy, funky hard-bop anthems like "Song for My Father."', impact: 'Made modern jazz deeply danceable, bluesy, and harmonically adventurous all at once.', listenFor: 'Rhythmic left-hand bass ostinatos supporting bright, percussive horn themes.', tag: 'Hard-bop architect' },
  { id: 'luckey-roberts', name: 'Luckey Roberts', role: 'Pianist & composer · Harlem stride founder', instrumentFamily: 'Piano & Rhythm', era: 'Early Jazz & Stride', summary: 'A powerhouse of pre-1920s Harlem theater and rent-party piano, Roberts helped forge the leaping left-hand "stride" style that trained James P. Johnson and Fats Waller.', impact: 'Links 1958 Harlem back to the foundational dawn of Harlem’s musical neighborhood.', listenFor: 'Orchestral two-handed fullness and dazzling stride tempos.', tag: 'Stride founder' },
  { id: 'maxine-sullivan', name: 'Maxine Sullivan', role: 'Vocalist · poised swing songcraft', instrumentFamily: 'Vocals & Strings', era: 'Swing', summary: 'Catapulted to fame with her gently swinging 1937 recording of "Loch Lomond," Sullivan brought crystal diction and calm understatement to jazz vocals.', impact: 'Showed singers could swing deeply without melodrama, paving the way for cool-jazz vocalists.', listenFor: 'Effortless intonation, buoyant timing, and conversational warmth.', tag: 'Poised vocal swing' },
  { id: 'jimmy-rushing', name: 'Jimmy Rushing', role: 'Vocalist · Kansas City blues shouting', instrumentFamily: 'Vocals & Strings', era: 'Swing', summary: 'Known affectionately as "Mr. Five by Five," Rushing rode cleanly over Count Basie’s roaring brass without losing nuance or intimacy.', impact: 'Connected urban big-band swing directly to Deep South blues storytelling.', listenFor: 'Clarion high-tenor power soaring above shouting brass riffs.', tag: 'Blues storyteller' },
  { id: 'joe-thomas', name: 'Joe Thomas', role: 'Trumpeter · warm lyricism in Fletcher Henderson', instrumentFamily: 'Brass', era: 'Swing', summary: 'Ohio-born trumpeter Joe Thomas earned musicians’ deep respect for singing medium-register tone and rock-solid ensemble timing.', impact: 'Represents the master craftspeople who carried classic swing ideals into small-group clubs.', listenFor: 'Unforced, golden trumpet melody without flashy tricks.', tag: 'Working pro' },
  { id: 'scoville-browne', name: 'Scoville Browne', role: 'Clarinetist & saxophonist · witness & multi-reed player', instrumentFamily: 'Reeds', era: 'Swing', summary: 'A respected reed player across Lionel Hampton and Louis Armstrong circles, Browne later helped document memories of this August morning in Harlem.', impact: 'Reminds historians that eyewitness memory preserves cultural context photographs alone miss.', listenFor: 'Flexible multi-reed section work blending effortlessly across ensembles.', tag: 'Reed stylist & witness' },
  { id: 'stuff-smith', name: 'Stuff Smith', role: 'Violinist · electric hot jazz & swing', instrumentFamily: 'Vocals & Strings', era: 'Swing', summary: 'One of the earliest jazz musicians to amplify an acoustic string instrument, Stuff Smith played violin with ferocious swing, grit, and wit.', impact: 'Proved bowed strings belonged front and center in high-energy jazz clubs.', listenFor: 'Seering double-stops, biting rhythmic accents, and infectious vocal humor.', tag: 'Amplified violin' },
  { id: 'bill-crump', name: 'Bill Crump', role: 'Bassist & tenor saxophonist · working Harlem scene', instrumentFamily: 'Piano & Rhythm', era: 'Swing', summary: 'A working New York jazz player whose presence highlights the everyday local networks supporting marquee stars.', impact: 'Illustrates an essential historical truth: musical scenes thrive on dense communities of working artisans, not isolated geniuses.', listenFor: 'Dependable ensemble grounding across neighborhood gigs and recording dates.', tag: 'Scene artisan' },
  { id: 'coleman-hawkins', name: 'Coleman Hawkins', role: 'Tenor saxophonist · father of the jazz tenor', instrumentFamily: 'Reeds', era: 'Swing', summary: 'Before Coleman Hawkins’s commanding 1920s–30s solos—crowned by his 1939 masterpiece "Body and Soul"—the tenor saxophone was mostly a novelty instrument.', impact: 'Built the instrument’s heroic harmonic language and mentored younger modernists including Thelonious Monk.', listenFor: 'Rich, sweeping vibrato and relentless harmonic mastery over shifting chords.', tag: 'Tenor pioneer' },
  { id: 'rudy-powell', name: 'Rudy Powell', role: 'Saxophonist & clarinetist · swing & R&B crossover', instrumentFamily: 'Reeds', era: 'Swing', summary: 'From Fats Waller’s bands in the 1930s to Ray Charles in the 1960s, Powell moved smoothly between swing, jazz, and rhythm-and-blues.', impact: 'Demonstrates that American Black music traditions continually cross-pollinated rather than sitting in separate boxes.', listenFor: 'Singing clarinet obbligatos and blues-drenched alto lines.', tag: 'Genre bridge' },
  { id: 'oscar-pettiford', name: 'Oscar Pettiford', role: 'Bassist & cellist · bebop solo pioneer', instrumentFamily: 'Piano & Rhythm', era: 'Bebop & Hard Bop', summary: 'Co-leading 52nd Street’s first bebop band with Dizzy Gillespie, Pettiford lifted the acoustic bass into singing bebop melodies—and made cello a legitimate jazz solo horn.', impact: 'Reshaped modern rhythm sections and composed staples like "Tricrotism" and "Bohemia After Dark."', listenFor: 'Horn-like agility on upright bass and bowed or plucked jazz cello.', tag: 'Modern bass & cello' },
  { id: 'sahib-shihab', name: 'Sahib Shihab', role: 'Baritone saxophonist & flutist · bebop & global jazz', instrumentFamily: 'Reeds', era: 'Bebop & Hard Bop', summary: 'Recording on Thelonious Monk’s very first Blue Note session in 1947 before relocating to Scandinavia, Shihab helped turn jazz into a global art form.', impact: 'Traces jazz’s mid-century expansion into European conservatories, radio orchestras, and cross-cultural collaboration.', listenFor: 'Muscular, nimble baritone saxophone lines and sparkling flute accents.', tag: 'Global modernist' },
  { id: 'marian-mcpartland', name: 'Marian McPartland', role: 'Pianist & broadcaster · Piano Jazz educator', instrumentFamily: 'Piano & Rhythm', era: 'Cool & Modern', summary: 'Born in England, McPartland became an acclaimed New York bandleader and hosted NPR’s Piano Jazz for over thirty years—conducting live musical interviews with legends.', impact: 'Created one of the richest living audio archives of jazz musicians demonstrating how they actually think at the keyboard.', listenFor: 'Adventurous harmonic reharmonizations and generous musical dialogue.', tag: 'Performer & educator' },
  { id: 'sonny-rollins', name: 'Sonny Rollins', role: 'Tenor saxophonist · thematic improvisation giant', instrumentFamily: 'Reeds', era: 'Bebop & Hard Bop', summary: 'From "Saxophone Colossus" onward, Rollins turned short rhythmic motifs into spontaneous, architecturally coherent essays full of humor and grit.', impact: 'Set the modern benchmark for unaccompanied cadenza playing and thematic development.', listenFor: 'Playful thematic variations where one tiny phrase gets flipped, stretched, and rebuilt over minutes.', tag: 'Improvisation giant' },
  { id: 'lawrence-brown', name: 'Lawrence Brown', role: 'Trombonist · Duke Ellington Orchestra', instrumentFamily: 'Brass', era: 'Swing', summary: 'Brown brought velvet cello-like phrasing and impeccable intonation to Ellington’s brass section for more than three decades.', impact: 'Showed how romantic ballad beauty and swinging precision could share one trombone slide.', listenFor: 'Silky, songful solo turns inside Ellington’s orchestral suites.', tag: 'Ellington brass' },
  { id: 'mary-lou-williams', name: 'Mary Lou Williams', role: 'Pianist, composer & mentor · all eras of jazz', instrumentFamily: 'Piano & Rhythm', era: 'Swing', summary: 'Arranging hits for Andy Kirk, Benny Goodman, and Duke Ellington before mentoring Bud Powell and Thelonious Monk in her Harlem apartment, Williams spanned every major jazz revolution.', impact: 'Stood at the center of jazz pedagogy, composition, and later sacred jazz works.', listenFor: 'Boogie-woogie drive effortlessly evolving into sleek modern modal harmony.', tag: 'Grand mentor' },
  { id: 'emmett-berry', name: 'Emmett Berry', role: 'Trumpeter · Basie, Teddy Wilson & Billie Holiday', instrumentFamily: 'Brass', era: 'Swing', summary: 'Prized by peers for crisp attack and ringing clarity, Berry anchored major swing bands and classic small-group vocal dates.', impact: 'Represented the disciplined craft that kept New York’s studio and ballroom jazz glowing.', listenFor: 'Clean, punchy trumpet breaks cutting straight through dense arrangements.', tag: 'Brass stylist' },
  { id: 'thelonious-monk', name: 'Thelonious Monk', role: 'Pianist & composer · modern jazz original', instrumentFamily: 'Piano & Rhythm', era: 'Bebop & Hard Bop', summary: 'With spiky clusters, sudden silences, and unforgettable angular melodies ("Round Midnight," "Straight, No Chaser"), Monk forged one of the most original sound worlds in 20th-century music.', impact: 'Transformed jazz harmony and rhythm while proving radical individuality could endure as classic repertoire.', listenFor: 'Deliberate dissonant intervals, sudden pauses, and strutting stride-inspired rhythms.', tag: 'Unmatched original' },
  { id: 'count-basie', name: 'Count Basie', role: 'Pianist & bandleader · Kansas City swing', instrumentFamily: 'Piano & Rhythm', era: 'Swing', summary: 'Count Basie made subtraction an art form—replacing busy solo runs with two perfectly timed piano notes that launched an entire big band into flight.', impact: 'Defined the light, unstoppable swing feel and call-and-response riff architecture of American music.', listenFor: 'Spare, sparkling right-hand piano chimes dropping between roaring brass chords.', tag: 'Master of space' },
  { id: 'vic-dickenson', name: 'Vic Dickenson', role: 'Trombonist · wit, warmth & phrasing', instrumentFamily: 'Brass', era: 'Swing', summary: 'Dickenson’s trombone sounded like a genial storyteller chuckling mid-sentence—full of sly vibrato, warm growls, and unexpected melodies.', impact: 'Demonstrated how warmth and understatement sustain lifelong appeal across generations.', listenFor: 'Sighing melodic turns and gentle comedic slurs.', tag: 'Conversational brass' },
  { id: 'milt-hinton', name: 'Milt Hinton', role: 'Bassist & photographer · Judge of Rhythm', instrumentFamily: 'Piano & Rhythm', era: 'Swing', summary: 'Alongside his landmark 16 years with Cab Calloway and thousands of studio sessions, Hinton carried a camera everywhere—leaving 60,000 candid photographs of jazz history.', impact: 'Shows a working musician doubling as his community’s dedicated visual archivist.', listenFor: 'Elastic, rock-solid slap-and-fingerstyle bass lines that glue any rhythm section.', tag: 'Bass & visual archivist' },
  { id: 'lester-young', name: 'Lester "Pres" Young', role: 'Tenor saxophonist · cool lyricism pioneer', instrumentFamily: 'Reeds', era: 'Swing', summary: 'Whereas Coleman Hawkins played thick and vertical, Lester Young floated light, horizontal, bittersweet melodies across barlines in Count Basie’s band.', impact: 'Became the direct poetic ancestor of cool jazz, bebop phrasing, and modern saxophone sound.', listenFor: 'Pale, singing horn tone lagging effortlessly behind the beat.', tag: 'Cool jazz ancestor' },
  { id: 'rex-stewart', name: 'Rex Stewart', role: 'Cornetist · Duke Ellington half-valve master', instrumentFamily: 'Brass', era: 'Swing', summary: 'Stewart invented daring "half-valve" cornet techniques that made brass sound like talking, laughing, or whispering.', impact: 'Expanded the timbral vocabulary of brass instruments.', listenFor: 'Playful vocalized squeezes and expressive bent pitches on "Boy Meets Horn."', tag: 'Timbral explorer' },
  { id: 'jc-heard', name: 'J. C. Heard', role: 'Drummer · adaptable swing & bebop pro', instrumentFamily: 'Piano & Rhythm', era: 'Swing', summary: 'Heard backed everyone from Teddy Wilson and Cab Calloway to Charlie Parker and Jazz at the Philharmonic tours.', impact: 'Showed how great rhythm players translate effortlessly across rival jazz generations.', listenFor: 'Snappy rim accents and seamless transitions from swing to bop.', tag: 'All-era drummer' },
  { id: 'gerry-mulligan', name: 'Gerry Mulligan', role: 'Baritone saxophonist & arranger · cool jazz', instrumentFamily: 'Reeds', era: 'Cool & Modern', summary: 'Co-architect of Miles Davis’s Birth of the Cool and pioneer of the pianoless quartet, Mulligan turned the heavy baritone sax into an airy contrapuntal lead.', impact: 'Opened chamber-like transparency and counterpoint in 1950s modern jazz.', listenFor: 'Two horns weaving improvised melodies smoothly without a chordal piano.', tag: 'Cool counterpoint' },
  { id: 'roy-eldridge', name: 'Roy Eldridge', role: 'Trumpeter · fiery link from swing to bebop', instrumentFamily: 'Brass', era: 'Swing', summary: 'Nicknamed "Little Jazz," Eldridge played trumpet with fierce high-register speed and saxophone-like fluency that electrified young Dizzy Gillespie.', impact: 'Forged the direct bridge carrying Louis Armstrong’s trumpet lineage into modern bebop.', listenFor: 'Blistering upward flares and fearless rhythmic leaps.', tag: 'Bridge to bebop' },
  { id: 'dizzy-gillespie', name: 'Dizzy Gillespie', role: 'Trumpeter, composer & bandleader · bebop & Afro-Cuban pioneer', instrumentFamily: 'Brass', era: 'Bebop & Hard Bop', summary: 'Co-founder of bebop and pioneer of Afro-Cuban jazz ("Manteca"), Gillespie paired lightning trumpet virtuosity with brilliant harmonic teaching and magnetic humor.', impact: 'Turned bebop’s complex rhythmic and harmonic ideas into an international musical language.', listenFor: 'Angular chromatic melodies, Afro-Cuban percussion cross-rhythms, and blazing upper-register control.', tag: 'Bebop architect' }
];

export const PEPPER_CLUSTERS = [
  {
    id: 'poe',
    domain: 'literature',
    domainLabel: 'Literature & Imagination',
    title: 'Edgar Allan Poe',
    subtitle: 'Top row · American Gothic writer',
    summary: 'Poe helps students see that literary authors become visual icons too. Imagination, mystery, and psychological mood shape culture just as deeply as politics or science.',
    lessonTie: 'Pairs with Raphael’s poets and Apollo: storytelling turns personal interior feeling into shared cultural shorthand.'
  },
  {
    id: 'wilde-carroll',
    domain: 'literature',
    domainLabel: 'Literature & Wit',
    title: 'Oscar Wilde & Lewis Carroll',
    subtitle: 'Middle-left & top row · paradox & nonsense logic',
    summary: 'Satirist Oscar Wilde and mathematician-author Lewis Carroll sit on the same collage because Victorian wordplay and inverted logic directly inspired the Beatles’ surrealist lyrics.',
    lessonTie: 'Shows how an era’s collage selects ancestors across centuries—blending math-puzzles with theater.'
  },
  {
    id: 'einstein',
    domain: 'science',
    domainLabel: 'Science & Wonder',
    title: 'Albert Einstein',
    subtitle: 'Partly obscured front-left · modern physics icon',
    summary: 'Appearing forty years after the Solvay Conference photo, Einstein’s face had shifted from living theorist into instant shorthand for curiosity and cosmic imagination.',
    lessonTie: 'Compare directly with Einstein in the 1927 Solvay photo: same face, radically different media function.'
  },
  {
    id: 'freud-jung',
    domain: 'science',
    domainLabel: 'Psychology & Mind',
    title: 'Sigmund Freud & Carl Jung',
    subtitle: 'Upper row · psychoanalysis & archetypes',
    summary: 'Including depth psychologists reminds students that 20th-century culture looked inward—treating dreams, symbols, and archetypes as engines of human behavior.',
    lessonTie: 'Connects directly to iconography itself: Jung argued symbols carry collective memory across generations.'
  },
  {
    id: 'yukteswar',
    domain: 'spirituality',
    domainLabel: 'Global Spiritual Lineages',
    title: 'Sri Yukteswar & Lahiri Mahasaya',
    subtitle: 'Upper-left & upper-right · Kriya Yoga gurus',
    summary: 'By placing Indian spiritual teachers beside Western writers and Hollywood stars, George Harrison and the designers broadened the frame beyond Western canons.',
    lessonTie: 'Compare with Averroes and Zoroaster in Raphael’s School of Athens: every gathering decides whose traditions count as wisdom.'
  },
  {
    id: 'dylan-stockhausen',
    domain: 'cinema-music',
    domainLabel: 'Music & Avant-Garde',
    title: 'Bob Dylan & Karlheinz Stockhausen',
    subtitle: 'Upper-right & upper-center · folk poetry & electronic tape',
    summary: 'Folk lyricist Bob Dylan shares the frame with German electronic composer Karlheinz Stockhausen, mapping how rock absorbed both street poetry and studio tape experiments.',
    lessonTie: 'Even contemporary peers become ancestors when a band stages its own living influence map.'
  },
  {
    id: 'cinema-icons',
    domain: 'cinema-music',
    domainLabel: 'Cinema & Mass Fame',
    title: 'Marilyn Monroe, Laurel & Hardy, Marlon Brando',
    subtitle: 'Right & foreground · Hollywood stardom',
    summary: 'Unlike Renaissance frescoes or Solvay’s academy, mass-media pop culture treats screen actors, comedians, and philosophers as peers inside a shared visual stream.',
    lessonTie: 'Notice the wax Beatles standing beside the "living" uniformed Beatles: the collage even blurs past selves and present selves.'
  }
];

export const GATHERING_WORKS = [
  {
    id: 'last-supper',
    title: 'The Last Supper',
    year: '1495–1498',
    creator: 'Leonardo da Vinci',
    medium: 'Tempera & oil mural on dry dining-hall wall (Milan)',
    patron: 'Duke Ludovico Sforza & Santa Maria delle Grazie',
    realityMode: 'Staged dramatic moment from sacred narrative',
    visualCenter: 'Jesus framed by central window & converging ceiling perspective',
    inclusionExclusion: 'Includes Jesus and all 12 apostles—even Judas remains at the table, marked by shadow rather than exile; leaves out women followers and servants.',
    culturalWork: 'Turns a theological betrayal into a psychological study of human shock and linear perspective.',
    anchorHref: '#exhibit-last-supper'
  },
  {
    id: 'athens',
    title: 'The School of Athens',
    year: '1509–1511',
    creator: 'Raphael',
    medium: 'Fresco on papal library wall (Vatican)',
    patron: 'Pope Julius II',
    realityMode: 'Imagined trans-historical conversation across centuries',
    visualCenter: 'Plato & Aristotle beneath Roman arches, flanked by Apollo & Athena',
    inclusionExclusion: 'Gathers ancient Greek, Persian (Zoroaster), and medieval Andalusian (Averroes) thinkers—yet includes almost no clearly identified women (Hypatia remains debated).',
    culturalWork: 'Unites classical reason and math inside a papal chamber, elevating philosophy and visual art to civic prestige.',
    anchorHref: '#exhibit-athens'
  },
  {
    id: 'bosch',
    title: 'Adoration of the Magi (Bosch Tradition)',
    year: 'c. 1515',
    creator: 'Follower of Hieronymus Bosch',
    medium: 'Oil on oak panel (devotional altarpiece)',
    patron: 'Wealthy Flemish religious or civic patron',
    realityMode: 'Symbolic sacred ritual set inside Flemish rural decay',
    visualCenter: 'Mary & the Christ Child receiving bowing kings',
    inclusionExclusion: 'Includes kings from distant realms (including African Magus Balthazar) and rustic shepherds on the roof, while tucking an enigmatic, debated onlooker inside the doorway.',
    culturalWork: 'Contrasts earthly royal splendor with humble spiritual revelation—warning against hidden pride or false curiosity.',
    anchorHref: '#exhibit-bosch'
  },
  {
    id: 'ambassadors',
    title: 'The Ambassadors',
    year: '1533',
    creator: 'Hans Holbein the Younger',
    medium: 'Oil on oak panels (life-size double portrait)',
    patron: 'French diplomat Jean de Dinteville',
    realityMode: 'Real contemporary diplomats surrounded by coded objects',
    visualCenter: 'Two shelves of instruments between Dinteville & de Selve, sliced by an anamorphic skull',
    inclusionExclusion: 'Shows two young aristocratic men and their scientific/musical apparatus while hiding a tiny silver crucifix behind the curtain; excludes women, laborers, and non-European voices.',
    culturalWork: 'Projects diplomatic prestige while encoding anxiety over Reformation schism, scientific power, and mortal vanity.',
    anchorHref: '#exhibit-ambassadors'
  },
  {
    id: 'cana',
    title: 'The Wedding Feast at Cana',
    year: '1562–1563',
    creator: 'Paolo Veronese',
    medium: 'Monumental oil on canvas (6.7m × 9.9m, Venice monastery)',
    patron: 'Benedictine monks of San Giorgio Maggiore',
    realityMode: 'Biblical miracle staged in contemporary 16th-century Venice',
    visualCenter: 'Quiet Jesus & Mary centered beneath a balcony lamb carver and above painter-musicians',
    inclusionExclusion: 'Packs in over 130 nobles, servants, cooks, musicians, and animals—making working servants essential witnesses alongside elites.',
    culturalWork: 'Celebrates Venetian civic wealth and hospitality while threading quiet reminders of time (hourglass) and sacrifice (carver).',
    anchorHref: '#exhibit-cana'
  },
  {
    id: 'solvay',
    title: 'Fifth Solvay Conference',
    year: '1927',
    creator: 'Benjamin Couprie (photographer)',
    medium: 'Documentary black-and-white group photograph (Brussels)',
    patron: 'International Solvay Institutes (funded by industrial philanthropy)',
    realityMode: 'Real historical summit captured in one instant',
    visualCenter: 'Albert Einstein seated center front; Lorentz, Planck, and Curie beside him; young quantum pioneers behind',
    inclusionExclusion: 'Captures 29 invited European/American physicists (17 Nobel winners), with Marie Curie as the lone woman and no scientists outside Europe/North America.',
    culturalWork: 'Photography inherits the authority of grand history painting—canonizing theoretical physics as the modern temple of knowledge.',
    anchorHref: '#exhibit-solvay'
  },
  {
    id: 'harlem',
    title: 'A Great Day in Harlem',
    year: '1958',
    creator: 'Art Kane (concept by Robert Benton)',
    medium: 'Documentary magazine photograph (Esquire, New York)',
    patron: 'Esquire magazine (commercial editorial journalism)',
    realityMode: 'Real multi-generational community gathering on a Harlem stoop',
    visualCenter: 'Living neighborhood network spanning stride elders to bebop innovators',
    inclusionExclusion: 'Unites 57 jazz masters across ages, instruments, and races (plus neighborhood kids on the curb), though only 3 women musicians appear in the lineup.',
    culturalWork: 'Claims American urban street culture and Black-led musical apprenticeship as high cultural heritage equal to any academy.',
    anchorHref: '#exhibit-harlem'
  },
  {
    id: 'pepper',
    title: "Sgt. Pepper's Lonely Hearts Club Band",
    year: '1967',
    creator: 'Peter Blake, Jann Haworth & Michael Cooper (concept by Paul McCartney)',
    medium: 'Staged color photograph of life-size cutouts & wax figures (London)',
    patron: 'The Beatles / EMI / Parlophone (mass music industry)',
    realityMode: 'Manufactured pop-culture collage assembling dead & living icons',
    visualCenter: 'The Beatles in bright satin military uniforms behind floral "BEATLES" bass drum',
    inclusionExclusion: 'Mixes scientists, mystics, writers, comedians, and athletes—yet several requested political or religious figures were omitted or pulled due to licensing/objections.',
    culturalWork: 'Turns historical memory into an approachable mass-media scrapbook where commercial pop claims all of culture as its playground.',
    anchorHref: '#exhibit-pepper'
  }
];

export const COMPARE_PRESETS = [
  { id: 'athens-solvay', a: 'athens', b: 'solvay', label: 'Raphael (1511) vs. Solvay (1927)' },
  { id: 'last-cana', a: 'last-supper', b: 'cana', label: 'Leonardo (1498) vs. Veronese (1563)' },
  { id: 'bosch-holbein', a: 'bosch', b: 'ambassadors', label: 'Bosch (c. 1515) vs. Holbein (1533)' },
  { id: 'harlem-pepper', a: 'harlem', b: 'pepper', label: 'Harlem (1958) vs. Sgt. Pepper (1967)' }
];

/**
 * Pure filtering and alphabetical sorting for the Harlem directory.
 */
export function filterHarlemMusicians(list, { query = '', family = 'all', era = 'all' } = {}) {
  const q = String(query || '').trim().toLowerCase();
  return [...list]
    .filter((item) => {
      if (family !== 'all' && item.instrumentFamily !== family) return false;
      if (era !== 'all' && item.era !== era) return false;
      if (!q) return true;
      const haystack = [item.name, item.role, item.instrumentFamily, item.era, item.summary, item.tag]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Pure comparison helper pairing any two gathering works.
 */
export function compareGatherings(idA, idB, works = GATHERING_WORKS) {
  const workA = works.find((w) => w.id === idA) || works[0];
  const workB = works.find((w) => w.id === idB) || works[1] || works[0];
  let prompt = `How do ${workA.title} (${workA.year}) and ${workB.title} (${workB.year}) decide who belongs at the center—and who stays on the margins or outside the frame?`;
  if (workA.id === workB.id) {
    prompt = `Pick two different gatherings to contrast how medium, patronage, and era reshape who gets pictured.`;
  } else if (
    (workA.id === 'athens' && workB.id === 'solvay') ||
    (workA.id === 'solvay' && workB.id === 'athens')
  ) {
    prompt = 'Raphael painted an impossible trans-historical conversation, while Couprie photographed one real afternoon. Which medium gives thinkers stronger authority—and why?';
  } else if (
    (workA.id === 'harlem' && workB.id === 'pepper') ||
    (workA.id === 'pepper' && workB.id === 'harlem')
  ) {
    prompt = 'Compare a real community of working musicians gathering on a Harlem street with a studio collage of 57 cardboard cut-outs. What changes when iconography becomes a commercial album cover?';
  }
  return { workA, workB, prompt };
}

/**
 * Pure projection math for Holbein's anamorphic skull viewing angle (0° straight-on -> 82° extreme right edge).
 */
export function computeAnamorphicTransform(angleDeg) {
  const clamped = Math.max(0, Math.min(82, Number(angleDeg) || 0));
  const t = clamped / 82;
  const rad = (clamped * Math.PI) / 180;
  const scaleX = Math.max(0.142, Number(Math.cos(rad).toFixed(4)));
  const rotDeg = Number((26 * t).toFixed(2));
  const zoom = Number((0.62 + 1.18 * t).toFixed(3));

  let label = 'Oblique angle — the foreshortened skull starts pulling into proportion.';
  if (clamped < 15) {
    label = 'Straight-on gallery view (0°) — the stretched smear resists immediate reading.';
  } else if (clamped >= 70) {
    label = `Raking right-edge view (${Math.round(clamped)}°) — Holbein's hidden skull snaps into true 3D proportion.`;
  }

  return { angle: Math.round(clamped), scaleX, rotDeg, zoom, label };
}
