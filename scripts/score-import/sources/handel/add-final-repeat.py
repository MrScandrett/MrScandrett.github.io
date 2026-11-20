# add-final-repeat.py score.json: end the last bar with a backward repeat (":"), for MusicXML whose
# only repeat is a closing light-heavy repeat barline (musicxml-piano-events.py does not read barlines).
import json, sys
d = json.load(open(sys.argv[1]))
st = d['staves'][0]
holder = st['voices'][0] if 'voices' in st else st
bars = holder['notes'].rstrip().split('|')
if not bars[-1].rstrip().endswith(':'):
    bars[-1] = bars[-1].rstrip() + ' :'
holder['notes'] = '|'.join(bars)
json.dump(d, open(sys.argv[1], 'w'))
