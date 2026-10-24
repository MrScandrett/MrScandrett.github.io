"""LilyPond event dump (tools/dump.ly) -> ClassroomOS score-engine staves (JSON on stdout).

Usage: events2score.py file.events [--staves "Right hand,Left hand"] [--keep Staff1,Staff3] [--instruments a,b]
Everything comes from LilyPond's own interpretation of the source: spelled pitches, written durations,
bar numbers, voices, ties, grace notes, tuplets, articulations, dynamics, clefs, keys, time and repeats.
"""
import json
import re
import sys
from fractions import Fraction as F

LETTERS = 'CDEFGAB'
ALTER = {F(0): '', F(1, 2): '#', F(-1, 2): 'b', F(1): '##', F(-1): 'bb'}
BASE = {0: 1, 1: 2, 2: 4, 3: 8, 4: 16, 5: 32}
ART = {'staccato': '.', 'staccatissimo': '.', 'accent': '>', 'tenuto': '-', 'trill': 'tr', 'prall': 'mord',
       'mordent': 'mord', 'prallprall': 'mord', 'turn': 'turn', 'reverseturn': 'turn'}
DYN = {'pp': 'pp', 'p': 'p', 'mp': 'mp', 'mf': 'mf', 'f': 'f', 'ff': 'ff', 'ppp': 'pp', 'fff': 'ff',
       'sf': 'f', 'sfz': 'f', 'fz': 'f', 'rfz': 'f', 'fp': 'f', 'sfp': 'f'}


def frac(s):
    return F(s)


def parse(path):
    rows = []
    for line in open(path, encoding='utf8'):
        parts = line.rstrip('\n').split('\t')
        kind, bar, pos, now, grace, staff, voice = parts[:7]
        rows.append({'kind': kind, 'bar': int(bar), 'pos': frac(pos), 'now': frac(now), 'grace': frac(grace),
                     'staff': staff, 'voice': voice, 'f': parts[7:], 'seq': len(rows)})
    return rows


def pitch_name(n, a, o):
    return f'{LETTERS[int(n)]}{ALTER[F(a)]}{int(o) + 4}'


def dur_len(log, dots, scale):
    base = F(1, 2 ** log) if log >= 0 else F(2 ** -log)
    return base * (2 - F(1, 2 ** dots)) * scale   # in whole notes


def clef_name(text):
    glyph, pos = text.split()[:2]
    return {('clefs.G', '-2'): 'treble', ('clefs.F', '2'): 'bass', ('clefs.C', '0'): 'alto', ('clefs.C', '2'): 'alto'}.get((glyph, pos))


def key_fifths(alist):
    sharps = alist.count('. 1/2)')
    flats = alist.count('. -1/2)')
    return sharps - flats


