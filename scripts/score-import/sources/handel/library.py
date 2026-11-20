"""Merge the converted Handel scores into data/score-library.json and data/composer-workspaces.json.

    python3 -I scripts/score-import/sources/handel/library.py REPO OUT

OUT holds the converter output (<id>.json) written by reproduce.sh. Library metadata (titles, tempos,
sections, guides, instruments, sources) is added here; notes, keys, meters and pickups come from the
converter unchanged except for the staff labels and instruments listed in STAVES.
"""
import json, sys, os
REPO, OUT = sys.argv[1], sys.argv[2]
MUT = 'https://www.mutopiaproject.org'

CHOIR = ['clarinet', 'clarinet', 'clarinet', 'bassoon']

META = {
  'handel-hallelujah': dict(
    title='“Hallelujah” from Messiah, HWV 56',
    subtitle='George Frideric Handel, 1741 · chorus and orchestra · complete chorus (end of Part II)',
    keyName='D major', tempo=72, tempoText='Allegro · practice ♩ = 72', instrument='strings', grand=False,
    staves=[('Oboes', 'oboe'), ('Bassoons', 'bassoon'), ('Trumpets', 'trumpet'), ('Timpani', 'timpani'),
            ('Violin I', 'violin'), ('Violin II', 'violin'), ('Viola', 'viola'), ('Cellos and basses', 'cello'),
            ('Soprano', 'clarinet'), ('Alto', 'clarinet'), ('Tenor', 'clarinet'), ('Bass', 'bassoon')],
    sections=[(1, 'In', 'Strings’ introduction'), (4, 'H', '“Hallelujah!” in block chords'),
              (12, 'Fo', '“For the Lord God omnipotent reigneth”'), (33, 'K', '“The kingdom of this world”'),
              (41, 'R', '“And He shall reign”: the voices chase'), (52, 'KK', '“King of Kings”: the climb'),
              (69, 'R′', '“And He shall reign” again'), (86, 'Fi', 'Final “Hallelujah!”s')],
    guide=[('1-3', 'The strings alone play the “Hallelujah” rhythm (long, short-short, long) before anyone sings. Listen for it: it comes back dozens of times.'),
           ('4-11', 'The whole choir sings “Hallelujah!” in block chords, every voice on the same rhythm, so the word rings out like one huge voice. That is homophony. The trumpets and timpani are still waiting.'),
           ('12-16', '“For the Lord God omnipotent reigneth”: all four voices sing the same tune in octaves (bars 12–14), then answer themselves with more Hallelujahs. Unison makes the words as clear as a proclamation. The trumpets join in bar 14.'),
           ('17-21', 'The same proclamation, now in the tenors and basses, while the sopranos and altos shout Hallelujahs over the top.'),
           ('22-32', 'Now the sopranos announce “For the Lord God” and the other voices interrupt with Hallelujahs. The two ideas overlap more and more: Handel is starting to mix chords and counterpoint.'),
           ('33-40', '“The kingdom of this world is become the kingdom of our Lord”: suddenly quiet, slow-moving chords, almost like a hymn. The contrast makes the next entry burst out.'),
           ('41-51', '“And He shall reign for ever and ever”: the basses start alone (bar 41), then the tenors take it up (bar 44), the altos (bar 46) and the sopranos (bar 48). One melody passed from voice to voice is imitation, the opposite of block chords.'),
           ('52-68', '“King of Kings, and Lord of Lords”: the sopranos hold long notes that climb higher and higher (A, D, E, F♯, G) while the other voices answer “for ever and ever, Hallelujah!” Each step up raises the tension.'),
           ('69-85', '“And He shall reign” returns, then “King of Kings” is hammered out again by the whole choir and orchestra with trumpets and drums.'),
           ('86-94', 'The final Hallelujahs. In bar 92 everyone breaks off for a dramatic half-bar silence, then the last “Hallelujah” is sung in long notes (bars 93–94), usually slowed right down, ending on a held D-major chord.')],
    source=dict(label='Mutopia Project · typeset by Joshua Koo (Mutopia-2015/01/17-459)', license='Public domain',
                url=MUT + '/cgibin/piece-info.cgi?id=459',
                full='https://imslp.org/wiki/Messiah,_HWV_56_(Handel,_George_Frideric)', fullLabel='Complete Messiah scores (IMSLP)')),
  'handel-air': dict(
    title='Air in B♭ major, from the Aylesford Pieces',
    subtitle='George Frideric Handel · harpsichord or piano · complete',
    keyName='B♭ major', tempo=66, tempoUnit='4.', tempoText='Allegretto · ♩. = 66', instrument='piano',
    staves=[('Right hand', 'piano'), ('Left hand', 'piano')],
    sections=[(1, 'A', 'First half · B♭ major to F major'), (13, 'B', 'Second half · G minor and home to B♭')],
    guide=[('1-4', 'The right hand runs down a scale from B♭ and lands on a short two-note figure, while the left hand answers with its own scale. Two lines that take turns: a small piece of counterpoint.'),
           ('5-8', 'New E naturals point toward F major, and the phrase pauses on a C-major chord in bar 8, the chord that leads to F.'),
           ('9-12', 'The music settles in F major, the key a fifth above B♭. Ending the first half in the dominant key is the usual plan for a Baroque dance or air. Both halves repeat.'),
           ('13-16', 'The second half starts from F with the same falling scale, so you hear the opening idea in the new key.'),
           ('17-20', 'An F♯ appears: the music turns toward G minor, the darker relative minor of B♭, and cadences there in bar 20.'),
           ('21-27', 'Running figures over a bass that passes through E♭ lead the music home to B♭.'),
           ('28-29', 'First and second endings: the low B♭ octave closes the piece.')],
    source=dict(label='Mutopia Project · typeset by Bas Wassink after Edition Schott, 1930 (Mutopia-2013/02/21-162)', license='Public domain',
                url=MUT + '/cgibin/piece-info.cgi?id=162', full=MUT + '/ftp/HandelGF/Aylesford/13-air/13-air-let.pdf', fullLabel='Complete printed score (PDF, Mutopia)')),
  'handel-gavotte': dict(
    title='Gavotte in G major, from the Aylesford Pieces',
    subtitle='George Frideric Handel · harpsichord or piano · complete',
    keyName='G major', tempo=88, tempoText='Gavotte · practice ♩ = 88', instrument='piano',
    staves=[('Right hand', 'piano'), ('Left hand', 'piano')],
    sections=[(0, 'A', 'First half · G major to D major'), (8, 'B', 'Second half · E minor and home to G')],
    guide=[('0-4', 'A gavotte is a French court dance that starts on an upbeat: two quick pickup notes lead into the first bar. The left hand leaps between octaves underneath.'),
           ('5-8', 'The opening phrase again, this time steering to D major, the key a fifth above G, where the first half ends and repeats.'),
           ('8-12', 'The second half begins in D. D♯s in bars 10–11 pull the music toward E minor, which arrives in bar 12.'),
           ('13-15', 'A chain of falling pairs (a sequence) leads back toward G.'),
           ('16-20', 'The right hand drops into a lower register and the phrase winds down to the final G-major cadence; the second half repeats.')],
    source=dict(label='Mutopia Project · typeset by Bas Wassink after Edition Schott, 1930 (Mutopia-2013/02/21-151)', license='Public domain',
                url=MUT + '/cgibin/piece-info.cgi?id=151', full=MUT + '/ftp/HandelGF/Aylesford/03-gavotte/03-gavotte-let.pdf', fullLabel='Complete printed score (PDF, Mutopia)')),
  'handel-sonatina': dict(
    title='Sonatina in B♭ major, HWV 585',
    subtitle='George Frideric Handel · harpsichord or piano · complete',
    keyName='B♭ major', tempo=84, tempoText='Allegro · practice ♩ = 84', instrument='piano',
    staves=[('Right hand', 'piano'), ('Left hand', 'piano')],
    sections=[(1, 'A', 'Theme and imitation in B♭'), (8, 'B', 'To F major'), (11, 'Se', 'Rising sequence'), (17, 'Co', 'Close in B♭')],
    guide=[('1-4', 'Both hands keep moving in quick notes and trade short figures, so neither is just an accompaniment: two equal lines, as in a two-part invention.'),
           ('5-7', 'Broken-chord leaps (each note followed by a high F) keep the motion going over a descending bass.'),
           ('8-10', 'The music climbs to high C and heads for F major, the dominant key, which arrives at the start of bar 11.'),
           ('11-15', 'A sequence: the same short figure starts one step higher in each bar (on F, G, A, B♭), raising the energy.'),
           ('16-19', 'The right hand runs down from high B♭ and both hands meet on the final B♭-major chord.')],
    source=dict(label='Mutopia Project · after Händels Werke (Deutsche Händelgesellschaft, 1859) (Mutopia-98)', license='Public domain',
                url=MUT + '/cgibin/piece-info.cgi?id=98', full=MUT + '/ftp/HandelGF/HWV585/sonatina-in-b-flat-major/sonatina-in-b-flat-major-let.pdf', fullLabel='Complete printed score (PDF, Mutopia)')),
}

