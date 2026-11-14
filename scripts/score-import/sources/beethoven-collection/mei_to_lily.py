"""Convert the two archived TROMPA Bagatelles to LilyPond without editing pitches.
The restricted reader rejects unsupported musical elements. Repeats follow each
edition's explicit expansion; engraved slurs/hairpins are not synthesized.
"""
import sys
from fractions import Fraction
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {'m': 'http://www.music-encoding.org/ns/mei'}
XMLID = '{http://www.w3.org/XML/1998/namespace}id'

def convert(path, number):
    root = ET.parse(path).getroot()
    ties = {t.get('startid', '').lstrip('#') for t in root.findall('.//m:tie', NS)}
    trills = {t.get('startid', '').lstrip('#') for t in root.findall('.//m:trill', NS)}
    def pitch(e):
        accidental = e.get('accid.ges')
        written = e.find('m:accid', NS)
        if accidental is None and written is not None: accidental = written.get('accid.ges') or written.get('accid')
        suffix = {None:'', 'n':'', 's':'is', 'f':'es', 'ss':'isis', 'x':'isis', 'ff':'eses'}[accidental]
        octave = int(e.get('oct')) - 3
        return e.get('pname') + suffix + ("'" * octave if octave >= 0 else ',' * -octave)
    def token(e):
        tag = e.tag.rsplit('}',1)[-1]
        if tag in ('beam', 'layer'): return ' '.join(token(c) for c in e)
        if tag not in ('note', 'chord', 'rest', 'space'):
            raise ValueError('Unsupported musical element: ' + tag)
        duration = e.get('dur')
        if duration is None: raise ValueError('Missing duration')
        duration += '.' * int(e.get('dots','0'))
        if tag == 'chord':
            notes = e.findall('m:note', NS)
            head = '<' + ' '.join(pitch(n) + ('~' if n.get(XMLID) in ties else '') for n in notes) + '>'
        else:
            head = 'r' if tag == 'rest' else 's' if tag == 'space' else pitch(e)
        result = head + duration
        if tag == 'note' and e.get(XMLID) in ties: result += '~'
        for a in e.findall('m:artic', NS):
            for name in a.get('artic','').split():
                if name not in ('stacc','acc','ten'): raise ValueError('Unsupported articulation '+name)
                result += {'stacc':'-.','acc':'->','ten':'--'}[name]
        if e.get(XMLID) in trills: result += '\\trill'
        return result
    measures = root.findall('.//m:measure', NS)
    definition = root.find('.//m:scoreDef', NS)
    meter = definition.get('meter.count') + '/' + definition.get('meter.unit')
    key = 'a' if number == 10 else 'bes'
    staffs = []
    for staffno in ('1','2'):
        voices = max(int(l.get('n')) for m in measures for st in m.findall('m:staff',NS) if st.get('n')==staffno for l in st.findall('m:layer',NS))
        lines = []
        for voice in range(1,voices+1):
            bars=[]
            for m in measures:
                st=next(s for s in m.findall('m:staff',NS) if s.get('n')==staffno)
                layer=next((l for l in st.findall('m:layer',NS) if int(l.get('n'))==voice),None)
                if layer is None:
                    bars.append('s1*' + meter)
                else:
                    def length(node):
                        tag = node.tag.rsplit('}', 1)[-1]
                        if tag in ('beam', 'layer'): return sum((length(c) for c in node), Fraction())
                        return Fraction(1, int(node.get('dur'))) * (2 - Fraction(1, 2 ** int(node.get('dots', '0'))))
                    missing = Fraction(meter) - length(layer)
                    assert missing >= 0, 'Overfull MEI layer'
                    bars.append(token(layer) + (' s1*' + str(missing) if missing else ''))
            if number==10:
                text='\\repeat volta 2 {\n'+' |\n'.join(bars[:7])+'\n} \\alternative { { '+bars[7]+' } { '+bars[8]+' } }\n'+' |\n'.join(bars[9:])
            else:
                text='\\repeat volta 2 {\n'+' |\n'.join(bars[:4])+'\n}\n'+' |\n'.join(bars[4:])
            lines.append('{ '+text+' }')
        staffs.append('\\new Staff { \\clef '+('treble' if staffno=='1' else 'bass')+' \\key '+key+' \\major \\time '+meter+' << '+' \\\\ '.join(lines)+' >> }')
    return '\\version "2.26.0"\n% Adapted from Werner Goebl / TROMPA, CC BY 4.0.\n\\score { \\new PianoStaff <<\n'+'\n'.join(staffs)+'\n>> \\layout {} \\midi { \\tempo 4 = 96 } }\n'

if __name__ == '__main__':
    Path(sys.argv[3]).write_text(convert(sys.argv[1], int(sys.argv[2])))
