"""Restore notation that the MIDI-oriented event dump cannot represent.

All rhythms, ties and expression marks follow the archived Chop-28-1.ly.
This correction is shared by reproduction and the library update.
"""
def apply(score):
    rh, lh = score['staves']
    for voice in lh['voices']:
        voice['notes'] = voice['notes'].replace('!mf ', '')
    def tail(voice, ending):
        voice['notes'] = ' | '.join(voice['notes'].split('|')[:32] + ending)
    # A single printed chord avoids the duplicated C/E heads, stem and rest
    # formerly produced by the two crossing LilyPond voices.
    tail(rh['voices'][0], ['@U @tieDown {3 s/4 s/16 C4/16~ }', '@D (C4 E4)/4^'])
    tail(rh['voices'][1], ['S', 'S'])
    tail(rh['voices'][2], ['S', 'S'])
    # Keep the short written attacks; tieWait holds each pitch until the chord.
    tail(lh['voices'][1], ['@U @tieDown @tieWait {3 C2/16~ G2/16~ C3/16~ } @B {3 E3/16~ G3/16~ s/16 }', '@D (C2 G2 C3 E3 G3)/4^'])
    for i in [0, 2, 3, 4]:
        tail(lh['voices'][i], ['S', 'S'])
    # In 29–32 the inner line changes stems at the second triplet.
    for voice in [rh['voices'][1]]:
        bars = voice['notes'].split('|')
        for b in range(28, 32):
            bars[b] = bars[b].replace('@U {3 r/16 C4/16 F4/16 } @D', '@D {3 r/16 @U C4/16 F4/16 } @D')
            bars[b] = bars[b].replace('@D {3 r/16 C4/16 F4/16 }', '@D {3 r/16 @U C4/16 F4/16 } @D')
        voice['notes'] = ' | '.join(x.strip() for x in bars)
    slurs = []
    def slur(staff, first, last, side='above'):
        slurs.append(dict(staff=staff, **{'from':first, 'to':last}, side=side))
    for bar in range(1, 29):
        # The original upper phrase starts on the lower staff in some bars;
        # the hand-separated edition begins its arc at the first RH note.
        slur(0, dict(bar=bar, voice=0, note=0), dict(bar=bar, voice=0, note=-1))
    for bar in range(1, 33):
        slur(1, dict(bar=bar, voice=1, note=0), dict(bar=bar, voice=1, note=2),
             'below' if bar in [1,2,3,4,8,9,10,11,12,25,26,27] else 'above')
    for bar in range(29, 33):
        slur(0, dict(bar=bar, voice=1, note=0), dict(bar=bar, voice=1, note=-1), 'below')
    for bar in range(29, 32):
        slur(0, dict(bar=bar, voice=0, note=-1), dict(bar=bar+1, voice=0, note=0))
    directions = [dict(bar=1, dynamic='mf'), dict(bar=9, dynamic='mf'), dict(bar=13, text='cresc.'),
                  dict(bar=17, text='stretto'), dict(bar=21, dynamic='ff'),
                  dict(bar=22, text='decr.'), dict(bar=25, beat=.125, dynamic='p'),
                  dict(bar=29, beat=.5, dynamic='p'), dict(bar=31, text='rit.'),
                  dict(bar=33, dynamic='pp')]
    hairpins = []
    def hairpin(b, t, eb, et, kind):
        hairpins.append(dict(**{'from':dict(bar=b,beat=t), 'to':dict(bar=eb,beat=et)}, type=kind))
    hairpin(5,0,6,.875,'crescendo')
    hairpin(7,0,8,1,'diminuendo')
    hairpin(25,.875,26,.375,'crescendo')
    hairpin(26,.375,27,.5,'diminuendo')
    hairpin(27,.875,28,.46875,'crescendo')
    hairpin(28,.46875,28,1,'diminuendo')
    hairpin(29,.75,30,.75,'crescendo')
    hairpin(30,.875,32,.5,'diminuendo')
    cross_beams = [dict(bar=33, notes=[dict(staff=1,bar=33,voice=1,note=3),
                                     dict(staff=1,bar=33,voice=1,note=4),
                                     dict(staff=0,bar=33,voice=0,note=0)])]
    score['expressions'] = dict(slurs=slurs, directions=directions, hairpins=hairpins, crossBeams=cross_beams)
    return score