EXTRA = {}
extra_file = os.path.join(os.path.dirname(__file__), 'library_extra.py')
if os.path.exists(extra_file):
    exec(open(extra_file).read())
META.update(EXTRA)

GROUPS = [
  ('messiah', 'Messiah, HWV 56 (1741)', 'The complete “Hallelujah” chorus in full score: orchestra, trumpets and timpani, and the four choir voices. Choose a voice as the source staff to follow it alone.', ['handel-hallelujah']),
  ('coronation', 'Zadok the Priest, HWV 258 (1727)', 'The coronation anthem for George II, in full score, in its three sections. Play them in order for the complete anthem.', ['handel-zadok-1', 'handel-zadok-2', 'handel-zadok-3']),
  ('fireworks', 'Music for the Royal Fireworks, HWV 351 (1749)', 'La Réjouissance (“The Rejoicing”) for the 1749 fireworks in Green Park.', ['handel-rejouissance']),
  ('opera', 'Opera', '“Ombra mai fu” from Serse (1738).', ['handel-ombra-mai-fu']),
  ('keyboard', 'Harpsichord pieces', 'The Sarabande theme from the Suite in D minor, HWV 437, then complete short pieces: two Aylesford Pieces and a sonatina.', ['handel-sarabande', 'handel-air', 'handel-gavotte', 'handel-sonatina']),
]