def convert(path, staff_labels=None, keep=None, instruments=None):
    rows = parse(path)
    # Staff order: first appearance among notes/rests.
    staff_order = []
    for r in rows:
        if r['kind'] in ('note', 'rest', 'mmrest', 'skip') and r['staff'] != '-' and r['staff'] not in staff_order:
            staff_order.append(r['staff'])
    if keep:
        staff_order = [s for s in staff_order if s in keep]

    # Bars come from LilyPond's own barlines: every event knows how far it is into its bar.
    music = [r for r in rows if r['kind'] in ('note', 'rest', 'skip', 'mmrest')]
    time_rows = [r for r in rows if r['kind'] == 'time']
    first_time = time_rows[0]['f'][0] if time_rows else '4/4'
    times = {r['now']: r['f'][0] for r in time_rows}

    def meter_at(m):
        cur = first_time
        for t in sorted(times):
            if t <= m:
                cur = times[t]
        a, b = map(int, cur.split('/'))
        return F(a, b)

    def ev_len(r):
        if r['grace'] != 0:
            return F(0)
        f = r['f'][3:6] if r['kind'] == 'note' else r['f'][0:3]
        if f[0] == 'x':
            return F(0)
        return dur_len(int(f[0]), int(f[1]), frac(f[2]))

    t0 = min(r['now'] for r in music)
    end_moment = max(r['now'] + ev_len(r) for r in music)
    barlines = sorted({r['now'] - r['pos'] for r in music if r['pos'] >= 0 and r['grace'] == 0} | {t0})
    barlines = [b for b in barlines if t0 <= b < end_moment]
    # A multi-measure rest spans several bars: add the barlines inside it from the meter.
    for r in music:
        if r['kind'] == 'mmrest':
            t = r['now'] + meter_at(r['now'])
            while t < r['now'] + ev_len(r):
                barlines.append(t)
                t += meter_at(t)
    # A repeat sign in the middle of a bar (sections that begin on an upbeat) becomes a barline: the engine
    # repeats whole bars. The second half keeps the bar's number so numbering still matches the edition.
    on_line = set(barlines)
    splits = set()
    for r in rows:
        if r['kind'] in ('repeat', 'volta') and t0 < r['now'] < end_moment and r['now'] not in on_line:
            splits.add(r['now'])
    barlines = sorted(set(barlines) | splits)
    starts = [(b, (barlines[i + 1] if i + 1 < len(barlines) else end_moment) - b) for i, b in enumerate(barlines)]
    nb = len(starts)
    pickup = starts[0][1] if starts[0][1] < meter_at(t0) else None

    def bar_index(moment):
        lo = 0
        for i, (s0, _) in enumerate(starts):
            if moment >= s0:
                lo = i
        return lo

    # LilyPond's printed number for each bar (a pickup is bar 0).
    numbers = [None] * nb
    for r in music:
        if r['grace'] == 0:
            bi = bar_index(r['now'])
            if numbers[bi] is None:
                numbers[bi] = r['bar']
    if pickup and nb > 1 and numbers[0] == numbers[1]:
        numbers[0] = numbers[1] - 1
    for i in range(nb):
        if numbers[i] is None:
            numbers[i] = (numbers[i - 1] + 1) if i else 1
    # Sequential numbering, except that the second half of a split bar repeats the first half's number.
    seq = []
    for i, (s0, _) in enumerate(starts):
        if i == 0:
            seq.append(0 if pickup else 1)
        elif s0 in splits:
            seq.append(seq[-1])
        else:
            seq.append(seq[-1] + 1)

    meta = [{'repStart': False, 'repEnd': False, 'volta': None, 'key': None, 'time': None, 'len': None, 'number': None}
            for _ in range(nb)]
    expected = (numbers[0] + 1) if numbers else 1
    # Bars are numbered one after another (endings included, a pickup is bar 0); LilyPond's own count
    # stalls on incomplete bars, which would make "go to bar 8" ambiguous.
    for i, (s0, length) in enumerate(starts):
        if i > 0 and s0 in splits:
            meta[i]['number'] = seq[i]
        elif i > 0 and seq[i - 1] == seq[i - 2 if i > 1 else 0] and starts[i - 1][0] in splits:
            meta[i]['number'] = seq[i]
        full = meter_at(s0)
        if length != full and not (i == 0 and pickup) and not (i == nb - 1 and length < full):
            meta[i]['len'] = length
    # Repeats: a start-repeat opens the bar it falls in; an end-repeat closes the bar before it.
    seen = set()
    for r in rows:
        if r['kind'] != 'repeat':
            continue
        key = (r['now'], r['f'][0])
        if key in seen:
            continue
        seen.add(key)
        bi = bar_index(r['now'])
        at_line = any(abs(r['now'] - s0) == 0 for s0, _ in starts)
        if 'start-repeat' in r['f'][0]:
            meta[bi]['repStart'] = True
        if 'end-repeat' in r['f'][0]:
            target = bi - 1 if at_line else bi
            if target >= 0:
                meta[target]['repEnd'] = True
    # Endings: a volta span runs from its start to its stop (both logged once per voice).
    vseen = set()
    opened = {}
    for r in rows:
        if r['kind'] != 'volta':
            continue
        key = (r['now'], r['f'][0], r['f'][1])
        if key in vseen:
            continue
        vseen.add(key)
        nums = '.'.join(re.findall(r'\d+', r['f'][1])) or '1'
        if r['f'][0] == '-1':
            opened[nums] = bar_index(r['now'])
        elif nums in opened:
            a0 = opened.pop(nums)
            b0 = bar_index(r['now'])
            if any(abs(r['now'] - s0) == 0 for s0, _ in starts):
                b0 -= 1
            for b in range(a0, max(a0, b0) + 1):
                meta[b]['volta'] = nums
    for nums, a0 in opened.items():
        meta[a0]['volta'] = nums
    # Key and time changes (from the first kept staff / the Score).
    key0 = None
    for r in rows:
        if r['kind'] == 'key' and r['staff'] == staff_order[0]:
            f = key_fifths(r['f'][0])
            bi = bar_index(r['now'])
            if key0 is None:
                key0 = f
            elif bi > 0 and f != (meta[bi - 1]['key'] if meta[bi - 1]['key'] is not None else None):
                meta[bi]['key'] = f
    # collapse keys: record only real changes
    cur = key0
    for bi in range(nb):
        if meta[bi]['key'] is not None:
            if meta[bi]['key'] == cur:
                meta[bi]['key'] = None
            else:
                cur = meta[bi]['key']
    for r in time_rows[1:]:
        bi = bar_index(r['now'])
        if bi > 0:
            meta[bi]['time'] = r['f'][0]

    # Events per staff.
    out_staves = []
    for si, sid in enumerate(staff_order):
        srows = [r for r in rows if r['staff'] == sid]
        clefs = [(r['now'], clef_name(r['f'][0])) for r in srows if r['kind'] == 'clef']
        clef0 = clefs[0][1] if clefs else 'treble'
        clef_changes = [(t, c) for (t, c) in clefs[1:]]
        # Build musical events per voice context.
        ctx_events = {}
        pending_tie = {}
        pending_art = {}
        pending_dyn = {}
        pending_trem = {}
        for r in srows:
            v = r['voice']
            if r['kind'] == 'tie':
                pending_tie.setdefault((v, r['now'], r['grace']), True)
            elif r['kind'] == 'art':
                pending_art.setdefault((v, r['now'], r['grace']), []).append(r['f'][0])
            elif r['kind'] == 'dyn':
                pending_dyn[(v, r['now'])] = r['f'][0]
            elif r['kind'] == 'trem':
                pending_trem[(v, r['now'])] = int(r['f'][0])
        for r in srows:
            v = r['voice']
            if r['kind'] == 'note':
                n, a, o, log, dots, scale, arts = r['f'][:7]
                evs = ctx_events.setdefault(v, [])
                name = pitch_name(n, a, o)
                artl = [x for x in arts.split(',') if x]
                tie = 'tie' in artl or pending_tie.get((v, r['now'], r['grace']))
                art_all = artl + pending_art.get((v, r['now'], r['grace']), [])
                key = (r['now'], r['grace'])
                if evs and evs[-1]['key'] == key and evs[-1]['kind'] == 'note':
                    evs[-1]['pitches'].append((name, bool('tie' in artl or pending_tie.get((v, r['now'], r['grace'])))))
                    for x in art_all:
                        if x not in evs[-1]['arts']:
                            evs[-1]['arts'].append(x)
                    continue
                evs.append({'kind': 'note', 'key': key, 'now': r['now'], 'grace': r['grace'] != 0, 'log': int(log), 'dots': int(dots),
                            'scale': frac(scale), 'pitches': [(name, bool(tie))], 'arts': art_all,
                            'dyn': pending_dyn.get((v, r['now'])) if r['grace'] == 0 else None})
            elif r['kind'] in ('rest', 'skip', 'mmrest'):
                log, dots, scale = r['f'][:3]
                if log == 'x':
                    continue
                ctx_events.setdefault(v, []).append({'kind': r['kind'], 'key': (r['now'], r['grace']), 'now': r['now'], 'grace': False,
                                                     'log': int(log), 'dots': int(dots), 'scale': frac(scale)})
        # Durations and bar placement. A measured tremolo is written out as the notes it stands for.
        for v, evs in list(ctx_events.items()):
            out = []
            for e in evs:
                e['len'] = F(0) if e['grace'] else dur_len(e['log'], e['dots'], e['scale'])
                T = pending_trem.get((v, e['now']))
                if T is None:
                    T = next((int(a[4:]) for a in e.get('arts', []) if a.startswith('trem') and a[4:].isdigit() and int(a[4:]) > 0), None)
                unit = F(1, T) if T else None
                if e['kind'] == 'note' and unit and e['len'] > unit and (e['len'] / unit).denominator == 1:
                    n = int(e['len'] / unit)
                    for k in range(n):
                        c = dict(e)
                        c['now'] = e['now'] + unit * k
                        c['len'] = unit
                        c['log'] = {1: 0, 2: 1, 4: 2, 8: 3, 16: 4, 32: 5}[T]
                        c['dots'] = 0
                        c['scale'] = F(1)
                        c['pitches'] = [(p[0], p[1] and k == n - 1) for p in e['pitches']]
                        c['arts'] = [a for a in e['arts'] if not a.startswith('trem')] if k == 0 else []
                        c['dyn'] = e.get('dyn') if k == 0 else None
                        c['key'] = (c['now'], e['grace'])
                        out.append(c)
                else:
                    out.append(e)
            # A note held past its barline (a breve in 4/4) becomes tied notes, one per bar.
            split = []
            for e in out:
                bi = bar_index(e['now'])
                bar_end = starts[bi][0] + starts[bi][1]
                if e['kind'] != 'note' or e['grace'] or e['scale'] != 1 or e['now'] + e['len'] <= bar_end:
                    split.append(e)
                    continue
                now, left = e['now'], e['len']
                while left > 0:
                    bi = bar_index(now)
                    piece = min(left, starts[bi][0] + starts[bi][1] - now)
                    log_dots = next(((lg, dt) for lg in range(0, 6) for dt in (0, 1) if dur_len(lg, dt, F(1)) == piece), None)
                    if log_dots is None:
                        raise ValueError(f'cannot split a note of {e["len"]} across the bar at {now}')
                    c = dict(e)
                    c['now'], c['len'], c['log'], c['dots'], c['key'] = now, piece, log_dots[0], log_dots[1], (now, e['grace'])
                    last = left == piece
                    c['pitches'] = [(q[0], q[1] if last else True) for q in e['pitches']]
                    if now != e['now']:
                        c['arts'], c['dyn'] = [], None
                    split.append(c)
                    now += piece
                    left -= piece
            out = split
            for e in out:
                e['bar'] = bar_index(e['now'])
            ctx_events[v] = out
        # A voice can overlap itself (`<< bf2. { s8 <f bf>4 } >>` without \\): split it into
        # non-overlapping lines so each gets its own lane.
        for v, evs in list(ctx_events.items()):
            chains = [[]]
            ends = [F(-1)]
            for e in evs:
                if e['grace'] or e['kind'] == 'skip':
                    chains[0].append(e)
                    continue
                k = next((i for i, end in enumerate(ends) if end <= e['now']), None)
                if k is None:
                    chains.append([])
                    ends.append(F(-1))
                    k = len(chains) - 1
                chains[k].append(e)
                ends[k] = e['now'] + e['len']
            if len(chains) > 1:
                ctx_events[v] = chains[0]
                for i, ch in enumerate(chains[1:], 1):
                    ctx_events[f'{v}#{i}'] = ch

        # Lanes: pack voice contexts so overlapping ones get separate lanes (upper first), per bar.
        lanes_by_bar = [dict() for _ in range(nb)]   # bar -> lane -> [events]
        pref = {}
        nlanes = 1
        for bi in range(nb):
            ctxs = {}
            for v, evs in ctx_events.items():
                sel = [e for e in evs if e['bar'] == bi and e['kind'] != 'skip']
                if sel:
                    ctxs[v] = sel
            if not ctxs:
                continue

            def avg_pitch(sel):
                ps = [midi_of(p[0]) for e in sel if e['kind'] == 'note' for p in e['pitches']]
                return sum(ps) / len(ps) if ps else 60

            def span(sel):
                return [(e['now'], e['now'] + e['len']) for e in sel if not e['grace']]

            order = sorted(ctxs, key=lambda v: (min(e['now'] for e in ctxs[v]), -avg_pitch(ctxs[v])))
            # Contexts that start together: the higher one takes the upper lane.
            placed = {}
            for v in sorted(order, key=lambda v: (pref.get(v, 99), min(e['now'] for e in ctxs[v]), -avg_pitch(ctxs[v]))):
                want = [pref[v]] if v in pref else []
                for lane in want + list(range(0, 8)):
                    clash = any(a < d and c < b for (a, b) in span(ctxs[v]) for (c, d) in placed.get(lane, []))
                    if not clash:
                        break
                placed.setdefault(lane, []).extend(span(ctxs[v]))
                lanes_by_bar[bi].setdefault(lane, []).extend(ctxs[v])
                pref[v] = lane
                nlanes = max(nlanes, lane + 1)
            # Keep upper voices in lower-numbered lanes when two lanes overlap.
            if len(lanes_by_bar[bi]) > 1:
                ls = sorted(lanes_by_bar[bi].items(), key=lambda kv: kv[0])
                pitches = [(lane, avg_pitch(evs)) for lane, evs in ls]
                if len(pitches) == 2 and pitches[0][1] < pitches[1][1] - 0.5:
                    a, b = ls[0][1], ls[1][1]
                    lanes_by_bar[bi] = {ls[0][0]: b, ls[1][0]: a}
        # After-graces (\\afterGrace) end a bar with no note after them: they lead into the next bar's first note.
        for lane in range(nlanes):
            for bi in range(nb):
                evs = sorted(lanes_by_bar[bi].get(lane, []), key=lambda e: (e['now'], 0 if e['grace'] else 1))
                last_main = max((e['now'] for e in evs if not e['grace']), default=None)
                tail = [e for e in evs if e['grace'] and (last_main is None or e['now'] > last_main or
                        not any(x['now'] == e['now'] and not x['grace'] for x in evs))]
                if not tail:
                    continue
                for e in tail:
                    lanes_by_bar[bi][lane].remove(e)
                if bi + 1 < nb:
                    nxt = lanes_by_bar[bi + 1].setdefault(lane, [])
                    first = min((x['now'] for x in nxt if not x['grace']), default=starts[bi + 1][0])
                    for e in tail:
                        e2 = dict(e)
                        e2['now'] = first
                        nxt.append(e2)
                else:
                    sys.stderr.write(f'dropped {len(tail)} grace note(s) at the very end\n')
        voices = []
        for lane in range(nlanes):
            bar_texts = []
            for bi in range(nb):
                start, length = starts[bi]
                evs = sorted(lanes_by_bar[bi].get(lane, []), key=lambda e: (e['now'], 0 if e['grace'] else 1))
                multi = sum(1 for L, lev in lanes_by_bar[bi].items() if any(e['kind'] == 'note' for e in lev)) > 1
                toks = []
                if si == 0 and lane == 0:
                    m = meta[bi]
                    if m['key'] is not None:
                        toks.append(f"@K:{m['key']}")
                    if m['time']:
                        toks.append(f"@T:{m['time']}")
                    if m['volta']:
                        toks.append('@' + m['volta'])
                    if m['len'] is not None:
                        q = m['len'] * 4
                        toks.append(f"@L:{q.numerator}" + (f"/{q.denominator}" if q.denominator != 1 else ''))
                    if m['number'] is not None:
                        toks.append(f"@N:{m['number']}")
                if lane == 0:
                    toks.append('@U' if multi else '@A')
                else:
                    toks.append('@D')
                clefs_here = [(t, c) for (t, c) in clef_changes if start <= t < start + length] if lane == 0 else []
                toks += bar_tokens(evs, start, length, hide=lane > 0 or not evs, clefs=clefs_here)
                text = ' '.join(toks)
                if si == 0 and lane == 0:
                    if meta[bi]['repStart']:
                        text = ': ' + text
                    if meta[bi]['repEnd']:
                        text += ' :'
                bar_texts.append(text)
            voices.append(' | '.join(bar_texts))
        label = staff_labels[si] if staff_labels and si < len(staff_labels) else f'Staff {si + 1}'
        entry = {'clef': clef0, 'label': label}
        if instruments and si < len(instruments) and instruments[si]:
            entry['instrument'] = instruments[si]
        if len(voices) == 1:
            entry['notes'] = voices[0]
        else:
            entry['voices'] = [{'notes': tx} for tx in voices]
        out_staves.append(entry)

    result = {'key': key0 or 0, 'time': first_time, 'staves': out_staves, 'measures': nb}
    if pickup:
        result['pickup'] = float(pickup * 4)
    first_full = numbers[1] if pickup and nb > 1 else numbers[0]
    if first_full != 1:
        result['startMeasure'] = first_full
    return result


