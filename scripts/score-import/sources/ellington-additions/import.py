"""Source readings from the historical scans documented in README.md.
Rebuild only three Ellington additions; preserve all other catalog entries.
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
p = ROOT / 'data/score-library.json'
lib = json.loads(p.read_text())

def add(id, title, year, key, key_name, start, upper, lower, guide, source, filename, scope, detail, composer='Duke Ellington'):
    lib['scores'][id] = dict(
        title=title+' · melody and source-bass study',
        subtitle=f'{composer} · {year} edition · selected melody and bass',
        composer=composer, key=key, keyName=key_name, time='4/4', tempo=84,
        tempoText='Classroom practice tempo · ♩ = 84', instrument='piano', grand=True,
        complete=False, ending='open',
        staves=[dict(label='Selected melody',clef='treble',instrument='piano',notes=f'@N:{start} '+' | '.join(upper)),
                dict(label='Selected source bass',clef='bass',instrument='piano',notes=f'@N:{start} '+' | '.join(lower))],
        excerpt=dict(label=scope,of='the complete published score'),
        sections=[dict(bar=start,label='Study',name=scope)],
        guide=[dict(bars=b,text=t) for b,t in guide],
        source=dict(label=source+' '+detail+' Classroom reduction: selected melody and lowest source-bass notes only; inner chords, lyrics, ukulele diagrams, slurs and expressive markings omitted. Straight written rhythms at practice tempo; no band performance or complete composition claimed.',
                    license=f'{year} edition public domain in the United States; new classroom transcription dedicated to CC0 1.0',
                    url='https://imslp.org/wiki/'+filename+'_(Ellington,_Duke)',
                    full='https://imslp.org/wiki/Special:ImagefromIndex/'+str({'Black_Beauty':922452,'Jig_Walk':941792,'Ring_Dem_Bells':1009864}[filename]),
                    fullLabel='Complete historical printed score (IMSLP)'))

# Black Beauty, printed p.3, bars 5–12 after the four-bar introduction.
add('ellington-black-beauty','Black Beauty',1928,-2,'B-flat major',5,[
    'r/8 Bb5/8 C5/8 C#5/8 D5/8 F5/8 G5/4',
    'Ab5/4 G5/2.',
    'F5/8 F5/8 C5/8 C5/8 F5/4 G5/4',
    'G4/2. C5/8 Db5/8',
    'C5/8 Bb4/8 G4/4 Bb4/4 G5/4',
    'D5/2. F5/4',
    'G4/8 G4/8 r/4 G4/4 A5/4',
    'G5/16 A5/16 G5/8 G5/2.',
], ['F3/1','D3/1','C3/1','Bn3/1','G3/1','F3/1','F3/1','D3/1'],[
    ('5-6','After the four-bar introduction, the melody jumps upward and touches a chromatic C-sharp before a long response. Compare the moving line with the sustained source bass.'),
    ('7-8','Repeated notes give way to a dotted half note and a short two-note pickup. The inner notes of the printed left-hand chords are omitted.'),
    ('9-10','The line falls toward G, then answers in a higher register. Listen for the change of bass under each measure.'),
    ('11-12','Two short Gs and a rest lead to a high A. The next bar has a sixteenth-note turn and a long G; its curved marks are slurs, not sustained ties. The complete piece continues.')
], 'Jack Mills, New York, 1928; musical page 3 prints the Gotham Music Service copyright. IMSLP #922452, scan by Kosboot.',
    'Black_Beauty','Bars 5–12 · first theme passage after the introduction',
    'Upper melody and lowest left-hand chord tones, read from printed page 3.')

# Jig Walk, printed p.3: eight bars of vocal verse following eight piano bars.
add('ellington-jig-walk','Jig Walk',1925,-3,'E-flat major',9,[
    'G4/4 G4/4 G4/4 G4/4', 'G4/4 G4/4 G4/4 G4/4',
    'G4/4 G4/4 G4/4 G4/4', 'G4/1',
    'C5/4 C5/4 C5/4 C5/4', 'C5/4 C5/4 C5/4 C5/4',
    'C5/4 C5/4 C5/4 C5/4', 'C5/1',
], [
    'r/4 C3/4 r/4 D3/4', 'r/4 Eb3/4 r/4 D3/4',
    'r/4 C3/4 G2/4 G2/4', 'C3/4 Eb3/4 C3/4 Eb3/4',
    'r/4 C3/4 r/4 D3/4', 'r/4 Eb3/4 r/4 D3/4',
    'r/4 C3/4 G2/4 G2/4', 'C3/4 Eb3/4 G2/4 C3/4',
], [
    ('9-12','The verse begins after eight piano introduction bars. A repeated G makes rhythm and accompaniment carry the interest; the fourth bar holds that pitch. This study omits the busy right-hand piano figure.'),
    ('13-16','The same repeated-note idea moves up to C. Compare the vocal line alone with the selected piano bass. The rest of the verse and the later chorus remain in the complete score.')
], 'Robbins-Engel, New York, 1925, plate SH 232, printed page 3. Melody by Duke Ellington; lyric by Jo Trent; ukulele arrangement by Hank Linet. IMSLP #941792, scan by Kosboot.',
    'Jig_Walk','Bars 9–16 · first eight bars of the vocal verse',
    'Vocal line and selected lowest piano-bass attacks; the independent piano right hand is omitted.')

# Ring Dem Bells, printed p.3: four piano bars followed by first four vocal bars.
add('ellington-ring-dem-bells','Ring Dem Bells',1930,0,'C major',1,[
    'G5/8 G5/8~ G5/4 F5/4 E5/4',
    'D5/4 F5/4 E5/4 D5/4',
    'C5/8 C5/8~ C5/4 B4/4 A4/4',
    'G4/4 F4/4 E4/4 D4/4',
    'C5/8 C5/8~ C5/4 B4/4 A4/4',
    'G4/4 F4/4 E4/4 D4/4',
    'C4/1', 'C4/4 r/4 r/2',
], [
    'r/4 G3/2.~', 'G3/1', 'r/4 G2/2.~', 'G2/1',
    'C3/8 C3/8~ C3/4 D4/4 C4/4',
    'B3/4 A3/4 G3/4 F3/4', 'C3/1~', 'C3/1',
], [
    ('1-2','The piano introduction begins with a syncopated repeated G. A tie carries the second eighth note across the beat; the bass sustains beneath the descending line.'),
    ('3-4','The introduction repeats the rhythm lower down, then descends in quarter notes. Only the top of the right-hand chords and the lowest bass notes are retained.'),
    ('5-6','The study now follows the vocal melody, supported by the lowest piano notes. Compare this lower entrance with the piano introduction.'),
    ('7-8','The voice lands on a low C and releases after the first beat of bar 8. The print also has a high piano figure marked Bells; it is omitted from this two-line reduction. Later verses and the refrain follow in the full score.')
], 'Harms, New York, 1930, plate 8565, printed page 3. By Duke Ellington and Irving Mills; ukulele arrangement by S. M. Zoltai. IMSLP #1009864, scan by Kosboot.',
    'Ring_Dem_Bells','Bars 1–8 · piano introduction and first vocal phrase',
    'Top piano line in bars 1–4, vocal line in bars 5–8, and lowest source-bass notes; the high Bells response in bars 7–8 is omitted.',
    composer='Duke Ellington and Irving Mills')

p.write_text(json.dumps(lib,ensure_ascii=False,indent=2)+'\n')
