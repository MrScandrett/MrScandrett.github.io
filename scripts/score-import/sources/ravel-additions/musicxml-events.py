"""Bridge MuseScore's MusicXML export to events2score.py's exact-rational event format.
Usage: python3 musicxml-events.py exported.musicxml BARS > exported.events
Preserves written pitches, voices, durations, tuplets, ties, grace notes, clefs,
keys and meters. This piano-only bridge does not import analytical annotations.
"""
import sys
import xml.etree.ElementTree as ET
from fractions import Fraction as F

root = ET.parse(sys.argv[1]).getroot()
types = {'whole': 0, 'half': 1, 'quarter': 2, 'eighth': 3, '16th': 4, '32nd': 5, '64th': 6}
now = F(0)
divisions = 1
meter = F(3, 4)
bar = 0

def emit(kind, pos, staff, voice, *fields, grace=F(0)):
    print('\t'.join(map(str, [kind, bar, pos, now + pos, grace, staff, voice, *fields])))

for measure in root.find('part').findall('measure')[:int(sys.argv[2])]:
    bar += 1
    pos = F(0)
    end = F(0)
    last = F(0)
    for el in measure:
        if el.tag == 'attributes':
            if el.find('divisions') is not None:
                divisions = int(el.findtext('divisions'))
            time = el.find('time')
            if time is not None:
                beats = time.findall('beats'); units = time.findall('beat-type')
                meter = sum((F(sum(map(int,b.text.split()[0].split('+'))),int(u.text.split()[0])) for b,u in zip(beats,units)),F(0))
                # Keep the displayed numerator/denominator for ordinary meters.
                ts = f'{beats[0].text}/{units[0].text}' if len(beats)==1 and beats[0].text.isdigit() else f'{meter.numerator}/{meter.denominator}'
                emit('time',pos,'-','-',ts)
            for key in el.findall('key'):
                fifths = int(key.findtext('fifths','0'))
                signature = '('+' '.join(f'({i} . {"1/2" if fifths>0 else "-1/2"})' for i in range(abs(fifths)))+')'
                for staff in ['Staff1','Staff2']:emit('key',pos,staff,'-',signature)
            for clef in el.findall('clef'):
                sign=clef.findtext('sign'); glyph={'G':'clefs.G -2 0','F':'clefs.F 2 0','C':'clefs.C 0 0'}[sign]
                emit('clef',pos,'Staff'+clef.get('number','1'),'-',glyph)
        elif el.tag in ('backup','forward'):
            delta=F(int(el.findtext('duration')),divisions*4)
            pos += delta if el.tag=='forward' else -delta
        elif el.tag == 'note':
            chord = el.find('chord') is not None
            grace = el.find('grace') is not None
            start = last if chord else pos
            staff='Staff'+el.findtext('staff','1');voice='Voice'+el.findtext('voice','1')
            duration=F(int(el.findtext('duration','0')),divisions*4)
            log=types.get(el.findtext('type'),0); dots=len(el.findall('dot'))
            base=F(1,2**log)*(2-F(1,2**dots))
            scale=duration/base if not grace else F(1)
            if log > 5:
                scale /= 2 ** (log - 5)
                log = 5
            pitch=el.find('pitch')
            if pitch is not None:
                art=[]
                if any(t.get('type')=='start' for t in el.findall('tie')):art.append('tie')
                art += [a.tag for a in el.findall('notations/articulations/*')]
                emit('note',start,staff,voice,'CDEFGAB'.index(pitch.findtext('step')),F(pitch.findtext('alter','0'))/2,int(pitch.findtext('octave'))-4,log,dots,scale,','.join(art),grace=F(-1,32) if grace else F(0))
            elif not grace:
                emit('skip' if el.get('print-object')=='no' else 'rest',start,staff,voice,log,dots,scale)
            if not chord:
                last=pos
                if not grace:pos+=duration
            end=max(end,pos)
        elif el.tag == 'direction':
            dynamics=el.find('direction-type/dynamics')
            if dynamics is not None and len(dynamics):emit('dyn',pos,'Staff'+el.findtext('staff','1'),'Voice'+el.findtext('voice','1'),dynamics[0].tag)
    assert end > 0, (bar,end,meter)
    now += end
