"""Print a MusicXML/.mxl score measure by measure: key (K-4 = four flats), time signature, then each
voice's notes as Pitch+quarterLength ([..] = chord, r = rest) and the voice's total in quarters.
A total that doesn't match the meter marks a bar the OMR got wrong.

    python dump-mxl.py page.mxl            (needs music21)
"""
import sys, music21 as m
s = m.converter.parse(sys.argv[1])
for pi, p in enumerate(s.parts):
    print('== part', pi, p.partName)
    for meas in p.getElementsByClass('Measure'):
        ks = meas.keySignature; ts = meas.timeSignature
        items = []
        for v in (meas.voices or [meas]):
            row = []
            for n in v.notesAndRests:
                d = n.quarterLength
                if n.isRest: row.append('r%s' % d)
                elif n.isChord: row.append('[' + ' '.join(x.nameWithOctave for x in n.pitches) + ']%s' % d)
                else: row.append('%s%s' % (n.nameWithOctave, d))
            items.append(' '.join(row) + '  (=%s)' % sum(x.quarterLength for x in v.notesAndRests))
        print(meas.number, ('K%s ' % ks.sharps if ks else '') + ('T%s ' % ts.ratioString if ts else ''), ' || '.join(items))
