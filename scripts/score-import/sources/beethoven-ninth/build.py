"""Cut the converted Ninth Symphony finale into its sections and add them to the library.

    python3 -I scripts/score-import/sources/beethoven-ninth/build.py REPO OUT

OUT/b9-finale.json is the whole finale as reproduce.sh converts it. The engine plays one tempo per
score, and the finale has dozens of tempo marks, so each section with one main tempo becomes its own
score (slice-bars.py). Positions are 1-based in the converted bar list; the edition's bar 0 is its
first (pickup) bar, so edition bar N is position N + 1.
"""
import json, os, subprocess, sys
REPO, OUT = sys.argv[1], sys.argv[2]
SLICE = os.path.join(REPO, 'scripts/score-import/slice-bars.py')
PDMX = 'https://zenodo.org/records/15571083'

STAVES = [('Soloists · soprano and alto', 'clarinet'), ('Soloists · tenor and baritone', 'bassoon'),
          ('Choir · sopranos and altos', 'clarinet'), ('Choir · tenors and basses', 'bassoon'),
          ('Orchestra (piano) · right hand', 'piano'), ('Orchestra (piano) · left hand', 'piano')]
SOURCE = dict(
  label='PDMX (MuseScore), “Beethoven Symphony No. 9 (4th movement) Piano solo with chorus”, adapted from published '
        'piano-vocal arrangements · public domain dedication (CC0). The orchestra is a piano reduction. Bar numbers follow '
        'this edition: they match Beethoven’s full score up to the end of the march, after which the edition runs 12–15 bars shorter.',
  license='CC0 1.0', url=PDMX,
  full='https://imslp.org/wiki/Symphony_No.9,_Op.125_(Beethoven,_Ludwig_van)', fullLabel='Complete orchestral score (IMSLP)')
OF = 'the finale of Symphony No. 9 in D minor, Op. 125 (1824)'
SUB = 'Ludwig van Beethoven, 1824 · soloists, choir and orchestra (piano reduction) · '

