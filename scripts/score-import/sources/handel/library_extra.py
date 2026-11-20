# Library metadata for the Handel scores taken from PDMX MusicXML (read by library.py).
PDMX = 'https://zenodo.org/records/15571083'

EXTRA['handel-sarabande'] = dict(
  title='Sarabande in D minor, from the Keyboard Suite HWV 437',
  subtitle='George Frideric Handel · harpsichord or piano · the sarabande theme, with its repeat',
  keyName='D minor', tempo=60, tempoText='Lento · ♩ = 60', instrument='piano',
  excerpt=dict(label='the 16-bar sarabande theme (Handel follows it with variations)', of='the Sarabande from the Suite in D minor, HWV 437'),
  staves=[('Right hand', 'piano'), ('Left hand', 'piano')],
  sections=[(1, 'A', 'First phrase · to an A-major chord'), (9, 'A′', 'Second phrase · home to D minor')],
  guide=[('1-2', 'A sarabande is a slow, stately dance in three. Each bar has three half-note beats, and the chord is struck again on beat 2 and held: that weight on the second beat is the sarabande’s signature.'),
         ('3-6', 'The bass steps through F, C, G and D while the chords above follow it. This chain of chords was a favourite Baroque pattern, used for dances and variations across Europe.'),
         ('7-8', 'The phrase stops on an A-major chord, the dominant of D minor: a half cadence that sounds like a question.'),
         ('9-12', 'The first four bars return exactly, so the listener knows where they are.'),
         ('13-16', 'This time the bass walks down and the melody rises to F, then the music closes firmly on D. Then the whole theme repeats. In Handel’s suite, variations in faster notes follow.')],
  source=dict(label='PDMX (MuseScore), “Zarabanda”, from the Suite No. 11 in D minor, HWV 437 · public domain dedication (CC0). The whole theme repeats.', license='CC0 1.0',
              url=PDMX, full='https://imslp.org/wiki/Keyboard_Suite_in_D_minor,_HWV_437_(Handel,_George_Frideric)', fullLabel='Complete suite in Handel’s own text (IMSLP)'),
)

EXTRA['handel-rejouissance'] = dict(
  title='La Réjouissance, from Music for the Royal Fireworks, HWV 351',
  subtitle='George Frideric Handel, 1749 · trumpets, horns, timpani, winds and strings · complete movement with its written-out repeats',
  keyName='D major', tempo=112, tempoText='Allegro · practice ♩ = 112', instrument='strings', grand=False,
  staves=[('Trumpet I', 'trumpet'), ('Trumpet II', 'trumpet'), ('Trumpet III', 'trumpet'),
          ('Horn I', 'horn'), ('Horn II', 'horn'), ('Horn III', 'horn'), ('Timpani', 'timpani'),
          ('Violin I', 'violin'), ('Violin II', 'violin'), ('Oboe I', 'oboe'), ('Oboe II', 'oboe'),
          ('Viola', 'viola'), ('Cello', 'cello'), ('Double bass', 'contrabass'), ('Bassoon', 'bassoon'), ('Contrabassoon', 'contrabass')],
  sections=[(0, 'A1', 'First half · trumpets, oboes and strings'), (9, 'A2', 'First half · horns and oboes'),
            (17, 'B1', 'Second half · trumpets, oboes and strings'), (27, 'B2', 'Second half · horns and oboes'),
            (37, 'A3', 'First half · everyone together'), (45, 'B3', 'Second half · everyone together')],
  guide=[('0-4', '“Réjouissance” means rejoicing. The tune is built from a fanfare: repeated notes and a quick turn that climb D, F♯, A, then a leap to high D. Trumpets of Handel’s time had no valves, so fanfares like this, built from the notes of one chord, suited them perfectly.'),
         ('5-8', 'Running notes and a trill-like rocking (E–F♯–E–F♯ in bar 7) carry the first half to A major. The timpani play only D and A, the two notes they were tuned to.'),
         ('9-16', 'Handel planned repeats in changing colours for this music, and this edition writes them out: the horns and oboes repeat the first half on their own, without trumpets, violins or drums: the same music in a softer colour.'),
         ('17-26', 'The second half: an answering phrase that leans on tied notes across the beat, then climbs to C♯ and D before falling back to D major.'),
         ('27-36', 'The horns and oboes take the second half.'),
         ('37-54', 'Everyone together: trumpets, horns, timpani, winds and strings play both halves at full strength. In 1749 Handel’s band for the fireworks had 24 oboes, 12 bassoons, 9 trumpets, 9 horns and 3 pairs of timpani, so this is the moment it was built for.')],
  source=dict(label='PDMX (MuseScore), “Music for the Royal Fireworks – La Réjouissance” · public domain dedication (CC0). The edition’s modern crash-cymbal part is left out.', license='CC0 1.0',
              url=PDMX, full='https://imslp.org/wiki/Music_for_the_Royal_Fireworks,_HWV_351_(Handel,_George_Frideric)', fullLabel='Complete Royal Fireworks scores (IMSLP)'),
)

ZADOK_STAVES = [('Soprano I', 'clarinet'), ('Soprano II', 'clarinet'), ('Alto I', 'clarinet'), ('Alto II', 'clarinet'),
                ('Tenor', 'clarinet'), ('Bass I', 'bassoon'), ('Bass II', 'bassoon'),
                ('Trumpets I–II', 'trumpet'), ('Trumpet III', 'trumpet'), ('Timpani', 'timpani'),
                ('Oboes', 'oboe'), ('Bassoons', 'bassoon'), ('Violin I', 'violin'), ('Violin II', 'violin'),
                ('Violin III', 'violin'), ('Viola', 'viola'), ('Cello', 'cello'), ('Double bass', 'contrabass'),
                ('Continuo', 'contrabass')]
