"""Mutopia MIDI -> [{start, dur, midi, track}] in quarter-note beats (JSON on stdout)."""
import json, sys
import mido
mf = mido.MidiFile(sys.argv[1])
tpq = mf.ticks_per_beat
notes = []
for ti, tr in enumerate(mf.tracks):
    t = 0
    on = {}
    for msg in tr:
        t += msg.time
        if msg.type == 'note_on' and msg.velocity > 0:
            on.setdefault((msg.channel, msg.note), []).append(t)
        elif msg.type in ('note_off', 'note_on'):
            k = (msg.channel, msg.note)
            if on.get(k):
                s = on[k].pop(0)
                notes.append({'start': s / tpq, 'dur': (t - s) / tpq, 'midi': msg.note, 'track': ti})
notes.sort(key=lambda n: (n['start'], n['midi']))
print(json.dumps(notes))