SECTIONS = [
 ('beethoven-9-finale-theme', 92, 206, dict(
   title='Symphony No. 9 · Finale · the “Joy” theme in the orchestra',
   subtitle=SUB + 'bars 92–206, Allegro assai', keyName='D major', tempo=80, tempoUnit='2', tempoText='Allegro assai · 𝅗𝅥 = 80',
   sections=[(92, 'Vc', 'Cellos and basses alone'), (116, 'Va', 'Violas and cellos, with a bassoon countermelody'),
             (140, 'Vn', 'Violins, with three lines below'), (164, 'Tu', 'Full orchestra'), (188, 'Co', 'Coda')],
   guide=[('92-115', 'This is how the orchestra first plays the Ode to Joy theme: quietly, in the cellos and double basses alone (the left hand here), with no accompaniment at all. You hear the 16-bar theme and then a repeat of its second half, 24 bars in all. Compare it with the melody-only “Ode to Joy” score.'),
          ('116-139', 'The theme moves up into the violas and cellos, and a new countermelody (a bassoon in the orchestra) winds around it while the basses add a walking line. Same tune, one more layer.'),
          ('140-163', 'Now the violins carry the theme an octave higher, with three moving parts underneath. Each time the theme comes back, Beethoven adds instruments and counterpoint.'),
          ('164-187', 'The whole orchestra, trumpets and timpani included, plays the theme loudly in full chords. In under a hundred bars the quiet tune has grown into a public anthem.'),
          ('188-206', 'The coda breaks away from the tune, climbs through new keys, pauses briefly (poco ritenuto, poco adagio in bars 202–203) and drives toward a cadence. In the symphony a violent Presto interrupts here, and a singer answers it.')])),
 ('beethoven-9-finale-recitative', 215, 235, dict(
   title='Symphony No. 9 · Finale · “O Freunde, nicht diese Töne!”',
   subtitle=SUB + 'bars 215–235, the baritone’s recitative', keyName='D minor', tempo=72, tempoText='Recitativo · sung freely · practice ♩ = 72',
   sections=[(215, 'O', '“O Freunde, nicht diese Töne!”'), (223, 'So', '“sondern lasst uns angenehmere anstimmen”')],
   guide=[('215-222', 'For the first time in a symphony, a singer enters. The baritone sings words Beethoven wrote himself: “O Freunde, nicht diese Töne!” (“O friends, not these sounds!”). His melody echoes the speech-like recitative the cellos and basses played, without words, at the start of the finale: now the “speech” has its text.'),
          ('223-235', '“sondern lasst uns angenehmere anstimmen, und freudenvollere” (“but let us sing more pleasant and more joyful ones”). The long run on “freudenvollere” (“more joyful”) stretches one syllable over many notes. A recitative is sung freely, like speech; the steady practice tempo here only helps you follow it.')])),
 ('beethoven-9-finale-chorus', 236, 330, dict(
   title='Symphony No. 9 · Finale · “Freude, schöner Götterfunken”',
   subtitle=SUB + 'bars 236–330, the voices sing the theme', keyName='D major', tempo=80, tempoUnit='2', tempoText='Allegro assai · 𝅗𝅥 = 80',
   sections=[(236, 'Fr', '“Freude!” calls'), (240, 'V1', 'Verse 1 · baritone'), (256, 'C1', 'Choir answers'),
             (268, 'V2', 'Verse 2 · solo quartet'), (284, 'C2', 'Choir answers'), (295, 'V3', 'Verse 3 · solo quartet'),
             (312, 'C3', 'Choir · “und der Cherub steht vor Gott”')],
   guide=[('236-239', 'The baritone calls “Freude!” (“Joy!”) and the basses of the choir shout it back.'),
          ('240-255', 'The baritone sings the theme with Schiller’s words: “Freude, schöner Götterfunken, Tochter aus Elysium” (“Joy, beautiful spark of the gods, daughter of Elysium”). It is the same melody the cellos played, now with words: a melody that moves by step is easy for voices.'),
          ('256-267', 'The choir repeats the second half of the verse (“Deine Zauber binden wieder…”, “Your magic joins again what custom sternly divided; all people become brothers”), and the orchestra links to the next verse.'),
          ('268-283', 'Verse 2 for the four soloists: “Wem der große Wurf gelungen, eines Freundes Freund zu sein” (“Whoever has had the great fortune to be a friend’s friend”). The voices weave around the tune instead of all singing it.'),
          ('284-294', 'The choir answers again, and the orchestra leads on.'),
          ('295-311', 'Verse 3: “Freude trinken alle Wesen an den Brüsten der Natur” (“All creatures drink joy at nature’s breast”). The soloists’ lines grow more ornamented.'),
          ('312-330', 'The choir ends on “und der Cherub steht vor Gott!” (“and the cherub stands before God!”), repeating “vor Gott” louder and higher until the whole chorus and orchestra hold a huge chord. Then silence, and the music turns somewhere unexpected.')])),
 ('beethoven-9-finale-march', 331, 579, dict(
   title='Symphony No. 9 · Finale · Alla marcia: tenor solo, fugato and choir',
   subtitle=SUB + 'bars 331–579, Allegro assai vivace (alla marcia)', keyName='B♭ major', tempo=84, tempoUnit='4.', tempoText='Allegro assai vivace, alla marcia · ♩. = 84',
   sections=[(331, 'In', 'Distant band'), (343, 'Ma', 'The theme as a march'), (375, 'Te', 'Tenor solo · “Froh, wie seine Sonnen”'),
             (411, 'Ch', 'Men’s choir joins'), (431, 'Fu', 'Orchestral fugato'), (517, 'F♯', 'The long F♯'),
             (543, 'Fr', 'Full choir · “Freude, schöner Götterfunken”'), (575, 'Tr', 'Turn to G major')],
   guide=[('331-342', 'A complete change: B♭ major, 6/8, and very quiet low offbeats. In the orchestra this is bassoons, contrabassoon and bass drum, then triangle and cymbals: a “Turkish” military band, as if heard from far away.'),
          ('343-374', 'The wind band plays the Joy theme reshaped as a march in 6/8, with a skipping long–short rhythm.'),
          ('375-410', 'The tenor sings “Froh, wie seine Sonnen fliegen… laufet, Brüder, eure Bahn, freudig wie ein Held zum Siegen” (“Gladly, as His suns fly through the glorious plan of heaven, run your course, brothers, joyfully, like a hero to victory”).'),
          ('411-430', 'The men of the choir join the tenor for “laufet, Brüder, eure Bahn” and the march reaches its goal.'),
          ('431-516', 'The orchestra alone: a fast fugato built from the theme. Lines chase each other through new keys, getting more and more urgent: a musical battle.'),
          ('517-542', 'Everything settles onto a single note, F♯, repeated in octaves for more than twenty bars and fading away. Quiet chords (bars 529 and 535) hint that the music is about to land somewhere new.'),
          ('543-574', 'It lands in D major: the whole choir sings the first verse, “Freude, schöner Götterfunken”, fortissimo, while the orchestra races in quick notes around them.'),
          ('575-579', 'The orchestra swings round to G major, ready for the next hymn.')])),
 ('beethoven-9-finale-seid-umschlungen', 580, 641, dict(
   title='Symphony No. 9 · Finale · “Seid umschlungen, Millionen!”',
   subtitle=SUB + 'bars 580–641, Andante maestoso and Adagio ma non troppo, ma divoto', keyName='G major', tempo=72, tempoUnit='2', tempoText='Andante maestoso · 𝅗𝅥 = 72 (Adagio from bar 613)',
   sections=[(580, 'Se', '“Seid umschlungen, Millionen!”'), (597, 'Br', '“Brüder, überm Sternenzelt”'),
             (613, 'Ih', 'Adagio · “Ihr stürzt nieder, Millionen?”'), (629, 'Üb', '“Über Sternen muss er wohnen”')],
   guide=[('580-596', 'A new melody, broad and solemn like a hymn, in 3/2. The tenors and basses (with trombones in the orchestra) sing “Seid umschlungen, Millionen! Diesen Kuss der ganzen Welt!” (“Be embraced, you millions! This kiss is for the whole world!”), then the whole choir repeats it.'),
          ('597-612', '“Brüder, überm Sternenzelt muss ein lieber Vater wohnen” (“Brothers, above the canopy of stars a loving Father must dwell”): the men first, then the women.'),
          ('613-628', 'Adagio ma non troppo, ma divoto (slow, devout). “Ihr stürzt nieder, Millionen? Ahnest du den Schöpfer, Welt? Such ihn überm Sternenzelt!” (“Do you fall down, millions? Do you sense the Creator, world? Seek Him above the stars!”). The harmony becomes mysterious and unstable. In the orchestra this is marked a little slower than the Andante; the player keeps one tempo.'),
          ('629-641', '“Über Sternen muss er wohnen” (“He must dwell above the stars”): very quiet held chords, with the violins shimmering above, as if looking up at the night sky.')])),
 ('beethoven-9-finale-double-fugue', 642, 750, dict(
   title='Symphony No. 9 · Finale · double fugue: “Freude” and “Seid umschlungen” together',
   subtitle=SUB + 'bars 642–750, Allegro energico, sempre ben marcato', keyName='D major', tempo=84, tempoUnit='2.', tempoText='Allegro energico, sempre ben marcato · 𝅗𝅥. = 84',
   sections=[(642, 'DF', 'The two themes at once'), (666, 'Fu', 'The double fugue grows'), (718, 'Ih', '“Ihr stürzt nieder”'), (726, 'Su', '“Such’ ihn überm Sternenzelt”')],
   guide=[('642-665', 'Beethoven’s big reveal: the Joy theme (sopranos, “Freude, schöner Götterfunken”, now in 6/4) and the “Seid umschlungen” hymn (altos) sung at the same time. Two melodies heard separately earlier turn out to fit together. A fugue with two subjects like this is a double fugue.'),
          ('666-717', 'The pair of themes passes through all four sections of the choir, each entry overlapping the last. Follow the Choir staves and listen for “Freude” in one voice while another sings “Seid umschlungen.”'),
          ('718-725', 'Suddenly quiet: the men ask again, “Ihr stürzt nieder, Millionen? Ahnest du den Schöpfer, Welt?”'),
          ('726-750', '“Such’ ihn überm Sternenzelt! Brüder, überm Sternenzelt muss ein lieber Vater wohnen.” The choir holds long, hushed notes; the energy drains away before the final race.')])),
 ('beethoven-9-finale-allegro', 751, 838, dict(
   title='Symphony No. 9 · Finale · Allegro ma non tanto and the soloists’ cadenza',
   subtitle=SUB + 'bars 751–838, Allegro ma non tanto', keyName='D major', tempo=120, tempoUnit='2', tempoText='Allegro ma non tanto · 𝅗𝅥 = 120 (two short Poco adagio passages)',
   sections=[(751, 'Fr', '“Freude, Tochter aus Elysium”'), (770, 'De', '“Deine Zauber”'), (794, 'Al', 'Choir · “Alle Menschen”'),
             (806, 'De′', 'Choir · “Deine Zauber” again'), (818, 'Ca', 'Soloists’ cadenza'), (831, 'Ac', 'Accelerating')],
   guide=[('751-769', 'A fast new section. The soloists toss “Freude, Tochter aus Elysium!” back and forth in quick imitation.'),
          ('770-793', 'All four soloists, then the choir, sing “Deine Zauber binden wieder, was die Mode streng geteilt” in overlapping lines.'),
          ('794-805', 'The choir: “Alle Menschen, alle Menschen werden Brüder” (“All people become brothers”). At “werden Brüder” the music suddenly slows (Poco adagio), then picks up again.'),
          ('806-817', 'The choir repeats “Deine Zauber…” and “Alle Menschen…” with growing force.'),
          ('818-830', 'The famous moment for the four soloists: “wo dein sanfter Flügel weilt” (“where your gentle wing rests”) slows into an ornamented cadenza, turning briefly to a distant key (B major, bar 824) before coming home.'),
          ('831-838', 'Poco allegro, then faster and faster (accelerando), launching the Prestissimo.')])),
 ('beethoven-9-finale-prestissimo', 839, 928, dict(
   title='Symphony No. 9 · Finale · Prestissimo: the ending',
   subtitle=SUB + 'bars 839–928, Prestissimo', keyName='D major', tempo=136, tempoUnit='2', tempoText='Prestissimo · practice 𝅗𝅥 = 136 (Maestoso, bars 904–907)',
   sections=[(839, 'Pr', 'Prestissimo'), (843, 'Se', '“Seid umschlungen”'), (852, 'Br', '“Brüder, überm Sternenzelt”'),
             (865, 'Ku', '“Diesen Kuss der ganzen Welt”'), (892, 'Fr', '“Freude, schöner Götterfunken”'), (904, 'Ma', 'Maestoso'),
             (908, 'Fi', 'Prestissimo to the end')],
   guide=[('839-851', 'The fastest music in the symphony. In the orchestra the “Turkish” percussion returns (triangle, cymbals, bass drum). The choir shouts “Seid umschlungen, Millionen! Diesen Kuss der ganzen Welt!”'),
          ('852-864', '“Brüder, überm Sternenzelt muss ein lieber Vater wohnen,” sung at top speed.'),
          ('865-891', '“Seid umschlungen… diesen Kuss der ganzen Welt!” repeated again and again, each “der ganzen Welt” (“of the whole world”) hammered home.'),
          ('892-903', '“Freude, schöner Götterfunken” one last time, now in long notes over the racing orchestra.'),
          ('904-907', 'Maestoso: everything suddenly broadens and slows for the choir’s last words, “Tochter aus Elysium! Freude, schöner Götterfunken, Götterfunken!” (the player keeps one tempo; imagine it much slower).'),
          ('908-928', 'Prestissimo again: the choir’s final “-funken!”, then the orchestra races alone to the last D-major chords. At the 1824 premiere Beethoven, almost completely deaf, had to be turned around to see the audience applauding.')])),
]

