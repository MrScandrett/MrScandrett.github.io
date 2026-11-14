"""Rebuild archived Mozart scores and compare each with LilyPond's own MIDI.
Usage: PYTHON=/path/to/python-with-mido python3 reproduce.py OUTPUT_DIRECTORY
Requires LilyPond/convert-ly on PATH. This writes temporary outputs, not the library.
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
entries = json.loads((HERE / 'imports.json').read_text())
failed = []
for entry in entries:
    name = entry['id']
    if len(sys.argv) > 2 and name not in sys.argv[2:]: continue
    source = HERE / name / entry['entry']
    with tempfile.TemporaryDirectory(prefix='mozart-score-') as tmp:
        work = Path(tmp)
        for sibling in source.parent.glob('*.ly'):
            shutil.copy(sibling, work / sibling.name)
        for file in work.glob('*.ly'):
            # convert-ly returns nonzero when no conversion is needed.
            subprocess.run(['convert-ly', '-e', str(file)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        main = work / source.name
        text = main.read_text()
        if name == 'mozart-k331-menuetto':
            # The second score is a separate expanded, articulated MIDI realization.
            text = text[:text.rfind('\\score')].replace('\\layout { }', '\\layout { } \\midi { }')
        if name == 'mozart-sonata-k457-1':
            # These repeats are drawn as barlines rather than repeat music nodes.
            text = text.replace('\\bar ":..:"', '\\applyContext #(lambda (ctx) (emit ctx "repeat" "(end-repeat start-repeat)")) \\bar ":..:"')
            text = text.replace('\\bar ":|."', '\\applyContext #(lambda (ctx) (emit ctx "repeat" "(end-repeat)")) \\bar ":|."')
        for command, marker in [('cadenzaOn', 'cadenza-start'), ('cadenzaOff', 'cadenza-end')]:
            text = text.replace('\\' + command, '\\applyContext #(lambda (ctx) (emit ctx "' + marker + '")) \\' + command)
        main.write_text(text)
        run = subprocess.run(['lilypond', '-dinclude-settings=' + str(IMPORT / 'dump.ly'),
                              '-dbackend=null', '--loglevel=ERROR', source.name], cwd=work, capture_output=True)
        (OUT / (name + '.lily.log')).write_bytes(run.stdout + run.stderr)
        events = work / (source.stem + '.events')
        if not events.exists():
            failed.append(name + ': no events'); continue
        # Cadenza notes report pos=0 at every attack. Preserve each source
        # passage as one bar, including any measured opening before cadenzaOn.
        rows = [line.split('\t') for line in events.read_text().splitlines()]
        spans, opened = [], None
        for cells in rows:
            if cells[0] == 'cadenza-start':
                now = Fraction(cells[3])
                if opened is None: opened = (now, now - Fraction(cells[2]))
            elif cells[0] == 'cadenza-end' and opened is not None:
                spans.append((*opened, Fraction(cells[3])))
                opened = None
        for cells in rows:
            for start, anchor, end in spans:
                if start <= Fraction(cells[3]) < end:
                    cells[2] = str(Fraction(cells[3]) - anchor)
        events.write_text('\n'.join('\t'.join(c) for c in rows) + '\n')
        shutil.copy(events, OUT / (name + '.events'))
        result = subprocess.run([sys.executable, str(IMPORT / 'events2score.py'), str(events),
                                 '--staves', 'Right hand,Left hand'], capture_output=True)
        if result.returncode:
            failed.append(name + ': ' + result.stderr.decode()); continue
        score = json.loads(result.stdout)
        score.pop('measures', None)
        score['title'] = name
        if name == 'mozart-k331-menuetto':
            voice = score['staves'][0].get('voices', [score['staves'][0]])[0]
            bars = voice['notes'].split('|')
            bars[47] = bars[47].rstrip()[:-1] + ' @Fine :' if bars[47].rstrip().endswith(':') else bars[47] + ' @Fine'
            bars[-1] += ' @DC'
            voice['notes'] = ' | '.join(bars)
        score_path = OUT / (name + '.json')
        score_path.write_text(json.dumps(score, ensure_ascii=False, indent=2) + '\n')
        midi = work / (source.stem + '.midi')
        if not midi.exists():
            failed.append(name + ': no MIDI'); continue
        result = subprocess.run([python, str(IMPORT / 'midinotes.py'), str(midi)], capture_output=True, check=True)
        midi_path = OUT / (name + '.midi.json')
        midi_path.write_bytes(result.stdout)
        result = subprocess.run(['node', str(IMPORT / 'verify-midi.mjs'), str(REPO), str(score_path), str(midi_path), *(['--offset', '0.0546875'] if name == 'mozart-k331-menuetto' else [])], capture_output=True)
        report = result.stdout + result.stderr
        (OUT / (name + '.verify.txt')).write_bytes(report)
        print(report.decode(), flush=True)
        if result.returncode and name == 'mozart-sonata-k457-3':
            # Six tied, staccato pairs are sustained in the study notation;
            # LilyPond MIDI instead re-strikes the second note of each pair.
            expected = ['@141.000 midi 70', '@153.000 midi 70', '@165.000 midi 75',
                        '@504.000 midi 67', '@516.000 midi 79', '@528.000 midi 72']
            decoded = report.decode()
            if ('missing from ours: 18 (12 are very short' in decoded and
                'extra in ours: 0' in decoded and all(item in decoded for item in expected)):
                print('Accepted six documented tied/staccato re-strikes in source MIDI.', flush=True)
                continue
        if result.returncode:
            failed.append(name + ': MIDI comparison needs review')

if failed:
    print("\n".join(failed), file=sys.stderr)
    sys.exit(1)
