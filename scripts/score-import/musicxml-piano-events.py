"""Bridge a MusicXML score to events2score.py's exact-rational event format.
Usage: python3 musicxml-piano-events.py score.musicxml BARS > score.events

Parts are read in order and their staves numbered on (a solo part then a two-staff piano gives
Staff1, Staff2, Staff3); voices are kept apart per part. A part with <transpose> (alto saxophone,
clarinet in A) is converted to sounding pitch, spelled by its diatonic interval.

Derived from sources/ravel-additions/musicxml-events.py. Preserves written pitches, voices,
durations, tuplets, ties, grace notes, clefs, keys and meters; analytical annotations, slurs
and pedal marks are not imported. Two changes make it safe for MuseScore exports:

- Tuplet notes take their length from <type>, dots and <time-modification> (exact fractions).
  MuseScore rounds <duration> to whole divisions, so 7 x 17/240 is not quite half a beat.
- A <backup>/<forward> lands on the exact position it was rounded from: the nearest note
  start or end already seen in the bar (within one division), or stays where it is.

- A tuplet that crosses between the hands (one note of a run written on the other staff) is
  kept on the staff that holds most of its notes in that bar and voice (ties: the first note's). Pitches are unchanged;
  events2score.py cannot pad a lone tuplet note on the other staff.

Over-long bars (unmeasured cadenzas MuseScore stores as irregular measures) come through
as their real length; events2score.py writes them as @L: bars.
"""
import sys
import xml.etree.ElementTree as ET
from fractions import Fraction as F

root = ET.parse(sys.argv[1]).getroot()
types = {'whole': 0, 'half': 1, 'quarter': 2, 'eighth': 3, '16th': 4, '32nd': 5, '64th': 6}
STEPS = 'CDEFGAB'; SEMIS = [0, 2, 4, 5, 7, 9, 11]
now = F(0)
bar = 0

def emit(kind, pos, staff, voice, *fields, grace=F(0)):
    print('\t'.join(map(str, [kind, bar, pos, now + pos, grace, staff, voice, *fields])))

def sounding(step, alter, octave, shift):
    """Written pitch -> sounding pitch for a <transpose> of (diatonic, chromatic) steps."""
    diatonic, chromatic = shift
    index = STEPS.index(step) + diatonic
    new_octave = octave + index // 7; index %= 7
    target = SEMIS[STEPS.index(step)] + alter + 12 * octave + chromatic
    return STEPS[index], target - (SEMIS[index] + 12 * new_octave), new_octave