lib_path = os.path.join(REPO, 'data/score-library.json')
lib = json.load(open(lib_path))
src = os.path.join(OUT, 'b9-finale.json')
made = []
for sid, a, b, meta in SECTIONS:
    raw = subprocess.check_output(['python3', '-I', SLICE, src, str(a + 1), str(b + 1), str(a)])
    conv = json.loads(raw)
    assert len(conv['staves']) == len(STAVES)
    for st, (label, inst) in zip(conv['staves'], STAVES):
        st['label'] = label; st['instrument'] = inst
    entry = dict(title=meta['title'], subtitle=meta['subtitle'], composer='Ludwig van Beethoven',
                 keyName=meta['keyName'], key=conv['key'], time=conv['time'], startMeasure=conv['startMeasure'],
                 tempo=meta['tempo'])
    if meta.get('tempoUnit'): entry['tempoUnit'] = meta['tempoUnit']
    entry.update(tempoText=meta['tempoText'], instrument='piano',
                 excerpt=dict(label='bars %d–%d' % (a, b), of=OF),
                 sections=[dict(bar=x, label=l, name=n) for x, l, n in meta['sections']],
                 guide=[dict(bars=r, text=t) for r, t in meta['guide']],
                 staves=conv['staves'], source=SOURCE)
    lib['scores'][sid] = entry
    made.append(sid)
