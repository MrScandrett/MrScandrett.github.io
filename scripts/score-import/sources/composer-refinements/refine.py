"""Rebuild seven source-based classroom studies. Run from any working directory.
Hand transcriptions from the historical pages listed in README.md, not the
DCMLab encodings. Each list item is one displayed bar. Reductions are disclosed.
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
p = ROOT / 'data/score-library.json'
lib = json.loads(p.read_text())
scores = lib['scores']

def staff(label, clef, bars, instrument='piano'):
    return dict(label=label, clef=clef, instrument=instrument, notes=' | '.join(bars))

def update(id, title, scope, upper, lower, guide, source_detail, *, start=1, key=None):
    s = scores[id]
    s.update(title=title, subtitle='Jelly Roll Morton · melody and source-bass study',
             complete=False, grand=True, ending='open',
             staves=[staff('Melody · chord interiors omitted', 'treble', upper),
                     staff('Source bass · selected lower notes', 'bass', lower)],
             excerpt=dict(label=scope, of='the complete piano composition'),
             guide=[dict(bars=b, text=t) for b,t in guide],
             sections=[dict(bar=start,label='Study',name=scope)])
    if key is not None: s['key']=key
    if start != 1:
        for st in s['staves']: st['notes']=f'@N:{start} '+st['notes']
    source=s['source']
    source['label']=source_detail+' Fresh classroom reduction: melody and selected source bass; inner chord tones, pedal, slurs and expressive timing omitted. Repeats omitted unless marked; practice tempo.'
    source['license']='Historical edition public domain in the United States; new classroom transcription dedicated to CC0 1.0'

# Rossiter 1915, musical page 1: four-bar introduction.
update('morton-jelly','Original Jelly Roll Blues · introduction with source bass',
       'Introduction, bars 1–4',[
 'r/8. Gb6/16 Db6/8. Bb5/16 Gb5/8. Db6/16 Bb5/8. Gb5/16',
 'r/8. Gb5/16 Db5/8. Bb4/16 Gb4/8. Db5/16 Bb4/8. Gb4/16',
 'r/8. Db4/16 Gb4/8. Bb4/16 Eb5/8. Db5/16 Eb5/8. E5/16',
 'F5/4 r/4 F6/8 r/8 r/4',
], [
 'Bb4/2 Gb4/2', '@C:bass Bb3/2 Gb3/2', 'Gb2/2~ Gb2/4 Gb3/4', 'F3/4 r/4 F2/8 r/8 r/4',
], [('1-4','The introduction falls through a G-flat sonority in two registers. The selected lower notes make its changing foundation audible.'),
],
 'Will Rossiter, 1915, musical page 1 (Lilly Library LL-SDV-023048).')

scores['morton-jelly']['staves'][1]['clef']='treble'

# Darewski printed p.7: the complete twelve-bar opening, before “Stomp”.
update('morton-new-orleans','New Orleans Blues · twelve-bar opening study',
 'Bars 1–12 · opening before the Stomp section',[
 'r/8 F4/8 G4/8 F5/8~ F5/2',
 'Bb5/8 Bb6/8 Ab5/8 Ab6/8 F5/8 F6/8 D5/8 D6/8',
 'Bb5/8 Bb6/8 Ab5/8 Ab6/8 F5/8 F6/8 D5/8 D6/8',
 'Bb4/8 Bb5/8 An4/8 A5/8 F4/8 F5/8 D4/8 D5/8',
 'r/8 F5/8 F5/8 F5/8~ F5/2',
 'r/4 G5/8 G5/8~ G5/8 C5/8 Bb4/8 G4/8',
 'r/8 Bb5/4 G5/8 Bb5/8 G5/8 F5/8 G5/8',
 'r/8 F5/8 G5/8 D5/8 F5/8 G5/4.',
 'r/8 F4/16 G4/16 G#4/8 A4/8 C5/8 A4/8 G5/4~',
 'G5/4 r/4 C#5/8 D5/8 Bb4/8 G4/8',
 'Bb4/4 F5/8 En5/8 Eb5/8 F4/8 G4/8 Eb5/8',
 'C5/4 D5/8 C5/8 F4/8~ F4/8 F4/8 C5/8',
], [
 'Bb1/4. F3/8~ F3/4 F2/4', 'Bb1/4 r/4 r/2', 'Bb1/4 r/4 r/2', 'Bb1/4 C2/4 C#2/4 D2/4',
 'Eb2/4. G3/8~ G3/4 F1/4', 'Eb2/4. Eb3/8~ Eb3/4 Eb2/4',
 'Bb1/4. F3/8~ F3/4 F2/4', 'Bb1/4. F3/8~ F3/4 F2/4',
 'Eb2/4. G3/8~ G3/4 F2/4', 'D2/4. F3/8~ F3/4 F2/4',
 'Bb2/4 F2/4 G2/4 A2/4', 'Bb2/4. F3/8~ F3/4 F2/4',
], [('1-4','Listen for the bass rhythm beneath the octave-leaping line. Bars 2–3 now realize the printed 8va; bar 4 returns to the written register.'),
    ('5-8','Short chords in the print support a longer tune. Here only the upper note and lowest note of each source event are retained.'),
    ('9-12','Chromatic steps and the moving bass bring the opening to its repeat boundary. This study plays it once; the high Stomp section follows in the complete print.')],
 'Blues and Stomps, Book 1, Herman Darewski, 1923, 1925–27, printed page 7, IMSLP #589177.')

# Darewski p.4, bars 5–12: eight-bar opening phrase after the introduction.
update('morton-king','King Porter Stomp · eight-bar opening phrase study',
 'Source bars 5–12 · first phrase after the introduction',[
 'Eb4/4 Eb4/8 F4/8 Eb4/8 F4/8 Eb4/4',
 'Eb4/4 Eb4/8 F4/8 Eb4/8 F4/8 Eb4/4',
 'r/8 Ab4/8 Gn4/8 Ab4/8 C5/4. Bb4/8',
 'An4/8 Ab4/4 C5/8~ C5/8 D5/8 Bb4/8 G4/8',
 'r/8 G4/8 F#4/8 G4/8 Eb5/8 D5/4.',
 'F#4/8 G4/4. Eb5/8 D5/4.',
 'r/8 C5/8 Bn4/8 C5/8 F5/4 En5/4',
 'F5/8 E5/8 Eb5/8 C5/8 Bn4/8 A4/8 G4/8 F4/8',
], [
 'Ab2/4 Ab2/4 Ab2/4 Gb2/4', 'F2/4 F2/4 F2/4 F2/4',
 'Ab1/4 Eb3/4 Ab2/4 Eb3/4', 'C3/4 Eb3/4 Ab2/4 Eb3/4',
 'Eb2/4 Eb3/4 G2/4 Eb3/4', 'Eb2/4 Eb3/4 G2/4 Eb3/4',
 'Ab2/4 Eb3/4 Bb2/4 Bn2/4', 'Bb2/8 r/8 r/4 r/2',
], [('5-6','The repeated E-flat riff sits above changing bass notes. Compare the bass beneath the same melody in the two bars.'),
    ('7-8','The melody leaves the riff for an answering phrase while low notes alternate with higher accompaniment attacks.'),
    ('9-10','A chromatic pickup leads to a sustained response. Keep the bass pulse steady beneath the syncopation.'),
    ('11-12','The line rises, then descends into a break. The complete score continues with a restatement and further strains.')],
 'Blues and Stomps, Book 1, Herman Darewski, 1923, 1925–27, printed page 4, IMSLP #589177.', start=5, key=-4)
scores['morton-king']['keyName']='A-flat major'

# Darewski p.8, third system and its eight-bar continuation through the cadence.
update('morton-black-bottom','Black Bottom Stomp · eight-bar melodic passage study',
 'Eight-bar passage beginning at the third system on printed page 8',[
 'r/4 C#5/8 D5/8~ D5/8 Bb4/8 G4/4',
 'C5/8 C5/4 C5/8 Bb4/4 r/4',
 'r/8 D5/4+> Bn4/8 Bb4/8 A4/8 G4/8 D4/8',
 'A4/8 F4/8 D4/8 Bn3/8~ B3/4 r/4',
 'G4/4 An4/2 Bb4/4', 'F4/2 Eb4/2', 'G4/4 An4/2 Bb4/4',
 'Ab4/8 G4/8 G4/8 {3 Bb4/8 C5/8 Bb4/8 } Ab4/8 G4/4',
], [
 'G2/4 D3/4 D2/4 D3/4', 'A2/4 D3/4 Eb2/4 D3/4',
 'G2/4 D3/4 D2/4 D3/4', 'G2/4 D3/4 D2/4 D3/4',
 'C2/4 D2/2 Eb2/4', 'F3/1', 'C2/4 D3/2 D3/4', 'C2/2 F2/2',
], [('1-2','A tied melodic note crosses the beat while the selected bass keeps four clear attacks. Compare each hand alone, then together.'),
    ('3-4','The accented answer descends through the register and leaves a rest. The bass continues the underlying pulse.'),
    ('5-6','Longer notes create contrast after the busy line. Inner chords and the sustained secondary voice are omitted from this reduction.'),
    ('7-8','The cadence includes a triplet turn. The complete piano print continues into another passage; this is an eight-bar study, not the full band arrangement.')],
 'Blues and Stomps, Book 1, Herman Darewski, 1923, 1925–27, printed page 8, IMSLP #589177.')



# First-edition Demets plate E.1158 D, p.2. Only the five fully metered
# opening bars: no invented tuplet ratios to force the later free runs into time.
noct_upper = [
 '!pp An5/16 (Bb5 Eb6)/16 F5/16 (Gb5 Bb5)/16~ (Gb5 Bb5)/8 Gn5/16 (Ab5 C6)/16 An5/16 (Bb5 Eb6)/16 Bn5/16 (C6 F6)/16',
 '!pp An5/16 (Bb5 Eb6)/16 F5/16 (Gb5 Bb5)/16~ (Gb5 Bb5)/8 Gn5/16 (Ab5 C6)/16 An5/16 (Bb5 Eb6)/16 Bn5/16 (C6 F6)/16',
 '{3 Eb6/16+> Ab5/16 Eb5/16 Db6/16 Ab5/16 Db5/16 Ab5/16 F5/16 Ab4/16 } {3 !mf Eb5/16+> Ab4/16 Eb4/16 Db5/16 Ab4/16 Db4/16 Ab4/16 F4/16 Ab3/16 }',
 '!pp E#4/16 (F#4 C#5)/16 En4/16 (E#4 B4)/16~ B4/8 E#4/16 (F#4 B4)/16 D#4/16 B4/16 C#4/16 A4/16',
 'E#4/16 (F#4 C#5)/16 En4/16 (E#4 B4)/16~ B4/8 E#4/16 (F#4 B4)/16 D#4/16 (En4 B4)/16 B#3/16 (C#4 A4)/16',
]
noct_lower = [
 '{3 Gb5/8 C5/8 Ab4/8 } {3 Fb5/8 Bb4/8 Gb4/8 } {3 Ab5/8 Dn5/8 Bb4/8 }',
 '{3 Gb5/8 C5/8 Ab4/8 } {3 Fb5/8 Bb4/8 Gb4/8 } {3 Ab5/8 Dn5/8 Bb4/8 }',
 '{3 Db4/8 Ab4/8 En5/8 } r/8 @C:bass {3 Ab3/8 En4/8 Db3/8 } r/8',
 '{3 En3/8 G#3/8 Dn4/8 } {3 F#4/8 D4/8 G#3/8 } A3/8 En4/8',
 '@C:bass {3 En3/8 G#3/8 Dn4/8 } {3 F#4/8 D4/8 G#3/8 } {3 A2/8 En3/8 A3/8 }',
]
miroirs_url='https://imslp.org/wiki/Miroirs_(Ravel,_Maurice)'
miroirs_full='https://imslp.org/wiki/Special:ImagefromIndex/918861'
def ravel_source(plate, pages, detail):
    return dict(label=f'E. Demets first edition, Paris, 1906, plate {plate}, printed {pages}. '+detail,
                license='Historical edition public domain in the United States; new classroom transcription dedicated to CC0 1.0',
                url=miroirs_url,full=miroirs_full,fullLabel='Complete 1906 piano edition (IMSLP #918861)')
scores['ravel-noctuelles-opening'].update(
 title='Noctuelles · metered opening texture study',
 subtitle='Maurice Ravel · Miroirs · piano · bars 1–5 (excerpt)', complete=False, grand=True, ending='open',
 staves=[staff('Right hand','treble',noct_upper),staff('Left hand','treble',noct_lower)],
 excerpt=dict(label='Metered opening, bars 1–5',bars='1-5',of='Miroirs: Noctuelles'),
 sections=[dict(bar=1,label='Opening',name='Flickering opening texture')],
 guide=[dict(bars='1-2',text='The right hand flickers in sixteenths against left-hand eighth-note triplets: compare the two subdivisions, then hear them together.'),
        dict(bars='3',text='The falling right-hand triplets accelerate the gesture. The lower hand changes register and clef; follow the written pitches rather than assuming that the bottom staff is always low.'),
        dict(bars='4-5',text='Chromatic figures move into a lower register. This study stops before the freer runs in bars 6–7; use the original page to discuss how their spacing differs from measured rhythm.')],
 source=ravel_source('E.1158 D','page 2','Independent reading of the printed opening. Notes, chords, written rhythms and selected dynamics retained; slurs, hairpins and pedal are not reproduced. No free-run timing is inferred.'))

# Demets plate E.1159 D, p.11. A deliberately new two-layer reduction:
# printed upper melody plus lower-staff ostinato/bass; the middle RH voice is
# omitted. The simultaneous 4/4 and 12/8 grids are aligned with triplets.
bird_upper=[
 '!pp Bb5/8+> Bb5/4.+. Bb5/8+> Bb5/4.+.',
 '{3 Gb5/32 Db6/32 F6/32 Eb6/32 Bb5/16. Eb5/32 Ab5/8~ } Ab5/4 {3 Gb5/32 Db6/32 F6/32 Eb6/32 Bb5/16. Eb5/32 Ab5/8~ } Ab5/4',
 '@T:3/4 Eb5/8+.+> Eb5/4+. Eb5/8+.+> Eb5/4~',
 '@T:4/4 Eb5/8 r/8 r/4 Eb5/8+.+> Eb5/4+. r/8',
 'r/4 Eb5/8+.+> Eb5/4+. r/8 r/4',
 '@T:12/8 Dn4/4+> A#3/8 D4/4+> A#3/8 D4/4.+> A#3/8 D4/8 A#4/8',
 '@T:4/4 Bb5/8+.+> Bb5/4.+. Bb5/8+.+> Bb5/4.+.',
]
bird_ostinato=[
 'R','R','@T:3/4 R',
 '@T:4/4 {3 r/8 Gb3/8 Ab3/8~ Ab3/8 Gb3/8 Ab3/8~ Ab3/8 Gb3/8 Ab3/8~ Ab3/8 Gb3/8 Ab3/8~ }',
 '{3 Ab3/8 Gb3/8 Ab3/8~ Ab3/8 Gb3/8 Ab3/8 G#3/8 F#3/8 G#3/8~ G#3/8 F#3/8 G#3/8~ }',
 '@T:12/8 G#3/8 F#3/8 G#3/8~ G#3/8 F#3/8 G#3/8~ G#3/8 F#3/8 G#3/8 r/8 r/4',
 '@T:4/4 r/4 (Ab2 Eb3)/2.',
]
bird_bass=[
 'S','S','@T:3/4 S',
 '@T:4/4 {3 r/8 Bb2/8 Eb2/8~ } (Eb2 Bb2)/2 {3 r/8 Bb2/8 Eb2/8~ }',
 '(Eb2 Bb2)/2 {3 Bn1/8 F#2/8 Dn3/8~ D3/8 F#2/8 B1/8~ }',
 '@T:12/8 Bn1/8 F#2/8 Dn3/8~ D3/8 F#2/8 B1/8~ B1/8 F#2/8 D3/8~ (Bn1 F#2 D3)/4.',
 '@T:4/4 Ab1/1',
]
scores['ravel-oiseaux-opening'].update(
 title='Oiseaux tristes · bird calls and accompaniment study',
 subtitle='Maurice Ravel · Miroirs · two-layer piano reduction · bars 1–7',
 complete=False,grand=True,ending='open',
 staves=[staff('Bird calls · selected upper melody','treble',bird_upper),
         dict(label='Ostinato and source bass',clef='bass',instrument='piano',voices=[dict(notes=' | '.join(bird_ostinato)),dict(notes=' | '.join(bird_bass))])],
 excerpt=dict(label='Opening, bars 1–7 · middle right-hand voice omitted',bars='1-7',of='Miroirs: Oiseaux tristes'),
 sections=[dict(bar=1,label='Call',name='Bird calls without accompaniment'),dict(bar=4,label='Layers',name='Ostinato and bass enter'),dict(bar=7,label='Return',name='High call returns')],
 guide=[dict(bars='1',text='Repeated B-flats alternate short accented calls with longer responses. The lower staff is silent.'),
        dict(bars='2',text='A quick flourish rises and falls twice. Slow it down to compare its shape with the repeated-note call.'),
        dict(bars='3',text='The line settles on E-flat in 3/4, then ties into the next bar.'),
        dict(bars='4-5',text='The accompaniment now enters: a rocking ostinato above a sustained and then moving bass. The original places twelve lower-staff eighths against four quarter-note beats; this study uses eighth-note triplets to align them. The middle right-hand voice is omitted.'),
        dict(bars='6',text='Both hands share a 12/8 grid. The selected line moves down while the bass changes color; overlapping right-hand voices are combined into one reading line here.'),
        dict(bars='7',text='The high B-flat call returns over a low A-flat foundation. The source continues its accompaniment into the next bar; this excerpt stops at the barline.')],
 source=ravel_source('E.1159 D','page 11','New classroom reduction checked against the print. Upper bird-call line and lower-staff ostinato/bass retained; middle right-hand voice omitted, overlapping melody voices combined in bar 6 and some overlapping bass ties shortened, cross-bar ties cut at the excerpt boundary. Simultaneous meters aligned with triplets; slurs, pedal, hairpins and free expressive timing omitted.'))

ellington_url='https://archive.org/details/blacktanfantasy00elli'
scores['ellington-black-tan-introduction'] = dict(
 title='Black and Tan Fantasy · introduction · historical violin part',
 subtitle='Duke Ellington and Bubber Miley · Eddie Powell arrangement, 1927 · first violin',
 composer='Duke Ellington and Bubber Miley',keyName='D-flat major / B-flat minor',key=-5,time='4/4',pickup=3,
 tempo=72,tempoText='Slow practice tempo · ♩ = 72',instrument='strings',complete=False,ending='open',
 staves=[staff('First violin · historical part','treble',[
 'F5/4 Bb5/2+>',
 'F5/8+. r/8 r/4 r/4 F5/4',
 'C6/8 Bb5/8 C6/2.',
 'Ab5/8+. r/8 r/4 r/4 Bb5/4',
 'Bb5/2 Bb5/4. An5/8',
 'Bb5/2 F6/2',
 'C6/8 Bb5/8 C6/2.',
 'G5/8+. r/8 r/4 r/4 C6/4',
 'Bb5/8 An5/8 Bb5/2 Gn5/4',
 'Eb5/2 C6/4. Bb5/8',
 'Ab5/2 Bb5/4. G5/8',
 'Ab5/2. r/4',
 ],'strings')],
 excerpt=dict(label='Opening through rehearsal A · first violin only; initial three-beat bar retained',of='Eddie Powell’s complete 1927 band arrangement'),
 sections=[dict(bar=0,label='Intro',name='Slow introduction in the first violin part')],
 guide=[dict(bars='0-2',text='The opening three-beat bar leads into short notes, rests and a high sustained response. This is a historical first-violin part, not a newly invented Ellington-style exercise.'),
        dict(bars='3-5',text='Compare the rests with the long notes. The natural A in bar 4 changes the color within the five-flat key signature.'),
        dict(bars='6-8',text='The opening idea returns in a different register. Hear the natural A and G against the key signature.'),
        dict(bars='9-11',text='The line settles before rehearsal A. Other band parts, including the harmony and rhythm section, are not included; compare their roles in the full historical edition.')],
 source=dict(label='Gotham Music Service, 1927; arranged by Eddie Powell; Smithsonian Libraries, call number M1366.E44 B53 1927, first violin, scan page 6. First-violin introduction only; slurs and ensemble parts omitted; printed short opening bar retained. Newly transcribed from the historical part, not a modern band arrangement.',
             license='1927 edition public domain in the United States; new classroom transcription dedicated to CC0 1.0',url=ellington_url,
             full='https://archive.org/download/blacktanfantasy00elli/blacktanfantasy00elli.pdf',fullLabel='Complete historical band parts (Smithsonian scan)'))

p.write_text(json.dumps(lib,ensure_ascii=False,indent=2)+'\n')