ZADOK_SOURCE = dict(label='PDMX (MuseScore), “Zadok The Priest (Coronation Anthem I) Full score” · public domain dedication (CC0). The complete anthem is split into its three sections, each at its own tempo.',
                    license='CC0 1.0', url=PDMX,
                    full='https://imslp.org/wiki/Zadok_the_Priest,_HWV_258_(Handel,_George_Frideric)', fullLabel='Complete printed scores (IMSLP)')
ZADOK_OF = 'Zadok the Priest, HWV 258 (the complete anthem is the three sections in order)'

EXTRA['handel-zadok-1'] = dict(
  title='Zadok the Priest, HWV 258 — I. “Zadok the priest”',
  subtitle='George Frideric Handel, 1727 · coronation anthem for choir and orchestra · section 1 of 3 (bars 1–30)',
  keyName='D major', tempo=66, tempoText='Andante maestoso · ♩ = 66', instrument='strings', grand=False,
  excerpt=dict(label='section 1 of 3, bars 1–30', of=ZADOK_OF),
  staves=ZADOK_STAVES,
  sections=[(1, 'In', 'The strings’ long build-up'), (23, 'Z', '“Zadok the priest” · the choir bursts in'), (30, 'Co', 'Orchestra closes the section')],
  guide=[('1-8', 'Only strings and continuo, quietly. The violins play the same broken-chord pattern over and over (each chord split into rising notes) while the cellos pulse in repeated eighth notes and the bass steps slowly down: D, C, B, A. Nothing else happens, and that is the point: Handel is making the audience wait.'),
         ('9-16', 'The pattern starts again from A and climbs higher, reaching high D in bar 13, while the bass keeps stepping down. The tension builds without any change in the pattern.'),
         ('17-22', 'The harmony pulls back toward D major and the bass begins to move. Twenty-two bars of waiting are almost over.'),
         ('23-29', 'Seven voice parts, trumpets, timpani, oboes and bassoons all enter at once on “Zadok the priest, and Nathan the prophet, anointed Solomon King.” The choir sings in block chords so every word carries; the violins keep their broken chords above. At the coronation of George II in 1727, this was the moment the king was anointed.'),
         ('30', 'The orchestra rounds off the section; the music changes to three beats a bar for the next part.')],
  source=ZADOK_SOURCE)

EXTRA['handel-zadok-2'] = dict(
  title='Zadok the Priest, HWV 258 — II. “And all the people rejoic’d”',
  subtitle='George Frideric Handel, 1727 · coronation anthem for choir and orchestra · section 2 of 3 (bars 31–62)',
  keyName='D major', tempo=132, tempoText='Allegro · ♩ = 132', instrument='strings', grand=False,
  excerpt=dict(label='section 2 of 3, bars 31–62', of=ZADOK_OF),
  staves=ZADOK_STAVES,
  sections=[(31, 'R', '“And all the people rejoic’d”'), (39, 'R′', 'Again, moving through G and A major'), (49, 'R″', 'B minor, then home to D'), (61, 'S', '“and said:” · slow')],
  guide=[('31-34', 'A dance in three. The choir sings “And all the people rejoic’d” together, and the violins answer with leaping dotted figures that sound like people jumping for joy.'),
         ('35-38', '“Rejoic’d!” becomes a short shout on the beat, with silence around it, while the violins keep dancing. The silences make each shout land harder.'),
         ('39-48', 'The same idea starts again and moves through new keys (G major, then E and A major) so it never sounds like a simple repeat.'),
         ('49-60', 'An A♯ turns the music to B minor for a moment before the choir brings it back to D major for a last round of “rejoic’d.”'),
         ('61-62', 'Adagio: everything slows and the choir sings “and said:” on long chords, ending on a held A-major chord. It is a question that the third section answers.')],
  source=ZADOK_SOURCE)

EXTRA['handel-zadok-3'] = dict(
  title='Zadok the Priest, HWV 258 — III. “God save the King”',
  subtitle='George Frideric Handel, 1727 · coronation anthem for choir and orchestra · section 3 of 3 (bars 63–121)',
  keyName='D major', tempo=96, tempoText='Allegro moderato · ♩ = 96', instrument='strings', grand=False,
  excerpt=dict(label='section 3 of 3, bars 63–121', of=ZADOK_OF),
  staves=ZADOK_STAVES,
  sections=[(63, 'G', '“God save the King!”'), (67, 'A', '“Amen, Alleluia”: runs'), (79, 'G′', '“God save the King!” again'), (88, 'M', '“May the King live for ever”'), (103, 'G″', '“Long live the King”'), (120, 'Fi', 'Final “Alleluia” · Adagio')],
  guide=[('63-66', 'Three shouted acclamations in block chords: “God save the King! Long live the King! God save the King!” Every voice says the words at the same moment, so they ring out like a crowd.'),
         ('67-78', '“Amen, Alleluia”: now the voices move in quick running notes and imitate one another, while the violins race in sixteenths. Shouts turn into celebration.'),
         ('79-87', 'The acclamations return, now in A major, then more “Amens” and “Alleluias.”'),
         ('88-101', '“May the King live for ever”: the music heads into minor keys (B minor, F♯ minor) with long chains of running notes, the busiest counterpoint in the anthem.'),
         ('102-119', '“Long live the King, God save the King” in block chords again, back in D major, then one more round of “for ever, Amen, Alleluia” with the whole orchestra.'),
         ('120-121', 'Adagio: the last “Alleluia” is drawn out over a slow final cadence on D.')],
  source=ZADOK_SOURCE)