def read_part(part, part_index, staff_offset, first):
    global now, bar
    now = F(0); bar = 0
    divisions = 1; meter = F(3, 4); shift = (0, 0); staves = 1
    S = lambda n: 'Staff' + str(staff_offset + int(n))
    V = lambda n: 'Voice' + (str(n) if part_index == 0 else f'{part_index + 1}x{n}')
    for measure in part.findall('measure')[:int(sys.argv[2])]:
        bar += 1
        pos = F(0)
        end = F(0)
        seen = {F(0)}
        # Majority staff of each voice's tuplet notes in this bar (see the docstring).
        tuplet_staff = {}
        for el in measure.findall('note'):
            if el.find('time-modification') is not None:
                tuplet_staff.setdefault(el.findtext('voice','1'), []).append(el.findtext('staff','1'))
        # Ties go to the staff of the first tuplet note (dict.fromkeys keeps order; max keeps the first).
        tuplet_staff = {v: max(dict.fromkeys(s), key=s.count) for v, s in tuplet_staff.items()}
        last = F(0)
        for el in measure:
            if el.tag == 'attributes':
                if el.find('divisions') is not None:
                    divisions = int(el.findtext('divisions'))
                if el.find('staves') is not None:
                    staves = int(el.findtext('staves'))
                tr = el.find('transpose')
                if tr is not None:
                    shift = (int(tr.findtext('diatonic','0')) + 7 * int(tr.findtext('octave-change','0')),
                             int(tr.findtext('chromatic','0')) + 12 * int(tr.findtext('octave-change','0')))
                time = el.find('time')
                if time is not None:
                    beats = time.findall('beats'); units = time.findall('beat-type')
                    meter = sum((F(sum(map(int,b.text.split()[0].split('+'))),int(u.text.split()[0])) for b,u in zip(beats,units)),F(0))
                    # Keep the displayed numerator/denominator for ordinary meters.
                    ts = f'{beats[0].text}/{units[0].text}' if len(beats)==1 and beats[0].text.isdigit() else f'{meter.numerator}/{meter.denominator}'
                    if first: emit('time',pos,'-','-',ts)
                for key in el.findall('key'):
                    fifths = int(key.findtext('fifths','0'))
                    if shift[1] % 12:
                        # Written key of a transposing part -> concert key (fifths move by 7 per semitone).
                        fifths = (fifths + 7 * shift[1]) % 12
                        fifths = fifths - 12 if fifths > 6 else fifths
                    signature = '('+' '.join(f'({i} . {"1/2" if fifths>0 else "-1/2"})' for i in range(abs(fifths)))+')'
                    for n in range(1, staves + 1): emit('key',pos,S(n),'-',signature)
                for clef in el.findall('clef'):
                    sign=clef.findtext('sign'); glyph={'G':'clefs.G -2 0','F':'clefs.F 2 0','C':'clefs.C 0 0'}[sign]
                    emit('clef',pos,S(clef.get('number','1')),'-',glyph)
            elif el.tag in ('backup','forward'):
                delta=F(int(el.findtext('duration')),divisions*4)
                pos += delta if el.tag=='forward' else -delta
                near=[p for p in seen if abs(p-pos) <= F(1,divisions*4)]
                if near: pos=min(near,key=lambda p:abs(p-pos))
            elif el.tag == 'note':
                chord = el.find('chord') is not None
                grace = el.find('grace') is not None
                start = last if chord else pos
                staff=S(el.findtext('staff','1'));voice=V(el.findtext('voice','1'))
                if el.find('time-modification') is not None:
                    staff=S(tuplet_staff[el.findtext('voice','1')])
                duration=F(int(el.findtext('duration','0')),divisions*4)
                log=types.get(el.findtext('type'),0); dots=len(el.findall('dot'))
                base=F(1,2**log)*(2-F(1,2**dots))
                mod=el.find('time-modification')
                if mod is not None and el.find('type') is not None and not grace:
                    exact=base*int(mod.findtext('normal-notes'))/int(mod.findtext('actual-notes'))
                    if abs(exact-duration) <= F(1,divisions*4): duration=exact
                scale=duration/base if not grace else F(1)
                if log > 5:
                    scale /= 2 ** (log - 5)
                    log = 5
                pitch=el.find('pitch')
                if pitch is not None:
                    art=[]
                    if any(t.get('type')=='start' for t in el.findall('tie')):art.append('tie')
                    art += [a.tag for a in el.findall('notations/articulations/*')]
                    step, alter, octave = pitch.findtext('step'), int(F(pitch.findtext('alter','0'))), int(pitch.findtext('octave'))
                    if shift != (0, 0): step, alter, octave = sounding(step, alter, octave, shift)
                    emit('note',start,staff,voice,STEPS.index(step),F(alter)/2,octave-4,log,dots,scale,','.join(art),grace=F(-1,32) if grace else F(0))
                elif not grace:
                    emit('skip' if el.get('print-object')=='no' else 'rest',start,staff,voice,log,dots,scale)
                if not chord:
                    last=pos
                    if not grace:pos+=duration
                    seen.update((last,pos))
                end=max(end,pos)
            elif el.tag == 'direction':
                dynamics=el.find('direction-type/dynamics')
                if dynamics is not None and len(dynamics):emit('dyn',pos,S(el.findtext('staff','1')),V(el.findtext('voice','1')),dynamics[0].tag)
        assert end > 0, (bar,end,meter)
        now += end
    return staves

offset = 0
for index, part in enumerate(root.findall('part')):
    offset += read_part(part, index, offset, index == 0)
