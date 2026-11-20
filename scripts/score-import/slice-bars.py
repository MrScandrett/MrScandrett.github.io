"""Cut a bar range out of a converted score (the JSON events2score.py writes).

    python3 -I slice-bars.py score.json FIRST LAST [NUMBER] > section.json

FIRST and LAST are 1-based positions in the converted bar list; NUMBER is the printed number of FIRST
(default FIRST). Each staff and
voice keeps only those bars. The state a bar inherits from earlier bars is restated at the start of the
slice: key (@K), meter (@T), clef (@C), stem direction (@U/@D/@A) and the last dynamic. A tie out of the
last bar is dropped (nothing follows it). The printed number of the first bar is kept as startMeasure, so
bar numbers in the slice match the source edition. Used for long movements whose sections need their
own tempo (the engine plays one tempo per score).
"""
import json, re, sys

src = json.load(open(sys.argv[1]))
first, last = int(sys.argv[2]), int(sys.argv[3])
number = int(sys.argv[4]) if len(sys.argv) > 4 else first  # printed number of the first bar


def bars_of(text):
    return text.split('|')


def state_before(bars, upto):
    key = clef = meter = stem = dyn = None
    for bar in bars[:upto]:
        for m in re.finditer(r'@K:(-?\d+)', bar): key = m.group(1)
        for m in re.finditer(r'@T:(\d+/\d+)', bar): meter = m.group(1)
        for m in re.finditer(r'@C:(\w+)', bar): clef = m.group(1)
        for m in re.finditer(r'(?<![\w:])@([UDA])(?!\w)', bar): stem = m.group(1)
        for m in re.finditer(r'!(ppp|pp|p|mp|mf|f|ff|fff|sfz|sf|fp)\b', bar): dyn = m.group(1)
    return key, meter, clef, stem, dyn


def cut(text, staff_index, voice_index):
    bars = bars_of(text)
    assert last <= len(bars), (last, len(bars))
    key, meter, clef, stem, dyn = state_before(bars, first - 1)
    out = [b.strip() for b in bars[first - 1:last]]
    for m in re.finditer(r'@K:(-?\d+)', out[0]): key = m.group(1)
    for m in re.finditer(r'@T:(\d+/\d+)', out[0]): meter = m.group(1)
    head = out[0]
    lead = []
    if clef and '@C:' not in head.split()[0:3]:
        lead.append('@C:' + clef)
    if stem and not re.match(r'^(?:@\S+\s+)*@[UDA](?:\s|$)', head):
        lead.append('@' + stem)
    if dyn and not head.lstrip('@ADU ').startswith('!'):
        # Insert the inherited dynamic before the first note-like token.
        toks = head.split(' ')
        for i, t in enumerate(toks):
            if t and not t.startswith('@') and not t.startswith('!') and t not in ('|:', ':'):
                if not t.startswith(('r', 'R', 's', 'S')):
                    toks[i] = '!' + dyn + ' ' + t
                break
        head = ' '.join(toks)
    out[0] = ' '.join(lead + [head])
    # A tie out of the final bar has nothing to land on.
    out[-1] = re.sub(r'~(\s*)$', r'\1', out[-1].rstrip())
    out[-1] = re.sub(r'~\)', ')', out[-1])
    return ' | '.join(out), key, meter


result = {k: v for k, v in src.items() if k != 'staves'}
staves = []
key0 = meter0 = None
for si, st in enumerate(src['staves']):
    st = dict(st)
    if 'voices' in st:
        vs = []
        for vi, v in enumerate(st['voices']):
            v = dict(v)
            v['notes'], k, m = cut(v['notes'], si, vi)
            if si == 0 and vi == 0: key0, meter0 = k, m
            vs.append(v)
        st['voices'] = vs
    else:
        st['notes'], k, m = cut(st['notes'], si, 0)
        if si == 0: key0, meter0 = k, m
    staves.append(st)
if key0 is not None: result['key'] = int(key0)
if meter0 is not None: result['time'] = meter0
result.pop('pickup', None)
if number != 1: result['startMeasure'] = number
if first == 1 and src.get('pickup'): result['pickup'] = src['pickup']
result['staves'] = staves
json.dump(result, sys.stdout, ensure_ascii=False)