open(lib_path, 'w').write(json.dumps(lib, indent=2, ensure_ascii=False) + '\n')

ws_path = os.path.join(REPO, 'data/composer-workspaces.json')
ws = json.load(open(ws_path))
bv = ws['beethoven']
groups = [g for g in bv['groups'] if g['key'] != 'ninth']
for g in groups:
    if g['key'] == 'symphonies':
        g['scores'] = [s for s in g['scores'] if s != 'beethoven-ode-to-joy']
        g['label'] = 'Orchestra · Symphonies Nos. 5 and 7'
        g['hint'] = 'Complete movements in full score, ordered by symphony number.'
ninth = dict(key='ninth', label='Orchestra · Symphony No. 9 · finale (“Ode to Joy”)',
             hint='The Ode to Joy melody on its own, then the finale in order, section by section (soloists, choir and a piano reduction of the orchestra). Each section plays at its own tempo.',
             scores=['beethoven-ode-to-joy'] + made)
i = [g['key'] for g in groups].index('symphonies')
groups.insert(i + 1, ninth)
bv['groups'] = groups
bv['scores'] = [s for g in groups for s in g['scores']]
open(ws_path, 'w').write(json.dumps(ws, indent=2, ensure_ascii=False) + '\n')
print('library:', ', '.join(made))