lib_path = os.path.join(REPO, 'data/score-library.json')
lib = json.load(open(lib_path))
done = []
for sid, meta in META.items():
    path = os.path.join(OUT, sid + '.json')
    if not os.path.exists(path):
        print('skip (not converted):', sid); continue
    conv = json.load(open(path))
    staves = conv['staves']
    assert len(staves) == len(meta['staves']), (sid, len(staves), len(meta['staves']))
    for st, (label, inst) in zip(staves, meta['staves']):
        st['label'] = label; st['instrument'] = inst
        for k, v in meta.get('staff_extra', {}).get(label, {}).items(): st[k] = v
    entry = dict(title=meta['title'], subtitle=meta['subtitle'], composer='George Frideric Handel',
                 keyName=meta['keyName'], key=conv['key'], time=conv['time'])
    if conv.get('pickup'): entry['pickup'] = conv['pickup']
    if conv.get('startMeasure'): entry['startMeasure'] = conv['startMeasure']
    entry['tempo'] = meta['tempo']
    if meta.get('tempoUnit'): entry['tempoUnit'] = meta['tempoUnit']
    entry['tempoText'] = meta['tempoText']
    entry['instrument'] = meta['instrument']
    if 'grand' in meta: entry['grand'] = meta['grand']
    if meta.get('excerpt'): entry['excerpt'] = meta['excerpt']
    else: entry['complete'] = True
    entry['sections'] = [dict(bar=b, label=l, name=n) for b, l, n in meta['sections']]
    entry['guide'] = [dict(bars=b, text=t) for b, t in meta['guide']]
    entry['staves'] = staves
    entry['source'] = meta['source']
    lib['scores'][sid] = entry
    done.append(sid)
open(lib_path, 'w').write(json.dumps(lib, indent=2, ensure_ascii=False) + '\n')

ws_path = os.path.join(REPO, 'data/composer-workspaces.json')
ws = json.load(open(ws_path))
groups = [dict(key=k, label=l, hint=h, scores=[s for s in ids if s in lib['scores']]) for k, l, h, ids in GROUPS]
groups = [g for g in groups if g['scores']]
ws['handel'] = dict(scores=[s for g in groups for s in g['scores']], groups=groups)
open(ws_path, 'w').write(json.dumps(ws, indent=2, ensure_ascii=False) + '\n')
print('library:', ', '.join(done))