def bar_numbers_after_pickup(rows, starts):
    if len(starts) < 2:
        return None
    t = starts[1][0]
    for r in rows:
        if r['now'] == t and r['pos'] == 0 and r['kind'] in ('note', 'rest'):
            return r['bar']
    return None


def midi_of(name):
    m = re.match(r'^([A-G])(##|bb|#|b)?(-?\d+)$', name)
    pc = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[m.group(1)]
    acc = {None: 0, '#': 1, 'b': -1, '##': 2, 'bb': -2}[m.group(2)]
    return (int(m.group(3)) + 1) * 12 + pc + acc


def dur_tok(log, dots):
    if log not in BASE:
        raise ValueError(f'duration log {log} is not supported')
    return f'/{BASE[log]}' + '.' * dots


def gap_tokens(q, hide):
    """Rest tokens for a gap of q whole notes, largest values first."""
    out = []
    head = 's' if hide else 'r'
    for log in range(0, 6):
        val = F(1, 2 ** log)
        while q >= val:
            out.append(f'{head}/{BASE[log]}')
            q -= val
    if q:
        raise ValueError('gap shorter than a 32nd note')
    return out


def bar_tokens(evs, start, length, hide, clefs):
    if not evs:
        toks = []
        for t, c in clefs:
            toks.append('@C:' + c)
        return toks + ['S' if hide else 'R']
    toks = []
    t = start
    graces = []
    tup = None          # (scale, accumulated)
    clefs = list(clefs)
    for e in evs:
        if e['grace']:
            graces.append(e)
            continue
        if e['now'] > t:
            gap = e['now'] - t
            if e['scale'] != 1 and (gap * 2 ** 5).denominator != 1 and ((gap / e['scale']) * 2 ** 5).denominator == 1:
                # A gap inside a tuplet (an arpeggio that crosses to the other hand): hidden tuplet rests.
                if tup and tup[0] != e['scale']:
                    toks.append('}')
                    tup = None
                if not tup:
                    n, d = e['scale'].denominator, e['scale'].numerator
                    toks.append('{3' if (n, d) == (3, 2) else '{%d:%d' % (n, d))
                    tup = [e['scale'], F(0)]
                toks += gap_tokens(gap / e['scale'], True)
                tup[1] += gap
            else:
                if tup:
                    toks.append('}')
                    tup = None
                toks += gap_tokens(gap, hide)
            t = e['now']
        if e['now'] < t:
            # Overlap inside one lane: shorten the earlier item is not possible; give up loudly.
            raise ValueError(f'overlap at {e["now"]} in one lane')
        while clefs and clefs[0][0] <= e['now']:
            toks.append('@C:' + clefs.pop(0)[1])
        if e['kind'] == 'mmrest':
            if tup:
                toks.append('}')
                tup = None
            toks.append('R')
            t = start + length
            continue
        scale = e['scale']
        if scale != 1:
            if tup and tup[0] != scale:
                toks.append('}')
                tup = None
            if not tup:
                n, d = scale.denominator, scale.numerator   # e.g. 2/3 -> 3 in the time of 2
                toks.append('{3' if (n, d) == (3, 2) else '{%d:%d' % (n, d))
                tup = [scale, F(0)]
        elif tup:
            toks.append('}')
            tup = None
        for g in graces:
            gp = g['pitches'][0][0] if len(g['pitches']) == 1 else '(' + ' '.join(p[0] for p in g['pitches']) + ')'
            toks.append(f"g:{gp}/{BASE.get(g['log'], 16)}")
        graces = []
        if e['kind'] == 'note':
            if e.get('dyn') in DYN:
                toks.append('!' + DYN[e['dyn']])
            ps = e['pitches']
            head = ps[0][0] if len(ps) == 1 else '(' + ' '.join(p[0] for p in ps) + ')'
            tie = any(p[1] for p in ps)
            tok = head + dur_tok(e['log'], e['dots']) + ('~' if tie else '') + ('^' if 'fermata' in e['arts'] else '')
            orn = []
            for a in e['arts']:
                o = ART.get(a)
                if o and o not in orn:
                    orn.append(o)
            tok += ''.join('+' + o for o in orn)
        else:
            tok = ('s' if (e['kind'] == 'skip' or hide and e['kind'] == 'skip') else 'r') + dur_tok(e['log'], e['dots'])
        toks.append(tok)
        t = e['now'] + e['len']
        if tup:
            tup[1] += e['len']
            # Close the group when it has filled a whole number of its own beats.
            unit = F(1, 2 ** e['log']) * (2 - F(1, 2 ** e['dots']))
            if (tup[1] / scale) % (unit * scale.denominator) == 0:
                toks.append('}')
                tup = None
    gap = start + length - t
    last = next((e for e in reversed(evs) if not e['grace']), None)
    if gap and last and last['scale'] != 1 and (gap * 2 ** 5).denominator != 1 and ((gap / last['scale']) * 2 ** 5).denominator == 1:
        if not tup:
            n, d = last['scale'].denominator, last['scale'].numerator
            toks.append('{3' if (n, d) == (3, 2) else '{%d:%d' % (n, d))
        toks += gap_tokens(gap / last['scale'], True)
        toks.append('}')
        if graces:
            raise ValueError('grace notes at the end of a bar')
        return toks
    if tup:
        toks.append('}')
    if t < start + length:
        toks += gap_tokens(start + length - t, hide)
    if graces:
        raise ValueError('grace notes at the end of a bar')
    return toks


if __name__ == '__main__':
    args = sys.argv[1:]
    path = args[0]
    opts = dict(zip(args[1::2], args[2::2]))
    labels = opts['--staves'].split(',') if '--staves' in opts else None
    keep = opts['--keep'].split(',') if '--keep' in opts else None
    insts = opts['--instruments'].split(',') if '--instruments' in opts else None
    print(json.dumps(convert(path, labels, keep, insts), indent=1))
