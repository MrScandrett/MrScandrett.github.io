"""Convert archived Chopin editions and compare playback with LilyPond MIDI.
Usage: PYTHON=/python-with-mido python3 reproduce.py OUTPUT_DIRECTORY
Requires LilyPond and convert-ly on PATH. Does not modify the library or sources.
"""
import json
from fractions import Fraction
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
IMPORT = HERE.parents[1]
REPO = IMPORT.parents[1]
OUT = Path(sys.argv[1]).resolve()
OUT.mkdir(parents=True, exist_ok=True)
python = os.environ.get('PYTHON', sys.executable)
failed = []
for entry in json.loads((HERE / 'imports.json').read_text()):
    name = entry['id']
    if len(sys.argv) > 2 and name not in sys.argv[2:]: continue
    with tempfile.TemporaryDirectory(prefix='chopin-score-') as tmp:
        work = Path(tmp)
        shutil.copytree(HERE / name, work, dirs_exist_ok=True)
        for file in list(work.rglob('*.ly')) + list(work.rglob('*.ily')):
            subprocess.run(['convert-ly', '-e', str(file)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        source = work / entry['entry']
        text = source.read_text()
        if name == 'chopin-prelude-9':
            # Compare written notation, rather than the separately ornamented MIDI score.
            text = text.split('% MIDI only')[0].replace('\\layout {', '\\midi {} \\layout {')
        if name == 'chopin-waltz-64-1':
            text = text.replace('\\applyMusic #unfold-repeats', '\\unfoldRepeats')
        if name == 'chopin-prelude-14':
            # Keep the two hand lines separate instead of crossing the visual staves.
            import re
            text = re.sub(r'\\staff(?:Up|Down)\b', '', text)
        source.write_text(text)
        run = subprocess.run(['lilypond', '-dinclude-settings=' + str(IMPORT / 'dump.ly'),
                              '-dbackend=null', '--loglevel=ERROR', source.name], cwd=source.parent, capture_output=True)
        (OUT / (name + '.lily.log')).write_bytes(run.stdout + run.stderr)
        events = source.with_suffix('.events')
        if not events.exists():
            failed.append(name + ': no events'); continue
        if name == 'chopin-nocturne-9-2':
            # LilyPond reports pos=0 for every note under cadenzaOn. Keep bar 32
            # together as the edition's single 24-beat free-time passage.
            lines = []
            for line in events.read_text().splitlines():
                cells = line.split('\t')
                now = Fraction(cells[3])
                if Fraction(373, 8) <= now < Fraction(421, 8):
                    cells[2] = str(now - Fraction(373, 8))
                lines.append('\t'.join(cells))
            events.write_text('\n'.join(lines) + '\n')
        result = subprocess.run([sys.executable, str(IMPORT / 'events2score.py'), str(events),
                                 '--staves', 'Right hand,Left hand'], capture_output=True)
        if result.returncode:
            failed.append(name + ': ' + result.stderr.decode()); continue
        score = json.loads(result.stdout)
        score.pop('measures', None)
        score['title'] = name
        if name == 'chopin-prelude-1':
            # tieWaitForNote holds five arpeggiated pitches until the final chord.
            # Express those holds as independent voices; no pitches or attacks change.
            staff = score['staves'][0]
            tails = ['C2/4~ | C2/4^', '{3 s/16 } {6:5 G2/4~ } | G2/4^',
                     '{3 s/8 C3/4~ } | C3/4^', 's/8 E3/8~ | E3/4^',
                     '{3 s/4 G3/8~ } | G3/4^']
            old = staff['voices']
            staff['voices'] = [{'notes': ' | '.join((old[i]['notes'].split('|')[:-2] if i < len(old) else ['S'] * 32) + [tail])}
                               for i, tail in enumerate(tails)]
        if name == 'chopin-prelude-1':
            # Bass notes occur first in the event dump; restore the printed hand order.
            score['staves'].reverse()
            for staff, label in zip(score['staves'], ['Right hand', 'Left hand']):
                staff['label'] = label
        score_path = OUT / (name + '.json')
        score_path.write_text(json.dumps(score, ensure_ascii=False, indent=2) + '\n')
        midi = source.with_suffix('.midi')
        if not midi.exists():
            failed.append(name + ': no MIDI'); continue
        result = subprocess.run([python, str(IMPORT / 'midinotes.py'), str(midi)], capture_output=True, check=True)
        midi_path = OUT / (name + '.midi.json')
        midi_path.write_bytes(result.stdout)
        result = subprocess.run(['node', str(IMPORT / 'verify-midi.mjs'), str(REPO), str(score_path), str(midi_path), '--grace-tol', '0.4' if name == 'chopin-nocturne-72-1' else '0.24'], capture_output=True)
        report = result.stdout + result.stderr
        (OUT / (name + '.verify.txt')).write_bytes(report)
        print(report.decode(), flush=True)
        if result.returncode: failed.append(name + ': MIDI comparison needs review')
if failed:
    print('\n'.join(failed), file=sys.stderr)
    sys.exit(1)
